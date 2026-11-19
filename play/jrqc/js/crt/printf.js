// js/crt/printf.js: C formatted output, byte-exact with Darwin libc
// (transpiler-design.md 5). Hand-written runtime.
//
// One engine (cformat) for sprintf/snprintf/vsnprintf/fprintf and the macOS
// fortified forms (__builtin___sprintf_chk etc.). Formats and %s arguments are
// byte strings (BytePtr); output is bytes. Behavior follows Darwin's
// FreeBSD-derived vfprintf, checked against native libc in tests/crt/printf.test.mjs:
//   - floats: exact decimal value of the double, rounded half-to-even (JS
//     toFixed/toPrecision round ties away from zero, so they are not used)
//   - nan never has a sign; inf/nan ignore the 0 flag
//   - the 0 flag also pads %s and %c with zeros (glibc ignores it there)
//   - %s of NULL prints "(null)" (precision applies); %p prints 0x<hex>, NULL as 0x0
//   - '-' overrides '0'; an integer precision cancels '0'
// Arguments come from a VaList, already in their C promoted types; integer
// conversions reinterpret them as the length modifier says (%u of an int).
//   - %a/%A: FreeBSD __hdtoa (subnormals normalized; its rounding rule; 0x1.f...f rounded up prints as 0x2)
//   - %n stores the count; L (long double) formats as double; %lc/%ls of a wide character
//     outside Latin-1 (EILSEQ in the C locale, printf returns -1) traps.
import { CTrap, i8, u8, i16, u16, i32, u32, i64, u64 } from './int.js';
import { BytePtr, ptrToInt } from './mem.js';
import { RawBlock, asArr } from './alloc.js';
import { VaList } from './va.js';

const NULLSTR = [0x28, 0x6e, 0x75, 0x6c, 0x6c, 0x29];   // "(null)"

// ---------- exact decimal conversion of doubles ----------
const dv = new DataView(new ArrayBuffer(8));
/** x (finite, >= 0) = N / 10^k exactly. */
function decompose(x) {
    dv.setFloat64(0, x);
    const hi = dv.getUint32(0), lo = dv.getUint32(4);
    const ex = (hi >>> 20) & 0x7ff;
    let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
    let e;
    if (ex === 0) e = -1074; else { m |= 1n << 52n; e = ex - 1075; }
    if (m === 0n) return { N: 0n, k: 0 };
    while ((m & 1n) === 0n && e < 0) { m >>= 1n; e++; }   // shorter numbers, same value
    if (e >= 0) return { N: m << BigInt(e), k: 0 };
    return { N: m * 5n ** BigInt(-e), k: -e };
}
const P10 = [];
const pow10 = (n) => (n < 64 ? (P10[n] ??= 10n ** BigInt(n)) : 10n ** BigInt(n));
/** round(N / 10^drop), ties to even */
function roundDrop(N, drop) {
    if (drop <= 0) return N * pow10(-drop);
    const d = pow10(drop);
    let q = N / d;
    const r = N - q * d, half = d / 2n;
    if (r > half || (r === half && (q & 1n) === 1n)) q += 1n;
    return q;
}
function fixedDigits(N, k, p, alt) {
    const q = roundDrop(N, k - p);
    let s = q.toString();
    if (p === 0) return alt ? s + '.' : s;
    s = s.padStart(p + 1, '0');
    return s.slice(0, -p) + '.' + s.slice(-p);
}
/** digits and exponent of N/10^k rounded to p+1 significant digits */
function sciParts(N, k, p) {
    if (N === 0n) return { digits: '0'.repeat(p + 1), E: 0 };
    const len = N.toString().length;
    let E = len - 1 - k;
    let q = roundDrop(N, len - (p + 1));
    let digits = q.toString();
    if (digits.length > p + 1) { q /= 10n; digits = q.toString(); E++; }
    return { digits, E };
}
function sciString(digits, E, alt, upper) {
    let s = digits[0];
    if (digits.length > 1 || alt) s += '.' + digits.slice(1);
    const ae = Math.abs(E);
    return s + (upper ? 'E' : 'e') + (E < 0 ? '-' : '+') + (ae < 10 ? '0' + ae : String(ae));
}
function stripZeros(s) {
    if (!s.includes('.')) return s;
    s = s.replace(/0+$/, '');
    return s.endsWith('.') ? s.slice(0, -1) : s;
}
function formatFloat(x, conv, prec, alt) {
    const upper = conv === 'E' || conv === 'G' || conv === 'F';
    if (prec < 0) prec = 6;
    const { N, k } = decompose(Math.abs(x));
    switch (conv) {
    case 'f': case 'F': return fixedDigits(N, k, prec, alt);
    case 'e': case 'E': { const { digits, E } = sciParts(N, k, prec); return sciString(digits, E, alt, upper); }
    default: {   // g, G
        const P = prec === 0 ? 1 : prec;
        const { E: X } = sciParts(N, k, P - 1);
        let s;
        if (P > X && X >= -4) s = fixedDigits(N, k, P - 1 - X, alt);
        else { const { digits, E } = sciParts(N, k, P - 1); s = sciString(digits, E, alt, upper); }
        if (alt) return s;
        const ei = s.search(/[eE]/);
        return ei < 0 ? stripZeros(s) : stripZeros(s.slice(0, ei)) + s.slice(ei);
    }
    }
}

