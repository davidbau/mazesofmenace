// mkmaze.js — the raw maze carver.
// C ref: src/mkmaze.c (okay / maze0xy / walkfrom / create_maze /
// maze_remove_deadends / set_levltyp_lit).  Used both by the bare
// makemaz("") path and, via des.level_init({style="maze"}) and
// des.mazewalk(), by the .lua special levels (hellfill.lua in particular).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, HWALL, isok, IS_DOOR, ACCESSIBLE,
    MAGIC_PORTAL, LAVAPOOL, POOL, MOAT, WATER, AIR, CLOUD,
    Is_firelevel, Is_waterlevel, Is_airlevel,
} from './const.js';
import { maketrap, t_at } from './trap.js';
import { m_at, newsym, pline, terrain_glyph } from './display.js';
import {
    block_point, recalc_block_point, unblock_point, vision_recalc,
} from './vision.js';
import { obj_extract_self, objects_at, stackobj } from './invent.js';
import { place_object } from './mkobj.js';
import { enexto_spawn } from './makemon.js';
import { goodpos, rloc_to, RLOC_NOMSG } from './teleport.js';
import { placebc, unplacebc } from './ball.js';

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

// C ref: mkmaze.c:1484 fumaroles() — "augment the Plane of Fire"; called from
// goto_level() on arrival and from moveloop_core() every turn a level carries
// des.level_flags("fumaroles").  The rn2(3) count and the per-fumarole
// rn1(COLNO-4,3)/rn1(ROWNO-4,3) coordinate pair ALWAYS draw; the gas cloud (and
// its two extra rolls) only when the square happens to be lava.
export function fumaroles() {
    const g = game;
    let nmax = rn2(3);                                   // mkmaze.c:1486
    let sizemin = 5;
    if (Is_firelevel(g.u?.uz)) { nmax++; sizemin += 5; }
    if ((g.level?.flags?.temperature ?? 0) > 0) { nmax++; sizemin += 5; }
    for (let n = nmax; n; n--) {
        const x = rn2(COLNO - 4) + 3;                    // mkmaze.c:1500
        const y = rn2(ROWNO - 4) + 3;                    // mkmaze.c:1501
        if (g.level?.at(x, y)?.typ === LAVAPOOL) {
            // C ref: region.c create_gas_cloud(x, y, rn1(10, sizemin),
            // rn1(10, 5)) — the region itself is not modelled, but both rolls
            // are part of the stream.
            rn2(10); rn2(10);
            void sizemin;
        }
    }
}

// ── Special waterlevel stuff in endgame (TH) ─────────────────────────────────
// C ref: mkmaze.c:1576-2107.  The Planes of Water and Air are built as one
// solid element by their .lua scripts; everything the hero actually stands in
// is made here, at fixup_special() time (setup_waterlevel) and then again on
// every arrival/turn (movebubbles).  Water bubbles CARRY their contents (hero,
// monsters, objects, traps) as they drift; Air clouds only repaint terrain.

// C ref: mkmaze.c:1524-1527 — the bubble movement boundaries, one cell inside
// the box setup_waterlevel() hardcodes into svx/svy (which save_waterlevel
// writes into the level file, so a revisit gets the same numbers back).
const wl = { xmin: 0, ymin: 0, xmax: 0, ymax: 0 };
const gbxmin = () => wl.xmin + 1;
const gbymin = () => wl.ymin + 1;
const gbxmax = () => wl.xmax - 1;
const gbymax = () => wl.ymax - 1;

// C ref: mkmaze.c:1530 `static struct bubble *hero_bubble` — the bubble the
// hero is riding, set by movebubbles()'s pickup pass and read by
// maybe_adjust_hero_bubble().
let hero_bubble = null;

// C ref: mkmaze.c:1543 `static boolean up = FALSE` inside movebubbles() — a
// function-scope static, so it toggles once per call for the whole GAME and is
// deliberately not reset per level.
let mb_up = false;

