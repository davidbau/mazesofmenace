// js/crt/string.js: <string.h> and <stdlib.h> string/number parsing on byte
// pointers (transpiler-design.md 5). Hand-written runtime.
//
// Pointers are BytePtr (js/crt/mem.js); NULL is null. Functions returning a
// pointer into an argument return a BytePtr into the same buffer. Reading or
// writing past a buffer throws CTrap where C would read or corrupt other memory.
// The macOS fortified forms (__builtin___strcpy_chk etc.) take clang's
// __builtin_object_size of the destination; (size_t)-1 means unknown. Darwin
// aborts on overflow; these throw CTrap.
import { CTrap, i32, u64, i64, norm } from './int.js';
import { BytePtr, Ptr, FieldRef, cstrlen, recArray } from './mem.js';
import { RawBlock, asArr } from './alloc.js';
import { isspace, isdigit, isalpha, tolower } from './ctype.js';
import { deserialize } from './serial.js';

// bytes compare as unsigned char (Darwin); char buffers are Int8Array, so mask
const at = (p, i) => p.get(i) & 0xff;
const UNKNOWN = (s) => s === -1 || s === 18446744073709551615n || s === 2 ** 64 - 1;
function chk(objsize, need, what) {
    if (!UNKNOWN(objsize) && need > Number(objsize)) throw new CTrap(`detected buffer overflow (${what})`);
}

export const strlen = (s) => cstrlen(s);

export function strcmp(a, b) {
    for (let i = 0; ; i++) {
        const x = at(a, i), y = at(b, i);
        if (x !== y) return x - y;   // Darwin: difference of unsigned chars
        if (x === 0) return 0;
    }
}
export function strncmp(a, b, n) {
    n = Number(n);
    for (let i = 0; i < n; i++) {
        const x = at(a, i), y = at(b, i);
        if (x !== y) return x - y;
        if (x === 0) return 0;
    }
    return 0;
}
export const strcoll = strcmp;   // "C" locale

export function strchr(s, c) {
    c &= 0xff;
    for (let i = 0; ; i++) {
        const x = at(s, i);
        if (x === c) return s.add(i);
        if (x === 0) return null;
    }
}
export function strrchr(s, c) {
    c &= 0xff;
    let r = null;
    for (let i = 0; ; i++) {
        const x = at(s, i);
        if (x === c) r = s.add(i);
        if (x === 0) return r;
    }
}
export function strstr(h, n) {
    const nl = cstrlen(n);
    if (nl === 0) return h;
    for (let i = 0; at(h, i) !== 0; i++) {
        let j = 0;
        while (j < nl && at(h, i + j) === at(n, j)) j++;
        if (j === nl) return h.add(i);
    }
    return null;
}
function inSet(set, c) { for (let k = 0; ; k++) { const x = at(set, k); if (x === 0) return false; if (x === c) return true; } }
export function strspn(s, set) { let i = 0; while (at(s, i) !== 0 && inSet(set, at(s, i))) i++; return i; }
export function strcspn(s, set) { let i = 0; while (at(s, i) !== 0 && !inSet(set, at(s, i))) i++; return i; }
export function strpbrk(s, set) {
    for (let i = 0; at(s, i) !== 0; i++) if (inSet(set, at(s, i))) return s.add(i);
    return null;
}

export function strcpy(d, s) {
    for (let i = 0; ; i++) { const x = at(s, i); d.set(i, x); if (x === 0) return d; }
}
export function strncpy(d, s, n) {
    n = Number(n);
    let i = 0;
    for (; i < n; i++) { const x = at(s, i); d.set(i, x); if (x === 0) break; }
    for (; i < n; i++) d.set(i, 0);   // pad with NULs
    return d;
}
export function strcat(d, s) { strcpy(d.add(cstrlen(d)), s); return d; }
export function strncat(d, s, n) {
    n = Number(n);
    const dl = cstrlen(d);
    let i = 0;
    for (; i < n; i++) { const x = at(s, i); if (x === 0) break; d.set(dl + i, x); }
    d.set(dl + i, 0);
    return d;
}
export function __builtin___strcpy_chk(d, s, objsize) { chk(objsize, cstrlen(s) + 1, 'strcpy'); return strcpy(d, s); }
export function __builtin___strcat_chk(d, s, objsize) { chk(objsize, cstrlen(d) + cstrlen(s) + 1, 'strcat'); return strcat(d, s); }
export function __builtin___strncpy_chk(d, s, n, objsize) { chk(objsize, Number(n), 'strncpy'); return strncpy(d, s, n); }
export function __builtin___strncat_chk(d, s, n, objsize) {
    let sl = 0; while (sl < Number(n) && at(s, sl) !== 0) sl++;
    chk(objsize, cstrlen(d) + sl + 1, 'strncat');
    return strncat(d, s, n);
}

