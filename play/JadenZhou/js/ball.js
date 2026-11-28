// ball.js — ball and chain (punishment).
// C ref: ball.c
//
// Ported: ballrelease(), ballfall(), placebc(), unplacebc(),
// placebc_core(), unplacebc_core(), check_restriction(), bc_order(),
// set_bc(), move_bc(), drag_ball(), drop_ball(), litter(), drag_down().

import { MON_AT } from './makemon.js';
import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { newsym, map_object, pline, pline_The, You, You_feel, Your,
         cls } from './display.js';
import { flooreffects, canletgo } from './do.js';
import { place_object, obj_extract_self } from './mkobj.js';
import { maybe_unhide_at } from './mon.js';
import { Is_waterlevel, BLINDED, LEVITATION, IS_OBSTRUCTED, IS_DOOR,
         D_CLOSED, D_LOCKED, POOL, SLT_ENCUMBER, HMON_DRAGGED, HEAD, LEG,
         NO_KILLER_PREFIX, KILLED_BY, KILLED_BY_AN, A_STR,
         TT_INFLOOR, TT_BURIEDBALL, TT_PIT, TT_WEB, TT_LAVA, TT_BEARTRAP,
         LEFT_SIDE, RIGHT_SIDE, is_hole, is_pit } from './const.js';
import { dist2, distmin } from './hacklib.js';
import { m_at, is_pool } from './makemon.js';
import { t_at, deltrap, losehp, Maybe_Half_Phys,
         set_wounded_legs, reset_utrap } from './trap.js';
import { near_capacity, weight_cap, nomul, spoteffects, movobj } from './hack.js';
import { find_mac, setnotworn } from './worn.js';
import { omon_adj, hitfloor } from './dothrow.js';
import { hmon } from './uhitm.js';
import { miss } from './zap.js';
import { xname, yname, Yname2, otense } from './objnam.js';
import { welded, setuwep, setuswapwep, setuqwep } from './wield.js';
import { freeinv } from './invent.js';
import { encumber_msg } from './pickup.js';
import { body_part } from './insight.js';
import { hliquid } from './potion.js';
import { fill_pit } from './muse.js';
import { exercise } from './attrib.js';
import { Blind, Levitation } from './youprop.js';
import { Luck } from './const.js';
import { carried } from './objects.js';
import { hard_helmet } from './do_wear.js';

/* C ref: you.h bc_order values, bc_felt bits */
export const BCPOS_DIFFER = 0, BCPOS_CHAIN = 1, BCPOS_BALL = 2;
export const BC_BALL = 0x01, BC_CHAIN = 0x02;

/* C ref: ball.c static int bcrestriction */
function bcrestriction() { return game.bcrestriction || 0; }

/* C ref: hack.h enum bcargs */
export const override_restriction = -1;

/* C ref: mkobj.c remove_object() -- a floor object leaves the floor */
function remove_object(otmp) {
    if (otmp.where !== 'OBJ_FLOOR')
        throw new Error(`remove_object: obj where=${otmp.where}, not on floor`);
    obj_extract_self(otmp);
}

// C ref: ball.c ballrelease()
export async function ballrelease(showmsg) {
    const g = game;

    if (carried(g.uball) && !welded(g.uball)) {
        if (showmsg)
            await pline("Startled, you drop the iron ball.");
        if (g.uwep === g.uball)
            setuwep(null);
        if (g.uswapwep === g.uball)
            setuswapwep(null);
        if (g.uquiver === g.uball)
            setuqwep(null);
        /* [this used to test 'if (uwep != uball)' but that always passes
           after the setuwep() above] */
        freeinv(g.uball); /* remove from inventory but don't place on floor */
        await encumber_msg();
    }
}

