// ball.js — Ball & chain placement / drag (partial).
// C ref: ball.c placebc / placebc_core / move_bc / drag_ball / bc_order /
//         set_bc / drag_down / ballrelease / litter / drop_ball.
//
// **Blind move_bc glyph/felt arms + unplacebc_core Blind glyph restore
// D-1777 / D-2857** (set_bc D-1769 takes the bglyph/cglyph snapshots;
// those are remembered *cells* here, not int ids, because this port's
// map memory stores rendered cells). `unplacebc` refuses a live
// `bcrestriction`; the core is what covet calls after the pin.
// Named omissions: BREADCRUMBS Placebc/Unplacebc/Lift_covet
// (config.h leaves BREADCRUMBS undefined); **ballfall D-1778**
// (C `:42–67`; `hard_helmet` is one export now, `js/do_wear.js`);
// **drop_ball D-2329** (C `:881–961`; callers do.c:834 dropz +
// dothrow.c:1840 throw land wired); litter hitfloor/shop/impact
// (place at feet); Soundeffect in drag_down; jerked-back hmon/miss
// body (rnd(20) still burned); unpunish.

import { game } from './gstate.js';
import { place_object, obj_extract_self, objects_at } from './mkobj.js';
import { newsym, pline, You_feel, cls, map_object, impossible } from './display.js';
import { flooreffects } from './do.js';
import {
    OBJ_FREE, OBJ_FLOOR, OBJ_INVENT, BC_BALL, BC_CHAIN, IS_OBSTRUCTED, IS_DOOR,
    D_CLOSED, D_LOCKED, POOL, is_pit, is_hole, SLT_ENCUMBER,
    W_ARMOR, W_ACCESSORY, W_SADDLE, W_BALL, W_CHAIN, W_WEAPONS,
    A_STR, NO_KILLER_PREFIX, KILLED_BY,
    KILLED_BY_AN, LEG,
    TT_PIT, TT_WEB, TT_LAVA, TT_BEARTRAP, TT_INFLOOR, TT_BURIEDBALL,
    LEFT_SIDE, RIGHT_SIDE,
    Is_waterlevel, HEAD,
} from './const.js';
import { dist2, distmin } from './hacklib.js';
import {
    is_pool, nomul, losehp, finish_maybe_wail, maybe_half_phys, movobj,
} from './hack.js';
import { near_capacity, weight_cap, encumber_msg } from './invent.js';
import { rn2, rnd, rn1 } from './rng.js';
// C drop_ball joins deltrap/reset_utrap/set_wounded_legs on the existing
// trap.js edge (t_at was already imported); fill_pit (dig.js),
// spoteffects (pickup.js), hliquid (do_name.js), Soundeffect (sndprocs.js),
// body_part (polyself.js) and se_destroy_web (generated data) are new
// static edges — imports.mjs --can SAFE/ALREADY for each (hoisted fns).
import { t_at, deltrap, reset_utrap, set_wounded_legs } from './trap.js';
import { fill_pit } from './dig.js';
import { spoteffects } from './pickup.js';
import { hliquid } from './do_name.js';
import { body_part } from './polyself.js';
import { Soundeffect } from './sndprocs.js';
import { se_destroy_web } from './generated/seffects_data.js';
import { mon_at } from './uhitm.js';
import { maybe_unhide_at } from './monmove.js';
import { hard_helmet } from './do_wear.js';
import { welded, setuwep, setuswapwep, setuqwep } from './wield.js';
import { exercise } from './attrib.js';
import { xname, Yname2, body_part_latebound, safe_typename } from './objnam.js';
import { objectNames } from './generated/objects_data.js';

/* C otyp ids (dig.js / dbridge.js idiom: indexOf on objectNames). */
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const IRON_CHAIN = objectNames.indexOf('IRON_CHAIN');

/** C ref: ball.c BCPOS_* — stacking order when ball&chain share a cell. */
const BCPOS_DIFFER = 0;
const BCPOS_CHAIN = 1;
const BCPOS_BALL = 2;

function carried(obj) {
    if (!obj) return false;
    const invent = game.invent || [];
    return invent.includes(obj);
}

/** Remove from invent without placing on floor (C invent.c freeinv subset). */
function freeinv_ball(obj) {
    if (!obj) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.nobj = null;
    obj.where = OBJ_FREE;
}

/**
 * Silent canletgo for litter (word="") — avoid do.js import cycle.
 * C ref: do.c canletgo worn/weld/saddle gates when word empty.
 */
function canletgo_silent(obj) {
    if (!obj) return false;
    const mask = obj.owornmask || 0;
    if (mask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) return false;
    const u = game.u || {};
    if (obj === u.uwep && welded(u.uwep)) return false;
    return true;
}

/**
 * C ref: ball.c ballrelease — drop carried iron ball (not welded).
 * @param {boolean} showmsg
 */
export async function ballrelease(showmsg) {
    const u = game.u || {};
    const uball = u.uball;
    if (!carried(uball) || welded(uball)) return;
    if (showmsg) await pline('Startled, you drop the iron ball.');
    if (u.uwep === uball) {
        const shine = setuwep(null);
        if (shine) await shine;
    }
    if (u.uswapwep === uball) setuswapwep(null);
    if (u.uquiver === uball) setuqwep(null);
    freeinv_ball(uball);
    await encumber_msg();
}

