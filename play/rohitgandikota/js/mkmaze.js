// mkmaze.js — special-level entry points that live in src/mkmaze.c.
// C ref: src/mkmaze.c
//
// makemaz() resolves the proto file name and hands off to load_special();
// place_lregion()/put_lregion_here() place branch stairs, portals and the
// hero's arrival spot; fixup_special() is the post-script cleanup. The
// water-level, medusa and mines-ransacked arms need absent subsystems and
// are recorded at their C decision points.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { Is_special, depth } from './dungeon.js';
import { load_special } from './sp_lev.js';
import { COLNO, ROWNO, ROOM, CORR, AIR, STONE, IS_DOOR } from './const.js';
import { occupied } from './mklev.js';
import { t_at, m_at } from './mon.js';

function note_unported_mkmaze(what) {
    (game.unported ||= new Set()).add(what);
}

// include/sp_lev.h lev_region types
export const LR_TELE = 0, LR_UPTELE = 1, LR_DOWNTELE = 2, LR_PORTAL = 3,
             LR_BRANCH = 4, LR_UPSTAIR = 5, LR_DOWNSTAIR = 6;

// src/mkmaze.c:1127 makemaz() — build a special (or proto-filled) level.
// Returns true when a registered level script ran; false means the caller
// has no faithful generator for this level and must record the gap.
export async function makemaz(s) {
    const sp = Is_special(game.u.uz);
    let protofile;

    if (s) {
        if (sp && sp.rndlevs)
            protofile = `${s}-${rnd(sp.rndlevs)}`;
        else
            protofile = s;
    } else if (game.dungeons[game.u.uz.dnum].proto) {
        const dgn = game.dungeons[game.u.uz.dnum];
        if (dgn.num_dunlevs > 1) {
            const dunlev = game.u.uz.dlevel;
            if (sp && sp.rndlevs)
                protofile = `${dgn.proto}${dunlev}-${rnd(sp.rndlevs)}`;
            else
                protofile = `${dgn.proto}${dunlev}`;
        } else if (sp && sp.rndlevs) {
            protofile = `${dgn.proto}-${rnd(sp.rndlevs)}`;
        } else
            protofile = dgn.proto;
    } else
        protofile = '';

    /* SPLEVTYPE is a debugging env override; not carried over */

    if (protofile) {
        /* check_ransacked() matters only for the mines with orc themes */
        if (game.u.uz.dnum === game.mines_dnum)
            note_unported_mkmaze('makemaz:check_ransacked');
        if (await load_special(protofile))
            return true;
        note_unported_mkmaze(`makemaz:${protofile}`);
        return false;
    }

    /* protofile-less makemaz builds a random maze; absent */
    note_unported_mkmaze('makemaz:random_maze');
    return false;
}

// src/mkmaze.c:311 within_bounded_area()
const within_bounded_area = (x, y, lx, ly, hx, hy) =>
    (x >= lx && x <= hx && y >= ly && y <= hy);

// src/mkmaze.c:341 bad_location()
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const typ = game.level.at(x, y)?.typ;
    return occupied(x, y)
        || within_bounded_area(x, y, nlx, nly, nhx, nhy)
        || !((typ === CORR && game.level.flags?.is_maze_lev)
             || typ === ROOM
             || typ === AIR);
}

// src/mkmaze.c:413 put_lregion_here() — one attempt at placing the region
// object (or the hero) at x,y.
function put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev) {
    /* is_exclusion_zone(): no exclusion regions exist in this port */
    if (bad_location(x, y, nlx, nly, nhx, nhy)) {
        if (!oneshot) {
            return false; /* caller should try again */
        } else {
            const t = t_at(x, y);
            if (t) {
                const mtmp = m_at(x, y);
                if (mtmp && mtmp.mtrapped)
                    mtmp.mtrapped = 0;
                note_unported_mkmaze('put_lregion_here:deltrap');
            }
            if (bad_location(x, y, nlx, nly, nhx, nhy))
                return false;
        }
    }
    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE: {
        /* "something" means the player in this case */
        const mtmp = m_at(x, y);
        if (mtmp) {
            /* move the monster if no choice, or just try again */
            if (oneshot)
                note_unported_mkmaze('put_lregion_here:rloc_mon');
            else
                return false;
        }
        game.u.ux = x;
        game.u.uy = y; /* u_on_newpos */
        break;
    }
    case LR_PORTAL:
        note_unported_mkmaze('put_lregion_here:mkportal');
        break;
    case LR_DOWNSTAIR:
    case LR_UPSTAIR:
        mkmaze_mklev_fns?.mkstairs?.(x, y, rtype === LR_UPSTAIR ? 1 : 0, null);
        break;
    case LR_BRANCH:
        mkmaze_mklev_fns?.place_branch?.(Is_branchlev_here(), x, y);
        break;
    }
    return true;
}

