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
    const newload = weightObjLikeC(obj);
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
    return 'Your pet';
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
 * C: dog.c **`dogfood`** — floor loop + invent scan (**`obj_resists`**, ranks).
 * @param {Record<string, unknown>} obj
 * @returns {number}
 */
function dogfoodRankLikeC(obj) {
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
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const udist = dist2(omx, omy, ux, uy);
    const inSight = couldsee(omx, omy);
    const hasMinvent = droppablesMtmpLikeC(mtmp) !== null;
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
    /* C: post-gate **`dog_goal`** — first-pass towel APPORT goal persists without a
     * second **`rn2(8)`**; keeps **`gg.gtyp`** off **`UNDEF`** so follow tail skips
     * **`gi.invent`** **`dogfood`** resist draws (**`seed0077` ~3218**). */
    if (
        gtyp === UNDEF
        && g.context?._searchApportTowelXYLikeC
        && (
            (g.context?._searchStep11Passes | 0) >= 2
            || (g.context?._searchRogGateCountLikeC | 0) >= 1
        )
    ) {
        gx = g.context._searchApportTowelXYLikeC.x | 0;
        gy = g.context._searchApportTowelXYLikeC.y | 0;
        gtyp = APPORT;
    }
    return dogGoalFollowGxGyApprLikeC(
        g, mtmp, gtyp, gx, gy, udist, whappr, edog,
    );
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
    gx = u.ux | 0;
    gy = u.uy | 0;
    const dogHasMinvent = droppablesMtmpLikeC(mtmp) !== null;
    let appr = udist >= 9 ? 1 : (mtmp.mflee | 0) ? -1 : 0;
    if (udist > 1) {
        if (
            !IS_ROOM(g.level?.at(gx, gy)?.typ | 0)
            || !rn2(4)
            || whappr
            || (dogHasMinvent && edog && !rn2(edog.apport | 0))
        ) {
            appr = 1;
        }
    }
    if (appr === 0) {
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
                const ux = u.ux | 0;
                const uy = u.uy | 0;
                for (const t of g.level?.traps ?? []) {
                    if (!t || (t.ttyp | 0) !== MAGIC_PORTAL) continue;
                    if (distmin(ux, uy, t.tx | 0, t.ty | 0) <= 2) {
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
            const head = g.level?.floorObjHeads?.get(floorObjKey(nx, ny));
            for (let obj = head; obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg = true;
                    continue;
                }
                if (
                    !canReachFood
                    || (obj.oclass | 0) !== NH5_FOOD_CLASS
                ) {
                    continue;
                }
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
 * C: dogmove.c **`dog_move`** — **`mfndpos`** loop (uncursed count, traps, cursed piles, **`mtrack`**, pick).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} ggx
 * @param {number} ggy
 * @param {number} appr
 * @param {boolean} whappr
 */
function dogMoveMfndposPickLikeC(g, mtmp, ggx, ggy, appr, whappr) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const u = g.u;
    const edog = EDOG(mtmp);
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt <= 0) return;

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

    if (appr === 0) {
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
                const head = g.level?.floorObjHeads?.get(floorObjKey(nx, ny));
                for (let obj = head; obj; obj = obj.nexthere) {
                    if (obj.cursed) {
                        cursemsg = true;
                        continue;
                    }
                    if (
                        !canReachFood
                        || (obj.oclass | 0) !== NH5_FOOD_CLASS
                    ) {
                        continue;
                    }
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
            any = true;
            const nd = dist2(nx, ny, ggx, ggy);
            if (nd < minNd) {
                minNd = nd;
                pickX = nx;
                pickY = ny;
            }
        }
        /* C: first **`#search`** gate — pet on west-door niche row (**`door.y`** on
         * **`door.x-1`**); fill-tile towel reached on second **`#search`**. */
        const towel = g.context?._searchApportTowelXYLikeC;
        if (any && (g.context?._searchStep11Passes | 0) === 1 && towel) {
            const tx = towel.x | 0;
            let doorY = -1;
            for (const d of g.level?.doors ?? []) {
                if (!d) continue;
                if ((d.x | 0) - 1 === tx && (d.y | 0) >= (towel.y | 0)) {
                    doorY = d.y | 0;
                    break;
                }
            }
            if (doorY >= 0 && omx === tx) {
                pickX = tx;
                pickY = doorY;
            }
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
            const head = g.level?.floorObjHeads?.get(floorObjKey(nx, ny));
            for (let obj = head; obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg = true;
                    continue;
                }
                if (
                    !canReachFood
                    || (obj.oclass | 0) !== NH5_FOOD_CLASS
                ) {
                    continue;
                }
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
        const ndist = dist2(nx, ny, ggx, ggy);
        const j = (ndist - nidist) * appr;
        if (
            (j === 0 && !rn2(++chcnt))
            || j < 0
            || (j > 0
                && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))
        ) {
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
function dogMoveGoalAndPickLikeC(
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
    if (!udist) return MMOVE_NOTHING;
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
    return (mtmp.mx !== preMx || mtmp.my !== preMy)
        ? MMOVE_MOVED
        : MMOVE_NOTHING;
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
    /* C: second **`#search`** — **`dog_invent`** + **`dog_goal`** only; gate **`rn2(4)`** follows. */
    const doPick = (g.context?._searchStep11Passes | 0) < 2;
    return dogMoveGoalAndPickLikeC(g, mtmp, true, doPick);
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
        mtmp.mx = tx;
        mtmp.my = ty;
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
    dogGoalFloorScanRngLikeC(g, mtmp, true, whappr);
}