// ---------- byte memory (BytePtr operands) ----------
// Object-world operands: a record object (memset to 0 resets it, memcpy of a
// whole record copies it), a RawBlock (bytes not yet typed), or a Ptr.
/** The records n bytes starting at record r cover: r alone, or a run of its array (whole elements only). */
function recRun(r, n, what) {
    const sz = r.constructor.$size;
    if (sz === undefined || n === sz) return [r];
    if (n > sz && r.__tail && n <= sz + r.__tail.length) return [r];   // struct + trailing area (struct engr)
    if (n < sz || n % sz !== 0) throw new CTrap(`${what} of ${n} bytes over records of ${sz}`);
    const k = n / sz;
    if (!r.__arr || r.__idx + k > r.__arr.length) throw new CTrap(`${what} of ${k} records past the end of the array`);
    return r.__arr.slice(r.__idx, r.__idx + k);
}
const isAgg = (v) => v !== null && typeof v === 'object' && (ArrayBuffer.isView(v) || Array.isArray(v) || isRec(v));
function sizeOfVal(v) {
    if (ArrayBuffer.isView(v)) return v.byteLength;
    if (Array.isArray(v)) return v.length && isAgg(v[0]) ? v.reduce((a, x) => a + sizeOfVal(x), 0) : v.length * 8;
    if (isRec(v)) return v.constructor.$size;
    throw new CTrap('sizeof of an unknown value');
}
function zeroVal(v) {
    if (ArrayBuffer.isView(v)) v.fill(0);
    else if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { if (isAgg(v[i])) zeroVal(v[i]); else v[i] = v[i] === null || typeof v[i] === 'object' ? null : 0; } }
    else v.$copyFrom(new v.constructor());
}
function copyVal(a, b) {
    if (ArrayBuffer.isView(a)) a.set(b);
    else if (Array.isArray(a)) { for (let i = 0; i < a.length; i++) { if (isAgg(a[i])) copyVal(a[i], b[i]); else a[i] = b[i]; } }
    else a.$copyFrom(b);
}
const isRec = (x) => x !== null && typeof x === 'object' && typeof x.$copyFrom === 'function';
function asBytes(p) {
    if (p instanceof RawBlock) return p.obj !== null ? p.obj : asArr(p, Uint8Array);
    return p;
}
export function memset(d, c, n) {
    n = Number(n); c &= 0xff;
    const D = asBytes(d);
    if (isRec(D)) {
        for (const r of recRun(D, n, 'memset')) {
            if (c === 0) r.$copyFrom(new r.constructor());
            // every byte c: each field decodes the pattern (bones.c savebones: ' ' over struct
            // cemetery); a pointer field becomes a non-null pointer that traps when used
            else deserialize(r, new Uint8Array(r.constructor.$size).fill(c));
            if (r.__tail) r.__tail.fill(c);   // (struct engr: + trailing area)
        }
        return d;
    }
    if (D instanceof FieldRef) {   // &scalar_or_pointer_field: one element
        if (c !== 0) throw new CTrap('memset of a field with a nonzero byte');
        const cur = D.get(0);
        D.set(0, cur === null || typeof cur === 'object' || typeof cur === 'function' ? null : 0);
        return d;
    }
    if (D instanceof Ptr && !ArrayBuffer.isView(D.buf) && isAgg(D.buf[D.off])) {   // array of arrays/records
        if (c !== 0) throw new CTrap('memset of nested arrays with a nonzero byte');
        let left = n;
        for (let i = D.off; left > 0; i++) {
            if (i >= D.buf.length) throw new CTrap('memset past the end of an array');
            const v = D.buf[i];
            left -= sizeOfVal(v);
            zeroVal(v);
        }
        if (left !== 0) throw new CTrap('memset of part of an array element');
        return d;
    }
    if (D instanceof Ptr && !ArrayBuffer.isView(D.buf)) {   // array of pointers / 64-bit values: only 0 is meaningful
        if (c !== 0 || n % 8 !== 0) throw new CTrap('memset of a pointer array with a nonzero byte');
        const z = D.buf.$kind === 'i64' || typeof D.buf[D.off] === 'number' ? 0 : null;
        for (let i = 0; i < n / 8; i++) D.set(i, z);
        return d;
    }
    bytesView(D, n).fill(c);
    return d;
}
export function memcpy(d, s, n) {   // overlapping memcpy is undefined in C; copy like memmove
    return memmove(d, s, n);
}
// Allocated storage takes the effective type of what is memcpy'd into it (C11 6.5p6).
// A block the declared pointer type made a pointer array (nhlua.c: genericptr_t *gmst_ubak =
// alloc(sizeof u)) that receives a record or other non-pointer data keeps a shadow copy of
// that data ($eff); copies out of the block read the shadow.
const isPtrArray = (p) => p instanceof Ptr && Array.isArray(p.buf) && p.buf.$block !== undefined && p.off === 0;
function shadowOf(S, n) {
    if (isRec(S)) {
        const runs = recRun(S, n, 'memcpy');
        const a = recArray(S.constructor, runs.length);
        runs.forEach((r, i) => a[i].$copyFrom(r));
        return a[0];
    }
    if (S instanceof Ptr && ArrayBuffer.isView(S.buf)) {
        const View = S.buf.constructor;
        if (n % View.BYTES_PER_ELEMENT) throw new CTrap('memcpy of part of an array element');
        const v = new Ptr(new View(n / View.BYTES_PER_ELEMENT), 0);
        bytesView(v, n).set(bytesView(S, n));
        return v;
    }
    if (S instanceof Ptr && Array.isArray(S.buf) && isAgg(S.buf[S.off])) {
        const out = [];
        let left = n;
        for (let i = 0; left > 0; i++) { const v = S.buf[S.off + i]; left -= sizeOfVal(v); out.push(cloneVal(v)); }
        if (left !== 0) throw new CTrap('memcpy of part of an array element');
        return new Ptr(out, 0);
    }
    return null;
}
function cloneVal(v) {
    if (ArrayBuffer.isView(v)) return v.slice();
    if (Array.isArray(v)) return v.map((x) => (isAgg(x) ? cloneVal(x) : x));
    return v.$clone();
}
export function memmove(d, s, n) {
    n = Number(n);
    const D = asBytes(d), Sx = asBytes(s);
    if (isPtrArray(Sx) && Sx.buf.$eff) return memmove(D, Sx.buf.$eff, n);
    if (isPtrArray(D) && n <= D.buf.$block.size && n > D.buf.$block.size - 8 && !isPtrArray(Sx)
        && (D.buf.$eff || D.buf.every((x) => x === null || x === 0))) {
        const sh = shadowOf(Sx, n);
        if (sh !== null) { D.buf.$eff = sh; return d; }
    }
    if (isRec(D) || isRec(Sx)) {
        if (!(isRec(D) && isRec(Sx) && D.constructor === Sx.constructor)) throw new CTrap('memcpy between a record and other data');
        const ds = recRun(D, n, 'memcpy'), ss = recRun(Sx, n, 'memcpy');
        if (D.__arr && D.__arr === Sx.__arr && D.__idx > Sx.__idx) for (let i = ds.length - 1; i >= 0; i--) ds[i].$copyFrom(ss[i]);
        else for (let i = 0; i < ds.length; i++) ds[i].$copyFrom(ss[i]);
        return d;
    }
    if (D instanceof FieldRef || Sx instanceof FieldRef) { D.set(0, Sx.get(0)); return d; }   // one scalar or pointer
    if (D instanceof Ptr && Sx instanceof Ptr && !ArrayBuffer.isView(D.buf) && isAgg(D.buf[D.off])) {   // arrays of arrays/records
        let left = n, i = 0;
        const pairs = [];
        while (left > 0) { const v = D.buf[D.off + i]; left -= sizeOfVal(v); pairs.push([v, Sx.buf[Sx.off + i]]); i++; }
        if (left !== 0) throw new CTrap('memcpy of part of an array element');
        for (const [a, b] of pairs) copyVal(a, b);
        return d;
    }
    if (!ArrayBuffer.isView(D.buf) || !ArrayBuffer.isView(Sx.buf)) {   // pointer arrays: element-wise (8 bytes each)
        if (n % 8 !== 0) throw new CTrap('partial copy of a pointer array');
        const k = n / 8;
        if (D.buf === Sx.buf && D.off > Sx.off) for (let i = k - 1; i >= 0; i--) D.set(i, Sx.get(i));
        else for (let i = 0; i < k; i++) D.set(i, Sx.get(i));
        return d;
    }
    bytesView(D, n).set(bytesView(Sx, n));   // TypedArray.set copies as if through a temporary (memmove)
    return d;
}
/**
 * The n bytes at typed-array pointer p, as a Uint8Array over the same memory
 * (bounds-checked). The bound is the end of the underlying object, which for a
 * row of a multidimensional array (mem.js matrix: views of one flat array) is
 * the end of the whole array, as in C (vision.c memset(**rows, 0, ROWNO * COLNO)).
 */
