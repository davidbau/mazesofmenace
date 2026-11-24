// js/crt/mem.js: pointer representations of the object world
// (method/design.md 3.3). Hand-written runtime.

import { CTrap } from './int.js';

/**
 * Ptr: a pointer into an indexable buffer: `Int8Array` for `char *` (char is
 * signed), `Uint8Array` for `unsigned char *`, other
 * typed arrays for scalar elements, JS arrays for pointer or 64-bit elements
 * and for arrays of arrays. A value: arithmetic returns a new Ptr; `buf` is
 * shared, like the memory it points into. NULL is `null`, never a Ptr.
 * Address-taken scalar variables are one-element buffers, so `&x` is Ptr(x, 0).
 */
export class Ptr {
    constructor(buf, off = 0) { this.buf = buf; this.off = off; }
    add(n) { return new Ptr(this.buf, this.off + Number(n)); }
    get(i = 0) {
        const j = this.off + i;
        if (j < 0 || j >= this.buf.length) throw new CTrap(`read out of bounds (${j} of ${this.buf.length})`);
        return this.buf[j];
    }
    set(i, v) {
        const j = this.off + i;
        if (j < 0 || j >= this.buf.length) throw new CTrap(`write out of bounds (${j} of ${this.buf.length})`);
        this.buf[j] = v;
        return v;
    }
}
export { Ptr as BytePtr };   // char * is a Ptr over an Int8Array (or Uint8Array)

/**
 * A pointer cast between char * and unsigned char * (or other scalar element
 * types): a typed-array view of the same memory, so reads get the new type's
 * signedness. Equality with the original pointer is not preserved (rare).
 */
export function retype(p, View) {
    if (p === null || !(p instanceof Ptr) || !ArrayBuffer.isView(p.buf) || p.buf instanceof View) return p;
    const b = p.buf;
    const scale = b.BYTES_PER_ELEMENT / View.BYTES_PER_ELEMENT;
    return new Ptr(new View(b.buffer, b.byteOffset, b.byteLength / View.BYTES_PER_ELEMENT), p.off * scale);
}

/**
 * &obj.field for a scalar or pointer field. The field is an array of one (C11 6.5.6p7):
 * &f + 1 is its one-past-the-end pointer (d = 1), which compares but cannot be
 * dereferenced; any other offset is undefined in C and traps.
 */
export class FieldRef {
    // kind: the field's serializer kind (serial.js), so bytes read into it keep its type
    constructor(obj, key, kind = null, d = 0) { this.obj = obj; this.key = key; this.kind = kind; this.d = d; }
    add(n) {
        const d = this.d + Number(n);
        if (d === this.d) return this;
        if (d !== 0 && d !== 1) throw new CTrap(`arithmetic on the address of field ${this.key} beyond one past it`);
        return new FieldRef(this.obj, this.key, this.kind, d);
    }
    get(i = 0) { if (this.d + i !== 0) throw new CTrap(`index ${this.d + i} from field ${this.key}`); return this.obj[this.key]; }
    set(i, v) { if (this.d + i !== 0) throw new CTrap(`index ${this.d + i} from field ${this.key}`); this.obj[this.key] = v; return v; }
}

/**
 * Record pointers are the record objects. Records created as array elements
 * carry __arr and __idx (recArray), so pointer arithmetic works; a position
 * outside the array (one past the end, or before the start while iterating) is
 * an ElemPtr, which can be compared and moved but not dereferenced.
 */
const ELEM_OK = new Set(['__arr', '__idx', 'then', 'constructor', 'toJSON', '$const', '$stale']);
const ELEM_TRAP = {
    get(t, k) {
        if (typeof k === 'symbol' || ELEM_OK.has(k)) return t[k];
        throw new CTrap(`read of .${k} through a pointer outside its array (index ${t.__idx} of ${t.__arr.length})`);
    },
    set(t, k) { throw new CTrap(`write of .${k} through a pointer outside its array (index ${t.__idx} of ${t.__arr.length})`); },
};
export class ElemPtr {
    // a Proxy: dereferencing a position outside the array traps instead of reading undefined
    constructor(arr, idx) { this.__arr = arr; this.__idx = idx; return new Proxy(this, ELEM_TRAP); }
}
/**
 * A C enum as a frozen namespace object (readability plan P2c), built in C order: a name
 * alone is the previous entry's value + 1 (the first: 0), [name, value] gives the value,
 * and a function value is called with the members defined so far.
 * The signature gives editors the member names (TypeScript >= 5.0 infers them).
 * @template {string} const K
 * @param {ReadonlyArray<K | readonly [K, number | ((e: any) => number)]>} list
 * @returns {Readonly<Record<K, number>>}
 */
