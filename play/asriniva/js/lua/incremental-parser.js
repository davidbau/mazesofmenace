/* Lua 5.4.8 lparser.c direct token-consuming parser/compiler port.
 * Allocation and code generation happen at their real grammar operations.
 * Lua notice: lua/lobject.js. No AST preparse, reparsing, or event replay. */
import { LuaError, LuaString, luaValues, luaStringBytes } from './lobject.js';
import { luaChunkId } from './debug.js';
import { LUA_OP as O } from './codegen.js';
import { LuaParserErrors } from './parser-errors.js';
import { LuaCompilerAllocations } from './compiler-allocations.js';
import { LuaChunkReader, LuaIncrementalLexer } from './incremental-lexer.js';
import { LuaCodeGenerator, Exp, ExpKind as K, BinOpr as B, UnOpr as U, initExp, copyExp, NO_JUMP } from './incremental-codegen.js';

const REG = 0, CONST = 1, CLOSE = 2, CTC = 3;
const multret = k => k === K.VCALL || k === K.VVARARG;
const indexed = k => k >= K.VINDEXED && k <= K.VINDEXSTR;
const variable = k => k >= K.VLOCAL && k <= K.VINDEXSTR;
const binary = Object.fromEntries(['+','-','*','%','^','/','//','&','|','~','<<','>>','..','==','<','<=','~=','>','>=','and','or'].map((name, n) => [name,n]));
const unary = { '-': U.OPR_MINUS, '~': U.OPR_BNOT, not: U.OPR_NOT, '#': U.OPR_LEN };
const priorities = [[10,10],[10,10],[11,11],[11,11],[14,13],[11,11],[11,11],[6,6],[4,4],[5,5],[7,7],[7,7],[9,8],[3,3],[3,3],[3,3],[3,3],[3,3],[3,3],[2,2],[1,1]];
const prototype = (source, line = 0) => ({ source, linedefined:line, lastlinedefined:0, numparams:0, is_vararg:0, maxstacksize:2, code:[], constants:luaValues(), upvalues:[], protos:[], lineinfo:[], abslineinfo:[], locvars:[], lines:[] });

