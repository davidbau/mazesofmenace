// js/crt/fs.js: the file system the C program sees (method/design.md 5, 8.1).
// Hand-written runtime.
//
// Layers, by path:
//   - devices registered by the glue (the RNG log file: writes go to a sink);
//   - files written during this run (an in-memory node cache);
//   - persistent files in input.storage (frozen js/storage.js VFS: saves, bones,
//     record, logfile), as latin1 strings, one key per absolute path;
//   - read-only embedded data files (the recorder's install directory: Lua
//     scripts, makedefs output, sysconf ...), registered by the glue.
// A written file is flushed to storage when closed. POSIX fd calls and the
// FILE functions in stdio.js both work on these nodes.
import { CTrap, i64 } from './int.js';
import { Ptr, FieldRef, cstrToJs } from './mem.js';
import { $libc, stdout, stderr } from './stdio.js';
import { bytesView } from './string.js';
import { serialize, deserialize } from './serial.js';
import { proc } from './proc.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile, vfsListFiles } from '../storage.js';

const ENOENT = 2, EBADF = 9, EACCES = 13, EEXIST = 17, ENOTDIR = 20, EISDIR = 21, EINVAL = 22;
export const O = { RDONLY: 0, WRONLY: 1, RDWR: 2, APPEND: 0x8, CREAT: 0x200, TRUNC: 0x400, EXCL: 0x800 };
const S_IFREG = 0o100000, S_IFDIR = 0o040000;

class Node {
    constructor(bytes, { persist = true, sink = null, readonly = false } = {}) {
        this.data = bytes || new Uint8Array(0); this.size = this.data.length;
        this.persist = persist; this.sink = sink; this.readonly = readonly; this.dirty = false;
        this.ino = ++fsState.ino;
    }
    bytes() { return this.data.subarray(0, this.size); }
    writeAt(pos, src) {
        if (this.sink) { this.sink(src); return; }
        const end = pos + src.length;
        if (end > this.data.length) { const d = new Uint8Array(Math.max(end, this.data.length * 2, 256)); d.set(this.bytes()); this.data = d; }
        if (pos > this.size) this.data.fill(0, this.size, pos);
        this.data.set(src, pos);
        if (end > this.size) this.size = end;
        this.dirty = true;
    }
    truncate() { this.size = 0; this.dirty = true; }
}

export const fsState = { nodes: new Map(), devices: new Map(), data: new Map(), dataDirs: new Set(), ino: 1000, fds: [] };

/** Reset per run: data files and devices are registered again by the glue. */
export function resetFs() {
    fsState.nodes = new Map(); fsState.devices = new Map(); fsState.data = new Map(); fsState.dataDirs = new Set();
    fsState.fds = [{ std: 0 }, { std: 1 }, { std: 2 }];
}
/** Read-only data files: dir (absolute) and name -> Uint8Array or () => Uint8Array. */
export function mountData(dir, files) {
    dir = dir.replace(/\/$/, '');
    fsState.dataDirs.add(dir);
    for (const [name, b] of files) fsState.data.set(`${dir}/${name}`, b);
}
/** A write-only device (path -> sink(Uint8Array)). */
export function mountDevice(path, sink) { fsState.devices.set(path, sink); }

export function absPath(p) {
    let s = typeof p === 'string' ? p : cstrToJs(p);
    if (!s.startsWith('/')) s = `${proc.cwd.replace(/\/$/, '')}/${s}`;
    const out = [];
    for (const part of s.split('/')) {
        if (part === '' || part === '.') continue;
        if (part === '..') out.pop(); else out.push(part);
    }
    return '/' + out.join('/');
}
const latin1ToBytes = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff; return b; };
const bytesToLatin1 = (b) => { let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return s; };

