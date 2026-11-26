// light.js -- mobile light sources.
// C ref: light.c
//
// Ported: new_light_source(), del_light_source(), delete_ls(),
// do_light_sources(), save/restore/relink_light_sources(),
// obj_move_light_source(), any_light_source(), snuff_light_source(),
// obj_sheds_light(), obj_is_burning(), obj_split_light_source(),
// obj_merge_light_sources(), obj_adjust_light_radius(),
// candle_light_range().
//
// The list is C's: one global chain (game.light_base) of light_source
// { next, x, y, range, type, id, flags }, where 'id' is C's anything union
// ({ a_obj } or { a_monst }).

import { game } from './gstate.js';
import { Sfo, Sfi } from './sfbase.js';
import { LS_OBJECT, LS_MONSTER, RANGE_LEVEL, COUNTING, WRITING, FREEING,
         TEMP_LIT, COLNO, ROWNO, MAX_RADIUS } from './const.js';
import { objects, CANDELABRUM_OF_INVOCATION, TALLOW_CANDLE, WAX_CANDLE,
         POT_OIL, BRASS_LANTERN, OIL_LAMP, MAGIC_LAMP } from './objects.js';
import { obj_is_local, mon_is_local, end_burn } from './timeout.js';
import { get_mon_location } from './zap.js';
import { get_obj_location } from './shk.js';
import { clear_path, circle_data, circle_start, COULD_SEE } from './vision.js';
import { GOLD_DRAGON_SCALE_MAIL } from './objects.js';
import { artifact_light } from './artifact.js';
import { vision_recalc } from './vision.js';
import { flush_screen, canseemon, canspotmon, map_invisible } from './display.js';
import { dist2 } from './hacklib.js';
import { place_object, obj_extract_self } from './mkobj.js';
import { impossible } from './hack.js';
import { otense } from './objnam.js';
import { simpleonames } from './iactions.js';

/* flags */
const LSF_SHOW = 0x1;           /* display the light source */
const LSF_NEEDS_FIXUP = 0x2;    /* need oid fixup */

const MAX_RADIUS_LS = MAX_RADIUS; /* vision.h: max light radius */

// C ref: light.c new_light_source()
/* Create a new light source.  Caller (and extern.h) doesn't need to know
   anything about type 'light_source'. */
export function new_light_source(x, y, range, type, id) {
    new_light_core(x, y, range, type, id);
}

// C ref: light.c new_light_core()
/* Create a new light source and return it.  Only used within this file. */
function new_light_core(x, y, range, type, id) {
    if (range > MAX_RADIUS_LS || range < 0
        /* camera flash uses radius 0 and passes Null object */
        || (range === 0 && (type !== LS_OBJECT || id.a_obj))) {
        /* impossible("new_light_source:  illegal range %d", range) */
        console.error(`impossible: new_light_source:  illegal range ${range}`);
        return null;
    }

    const ls = {
        next: game.light_base || null,
        x,
        y,
        range,
        type,
        id: { ...id },
        flags: 0,
    };
    game.light_base = ls;

    game.vision_full_recalc = 1; /* make the source show up */
    return ls;
}

/* the object or monster a light source is attached to (C's a_obj and
   a_monst share the union) */
function ls_id(ls) {
    return (ls.type === LS_OBJECT) ? ls.id.a_obj : ls.id.a_monst;
}

// C ref: light.c del_light_source()
/* Find and delete a light source.
   Assumes at most one light source is attached to an object at a time. */
export function del_light_source(type, id) {
    let curr;
    const want = (type === LS_OBJECT) ? id.a_obj : id.a_monst;

    /* find the light source from its id */
    for (curr = game.light_base; curr; curr = curr.next) {
        if (curr.type !== type)
            continue;
        if (ls_id(curr) === want)
            break;
    }
    if (curr) {
        delete_ls(curr);
    } else {
        /* impossible("del_light_source: not found type=%d, id=%s") */
        console.error(`impossible: del_light_source: not found type=${type}`);
    }
}

// C ref: light.c delete_ls()
/* remove a light source from the light_base list and free it */
function delete_ls(ls) {
    let curr, prev;

    for (prev = null, curr = game.light_base; curr;
         prev = curr, curr = curr.next) {
        if (curr === ls) {
            if (prev)
                prev.next = curr.next;
            else
                game.light_base = curr.next;
            break;
        }
    }
    if (curr) {
        curr.next = null;
        game.vision_full_recalc = 1;
    } else {
        console.error('impossible: delete_ls not found');
    }
}

