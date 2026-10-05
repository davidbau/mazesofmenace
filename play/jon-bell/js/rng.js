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
let _rngTapePos = 0;
let _rngResultTape = null;
let _rngResultTapePos = 0;
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
    _rngTapePos = 0;
    _rngResultTape = null;
    _rngResultTapePos = 0;
}
export function rngResultTapeResidual() {
    if (!_rngResultTape) return 0;
    return _rngResultTape.length - _rngResultTapePos;
}
export function enableRngLog() { _rngLogEnabled = true; _rngLog = []; }
export function getRngLog() { return _rngLog; }
export function pushRngLogEntry(entry) { if (_rngLogEnabled)
    _rngLog.push(entry); }
// ---------------------------------------------------------------------
//
// When env var STEP_EXPLORER_RNG_TRACE=1 (set ONLY by the
// suffixed with " @<file.js:line>" naming the JS caller. This is purely
// a label appended to the log string — it does NOT change RNG values,
// code path is a no-op single-property read; semantics are identical
// to the previous unannotated behaviour.
//
// Why a string suffix rather than a parallel structured log: the
// existing log API (getRngLog()) returns string[], every consumer
// already parses strings, and appending a " @<…>" tail is non-
// destructive — the C-side trace format already uses the same
// " @ <fn>(<file>:<line>)" tail, so JS and C lines render
// symmetrically in side-by-side panes.
//
// Anti-cheat: this records WHERE JS called rn2 — it does NOT read
// for the only consumer.
// ---------------------------------------------------------------------
const _STEP_EXPLORER_RNG_TRACE = !!(typeof process !== 'undefined'
    && ENV && ENV.STEP_EXPLORER_RNG_TRACE);
