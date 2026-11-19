// js/crt/mem.js: pointer representations of the object world
// (transpiler-design.md 3.3). Hand-written runtime.

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

/** &obj.field for a scalar or pointer field: deref only (arithmetic beyond +0 traps). */
export class FieldRef {
    // kind: the field's serializer kind (serial.js), so bytes read into it keep its type
    constructor(obj, key, kind = null) { this.obj = obj; this.key = key; this.kind = kind; }
    add(n) { if (Number(n) !== 0) throw new CTrap(`arithmetic on the address of field ${this.key}`); return this; }
    get(i = 0) { if (i !== 0) throw new CTrap(`index ${i} from field ${this.key}`); return this.obj[this.key]; }
    set(i, v) { if (i !== 0) throw new CTrap(`index ${i} from field ${this.key}`); this.obj[this.key] = v; return v; }
}

/**
 * Record pointers are the record objects. Records created as array elements
 * carry __arr and __idx (recArray), so pointer arithmetic works; a position
 * outside the array (one past the end, or before the start while iterating) is
 * an ElemPtr, which can be compared and moved but not dereferenced.
 */
const ELEM_OK = new Set(['__arr', '__idx', 'then', 'constructor', 'toJSON', '$const']);
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
    return new ElemPtr(a, i);
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
/** (char *) (p + 1) for a record with a trailing area (annotation types[].tail): its bytes. */
export function recTail(p) {
    if (!p.__tail) throw new CTrap('(char *) (p + 1): the record has no trailing area');
    return new Ptr(p.__tail, 0);
}
/** p + n for a record pointer. */
export function radd(p, n) {
    if (n === 0) return p;
    const a = p.__arr;
    if (a === undefined) throw new CTrap('arithmetic on a pointer to a record that is not an array element');
    return relem(a, p.__idx + Number(n));
}
/** p - q for record pointers into the same array (element count). */
export function rdiff(p, q) {
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
    if (p.buf !== q.buf) throw new CTrap('difference of pointers to different buffers');
    return p.off - q.off;
}
/**
 * Pointer equality for data pointers of any kind (== in C). null equals only null.
 * Element positions compare by (array, index), so a freshly made ElemPtr equals the
 * object at the same place.
 */
export function peq(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a instanceof Ptr) return b instanceof Ptr && a.buf === b.buf && a.off === b.off;
    if (a instanceof FieldRef) return b instanceof FieldRef && a.obj === b.obj && a.key === b.key;
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
function handleAt(base, pos) {
    let m = AT.get(base);
    if (m === undefined) AT.set(base, (m = new Map()));
    let h = m.get(pos);
    if (h === undefined) { h = nextHandle; nextHandle += 16; m.set(pos, h); }
    return h;
}
export function ptrToInt(p) {
    if (p === null || p === undefined) return 0;
    if (p.$const !== undefined) return Number(p.$const);
    if (p instanceof Ptr) return handleAt(p.buf, p.off);
    if (p instanceof FieldRef) return handleAt(p.obj, p.key);
    if (typeof p === 'object' && p.__arr !== undefined) return handleAt(p.__arr, p.__idx);
    let h = HANDLES.get(p);
    if (h === undefined) { h = nextHandle; nextHandle += 16; HANDLES.set(p, h); }
    return h;
}
export function unreachable() { throw new CTrap('__builtin_unreachable reached'); }
export function missing(name) { return () => { throw new CTrap(`call of ${name}, which is not defined in the transpiled program`); }; }