// C ref: ball.c ballfall()
/* ball&chain might hit hero when falling through a trap door */
export async function ballfall() {
    const g = game, u = g.u;
    let gets_hit;

    if (!g.uball || (g.uball && carried(g.uball) && welded(g.uball)))
        return;

    gets_hit = (((g.uball.ox !== u.ux) || (g.uball.oy !== u.uy))
                && ((g.uwep === g.uball) ? false : !!rn2(5)));
    await ballrelease(true);
    if (gets_hit) {
        let dmg = rn1(7, 25);

        await pline_The(`iron ball falls on your ${body_part(HEAD)}.`);
        if (g.uarmh) {
            if (hard_helmet(g.uarmh)) {
                await pline("Fortunately, you are wearing a hard helmet.");
                dmg = 3;
            } else if (g.flags.verbose)
                await pline(`${Yname2(g.uarmh)} does not protect you.`);
        }
        await losehp(Maybe_Half_Phys(dmg), "crunched in the head by an iron ball",
                     NO_KILLER_PREFIX);
    }
}

// C ref: ball.c placebc_core()
async function placebc_core() {
    const g = game, u = g.u;

    if (!g.uchain || !g.uball) {
        console.error('impossible: Where are your ball and chain?');
        return;
    }

    await flooreffects(g.uchain, u.ux, u.uy, ""); /* chain might rust */

    if (carried(g.uball)) { /* the ball is carried */
        u.bc_order = BCPOS_DIFFER;
    } else {
        /* ball might rust -- already checked when carried */
        await flooreffects(g.uball, u.ux, u.uy, "");
        place_object(g.uball, u.ux, u.uy);
        u.bc_order = BCPOS_CHAIN;
    }

    place_object(g.uchain, u.ux, u.uy);

    u.bglyph = u.cglyph = g.level.at(u.ux, u.uy).remembered_glyph; /* pick up glyph */

    newsym(u.ux, u.uy);
    g.bcrestriction = 0;
}

// C ref: ball.c unplacebc_core()
function unplacebc_core() {
    const g = game, u = g.u;

    if (u.uswallow) {
        if (Is_waterlevel(u.uz)) {
            /* we need to proceed with the removal from the floor
             * so that movebubbles() processing will disregard it as
             * intended. Ignore all the vision stuff.
             */
            if (!carried(g.uball))
                obj_extract_self(g.uball);
            obj_extract_self(g.uchain);
        }
        /* ball&chain not unplaced while swallowed */
        return;
    }

    if (!carried(g.uball)) {
        obj_extract_self(g.uball);
        if (Blind() && (u.bc_felt & BC_BALL)) /* drop glyph */
            g.level.at(g.uball.ox, g.uball.oy).remembered_glyph = u.bglyph;
        maybe_unhide_at(g.uball.ox, g.uball.oy);
        newsym(g.uball.ox, g.uball.oy);
    }
    obj_extract_self(g.uchain);
    if (Blind() && (u.bc_felt & BC_CHAIN)) /* drop glyph */
        g.level.at(g.uchain.ox, g.uchain.oy).remembered_glyph = u.cglyph;
    maybe_unhide_at(g.uchain.ox, g.uchain.oy);

    newsym(g.uchain.ox, g.uchain.oy);
    u.bc_felt = 0; /* feel nothing */
}

// C ref: ball.c check_restriction()
function check_restriction(restriction) {
    let ret = false;

    if (!bcrestriction() || (restriction === override_restriction))
        ret = true;
    else
        ret = (bcrestriction() === restriction);
    return ret;
}

// C ref: ball.c placebc()
export async function placebc() {
    if (!check_restriction(0)) {
        /* paniclog("placebc", "placebc denied, restriction in effect") */
        return;
    }
    if (game.uchain && game.uchain.where !== 'OBJ_FREE' && game.uchain.where) {
        console.error('impossible: bc already placed?');
        return;
    }
    await placebc_core();
}

// C ref: ball.c lift_covet_and_placebc()
export async function lift_covet_and_placebc(pin) {
    if (!check_restriction(pin)) {
        /* paniclog("placebc", "lift_covet_and_placebc denied, %s",
           (pin != bcrestriction) ? "pin mismatch" : "restriction in effect") */
        return;
    }
    if (game.uchain && game.uchain.where !== 'OBJ_FREE' && game.uchain.where) {
        console.error('impossible: bc already placed?');
        return;
    }
    await placebc_core();
}

// C ref: ball.c unplacebc()
export function unplacebc() {
    if (bcrestriction()) {
        console.error('impossible: unplacebc denied, restriction in place');
        return;
    }
    unplacebc_core();
}

