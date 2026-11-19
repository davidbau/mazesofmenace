// js/crt/heap.js: the byte heap of heap-world code (transpiler-design.md 3.5, 7).
// Hand-written runtime.
//
// Heap-world modules (the Lua 5.4.8 TUs) keep all their data in one
// ArrayBuffer with the C layout of the recorder's ABI (Darwin arm64): records,
// arrays, globals, string literals and address-taken locals. Pointers are
// Numbers (byte addresses, 0 is NULL; pointers are 8 bytes in memory, the high
// word is always 0); function pointers are indices into a function table.
//
// Regions: [16, dataEnd) static data (globals, literals; allocated while the
// modules evaluate), then the stack (STACK bytes, growing down from stackTop),
// then the malloc heap. reset() starts a new process: the stack and malloc
// heap are cleared, static data is re-initialized by the modules' $init.
import { CTrap, i64, u64 } from './int.js';
import { Ptr } from './mem.js';
import { setPointerAddress } from './printf.js';

const INITIAL = 64 << 20, MAX = 1 << 30, STACK = 4 << 20;
const buf = new ArrayBuffer(INITIAL, { maxByteLength: MAX });
export const i8 = new Int8Array(buf), u8 = new Uint8Array(buf);
export const i16 = new Int16Array(buf), u16 = new Uint16Array(buf);
export const i32 = new Int32Array(buf), u32 = new Uint32Array(buf);
export const f32 = new Float32Array(buf), f64 = new Float64Array(buf);
const dv = new DataView(buf);

// ---------- 64-bit and pointer access ----------
const TWO32 = 4294967296;
export function ld64(a) {
    const lo = u32[a >>> 2], hi = i32[(a >>> 2) + 1];
    if (hi >= -2097152 && hi < 2097152) return hi * TWO32 + lo;   // |v| < 2^53
    return i64(dv.getBigInt64(a, true));
}
export function ldu64(a) {
    const lo = u32[a >>> 2], hi = u32[(a >>> 2) + 1];
    if (hi < 2097152) return hi * TWO32 + lo;
    return u64(dv.getBigUint64(a, true));
}
export function st64(a, v) {
    if (typeof v === 'number') {
        u32[a >>> 2] = v >>> 0;   // low word of the two's complement value
        u32[(a >>> 2) + 1] = Math.floor(v / TWO32) >>> 0;
    } else dv.setBigUint64(a, BigInt.asUintN(64, v), true);
    return v;
}
export function stp(a, v) { u32[a >>> 2] = v; u32[(a >>> 2) + 1] = 0; return v; }

// ---------- static data ----------
let dataEnd = 16;
const dataStart = 16;
/** Static storage for a global or literal (module evaluation time). */
export function data(size, align = 8) {
    dataEnd = Math.ceil(dataEnd / align) * align;
    const a = dataEnd;
    dataEnd += Math.max(size, 1);
    if (dataEnd > STATIC_MAX) throw new CTrap('static data region full');
    return a;
}
const STATIC_MAX = 16 << 20;
const litCache = new Map();
/** A string literal (NUL-terminated bytes; text is one char per byte), interned. */
export function lit(s) {
    let a = litCache.get(s);
    if (a === undefined) {
        a = data(s.length + 1, 1);
        for (let i = 0; i < s.length; i++) u8[a + i] = s.charCodeAt(i);
        u8[a + s.length] = 0;
        litCache.set(s, a);
    }
    return a;
}

// ---------- stack ----------
const stackBottom = STATIC_MAX, stackTop = STATIC_MAX + STACK;
export const st = { sp: stackTop };
/** Enter a frame of n bytes (16-aligned): its base address. */
export function enter(n) {
    const sp = (st.sp - n) & ~15;
    if (sp < stackBottom) throw new CTrap('heap stack overflow');
    u8.fill(0, sp, st.sp);   // fresh frames are zero (uninitialized C locals: any value)
    st.sp = sp;
    return sp;
}

// ---------- malloc ----------
// Blocks have a 16-byte header (size at -16). Free blocks are kept per exact
// size class (sizes rounded up to 16); a freed block is reused for the next
// request of its class. Addresses only matter to Lua's pointer hashing, which
// does not reach recorded output (transpiler-design.md 7, risk R4).
const heapStart = stackTop;
let brk = heapStart;
let freeLists = new Map();
export const allocStats = { live: 0, bytes: 0 };
function grow(end) {
    if (end <= buf.byteLength) return;
    if (end > MAX) throw new CTrap('heap exhausted');
    let n = buf.byteLength;
    while (n < end) n *= 2;
    buf.resize(Math.min(n, MAX));
}
export function malloc(n) {
    n = Number(n);
    const sz = Math.max(16, Math.ceil(n / 16) * 16);
    const fl = freeLists.get(sz);
    let a;
    if (fl && fl.length) a = fl.pop();
    else {
        a = brk + 16;
        grow(a + sz);
        brk = a + sz;
        u32[(a - 16) >>> 2] = sz;
    }
    allocStats.live++; allocStats.bytes += sz;
    return a;
}
export function calloc(n, s) { const k = Number(n) * Number(s); const a = malloc(k); u8.fill(0, a, a + k); return a; }
export function free(a) {
    if (!a) return;
    const sz = u32[(a - 16) >>> 2];
    if (!freeLists.has(sz)) freeLists.set(sz, []);
    freeLists.get(sz).push(a);
    allocStats.live--; allocStats.bytes -= sz;
    if (onFree) onFree(a);
}
export function realloc(a, n) {
    n = Number(n);
    if (!a) return malloc(n);
    const sz = u32[(a - 16) >>> 2];
    if (n <= sz) return a;
    const b = malloc(n);
    u8.copyWithin(b, a, a + sz);
    free(a);
    return b;
}
let onFree = null;
export function setOnFree(f) { onFree = f; }
export const blockSize = (a) => u32[(a - 16) >>> 2];

