// wall_spine.js — C mkmap.c fix_wall_spines() subset for runtime terrain edits.
// C ref: mkmap.c fix_wall_spines(); used by zap.c zap_over_floor (lavawall→wall) and mklev wallification.

import {
    STONE,
    VWALL,
    HWALL,
    TLCORNER,
    TRCORNER,
    BLCORNER,
    BRCORNER,
    CROSSWALL,
    TUWALL,
    TDWALL,
    TLWALL,
    TRWALL,
    IS_WALL,
    IS_DOOR,
    SDOOR,
    IRONBARS,
    WATER,
    LAVAWALL,
    DBWALL,
    isok,
} from './const.js';

const spineArray = [
    VWALL, HWALL, HWALL, HWALL,
    VWALL, TRCORNER, TLCORNER, TDWALL,
    VWALL, BRCORNER, BLCORNER, TUWALL,
    VWALL, TLWALL, TRWALL, CROSSWALL,
];

/**
 * @param {import('./gstate.js').game} g
 */
function isWallTileSpine(g, x, y) {
    if (!isok(x, y)) return 0;
    const typ = g.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}

/**
 * @param {import('./gstate.js').game} g
 */
function isWallOrStoneSpine(g, x, y) {
    if (!isok(x, y)) return 1;
    const typ = g.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || isWallTileSpine(g, x, y)) ? 1 : 0;
}

/** C: mkmap.c extend_spine */
function extendSpine(locale, wallThere, dx, dy) {
    const nx = 1 + dx;
    const ny = 1 + dy;
    if (!wallThere) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}

/**
 * C: mkmap.c fix_wall_spines(x1,y1,x2,y2) — refresh wall/corner glyphs in rectangle.
 * @param {import('./gstate.js').game} g
 */
export function fixWallSpinesRect(g, x1, y1, x2, y2) {
    const map = g.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            const typ = loc.typ | 0;
            if (!IS_WALL(typ) || typ === DBWALL) continue;
            const locale = [
                [isWallOrStoneSpine(g, x - 1, y - 1), isWallOrStoneSpine(g, x - 1, y), isWallOrStoneSpine(g, x - 1, y + 1)],
                [isWallOrStoneSpine(g, x, y - 1), 0, isWallOrStoneSpine(g, x, y + 1)],
                [isWallOrStoneSpine(g, x + 1, y - 1), isWallOrStoneSpine(g, x + 1, y), isWallOrStoneSpine(g, x + 1, y + 1)],
            ];
            const bits = (extendSpine(locale, isWallTileSpine(g, x, y - 1), 0, -1) << 3)
                | (extendSpine(locale, isWallTileSpine(g, x, y + 1), 0, 1) << 2)
                | (extendSpine(locale, isWallTileSpine(g, x + 1, y), 1, 0) << 1)
                | extendSpine(locale, isWallTileSpine(g, x - 1, y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
    }
}