export function cenum(list) {
    const o = {};
    let v = -1;
    for (const x of list) {
        if (typeof x === 'string') o[x] = ++v;
        else o[x[0]] = v = typeof x[1] === 'function' ? x[1](o) : x[1];
    }
    return Object.freeze(o);
}
/**
 * Copy an initializer literal into a zeroed aggregate (generated tables: an array
 * literal mirroring the C initializer, readability plan P2c). An array literal sets
 * elements by index (undefined: left zero); a plain object sets the named fields,
 * recursing into record and array fields; a string fills a char array (the bytes the
 * C initializer copies); any other value is stored as is (the generated value already
 * carries C's conversion to the field type).
 */
export function init(target, v) {
    if (typeof v === 'string') { initString(target, v); return target; }
    if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
            const x = v[i];
            if (x === undefined) continue;
            if (isLit(x)) init(target[i], x);
            else target[i] = x;
        }
        return target;
    }
    for (const k of Object.keys(v)) {
        const x = v[k];
        if (isLit(x)) init(target[k], x);
        else target[k] = x;
    }
    return target;
}
const isLit = (x) => x !== null && typeof x === 'object' ? Array.isArray(x) || Object.getPrototypeOf(x) === Object.prototype : typeof x === 'string';
function initString(target, s) {
    if (!ArrayBuffer.isView(target)) throw new CTrap('string initializer for a non-char array');
    const n = Math.min(s.length, target.length);
    for (let i = 0; i < n; i++) target[i] = s.charCodeAt(i);
}
/** An array of n records of class T (zero-initialized), with back-references. */
export function recArray(T, n) {
    const a = new Array(n);
    for (let i = 0; i < n; i++) { const o = new T(); o.__arr = a; o.__idx = i; a[i] = o; }
    return a;
}
/**
 * Element i of a record array as a pointer value (&a[i]): the object, or an
 * ElemPtr outside it. Outside a row of a multidimensional array, the position
 * carries into the neighboring rows (contiguous C layout).
 */
export function relem(a, i) {
    if (i >= 0 && i < a.length) return a[i];
    const o = a.__outer;
    if (o !== undefined && a.length > 0) {
        const L = a.length, q = Math.floor(i / L), r = i - q * L;
        const row = rowAt(o, a.__oidx + q);
        if (row !== null) return row[r];
    }
    return elemAt(a, i);
}
// One ElemPtr per (array, index): a position outside an array is one object, like the
// elements inside it, so record pointers are equal exactly when they are the same object
// (peq agrees with ===; the emitter writes === where a side is a record pointer).
const ELEMS = new WeakMap();
function elemAt(a, i) {
    let m = ELEMS.get(a);
    if (m === undefined) { m = new Map(); ELEMS.set(a, m); }
    let p = m.get(i);
    if (p === undefined) { p = new ElemPtr(a, i); m.set(i, p); }
    return p;
}
/** Row k of array-of-arrays o, carrying into o's own neighbors; null outside the whole object. */
function rowAt(o, k) {
    if (k >= 0 && k < o.length) return o[k];
    const up = o.__outer;
    if (up === undefined || o.length === 0) return null;
    const L = o.length, q = Math.floor(k / L);
    const parent = rowAt(up, o.__oidx + q);
    return parent === null ? null : parent[k - q * L];
}
/** The position of a record array element in its outermost array, in elements (for differences and ordering). */
function flatPos(p) {
    let a = p.__arr, i = p.__idx;
    while (a.__outer !== undefined) { i += a.__oidx * a.length; a = a.__outer; }
    return [a, i];
}
/**
 * (char *) (p + 1) for a record with a trailing area (annotation types[].tail): its bytes.
 * Without one it is the record's one-past-the-end byte pointer: an empty buffer (the same
 * one for each record, so it compares equal to itself), which traps when dereferenced.
 */
