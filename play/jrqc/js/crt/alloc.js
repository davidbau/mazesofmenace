// js/crt/alloc.js: malloc and friends in the object world (transpiler-design.md 3.7).
// Hand-written runtime.
//
// malloc(n) returns a RawBlock: n untyped bytes. C code then casts the void *
// to the type it allocated for; the generated cast materializes the block
// once, as that type, and every later cast of the same block returns the same
// value:
//   struct T *: a T (n == sizeof T), an array of T (n a multiple: the first
//               element, with __arr/__idx), or a T with a trailing byte area
//               __tail (n larger: struct engr and its text, decision D4).
//   scalar *:   a Ptr over a typed array view of the block's ArrayBuffer (char,
//               short, int ...); several views of one block share the bytes.
//   pointer * / 64-bit *: a Ptr over a plain array (n / 8 elements).
// free() is a no-op (GC); reading freed memory would need explicit modeling.
import { CTrap } from './int.js';
import { Ptr, recArray } from './mem.js';

export class RawBlock {
    constructor(n) { this.size = Number(n); this.ab = null; this.obj = null; this.views = null; }
    // Used directly as a long * (NetHack's alloc() returns long *, the caller casts it on):
    // the block becomes an array of 64-bit values on first access.
    get(i = 0) { return materialize(this, 'i64').get(i); }
    set(i, v) { return materialize(this, 'i64').set(i, v); }
    add(n) { return materialize(this, 'i64').add(n); }
}
export const malloc = (n) => new RawBlock(n);
export const calloc = (n, sz) => new RawBlock(Number(n) * Number(sz));
export function free(_p) { /* garbage collected */ }

/** realloc: byte/scalar buffers (Ptr over a typed array or plain array), record arrays (from their first element) and raw blocks. */
export function realloc(p, n) {
    n = Number(n);
    if (p === null) return new RawBlock(n);
    if (p instanceof RawBlock && p.obj === null && p.views === null) { const b = new RawBlock(n); return b; }
    if (p instanceof RawBlock) return realloc(p.obj !== null ? p.obj : p.views.values().next().value, n);   // as its typed contents
    if (p instanceof Ptr && p.off === 0) {
        const old = p.buf;
        if (ArrayBuffer.isView(old)) {
            const View = old.constructor;
            const b = new RawBlock(n);
            const v = asArr(b, View);
            v.buf.set(old.subarray(0, Math.min(old.length, v.buf.length)));
            return b;
        }
        if (Array.isArray(old)) {
            const b = new RawBlock(n);
            const v = asArr(b, old.$kind || 'ptr');
            for (let i = 0; i < Math.min(old.length, v.buf.length); i++) v.buf[i] = old[i];
            return b;
        }
    }
    // a block that became records (asRec): a new array of n bytes' worth of records, the old ones copied
    if (p !== null && typeof p === 'object' && p.constructor && p.constructor.$size !== undefined && (p.__arr === undefined || p.__idx === 0)) {
        const T = p.constructor, size = T.$size;
        const old = p.__arr !== undefined ? p.__arr : [p];
        const b = new RawBlock(n);
        if (n < size) return b;                         // too small for one record: bytes only
        const o = asRec(b, T, size);
        const a = o.__arr !== undefined ? o.__arr : [o];
        for (let i = 0; i < Math.min(old.length, a.length); i++) a[i].$copyFrom(old[i]);
        if (p.__tail && o.__tail) o.__tail.set(p.__tail.subarray(0, Math.min(p.__tail.length, o.__tail.length)));
        return b;
    }
    // realloc of a pointer into the middle of a block is undefined in C
    throw new CTrap('realloc of a block that is not a plain buffer');
}

/** (struct T *) p, with T's class and sizeof. Identity for anything but a fresh RawBlock. */
export function asRec(p, T, size) {
    if (!(p instanceof RawBlock)) return p;
    if (p.obj !== null) return p.obj;
    if (p.views !== null) throw new CTrap('block used as bytes, then as a record');
    let o;
    // always an array (of one, often): p + 1 is a valid C pointer past the record
    // a record with a trailing area (annotation types[].tail: struct engr and its text, D4) is
    // always one record and its bytes, even when the size happens to be a multiple
    if (T.$tail && p.size >= size) { o = new T(); o.__tail = new Int8Array(p.size - size); }
    else if (p.size >= size && p.size % size === 0) o = recArray(T, p.size / size)[0];
    else if (p.size > size && p.size - size < 8) o = new T();   // alloc() rounds sizes up to 8 (ForceAlignedLength): slack
    else if (p.size > size) { o = new T(); o.__tail = new Int8Array(p.size - size); }   // a record and extra bytes past it
    // a block smaller than the record: any access to the missing bytes is undefined in C
    else throw new CTrap(`block of ${p.size} bytes used as a record of ${size}`);
    p.obj = o;
    return o;
}

/** (E *) p for a scalar or pointer element type: View is a typed array class, 'ptr' or 'i64'. */
export function asArr(p, View) {
    if (!(p instanceof RawBlock)) return p;
    // (long *) malloc(n): alloc()'s own return type, not yet the caller's; stay untyped
    if (View === 'i64' && p.obj === null && p.views === null) return p;
    return materialize(p, View);
}
function materialize(p, View) {
    if (p.obj !== null) {
        if (p.obj instanceof Ptr) return p.obj;
        throw new CTrap('block used as a record, then as an array');
    }
    p.views = p.views || new Map();
    let v = p.views.get(View);
    if (v === undefined) {
        if (View === 'ptr' || View === 'i64') {
            const a = new Array(Math.floor(p.size / 8)).fill(View === 'ptr' ? null : 0);
            a.$kind = View;
            a.$block = p;   // allocated storage: may take another effective type (string.js memmove)
            v = new Ptr(a, 0);
            if (p.views.size) throw new CTrap('block used as pointers and as other data');
        } else {
            if (!p.ab) p.ab = new ArrayBuffer(p.size);
            v = new Ptr(new View(p.ab, 0, Math.floor(p.size / View.BYTES_PER_ELEMENT)), 0);
        }
        p.views.set(View, v);
    }
    return v;
}
