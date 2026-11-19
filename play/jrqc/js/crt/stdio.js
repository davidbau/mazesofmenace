// js/crt/stdio.js: <stdio.h> (transpiler-design.md 5). Hand-written runtime.
// A FILE is a standard stream (bytes go to a sink the host sets) or a stream
// over a file-system node (fs.js). Buffering is not modeled: every write
// reaches the node at once, and a stream's file is flushed to storage when it
// is closed (and on fflush), which is when C's data would be on disk too.
import { VaList } from './va.js';
import { cformat } from './printf.js';
import { Ptr, cstrlen, cstrToJs } from './mem.js';
import { CTrap } from './int.js';
import { serialize, deserialize } from './serial.js';

export class FILE {
    constructor(name) { this.name = name; this.sink = null; this.err = 0; this.eof = 0; this.node = null; this.path = null; this.pos = 0; this.rd = false; this.wr = false; this.append = false; this.unget = -1; this.fd = -1; this.closed = false; }
    write(bytes) {
        if (this.node) {
            if (!this.wr) { this.err = 1; return 0; }
            if (this.append) this.pos = this.node.size;
            this.node.writeAt(this.pos, bytes);
            this.pos += bytes.length;
            return bytes.length;
        }
        if (this.sink) this.sink(bytes);
        return bytes.length;
    }
    /** Next byte or -1 (EOF). */
    getc() {
        if (this.unget >= 0) { const c = this.unget; this.unget = -1; return c; }
        if (!this.node || !this.rd) { this.err = this.node ? 1 : this.err; if (!this.node) throw new CTrap(`read from ${this.name}`); return -1; }
        if (this.pos >= this.node.size) { this.eof = 1; return -1; }
        return this.node.data[this.pos++];
    }
}
export const stdout = new FILE('stdout');
export const stderr = new FILE('stderr');
export const stdin = new FILE('stdin');
stdin.fd = 0; stdout.fd = 1; stderr.fd = 2;
export const __stdoutp = stdout, __stderrp = stderr, __stdinp = stdin;   // Darwin's names behind the macros
export const EOF = -1;

/** Route a stream's output: fn(Uint8Array) or null (discard). */
export function setSink(f, fn) { f.sink = fn; }

const bytesOf = (p) => p.buf.subarray(p.off, p.off + cstrlen(p));
const toU8 = (b) => (b instanceof Uint8Array ? b : new Uint8Array(b.buffer, b.byteOffset, b.byteLength));

export function vfprintf(f, fmt, va) { const b = cformat(fmt, va); f.write(b); return b.length; }
export const fprintf = (f, fmt, ...args) => vfprintf(f, fmt, new VaList(args));
export const printf = (fmt, ...args) => vfprintf(stdout, fmt, new VaList(args));
export const vprintf = (fmt, va) => vfprintf(stdout, fmt, va);
export const __builtin___fprintf_chk = (f, _flag, fmt, ...args) => vfprintf(f, fmt, new VaList(args));
export const __builtin___printf_chk = (_flag, fmt, ...args) => vfprintf(stdout, fmt, new VaList(args));
export const __builtin___vfprintf_chk = (f, _flag, fmt, va) => vfprintf(f, fmt, va);
export function fputs(s, f) { f.write(toU8(bytesOf(s)).slice()); return 0; }
export function puts(s) { stdout.write(toU8(bytesOf(s)).slice()); stdout.write(Uint8Array.of(10)); return 0; }
export function fputc(c, f) { f.write(Uint8Array.of(c & 0xff)); return c & 0xff; }
export const putc = fputc;
export const putchar = (c) => fputc(c, stdout);
export const ferror = (f) => f.err;
export const feof = (f) => f.eof;
export function clearerr(f) { f.err = 0; f.eof = 0; }
export const setvbuf = () => 0;
export const setbuf = () => {};
export const setlinebuf = () => 0;

// ---------- process-level globals NetHack references ----------
/** errno: <errno.h> defines it as (*__error()). */
const errnoBox = new Int32Array(1);
export const __error = () => new Ptr(errnoBox, 0);
/**
 * Libc scalar variables C code may read or assign (generated code: $c.$libc.name):
 * errno (when declared directly), termcap's ospeed (unixtty.c), environ (report.c).
 */
export const $libc = { get errno() { return errnoBox[0]; }, set errno(v) { errnoBox[0] = v; }, ospeed: 0, environ: null };

// ---------- file streams (over fs.js nodes; fs.js is loaded lazily to avoid an import cycle) ----------
let fs = null;
export function setFs(m) { fs = m; }
const openStreams = new Set();
/** Close every stream (end of a run). */
export function resetStdio() { openStreams.clear(); for (const f of [stdout, stderr, stdin]) { f.err = 0; f.eof = 0; f.unget = -1; } }

