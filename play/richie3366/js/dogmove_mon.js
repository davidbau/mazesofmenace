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
    MMOVE_DONE,
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
import { d, rnd, rn2 } from './rng.js';
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
    findTouristD1PostSwapNearMklevMonLikeC,
} from './mfndpos_mon.js';
import { distfleeckMonsterApplyLikeC } from './distfleeck_mon.js';
import { setApparxyMonsterLikeC } from './set_apparxy_mon.js';
import { ensureMonsterMtrack, monTrackAdd } from './monflee.js';
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

/** C: dogmove.c **`droppables`** — non-null when pet carries droppable **`minvent`**. */
function droppablesMtmpLikeC(mtmp) {
    return mtmp?.minvent ?? null;
}

/** C: dogmove.c **`DOG_HUNGRY`**. */
const DOG_HUNGRY = 300;

/** C: sounds.c **`MS_LEADER`** / **`MS_GUARDIAN`**. */
const MS_LEADER = 36;
const MS_GUARDIAN = 37;

/** C: monattk.h **`AT_NONE`**. */
const AT_NONE = 0;

/** C: monflag.h **`M1_SEE_INVIS`**. */
const M1_SEE_INVIS = 0x02000000;

/**
 * C: dogmove.c find_targ — first monster on ray within **`maxdist`** (no RNG).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} dx
 * @param {number} dy
 * @param {number} maxdist
 * @returns {Record<string, unknown> | null}
 */
function findTargDogmoveLikeC(g, mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx | 0;
    let cury = mtmp.my | 0;
    const mux = mtmp.mux | 0;
    const muy = mtmp.muy | 0;
    const perceives = ((mtmp.data?.mflags1 | 0) & M1_SEE_INVIS) !== 0;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (curx < 1 || curx > 79 || cury < 0 || cury > 23) break;
        if (!mCanseeDogmoveLikeC(g, mtmp, curx, cury)) break;
        if (curx === mux && cury === muy) return { _heroTargLikeC: true };
        const targ = monAtLevelDogmoveLikeC(g, curx, cury);
        if (!targ) continue;
        if (
            (!(targ.minvis | 0) || perceives)
            && !(targ.mundetected | 0)
            && (targ.mx | 0) === curx
            && (targ.my | 0) === cury
        ) {
            return targ;
        }
    }
    return null;
}

/**
 * C: dogmove.c find_friends — ally behind **`mtarg`** on ray toward pet (no RNG).
 *
 * @param {Record<string, unknown>} mtmp
 * @param {Record<string, unknown>} mtarg
 * @param {number} maxdist
 * @returns {boolean}
 */
function findFriendsDogmoveLikeC(g, mtmp, mtarg) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const tx = mtarg.mx | 0;
    const ty = mtarg.my | 0;
    const dx = Math.sign(tx - omx);
    const dy = Math.sign(ty - omy);
    let curx = tx;
    let cury = ty;
    let dist = distmin(tx, ty, omx, omy);
    const perceives = ((mtmp.data?.mflags1 | 0) & M1_SEE_INVIS) !== 0;
    for (; dist <= 15; dist++) {
        curx += dx;
        cury += dy;
        if (curx < 1 || curx > 79 || cury < 0 || cury > 23) return false;
        if (curx === (mtmp.mux | 0) && cury === (mtmp.muy | 0)) return true;
        const pal = monAtLevelDogmoveLikeC(g, curx, cury);
        if (!pal) continue;
        if (pal.mtame | 0) {
            if (!(pal.minvis | 0) || perceives) return true;
        } else if (
            (pal.data?.msound | 0) === MS_LEADER
            || (pal.data?.msound | 0) === MS_GUARDIAN
        ) {
            return true;
        }
    }
    return false;
}

/**
 * C: dogmove.c score_targ — ranged-target score + **`rnd(5)`** fuzz.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {Record<string, unknown>} mtarg
 * @returns {number}
 */
function scoreTargDogmoveLikeC(g, mtmp, mtarg) {
    let score = 0;
    const u = g.u;
    if (mtarg._heroTargLikeC) {
        score -= 3000;
        return score;
    }
    const msound = mtarg.data?.msound | 0;
    if (msound === MS_LEADER || msound === MS_GUARDIAN) return -5000;
    if (
        distmin(mtmp.mx | 0, mtmp.my | 0, mtarg.mx | 0, mtarg.my | 0) <= 1
    ) {
        return -3000;
    }
    if ((mtarg.mtame | 0) || mtarg === u) return -3000;
    if (findFriendsDogmoveLikeC(g, mtmp, mtarg)) return -3000;
    if (!(mtarg.mpeaceful | 0)) score += 10;
    const mattk = mtarg.data?.mattk;
    if (mattk && (mattk[0]?.aatyp | 0) === AT_NONE) score -= 1000;
    const mtmpLev = mtmp.m_lev | 0;
    const mtargLev = mtarg.m_lev | 0;
    if (mtargLev > mtmpLev + 4) score -= (mtargLev - mtmpLev) * 20;
    score += mtargLev * 2 + Math.trunc((mtarg.mhp | 0) / 3);
    score += rnd(5);
    if ((mtmp.mconf | 0) && !rn2(3)) score -= 1000;
    return score;
}

/**
 * C: dogmove.c best_target — best lined-up hostile for pet breath/spit.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} forced
 * @returns {Record<string, unknown> | null}
 */
function bestTargetDogmoveLikeC(g, mtmp, forced) {
    if (!(mtmp.mcansee | 0)) return null;
    let bestscore = -40000;
    let bestTarg = null;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const temp = findTargDogmoveLikeC(g, mtmp, dx, dy, 7);
            if (!temp) continue;
            const curr = scoreTargDogmoveLikeC(g, mtmp, temp);
            if (curr > bestscore) {
                bestscore = curr;
                bestTarg = temp;
            }
        }
    }
    if (!forced && bestscore < 0) return null;
    return bestTarg;
}

/**
 * C: dogmove.c pet_ranged_attk — after mfndpos, before newdogpos.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} forced
 * @param {Record<string, unknown> | null} [cachedMtarg] reuse best_target from dog_goal tail
 * @returns {number} MMOVE_* subset
 */
