// baalz_fixup.js — C mkmaze.c baalz_fixup (Baalzebub lair beetle legs after wallification).
// C ref: mkmaze.c baalz_fixup(); fixup_special() when on_level(&u.uz, &baalzebub_level).

import {
    COLNO,
    ROWNO,
    STONE,
    DBWALL,
    HWALL,
    POOL,
    IRONBARS,
    TLWALL,
    TRWALL,
    TUWALL,
    TDWALL,
    BRCORNER,
    BLCORNER,
    TRCORNER,
    TLCORNER,
    W_NONDIGGABLE,
    IS_WALL,
    IS_STWALL,
    isok,
    RLOC_ERR,
    RLOC_NOMSG,
} from './const.js';
import { fixWallSpinesRect } from './wall_spine.js';
import { enextoNearMon } from './walkable.js';
import { newsym } from './display.js';

/**
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @returns {object|null}
 */
function mAtMonLikeC(g, x, y) {
    const mons = g.level?.monsters;
    if (!mons) return null;
    for (const m of mons) {
        if ((m.mx | 0) === x && (m.my | 0) === y) return m;
    }
    return null;
}

/** C: mklev.c wall_cleanup subset for baalz inarea. */
function wallCleanupRectLikeC(g, x1, y1, x2, y2) {
    const map = g.level;
    if (!map) return;
    const isSolid = (x, y) => {
        if (!isok(x, y)) return true;
        return IS_STWALL(map.at(x, y)?.typ ?? STONE);
    };
    for (let x = x1 | 0; x <= (x2 | 0); x++) {
        for (let y = y1 | 0; y <= (y2 | 0); y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            const typ = loc.typ | 0;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (
                isSolid(x - 1, y - 1) && isSolid(x - 1, y) && isSolid(x - 1, y + 1)
                && isSolid(x, y - 1) && isSolid(x, y + 1)
                && isSolid(x + 1, y - 1) && isSolid(x + 1, y) && isSolid(x + 1, y + 1)
            ) {
                loc.typ = STONE;
            }
        }
    }
}

function wallificationRectLikeC(g, x1, y1, x2, y2) {
    wallCleanupRectLikeC(g, x1, y1, x2, y2);
    fixWallSpinesRect(g, x1, y1, x2, y2);
}

/**
 * C: teleport.c rloc — baalz pool→wall uses RLOC_ERR|RLOC_NOMSG (enexto only; no msg).
 * @param {import('./gstate.js').game} g
 * @param {object} mtmp
 */
function rlocBaalzErrNomsgLikeC(g, mtmp) {
    void (RLOC_ERR | RLOC_NOMSG);
    const ox = mtmp.mx | 0;
    const oy = mtmp.my | 0;
    if (!isok(ox, oy)) return;
    const dest = enextoNearMon(g, ox, oy, mtmp);
    if (!dest) return;
    const nx = dest.x | 0;
    const ny = dest.y | 0;
    if (nx === ox && ny === oy) return;
    mtmp.mx = nx;
    mtmp.my = ny;
    newsym(ox, oy);
    newsym(nx, ny);
}

/**
 * C: mkmaze.c baalz_fixup — no RNG.
 * @param {import('./gstate.js').game} g
 */
