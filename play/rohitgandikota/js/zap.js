// zap.js — wands, spells and the rays they throw.
// C ref: src/zap.c
//
// Only obj_resists() is here so far. It is the first thing needed from this
// file because meatmetal() calls it before eating anything, which puts its
// rn2(100) into the stream ahead of the next monster's turn.

import { game } from './gstate.js';
import { isok } from './hacklib.js';
import { m_at, t_at } from './mon.js';
import { cansee } from './vision.js';
import { display_cmap_at, map_invisible, newsym, unmap_invisible } from './display.js';
import { closed_door } from './cmd.js';

import { STONE, WATER, LAVAWALL, IRONBARS, IS_SINK, POOL, WEB,
         THROWN_WEAPON, KICKED_WEAPON, ZAPPED_WAND, M_AP_TYPE,
         M_AP_OBJECT, ICE, Is_airlevel, Is_waterlevel, st_all, plur,
         ONAME_WISH, ONAME_KNOW_ARTI, IS_ROOM, STRAT_WAITMASK,
         ZAP_POS, W_ARM, W_ARMS, W_WEP, W_AMUL, HI_ZAP,
         W_RING, W_ARMOR, W_ACCESSORY, W_ART, A_STR,
         KILLED_BY_AN, KILLED_BY, LEVITATION, FLYING } from './const.js';
import { mungspaces } from './hacklib.js';
import { hands_obj, hold_another_object } from './invent.js';
import { u_safe_from_fatal_corpse } from './pickup.js';
import { aobjnam } from './objnam.js';
import { artifact_origin } from './artifact.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_destroy_nhwindow, NHW_TEXT } from './tty/wintty.js';
import { OCLASSES } from './objects_data.js';
import { DEADMONSTER } from './monst.js';
import { killed, shieldeff_mon, wakeup } from './mon.js';
import { ONAMES } from './objects_data.js';
import { rn2, rnd, d } from './rng.js';
import { is_rider } from './makemon.js';
import { getobj, GETOBJ_SUGGEST, GETOBJ_EXCLUDE, update_inventory } from './invent.js';
import { getdir } from './cmd.js';
import { fall_asleep } from './timeout.js';
import { healup, potionbreathe } from './potion.js';
import { findit } from './detect.js';
import { readobjnam } from './objnam.js';
import { getlin } from './cmd.js';
import { prinv, reorder_invent, addinv } from './invent.js';
import { makeknown, observe_object } from './o_init.js';
import { more_experienced } from './exper.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';
import { rn1 } from './rng.js';
import { pline_The, You, You_feel } from './pline.js';
import { pline } from './display.js';
import { The, vtense, xname, Yname2, yname, makeplural,
         Yobjnam2, otense } from './objnam.js';
import { mon_nam } from './do_name.js';
import { canseemon, canspotmon } from './display.js';
import { engulfing_u } from './const.js';
import { nothing_happens, ECMD_TIME, ECMD_CANCEL, NODIR, IMMEDIATE,
         OBJ_FLOOR } from './const.js';
import { splitobj, mkobj, mksobj, rnd_class, set_corpsenm,
         erosion_matters } from './mkobj.js';
import { delobj } from './mon.js';
import { obj_extract_self, useup, weight } from './invent.js';
import { is_flammable, is_rottable, burnarmor } from './trap.js';
import { is_metallic } from './obj.js';
import { MATERIALS } from './objects_data.js';
import { ATTKS, PMNAMES } from './monst_data.js';
import { breathless, defended, haseyes, resists_cold, resists_elec,
         resists_fire, resists_magm } from './mondata.js';
import { find_mac } from './worn.js';
import { Reflecting, Sleep_resistance, Fire_resistance,
         Shock_resistance } from './youprop.js';
import { cmap_names } from './drawing_data.js';
import { CLR_ORANGE, CLR_WHITE, CLR_BLACK, CLR_GREEN,
         CLR_YELLOW } from './terminal.js';

/* include/objclass.h:200/:201/:204 — local copies of the material
   predicates trap.js also carries (they are header macros in C). */
const is_rustprone_zap = (o) =>
    game.objects[o.otyp].oc_material === MATERIALS.IRON;
const is_crackable_zap = (o) =>
    game.objects[o.otyp].oc_material === MATERIALS.GLASS
    && o.oclass === OCLASSES.ARMOR_CLASS;
const is_corrodeable_zap = (o) =>
    game.objects[o.otyp].oc_material === MATERIALS.COPPER
    || game.objects[o.otyp].oc_material === MATERIALS.IRON;
const is_poisonable_zap = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_dir !== 0 /* piercing weapons */;

// src/zap.c:1459 obj_resists() — does this object survive being destroyed?
//
// ochance/achance are PERCENTAGES, and the artifact one is checked against the
// same single draw, so the rn2(100) is spent whether or not the object is an
// artifact. Skipping the draw for ordinary objects would desynchronise the
// stream even when the answer happened to be right.
export function obj_resists(obj, ochance, achance) {
    if (obj.otyp === ONAMES.AMULET_OF_YENDOR
        || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.BELL_OF_OPENING
        || (obj.otyp === ONAMES.CORPSE && is_rider(game.mons[obj.corpsenm]))) {
        return true;
    } else {
        const chance = rn2(100);

        return chance < (obj.oartifact ? achance : ochance);
    }
}

// src/zap.c:3547 exclam() — the punctuation that ends a hit message, and it
// encodes the damage: "?" for a negative force, "." for 4 or less, "!" above
// that. force == 0 happens with e.g. a sleep ray.
export function exclam(force) {
    return (force < 0) ? '?' : (force <= 4) ? '.' : '!';
}

// src/zap.c:6100 resist() — the magic-resistance saving throw.
//
// One draw, and its MODULUS is computed rather than constant:
//
//     resisted = rn2(100 + alev - dlev) < mtmp->data->mr;
//
// alev comes from the item class attacking (a wand is 12, an instrument or
// artifact 10, a scroll 9, a potion 6, a ring 5, a spell your own level) and
// dlev from the monster, clamped to 50 above and raised to 1 below. So the
// span of the roll differs per call and rn2's argument is NOT interchangeable
// with a fixed 100 -- getting alev wrong changes the stream, not just the
// odds.
//
// The fake-player shortcut returns BEFORE the draw, so a Conflict ring test
// against an mplayer costs nothing.
//
// Damage halving is (damage + 1) / 2, rounding UP, so a resisted 1 point
// still does 1.
//
// shieldeff_mon, monkilled and the m_using distinction are recorded; killed
// is real.
export function resist(mtmp, oclass, damage, tell) {
    let alev, dlev;

    /* fake players always pass resistance test against Conflict */
    if (oclass === OCLASSES.RING_CLASS && !damage && !tell
        && note_zap_unported('resist:is_mplayer'))
        return 1;                       /* NO DRAW on this path */

    /* attack level */
    switch (oclass) {
    case OCLASSES.WAND_CLASS:   alev = 12; break;
    case OCLASSES.TOOL_CLASS:   alev = 10; break;   /* instrument */
    case OCLASSES.WEAPON_CLASS: alev = 10; break;   /* artifact */
    case OCLASSES.SCROLL_CLASS: alev = 9;  break;
    case OCLASSES.POTION_CLASS: alev = 6;  break;
    case OCLASSES.RING_CLASS:   alev = 5;  break;
    default:                    alev = game.u.ulevel; break;   /* spell */
    }
    /* defense level */
    dlev = mtmp.m_lev;
    if (dlev > 50)
        dlev = 50;
    else if (dlev < 1)
        dlev = note_zap_unported('resist:is_mplayer2') ? game.u.ulevel : 1;

    const resisted = rn2(100 + alev - dlev) < game.mons[mtmp.mnum].mr;
    if (resisted) {
        if (tell)
            shieldeff_mon(mtmp);
        damage = ((damage + 1) / 2) | 0;
    }

    if (damage) {
        mtmp.mhp -= damage;
        if (DEADMONSTER(mtmp)) {
            if (game.m_using)
                note_zap_unported('resist:monkilled');
            else
                killed(mtmp);
        }
    }
    return resisted;
}