// C ref: ball.c bc_order()
/* Return the stacking of the hero's ball & chain.  This assumes that the
 * hero is being punished.
 */
function bc_order() {
    const g = game;

    if (g.uchain.ox !== g.uball.ox || g.uchain.oy !== g.uball.oy
        || carried(g.uball) || g.u.uswallow)
        return BCPOS_DIFFER;

    /* level.objects[x][y] is newest first: the first of the two found
       on the floor chain at that spot is the one on top */
    for (const obj of g.level.objects || []) {
        if (obj.ox !== g.uball.ox || obj.oy !== g.uball.oy
            || obj.where !== 'OBJ_FLOOR')
            continue;
        if (obj === g.uchain)
            return BCPOS_CHAIN;
        if (obj === g.uball)
            return BCPOS_BALL;
    }
    console.error('impossible: bc_order:  ball&chain not in same location!');
    return BCPOS_DIFFER;
}

// C ref: ball.c set_bc()
/*
 *  The hero is either about to go blind or already blind and just punished.
 *  Set up the ball and chain variables so that the ball and chain are "felt".
 */
export function set_bc(already_blind) {
    const g = game, u = g.u;
    const uball = g.uball, uchain = g.uchain;
    const ball_on_floor = !carried(uball);

    u.bc_order = bc_order(); /* get the order */
    u.bc_felt = ball_on_floor ? BC_BALL | BC_CHAIN : BC_CHAIN; /* felt */

    if (already_blind || u.uswallow) {
        u.cglyph = u.bglyph = g.level.at(u.ux, u.uy).remembered_glyph;
        return;
    }

    /*
     *  Since we can still see, remove the ball&chain and get the glyph that
     *  would be beneath them.  Then put the ball&chain back.  This is pretty
     *  disgusting, but it will work.
     */
    remove_object(uchain);
    if (ball_on_floor)
        remove_object(uball);

    newsym(uchain.ox, uchain.oy);
    u.cglyph = g.level.at(uchain.ox, uchain.oy).remembered_glyph;

    if (u.bc_order === BCPOS_DIFFER) { /* different locations */
        place_object(uchain, uchain.ox, uchain.oy);
        newsym(uchain.ox, uchain.oy);
        if (ball_on_floor) {
            newsym(uball.ox, uball.oy); /* see under ball */
            u.bglyph = g.level.at(uball.ox, uball.oy).remembered_glyph;
            place_object(uball, uball.ox, uball.oy);
            newsym(uball.ox, uball.oy); /* restore ball */
        }
    } else {
        u.bglyph = u.cglyph;
        if (u.bc_order === BCPOS_CHAIN) {
            place_object(uball, uball.ox, uball.oy);
            place_object(uchain, uchain.ox, uchain.oy);
        } else {
            place_object(uchain, uchain.ox, uchain.oy);
            place_object(uball, uball.ox, uball.oy);
        }
        newsym(uball.ox, uball.oy);
    }
}

// C ref: ball.c move_bc()
/*
 *  Move the ball and chain.  This is called twice for every move.  The first
 *  time to pick up the ball and chain before the move, the second time to
 *  place the ball and chain after the move.  If the ball is carried, this
 *  function should never have BC_BALL as part of its control.
 *
 *  Should not be called while swallowed.
 */
