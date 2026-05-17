// flooreffects_hero.js — do.c flooreffects() subset at (x,y) for hero deliveries.
// C ref: do.c flooreffects() — **`boulder_hits_pool`**, boulder+pit/**`dmgval`** squish (**`hmon`** deferred), **`is_lava`**/**`lava_damage`**, **`is_pool`**
// (**splash** + **`water_damage`**); **`globby`** **`obj_nexto_xy`/`obj_meld`**; **`mon_moving`**+altar+**`cansee`** **`doaltarobj`**; hot-room potions. Deferred: teeter/**`ship_object`**.

import { isLavaCellLikeC, isPoolCellLikeC } from './fillholetyp.js';
import { lavaDamageFromFlooreffectsLikeC } from './fire_damage.js';
import {
    waterDamageOne,
    ER_DESTROYED,
    nh5HeroObjectClass,
    heroLuck,
} from './water_damage.js';
import { boulderHitsPoolLikeC, buryObjsAtLikeC } from './melt_ice.js';
import {
    OTYP_BOULDER,
    IS_ALTAR,
    ROOM,
    CORR,
    WT_SPLASH_THRESHOLD,
    is_pit,
    is_hole,
    TRAPDOOR,
    HOLE,
} from './const.js';
import { NH5_POTION_CLASS } from './nh5_objclass.js';
import { cansee } from './vision.js';
import { pline, newsym } from './display.js';
import { objResists } from './obj_resists.js';
import { breaksObjDeliveryLikeC } from './obj_break_dothrow.js';
import { doname } from './objnam.js';
import { tAt, delTrap } from './search.js';
import { rnd } from './rng.js';
import { dmgval, losehp, maybeHalfPhys } from './mthrowu.js';
import { heroPassesWalls } from './walkable.js';
import {
    raceptr,
    passesWalls,
    throwsRocks,
    isWhirly,
    isUndeadPtr,
} from './mondata.js';
import { obliterateObjectInLevel } from './floorobj.js';
import { flooreffectsGlobMergeChainLikeC } from './glob_flooreffects.js';
import { doaltarobjLikeC } from './doaltarobj.js';

/** C: objects_nums — **`POT_OIL`** ( **`do.c`** hot-floor branch always survives ). */
const OTYP_POT_OIL = 320;

function objWeightLikeC(obj) {
    const w = obj?.owt | 0;
    return w > 0 ? w : 1;
}

function heroUAtLikeC(g, x, y) {
    const u = g.u;
    if (!u) return false;
    return (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0);
}

function heroBlindLikeC(g) {
    const u = g.u;
    return !!(u?.ublind | 0) || (u?.timed?.blind ?? 0) > 0;
}

function heroDeafLikeC(g) {
    return (g.u?.timed?.deaf ?? 0) > 0;
}

function levitationOrFlyingLikeC(g) {
    const u = g.u;
    return !!(u?.Levitation | 0) || !!(u?.Flying | 0);
}

/** C: **`mon.c`** **`canspotmon`** subset (**`trap.js`** **`canseemonRip`** mirror). */
function canseemonRipLikeC(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx, mtmp.my);
}

/** C: **`mon.c`** **`Monnam`** — stub (**`trap.js`**). */
function monNam(mtmp) {
    const n = mtmp?.data?.mname || mtmp?.monnam;
    if (n) return `the ${n}`;
    return 'the monster';
}

