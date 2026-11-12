/* NetHack 5.0	light.c	$NHDT-Date: 1773375430 2026/03/12 20:17:10 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.82 $ */
/* Copyright (c) Dean Luick, 1994                                       */
/* NetHack may be freely redistributed.  See license for details.       */

import { C } from '../c-runtime/context.js';


/*
 * Mobile light sources.
 *
 * This implementation minimizes memory at the expense of extra
 * recalculations.
 *
 * Light sources are "things" that have a physical position and range.
 * They have a type, which gives us information about them.  Currently
 * they are only attached to objects and monsters.  Note well:  the
 * polymorphed-player handling assumes that gy.youmonst.m_id will
 * always remain 1 and gy.youmonst.mx will always remain 0.
 *
 * Light sources, like timers, either follow game play (RANGE_GLOBAL) or
 * stay on a level (RANGE_LEVEL).  Light sources are unique by their
 * (type, id) pair.  For light sources attached to objects, this id
 * is a pointer to the object.
 *
 * The major working function is do_light_sources(). It is called
 * when the vision system is recreating its "could see" array.  Here
 * we add a flag (TEMP_LIT) to the array for all locations that are lit
 * via a light source.  The bad part of this is that we have to
 * re-calculate the LOS of each light source every time the vision
 * system runs.  Even if the light sources and any topology (vision blocking
 * positions) have not changed.  The good part is that no extra memory
 * is used, plus we don't have to figure out how far the sources have moved,
 * or if the topology has changed.
 *
 * The structure of the save/restore mechanism is amazingly similar to
 * the timer save/restore.  This is because they both have the same
 * principals of having pointers into objects that must be recalculated
 * across saves and restores.
 */

/* flags */
export const LSF_SHOW = 0x1;
/* display the light source */
export const LSF_NEEDS_FIXUP = 0x2;
/* need oid fixup */
export const LSF_IS_PROBLEMATIC = 0x4;
/* impossible situation encountered */








/* imported from vision.c, for small circles */




/* Create a new light source.  Caller (and extern.h) doesn't need to know
   anything about type 'light_source'. */
export function new_light_source(x, y, range, type, id)
{
    type = C.int(type);
    range = C.int(range);
    y = C.coordxy(y);
    x = C.coordxy(x);
    new_light_core(x, y, range, type, id);
}

/* Create a new light source and return it.  Only used within this file. */
export function new_light_core(x, y, range, type, id)
{
    type = C.int(type);
    range = C.int(range);
    y = C.coordxy(y);
    x = C.coordxy(x);
    let ls;

    if (range > C.MAX_RADIUS || range < 0
        /* camera flash uses radius 0 and passes Null object */
        || (range == 0 && (type != C.LS_OBJECT || id.a_obj != 0))) {
        C.impossible("new_light_source:  illegal range %d", range);
        return 0;
    }

    ls = C.lightSource(C.alloc(C.lightSourceSize));

    C.memset(ls, 0, C.lightSourceSize);
    ls.next = C.gl.light_base;
    ls.x = x;
    ls.y = y;
    ls.range = range;
    ls.type = type;
    ls.id = id;
    ls.flags = 0;
    C.gl.light_base = ls;

    C.gv.vision_full_recalc = 1; /* make the source show up */
    return ls;
}

/* Find and delete a light source.
   Assumes at most one light source is attached to an object at a time. */
export function del_light_source(type, id)
{
    type = C.int(type);
    let curr;
    let tmp_id = C.anyLocal();

    C.copyAny(tmp_id, C.cg.zeroany);
    /* need to be prepared for dealing a with light source which
       has only been partially restored during a level change
       (in particular: chameleon vs prot. from shape changers) */
    switch (type) {
    case C.LS_NONE:
        C.impossible("del_light_source:type=none");
        tmp_id.a_uint = 0;
        break;
    case C.LS_OBJECT:
        tmp_id.a_uint = id.a_obj ? id.a_obj.o_id : 0;
        break;
    case C.LS_MONSTER:
        tmp_id.a_uint = id.a_monst.m_id;
        break;
    default:
        tmp_id.a_uint = 0;
        break;
    }

    /* find the light source from its id */
    for (curr = C.gl.light_base; curr; curr = curr.next) {
        if (curr.type != type)
            continue;
        if (C.samePtr(curr.id.a_obj, (curr.flags & LSF_NEEDS_FIXUP) ? tmp_id.a_obj : id.a_obj))
            break;
    }
    if (curr) {
        delete_ls(curr);
    } else {
        C.impossible("del_light_source: not found type=%d, id=%s", type,
                   C.fmt_ptr(id.a_obj));
    }
}

