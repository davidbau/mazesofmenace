// ball.js — the punished hero's ball and chain.
// C ref: src/ball.c — placebc, move_bc, drag_ball, bc_order.
//
// A hero who reads a scroll of punishment (read.js punish()) is chained to a
// heavy iron ball.  Moving then costs TWO turns rather than one, because
// hack.c domove_core() ends with
//
//     if (cause_delay) { nomul(-2); gm.multi_reason = "dragging an iron ball"; }
//
// and drag_ball() sets cause_delay whenever the ball itself has to be dragged.
// That extra turn is a full moveloop iteration — monsters move, the hunger and
// sounds rolls fire — so omitting it desynchronised every later PRNG draw on
// seed4500 from step 514 on (C ran T:87 -> 89 for one movement key; we ran one
// turn).  The ball and chain also occupy map squares that trail the hero, so
// their placement is load-bearing for the rendered map.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { newsym } from './display.js';
import { place_object } from './mkobj.js';
import { t_at } from './trap.js';
import { IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, is_pit, is_hole, POOL,
         SLT_ENCUMBER } from './const.js';

// C ref: you.h — bit masks for u.bc_felt and the bc_control argument.
export const BC_BALL = 0x01;
export const BC_CHAIN = 0x02;
// C ref: you.h — which of the pair is drawn on top when they share a square.
const BCPOS_BALL = 0, BCPOS_CHAIN = 1, BCPOS_DIFFER = 2;

// C ref: hacklib.c dist2 / distmin.
const dist2 = (x0, y0, x1, y1) => (x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1);
const distmin = (x0, y0, x1, y1) => Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));

// C ref: mkobj.c remove_object(obj) — unlink a floor object from the level pile
// (the JS engine keeps one flat array; last placed is topmost, matching C).
function remove_object(obj) {
    const arr = game.level?.objects;
    if (!arr) return;
    const ix = arr.indexOf(obj);
    if (ix >= 0) arr.splice(ix, 1);
    obj.where = 'free';
}

const at = (x, y) => game.level?.at(x, y) || null;
// C ref: ball.c IS_CHAIN_ROCK(x,y) — the chain may never be moved into solid
// rock or a closed/locked door.
function IS_CHAIN_ROCK(x, y) {
    const loc = at(x, y);
    if (!loc) return true;
    const typ = loc.typ ?? 0;
    if (IS_OBSTRUCTED(typ)) return true;
    return IS_DOOR(typ) && ((loc.doormask ?? 0) & (D_CLOSED | D_LOCKED)) !== 0;
}
// C ref: obj.h carried(obj) — in the hero's inventory rather than on the floor.
const carried = (obj) => obj?.where === 'invent';

// C ref: ball.c bc_order() — which object is nearer the top of the pile when
// the ball and chain share a square.
function bc_order() {
    const u = game.u, uball = u?.uball, uchain = u?.uchain;
    if (!uball || !uchain || uball.ox !== uchain.ox || uball.oy !== uchain.oy
        || carried(uball))
        return BCPOS_DIFFER;
    // C walks svl.level.objects[x][y] via ->nexthere, which is TOPMOST-FIRST, and
    // returns whichever of the pair it meets first.  The JS engine keeps one flat
    // array in which the LAST entry at a square is the topmost (display.js
    // vobj_at() returns the last match), so the equivalent walk is in reverse.
    // Iterating forwards answered BCPOS_BALL for a pile whose top is the chain,
    // which flipped move_bc()'s "nothing moved" branch and drew the ball over the
    // chain on the hero's trailing square (seed4500 step 512 shows '_', not '0').
    const objs = game.level?.objects || [];
    for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        if (o.where !== 'floor' || o.ox !== uball.ox || o.oy !== uball.oy) continue;
        if (o === uchain) return BCPOS_CHAIN;
        if (o === uball) return BCPOS_BALL;
    }
    return BCPOS_DIFFER;
}

// C ref: ball.c placebc() — put the pair down on the hero's square.  Ball
// first so the chain lands on top (u.bc_order = BCPOS_CHAIN).
export function placebc() {
    const u = game.u;
    if (!u?.uball || !u?.uchain) return;
    if (!carried(u.uball)) place_object(u.uball, u.ux, u.uy);
    place_object(u.uchain, u.ux, u.uy);
    newsym(u.ux, u.uy);
}

