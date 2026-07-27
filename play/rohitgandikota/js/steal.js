// steal.js — monsters taking and dropping objects.
// C ref: src/steal.c

import { game } from './gstate.js';
import { donning, cancel_don, Armor_off, Cloak_off, Boots_off,
         Gloves_off, Helmet_off, Shield_off, Shirt_off } from './do_wear.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';

function note_unported_steal(what) {
    (game.unported ||= new Set()).add(what);
}
import { rn1 } from './rng.js';
import { LARGEST_INT, W_ARMOR, W_AMUL, W_RING, W_TOOL, W_WEAPONS, W_BALL, W_CHAIN } from './const.js';

/* js/dog.js owns droppables() and imports this module, so it hands the
   function over instead of being imported back -- dog.js is one of the
   modules that re-enters during initialisation. */
let droppables_fn = null;
export function steal_wire_droppables(fn) { droppables_fn = fn; }
import { extract_from_minvent, setnotworn, setworn } from './worn.js';
import { place_object } from './mkobj.js';
import { stackobj } from './invent.js';
import { newsym } from './display.js';
import { cansee } from './vision.js';
import { DEADMONSTER } from './monst.js';

// src/steal.c mdrop_obj() — a monster drops one carried object.
//
// BOTH HALVES MUST HAPPEN: extract_from_minvent takes it out of the pack and
// place_object puts it on the floor. Doing only one is the mpickstuff bug in
// reverse, where an object left the floor and reached nobody.
//
// flooreffects() is unported. C skips the placement when it returns TRUE --
// the object burned up in lava, sank into water, fell through a trapdoor. On
// ordinary floor it returns FALSE, so treating it as FALSE is right for every
// square that is not liquid or a hole, and the exceptions record.
export function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx, omy = mon.my;
    const unwornmask = obj.owornmask;

    /* C calls distant_name() here for its side effects, BEFORE the extract */
    (game.unported ||= new Set()).add('steal:mdrop_obj:distant_name');

    extract_from_minvent(mon, obj, false, true);

    if (verbosely && cansee(omx, omy))
        (game.unported ||= new Set()).add('steal:mdrop_obj:drops_message');

    /* if (!flooreffects(obj, omx, omy, "fall")) */
    (game.unported ||= new Set()).add('steal:mdrop_obj:flooreffects');
    place_object(obj, omx, omy);
    stackobj(obj);

    if (!DEADMONSTER(mon) && unwornmask)
        (game.unported ||= new Set()).add('steal:mdrop_obj:update_extrinsics');
}

// src/steal.c:875 relobj() — a monster releases its inventory onto the map.
//
// Called from m_detach's due_to_death arm, so this is what makes a killed
// monster leave its belongings behind instead of taking them with it.
//
// is_pet TRUE keeps wielded and worn gear (a pet drops only droppables);
// the death path passes FALSE and walks the whole pack.
export function relobj(mtmp, show, is_pet) {
    const omx = mtmp.mx, omy = mtmp.my;

    if (mtmp.isgd) {
        /* a vault guard's gold vanishes rather than dropping */
        (game.unported ||= new Set()).add('steal:relobj:vault_gold');
    }

    /* is_pet TRUE keeps wielded and worn gear: C loops on droppables()
       rather than the whole pack. droppables lives in js/dog.js, which
       imports this module, so it is handed over rather than imported back. */
    const pick = is_pet
        ? () => (droppables_fn ? droppables_fn(mtmp) : null)
        : () => ((mtmp.minvent && mtmp.minvent.length) ? mtmp.minvent[0] : null);

    for (let otmp = pick(); otmp; otmp = pick()) {
        mdrop_obj(mtmp, otmp, is_pet && !!game.flags?.verbose);
        /* guard against an extract that did not remove it, which would spin
           here forever */
        if (mtmp.minvent && mtmp.minvent[0] === otmp) {
            mtmp.minvent.shift();
            (game.unported ||= new Set()).add('steal:relobj:extract_failed');
            break;
        }
    }

    if (show && cansee(omx, omy))
        newsym(omx, omy);
}

