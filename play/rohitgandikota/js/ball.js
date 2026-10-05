// ball.js — the iron ball and chain of punishment.
// C ref: src/ball.c

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { carried } from './obj.js';
import { welded, setuwep, setuswapwep, setuqwep } from './wield.js';
import { encumber_msg, near_capacity, weight_cap, exercise } from './attrib.js';
import { pline, newsym, map_object, cls } from './display.js';
import { pline_The, You, You_feel, Your, impossible } from './pline.js';
import { body_part } from './polyself.js';
import { hard_helmet } from './do_wear.js';
import { Yname2, xname, yname, otense, safe_typename } from './objnam.js';
import { losehp, movobj, spoteffects, nomul } from './hack.js';
import { Maybe_Half_Phys, flooreffects, set_wounded_legs, canletgo } from './do.js';
import { hitfloor, omon_adj } from './dothrow.js';
import { place_object } from './mkobj.js';
import { obj_extract_self, freeinv } from './invent.js';
import { maybe_unhide_at, m_at, is_pool, t_at } from './mon.js';
import { Blind, Levitation, Punished, Luck } from './youprop.js';
import { dist2, distmin } from './hacklib.js';
import { find_mac, setnotworn } from './worn.js';
import { hmon } from './uhitm.js';
import { miss } from './zap.js';
import { reset_utrap, fill_pit, deltrap } from './trap.js';
import { hliquid } from './do_name.js';
import { ONAMES } from './objects_data.js';
import { HEAD, LEG, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, POOL,
         SLT_ENCUMBER, BC_BALL, BC_CHAIN, OBJ_FREE, OBJ_FLOOR, OBJ_INVENT,
         TT_INFLOOR, TT_BURIEDBALL, TT_PIT, TT_WEB, TT_LAVA, TT_BEARTRAP,
         LEFT_SIDE, RIGHT_SIDE, W_BALL, W_CHAIN, W_WEAPONS, KILLED_BY,
         KILLED_BY_AN, NO_KILLER_PREFIX, HMON_DRAGGED, A_STR, is_pit, is_hole,
         Is_waterlevel, override_restriction } from './const.js';

let bcrestriction = 0;

/* levl[x][y].glyph — the remembered glyph of a map square */
const levl_glyph = (x, y) => game.level?.at(x, y)?.remembered_glyph;
const set_levl_glyph = (x, y, glyph) => {
    const loc = game.level?.at(x, y);
    if (loc)
        loc.remembered_glyph = glyph;
};

// src/ball.c:23 ballrelease() — hero is letting go of the iron ball
export async function ballrelease(showmsg) {
    const u = game.u;

    if (carried(u.uball) && !welded(u.uball)) {
        if (showmsg)
            await pline('Startled, you drop the iron ball.');
        if (u.uwep === u.uball)
            setuwep(null);
        if (u.uswapwep === u.uball)
            setuswapwep(null);
        if (u.uquiver === u.uball)
            setuqwep(null);
        /* [this used to test 'if (uwep != uball)' but that always passes
           after the setuwep() above] */
        freeinv(u.uball); /* remove from inventory but don't place on floor */
        await encumber_msg();
    }
}