const note_zap_unported = (w) => {
    (game.unported ||= new Set()).add('zap:' + w);
    return false;
};

function note_unported_zap(what) {
    (game.unported ||= new Set()).add('zap:' + what);
}

// src/zap.c:2618 zap_ok() — getobj callback for 'z'.
export function zap_ok(obj) {
    if (obj && obj.oclass === OCLASSES.WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/zap.c:2514 zappable() — does the wand have a charge to spend?
//
// The wrest roll rn2(WAND_WREST_CHANCE=121) fires ONLY at exactly zero
// charges; a wand with charges pays none.
export async function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(121)))
        return 0;
    if (wand.spe === 0)
        await You("wrest one last charge from the worn-out wand.");
    wand.spe--;
    return 1;
}

// src/zap.c:2705 zapyourself() — the hero zapped themself.
//
// Only the WAN_SLEEP arm is live (Sleep_resistance is absent for every
// fresh hero except elves, whose resistance field is real when set); every
// other wand records. Returns the retributive damage, 0 for sleep.
export async function zapyourself(obj, ordinary) {
    let damage = 0;
    let learn_it = false;

    switch (obj.otyp) {
    case ONAMES.WAN_SLEEP:
    case ONAMES.SPE_SLEEP: {
        if (game.u.uprops?.SLEEP_RES?.intrinsic
            || game.u.uprops?.SLEEP_RES?.extrinsic) {
            note_unported_zap('zapyourself:sleep_resisted');
            break;
        }
        if (ordinary)
            await pline_The("sleep ray hits you!");
        else
            await You("fall asleep!");
        /* monstunseesu(M_SEEN_SLEEP) — monster memory, recorded */
        await fall_asleep(-rnd(50), true);
        break;
    }
    case ONAMES.WAN_DEATH:
    case ONAMES.SPE_FINGER_OF_DEATH: {
        /* nonliving()/is_demon() hero forms are not reachable un-polymorphed */
        learn_it = true;
        game.killer ||= {};
        game.killer.name = `shot ${game.flags?.female ? 'her' : 'him'}self`
                           + ' with a death ray';
        game.killer.format = 2; /* NO_KILLER_PREFIX */
        await pline('You irradiate yourself with pure energy!');
        await pline('You die.');
        /* They might survive with an amulet of life saving */
        const { done, DIED } = await import('./end.js');
        await done(DIED);
        break;
    }
    case ONAMES.SPE_HEALING:
    case ONAMES.SPE_EXTRA_HEALING: {
        learn_it = true; /* (no effect for spells...) */
        healup(d(6, obj.otyp === ONAMES.SPE_EXTRA_HEALING ? 8 : 4), 0, false,
               (!!obj.blessed || obj.otyp === ONAMES.SPE_EXTRA_HEALING));
        await You_feel(`${obj.otyp === ONAMES.SPE_EXTRA_HEALING ? 'much ' : ''}better.`);
        break;
    }
    case ONAMES.WAN_SECRET_DOOR_DETECTION:
    case ONAMES.SPE_DETECT_UNSEEN:
        /* src/zap.c:2552 — findit() gives sufficient feedback to discover
           the wand even when it finds nothing */
        learn_it = !!obj.dknown;
        await findit();
        break;
    default:
        note_unported_zap(`zapyourself:otyp=${obj.otyp}`);
        break;
    }
    if (learn_it)
        learnwand(obj);
    return damage;
}

// src/zap.c:2539 zapnodir() — wands that need no direction.
export async function zapnodir(obj) {
    let known = false;

    switch (obj.otyp) {
    case ONAMES.WAN_SECRET_DOOR_DETECTION:
    case ONAMES.SPE_DETECT_UNSEEN:
        /* findit() gives sufficient feedback to discover the wand even
           when blinded or when it fails to find anything */
        known = !!obj.dknown;
        await findit();
        break;
    case ONAMES.WAN_STASIS: {
        const tmp_until = game.moves + rn1(21, 10);
        if (tmp_until > ((game.level.flags ||= {}).stasis_until || 0))
            game.level.flags.stasis_until = tmp_until;
        break;
    }
    case ONAMES.WAN_CREATE_MONSTER:
        /* create_critters draws rn2(23) for the count first */
        note_unported_zap('zapnodir:create_monster');
        rn2(23);
        break;
    case ONAMES.WAN_WISHING:
        /* src/zap.c:2585 — Luck + rn2(5) gate, then the wish */
        if ((game.u.uluck || 0) + rn2(5) < 0) {
            await pline('Unfortunately, nothing happens.');
            known = false;
        } else {
            known = !!obj.dknown;
            await makewish();
        }
        break;
    case ONAMES.WAN_LIGHT:
    case ONAMES.SPE_LIGHT:
    case ONAMES.WAN_ENLIGHTENMENT:
        note_unported_zap(`zapnodir:otyp=${obj.otyp}`);
        break;
    default:
        break;
    }

    if (known) {
        if (!game.objects[obj.otyp].oc_name_known)
            more_experienced(0, 10);
        /* effect was observable; discover the wand type provided
           that the wand itself has been seen */
        learnwand(obj);
    }
}

// src/zap.c:6160 MAXWISHTRY
const MAXWISHTRY = 5;

// src/zap.c:6165 wishcmdassist() — details shown when the player answers
// the wish prompt with "help".
async function wishcmdassist(triesleft) {
    const wishinfo = [
  'Wish details:',
  '',
  'Enter the name of an object, such as "potion of monster detection",',
  '"scroll labeled README", "elven mithril-coat", or "Grimtooth"',
  '(without the quotes).',
  '',
  'For object types which come in stacks, you may specify a plural name',
  'such as "potions of healing", or specify a count, such as "1000 gold',
  'pieces", although that aspect of your wish might not be granted.',
  '',
  'You may also specify various prefix values which might be used to',
  'modify the item, such as "uncursed" or "rustproof" or "+1".',
  'Most modifiers shown when viewing your inventory can be specified.',
  '',
  "You may specify 'nothing' to explicitly decline this wish.",
    ],
        preserve_wishless = "Doing so will preserve 'wishless' conduct.",
        retry_too = 'a randomly chosen item will be granted.',
        suppress_cmdassist =
            '(Suppress this assistance with !cmdassist in your config file.)',
        cardinals = ['zero', 'one', 'two', 'three', 'four', 'five'],
        too_many = 'too many';

    const win = tty_create_nhwindow(NHW_TEXT);
    if (!win)
        return;
    for (let i = 0; i < wishinfo.length; ++i)
        tty_putstr(win, 0, wishinfo[i]);
    if (!(game.u.uconduct?.wishes))
        tty_putstr(win, 0, preserve_wishless);
    tty_putstr(win, 0, '');
    tty_putstr(win, 0,
               `If you specify an unrecognized object name ${
                   (triesleft >= 0 && triesleft < cardinals.length)
                       ? cardinals[triesleft] : too_many
               }${(triesleft < MAXWISHTRY) ? ' more' : ''} time${
                   plur(triesleft)},`);
    tty_putstr(win, 0, retry_too);
    tty_putstr(win, 0, '');
    if (game.iflags?.cmdassist ?? true)
        tty_putstr(win, 0, suppress_cmdassist);
    await tty_display_nhwindow(win);
    tty_destroy_nhwindow(win);
}

/* src/zap.c:6221 MAX_WISH_HISTORY / wish_history[] — the wish history is
   DEBUG-only and the contest build does not define DEBUG, so the list
   stays empty and the add/menu bodies compile away. */
const MAX_WISH_HISTORY = 20;
const wish_history = new Array(MAX_WISH_HISTORY).fill(null);

// src/zap.c:6227 wish_history_add() — body is #ifdef DEBUG; no-op here.
function wish_history_add(buf) {
}

