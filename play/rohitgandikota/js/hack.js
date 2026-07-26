import { is_flimsy } from './obj.js';
import { You, pline_xy, pline_The, set_msg_xy } from './pline.js';
import { a_monnam, upstart } from './do_name.js';
import { is_door_mappear } from './monst.js';
import { dist2 } from './hacklib.js';
import { Levitation, Flying, Fire_resistance } from './youprop.js';
import { is_pool_or_lava } from './dbridge.js';
import { is_pool, is_lava, t_at, m_at } from './mon.js';
import { cmdq_clear, closed_door } from './cmd.js';
// hack.js — the hero's movement and the terrain predicates that go with it.
// C ref: src/hack.c
//
// These three predicates decide, for every monster and for the hero, whether a
// square can be entered. They had been living in mon.js and dog.js because
// those were their first callers; their C home is hack.c and this is it.
//
// None of them draws.

import { game } from './gstate.js';
import { do_attack } from './uhitm.js';
import { sensemon, is_safemon, mon_visible } from './display.js';
import { hides_under } from './mondata.js';
import { PMNAMES, MONSYMS } from './monst_data.js';
import { rn2 } from './rng.js';
import {
    IS_STWALL, IS_TREE, IS_OBSTRUCTED,
    W_NONDIGGABLE, W_NONPASSWALL,

    ROOMOFFSET, SHOPBASE, NO_ROOM, SHARED, SHARED_PLUS, COLNO, ROWNO, CQ_CANNED, VIBRATING_SQUARE, LAVAWALL, IS_WATERWALL, STONE, CORR, ICE, ROOM, IS_AIR, M_AP_OBJECT, M_AP_FURNITURE, M_AP_TYPE, isok, u_at } from './const.js';
import { sobj_at } from './invent.js';
import { done } from './end.js';
import { DIED } from './const.js';
import { ONAMES } from './objects_data.js';
import { In_sokoban } from './dungeon.js';
import { tunnels, needspick, passes_walls } from './mondata.js';

// src/hack.c:922 may_dig() — intended to be called only on ROCKs or TREEs. A
// non-diggable wall or tree cannot be tunnelled through, which is what stops
// can_reach_location() routing a pet's path through solid rock.
export function may_dig(x, y) {
    const lev = game.level.at(x, y);
    if (!lev)
        return false;

    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && (lev.wall_info & W_NONDIGGABLE));
}

// src/hack.c may_passwall() — a phasing monster still cannot cross a wall the
// level generator marked non-passable (vault walls, the Sanctum).
export function may_passwall(x, y) {
    const lev = game.level.at(x, y);
    if (!lev)
        return false;

    return !(IS_STWALL(lev.typ) && (lev.wall_info & W_NONPASSWALL));
}

// src/hack.c:939 bad_rock() — is this square one a monster cannot walk through?
//
// The port used to carry only three of the five terms. It was missing
// `|| !may_dig(x, y)`, so a tunneller with no pick was let through undiggable
// rock, and it was missing `&& may_passwall(x, y)`, so a phasing monster was
// let through a vault wall. Both errors open paths the C never opens, and a
// pet that believes it can reach a square walks a different route to it.
export function bad_rock(mdat, x, y) {
    const lev = game.level?.at(x, y);
    if (!lev)
        return true;

    return ((In_sokoban(game.u.uz) && sobj_at(ONAMES.BOULDER, x, y))
            || (IS_OBSTRUCTED(lev.typ)
                && (!tunnels(mdat) || needspick(mdat) || !may_dig(x, y))
                && !(passes_walls(mdat) && may_passwall(x, y))));
}

// src/hack.c:4256 losehp() — the hero takes damage, and dies if it reaches 0.
//
// This is the main route into done(). It draws nothing itself; showdamage and
// end_running are display and movement bookkeeping.
export function losehp(n, knam, k_format) {
    /* Upolyd's rehumanize path needs polymorph state */
    game.u.uhp -= n;
    if (game.u.uhp > game.u.uhpmax)
        game.u.uhpmax = game.u.uhp;     /* perhaps n was negative */

    if (game.u.uhp < 1) {
        game.killer = { format: k_format, name: knam };
        done(DIED);
    }
}