// C ref: light.c show_transient_light()
/* lit 'obj' has been thrown or kicked and is passing through x,y on the
   way to its destination; show its light so that hero has a chance to
   remember terrain, objects, and monsters being revealed;
   if 'obj' is Null, <x,y> is being hit by a camera's light flash */
export async function show_transient_light(obj, x, y) {
    let ls = null;
    let radius_squared;

    /* Null object indicates camera flash */
    if (!obj) {
        /* no need to temporarily light an already lit spot */
        if (game.level.at(x, y).lit)
            return;

        /* radius 0 will just light <x,y>; cameraflash.a_obj is Null */
        ls = new_light_core(x, y, 0, LS_OBJECT, { a_obj: null });
    } else {
        /* thrown or kicked object which is emitting light; validate its
           light source to obtain its radius (for monster sightings) */
        for (ls = game.light_base; ls; ls = ls.next) {
            if (ls.type !== LS_OBJECT)
                continue;
            if (ls.id.a_obj === obj)
                break;
        }
        if (!ls || obj.where !== 'OBJ_FREE') {
            impossible(`transient light ${obj.lamplit ? "lit" : "unlit"} ${
                simpleonames(obj)} ${otense(obj, "are")} not ${
                !ls ? "a light source" : "free"}?`);
            return;
        }
    }

    if (obj) /* put lit candle or lamp temporarily on the map */
        place_object(obj, game.bhitpos.x, game.bhitpos.y);
    else /* camera flash:  no object; directly set light source's location */
        ls.x = x, ls.y = y;

    /* full recalc; runs do_light_sources() */
    vision_recalc(0);
    await flush_screen(0);

    radius_squared = ls.range * ls.range;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if (mon.mhp < 1 /* DEADMONSTER */ || (mon.isgd && !mon.mx))
            continue;
        /* light range is the radius of a circle and we're limiting
           canseemon() to a square enclosing that circle, but setting
           mtemplit 'erroneously' for a seen monster is not a problem;
           it just flags monsters for another canseemon() check when
           'obj' has reached its destination after missile traversal */
        if (dist2(mon.mx, mon.my, x, y) <= radius_squared) {
            if (canseemon(mon))
                mon.mtemplit = 1;
        }
        /* [what about worm tails?] */
    }

    if (obj) { /* take thrown/kicked candle or lamp off the map */
        /* nh_delay_output(): display timing only */
        obj_extract_self(obj); /* remove_object(obj) */
    }
}

// C ref: light.c transient_light_cleanup()
/* delete any camera flash light sources and draw "remembered, unseen
   monster" glyph at locations where a monster was flagged for being
   visible during transient light movement but can't be seen now */
export async function transient_light_cleanup() {
    let mtempcount;

    /* in case we're cleaning up a camera flash, remove all object light
       sources which aren't associated with a specific object */
    discard_flashes();
    if (game.vision_full_recalc) /* set by del_light_source() */
        vision_recalc(0);

    /* for thrown/kicked candle or lamp or for camera flash, some
       monsters may have been mapped in light which has now gone away
       so need to be replaced by "remembered, unseen monster" glyph */
    mtempcount = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if (mon.mhp < 1) /* DEADMONSTER */
            continue;
        if (mon.mtemplit) {
            mon.mtemplit = 0;
            ++mtempcount;
            if (!canspotmon(mon))
                map_invisible(mon.mx, mon.my);
        }
    }
    if (mtempcount)
        await flush_screen(0);
}

// C ref: light.c discard_flashes()
/* camera flashes have Null object; caller wants to get rid of them now */
function discard_flashes() {
    let ls, nxt_ls;

    for (ls = game.light_base; ls; ls = nxt_ls) {
        nxt_ls = ls.next;
        if (ls.type === LS_OBJECT && !ls.id.a_obj)
            delete_ls(ls);
    }
}