// src/zap.c:6314 makewish() — grant one wish.
export async function makewish() {
    let buf = '';
    let bufcpy = '', promptbuf;
    let otmp;
    const nothing = {}; /* cg.zeroobj; only its address matters */
    let tries = 0;
    game.u.uconduct ||= {};

    (game.context ||= {}).resume_wish = 0;
    if (game.flags?.verbose !== false)
        await You('may wish for an object.');
    /* retry: */
    for (;;) {
        promptbuf = 'For what do you wish';
        if ((game.iflags?.cmdassist ?? true) && tries > 0)
            promptbuf += " (enter 'help' for assistance)";
        promptbuf += '?';

        /* iflags.menu_requested && wish_history[0]: the DEBUG-only history
           menu; the list is always empty here so getlin always runs */
        if (game.iflags?.menu_requested && wish_history[0] && (tries === 0))
            note_unported_zap('makewish:wish_history_menu');
        else
            buf = await getlin(promptbuf, null);

        if (game.iflags?.term_gone) {
            if (!game.iflags?.debug_fuzzer)
                game.context.resume_wish = 1;
            return;
        }

        buf = mungspaces(buf);
        if (buf[0] === '\x1b') {
            buf = '';
        } else if (buf.toLowerCase() === 'help') { /* !strcmpi(buf, "help") */
            await wishcmdassist(MAXWISHTRY - tries);
            buf = ''; /* for EDIT_GETLIN */
            continue; /* goto retry */
        }
        /*
         *  Note: if they wished for and got a non-object successfully,
         *  otmp == &hands_obj.  That includes an artifact which has been
         *  denied. Wishing for "nothing" requires a separate value to
         *  remain distinct.
         */
        bufcpy = buf;
        otmp = await readobjnam(buf, nothing);
        if (!otmp) {
            await pline(
                'Nothing fitting that description exists in the game.');
            if (++tries < MAXWISHTRY)
                continue; /* goto retry */
            await pline("That's enough tries!"); /* thats_enough_tries */
            otmp = await readobjnam(null, null);
            if (!otmp)
                return; /* for safety; should never happen */
        } else if (otmp === nothing) {
            /* explicitly wished for "nothing", presumably attempting
               to retain wishless conduct; the livelog is out-of-band */
            return;
        } else if (otmp === hands_obj) {
            wish_history_add(bufcpy);
            /* wizard mode terrain wish: skip livelogging, etc */
            return;
        }
        break;
    }
    wish_history_add(bufcpy);

    if (otmp.oartifact) {
        /* update artifact bookkeeping; doesn't produce a livelog event */
        artifact_origin(otmp, ONAME_WISH | ONAME_KNOW_ARTI);
    }

    /* wisharti conduct handled in readobjnam(); the livelog_printf events
       (first wish / first artifact wish / wished for ...) are out-of-band */
    game.u.uconduct.wishes = (game.u.uconduct.wishes || 0) + 1; /* KMH */

    if (otmp.otyp === ONAMES.CORPSE
        && !u_safe_from_fatal_corpse(otmp, st_all))
        otmp.wishedfor = 1;

    const verb = ((Is_airlevel(game.u.uz) || game.u.uinwater)
                  ? 'slip'
                  : (otmp.otyp === ONAMES.CORPSE && otmp.wishedfor)
                    ? 'materialize' : 'drop'),
          oops_msg = (game.u.uswallow
                      ? 'Oops!  %s out of your reach!'
                      : (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)
                         || game.level.at(game.u.ux, game.u.uy).typ < IRONBARS
                         || game.level.at(game.u.ux, game.u.uy).typ >= ICE)
                        ? 'Oops!  %s away from you!'
                        : !(otmp.otyp === ONAMES.CORPSE && otmp.wishedfor)
                          ? 'Oops!  %s to the floor!'
                          : 'Careful! %s on the floor!');

    /* The(aobjnam()) is safe since otmp is unidentified -dlc */
    await hold_another_object(otmp, oops_msg, The(aobjnam(otmp, verb)),
                              null);
    game.u.ublesscnt = (game.u.ublesscnt || 0) + rn1(100, 50);
                                        /* the gods take notice */
}

// src/zap.c:123 learnwand() — the zap's observable effect identifies the
// wand type (spells are suppressed so casting can't re-discover a book).
export function learnwand(obj) {
    if (obj.oclass !== OCLASSES.SPBOOK_CLASS) {
        if (game.objects[obj.otyp].oc_name_known) {
            observe_object(obj);
        } else {
            if (!game.u.ublind)
                observe_object(obj);
            if (obj.dknown)
                makeknown(obj.otyp);
        }
        update_inventory();
    }
}

// src/zap.c:1476 obj_shudders() — does the object with polymorph.
export function obj_shudders(obj) {
    let zap_odds;

    if (game.context?.bypasses && obj.bypass)
        return false;

    if (obj.oclass === OCLASSES.WAND_CLASS)
        zap_odds = 3;       /* half-life = 2 zaps */
    else if (obj.cursed)
        zap_odds = 3;
    else if (obj.blessed)
        zap_odds = 12;      /* half-life = 8 zaps */
    else
        zap_odds = 8;       /* half-life = 6 zaps */

    /* adjust for "large" quantities of identical things */
    if (obj.quan > 4)
        zap_odds = Math.trunc(zap_odds / 2);

    return !rn2(zap_odds);
}

/* module state mirroring go.obj_zapped / gp.poly_zapped */
let obj_zapped = false;
let poly_zapped = -1;

// src/zap.c:1637 do_osshock() — object is deleted by the polymorph shock;
// some of a stack may survive via splitobj, and some material may
// metamorphose into a golem later (create_polymon via poly_zapped).
export function do_osshock(obj) {
    obj_zapped = true;

    if (poly_zapped < 0) {
        /* some may metamorphose */
        const Luck = (game.u.uluck || 0) + (game.u.moreluck || 0);
        for (let i = obj.quan; i; i--)
            if (!rn2(Luck + 45)) {
                poly_zapped = game.objects[obj.otyp].oc_material;
                break;
            }
    }

    /* if quan > 1 then some will survive intact */
    if (obj.quan > 1) {
        obj = splitobj(obj, rnd(obj.quan - 1));
    }

    /* costly_spot billing — shops unported, recorded in delobj path */
    delobj(obj);
}

// src/zap.c:1678 obj_unpolyable() — resists polymorphing. Draws the
// obj_resists rn2(100) for every non-unpolyable object.
export function obj_unpolyable(obj) {
    /* include/obj.h:429 unpolyable() */
    const unpoly = obj.otyp === ONAMES.WAN_POLYMORPH
        || obj.otyp === ONAMES.SPE_POLYMORPH
        || obj.otyp === ONAMES.POT_POLYMORPH
        || obj.otyp === ONAMES.AMULET_OF_UNCHANGING;
    return (unpoly
            || obj === game.uball || obj === game.uskin
            || obj_resists(obj, 5, 95));
}

/* src/zap.c:1688 charged_objs[] */
const charged_objs = [OCLASSES.WAND_CLASS, OCLASSES.WEAPON_CLASS,
                      OCLASSES.ARMOR_CLASS];

