// light.js — C ref: light.c light_source list + do_light_sources.
// Monster emitters only this iteration (object/camera flash deferred).

import { game } from './gstate.js';
import {
    COLNO, ROWNO, MAX_RADIUS, LS_MONSTER, TEMP_LIT,
} from './const.js';
import { clear_path } from './vision.js';
import { monsterNames } from './monsters.js';

function pm(name) {
    return monsterNames.indexOf(`PM_${name}`);
}

const COULD_SEE = 0x1; // vision.js — avoid circular const export

// C ref: mondata.h emits_light — range 1 for all current emitters.
export function emits_light(ptr) {
    if (!ptr) return 0;
    const mndx = ptr.mndx | 0;
    if (ptr.mlet === 'S_LIGHT'
        || mndx === pm('FLAMING_SPHERE')
        || mndx === pm('SHOCKING_SPHERE')
        || mndx === pm('BABY_GOLD_DRAGON')
        || mndx === pm('FIRE_VORTEX')
        || mndx === pm('FIRE_ELEMENTAL')
        || mndx === pm('GOLD_DRAGON')) {
        return 1;
    }
    return 0;
}

/** C ref: light.c new_light_source — LS_MONSTER subset. */
export function new_light_source(x, y, range, type, id) {
    if (range > MAX_RADIUS || range < 0) return null;
    if (!game.light_base) game.light_base = [];
    const ls = {
        x: x | 0,
        y: y | 0,
        range: range | 0,
        type,
        id, // monst ref for LS_MONSTER
        flags: 0,
    };
    game.light_base.push(ls);
    game.vision_full_recalc = 1;
    return ls;
}

/** C ref: light.c del_light_source — LS_MONSTER by monst identity. */
export function del_light_source(type, id) {
    const list = game.light_base;
    if (!list?.length) return;
    const idx = list.findIndex((ls) => ls.type === type && ls.id === id);
    if (idx >= 0) {
        list.splice(idx, 1);
        game.vision_full_recalc = 1;
    }
}

/** Drop all lights (level leave). */
export function clear_light_sources() {
    game.light_base = [];
}

/**
 * Re-attach LS_MONSTER lights after getlev (stash omits light_base).
 * C rest_regions/rest lights deferred — rebuild from fmon emitters.
 */
export function relight_monsters() {
    clear_light_sources();
    const fmon = game.fmon;
    if (!fmon) return;
    for (const mtmp of fmon) {
        if (!mtmp || mtmp.mx <= 0) continue;
        const ct = emits_light(mtmp.data);
        if (ct > 0) new_light_source(mtmp.mx, mtmp.my, ct, LS_MONSTER, mtmp);
    }
}

/**
 * C ref: light.c do_light_sources — mark TEMP_LIT in cs_rows.
 * Named omissions: LS_OBJECT; LSF_NEEDS_FIXUP; hero-duplicate range trim.
 */
export function do_light_sources(cs_rows) {
    const list = game.light_base;
    if (!list?.length || !cs_rows) return;

    // circle_ptr(1) → offsets [1,1] for dy 0..1 (C vision.c circle_data)
    // range 1: row±0 → x±1; row±1 → x±1
    for (const ls of list) {
        if (ls.type === LS_MONSTER) {
            const m = ls.id;
            if (!m || m.mx <= 0) continue;
            ls.x = m.mx | 0;
            ls.y = m.my | 0;
        } else {
            continue; // object lights deferred
        }
        const range = ls.range | 0;
        if (range < 1) continue;

        let max_y = ls.y + range;
        if (max_y >= ROWNO) max_y = ROWNO - 1;
        let y = ls.y - range;
        if (y < 0) y = 0;
        for (; y <= max_y; y++) {
            const row = cs_rows[y];
            if (!row) continue;
            // C circle_ptr(range)[abs(y-ls.y)] for range 1 is 1
            const offset = range; // range===1 only for now
            let min_x = ls.x - offset;
            if (min_x < 1) min_x = 1;
            let max_x = ls.x + offset;
            if (max_x >= COLNO) max_x = COLNO - 1;
            const ux = game.u?.ux | 0;
            const uy = game.u?.uy | 0;
            const at_hero = ls.x === ux && ls.y === uy;
            for (let x = min_x; x <= max_x; x++) {
                if (at_hero) {
                    if (row[x] & COULD_SEE) row[x] |= TEMP_LIT;
                } else if ((ls.x === x && ls.y === y)
                    || clear_path(ls.x, ls.y, x, y)) {
                    row[x] |= TEMP_LIT;
                }
            }
        }
    }
}
