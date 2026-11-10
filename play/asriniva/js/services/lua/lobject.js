import { LuaTable } from './ltable.js';
import { formatFloatMagnitude,floatNegative } from '../c-float-format.js';
import { currentHeap } from './lgc-context.js';
import { LuaString,isLuaString,luaStringBytes } from './lstring.js';
export { LuaString,isLuaString,luaStringBytes } from './lstring.js';
export { LuaTable } from './ltable.js';
/*
 * Lua 5.4.8 runtime migration: value/numeric/table foundation.
 * Reference: Lua 5.4.8 lobject.c, lvm.c, ltable.c and llimits.h.
 * Copyright (C) 1994-2025 Lua.org, PUC-Rio.
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * JS representation differs from C: signed integers are BigInt, floats are
 * Number, strings contain byte-valued code units, nil is null. Table hash seeds/pointer identities and GC order are NOT yet C-equivalent.
 */
// Seeding a tagged-element array prevents V8 double-array NaN canonicalization.
// Do not use a rest parameter: its all-number vector may already erase NaN bits.
export function luaValues(){const values=[null];values.length=0;for(let i=0;i<arguments.length;i++)values.push(arguments[i]);return values;}
export function appendLuaValues(target, values) { for(const value of values)target.push(value); return target; }
export const MININTEGER = -(1n << 63n);
export const MAXINTEGER = (1n << 63n) - 1n;
export const luaInteger = n => BigInt.asIntN(64, BigInt(n));
export const truth = value => value !== null && value !== false;
export class LuaError extends Error {
  constructor(value) { super(isLuaString(value) ? luaStringBytes(value) : 'Lua error'); this.value = currentHeap()?.adopt(value) ?? value; this.name = 'LuaError'; }
}
export function luaType(value) {
  if (value === null || value === undefined) return 'nil';
  if (typeof value === 'bigint' || typeof value === 'number') return 'number';
  if (isLuaString(value)) return 'string';
  if (value instanceof LuaTable) return 'table';
  if (value instanceof LuaUserdata || value instanceof LuaLightUserdata) return 'userdata';
  if (value instanceof LuaThread) return 'thread';
  if (typeof value === 'function' || value?.luaClosure) return 'function';
  return typeof value;
}
const numberBits = new DataView(new ArrayBuffer(8));
export function canonicalNaN() {numberBits.setBigUint64(0,0x7ff8000000000000n);return numberBits.getFloat64(0);}
export function negateFloat(value) {numberBits.setFloat64(0,value);numberBits.setBigUint64(0,numberBits.getBigUint64(0)^0x8000000000000000n);return numberBits.getFloat64(0);}
export function numberToString(value) {
  if(typeof value==='bigint')return String(value);
  let text=(floatNegative(value)?'-':'')+formatFloatMagnitude(value,'g',14,false);
  if(/^[-0-9]+$/.test(text))text+='.0';
  return text;
}
export function numericString(text) {
  if (!isLuaString(text)) return null; text = luaStringBytes(text); if (text.includes('\0')) return null;
  text = text.replace(/^[ \t\n\r\v\f]+|[ \t\n\r\v\f]+$/g, '');
  if (!text) return null;
  let sign = 1;
  if (text[0] === '+' || text[0] === '-') { if (text[0] === '-') sign = -1; text = text.slice(1); }
  if (/^0[xX][\da-fA-F]+$/.test(text)) return luaInteger(BigInt(text) * BigInt(sign));
  if (/^\d+$/.test(text)) {
    const n = BigInt(text) * BigInt(sign);
    return n >= MININTEGER && n <= MAXINTEGER ? n : Number(n);
  }
  const hex = /^0[xX]([\da-fA-F]*)(?:\.([\da-fA-F]*))?(?:[pP]([+-]?\d+))?$/.exec(text);
  if (hex && (hex[1] || hex[2])) {
    const fraction = hex[2] || '';
    return sign * Number(BigInt('0x' + (hex[1] || '0') + fraction)) * 2 ** (Number(hex[3] || 0) - fraction.length * 4);
  }
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
  return sign * Number(text);
}
export function toNumber(value) {
  return typeof value === 'number' || typeof value === 'bigint' ? value : numericString(value);
}
export function toInteger(value) {
  value = toNumber(value);
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value) && value >= Number(MININTEGER) && value < 2 ** 63)
    return BigInt(value);
  return null;
}
export function rawEqual(a, b) {
  if(a instanceof LuaLightUserdata||b instanceof LuaLightUserdata)return a instanceof LuaLightUserdata&&b instanceof LuaLightUserdata&&a.value===b.value;
  if (isLuaString(a) && isLuaString(b)) return luaStringBytes(a) === luaStringBytes(b);
  if ((typeof a === 'bigint' && typeof b === 'number') || (typeof b === 'bigint' && typeof a === 'number')) return a == b;
  return a === b;
}
export function arithmetic(op, left, right = null) {
  if (['&', '|', '~', '<<', '>>', 'bnot'].includes(op)) {
    if (!['number', 'bigint'].includes(typeof left) || right !== null && !['number', 'bigint'].includes(typeof right)) throw new LuaError('attempt to perform bitwise operation on a non-number value');
    const a = toInteger(left), b = right === null ? null : toInteger(right);
    if (a === null || (right !== null && b === null)) throw new LuaError('number has no integer representation');
    const shift = (value, amount) => amount < 0 ? shiftRight(value, -amount) : amount >= 64n ? 0n : luaInteger(value << amount);
    const shiftRight = (value, amount) => amount < 0 ? shift(value, -amount) : amount >= 64n ? 0n : luaInteger(BigInt.asUintN(64, value) >> amount);
    if (op === '&') return luaInteger(a & b);
    if (op === '|') return luaInteger(a | b);
    if (op === '~') return luaInteger(a ^ b);
    if (op === 'bnot') return luaInteger(~a);
    return op === '<<' ? shift(a, b) : shiftRight(a, b);
  }
  const a = toNumber(left), b = right === null ? null : toNumber(right);
  if (a === null || (right !== null && b === null)) throw new LuaError('attempt to perform arithmetic on a non-number value');
  if (op === 'unm') return typeof a === 'bigint' ? luaInteger(-a) : negateFloat(a);
  if (typeof a === 'bigint' && typeof b === 'bigint' && !['/', '^'].includes(op)) {
    if (op === '+') return luaInteger(a + b);
    if (op === '-') return luaInteger(a - b);
    if (op === '*') return luaInteger(a * b);
    if (b === 0n && (op === '%' || op === '//')) throw new LuaError(op === '%' ? "attempt to perform 'n%0'" : 'attempt to divide by zero');
    let q = a / b;
    if (a % b !== 0n && (a < 0n) !== (b < 0n)) q--;
    if (op === '//') return luaInteger(q);
    if (op === '%') return luaInteger(a - q * b);
  }
  const x = Number(a), y = Number(b);
  if (op === '+') return x + y;
  if (op === '-') return x - y;
  if (op === '*') return x * y;
  if (op === '/') return x / y;
  if (op === '^') return x ** y;
  if (op === '//') return Math.floor(x / y);
  if (op === '%') { const result = x % y; return result * y < 0 ? result + y : result; }
  throw new LuaError(`unsupported arithmetic ${op}`);
}

