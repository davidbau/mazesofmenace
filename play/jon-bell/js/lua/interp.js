// js/lua/interp.js — Lua 5.4 tree-walking interpreter
// Walks AST from js/lua/parser.js.  Exports makeInterp() → { defineGlobal, getGlobal, run }.
//
// Value representation:
//   nil         — JS null
//   boolean     — JS boolean
//   number      — JS number
//   string      — JS string
//   LuaTable    — { type:'table', map:Map, array:Array }
//   LuaClosure  — { type:'function', params, body, env, isVararg }
//   native fn   — JS function (callable from Lua; receives marshalled args)
//
// Multiple-return: evalExp returns Array (may have >1 element); evalExp1
// returns the first element only (adjust-to-1 for expression positions).
// Varargs / `...`: represented internally as a special marker so that the
// last-position spread rule can be applied.

import { luaFind, luaMatch, luaGmatch, luaGsub } from './patterns.js';

// Lua 5.4: only false and nil are false; 0 and the empty string are true.
const luaTruthy = value => value != null && value !== false;

// ---------------------------------------------------------------------------
// Value constructors / predicates
// ---------------------------------------------------------------------------

export class LuaTable {
  constructor() {
    this.type = 'table';
    this.map = new Map();       // hash part: any key → value
    this.array = [];            // array part: 1-based indices stored at [i-1]
  }

  get(key) {
    if (key === null) return null; // nil key → nil
    if (typeof key === 'number' && Number.isInteger(key) && key >= 1) {
      const idx = key - 1;
      if (idx < this.array.length && this.array[idx] !== undefined) {
        return this.array[idx];
      }
    }
    if (this.map.has(key)) return this.map.get(key);
    return null; // nil
  }

  set(key, value) {
    if (key === null) return; // cannot index with nil
    if (value == null) {
      this.map.delete(key);
      if (Number.isInteger(key) && key >= 1 && key <= this.array.length)
        this.array[key - 1] = null;
      return;
    }
    if (typeof key === 'number' && Number.isInteger(key) && key >= 1) {
      const idx = key - 1;
      // Extend array part as needed
      if (idx < this.array.length) {
        this.array[idx] = value;
      } else if (idx === this.array.length) {
        this.array.push(value);
      } else {
        // Hole: store in hash part
        this.map.set(key, value);
      }
    } else {
      this.map.set(key, value);
    }
  }

  // # operator — border search on array part (contiguous 1..n with no holes)
  length() {
    // Binary search for boundary: largest n such that array[n-1] != null
    if (this.array.length === 0) return 0;
    let lo = 0;
    let hi = this.array.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (mid <= this.array.length && this.array[mid - 1] != null) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  // For iteration: yield [key, value] for each entry
  *entries() {
    // Array part first
    for (let i = 0; i < this.array.length; i++) {
      if (this.array[i] != null) {
        yield [i + 1, this.array[i]];
      }
    }
    // Hash part
    for (const [k, v] of this.map) {
      yield [k, v];
    }
  }
}

export class LuaUserdata {
  constructor(value, metatable) {
    this.type = 'userdata';
    this.value = value;
    this.metatable = metatable;
  }
  get(key) {
    const methods = this.metatable.get('__index');
    if (!(methods instanceof LuaTable)) throw new Error('userdata has no table __index');
    return methods.get(key);
  }
}

class LuaClosure {
  constructor(params, body, env, isVararg) {
    this.type = 'function';
    this.params = params;       // array of param names; '...' means vararg
    this.body = body;           // array of statements
    this.env = env;
    this.isVararg = isVararg;   // true if '...' is in params
  }
}

function isLuaTable(v) {
  return v != null && typeof v === 'object' && v.type === 'table';
}

function isLuaClosure(v) {
  return v != null && typeof v === 'object' && v.type === 'function';
}

// Wrap a JS native function as a callable Lua value.
// Mark it so evalCall can distinguish native from Lua closure.
function nativeFn(jsFn) {
  jsFn._isNative = true;
  return jsFn;
}

function isNativeFn(v) {
  return typeof v === 'function' && v._isNative === true;
}

function isCallable(v) {
  return isLuaClosure(v) || isNativeFn(v) || typeof v === 'function';
}

// A selectionvar (js/sp_lev.js selection_new/clone/area/...) flows through the
// interpreter as a raw JS object (native returns are NOT marshalled — see
// callFunction), so it is distinguishable from a LuaTable (type==='table',
// .map is a Map) purely by shape: a plain object carrying the struct
// selectionvar fields wid/hei/bounds and an Array `map`. In real NetHack these
// are userdata with a metatable whose __index is the selection method table and
// whose __bor is l_selection_or; this predicate is how we recognize that
// userdata so method-calls and the `|` operator can dispatch like the metatable.
function isSelectionVar(v) {
  return v != null && typeof v === 'object' && v.type !== 'table'
    && Array.isArray(v.map)
    && typeof v.wid === 'number' && typeof v.hei === 'number'
    && v.bounds != null && typeof v.bounds === 'object';
}

function marshalGlobal(value) {
  if (value == null) return value;
  if (isNativeFn(value)) return value;
  if (typeof value === 'function') return nativeFn(value);
  if (isLuaTable(value) || value instanceof LuaUserdata) return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const t = new LuaTable();
    for (const k of Object.keys(value)) t.set(k, marshalGlobal(value[k]));
    return t;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Environment (lexical scope chain)
// ---------------------------------------------------------------------------

class Environment {
  constructor(parent) {
    this.locals = new Map();
    this.parent = parent;  // Environment | null
  }

  has(name) {
    if (this.locals.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  get(name) {
    if (this.locals.has(name)) return this.locals.get(name);
    if (this.parent) return this.parent.get(name);
    return null; // nil
  }

  // setLocal only sets in THIS scope (for local declarations)
  setLocal(name, value) {
    this.locals.set(name, value);
  }

  // set updates in the innermost scope that has the variable
  set(name, value) {
    if (this.locals.has(name)) {
      this.locals.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.set(name, value);
      return;
    }
    // Not found — set in globals (the root environment)
    this.locals.set(name, value);
  }

  // defineLocal adds to this scope (used for function parameters, for-loop vars)
  define(name, value) {
    this.locals.set(name, value);
  }
}

// ---------------------------------------------------------------------------
// Standard library
// ---------------------------------------------------------------------------

function makeStringLib() {
  const tbl = new LuaTable();

  tbl.set('len', nativeFn((s) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.len: argument must be a string');
    return s.length;
  }));

  tbl.set('upper', nativeFn((s) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.upper: argument must be a string');
    return s.toUpperCase();
  }));

  tbl.set('lower', nativeFn((s) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.lower: argument must be a string');
    return s.toLowerCase();
  }));

  tbl.set('rep', nativeFn((s, n) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.rep: argument #1 must be a string');
    if (typeof n !== 'number') throw new LuaRuntimeError('string.rep: argument #2 must be a number');
    return s.repeat(Math.max(0, Math.floor(n)));
  }));