// ---------- pointers for %p ----------
// a pointer of the object world has no C address: its handle (mem.js ptrToInt), so equal
// pointers print alike (the digits differ from C's, which are addresses of one run)
let pointerAddress = (v) => {
    if (v === null || v === 0) return 0n;
    if (typeof v === 'number' || typeof v === 'bigint') return BigInt(v);
    return BigInt(ptrToInt(v));
};
export const objectAddress = (v) => BigInt(ptrToInt(v));
/** The heap/handle layer installs how pointers print as addresses. */
export function setPointerAddress(f) { pointerAddress = f; }

const pushStr = (out, s) => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };
function pad(out, n, ch) { for (let i = 0; i < n; i++) out.push(ch); }

/**
 * Format: fmt is a BytePtr to a NUL-terminated format, va a VaList.
 * Returns the output bytes (an Array of numbers, no NUL).
 */
export function cformat(fmt, va) {
    const out = [];
    const { buf } = fmt;
    let i = fmt.off;
    for (;;) {
        let c = buf[i];
        if (c === undefined) throw new CTrap('format string not NUL-terminated');
        if (c === 0) return out;
        if (c !== 0x25) { out.push(c & 0xff); i++; continue; }   // char buffers may be Int8Array
        // %[flags][width][.prec][length]conv
        i++;
        let left = false, plus = false, space = false, alt = false, zero = false;
        for (;; i++) {
            c = buf[i];
            if (c === 0x2d) left = true; else if (c === 0x2b) plus = true;
            else if (c === 0x20) space = true; else if (c === 0x23) alt = true;
            else if (c === 0x30) zero = true; else break;
        }
        let width = 0;
        if (buf[i] === 0x2a) { width = i32(va.next()); if (width < 0) { left = true; width = -width; } i++; }
        else while (buf[i] >= 0x30 && buf[i] <= 0x39) width = width * 10 + (buf[i++] - 0x30);
        let prec = -1;
        if (buf[i] === 0x2e) {
            i++;
            if (buf[i] === 0x2a) { prec = i32(va.next()); if (prec < 0) prec = -1; i++; }
            else { prec = 0; while (buf[i] >= 0x30 && buf[i] <= 0x39) prec = prec * 10 + (buf[i++] - 0x30); }
        }
        let len = '';
        for (;;) {
            const ch = String.fromCharCode(buf[i]);
            if ('hlLjztq'.includes(ch)) { len += ch; i++; } else break;
        }
        const conv = String.fromCharCode(buf[i]);
        if (buf[i] === 0 || buf[i] === undefined) throw new CTrap('incomplete conversion at end of format');
        i++;
        if (left) zero = false;

        let prefix = '', body = '', bodyBytes = null, zeroOk = zero;
        switch (conv) {
        case '%': out.push(0x25); continue;
        case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': {
            const signed = conv === 'd' || conv === 'i';
            const v = va.next();
            let n;
            if (len === 'hh') n = signed ? i8(v) : u8(v);
            else if (len === 'h') n = signed ? i16(v) : u16(v);
            else if (len === '') n = signed ? i32(v) : u32(v);
            else if (['l', 'll', 'j', 'z', 't', 'q'].includes(len)) n = signed ? i64(v) : u64(v);
            else throw new CTrap(`unsupported length modifier %${len}${conv}`);
            const neg = n < 0;
            const mag = neg ? -BigInt(n) : BigInt(n);
            const base = conv === 'o' ? 8 : (conv === 'x' || conv === 'X') ? 16 : 10;
            let ds = mag.toString(base);
            if (conv === 'X') ds = ds.toUpperCase();
            if (prec >= 0) { zeroOk = false; if (prec === 0 && mag === 0n) ds = ''; ds = ds.padStart(prec, '0'); }
            if (alt && conv === 'o' && ds[0] !== '0') ds = '0' + ds;
            if (alt && mag !== 0n && conv === 'x') prefix = '0x';
            if (alt && mag !== 0n && conv === 'X') prefix = '0X';
            if (signed) prefix = neg ? '-' : plus ? '+' : space ? ' ' : '';
            body = ds;
            break;
        }
        case 'c':
            if (len === 'l') bodyBytes = [wideByte(va.next())];
            else bodyBytes = [u8(i32(va.next()))];
            break;
        case 'n': {   // the count so far, through the pointer the length modifier types
            const p = va.next();
            if (p !== null) p.set(0, len === 'll' || len === 'l' || len === 'j' || len === 'z' || len === 't' || len === 'q' ? out.length : len === 'hh' ? i8(out.length) : len === 'h' ? i16(out.length) : out.length | 0);
            continue;
        }
        case 's': {
            let p = va.next();
            if (len === 'l') {   // wchar_t *: wcrtomb in the C locale, precision in bytes
                const bytes = [];
                if (p === null) for (const b of NULLSTR) { if (prec >= 0 && bytes.length >= prec) break; bytes.push(b); }
                else for (let j = 0; ; j++) { const w = p.get(j); if (w === 0 || (prec >= 0 && bytes.length >= prec)) break; bytes.push(wideByte(w)); }
                bodyBytes = bytes;
                break;
            }
            if (p instanceof RawBlock) p = asArr(p, Int8Array);   // a malloc'd buffer not yet typed
            const bytes = [];
            if (p === null) { for (const b of NULLSTR) { if (prec >= 0 && bytes.length >= prec) break; bytes.push(b); } }
            else {
                if (!(p instanceof BytePtr)) throw new CTrap('%s argument is not a byte pointer');
                for (let j = p.off; ; j++) {
                    if (prec >= 0 && bytes.length >= prec) break;
                    const b = p.buf[j];
                    if (b === undefined) throw new CTrap('%s: string not NUL-terminated');
                    if (b === 0) break;
                    bytes.push(b & 0xff);
                }
            }
            bodyBytes = bytes;
            break;
        }
        case 'p': {
            const a = pointerAddress(va.next());
            prefix = '0x';
            body = a.toString(16);
            if (prec >= 0) { zeroOk = false; body = body.padStart(prec, '0'); }
            break;
        }
        case 'a': case 'A': {
            const x = Number(va.next());
            const neg = x < 0 || Object.is(x, -0);
            if (Number.isNaN(x)) { body = conv === 'A' ? 'NAN' : 'nan'; zeroOk = false; break; }
            prefix = neg ? '-' : plus ? '+' : space ? ' ' : '';
            if (!Number.isFinite(x)) { body = conv === 'A' ? 'INF' : 'inf'; zeroOk = false; break; }
            prefix += conv === 'A' ? '0X' : '0x';
            body = hexFloat(Math.abs(x), prec, alt, conv === 'A');
            break;
        }
        case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
            const x = Number(va.next());
            const neg = x < 0 || Object.is(x, -0);
            if (Number.isNaN(x)) { body = conv === conv.toUpperCase() ? 'NAN' : 'nan'; zeroOk = false; break; }
            prefix = neg ? '-' : plus ? '+' : space ? ' ' : '';
            if (!Number.isFinite(x)) { body = conv === conv.toUpperCase() ? 'INF' : 'inf'; zeroOk = false; break; }
            body = formatFloat(x, conv, prec, alt);
            break;
        }
        default:
            throw new CTrap(`unsupported conversion %${len}${conv}`);
        }
        const blen = bodyBytes ? bodyBytes.length : body.length;
        const total = prefix.length + blen;
        if (width > total && !left && !zeroOk) pad(out, width - total, 0x20);
        pushStr(out, prefix);
        if (width > total && !left && zeroOk) pad(out, width - total, 0x30);
        if (bodyBytes) for (const b of bodyBytes) out.push(b); else pushStr(out, body);
        if (width > total && left) pad(out, width - total, 0x20);
    }
}

