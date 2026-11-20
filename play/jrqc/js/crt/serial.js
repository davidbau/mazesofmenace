// js/crt/serial.js: object-world values as save-file bytes (method/design.md 3.6).
// Hand-written runtime.
//
// NetHack writes whole structs with bwrite (sfstruct.c historical_sfo_*) and
// reads them back with mread. The save file is only read by this port, so a
// value is written in its C layout (sizeof bytes, fields at their offsets, from
// the generated static $fields() tables of the record classes), except that a
// pointer is written as a 0/1 flag: restore code tests the stale pointers it
// reads back (if (mtmp->minvent) ...), and a non-null one comes back as STALE,
// which traps when used. A union is read back as raw bytes; each member getter
// decodes them on first use (C's reinterpretation of the stored bytes).
//
// Field kinds ($fields entries [js, offset, kind]):
//   'i8' 'u8' 'i16' 'u16' 'i32' 'u32' 'i64' 'u64' 'f32' 'f64'   scalars
//   'ptr'                                   data or function pointer (8 bytes)
//   { rec: Class }                          embedded record
//   { arr: kind, n, es }                    array of n elements of es bytes
//   { bits, unit, bo, signed }              bit-field in a unit of `unit` bytes at bit offset bo
//   { raw: n }                              bytes the port does not model (written as zeros)
import { Ptr, FieldRef, ptrToInt, ptrConst } from './mem.js';
import { RawBlock, asArr } from './alloc.js';
import { CTrap, i64, u64 } from './int.js';
import { cellBytes } from './ucell.js';

/** A non-null pointer read back from a save file: truthy, traps when dereferenced. */
export const STALE = new Proxy(Object.freeze({ $stale: true }), {
    get(t, k) {
        if (typeof k === 'symbol' || k === 'then' || k === '$stale' || k === 'toJSON') return t[k];
        throw new CTrap(`use of a stale pointer read from a save file (.${String(k)})`);
    },
});

const fieldsOf = (C) => (C.$fieldTable || (C.$fieldTable = C.$fields()));

// Pointers in bytes. In a save file (serialize/deserialize) a pointer is a 0/1 flag and
// comes back STALE. In a memory image (memImage/memStore: memcpy, memset, memcmp of data
// the object model holds as values) it is its handle (mem.js ptrToInt), which converts
// back to the same pointer (ptrConst), so bytes copied through memory keep pointers.
let MEMORY = false;
const STALE_BITS = 8n;   // a STALE pointer in a memory image (a handle is never 8)
function ptrBits(v) {
    if (v === null || v === undefined || v === 0) return 0n;
    if (!MEMORY) return 1n;
    if (v === STALE) return STALE_BITS;
    return BigInt.asUintN(64, BigInt(ptrToInt(v)));
}
function ptrOf(b) {
    if (b === 0n) return null;
    if (!MEMORY) return STALE;
    if (b === STALE_BITS) return STALE;
    return ptrConst(b <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(b) : b);
}
const SZ = { i8: 1, u8: 1, i16: 2, u16: 2, i32: 4, u32: 4, i64: 8, u64: 8, f32: 4, f64: 8, ptr: 8 };