  tbl.set('sub', nativeFn((s, i, j) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.sub: argument #1 must be a string');
    const len = s.length;
    let start = typeof i === 'number' ? i : 1;
    let end = typeof j === 'number' ? j : len;
    // Lua 1-based indexing
    if (start < 1) start = 1;
    if (end > len) end = len;
    if (start > end) return '';
    return s.substring(start - 1, end);
  }));

  tbl.set('format', nativeFn(stringFormat));

  tbl.set('find', nativeFn((s, pattern, init, plain) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.find: argument #1 must be a string');
    if (typeof pattern !== 'string') throw new LuaRuntimeError('string.find: argument #2 must be a string');
    return luaFind(s, pattern, init, plain);
  }));

  tbl.set('match', nativeFn((s, pattern, init) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.match: argument #1 must be a string');
    if (typeof pattern !== 'string') throw new LuaRuntimeError('string.match: argument #2 must be a string');
    return luaMatch(s, pattern, init);
  }));

  tbl.set('gmatch', nativeFn((s, pattern) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.gmatch: argument #1 must be a string');
    if (typeof pattern !== 'string') throw new LuaRuntimeError('string.gmatch: argument #2 must be a string');
    // gmatch returns an iterator function
    const iter = luaGmatch(s, pattern);
    return nativeFn(function gmatchIter() {
      return iter();
    });
  }));

  tbl.set('gsub', nativeFn((s, pattern, repl, n) => {
    if (typeof s !== 'string') throw new LuaRuntimeError('string.gsub: argument #1 must be a string');
    if (typeof pattern !== 'string') throw new LuaRuntimeError('string.gsub: argument #2 must be a string');
    // luaGsub returns [string, count]
    return luaGsub(s, pattern, repl, n);
  }));

  return tbl;
}

function stringFormat(fmt, ...args) {
  if (typeof fmt !== 'string') throw new LuaRuntimeError('string.format: argument #1 must be a string');
  // Basic Lua string.format subset
  let argIdx = 0;
  const result = fmt.replace(/%[#0 +\-]*[0-9]*(\.[0-9]*)?[sdioxXufeEgGcq%]/g, (match) => {
    if (match === '%%') return '%';
    const spec = match[match.length - 1];
    const arg = args[argIdx++];
    switch (spec) {
      case 's': return arg != null ? String(arg) : 'nil';
      case 'd':
      case 'i': {
        const n = Number(arg);
        return String(Math.floor(isNaN(n) ? 0 : n));
      }
      case 'o': {
        const n = Number(arg);
        return (isNaN(n) ? 0 : Math.floor(n)).toString(8);
      }
      case 'u': {
        const n = Number(arg);
        return String(Math.max(0, Math.floor(isNaN(n) ? 0 : n)));
      }
      case 'x': {
        const n = Number(arg);
        return (isNaN(n) ? 0 : Math.floor(n)).toString(16);
      }
      case 'X': {
        const n = Number(arg);
        return (isNaN(n) ? 0 : Math.floor(n)).toString(16).toUpperCase();
      }
      case 'f': {
        const n = Number(arg);
        return (isNaN(n) ? 0 : n).toFixed(6);
      }
      case 'e': {
        const n = Number(arg);
        return (isNaN(n) ? 0 : n).toExponential(6);
      }
      case 'E': {
        const n = Number(arg);
        return (isNaN(n) ? 0 : n).toExponential(6).toUpperCase();
      }
      case 'g': {
        const n = Number(arg);
        if (isNaN(n)) return '0';
        const s = n.toPrecision(6);
        return s;
      }
      case 'G': {
        const n = Number(arg);
        if (isNaN(n)) return '0';
        return n.toPrecision(6).toUpperCase();
      }
      case 'c': {
        const n = Number(arg);
        return String.fromCharCode(Math.floor(isNaN(n) ? 0 : n));
      }
      case 'q': {
        // %q produces a safely-quoted Lua string
        const s = arg != null ? String(arg) : 'nil';
        return JSON.stringify(s);
      }
      default: return match;
    }
  });
  return result;
}

// Stable merge sort with an async comparator — needed because table.sort's
// comparator may be a Lua function that calls into an async native, and
// Array.prototype.sort requires a synchronous comparator.
async function asyncMergeSort(arr, cmp) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = await asyncMergeSort(arr.slice(0, mid), cmp);
  const right = await asyncMergeSort(arr.slice(mid), cmp);
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    const c = await cmp(left[i], right[j]);
    if (c <= 0) result.push(left[i++]);
    else result.push(right[j++]);
  }
  while (i < left.length) result.push(left[i++]);
  while (j < right.length) result.push(right[j++]);
  return result;
}

