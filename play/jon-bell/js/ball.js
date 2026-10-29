// js/ball.js
// C ref: nethack-c/src/ball.c
//
// (port-gen-drag_ball-001). move_bc/hmon/miss are drag_ball's unported
// callees; per charter they are stubbed below, not ported.
//
// move_bc's OWN state-relevant effect (unlinking uball/uchain from the
// 558) is nonetheless required to reproduce drag_ball's own checked
// below, reusing the ALREADY-PORTED mkobj.c remove_object (js/mklev.js).
//
// comment it replaces was wrong twice over:
//   * "display-only".  ball.c:449-509 is where movobj() MOVES the ball and
//     the chain.  With it stubbed, a blind punished hero dragged nothing:
//     uball and uchain stayed on the square they occupied when the hero went
//     blind, for as long as the blindness lasted.
//     step 994 while punished and then drags the ball for 42 move_bc calls.
//     And it could not have been observed either way, because this file's own
//     Blind() macro read the wrong uprops key and returned false for a blind
//     hero (see the Blind import below): the gap was invisible to its author.

import { game } from './gstate.js';
import { dist2, distmin } from './hacklib.js';
import { near_capacity } from './weight.js';
import { nomul } from './allmain.js';
import { newsym, map_object, pline, Unaware } from './display.js';
import { Blind } from './vision.js';
import { omon_adj, welded, setuwep, setuswapwep,
         setuqwep, freeinv, body_part, set_wounded_legs } from './cmd.js';
import { find_mac, t_at, deltrap, reset_utrap, fill_pit } from './trap.js';
import { spoteffects } from './landing-effects.js';
import { remove_object, obj_extract_self, maybe_unhide_at, place_object } from './mklev.js';
import { flooreffects, Yname2 } from './cmd.js';
import { rn1, rn2, rnd } from './rng.js';
import { You, Your, hard_helmet, encumber_msg } from './do_wear.js';
import { xname } from './do_wear.js';
import { losehp } from './dokick.js';
import { hmon as hmon_real, hliquid } from './mhitm.js';
import { m_at as monster_at } from './uhitm.js';
import { impossible } from './steed.js';
import { impossible as bc_impossible } from './pline.js';
import { simple_typename } from './objnam.js';
import { OC_NAME } from './oc_name_data.js';
/* zap.c:3571 miss() — canonical synchronous message helper. */
import { miss as miss_real } from './zap.js';
import {
    W_BALL, W_CHAIN, W_WEAPONS, BC_BALL, BC_CHAIN, SLT_ENCUMBER, HMON_DRAGGED,
    OBJ_FREE, OBJ_FLOOR, OBJ_INVENT,
    IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED,
    POOL, MOAT, WATER, DRAWBRIDGE_UP, DB_UNDER, DB_MOAT,
    Is_juiblex_level, Is_waterlevel,
    is_pit, is_hole,
    LEVITATION, HEAD, LEG, KILLED_BY, NO_KILLER_PREFIX, HALF_PHDAM,
    TT_INFLOOR, TT_BURIEDBALL, TT_PIT, TT_WEB, TT_LAVA, TT_BEARTRAP,
    LEFT_SIDE, RIGHT_SIDE,
} from './const.js';

/* C hack.h Maybe_Half_Phys(dmg), kept local to this object subsystem. */
function ball_Maybe_Half_Phys(dmg) {
    const p = game.u?.uprops?.[HALF_PHDAM];
    return p && (((p.intrinsic | 0) || (p.extrinsic | 0)))
        ? Math.trunc((dmg + 1) / 2) : dmg;
}

// Unported callees (charter: stub, do not port). Neither is ever reached by
// draws any RNG, so that branch never fires).
/* hmon: canonical asynchronous combat implementation. */
async function hmon(mon, obj, thrown, dieroll) {
    return hmon_real(mon, obj, thrown, dieroll);
}
/* miss: LOCAL throwing stub DELETED — use zap.js's canonical body below. */
// C pline.c:387-400 You_feel(line) — preserve the feedback when dragging a
// punished ball through a pool/hole while levitating.
function You_feel(msg) { return pline((Unaware() ? 'You dream that you feel ' : 'You feel ') + msg); }
// BCPOS_* — ball.c:107-109.
const BCPOS_DIFFER = 0; // ball & chain at different positions
const BCPOS_CHAIN = 1;  // chain on top of ball
const BCPOS_BALL = 2;   // ball on top of chain

// bc_order() — ball.c:400-425. Which of ball/chain is on top of the shared
// tile pile. Draws no RNG.
function bc_order(uball, uchain) {
    if (uchain.ox !== uball.ox || uchain.oy !== uball.oy || carried(uball)
        || game.u?.uswallow)
        return BCPOS_DIFFER;
    for (let obj = game.level?.levelObjects?.[uball.ox]?.[uball.oy]; obj;
         obj = obj.nexthere) {
        if (obj === uchain || obj.o_id === uchain.o_id) return BCPOS_CHAIN;
        if (obj === uball || obj.o_id === uball.o_id) return BCPOS_BALL;
    }
    // C impossible("bc_order:  ball&chain not in same location!")
    impossible("bc_order:  ball&chain not in same location!");
    return BCPOS_DIFFER;
}