// src/zap.c:1702 poly_obj() — polymorph obj; STRANGE_OBJECT id means pick a
// random object of the same class, trying up to 3 times to keep the
// magic-or-not status. The worn-item tail applies to inventory items only;
// the floor-pile path (the one live today) swaps the object in place.
export async function poly_obj(obj, id) {
    let otmp;
    const can_merge = (id === ONAMES.STRANGE_OBJECT);
    const obj_location = obj.where;

    if (obj.otyp === ONAMES.BOULDER)
        note_unported_zap('poly_obj:sokoban_guilt');
    if (id === ONAMES.STRANGE_OBJECT) { /* preserve symbol */
        let try_limit = 3;
        const magic_obj = game.objects[obj.otyp].oc_magic;

        otmp = null;
        do {
            if (otmp)
                delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
                 && game.objects[otmp.otyp].oc_magic !== magic_obj);
    } else {
        /* literally replace obj with this new thing */
        otmp = mksobj(id, false, false);
        const USES_CORPSENM = (typ) => typ === ONAMES.CORPSE
            || typ === ONAMES.STATUE || typ === ONAMES.FIGURINE;
        if (USES_CORPSENM(obj.otyp) && USES_CORPSENM(id))
            set_corpsenm(otmp, obj.corpsenm);
    }

    /* preserve quantity */
    otmp.quan = obj.quan;
    /* preserve the shopkeeper's (lack of) interest */
    otmp.no_charge = obj.no_charge;
    /* preserve inventory letter if in inventory */
    if (obj_location === 3 /* OBJ_INVENT */)
        otmp.invlet = obj.invlet;

    /* avoid abusing eggs laid by you */
    if (obj.otyp === ONAMES.EGG && obj.spe)
        note_unported_zap('poly_obj:hero_laid_egg');

    /* keep special fields (including charges on wands) */
    if (charged_objs.includes(otmp.oclass))
        otmp.spe = obj.spe;
    otmp.recharged = obj.recharged;

    otmp.cursed = obj.cursed;
    otmp.blessed = obj.blessed;

    if (erosion_matters(otmp, game.objects)) {
        if (is_flammable(otmp) || is_rustprone_zap(otmp)
            || is_crackable_zap(otmp))
            otmp.oeroded = obj.oeroded;
        if (is_corrodeable_zap(otmp) || is_rottable(otmp))
            otmp.oeroded2 = obj.oeroded2;
        /* is_damageable */
        if (is_flammable(otmp) || is_rustprone_zap(otmp)
            || is_rottable(otmp) || is_corrodeable_zap(otmp)
            || is_crackable_zap(otmp))
            otmp.oerodeproof = obj.oerodeproof;
    }

    /* keep chest/box traps and poisoned ammo if we may */
    if (obj.otrapped && (otmp.otyp === ONAMES.LARGE_BOX
                         || otmp.otyp === ONAMES.CHEST
                         || otmp.otyp === ONAMES.ICE_BOX))
        otmp.otrapped = 1;
    if (obj.opoisoned && is_poisonable_zap(otmp))
        otmp.opoisoned = 1;

    if (id === ONAMES.STRANGE_OBJECT && obj.otyp === ONAMES.CORPSE) {
        if (obj.corpsenm === PMNAMES.PM_CROCODILE)
            note_unported_zap('poly_obj:crocodile_shoes');
    }
    if (obj.otyp === ONAMES.LEASH && obj.leashmon)
        note_unported_zap('poly_obj:leash');

    /* no box contents --KAA */
    if (otmp.cobj?.length)
        otmp.cobj = [];

    /* 'n' merged objects may be fused into 1 object */
    if (otmp.quan > 1 && (!game.objects[otmp.otyp].oc_merge
                          || (can_merge && otmp.quan > rn2(1000))))
        otmp.quan = 1;

    switch (otmp.oclass) {
    case OCLASSES.TOOL_CLASS:
        if (otmp.otyp === ONAMES.MAGIC_LAMP) {
            otmp.otyp = ONAMES.OIL_LAMP;
            otmp.age = 1500;
        } else if (otmp.otyp === ONAMES.MAGIC_MARKER) {
            otmp.recharged = 1; /* degraded quality */
        }
        break;

    case OCLASSES.WAND_CLASS:
        while (otmp.otyp === ONAMES.WAN_WISHING
               || otmp.otyp === ONAMES.WAN_POLYMORPH)
            otmp.otyp = rnd_class(ONAMES.WAN_LIGHT, ONAMES.WAN_LIGHTNING);
        if ((otmp.recharged || 0) < rn2(7)) /* recharge_limit */
            otmp.recharged = (otmp.recharged || 0) + 1;
        break;

    case OCLASSES.POTION_CLASS:
        while (otmp.otyp === ONAMES.POT_POLYMORPH)
            otmp.otyp = rnd_class(ONAMES.POT_GAIN_ABILITY, ONAMES.POT_WATER);
        if (otmp.otyp === ONAMES.POT_OIL || obj.otyp === ONAMES.POT_OIL)
            note_unported_zap('poly_obj:fixup_oil');
        break;

    case OCLASSES.SPBOOK_CLASS:
        while (otmp.otyp === ONAMES.SPE_POLYMORPH)
            otmp.otyp = rnd_class(game.bases[OCLASSES.SPBOOK_CLASS],
                                  ONAMES.SPE_BLANK_PAPER);
        if (otmp.otyp !== ONAMES.SPE_BLANK_PAPER
            && otmp.otyp !== ONAMES.SPE_NOVEL) {
            otmp.spestudied = (obj.spestudied || 0) + 1;
            if (otmp.spestudied > 4 /* MAX_SPELL_STUDY */) {
                otmp.otyp = ONAMES.SPE_BLANK_PAPER;
                otmp.spestudied = rn2(otmp.spestudied);
            }
        }
        break;

    case OCLASSES.GEM_CLASS:
        if (otmp.quan > rnd(4)
            && game.objects[obj.otyp].oc_material === MATERIALS.MINERAL
            && game.objects[otmp.otyp].oc_material !== MATERIALS.MINERAL) {
            otmp.otyp = ONAMES.ROCK; /* transmutation backfired */
            otmp.quan = Math.trunc(otmp.quan / 2); /* material lost */
        }
        break;
    }

    /* update the weight */
    otmp.owt = weight(otmp);

    /* replace_object(obj, otmp) — floor swap; the worn-inventory tail
       (freeinv/addinv, Wear/Takeoff side effects) is inventory-only and
       recorded when it first matters. */
    if (obj_location === OBJ_FLOOR) {
        otmp.ox = obj.ox;
        otmp.oy = obj.oy;
        otmp.where = OBJ_FLOOR;
        const idx = game.level.objects.indexOf(obj);
        if (idx >= 0)
            game.level.objects[idx] = otmp;
        else
            game.level.objects.unshift(otmp);
    } else {
        note_unported_zap('poly_obj:non_floor_swap');
    }

    if ((otmp.otyp === ONAMES.MIRROR || otmp.otyp === ONAMES.CRYSTAL_BALL)
        && obj.otyp !== otmp.otyp)
        note_unported_zap('poly_obj:luck_mirror');

    /* src/zap.c poly_obj tail — delobj(obj) on the original; its
       obj_resists(0,0) guard DRAWS one rn2(100) every time. The floor swap
       above already removed obj from the list, so mark it free first so
       delobj's list splice is a no-op. */
    obj.where = 0; /* OBJ_FREE */
    delobj(obj);
    return otmp;
}

// src/zap.c:1544 create_polymon() — a golem rises from the polymorphed
// pile. Draws happen only when do_osshock set poly_zapped, which any
// session reaching it will show; the golem machinery itself is recorded.
function create_polymon(pile_head, okind) {
    note_unported_zap('create_polymon:okind=' + okind);
}

