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
import { load_special, sp_lev_wire_create_maze } from './sp_lev.js';
import { COLNO, ROWNO, ROOM, CORR, AIR, STONE, HWALL, IS_DOOR,
         ACCESSIBLE, W_NONDIGGABLE, POOL, IRONBARS, TLWALL, TRWALL,
         TUWALL, TDWALL, BLCORNER, BRCORNER, TLCORNER,
         TRCORNER } from './const.js';
import { isok } from './hacklib.js';
import { occupied, somex, somey } from './mklev.js';
import { t_at, m_at } from './mon.js';
import { goodpos, rndmonnum } from './makemon.js';
import { mk_tt_object, mkcorpstat, set_corpsenm } from './mkobj.js';
import { poly_when_stoned } from './mondata.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { ONAMES } from './objects_data.js';

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
        /* src/mkmaze.c:707 check_ransacked() — "this kludge only works as
           long as orctown is minetn-1": the Orcish Town variant flags the
           whole mines branch as ransacked for stolen_booty() below it */
        game.ransacked = (game.u.uz.dnum === game.mines_dnum
                          && protofile === 'minetn-1');
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
   wired to keep the import one-way.
   var, not let: wired from mklev.js's top level, which can run before this
   body evaluates (see the add_room_fn note in js/sp_lev.js). */
var mkmaze_mklev_fns;
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

    /* src/mkmaze.c:649 — still need to add some stuff to level file */
    const on_lev = (key) => {
        const sl = game.special_levels?.[key];
        return sl && game.u.uz.dnum === sl.dnum
               && game.u.uz.dlevel === sl.dlevel;
    };
    if (on_lev('medusa_level')) {
        /* the first room defined on the medusa level gets 1..4 petrified
           adventurers from the scoreboard, plus one more that skips the
           goodpos test; each re-rolls while the species resists stoning */
        let otmp;
        const croom = game.level.rooms[0];

        for (let tryct = rnd(4); tryct; tryct--) {
            const x = somex(croom);
            const y = somey(croom);
            if (goodpos(x, y, null, 0)) {
                let tryct2 = 0;

                otmp = mk_tt_object(ONAMES.STATUE, x, y);
                while (++tryct2 < 100 && otmp
                       && (poly_when_stoned(game.mons[otmp.corpsenm])
                           || ((game.mons[otmp.corpsenm].mresists ?? 0)
                               & MFLAGS.MR_STONE))) {
                    /* set_corpsenm() handles weight too */
                    set_corpsenm(otmp, rndmonnum());
                }
            }
        }

        if (rn2(2))
            otmp = mk_tt_object(ONAMES.STATUE, somex(croom), somey(croom));
        else /* Medusa statues don't contain books */
            otmp = mkcorpstat(ONAMES.STATUE, null, null,
                              somex(croom), somey(croom), 0 /* NONE */);
        if (otmp) {
            let tryct = 0;
            while (++tryct < 100
                   && (((game.mons[otmp.corpsenm].mresists ?? 0)
                        & MFLAGS.MR_STONE)
                       || poly_when_stoned(game.mons[otmp.corpsenm]))) {
                /* set_corpsenm() handles weight too */
                set_corpsenm(otmp, rndmonnum());
            }
        }
    } else if (game.urole?.mnum === PMNAMES.PM_CLERIC
               && game.u.uz.dnum === game.quest_dnum) {
        /* less chance for undead corpses (lured from lower morgues) */
        game.level.flags.graveyard = 1;
    } else if (on_lev('stronghold_level')) {
        game.level.flags.graveyard = 1;
    } else if (on_lev('baalzebub_level')) {
        /* custom wallify the "beetle" portion of the level */
        baalz_fixup();
    } else if (game.u.uz.dnum === game.mines_dnum && game.ransacked) {
        note_unported_mkmaze('fixup_special:stolen_booty');
    }

    if (Is_special(game.u.uz)?.flags?.town)
        game.level.flags.has_town = 1;

    game.lregions = [];
}