// C ref: light.c do_light_sources()
/* Mark locations that are temporarily lit via mobile light sources. */
export function do_light_sources(cs_rows) {
    let x, y, min_x, max_x, max_y;
    let offset;
    let limits;
    let at_hero_range = 0;
    let ls;
    let row;
    const u = game.u;

    for (ls = game.light_base; ls; ls = ls.next) {
        ls.flags &= ~LSF_SHOW;

        /*
         * Check for moved light sources.  It may be possible to
         * save some effort if an object has not moved, but not in
         * the current setup -- we need to recalculate for every
         * vision recalc.
         */
        if (ls.type === LS_OBJECT) {
            let loc;
            if (ls.range === 0) { /* camera flash; caller has set ls->{x,y} */
                ls.flags |= LSF_SHOW;
            } else if ((loc = get_obj_location(ls.id.a_obj, 0))) {
                ls.x = loc[0], ls.y = loc[1];
                ls.flags |= LSF_SHOW;
            } else {
                ls.x = ls.y = 0; /* get_obj_location() zeroes *xp,*yp */
            }
        } else if (ls.type === LS_MONSTER) {
            let loc;
            if ((loc = get_mon_location(ls.id.a_monst, 0))) {
                ls.x = loc[0], ls.y = loc[1];
                ls.flags |= LSF_SHOW;
            } else {
                ls.x = ls.y = 0; /* get_mon_location() zeroes *xp,*yp */
            }
        }

        /* minor optimization: don't bother with duplicate light sources
           at hero */
        if (ls.x === u.ux && ls.y === u.uy) {
            if (at_hero_range >= ls.range)
                ls.flags &= ~LSF_SHOW;
            else
                at_hero_range = ls.range;
        }

        if (ls.flags & LSF_SHOW) {
            /*
             * Walk the points in the circle and see if they are
             * visible from the center.  If so, mark'em.
             */
            limits = circle_start[ls.range]; /* circle_ptr(ls->range) */
            if ((max_y = (ls.y + ls.range)) >= ROWNO)
                max_y = ROWNO - 1;
            if ((y = (ls.y - ls.range)) < 0)
                y = 0;
            for (; y <= max_y; y++) {
                row = cs_rows[y];
                offset = circle_data[limits + Math.abs(y - ls.y)];
                if ((min_x = (ls.x - offset)) < 1)
                    min_x = 1;
                if ((max_x = (ls.x + offset)) >= COLNO)
                    max_x = COLNO - 1;

                if (ls.x === u.ux && ls.y === u.uy) {
                    /*
                     * If the light source is located at the hero, then
                     * we can use the COULD_SEE bits already calculated
                     * by the vision system.
                     */
                    for (x = min_x; x <= max_x; x++)
                        if (row[x] & COULD_SEE)
                            row[x] |= TEMP_LIT;
                } else {
                    for (x = min_x; x <= max_x; x++)
                        if ((ls.x === x && ls.y === y)
                            || clear_path(ls.x, ls.y, x, y))
                            row[x] |= TEMP_LIT;
                }
            }
        }
    }
}

// C ref: light.c save_light_sources()
/* Save all light sources of the given range. */
export function save_light_sources(nhfp, range) {
    let count, actual, is_global;
    let curr, prev;

    /* discard_flashes(): camera flashes aren't ported */
    game.vision_full_recalc = 0;

    if (nhfp.mode & (COUNTING | WRITING)) { /* update_file(nhfp) */
        count = maybe_write_ls(nhfp, range, false);
        Sfo(nhfp, count, "lightsource-count");
        actual = maybe_write_ls(nhfp, range, true);
        if (actual !== count)
            throw new Error(`counted ${count} light sources, wrote ${actual}! [range=${range}]`);
    }

    if (nhfp.mode & FREEING) { /* release_data(nhfp) */
        for (prev = null, curr = game.light_base; curr; ) {
            const next = curr.next;
            switch (curr.type) {
            case LS_OBJECT:
                is_global = !obj_is_local(curr.id.a_obj);
                break;
            case LS_MONSTER:
                is_global = !mon_is_local(curr.id.a_monst);
                break;
            default:
                is_global = false;
                break;
            }
            /* if global and not doing local, or vice versa, remove it */
            if (is_global !== (range === RANGE_LEVEL)) {
                if (prev)
                    prev.next = next;
                else
                    game.light_base = next;
                curr.next = null;
            } else {
                prev = curr;
            }
            curr = next;
        }
    }
}

// C ref: light.c restore_light_sources()
/*
 * Pull in the structures from disk, but don't recalculate the object
 * pointers.
 */
export function restore_light_sources(nhfp) {
    let count = 0;
    let ls;

    /* restore elements */
    count = Sfi(nhfp, "lightsource-count");

    while (count-- > 0) {
        ls = Sfi(nhfp, "lightsource");
        ls.next = game.light_base || null;
        game.light_base = ls;
    }
}

// C ref: light.c relink_light_sources()
/* Relink all lights that are so marked; the links themselves are resolved
   by restore.js resolve_saved_ids() (see timeout.js relink_timers()) */
export function relink_light_sources(ghostly) {
    for (let ls = game.light_base; ls; ls = ls.next) {
        if (ls.flags & LSF_NEEDS_FIXUP) {
            if (!ls_id(ls))
                continue; /* not resolved yet */
            ls.flags &= ~LSF_NEEDS_FIXUP;
        }
    }
}