/* remove a light source from the light_base list and free it */
export function delete_ls(ls)
{
    let curr, prev;

    for (prev = 0, curr = C.gl.light_base; curr;
         prev = curr, curr = curr.next) {
        if (C.samePtr(curr, ls)) {
            if (prev)
                prev.next = curr.next;
            else
                C.gl.light_base = curr.next;
            break;
        }
    }
    if (curr) {
        C.assert(C.samePtr(curr, ls), 0);
        C.memset(ls, 0, C.lightSourceSize);
        C.free(ls);
        C.gv.vision_full_recalc = 1;
    } else {
        C.impossible("delete_ls not found, ls=%s", C.fmt_ptr(ls));
    }
    return;
}

/* Mark locations that are temporarily lit via mobile light sources. */
export function do_light_sources(cs_rows)
{
    let x, y, min_x, max_x, max_y;
    let offset;
    let limits;
    let at_hero_range = 0;
    let ls;
    let row;

    for (ls = C.gl.light_base; ls; ls = ls.next) {
        ls.flags &= ~LSF_SHOW;

        /*
         * Check for moved light sources.  It may be possible to
         * save some effort if an object has not moved, but not in
         * the current setup -- we need to recalculate for every
         * vision recalc.
         */
        if (ls.type == C.LS_OBJECT) {
            if (ls.range == 0 /* camera flash; caller has set ls->{x,y} */
                || C.get_obj_location(ls.id.a_obj, C.coordRef(ls, "x"), C.coordRef(ls, "y"), 0))
                ls.flags |= LSF_SHOW;
        } else if (ls.type == C.LS_MONSTER) {
            if (C.get_mon_location(ls.id.a_monst, C.coordRef(ls, "x"), C.coordRef(ls, "y"), 0))
                ls.flags |= LSF_SHOW;
        }

        /* minor optimization: don't bother with duplicate light sources
           at hero */
        if (C.u_at(ls.x, ls.y)) {
            if (at_hero_range >= ls.range)
                ls.flags &= ~LSF_SHOW;
            else
                at_hero_range = ls.range;
        }

        if (ls.flags & LSF_SHOW) {
            /*
             * Walk the points in the circle and see if they are
             * visible from the center.  If so, mark'em.
             *
             * Kevin's tests indicated that doing this brute-force
             * method is faster for radius <= 3 (or so).
             */
            limits = C.circle_ptr(ls.range);
            if ((max_y = C.coordxy(ls.y + ls.range)) >= C.ROWNO)
                max_y = C.ROWNO - 1;
            if ((y = C.coordxy(ls.y - ls.range)) < 0)
                y = 0;
            for (; y <= max_y; y = C.coordxy(y + 1)) {
                row = cs_rows[y];
                offset = limits[C.abs(y - ls.y)];
                if ((min_x = C.coordxy(ls.x - offset)) < 1)
                    min_x = 1;
                if ((max_x = C.coordxy(ls.x + offset)) >= C.COLNO)
                    max_x = C.COLNO - 1;

                if (C.u_at(ls.x, ls.y)) {
                    /*
                     * If the light source is located at the hero, then
                     * we can use the COULD_SEE bits already calculated
                     * by the vision system.  More importantly than
                     * this optimization, is that it allows the vision
                     * system to correct problems with clear_path().
                     * The function clear_path() is a simple LOS
                     * path checker that doesn't go out of its way to
                     * make things look "correct".  The vision system
                     * does this.
                     */
                    for (x = min_x; x <= max_x; x = C.coordxy(x + 1))
                        if (row[x] & C.COULD_SEE)
                            row[x] |= C.TEMP_LIT;
                } else {
                    for (x = min_x; x <= max_x; x = C.coordxy(x + 1))
                        if ((ls.x == x && ls.y == y)
                            || C.clear_path(ls.x, ls.y, x, y))
                            row[x] |= C.TEMP_LIT;
                }
            }
        }
    }
}