/**
 * C ref: ball.c ballfall `:42–67` — the hero falls to a new level with
 * the iron ball loose. The ball only lands on the hero's head when it
 * was *not* at the hero's spot and is not the wielded weapon, and even
 * then only `rn2(5)` of the time; note C evaluates that roll **before**
 * `ballrelease` so the RNG draw happens while the ball is still held.
 * A hard helmet caps the `rn1(7, 25)` damage at 3; a soft one only
 * earns a verbose "does not protect you" line.
 * Named omissions: none for this arm — `ballrelease` (D-0918),
 * `hard_helmet` (D-1778 export) and `losehp` are all live.
 */
export async function ballfall() {
    const u = game.u || {};
    const uball = u.uball;
    if (!uball || (carried(uball) && welded(uball))) return;

    const gets_hit = (((uball.ox | 0) !== (u.ux | 0)
                       || (uball.oy | 0) !== (u.uy | 0))
                      && (u.uwep === uball ? false : !!rn2(5)));
    await ballrelease(true);
    if (gets_hit) {
        let dmg = rn1(7, 25);

        await pline(`The iron ball falls on your ${body_part_latebound(HEAD)}.`);
        const uarmh = u.uarmh;
        if (uarmh) {
            if (hard_helmet(uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                dmg = 3;
            } else if (game.flags?.verbose) {
                await pline(`${Yname2(uarmh)} does not protect you.`);
            }
        }
        // C: losehp → maybe_wail (You_hear --More--)
        losehp(
            maybe_half_phys(dmg),
            'crunched in the head by an iron ball',
            NO_KILLER_PREFIX,
        );
        await finish_maybe_wail();
    }
}

/**
 * C ref: ball.c litter — rnd(capacity) may force-drop invent downstairs.
 * Named omission: hitfloor impact/shop/altar (place at hero feet).
 */
async function litter() {
    const u = game.u || {};
    const uball = u.uball;
    const capacity = weight_cap();
    const invent = game.invent || [];
    // Snapshot — freeinv mutates invent during iteration (C nextobj).
    const snapshot = invent.slice();
    for (const otmp of snapshot) {
        if (otmp === uball) continue;
        if (rnd(capacity) > (otmp.owt | 0)) continue;
        if (!canletgo_silent(otmp)) continue;
        const yn = xname(otmp);
        const plural = (otmp.quan | 0) !== 1;
        await pline(
            `You drop ${yn} and ${plural ? 'they' : 'it'} `
            + `${plural ? 'fall' : 'falls'} down the stairs with you.`,
        );
        // setnotworn subset
        if (u.uwep === otmp) {
            const shine = setuwep(null);
            if (shine) await shine;
        }
        if (u.uswapwep === otmp) setuswapwep(null);
        if (u.uquiver === otmp) setuqwep(null);
        for (const slot of [
            'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
            'uleft', 'uright', 'uamul', 'ublindf',
        ]) {
            if (u[slot] === otmp) u[slot] = null;
        }
        otmp.owornmask = 0;
        freeinv_ball(otmp);
        // hitfloor deferred — place at feet like ordinary dropz
        place_object(otmp, u.ux | 0, u.uy | 0);
        newsym(u.ux | 0, u.uy | 0);
    }
}

/**
 * C ref: ball.c drag_down — Punished stair-fall ball smash/drag RNG.
 * Soundeffect deferred (no RNG).
 */
export async function drag_down() {
    const u = game.u || {};
    const uball = u.uball;
    if (!uball) return;

    let dragchance = 3;
    // C: forward = carried(uball) && (uwep == uball || !uwep || !rn2(3));
    const forward = carried(uball)
        && (u.uwep === uball || !u.uwep || !rn2(3));

    if (carried(uball) && !welded(uball)) {
        await pline('You lose your grip on the iron ball.');
    }

    // C: cls() — clear stale prior-level map before damage plines
    await cls();

    if (forward) {
        if (rn2(6)) {
            await pline('The iron ball drags you downstairs!');
            // C: losehp → maybe_wail (You_hear --More--)
            losehp(
                maybe_half_phys(rnd(6)),
                'dragged downstairs by an iron ball',
                NO_KILLER_PREFIX,
            );
            await finish_maybe_wail();
            await litter();
        }
    } else {
        if (rn2(2)) {
            // Soundeffect(se_iron_ball_hits_you, 25) deferred
            await pline('The iron ball smacks into you!');
            // C: losehp → maybe_wail (You_hear --More--)
            losehp(
                maybe_half_phys(rnd(20)),
                'iron ball collision',
                KILLED_BY_AN,
            );
            await finish_maybe_wail();
            exercise(A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            await pline('The iron ball drags you downstairs!');
            losehp(
                maybe_half_phys(rnd(3)),
                'dragged downstairs by an iron ball',
                NO_KILLER_PREFIX,
            );
            await finish_maybe_wail();
            exercise(A_STR, false);
            await litter();
        }
    }
}

/** C youprop.h Blind — (H||E) && !B; no sticky u.Blind (D-0716). */
function Blind_bc() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    if (u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C ref: ball.c bc_order — stacking of uball/uchain when punished.
 */
function bc_order() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uball || !uchain) return BCPOS_DIFFER;
    if ((uchain.ox | 0) !== (uball.ox | 0)
        || (uchain.oy | 0) !== (uball.oy | 0)
        || carried(uball)
        || (u.uswallow | 0)) {
        return BCPOS_DIFFER;
    }
    for (let obj = objects_at(uball.ox | 0, uball.oy | 0); obj;
        obj = obj.nexthere) {
        if (obj === uchain) return BCPOS_CHAIN;
        if (obj === uball) return BCPOS_BALL;
    }
    return BCPOS_DIFFER;
}

/**
 * C: levl[x][y].glyph — hero_memory integer id after map_* / newsym.
 * Fallback disp_glyph is the gbuf stamp (D-1767) when memory has no id.
 */
function levl_glyph_at(x, y) {
    const loc = game.level?.at(x | 0, y | 0);
    if (!loc) return null;
    const mem = loc.remembered_glyph;
    if (!mem) return null; /* nothing remembered — C GLYPH_UNEXPLORED */
    const saved = { ...mem };
    // D-1767: memory without an id keeps the gbuf stamp as its id
    if (typeof saved.glyph !== 'number') saved.glyph = loc.disp_glyph | 0;
    return saved;
}

/**
 * C ref: ball.c `levl[x][y].glyph = u.bglyph` (`:166`, `:172`, `:449`,
 * `:452`, `:465`, `:472`, `:487`, `:494`) — the write side of the pair
 * above. Restoring a null snapshot clears map memory, which is what
 * assigning an unexplored glyph does in C.
 */
function set_levl_glyph(x, y, saved) {
    const loc = game.level?.at(x | 0, y | 0);
    if (!loc) return;
    loc.remembered_glyph = saved ? { ...saved } : null;
}

/**
 * C ref: ball.c set_bc `:379–424` — hero is about to go blind, or
 * already blind and just punished. Snapshot glyphs under ball&chain
 * so Blind move_bc / unplacebc_core can restore them.
 * @param {number} already_blind C int; 0 = still sighted peek
 */
export function set_bc(already_blind) {
    const u = game.u || (game.u = {});
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uball || !uchain) return;

    const ball_on_floor = !carried(uball);

    u.bc_order = bc_order();
    u.bc_felt = ball_on_floor ? (BC_BALL | BC_CHAIN) : BC_CHAIN;

    if (already_blind || (u.uswallow | 0)) {
        u.cglyph = u.bglyph = levl_glyph_at(u.ux | 0, u.uy | 0);
        return;
    }

    /*
     * Sighted: lift ball&chain, newsym the under-glyphs, put them back.
     * C uses remove_object (floor extract); JS obj_extract_self is that
     * floor arm (mkobj.c comment: remove_object ≡ obj_extract_self).
     */
    obj_extract_self(uchain);
    if (ball_on_floor) obj_extract_self(uball);

    newsym(uchain.ox | 0, uchain.oy | 0);
    u.cglyph = levl_glyph_at(uchain.ox | 0, uchain.oy | 0);

    if ((u.bc_order | 0) === BCPOS_DIFFER) {
        place_object(uchain, uchain.ox | 0, uchain.oy | 0);
        newsym(uchain.ox | 0, uchain.oy | 0);
        if (ball_on_floor) {
            newsym(uball.ox | 0, uball.oy | 0);
            u.bglyph = levl_glyph_at(uball.ox | 0, uball.oy | 0);
            place_object(uball, uball.ox | 0, uball.oy | 0);
            newsym(uball.ox | 0, uball.oy | 0);
        }
    } else {
        u.bglyph = u.cglyph;
        if ((u.bc_order | 0) === BCPOS_CHAIN) {
            place_object(uball, uball.ox | 0, uball.oy | 0);
            place_object(uchain, uchain.ox | 0, uchain.oy | 0);
        } else {
            place_object(uchain, uchain.ox | 0, uchain.oy | 0);
            place_object(uball, uball.ox | 0, uball.oy | 0);
        }
        newsym(uball.ox | 0, uball.oy | 0);
    }
}

