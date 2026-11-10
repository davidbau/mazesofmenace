/* Lua5.4.8 ltable.c array/hash/iteration/length migration; lobject.js notice.
 * Brent chained scatter nodes, rehash sizing, deleted-key iteration and border
 * hints follow the reference algorithms. Strings use Lua's byte hash with an
 * explicit seed (default zero). Native address-derived seeds/pointer hashes,
 * allocator/GC barriers and maximum allocation failures remain unintegrated.
 * Logical object-hash IDs are module-scoped: other VMs can affect object-key
 * iteration layout. Only the tested integer-table ordering is claimed exact.
 */
import { LuaError, toInteger, rawEqual, isLuaString, luaStringBytes } from './lobject.js';
import { currentHeap } from './lgc-context.js';
const MAXASIZE = 2 ** 31;
const MAXINT = (1n << 63n) - 1n;
const power2 = value => value > 0 && Number.isInteger(Math.log2(value));
const roundedSize = size => size === 0 ? 0 : 2 ** Math.ceil(Math.log2(size));
const objectHashes = new WeakMap(); let nextObjectHash = 1;
function normalize(key) {
  if (key === null || key === undefined) throw new LuaError('table index is nil');
  if (typeof key === 'number') { if (Number.isNaN(key)) throw new LuaError('table index is NaN'); return toInteger(key) ?? key; }
  return key;
}
function arrayIndex(key) { return typeof key === 'bigint' && key > 0n && key <= BigInt(MAXASIZE) ? Number(key) : 0; }
// Preserve the first stored Lua string object while indexing equal byte
// content by value, as Lua's long-string hash equality requires.
class ContentMap {
  constructor() { this.map=new Map();this.lightKeys=new Map(); }
  canonical(key) {if(key?.luaLightUserdata){if(!this.lightKeys.has(key.value))this.lightKeys.set(key.value,{});return this.lightKeys.get(key.value);} return isLuaString(key) ? luaStringBytes(key) : key; }
  get size() { return this.map.size; }
  get(key) { return this.map.get(this.canonical(key))?.value; }
  has(key) { return this.map.has(this.canonical(key)); }
  set(key,value) { const id=this.canonical(key), old=this.map.get(id); this.map.set(id,{key:old?.key??key,value}); return this; }
  delete(key) { return this.map.delete(this.canonical(key)); }
  clear() { this.map.clear(); }
  *keys() { for(const item of this.map.values())yield item.key; }
  *values() { for(const item of this.map.values())yield item.value; }
  *entries() { for(const item of this.map.values())yield [item.key,item.value]; }
  [Symbol.iterator]() { return this.entries(); }
}
export class LuaTable {
  constructor(entries = [], { arraySize = 0, hashSize = 0, seed = 0 } = {}) {
    this.values = new ContentMap(); this._metatable = null; this.seed = seed >>> 0;
    this.arraySize = arraySize; this.alimit = arraySize; this.realLimit = true;
    this.nodes = []; this.lastfree = 0; this.setnodes(hashSize);
    this.heap = currentHeap(); this.heap?.register(this, 'table');
    for (const [key, value] of entries) this.rawset(key, value);
  }
  get metatable() { return this._metatable; }
  set metatable(value) { this._metatable = value; this.heap?.adopt(value);this.heap?.barrier(this,value); this.heap?.checkFinalizer(this); }
  setnodes(size) {
    const count = roundedSize(size);
    if (count > 2 ** 30 || !Number.isInteger(count) || count < 0) throw new LuaError('table overflow');
    this.heap?.resizeTable(this, this.arraySize, count);
    this.nodes = Array.from({ length: count }, () => ({ key: null, value: null, next: null })); this.lastfree = count;
  }
  hash(key) {
    const size = this.nodes.length; if (!size) return 0;
    const mod = (size - 1) | 1;
    if (typeof key === 'bigint') return Number(BigInt.asUintN(64, key) % BigInt(mod));
    if (typeof key === 'boolean') return Number(key) & (size - 1);
    if (isLuaString(key)) { key = luaStringBytes(key);
      let hash = (this.seed ^ key.length) >>> 0;
      for (let i = key.length - 1; i >= 0; i--) hash = (hash ^ ((hash << 5) + (hash >>> 2) + key.charCodeAt(i))) >>> 0;
      return hash & (size - 1);
    }
    if (typeof key === 'number') {
      if (!Number.isFinite(key) || key === 0) return 0;
      let exponent = Math.floor(Math.log2(Math.abs(key))) + 1;
      if (Math.abs(key) / 2 ** exponent >= 1) exponent++;
      const fraction = key / 2 ** (exponent - 1) / 2;
      const hash = (Math.trunc(fraction * 2147483648) + exponent) >>> 0;
      return hash % mod;
    }
    if(key?.luaLightUserdata){key=key.value;if(typeof key==='bigint')return Number(key%BigInt(mod));}
    // Stable logical identity hashes are not C address hashes.
    if (!objectHashes.has(key)) objectHashes.set(key, nextObjectHash++);
    return objectHashes.get(key) % mod;
  }
  nodeIndex(key) {
    if (!this.nodes.length) return -1;
    let at = this.hash(key);
    while (true) { const node = this.nodes[at]; if (rawEqual(node.key, key)) return at; if (node.next === null) return -1; at = node.next; }
  }
  touch(index) { if (!this.realLimit && index > this.alimit && index <= this.arraySize) this.alimit = index; }
  rawget(key) {
    if (key === null || key === undefined || Number.isNaN(key)) return null;
    key = normalize(key); const index = arrayIndex(key);
    if (index && index <= this.arraySize) { this.touch(index); return this.values.get(key) ?? null; }
    const at = this.nodeIndex(key); return at < 0 ? null : this.nodes[at].value;
  }
  store(key, value) { if (value === null || value === undefined) this.values.delete(key); else this.values.set(key, value); }
  rawset(key, value) {
    key = normalize(key); value ??= null; const index = arrayIndex(key);
    const root={table:this,key,value};this.heap?.transient.add(root);try{
    key=root.key=this.heap?.adopt(key)??key;value=root.value=this.heap?.adopt(value)??value;this.heap?.barrier(this,key);this.heap?.barrier(this,value);
    if (index && index <= this.arraySize) { this.touch(index); this.store(key, value); return this; }
    const existing = this.nodeIndex(key);
    if (existing >= 0) { this.nodes[existing].value = value; this.store(key, value); return this; }
    if (value === null) return this;
    this.newkey(key, value); return this;
    }finally{this.heap?.transient.delete(root);}
  }
  newkey(key, value) {
    let at = this.hash(key);
    if (!this.nodes.length || this.nodes[at].value !== null) {
      let free = -1;
      while (this.lastfree > 0) { if (this.nodes[--this.lastfree].key === null) { free = this.lastfree; break; } }
      if (free < 0) { this.rehash(key); this.rawset(key, value); return; }
      const other = this.hash(this.nodes[at].key);
      if (other !== at) {
        let previous = other; while (this.nodes[previous].next !== at) previous = this.nodes[previous].next;
        this.nodes[previous].next = free; this.nodes[free] = { ...this.nodes[at] };
        this.nodes[at] = { key: null, value: null, next: null };
      } else { this.nodes[free].next = this.nodes[at].next; this.nodes[at].next = free; at = free; }
    }
    this.nodes[at].key = key; this.nodes[at].value = value; this.store(key, value);
  }
  resize(arraySize, hashSize) {
    const previousNodes = this.nodes, previousArray = this.arraySize;
    this.heap?.resizeTable(this, arraySize, roundedSize(hashSize));
    this.arraySize = arraySize; this.setnodes(hashSize); this.alimit = arraySize; this.realLimit = true;
    // Shrinking array slots are inserted before old hash nodes, as in luaH_resize.
    for (let i = arraySize + 1; i <= previousArray; i++) { const key = BigInt(i), value = this.values.get(key); if (value !== undefined) this.rawset(key, value); }
    for (const node of previousNodes) if (node.value !== null) this.rawset(node.key, node.value);
  }
  resizeArray(arraySize) { this.resize(arraySize, this.nodes.length); }
  rehash(extra) {
    const counts = new Array(32).fill(0); let integers = 0;
    for (const key of [...this.values.keys(), extra]) { const index = arrayIndex(key); if (index) { counts[Math.ceil(Math.log2(index))]++; integers++; } }
    let size = 0, used = 0, sum = 0;
    for (let i = 0, candidate = 1; i <= 31 && integers > candidate / 2; i++, candidate *= 2) {
      sum += counts[i]; if (sum > candidate / 2) { size = candidate; used = sum; }
    }
    this.resize(size, this.values.size + 1 - used);
  }
  next(key = null) {
    let at = 0;
    if (key !== null) {
      key = normalize(key); const index = arrayIndex(key);
      if (index && index <= this.arraySize) at = index;
      else { const node = this.nodeIndex(key); if (node < 0) throw new LuaError("invalid key to 'next'"); at = node + 1 + this.arraySize; }
    }
    for (; at < this.arraySize; at++) { const key = BigInt(at + 1), value = this.values.get(key); if (value !== undefined) return [key, value]; }
    for (at -= this.arraySize; at < this.nodes.length; at++) { const node = this.nodes[at]; if (node.value !== null) return [node.key, node.value]; }
    return [null];
  }
  arrayValue(index) { return this.values.get(BigInt(index)) ?? null; }
  binsearch(low, high) { while (high - low > 1) { const middle = Math.floor((low + high) / 2); if (this.arrayValue(middle) === null) high = middle; else low = middle; } return low; }
  length() {
    let limit = this.alimit;
    if (limit > 0 && this.arrayValue(limit) === null) {
      if (limit >= 2 && this.arrayValue(limit - 1) !== null) {
        if (power2(this.arraySize) && !power2(limit - 1)) { this.alimit = limit - 1; this.realLimit = false; }
        return BigInt(limit - 1);
      }
      const boundary = this.binsearch(0, limit);
      if (power2(this.arraySize) && boundary > this.arraySize / 2) { this.alimit = boundary; this.realLimit = false; }
      return BigInt(boundary);
    }
    if (limit !== this.arraySize) {
      if (this.arrayValue(limit + 1) === null) return BigInt(limit);
      limit = this.arraySize;
      if (this.arrayValue(limit) === null) { const boundary = this.binsearch(this.alimit, limit); this.alimit = boundary; return BigInt(boundary); }
    }
    if (!this.nodes.length || this.rawget(BigInt(limit) + 1n) === null) return BigInt(limit);
    let low = BigInt(limit), high = low + 1n;
    while (this.rawget(high) !== null) { low = high; if (high > MAXINT / 2n) { high = MAXINT; if (this.rawget(high) !== null) return high; break; } high *= 2n; }
    while (high - low > 1n) { const middle = (low + high) / 2n; if (this.rawget(middle) === null) high = middle; else low = middle; }
    return low;
  }
}