/* lit 'obj' has been thrown or kicked and is passing through x,y on the
   way to its destination; show its light so that hero has a chance to
   remember terrain, objects, and monsters being revealed;
   if 'obj' is Null, <x,y> is being hit by a camera's light flash */
export function show_transient_light(obj, x, y)
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    let ls = 0;
    let cameraflash = C.anyLocal();
    let mon;
    let radius_squared;

    /* Null object indicates camera flash */
    if (!obj) {
        /* no need to temporarily light an already lit spot */
        if (C.levl[x][y].lit)
            return;

        C.copyAny(cameraflash, C.cg.zeroany);
        /* radius 0 will just light <x,y>; cameraflash.a_obj is Null */
        ls = new_light_core(x, y, 0, C.LS_OBJECT, cameraflash);
        /* pacify static analysis; 'ls' is never Null for
           new_light_core(,,0,LS_OBJECT,&zeroany) */
        C.assert(ls != 0, 1);
    } else {
        /* thrown or kicked object which is emitting light; validate its
           light source to obtain its radius (for monster sightings) */
        for (ls = C.gl.light_base; ls; ls = ls.next) {
            if (ls.type != C.LS_OBJECT)
                continue;
            if (C.samePtr(ls.id.a_obj, obj))
                break;
        }
        C.assert(obj != 0, 2); /* necessary condition to get into this 'else' */
        if (!ls || obj.where != C.OBJ_FREE) {
            C.impossible("transient light %s %s %s not %s?",
                       obj.lamplit ? "lit" : "unlit",
                       C.simpleonames(obj), C.otense(obj, "are"),
                       !ls ? "a light source" : "free");
            return;
        }
    }

    if (obj) /* put lit candle or lamp temporarily on the map */
        C.place_object(obj, C.gb.bhitpos.x, C.gb.bhitpos.y);
    else /* camera flash:  no object; directly set light source's location */
        ls.x = x, ls.y = y;

    /* full recalc; runs do_light_sources() */
    C.vision_recalc(0);
    C.flush_screen(0);

    radius_squared = ls.range * ls.range;
    for (mon = C.fmon; mon; mon = mon.nmon) {
        if (C.DEADMONSTER(mon) || (mon.isgd && !mon.mx))
            continue;
        /* light range is the radius of a circle and we're limiting
           canseemon() to a square enclosing that circle, but setting
           mtemplit 'erroneously' for a seen monster is not a problem;
           it just flags monsters for another canseemon() check when
           'obj' has reached its destination after missile traversal */
        if (C.dist2(mon.mx, mon.my, x, y) <= radius_squared) {
            if (C.canseemon(mon))
                mon.mtemplit = 1;
        }
        /* [what about worm tails?] */
    }

    if (obj) { /* take thrown/kicked candle or lamp off the map */
        C.nh_delay_output();
        C.remove_object(obj);
    }
}

/* delete any camera flash light sources and draw "remembered, unseen
   monster" glyph at locations where a monster was flagged for being
   visible during transient light movement but can't be seen now */
export function transient_light_cleanup()
{
    let mon;
    let mtempcount;

    /* in case we're cleaning up a camera flash, remove all object light
       sources which aren't associated with a specific object */
    discard_flashes();
    if (C.gv.vision_full_recalc) /* set by del_light_source() */
        C.vision_recalc(0);

    /* for thrown/kicked candle or lamp or for camera flash, some
       monsters may have been mapped in light which has now gone away
       so need to be replaced by "remembered, unseen monster" glyph */
    mtempcount = 0;
    for (mon = C.fmon; mon; mon = mon.nmon) {
        if (C.DEADMONSTER(mon))
            continue;
        if (mon.mtemplit) {
            mon.mtemplit = 0;
            ++mtempcount;
            if (!C.canspotmon(mon))
                C.map_invisible(mon.mx, mon.my);
        }
    }
    if (mtempcount)
        C.flush_screen(0);
}

