// js/crt/heaplibc.js: libc for heap-world code (transpiler-design.md 7).
// Hand-written runtime.
//
// Heap-world modules call these with heap addresses (Numbers) directly, with no
// marshalling: memory and string functions, the allocator, and the functions
// whose results point to libc-owned memory (getenv, strerror, localeconv,
// setlocale, __error), which here live in the heap. Other libc calls go to the
// object-world runtime through $h.P / $h.PV / $h.handle (heap.mjs toRuntime).
import * as H from './heap.js';
import { u8, i8, i32, f64 } from './heap.js';
import * as $c from './index.js';
import { CTrap } from './int.js';

export { malloc, free, realloc, calloc } from './heap.js';

// ---------- memory and strings ----------
export function memcpy(d, s, n) { n = Number(n); u8.copyWithin(d, s, s + n); return d; }
export const memmove = memcpy;   // copyWithin handles overlap
export function memset(d, c, n) { n = Number(n); u8.fill(c & 0xff, d, d + n); return d; }
export function memcmp(a, b, n) {
    n = Number(n);
    for (let i = 0; i < n; i++) if (u8[a + i] !== u8[b + i]) return u8[a + i] - u8[b + i];
    return 0;
}
export function memchr(s, c, n) {
    n = Number(n); c &= 0xff;
    for (let i = 0; i < n; i++) if (u8[s + i] === c) return s + i;
    return 0;
}
export function strlen(s) { let i = s; while (u8[i]) i++; return i - s; }
export function strcmp(a, b) {
    for (;; a++, b++) {
        const x = u8[a], y = u8[b];
        if (x !== y) return x - y;
        if (!x) return 0;
    }
}
export const strcoll = strcmp;   // the "C" locale (Lua never calls setlocale with a name)
export function strncmp(a, b, n) {
    n = Number(n);
    for (let i = 0; i < n; i++) {
        const x = u8[a + i], y = u8[b + i];
        if (x !== y) return x - y;
        if (!x) return 0;
    }
    return 0;
}
export function strchr(s, c) {
    c &= 0xff;
    for (;; s++) { if (u8[s] === c) return s; if (!u8[s]) return 0; }
}
export function strstr(h, n) {
    if (!u8[n]) return h;
    for (; u8[h]; h++) {
        let i = 0;
        while (u8[n + i] && u8[h + i] === u8[n + i]) i++;
        if (!u8[n + i]) return h;
    }
    return 0;
}
const inSet = (set, c) => { for (let j = set; u8[j]; j++) if (u8[j] === c) return true; return false; };
export function strspn(s, set) { let i = s; while (u8[i] && inSet(set, u8[i])) i++; return i - s; }
export function strpbrk(s, set) { for (; u8[s]; s++) if (inSet(set, u8[s])) return s; return 0; }
export function strcpy(d, s) { let i = 0; do u8[d + i] = u8[s + i]; while (u8[s + i++]); return d; }
export function __builtin___memcpy_chk(d, s, n, os) {
    if (Number(os) !== -1 && Number(n) > Number(os) && Number(os) >= 0) throw new CTrap('__memcpy_chk: buffer overflow');
    return memcpy(d, s, n);
}
export function __builtin___strcpy_chk(d, s, os) {
    if (Number(os) !== -1 && Number(os) >= 0 && strlen(s) + 1 > Number(os)) throw new CTrap('__strcpy_chk: buffer overflow');
    return strcpy(d, s);
}
/** strtod: the object-world implementation over the heap bytes. */
export function strtod(s, endptr) {
    const box = [null];
    const v = $c.strtod(H.P(s), endptr ? new $c.Ptr(box, 0) : null);
    if (endptr) H.stp(endptr, H.A(box[0]));
    return v;
}
export function strtol(s, endptr, base) {
    const box = [null];
    const v = $c.strtol(H.P(s), endptr ? new $c.Ptr(box, 0) : null, base);
    if (endptr) H.stp(endptr, H.A(box[0]));
    return v;
}

// ---------- libc-owned memory ----------
let cells = null;
function heapString(s) { const a = H.malloc(s.length + 1); for (let i = 0; i < s.length; i++) u8[a + i] = s.charCodeAt(i) & 0xff; u8[a + s.length] = 0; return a; }
function initCells() {
    cells = { env: new Map(), errno: H.malloc(4), lconv: H.malloc(96), C: heapString('C'), dot: heapString('.'), empty: heapString(''), strerror: H.malloc(128) };
    // Darwin struct lconv: decimal_point is the first member; every other char * is ""
    for (let o = 0; o < 80; o += 8) H.stp(cells.lconv + o, cells.empty);
    H.stp(cells.lconv, cells.dot);
    for (let o = 80; o < 96; o++) u8[cells.lconv + o] = 127;   // CHAR_MAX: the char members
    H.stp(__stdinp, H.handle($c.stdin));
    H.stp(__stdoutp, H.handle($c.stdout));
    H.stp(__stderrp, H.handle($c.stderr));
}
H.onReset(initCells);
export function getenv(name) {
    const k = H.str(name);
    if (!cells.env.has(k)) {
        const p = $c.getenv($c.lit(k));
        cells.env.set(k, p === null ? 0 : heapString($c.cstrToJs(p)));
    }
    return cells.env.get(k);
}
export function __error() { i32[cells.errno >>> 2] = $c.$libc.errno; return cells.errno; }
export function strerror(e) {
    const s = $c.cstrToJs($c.strerror(e)).slice(0, 127);
    for (let i = 0; i < s.length; i++) u8[cells.strerror + i] = s.charCodeAt(i);
    u8[cells.strerror + s.length] = 0;
    return cells.strerror;
}
export function localeconv() { return cells.lconv; }
export function setlocale(cat, loc) {
    if (loc === 0) return cells.C;
    const s = H.str(loc);
    return s === '' || s === 'C' || s === 'POSIX' ? cells.C : 0;
}
export const __stdinp = H.data(8), __stdoutp = H.data(8), __stderrp = H.data(8);

// ---------- math (Darwin libm; JS Math is correctly rounded where libm is for
// sqrt, floor, ceil, fabs, fmod; the transcendental functions may differ in
// the last place: transpiler-design.md risk R5, not reached by recorded games) ----------
export const abs = (x) => (x < 0 ? -x | 0 : x);
export const fabs = Math.abs, floor = Math.floor, ceil = Math.ceil, sqrt = Math.sqrt;
export const fmod = (x, y) => x % y;
export const pow = Math.pow, exp = Math.exp, log = Math.log, log2 = Math.log2, log10 = Math.log10;
export const sin = Math.sin, cos = Math.cos, tan = Math.tan, asin = Math.asin, acos = Math.acos, atan2 = Math.atan2;
export const sinh = Math.sinh, cosh = Math.cosh, tanh = Math.tanh;
export function frexp(x, ep) {
    if (x === 0 || !Number.isFinite(x)) { i32[ep >>> 2] = 0; return x; }
    const b = new DataView(new ArrayBuffer(8));
    b.setFloat64(0, x);
    let e = (b.getUint16(0) >>> 4) & 0x7ff;
    if (e === 0) { b.setFloat64(0, x * 2 ** 64); e = ((b.getUint16(0) >>> 4) & 0x7ff) - 64; }
    i32[ep >>> 2] = e - 1022;
    return x / 2 ** (e - 1022);
}
export const ldexp = (x, e) => {
    // exact: scale in steps that cannot overflow or lose bits early
    while (e > 1000) { x *= 2 ** 1000; e -= 1000; }
    while (e < -1000) { x *= 2 ** -1000; e += 1000; }
    return x * 2 ** e;
};
void i8; void f64;