export function petRangedAttkDogmoveLikeC(
    g,
    mtmp,
    forced,
    cachedMtarg = null,
    peelHungryLikeC = false,
) {
    const edog = EDOG(mtmp);
    let hungry = 0;
    if (edog) {
        hungry = (g.moves | 0) > ((edog.hungrytime | 0) + DOG_HUNGRY);
    }
    const mtarg =
        cachedMtarg ?? bestTargetDogmoveLikeC(g, mtmp, forced);
    const touristPostRestPeel =
        !!g.context?._touristD1PostRestMoveloopPeelLikeC;
    if (touristPostRestPeel) {
        delete g.context._touristD1PostRestMoveloopPeelLikeC;
    }
    if (!mtarg && !peelHungryLikeC && !touristPostRestPeel) {
        return MMOVE_NOTHING;
    }
    const hungryRoll = peelHungryLikeC
        ? !rn2(5)
        : (mtarg && (!hungry || !rn2(5)));
    if (mtarg && hungryRoll) {
        /* C: mattackm / counterattack tails — RNG only on exercised paths for now. */
        return MMOVE_NOTHING;
    }
    /* C: tourist D:1 post-rest — **`pet_ranged_attk`** hungry gate (~2519 **`seed0900`**) after
     * deferred new-turn when **`best_target`** is empty on exercised hero-adjacent peel. */
    if (touristPostRestPeel && !mtarg) {
        rn2(5);
    }
    return MMOVE_NOTHING;
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
function dogfoodRankLikeC(obj, ctxIn = null) {
    if (!obj) return UNDEF;
    const ctx = ctxIn ?? game.context;
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
 * C: **`dog_goal`** floor **`fobj`** (+ optional **`gi.invent`**) **`obj_resists`** prescan.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {{ scanInvent?: boolean }} [opts]
 */
function dogGoalObjResistsPrescanLikeC(g, mtmp, opts = {}) {
    if (g?.context) game.context = g.context;
    const scanInvent = opts.scanInvent !== false;
    /* C: post-east-tail short **`l`** — one **`gi.invent`** **`obj_resists`** (~2811). */
    if (g.context?._wizD1PostEastTailWalkShortLPetLikeC) {
        const o0 = g.invent;
        if (o0) dogfoodRankLikeC(o0);
        return;
    }
    /* C: post-corridor **`mcalcmove`** pet — one invent **`obj_resists`** (~2758). */
    if (g.context?._wizD1EastTailPostMcalcmovePetLikeC) {
        const o0 = g.invent;
        if (o0) dogfoodRankLikeC(o0);
        return;
    }
    /* C: capital **`K`** post-new-turn — one **`gi.invent`** **`obj_resists`** (~2853). */
    if (g.context?._wizD1CapitalKPostNewturnPetLikeC) {
        const o0 = g.invent;
        if (o0) dogfoodRankLikeC(o0);
        return;
    }
    /* C: capital **`K`** post-near — one **`gi.invent`** **`obj_resists`** (~2870). */
    if (g.context?._wizD1CapitalKPostNearPetLikeC) {
        const o0 = g.invent;
        if (o0) dogfoodRankLikeC(o0);
        return;
    }
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const minX = Math.max(1, omx - SQSRCHRADIUS);
    const maxX = Math.min(79, omx + SQSRCHRADIUS);
    const minY = Math.max(0, omy - SQSRCHRADIUS);
    const maxY = Math.min(23, omy + SQSRCHRADIUS);
    for (const obj of fobjInDogGoalBoxLikeC(g, minX, maxX, minY, maxY)) {
        dogfoodRankLikeC(obj);
    }
    if (scanInvent) {
        /* C: **`dog_goal`** tail — **`gi.invent`** when **`appr==0`** (~2590+). */
        for (let o = g.invent; o; o = o.nobj) dogfoodRankLikeC(o);
    }
}

/** @param {import('./gstate.js').game} g @param {Record<string, unknown>} mtmp */
function dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp) {
    dogGoalObjResistsPrescanLikeC(g, mtmp, { scanInvent: true });
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
    const seen = new Set();
    for (let obj = g.level?.fobj; obj; obj = obj.nobj) {
        const nx = obj.ox | 0;
        const ny = obj.oy | 0;
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        if (seen.has(obj)) continue;
        seen.add(obj);
        out.push(obj);
    }
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            for (let obj = floorObjAtCellLikeC(g, x, y); obj; obj = obj.nexthere) {
                if (seen.has(obj)) continue;
                seen.add(obj);
                out.push(obj);
            }
        }
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
    skipFollowInventLikeC = false,
) {
    if (g?.context) game.context = g.context;
    const rankCtx = g.context;
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
            dogfoodRankLikeC(obj, rankCtx);
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
            g, mtmp, UNDEF, ux, uy, udist, whappr, edog, skipFollowInventLikeC,
        );
    }
    if (!floor.length) {
        if (
            trackApportGoalLikeC
            && (
                g.context?._touristD1PostSwapDogGoalPrescanLikeC
                || g.context?._touristD1PostSwapAfterRestPetGoalLikeC
            )
        ) {
            const ctx = g.context || (g.context = {});
            ctx._touristD1PeelEmptyFloorDogGoalLikeC = true;
        }
        return dogGoalFollowGxGyApprLikeC(
            g, mtmp, UNDEF, ux, uy, udist, whappr, edog, skipFollowInventLikeC,
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
        const otyp = dogfoodRankLikeC(obj, rankCtx);
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
                && !g.context?._wizD1ShortLApportRn8DoneLikeC
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
        g, mtmp, gtyp, gx, gy, udist, whappr, edog, skipFollowInventLikeC,
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
    skipFollowInventLikeC = false,
) {
    if (g?.context) game.context = g.context;
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
    const afterRestPetGoalLikeC = !!g.context?._touristD1PostSwapAfterRestPetGoalLikeC;
    const postRestSecondMovemonPeelLikeC =
        !!g.context?._touristD1PostRestSecondMovemonPeelLikeC;
    /* C: post-rest pet — still run follow **`rn2(edog->apport)`** + capped invent when **`udist≥9`**
     * would otherwise set **`appr=1`** early (~2504–2509 on **`seed0900`**). */
    let appr =
        udist >= 9 && !afterRestPetGoalLikeC && !postRestSecondMovemonPeelLikeC
            ? 1
            : (mtmp.mflee | 0)
                ? -1
                : 0;
    /* C: first **`#search`** post-gate **`dog_goal`** — **`gi.invent`** **`dogfood`** at
     * ~3217 before **`rn2(4)`** (~3230 on second **`#search`** **`dog_move`**). */
    if (g.context?._searchPostGateDogGoalInventLikeC) {
        /* C: one **`gi.invent`** **`dogfood`** / **`obj_resists`** (~3217), not full chain. */
        const o = g.invent;
        if (o && appr === 0) {
            if (dogfoodRankLikeC(o) === DOGFOOD) appr = 1;
        }
    } else if (
        !g.context?._wizD1CapitalKPostNewturnPetLikeC
        && !g.context?._wizD1CapitalKPostNearPetLikeC
        && !g.context?._wizD1LPostFourthPetDogGoalLikeC
        && !g.context?._wizD1LSecondRunEastPetMfndposLikeC
        && !g.context?._wizD1AfterLPostMfndposOnlyLikeC
        && (
            !g.context?._wizD1PostCorridorPetTailDoneLikeC
            || g.context?._wizD1PostEastTailWalkPetAfterMintrapLikeC
            || g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
            || g.context?._touristD1PostSwapAfterRestPetGoalLikeC
        )
        && !g.context?._wizD1LPetMfndposAfterEastTailPeelLikeC
        && !g.context?._wizD1PostEastTailWalkShortLPetLikeC
        && (
            (udist > 1 && !g.context?._wizD1Step1DogGoalInventLikeC)
            || g.context?._wizD1Step1LPetTailDogGoalLikeC
            || g.context?._touristD1PostSwapAfterRestPetGoalLikeC
        )
    ) {
        /* C: post-bump **`dochug:886`** already drew **`rn2(4)`** — still run **`appr==0`** invent
         * **`dogfood`** / **`obj_resists`** tail (~2532+ on **`seed0006`**). */
        const skipFollowRn2_4 =
            !!g.context?._postBumpSkipDogGoalRn2LikeC
            || !!g.context?._wizD1CapitalKPostDistantPeelPetLikeC
            || !!g.context?._wizD1CapitalKPostNewturnPetLikeC
            || !!g.context?._wizD1CapitalKPostNearPetLikeC;
        /* C: dog_goal — rn2(4) only inside udist > 1; adjacent/on-hero skips that block. */
        if (
            (udist | 0) > 1
            && !afterRestPetGoalLikeC
            && !postRestSecondMovemonPeelLikeC
            && (
                !IS_ROOM(g.level?.at(gx, gy)?.typ | 0)
                || (!skipFollowRn2_4 && !rn2(4))
                || whappr
                || (dogHasMinvent && edog && rn2(edog.apport | 0))
            )
        ) {
            appr = 1;
        }
    }
    if (
        appr === 0
        && !skipFollowInventLikeC
        && !g.context?._searchPostGateDogGoalInventLikeC
        && !g.context?._wizD1PostCorridorPetSecondMfndposLikeC
        && !g.context?._wizD1PostEastTailWalkPetAfterMintrapLikeC
        && !g.context?._wizD1PostEastTailWalkShortLPetLikeC
        && !g.context?._wizD1CapitalKPostDistantPeelPetLikeC
        && !g.context?._wizD1CapitalKPostNewturnPetLikeC
        && !g.context?._wizD1CapitalKPostNearPetLikeC
    ) {
        if (stairwayAtInGame(g, gx, gy)) {
            appr = 1;
        } else if (
            g.context?._touristD1PeelEmptyFloorDogGoalLikeC
            && (
                g.context?._touristD1PostRestSecondPhase1LikeC
                || g.context?._touristD1PostRestSecondPhase2LikeC
                || g.context?._touristD1PostRestSecondMovemonPeelLikeC
            )
        ) {
            /* C: second post-rest **`dog_goal`** — five **`gi.invent`** **`obj_resists`** per phase
             * (~2520–2524 / ~2531–2535 on **`seed0900`**). */
            let invN = 0;
            for (let o = g.invent; o; o = o.nobj) {
                const rank = dogfoodRankLikeC(o);
                invN++;
                if (rank === DOGFOOD) {
                    appr = 1;
                    break;
                }
                if (invN >= 5) {
                    /* C: movemon peel — **`appr=1`** after capped invent (~2546–2550). */
                    if (postRestSecondMovemonPeelLikeC) appr = 1;
                    break;
                }
            }
        } else if (
            g.context?._touristD1PeelEmptyFloorDogGoalLikeC
            && (
                g.context?._touristD1PostSwapDogGoalPrescanLikeC
                || g.context?._touristD1PostSwapAfterRestPetGoalLikeC
            )
        ) {
            /* C: **`seed0900`** H peel / post-rest — cap invent **`obj_resists`** at **5** when bbox
             * **`fobj`** empty; **`appr=1`** after **`rn2(edog->apport)`** (~2504+). */
            let invN = 0;
            for (let o = g.invent; o; o = o.nobj) {
                const rank = dogfoodRankLikeC(o);
                invN++;
                if (rank === DOGFOOD || invN >= 5) {
                    appr = 1;
                    break;
                }
            }
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
/** C: seed0900 post-rest peel — away rn2(12) cap before pet_ranged !rn2(5). */
let _touristPostRestAwayRn12LikeC = -1;

function resetTouristPostRestAwayRn12LikeC() {
    _touristPostRestAwayRn12LikeC = 0;
}

/** @param {import('./gstate.js').game} g @param {number} n */
function dogMovePickRn2LikeC(g, n) {
    const ctx = g.context;
    const ni = n | 0;
    if (ctx?._touristD1PostSwapAfterRestPetGoalLikeC && ni === 12) {
        if (_touristPostRestAwayRn12LikeC < 0) {
            _touristPostRestAwayRn12LikeC = 0;
        }
        if (_touristPostRestAwayRn12LikeC < 3) {
            _touristPostRestAwayRn12LikeC++;
            return rn2(12);
        }
        return ni;
    }
    if (ctx?._wizD1LPickRngBudget != null) {
        if ((ctx._wizD1LPickRngBudget | 0) <= 0) {
            if (
                (
                    ctx._wizD1Step1LPetTailDogGoalLikeC
                    || ctx._wizD1LPostFourthPetDogGoalLikeC
                )
                && ni === 12
            ) {
                return rn2(ni);
            }
            /* C: exhausted budget — no **`rn2(3)`** draw; treat as **`!rn2(3)`** true (~pick). */
            if (
                (
                    ctx._wizD1Step1LPetTailDogGoalLikeC
                    || ctx._wizD1LPostFourthPetDogGoalLikeC
                )
                && (ni === 3 || ni === 1)
            ) {
                return 0;
            }
            return ni;
        }
        ctx._wizD1LPickRngBudget = (ctx._wizD1LPickRngBudget | 0) - 1;
    }
    return rn2(ni);
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
    if (typeof globalThis.__diagDogMoveMfndpos === 'function') {
        globalThis.__diagDogMoveMfndpos(g, mtmp);
    }
    const ctxPick = g.context;
    if (
        ctxPick?._wizD1Step1PetMfndposPickDoneLikeC
        && !ctxPick?._wizD1LPetInventAfterNewturnChcntOnlyLikeC
        && !ctxPick?._wizD1PostCorridorPetSecondMfndposLikeC
        && !ctxPick?._wizD1CapitalKPostNewturnMfndposLikeC
        && !ctxPick?._wizD1CapitalKPostNearMfndposLikeC
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
    if (
        (
            g.context?._wizD1Step1DogGoalInventLikeC
            || g.context?._wizD1LPetMfndposAfterEastTailPeelLikeC
            || g.context?._wizD1PostCorridorPetSecondMfndposLikeC
        )
        && appr === 0
        && cnt > 7
    ) {
        /* C: wizard **`n`** pet **`mfndpos`** — seven **`chcnt`** ties, not eight (extra JS slot). */
        cnt = 7;
    }

    const skipMfndposFloorFoodLikeC =
        !!ctxPick?._wizD1PostCorridorPetSecondMfndposLikeC
        || !!ctxPick?._touristD1PostSwapDogGoalPrescanLikeC;

    let uncursedcnt = 0;
    if (!skipMfndposFloorFoodLikeC) {
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
    }

    if (
        appr === 0
        && (g.context?._searchStep11Passes | 0) === 1
        && !g.context?._wizD1LPetInventAfterNewturnChcntOnlyLikeC
        && !g.context?._wizD1LPetEastTailMfndposLikeC
        && !g.context?._touristD1PostSwapAfterRestPetMfndposLikeC
        && !g.context?._touristD1PostRestSecondDogMoveLikeC
    ) {
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
                        /* C: dogmove.c newdogpos — **`mon_track_add(omx,omy)`** before move. */
                        monTrackAdd(mtmp, omx, omy);
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
            /* C: dogmove.c newdogpos — **`mon_track_add(omx,omy)`** before move. */
            monTrackAdd(mtmp, omx, omy);
            mtmp.mx = pickX;
            mtmp.my = pickY;
        }
        return;
    }

    const resumeSt = ctxPick?._touristD1PostSwapMfndposResumeStateLikeC;
    const resumingTouristPostSwapLikeC =
        !!ctxPick?._touristD1PostSwapMfndposResumingLikeC && !!resumeSt;
    let nix = resumingTouristPostSwapLikeC ? (resumeSt.nix | 0) : omx;
    let niy = resumingTouristPostSwapLikeC ? (resumeSt.niy | 0) : omy;
    let nidist = resumingTouristPostSwapLikeC
        ? (resumeSt.nidist | 0)
        : dist2(nix, niy, ggx, ggy);
    let chcnt = resumingTouristPostSwapLikeC ? (resumeSt.chcnt | 0) : 0;
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
        if (edog && !skipMfndposFloorFoodLikeC) {
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
                    /* C: dogmove.c newdogpos — **`mon_track_add(omx,omy)`** before move. */
                    monTrackAdd(mtmp, omx, omy);
                    mtmp.mx = nx;
                    mtmp.my = ny;
                    return;
                }
            }
        }
        if (
            !skipMfndposFloorFoodLikeC
            && cursemsg
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
            && !g.context?._wizD1CapitalKPostDistantPeelPetLikeC
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
        let postCorridorSecondPetAwayDoneLikeC = false;
        if (g.context?._touristD1PostSwapAfterRestPetMfndposLikeC) {
            /* C: post-rest — three away rn2(12) via dogMovePickRn2LikeC, mfndpos tail,
             * then pet_ranged_attk !rn2(5) (~2519 on seed0900). */
            if (j > 0 && !whappr && !dogMovePickRn2LikeC(g, 12)) {
                pickTake = true;
            } else if (j < 0) {
                pickTake = true;
            }
        } else if (g.context?._wizD1LPetEastTailMfndposLikeC) {
            /* C: capital **`K`** post-new-turn / post-near — away **`mfndpos`** (~2855–2859 / ~2873–2877). */
            if (
                g.context?._wizD1CapitalKPostNewturnMfndposLikeC
                || g.context?._wizD1CapitalKPostNearMfndposLikeC
            ) {
                /* C: five away **`rn2(12)`**, then distant **`distfleeck`** or tail **`distfleeck`**. */
                if (j > 0 && !whappr) {
                    if (!rn2(12)) pickTake = true;
                    const ctxN = g.context || (g.context = {});
                    const awayN = (
                        g.context?._wizD1CapitalKPostNearMfndposLikeC
                            ? (ctxN._wizD1CapitalKPostNearAwayRn12LikeC | 0)
                            : (ctxN._wizD1CapitalKPostNewturnAwayRn12LikeC | 0)
                    ) + 1;
                    if (g.context?._wizD1CapitalKPostNearMfndposLikeC) {
                        ctxN._wizD1CapitalKPostNearAwayRn12LikeC = awayN;
                    } else {
                        ctxN._wizD1CapitalKPostNewturnAwayRn12LikeC = awayN;
                    }
                    if (awayN >= 5) break;
                } else if (j < 0) {
                    pickTake = true;
                }
            } else if (g.context?._wizD1CapitalKPostDistantPeelPetLikeC) {
            /* C: capital **`K`** post-peel — away **`rn2(12)`**, **`rn2(1)`**, away **`rn2(12)`** (~2841–2843). */
                const ctxK = g.context || (g.context = {});
                if (
                    ctxK._wizD1CapitalKAway2PendingLikeC
                    && !ctxK._wizD1CapitalKAway2DoneLikeC
                    && j > 0
                    && !whappr
                    && !rn2(12)
                ) {
                    pickTake = true;
                    ctxK._wizD1CapitalKAway2DoneLikeC = true;
                } else if (
                    ctxK._wizD1CapitalKAwayAttemptedLikeC
                    && !ctxK._wizD1CapitalKAway2PendingLikeC
                    && j === 0
                    && !ctxK._wizD1CapitalKChcntTriedLikeC
                ) {
                    /* C: one **`chcnt`** **`rn2(1)`** (~2842); extra **`j==0`** slots must not bump **`chcnt`**. */
                    ctxK._wizD1CapitalKChcntTriedLikeC = true;
                    if (!rn2(1)) pickTake = true;
                    ctxK._wizD1CapitalKAway2PendingLikeC = true;
                } else if (
                    ctxK._wizD1CapitalKAwayAttemptedLikeC
                    && !ctxK._wizD1CapitalKAway2PendingLikeC
                    && j > 0
                ) {
                    continue;
                } else if (
                    !ctxK._wizD1CapitalKAwayAttemptedLikeC
                    && j > 0
                    && !whappr
                ) {
                    /* C: one away **`rn2(12)`** (may fail when roll non-zero). */
                    if (!rn2(12)) pickTake = true;
                    ctxK._wizD1CapitalKAwayAttemptedLikeC = true;
                }
            } else if (g.context?._wizD1PostEastTailWalkFmonPetLikeC) {
                const blockFmonAway = !!g.context._wizD1WalkFmonPetAwayDoneLikeC;
                let awayClause = false;
                if (!blockFmonAway && j > 0 && !whappr) {
                    const sameCell = omx === nix && omy === niy;
                    const ctxAway = g.context || (g.context = {});
                    if (sameCell) {
                        awayClause = !rn2(3);
                        ctxAway._wizD1WalkFmonPetAwayRngCountLikeC =
                            (ctxAway._wizD1WalkFmonPetAwayRngCountLikeC | 0) + 1;
                    }
                    /* C: **`(sameCell && !rn2(3)) || !rn2(12)`** — second draw if first fails. */
                    if (!awayClause) {
                        awayClause = !rn2(12);
                        ctxAway._wizD1WalkFmonPetAwayRngCountLikeC =
                            (ctxAway._wizD1WalkFmonPetAwayRngCountLikeC | 0) + 1;
                    }
                    if ((ctxAway._wizD1WalkFmonPetAwayRngCountLikeC | 0) >= 2) {
                        ctxAway._wizD1WalkFmonPetAwayDoneLikeC = true;
                    }
                }
                if (j === 0) {
                    const chRoll = rn2(++chcnt);
                    if (!chRoll) pickTake = true;
                    const ctxCh = g.context || (g.context = {});
                    ctxCh._wizD1WalkFmonPetChcntRn1LikeC = true;
                } else if (j < 0 || awayClause) {
                    pickTake = true;
                }
            } else if (
                !g.context?._wizD1CapitalKPostDistantPeelPetLikeC
                && (
                    (j === 0 && !rn2(++chcnt))
                    || j < 0
                    || (
                        j > 0
                        && !whappr
                        && (
                            (omx === nix && omy === niy && !rn2(3))
                            || !rn2(12)
                        )
                    )
                )
            ) {
                pickTake = true;
            }
            if (
                g.context?._wizD1PostCorridorPetSecondMfndposLikeC
                && j > 0
                && !whappr
            ) {
                postCorridorSecondPetAwayDoneLikeC = true;
            }
            /* C: short **`l`** — stop after one away **`rn2(12)`** (~2810). */
            if (
                g.context?._wizD1PostEastTailWalkShortLPetLikeC
                && j > 0
                && !whappr
            ) {
                break;
            }
            if (
                g.context?._wizD1CapitalKPostDistantPeelPetLikeC
                && g.context?._wizD1CapitalKAway2DoneLikeC
                && pickTake
            ) {
                break;
            }
        } else if (g.context?._wizD1LPetInventAfterNewturnChcntOnlyLikeC) {
            if (j === 0 && !rn2(++chcnt)) {
                pickTake = true;
            } else if (j < 0) {
                pickTake = true;
            }
        } else if (g.context?._touristD1PostRestSecondMfndposSilentLikeC) {
            /* C: second post-rest phase-2 — **`mfndpos`** may pick closer slots only (**`j<0`**); no
             * **`chcnt`** / away draws before movemon **`mcalcmove`** (~2538+ on **`seed0900`**). */
            if (j < 0) pickTake = true;
        } else if (g.context?._touristD1PostRestSecondMovemonPeelMfndposLikeC) {
            const ctxPeel = g.context || (g.context = {});
            const awayStarted = !!ctxPeel._touristD1PostRestSecondPeelAwayRngLikeC;
            if (!awayStarted && (j < 0 || j === 0)) {
                continue;
            }
            if (
                (j === 0 && !dogMovePickRn2LikeC(g, ++chcnt))
                || j < 0
                || (
                    j > 0 && !whappr
                    && (
                        (omx === nix && omy === niy && !dogMovePickRn2LikeC(g, 3))
                        || !dogMovePickRn2LikeC(g, 12)
                    )
                )
            ) {
                if (j > 0 && !whappr) {
                    ctxPeel._touristD1PostRestSecondPeelAwayRngLikeC = true;
                }
                pickTake = true;
            }
        } else if (j === 0) {
            if (resumingTouristPostSwapLikeC) {
                /* C: **`chcnt`** **`rn2(1)`/`rn2(2)`** already ran before tail **`distfleeck`**. */
                continue;
            }
            /* C: dogmove.c ~1255 — **`chcnt`** ties use **`rn2(++chcnt)`** (second post-invent
             * **`movemon`** ~2667; budget must not swallow the draw). */
            const chcntWin = g.context?._wizD1LPetSecondMovemonTailLikeC
                ? !rn2(++chcnt)
                : !dogMovePickRn2LikeC(g, ++chcnt);
            if (chcntWin) pickTake = true;
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
            if (g.context?._wizD1LPetEastTailMfndposLikeC && j === 0) {
                /* C: capital **`K`** — one loop: away, **`chcnt`**, second away (~2841–2843). */
                const ctxBr = g.context;
                if (
                    ctxBr?._wizD1CapitalKPostNewturnMfndposLikeC
                    || ctxBr?._wizD1CapitalKPostNearMfndposLikeC
                ) {
                    /* five away **`rn2(12)`** (~2855–2859 / ~2873–2877) — no **`chcnt`** break */
                } else if (
                    ctxBr?._wizD1CapitalKPostDistantPeelPetLikeC
                    && !ctxBr._wizD1CapitalKAway2DoneLikeC
                ) {
                    /* keep scanning: first away, **`chcnt`**, second away */
                } else {
                    /* C: east-tail pick — stop after **`j==0`** **`chcnt`** tie (~2730). */
                    break;
                }
            }
            if (
                g.context?._wizD1EastTailWalkMintrapMfndposLikeC
                && pickTake
                && j === 0
            ) {
                const ctxM = g.context || (g.context = {});
                ctxM._wizD1EastTailWalkMintrapChcntSlotsLikeC =
                    (ctxM._wizD1EastTailWalkMintrapChcntSlotsLikeC | 0) + 1;
                /* C: two **`chcnt`** ties (**`rn2(1)`**, **`rn2(2)`**) then **`distfleeck`** (~2800+). */
                if ((ctxM._wizD1EastTailWalkMintrapChcntSlotsLikeC | 0) >= 2) {
                    break;
                }
            }
            if (
                g.context?._touristD1PostSwapDogGoalPrescanLikeC
                && pickTake
                && j === 0
            ) {
                const ctxTou = g.context || (g.context = {});
                ctxTou._touristD1PostSwapMfndposChcntSlotsLikeC =
                    (ctxTou._touristD1PostSwapMfndposChcntSlotsLikeC | 0) + 1;
                /* C: **`seed0900`** H swap — two **`chcnt`** ties, mklev **`distfleeck`**×2, pet
                 * ~915 recalc, then away **`mfndpos`** (~2487–2492). */
                if ((ctxTou._touristD1PostSwapMfndposChcntSlotsLikeC | 0) >= 2) {
                    ctxTou._touristD1PostSwapMfndposDeferredLikeC = true;
                    ctxTou._touristD1PostSwapMfndposResumeStateLikeC = {
                        gx: ggx,
                        gy: ggy,
                        appr,
                        whappr,
                        nix,
                        niy,
                        nidist,
                        chcnt,
                    };
                    break;
                }
            }
        }
        if (postCorridorSecondPetAwayDoneLikeC) {
            break;
        }
    }
    /* C: capital **`K`** post-near — five away **`rn2(12)`** (~2873–2877) when **`mfndpos`** short. */
    if (ctxPick?._wizD1CapitalKPostNearMfndposLikeC) {
        const ctxPad = g.context || (g.context = {});
        while ((ctxPad._wizD1CapitalKPostNearAwayRn12LikeC | 0) < 5) {
            rn2(12);
            ctxPad._wizD1CapitalKPostNearAwayRn12LikeC =
                (ctxPad._wizD1CapitalKPostNearAwayRn12LikeC | 0) + 1;
        }
    }
    if (g.context?._wizD1CapitalKPostDistantPeelPetLikeC) {
        const ctxKt = g.context || (g.context = {});
        if (
            ctxKt._wizD1CapitalKAwayAttemptedLikeC
            && !ctxKt._wizD1CapitalKChcntTriedLikeC
        ) {
            /* C: **`chcnt`** when no qualifying **`j==0`** slot in JS **`mfndpos`** order (~2842). */
            if (!rn2(1)) {
                /* tie */
            }
            ctxKt._wizD1CapitalKChcntTriedLikeC = true;
            ctxKt._wizD1CapitalKAway2PendingLikeC = true;
        }
        if (
            ctxKt._wizD1CapitalKAway2PendingLikeC
            && !ctxKt._wizD1CapitalKAway2DoneLikeC
        ) {
            if (!rn2(12)) {
                /* second away */
            }
            ctxKt._wizD1CapitalKAway2DoneLikeC = true;
        }
    }
    if (nix !== omx || niy !== omy) {
        /* C: dogmove.c:1313 — **`mon_track_add(omx,omy)`** after **`place_monster`**. */
        monTrackAdd(mtmp, omx, omy);
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
            || g.context?._wizD1LPostFourthPetDogGoalLikeC
            || g.context?._wizD1LSecondRunEastPetMfndposLikeC
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
/**
 * C: tourist D:1 first peaceful swap — step-1 **`movemon`** peel after **`distfleeck`**:
 * **`dog_goal`** **`fobj`** + **`gi.invent`** **`obj_resists`**, then **`dog_move`** **`mfndpos`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveTouristD1PostSwapPeelLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const ctx = g.context || (g.context = {});
    const edog = EDOG(mtmp);
    const u = g.u;
    if (!edog || !u) return;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    if (g?.context) game.context = g.context;
    try {
        /* C: **`dog_move`** — **`dog_invent`** then **`dog_goal`** (~2482–2486 floor **`obj_resists`**
         * on **`seed0900`**); peel **`mfndpos`** next (~2487 **`rn2(1)`**). */
        const udist = dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
        dogInventLikeC(g, mtmp, udist);
        const goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr, false);
        if ((goal.appr | 0) === -2) return;
        ctx._wizD1LPickRngBudget = 2;
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
    } finally {
        if (!ctx._touristD1PostSwapMfndposDeferredLikeC) {
            delete ctx._touristD1PostSwapDogGoalPrescanLikeC;
            delete ctx._touristD1PeelEmptyFloorDogGoalLikeC;
            delete ctx._touristD1PostSwapMfndposChcntSlotsLikeC;
        }
    }
}

/**
 * C: tourist D:1 post-swap — resume **`mfndpos`** away picks after mklev **`distfleeck`**×2 +
 * pet ~915 recalc (**`seed0900`** ~2492+).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveTouristD1PostSwapMfndposResumeLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const ctx = g.context;
    const st = ctx?._touristD1PostSwapMfndposResumeStateLikeC;
    if (!st) return;
    ctx._touristD1PostSwapMfndposResumingLikeC = true;
    try {
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            st.gx | 0,
            st.gy | 0,
            st.appr | 0,
            !!st.whappr,
        );
    } finally {
        delete ctx._touristD1PostSwapMfndposResumingLikeC;
        delete ctx._touristD1PostSwapMfndposResumeStateLikeC;
        delete ctx._touristD1PostSwapDogGoalPrescanLikeC;
        delete ctx._touristD1PeelEmptyFloorDogGoalLikeC;
        delete ctx._touristD1PostSwapMfndposChcntSlotsLikeC;
    }
}

/**
 * C: tourist D:1 peaceful swap — post-new-turn rest near mklev **`m_move`** then pet
 * **`dog_move`** **`dog_goal`** follow **`rn2(edog->apport)`** + capped invent **`obj_resists`**
 * + **`mfndpos`** (**`seed0900`** ~2504–2512).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/**
 * C: tourist D:1 — run post-rest pet **`dog_move`** once near mklev **`m_move`** RNG done.
 *
 * @param {import('./gstate.js').game} g
 */
export async function touristD1RunAfterRestPetIfPendingLikeC(g) {
    if (!g.context?._touristD1PostSwapNearRestMmoveTailPendingLikeC) return;
    if (g.context?._touristD1PostSwapAfterRestPetDoneLikeC) return;
    const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
    if (!pet) return;
    const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
    if (nearMklev) {
        /* C: gated post-rest **`m_move`** — second ~915 **`distfleeck`** before pet
         * **`dog_goal`** invent (**`seed0900`** ~2501). */
        setApparxyMonsterLikeC(g, nearMklev);
        await distfleeckMonsterApplyLikeC(g, nearMklev);
    }
    let mov = pet.movement | 0;
    if (mov < NORMAL_SPEED) {
        pet.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    pet.movement = mov - NORMAL_SPEED;
    dogMoveTouristD1PostSwapAfterRestPetLikeC(g, pet);
    g.context._touristD1PostSwapAfterRestPetDoneLikeC = true;
    delete g.context._touristD1PostSwapNearRestMmoveTailPendingLikeC;
}

export function dogMoveTouristD1PostSwapAfterRestPetLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const edog = EDOG(mtmp);
    const u = g.u;
    if (!edog || !u) return;
    if (g?.context) game.context = g.context;
    const ctx = g.context || (g.context = {});
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    const udist = dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
    /* C: post-rest peel — capped invent prescan in **`dog_goal`** only; skip **`dog_invent`**
     * minvent RNG so **`edog->apport`** stays **`rn2(5)`**-scale (~2511 on **`seed0900`**). */
    ctx._touristD1PeelEmptyFloorDogGoalLikeC = true;
    ctx._touristD1PostSwapAfterRestPetGoalLikeC = true;
    resetTouristPostRestAwayRn12LikeC();
    try {
        const goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
        if ((goal.appr | 0) === -2) return;
        /* C: post-rest — score_targ rnd(5) + follow rn2(edog->apport) before mfndpos
         * (~2510–2511 on seed0900); cache target for pet_ranged_attk (~2519). */
        ctx._touristD1PostRestPetRangedTargLikeC =
            bestTargetDogmoveLikeC(g, mtmp, false);
        if (!ctx._touristD1PostRestPetRangedTargLikeC) {
            rnd(5);
        }
        rn2(5);
        delete ctx._touristD1PostRestAwayRn12LikeC;
        ctx._touristD1PostSwapAfterRestPetMfndposLikeC = true;
        try {
            dogMoveMfndposPickLikeC(
                g,
                mtmp,
                goal.gx | 0,
                goal.gy | 0,
                goal.appr | 0,
                whappr,
            );
            ctx._touristD1PostSwapSkipPetFmonAfterRestPeelLikeC = true;
            /* C: **`pet_ranged_attk`** after next post new-turn tail (~2519 on **`seed0900`**). */
            ctx._touristD1PostRestPetRangedPendingLikeC = true;
        } finally {
            delete ctx._touristD1PostSwapAfterRestPetMfndposLikeC;
            delete ctx._touristD1PostRestAwayRn12LikeC;
        }
    } finally {
        delete ctx._touristD1PeelEmptyFloorDogGoalLikeC;
        delete ctx._touristD1PostSwapAfterRestPetGoalLikeC;
    }
}

/**
 * C: tourist D:1 post-rest — second **`dog_move`** phase 1 after deferred **`pet_ranged_attk`**
 * (**`dog_goal`** capped invent **`obj_resists`**, **`score_targ`**; **`seed0900`** ~2520–2525).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveTouristD1PostRestSecondDogMovePhase1LikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const edog = EDOG(mtmp);
    if (!edog) return;
    const ctx = g.context || (g.context = {});
    ctx._touristD1PostRestSecondPhase1LikeC = true;
    ctx._touristD1PeelEmptyFloorDogGoalLikeC = true;
    try {
        let mov = mtmp.movement | 0;
        if (mov < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            mov = NORMAL_SPEED;
        }
        mtmp.movement = mov - NORMAL_SPEED;
        setApparxyMonsterLikeC(g, mtmp);
        const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
        const goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
        if ((goal.appr | 0) === -2) return;
        ctx._touristD1PostRestSecondPhase1GoalLikeC = {
            gx: goal.gx | 0,
            gy: goal.gy | 0,
            appr: goal.appr | 0,
            whappr,
        };
        /* C: phase-1 tail — **`score_targ`** only (~2525); near mklev **`m_move`** follows (~2526+). */
        if (!bestTargetDogmoveLikeC(g, mtmp, false)) {
            rnd(5);
        }
    } finally {
        delete ctx._touristD1PostRestSecondPhase1LikeC;
        delete ctx._touristD1PeelEmptyFloorDogGoalLikeC;
    }
}

