// throwit_mon_hit_hero.js — dothrow.c throwit_mon_hit / thitmonst() subset (hero thrown).
// C ref: dothrow.c throwit_mon_hit(), thitmonst()

import { pline } from './display.js';
import { doname } from './objnam.js';
import { rnd, rn2 } from './rng.js';
import { distmin } from './hacklib.js';
import { isok, STRAT_WAITMASK, A_DEX } from './const.js';
import { heroLuck, nh5HeroObjectClass } from './water_damage.js';
import {
    NH5_WEAPON_CLASS,
    NH5_GEM_CLASS,
    NH5_ROCK_CLASS,
    NH5_POTION_CLASS,
} from './nh5_objclass.js';
import { dmgval } from './mthrowu.js';
import { raceptr, monsterLeavesCorpse } from './mondata.js';
import { placeCorpseForMonster } from './mkobj_corpse.js';
import { adisturb } from './shop.js';
import { throwingWeaponHeroThrowitLikeC } from './bhit_throw_hero.js';
import { isAmmo, ammoAndLauncherLikeC } from './weapon_kind.js';
import { useSkill } from './u_init_skills.js';
import { weaponType } from './weapon_kind.js';
import { cansee } from './vision.js';

function findMacMonLikeC(mtmp) {
    return (mtmp.mac ?? raceptr(mtmp)?.ac ?? 10) | 0;
}

function monNameLikeC(mtmp) {
    return mtmp?.monnam || mtmp?.data?.mname || 'monster';
}

function thrownWeaponTmpAdjLikeC(g, obj) {
    const uwep = g.u?.uwep ?? null;
    if (isAmmo(obj)) {
        return ammoAndLauncherLikeC(obj, uwep) ? 0 : -4;
    }
    if (throwingWeaponHeroThrowitLikeC(obj)) return 2;
    return -2;
}

async function tmissThrownHeroLikeC(g, obj, mtmp) {
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const missile = doname(obj, g);
    const cap = missile.charAt(0).toUpperCase() + missile.slice(1);
    if (!cansee(mx, my)) await pline(`${cap} misses.`);
    else await pline(`${cap} misses ${monNameLikeC(mtmp)}.`);
}

function wakeupMonThrownLikeC(mtmp) {
    if (!mtmp) return;
    if (!rn2(3)) {
        mtmp.msleeping = 0;
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
    }
}

/**
 * C: dothrow.c throwit_mon_hit → thitmonst (subset: WEAPON/GEM/ROCK rnd(20) to-hit + dmgval;
 * POTION consumes rnd(25) then tmiss; potionhit omitted; other classes tmiss only).
 * Omits hmon, passive_obj, should_mulch_missile, gems vs unicorn, special_obj_hits_leader.
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} true if object gone (C non-zero thitmonst)
 */
export async function throwitMonHitThrownHeroLikeC(g, obj, mon) {
    if (!mon || !obj) return false;
    const u = g.u;
    if (!u) return false;
    const ocl = nh5HeroObjectClass(obj);

    if (ocl === NH5_WEAPON_CLASS || ocl === NH5_GEM_CLASS || ocl === NH5_ROCK_CLASS) {
        let tmp = -1 + heroLuck(g) + findMacMonLikeC(mon) + (u.ulevel | 0);
        const ad = (u?.acurr?.a?.[A_DEX] ?? 10) | 0;
        if (ad < 4) tmp -= 3;
        else if (ad < 6) tmp -= 2;
        else if (ad < 8) tmp -= 1;
        else if (ad >= 14) tmp += ad - 14;

        const dm = distmin(u.ux | 0, u.uy | 0, mon.mx | 0, mon.my | 0);
        let disttmp = 3 - dm;
        if (disttmp < -4) disttmp = -4;
        tmp += disttmp;
        tmp += thrownWeaponTmpAdjLikeC(g, obj);

        const dieroll = rnd(20);
        if (tmp >= dieroll) {
            const dam = dmgval(obj, mon);
            mon.mhp = (mon.mhp | 0) - dam;
            await adisturb(mon);
            await pline(`You hit ${monNameLikeC(mon)}.`);
            useSkill(u, weaponType(obj), 1);
            if ((mon.mhp | 0) <= 0) {
                const x = mon.mx | 0;
                const y = mon.my | 0;
                if (g.level && isok(x, y) && monsterLeavesCorpse(mon, g, 0)) placeCorpseForMonster(mon, x, y);
                const arr = g.level?.monsters;
                if (arr) {
                    const i = arr.indexOf(mon);
                    if (i >= 0) arr.splice(i, 1);
                }
                await pline('You kill it!');
            }
            return false;
        }
        await tmissThrownHeroLikeC(g, obj, mon);
        wakeupMonThrownLikeC(mon);
        return false;
    }

    if (ocl === NH5_POTION_CLASS) {
        void rnd(25); /* C: ACURR(A_DEX) > rnd(25) gate before potionhit — potionhit not ported */
        await tmissThrownHeroLikeC(g, obj, mon);
        wakeupMonThrownLikeC(mon);
        return false;
    }

    await tmissThrownHeroLikeC(g, obj, mon);
    wakeupMonThrownLikeC(mon);
    return false;
}
