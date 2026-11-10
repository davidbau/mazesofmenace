/* Bounded Lua5.4 byte-string primitives, reference lstrlib.c; lobject.js notice.
 * Patterns live in lpattern.js; packing/formatting use separate byte services.
 * Binary dump is connected by the bytecode layer, not synthesized here.
 */
import { LuaTable, LuaError, isLuaString, luaStringBytes, toInteger, luaType, numberToString, byteString, truth } from './lobject.js';
import { openPatterns } from './lpattern.js';
import { openStringPacking } from '../lua-string-pack.js';
import { openStringFormatting } from '../lua-string-format.js';
export function openString(vm) {
  const lib = new LuaTable();
  const string = value => {
    if (isLuaString(value)) return luaStringBytes(value);
    if (luaType(value) === 'number') return numberToString(value);
    throw new LuaError('string expected');
  };
  const integer = value => { const n = toInteger(value); if (n === null) throw new LuaError('integer expected'); return n; };
  const relative = (index, length) => index < 0 ? length + index + 1 : index;
  lib.rawset('len', value => [BigInt(string(value).length)]);
  lib.rawset('sub', (value, first, last = -1n) => {
    last ??= -1n;
    value = string(value); first = Math.max(1, relative(Number(integer(first)), value.length)); last = Math.min(value.length, relative(Number(integer(last)), value.length));
    return [first > last ? '' : value.slice(first - 1, last)];
  });
  lib.rawset('byte', (value, first = 1n, last = first) => {
    first ??= 1n; last ??= first;
    value = string(value); first = Math.max(1, relative(Number(integer(first)), value.length)); last = Math.min(value.length, relative(Number(integer(last)), value.length));
    const result = []; for (let i = first; i <= last; i++) result.push(BigInt(value.charCodeAt(i - 1))); return result;
  });
  const char=(...values)=>char.luaInvoke(values);char.luaInvoke=values=>{
    const pieces=[];for(let at=0;at<values.length;at+=8192)pieces.push(String.fromCharCode(...values.slice(at,at+8192).map(value=>{const n=integer(value);if(n<0n||n>255n)throw new LuaError('value out of range');return Number(n);})));return [pieces.join('')];
  };lib.rawset('char',char);
  lib.rawset('reverse', value => [Array.from(string(value)).reverse().join('')]);
  lib.rawset('lower', value => [string(value).replace(/[A-Z]/g, c => c.toLowerCase())]);
  lib.rawset('upper', value => [string(value).replace(/[a-z]/g, c => c.toUpperCase())]);
  lib.rawset('rep', (value, count, separator = '') => {
    separator ??= '';
    value = string(value); separator = string(separator); count = integer(count);
    if (count <= 0n) return [''];
    if (count * BigInt(value.length + separator.length) > 10000000n) throw new LuaError('resulting string too large');
    return [Array(Number(count)).fill(value).join(separator)];
  });
  if (typeof vm.dumpBinary === 'function') lib.rawset('dump',(fn,strip=false)=>[byteString(vm.dumpBinary(fn,{strip:truth(strip)}))]);
  openStringFormatting(vm, lib, { string, integer });
  openPatterns(vm, lib, { string, integer });
  openStringPacking(lib, { string, integer });
  vm.stringMetatable = new LuaTable([['__index', lib]]);
  vm.setGlobal('string', lib); return lib;
}