function is_chain_rock(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    if (IS_DOOR(loc.typ)
        && ((loc.doormask || 0) & (D_CLOSED | D_LOCKED))) {
        return true;
    }
    return false;
}

/**
 * C ref: ball.c placebc_core `:120–144`.
 * Ball and chain are not on an object list. The chain may rust, then
 * the ball when it is not carried (`where == OBJ_INVENT`). The chain
 * is placed after the ball, so it sits on top (`BCPOS_CHAIN`); a carried
 * ball leaves `BCPOS_DIFFER`. Both under-glyphs are the cell's current
 * memory (this port stores remembered cells, not glyph ids — D-1769).
 * `bcrestriction` clears on this path, which is why lift_covet reaches
 * it directly instead of through `placebc`.
 * `flooreffects` is awaited: it can `pline`. The return is ignored, as in C.
 */
async function placebc_core() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uchain || !uball) {
        await impossible('Where are your ball and chain?');
        return;
    }

    /* chain might rust — re-read u.ux/u.uy after each await, as C does */
    await flooreffects(uchain, u.ux | 0, u.uy | 0, '');

    if ((uball.where | 0) === OBJ_INVENT) { /* the ball is carried */
        u.bc_order = BCPOS_DIFFER;
    } else {
        /* ball might rust -- already checked when carried */
        await flooreffects(uball, u.ux | 0, u.uy | 0, '');
        place_object(uball, u.ux | 0, u.uy | 0);
        u.bc_order = BCPOS_CHAIN;
    }

    place_object(uchain, u.ux | 0, u.uy | 0);

    const gx = u.ux | 0;
    const gy = u.uy | 0;
    u.bglyph = levl_glyph_at(gx, gy); /* pick up glyph */
    u.cglyph = levl_glyph_at(gx, gy);

    newsym(gx, gy);
    game.bcrestriction = 0;
}

/**
 * C ref: ball.c placebc `:191–209` (BREADCRUMBS off; NH_DEVEL_STATUS is
 * RELEASED, so the paniclog arm is compiled out).
 * Places uball (if not carried) and uchain under the hero via placebc_core.
 */