// C ref: mkmaze.c svb.bbubbles (head) / ge.ebubbles (tail).  save_waterlevel()
// writes the chain into the LEVEL file, so it rides with game.level exactly as
// the region list and the footprint ring do; iterating the array forwards is
// b->next, backwards is b->prev.
function bubble_list() {
    const lev = game.level;
    if (!lev) return [];
    if (!lev.bubbles) lev.bubbles = [];
    return lev.bubbles;
}

// C ref: mkmaze.c:1801 set_wportal() — "there better be only one magic portal
// on water level".  gw.wportal is never read back in 3.7; the assignment is
// kept so the impossible() branch stays reachable the same way.
function set_wportal() {
    for (const t of (game.level?.traps || []))
        if (t.ttyp === MAGIC_PORTAL) { game.wportal = t; return; }
    game.wportal = null;
}

// C ref: mkmaze.c movebubbles()'s `levl[x][y] = water_pos` / `= air_pos`.  That
// is a WHOLE struct rm assignment, so seenv, flags, horizontal, waslit, roomno,
// edge and candig are all zeroed alongside typ/lit/glyph.  This port splits C's
// 5-bit `flags` into doormask + wall_info, so both are cleared here.
function set_bubble_bg(loc, glyph, typ, lit) {
    loc.typ = typ;
    loc.seenv = 0;
    loc.flags = 0;
    loc.doormask = 0;
    loc.wall_info = 0;
    loc.horizontal = false;
    loc.lit = !!lit;
    loc.waslit = false;
    loc.roomno = 0;
    loc.edge = false;
    loc.invisMon = false;
    loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
}

// C ref: display.h cmap_to_glyph(S_water/S_air/S_cloud) — the base element's
// map-memory glyph.  Routed through back_to_glyph()'s own table so the DEC /
// ASCII symset choice stays in one place.
function element_glyph(typ) { return terrain_glyph({ typ }, 0, 0); }

// C ref: mkmaze.c:1811 setup_waterlevel() — called from fixup_special() BEFORE
// place_lregions(), because the portal's levregion has to land on a square the
// bubbles have already decided about.  Draw order: the xskip/yskip pair, then
// for every grid point an rn2(7) bubble size followed by mk_bubble()'s own
// rolls.
export async function setup_waterlevel() {
    const g = game;
    const water = !!Is_waterlevel(g.u?.uz);
    // C: panic() when neither.  Nothing else may call this.
    if (!water && !Is_airlevel(g.u?.uz)) return;

    /* ouch, hardcoded... (file scope statics and used in bxmin,bymax,&c) */
    wl.xmin = 3;
    wl.ymin = 1;
    wl.xmax = Math.min(78, (COLNO - 1) - 1);
    wl.ymax = Math.min(20, ROWNO - 1);

    // "entire level is remembered as one glyph and any unspecified portion
    // should default to level's base element rather than to usual stone"
    const glyph = element_glyph(water ? WATER : AIR);
    const typ = water ? WATER : AIR;
    for (let x = 1; x <= COLNO - 1; x++)
        for (let y = 0; y <= ROWNO - 1; y++) {
            const loc = g.level?.at(x, y);
            if (!loc) continue;
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
            if (loc.typ === STONE) loc.typ = typ;
        }

    /* make bubbles */
    let xskip, yskip;
    if (water) {
        xskip = 10 + rn2(10);                            // mkmaze.c:1847
        yskip = 4 + rn2(4);                              // mkmaze.c:1848
    } else {
        xskip = 6 + rn2(4);                              // mkmaze.c:1850
        yskip = 3 + rn2(3);                              // mkmaze.c:1851
    }
    for (let x = gbxmin(); x <= gbxmax(); x += xskip)
        for (let y = gbymin(); y <= gbymax(); y += yskip)
            await mk_bubble(x, y, rn2(7));               // mkmaze.c:1856
}

// C ref: mkmaze.c:1859 unsetup_waterlevel() — free the chain.  Reached from
// save_waterlevel()'s release_data() arm when the level is written out.
export function unsetup_waterlevel() {
    const lev = game.level;
    if (lev) lev.bubbles = [];
    hero_bubble = null;
}