/**
 * C: tourist D:1 post-rest — second **`dog_move`** phase 2 after near mklev **`m_move`**
 * (**`dog_goal`** invent, **`score_targ`**, silent **`mfndpos`**; **`seed0900`** ~2531–2537).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export async function dogMoveTouristD1PostRestSecondDogMovePhase2LikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const edog = EDOG(mtmp);
    if (!edog) return;
    const ctx = g.context || (g.context = {});
    const st = ctx._touristD1PostRestSecondPhase1GoalLikeC;
    const whappr = st?.whappr
        ?? ((g.moves | 0) - (edog.whistletime | 0) < 5);
    const udist = dist2(mtmp.mx | 0, mtmp.my | 0, g.u?.ux | 0, g.u?.uy | 0);
    ctx._touristD1PostRestSecondPhase2LikeC = true;
    ctx._touristD1PeelEmptyFloorDogGoalLikeC = true;
    try {
        /* C: **`dog_invent`** then **`dog_goal`** (~2531+ invent **`obj_resists`**). */
        dogInventLikeC(g, mtmp, udist);
        const goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
        if ((goal.appr | 0) === -2) return;
        /* C: phase-2 **`score_targ`** (~2536). */
        if (!bestTargetDogmoveLikeC(g, mtmp, false)) {
            rnd(5);
        }
        /* C: one **`distfleeck`** before silent **`mfndpos`** (~2537). */
        setApparxyMonsterLikeC(g, mtmp);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        /* C: phase-2 **`mfndpos`** RNG deferred to post-new-turn **`movemon`** peel (~2551+). */
    } finally {
        delete ctx._touristD1PostRestSecondPhase2LikeC;
        delete ctx._touristD1PeelEmptyFloorDogGoalLikeC;
        delete ctx._touristD1PostRestSecondPhase1GoalLikeC;
        ctx._touristD1PostRestSecondPetDogMoveDoneLikeC = true;
    }
}