function modeFlags(mode) {
    const m = cstrToJs(mode);
    const plus = m.includes('+');
    const O = fs.O;
    switch (m[0]) {
    case 'r': return { flags: plus ? O.RDWR : O.RDONLY, rd: true, wr: plus, append: false };
    case 'w': return { flags: (plus ? O.RDWR : O.WRONLY) | O.CREAT | O.TRUNC, rd: plus, wr: true, append: false };
    case 'a': return { flags: (plus ? O.RDWR : O.WRONLY) | O.CREAT | O.APPEND, rd: plus, wr: true, append: true };
    default: return null;
    }
}
export function fopen(path, mode) {
    const mf = modeFlags(mode);
    if (!mf) { $libc.errno = 22; return null; }
    const p = fs.absPath(path);
    const r = fs.openNode(p, mf.flags);
    if (typeof r === 'number') { $libc.errno = -r; return null; }
    const f = new FILE(p);
    f.node = r.node; f.path = p; f.rd = mf.rd; f.wr = mf.wr; f.append = mf.append;
    openStreams.add(f);
    return f;
}
export function freopen(path, mode, f) {
    if (f && f.node) fclose(f);
    const g = fopen(path, mode);
    if (!g || !f) return g;
    Object.assign(f, g, { name: f.name });
    openStreams.delete(g); openStreams.add(f);
    return f;
}
export function fdopen(fd, mode) {
    const d = fs.fsState.fds[fd];
    if (!d || !d.node) { $libc.errno = 9; return null; }
    const mf = modeFlags(mode);
    const f = new FILE(d.path);
    f.node = d.node; f.path = d.path; f.rd = mf.rd; f.wr = mf.wr; f.append = mf.append; f.fd = fd;
    // the stream has no position of its own: it reads and writes at the descriptor's file
    // offset, which write(fd)/lseek(fd) also move (sfstruct.c bufon, then bwrite through either)
    Object.defineProperty(f, 'pos', { get: () => d.pos, set: (v) => { d.pos = v; }, configurable: true });
    openStreams.add(f);
    return f;
}
export const fileno = (f) => f.fd;
export function fclose(f) {
    if (!f || f.closed) return -1;
    if (f.node) fs.flushNode(f.path, f.node);
    if (f.fd >= 3) fs.close(f.fd);
    f.closed = true;
    openStreams.delete(f);
    return 0;
}
export function fflush(f) {
    if (f === null) { for (const s of openStreams) if (s.node) fs.flushNode(s.path, s.node); return 0; }
    if (f.node) fs.flushNode(f.path, f.node);
    return 0;
}
export const fgetc = (f) => f.getc();
export const getc = fgetc;
export function ungetc(c, f) { if (c === -1) return -1; f.unget = c & 0xff; f.eof = 0; return c & 0xff; }
export function fgets(buf, n, f) {
    n = Number(n);
    if (n <= 0) return null;
    let i = 0;
    while (i < n - 1) {
        const c = f.getc();
        if (c < 0) break;
        buf.set(i++, c << 24 >> 24);
        if (c === 10) break;
    }
    if (i === 0) return null;
    buf.set(i, 0);
    return buf;
}
export function fread(p, size, nmemb, f) {
    size = Number(size); nmemb = Number(nmemb);
    const total = size * nmemb;
    if (!total) return 0;
    // records, scalar fields and pointer arrays: through save-file bytes (serial.js)
    const bytes = p instanceof Ptr && ArrayBuffer.isView(p.buf);
    const dst = bytes ? new Uint8Array(p.buf.buffer, p.buf.byteOffset + p.off * p.buf.BYTES_PER_ELEMENT, total) : new Uint8Array(total);
    let k = 0;
    if (f.unget >= 0) { dst[k++] = f.unget; f.unget = -1; }
    const avail = Math.max(0, f.node.size - f.pos);
    const m = Math.min(total - k, avail);
    dst.set(f.node.data.subarray(f.pos, f.pos + m), k);
    f.pos += m; k += m;
    if (k < total) f.eof = 1;
    if (!bytes) deserialize(p, dst);
    return Math.floor(k / size);
}
export function fwrite(p, size, nmemb, f) {
    size = Number(size); nmemb = Number(nmemb);
    const total = size * nmemb;
    if (!total) return 0;
    if (!(p instanceof Ptr) || !ArrayBuffer.isView(p.buf)) { f.write(serialize(p, total)); return nmemb; }   // records etc.: serial.js
    f.write(new Uint8Array(p.buf.buffer, p.buf.byteOffset + p.off * p.buf.BYTES_PER_ELEMENT, total).slice());
    return nmemb;
}
export function fseek(f, off, whence) {
    if (!f.node) return -1;
    off = Number(off);
    const p = whence === 0 ? off : whence === 1 ? f.pos + off : f.node.size + off;
    if (p < 0) { $libc.errno = 22; return -1; }
    f.pos = p; f.eof = 0; f.unget = -1;
    return 0;
}
export const ftell = (f) => (f.node ? f.pos - (f.unget >= 0 ? 1 : 0) : -1);
export function rewind(f) { fseek(f, 0, 0); f.err = 0; }
export function perror(s) {
    const msg = `${s && cstrlen(s) ? cstrToJs(s) + ': ' : ''}${strerrorText($libc.errno)}\n`;
    stderr.write(Uint8Array.from(msg, (c) => c.charCodeAt(0)));
}

// ---------- strerror (Darwin messages) ----------
const ERRS = { 0: 'Undefined error: 0', 1: 'Operation not permitted', 2: 'No such file or directory', 9: 'Bad file descriptor', 10: 'No child processes',
    13: 'Permission denied', 17: 'File exists', 20: 'Not a directory', 21: 'Is a directory', 22: 'Invalid argument', 25: 'Inappropriate ioctl for device',
    34: 'Result too large', 78: 'Function not implemented' };
const strerrorText = (e) => ERRS[e] || `Unknown error: ${e}`;
const errStrs = new Map();
export function strerror(e) {
    let p = errStrs.get(e);
    if (!p) { const s = strerrorText(e); p = new Ptr(Int8Array.from(s + '\0', (c) => c.charCodeAt(0)), 0); errStrs.set(e, p); }
    return p;
}