/* camera flashes have Null object; caller wants to get rid of them now */
export function discard_flashes()
{
    let ls, nxt_ls;

    for (ls = C.gl.light_base; ls; ls = nxt_ls) {
        nxt_ls = ls.next;
        if (ls.type == C.LS_OBJECT && !ls.id.a_obj)
            delete_ls(ls);
    }
}

/* (mon->mx == 0) implies migrating */

export function find_mid(nid, fmflags)
{
    fmflags = C.uint(fmflags);
    nid = C.uint(nid);
    let mtmp;

    if ((fmflags & C.FM_YOU) && nid == 1)
        return C.gy.youmonst;
    if (fmflags & C.FM_FMON)
        for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon)
            if (!C.DEADMONSTER(mtmp) && mtmp.m_id == nid)
                return mtmp;
    if (fmflags & C.FM_MIGRATE)
        for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon)
            if (mtmp.m_id == nid)
                return mtmp;
    if (fmflags & C.FM_MYDOGS)
        for (mtmp = C.gm.mydogs; mtmp; mtmp = mtmp.nmon)
            if (mtmp.m_id == nid)
                return mtmp;
    return 0;
}

export function whereis_mon(mon, fmflags)
{
    fmflags = C.uint(fmflags);
    let mtmp;

    if ((fmflags & C.FM_YOU) && C.samePtr(mon, C.gy.youmonst))
        return C.FM_YOU;
    if (fmflags & C.FM_FMON)
        for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon)
            if (C.samePtr(mtmp, mon))
                return C.FM_FMON;
    if (fmflags & C.FM_MIGRATE)
        for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon)
            if (C.samePtr(mtmp, mon))
                return C.FM_MIGRATE;
    if (fmflags & C.FM_MYDOGS)
        for (mtmp = C.gm.mydogs; mtmp; mtmp = mtmp.nmon)
            if (C.samePtr(mtmp, mon))
                return C.FM_MYDOGS;
    return 0;
}

/* Save all light sources of the given range. */
export function save_light_sources(nhfp, range)
{
    range = C.int(range);
    let count = C.intLocal(), actual, is_global;
    let prev, curr;

    /* camera flash light sources have Null object and would trigger
       impossible("no id!") below; they can only happen here if we're
       in the midst of a panic save and they wouldn't be useful after
       restore so just throw any that are present away */
    discard_flashes();
    C.gv.vision_full_recalc = 0;

    if (C.update_file(nhfp)) {
        count.value = maybe_write_ls(nhfp, range, 0);
        C.Sfo_int(nhfp, count, "lightsource-count");
        actual = maybe_write_ls(nhfp, range, 1);
        if (actual != count.value)
            C.panic("counted %d light sources, wrote %d! [range=%d]", count.value,
                  actual, range);
    }

     if (C.release_data(nhfp)) {
        for (prev = C.lightHeadRef(); (curr = prev.value) != 0; ) {
            if (!curr.id.a_monst) {
                C.impossible("save_light_sources: no id! [range=%d]", range);
                is_global = 0;
            } else
                switch (curr.type) {
                case C.LS_OBJECT:
                    is_global = !C.obj_is_local(curr.id.a_obj);
                    break;
                case C.LS_MONSTER:
                    is_global = !C.mon_is_local(curr.id.a_monst);
                    break;
                default:
                    is_global = 0;
                    C.impossible("save_light_sources: bad type (%d) [range=%d]",
                               curr.type, range);
                    break;
                }
            /* if global and not doing local, or vice versa, remove it */
            if (is_global ^ (range == C.RANGE_LEVEL)) {
                prev.value = curr.next;
                C.memset(curr, 0, C.lightSourceSize);
                C.free(curr);
            } else {
                prev = C.lightNextRef(prev.value);
            }
        }
    }
}
/* !SFCTOOL */

/*
 * Pull in the structures from disk, but don't recalculate the object
 * pointers.
 */
export function restore_light_sources(nhfp)
{
    let count = C.intLocal();
    count.value = 0;
    let ls;

    /* restore elements */
    C.Sfi_int(nhfp, count, "lightsource-count");

    while (count.value-- > 0) {
        ls = C.lightSource(C.alloc(C.lightSourceSize));
        C.Sfi_ls_t(nhfp, ls, "lightsource");
        ls.next = C.gl.light_base;
        C.gl.light_base = ls;
    }
}