// C ref: ball.c move_bc(before, control, ballx, bally, chainx, chainy) — the
// NON-blind arm.  "To make this work correctly, we need to pick up the ball and
// chain before the hero moves, then put them in their new positions after the
// hero moves."  The Blind arm maintains u.bc_felt/bglyph/cglyph so a blind hero
// keeps feeling whichever of the pair it last touched; no recorded session is
// blind while punished, so it is deliberately not ported (and would be dead
// code that could only drift).  No RNG in either arm.
export function move_bc(before, control, ballx, bally, chainx, chainy) {
    const u = game.u;
    const uball = u?.uball, uchain = u?.uchain;
    if (!uball || !uchain) return;

    if (before) {
        if (!control) {
            // Neither is moving: remember which was on top until !before.
            u.bc_order = bc_order();
        }
        remove_object(uchain);
        newsym(uchain.ox, uchain.oy);
        if (!carried(uball)) {
            remove_object(uball);
            newsym(uball.ox, uball.oy);
        }
    } else {
        const on_floor = !carried(uball);
        if ((control & BC_CHAIN) || (!control && u.bc_order === BCPOS_CHAIN)) {
            // The chain moved, or nothing moved and the chain was on top.
            if (on_floor) place_object(uball, ballx, bally);
            place_object(uchain, chainx, chainy);   /* chain on top */
        } else {
            place_object(uchain, chainx, chainy);
            if (on_floor) place_object(uball, ballx, bally);
                                                     /* ball on top */
        }
        newsym(chainx, chainy);
        if (on_floor) newsym(ballx, bally);
    }
}

