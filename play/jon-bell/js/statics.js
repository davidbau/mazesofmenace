// @ts-nocheck
// statics.js — THE PROCESS BOUNDARY C HAS AND js/ DOES NOT.
//
// Every `static`/file-scope object in the C tree is re-initialised from its
// SEGMENT as a fresh C process: the organiser saves, exits, and restores.  C
// relies on that so hard that it re-derives one of these tables by hand on the
// way back in — restore.c:727 calls `adj_erinys(u.ualign.abuse)` "after all
// mons & objs are restored", which is only necessary because the restoring
// process's `mons[]` came up pristine.
//
// js/ has no such boundary.  An ESM module object — a JSON import above all —
// is a PROCESS-lifetime singleton: `import mons from './makemon_mons.json'`
// hands 29 different js/ modules THE SAME array, and nothing ever puts it
// back.  So a game that mutates a static table (mon.c:5922 adj_erinys() does,
// faithfully, and it is right to) leaves it mutated for every later game in
//
// WHAT THIS MODULE IS ALLOWED TO DO, and the two rules are why it is a module
// rather than a few lines in resetGame():
//
//     reference at import time and several alias individual ROWS
//     (permonstTemplate hands out `MONS[mndx]`).  Assigning a fresh array to
//     an `export let` is invisible to every one of them — that exact bug was
//     fixed on resetGame() itself (see js/gstate.js:60).  Everything below
//     writes element-by-element into the objects that already exist.
//
//  2. INVALIDATE WHAT WAS DERIVED FROM THEM.  A restored table plus a live
//     memo built off the old one is a worse state than either: makemon.js's
//     `mongenOrder` is C's `static int mongen_order[]`, sorted on
//     `mons[].difficulty`, and adj_erinys() moves erinys' difficulty 10 -> 18.
//     Owners register an invalidator with registerStaticReset(); a module that
//     was never imported never registers, which is correct — an unloaded
//     module holds no stale memo.
//
// NOT a new lifecycle concept: resetGame() (js/gstate.js) is the existing
// "fresh C process" point — js/jsmain.js NethackGame.start() already resets
// the worm/light/region/bubble module roots there under that exact heading —
// and this runs as its first act.
//
// A GENUINE NO-OP IN A FRESH PROCESS.  The pristine snapshot is taken at
// module load, before any game code can run, and every write below is guarded
// by a !== compare, so the first reset of a process writes nothing at all and

import monsPack from './makemon_mons.json' with { type: 'json' };
import monMattkPack from './makemon_mattk.json' with { type: 'json' };
import { PM_HIPPOCRATES, PM_KING_ARTHUR } from './pm.generated.js';

const MONS = monsPack.mons;
const MATTK = monMattkPack.mattk;

// C v5 include/monsters.h:3515-3526: both leaders have speed 15, not the
// older generated rows' 12.  Correct the shared initializers before taking
// the pristine snapshot so every consumer and segment uses the v5 values.
MONS[PM_HIPPOCRATES][9] = 15;
MONS[PM_KING_ARTHUR][9] = 15;
/* C v5 include/monsters.h:3516 — Hippocrates has LVL(20, 15, 0, 90, 0).
 * Correct the older table's speed before capturing the static initialisers,
 * so every mons[] reader and each fresh game uses the same v5 value. */
/* NetHack 5.0 include/monsters.h:3516: Hippocrates has LVL(20, 15, ...).
 * Correct the older packed speed before snapshotting C's initialisers so
 * every consumer, including mcalcmove and permonstTemplate, shares it. */
/* C v5 include/monsters.h:3516: Hippocrates has LVL(20, 15, 0, 90, 0).
 * Correct the shared speed row before capturing the per-process initialisers. */
MONS[PM_HIPPOCRATES][9] = 15;
/* NetHack 5.0 monsters.h:3515-3525: both leaders have LVL speed 15.
 * Update the older packed initialisers before snapshotting them for reset. */
MONS[PM_HIPPOCRATES][9] = 15;
MONS[PM_KING_ARTHUR][9] = 15;
/* NetHack 5.0 include/monsters.h:3515-3516: Hippocrates has speed 15.
 * Correct the shared packed initialiser before snapshotting it for resets. */
MONS[PM_HIPPOCRATES][9] = 15;

const MONS_PRISTINE = MONS.map((row) => row.slice());
const MATTK_PRISTINE = MATTK.map((row) => row.map(
    (a) => ({ aatyp: a.aatyp, adtyp: a.adtyp, damn: a.damn, damd: a.damd })));

/** @type {{name: string, fn: () => void}[]} */
const derivedResets = [];

/**
 * Register an invalidator for module-level state that C re-initialises when a
 * process starts — a memo derived from one of the tables above, or a plain C
 * function static.  Called at module load by the module that OWNS the state,
 * so the state stays module-private and there is exactly one writer.
 *
 * @param {string} name  owner, for the leak instrument's reports
 * @param {() => void} fn
 */
export function registerStaticReset(name, fn) {
    /* Idempotent by name.  A module normally evaluates once per process, but
     * a tool that imports js/ through a cache-busting URL evaluates it again,
     * and an unbounded list of identical invalidators would be a leak of its
     * own.  Names carry their owning module, so a collision is a duplicate. */
    for (let i = 0; i < derivedResets.length; i++)
        if (derivedResets[i].name === name) {
            derivedResets[i].fn = fn;
            return;
        }
    derivedResets.push({ name, fn });
}

/* Restore the two shared monster tables to their static initialisers.
 * Element-wise and compare-first: rule 1 above, and it makes the common case
 * (nothing was mutated) pure reads. */
function restoreMonsterTables() {
    for (let i = 0; i < MONS_PRISTINE.length; i++) {
        const row = MONS[i], pristine = MONS_PRISTINE[i];
        for (let j = 0; j < pristine.length; j++)
            if (row[j] !== pristine[j])
                row[j] = pristine[j];
    }
    for (let i = 0; i < MATTK_PRISTINE.length; i++) {
        const row = MATTK[i], pristine = MATTK_PRISTINE[i];
        for (let k = 0; k < pristine.length; k++) {
            const atk = row[k], p = pristine[k];
            if (atk.aatyp !== p.aatyp) atk.aatyp = p.aatyp;
            if (atk.adtyp !== p.adtyp) atk.adtyp = p.adtyp;
            if (atk.damn !== p.damn) atk.damn = p.damn;
            if (atk.damd !== p.damd) atk.damd = p.damd;
        }
    }
}

/**
 * The C process boundary.  Called first thing by resetGame(), i.e. once per
 * segment, which is once per C process in the organiser's recording.
 *
 * ORDER MATTERS: tables first, then the memos derived from them, so an
 * invalidator that chooses to rebuild eagerly sees pristine inputs.
 */
export function resetStatics() {
    restoreMonsterTables();
    for (let i = 0; i < derivedResets.length; i++)
        derivedResets[i].fn();
}

export function staticResetOwners() {
    return derivedResets.map((r) => r.name);
}