const PAST = new WeakMap();
export function recTail(p) {
    if (p.__tail) return new Ptr(p.__tail, 0);
    let b = PAST.get(p);
    if (b === undefined) { b = new Int8Array(0); PAST.set(p, b); }
    return new Ptr(b, 0);
}
// A record that is not an array element behaves as an array of one (C11 6.5.6p7): p + 1
// is its one-past-the-end pointer, which compares (unequal to every object) but cannot
// be dereferenced (mhitu.c hitmsg: mattk == gh.hitmsg_prev + 1, where getmattk() may
// return a pointer to one local struct attack).
const SOLO = new WeakMap();
function soloOf(p) { let s = SOLO.get(p); if (s === undefined) { s = [p]; SOLO.set(p, s); } return s; }
/** p + n for a record pointer. */
export function radd(p, n) {
    if (n === 0) return p;
    const a = p.__arr;
    if (a === undefined) {
        if (Number(n) !== 1) throw new CTrap('arithmetic on a pointer to a record that is not an array element');
        return elemAt(soloOf(p), 1);
    }
    return relem(a, p.__idx + Number(n));
}
/** p - q for record pointers into the same array (element count). */
export function rdiff(p, q) {
    // a lone record against its one-past pointer (soloOf)
    if (p.__arr === undefined && q.__arr !== undefined && SOLO.get(p) === q.__arr) return -q.__idx;
    if (q.__arr === undefined && p.__arr !== undefined && SOLO.get(q) === p.__arr) return p.__idx;
    if (p.__arr === undefined || q.__arr === undefined || p.__arr !== q.__arr) {
        if (p === q) return 0;
        if (p.__arr !== undefined && q.__arr !== undefined) {
            const [a, i] = flatPos(p), [b, j] = flatPos(q);
            if (a === b) return i - j;
        }
        throw new CTrap('difference of pointers to different arrays');
    }
    return p.__idx - q.__idx;
}
/** p - q for Ptr values (element count). */
export function pdiff(p, q) {
    if (p instanceof FieldRef && q instanceof FieldRef && p.obj === q.obj && p.key === q.key) return p.d - q.d;
    if (p.buf === q.buf) return p.off - q.off;
    // views of one object (rows of a contiguous matrix, retype() views of a block): byte distance
    const a = p.buf, b = q.buf;
    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b) && a.buffer === b.buffer) {
        const bytes = (a.byteOffset + p.off * a.BYTES_PER_ELEMENT) - (b.byteOffset + q.off * b.BYTES_PER_ELEMENT);
        return bytes / a.BYTES_PER_ELEMENT;
    }
    // rows of an array of arrays (arrayOf): positions in the outermost array
    if (Array.isArray(a) && Array.isArray(b) && a.__outer !== undefined && a.__outer === b.__outer && a.length === b.length)
        return (a.__oidx - b.__oidx) * a.length + p.off - q.off;
    throw new CTrap('difference of pointers to different buffers');
}
/**
 * Pointer equality for data pointers of any kind (== in C). null equals only null.
 * Element positions compare by (array, index); a position has one object (relem, elemAt),
 * so for record pointers this is ===.
 */