export async function placebc() {
    if (!check_restriction(0)) return;
    const uchain = game.u?.uchain;
    if (uchain && uchain.where != null && uchain.where !== OBJ_FREE) {
        await impossible('bc already placed?');
        return;
    }
    await placebc_core();
}

/**
 * C ref: ball.c unplacebc_core `:147–177` (staticfn).
 * Take the ball and chain off the floor. Swallowed: only the water
 * level still extracts them, so movebubbles() will not pick them up,
 * and the vision work is skipped. Otherwise a ball whose `where` is
 * not `OBJ_INVENT` (`carried`, obj.h:332) is extracted, a felt
 * under-glyph is put back, then `maybe_unhide_at` and `newsym`. The
 * chain follows. `u.bc_felt = 0` last: feel nothing.
 * Under-glyphs are remembered cells (`set_levl_glyph`, D-1769), not
 * C glyph ids. Coords are read after `obj_extract_self`; that call
 * does not clear `ox`/`oy`.
 * A missing ball or chain returns. C would dereference it.
 */
export async function unplacebc_core() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uball || !uchain) return;

    if (u.uswallow | 0) {
        /* C `:149–160` — water level still removes them from the floor
         * so movebubbles() disregards them. Ignore vision. */
        if (Is_waterlevel(u.uz)) {
            if ((uball.where | 0) !== OBJ_INVENT)
                obj_extract_self(uball);
            obj_extract_self(uchain);
        }
        /* ball&chain not unplaced while swallowed */
        return;
    }

    if ((uball.where | 0) !== OBJ_INVENT) {
        obj_extract_self(uball);
        if (Blind_bc() && ((u.bc_felt | 0) & BC_BALL)) /* drop glyph */
            set_levl_glyph(uball.ox | 0, uball.oy | 0, u.bglyph);
        await maybe_unhide_at(uball.ox | 0, uball.oy | 0);
        newsym(uball.ox | 0, uball.oy | 0);
    }
    obj_extract_self(uchain);
    if (Blind_bc() && ((u.bc_felt | 0) & BC_CHAIN)) /* drop glyph */
        set_levl_glyph(uchain.ox | 0, uchain.oy | 0, u.cglyph);
    await maybe_unhide_at(uchain.ox | 0, uchain.oy | 0);
    newsym(uchain.ox | 0, uchain.oy | 0);
    u.bc_felt = 0; /* feel nothing */
}

/**
 * C ref: ball.c unplacebc `:211–219` (BREADCRUMBS off; the paniclog
 * build is not this one). A live covet pin refuses. Otherwise the core.
 */
export async function unplacebc() {
    if (game.bcrestriction | 0) {
        await impossible('unplacebc denied, restriction in place');
        return;
    }
    await unplacebc_core();
}

/**
 * C ref: ball.c check_restriction `:181–189` (staticfn) — the covet pin
 * gate. `override_restriction` is `hack.h:110` (`enum bcargs`, -1), which
 * end.c:894 passes to force the lift; a live pin matches only itself.
 * State lives on `game.bcrestriction` (C `static int`, init 0).
 */
function check_restriction(pin) {
    if (!(game.bcrestriction | 0)) return true;
    if ((pin | 0) === -1) return true; /* C override_restriction */
    return (game.bcrestriction | 0) === (pin | 0);
}

/**
 * C ref: ball.c unplacebc_and_covet_placebc `:222–234` — pin a fresh
 * `rnd(400)` restriction, then unplacebc_core, so movebubbles() pickup
 * disregards the attached ball&chain (mkmaze.c:1563–1564). The core,
 * not `unplacebc`: the pin is already set, and `unplacebc` would refuse.
 * Async: the denied arm impossibles.
 * Named omissions: BREADCRUMBS `Unplacebc_and_covet_placebc`
 * (`ball.c:305–324`; config.h leaves BREADCRUMBS undefined).
 */
export async function unplacebc_and_covet_placebc() {
    let restriction = 0;
    if ((game.bcrestriction | 0)) {
        await impossible('unplacebc_and_covet_placebc denied, already restricted');
    } else {
        restriction = game.bcrestriction = rnd(400);
        await unplacebc_core();
    }
    return restriction;
}

/**
 * C ref: ball.c lift_covet_and_placebc `:236–254` — pin-gated
 * placebc_core: put the attached ball&chain back after movebubbles()
 * drift (mkmaze.c:1682–1683). Calls `placebc_core` directly: `placebc`
 * would refuse a live pin via `check_restriction(0)`. The
 * `bcrestriction = 0` tail is inside the core. Async: the already-placed
 * arm impossibles. Named omissions: release-build `paniclog` is compiled
 * out (`NH_DEVEL_STATUS == NH_STATUS_RELEASED`).
 */
export async function lift_covet_and_placebc(pin) {
    if (!check_restriction(pin | 0)) return;
    const u = game.u || {};
    const uchain = u.uchain;
    if (uchain && uchain.where != null && uchain.where !== OBJ_FREE) {
        await impossible('bc already placed?');
        return;
    }
    await placebc_core();
}

/**
 * C ref: ball.c move_bc `:436–556` — pick up (before) / put down
 * (after) ball&chain.
 *
 * Blind arm (C `:437–532`): the hero knows the ball&chain are attached,
 * so when they move the hero knows they left the remembered spot — but
 * feeling around can bring either back. C tracks that with `u.bc_felt`
 * plus the under-glyph snapshots `u.bglyph`/`u.cglyph`: on a move, drop
 * the saved glyph back at the old cell for whichever piece is felt,
 * clear that felt bit, pick up the glyph at the new cell, then `movobj`.
 * When both share a cell the top one keeps the pair's glyph, so the
 * BCPOS_BALL/BCPOS_CHAIN arms `map_object` the other piece instead of
 * restoring terrain. Nothing is felt after a both-moved step.
 * Only `!before` does this work; the sighted path lifts on `before`
 * and re-places on `!before`.
 * Named omissions: `maybe_unhide_at` inside `movobj` (sync callers).
 */