// src/mkmaze.c:475 baalz_fixup() — fix up Baalzebub's lair, which depicts a
// level-sized beetle; its legs are walls within solid rock that regular
// wallification would classify as superfluous. The two POOL squares mark
// spots needing the post-wallify corner fixes, and the iron-bar "eyes" get
// diggable columns in front of them. Draws only if a monster stands on a
// pool spot (rloc).
function baalz_fixup() {
    const g = game;
    let x, y, lastx, lasty;

    const bughack = { inarea: { x1: 0, y1: 0, x2: 0, y2: 0 },
                      delarea: { x1: COLNO, y1: ROWNO,
                                 x2: COLNO, y2: ROWNO } };

    /* find low and high x for to-be-wallified portion of level */
    y = (ROWNO / 2) | 0;
    lastx = 0;
    for (x = 0; x < COLNO; ++x)
        if (((g.level.at(x, y)?.wall_info ?? 0) & W_NONDIGGABLE) !== 0) {
            if (!lastx)
                bughack.inarea.x1 = x + 1;
            lastx = x;
        }
    bughack.inarea.x2 = ((lastx > bughack.inarea.x1) ? lastx : x) - 1;
    /* find low and high y for to-be-wallified portion of level */
    x = bughack.inarea.x1;
    lasty = 0;
    for (y = 0; y < ROWNO; ++y)
        if (((g.level.at(x, y)?.wall_info ?? 0) & W_NONDIGGABLE) !== 0) {
            if (!lasty)
                bughack.inarea.y1 = y + 1;
            lasty = y;
        }
    bughack.inarea.y2 = ((lasty > bughack.inarea.y1) ? lasty : y) - 1;
    /* two pools mark where special post-wallify fix-ups are needed */
    for (x = bughack.inarea.x1; x <= bughack.inarea.x2; ++x)
        for (y = bughack.inarea.y1; y <= bughack.inarea.y2; ++y) {
            const loc = g.level.at(x, y);
            if (loc.typ === POOL) {
                loc.typ = HWALL;
                if (bughack.delarea.x1 === COLNO) {
                    bughack.delarea.x1 = x; bughack.delarea.y1 = y;
                } else {
                    bughack.delarea.x2 = x; bughack.delarea.y2 = y;
                }
            } else if (loc.typ === IRONBARS) {
                /* novelty effect; allowing digging in front of 'eyes' */
                if (isok(x - 1, y)
                    && ((g.level.at(x - 1, y).wall_info ?? 0)
                        & W_NONDIGGABLE) !== 0) {
                    g.level.at(x - 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x - 2, y))
                        g.level.at(x - 2, y).wall_info &= ~W_NONDIGGABLE;
                } else if (isok(x + 1, y)
                           && ((g.level.at(x + 1, y).wall_info ?? 0)
                               & W_NONDIGGABLE) !== 0) {
                    g.level.at(x + 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x + 2, y))
                        g.level.at(x + 2, y).wall_info &= ~W_NONDIGGABLE;
                }
            }
        }

    /* the wallify pass sees the bughack region via game.bughack, which
       fix_wall_spines consults (mkmaze.c:212) */
    g.bughack = bughack;
    mkmaze_mklev_fns?.wallification?.(
        Math.max(bughack.inarea.x1 - 2, 1),
        Math.max(bughack.inarea.y1 - 2, 0),
        Math.min(bughack.inarea.x2 + 2, COLNO - 1),
        Math.min(bughack.inarea.y2 + 2, ROWNO - 1));

    /* bughack hack for rear-most legs on baalz level; first joint on both
       top and bottom gets a bogus extra connection to room area, producing
       unwanted rectangles; change back to separated legs */
    x = bughack.delarea.x1; y = bughack.delarea.y1;
    if (isok(x, y)
        && (g.level.at(x, y).typ === TLWALL
            || g.level.at(x, y).typ === TRWALL)
        && isok(x, y + 1) && g.level.at(x, y + 1).typ === TUWALL) {
        g.level.at(x, y).typ = (g.level.at(x, y).typ === TLWALL)
                               ? BRCORNER : BLCORNER;
        g.level.at(x, y + 1).typ = HWALL;
        const mtmp = m_at(x, y);
        if (mtmp) /* something at temporary pool... rloc(RLOC_ERR|NOMSG) */
            note_unported_mkmaze('baalz_fixup:rloc');
    }

    x = bughack.delarea.x2; y = bughack.delarea.y2;
    if (isok(x, y)
        && (g.level.at(x, y).typ === TLWALL
            || g.level.at(x, y).typ === TRWALL)
        && isok(x, y - 1) && g.level.at(x, y - 1).typ === TDWALL) {
        g.level.at(x, y).typ = (g.level.at(x, y).typ === TLWALL)
                               ? TRCORNER : TLCORNER;
        g.level.at(x, y - 1).typ = HWALL;
        const mtmp = m_at(x, y);
        if (mtmp) /* something at temporary pool... rloc(RLOC_ERR|NOMSG) */
            note_unported_mkmaze('baalz_fixup:rloc');
    }

    /* reset bughack region; set low end to <COLNO,ROWNO> so that
       within_bounded_area() in fix_wall_spines() will fail */
    g.bughack = { inarea: { x1: COLNO, y1: ROWNO, x2: COLNO, y2: ROWNO },
                  delarea: { x1: COLNO, y1: ROWNO, x2: COLNO, y2: ROWNO } };
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
//
// The bounds are gx.x_maze_max/gy.y_maze_max, normally (COLNO-1)&~1 = 78
// and (ROWNO-1)&~1 = 20 (decl.c:827) but TEMPORARILY REDUCED by
// create_maze() while it carves the small pre-scale maze.
function okay(x, y, dir) {
    const c = { x, y };
    mz_move(c, dir);
    mz_move(c, dir);
    if (c.x < 3 || c.y < 3 || c.x > (game.x_maze_max ?? 78)
        || c.y > (game.y_maze_max ?? 20)
        || game.level.at(c.x, c.y)?.typ !== STONE)
        return false;
    return true;
}

