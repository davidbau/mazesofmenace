import {C} from './c-runtime.js';
/* NetHack 5.0	vision.c	$NHDT-Date: 1777205478 2026/04/26 04:11:18 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.75 $ */
/* Copyright (c) Dean Luick, with acknowledgements to Dave Cohrs, 1990. */
/* NetHack may be freely redistributed.  See license for details.       */


/* Circles
 * ==================================================================*/

/*
 * These numbers are limit offsets for one quadrant of a circle of a given
 * radius (the first number of each line) from the source.  The number in
 * the comment is the element number (so pointers can be set up).  Each
 * "circle" has as many elements as its radius+1.  The radius is the number
 * of points away from the source that the limit exists.  The radius of the
 * offset on the same row as the source *is* included so we don't have to
 * make an extra check.  For example, a circle of radius 4 has offsets:
 *
 *              XXX     +2
 *              ...X    +3
 *              ....X   +4
 *              ....X   +4
 *              @...X   +4
 *
 * Externally referenced from light.c
*/
export const circle_data = [
    /*  0*/ 0,
    /*  1*/ 1,  1,
    /*  3*/ 2,  2,  1,
    /*  6*/ 3,  3,  2,  1,
    /* 10*/ 4,  4,  4,  3,  2,
    /* 15*/ 5,  5,  5,  4,  3,  2,
    /* 21*/ 6,  6,  6,  5,  5,  4,  2,
    /* 28*/ 7,  7,  7,  6,  6,  5,  4,  2,
    /* 36*/ 8,  8,  8,  7,  7,  6,  6,  4,  2,
    /* 45*/ 9,  9,  9,  9,  8,  8,  7,  6,  5,  3,
    /* 55*/ 10, 10, 10, 10, 9,  9,  8,  7,  6,  5,  3,
    /* 66*/ 11, 11, 11, 11, 10, 10, 9,  9,  8,  7,  5,  3,
    /* 78*/ 12, 12, 12, 12, 11, 11, 10, 10, 9,  8,  7,  5,  3,
    /* 91*/ 13, 13, 13, 13, 12, 12, 12, 11, 10, 10, 9,  7,  6, 3,
    /*105*/ 14, 14, 14, 14, 13, 13, 13, 12, 12, 11, 10, 9,  8, 6, 3,
    /*120*/ 15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3,
    /*136*/ 16 /* MAX_RADIUS+1; used to terminate range loops -dlc */
];

/*
 * These are the starting indexes into the circle_data[] array for a
 * circle of a given radius.  Radius 0 used to be unused, but is now
 * used for a single point:  temporary light source of a camera flash
 * as it traverses its path.
 */
export const circle_start = [
    /* 0*/ 0,
    /* 1*/ 1,
    /* 2*/ 3,
    /* 3*/ 6,
    /* 4*/ 10,
    /* 5*/ 15,
    /* 6*/ 21,
    /* 7*/ 28,
    /* 8*/ 36,
    /* 9*/ 45,
    /*10*/ 55,
    /*11*/ 66,
    /*12*/ 78,
    /*13*/ 91,
    /*14*/ 105,
    /*15*/ 120,
];

/*==========================================================================*/
/* Vision (arbitrary line of sight)
 * =========================================*/

/*------ local variables ------*/

 /* vision work space */




 /* vision clear/blocked map */


 /* LOS algorithm helpers */


/* Forward declarations. */







/* Macro definitions that I can't find anywhere. */
/* don't use abs -- it may exist */

/* expose viz_clear[][] for sanity checking */

export function get_viz_clear(x, y)
{
    if (C.isok(x,y) && !C.viz_clear[y][x])
        return 1;
    return 0;
}

/*
 * vision_init()
 *
 * The one-time vision initialization routine.
 *
 * This must be called before mklev() is called in newgame() [allmain.c],
 * or before a game restore.   Else we die a horrible death.
 */

export function vision_init()
{
    let i;

    /* Set up the pointers. */
    for (i = 0; i < C.ROWNO; i++) {
        C.cs_rows0[i] = C.could_see[0][i];
        C.cs_rows1[i] = C.could_see[1][i];
        C.viz_clear_rows[i] = C.viz_clear[i];
    }

    /* Start out with cs0 as our current array */
    C.gv.viz_array = C.cs_rows0;
    C.gv.viz_rmin = C.cs_rmin0;
    C.gv.viz_rmax = C.cs_rmax0;

    C.gv.vision_full_recalc = 0;
    C.memset(C.could_see, 0, C.workspaceSize("could_see"));

    /* Initialize the vision algorithm (currently C). */
    view_init();
}

/*
 * does_block()
 *
 * Returns 0 if nothing at (x,y) blocks sight, 1 if anything other than
 * an opaque region (gas cloud rather than CLOUD terrain) blocks sight,
 * or 2 if an opaque region blocks sight.  [At present, the rest of the
 * code makes no distinction between 1 and 2, just between 0 and non-0.]
 */

export function does_block(x, y, lev)
{
    let obj;
    let mon;

    /* set DEBUGFILES=seethru in environment to see through bubbles */
    if (C.gs.seethru == 0) { /* init once */
        C.gs.seethru = (C.wizard && C.explicitdebug("seethru")) ? 1 : -1;
    }

    /* Features that block . . */
    if (C.IS_OBSTRUCTED(lev.typ) || lev.typ == C.TREE
        || (C.IS_DOOR(lev.typ)
            && (lev.doormask & (C.D_CLOSED | C.D_LOCKED | C.D_TRAPPED))))
        return 1;

    if (C.gs.seethru != 1) {
    if (lev.typ == C.CLOUD || C.IS_WATERWALL(lev.typ) || lev.typ == C.LAVAWALL
        || (C.Underwater && C.is_moat(x, y)))
        return 1;
    } /* gs.seethru */

    /* Boulders block light. */
    for (obj = C.svl.level.objects[x][y]; obj; obj = obj.nexthere)
        if (obj.otyp == C.BOULDER)
            return 1;

    /* Mimics mimicking a door or boulder or ... block light. */
    if ((mon = C.m_at(x, y)) && (!mon.minvis || C.See_invisible)
        && C.is_lightblocker_mappear(mon))
        return 1;

    if (C.gs.seethru != 1) {
    /* Clouds (poisonous or not) block light. */
    if (C.visible_region_at(x, y))
        return 2;
    } /* gs.seethru */

    return 0;
}

/*
 * vision_reset()
 *
 * This must be called *after* the levl[][] structure is set with the new
 * level and the level monsters and objects are in place.
 */

export function vision_reset()
{
    let y;
    let x, i, dig_left, block;
    let lev;

    /* Start out with cs0 as our current array */
    C.gv.viz_array = C.cs_rows0;
    C.gv.viz_rmin = C.cs_rmin0;
    C.gv.viz_rmax = C.cs_rmax0;

    C.memset(C.could_see, 0, C.workspaceSize("could_see"));

    /* Reset the pointers and clear so that we have a "full" dungeon. */
    C.memset(C.viz_clear, 0, C.workspaceSize("viz_clear"));

    /* Dig the level */
    for (y = 0; y < C.ROWNO; y++) {
        dig_left = 0;
        block = 1; /* location (0,y) is always stone; it's !isok() */
        lev = C.levl[1][y];
        for (x = 1; x < C.COLNO; x++, lev = C.advance(lev, C.ROWNO))
            if (block != (C.IS_OBSTRUCTED(lev.typ) || does_block(x, y, lev))) {
                if (block) {
                    for (i = dig_left; i < x; i++) {
                        C.left_ptrs[y][i] = dig_left;
                        C.right_ptrs[y][i] = x - 1;
                    }
                } else {
                    i = dig_left;
                    if (dig_left)
                        dig_left--; /* point at first blocked point */
                    for (; i < x; i++) {
                        C.left_ptrs[y][i] = dig_left;
                        C.right_ptrs[y][i] = x;
                        C.viz_clear[y][i] = 1;
                    }
                }
                dig_left = x;
                block = !block;
            }
        /* handle right boundary; almost identical for blocked/unblocked */
        i = dig_left;
        if (!block && dig_left)
            dig_left--; /* point at first blocked point */
        for (; i < C.COLNO; i++) {
            C.left_ptrs[y][i] = dig_left;
            C.right_ptrs[y][i] = (C.COLNO - 1);
            C.viz_clear[y][i] = !block;
        }
    }

    C.iflags.vision_inited = 1; /* vision is ready */
    C.gv.vision_full_recalc = 1;   /* we want to run vision_recalc() */
}

