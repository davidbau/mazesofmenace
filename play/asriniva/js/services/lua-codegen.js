/* Lua5.4.8 binary prototype codec. Source: lundump.c/ldump.c/lopcodes.h;
 * Lua license: lua/lobject.js. This codec does not compile source text.
 * Instruction=32bit, lua_Integer=64bit, lua_Number=IEEE754binary64.
 * No host compiler, Wasm, I/O or network is used by production code.
 */
import { LuaError, byteString, LuaString, isLuaString, luaStringBytes } from './lua/lobject.js';
export const LUA_OPCODES = Object.freeze('MOVE LOADI LOADF LOADK LOADKX LOADFALSE LFALSESKIP LOADTRUE LOADNIL GETUPVAL SETUPVAL GETTABUP GETTABLE GETI GETFIELD SETTABUP SETTABLE SETI SETFIELD NEWTABLE SELF ADDI ADDK SUBK MULK MODK POWK DIVK IDIVK BANDK BORK BXORK SHRI SHLI ADD SUB MUL MOD POW DIV IDIV BAND BOR BXOR SHL SHR MMBIN MMBINI MMBINK UNM BNOT NOT LEN CONCAT CLOSE TBC JMP EQ LT LE EQK EQI LTI LEI GTI GEI TEST TESTSET CALL TAILCALL RETURN RETURN0 RETURN1 FORLOOP FORPREP TFORPREP TFORCALL TFORLOOP SETLIST CLOSURE VARARG VARARGPREP EXTRAARG'.split(' '));
export const LUA_OP = Object.freeze(Object.fromEntries(LUA_OPCODES.map((name,index)=>[name,index])));
export function decodeLuaInstruction(word) { return { op: word & 127, A: word >>> 7 & 255, k: word >>> 15 & 1, B: word >>> 16 & 255, C: word >>> 24, Bx: word >>> 15, sBx: (word >>> 15) - 65535, Ax: word >>> 7, sJ: (word >>> 7) - 16777215, sB: (word >>> 16 & 255) - 127, sC: (word >>> 24) - 127 }; }
export function luaInstruction(op,A=0,B=0,C=0,k=0) { return (op | A<<7 | k<<15 | B<<16 | C<<24)>>>0; }
export function luaInstructionABx(op,A,Bx) { return (op | A<<7 | Bx<<15)>>>0; }
export function luaInstructionAsBx(op,A,sBx) { return luaInstructionABx(op,A,sBx+65535); }
const header=[27,76,117,97,84,0,25,147,13,10,26,10,4,8,8];
export function loadLuaChunk(input, name='binary string', { maxItems = 10000000, maxDepth = 200 }={}) {
 const data=input instanceof Uint8Array?input:Uint8Array.from(input,c=>c.charCodeAt(0));let offset=0,little=true;
 const bad=why=>{throw new LuaError(`${name[0]==='@'||name[0]==='='?name.slice(1):name}: bad binary format (${why})`);};
 const byte=()=>{if(offset>=data.length)bad('truncated chunk');return data[offset++];};
 const block=n=>{if(!Number.isSafeInteger(n)||n<0||n>data.length-offset)bad('truncated chunk');const b=data.subarray(offset,offset+n);offset+=n;return b;};
 const size=()=>{let x=0,b;do{b=byte();if(x>=0x1fffffffffffff/128)bad('integer overflow');x=x*128+(b&127);}while(!(b&128));if(x>maxItems)bad('resource limit');return x;};
 const string=()=>{const n=size();return n?byteString(block(n-1)):null;};
 const number=()=>{const b=block(8);return new DataView(b.buffer,b.byteOffset,8).getFloat64(0,little);};
 const integer=()=>{const b=block(8);return new DataView(b.buffer,b.byteOffset,8).getBigInt64(0,little);};
 const vector=f=>Array.from({length:size()},f);
 for(const expected of header)if(byte()!==expected)bad('header mismatch');
 const endian=block(8),view=new DataView(endian.buffer,endian.byteOffset,8);
 if(view.getBigInt64(0,true)!==0x5678n){if(view.getBigInt64(0,false)!==0x5678n)bad('integer format mismatch');little=false;}
 if(number()!==370.5)bad('float format mismatch');const upvalueCount=byte();
 const proto=(parent,depth)=>{
  if(depth>maxDepth)bad('prototype nesting limit');
  const p={source:string()??parent,linedefined:size(),lastlinedefined:size(),numparams:byte(),is_vararg:byte(),maxstacksize:byte()};
  p.code=vector(()=>{const b=block(4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,little);});
  p.constants=vector(()=>{switch(byte()){case 0:return null;case 1:return false;case 17:return true;case 3:return integer();case 19:return number();case 4:case 20:{const text=string();if(text===null)bad('bad format for constant string');return text.length>40?new LuaString(text,null):text;}default:bad('invalid constant tag');}});
  p.upvalues=vector(()=>({instack:byte(),idx:byte(),kind:byte()}));p.protos=vector(()=>proto(p.source,depth+1));
  p.lineinfo=vector(()=>{const n=byte();return n<128?n:n-256;});p.abslineinfo=vector(()=>({pc:size(),line:size()}));
  p.locvars=vector(()=>({varname:string(),startpc:size(),endpc:size()}));const names=size();if(names&&names!==p.upvalues.length)bad('upvalue name count');if(names)for(const up of p.upvalues)up.name=string();
  if(p.maxstacksize<2||p.numparams>p.maxstacksize)bad('invalid prototype register count');
  if(p.code.some(word=>(word&127)>=LUA_OPCODES.length))bad('invalid opcode');
  return p;
 };
 const prototype=proto(null,0);if(upvalueCount!==prototype.upvalues.length)bad('upvalue count mismatch');return {prototype,upvalueCount,littleEndian:little,bytesRead:offset};
}
export function dumpLuaChunk(value,{strip=false,littleEndian=true}={}) {
 const p=value.prototype??value,out=[];const byte=x=>out.push(x&255),block=b=>{for(const x of b)byte(x);};
 const size=n=>{if(!Number.isSafeInteger(n)||n<0)throw new RangeError('invalid Lua chunk size');const bytes=[(n%128)|128];while((n=Math.floor(n/128)))bytes.unshift(n%128);block(bytes);};
 const string=s=>{if(isLuaString(s))s=luaStringBytes(s);if(s===null||s===undefined){size(0);return;}size(s.length+1);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>255)throw new LuaError('Lua chunk strings must contain bytes');byte(c);}};
 const raw=(n,kind)=>{const b=new Uint8Array(kind==='word'?4:8),v=new DataView(b.buffer);if(kind==='word')v.setUint32(0,n,littleEndian);else if(kind==='int')v.setBigInt64(0,n,littleEndian);else v.setFloat64(0,n,littleEndian);block(b);};
 const vec=(values,f)=>{size(values.length);for(const x of values)f(x);};
 block(header);raw(0x5678n,'int');raw(370.5,'float');byte(p.upvalues.length);
 const proto=(p,parent)=>{
  string(strip||p.source===parent?null:p.source);size(p.linedefined);size(p.lastlinedefined);byte(p.numparams);byte(p.is_vararg);byte(p.maxstacksize);
  vec(p.code,w=>raw(w,'word'));vec(p.constants,v=>{if(v===null)byte(0);else if(typeof v==='boolean')byte(v?17:1);else if(typeof v==='bigint'){byte(3);raw(v,'int');}else if(typeof v==='number'){byte(19);raw(v,'float');}else if(isLuaString(v)){byte(v.length<=40?4:20);string(v);}else throw new LuaError('invalid Lua chunk constant');});
  vec(p.upvalues,u=>{byte(u.instack);byte(u.idx);byte(u.kind);});vec(p.protos,c=>proto(c,p.source));
  vec(strip?[]:p.lineinfo,byte);vec(strip?[]:p.abslineinfo,a=>{size(a.pc);size(a.line);});vec(strip?[]:p.locvars,l=>{string(l.varname);size(l.startpc);size(l.endpc);});
  vec(strip?[]:p.upvalues,u=>string(u.name));
 };proto(p,null);return Uint8Array.from(out);
}

