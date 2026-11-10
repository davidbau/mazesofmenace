/* NetHack 5.0	extralev.c	$NHDT-Date: 1737345573 2025/01/19 19:59:33 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.28 $ */
/*      Copyright 1988, 1989 by Ken Arromdee                      */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * Support code for "rogue"-style level.
 */

import { C } from './c-runtime.js';

/* JavaScript translation of extralev.c. All six original function boundaries
 * remain. The C here/doorhere macros expand at each use so changes to x/y
 * select the current room, including inside the recursive walk. ABI views
 * preserve C field widths; C.coordxy preserves signed16 automatic stores and
 * parameter conversions. RNG annotations match Clang's closing invocation
 * line; source argument order remains visible. Object long quantities use
 * BigInt. nhUse is already an inactive macro in this game build.
 */

const XL_UP = 1;
const XL_DOWN = 2;
const XL_LEFT = 4;
const XL_RIGHT = 8;

// staticfn void roguejoin(coordxy, coordxy, coordxy, coordxy, int);
// staticfn void roguecorr(coordxy, coordxy, int);
// staticfn void miniwalk(coordxy, coordxy);

export function roguejoin(x1, y1, x2, y2, horiz)
{
    x1 = C.coordxy(x1);
    y1 = C.coordxy(y1);
    x2 = C.coordxy(x2);
    y2 = C.coordxy(y2);

    let x, y, middle;

    if (horiz) {
        middle = C.coordxy(x1 + C.rn2(x2 - x1 + 1, 26, 'roguejoin'));
        for (x = C.coordxy(Math.min(x1, middle)); x <= Math.max(x1, middle); x = C.coordxy(x + 1))
            corr(x, y1);
        for (y = C.coordxy(Math.min(y1, y2)); y <= Math.max(y1, y2); y = C.coordxy(y + 1))
            corr(middle, y);
        for (x = C.coordxy(Math.min(middle, x2)); x <= Math.max(middle, x2); x = C.coordxy(x + 1))
            corr(x, y2);
    } else {
        middle = C.coordxy(y1 + C.rn2(y2 - y1 + 1, 34, 'roguejoin'));
        for (y = C.coordxy(Math.min(y1, middle)); y <= Math.max(y1, middle); y = C.coordxy(y + 1))
            corr(x1, y);
        for (x = C.coordxy(Math.min(x1, x2)); x <= Math.max(x1, x2); x = C.coordxy(x + 1))
            corr(x, middle);
        for (y = C.coordxy(Math.min(middle, y2)); y <= Math.max(middle, y2); y = C.coordxy(y + 1))
            corr(x2, y);
    }
}