// C ref: mkmaze.c:1877 mk_bubble()'s bm2..bm8 bit masks.  "These bit masks make
// visually pleasing bubbles on a normal aspect 25x80 terminal, which naturally
// results in them being mathematically anything but symmetric."  bm[0]/bm[1]
// are the bounding-box width/height; bm[2+j] is row j's column bitmap.
const BMASK = [
    [2, 1, 0x3],
    [3, 2, 0x7, 0x7],
    [4, 3, 0x6, 0xf, 0x6],
    [5, 3, 0xe, 0x1f, 0xe],
    [6, 4, 0x1e, 0x3f, 0x3f, 0x1e],
    [7, 4, 0x3e, 0x7f, 0x7f, 0x3e],
    [8, 4, 0x7e, 0xff, 0xff, 0x7e],
];

// C ref: mkmaze.c:1863 mk_bubble(x, y, n).  The early return draws NOTHING, so
// a grid point past the far edge costs only setup_waterlevel's own rn2(7).
async function mk_bubble(x, y, n) {
    if (x >= gbxmax() || y >= gbymax()) return;
    if (n >= BMASK.length) n = BMASK.length - 1;   // C: impossible("n too large")
    const bm = BMASK[n];
    if ((x + bm[0] - 1) > gbxmax()) x = gbxmax() - bm[0] + 1;
    if ((y + bm[1] - 1) > gbymax()) y = gbymax() - bm[1] + 1;
    const b = {
        x, y,
        dx: 0, dy: 0,
        // C: memcpy of (bmask[n][1] + 2) bytes — the dims plus one byte per row.
        bm: bm.slice(0, bm[1] + 2),
        cons: [],
    };
    b.dx = 1 - rn2(3);                                   // mkmaze.c:1909
    b.dy = 1 - rn2(3);                                   // mkmaze.c:1910
    bubble_list().push(b);
    await mv_bubble(b, 0, 0, true);
}

// C ref: mkmaze.c:1928 maybe_adjust_hero_bubble() — after a successful walk on
// the Plane of Water, the bubble the hero rides may take up the hero's heading.
export function maybe_adjust_hero_bubble() {
    const u = game.u;
    if (!Is_waterlevel(u?.uz)) return;
    if (!u.dx && !u.dy) return;
    if (hero_bubble && !rn2(2)) {                        // mkmaze.c:1938
        hero_bubble.dx = u.dx;
        hero_bubble.dy = u.dy;
    }
}