/** The node at absolute path, or null. */
export function lookup(path) {
    if (fsState.devices.has(path)) return new Node(null, { persist: false, sink: fsState.devices.get(path) });
    if (path === '/dev/null') return new Node(null, { persist: false, sink: () => {} });
    let n = fsState.nodes.get(path);
    if (n) return n;
    const s = vfsReadFile(path);
    if (s !== null && s !== undefined) n = new Node(latin1ToBytes(s));
    else if (fsState.data.has(path)) {
        let b = fsState.data.get(path);
        if (typeof b === 'function') b = b();
        n = new Node(b.slice(), { persist: false });
    }
    if (n) fsState.nodes.set(path, n);
    return n || null;
}
function isDir(path) {
    if (fsState.dataDirs.has(path) || path === '/') return true;
    const pre = path + '/';
    for (const k of fsState.data.keys()) if (k.startsWith(pre)) return true;
    for (const k of fsState.nodes.keys()) if (k.startsWith(pre)) return true;
    try { if (vfsListFiles(pre).length) return true; } catch { /* no storage */ }
    // the HOME and data directories exist even when empty
    return path === absPath(proc.env.get('HOME') || '/') || [...fsState.dataDirs].some((d) => d.startsWith(pre));
}
function create(path) {
    const n = new Node(new Uint8Array(0));
    n.dirty = true;
    fsState.nodes.set(path, n);
    return n;
}
export function flushNode(path, n) {
    if (!n.persist || !n.dirty || n.sink) return;
    vfsWriteFile(path, bytesToLatin1(n.bytes()));
    n.dirty = false;
}
const err = (e) => { $libc.errno = e; return -1; };

/** Open by flags: { node, path } or a negative errno. */
export function openNode(path, flags) {
    let n = lookup(path);
    const acc = flags & 3;
    if (n && (flags & O.CREAT) && (flags & O.EXCL)) return -EEXIST;
    if (!n) {
        if (isDir(path)) return acc === O.RDONLY ? -EISDIR : -EISDIR;
        if (!(flags & O.CREAT)) return -ENOENT;
        const dir = path.slice(0, path.lastIndexOf('/')) || '/';
        if (!isDir(dir) && !fsState.dataDirs.has(dir)) {
            // directories are implicit: accept any directory under HOME or a data directory
            if (![...fsState.dataDirs].some((d) => dir.startsWith(d)) && !dir.startsWith(absPath(proc.env.get('HOME') || '/'))) return -ENOENT;
        }
        n = create(path);
    } else if (acc !== O.RDONLY && fsState.data.has(path) && vfsReadFile(path) === null) {
        n.persist = true;   // a data-directory file being rewritten (record, logfile): from now on in storage
    }
    if ((flags & O.TRUNC) && acc !== O.RDONLY) n.truncate();
    return { node: n, path };
}