// C ref: light.c maybe_write_ls()
/*
 * Part of the light source save routine.  Count up the number of light
 * sources that would be written.  If write_it is true, actually write
 * the light source out.
 */
function maybe_write_ls(nhfp, range, write_it) {
    let count = 0, is_global;

    for (let ls = game.light_base; ls; ls = ls.next) {
        switch (ls.type) {
        case LS_OBJECT:
            is_global = !obj_is_local(ls.id.a_obj);
            break;
        case LS_MONSTER:
            is_global = !mon_is_local(ls.id.a_monst);
            break;
        default:
            is_global = false;
            break;
        }
        /* if global and not doing local, or vice versa, count it */
        if (is_global !== (range === RANGE_LEVEL)) {
            count++;
            if (write_it)
                write_ls(nhfp, ls);
        }
    }

    return count;
}

// C ref: light.c write_ls()
/* Write a light source structure to disk; the object is written as its
   o_id (Sfo() id link) and marked for fixup. */
function write_ls(nhfp, ls) {
    Sfo(nhfp, { x: ls.x, y: ls.y, range: ls.range, type: ls.type,
                id: { ...ls.id }, flags: ls.flags | LSF_NEEDS_FIXUP },
        "lightsource");
}

// C ref: light.c obj_move_light_source()
/* Change light source's ID from src to dest. */
export function obj_move_light_source(src, dest) {
    for (let ls = game.light_base; ls; ls = ls.next)
        if (ls.type === LS_OBJECT && ls.id.a_obj === src)
            ls.id.a_obj = dest;
    src.lamplit = 0;
    dest.lamplit = 1;
}

// C ref: light.c any_light_source()
/* return true if there exist any light sources */
export function any_light_source() {
    return !!game.light_base;
}

// C ref: light.c snuff_light_source()
/*
 * Snuff an object light source if at (x,y).  This currently works
 * only for burning light sources.
 */
export function snuff_light_source(x, y) {
    for (let ls = game.light_base; ls; ls = ls.next)
        /*
         * Is this position check valid??? Can I assume that the positions
         * will always be correct because the objects would have been
         * updated with the last vision update?  [Is that recent enough???]
         */
        if (ls.type === LS_OBJECT && ls.x === x && ls.y === y) {
            const obj = ls.id.a_obj;
            if (obj_is_burning(obj)) {
                /* The only way to snuff Sunsword is to unwield it.  Darkness
                 * scrolls won't affect it.  (If we got here because it was
                 * dropped or thrown inside a monster, this won't matter
                 * anyway because it will go out when dropped.)
                 */
                if (artifact_light(obj))
                    continue;
                end_burn(obj, obj.otyp !== MAGIC_LAMP);
                /*
                 * The current ls element has just been removed (and
                 * ls->next is now invalid).  Return assuming that there
                 * is only one light source attached to each object.
                 */
                return;
            }
        }
}

// C ref: light.c obj_sheds_light()
/* Return TRUE if object sheds any light at all. */
export function obj_sheds_light(obj) {
    /* so far, only burning objects shed light */
    return obj_is_burning(obj);
}

// C ref: light.c obj_is_burning()
/* Return TRUE if sheds light AND will be snuffed by end_burn(). */
export function obj_is_burning(obj) {
    return !!(obj.lamplit && (ignitable(obj) || artifact_light(obj)));
}

/* C ref: obj.h ignitable() */
function ignitable(otmp) {
    return otmp.otyp === BRASS_LANTERN || otmp.otyp === OIL_LAMP
        || otmp.otyp === MAGIC_LAMP || otmp.otyp === POT_OIL
        || otmp.otyp === CANDELABRUM_OF_INVOCATION
        || otmp.otyp === TALLOW_CANDLE || otmp.otyp === WAX_CANDLE;
}

// C ref: light.c obj_split_light_source()
/* copy the light source(s) attached to src, and attach it/them to dest */
export function obj_split_light_source(src, dest) {
    let ls, new_ls;

    for (ls = game.light_base; ls; ls = ls.next)
        if (ls.type === LS_OBJECT && ls.id.a_obj === src) {
            /*
             * Insert the new source at beginning of list.  This will
             * never interfere us walking down the list - we are already
             * past the insertion point.
             */
            new_ls = { ...ls };
            if (Is_candle(src)) {
                /* split candles may emit less light than original group */
                ls.range = candle_light_range(src);
                new_ls.range = candle_light_range(dest);
                game.vision_full_recalc = 1; /* in case range changed */
            }
            new_ls.id = { a_obj: dest };
            new_ls.next = game.light_base;
            game.light_base = new_ls;
            dest.lamplit = 1; /* now an active light source */
        }
}

