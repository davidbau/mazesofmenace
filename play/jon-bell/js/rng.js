// @ts-nocheck
// rng.js — PRNG wrappers around ISAAC64.
// C ref: rng.c — three RNG contexts: core, display, lua.
import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';
import { game } from './gstate.js';
import { ENV } from './hostenv.js';
let _rngLog = [];
let _rngLogEnabled = false;
//
// _rngTape (pre-mod): see installRngTape() near the bottom of this file.
// When set, RND(N) pops the next value and applies `% N` at the call
// site. One pre-mod tape can drive multiple call sites with different
// fixture, fast-check fixtures with seeded RNG).
//
// _rngResultTape (post-mod, "result tape"): see installRngResultTape().
// NETHACK_RNGLOG's `= <result>` column — they are each function's OWN
// return value (NOT a single shared rn2-style 0..N-1 pool). Per-fn
// return-spaces:
//     rn2(N) → 0..N-1
//     rnd(N) → 1..N         (C: rn2(N) + 1)
//     d(X,Y) → X..X*Y       (C: X + sum_{i<X} RND(Y))
//     rne(N) → 1..max(ulevel/3, 5)
//     rnz(N) → positive integer
// During replay each primitive pops ONE value and validates against its
// own return-space. Out-of-range (e.g. rnd(3) popping 5, or rn2(3)
// popping 3) signals JS is invoking the wrong primitive or wrong N at
// the same step C did — a Cardinal Rule 2 violation — and we throw
// `rng_result_tape_oor: <fn>(<args>) got <popped>` to name the call
// site precisely. For rne/d (upper bound is fn-internal) and rnz
// (upper bound is unconstrained), only the lower bound is enforced;
//
// Only one tape is active at a time; installing one clears the other.
// initRng(seed) clears both, returning to ISAAC64.
let _rngTape = null;
import { _rngTapePos, set__rngTapePos } from './rnd.js';
export let _rngResultTape = null;
import { _rngResultTapePos, set__rngResultTapePos, popResultTape } from './rnd.js';
import { d, rn2 } from './rnd.js'; // relocate-fns
export { d, rn2, rn2_on_display_rng, rnd, rne, rnl, rnz } from './rnd.js'; // relocate-fns
export { _initDispCtx, _rngLog, _rngLogEnabled, _rngTape }; // relocate-fns
// Cosmic display debugging state (from rnd.c)
let cosmic_newsym_branch = null;
let cosmic_maploc_branch = null;
let cosmic_cell_x = 0;
let cosmic_cell_y = 0;
let cosmic_cell_active = false;
let cosmic_rng_kind = null;
let cosmic_display_logs = false;
let rng_logfile = null;
let cosmic_tty_menu_logs = false;
const COSMIC_OWNER_STACK_SIZE = 32;
let cosmic_owner_stack = new Array(COSMIC_OWNER_STACK_SIZE);
let cosmic_owner_depth = 0;
/* Build the DISP context from `seed`, the same eight little-endian bytes CORE
 * gets — C's init_isaac64() takes the seed by value and both init_random()
 * calls at options.c:7161-7162 pass the same sys_random_seed(). */