/* to support '#stats' wizard-mode command */
export function light_stats(hdrfmt, hdrbuf, count, size)
{
    let ls;

    C.Sprintf(hdrbuf, hdrfmt, C.long(C.lightSourceSize));
    count.value = size.value = 0n;
    for (ls = C.gl.light_base; ls; ls = ls.next) {
        ++count.value;
        size.value = C.long(size.value + C.long(C.lightSourceSize));
    }
}



/* Relink all lights that are so marked. */
export function relink_light_sources(ghostly)
{
    ghostly = C.boolean(ghostly);
    let which;
    let nid = C.uintLocal();
    let ls;

    /*
     * Caveat:
     *  There has been at least one instance during to-be-5.0 development
     *  where the light_base linked list ended up with a circular link.
     *  If that happens, then once all the traversed elements have their
     *  LSF_NEEDS_FIXUP flag cleared, the traversal attempt will run wild.
     *
     *  The circular list instance was blamed on attempting to restore
     *  a save file which should have been invalidated by version/patch/
     *  editlevel verification, but wasn't rejected because EDITLEVEL
     *  didn't get incremented when it should have been.  Valid data should
     *  never produce the problem and it isn't possible in general to guard
     *  against code updates that neglect to set the verification info up
     *  to date.
     */

    for (ls = C.gl.light_base; ls; ls = ls.next) {
        if (ls.flags & LSF_NEEDS_FIXUP) {
            if (ls.type == C.LS_OBJECT || ls.type == C.LS_MONSTER) {
                nid.value = ls.id.a_uint;
                if (ghostly && !C.lookup_id_mapping(nid.value, nid))
                    C.panic("relink_light_sources: no id mapping");

                which = '\0'.charCodeAt(0);
                if (ls.type == C.LS_OBJECT) {
                    if ((ls.id.a_obj = C.find_oid(nid.value)) == 0)
                        which = 'o'.charCodeAt(0);
                } else {
                    if ((ls.id.a_monst = find_mid(nid.value, C.FM_EVERYWHERE)) == 0)
                        which = 'm'.charCodeAt(0);
                }
                if (which != '\0'.charCodeAt(0))
                    C.panic("relink_light_sources: can't find %c_id %u",
                          which, nid.value);
            } else {
                C.panic("relink_light_sources: bad type (%d)", ls.type);
            }
            ls.flags &= ~LSF_NEEDS_FIXUP;
        }
    }
}

/*
 * Part of the light source save routine.  Count up the number of light
 * sources that would be written.  If write_it is true, actually write
 * the light source out.
 */
export function maybe_write_ls(nhfp, range, write_it)
{
    write_it = C.boolean(write_it);
    range = C.int(range);
    let count = 0, is_global;
    let ls;

    for (ls = C.gl.light_base; ls; ls = ls.next) {
        if (!ls.id.a_monst) {
            C.impossible("maybe_write_ls: no id! [range=%d]", range);
            continue;
        }
        switch (ls.type) {
        case C.LS_OBJECT:
            is_global = !C.obj_is_local(ls.id.a_obj);
            break;
        case C.LS_MONSTER:
            is_global = !C.mon_is_local(ls.id.a_monst);
            break;
        default:
            is_global = 0;
            C.impossible("maybe_write_ls: bad type (%d) [range=%d]", ls.type,
                       range);
            break;
        }
        /* if global and not doing local, or vice versa, count it */
        if (is_global ^ (range == C.RANGE_LEVEL)) {
            count++;
            if (write_it)
                C.callLocal(write_ls, nhfp, ls);
        }
    }

    return count;
}

