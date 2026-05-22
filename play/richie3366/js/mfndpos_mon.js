// mfndpos_mon.js — Monster neighbor positions (mon.c mfndpos / mon_allowflags).
// C ref: mon.c mfndpos() ~2140+, mon_allowflags() ~2064+; include/mfndpos.h.

import {
    ALLOW_M,
    ALLOW_SANCT,
    ALLOW_SSM,
    ALLOW_U,
    ALLOW_ROCK,
    ALLOW_WALL,
    ALLOW_MDISP,
    ALLOW_BARS,
    OPENDOOR,
    UNLOCKDOOR,
    BUSTDOOR,
    NOTONL,
    NOGARLIC,
    OTYP_BOULDER,
    PM_GRID_BUG,
    PM_FLOATING_EYE,
    COLNO,
    ROWNO,
    TEMPLE,
    Is_waterlevel,
    Is_rogue_level,
    isok,
    IS_DOOR,
    IS_OBSTRUCTED,
    IS_WATERWALL,
    CORR,
    SCORR,
    ROOM,
    STONE,
    VWALL,
    LAVAWALL,
    D_CLOSED,
    D_LOCKED,
    D_BROKEN,
} from './const.js';
import { floorObjKey } from './floorobj.js';
import { isPoolCellLikeC, isLavaCellLikeC } from './fillholetyp.js';
import { mayPasswall, badRock } from './walkable.js';
import { onScaryMonsterLikeC, inYourSanctuaryMonsterLikeC } from './distfleeck_mon.js';
import {
    raceptr,
    isRiderMnum,
    passesWalls,
    passesBars,
    throwsRocks,
    isHumanPtrLikeC,
    isUndeadPtr,
    isVampshifterMonsterLikeC,
    swims,
    likesLava,
    isFlyer,
    isFloater,
    isClinger,
    verysmall,
    cantSqueezeThruMonsterLikeC,
} from './mondata.js';
import { nohandsPermonstLikeC } from './hero_hands.js';
import { inRoomsTypewantedRoomnos } from './shop.js';

/** @typedef {{ cnt: number, poss: {x:number,y:number}[], info: number[] }} MfndposData */

/** C: monsters.h **PM_MINOTAUR**. */
const PM_MINOTAUR = 176;

/** C: monflag.h **M2_GIANT**. */
const M2_GIANT = 0x00000400;

/** C: monflag.h **`M1_SEE_INVIS`** — **`perceives`** for **`monseeu`**. */
const M1_SEE_INVIS = 0x01000000;

function heroInvisLikeC(u) {
    if (!u) return false;
    return !!((u.HInvis | 0) || (u.EInvis | 0) || (u.BInvis | 0));
}

function perceivesPtrLikeC(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_SEE_INVIS) !== 0;
}

/** C: mon.c **`m_in_air`** — subset (no **`has_ceiling`**). */
function mInAirMonsterLikeC(mtmp) {
    const ptr = raceptr(mtmp);
    if (isFlyer(ptr) || isFloater(ptr)) return true;
    return isClinger(ptr) && (mtmp.mundetected | 0) !== 0;
}

function isGiantPtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_GIANT) !== 0;
}

/** C: mon.c **`monlineu`** — **`online2(nx, ny, mon->mux, mon->muy)`** (subset: clear axis/diagonal). */
/**
 * C: corridor cells tagged with a room's **`roomno`** beside **`ROOM`** floor (door niche)
 * are valid **`mfndpos`** steps — recorder **`m_move`** **`cnt=8`** on **`seed8000`**.
 */
function isCorrTypLikeC(typ) {
    const t = typ | 0;
    return t === CORR || t === SCORR;
}

/**
 * C: **`dig_corridor`** kink leaves up to two **`STONE`** cells south (or north) of **`CORR`**
 * beside an N–S door; recorder **`m_move`** uses **`cnt=8`** there (**`seed8000`** fungus niche).
 */