export function move_bc(before, control, ballx, bally, chainx, chainy) {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uball || !uchain) return;

    if (Blind_bc()) {
        if (!before) {
            if ((control & BC_CHAIN) && (control & BC_BALL)) {
                /* Both ball and chain moved.  If felt, drop glyph. */
                if ((u.bc_felt | 0) & BC_BALL) {
                    set_levl_glyph(uball.ox | 0, uball.oy | 0, u.bglyph);
                }
                if ((u.bc_felt | 0) & BC_CHAIN) {
                    set_levl_glyph(uchain.ox | 0, uchain.oy | 0, u.cglyph);
                }
                u.bc_felt = 0;

                /* Pick up glyph at new location. */
                u.bglyph = levl_glyph_at(ballx, bally);
                u.cglyph = levl_glyph_at(chainx, chainy);

                movobj(uball, ballx, bally);
                movobj(uchain, chainx, chainy);
            } else if (control & BC_BALL) {
                if ((u.bc_felt | 0) & BC_BALL) {
                    if ((u.bc_order | 0) === BCPOS_DIFFER) {
                        /* ball by itself */
                        set_levl_glyph(uball.ox | 0, uball.oy | 0, u.bglyph);
                    } else if ((u.bc_order | 0) === BCPOS_BALL) {
                        if ((u.bc_felt | 0) & BC_CHAIN) {
                            /* know chain is there */
                            map_object(uchain, 0);
                        } else {
                            set_levl_glyph(uball.ox | 0, uball.oy | 0,
                                           u.bglyph);
                        }
                    }
                    u.bc_felt = (u.bc_felt | 0) & ~BC_BALL; /* not felt */
                }

                /* Pick up glyph at new position. */
                u.bglyph = (ballx !== chainx || bally !== chainy)
                    ? levl_glyph_at(ballx, bally)
                    : u.cglyph;

                movobj(uball, ballx, bally);
            } else if (control & BC_CHAIN) {
                if ((u.bc_felt | 0) & BC_CHAIN) {
                    if ((u.bc_order | 0) === BCPOS_DIFFER) {
                        set_levl_glyph(uchain.ox | 0, uchain.oy | 0,
                                       u.cglyph);
                    } else if ((u.bc_order | 0) === BCPOS_CHAIN) {
                        if ((u.bc_felt | 0) & BC_BALL) {
                            map_object(uball, 0);
                        } else {
                            set_levl_glyph(uchain.ox | 0, uchain.oy | 0,
                                           u.cglyph);
                        }
                    }
                    u.bc_felt = (u.bc_felt | 0) & ~BC_CHAIN;
                }
                /* Pick up glyph at new position. */
                u.cglyph = (ballx !== chainx || bally !== chainy)
                    ? levl_glyph_at(chainx, chainy)
                    : u.bglyph;

                movobj(uchain, chainx, chainy);
            }

            u.bc_order = bc_order(); /* reset the order */
        }
        return;
    }

    // Sighted path — C ball.c move_bc else branch
    if (before) {
        if (!control) u.bc_order = bc_order();
        obj_extract_self(uchain);
        // maybe_unhide_at deferred
        newsym(uchain.ox | 0, uchain.oy | 0);
        if (!carried(uball)) {
            obj_extract_self(uball);
            newsym(uball.ox | 0, uball.oy | 0);
        }
    } else {
        const on_floor = !carried(uball);
        if ((control & BC_CHAIN)
            || (!control && (u.bc_order | 0) === BCPOS_CHAIN)) {
            if (on_floor) place_object(uball, ballx, bally);
            place_object(uchain, chainx, chainy); // chain on top
        } else {
            place_object(uchain, chainx, chainy);
            if (on_floor) place_object(uball, ballx, bally);
        }
        newsym(chainx, chainy);
        if (on_floor) newsym(ballx, bally);
    }
}

/**
 * C ref: ball.c drag_ball — compute ball/chain targets before hero move.
 * Returns { ok, bc_control, ballx, bally, chainx, chainy, cause_delay }.
 * ok=false → abort the move (encumber / jerked-back).
 */
