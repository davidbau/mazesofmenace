/* Lua5.4 lutf8lib.c migration; lobject.js notice. Byte-based strict/lax UTF8. */
import { LuaTable, LuaError, isLuaString, luaStringBytes, luaType, toInteger, numberToString, utf8Bytes, truth } from './lobject.js';
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
export function openUtf8(vm) {
  const lib = new LuaTable();
  const string = value => { if (isLuaString(value)) return luaStringBytes(value); if (luaType(value) === 'number') return numberToString(value); throw new LuaError('string expected'); };
  const integer = value => { const n = toInteger(value); if (n === null) throw new LuaError('integer expected'); return n; };
  const relative = (position, length) => { position = integer(position); return position >= 0n ? Number(position) : Math.max(0, length + Number(position) + 1); };
  lib.rawset('char', (...values) => [values.map(value => { const n = integer(value); if (n < 0n || n > 0x7fffffffn) throw new LuaError('value out of range'); return utf8Bytes(Number(n)); }).join('')]);
  lib.rawset('len', (subject, first = 1n, last = -1n, lax = false) => {
    first ??= 1n; last ??= -1n;
    subject = string(subject); first = relative(first, subject.length); last = relative(last, subject.length);
    if (first < 1 || first > subject.length + 1 || last > subject.length) throw new LuaError('position out of bounds');
    let count = 0n;
    for (let at = first - 1; at < last;) { vm.tick(); const decoded = decode(subject, at, !truth(lax)); if (!decoded) return [null, BigInt(at + 1)]; at = decoded.end; count++; }
    return [count];
  });
  lib.rawset('codepoint', (subject, first = 1n, last = first, lax = false) => {
    first ??= 1n; last ??= first;
    subject = string(subject); first = relative(first, subject.length); last = relative(last, subject.length);
    if (first < 1 || last > subject.length) throw new LuaError('out of bounds');
    const result = [];
    for (let at = first - 1; at < last;) { vm.tick(); const decoded = decode(subject, at, !truth(lax)); if (!decoded) throw new LuaError('invalid UTF-8 code'); result.push(BigInt(decoded.value)); at = decoded.end; }
    return result;
  });
  lib.rawset('offset', (subject, count, first = null) => {
    subject = string(subject); count = integer(count); first = relative(first ?? (count >= 0n ? 1n : BigInt(subject.length + 1)), subject.length) - 1;
    if (first < 0 || first > subject.length) throw new LuaError('position out of bounds');
    if (count === 0n) { while (first > 0 && continuation(subject.charCodeAt(first))) first--; }
    else {
      if (continuation(subject.charCodeAt(first))) throw new LuaError('initial position is a continuation byte');
      if (count < 0n) while (count < 0n && first > 0) { do { first--; } while (first > 0 && continuation(subject.charCodeAt(first))); count++; }
      else { count--; while (count > 0n && first < subject.length) { do { first++; } while (continuation(subject.charCodeAt(first))); count--; } }
    }
    return [count === 0n ? BigInt(first + 1) : null];
  });
  lib.rawset('codes', (subject, lax = false) => {
    const original=subject; subject = string(subject); if (continuation(subject.charCodeAt(0))) throw new LuaError('invalid UTF-8 code');
    const next = (source, control) => { source=string(source);
      let at = Number(BigInt.asUintN(64, integer(control)));
      if (at < source.length) while (continuation(source.charCodeAt(at))) at++;
      if (at >= source.length) return [];
      const decoded = decode(source, at, !truth(lax));
      if (!decoded || continuation(source.charCodeAt(decoded.end))) throw new LuaError('invalid UTF-8 code');
      return [BigInt(at + 1), BigInt(decoded.value)];
    };
    return [next, original, 0n];
  });
  lib.rawset('charpattern', '[\x00-\x7f\xc2-\xfd][\x80-\xbf]*');
  vm.setGlobal('utf8', lib); return lib;
}