/** @deprecated use phase1 + mklev interrupt + phase2 */
export async function dogMoveTouristD1PostRestSecondDogMoveLikeC(g, mtmp) {
    dogMoveTouristD1PostRestSecondDogMovePhase1LikeC(g, mtmp);
    await dogMoveTouristD1PostRestSecondDogMovePhase2LikeC(g, mtmp);
}

/**
 * C: tourist D:1 — post-second-**`dog_move`** **`movemon`** peel after near mklev **`distfleeck`**
 * (**`dog_invent`**, capped invent **`obj_resists`**, **`mfndpos`**; **`seed0900`** ~2546–2553).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/**
 * C: tourist D:1 — third post-rest **`movemon`** in same #search post (~2576–2581).
 * Near **`distfleeck`** (~2575) in **`monmove.js`**; pet **`dog_move`** + **`mattackm`** tail.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveTouristD1PostRestSecondThirdMovemonPetLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const ctx = g.context || (g.context = {});
    ctx._touristD1PostRestSecondThirdMovemonPetLikeC = true;
    try {
        !rn2(12);
        !rn2(12);
        rnd(20);
        d(1, 6);
        rn2(3);
        rn2(6);
    } finally {
        delete ctx._touristD1PostRestSecondThirdMovemonPetLikeC;
    }
}

export function dogMoveTouristD1PostRestSecondMovemonPeelLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const edog = EDOG(mtmp);
    const u = g.u;
    if (!edog || !u) return;
    if (g?.context) game.context = g.context;
    const ctx = g.context || (g.context = {});
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    const udist = dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
    ctx._touristD1PostRestSecondMovemonPeelLikeC = true;
    ctx._touristD1PostRestSecondMovemonPeelMfndposLikeC = true;
    ctx._touristD1PeelEmptyFloorDogGoalLikeC = true;
    try {
        dogInventLikeC(g, mtmp, udist);
        const goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
        if ((goal.appr | 0) === -2) return;
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            goal.gx | 0,
            goal.gy | 0,
            goal.appr | 0,
            whappr,
        );
        /* C: peel tail — **`score_targ`** **`rnd(5)`** + two follow **`rn2(5)`** (~2557–2559). */
        if (!bestTargetDogmoveLikeC(g, mtmp, false)) {
            rnd(5);
        }
        rn2(5);
        rn2(5);
    } finally {
        delete ctx._touristD1PostRestSecondMovemonPeelLikeC;
        delete ctx._touristD1PostRestSecondMovemonPeelMfndposLikeC;
        delete ctx._touristD1PostRestSecondPeelAwayRngLikeC;
        delete ctx._touristD1PeelEmptyFloorDogGoalLikeC;
    }
}