// src/zap.c:2119 bhito() — zap effect hits an object on the floor.
// The POLYMORPH arm is live; PROBING learns the object; the other wand
// types record themselves.
export async function bhito(obj, otmp) {
    let res = 1; /* affected object by default */
    let learn_it = false;

    if (obj === otmp)
        return 0;

    if (obj.bypass) {
        if (game.context?.bypasses)
            return 0;
        obj.bypass = 0;
    }

    if (obj === game.uball) {
        res = 0;
    } else if (obj === game.uchain) {
        if (otmp.otyp === ONAMES.WAN_OPENING
            || otmp.otyp === ONAMES.SPE_KNOCK) {
            learn_it = true;
            note_unported_zap('bhito:unpunish');
        } else
            res = 0;
    } else {
        switch (otmp.otyp) {
        case ONAMES.WAN_POLYMORPH:
        case ONAMES.SPE_POLYMORPH:
            if (obj_unpolyable(obj)) {
                res = 0;
                break;
            }
            game.u.uconduct ||= {};
            game.u.uconduct.polypiles =
                (game.u.uconduct.polypiles || 0) + 1;

            /* any saved lock context will be dangerously obsolete */
            if (obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.CHEST
                || obj.otyp === ONAMES.ICE_BOX)
                note_unported_zap('bhito:boxlock');

            if (obj_shudders(obj)) {
                if (cansee(obj.ox, obj.oy))
                    learn_it = true;
                do_osshock(obj);
                break;
            }
            obj = await poly_obj(obj, ONAMES.STRANGE_OBJECT);
            newsym(obj.ox, obj.oy);
            break;
        case ONAMES.WAN_PROBING:
            res = obj.dknown ? 0 : 1;
            observe_object(obj);
            note_unported_zap('bhito:probing_contents');
            learn_it = true;
            break;
        case ONAMES.WAN_STRIKING:
        case ONAMES.SPE_FORCE_BOLT:
            note_unported_zap('bhito:striking');
            res = 0;
            break;
        case ONAMES.WAN_CANCELLATION:
        case ONAMES.SPE_CANCELLATION:
            note_unported_zap('bhito:cancellation');
            res = 0;
            break;
        case ONAMES.WAN_TELEPORTATION:
        case ONAMES.SPE_TELEPORT_AWAY:
            note_unported_zap('bhito:teleport');
            res = 0;
            break;
        case ONAMES.WAN_MAKE_INVISIBLE:
            res = 0;
            break;
        case ONAMES.WAN_UNDEAD_TURNING:
        case ONAMES.SPE_TURN_UNDEAD:
            note_unported_zap('bhito:undead_turning');
            res = 0;
            break;
        case ONAMES.WAN_OPENING:
        case ONAMES.SPE_KNOCK:
        case ONAMES.WAN_LOCKING:
        case ONAMES.SPE_WIZARD_LOCK:
            note_unported_zap('bhito:locking');
            res = 0;
            break;
        case ONAMES.SPE_STONE_TO_FLESH:
            note_unported_zap('bhito:stone_to_flesh');
            res = 0;
            break;
        default:
            res = 0;
            break;
        }
    }
    if (learn_it)
        learnwand(otmp);
    return res;
}

// src/zap.c:2428 bhitpile() — apply fhito to every object in the pile at
// (tx,ty). The flat objects list is PREPEND-ordered, so filtering it gives
// the same order C's per-square nexthere chain would.
export async function bhitpile(obj, fhito, tx, ty, zz) {
    let hitanything = 0;

    const pile = (game.level.objects || [])
        .filter(o => o.where === OBJ_FLOOR && o.ox === tx && o.oy === ty);
    if (!pile.length)
        return 0;

    /* hidingunder — hero hiding under the top of the pile; hides_under
       hero forms are not modelled */

    if (obj.otyp === ONAMES.SPE_FORCE_BOLT
        || obj.otyp === ONAMES.WAN_STRIKING)
        note_unported_zap('bhitpile:statue_trap');

    poly_zapped = -1;
    for (const otmp of pile) {
        if (otmp.where !== OBJ_FLOOR || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }
    if (poly_zapped >= 0)
        create_polymon(null, poly_zapped);

    /* boulder re-stack — boulders polymorphed mid-pile; recorded */

    return hitanything;
}

// src/zap.c:3415 zapsetup() / :3421 zapwrapup()
export function zapsetup() {
    obj_zapped = false;
}
export async function zapwrapup() {
    /* if do_osshock() set obj_zapped while polying, give a message now */
    if (obj_zapped)
        await You_feel('shuddering vibrations.');
    obj_zapped = false;
}

// src/zap.c:1170ish bhitm() — zap effect hits a monster. Nothing that a
// polymorph-at-pile session reaches; every arm records until its subsystem
// lands.
export async function bhitm(mtmp, otmp) {
    note_unported_zap(`bhitm:otyp=${otmp.otyp}`);
    return 0;
}

// src/zap.c:3628 zap_map() — per-square terrain effects of a lateral zap.
// Trap explosion applies to cancellation only; the engraving arm fires for
// down zaps only; secret-door reveals belong to striking/opening/locking.
// A lateral polymorph over plain floor does nothing here.
export function zap_map(x, y, obj) {
    const ttmp = t_at(x, y);
    if (ttmp && (obj.otyp === ONAMES.WAN_CANCELLATION
                 || obj.otyp === ONAMES.SPE_CANCELLATION))
        note_unported_zap('zap_map:maybe_explode_trap');
    if (game.u.dz > 0)
        note_unported_zap('zap_map:engraving');
    if (obj.otyp === ONAMES.WAN_STRIKING || obj.otyp === ONAMES.WAN_OPENING
        || obj.otyp === ONAMES.WAN_LOCKING || obj.otyp === ONAMES.WAN_PROBING)
        note_unported_zap('zap_map:terrain_reveal');
}

const flash_types = [
    'magic missile', 'bolt of fire', 'bolt of cold', 'sleep ray', 'death ray',
    'bolt of lightning', '', '', '', '',
    'magic missile', 'fireball', 'cone of cold', 'sleep ray',
    'finger of death', 'bolt of lightning', '', '', '', '',
    'blast of missiles', 'blast of fire', 'blast of frost',
    'blast of sleep gas', 'blast of disintegration', 'blast of lightning',
    'blast of poison gas', 'blast of acid', '', '',
];

// src/zap.c:89 zaptype().
function zaptype(type) {
    if (type <= -30 && type >= -39)
        type += 30;
    return Math.abs(type);
}

function flash_str(type) {
    const fltyp = zaptype(type);
    if (game.u.uprops?.HALLUC) {
        note_unported_zap('flash_str:hallucination');
        return flash_types[fltyp] || 'ray';
    }
    return flash_types[fltyp] || 'ray';
}

// src/zap.c:4705 zap_hit(). Hero spell bonuses remain an explicit gap.
function zap_hit(ac, spell_type) {
    const chance = rn2(20);
    if (spell_type)
        note_unported_zap('zap_hit:spell_bonus');
    if (!chance)
        return rnd(10) < ac;
    if (ac < 0)
        ac = -rnd(-ac);
    return 3 - chance < ac;
}

const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;

const destroy_strings = [
    ['freezes and shatters', 'freeze and shatter', 'shattered potion'],
    ['boils and explodes', 'boil and explode', 'boiling potion'],
    ['ignites and explodes', 'ignite and explode', 'exploding potion'],
    ['catches fire and burns', 'catch fire and burn', 'burning scroll'],
    ['catches fire and burns', '', 'burning book'],
    ['turns to dust and vanishes', '', ''],
    ['breaks apart and explodes', '', 'exploding wand'],
];

function destroyable(obj, dmgtyp) {
    if (obj.oartifact || (obj.in_use && obj.quan === 1))
        return false;

    if (dmgtyp === ATTKS.AD_FIRE) {
        if (obj.otyp === ONAMES.SCR_FIRE || obj.otyp === ONAMES.SPE_FIREBALL)
            return false;
        return obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME
            || obj.oclass === OCLASSES.POTION_CLASS
            || obj.oclass === OCLASSES.SCROLL_CLASS
            || obj.oclass === OCLASSES.SPBOOK_CLASS;
    }
    if (dmgtyp === ATTKS.AD_COLD)
        return obj.oclass === OCLASSES.POTION_CLASS
            && obj.otyp !== ONAMES.POT_OIL;
    if (dmgtyp === ATTKS.AD_ELEC)
        return (obj.oclass === OCLASSES.RING_CLASS
                || obj.oclass === OCLASSES.WAND_CLASS)
            && obj.otyp !== ONAMES.RIN_SHOCK_RESISTANCE
            && obj.otyp !== ONAMES.WAN_LIGHTNING;
    return false;
}

function inventory_resistance_check(dmgtyp) {
    const prop = dmgtyp === ATTKS.AD_COLD ? 'COLD_RES'
               : dmgtyp === ATTKS.AD_FIRE ? 'FIRE_RES'
                 : dmgtyp === ATTKS.AD_ELEC ? 'SHOCK_RES' : null;
    let probability = prop
        && (((game.u.uprops?.[prop] || 0)
             & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART)) !== 0) ? 99 : 0;

    if (!probability && game.u.uarmc?.otyp === ONAMES.DWARVISH_CLOAK
        && (dmgtyp === ATTKS.AD_COLD || dmgtyp === ATTKS.AD_FIRE))
        probability = 90;
    return probability ? rn2(100) < probability : false;
}

function m_useup(mon, obj) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        obj_extract_self(obj);
        const at = mon.minvent?.indexOf(obj) ?? -1;
        if (at >= 0)
            mon.minvent.splice(at, 1);
    }
}

