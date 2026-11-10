/* Standalone regular-file/directory filesystem for the JavaScript runtime.
 * Core descriptors are numeric; .FS supplies the stream-object facade used by
 * the replay adapter and codec bridge. All bytes/inodes/descriptors/cwd belong
 * to one instance. Open descriptors retain inode identity after unlink/rename.
 * No host filesystem, Node, Wasm, network or implicit global storage is used.
 *
 * Configured Emscripten/WASI errno and Linux-style O_* values are explicit.
 * Directory stat metadata follows MEMFS (size4096/nlink1/uid0/gid0). Creation,
 * traversal and open enforce MEMFS's any-user read/write/execute bit checks;
 * user identities, chmod/chown/ACLs, sockets/devices/symlinks/hard links,
 * descriptor duplication, locks and mounts are outside this service. Unknown
 * flags and unsupported operations fail explicitly. File/descriptor limits
 * are configurable resource bounds, not claims about native allocation limits.
 *
 * Snapshots preserve linked directory/file state and cwd, not live descriptors
 * or unlinked open files. Storage is injected and persistence is explicit.
 * The adapter's baseline diff, transient filtering and save/bones policy stay
 * outside this filesystem. Default timestamps are deterministic zero; inject
 * a millisecond clock when timestamp progression is needed.
 */

export const VFS_ERRNO = Object.freeze({ EACCES: 2, EBADF: 8, EBUSY: 10,
  EEXIST: 20, EFBIG: 22, EINVAL: 28, EIO: 29, EISDIR: 31, EMFILE: 33,
  ENAMETOOLONG: 37, ENOENT: 44, ENOMEM: 48, ENOSPC: 51, ENOTDIR: 54,
  ENOTEMPTY: 55, ENOTSUP: 58, EPERM: 63, EROFS: 69, ESPIPE: 70 });
export const O_RDONLY = 0, O_WRONLY = 1, O_RDWR = 2, O_CREAT = 64, O_EXCL = 128;
export const O_TRUNC = 512, O_APPEND = 1024, O_DIRECTORY = 65536;
export const SEEK_SET = 0, SEEK_CUR = 1, SEEK_END = 2;
const S_IFDIR = 0o040000, S_IFREG = 0o100000, S_IFMT = 0o170000;
const flagStrings = { r: 0, 'r+': 2, w: 577, 'w+': 578, a: 1089, 'a+': 1090,
  wx: 705, 'wx+': 706, ax: 1217, 'ax+': 1218 };