export function move_bc(before, control, ballx, bally, chainx, chainy) {
    const g = game, u = g.u;
    const uball = g.uball, uchain = g.uchain;
    const levl = (x, y) => g.level.at(x, y);

    if (Blind()) {
        /*
         *  The hero is blind.  Time to work hard.  The ball and chain that
         *  are attached to the hero are very special.  The hero knows that
         *  they are attached, so when they move, the hero knows that they
         *  aren't at the last position remembered.  This is complicated
         *  by the fact that the hero can "feel" the surrounding locations
         *  at any time, hence, making one or both of them show up again.
         *  So, we have to keep track of which is felt at any one time and
         *  act accordingly.
         */
        if (!before) {
            if ((control & BC_CHAIN) && (control & BC_BALL)) {
                /*
                 *  Both ball and chain moved.  If felt, drop glyph.
                 */
                if (u.bc_felt & BC_BALL)
                    levl(uball.ox, uball.oy).remembered_glyph = u.bglyph;
                if (u.bc_felt & BC_CHAIN)
                    levl(uchain.ox, uchain.oy).remembered_glyph = u.cglyph;
                u.bc_felt = 0;

                /* Pick up glyph at new location. */
                u.bglyph = levl(ballx, bally).remembered_glyph;
                u.cglyph = levl(chainx, chainy).remembered_glyph;

                movobj(uball, ballx, bally);
                movobj(uchain, chainx, chainy);
            } else if (control & BC_BALL) {
                if (u.bc_felt & BC_BALL) {
                    if (u.bc_order === BCPOS_DIFFER) { /* ball by itself */
                        levl(uball.ox, uball.oy).remembered_glyph = u.bglyph;
                    } else if (u.bc_order === BCPOS_BALL) {
                        if (u.bc_felt & BC_CHAIN) { /* know chain is there */
                            map_object(uchain, 0);
                        } else {
                            levl(uball.ox, uball.oy).remembered_glyph = u.bglyph;
                        }
                    }
                    u.bc_felt &= ~BC_BALL; /* no longer feel the ball */
                }

                /* Pick up glyph at new position. */
                u.bglyph = (ballx !== chainx || bally !== chainy)
                               ? levl(ballx, bally).remembered_glyph
                               : u.cglyph;

                movobj(uball, ballx, bally);
            } else if (control & BC_CHAIN) {
                if (u.bc_felt & BC_CHAIN) {
                    if (u.bc_order === BCPOS_DIFFER) {
                        levl(uchain.ox, uchain.oy).remembered_glyph = u.cglyph;
                    } else if (u.bc_order === BCPOS_CHAIN) {
                        if (u.bc_felt & BC_BALL) {
                            map_object(uball, 0);
                        } else {
                            levl(uchain.ox, uchain.oy).remembered_glyph = u.cglyph;
                        }
                    }
                    u.bc_felt &= ~BC_CHAIN;
                }
                /* Pick up glyph at new position. */
                u.cglyph = (ballx !== chainx || bally !== chainy)
                               ? levl(chainx, chainy).remembered_glyph
                               : u.bglyph;

                movobj(uchain, chainx, chainy);
            }

            u.bc_order = bc_order(); /* reset the order */
        }

    } else {
        /*
         *  The hero is not blind.  To make this work correctly, we need to
         *  pick up the ball and chain before the hero moves, then put them
         *  in their new positions after the hero moves.
         */
        if (before) {
            if (!control) {
                /*
                 * Neither ball nor chain is moving, so remember which was
                 * on top until !before.  Use the variable u.bc_order
                 * since it is only valid when blind.
                 */
                u.bc_order = bc_order();
            }

            remove_object(uchain);
            maybe_unhide_at(uchain.ox, uchain.oy);
            newsym(uchain.ox, uchain.oy);
            if (!carried(uball)) {
                remove_object(uball);
                maybe_unhide_at(uball.ox, uball.oy);
                newsym(uball.ox, uball.oy);
            }
        } else {
            const on_floor = !carried(uball);

            if ((control & BC_CHAIN)
                || (!control && u.bc_order === BCPOS_CHAIN)) {
                /* If the chain moved or nothing moved & chain on top. */
                if (on_floor)
                    place_object(uball, ballx, bally);
                place_object(uchain, chainx, chainy); /* chain on top */
            } else {
                place_object(uchain, chainx, chainy);
                if (on_floor)
                    place_object(uball, ballx, bally);
                /* ball on top */
            }
            newsym(chainx, chainy);
            if (on_floor)
                newsym(ballx, bally);
        }
    }
}

// C ref: ball.c drag_ball()
/* return TRUE if the caller needs to place the ball and chain down again;
   'bc' holds C's output parameters: bc_control, ballx, bally, chainx,
   chainy and cause_delay */
