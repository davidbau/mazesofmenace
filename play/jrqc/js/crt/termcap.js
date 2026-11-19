// js/crt/termcap.js: the ncurses termcap interface NetHack's tty port uses
// (win/tty/termcap.c, linked -lncurses). Hand-written runtime.
//
// The entry is TERM=xterm-256color as macOS ncurses returns it (the recorder
// environment, docs/recording-environment.md). Values were measured with a C
// program calling tgetent/tgetstr/tgetnum/tgetflag on macOS 15.8.1 (arm64);
// ncurses hands back terminfo-syntax strings (cm = "\E[%i%p1%d;%p2%dH"), which
// tgoto and tparm interpret. The screen itself is captured from the nomux
// shadow buffer, so these strings only reach the (discarded) stdout stream,
// but NetHack's logic tests them (presence, strlen), so they are exact.
import { Ptr, cstrToJs } from './mem.js';
import { CTrap } from './int.js';

const E = '\x1b';
const STR = {
    le: '\x08', ho: `${E}[H`, nd: `${E}[C`, ce: `${E}[K`, up: `${E}[A`, cm: `${E}[%i%p1%d;%p2%dH`,
    so: `${E}[7m`, se: `${E}[27m`, us: `${E}[4m`, ue: `${E}[24m`, ZH: `${E}[3m`, ZR: `${E}[23m`,
    ti: `${E}[?1049h`, te: `${E}[?1049l`, ks: `${E}[?1h${E}=`, ke: `${E}[?1l${E}>`,
    mr: `${E}[7m`, mb: `${E}[5m`, md: `${E}[1m`, mh: `${E}[2m`, me: `${E}[0m`,
    vi: `${E}[?25l`, ve: `${E}[?12l${E}[?25h`, vs: `${E}[?12;25h`,
    Ic: `${E}]4;%p1%d;rgb:%p2%{255}%*%{1000}%/%2.2X/%p3%{255}%*%{1000}%/%2.2X/%p4%{255}%*%{1000}%/%2.2X${E}\\`,
    as: `${E}(0`, ae: `${E}(B`, cd: `${E}[J`, cl: `${E}[H${E}[2J`,
    AF: `${E}[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38;5;%p1%d%;m`,
    do: '\n', cr: '\r', bl: '\x07', ta: '\t', sf: '\n', sc: `${E}7`, rc: `${E}8`,
};
const NUM = { co: 80, li: 24, sg: -1, Co: 256, it: 8 };
const FLAG = new Set(['am', 'bs', 'km', 'mi', 'ms', 'xn']);

const strPtrs = new Map();
function cstr(s) {
    let p = strPtrs.get(s);
    if (!p) { p = new Ptr(Int8Array.from(s + '\0', (c) => c.charCodeAt(0) << 24 >> 24), 0); strPtrs.set(s, p); }
    return p;
}
const jsOf = (p) => cstrToJs(p);

export const tgetent = (_bp, name) => (cstrToJs(name) === 'xterm-256color' ? 1 : 0);
export const tgetnum = (id) => NUM[jsOf(id)] ?? -1;
export const tgetflag = (id) => (FLAG.has(jsOf(id)) ? 1 : 0);
/** tgetstr(id, area): the capability, copied into *area (advanced past it) when area is given. */
export function tgetstr(id, area) {
    const s = STR[jsOf(id)];
    if (s === undefined) return null;
    if (!area) return cstr(s);
    const a = area.get(0);
    for (let i = 0; i < s.length; i++) a.set(i, s.charCodeAt(i) << 24 >> 24);
    a.set(s.length, 0);
    area.set(0, a.add(s.length + 1));
    return a;
}