// C ref: mkmaze.c:1949 mv_bubble(b, dx, dy, ini).
//
// "The player, the portal and all other objects and monsters float along with
// their associated bubbles.  Bubbles may overlap freely, and the contents may
// get associated with other bubbles in the process."
//
// Draw order: the air level's "clouds move slowly" rn2(6) gate first, then
// (only from the movebubbles() pass, never from mk_bubble's ini=TRUE call) the
// colli==0 direction shake — rn2(20) for a drifting bubble, rn2(5) for a
// stationary one, each followed by two rn2(3) when it fires.
async function mv_bubble(b, dx, dy, ini) {
    const g = game;
    const water = !!Is_waterlevel(g.u?.uz);
    const air = !!Is_airlevel(g.u?.uz);
    let colli = 0;

    /* clouds move slowly */
    if (!air || !rn2(6)) {                               // mkmaze.c:1959
        /* move bubble */
        if (dx < -1 || dx > 1 || dy < -1 || dy > 1) {
            dx = Math.sign(dx);
            dy = Math.sign(dy);
        }

        // collision with level borders?
        //      1 = horizontal border, 2 = vertical, 3 = corner
        if (b.x <= gbxmin()) colli |= 2;
        if (b.y <= gbymin()) colli |= 1;
        if ((b.x + b.bm[0] - 1) >= gbxmax()) colli |= 2;
        if ((b.y + b.bm[1] - 1) >= gbymax()) colli |= 1;

        // C's four out-of-range arms each pline() a diagnostic and clamp; the
        // clamp is kept, the debug line is not a game message.
        if (b.x < gbxmin()) b.x = gbxmin();
        if (b.y < gbymin()) b.y = gbymin();
        if ((b.x + b.bm[0] - 1) > gbxmax()) b.x = gbxmax() - b.bm[0] + 1;
        if ((b.y + b.bm[1] - 1) > gbymax()) b.y = gbymax() - b.bm[1] + 1;

        /* bounce if we're trying to move off the border */
        if (b.x === gbxmin() && dx < 0) dx = -dx;
        if (b.x + b.bm[0] - 1 === gbxmax() && dx > 0) dx = -dx;
        if (b.y === gbymin() && dy < 0) dy = -dy;
        if (b.y + b.bm[1] - 1 === gbymax() && dy > 0) dy = -dy;

        b.x += dx;
        b.y += dy;
    }

    /* draw the bubbles */
    for (let i = 0, x = b.x; i < b.bm[0]; i++, x++)
        for (let j = 0, y = b.y; j < b.bm[1]; j++, y++)
            if (b.bm[j + 2] & (1 << i)) {
                const loc = g.level?.at(x, y);
                if (!loc) continue;
                if (water) {
                    loc.typ = AIR;
                    loc.lit = true;
                    unblock_point(x, y);
                } else if (air) {
                    loc.typ = CLOUD;
                    loc.lit = true;
                    block_point(x, y);
                }
            }

    if (water) await replace_bubble_contents(b, dx, dy);

    /* boing? */
    switch (colli) {
    case 1:
        b.dy = -b.dy;
        break;
    case 3:
        b.dy = -b.dy;
        /* FALLTHRU */
    case 2:
        b.dx = -b.dx;
        break;
    default:
        // sometimes alter direction for fun anyway
        // (higher probability for stationary bubbles)
        if (!ini && ((b.dx || b.dy) ? !rn2(20) : !rn2(5))) {   // mkmaze.c:2102
            b.dx = 1 - rn2(3);                                 // mkmaze.c:2103
            b.dy = 1 - rn2(3);                                 // mkmaze.c:2104
        }
        break;
    }
}

// C ref: mkmaze.c:1567-1647 — movebubbles()'s Plane-of-Water pickup pass.
// Everything standing on a bubble cell is lifted off the map into b->cons, the
// cell is reset to solid water, and mv_bubble() puts the pile back down at the
// bubble's new offset.  Nothing here draws RNG.
function pickup_bubble_contents(b) {
    const g = game;
    const water_glyph = element_glyph(WATER);
    for (let i = 0, x = b.x; i < b.bm[0]; i++, x++)
        for (let j = 0, y = b.y; j < b.bm[1]; j++, y++) {
            if (!(b.bm[j + 2] & (1 << i))) continue;
            if (!isok(x, y)) continue;   // C: impossible("movebubbles: bad pos")

            /* pick up objects, monsters, hero, and traps */
            const here = objects_at(x, y);
            if (here.length) {
                // C detaches the pile head-first onto `olist`, which reverses
                // it; mv_bubble then place_object()s that list back in order.
                const olist = [];
                for (const otmp of [...here]) {
                    obj_extract_self(otmp);
                    otmp.ox = otmp.oy = 0;
                    olist.unshift(otmp);
                }
                b.cons.unshift({ x, y, what: 'obj', list: olist });
            }
            const mon = m_at(x, y);
            if (mon) {
                b.cons.unshift({ x, y, what: 'mon', list: mon });
                // C: remove_worm()/remove_monster(x, y).  This port keys
                // monsters off their own mx/my rather than a grid, so taking
                // one off the map IS the coordinate write C does next.
                newsym(x, y);            /* clean up old position */
                mon.mx = mon.my = 0;
            }
            if (!g.u?.uswallow && x === g.u?.ux && y === g.u?.uy) {
                b.cons.unshift({ x, y, what: 'hero', list: null });
                hero_bubble = b;
            }
            const btrap = t_at(x, y);
            if (btrap) b.cons.unshift({ x, y, what: 'trap', list: btrap });

            const loc = g.level.at(x, y);
            set_bubble_bg(loc, water_glyph, WATER, false);
            block_point(x, y);
        }
}