/*
 * get_unused_cs()
 *
 * Called from vision_recalc() and at least one light routine.  Get pointers
 * to the unused vision work area.
 */

export function get_unused_cs(rows, rmin, rmax)
{
    let row;
    let nrmin,nrmax;

    if (C.samePointer(C.gv.viz_array, C.cs_rows0)) {
        rows.value = C.cs_rows1;
        rmin.value = C.cs_rmin1;
        rmax.value = C.cs_rmax1;
    } else {
        rows.value = C.cs_rows0;
        rmin.value = C.cs_rmin0;
        rmax.value = C.cs_rmax0;
    }

    /* return an initialized, unused work area */
    nrmin = rmin.value;
    nrmax = rmax.value;

    C.memset(rows.value[0], 0,
                  C.ROWNO * C.COLNO * C.seenVSize); /* see nothing */
    for (row = 0; row < C.ROWNO; row++) { /* set row min & max */
        nrmin[0] = C.COLNO - 1;
        nrmin = C.advance(nrmin, 1);
        nrmax[0] = 1;
        nrmax = C.advance(nrmax, 1);
    }
}

/*
 * rogue_vision()
 *
 * Set the "could see" and in sight bits so vision acts just like the old
 * rogue game:
 *
 *      + If in a room, the hero can see to the room boundaries.
 *      + The hero can always see adjacent squares.
 *
 * We set the in_sight bit here as well to escape a bug that shows up
 * due to the one-sided lit wall hack.
 */

export function rogue_vision(next, rmin, rmax)
{
    let rnum = C.levl[C.u.ux][C.u.uy].roomno - C.ROOMOFFSET; /* no SHARED... */
    let start, stop, in_door, xhi, xlo, yhi, ylo;
    let zx, zy;

    /* If in a lit room, we are able to see to its boundaries. */
    /* If dark, set COULD_SEE so various spells work -dlc */
    if (rnum >= 0) {
        for (zy = C.svr.rooms[rnum].ly - 1; zy <= C.svr.rooms[rnum].hy + 1; zy++) {
            rmin[zy] = start = C.svr.rooms[rnum].lx - 1;
            rmax[zy] = stop = C.svr.rooms[rnum].hx + 1;

            for (zx = start; zx <= stop; zx++) {
                if (C.svr.rooms[rnum].rlit) {
                    next[zy][zx] = C.COULD_SEE | C.IN_SIGHT;
                    C.levl[zx][zy].seenv = C.SVALL; /* see the walls */
                } else
                    next[zy][zx] = C.COULD_SEE;
            }
        }
    }

    in_door = C.levl[C.u.ux][C.u.uy].typ == C.DOOR;

    /* Can always see adjacent. */
    ylo = C.max(C.u.uy - 1, 0);
    yhi = C.min(C.u.uy + 1, C.ROWNO - 1);
    xlo = C.max(C.u.ux - 1, 1);
    xhi = C.min(C.u.ux + 1, C.COLNO - 1);
    for (zy = ylo; zy <= yhi; zy++) {
        if (xlo < rmin[zy])
            rmin[zy] = xlo;
        if (xhi > rmax[zy])
            rmax[zy] = xhi;

        for (zx = xlo; zx <= xhi; zx++) {
            next[zy][zx] = C.COULD_SEE | C.IN_SIGHT;
            /*
             * Yuck, update adjacent non-diagonal positions when in a doorway.
             * We need to do this to catch the case when we first step into
             * a room.  The room's walls were not seen from the outside, but
             * now are seen (the seen bits are set just above).  However, the
             * positions are not updated because they were already in sight.
             * So, we have to do it here.
             */
            if (in_door && (zx == C.u.ux || zy == C.u.uy))
                C.newsym(zx, zy);
        }
    }
}

/*#define EXTEND_SPINE*/ /* possibly better looking wall-angle */

/*
 * new_angle()
 *
 * Return the new angle seen by the hero for this location.  The angle
 * bit is given in the value pointed at by sv.
 *
 * For T walls and crosswall, just setting the angle bit, even though
 * it is technically correct, doesn't look good.  If we can see the
 * next position beyond the current one and it is a wall that we can
 * see, then we want to extend a spine of the T to connect with the wall
 * that is beyond.  Example:
 *
 *       Correct, but ugly                         Extend T spine
 *
 *              | ...                                   | ...
 *              | ...   <-- wall beyond & floor -->     | ...
 *              | ...                                   | ...
 * Unseen   -->   ...                                   | ...
 * spine        +-...   <-- trwall & doorway    -->     +-...
 *              | ...                                   | ...
 *
 *
 *                 @    <-- hero                -->        @
 *
 *
 * We fake the above check by only checking if the horizontal
 * & vertical positions adjacent to the crosswall and T wall are
 * unblocked.  Then, _in general_ we can see beyond.  Generally,
 * this is good enough.
 *
 *      + When this function is called we don't have all of the seen
 *        information (we're doing a top-down scan in vision_recalc).
 *        We would need to scan once to set all IN_SIGHT and COULD_SEE
 *        bits, then again to correctly set the seenv bits.
 *      + I'm trying to make this as cheap as possible.  The display
 *        & vision eat up too much CPU time.
 *
 *
 * Note:  Even as I write this, I'm still not convinced.  There are too
 *        many exceptions.  I may have to bite the bullet and do more
 *        checks.       - Dean 2/11/93
 */
/*
     * Do extra checks for crosswalls and T walls if we see them from
     * an angle.
     */
/*
 * new_angle()
 *
 * Return the new angle seen by the hero for this location.  The angle
 * bit is given in the value pointed at by sv.
 *
 * The other parameters are not used.
 */


/*
 * vision_recalc()
 *
 * Do all of the heavy vision work.  Recalculate all locations that could
 * possibly be seen by the hero --- if the location were lit, etc.  Note
 * which locations are actually seen because of lighting.  Then add to
 * this all locations that be seen by hero due to night vision and x-ray
 * vision.  Finally, compare with what the hero was able to see previously.
 * Update the difference.
 *
 * This function is usually called only when the variable 'vision_full_recalc'
 * is set.  The following is a list of places where this function is called,
 * with three valid values for the control flag parameter:
 *
 * Control flag = 0.  A complete vision recalculation.  Generate the vision
 * tables from scratch.  This is necessary to correctly set what the hero
 * can see.  (1) and (2) call this routine for synchronization purposes, (3)
 * calls this routine so it can operate correctly.
 *
 *      + After the monster move, before input from the player. [moveloop()]
 *      + At end of moveloop. [moveloop() ??? not sure why this is here]
 *      + Right before something is printed. [pline()]
 *      + Right before we do a vision-based operation. [do_clear_area()]
 *      + screen redraw, so we can renew all positions in sight. [docrt()]
 *      + When toggling temporary blindness, in case additional events
 *        impacted by vision occur during the same move [make_blinded()]
 *
 * Control flag = 1.  An adjacent vision recalculation.  The hero has moved
 * one square.  Knowing this, it might be possible to optimize the vision
 * recalculation using the current knowledge.  This is presently unimplemented
 * and is treated as a control = 0 call.
 *
 *      + Right after the hero moves. [domove()]
 *
 * Control flag = 2.  Turn off the vision system.  Nothing new will be
 * displayed, since nothing is seen.  This is usually done when you need
 * a newsym() run on all locations in sight, or on some locations but you
 * don't know which ones.
 *
 *      + Before a screen redraw, so all positions are renewed. [docrt()]
 *      + Right before the hero arrives on a new level. [goto_level()]
 *      + Right after a scroll of light is read. [litroom()]
 *      + After an option has changed that affects vision [parseoptions()]
 *      + Right after the hero is swallowed. [gulpmu()]
 *      + Just before bubbles are moved. [movebubbles()]
 */