// ---------- write ----------
function wScalar(dv, off, k, v) {
    switch (k) {
    case 'i8': case 'u8': dv.setUint8(off, Number(v) & 0xff); return;
    case 'i16': case 'u16': dv.setUint16(off, Number(v) & 0xffff, true); return;
    case 'i32': case 'u32': dv.setUint32(off, Number(v) >>> 0, true); return;
    case 'i64': case 'u64': dv.setBigUint64(off, BigInt.asUintN(64, BigInt(v)), true); return;
    case 'f32': dv.setFloat32(off, v, true); return;
    case 'f64': dv.setFloat64(off, v, true); return;
    case 'ptr': dv.setBigUint64(off, ptrBits(v), true); return;
    default: throw new CTrap(`serialize: kind ${k}`);
    }
}
function wKind(dv, off, k, v) {
    if (typeof k === 'string') return wScalar(dv, off, k, v);
    if (k.rec) return wRec(dv, off, v);
    if (k.arr) { for (let i = 0; i < k.n; i++) wKind(dv, off + i * k.es, k.arr, v[i]); return; }
    if (k.raw) return;
    throw new CTrap('serialize: bit-field outside a record');
}
function wRec(dv, off, o) {
    const C = o.constructor;
    if (!C.$fields) throw new CTrap('serialize: not a record');
    if (C.$cell) { new Uint8Array(dv.buffer, dv.byteOffset + off, C.$size).set(cellBytes(o)); return; }   // a union cell: its bytes (ucell.js)
    const F = fieldsOf(C);
    if (C.$union) {
        if (o.$k === '$raw') { new Uint8Array(dv.buffer, dv.byteOffset + off, C.$size).set(o.$v.subarray(0, C.$size)); return; }
        const f = F.find((x) => x[0] === o.$k);
        if (f) wKind(dv, off + f[1], f[2], o.$v);
        return;
    }
    for (const [js, fo, k] of F) {
        if (k.bits) {
            const at = off + fo;
            let unit = k.unit === 1 ? dv.getUint8(at) : k.unit === 2 ? dv.getUint16(at, true) : dv.getUint32(at, true);
            const mask = k.bits >= 32 ? 0xffffffff : 2 ** k.bits - 1;
            unit = ((unit & ~(mask * 2 ** k.bo)) >>> 0) + ((Number(o[js]) & mask) >>> 0) * 2 ** k.bo;
            if (k.unit === 1) dv.setUint8(at, unit); else if (k.unit === 2) dv.setUint16(at, unit, true); else dv.setUint32(at, unit >>> 0, true);
        } else wKind(dv, off + fo, k, o[js]);
    }
}

// ---------- read ----------
function rScalar(dv, off, k) {
    switch (k) {
    case 'i8': return dv.getInt8(off);
    case 'u8': return dv.getUint8(off);
    case 'i16': return dv.getInt16(off, true);
    case 'u16': return dv.getUint16(off, true);
    case 'i32': return dv.getInt32(off, true);
    case 'u32': return dv.getUint32(off, true);
    case 'i64': return i64(dv.getBigInt64(off, true));
    case 'u64': return u64(dv.getBigUint64(off, true));
    case 'f32': return dv.getFloat32(off, true);
    case 'f64': return dv.getFloat64(off, true);
    case 'ptr': return ptrOf(dv.getBigUint64(off, true));
    default: throw new CTrap(`deserialize: kind ${k}`);
    }
}
/** The value of kind k at off; aggregates are filled in place (cur) and returned. */
function rKind(dv, off, k, cur) {
    if (typeof k === 'string') return rScalar(dv, off, k);
    if (k.rec) { rRec(dv, off, cur); return cur; }
    if (k.arr) {
        if (ArrayBuffer.isView(cur)) { for (let i = 0; i < k.n; i++) cur[i] = rScalar(dv, off + i * k.es, k.arr); return cur; }
        for (let i = 0; i < k.n; i++) {
            const v = rKind(dv, off + i * k.es, k.arr, cur[i]);
            if (typeof k.arr === 'string') cur[i] = v;
        }
        return cur;
    }
    if (k.raw) return cur;
    throw new CTrap('deserialize: bit-field outside a record');
}
function rRec(dv, off, o) {
    const C = o.constructor;
    if (!C.$fields) throw new CTrap('deserialize: not a record');
    if (C.$cell) { cellBytes(o).set(new Uint8Array(dv.buffer, dv.byteOffset + off, C.$size)); o.$p = new Map(); o.$fromSave = !MEMORY; return; }   // pointers come back as ptrConst values
    if (C.$union) {
        o.$v = new Uint8Array(dv.buffer, dv.byteOffset + off, C.$size).slice();
        o.$k = '$raw';
        o.$rawMem = MEMORY;   // how its pointer bytes decode (unraw)
        return;
    }
    for (const [js, fo, k] of fieldsOf(C)) {
        if (k.bits) {
            const at = off + fo;
            const unit = k.unit === 1 ? dv.getUint8(at) : k.unit === 2 ? dv.getUint16(at, true) : dv.getUint32(at, true);
            const w = k.bits;
            let v = Math.floor(unit / 2 ** k.bo) % 2 ** w;
            if (k.signed && v >= 2 ** (w - 1)) v -= 2 ** w;
            o[js] = v;
        } else if (typeof k === 'string') o[js] = rScalar(dv, off + fo, k);
        else rKind(dv, off + fo, k, o[js]);
    }
}
/** A union member read from raw bytes (generated union getters call this while $k is '$raw'). */
export function unraw(u, js) {
    const C = u.constructor;
    const f = fieldsOf(C).find((x) => x[0] === js);
    const raw = u.$v;
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const k = f[2];
    const was = MEMORY;
    MEMORY = u.$rawMem === true;
    try {
        if (typeof k === 'string') return rScalar(dv, f[1], k);
        // an aggregate member: decode into a fresh value, which then becomes the stored member
        var v = k.rec ? new k.rec() : k.arr ? freshArr(k) : null;
        rKind(dv, f[1], k, v);
    } finally { MEMORY = was; }
    u.$v = v; u.$k = js;
    return v;
}
function freshArr(k) {
    if (typeof k.arr === 'string' && k.arr !== 'ptr' && k.arr !== 'i64' && k.arr !== 'u64') {
        const T = { i8: Int8Array, u8: Uint8Array, i16: Int16Array, u16: Uint16Array, i32: Int32Array, u32: Uint32Array, f32: Float32Array, f64: Float64Array }[k.arr];
        return new T(k.n);
    }
    return Array.from({ length: k.n }, () => (typeof k.arr === 'string' ? 0 : k.arr.rec ? new k.arr.rec() : freshArr(k.arr)));
}

