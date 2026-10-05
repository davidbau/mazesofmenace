// light.js — port of nethack-c-v5/upstream/src/light.c.
//
// C ref (light.c:14-38, the file's own header): light sources are kept on a
// singly linked list rooted at gl.light_base.  The major working function is
// do_light_sources(), called while the vision system is rebuilding its
// "could see" array; it ORs TEMP_LIT into every location lit by a mobile
// source.  Nothing is cached between recalcs: every source re-runs its own
//
// WHAT IS LIVE HERE.  Both LS_MONSTER and LS_OBJECT sources are created now:
// new_light_source()/del_light_source() at C's points, so an applied lamp or
// lantern is a real entry on light_base.  (This paragraph used to say the
// LS_OBJECT arms were dead code "until begin_burn() lands"; that is the change
// that landed, so the claim is retired rather than left to rot.)  The three
// helpers begin_burn() needs to size an LS_OBJECT range — artifact_light(),
// arti_light_radius() and candle_light_range() — are at the foot of this file.
//
// at step 274 next to the des.monster("D",13,05) gold dragon of
// dat/tower3.lua.  C paints the 3x3 block that dragon lights — the dragon
// around them.  Without do_light_sources() this port had no TEMP_LIT at all,
// so those nine cells fell through to the hero's Warning glyphs and blank

import { game } from './gstate.js';
import {
    COLNO, ROWNO, MAX_RADIUS, LS_OBJECT, LS_MONSTER, TEMP_LIT, COULD_SEE,
    RANGE_LEVEL, OBJ_INVENT, OBJ_FLOOR, OBJ_MINVENT, OBJ_BURIED, OBJ_CONTAINED,
    BURIED_TOO, CONTAINED_TOO, u_at,
} from './const.js';
import { clear_path, circle_ptr } from './vision.js';
/* end_burn — obj_merge_light_sources's src != dest arm (light.c:812).  This is
 * the reverse edge of the js/timeout.js -> js/light.js import; see the note on
 * obj_merge_light_sources below. */
import { end_burn } from './timeout.js';

// C ref: light.c:41-43 — light_source flags.
const LSF_SHOW = 0x1;           /* display the light source */

// C ref: decl.h:539 light_source *light_base; (gl.light_base) — singly
// linked list of mobile light sources.
let light_base = null;

// C ref: light.c:373 `#define mon_is_local(mon) ((mon)->mx > 0)`
// (mon->mx == 0 implies migrating).
function mon_is_local(mon) { return (mon?.mx | 0) > 0; }

// C ref: light.c:340-358 obj_is_local(obj) — an object is local to the level
// unless it is in the hero's inventory or being carried by a monster that is
// itself not local.  Kept for the LS_OBJECT save partition below.
function obj_is_local(obj) {
    switch (obj?.where | 0) {
    case OBJ_FLOOR:
    case OBJ_BURIED:
        return true;
    case OBJ_CONTAINED:
        return obj_is_local(obj.ocontainer);
    case OBJ_MINVENT:
        return mon_is_local(obj.ocarry);
    default:
        return false;
    }
}

export function get_obj_location(obj, xp, yp, locflags = 0) {
    /* Some restored inventory objects do not carry C's OBJ_INVENT `where`
     * stamp yet, but they are still linked from gi.invent.  C's
     * get_obj_location() sees those as inventory items; recognize the live
     * chain so carried light sources can arm their radius immediately. */
    for (let inv = game.invent; inv; inv = inv.nobj) {
        if (inv === obj) {
            xp.value = game.u.ux | 0; yp.value = game.u.uy | 0;
            return true;
        }
    }
    switch (obj?.where | 0) {
    case OBJ_INVENT:
        xp.value = game.u.ux | 0; yp.value = game.u.uy | 0;
        return true;
    case OBJ_FLOOR:
        xp.value = obj.ox | 0; yp.value = obj.oy | 0;
        return true;
    case OBJ_MINVENT:
        if (obj.ocarry?.mx) {
            xp.value = obj.ocarry.mx | 0; yp.value = obj.ocarry.my | 0;
            return true;
        }
        break; /* !mx => migrating monster */
    case OBJ_BURIED:
        if (locflags & BURIED_TOO) {
            xp.value = obj.ox | 0; yp.value = obj.oy | 0;
            return true;
        }
        break;
    case OBJ_CONTAINED:
        if (locflags & CONTAINED_TOO)
            return get_obj_location(obj.ocontainer, xp, yp, locflags);
        break;
    }
    xp.value = yp.value = 0;
    return false;
}

