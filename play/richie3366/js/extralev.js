// extralev.js — Rogue-style level generation.
// C ref: src/extralev.c — makeroguerooms, makerogueghost, corr, miniwalk,
// roguecorr, roguejoin.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    CORR, SCORR, D_NODOOR, XL_UP, XL_DOWN, XL_LEFT, XL_RIGHT,
    OROOM, NO_MM_FLAGS,
} from './const.js';
import { mksobj_at, curse, weight } from './mkobj.js';
import { makemon } from './makemon.js';
import { mons } from './monsters.js';
import { monsterNames } from './generated/monsters_data.js';
import { objectNames } from './generated/objects_data.js';
import { christen_monst, roguename } from './do_name.js';
import { add_room, dodoor, somex, somey } from './mklev.js';

const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const MACE = objectNames.indexOf('MACE');
const TWO_HANDED_SWORD = objectNames.indexOf('TWO_HANDED_SWORD');
const BOW = objectNames.indexOf('BOW');
const ARROW = objectNames.indexOf('ARROW');
const RING_MAIL = objectNames.indexOf('RING_MAIL');
const PLATE_MAIL = objectNames.indexOf('PLATE_MAIL');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');

/** C: gr.r[3][3] — filled by makeroguerooms, used by roguecorr. */
let rogue_r = null;

function cell(x, y) {
    return rogue_r[x][y];
}

// C ref: extralev.c corr()
export function corr(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.typ = rn2(50) ? CORR : SCORR;
}

// C ref: extralev.c roguejoin()
function roguejoin(x1, y1, x2, y2, horiz) {
    let middle;
    if (horiz) {
        middle = x1 + rn2(x2 - x1 + 1);
        for (let x = Math.min(x1, middle); x <= Math.max(x1, middle); x++)
            corr(x, y1);
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
            corr(middle, y);
        for (let x = Math.min(middle, x2); x <= Math.max(middle, x2); x++)
            corr(x, y2);
    } else {
        middle = y1 + rn2(y2 - y1 + 1);
        for (let y = Math.min(y1, middle); y <= Math.max(y1, middle); y++)
            corr(x1, y);
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
            corr(x, middle);
        for (let y = Math.min(middle, y2); y <= Math.max(middle, y2); y++)
            corr(x2, y);
    }
}

