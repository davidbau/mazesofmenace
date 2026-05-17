// throw_hero.js — dothrow.c throwit subset: slip rng, stamina **`calc_capacity`**, **`toss_up`**, zap.c bhit ray, u.dz→hitfloor;
//        throwit tail (**`breakobj`/`flooreffects`/`place_object`**) + **`throwit_mon_hit`**/**`thitmonst`** subset.
// C ref: dothrow.c throwit(), zap.c bhit(); invent.c remove from invent.

import { game } from './gstate.js';
import { pline, flush_screen } from './display.js';
import { readDirIntoU } from './dir_input.js';
import { removeObjFromHeroInvent } from './water_damage.js';
import { hitfloorHeroLikeC } from './hitfloor_hero.js';
import { blocksMovementAt } from './walkable.js';
import { isok } from './hacklib.js';
import { rn2 } from './rng.js';
import { doname } from './objnam.js';
import {
    thrownWeaponRangeHeroLikeC,
    walkThrownWeaponBhitRayHeroLikeC,
    throwingWeaponHeroThrowitLikeC,
    throwitPlaceAfterBhitHeroLikeC,
} from './bhit_throw_hero.js';
import { throwitMonHitThrownHeroLikeC } from './throwit_mon_hit_hero.js';
import { ammoAndLauncherLikeC } from './weapon_kind.js';
import { tossUpHeroThrowitLikeC } from './toss_up_hero.js';
import { calcCapacityXtraWtLikeC } from './encumbr.js';
import { exercise } from './attrib.js';
import { A_CON, Is_airlevel, SLT_ENCUMBER } from './const.js';

/**
 * C: dothrow.c throwit opening slip (rn2(7), cursed/greased, ammo_and_launcher misfire vs slip) — mutates u.dx/u.dy/u.dz.
 * Omits uswallow, steed holy-water rn2(6), full thitmonst/hmon/potionhit/should_mulch_missile.
 */
async function applyThrowSlipRngLikeC(g, obj) {
    const u = g.u;
    if (!u || !obj) return;
    if (!(obj.cursed | 0) && !(obj.greased | 0)) return;
    const dx0 = u.dx | 0;
    const dy0 = u.dy | 0;
    if (!dx0 && !dy0) return;
    if (rn2(7)) return;
    const uwep = u.uwep ?? null;
    let slipok = true;
    if (ammoAndLauncherLikeC(obj, uwep)) {
        await pline(`${doname(obj, g)} misfires!`);
    } else {
        if ((obj.greased | 0) || throwingWeaponHeroThrowitLikeC(obj)) {
            await pline(`${doname(obj, g)} slips as you throw it!`);
        } else {
            slipok = false;
        }
    }
    if (slipok) {
        u.dx = rn2(3) - 1;
        u.dy = rn2(3) - 1;
        if (!(u.dx | 0) && !(u.dy | 0)) u.dz = 1;
    }
}

/**
 * C: **`dothrow.c`** **`throwit`** — **`calc_capacity(obj->owt) > SLT_ENCUMBER`** stamina drop (**`You have so little stamina…`**).
 * Uses **`encumbr.js`** **`calcCapacityXtraWtLikeC`** (**`inv_weight`/`weight_cap`**).
 */
async function applyThrowStaminaDropLikeC(g, obj) {
    const u = g.u;
    if (!u || !obj) return;
    const dx = u.dx | 0;
    const dy = u.dy | 0;
    const dz = u.dz | 0;
    if (!(dx || dy || dz < 1)) return;
    if (calcCapacityXtraWtLikeC(g, obj.owt | 0) <= SLT_ENCUMBER) return;
    const up = u.Upolyd | 0;
    const weakHp = up
        ? (u.mh | 0) < 5 && (u.mh | 0) !== (u.mhmax | 0)
        : (u.uhp | 0) < 10 && (u.uhp | 0) !== (u.uhpmax | 0);
    if (!weakHp) return;
    const hp = up ? (u.mh | 0) : (u.uhp | 0);
    if ((obj.owt | 0) <= hp * 2) return;
    if (Is_airlevel(u.uz)) return;
    await pline(`You have so little stamina, ${doname(obj, g)} drops from your grasp.`);
    exercise(A_CON, false);
    u.dx = 0;
    u.dy = 0;
    u.dz = 1;
}

/**
 * C: dothrow.c throwit subset — zap.c bhit ray + landing (breakobj/flooreffects/place_object),
 * throwit_mon_hit / thitmonst weapon/gem/rock/potion subset; u.dz>0 → hitfloor(obj, TRUE), top g.invent.
 * Omits uswapwep launcher check, uslinging, uball cap, boulder/Mjollnir, tether, hits_bars, **`tmp_at`** init **`DISP_TETHER`**.
 * @param {import('./gstate.js').game} [g]
 */
export async function throwOneInventAdjacentLikeC(g = game) {
    const u = g.u;
    if (!u) return;

    await pline('In what direction?');
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
    if (!(await readDirIntoU(g))) {
        await pline('Never mind.');
        g.context.move = 0;
        return;
    }

    const obj = g.invent;
    if (!obj) {
        await pline('You have nothing to throw.');
        g.context.move = 0;
        return;
    }

    await applyThrowSlipRngLikeC(g, obj);
    await applyThrowStaminaDropLikeC(g, obj);

    const dz0 = u.dz | 0;
    if (dz0 > 0) {
        /* C: dothrow.c throwit — u.dz>0 (toss down) → hitfloor(obj, TRUE); steed holy water rn2(6) omitted */
        removeObjFromHeroInvent(g, obj);
        await hitfloorHeroLikeC(g, obj, true);
        g.context.move = 1;
        return;
    }
    if (dz0 < 0) {
        /* C: dothrow.c throwit — u.dz<0 → toss_up(obj, rn2(5) && !Underwater); Mjollnir return omitted */
        removeObjFromHeroInvent(g, obj);
        const underwater = (u.underwater | 0) !== 0;
        const hitsRoof = !!rn2(5) && !underwater;
        await tossUpHeroThrowitLikeC(g, obj, hitsRoof);
        g.context.move = 1;
        return;
    }

    const dx = u.dx | 0;
    const dy = u.dy | 0;
    if (!dx && !dy) {
        await pline('Never mind.');
        g.context.move = 0;
        return;
    }

    const tx = (u.ux | 0) + dx;
    const ty = (u.uy | 0) + dy;
    if (!isok(tx, ty) || blocksMovementAt(tx, ty, g)) {
        await pline('You cannot throw there.');
        g.context.move = 0;
        return;
    }

    const range = await thrownWeaponRangeHeroLikeC(g, obj);
    removeObjFromHeroInvent(g, obj);
    const land = await walkThrownWeaponBhitRayHeroLikeC(g, dx, dy, range, obj);

    const gb = g.gb || (g.gb = {});
    const ctx = g.context || (g.context = {});
    gb.bhitpos = { x: land.x, y: land.y };
    ctx.bhitpos = { x: land.x, y: land.y };

    if (land.shkCaught) {
        g.context.move = 1;
        return;
    }

    if (land.objConsumed) {
        g.context.move = 1;
        return;
    }

    if (land.mon) {
        const gone = await throwitMonHitThrownHeroLikeC(g, obj, land.mon);
        if (gone) {
            g.context.move = 1;
            return;
        }
    }

    await throwitPlaceAfterBhitHeroLikeC(g, obj, land.x, land.y);
    g.context.move = 1;
}