export function roguecorr(x, y, dir)
{
    x = C.coordxy(x);
    y = C.coordxy(y);

    let fromx, fromy, tox, toy;

    if (dir == XL_DOWN) {
        C.gr.r[x][y].doortable &= ~XL_DOWN;
        if (!C.gr.r[x][y].real) {
            fromx = C.coordxy(C.gr.r[x][y].rlx);
            fromy = C.coordxy(C.gr.r[x][y].rly);
            fromx = C.coordxy(fromx + 1 + 26 * x);
            fromy = C.coordxy(fromy + 7 * y);
        } else {
            fromx = C.coordxy(C.gr.r[x][y].rlx + C.rn2(C.gr.r[x][y].dx, 57, 'roguecorr'));
            fromy = C.coordxy(C.gr.r[x][y].rly + C.gr.r[x][y].dy);
            fromx = C.coordxy(fromx + 1 + 26 * x);
            fromy = C.coordxy(fromy + 7 * y);
            if (!C.IS_WALL(C.levl[fromx][fromy].typ))
                C.impossible("down: no wall at %d,%d?", fromx, fromy);
            C.dodoor(fromx, fromy, C.svr.rooms[C.gr.r[x][y].nroom]);
            C.levl[fromx][fromy].doormask = C.D_NODOOR;
            fromy = C.coordxy(fromy + 1);
        }
        if (y >= 2) {
            C.impossible("down door from %d,%d going nowhere?", x, y);
            return;
        }
        y = C.coordxy(y + 1);
        C.gr.r[x][y].doortable &= ~XL_UP;
        if (!C.gr.r[x][y].real) {
            tox = C.coordxy(C.gr.r[x][y].rlx);
            toy = C.coordxy(C.gr.r[x][y].rly);
            tox = C.coordxy(tox + 1 + 26 * x);
            toy = C.coordxy(toy + 7 * y);
        } else {
            tox = C.coordxy(C.gr.r[x][y].rlx + C.rn2(C.gr.r[x][y].dx, 79, 'roguecorr'));
            toy = C.coordxy(C.gr.r[x][y].rly - 1);
            tox = C.coordxy(tox + 1 + 26 * x);
            toy = C.coordxy(toy + 7 * y);
            if (!C.IS_WALL(C.levl[tox][toy].typ))
                C.impossible("up: no wall at %d,%d?", tox, toy);
            C.dodoor(tox, toy, C.svr.rooms[C.gr.r[x][y].nroom]);
            C.levl[tox][toy].doormask = C.D_NODOOR;
            toy = C.coordxy(toy - 1);
        }
        roguejoin(fromx, fromy, tox, toy, 0);
        return;
    } else if (dir == XL_RIGHT) {
        C.gr.r[x][y].doortable &= ~XL_RIGHT;
        if (!C.gr.r[x][y].real) {
            fromx = C.coordxy(C.gr.r[x][y].rlx);
            fromy = C.coordxy(C.gr.r[x][y].rly);
            fromx = C.coordxy(fromx + 1 + 26 * x);
            fromy = C.coordxy(fromy + 7 * y);
        } else {
            fromx = C.coordxy(C.gr.r[x][y].rlx + C.gr.r[x][y].dx);
            fromy = C.coordxy(C.gr.r[x][y].rly + C.rn2(C.gr.r[x][y].dy, 100, 'roguecorr'));
            fromx = C.coordxy(fromx + 1 + 26 * x);
            fromy = C.coordxy(fromy + 7 * y);
            if (!C.IS_WALL(C.levl[fromx][fromy].typ))
                C.impossible("down: no wall at %d,%d?", fromx, fromy);
            C.dodoor(fromx, fromy, C.svr.rooms[C.gr.r[x][y].nroom]);
            C.levl[fromx][fromy].doormask = C.D_NODOOR;
            fromx = C.coordxy(fromx + 1);
        }
        if (x >= 2) {
            C.impossible("right door from %d,%d going nowhere?", x, y);
            return;
        }
        x = C.coordxy(x + 1);
        C.gr.r[x][y].doortable &= ~XL_LEFT;
        if (!C.gr.r[x][y].real) {
            tox = C.coordxy(C.gr.r[x][y].rlx);
            toy = C.coordxy(C.gr.r[x][y].rly);
            tox = C.coordxy(tox + 1 + 26 * x);
            toy = C.coordxy(toy + 7 * y);
        } else {
            tox = C.coordxy(C.gr.r[x][y].rlx - 1);
            toy = C.coordxy(C.gr.r[x][y].rly + C.rn2(C.gr.r[x][y].dy, 122, 'roguecorr'));
            tox = C.coordxy(tox + 1 + 26 * x);
            toy = C.coordxy(toy + 7 * y);
            if (!C.IS_WALL(C.levl[tox][toy].typ))
                C.impossible("left: no wall at %d,%d?", tox, toy);
            C.dodoor(tox, toy, C.svr.rooms[C.gr.r[x][y].nroom]);
            C.levl[tox][toy].doormask = C.D_NODOOR;
            tox = C.coordxy(tox - 1);
        }
        roguejoin(fromx, fromy, tox, toy, 1);
        return;
    } else
        C.impossible("corridor in direction %d?", dir);
}

/* Modified walkfrom() from mkmaze.c */
export function miniwalk(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);

    let q, dir;
    let dirs = new Int32Array(4);

    while (1) {
        q = 0;
// #define doorhere (gr.r[x][y].doortable)
        if (x > 0 && (!(C.gr.r[x][y].doortable & XL_LEFT))
            && (!C.gr.r[x - 1][y].doortable || !C.rn2(10, 148, 'miniwalk')))
            dirs[q++] = 0;
        if (x < 2 && (!(C.gr.r[x][y].doortable & XL_RIGHT))
            && (!C.gr.r[x + 1][y].doortable || !C.rn2(10, 151, 'miniwalk')))
            dirs[q++] = 1;
        if (y > 0 && (!(C.gr.r[x][y].doortable & XL_UP))
            && (!C.gr.r[x][y - 1].doortable || !C.rn2(10, 154, 'miniwalk')))
            dirs[q++] = 2;
        if (y < 2 && (!(C.gr.r[x][y].doortable & XL_DOWN))
            && (!C.gr.r[x][y + 1].doortable || !C.rn2(10, 157, 'miniwalk')))
            dirs[q++] = 3;
        /* Rogue levels aren't just 3 by 3 mazes; they have some extra
         * connections, thus that 1/10 chance
         */
        if (!q)
            return;
        dir = dirs[C.rn2(q, 164, 'miniwalk')];
        switch (dir) { /* Move in direction */
        case 0:
            C.gr.r[x][y].doortable |= XL_LEFT;
            x = C.coordxy(x - 1);
            C.gr.r[x][y].doortable |= XL_RIGHT;
            break;
        case 1:
            C.gr.r[x][y].doortable |= XL_RIGHT;
            x = C.coordxy(x + 1);
            C.gr.r[x][y].doortable |= XL_LEFT;
            break;
        case 2:
            C.gr.r[x][y].doortable |= XL_UP;
            y = C.coordxy(y - 1);
            C.gr.r[x][y].doortable |= XL_DOWN;
            break;
        case 3:
            C.gr.r[x][y].doortable |= XL_DOWN;
            y = C.coordxy(y + 1);
            C.gr.r[x][y].doortable |= XL_UP;
            break;
        }
        miniwalk(x, y);
    }
