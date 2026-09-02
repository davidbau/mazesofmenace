// light.js — mobile light sources.
// C ref: src/light.c
//
// Light sources are "things" that have a physical position and range,
// attached to objects and monsters. do_light_sources() runs during every
// vision recalc and stamps TEMP_LIT into the could-see array for squares a
// source lights; vision_recalc() then treats those squares as lit. Nothing
// here draws RNG.
//
// Representation: C's light_source.id is an anything-union POINTER fixed up
// across save/restore (LSF_NEEDS_FIXUP). This port stores the owner's id
// NUMBER (monster m_id / object o_id) and re-resolves it against the current
// level on every do_light_sources() pass — the same "recalculate everything,
// remember nothing" contract the C file documents, in a form the snapshot
// serializer can round-trip without pointer fixups.

import { artifact_light } from './artifact.js';
import { game } from './gstate.js';
import { COLNO, ROWNO, OBJ_FREE } from './const.js';
import { ONAMES } from './objects_data.js';
/* imported from vision.c, for small circles (src/light.c:56) */
import { circle_ptr, clear_path, COULD_SEE, TEMP_LIT } from './vision.js';

// include/vision.h:15 enum ls_sources
export const LS_NONE = 0, LS_OBJECT = 1, LS_MONSTER = 2;

// include/vision.h:59
export const MAX_RADIUS = 15;

// src/light.c:41 flags
const LSF_SHOW = 0x1; /* display the light source */

function note_unported_light(what) {
    (game.unported ||= new Set()).add('light:' + what);
}

function lights() {
    return (game.light_sources ||= []);
}

// src/light.c:63 new_light_source() — caller passes the owner's id number.
export function new_light_source(x, y, range, type, id) {
    if (range > MAX_RADIUS || range < 0
        || (range === 0 && (type !== LS_OBJECT || id))) {
        /* impossible("new_light_source: illegal range %d", range) */
        return;
    }
    lights().push({ x, y, range, flags: 0, type, id });
}

// src/light.c:117 del_light_source() — find the (type, id) source and unlink
// it. C impossible()s when it is missing; the port stays quiet because the
// makemon arm that would have created it may predate this file in old saves.
export function del_light_source(type, id) {
    const ls = lights();
    const i = ls.findIndex((s) => s.type === type && s.id === id);
    if (i >= 0)
        ls.splice(i, 1);
}

// src/light.c:826 obj_adjust_light_radius() — an artifact's light changed
// intensity (blessed/cursed state changed).
export function obj_adjust_light_radius(obj, new_radius) {
    for (const ls of lights()) {
        if (ls.type === LS_OBJECT && ls.id === obj.o_id) {
            if (new_radius !== ls.range)
                game.vision_full_recalc = 1;
            ls.range = new_radius;
            return;
        }
    }
    /* impossible("obj_adjust_light_radius: can't find %s", xname(obj)) */
}

// src/light.c:881 arti_light_radius() — light radius emitted by a lit
// artifact (or gold dragon armor): 3 blessed, 2 uncursed, 1 cursed.
export function arti_light_radius(obj) {
    let res;

    /*
     * Used by begin_burn() when setting up a new light source
     * (obj->lamplit will already be set by this point) and
     * also by bless()/unbless()/uncurse()/curse() to adjust
     * the light radius if the artifact is already lit.
     */
    if (!obj.lamplit || !artifact_light(obj))
        return 0;

    /* it's an emitting artifact; radius depends on its curse/bless state */
    res = (obj.blessed ? 3 : !obj.cursed ? 2 : 1);
    /* hero is wearing gold dragon scales? (embedded gold dragon scales
       have minimum radiance; hero as light source will use light radius
       based on monster form); otherwise, worn gold DSM gives off more
       light than other light sources */
    if (obj === game.u.uskin)
        res = 1;
    else if (obj.otyp === ONAMES.GOLD_DRAGON_SCALE_MAIL) /* DSM but not scales */
        ++res;
    return res;
}

