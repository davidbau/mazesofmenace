// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers; mkroom.c inside_room(); hack.c in_town()

import { game } from './gstate.js';
import { ROOMOFFSET } from './const.js';
import { rnd } from './rng.js';

export function isok(x, y) {
    const { COLNO, ROWNO } = await_const();
    return x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1;
}

// Lazy import to avoid circular deps
let _const = null;
function await_const() {
    if (!_const) _const = { COLNO: 80, ROWNO: 21 };
    return _const;
}

export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

/**
 * C: mkroom.c inside_room(struct mkroom *croom, coordxy x, coordxy y)
 * @param {import('./gstate.js').game} g
 * @param {{ lx?: number, hx?: number, ly?: number, hy?: number, irregular?: number, roomnoidx?: number }} croom
 */
export function insideRoomLikeC(g, croom, x, y) {
    if (!croom) return false;
    const xi = x | 0;
    const yi = y | 0;
    if (croom.irregular) {
        const i = (croom.roomnoidx | 0) + ROOMOFFSET;
        const loc = g.level?.at(xi, yi);
        return !!(loc && !loc.edge && (loc.roomno | 0) === i);
    }
    const lx = croom.lx | 0;
    const hx = croom.hx | 0;
    const ly = croom.ly | 0;
    const hy = croom.hy | 0;
    return xi >= lx - 1 && xi <= hx + 1 && yi >= ly - 1 && yi <= hy + 1;
}

/**
 * C: hack.c in_town(coordxy x, coordxy y) — needs **`level.flags.has_town`** (e.g. minetown).
 * @param {import('./gstate.js').game} g
 */
export function inTownLikeC(g, x, y) {
    if (!g.level?.flags?.has_town) return false;
    const rooms = g.level.rooms;
    if (!rooms?.length) return false;
    let hasSubrooms = false;
    for (let ri = 0; ri < rooms.length; ri++) {
        const sroom = rooms[ri];
        if (!sroom || (sroom.hx | 0) <= 0) break;
        if ((sroom.nsubrooms | 0) > 0) {
            hasSubrooms = true;
            if (insideRoomLikeC(g, sroom, x, y)) return true;
        }
    }
    return !hasSubrooms;
}

export function depth(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const dungeon = game?.dungeons?.[dnum];
    if (!dungeon) return dlevel;
    const ds = dungeon.depth_start;
    return (ds != null ? (ds | 0) : 0) + dlevel - 1;
}

/** C: dungeon.c on_level(d_level *a, d_level *b) */
export function onLevelLikeC(lev1, lev2) {
    if (!lev1 || !lev2) return false;
    return (lev1.dnum | 0) === (lev2.dnum | 0) && (lev1.dlevel | 0) === (lev2.dlevel | 0);
}

/** C: dungeon.h `dunlev(lev)` — branch-local dlevel index. */
export function dunlevLikeC(uz) {
    return uz?.dlevel ?? 1;
}

/** C: dungeon.c `dunlevs_in_dungeon(lev)` — `dungeons[dnum].num_dunlevs`. */
export function dunlevsInDungeonLikeC(uz) {
    const dnum = uz?.dnum ?? 0;
    const n = game?.dungeons?.[dnum]?.num_dunlevs;
    return n != null ? (n | 0) : 1;
}

/** C: dungeon.c `assign_level(dest, src)`. */
export function assignLevelLikeC(dest, src) {
    dest.dnum = src.dnum | 0;
    dest.dlevel = src.dlevel | 0;
}

/** C: dungeon.c `assign_rnd_level(dest, src, range)` — `dest = src + rn1(|range|)`. */
export function assignRndLevelLikeC(dest, src, range) {
    dest.dnum = src.dnum | 0;
    const r = range | 0;
    dest.dlevel = (src.dlevel | 0) + (r > 0 ? rnd(r) : -rnd(-r));
    const max = dunlevsInDungeonLikeC(dest);
    if (dest.dlevel > max) dest.dlevel = max;
    else if (dest.dlevel < 1) dest.dlevel = 1;
}

/**
 * C: hacklib.c mungspaces(char *bp) — collapse runs of spaces to one, strip
 * leading spaces, strip one trailing space if the string ends in space.
 * Stops at the first newline (status lines are single-line in practice).
 */
export function mungspacesLikeC(s) {
    const src = String(s ?? '');
    let out = '';
    let wasSpace = true;
    for (let i = 0; i < src.length; i++) {
        let c = src[i];
        if (c === '\n') break;
        if (c === '\t') c = ' ';
        if (c !== ' ' || !wasSpace) out += c;
        wasSpace = c === ' ';
    }
    if (wasSpace && out.length > 0) out = out.slice(0, -1);
    return out;
}

// C ref: rn2(x) already in rng.js — re-export not needed
