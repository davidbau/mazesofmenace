// rnd.js — C ref: rnd.c.
import { _rngResultTape } from './rng.js';
import { game } from './gstate.js'; // relocate-fns
import { ENV } from './hostenv.js'; // relocate-fns
import { isaac64_next_uint64 } from './isaac64.js'; // relocate-fns
import { _initDispCtx, _rngLog, _rngLogEnabled, _rngTape } from './rng.js'; // relocate-fns

/* C ref: rnd.c:298-309 shuffle_int_array(indices, count) — Fisher-Yates over
 * an int[], used once here (apply.c:2333) to randomise which properties an
 * uncursed/blessed unicorn horn fixes first. */
export function shuffle_int_array(indices, count) {
    for (let i = count - 1; i > 0; i--) {
        const iswap = rn2(i + 1);
        if (iswap === i) continue;
        const tmp = indices[i];
        indices[i] = indices[iswap];
        indices[iswap] = tmp;
    }
}

export let _rngTapePos = 0;
export function set__rngTapePos(v) { _rngTapePos = v; }

export let _rngResultTapePos = 0;
export function set__rngResultTapePos(v) { _rngResultTapePos = v; }
export function popResultTape() {
    if (_rngResultTapePos >= _rngResultTape.length) {
        throw new Error('rng_result_tape_underrun');
    }
    const popped = _rngResultTape[_rngResultTapePos++];
    return Number(popped);
}

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
        const pos = _rngTapePos;
        set__rngTapePos(pos + 1);
        const popped = _rngTape[pos];
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