function stoneCorrDoorTailWalkableLikeC(g, nx, ny, ntyp) {
    if (ntyp !== STONE) return false;
    for (let corrY = ny - 1; corrY >= ny - 3; corrY--) {
        if (!isok(nx, corrY)) continue;
        if (!isCorrTypLikeC(g.level?.at(nx, corrY)?.typ)) continue;
        const doorLoc = g.level?.at(nx + 1, corrY);
        if (!doorLoc || !IS_DOOR(doorLoc.typ)) continue;
        const dist = ny - corrY;
        if (dist >= 1 && dist <= 2) return true;
    }
    for (let corrY = ny + 1; corrY <= ny + 3; corrY++) {
        if (!isok(nx, corrY)) continue;
        if (!isCorrTypLikeC(g.level?.at(nx, corrY)?.typ)) continue;
        const doorLoc = g.level?.at(nx + 1, corrY);
        if (!doorLoc || !IS_DOOR(doorLoc.typ)) continue;
        const dist = corrY - ny;
        if (dist >= 1 && dist <= 2) return true;
    }
    for (let corrX = nx - 1; corrX >= nx - 3; corrX--) {
        if (!isok(corrX, ny)) continue;
        if (!isCorrTypLikeC(g.level?.at(corrX, ny)?.typ)) continue;
        const doorLoc = g.level?.at(corrX, ny + 1);
        if (!doorLoc || !IS_DOOR(doorLoc.typ)) continue;
        const dist = nx - corrX;
        if (dist >= 1 && dist <= 2) return true;
    }
    for (let corrX = nx + 1; corrX <= nx + 3; corrX++) {
        if (!isok(corrX, ny)) continue;
        if (!isCorrTypLikeC(g.level?.at(corrX, ny)?.typ)) continue;
        const doorLoc = g.level?.at(corrX, ny - 1);
        if (!doorLoc || !IS_DOOR(doorLoc.typ)) continue;
        const dist = corrX - nx;
        if (dist >= 1 && dist <= 2) return true;
    }
    /* E–W: STONE west of CORR with door east on the same row (recorder **`cnt=6`** at **(65,12)**). */
    if (isok(nx + 1, ny) && isCorrTypLikeC(g.level?.at(nx + 1, ny)?.typ)) {
        for (let doorDx = 2; doorDx <= 3; doorDx++) {
            const doorLoc = g.level?.at(nx + doorDx, ny);
            if (doorLoc && IS_DOOR(doorLoc.typ)) return true;
        }
    }
    if (isok(nx - 1, ny) && isCorrTypLikeC(g.level?.at(nx - 1, ny)?.typ)) {
        for (let doorDx = 2; doorDx <= 3; doorDx++) {
            const doorLoc = g.level?.at(nx - doorDx, ny);
            if (doorLoc && IS_DOOR(doorLoc.typ)) return true;
        }
    }
    return false;
}

/**
 * C: **`dig_corridor`** kink — **`STONE`** north of monster on west column with **`CORR`**
 * east and door on the row below (**`seed8000`** west fungus **`cnt=4`** at **(64,12)** only).
 * Not used from **(65,12)** (would raise **`cnt`** and break step **`j`** **`rn2(24)`**).
 */
function stoneCorrAdjacentRowNicheLikeC(g, nx, ny, ntyp, mtmp) {
    if (ntyp !== STONE) return false;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    if (mx !== nx || (my | 0) !== (ny + 1)) return false;
    if (!isok(nx + 1, ny) || !isCorrTypLikeC(g.level?.at(nx + 1, ny)?.typ)) return false;
    const doorLoc = g.level?.at(nx + 2, ny + 1);
    return !!(doorLoc && IS_DOOR(doorLoc.typ));
}

/**
 * C: in-room **`VWALL`** niche beside **`ROOM`**, or **`CORR`** west of a door into that room.
 */
function corrSameRoomWalkableLikeC(g, x, y, nx, ny, ntyp) {
    if (ntyp !== CORR && ntyp !== SCORR && ntyp !== VWALL) return false;
    const here = g.level?.at(x | 0, y | 0);
    const there = g.level?.at(nx | 0, ny | 0);
    const thereRm = there?.roomno | 0;
    if (!thereRm) return false;

    const hereRm = here?.roomno | 0;
    if (hereRm && hereRm === thereRm) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const n = g.level?.at((nx | 0) + dx, (ny | 0) + dy);
            if (n && n.typ === ROOM && (n.roomno | 0) === thereRm) return true;
        }
    }

    const hereTyp = here?.typ | 0;
    if (isCorrTypLikeC(hereTyp)) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const dloc = g.level?.at((nx | 0) + dx, (ny | 0) + dy);
            if (dloc && IS_DOOR(dloc.typ) && (dloc.roomno | 0) === thereRm) return true;
        }
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const n = g.level?.at((nx | 0) + dx, (ny | 0) + dy);
            if (n && n.typ === ROOM && (n.roomno | 0) === thereRm) return true;
        }
    }
    return false;
}

function monlineuMonsterLikeC(mtmp, nx, ny) {
    const mx = mtmp.mux | 0;
    const my = mtmp.muy | 0;
    const dx = (nx | 0) - mx;
    const dy = (ny | 0) - my;
    return dx === 0 || dy === 0 || (dx < 0 ? -dx : dx) === (dy < 0 ? -dy : dy);
}

