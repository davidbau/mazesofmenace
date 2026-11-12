// host/syscalls.js - the system calls of the C library, over host/vfs.js.
//
// The C library linked with the game (musl, as built by Emscripten:
// js/vendor/clib-lua.js) implements stdio, open(), stat(),
// opendir() and friends on top of a small set of imported system calls.
// This module implements that set on a Vfs, with the argument conventions
// and error numbers Emscripten's own implementation has, so the C library
// behaves exactly as under Emscripten's runtime (line buffering of a
// stream, for example, depends on whether ioctl(TIOCGWINSZ) succeeds).
//
//   createSyscalls(vfs, mem) -> { __syscall_openat, ..., fd_read, fd_write, ... }
//
// `mem` gives the current heap views (they change when memory grows):
// an object with HEAP8, HEAPU8, HEAP16, HEAP32, HEAPU32 properties, such as
// the instance returned by createClib().  __syscall_* return 0 or -errno;
// fd_* (WASI) return 0 or errno.

import { E, FsError, O, isChrdev, isDir, isFile, isLink } from "./vfs.js";

const AT_FDCWD = -100;
const AT_SYMLINK_NOFOLLOW = 256;
const AT_REMOVEDIR = 512;
const AT_EMPTY_PATH = 4096;
const DIRENT_SIZE = 280;

// ---- UTF-8, exactly as Emscripten converts C strings (paths) ------------------------------

const decoder = typeof TextDecoder === "function" ? new TextDecoder() : null;

/** JS string of the NUL-terminated UTF-8 string at p (Emscripten's UTF8ToString). */
export function utf8ToString(heap, p, max = Infinity) {
  let end = p;
  const maxEnd = p + max;
  while (heap[end] && !(end >= maxEnd)) ++end;
  if (end - p > 16 && decoder) return decoder.decode(heap.subarray(p, end));
  let str = "";
  let i = p;
  while (i < end) {
    let u0 = heap[i++];
    if (!(u0 & 0x80)) {
      str += String.fromCharCode(u0);
      continue;
    }
    const u1 = heap[i++] & 63;
    if ((u0 & 0xe0) === 0xc0) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    const u2 = heap[i++] & 63;
    if ((u0 & 0xf0) === 0xe0) u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    else u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[i++] & 63);
    if (u0 < 0x10000) str += String.fromCharCode(u0);
    else {
      const ch = u0 - 0x10000;
      str += String.fromCharCode(0xd800 | (ch >> 10), 0xdc00 | (ch & 0x3ff));
    }
  }
  return str;
}

/** Write str as UTF-8 at p (at most max bytes incl. the NUL); returns bytes written w/o NUL. */
export function stringToUtf8(str, heap, p, max) {
  if (!(max > 0)) return 0;
  const start = p;
  const end = p + max - 1;
  for (let i = 0; i < str.length; ++i) {
    let u = str.codePointAt(i);
    if (u > 0xffff) i++;
    if (u <= 0x7f) {
      if (p >= end) break;
      heap[p++] = u;
    } else if (u <= 0x7ff) {
      if (p + 1 >= end) break;
      heap[p++] = 0xc0 | (u >> 6);
      heap[p++] = 0x80 | (u & 63);
    } else if (u <= 0xffff) {
      if (p + 2 >= end) break;
      heap[p++] = 0xe0 | (u >> 12);
      heap[p++] = 0x80 | ((u >> 6) & 63);
      heap[p++] = 0x80 | (u & 63);
    } else {
      if (p + 3 >= end) break;
      heap[p++] = 0xf0 | (u >> 18);
      heap[p++] = 0x80 | ((u >> 12) & 63);
      heap[p++] = 0x80 | ((u >> 6) & 63);
      heap[p++] = 0x80 | (u & 63);
    }
  }
  heap[p] = 0;
  return p - start;
}

/** Number of UTF-8 bytes of str (without the NUL). */
export function lengthBytesUtf8(str) {
  let len = 0;
  for (let i = 0; i < str.length; ++i) {
    const c = str.charCodeAt(i);
    if (c <= 0x7f) len++;
    else if (c <= 0x7ff) len += 2;
    else if (c >= 0xd800 && c <= 0xdfff) {
      len += 4;
      ++i;
    } else len += 3;
  }
  return len;
}

// ---- 64-bit stores ------------------------------------------------------------------------

function storeI64(H32, p, v) {
  H32[p >> 2] = v >>> 0;
  H32[(p >> 2) + 1] = v >= 0 ? Math.floor(v / 4294967296) >>> 0 : ~~Math.ceil((v - (~~v >>> 0)) / 4294967296) >>> 0;
}