// src/hack.c:3498 in_rooms() — the room numbers touching (x,y), as a string.
//
// Returns a STRING of room numbers, not a boolean, and callers test it with
// `*in_rooms(...)` — i.e. "is it non-empty". The odd shape comes from a square
// on a shared wall belonging to more than one room: SHARED steps by 2 to skip
// the diagonals, SHARED_PLUS steps by 1 to include them, and a plain room
// number short-circuits to just itself.
//
// `typewanted` filters: 0 accepts any room, SHOPBASE accepts every shop type.
// No draws anywhere in it.
export function in_rooms(x, y, typewanted) {
    /* svr.rooms in the C. The live array is game.level.rooms, assigned by
       mklev; game.rooms is initialised once in js/game.js and never written,
       so reading it here made every TYPE-FILTERED lookup fail -- in_rooms(x,
       y, SHOPBASE) and in_rooms(x, y, TEMPLE) always returned empty. */
    const rooms = game.level?.rooms || [];
    const goodtype = (rno) => {
        if (!typewanted)
            return true;
        const typefound = rooms[rno - ROOMOFFSET]?.rtype;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    };

    let out = '';
    const push = (rno) => { out = String.fromCharCode(rno) + out; };

    let rno = game.level?.at(x, y)?.roomno ?? NO_ROOM;
    let step;
    switch (rno) {
    case NO_ROOM:
        return out;
    case SHARED:
        step = 2;
        break;
    case SHARED_PLUS:
        step = 1;
        break;
    default:                            /* a regular room number */
        if (goodtype(rno))
            push(rno);
        return out;
    }

    let min_x = x - 1, max_x = x + 1;
    if (x < 1) min_x += step;
    else if (x >= COLNO) max_x -= step;

    let min_y = y - 1, max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    for (let xx = min_x; xx <= max_x; xx += step)
        for (let yy = 0; yy <= max_y_offset; yy += step) {
            rno = game.level?.at(xx, min_y + yy)?.roomno ?? NO_ROOM;
            if (rno >= ROOMOFFSET && !out.includes(String.fromCharCode(rno))
                && goodtype(rno))
                push(rno);
        }
    return out;
}

/* js/monmove.js needs in_rooms() but cannot import this file without closing
   a cycle, and adding the import to the entry point perturbs module init order
   (see STATUS). Publishing on the shared game object avoids both. */
game.in_rooms = in_rooms;

// src/hack.c domove_attackmon_at() — the gate between walking into a square
// and attacking what is standing on it.
//
// The guard is four ways to be allowed to attack: forcefight, the monster is
// not hidden, you sense it, or it is a hider/eel that is NOT safe to bump
// into. A hider you cannot see still routes to do_attack, which prints the
// "Wait!" message -- that is why the hides_under clause exists at all.
//
// The displacer-beast check reads as a long list of draws but is not: the
// FIRST term is an identity test against PM_DISPLACER_BEAST, so for every
// other monster the rn2(2) is never reached. Reordering these terms to put
// the cheap boolean tests first -- which looks like an optimisation -- would
// change how often that rn2(2) fires and desynchronise the stream.
//
// do_attack is only called when the displacement did NOT happen.
export async function domove_attackmon_at(mtmp, x, y, displaceu) {
    if (game.context?.forcefight || !mtmp.mundetected || sensemon(mtmp)
        || ((hides_under(game.mons[mtmp.mnum])
             || game.mons[mtmp.mnum].mlet === MONSYMS.S_EEL)
            && !is_safemon(mtmp))) {
        /* target monster might decide to switch places with you... */
        displaceu.value =
            !!(mtmp.mnum === PMNAMES.PM_DISPLACER_BEAST && !rn2(2)
               && mtmp.mux === game.u.ux0 && mtmp.muy === game.u.uy0
               && note_unported_hack('domove_attackmon_at:displace_rest'));

        /* if not displacing, try to attack; note that it might evade; also,
           we don't attack tame or peaceful when safemon() */
        if (!displaceu.value) {
            if (await do_attack(mtmp))
                return true;
        }
    }
    return false;
}

const note_unported_hack = (w) => {
    (game.unported ||= new Set()).add('hack:' + w);
    return false;
};