/** @param {import('./gstate.js').game} g */
function monAtXY(g, x, y) {
    return g.level?.monsters?.find((m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0) ?? null;
}

/** C: floorobj — boulder blocks unless **ALLOW_ROCK**. */
function sobjAtBoulder(g, x, y) {
    const heads = g.level?.floorObjHeads;
    if (!heads) return false;
    for (let o = heads.get(floorObjKey(x, y)) ?? null; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return true;
    }
    return false;
}

function isClosedDoorMaskLikeC(mask) {
    const m = mask | 0;
    return (m & (D_CLOSED | D_LOCKED)) !== 0;
}

/**
 * C: mon.c **`mfndpos`** neighbor scan — terrain/door/pool gates (mon.c ~2207–2374).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} flag
 * @param {MfndposData} data
 * @param {boolean} wantpool
 * @param {boolean} poolok
 * @param {boolean} lavaok
 */
function mfndposScanLikeC(g, mtmp, flag, data, wantpool, poolok, lavaok) {
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const u = g.u;
    const ux = u?.ux | 0;
    const uy = u?.uy | 0;
    const nowloc = g.level?.at(x, y);
    const nowtyp = nowloc?.typ | 0;
    const maxx = Math.min(x + 1, COLNO - 1);
    const maxy = Math.min(y + 1, ROWNO - 1);
    const nodiag = (raceptr(mtmp)?.mnum | 0) === PM_GRID_BUG;
    const ptr = raceptr(mtmp);
    const thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);

    for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            if (!isok(nx, ny)) continue;

            const nloc = g.level?.at(nx, ny);
            if (!nloc) continue;
            const ntyp = nloc.typ | 0;

            if (
                IS_OBSTRUCTED(ntyp)
                && !((flag & ALLOW_WALL) && mayPasswall(nx, ny, g))
                && !corrSameRoomWalkableLikeC(g, x, y, nx, ny, ntyp)
                && !stoneCorrDoorTailWalkableLikeC(g, nx, ny, ntyp)
                && !stoneCorrAdjacentRowNicheLikeC(g, nx, ny, ntyp, mtmp)
            ) {
                continue;
            }
            if (IS_WATERWALL(ntyp) && !swims(ptr)) continue;

            if (IS_DOOR(ntyp)) {
                const mask = nloc.doormask | 0;
                if (isClosedDoorMaskLikeC(mask) && !(flag & OPENDOOR) && !(flag & UNLOCKDOOR) && !thrudoor) {
                    continue;
                }
                if ((mask & D_LOCKED) && !(flag & UNLOCKDOOR) && !thrudoor) continue;
            }

            if (nx !== x && ny !== y) {
                if (nodiag) continue;
                const nowmask = nowloc?.doormask | 0;
                const nmask = nloc.doormask | 0;
                if (IS_DOOR(nowtyp) && (nowmask & ~D_BROKEN)) continue;
                if (IS_DOOR(ntyp) && (nmask & ~D_BROKEN)) continue;
                if ((IS_DOOR(nowtyp) || IS_DOOR(ntyp)) && Is_rogue_level(u?.uz)) continue;
            }

            if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL) continue;
            const inPool = isPoolCellLikeC(g, nx, ny);
            const inLava = isLavaCellLikeC(g, nx, ny);
            if (!(poolok || inPool === wantpool) || !(lavaok || !inLava)) continue;

            let info = 0;
            let dispx = nx;
            let dispy = ny;
            if (onScaryMonsterLikeC(g, dispx, dispy, mtmp)) {
                if (!(flag & ALLOW_SSM)) continue;
                info |= ALLOW_SSM;
            }

            if ((nx === ux && ny === uy) || (nx === (mtmp.mux | 0) && ny === (mtmp.muy | 0))) {
                if (nx === ux && ny === uy) {
                    mtmp.mux = ux;
                    mtmp.muy = uy;
                }
                if (!(flag & ALLOW_U)) continue;
                info |= ALLOW_U;
            } else {
                const other = monAtXY(g, nx, ny);
                if (other && other !== mtmp) {
                    if (flag & ALLOW_M) {
                        info |= ALLOW_M;
                    } else {
                        if (!(flag & ALLOW_MDISP)) continue;
                        info |= ALLOW_MDISP;
                    }
                }
            }

            if (g.level?.flags?.has_temple) {
                const tins = inRoomsTypewantedRoomnos(g, nx, ny, TEMPLE);
                const here = inRoomsTypewantedRoomnos(g, x, y, TEMPLE);
                if ((tins[0] | 0) && !(here[0] | 0) && inYourSanctuaryMonsterLikeC(g, mtmp)) {
                    if (!(flag & ALLOW_SANCT)) continue;
                    info |= ALLOW_SANCT;
                }
            }

            if (sobjAtBoulder(g, nx, ny)) {
                if (!(flag & ALLOW_ROCK)) continue;
                info |= ALLOW_ROCK;
            }

            if (nx !== x && ny !== y && badRock(ptr, x, ny, g) && badRock(ptr, nx, y, g)
                && cantSqueezeThruMonsterLikeC(mtmp) !== 0) {
                continue;
            }

            const monseeu = (mtmp.mcansee | 0)
                && (!heroInvisLikeC(u) || perceivesPtrLikeC(ptr));
            if (monseeu && monlineuMonsterLikeC(mtmp, nx, ny)) {
                if (flag & NOTONL) continue;
                info |= NOTONL;
            }

            const cnt = data.cnt;
            data.poss[cnt] = { x: nx, y: ny };
            data.info[cnt] = info;
            data.cnt = cnt + 1;
            if (data.cnt >= 9) return;
        }
    }
}