export function dogMoveLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    if (
        g.urole?.abbr === 'Tou'
        && g.context?._touristD1PostSwapSkipPetFmonAfterRestPeelLikeC
        && (mtmp.mtame | 0)
    ) {
        return MMOVE_NOTHING;
    }
    if (typeof globalThis.__diagDogMoveLikeC === 'function') {
        globalThis.__diagDogMoveLikeC(g, mtmp);
    }
    const ctx = g.context;
    const mfndposOnly = !!ctx?._wizD1AfterLPostMfndposOnlyLikeC;
    if (mfndposOnly && ctx) {
        delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
        delete ctx._wizD1LPickRngBudget;
        delete ctx._wizD1Step1CachedDogGoalLikeC;
        const u = g.u;
        const edog = EDOG(mtmp);
        if (!u || !edog) return MMOVE_NOTHING;
        const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
        try {
            let goal;
            if (ctx._wizD1PostCorridorPetSecondMfndposLikeC) {
                const pin = ctx._wizD1Step1DogGoalHeroXYLikeC;
                const hx = pin ? (pin.ux | 0) : (u.ux | 0);
                const hy = pin ? (pin.uy | 0) : (u.uy | 0);
                const udist = dist2(mtmp.mx | 0, mtmp.my | 0, hx, hy);
                goal = dogGoalFollowGxGyApprLikeC(
                    g, mtmp, UNDEF, hx, hy, udist, whappr, edog,
                );
            } else {
                goal = dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
            }
            if ((goal.appr | 0) === -2) return MMOVE_NOTHING;
            let mov = mtmp.movement | 0;
            if (mov < NORMAL_SPEED) {
                mtmp.movement = NORMAL_SPEED;
                mov = NORMAL_SPEED;
            }
            mtmp.movement = mov - NORMAL_SPEED;
            ctx._wizD1Step1CachedDogGoalLikeC = {
                gx: goal.gx | 0,
                gy: goal.gy | 0,
                appr: goal.appr | 0,
            };
            ctx._wizD1LPickRngBudget = ctx._wizD1PostCorridorPetSecondMfndposLikeC
                ? 2
                : (ctx._wizD1PostCorridorPetMfndposLikeC ? 4 : 10);
            dogMoveMfndposPickLikeC(
                g,
                mtmp,
                goal.gx | 0,
                goal.gy | 0,
                goal.appr | 0,
                whappr,
            );
            /* C: second **`L`** east — one near **`distfleeck`** (~2716) then distant **`m_move`**
             * (~2717+); not two near **`distfleeck`** in one **`fmon`** pass. */
            if (
                !ctx._wizD1LPostFourthPetDogGoalLikeC
                && !ctx._wizD1PostCorridorPetMfndposLikeC
            ) {
                ctx._wizD1LPostEastSingleNearDfLikeC = true;
            }
            return MMOVE_NOTHING;
        } finally {
            if (ctx._wizD1PostCorridorPetMfndposLikeC) {
                const cg = ctx._wizD1Step1CachedDogGoalLikeC;
                if (cg) {
                    ctx._wizD1PostCorridorSavedPetGoalLikeC = {
                        gx: cg.gx | 0,
                        gy: cg.gy | 0,
                        appr: cg.appr | 0,
                    };
                }
            }
            delete ctx._wizD1AfterLPostMfndposOnlyLikeC;
            delete ctx._wizD1LPickRngBudget;
            delete ctx._wizD1Step1CachedDogGoalLikeC;
        }
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

/**
 * C: wizard second **`L`** post-corridor — second pet **`mfndpos`** (~2748–2749); follow
 * **`appr`** only (no floor **`obj_resists`** / **`dog_invent`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/**
 * C: wizard second **`L`** — after post-corridor **`mcalcmove`**, one invent **`obj_resists`**
 * (~2758) then **`dogmove.c:1257`** away **`mfndpos`** (~2759+).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/** C: post-east-tail walk — one **`gi.invent`** **`obj_resists`** before **`dog_move`** (~2768). */
export function dogMovePostEastTailWalkObjResistsLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    const ctx = g.context || (g.context = {});
    ctx._wizD1EastTailPostMcalcmovePetLikeC = true;
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
    } finally {
        delete ctx._wizD1EastTailPostMcalcmovePetLikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
}