export class VFSError extends Error {
  constructor(code, path) {
    const errno = typeof code === 'number' ? code : VFS_ERRNO[code];
    const symbolic = typeof code === 'number' ? Object.keys(VFS_ERRNO).find(name => VFS_ERRNO[name] === code) ?? 'UNKNOWN' : code;
    super(path === undefined ? symbolic : `${symbolic}: ${path}`);
    this.name = 'VFSError'; this.code = symbolic; this.errno = errno;
  }
}
const fail = (code, path) => { throw new VFSError(code, path); };
const integer = n => Number.isSafeInteger(n);
export const isDir = mode => (mode & S_IFMT) === S_IFDIR;
export const isFile = mode => (mode & S_IFMT) === S_IFREG;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encode(bytes) {
  const parts = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const value = bytes[i] * 65536 + (bytes[i + 1] || 0) * 256 + (bytes[i + 2] || 0);
    parts.push(alphabet[value >>> 18] + alphabet[value >>> 12 & 63]
      + (i + 1 < bytes.length ? alphabet[value >>> 6 & 63] : '=')
      + (i + 2 < bytes.length ? alphabet[value & 63] : '='));
  }
  return parts.join('');
}
function decode(value, maximum) {
  if (typeof value !== 'string' || value.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
    fail('EINVAL');
  const length = value.length / 4 * 3 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  if (length > maximum) fail('EFBIG');
  const bytes = new Uint8Array(length);
  for (let i = 0, at = 0; i < value.length; i += 4) {
    const n = alphabet.indexOf(value[i]) * 262144 + alphabet.indexOf(value[i + 1]) * 4096
      + Math.max(0, alphabet.indexOf(value[i + 2])) * 64 + Math.max(0, alphabet.indexOf(value[i + 3]));
    if (at < length) bytes[at++] = n >>> 16;
    if (at < length) bytes[at++] = n >>> 8;
    if (at < length) bytes[at++] = n;
  }
  if (encode(bytes) !== value) fail('EINVAL'); // Reject noncanonical pad bits.
  return bytes;
}

export class CVFS {
  constructor({ clock = () => 0, maximumFileBytes = 64 * 1024 * 1024,
    maximumDescriptors = 4096, storage = null, persistenceKey = 'teleport-js-vfs-v1', ignorePermissions = false } = {}) {
    if (typeof clock !== 'function' || !integer(maximumFileBytes) || maximumFileBytes < 0
      || !integer(maximumDescriptors) || maximumDescriptors < 1 || typeof persistenceKey !== 'string' || typeof ignorePermissions !== 'boolean')
      throw new TypeError('Invalid VFS configuration');
    this.clock = clock; this.maximumFileBytes = maximumFileBytes;
    this.maximumDescriptors = maximumDescriptors; this.storage = storage;
    this.ignorePermissions = ignorePermissions;
    this.persistenceKey = persistenceKey; this.nextInode = 1;
    this.descriptors = new Map(); this.currentPath = '/';
    this.root = this._node('dir', 0o777, null, ''); this.root.parent = this.root;
    this.FS = this.createMemfsFacade();
  }
  _now() {
    const value = this.clock();
    if (!Number.isFinite(value)) throw new TypeError('VFS clock must return milliseconds');
    return value;
  }
  _node(type, mode, parent, name) {
    if (!integer(mode) || mode < 0 || mode > 0o777) fail('ENOTSUP');
    const time = this._now();
    return { type, ino: this.nextInode++, mode: (type === 'dir' ? S_IFDIR : S_IFREG) | mode,
      parent, name, children: type === 'dir' ? new Map() : null,
      bytes: type === 'file' ? new Uint8Array(0) : null, atime: time, mtime: time, ctime: time };
  }
  _path(node) {
    const parts = [];
    while (node !== this.root) { parts.push(node.name); node = node.parent; }
    return '/' + parts.reverse().join('/');
  }
  _parts(path) {
    if (typeof path !== 'string') throw new TypeError('Expected VFS path string');
    if (!path) fail('ENOENT', path);
    if (path.includes('\0')) fail('EINVAL', path);
    if (!path.startsWith('/')) path = this.currentPath + '/' + path;
    const parts = path.split('/').filter(Boolean);
    return parts;
  }
  _walk(parts, missingLast = false) {
    let node = this.root;
    for (let i = 0; i < parts.length; ++i) {
      const part = parts[i];
      if (part === '.') continue;
      if (part === '..') { node = node.parent; continue; }
      if (node.type !== 'dir') fail('ENOTDIR');
      this._permissions(node, 'x');
      const next = node.children.get(part);
      if (!next) {
        if (missingLast && i === parts.length - 1) return null;
        fail('ENOENT');
      }
      node = next;
    }
    return node;
  }
  _lookup(path) { return this._walk(this._parts(path)); }
  _parent(path) {
    const parts = this._parts(path), name = parts.pop();
    if (!name) fail('EBUSY', path);
    const parent = this._walk(parts);
    if (parent.type !== 'dir') fail('ENOTDIR', path);
    return { parent, name };
  }
  _changed(node) { node.mtime = node.ctime = this._now(); }
  _permissions(node, requested) {
    if (this.ignorePermissions) return;
    for (const [letter, mask] of [['r', 0o444], ['w', 0o222], ['x', 0o111]])
      if (requested.includes(letter) && !(node.mode & mask)) fail('EACCES');
  }
  _descriptor(fd) {
    const descriptor = this.descriptors.get(fd);
    if (!descriptor) fail('EBADF');
    return descriptor;
  }
  _stat(node) {
    const size = node.type === 'dir' ? 4096 : node.bytes.length;
    return { dev: 1, ino: node.ino, mode: node.mode, nlink: 1, uid: 0, gid: 0, rdev: 0,
      size, blksize: 4096, blocks: Math.ceil(size / 4096),
      atime: new Date(node.atime), mtime: new Date(node.mtime), ctime: new Date(node.ctime) };
  }
  isDir(mode) { return isDir(mode); }
  isFile(mode) { return isFile(mode); }
  stat(path) { return this._stat(this._lookup(path)); }
  fstat(fd) { return this._stat(this._descriptor(fd).node); }
  cwd() { return this.currentPath; }
  chdir(path) {
    const node = this._lookup(path);
    if (node.type !== 'dir') fail('ENOTDIR', path);
    this._permissions(node, 'x');
    this.currentPath = this._path(node);
  }
  mkdir(path, mode = 0o777) {
    if (!this._parts(path).length) fail('EEXIST', path);
    const { parent, name } = this._parent(path);
    if (name === '.' || name === '..') fail('EEXIST', path);
    if (parent.children.has(name)) fail('EEXIST', path);
    this._permissions(parent, 'wx');
    const node = this._node('dir', mode, parent, name);
    parent.children.set(name, node); this._changed(parent);
  }
  mkdirTree(path, mode = 0o777) {
    const parts = this._parts(path);
    let node = this.root;
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') { node = node.parent; continue; }
      if (node.type !== 'dir') fail('ENOTDIR', path);
      this._permissions(node, 'x');
      let next = node.children.get(part);
      if (!next) {
        this._permissions(node, 'w');
        next = this._node('dir', mode, node, part); node.children.set(part, next); this._changed(node);
      }
      // Like FS.mkdirTree, tolerate EEXIST for a final existing file. A later
      // ordinary component still fails ENOTDIR rather than inventing a dir.
      node = next;
    }
  }
  readdir(path) {
    const node = this._lookup(path);
    if (node.type !== 'dir') fail('ENOTDIR', path);
    // MEMFS uses Object.keys: integer-like names precede other insertion-order names.
    return ['.', '..', ...Object.keys(Object.fromEntries([...node.children.keys()].map(name => [name, 0])))];
  }
  rmdir(path) {
    if (this._parts(path).length === 0) fail('EBUSY', path);
    const { parent, name } = this._parent(path), node = parent.children.get(name);
    if (!node) fail('ENOENT', path);
    this._permissions(parent, 'wx');
    if (node.type !== 'dir') fail('ENOTDIR', path);
    if (node === this.root || this._path(node) === this.currentPath) fail('EBUSY', path);
    if (node.children.size) fail('ENOTEMPTY', path);
    node.parent.children.delete(node.name); this._changed(node.parent);
  }
  unlink(path) {
    const { parent, name } = this._parent(path), node = parent.children.get(name);
    if (!node) fail('ENOENT', path);
    this._permissions(parent, 'wx');
    if (node.type === 'dir') fail('EISDIR', path);
    parent.children.delete(name); this._changed(parent);
  }
  rename(source, destination) {
    const from = this._parent(source), to = this._parent(destination);
    const node = from.parent.children.get(from.name), replaced = to.parent.children.get(to.name);
    if (!node) fail('ENOENT', source);
    const normalize = path => {
      const result = [];
      for (const part of this._parts(path)) {
        if (part === '..') result.pop();
        else if (part !== '.') result.push(part);
      }
      return '/' + result.join('/');
    };
    const ancestor = (parent, child) => parent === '/' || parent === child || child.startsWith(parent + '/');
    if (ancestor(normalize(source), this._path(to.parent))) fail('EINVAL', destination);
    if (ancestor(normalize(destination), this._path(from.parent))) fail('ENOTEMPTY', destination);
    if (node === replaced) return;
    this._permissions(from.parent, 'wx'); this._permissions(to.parent, 'wx');
    if (node.type === 'dir') {
      for (let parent = to.parent;; parent = parent.parent) {
        if (parent === node) fail('EINVAL', destination);
        if (parent === this.root) break;
      }
      if (this._path(node) === this.currentPath) fail('EBUSY', source);
    }
    if (replaced) {
      if (node.type === 'dir' && replaced.type !== 'dir') fail('ENOTDIR', destination);
      if (node.type !== 'dir' && replaced.type === 'dir') fail('EISDIR', destination);
      if (replaced.type === 'dir') {
        if (this._path(replaced) === this.currentPath) fail('EBUSY', destination);
        if (replaced.children.size) fail('ENOTEMPTY', destination);
      }
    }
    from.parent.children.delete(from.name); to.parent.children.set(to.name, node);
    this._changed(from.parent); this._changed(to.parent);
    node.parent = to.parent; node.name = to.name;
  }
  open(path, flags = O_RDONLY, mode = 0o666) {
    if (typeof flags === 'string') {
      if (!Object.hasOwn(flagStrings, flags)) fail('EINVAL');
      flags = flagStrings[flags];
    }
    const supported = 3 | O_CREAT | O_EXCL | O_TRUNC | O_APPEND | O_DIRECTORY;
    if (!integer(flags) || flags < 0 || flags > 0x7fffffff || flags & ~supported) fail('ENOTSUP');
    if ((flags & 3) === 3) fail('EINVAL');
    let node = this._walk(this._parts(path), true), created = false;
    if (flags & O_CREAT) {
      if (node && flags & O_EXCL) fail('EEXIST', path);
      if (!node) {
        if (path.endsWith('/')) fail('EISDIR', path);
        const { parent, name } = this._parent(path);
        this._permissions(parent, 'wx');
        node = this._node('file', mode, parent, name); parent.children.set(name, node); this._changed(parent);
        created = true;
      }
    }
    if (!node) fail('ENOENT', path);
    if (flags & O_DIRECTORY && node.type !== 'dir') fail('ENOTDIR', path);
    if (node.type === 'dir' && ((flags & 3) !== O_RDONLY || flags & (O_CREAT | O_TRUNC))) fail('EISDIR', path);
    if (!created) this._permissions(node, (flags & 3) === O_RDONLY ? flags & O_TRUNC ? 'rw' : 'r' : (flags & 3) === O_WRONLY ? 'w' : 'rw');
    if (flags & O_TRUNC) { node.bytes = new Uint8Array(0); this._changed(node); }
    let fd = 3;
    while (this.descriptors.has(fd)) ++fd;
    if (this.descriptors.size >= this.maximumDescriptors) fail('EMFILE');
    this.descriptors.set(fd, { node, flags, position: 0 });
    return fd;
  }
  close(fd) { this._descriptor(fd); this.descriptors.delete(fd); }
  _range(buffer, offset, length, position) {
    if (!(buffer instanceof Uint8Array)) throw new TypeError('Expected byte buffer');
    if (!integer(offset) || !integer(length) || offset < 0 || length < 0 || offset + length > buffer.length
      || position !== undefined && (!integer(position) || position < 0)) fail('EINVAL');
  }
  read(fd, buffer, offset = 0, length = buffer.length - offset, position) {
    this._range(buffer, offset, length, position);
    const stream = this._descriptor(fd);
    if ((stream.flags & 3) === O_WRONLY) fail('EBADF');
    if (stream.node.type === 'dir') fail('EISDIR');
    const at = position === undefined ? stream.position : position;
    const count = Math.max(0, Math.min(length, stream.node.bytes.length - at));
    buffer.set(stream.node.bytes.subarray(at, at + count), offset);
    if (position === undefined) stream.position += count;
    return count;
  }
  write(fd, buffer, offset = 0, length = buffer.length - offset, position) {
    this._range(buffer, offset, length, position);
    const stream = this._descriptor(fd), node = stream.node;
    if ((stream.flags & 3) === O_RDONLY) fail('EBADF');
    if (node.type === 'dir') fail('EISDIR');
    // Match FS.write: O_APPEND first updates the stream position to EOF even
    // when an explicit positional write then overrides the actual destination.
    if (stream.flags & O_APPEND) stream.position = node.bytes.length;
    const at = position === undefined ? stream.position : position;
    if (!length) return 0;
    if (!integer(at + length) || at + length > this.maximumFileBytes) fail('EFBIG');
    if (at + length > node.bytes.length) {
      let replacement;
      try { replacement = new Uint8Array(at + length); } catch (error) {
        if (error instanceof RangeError) fail('ENOMEM');
        throw error;
      }
      replacement.set(node.bytes); replacement.set(buffer.subarray(offset, offset + length), at); node.bytes = replacement;
    } else node.bytes.set(buffer.subarray(offset, offset + length), at);
    this._changed(node);
    if (position === undefined) stream.position += length;
    return length;
  }
  lseek(fd, offset, whence = SEEK_SET) {
    const stream = this._descriptor(fd);
    if (!integer(offset) || ![SEEK_SET, SEEK_CUR, SEEK_END].includes(whence)) fail('EINVAL');
    const position = offset + (whence === SEEK_CUR ? stream.position : whence === SEEK_END && stream.node.type === 'file' ? stream.node.bytes.length : 0);
    if (!integer(position) || position < 0) fail('EINVAL');
    stream.position = position; return position;
  }
  writeFile(path, data, options = {}) {
    if (typeof data === 'string') data = new TextEncoder().encode(data);
    if (!(data instanceof Uint8Array)) throw new TypeError('Expected file bytes or string');
    if (options.canOwn) fail('ENOTSUP');
    const fd = this.open(path, options.flags ?? 'w', options.mode);
    try { this.write(fd, data); } finally { this.close(fd); }
  }
  readFile(path, options = {}) {
    if (!['binary', 'utf8'].includes(options.encoding ?? 'binary')) fail('ENOTSUP');
    const fd = this.open(path, options.flags ?? 'r');
    try {
      const bytes = new Uint8Array(this.fstat(fd).size);
      this.read(fd, bytes, 0, bytes.length, 0);
      if (options.encoding === 'utf8') {
        const end = bytes.indexOf(0);
        return new TextDecoder().decode(end < 0 ? bytes : bytes.subarray(0, end));
      }
      return bytes;
    } finally { this.close(fd); }
  }
  createMemfsFacade() {
    const fs = this, facade = {}, streams = new Map(), identities = new WeakMap();
    for (const name of ['mkdirTree', 'mkdir', 'rmdir', 'writeFile', 'readFile', 'readdir', 'stat', 'fstat', 'isDir', 'isFile', 'chdir', 'cwd', 'unlink', 'rename'])
      facade[name] = (...args) => fs[name](...args);
    const descriptor = stream => {
      if (typeof stream === 'number') return stream;
      if (!stream || fs.descriptors.get(stream.fd) !== identities.get(stream)) fail('EBADF');
      return stream.fd;
    };
    const wrap = fd => {
      const record = fs._descriptor(fd), stream = { fd };
      identities.set(stream, record);
      Object.defineProperty(stream, 'position', { get: () => fs._descriptor(descriptor(stream)).position,
        set: value => { fs.lseek(descriptor(stream), value, SEEK_SET); } });
      streams.set(fd, stream); return stream;
    };
    facade.open = (...args) => wrap(fs.open(...args));
    facade.close = stream => {
      const fd = descriptor(stream); fs.close(fd); streams.delete(fd);
      if (typeof stream === 'object') stream.fd = null;
    };
    facade.read = (stream, ...args) => fs.read(descriptor(stream), ...args);
    facade.write = (stream, ...args) => fs.write(descriptor(stream), ...args);
    facade.llseek = (stream, ...args) => fs.lseek(descriptor(stream), ...args);
    facade.getStream = fd => {
      if (!fs.descriptors.has(fd)) return undefined;
      const stream = streams.get(fd);
      return stream && identities.get(stream) === fs.descriptors.get(fd) ? stream : wrap(fd);
    };
    facade.ErrnoError = VFSError;
    return facade;
  }
  exportSnapshot() {
    const entries = [];
    const visit = node => {
      entries.push({ path: this._path(node), type: node.type, mode: node.mode & 0o777,
        atime: node.atime, mtime: node.mtime, ctime: node.ctime,
        ...(node.type === 'file' ? { base64: encode(node.bytes) } : {}) });
      if (node.type === 'dir') for (const child of node.children.values()) visit(child);
    };
    visit(this.root);
    return { version: 1, cwd: this.currentPath, entries };
  }
  importSnapshot(snapshot) {
    if (this.descriptors.size) fail('EBUSY');
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.entries) || typeof snapshot.cwd !== 'string') fail('EINVAL');
    const replacement = new CVFS({ clock: this.clock, maximumFileBytes: this.maximumFileBytes,
      maximumDescriptors: this.maximumDescriptors, ignorePermissions: true });
    const seen = new Set();
    for (const entry of snapshot.entries) {
      if (!entry || typeof entry.path !== 'string' || !entry.path.startsWith('/') || seen.has(entry.path)
        || !['file', 'dir'].includes(entry.type) || !integer(entry.mode) || entry.mode < 0 || entry.mode > 0o777
        || ![entry.atime, entry.mtime, entry.ctime].every(Number.isFinite)) fail('EINVAL');
      if (entry.path !== '/' && ('/' + entry.path.split('/').filter(Boolean).join('/') !== entry.path
        || entry.path.split('/').some(part => part === '.' || part === '..'))) fail('EINVAL');
      seen.add(entry.path);
      if (entry.path === '/') {
        if (entry.type !== 'dir') fail('EINVAL');
      } else if (entry.type === 'dir') replacement.mkdir(entry.path, entry.mode);
      else replacement.writeFile(entry.path, decode(entry.base64, this.maximumFileBytes), { mode: entry.mode });
    }
    // Creating children changes their parents' times; apply persisted metadata
    // only after the complete linked tree has been reconstructed.
    for (const entry of snapshot.entries) {
      const node = replacement._lookup(entry.path);
      node.mode = (entry.type === 'dir' ? S_IFDIR : S_IFREG) | entry.mode;
      node.atime = entry.atime; node.mtime = entry.mtime; node.ctime = entry.ctime;
    }
    if (!seen.has('/')) fail('EINVAL');
    replacement.chdir(snapshot.cwd);
    this.root = replacement.root; this.currentPath = replacement.currentPath; this.nextInode = replacement.nextInode;
  }
  saveToStorage(storage = this.storage, key = this.persistenceKey) {
    if (!storage || typeof storage.setItem !== 'function') fail('ENOTSUP');
    try { storage.setItem(key, JSON.stringify(this.exportSnapshot())); }
    catch (error) { if (error instanceof VFSError) throw error; fail(error?.name === 'QuotaExceededError' ? 'ENOSPC' : 'EIO'); }
  }
  loadFromStorage(storage = this.storage, key = this.persistenceKey) {
    if (!storage || typeof storage.getItem !== 'function') fail('ENOTSUP');
    let value;
    try { value = storage.getItem(key); } catch { fail('EIO'); }
    if (value === null) return false;
    let snapshot;
    try { snapshot = JSON.parse(value); } catch { fail('EINVAL'); }
    this.importSnapshot(snapshot); return true;
  }
  unsupported() { fail('ENOTSUP'); }
  symlink() { this.unsupported(); }
  link() { this.unsupported(); }
  chmod() { this.unsupported(); }
  chown() { this.unsupported(); }
  mknod() { this.unsupported(); }
}