/* ldebug.c symbolic register naming, used for actual caller stack context. */
const writesA=new Set('MOVE LOADI LOADF LOADK LOADKX LOADFALSE LFALSESKIP LOADTRUE GETUPVAL GETTABUP GETTABLE GETI GETFIELD NEWTABLE SELF ADDI ADDK SUBK MULK MODK POWK DIVK IDIVK BANDK BORK BXORK SHRI SHLI ADD SUB MUL MOD POW DIV IDIV BAND BOR BXOR SHL SHR UNM BNOT NOT LEN CONCAT TESTSET CLOSURE VARARG'.split(' ').map(n=>LUA_OP[n]));
export function luaRegisterName(p,lastpc,register,depth=0){
 if(depth>255)return{name:null,namewhat:''};
 let ordinal=register+1;for(const local of p.locvars??[])if(local.startpc<=lastpc&&lastpc<local.endpc)if(--ordinal===0)return{name:local.varname,namewhat:'local'};
 let set=-1,target=0;if([LUA_OP.MMBIN,LUA_OP.MMBINI,LUA_OP.MMBINK].includes(p.code[lastpc]&127))lastpc--;
 for(let pc=0;pc<lastpc;pc++){
  const i=decodeLuaInstruction(p.code[pc]);let changed=false;
  if(i.op===LUA_OP.LOADNIL)changed=i.A<=register&&register<=i.A+i.B;
  else if(i.op===LUA_OP.TFORCALL)changed=register>=i.A+2;
  else if(i.op===LUA_OP.CALL||i.op===LUA_OP.TAILCALL)changed=register>=i.A;
  else if(i.op===LUA_OP.JMP){const dest=pc+1+i.sJ;if(dest<=lastpc&&dest>target)target=dest;}
  else changed=writesA.has(i.op)&&register===i.A;
  if(changed)set=pc<target?-1:pc;
 }
 if(set<0)return{name:null,namewhat:''};const i=decodeLuaInstruction(p.code[set]);
 const key=index=>isLuaString(p.constants[index])?luaStringBytes(p.constants[index]):'?';
 if(i.op===LUA_OP.MOVE&&i.B<i.A)return luaRegisterName(p,set,i.B,depth+1);
 if(i.op===LUA_OP.GETUPVAL)return{name:p.upvalues[i.B]?.name??'?',namewhat:'upvalue'};
 if(i.op===LUA_OP.LOADK||i.op===LUA_OP.LOADKX)return{name:key(i.op===LUA_OP.LOADK?i.Bx:p.code[set+1]>>>7),namewhat:'constant'};
 if(i.op===LUA_OP.GETI)return{name:'integer index',namewhat:'field'};
 if([LUA_OP.GETTABUP,LUA_OP.GETTABLE,LUA_OP.GETFIELD].includes(i.op)){
  const table=i.op===LUA_OP.GETTABUP?{name:p.upvalues[i.B]?.name,namewhat:'upvalue'}:luaRegisterName(p,set,i.B,depth+1);
  const field=i.op===LUA_OP.GETTABLE?luaRegisterName(p,set,i.C,depth+1):{name:key(i.C),namewhat:'constant'};
  return{name:field.namewhat==='constant'?field.name:'?',namewhat:['local','upvalue'].includes(table.namewhat)&&table.name==='_ENV'?'global':'field'};
 }
 if(i.op===LUA_OP.SELF){const field=i.k?{name:key(i.C),namewhat:'constant'}:luaRegisterName(p,set,i.C,depth+1);return{name:field.namewhat==='constant'?field.name:'?',namewhat:'method'};}
 return{name:null,namewhat:''};
}
export function luaCallName(p,pc){
 const i=decodeLuaInstruction(p.code[pc]);
 if(i.op===LUA_OP.CALL||i.op===LUA_OP.TAILCALL)return luaRegisterName(p,pc,i.A);
 if(i.op===LUA_OP.TFORCALL)return{name:'for iterator',namewhat:'for iterator'};
 const mm={SELF:'index',GETTABUP:'index',GETTABLE:'index',GETI:'index',GETFIELD:'index',SETTABUP:'newindex',SETTABLE:'newindex',SETI:'newindex',SETFIELD:'newindex',UNM:'unm',BNOT:'bnot',LEN:'len',CONCAT:'concat',EQ:'eq',LT:'lt',LTI:'lt',GTI:'lt',LE:'le',LEI:'le',GEI:'le',CLOSE:'close',RETURN:'close'}[LUA_OPCODES[i.op]];
 const arithmetic=['add','sub','mul','mod','pow','div','idiv','band','bor','bxor','shl','shr'];
 const name=mm??([LUA_OP.MMBIN,LUA_OP.MMBINI,LUA_OP.MMBINK].includes(i.op)?arithmetic[i.C-6]:null);
 return{name:name??null,namewhat:name?'metamethod':''};
}
