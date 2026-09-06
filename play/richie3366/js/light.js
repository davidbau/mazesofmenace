// light.js — C ref: light.c light_source list + do_light_sources.
// LS_MONSTER + LS_OBJECT (lamps/candles via begin_burn);
// camera flash range 0 + show_transient_light / transient_light_cleanup (D-1597);
// obj_sheds_light / obj_is_burning (D-1743; caller mkobj.c dealloc_obj).

import { game } from './gstate.js';
import {
    COLNO, ROWNO, MAX_RADIUS, LS_MONSTER, LS_OBJECT, TEMP_LIT,
    OBJ_INVENT, OBJ_FLOOR, OBJ_MINVENT, OBJ_FREE,
} from './const.js';
import { clear_path, vision_recalc } from './vision.js';
import {
    canseemon, canspotmon, map_invisible, flush_screen, nh_delay_output,
    impossible,
} from './display.js';
import { dist2 } from './hacklib.js';
import { place_object, obj_extract_self } from './mkobj.js';
import { simpleonames, otense, xname } from './objnam.js';
import { monsterNames } from './monsters.js';
import { ignitable, artifact_light } from './timeout.js';

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

/**
 * C ref: light.c new_light_core :68–94 — camera flash is range 0 +
 * LS_OBJECT + Null obj; other range 0 is illegal.
 */
function new_light_core(x, y, range, type, id) {
    if (range > MAX_RADIUS || range < 0
        || (range === 0 && (type !== LS_OBJECT || id))) {
        return null;
    }
    if (!game.light_base) game.light_base = [];
    const ls = {
        x: x | 0,
        y: y | 0,
        range: range | 0,
        type,
        id, // monst (LS_MONSTER) or obj (LS_OBJECT); Null for camera
        flags: 0,
    };
    game.light_base.push(ls);
    game.vision_full_recalc = 1;
    return ls;
}

/** C ref: light.c new_light_source — LS_MONSTER / LS_OBJECT. */
export function new_light_source(x, y, range, type, id) {
    return new_light_core(x, y, range, type, id);
}

/** C ref: light.c del_light_source — by type + id identity. */
export function del_light_source(type, id) {
    const list = game.light_base;
    if (!list?.length) return;
    const idx = list.findIndex((ls) => ls.type === type && ls.id === id);
    if (idx >= 0) {
        list.splice(idx, 1);
        game.vision_full_recalc = 1;
    }
}

/**
 * C ref: light.c obj_adjust_light_radius `:825–838` — light source `obj`
 * is being made brighter or dimmer. Linear scan of `game.light_base`
 * (C `gl.light_base` list); first LS_OBJECT entry with pointer-identical
 * id wins (C assumes one source per object); sets
 * `game.vision_full_recalc` only when the range actually changes
 * (C `gv.vision_full_recalc`), then returns. Falls through to
 * `impossible(xname(obj))` when no entry matches (async pline in JS,
 * hence async). `| 0` int idiom on the range compare/assign.
 * Caller mkobj.c maybe_adjust_light stays named (bless/curse wiring).
 */
export async function obj_adjust_light_radius(obj, new_radius) {
    const nr = new_radius | 0;
    const list = game.light_base;
    if (list) {
        for (const ls of list) {
            if (ls.type === LS_OBJECT && ls.id === obj) {
                if (nr !== (ls.range | 0)) game.vision_full_recalc = 1;
                ls.range = nr;
                return;
            }
        }
    }
    await impossible(`obj_adjust_light_radius: can't find ${xname(obj)}`);
}

/**
 * C ref: light.c obj_is_burning `:770–775` — lamplit && (ignitable
 * || artifact_light). Callees timeout.js ignitable / artifact_light
 * (C obj.h / artifact.c).
 */
export function obj_is_burning(obj) {
    return !!(obj && obj.lamplit && (ignitable(obj) || artifact_light(obj)));
}

/**
 * C ref: light.c obj_sheds_light `:762–767` — so far only burning
 * objects. Caller mkobj.c dealloc_obj (D-1743).
 */
