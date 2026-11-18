// monst.c — monst_globals_init (monster data table initialization and constants).
// C ref: monst.c:1-89
// @ts-nocheck
import monsPack from './makemon_mons.json' with { type: 'json' };
import monMattkPack from './makemon_mattk.json' with { type: 'json' };
import { PM_HIPPOCRATES, PM_KING_ARTHUR } from './pm.generated.js';

const NON_PM = -1;            /* permonst.h:14 */
const NATTK = 6;              /* permonst.h:48 */
const AT_NONE = 0;            /* monattk.h:12 */
const AT_CLAW = 1;            /* monattk.h:13 */
const AT_BITE = 2;            /* monattk.h:14 */
const AD_PHYS = 0;            /* monattk.h:42 */
const AD_DRLI = 15;           /* monattk.h:57 */
const AD_SSEX = 35;           /* monattk.h:77 */
const G_NOCORPSE = 0x0010;    /* monflag.h:201 */
const G_NOGEN = 0x0200;       /* monflag.h:197 */
const M2_NOPOLY = 0x00000001; /* monflag.h:123 */

const NO_ATTK = Object.freeze({ aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 });

/**
 * mons: live global monster table (C: struct permonst mons[SIZE(mons_init)]).
 * Shared object identity with all consumers of makemon_mons.json.
 * C ref: monst.c:69
 */
export const mons = monsPack.mons;
const mattk = monMattkPack.mattk;

/* C v5 include/monsters.h:3515-3526: Hippocrates and King Arthur have
 * LVL(20, 15, 0, 90, ...), not speed 12 as in the older generated rows.
 * Apply before snapshotting mons_init so every consumer and reset sees 15. */
mons[PM_HIPPOCRATES][9] = 15;
mons[PM_KING_ARTHUR][9] = 15;

/**
 * mons_init / mattk_init: pristine static initializers copied into the live
 * tables by monst_globals_init().
 * C ref: monst.c:39-61 static struct permonst mons_init[NUMMONS + 1]
 */
const mons_init = mons.map((row) => row.slice());
const mattk_init = mattk.map((row) => row.map(
    (a) => ({ aatyp: a.aatyp, adtyp: a.adtyp, damn: a.damn, damd: a.damd })));

/**
 * Array terminator at mons[NUMMONS] (index 383), matching monst.c:48-60.
 * Kept separate from mons[] so mons.length remains NUMMONS (383) for JS loops.
 */
export const MONS_TERMINATOR = Object.freeze({
    pmnames: Object.freeze([null, null, '']),
    pmidx: NON_PM,
    mlet: 0,
    mlevel: 0,
    mmove: 0,
    ac: 0,
    mr: 0,
    maligntyp: 0,
    geno: G_NOGEN | G_NOCORPSE,
    mattk: Object.freeze(Array.from({ length: NATTK }, () => NO_ATTK)),
    cwt: 0,
    cnutrit: 0,
    msound: 0,
    msize: 0,
    mresists: 0,
    mconveys: 0,
    mflags1: 0,
    mflags2: M2_NOPOLY,
    mflags3: 0,
    difficulty: 0,
    mcolor: 0,
});

/**
 * C ref: monst.c:78 — const struct attack c_sa_yes[NATTK] = SEDUCTION_ATTACKS_YES;
 * C ref: monsters.h:2922-2924
 */
export const c_sa_yes = Object.freeze([
    Object.freeze({ aatyp: AT_BITE, adtyp: AD_SSEX, damn: 0, damd: 0 }),
    Object.freeze({ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }),
    Object.freeze({ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }),
    NO_ATTK,
    NO_ATTK,
    NO_ATTK,
]);

/**
 * C ref: monst.c:79 — const struct attack c_sa_no[NATTK] = SEDUCTION_ATTACKS_NO;
 * C ref: monsters.h:2925-2927
 */
export const c_sa_no = Object.freeze([
    Object.freeze({ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }),
    Object.freeze({ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }),
    Object.freeze({ aatyp: AT_BITE, adtyp: AD_DRLI, damn: 2, damd: 6 }),
    NO_ATTK,
    NO_ATTK,
    NO_ATTK,
]);

/**
 * monst_globals_init: initialize mons (and mattk) from static mons_init.
 *
 * C ref: monst.c:71-76 void monst_globals_init(void) { memcpy(mons, mons_init, sizeof mons); }
 * Restores element-by-element in place so all modules holding references to the
 * shared monster tables see C's fresh process-start values, while a fresh
 * process with no prior mutations does pure reads.
 */
export function monst_globals_init() {
    for (let i = 0; i < mons_init.length; i++) {
        const row = mons[i], pristine = mons_init[i];
        for (let j = 0; j < pristine.length; j++)
            row[j] = pristine[j];
    }
    for (let i = 0; i < mattk_init.length; i++) {
        const row = mattk[i], pristine = mattk_init[i];
        for (let k = 0; k < pristine.length; k++) {
            const atk = row[k], p = pristine[k];
            atk.aatyp = p.aatyp;
            atk.adtyp = p.adtyp;
            atk.damn = p.damn;
            atk.damd = p.damd;
        }
    }
}