// #undef doorhere
}

export function makeroguerooms()
{
    let x, y;
    /* Rogue levels are structured 3 by 3, with each section containing
     * a room or an intersection.  The minimum width is 2 each way.
     * One difference between these and "real" Rogue levels: real Rogue
     * uses 24 rows and NetHack only 23.  So we cheat a bit by making the
     * second row of rooms not as deep.
     *
     * Each normal space has 6/7 rows and 25 columns in which a room may
     * actually be placed.  Walls go from rows 0-5/6 and columns 0-24.
     * Not counting walls, the room may go in
     * rows 1-5 and columns 1-23 (numbering starting at 0).  A room
     * coordinate of this type may be converted to a level coordinate
     * by adding 1+28*x to the column, and 7*y to the row.  (The 1
     * is because column 0 isn't used [we only use 1-78]).
     * Room height may be 2-4 (2-5 on last row), length 2-23 (not
     * counting walls).
     */
// #define here gr.r[x][y]

    C.svn.nroom = 0;
    for (y = C.coordxy(0); y < 3; y = C.coordxy(y + 1))
        for (x = C.coordxy(0); x < 3; x = C.coordxy(x + 1)) {
            /* Note: we want to insure at least 1 room.  So, if the
             * first 8 are all dummies, force the last to be a room.
             */
            if (!C.rn2(5, 220, 'makeroguerooms') && (C.svn.nroom || (x < 2 && y < 2))) {
                /* Arbitrary: dummy rooms may only go where real
                 * ones do.
                 */
                C.gr.r[x][y].real = 0;
                C.gr.r[x][y].rlx = C.rn1(22, 2, 225, 'makeroguerooms');
                C.gr.r[x][y].rly = C.rn1((y == 2) ? 4 : 3, 2, 226, 'makeroguerooms');
            } else {
                C.gr.r[x][y].real = 1;
                C.gr.r[x][y].dx = C.rn1(22, 2, 229, 'makeroguerooms'); /* 2-23 long, plus walls */
                C.gr.r[x][y].dy = C.rn1((y == 2) ? 4 : 3, 2, 230, 'makeroguerooms'); /* 2-5 high, plus walls */

                /* boundaries of room floor */
                C.gr.r[x][y].rlx = C.rnd(23 - C.gr.r[x][y].dx + 1, 233, 'makeroguerooms');
                C.gr.r[x][y].rly = C.rnd(((y == 2) ? 5 : 4) - C.gr.r[x][y].dy + 1, 234, 'makeroguerooms');
                C.svn.nroom++;
            }
            C.gr.r[x][y].doortable = 0;
        }
    miniwalk(C.rn2(3, 239, 'makeroguerooms'), C.rn2(3, 239, 'makeroguerooms'));
    C.svn.nroom = 0;
    for (y = C.coordxy(0); y < 3; y = C.coordxy(y + 1))
        for (x = C.coordxy(0); x < 3; x = C.coordxy(x + 1)) {
            if (C.gr.r[x][y].real) { /* Make a room */
                let lowx, lowy, hix, hiy;

                C.gr.r[x][y].nroom = C.svn.nroom;
                C.gs.smeq[C.svn.nroom] = C.svn.nroom;

                lowx = C.coordxy(1 + 26 * x + C.gr.r[x][y].rlx);
                lowy = C.coordxy(7 * y + C.gr.r[x][y].rly);
                hix = C.coordxy(1 + 26 * x + C.gr.r[x][y].rlx + C.gr.r[x][y].dx - 1);
                hiy = C.coordxy(7 * y + C.gr.r[x][y].rly + C.gr.r[x][y].dy - 1);
                /* Strictly speaking, it should be lit only if above
                 * level 10, but since Rogue rooms are only
                 * encountered below level 10, use !rn2(7).
                 */
                C.add_room(lowx, lowy, hix, hiy, Number(!C.rn2(7, 257, 'makeroguerooms')), C.OROOM,
                         0);
            }
        }

    /* Now, add connecting corridors. */
    for (y = C.coordxy(0); y < 3; y = C.coordxy(y + 1))
        for (x = C.coordxy(0); x < 3; x = C.coordxy(x + 1)) {
            if (C.gr.r[x][y].doortable & XL_DOWN)
                roguecorr(x, y, XL_DOWN);
            if (C.gr.r[x][y].doortable & XL_RIGHT)
                roguecorr(x, y, XL_RIGHT);
            if (C.gr.r[x][y].doortable & XL_LEFT)
                C.impossible("left end of %d, %d never connected?", x, y);
            if (C.gr.r[x][y].doortable & XL_UP)
                C.impossible("up end of %d, %d never connected?", x, y);
        }
// #undef here
}