export function obj_sheds_light(obj) {
    return obj_is_burning(obj);
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
 * Camera flash: range 0 + Null obj, caller already set ls.{x,y} (D-1597).
 * Named omissions: LSF_NEEDS_FIXUP; circle_ptr exact ring; hero range trim.
 */
export function do_light_sources(cs_rows) {
    const list = game.light_base;
    if (!list?.length || !cs_rows) return;

    // Approximate circle as square of side 2*range (circle_ptr deferred).
    for (const ls of list) {
        if (ls.type === LS_MONSTER) {
            const m = ls.id;
            if (!m || m.mx <= 0) continue;
            ls.x = m.mx | 0;
            ls.y = m.my | 0;
        } else if (ls.type === LS_OBJECT) {
            // C: range==0 camera flash short-circuits get_obj_location
            // (Null a_obj). Thrown lamp is placed on the floor first.
            if ((ls.range | 0) !== 0) {
                const obj = ls.id;
                if (!obj?.lamplit) continue;
                if (obj.where === OBJ_INVENT
                    || (game.invent || []).includes(obj)) {
                    ls.x = game.u?.ux | 0;
                    ls.y = game.u?.uy | 0;
                } else if (obj.where === OBJ_FLOOR) {
                    ls.x = obj.ox | 0;
                    ls.y = obj.oy | 0;
                } else if (obj.where === OBJ_MINVENT && obj.ocarry) {
                    ls.x = obj.ocarry.mx | 0;
                    ls.y = obj.ocarry.my | 0;
                } else {
                    continue;
                }
            }
        } else {
            continue;
        }
        const range = ls.range | 0;
        if (range < 0) continue;

        let max_y = ls.y + range;
        if (max_y >= ROWNO) max_y = ROWNO - 1;
        let y = ls.y - range;
        if (y < 0) y = 0;
        for (; y <= max_y; y++) {
            const row = cs_rows[y];
            if (!row) continue;
            const offset = range;
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

/**
 * C ref: light.c show_transient_light :255–324.
 * Null obj = camera flash (range 0); else thrown/kicked lamplit object.
 * Callers: zap.c bhit thrown/kicked + FLASHED_LIGHT; minion.c msummon
 * S_ANGEL. Named omit: worm tails.
 */
export async function show_transient_light(obj, x, y) {
    let ls = null;
    if (!obj) {
        /* no need to temporarily light an already lit spot */
        if (game.level?.at?.(x, y)?.lit) return;
        ls = new_light_core(x, y, 0, LS_OBJECT, null);
        if (!ls) return;
    } else {
        const list = game.light_base;
        if (list) {
            for (const cand of list) {
                if (cand.type !== LS_OBJECT) continue;
                if (cand.id === obj) {
                    ls = cand;
                    break;
                }
            }
        }
        if (!ls || obj.where !== OBJ_FREE) {
            await impossible(
                `transient light ${obj.lamplit ? 'lit' : 'unlit'} `
                + `${simpleonames(obj)} ${otense(obj, 'are')} not `
                + `${!ls ? 'a light source' : 'free'}?`,
            );
            return;
        }
    }

    if (obj) {
        const bp = game.bhitpos || game._bhitpos || { x, y };
        place_object(obj, bp.x | 0, bp.y | 0);
    } else {
        ls.x = x | 0;
        ls.y = y | 0;
    }

    vision_recalc(0);
    await flush_screen(0);

    const radius_squared = (ls.range | 0) * (ls.range | 0);
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) < 1 || (mon.isgd && !(mon.mx | 0))) continue;
        if (dist2(mon.mx | 0, mon.my | 0, x | 0, y | 0) <= radius_squared) {
            if (canseemon(mon)) mon.mtemplit = 1;
        }
    }

    if (obj) {
        await nh_delay_output();
        obj_extract_self(obj);
    }
}

/** C ref: light.c discard_flashes :360–370 — LS_OBJECT with Null id. */
export function discard_flashes() {
    const list = game.light_base;
    if (!list?.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
        const ls = list[i];
        if (ls.type === LS_OBJECT && !ls.id) {
            list.splice(i, 1);
            game.vision_full_recalc = 1;
        }
    }
}

/**
 * C ref: light.c transient_light_cleanup :327–357.
 * Camera flashes are discarded; mtemplit mons that are no longer
 * spottable become remembered-unseen ('I'). Callers: apply.c
 * do_blinding_ray; zap.c bhit thrown/kicked; minion.c msummon.
 */
export async function transient_light_cleanup() {
    discard_flashes();
    if (game.vision_full_recalc) vision_recalc(0);

    let mtempcount = 0;
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) < 1) continue;
        if (mon.mtemplit) {
            mon.mtemplit = 0;
            mtempcount++;
            if (!canspotmon(mon)) map_invisible(mon.mx, mon.my);
        }
    }
    if (mtempcount) await flush_screen(0);
}