export function peq(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    // a pointer read back from a save file (serial.js STALE) holds an address of the
    // process that saved: unequal to every live object (save.c savemonchn compares
    // each monster with the restored u.ustuck before the restore resolves it by m_id)
    if (a.$stale === true || b.$stale === true) return false;
    if (a instanceof Ptr) return b instanceof Ptr && a.buf === b.buf && a.off === b.off;
    if (a instanceof FieldRef) return b instanceof FieldRef && a.obj === b.obj && a.key === b.key && a.d === b.d;
    if (a.__arr !== undefined) return a.__arr === b.__arr && a.__idx === b.__idx;
    return false;
}
// Unrelated objects are ordered by a stable ordinal (first seen in a comparison). C orders
// them by address, which the port does not model; a consistent total order still gives C's
// answer to every range test (p >= buf && p < buf + n is false for a p in another object),
// the only use NetHack makes of it (end.c done_in_by: multi_reason inside multireasonbuf).
const ORD = new WeakMap();
let nextOrd = 1;
function ordinal(o) {
    let n = ORD.get(o);
    if (n === undefined) { n = nextOrd++; ORD.set(o, n); }
    return n;
}
const baseOf = (p) => (p instanceof Ptr ? p.buf : p instanceof FieldRef ? p.obj : p.__arr !== undefined ? flatPos(p)[0] : p);
/** Ordering of data pointers (<, <=, >, >= in C): -1, 0, 1. */
export function pcmp(a, b) {
    let x, y;
    if (a instanceof Ptr && b instanceof Ptr && a.buf === b.buf) { x = a.off; y = b.off; }
    else if (a && b && a.__arr !== undefined && a.__arr === b.__arr) { x = a.__idx; y = b.__idx; }
    else if (peq(a, b)) return 0;
    else if (a && b && a.__arr !== undefined && b.__arr !== undefined && flatPos(a)[0] === flatPos(b)[0]) { x = flatPos(a)[1]; y = flatPos(b)[1]; }
    else if (a instanceof Ptr && b instanceof Ptr && ArrayBuffer.isView(a.buf) && ArrayBuffer.isView(b.buf) && a.buf.buffer === b.buf.buffer) {
        // views of one buffer (rows of a contiguous matrix): byte addresses
        x = a.buf.byteOffset + a.off * a.buf.BYTES_PER_ELEMENT; y = b.buf.byteOffset + b.off * b.buf.BYTES_PER_ELEMENT;
    } else if (a && b && typeof a === 'object' && typeof b === 'object' && a.$const === undefined && b.$const === undefined) {
        x = ordinal(baseOf(a)); y = ordinal(baseOf(b));
    } else throw new CTrap('ordering of a pointer made from an integer');
    return x < y ? -1 : x > y ? 1 : 0;
}

const LITS = new Map();
/**
 * A string literal: one shared NUL-terminated Int8Array per distinct text,
 * like ld64's cstring merging. `s` holds one char per byte (\xNN escapes).
 * Literals are read-only in C; writing to one is a C bug.
 */
export function lit(s) {
    let p = LITS.get(s);
    if (p === undefined) {
        const b = new Int8Array(s.length + 1);   // char[]: char is signed
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        p = new Ptr(b, 0);
        LITS.set(s, p);
    }
    return p;
}

/**
 * A string literal as a tagged template: $C`text` is lit(text), the same shared array (so
 * the same pointer) for the same text. The emitter writes only escapes whose cooked value is
 * one char per byte (transpiler/emit/tu.mjs jsTemplate).
 */
export function $C(strs) { return lit(strs[0]); }

/** Bytes available from p to the end of its buffer (clang's __builtin_object_size, mode 0, when known). */
export const bytesLeft = (p) => p.buf.length - p.off;

const enc = new TextEncoder();
/** A fresh NUL-terminated byte string (Latin-1 / ASCII text); tests and diagnostics. */
export function cstrLiteral(s) {
    const b = new Uint8Array(s.length + 1);
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c > 0xff) throw new Error(`cstrLiteral: non-byte character in ${JSON.stringify(s)}`);
        b[i] = c;
    }
    return new Ptr(b, 0);
}
export const utf8 = (s) => enc.encode(s);

/** strlen with C semantics (throws instead of reading past the buffer). */
export function cstrlen(p) {
    const { buf, off } = p;
    let i = off;
    while (i < buf.length && buf[i] !== 0) i++;
    if (i >= buf.length) throw new CTrap('strlen: no NUL terminator before the end of the buffer');
    return i - off;
}

/** The bytes of a NUL-terminated string, as a JS string with one char per byte (for diagnostics and tests). */
export function cstrToJs(p) {
    const n = cstrlen(p);
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(p.buf[p.off + i] & 0xff);
    return s;
}

// ---------- helpers for generated code ----------
/** n zeros: arrays of 64-bit integers (Number|BigInt elements). */
export const zeros = (n) => { const a = new Array(n).fill(0); a.$kind = 'i64'; return a; };
/** n NULL pointers. */
export const nulls = (n) => { const a = new Array(n).fill(null); a.$kind = 'ptr'; return a; };
/** An array of n sub-arrays (multi-dimensional C arrays). */
/**
 * An array of n arrays (T a[n][m]...). Each inner plain array records its place
 * (__outer, __oidx): C lays the rows out contiguously, so record pointer
 * arithmetic may run from one row into the next (mkmaze.c get_level_extends:
 * lev += ROWNO walks levl[x][y] -> levl[x+1][y]).
 */
