// mkmaze.js — the raw maze carver.
// C ref: src/mkmaze.c (okay / maze0xy / walkfrom / create_maze /
// maze_remove_deadends / set_levltyp_lit).  Used both by the bare
// makemaz("") path and, via des.level_init({style="maze"}) and
// des.mazewalk(), by the .lua special levels (hellfill.lua in particular).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, HWALL, isok, IS_DOOR, ACCESSIBLE,
    MAGIC_PORTAL,
} from './const.js';
import { maketrap } from './trap.js';

// C ref: decl.c g_init_x/g_init_y — x_maze_max = (COLNO-1) & ~1 = 78,
// y_maze_max = (ROWNO-1) & ~1 = 20.  create_maze() temporarily shrinks these
// while carving and restores them afterwards, so they are mutable state, not
// constants.
export const X_MAZE_MAX_DEFAULT = (COLNO - 1) & ~1;
export const Y_MAZE_MAX_DEFAULT = (ROWNO - 1) & ~1;

export const mz = {
    x_maze_max: X_MAZE_MAX_DEFAULT,
    y_maze_max: Y_MAZE_MAX_DEFAULT,
};

export function reset_maze_bounds() {
    mz.x_maze_max = X_MAZE_MAX_DEFAULT;
    mz.y_maze_max = Y_MAZE_MAX_DEFAULT;
}

// C ref: mkmaze.c mkportal(x, y, todnum, todlevel) — a MAGIC_PORTAL "trap"
// carrying the dungeon/level it leads to.  Every portal must be matched by a
// portal in the destination dungeon/dlevel: one is made on each side of a
// BR_PORTAL branch when that side's level is generated (place_branch() for the
// parent-dungeon side, put_lregion_here(LR_PORTAL)/place_branch() for the
// child's entry level), and goto_level() walks the destination level's trap
// list to find where the hero comes out.
//
// maketrap() consumes NO RNG for MAGIC_PORTAL (its type switch has no case for
// it) and leaves tseen clear (unhideable_trap() is HOLE-only), so a portal is
// invisible until the hero arrives on it or steps onto it — creating one does
// not perturb the level's PRNG stream or its initial appearance.
export async function mkportal(x, y, todnum, todlevel) {
    const ttmp = await maketrap(x, y, MAGIC_PORTAL);
    if (!ttmp) return;  /* C: impossible("portal on top of portal?") */
    ttmp.dst.dnum = todnum;
    ttmp.dst.dlevel = todlevel;
}

// C ref: mkmaze.c mz_move() macro — 0=north, 1=east, 2=south, 3=west.
export function mz_move(p, dir) {
    switch (dir) {
    case 0: p.y--; break;
    case 1: p.x++; break;
    case 2: p.y++; break;
    case 3: p.x--; break;
    default: break;
    }
}

// C ref: mkmaze.c okay() — is the cell TWO steps away in `dir` still virgin
// STONE and inside the (possibly shrunk) maze bounds?
export function okay(x, y, dir) {
    const p = { x, y };
    mz_move(p, dir);
    mz_move(p, dir);
    if (p.x < 3 || p.y < 3 || p.x > mz.x_maze_max || p.y > mz.y_maze_max)
        return false;
    return game.level?.at(p.x, p.y)?.typ === STONE;
}

// C ref: mkmaze.c maze0xy() — two rn2 draws for the carve start point.
export function maze0xy() {
    return {
        x: 3 + 2 * rn2((mz.x_maze_max >> 1) - 1),
        y: 3 + 2 * rn2((mz.y_maze_max >> 1) - 1),
    };
}

// C ref: mkmaze.c walkfrom() — the non-MICRO (recursive) build, ported
// literally.  This is deliberately NOT rewritten as an explicit-stack loop:
// C's `x`/`y` are the *parameters*, which mz_move() mutates in place, so after
// each recursive call the caller resumes scanning from the CELL IT JUST
// RECURSED INTO rather than from its own cell.  An ordinary
// push-my-own-cell backtracker visits cells in a different order and therefore
// consumes rn2(q) differently.  Depth is bounded by the number of odd cells in
// the maze grid (<= 39*10), so plain recursion is safe here.
export function walkfrom(x, y, typ) {
    if (!typ) typ = game.level?.flags?.corrmaze ? CORR : ROOM;

    const loc0 = game.level?.at(x, y);
    if (loc0 && !IS_DOOR(loc0.typ)) {
        // might still be on edge of MAP, so don't overwrite
        loc0.typ = typ;
        loc0.flags = 0;
    }

    for (;;) {
        const dirs = [];
        for (let a = 0; a < 4; a++) if (okay(x, y, a)) dirs.push(a);
        if (!dirs.length) return;
        const dir = dirs[rn2(dirs.length)];
        const p = { x, y };
        mz_move(p, dir);
        const mid = game.level?.at(p.x, p.y);
        if (mid) mid.typ = typ;
        mz_move(p, dir);
        x = p.x;
        y = p.y;
        walkfrom(x, y, typ);
    }
}

