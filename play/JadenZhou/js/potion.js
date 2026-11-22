// potion.js -- quaffing potions.
// C ref: potion.c
//
// Ported so far: the #quaff command up to choosing the potion
// (drink_ok() and dodrink()'s getobj()); the intrinsic timeout setters
// (set_itimeout(), incr_itimeout(), make_confused(), make_stunned(),
// make_vomiting(), make_blinded(), make_deaf()); drinking from fountains
// and sinks and the potion effects are not ported yet.

import { game } from './gstate.js';
import { pline } from './display.js';
import { getobj } from './invent.js';
import { can_reach_floor } from './engrave.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_NONINVENT,
         GETOBJ_NOFLAGS, ECMD_OK, ECMD_CANCEL, STRANGLED, IS_FOUNTAIN,
         IS_SINK, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE_INACCESS, GETOBJ_PROMPT,
         GLIB } from './const.js';
import { inaccessible_equipment } from './do_wear.js';
import { is_pool } from './makemon.js';
import { POTION_CLASS, COIN_CLASS } from './objects.js';
import { TIMEOUT, CONFUSION, STUNNED, VOMITING, BLINDED, DEAF, HALLUC,
         HALLUC_RES, FROMOUTSIDE, FAINTED } from './const.js';
import { toggle_blindness } from './do_wear.js';
import { haseyes } from './mondata.js';

/* C ref: youprop.h -- the property macros used here */
function uprop(p) { return game.u.uprops[p]; }
function Hallucination() {
    return !!(uprop(HALLUC).intrinsic
              && !(uprop(HALLUC_RES).intrinsic || uprop(HALLUC_RES).extrinsic));
}
function Blindfolded() { return uprop(BLINDED).extrinsic; }
function Blind() {
    return !!((uprop(BLINDED).intrinsic || Blindfolded())
              && !uprop(BLINDED).blocked);
}
function PermaBlind() { return (uprop(BLINDED).intrinsic & FROMOUTSIDE) !== 0; }
function Deaf() {
    return !!(uprop(DEAF).intrinsic || uprop(DEAF).extrinsic
              || game.u.uroleplay?.deaf);
}
/* C ref: hack.c unconscious() */
function unconscious() {
    const g = game;
    if (g.multi >= 0)
        return false;
    return !!(g.u.usleep
              || (g.nomovemsg
                  && (g.nomovemsg.startsWith("You awake")
                      || g.nomovemsg.startsWith("You regain con")
                      || g.nomovemsg.startsWith("You are consci"))));
}
/* C ref: youprop.h Unaware -- (multi < 0 && (unconscious() || is_fainted())) */
function Unaware() {
    return game.multi < 0 && (unconscious() || game.u.uhs === FAINTED /* is_fainted() */);
}

// C ref: potion.c itimeout()
/* force `val' to be within valid range for intrinsic timeout value */
function itimeout(val) {
    if (val >= TIMEOUT)
        val = TIMEOUT;
    else if (val < 1)
        val = 0;
    return val;
}

// C ref: potion.c itimeout_incr()
/* increment `old' by `incr' and force result to be valid intrinsic timeout */
function itimeout_incr(old, incr) {
    return itimeout((old & TIMEOUT) + incr);
}

// C ref: potion.c set_itimeout() -- set the timeout field of intrinsic
// `which' (C passes &u.uprops[p].intrinsic; JS passes the property index)
export function set_itimeout(which, val) {
    const p = uprop(which);
    p.intrinsic &= ~TIMEOUT;
    p.intrinsic |= itimeout(val);
}

// C ref: potion.c incr_itimeout() -- increment the timeout field of
// intrinsic `which' (a property index)
export function incr_itimeout(which, incr) {
    set_itimeout(which, itimeout_incr(uprop(which).intrinsic, incr));
}

// C ref: potion.c make_confused()
export async function make_confused(xtime, talk) {
    const old = uprop(CONFUSION).intrinsic;

    if (Unaware())
        talk = false;

    if (!xtime && old) {
        if (talk)
            await pline(`You feel less ${Hallucination() ? "trippy" : "confused"} now.`);
    }
    if ((xtime && !old) || (!xtime && old))
        game.disp_botl = true;

    set_itimeout(CONFUSION, xtime);
}

// C ref: potion.c make_stunned()
export async function make_stunned(xtime, talk) {
    const old = uprop(STUNNED).intrinsic;

    if (Unaware())
        talk = false;

    if (!xtime && old) {
        if (talk)
            await pline(`You feel ${Hallucination() ? "less wobbly" : "a bit steadier"} now.`);
    }
    if (xtime && !old) {
        if (talk)
            throw new Error('make_stunned(): stagger message not ported yet');
    }
    if ((!xtime && old) || (xtime && !old))
        game.disp_botl = true;

    set_itimeout(STUNNED, xtime);
}

// C ref: potion.c make_vomiting()
export async function make_vomiting(xtime, talk) {
    const old = uprop(VOMITING).intrinsic;

    if (Unaware())
        talk = false;

    set_itimeout(VOMITING, xtime);
    game.disp_botl = true;
    if (!xtime && old)
        if (talk)
            await pline("You feel much less nauseated now.");
}