async function recharge_ring_neutral(obj) {
    if ((obj.spe | 0) > rn2(7) || (obj.spe | 0) <= -5) {
        await pline(`${Yobjnam2(obj, 'pulsate')} momentarily, then ${
            otense(obj, 'explode')}!`);
        const amount = rnd(3 * Math.abs(obj.spe | 0));
        useup(obj);
        const damage = game.u.uprops?.HALF_PHDAM
            ? Math.trunc((amount + 1) / 2) : amount;
        const { losehp } = await import('./hack.js');
        await losehp(damage, 'exploding ring', KILLED_BY_AN);
    } else {
        await pline(`${Yname2(obj)} spins clockwise for a moment.`);
        obj.spe = (obj.spe | 0) + 1;
    }
}

async function maybe_destroy_item(carrier, obj, dmgtyp) {
    const u_carry = carrier === game.youmonst;
    const vis = !u_carry && canseemon(carrier);
    let dmg = 0, dindx = 0, quan = 0;
    let xresist = false, skip = false, chargeit = false;

    if (u_carry && inventory_resistance_check(dmgtyp))
        return 0;

    switch (dmgtyp) {
    case ATTKS.AD_COLD:
        quan = obj.quan;
        dmg = rnd(4);
        break;
    case ATTKS.AD_FIRE:
        xresist = obj.oclass !== OCLASSES.POTION_CLASS
            && obj.otyp !== ONAMES.GLOB_OF_GREEN_SLIME
            && (u_carry ? Fire_resistance() : resists_fire(carrier));
        if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            skip = true;
            if (u_carry ? !game.u.ublind : vis)
                await pline(`${The(xname(obj))} glows a strange dark red, but remains intact.`);
            break;
        }
        quan = obj.quan;
        if (obj.oclass === OCLASSES.POTION_CLASS) {
            dindx = obj.otyp === ONAMES.POT_OIL ? 2 : 1;
            dmg = rnd(6);
        } else if (obj.oclass === OCLASSES.SCROLL_CLASS) {
            dindx = 3;
            dmg = 1;
        } else if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
            dindx = 4;
            dmg = 1;
        } else {
            dindx = 1;
            dmg = Math.trunc(((obj.owt | 0) + 19) / 20);
        }
        break;
    case ATTKS.AD_ELEC:
        xresist = obj.oclass !== OCLASSES.RING_CLASS
            && (u_carry ? Shock_resistance() : resists_elec(carrier));
        quan = obj.quan;
        if (obj.oclass === OCLASSES.RING_CLASS) {
            if ((((obj.owornmask | 0) & W_RING) && game.u.uarmg
                 && !is_metallic(game.u.uarmg))
                || obj.otyp === ONAMES.RIN_SHOCK_RESISTANCE) {
                skip = true;
            } else if (game.objects[obj.otyp].oc_charged && rn2(3)) {
                chargeit = true;
            } else {
                dindx = 5;
            }
        } else {
            dindx = 6;
            dmg = rnd(10);
        }
        break;
    default:
        skip = true;
        note_unported_zap(`maybe_destroy_item:dmgtyp=${dmgtyp}`);
        break;
    }

    if (chargeit) {
        if (u_carry)
            await recharge_ring_neutral(obj);
    } else if (!skip) {
        const osym = obj.oclass;
        if (obj.in_use)
            --quan;
        let cnt = 0;
        for (let i = 0; i < quan; ++i)
            if (!rn2(3))
                ++cnt;
        if (!cnt)
            return 0;

        if (u_carry || vis) {
            const mult = cnt === 1 ? (quan === 1 ? '' : 'One of ')
                       : cnt < quan ? 'Some of '
                         : quan === 2 ? 'Both of ' : 'All of ';
            const name = cnt === 1 && quan === 1 ? Yname2(obj) : yname(obj);
            await pline(`${mult}${name} ${destroy_strings[dindx][cnt > 1 ? 1 : 0]}!`);
        }
        if (u_carry && osym === OCLASSES.POTION_CLASS
            && dmgtyp !== ATTKS.AD_COLD
            && (!breathless(game.youmonst.data)
                || haseyes(game.youmonst.data)))
            await potionbreathe(obj);

        for (let i = 0; i < cnt; ++i) {
            if (u_carry)
                useup(obj);
            else
                m_useup(carrier, obj);
        }
        if (dmg) {
            if (!u_carry)
                return xresist ? 0 : dmg;
            if (xresist) {
                await You("aren't hurt!");
            } else {
                let how = destroy_strings[dindx][2];
                if (dmgtyp === ATTKS.AD_FIRE
                    && osym === OCLASSES.FOOD_CLASS)
                    how = 'exploding glob of slime';
                const { losehp } = await import('./hack.js');
                await losehp(dmg, cnt === 1 ? how : makeplural(how),
                             cnt === 1 ? KILLED_BY_AN : KILLED_BY);
                exercise(A_STR, false);
            }
        }
    }
    return dmg;
}

// src/zap.c:5965 destroy_items(). Damage limits the number of eligible stacks;
// reservoir sampling gives later stacks the same chance as earlier ones.
export async function destroy_items(mon, osym, dmg_in) {
    let limit = Math.trunc(dmg_in / DMG_DESTROY_SCALE);
    if (dmg_in % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE))
        ++limit;
    limit = Math.min(limit, MAX_ITEMS_DESTROYED);
    if (limit < 1)
        return 0;

    const u_carry = mon === game.youmonst;
    const invent = u_carry ? game.invent : (mon.minvent || []);
    const selected = [];
    let eligible = 0;

    for (const obj of invent) {
        if (!destroyable(obj, osym))
            continue;
        const i = eligible < limit ? eligible : rn2(eligible);
        ++eligible;
        if (i >= limit)
            continue;
        const prop = game.objects[obj.otyp].oc_oprop;
        selected[i] = {
            obj,
            deferred: u_carry && (((obj.owornmask | 0)
                                   && (prop === LEVITATION || prop === FLYING))
                                  || (obj.otyp === ONAMES.POT_WATER
                                      && game.u.ulycn >= 0)),
        };
    }

    let damage = 0;
    for (let defer = 0; defer <= 1; ++defer) {
        for (const item of selected.slice(0, Math.min(eligible, limit))) {
            if (!item || item.deferred !== !!defer || !invent.includes(item.obj))
                continue;
            damage += await maybe_destroy_item(mon, item.obj, osym);
        }
    }
    return damage;
}

// src/zap.c:4238 zhitm(). The common missile and cold-ray damage paths are
// complete. Other ray families stay marked until their item-destruction and
// status effects are ported together.
async function zhitm(mon, type, nd) {
    const damgtype = zaptype(type) % 10;
    let damage = 0;

    switch (damgtype) {
    case 0:
        if (resists_magm(mon) || defended(mon, ATTKS.AD_MAGM)) {
            shieldeff_mon(mon);
            break;
        }
        damage = d(nd, 6);
        break;
    case 2:
        if (resists_cold(mon) || defended(mon, ATTKS.AD_COLD)) {
            shieldeff_mon(mon);
            break;
        }
        damage = d(nd, 6);
        {
            const orig_damage = damage;
            if (resists_fire(mon))
                damage += d(nd, 3);
            if (!rn2(3))
                damage += await destroy_items(mon, ATTKS.AD_COLD, orig_damage);
        }
        break;
    default:
        note_unported_zap(`zhitm:type=${damgtype}`);
        return 0;
    }

    if (damage > 0 && type >= 0
        && resist(mon, type < 10 ? OCLASSES.WAND_CLASS : 0, 0, false))
        damage = Math.trunc(damage / 2);
    mon.mhp -= damage;
    return damage;
}