export function get_mon_location(mon, xp, yp, locflags = 0) {
    const u = game.u;
    if ((game.youmonst && mon === game.youmonst)
        || (u?.usteed && mon === u.usteed)) {
        xp.value = u.ux | 0; yp.value = u.uy | 0;
        return true;
    }
    if ((mon?.mx | 0) > 0 && (!mon.mburied || locflags)) {
        xp.value = mon.mx | 0; yp.value = mon.my | 0;
        return true;
    }
    /* migrating or buried */
    xp.value = yp.value = 0;
    return false;
}

/* C ref: hack.c:97-108 monst_to_any(mon) / obj_to_any(obj) — `anything` is a
 * UNION, so a_monst and a_obj are the same pointer.  del_light_source()'s
 * `curr->id.a_obj == id->a_obj` comparison relies on exactly that, which is
 * why both fields are filled here rather than one. */
export function monst_to_any(mtmp) { return { a_monst: mtmp, a_obj: mtmp }; }
export function obj_to_any(obj) { return { a_obj: obj, a_monst: obj }; }

/* C ref: light.c:61-66 new_light_source(x, y, range, type, id) */
export function new_light_source(x, y, range, type, id) {
    new_light_core(x, y, range, type, id);
}

/* C ref: light.c:68-94 new_light_core() */
function new_light_core(x, y, range, type, id) {
    if (range > MAX_RADIUS || range < 0
        /* camera flash uses radius 0 and passes Null object */
        || (range === 0 && (type !== LS_OBJECT || id.a_obj != null))) {
        return null;
    }
    const ls = {
        next: light_base,
        x: x, y: y, range: range, type: type, id: id, flags: 0,
    };
    light_base = ls;
    game.vision_full_recalc = 1; /* make the source show up */
    return ls;
}

/* C ref: light.c:98-139 del_light_source(type, id).  Assumes at most one light
 * source is attached to an object at a time.  The C body compares
 * `curr->id.a_obj == (NEEDS_FIXUP ? tmp_id.a_obj : id->a_obj)`; NEEDS_FIXUP is
 * a save-file id-vs-pointer artifact and this port never restores a
 * partially-fixed-up source (getlev hands back live object references), so the
 * comparison is always against the caller's own pointer. */
export function del_light_source(type, id) {
    let curr;
    for (curr = light_base; curr; curr = curr.next) {
        if (curr.type !== type)
            continue;
        if (curr.id.a_obj === id.a_obj)
            break;
    }
    if (curr) {
        delete_ls(curr);
    }
    /* else: C impossible("del_light_source: not found ...").  Not fabricated
     * here — see new_light_core's note on impossible(). */
}

/* C light.c:779-806 obj_split_light_source(src, dest).  Duplicate every
 * object light attached to the source when a stack is split. */
export function obj_split_light_source(src, dest) {
    for (let ls = light_base; ls; ls = ls.next) {
        if (ls.type !== LS_OBJECT || ls.id?.a_obj !== src)
            continue;
        const copy = { ...ls, id: { ...ls.id, a_obj: dest }, next: light_base };
        if (Is_candle(src)) {
            ls.range = candle_light_range(src);
            copy.range = candle_light_range(dest);
            game.vision_full_recalc = 1;
        }
        light_base = copy;
        dest.lamplit = 1;
    }
}

/* C ref: light.c:141-166 delete_ls(ls) — unlink and free. */
function delete_ls(ls) {
    let prev = null, curr;
    for (curr = light_base; curr; prev = curr, curr = curr.next) {
        if (curr === ls) {
            if (prev)
                prev.next = curr.next;
            else
                light_base = curr.next;
            break;
        }
    }
    if (curr) {
        ls.next = null;
        game.vision_full_recalc = 1;
    }
}

