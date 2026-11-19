// js/crt/serial.js: object-world values as save-file bytes (transpiler-design.md 3.6).
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
import { Ptr, FieldRef } from './mem.js';
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
    case 'ptr': dv.setBigUint64(off, v === null || v === undefined || v === 0 ? 0n : 1n, true); return;
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
    case 'ptr': return dv.getBigUint64(off, true) === 0n ? null : STALE;
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
    if (C.$cell) { cellBytes(o).set(new Uint8Array(dv.buffer, dv.byteOffset + off, C.$size)); o.$p = new Map(); return; }   // pointers come back as ptrConst values
    if (C.$union) {
        o.$v = new Uint8Array(dv.buffer, dv.byteOffset + off, C.$size).slice();
        o.$k = '$raw';
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
    if (typeof k === 'string') return rScalar(dv, f[1], k);
    // an aggregate member: decode into a fresh value, which then becomes the stored member
    const v = k.rec ? new k.rec() : k.arr ? freshArr(k) : null;
    rKind(dv, f[1], k, v);
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
/** What the n bytes at pointer p hold: { write(dv), read(dv) } over a DataView of n bytes. */
function region(p, n) {
    if (p instanceof FieldRef) {
        const k = p.kind || (typeof p.get(0) === 'number' || typeof p.get(0) === 'bigint' ? ({ 1: 'i8', 2: 'i16', 4: 'i32', 8: 'i64' })[n] : 'ptr');
        if (!k || SZ[k] !== n) throw new CTrap(`serialize: ${n} bytes at field ${p.key}`);
        return { write: (dv) => wScalar(dv, 0, k, p.get(0)), read: (dv) => p.set(0, rScalar(dv, 0, k)) };
    }
    if (p instanceof Ptr && Array.isArray(p.buf)) {
        // a plain array: 64-bit integers or pointers ($kind), or boxes, or aggregates
        const a = p.buf;
        const first = a[p.off];
        if (first !== null && typeof first === 'object' && !(first === STALE)) {
            if (first.constructor && first.constructor.$fields) return recs(a, p.off, n, first.constructor.$size);
            throw new CTrap('serialize: an array of aggregates through a pointer');
        }
        const k = a.$kind === 'ptr' || (a.$kind === undefined && (first === null || first === STALE)) ? 'ptr' : 'i64';
        if (n % 8) throw new CTrap(`serialize: ${n} bytes of 8-byte elements`);
        return {
            write: (dv) => { for (let i = 0; i < n / 8; i++) wScalar(dv, 8 * i, k, a[p.off + i]); },
            read: (dv) => { for (let i = 0; i < n / 8; i++) a[p.off + i] = rScalar(dv, 8 * i, k === 'i64' ? 'i64' : 'ptr'); },
        };
    }
    if (p !== null && typeof p === 'object' && p.constructor && p.constructor.$fields) {
        const size = p.constructor.$size;
        if (p.__arr !== undefined) return recs(p.__arr, p.__idx, n, size);
        if (n !== size) throw new CTrap(`serialize: ${n} bytes of a ${size}-byte record`);
        return { write: (dv) => wRec(dv, 0, p), read: (dv) => rRec(dv, 0, p) };
    }
    throw new CTrap('serialize: a buffer that is not bytes, a scalar, a record or a scalar array');
}
function recs(a, i0, n, size) {
    if (n % size) throw new CTrap(`serialize: ${n} bytes of ${size}-byte records`);
    const m = n / size;
    if (i0 + m > a.length) throw new CTrap('serialize: past the end of a record array');
    return {
        write: (dv) => { for (let i = 0; i < m; i++) wRec(dv, i * size, a[i0 + i]); },
        read: (dv) => { for (let i = 0; i < m; i++) rRec(dv, i * size, a[i0 + i]); },
    };
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