// C ref: potion.c make_blinded()
export async function make_blinded(xtime, talk) {
    const old = uprop(BLINDED).intrinsic & TIMEOUT; /* BlindedTimeout */

    /* we probe ahead in case the Eyes of the Overworld
       are or will be overriding blindness */
    const u_could_see = !Blind();
    set_itimeout(BLINDED, xtime ? 1 : 0);
    const can_see_now = !Blind();
    set_itimeout(BLINDED, old);

    if (Unaware())
        talk = false;

    if (can_see_now && !u_could_see) { /* regaining sight */
        if (talk) {
            if (Hallucination())
                await pline("Far out!  Everything is all cosmic again!");
            else
                await pline("You can see again.");
        }
    } else if (old && !xtime) {
        /* clearing temporary blindness without toggling blindness */
        if (talk) {
            if (!haseyes(game.youmonst.data) || PermaBlind())
                throw new Error('make_blinded(): strange_feeling() not ported yet');
            else
                throw new Error('make_blinded(): blindfolded/Eyes of the Overworld message not ported yet');
        }
    }

    if (u_could_see && !can_see_now) { /* losing sight */
        if (talk) {
            if (Hallucination())
                await pline("Oh, bummer!  Everything is dark!  Help!");
            else
                await pline("A cloud of darkness falls upon you.");
        }
        /* Before the hero goes blind, set the ball&chain variables. */
        if (game.uball)
            throw new Error('make_blinded(): set_bc() not ported yet');
    } else if (!old && xtime) {
        /* setting temporary blindness without toggling blindness */
        if (talk) {
            if (!haseyes(game.youmonst.data) || PermaBlind())
                throw new Error('make_blinded(): strange_feeling() not ported yet');
            else
                throw new Error('make_blinded(): blindfolded/Eyes of the Overworld message not ported yet');
        }
    }

    set_itimeout(BLINDED, xtime);

    if (u_could_see !== can_see_now) { /* one or the other but not both */
        toggle_blindness();
    }
}

// C ref: potion.c make_deaf()
export async function make_deaf(xtime, talk) {
    const old = uprop(DEAF).intrinsic;

    if (Unaware())
        talk = false;

    set_itimeout(DEAF, xtime);
    if ((xtime !== 0) !== (old !== 0)) {
        game.disp_botl = true;
        if (talk)
            await pline(old && !Deaf() ? "You can hear again."
                                       : "You are unable to hear anything.");
    }
}

let drink_ok_extra = 0;

/* C ref: you.h Strangled, Underwater */
function Strangled() {
    const p = game.u?.uprops?.[STRANGLED];
    return !!(p?.intrinsic || p?.extrinsic);
}

// C ref: potion.c drink_ok() -- getobj callback for object to drink from
function drink_ok(obj) {
    /* getobj()'s callback to test whether hands/self is a valid "item" to
       pick is used here to communicate the fact that player has already
       passed up an opportunity to perform the action (drink or dip) on a
       non-inventory dungeon feature */
    if (!obj)
        return drink_ok_extra ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (obj.oclass === POTION_CLASS)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}

// C ref: potion.c dodrink() -- the #quaff command
export async function dodrink() {
    if (Strangled()) {
        await pline("If you can't breathe air, how can you drink liquid?");
        return ECMD_OK;
    }

    drink_ok_extra = 0;
    /* preceding 'q'/#quaff with 'm' skips the possibility of drinking
       from fountains, sinks, and surrounding water plus the prompting
       which those entail */
    if (!game.iflags?.menu_requested) {
        const typ = game.level.at(game.u.ux, game.u.uy).typ;
        /* Is there a fountain to drink from here? */
        if (IS_FOUNTAIN(typ) && can_reach_floor(false))
            throw new Error('dodrink(): "Drink from the fountain?" not ported yet');
        /* Or a kitchen sink? */
        if (IS_SINK(typ) && can_reach_floor(false))
            throw new Error('dodrink(): "Drink from the sink?" not ported yet');
        /* Or are you surrounded by water? */
        if (game.u.uinwater && !game.u.uswallow)
            throw new Error('dodrink(): drinking the water around you not ported yet');
    }

    const otmp = await getobj("drink", drink_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;
    throw new Error('dodrink(): drinking a potion not ported yet');
}

// C ref: potion.c dip_ok() -- getobj callback for object to be dipped
function dip_ok(obj) {
    if (!obj)
        return GETOBJ_DOWNPLAY;

    /* dipping gold isn't currently implemented */
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_EXCLUDE;

    if (inaccessible_equipment(obj, null, false))
        return GETOBJ_EXCLUDE_INACCESS;

    return GETOBJ_SUGGEST;
}

// C ref: potion.c dip_hands_ok() -- getobj callback for object to be
// dipped when hero has slippery hands
function dip_hands_ok(obj) {
    const glib = game.u.uprops[GLIB] || {};
    if (!obj && ((glib.intrinsic || glib.extrinsic) && can_reach_floor(false))) /* Glib */
        return GETOBJ_SUGGEST;

    return dip_ok(obj);
}

// C ref: potion.c dodip() -- #dip command (M-d): get item to dip, then get
// potion to dip it into; precede with 'm' to bypass fountain, pool, or
// sink at hero's spot; only the first prompt is ported
export async function dodip() {
    const u = game.u;
    const here = game.level.at(u.ux, u.uy).typ;
    const at_pool = is_pool(u.ux, u.uy), at_fountain = IS_FOUNTAIN(here),
        at_sink = IS_SINK(here),
        at_here = (!game.iflags.menu_requested
                   && (at_pool || at_fountain || at_sink));

    const obj = await getobj("dip", at_here ? dip_hands_ok : dip_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;
    if (inaccessible_equipment(obj, "dip", false))
        return ECMD_OK;
    throw new Error('dodip(): dipping (the potion/fountain/pool/sink prompts) not ported yet');
}