export function arrayOf(n, make) {
    const a = new Array(n);
    for (let i = 0; i < n; i++) {
        const r = make();
        if (Array.isArray(r)) { r.__outer = a; r.__oidx = i; }
        a[i] = r;
    }
    return a;
}
/**
 * T a[d0][d1]... for a scalar T with typed-array class View: nested arrays whose
 * innermost rows are views of one flat typed array, so the rows are contiguous
 * as in C (byte functions may cross from one row into the next).
 */
export function matrix(View, dims) {
    const flat = new View(dims.reduce((a, b) => a * b, 1));
    const build = (d, off) => {
        if (d === dims.length - 1) return flat.subarray(off, off + dims[d]);
        const step = dims.slice(d + 1).reduce((a, b) => a * b, 1);
        const a = new Array(dims[d]);
        for (let i = 0; i < dims[d]; i++) { const r = build(d + 1, off + i * step); if (Array.isArray(r)) { r.__outer = a; r.__oidx = i; } a[i] = r; }
        return a;
    };
    return build(0, 0);
}
/** A 64-bit integer used as an index or pointer offset: a safe Number. */
export function idx(x) {
    if (typeof x === 'number') return x;
    throw new CTrap(`index ${x} out of range`);
}
const CONSTS = new Map();
/**
 * An integer converted to a pointer: (T *) 0 is NULL; any other value is an
 * interned, non-dereferenceable pointer value (design 3.3), equal only to
 * itself, so sentinels like (struct bill_x *) -1000 compare as in C.
 */
export function ptrConst(n) {
    if (n == 0) return null;
    const k = String(n);
    // an integer made from a pointer (ptrToInt) converts back to that pointer
    // ((T *) (intptr_t) p == p in clang's flat address model)
    const back = BACK.get(k);
    if (back !== undefined) return back;
    return ptrConstStale(n);
}
/** An address read from a save file: a non-dereferenceable value even if it names a live object (freed in C). */
export function ptrConstStale(n) {
    if (n == 0) return null;
    const k = String(n);
    let p = CONSTS.get(k);
    if (p === undefined) { p = Object.freeze({ $const: k }); CONSTS.set(k, p); }
    return p;
}
/** A pointer converted to an integer: 0 for NULL, the value for ptrConst, else a handle number. */
// Pointers that compare equal (peq) get the same handle: a Ptr by (buffer, offset), a
// FieldRef by (object, field), an array element by (array, index), anything else by identity.
let nextHandle = 2 ** 40;
const HANDLES = new WeakMap();      // object -> handle
const AT = new WeakMap();           // buffer / object / array -> Map(position -> handle)
const BACK = new Map();             // String(handle) -> the pointer it was made from
function handleAt(base, pos, p) {
    let m = AT.get(base);
    if (m === undefined) AT.set(base, (m = new Map()));
    let h = m.get(pos);
    if (h === undefined) { h = nextHandle; nextHandle += 16; m.set(pos, h); BACK.set(String(h), p); }
    return h;
}
/**
 * A new C process (one segment): integers made from pointers by an earlier process (in a
 * save or bones file) no longer convert back to the objects (stale addresses in C). Handle
 * numbers keep increasing, so an old one never names a new object.
 */
export function resetHandles() { BACK.clear(); }
export function ptrToInt(p) {
    if (p === null || p === undefined) return 0;
    if (p.$const !== undefined) return Number(p.$const);
    if (p instanceof Ptr) return handleAt(p.buf, p.off, p);
    if (p instanceof FieldRef) return handleAt(p.obj, `${p.key}#${p.d}`, p);
    if (typeof p === 'object' && p.__arr !== undefined) return handleAt(p.__arr, p.__idx, p);
    let h = HANDLES.get(p);
    if (h === undefined) { h = nextHandle; nextHandle += 16; HANDLES.set(p, h); BACK.set(String(h), p); }
    return h;
}
export function unreachable() { throw new CTrap('__builtin_unreachable reached'); }
export function missing(name) { return () => { throw new CTrap(`call of ${name}, which is not defined in the transpiled program`); }; }