export class LuaIncrementalParser {
  constructor(lexer, name, session = null, { nativeCalls = 0, formatError = null, diagnostics = null, vm = null } = {}) {
    this.lexer=lexer;this.name=name;this.session=session;this.nativeCalls=nativeCalls;this.depth=0;this.formatError=formatError;this.diagnostics=diagnostics;this.vm=vm;this.thread=vm?.currentThread;
    this.t={type:null,value:null,line:1};this.lookahead=null;this.lastline=1;this.fs=null;
    this.actvar=[];this.actvarN=0;this.labels=[];this.gotos=[];this.constantCache=new Map();
    this.lexicalStrings=new Map();this.envn='_ENV';
    Object.defineProperty(this,'linenumber',{get:()=>this.lexer.line});
  }
  get cg(){return this.fs.cg;}
  tokenName(token){return token==='eof'?'<eof>':token==='name'?'<name>':token==='number'?'<number>':token==='string'?'<string>':"'"+token+"'";}
  near(){return this.t.type==='eof'?'<eof>':this.t.type==='name'?"'"+this.t.value+"'":this.t.type==='number'?"'"+(this.t.raw??String(this.t.value))+"'":this.tokenName(this.t.type);}
  format(format,...args){if(this.diagnostics)return this.diagnostics.format(format,...args);let n=0;return format.replace(/%[sd]/g,()=>String(args[n++]));}
  tokenDescription(type){return this.diagnostics?.token(type)??this.tokenName(type);}
  fail(message, near = true) {
    if(this.diagnostics)return this.diagnostics.raise(message,this.linenumber,near?this.near():null,{parser:this});
    if(this.formatError)return this.formatError(message,this.linenumber,near?this.near():null,{parser:this});
    const error=new LuaError(`${luaChunkId(this.name)}:${this.linenumber}: ${message}${near?' near '+this.near():''}`);error.status=3;throw error;
  }
  error(message){return this.fail(message,true);}
  semanticError(message){return this.fail(message,false);}
  expected(type){return this.error(this.format('%s expected',this.tokenDescription(type)));}
  check(type){if(this.t.type!==type)this.expected(type);}
  next(){this.lastline=this.linenumber;if(this.lookahead){this.t=this.lookahead;this.lookahead=null;}else this.t=this.lexer.nextToken();return this.t;}
  look(){this.lookahead??=this.lexer.nextToken();return this.lookahead.type;}
  take(type){if(this.t.type!==type)return false;this.next();return true;}
  need(type){this.check(type);this.next();}
  match(what,who,line){if(!this.take(what)){if(line===this.linenumber)this.expected(what);this.error(this.format('%s expected (to close %s at line %d)',this.tokenDescription(what),this.tokenDescription(who),line));}}
  nameToken(){this.check('name');const value=this.t.value;this.next();return value;}
  enter(){this.depth++;if(this.thread){this.thread.nativeCalls=(this.thread.nativeCalls??0)+1;try{this.vm.checkCStack(this.thread);}catch(error){if(error instanceof LuaError){error.status??=2;error.value=this.vm.heap.adopt(error.value);}throw error;}}else if(this.depth+this.nativeCalls>=200){const error=new LuaError('C stack overflow');error.status=2;throw error;}}
  leave(){this.depth--;if(this.thread)this.thread.nativeCalls--;}
  limit(value,max,what,fs=this.fs){if(value>max)this.error(this.format('too many %s (limit is %d) in %s',what,max,fs.p.linedefined===0?'main function':this.format('function at line %d',fs.p.linedefined)));}
  intern(bytes){
    if(this.session)return this.session.lexString(bytes);
    if(!this.lexicalStrings.has(bytes))this.lexicalStrings.set(bytes,bytes.length>40?new LuaString(bytes,null):bytes);
    return this.lexicalStrings.get(bytes);
  }
  codestring(e,value){initExp(e,K.VKSTR);e.u.strval=value;return e;}
  codename(e){return this.codestring(e,this.nameToken());}
  localAt(fs,index){return this.actvar[fs.firstlocal+index];}
  reglevel(fs,count){while(count-->0){const v=this.localAt(fs,count);if(v.kind!==CTC)return v.ridx+1;}return 0;}
  localDebug(fs,index){const v=this.localAt(fs,index);return v.kind===CTC?null:fs.p.locvars[v.pidx];}
  newLocal(name){
    const fs=this.fs;this.limit(this.actvarN+1-fs.firstlocal,200,'local variables');
    this.session?.declare(fs.p,name);
    if(this.session){let pending=this.session.pendingLocals.get(fs.p);if(!pending){pending=[];this.session.pendingLocals.set(fs.p,pending);}pending.push(name);}
    this.actvar[this.actvarN++]={name,kind:REG,ridx:0,pidx:0,k:null};return this.actvarN-1-fs.firstlocal;
  }
  newLiteralLocal(name){this.intern(name);return this.newLocal(name);}
  adjustLocals(count){const fs=this.fs;let reg=this.reglevel(fs,fs.nactvar);for(let n=0;n<count;n++){const v=this.localAt(fs,fs.nactvar++);v.ridx=reg++;v.pidx=fs.p.locvars.length;this.session?.local(fs.p,v.name);fs.p.locvars.push({varname:v.name,startpc:fs.pc,endpc:0});fs.ndebugvars++;}}
  removeVars(fs,to){const count=fs.nactvar-to;this.session?.leaveLocals(fs.p,count);while(fs.nactvar>to){const debug=this.localDebug(fs,--fs.nactvar);if(debug)debug.endpc=fs.pc;}this.actvarN-=count;}
  initVar(fs,e,index){initExp(e,K.VLOCAL);e.u.var.vidx=index;e.u.var.ridx=this.localAt(fs,index).ridx;return e;}
  readonly(e){let name=null;const fs=this.fs;if(e.k===K.VCONST)name=this.actvar[e.u.info].name;else if(e.k===K.VLOCAL){const v=this.localAt(fs,e.u.var.vidx);if(v.kind!==REG)name=v.name;}else if(e.k===K.VUPVAL){const up=fs.p.upvalues[e.u.info];if(up.kind!==REG)name=up.name;}if(name!==null)this.semanticError(this.format("attempt to assign to const variable '%s'",name));}
  allocUpvalue(fs){this.limit(fs.nups+1,255,'upvalues',fs);this.session?.grow(fs.p,'upvalues',fs.nups+1);const up={name:null,instack:0,idx:0,kind:0};fs.p.upvalues[fs.nups++]=up;return up;}
  newUpvalue(fs,name,value){const up=this.allocUpvalue(fs),parent=fs.prev;if(value.k===K.VLOCAL){up.instack=1;up.idx=value.u.var.ridx;up.kind=this.localAt(parent,value.u.var.vidx).kind;}else{up.instack=0;up.idx=value.u.info;up.kind=parent.p.upvalues[value.u.info].kind;}up.name=name;this.session?.upvalueName(name,fs.p);return fs.nups-1;}
  markUpvalue(fs,level){let block=fs.bl;while(block.nactvar>level)block=block.previous;block.upval=true;fs.needclose=true;}
  markToClose(fs){fs.bl.upval=true;fs.bl.insidetbc=true;fs.needclose=true;}
  singlevaraux(fs,name,e,base){
    if(fs===null)return initExp(e,K.VVOID);
    for(let n=fs.nactvar-1;n>=0;n--){const v=this.localAt(fs,n);if(v.name===name){if(v.kind===CTC)initExp(e,K.VCONST,fs.firstlocal+n);else this.initVar(fs,e,n);if(e.k===K.VLOCAL&&!base)this.markUpvalue(fs,e.u.var.vidx);return;}}
    let index=fs.p.upvalues.findIndex(up=>up.name===name);
    if(index<0){this.singlevaraux(fs.prev,name,e,false);if(e.k===K.VLOCAL||e.k===K.VUPVAL)index=this.newUpvalue(fs,name,e);else return;}
    initExp(e,K.VUPVAL,index);
  }
  singlevar(e){const name=this.nameToken();this.singlevaraux(this.fs,name,e,true);if(e.k===K.VVOID){this.singlevaraux(this.fs,this.envn,e,true);this.cg.exp2anyregup(e);this.cg.indexed(e,this.codestring(new Exp(),name));}}
  adjustAssign(nvars,nexps,e){const needed=nvars-nexps;if(multret(e.k))this.cg.setreturns(e,Math.max(needed+1,0));else{if(e.k!==K.VVOID)this.cg.exp2nextreg(e);if(needed>0)this.cg.nil(this.fs.freereg,needed);}if(needed>0)this.cg.reserveregs(needed);else this.fs.freereg+=needed;}
  newLabel(list,key,name,line,pc){this.session?.growTemporary(key,list.length+1,24);list.push({name,line,pc,nactvar:this.fs.nactvar,close:false});return list.length-1;}
  findLabel(name){for(let n=this.fs.firstlabel;n<this.labels.length;n++)if(this.labels[n].name===name)return this.labels[n];return null;}
  solveGoto(index,label){const jump=this.gotos[index];if(jump.nactvar<label.nactvar)this.semanticError(this.format("<goto %s> at line %d jumps into the scope of local '%s'",jump.name,jump.line,this.localAt(this.fs,jump.nactvar).name));this.cg.patchlist(jump.pc,label.pc);this.gotos.splice(index,1);}
  createLabel(name,line,last){const index=this.newLabel(this.labels,'labels',name,line,this.cg.getlabel()),label=this.labels[index];if(last)label.nactvar=this.fs.bl.nactvar;let needsclose=false;for(let n=this.fs.bl.firstgoto;n<this.gotos.length;){if(this.gotos[n].name===name){needsclose||=this.gotos[n].close;this.solveGoto(n,label);}else n++;}if(needsclose){this.cg.codeABC(O.CLOSE,this.fs.variableStack(),0,0);return true;}return false;}
  enterBlock(fs,isloop=false){const block={isloop,nactvar:fs.nactvar,firstlabel:this.labels.length,firstgoto:this.gotos.length,upval:false,insidetbc:fs.bl?.insidetbc??false,previous:fs.bl};fs.bl=block;return block;}
  leaveBlock(fs){
    const block=fs.bl,level=this.reglevel(fs,block.nactvar);this.removeVars(fs,block.nactvar);
    const hasclose=block.isloop&&this.createLabel('break',0,false);
    if(!hasclose&&block.previous&&block.upval)fs.cg.codeABC(O.CLOSE,level,0,0);
    fs.freereg=level;this.labels.length=block.firstlabel;fs.bl=block.previous;
    if(block.previous){for(let n=block.firstgoto;n<this.gotos.length;n++){const gt=this.gotos[n];if(this.reglevel(fs,gt.nactvar)>this.reglevel(fs,block.nactvar))gt.close||=block.upval;gt.nactvar=block.nactvar;}}
    else if(block.firstgoto<this.gotos.length){const gt=this.gotos[block.firstgoto];this.semanticError(gt.name==='break'?this.format('break outside loop at line %d',gt.line):this.format("no visible label '%s' for <goto> at line %d",gt.name,gt.line));}
  }
  openFunction(p){
    const fs={p,ls:this,prev:this.fs,pc:0,previousline:p.linedefined,iwthabs:0,lasttarget:0,freereg:0,nk:0,nabslineinfo:0,np:0,nups:0,ndebugvars:0,nactvar:0,needclose:false,firstlocal:this.actvarN,firstlabel:this.labels.length,bl:null};
    fs.localAt=index=>this.localAt(fs,index);fs.constantAt=index=>this.actvar[index].k;fs.variableStack=()=>this.reglevel(fs,fs.nactvar);
    fs.cg=new LuaCodeGenerator(fs);this.fs=fs;this.enterBlock(fs);return fs;
  }
  closeFunction(){const fs=this.fs;fs.cg.ret(fs.variableStack(),0);this.leaveBlock(fs);fs.cg.finish();this.session?.closeFunction(fs.p);this.fs=fs.prev;}
  addPrototype(){const fs=this.fs;this.limit(fs.np+1,131071,'functions');this.session?.grow(fs.p,'protos',fs.np+1);const p=prototype(this.name);fs.p.protos.push(null);fs.np++;this.session?.prototype(p,fs.p);fs.p.protos[fs.np-1]=p;return p;}
  blockFollow(until=false){return ['else','elseif','end','eof'].includes(this.t.type)||(until&&this.t.type==='until');}
  statlist(){while(!this.blockFollow(true)){if(this.t.type==='return'){this.statement();return;}this.statement();}}
  block(){const fs=this.fs;this.enterBlock(fs);this.statlist();this.leaveBlock(fs);}
  fieldsel(e){this.cg.exp2anyregup(e);this.next();const key=this.codename(new Exp());this.cg.indexed(e,key);}
  yindex(e){this.next();this.expr(e);this.cg.exp2val(e);this.need(']');}
  recordField(cc){const fs=this.fs,reg=fs.freereg,key=new Exp(),value=new Exp();if(this.t.type==='name')this.codename(key);else this.yindex(key);cc.nh++;this.need('=');const table=copyExp(new Exp(),cc.t);this.cg.indexed(table,key);this.expr(value);this.cg.storevar(table,value);fs.freereg=reg;}
  closeListField(cc){if(cc.v.k===K.VVOID)return;this.cg.exp2nextreg(cc.v);cc.v.k=K.VVOID;if(cc.tostore===50){this.cg.setlist(cc.t.u.info,cc.na,cc.tostore);cc.na+=cc.tostore;cc.tostore=0;}}
  lastListField(cc){if(!cc.tostore)return;if(multret(cc.v.k)){this.cg.setmultret(cc.v);this.cg.setlist(cc.t.u.info,cc.na,-1);cc.na--;}else{if(cc.v.k!==K.VVOID)this.cg.exp2nextreg(cc.v);this.cg.setlist(cc.t.u.info,cc.na,cc.tostore);}cc.na+=cc.tostore;}
  constructorExpression(e){const line=this.linenumber,pc=this.cg.codeABC(O.NEWTABLE,0,0,0);this.cg.code(0);const cc={na:0,nh:0,tostore:0,t:e,v:new Exp()};initExp(e,K.VNONRELOC,this.fs.freereg);this.cg.reserveregs(1);this.need('{');do{if(this.t.type==='}')break;this.closeListField(cc);if(this.t.type==='['||this.t.type==='name'&&this.look()==='=')this.recordField(cc);else{this.expr(cc.v);cc.tostore++;}}while(this.take(',')||this.take(';'));this.match('}','{',line);this.lastListField(cc);this.cg.settablesize(pc,e.u.info,cc.na,cc.nh);}
  setvararg(fs,count){fs.p.is_vararg=1;fs.cg.codeABC(O.VARARGPREP,count,0,0);}
  parameters(){const fs=this.fs;let count=0,vararg=false;if(this.t.type!==')')do{if(this.t.type==='name'){this.newLocal(this.nameToken());count++;}else if(this.t.type==='...'){this.next();vararg=true;}else this.error("<name> or '...' expected");}while(!vararg&&this.take(','));this.adjustLocals(count);fs.p.numparams=fs.nactvar;if(vararg)this.setvararg(fs,fs.p.numparams);this.cg.reserveregs(fs.nactvar);}
  functionBody(e,method,line){const p=this.addPrototype();p.linedefined=line;const fs=this.openFunction(p);this.need('(');if(method){this.newLiteralLocal('self');this.adjustLocals(1);}this.parameters();this.need(')');this.statlist();p.lastlinedefined=this.linenumber;this.match('end','function',line);const parent=fs.prev;initExp(e,K.VRELOC,parent.cg.codeABx(O.CLOSURE,0,parent.np-1));parent.cg.exp2nextreg(e);this.closeFunction();}
  expressionList(e){let count=1;this.expr(e);while(this.take(',')){this.cg.exp2nextreg(e);this.expr(e);count++;}return count;}
  funcargs(fn){const fs=this.fs,args=new Exp(),line=this.linenumber;switch(this.t.type){case '(':this.next();if(this.t.type!==')'){this.expressionList(args);if(multret(args.k))this.cg.setmultret(args);}this.match(')','(',line);break;case '{':this.constructorExpression(args);break;case 'string':this.codestring(args,this.t.value);this.next();break;default:this.error('function arguments expected');}
    const base=fn.u.info;let count;if(multret(args.k))count=-1;else{if(args.k!==K.VVOID)this.cg.exp2nextreg(args);count=fs.freereg-(base+1);}initExp(fn,K.VCALL,this.cg.codeABC(O.CALL,base,count+1,2));this.cg.fixline(line);fs.freereg=base+1;
  }
  primary(e){if(this.t.type==='('){const line=this.linenumber;this.next();this.expr(e);this.match(')','(',line);this.cg.dischargevars(e);}else if(this.t.type==='name')this.singlevar(e);else this.error('unexpected symbol');}
  suffixed(e){this.primary(e);while(true){switch(this.t.type){case '.':this.fieldsel(e);break;case '[':this.cg.exp2anyregup(e);{const key=new Exp();this.yindex(key);this.cg.indexed(e,key);}break;case ':':this.next();{const key=this.codename(new Exp());this.cg.self(e,key);this.funcargs(e);}break;case '(':case 'string':case '{':this.cg.exp2nextreg(e);this.funcargs(e);break;default:return;}}}
  simple(e){const token=this.t;switch(token.type){case 'number':initExp(e,typeof token.value==='bigint'?K.VKINT:K.VKFLT);if(typeof token.value==='bigint')e.u.ival=token.value;else e.u.nval=token.value;break;case 'string':this.codestring(e,token.value);break;case 'nil':initExp(e,K.VNIL);break;case 'true':initExp(e,K.VTRUE);break;case 'false':initExp(e,K.VFALSE);break;case '...':if(!this.fs.p.is_vararg)this.error("cannot use '...' outside a vararg function");initExp(e,K.VVARARG,this.cg.codeABC(O.VARARG,0,0,1));break;case '{':this.constructorExpression(e);return;case 'function':this.next();this.functionBody(e,false,this.linenumber);return;default:this.suffixed(e);return;}this.next();}
  subexpr(e,limit){this.enter();const u=unary[this.t.type];if(u!==undefined){const line=this.linenumber;this.next();this.subexpr(e,12);this.cg.prefix(u,e,line);}else this.simple(e);let op=binary[this.t.type];while(op!==undefined&&priorities[op][0]>limit){const right=new Exp(),line=this.linenumber;this.next();this.cg.infix(op,e);this.subexpr(right,priorities[op][1]);this.cg.posfix(op,e,right,line);op=binary[this.t.type];}this.leave();return op;}
  expr(e=new Exp()){this.subexpr(e,0);return e;}
  conflict(lhs,e){const extra=this.fs.freereg;let conflict=false;for(;lhs;lhs=lhs.prev){const v=lhs.v;if(indexed(v.k)){if(v.k===K.VINDEXUP){if(e.k===K.VUPVAL&&v.u.ind.t===e.u.info){conflict=true;v.k=K.VINDEXSTR;v.u.ind.t=extra;}}else{if(e.k===K.VLOCAL&&v.u.ind.t===e.u.var.ridx){conflict=true;v.u.ind.t=extra;}if(v.k===K.VINDEXED&&e.k===K.VLOCAL&&v.u.ind.idx===e.u.var.ridx){conflict=true;v.u.ind.idx=extra;}}}}if(conflict){this.cg.codeABC(e.k===K.VLOCAL?O.MOVE:O.GETUPVAL,extra,e.k===K.VLOCAL?e.u.var.ridx:e.u.info,0);this.cg.reserveregs(1);}}
  restassign(lhs,count){const e=new Exp();if(!variable(lhs.v.k))this.error('syntax error');this.readonly(lhs.v);if(this.take(',')){const next={prev:lhs,v:new Exp()};this.suffixed(next.v);if(!indexed(next.v.k))this.conflict(lhs,next.v);this.enter();this.restassign(next,count+1);this.leave();}else{this.need('=');const nexps=this.expressionList(e);if(nexps!==count)this.adjustAssign(count,nexps,e);else{this.cg.setoneret(e);this.cg.storevar(lhs.v,e);return;}}initExp(e,K.VNONRELOC,this.fs.freereg-1);this.cg.storevar(lhs.v,e);}
  cond(){const e=this.expr();if(e.k===K.VNIL)e.k=K.VFALSE;this.cg.goiftrue(e);return e.f;}
  gotoStatement(){const line=this.linenumber,name=this.nameToken(),label=this.findLabel(name);if(!label)this.newLabel(this.gotos,'gotos',name,line,this.cg.jump());else{const level=this.reglevel(this.fs,label.nactvar);if(this.fs.variableStack()>level)this.cg.codeABC(O.CLOSE,level,0,0);this.cg.patchlist(this.cg.jump(),label.pc);}}
  breakStatement(){const line=this.linenumber;this.next();this.newLabel(this.gotos,'gotos','break',line,this.cg.jump());}
  labelStatement(name,line){this.need('::');while(this.t.type===';'||this.t.type==='::')this.statement();const previous=this.findLabel(name);if(previous)this.semanticError(this.format("label '%s' already defined on line %d",name,previous.line));this.createLabel(name,line,this.blockFollow(false));}
  whileStatement(line){this.next();const start=this.cg.getlabel(),exit=this.cond(),fs=this.fs;this.enterBlock(fs,true);this.need('do');this.block();this.cg.jumpto(start);this.match('end','while',line);this.leaveBlock(fs);this.cg.patchtohere(exit);}
  repeatStatement(line){const fs=this.fs,start=this.cg.getlabel();this.enterBlock(fs,true);const scope=this.enterBlock(fs);this.next();this.statlist();this.match('until','repeat',line);let exit=this.cond();this.leaveBlock(fs);if(scope.upval){const jump=this.cg.jump();this.cg.patchtohere(exit);this.cg.codeABC(O.CLOSE,this.reglevel(fs,scope.nactvar),0,0);exit=this.cg.jump();this.cg.patchtohere(jump);}this.cg.patchlist(exit,start);this.leaveBlock(fs);}
  exp1(){const e=this.expr();this.cg.exp2nextreg(e);}
  fixFor(pc,dest,back){let offset=dest-(pc+1);if(back)offset=-offset;if(offset>131071)this.error('control structure too long');this.cg.set(pc,'Bx',offset);}
  forBody(base,line,count,generic){const fs=this.fs;this.need('do');const prep=this.cg.codeABx(generic?O.TFORPREP:O.FORPREP,base,0);this.enterBlock(fs);this.adjustLocals(count);this.cg.reserveregs(count);this.block();this.leaveBlock(fs);this.fixFor(prep,this.cg.getlabel(),false);if(generic){this.cg.codeABC(O.TFORCALL,base,0,count);this.cg.fixline(line);}const end=this.cg.codeABx(generic?O.TFORLOOP:O.FORLOOP,base,0);this.fixFor(end,prep+1,true);this.cg.fixline(line);}
  forNumber(name,line){const base=this.fs.freereg;for(let n=0;n<3;n++)this.newLiteralLocal('(for state)');this.newLocal(name);this.need('=');this.exp1();this.need(',');this.exp1();if(this.take(','))this.exp1();else{this.cg.int(this.fs.freereg,1n);this.cg.reserveregs(1);}this.adjustLocals(3);this.forBody(base,line,1,false);}
  forList(name){const fs=this.fs,base=fs.freereg;let count=5;for(let n=0;n<4;n++)this.newLiteralLocal('(for state)');this.newLocal(name);while(this.take(',')){this.newLocal(this.nameToken());count++;}this.need('in');const line=this.linenumber,e=new Exp();this.adjustAssign(4,this.expressionList(e),e);this.adjustLocals(4);this.markToClose(fs);this.cg.checkstack(3);this.forBody(base,line,count-4,true);}
  forStatement(line){const fs=this.fs;this.enterBlock(fs,true);this.next();const name=this.nameToken();if(this.t.type==='=')this.forNumber(name,line);else if(this.t.type===','||this.t.type==='in')this.forList(name);else this.error("'=' or 'in' expected");this.match('end','for',line);this.leaveBlock(fs);}
  testThen(escapes){const fs=this.fs,e=new Exp();this.next();this.expr(e);this.need('then');let jump;if(this.t.type==='break'){const line=this.linenumber;this.cg.goiffalse(e);this.next();this.enterBlock(fs);this.newLabel(this.gotos,'gotos','break',line,e.t);while(this.take(';')){}if(this.blockFollow(false)){this.leaveBlock(fs);return escapes;}jump=this.cg.jump();}else{this.cg.goiftrue(e);this.enterBlock(fs);jump=e.f;}this.statlist();this.leaveBlock(fs);if(this.t.type==='else'||this.t.type==='elseif')escapes=this.cg.concat(escapes,this.cg.jump());this.cg.patchtohere(jump);return escapes;}
  ifStatement(line){let escapes=this.testThen(NO_JUMP);while(this.t.type==='elseif')escapes=this.testThen(escapes);if(this.take('else'))this.block();this.match('end','if',line);this.cg.patchtohere(escapes);}
  localFunction(){const fs=this.fs,index=fs.nactvar;this.newLocal(this.nameToken());this.adjustLocals(1);this.functionBody(new Exp(),false,this.linenumber);this.localDebug(fs,index).startpc=fs.pc;}
  attribute(){if(!this.take('<'))return REG;const name=this.nameToken();this.need('>');if(name==='const')return CONST;if(name==='close')return CLOSE;this.semanticError(this.format("unknown attribute '%s'",name));}
  localStatement(){const fs=this.fs,e=new Exp();let toclose=-1,index,kind,count=0,nexps;do{index=this.newLocal(this.nameToken());kind=this.attribute();this.localAt(fs,index).kind=kind;if(kind===CLOSE){if(toclose!==-1)this.semanticError('multiple to-be-closed variables in local list');toclose=fs.nactvar+count;}count++;}while(this.take(','));if(this.take('='))nexps=this.expressionList(e);else{e.k=K.VVOID;nexps=0;}const v=this.localAt(fs,index),value={};if(count===nexps&&v.kind===CONST&&this.cg.exp2const(e,value)){v.kind=CTC;v.k=value.value;this.adjustLocals(count-1);fs.nactvar++;this.session?.constantLocal(fs.p,v.name);}else{this.adjustAssign(count,nexps,e);this.adjustLocals(count);}if(toclose!==-1){this.markToClose(fs);this.cg.codeABC(O.TBC,this.reglevel(fs,toclose),0,0);}}
  functionStatement(line){this.next();const e=new Exp();this.singlevar(e);while(this.t.type==='.')this.fieldsel(e);let method=false;if(this.t.type===':'){method=true;this.fieldsel(e);}const value=new Exp();this.functionBody(value,method,line);this.readonly(e);this.cg.storevar(e,value);this.cg.fixline(line);}
  expressionStatement(){const lhs={v:new Exp(),prev:null};this.suffixed(lhs.v);if(this.t.type==='='||this.t.type===',')this.restassign(lhs,1);else{if(lhs.v.k!==K.VCALL)this.error('syntax error');this.cg.set(lhs.v.u.info,'C',1);}}
  returnStatement(){const fs=this.fs,e=new Exp();let count,first=fs.variableStack();if(this.blockFollow(true)||this.t.type===';')count=0;else{count=this.expressionList(e);if(multret(e.k)){this.cg.setmultret(e);if(e.k===K.VCALL&&count===1&&!fs.bl.insidetbc)this.cg.set(e.u.info,'op',O.TAILCALL);count=-1;}else if(count===1)first=this.cg.exp2anyreg(e);else this.cg.exp2nextreg(e);}this.cg.ret(first,count);this.take(';');}
  statement(){const line=this.linenumber;this.enter();switch(this.t.type){case ';':this.next();break;case 'if':this.ifStatement(line);break;case 'while':this.whileStatement(line);break;case 'do':this.next();this.block();this.match('end','do',line);break;case 'for':this.forStatement(line);break;case 'repeat':this.repeatStatement(line);break;case 'function':this.functionStatement(line);break;case 'local':this.next();if(this.take('function'))this.localFunction();else this.localStatement();break;case '::':this.next();this.labelStatement(this.nameToken(),line);break;case 'return':this.next();this.returnStatement();break;case 'break':this.breakStatement();break;case 'goto':this.next();this.gotoStatement();break;default:this.expressionStatement();}this.fs.freereg=this.fs.variableStack();this.leave();}
  compile(p){const fs=this.openFunction(p);this.setvararg(fs,0);const up=this.allocUpvalue(fs);Object.assign(up,{name:this.envn,instack:1,idx:0,kind:REG});this.next();this.statlist();this.check('eof');this.closeFunction();return p;}
}