export function vision_recalc(control)
{
     /* from display.c */
     /* cols to bump sv */
    let temp_array; /* points to the old vision array */
    let next_array; /* points to the new vision array */
    let next_row;    /* row pointer for the new array */
    let old_row;     /* row pointer for the old array */
    let next_rmin; /* min pointer for the new array */
    let next_rmax; /* max pointer for the new array */
    let ranges; /* circle ranges -- used for xray & night vision */
    let row = 0;       /* row counter (outer loop)  */
    let start, stop;   /* inner loop starting/stopping index */
    let dx, dy;        /* one step from a lit door or lit wall (see below) */
    let col;  /* inner loop counter */
    let lev; /* pointer to current pos */
    let flev;   /* pointer to position in "front" of current pos */
    let sv;   /* ptr to seen angle bits */
    let oldseenv;      /* previous seenv value */

    C.gv.vision_full_recalc = 0; /* reset flag */
    if (C.gi.in_mklev || C.program_state.in_getlev || !C.iflags.vision_inited)
        return;

    /*
     * Either the light sources have been taken care of, or we must
     * recalculate them here.
     */

    /* Get the unused could see, row min, and row max arrays. */
    get_unused_cs(C.reference(() => next_array, value => next_array = value), C.reference(() => next_rmin, value => next_rmin = value), C.reference(() => next_rmax, value => next_rmax = value));

    skip: {
    /* You see nothing, nothing can see you --- if swallowed or refreshing. */
    if (C.u.uswallow || control == 2) {
        /* do nothing -- get_unused_cs() nulls out the new work area */
        ;
    } else if (C.Blind) {
        /*
         * Calculate the could_see array even when blind so that monsters
         * can see you, even if you can't see them.  Note that the current
         * setup allows:
         *
         *      + Monsters to see with the "new" vision, even on the rogue
         *        level.
         *      + Monsters can see you even when you're in a pit.
         */
        view_from(C.u.uy, C.u.ux, next_array, next_rmin, next_rmax, 0,
                  0,
                  0);

        /*
         * Our own version of the update loop below.  We know we can't see
         * anything, so we only need to update positions we used to be able
         * to see.
         */
        temp_array = C.gv.viz_array; /* set gv.viz_array so newsym() will work */
        C.gv.viz_array = next_array;

        for (row = 0; row < C.ROWNO; row++) {
            old_row = temp_array[row];

            /* Find the min and max positions on the row. */
            start = C.min(C.gv.viz_rmin[row], next_rmin[row]);
            stop = C.max(C.gv.viz_rmax[row], next_rmax[row]);

            for (col = start; col <= stop; col++)
                if (old_row[col] & C.IN_SIGHT)
                    C.newsym(col, row);
        }

        /* skip the normal update loop */
        break skip;
    } else if (C.Is_rogue_level(C.u.uz)) {
        rogue_vision(next_array, next_rmin, next_rmax);
    } else {
        let lo_col, has_night_vision = 1; /* hero has night vision */

        if (C.Underwater && !C.Is_waterlevel(C.u.uz)) {
            /*
             * The hero is underwater.  Only see surrounding locations if
             * they are also underwater.  This overrides night vision but
             * does not override x-ray vision.
             */
            has_night_vision = 0;

            lo_col = C.max(C.u.ux - 1, 1);
            for (row = C.u.uy - 1; row <= C.u.uy + 1; row++)
                for (col = lo_col; col <= C.u.ux + 1; col++) {
                    if (!C.isok(col, row) || !C.is_pool(col, row))
                        continue;

                    next_rmin[row] = C.min(next_rmin[row], col);
                    next_rmax[row] = C.max(next_rmax[row], col);
                    next_array[row][col] = C.IN_SIGHT | C.COULD_SEE;
                }

        /* if in a pit, just update for immediate locations */
        } else if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
            for (row = C.u.uy - 1; row <= C.u.uy + 1; row++) {
                if (row < 0)
                    continue;
                if (row >= C.ROWNO)
                    break;

                next_rmin[row] = C.max(1, C.u.ux - 1);
                next_rmax[row] = C.min(C.COLNO - 1, C.u.ux + 1);
                next_row = next_array[row];

                for (col = next_rmin[row]; col <= next_rmax[row]; col++)
                    next_row[col] = C.IN_SIGHT | C.COULD_SEE;
            }
        } else
            view_from(C.u.uy, C.u.ux, next_array, next_rmin, next_rmax, 0,
                      0,
                      0);

        /*
         * Set the IN_SIGHT bit for xray and night vision.
         */
        if (C.u.xray_range >= 0) {
            if (C.u.xray_range) {
                ranges = C.circle_ptr(C.u.xray_range);

                for (row = C.u.uy - C.u.xray_range; row <= C.u.uy + C.u.xray_range;
                     row++) {
                    if (row < 0)
                        continue;
                    if (row >= C.ROWNO)
                        break;
                    dy = C.v_abs(C.u.uy - row);
                    next_row = next_array[row];

                    start = C.max(1, C.u.ux - ranges[dy]);
                    stop = C.min(C.COLNO - 1, C.u.ux + ranges[dy]);

                    for (col = start; col <= stop; col++) {
                        let old_row_val = next_row[col];

                        next_row[col] |= C.IN_SIGHT;
                        oldseenv = C.levl[col][row].seenv;
                        C.levl[col][row].seenv = C.SVALL; /* see all! */
                        /* Update if previously not in sight or new angle. */
                        if (!(old_row_val & C.IN_SIGHT) || oldseenv != C.SVALL)
                            C.newsym(col, row);
                    }

                    next_rmin[row] = C.min(start, next_rmin[row]);
                    next_rmax[row] = C.max(stop, next_rmax[row]);
                }

            } else { /* range is 0 */
                next_array[C.u.uy][C.u.ux] |= C.IN_SIGHT;
                C.levl[C.u.ux][C.u.uy].seenv = C.SVALL;
                next_rmin[C.u.uy] = C.min(C.u.ux, next_rmin[C.u.uy]);
                next_rmax[C.u.uy] = C.max(C.u.ux, next_rmax[C.u.uy]);
            }
        }

        if (has_night_vision && C.u.xray_range < C.u.nv_range) {
            if (!C.u.nv_range) { /* range is 0 */
                next_array[C.u.uy][C.u.ux] |= C.IN_SIGHT;
                C.levl[C.u.ux][C.u.uy].seenv = C.SVALL;
                next_rmin[C.u.uy] = C.min(C.u.ux, next_rmin[C.u.uy]);
                next_rmax[C.u.uy] = C.max(C.u.ux, next_rmax[C.u.uy]);
            } else if (C.u.nv_range > 0) {
                ranges = C.circle_ptr(C.u.nv_range);

                for (row = C.u.uy - C.u.nv_range; row <= C.u.uy + C.u.nv_range;
                     row++) {
                    if (row < 0)
                        continue;
                    if (row >= C.ROWNO)
                        break;
                    dy = C.v_abs(C.u.uy - row);
                    next_row = next_array[row];

                    start = C.max(1, C.u.ux - ranges[dy]);
                    stop = C.min(C.COLNO - 1, C.u.ux + ranges[dy]);

                    for (col = start; col <= stop; col++)
                        if (next_row[col])
                            next_row[col] |= C.IN_SIGHT;

                    next_rmin[row] = C.min(start, next_rmin[row]);
                    next_rmax[row] = C.max(stop, next_rmax[row]);
                }
            }
        }
    }

    /* Set the correct bits for all light sources. */
    C.do_light_sources(next_array);

    /*
     * Make the viz_array the new array so that cansee() will work correctly.
     */
    temp_array = C.gv.viz_array;
    C.gv.viz_array = next_array;

    /*
     * The main update loop.  Here we do two things:
     *
     *      + Set the IN_SIGHT bit for places that we could see and are lit.
     *      + Reset changed places.
     *
     * There is one thing that makes deciding what the hero can see
     * difficult:
     *
     *  1.  Directional lighting.  Items that block light create problems.
     *      The worst offenders are doors.  Suppose a door to a lit room
     *      is closed.  It is lit on one side, but not on the other.  How
     *      do you know?  You have to check the closest adjacent position.
     *      Even so, that is not entirely correct.  But it seems close
     *      enough for now.
     */
    C.colbump[C.u.ux] = C.colbump[C.u.ux + 1] = 1;
    for (row = 0; row < C.ROWNO; row++) {
        dy = C.u.uy - row;
        dy = C.sign(dy);
        next_row = next_array[row];
        old_row = temp_array[row];

        /* Find the min and max positions on the row. */
        start = C.min(C.gv.viz_rmin[row], next_rmin[row]);
        stop = C.max(C.gv.viz_rmax[row], next_rmax[row]);
        lev = C.levl[start][row];

        sv = C.element(C.seenv_matrix[dy + 1], start < C.u.ux ? 0 : (start > C.u.ux ? 2 : 1));

        for (col = start; col <= stop;
             lev = C.advance(lev, C.ROWNO), sv = C.advance(sv, C.colbump[++col])) {
            not_in_sight: {
            sight: {
            if (next_row[col] & C.IN_SIGHT) {
                /*
                 * We see this position because of night- or xray-vision.
                 */
                oldseenv = lev.seenv;
                lev.seenv |=
                    sv.value; /* update seen angle */

                /* Update pos if previously not in sight or new angle. */
                if (!(old_row[col] & C.IN_SIGHT) || oldseenv != lev.seenv)
                    C.newsym(col, row);

            } else if ((next_row[col] & C.COULD_SEE)
                     && (lev.lit || (next_row[col] & C.TEMP_LIT))) {
                /*
                 * We see this position because it is lit.
                 */
                if ((C.IS_DOOR(lev.typ) || lev.typ == C.SDOOR
                     || C.IS_WALL(lev.typ)) && !C.viz_clear[row][col]) {
                    /*
                     * Make sure doors, walls, boulders or mimics don't show
                     * up at the end of dark hallways.  We do this by checking
                     * the adjacent position.  If it is lit, then we can see
                     * the door or wall; otherwise we can't.
                     */
                    dx = C.u.ux - col;
                    dx = C.sign(dx);
                    flev = C.levl[col + dx][row + dy];
                    if (flev.lit
                        || next_array[row + dy][col + dx] & C.TEMP_LIT) {
                        next_row[col] |= C.IN_SIGHT; /* we see it */

                        oldseenv = lev.seenv;
                        lev.seenv |= sv.value;

                        /* Update pos if previously not in sight or new
                         * angle.*/
                        if (!(old_row[col] & C.IN_SIGHT)
                            || oldseenv != lev.seenv)
                            C.newsym(col, row);
                    } else
                        break sight; /* we don't see it */

                } else {
                    next_row[col] |= C.IN_SIGHT; /* we see it */

                    oldseenv = lev.seenv;
                    lev.seenv |= sv.value;

                    /* Update pos if previously not in sight or new angle. */
                    if (!(old_row[col] & C.IN_SIGHT) || oldseenv != lev.seenv)
                        C.newsym(col, row);
                }
            } else if ((next_row[col] & C.COULD_SEE) && lev.waslit) {
                /*
                 * If we make it here, the hero _could see_ the location,
                 * but doesn't see it (location is not lit).
                 * However, the hero _remembers_ it as lit (waslit is true).
                 * The hero can now see that it is not lit, so change waslit
                 * and update the location.
                 */
                lev.waslit = 0; /* remember lit condition */
                C.newsym(col, row);

            /*
             * At this point we know that the row position is *not* in normal
             * sight.  That is, the position could be seen, but is dark
             * or LOS is just plain blocked.
             *
             * Update the position if:
             * o If the old one *was* in sight.  We may need to clean up
             *   the glyph -- E.g. darken room spot, etc.
             * o If we now could see the location (yet the location is not
             *   lit), but previously we couldn't see the location, or vice
             *   versa.  Update the spot because there may be an
             *   infrared monster there.
             */
            } else {
                break sight;
            }
            break not_in_sight;
            }
                if ((old_row[col] & C.IN_SIGHT)
                    || ((next_row[col] & C.COULD_SEE)
                        ^ (old_row[col] & C.COULD_SEE)))
                {
                    /*
                     * TEMPORARY?  Sometimes we get here with col==0 and
                     * newsym()'s impossible() for !isok() is being
                     * triggered, so avoid calling it for <0,y>; other bad
                     * coordinates will produce a panic() as they should.
                     */
                    if (col != 0)
                    /*
                     */
                    C.newsym(col, row);
                }
            }

        } /* end for col . . */
    }     /* end for row . .  */
    C.colbump[C.u.ux] = C.colbump[C.u.ux + 1] = 0;

    }
    /* This newsym() caused a crash delivering msg about failure to open
     * dungeon file init_dungeons() -> panic() -> done(11) ->
     * vision_recalc(2) -> newsym() -> crash!  u.ux and u.uy are 0 and
     * program_state.panicking == 1 under those circumstances
     */
    if (!C.program_state.panicking)
        C.newsym(C.u.ux, C.u.uy); /* Make sure the hero shows up! */

    /* Set the new min and max pointers. */
    C.gv.viz_rmin = next_rmin;
    C.gv.viz_rmax = next_rmax;

    C.notice_all_mons(1);
}