export async function drag_ball(x, y, allow_drag = true) {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    const out = {
        ok: true,
        bc_control: 0,
        ballx: uball?.ox | 0,
        bally: uball?.oy | 0,
        chainx: uchain?.ox | 0,
        chainy: uchain?.oy | 0,
        cause_delay: false,
    };
    if (!uball || !uchain) return out;

    out.ballx = uball.ox | 0;
    out.bally = uball.oy | 0;
    out.chainx = uchain.ox | 0;
    out.chainy = uchain.oy | 0;

    // C: dist2(x,y,uchain) <= 2 → nothing moved
    if (dist2(x, y, uchain.ox | 0, uchain.oy | 0) <= 2) {
        move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
        return out;
    }

    // only need to move the chain?
    if (carried(uball)
        || distmin(x, y, uball.ox | 0, uball.oy | 0) <= 2) {
        const oldchainx = uchain.ox | 0;
        const oldchainy = uchain.oy | 0;
        out.bc_control = BC_CHAIN;
        move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);

        if (carried(uball)) {
            if (distmin(x, y, uchain.ox | 0, uchain.oy | 0) > 1) {
                out.chainx = u.ux | 0;
                out.chainy = u.uy | 0;
            }
            return out;
        }

        const chain_in_middle = (chx, chy) => (
            distmin(x, y, chx, chy) <= 1
            && distmin(chx, chy, uball.ox | 0, uball.oy | 0) <= 1
        );

        let already_in_rock = false;
        if (is_chain_rock(u.ux | 0, u.uy | 0)
            || is_chain_rock(out.chainx, out.chainy)
            || is_chain_rock(uball.ox | 0, uball.oy | 0)) {
            already_in_rock = true;
        }

        const skip_to_drag = () => {
            out.chainx = oldchainx;
            out.chainy = oldchainy;
            move_bc(0, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
            return 'drag';
        };

        let gotoDrag = false;
        switch (dist2(x, y, uball.ox | 0, uball.oy | 0)) {
        case 8:
            out.chainx = Math.trunc(((uball.ox | 0) + x) / 2);
            out.chainy = Math.trunc(((uball.oy | 0) + y) / 2);
            if (is_chain_rock(out.chainx, out.chainy) && !already_in_rock) {
                if (skip_to_drag() === 'drag') gotoDrag = true;
            }
            break;

        case 5: {
            let tempx, tempy, tempx2, tempy2;
            if (Math.abs(x - (uball.ox | 0)) === 1) {
                tempx = x;
                tempx2 = uball.ox | 0;
                tempy = tempy2 = Math.trunc(((uball.oy | 0) + y) / 2);
            } else {
                tempx = tempx2 = Math.trunc(((uball.ox | 0) + x) / 2);
                tempy = y;
                tempy2 = uball.oy | 0;
            }
            if (is_chain_rock(tempx, tempy) && !is_chain_rock(tempx2, tempy2)
                && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 5
                        && dist2(x, y, tempx, tempy) === 1) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 4
                        && dist2(x, y, tempx, tempy) === 2) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                }
                out.chainx = tempx2;
                out.chainy = tempy2;
            } else if (!is_chain_rock(tempx, tempy)
                && is_chain_rock(tempx2, tempy2) && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 5
                        && dist2(x, y, tempx2, tempy2) === 1) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 4
                        && dist2(x, y, tempx2, tempy2) === 2) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                }
                out.chainx = tempx;
                out.chainy = tempy;
            } else if (is_chain_rock(tempx, tempy)
                && is_chain_rock(tempx2, tempy2) && !already_in_rock) {
                if (skip_to_drag() === 'drag') gotoDrag = true;
            } else if (
                dist2(tempx, tempy, uchain.ox | 0, uchain.oy | 0)
                    < dist2(tempx2, tempy2, uchain.ox | 0, uchain.oy | 0)
                || ((dist2(tempx, tempy, uchain.ox | 0, uchain.oy | 0)
                    === dist2(tempx2, tempy2, uchain.ox | 0, uchain.oy | 0))
                    && rn2(2))
            ) {
                out.chainx = tempx;
                out.chainy = tempy;
            } else {
                out.chainx = tempx2;
                out.chainy = tempy2;
            }
            break;
        }

        case 4:
            if (chain_in_middle(uchain.ox | 0, uchain.oy | 0)) break;
            out.chainx = Math.trunc((x + (uball.ox | 0)) / 2);
            out.chainy = Math.trunc((y + (uball.oy | 0)) / 2);
            if (is_chain_rock(out.chainx, out.chainy) && !already_in_rock) {
                if (skip_to_drag() === 'drag') gotoDrag = true;
            }
            break;

        case 2:
            if (dist2(x, y, uball.ox | 0, uball.oy | 0) === 2
                && dist2(x, y, uchain.ox | 0, uchain.oy | 0) === 4) {
                if ((uchain.oy | 0) === y) out.chainx = uball.ox | 0;
                else out.chainy = uball.oy | 0;
                if (is_chain_rock(out.chainx, out.chainy) && !already_in_rock) {
                    if (skip_to_drag() === 'drag') gotoDrag = true;
                }
                break;
            }
            // FALLTHROUGH
        case 1:
        case 0:
            if (chain_in_middle(uchain.ox | 0, uchain.oy | 0)) break;
            if (chain_in_middle(u.ux | 0, u.uy | 0)) {
                out.chainx = u.ux | 0;
                out.chainy = u.uy | 0;
                break;
            }
            out.chainx = x;
            out.chainy = y;
            break;

        default:
            break;
        }

        if (!gotoDrag) return out;
        // fall through to drag:
    }

    // drag: path — pull ball+chain
    if (near_capacity() > SLT_ENCUMBER
        && dist2(x, y, u.ux | 0, u.uy | 0) <= 2) {
        const invent = game.invent || [];
        await pline(
            `You cannot ${invent.length ? 'carry all that and also ' : ''}drag the heavy iron ball.`,
        );
        nomul(0);
        out.ok = false;
        return out;
    }

    {
        const cox = uchain.ox | 0;
        const coy = uchain.oy | 0;
        const box = uball.ox | 0;
        const boy = uball.oy | 0;
        const cloc = game.level?.at(cox, coy);
        const t = t_at(cox, coy);
        const pool_jerk = is_pool(cox, coy)
            && (cloc?.typ === POOL
                || !is_pool(box, boy)
                || game.level?.at(box, boy)?.typ === POOL);
        const pit_jerk = t && (is_pit(t.ttyp) || is_hole(t.ttyp));

        if (pool_jerk || pit_jerk) {
            const Levitation = !!(u.Levitation || u.Lev);
            if (Levitation) {
                await You_feel('a tug from the iron ball.');
                if (t) t.tseen = 1;
            } else {
                await pline('You are jerked back by the iron ball!');
                const victim = mon_at(cox, coy);
                if (victim) {
                    // C: dieroll = rnd(20); hmon/miss body deferred — burn roll
                    void rnd(20);
                }
                if (!mon_at(cox, coy)) {
                    u.ux = cox;
                    u.uy = coy;
                    newsym(u.ux0 | 0, u.uy0 | 0);
                }
                nomul(0);
                out.bc_control = BC_BALL;
                move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
                out.ballx = cox;
                out.bally = coy;
                move_bc(0, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
                // spoteffects caller-side deferred for abort path
                out.ok = false;
                return out;
            }
        }
    }

    out.bc_control = BC_BALL | BC_CHAIN;
    move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);

    if (dist2(x, y, u.ux | 0, u.uy | 0) > 2) {
        out.ballx = out.chainx = x;
        out.bally = out.chainy = y;
    } else {
        let newchainx = u.ux | 0;
        let newchainy = u.uy | 0;
        if (dist2(x, y, uchain.ox | 0, uchain.oy | 0) === 4
            && !is_chain_rock(newchainx, newchainy)) {
            newchainx = Math.trunc((x + (uchain.ox | 0)) / 2);
            newchainy = Math.trunc((y + (uchain.oy | 0)) / 2);
            if (is_chain_rock(newchainx, newchainy)) {
                newchainx = u.ux | 0;
                newchainy = u.uy | 0;
            }
        }
        out.ballx = uchain.ox | 0;
        out.bally = uchain.oy | 0;
        out.chainx = newchainx;
        out.chainy = newchainy;
    }
    out.cause_delay = true;
    return out;
}