export function light_sources_sanity_check()
{
    let ls;
    let mtmp;
    let otmp;
    let auint;

    for (ls = C.gl.light_base; ls; ls = ls.next) {
        if (!ls.id.a_monst)
            C.panic("insane light source: no id!");
        if (ls.type == C.LS_OBJECT) {
            otmp = ls.id.a_obj;
            auint = otmp.o_id;
            if (!C.samePtr(C.find_oid(auint), otmp))
                C.panic("insane light source: can't find obj #%u!", auint);
        } else if (ls.type == C.LS_MONSTER) {
            mtmp = ls.id.a_monst;
            auint = mtmp.m_id;
            if (!C.samePtr(find_mid(auint, C.FM_EVERYWHERE), mtmp))
                C.panic("insane light source: can't find mon #%u!", auint);
        } else {
            C.panic("insane light source: bad ls type %d", ls.type);
        }
    }
}

/* Write a light source structure to disk. */
export function write_ls(nhfp, ls)
{
    let arg_save = C.anyLocal();
    let otmp;
    let mtmp;

    if (ls.type == C.LS_OBJECT || ls.type == C.LS_MONSTER) {
        if (ls.flags & LSF_NEEDS_FIXUP) {
            C.Sfo_ls_t(nhfp, ls, "lightsource");
        } else {
            /* replace object pointer with id for write, then put back */
            C.copyAny(arg_save, ls.id);
            if (ls.type == C.LS_OBJECT) {
                otmp = ls.id.a_obj;
                ls.id = C.cg.zeroany;
                ls.id.a_uint = otmp.o_id;
                if (!C.samePtr(C.find_oid(ls.id.a_uint), otmp)) {
                    C.impossible("write_ls: can't find obj #%u!",
                               ls.id.a_uint);
                    ls.flags |= LSF_IS_PROBLEMATIC;
                }
            } else { /* ls->type == LS_MONSTER */
                let monloc = 0;

                mtmp = ls.id.a_monst;

                /* The monster pointer has been stashed in the light source
                 * for a while and while there is code meant to clean-up the
                 * light source aspects if a monster goes away, there have
                 * been some reports of light source issues, such as when
                 * going to the planes.
                 *
                 * Verify that the stashed monst pointer is still present
                 * in one of the monster chains before pulling subfield
                 * values such as m_id from it, to avoid any attempt to
                 * pull random m_id value from (now) freed memory.
                 *
                 * find_mid() disregards a DEADMONSTER, but whereis_mon()
                 * does not. */

                if ((monloc = whereis_mon(mtmp, C.FM_EVERYWHERE)) != 0) {
                    ls.id = C.cg.zeroany;
                    ls.id.a_uint = mtmp.m_id;
                    if (!C.samePtr(find_mid(ls.id.a_uint, monloc), mtmp)) {
                        C.impossible("write_ls: can't find mon%s #%u!",
                                   C.DEADMONSTER(mtmp) ? " because it's dead"
                                                     : "",
                                   ls.id.a_uint);
                        ls.flags |= LSF_IS_PROBLEMATIC;
                    }
                } else {
                    C.impossible(
                        "write_ls: stashed monst ptr not in any chain");
                    ls.flags |= LSF_IS_PROBLEMATIC;
                }
            }
            if (ls.flags & LSF_IS_PROBLEMATIC) {
                /* TODO: cleanup this ls, or skip writing it */
            }
            ls.flags |= LSF_NEEDS_FIXUP;
            C.Sfo_ls_t(nhfp, ls, "lightsource");
            ls.id = arg_save;
            ls.flags &= ~LSF_NEEDS_FIXUP;
            ls.flags &= ~LSF_IS_PROBLEMATIC;
        }
    } else {
        C.impossible("write_ls: bad type (%d)", ls.type);
    }
}

/* Change light source's ID from src to dest. */
export function obj_move_light_source(src, dest)
{
    let ls;

    for (ls = C.gl.light_base; ls; ls = ls.next)
        if (ls.type == C.LS_OBJECT && C.samePtr(ls.id.a_obj, src))
            ls.id.a_obj = dest;
    src.lamplit = 0;
    dest.lamplit = 1;
}

/* return true if there exist any light sources */
export function any_light_source()
{
    return (C.gl.light_base != 0);
}

/*
 * Snuff an object light source if at (x,y).  This currently works
 * only for burning light sources.
 */