// ---------- terminfo parameter strings (tparm, tgoto) ----------
function tparmJs(fmt, params) {
    const p = params.map((x) => Number(x) | 0);
    while (p.length < 9) p.push(0);
    const stack = [];
    const vars = {};
    let out = '';
    const pop = () => (stack.length ? stack.pop() : 0);
    let i = 0;
    // skip to the matching %e or %; at the current nesting level
    const skip = (toElse) => {
        let depth = 0;
        while (i < fmt.length) {
            if (fmt[i] === '%' && i + 1 < fmt.length) {
                const c = fmt[i + 1]; i += 2;
                if (c === '?') depth++;
                else if (c === ';') { if (depth === 0) return; depth--; }
                else if (c === 'e' && toElse && depth === 0) return;
            } else i++;
        }
    };
    while (i < fmt.length) {
        const ch = fmt[i++];
        if (ch !== '%') { out += ch; continue; }
        const m = /^(:[-+# ]+|[+# ]*)(\d+)?(?:\.(\d+))?([doxXs])/.exec(fmt.slice(i));
        if (m && (m[1] || m[2] || m[3])) {
            i += m[0].length;
            const conv = m[4];
            const fm = [null, m[1].replace(/^:/, ''), m[2], m[3]];
            const v = pop();
            let s = conv === 'x' ? (v >>> 0).toString(16) : conv === 'X' ? (v >>> 0).toString(16).toUpperCase() : conv === 'o' ? (v >>> 0).toString(8) : String(v);
            if (fm[3]) s = s.padStart(Number(fm[3]), '0');
            if (fm[2]) s = fm[1].includes('-') ? s.padEnd(Number(fm[2])) : s.padStart(Number(fm[2]));
            out += s;
            continue;
        }
        const c = fmt[i++];
        switch (c) {
        case '%': out += '%'; break;
        case 'd': out += String(pop()); break;
        case 'o': out += (pop() >>> 0).toString(8); break;
        case 'x': out += (pop() >>> 0).toString(16); break;
        case 'X': out += (pop() >>> 0).toString(16).toUpperCase(); break;
        case 's': out += String(pop()); break;
        case 'c': out += String.fromCharCode(pop() & 0xff); break;
        case 'p': stack.push(p[Number(fmt[i++]) - 1]); break;
        case 'P': vars[fmt[i++]] = pop(); break;
        case 'g': stack.push(vars[fmt[i++]] || 0); break;
        case "'": stack.push(fmt.charCodeAt(i)); i += 2; break;
        case '{': { const j = fmt.indexOf('}', i); stack.push(Number(fmt.slice(i, j))); i = j + 1; break; }
        case 'l': stack.push(String(pop()).length); break;
        case '+': { const b = pop(), a = pop(); stack.push((a + b) | 0); break; }
        case '-': { const b = pop(), a = pop(); stack.push((a - b) | 0); break; }
        case '*': { const b = pop(), a = pop(); stack.push(Math.imul(a, b)); break; }
        case '/': { const b = pop(), a = pop(); stack.push(b ? (a / b) | 0 : 0); break; }
        case 'm': { const b = pop(), a = pop(); stack.push(b ? a % b : 0); break; }
        case '&': { const b = pop(), a = pop(); stack.push(a & b); break; }
        case '|': { const b = pop(), a = pop(); stack.push(a | b); break; }
        case '^': { const b = pop(), a = pop(); stack.push(a ^ b); break; }
        case '=': { const b = pop(), a = pop(); stack.push(a === b ? 1 : 0); break; }
        case '>': { const b = pop(), a = pop(); stack.push(a > b ? 1 : 0); break; }
        case '<': { const b = pop(), a = pop(); stack.push(a < b ? 1 : 0); break; }
        case 'A': { const b = pop(), a = pop(); stack.push(a && b ? 1 : 0); break; }
        case 'O': { const b = pop(), a = pop(); stack.push(a || b ? 1 : 0); break; }
        case '!': stack.push(pop() ? 0 : 1); break;
        case '~': stack.push(~pop()); break;
        case 'i': p[0]++; p[1]++; break;
        case '?': break;
        case 't': if (!pop()) skip(true); break;
        case 'e': skip(false); break;
        case ';': break;
        default: throw new CTrap(`tparm: %${c} in ${JSON.stringify(fmt)}`);
        }
    }
    return out;
}
// ncurses returns a static buffer, overwritten by the next call
const tparmBuf = new Int8Array(4096);
function toStatic(s) {
    for (let i = 0; i < s.length; i++) tparmBuf[i] = s.charCodeAt(i) << 24 >> 24;
    tparmBuf[s.length] = 0;
    return new Ptr(tparmBuf, 0);
}
export const tparm = (fmt, ...args) => toStatic(tparmJs(cstrToJs(fmt), args));
export const tiparm = tparm;
/** tgoto(cap, col, row): ncurses passes (row, col) to the terminfo string. */
export const tgoto = (cap, col, row) => toStatic(tparmJs(cstrToJs(cap), [row, col]));
/** tputs: each byte to outc (padding "$<n>" is dropped: no delays). */
export function tputs(str, _affcnt, outc) {
    if (!str) return -1;
    const s = cstrToJs(str).replace(/\$<[\d.*/]+>/g, '');
    for (let i = 0; i < s.length; i++) outc(s.charCodeAt(i));
    return 0;
}
export const $tparmForTest = tparmJs;
