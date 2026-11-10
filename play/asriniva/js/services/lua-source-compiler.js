/* Source->Lua5.4 instruction compiler built on the JS parser. Lua license:
 * lua/lobject.js; instruction semantics: lcode.c/lopcodes.h. This is an
 * port of register allocation/optimization rules checked against the pinned
 * native compiler by test-js-lua-codegen.mjs. Exact parity is established for
 * that corpus; arbitrary source still requires the same differential gate.
 */
import { LexState } from './lua/llex.js';
import { Parser } from './lua/lparser.js';
import { LuaCompilerAllocations } from './lua-compiler-allocations.js';
import { luaChunkId } from './lua-debug.js';
import { LuaError, arithmetic, LuaString, luaValues } from './lua/lobject.js';
import { LUA_OP as O, luaInstruction as ABC, luaInstructionABx as ABx, luaInstructionAsBx as AsBx } from './lua-codegen.js';
// Peak live Mbuffer bytes while the pinned lexer decodes one quoted token.
// Escape spelling is transient storage too; decoded length alone is insufficient.
function quotedBufferPeak(raw){let length=1,peak=1;const save=n=>{length+=n;peak=Math.max(peak,length);};for(let i=1;i<raw.length-1;i++){let c=raw[i];if(c!=='\\'){save(1);continue;}save(1);c=raw[++i];if(c==='z'){length--;while(/[ \t\n\r\v\f]/.test(raw[i+1]??''))i++;}else if(c==='x'){save(2);length-=3;save(1);i+=2;}else if(c==='u'){const end=raw.indexOf('}',i+2),digits=raw.slice(i+2,end),value=Number.parseInt(digits,16);save(digits.length+2);length-=digits.length+3;save(value<0x80?1:value<0x800?2:value<0x10000?3:value<0x200000?4:value<0x4000000?5:6);i=end;}else if(/[0-9]/.test(c)){const digits=/^[0-9]{1,3}/.exec(raw.slice(i))[0].length;save(digits);length-=digits+1;save(1);i+=digits-1;}else{length--;save(1);if((c==='\r'||c==='\n')&&/[\r\n]/.test(raw[i+1]??'')&&raw[i+1]!==c)i++;}}save(1);return peak;}
function commentBufferPeak(raw,sep){let at=sep,length=1,peak=Math.max(1,sep-1);if(/[\r\n]/.test(raw[at]??'')){const c=raw[at++];if(/[\r\n]/.test(raw[at]??'')&&raw[at]!==c)at++;}for(;at<raw.length-sep;at++){const c=raw[at];if(c==='\r'||c==='\n'){peak=Math.max(peak,++length);length=0;if(/[\r\n]/.test(raw[at+1]??'')&&raw[at+1]!==c)at++;}else if(c===']'){length++;while(raw[at+1]==='='){at++;length++;}peak=Math.max(peak,length);}}return Math.max(peak,length+sep);}
class SourceLexState extends LexState {
 constructor(source,name){super(source,name);this.stringEnds=[];this.stringPeaks=[];this.commentPeaks=new Map();this.tokens.push=(...items)=>{for(const token of items)if(token.type==='number'){const raw=/(?:0[xX][\da-fA-F]*(?:\.[\da-fA-F]*)?(?:[pP][+-]?\d+)?|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.exec(this.source.slice(0,this.at));token.bufferPeak=(raw?.[0].length??0)+1;}return Array.prototype.push.apply(this.tokens,items);};}
 error(message){let near=null;if(message==='malformed number'){let end=this.at;while(end<this.source.length){const c=this.source[end];if(/[\w.]/.test(c)||/[+-]/.test(c)&&/[eEpP]/.test(this.source[end-1]??''))end++;else break;}near="'"+this.source.slice(this.at,end)+"'";}else if(message==='unfinished long string/comment'){message=`unfinished long ${this.longComment?'comment':'string'} (starting at line ${this.longLine})`;near='<eof>';}else if(message==='unfinished string')near=this.at>=this.source.length?'<eof>':"'"+this.source.slice(this.quoteStart,this.at).replace(/[\r\n].*$/,'')+"'";else if(this.quoteStart!==undefined)near="'"+this.source.slice(this.quoteStart,this.at)+"'";throw new LuaError(`${luaChunkId(this.name)}:${this.line}: ${message}${near===null?'':' near '+near}`);}
 quoted(){this.quoteStart=this.at;const value=super.quoted();this.stringPeaks.push(quotedBufferPeak(this.source.slice(this.quoteStart,this.at)));this.quoteStart=undefined;this.stringEnds.push(this.line);return value;}
 longString(){const comment=this.source.slice(this.at-2,this.at)==='--';this.longComment=comment;this.longLine=this.line;const start=this.at,sep=this.longDelimiter(start)[0].length,value=super.longString();if(!comment){this.stringEnds.push(this.line);this.stringPeaks.push(value.length+2*sep);}else this.commentPeaks.set(this.tokens.length,Math.max(this.commentPeaks.get(this.tokens.length)??0,commentBufferPeak(this.source.slice(start,this.at),sep)));return value;}
 scan(){const tokens=super.scan();let index=0;for(const [at,token]of tokens.entries()){token.endline=token.type==='string'?this.stringEnds[index]:token.line;if(token.type==='string')token.bufferPeak=this.stringPeaks[index++];token.bufferPrefixPeak=this.commentPeaks.get(at)??0;}return tokens;}
}
const precedence=new Map([['or',[1,1]],['and',[2,2]],...['<','<=','>','>=','~=','=='].map(op=>[op,[3,3]]),['|',[4,4]],['~',[5,5]],['&',[6,6]],['<<',[7,7]],['>>',[7,7]],['..',[9,8]],['+',[10,10]],['-',[10,10]],['*',[11,11]],['/',[11,11]],['//',[11,11]],['%',[11,11]],['^',[14,13]]]);
class SourceParser extends Parser {
 constructor(source,name){super('',name);this.tokens=new SourceLexState(source,name).scan();}
 error(message){const token=this.token;const near=token.type==='eof'?'<eof>':token.type==='name'?"'"+token.value+"'":token.type==='number'?"'"+String(token.value)+"'":"'"+token.type+"'";if(message==='break outside loop')throw new LuaError(`${luaChunkId(this.name)}:${token.line}: break outside loop at line ${this.tokens[this.at-1].line}`);if(message==='return must end a block')message='<eof> expected';if(message==='expression expected')message='unexpected symbol';if(message==="'name' expected")message=this.parameterEnd===-1||this.at<=this.parameterEnd?"<name> or '...' expected":'<name> expected';throw new LuaError(`${luaChunkId(this.name)}:${token.line}: ${message} near ${near}`);}
 previousLine(){return this.tokens[this.at-1]?.endline??1;}
 parse(){const node=super.parse();node.endline=this.tokens.at(-2)?.endline??1;return node;}
 functionBody(method=false,line=this.token.line){const start=this.at,end=this.tokens.findIndex((token,index)=>index>=start&&token.type===')');const paramline=this.tokens[end-1]?.endline??line;const saved=this.parameterEnd;this.parameterEnd=end;let node;try{node=super.functionBody(method,line);}finally{this.parameterEnd=saved;}node.endline=this.previousLine();node.paramline=paramline;node.paramStart=start;node.paramEnd=end;node.method=method;node.tokenEnd=this.at;return node;}
 statement(){const first=this.token,start=this.at,node=this.statementRaw();if(node){node.tokenStart=start;node.tokenEnd=this.at;node.endline=this.previousLine();node.functionDefinition=first.type==='function';if(node.kind==='if'&&!node.branchEndLines){const terminals=this.tokens.slice(start,this.at).filter(t=>['else','elseif','end'].includes(t.type));node.branchEndLines=terminals.map(t=>t.line);}}return node;}
 expression(limit=0){
  let left;const token=this.token,start=this.at;
  if(['not','-','~','#'].includes(token.type)){this.at++;left={kind:'unary',op:token.type,value:this.expression(12),line:token.line,endline:this.previousLine()};}else left=this.simple();
  while(precedence.has(this.token.type)&&precedence.get(this.token.type)[0]>limit){const op=this.tokens[this.at++];left={kind:'binary',op:op.type,left,right:this.expression(precedence.get(op.type)[1]),line:op.line,endline:this.previousLine(),tokenStart:start,tokenEnd:this.at};}left.tokenStart??=start;left.tokenEnd=this.at;return left;
 }
 simple(){const line=this.token.line,start=this.at,node=super.simple();node.tokenStart??=start;node.tokenEnd=this.at;node.line??=line;node.endline??=this.previousLine();return node;}
 suffixed(){
  let node;const line=this.token.line,start=this.at;
  if(this.is('name'))node={kind:'variable',name:this.nameToken(),line,endline:this.previousLine(),tokenStart:start,tokenEnd:this.at};else if(this.take('(')){node={kind:'paren',value:this.expression(),line,tokenStart:start};this.need(')');node.endline=this.previousLine();node.tokenEnd=this.at;}else this.error('expression expected');
  while(true){
   if(this.take('.')){const keyStart=this.at,key={kind:'literal',value:this.nameToken(),line:this.previousLine(),endline:this.previousLine(),tokenStart:keyStart,tokenEnd:this.at};node={kind:'index',table:node,key,line:this.previousLine(),endline:this.previousLine(),tokenStart:start,tokenEnd:this.at};}
   else if(this.take('[')){const key=this.expression();this.need(']');node={kind:'index',table:node,key,line:this.previousLine(),endline:this.previousLine(),tokenStart:start,tokenEnd:this.at};}
   else if(this.take(':')){const methodStart=this.at,method=this.nameToken(),callline=this.token.line,args=this.arguments();node={kind:'call',callee:node,method,methodStart,args,line:callline,endline:this.previousLine(),tokenStart:start,tokenEnd:this.at};}
   else if(this.is('(')||this.is('{')||this.is('string')){const callline=this.token.line,args=this.arguments();node={kind:'call',callee:node,method:null,args,line:callline,endline:this.previousLine(),tokenStart:start,tokenEnd:this.at};}else break;
  }return node;
 }
 constructorExpression(){
  const line=this.token.line,emitline=this.previousLine();this.need('{');const fields=[];
  while(!this.is('}')){let key=null,value;const fieldline=this.token.line;
   if(this.take('[')){key=this.expression();this.need(']');this.need('=');value=this.expression();}
   else if(this.is('name')&&this.tokens[this.at+1].type==='='){key={kind:'literal',value:this.nameToken(),line:this.previousLine(),endline:this.previousLine()};this.need('=');value=this.expression();}else value=this.expression();
   fields.push({key,value,line:fieldline,endline:this.previousLine()});if(!this.take(',')&&!this.take(';'))break;
  }this.need('}');return{kind:'table',fields,line,emitline,endline:this.previousLine()};
 }
 statementRaw(){
  const line=this.token.line;
  if(this.take('if')){const branches=[],branchEndLines=[];do{const test=this.expression();this.need('then');branches.push({test,body:this.block()});branchEndLines.push(this.token.line);}while(this.take('elseif'));const hasElse=Boolean(this.take('else')),otherwise=hasElse?this.block():[];this.need('end');return{kind:'if',branches,otherwise,hasElse,branchEndLines,line};}
  if(this.take('goto'))return{kind:'goto',name:this.nameToken(),line};
  if(this.take('::')){const name=this.nameToken();this.need('::');return{kind:'label',name,line};}
  if(this.is('local')&&this.tokens[this.at+1].type!=='function'){
   this.at++;const names=[];do{const name=this.nameToken();let attribute=null;if(this.take('<')){attribute=this.nameToken();this.need('>');if(!['const','close'].includes(attribute))throw new LuaError(`${luaChunkId(this.name)}:${this.token.line}: unknown attribute '${attribute}'`);if(attribute==='close'&&names.some(item=>item.attribute==='close'))throw new LuaError(`${luaChunkId(this.name)}:${this.token.line}: multiple to-be-closed variables in local list`);}names.push({name,attribute});}while(this.take(','));
   return{kind:'local',names,values:this.take('=')?this.expressionList():[],line};
  }
  return super.statement();
 }
}
const arith={'+':'ADD','-':'SUB','*':'MUL','%':'MOD','^':'POW','/':'DIV','//':'IDIV','&':'BAND','|':'BOR','~':'BXOR','<<':'SHL','>>':'SHR'},tm={'+':6,'-':7,'*':8,'%':9,'^':10,'/':11,'//':12,'&':13,'|':14,'~':15,'<<':16,'>>':17};
class Compiler{
 constructor(node,parent=null,session=null,prototype=null){
  this.node=node;this.parent=parent;this.session=session??parent?.session;this.constantCache=parent?.constantCache??new Map();const fields={source:node.source??node.name,linedefined:node.linedefined??0,lastlinedefined:node.lastlinedefined??0,numparams:node.params.length,is_vararg:+node.vararg,maxstacksize:2,code:[],constants:luaValues(),upvalues:[],protos:[],lineinfo:[],abslineinfo:[],locvars:[],lines:[]};this.p=prototype??fields;if(prototype)Object.assign(prototype,fields);if(this.session&&!prototype)this.session.prototype(this.p,parent?.p);if(this.session){const compiler=this;this.p.lines=new Proxy(this.p.lines,{set(target,key,value){target[key]=value;if(key!=='length')compiler.session.line(compiler.p);return true;}});}
  this.locals=[];this.bindings=[];this.next=0;this.line=node.linedefined??1;this.scopes=[];this.breaks=[];this.labels=[];this.gotos=[];this.lastTarget=0;this.needclose=false;
  if(!parent)this.p.upvalues.push({instack:1,idx:0,kind:0,name:'_ENV'});
  if(this.session&&parent)this.session.parameters(node,this.p);for(const name of node.params)this.bind(name,null);
 }
 error(message,line=this.line){throw new LuaError(`${luaChunkId(this.p.source)}:${line}: ${message}`);}
 reserve(n=1){const start=this.next;this.next+=n;if(this.next>255)this.error('function needs too many registers');this.p.maxstacksize=Math.max(this.p.maxstacksize,this.next);return start;}
 emit(word){const pc=this.p.code.length;this.session?.grow(this.p,'code',pc+1);this.p.code.push(word);this.p.lines.push(this.line||1);return pc;}
 abc(op,A=0,B=0,C=0,k=0){
  const pc=this.p.code.length,previous=this.p.code[pc-1];if(op==='LOADNIL'&&pc>this.lastTarget&&(previous&127)===O.LOADNIL){const oldA=previous>>>7&255,oldEnd=oldA+(previous>>>16&255);if(A<=oldEnd+1&&oldA<=A+B+1){const first=Math.min(A,oldA),last=Math.max(A+B,oldEnd);this.p.code[pc-1]=ABC(O.LOADNIL,first,last-first);return pc-1;}}
  return this.emit(ABC(O[op],A,B,C,k));
 }
 jump(){return this.emit((O.JMP|16777215<<7)>>>0);}
 patch(pc,target=this.p.code.length){if(target===this.p.code.length)this.lastTarget=target;const offset=target-pc-1;if(Math.abs(offset)>16777215)this.error('control structure too long');this.p.code[pc]=(O.JMP|(offset+16777215)<<7)>>>0;}
 bind(name,attribute=null,reg=this.reserve()){const local={name,attribute,reg,captured:false,debug:{varname:name,startpc:this.p.code.length,endpc:0}};this.locals.push(local);this.bindings.push(local);this.session?.local(this.p,name);this.p.locvars.push(local.debug);return local;}
 local(name){return this.locals.findLast(l=>l.name===name);}
 capture(name){const local=this.local(name);if(local){local.captured=true;return{instack:1,idx:local.reg,kind:local.attribute==='const'?1:local.attribute==='close'?2:0,name};}const index=this.up(name);return index===null?null:{instack:0,idx:index,kind:0,name};}
 up(name){const found=this.p.upvalues.findIndex(u=>u.name===name);if(found>=0)return found;if(!this.parent)return null;const desc=this.parent.capture(name);if(!desc)return null;this.session?.upvalueName(name,this.p);this.session?.grow(this.p,'upvalues',this.p.upvalues.length+1);this.p.upvalues.push(desc);return this.p.upvalues.length-1;}
 constant(value){
  let key;if(typeof value==='bigint')key='number:'+value;else if(typeof value==='number'){let number=value;if(Number.isInteger(number)&&number>=-(2**63)&&number<2**63)number=number===0?2**-52:number+number*2**-52;key=Number.isInteger(number)&&number>=-(2**63)&&number<2**63?'number:'+BigInt(number):'float:'+number;}else key=typeof value+':'+value;
  let index=this.constantCache.get(key);if(index===undefined||index>=this.p.constants.length||typeof this.p.constants[index]!==typeof value||this.p.constants[index]!==value){index=this.p.constants.length;this.session?.constant(this.p,value,index);this.p.constants.push(value);this.constantCache.set(key,index);}if(index>131071)this.error('too many constants');return index;
 }
 load(value,target){if(value===null)this.abc('LOADNIL',target);else if(typeof value==='boolean')this.abc(value?'LOADTRUE':'LOADFALSE',target);else if(typeof value==='bigint'&&value>=-65535n&&value<=65536n)this.emit(AsBx(O.LOADI,target,Number(value)));else if(typeof value==='number'&&Number.isInteger(value)&&!Object.is(value,-0)&&Math.abs(value)<=65535)this.emit(AsBx(O.LOADF,target,value));else this.emit(ABx(O.LOADK,target,this.constant(value)));}
 variable(name,target,beforeDischarge=null){const local=this.local(name);if(local?.hasConstant){beforeDischarge?.();this.load(local.constantValue,target);return;}if(local){beforeDischarge?.();if(local.reg!==target)this.abc('MOVE',target,local.reg);return;}const up=this.up(name);if(up!==null){beforeDischarge?.();this.abc('GETUPVAL',target,up);return;}const env=this.local('_ENV'),envUp=env?null:this.up('_ENV'),index=this.constant(name);beforeDischarge?.();if(index<=255)this.abc(env?'GETFIELD':'GETTABUP',target,env?env.reg:envUp,index);else{const base=this.reserve(),key=this.reserve();this.variable('_ENV',base);this.load(name,key);this.abc('GETTABLE',target,base,key);}}
 folded(node){if(node.kind==='variable'){let compiler=this;while(compiler){const local=compiler.local(node.name);if(local)return local.hasConstant?{value:local.constantValue}:null;compiler=compiler.parent;}}if(node.kind==='unary'&&node.op==='not'){const value=this.folded(node.value);if(value)return{value:value.value===null||value.value===false};}if(node.kind==='paren')return this.folded(node.value);if(node.kind==='literal')return{value:node.value};if(node.kind==='unary'&&['-','~'].includes(node.op)){const value=this.folded(node.value);if(value&&['number','bigint'].includes(typeof value.value)){try{const result=arithmetic(node.op==='-'?'unm':'bnot',value.value);if(typeof result==='bigint'||Number.isFinite(result)&&!Object.is(result,-0))return{value:result};}catch{}}}if(node.kind==='binary'&&arith[node.op]){const a=this.folded(node.left),b=this.folded(node.right);if(a&&b&&['number','bigint'].includes(typeof a.value)&&['number','bigint'].includes(typeof b.value)){try{const result=arithmetic(node.op,a.value,b.value);if(typeof result==='bigint'||Number.isFinite(result)&&!Object.is(result,-0))return{value:result};}catch{}}}return null;}
 expression(node,target,count=1,beforeDischarge=null){
  this.line=node.endline??node.line??this.line;const start=this.next;this.next=Math.max(this.next,target+Math.max(count,1));this.p.maxstacksize=Math.max(this.p.maxstacksize,this.next);
  const folded=this.folded(node);this.session?.expression(node,Boolean(folded));if(folded){beforeDischarge?.();this.load(folded.value,target);for(let n=1;n<count;n++)this.load(null,target+n);this.next=start;return;}
  const temp=()=>this.reserve();const operand=(value,preferred=undefined,beforeDischarge=null)=>{const local=value.kind==='variable'?this.local(value.name):null;if(local&&!local.hasConstant){this.session?.readTo(value.tokenEnd);beforeDischarge?.();return local.reg;}const minimum=this.locals.reduce((n,local)=>Math.max(n,local.reg+1),0);const register=preferred!==undefined&&preferred>=minimum?preferred:temp();this.next=Math.max(this.next,register+1);this.expression(value,register,1,beforeDischarge);return register;};
  if(node.kind==='variable')this.variable(node.name,target,beforeDischarge);
  else if(node.kind==='paren')this.expression(node.value,target,1,beforeDischarge);
  else if(node.kind==='vararg')this.abc('VARARG',target,0,count<0?0:count+1);
  else if(node.kind==='function'){
   const index=this.p.protos.length;this.session?.grow(this.p,'protos',index+1);this.p.protos.push(null);const childCompiler=new Compiler(node,this);this.p.protos[index]=childCompiler.p;const child=childCompiler.compile(()=>{this.line=node.endline??this.line;this.emit(ABx(O.CLOSURE,target,index));});this.p.protos[index]=child;
  }else if(node.kind==='index'){
   const local=node.table.kind==='variable'?this.local(node.table.name):null,base=local?local.reg:target>=this.locals.reduce((n,local)=>Math.max(n,local.reg+1),0)?target:temp();if(!local)this.expression(node.table,base);
   this.session?.readTo(node.key.tokenEnd);
   if(node.key.kind==='literal'&&typeof node.key.value==='string'&&this.constant(node.key.value)<=255){const key=this.constant(node.key.value);beforeDischarge?.();this.abc('GETFIELD',target,base,key);}
   else if(node.key.kind==='literal'&&typeof node.key.value==='bigint'&&node.key.value>=0n&&node.key.value<=255n)this.abc('GETI',target,base,Number(node.key.value));
   else{const key=operand(node.key,base===target?undefined:target);this.abc('GETTABLE',target,base,key);}
  }else if(node.kind==='unary'){
   let inner=node.value;while(inner.kind==='paren')inner=inner.value;
   if(node.op==='not'&&inner.kind==='binary'&&['and','or','==','~=','<','<=','>','>='].includes(inner.op)){const before=this.next;this.next=Math.max(target,this.locals.reduce((n,local)=>Math.max(n,local.reg+1),0));const yes=this.test(node.value,false);this.next=before;this.abc('LFALSESKIP',target);for(const jump of yes)this.patch(jump);this.abc('LOADTRUE',target);}
   else{const value=operand(node.value,target);this.abc({'-':'UNM','~':'BNOT','not':'NOT','#':'LEN'}[node.op],target,value);}
  }
  else if(node.kind==='binary'){
   if(node.op==='and'||node.op==='or'){
    const literal=this.folded(node.left);if(literal&&((node.op==='and'&&literal.value!==null&&literal.value!==false)||(node.op==='or'&&(literal.value===null||literal.value===false)))){this.expression(node.right,target,count,beforeDischarge);this.next=start;return;}
    let chain=node.left;while(chain.kind==='paren')chain=chain.value;
    if(chain.kind==='binary'&&((node.op==='or'&&chain.op==='and')||(node.op==='and'&&chain.op==='or'))){
     const before=this.next;this.next=target;const skips=this.test(chain.left,node.op==='and',chain.right.tokenStart);this.next=before;const valueStart=this.p.code.length;this.expression(chain.right,target);let deferred=chain.right;while(deferred.kind==='paren')deferred=deferred.value;this.line=node.line??chain.endline??this.line;if(['literal','variable','index'].includes(deferred.kind)&&this.p.code.length>valueStart)this.p.lines[this.p.lines.length-1]=this.line;this.abc('TEST',target,0,0,node.op==='or'?1:0);const done=this.jump();for(const skip of skips)this.patch(skip);this.expression(node.right,target);this.patch(done);
    }else{
    const local=node.left.kind==='variable'?this.local(node.left.name):null;if(local&&local.reg!==target)this.abc('TESTSET',target,local.reg,0,node.op==='and'?0:1);else{this.expression(node.left,target);this.session?.readTo(node.right.tokenStart);this.abc('TEST',target,0,0,node.op==='and'?0:1);}const jump=this.jump();this.expression(node.right,target);this.patch(jump);}
   }else if(node.op==='..'){
    const pieces=[],operators=[];const flatten=n=>{if(n.kind==='binary'&&n.op==='..'){flatten(n.left);operators[pieces.length-1]=n.line;flatten(n.right);}else pieces.push(n);};flatten(node);for(let n=0;n<pieces.length;n++){this.next=target+n;const before=this.p.code.length;if(this.folded(pieces[n])&&n+1<pieces.length)this.session?.readTo(pieces[n+1].tokenStart);this.expression(pieces[n],target+n);let value=pieces[n];while(value.kind==='paren')value=value.value;if(operators[n]!==undefined&&['literal','variable','index'].includes(value.kind)&&this.p.code.length>before)this.p.lines[this.p.lines.length-1]=operators[n];this.next=target+n+1;}let last=node;while(last.right?.kind==='binary'&&last.right.op==='..')last=last.right;this.line=last.line??this.line;this.abc('CONCAT',target,pieces.length);
   }else if(arith[node.op]){this.arithmetic(node,target,operand);}
   else{
    const yes=this.comparison(node,1,target);this.abc('LFALSESKIP',target);this.patch(yes);this.abc('LOADTRUE',target);
   }
  }else if(node.kind==='call'){
   const base=target;this.next=Math.max(this.next,base+1);this.p.maxstacksize=Math.max(this.p.maxstacksize,this.next);
   if(node.method){const readMethod=()=>this.session?.readTo(node.methodStart+1),receiver=operand(node.callee,base,readMethod);readMethod();this.line=node.line??this.line;const key=this.constant(node.method);if(key<=255)this.abc('SELF',base,receiver,key,1);else{const kr=temp();this.load(node.method,kr);this.abc('SELF',base,receiver,kr);}}
   else this.expression(node.callee,base);
   const argumentsBase=base+1+Number(Boolean(node.method));let open=false;
   for(let n=0;n<node.args.length;n++){open=n===node.args.length-1&&['call','vararg'].includes(node.args[n].kind);this.next=argumentsBase+n;this.expression(node.args[n],argumentsBase+n,open?-1:1,()=>this.session?.readTo(n+1<node.args.length?node.args[n+1].tokenStart:node.tokenEnd));this.next=argumentsBase+n+1;}
   this.session?.readTo(node.tokenEnd);this.line=node.line??this.line;this.abc(count===-2?'TAILCALL':'CALL',base,open?0:1+Number(Boolean(node.method))+node.args.length,count===-2?(this.node.vararg?this.node.params.length+1:0):count<0?0:count+1,count===-2?1:0);
   if(count<0&&base!==target)this.error('open result register layout unsupported');
   if(count>=0&&base!==target)for(let n=0;n<count;n++)this.abc('MOVE',target+n,base+n);
  }else if(node.kind==='table'){
   this.line=node.emitline??node.line??this.line;const list=node.fields.filter(f=>f.key===null),hash=node.fields.length-list.length;this.abc('NEWTABLE',target,hash?Math.ceil(Math.log2(hash))+1:0,(list.length-Number(node.fields.at(-1)?.key===null&&['call','vararg'].includes(node.fields.at(-1)?.value.kind)))&255,list.length>256?1:0);this.emit((O.EXTRAARG|Math.floor((list.length-Number(node.fields.at(-1)?.key===null&&['call','vararg'].includes(node.fields.at(-1)?.value.kind)))/256)<<7)>>>0);
   let pending=0,baseIndex=0;
   const flush=(open=false)=>{if(!pending&&!open)return;const high=Math.floor(baseIndex/256);this.line=node.endline??this.line;this.abc('SETLIST',target,open?0:pending,baseIndex&255,high?1:0);if(high)this.emit((O.EXTRAARG|high<<7)>>>0);baseIndex+=pending;pending=0;};
   for(let n=0;n<node.fields.length;n++){
    const field=node.fields[n];if(field.key){
     const before=this.next,keyLiteral=this.folded(field.key),valueLiteral=this.folded(field.value);let mode='SETTABLE',key;
     if(keyLiteral)this.session?.readTo(field.value.tokenStart);
     if(keyLiteral&&typeof keyLiteral.value==='string'&&this.constant(keyLiteral.value)<=255){mode='SETFIELD';key=this.constant(keyLiteral.value);}
     else if(keyLiteral&&typeof keyLiteral.value==='bigint'&&keyLiteral.value>=0n&&keyLiteral.value<=255n){mode='SETI';key=Number(keyLiteral.value);}
     else key=operand(field.key);
     if(valueLiteral)this.session?.readTo(field.value.tokenEnd);
     let value,k=0;if(valueLiteral&&this.constant(valueLiteral.value)<=255){value=this.constant(valueLiteral.value);k=1;}else value=operand(field.value);
     this.line=field.endline??this.line;this.abc(mode,target,key,value,k);this.next=before;
    }
    else{const last=n===node.fields.length-1,open=last&&['call','vararg'].includes(field.value.kind),reg=target+1+pending;this.next=Math.max(this.next,reg+1);this.p.maxstacksize=Math.max(this.p.maxstacksize,this.next);const before=this.p.code.length;if(this.folded(field.value))this.session?.readTo(last?node.tokenEnd:(node.fields[n+1].key??node.fields[n+1].value).tokenStart);this.expression(field.value,reg,open?-1:1);let deferred=field.value;while(deferred.kind==='paren')deferred=deferred.value;if(last&&['literal','variable','index'].includes(deferred.kind)&&this.p.code.length>before)this.p.lines[this.p.lines.length-1]=node.endline;pending++;if(pending===50||last)flush(open);}
   }this.session?.readTo(node.tokenEnd);flush();
  }else this.error(`compiler does not recognize expression ${node.kind}`);
  if(count>1&&!['call','vararg'].includes(node.kind))for(let n=1;n<count;n++)this.load(null,target+n);
  this.next=start;
 }
 comparison(node,want,preferred=undefined){
  if(preferred!==undefined&&preferred<this.locals.reduce((n,local)=>Math.max(n,local.reg+1),0))preferred=undefined;
  let op=node.op,left=node.left,right=node.right,lc=this.folded(left),rc=this.folded(right);const before=this.next;
  const registers=new Map();const register=(value,beforeDischarge=null)=>{if(registers.has(value)){beforeDischarge?.();return registers.get(value);}const local=value.kind==='variable'?this.local(value.name):null;if(local&&!local.hasConstant){this.session?.readTo(value.tokenEnd);beforeDischarge?.();return local.reg;}const r=preferred??this.reserve();preferred=undefined;this.expression(value,r,1,beforeDischarge);registers.set(value,r);return r;};
  const small=value=>value&&['number','bigint'].includes(typeof value.value)&&Number.isInteger(Number(value.value))&&value.value>=-127&&value.value<=128;
  if(['<','<=','>','>='].includes(op)&&!small(lc))register(left);
  if(op==='>'||op==='>='){op=op==='>'?'<':'<=';[left,right]=[right,left];[lc,rc]=[rc,lc];}
  let name,A,B,C=0,k=want;
  if(op==='=='||op==='~='){
   if(lc){[left,right]=[right,left];[lc,rc]=[rc,lc];}A=register(left,()=>this.session?.readTo(right.tokenEnd));this.session?.readTo(right.tokenEnd);if(small(rc)){name='EQI';B=Number(rc.value)+127;C=Number(typeof rc.value==='number');}
   else if(rc&&this.constant(rc.value)<=255){name='EQK';B=this.constant(rc.value);}else{name='EQ';B=register(right);}if(op==='~=')k=1-k;
  }else if(small(rc)){name=op==='<'?'LTI':'LEI';A=register(left);B=Number(rc.value)+127;C=Number(typeof rc.value==='number');}
  else if(small(lc)){name=op==='<'?'GTI':'GEI';A=register(right);B=Number(lc.value)+127;C=Number(typeof lc.value==='number');}
  else{name=op==='<'?'LT':'LE';A=register(left);B=register(right);C=lc&&['number','bigint'].includes(typeof lc.value)?Number(typeof lc.value==='number'):rc&&['number','bigint'].includes(typeof rc.value)?Number(typeof rc.value==='number'):0;}
  this.session?.readTo(node.tokenEnd);this.line=node.endline??this.line;this.abc(name,A,B,C,k);const jump=this.jump();this.next=before;return jump;
 }
 test(node,want=false,nextToken=null){if(['literal','variable'].includes(node.kind))this.session?.readTo(node.tokenEnd);
  if(node.kind==='paren')return this.test(node.value,want,nextToken);
  if(node.kind==='unary'&&node.op==='not')return this.test(node.value,!want,nextToken);
  if(node.kind==='binary'&&['==','~=','<','<=','>','>='].includes(node.op))return[this.comparison(node,Number(want))];
  if(node.kind==='binary'&&(node.op==='and'||node.op==='or')){
   const same=node.op===(want?'or':'and');if(same)return this.test(node.left,want,node.right.tokenStart).concat(this.test(node.right,want,nextToken));
   const skip=this.test(node.left,!want,node.right.tokenStart),jumps=this.test(node.right,want,nextToken);for(const jump of skip)this.patch(jump);return jumps;
  }
  const literal=this.folded(node);if(literal){const value=literal.value!==null&&literal.value!==false;this.session?.readTo(nextToken);return value===want?[this.jump()]:[];}
  const before=this.next,local=node.kind==='variable'?this.local(node.name):null,register=local?local.reg:this.reserve();if(!local)this.expression(node,register);this.session?.readTo(nextToken);this.line=node.endline??this.line;this.abc('TEST',register,0,0,Number(want));const jump=this.jump();this.next=before;return[jump];
 }
 arithmetic(node,target,operand){
  let leftNode=node.left,rightNode=node.right,flip=0,op=node.op;let leftConstant=this.folded(leftNode),rightConstant=this.folded(rightNode);
  const number=value=>value&&['bigint','number'].includes(typeof value.value),integer=value=>value&&typeof value.value==='bigint',small=value=>integer(value)&&value.value>=-127n&&value.value<=128n;
  if((['+','*'].includes(op)&&number(leftConstant))||(['&','|','~'].includes(op)&&integer(leftConstant))){[leftNode,rightNode]=[rightNode,leftNode];[leftConstant,rightConstant]=[rightConstant,leftConstant];flip=1;}
  let operation=null,encoded=null,mmvalue=null,mmop=null,constantValue=undefined;
  if(op==='+'&&small(rightConstant)){operation='ADDI';encoded=Number(rightConstant.value)+127;mmvalue=encoded;mmop='MMBINI';}
  else if(op==='-'&&small(rightConstant)&&small({value:-rightConstant.value})){operation='ADDI';encoded=127-Number(rightConstant.value);mmvalue=Number(rightConstant.value)+127;mmop='MMBINI';}
  else if(op==='<<'&&small(leftConstant)){[leftNode,rightNode]=[rightNode,leftNode];operation='SHLI';encoded=Number(leftConstant.value)+127;mmvalue=encoded;mmop='MMBINI';flip=1;}
  else if(op==='<<'&&small(rightConstant)&&small({value:-rightConstant.value})){operation='SHRI';encoded=127-Number(rightConstant.value);mmvalue=Number(rightConstant.value)+127;mmop='MMBINI';}
  else if(op==='>>'&&small(rightConstant)){operation='SHRI';encoded=Number(rightConstant.value)+127;mmvalue=encoded;mmop='MMBINI';}
  else if(!['<<','>>'].includes(op)&&number(rightConstant)&&(!['&','|','~'].includes(op)||integer(rightConstant))){operation=arith[op]+'K';constantValue=rightConstant.value;mmop='MMBINK';}
  if(operation){const leftLiteral=this.folded(leftNode);if(typeof leftLiteral?.value==='string')this.constant(leftLiteral.value);const prepareK=()=>{this.session?.readTo(node.tokenEnd);if(constantValue!==undefined&&encoded===null){encoded=this.constant(constantValue);mmvalue=encoded;}};const left=operand(leftNode,target,leftLiteral?prepareK:null);prepareK();if(constantValue!==undefined){if(encoded>255){const right=operand(rightNode,left===target?undefined:target);this.line=node.line??this.line;this.abc(arith[op],target,left,right);this.abc('MMBIN',left,right,tm[op]);return;}}this.line=node.line??this.line;this.abc(operation,target,left,encoded);this.abc(mmop,left,mmvalue,tm[op],flip);return;}
  if(flip)[leftNode,rightNode]=[rightNode,leftNode];let left,right;if(number(this.folded(leftNode))){right=operand(rightNode,target);left=operand(leftNode);}else{left=operand(leftNode,target);right=operand(rightNode,left===target?undefined:target);}this.session?.readTo(node.tokenEnd);this.line=node.line??this.line;this.abc(arith[op],target,left,right);this.abc('MMBIN',left,right,tm[op]);
 }
 values(nodes,base,count,nextNode=null){this.next=base;for(let n=0;n<nodes.length;n++){const last=n===nodes.length-1,remaining=Math.max(0,count-n);this.next=base+n;if(this.folded(nodes[n]))this.session?.readTo((nodes[n+1]??nextNode)?.tokenStart);this.expression(nodes[n],base+n,last?remaining:1);this.next=base+n+1;}this.p.maxstacksize=Math.max(this.p.maxstacksize,base+count);if(!nodes.length&&count)this.abc('LOADNIL',base,count-1);else if(nodes.length<count&&!['call','vararg'].includes(nodes.at(-1).kind))this.abc('LOADNIL',base+nodes.length,count-nodes.length-1);this.next=base+Math.max(count,nodes.length);}
 beginScope(){const scope={locals:this.locals.length,next:this.next,labels:this.labels.length};this.scopes.push(scope);return scope;}
 endScope(scope){const departing=this.locals.slice(scope.locals),end=this.p.code.length;if(!scope.suppressClose&&departing.some(l=>l.captured||l.attribute==='close'))this.abc('CLOSE',scope.next);this.session?.leaveLocals(this.p,departing.length);for(const local of departing)if(local.debug)local.debug.endpc=local.fixedEnd??end;this.locals.length=scope.locals;this.next=scope.next;this.scopes.pop();}
 block(nodes,scoped=true){const scope=scoped?this.beginScope():null;for(const node of nodes){this.line=node.line??this.line;this.session?.statement(node,this.p);this.statement(node);this.session?.readTo(node.tokenEnd);if(node.functionDefinition)this.p.lines[this.p.lines.length-1]=node.line;this.next=this.locals.length?Math.max(...this.locals.map(l=>l.reg+1)):0;}if(scope)this.endScope(scope);}
 statement(node){
  if(node.kind==='local'){
   if(node.names.length===1&&node.names[0].attribute==='const'&&node.values.length===1){const folded=this.folded(node.values[0]);if(folded){const local={name:node.names[0].name,attribute:'const',reg:-1,captured:false,hasConstant:true,constantValue:folded.value};this.locals.push(local);this.bindings.push(local);this.session?.constantLocal(this.p,local.name);return;}}
   const base=this.next;this.values(node.values,base,node.names.length);this.next=base+node.names.length;
   for(let n=0;n<node.names.length;n++){const {name,attribute}=node.names[n];this.bind(name,attribute,base+n);if(attribute==='close')this.abc('TBC',base+n);}
  }else if(node.kind==='localfunction'){const local=this.bind(node.name);this.expression(node.value,local.reg);local.debug.startpc=this.p.code.length;}
  else if(node.kind==='assign'){
   if(node.targets.length===1&&node.targets[0].kind==='variable'&&node.values.length===1){const local=this.local(node.targets[0].name);if(local&&(['literal','variable','function','unary','index','paren'].includes(node.values[0].kind)||node.values[0].kind==='binary'&&!['..','and','or'].includes(node.values[0].op))){if(local.attribute)this.error(`attempt to assign to const variable '${local.name}'`);this.expression(node.values[0],local.reg);return;}}
   const references=node.targets.map(target=>{if(target.kind==='variable'){const local=this.local(target.name);if(local?.attribute)this.error(`attempt to assign to const variable '${target.name}'`);const up=local?null:this.up(target.name),envLocal=!local&&up===null?this.local('_ENV'):null,envUp=!local&&up===null?this.up('_ENV'):null;return{target,local,up,key:!local&&up===null?this.constant(target.name):null,envLocal,envUp};}
    const tableLocal=target.table.kind==='variable'?this.local(target.table.name):null,tableUp=target.table.kind==='variable'&&!tableLocal?this.up(target.table.name):null;
    if(tableUp!==null){const literal=this.folded(target.key);if(literal&&typeof literal.value==='string'&&this.constant(literal.value)<=255)return{table:tableUp,key:this.constant(literal.value),mode:'SETTABUP'};let mode='SETTABLE',key;if(literal&&typeof literal.value==='bigint'&&literal.value>=0n&&literal.value<=255n){mode='SETI';key=Number(literal.value);}else{const local=target.key.kind==='variable'?this.local(target.key.name):null;key=local?local.reg:this.reserve();if(!local){this.expression(target.key,key);let expression=target.key;while(expression.kind==='paren')expression=expression.value;if(['unary','index'].includes(expression.kind)||expression.kind==='binary'&&arith[expression.op]){let pc=this.p.code.length-1;if([O.MMBIN,O.MMBINI,O.MMBINK].includes(this.p.code[pc]&127))pc--;if((this.p.code[pc]>>>7&255)===key){const table=key;key++;this.p.code[pc]=((this.p.code[pc]&~32640)|(key<<7))>>>0;this.next=Math.max(this.next,key+1);this.p.maxstacksize=Math.max(this.p.maxstacksize,this.next);this.abc('GETUPVAL',table,tableUp);return{table,key,mode};}}}}const table=this.reserve();this.abc('GETUPVAL',table,tableUp);return{table,key,mode};}
    const table=tableLocal?tableLocal.reg:this.reserve();if(!tableLocal)this.expression(target.table,table);
    const literal=this.folded(target.key);let key,mode='SETTABLE';if(literal&&typeof literal.value==='string'&&this.constant(literal.value)<=255){key=this.constant(literal.value);mode='SETFIELD';}else if(literal&&typeof literal.value==='bigint'&&literal.value>=0n&&literal.value<=255n){key=Number(literal.value);mode='SETI';}else{const keyLocal=target.key.kind==='variable'?this.local(target.key.name):null;key=keyLocal?keyLocal.reg:this.reserve();if(!keyLocal)this.expression(target.key,key);}return{table,key,mode};});
   if(references.length===1&&node.values.length===1){const value=node.values[0],sourceLocal=value.kind==='variable'?this.local(value.name):null,ref=references[0];if(sourceLocal){if(ref.up!==null&&ref.up!==undefined)this.abc('SETUPVAL',sourceLocal.reg,ref.up);else if(ref.target&&ref.key<=255&&!ref.envLocal)this.abc('SETTABUP',ref.envUp,ref.key,sourceLocal.reg);else if(ref.target&&ref.key<=255)this.abc('SETFIELD',ref.envLocal.reg,ref.key,sourceLocal.reg);else if(ref.mode)this.abc(ref.mode,ref.table,ref.key,sourceLocal.reg);else sourceLocal.unused=true;if(!sourceLocal.unused)return;delete sourceLocal.unused;}}
   if(references.length===1&&node.values.length===1){const folded=this.folded(node.values[0]),ref=references[0];if(folded&&!ref.local&&ref.up===null&&ref.key<=255&&!ref.envLocal&&this.constant(folded.value)<=255){this.abc('SETTABUP',ref.envUp,ref.key,this.constant(folded.value),1);return;}if(folded&&ref.mode&&this.constant(folded.value)<=255){this.abc(ref.mode,ref.table,ref.key,this.constant(folded.value),1);return;}}
   const base=this.next,lastRef=references.at(-1),lastConstant=node.values.length===references.length&&references.length>1?this.folded(node.values.at(-1)):null;
   let direct=false;if(lastConstant&&(lastRef.local||lastRef.mode||lastRef.target&&lastRef.up===null&&lastRef.key<=255)){this.values(node.values.slice(0,-1),base,node.targets.length-1,node.values.at(-1));if(lastRef.local)direct=true;else{const index=this.constant(lastConstant.value);if(index<=255){lastRef.constant=index;direct=true;}else{this.load(lastConstant.value,base+references.length-1);this.next=base+references.length;}}}else this.values(node.values,base,node.targets.length);this.line=node.endline??this.line;
   for(let n=references.length-1;n>=0;n--){const ref=references[n];if(direct&&n===references.length-1){if(ref.local)this.load(lastConstant.value,ref.local.reg);else if(ref.mode)this.abc(ref.mode,ref.table,ref.key,ref.constant,1);else if(ref.envLocal)this.abc('SETFIELD',ref.envLocal.reg,ref.key,ref.constant,1);else this.abc('SETTABUP',ref.envUp,ref.key,ref.constant,1);continue;}const value=base+n;if(ref.local)this.abc('MOVE',ref.local.reg,value);else if(ref.up!==null&&ref.up!==undefined)this.abc('SETUPVAL',value,ref.up);else if(ref.target){if(ref.key<=255&&!ref.envLocal)this.abc('SETTABUP',ref.envUp,ref.key,value);else if(ref.key<=255)this.abc('SETFIELD',ref.envLocal.reg,ref.key,value);else{const env=this.reserve(),key=this.reserve();this.variable('_ENV',env);this.load(ref.target.name,key);this.abc('SETTABLE',env,key,value);}}else this.abc(ref.mode,ref.table,ref.key,value);}
  }else if(node.kind==='callstatement'){const target=this.reserve();this.expression(node.value,target,0);}
  else if(node.kind==='return'){
   const found=node.values.length===1&&node.values[0].kind==='variable'?this.local(node.values[0].name):null,local=found&&!found.hasConstant?found:null;
   if(local){this.session?.readTo(node.values[0].tokenEnd);this.abc('RETURN',local.reg,2,this.node.vararg?this.node.params.length+1:0,0);return;}
   const base=this.next,last=node.values.at(-1),open=last&&['call','vararg'].includes(last.kind);
   for(let n=0;n<node.values.length;n++){this.next=base+n;this.expression(node.values[n],base+n,node.values.length===1&&last.kind==='call'&&!this.locals.some(l=>l.attribute==='close')?-2:n===node.values.length-1&&open?-1:1,()=>this.session?.readTo(node.values[n+1]?.tokenStart));this.next=base+n+1;}
   this.abc('RETURN',base,open?0:node.values.length+1,this.node.vararg?this.node.params.length+1:0,1);
  }else if(node.kind==='do')this.block(node.body);
  else if(node.kind==='if'){
   const ends=[];for(let index=0;index<node.branches.length;index++){const branch=node.branches[index],loop=this.breaks.at(-1);if(branch.body.length===1&&branch.body[0].kind==='break'&&loop&&!loop.needsclose&&!this.locals.some(local=>local.reg>=loop.level&&(local.captured||local.attribute==='close'))){loop.jumps.push(...this.test(branch.test,true));this.session?.readTo(branch.body[0].tokenEnd);this.session?.growTemporary('gotos',loop.jumps.length,24);continue;}const next=this.test(branch.test,false);this.block(branch.body);if(index+1<node.branches.length||node.hasElse||node.otherwise.length){this.line=branch.body.at(-1)?.endline??this.line;ends.push(this.jump());}for(const jump of next)this.patch(jump);}this.block(node.otherwise);for(const end of ends)this.patch(end);
  }else if(node.kind==='while'){
   const before=this.next,begin=this.p.code.length,done=this.test(node.test,false),breaks=[];this.breaks.push({jumps:breaks,level:before});this.block(node.body);const back=this.jump();this.patch(back,begin);for(const jump of done)this.patch(jump);for(const jump of breaks)this.patch(jump);this.breaks.pop();this.session?.loopClose();
  }else if(node.kind==='repeat'){
   const begin=this.p.code.length,scope=this.beginScope(),breaks=[];this.breaks.push({jumps:breaks,level:scope.next});this.block(node.body,false);if(this.locals.slice(scope.locals).some(l=>l.captured||l.attribute==='close')){const test=this.reserve();this.expression(node.test,test);this.abc('CLOSE',scope.next);this.abc('TEST',test,0,0,0);const back=this.jump();this.patch(back,begin);}else for(const back of this.test(node.test,false))this.patch(back,begin);this.endScope(scope);for(const jump of breaks)this.patch(jump);this.breaks.pop();this.session?.loopClose();
  }else if(node.kind==='for'){
   const scope=this.beginScope(),base=this.next;scope.suppressClose=true;this.expression(node.start,base);this.next=base+1;this.expression(node.stop,base+1);this.next=base+2;this.expression(node.step,base+2);this.next=base+4;this.p.maxstacksize=Math.max(this.p.maxstacksize,this.next);const hidden=[];for(let n=0;n<3;n++)hidden.push(this.bind('(for state)',null,base+n));this.session?.readTo(node.body[0]?.tokenStart);const prep=this.emit(ABx(O.FORPREP,base,0)),begin=this.p.code.length,breaks=[];this.breaks.push({jumps:breaks,level:base});
   for(const local of hidden)local.debug.startpc=prep;const visible=this.bind(node.variable,null,base+3);this.block(node.body);visible.fixedEnd=this.p.code.length;if(this.locals.some(l=>l.reg===base+3&&l.captured))this.abc('CLOSE',base+3);
   const loop=this.p.code.length;this.line=node.line;this.emit(ABx(O.FORLOOP,base,loop+1-begin));this.p.code[prep]=ABx(O.FORPREP,base,loop-prep-1);for(const jump of breaks)this.patch(jump);this.breaks.pop();this.endScope(scope);this.session?.loopClose();
  }else if(node.kind==='forin'){
   this.needclose=true;const scope=this.beginScope(),base=this.reserve(4+node.names.length);this.values(node.values,base,4);this.next=base+4+node.names.length;this.p.maxstacksize=Math.max(this.p.maxstacksize,base+7);const hidden=[];for(let n=0;n<4;n++)hidden.push(this.bind('(for state)',null,base+n));this.session?.readTo(node.body[0]?.tokenStart);const prep=this.emit(ABx(O.TFORPREP,base,0)),begin=this.p.code.length,breaks=[];this.breaks.push({jumps:breaks,level:base,needsclose:true});for(const local of hidden)local.debug.startpc=prep;const visible=[];for(let n=0;n<node.names.length;n++)visible.push(this.bind(node.names[n],null,base+4+n));this.block(node.body);for(const local of visible)local.fixedEnd=this.p.code.length;if(this.locals.some(l=>l.reg>=base+4&&l.captured))this.abc('CLOSE',base+4);
   const call=this.p.code.length;this.line=node.line;this.abc('TFORCALL',base,0,node.names.length);const loop=this.p.code.length;this.emit(ABx(O.TFORLOOP,base,loop+1-begin));this.p.code[prep]=ABx(O.TFORPREP,base,call-prep-1);for(const jump of breaks)this.patch(jump);this.breaks.pop();for(const local of hidden)local.fixedEnd=this.p.code.length;this.line=node.endline??node.line;this.session?.loopClose();this.abc('CLOSE',base);this.endScope(scope);
  }else if(node.kind==='break'){const loop=this.breaks.at(-1);if(!loop)this.error('break outside loop');if(loop.needsclose||this.locals.some(local=>local.reg>=loop.level&&(local.captured||local.attribute==='close')))this.abc('CLOSE',loop.level);loop.jumps.push(this.jump());this.session?.growTemporary('gotos',loop.jumps.length,24);}
  else if(node.kind==='label'){this.session?.readTo(node.tokenEnd);this.session?.growTemporary('labels',this.labels.length+1,24);if(this.labels.some(l=>l.name===node.name&&l.scopes.length===this.scopes.length&&l.scopes.every((scope,index)=>scope===this.scopes[index])))this.error(`label '${node.name}' already defined on line ${this.labels.find(l=>l.name===node.name).line}`);this.labels.push({name:node.name,line:node.line,pc:this.p.code.length,locals:this.locals.slice(),scopes:this.scopes.slice()});}
  else if(node.kind==='goto'){const previous=this.labels.findLast(label=>label.name===node.name&&label.scopes.length<=this.scopes.length&&label.scopes.every((scope,index)=>scope===this.scopes[index])),labelLevel=previous?.locals.reduce((end,local)=>Math.max(end,local.reg+1),0),currentLevel=this.locals.reduce((end,local)=>Math.max(end,local.reg+1),0);const close=previous?currentLevel>labelLevel?this.abc('CLOSE',labelLevel):null:this.locals.some(local=>local.captured||local.attribute==='close')?this.abc('CLOSE',0):null,jump=this.jump();if(!previous)this.session?.growTemporary('gotos',this.gotos.length+1,24);this.gotos.push({name:node.name,line:node.line,pc:jump,close,locals:this.locals.slice(),scopes:this.scopes.slice()});}
  else this.error(`compiler does not recognize statement ${node.kind}`);
 }
 compile(beforeFinish=null){
  this.line=this.parent?(this.node.paramline??this.node.linedefined):1;if(this.node.vararg)this.abc('VARARGPREP',this.node.params.length);if(!this.parent)this.session?.grow(this.p,'upvalues',this.p.upvalues.length);this.session?.startFunction(this.node,this.parent);
  this.block(this.node.body,false);this.session?.readTo(this.node.tokenEnd);beforeFinish?.();this.line=this.node.lastlinedefined||this.node.endline||this.line;this.abc('RETURN',this.locals.reduce((n,local)=>Math.max(n,local.reg+1),0),1,this.node.vararg?this.node.params.length+1:0,0);
  for(const jump of this.gotos){const label=this.labels.findLast(l=>l.name===jump.name&&l.scopes.length<=jump.scopes.length&&l.scopes.every((scope,index)=>scope===jump.scopes[index]));if(!label)this.error(`no visible label '${jump.name}' for <goto> at line ${jump.line}`);if(label.locals.some(local=>!jump.locals.includes(local)))this.error(`<goto ${jump.name}> at line ${jump.line} jumps into the scope of local '${label.locals.find(local=>!jump.locals.includes(local)).name}'`);if(jump.close!==null)this.p.code[jump.close]=ABC(O.CLOSE,label.locals.reduce((end,local)=>Math.max(end,local.reg+1),0));this.patch(jump.pc,label.pc);}
  for(const local of this.locals)if(local.debug)local.debug.endpc=this.p.code.length;
  for(let pc=0;pc<this.p.code.length;pc++)if((this.p.code[pc]&127)===O.JMP){let target=pc+1+(this.p.code[pc]>>>7)-16777215;const seen=new Set([pc]);const previous=pc?this.p.code[pc-1]:0,previousOp=previous&127,known=[O.TEST,O.TESTSET].includes(previousOp)?{register:previous>>>7&255,truth:previous>>>15&1}:null;
   while(target>=0&&target<this.p.code.length&&!seen.has(target)){seen.add(target);const word=this.p.code[target],op=word&127;if(op===O.JMP)target+=1+(word>>>7)-16777215;else if(known&&op===O.TEST&&(word>>>7&255)===known.register&&(this.p.code[target+1]&127)===O.JMP){if((word>>>15&1)===known.truth)target+=2+(this.p.code[target+1]>>>7)-16777215;else target+=2;}else break;}this.patch(pc,target);}
  const needclose=this.needclose||this.bindings.some(l=>l.captured||l.attribute==='close');
  for(let pc=0;pc<this.p.code.length;pc++){const word=this.p.code[pc],op=word&127,A=word>>>7&255,B=word>>>16&255;if(op===O.RETURN||op===O.TAILCALL){this.p.code[pc]=(word&~32768)|(needclose?32768:0);if(op===O.RETURN&&!needclose&&!this.node.vararg&&(B===1||B===2))this.p.code[pc]=(this.p.code[pc]&~127)|(B===1?O.RETURN0:O.RETURN1);}}
  let previous=this.p.linedefined,counter=0;for(let pc=0;pc<this.p.lines.length;pc++){const line=this.p.lines[pc],delta=line-previous;if(delta<-127||delta>127||counter++>=128){counter=1;this.p.lineinfo.push(-128);this.p.abslineinfo.push({pc,line});}else this.p.lineinfo.push(delta);previous=line;}
  this.session?.closeFunction(this.p);return this.p;
 }
}
export function compileLuaSource(source,name='chunk',{observer=null,closure=null}={}){
 let session=null;
 try{
  let initial=null;
  if(observer){closure??={luaClosure:true,luaBytecode:true,prototype:null,upvalues:[]};session=new LuaCompilerAllocations(observer,name,closure);initial={source:name,linedefined:0,lastlinedefined:0,numparams:0,is_vararg:1,maxstacksize:2,code:[],constants:luaValues(),upvalues:[],protos:[],lineinfo:[],abslineinfo:[],locvars:[],lines:[]};session.prototype(initial);}
  const parser=new SourceParser(source,name),node=parser.parse();session?.tokens(parser.tokens);const prototype=new Compiler(node,null,session,initial).compile(),strings=new Map();
  const intern=p=>{const constants=luaValues();for(const value of p.constants){if(typeof value!=='string'||value.length<=40){constants.push(value);continue;}if(!strings.has(value))strings.set(value,new LuaString(value,null));constants.push(strings.get(value));}p.constants=constants;for(const child of p.protos)intern(child);};
  if(session)session.finish();else intern(prototype);
  return prototype;
 }finally{session?.dispose();}
}