// C ref: extralev.c roguecorr()
function roguecorr(x, y, dir) {
    const g = game;
    let fromx, fromy, tox, toy;
    let cx = x, cy = y;

    if (dir === XL_DOWN) {
        cell(cx, cy).doortable &= ~XL_DOWN;
        if (!cell(cx, cy).real) {
            fromx = cell(cx, cy).rlx;
            fromy = cell(cx, cy).rly;
            fromx += 1 + 26 * cx;
            fromy += 7 * cy;
        } else {
            fromx = cell(cx, cy).rlx + rn2(cell(cx, cy).dx);
            fromy = cell(cx, cy).rly + cell(cx, cy).dy;
            fromx += 1 + 26 * cx;
            fromy += 7 * cy;
            // C: impossible if !IS_WALL
            dodoor(fromx, fromy, g.level.rooms[cell(cx, cy).nroom]);
            const floc = g.level.at(fromx, fromy);
            if (floc) {
                floc.doormask = D_NODOOR;
                floc.flags = D_NODOOR;
            }
            fromy++;
        }
        if (cy >= 2) return;
        cy++;
        cell(cx, cy).doortable &= ~XL_UP;
        if (!cell(cx, cy).real) {
            tox = cell(cx, cy).rlx;
            toy = cell(cx, cy).rly;
            tox += 1 + 26 * cx;
            toy += 7 * cy;
        } else {
            tox = cell(cx, cy).rlx + rn2(cell(cx, cy).dx);
            toy = cell(cx, cy).rly - 1;
            tox += 1 + 26 * cx;
            toy += 7 * cy;
            dodoor(tox, toy, g.level.rooms[cell(cx, cy).nroom]);
            const tloc = g.level.at(tox, toy);
            if (tloc) {
                tloc.doormask = D_NODOOR;
                tloc.flags = D_NODOOR;
            }
            toy--;
        }
        roguejoin(fromx, fromy, tox, toy, false);
        return;
    }
    if (dir === XL_RIGHT) {
        cell(cx, cy).doortable &= ~XL_RIGHT;
        if (!cell(cx, cy).real) {
            fromx = cell(cx, cy).rlx;
            fromy = cell(cx, cy).rly;
            fromx += 1 + 26 * cx;
            fromy += 7 * cy;
        } else {
            fromx = cell(cx, cy).rlx + cell(cx, cy).dx;
            fromy = cell(cx, cy).rly + rn2(cell(cx, cy).dy);
            fromx += 1 + 26 * cx;
            fromy += 7 * cy;
            dodoor(fromx, fromy, g.level.rooms[cell(cx, cy).nroom]);
            const floc = g.level.at(fromx, fromy);
            if (floc) {
                floc.doormask = D_NODOOR;
                floc.flags = D_NODOOR;
            }
            fromx++;
        }
        if (cx >= 2) return;
        cx++;
        cell(cx, cy).doortable &= ~XL_LEFT;
        if (!cell(cx, cy).real) {
            tox = cell(cx, cy).rlx;
            toy = cell(cx, cy).rly;
            tox += 1 + 26 * cx;
            toy += 7 * cy;
        } else {
            tox = cell(cx, cy).rlx - 1;
            toy = cell(cx, cy).rly + rn2(cell(cx, cy).dy);
            tox += 1 + 26 * cx;
            toy += 7 * cy;
            dodoor(tox, toy, g.level.rooms[cell(cx, cy).nroom]);
            const tloc = g.level.at(tox, toy);
            if (tloc) {
                tloc.doormask = D_NODOOR;
                tloc.flags = D_NODOOR;
            }
            tox--;
        }
        roguejoin(fromx, fromy, tox, toy, true);
        return;
    }
}

// C ref: extralev.c miniwalk()
function miniwalk(x, y) {
    for (;;) {
        const dirs = [];
        const here = cell(x, y);
        if (x > 0 && !(here.doortable & XL_LEFT)
            && (!cell(x - 1, y).doortable || !rn2(10)))
            dirs.push(0);
        if (x < 2 && !(here.doortable & XL_RIGHT)
            && (!cell(x + 1, y).doortable || !rn2(10)))
            dirs.push(1);
        if (y > 0 && !(here.doortable & XL_UP)
            && (!cell(x, y - 1).doortable || !rn2(10)))
            dirs.push(2);
        if (y < 2 && !(here.doortable & XL_DOWN)
            && (!cell(x, y + 1).doortable || !rn2(10)))
            dirs.push(3);
        if (!dirs.length) return;
        const dir = dirs[rn2(dirs.length)];
        switch (dir) {
        case 0:
            here.doortable |= XL_LEFT;
            x--;
            cell(x, y).doortable |= XL_RIGHT;
            break;
        case 1:
            here.doortable |= XL_RIGHT;
            x++;
            cell(x, y).doortable |= XL_LEFT;
            break;
        case 2:
            here.doortable |= XL_UP;
            y--;
            cell(x, y).doortable |= XL_DOWN;
            break;
        case 3:
            here.doortable |= XL_DOWN;
            y++;
            cell(x, y).doortable |= XL_UP;
            break;
        }
        miniwalk(x, y);
    }
}

/**
 * C ref: extralev.c makeroguerooms()
 * Builds the 3×3 Rogue room graph, places real rooms via add_room, then
 * connects them with roguecorr corridors.
 */