function _initDispCtx(seed) {
    let s = BigInt(seed) & 0xffffffffffffffffn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) { bytes[i] = Number(s & 0xffn); s >>= 8n; }
    game.dispCtx = isaac64_init(bytes);
}
export function initRng(seed) {
    game.currentSeed = seed;
    // Convert seed to 8 little-endian bytes
    let s = BigInt(seed) & 0xffffffffffffffffn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(s & 0xffn);
        s >>= 8n;
    }
    game.coreCtx = isaac64_init(bytes);
    // C rnd.c:26-29 `enum { CORE = 0, DISP = 1 }` — a SECOND isaac64 context,
    // used by rn2_on_display_rng() "in cases where the answer doesn't affect
    // gameplay and we don't want to give users easy control over the main RNG
    // sequence" (rnd.c:66-68).  options.c:7161-7162 seeds both from the same
    // sys_random_seed() call:
    //     init_random(rn2);
    //     init_random(rn2_on_display_rng);
    // and the organiser's determinism patch (patches/001, sys_random_seed)
    // returns NETHACK_SEED verbatim while leaving has_strong_rngseed FALSE, so
    // reseed_random() is a no-op for both.  DISP therefore starts from exactly
    // these bytes and is never reseeded — it is the same ISAAC64 sequence as
    // CORE, consumed independently.
    _initDispCtx(seed);
    _rngLog = [];
    // contract ("the `seed` op clears any installed tape"). Both tape
    // modes (pre-mod and result) clear together.
    _rngTape = null;
    set__rngTapePos(0);
    _rngResultTape = null;
    set__rngResultTapePos(0);
}
export function rngResultTapeResidual() {
    if (!_rngResultTape) return 0;
    return _rngResultTape.length - _rngResultTapePos;
}
export function enableRngLog() { _rngLogEnabled = true; _rngLog = []; }
export function getRngLog() { return _rngLog; }
export function pushRngLogEntry(entry) { if (_rngLogEnabled)
    _rngLog.push(entry); }
// popResultTape — pop one value from _rngResultTape, no validation.
// The caller decides the return-space (rn2: 0..N-1, rnd: 1..N, d: X..X*Y,
// rne: >=1, rnz: >0) and throws rng_result_tape_oor if the popped value
// is outside it. Underrun is shared.

