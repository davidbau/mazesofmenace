// mthrowu.js — monsters throwing or shooting at the hero.
// C ref: mthrowu.c.  Ported so far: thrwmu() up to the polearm hit
// (thitu()) and the missile volley (monshoot()), which aren't ported yet
// and stop with a 'not ported yet' error.  m_carrying() and
// m_has_launcher_and_ammo() live in weapon.js.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { distmin, dist2 } from './hacklib.js';
import { couldsee } from './vision.js';
import { BOLT_LIM, MON_POLE_DIST, NEED_WEAPON, NEED_RANGED_WEAPON,
         P_POLEARMS, P_LANCE } from './const.js';
import { objects, WEAPON_CLASS, TOOL_CLASS } from './objects.js';
import { ART_SNICKERSNEE } from './artilist.js';
import { mon_wield_item, select_rwep, autoreturn_weapon,
         mwelded } from './weapon.js';
import { lined_up } from './monmove.js';

/* C ref: obj.h is_pole() */
function is_pole(otmp) {
    return (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
           && (objects[otmp.otyp].oc_skill === P_POLEARMS
               || objects[otmp.otyp].oc_skill === P_LANCE
               || otmp.oartifact === ART_SNICKERSNEE);
}

/* C ref: mthrowu.c URETREATING() */
function URETREATING(x, y) {
    const u = game.u;
    return distmin(u.ux, u.uy, x, y) > distmin(u.ux0, u.uy0, x, y);
}

// C ref: mthrowu.c thrwmu()
/* monster attempts ranged weapon attack against player */
export async function thrwmu(mtmp) {
    let otmp;
    let rang;
    let arw;
    let always_toss = false;

    /* Rearranged beginning so monsters can use polearms not in a line */
    if (mtmp.weapon_check === NEED_WEAPON || !mtmp.mw) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (await mon_wield_item(mtmp) !== 0)
            return;
    }

    /* Pick a weapon */
    otmp = select_rwep(mtmp);
    if (!otmp)
        return;

    if (is_pole(otmp)) {
        if (otmp !== mtmp.mw)
            return; /* polearm, aklys must be wielded */

        /*
         * MON_POLE_DIST encompasses knight's move range (5): two spots
         * away provided it's not on a straight diagonal, same as skilled
         * hero.  Using polearm while adjacent is allowed but the verb
         * is adjusted from "thrusts" to "bashes", where the hero would
         * have to switch from applying a polearm to ordinary melee attack
         * to accomplish that.
         */
        rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > MON_POLE_DIST || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */

        /* "<Mon> thrusts <polearm>.", dmgval(), thitu(), stop_occupation() */
        throw new Error('thrwmu(): polearm hit (thitu()) not ported yet');
    } else if ((arw = autoreturn_weapon(otmp)) != null && !mwelded(otmp)) {
        rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > arw.range || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */
        always_toss = true;
    }

    const x = mtmp.mx;
    const y = mtmp.my;
    /* If you are coming toward the monster, the monster
     * should try to soften you up with missiles.  If you are
     * going away, you are probably hurt or running.  Give
     * chase, but if you are getting too far away, throw.
     */
    if (!lined_up(mtmp)
        || (URETREATING(x, y)
            && (!always_toss
                && rn2(BOLT_LIM - distmin(x, y, mtmp.mux, mtmp.muy)))))
        return;

    /* mwep = MON_WEP(mtmp); monshoot(mtmp, otmp, mwep); nomul(0); */
    throw new Error('thrwmu(): monshoot() not ported yet');
}