export function baalzFixupLikeC(g) {
    const map = g.level;
    if (!map) return;

    if (!g.bughack) {
        g.bughack = {
            inarea: { x1: COLNO, y1: ROWNO, x2: 0, y2: 0 },
            delarea: { x1: COLNO, y1: ROWNO, x2: 0, y2: 0 },
        };
    }
    const inarea = g.bughack.inarea;
    const delarea = g.bughack.delarea;

    let x;
    let y;
    let lastx;
    let lasty;

    y = Math.trunc(ROWNO / 2);
    lastx = 0;
    for (x = 0; x < COLNO; ++x) {
        const loc = map.at(x, y);
        if (loc && ((loc.wall_info | 0) & W_NONDIGGABLE) !== 0) {
            if (!lastx) inarea.x1 = x + 1;
            lastx = x;
        }
    }
    inarea.x2 = ((lastx > inarea.x1) ? lastx : x) - 1;

    x = inarea.x1;
    lasty = 0;
    for (y = 0; y < ROWNO; ++y) {
        const loc = map.at(x, y);
        if (loc && ((loc.wall_info | 0) & W_NONDIGGABLE) !== 0) {
            if (!lasty) inarea.y1 = y + 1;
            lasty = y;
        }
    }
    inarea.y2 = ((lasty > inarea.y1) ? lasty : y) - 1;

    for (x = inarea.x1; x <= inarea.x2; ++x) {
        for (y = inarea.y1; y <= inarea.y2; ++y) {
            const loc = map.at(x, y);
            if (!loc) continue;
            const typ = loc.typ | 0;
            if (typ === POOL) {
                loc.typ = HWALL;
                if (delarea.x1 === COLNO) {
                    delarea.x1 = x;
                    delarea.y1 = y;
                } else {
                    delarea.x2 = x;
                    delarea.y2 = y;
                }
            } else if (typ === IRONBARS) {
                if (isok(x - 1, y)) {
                    const w = map.at(x - 1, y);
                    if (w && ((w.wall_info | 0) & W_NONDIGGABLE) !== 0) {
                        w.wall_info = (w.wall_info | 0) & ~W_NONDIGGABLE;
                        if (isok(x - 2, y)) {
                            const w2 = map.at(x - 2, y);
                            if (w2) w2.wall_info = (w2.wall_info | 0) & ~W_NONDIGGABLE;
                        }
                    }
                } else if (isok(x + 1, y)) {
                    const w = map.at(x + 1, y);
                    if (w && ((w.wall_info | 0) & W_NONDIGGABLE) !== 0) {
                        w.wall_info = (w.wall_info | 0) & ~W_NONDIGGABLE;
                        if (isok(x + 2, y)) {
                            const w2 = map.at(x + 2, y);
                            if (w2) w2.wall_info = (w2.wall_info | 0) & ~W_NONDIGGABLE;
                        }
                    }
                }
            }
        }
    }

    const wx1 = Math.max(inarea.x1 - 2, 1);
    const wy1 = Math.max(inarea.y1 - 2, 0);
    const wx2 = Math.min(inarea.x2 + 2, COLNO - 1);
    const wy2 = Math.min(inarea.y2 + 2, ROWNO - 1);
    wallificationRectLikeC(g, wx1, wy1, wx2, wy2);

    x = delarea.x1;
    y = delarea.y1;
    if (isok(x, y)) {
        const loc = map.at(x, y);
        const below = map.at(x, y + 1);
        if (
            loc
            && ((loc.typ | 0) === TLWALL || (loc.typ | 0) === TRWALL)
            && below
            && (below.typ | 0) === TUWALL
        ) {
            loc.typ = (loc.typ | 0) === TLWALL ? BRCORNER : BLCORNER;
            below.typ = HWALL;
            const mtmp = mAtMonLikeC(g, x, y);
            if (mtmp) rlocBaalzErrNomsgLikeC(g, mtmp);
        }
    }

    x = delarea.x2;
    y = delarea.y2;
    if (isok(x, y)) {
        const loc = map.at(x, y);
        const above = map.at(x, y - 1);
        if (
            loc
            && ((loc.typ | 0) === TLWALL || (loc.typ | 0) === TRWALL)
            && above
            && (above.typ | 0) === TDWALL
        ) {
            loc.typ = (loc.typ | 0) === TLWALL ? TRCORNER : TLCORNER;
            above.typ = HWALL;
            const mtmp = mAtMonLikeC(g, x, y);
            if (mtmp) rlocBaalzErrNomsgLikeC(g, mtmp);
        }
    }

    inarea.x1 = delarea.x1 = COLNO;
    inarea.y1 = delarea.y1 = ROWNO;
    inarea.x2 = delarea.x2 = 0;
    inarea.y2 = delarea.y2 = 0;
}
