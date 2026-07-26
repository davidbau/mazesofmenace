// monst.js — the macros from include/monst.h.
//
// Same role js/obj.js plays for include/obj.h and js/mondata.js for
// include/mondata.h: a header's macros are shared by every C file that includes
// it, so they need one JS home rather than a private copy per module. There was
// already a second copy of DEADMONSTER living in js/dog.js, which is how a
// header macro drifts.

// include/monst.h:214 DEADMONSTER()
export const DEADMONSTER = (mon) => (mon.mhp ?? 0) < 1;

// include/monst.h:210 MON_WEP() — the monster's wielded weapon.
export const MON_WEP = (mon) => mon.mw || null;

// include/monst.h:216 is_vampshifter() — takes a MONSTER, not a permonst,
// because it reads cham (what the creature really is) rather than data (what
// shape it currently wears).
import { PMNAMES } from './monst_data.js';
export const is_vampshifter = (mon) =>
    mon.cham === PMNAMES.PM_VAMPIRE || mon.cham === PMNAMES.PM_VAMPIRE_LEADER
    || mon.cham === PMNAMES.PM_VLAD_THE_IMPALER;

// include/monst.h:251 helpless() — asleep or unable to move.
//
// EXACTLY two terms. An earlier copy in js/uhitm.js carried a third,
// `(mon.mfrozen | 0) > 0`, which the C does not have: mfrozen is a separate
// bitfield (monst.h:147) and is NOT part of this macro. That extra term made
// any frozen-but-mobile monster read as helpless, which changes combat
// branches -- find_roll_to_hit gives a to-hit bonus against the helpless, and
// growl() returns silently for them.
export const helpless = (mon) => !!(mon.msleeping || !mon.mcanmove);