// src/hack.c:4130 end_running() — stop a run/rush/travel.
//
// The time_botl line is the one with a visible consequence: moveloop()
// suppresses the time field while context.run is non-zero, so the turn counter
// has to be forced to repaint at the moment running stops, or it shows a stale
// value for one frame.
export function end_running(and_travel) {
    const ctx = (game.context ||= {});

    if (ctx.run) {
        ctx.run = 0;
        if (game.flags?.time)
            (game.disp ||= {}).time_botl = true;
        /* classify_terrain() suppresses setting disp.botl while running, so C
           recomputes here. The terrainstatus option defaults to Off
           (js/optlist.js:219) and classify_terrain is not ported, so this arm
           cannot fire yet; recorded rather than guessed. */
        if (game.flags?.terrainstatus) {
            (game.unported ||= new Set()).add('hack:end_running:classify_terrain');
        }
    }

    /* 'context.mv' isn't travel but callers who want to end travel
       all clear it too */
    if (and_travel)
        ctx.travel = ctx.travel1 = ctx.mv = 0;
    if (game.travelmap) {
        /* selection_free(gt.travelmap, TRUE) — the travel map is not ported */
        (game.unported ||= new Set()).add('hack:end_running:travelmap');
        game.travelmap = null;
    }
    /* cancel multi */
    if (game.multi > 0)
        game.multi = 0;
}

// src/hack.c:4161 nomul() — set the multi-turn counter.
//
// The early return carries C's own comment ("This is a bug fix by ab@unido"):
// a caller asking for a SHORTER helplessness than the one already in effect is
// ignored, so the longest wins rather than the latest.
export function nomul(nval) {
    if (game.multi < nval)
        return;              /* This is a bug fix by ab@unido */
    (game.disp ||= {}).botl ||= (game.multi >= 0);
    if (game.u) {
        game.u.uinvulnerable = false; /* Kludge to avoid ctrl-C bug -dlc */
        game.u.usleep = 0;
    }
    game.multi = nval;
    if (nval === 0)
        game.multi_reason = null, game.multireasonbuf = '';
    end_running(true);
    cmdq_clear(CQ_CANNED);
}

// src/hack.c:59 Known_wwalking, :63 Known_lwalking — file-local macros, not
// youprop.h ones, which is why they live here rather than in js/youprop.js.
//
// "Known" is the operative word: these ask whether the HERO KNOWS they can
// walk on the liquid, not whether they actually can. Unidentified water
// walking boots still work, but the run stops at the water's edge anyway,
// because the player has no reason to believe it is safe. C's own comment
// notes this should use cause_known() if anything but boots ever grants it.
const Known_wwalking = () =>
    !!(game.uarmf && game.uarmf.otyp === ONAMES.WATER_WALKING_BOOTS
       && objects[ONAMES.WATER_WALKING_BOOTS]?.oc_name_known
       && !game.u?.usteed);

const Known_lwalking = () =>
    !!(Known_wwalking() && Fire_resistance()
       && game.uarmf.oerodeproof && game.uarmf.rknown);

// src/hack.c:2444 avoid_moving_on_trap() — stop a run at a known trap.
//
// The vibrating square is a trap structurally but terrain in spirit, so it is
// excluded; running across it does not stop.
export function avoid_moving_on_trap(x, y, msg) {
    const trap = t_at(x, y);

    if (trap && trap.tseen
        /* the vibrating square is implemented as a trap but treated as if
           it were a type of terrain */
        && trap.ttyp !== VIBRATING_SQUARE) {
        if (msg && game.flags?.mention_walls) {
            /* You("stop in front of %s.", an(trapname(trap->ttyp, FALSE)))
               -- trapname() is not ported and mention_walls defaults Off
               (js/optlist.js), so this records rather than guessing a name. */
            (game.unported ||= new Set()).add('hack:avoid_moving_on_trap:msg');
        }
        return true;
    }
    return false;
}

