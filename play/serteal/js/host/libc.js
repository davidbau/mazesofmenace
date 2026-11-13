// host/libc.js - the C library functions the port writes in JS.
//
// Most of the C library comes from the vendored residue (js/vendor), called
// with JS values through clib.call().  The functions here are the ones the
// residue does not have, or must not be used for:
//
//   qsort       macOS's qsort in JS (host/qsort.js): comparators are JS functions
//   regerror    Darwin message texts (host/regerror.js); also as nhjs_regerror
//   creat       open(path, O_CREAT|O_WRONLY|O_TRUNC, mode), as musl defines it
//   getlogin    getenv("LOGNAME") (musl)
//   getpwuid, getpwnam   no password database: NULL, errno ENOENT (Emscripten)
//   signal      remembers handlers; no signal is ever delivered
//   fork, execv, execl, waitpid, setuid, setgid   -1 with the errno Emscripten sets
//   popen, pclose   the recorder's environment runs no subprocess here: NULL / -1, errno ENOSYS
//   isatty      the recorder's harness spawned NetHack with stdin, stdout and stderr on pipes
//               (Node "pipe" = a socketpair on macOS): isatty() is 0 for fd 0, 1, 2 (with
//               errno EOPNOTSUPP there, ENOTSUP here); other descriptors: their device
//   file_exists unixunix.c of upstream's tip (SYSCF GDBPATH checks): stat(path) == 0
//   exit        ends the game at once (host/endgame.js); stdio is not flushed
//   abort, __assert_fail   end the game with an error
//
// createHostLibc(clib, opts) -> { name: function(...args) } taking the values
// emitted code passes (addresses as numbers; functions for function pointers).

import { qsort as jsQsort } from "./qsort.js";
import { regerror as jsRegerror } from "./regerror.js";
import { GameExit, GameAbort } from "./endgame.js";
import { O, E } from "./vfs.js";

export function createHostLibc(clib, opts = {}) {
  const signals = opts.signals ?? new Map();
  const setErrno = (v) => {
    clib.HEAP32[clib.fn.__errno_location() >> 2] = v;
  };
  const fail = (errno) => {
    setErrno(errno);
    return -1;
  };
  const cstring = (p) => clib.readString(p);
  return {
    qsort(base, nel, width, cmp) {
      jsQsort(clib, base, nel, width, cmp);
    },
    regerror(errcode, preg, buf, size) {
      return jsRegerror(clib, errcode, preg, buf, size);
    },
    nhjs_regerror(errcode, preg, buf, size) {
      return jsRegerror(clib, errcode, preg, buf, size);
    },
    creat(path, mode) {
      return clib.call("open", path, O.CREAT | O.WRONLY | O.TRUNC, mode);
    },
    getlogin() {
      return clib.call("getenv", "LOGNAME");
    },
    getpwuid() {
      setErrno(E.ENOENT);
      return 0;
    },
    getpwnam() {
      setErrno(E.ENOENT);
      return 0;
    },
    signal(sig, handler) {
      const old = signals.get(sig) ?? 0;
      signals.set(sig, handler);
      return old;
    },
    // musl/Emscripten __sigaction: a table of the 20 bytes of struct sigaction per signal
    sigaction(sig, act, oact) {
      if (sig >>> 0 >= 65) return fail(E.EINVAL);
      const key = "sigaction:" + sig;
      if (oact) clib.HEAPU8.set(signals.get(key) ?? new Uint8Array(20), oact);
      if (act) signals.set(key, clib.HEAPU8.slice(act, act + 20));
      return 0;
    },
    isatty(fd) {
      if (fd >= 0 && fd <= 2) {
        setErrno(E.ENOTSUP);
        return 0;
      }
      const stream = opts.vfs?.()?.streams[fd];
      if (!stream) {
        setErrno(E.EBADF);
        return 0;
      }
      if (stream.tty) return 1;
      setErrno(E.ENOTTY);
      return 0;
    },
    popen() {
      setErrno(E.ENOSYS);
      return 0;
    },
    pclose: () => fail(E.ENOSYS),
    file_exists(path) {
      const sp = clib.stackSave();
      try {
        return clib.call("stat", path, clib.stackAlloc(128)) === 0 ? 1 : 0;
      } finally {
        clib.stackRestore(sp);
      }
    },
    fork: () => fail(E.ENOSYS),
    execv: () => fail(E.ENOEXEC),
    execl: () => fail(E.ENOEXEC),
    waitpid: () => fail(E.E2BIG), // Emscripten's wait4 stub returns -1, read as errno 1
    setuid: () => fail(E.EPERM),
    setgid: () => fail(E.EPERM),
    exit(status) {
      throw new GameExit(status);
    },
    abort() {
      throw new GameAbort();
    },
    __assert_fail(expr, file, line, func) {
      throw new GameAbort(`Assertion failed: ${cstring(expr)} (${cstring(file)}: ${cstring(func)}: ${line})`);
    },
  };
}
