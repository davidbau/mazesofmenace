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
import { newsym } from './display.js';
import { closed_door } from './cmd.js';

import { STONE, WATER, LAVAWALL, IRONBARS, IS_SINK, POOL, WEB,
         THROWN_WEAPON, KICKED_WEAPON, M_AP_TYPE, M_AP_OBJECT } from './const.js';
import { OCLASSES } from './objects_data.js';
import { DEADMONSTER } from './monst.js';
import { killed, shieldeff_mon } from './mon.js';
import { ONAMES } from './objects_data.js';
import { rn2, rnd, d } from './rng.js';
import { is_rider } from './makemon.js';
import { getobj, GETOBJ_SUGGEST, GETOBJ_EXCLUDE, update_inventory } from './invent.js';
import { getdir } from './cmd.js';
import { fall_asleep } from './timeout.js';
import { healup } from './potion.js';
import { findit } from './detect.js';
import { readobjnam } from './objnam.js';
import { getlin } from './cmd.js';
import { prinv, reorder_invent } from './invent.js';
import { makeknown, observe_object } from './o_init.js';
import { more_experienced } from './exper.js';
import { rn1 } from './rng.js';
import { pline_The, You, You_feel } from './pline.js';
import { pline } from './display.js';
import { nothing_happens, ECMD_TIME, ECMD_CANCEL, NODIR } from './const.js';

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

// src/zap.c:6314 makewish() — grant one wish.
export async function makewish() {
    if (game.flags?.verbose !== false)
        await You('may wish for an object.');

    const raw = await getlin('For what do you wish?', null);
    const wishtext = (raw === '\x1b' || raw === '\u001b') ? ''
                     : String(raw).replace(/\s+/g, ' ').trim();
    const otmp = readobjnam(wishtext);
    if (otmp === 'nothing')
        return;                         /* declined; keeps wishless conduct */
    if (!otmp) {
        /* C allows MAXWISHTRY retries then falls back to a random object;
           the retry loop re-reads a line, so record rather than guess */
        await pline('Nothing fitting that description exists in the game.');
        note_unported_zap('makewish:retry');
        return;
    }

    /* wish history and livelog carry no draws */

    /* hold_another_object(): into inventory with the new letter shown */
    const used = new Set((game.invent || []).map(o => o.invlet));
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const ch of letters)
        if (!used.has(ch)) { otmp.invlet = ch; break; }
    otmp.where = 3;                     /* OBJ_INVENT */
    (game.invent ||= []).push(otmp);
    reorder_invent();                   /* invlet_constant keeps rank order */
    update_inventory();
    await prinv(null, otmp, 0);

    game.u.ublesscnt = (game.u.ublesscnt || 0) + rn1(100, 50);
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
        /* weffects(): the directional/beam engine, recorded */
        note_unported_zap(`dozap:weffects otyp=${obj.otyp}`);
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
export function bhit(ddx, ddy, range, weapon, fhitm, fhito, pobjRef) {
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
            /* map_invisible when unseen is display bookkeeping */
            result = mtmp;
            break;
        }

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