// src/mon.c:377 get_mon_location() (the ls resolution arm) — a monster still
// on the map. Resolves the id against the current level.
function light_mon_location(id) {
    for (const m of (game.level?.monsters || []))
        if (m.m_id === id && m.mx > 0 && m.mhp > 0)
            return m;
    return null;
}

// src/mkobj.c get_obj_location(..., CONTAINED_TOO|BURIED_TOO) — where a lit
// object is: on the floor, in hero inventory, carried by a monster, or
// inside a container at any of those places.
function light_obj_location(id) {
    const seen = new Set();
    const from_list = (list, x, y) => {
        for (const o of (list || [])) {
            if (o.o_id === id)
                return { x: x ?? o.ox, y: y ?? o.oy };
            if (o.cobj && !seen.has(o)) {
                seen.add(o);
                const r = from_list(o.cobj, x ?? o.ox, y ?? o.oy);
                if (r) return r;
            }
        }
        return null;
    };
    let r = from_list(game.level?.objects);
    if (r) return r;
    r = from_list(game.invent, game.u?.ux, game.u?.uy);
    if (r) return r;
    for (const m of (game.level?.monsters || [])) {
        r = from_list(m.minvent, m.mx, m.my);
        if (r) return r;
    }
    return null;
}

// src/light.c:169 do_light_sources() — set TEMP_LIT in the vision system's
// next-array for every location lit by a source.
export function do_light_sources(cs_rows) {
    const u = game.u;
    let at_hero_range = 0;

    for (const ls of lights()) {
        ls.flags &= ~LSF_SHOW;

        /* Check for moved light sources. */
        if (ls.type === LS_OBJECT) {
            if (ls.range === 0) {
                /* camera flash; caller has set ls.x/y */
                ls.flags |= LSF_SHOW;
            } else {
                const loc = light_obj_location(ls.id);
                if (loc) {
                    ls.x = loc.x;
                    ls.y = loc.y;
                    ls.flags |= LSF_SHOW;
                }
            }
        } else if (ls.type === LS_MONSTER) {
            const mon = light_mon_location(ls.id);
            if (mon) {
                ls.x = mon.mx;
                ls.y = mon.my;
                ls.flags |= LSF_SHOW;
            }
        }

        /* minor optimization: don't bother with duplicate light sources
           at hero */
        if (u && ls.x === u.ux && ls.y === u.uy) {
            if (at_hero_range >= ls.range)
                ls.flags &= ~LSF_SHOW;
            else
                at_hero_range = ls.range;
        }

        if (ls.flags & LSF_SHOW) {
            /* Walk the points in the circle and see if they are visible
               from the center. If so, mark'em. */
            const limits = circle_ptr(ls.range);
            let max_y = ls.y + ls.range;
            if (max_y >= ROWNO)
                max_y = ROWNO - 1;
            let y = ls.y - ls.range;
            if (y < 0)
                y = 0;
            for (; y <= max_y; y++) {
                const row = cs_rows[y];
                const offset = limits[Math.abs(y - ls.y)];
                let min_x = ls.x - offset;
                if (min_x < 1)
                    min_x = 1;
                let max_x = ls.x + offset;
                if (max_x >= COLNO)
                    max_x = COLNO - 1;

                if (u && ls.x === u.ux && ls.y === u.uy) {
                    /* If the light source is at the hero, use the
                       COULD_SEE bits already calculated by the vision
                       system (it corrects clear_path()'s rough edges). */
                    for (let x = min_x; x <= max_x; x++)
                        if (row[x] & COULD_SEE)
                            row[x] |= TEMP_LIT;
                } else {
                    for (let x = min_x; x <= max_x; x++)
                        if ((ls.x === x && ls.y === y)
                            || clear_path(ls.x, ls.y, x, y))
                            row[x] |= TEMP_LIT;
                }
            }
        }
    }
}

