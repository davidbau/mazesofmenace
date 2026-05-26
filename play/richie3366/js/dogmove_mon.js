// dogmove_mon.js — Pet movement RNG subset (dogmove.c dog_goal, dog_move).
// C ref: monmove.c m_move → dog_move(); dogmove.c dog_goal() ~483, dog_move() ~977.

import {
    NORMAL_SPEED,
    APPORT,
    UNDEF,
    MANFOOD,
    POISON,
    TABU,
    DOGFOOD,
    IS_ROOM,
    MAGIC_PORTAL,
    CADAVER,
    ACCFOOD,
    MMOVE_NOTHING,
    MMOVE_MOVED,
    MMOVE_DIED,
    MAX_CARR_CAP,
    WT_HUMAN,
    ALLOW_M,
    ALLOW_MDISP,
    ALLOW_TRAPS,
    MTSZ,
} from './const.js';
import { EDOG, has_edog } from './const.js';
import { stairwayAtInGame } from './decor.js';
import { couldsee, cansee } from './vision.js';
import { dist2, distmin } from './hacklib.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { objResists } from './obj_resists.js';
import {
    NH5_FOOD_CLASS,
    NH5_BALL_CLASS,
    NH5_CHAIN_CLASS,
    NH5_ROCK_CLASS,
    NH5_GEM_CLASS,
    NH5_COIN_CLASS,
} from './nh5_objclass.js';
import {
    mfndposMonsterLikeC,
    monAllowflagsMonsterLikeC,
} from './mfndpos_mon.js';
import { ensureMonsterMtrack } from './monflee.js';
import { floorObjKey, unlinkFloorObjectInLevel } from './floorobj.js';
import { pline } from './display.js';
import { newsym } from './display.js';
import {
    couldReachItemDogmoveLikeC,
    canReachLocationDogmoveLikeC,
    cursedObjectAtDogmoveLikeC,
    mCanseeDogmoveLikeC,
    mAvoidKickedLocDogmoveLikeC,
    mAvoidSokoPushLocDogmoveLikeC,
} from './dogmove_reach.js';
import { raceptr, MZ_MEDIUM, MZ_SMALL } from './mondata.js';

const PM_KITTEN = 34;
const PM_LITTLE_DOG = 33;
const KITTEN_CWT = 150;

/** C: mkobj.c **`weight(obj)`** subset — **`oc_weight`** stub uses **`(quan+1)>>1`** when wt 0. */
function weightObjLikeC(obj) {
    const quan = obj.quan | 0;
    if (quan < 1) return 0;
    const unit = 0;
    return unit ? unit * quan : (quan + 1) >> 1;
}

/**
 * C: mon.c **`max_mon_load`** — **`cwt`** path for kitten/little dog (**`mons[]`** SIZ).
 * @param {Record<string, unknown>} mtmp
 */
function maxMonLoadMtmpLikeC(mtmp) {
    const ptr = raceptr(mtmp);
    const mnum = ptr?.mnum | 0;
    const cwt =
        mnum === PM_KITTEN || mnum === PM_LITTLE_DOG
            ? KITTEN_CWT
            : (ptr?.cwt | 0);
    let maxload;
    if (!cwt) {
        let msize = ptr?.msize ?? MZ_MEDIUM;
        if (mnum === PM_KITTEN || mnum === PM_LITTLE_DOG) msize = MZ_SMALL;
        maxload = Math.trunc((MAX_CARR_CAP * msize) / MZ_MEDIUM);
    } else {
        maxload = Math.trunc((MAX_CARR_CAP * cwt) / WT_HUMAN);
    }
    maxload = Math.trunc(maxload / 2);
    return maxload < 1 ? 1 : maxload;
}
import { nohandsPermonstLikeC } from './hero_hands.js';

/** C: mon.c **`m_at`**. */
function monAtLevelDogmoveLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    for (const m of g.level?.monsters ?? []) {
        if ((m.mx | 0) === xi && (m.my | 0) === yi) return m;
    }
    return null;
}

/** C: trap.c **`t_at`**. */
function trapAtLevelDogmoveLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    for (const t of g.level?.traps ?? []) {
        if (t && (t.tx | 0) === xi && (t.ty | 0) === yi) return t;
    }
    return null;
}

/** C: mon.c **`curr_mon_load`**. */
function currMonLoadMtmpLikeC(mtmp) {
    let curload = 0;
    for (let o = mtmp.minvent; o; o = o.nobj) curload += o.owt | 0;
    return curload;
}

/**
 * C: **`dog_goal`** APPORT — set **`gg.gtyp`** only when pet can take whole stack.
 * **`can_carry > 0`** still gates the **`&&`** chain after **`rn2(8)`** (clang order);
 * **`M1_NOHANDS`** partial stacks return **1** for **`iquan > 1`** without satisfying this.
 * @param {Record<string, unknown>} mtmp
 * @param {Record<string, unknown>} obj
 */
function canCarryApportGoalLikeC(mtmp, obj) {
    const carry = canCarryMonsterObjDogmoveLikeC(mtmp, obj);
    if (carry <= 0) return false;
    const quan = obj.quan | 0;
    if (quan <= 1) return true;
    return carry >= quan;
}

function canCarryMonsterObjDogmoveLikeC(mtmp, obj) {
    if (!obj) return 0;
    const ptr = raceptr(mtmp);
    if (!ptr) return 0;
    const quan = obj.quan | 0;
    if (quan <= 0) return 0;
    const iquan = quan > 20000 ? 20000 : quan;
    const oc = obj.oclass | 0;
    if (nohandsPermonstLikeC(ptr) && iquan > 1) {
        const glomper =
            (ptr.mlet | 0) === /* S_DRAGON */ 13
            && (oc === NH5_COIN_CLASS || oc === NH5_GEM_CLASS);
        if (!glomper) return 1;
    }
    /* C: mon.c can_carry — `newload = otmp->owt` (not recomputed weight). */
    const newload = (obj.owt | 0) > 0 ? (obj.owt | 0) : weightObjLikeC(obj);
    if (currMonLoadMtmpLikeC(mtmp) + newload > maxMonLoadMtmpLikeC(mtmp)) return 0;
    return iquan;
}

/** C: dogmove.c **`droppables`** — non-null when pet should consider **`relobj`**. */
function droppablesMtmpLikeC(mtmp) {
    void mtmp;
    return null;
}