export async function drag_ball(x, y, bc, allow_drag) {
    const g = game, u = g.u;
    const uball = g.uball, uchain = g.uchain;
    const levl = (lx, ly) => g.level.at(lx, ly);
    let t = null;
    let already_in_rock;

    /*
     * Should not be called while swallowed.  Should be called before
     * movement, because we might want to move the ball or chain to the
     * hero's old position.
     *
     * It is called if we are moving.  It is also called if we are
     * teleporting *if* the ball doesn't move and we thus must drag the
     * chain.  It is not called for ordinary teleportation.
     *
     * 'allow_drag' is only used in the ugly special case where teleporting
     * must drag the chain, while an identical-looking movement must drag
     * both the ball and chain.
     */

    bc.ballx = uball.ox;
    bc.bally = uball.oy;
    bc.chainx = uchain.ox;
    bc.chainy = uchain.oy;
    bc.bc_control = 0;
    bc.cause_delay = false;

    if (dist2(x, y, uchain.ox, uchain.oy) <= 2) { /* nothing moved */
        move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
        return true;
    }

    const IS_CHAIN_ROCK = (cx, cy) =>
        (IS_OBSTRUCTED(levl(cx, cy).typ)
         || (IS_DOOR(levl(cx, cy).typ)
             && (levl(cx, cy).doormask & (D_CLOSED | D_LOCKED))));

    let skip_to_drag = false; /* SKIP_TO_DRAG's 'goto drag' */
    /* only need to move the chain? */
    if (carried(uball) || distmin(x, y, uball.ox, uball.oy) <= 2) {
        const oldchainx = uchain.ox, oldchainy = uchain.oy;

        bc.bc_control = BC_CHAIN;
        move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
        if (carried(uball)) {
            /* move chain only if necessary */
            if (distmin(x, y, uchain.ox, uchain.oy) > 1) {
                bc.chainx = u.ux;
                bc.chainy = u.uy;
            }
            return true;
        }

        const CHAIN_IN_MIDDLE = (chx, chy) =>
            (distmin(x, y, chx, chy) <= 1
             && distmin(chx, chy, uball.ox, uball.oy) <= 1);
        /*
         * Don't ever move the chain into solid rock.  If we have to, then
         * instead undo the move_bc() and jump to the drag ball code.  Note
         * that this also means the "cannot carry and drag" message will not
         * appear, since unless we moved at least two squares there is no
         * possibility of the chain position being in solid rock.
         */
        const SKIP_TO_DRAG = () => {
            bc.chainx = oldchainx;
            bc.chainy = oldchainy;
            move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
            skip_to_drag = true; /* goto drag */
        };

        if (IS_CHAIN_ROCK(u.ux, u.uy) || IS_CHAIN_ROCK(bc.chainx, bc.chainy)
            || IS_CHAIN_ROCK(uball.ox, uball.oy))
            already_in_rock = true;
        else
            already_in_rock = false;

        switch (dist2(x, y, uball.ox, uball.oy)) {
        /* two spaces diagonal from ball, move chain in-between */
        case 8:
            bc.chainx = Math.trunc((uball.ox + x) / 2);
            bc.chainy = Math.trunc((uball.oy + y) / 2);
            if (IS_CHAIN_ROCK(bc.chainx, bc.chainy) && !already_in_rock)
                SKIP_TO_DRAG();
            break;

        /* player is distance 2/1 from ball; move chain to one of the
         * two spaces between
         *   @
         *   __
         *    0
         */
        case 5: {
            let tempx, tempy, tempx2, tempy2;

            /* find position closest to current position of chain;
               no effect if current position is already OK */
            if (Math.abs(x - uball.ox) === 1) {
                tempx = x;
                tempx2 = uball.ox;
                tempy = tempy2 = Math.trunc((uball.oy + y) / 2);
            } else {
                tempx = tempx2 = Math.trunc((uball.ox + x) / 2);
                tempy = y;
                tempy2 = uball.oy;
            }
            if (IS_CHAIN_ROCK(tempx, tempy) && !IS_CHAIN_ROCK(tempx2, tempy2)
                && !already_in_rock) {
                if (allow_drag) {
                    /* Avoid pathological case *if* not teleporting:
                     *   0                          0_
                     *   _X  move northeast  ----->  X@
                     *    @
                     */
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx, tempy) === 1) {
                        SKIP_TO_DRAG();
                        break;
                    }
                    /* Avoid pathological case *if* not teleporting:
                     *    0                          0
                     *   _X  move east       ----->  X_
                     *    @                           @
                     */
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx, tempy) === 2) {
                        SKIP_TO_DRAG();
                        break;
                    }
                }
                bc.chainx = tempx2;
                bc.chainy = tempy2;
            } else if (!IS_CHAIN_ROCK(tempx, tempy)
                       && IS_CHAIN_ROCK(tempx2, tempy2) && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx2, tempy2) === 1) {
                        SKIP_TO_DRAG();
                        break;
                    }
                    if (dist2(u.ux, u.uy, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx2, tempy2) === 2) {
                        SKIP_TO_DRAG();
                        break;
                    }
                }
                bc.chainx = tempx;
                bc.chainy = tempy;
            } else if (IS_CHAIN_ROCK(tempx, tempy)
                       && IS_CHAIN_ROCK(tempx2, tempy2) && !already_in_rock) {
                SKIP_TO_DRAG();
            } else if (dist2(tempx, tempy, uchain.ox, uchain.oy)
                           < dist2(tempx2, tempy2, uchain.ox, uchain.oy)
                       || ((dist2(tempx, tempy, uchain.ox, uchain.oy)
                            === dist2(tempx2, tempy2, uchain.ox, uchain.oy))
                           && rn2(2))) {
                bc.chainx = tempx;
                bc.chainy = tempy;
            } else {
                bc.chainx = tempx2;
                bc.chainy = tempy2;
            }
            break;
        }

        /* ball is two spaces horizontal or vertical from player; move*/
        /* chain in-between *unless* current chain position is OK */
        case 4:
            if (CHAIN_IN_MIDDLE(uchain.ox, uchain.oy))
                break;
            bc.chainx = Math.trunc((x + uball.ox) / 2);
            bc.chainy = Math.trunc((y + uball.oy) / 2);
            if (IS_CHAIN_ROCK(bc.chainx, bc.chainy) && !already_in_rock)
                SKIP_TO_DRAG();
            break;

        /* ball is one space diagonal from player.  Check for the
         * following special case:
         *   @
         *    _    moving southwest becomes  @_
         *   0                                0
         * (This will also catch teleporting that happens to resemble
         * this case, but oh well.)  Otherwise fall through.
         */
        case 2:
            if (dist2(x, y, uball.ox, uball.oy) === 2
                && dist2(x, y, uchain.ox, uchain.oy) === 4) {
                if (uchain.oy === y)
                    bc.chainx = uball.ox;
                else
                    bc.chainy = uball.oy;
                if (IS_CHAIN_ROCK(bc.chainx, bc.chainy) && !already_in_rock)
                    SKIP_TO_DRAG();
                break;
            }
            /* FALLTHRU */
        case 1:
        case 0:
            /* do nothing if possible */
            if (CHAIN_IN_MIDDLE(uchain.ox, uchain.oy))
                break;
            /* otherwise try to drag chain to player's old position */
            if (CHAIN_IN_MIDDLE(u.ux, u.uy)) {
                bc.chainx = u.ux;
                bc.chainy = u.uy;
                break;
            }
            /* otherwise use player's new position (they must have
               teleported, for this to happen) */
            bc.chainx = x;
            bc.chainy = y;
            break;

        default:
            console.error('impossible: bad chain movement');
            break;
        }
        if (!skip_to_drag)
            return true;
    }

 /* drag: */

    if (near_capacity() > SLT_ENCUMBER && dist2(x, y, u.ux, u.uy) <= 2) {
        await You(`cannot ${g.invent ? "carry all that and also " : ""}drag the heavy iron ball.`);
        nomul(0);
        return false;
    }

    if ((is_pool(uchain.ox, uchain.oy)
         /* water not mere continuation of previous water */
         && (levl(uchain.ox, uchain.oy).typ === POOL
             || !is_pool(uball.ox, uball.oy)
             || levl(uball.ox, uball.oy).typ === POOL))
        || ((t = t_at(uchain.ox, uchain.oy))
            && (is_pit(t.ttyp) || is_hole(t.ttyp)))) {
        if (Levitation()) {
            await You_feel("a tug from the iron ball.");
            if (t)
                t.tseen = 1;
        } else {
            let victim;

            await You("are jerked back by the iron ball!");
            if ((victim = m_at(uchain.ox, uchain.oy)) != null) {
                let tmp;
                const dieroll = rnd(20);

                tmp = -2 + Luck() + find_mac(victim);
                tmp += omon_adj(victim, uball, true);

                if (tmp >= dieroll)
                    await hmon(victim, uball, HMON_DRAGGED, dieroll);
                else
                    await miss(xname(uball), victim);

            } /* now check again in case mon died */
            if (!m_at(uchain.ox, uchain.oy)) {
                u.ux = uchain.ox;
                u.uy = uchain.oy;
                newsym(u.ux0, u.uy0);
            }
            nomul(0);

            bc.bc_control = BC_BALL;
            move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
            bc.ballx = uchain.ox;
            bc.bally = uchain.oy;
            move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
            await spoteffects(true);
            return false;
        }
    }

    bc.bc_control = BC_BALL | BC_CHAIN;

    move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
    if (dist2(x, y, u.ux, u.uy) > 2) {
        /* Awful case: we're still in range of the ball, so we thought we
         * could only move the chain, but it turned out that the target
         * square for the chain was rock, so we had to drag it instead.
         * But we can't drag it either, because we teleported and are more
         * than one square from our old position.  Revert to the teleport
         * behavior.
         */
        bc.ballx = bc.chainx = x;
        bc.bally = bc.chainy = y;
    } else {
        let newchainx = u.ux, newchainy = u.uy;

        /*
         * Generally, chain moves to hero's previous location and ball
         * moves to chain's previous location, except that we try to
         * keep the chain directly between the hero and the ball.  But,
         * take the simple approach if the hero's previous location or
         * the potential between location is inaccessible.
         */
        if (dist2(x, y, uchain.ox, uchain.oy) === 4
            && !IS_CHAIN_ROCK(newchainx, newchainy)) {
            newchainx = Math.trunc((x + uchain.ox) / 2);
            newchainy = Math.trunc((y + uchain.oy) / 2);
            if (IS_CHAIN_ROCK(newchainx, newchainy)) {
                /* don't let chain move to inaccessible location */
                newchainx = u.ux;
                newchainy = u.uy;
            }
        }

        bc.ballx = uchain.ox;
        bc.bally = uchain.oy;
        bc.chainx = newchainx;
        bc.chainy = newchainy;
    }
    bc.cause_delay = true;
    return true;
}