export function corr(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);

    if (C.rn2(50, 280, 'corr')) {
        C.levl[x][y].typ = C.CORR;
    } else {
        C.levl[x][y].typ = C.SCORR;
    }
}

export function makerogueghost()
{
    let ghost;
    let ghostobj;
    let croom;
    let x, y;

    if (!C.svn.nroom)
        return; /* Should never happen */
    croom = C.svr.rooms[C.rn2(C.svn.nroom, 297, 'makerogueghost')];
    x = C.coordxy(C.somex(croom));
    y = C.coordxy(C.somey(croom));
    if (!(ghost = C.makemon(C.mons[C.PM_GHOST], x, y, C.NO_MM_FLAGS)))
        return;
    ghost.msleeping = 1;
    ghost = C.christen_monst(ghost, C.roguename());
    // nhUse(ghost); /* inactive C use marker */

    if (C.rn2(4, 306, 'makerogueghost')) {
        ghostobj = C.mksobj_at(C.FOOD_RATION, x, y, 0, 0);
        ghostobj.quan = BigInt(C.rnd(7, 308, 'makerogueghost'));
        ghostobj.owt = C.weight(ghostobj);
    }
    if (C.rn2(2, 311, 'makerogueghost')) {
        ghostobj = C.mksobj_at(C.MACE, x, y, 0, 0);
        ghostobj.spe = C.rnd(3, 313, 'makerogueghost');
        if (C.rn2(4, 314, 'makerogueghost'))
            C.curse(ghostobj);
    } else {
        ghostobj = C.mksobj_at(C.TWO_HANDED_SWORD, x, y, 0, 0);
        ghostobj.spe = C.rnd(5, 318, 'makerogueghost') - 2;
        if (C.rn2(4, 319, 'makerogueghost'))
            C.curse(ghostobj);
    }
    ghostobj = C.mksobj_at(C.BOW, x, y, 0, 0);
    ghostobj.spe = 1;
    if (C.rn2(4, 324, 'makerogueghost'))
        C.curse(ghostobj);

    ghostobj = C.mksobj_at(C.ARROW, x, y, 0, 0);
    ghostobj.spe = 0;
    ghostobj.quan = BigInt(C.rn1(10, 25, 329, 'makerogueghost'));
    ghostobj.owt = C.weight(ghostobj);
    if (C.rn2(4, 331, 'makerogueghost'))
        C.curse(ghostobj);

    if (C.rn2(2, 334, 'makerogueghost')) {
        ghostobj = C.mksobj_at(C.RING_MAIL, x, y, 0, 0);
        ghostobj.spe = C.rn2(3, 336, 'makerogueghost');
        if (!C.rn2(3, 337, 'makerogueghost'))
            ghostobj.oerodeproof = 1;
        if (C.rn2(4, 339, 'makerogueghost'))
            C.curse(ghostobj);
    } else {
        ghostobj = C.mksobj_at(C.PLATE_MAIL, x, y, 0, 0);
        ghostobj.spe = C.rnd(5, 343, 'makerogueghost') - 2;
        if (!C.rn2(3, 344, 'makerogueghost'))
            ghostobj.oerodeproof = 1;
        if (C.rn2(4, 346, 'makerogueghost'))
            C.curse(ghostobj);
    }
    if (C.rn2(2, 349, 'makerogueghost')) {
        ghostobj = C.mksobj_at(C.FAKE_AMULET_OF_YENDOR, x, y, 1, 0);
        ghostobj.known = 1;
    }
}

/*extralev.c*/