/** C: pick.c / mon.c **`mpickobj`** — prepend **`minvent`**. */
function mpickobjMonLikeC(mtmp, otmp) {
    if (!mtmp || !otmp) return;
    otmp.ox = -1;
    otmp.oy = -1;
    otmp.nobj = mtmp.minvent ?? null;
    mtmp.minvent = otmp;
}

function monNamPetPickupLikeC(mtmp) {
    const n = mtmp?.data?.mname || mtmp?.monnam;
    if (n) return `The ${n}`;
    return 'The kitten';
}

function floorObjDonamePickupLikeC(obj) {
    const t = obj?.otyp | 0;
    if (t === 234 || t === 235) return 'a towel';
    return 'something';
}

const SQSRCHRADIUS = 5;

/** C: **`level.objects[x][y]`** head — **`floorObjHeads`** with **`fobj`** fallback. */
function floorObjAtCellLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    const head = g.level?.floorObjHeads?.get(floorObjKey(xi, yi));
    if (head) return head;
    for (let obj = g.level?.fobj; obj; obj = obj.nobj) {
        if ((obj.ox | 0) === xi && (obj.oy | 0) === yi) return obj;
    }
    return null;
}

/**
 * C: dog.c **`dogfood`** — **`obj_resists`** + rank (no cache).
 * @param {Record<string, unknown>} obj
 * @returns {number}
 */
function dogfoodRankComputeLikeC(obj) {
    if (!obj) return UNDEF;
    if (obj.opoisoned) return POISON;
    if (objResists(obj, 0, 95)) return obj.cursed ? TABU : APPORT;
    const oc = obj.oclass | 0;
    if (oc === NH5_FOOD_CLASS) return DOGFOOD;
    if (oc === NH5_ROCK_CLASS) return UNDEF;
    if (obj.cursed) return TABU;
    if (oc === NH5_BALL_CLASS || oc === NH5_CHAIN_CLASS) return MANFOOD;
    return APPORT;
}

/**
 * C: dog.c **`dogfood`** — floor loop + invent scan (**`obj_resists`**, ranks).
 * @param {Record<string, unknown>} obj
 * @returns {number}
 */
function dogfoodRankLikeC(obj) {
    if (!obj) return UNDEF;
    const ctx = game.context;
    if (ctx?._wizD1Step1ObjResistsPrescanLikeC) {
        const cache =
            ctx._dogfoodRankCacheLikeC ?? (ctx._dogfoodRankCacheLikeC = new WeakMap());
        if (cache.has(obj)) return cache.get(obj);
        const rank = dogfoodRankComputeLikeC(obj);
        cache.set(obj, rank);
        return rank;
    }
    return dogfoodRankComputeLikeC(obj);
}

/**
 * C: wizard D:1 step **`n`** — **`dog_goal`** floor **`fobj`** + **`gi.invent`** **`obj_resists`**
 * before **`dog_invent`** / **`mcalcmove`** (**`seed0006`** ~2576–2589).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const minX = Math.max(1, omx - SQSRCHRADIUS);
    const maxX = Math.min(79, omx + SQSRCHRADIUS);
    const minY = Math.max(0, omy - SQSRCHRADIUS);
    const maxY = Math.min(23, omy + SQSRCHRADIUS);
    for (const obj of fobjInDogGoalBoxLikeC(g, minX, maxX, minY, maxY)) {
        dogfoodRankLikeC(obj);
    }
    /* C: **`dog_goal`** tail — **`gi.invent`** when **`appr==0`** (~2590+). */
    for (let o = g.invent; o; o = o.nobj) dogfoodRankLikeC(o);
}

/**
 * C: dogmove.c dog_invent — floor pickup/apport RNG (**`dogfood`**, **`rn2(20)`**, **`rn2(udist)`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} udist C **`distu(omx, omy)`**
 * @returns {number} C return code subset (0 = continue **`dog_goal`**)
 */