// move_bc(before, control, ballx, bally, chainx, chainy) — ball.c:437-558.
// Exported for read.c:2578/2616 (litroom), which calls with control=0 and
// only when !Blind. dragBallMoveBc() above is drag_ball's control!=0
// specialisation and deliberately omits the bc_order bookkeeping; this is the
// general body. The Blind half (ball.c:449-506) is map-memory glyph
// bookkeeping over u.bc_felt/u.bglyph/u.cglyph, none of which are modelled in
// js/ state — KNOWN GAP, faithful no-op, and unreachable from litroom anyway
// (both its call sites are guarded by !Blind).
// RNG ON THE GAPPED PATH: NONE — ball.c:437-558 and bc_order draw no RNG.
export function move_bc(before, control, ballx, bally, chainx, chainy) {
    const { uball, uchain } = findBallChain();
    if (!uball || !uchain) return;
    if (Blind()) {
        move_bc_blind(before, control, uball, uchain, ballx, bally,
                      chainx, chainy);
        return;
    }
    if (before) {
        // ball.c:517-527
        if (!control) game.u.bc_order = bc_order(uball, uchain);
        remove_object(uchain);
        maybe_unhide_at(uchain.ox, uchain.oy);
        newsym(uchain.ox, uchain.oy);
        if (!carried(uball)) {
            remove_object(uball);
            maybe_unhide_at(uball.ox, uball.oy);
            newsym(uball.ox, uball.oy);
        }
    } else {
        // ball.c:529-547
        const onFloor = !carried(uball);
        if ((control & BC_CHAIN)
            || (!control && game.u.bc_order === BCPOS_CHAIN)) {
            if (onFloor) placeObjectOnFloor(uball, ballx, bally);
            placeObjectOnFloor(uchain, chainx, chainy);
        } else {
            placeObjectOnFloor(uchain, chainx, chainy);
            if (onFloor) placeObjectOnFloor(uball, ballx, bally);
        }
        newsym(chainx, chainy);
        if (onFloor) newsym(ballx, bally);
    }
}

function bc_glyph_at(x, y) {
    const loc = game.level?.at(x, y);
    const g = loc?.remembered_glyph;
    return g ? { ...g } : null;
}
function bc_set_glyph_at(x, y, g) {
    if (g === undefined) return;   /* never picked up — see above */
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.remembered_glyph = g ? { ...g } : null;
}

// movobj(obj, ox, oy) — hack.c:824-833.
export function movobj(obj, ox, oy) {
    remove_object(obj);
    maybe_unhide_at(obj.ox | 0, obj.oy | 0);
    newsym(obj.ox | 0, obj.oy | 0);
    place_object(obj, ox, oy);
    newsym(ox, oy);
}

/*
 *  move_bc's Blind branch — ball.c:449-509, shared by the exported move_bc()
 *  and by drag_ball's own dragBallMoveBc() specialisation, because C has one
 *  function and this is the half where the two are identical.
 *
 *  The hero knows the ball & chain are attached, so when they move the hero
 *  knows they are no longer where they were remembered.  Each of them
 *  therefore PICKS UP the glyph of the square it moves onto and DROPS it again
 *  on the way out, and u.bc_felt tracks which of the two is currently felt
 *  (set by display.c feel_location's Punished block — js/display.js:5170).
 *
 *  RNG: none — nothing on this path draws.
 */
function move_bc_blind(before, control, uball, uchain, ballx, bally,
                       chainx, chainy) {
    const u = game.u;
    if (before)
        return;                                    /* ball.c:455 `if (!before)` */

    if ((control & BC_CHAIN) && (control & BC_BALL)) {
        /* ball.c:459-473 — both moved.  If felt, drop glyph. */
        if ((u.bc_felt | 0) & BC_BALL)
            bc_set_glyph_at(uball.ox, uball.oy, u.bglyph);
        if ((u.bc_felt | 0) & BC_CHAIN)
            bc_set_glyph_at(uchain.ox, uchain.oy, u.cglyph);
        u.bc_felt = 0;

        /* Pick up glyph at new location. */
        u.bglyph = bc_glyph_at(ballx, bally);
        u.cglyph = bc_glyph_at(chainx, chainy);

        movobj(uball, ballx, bally);
        movobj(uchain, chainx, chainy);
    } else if (control & BC_BALL) {
        /* ball.c:474-490 */
        if ((u.bc_felt | 0) & BC_BALL) {
            if (u.bc_order === BCPOS_DIFFER) {     /* ball by itself */
                bc_set_glyph_at(uball.ox, uball.oy, u.bglyph);
            } else if (u.bc_order === BCPOS_BALL) {
                if ((u.bc_felt | 0) & BC_CHAIN)    /* know chain is there */
                    map_object(uchain, 0);
                else
                    bc_set_glyph_at(uball.ox, uball.oy, u.bglyph);
            }
            u.bc_felt = (u.bc_felt | 0) & ~BC_BALL; /* no longer feel the ball */
        }
        /* Pick up glyph at new position. */
        u.bglyph = (ballx !== chainx || bally !== chainy)
                       ? bc_glyph_at(ballx, bally)
                       : u.cglyph;
        movobj(uball, ballx, bally);
    } else if (control & BC_CHAIN) {
        /* ball.c:491-507 */
        if ((u.bc_felt | 0) & BC_CHAIN) {
            if (u.bc_order === BCPOS_DIFFER) {
                bc_set_glyph_at(uchain.ox, uchain.oy, u.cglyph);
            } else if (u.bc_order === BCPOS_CHAIN) {
                if ((u.bc_felt | 0) & BC_BALL)
                    map_object(uball, 0);
                else
                    bc_set_glyph_at(uchain.ox, uchain.oy, u.cglyph);
            }
            u.bc_felt = (u.bc_felt | 0) & ~BC_CHAIN;
        }
        /* Pick up glyph at new position. */
        u.cglyph = (ballx !== chainx || bally !== chainy)
                       ? bc_glyph_at(chainx, chainy)
                       : u.bglyph;
        movobj(uchain, chainx, chainy);
    }

    u.bc_order = bc_order(uball, uchain);           /* ball.c:509 reset the order */
}

