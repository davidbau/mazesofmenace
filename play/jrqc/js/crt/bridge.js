// js/crt/bridge.js: value conversion between the object world (NetHack) and
// the heap world (Lua) (transpiler-design.md 7.3). Hand-written runtime; the
// per-function descriptors are generated (transpiler/emit/bridge.mjs ->
// nh/luabridge.js) from the C types.
//
// Kinds (descriptors):
//   'i8' 'u8' 'i16' 'u16' 'i32' 'u32' 'i64' 'u64' 'f32' 'f64'  scalars (same value in both worlds)
//   's'  char *: a heap Ptr passes its address; another Ptr is copied to the
//        heap stack for the call (up to its NUL); heap -> object: a Ptr over the heap
//   'o'  pointer to a record only the heap world looks into (lua_State *): the number
//   'v'  void *: handles for object-world values, userdata blocks for heap memory
//   'S'  const char *const *: a NULL-terminated list of strings, copied in
//   { f: [ret, ...params] }        function pointer (wrappers with stable identity)
//   { r: key, ro }                 pointer to a record both worlds use: copied in
//                                  (and back out unless ro); a const pointer into a
//                                  record array copies the rest of the array (luaL_Reg)
//   { p: kind }                    pointer to one scalar or pointer (an out parameter)
//   { a: kind, n }                 array member of a record
//   'void'                         no value
// A call allocates its temporaries on the heap stack and releases them when the
// callee returns (or throws: a longjmp crosses the bridge as a JS exception).
import * as H from './heap.js';
import { Ptr } from './mem.js';
import { RawBlock } from './alloc.js';
import { CTrap } from './int.js';

const SIZE = { i8: 1, u8: 1, i16: 2, u16: 2, i32: 4, u32: 4, i64: 8, u64: 8, f32: 4, f64: 8, s: 8, o: 8, v: 8, S: 8 };
const sizeOf = (k) => (typeof k === 'string' ? SIZE[k] : k.a ? sizeOf(k.a) * k.n : 8);

let records = {};
/** The generated record table: key -> { cls(), size, fields: [[js, offset, kind]] }. */
export function setRecords(r) { records = r; }

// ---------- memory access by kind ----------
function load(k, a) {
    switch (k) {
    case 'i8': return H.i8[a];
    case 'u8': return H.u8[a];
    case 'i16': return H.i16[a >>> 1];
    case 'u16': return H.u16[a >>> 1];
    case 'i32': return H.i32[a >>> 2];
    case 'u32': return H.u32[a >>> 2];
    case 'i64': return H.ld64(a);
    case 'u64': return H.ldu64(a);
    case 'f32': return H.f32[a >>> 2];
    case 'f64': return H.f64[a >>> 3];
    default: return fromHeap(k, H.u32[a >>> 2]);
    }
}
function store(k, a, v, tmp) {
    switch (k) {
    case 'i8': H.i8[a] = v; return;
    case 'u8': H.u8[a] = v; return;
    case 'i16': H.i16[a >>> 1] = v; return;
    case 'u16': H.u16[a >>> 1] = v; return;
    case 'i32': H.i32[a >>> 2] = v; return;
    case 'u32': H.u32[a >>> 2] = v; return;
    case 'i64': case 'u64': H.st64(a, v); return;
    case 'f32': H.f32[a >>> 2] = v; return;
    case 'f64': H.f64[a >>> 3] = v; return;
    default: H.stp(a, toHeap(k, v, tmp)); return;
    }
}

// ---------- call scratch ----------
class Scratch {
    constructor() { this.sp0 = H.st.sp; this.post = []; }
    alloc(n) { return H.enter(n); }
    finish() { for (const f of this.post) f(); this.release(); }
    release() { H.st.sp = this.sp0; }
}

// ---------- userdata and void * ----------
const blockAt = new Map();      // heap address -> RawBlock handed to the object world
const addrOf = new WeakMap();   // RawBlock (or the record it became) -> heap address
function userdata(a, size) {
    const b = new RawBlock(size);
    blockAt.set(a, b);
    addrOf.set(b, a);
    return b;
}
H.onReset(() => { blockAt.clear(); });   // function wrappers keep their table indices across runs

