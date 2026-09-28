/**
 * C ref: nethack-c/upstream/src/alloc.c — allocation wrappers.
 *
 * Build note: the `nh*` family lives under `#ifdef MONITOR_HEAP`
 * (alloc.c:137–232), a leak-debugging build flag that is NOT enabled in
 * the scored build (no `-DMONITOR_HEAP` anywhere in the build config), so
 * production C uses plain `alloc()`/`re_alloc()` and ordinary `free()`.
 * This module still ports the whole family in C order — `alloc` (:68–81),
 * `re_alloc` (:85–99), `heapmon_init` (:142–149, file-local like C
 * `staticfn`), `nhalloc` (:152–166), `nhrealloc` (:170–202), `nhfree`
 * (:205–214), `nhdupstr` (:219–229), `FITSint_` (:266–273), `FITSuint_`
 * (:276–283) — so every callee of `nhalloc` is live in this commit.
 * `fmt_ptr` stays the live export in js/mkobj.js (heaplog-only use, named
 * omit below — no local clone); `dupstr` stays in js/dungeon.js (the
 * non-MONITOR_HEAP strdup, already ported); `dupstr_n` is `#if 0`-
 * suppressed in C (:249–262) and stays unported.
 *
 * JS renders the C `long *` raw buffer as a zero-filled `Uint8Array` of
 * the `ForceAlignedLength`-rounded size (C callers treat it as raw bytes;
 * there are no JS call sites — allocation is GC). `throw new Error(...)`
 * ≡ C `panic()` (house idiom, cf. dungeon.js insert_branch).
 */

/** LP64 `sizeof (long)` behind `ForceAlignedLength` (alloc.c:48–52). */
const SIZEOF_LONG = 8;

/* C :31–32 — heap monitor state. `heaplog` is always null: opening the
 * log needs `getenv`+`fopen`, which are unavailable in scored js/ under
 * Contest Rule #2 (see heapmon_init), so no log line is ever emitted. */
let heaplog = null;
let tried_heaplog = false;

/**
 * C ref: alloc.c:48–52 `ForceAlignedLength(LTH)` macro — round the
 * requested length up to a multiple of `sizeof (long)`; `alloc(0)`
 * behaves as `alloc(sizeof (long))`.
 * @param {number} lth unsigned-int length
 * @returns {number} aligned length (never 0)
 */
function forceAlignedLength(lth) {
    let n = lth;
    if (n === 0 || n % SIZEOF_LONG !== 0) n += SIZEOF_LONG - (n % SIZEOF_LONG);
    return n;
}

/**
 * C ref: alloc.c:68–81 `alloc` — aligned `malloc`, panicking on failure
 * (without MONITOR_HEAP the panic lives here, `:75–76`).
 * @param {number} lth unsigned-int byte count
 * @returns {Uint8Array} zero-filled buffer of the aligned size
 */
export function alloc(lth) {
    const n = forceAlignedLength(Number(lth) >>> 0);
    try {
        return new Uint8Array(n);
    } catch {
        /* C :75–76 `if (!ptr) panic(...)` — a JS allocation failure
         * throws instead of returning null, so the null arm folds into
         * this catch. The message uses the aligned length like C (the
         * macro mutates `lth` before the panic, `:72–76`). */
        throw new Error(`Memory allocation failure; cannot get ${n} bytes`);
    }
}

/**
 * C ref: alloc.c:85–99 `re_alloc` — `realloc()` preserving content;
 * "extend to": assume a shrink never fails (`:92`, `:194–197`).
 * @param {Uint8Array|null} oldptr previous buffer (null ≡ fresh alloc)
 * @param {number} newlth unsigned-int new byte count
 * @returns {Uint8Array} zero-filled buffer of the aligned size, with the
 *   `min(old, new)` leading bytes carried over
 */
export function re_alloc(oldptr, newlth) {
    const n = forceAlignedLength(Number(newlth) >>> 0);
    let newptr;
    try {
        newptr = new Uint8Array(n);
    } catch {
        /* C :93–94 `if (newlth && !newptr) panic(...)`, folded as in
         * alloc() above. */
        throw new Error(`Memory allocation failure; cannot extend to ${n} bytes`);
    }
    if (oldptr && oldptr.length > 0 && n > 0)
        newptr.set(oldptr.subarray(0, Math.min(oldptr.length, n)));
    return newptr;
}

/**
 * C ref: alloc.c:141–149 `heapmon_init` (`staticfn`, hence module-local)
 * — `${NH_HEAPLOG}` log-file setup. `getenv("NH_HEAPLOG")` + `fopen()`
 * are env/file I/O: unavailable under Contest Rule #2, so `heaplog`
 * stays null. The latch still runs so the lazy-init guards in
 * `nhalloc`/`nhrealloc`/`nhfree` keep their C shape.
 */
function heapmon_init() {
    tried_heaplog = true;
}

/**
 * C ref: alloc.c:152–166 `nhalloc` — MONITOR_HEAP `alloc()` with heap
 * logging and deferred panic.
 * @param {number} lth unsigned-int byte count
 * @param {string} file caller file (`__FILE__` via the C `alloc` macro)
 * @param {number} line caller line
 * @returns {Uint8Array} zero-filled buffer of the aligned size
 */
