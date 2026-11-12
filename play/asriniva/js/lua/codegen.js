/* Lua5.4.8 binary prototype codec. Source: lundump.c/ldump.c/lopcodes.h;
 * Lua license: lua/lobject.js. This codec does not compile source text.
 * Instruction=32bit, lua_Integer=64bit, lua_Number=IEEE754binary64.
 * No host compiler, Wasm, I/O or network is used by production code.
 */
import { LuaParserErrors } from './parser-errors.js';
import { LuaError, byteString, luaValues, LuaString, isLuaString, luaStringBytes } from './lobject.js';
export const LUA_OPCODES = Object.freeze('MOVE LOADI LOADF LOADK LOADKX LOADFALSE LFALSESKIP LOADTRUE LOADNIL GETUPVAL SETUPVAL GETTABUP GETTABLE GETI GETFIELD SETTABUP SETTABLE SETI SETFIELD NEWTABLE SELF ADDI ADDK SUBK MULK MODK POWK DIVK IDIVK BANDK BORK BXORK SHRI SHLI ADD SUB MUL MOD POW DIV IDIV BAND BOR BXOR SHL SHR MMBIN MMBINI MMBINK UNM BNOT NOT LEN CONCAT CLOSE TBC JMP EQ LT LE EQK EQI LTI LEI GTI GEI TEST TESTSET CALL TAILCALL RETURN RETURN0 RETURN1 FORLOOP FORPREP TFORPREP TFORCALL TFORLOOP SETLIST CLOSURE VARARG VARARGPREP EXTRAARG'.split(' '));
export const LUA_OP = Object.freeze(Object.fromEntries(LUA_OPCODES.map((name,index)=>[name,index])));
export function decodeLuaInstruction(word) { return { op: word & 127, A: word >>> 7 & 255, k: word >>> 15 & 1, B: word >>> 16 & 255, C: word >>> 24, Bx: word >>> 15, sBx: (word >>> 15) - 65535, Ax: word >>> 7, sJ: (word >>> 7) - 16777215, sB: (word >>> 16 & 255) - 127, sC: (word >>> 24) - 127 }; }
export function luaInstruction(op,A=0,B=0,C=0,k=0) { return (op | A<<7 | k<<15 | B<<16 | C<<24)>>>0; }
export function luaInstructionABx(op,A,Bx) { return (op | A<<7 | Bx<<15)>>>0; }
export function luaInstructionAsBx(op,A,sBx) { return luaInstructionABx(op,A,sBx+65535); }
const header=[27,76,117,97,84,0,25,147,13,10,26,10,4,8,8];
export function loadLuaChunk(input, name='binary string', { maxItems = Infinity, maxDepth = Infinity, observer = null, workspace = null, vm = null }={}) {
 workspace??={};observer?.temporary(workspace,['buffer','actvar','gotos','labels']);const diagnostics=vm?new LuaParserErrors(vm,name,{extra:0}):null;
 try{
 const stream=typeof input?.readBytes==='function'?input:null,data=stream?null:input instanceof Uint8Array?input:Uint8Array.from(input,c=>c.charCodeAt(0));let offset=0,little=true;
 const layout={proto:128,lclosure:32,upvalue:40,value:16,pointer:8,updesc:16,locvar:16,absline:8,...observer?.layout};
 const binaryName=name[0]==='@'||name[0]==='='?name.slice(1):name[0]==='\x1b'?'binary string':name;const bad=why=>{const value=diagnostics?diagnostics.format('%s: bad binary format (%s)',binaryName,why):`${binaryName}: bad binary format (${why})`,error=new LuaError(value,{adopt:!diagnostics});error.status=3;throw error;};
 const byte=()=>{if(stream){const value=stream.readByte();if(value===null)bad('truncated chunk');offset++;return value;}if(offset>=data.length)bad('truncated chunk');return data[offset++];};
 const block=n=>{if(!Number.isSafeInteger(n)||n<0||!stream&&n>data.length-offset)bad('truncated chunk');const b=stream?stream.readBytes(n):data.subarray(offset,offset+n);if(b===null)bad('truncated chunk');offset+=n;return b;};
 const size=(limit=2147483647n)=>{let x=0n,b;do{b=byte();if(x>=(limit>>7n))bad('integer overflow');x=x*128n+BigInt(b&127);}while(!(b&128));if(x>maxItems)bad('resource limit');return Number(x);};
 const string=owner=>{
  const encoded=size(18446744073709551615n);if(!encoded)return null;const length=encoded-1;
  let value;
  if(length>40){
   // lundump allocates/anchors long strings BEFORE reading their bytes. A
   // truncated read must leave that real partial allocation owned by the GC.
   value=observer?observer.beginString(length):new LuaString('',null);
   if(!observer)value.length=length;
   owner.allocationStrings?.push(value);
   const bytes=byteString(block(length));if(observer)observer.finishString(value,bytes);else value.bytes=bytes;
  }else{const bytes=byteString(block(length));value=observer?observer.internString(bytes,'binary-short'):bytes;}
  return value;
 };
 const metadataString=owner=>{const value=string(owner);return value===null?null:luaStringBytes(value);};
 const number=()=>{const b=block(8);return new DataView(b.buffer,b.byteOffset,8).getFloat64(0,little);};
 const integer=()=>{const b=block(8);return new DataView(b.buffer,b.byteOffset,8).getBigInt64(0,little);};
 const vector=(owner,key,width,read,initialize=null)=>{
  const count=size(),values=luaValues();owner[key]=values;
  observer?.resize(owner,key,0,count*width);
  for(let n=0;n<count;n++)values.push(initialize?initialize():null);
  for(let n=0;n<count;n++)values[n]=read(n,values[n]);
  return values;
 };
 if(byte()!==27)bad('not a binary chunk');
 const literal=(expected,why)=>{const bytes=block(expected.length);if(bytes.some((value,n)=>value!==expected[n]))bad(why);};
 literal(header.slice(1,4),'not a binary chunk');if(byte()!==84)bad('version mismatch');if(byte()!==0)bad('format mismatch');literal(header.slice(6,12),'corrupted chunk');
 for(const[type,width]of [['Instruction',4],['lua_Integer',8],['lua_Number',8]])if(byte()!==width)bad(diagnostics?diagnostics.format('%s size mismatch',type):`${type} size mismatch`);
 const endian=block(8),view=new DataView(endian.buffer,endian.byteOffset,8);
 if(view.getBigInt64(0,true)!==0x5678n){if(view.getBigInt64(0,false)!==0x5678n)bad('integer format mismatch');little=false;}
 if(number()!==370.5)bad('float format mismatch');const upvalueCount=byte();
 const closure={luaClosure:true,luaBytecode:true,prototype:null,upvalues:[]};
 observer?.object('closure',closure,layout.lclosure+upvalueCount*layout.pointer);if(stream)stream.stackExtra=1;if(diagnostics)diagnostics.stack.base++;
 const release=observer?.root(closure);
 const proto=(parent,depth,attach)=>{
  if(depth>maxDepth)bad('prototype nesting limit');
  // Every pointer/vector is valid before an allocator or reader may fail.
  const p={source:null,linedefined:0,lastlinedefined:0,numparams:0,is_vararg:0,maxstacksize:2,code:[],constants:luaValues(),upvalues:[],protos:[],lineinfo:[],abslineinfo:[],locvars:[]};
  if(observer)p.allocationStrings=[];
  observer?.object('proto',p,layout.proto);attach(p);
  const source=string(p);p.source=source===null?parent?.source??null:luaStringBytes(source);if(observer){p.sourceAllocation=source??parent?.sourceAllocation??null;if(source===null&&p.sourceAllocation instanceof LuaString)p.allocationStrings.push(p.sourceAllocation);}p.linedefined=size();p.lastlinedefined=size();p.numparams=byte();p.is_vararg=byte();p.maxstacksize=byte();
  vector(p,'code',4,()=>{const b=block(4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,little);});
  vector(p,'constants',layout.value,()=>{switch(byte()){case 0:return null;case 1:return false;case 17:return true;case 3:return integer();case 19:return number();case 4:case 20:{const text=string(p);if(text===null)bad('bad format for constant string');return text;}default:bad('invalid constant tag');}});
  vector(p,'upvalues',layout.updesc,(_n,up)=>{up.instack=byte();up.idx=byte();up.kind=byte();return up;},()=>({name:null,instack:0,idx:0,kind:0}));
  vector(p,'protos',layout.pointer,(index)=>proto(p,depth+1,child=>{p.protos[index]=child;}));
  vector(p,'lineinfo',1,()=>{const n=byte();return n<128?n:n-256;});
  vector(p,'abslineinfo',layout.absline,()=>({pc:size(),line:size()}));
  vector(p,'locvars',layout.locvar,(_n,local)=>{local.varname=metadataString(p);local.startpc=size();local.endpc=size();return local;},()=>({varname:null,startpc:0,endpc:0}));
  const names=size();if(names&&names!==p.upvalues.length)bad('upvalue name count');if(names)for(const up of p.upvalues)up.name=metadataString(p);
  if(p.maxstacksize<2||p.numparams>p.maxstacksize)bad('invalid prototype register count');
  if(p.code.some(word=>(word&127)>=LUA_OPCODES.length))bad('invalid opcode');
  return p;
 };
 try{
  const prototype=proto(null,0,p=>{closure.prototype=p;});if(upvalueCount!==prototype.upvalues.length)bad('upvalue count mismatch');
  // ldo.c f_parser initializes closed upvalues only after the whole chunk has
  // been read; lua_load subsequently puts the globals in the first cell.
  for(let n=0;n<upvalueCount;n++){const cell={open:false,value:null};observer?.object('upvalue',cell,layout.upvalue);closure.upvalues.push(cell);}
  return {prototype,closure,upvalueCount,littleEndian:little,bytesRead:offset};
 }finally{release?.();}
 }catch(error){if(vm&&error instanceof LuaError){error=vm.closeError(error);vm.heap.shrinkThread(vm.currentThread);}throw error;}finally{observer?.release(workspace);diagnostics?.close();}
}
export function dumpLuaChunk(value,{strip=false,littleEndian=true,onWrite=null}={}) {
 const p=value.prototype??value,out=[];let writerStatus=0;
 const block=input=>{const bytes=input instanceof Uint8Array?input:Uint8Array.from(input);if(!bytes.length||writerStatus)return;if(onWrite)writerStatus=Number(onWrite(bytes)??0);for(const x of bytes)out.push(x);};
 const byte=x=>block(Uint8Array.of(x&255));
 const size=n=>{if(!Number.isSafeInteger(n)||n<0)throw new RangeError('invalid Lua chunk size');const bytes=[(n%128)|128];while((n=Math.floor(n/128)))bytes.unshift(n%128);block(bytes);};
 const string=s=>{if(isLuaString(s))s=luaStringBytes(s);if(s===null||s===undefined){size(0);return;}size(s.length+1);const bytes=new Uint8Array(s.length);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>255)throw new LuaError('Lua chunk strings must contain bytes');bytes[i]=c;}block(bytes);};
 const rawBytes=(n,kind)=>{const b=new Uint8Array(kind==='word'?4:8),v=new DataView(b.buffer);if(kind==='word')v.setUint32(0,n,littleEndian);else if(kind==='int')v.setBigInt64(0,n,littleEndian);else v.setFloat64(0,n,littleEndian);return b;};
 const raw=(n,kind)=>block(rawBytes(n,kind));
 const vec=(values,f)=>{size(values.length);for(const x of values)f(x);};
 // Preserve ldump.c writer calls, including complete instruction/line vectors.
 // Buffer growth and errors occur at these calls in string.dump's real writer.
 block(header.slice(0,4));byte(header[4]);byte(header[5]);block(header.slice(6,12));byte(4);byte(8);byte(8);raw(0x5678n,'int');raw(370.5,'float');byte(p.upvalues.length);
 const proto=(p,parent)=>{
  string(strip||p.source===parent?null:p.source);size(p.linedefined);size(p.lastlinedefined);byte(p.numparams);byte(p.is_vararg);byte(p.maxstacksize);
  size(p.code.length);const code=new Uint8Array(p.code.length*4),words=new DataView(code.buffer);for(let n=0;n<p.code.length;n++)words.setUint32(n*4,p.code[n],littleEndian);block(code);
  vec(p.constants,v=>{if(v===null)byte(0);else if(typeof v==='boolean')byte(v?17:1);else if(typeof v==='bigint'){byte(3);raw(v,'int');}else if(typeof v==='number'){byte(19);raw(v,'float');}else if(isLuaString(v)){byte(v.length<=40?4:20);string(v);}else throw new LuaError('invalid Lua chunk constant');});
  vec(p.upvalues,u=>{byte(u.instack);byte(u.idx);byte(u.kind);});vec(p.protos,c=>proto(c,p.source));
  const lines=strip?[]:p.lineinfo;size(lines.length);block(Uint8Array.from(lines));vec(strip?[]:p.abslineinfo,a=>{size(a.pc);size(a.line);});vec(strip?[]:p.locvars,l=>{string(l.varname);size(l.startpc);size(l.endpc);});
  vec(strip?[]:p.upvalues,u=>string(u.name));
 };proto(p,null);const result=Uint8Array.from(out);if(onWrite)Object.defineProperty(result,'writerStatus',{value:writerStatus});return result;
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