/**
 * C ref: ball.c drop_ball `:881–961` — the punished hero drops or throws
 * the iron ball (callers do.c:834 dropz at the hero's feet, dothrow.c:1840
 * throw land at bhitpos; the ball is already placed by the caller).
 * Should not be called while swallowed (no uswallow arm in C).
 *
 * C order, preserved arm-for-arm: Blind snapshot first (`bc_order` then
 * `bglyph` from the felt chain glyph or the landing glyph); when the
 * landing differs from the hero spot, a live utrap (anything but INFLOOR
 * / BURIEDBALL) yanks the hero out with the per-type pline (pit / web +
 * web-destroy sound + deltrap / lava via hliquid / beartrap `rn2(3)`
 * side + wounded legs + leg damage unless steed-riding) in C order,
 * then `reset_utrap(TRUE)` + `fill_pit` at the old spot; hero slides to
 * the landing only without Levitation, monster, or trap on a pool/pit/
 * hole landing, else stops short by (dx,dy); vision recalc; Blind
 * chain-glyph drop / felt clear / new-spot pickup; `movobj` chain;
 * Blind `bc_order` refresh; `newsym` the old spot; `spoteffects` when
 * the hero moved. `Your`/`pline_The` have no JS export (local clones
 * elsewhere), so both lines go through `pline` with identical text.
 * @param {number} x landing column (bhitpos or hero spot)
 * @param {number} y landing row
 */
export async function drop_ball(x, y) {
    const u = game.u || {};
    const uchain = u.uchain;
    if (!uchain) return;
    x |= 0;
    y |= 0;

    if (Blind_bc()) {
        /* get the order, pick up glyph */
        u.bc_order = bc_order();
        u.bglyph = (u.bc_order | 0) ? u.cglyph : levl_glyph_at(x, y);
    }

    if (x !== (u.ux | 0) || y !== (u.uy | 0)) {
        const pullmsg = 'The ball pulls you out of the ';
        if ((u.utrap | 0)
            && (u.utraptype | 0) !== TT_INFLOOR
            && (u.utraptype | 0) !== TT_BURIEDBALL) {
            switch (u.utraptype | 0) {
            case TT_PIT:
                await pline(`${pullmsg}pit!`);
                break;
            case TT_WEB:
                await pline(`${pullmsg}web!`);
                Soundeffect(se_destroy_web, 30);
                await pline('The web is destroyed!');
                deltrap(t_at(u.ux | 0, u.uy | 0));
                break;
            case TT_LAVA:
                await pline(`${pullmsg}${hliquid('lava')}!`);
                break;
            case TT_BEARTRAP: {
                const side = rn2(3) ? LEFT_SIDE : RIGHT_SIDE;
                await pline(`${pullmsg}bear trap!`);
                await set_wounded_legs(side, rn1(1000, 500));
                if (!u.usteed) {
                    await pline(`Your ${(side === LEFT_SIDE) ? 'left' : 'right'} ${body_part(LEG)} is severely damaged.`);
                    // C: losehp → maybe_wail (You_hear --More--)
                    losehp(
                        maybe_half_phys(2),
                        'leg damage from being pulled out of a bear trap',
                        KILLED_BY,
                    );
                    await finish_maybe_wail();
                }
                break;
            }
            }
            reset_utrap(true);
            fill_pit(u.ux | 0, u.uy | 0);
        }

        u.ux0 = u.ux | 0;
        u.uy0 = u.uy | 0;
        const Levitation = !!(u.Levitation || u.Lev);
        let t = null;
        if (!Levitation && !mon_at(x, y) && !(u.utrap | 0)
            && (is_pool(x, y)
                || ((t = t_at(x, y))
                    && (is_pit(t.ttyp) || is_hole(t.ttyp))))) {
            u.ux = x;
            u.uy = y;
        } else {
            u.ux = x - (u.dx | 0);
            u.uy = y - (u.dy | 0);
        }
        game.vision_full_recalc = 1; /* hero has moved, recalc vision later */

        if (Blind_bc()) {
            /* drop glyph under the chain */
            if ((u.bc_felt | 0) & BC_CHAIN)
                set_levl_glyph(uchain.ox | 0, uchain.oy | 0, u.cglyph);
            u.bc_felt = 0; /* feel nothing */
            /* pick up new glyph */
            u.cglyph = (u.bc_order | 0)
                ? u.bglyph
                : levl_glyph_at(u.ux | 0, u.uy | 0);
        }
        movobj(uchain, u.ux | 0, u.uy | 0); /* has a newsym */
        if (Blind_bc()) {
            u.bc_order = bc_order();
        }
        newsym(u.ux0 | 0, u.uy0 | 0); /* clean up old position */
        if ((u.ux0 | 0) !== (u.ux | 0) || (u.uy0 | 0) !== (u.uy | 0)) {
            await spoteffects(true);
        }
    }
}