/** A wide character as one byte in the C locale (Latin-1); others are EILSEQ there (printf fails). */
function wideByte(w) {
    w = Number(w);
    if (w >= 0 && w < 256) return w;
    throw new CTrap(`%lc/%ls of wide character ${w}: EILSEQ in the C locale (printf returning -1 is not modeled)`);
}
/** %a digits after "0x": [h].hhhp±d, FreeBSD __hdtoa (round half to even). */
function hexFloat(x, prec, alt, upper) {
    let mant, exp;   // x = mant * 2^(exp - 52), mant an integer with bit 52 set (or 0)
    if (x === 0) { mant = 0n; exp = 0; }
    else {
        const dv = new DataView(new ArrayBuffer(8));
        dv.setFloat64(0, x);
        const bits = dv.getBigUint64(0);
        let e = Number((bits >> 52n) & 0x7ffn);
        let m = bits & ((1n << 52n) - 1n);
        if (e === 0) { e = 1; while (!(m & (1n << 52n))) { m <<= 1n; e--; } }   // subnormal: normalize
        else m |= 1n << 52n;
        mant = m; exp = e - 1023;
    }
    let lead, frac;   // lead digit and 13 fraction hex digits
    const ndig = 13;
    if (prec >= 0 && prec < ndig) {
        // gdtoa/FreeBSD/_hdtoa.c dorounding (FLT_ROUNDS 1): up when the next digit is > 8,
        // or is 8 and the digit after it is odd (not ties-to-even on the kept digit)
        const dig = (i) => (i > ndig ? 0 : Number((mant >> BigInt(4 * (ndig - i))) & 0xfn));   // digit i: 0 is the lead
        const nx = dig(prec + 1), after = dig(prec + 2);
        const drop = BigInt(4 * (ndig - prec));
        mant = (mant >> drop) << drop;
        if (nx > 8 || (nx === 8 && (after & 1))) mant += 1n << drop;
    }
    lead = mant >> 52n;   // 1, or 2 after rounding up, or 0 for zero
    frac = (mant & ((1n << 52n) - 1n)).toString(16).padStart(ndig, '0');
    if (prec < 0) frac = frac.replace(/0+$/, '');
    else frac = frac.slice(0, prec).padEnd(prec, '0');
    let s = lead.toString(16) + (frac.length || alt ? '.' : '') + frac + 'p' + (exp < 0 ? '-' : '+') + Math.abs(exp);
    return upper ? s.toUpperCase() : s;
}
function store(dst, bytes, n) {
    for (let j = 0; j < n; j++) dst.set(j, bytes[j]);
    dst.set(n, 0);
}