// C ref: ball.c drag_ball(x, y, ...) — decide how the pair follows the hero to
// <x,y>.  Called BEFORE the move, since the chain often wants the hero's old
// square.  Returns null when the caller must abort the move (C's FALSE), else
// { bc_control, ballx, bally, chainx, chainy, cause_delay }.
//
// `allow_drag` is TRUE from domove and FALSE from teleport; it only guards the
// two pathological-geometry escapes in the dist2 == 5 arm.
export async function drag_ball(x, y, allow_drag = true) {
    const u = game.u;
    const uball = u.uball, uchain = u.uchain;
    let ballx = uball.ox, bally = uball.oy;
    let chainx = uchain.ox, chainy = uchain.oy;
    let bc_control = 0;
    let cause_delay = false;

    if (dist2(x, y, uchain.ox, uchain.oy) <= 2) {   /* nothing moved */
        move_bc(1, bc_control, ballx, bally, chainx, chainy);
        return { bc_control, ballx, bally, chainx, chainy, cause_delay };
    }

    // ── only the chain needs to move? ────────────────────────────────────────
    let goto_drag = false;
    if (carried(uball) || distmin(x, y, uball.ox, uball.oy) <= 2) {
        const oldchainx = uchain.ox, oldchainy = uchain.oy;
        bc_control = BC_CHAIN;
        move_bc(1, bc_control, ballx, bally, chainx, chainy);
        if (carried(uball)) {
            /* move chain only if necessary */
            if (distmin(x, y, uchain.ox, uchain.oy) > 1) {
                chainx = u.ux; chainy = u.uy;
            }
            return { bc_control, ballx, bally, chainx, chainy, cause_delay };
        }

        const CHAIN_IN_MIDDLE = (chx, chy) =>
            distmin(x, y, chx, chy) <= 1
            && distmin(chx, chy, uball.ox, uball.oy) <= 1;
        // C's SKIP_TO_DRAG: undo the move_bc() and fall through to the drag code.
        const skip_to_drag = () => {
            chainx = oldchainx; chainy = oldchainy;
            move_bc(0, bc_control, ballx, bally, chainx, chainy);
            goto_drag = true;
        };
        const already_in_rock = IS_CHAIN_ROCK(u.ux, u.uy)
            || IS_CHAIN_ROCK(chainx, chainy)
            || IS_CHAIN_ROCK(uball.ox, uball.oy);

        switch (dist2(x, y, uball.ox, uball.oy)) {
        case 8:
            /* two spaces diagonal from ball: chain goes in between */
            chainx = Math.trunc((uball.ox + x) / 2);
            chainy = Math.trunc((uball.oy + y) / 2);
            if (IS_CHAIN_ROCK(chainx, chainy) && !already_in_rock) skip_to_drag();
            break;
        case 5: {
            /* distance 2/1 from the ball: chain goes to one of the two squares
             * between, whichever is closest to where it already is */
            let tempx, tempy, tempx2, tempy2;
            if (Math.abs(x - uball.ox) === 1) {
                tempx = x; tempx2 = uball.ox;
                tempy = tempy2 = Math.trunc((uball.oy + y) / 2);
            } else {
                tempx = tempx2 = Math.trunc((uball.ox + x) / 2);
                tempy = y; tempy2 = uball.oy;
            }
            const rock1 = IS_CHAIN_ROCK(tempx, tempy);
            const rock2 = IS_CHAIN_ROCK(tempx2, tempy2);
            if (rock1 && !rock2 && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx, tempy) === 1) { skip_to_drag(); break; }
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx, tempy) === 2) { skip_to_drag(); break; }
                }
                chainx = tempx2; chainy = tempy2;
            } else if (!rock1 && rock2 && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx2, tempy2) === 1) { skip_to_drag(); break; }
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx2, tempy2) === 2) { skip_to_drag(); break; }
                }
                chainx = tempx; chainy = tempy;
            } else if (rock1 && rock2 && !already_in_rock) {
                skip_to_drag();
            } else {
                // Tie-break between the two candidate squares.  The rn2(2) is
                // only drawn when both are equidistant from the chain's current
                // square — C's `||` short-circuits on the strict-less case.
                const d1 = dist2(tempx, tempy, uchain.ox, uchain.oy);
                const d2 = dist2(tempx2, tempy2, uchain.ox, uchain.oy);
                if (d1 < d2 || (d1 === d2 && rn2(2))) {
                    chainx = tempx; chainy = tempy;
                } else {
                    chainx = tempx2; chainy = tempy2;
                }
            }
            break;
        }
        case 4:
            /* ball two spaces orthogonal: chain in between unless already OK */
            if (CHAIN_IN_MIDDLE(uchain.ox, uchain.oy)) break;
            chainx = Math.trunc((x + uball.ox) / 2);
            chainy = Math.trunc((y + uball.oy) / 2);
            if (IS_CHAIN_ROCK(chainx, chainy) && !already_in_rock) skip_to_drag();
            break;
        case 2:
            if (dist2(x, y, uball.ox, uball.oy) === 2
                && dist2(x, y, uchain.ox, uchain.oy) === 4) {
                if (uchain.oy === y) chainx = uball.ox;
                else chainy = uball.oy;
                if (IS_CHAIN_ROCK(chainx, chainy) && !already_in_rock) skip_to_drag();
                break;
            }
            /* FALLTHROUGH */
        case 1:
        case 0:
            if (CHAIN_IN_MIDDLE(uchain.ox, uchain.oy)) break;
            if (CHAIN_IN_MIDDLE(u.ux, u.uy)) { chainx = u.ux; chainy = u.uy; break; }
            /* they must have teleported for this to happen */
            chainx = x; chainy = y;
            break;
        default:
            /* C: impossible("bad chain movement") */
            break;
        }
        if (!goto_drag)
            return { bc_control, ballx, bally, chainx, chainy, cause_delay };
    }

    // ── drag: ────────────────────────────────────────────────────────────────
    const { near_capacity } = await import('./invent.js');
    if (near_capacity() > SLT_ENCUMBER && dist2(x, y, u.ux, u.uy) <= 2) {
        const { update_topl } = await import('./display.js');
        const has_invent = (game.u?.invent || []).length > 0;
        await update_topl(`You cannot ${has_invent ? 'carry all that and also ' : ''}drag the heavy iron ball.`);
        nomul0();
        return null;
    }

    // Being jerked back by the ball when the chain is over water or a pit.  The
    // recorded punished movement is all on dry room floor, so this branch has
    // never fired; it is ported for the geometry, minus the hmon() attack on a
    // monster standing where the hero gets yanked (which needs the full
    // hero-melee damage path).
    const chainLoc = at(uchain.ox, uchain.oy);
    const chainPool = !!chainLoc && (chainLoc.typ === POOL);
    const chainTrap = t_at(uchain.ox, uchain.oy);
    if (chainPool || (chainTrap && (is_pit(chainTrap.ttyp) || is_hole(chainTrap.ttyp)))) {
        const { update_topl } = await import('./display.js');
        await update_topl('You are jerked back by the iron ball!');
        u.ux = uchain.ox; u.uy = uchain.oy;
        newsym(u.ux0 ?? u.ux, u.uy0 ?? u.uy);
        nomul0();
        bc_control = BC_BALL;
        move_bc(1, bc_control, ballx, bally, chainx, chainy);
        ballx = uchain.ox; bally = uchain.oy;
        move_bc(0, bc_control, ballx, bally, chainx, chainy);
        return null;
    }

    bc_control = BC_BALL | BC_CHAIN;
    move_bc(1, bc_control, ballx, bally, chainx, chainy);
    if (dist2(x, y, u.ux, u.uy) > 2) {
        /* teleported out of drag range after all — behave like a teleport */
        ballx = chainx = x;
        bally = chainy = y;
    } else {
        // "chain moves to hero's previous location and ball moves to chain's
        // previous location, except that we try to keep the chain directly
        // between the hero and the ball."
        let newchainx = u.ux, newchainy = u.uy;
        if (dist2(x, y, uchain.ox, uchain.oy) === 4
            && !IS_CHAIN_ROCK(newchainx, newchainy)) {
            newchainx = Math.trunc((x + uchain.ox) / 2);
            newchainy = Math.trunc((y + uchain.oy) / 2);
            if (IS_CHAIN_ROCK(newchainx, newchainy)) {
                newchainx = u.ux; newchainy = u.uy;
            }
        }
        ballx = uchain.ox; bally = uchain.oy;
        chainx = newchainx; chainy = newchainy;
    }
    cause_delay = true;
    return { bc_control, ballx, bally, chainx, chainy, cause_delay };
}

// C ref: hack.c nomul(0) — stop any multi-turn action without setting a delay.
// Kept local so ball.js doesn't have to import the whole command module; the
// occupation must stay armed (see LESSONS: nomul(0) leaves go.occupation set).
function nomul0() {
    const g = game;
    if ((g.multi ?? 0) < 0) return;
    g.multi = 0;
    g.multi_reason = null;
}
