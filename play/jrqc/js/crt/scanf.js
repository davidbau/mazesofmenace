// js/crt/scanf.js: sscanf / fscanf (transpiler-design.md 5). Hand-written runtime.
// Darwin (FreeBSD) vfscanf semantics for the conversions NetHack uses:
// %d %i %u %o %x %c %s %[...] %n with widths, the h/hh/l/ll/z size modifiers,
// %% and *, whitespace and literal matching. Returns the number of
// assignments, or EOF when input ends before the first conversion.
import { VaList } from './va.js';
import { i32, u32, i64, u64 } from './int.js';

function scan(src, fmt, va) {
    // src: { peek() -> byte | -1, next() -> byte | -1 }
    const f = fmt.buf, fo = fmt.off;
    let i = 0, n = 0, conv = 0, nread = 0;
    const isSpace = (c) => c === 32 || (c >= 9 && c <= 13);
    const fc = (k) => f[fo + k] & 0xff;
    const get = () => { const c = src.next(); if (c >= 0) nread++; return c; };
    for (;;) {
        let c = fc(i);
        if (c === 0) return n;
        if (isSpace(c)) {
            while (isSpace(fc(i))) i++;
            while (isSpace(src.peek())) get();
            continue;
        }
        if (c !== 37) {   // literal
            if (src.peek() !== c) return src.peek() < 0 && conv === 0 ? -1 : n;
            get(); i++;
            continue;
        }
        i++;
        if (fc(i) === 37) { while (isSpace(src.peek())) get(); if (src.peek() !== 37) return n; get(); i++; continue; }
        let suppress = false, width = 0, size = '';
        if (fc(i) === 42) { suppress = true; i++; }
        while (fc(i) >= 48 && fc(i) <= 57) width = width * 10 + fc(i++) - 48;
        for (;;) {
            const m = fc(i);
            if (m === 104) { size = size === 'h' ? 'hh' : 'h'; i++; }
            else if (m === 108) { size = size === 'l' ? 'll' : 'l'; i++; }
            else if (m === 122 || m === 106 || m === 116 || m === 113) { size = 'l'; i++; }
            else break;
        }
        const k = String.fromCharCode(fc(i++));
        if (k === 'n') { if (!suppress) store(va.next(), nread, size, true); continue; }
        if (k === 'c') {
            const w = width || 1;
            if (src.peek() < 0) return conv === 0 && n === 0 ? -1 : n;
            const p = suppress ? null : va.next();
            for (let j = 0; j < w && src.peek() >= 0; j++) { const b = get(); if (p) p.set(j, b << 24 >> 24); }
            conv++; if (!suppress) n++;
            continue;
        }
        if (k === '[') {
            let neg = false;
            if (fc(i) === 94) { neg = true; i++; }
            const set = new Set();
            if (fc(i) === 93) { set.add(93); i++; }
            while (fc(i) !== 93 && fc(i) !== 0) {
                if (fc(i + 1) === 45 && fc(i + 2) !== 93 && fc(i + 2) !== 0) { for (let x = fc(i); x <= fc(i + 2); x++) set.add(x); i += 3; }
                else set.add(fc(i++));
            }
            if (fc(i) === 93) i++;
            const w = width || Infinity;
            const p = suppress ? null : va.next();
            let j = 0;
            while (j < w) { const b = src.peek(); if (b < 0 || set.has(b) === neg) break; get(); if (p) p.set(j, b << 24 >> 24); j++; }
            if (j === 0) return src.peek() < 0 && conv === 0 ? -1 : n;
            if (p) p.set(j, 0);
            conv++; if (!suppress) n++;
            continue;
        }
        // the rest skip leading white space
        while (isSpace(src.peek())) get();
        if (src.peek() < 0) return conv === 0 && n === 0 ? -1 : n;
        if (k === 's') {
            const w = width || Infinity;
            const p = suppress ? null : va.next();
            let j = 0;
            while (j < w) { const b = src.peek(); if (b < 0 || isSpace(b)) break; get(); if (p) p.set(j, b << 24 >> 24); j++; }
            if (p) p.set(j, 0);
            conv++; if (!suppress) n++;
            continue;
        }
        let base = { d: 10, u: 10, o: 8, x: 16, X: 16, i: 0 }[k];
        if (base === undefined) return n;   // unsupported conversion: stop (not used by NetHack)
        let w = width || Infinity, txt = '';
        const take = () => { txt += String.fromCharCode(get()); w--; };
        if (w > 0 && (src.peek() === 43 || src.peek() === 45)) take();
        if (w > 0 && (base === 16 || base === 0) && src.peek() === 48) {
            take();
            if (w > 0 && (src.peek() | 32) === 120) { take(); base = 16; } else if (base === 0) base = 8;
        }
        if (base === 0) base = 10;
        const digit = (b) => { const d = b >= 48 && b <= 57 ? b - 48 : (b | 32) >= 97 && (b | 32) <= 122 ? (b | 32) - 87 : 99; return d < base ? d : -1; };
        let any = /[0-9a-fA-F]$/.test(txt) && !/x$/i.test(txt);
        while (w > 0 && digit(src.peek()) >= 0) { take(); any = true; }
        if (!any) return n;
        conv++;
        if (suppress) continue;
        const neg = txt[0] === '-';
        const digits = txt.replace(/^[+-]/, '').replace(/^0x/i, '');
        let v = digits ? BigInt.asUintN(64, BigInt(base === 16 ? '0x' + digits : base === 8 ? '0o' + digits : digits)) : 0n;
        if (neg) v = BigInt.asUintN(64, -v);
        store(va.next(), v, size, k !== 'u' && k !== 'o' && k !== 'x' && k !== 'X');
        n++;
    }
}
function store(p, v, size, signed) {
    v = BigInt(v);
    let x;
    switch (size) {
    case 'hh': x = signed ? Number(BigInt.asIntN(8, v)) : Number(BigInt.asUintN(8, v)); break;
    case 'h': x = signed ? Number(BigInt.asIntN(16, v)) : Number(BigInt.asUintN(16, v)); break;
    case 'l': case 'll': x = signed ? i64(BigInt.asIntN(64, v)) : u64(v); break;
    default: x = signed ? i32(Number(BigInt.asIntN(32, v))) : u32(Number(BigInt.asUintN(32, v)));
    }
    p.set(0, x);
}
const strSource = (s) => { let k = s.off; return { peek: () => (s.buf[k] === 0 || k >= s.buf.length ? -1 : s.buf[k] & 0xff), next: () => (s.buf[k] === 0 || k >= s.buf.length ? -1 : s.buf[k++] & 0xff) }; };
const fileSource = (f) => ({ peek: () => { const c = f.getc(); if (c >= 0) f.unget = c; return c; }, next: () => f.getc() });
export const vsscanf = (s, fmt, va) => scan(strSource(s), fmt, va);
export const sscanf = (s, fmt, ...args) => scan(strSource(s), fmt, new VaList(args));
export const vfscanf = (f, fmt, va) => scan(fileSource(f), fmt, va);
export const fscanf = (f, fmt, ...args) => scan(fileSource(f), fmt, new VaList(args));