// C ref: ball.c drop_ball()
/*
 *  The punished hero drops or throws her iron ball.  If the hero is
 *  blind, we must reset the order and glyph.  Check for side effects.
 *  This routine expects the ball to be already placed.
 *
 *  Should not be called while swallowed.
 */
export async function drop_ball(x, y) {
    const g = game, u = g.u;
    const levl = (lx, ly) => g.level.at(lx, ly);

    if (Blind()) {
        /* get the order */
        u.bc_order = bc_order();
        /* pick up glyph */
        u.bglyph = (u.bc_order) ? u.cglyph : levl(x, y).remembered_glyph;
    }

    if (x !== u.ux || y !== u.uy) {
        const pullmsg = "The ball pulls you out of the ";
        let t;
        let side;

        if (u.utrap
            && u.utraptype !== TT_INFLOOR && u.utraptype !== TT_BURIEDBALL) {
            switch (u.utraptype) {
            case TT_PIT:
                await pline(`${pullmsg}pit!`);
                break;
            case TT_WEB:
                await pline(`${pullmsg}web!`);
                /* Soundeffect(se_destroy_web, 30) */
                await pline_The("web is destroyed!");
                deltrap(t_at(u.ux, u.uy));
                break;
            case TT_LAVA:
                await pline(`${pullmsg}${hliquid("lava")}!`);
                break;
            case TT_BEARTRAP:
                side = rn2(3) ? LEFT_SIDE : RIGHT_SIDE;
                await pline(`${pullmsg}bear trap!`);
                await set_wounded_legs(side, rn1(1000, 500));
                if (!u.usteed) {
                    await Your(`${(side === LEFT_SIDE) ? "left" : "right"} ${body_part(LEG)} is severely damaged.`);
                    await losehp(Maybe_Half_Phys(2),
                                 "leg damage from being pulled out of a bear trap",
                                 KILLED_BY);
                }
                break;
            }
            await reset_utrap(true);
            await fill_pit(u.ux, u.uy);
        }

        u.ux0 = u.ux;
        u.uy0 = u.uy;
        if (!Levitation() && !MON_AT(x, y) && !u.utrap
            && (is_pool(x, y)
                || ((t = t_at(x, y))
                    && (is_pit(t.ttyp)
                        || is_hole(t.ttyp))))) {
            u.ux = x;
            u.uy = y;
        } else {
            u.ux = x - u.dx;
            u.uy = y - u.dy;
        }
        g.vision_full_recalc = 1; /* hero has moved, recalc vision later */

        if (Blind()) {
            /* drop glyph under the chain */
            if (u.bc_felt & BC_CHAIN)
                levl(g.uchain.ox, g.uchain.oy).remembered_glyph = u.cglyph;
            u.bc_felt = 0; /* feel nothing */
            /* pick up new glyph */
            u.cglyph = (u.bc_order) ? u.bglyph : levl(u.ux, u.uy).remembered_glyph;
        }
        movobj(g.uchain, u.ux, u.uy); /* has a newsym */
        if (Blind()) {
            u.bc_order = bc_order();
        }
        newsym(u.ux0, u.uy0); /* clean up old position */
        if (u.ux0 !== u.ux || u.uy0 !== u.uy) {
            await spoteffects(true);
        }
    }
}