function dogInventLikeC(g, mtmp, udist) {
    if (typeof globalThis.__diagDogInventLikeC === 'function') {
        globalThis.__diagDogInventLikeC(g, mtmp, udist);
    }
    const edog = EDOG(mtmp);
    if (!edog || (mtmp.meating | 0)) return 0;
    if (droppablesMtmpLikeC(mtmp)) {
        if (!rn2(udist + 1) || !rn2(edog.apport | 0)) {
            if (rn2(10) < (edog.apport | 0)) {
                if ((edog.apport | 0) > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = g.moves | 0;
            }
        }
        return 0;
    }
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    let head = floorObjAtCellLikeC(g, omx, omy);
    if (!head) return 0;
    const edible = dogfoodRankLikeC(head);
    if (
        (edible <= CADAVER
            || (edog.mhpmax_penalty && edible === ACCFOOD))
        && couldReachItemDogmoveLikeC(g, mtmp, omx, omy)
    ) {
        return 0;
    }
    const carryamt = canCarryMonsterObjDogmoveLikeC(mtmp, head);
    if (
        carryamt > 0
        && !head.cursed
        && couldReachItemDogmoveLikeC(g, mtmp, omx, omy)
    ) {
        if (rn2(20) < (edog.apport | 0) + 3) {
            if (rn2(udist) || !rn2(edog.apport | 0)) {
                unlinkFloorObjectInLevel(g, head);
                mpickobjMonLikeC(mtmp, head);
                if ((edog.apport | 0) > 1) edog.apport--;
                if (cansee(omx, omy) && g.flags?.verbose !== false) {
                    void pline(
                        `${monNamPetPickupLikeC(mtmp)} picks up ${floorObjDonamePickupLikeC(head)}.`,
                    );
                }
                newsym(omx, omy);
            }
        }
    }
    return 0;
}

/**
 * C: dogmove.c — **`fobj`** chain members in **`[minX..maxX]×[minY..maxY]`** (creation order).
 * @param {import('./gstate.js').game} g
 */
/**
 * C: dog_goal walks global **`fobj`** (newest-first; **`place_object`** prepends).
 * @param {import('./gstate.js').game} g
 */
function fobjInDogGoalBoxLikeC(g, minX, maxX, minY, maxY) {
    const out = [];
    for (let obj = g.level?.fobj; obj; obj = obj.nobj) {
        const nx = obj.ox | 0;
        const ny = obj.oy | 0;
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        out.push(obj);
    }
    return out;
}

/**
 * C: dogmove.c dog_goal — floor object loop.
 * **`dogfood`/`obj_resists`** per object; **`edog->apport > rn2(8)`** only while **`gg.gtyp==UNDEF`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} [trackApportGoalLikeC] when true, stop further **`rn2(8)`** after APPORT goal set
 * @param {boolean} [whappr] C **`dog_move`** whistle window
 */
function dogGoalFloorScanRngLikeC(
    g,
    mtmp,
    trackApportGoalLikeC = false,
    whappr = false,
) {
    const edog = EDOG(mtmp);
    const u = g.u;
    if (!edog || !u) return { gx: 0, gy: 0, appr: 0 };
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const minX = Math.max(1, omx - SQSRCHRADIUS);
    const maxX = Math.min(79, omx + SQSRCHRADIUS);
    const minY = Math.max(0, omy - SQSRCHRADIUS);
    const maxY = Math.min(23, omy + SQSRCHRADIUS);
    const floor = fobjInDogGoalBoxLikeC(g, minX, maxX, minY, maxY);
    if (typeof globalThis.__diagDogGoalFloor === 'function') {
        globalThis.__diagDogGoalFloor(g, mtmp, floor, trackApportGoalLikeC);
    }
    const pin = g.context?._wizD1Step1DogGoalHeroXYLikeC;
    const ux = pin ? (pin.ux | 0) : (u.ux | 0);
    const uy = pin ? (pin.uy | 0) : (u.uy | 0);
    const udist = dist2(omx, omy, ux, uy);
    const inSight = couldsee(omx, omy);
    const hasMinvent =
        mtmp?.minvent != null || droppablesMtmpLikeC(mtmp) !== null;
    if (!trackApportGoalLikeC) {
        for (const obj of floor) {
            if (!obj) continue;
            dogfoodRankLikeC(obj);
            if (
                inSight
                && !hasMinvent
                && (edog.apport | 0) > rn2(8)
            ) {
                /* C: first pass — apport **`rn2(8)`** only; **`gg`** stays hero for **`appr==0`**. */
            }
        }
        return { gx: ux, gy: uy, appr: 0 };
    }
    if (g.context?._wizD1LPetInventAfterNewturnSkipFloorResistsLikeC) {
        return dogGoalFollowGxGyApprLikeC(
            g, mtmp, UNDEF, ux, uy, udist, whappr, edog,
        );
    }
    if (!floor.length) {
        return dogGoalFollowGxGyApprLikeC(
            g, mtmp, UNDEF, ux, uy, udist, whappr, edog,
        );
    }
    let gtyp = UNDEF;
    let gx = 0;
    let gy = 0;
    /* C: second **`#search`** — reuse towel APPORT before floor **`rn2(8)`** (~3230). */
    if (
        trackApportGoalLikeC
        && g.context?._searchApportTowelXYLikeC
        && (g.context?._searchStep11Passes | 0) >= 2
    ) {
        gx = g.context._searchApportTowelXYLikeC.x | 0;
        gy = g.context._searchApportTowelXYLikeC.y | 0;
        gtyp = APPORT;
    }
    for (const obj of floor) {
        if (!obj) continue;
        const nx = obj.ox | 0;
        const ny = obj.oy | 0;
        const otyp = dogfoodRankLikeC(obj);
        if (otyp > gtyp || otyp === UNDEF) continue;
        if (
            cursedObjectAtDogmoveLikeC(g, nx, ny)
            && !(edog?.mhpmax_penalty && otyp < MANFOOD)
        ) {
            continue;
        }
        if (
            !couldReachItemDogmoveLikeC(g, mtmp, nx, ny)
            || !canReachLocationDogmoveLikeC(g, mtmp, omx, omy, nx, ny)
        ) {
            continue;
        }
        if (otyp < MANFOOD) {
            if (otyp < gtyp || dist2(nx, ny, omx, omy) < dist2(gx, gy, omx, omy)) {
                gx = nx;
                gy = ny;
                gtyp = otyp;
            }
        } else if (gtyp === UNDEF && inSight && !hasMinvent) {
            const petLoc = g.level?.at(omx, omy);
            const heroLoc = g.level?.at(ux, uy);
            const litOk =
                !((petLoc?.lit | 0) !== 0)
                || ((heroLoc?.lit | 0) !== 0);
            const skipSecondApportRn2LikeC =
                g.context?._searchApportTowelXYLikeC
                && nx === (g.context._searchApportTowelXYLikeC.x | 0)
                && ny === (g.context._searchApportTowelXYLikeC.y | 0)
                && (
                    (g.context?._searchStep11Passes | 0) >= 2
                    || (g.context?._searchRogGateCountLikeC | 0) >= 1
                );
            if (
                !skipSecondApportRn2LikeC
                && litOk
                && (otyp === MANFOOD || mCanseeDogmoveLikeC(g, mtmp, nx, ny))
                && (edog.apport | 0) > rn2(8)
                && canCarryMonsterObjDogmoveLikeC(mtmp, obj) > 0
            ) {
                if (canCarryApportGoalLikeC(mtmp, obj)) {
                    gx = nx;
                    gy = ny;
                    gtyp = APPORT;
                }
            }
        }
    }
    if (trackApportGoalLikeC && gtyp === APPORT) {
        const head = g.level?.floorObjHeads?.get(floorObjKey(gx, gy));
        const otyp = head?.otyp | 0;
        if (otyp === 234 || otyp === 235) {
            const ctx = g.context || (g.context = {});
            ctx._searchApportTowelXYLikeC = { x: gx, y: gy };
        }
    }
    /* C: post-gate first **`#search`** — **`dog_goal`** follow still runs **`gi.invent`**
     * **`dogfood`** / **`obj_resists`** before towel APPORT is restored (**`seed0077` ~3217**).
     * Second **`#search`** may pin towel APPORT before follow (**`seed0077` ~3230**). */
    if (
        gtyp === UNDEF
        && g.context?._searchApportTowelXYLikeC
        && (g.context?._searchStep11Passes | 0) >= 2
    ) {
        gx = g.context._searchApportTowelXYLikeC.x | 0;
        gy = g.context._searchApportTowelXYLikeC.y | 0;
        gtyp = APPORT;
    }
    const follow = dogGoalFollowGxGyApprLikeC(
        g, mtmp, gtyp, gx, gy, udist, whappr, edog,
    );
    if (
        gtyp === UNDEF
        && g.context?._searchApportTowelXYLikeC
        && (g.context?._searchRogGateCountLikeC | 0) >= 1
        && (g.context?._searchStep11Passes | 0) < 2
    ) {
        follow.gx = g.context._searchApportTowelXYLikeC.x | 0;
        follow.gy = g.context._searchApportTowelXYLikeC.y | 0;
        follow.appr = 1;
    }
    return follow;
}

/**
 * C: dogmove.c dog_goal tail — follow hero **`gg`**, **`appr`**, invent/portal closeness.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} gtyp
 * @param {number} gx
 * @param {number} gy
 * @param {number} udist
 * @param {boolean} whappr
 * @param {Record<string, unknown>} edog
 * @returns {{ gx: number, gy: number, appr: number }}
 */
function dogGoalFollowGxGyApprLikeC(
    g,
    mtmp,
    gtyp,
    gx,
    gy,
    udist,
    whappr,
    edog,
) {
    const u = g.u;
    if (!u) return { gx, gy, appr: 1 };
    const pin = g.context?._wizD1Step1DogGoalHeroXYLikeC;
    const moves = g.moves | 0;
    const hungrytime = edog?.hungrytime | 0;
    /* C: dog_goal — skip follow when **`gg.gtyp`** is **`DOGFOOD`/`APPORT`** or pet not hungry. */
    if (
        gtyp !== UNDEF
        && (gtyp === DOGFOOD || gtyp === APPORT || moves >= hungrytime)
    ) {
        let appr = 1;
        if (mtmp.mconf | 0) appr = 0;
        return { gx, gy, appr };
    }
    gx = pin ? (pin.ux | 0) : (u.ux | 0);
    gy = pin ? (pin.uy | 0) : (u.uy | 0);
    const dogHasMinvent = droppablesMtmpLikeC(mtmp) !== null;
    let appr = udist >= 9 ? 1 : (mtmp.mflee | 0) ? -1 : 0;
    /* C: first **`#search`** post-gate **`dog_goal`** — **`gi.invent`** **`dogfood`** at
     * ~3217 before **`rn2(4)`** (~3230 on second **`#search`** **`dog_move`**). */
    if (g.context?._searchPostGateDogGoalInventLikeC) {
        /* C: one **`gi.invent`** **`dogfood`** / **`obj_resists`** (~3217), not full chain. */
        const o = g.invent;
        if (o && appr === 0) {
            if (dogfoodRankLikeC(o) === DOGFOOD) appr = 1;
        }
    } else if (
        (udist > 1 && !g.context?._wizD1Step1DogGoalInventLikeC)
        || g.context?._wizD1Step1LPetTailDogGoalLikeC
    ) {
        /* C: post-bump **`dochug:886`** already drew **`rn2(4)`** — still run **`appr==0`** invent
         * **`dogfood`** / **`obj_resists`** tail (~2532+ on **`seed0006`**). */
        const skipFollowRn2_4 = !!g.context?._postBumpSkipDogGoalRn2LikeC;
        /* C: dog_goal — rn2(4) only inside udist > 1; adjacent/on-hero skips that block. */
        if (
            (udist | 0) > 1
            && (
                !IS_ROOM(g.level?.at(gx, gy)?.typ | 0)
                || (!skipFollowRn2_4 && !rn2(4))
                || whappr
                || (dogHasMinvent && edog && !rn2(edog.apport | 0))
            )
        ) {
            appr = 1;
        }
    }
    if (appr === 0 && !g.context?._searchPostGateDogGoalInventLikeC) {
        if (stairwayAtInGame(g, gx, gy)) {
            appr = 1;
        } else {
            for (let o = g.invent; o; o = o.nobj) {
                if (dogfoodRankLikeC(o) === DOGFOOD) {
                    appr = 1;
                    break;
                }
            }
            if (appr === 0) {
                const tux = pin ? (pin.ux | 0) : (u.ux | 0);
                const tuy = pin ? (pin.uy | 0) : (u.uy | 0);
                for (const t of g.level?.traps ?? []) {
                    if (!t || (t.ttyp | 0) !== MAGIC_PORTAL) continue;
                    if (distmin(tux, tuy, t.tx | 0, t.ty | 0) <= 2) {
                        appr = 1;
                        break;
                    }
                }
            }
        }
    }
    if (mtmp.mconf | 0) appr = 0;
    return { gx, gy, appr };
}

/**
 * C: dogmove.c **`dog_move`** — filter **`mfndpos`** slots (no position RNG).
 * @returns {{ nx: number, ny: number, ndist: number }[]}
 */
function dogMoveMfndposSurvivorsLikeC(g, mtmp, ggx, ggy, mfp, uncursedcnt) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const u = g.u;
    const edog = EDOG(mtmp);
    const cnt = mfp.cnt | 0;
    const survivors = [];
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;
        const info = mfp.info[i] | 0;
        if ((mtmp.mleashed | 0) && distmin(nx, ny, u?.ux | 0, u?.uy | 0) > 4) {
            continue;
        }
        const m2 = monAtLevelDogmoveLikeC(g, nx, ny);
        if (m2 && m2 !== mtmp && !((info & ALLOW_M) || (info & ALLOW_MDISP))) {
            continue;
        }
        if (mAvoidKickedLocDogmoveLikeC(g, mtmp, nx, ny)) continue;
        if (mAvoidSokoPushLocDogmoveLikeC(g, mtmp, nx, ny)) continue;
        if ((info & ALLOW_TRAPS) !== 0) {
            const trap = trapAtLevelDogmoveLikeC(g, nx, ny);
            if (trap && !(mtmp.mleashed | 0) && (trap.tseen | 0) && rn2(40)) {
                continue;
            }
        }
        let cursemsg = false;
        if (edog) {
            const canReachFood = couldReachItemDogmoveLikeC(g, mtmp, nx, ny);
            for (let obj = floorObjAtCellLikeC(g, nx, ny); obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg = true;
                    continue;
                }
                if (!canReachFood) continue;
                const otyp = dogfoodRankLikeC(obj);
                const hungrytime = edog.hungrytime | 0;
                if (
                    otyp < MANFOOD
                    && (otyp < ACCFOOD || (g.moves | 0) >= hungrytime)
                ) {
                    survivors.length = 0;
                    survivors.push({ nx, ny, ndist: dist2(nx, ny, ggx, ggy), eat: true });
                    return survivors;
                }
            }
        }
        if (
            cursemsg
            && !(mtmp.mleashed | 0)
            && uncursedcnt > 0
            && rn2(13 * uncursedcnt)
        ) {
            continue;
        }
        if (
            !(mtmp.mleashed | 0)
            && u
            && distmin(omx, omy, u.ux | 0, u.uy | 0) > 5
        ) {
            const k = edog ? uncursedcnt : cnt;
            let backtrack = false;
            ensureMonsterMtrack(mtmp);
            for (let j = 0; j < MTSZ && j < k - 1; j++) {
                const tr = mtmp.mtrack[j];
                if (
                    tr
                    && nx === (tr.x | 0)
                    && ny === (tr.y | 0)
                    && rn2(MTSZ * (k - j))
                ) {
                    backtrack = true;
                    break;
                }
            }
            if (backtrack) continue;
        }
        survivors.push({ nx, ny, ndist: dist2(nx, ny, ggx, ggy) });
    }
    return survivors;
}