// ---------- bytes ----------
export function copy(d, s, n) { u8.copyWithin(d, s, s + n); return d; }
export function zero(d, n) { u8.fill(0, d, d + n); return d; }
/** A struct returned by value: copied to a rotating buffer, so the callee's frame may be reused. */
const RET_SLOTS = 32, RET_SIZE = 512;
const retBase = data(RET_SLOTS * RET_SIZE, 16);
let retNext = 0;
export function ret(a, n) {
    if (n > RET_SIZE) throw new CTrap('struct return too large');
    const d = retBase + (retNext++ % RET_SLOTS) * RET_SIZE;
    return copy(d, a, n);
}

// ---------- function table, handles ----------
const fnTable = [null];
const fnIndex = new Map();
/** The function pointer value of JS function f. */
export function fn(f) {
    let i = fnIndex.get(f);
    if (i === undefined) { i = fnTable.length; fnTable.push(f); fnIndex.set(f, i); }
    return i;
}
export function fnAt(i) {
    const f = fnTable[i];
    if (typeof f !== 'function') throw new CTrap(`call through an invalid function pointer (${i})`);
    return f;
}
/** Object-world values stored in heap memory (FILE *, light userdata): small integers tagged above the heap. */
const HANDLE_BASE = 0x7f000000;
const handles = [];
const handleIndex = new Map();
export function handle(o) {
    if (o === null || o === undefined) return 0;
    let i = handleIndex.get(o);
    if (i === undefined) { i = handles.length; handles.push(o); handleIndex.set(o, i); }
    return HANDLE_BASE + i * 16;
}
export function deref(h) {
    if (h === 0) return null;
    const i = (h - HANDLE_BASE) / 16;
    if (!(i >= 0 && i < handles.length && Number.isInteger(i))) throw new CTrap(`not a handle: ${h}`);
    return handles[i];
}
export const isHandle = (h) => h >= HANDLE_BASE;

// ---------- the boundary with object-world runtime functions ----------
/** char * (or void * used as bytes) for the runtime: a Ptr over the heap. */
export const P = (a) => (a === 0 ? null : new Ptr(i8, a));
/** A runtime pointer result back to an address (Ptr over the heap, or null). */
export function A(p) {
    if (p === null || p === undefined) return 0;
    if (p instanceof Ptr && p.buf.buffer === buf) return p.off * p.buf.BYTES_PER_ELEMENT;
    throw new CTrap('runtime returned a pointer outside the heap');
}
/** T * for a scalar T of view V (int *, double *): a Ptr over that view. */
export const PV = (a, V) => (a === 0 ? null : new Ptr(V, a / V.BYTES_PER_ELEMENT));

/** int64_t * / uint64_t * (time_t *) for the runtime: element access through get/set. */
class P64 {
    constructor(a, signed) { this.a = a; this.signed = signed; }
    get(i) { return this.signed ? ld64(this.a + 8 * i) : ldu64(this.a + 8 * i); }
    set(i, v) { st64(this.a + 8 * i, v); }
}
export const PI64 = (a) => (a === 0 ? null : new P64(a, true));
export const PU64 = (a) => (a === 0 ? null : new P64(a, false));

// %p of a heap pointer (Lua's tostring of tables and functions): its heap address
setPointerAddress((v) => {
    if (v === null || v === 0) return 0n;
    if (typeof v === 'number' || typeof v === 'bigint') return BigInt(v);
    if (v instanceof Ptr && v.buf.buffer === buf) return BigInt(v.off * v.buf.BYTES_PER_ELEMENT);
    throw new CTrap('%p of a pointer without an address');
});

/** Copy a NUL-terminated heap string to a JS byte string. */
export function str(a) { let s = ''; while (u8[a]) s += String.fromCharCode(u8[a++]); return s; }

// ---------- a new process ----------
export function reset() {
    st.sp = stackTop;
    if (brk > heapStart) u8.fill(0, heapStart, brk);
    brk = heapStart;
    freeLists = new Map();
    allocStats.live = 0; allocStats.bytes = 0;
    handles.length = 0; handleIndex.clear();
    retNext = 0;
    for (const f of resetHooks) f();
}
const resetHooks = [];
/** f runs after every reset (runtime state that lives in the heap: libc cells). */
export function onReset(f) { resetHooks.push(f); }

// ---------- setjmp / longjmp (LUAI_TRY / LUAI_THROW: heap.mjs) ----------
export class LongJmp extends Error {
    constructor(buf, val) { super('longjmp'); this.buf = buf; this.val = val; }
}
export function longjmp(b, v) { throw new LongJmp(b, v === 0 ? 1 : v); }
export const layout = { dataStart, get dataEnd() { return dataEnd; }, stackBottom, stackTop, heapStart };