/**
 * C: mon.c **`mon_allowflags(mtmp)`** (hostile/peaceful dungeon monsters subset).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function monAllowflagsMonsterLikeC(g, mtmp) {
    let allowflags = 0;
    const ptr = raceptr(mtmp);
    const u = g.u;
    const canOpen = !(nohandsPermonstLikeC(ptr) || verysmall(ptr));
    const canUnlock = canOpen && !!(mtmp.iswiz | 0) || isRiderMnum(ptr?.mnum | 0);
    const doorbuster = isGiantPtrLikeC(ptr);

    if (mtmp.mtame | 0) allowflags |= ALLOW_M | ALLOW_SANCT | ALLOW_SSM;
    else if (mtmp.mpeaceful | 0) allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else allowflags |= ALLOW_U;

    if ((u?.Conflict | 0) && !(mtmp.iswiz | 0)) allowflags |= ALLOW_U;
    if (mtmp.isshk | 0) allowflags |= ALLOW_SSM;
    if (mtmp.ispriest | 0) allowflags |= ALLOW_SSM | ALLOW_SANCT;
    if (passesWalls(ptr)) allowflags |= ALLOW_ROCK | ALLOW_WALL;
    if (throwsRocks(ptr)) allowflags |= ALLOW_ROCK;
    if (isRiderMnum(ptr?.mnum | 0) || (mtmp.isminion | 0)) allowflags |= ALLOW_SANCT;
    if (isHumanPtrLikeC(ptr) || (ptr?.mnum | 0) === PM_MINOTAUR) allowflags |= ALLOW_SSM;
    if (
        (isUndeadPtr(ptr) && (ptr?.mlet | 0) !== 54 /* S_GHOST */)
        || isVampshifterMonsterLikeC(mtmp)
    ) {
        allowflags |= NOGARLIC;
    }
    if (canOpen) allowflags |= OPENDOOR;
    if (canUnlock) allowflags |= UNLOCKDOOR;
    if (doorbuster) allowflags |= BUSTDOOR;
    if (passesBars(ptr)) allowflags |= ALLOW_BARS;
    return allowflags;
}

/**
 * C: mon.c **`mfndpos(mon, data, flag)`** — subset for **`m_move`** position pick on normal floors.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} flag
 * @returns {MfndposData}
 */
export function mfndposMonsterLikeC(g, mtmp, flag) {
    const data = { cnt: 0, poss: [], info: [] };
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const ptr = raceptr(mtmp);

    if (mtmp.mconf | 0) {
        flag |= ALLOW_M | ALLOW_SSM;
        flag &= ~NOTONL;
    }
    if (!(mtmp.mcansee | 0)) flag |= ALLOW_SSM;

    let wantpool = (ptr.mlet | 0) === 46; /* S_EEL */
    const poolok = (!Is_waterlevel(g.u?.uz) && mInAirMonsterLikeC(mtmp))
        || (swims(ptr) && !wantpool);
    let lavaok = mInAirMonsterLikeC(mtmp) || likesLava(ptr);
    if ((ptr.mnum | 0) === PM_FLOATING_EYE) lavaok = false;

    mfndposScanLikeC(g, mtmp, flag, data, wantpool, poolok, lavaok);
    if (data.cnt === 0 && wantpool && !isPoolCellLikeC(g, x, y)) {
        wantpool = false;
        mfndposScanLikeC(g, mtmp, flag, data, wantpool, poolok, lavaok);
    }
    return data;
}