/* C ref: obj.h Is_candle() */
function Is_candle(otmp) {
    return otmp.otyp === TALLOW_CANDLE || otmp.otyp === WAX_CANDLE;
}

// C ref: light.c obj_merge_light_sources()
/* light source `src' has been folded into light source `dest';
   used for merging lit candles and adding candle(s) to lit candelabrum */
export function obj_merge_light_sources(src, dest) {
    let ls;

    /* src == dest implies adding to candelabrum */
    if (src !== dest)
        end_burn(src, true); /* extinguish candles */

    for (ls = game.light_base; ls; ls = ls.next)
        if (ls.type === LS_OBJECT && ls.id.a_obj === dest) {
            ls.range = candle_light_range(dest);
            game.vision_full_recalc = 1; /* in case range changed */
            break;
        }
}

// C ref: light.c obj_adjust_light_radius()
/* light source `obj' is being made brighter or dimmer */
export function obj_adjust_light_radius(obj, new_radius) {
    let ls;

    for (ls = game.light_base; ls; ls = ls.next)
        if (ls.type === LS_OBJECT && ls.id.a_obj === obj) {
            if (new_radius !== ls.range)
                game.vision_full_recalc = 1;
            ls.range = new_radius;
            return;
        }
    console.error('impossible: obj_adjust_light_radius: can\'t find object');
}

// C ref: light.c arti_light_radius()
export function arti_light_radius(obj) {
    let res;

    /*
     * Used by begin_burn() when setting up a new light source
     * (obj->lamplit will already be set by this point) and
     * also by bless()/unbless()/uncurse()/curse() to decide
     * whether to call obj_adjust_light_radius().
     */

    /* sanity check [simplifies usage by bless()/curse()/&c] */
    if (!obj.lamplit || !artifact_light(obj))
        return 0;

    /* cursed radius of 1 is not noticeable for an item that's
       carried by the hero but is if it's carried by a monster
       or left lit on the floor (not applicable for Sunsword) */
    res = (obj.blessed ? 3 : !obj.cursed ? 2 : 1);

    /* if poly'd into gold dragon with embedded scales, make the scales
       have minimum radiance (hero as light source will use light radius
       based on monster form); otherwise, worn gold DSM gives off more
       light than other light sources */
    if (obj === game.uskin)
        res = 1;
    else if (obj.otyp === GOLD_DRAGON_SCALE_MAIL) /* DSM but not scales */
        ++res;

    return res;
}

// C ref: light.c arti_light_description()
/* adverb describing lit artifact's light; radius varies depending upon
   curse/bless state; also used for gold dragon scales/scale mail */
export function arti_light_description(obj) {
    switch (arti_light_radius(obj)) {
    case 4:
        return "radiantly"; /* blessed gold dragon scale mail */
    case 3:
        return "brilliantly"; /* blessed artifact, uncursed gold DSM */
    case 2:
        return "brightly"; /* uncursed artifact, cursed gold DSM */
    case 1:
        return "dimly"; /* cursed artifact, embedded scales */
    default:
        break;
    }
    return "strangely";
}

// C ref: light.c candle_light_range()
/* Candlelight is proportional to the number of candles;
   minimum range is 2 rather than 1 for playability. */
export function candle_light_range(obj) {
    let radius;

    if (obj.otyp === CANDELABRUM_OF_INVOCATION) {
        /*
         *      The special candelabrum emits more light than the
         *      corresponding number of candles would.
         *       1..3 candles, range 2 (minimum range);
         *       4..6 candles, range 3 (normal lamp range);
         *          7 candles, range 4 (bright).
         */
        radius = (obj.spe < 4) ? 2 : (obj.spe < 7) ? 3 : 4;
    } else if (Is_candle(obj)) {
        /*
         *      Range is incremented by powers of 7 so that it will take
         *      wizard mode quantities of candles to get more light than
         *      from a lamp, without imposing an arbitrary limit.
         *       1..6 candles, range 2;
         *      7..48 candles, range 3;
         *     49..342 candles, range 4; &c.
         */
        let n = obj.quan;

        radius = 1; /* always incremented at least once */
        do {
            radius++;
            n = Math.trunc(n / 7);
        } while (n > 0);
    } else {
        /* we're only called for lit candelabrum or candles */
        /* impossible("candlelight for %d?", obj->otyp); */
        radius = 3; /* lamp's value */
    }
    return radius;
}