// src/light.c:262 show_transient_light(). A thrown lit object is temporarily
// put on the floor so the ordinary mobile-light resolver follows it. The
// vision pass maps terrain and monsters revealed during that instant, then
// the object returns to OBJ_FREE while its flight continues.
export async function show_transient_light(obj, x, y) {
    if (!obj) {
        note_unported_light('show_transient_light:camera_flash');
        return;
    }

    const source = lights().find((ls) =>
        ls.type === LS_OBJECT && ls.id === obj.o_id);
    if (!source || obj.where !== OBJ_FREE) {
        note_unported_light('show_transient_light:invalid-object');
        return;
    }

    const [{ place_object }, { obj_extract_self },
           { vision_recalc }, { canseemon, flush_screen }] =
        await Promise.all([
            import('./mkobj.js'), import('./invent.js'),
            import('./vision.js'), import('./display.js'),
        ]);

    place_object(obj, game.bhitpos?.x ?? x, game.bhitpos?.y ?? y);
    vision_recalc(0);
    await flush_screen(0);

    const radiusSquared = source.range * source.range;
    for (const mon of (game.level?.monsters || [])) {
        if ((mon.mhp | 0) <= 0 || (mon.isgd && !mon.mx))
            continue;
        const dx = mon.mx - x, dy = mon.my - y;
        if (dx * dx + dy * dy <= radiusSquared && canseemon(mon))
            mon.mtemplit = 1;
    }

    if (game.animationFrame)
        await game.animationFrame();
    obj_extract_self(obj);
}

// src/light.c:331 transient_light_cleanup(). A light deleted during a
// projectile effect requests a full vision pass. Monsters which were only
// visible in the moving light become remembered invisible-monster markers.
export async function transient_light_cleanup() {
    const { vision_recalc } = await import('./vision.js');
    const { canspotmon, map_invisible, flush_screen } =
        await import('./display.js');

    if (game.vision_full_recalc)
        vision_recalc(0);

    let changed = false;
    for (const mon of (game.level?.monsters || [])) {
        if ((mon.mhp | 0) <= 0 || !mon.mtemplit)
            continue;
        mon.mtemplit = 0;
        if (!canspotmon(mon)) {
            map_invisible(mon.mx, mon.my);
            changed = true;
        }
    }
    if (changed)
        await flush_screen(0);
}

// src/light.c:648 any_light_source()
export function any_light_source(type = null) {
    const sources = lights();
    return type == null ? sources.length > 0
                        : sources.some((source) => source.type === type);
}

// src/light.c:657 snuff_light_source() — extinguish a burning object at
// x,y (fire traps, blessed-book blasts). Needs begin/end_burn; recorded
// until burn timers land.
export function snuff_light_source(x, y) {
    note_unported_light('snuff_light_source');
}

// src/light.c:766 obj_sheds_light() / :776 obj_is_burning() — an object
// lights its surroundings while it burns. Burn timers (begin_burn /
// end_burn, src/timeout.c:2266+) are not ported, so no object source is
// ever created yet; these exist for their callers' shape.
export function obj_sheds_light(obj) {
    return obj_is_burning(obj);
}

export function obj_is_burning(obj) {
    return !!(obj && obj.lamplit);
}

// src/light.c:779 obj_split_light_source(). Copy the source entry to the
// split object and resize both candle sources for their new stack sizes.
export function obj_split_light_source(src, dest) {
    const sources = lights();
    const original = [...sources];
    for (const source of original) {
        if (source.type !== LS_OBJECT || source.id !== src.o_id)
            continue;

        const copy = { ...source, id: dest.o_id };
        if (src.otyp === ONAMES.TALLOW_CANDLE
            || src.otyp === ONAMES.WAX_CANDLE) {
            const radius = (obj) => {
                let value = 1;
                while (value * value <= obj.quan && value < MAX_RADIUS)
                    value++;
                return value;
            };
            source.range = radius(src);
            copy.range = radius(dest);
            game.vision_full_recalc = 1;
        }
        sources.unshift(copy);
        dest.lamplit = 1;
    }
}