export function compileLuaIncremental(input,name='chunk',{observer=null,closure=null,nativeCalls=0,formatError=null,vm=null,workspace=null}={}) {
  const reader=input instanceof LuaChunkReader?input:new LuaChunkReader(input);workspace??={};let session=null;const diagnostics=vm?new LuaParserErrors(vm,name):null,thread=vm?.currentThread,savedCalls=thread?.nativeCalls;
  observer?.temporary(workspace,['buffer','actvar','gotos','labels']);
  try {
    reader.peek(); // f_parser gets the first byte before allocating source objects.
    closure??={luaClosure:true,luaBytecode:true,prototype:null,upvalues:[]};
    if(observer)session=new LuaCompilerAllocations(observer,name,closure,{workspace});
    reader.stackExtra=2;const p=prototype(name);if(session)session.prototype(p);else closure.prototype=p;
    let parser;
    const lexer=new LuaIncrementalLexer(reader,name,{onResize:size=>session?.resizeTemporary('buffer',size),onString:bytes=>parser.intern(bytes),error:(message,near,line,lexer)=>{if(diagnostics)return diagnostics.raise(message,line,near,{lexer});if(formatError)return formatError(message,line,near);const error=new LuaError(`${luaChunkId(name)}:${line}: ${message}${near===null?'':' near '+near}`);error.status=3;throw error;}});
    parser=new LuaIncrementalParser(lexer,name,session,{nativeCalls,formatError,diagnostics,vm});parser.compile(p);
    if(session)session.finish();else closure.upvalues.push({open:false,value:null});
    return {prototype:p,closure,reader};
  } catch(error) {if(thread)thread.nativeCalls=savedCalls;if(vm&&error instanceof LuaError){error=vm.closeError(error);vm.heap.shrinkThread(thread);}throw error;} finally {if(thread)thread.nativeCalls=savedCalls;session?.dispose();observer?.release(workspace);diagnostics?.close();}
}