export function nhalloc(lth, file, line) {
    const ptr = alloc(lth); // C :154

    if (!tried_heaplog) // C :156–157
        heapmon_init();
    /* C :158–160 heaplog `"+%5u %s %4d %s"` fprintf arm — named omit:
     * file logging is banned under Rule #2 (`heaplog` is always null),
     * so the arm never fires. `fmt_ptr` stays live at js/mkobj.js. */
    /* C :162–163 deferred `if (!ptr) panic(...)` — unreachable via
     * alloc(), which throws instead of returning null; kept for shape. */
    if (!ptr)
        throw new Error(`Cannot get ${lth} bytes, line ${line} of ${file}`);

    return ptr;
}

/**
 * C ref: alloc.c:170–202 `nhrealloc` — MONITOR_HEAP `re_alloc()` with
 * heap logging; lacks access to the old alloc size (`:168`).
 * @param {Uint8Array|null} oldptr previous buffer
 * @param {number} newlth unsigned-int new byte count
 * @param {string} file caller file
 * @param {number} line caller line
 * @returns {Uint8Array} resized buffer, content carried over
 */
export function nhrealloc(oldptr, newlth, file, line) {
    const newptr = re_alloc(oldptr, newlth); // C :176

    if (!tried_heaplog) // C :178–179
        heapmon_init();
    /* C :180–193 heaplog arms — named omit under Rule #2 (same as
     * nhalloc), including the `:184 newptr != oldptr` `'<'`/`'>'` op
     * select and the `:186–188` oldptr-release line. */
    /* C :198–199 `if (newlth && !newptr) panic(...)` — unreachable via
     * re_alloc(), which throws; kept for shape. */
    if (newlth && !newptr)
        throw new Error(`Cannot extend to ${newlth} bytes, line ${line} of ${file}`);

    return newptr;
}

/**
 * C ref: alloc.c:205–214 `nhfree` — MONITOR_HEAP `free()` with heap
 * logging.
 * @param {*} ptr buffer being released (GC owns it)
 * @param {string} file caller file
 * @param {number} line caller line
 */
export function nhfree(ptr, file, line) {
    if (!tried_heaplog) // C :207–208
        heapmon_init();
    /* C :209–211 heaplog `"-..."` fprintf — named omit under Rule #2. */
    /* C :213 `free(ptr)` — GC owns the buffer (house idiom; cf. the
     * `free() of that copy is GC` note on dungeon.js `dupstr`). */
}

/**
 * C ref: alloc.c:219–229 `nhdupstr` — caller-tracked `strdup()` on the
 * `nhalloc` allocator.
 * @param {string} string NUL-terminated source
 * @param {string} file caller file
 * @param {number} line caller line
 * @returns {string} copy up to the first NUL
 */
export function nhdupstr(string, file, line) {
    const s = String(string);
    const nul = s.indexOf('\0');
    /* C :222 `strlen` — stops at the first NUL, hence the truncated
     * length here rather than `s.length`. */
    const len = FITSuint_(nul >= 0 ? nul : s.length, file, line);
    /* C :224–226 `len + 1` overflow arm (throw ≡ panic). */
    if (FITSuint_(len + 1, file, line) < len)
        throw new Error(`nhdupstr: string length overflow, line ${line} of ${file}`);
    /* C :228 `strcpy(nhalloc(len + 1, ...), string)` — JS strings are
     * immutable, so the slice IS the copy (dungeon.js `dupstr` idiom);
     * the raw-byte buffer step folds away and its `free()` is GC. */
    return nul >= 0 ? s.slice(0, nul) : s.slice(0);
}

/**
 * C ref: alloc.c:266–273 `FITSint_` — cast to int or panic on overflow;
 * use via the `FITSint(x)` macro (extern.h:86, hacklib.h:58).
 * @param {number} i long-long-scale value
 * @param {string} file caller file
 * @param {number} line caller line
 * @returns {number} the value as a 32-bit int
 */
export function FITSint_(i, file, line) {
    const n = Number(i);
    const iret = n | 0; // C :268 `(int) i` — truncates toward 0, wraps mod 2^32
    if (iret !== n) // C :270–271
        throw new Error(`Overflow at ${file}:${line}`);
    return iret;
}

/**
 * C ref: alloc.c:276–283 `FITSuint_` — cast to unsigned or panic on
 * overflow; use via the `FITSuint(x)` macro (extern.h:88, hacklib.h:60).
 * @param {number} ull unsigned-long-long-scale value
 * @param {string} file caller file
 * @param {number} line caller line
 * @returns {number} the value as an unsigned 32-bit int
 */
export function FITSuint_(ull, file, line) {
    const n = Number(ull);
    const uret = n >>> 0; // C :278 `(unsigned) ull` — wraps mod 2^32
    if (uret !== n) // C :280–281
        throw new Error(`Overflow at ${file}:${line}`);
    return uret;
}
