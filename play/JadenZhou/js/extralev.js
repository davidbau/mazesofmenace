// extralev.js -- support code for the "rogue"-style level.
// C ref: extralev.c (Copyright 1988, 1989 by Ken Arromdee)

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { CORR, SCORR, D_NODOOR, OROOM, IS_WALL, NO_MM_FLAGS } from './const.js';
import { dodoor, add_room, somex, somey } from './mklev.js';
import { makemon } from './makemon.js';
import { mons, PM_GHOST } from './monsters.js';
import { christen_monst } from './do_name.js';
import { mksobj_at, weight, curse } from './mkobj.js';
import { FOOD_RATION, MACE, TWO_HANDED_SWORD, BOW, ARROW, RING_MAIL,
         PLATE_MAIL, FAKE_AMULET_OF_YENDOR } from './objects.js';

const XL_UP = 1;
const XL_DOWN = 2;
const XL_LEFT = 4;
const XL_RIGHT = 8;

/* C ref: extralev.c gr.r[3][3] (struct rogueroom); the array persists
   between levels like the C global */
function rogue_r() {
    if (!game.rogue_r)
        game.rogue_r = Array.from({ length: 3 }, () => Array.from({ length: 3 },
            () => ({ rlx: 0, rly: 0, dx: 0, dy: 0, real: false, doortable: 0,
                     nroom: 0 })));
    return game.rogue_r;
}

function levl(x, y) { return game.level.at(x, y); }

