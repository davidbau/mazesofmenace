// extralev.js — C ref: extralev.c.
import { CORR, NO_MM_FLAGS, D_NODOOR, IS_WALL, OROOM, SCORR, XL_DOWN, XL_LEFT, XL_RIGHT, XL_UP } from './const.js';
import { game } from './gstate.js';
import { christen_monst } from './mhitm.js';
import { roguename } from './do_name.js';
import { PM_GHOST, add_room, curse, dodoor, weight } from './mklev.js';
import { mksobj_at } from './mkobj.js';
import { makemon } from './makemon.js';
import { somex, somey } from './mkroom.js';
import { impossible as lifecycle_impossible } from './pline.js';
import { rn1 } from './rng.js';
import { rn2, rnd } from './rnd.js';

/* C decl.h:819 `struct rogueroom r[3][3];` inside `struct grid gr` — a GLOBAL,
 * read by roguecorr()/miniwalk() after makeroguerooms() has filled it.  Same
 * lifetime here: module-level, rebuilt at the top of makeroguerooms(). */
const _rogue_r = [];

function _rogue_grid_reset() {
    _rogue_r.length = 0;
    for (let x = 0; x < 3; x++) {
        _rogue_r[x] = [];
        for (let y = 0; y < 3; y++)
            _rogue_r[x][y] = { rlx: 0, rly: 0, dx: 0, dy: 0,
                               real: false, doortable: 0, nroom: 0 };
    }
}

/* C extralev.c:20-42 */
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