// src/hack.c:2463 avoid_moving_on_liquid() — stop a run at water or lava.
//
// The first condition is a tangle worth reading carefully: it returns FALSE
// (safe, keep going) when you are NOT crossing a terrain boundary, OR you are
// shift-running and the transition is not lava, OR you are travelling -- AND
// you know you will not fall in -- AND it is not a waterwall or lavawall.
// Everything else falls through to the stop test.
export function avoid_moving_on_liquid(x, y, msg) {
    const in_air = (Levitation() || Flying());
    const here = game.level?.at?.(game.u.ux, game.u.uy);
    const there = game.level?.at?.(x, y);
    if (!there || !here)
        return false;

    /* don't stop if you're not on a transition between terrain types... */
    if ((there.typ === here.typ
         /* or you are using shift-dir running and the transition isn't
            dangerous... */
         || ((game.context?.run | 0) < 2 && (!is_lava(x, y) || in_air))
         || game.context?.travel)
        /* and you know you won't fall in */
        && (in_air || Known_lwalking()
            || (is_pool(x, y) && Known_wwalking()))
        && !(IS_WATERWALL(there.typ) || there.typ === LAVAWALL)) {
        return false; /* liquid is safe to traverse */
    } else if (is_pool_or_lava(x, y) && there.seenv) {
        if (msg && game.flags?.mention_walls) {
            /* You("stop at the edge of the %s.", hliquid(...)) -- hliquid()
               is not ported and mention_walls defaults Off. */
            (game.unported ||= new Set()).add('hack:avoid_moving_on_liquid:msg');
        }
        return true;
    }
    return false;
}

// include/hack.h:1414 NODIAG() — only grid bugs cannot move diagonally.
const NODIAG = (monnum) => monnum === PMNAMES.PM_GRID_BUG;