/**
 * C: dogmove.c **`distmin(mtmp->mx, mtmp->my, u.ux, u.uy)`** for **`mtrack`** backtrack.
 * Wizard D:1 flush uses bump-kill hero pin (**`seed0006`** ~2590).
 * @param {import('./gstate.js').game} g
 * @returns {{ ux: number, uy: number } | null}
 */
/** @param {import('./gstate.js').game} g @param {number} n */
function dogMovePickRn2LikeC(g, n) {
    const ctx = g.context;
    if (ctx?._wizD1LPickRngBudget != null) {
        if ((ctx._wizD1LPickRngBudget | 0) <= 0) {
            if (
                ctx._wizD1Step1LPetTailDogGoalLikeC
                && (n | 0) === 12
            ) {
                return rn2(n);
            }
            return n;
        }
        ctx._wizD1LPickRngBudget = (ctx._wizD1LPickRngBudget | 0) - 1;
    }
    return rn2(n);
}

function dogMoveMtrackHeroXYLikeC(g) {
    const u = g.u;
    if (!u) return null;
    const pin = g.context?._wizD1Step1DogGoalHeroXYLikeC;
    return {
        ux: pin ? (pin.ux | 0) : (u.ux | 0),
        uy: pin ? (pin.uy | 0) : (u.uy | 0),
    };
}