/**
 * C ref: ball.c bc_sanity_check `:1034–1102` — Punished/ball/chain
 * consistency walk for wizard-mode `sanity_check` (`wizcmds.c:1476`).
 * C order throughout. `Punished` is `youprop.h:77` `(uball != 0)`, not a
 * sticky flag (do.js goto_level / trap.js D-1786 convention); the `!uball`
 * disjunct below is dead in C too and kept verbatim. `freeball`/`freechain`
 * stay 0/1 ints so the `^` XOR arms match C. `where` is read off the
 * objects like C (not `carried()`). `%08lx` is pre-formatted: live
 * `impossible()` expands `%s`/`%d` only (trap.js erode_obj precedent).
 * No RNG of its own. Async: `impossible` + `safe_typename` are async.
 */
export async function bc_sanity_check() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    const punished = !!uball; // C youprop.h:77 Punished ≡ (uball != 0)

    if (punished && (!uball || !uchain)) {
        await impossible(
            'Punished without %s%s%s?',
            !uball ? 'iron ball' : '',
            (!uball && !uchain) ? ' and ' : '',
            !uchain ? 'attached chain' : '',
        );
    } else if (!punished && (uball || uchain)) {
        await impossible(
            'Attached %s%s%s without being Punished?',
            uchain ? 'chain' : '',
            (uchain && uball) ? ' and ' : '',
            uball ? 'iron ball' : '',
        );
    }
    /* C: ball is free when swallowed, when changing levels or during air
       bubble management on Plane of Water (both of which start and end in
       between sanity checking cycles, so shouldn't be relevant);
       other times? */
    const freechain = (!uchain || uchain.where === OBJ_FREE) ? 1 : 0;
    const freeball = (!uball || uball.where === OBJ_FREE
        /* lie to simplify the testing logic */
        || (freechain && uball.where === OBJ_INVENT)) ? 1 : 0;
    if (uball && (uball.otyp !== HEAVY_IRON_BALL
            || (uball.where !== OBJ_FLOOR
                && uball.where !== OBJ_INVENT
                && uball.where !== OBJ_FREE)
            || (freeball ^ freechain)
            || ((uball.owornmask | 0) & W_BALL) === 0
            || ((uball.owornmask | 0) & ~(W_BALL | W_WEAPONS)) !== 0)) {
        const otyp = uball.otyp | 0;
        const onam = await safe_typename(otyp);
        const hex = ((uball.owornmask | 0) >>> 0).toString(16).padStart(8, '0');
        await impossible(
            'uball: type %d (%s), where %d, wornmask=0x%s',
            otyp, onam, uball.where | 0, hex,
        );
    }
    /* similar check to ball except can't be in inventory */
    if (uchain && (uchain.otyp !== IRON_CHAIN
            || (uchain.where !== OBJ_FLOOR
                && uchain.where !== OBJ_FREE)
            || (freechain ^ freeball)
            /* [could simplify this to owornmask != W_CHAIN] */
            || ((uchain.owornmask | 0) & W_CHAIN) === 0
            || ((uchain.owornmask | 0) & ~W_CHAIN) !== 0)) {
        const otyp = uchain.otyp | 0;
        const onam = await safe_typename(otyp);
        const hex = ((uchain.owornmask | 0) >>> 0).toString(16).padStart(8, '0');
        await impossible(
            'uchain: type %d (%s), where %d, wornmask=0x%s',
            otyp, onam, uchain.where | 0, hex,
        );
    }
    if (uball && uchain && !(freeball && freechain)) {
        /* non-free chain should be under or next to the hero;
           non-free ball should be on or next to the chain or else carried */
        const cx = uchain.ox | 0, cy = uchain.oy | 0;
        const cdx = Math.abs(cx - (u.ux | 0));
        const cdy = Math.abs(cy - (u.uy | 0));
        let bx, by;
        if (uball.where === OBJ_INVENT) { // carried(uball)
            bx = u.ux | 0; by = u.uy | 0; // get_obj_location()
        } else {
            bx = uball.ox | 0; by = uball.oy | 0;
        }
        const bdx = Math.abs(bx - cx);
        const bdy = Math.abs(by - cy);
        if (cdx > 1 || cdy > 1 || bdx > 1 || bdy > 1)
            await impossible(
                'b&c distance: you@<%d,%d>, chain@<%d,%d>, ball@<%d,%d>',
                u.ux | 0, u.uy | 0, cx, cy, bx, by,
            );
    }
    /* [check bc_order too?] */
}