function makeTableLib() {
  const tbl = new LuaTable();

  tbl.set('insert', nativeFn((t, pos, value) => {
    if (!isLuaTable(t)) throw new LuaRuntimeError('table.insert: argument #1 must be a table');
    // Two-arg form: table.insert(t, value) — append (only pos provided, no value)
    if (value === undefined) {
      t.array.push(pos != null ? pos : null);
      return null;
    }
    // Three-arg form: table.insert(t, pos, value)
    if (typeof pos !== 'number' || !Number.isInteger(pos)) {
      throw new LuaRuntimeError('table.insert: position must be an integer');
    }
    const idx = pos - 1;
    if (idx < 0) throw new LuaRuntimeError('table.insert: position out of bounds');
    if (idx >= t.array.length) {
      // Extend with nils
      while (t.array.length < idx) t.array.push(null);
      t.array.push(value);
    } else {
      t.array.splice(idx, 0, value);
    }
    return null;
  }));

  tbl.set('remove', nativeFn((t, pos) => {
    if (!isLuaTable(t)) throw new LuaRuntimeError('table.remove: argument #1 must be a table');
    const p = pos != null ? pos : t.length();
    if (typeof p !== 'number' || !Number.isInteger(p) || p < 1) {
      throw new LuaRuntimeError('table.remove: position out of bounds');
    }
    const idx = p - 1;
    if (idx >= t.array.length) return null;
    const removed = t.array[idx] != null ? t.array[idx] : null;
    t.array.splice(idx, 1);
    return removed;
  }));

  tbl.set('concat', nativeFn((t, sep, i, j) => {
    if (!isLuaTable(t)) throw new LuaRuntimeError('table.concat: argument #1 must be a table');
    const separator = sep != null ? String(sep) : '';
    const start = i != null ? Math.max(1, i) : 1;
    const end = j != null ? j : t.length();
    const parts = [];
    for (let k = start; k <= end; k++) {
      const v = t.get(k);
      if (v != null) {
        parts.push(typeof v === 'string' ? v : String(v));
      }
    }
    return parts.join(separator);
  }));

  tbl.set('sort', nativeFn(async (t, comp) => {
    if (!isLuaTable(t)) throw new LuaRuntimeError('table.sort: argument #1 must be a table');
    const arr = t.array;
    // Extract non-nil elements with their indices
    const items = [];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] != null) items.push({ idx: i, val: arr[i] });
    }
    let sorted;
    if (comp) {
      if (!isCallable(comp)) throw new LuaRuntimeError('table.sort: comparator must be a function');
      // callFunction is async (a Lua comparator may call into async natives),
      // so Array.prototype.sort (synchronous comparator only) can't be used
      // here — asyncMergeSort awaits the comparator between every comparison.
      sorted = await asyncMergeSort(items, async (a, b) => {
        const r = await callFunction(null, comp, [a.val, b.val]);
        // callFunction returns array; get first value
        const rv = Array.isArray(r) ? r[0] : r;
        return luaTruthy(rv) ? -1 : 1;
      });
    } else {
      sorted = items.slice().sort((a, b) => {
        if (typeof a.val === 'string' && typeof b.val === 'string') {
          return a.val < b.val ? -1 : a.val > b.val ? 1 : 0;
        }
        return Number(a.val) - Number(b.val);
      });
    }
    // Rebuild array
    const newArr = new Array(sorted.length);
    for (let i = 0; i < sorted.length; i++) {
      newArr[i] = sorted[i].val;
    }
    t.array = newArr;
    return null;
  }));

  tbl.set('unpack', nativeFn((t, i, j) => {
    if (!isLuaTable(t)) throw new LuaRuntimeError('table.unpack: argument #1 must be a table');
    const start = i != null ? Math.max(1, i) : 1;
    const end = j != null ? j : t.length();
    const vals = [];
    for (let k = start; k <= end; k++) {
      vals.push(t.get(k));
    }
    vals._multi = true;
    return vals;
  }));

  return tbl;
}

function makeMathLib() {
  const tbl = new LuaTable();

  tbl.set('floor', nativeFn((x) => {
    if (typeof x !== 'number') throw new LuaRuntimeError('math.floor: argument must be a number');
    return Math.floor(x);
  }));

  tbl.set('max', nativeFn((...args) => {
    let max = -Infinity;
    for (const a of args) {
      if (typeof a !== 'number') continue;
      if (a > max) max = a;
    }
    return max === -Infinity ? 0 : max;
  }));

  tbl.set('min', nativeFn((...args) => {
    let min = Infinity;
    for (const a of args) {
      if (typeof a !== 'number') continue;
      if (a < min) min = a;
    }
    return min === Infinity ? 0 : min;
  }));

  tbl.set('abs', nativeFn((x) => {
    if (typeof x !== 'number') throw new LuaRuntimeError('math.abs: argument must be a number');
    return Math.abs(x);
  }));

  // math.random is an ordinary slot — nhlib.lua overwrites it
  // We provide a stub that errors if called before nhlib.lua loads.
  tbl.set('random', nativeFn(() => {
    throw new LuaRuntimeError('math.random: nhlib.lua not loaded (stub)');
  }));

  return tbl;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

class LuaRuntimeError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'LuaRuntimeError';
    this.line = line || 0;
  }
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------