/** vsnprintf: at most size-1 bytes plus NUL; returns the full length. */
export function vsnprintf(dst, size, fmt, va) {
    const bytes = cformat(fmt, va);
    size = Number(size);
    if (size > 0) store(dst, bytes, Math.min(bytes.length, size - 1));
    return bytes.length;
}
export const snprintf = (dst, size, fmt, ...args) => vsnprintf(dst, size, fmt, new VaList(args));
export function vsprintf(dst, fmt, va) {
    const bytes = cformat(fmt, va);
    store(dst, bytes, bytes.length);
    return bytes.length;
}
export const sprintf = (dst, fmt, ...args) => vsprintf(dst, fmt, new VaList(args));

// macOS fortified forms. objsize is clang's __builtin_object_size; (size_t)-1
// means unknown. Darwin aborts ("detected buffer overflow") where these throw.
const UNKNOWN = (s) => s === -1 || s === 18446744073709551615n || s === 2 ** 64 - 1;
export function __builtin___sprintf_chk(dst, flag, objsize, fmt, ...args) {
    const bytes = cformat(fmt, new VaList(args));
    if (!UNKNOWN(objsize) && bytes.length + 1 > Number(objsize)) throw new CTrap('detected buffer overflow (sprintf)');
    store(dst, bytes, bytes.length);
    return bytes.length;
}
export function __builtin___vsnprintf_chk(dst, size, flag, objsize, fmt, va) {
    if (!UNKNOWN(objsize) && Number(objsize) < Number(size)) throw new CTrap('detected buffer overflow (vsnprintf)');
    return vsnprintf(dst, size, fmt, va);
}
export const __builtin___snprintf_chk = (dst, size, flag, objsize, fmt, ...args) =>
    __builtin___vsnprintf_chk(dst, size, flag, objsize, fmt, new VaList(args));