// src/ball.c:43 ballfall() — ball&chain might hit hero when falling through
// a trap door
export async function ballfall() {
    const u = game.u;
    let gets_hit;

    if (!u.uball || (u.uball && carried(u.uball) && welded(u.uball)))
        return;

    gets_hit = (((u.uball.ox !== u.ux) || (u.uball.oy !== u.uy))
                && ((u.uwep === u.uball) ? false : !!rn2(5)));
    await ballrelease(true);
    if (gets_hit) {
        let dmg = rn1(7, 25);

        await pline_The(`iron ball falls on your ${body_part(HEAD)}.`);
        if (u.uarmh) {
            if (hard_helmet(u.uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                dmg = 3;
            } else if (game.flags?.verbose)
                await pline(`${Yname2(u.uarmh)} does not protect you.`);
        }
        await losehp(Maybe_Half_Phys(dmg), 'crunched in the head by an iron ball',
                     NO_KILLER_PREFIX);
    }
}

/*
 *  To make this work, we have to mess with the hero's mind.  The rules for
 *  ball&chain are:
 *
 *      1. If the hero can see them, fine.
 *      2. If the hero can't see either, it isn't seen.
 *      3. If either is felt it is seen.
 *      4. If either is moved it is seen.
 *      5. If the hero can't move, then the ball&chain aren't moved, but
 *         they are still felt.
 */

/* src/ball.c:107 */
const BCPOS_DIFFER = 0; /* ball & chain at different positions */
const BCPOS_CHAIN = 1;  /* chain on top of ball */
const BCPOS_BALL = 2;   /* ball on top of chain */

// src/ball.c:120 placebc_core()
async function placebc_core() {
    const u = game.u;

    if (!u.uchain || !u.uball) {
        void impossible('Where are your ball and chain?');
        return;
    }

    await flooreffects(u.uchain, u.ux, u.uy, ''); /* chain might rust */

    if (carried(u.uball)) { /* the ball is carried */
        u.bc_order = BCPOS_DIFFER;
    } else {
        /* ball might rust -- already checked when carried */
        await flooreffects(u.uball, u.ux, u.uy, '');
        place_object(u.uball, u.ux, u.uy);
        u.bc_order = BCPOS_CHAIN;
    }

    place_object(u.uchain, u.ux, u.uy);

    u.bglyph = u.cglyph = levl_glyph(u.ux, u.uy); /* pick up glyph */

    newsym(u.ux, u.uy);
    bcrestriction = 0;
}

// src/ball.c:147 unplacebc_core()
function unplacebc_core() {
    const u = game.u;

    if (u.uswallow) {
        if (Is_waterlevel(u.uz)) {
            /* we need to proceed with the removal from the map */
            if (!carried(u.uball))
                obj_extract_self(u.uball);
            obj_extract_self(u.uchain);
        }
        return;
    }
    if (!carried(u.uball)) {
        obj_extract_self(u.uball);
        if (Blind() && ((u.bc_felt | 0) & BC_BALL)) /* drop glyph */
            set_levl_glyph(u.uball.ox, u.uball.oy, u.bglyph);

        maybe_unhide_at(u.uball.ox, u.uball.oy);
        newsym(u.uball.ox, u.uball.oy);
    }
    obj_extract_self(u.uchain);
    if (Blind() && ((u.bc_felt | 0) & BC_CHAIN)) /* drop glyph */
        set_levl_glyph(u.uchain.ox, u.uchain.oy, u.cglyph);

    maybe_unhide_at(u.uchain.ox, u.uchain.oy);
    newsym(u.uchain.ox, u.uchain.oy);
    u.bc_felt = 0; /* feel nothing */
}

// src/ball.c:180 check_restriction()
function check_restriction(restriction) {
    let ret = false;

    if (!bcrestriction || (restriction === override_restriction))
        ret = true;
    else
        ret = (bcrestriction === restriction) ? true : false;
    return ret;
}

// src/ball.c:193 placebc()
export async function placebc() {
    if (!check_restriction(0)) {
        /* paniclog("placebc", "placebc denied, restriction in effect") */
        return;
    }
    if (game.u.uchain && game.u.uchain.where !== OBJ_FREE) {
        void impossible('bc already placed?');
        return;
    }
    await placebc_core();
}

// src/ball.c:212 unplacebc()
export function unplacebc() {
    if (bcrestriction) {
        void impossible('unplacebc denied, restriction in place');
        return;
    }
    unplacebc_core();
}

// src/ball.c:222 unplacebc_and_covet_placebc()
export function unplacebc_and_covet_placebc() {
    let restriction = 0;

    if (bcrestriction) {
        void impossible('unplacebc_and_covet_placebc denied, already restricted');
    } else {
        restriction = bcrestriction = rnd(400);
        unplacebc_core();
    }
    return restriction;
}

// src/ball.c:236 lift_covet_and_placebc()
export async function lift_covet_and_placebc(pin) {
    if (!check_restriction(pin)) {
        /* paniclog("placebc", "lift_covet_and_placebc denied, ...") */
        return;
    }
    if (game.u.uchain && game.u.uchain.where !== OBJ_FREE) {
        void impossible('bc already placed?');
        return;
    }
    await placebc_core();
}

// src/ball.c:354 bc_order() — the object list is a stack: the first of the
// two found at the shared square is on top
function bc_order() {
    const u = game.u;

    if (u.uchain.ox !== u.uball.ox || u.uchain.oy !== u.uball.oy || carried(u.uball)
        || u.uswallow)
        return BCPOS_DIFFER;

    /* level.objects[x][y] chains newest-first through nexthere; the flat
       floor list keeps that order, so the first entry at the square is the
       head of the pile */
    for (const obj of (game.level?.objects || []).filter(
             o => o.where === OBJ_FLOOR && o.ox === u.uball.ox && o.oy === u.uball.oy)) {
        if (obj === u.uchain)
            return BCPOS_CHAIN;
        if (obj === u.uball)
            return BCPOS_BALL;
    }
    void impossible('bc_order:  ball&chain not in same location!');
    return BCPOS_DIFFER;
}

// src/ball.c:380 set_bc() — set the glyphs under the ball and chain, and
// mark them as felt; called just before the hero goes blind
export function set_bc(already_blind) {
    const u = game.u;
    const ball_on_floor = !carried(u.uball);

    u.bc_order = bc_order(); /* get the order */
    u.bc_felt = ball_on_floor ? BC_BALL | BC_CHAIN : BC_CHAIN; /* felt */

    if (already_blind || u.uswallow) {
        u.cglyph = u.bglyph = levl_glyph(u.ux, u.uy);
        return;
    }

    /*
     *  Since we can still see, remove the ball&chain and get the glyph that
     *  would be beneath them.  Then put the ball&chain back.  This is safe
     *  because we know that the ball&chain are not in the middle of the
     *  chain, i.e. they are both at the top of the object list.
     */
    obj_extract_self(u.uchain); /* remove_object(uchain) */
    if (ball_on_floor)
        obj_extract_self(u.uball); /* remove_object(uball) */

    newsym(u.uchain.ox, u.uchain.oy);
    u.cglyph = levl_glyph(u.uchain.ox, u.uchain.oy);

    if (u.bc_order === BCPOS_DIFFER) { /* different locations */
        place_object(u.uchain, u.uchain.ox, u.uchain.oy);
        newsym(u.uchain.ox, u.uchain.oy);
        if (ball_on_floor) {
            newsym(u.uball.ox, u.uball.oy); /* see under ball */
            u.bglyph = levl_glyph(u.uball.ox, u.uball.oy);
            place_object(u.uball, u.uball.ox, u.uball.oy);
            newsym(u.uball.ox, u.uball.oy); /* restore ball */
        }
    } else {
        u.bglyph = u.cglyph;
        if (u.bc_order === BCPOS_CHAIN) {
            place_object(u.uball, u.uball.ox, u.uball.oy);
            place_object(u.uchain, u.uchain.ox, u.uchain.oy);
        } else {
            place_object(u.uchain, u.uchain.ox, u.uchain.oy);
            place_object(u.uball, u.uball.ox, u.uball.oy);
        }
        newsym(u.uball.ox, u.uball.oy);
    }
}

// src/ball.c:437 move_bc() — the ball and chain are placed and removed by
// this function, either before the hero moves (before != 0) or after
export function move_bc(before, control, ballx, bally, chainx, chainy) {
    const u = game.u;

    if (Blind()) {
        /*
         *  The hero is blind.  Time to work hard.  The ball and chain that
         *  are attached to the hero are very special.  The hero knows that
         *  they are attached, so when they move, the hero knows that they
         *  aren't at the last position remembered.  This is complicated
         *  by the fact that the hero can feel the ball and chain, and
         *  the hero doesn't know what's under the ball and chain.
         *  ...
         */
        if (!before) {
            if ((control & BC_CHAIN) && (control & BC_BALL)) {
                /*
                 *  Both ball and chain moved.  If felt, drop glyph.
                 */
                if ((u.bc_felt | 0) & BC_BALL)
                    set_levl_glyph(u.uball.ox, u.uball.oy, u.bglyph);
                if ((u.bc_felt | 0) & BC_CHAIN)
                    set_levl_glyph(u.uchain.ox, u.uchain.oy, u.cglyph);
                u.bc_felt = 0;

                /* Pick up glyph at new location. */
                u.bglyph = levl_glyph(ballx, bally);
                u.cglyph = levl_glyph(chainx, chainy);

                movobj(u.uball, ballx, bally);
                movobj(u.uchain, chainx, chainy);
            } else if (control & BC_BALL) {
                if ((u.bc_felt | 0) & BC_BALL) {
                    if (u.bc_order === BCPOS_DIFFER) { /* ball by itself */
                        set_levl_glyph(u.uball.ox, u.uball.oy, u.bglyph);
                    } else if (u.bc_order === BCPOS_BALL) {
                        if ((u.bc_felt | 0) & BC_CHAIN) { /* know chain is there */
                            map_object(u.uchain, 0);
                        } else {
                            set_levl_glyph(u.uball.ox, u.uball.oy, u.bglyph);
                        }
                    }
                    u.bc_felt &= ~BC_BALL; /* no longer feel the ball */
                }

                /* Pick up glyph at new position. */
                u.bglyph = (ballx !== chainx || bally !== chainy)
                               ? levl_glyph(ballx, bally)
                               : u.cglyph;

                movobj(u.uball, ballx, bally);
            } else if (control & BC_CHAIN) {
                if ((u.bc_felt | 0) & BC_CHAIN) {
                    if (u.bc_order === BCPOS_DIFFER) {
                        set_levl_glyph(u.uchain.ox, u.uchain.oy, u.cglyph);
                    } else if (u.bc_order === BCPOS_CHAIN) {
                        if ((u.bc_felt | 0) & BC_BALL) {
                            map_object(u.uball, 0);
                        } else {
                            set_levl_glyph(u.uchain.ox, u.uchain.oy, u.cglyph);
                        }
                    }
                    u.bc_felt &= ~BC_CHAIN;
                }
                /* Pick up glyph at new position. */
                u.cglyph = (ballx !== chainx || bally !== chainy)
                               ? levl_glyph(chainx, chainy)
                               : u.bglyph;

                movobj(u.uchain, chainx, chainy);
            }

            u.bc_order = bc_order(); /* reset the order */
        }

    } else {
        /*
         *  The hero can see it.  Just remove the ball and chain before the
         *  hero moves and place them afterwards.
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

            obj_extract_self(u.uchain); /* remove_object(uchain) */
            maybe_unhide_at(u.uchain.ox, u.uchain.oy);
            newsym(u.uchain.ox, u.uchain.oy);
            if (!carried(u.uball)) {
                obj_extract_self(u.uball); /* remove_object(uball) */
                maybe_unhide_at(u.uball.ox, u.uball.oy);
                newsym(u.uball.ox, u.uball.oy);
            }
        } else {
            const on_floor = !carried(u.uball);

            if ((control & BC_CHAIN)
                || (!control && u.bc_order === BCPOS_CHAIN)) {
                /* If the chain moved or nothing moved & chain on top. */
                if (on_floor)
                    place_object(u.uball, ballx, bally);
                place_object(u.uchain, chainx, chainy); /* chain on top */
            } else {
                place_object(u.uchain, chainx, chainy);
                if (on_floor)
                    place_object(u.uball, ballx, bally);
                /* ball on top */
            }
            newsym(chainx, chainy);
            if (on_floor)
                newsym(ballx, bally);
        }
    }
}