// src/mkmaze.c:309 maze0xy() — a random odd cell inside the maze bounds.
// Two draws, x then y, against the CURRENT (possibly reduced) bounds.
function maze0xy(cc) {
    cc.x = 3 + 2 * rn2(((game.x_maze_max ?? 78) >> 1) - 1);
    cc.y = 3 + 2 * rn2(((game.y_maze_max ?? 20) >> 1) - 1);
}

// src/mkmaze.c:892 maze_inbounds()
function maze_inbounds(x, y) {
    return (x >= 2 && y >= 2
            && x < (game.x_maze_max ?? 78) && y < (game.y_maze_max ?? 20)
            && isok(x, y));
}

// src/mkmaze.c:904 maze_remove_deadends() — knock one wall out of each
// dead-end cell. DRAWS one rn2(idx) per qualifying cell, x-outer scan, and
// cells opened earlier in the scan change what later cells see.
function maze_remove_deadends(typ) {
    const dirok = [0, 0, 0, 0];
    let idx, idx2;

    for (let x = 2; x < (game.x_maze_max ?? 78); x++)
        for (let y = 2; y < (game.y_maze_max ?? 20); y++)
            if (ACCESSIBLE(game.level.at(x, y).typ) && (x % 2) && (y % 2)) {
                idx = idx2 = 0;
                for (let dir = 0; dir < 4; dir++) {
                    /* note: mz_move() is a macro which modifies
                       one of its first two parameters */
                    const c = { x, y };
                    const c2 = { x, y };
                    mz_move(c, dir);
                    if (!maze_inbounds(c.x, c.y)) {
                        idx2++;
                        continue;
                    }
                    mz_move(c2, dir);
                    mz_move(c2, dir);
                    if (!maze_inbounds(c2.x, c2.y)) {
                        idx2++;
                        continue;
                    }
                    if (!ACCESSIBLE(game.level.at(c.x, c.y).typ)
                        && ACCESSIBLE(game.level.at(c2.x, c2.y).typ)) {
                        dirok[idx++] = dir;
                        idx2++;
                    }
                }
                if (idx2 >= 3 && idx > 0) {
                    const c = { x, y };
                    mz_move(c, dirok[rn2(idx)]);
                    game.level.at(c.x, c.y).typ = typ;
                }
            }
}