/*
 * block_point()
 *
 * Make the location opaque to light.
 */

export function block_point(x, y)
{
    /* set DEBUGFILES=seethru in environment to see through clouds & water */
    if (C.gs.seethru == 0) { /* init once */
        C.gs.seethru = (C.wizard && C.explicitdebug("seethru")) ? 1 : -1;
    }
    if (C.gs.seethru == 1) {
        if (!does_block(x, y, C.levl[x][y]))
            return;
    }

    fill_point(y, x);

    /* recalc light sources here? */

    /*
     * We have to do a full vision recalculation if we "could see" the
     * location.  Why? Suppose some monster opened a way so that the
     * hero could see a lit room.  However, the position of the opening
     * was out of night-vision range of the hero.  Suddenly the hero should
     * see the lit room.
     */
    if (C.gv.viz_array[y][x])
        C.gv.vision_full_recalc = 1;
}

/*
 * unblock_point()
 *
 * Make the location transparent to light.
 */

export function unblock_point(x, y)
{
    dig_point(y, x);

    /* recalc light sources here? */

    if (C.gv.viz_array[y][x])
        C.gv.vision_full_recalc = 1;
}

/* recalc if point should be blocked or unblocked */

export function recalc_block_point(x, y)
{
    if (does_block(x, y, C.levl[x][y]))
        block_point(x, y);
    else
        unblock_point(x, y);
}

/*==========================================================================* \
 :                                                                          :
 :      Everything below this line uses (y,x) instead of (x,y) --- the      :
 :      algorithms are faster if they are less recursive and can scan       :
 :      on a row longer.                                                    :
 :                                                                          :
\*==========================================================================*/

/* ======================================================================= *\
                        Left and Right Pointer Updates
\* ======================================================================= */

/*
 *              LEFT and RIGHT pointer rules
 *
 *
 * **NOTE**  The rules changed on 4/4/90.  This comment reflects the
 * new rules.  The change was so that the stone-wall optimization
 * would work.
 *
 * OK, now the tough stuff.  We must maintain our left and right
 * row pointers.  The rules are as follows:
 *
 * Left Pointers:
 * ______________
 *
 * + If you are a clear spot, your left will point to the first
 *   stone to your left.  If there is none, then point the first
 *   legal position in the row (0).
 *
 * + If you are a blocked spot, then your left will point to the
 *   left-most blocked spot to your left that is connected to you.
 *   This means that a left-edge (a blocked spot that has an open
 *   spot on its left) will point to itself.
 *
 *
 * Right Pointers:
 * ---------------
 * + If you are a clear spot, your right will point to the first
 *   stone to your right.  If there is none, then point the last
 *   legal position in the row (COLNO-1).
 *
 * + If you are a blocked spot, then your right will point to the
 *   right-most blocked spot to your right that is connected to you.
 *   This means that a right-edge (a blocked spot that has an open
 *   spot on its right) will point to itself.
 */

