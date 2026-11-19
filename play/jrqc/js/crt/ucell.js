// js/crt/ucell.js: union cells (transpiler-design.md 3.4.2, decision D1).
// Hand-written runtime.
//
// A union that the punning check (transpiler/out/union-pun.md) cannot prove
// pun-free keeps C's bytes: the cell owns `$size` bytes in clang's arm64
// layout, and every member read or write goes through them, so a value written
// as one member and read as another behaves as on the recorder (little-endian,
// leftover bytes included). The container record stays an object.
//
// Pointer members store an address-like handle (mem.js ptrToInt: NULL is 0,
// an integer-made pointer is its value, an object is a handle above 2^40). A
// pointer read gives back the object last stored at that offset when the bytes
// still hold its handle, NULL for 0, and otherwise an interned, non-dereferenceable
// pointer value (mem.js ptrConst), as for a pointer made from an integer.
// `$p` keeps the stored objects (a strong reference, as the C memory would).
//
// Record members are views: objects whose prototype is the member record's
// class prototype (so $clone/$copyFrom/instanceof work) with accessors over the
// cell's bytes at the member's offset. Accessors are built once per class from
// the generated static $fields() tables.
import { ptrConst, ptrConstStale, ptrToInt } from './mem.js';
import { CTrap, i64, u64 } from './int.js';

const TYPED = { i8: Int8Array, u8: Uint8Array, i16: Int16Array, u16: Uint16Array, i32: Int32Array, u32: Uint32Array, f32: Float32Array, f64: Float64Array };

function rd(cell, off, k) {
    const dv = cell.$dv;
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
    case 'ptr': {
        const n = dv.getUint32(off, true) + dv.getUint32(off + 4, true) * 2 ** 32;
        if (n === 0) return null;
        const o = cell.$p.get(off);
        if (o !== undefined && ptrToInt(o) === n) return o;
        return cell.$fromSave ? ptrConstStale(n) : ptrConst(n);   // save-file bytes hold stale addresses
    }
    default: throw new CTrap(`union cell: member kind ${JSON.stringify(k)}`);
    }
}
function wr(cell, off, k, v) {
    const dv = cell.$dv;
    switch (k) {
    case 'i8': case 'u8': dv.setUint8(off, Number(v) & 0xff); return;
    case 'i16': case 'u16': dv.setUint16(off, Number(v) & 0xffff, true); return;
    case 'i32': case 'u32': dv.setUint32(off, Number(v) >>> 0, true); return;
    case 'i64': case 'u64': dv.setBigUint64(off, BigInt.asUintN(64, BigInt(v)), true); return;
    case 'f32': dv.setFloat32(off, v, true); return;
    case 'f64': dv.setFloat64(off, v, true); return;
    case 'ptr': {
        const n = v === null || v === undefined ? 0 : ptrToInt(v);
        dv.setUint32(off, n % 2 ** 32, true);
        dv.setUint32(off + 4, Math.floor(n / 2 ** 32), true);
        if (n === 0) cell.$p.delete(off); else cell.$p.set(off, v);
        return;
    }
    default: throw new CTrap(`union cell: member kind ${JSON.stringify(k)}`);
    }
}

const fieldsOf = (C) => (C.$fieldTable || (C.$fieldTable = C.$fields()));

/** Accessors for the fields of record class R at offset `base` of a cell; `cellOf(this)` finds the cell. */
function defineAccessors(proto, R, base, cellOf) {
    for (const [js, off, k] of fieldsOf(R)) {
        const at = base + off;
        let get, set;
        if (typeof k === 'string') {
            get = function () { return rd(cellOf(this), at, k); };
            set = function (v) { wr(cellOf(this), at, k, v); };
        } else if (k.rec) {
            const V = viewClass(k.rec, at);
            get = function () { return new V(cellOf(this)); };
            set = function (v) { new V(cellOf(this)).$copyFrom(v); };
        } else if (k.arr && typeof k.arr === 'string' && TYPED[k.arr]) {
            const T = TYPED[k.arr];
            get = function () { const c = cellOf(this); return new T(c.$dv.buffer, c.$dv.byteOffset + at, k.n); };
            set = function (v) { this[js].set(v); };
        } else {
            get = set = function () { throw new CTrap(`union cell: member ${js} of kind ${JSON.stringify(k)}`); };
        }
        Object.defineProperty(proto, js, { get, set, configurable: true, enumerable: true });
    }
}

const VIEWS = new Map();   // R -> Map(offset -> view class)
/** A class whose instances view record R stored at offset `at` of a cell. */
function viewClass(R, at) {
    let m = VIEWS.get(R);
    if (!m) VIEWS.set(R, (m = new Map()));
    let V = m.get(at);
    if (V) return V;
    V = function (cell) { this.$cell = cell; };
    V.prototype = Object.create(R.prototype);
    V.prototype.constructor = R;
    defineAccessors(V.prototype, R, at, (o) => o.$cell);
    m.set(at, V);
    return V;
}

/** Called by a union-cell class's constructor: its bytes, and (once per class) its member accessors. */
export function cellInit(cell) {
    const C = cell.constructor;
    if (!Object.prototype.hasOwnProperty.call(C, '$cellReady')) {
        defineAccessors(C.prototype, C, 0, (o) => o);
        C.$cellReady = true;
    }
    cell.$dv = new DataView(new ArrayBuffer(C.$size));
    cell.$p = new Map();
}
/** Whole-union copy: the bytes, and the objects behind stored pointers. */
export function cellCopy(dst, src) {
    if (src.$dv) {
        new Uint8Array(dst.$dv.buffer).set(new Uint8Array(src.$dv.buffer, src.$dv.byteOffset, dst.$dv.byteLength));
        dst.$p = new Map(src.$p);
        dst.$fromSave = src.$fromSave;
    } else {
        // an object of the same class shape (never expected): copy member by member
        throw new CTrap('union cell: copy from a value that is not a cell');
    }
    return dst;
}
/** The cell's bytes (save files: serial.js). */
export const cellBytes = (cell) => new Uint8Array(cell.$dv.buffer, cell.$dv.byteOffset, cell.$dv.byteLength);
