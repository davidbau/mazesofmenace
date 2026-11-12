/* Lua's short strings are interned (<=LUAI_MAXSHORTLEN bytes); long strings
 * are separate collectable values even when their byte contents compare equal.
 * Runtime byte access is explicit. JavaScript never supplies Unicode encoding.
 */
import { currentHeap } from './lgc-context.js';
export const LUA_MAXSHORTLEN = 40;
export class LuaString {
  constructor(bytes, heap = currentHeap()) {
    if (typeof bytes !== 'string') throw new TypeError('LuaString requires byte string');
    this.luaString = true; this.bytes = bytes; this.length = bytes.length; this.heap = heap;
    heap?.register(this, 'string');
  }
  toString() { return this.bytes; }
  [Symbol.toPrimitive]() { return this.bytes; }
}
export const isLuaString = value => typeof value === 'string' || value instanceof LuaString;
export function luaStringBytes(value) {
  if (typeof value === 'string') return value;
  if (value instanceof LuaString) return value.bytes;
  throw new TypeError('Lua string required');
}