/*
 *  set_bc(already_blind) — ball.c:373-421.  The hero is either about to go
 *  blind or already blind and just punished: set up the ball and chain
 *  variables so that the ball and chain are "felt".  Without this, u.bglyph /
 *  u.cglyph are undefined on the first blind move and the ball & chain drop
 *  nothing when they leave a square.
 *
 *  RNG: none.
 */
export function set_bc(already_blind) {
    const u = game.u;
    const { uball, uchain } = findBallChain();
    if (!uball || !uchain) return;
    const ball_on_floor = !carried(uball);

    u.bc_order = bc_order(uball, uchain);   /* get the order */
    u.bc_felt = ball_on_floor ? (BC_BALL | BC_CHAIN) : BC_CHAIN;  /* felt */

    if (already_blind || u.uswallow) {
        u.cglyph = u.bglyph = bc_glyph_at(u.ux, u.uy);
        return;
    }

    /*
     *  Since we can still see, remove the ball&chain and get the glyph that
     *  would be beneath them.  Then put the ball&chain back.
     *  (C ball.c:404-405 calls remove_object WITHOUT maybe_unhide_at here.)
     */
    remove_object(uchain);
    if (ball_on_floor)
        remove_object(uball);

    newsym(uchain.ox, uchain.oy);
    u.cglyph = bc_glyph_at(uchain.ox, uchain.oy);

    if (u.bc_order === BCPOS_DIFFER) {      /* different locations */
        place_object(uchain, uchain.ox, uchain.oy);
        newsym(uchain.ox, uchain.oy);
        if (ball_on_floor) {
            newsym(uball.ox, uball.oy);     /* see under ball */
            u.bglyph = bc_glyph_at(uball.ox, uball.oy);
            place_object(uball, uball.ox, uball.oy);
            newsym(uball.ox, uball.oy);     /* restore ball */
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

// carried(o) — obj.h:332: ((o)->where == OBJ_INVENT)
function carried(o) {
    return o != null && (o.where | 0) === OBJ_INVENT;
}

/* C ball.c:24-41.  Dropping a carried, non-welded ball must clear every
 * wielding slot before freeinv(), since setuwep() can update worn state and
 * freeinv() is the canonical inventory unlink. */
export async function ballrelease(showmsg = false) {
    const { uball } = findBallChain();
    const u = game.u || {};
    if (!uball || !carried(uball) || welded(uball)) return;
    if (showmsg) await pline('Startled, you drop the iron ball.');
    if (u.uwep === uball) await setuwep(null);
    if (u.uswapwep === uball) await setuswapwep(null);
    if (u.uquiver === uball) await setuqwep(null);
    freeinv(uball);
    await encumber_msg();
}

/* C ball.c:43-71.  A ball crossing a trap door can fall onto the hero before
 * the ball is placed under them again by trap.c. */
export async function ballfall() {
    const { uball } = findBallChain();
    const u = game.u || {};
    if (!uball || (carried(uball) && welded(uball))) return;

    const gets_hit = ((uball.ox | 0) !== (u.ux | 0)
                     || (uball.oy | 0) !== (u.uy | 0))
        && (u.uwep === uball ? false : !!rn2(5));
    await ballrelease(true);
    if (!gets_hit) return;

    let dmg = rn1(7, 25); // C ball.c:54 rn1(7,25) = rn2(7)+25
    void pline(`The iron ball falls on your ${body_part(HEAD)}.`);
    if (u.uarmh) {
        if (hard_helmet(u.uarmh)) {
            void pline('Fortunately, you are wearing a hard helmet.');
            dmg = 3;
        } else if (game.flags?.verbose !== false) {
            await pline(`${Yname2(u.uarmh)} does not protect you.`); /* C ball.c:59 */
        }
    }
    await losehp(ball_Maybe_Half_Phys(dmg),
           'crunched in the head by an iron ball', NO_KILLER_PREFIX);
}

// C ball.c:119-143: shared by ordinary placement and the bubble owner's
// placement.  The restriction is process state, kept on game so resetGame()
// gives a new game C's zero-initialized bcrestriction.
async function placebc_core() {
    const u = game.u;
    const { uball, uchain } = findBallChain();
    if (!uchain || !uball) {
        await bc_impossible('Where are your ball and chain?');
        return;
    }

    await flooreffects(uchain, u.ux, u.uy, ''); // ball.c:126 — chain might rust
    if (carried(uball)) {
        u.bc_order = BCPOS_DIFFER;        // ball.c:129
    } else {
        await flooreffects(uball, u.ux, u.uy, ''); // ball.c:133
        place_object(uball, u.ux, u.uy);
        u.bc_order = BCPOS_CHAIN;
    }
    place_object(uchain, u.ux, u.uy);     // ball.c:139
    // ball.c:141 — pick up glyph.  This is read back by move_bc's Blind half
    // (and is the ONLY initialiser of u.bglyph/u.cglyph on the goto_level
    // arrival path, where set_bc is not called).
    u.bglyph = u.cglyph = bc_glyph_at(u.ux, u.uy);
    newsym(u.ux, u.uy);                   // ball.c:143
    game.bcrestriction = 0;
}

// C ball.c:179-188; hack.h:110 override_restriction == -1.
function check_restriction(restriction) {
    return !game.bcrestriction || restriction === -1
        || game.bcrestriction === restriction;
}

// C ball.c:193-209.  A bubble move owns placement until its pin is lifted.
export async function placebc() {
    if (!check_restriction(0)) return;
    const { uchain } = findBallChain();
    if (uchain && uchain.where !== OBJ_FREE) {
        await bc_impossible('bc already placed?');
        return;
    }
    await placebc_core();
}

// C ball.c:221-232.  Draw exactly once when acquiring the restriction.
export async function unplacebc_and_covet_placebc() {
    let restriction = 0;
    if (game.bcrestriction) {
        await bc_impossible('unplacebc_and_covet_placebc denied, already restricted');
    } else {
        restriction = game.bcrestriction = rnd(400);
        unplacebc_core();
    }
    return restriction;
}

// C ball.c:235-255.  A wrong pin leaves both the restriction and objects alone.
export async function lift_covet_and_placebc(pin) {
    if (!check_restriction(pin)) return;
    const { uchain } = findBallChain();
    if (uchain && uchain.where !== OBJ_FREE) {
        await bc_impossible('bc already placed?');
        return;
    }
    await placebc_core();
}

/* C ball.c:873-965 drop_ball().  dropy() has already placed the ball; this
 * releases the chain and, when the ball lands away from the hero, pulls the
 * hero toward it. */
export async function drop_ball(x, y) {
    const u = game.u || {};
    const { uball, uchain } = findBallChain();
    if (!uball || !uchain) return;
    const tx = x | 0, ty = y | 0;
    if (Blind()) {                          // ball.c:884-889
        u.bc_order = bc_order(uball, uchain);
        u.bglyph = u.bc_order ? u.cglyph : bc_glyph_at(tx, ty);
    }
    if (tx === (u.ux | 0) && ty === (u.uy | 0)) return;

    const pullmsg = 'The ball pulls you out of the ';
    if ((u.utrap | 0) && (u.utraptype | 0) !== TT_INFLOOR
        && (u.utraptype | 0) !== TT_BURIEDBALL) {
        switch (u.utraptype | 0) {
        case TT_PIT: await pline('%spit!', pullmsg); break;
        case TT_WEB:
            await pline('%sweb!', pullmsg);
            await pline('The web is destroyed!');
            deltrap(t_at(u.ux | 0, u.uy | 0));  // ball.c:906
            break;
        case TT_LAVA: await pline('%s%s!', pullmsg, hliquid('lava')); break;
        case TT_BEARTRAP: {
            const side = rn2(3) ? LEFT_SIDE : RIGHT_SIDE;
            await pline('%sbear trap!', pullmsg);
            set_wounded_legs(side, rn1(1000, 500));
            if (!u.usteed) {
                // C ball.c:915-921: one injury message and one damage application.
                await Your('%s %s is severely damaged.', side === LEFT_SIDE ? 'left' : 'right', body_part(LEG));
                await losehp(ball_Maybe_Half_Phys(2), 'leg damage from being pulled out of a bear trap', KILLED_BY);
            }
            break;
        }
        default: break;
        }
        await reset_utrap(true);
        await fill_pit(u.ux | 0, u.uy | 0);
    }

    u.ux0 = u.ux | 0;
    u.uy0 = u.uy | 0;
    const lev = Levitation();
    const occupied = !!monster_at(tx, ty);
    const dt = t_at(tx, ty);
    if (!lev && !occupied && !u.utrap
        && (is_pool_here(tx, ty) || (dt && (is_pit(dt.ttyp) || is_hole(dt.ttyp))))) {
        u.ux = tx; u.uy = ty;
    } else {
        u.ux = tx - (u.dx | 0); u.uy = ty - (u.dy | 0);
    }
    game.vision_full_recalc = 1;
    if (Blind()) {                          // ball.c:944-951
        if ((u.bc_felt | 0) & BC_CHAIN)     /* drop glyph under the chain */
            bc_set_glyph_at(uchain.ox, uchain.oy, u.cglyph);
        u.bc_felt = 0;                      /* feel nothing */
        u.cglyph = u.bc_order ? u.bglyph : bc_glyph_at(u.ux | 0, u.uy | 0);
    }
    movobj(uchain, u.ux | 0, u.uy | 0);     /* has a newsym */
    if (Blind())
        u.bc_order = bc_order(uball, uchain);
    newsym(u.ux0 | 0, u.uy0 | 0);
    if (u.ux0 !== u.ux || u.uy0 !== u.uy)
        await spoteffects(true);            // ball.c:957-958
}

// unplacebc() — ball.c:212-219 → ball.c:147-180 unplacebc_core(): take the ball
// calls it on departure from a level; without it the ball and chain stay linked
// into the OLD level's object chain and the arrival-side placebc() then splices
// them into the new level's too, so remove_object() later walks a tile chain
// they are not on and throws "extract_nexthere: object lost".
export function unplacebc() {
    if (game.bcrestriction) {
        impossible('unplacebc denied, restriction in place');
        return;
    }
    unplacebc_core();
}

// C ball.c:146-176.  On Water, even a swallowed hero's ball and chain must
// be excluded from bubble contents; this path does not alter glyph memory.
function unplacebc_core() {
    const { uball, uchain } = findBallChain();
    if (!uball || !uchain) return;
    if (game.u?.uswallow) {
        if (Is_waterlevel(game.u.uz)) {
            if (!carried(uball)) obj_extract_self(uball);
            obj_extract_self(uchain);
        }
        return;
    }
    if (!carried(uball)) {
        obj_extract_self(uball);          // ball.c:164
        if (Blind() && ((game.u.bc_felt | 0) & BC_BALL))  // ball.c:167-168
            bc_set_glyph_at(uball.ox, uball.oy, game.u.bglyph);
        maybe_unhide_at(uball.ox, uball.oy);
        newsym(uball.ox, uball.oy);
    }
    obj_extract_self(uchain);             // ball.c:170
    if (Blind() && ((game.u.bc_felt | 0) & BC_CHAIN))      // ball.c:174-175
        bc_set_glyph_at(uchain.ox, uchain.oy, game.u.cglyph);
    maybe_unhide_at(uchain.ox, uchain.oy);
    newsym(uchain.ox, uchain.oy);
    game.u.bc_felt = 0;                   // ball.c:178 feel nothing
}

// C objnam.c:312-331: diagnostic naming must not identify or rename the type.
async function bc_safe_typename(otyp) {
    if (otyp < 0 || otyp >= OC_NAME.length || !OC_NAME[otyp]) {
        const name = `glorkum[${otyp}]`;
        await bc_impossible('safe_typename: %s', name);
        return name;
    }
    const known = game._oc_name_known ||= {};
    const saved = known[otyp];
    known[otyp] = 1;
    const name = simple_typename(otyp);
    if (saved === undefined) delete known[otyp];
    else known[otyp] = saved;
    return name;
}

// C ball.c:1033-1109. Use the actual attachment slots even when inconsistent:
// searching worn objects would hide precisely the corruption being diagnosed.
export async function bc_sanity_check() {
    const u = game.u;
    const uball = u.uball, uchain = u.uchain;
    const punished = !!uball; // youprop.h:77 Punished
    if (punished && (!uball || !uchain)) {
        await bc_impossible('Punished without %s%s%s?',
            !uball ? 'iron ball' : '', (!uball && !uchain) ? ' and ' : '',
            !uchain ? 'attached chain' : '');
    } else if (!punished && (uball || uchain)) {
        await bc_impossible('Attached %s%s%s without being Punished?',
            uchain ? 'chain' : '', (uchain && uball) ? ' and ' : '',
            uball ? 'iron ball' : '');
    }
    const freechain = !uchain || uchain.where === OBJ_FREE;
    const freeball = !uball || uball.where === OBJ_FREE
        || (freechain && uball.where === OBJ_INVENT);
    if (uball && (uball.otyp !== 477 /* HEAVY_IRON_BALL */
        || (uball.where !== OBJ_FLOOR && uball.where !== OBJ_INVENT
            && uball.where !== OBJ_FREE)
        || (freeball !== freechain)
        || !(uball.owornmask & W_BALL)
        || (uball.owornmask & ~(W_BALL | W_WEAPONS)))) {
        const name = await bc_safe_typename(uball.otyp);
        await bc_impossible('uball: type %d (%s), where %d, wornmask=0x%08lx',
            uball.otyp, name, uball.where, uball.owornmask);
    }
    if (uchain && (uchain.otyp !== 478 /* IRON_CHAIN */
        || (uchain.where !== OBJ_FLOOR && uchain.where !== OBJ_FREE)
        || (freechain !== freeball)
        || !(uchain.owornmask & W_CHAIN)
        || (uchain.owornmask & ~W_CHAIN))) {
        const name = await bc_safe_typename(uchain.otyp);
        await bc_impossible('uchain: type %d (%s), where %d, wornmask=0x%08lx',
            uchain.otyp, name, uchain.where, uchain.owornmask);
    }
    if (uball && uchain && !(freeball && freechain)) {
        const cx = uchain.ox, cy = uchain.oy;
        const bx = carried(uball) ? u.ux : uball.ox;
        const by = carried(uball) ? u.uy : uball.oy;
        if (Math.abs(cx - u.ux) > 1 || Math.abs(cy - u.uy) > 1
            || Math.abs(bx - cx) > 1 || Math.abs(by - cy) > 1)
            await bc_impossible(
                'b&c distance: you@<%d,%d>, chain@<%d,%d>, ball@<%d,%d>',
                u.ux, u.uy, cx, cy, bx, by);
    }
}

// uball / uchain (decl.h:97-98) are top-level C globals, not modeled as a
// JS state slot anywhere. Locate the single object carrying the W_BALL /
// W_CHAIN owornmask bit, wherever it currently is: gi.invent when carried,
// otherwise — mirrors how carried(uball) itself is only knowable by first
// finding the object.
function findBallChain() {
    const gu = game.u;
    if (gu && gu.uball && gu.uchain)
        return { uball: gu.uball, uchain: gu.uchain };
    let uball = null, uchain = null;
    for (let o = game.invent; o; o = o.nobj) {
        if ((o.owornmask | 0) & W_BALL) uball = o;
        if ((o.owornmask | 0) & W_CHAIN) uchain = o;
    }
    for (let o = game.fobj; o; o = o.nobj) {
        if ((o.owornmask | 0) & W_BALL) uball = o;
        if ((o.owornmask | 0) & W_CHAIN) uchain = o;
    }
    return { uball, uchain };
}

// is_pool(x,y) — rm.h: POOL/MOAT/WATER/DRAWBRIDGE_UP. The project-wide
// js/pickup.js export is an unconditional "not yet ported: is_pool
// (dbridge.c)" throw stub; reproduced locally instead, exactly as
// js/dokick.js's non-exported is_pool and js/cmd.js's pooleffects_is_pool
// already do for the same reason.
function is_pool_here(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    if (t === POOL || t === MOAT || t === WATER) return true;
    // dbridge.c:is_moat(): an opened drawbridge counts as a moat only
    // when its under-terrain is DB_MOAT (and not on Juiblex's level).
    return t === DRAWBRIDGE_UP
        && !Is_juiblex_level(game.u?.uz)
        && (((loc.drawbridgemask ?? loc.flags ?? 0) | 0) & DB_UNDER) === DB_MOAT;
}

// Levitation macro — youprop.h: (HLevitation|ELevitation) set and not
// condition below is false in every one of the 4 records that reach this
// far), but implemented for structural completeness.
function Levitation() {
    const p = game.u?.uprops?.[LEVITATION];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}

// Blind macro — youprop.h: (HBlind|EBlind) && !BBlind.  This file used to
// carry its own copy that read `game.u.uprops.BLINDED` — the STRING key —
// while js/const.js:2327 defines BLINDED = 15 and every writer indexes
// uprops NUMERICALLY.  So the local macro returned false for a hero who was
// blind, and EVERY Blind arm below (move_bc's whole map-memory half,
// with the hero blind and all 42 took the SIGHTED branch.  Read the one live
// spelling instead — js/vision.js Blind(), which is the same expression the
// botl "Blind" condition and see_with_infrared already use.

// m_at(x,y) — mon.c: find a monster occupying (x,y). Classified
// inline. Only reached from the never-exercised hmon/miss branch.
function m_at(x, y) {
    for (let m = game.fmon; m; m = m.nmon) {
        if (m._mapRemoved) continue;
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared */
        if ((m.mx | 0) === x && (m.my | 0) === y) return m;
    }
    return null;
}

// IS_CHAIN_ROCK(x,y) — ball.c:601-604 macro, local to drag_ball.
function isChainRock(x, y) {
    const loc = game.level.at(x, y);
    const typ = loc.typ | 0;
    return IS_OBSTRUCTED(typ)
        || (IS_DOOR(typ) && ((loc.doormask | 0) & (D_CLOSED | D_LOCKED)) !== 0);
}

// CHAIN_IN_MIDDLE(chx,chy) — ball.c:598-600 macro, local to drag_ball.
function chainInMiddle(chx, chy, x, y, uball) {
    return distmin(x, y, chx, chy) <= 1
        && distmin(chx, chy, uball.ox, uball.oy) <= 1;
}

// non-boulder-goes-under-boulders rule (mkobj.c:2336-2345) applies — a
// hand-rolled head-insert put the chain on top of a boulder pile.
function placeObjectOnFloor(otmp, x, y) {
    place_object(otmp, x, y);
}

// move_bc (ball.c:437-558) — state-relevant subset only; see file header.
function dragBallMoveBc(before, control, uball, uchain, ballx, bally, chainx, chainy) {
    if (Blind()) {
        // ball.c:449-509 — the same half of the same C function, so it is the
        // calls).  Nor is it display-only: it is where movobj() moves the ball
        // and the chain, so with it stubbed neither object moved at all while
        // the hero was blind.
        move_bc_blind(before, control, uball, uchain, ballx, bally,
                      chainx, chainy);
        return;
    }
    if (before) {
        // ball.c:519-527
        // ball.c:517-524: nothing moving -> remember which of ball/chain was
        // on top; move_bc(0, ...) places the pair back in that order.
        if (!control) game.u.bc_order = bc_order(uball, uchain);
        remove_object(uchain);
        maybe_unhide_at(uchain.ox, uchain.oy);
        newsym(uchain.ox, uchain.oy);
        if (!carried(uball)) {
            remove_object(uball);
            maybe_unhide_at(uball.ox, uball.oy);
            newsym(uball.ox, uball.oy);
        }
    } else {
        // ball.c:529-547
        const onFloor = !carried(uball);
        if ((control & BC_CHAIN) !== 0
            || (!control && game.u.bc_order === BCPOS_CHAIN)) {
            if (onFloor) placeObjectOnFloor(uball, ballx, bally);
            placeObjectOnFloor(uchain, chainx, chainy);
        } else {
            placeObjectOnFloor(uchain, chainx, chainy);
            if (onFloor) placeObjectOnFloor(uball, ballx, bally);
        }
        newsym(chainx, chainy);
        if (onFloor) newsym(ballx, bally);
    }
}

// drag: (ball.c:783-871) — reached either by falling out of the top-level
// "only need to move the chain?" block, or via SKIP_TO_DRAG (goto drag).
async function dragSection(x, y, uball, uchain, bc_control, ballx, bally, chainx, chainy, cause_delay) {
    // ball.c:785-791
    if (near_capacity() > SLT_ENCUMBER && dist2(x, y, game.u.ux, game.u.uy) <= 2) {
        await You(`cannot ${game.invent ? 'carry all that and also ' : ''}drag the heavy iron ball.`);
        nomul(0);
        return false;
    }

    // ball.c:793-800
    const chOx = uchain.ox, chOy = uchain.oy;
    let t = null;
    const poolCond = is_pool_here(chOx, chOy)
        && (game.level.at(chOx, chOy).typ === POOL
            || !is_pool_here(uball.ox, uball.oy)
            || game.level.at(uball.ox, uball.oy).typ === POOL);
    if (!poolCond) {
        t = t_at(chOx, chOy);
    }
    const holeCond = !!(t && (is_pit(t.ttyp) || is_hole(t.ttyp)));

    if (poolCond || holeCond) {
        if (Levitation()) {
            await You_feel('a tug from the iron ball.');
            if (t) t.tseen = 1;
        } else {
            // ball.c:806-825
            await pline('You are jerked back by the iron ball!');
            const victim = m_at(chOx, chOy);
            if (victim) {
                const dieroll = rnd(20);
                // C ball.c:802; you.h:464 defines Luck as uluck + moreluck.
                let tmp = -2 + (game.u?.uluck | 0) + (game.u?.moreluck | 0) + find_mac(victim);
                tmp += omon_adj(victim, uball, true);
                if (tmp >= dieroll) {
                    await hmon(victim, uball, HMON_DRAGGED, dieroll);
                } else {
                    await miss_real(xname(uball), victim);
                }
            }
            if (!m_at(chOx, chOy)) {
                game.u.ux = chOx;
                game.u.uy = chOy;
                newsym(game.u.ux0, game.u.uy0);
            }
            nomul(0);

            bc_control.value = BC_BALL;
            dragBallMoveBc(1, bc_control.value, uball, uchain, ballx.value, bally.value, chainx.value, chainy.value);
            ballx.value = chOx;
            bally.value = chOy;
            dragBallMoveBc(0, bc_control.value, uball, uchain, ballx.value, bally.value, chainx.value, chainy.value);
            /* C ball.c:825 — process effects at the square after dragging.
             * The shared arrival pickup body is the live portion of
             * spoteffects and preserves its async command conventions. */
            await spoteffects(true);
            return false;
        }
    }

    // ball.c:828-830
    bc_control.value = BC_BALL | BC_CHAIN;
    dragBallMoveBc(1, bc_control.value, uball, uchain, ballx.value, bally.value, chainx.value, chainy.value);

    if (dist2(x, y, game.u.ux, game.u.uy) > 2) {
        // ball.c:831-838
        ballx.value = x;
        chainx.value = x;
        bally.value = y;
        chainy.value = y;
    } else {
        // ball.c:839-861
        let newchainx = game.u.ux, newchainy = game.u.uy;
        if (dist2(x, y, uchain.ox, uchain.oy) === 4 && !isChainRock(newchainx, newchainy)) {
            newchainx = Math.trunc((x + uchain.ox) / 2);
            newchainy = Math.trunc((y + uchain.oy) / 2);
            if (isChainRock(newchainx, newchainy)) {
                newchainx = game.u.ux;
                newchainy = game.u.uy;
            }
        }
        ballx.value = uchain.ox;
        bally.value = uchain.oy;
        chainx.value = newchainx;
        chainy.value = newchainy;
    }

    cause_delay.value = true;
    return true;
}

// C ref: ball.c:559-871
// boolean drag_ball(coordxy x, coordxy y, int *bc_control, coordxy *ballx,
//                    coordxy *bally, coordxy *chainx, coordxy *chainy,
//                    boolean *cause_delay, boolean allow_drag)
export async function drag_ball(x, y, bc_control, ballx, bally, chainx, chainy, cause_delay, allow_drag) {
    const { uball, uchain } = findBallChain();

    ballx.value = uball.ox;
    bally.value = uball.oy;
    chainx.value = uchain.ox;
    chainy.value = uchain.oy;
    bc_control.value = 0;
    cause_delay.value = false;

    // ball.c:590-593 — nothing moved
    if (dist2(x, y, uchain.ox, uchain.oy) <= 2) {
        dragBallMoveBc(1, bc_control.value, uball, uchain, ballx.value, bally.value, chainx.value, chainy.value);
        return true;
    }

    // ball.c:596 — only need to move the chain?
    if (carried(uball) || distmin(x, y, uball.ox, uball.oy) <= 2) {
        const oldchainx = uchain.ox, oldchainy = uchain.oy;

        bc_control.value = BC_CHAIN;
        dragBallMoveBc(1, bc_control.value, uball, uchain, ballx.value, bally.value, chainx.value, chainy.value);
        if (carried(uball)) {
            // ball.c:601-605
            if (distmin(x, y, uchain.ox, uchain.oy) > 1) {
                chainx.value = game.u.ux;
                chainy.value = game.u.uy;
            }
            return true;
        }

        // ball.c:625-630
        const alreadyInRock = isChainRock(game.u.ux, game.u.uy)
            || isChainRock(chainx.value, chainy.value)
            || isChainRock(uball.ox, uball.oy);

        let skipToDrag = false;
        switch (dist2(x, y, uball.ox, uball.oy)) {
        case 8:
            // ball.c:634-639
            chainx.value = Math.trunc((uball.ox + x) / 2);
            chainy.value = Math.trunc((uball.oy + y) / 2);
            if (isChainRock(chainx.value, chainy.value) && !alreadyInRock) skipToDrag = true;
            break;
        case 5: {
            // ball.c:648-707
            let tempx, tempy, tempx2, tempy2;
            if (Math.abs(x - uball.ox) === 1) {
                tempx = x;
                tempx2 = uball.ox;
                tempy = tempy2 = Math.trunc((uball.oy + y) / 2);
            } else {
                tempx = tempx2 = Math.trunc((uball.ox + x) / 2);
                tempy = y;
                tempy2 = uball.oy;
            }
            if (isChainRock(tempx, tempy) && !isChainRock(tempx2, tempy2) && !alreadyInRock) {
                if (allow_drag) {
                    if (dist2(game.u.ux, game.u.uy, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx, tempy) === 1) { skipToDrag = true; break; }
                    if (dist2(game.u.ux, game.u.uy, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx, tempy) === 2) { skipToDrag = true; break; }
                }
                chainx.value = tempx2;
                chainy.value = tempy2;
            } else if (!isChainRock(tempx, tempy) && isChainRock(tempx2, tempy2) && !alreadyInRock) {
                if (allow_drag) {
                    if (dist2(game.u.ux, game.u.uy, uball.ox, uball.oy) === 5
                        && dist2(x, y, tempx2, tempy2) === 1) { skipToDrag = true; break; }
                    if (dist2(game.u.ux, game.u.uy, uball.ox, uball.oy) === 4
                        && dist2(x, y, tempx2, tempy2) === 2) { skipToDrag = true; break; }
                }
                chainx.value = tempx;
                chainy.value = tempy;
            } else if (isChainRock(tempx, tempy) && isChainRock(tempx2, tempy2) && !alreadyInRock) {
                skipToDrag = true;
            } else if (dist2(tempx, tempy, uchain.ox, uchain.oy)
                           < dist2(tempx2, tempy2, uchain.ox, uchain.oy)
                       || (dist2(tempx, tempy, uchain.ox, uchain.oy)
                           === dist2(tempx2, tempy2, uchain.ox, uchain.oy)
                           && rn2(2))) {
                chainx.value = tempx;
                chainy.value = tempy;
            } else {
                chainx.value = tempx2;
                chainy.value = tempy2;
            }
            break;
        }
        case 4:
            // ball.c:713-719
            if (chainInMiddle(uchain.ox, uchain.oy, x, y, uball)) break;
            chainx.value = Math.trunc((x + uball.ox) / 2);
            chainy.value = Math.trunc((y + uball.oy) / 2);
            if (isChainRock(chainx.value, chainy.value) && !alreadyInRock) skipToDrag = true;
            break;
        case 2:
            // ball.c:728-736
            if (dist2(x, y, uball.ox, uball.oy) === 2
                && dist2(x, y, uchain.ox, uchain.oy) === 4) {
                if (uchain.oy === y) chainx.value = uball.ox;
                else chainy.value = uball.oy;
                if (isChainRock(chainx.value, chainy.value) && !alreadyInRock) skipToDrag = true;
                break;
            }
            // FALLTHROUGH
        case 1:
        case 0:
            // ball.c:740-751
            if (chainInMiddle(uchain.ox, uchain.oy, x, y, uball)) break;
            if (chainInMiddle(game.u.ux, game.u.uy, x, y, uball)) {
                chainx.value = game.u.ux;
                chainy.value = game.u.uy;
                break;
            }
            chainx.value = x;
            chainy.value = y;
            break;
        default:
            await bc_impossible('bad chain movement');
            break;
        }

        if (skipToDrag) {
            // SKIP_TO_DRAG (ball.c:610-616)
            chainx.value = oldchainx;
            chainy.value = oldchainy;
            dragBallMoveBc(0, bc_control.value, uball, uchain, ballx.value, bally.value, chainx.value, chainy.value);
        } else {
            return true;
        }
    }

    return await dragSection(x, y, uball, uchain, bc_control, ballx, bally, chainx, chainy, cause_delay);
}
