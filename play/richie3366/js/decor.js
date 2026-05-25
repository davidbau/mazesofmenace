// decor.js — Terrain feature narration at the hero’s square.
// C ref: pickup.c describe_decor(), invent.c dfeature_at(), stairs.c stairway_at / stairs_description()

import { game } from './gstate.js';
import { pline } from './display.js';
import {
    STONE,
    ICE,
    D_NODOOR,
    D_ISOPEN,
    D_BROKEN,
    TREE,
    IRONBARS,
    DRAWBRIDGE_DOWN,
    DBWALL,
    LADDER,
    IS_DOOR,
    IS_FOUNTAIN,
    IS_SINK,
    IS_ALTAR,
    IS_POOL,
    IS_LAVA,
    IS_FURNITURE,
    IS_THRONE,
    IS_GRAVE,
} from './const.js';

/** C: levl[x][y].typ as rm.h terrain. */
export function levlTypAt(x, y) {
    return game.level?.at(x, y)?.typ ?? STONE;
}

/**
 * C: stairs.c **`stairway_at(x,y)`** — **`gs.stairs`** chain then **`level.upstair`/`dnstair`**.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @returns {{ up: boolean, isladder: boolean, u_traversed: boolean, tolev?: { dnum: number, dlevel: number }|null } | null}
 */
export function stairwayAtInGame(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    for (let s = g.stairs; s; s = s.next) {
        if ((s.sx | 0) === xi && (s.sy | 0) === yi) {
            const tv = s.tolev;
            return {
                up: !!s.up,
                isladder: !!s.isladder,
                u_traversed: stairwayTraversedLikeC(g, s),
                tolev: tv && tv.dnum != null ? { dnum: tv.dnum | 0, dlevel: tv.dlevel | 0 } : null,
            };
        }
    }
    const L = g.level;
    if (!L) return null;
    if (L.upstair && L.upstair.x === xi && L.upstair.y === yi) {
        return {
            up: true,
            isladder: false,
            u_traversed: (g.u?.uz?.dnum | 0) === 0 && (g.u?.uz?.dlevel | 0) === 1,
            tolev: null,
        };
    }
    if (L.dnstair && L.dnstair.x === xi && L.dnstair.y === yi) {
        return { up: false, isladder: false, u_traversed: false, tolev: null };
    }
    return null;
}

/** C: stairs.c **`stairway_at`** — uses global **`game`**. */
export function stairwayAt(x, y) {
    return stairwayAtInGame(game, x, y);
}

/** C: mklev.c D:1 branch up stairs marked traversed when hero starts. */
function stairwayTraversedLikeC(g, s) {
    if (s.u_traversed) return true;
    return (g.u?.uz?.dnum | 0) === 0 && (g.u?.uz?.dlevel | 0) === 1 && !!s.up;
}

/**
 * C: stairs.c stairs_description() — subset for look_here / dolook on D:1 up stairs.
 * @param {import('./gstate.js').game} g
 * @param {{ up: boolean, isladder: boolean, u_traversed: boolean, tolev?: { dnum: number, dlevel: number }|null }} sway
 * @returns {string}
 */
export function stairsDescriptionLikeC(g, sway) {
    const stairs = sway.isladder ? 'ladder' : 'staircase';
    const updown = sway.up ? 'up' : 'down';
    const u = g.u;
    const uz = u?.uz;
    if (
        uz
        && (uz.dnum | 0) === 0
        && (uz.dlevel | 0) === 1
        && sway.up
        && sway.u_traversed
        && !g.uhave?.amulet
    ) {
        return `${stairs} ${updown} out of the dungeon`;
    }
    return `${stairs} ${updown}`;
}

/**
 * C: stairs.c **`stairway_find_from(d_level *fromdlev, boolean isladder)`**.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum: number, dlevel: number }} fromdlev
 * @param {boolean} isladder
 */