export function makeroguerooms() {
    const g = game;
    rogue_r = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => ({
            rlx: 0, rly: 0, dx: 0, dy: 0,
            real: false, doortable: 0, nroom: 0,
        })));

    g.level.nroom = 0;
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = cell(x, y);
            // Force at least one real room: last cell if first eight dummy.
            if (!rn2(5) && (g.level.nroom || (x < 2 && y < 2))) {
                here.real = false;
                here.rlx = rn1(22, 2);
                here.rly = rn1((y === 2) ? 4 : 3, 2);
            } else {
                here.real = true;
                here.dx = rn1(22, 2);
                here.dy = rn1((y === 2) ? 4 : 3, 2);
                here.rlx = rnd(23 - here.dx + 1);
                here.rly = rnd(((y === 2) ? 5 : 4) - here.dy + 1);
                g.level.nroom++;
            }
            here.doortable = 0;
        }
    }
    miniwalk(rn2(3), rn2(3));
    g.level.nroom = 0;
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = cell(x, y);
            if (!here.real) continue;
            here.nroom = g.level.nroom;
            if (g.smeq) g.smeq[g.level.nroom] = g.level.nroom;

            const lowx = 1 + 26 * x + here.rlx;
            const lowy = 7 * y + here.rly;
            const hix = 1 + 26 * x + here.rlx + here.dx - 1;
            const hiy = 7 * y + here.rly + here.dy - 1;
            add_room(lowx, lowy, hix, hiy, !rn2(7), OROOM, false);
        }
    }

    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = cell(x, y);
            if (here.doortable & XL_DOWN) roguecorr(x, y, XL_DOWN);
            if (here.doortable & XL_RIGHT) roguecorr(x, y, XL_RIGHT);
        }
    }
}

/**
 * C ref: extralev.c makerogueghost()
 * Places sleeping named ghost + classic Rogue loot in a random room.
 */
export function makerogueghost() {
    const g = game;
    if (!g.level?.nroom) return;
    const croom = g.level.rooms[rn2(g.level.nroom)];
    if (!croom) return;
    const x = somex(croom);
    const y = somey(croom);
    let ghost = makemon(mons(PM_GHOST), x, y, NO_MM_FLAGS);
    if (!ghost) return;
    ghost.msleeping = 1;
    ghost = christen_monst(ghost, roguename());

    let ghostobj;
    if (rn2(4)) {
        ghostobj = mksobj_at(FOOD_RATION, x, y, false, false);
        if (ghostobj) {
            ghostobj.quan = rnd(7);
            ghostobj.owt = weight(ghostobj);
        }
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(MACE, x, y, false, false);
        if (ghostobj) {
            ghostobj.spe = rnd(3);
            if (rn2(4)) curse(ghostobj);
        }
    } else {
        ghostobj = mksobj_at(TWO_HANDED_SWORD, x, y, false, false);
        if (ghostobj) {
            ghostobj.spe = rnd(5) - 2;
            if (rn2(4)) curse(ghostobj);
        }
    }
    ghostobj = mksobj_at(BOW, x, y, false, false);
    if (ghostobj) {
        ghostobj.spe = 1;
        if (rn2(4)) curse(ghostobj);
    }

    ghostobj = mksobj_at(ARROW, x, y, false, false);
    if (ghostobj) {
        ghostobj.spe = 0;
        ghostobj.quan = rn1(10, 25);
        ghostobj.owt = weight(ghostobj);
        if (rn2(4)) curse(ghostobj);
    }

    if (rn2(2)) {
        ghostobj = mksobj_at(RING_MAIL, x, y, false, false);
        if (ghostobj) {
            ghostobj.spe = rn2(3);
            if (!rn2(3)) ghostobj.oerodeproof = true;
            if (rn2(4)) curse(ghostobj);
        }
    } else {
        ghostobj = mksobj_at(PLATE_MAIL, x, y, false, false);
        if (ghostobj) {
            ghostobj.spe = rnd(5) - 2;
            if (!rn2(3)) ghostobj.oerodeproof = true;
            if (rn2(4)) curse(ghostobj);
        }
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(FAKE_AMULET_OF_YENDOR, x, y, true, false);
        if (ghostobj) ghostobj.known = true;
    }
}