export function dig_point(row, col)
{
    let i;

    if (C.viz_clear[row][col])
        return; /* already done */

    C.viz_clear[row][col] = 1;

    /*
     * Boundary cases first.
     */
    if (col == 0) { /* left edge */
        if (C.viz_clear[row][1]) {
            C.right_ptrs[row][0] = C.right_ptrs[row][1];
        } else {
            C.right_ptrs[row][0] = 1;
            for (i = 1; i <= C.right_ptrs[row][1]; i++)
                C.left_ptrs[row][i] = 1;
        }
    } else if (col == (C.COLNO - 1)) { /* right edge */

        if (C.viz_clear[row][C.COLNO - 2]) {
            C.left_ptrs[row][C.COLNO - 1] = C.left_ptrs[row][C.COLNO - 2];
        } else {
            C.left_ptrs[row][C.COLNO - 1] = C.COLNO - 2;
            for (i = C.left_ptrs[row][C.COLNO - 2]; i < C.COLNO - 1; i++)
                C.right_ptrs[row][i] = C.COLNO - 2;
        }

    /*
     * At this point, we know we aren't on the boundaries.
     */
    } else if (C.viz_clear[row][col - 1] && C.viz_clear[row][col + 1]) {
        /* Both sides clear */
        for (i = C.left_ptrs[row][col - 1]; i <= col; i++) {
            if (!C.viz_clear[row][i])
                continue; /* catch non-end case */
            C.right_ptrs[row][i] = C.right_ptrs[row][col + 1];
        }
        for (i = col; i <= C.right_ptrs[row][col + 1]; i++) {
            if (!C.viz_clear[row][i])
                continue; /* catch non-end case */
            C.left_ptrs[row][i] = C.left_ptrs[row][col - 1];
        }

    } else if (C.viz_clear[row][col - 1]) {
        /* Left side clear, right side blocked. */
        for (i = col + 1; i <= C.right_ptrs[row][col + 1]; i++)
            C.left_ptrs[row][i] = col + 1;

        for (i = C.left_ptrs[row][col - 1]; i <= col; i++) {
            if (!C.viz_clear[row][i])
                continue; /* catch non-end case */
            C.right_ptrs[row][i] = col + 1;
        }
        C.left_ptrs[row][col] = C.left_ptrs[row][col - 1];

    } else if (C.viz_clear[row][col + 1]) {
        /* Right side clear, left side blocked. */
        for (i = C.left_ptrs[row][col - 1]; i < col; i++)
            C.right_ptrs[row][i] = col - 1;

        for (i = col; i <= C.right_ptrs[row][col + 1]; i++) {
            if (!C.viz_clear[row][i])
                continue; /* catch non-end case */
            C.left_ptrs[row][i] = col - 1;
        }
        C.right_ptrs[row][col] = C.right_ptrs[row][col + 1];

    } else {
        /* Both sides blocked */
        for (i = C.left_ptrs[row][col - 1]; i < col; i++)
            C.right_ptrs[row][i] = col - 1;

        for (i = col + 1; i <= C.right_ptrs[row][col + 1]; i++)
            C.left_ptrs[row][i] = col + 1;

        C.left_ptrs[row][col] = col - 1;
        C.right_ptrs[row][col] = col + 1;
    }
}


export function fill_point(row, col)
{
    let i;

    if (!C.viz_clear[row][col])
        return;

    C.viz_clear[row][col] = 0;

    if (col == 0) {
        if (C.viz_clear[row][1]) { /* adjacent is clear */
            C.right_ptrs[row][0] = 0;
        } else {
            C.right_ptrs[row][0] = C.right_ptrs[row][1];
            for (i = 1; i <= C.right_ptrs[row][1]; i++)
                C.left_ptrs[row][i] = 0;
        }
    } else if (col == C.COLNO - 1) {
        if (C.viz_clear[row][C.COLNO - 2]) { /* adjacent is clear */
            C.left_ptrs[row][C.COLNO - 1] = C.COLNO - 1;
        } else {
            C.left_ptrs[row][C.COLNO - 1] = C.left_ptrs[row][C.COLNO - 2];
            for (i = C.left_ptrs[row][C.COLNO - 2]; i < C.COLNO - 1; i++)
                C.right_ptrs[row][i] = C.COLNO - 1;
        }

    /*
     * Else we know that we are not on an edge.
     */
    } else if (C.viz_clear[row][col - 1] && C.viz_clear[row][col + 1]) {
        /* Both sides clear */
        for (i = C.left_ptrs[row][col - 1] + 1; i <= col; i++)
            C.right_ptrs[row][i] = col;

        if (!C.left_ptrs[row][col - 1]) /* catch the end case */
            C.right_ptrs[row][0] = col;

        for (i = col; i < C.right_ptrs[row][col + 1]; i++)
            C.left_ptrs[row][i] = col;

        if (C.right_ptrs[row][col + 1] == C.COLNO - 1) /* catch the end case */
            C.left_ptrs[row][C.COLNO - 1] = col;

    } else if (C.viz_clear[row][col - 1]) {
        /* Left side clear, right side blocked. */
        for (i = col; i <= C.right_ptrs[row][col + 1]; i++)
            C.left_ptrs[row][i] = col;

        for (i = C.left_ptrs[row][col - 1] + 1; i < col; i++)
            C.right_ptrs[row][i] = col;

        if (!C.left_ptrs[row][col - 1]) /* catch the end case */
            C.right_ptrs[row][i] = col;

        C.right_ptrs[row][col] = C.right_ptrs[row][col + 1];

    } else if (C.viz_clear[row][col + 1]) {
        /* Right side clear, left side blocked. */
        for (i = C.left_ptrs[row][col - 1]; i <= col; i++)
            C.right_ptrs[row][i] = col;

        for (i = col + 1; i < C.right_ptrs[row][col + 1]; i++)
            C.left_ptrs[row][i] = col;

        if (C.right_ptrs[row][col + 1] == C.COLNO - 1) /* catch the end case */
            C.left_ptrs[row][i] = col;

        C.left_ptrs[row][col] = C.left_ptrs[row][col - 1];

    } else {
        /* Both sides blocked */
        for (i = C.left_ptrs[row][col - 1]; i <= col; i++)
            C.right_ptrs[row][i] = C.right_ptrs[row][col + 1];

        for (i = col; i <= C.right_ptrs[row][col + 1]; i++)
            C.left_ptrs[row][i] = C.left_ptrs[row][col - 1];
    }
}

/*==========================================================================*/
/*==========================================================================*/

/*
 * Variables local to Algorithm C.
 */










/*
 * Algorithm C uses the following macros:
 *
 *      good_row(z)       - Return TRUE if the argument is a legal row.
 *      set_cs(rowp,col)  - Set the local could see array.
 *      set_min(z)        - Save the min value of the argument and the current
 *                            row minimum.
 *      set_max(z)        - Save the max value of the argument and the current
 *                            row maximum.
 *
 * The last three macros depend on having local pointers row_min, row_max,
 * and rowp being set correctly.
 *
 * The assertions are included to pacify a static source code analyzer.
 * Compile with NDEBUG defined to suppress them.
 */

/*
 * clear_path()         expanded into 4 macros/functions:
 *
 *      q1_path()
 *      q2_path()
 *      q3_path()
 *      q4_path()
 *
 * "Draw" a line from the start to the given location.  Stop if we hit
 * something that blocks light.  The start and finish points themselves are
 * not checked, just the points between them.  These routines do _not_
 * expect to be called with the same starting and stopping point.
 *
 * These routines use the generalized integer Bresenham's algorithm (fast
 * line drawing) for all quadrants.  The algorithm was taken from _Procedural
 * Elements for Computer Graphics_, by David F. Rogers.  McGraw-Hill, 1985.
 */
/* quadrant calls are macros */

/*
 * When called, the result is in "result".
 * The first two arguments (srow,scol) are one end of the path.  The next
 * two arguments (row,col) are the destination.  The last argument is
 * used as a C language label.  This means that it must be different
 * in each pair of calls.
 */

/*
 *  Quadrant I (step < 0).
 */
/* default to a blocked path */
/* save the shifted values */
/* blocked */
/* blocked */

/*
 * Quadrant IV (step > 0).
 */
/* default to a blocked path */
/* save the shifted values */
/* blocked */
/* blocked */

/*
 * Quadrant II (step < 0).
 */
/* default to a blocked path */
/* save the shifted values */
/* blocked */
/* blocked */

/*
 * Quadrant III (step > 0).
 */
/* default to a blocked path */
/* save the shifted values */
/* blocked */
/* blocked */

/* !MACRO_CPATH -- quadrants are really functions */
/*
 * Quadrant I (step < 0).
 */
/* save the shifted values */
/* blocked */
/* blocked */
/*
 * Quadrant IV (step > 0).
 */
/* save the shifted values */
/* blocked */
/* blocked */
/*
 * Quadrant II (step < 0).
 */
/* save the shifted values */
/* blocked */
/* blocked */
/*
 * Quadrant III (step > 0).
 */
/* save the shifted values */
/* blocked */
/* blocked */
/* ?MACRO_CPATH */