export function stairwayFindFromLikeC(g, fromdlev, isladder) {
    const dn = fromdlev.dnum | 0;
    const dl = fromdlev.dlevel | 0;
    const isl = !!isladder;
    for (let s = g.stairs; s; s = s.next) {
        const tv = s.tolev;
        if (!tv) continue;
        if ((tv.dnum | 0) === dn && (tv.dlevel | 0) === dl && !!s.isladder === isl) return s;
    }
    return null;
}

export function an(phrase) {
    if (!phrase) return phrase;
    const t = phrase.trim();
    if (!t) return phrase;
    const article = /^[aeiou]/i.test(t) ? 'an' : 'a';
    return `${article} ${phrase}`;
}

/**
 * C: invent.c look_here() article rules for "There is …" / describe_decor an().
 * @param {string|null|undefined} dfeature
 * @returns {string|null}
 */
export function formatDfeatureForThereIs(dfeature) {
    if (!dfeature) return null;
    if (dfeature === 'molten lava' || dfeature === 'ice' || dfeature === 'set of iron bars') return dfeature;
    if (String(dfeature).startsWith('frozen ')) return dfeature;
    return an(dfeature);
}

function upstart(s) {
    if (!s || typeof s !== 'string') return s;
    return s[0].toUpperCase() + s.slice(1);
}

/**
 * C: invent.c dfeature_at(x, y, buf) — strings worth mentioning (subset).
 * @returns {string|null}
 */
export function dfeatureAt(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return null;
    const t = loc.typ;

    if (IS_DOOR(t)) {
        const m = loc.doormask ?? 0;
        if (m === D_NODOOR) return 'doorway';
        if (m === D_ISOPEN) return 'open door';
        if (m === D_BROKEN) return 'broken door';
        return 'closed door';
    }
    if (IS_FOUNTAIN(t)) return 'fountain';
    if (IS_THRONE(t)) return 'opulent throne';
    if (IS_LAVA(t)) return 'molten lava';
    if (t === ICE) {
        /* C: ice_descr(x,y) — stub until ice_descr.c */
        return 'ice';
    }
    if (IS_POOL(t)) return 'pool of water';
    if (IS_SINK(t)) return 'sink';
    if (IS_ALTAR(t)) return 'altar';

    const st = stairwayAt(x, y);
    if (st) {
        return stairsDescriptionLikeC(game, st);
    }
    if (t === DRAWBRIDGE_DOWN) return 'lowered drawbridge';
    if (t === DBWALL) return 'raised drawbridge';
    if (IS_GRAVE(t)) return 'grave';
    if (t === TREE) return 'tree';
    if (t === IRONBARS) return 'set of iron bars';
    if (t === LADDER) return 'ladder';

    return null;
}

/**
 * C: pickup.c describe_decor() — pline notable dungeon feature; updates iflags.prev_decor.
 * @returns {Promise<boolean>} C `res` (whether something was described this call)
 */
export async function describeDecor() {
    const g = game;
    const u = g.u;
    if (!u) return false;

    const ltyp = levlTypAt(u.ux, u.uy);
    const prev = g.iflags?.prev_decor ?? STONE;
    const dfeature = dfeatureAt(u.ux, u.uy);
    let res = true;

    if (ltyp === prev && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature && !u.ublind) {
        let d = dfeature;
        const waterhere = d === 'pool of water';
        if (waterhere) {
            /* C: waterbody_name(u.ux, u.uy) — pool vs moat; stub keeps "pool of water" */
        }
        if (d !== 'swamp' && ltyp !== ICE) d = formatDfeatureForThereIs(d) ?? d;

        const verbose = !!g.flags?.verbose;
        const out = verbose ? `There is ${d} here.` : `${upstart(d)}.`;
        /* C: ICE + mention_decor uses Norep; contest stub uses pline */
        await pline(out);
    } else if (!u.underwater) {
        /* C: back_on_ground when leaving pool/lava/ice — port with iflags.last_msg when needed */
    }

    g.iflags = g.iflags || {};
    /* C: pickup.c:424 — prev_decor tracks surface for next describe_decor */
    g.iflags.prev_decor = g.flags?.mention_decor ? ltyp : STONE;
    return res;
}
