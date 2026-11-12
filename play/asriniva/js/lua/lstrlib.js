/* Bounded Lua5.4 byte-string primitives, reference lstrlib.c; lobject.js notice.
 * Patterns live in lpattern.js; packing/formatting use separate byte services.
 * Binary dump is connected by the bytecode layer, not synthesized here.
 */
import {LuaBuffer} from './buffer.js';
import {luaArgError,luaTypeError,luaCheckInteger} from './aux-error.js';
import {prepareLibrary} from './llib.js';
import { LuaTable, LuaError, isLuaString, luaStringBytes, toInteger, luaType, numberToString, byteString, truth, toNumber, arithmetic, luaValues } from './lobject.js';
import { openPatterns } from './lpattern.js';
import { openStringPacking } from './string-pack.js';
import { openStringFormatting } from './string-format.js';
export function openString(vm,{publish=true}={}) {
  const lib=prepareLibrary(vm,['byte','char','dump','find','format','gmatch','gsub','len','lower','match','rep','reverse','sub','upper','pack','packsize','unpack']);try{
  const string=(value,index=0)=>vm.checkString(value,index);
  const integer=(value,arg=2)=>luaCheckInteger(vm,value,arg);
  const pushString=bytes=>{const value=vm.heap.adopt(bytes),release=vm.heap.addRoots(()=>value),meta=vm.heap.frameMetadata(vm.currentThread),top=meta?.argumentTop??meta?.checkTop??vm.heap.getStackTop(vm.currentThread);try{vm.heap.withStackTop(top+1,()=>vm.heap.checkpoint());return[value];}finally{release();}};
  const relative = (index, length) => index < 0 ? length + index + 1 : index;
  lib.rawset('len', value => [BigInt(string(value).length)]);
  lib.rawset('sub', (value, first, last = -1n) => {
    last ??= -1n;
    value = string(value); first = Math.max(1, relative(Number(integer(first)), value.length)); last = Math.min(value.length, relative(Number(integer(last,3)), value.length));
    return pushString(first > last ? '' : value.slice(first - 1, last));
  });
  const byte=(value, first = 1n, last = first) => {
    first ??= 1n; last ??= first;
    value = string(value); first = Math.max(1, relative(Number(integer(first)), value.length)); last = Math.min(value.length, relative(Number(integer(last,3)), value.length));
    const count=Math.max(0,last-first+1),meta=vm.heap.frameMetadata(vm.currentThread),top=meta?.argumentTop??meta?.checkTop??vm.heap.getStackTop(vm.currentThread);if(!vm.heap.checkStack(vm.currentThread,top,count,{safe:false,gc:false}))vm.auxError('stack overflow (string slice too long)');if(meta)meta.top=Math.max(meta.top,top+count);
    const result = []; for (let i = first; i <= last; i++) result.push(BigInt(value.charCodeAt(i - 1))); return result;
  };byte.luaResultStackManaged=true;lib.rawset('byte',byte);
  const buffered=(size,produce)=>{const buffer=new LuaBuffer(vm);try{buffer.prepare(size);produce(buffer);return[buffer.finish()];}catch(error){buffer.close(error);throw error;}};
  const char=(...values)=>char.luaInvoke(values);char.luaInvoke=values=>buffered(values.length,buffer=>{
    const pieces=[];for(let at=0;at<values.length;at+=8192)pieces.push(String.fromCharCode(...values.slice(at,at+8192).map((value,index)=>{const arg=at+index+1,n=integer(value,arg);if(n<0n||n>255n)luaArgError(vm,arg,'value out of range');return Number(n);})));buffer.add(pieces.join(''));
  });lib.rawset('char',char);
  lib.rawset('reverse',value=>{value=string(value);return buffered(value.length,buffer=>buffer.add(Array.from(value).reverse().join('')));});
  lib.rawset('lower',value=>{value=string(value);return buffered(value.length,buffer=>buffer.add(value.replace(/[A-Z]/g,c=>c.toLowerCase())));});
  lib.rawset('upper',value=>{value=string(value);return buffered(value.length,buffer=>buffer.add(value.replace(/[a-z]/g,c=>c.toUpperCase())));});
  lib.rawset('rep',(value,count,separator='')=>{
    separator??='';value=string(value);count=integer(count);separator=string(separator,2);
    if(count<=0n)return pushString('');
    const size=count*BigInt(value.length)+(count-1n)*BigInt(separator.length);
    if(BigInt(value.length+separator.length)*count>0x7fffffffn)vm.auxError('resulting string too large');
    return buffered(Number(size),buffer=>{for(let i=0n;i<count;i++){buffer.add(value);if(i+1n<count)buffer.add(separator);}});
  });
  if (typeof vm.dumpBinary === 'function') lib.rawset('dump',(fn,strip=false)=>{
    if(luaType(fn)!=='function')luaTypeError(vm,1,'function',fn);
    const stripping=truth(strip),args=vm.debug.thread(vm.currentThread).frames.at(-1)?.args;if(args)vm.setHostStackTop(1);
    if(!fn?.luaBytecode)vm.auxError('unable to dump given function');
    let buffer=null;
    try{
      vm.dumpBinary(fn,{strip:stripping,onWrite:bytes=>{
        if(!buffer){buffer=new LuaBuffer(vm);const metadata=vm.heap.frameMetadata(vm.currentThread);buffer.stackBase=(metadata?.func??0)+2;}
        buffer.add(byteString(bytes));
      }});
      return[buffer.finish()];
    }catch(error){buffer?.close(error);throw error;}
  });
  openStringFormatting(vm, lib, { string, integer });
  openPatterns(vm, lib, { string, integer });
  openStringPacking(lib, { string, integer, vm });
  const table=lib.finish(),mt=prepareLibrary(vm,['__add','__sub','__mul','__mod','__pow','__div','__idiv','__unm','__index']);try{
    for(const [name,op]of [['__add','+'],['__sub','-'],['__mul','*'],['__mod','%'],['__pow','^'],['__div','/'],['__idiv','//'],['__unm','unm']])mt.rawset(name,(a,b)=>{const x=toNumber(a),y=toNumber(b);if(x!==null&&y!==null)return luaValues(arithmetic(op,x,y));const mm=isLuaString(b)?null:vm.metamethod(b,name);if(mm!==null)return vm.call(mm,[a,b]);throw new LuaError(`attempt to ${name.slice(2)} a '${luaType(a)}' with a '${luaType(b)}'`);});
    const stringMeta=mt.finish(['__index']);vm.heap.adopt('');vm.heap.checkpoint();vm.stringMetatable=stringMeta;stringMeta.rawset('__index',table);
  }finally{mt.release();}
  if(publish)vm.setGlobal('string',table);return table;}finally{lib.release();}
}