// C ref: extralev.c roguejoin()
function roguejoin(x1, y1, x2, y2, horiz) {
    let x, y, middle;

    if (horiz) {
        middle = x1 + rn2(x2 - x1 + 1);
        for (x = Math.min(x1, middle); x <= Math.max(x1, middle); x++)
            corr(x, y1);
        for (y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
            corr(middle, y);
        for (x = Math.min(middle, x2); x <= Math.max(middle, x2); x++)
            corr(x, y2);
    } else {
        middle = y1 + rn2(y2 - y1 + 1);
        for (y = Math.min(y1, middle); y <= Math.max(y1, middle); y++)
            corr(x1, y);
        for (x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
            corr(x, middle);
        for (y = Math.min(middle, y2); y <= Math.max(middle, y2); y++)
            corr(x2, y);
    }
}

// C ref: extralev.c roguecorr()
function roguecorr(x, y, dir) {
    const r = rogue_r();
    let fromx, fromy, tox, toy;

    if (dir === XL_DOWN) {
        r[x][y].doortable &= ~XL_DOWN;
        if (!r[x][y].real) {
            fromx = r[x][y].rlx;
            fromy = r[x][y].rly;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
        } else {
            fromx = r[x][y].rlx + rn2(r[x][y].dx);
            fromy = r[x][y].rly + r[x][y].dy;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
            if (!IS_WALL(levl(fromx, fromy).typ))
                throw new Error(`roguecorr(): impossible("down: no wall at ${fromx},${fromy}?")`);
            dodoor(fromx, fromy, game.level.rooms[r[x][y].nroom]);
            levl(fromx, fromy).doormask = D_NODOOR;
            fromy++;
        }
        if (y >= 2)
            throw new Error(`roguecorr(): impossible("down door from ${x},${y} going nowhere?")`);
        y++;
        r[x][y].doortable &= ~XL_UP;
        if (!r[x][y].real) {
            tox = r[x][y].rlx;
            toy = r[x][y].rly;
            tox += 1 + 26 * x;
            toy += 7 * y;
        } else {
            tox = r[x][y].rlx + rn2(r[x][y].dx);
            toy = r[x][y].rly - 1;
            tox += 1 + 26 * x;
            toy += 7 * y;
            if (!IS_WALL(levl(tox, toy).typ))
                throw new Error(`roguecorr(): impossible("up: no wall at ${tox},${toy}?")`);
            dodoor(tox, toy, game.level.rooms[r[x][y].nroom]);
            levl(tox, toy).doormask = D_NODOOR;
            toy--;
        }
        roguejoin(fromx, fromy, tox, toy, false);
        return;
    } else if (dir === XL_RIGHT) {
        r[x][y].doortable &= ~XL_RIGHT;
        if (!r[x][y].real) {
            fromx = r[x][y].rlx;
            fromy = r[x][y].rly;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
        } else {
            fromx = r[x][y].rlx + r[x][y].dx;
            fromy = r[x][y].rly + rn2(r[x][y].dy);
            fromx += 1 + 26 * x;
            fromy += 7 * y;
            if (!IS_WALL(levl(fromx, fromy).typ))
                throw new Error(`roguecorr(): impossible("down: no wall at ${fromx},${fromy}?")`);
            dodoor(fromx, fromy, game.level.rooms[r[x][y].nroom]);
            levl(fromx, fromy).doormask = D_NODOOR;
            fromx++;
        }
        if (x >= 2)
            throw new Error(`roguecorr(): impossible("right door from ${x},${y} going nowhere?")`);
        x++;
        r[x][y].doortable &= ~XL_LEFT;
        if (!r[x][y].real) {
            tox = r[x][y].rlx;
            toy = r[x][y].rly;
            tox += 1 + 26 * x;
            toy += 7 * y;
        } else {
            tox = r[x][y].rlx - 1;
            toy = r[x][y].rly + rn2(r[x][y].dy);
            tox += 1 + 26 * x;
            toy += 7 * y;
            if (!IS_WALL(levl(tox, toy).typ))
                throw new Error(`roguecorr(): impossible("left: no wall at ${tox},${toy}?")`);
            dodoor(tox, toy, game.level.rooms[r[x][y].nroom]);
            levl(tox, toy).doormask = D_NODOOR;
            tox--;
        }
        roguejoin(fromx, fromy, tox, toy, true);
        return;
    } else
        throw new Error(`roguecorr(): impossible("corridor in direction ${dir}?")`);
}

// C ref: extralev.c miniwalk() -- modified walkfrom() from mkmaze.c
function miniwalk(x, y) {
    const r = rogue_r();
    let q, dir;
    const dirs = [0, 0, 0, 0];

    while (1) {
        q = 0;
        /* doorhere is r[x][y].doortable */
        if (x > 0 && (!(r[x][y].doortable & XL_LEFT))
            && (!r[x - 1][y].doortable || !rn2(10)))
            dirs[q++] = 0;
        if (x < 2 && (!(r[x][y].doortable & XL_RIGHT))
            && (!r[x + 1][y].doortable || !rn2(10)))
            dirs[q++] = 1;
        if (y > 0 && (!(r[x][y].doortable & XL_UP))
            && (!r[x][y - 1].doortable || !rn2(10)))
            dirs[q++] = 2;
        if (y < 2 && (!(r[x][y].doortable & XL_DOWN))
            && (!r[x][y + 1].doortable || !rn2(10)))
            dirs[q++] = 3;
        /* Rogue levels aren't just 3 by 3 mazes; they have some extra
         * connections, thus that 1/10 chance
         */
        if (!q)
            return;
        dir = dirs[rn2(q)];
        switch (dir) { /* Move in direction */
        case 0:
            r[x][y].doortable |= XL_LEFT;
            x--;
            r[x][y].doortable |= XL_RIGHT;
            break;
        case 1:
            r[x][y].doortable |= XL_RIGHT;
            x++;
            r[x][y].doortable |= XL_LEFT;
            break;
        case 2:
            r[x][y].doortable |= XL_UP;
            y--;
            r[x][y].doortable |= XL_DOWN;
            break;
        case 3:
            r[x][y].doortable |= XL_DOWN;
            y++;
            r[x][y].doortable |= XL_UP;
            break;
        }
        miniwalk(x, y);
    }
}

// C ref: extralev.c makeroguerooms()
export function makeroguerooms() {
    const g = game;
    const r = rogue_r();
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
    g.level.nroom = 0;
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = r[x][y];
            /* Note: we want to insure at least 1 room.  So, if the
             * first 8 are all dummies, force the last to be a room.
             */
            if (!rn2(5) && (g.level.nroom || (x < 2 && y < 2))) {
                /* Arbitrary: dummy rooms may only go where real
                 * ones do.
                 */
                here.real = false;
                here.rlx = rn1(22, 2);
                here.rly = rn1((y === 2) ? 4 : 3, 2);
            } else {
                here.real = true;
                here.dx = rn1(22, 2); /* 2-23 long, plus walls */
                here.dy = rn1((y === 2) ? 4 : 3, 2); /* 2-5 high, plus walls */

                /* boundaries of room floor */
                here.rlx = rnd(23 - here.dx + 1);
                here.rly = rnd(((y === 2) ? 5 : 4) - here.dy + 1);
                g.level.nroom++;
            }
            here.doortable = 0;
        }
    {
        /* miniwalk(rn2(3), rn2(3)) */
        const mx = rn2(3);
        const my = rn2(3);
        miniwalk(mx, my);
    }
    g.level.nroom = 0;
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = r[x][y];
            if (here.real) { /* Make a room */
                here.nroom = g.level.nroom;
                g.smeq[g.level.nroom] = g.level.nroom;

                const lowx = 1 + 26 * x + here.rlx;
                const lowy = 7 * y + here.rly;
                const hix = 1 + 26 * x + here.rlx + here.dx - 1;
                const hiy = 7 * y + here.rly + here.dy - 1;
                /* Strictly speaking, it should be lit only if above
                 * level 10, but since Rogue rooms are only
                 * encountered below level 10, use !rn2(7).
                 */
                add_room(lowx, lowy, hix, hiy, !rn2(7), OROOM, false);
            }
        }

    /* Now, add connecting corridors. */
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = r[x][y];
            if (here.doortable & XL_DOWN)
                roguecorr(x, y, XL_DOWN);
            if (here.doortable & XL_RIGHT)
                roguecorr(x, y, XL_RIGHT);
            if (here.doortable & XL_LEFT)
                throw new Error(`makeroguerooms(): impossible("left end of ${x}, ${y} never connected?")`);
            if (here.doortable & XL_UP)
                throw new Error(`makeroguerooms(): impossible("up end of ${x}, ${y} never connected?")`);
        }
}