// src/steal.c:14 somegold() — a proportional subset of a gold pile.
//
// DRAWS, exactly once, and the band it picks decides the argument to rn1 --
// so getting the boundaries wrong changes the stream, not just the amount.
// The bands are < 50, < 100, < 500, < 1000, < 5000, < 10000, else, and each
// keeps a floor of the previous band's size: rn1(igold - floor + 1, floor).
//
// Under 50 gold there is NO DRAW AT ALL -- the whole pile is taken. That
// early arm is the one to be careful with, since a stray rn1 there would
// desync every later call.
export function somegold(lmoney) {
    let igold = (lmoney >= LARGEST_INT) ? LARGEST_INT : lmoney | 0;

    if (igold < 50)
        ;                                   /* all gold, no draw */
    else if (igold < 100)
        igold = rn1(igold - 25 + 1, 25);
    else if (igold < 500)
        igold = rn1(igold - 50 + 1, 50);
    else if (igold < 1000)
        igold = rn1(igold - 100 + 1, 100);
    else if (igold < 5000)
        igold = rn1(igold - 500 + 1, 500);
    else if (igold < 10000)
        igold = rn1(igold - 1000 + 1, 1000);
    else
        igold = rn1(igold - 5000 + 1, 5000);

    return igold;
}

// src/steal.c unstolenarm() — an afternmv callback: the hero finished taking
// off armour that a thief was going to steal, but the thief died first.
//
// The comment on the loop is the part to preserve: the object is found
// BEFORE stealoid is cleared, and it "has already become not-worn and is
// still in hero's inventory" -- so this searches invent, not the worn slots.
export function unstolenarm() {
    /* find the object before clearing stealoid */
    const obj = (game.invent || []).find((o) => o.o_id === game.stealoid);

    game.stealoid = 0;
    if (obj) {
        /* You("finish taking off your %s.", armor_simple_name(obj)) */
        note_unported_steal('unstolenarm:finish_msg');
    }
    return 0;
}

// src/steal.c:120 thiefdead() — the monster stealing from the hero has died.
//
// Both halves are identity tests against ga.afternmv, the same shape as
// donning(), so stealarm must exist before this is safe. It does not yet, so
// the swap is RECORDED rather than compared against undefined -- an
// undefined comparand would make this fire on every death while the hero
// happened to be mid-occupation.
export function thiefdead() {
    /* hero may be busy taking off armour, which takes multiple turns */
    game.stealmid = 0;

    /* C: if (ga.afternmv == stealarm) { ga.afternmv = unstolenarm;
                                         gn.nomovemsg = 0; }
       stealarm is not ported, so this cannot be tested faithfully yet. */
    note_unported_steal('thiefdead:stealarm_swap');
}

// src/steal.c:213 remove_worn_item() — take a worn item off, whatever slot.
//
// unchain_ball: whether to unpunish or just unwield.
/* async: the <X>_off handlers are, because toggle_stealth() and the message
   helpers are. */
export async function remove_worn_item(obj, unchain_ball) {
    let oldinuse;

    if (donning(obj))
        cancel_don();
    if (!obj.owornmask)
        return;

    /*
     * Losing worn gear might drop hero into water or lava or onto a
     * location-changing trap or take away the ability to breathe in water.
     * Marking it 'in_use' prevents emergency_disrobe() from dropping it
     * and lava_effects() from destroying it; other cases impacting object
     * location (or destruction) might still have issues.
     */
    oldinuse = obj.in_use;
    obj.in_use = 1;

    if (obj.owornmask & W_ARMOR) {
        if (obj === game.u.uskin) {
            /* C impossible()s then calls skinback(TRUE); skinback is not
               ported (it needs arti_light_radius/maybe_adjust_light). */
            note_unported_steal('remove_worn_item:skinback');
        }
        if (obj === game.u.uarm)
            await Armor_off();
        else if (obj === game.u.uarmc)
            await Cloak_off();
        else if (obj === game.u.uarmf)
            await Boots_off();
        else if (obj === game.u.uarmg)
            await Gloves_off();
        else if (obj === game.u.uarmh)
            await Helmet_off();
        else if (obj === game.u.uarms)
            await Shield_off();
        else if (obj === game.u.uarmu)
            await Shirt_off();
        /* catchall -- should never happen */
        else
            setworn(null, obj.owornmask & W_ARMOR);
    } else if (obj.owornmask & W_AMUL) {
        note_unported_steal('remove_worn_item:Amulet_off');
    } else if (obj.owornmask & W_RING) {
        note_unported_steal('remove_worn_item:Ring_gone');
    } else if (obj.owornmask & W_TOOL) {
        note_unported_steal('remove_worn_item:Blindf_off');
    } else if (obj.owornmask & W_WEAPONS) {
        if (obj === game.u.uwep)
            uwepgone();
        if (obj === game.u.uswapwep)
            uswapwepgone();
        if (obj === game.u.uquiver)
            uqwepgone();
    }

    if (obj.owornmask & (W_BALL | W_CHAIN)) {
        if (unchain_ball)
            note_unported_steal('remove_worn_item:unpunish');
    } else if (obj.owornmask) {
        /* catchall */
        setnotworn(obj);
    }

    /* the OBJ_DELETED arm is a debugpline1() only, no game effect */
    obj.in_use = oldinuse;
}
