/* Lua5.4 lutf8lib.c migration; lobject.js notice. Byte-based strict/lax UTF8. */
import {prepareLibrary} from './llib.js';
import {LuaBuffer} from './buffer.js';
import {luaAuxError,luaArgError,luaCheckInteger,luaCheckString,luaWithAuxTop} from './aux-error.js';
import { isLuaString, toInteger, utf8Bytes, truth } from './lobject.js';
const continuation = c => (c & 0xc0) === 0x80;
function decode(source, at, strict) {
  let first = source.charCodeAt(at), value = 0, count = 0;
  if (first < 0x80) return { value: first, end: at + 1 };
  while (first & 0x40) {
    const byte = source.charCodeAt(at + ++count);
    if (!continuation(byte) || count > 5) return null;
    value = value * 64 + (byte & 63); first <<= 1;
  }
  value += (first & 127) * 2 ** (count * 5);
  if (count === 0 || value > 0x7fffffff || value < [Infinity, 0x80, 0x800, 0x10000, 0x200000, 0x4000000][count]) return null;
  if (strict && (value > 0x10ffff || value >= 0xd800 && value <= 0xdfff)) return null;
  return { value, end: at + count + 1 };
}
export function openUtf8(vm,{publish=true}={}) {
  const lib=prepareLibrary(vm,['offset','codepoint','char','len','codes','charpattern']);try{
  const string=(value,arg=1)=>luaCheckString(vm,value,arg);
  const integer = (value,arg) => luaCheckInteger(vm,value,arg);
  const optional=(value,fallback,arg)=>value==null?fallback:integer(value,arg);
  const relative = (position, length) => position >= 0n ? position : -position>BigInt(length)?0n:BigInt(length)+position+1n;
  // lutf8lib.c pushutfchar calls lua_pushfstring("%U") for each argument,
  // creating/checking the short managed string before luaL_addvalue copies it.
  // The common single-character case never initializes a LuaL_Buffer.
  const char = (...values) => char.luaInvoke(values);
  char.luaInvoke = values => {
    const pushChar = (value, arg, checkpoint, use) => {
      const n = integer(value,arg);
      if (n < 0n || n > 0x7fffffffn) luaArgError(vm,arg,'value out of range');
      const encoded = vm.heap.adopt(utf8Bytes(Number(n))), release = vm.heap.addRoots(() => encoded);
      try { checkpoint(); return use(encoded); } finally { release(); }
    };
    if (values.length === 1) {
      const top = vm.heap.frameMetadata(vm.currentThread)?.checkTop ?? vm.currentThread.apiTop ?? 1;
      return pushChar(values[0],1, () => vm.heap.withStackTop(top+1, () => vm.heap.checkpoint()), encoded => [encoded]);
    }
    const buffer = new LuaBuffer(vm);
    return luaWithAuxTop(vm,1,()=>{try {
      for (let i=0;i<values.length;i++) pushChar(values[i],i+1, () => buffer.checkpoint(2), encoded => buffer.addValue(encoded));
      return [buffer.finish()];
    } catch (error) { buffer.close(error); throw error; }});
  };
  lib.rawset('char', char);
  lib.rawset('len', (subject, first = 1n, last = -1n, lax = false) => {
    subject = string(subject); first = relative(optional(first,1n,2), subject.length); last = relative(optional(last,-1n,3), subject.length);
    if (first < 1n || first > BigInt(subject.length) + 1n) luaArgError(vm,2,'initial position out of bounds');
    if(last>BigInt(subject.length))luaArgError(vm,3,'final position out of bounds');
    first=Number(first);last=Number(last);
    let count = 0n;
    for (let at = first - 1; at < last;) { vm.tick(); const decoded = decode(subject, at, !truth(lax)); if (!decoded) return [null, BigInt(at + 1)]; at = decoded.end; count++; }
    return [count];
  });
  const codepoint = (subject, first = 1n, last = null, lax = false) => {
    subject = string(subject); first = relative(optional(first,1n,2), subject.length); last = relative(optional(last,first,3), subject.length);
    if (first < 1n) luaArgError(vm,2,'out of bounds');
    if(last>BigInt(subject.length))luaArgError(vm,3,'out of bounds');
    if(first>last)return [];
    if(last-first>=2147483647n)luaAuxError(vm,'string slice too long');
    const top=vm.heap.frameMetadata(vm.currentThread),actualTop=top?.argumentTop??top?.checkTop??vm.heap.getStackTop(vm.currentThread),count=Number(last-first+1n);
    if(!vm.heap.checkStack(vm.currentThread,actualTop,count,{safe:false,gc:false}))luaAuxError(vm,'stack overflow (%s)','string slice too long');
    if(top)top.top=Math.max(top.top,actualTop+count);
    first=Number(first);last=Number(last);
    const result = [];
    for (let at = first - 1; at < last;) { vm.tick(); const decoded = decode(subject, at, !truth(lax)); if (!decoded) luaWithAuxTop(vm,result.length,()=>luaAuxError(vm,'invalid UTF-8 code')); result.push(BigInt(decoded.value)); at = decoded.end; }
    return result;
  };codepoint.luaResultStackManaged=true;lib.rawset('codepoint',codepoint);
  lib.rawset('offset', (subject, count, first = null) => {
    subject = string(subject); count = integer(count,2); first = relative(optional(first,count>=0n?1n:BigInt(subject.length+1),3), subject.length) - 1n;
    if (first < 0n || first > BigInt(subject.length)) luaArgError(vm,3,'position out of bounds');
    first=Number(first);
    if (count === 0n) { while (first > 0 && continuation(subject.charCodeAt(first))) first--; }
    else {
      if (continuation(subject.charCodeAt(first))) luaAuxError(vm,'initial position is a continuation byte');
      if (count < 0n) while (count < 0n && first > 0) { do { first--; } while (first > 0 && continuation(subject.charCodeAt(first))); count++; }
      else { count--; while (count > 0n && first < subject.length) { do { first++; } while (continuation(subject.charCodeAt(first))); count--; } }
    }
    return [count === 0n ? BigInt(first + 1) : null];
  });
  lib.rawset('codes', (subject, lax = false) => {
    const input=subject; subject = string(subject);const original=isLuaString(input)?input:vm.debug.thread(vm.currentThread).frames.at(-1)?.args?.[0]??vm.heap.adopt(subject);
    if (continuation(subject.charCodeAt(0))) luaArgError(vm,1,'invalid UTF-8 code');
    const next = (source, control) => { source=string(source);
      let at = Number(BigInt.asUintN(64, toInteger(control)??0n));
      if (at < source.length) while (continuation(source.charCodeAt(at))) at++;
      if (at >= source.length) return [];
      const decoded = decode(source, at, !truth(lax));
      if (!decoded || continuation(source.charCodeAt(decoded.end))) luaAuxError(vm,'invalid UTF-8 code');
      return [BigInt(at + 1), BigInt(decoded.value)];
    };
    return [next, original, 0n];
  });
  lib.rawset('charpattern', '[\x00-\x7f\xc2-\xfd][\x80-\xbf]*');
  const table=lib.finish(['charpattern']);const pattern=vm.heap.adopt(lib.rawget('charpattern')),unrootPattern=vm.heap.addRoots(()=>pattern);try{vm.heap.checkpoint();table.rawset('charpattern',pattern);}finally{unrootPattern();}if(publish)vm.setGlobal('utf8',table);return table;}finally{lib.release();}
}