// ---------- object -> heap ----------
export function toHeap(k, v, tmp) {
    if (typeof k === 'string') {
        switch (k) {
        case 's': return strIn(v, tmp);
        case 'o': if (v === null || v === undefined) return 0; if (typeof v === 'number') return v; throw new CTrap('bridge: an object passed as an opaque heap pointer');
        case 'v': return voidIn(v);
        case 'S': return listIn(v, tmp);
        default: return v;
        }
    }
    if (v === null || v === undefined) return 0;
    if (k.f) return fnIn(v, k);
    if (k.r) return recIn(v, k, tmp);
    if (k.p) {
        if (typeof v === 'number') return v;
        const a = tmp.alloc(8);
        store(k.p, a, v.get(0), tmp);
        tmp.post.push(() => v.set(0, load(k.p, a)));
        return a;
    }
    throw new CTrap(`bridge: no conversion to the heap for ${JSON.stringify(k)}`);
}
function strIn(v, tmp) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (!(v instanceof Ptr)) throw new CTrap('bridge: a char * that is not a byte pointer');
    const b = v.buf;
    if (b.buffer === H.u8.buffer) return v.off * b.BYTES_PER_ELEMENT;
    let n = v.off;
    while (n < b.length && b[n] !== 0) n++;
    const len = n - v.off;
    const a = tmp.alloc(len + 1);
    for (let i = 0; i < len; i++) H.u8[a + i] = b[v.off + i] & 0xff;
    H.u8[a + len] = 0;
    return a;
}
function voidIn(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (v instanceof Ptr && v.buf.buffer === H.u8.buffer) return v.off * v.buf.BYTES_PER_ELEMENT;
    const a = addrOf.get(v);
    if (a !== undefined) return a;
    if (v instanceof RawBlock && v.obj !== null && addrOf.has(v.obj)) return addrOf.get(v.obj);
    return H.handle(v);
}
function listIn(v, tmp) {
    if (v === null) return 0;
    const items = [];
    for (let i = 0; ; i++) { const s = v.get(i); if (s === null) break; items.push(s); }
    const a = tmp.alloc((items.length + 1) * 8);
    items.forEach((s, i) => H.stp(a + 8 * i, strIn(s, tmp)));
    return a;
}
function recIn(v, k, tmp) {
    if (typeof v === 'number') return v;
    const R = records[k.r];
    if (!R) throw new CTrap(`bridge: no record table for ${k.r}`);
    // a const pointer into a record array: the rest of the array (luaL_Reg lists end with a sentinel)
    const elems = k.ro && v.__arr ? v.__arr.slice(v.__idx) : [v];
    const a = tmp.alloc(R.size * elems.length);
    elems.forEach((o, i) => copyIn(R, o, a + i * R.size, tmp));
    if (!k.ro) tmp.post.push(() => copyOut(R, v, a));
    return a;
}
function copyIn(R, o, a, tmp) {
    for (const [js, off, fk] of R.fields) {
        const v = o[js];
        if (fk.a) {
            const es = sizeOf(fk.a);
            for (let i = 0; i < fk.n; i++) store(fk.a, a + off + i * es, v[i], tmp);
        } else store(fk, a + off, v, tmp);
    }
}
function copyOut(R, o, a) {
    for (const [js, off, fk] of R.fields) {
        if (fk.a) {
            const es = sizeOf(fk.a);
            for (let i = 0; i < fk.n; i++) o[js][i] = load(fk.a, a + off + i * es);
        } else o[js] = load(fk, a + off);
    }
}

// ---------- heap -> object ----------
export function fromHeap(k, a) {
    if (typeof k === 'string') {
        switch (k) {
        case 's': return a === 0 ? null : new Ptr(H.i8, a);
        case 'o': return a === 0 ? null : a;
        case 'v': return voidOut(a);
        case 'void': return undefined;
        default: return a;
        }
    }
    if (a === 0) return null;
    if (k.f) return fnOut(a, k);
    if (k.r) { const R = records[k.r]; const o = new (R.cls())(); copyOut(R, o, a); return o; }
    throw new CTrap(`bridge: no conversion from the heap for ${JSON.stringify(k)}`);
}
function voidOut(a) {
    if (a === 0) return null;
    if (H.isHandle(a)) return H.deref(a);
    const b = blockAt.get(a);
    if (b) return b;
    return new Ptr(H.i8, a);
}

// ---------- functions ----------
const fnToHeap = new Map();   // object-world function -> table index
const fnToObj = new Map();    // table index -> object-world function
function fnIn(f, k) {
    if (typeof f === 'number') return f;
    if (f.$heapIdx) return f.$heapIdx;
    let i = fnToHeap.get(f);
    if (i === undefined) {
        const w = f.$heap || ((...a) => callObj(f, k.f, a));   // a hand-written heap twin (nhl_alloc) needs no conversion
        w.$obj = f;
        i = H.fn(w);
        fnToHeap.set(f, i);
    }
    return i;
}
function fnOut(i, k) {
    const h = H.fnAt(i);
    if (h.$obj) return h.$obj;
    let f = fnToObj.get(i);
    if (!f) { f = toObj(h, k.f); f.$heapIdx = i; fnToObj.set(i, f); }
    return f;
}
/** A heap-world call of an object-world function: convert the arguments out and the result in. */
function callObj(f, desc, a) {
    const [ret, ...params] = desc;
    const backs = [];
    const args = params.map((k, i) => {
        const v = fromHeap(k, a[i]);
        if (k.r && !k.ro && v !== null) backs.push(() => { const tmp = new Scratch(); copyIn(records[k.r], v, a[i], tmp); tmp.release(); });
        return v;
    });
    const done = (r) => {
        for (const b of backs) b();
        if (ret === 'void') return undefined;
        if (typeof ret !== 'string' || ret === 's' || ret === 'S') {
            if (ret === 's' || ret.r || ret.p) throw new CTrap('bridge: a callback returning a pointer into object memory');
        }
        return toHeap(ret, r, null);
    };
    const r = f(...args);
    return r instanceof Promise ? r.then(done) : done(r);
}
/**
 * The object-world face of heap function h (desc [ret, ...params]); extra
 * (variadic) arguments pass unchanged; fresh: the index of the size argument when
 * h returns fresh userdata memory (lua_newuserdatauv).
 */
export function toObj(h, desc, fresh = -1) {
    const [ret, ...params] = desc;
    const w = (...args) => {
        const tmp = new Scratch();
        let r;
        try {
            const ha = args.map((v, i) => (i < params.length ? toHeap(params[i], v, tmp) : v));
            r = h(...ha);
        } catch (e) { tmp.release(); throw e; }
        const done = (x) => {
            tmp.finish();
            if (fresh >= 0 && x !== 0) return userdata(x, Number(args[fresh]));
            return fromHeap(ret, x);
        };
        if (r instanceof Promise) return r.then(done, (e) => { tmp.release(); throw e; });
        return done(r);
    };
    w.$heapIdx = H.fn(h);   // passed back as a function pointer: the heap function itself
    return w;
}

// ---------- heap functions the runtime calls (hand-written overrides) ----------
export const heapApi = {};
export function register(name, h) { heapApi[name] = h; }