/*
 * Use vision tables to determine if there is a clear path from
 * (col1,row1) to (col2,row2).  This is used by:
 *      m_cansee()
 *      m_canseeu()
 *      do_light_sources()
 */

export function clear_path(col1, row1, col2, row2)
{
    let result;

    if (col1 < col2) {
        if (row1 > row2) {
            cleardone: {
                let dx, dy;
                let k, err, x, y, dxs, dys;
                x = (col1);
                y = (row1);
                dx = (col2) -x;
                dy = y - (row2);
                result = 0;
                dxs = dx << 1;
                dys = dy << 1;
                if (dy > dx) {
                    err = dxs - dy;
                    for (k = dy - 1; k; k--) {
                        if (err >= 0) {
                            x++;
                            err -= dys;
                        }
                        y--;
                        err += dxs;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                else {
                    err = dys - dx;
                    for (k = dx - 1; k; k--) {
                        if (err >= 0) {
                            y--;
                            err -= dxs;
                        }
                        x++;
                        err += dys;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                result = 1;
            }
        } else {
            cleardone: {
                let dx, dy;
                let k, err, x, y, dxs, dys;
                x = (col1);
                y = (row1);
                dx = (col2) -x;
                dy = (row2) -y;
                result = 0;
                dxs = dx << 1;
                dys = dy << 1;
                if (dy > dx) {
                    err = dxs - dy;
                    for (k = dy - 1; k; k--) {
                        if (err >= 0) {
                            x++;
                            err -= dys;
                        }
                        y++;
                        err += dxs;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                else {
                    err = dys - dx;
                    for (k = dx - 1; k; k--) {
                        if (err >= 0) {
                            y++;
                            err -= dxs;
                        }
                        x++;
                        err += dys;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                result = 1;
            }
        }
    } else {
        if (row1 > row2) {
            cleardone: {
                let dx, dy;
                let k, err, x, y, dxs, dys;
                x = (col1);
                y = (row1);
                dx = x - (col2);
                dy = y - (row2);
                result = 0;
                dxs = dx << 1;
                dys = dy << 1;
                if (dy > dx) {
                    err = dxs - dy;
                    for (k = dy - 1; k; k--) {
                        if (err >= 0) {
                            x--;
                            err -= dys;
                        }
                        y--;
                        err += dxs;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                else {
                    err = dys - dx;
                    for (k = dx - 1; k; k--) {
                        if (err >= 0) {
                            y--;
                            err -= dxs;
                        }
                        x--;
                        err += dys;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                result = 1;
            }
        } else if (row1 == row2 && col1 == col2) {
            result = 1;
        } else {
            cleardone: {
                let dx, dy;
                let k, err, x, y, dxs, dys;
                x = (col1);
                y = (row1);
                dx = x - (col2);
                dy = (row2) -y;
                result = 0;
                dxs = dx << 1;
                dys = dy << 1;
                if (dy > dx) {
                    err = dxs - dy;
                    for (k = dy - 1; k; k--) {
                        if (err >= 0) {
                            x--;
                            err -= dys;
                        }
                        y++;
                        err += dxs;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                else {
                    err = dys - dx;
                    for (k = dx - 1; k; k--) {
                        if (err >= 0) {
                            y++;
                            err -= dxs;
                        }
                        x--;
                        err += dys;
                        if (!C.is_clear(y, x)) break cleardone;
                    }
                }
                result = 1;
            }
        }
    }

    return C.boolean(result);
}

/*==========================================================================*\
                            GENERAL LINE OF SIGHT
                                Algorithm C
\*==========================================================================*/

/*
 * Defines local to Algorithm C.
 */



/* Initialize algorithm C (nothing). */

export function view_init()
{
}

/*
 * Mark positions as visible on one quadrant of the right side.  The
 * quadrant is determined by the value of the global variable step.
 *
 * Arguments:
 *   row         current row
 *   left        first (left side) visible spot on prev row
 *   right_mark  last (right side) visible spot on prev row
 *   limits      points at range limit for current row, or NULL
 */

export function right_side(row, left, right_mark, limits)
{
    let right;                  /* right limit of "could see" */
    let right_edge;             /* right edge of an opening */
    let nrow;                   /* new row (calculate once) */
    let deeper;                 /* if TRUE, call self as needed */
    let result;                 /* set by q?_path() */
    let i;             /* loop counter */
    let rowp = 0; /* row optimization */
    let row_min = 0;     /* left most  [used by macro set_min()] */
    let row_max = 0;     /* right most [used by macro set_max()] */
    let lim_max;                /* right most limit of circle */

    nrow = row + C.step;
    /*
     * Can go deeper if the row is in bounds and the next row is within
     * the circle's limit.  We tell the latter by checking to see if the next
     * limit value is the start of a new circle radius (meaning we depend
     * on the structure of circle_data[]).
     */
    deeper = C.good_row(nrow) && (!limits || (limits[0] >= limits[1]));
    if (!C.vis_func) {
        rowp = C.cs_rows[row]; /* optimization */
        row_min = C.element(C.cs_left, row);
        row_max = C.element(C.cs_right, row);
    }
    if (limits) {
        lim_max = C.start_col + limits[0];
        if (lim_max > C.COLNO - 1)
            lim_max = C.COLNO - 1;
        if (right_mark > lim_max)
            right_mark = lim_max;
        limits = C.advance(limits, 1); /* prepare for next row */
    } else
        lim_max = C.COLNO - 1;

    while (left <= right_mark) {
        right_edge = C.right_ptrs[row][left];
        if (right_edge > lim_max)
            right_edge = lim_max;

        if (!C.is_clear(row, left)) {
            /*
             * Jump to the far side of a stone wall.  We can set all
             * the points in between as seen.
             *
             * If the right edge goes beyond the right mark, check to see
             * how much we can see.
             */
            if (right_edge > right_mark) {
                /*
                 * If the mark on the previous row was a clear position,
                 * the odds are that we can actually see part of the wall
                 * beyond the mark on this row.  If so, then see one beyond
                 * the mark.  Otherwise don't.  This is a kludge so corners
                 * with an adjacent doorway show up in nethack.
                 */
                right_edge = C.is_clear(row - C.step, right_mark) ? right_mark + 1
                                                              : right_mark;
            }
            if (C.vis_func) {
                for (i = left; i <= right_edge; i++)
                    C.invoke(C.vis_func, i, row, C.varg);
            } else {
                for (i = left; i <= right_edge; i++)
                    { C.assert(rowp, "rowp != NULL", "right_side", 1735); { C.assert(rowp, "rowp != NULL", "right_side", 1840); rowp[i] = C.COULD_SEE; } }
                { C.assert(row_min, "row_min != NULL", "right_side", 1736); { C.assert(row_min, "row_min != NULL", "right_side", 1841); if (row_min.value > (left)) row_min.value = (left); } }
                { C.assert(row_max, "row_max != NULL", "right_side", 1737); if (row_max.value < (right_edge)) row_max.value = (right_edge); }
            }
            left = right_edge + 1; /* no limit check necessary */
            continue;
        }

        /* No checking needed if our left side is the start column. */
        if (left != C.start_col) {
            /*
             * Find the left side.  Move right until we can see it or we run
             * into a wall.
             */
            for (; left <= right_edge; left++) {
                if (C.step < 0) {
                    rside1: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = (left) -x;
                        dy = y - (row);
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x++;
                                    err -= dys;
                                }
                                y--;
                                err += dxs;
                                if (!C.is_clear(y, x)) break rside1;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y--;
                                    err -= dxs;
                                }
                                x++;
                                err += dys;
                                if (!C.is_clear(y, x)) break rside1;
                            }
                        }
                        result = 1;
                    }
                } else {
                    rside1: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = (left) -x;
                        dy = (row) -y;
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x++;
                                    err -= dys;
                                }
                                y++;
                                err += dxs;
                                if (!C.is_clear(y, x)) break rside1;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y++;
                                    err -= dxs;
                                }
                                x++;
                                err += dys;
                                if (!C.is_clear(y, x)) break rside1;
                            }
                        }
                        result = 1;
                    }
                }
        /* used if q?_path() is a macro */
                if (result)
                    break;
            }

            /*
             * Check for boundary conditions.  We *need* check (2) to break
             * an infinite loop where:
             *
             *           left == right_edge == right_mark == lim_max.
             *
             */
            if (left > lim_max)
                return;            /* check (1) */
            if (left == lim_max) { /* check (2) */
                if (C.vis_func) {
                    C.invoke(C.vis_func, lim_max, row, C.varg);
                } else {
                    { C.assert(rowp, "rowp != NULL", "right_side", 1773); rowp[lim_max] = C.COULD_SEE; }
                    { C.assert(row_max, "row_max != NULL", "right_side", 1774); if (row_max.value < (lim_max)) row_max.value = (lim_max); }
                }
                return;
            }
            /*
             * Check if we can see any spots in the opening.  We might
             * (left == right_edge) or might not (left == right_edge+1) have
             * been able to see the far wall.  Make sure we *can* see the
             * wall (remember, we can see the spot above/below this one)
             * by backing up.
             */
            if (left >= right_edge) {
                left = right_edge; /* for the case left == right_edge+1 */
                continue;
            }
        }

        /*
         * Find the right side.  If the marker from the previous row is
         * closer than the edge on this row, then we have to check
         * how far we can see around the corner (under the overhang).  Stop
         * at the first non-visible spot or we actually hit the far wall.
         *
         * Otherwise, we know we can see the right edge of the current row.
         *
         * This must be a strict "less than" so that we can always see a
         * horizontal wall, even if it is adjacent to us.
         */
        if (right_mark < right_edge) {
            for (right = right_mark; right <= right_edge; right++) {
                if (C.step < 0) {
                    rside2: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = (right) -x;
                        dy = y - (row);
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x++;
                                    err -= dys;
                                }
                                y--;
                                err += dxs;
                                if (!C.is_clear(y, x)) break rside2;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y--;
                                    err -= dxs;
                                }
                                x++;
                                err += dys;
                                if (!C.is_clear(y, x)) break rside2;
                            }
                        }
                        result = 1;
                    }
                } else {
                    rside2: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = (right) -x;
                        dy = (row) -y;
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x++;
                                    err -= dys;
                                }
                                y++;
                                err += dxs;
                                if (!C.is_clear(y, x)) break rside2;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y++;
                                    err -= dxs;
                                }
                                x++;
                                err += dys;
                                if (!C.is_clear(y, x)) break rside2;
                            }
                        }
                        result = 1;
                    }
                }
        /* used if q?_path() is a macro */
                if (!result)
                    break;
            }
            --right; /* get rid of the last increment */
        } else
            right = right_edge;

        /*
         * We have the range that we want.  Set the bits.  Note that
         * there is no else --- we no longer handle splinters.
         */
        if (left <= right) {
            /*
             * An ugly special case.  If you are adjacent to a vertical wall
             * and it has a break in it, then the right mark is set to be
             * start_col.  We *want* to be able to see adjacent vertical
             * walls, so we have to set it back.
             */
            if (left == right && left == C.start_col && C.start_col < (C.COLNO - 1)
                && !C.is_clear(row, C.start_col + 1))
                right = C.start_col + 1;

            if (right > lim_max)
                right = lim_max;
            /* set the bits */
            if (C.vis_func) {
                for (i = left; i <= right; i++)
                    C.invoke(C.vis_func, i, row, C.varg);
            } else {
                for (i = left; i <= right; i++)
                    rowp[i] = C.COULD_SEE;
                if (row_min.value > (left)) row_min.value = (left);
                { C.assert(row_max, "row_max != NULL", "right_side", 1842); if (row_max.value < (right)) row_max.value = (right); }
            }

            /* recursive call for next finger of light */
            if (deeper)
                right_side(nrow, left, right, limits);
            left = right + 1; /* no limit check necessary */
        }
    }
}