// C ref: ball.c litter()
/* ball&chain cause hero to randomly lose stuff from inventory */
async function litter() {
    const g = game;
    let otmp, nextobj = null;
    const capacity = weight_cap();

    for (otmp = g.invent; otmp; otmp = nextobj) {
        nextobj = otmp.nobj;
        if (otmp !== g.uball && rnd(capacity) <= otmp.owt) {
            if (await canletgo(otmp, "")) {
                await You(`drop ${yname(otmp)} and ${(otmp.quan === 1) ? "it" : "they"} ${otense(otmp, "fall")} down the stairs with you.`);
                setnotworn(otmp);
                freeinv(otmp);
                await hitfloor(otmp, false);
            }
        }
    }
}

// C ref: ball.c drag_down()
export async function drag_down() {
    const g = game;
    let dragchance = 3;

    /*
     *  Assume that the ball falls forward if:
     *
     *  a) the character is wielding it, or
     *  b) the character has both hands available to hold it (i.e. is
     *     not wielding any weapon), or
     *  c) (perhaps) it falls forward out of his non-weapon hand
     */
    const forward = carried(g.uball) && (g.uwep === g.uball || !g.uwep || !rn2(3));

    if (carried(g.uball) && !welded(g.uball))
        await You("lose your grip on the iron ball.");

    await cls();  /* previous level is still displayed although you
                     went down the stairs. Avoids bug C343-20 */

    if (forward) {
        if (rn2(6)) {
            await pline_The("iron ball drags you downstairs!");
            await losehp(Maybe_Half_Phys(rnd(6)),
                         "dragged downstairs by an iron ball", NO_KILLER_PREFIX);
            await litter();
        }
    } else {
        if (rn2(2)) {
            /* Soundeffect(se_iron_ball_hits_you, 25) */
            await pline_The("iron ball smacks into you!");
            await losehp(Maybe_Half_Phys(rnd(20)), "iron ball collision",
                         KILLED_BY_AN);
            await exercise(A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            await pline_The("iron ball drags you downstairs!");
            await losehp(Maybe_Half_Phys(rnd(3)),
                         "dragged downstairs by an iron ball", NO_KILLER_PREFIX);
            await exercise(A_STR, false);
            await litter();
        }
    }
}