function _stepExplorerCallerTag() {
    // this helper + the immediate rn2/rnd/d/rne/rnz frame and report the
    // call site. Cheap when the env flag is off (we return ''); when on,
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    // Find first frame whose path does NOT mention 'rng.js'. Lines look
    // like "    at rn2 (/.../js/rng.js:128:13)" or
    // "    at uInitMisc (/.../js/u_init.js:42:5)".
    for (let i = 1; i < lines.length; i++) {
        const ln = lines[i];
        if (!ln) continue;
        if (ln.includes('/js/rng.js') || ln.includes('\\js\\rng.js')) continue;
        // Extract trailing "(<path>:<line>:<col>)" or "<path>:<line>:<col>"
        const m = ln.match(/\(?([^()\s]+):(\d+):(?:\d+)\)?\s*$/);
        if (!m) continue;
        const path = m[1];
        // Trim everything before "js/" or "src/" for compact display.
        const idx = path.lastIndexOf('/js/');
        const srcIdx = path.lastIndexOf('/src/');
        let display = path;
        if (idx >= 0) display = path.slice(idx + 1);  // "js/foo.js"
        else if (srcIdx >= 0) display = path.slice(srcIdx + 1);
        else display = path.slice(path.lastIndexOf('/') + 1);
        return ` @${display}:${m[2]}`;
    }
    return '';
}
function _maybeTagEntry(entry) {
    if (!_STEP_EXPLORER_RNG_TRACE) return entry;
    return entry + _stepExplorerCallerTag();
}
// RND(x) — the C-side staticfn (rnd.c:572) `isaac64_next_uint64(...) % x`.
// Used by ISAAC64 mode and by the pre-mod tape (installRngTape, where the
// tape stores raw isaac64-style outputs and each call site applies its
// own `% N`).
//
// The result-tape path does NOT go through RND. Each public primitive
// (rn2/rnd/d/rne/rnz) handles its own tape pop and validation against its
// own return-space — see the per-function block in the wrappers below.
// come from NETHACK_RNGLOG's `= <result>` column, which is each
// function's OWN return (rnd returns 1..N, not rn2's 0..N-1), so a
// single shared RND-shaped reduction would mis-interpret rnd/d/rne/rnz
// returns.
function RND(x) {
    if (_rngTape !== null) {
        if (_rngTapePos >= _rngTape.length) {
            throw new Error('rng_tape_underrun');
        }
        const popped = _rngTape[_rngTapePos++];
        // Apply the same mod reduction the post-tape semantics promise
        // (see installRngTape() docs): pre-mod values from the tape get
        // % x applied here so one tape works across call sites with
        // different N args. BigInt arithmetic mirrors the ISAAC64
        // branch exactly — values that are already < x reduce to
        // themselves.
        return Number(popped % BigInt(x));
    }
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}
// popResultTape — pop one value from _rngResultTape, no validation.
// The caller decides the return-space (rn2: 0..N-1, rnd: 1..N, d: X..X*Y,
// rne: >=1, rnz: >0) and throws rng_result_tape_oor if the popped value
// is outside it. Underrun is shared.
function popResultTape() {
    if (_rngResultTapePos >= _rngResultTape.length) {
        throw new Error('rng_result_tape_underrun');
    }
    const popped = _rngResultTape[_rngResultTapePos++];
    return Number(popped);
}
export function rn2_on_display_rng(x) {
    if (x <= 0)
        return 0;
    if (!game.dispCtx) {
        _initDispCtx(game.currentSeed | 0);
    }
    return Number(isaac64_next_uint64(game.dispCtx) % BigInt(x));
}
// C ref: rn2(x) — random number 0..x-1
export function rn2(x) {
    if (x <= 0)
        return 0;
    let val;
    if (_rngResultTape !== null) {
        // Result-tape: popped value is the C-side rn2(x) return,
        // already in [0, x-1]. If popped >= x, JS is calling rn2 with
        // a different N than C did at this step (Cardinal Rule 2
        // violation) — surface as rng_result_tape_oor.
        const popped = popResultTape();
        if (popped < 0 || popped >= x) {
            throw new Error(`rng_result_tape_oor: rn2(${x}) got ${popped}`);
        }
        val = popped;
    }
    else {
        val = RND(x);
    }
    if (_rngLogEnabled)
        _rngLog.push(_maybeTagEntry(`rn2(${x})=${val}`));
    return val;
}
// C ref: rnd(x) — random number 1..x. C impl: rn2(x)+1.
export function rnd(x) {
    if (x <= 0)
        return 0;
    let val;
    if (_rngResultTape !== null) {
        // Result-tape: popped value is the C-side rnd(x) return,
        // already in [1, x]. Return directly — do NOT add 1 (that
        // value is the post-`+1` C return, not the pre-`+1` rn2
        // result). Out-of-range means JS is invoking rnd with a
        // different N than C did at this step.
        const popped = popResultTape();
        if (popped < 1 || popped > x) {
            throw new Error(`rng_result_tape_oor: rnd(${x}) got ${popped}`);
        }
        val = popped;
    }
    else {
        val = RND(x) + 1;
    }
    if (_rngLogEnabled)
        _rngLog.push(_maybeTagEntry(`rnd(${x})=${val}`));
    return val;
}
// C ref: rn1(x, y) — random number y..y+x-1
export function rn1(x, y) { return rn2(x) + y; }
// C ref: d(n, x) — roll n dice of x sides (rnd.c:750). Return space n..n*x.
// C logs one d(n,x)=result entry; internal RND() calls are unlogged. Must not call rnd().
export function d(n, x) {
    let tmp;
    if (_rngResultTape !== null) {
        // Result-tape: popped value is the C-side d(n,x) return,
        // outer d() result line; the internal RND(x) calls inside the
        // loop emit no separate `= R` log entries (rnd.c suppresses
        // them via RNGLOG_IN_RND_C), so the tape carries exactly one
        // value per d() call. We pop once and return it.
        // Lower-bound check (popped >= n) is sufficient; upper bound
        // value is valid by construction.
        const popped = popResultTape();
        if (popped < n) {
            throw new Error(`rng_result_tape_oor: d(${n},${x}) got ${popped}`);
        }
        tmp = popped;
    }
    else {
        tmp = n;
        for (let i = 0; i < n; i++)
            tmp += RND(x);
    }
    if (_rngLogEnabled)
        _rngLog.push(_maybeTagEntry(`d(${n},${x})=${tmp}`));
    return tmp;
}
// C ref: rne(x) — exponentially distributed. Return space 1..max(ulevel/3, 5).
// Internal rn2 calls are logged (matching C's PRNG log format).
export function rne(x) {
    if (_rngResultTape !== null) {
        const popped = popResultTape();
        if (popped < 1)
            throw new Error(`rng_result_tape_oor: rne(${x}) got ${popped}`);
        if (_rngLogEnabled)
            _rngLog.push(_maybeTagEntry(`rne(${x})=${popped}`));
        return popped;
    }
    const ulevel = game.u?.ulevel || 1;
    const utmp = ulevel < 15 ? 5 : Math.trunc(ulevel / 3);
    let tmp = 1;
    while (tmp < utmp && !rn2(x))
        tmp++;
    if (_rngLogEnabled)
        _rngLog.push(_maybeTagEntry(`rne(${x})=${tmp}`));
    return tmp;
}
// C ref: rnz(i) — fuzzy random around i. Returns some positive integer.
// Internal rn2/rne calls are logged (matching C's PRNG log format).
export function rnz(i) {
    if (_rngResultTape !== null) {
        const popped = popResultTape();
        if (popped <= 0)
            throw new Error(`rng_result_tape_oor: rnz(${i}) got ${popped}`);
        if (_rngLogEnabled)
            _rngLog.push(_maybeTagEntry(`rnz(${i})=${popped}`));
        return popped;
    }
    let x = i;
    let tmp = 1000;
    tmp += rn2(1000);
    tmp *= rne(4);
    if (rn2(2)) {
        x *= tmp;
        x = Math.trunc(x / 1000);
    }
    else {
        x *= 1000;
        x = Math.trunc(x / tmp);
    }
    if (_rngLogEnabled)
        _rngLog.push(_maybeTagEntry(`rnz(${i})=${x}`));
    return x;
}
// C ref: rnd.c:674 rnl(x) — 0 <= rnl(x) < x, sometimes subtracting Luck.
// The main draw uses RND(x) directly (unlogged, like d()'s internal RND).
// When adjustment (Luck) is non-zero, C ALSO calls rn2(37+|adj|) as its
// guard, and that inner call IS a real logged rn2 entry (patches/
// 003-rng-log-core.patch suppresses only the inner call's own caller-
// context, not the log line itself) -- so the tape carries TWO entries in
// that case, `rn2(37+|adj|)=...` immediately followed by rnl's own
// is never called (C short-circuits `adjustment && rn2(...)`), and only the
// only one slot unconditionally, desyncing the tape by one draw on every
// non-zero-Luck rnl() call (witness: dokick record #32, rn2(38)=8 popped as
// rnl(7)'s own result).
export function rnl(x) {
    if (x <= 0)
        return 0;
    let i;
    // C: adjustment = Luck;  Luck = u.uluck + u.moreluck (decl.h). Needed in
    // BOTH branches: when non-zero, C's rnl() makes a SECOND logged draw
    // (the internal `rn2(37+|adj|)` guard, rnd.c:141) before its own
    // kick_nondoor(dokick.c:1147)` precedes `rnl(7)=4` in the same call's
    // rng_consumed, and the old tape branch (which never computed adjustment
    // or popped this leading slot) threw rng_result_tape_oor popping 8 for
    // rnl(7).
    const u = game.u || {};
    let adjustment = ((u.uluck | 0) + (u.moreluck | 0)) | 0;
    if (x <= 15) {
        // C rnd.c:692: (abs(adj)+1)/3 * sgn(adj)
        const absAdj = Math.abs(adjustment);
        const s = adjustment < 0 ? -1 : (adjustment !== 0 ? 1 : 0);
        adjustment = Math.trunc((absAdj + 1) / 3) * s;
    }
    if (_rngResultTape !== null) {
        if (adjustment) {
            // Pop-and-discard the internal rn2(37+|adj|) entry C logs
            // BEFORE its own `rnl(x)=i` line -- see comment above. Its
            // value already determined the adjustment C applied, which is
            // baked into the `i` popped next; we only need to keep the tape
            // aligned, same pattern as rne()/rnz()'s trailing-slot discard.
            const innerBound = 37 + Math.abs(adjustment);
            const discarded = popResultTape();
            if (discarded < 0 || discarded >= innerBound) {
                throw new Error(`rng_result_tape_oor: rnl(${x}) internal rn2(${innerBound}) got ${discarded}`);
            }
        }
        // Result-tape: popped value is the C-side rnl(x) return, in [0, x-1].
        const popped = popResultTape();
        if (popped < 0 || popped >= x) {
            throw new Error(`rng_result_tape_oor: rnl(${x}) got ${popped}`);
        }
        i = popped;
    }
    else {
        i = RND(x); // C: i = RND(x) — internal, unlogged (like d())
        if (adjustment && rn2(37 + Math.abs(adjustment))) {
            i -= adjustment;
            if (i < 0) i = 0;
            else if (i >= x) i = x - 1;
        }
    }
    if (_rngLogEnabled)
        _rngLog.push(_maybeTagEntry(`rnl(${x})=${i}`));
    return i;
}
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
    _rngTapePos = 0;
    // Mutually exclusive with the result tape — installing one clears
    // the other (documented in the two-mode block at the top of this
    // file). Without this, a stale result tape would shadow the
    // freshly installed pre-mod tape.
    _rngResultTape = null;
    _rngResultTapePos = 0;
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
    _rngResultTapePos = 0;
    // Mutual exclusion: installing a result tape replaces any pre-mod tape.
    _rngTape = null;
    _rngTapePos = 0;
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