function i53(lo, hi) {
  return (hi + 0x200000) >>> 0 < 0x400001 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
}

/**
 * The system calls on a Vfs (or on the Vfs a getter returns); `mem` supplies the heap views.
 * options: uid/gid (default 0, Emscripten's), onUnknown(name) for diagnostics.
 */
export function createSyscalls(vfsOrGetter, mem, options = {}) {
  // a Vfs, or a function returning the current one (a machine that runs several games)
  const current = typeof vfsOrGetter === "function" ? vfsOrGetter : () => vfsOrGetter;
  const uid = options.uid ?? 0;
  const gid = options.gid ?? 0;
  let varargs = 0;

  const str = (p) => utf8ToString(mem.HEAPU8, p);
  const vararg = () => {
    const v = mem.HEAP32[varargs >> 2];
    varargs += 4;
    return v;
  };

  function at(dirfd, path, allowEmpty = false) {
    if (path.startsWith("/")) return path;
    const dir = dirfd === AT_FDCWD ? current().cwd() : current().getStream(dirfd).path;
    if (path.length === 0) {
      if (!allowEmpty) throw new FsError(E.ENOENT);
      return dir;
    }
    return dir + "/" + path;
  }

  function writeStat(buf, st) {
    const U32 = mem.HEAPU32;
    const H32 = mem.HEAP32;
    U32[buf >> 2] = st.dev;
    U32[(buf + 4) >> 2] = st.mode;
    U32[(buf + 8) >> 2] = st.nlink;
    U32[(buf + 12) >> 2] = st.uid;
    U32[(buf + 16) >> 2] = st.gid;
    U32[(buf + 20) >> 2] = st.rdev;
    storeI64(H32, buf + 24, st.size);
    H32[(buf + 32) >> 2] = 4096;
    H32[(buf + 36) >> 2] = st.blocks;
    const times = [st.atime, st.mtime, st.ctime];
    for (let k = 0; k < 3; k++) {
      storeI64(H32, buf + 40 + 16 * k, Math.floor(times[k] / 1000));
      U32[(buf + 48 + 16 * k) >> 2] = (times[k] % 1000) * 1000 * 1000;
    }
    storeI64(H32, buf + 88, st.ino);
    return 0;
  }

  // run f; FsError -> -errno (or errno for the WASI calls)
  const sys = (f) =>
    function (...args) {
      try {
        return f(...args);
      } catch (e) {
        if (e instanceof FsError) return -e.errno;
        throw e;
      }
    };
  const wasi = (f) =>
    function (...args) {
      try {
        return f(...args);
      } catch (e) {
        if (e instanceof FsError) return e.errno;
        throw e;
      }
    };

  function readv(stream, iov, iovcnt) {
    let ret = 0;
    for (let i = 0; i < iovcnt; i++) {
      const ptr = mem.HEAPU32[iov >> 2];
      const len = mem.HEAPU32[(iov + 4) >> 2];
      iov += 8;
      let cur;
      try {
        cur = current().read(stream, mem.HEAP8, ptr, len);
      } catch (e) {
        if (ret > 0 && e instanceof FsError && e.errno === E.EAGAIN) break;
        throw e;
      }
      ret += cur;
      if (cur < len) break;
    }
    return ret;
  }

  function writev(stream, iov, iovcnt) {
    if (iovcnt === 1) return current().write(stream, mem.HEAP8, mem.HEAPU32[iov >> 2], mem.HEAPU32[(iov + 4) >> 2]);
    let total = 0;
    for (let i = 0, p = iov; i < iovcnt; i++, p += 8) total += mem.HEAPU32[(p + 4) >> 2];
    const view = new Uint8Array(total);
    let off = 0;
    for (let i = 0; i < iovcnt; i++, iov += 8) {
      const ptr = mem.HEAPU32[iov >> 2];
      const len = mem.HEAPU32[(iov + 4) >> 2];
      view.set(mem.HEAPU8.subarray(ptr, ptr + len), off);
      off += len;
    }
    return current().write(stream, view, 0, total);
  }

  // termios of /dev/tty as Emscripten reports it
  const TTY_CC = [
    0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00, 0x12, 0x0f, 0x17, 0x16,
  ];

  return {
    __syscall_chdir: sys((path) => {
      current().chdir(str(path));
      return 0;
    }),
    __syscall_chmod: sys((path, mode) => {
      current().chmod(str(path), mode);
      return 0;
    }),
    __syscall_dup: sys((fd) => current().dupStream(current().getStream(fd)).fd),
    __syscall_dup3: sys((fd, newfd, flags) => {
      if (fd === newfd) return -E.EINVAL;
      if (flags & ~524288) return -E.EINVAL;
      const old = current().getStream(fd);
      if (newfd < 0 || newfd >= 4096) return -E.EBADF;
      const existing = current().streams[newfd];
      if (existing) current().close(existing);
      const stream = current().dupStream(old, newfd);
      if (flags & 524288) stream.flags |= 524288;
      return stream.fd;
    }),
    __syscall_faccessat: sys((dirfd, path, amode) => {
      path = at(dirfd, str(path));
      if (amode & ~7) return -E.EINVAL;
      const node = current().lookupPath(path, { follow: true }).node;
      if (!node) return -E.ENOENT;
      let perms = "";
      if (amode & 4) perms += "r";
      if (amode & 2) perms += "w";
      if (amode & 1) perms += "x";
      if (perms && current()._perm(node, perms)) return -E.EACCES;
      return 0;
    }),
    __syscall_fcntl64: sys((fd, cmd, va) => {
      varargs = va;
      const stream = current().getStream(fd);
      switch (cmd) {
        case 0: {
          let arg = vararg();
          if (arg < 0) return -E.EINVAL;
          while (current().streams[arg]) arg++;
          return current().dupStream(stream, arg).fd;
        }
        case 1:
        case 2:
          return 0;
        case 3:
          return stream.flags;
        case 4: {
          const arg = vararg();
          const mask = 289792;
          current()._streamsChange();
          stream.flags = (stream.flags & ~mask) | (arg & mask);
          return 0;
        }
        case 12: {
          const arg = vararg();
          mem.HEAP16[arg >> 1] = 2; // F_UNLCK: never locked
          return 0;
        }
        case 13:
        case 14:
          return 0;
      }
      return -E.EINVAL;
    }),
    __syscall_fstat64: sys((fd, buf) => writeStat(buf, current().fstat(fd))),
    __syscall_stat64: sys((path, buf) => writeStat(buf, current().stat(str(path)))),
    __syscall_lstat64: sys((path, buf) => writeStat(buf, current().lstat(str(path)))),
    __syscall_newfstatat: sys((dirfd, path, buf, flags) => {
      const nofollow = flags & AT_SYMLINK_NOFOLLOW;
      const p = at(dirfd, str(path), flags & AT_EMPTY_PATH);
      return writeStat(buf, nofollow ? current().lstat(p) : current().stat(p));
    }),
    __syscall_getcwd: sys((buf, size) => {
      if (!size) return -E.EINVAL;
      const cwd = current().cwd();
      const n = lengthBytesUtf8(cwd) + 1;
      if (size < n) return -E.ERANGE;
      stringToUtf8(cwd, mem.HEAPU8, buf, size);
      return n;
    }),
    __syscall_getdents64: sys((fd, dirp, count) => {
      const stream = current().getStream(fd);
      stream.getdents ||= current().readdir(stream.path);
      let pos = 0;
      const off = current().llseek(stream, 0, 1);
      const startIdx = Math.floor(off / DIRENT_SIZE);
      const endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / DIRENT_SIZE));
      let idx;
      for (idx = startIdx; idx < endIdx; idx++) {
        let id, type;
        const name = stream.getdents[idx];
        if (name === ".") {
          id = stream.node.id;
          type = 4;
        } else if (name === "..") {
          id = current().lookupPath(stream.path, { parent: true }).node.id;
          type = 4;
        } else {
          const child = current()._lookupNode(stream.node, name);
          id = child.id;
          type = isChrdev(child.mode) ? 2 : isDir(child.mode) ? 4 : isLink(child.mode) ? 10 : 8;
        }
        storeI64(mem.HEAP32, dirp + pos, id);
        storeI64(mem.HEAP32, dirp + pos + 8, (idx + 1) * DIRENT_SIZE);
        mem.HEAP16[(dirp + pos + 16) >> 1] = DIRENT_SIZE;
        mem.HEAP8[dirp + pos + 18] = type;
        stringToUtf8(name, mem.HEAPU8, dirp + pos + 19, 256);
        pos += DIRENT_SIZE;
      }
      current().llseek(stream, idx * DIRENT_SIZE, 0);
      return pos;
    }),
    __syscall_getuid32: () => uid,
    __syscall_geteuid32: () => uid,
    __syscall_getgid32: () => gid,
    __syscall_getegid32: () => gid,
    __syscall_ioctl: sys((fd, op, va) => {
      varargs = va;
      const stream = current().getStream(fd);
      const tty = stream.tty;
      switch (op) {
        case 21509: // TCFLSH...
        case 21510:
        case 21511:
        case 21512:
        case 21524:
        case 21515:
          return tty ? 0 : -E.ENOTTY;
        case 21505: {
          // TCGETS
          if (!tty) return -E.ENOTTY;
          if (tty.termios) {
            const argp = vararg();
            const H32 = mem.HEAP32;
            H32[argp >> 2] = 25856;
            H32[(argp + 4) >> 2] = 5;
            H32[(argp + 8) >> 2] = 191;
            H32[(argp + 12) >> 2] = 35387;
            for (let i = 0; i < 32; i++) mem.HEAP8[argp + 17 + i] = TTY_CC[i] || 0;
          }
          return 0;
        }
        case 21506: // TCSETS*
        case 21507:
        case 21508:
          return tty ? 0 : -E.ENOTTY;
        case 21519: {
          // TIOCGPGRP
          if (!tty) return -E.ENOTTY;
          mem.HEAP32[vararg() >> 2] = 0;
          return 0;
        }
        case 21520:
          return tty ? -E.EINVAL : -E.ENOTTY;
        case 21537:
        case 21531:
          vararg();
          return -E.ENOTTY;
        case 21523: {
          // TIOCGWINSZ
          if (!tty) return -E.ENOTTY;
          if (tty.termios) {
            const argp = vararg();
            mem.HEAP16[argp >> 1] = 24;
            mem.HEAP16[(argp + 2) >> 1] = 80;
          }
          return 0;
        }
        default:
          return -E.EINVAL;
      }
    }),
    __syscall_mkdirat: sys((dirfd, path, mode) => {
      current().mkdir(at(dirfd, str(path)), mode & ~current().umask);
      return 0;
    }),
    __syscall_openat: sys((dirfd, path, flags, va) => {
      varargs = va;
      const p = at(dirfd, str(path));
      let mode = va ? vararg() : 0;
      if (flags & O.CREAT) mode &= ~current().umask;
      return current().open(p, flags, mode).fd;
    }),
    __syscall_renameat: sys((olddirfd, oldpath, newdirfd, newpath) => {
      const a = at(olddirfd, str(oldpath));
      const b = at(newdirfd, str(newpath));
      current().rename(a, b);
      return 0;
    }),
    __syscall_rmdir: sys((path) => {
      current().rmdir(str(path));
      return 0;
    }),
    __syscall_umask: (mask) => {
      const old = current().umask;
      current().umask = mask;
      return old;
    },
    __syscall_unlinkat: sys((dirfd, path, flags) => {
      const p = at(dirfd, str(path));
      if (!flags) current().unlink(p);
      else if (flags === AT_REMOVEDIR) current().rmdir(p);
      else return -E.EINVAL;
      return 0;
    }),
    fd_close: wasi((fd) => {
      current().close(current().getStream(fd));
      return 0;
    }),
    fd_read: wasi((fd, iov, iovcnt, pnum) => {
      const n = readv(current().getStream(fd), iov, iovcnt);
      mem.HEAPU32[pnum >> 2] = n;
      return 0;
    }),
    fd_write: wasi((fd, iov, iovcnt, pnum) => {
      const n = writev(current().getStream(fd), iov, iovcnt);
      mem.HEAPU32[pnum >> 2] = n;
      return 0;
    }),
    fd_seek: wasi((fd, lo, hi, whence, pnew) => {
      const offset = i53(lo, hi);
      if (Number.isNaN(offset)) return 61;
      const stream = current().getStream(fd);
      current().llseek(stream, offset, whence);
      storeI64(mem.HEAP32, pnew, stream.position);
      if (stream.getdents && !offset && whence === 0) stream.getdents = null;
      return 0;
    }),
    fd_fdstat_get: wasi((fd, p) => {
      const stream = current().getStream(fd);
      const mode = stream.node.mode;
      const type = stream.tty ? 2 : isDir(mode) ? 3 : isLink(mode) ? 7 : 4;
      mem.HEAPU8.fill(0, p, p + 24);
      mem.HEAP8[p] = type;
      return 0;
    }),
    /** set the vararg cursor (for callers that emulate the C entry points) */
    _setVarargs(v) {
      varargs = v;
    },
    /** file kind helpers for tests */
    _isFile: isFile,
  };
}