/* C ref: light.c:168-247 do_light_sources(cs_rows) — mark locations that are
 * temporarily lit via mobile light sources.  `cs_rows` is the array
 * vision_recalc() is BUILDING (next_array), not the installed gv.viz_array. */
export function do_light_sources(cs_rows) {
    let at_hero_range = 0;

    for (let ls = light_base; ls; ls = ls.next) {
        ls.flags &= ~LSF_SHOW;

        /*
         * Check for moved light sources.  It may be possible to save some
         * effort if an object has not moved, but not in the current setup --
         * we need to recalculate for every vision recalc.
         */
        if (ls.type === LS_OBJECT) {
            /* C writes THROUGH ls->x / ls->y: `get_obj_location(ls->id.a_obj,
             * &ls->x, &ls->y, 0)`.  The boxes are copied back on success only,
             * which is what C's out-params do — on failure C leaves ls->{x,y}
             * zeroed and does not set LSF_SHOW, so they are never read. */
            const xb = { value: ls.x }, yb = { value: ls.y };
            if (ls.range === 0 /* camera flash; caller has set ls.{x,y} */
                || get_obj_location(ls.id.a_obj, xb, yb, 0)) {
                ls.x = xb.value; ls.y = yb.value;
                ls.flags |= LSF_SHOW;
            }
        } else if (ls.type === LS_MONSTER) {
            const xb = { value: ls.x }, yb = { value: ls.y };
            if (get_mon_location(ls.id.a_monst, xb, yb, 0)) {
                ls.x = xb.value; ls.y = yb.value;
                ls.flags |= LSF_SHOW;
            }
        }

        /* minor optimization: don't bother with duplicate light sources
           at hero */
        if (u_at(ls.x, ls.y)) {
            if (at_hero_range >= ls.range)
                ls.flags &= ~LSF_SHOW;
            else
                at_hero_range = ls.range;
        }

        if (ls.flags & LSF_SHOW) {
            /*
             * Walk the points in the circle and see if they are visible from
             * the center.  If so, mark'em.
             */
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

                if (u_at(ls.x, ls.y)) {
                    /*
                     * If the light source is located at the hero, then we can
                     * use the COULD_SEE bits already calculated by the vision
                     * system.  More importantly than this optimization, it
                     * allows the vision system to correct problems with
                     * clear_path().
                     */
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

/* C ref: light.c:719-726 any_light_source() */
export function any_light_source() {
    return light_base !== null;
}

/* Read-only enumeration for diagnostics such as wizard #stats.  Return the
 * chain membership without exposing light_base itself, whose links are owned
 * by new_light_source() and del_light_source(). */
export function light_sources_list() {
    const sources = [];
    for (let ls = light_base; ls; ls = ls.next)
        sources.push(ls);
    return sources;
}

/* C ref: light.c:421-476 save_light_sources(nhfp, range).
 *
 * C writes the matching sources to the level file and, in a FREEING mode,
 * unlinks them from gl.light_base; getlev() then reads them back.  This port
 * has no save-file byte model (see js/save.js's header), so the "write" is the
 * returned array and js/save.js#savelev stores it in its per-level snapshot.
 * The partition predicate is C's own, verbatim: keep the entry when
 * `is_global ^ (range == RANGE_LEVEL)` is false.
 *
 * discard_flashes() (light.c:360-370) drops LS_OBJECT sources with a null
 * object; none can exist here (no LS_OBJECT source is ever created), so the
 * call would be a no-op and is omitted rather than faked. */
export function save_light_sources(range) {
    const taken = [];
    let prev = null, curr = light_base;
    game.vision_full_recalc = 0;
    while (curr) {
        const next = curr.next;
        let is_global;
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
                light_base = next;
            curr.next = null;
            taken.push(curr);
        } else {
            prev = curr;
        }
        curr = next;
    }
    return taken;
}

/* C ref: light.c:478-491 restore_light_sources(nhfp) — pull the level's
 * sources back onto the head of the list.  `saved` is the array
 * save_light_sources() returned; C's alloc + Sfi_ls_t read is a copy out of
 * the save file, which here is the stored object itself. */
export function restore_light_sources(saved) {
    if (!saved)
        return;
    for (const ls of saved) {
        ls.next = light_base;
        light_base = ls;
    }
}

/* Whole-save counterpart of save_light_sources(RANGE_LEVEL/GLOBAL).  Keep the
 * live list intact while the graph serializer detaches it.  C's final getlev
 * prepends local sources after global sources, and restore_light_sources()
 * supplies the same file-order reversal. */
export function lights_save_snapshot() {
    const local = [], global = [];
    for (let ls = light_base; ls; ls = ls.next) {
        const isGlobal = ls.type === LS_OBJECT ? !obj_is_local(ls.id.a_obj)
            : ls.type === LS_MONSTER ? !mon_is_local(ls.id.a_monst) : false;
        (isGlobal ? global : local).push(ls);
    }
    return { local, global };
}

export function lights_rest_snapshot(saved) {
    light_base = null;
    restore_light_sources(saved?.global);
    restore_light_sources(saved?.local);
}

/* ── The three radius/predicate helpers begin_burn() needs ───────────────────
 *
 * candle_light_range() and arti_light_radius() are light.c's own; artifact_light()
 * lives in artifact.c but is placed here because it is arti_light_radius()'s and
 * begin_burn()'s only caller in this port and there is no js/artifact.js to hold
 * it.  All three are RNG-free in C.
 */

/* C ref: artifact.c:2263-2276 artifact_light(struct obj *obj)
 *     if (obj && (obj->otyp == GOLD_DRAGON_SCALE_MAIL
 *                 || obj->otyp == GOLD_DRAGON_SCALES)
 *         && (obj->owornmask & W_ARM) != 0L)
 *         return TRUE;
 *     return (get_artifact(obj) != &artilist[ART_NONARTIFACT])
 *            && is_art(obj, ART_SUNSWORD);
 *
 * `get_artifact(obj) != &artilist[ART_NONARTIFACT] && is_art(obj, ART_SUNSWORD)`
 * reduces to `obj->oartifact == ART_SUNSWORD`: get_artifact() returns the
 * ART_NONARTIFACT row exactly when oartifact is 0, and is_art() compares
 * oartifact against the named index.  Same reduction js/read.js:2623
 * artifact_light_lit() already makes for litroom(); that one is file-local, so
 * this is the exported body rather than a second opinion — see
 * js/read.js:2623's note.
 * otyps from js/oc_name_data.js OC_NAME: 102 "gold dragon scale mail",
 * 112 "gold dragon scales".  ART_SUNSWORD 20 (js/mklev.js:353). */
const GOLD_DRAGON_SCALE_MAIL = 102, GOLD_DRAGON_SCALES = 112;
const ART_SUNSWORD = 20;
const LIGHT_W_ARM = 0x00000001; /* prop.h W_ARM */
export function artifact_light(obj) {
    if (obj && ((obj.otyp | 0) === GOLD_DRAGON_SCALE_MAIL
                || (obj.otyp | 0) === GOLD_DRAGON_SCALES)
        && ((obj.owornmask | 0) & LIGHT_W_ARM) !== 0)
        return true;

    return !!obj && (obj.oartifact | 0) === ART_SUNSWORD;
}

/* C ref: light.c:771-775 obj_is_burning().  Keep this predicate separate
 * from obj_sheds_light(): callers such as in_container() use it to decide
 * whether snuff_lit() applies, including a lit light-emitting artifact which
 * is not one of the ordinary ignitable object types. */
const BURN_BRASS_LANTERN = 226, BURN_OIL_LAMP = 227,
      BURN_MAGIC_LAMP = 228, BURN_TALLOW_CANDLE = 224,
      BURN_WAX_CANDLE = 225, BURN_CANDELABRUM = 262,
      BURN_POT_OIL = 321;
export function obj_is_burning(obj) {
    if (!obj?.lamplit)
        return false;
    const typ = obj.otyp | 0;
    const ignitable = typ === BURN_BRASS_LANTERN
        || typ === BURN_OIL_LAMP
        || (typ === BURN_MAGIC_LAMP && (obj.spe | 0) > 0)
        || typ === BURN_CANDELABRUM
        || typ === BURN_TALLOW_CANDLE
        || typ === BURN_WAX_CANDLE
        || typ === BURN_POT_OIL;
    return ignitable || artifact_light(obj);
}

/* C ref: light.c:880-911 arti_light_radius(struct obj *obj) — a light-emitting
 * artifact's range depends on its curse/bless state. */
export function arti_light_radius(obj) {
    let res;

    /* C:894-896 sanity check [simplifies usage by bless()/curse()/&c] */
    if (!obj.lamplit || !artifact_light(obj))
        return 0;

    res = (obj.blessed ? 3 : !obj.cursed ? 2 : 1);

    /* C:905-909 */
    if (obj === game.u?.uskin)
        res = 1;
    else if ((obj.otyp | 0) === GOLD_DRAGON_SCALE_MAIL) /* DSM but not scales */
        ++res;

    return res;
}

/* C ref: light.c:806-822 obj_merge_light_sources(struct obj *src, struct obj *dest)
 *     "light source `src' has been folded into light source `dest';
 *      used for merging lit candles and adding candle(s) to lit candelabrum"
 *
 *     if (src != dest) end_burn(src, TRUE);   [src == dest implies candelabrum]
 *     for (ls = gl.light_base; ls; ls = ls->next)
 *         if (ls->type == LS_OBJECT && ls->id.a_obj == dest) {
 *             ls->range = candle_light_range(dest);
 *             gv.vision_full_recalc = 1;
 *             break;
 *         }
 *
 * The caller wired today is js/cmd.js use_candle() (apply.c:1456), which passes
 * the candelabrum as BOTH arguments — so the end_burn arm is not exercised by
 * it.  It is still ported, because C's other caller (invent.c merged()) passes
 * two different objects and the asymmetry is the whole point of the function.
 * end_burn's home is js/timeout.js, which imports THIS module; both sides are
 * hoisted function declarations, so the ESM cycle resolves the same way the
 * js/objnam.js <-> js/cmd.js edge already does.  RNG-free on every arm. */
export function obj_merge_light_sources(src, dest) {
    if (src !== dest)
        end_burn(src, true); /* extinguish candles */

    for (let ls = light_base; ls; ls = ls.next)
        if (ls.type === LS_OBJECT && ls.id.a_obj === dest) {
            ls.range = candle_light_range(dest);
            game.vision_full_recalc = 1; /* in case range changed */
            break;
        }
}

/* C ref: light.c:839-877 candle_light_range(struct obj *obj).  C's `else`
 * branch is only reached for a lit candelabrum or candle, where it
 * impossible()s (commented out upstream) and falls through to radius 3; that
 * fallthrough is reproduced. */
const CANDELABRUM_OF_INVOCATION = 262;
const TALLOW_CANDLE = 224, WAX_CANDLE = 225;
function Is_candle(obj) {
    const t = obj.otyp | 0;
    return t === TALLOW_CANDLE || t === WAX_CANDLE;
}
export function candle_light_range(obj) {
    let radius;

    if ((obj.otyp | 0) === CANDELABRUM_OF_INVOCATION) {
        /* C:846-853 1..3 candles range 2, 4..6 range 3, 7 range 4 */
        radius = ((obj.spe | 0) < 4) ? 2 : ((obj.spe | 0) < 7) ? 3 : 4;
    } else if (Is_candle(obj)) {
        /* C:855-870 range is incremented quadratically */
        const n = obj.quan | 0;

        radius = 1; /* always incremented at least once */
        while (radius * radius <= n && radius < MAX_RADIUS) {
            radius++;
        }
    } else {
        /* C:872-875 we're only called for lit candelabrum or candles */
        radius = 3; /* arbitrary */
    }
    return radius;
}