// src/ball.c:560 drag_ball() — return FALSE if the caller should not move the
// hero; `bc` carries the C's out-parameters: bc_control, ballx, bally,
// chainx, chainy and cause_delay.
export async function drag_ball(x, y, bc, allow_drag) {
    const u = game.u;
    let t = null;
    let already_in_rock;
    let skip_to_drag = false;

    /*
     *  Should not be called if the hero is not punished or being punished
     *  without a ball (via wizard mode).
     */
    bc.ballx = u.uball.ox;
    bc.bally = u.uball.oy;
    bc.chainx = u.uchain.ox;
    bc.chainy = u.uchain.oy;
    bc.bc_control = 0;
    bc.cause_delay = false;

    if (dist2(x, y, u.uchain.ox, u.uchain.oy) <= 2) { /* nothing moved */
        move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
        return true;
    }

    /* only need to move the chain? */
    if (carried(u.uball) || distmin(x, y, u.uball.ox, u.uball.oy) <= 2) {
        const oldchainx = u.uchain.ox, oldchainy = u.uchain.oy;

        bc.bc_control = BC_CHAIN;
        move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
        if (carried(u.uball)) {
            /* move chain only if necessary */
            if (distmin(x, y, u.uchain.ox, u.uchain.oy) > 1) {
                bc.chainx = u.ux;
                bc.chainy = u.uy;
            }
            return true;
        }

        const CHAIN_IN_MIDDLE = (chx, chy) =>
            (distmin(x, y, chx, chy) <= 1
             && distmin(chx, chy, u.uball.ox, u.uball.oy) <= 1);
        const IS_CHAIN_ROCK = (cx, cy) => {
            const loc = game.level.at(cx, cy);
            return (IS_OBSTRUCTED(loc.typ)
                    || (IS_DOOR(loc.typ)
                        && ((loc.doormask | 0) & (D_CLOSED | D_LOCKED))));
        };
        /* Don't ever move the chain into solid rock.  If we have to, then
           instead undo the move_bc() and jump to the drag ball code. */
        const SKIP_TO_DRAG = () => {
            bc.chainx = oldchainx;
            bc.chainy = oldchainy;
            move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
            skip_to_drag = true;
        };

        if (IS_CHAIN_ROCK(u.ux, u.uy) || IS_CHAIN_ROCK(bc.chainx, bc.chainy)
            || IS_CHAIN_ROCK(u.uball.ox, u.uball.oy))
            already_in_rock = true;
        else
            already_in_rock = false;

        switch (dist2(x, y, u.uball.ox, u.uball.oy)) {
        /* two spaces diagonal from ball, move chain inbetween */
        case 8:
            bc.chainx = Math.trunc((u.uball.ox + x) / 2);
            bc.chainy = Math.trunc((u.uball.oy + y) / 2);
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

            /* find player direction from ball and move the chain there;
               no effect if current position is already OK */
            if (Math.abs(x - u.uball.ox) === 1) {
                tempx = x;
                tempx2 = u.uball.ox;
                tempy = tempy2 = Math.trunc((u.uball.oy + y) / 2);
            } else {
                tempx = tempx2 = Math.trunc((u.uball.ox + x) / 2);
                tempy = y;
                tempy2 = u.uball.oy;
            }
            if (IS_CHAIN_ROCK(tempx, tempy) && !IS_CHAIN_ROCK(tempx2, tempy2)
                && !already_in_rock) {
                if (allow_drag) {
                    /* Avoid pathological case *if* not teleporting:
                     *   0                          0_
                     *   _X  move northeast  ----->  X@
                     *    @
                     */
                    if (dist2(u.ux, u.uy, u.uball.ox, u.uball.oy) === 5
                        && dist2(x, y, tempx, tempy) === 1) {
                        SKIP_TO_DRAG();
                        break;
                    }
                    /* Avoid pathological case *if* not teleporting:
                     *    0                          0
                     *   _X  move east       ----->  X_@
                     *    @
                     */
                    if (dist2(u.ux, u.uy, u.uball.ox, u.uball.oy) === 4
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
                    if (dist2(u.ux, u.uy, u.uball.ox, u.uball.oy) === 5
                        && dist2(x, y, tempx2, tempy2) === 1) {
                        SKIP_TO_DRAG();
                        break;
                    }
                    if (dist2(u.ux, u.uy, u.uball.ox, u.uball.oy) === 4
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
                break;
            } else if (dist2(tempx, tempy, u.uchain.ox, u.uchain.oy)
                           < dist2(tempx2, tempy2, u.uchain.ox, u.uchain.oy)
                       || ((dist2(tempx, tempy, u.uchain.ox, u.uchain.oy)
                            === dist2(tempx2, tempy2, u.uchain.ox, u.uchain.oy))
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
        /* chain inbetween *unless* current chain position is OK */
        case 4:
            if (CHAIN_IN_MIDDLE(u.uchain.ox, u.uchain.oy))
                break;
            bc.chainx = Math.trunc((x + u.uball.ox) / 2);
            bc.chainy = Math.trunc((y + u.uball.oy) / 2);
            if (IS_CHAIN_ROCK(bc.chainx, bc.chainy) && !already_in_rock)
                SKIP_TO_DRAG();
            break;

        /* ball is one space diagonal from player.  Check for the following
         * case:
         *   @
         *    _    moving southwest becomes  @_
         *   0                                0
         * (and rotations of the same).  For that case, the chain must be
         * moved to the ball's spot.  Otherwise, just leave the chain where
         * it is.  Hmm.  This doesn't look right.
         */
        case 2:
            if (dist2(x, y, u.uball.ox, u.uball.oy) === 2
                && dist2(x, y, u.uchain.ox, u.uchain.oy) === 4) {
                if (u.uchain.oy === y)
                    bc.chainx = u.uball.ox;
                else
                    bc.chainy = u.uball.oy;
                if (IS_CHAIN_ROCK(bc.chainx, bc.chainy) && !already_in_rock)
                    SKIP_TO_DRAG();
                break;
            }
            /*FALLTHRU*/
        case 1:
        case 0:
            /* do nothing if possible */
            if (CHAIN_IN_MIDDLE(u.uchain.ox, u.uchain.oy))
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
            void impossible('bad chain movement');
            break;
        }
        if (!skip_to_drag)
            return true;
    }

 /* drag: */
    if (near_capacity() > SLT_ENCUMBER && dist2(x, y, u.ux, u.uy) <= 2) {
        await You(`cannot ${
            (game.invent || []).length ? 'carry all that and also ' : ''}drag the heavy iron ball.`);
        nomul(0);
        return false;
    }

    if ((is_pool(u.uchain.ox, u.uchain.oy)
         /* water not mere continuation of previous water */
         && (game.level.at(u.uchain.ox, u.uchain.oy).typ === POOL
             || !is_pool(u.uball.ox, u.uball.oy)
             || game.level.at(u.uball.ox, u.uball.oy).typ === POOL))
        || ((t = t_at(u.uchain.ox, u.uchain.oy)) != null
            && (is_pit(t.ttyp) || is_hole(t.ttyp)))) {
        if (Levitation()) {
            await You_feel('a tug from the iron ball.');
            if (t)
                t.tseen = 1;
        } else {
            let victim;

            await You('are jerked back by the iron ball!');
            if ((victim = m_at(u.uchain.ox, u.uchain.oy)) != null) {
                let tmp;
                const dieroll = rnd(20);

                tmp = -2 + Luck() + find_mac(victim);
                tmp += omon_adj(victim, u.uball, true);

                if (tmp >= dieroll)
                    await hmon(victim, u.uball, HMON_DRAGGED, dieroll);
                else
                    await miss(xname(u.uball), victim);

            } /* now check again in case mon died */
            if (!m_at(u.uchain.ox, u.uchain.oy)) {
                u.ux = u.uchain.ox;
                u.uy = u.uchain.oy;
                newsym(u.ux0, u.uy0);
            }
            nomul(0);

            bc.bc_control = BC_BALL;
            move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
            bc.ballx = u.uchain.ox;
            bc.bally = u.uchain.oy;
            move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
            await spoteffects(true);
            return false;
        }
    }

    bc.bc_control = BC_BALL | BC_CHAIN;

    move_bc(1, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
    if (dist2(x, y, u.ux, u.uy) > 2) {
        /* Hero is moving farther than one square, e.g. jumping.
         * Ball and chain are to be placed adjacent to the hero's
         * destination on the far side from where the hero started. */
        bc.ballx = bc.chainx = x;
        bc.bally = bc.chainy = y;
    } else {
        let newchainx = u.ux, newchainy = u.uy;

        /*
         * Generally, the chain moves to the hero's previous position
         * and the ball moves to the chain's previous position, unless
         * that would put the chain into solid rock
         */
        const IS_CHAIN_ROCK = (cx, cy) => {
            const loc = game.level.at(cx, cy);
            return (IS_OBSTRUCTED(loc.typ)
                    || (IS_DOOR(loc.typ)
                        && ((loc.doormask | 0) & (D_CLOSED | D_LOCKED))));
        };
        if (dist2(x, y, u.uchain.ox, u.uchain.oy) === 4
            && !IS_CHAIN_ROCK(newchainx, newchainy)) {
            newchainx = Math.trunc((x + u.uchain.ox) / 2);
            newchainy = Math.trunc((y + u.uchain.oy) / 2);
            if (IS_CHAIN_ROCK(newchainx, newchainy)) {
                newchainx = u.ux;
                newchainy = u.uy;
            }
        }
        bc.ballx = u.uchain.ox;
        bc.bally = u.uchain.oy;
        bc.chainx = newchainx;
        bc.chainy = newchainy;
    }
    bc.cause_delay = true;
    return true;
}

// src/ball.c:882 drop_ball() — the punished hero drops or throws her iron ball;
// the chain, which is heavier than the ball, drags the hero along
export async function drop_ball(x, y) {
    const u = game.u;

    if (Blind()) {
        /* get the order */
        u.bc_order = bc_order();
        /* pick up glyph */
        u.bglyph = (u.bc_order) ? u.cglyph : levl_glyph(x, y);
    }

    if (x !== u.ux || y !== u.uy) {
        const pullmsg = 'The ball pulls you out of the ';
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
                await pline_The('web is destroyed!');
                deltrap(t_at(u.ux, u.uy));
                break;
            case TT_LAVA:
                await pline(`${pullmsg}${hliquid('lava')}!`);
                break;
            case TT_BEARTRAP:
                side = rn2(3) ? LEFT_SIDE : RIGHT_SIDE;
                await pline(`${pullmsg}bear trap!`);
                await set_wounded_legs(side, rn1(1000, 500));
                if (!u.usteed) {
                    await Your(`${(side === LEFT_SIDE) ? 'left' : 'right'} ${
                        body_part(LEG)} is severely damaged.`);
                    await losehp(Maybe_Half_Phys(2),
                                 'leg damage from being pulled out of a bear trap',
                                 KILLED_BY);
                }
                break;
            }
            await reset_utrap(true);
            await fill_pit(u.ux, u.uy);
        }

        u.ux0 = u.ux;
        u.uy0 = u.uy;
        if (!Levitation() && !m_at(x, y) && !u.utrap
            && (is_pool(x, y)
                || ((t = t_at(x, y)) != null
                    && (is_pit(t.ttyp)
                        || is_hole(t.ttyp))))) {
            u.ux = x;
            u.uy = y;
        } else {
            u.ux = x - u.dx;
            u.uy = y - u.dy;
        }
        game.vision_full_recalc = 1; /* hero has moved, recalc vision later */

        if (Blind()) {
            /* drop glyph under the chain */
            if ((u.bc_felt | 0) & BC_CHAIN)
                set_levl_glyph(u.uchain.ox, u.uchain.oy, u.cglyph);
            u.bc_felt = 0; /* feel nothing */
            /* pick up new glyph */
            u.cglyph = (u.bc_order) ? u.bglyph : levl_glyph(u.ux, u.uy);
        }
        movobj(u.uchain, u.ux, u.uy); /* has a newsym */
        if (Blind()) {
            u.bc_order = bc_order();
        }
        newsym(u.ux0, u.uy0); /* clean up old position */
        if (u.ux0 !== u.ux || u.uy0 !== u.uy) {
            await spoteffects(true);
        }
    }
}

// src/ball.c:965 litter() — when a hero falls down stairs while punished,
// some inventory items may fall with her
async function litter() {
    const capacity = weight_cap();

    for (const otmp of [...(game.invent || [])]) {
        if (otmp !== game.u.uball && rnd(capacity) <= otmp.owt) {
            if (canletgo(otmp, '')) {
                await You(`drop ${yname(otmp)} and ${(otmp.quan === 1) ? 'it' : 'they'} ${
                    otense(otmp, 'fall')} down the stairs with you.`);
                setnotworn(otmp);
                freeinv(otmp);
                await hitfloor(otmp, false);
            }
        }
    }
}

// src/ball.c:986 drag_down() — the ball drags the hero down the stairs
export async function drag_down() {
    const u = game.u;
    let forward;
    let dragchance = 3;

    /*
     *  Assume that the ball falls forward if:
     *
     *  a) the character is wielding it, or
     *  b) the character has both hands available to hold it (i.e. is
     *     not wielding any weapon), or
     *  c) (perhaps) it falls forward out of his non-weapon hand
     */
    forward = carried(u.uball) && (u.uwep === u.uball || !u.uwep || !rn2(3));

    if (carried(u.uball) && !welded(u.uball))
        await You('lose your grip on the iron ball.');

    await cls();  /* previous level is still displayed although you
                     went down the stairs. Avoids bug C343-20 */

    if (forward) {
        if (rn2(6)) {
            await pline_The('iron ball drags you downstairs!');
            await losehp(Maybe_Half_Phys(rnd(6)),
                         'dragged downstairs by an iron ball', NO_KILLER_PREFIX);
            await litter();
        }
    } else {
        if (rn2(2)) {
            await pline_The('iron ball smacks into you!');
            await losehp(Maybe_Half_Phys(rnd(20)), 'iron ball collision',
                         KILLED_BY_AN);
            exercise(A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            await pline_The('iron ball drags you downstairs!');
            await losehp(Maybe_Half_Phys(rnd(3)),
                         'dragged downstairs by an iron ball', NO_KILLER_PREFIX);
            exercise(A_STR, false);
            await litter();
        }
    }
}

// src/ball.c:1034 bc_sanity_check()
export function bc_sanity_check() {
    const u = game.u;
    let otyp, freeball, freechain;
    let onam;

    if (Punished() && (!u.uball || !u.uchain)) {
        void impossible(`Punished without ${
            !u.uball ? 'iron ball' : ''}${
            (!u.uball && !u.uchain) ? ' and ' : ''}${
            !u.uchain ? 'attached chain' : ''}?`);
    } else if (!Punished() && (u.uball || u.uchain)) {
        void impossible(`Attached ${
            u.uchain ? 'chain' : ''}${
            (u.uchain && u.uball) ? ' and ' : ''}${
            u.uball ? 'iron ball' : ''} without being Punished?`);
    }
    /* ball is free when swallowed, when changing levels or during air bubble
       management on Plane of Water (both of which start and end in between
       sanity checking cycles, so shouldn't be relevant), other times? */
    freechain = (!u.uchain || u.uchain.where === OBJ_FREE);
    freeball = (!u.uball || u.uball.where === OBJ_FREE
                /* lie to simplify subsequent checks */
                || (freechain && u.uball.where === OBJ_INVENT));
    if (u.uball && (u.uball.otyp !== ONAMES.HEAVY_IRON_BALL
                    || (u.uball.where !== OBJ_FLOOR
                        && u.uball.where !== OBJ_INVENT
                        && u.uball.where !== OBJ_FREE)
                    || (freeball ^ freechain)
                    || ((u.uball.owornmask | 0) & W_BALL) === 0
                    || ((u.uball.owornmask | 0) & ~(W_BALL | W_WEAPONS)) !== 0)) {
        otyp = u.uball.otyp;
        onam = safe_typename(otyp);
        void impossible(`uball: type ${otyp} (${onam}), where ${
            u.uball.where}, wornmask=0x${(u.uball.owornmask | 0).toString(16).padStart(8, '0')}`);
    }
    if (u.uchain && (u.uchain.otyp !== ONAMES.IRON_CHAIN
                     || (u.uchain.where !== OBJ_FLOOR
                         && u.uchain.where !== OBJ_FREE)
                     || (freechain ^ freeball)
                     || ((u.uchain.owornmask | 0) & W_CHAIN) === 0
                     || ((u.uchain.owornmask | 0) & ~W_CHAIN) !== 0)) {
        otyp = u.uchain.otyp;
        onam = safe_typename(otyp);
        void impossible(`uchain: type ${otyp} (${onam}), where ${
            u.uchain.where}, wornmask=0x${(u.uchain.owornmask | 0).toString(16).padStart(8, '0')}`);
    }
    if (u.uball && u.uchain && !(freeball && freechain)) {
        let bx, by, cx, cy, bdx, bdy, cdx, cdy;

        /* non-free chain should be on or next to the hero;
           non-free ball should be on or next to the chain or else carried */
        cx = u.uchain.ox, cy = u.uchain.oy;
        cdx = cx - u.ux, cdy = cy - u.uy;
        cdx = Math.abs(cdx), cdy = Math.abs(cdy);
        if (u.uball.where === OBJ_INVENT) /* carried(uball) */
            bx = u.ux, by = u.uy; /* get_obj_location() */
        else
            bx = u.uball.ox, by = u.uball.oy;
        bdx = bx - cx, bdy = by - cy;
        bdx = Math.abs(bdx), bdy = Math.abs(bdy);
        if (cdx > 1 || cdy > 1 || bdx > 1 || bdy > 1)
            void impossible(
                `b&c distance: you@<${u.ux},${u.uy}>, chain@<${cx},${cy}>, ball@<${bx},${by}>`);
    }
}