// C ref: rn1(x, y) — random number y..y+x-1
export function rn1(x, y) { return rn2(x) + y; }
export const c_d = d;
export const lua_d = d;
// ---------------------------------------------------------------------
//
// Install an explicit sequence of pre-mod values that rn2/rnd/d/rne/rnz
// will consume in order via RND(). Each call site applies its own
// `% N` to the popped value, so one tape can drive multiple call sites
// with different N args (this is the design rationale described in the
// equiv-test protocol spec).
//
// Tape underrun throws Error('rng_tape_underrun') from the next RND-
// consuming call. A subsequent initRng(seed) clears the tape and
// returns to ISAAC64 mode.
//
// Accepts BigInt[] or number[] (or any iterable thereof). Numbers are
// coerced to BigInt to preserve the uint64 width on storage; small
// values (e.g. those produced by rng_smoke) round-trip exactly. The
// argument is copied — the caller can mutate the original array
// afterwards without affecting subsequent pops.
//
// Calling installRngTape([]) installs an EMPTY tape: any subsequent
// rn2 call throws rng_tape_underrun. Passing null is not supported;
// to return to ISAAC64 use initRng(seed).
// ---------------------------------------------------------------------
export function installRngTape(values) {
    if (!Array.isArray(values) && !(values && typeof values[Symbol.iterator] === 'function')) {
        throw new TypeError(`installRngTape expected an iterable of values, got ${typeof values}`);
    }
    const tape = [];
    for (const v of values) {
        if (typeof v === 'bigint') {
            tape.push(v);
        }
        else if (typeof v === 'number') {
            if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
                throw new RangeError(`installRngTape: non-negative-int values required, got ${v}`);
            }
            tape.push(BigInt(v));
        }
        else if (typeof v === 'string' && /^\d+$/.test(v)) {
            tape.push(BigInt(v));
        }
        else {
            throw new TypeError(`installRngTape: bad value (need bigint/uint/digit-string), got ${typeof v} ${v}`);
        }
    }
    _rngTape = tape;
    set__rngTapePos(0);
    // Mutually exclusive with the result tape — installing one clears
    // the other (documented in the two-mode block at the top of this
    // file). Without this, a stale result tape would shadow the
    // freshly installed pre-mod tape.
    _rngResultTape = null;
    set__rngResultTapePos(0);
}
// ---------------------------------------------------------------------
//
// Companion to installRngTape(). Values supplied here are treated as
// ALREADY post-mod outputs of the original C rn2(N) calls (the
// `= <result>` column from NETHACK_RNGLOG, harvested by
// array). rn2/rnd/d/rne/rnz read directly from this tape with no
// `% N` reduction applied.
//
// Invariants the tape enforces:
//   - rn2(N) / rnd(N) / d(_,N) / rne(N) / rnz(_) all eventually call
//     RND(N). If the popped value is >= N, RND throws
//     Error('rng_result_tape_oor: rn2(<N>) got <popped>'). Out-of-
//     range means JS is calling rn2 with a different N than C did at
//     visible function. The error message names the offending N for
//     easy triage.
//   - Underrun throws Error('rng_result_tape_underrun') from the next
//     rng_consumed array; extra calls signal that JS is consuming
//     more RNG than C did.
//
// Mutual exclusion with installRngTape(): installing a result tape
// clears any installed pre-mod tape, and vice versa. initRng(seed)
// clears both, returning to ISAAC64.
//
// Accepts the same value shapes as installRngTape() (BigInt[],
// non-negative integer number[], digit-string[]). The argument is
// copied — callers can mutate the original afterwards.
// ---------------------------------------------------------------------
export function installRngResultTape(values) {
    if (!Array.isArray(values) && !(values && typeof values[Symbol.iterator] === 'function')) {
        throw new TypeError(`installRngResultTape expected an iterable of values, got ${typeof values}`);
    }
    const tape = [];
    for (const v of values) {
        if (typeof v === 'bigint') {
            if (v < 0n) {
                throw new RangeError(`installRngResultTape: non-negative-int values required, got ${v}`);
            }
            tape.push(v);
        }
        else if (typeof v === 'number') {
            if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
                throw new RangeError(`installRngResultTape: non-negative-int values required, got ${v}`);
            }
            tape.push(BigInt(v));
        }
        else if (typeof v === 'string' && /^\d+$/.test(v)) {
            tape.push(BigInt(v));
        }
        else {
            throw new TypeError(`installRngResultTape: bad value (need bigint/uint/digit-string), got ${typeof v} ${v}`);
        }
    }
    _rngResultTape = tape;
    set__rngResultTapePos(0);
    // Mutual exclusion: installing a result tape replaces any pre-mod tape.
    _rngTape = null;
    set__rngTapePos(0);
}
// Cosmic display debugging functions (from rnd.c)
export function cosmic_display_clear_maploc_branch() {
    cosmic_maploc_branch = null;
}
export function cosmic_display_clear_newsym_branch() {
    cosmic_newsym_branch = null;
}
export function cosmic_display_clear_cell() {
    cosmic_cell_x = 0;
    cosmic_cell_y = 0;
    cosmic_cell_active = false;
}
export function cosmic_display_set_cell(x, y) {
    cosmic_cell_x = x;
    cosmic_cell_y = y;
    cosmic_cell_active = true;
}
export function cosmic_display_set_maploc_branch(branch) {
    cosmic_maploc_branch = branch;
}
export function cosmic_display_set_newsym_branch(branch) {
    cosmic_newsym_branch = branch;
}
export function cosmic_display_prepare_rng_kind(kind) {
    cosmic_rng_kind = kind;
}

export function cosmic_display_pop_owner(owner) {
    let current;

    if (!cosmic_display_log_enabled() || !cosmic_tty_menu_logs)
        return;
    current = cosmic_display_current_owner();
    cosmic_display_logf("^disp_owner_end[owner=%s depth=%d%s%s]\n",
                        owner ? owner : "?", cosmic_owner_depth,
                        current ? " current=" : "",
                        current ? current : "");
    if (cosmic_owner_depth > 0)
        --cosmic_owner_depth;
}