export function snuff_light_source(x, y)
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    let ls;
    let obj;

    for (ls = C.gl.light_base; ls; ls = ls.next)
        /*
         * Is this position check valid??? Can I assume that the positions
         * will always be correct because the objects would have been
         * updated with the last vision update?  [Is that recent enough???]
         */
        if (ls.type == C.LS_OBJECT && ls.x == x && ls.y == y) {
            obj = ls.id.a_obj;
            if (obj_is_burning(obj)) {
                /* The only way to snuff Sunsword is to unwield it.  Darkness
                 * scrolls won't affect it.  (If we got here because it was
                 * dropped or thrown inside a monster, this won't matter
                 * anyway because it will go out when dropped.)
                 */
                if (C.artifact_light(obj))
                    continue;
                C.end_burn(obj, obj.otyp != C.MAGIC_LAMP);
                /*
                 * The current ls element has just been removed (and
                 * ls->next is now invalid).  Return assuming that there
                 * is only one light source attached to each object.
                 */
                return;
            }
        }
}

/* Return TRUE if object sheds any light at all. */
export function obj_sheds_light(obj)
{
    /* so far, only burning objects shed light */
    return obj_is_burning(obj);
}

/* Return TRUE if sheds light AND will be snuffed by end_burn(). */
export function obj_is_burning(obj)
{
    return C.bool(obj.lamplit && (C.ignitable(obj)
                                       || C.artifact_light(obj)));
}

/* copy the light source(s) attached to src, and attach it/them to dest */
export function obj_split_light_source(src, dest)
{
    let ls, new_ls;

    for (ls = C.gl.light_base; ls; ls = ls.next)
        if (ls.type == C.LS_OBJECT && C.samePtr(ls.id.a_obj, src)) {
            /*
             * Insert the new source at beginning of list.  This will
             * never interfere us walking down the list - we are already
             * past the insertion point.
             */
            new_ls = C.lightSource(C.alloc(C.lightSourceSize));
            C.copyLight(new_ls, ls);
            if (C.Is_candle(src)) {
                /* split candles may emit less light than original group */
                ls.range = candle_light_range(src);
                new_ls.range = candle_light_range(dest);
                C.gv.vision_full_recalc = 1; /* in case range changed */
            }
            new_ls.id.a_obj = dest;
            new_ls.next = C.gl.light_base;
            C.gl.light_base = new_ls;
            dest.lamplit = 1; /* now an active light source */
        }
}

/* light source `src' has been folded into light source `dest';
   used for merging lit candles and adding candle(s) to lit candelabrum */
export function obj_merge_light_sources(src, dest)
{
    let ls;

    /* src == dest implies adding to candelabrum */
    if (!C.samePtr(src, dest))
        C.end_burn(src, 1); /* extinguish candles */

    for (ls = C.gl.light_base; ls; ls = ls.next)
        if (ls.type == C.LS_OBJECT && C.samePtr(ls.id.a_obj, dest)) {
            ls.range = candle_light_range(dest);
            C.gv.vision_full_recalc = 1; /* in case range changed */
            break;
        }
}

/* light source `obj' is being made brighter or dimmer */
export function obj_adjust_light_radius(obj, new_radius)
{
    new_radius = C.int(new_radius);
    let ls;

    for (ls = C.gl.light_base; ls; ls = ls.next)
        if (ls.type == C.LS_OBJECT && C.samePtr(ls.id.a_obj, obj)) {
            if (new_radius != ls.range)
                C.gv.vision_full_recalc = 1;
            ls.range = new_radius;
            return;
        }
    C.impossible("obj_adjust_light_radius: can't find %s", C.xname(obj));
}

/* Candlelight is proportional to the number of candles;
   minimum range is 2 rather than 1 for playability. */