// src/mkmaze.c:356 place_lregion() — 200 probabilistic tries (two rn1 draws
// each), then an exhaustive scan.
export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) { /* default to whole level */
        if (rtype === LR_BRANCH && game.level.nroom) {
            /* let place_branch choose, avoiding corridors */
            mkmaze_mklev_fns?.place_branch?.(Is_branchlev_here(), 0, 0);
            return;
        }
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }

    /* clamp the area to the map */
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    /* first a probabilistic approach */
    const oneshot = (lx === hx && ly === hy);
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev))
            return;
    }

    /* then a deterministic one */
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, true, lev))
                return;

    note_unported_mkmaze('place_lregion:failed');
}

/* mkstairs/place_branch live in js/mklev.js, which imports this file;
   wired to keep the import one-way. */
let mkmaze_mklev_fns = null;
export function mkmaze_wire_mklev(fns) { mkmaze_mklev_fns = fns; }

// src/mkmaze.c:570 fixup_special() — post-script placement of lregions and
// the per-level oddities. The water/air setup, medusa statues, cleric
// graveyard, stronghold, baalzebub and ransacked-mines arms are recorded.
export function fixup_special() {
    const lregions = game.lregions || [];
    let added_branch = false;

    if (game.dungeons[game.u.uz.dnum]?.dname === 'The Elemental Planes')
        note_unported_mkmaze('fixup_special:waterlevel');

    for (const r of lregions) {
        switch (r.rtype) {
        case LR_BRANCH:
            added_branch = true;
            /* FALLTHRU to place */
        case LR_PORTAL:
        case LR_UPSTAIR:
        case LR_DOWNSTAIR:
            if (r.rtype === LR_PORTAL)
                note_unported_mkmaze('fixup_special:portal_dest');
            place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                          r.delarea.x1, r.delarea.y1, r.delarea.x2,
                          r.delarea.y2, r.rtype, r.dest ?? null);
            break;
        default:
            /* save the region outlines for goto_level() */
            if (r.rtype === LR_TELE || r.rtype === LR_UPTELE)
                game.updest = { lx: r.inarea.x1, ly: r.inarea.y1,
                                hx: r.inarea.x2, hy: r.inarea.y2,
                                nlx: r.delarea.x1, nly: r.delarea.y1,
                                nhx: r.delarea.x2, nhy: r.delarea.y2 };
            if (r.rtype === LR_TELE || r.rtype === LR_DOWNTELE)
                game.dndest = { lx: r.inarea.x1, ly: r.inarea.y1,
                                hx: r.inarea.x2, hy: r.inarea.y2,
                                nlx: r.delarea.x1, nly: r.delarea.y1,
                                nhx: r.delarea.x2, nhy: r.delarea.y2 };
            break;
        }
    }

    /* place dungeon branch if not placed above */
    if (!added_branch && Is_branchlev_here())
        place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, null);

    if (Is_special(game.u.uz)?.flags?.town)
        game.level.flags.has_town = 1;

    game.lregions = [];
}

/* src/dungeon.c Is_branchlev() — a branch has an end on this level. */
function Is_branchlev_here() {
    for (const br of (game.branches || [])) {
        if ((br.end1.dnum === game.u.uz.dnum
             && br.end1.dlevel === game.u.uz.dlevel)
            || (br.end2.dnum === game.u.uz.dnum
                && br.end2.dlevel === game.u.uz.dlevel))
            return br;
    }
    return null;
}

// src/mkmaze.c:32 mz_move()
function mz_move(c, dir) {
    switch (dir) {
    case 0: --c.y; break;
    case 1: c.x++; break;
    case 2: c.y++; break;
    case 3: --c.x; break;
    }
}

// src/mkmaze.c:297 okay() — can the maze walk step two cells this way?
function okay(x, y, dir) {
    const c = { x, y };
    mz_move(c, dir);
    mz_move(c, dir);
    if (c.x < 3 || c.y < 3 || c.x > 78 /* x_maze_max */
        || c.y > 20 /* y_maze_max */
        || game.level.at(c.x, c.y)?.typ !== STONE)
        return false;
    return true;
}

// src/mkmaze.c:1279 walkfrom() — the recursive maze carver (the non-MICRO
// build); the draw order of its rn2(q) picks depends on this exact shape.
export function walkfrom(x, y, typ) {
    if (!typ)
        typ = game.level.flags?.corrmaze ? CORR : ROOM;

    const loc0 = game.level.at(x, y);
    if (loc0 && !IS_DOOR(loc0.typ)) {
        loc0.typ = typ;
        loc0.flags = 0;
    }

    for (;;) {
        const dirs = [];
        for (let a = 0; a < 4; a++)
            if (okay(x, y, a))
                dirs.push(a);
        if (!dirs.length)
            return;
        const dir = dirs[rn2(dirs.length)];
        const c = { x, y };
        mz_move(c, dir);
        const mid = game.level.at(c.x, c.y);
        if (mid) { mid.typ = typ; }
        mz_move(c, dir);
        walkfrom(c.x, c.y, typ);
        /* C's mz_move MACRO mutates the local x,y, so after the recursive
           call the while(1) continues from the MOVED position, not the
           frame's original one. The draw order depends on this. */
        x = c.x; y = c.y;
    }
}