/*
 * This routine is the mirror image of right_side().  See right_side() for
 * extensive comments.
 */

export function left_side(row, left_mark, right, limits)
{
    let left, left_edge, nrow, deeper, result;
    let i;
    let rowp = 0;
    let row_min = 0;
    let row_max = 0;
    let lim_min;

    nrow = row + C.step;
    deeper = C.good_row(nrow) && (!limits || (limits[0] >= limits[1]));
    if (!C.vis_func) {
        rowp = C.cs_rows[row];
        row_min = C.element(C.cs_left, row);
        row_max = C.element(C.cs_right, row);
    }
    if (limits) {
        lim_min = C.start_col - limits[0];
        if (lim_min < 0)
            lim_min = 0;
        if (left_mark < lim_min)
            left_mark = lim_min;
        limits = C.advance(limits, 1); /* prepare for next row */
    } else
        lim_min = 0;

    while (right >= left_mark) {
        left_edge = C.left_ptrs[row][right];
        if (left_edge < lim_min)
            left_edge = lim_min;

        if (!C.is_clear(row, right)) {
            /* Jump to the far side of a stone wall. */
            if (left_edge < left_mark) {
                /* Maybe see more (kludge). */
                left_edge = C.is_clear(row - C.step, left_mark) ? left_mark - 1
                                                            : left_mark;
            }
            if (C.vis_func) {
                for (i = left_edge; i <= right; i++)
                    C.invoke(C.vis_func, i, row, C.varg);
            } else {
                for (i = left_edge; i <= right; i++)
                    { C.assert(rowp, "rowp != NULL", "left_side", 1905); { C.assert(rowp, "rowp != NULL", "left_side", 1974); rowp[i] = C.COULD_SEE; } }
                { C.assert(row_min, "row_min != NULL", "left_side", 1906); if (row_min.value > (left_edge)) row_min.value = (left_edge); }
                { C.assert(row_max, "row_max != NULL", "left_side", 1907); { C.assert(row_max, "row_max != NULL", "left_side", 1976); if (row_max.value < (right)) row_max.value = (right); } }
            }
            right = left_edge - 1; /* no limit check necessary */
            continue;
        }

        if (right != C.start_col) {
            /* Find the right side. */
            for (; right >= left_edge; right--) {
                if (C.step < 0) {
                    lside1: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = x - (right);
                        dy = y - (row);
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x--;
                                    err -= dys;
                                }
                                y--;
                                err += dxs;
                                if (!C.is_clear(y, x)) break lside1;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y--;
                                    err -= dxs;
                                }
                                x--;
                                err += dys;
                                if (!C.is_clear(y, x)) break lside1;
                            }
                        }
                        result = 1;
                    }
                } else {
                    lside1: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = x - (right);
                        dy = (row) -y;
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x--;
                                    err -= dys;
                                }
                                y++;
                                err += dxs;
                                if (!C.is_clear(y, x)) break lside1;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y++;
                                    err -= dxs;
                                }
                                x--;
                                err += dys;
                                if (!C.is_clear(y, x)) break lside1;
                            }
                        }
                        result = 1;
                    }
                }
        /* used if q?_path() is a macro */
                if (result)
                    break;
            }

            /* Check for boundary conditions. */
            if (right < lim_min)
                return;
            if (right == lim_min) {
                if (C.vis_func) {
                    C.invoke(C.vis_func, lim_min, row, C.varg);
                } else {
                    { C.assert(rowp, "rowp != NULL", "left_side", 1933); rowp[lim_min] = C.COULD_SEE; }
                    { C.assert(row_min, "row_min != NULL", "left_side", 1934); if (row_min.value > (lim_min)) row_min.value = (lim_min); }
                }
                return;
            }
            /* Check if we can see any spots in the opening. */
            if (right <= left_edge) {
                right = left_edge;
                continue;
            }
        }

        /* Find the left side. */
        if (left_mark > left_edge) {
            for (left = left_mark; left >= left_edge; --left) {
                if (C.step < 0) {
                    lside2: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = x - (left);
                        dy = y - (row);
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x--;
                                    err -= dys;
                                }
                                y--;
                                err += dxs;
                                if (!C.is_clear(y, x)) break lside2;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y--;
                                    err -= dxs;
                                }
                                x--;
                                err += dys;
                                if (!C.is_clear(y, x)) break lside2;
                            }
                        }
                        result = 1;
                    }
                } else {
                    lside2: {
                        let dx, dy;
                        let k, err, x, y, dxs, dys;
                        x = (C.start_col);
                        y = (C.start_row);
                        dx = x - (left);
                        dy = (row) -y;
                        result = 0;
                        dxs = dx << 1;
                        dys = dy << 1;
                        if (dy > dx) {
                            err = dxs - dy;
                            for (k = dy - 1; k; k--) {
                                if (err >= 0) {
                                    x--;
                                    err -= dys;
                                }
                                y++;
                                err += dxs;
                                if (!C.is_clear(y, x)) break lside2;
                            }
                        }
                        else {
                            err = dys - dx;
                            for (k = dx - 1; k; k--) {
                                if (err >= 0) {
                                    y++;
                                    err -= dxs;
                                }
                                x--;
                                err += dys;
                                if (!C.is_clear(y, x)) break lside2;
                            }
                        }
                        result = 1;
                    }
                }
        /* used if q?_path() is a macro */
                if (!result)
                    break;
            }
            left++; /* get rid of the last decrement */
        } else
            left = left_edge;

        if (left <= right) {
            /* An ugly special case. */
            if (left == right && right == C.start_col && C.start_col > 0
                && !C.is_clear(row, C.start_col - 1))
                left = C.start_col - 1;

            if (left < lim_min)
                left = lim_min;
            if (C.vis_func) {
                for (i = left; i <= right; i++)
                    C.invoke(C.vis_func, i, row, C.varg);
            } else {
                for (i = left; i <= right; i++)
                    rowp[i] = C.COULD_SEE;
                { C.assert(row_min, "row_min != NULL", "left_side", 1975); if (row_min.value > (left)) row_min.value = (left); }
                if (row_max.value < (right)) row_max.value = (right);
            }

            /* Recurse */
            if (deeper)
                left_side(nrow, left, right, limits);
            right = left - 1; /* no limit check necessary */
        }
    }
}