export function bytesView(p, n) {
    const b = p.buf, bpe = b.BYTES_PER_ELEMENT;
    const start = p.off * bpe;
    const limit = b.buffer.byteLength - b.byteOffset;
    if (p.off < 0 || start + n > limit) throw new CTrap(`memory access out of bounds (${start}+${n} of ${limit} bytes)`);
    return new Uint8Array(b.buffer, b.byteOffset + start, n);
}
export function memcmp(a, b, n) {
    n = Number(n);
    const A = asBytes(a), B = asBytes(b);
    if (!ArrayBuffer.isView(A.buf) || !ArrayBuffer.isView(B.buf)) throw new CTrap('memcmp of non-byte data');
    const x = bytesView(A, n), y = bytesView(B, n);
    for (let i = 0; i < n; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
}
export function memchr(s, c, n) {
    n = Number(n); c &= 0xff;
    for (let i = 0; i < n; i++) if (at(s, i) === c) return s.add(i);
    return null;
}
export function __builtin___memset_chk(d, c, n, objsize) { chk(objsize, Number(n), 'memset'); return memset(d, c, n); }
export function __builtin___memcpy_chk(d, s, n, objsize) { chk(objsize, Number(n), 'memcpy'); return memcpy(d, s, n); }
export function __builtin___memmove_chk(d, s, n, objsize) { chk(objsize, Number(n), 'memmove'); return memmove(d, s, n); }

// ---------- number parsing ----------
export const abs = (x) => (x < 0 ? (x === -2147483648 ? x : -x) : x);   // abs(INT_MIN) wraps
export const labs = (x) => i64(x < 0 ? -BigInt(x) : x);

/**
 * strtol / strtoul / strtoll / strtoull core (Darwin, C locale).
 * endptr: null or a reference with set(BytePtr). Returns the clamped value
 * (LONG_MAX/LONG_MIN/ULONG_MAX on overflow; errno is not modeled yet).
 */
function strtoX(s, endptr, base, unsigned, bits) {
    let i = 0;
    while (isspace(at(s, i))) i++;
    let neg = false;
    if (at(s, i) === 45) { neg = true; i++; } else if (at(s, i) === 43) i++;
    const start = i;
    if ((base === 0 || base === 16) && at(s, i) === 48 && (at(s, i + 1) | 0x20) === 120) {
        const d = digit(at(s, i + 2));
        if (d >= 0 && d < 16) { i += 2; base = 16; }
    }
    if (base === 0) base = at(s, i) === 48 ? 8 : 10;
    let acc = 0n, any = false, over = false;
    const B = BigInt(base);
    const LIM = unsigned ? (1n << BigInt(bits)) - 1n : (neg ? (1n << BigInt(bits - 1)) : (1n << BigInt(bits - 1)) - 1n);
    for (;; i++) {
        const d = digit(at(s, i));
        if (d < 0 || d >= base) break;
        any = true;
        if (!over) { acc = acc * B + BigInt(d); if (acc > LIM) over = true; }
    }
    if (endptr) endptr.set(0, any ? s.add(i) : s);   // no digits: endptr = the original string
    if (!any) { void start; return 0; }
    let v;
    if (over) v = unsigned ? LIM : (neg ? -LIM : LIM);
    else v = neg ? -acc : acc;
    if (unsigned) v = BigInt.asUintN(bits, v);   // strtoul("-1") == ULONG_MAX
    return norm(v);
}
function digit(c) {
    if (c >= 48 && c <= 57) return c - 48;
    if (c >= 97 && c <= 122) return c - 87;
    if (c >= 65 && c <= 90) return c - 55;
    return -1;
}
export const strtol = (s, e, b) => strtoX(s, e, b, false, 64);
export const strtoll = strtol;
export const strtoul = (s, e, b) => strtoX(s, e, b, true, 64);
export const strtoull = strtoul;
export const atoi = (s) => i32(strtoX(s, null, 10, false, 64));
export const atol = (s) => strtoX(s, null, 10, false, 64);

/** strtod (C locale): decimal and hex floats, inf/infinity/nan(...). Correctly rounded. */
export function strtod(s, endptr) {
    let i = 0;
    while (isspace(at(s, i))) i++;
    const begin = i;
    let txt = '';
    if (at(s, i) === 45 || at(s, i) === 43) txt += String.fromCharCode(at(s, i++));
    const word = (w) => { for (let k = 0; k < w.length; k++) if (tolower(at(s, i + k)) !== w.charCodeAt(k)) return false; return true; };
    let v;
    if (word('inf')) { i += word('infinity') ? 8 : 3; v = txt === '-' ? -Infinity : Infinity; }
    else if (word('nan')) {
        i += 3;
        if (at(s, i) === 40) { let k = i + 1; while (isalpha(at(s, k)) || isdigit(at(s, k)) || at(s, k) === 95) k++; if (at(s, k) === 41) i = k + 1; }
        v = NaN;
    } else if (at(s, i) === 48 && (at(s, i + 1) | 0x20) === 120 && (digit(at(s, i + 2)) >= 0 && digit(at(s, i + 2)) < 16 || (at(s, i + 2) === 46 && digit(at(s, i + 3)) >= 0 && digit(at(s, i + 3)) < 16))) {
        i += 2;
        let mant = 0n, exp2 = 0, any = false;
        while (digit(at(s, i)) >= 0 && digit(at(s, i)) < 16) { mant = mant * 16n + BigInt(digit(at(s, i++))); any = true; }
        if (at(s, i) === 46) { i++; while (digit(at(s, i)) >= 0 && digit(at(s, i)) < 16) { mant = mant * 16n + BigInt(digit(at(s, i++))); exp2 -= 4; any = true; } }
        if (any && (at(s, i) | 0x20) === 112) {
            let k = i + 1, eneg = false;
            if (at(s, k) === 45 || at(s, k) === 43) eneg = at(s, k++) === 45;
            if (isdigit(at(s, k))) { let e = 0; while (isdigit(at(s, k))) e = Math.min(e * 10 + (at(s, k++) - 48), 1e6); exp2 += eneg ? -e : e; i = k; }
        }
        v = hexToDouble(mant, exp2);
        if (txt === '-') v = -v;
    } else {
        let digits = '', anyd = false;
        while (isdigit(at(s, i))) { digits += String.fromCharCode(at(s, i++)); anyd = true; }
        if (at(s, i) === 46) { const save = i; i++; let frac = ''; while (isdigit(at(s, i))) { frac += String.fromCharCode(at(s, i++)); anyd = true; } if (!anyd) i = save; else digits += '.' + frac; }
        if (!anyd) { if (endptr) endptr.set(0, s); return 0; }
        if ((at(s, i) | 0x20) === 101) {
            let k = i + 1, e = '';
            if (at(s, k) === 45 || at(s, k) === 43) e += String.fromCharCode(at(s, k++));
            if (isdigit(at(s, k))) { while (isdigit(at(s, k))) e += String.fromCharCode(at(s, k++)); digits += 'e' + e; i = k; }
        }
        v = Number(txt + (digits.startsWith('.') ? '0' + digits : digits));   // JS parsing is correctly rounded
    }
    void begin;
    if (endptr) endptr.set(0, s.add(i));
    return v;
}
function hexToDouble(mant, exp2) {
    if (mant === 0n) return 0;
    // exact rounding: reduce the mantissa to 54 bits with a sticky bit, then let Number round once
    let bits = mant.toString(2).length;
    if (bits > 64) {
        const drop = bits - 64;
        const sticky = (mant & ((1n << BigInt(drop)) - 1n)) !== 0n ? 1n : 0n;
        mant = (mant >> BigInt(drop)) | sticky;
        exp2 += drop;
    }
    // Number(BigInt) rounds to nearest even; scaling by a power of two is exact unless subnormal
    let v = Number(mant);
    if (v === Infinity) return Infinity;
    // scale in exact steps while the value stays normal; the last step rounds once
    // (results in the subnormal range can be double-rounded: not needed by NetHack/Lua)
    while (exp2 < -1000) { v *= 2 ** -1000; exp2 += 1000; }
    while (exp2 > 1000) { v *= 2 ** 1000; exp2 -= 1000; if (v === Infinity) return v; }
    return v * 2 ** exp2;
}
export const atof = (s) => strtod(s, null);