// src/mkmaze.c:950 create_maze() — a maze with the given corridor width and
// wall thickness: fill a grid, shrink the maze bounds, walk a unit maze,
// optionally remove dead ends, restore the bounds and scale the result up.
//
// Draws: rnd(4) for each of corrwid/wallthick when passed as -1, then
// maze0xy's pair, walkfrom's rn2 chain, and maze_remove_deadends when asked.
export function create_maze(corrwid, wallthick, rmdeadends) {
    const mm = { x: 0, y: 0 };
    const tmp_xmax = game.x_maze_max;
    const tmp_ymax = game.y_maze_max;

    if (corrwid === -1)
        corrwid = rnd(4);

    if (wallthick === -1)
        wallthick = rnd(4) - corrwid;

    if (wallthick < 1)
        wallthick = 1;
    else if (wallthick > 5)
        wallthick = 5;

    if (corrwid < 1)
        corrwid = 1;
    else if (corrwid > 5)
        corrwid = 5;

    const scale = corrwid + wallthick;
    const rdx = (((tmp_xmax ?? 78) / scale) | 0);
    const rdy = (((tmp_ymax ?? 20) / scale) | 0);

    if (game.level.flags?.corrmaze) {
        for (let x = 2; x < (rdx * 2); x++)
            for (let y = 2; y < (rdy * 2); y++)
                game.level.at(x, y).typ = STONE;
    } else {
        for (let x = 2; x <= (rdx * 2); x++)
            for (let y = 2; y <= (rdy * 2); y++)
                game.level.at(x, y).typ = ((x % 2) && (y % 2)) ? STONE : HWALL;
    }

    /* set upper bounds for maze0xy and walkfrom */
    game.x_maze_max = (rdx * 2);
    game.y_maze_max = (rdy * 2);

    /* create maze */
    maze0xy(mm);
    walkfrom(mm.x, mm.y, 0);

    if (rmdeadends)
        maze_remove_deadends(game.level.flags?.corrmaze ? CORR : ROOM);

    /* restore bounds */
    game.x_maze_max = tmp_xmax;
    game.y_maze_max = tmp_ymax;

    /* scale maze up if needed */
    if (scale > 2) {
        const x_maze_max = game.x_maze_max ?? 78;
        const y_maze_max = game.y_maze_max ?? 20;
        const tmpmap = [];

        /* back up the existing smaller maze */
        for (let x = 1; x < x_maze_max; x++) {
            tmpmap[x] = [];
            for (let y = 1; y < y_maze_max; y++)
                tmpmap[x][y] = game.level.at(x, y).typ;
        }

        /* do the scaling */
        let x = 2, rx = 2;
        while (rx < x_maze_max) {
            const mx = (x % 2) ? corrwid
                       : (x === 2 || x === rdx * 2) ? 1
                         : wallthick;
            let y = 2, ry = 2;
            while (ry < y_maze_max) {
                const my = (y % 2) ? corrwid
                           : (y === 2 || y === rdy * 2) ? 1
                             : wallthick;
                for (let dx = 0; dx < mx; dx++)
                    for (let dy = 0; dy < my; dy++) {
                        if (rx + dx >= x_maze_max || ry + dy >= y_maze_max)
                            break;      /* C: breaks the dy loop only */
                        game.level.at(rx + dx, ry + dy).typ = tmpmap[x][y];
                    }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }
}
sp_lev_wire_create_maze(create_maze);

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