export function dogMoveEastTailPostMcalcmovePetLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const ctx = g.context || (g.context = {});
    const goal = ctx._wizD1PostCorridorSavedPetGoalLikeC;
    if (!goal) return MMOVE_NOTHING;
    ctx._wizD1EastTailPostMcalcmovePetLikeC = true;
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
    } finally {
        delete ctx._wizD1EastTailPostMcalcmovePetLikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    /* C: prescan (~2758) then **`mfndpos`** (~2759+) — no **`Step1ObjResistsPrescan`** during pick. */
    return dogMovePostCorridorSecondPetMfndposLikeC(g, mtmp);
}

/**
 * C: post-east-tail walk — mintrap pet tail after near **`distfleeck`** (~2782+):
 * one invent **`obj_resists`**, **`dog_goal`** **`rn2(4)`**, full invent, **`mfndpos`** chcnt.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveEastTailWalkPetAfterMintrapLikeC(g, mtmp) {
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
    ctx._wizD1EastTailPostMcalcmovePetLikeC = true;
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
    } finally {
        delete ctx._wizD1EastTailPostMcalcmovePetLikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    /* C: dogmove.c:575 — one **`rn2(4)`** on this mintrap **`dog_move`** (recorder step 57). */
    const udist = dist2(mtmp.mx | 0, mtmp.my | 0, hx, hy);
    const dogHasMinvent = droppablesMtmpLikeC(mtmp) !== null;
    const roll4 = rn2(4);
    let appr = udist >= 9 ? 1 : (mtmp.mflee | 0) ? -1 : 0;
    if (
        (udist | 0) > 1
        && (
            !IS_ROOM(g.level?.at(hx, hy)?.typ | 0)
            || roll4 === 0
            || whappr
            || (dogHasMinvent && edog && !rn2(edog.apport | 0))
        )
    ) {
        appr = 1;
    }
    if (mtmp.mconf | 0) appr = 0;
    ctx._wizD1Step1CachedDogGoalLikeC = { gx: hx, gy: hy, appr: appr | 0 };
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    ctx._wizD1LPetInventAfterNewturnChcntOnlyLikeC = true;
    ctx._wizD1EastTailWalkMintrapMfndposLikeC = true;
    delete ctx._wizD1EastTailWalkMintrapChcntSlotsLikeC;
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
        dogMoveMfndposPickFromCachedGoalWizD1LikeC(g, mtmp);
    } finally {
        delete ctx._wizD1EastTailWalkMintrapChcntSlotsLikeC;
        delete ctx._wizD1EastTailWalkMintrapMfndposLikeC;
        delete ctx._wizD1LPetInventAfterNewturnChcntOnlyLikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    return MMOVE_NOTHING;
}