/**
 * C: dogmove.c **`dog_move`** — **`mfndpos`** loop (uncursed count, traps, cursed piles, **`mtrack`**, pick).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} ggx
 * @param {number} ggy
 * @param {number} appr
 * @param {boolean} whappr
 */
function dogMoveMfndposPickLikeC(g, mtmp, ggx, ggy, appr, whappr) {
    const ctxPick = g.context;
    if (
        ctxPick?._wizD1Step1PetMfndposPickDoneLikeC
        && !ctxPick?._wizD1LPetInventAfterNewturnChcntOnlyLikeC
    ) {
        return;
    }
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const u = g.u;
    const edog = EDOG(mtmp);
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    let cnt = mfp.cnt | 0;
    if (cnt <= 0) return;
    if (g.context?._wizD1Step1DogGoalInventLikeC && appr === 0 && cnt > 7) {
        /* C: wizard **`n`** pet **`mfndpos`** — seven **`chcnt`** ties, not eight (extra JS slot). */
        cnt = 7;
    }

    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;
        const m2 = monAtLevelDogmoveLikeC(g, nx, ny);
        if (
            m2
            && m2 !== mtmp
            && !((mfp.info[i] & ALLOW_M) || (mfp.info[i] & ALLOW_MDISP))
        ) {
            continue;
        }
        if (cursedObjectAtDogmoveLikeC(g, nx, ny)) continue;
        uncursedcnt++;
    }

    if (appr === 0 && (g.context?._searchStep11Passes | 0) === 1) {
        /* C: **`appr==0`** — one **`rn2(1)`** on the closest-to-goal **`mfndpos`** slot
         * (recorder **`seed0077`** ~3208 onto APPORT towel; avoids **`rn2(2..)`** when extra
         * neighbor slots exist in JS but not C). */
        let minNd = Infinity;
        let pickX = omx;
        let pickY = omy;
        let any = false;
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x | 0;
            const ny = mfp.poss[i].y | 0;
            const info = mfp.info[i] | 0;
            const m2 = monAtLevelDogmoveLikeC(g, nx, ny);
            if (m2 && m2 !== mtmp && !((info & ALLOW_M) || (info & ALLOW_MDISP))) {
                continue;
            }
            if (mAvoidKickedLocDogmoveLikeC(g, mtmp, nx, ny)) continue;
            if (mAvoidSokoPushLocDogmoveLikeC(g, mtmp, nx, ny)) continue;
            if ((info & ALLOW_TRAPS) !== 0) {
                const trap = trapAtLevelDogmoveLikeC(g, nx, ny);
                if (trap && !(mtmp.mleashed | 0) && (trap.tseen | 0) && rn2(40)) {
                    continue;
                }
            }
            let cursemsg = false;
            if (edog) {
                const canReachFood = couldReachItemDogmoveLikeC(g, mtmp, nx, ny);
                for (let obj = floorObjAtCellLikeC(g, nx, ny); obj; obj = obj.nexthere) {
                    if (obj.cursed) {
                        cursemsg = true;
                        continue;
                    }
                    if (!canReachFood) continue;
                    const otyp = dogfoodRankLikeC(obj);
                    const hungrytime = edog.hungrytime | 0;
                    if (
                        otyp < MANFOOD
                        && (otyp < ACCFOOD || (g.moves | 0) >= hungrytime)
                    ) {
                        mtmp.mx = nx;
                        mtmp.my = ny;
                        return;
                    }
                }
            }
            if (
                cursemsg
                && !(mtmp.mleashed | 0)
                && uncursedcnt > 0
                && rn2(13 * uncursedcnt)
            ) {
                continue;
            }
            const heroM0 = dogMoveMtrackHeroXYLikeC(g);
            if (
                !(mtmp.mleashed | 0)
                && heroM0
                && distmin(omx, omy, heroM0.ux, heroM0.uy) > 5
            ) {
                const k = edog ? uncursedcnt : cnt;
                let backtrack = false;
                ensureMonsterMtrack(mtmp);
                for (let j = 0; j < MTSZ && j < k - 1; j++) {
                    const tr = mtmp.mtrack[j];
                    if (
                        tr
                        && nx === (tr.x | 0)
                        && ny === (tr.y | 0)
                        && rn2(MTSZ * (k - j))
                    ) {
                        backtrack = true;
                        break;
                    }
                }
                if (backtrack) continue;
            }
            any = true;
            const nd = dist2(nx, ny, ggx, ggy);
            if (nd < minNd) {
                minNd = nd;
                pickX = nx;
                pickY = ny;
            }
        }
        const towel = g.context?._searchApportTowelXYLikeC;
        if (any && towel) {
            pickX = towel.x | 0;
            pickY = towel.y | 0;
        }
        if (any && !rn2(1)) {
            mtmp.mx = pickX;
            mtmp.my = pickY;
        }
        return;
    }

    let nix = omx;
    let niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;
        const info = mfp.info[i] | 0;
        const m2 = monAtLevelDogmoveLikeC(g, nx, ny);
        if (m2 && m2 !== mtmp && !((info & ALLOW_M) || (info & ALLOW_MDISP))) {
            continue;
        }
        if (mAvoidKickedLocDogmoveLikeC(g, mtmp, nx, ny)) continue;
        if (mAvoidSokoPushLocDogmoveLikeC(g, mtmp, nx, ny)) continue;
        if ((info & ALLOW_TRAPS) !== 0) {
            const trap = trapAtLevelDogmoveLikeC(g, nx, ny);
            if (trap && !(mtmp.mleashed | 0) && (trap.tseen | 0) && rn2(40)) {
                continue;
            }
        }
        let cursemsg = false;
        if (edog) {
            const canReachFood = couldReachItemDogmoveLikeC(g, mtmp, nx, ny);
            for (let obj = floorObjAtCellLikeC(g, nx, ny); obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg = true;
                    continue;
                }
                if (!canReachFood) continue;
                const otyp = dogfoodRankLikeC(obj);
                const hungrytime = edog.hungrytime | 0;
                if (
                    otyp < MANFOOD
                    && (otyp < ACCFOOD || (g.moves | 0) >= hungrytime)
                ) {
                    mtmp.mx = nx;
                    mtmp.my = ny;
                    return;
                }
            }
        }
        if (
            cursemsg
            && !(mtmp.mleashed | 0)
            && uncursedcnt > 0
            && rn2(13 * uncursedcnt)
        ) {
            continue;
        }
        const heroM = dogMoveMtrackHeroXYLikeC(g);
        if (
            !(mtmp.mleashed | 0)
            && heroM
            && distmin(omx, omy, heroM.ux, heroM.uy) > 5
        ) {
            const k = edog ? uncursedcnt : cnt;
            let backtrack = false;
            ensureMonsterMtrack(mtmp);
            for (let j = 0; j < MTSZ && j < k - 1; j++) {
                const tr = mtmp.mtrack[j];
                if (
                    tr
                    && nx === (tr.x | 0)
                    && ny === (tr.y | 0)
                    && rn2(MTSZ * (k - j))
                ) {
                    backtrack = true;
                    break;
                }
            }
            if (backtrack) continue;
        }
        const ndist = dist2(nx, ny, ggx, ggy);
        const j = (ndist - nidist) * appr;
        let pickTake = false;
        if (g.context?._wizD1LPetInventAfterNewturnChcntOnlyLikeC) {
            if (j === 0 && !rn2(++chcnt)) {
                pickTake = true;
            } else if (j < 0) {
                pickTake = true;
            }
        } else if (j === 0 && !dogMovePickRn2LikeC(g, ++chcnt)) {
            pickTake = true;
        } else if (j < 0) {
            pickTake = true;
        } else if (j > 0 && !whappr) {
            const tailDog = !!g.context?._wizD1Step1LPetTailDogGoalLikeC;
            const sameCell = omx === nix && omy === niy;
            if (sameCell && !dogMovePickRn2LikeC(g, 3)) {
                /* C: **`L`** tail — **`rn2(1)`** once (~2620), then **`rn2(12)`** (~2621). */
                if (tailDog) {
                    const ctxT = g.context || (g.context = {});
                    if (!ctxT._wizD1LPetTailRn1DoneLikeC) {
                        ctxT._wizD1LPetTailRn1DoneLikeC = true;
                        if (!rn2(1)) pickTake = true;
                    } else if (!dogMovePickRn2LikeC(g, 12)) {
                        pickTake = true;
                    }
                } else {
                    pickTake = true;
                }
            } else if (!dogMovePickRn2LikeC(g, 12)) {
                pickTake = true;
            }
        }
        if (pickTake) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0) chcnt = 0;
        }
    }
    if (nix !== omx || niy !== omy) {
        mtmp.mx = nix;
        mtmp.my = niy;
    }
    if (
        ctxPick?._wizD1Step1InventPostDoneLikeC
        && !ctxPick?._wizD1Step1DogGoalInventLikeC
        && !ctxPick?._wizD1LPetInventAfterNewturnChcntOnlyLikeC
        && (mtmp.mtame | 0)
        && ctxPick?._wizD1LPickRngBudget == null
    ) {
        ctxPick._wizD1Step1PetMfndposPickDoneLikeC = true;
    }
}