export function candle_light_range(obj)
{
    let radius;

    if (obj.otyp == C.CANDELABRUM_OF_INVOCATION) {
        /*
         *      The special candelabrum emits more light than the
         *      corresponding number of candles would.
         *       1..3 candles, range 2 (minimum range);
         *       4..6 candles, range 3 (normal lamp range);
         *          7 candles, range 4 (bright).
         */
        radius = (obj.spe < 4) ? 2 : (obj.spe < 7) ? 3 : 4;
    } else if (C.Is_candle(obj)) {
        /*
         *      Range is incremented quadratically. You can get the same
         *      amount of light as from a lamp with 4 candles, and
         *      even better light with 9 candles, and so on.
         *       1..3  candles, range 2;
         *       4..8  candles, range 3;
         *       9..15 candles, range 4; &c.
         */
        let n = obj.quan;

        radius = 1; /* always incremented at least once */
        while(radius*radius <= n && radius < C.MAX_RADIUS) {
            radius++;
        }
    } else {
        /* we're only called for lit candelabrum or candles */
        /* impossible("candlelight for %d?", obj->otyp); */
        radius = 3; /* lamp's value */
    }
    return radius;
}

/* light emitting artifact's range depends upon its curse/bless state */
export function arti_light_radius(obj)
{
    let res;

    /*
     * Used by begin_burn() when setting up a new light source
     * (obj->lamplit will already be set by this point) and
     * also by bless()/unbless()/uncurse()/curse() to decide
     * whether to call obj_adjust_light_radius().
     */

    /* sanity check [simplifies usage by bless()/curse()/&c] */
    if (!obj.lamplit || !C.artifact_light(obj))
        return 0;

    /* cursed radius of 1 is not noticeable for an item that's
       carried by the hero but is if it's carried by a monster
       or left lit on the floor (not applicable for Sunsword) */
    res = (obj.blessed ? 3 : !obj.cursed ? 2 : 1);

    /* if poly'd into gold dragon with embedded scales, make the scales
       have minimum radiance (hero as light source will use light radius
       based on monster form); otherwise, worn gold DSM gives off more
       light than other light sources */
    if (C.samePtr(obj, C.uskin))
        res = 1;
    else if (obj.otyp == C.GOLD_DRAGON_SCALE_MAIL) /* DSM but not scales */
        ++res;

    return res;
}

/* adverb describing lit artifact's light; radius varies depending upon
   curse/bless state; also used for gold dragon scales/scale mail */
export function arti_light_description(obj)
{
    switch (arti_light_radius(obj)) {
    case 4:
        return C.literal("radiantly"); /* blessed gold dragon scale mail */
    case 3:
        return C.literal("brilliantly"); /* blessed artifact, uncursed gold DSM */
    case 2:
        return C.literal("brightly"); /* uncursed artifact, cursed gold DSM */
    case 1:
        return C.literal("dimly"); /* cursed artifact, embedded scales */
    default:
        break;
    }
    return C.literal("strangely");
}

/* the #lightsources command */
export function wiz_light_sources()
{
    let win;
    let buf = C.stackAlloc(C.BUFSZ);
    let ls;

    win = C.create_nhwindow(C.NHW_MENU); /* corner text window */
    if (win == C.WIN_ERR)
        return C.ECMD_OK;

    C.Sprintf(buf, "Mobile light sources: hero @ (%2d,%2d)", C.u.ux, C.u.uy);
    C.putstr(win, 0, buf);
    C.putstr(win, 0, "");

    if (C.gl.light_base) {
        C.putstr(win, 0, "location range flags  type    id");
        C.putstr(win, 0, "-------- ----- ------ ----  -------");
        for (ls = C.gl.light_base; ls; ls = ls.next) {
            C.Sprintf(buf, "  %2d,%2d   %2d   0x%04x  %s  %s", ls.x, ls.y,
                    ls.range, ls.flags,
                    (ls.type == C.LS_OBJECT
                       ? "obj"
                       : ls.type == C.LS_MONSTER
                          ? (C.mon_is_local(ls.id.a_monst)
                             ? "mon"
                             : (C.samePtr(ls.id.a_monst, C.gy.youmonst))
                                ? "you"
                                /* migrating monster */
                                : "<m>")
                          : "???"),
                    C.fmt_ptr(ls.id.a_void));
            C.putstr(win, 0, buf);
        }
    } else
        C.putstr(win, 0, "<none>");

    C.display_nhwindow(win, 0);
    C.destroy_nhwindow(win);

    return C.ECMD_OK;
}
/* !SFCTOOL */

/* for 'onefile' processing where end of this file isn't necessarily the
   end of the source code seen by the compiler */

/*light.c*/