/*
 * Calculate all possible visible locations from the given location
 * (srow,scol).  NOTE this is (y,x)!  Mark the visible locations in the
 * array provided.
 *
 * Arguments
 *   srow, scol     starting row and column
 *   loc_cs_rows    pointers to the rows of the could_see array
 *   left_most      min mark on each row
 *   right_most     max mark on each row
 *   range          0 if unlimited
 *   func           function to call on each spot
 *   arg            argument for func
 */

export function view_from(srow, scol, loc_cs_rows, left_most, right_most, range, func, arg)
{
    let i; /* loop counter */
    let rowp;    /* optimization for setting could_see */
    let nrow;       /* the next row */
    let left;       /* the left-most visible column */
    let right;      /* the right-most visible column */
    let limits;   /* range limit for next row */

    /* Set globals for q?_path(), left_side(), and right_side() to use. */
    C.start_col = scol;
    C.start_row = srow;
    C.cs_rows = loc_cs_rows; /* 'could see' rows */
    C.cs_left = left_most;
    C.cs_right = right_most;
    C.vis_func = func;
    C.varg = arg;

    /*
     * Determine extent of sight on the starting row.
     */
    if (C.is_clear(srow, scol)) {
        left = C.left_ptrs[srow][scol];
        right = C.right_ptrs[srow][scol];
    } else {
        /*
         * When in stone, you can only see your adjacent squares, unless
         * you are on an array boundary or a stone/clear boundary.
         */
        left = (!scol) ? 0
                       : (C.is_clear(srow, scol - 1) ? C.left_ptrs[srow][scol - 1]
                                                   : scol - 1);
        right = (scol == C.COLNO - 1)
                    ? C.COLNO - 1
                    : (C.is_clear(srow, scol + 1) ? C.right_ptrs[srow][scol + 1]
                                                : scol + 1);
    }

    if (range) {
        if (range > C.MAX_RADIUS || range < 1)
            C.panic("view_from called with range %d", range);
        limits = C.advance(C.circle_ptr(range), 1); /* start at next row */
        if (left < scol - range)
            left = scol - range;
        if (right > scol + range)
            right = scol + range;
    } else
        limits = 0;

    if (func) {
        for (i = left; i <= right; i++)
            C.invoke(func, i, srow, arg);
    } else {
        /* Row pointer optimization. */
        rowp = C.cs_rows[srow];

        /* We know that we can see our row. */
        for (i = left; i <= right; i++)
            { C.assert(rowp, "rowp != NULL", "view_from", 2066); rowp[i] = C.COULD_SEE; }
        C.cs_left[srow] = left;
        C.cs_right[srow] = right;
    }

    /*
     * Check what could be seen in quadrants.  We need to check for valid
     * rows here, since we don't do it in the routines right_side() and
     * left_side() [ugliness to remove extra routine calls].
     */
    if ((nrow = srow + 1) < C.ROWNO) { /* move down */
        C.step = 1;
        if (scol < C.COLNO - 1)
            right_side(nrow, scol, right, limits);
        if (scol)
            left_side(nrow, left, scol, limits);
    }

    if ((nrow = srow - 1) >= 0) { /* move up */
        C.step = -1;
        if (scol < C.COLNO - 1)
            right_side(nrow, scol, right, limits);
        if (scol)
            left_side(nrow, left, scol, limits);
    }
}

/*===== End of algorithm C =====*/

/*
 * AREA OF EFFECT "ENGINE"
 *
 * Calculate all possible visible locations as viewed from the given location
 * (srow,scol) within the range specified. Perform "func" with (x, y) args and
 * additional argument "arg" for each square.
 *
 * If not centered on the hero, just forward arguments to view_from(); it
 * will call "func" when necessary.  If the hero is the center, use the
 * vision matrix and reduce extra work.
 */

export function do_clear_area(scol, srow, range, func, arg)
{
    /* If not centered on hero, do the hard work of figuring the area */
    if (scol != C.u.ux || srow != C.u.uy) {
        view_from(srow, scol, 0, 0, 0,
                  range, func, arg);
    } else {
        let x;
        let y, min_x, max_x, max_y, offset;
        let limits;
        let override_vision;

        /* vision doesn't pass through water or clouds, detection should
           [this probably ought to be an arg supplied by our caller...] */
        override_vision = (C.detecting(func)
                           && (C.Is_waterlevel(C.u.uz) || C.Is_airlevel(C.u.uz)));

        if (range > C.MAX_RADIUS || range < 1)
            C.panic("do_clear_area:  illegal range %d", range);
        if (C.gv.vision_full_recalc)
            vision_recalc(0); /* recalc vision if dirty */
        limits = C.circle_ptr(range);
        if ((max_y = (srow + range)) >= C.ROWNO)
            max_y = C.ROWNO - 1;
        if ((y = (srow - range)) < 0)
            y = 0;
        for (; y <= max_y; y++) {
            offset = limits[C.v_abs(y - srow)];
            if ((min_x = (scol - offset)) < 1)
                min_x = 1;
            if ((max_x = (scol + offset)) >= C.COLNO)
                max_x = C.COLNO - 1;
            for (x = min_x; x <= max_x; x++)
                if (C.couldsee(x, y) || override_vision)
                    C.invoke(func, x, y, arg);
        }
    }
}

/* bitmask indicating ways mon is seen; extracted from lookat(pager.c) */

export function howmonseen(mon)
{
    let useemon = C.boolean(C.canseemon(mon));
    let xraydist = (C.u.xray_range < 0) ? -1 : (C.u.xray_range * C.u.xray_range);
    let how_seen = 0; /* result */

    /* assert(mon != NULL) */
    /* normal vision;
       cansee is true for both normal and astral vision,
       but couldsee it not true for astral vision */
    if ((mon.wormno ? C.worm_known(mon) : (C.cansee(mon.mx, mon.my)
                                          && C.couldsee(mon.mx, mon.my)))
        && C.mon_visible(mon) && !mon.minvis)
        how_seen |= C.MONSEEN_NORMAL;
    /* see invisible */
    if (useemon && mon.minvis)
        how_seen |= C.MONSEEN_SEEINVIS;
    /* infravision */
    if ((!mon.minvis || C.See_invisible) && C.see_with_infrared(mon))
        how_seen |= C.MONSEEN_INFRAVIS;
    /* telepathy */
    if (C.tp_sensemon(mon))
        how_seen |= C.MONSEEN_TELEPAT;
    /* xray */
    if (useemon && xraydist > 0 && C.mdistu(mon) <= xraydist)
        how_seen |= C.MONSEEN_XRAYVIS;
    /* extended detection */
    if (C.Detect_monsters)
        how_seen |= C.MONSEEN_DETECT;
    /* class-/type-specific warning */
    if (C.MATCH_WARN_OF_MON(mon))
        how_seen |= C.MONSEEN_WARNMON;

    return how_seen;
}

/*vision.c*/
