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
import { PMNAMES, MONSYMS } from './monst_data.js';
import { M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { ONAMES } from './objects_data.js';
import { ART_TROLLSBANE } from './artilist_data.js';

// include/monst.h:247 troll_baned()
export const troll_baned = (m, o) =>
    m.data.mlet === MONSYMS.S_TROLL && !!o && o.oartifact === ART_TROLLSBANE;
// include/monst.h:220 vampshifted(); a vampire in its shifted form
export const vampshifted = (mon) =>
    is_vampshifter(mon) && mon.data.mlet !== MONSYMS.S_VAMPIRE;
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

// include/monst.h:244 is_obj_mappear() — a mimic currently imitating one
// specific object type.
export const is_obj_mappear = (mon, otyp) =>
    M_AP_TYPE(mon) === M_AP_OBJECT && mon.mappearance === otyp;

// include/monst.h:233 is_lightblocker_mappear() — mimic appearances that block
// vision/light: a fake boulder, closed door, wall, or tree. does_block() asks
// this for every mimic it finds on a square.
export const is_lightblocker_mappear = (mon) =>
    is_obj_mappear(mon, ONAMES.BOULDER)
    || (M_AP_TYPE(mon) === M_AP_FURNITURE
        && (mon.mappearance === MONSYMS.S_hcdoor
            || mon.mappearance === MONSYMS.S_vcdoor
            || mon.mappearance < MONSYMS.S_ndoor /* = walls */
            || mon.mappearance === MONSYMS.S_tree));

// include/monst.h:240 is_door_mappear() — a mimic currently imitating a closed
// door. lookaround() needs it: a mimicking door stops a run exactly as a real
// closed door does.
export const is_door_mappear = (mon) =>
    M_AP_TYPE(mon) === M_AP_FURNITURE
    && (mon.mappearance === MONSYMS.S_hcdoor
        || mon.mappearance === MONSYMS.S_vcdoor);

// include/monst.h:255 mon_offmap() — ((mon)->mstate != MON_FLOOR).
//
// mstate is not tracked yet, so `| 0` makes an absent value read as MON_FLOOR
// (0) and the monster counts as on the map. Without that coercion `undefined
// !== 0` is true and EVERY monster reads as off-map, which would make
// movemon skip the entire level.
import { MON_FLOOR } from './const.js';
export const mon_offmap = (mon) => (mon.mstate | 0) !== MON_FLOOR;