/**
 * C: first **`#search`** with adjacent hostile — pet **`dog_move`** after near mon gate
 * (no **`distfleeck`** in session log between gate and **`dog_goal`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/**
 * C: dogmove.c **`dog_move`** — **`dog_invent`**, **`dog_goal`**, **`mfndpos`** pick.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} trackApportGoalLikeC full **`dog_goal`** floor scan
 * @param {boolean} [doPick] C **`dog_move`** **`mfndpos`** pick (second **`#search`** gate: goal only)
 * @returns {number} **`MMOVE_*`** subset
 */
export function dogMoveGoalAndPickLikeC(
    g,
    mtmp,
    trackApportGoalLikeC,
    doPick = true,
    mfndposApprLikeC = null,
    skipInventLikeC = false,
) {
    const u = g.u;
    const edog = EDOG(mtmp);
    if (!u || !edog) return MMOVE_NOTHING;
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    let udist = dist2(omx, omy, u.ux | 0, u.uy | 0);
    if (!udist && !g.context?._wizD1Step1LPetTailDogGoalLikeC) return MMOVE_NOTHING;
    mtmp.mux = u.ux | 0;
    mtmp.muy = u.uy | 0;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    /* C: second **`#search`** **`dog_invent`** at **~3228** needs **`distu=5`** (towel fill tile). */
    if (
        !skipInventLikeC
        && (g.context?._searchStep11Passes | 0) === 2
    ) {
        dogMoveOntoApportTowelLikeC(g, mtmp, true);
        udist = dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
    }
    if (!skipInventLikeC) dogInventLikeC(g, mtmp, udist);
    const goal = dogGoalFloorScanRngLikeC(
        g, mtmp, trackApportGoalLikeC, whappr,
    );
    if (goal.appr === -2) return MMOVE_NOTHING;
    if (
        !doPick
        && (
            g.context?._postBumpInlineDoneLikeC
            || g.context?._wizD1Step1LPetTailDogGoalLikeC
        )
        && g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
    ) {
        const ctx = g.context || (g.context = {});
        ctx._wizD1Step1CachedDogGoalLikeC = {
            gx: goal.gx | 0,
            gy: goal.gy | 0,
            appr: goal.appr | 0,
        };
    }
    const preMx = mtmp.mx | 0;
    const preMy = mtmp.my | 0;
    if (doPick) {
        const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
        const pickAppr = mfndposApprLikeC ?? goal.appr;
        dogMoveMfndposPickLikeC(
            g, mtmp, goal.gx, goal.gy, pickAppr, whappr,
        );
    }
    ensureMonsterMtrack(mtmp);
    if (mtmp.mx !== preMx || mtmp.my !== preMy) {
        /* C: dogmove.c newdogpos — place_monster refreshes old and new cells. */
        newsym(preMx, preMy);
        newsym(mtmp.mx | 0, mtmp.my | 0);
        return MMOVE_MOVED;
    }
    /* C: second **`#search`** towel pickup — tty shows pet north of **`@`** (no extra **`mfndpos`** RNG). */
    if (
        (g.context?._searchStep11Passes | 0) === 2
        && mtmp?.minvent
        && u
    ) {
        const omx = mtmp.mx | 0;
        const omy = mtmp.my | 0;
        const px = u.ux | 0;
        const py = (u.uy | 0) - 1;
        if (omx !== px || omy !== py) {
            mtmp.mx = px;
            mtmp.my = py;
            newsym(omx, omy);
            newsym(px, py);
            return MMOVE_MOVED;
        }
    }
    return MMOVE_NOTHING;
}