export function cosmic_display_push_owner(owner) {
    let parent;

    if (!cosmic_display_log_enabled() || !cosmic_tty_menu_logs)
        return;
    parent = cosmic_display_current_owner();
    if (cosmic_owner_depth < COSMIC_OWNER_STACK_SIZE)
        cosmic_owner_stack[cosmic_owner_depth] = owner;
    cosmic_owner_depth++;
    cosmic_display_logf("^disp_owner_begin[owner=%s depth=%d%s%s]\n",
                        owner ? owner : "?", cosmic_owner_depth,
                        parent ? " parent=" : "",
                        parent ? parent : "");
}

// Mid-log state (from rnd.c)
const MIDLOG_STACK_SIZE = 16;
let _midlogStack = new Array(MIDLOG_STACK_SIZE);
let _midlogDepth = 0;
let _rngCallCount = 0;

export function midlog_enter(fn, file, line, caller) {
    if (!_rngLogEnabled)
        return;
    if (_midlogDepth < MIDLOG_STACK_SIZE)
        _midlogStack[_midlogDepth] = _rngCallCount;
    _midlogDepth++;
    _rngLog.push(`>${fn} @ ${caller}(${file}:${line})`);
}

export function midlog_exit_int(fn, result, file, line, caller) {
    if (!_rngLogEnabled)
        return;
    let entry = 0;
    --_midlogDepth;
    if (_midlogDepth >= 0 && _midlogDepth < MIDLOG_STACK_SIZE)
        entry = _midlogStack[_midlogDepth];
    _rngLog.push(`<${fn}=${result} #${entry + 1}-${_rngCallCount} @ ${caller}(${file}:${line})`);
}

export function midlog_exit_void(fn, file, line, caller) {
    if (!_rngLogEnabled)
        return;
    let entry = 0;
    --_midlogDepth;
    if (_midlogDepth >= 0 && _midlogDepth < MIDLOG_STACK_SIZE)
        entry = _midlogStack[_midlogDepth];
    _rngLog.push(`<${fn} #${entry + 1}-${_rngCallCount} @ ${caller}(${file}:${line})`);
}

export function event_mon_ref(mon, mnum, x, y) {
    if (mon) {
        return `${mnum}#${BigInt(mon.m_id).toString()}@${x | 0},${y | 0}`;
    } else {
        return `${mnum}@${x | 0},${y | 0}`;
    }
}

export function cosmic_display_log_enabled() {
    return (rng_logfile && cosmic_display_logs) ? true : false;
}
export function cosmic_display_current_owner() {
    if (cosmic_owner_depth <= 0)
        return null;
    return cosmic_owner_stack[cosmic_owner_depth - 1];
}
export function cosmic_display_logf(fmt, ...args) {
    if (!cosmic_display_log_enabled() || !cosmic_tty_menu_logs)
        return;
    // vfprintf(rng_logfile, fmt, ap) in C — no-op in JS
}
export function cosmic_display_log_newsym(x, y, branch, cansee) {
    if (!cosmic_display_log_enabled() || !cosmic_tty_menu_logs)
        return;
    cosmic_display_set_cell(x, y);
    cosmic_display_set_newsym_branch(branch);
    cosmic_display_logf("^disp_newsym[owner=%s x=%d y=%d cansee=%d branch=%s]\n",
                        cosmic_display_current_owner()
                            ? cosmic_display_current_owner()
                            : "?",
                        x, y, cansee, branch ? branch : "?");
}

export function cosmic_display_log_maploc(x, y, branch, show) {
    if (!cosmic_display_log_enabled())
        return;
    cosmic_display_set_cell(x, y);
    cosmic_display_set_maploc_branch(branch);
    cosmic_display_logf("^disp_maploc[owner=%s x=%d y=%d show=%d branch=%s]\n",
                        cosmic_display_current_owner()
                            ? cosmic_display_current_owner()
                            : "?",
                        x, y, show, branch ? branch : "?");
}

/* repaint debug scope: tracks the current repaint scope for debugging */
let repaint_debug_scope = null;

export function repaint_debug_get_scope() {
    return repaint_debug_scope;
}