/* C extralev.c:44-135 */
async function roguecorr(x, y, dir) {
    const g = game;
    let fromx, fromy, tox, toy;

    if (dir === XL_DOWN) {
        _rogue_r[x][y].doortable &= ~XL_DOWN;
        if (!_rogue_r[x][y].real) {
            fromx = _rogue_r[x][y].rlx;
            fromy = _rogue_r[x][y].rly;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
        } else {
            fromx = _rogue_r[x][y].rlx + rn2(_rogue_r[x][y].dx);
            fromy = _rogue_r[x][y].rly + _rogue_r[x][y].dy;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
            if (!IS_WALL(g.level.at(fromx, fromy).typ))
                await lifecycle_impossible("down: no wall at %d,%d?", fromx, fromy);
            await dodoor(fromx, fromy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(fromx, fromy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            fromy++;
        }
        if (y >= 2) {
            await lifecycle_impossible("down door from %d,%d going nowhere?", x, y);
            return;
        }
        y++;
        _rogue_r[x][y].doortable &= ~XL_UP;
        if (!_rogue_r[x][y].real) {
            tox = _rogue_r[x][y].rlx;
            toy = _rogue_r[x][y].rly;
            tox += 1 + 26 * x;
            toy += 7 * y;
        } else {
            tox = _rogue_r[x][y].rlx + rn2(_rogue_r[x][y].dx);
            toy = _rogue_r[x][y].rly - 1;
            tox += 1 + 26 * x;
            toy += 7 * y;
            if (!IS_WALL(g.level.at(tox, toy).typ))
                await lifecycle_impossible("up: no wall at %d,%d?", tox, toy);
            await dodoor(tox, toy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(tox, toy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            toy--;
        }
        roguejoin(fromx, fromy, tox, toy, false);
        return;
    } else if (dir === XL_RIGHT) {
        _rogue_r[x][y].doortable &= ~XL_RIGHT;
        if (!_rogue_r[x][y].real) {
            fromx = _rogue_r[x][y].rlx;
            fromy = _rogue_r[x][y].rly;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
        } else {
            fromx = _rogue_r[x][y].rlx + _rogue_r[x][y].dx;
            fromy = _rogue_r[x][y].rly + rn2(_rogue_r[x][y].dy);
            fromx += 1 + 26 * x;
            fromy += 7 * y;
            if (!IS_WALL(g.level.at(fromx, fromy).typ))
                await lifecycle_impossible("down: no wall at %d,%d?", fromx, fromy);
            await dodoor(fromx, fromy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(fromx, fromy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            fromx++;
        }
        if (x >= 2) {
            await lifecycle_impossible("right door from %d,%d going nowhere?", x, y);
            return;
        }
        x++;
        _rogue_r[x][y].doortable &= ~XL_LEFT;
        if (!_rogue_r[x][y].real) {
            tox = _rogue_r[x][y].rlx;
            toy = _rogue_r[x][y].rly;
            tox += 1 + 26 * x;
            toy += 7 * y;
        } else {
            tox = _rogue_r[x][y].rlx - 1;
            toy = _rogue_r[x][y].rly + rn2(_rogue_r[x][y].dy);
            tox += 1 + 26 * x;
            toy += 7 * y;
            if (!IS_WALL(g.level.at(tox, toy).typ))
                await lifecycle_impossible("left: no wall at %d,%d?", tox, toy);
            await dodoor(tox, toy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(tox, toy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            tox--;
        }
        roguejoin(fromx, fromy, tox, toy, true);
        return;
    }
    await lifecycle_impossible("corridor in direction %d?", dir);
}

/* C extralev.c:137-190 — modified walkfrom() from mkmaze.c */
function miniwalk(x, y) {
    let q, dir;
    const dirs = [0, 0, 0, 0];

    while (1) {
        q = 0;
        /* C: #define doorhere (gr.r[x][y].doortable) — a MACRO, so it
         * re-evaluates against the CURRENT x,y after the switch moves them.
         * That is load-bearing: the second `doorhere |= ...` in each arm
         * marks the DESTINATION cell, not the source. */
        if (x > 0 && (!(_rogue_r[x][y].doortable & XL_LEFT))
            && (!_rogue_r[x - 1][y].doortable || !rn2(10)))
            dirs[q++] = 0;
        if (x < 2 && (!(_rogue_r[x][y].doortable & XL_RIGHT))
            && (!_rogue_r[x + 1][y].doortable || !rn2(10)))
            dirs[q++] = 1;
        if (y > 0 && (!(_rogue_r[x][y].doortable & XL_UP))
            && (!_rogue_r[x][y - 1].doortable || !rn2(10)))
            dirs[q++] = 2;
        if (y < 2 && (!(_rogue_r[x][y].doortable & XL_DOWN))
            && (!_rogue_r[x][y + 1].doortable || !rn2(10)))
            dirs[q++] = 3;
        /* Rogue levels aren't just 3 by 3 mazes; they have some extra
         * connections, thus that 1/10 chance */
        if (!q)
            return;
        dir = dirs[rn2(q)];
        switch (dir) { /* Move in direction */
        case 0:
            _rogue_r[x][y].doortable |= XL_LEFT;
            x--;
            _rogue_r[x][y].doortable |= XL_RIGHT;
            break;
        case 1:
            _rogue_r[x][y].doortable |= XL_RIGHT;
            x++;
            _rogue_r[x][y].doortable |= XL_LEFT;
            break;
        case 2:
            _rogue_r[x][y].doortable |= XL_UP;
            y--;
            _rogue_r[x][y].doortable |= XL_DOWN;
            break;
        case 3:
            _rogue_r[x][y].doortable |= XL_DOWN;
            y++;
            _rogue_r[x][y].doortable |= XL_UP;
            break;
        }
        miniwalk(x, y);
    }
}

/* C extralev.c:192-275 */
export async function makeroguerooms() {
    const g = game;
    let x, y;

    _rogue_grid_reset();

    g.level.nroom = 0;
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = _rogue_r[x][y];
            /* Note: we want to insure at least 1 room.  So, if the
             * first 8 are all dummies, force the last to be a room. */
            if (!rn2(5) && (g.level.nroom || (x < 2 && y < 2))) {
                /* Arbitrary: dummy rooms may only go where real ones do. */
                here.real = false;
                here.rlx = rn1(22, 2);
                here.rly = rn1((y === 2) ? 4 : 3, 2);
            } else {
                here.real = true;
                here.dx = rn1(22, 2); /* 2-23 long, plus walls */
                here.dy = rn1((y === 2) ? 4 : 3, 2); /* 2-5 high, plus walls */

                here.rlx = rnd(23 - here.dx + 1);
                here.rly = rnd(((y === 2) ? 5 : 4) - here.dy + 1);
                g.level.nroom++;
            }
            here.doortable = 0;
        }
    miniwalk(rn2(3), rn2(3));
    g.level.nroom = 0;
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = _rogue_r[x][y];
            if (here.real) { /* Make a room */
                let lowx, lowy, hix, hiy;

                _rogue_r[x][y].nroom = g.level.nroom;
                g.smeq[g.level.nroom] = g.level.nroom;

                lowx = 1 + 26 * x + here.rlx;
                lowy = 7 * y + here.rly;
                hix = 1 + 26 * x + here.rlx + here.dx - 1;
                hiy = 7 * y + here.rly + here.dy - 1;
                /* Strictly speaking, it should be lit only if above
                 * level 10, but since Rogue rooms are only encountered
                 * below level 10, use !rn2(7). */
                add_room(lowx, lowy, hix, hiy, !rn2(7), OROOM, false);
            }
        }

    /* Now, add connecting corridors. */
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = _rogue_r[x][y];
            if (here.doortable & XL_DOWN)
                await roguecorr(x, y, XL_DOWN);
            if (here.doortable & XL_RIGHT)
                await roguecorr(x, y, XL_RIGHT);
            if (here.doortable & XL_LEFT)
                await lifecycle_impossible("left end of %d, %d never connected?", x, y);
            if (here.doortable & XL_UP)
                await lifecycle_impossible("up end of %d, %d never connected?", x, y);
        }
}

/* C extralev.c:277-285 */
function corr(x, y) {
    const loc = game.level.at(x, y);
    if (rn2(50)) {
        if (loc)
            loc.typ = CORR;
    } else {
        if (loc)
            loc.typ = SCORR;
    }
}

/* C extralev.c:287-353 */
export async function makerogueghost() {
    const g = game;
    let ghost, ghostobj, croom, x, y;

    if (!g.level.nroom)
        return; /* Should never happen */
    croom = g.level.rooms[rn2(g.level.nroom)];
    x = somex(croom);
    y = somey(croom);
    if (!(ghost = await makemon(PM_GHOST, x, y, NO_MM_FLAGS)))
        return;
    ghost.msleeping = 1;
    ghost = christen_monst(ghost, roguename());

    if (rn2(4)) {
        ghostobj = (await mksobj_at(_XL_FOOD_RATION, x, y, false, false));
        ghostobj.quan = rnd(7);
        ghostobj.owt = weight(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = (await mksobj_at(_XL_MACE, x, y, false, false));
        ghostobj.spe = rnd(3);
        if (rn2(4))
            curse(ghostobj);
    } else {
        ghostobj = (await mksobj_at(_XL_TWO_HANDED_SWORD, x, y, false, false));
        ghostobj.spe = rnd(5) - 2;
        if (rn2(4))
            curse(ghostobj);
    }
    ghostobj = (await mksobj_at(_XL_BOW, x, y, false, false));
    ghostobj.spe = 1;
    if (rn2(4))
        curse(ghostobj);

    ghostobj = (await mksobj_at(_XL_ARROW, x, y, false, false));
    ghostobj.spe = 0;
    ghostobj.quan = rn1(10, 25);
    ghostobj.owt = weight(ghostobj);
    if (rn2(4))
        curse(ghostobj);

    if (rn2(2)) {
        ghostobj = (await mksobj_at(_XL_RING_MAIL, x, y, false, false));
        ghostobj.spe = rn2(3);
        if (!rn2(3))
            ghostobj.oerodeproof = true;
        if (rn2(4))
            curse(ghostobj);
    } else {
        ghostobj = (await mksobj_at(_XL_PLATE_MAIL, x, y, false, false));
        ghostobj.spe = rnd(5) - 2;
        if (!rn2(3))
            ghostobj.oerodeproof = true;
        if (rn2(4))
            curse(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = (await mksobj_at(_XL_FAKE_AMULET_OF_YENDOR, x, y, true, false));
        ghostobj.known = true;
    }
}

/* otyps for makerogueghost's loot.  objects.h is an X-macro file with no
 * `#define <NAME>` text to grep, so these are the OC_NAME (js/oc_name_data.js)
 * row indices, each independently corroborated by an existing js/ site:
 *   ARROW 18 (m_initweap.js:44) TWO_HANDED_SWORD 55 (m_initweap.js:81)
 *   MACE 73 (m_initweap.js:99)  BOW 83 (m_initweap.js:109)
 *   PLATE_MAIL 121 / RING_MAIL 132 (makemon.js:1942,1944)
 *   FAKE_AMULET_OF_YENDOR 212 (eat.js:70, do_wear.js:1474)
 *   FOOD_RATION 293 (dogmove.js:1232, eat.js:1615) */
const _XL_ARROW = 18;

const _XL_TWO_HANDED_SWORD = 55;

const _XL_MACE = 73;

const _XL_BOW = 83;

const _XL_PLATE_MAIL = 121;

const _XL_RING_MAIL = 132;

const _XL_FAKE_AMULET_OF_YENDOR = 212;

const _XL_FOOD_RATION = 293;
