// js/crt/proc.js: the process the C program runs in (transpiler-design.md 5, 6.4).
// Hand-written runtime: environment, arguments, exit, keyboard input, and the
// POSIX process calls NetHack makes (identity, signals, fork/exec, terminal
// modes). Values describe the recorder's process (docs/recording-environment.md):
// stdin and stdout were pipes, so isatty() is 0 and terminal ioctls fail with
// ENOTTY, exactly as NetHack saw them under the recorder.
import { CTrap } from './int.js';
import { Ptr, lit, cstrToJs, peq } from './mem.js';
import { $libc } from './stdio.js';

/** Thrown by exit(): unwinds the program; the glue catches it. */
export class ProcessExit extends Error {
    constructor(status) { super(`exit(${status})`); this.status = status; }
}

/** Per-run process state, set by the glue before main() (resetProcess). */
export const proc = {
    env: new Map(),       // name -> value (JS strings, latin1)
    envPtrs: new Map(),   // name -> char * returned by getenv (stable for the run)
    keys: [],             // pending input bytes
    keyPos: 0,
    onStarve: null,       // called when the program waits for a key and none is left
    readKey: null,        // interactive play: async () => key code, asked when the queue is empty
    cwd: '/',
    uid: 501, gid: 20, pid: 4242,
    login: 'davidbau',
    umask: 0o022,
    signals: new Map(),
};
export function resetProcess({ env = {}, keys = '', cwd = '/', onStarve = null, readKey = null } = {}) {
    proc.env = new Map(Object.entries(env));
    proc.envPtrs = new Map();
    proc.keys = Array.from(keys, (ch) => ch.charCodeAt(0) & 0xff);
    proc.keyPos = 0;
    proc.onStarve = onStarve;
    proc.readKey = readKey;
    proc.cwd = cwd;
    proc.umask = 0o022;
    proc.signals = new Map();
    $libc.errno = 0;
}

// ---------- environment ----------
export function getenv(name) {
    const k = cstrToJs(name);
    if (!proc.env.has(k)) return null;
    let p = proc.envPtrs.get(k);
    if (!p) { p = new Ptr(Int8Array.from(Array.from(proc.env.get(k) + '\0', (c) => c.charCodeAt(0) << 24 >> 24)), 0); proc.envPtrs.set(k, p); }
    return p;
}
export const getlogin = () => lit(proc.login);
export const getuid = () => proc.uid, geteuid = () => proc.uid;
export const getgid = () => proc.gid, getegid = () => proc.gid;
export const getpid = () => proc.pid;
export const setuid = () => 0, setgid = () => 0;
/** struct passwd for the recorder's user (a plain object: record pointers are objects). */
function passwd() {
    return { pw_name: lit(proc.login), pw_passwd: lit('*'), pw_uid: proc.uid, pw_gid: proc.gid, pw_change: 0, pw_class: lit(''),
        pw_gecos: lit(proc.login), pw_dir: lit(proc.env.get('HOME') || '/'), pw_shell: lit('/bin/zsh'), pw_expire: 0 };
}
export const getpwuid = (uid) => (uid === proc.uid ? passwd() : null);
export const getpwnam = (name) => (cstrToJs(name) === proc.login ? passwd() : null);
export function umask(m) { const o = proc.umask; proc.umask = m; return o; }

// ---------- exit ----------
export function exit(status) { throw new ProcessExit(status | 0); }
export const _exit = exit;
export function abort() { throw new CTrap('abort()'); }
export function __assert_rtn(func, file, line, expr) {
    throw new CTrap(`assertion failed: ${cstrToJs(expr)} (${cstrToJs(func)}, ${cstrToJs(file)}:${line})`);
}

// ---------- keyboard: the blocking root (design 6) ----------
/** getchar() from the key queue. When the queue is empty: interactive play asks
 * readKey; otherwise the program is waiting for input that will never come, the glue
 * is told and the promise never settles. */
export async function getchar$async() {
    if (proc.keyPos < proc.keys.length) return proc.keys[proc.keyPos++];
    if (proc.readKey) return (await proc.readKey()) & 0xff;
    if (proc.onStarve) proc.onStarve();
    return new Promise(() => {});
}
export function getchar() { throw new CTrap('getchar() outside the async set'); }

// ---------- signals and processes: nothing is delivered, nothing can be spawned ----------
export function signal(sig, fn) { const o = proc.signals.get(sig) ?? null; proc.signals.set(sig, fn); return o; }
export const sigaction = () => 0;
export const kill = () => 0;
export const sleep = () => 0;
export const alarm = () => 0;
const ENOSYS = 78, ENOTTY = 25, ECHILD = 10;
const fail = (e) => { $libc.errno = e; return -1; };
export const fork = () => fail(ENOSYS);
export const execl = () => fail(ENOSYS), execv = () => fail(ENOSYS), execve = () => fail(ENOSYS);
export const wait = () => fail(ECHILD), waitpid = () => fail(ECHILD);
export const popen = () => { $libc.errno = ENOSYS; return null; };
export const pclose = () => fail(ECHILD);

// ---------- terminal: the recorder's stdin/stdout were pipes ----------
export const isatty = () => 0;
export const tcgetattr = () => fail(ENOTTY);
export const tcsetattr = () => fail(ENOTTY);
export const ioctl = () => fail(ENOTTY);
export const cfgetospeed = () => 0;
export const fpathconf = () => fail(22);

// ---------- crash reporting (report.c): unavailable ----------
export const backtrace = () => 0;
export const backtrace_symbols = () => null;
export const CC_MD4_Init = () => 1, CC_MD4_Update = () => 1, CC_MD4_Final = () => 1;

// ---------- setjmp / longjmp in the object world ----------
// NetHack's one use (nhlua.c nhl_pcall / nhl_hookfn): setjmp(nud->jb) arms a handler
// (panic "Lua time exceeded"), and the Lua count hook longjmps there when a pcall
// exceeds its instruction budget. The emitter (tu.mjs objectSetjmp) wraps the
// function that calls setjmp in a try whose catch is the handler; longjmp throws an
// ObjLongJmp, which unwinds the JS frames between (heap-world frames restore the
// heap stack pointer in their finally blocks) as C unwinds the stack.
export class ObjLongJmp extends Error {
    constructor(buf, val) { super('longjmp'); this.buf = buf; this.val = val; }
}
export function setjmp(_buf) { return 0; }
export const _setjmp = setjmp;
export function longjmp(buf, v) { throw new ObjLongJmp(buf, v === 0 ? 1 : v); }
/** Is e a longjmp to buffer jb (armed by this frame's setjmp)? */
export function isLongJmpTo(e, jb) { return e instanceof ObjLongJmp && jb !== null && jb !== 0 && peq(e.buf, jb); }
export const _longjmp = longjmp;