// ---------- POSIX fd calls ----------
function fdOf(fd) { const f = fsState.fds[fd]; return f && !f.closed ? f : null; }
export function open(path, flags, _mode) {
    const r = openNode(absPath(path), flags);
    if (typeof r === 'number') return err(-r);
    const fd = fsState.fds.length;
    fsState.fds.push({ node: r.node, path: r.path, pos: 0, flags });
    return fd;
}
export const creat = (path, mode) => open(path, O.WRONLY | O.CREAT | O.TRUNC, mode);
export function close(fd) {
    const f = fdOf(fd);
    if (!f) return err(EBADF);
    if (f.node) flushNode(f.path, f.node);
    f.closed = true;
    return 0;
}
/** Bytes at a buffer pointer: typed-array Ptrs only (records go through save-file serializers). */
function bufBytes(buf, n) {
    if (buf instanceof Ptr && ArrayBuffer.isView(buf.buf)) return bytesView(buf, n);
    // records, scalar fields, pointer arrays: their save-file bytes (serial.js); $store puts read bytes back
    const view = serialize(buf, n);
    view.$store = () => deserialize(buf, view);
    return view;
}
export function read(fd, buf, n) {
    n = Number(n);
    const f = fdOf(fd);
    if (!f) return err(EBADF);
    if (f.std !== undefined) throw new CTrap('read() from a standard stream');
    const src = f.node.bytes();
    const k = Math.max(0, Math.min(n, src.length - f.pos));
    const dst = bufBytes(buf, buf instanceof Ptr && ArrayBuffer.isView(buf.buf) ? k : n);
    dst.set(src.subarray(f.pos, f.pos + k));
    if (dst.$store) dst.$store();
    f.pos += k;
    return k;
}
export function write(fd, buf, n) {
    n = Number(n);
    const f = fdOf(fd);
    if (!f) return err(EBADF);
    const b = bufBytes(buf, n);
    if (f.std !== undefined) { (f.std === 2 ? stderr : stdout).write(b.slice()); return n; }
    if (f.flags & O.APPEND) f.pos = f.node.size;
    f.node.writeAt(f.pos, b.slice());
    f.pos += n;
    return n;
}
export function lseek(fd, off, whence) {
    const f = fdOf(fd);
    if (!f || !f.node) return err(EBADF);
    off = Number(off);
    const p = whence === 0 ? off : whence === 1 ? f.pos + off : f.node.size + off;
    if (p < 0) return err(EINVAL);
    f.pos = p;
    return p;
}
export const fcntl = () => 0;   // locks always succeed (one process)
export function unlink(path) {
    const p = absPath(path);
    const n = lookup(p);
    if (!n) return err(ENOENT);
    fsState.nodes.delete(p);
    vfsDeleteFile(p);
    if (fsState.data.has(p)) fsState.data.delete(p);
    return 0;
}
export function rename(from, to) {
    const a = absPath(from), b = absPath(to);
    const n = lookup(a);
    if (!n) return err(ENOENT);
    fsState.nodes.delete(a);
    vfsDeleteFile(a);
    fsState.data.delete(a);
    n.persist = true; n.dirty = true;
    fsState.nodes.set(b, n);
    flushNode(b, n);
    return 0;
}
export function access(path, _mode) {
    const p = absPath(path);
    return lookup(p) || isDir(p) ? 0 : err(ENOENT);
}
function fillStat(st, n, dir) {
    const set = (k, v) => { if (k in st) st[k] = v; };
    set('st_mode', dir ? S_IFDIR | 0o755 : S_IFREG | 0o644);
    set('st_size', dir ? 64 : n.size);
    set('st_ino', dir ? 2 : n.ino);
    set('st_dev', 16777220);
    set('st_nlink', 1);
    set('st_uid', proc.uid); set('st_gid', proc.gid);
    for (const k of ['st_atimespec', 'st_mtimespec', 'st_ctimespec', 'st_birthtimespec']) if (st[k] && 'tv_sec' in st[k]) st[k].tv_sec = 0;
    return 0;
}
export function stat(path, st) {
    const p = absPath(path);
    const n = lookup(p);
    if (n) return fillStat(st, n, false);
    if (isDir(p)) return fillStat(st, null, true);
    return err(ENOENT);
}
export const lstat = stat;
export function fstat(fd, st) {
    const f = fdOf(fd);
    if (!f) return err(EBADF);
    if (f.std !== undefined) return fillStat(st, { size: 0, ino: 3 + f.std }, false);
    return fillStat(st, f.node, false);
}
export const chmod = () => 0;
export function chdir(path) {
    const p = absPath(path);
    if (!isDir(p)) return err(ENOENT);
    proc.cwd = p;
    return 0;
}
export function getcwd(buf, size) {
    const s = proc.cwd;
    if (s.length + 1 > Number(size)) { $libc.errno = 34; return null; }
    for (let i = 0; i < s.length; i++) buf.set(i, s.charCodeAt(i) << 24 >> 24);
    buf.set(s.length, 0);
    return buf;
}

// ---------- directories ----------
/** DIR *: the entry names at opendir time. struct dirent is a plain object (record pointers are objects). */
export function opendir(path) {
    const p = absPath(path);
    if (!isDir(p)) { $libc.errno = lookup(p) ? ENOTDIR : ENOENT; return null; }
    const pre = p.replace(/\/$/, '') + '/';
    const names = new Set();
    const add = (k) => { if (k.startsWith(pre)) { const rest = k.slice(pre.length); if (rest && !rest.includes('/')) names.add(rest); } };
    for (const k of fsState.data.keys()) add(k);
    for (const k of fsState.nodes.keys()) add(k);
    try { for (const k of vfsListFiles(pre)) add(k.startsWith('/') ? k : pre + k); } catch { /* no storage */ }
    return { names: ['.', '..', ...[...names].sort()], i: 0 };
}
export function readdir(d) {
    if (d.i >= d.names.length) return null;
    const name = d.names[d.i++];
    const b = new Int8Array(1024);
    for (let i = 0; i < name.length; i++) b[i] = name.charCodeAt(i) << 24 >> 24;
    return { d_ino: 1, d_seekoff: 0, d_reclen: 0, d_namlen: name.length, d_type: name === '.' || name === '..' ? 4 : 8, d_name: b };
}
export const closedir = () => 0;
export { EACCES };
/** A file that exists for this run only (the segment's $HOME/.nethackrc, written by the harness). */
export function putFile(path, text) {
    const n = new Node(latin1ToBytes(text), { persist: false });
    fsState.nodes.set(path, n);
}