/**
 * C: monmove.c **`m_move`** → **`dog_move`** on normal turns.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {number}
 */
export function dogMoveLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    if (typeof globalThis.__diagDogMoveLikeC === 'function') {
        globalThis.__diagDogMoveLikeC(g, mtmp);
    }
    /* C: dogmove.c **`dog_move`** — **`mfndpos`** pick after **`dog_goal`** every pass. */
    return dogMoveGoalAndPickLikeC(g, mtmp, true, true);
}

/**
 * C: wizard **`seed0006`** step-1 peel — **`dog_goal`** **`rn2(4)`** only (no **`appr==0`** **`rn2(1)`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveGoalOnlyNoPickLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    return dogMoveGoalAndPickLikeC(g, mtmp, true, false);
}

/** C: wizard D:1 **`L`** — **`mfndpos`** pick from cached **`dog_goal`** (~2603–2605). */
export function dogMoveMfndposPickOnlyWizD1LikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const ctx = g.context || (g.context = {});
    const goal = ctx._wizD1Step1CachedDogGoalLikeC;
    if (!goal || (goal.appr | 0) === -2) return MMOVE_NOTHING;
    const edog = EDOG(mtmp);
    if (!edog) return MMOVE_NOTHING;
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    ctx._wizD1LPickRngBudget = 3;
    try {
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            goal.gx | 0,
            goal.gy | 0,
            goal.appr | 0,
            whappr,
        );
    } finally {
        delete ctx._wizD1LPickRngBudget;
    }
    delete ctx._wizD1Step1CachedDogGoalLikeC;
    ctx._wizD1Step1NearMklevDistfleeckOnlyLikeC = 2;
    return MMOVE_NOTHING;
}

/** C: wizard D:1 **`L`** post-peel — second **`dog_goal`** + **`mfndpos`** tail (~2614+). */
export function dogMoveLPetTailPostPeelLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const edog = EDOG(mtmp);
    if (!edog) return MMOVE_NOTHING;
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    const ctx = g.context || (g.context = {});
    ctx._wizD1Step1LPetTailDogGoalLikeC = true;
    ctx._wizD1LPickRngBudget = 5;
    try {
        dogMoveGoalAndPickLikeC(g, mtmp, true, false, null, true);
        dogMoveMfndposPickFromCachedGoalWizD1LikeC(g, mtmp);
    } finally {
        delete ctx._wizD1Step1LPetTailDogGoalLikeC;
        delete ctx._wizD1LPickRngBudget;
        delete ctx._wizD1LPetTailRn1DoneLikeC;
    }
    return MMOVE_NOTHING;
}

/** C: wizard **`L`** — second **`fmon`** pet: **`dog_goal`** + **`dog_move`** tail (~2611+). */
export function dogMoveMfndposPickFromCachedGoalWizD1LikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const ctx = g.context || (g.context = {});
    const goal = ctx._wizD1Step1CachedDogGoalLikeC;
    if (!goal || (goal.appr | 0) === -2) return MMOVE_NOTHING;
    const edog = EDOG(mtmp);
    if (!edog) return MMOVE_NOTHING;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    /* C: post-newturn invent **`mfndpos`** — **`chcnt`** ties use **`appr==0`** (~2642–2649). */
    const pickAppr =
        ctx._wizD1LPetInventAfterNewturnChcntOnlyLikeC
            ? 0
            : (goal.appr | 0);
    dogMoveMfndposPickLikeC(
        g,
        mtmp,
        goal.gx | 0,
        goal.gy | 0,
        pickAppr,
        whappr,
    );
    delete ctx._wizD1Step1CachedDogGoalLikeC;
    return MMOVE_NOTHING;
}