// ---------- whole buffers (bwrite / mread through write, read, fwrite, fread) ----------
// A region is { size, write(dv), read(dv) } over a DataView of `size` bytes: the C object
// representation of `size` bytes at a pointer. Regions concatenate (runs of array
// elements) and truncate (the first n bytes of an element: write the whole element and
// keep n bytes; read by writing the whole, overlaying n bytes, reading it back), so any
// byte range inside one C object has an image.
const isRecObj = (v) => v !== null && typeof v === 'object' && typeof v.constructor === 'function' && v.constructor.$fields !== undefined;
const TYPED_KIND = (b) => (b instanceof Int8Array ? 'i8' : b instanceof Uint8Array ? 'u8' : null);
function bytesRegion(b, off, n) {   // a typed array view: its bytes in place
    const bpe = b.BYTES_PER_ELEMENT, start = b.byteOffset + off * bpe;
    if (off < 0 || off * bpe + n > b.buffer.byteLength - b.byteOffset) throw new CTrap(`memory access out of bounds (${off * bpe}+${n} of ${b.buffer.byteLength - b.byteOffset} bytes)`);
    const view = () => new Uint8Array(b.buffer, start, n);
    return { size: n, write: (dv) => new Uint8Array(dv.buffer, dv.byteOffset, n).set(view()), read: (dv) => view().set(new Uint8Array(dv.buffer, dv.byteOffset, n)) };
}
function truncate(r, n) {
    if (n === r.size) return r;
    if (n > r.size) throw new CTrap(`serialize: ${n} bytes of a ${r.size}-byte object`);
    return {
        size: n,
        write: (dv) => { const t = new Uint8Array(r.size); r.write(new DataView(t.buffer)); new Uint8Array(dv.buffer, dv.byteOffset, n).set(t.subarray(0, n)); },
        read: (dv) => { const t = new Uint8Array(r.size); const tv = new DataView(t.buffer); r.write(tv); t.set(new Uint8Array(dv.buffer, dv.byteOffset, n)); r.read(tv); },
    };
}
function concat(parts, n) {   // the first n bytes of consecutive parts (a lazy list: parts(i) or null)
    const list = [];
    let left = n;
    for (let i = 0; left > 0; i++) {
        const r = parts(i);
        if (r === null) throw new CTrap('serialize: past the end of the array');
        const t = truncate(r, Math.min(r.size, left));
        list.push(t); left -= t.size;
    }
    let at = 0;
    const offs = list.map((r) => { const o = at; at += r.size; return o; });
    const sub = (dv, o, m) => new DataView(dv.buffer, dv.byteOffset + o, m);
    return {
        size: n,
        write: (dv) => list.forEach((r, i) => r.write(sub(dv, offs[i], r.size))),
        read: (dv) => list.forEach((r, i) => r.read(sub(dv, offs[i], r.size))),
    };
}
/** The whole of aggregate v (a record, a typed array, an array of arrays or records) as a region. */
function aggRegion(v) {
    if (ArrayBuffer.isView(v)) return bytesRegion(v, 0, v.byteLength);
    if (isRecObj(v)) {
        const size = v.constructor.$size;
        const rec = { size, write: (dv) => wRec(dv, 0, v), read: (dv) => rRec(dv, 0, v) };
        if (!v.__tail) return rec;
        const tail = bytesRegion(v.__tail, 0, v.__tail.length);
        return concat((i) => (i === 0 ? rec : i === 1 ? tail : null), size + v.__tail.length);
    }
    if (Array.isArray(v)) return arrayRegion(v, 0, sizeOfAgg(v));
    throw new CTrap('serialize: not an aggregate');
}
function sizeOfAgg(v) {
    if (ArrayBuffer.isView(v)) return v.byteLength;
    if (isRecObj(v)) return v.constructor.$size + (v.__tail ? v.__tail.length : 0);
    if (Array.isArray(v)) { const k = elemKind(v); return k === 'agg' ? v.reduce((a, x) => a + sizeOfAgg(x), 0) : 8 * v.length; }
    throw new CTrap('sizeof of an unknown value');
}
/** What the elements of plain array a are: 'agg' (records, rows), 'ptr' or 'i64'. */
function elemKind(a) {
    if (a.$kind === 'ptr' || a.$kind === 'i64' || a.$kind === 'u64') return a.$kind === 'ptr' ? 'ptr' : a.$kind;
    for (const v of a) {
        if (v === null || v === undefined || v === STALE) continue;
        if (typeof v === 'number' || typeof v === 'bigint') return 'i64';
        if (ArrayBuffer.isView(v) || Array.isArray(v)) return 'agg';
        if (isRecObj(v) && v.__arr === a) return 'agg';   // an element of this record array (recArray), not a pointer to a record
        return 'ptr';
    }
    return 'ptr';
}
/** n bytes of plain array a from element i0. */
function arrayRegion(a, i0, n) {
    const k = elemKind(a);
    if (k === 'agg') return concat((i) => (i0 + i < a.length ? aggRegion(a[i0 + i]) : null), n);
    return concat((i) => {
        const j = i0 + i;
        if (j >= a.length) return null;
        return { size: 8, write: (dv) => wScalar(dv, 0, k, a[j]), read: (dv) => { a[j] = rScalar(dv, 0, k); } };
    }, n);
}
/** The n bytes at pointer p. */
function region(p, n) {
    if (p instanceof FieldRef) {
        const cur = p.get(0);
        const k = p.kind || (typeof cur === 'number' || typeof cur === 'bigint' ? ({ 1: 'i8', 2: 'i16', 4: 'i32', 8: 'i64' })[n] || 'i64' : 'ptr');
        if (typeof k !== 'string') {   // an aggregate field (record or array kind): the value itself
            return truncate(aggRegion(cur), n);
        }
        return truncate({ size: SZ[k], write: (dv) => wScalar(dv, 0, k, p.get(0)), read: (dv) => p.set(0, rScalar(dv, 0, k)) }, n);
    }
    if (p instanceof Ptr && ArrayBuffer.isView(p.buf)) return bytesRegion(p.buf, p.off, n);
    if (p instanceof Ptr && Array.isArray(p.buf)) return arrayRegion(p.buf, p.off, n);
    if (isRecObj(p)) {
        if (p.__arr !== undefined && n > p.constructor.$size) return arrayRegion(p.__arr, p.__idx, n);
        return truncate(aggRegion(p), n);
    }
    if (p instanceof RawBlock) {   // malloc'd bytes: as what they became, else as bytes
        if (p.obj !== null) return region(p.obj, n);
        const typed = p.views === null ? undefined : [...p.views.values()].find((v) => ArrayBuffer.isView(v.buf));
        if (typed === undefined && p.views !== null && p.views.size) return region(p.views.values().next().value, n);
        return region(typed || asArr(p, Uint8Array), n);
    }
    throw new CTrap('serialize: a buffer that is not bytes, a scalar, a record or an array');
}
/** The save-file bytes of the n bytes at p (a record, scalar field or scalar array). */
export function serialize(p, n) {
    const b = new Uint8Array(n);
    region(p, n).write(new DataView(b.buffer));
    return b;
}
/** Store save-file bytes b (length n) into the object at p. */
export function deserialize(p, b) {
    const c = b.slice();
    region(p, c.length).read(new DataView(c.buffer));
}
/** The C object representation of the n bytes at p, pointers as handles (memcpy, memcmp). */
export function memImage(p, n) {
    const r = region(p, n), b = new Uint8Array(n);
    MEMORY = true;
    try { r.write(new DataView(b.buffer)); } finally { MEMORY = false; }
    return b;
}
/** Store a memory image b into the n = b.length bytes at p. */
export function memStore(p, b) {
    const r = region(p, b.length), c = b.slice();
    MEMORY = true;
    try { r.read(new DataView(c.buffer)); } finally { MEMORY = false; }
}