export class LuaLightUserdata {constructor(value){this.luaLightUserdata=true;this.value=typeof value==='number'||typeof value==='bigint'?BigInt.asUintN(64,BigInt(value)):value;}}
export class LuaUserdata {
  constructor(value, metatable = null, uservalues = [], size = value?.byteLength ?? value?.size ?? 0, onFree = null) {
    this.value = value; this._metatable = null; this.uservalues = uservalues; this.size = size; this.onFree = onFree;
    this.heap = currentHeap(); this.heap?.register(this, 'userdata'); this.metatable = metatable;
  }
  get metatable() { return this._metatable; }
  set metatable(value) { this._metatable = value; this.heap?.adopt(value);this.heap?.barrierForward(this,value); this.heap?.checkFinalizer(this); }
}
export class LuaThread {
  constructor(fn = null, main = false) {
    this.fn = fn; this.main = main; this.status = main ? 'running' : 'suspended';
    this.generator = null; this.callDepth = 0; this.nativeCalls = 0; this.resumeSerial = 0; this.errorHandlers = []; this.nonYieldableDepth = 0;
    this.gcRoots = new Set(); this.errorRoots = null; this.error = null;
    this.heap = currentHeap(); this.heap?.register(this, 'thread');
  }
}
export function byteString(bytes) { let value = ''; for (const byte of bytes) value += String.fromCharCode(byte); return value; }
export function utf8Bytes(codepoint) {
  if (codepoint < 0 || codepoint > 0x7fffffff) throw new LuaError('UTF-8 value too large');
  if (codepoint < 0x80) return String.fromCharCode(codepoint);
  let count = 1; for (let bits = codepoint >> 6; bits >= (1 << (6 - count)); bits >>= 6) count++;
  const result = new Array(count + 1);
  for (let i = count; i > 0; i--) { result[i] = 0x80 | (codepoint & 63); codepoint >>>= 6; }
  result[0] = ((0xff << (7 - count)) & 255) | codepoint;
  return String.fromCharCode(...result);
}