// src/hack.c:3898 lookaround() — decide whether a run/rush should stop here,
// and if it is following a corridor, which way to turn next.
//
// This is what makes a rush cover several squares in one command. Without it
// the port zeroed context.run and took a single step, so every G/shift move
// diverged from C by however many squares C would have continued.
//
// C uses two gotos. `stop` is the ordinary "end the run" exit, translated as
// nomul(0) + return. `bcorr` is a FORWARD jump landing inside the corridor
// arm of the if-else chain, reached from the trap arm and the closed-door
// arm; it is translated as an explicit flag rather than by restructuring,
// because the fall-through order is load bearing and rewriting it as nested
// conditions is exactly the kind of "cleaner" shape that diverges later.
//
// The turn logic at the bottom is the part with no obvious intuition: i0
// tracks the closest corridor square seen, m0 whether a monster was on it,
// noturn whether two corridor squares were non-adjacent (a fork). A turn is
// only taken when exactly one corridor continues, and never more than a half
// turn per step, which is what u.last_str_turn accumulates.
export async function lookaround() {
    let x, y, i, x0 = 0, y0 = 0, m0 = 1, i0 = 9;
    let corrct = 0, noturn = 0;
    const u = game.u;
    const lev = game.level;

    /* Grid bugs stop if trying to move diagonal, even if blind.  Maybe */
    /* they polymorphed while in the middle of a long move. */
    if (NODIAG(u.umonnum) && u.dx && u.dy) {
        await You('cannot move diagonally.');
        nomul(0);
        return;
    }

    if (u.ublind || (game.context?.run | 0) === 0)
        return;

    for (x = u.ux - 1; x <= u.ux + 1; x++) {
        for (y = u.uy - 1; y <= u.uy + 1; y++) {
            const infront = (x === u.ux + u.dx && y === u.uy + u.dy);
            const run = game.context?.run | 0;

            /* ignore out of bounds, and our own location */
            if (!isok(x, y) || u_at(x, y))
                continue;
            /* (grid bugs) ignore diagonals */
            if (NODIAG(u.umonnum) && x !== u.ux && y !== u.uy)
                continue;

            const mtmp = m_at(x, y);
            let bcorr = false, stop = false, next = false;

            /* can we see a monster there? */
            if (mtmp
                && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                /* running movement and not a hostile monster */
                /* OR it blocks our move direction and we're not traveling */
                if ((run !== 1 && !is_safemon(mtmp))
                    || (infront && !game.context?.travel)) {
                    if (game.flags?.mention_walls)
                        await pline_xy(x, y, upstart(a_monnam(mtmp))
                                       + ' blocks your path.');
                    nomul(0);
                    return;
                }
            }

            const loc = lev?.at?.(x, y);
            if (!loc)
                continue;

            /* stone is never interesting */
            if (loc.typ === STONE)
                continue;
            /* ignore the square we're moving away from */
            if (x === u.ux - u.dx && y === u.uy - u.dy)
                continue;

            /* stop for traps, sometimes */
            if (avoid_moving_on_trap(x, y, (infront && run > 1))) {
                if (run === 1)
                    bcorr = true;       /* goto bcorr -- if you must */
                else if (infront)
                    stop = true;
            }

            if (!bcorr && !stop) {
                const here = lev?.at?.(u.ux, u.uy);
                /* more uninteresting terrain */
                if (IS_OBSTRUCTED(loc.typ) || loc.typ === ROOM
                    || IS_AIR(loc.typ) || loc.typ === ICE) {
                    continue;
                } else if (closed_door(x, y)
                           || (mtmp && is_door_mappear(mtmp))) {
                    /* a closed door? */
                    /* ignore if diagonal */
                    if (x !== u.ux && y !== u.uy)
                        continue;
                    if (run !== 1 && !game.context?.travel) {
                        if (game.flags?.mention_walls) {
                            set_msg_xy(x, y);
                            await You('stop in front of the door.');
                        }
                        stop = true;
                    } else {
                        /* orthogonal to a closed door, treat as a corridor */
                        bcorr = true;
                    }
                } else if (loc.typ === CORR) {
                    bcorr = true;
                } else if (is_pool_or_lava(x, y)) {
                    if (infront && avoid_moving_on_liquid(x, y, true))
                        stop = true;
                    else
                        next = true;
                } else { /* e.g. objects or trap or stairs */
                    if (run === 1)
                        bcorr = true;
                    else if (run === 8)
                        next = true;
                    else if (mtmp)
                        next = true;            /* d */
                    else if (((x === u.ux - u.dx) && (y !== u.uy + u.dy))
                             || ((y === u.uy - u.dy) && (x !== u.ux + u.dx)))
                        next = true;
                    /* otherwise falls through to stop */
                }
            }

            if (next)
                continue;

            if (bcorr) {
                /* bcorr: */
                const here = lev?.at?.(u.ux, u.uy);
                if (here && here.typ !== ROOM) {
                    /* running or traveling */
                    if (run === 1 || run === 3 || run === 8) {
                        /* distance from x,y to location we're moving to */
                        i = dist2(x, y, u.ux + u.dx, u.uy + u.dy);
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (corrct === 1 && dist2(x, y, x0, y0) !== 1)
                            noturn = 1;
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = i;
                            x0 = x;
                            y0 = y;
                            m0 = mtmp ? 1 : 0;
                        }
                    }
                    corrct++;
                }
                continue;
            }

            /* stop: */
            nomul(0);
            return;
        }
    } /* end for loops */

    if (corrct > 1 && (game.context?.run | 0) === 2) {
        if (game.flags?.mention_walls)
            await pline_The('corridor widens here.');
        nomul(0);
        return;
    }

    const run = game.context?.run | 0;
    if ((run === 1 || run === 3 || run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        /* make sure that we do not turn too far */
        if (i0 === 2) {
            if (u.dx === y0 - u.uy && u.dy === u.ux - x0)
                i = 2; /* straight turn right */
            else
                i = -2; /* straight turn left */
        } else if (u.dx && u.dy) {
            if ((u.dx === u.dy && y0 === u.uy)
                || (u.dx !== u.dy && y0 !== u.uy))
                i = -1; /* half turn left */
            else
                i = 1; /* half turn right */
        } else {
            if ((x0 - u.ux === y0 - u.uy && !u.dy)
                || (x0 - u.ux !== y0 - u.uy && u.dy))
                i = 1; /* half turn right */
            else
                i = -1; /* half turn left */
        }

        i += (u.last_str_turn | 0);
        if (i <= 2 && i >= -2) {
            u.last_str_turn = i;
            u.dx = x0 - u.ux;
            u.dy = y0 - u.uy;
        }
    }
}

// src/hack.c:1787 impact_disturbs_zombies() — a heavy object hitting the floor
// wakes zombies buried nearby.
//
// The early return is fully ported and is what fires in the common case: a
// light or flimsy object makes no noticeable impact and nothing happens. Only
// a heavy, non-flimsy drop reaches disturb_buried_zombies(), which needs the
// buried object list and peek_timer/stop_timer -- none of which exist yet --
// so that call is recorded rather than guessed.
//
// Note the threshold flips with `violent`: 10 for a violent impact, 100 for an
// ordinary drop, so an ordinary drop has to be ten times heavier to matter.
export function impact_disturbs_zombies(obj, violent) {
    /* if object won't make a noticeable impact, let buried zombies rest */
    if (obj.owt < (violent ? 10 : 100) || is_flimsy(obj))
        return;

    /* disturb_buried_zombies(obj->ox, obj->oy) */
    (game.unported ||= new Set()).add('hack:disturb_buried_zombies');
}