// C ref: mkmaze.c:2027-2085 — mv_bubble()'s "replace contents of bubble" arm,
// Plane of Water only.  C frees each container as it goes, so the list is
// consumed exactly once.
async function replace_bubble_contents(b, dx, dy) {
    const g = game;
    for (const cons of b.cons) {
        cons.x += dx;
        cons.y += dy;
        switch (cons.what) {
        case 'obj':
            for (const olist of cons.list) {
                place_object(olist, cons.x, cons.y);
                stackobj(olist);
            }
            break;
        case 'mon': {
            const mon = cons.list;
            // C: `if (!mnearto(mon, cons->x, cons->y, TRUE, RLOC_NOMSG))
            //         elemental_clog(mon);`
            await mnearto_bubble(mon, cons.x, cons.y);
            break;
        }
        case 'hero': {
            // do.js imports this module (fumaroles), so the two hero helpers
            // are pulled in on demand rather than statically.
            const { u_on_newpos, mnexto_rloc } = await import('./do.js');
            const mtmp = m_at(cons.x, cons.y);
            const ux0 = g.u.ux, uy0 = g.u.uy;
            u_on_newpos(cons.x, cons.y);
            newsym(ux0, uy0);            /* clean up old position */
            if (mtmp) await mnexto_rloc(mtmp, RLOC_NOMSG);
            break;
        }
        case 'trap':
            cons.list.tx = cons.x;
            cons.list.ty = cons.y;
            break;
        default:
            break;
        }
    }
    b.cons = [];
}

// C ref: mon.c:4030 mnearto(mtmp, x, y, move_other=TRUE, RLOC_NOMSG), reached
// only from mv_bubble().  NOT ported: the deal_with_overcrowding() ->
// elemental_clog() tail that runs when enexto() cannot find any square at all
// (it needs the whole "besieged" elemental-obliteration walk of mon.c:3878).
// Every other path — already-there, occupied-so-displace-the-other, goodpos,
// enexto fallback — is C's.
async function mnearto_bubble(mtmp, x, y) {
    if (mtmp.mx === x && mtmp.my === y && m_at(x, y) === mtmp) return 1;

    const othermon = m_at(x, y);
    /* take othermon off the map; it might end up immediately returning
       but for the moment it is leaving */
    if (othermon) othermon.mx = othermon.my = 0;
    let newx = x, newy = y;
    if (!goodpos(newx, newy, mtmp, 0)) {
        const mm = enexto_spawn(newx, newy, mtmp.data);
        if (!mm || !isok(mm.x, mm.y)) return 0;
        newx = mm.x; newy = mm.y;
    }
    await rloc_to(mtmp, newx, newy);   /* rloc_to_flag(..., RLOC_NOMSG) */
    if (othermon) {
        /* 'move_other'==FALSE this time; fail rather than recurse */
        await mnearto_bubble(othermon, x, y);
        return 2;
    }
    return 1;
}

