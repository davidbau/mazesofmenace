// mkobj_corpse.js — Floor corpse drops (minimal mkobj.c parity).
// C ref: mkobj.c mksobj (next_ident) + place_object; mon.c make_corpse.
// Caller should skip when mondata.monsterLeavesCorpse is false (G_NOCORPSE / mvitals).

import { rnd, rn2 } from './rng.js';
import { placeFloorObject } from './floorobj.js';
import { NH5_FOOD_CLASS } from './nh5_objclass.js';
import { game } from './gstate.js';
import { mvitalsNocorpseLikeC } from './mvitals.js';
import { MONS_MFLAGS2 } from './mons_rndmonst_ini_inv_data.js';
import {
    rndmonnumIniInvLikeC,
    undeadToCorpseIniInvLikeC,
} from './mkobj_food_class_rng_like_c.js';

/** C: monflag.h M2_NEUTER */
const M2_NEUTER = 0x00040000;
import { ICE, IS_DRAWBRIDGE, DB_ICE, DB_UNDER, PM_LICHEN, PM_LIZARD } from './const.js';
import { startCorpseTimeout, objTimerChecksMkobj } from './obj_rot_timer.js';

/** C: trap.c is_ice / melt_ice.js isIceAt — ice floor or drawbridge span with DB_ICE. */
function cellIsIce(g, x, y) {
    const loc = g.level?.at(x, y);
    if (!loc) return false;
    if (loc.typ === ICE) return true;
    return !!(IS_DRAWBRIDGE(loc.typ) && (loc.flags & DB_UNDER) === DB_ICE);
}

/** NH5 objects_nums corpse otyp (matches mklev.js CORPSE). */
export const CORPSE_OTYP = 471;

/**
 * C: mkobj.c mksobj_init — FOOD_CLASS CORPSE branch (before mkcorpstat ptr override).
 * Consumes rndmonnum (+ retry) even when caller fixes corpsenm afterward.
 */
export function consumeMksobjInitCorpseRngLikeC() {
    let tryct = 50;
    let cm = 0;
    do {
        cm = undeadToCorpseIniInvLikeC(rndmonnumIniInvLikeC());
    } while (mvitalsNocorpseLikeC(game, cm) && --tryct > 0);
}

/**
 * C: mkobj.c mksobj tail — CORPSE/STATUE/FIGURINE spe when gender not fixed.
 * @param {number} corpsenm
 */
export function consumeMksobjCorpseSpeRngLikeC(corpsenm) {
    const pm = corpsenm | 0;
    /* C: mkobj.c mksobj CORPSE/STATUE — fixed gender skips rn2(2); else rn2(2). */
    if (pm === PM_LICHEN || pm === PM_LIZARD) return;
    if (((MONS_MFLAGS2[pm] | 0) & M2_NEUTER) !== 0) return;
    rn2(2);
}

/**
 * Place a single corpse on the floor like mksobj(CORPSE) + place_object.
 * Consumes one `rnd(2)` draw (C `next_ident`) when creating the stack.
 * @param {{ mnum?: number, data?: { mnum?: number } }} mtmp
 * @param {typeof game} [g]
 */
export function placeCorpseForMonster(mtmp, x, y, g = game) {
    rnd(2);
    const corpsenm = (mtmp?.mnum ?? mtmp?.data?.mnum ?? 0) | 0;
    const otmp = {
        otyp: CORPSE_OTYP,
        oclass: NH5_FOOD_CLASS,
        ox: -1,
        oy: -1,
        quan: 1,
        owt: 1,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        corpsenm,
        age: g.moves ?? 0,
    };
    /* C: mkobj.c **`set_corpsenm`** → **`start_corpse_timeout`** before **`place_object`** */
    startCorpseTimeout(g, otmp);
    placeFloorObject(otmp, x, y);
    if (cellIsIce(g, x, y)) {
        otmp.on_ice = 1;
        objTimerChecksMkobj(g, otmp, x, y, 0, 'floor', cellIsIce);
    }
    return otmp;
}