function monNamSentence(mtmp) {
    const s = monNam(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** C: **`vision.c`** **`cansee(x,y) || distu(x,y)==0`** for pit-squish pline gate. */
function canseeOrHeroHereLikeC(g, x, y) {
    return cansee(x, y) || heroUAtLikeC(g, x, y);
}

/**
 * C: **`do.c`** **`vtense(NULL, verb)`**-style third person for boulder pline (**subset**).
 * @param {string} verb
 */
function boulderVtenseIntoPitLikeC(verb) {
    const v = String(verb || '').toLowerCase();
    if (v === 'fall') return 'falls';
    if (v === 'land') return 'lands';
    if (v === 'drop') return 'drops';
    if (!v) return 'settles';
    return `${v}s`;
}

/**
 * C: **`do.c`** **`flooreffects`** — boulder on **`is_pit`/`is_hole`** trap (**`hmon`** subset when !**`mon_moving`**).
 * @returns {Promise<boolean>} true if boulder consumed
 */
async function flooreffectsBoulderPitOrHoleLikeC(g, obj, xi, yi, trap, verbStr) {
    const u = g.u;
    const ttyp = trap.ttyp | 0;
    const tseen = !!(trap.tseen ?? false);
    /* C: **`m_at`** assignment is always evaluated before **`&& mtrapped`** short-circuit */
    const mAt =
        g.level?.monsters?.find((m) => (m.mx | 0) === xi && (m.my | 0) === yi) ?? null;

    let skipVerbPlines = false;

    if (
        (mAt && (mAt.mtrapped | 0) !== 0)
        || (u && (u.utrap | 0) !== 0 && heroUAtLikeC(g, xi, yi))
    ) {
        if (verbStr && canseeOrHeroHereLikeC(g, xi, yi)) {
            const blind = heroBlindLikeC(g);
            const vz = boulderVtenseIntoPitLikeC(verbStr);
            await pline(
                `${blind ? 'A' : 'The'} boulder ${vz} into the pit${mAt ? '' : ' with you'}.`,
            );
        }
        if (mAt) {
            const ptr = raceptr(mAt);
            if (!passesWalls(ptr) && !throwsRocks(ptr)) {
                const damage = dmgval(obj, mAt);
                mAt.mhp = (mAt.mhp | 0) - damage;
                if ((mAt.mhp | 0) <= 0) {
                    if (canseemonRipLikeC(g, mAt)) {
                        const dest =
                            isUndeadPtr(ptr) || isWhirly(ptr) ? 'destroyed' : 'killed';
                        await pline(`${monNamSentence(mAt)} is ${dest}!`);
                    }
                    const mons = g.level?.monsters;
                    const ix = mons ? mons.indexOf(mAt) : -1;
                    if (ix >= 0) mons.splice(ix, 1);
                    await newsym(xi, yi);
                }
            }
            mAt.mtrapped = 0;
        } else if (u) {
            const yptr = raceptr(g.youmonst);
            if (!heroPassesWalls(g) && !throwsRocks(yptr)) {
                losehp(maybeHalfPhys(rnd(15)), 'squished under a boulder', 0);
                skipVerbPlines = true;
            } else {
                u.utrap = 0;
                u.utraptype = 0;
            }
        }
    }

    if (!skipVerbPlines && verbStr) {
        if (heroBlindLikeC(g) && heroUAtLikeC(g, xi, yi)) {
            await pline('You hear a CRASH! beneath you.');
        } else if (!heroBlindLikeC(g) && cansee(xi, yi)) {
            const trig = ttyp === TRAPDOOR && !tseen ? 'triggers and ' : '';
            const tail =
                ttyp === TRAPDOOR ? 'plugs a trap door' : ttyp === HOLE ? 'plugs a hole' : 'fills a pit';
            await pline(`The boulder ${trig}${tail}.`);
        } else if (!heroDeafLikeC(g)) {
            await pline(`You hear a boulder ${verbStr}.`);
        }
    }

    const t2 = tAt(xi, yi);
    if (t2) {
        delTrap(t2);
        if (u && (u.utrap | 0) !== 0 && heroUAtLikeC(g, xi, yi)) {
            u.utrap = 0;
            u.utraptype = 0;
        }
    }
    obliterateObjectInLevel(g, obj);
    await buryObjsAtLikeC(g, xi, yi);
    await newsym(xi, yi);
    return true;
}

/**
 * C: **`do.c`** **`flooreffects(obj, x, y, verb)`** — boulder/pool/lava/pit, pool splash, hot potions.
 * Omits: teeter/**`ship_object`**.
 * @param {import('./gstate.js').game} g
 * @param {string} [verb] — C **`"drop"`** / **`"fall"`** / **`"land"`**; empty skips some plines (**`*verb`**)
 * @returns {Promise<boolean>} **true** if **`obj`** is consumed (C **`TRUE`**)
 */
export async function flooreffectsObjAtLikeC(g, obj, x, y, verb) {
    const verbStr = verb || '';
    if (!obj) return false;

    /* C: clear chains before water/lava helpers */
    obj.nobj = null;
    obj.nexthere = null;

    const xi = x | 0;
    const yi = y | 0;

    const gb = g.gb || (g.gb = {});
    const saveBhitpos = gb.bhitpos;
    gb.bhitpos = { x: xi, y: yi };
    try {
        if ((obj.otyp | 0) === OTYP_BOULDER && (await boulderHitsPoolLikeC(g, obj, xi, yi, false))) {
            return true;
        }

        if ((obj.otyp | 0) === OTYP_BOULDER) {
            const tr = tAt(xi, yi);
            if (tr) {
                const tt = tr.ttyp | 0;
                if (is_pit(tt) || is_hole(tt)) {
                    return await flooreffectsBoulderPitOrHoleLikeC(g, obj, xi, yi, tr, verbStr);
                }
            }
        }

        if (isLavaCellLikeC(g, xi, yi)) {
            return await lavaDamageFromFlooreffectsLikeC(g, obj, xi, yi);
        }
        if (isPoolCellLikeC(g, xi, yi)) {
            const u = g.u;
            const blind = heroBlindLikeC(g);
            const levFly = levitationOrFlyingLikeC(g);
            if ((blind || levFly) && !heroDeafLikeC(g) && heroUAtLikeC(g, xi, yi)) {
                const uw = !!(u?.underwater | 0);
                if (!uw) {
                    const w = objWeightLikeC(obj);
                    if (w > WT_SPLASH_THRESHOLD) {
                        await pline('Splash!');
                    } else if (levFly) {
                        await pline('Plop!');
                    }
                }
                /* C: **`map_background`** + **`newsym`** — display subset: **`newsym`** only */
                await newsym(xi, yi);
            }
            const er = await waterDamageOne(obj, false, g, { floorPool: true });
            return er === ER_DESTROYED;
        }

        if (await flooreffectsGlobMergeChainLikeC(g, obj, xi, yi)) {
            return true;
        }

        const loc = g.level?.at(xi, yi);
        const typ = loc?.typ | 0;

        if (!!(g.svc?.context?.mon_moving) && IS_ALTAR(typ) && cansee(xi, yi)) {
            await doaltarobjLikeC(g, obj);
        }

        const temp = (g.level?.flags?.temperature ?? 0) | 0;
        if (
            temp > 0 &&
            (typ === ROOM || typ === CORR) &&
            nh5HeroObjectClass(obj) === NH5_POTION_CLASS
        ) {
            if (cansee(xi, yi)) {
                const q = obj.quan | 0;
                const subj = q > 1 ? 'they' : 'it';
                const heatVerb = q > 1 ? 'heat' : 'heats';
                const hitVerb = q > 1 ? 'hit' : 'hits';
                await pline(`${doname(obj, g)} ${heatVerb} up as ${subj} ${hitVerb} the hot ground.`);
            }
            let survivalChance = obj.blessed ? 70 : 50;
            if (obj.invlet) survivalChance += heroLuck(g) * 2;
            if ((obj.otyp | 0) === OTYP_POT_OIL) survivalChance = 100;

            if (!objResists(obj, survivalChance, 100)) {
                if (cansee(xi, yi)) {
                    const q = obj.quan | 0;
                    await pline(q > 1 ? 'They shatter from the heat!' : 'It shatters from the heat!');
                } else {
                    await pline('You hear a shattering noise.');
                }
                if (await breaksObjDeliveryLikeC(g, obj, xi, yi)) return true;
            }
        }

        return false;
    } finally {
        gb.bhitpos = saveBhitpos;
    }
}