// C ref: mkmaze.c:1538 movebubbles() — "augment the Planes of Water (for
// bubbles) and Air (for clouds); called from goto_level() when arriving and
// moveloop_core() when on the level".
//
// Draw order, and it is the whole game here: on Air, the perimeter-break
// rn2(3)/rn2(5) sweep over EVERY cell of the level runs first (5 edge columns x
// 21 rows at rn2(3), then 3 edge rows x 74 interior columns at rn2(5) = 327
// draws on a default 80x21 map), and only then the per-bubble rx/ry pair plus
// mv_bubble's own rolls.  On Water the sweep does not exist; the pickup pass
// replaces it and draws nothing.
export async function movebubbles() {
    const g = game;
    const water = !!Is_waterlevel(g.u?.uz);
    const air = !!Is_airlevel(g.u?.uz);

    /* set up the portal the first time bubbles are moved */
    if (!g.wportal) set_wportal();

    vision_recalc(2);

    hero_bubble = null;

    const list = bubble_list();
    let bcpin = 0;
    if (water) {
        /* keep attached ball&chain separate from bubble objects */
        if (g.u?.uball) {
            // C ref: ball.c:222 unplacebc_and_covet_placebc() — rnd(400) is the
            // restriction cookie, and it IS part of the stream.
            bcpin = rnd(400);
            unplacebc();
        }
        // "Pick up everything inside of a bubble then fill all bubble
        // locations."  Uses the PREVIOUS call's `up`, before the toggle below.
        for (const b of (mb_up ? list : [...list].reverse()))
            pickup_bubble_contents(b);
    } else if (air) {
        const air_glyph = element_glyph(CLOUD);
        for (let x = 1; x <= COLNO - 1; x++)
            for (let y = 0; y <= ROWNO - 1; y++) {
                const loc = g.level?.at(x, y);
                if (!loc) continue;
                set_bubble_bg(loc, air_glyph, AIR, true);
                recalc_block_point(x, y);
                // "all air or all cloud around the perimeter of the Air level
                // tends to look strange; break up the pattern"
                const xedge = (x < gbxmin() || x > gbxmax());
                const yedge = (y < gbymin() || y > gbymax());
                if (xedge || yedge) {
                    if (!rn2(xedge ? 3 : 5)) {           // mkmaze.c:1660
                        loc.typ = CLOUD;
                        block_point(x, y);
                    }
                }
            }
    }

    // "Every second time traverse down.  This is because otherwise all the junk
    // that changes owners when bubbles overlap would eventually end up in the
    // last bubble in the chain."
    mb_up = !mb_up;
    for (const b of (mb_up ? list : [...list].reverse())) {
        const rx = rn2(3), ry = rn2(3);                  // mkmaze.c:1675
        await mv_bubble(b, b.dx + 1 - (!b.dx ? rx : (rx ? 1 : 0)),
                        b.dy + 1 - (!b.dy ? ry : (ry ? 1 : 0)), false);
    }

    /* put attached ball&chain back */
    if (water && g.u?.uball) {
        void bcpin;                      // C: lift_covet_and_placebc(bcpin)
        placebc();
    }
    g.vision_full_recalc = 1;
}

// C ref: mkmaze.c:1688 water_friction() — "when moving in water, possibly (1 in
// 3) alter the intended destination".  Called from hack.c water_turbulence(),
// i.e. only while u.uinwater.
export async function water_friction() {
    const u = game.u;
    let x, y, dx, dy;
    let eff = false;

    if (u.uprops?.Swimming && rn2(4))
        return; /* natural swimmers have advantage */

    if (u.dx && !rn2(!u.dy ? 3 : 6)) { /* 1/3 chance or half that */
        /* cancel delta x and choose an arbitrary delta y value */
        x = u.ux;
        do {
            dy = rn2(3) - 1; /* -1, 0, 1 */
            y = u.uy + dy;
        } while (dy && (!isok(x, y) || !is_pool_bubble(x, y)));
        u.dx = 0;
        u.dy = dy;
        eff = true;
    } else if (u.dy && !rn2(!u.dx ? 3 : 5)) { /* 1/3 or 1/5*(5/6) */
        /* cancel delta y and choose an arbitrary delta x value */
        y = u.uy;
        do {
            dx = rn2(3) - 1; /* -1 .. 1 */
            x = u.ux + dx;
        } while (dx && (!isok(x, y) || !is_pool_bubble(x, y)));
        u.dy = 0;
        u.dx = dx;
        eff = true;
    }
    if (eff) await pline('Water turbulence affects your movements.');
}

// C ref: rm.h is_pool(x,y) — POOL/MOAT/WATER (the drawbridge arm cannot occur
// on the Plane of Water).
function is_pool_bubble(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === POOL || t === MOAT || t === WATER;
}