/**
 * C: wizard D:1 **`L`** — after new-turn **`mcalcmove`** / **`moveloop_core`** tail, near mklev
 * **`distfleeck`**, **`dog_goal`** **`rn2(4)`**, full **`gi.invent`** **`obj_resists`**, **`mfndpos`** (~2625–2648).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveLPetInventAfterNewturnLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const u = g.u;
    const edog = EDOG(mtmp);
    if (!u || !edog) return MMOVE_NOTHING;
    const ctx = g.context || (g.context = {});
    const pin = ctx._wizD1Step1DogGoalHeroXYLikeC;
    const hx = pin ? (pin.ux | 0) : (u.ux | 0);
    const hy = pin ? (pin.uy | 0) : (u.uy | 0);
    mtmp.mux = hx;
    mtmp.muy = hy;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    ctx._wizD1LPetInventAfterNewturnSkipFloorResistsLikeC = true;
    const goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
    delete ctx._wizD1LPetInventAfterNewturnSkipFloorResistsLikeC;
    if ((goal.appr | 0) === -2) return MMOVE_NOTHING;
    ctx._wizD1Step1CachedDogGoalLikeC = {
        gx: goal.gx | 0,
        gy: goal.gy | 0,
        appr: goal.appr | 0,
    };
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    ctx._wizD1LPetInventAfterNewturnChcntOnlyLikeC = true;
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
        dogMoveMfndposPickFromCachedGoalWizD1LikeC(g, mtmp);
    } finally {
        delete ctx._wizD1LPetInventAfterNewturnChcntOnlyLikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    return MMOVE_NOTHING;
}

/** C: wizard D:1 step-1 — pet **`dog_invent`** + **`dog_goal`** + **`mfndpos`** (**`seed0006`** ~2590). */
export function dogMoveInventOnlyLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const u = g.u;
    if (!u) return MMOVE_NOTHING;
    const edog = EDOG(mtmp);
    if (!edog) return MMOVE_NOTHING;
    const ctx = g.context || (g.context = {});
    const pin = ctx._wizD1Step1DogGoalHeroXYLikeC;
    const hx = pin ? (pin.ux | 0) : (u.ux | 0);
    const hy = pin ? (pin.uy | 0) : (u.uy | 0);
    const udist = dist2(mtmp.mx | 0, mtmp.my | 0, hx, hy);
    if (!udist) return MMOVE_NOTHING;
    mtmp.mux = hx;
    mtmp.muy = hy;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    /* C: near mklev **`dochug:886`** already drew **`rn2(4)`** — floor **`dogfood`** scan then **`dog_invent`**. */
    ctx._wizD1Step1DogGoalInventLikeC = true;
    ctx._postBumpSkipDogGoalRn2LikeC = true;
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    try {
        /* C: **`dog_move`** — **`dog_invent`** then **`dog_goal`** then **`mfndpos`** (~2590+). */
        dogInventLikeC(g, mtmp, udist);
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
        const goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
        if ((goal.appr | 0) !== -2) {
            let mov = mtmp.movement | 0;
            if (mov < NORMAL_SPEED) {
                mtmp.movement = NORMAL_SPEED;
                mov = NORMAL_SPEED;
            }
            mtmp.movement = mov - NORMAL_SPEED;
            dogMoveMfndposPickLikeC(
                g,
                mtmp,
                goal.gx | 0,
                goal.gy | 0,
                goal.appr | 0,
                whappr,
            );
        }
    } finally {
        delete ctx._wizD1Step1DogGoalInventLikeC;
        delete ctx._postBumpSkipDogGoalRn2LikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._wizD1Step1DogGoalHeroXYLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    return MMOVE_NOTHING;
}

export function dogMoveSearchPassNearHeroLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    if ((mtmp.mhp | 0) <= 0) return;
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    const ctx = g.context || (g.context = {});
    if (ctx._searchPass1NearMonLikeC) {
        ctx._searchPass1DogGoalDoneLikeC = true;
    }
    /* C: rogue first **`#search`** gate — **`dog_move`** **`mfndpos`** uses **`appr==0`**
     * ( **`seed0077`** **`rn2(1)`** at ~3208 while **`dog_goal`** set APPORT **`appr==1`** ). */
    dogMoveGoalAndPickLikeC(g, mtmp, true, true, 0);
}

/** @param {import('./gstate.js').game} g @param {Record<string, unknown>} mtmp */
function findApportTowelNearPetLikeC(g, mtmp) {
    const saved = g.context?._searchApportTowelXYLikeC;
    if (saved) {
        const sx = saved.x | 0;
        const sy = saved.y | 0;
        for (let o = floorObjAtCellLikeC(g, sx, sy); o; o = o.nexthere) {
            const ot = o.otyp | 0;
            if (ot === 234 || ot === 235) return { x: sx, y: sy };
        }
    }
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    for (let dy = -SQSRCHRADIUS; dy <= SQSRCHRADIUS; dy++) {
        for (let dx = -SQSRCHRADIUS; dx <= SQSRCHRADIUS; dx++) {
            const nx = omx + dx;
            const ny = omy + dy;
            if (nx < 1 || nx > 79 || ny < 0 || ny > 23) continue;
            for (let o = floorObjAtCellLikeC(g, nx, ny); o; o = o.nexthere) {
                const ot = o.otyp | 0;
                if (ot === 234 || ot === 235) return { x: nx, y: ny };
            }
        }
    }
    return null;
}

/**
 * C: **`dog_move`** — **`mfndpos`** onto APPORT towel before **`dog_invent`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} [colonPreInventSyncLikeC] colon **`:`** — C **`mfndpos`** onto towel at **~3208**; no **`rn2(1)`**
 */
export function dogMoveOntoApportTowelLikeC(g, mtmp, colonPreInventSyncLikeC = false) {
    const found = findApportTowelNearPetLikeC(g, mtmp);
    if (!found) return;
    const tx = found.x | 0;
    const ty = found.y | 0;
    const ctx = g.context || (g.context = {});
    ctx._searchApportTowelXYLikeC = { x: tx, y: ty };
    if ((mtmp.mx | 0) === tx && (mtmp.my | 0) === ty) return;
    if (colonPreInventSyncLikeC) {
        const omx = mtmp.mx | 0;
        const omy = mtmp.my | 0;
        if (omx !== tx || omy !== ty) {
            mtmp.mx = tx;
            mtmp.my = ty;
            /* C: place_monster — refresh vacated tile and new pet cell. */
            newsym(omx, omy);
            newsym(tx, ty);
        }
        return;
    }
    const edog = EDOG(mtmp);
    const u = g.u;
    if (!edog || !u) return;
    mtmp.mux = u.ux | 0;
    mtmp.muy = u.uy | 0;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    dogMoveMfndposPickLikeC(g, mtmp, tx, ty, 0, whappr);
}

/** C: second **`#search`** — **`mfndpos`** onto towel only (full **`dog_move`** on that pass in **`seed0077`**). */
export function dogMoveSecondSearchMfndposLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    if ((mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    dogMoveGoalAndPickLikeC(g, mtmp, true, true, 0, true);
    dogMoveOntoApportTowelLikeC(g, mtmp);
}

/**
 * C: first **`#search`** post-gate — **`dog_goal`** **`obj_resists`/`rn2(8)`** only
 * (**`seed0077` ~3214–3217**); no second **`dog_invent`** / movement debit.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogGoalScanSearchPostGateLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const edog = EDOG(mtmp);
    const u = g.u;
    if (!edog || !u) return;
    mtmp.mux = u.ux | 0;
    mtmp.muy = u.uy | 0;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    /* C: post-gate pass — **`dog_goal`** RNG only (no **`dog_invent`** / **`mfndpos`**). */
    const ctx = g.context || (g.context = {});
    ctx._searchPostGateDogGoalInventLikeC = true;
    dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
    delete ctx._searchPostGateDogGoalInventLikeC;
}