// C ref: extralev.c corr()
export function corr(x, y) {
    if (rn2(50)) {
        levl(x, y).typ = CORR;
    } else {
        levl(x, y).typ = SCORR;
    }
}

// C ref: extralev.c makerogueghost()
export function makerogueghost() {
    const g = game;
    let ghost, ghostobj;

    if (!g.level.nroom)
        return; /* Should never happen */
    const croom = g.level.rooms[rn2(g.level.nroom)];
    const x = somex(croom);
    const y = somey(croom);
    if (!(ghost = makemon(mons[PM_GHOST], x, y, NO_MM_FLAGS)))
        return;
    ghost.msleeping = 1;
    ghost = christen_monst(ghost, roguename());

    if (rn2(4)) {
        ghostobj = mksobj_at(FOOD_RATION, x, y, false, false);
        ghostobj.quan = rnd(7);
        ghostobj.owt = weight(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(MACE, x, y, false, false);
        ghostobj.spe = rnd(3);
        if (rn2(4))
            curse(ghostobj);
    } else {
        ghostobj = mksobj_at(TWO_HANDED_SWORD, x, y, false, false);
        ghostobj.spe = rnd(5) - 2;
        if (rn2(4))
            curse(ghostobj);
    }
    ghostobj = mksobj_at(BOW, x, y, false, false);
    ghostobj.spe = 1;
    if (rn2(4))
        curse(ghostobj);

    ghostobj = mksobj_at(ARROW, x, y, false, false);
    ghostobj.spe = 0;
    ghostobj.quan = rn1(10, 25);
    ghostobj.owt = weight(ghostobj);
    if (rn2(4))
        curse(ghostobj);

    if (rn2(2)) {
        ghostobj = mksobj_at(RING_MAIL, x, y, false, false);
        ghostobj.spe = rn2(3);
        if (!rn2(3))
            ghostobj.oerodeproof = 1;
        if (rn2(4))
            curse(ghostobj);
    } else {
        ghostobj = mksobj_at(PLATE_MAIL, x, y, false, false);
        ghostobj.spe = rnd(5) - 2;
        if (!rn2(3))
            ghostobj.oerodeproof = 1;
        if (rn2(4))
            curse(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(FAKE_AMULET_OF_YENDOR, x, y, true, false);
        ghostobj.known = 1;
    }
}

// C ref: do_name.c roguename()
function roguename() {
    /* nh_getenv("ROGUEOPTS"): the JS port has no environment */
    return rn2(3) ? (rn2(2) ? "Michael Toy" : "Kenneth Arnold")
                  : "Glenn Wichman";
}
