/* Lua5.4.8 lcode.c expression descriptors/register code generator.
 * Direct algorithm port; Lua copyright/license: lua/lobject.js.
 * Original lcode.c SHA256:
 * 2cf13c7f8205e9f07c2ccf1fedc3f0f0a05d238c194b176c72cc22b2cc96210e.
 * Instructions, constant/scanner mutations and vector growth occur at their
 * actual code-generation operations. No AST replay, native compiler or I/O.
 */
import { LUA_OP as O, decodeLuaInstruction, luaInstruction, luaInstructionABx } from './codegen.js';
import { LuaError, arithmetic, toInteger, isLuaString, luaStringBytes } from './lobject.js';
const enumeration = names => Object.freeze(Object.fromEntries(names.split(' ').map((n,i)=>[n,i])));
export const ExpKind = enumeration('VVOID VNIL VTRUE VFALSE VK VKFLT VKINT VKSTR VNONRELOC VLOCAL VUPVAL VCONST VINDEXED VINDEXUP VINDEXI VINDEXSTR VJMP VRELOC VCALL VVARARG');
export const BinOpr = enumeration('OPR_ADD OPR_SUB OPR_MUL OPR_MOD OPR_POW OPR_DIV OPR_IDIV OPR_BAND OPR_BOR OPR_BXOR OPR_SHL OPR_SHR OPR_CONCAT OPR_EQ OPR_LT OPR_LE OPR_NE OPR_GT OPR_GE OPR_AND OPR_OR OPR_NOBINOPR');
export const UnOpr = enumeration('OPR_MINUS OPR_BNOT OPR_NOT OPR_LEN OPR_NOUNOPR');
export const NO_JUMP=-1, NO_REG=255;
const K=ExpKind, B=BinOpr, U=UnOpr, MAXARG_Bx=131071, OFFSET_sBx=65535, OFFSET_sJ=16777215, MAXARG_sJ=33554431;
const hasjumps=e=>e.t!==e.f;
const invariant=(condition,message='Lua code generator invariant')=>{if(!condition)throw new Error(message);};
export class Exp {
  constructor(k=K.VVOID,info=0){this.k=k;this.u={info,ival:0n,nval:0,strval:null,ind:{t:0,idx:0},var:{ridx:0,vidx:0}};this.t=this.f=NO_JUMP;}
}
export function initExp(e,k,info=0){e.k=k;e.u??={};e.u.info=info;e.u.ind??={t:0,idx:0};e.u.var??={ridx:0,vidx:0};e.t=e.f=NO_JUMP;return e;}
export function copyExp(to,from){to.k=from.k;to.t=from.t;to.f=from.f;to.u={...from.u,ind:{...from.u.ind},var:{...from.u.var}};return to;}
const fitsC=i=>i>=-127n&&i<=128n, fitsBx=i=>i>=-65535n&&i<=65536n;
const numericValue=e=>e.k===K.VKINT?e.u.ival:e.u.nval;
const isNumeral=e=>!hasjumps(e)&&(e.k===K.VKINT||e.k===K.VKFLT);
const sameConstant=(a,b)=>isLuaString(a)&&isLuaString(b)?luaStringBytes(a)===luaStringBytes(b):typeof a===typeof b&&a===b;
const arithNames=['+','-','*','%','^','/','//','&','|','~','<<','>>','unm','bnot'];
const testMode=op=>op>=O.EQ&&op<=O.TESTSET;
function nativeKey(value){if(isLuaString(value))return 's:'+luaStringBytes(value);if(typeof value==='number'){const i=toInteger(value);if(i!==null)return i;}return value;}
export class LuaCodeGenerator {
  constructor(fs){
    this.fs=fs;this.p=fs.p;this.ls=fs.ls;
    fs.pc??=0;fs.nk??=0;fs.nabslineinfo??=0;fs.previousline??=this.p.linedefined??0;fs.iwthabs??=0;fs.lasttarget??=0;fs.freereg??=0;
    this.p.code??=[];this.p.lines??=[];this.p.lineinfo??=[];this.p.abslineinfo??=[];this.p.constants??=[];this.p.maxstacksize??=2;
    this.ls.constantCache??=new Map();
  }
  error(message){if(this.ls.error)return this.ls.error(message);throw new LuaError(message);}
  semerror(message){if(this.ls.semanticError)return this.ls.semanticError(message);if(this.ls.error)return this.ls.error(message,{semantic:true});throw new LuaError(message);}
  variableStack(){return this.fs.variableStack?this.fs.variableStack():this.fs.nactvar??0;}
  instruction(e){return this.p.code[e.u.info];}
  get(pc){return decodeLuaInstruction(this.p.code[pc]);}
  set(pc,key,value){const shift={op:0,A:7,k:15,B:16,C:24,Bx:15,Ax:7,sJ:7}[key],width={op:7,A:8,k:1,B:8,C:8,Bx:17,Ax:25,sJ:25}[key];const mask=(2**width-1)*2**shift;this.p.code[pc]=((this.p.code[pc]&~mask)|((value+(key==='sJ'?OFFSET_sJ:0))*2**shift))>>>0;}
  const2val(e){return this.fs.constantAt?this.fs.constantAt(e.u.info):this.fs.localAt(e.u.info,true).k;}
  exp2const(e,out=null){
    if(hasjumps(e))return false;let value;
    switch(e.k){case K.VFALSE:value=false;break;case K.VTRUE:value=true;break;case K.VNIL:value=null;break;case K.VKSTR:value=e.u.strval;break;case K.VCONST:value=this.const2val(e);break;case K.VKINT:case K.VKFLT:value=numericValue(e);break;default:return false;}
    if(out)out.value=value;return true;
  }
  previousinstruction(){return this.fs.pc>this.fs.lasttarget?this.fs.pc-1:-1;}
  nil(from,n){const last=from+n-1,pc=this.previousinstruction();if(pc>=0&&this.get(pc).op===O.LOADNIL){const prev=this.get(pc),end=prev.A+prev.B;if((prev.A<=from&&from<=end+1)||(from<=prev.A&&prev.A<=last+1)){const start=Math.min(from,prev.A);this.set(pc,'A',start);this.set(pc,'B',Math.max(last,end)-start);return;}}this.codeABC(O.LOADNIL,from,n-1,0);}
  getjump(pc){const offset=this.get(pc).sJ;return offset===NO_JUMP?NO_JUMP:pc+1+offset;}
  fixjump(pc,dest){const offset=dest-(pc+1);invariant(dest!==NO_JUMP);if(offset< -OFFSET_sJ||offset>MAXARG_sJ-OFFSET_sJ)this.error('control structure too long');invariant(this.get(pc).op===O.JMP);this.set(pc,'sJ',offset);}
  concat(list,l2){if(l2===NO_JUMP)return list;if(list===NO_JUMP)return l2;let end=list,next;while((next=this.getjump(end))!==NO_JUMP)end=next;this.fixjump(end,l2);return list;}
  jump(){return this.codesJ(O.JMP,NO_JUMP,0);}
  jumpto(target){this.patchlist(this.jump(),target);}
  ret(first,nret){this.codeABC(nret===0?O.RETURN0:nret===1?O.RETURN1:O.RETURN,first,nret+1,0);}
  condjump(op,a,b,c,k){this.codeABCk(op,a,b,c,k);return this.jump();}
  getlabel(){return this.fs.lasttarget=this.fs.pc;}
  getjumpcontrol(pc){return pc>=1&&testMode(this.get(pc-1).op)?pc-1:pc;}
  patchtestreg(node,reg){const pc=this.getjumpcontrol(node),i=this.get(pc);if(i.op!==O.TESTSET)return false;if(reg!==NO_REG&&reg!==i.B)this.set(pc,'A',reg);else this.p.code[pc]=luaInstruction(O.TEST,i.B,0,0,i.k);return true;}
  removevalues(list){for(;list!==NO_JUMP;list=this.getjump(list))this.patchtestreg(list,NO_REG);}
  patchlistaux(list,vtarget,reg,dtarget){while(list!==NO_JUMP){const next=this.getjump(list);this.fixjump(list,this.patchtestreg(list,reg)?vtarget:dtarget);list=next;}}
  patchlist(list,target){invariant(target<=this.fs.pc);this.patchlistaux(list,target,NO_REG,target);}
  patchtohere(list){this.patchlist(list,this.getlabel());}
  savelineinfo(line){
    const fs=this.fs,pc=fs.pc-1;let delta=line-fs.previousline;
    if(Math.abs(delta)>=128||fs.iwthabs++>=128){this.ls.session?.grow(this.p,'abslineinfo',fs.nabslineinfo+1);this.p.abslineinfo[fs.nabslineinfo++]={pc,line};delta=-128;fs.iwthabs=1;}
    this.ls.session?.grow(this.p,'lineinfo',pc+1);this.p.lineinfo[pc]=delta;this.p.lines[pc]=line;fs.previousline=line;
  }
  removelastlineinfo(){const fs=this.fs,pc=fs.pc-1;if(this.p.lineinfo[pc]!==-128){fs.previousline-=this.p.lineinfo[pc];fs.iwthabs--;}else{invariant(this.p.abslineinfo[fs.nabslineinfo-1].pc===pc);fs.nabslineinfo--;this.p.abslineinfo.length=fs.nabslineinfo;fs.iwthabs=129;}}
  removelastinstruction(){this.removelastlineinfo();this.fs.pc--;this.p.code.length=this.p.lineinfo.length=this.p.lines.length=this.fs.pc;}
  code(i){const pc=this.fs.pc;this.ls.session?.grow(this.p,'code',pc+1);this.p.code[this.fs.pc++]=i>>>0;this.savelineinfo(this.ls.lastline);return pc;}
  codeABCk(op,a,b,c,k){invariant(a<=255&&b<=255&&c<=255&&(k&~1)===0);return this.code(luaInstruction(op,a,b,c,k));}
  codeABC(op,a,b,c){return this.codeABCk(op,a,b,c,0);}
  codeABx(op,a,bx){invariant(a<=255&&bx<=MAXARG_Bx);return this.code(luaInstructionABx(op,a,bx));}
  codeAsBx(op,a,sbx){return this.codeABx(op,a,sbx+OFFSET_sBx);}
  codesJ(op,sj,k=0){return this.code((op|((sj+OFFSET_sJ)<<7)|(k<<15))>>>0);}
  codeextraarg(a){invariant(a<=33554431);return this.code((O.EXTRAARG|(a<<7))>>>0);}
  codek(reg,k){if(k<=MAXARG_Bx)return this.codeABx(O.LOADK,reg,k);const pc=this.codeABx(O.LOADKX,reg,0);this.codeextraarg(k);return pc;}
  checkstack(n){const size=this.fs.freereg+n;if(size>this.p.maxstacksize){if(size>=255)this.error('function or expression needs too many registers');this.p.maxstacksize=size;}}
  reserveregs(n){this.checkstack(n);this.fs.freereg+=n;}
  freereg(reg){if(reg>=this.variableStack()){this.fs.freereg--;invariant(reg===this.fs.freereg,'registers must be freed in stack order');}}
  freeregs(r1,r2){if(r1>r2){this.freereg(r1);this.freereg(r2);}else{this.freereg(r2);this.freereg(r1);}}
  freeexp(e){if(e.k===K.VNONRELOC)this.freereg(e.u.info);}
  freeexps(e1,e2){this.freeregs(e1.k===K.VNONRELOC?e1.u.info:-1,e2.k===K.VNONRELOC?e2.u.info:-1);}
  addk(key,value){
    const cache=this.ls.constantCache,keyed=nativeKey(key),index=cache.get(keyed);
    if(Number.isInteger(index)&&index<this.fs.nk&&sameConstant(this.p.constants[index],value))return index;
    const k=this.fs.nk;cache.set(keyed,k);this.ls.session?.constant(this.p,value,k);this.p.constants[k]=value;this.fs.nk++;return k;
  }
  stringK(s){return this.addk(s,s);}
  intK(n){return this.addk(n,n);}
  numberK(n){const i=toInteger(n),q=2**-52,key=i===null?n:i===0n?q:n+n*q;return this.addk(key,n);}
  boolF(){return this.addk(false,false);} boolT(){return this.addk(true,true);}
  nilK(){return this.addk(this.ls.constantCache,null);}
  int(reg,i){if(fitsBx(i))this.codeAsBx(O.LOADI,reg,Number(i));else this.codek(reg,this.intK(i));}
  float(reg,n){const i=toInteger(n);if(i!==null&&fitsBx(i))this.codeAsBx(O.LOADF,reg,Number(i));else this.codek(reg,this.numberK(n));}
  const2exp(value,e){if(typeof value==='bigint'){e.k=K.VKINT;e.u.ival=value;}else if(typeof value==='number'){e.k=K.VKFLT;e.u.nval=value;}else if(value===false)e.k=K.VFALSE;else if(value===true)e.k=K.VTRUE;else if(value===null)e.k=K.VNIL;else if(isLuaString(value)){e.k=K.VKSTR;e.u.strval=value;}else invariant(false);}
  setreturns(e,nresults){this.set(e.u.info,'C',nresults+1);if(e.k!==K.VCALL){invariant(e.k===K.VVARARG);this.set(e.u.info,'A',this.fs.freereg);this.reserveregs(1);}}
  setmultret(e){this.setreturns(e,-1);}
  str2K(e){invariant(e.k===K.VKSTR);e.u.info=this.stringK(e.u.strval);e.k=K.VK;}
  setoneret(e){if(e.k===K.VCALL){invariant(this.get(e.u.info).C===2);e.k=K.VNONRELOC;e.u.info=this.get(e.u.info).A;}else if(e.k===K.VVARARG){this.set(e.u.info,'C',2);e.k=K.VRELOC;}}
  dischargevars(e){
    switch(e.k){
      case K.VCONST:this.const2exp(this.const2val(e),e);break;
      case K.VLOCAL:e.u.info=e.u.var.ridx;e.k=K.VNONRELOC;break;
      case K.VUPVAL:e.u.info=this.codeABC(O.GETUPVAL,0,e.u.info,0);e.k=K.VRELOC;break;
      case K.VINDEXUP:e.u.info=this.codeABC(O.GETTABUP,0,e.u.ind.t,e.u.ind.idx);e.k=K.VRELOC;break;
      case K.VINDEXI:case K.VINDEXSTR:{const op=e.k===K.VINDEXI?O.GETI:O.GETFIELD;this.freereg(e.u.ind.t);e.u.info=this.codeABC(op,0,e.u.ind.t,e.u.ind.idx);e.k=K.VRELOC;break;}
      case K.VINDEXED:this.freeregs(e.u.ind.t,e.u.ind.idx);e.u.info=this.codeABC(O.GETTABLE,0,e.u.ind.t,e.u.ind.idx);e.k=K.VRELOC;break;
      case K.VVARARG:case K.VCALL:this.setoneret(e);break;
    }
  }
  discharge2reg(e,reg){
    this.dischargevars(e);
    switch(e.k){
      case K.VNIL:this.nil(reg,1);break;
      case K.VFALSE:this.codeABC(O.LOADFALSE,reg,0,0);break;
      case K.VTRUE:this.codeABC(O.LOADTRUE,reg,0,0);break;
      case K.VKSTR:this.str2K(e);this.codek(reg,e.u.info);break;
      case K.VK:this.codek(reg,e.u.info);break;
      case K.VKFLT:this.float(reg,e.u.nval);break;
      case K.VKINT:this.int(reg,e.u.ival);break;
      case K.VRELOC:this.set(e.u.info,'A',reg);break;
      case K.VNONRELOC:if(reg!==e.u.info)this.codeABC(O.MOVE,reg,e.u.info,0);break;
      default:invariant(e.k===K.VJMP);return;
    }e.u.info=reg;e.k=K.VNONRELOC;
  }
  discharge2anyreg(e){if(e.k!==K.VNONRELOC){this.reserveregs(1);this.discharge2reg(e,this.fs.freereg-1);}}
  code_loadbool(a,op){this.getlabel();return this.codeABC(op,a,0,0);}
  need_value(list){for(;list!==NO_JUMP;list=this.getjump(list))if(this.get(this.getjumpcontrol(list)).op!==O.TESTSET)return true;return false;}
  exp2reg(e,reg){
    this.discharge2reg(e,reg);if(e.k===K.VJMP)e.t=this.concat(e.t,e.u.info);
    if(hasjumps(e)){let pf=NO_JUMP,pt=NO_JUMP;if(this.need_value(e.t)||this.need_value(e.f)){const fj=e.k===K.VJMP?NO_JUMP:this.jump();pf=this.code_loadbool(reg,O.LFALSESKIP);pt=this.code_loadbool(reg,O.LOADTRUE);this.patchtohere(fj);}const final=this.getlabel();this.patchlistaux(e.f,final,reg,pf);this.patchlistaux(e.t,final,reg,pt);}
    e.f=e.t=NO_JUMP;e.u.info=reg;e.k=K.VNONRELOC;
  }
  exp2nextreg(e){this.dischargevars(e);this.freeexp(e);this.reserveregs(1);this.exp2reg(e,this.fs.freereg-1);}
  exp2anyreg(e){this.dischargevars(e);if(e.k===K.VNONRELOC){if(!hasjumps(e))return e.u.info;if(e.u.info>=this.variableStack()){this.exp2reg(e,e.u.info);return e.u.info;}}this.exp2nextreg(e);return e.u.info;}
  exp2anyregup(e){if(e.k!==K.VUPVAL||hasjumps(e))this.exp2anyreg(e);}
  exp2val(e){if(e.k===K.VJMP||hasjumps(e))this.exp2anyreg(e);else this.dischargevars(e);}
  exp2K(e){
    if(hasjumps(e))return false;let info;
    switch(e.k){case K.VTRUE:info=this.boolT();break;case K.VFALSE:info=this.boolF();break;case K.VNIL:info=this.nilK();break;case K.VKINT:info=this.intK(e.u.ival);break;case K.VKFLT:info=this.numberK(e.u.nval);break;case K.VKSTR:info=this.stringK(e.u.strval);break;case K.VK:info=e.u.info;break;default:return false;}
    if(info<=255){e.k=K.VK;e.u.info=info;return true;}return false;
  }
  exp2RK(e){if(this.exp2K(e))return 1;this.exp2anyreg(e);return 0;}
  codeABRK(op,a,b,e){const k=this.exp2RK(e);this.codeABCk(op,a,b,e.u.info,k);}
  storevar(variable,e){
    switch(variable.k){case K.VLOCAL:this.freeexp(e);this.exp2reg(e,variable.u.var.ridx);return;case K.VUPVAL:this.codeABC(O.SETUPVAL,this.exp2anyreg(e),variable.u.info,0);break;case K.VINDEXUP:this.codeABRK(O.SETTABUP,variable.u.ind.t,variable.u.ind.idx,e);break;case K.VINDEXI:this.codeABRK(O.SETI,variable.u.ind.t,variable.u.ind.idx,e);break;case K.VINDEXSTR:this.codeABRK(O.SETFIELD,variable.u.ind.t,variable.u.ind.idx,e);break;case K.VINDEXED:this.codeABRK(O.SETTABLE,variable.u.ind.t,variable.u.ind.idx,e);break;default:invariant(false);}this.freeexp(e);
  }
  self(e,key){this.exp2anyreg(e);const reg=e.u.info;this.freeexp(e);e.u.info=this.fs.freereg;e.k=K.VNONRELOC;this.reserveregs(2);this.codeABRK(O.SELF,e.u.info,reg,key);this.freeexp(key);}
  negatecondition(e){const pc=this.getjumpcontrol(e.u.info),i=this.get(pc);invariant(testMode(i.op)&&i.op!==O.TESTSET&&i.op!==O.TEST);this.set(pc,'k',i.k^1);}
  jumponcond(e,cond){if(e.k===K.VRELOC){const i=this.get(e.u.info);if(i.op===O.NOT){this.removelastinstruction();return this.condjump(O.TEST,i.B,0,0,Number(!cond));}}this.discharge2anyreg(e);this.freeexp(e);return this.condjump(O.TESTSET,NO_REG,e.u.info,0,cond);}
  goiftrue(e){this.dischargevars(e);let pc;switch(e.k){case K.VJMP:this.negatecondition(e);pc=e.u.info;break;case K.VK:case K.VKFLT:case K.VKINT:case K.VKSTR:case K.VTRUE:pc=NO_JUMP;break;default:pc=this.jumponcond(e,0);}e.f=this.concat(e.f,pc);this.patchtohere(e.t);e.t=NO_JUMP;}
  goiffalse(e){this.dischargevars(e);let pc;switch(e.k){case K.VJMP:pc=e.u.info;break;case K.VNIL:case K.VFALSE:pc=NO_JUMP;break;default:pc=this.jumponcond(e,1);}e.t=this.concat(e.t,pc);this.patchtohere(e.f);e.f=NO_JUMP;}
  codenot(e){switch(e.k){case K.VNIL:case K.VFALSE:e.k=K.VTRUE;break;case K.VK:case K.VKFLT:case K.VKINT:case K.VKSTR:case K.VTRUE:e.k=K.VFALSE;break;case K.VJMP:this.negatecondition(e);break;case K.VRELOC:case K.VNONRELOC:this.discharge2anyreg(e);this.freeexp(e);e.u.info=this.codeABC(O.NOT,0,e.u.info,0);e.k=K.VRELOC;break;default:invariant(false);}[e.f,e.t]=[e.t,e.f];this.removevalues(e.f);this.removevalues(e.t);}
  isKstr(e){return e.k===K.VK&&!hasjumps(e)&&e.u.info<=255&&isLuaString(this.p.constants[e.u.info])&&luaStringBytes(this.p.constants[e.u.info]).length<=40;}
  isKint(e){return e.k===K.VKINT&&!hasjumps(e);}
  isCint(e){return this.isKint(e)&&e.u.ival>=0n&&e.u.ival<=255n;}
  isSCint(e){return this.isKint(e)&&fitsC(e.u.ival);}
  // Native isfloat is an outparam: an integral float sets it even when the
  // later immediate-range test fails. Comparisons retain that actual state.
  isSCnumber(e,state={isfloat:0}){let i;if(e.k===K.VKINT)i=e.u.ival;else if(e.k===K.VKFLT&&(i=toInteger(e.u.nval))!==null)state.isfloat=1;else return null;return !hasjumps(e)&&fitsC(i)?{im:Number(i)+127,isfloat:state.isfloat}:null;}
  indexed(t,key){
    if(key.k===K.VKSTR)this.str2K(key);invariant(!hasjumps(t)&&[K.VLOCAL,K.VNONRELOC,K.VUPVAL].includes(t.k));if(t.k===K.VUPVAL&&!this.isKstr(key))this.exp2anyreg(t);
    if(t.k===K.VUPVAL){t.u.ind.t=t.u.info;t.u.ind.idx=key.u.info;t.k=K.VINDEXUP;}else{t.u.ind.t=t.k===K.VLOCAL?t.u.var.ridx:t.u.info;if(this.isKstr(key)){t.u.ind.idx=key.u.info;t.k=K.VINDEXSTR;}else if(this.isCint(key)){t.u.ind.idx=Number(key.u.ival);t.k=K.VINDEXI;}else{t.u.ind.idx=this.exp2anyreg(key);t.k=K.VINDEXED;}}
  }
  validop(op,v1,v2){if((op>=7&&op<=11)||op===13)return toInteger(v1)!==null&&toInteger(v2)!==null;if(op===5||op===6||op===3)return Number(v2)!==0;return true;}
  constfolding(op,e1,e2){
    if(!isNumeral(e1)||!isNumeral(e2)||!this.validop(op,numericValue(e1),numericValue(e2)))return false;
    const value=arithmetic(arithNames[op],numericValue(e1),op>=12?null:numericValue(e2));if(typeof value==='bigint'){e1.k=K.VKINT;e1.u.ival=value;}else{if(Number.isNaN(value)||value===0)return false;e1.k=K.VKFLT;e1.u.nval=value;}return true;
  }
  codeunexpval(op,e,line){const reg=this.exp2anyreg(e);this.freeexp(e);e.u.info=this.codeABC(op,0,reg,0);e.k=K.VRELOC;this.fixline(line);}
  finishbinexpval(e1,e2,op,v2,flip,line,mmop,event){const v1=this.exp2anyreg(e1),pc=this.codeABCk(op,0,v1,v2,0);this.freeexps(e1,e2);e1.u.info=pc;e1.k=K.VRELOC;this.fixline(line);this.codeABCk(mmop,v1,v2,event,flip);this.fixline(line);}
  codebinexpval(opr,e1,e2,line){const v2=this.exp2anyreg(e2);this.finishbinexpval(e1,e2,O.ADD+opr,v2,0,line,O.MMBIN,6+opr);}
  codebini(op,e1,e2,flip,line,event){this.finishbinexpval(e1,e2,op,Number(e2.u.ival)+127,flip,line,O.MMBINI,event);}
  codebinK(opr,e1,e2,flip,line){this.finishbinexpval(e1,e2,O.ADDK+opr,e2.u.info,flip,line,O.MMBINK,6+opr);}
  finishbinexpneg(e1,e2,op,line,event){if(!this.isKint(e2))return false;const i=e2.u.ival;if(!fitsC(i)||!fitsC(-i))return false;this.finishbinexpval(e1,e2,op,Number(-i)+127,0,line,O.MMBINI,event);this.set(this.fs.pc-1,'B',Number(i)+127);return true;}
  swapexps(e1,e2){const temp=copyExp(new Exp(),e1);copyExp(e1,e2);copyExp(e2,temp);}
  codebinNoK(opr,e1,e2,flip,line){if(flip)this.swapexps(e1,e2);this.codebinexpval(opr,e1,e2,line);}
  codearith(opr,e1,e2,flip,line){if(isNumeral(e2)&&this.exp2K(e2))this.codebinK(opr,e1,e2,flip,line);else this.codebinNoK(opr,e1,e2,flip,line);}
  codecommutative(op,e1,e2,line){let flip=0;if(isNumeral(e1)){this.swapexps(e1,e2);flip=1;}if(op===B.OPR_ADD&&this.isSCint(e2))this.codebini(O.ADDI,e1,e2,flip,line,6);else this.codearith(op,e1,e2,flip,line);}
  codebitwise(op,e1,e2,line){let flip=0;if(e1.k===K.VKINT){this.swapexps(e1,e2);flip=1;}if(e2.k===K.VKINT&&this.exp2K(e2))this.codebinK(op,e1,e2,flip,line);else this.codebinNoK(op,e1,e2,flip,line);}
  codeorder(opr,e1,e2){let r1,r2,op;const state={isfloat:0},second=this.isSCnumber(e2,state);if(second){r1=this.exp2anyreg(e1);r2=second.im;op=O.LTI+opr-B.OPR_LT;}else{const first=this.isSCnumber(e1,state);if(first){r1=this.exp2anyreg(e2);r2=first.im;op=O.GTI+opr-B.OPR_LT;}else{r1=this.exp2anyreg(e1);r2=this.exp2anyreg(e2);op=O.LT+opr-B.OPR_LT;}}this.freeexps(e1,e2);e1.u.info=this.condjump(op,r1,r2,state.isfloat,1);e1.k=K.VJMP;}
  codeeq(opr,e1,e2){if(e1.k!==K.VNONRELOC)this.swapexps(e1,e2);const r1=this.exp2anyreg(e1),state={isfloat:0},im=this.isSCnumber(e2,state);let op,r2;if(im){op=O.EQI;r2=im.im;}else if(this.exp2RK(e2)){op=O.EQK;r2=e2.u.info;}else{op=O.EQ;r2=this.exp2anyreg(e2);}this.freeexps(e1,e2);e1.u.info=this.condjump(op,r1,r2,state.isfloat,Number(opr===B.OPR_EQ));e1.k=K.VJMP;}
  prefix(op,e,line){this.dischargevars(e);switch(op){case U.OPR_MINUS:case U.OPR_BNOT:if(this.constfolding(op+12,e,Object.assign(new Exp(K.VKINT),{u:{ival:0n}})))break;this.codeunexpval(O.UNM+op,e,line);break;case U.OPR_LEN:this.codeunexpval(O.UNM+op,e,line);break;case U.OPR_NOT:this.codenot(e);break;default:invariant(false);}}
  infix(op,e){this.dischargevars(e);switch(op){case B.OPR_AND:this.goiftrue(e);break;case B.OPR_OR:this.goiffalse(e);break;case B.OPR_CONCAT:this.exp2nextreg(e);break;case B.OPR_EQ:case B.OPR_NE:if(!isNumeral(e))this.exp2RK(e);break;case B.OPR_LT:case B.OPR_LE:case B.OPR_GT:case B.OPR_GE:if(!this.isSCnumber(e))this.exp2anyreg(e);break;default:invariant(op<=B.OPR_SHR);if(!isNumeral(e))this.exp2anyreg(e);}}
  codeconcat(e1,e2,line){const pc=this.previousinstruction();if(pc>=0&&this.get(pc).op===O.CONCAT){const inst=this.get(pc);invariant(e1.u.info+1===inst.A);this.freeexp(e2);this.set(pc,'A',e1.u.info);this.set(pc,'B',inst.B+1);}else{this.codeABC(O.CONCAT,e1.u.info,2,0);this.freeexp(e2);this.fixline(line);}}
  posfix(op,e1,e2,line){
    this.dischargevars(e2);if(op<=B.OPR_SHR&&this.constfolding(op,e1,e2))return;
    switch(op){
      case B.OPR_AND:invariant(e1.t===NO_JUMP);e2.f=this.concat(e2.f,e1.f);copyExp(e1,e2);break;
      case B.OPR_OR:invariant(e1.f===NO_JUMP);e2.t=this.concat(e2.t,e1.t);copyExp(e1,e2);break;
      case B.OPR_CONCAT:this.exp2nextreg(e2);this.codeconcat(e1,e2,line);break;
      case B.OPR_ADD:case B.OPR_MUL:this.codecommutative(op,e1,e2,line);break;
      case B.OPR_SUB:if(this.finishbinexpneg(e1,e2,O.ADDI,line,7))break;this.codearith(op,e1,e2,0,line);break;
      case B.OPR_DIV:case B.OPR_IDIV:case B.OPR_MOD:case B.OPR_POW:this.codearith(op,e1,e2,0,line);break;
      case B.OPR_BAND:case B.OPR_BOR:case B.OPR_BXOR:this.codebitwise(op,e1,e2,line);break;
      case B.OPR_SHL:if(this.isSCint(e1)){this.swapexps(e1,e2);this.codebini(O.SHLI,e1,e2,1,line,16);}else if(!this.finishbinexpneg(e1,e2,O.SHRI,line,16))this.codebinexpval(op,e1,e2,line);break;
      case B.OPR_SHR:if(this.isSCint(e2))this.codebini(O.SHRI,e1,e2,0,line,17);else this.codebinexpval(op,e1,e2,line);break;
      case B.OPR_EQ:case B.OPR_NE:this.codeeq(op,e1,e2);break;
      case B.OPR_GT:case B.OPR_GE:this.swapexps(e1,e2);op=op-B.OPR_GT+B.OPR_LT;this.codeorder(op,e1,e2);break;
      case B.OPR_LT:case B.OPR_LE:this.codeorder(op,e1,e2);break;
      default:invariant(false);
    }
  }
  fixline(line){this.removelastlineinfo();this.savelineinfo(line);}
  settablesize(pc,ra,asize,hsize){const rb=hsize?Math.ceil(Math.log2(hsize))+1:0,extra=Math.floor(asize/256);this.p.code[pc]=luaInstruction(O.NEWTABLE,ra,rb,asize%256,Number(extra>0));this.p.code[pc+1]=(O.EXTRAARG|(extra<<7))>>>0;}
  setlist(base,nelems,tostore){invariant(tostore!==0&&tostore<=50);if(tostore===-1)tostore=0;if(nelems<=255)this.codeABC(O.SETLIST,base,tostore,nelems);else{this.codeABCk(O.SETLIST,base,tostore,nelems%256,1);this.codeextraarg(Math.floor(nelems/256));}this.fs.freereg=base+1;}
  finaltarget(i){for(let count=0;count<100;count++){const inst=this.get(i);if(inst.op!==O.JMP)break;i+=inst.sJ+1;}return i;}
  finish(){for(let i=0;i<this.fs.pc;i++){let op=this.get(i).op;if(op===O.RETURN0||op===O.RETURN1){if(!(this.fs.needclose||this.p.is_vararg))continue;this.set(i,'op',O.RETURN);op=O.RETURN;}if(op===O.RETURN||op===O.TAILCALL){if(this.fs.needclose)this.set(i,'k',1);if(this.p.is_vararg)this.set(i,'C',this.p.numparams+1);}else if(op===O.JMP)this.fixjump(i,this.finaltarget(i));}}
}