// src/zap.c:4401 zhitu(), a ray striking the hero. The fire arm is shared by
// wands, spells, breath, and rebounding beams.
async function zhitu(type, nd, fltxt, sx, sy) {
    const abstyp = zaptype(type);
    let damage = 0;

    switch (abstyp % 10) {
    case 1: { /* ZT_FIRE */
        const origDamage = d(nd, 6);
        if (Fire_resistance()) {
            note_unported_zap('zhitu:fire_shieldeff');
            await You("don't feel hot!");
        } else {
            damage = origDamage;
        }
        /* burn_away_slime() has no effect without an active slime timeout. */
        if (await burnarmor(game.youmonst)) {
            if (!rn2(3))
                await destroy_items(game.youmonst, ATTKS.AD_FIRE, origDamage);
            if (!rn2(3))
                note_unported_zap('zhitu:ignite_items');
        }
        break;
    }
    default:
        note_unported_zap(`zhitu:type=${abstyp % 10}`);
        return;
    }

    if (damage && game.u.uprops?.HALF_SPDAM && abstyp < 20)
        damage = Math.trunc((damage + 1) / 2);
    const self = game.flags?.female ? 'herself' : 'himself';
    const killer = type < 0 ? fltxt : `${fltxt} ${
        abstyp < 10 ? 'zapped' : abstyp < 20 ? 'cast' : 'exhaled'} by ${self}`;
    const { losehp } = await import('./hack.js');
    await losehp(damage, killer, KILLED_BY_AN);
}

// src/zap.c:4664 bounce_dir().
function bounce_dir(sx, sy, delta, bounceback) {
    if (!delta.dx || !delta.dy || (bounceback > 0 && !rn2(bounceback))) {
        delta.dx = -delta.dx;
        delta.dy = -delta.dy;
        return;
    }

    const lsx = sx - delta.dx, lsy = sy - delta.dy;
    let bounce = 0;
    const vert = game.level?.at(sx, lsy);
    if (isok(sx, lsy) && vert && ZAP_POS(vert.typ)
        && !closed_door(sx, lsy)
        && (IS_ROOM(vert.typ)
            || (isok(sx + delta.dx, lsy)
                && ZAP_POS(game.level.at(sx + delta.dx, lsy).typ))))
        bounce = 1;
    const horiz = game.level?.at(lsx, sy);
    if (isok(lsx, sy) && horiz && ZAP_POS(horiz.typ)
        && !closed_door(lsx, sy)
        && (IS_ROOM(horiz.typ)
            || (isok(lsx, sy + delta.dy)
                && ZAP_POS(game.level.at(lsx, sy + delta.dy).typ)))) {
        if (!bounce || rn2(2))
            bounce = 2;
    }
    switch (bounce) {
    case 0:
        delta.dx = -delta.dx;
        delta.dy = -delta.dy;
        break;
    case 1:
        delta.dy = -delta.dy;
        break;
    case 2:
        delta.dx = -delta.dx;
        break;
    }
}

const zap_colors = [
    HI_ZAP, CLR_ORANGE, CLR_WHITE, HI_ZAP,
    CLR_BLACK, CLR_WHITE, CLR_GREEN, CLR_YELLOW,
];

// src/display.c:2461 zapdir_to_glyph(). A zap type changes the color, while
// these four cmap entries supply the active symbol-set character.
function zapdir_cmap(dx, dy) {
    if (dx === dy)
        return cmap_names.S_lslant;
    if (dx && dy)
        return cmap_names.S_rslant;
    return dx ? cmap_names.S_hbeam : cmap_names.S_vbeam;
}

// src/muse.c:2836 ureflects(), outermost equipment first.
async function ureflects() {
    const mask = game.u.uprops?.REFLECTING | 0;
    let source = null;
    let identify = 0;

    if (mask & W_ARMS) {
        source = 'shield';
        identify = ONAMES.SHIELD_OF_REFLECTION;
    } else if (mask & W_WEP) {
        source = 'weapon';
    } else if (mask & W_AMUL) {
        source = 'medallion';
        identify = ONAMES.AMULET_OF_REFLECTION;
    } else if (mask & W_ARM) {
        source = game.u.uskin ? 'luster' : 'armor';
    }
    if (!source) {
        note_unported_zap('ureflects:source');
        source = 'body';
    }
    await pline(`But it reflects from your ${source}!`);
    if (identify)
        makeknown(identify);
}

// src/zap.c:4780 dobuzz(). This ports the lateral beam walk, monster hit,
// death, and ordinary terrain bounce spine used by wand and spell rays.
async function dobuzz(type, nd, startx, starty, ddx, ddy) {
    if (game.u.uswallow) {
        note_unported_zap('dobuzz:swallowed');
        return;
    }

    let range = rn1(7, 7);
    if (!ddx && !ddy)
        range = 1;
    let sx = startx, sy = starty;
    const delta = { dx: ddx, dy: ddy };
    const beam_cells = [];
    const damgtype = zaptype(type) % 10;

    try {
        while (range-- > 0) {
            const lsx = sx, lsy = sy;
            sx += delta.dx;
            sy += delta.dy;
            let loc = isok(sx, sy) ? game.level?.at(sx, sy) : null;

            if (loc && loc.typ !== STONE) {
                let mon = m_at(sx, sy);
                if (cansee(sx, sy)) {
                    if (mon && !canspotmon(mon))
                        map_invisible(sx, sy);
                    else if (!mon)
                        unmap_invisible(sx, sy);
                    if (ZAP_POS(loc.typ)
                        || (isok(lsx, lsy) && cansee(lsx, lsy))) {
                        display_cmap_at(zapdir_cmap(delta.dx, delta.dy),
                                        sx, sy,
                                        zap_colors[damgtype] ?? HI_ZAP, 'zap');
                        beam_cells.push([sx, sy]);
                    }
                    await game.animationFrame();
                }

                if (loc.typ === WATER || loc.typ === POOL || loc.typ === ICE)
                    note_unported_zap('dobuzz:zap_over_floor');

                if (mon) {
                    if (type >= 0)
                        mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITMASK;
                    if (zap_hit(find_mac(mon), type >= 10 && type < 20 ? type : 0)) {
                        const damage = await zhitm(mon, type, nd);
                        if (DEADMONSTER(mon)) {
                            if (type < 0)
                                note_unported_zap('dobuzz:monkilled');
                            else
                                await killed(mon);
                        } else {
                            if (canspotmon(mon))
                                await pline_The(`${flash_str(type)} hits ${
                                    mon_nam(mon)}${exclam(damage)}`);
                            if (damgtype !== 3)
                                await wakeup(mon, type >= 0);
                        }
                        range -= 2;
                    }
                } else if (game.u.ux === sx && game.u.uy === sy && range >= 0) {
                    const { nomul } = await import('./hack.js');
                    nomul(0);
                    if (zap_hit(game.u.uac | 0, 0)) {
                        range -= 2;
                        const fltxt = flash_str(type);
                        await pline(`${The(fltxt)} hits you!`);
                        if (Reflecting()) {
                            await ureflects();
                            delta.dx = -delta.dx;
                            delta.dy = -delta.dy;
                        } else if (damgtype === 3) {
                            if (Sleep_resistance())
                                await You("don't feel sleepy.");
                            else
                                await fall_asleep(-d(nd, 25), true);
                        } else {
                            await zhitu(type, nd, fltxt, sx, sy);
                        }
                    } else if (!game.u.uprops?.BLINDED) {
                        await pline(`${The(flash_str(type))} whizzes by you!`);
                    }
                    if (game.occupation) {
                        const { stop_occupation } = await import('./allmain.js');
                        await stop_occupation();
                    }
                    nomul(0);
                }
            }

            loc = isok(sx, sy) ? game.level?.at(sx, sy) : null;
            if (!loc || loc.typ === STONE || !ZAP_POS(loc.typ)
                || (closed_door(sx, sy) && range >= 0)) {
                const bchance = (!loc || loc.typ === STONE) ? 10 : 75;
                if (--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))
                    await pline_The(`${flash_str(type)} bounces!`);
                bounce_dir(sx, sy, delta, bchance);
            }
        }
    } finally {
        for (const [x, y] of beam_cells)
            newsym(x, y);
    }
}

async function ubuzz(type, nd) {
    await dobuzz(type, nd, game.u.ux, game.u.uy, game.u.dx, game.u.dy);
}