// C ref: mkmaze.c maze_inbounds().
function maze_inbounds(x, y) {
    return x >= 2 && y >= 2 && x < mz.x_maze_max && y < mz.y_maze_max
        && isok(x, y);
}

// C ref: mkmaze.c maze_remove_deadends() — one rn2(idx) per dead-end cell that
// has at least 3 blocked directions and at least one re-joinable neighbour.
export function maze_remove_deadends(typ) {
    for (let x = 2; x < mz.x_maze_max; x++)
        for (let y = 2; y < mz.y_maze_max; y++) {
            const loc = game.level?.at(x, y);
            if (!loc || !ACCESSIBLE(loc.typ) || !(x % 2) || !(y % 2)) continue;
            const dirok = [];
            let idx2 = 0;
            for (let dir = 0; dir < 4; dir++) {
                const p1 = { x, y }, p2 = { x, y };
                mz_move(p1, dir);
                if (!maze_inbounds(p1.x, p1.y)) { idx2++; continue; }
                mz_move(p2, dir); mz_move(p2, dir);
                if (!maze_inbounds(p2.x, p2.y)) { idx2++; continue; }
                const a = game.level.at(p1.x, p1.y), b = game.level.at(p2.x, p2.y);
                if (a && b && !ACCESSIBLE(a.typ) && ACCESSIBLE(b.typ)) {
                    dirok.push(dir);
                    idx2++;
                }
            }
            if (idx2 >= 3 && dirok.length > 0) {
                const p = { x, y };
                mz_move(p, dirok[rn2(dirok.length)]);
                const t = game.level.at(p.x, p.y);
                if (t) t.typ = typ;
            }
        }
}

// C ref: mkmaze.c create_maze(corrwid, wallthick, rmdeadends).
// corrwid/wallthick == -1 mean "roll it": rnd(4) and rnd(4)-corrwid, in that
// order.  The maze is carved on a half-scale grid and then tiled back up.
export function create_maze(corrwid, wallthick, rmdeadends) {
    const tmp_xmax = mz.x_maze_max;
    const tmp_ymax = mz.y_maze_max;

    if (corrwid === -1) corrwid = rnd(4);
    if (wallthick === -1) wallthick = rnd(4) - corrwid;

    if (wallthick < 1) wallthick = 1;
    else if (wallthick > 5) wallthick = 5;
    if (corrwid < 1) corrwid = 1;
    else if (corrwid > 5) corrwid = 5;

    const scale = corrwid + wallthick;
    const rdx = Math.trunc(mz.x_maze_max / scale);
    const rdy = Math.trunc(mz.y_maze_max / scale);
    const corrmaze = !!game.level?.flags?.corrmaze;

    if (corrmaze) {
        for (let x = 2; x < rdx * 2; x++)
            for (let y = 2; y < rdy * 2; y++) {
                const loc = game.level.at(x, y);
                if (loc) loc.typ = STONE;
            }
    } else {
        for (let x = 2; x <= rdx * 2; x++)
            for (let y = 2; y <= rdy * 2; y++) {
                const loc = game.level.at(x, y);
                if (loc) loc.typ = ((x % 2) && (y % 2)) ? STONE : HWALL;
            }
    }

    // set upper bounds for maze0xy and walkfrom
    mz.x_maze_max = rdx * 2;
    mz.y_maze_max = rdy * 2;

    const mm = maze0xy();
    walkfrom(mm.x, mm.y, 0);

    if (rmdeadends) maze_remove_deadends(corrmaze ? CORR : ROOM);

    // restore bounds
    mz.x_maze_max = tmp_xmax;
    mz.y_maze_max = tmp_ymax;

    if (scale > 2) {
        // back up the existing smaller maze, then tile each small-grid cell
        // into a mx-by-my block.
        const tmpmap = [];
        for (let x = 1; x < mz.x_maze_max; x++) {
            tmpmap[x] = [];
            for (let y = 1; y < mz.y_maze_max; y++)
                tmpmap[x][y] = game.level.at(x, y)?.typ;
        }

        let rx = 2, x = 2;
        while (rx < mz.x_maze_max) {
            const mx = (x % 2) ? corrwid
                : (x === 2 || x === rdx * 2) ? 1 : wallthick;
            let ry = 2, y = 2;
            while (ry < mz.y_maze_max) {
                const my = (y % 2) ? corrwid
                    : (y === 2 || y === rdy * 2) ? 1 : wallthick;
                for (let dx = 0; dx < mx; dx++) {
                    for (let dy = 0; dy < my; dy++) {
                        if (rx + dx >= mz.x_maze_max || ry + dy >= mz.y_maze_max)
                            break;
                        const loc = game.level.at(rx + dx, ry + dy);
                        const t = tmpmap[x]?.[y];
                        if (loc && t != null) loc.typ = t;
                    }
                }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }
}