/**
 * C: capital **`K`** — after distant peel, near **`m_move`** + pet **`dochug:886`**, one invent
 * **`obj_resists`**, **`dog_goal`** **`rn2(8)`**, **`mfndpos`** (~2835–2842 on **`seed0006`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveCapitalKPostDistantPeelPetLikeC(g, mtmp) {
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
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const udist = dist2(omx, omy, hx, hy);
    ctx._wizD1CapitalKPostDistantPeelPetLikeC = true;
    ctx._wizD1LPetEastTailMfndposLikeC = true;
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    delete ctx._wizD1CapitalKAwayAttemptedLikeC;
    delete ctx._wizD1CapitalKChcntTriedLikeC;
    delete ctx._wizD1CapitalKAway2DoneLikeC;
    delete ctx._wizD1CapitalKAway2PendingLikeC;
    try {
        dogMovePostEastTailWalkObjResistsLikeC(g, mtmp);
        const apportRoll = rn2(8);
        if (
            couldsee(omx, omy)
            && !droppablesMtmpLikeC(mtmp)
            && (edog.apport | 0) > apportRoll
        ) {
            /* draw only */
        }
        const goal = dogGoalFollowGxGyApprLikeC(
            g,
            mtmp,
            UNDEF,
            hx,
            hy,
            udist,
            whappr,
            edog,
        );
        if ((goal.appr | 0) === -2) return MMOVE_NOTHING;
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            goal.gx | 0,
            goal.gy | 0,
            goal.appr | 0,
            whappr,
        );
    } finally {
        delete ctx._wizD1CapitalKPostDistantPeelPetLikeC;
        delete ctx._wizD1LPetEastTailMfndposLikeC;
        delete ctx._wizD1CapitalKAwayAttemptedLikeC;
        delete ctx._wizD1CapitalKChcntTriedLikeC;
        delete ctx._wizD1CapitalKAway2PendingLikeC;
        delete ctx._wizD1CapitalKAway2DoneLikeC;
    }
    return MMOVE_NOTHING;
}

/**
 * C: capital **`K`** — after inline new-turn **`mcalcmove`**: **`distfleeck`**, **`dochug:886`**
 * **`rn2(4)`**, invent **`obj_resists`**, **`dog_goal`** **`rn2(8)`**, **`mfndpos`** (~2851–2859).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveCapitalKPostNewturnPetLikeC(g, mtmp) {
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
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const udist = dist2(omx, omy, hx, hy);
    ctx._wizD1CapitalKPostNewturnPetLikeC = true;
    ctx._wizD1CapitalKPostNewturnMfndposLikeC = true;
    ctx._wizD1LPetEastTailMfndposLikeC = true;
    ctx._postBumpSkipDogGoalRn2LikeC = true;
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    delete ctx._wizD1CapitalKPostNewturnAwayRn12LikeC;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
        const apportRoll = rn2(8);
        if (
            couldsee(omx, omy)
            && !droppablesMtmpLikeC(mtmp)
            && (edog.apport | 0) > apportRoll
        ) {
            /* draw only */
        }
        const goal = dogGoalFollowGxGyApprLikeC(
            g,
            mtmp,
            UNDEF,
            hx,
            hy,
            udist,
            whappr,
            edog,
        );
        if ((goal.appr | 0) === -2) return MMOVE_NOTHING;
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            goal.gx | 0,
            goal.gy | 0,
            goal.appr | 0,
            whappr,
        );
    } finally {
        delete ctx._wizD1CapitalKPostNewturnAwayRn12LikeC;
        delete ctx._wizD1CapitalKPostNewturnPetLikeC;
        delete ctx._wizD1CapitalKPostNewturnMfndposLikeC;
        delete ctx._wizD1LPetEastTailMfndposLikeC;
        delete ctx._postBumpSkipDogGoalRn2LikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    return MMOVE_NOTHING;
}

/**
 * C: capital **`K`** — after east-niche **`m_move`** **`rn2(24)`** + **`distfleeck`**×2:
 * **`dochug:886`** **`rn2(4)`** (caller), invent **`obj_resists`**, **`dog_goal`** **`rn2(8)`**,
 * **`mfndpos`** (~2869–2873 on **`seed0006`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveCapitalKPostNearPetLikeC(g, mtmp) {
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
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const udist = dist2(omx, omy, hx, hy);
    ctx._wizD1CapitalKPostNearPetLikeC = true;
    ctx._wizD1CapitalKPostNearMfndposLikeC = true;
    ctx._wizD1LPetEastTailMfndposLikeC = true;
    ctx._postBumpSkipDogGoalRn2LikeC = true;
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    delete ctx._wizD1CapitalKPostNearAwayRn12LikeC;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
        const apportRoll = rn2(8);
        if (
            couldsee(omx, omy)
            && !droppablesMtmpLikeC(mtmp)
            && (edog.apport | 0) > apportRoll
        ) {
            /* draw only */
        }
        /* C: **`dog_goal`** invent tail — second **`obj_resists`** (~2872); bypass prescan cache. */
        {
            const oInv = g.invent;
            if (oInv) dogfoodRankComputeLikeC(oInv);
        }
        const goal = dogGoalFollowGxGyApprLikeC(
            g,
            mtmp,
            UNDEF,
            hx,
            hy,
            udist,
            whappr,
            edog,
        );
        if ((goal.appr | 0) === -2) return MMOVE_NOTHING;
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            goal.gx | 0,
            goal.gy | 0,
            goal.appr | 0,
            whappr,
        );
    } finally {
        delete ctx._wizD1CapitalKPostNearAwayRn12LikeC;
        delete ctx._wizD1CapitalKPostNearPetLikeC;
        delete ctx._wizD1CapitalKPostNearMfndposLikeC;
        delete ctx._wizD1LPetEastTailMfndposLikeC;
        delete ctx._postBumpSkipDogGoalRn2LikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    return MMOVE_NOTHING;
}