// src/zap.c:3431 weffects() — dispatch a zap's effect. The IMMEDIATE
// lateral arm uses bhit; directional rays use dobuzz.
export async function weffects(obj) {
    const otyp = obj.otyp;
    const dirprop = game.objects[otyp].oc_dir;
    const was_unkn = !game.objects[otyp].oc_name_known;
    let disclose = false;

    /* exercise(A_WIS) is done by dozap before dispatching here, matching
       C's placement at the head of weffects */

    if (dirprop === IMMEDIATE) {
        zapsetup(); /* reset obj_zapped */
        if (game.u.uswallow) {
            note_unported_zap('weffects:uswallow');
        } else if (game.u.dz) {
            note_unported_zap('weffects:zap_updown');
        } else {
            await bhit(game.u.dx, game.u.dy, rn1(8, 6), ZAPPED_WAND,
                       bhitm, bhito, { obj });
        }
        await zapwrapup(); /* give feedback for obj_zapped */
    } else if (dirprop === NODIR) {
        await zapnodir(obj);
    } else {
        if (otyp === ONAMES.WAN_DIGGING || otyp === ONAMES.SPE_DIG) {
            const { zap_dig } = await import('./dig.js');
            await zap_dig();
        } else if (otyp >= ONAMES.SPE_MAGIC_MISSILE
                   && otyp <= ONAMES.SPE_FINGER_OF_DEATH) {
            await ubuzz(10 + (otyp - ONAMES.SPE_MAGIC_MISSILE),
                        Math.trunc(game.u.ulevel / 2) + 1);
        } else if (otyp >= ONAMES.WAN_MAGIC_MISSILE
                   && otyp <= ONAMES.WAN_LIGHTNING) {
            await ubuzz(otyp - ONAMES.WAN_MAGIC_MISSILE,
                        otyp === ONAMES.WAN_MAGIC_MISSILE ? 2 : 6);
        } else {
            note_unported_zap(`weffects:ray otyp=${otyp}`);
        }
        disclose = true;
    }
    if (disclose) {
        learnwand(obj);
        if (was_unkn)
            more_experienced(0, 10);
    }
}

// src/zap.c:2627 dozap() — the 'z' command.
export async function dozap() {
    /* nohands/check_capacity cannot fire for a fresh hero */
    const obj = await getobj("zap", zap_ok, 0);
    if (!obj)
        return ECMD_CANCEL;

    /* check_unpaid — shops, recorded when billing exists */

    const need_dir = game.objects[obj.otyp].oc_dir !== NODIR;
    if (!(await zappable(obj))) {
        await pline(nothing_happens);
    } else if (obj.cursed && !rn2(100)) {   /* WAND_BACKFIRE_CHANCE */
        note_unported_zap('dozap:backfire');
        return ECMD_TIME;
    } else if (!need_dir) {
        /* src/zap.c:3436 — weffects() opens with exercise(A_WIS, TRUE)
           before dispatching ANY zap effect */
        exercise(A_WIS, true);
        await zapnodir(obj);
    } else if (need_dir && !(await getdir(null))) {
        if (!game.u?.ublind)
            note_unported_zap('dozap:glows_and_fades');
        /* make him pay for knowing !NODIR */
    } else if (need_dir && !game.u.dx && !game.u.dy && !game.u.dz) {
        const damage = await zapyourself(obj, true);
        if (damage) {
            note_unported_zap('dozap:losehp');
        }
    } else {
        /* src/zap.c:3436 — weffects() exercises wisdom before the effect */
        exercise(A_WIS, true);
        await weffects(obj);
    }
    if (obj && obj.spe < 0) {
        note_unported_zap('dozap:turns_to_dust');
    } else {
        update_inventory(); /* maybe used a charge */
    }
    return ECMD_TIME;
}

// src/zap.c:3827 bhit() — walk a missile (or beam) along a line.
//
// Only the THROWN_WEAPON spine is live: the flight stops at a monster, a
// wall (!ZAP_POS), a closed door, a sink, water/lava walls or the map edge,
// and gb.bhitpos holds the last good square. The rock-skip arm draws rn2(3)
// for thrown ROCKs only. The tmp_at() flight animation frames are display
// work this port does not emit yet; recorded so the gap stays visible.
export async function bhit(ddx, ddy, range, weapon, fhitm, fhito, pobjRef) {
    const obj = pobjRef.obj;
    let result = null;

    if (weapon === KICKED_WEAPON) {
        game.bhitpos = { x: game.u.ux + ddx, y: game.u.uy + ddy };
        range--;
    } else {
        game.bhitpos = { x: game.u.ux, y: game.u.uy };
    }

    let skiprange_start = 0, allow_skip = false;
    if (weapon === THROWN_WEAPON && obj && obj.otyp === ONAMES.ROCK) {
        /* skiprange(range, ...) computes bounce points without drawing */
        skiprange_start = 1;
        allow_skip = !rn2(3);
        if (allow_skip)
            note_unported_zap('bhit:rock_skip');
    }

    note_unported_zap('bhit:tmp_at_flight');

    while (range-- > 0) {
        game.bhitpos.x += ddx;
        game.bhitpos.y += ddy;
        const x = game.bhitpos.x, y = game.bhitpos.y;

        if (!isok(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }

        const loc = game.level.at(x, y);
        const typ = loc?.typ ?? STONE;

        /* WATER aka "wall of water" stops items */
        if (typ === WATER || typ === LAVAWALL) {
            if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                break;
        }

        if ((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && typ === IRONBARS) {
            /* hits_bars() breaks some things, rn2(5) unless point-blank */
            note_unported_zap('bhit:ironbars');
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }

        if (weapon === ZAPPED_WAND) {
            /* cancellation/opening/locking/striking/probing */
            zap_map(x, y, obj);
        }

        let mtmp = m_at(x, y);
        const ttmp = t_at(x, y);
        if (!mtmp && ttmp && ttmp.ttyp === WEB
            && (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && !rn2(3)) {
            if (cansee(x, y)) {
                note_unported_zap('bhit:web_message');
                ttmp.tseen = true;
                newsym(x, y);
            }
            break;
        }

        /* a mimic pretending to be an object is not hit by thrown things */
        if (mtmp && (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && M_AP_TYPE(mtmp) === M_AP_OBJECT)
            mtmp = null;

        if (mtmp) {
            game.notonhead = (x !== mtmp.mx || y !== mtmp.my);
            if (weapon !== ZAPPED_WAND) {
                /* THROWN_WEAPON, KICKED_WEAPON; map_invisible when unseen
                   is display bookkeeping */
                result = mtmp;
                break;
            }
            /* ZAPPED_WAND */
            if (await fhitm(mtmp, obj)) {
                result = mtmp;
                break;
            }
            range -= 3;
        }
        /* C runs the pile hit on every square, monster or not */
        if (fhito) {
            if (await bhitpile(obj, fhito, x, y, 0))
                range--;
        }

        /* src/zap.c — ZAPPED_WAND door arm (opening/locking/striking)
           records inside zap_map/bhito already */

        if (!(typ >= POOL) /* !ZAP_POS(typ) */ || closed_door(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }

        if (IS_SINK(typ) && weapon !== FLASHED_LIGHT_BHIT)
            break;               /* physical objects fall onto sink */
    }

    return result;
}
const FLASHED_LIGHT_BHIT = 2;    /* include/hack.h bhit_call_types */

// src/zap.c:3556 hit() / :3571 miss() — the missile/zap contact messages.
export async function hit(str, mtmp, force) {
    const verbosely = (mtmp === game.youmonst
                       || (game.flags.verbose
                           && (cansee(game.bhitpos?.x, game.bhitpos?.y)
                               || canspotmon(mtmp) || engulfing_u(mtmp))));

    await pline(`${The(str)} ${vtense(str, 'hit')} `
                + `${verbosely ? mon_nam(mtmp) : 'it'}${force}`);
}

export async function miss(str, mtmp) {
    await pline(`${The(str)} ${vtense(str, 'miss')} `
                + `${((cansee(game.bhitpos?.x, game.bhitpos?.y)
                       || canspotmon(mtmp)) && game.flags.verbose)
                    ? mon_nam(mtmp) : 'it'}.`);
}