export function makeInterp() {
  // Root global environment
  const globals = new Environment(null);

  // Selectionvar union (`|`) backing op, registered by the binding layer
  // (js/lua/nh_state.js) via setSelectionUnion. Null when the interpreter is
  // used standalone (e.g. lspo-assembly-diff self-test), in which case `|`
  // keeps its plain numeric behavior. See the `|` case in evalBinary and the
  // C metatable entry nhlsel.c:1013 { "__bor", l_selection_or }.
  let selectionUnionFn = null;
  function setSelectionUnion(fn) { selectionUnionFn = fn; }

  // Selectionvar intersection (`&`) backing op — same contract as
  // setSelectionUnion above; C metatable entry nhlsel.c:1012
  // { "__band", l_selection_and }.
  let selectionIntersectFn = null;
  function setSelectionIntersect(fn) { selectionIntersectFn = fn; }

  // C nhlsel.c:1016 __add / __sub — selection addition aliases union,
  // while subtraction keeps points in the left operand that are absent from
  // the right operand.
  let selectionSubtractFn = null;
  function setSelectionSubtract(fn) { selectionSubtractFn = fn; }

  // Install standard libraries
  globals.setLocal('string', makeStringLib());
  globals.setLocal('table', makeTableLib());
  globals.setLocal('math', makeMathLib());

  // Global functions
  globals.setLocal('pairs', nativeFn(function pairs(t) {
    if (!isLuaTable(t)) throw new LuaRuntimeError('pairs: argument must be a table');
    // Return iterator, table, nil
    const iter = nativeFn(function nextIter(tbl, prevKey) {
      // Simple implementation: use entries iterator
      const it = tbl._pairsIter;
      if (!it) {
        // First call: create iterator
        const entriesIter = tbl.entries();
        tbl._pairsIter = entriesIter;
        const nxt = entriesIter.next();
        if (nxt.done) return null;
        return [nxt.value[0], nxt.value[1]];
      }
      const nxt = it.next();
      if (nxt.done) return null;
      return [nxt.value[0], nxt.value[1]];
    });
    // Reset the iterator state on the table
    t._pairsIter = t.entries();
    // Return iterator function, table, nil
    // But the generic for calls the iterator with (state, prevKey)
    // We need: iterator(state, prevKey) → nextKey, nextValue
    // Let's redo this...
    const itFn = nativeFn(function nextPair(tbl, prevKey) {
      if (!tbl._pairsIter) {
        tbl._pairsIter = tbl.entries();
      }
      const nxt = tbl._pairsIter.next();
      if (nxt.done) {
        tbl._pairsIter = null;
        return null;
      }
      return [nxt.value[0], nxt.value[1]];
    });
    t._pairsIter = t.entries();
    return [itFn, t, null];
  }));

  globals.setLocal('ipairs', nativeFn(function ipairs(t) {
    if (!isLuaTable(t)) throw new LuaRuntimeError('ipairs: argument must be a table');
    const itFn = nativeFn(function ipairsIter(tbl, i) {
      const idx = (i || 0) + 1;
      const v = tbl.get(idx);
      if (v == null) return null;
      return [idx, v];
    });
    return [itFn, t, 0];
  }));

  globals.setLocal('tostring', nativeFn((v) => {
    if (v == null) return 'nil';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return String(v);
    }
    if (typeof v === 'string') return v;
    if (isLuaTable(v)) return `table: ${JSON.stringify(v)}`;
    if (isLuaClosure(v) || isNativeFn(v)) return 'function: 0x00000000';
    return String(v);
  }));

  globals.setLocal('tonumber', nativeFn((v, base) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const b = base != null ? base : 10;
      if (b === 10) {
        const n = Number(v);
        return isNaN(n) ? null : n;
      }
      if (b >= 2 && b <= 36) {
        const n = parseInt(v, b);
        return isNaN(n) ? null : n;
      }
      return null;
    }
    return null;
  }));

  globals.setLocal('type', nativeFn((v) => {
    if (v === null) return 'nil';
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'string') return 'string';
    if (isLuaTable(v)) return 'table';
    if (isLuaClosure(v) || isNativeFn(v)) return 'function';
    return 'userdata';
  }));

  globals.setLocal('error', nativeFn((msg, level) => {
    const message = msg != null ? String(msg) : 'error';
    throw new LuaRuntimeError(message, 0);
  }));

  globals.setLocal('assert', nativeFn((v, msg) => {
    if (!luaTruthy(v)) {
      const message = msg != null ? String(msg) : 'assertion failed!';
      throw new LuaRuntimeError(message, 0);
    }
    // Return all arguments (like Lua's assert)
    return [v, msg].filter(x => x !== undefined);
  }));

  // _G — the global environment table (Lua 5.4 §2.2).
  // Must be a LuaTable value so _G.x / _G['x'] / _G[k](...) work.
  // Proxy get/set to the root globals Environment so reads/writes
  // stay coherent with plain global variable access.
  const _G = new LuaTable();
  _G.get = function(key) {
    if (key === null) return null;
    return globals.get(key);
  };
  _G.set = function(key, value) {
    if (key === null) return;
    globals.set(key, value);
  };
  globals.setLocal('_G', _G);

  // Interpreter state
  let currentLine = 0;

  // -----------------------------------------------------------------------
  // defineGlobal — register a native or value into the global table
  // Supports dotted names: 'des.map' → globals.des.map = value
  // -----------------------------------------------------------------------
  function defineGlobal(name, value) {
    const parts = name.split('.');
    let tbl = globals;
    let current = null; // current Lua value at this level

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let existing = tbl.get(part);
      if (!isLuaTable(existing)) {
        existing = new LuaTable();
        tbl.setLocal(part, existing);
      }
      tbl = null; // can't use Environment for table access
      current = existing;
    }

    const last = parts[parts.length - 1];

    if (parts.length === 1) {
      // Top-level global
      const v = marshalGlobal(value);
      globals.setLocal(last, v);
    } else {
      // Nested: set in the intermediate table
      const v = marshalGlobal(value);
      current.set(last, v);
    }
  }

  // getGlobal — read a (possibly dotted) global's current value; null if absent.
  // Mirror of defineGlobal's traversal. Lets instruments WRAP an existing
  // loses any semantics the state layer installed (e.g. des.object's
  // contents-closure invocation). Native fns come back as the plain JS
  // functions defineGlobal marshalled in, directly callable with the same
  // marshalled args a binding receives.
  function getGlobal(name) {
    const parts = name.split('.');
    let v = globals.get(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      if (!isLuaTable(v)) return null;
      v = v.get(parts[i]);
    }
    return v === undefined ? null : v;
  }

  // -----------------------------------------------------------------------
  // run — execute an AST Chunk
  // -----------------------------------------------------------------------
  async function run(ast) {
    try {
      const result = await evalBlock(ast.body, globals);
      if (result && result._control === 'return') {
        delete result._control;
        const vals = result.filter(v => v !== undefined);
        if (vals.length === 0) return null;
        if (vals.length === 1) return vals[0];
        vals._multi = true;
        return vals;
      }
    } catch (e) {
      if (e instanceof LuaRuntimeError) {
        throw e;
      }
      throw new LuaRuntimeError(e.message || String(e), currentLine);
    }
  }

  // -----------------------------------------------------------------------
  // evalBlock — execute a list of statements in an environment
  // Returns array of values (for return), or empty array
  // -----------------------------------------------------------------------
  async function evalBlock(stmts, env) {
    for (const stmt of stmts) {
      currentLine = stmt.line || currentLine;
      const result = await evalStat(stmt, env);
      // Check for return/break
      if (result && result._control) {
        return result;
      }
    }
    return [];
  }

  // -----------------------------------------------------------------------
  // evalStat — dispatch on statement type
  // -----------------------------------------------------------------------
  async function evalStat(stmt, env) {
    currentLine = stmt.line || currentLine;

    switch (stmt.type) {
      case 'LocalDeclaration':
        return await evalLocalDeclaration(stmt, env);
      case 'Assignment':
        return await evalAssignment(stmt, env);
      case 'FunctionDeclaration':
        return await evalFunctionDeclaration(stmt, env);
      case 'IfStatement':
        return await evalIf(stmt, env);
      case 'NumericFor':
        return await evalNumericFor(stmt, env);
      case 'GenericFor':
        return await evalGenericFor(stmt, env);
      case 'WhileStatement':
        return await evalWhile(stmt, env);
      case 'RepeatStatement':
        return await evalRepeat(stmt, env);
      case 'CallStatement':
        return await evalCallStatement(stmt, env);
      case 'ReturnStatement':
        return await evalReturn(stmt, env);
      case 'BreakStatement':
        return { _control: 'break' };
      case 'DoBlock':
        return await evalBlock(stmt.body, new Environment(env));
      default:
        throw new LuaRuntimeError(`unknown statement type: ${stmt.type}`, currentLine);
    }
  }

  // -----------------------------------------------------------------------
  // LocalDeclaration: local a, b = exp1, exp2
  // -----------------------------------------------------------------------
  async function evalLocalDeclaration(stmt, env) {
    const vals = [];
    for (let i = 0; i < stmt.values.length; i++) {
      if (stmt.values[i] === null) {
        vals.push(null);
      } else {
        const ev = await evalExp1(stmt.values[i], env);
        vals.push(ev);
      }
    }
    for (let i = 0; i < stmt.names.length; i++) {
      env.define(stmt.names[i], i < vals.length ? vals[i] : null);
    }
    return [];
  }

  // -----------------------------------------------------------------------
  // Assignment: a, b.c = exp1, exp2
  // -----------------------------------------------------------------------
  async function evalAssignment(stmt, env) {
    const vals = [];
    for (let i = 0; i < stmt.values.length; i++) {
      const ev = await evalExp1(stmt.values[i], env);
      vals.push(ev);
    }
    for (let i = 0; i < stmt.vars.length; i++) {
      const v = i < vals.length ? vals[i] : null;
      await setVar(stmt.vars[i], v, env);
    }
    return [];
  }

  // Helper: set a Var (Variable, IndexExpression, MemberExpression) to a value
  async function setVar(v, value, env) {
    if (v.type === 'Variable') {
      env.set(v.name, value);
      return;
    }
    if (v.type === 'IndexExpression') {
      const base = await evalExp1(v.base, env);
      if (!isLuaTable(base)) {
        throw new LuaRuntimeError('attempt to index a non-table value', currentLine);
      }
      const key = await evalExp1(v.index, env);
      base.set(key, value);
      return;
    }
    if (v.type === 'MemberExpression') {
      const base = await evalExp1(v.base, env);
      if (!isLuaTable(base)) {
        throw new LuaRuntimeError('attempt to index a non-table value', currentLine);
      }
      base.set(v.member, value);
      return;
    }
    throw new LuaRuntimeError(`cannot assign to ${v.type}`, currentLine);
  }

  // -----------------------------------------------------------------------
  // FunctionDeclaration: function f(...) ... end  or  function t.f(...) ... end
  // -----------------------------------------------------------------------
  async function evalFunctionDeclaration(stmt, env) {
    const isVararg = stmt.params.includes('...');
    const paramNames = stmt.params.filter(p => p !== '...');
    const closure = new LuaClosure(paramNames, stmt.body, env, isVararg);
    await setVar(stmt.name, closure, env);
    return [];
  }

  // -----------------------------------------------------------------------
  // IfStatement
  // -----------------------------------------------------------------------
  async function evalIf(stmt, env) {
    for (const clause of stmt.clauses) {
      const cond = await evalExp1(clause.condition, env);
      if (luaTruthy(cond)) {
        return await evalBlock(clause.body, new Environment(env));
      }
    }
    if (stmt.elseBody) {
      return await evalBlock(stmt.elseBody, new Environment(env));
    }
    return [];
  }

  // -----------------------------------------------------------------------
  // NumericFor: for i = start, end [, step] do ... end
  // -----------------------------------------------------------------------
  async function evalNumericFor(stmt, env) {
    const startVal = Number(await evalExp1(stmt.start, env));
    const endVal = Number(await evalExp1(stmt.end, env));
    const stepVal = stmt.step ? Number(await evalExp1(stmt.step, env)) : 1;

    if (stepVal === 0) return [];

    const loopEnv = new Environment(env);
    loopEnv.define(stmt.var, startVal);

    if (stepVal > 0) {
      for (let i = startVal; i <= endVal; i += stepVal) {
        loopEnv.setLocal(stmt.var, i);
        const result = await evalBlock(stmt.body, loopEnv);
        if (result && result._control === 'break') break;
        if (result && result._control === 'return') return result;
      }
    } else {
      for (let i = startVal; i >= endVal; i += stepVal) {
        loopEnv.setLocal(stmt.var, i);
        const result = await evalBlock(stmt.body, loopEnv);
        if (result && result._control === 'break') break;
        if (result && result._control === 'return') return result;
      }
    }
    return [];
  }

  // -----------------------------------------------------------------------
  // GenericFor: for k, v in iterators do ... end
  // -----------------------------------------------------------------------
  async function evalGenericFor(stmt, env) {
    // Evaluate iterators: they return (iteratorFn, state, initialKey)
    const iterResults = [];
    for (const iterExp of stmt.iterators) {
      const vals = await evalExp(iterExp, env);
      iterResults.push(...vals);
    }

    // Generic for: the iterator expressions yield (fn, state, initial)
    // We use the standard: fn(state, prevKey) → nextKey, nextVal...
    // But wait — in Lua, for k,v in pairs(t) — the result of pairs(t) is
    // (next, t, nil). The for loop calls next(t, nil) → k1,v1; then
    // next(t, k1) → k2,v2; etc.
    //
    // But ipairs returns (ipairsIter, t, 0) — calls ipairsIter(t, 0) → 1, v1;
    // then ipairsIter(t, 1) → 2, v2; etc.
    //
    // In our implementation, pairs returns [itFn, t, null] and ipairs returns [itFn, t, 0].
    // Both follow the pattern: call itFn(state, prevKey) → returns [nextKey, nextVal] or null.

    const itFn = iterResults[0];
    const state = iterResults[1] || null;
    let prevKey = iterResults[2] !== undefined ? iterResults[2] : null;

    if (!isCallable(itFn)) {
      throw new LuaRuntimeError('generic for: iterator must be a function', currentLine);
    }

    const loopEnv = new Environment(env);

    while (true) {
      // Call iterator(state, prevKey)
      const result = await callFunction(null, itFn, [state, prevKey]);
      const vals = (Array.isArray(result) ? result : [result]).filter(v => v !== undefined);
      if (vals.length === 0 || vals[0] === null) break;

      prevKey = vals[0];

      // Assign to loop variables
      for (let i = 0; i < stmt.vars.length; i++) {
        loopEnv.define(stmt.vars[i], i < vals.length ? vals[i] : null);
      }

      const blockResult = await evalBlock(stmt.body, loopEnv);
      if (blockResult && blockResult._control === 'break') break;
      if (blockResult && blockResult._control === 'return') return blockResult;
    }

    return [];
  }

  // -----------------------------------------------------------------------
  // WhileStatement
  // -----------------------------------------------------------------------
  async function evalWhile(stmt, env) {
    while (true) {
      const cond = await evalExp1(stmt.condition, env);
      if (!luaTruthy(cond)) break;
      const result = await evalBlock(stmt.body, new Environment(env));
      if (result && result._control === 'break') break;
      if (result && result._control === 'return') return result;
    }
    return [];
  }

  // -----------------------------------------------------------------------
  // RepeatStatement
  // -----------------------------------------------------------------------
  async function evalRepeat(stmt, env) {
    while (true) {
      const result = await evalBlock(stmt.body, new Environment(env));
      if (result && result._control === 'break') break;
      if (result && result._control === 'return') return result;
      const cond = await evalExp1(stmt.condition, env);
      if (luaTruthy(cond)) break;
    }
    return [];
  }

  // -----------------------------------------------------------------------
  // CallStatement: f() as a statement
  // -----------------------------------------------------------------------
  async function evalCallStatement(stmt, env) {
    // stmt.call may be a FunctionCall OR a MethodCall (e.g. the statement
    // `pools:set()`); route through evalExp so it dispatches by node type.
    // Calling evalCall directly would mishandle a MethodCall node (no self
    // injection, treats the receiver as the callee).
    await evalExp(stmt.call, env);
    return [];
  }

  // -----------------------------------------------------------------------
  // ReturnStatement
  // -----------------------------------------------------------------------
  async function evalReturn(stmt, env) {
    const vals = [];
    for (let i = 0; i < stmt.values.length; i++) {
      const exp = stmt.values[i];
      // Last position: spread multi-values
      if (i === stmt.values.length - 1) {
        const ev = await evalExp(exp, env);
        if (Array.isArray(ev)) {
          vals.push(...ev);
        } else {
          vals.push(ev);
        }
      } else {
        vals.push(await evalExp1(exp, env));
      }
    }
    vals._control = 'return';
    return vals;
  }

  // =======================================================================
  // EXPRESSION EVALUATION
  // =======================================================================

  // evalExp — evaluate an expression, may return multiple values (as array
  // with _multi marker, or a single value)
  async function evalExp(exp, env) {
    if (!exp) return null;
    currentLine = exp.line || currentLine;

    switch (exp.type) {
      case 'Literal':
        return exp.value;
      case 'Variable':
        return env.get(exp.name);
      case 'VarArgs':
        return evalVarArgs(env);
      case 'FunctionExpression':
        return evalFunctionExpression(exp, env);
      case 'TableConstructor':
        return await evalTableConstructor(exp, env);
      case 'BinaryExpression':
        return await evalBinary(exp, env);
      case 'UnaryExpression':
        return await evalUnary(exp, env);
      case 'IndexExpression':
        return await evalIndex(exp, env);
      case 'MemberExpression':
        return await evalMember(exp, env);
      case 'FunctionCall':
        return await evalCall(exp, env);
      case 'MethodCall':
        return await evalMethodCall(exp, env);
      default:
        throw new LuaRuntimeError(`unknown expression type: ${exp.type}`, currentLine);
    }
  }

  // evalExp1 — evaluate and return the FIRST value only (adjust-to-1)
  async function evalExp1(exp, env) {
    if (!exp) return null;
    const v = await evalExp(exp, env);
    if (Array.isArray(v) && v._multi) {
      return v.length > 0 ? v[0] : null;
    }
    return v;
  }

  // -----------------------------------------------------------------------
  // VarArgs
  // -----------------------------------------------------------------------
  function evalVarArgs(env) {
    // Find the varargs from the current call frame
    let frame = env;
    while (frame && !Object.hasOwn(frame, '_varargs')) frame = frame.parent;
    const va = frame?._varargs;
    if (!va) return null;
    const result = [...va];
    result._multi = true;
    return result;
  }

  // -----------------------------------------------------------------------
  // FunctionExpression
  // -----------------------------------------------------------------------
  function evalFunctionExpression(exp, env) {
    const isVararg = exp.params.includes('...');
    const paramNames = exp.params.filter(p => p !== '...');
    return new LuaClosure(paramNames, exp.body, env, isVararg);
  }

  // -----------------------------------------------------------------------
  // TableConstructor
  // -----------------------------------------------------------------------
  async function evalTableConstructor(exp, env) {
    const tbl = new LuaTable();
    let arrayIdx = 1;

    for (let i = 0; i < exp.fields.length; i++) {
      const field = exp.fields[i];
      if (field.key === null) {
        // Array-style field
        const isLast = (i === exp.fields.length - 1);
        if (isLast) {
          // Last array-style field: spread multi-values (for varargs, multi-return)
          const vals = await evalExp(field.value, env);
          if (Array.isArray(vals) && vals._multi) {
            for (const v of vals) {
              tbl.set(arrayIdx++, v);
            }
          } else if (Array.isArray(vals)) {
            // Single value returned as array is still just one value
            tbl.set(arrayIdx++, vals);
          } else {
            tbl.set(arrayIdx++, vals);
          }
        } else {
          const v = await evalExp1(field.value, env);
          tbl.set(arrayIdx++, v);
        }
      } else {
        // Keyed field
        const key = await evalExp1(field.key, env);
        const value = await evalExp1(field.value, env);
        tbl.set(key, value);
      }
    }

    return tbl;
  }

  // -----------------------------------------------------------------------
  // BinaryExpression
  // -----------------------------------------------------------------------
  async function evalBinary(exp, env) {
    // Left operand: adjust-to-1
    const left = await evalExp1(exp.left, env);
    // For 'and'/'or', short-circuit:
    if (exp.operator === 'and') {
      if (!luaTruthy(left)) return left;
      return await evalExp1(exp.right, env); // truthy → return right
    }
    if (exp.operator === 'or') {
      if (luaTruthy(left)) return left;
      return await evalExp1(exp.right, env); // falsy → return right
    }

    const right = await evalExp1(exp.right, env);

    switch (exp.operator) {
      case '+':
        if (selectionUnionFn && (isSelectionVar(left) || isSelectionVar(right)))
          return selectionUnionFn(left, right);
        return Number(left) + Number(right);
      case '-':
        if (selectionSubtractFn && (isSelectionVar(left) || isSelectionVar(right)))
          return selectionSubtractFn(left, right);
        return Number(left) - Number(right);
      case '*': return Number(left) * Number(right);
      case '/': {
        const r = Number(right);
        if (r === 0) throw new LuaRuntimeError('division by zero', currentLine);
        return Number(left) / r;
      }
      case '//': {
        const r = Number(right);
        if (r === 0) throw new LuaRuntimeError('division by zero', currentLine);
        return Math.floor(Number(left) / r);
      }
      case '%': {
        const r = Number(right);
        if (r === 0) throw new LuaRuntimeError('modulo by zero', currentLine);
        return Number(left) % r;
      }
      case '^': return Math.pow(Number(left), Number(right));
      case '..': return String(left != null ? left : '') + String(right != null ? right : '');
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '<=': return Number(left) <= Number(right);
      case '>=': return Number(left) >= Number(right);
      case '==': return eqValue(left, right);
      case '~=': return !eqValue(left, right);
      case '&':
        // C: the `&` metamethod on selectionvars is __band -> l_selection_and
        // (nhlsel.c:1012,281). Same dispatch shape as `|` below; plain-number
        // `&` is byte-identical to the previous behavior.
        if (selectionIntersectFn && (isSelectionVar(left) || isSelectionVar(right)))
          return selectionIntersectFn(left, right);
        return Number(left) & Number(right);
      case '|':
        // C: the `|` metamethod on selectionvars is __bor -> l_selection_or
        // (nhlsel.c:1013,306). Dispatch to the registered union op when either
        // operand is a selectionvar; otherwise this is byte-identical to the
        // previous plain numeric behavior (both operands coerce via Number()).
        if (selectionUnionFn && (isSelectionVar(left) || isSelectionVar(right)))
          return selectionUnionFn(left, right);
        return Number(left) | Number(right);
      case '~': return Number(left) ^ Number(right); // Lua binary ~ is XOR
      case '<<': return Number(left) << Number(right);
      case '>>': return Number(left) >> Number(right);
      default:
        throw new LuaRuntimeError(`unknown binary operator: ${exp.operator}`, currentLine);
    }
  }

  // Needed for binary ~ (XOR) — but the parser uses '~' for both unary and binary!
  // Actually Lua 5.4: ~ is bitwise XOR (binary), unary ~ is bitwise NOT
  // The parser emits '~' for both. In the binary case, we need XOR.
  // But wait, the binary op '~' is XOR. Let me handle it above.
  // Actually I already added it to the switch above but it's wrong — for unary ~ it would be
  // caught in evalUnary. Let me fix: in evalBinary, '~' means XOR, in evalUnary '~' means bitwise NOT.
  // The binary '~' case above is wrong — it uses ~Number(left) which is JS bitwise NOT. Let me fix:
  // Actually the code above says `case '~': return ~Number(left);` which is wrong for XOR.
  // I need to compute Number(left) ^ Number(right). Let me fix this in an edit.

  // -----------------------------------------------------------------------
  // UnaryExpression
  // -----------------------------------------------------------------------
  async function evalUnary(exp, env) {
    const arg = await evalExp1(exp.argument, env);
    switch (exp.operator) {
      case 'not': return !luaTruthy(arg);
      case '-': return -Number(arg);
      case '#': {
        if (isLuaTable(arg)) return arg.length();
        if (typeof arg === 'string') return arg.length;
        throw new LuaRuntimeError('attempt to get length of a non-table, non-string value', currentLine);
      }
      case '~': return ~Number(arg); // bitwise NOT
      default:
        throw new LuaRuntimeError(`unknown unary operator: ${exp.operator}`, currentLine);
    }
  }

  // -----------------------------------------------------------------------
  // IndexExpression: base[exp]
  // -----------------------------------------------------------------------
  async function evalIndex(exp, env) {
    const base = await evalExp1(exp.base, env);
    if (!isLuaTable(base) && !(base instanceof LuaUserdata)) {
      throw new LuaRuntimeError('attempt to index a non-table value', currentLine);
    }
    const idx = await evalExp1(exp.index, env);
    return base.get(idx);
  }

  // -----------------------------------------------------------------------
  // MemberExpression: base.name
  // -----------------------------------------------------------------------
  async function evalMember(exp, env) {
    const base = await evalExp1(exp.base, env);
    if (!isLuaTable(base) && !(base instanceof LuaUserdata)) {
      throw new LuaRuntimeError('attempt to index a non-table value', currentLine);
    }
    return base.get(exp.member);
  }

  // -----------------------------------------------------------------------
  // FunctionCall: f(args)  or  f{table}  or  f"str"
  // -----------------------------------------------------------------------
  async function evalCall(exp, env) {
    const fn = await evalExp1(exp.base, env);
    if (!isCallable(fn)) {
      throw new LuaRuntimeError('attempt to call a non-function value', currentLine);
    }
    // Evaluate args: last argument may spread
    const args = [];
    for (let i = 0; i < exp.args.length; i++) {
      const arg = exp.args[i];
      const isLast = (i === exp.args.length - 1);
      if (isLast) {
        // Last argument: spread multi-values
        const avals = await evalExp(arg, env);
        if (Array.isArray(avals) && avals._multi) {
          args.push(...avals);
        } else {
          args.push(avals);
        }
      } else {
        args.push(await evalExp1(arg, env));
      }
    }
    return await callFunction(exp.line, fn, args);
  }

  // -----------------------------------------------------------------------
  // MethodCall: obj:method(args)  →  obj.method(obj, args)
  // -----------------------------------------------------------------------
  async function evalMethodCall(exp, env) {
    const base = await evalExp1(exp.base, env);
    let method;
    if (typeof base === 'string') {
      // Lua strings dispatch method calls to the string library:
      // s:m(...) → string.m(s, ...). args already starts with [base] below,
      // which supplies the string as the self/first argument.
      const strlib = globals.get('string');
      method = isLuaTable(strlib) ? strlib.get(exp.method) : null;
    } else if (isLuaTable(base) || base instanceof LuaUserdata) {
      method = base.get(exp.method);
    } else if (isSelectionVar(base)) {
      // Selectionvars are userdata whose metatable __index is the selection
      // method table (nhlsel.c l_selection_methods). We model that __index by
      // resolving `sel:m(...)` against the global `selection` table, so
      // pools:set() / pools:clone() / pools:grow(dir) dispatch to the wired
      // handlers with the selectionvar as the self/first argument.
      const seltbl = globals.get('selection');
      method = isLuaTable(seltbl) ? seltbl.get(exp.method) : null;
    } else {
      throw new LuaRuntimeError('attempt to call a method on a non-table value', currentLine);
    }
    if (!isCallable(method)) {
      throw new LuaRuntimeError(`attempt to call method '${exp.method}' (a non-function value)`, currentLine);
    }
    // Build args: self, then args from expression (last may spread)
    const args = [base];
    for (let i = 0; i < exp.args.length; i++) {
      const arg = exp.args[i];
      const isLast = (i === exp.args.length - 1);
      if (isLast) {
        const avals = await evalExp(arg, env);
        if (Array.isArray(avals) && avals._multi) {
          args.push(...avals);
        } else {
          args.push(avals);
        }
      } else {
        args.push(await evalExp1(arg, env));
      }
    }
    return await callFunction(exp.line, method, args);
  }

  // -----------------------------------------------------------------------
  // callFunction — invoke a LuaClosure or native function
  // Returns an array (possibly _multi) or single value
  // -----------------------------------------------------------------------
  async function callFunction(line, fn, args) {
    currentLine = line || currentLine;

    if (isLuaClosure(fn)) {
      // Create new environment for the call
      const callEnv = new Environment(fn.env);
      // Stop vararg lookup at every function frame, including non-vararg
      // functions whose lexical parent happens to be a vararg caller.
      callEnv._varargs = null;

      // Bind parameters
      for (let i = 0; i < fn.params.length; i++) {
        const pname = fn.params[i];
        if (i < args.length) {
          callEnv.define(pname, args[i]);
        } else {
          callEnv.define(pname, null);
        }
      }

      // Bind varargs if function is vararg
      if (fn.isVararg) {
        // Collect excess args as varargs
        const varargs = args.slice(fn.params.length);
        callEnv._varargs = varargs;
      }

      // Execute body
      let result = evalBlock(fn.body, callEnv);
      if (result && typeof result.then === 'function') result = await result;

      // Clean up varargs
      callEnv._varargs = null;

      if (result && result._control === 'return') {
        const vals = result.filter(v => v !== undefined);
        // Remove _control marker
        delete result._control;
        if (vals.length === 0) return null;
        if (vals.length === 1) return vals[0];
        vals._multi = true;
        return vals;
      }
      return null;
    }

    if (isNativeFn(fn) || typeof fn === 'function') {
      // Native function call — may be a plain sync JS function or an async
      // function whose body reaches into async JS (e.g. a real des.* handler
      // wired through to mklev.js). Await only when a thenable comes back so
      // synchronous natives don't pay a microtask tick.
      try {
        let result = fn(...args);
        if (result && typeof result.then === 'function') result = await result;
        // If the native returns an array, check if it's meant as multi-value
        if (Array.isArray(result) && result._multi) {
          return result;
        }
        return result ?? null;
      } catch (e) {
        if (e instanceof LuaRuntimeError) throw e;
        throw new LuaRuntimeError(e.message || String(e), currentLine);
      }
    }

    throw new LuaRuntimeError('attempt to call a non-function value', currentLine);
  }

  // -----------------------------------------------------------------------
  // Value equality (Lua semantics)
  // -----------------------------------------------------------------------
  function eqValue(a, b) {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b;
    // Tables/functions compare by reference
    return a === b;
  }

  // Public API
  //
  // `callFunction` is exported because C's Lua bindings call BACK into Lua from
  // inside a native binding: nhlsel.c:919-955 l_selection_iterate does
  // lua_pushvalue + nhl_pcall_handle once per selected point. Without a JS
  // equivalent of lua_pcall, js/lua/nh_state.js could only fake such a binding
  // with a pre-compiled trampoline AST re-run through `run()` per call, which
  // is neither the C shape nor usable for a per-point loop.
  return { defineGlobal, getGlobal, run, callFunction, setSelectionUnion, setSelectionIntersect, setSelectionSubtract,
    close() { globals.locals.clear(); } };
}