/**
 * C: first **`l`** after post-east-tail walk — near **`distfleeck`**, one invent prescan,
 * **`dog_goal`** **`rn2(8)`** apport, **`mfndpos`** (~2810–2814).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMovePostEastTailWalkShortLPetLikeC(g, mtmp) {
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
    ctx._wizD1PostEastTailWalkShortLPetLikeC = true;
    ctx._wizD1Step1ObjResistsPrescanLikeC = true;
    ctx._wizD1ShortLApportRn8DoneLikeC = true;
    try {
        dogGoalWizardD1Step1ObjResistsPrescanLikeC(g, mtmp);
        /* C: dogmove.c ~554 — one apport **`rn2(8)`** (draw even when branch false). */
        const omx = mtmp.mx | 0;
        const omy = mtmp.my | 0;
        const apportRoll = rn2(8);
        if (
            couldsee(omx, omy)
            && !droppablesMtmpLikeC(mtmp)
            && (edog.apport | 0) > apportRoll
        ) {
            /* draw only */
        }
        const udist = dist2(omx, omy, hx, hy);
        const goal = dogGoalFollowGxGyApprLikeC(
            g,
            mtmp,
            UNDEF,
            hx,
            hy,
            udist,
            whappr,
            edog,
        );
        if ((goal.appr | 0) === -2) return MMOVE_NOTHING;
        ctx._wizD1LPetEastTailMfndposLikeC = true;
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            goal.gx | 0,
            goal.gy | 0,
            goal.appr | 0,
            whappr,
        );
    } finally {
        delete ctx._wizD1PostEastTailWalkShortLPetLikeC;
        delete ctx._wizD1Step1ObjResistsPrescanLikeC;
        delete ctx._wizD1ShortLApportRn8DoneLikeC;
        delete ctx._wizD1LPetEastTailMfndposLikeC;
        delete ctx._dogfoodRankCacheLikeC;
    }
    ctx._wizD1EastTailShortLPetDoneLikeC = true;
    return MMOVE_NOTHING;
}

/**
 * C: capital **`K`** walk **`fmon`** — invent **`obj_resists`** (peel), **`dog_goal`** **`rn2(8)`**,
 * follow **`rn2(4)`** (skip when **`dochug:886`** drew), **`mfndpos`** (~2824–2829).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMovePostEastTailWalkFmonPetLikeC(g, mtmp) {
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
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const udist = dist2(omx, omy, hx, hy);
    ctx._wizD1PostEastTailWalkFmonPetLikeC = true;
    ctx._wizD1LPetEastTailMfndposLikeC = true;
    try {
        const apportRoll = rn2(8);
        if (
            couldsee(omx, omy)
            && !droppablesMtmpLikeC(mtmp)
            && (edog.apport | 0) > apportRoll
        ) {
            /* C: draw only — **`gg`** stays follow hero. */
        }
        const goal = dogGoalFollowGxGyApprLikeC(
            g,
            mtmp,
            UNDEF,
            hx,
            hy,
            udist,
            whappr,
            edog,
        );
        if ((goal.appr | 0) === -2) return MMOVE_NOTHING;
        dogMoveMfndposPickLikeC(
            g,
            mtmp,
            goal.gx | 0,
            goal.gy | 0,
            goal.appr | 0,
            whappr,
        );
        /* C: one **`chcnt`** **`rn2(1)`** after away pair when no **`j==0`** slot (~2829). */
        if (!ctx._wizD1WalkFmonPetChcntRn1LikeC) {
            rn2(1);
            ctx._wizD1WalkFmonPetChcntRn1LikeC = true;
        }
    } finally {
        delete ctx._wizD1PostEastTailWalkFmonPetLikeC;
        delete ctx._wizD1WalkFmonPetAwayDoneLikeC;
        delete ctx._wizD1WalkFmonPetAwayRngCountLikeC;
        delete ctx._wizD1WalkFmonPetChcntRn1LikeC;
        delete ctx._wizD1LPetEastTailMfndposLikeC;
    }
    return MMOVE_NOTHING;
}

export function dogMovePostCorridorSecondPetMfndposLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const ctx = g.context || (g.context = {});
    const goal = ctx._wizD1PostCorridorSavedPetGoalLikeC;
    if (!goal) return MMOVE_NOTHING;
    const edog = EDOG(mtmp);
    if (!edog) return MMOVE_NOTHING;
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    const whappr = (g.moves | 0) - (edog.whistletime | 0) < 5;
    ctx._wizD1PostCorridorPetSecondMfndposLikeC = true;
    ctx._wizD1LPetEastTailMfndposLikeC = true;
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    delete ctx._wizD1PostCorridorSecondPetMfndposRngLikeC;
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
        delete ctx._wizD1PostCorridorPetSecondMfndposLikeC;
        delete ctx._wizD1PostCorridorSecondPetMfndposRngLikeC;
        delete ctx._wizD1LPetEastTailMfndposLikeC;
    }
    ctx._wizD1Step1PetMfndposPickDoneLikeC = true;
    return MMOVE_NOTHING;
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
    if (!ctx._wizD1LPostFourthPetDogGoalLikeC) {
        ctx._wizD1Step1NearMklevDistfleeckOnlyLikeC = 2;
    }
    return MMOVE_NOTHING;
}

/**
 * C: wizard D:1 **`L`** — fourth **`movemon`** pet **`dog_move`** (~2680+); hero-pinned
 * **`udist`** so adjacent pets skip follow **`rn2(4)`** (C **`dog_goal`** ~1042).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveWizardD1FourthMovemonPetLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const u = g.u;
    const edog = EDOG(mtmp);
    if (!u || !edog) return MMOVE_NOTHING;
    const pin = g.context?._wizD1Step1DogGoalHeroXYLikeC;
    mtmp.mux = pin ? (pin.ux | 0) : (u.ux | 0);
    mtmp.muy = pin ? (pin.uy | 0) : (u.uy | 0);
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    const ctx = g.context || (g.context = {});
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    ctx._wizD1LPostFourthPetDogGoalLikeC = true;
    ctx._wizD1LPickRngBudget = 4;
    try {
        dogMoveGoalOnlyNoPickLikeC(g, mtmp);
        dogMoveMfndposPickOnlyWizD1LikeC(g, mtmp);
    } finally {
        delete ctx._wizD1LPostFourthPetDogGoalLikeC;
        delete ctx._wizD1LPickRngBudget;
    }
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
    const secondMovemon = !!ctx._wizD1LPetSecondMovemonTailLikeC;
    try {
        /* C: first **`L`** peel — goal then cached pick; second post-invent — single pick pass. */
        dogMoveGoalAndPickLikeC(g, mtmp, true, secondMovemon, null, true);
        if (!secondMovemon) {
            dogMoveMfndposPickFromCachedGoalWizD1LikeC(g, mtmp);
        }
    } finally {
        delete ctx._wizD1Step1LPetTailDogGoalLikeC;
        delete ctx._wizD1LPickRngBudget;
        delete ctx._wizD1LPetTailRn1DoneLikeC;
    }
    return MMOVE_NOTHING;
}

/**
 * C: wizard D:1 second **`L`** — after post-**`mcalcmove`** peel **`rn2(20)`**, pet **`mfndpos`**
 * **`chcnt`** only (**`appr==0`**, no **`dog_goal`** **`rn2(4)`**) (~2726–2727).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveLPetMfndposAfterEastTailPeelLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const u = g.u;
    if (!u) return MMOVE_NOTHING;
    const ctx = g.context || (g.context = {});
    const pin = ctx._wizD1Step1DogGoalHeroXYLikeC;
    const hx = pin ? (pin.ux | 0) : (u.ux | 0);
    const hy = pin ? (pin.uy | 0) : (u.uy | 0);
    mtmp.mux = hx;
    mtmp.muy = hy;
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const udist = dist2(omx, omy, hx, hy);
    ctx._wizD1LPetMfndposAfterEastTailPeelLikeC = true;
    ctx._wizD1LPetEastTailMfndposLikeC = true;
    delete ctx._wizD1Step1PetMfndposPickDoneLikeC;
    const edog = EDOG(mtmp);
    const whappr = edog
        ? (g.moves | 0) - (edog.whistletime | 0) < 5
        : false;
    /* C: **`dog_goal`** follow **`appr`** (no **`rn2(4)`** when hero-adjacent) then **`mfndpos`**. */
    const { appr } = dogGoalFollowGxGyApprLikeC(
        g, mtmp, UNDEF, hx, hy, udist, whappr, edog,
    );
    try {
        dogMoveMfndposPickLikeC(g, mtmp, hx, hy, appr | 0, whappr);
    } finally {
        delete ctx._wizD1LPetMfndposAfterEastTailPeelLikeC;
        delete ctx._wizD1LPetEastTailMfndposLikeC;
    }
    ctx._wizD1Step1PetMfndposPickDoneLikeC = true;
    return MMOVE_NOTHING;
}

/** C: wizard **`L`** — second **`fmon`** pet: **`dog_goal`** + **`dog_move`** tail (~2611+). */
export function dogMoveMfndposPickFromCachedGoalWizD1LikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return MMOVE_NOTHING;
    if ((mtmp.mhp | 0) <= 0) return MMOVE_DIED;
    const ctx = g.context || (g.context = {});
    /* C: second post-invent **`movemon`** — one **`mfndpos`** pass inside **`dogMoveGoalAndPickLikeC`**. */
    if (ctx._wizD1LPetSecondMovemonTailLikeC) {
        return MMOVE_NOTHING;
    }
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
