// apply.js — the 'a' command.
// C ref: src/apply.c

import { game } from './gstate.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, CQ_CANNED, GETOBJ_NOFLAGS,
         nothing_happens, M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT,
         M_AP_MONSTER, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_INVISIBLE, nothing_seems_to_happen } from './const.js';
import { carrying, getobj, update_inventory, useupall, weight } from './invent.js';
import { getdir, get_adjacent_loc, cmdq_add_ec, cmdq_add_key } from './cmd.js';
import { pick_lock } from './lock.js';
import { is_pick, is_axe, delobj, m_at, seemimic, wake_nearby } from './mon.js';
import { is_pole } from './u_init.js';
import { ECMD_FAIL } from './const.js';
import { Blind, Hallucination, Deaf, Underwater } from './youprop.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE } from './invent.js';
import { OCLASSES } from './objects_data.js';
import { mstatusline, ustatusline } from './insight.js';
import { You_cant, You_hear } from './pline.js';
import { rn2, rnd } from './rng.js';
import { isok, ACCESSIBLE, IS_STWALL, IS_DOOR, D_ISOPEN } from './const.js';
import { walk_path } from './dothrow.js';
import { closed_door } from './cmd.js';
import { sobj_at } from './invent.js';
import { ONAMES } from './objects_data.js';
import { pline } from './display.js';
import { You, There } from './pline.js';
import { dist2 } from './hacklib.js';
import { cansee } from './vision.js';
import { wield_tool } from './wield.js';
import { body_part } from './polyself.js';
import { FACE } from './const.js';
import { OBJ_NAME, The, Tobjnam, xname, yname, the, makeplural,
         vtense } from './objnam.js';
import { pmname, x_monnam } from './do_name.js';
import { defsyms } from './drawing_data.js';
import { is_boots, is_gloves } from './obj.js';
import { splitobj } from './mkobj.js';
import { nohands } from './mondata.js';
import { check_capacity, invocation_pos } from './hack.js';
import { tty_yn_function } from './tty/topl.js';
import { makeknown } from './o_init.js';

function note_unported_apply(what) {
    (game.unported ||= new Set()).add(what);
}

/* src/apply.c:4285 — the lock tools. pick_lock() reaches get_adjacent_loc(),
   so applying one consumes a DIRECTION key. Missing that left the direction to
   run as a movement command, which is exactly what made an earlier attempt at
   this command cost seed0077 a screen: its rogue applies item `e`, the lock
   pick, and the `j` after it is a direction in C and a move in ours. */
const LOCK_TOOLS = [ONAMES.LOCK_PICK, ONAMES.CREDIT_CARD, ONAMES.SKELETON_KEY];

/* src/apply.c — these five reach getdir() through use_whip, use_stethoscope,
   use_mirror, use_camera and use_figurine. */
const NEEDS_DIR = [ONAMES.BULLWHIP, ONAMES.MIRROR,
                   ONAMES.EXPENSIVE_CAMERA, ONAMES.FIGURINE];

/* src/apply.c:4344 — use_lamp() is void, so doapply's `int res = ECMD_TIME`
   survives and applying a lamp takes a turn. */
const LAMPS = [ONAMES.OIL_LAMP, ONAMES.MAGIC_LAMP, ONAMES.BRASS_LANTERN];

const MUSICAL_INSTRUMENTS = [
    ONAMES.WOODEN_FLUTE, ONAMES.MAGIC_FLUTE, ONAMES.TOOLED_HORN,
    ONAMES.FROST_HORN, ONAMES.FIRE_HORN, ONAMES.WOODEN_HARP,
    ONAMES.MAGIC_HARP, ONAMES.BUGLE, ONAMES.LEATHER_DRUM,
    ONAMES.DRUM_OF_EARTHQUAKE,
];

/* src/apply.c:4268 ordinary containers open the same interaction used by
   #loot.  A bag of tricks has its own effect and is intentionally omitted. */
const APPLIED_CONTAINERS = [ONAMES.LARGE_BOX, ONAMES.CHEST, ONAMES.ICE_BOX,
                            ONAMES.SACK, ONAMES.BAG_OF_HOLDING,
                            ONAMES.OILSKIN_SACK];

function on_stairs_at_u() {
    for (let stway = game.stairs; stway; stway = stway.next)
        if (stway.sx === game.u.ux && stway.sy === game.u.uy)
            return true;
    return false;
}

// src/apply.c:1628 use_lamp(), including begin_burn/end_burn's permanent
// magic-lamp path. Oil-lamp and lantern fuel timers are not represented yet,
// but their on/off state and light source still match until fuel expires.
async function use_lamp(obj) {
    const lamp = obj.otyp === ONAMES.BRASS_LANTERN ? 'lantern' : 'lamp';
    const { new_light_source, del_light_source, LS_OBJECT } =
        await import('./light.js');

    if (obj.lamplit) {
        await pline(`Your ${lamp} is now off.`);
        del_light_source(LS_OBJECT, obj.o_id);
        obj.lamplit = 0;
        game.vision_full_recalc = 1;
        update_inventory();
        return;
    }
    if (Underwater()) {
        await pline('This is not a diving lamp.');
        return;
    }
    if ((obj.otyp !== ONAMES.MAGIC_LAMP && !obj.age)
        || (obj.otyp === ONAMES.MAGIC_LAMP && !obj.spe)) {
        if (obj.otyp === ONAMES.BRASS_LANTERN)
            await pline(game.u.ublind ? nothing_seems_to_happen
                                      : 'Your lantern is out of power.');
        else
            await pline(`This ${lamp} has no oil.`);
        return;
    }
    if (obj.cursed && !rn2(2)) {
        if (obj.otyp !== ONAMES.BRASS_LANTERN && !rn2(3)) {
            note_unported_apply('use_lamp:oil_spill');
            await pline('The lamp spills and covers your fingers with oil.');
        } else if (!game.u.ublind) {
            await pline(`Your ${lamp} flickers for a moment, then dies.`);
        } else {
            await pline(nothing_seems_to_happen);
        }
        return;
    }

    await pline(`Your ${lamp} is now on.`);
    obj.lamplit = 1;
    if (obj.otyp !== ONAMES.MAGIC_LAMP)
        note_unported_apply('use_lamp:fuel_timer');
    new_light_source(game.u.ux, game.u.uy, 3, LS_OBJECT, obj.o_id);
    game.vision_full_recalc = 1;
    update_inventory();
}

// src/apply.c:1319 use_candelabrum(). Burn timers are not represented yet,
// but the object's fuel checkpoint, light source, messages, and state are.
async function use_candelabrum(obj) {
    const s = obj.spe !== 1 ? 'candles' : 'candle';
    const { new_light_source, del_light_source, LS_OBJECT } =
        await import('./light.js');

    if (obj.lamplit) {
        await You(`snuff the ${s}.`);
        del_light_source(LS_OBJECT, obj.o_id);
        obj.lamplit = 0;
        game.vision_full_recalc = 1;
        update_inventory();
        return;
    }
    if (obj.spe <= 0) {
        await pline(`This ${xname(obj)} has no ${s}.`);
        if ((game.invent || []).some((otmp) =>
            otmp.otyp === ONAMES.WAX_CANDLE
            || otmp.otyp === ONAMES.TALLOW_CANDLE)) {
            await pline(`To attach candles, apply them instead of the ${xname(obj)}.`);
        }
        return;
    }
    if (Underwater()) {
        await You('cannot make fire under water.');
        return;
    }
    if (game.u.uswallow || obj.cursed) {
        if (!Blind())
            await pline(`The ${s} ${vtense(s, 'flicker')} for a moment, then ${vtense(s, 'die')}.`);
        return;
    }
    if (obj.spe < 7) {
        await There(`${vtense(s, 'are')} only ${obj.spe} ${s} in ${the(xname(obj))}.`);
        if (!Blind()) {
            await pline(`${obj.spe === 1 ? 'It is' : 'They are'} lit.  ${
                obj.spe === 1 ? 'It shines' : 'They shine'} dimly.`);
        }
    } else {
        await pline(`${The(xname(obj))}'s ${s} burn${Blind() ? '.' : ' brightly!'}`);
    }

    if (!invocation_pos(game.u.ux, game.u.uy) || on_stairs_at_u()) {
        await pline(`The ${s} ${vtense(s, 'are')} being rapidly consumed!`);
        obj.age = Math.max(1, Math.trunc(((obj.age || 0) + 1) / 2));
    } else {
        if (obj.spe === 7) {
            await pline(`${The(xname(obj))} ${Blind()
                ? 'radiates a strange warmth' : 'glows with a strange light'}!`);
        }
        obj.known = 1;
    }

    obj.lamplit = 1;
    if ((obj.age || 0) > 75)
        obj.age = 75;
    const radius = obj.spe < 4 ? 2 : obj.spe < 7 ? 3 : 4;
    new_light_source(game.u.ux, game.u.uy, radius, LS_OBJECT, obj.o_id);
    game.vision_full_recalc = 1;
    update_inventory();
}

// src/apply.c:1200 use_bell(). The charged invocation path is complete;
// unrelated charged effects remain recorded until their object interactions
// are ported.
async function use_bell(obj) {
    const ordinary = obj.otyp !== ONAMES.BELL_OF_OPENING || !obj.spe;
    const invoking = obj.otyp === ONAMES.BELL_OF_OPENING
        && invocation_pos(game.u.ux, game.u.uy) && !on_stairs_at_u();
    let learn = false;
    let wake = false;

    await You(`ring ${the(xname(obj))}.`);

    if (Underwater() || (game.u.uswallow && ordinary)) {
        await pline('But the sound is muffled.');
    } else if (invoking && ordinary) {
        await pline('But it makes no sound.');
        learn = true;
    } else if (ordinary) {
        if (obj.cursed && !rn2(4))
            note_unported_apply('use_bell:cursed_summoning');
        wake = true;
    } else {
        obj.spe--;
        if (game.u.uswallow) {
            note_unported_apply('use_bell:swallowed_opening');
        } else if (obj.cursed) {
            note_unported_apply('use_bell:summon_undead');
            wake = true;
        } else if (invoking) {
            await pline(`${Tobjnam(obj, 'issue')} an unsettling shrill sound...`);
            obj.age = game.moves;
            learn = true;
            wake = true;
        } else {
            note_unported_apply(obj.blessed ? 'use_bell:openit'
                                            : 'use_bell:findit');
        }
    }

    if (learn) {
        makeknown(ONAMES.BELL_OF_OPENING);
        obj.known = 1;
    }
    if (wake)
        wake_nearby(true);
    update_inventory();
}

// src/apply.c:1399 use_candle(), including attaching candles to the
// Candelabrum of Invocation.
async function use_candle(obj) {
    if (game.u.uswallow) {
        await You('have no elbow-room to maneuver.');
        return;
    }

    const candelabrum = carrying(ONAMES.CANDELABRUM_OF_INVOCATION);
    if (!candelabrum || candelabrum.spe === 7) {
        note_unported_apply('use_candle:lamp_path');
        return;
    }

    if ((await tty_yn_function(
        `Attach ${yname(obj)} to ${yname(candelabrum)}?`, 'yn', 'n')) !== 'y') {
        note_unported_apply('use_candle:declined_lamp_path');
        return;
    }

    const room = 7 - candelabrum.spe;
    if (obj.quan > room)
        obj = splitobj(obj, room);

    const count = obj.quan;
    const s = count !== 1 ? 'candles' : 'candle';
    await You(`attach ${count}${candelabrum.spe ? ' more' : ''} ${s} to ${
        the(xname(candelabrum))}.`);
    if (!candelabrum.spe || candelabrum.age > obj.age)
        candelabrum.age = obj.age;
    candelabrum.spe += count;
    useupall(obj);
    candelabrum.owt = weight(candelabrum);
    update_inventory();
}

// src/apply.c:4151 apply_ok() — the getobj filter for 'a'.
//
// The graystone dknown/touchstone refinement needs discovery state that is
// live, so it is ported whole; the final arm is EXCLUDE_SELECTABLE, which
// keeps unlisted items pickable via '*' with "Sorry, I don't know how to use
// that." when one is forced.
/* include/obj.h is_graystone() */
const is_graystone = (o) =>
    o.otyp === ONAMES.LUCKSTONE || o.otyp === ONAMES.LOADSTONE
    || o.otyp === ONAMES.FLINT || o.otyp === ONAMES.TOUCHSTONE;

// src/write.c:61 write_ok() selects blank scrolls and spellbooks first.
function write_ok(obj) {
    if (!obj || (obj.oclass !== OCLASSES.SCROLL_CLASS
                 && obj.oclass !== OCLASSES.SPBOOK_CLASS))
        return GETOBJ_EXCLUDE;
    if (obj.otyp === ONAMES.SCR_BLANK_PAPER
        || obj.otyp === ONAMES.SPE_BLANK_PAPER)
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// src/apply.c:1772 rub_ok(): objects accepted by #rub.
export function rub_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (obj.otyp === ONAMES.OIL_LAMP || obj.otyp === ONAMES.MAGIC_LAMP
        || obj.otyp === ONAMES.BRASS_LANTERN || is_graystone(obj)
        || obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/apply.c:1785 dorub(): the #rub command.
export async function dorub() {
    const obj = await getobj('rub', rub_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    if (obj.oclass === OCLASSES.GEM_CLASS
        || obj.oclass === OCLASSES.FOOD_CLASS) {
        note_unported_apply(is_graystone(obj) ? 'dorub:use_stone'
                                             : 'dorub:use_royal_jelly');
        await pline("Sorry, I don't know how to use that.");
        return ECMD_OK;
    }
    if (obj !== game.u.uwep) {
        if (await wield_tool(obj, 'rub')) {
            cmdq_add_ec(CQ_CANNED, dorub);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    if (obj.otyp === ONAMES.MAGIC_LAMP) {
        if (obj.spe > 0 && !rn2(3)) {
            note_unported_apply('dorub:djinni_from_bottle');
        } else if (rn2(2)) {
            await You(`${game.u.ublind ? 'smell' : 'see a puff of'} smoke.`);
        } else {
            await pline(nothing_happens);
        }
    } else if (obj.otyp === ONAMES.BRASS_LANTERN) {
        await pline('Rubbing the electric lamp is not particularly rewarding.');
        await pline('Anyway, nothing exciting happens.');
    } else {
        await pline(nothing_happens);
    }
    return ECMD_TIME;
}

export function apply_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* all tools, all wands (breaking), all spellbooks (flipping through) */
    if (obj.oclass === OCLASSES.TOOL_CLASS || obj.oclass === OCLASSES.WAND_CLASS
        || obj.oclass === OCLASSES.SPBOOK_CLASS)
        return GETOBJ_SUGGEST;

    /* applying coins to flip them is a minor easter egg */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_DOWNPLAY;

    /* certain weapons */
    if (obj.oclass === OCLASSES.WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === ONAMES.BULLWHIP))
        return GETOBJ_SUGGEST;

    if (obj.oclass === OCLASSES.POTION_CLASS) {
        /* permit applying unknown potions, but don't suggest them */
        if (!obj.dknown || !game.objects[obj.otyp].oc_name_known)
            return GETOBJ_DOWNPLAY;

        /* only applicable potion is oil, suggested once discovered */
        if (obj.otyp === ONAMES.POT_OIL)
            return GETOBJ_SUGGEST;
    }

    /* certain foods */
    if (obj.otyp === ONAMES.CREAM_PIE || obj.otyp === ONAMES.EUCALYPTUS_LEAF
        || obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;

    if (obj.otyp === ONAMES.BANANA && Hallucination())
        return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        if (!obj.dknown)
            return GETOBJ_SUGGEST;

        if (obj.otyp !== ONAMES.TOUCHSTONE
            && (game.objects[ONAMES.TOUCHSTONE].oc_name_known
                || game.objects[obj.otyp].oc_name_known))
            return GETOBJ_EXCLUDE_SELECTABLE;

        return GETOBJ_SUGGEST;
    }

    return GETOBJ_EXCLUDE_SELECTABLE;
}

// src/apply.c:3568 use_cream_pie(): apply a pie to the hero's face.
async function use_cream_pie(obj) {
    const wasblind = !!game.u.ublind;
    const wascreamed = !!game.u.ucreamed;
    const several = obj.quan > 1;
    if (several)
        obj = splitobj(obj, 1);
    const pie_name = the(xname(obj));

    if (Hallucination()) {
        await You('give yourself a facial.');
    } else {
        await You(`immerse your ${body_part(FACE)} in `
                  + `${several ? 'one of ' : ''}`
                  + `${several ? makeplural(pie_name) : pie_name}.`);
    }

    const blindinc = rnd(25);
    game.u.ucreamed = (game.u.ucreamed || 0) + blindinc;
    const intr = (game.u.intrinsic ||= {});
    intr.HBlinded = (intr.HBlinded || 0) + blindinc;
    game.u.ublind = 1;
    game.vision_full_recalc = 1;
    (game.disp ||= {}).botl = true;
    if (!game.u.ublind || (game.u.ublind && wasblind)) {
        await pline(`There's ${wascreamed ? 'more ' : ''}sticky goop all over `
                    + `your ${body_part(FACE)}.`);
    } else {
        await You_cant(`see through all the sticky goop on your `
                       + `${body_part(FACE)}.`);
    }

    delobj(obj);
    return ECMD_OK;
}

// src/apply.c:318 use_stethoscope() — apply a stethoscope.
//
// THE TIME RULE: the first use in a hero turn is free; the second in the
// same turn costs the move (hero_seq vs context.stethoscope_seq). The
// engulfed-interference rn2 cannot fire (no engulfing yet); the steed,
// swallow, dz (floor/ceiling) and monster arms are recorded; the cursed
// heartbeat coin-flip rn2(2) is real.
async function use_stethoscope(obj) {
    /* nohands/freehand: un-polymorphed hero with free hands; a welded
       two-hander would matter and is recorded */
    if (Deaf()) {
        await You_cant("hear anything!");
        return ECMD_OK;
    }
    if (game.u.uwep && game.u.uwep.cursed && game.u.uwep.bknown)
        note_unported_apply('use_stethoscope:freehand');

    if (!await getdir(null))
        return ECMD_CANCEL;

    const res = (game.hero_seq === game.context.stethoscope_seq)
        ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = game.hero_seq;

    if (game.u.usteed && game.u.dz > 0) {
        note_unported_apply('use_stethoscope:steed');
        return res;
    }
    if (game.u.dz) {
        note_unported_apply('use_stethoscope:dz');
        return res;
    }
    if (obj.cursed && !rn2(2)) {
        await You_hear("your heart beat.");
        return res;
    }
    /* confdir(FALSE) is a no-op for an unimpaired hero */
    if (game.u.uprops?.CONFUSION?.intrinsic || game.u.uprops?.STUNNED?.intrinsic)
        note_unported_apply('use_stethoscope:confdir');
    if (!game.u.dx && !game.u.dy) {
        await ustatusline();
        return res;
    }
    const rx = game.u.ux + game.u.dx, ry = game.u.uy + game.u.dy;
    if (!isok(rx, ry)) {
        await You_hear("a faint typing noise.");
        return ECMD_OK;
    }
    const mtmp = m_at(rx, ry);
    if (mtmp) {
        if (mtmp.mundetected) {
            note_unported_apply('use_stethoscope:hidden_monster');
            mtmp.mundetected = 0;
        } else if (mtmp.mappearance) {
            let what = 'thing', use_plural = false;
            switch (M_AP_TYPE(mtmp)) {
            case M_AP_OBJECT: {
                const otyp = mtmp.mappearance;
                const fake = { otyp, oclass: game.objects[otyp]?.oc_class };
                what = OBJ_NAME(game.objects[otyp]) || 'thing';
                use_plural = is_boots(fake) || is_gloves(fake)
                             || otyp === ONAMES.LENSES;
                break;
            }
            case M_AP_MONSTER:
                what = pmname(game.mons[mtmp.mappearance], mtmp.female ? 1 : 0);
                break;
            case M_AP_FURNITURE:
                what = defsyms[mtmp.mappearance]?.explain || 'thing';
                break;
            }
            seemimic(mtmp);
            const mnm = x_monnam(mtmp, ARTICLE_A, null,
                                 SUPPRESS_IT | SUPPRESS_INVISIBLE, false);
            await pline(`${use_plural ? 'Those' : 'That'} ${what} `
                        + `${use_plural ? 'are' : 'is'} really ${mnm}.`);
        }
        await mstatusline(mtmp);
        return res;
    }
    await You('hear nothing special.');
    return res;
}

// src/apply.c doapply() — the 'a' command.
export async function doapply() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to use or apply tools in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;

    const obj = await getobj('use or apply', apply_ok, 0);

    if (!obj)
        return ECMD_OK; /* ECMD_CANCEL */

    if (LOCK_TOOLS.includes(obj.otyp)) {
        /* src/apply.c:4288 — ECMD_TIME when pick_lock() did anything at all
           (learned something or started picking), ECMD_OK otherwise */
        return (await pick_lock(obj, 0, 0, null)) !== 0 ? ECMD_TIME : ECMD_OK;
    }

    if (obj.otyp === ONAMES.STETHOSCOPE)
        return await use_stethoscope(obj);

    if (obj.otyp === ONAMES.CREAM_PIE)
        return await use_cream_pie(obj);

    if (obj.otyp === ONAMES.MAGIC_MARKER) {
        /* src/write.c dowrite(): selecting the paper is the entire observed
           path when the player chooses an ineligible inventory letter. */
        const paper = await getobj('write on', write_ok, GETOBJ_NOFLAGS);
        if (!paper)
            return ECMD_CANCEL;
        note_unported_apply('dowrite:paper');
        return ECMD_TIME;
    }

    if (NEEDS_DIR.includes(obj.otyp)) {
        if (!await getdir(null))
            return ECMD_OK;
        note_unported_apply(`apply:dir otyp=${obj.otyp}`);
        return ECMD_TIME;
    }

    if (LAMPS.includes(obj.otyp)) {
        await use_lamp(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.BELL || obj.otyp === ONAMES.BELL_OF_OPENING) {
        await use_bell(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
        await use_candelabrum(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.WAX_CANDLE || obj.otyp === ONAMES.TALLOW_CANDLE) {
        await use_candle(obj);
        return ECMD_TIME;
    }

    if (MUSICAL_INSTRUMENTS.includes(obj.otyp)) {
        const { do_play_instrument } = await import('./music.js');
        return await do_play_instrument(obj);
    }

    if (APPLIED_CONTAINERS.includes(obj.otyp)) {
        const { use_container } = await import('./pickup.js');
        return await use_container(obj, true, false);
    }

    /* src/apply.c doapply's switch: an otyp with a real case whose handler
       is not ported yet is recorded; anything else falls to C's default
       arm, which is fully defined: pole-arms and diggers get their use
       functions, everything else is refused with a message. */
    if (APPLY_CASED_OTYPS.has(obj.otyp)) {
        note_unported_apply(`apply:otyp=${obj.otyp}`);
        return ECMD_OK;
    }
    if (is_pole(obj)) {
        note_unported_apply('apply:use_pole');
        return ECMD_OK;
    }
    if (is_pick(obj) || is_axe(obj)) {
        note_unported_apply('apply:use_pick_axe');
        return ECMD_OK;
    }
    await pline("Sorry, I don't know how to use that.");
    return ECMD_FAIL;
}

/* src/apply.c:4280 — the otyps doapply's switch names explicitly */
const APPLY_CASED_OTYPS = new Set([
    'BLINDFOLD', 'LENSES', 'CREAM_PIE', 'LUMP_OF_ROYAL_JELLY', 'BULLWHIP',
    'GRAPPLING_HOOK', 'LARGE_BOX', 'CHEST', 'ICE_BOX', 'SACK',
    'BAG_OF_HOLDING', 'OILSKIN_SACK', 'BAG_OF_TRICKS', 'CAN_OF_GREASE',
    'LOCK_PICK', 'CREDIT_CARD', 'SKELETON_KEY', 'PICK_AXE',
    'DWARVISH_MATTOCK', 'TINNING_KIT', 'LEASH', 'SADDLE', 'MAGIC_WHISTLE',
    'TIN_WHISTLE', 'EUCALYPTUS_LEAF', 'STETHOSCOPE', 'MIRROR', 'BELL',
    'BELL_OF_OPENING', 'CANDELABRUM_OF_INVOCATION', 'WAX_CANDLE',
    'TALLOW_CANDLE', 'OIL_LAMP', 'MAGIC_LAMP', 'BRASS_LANTERN', 'POT_OIL',
    'EXPENSIVE_CAMERA', 'TOWEL', 'CRYSTAL_BALL', 'MAGIC_MARKER',
    'TIN_OPENER', 'FIGURINE', 'UNICORN_HORN', 'WOODEN_FLUTE', 'MAGIC_FLUTE',
    'TOOLED_HORN', 'FROST_HORN', 'FIRE_HORN', 'WOODEN_HARP', 'MAGIC_HARP',
    'BUGLE', 'LEATHER_DRUM', 'DRUM_OF_EARTHQUAKE', 'HORN_OF_PLENTY',
    'LAND_MINE', 'BEARTRAP', 'FLINT', 'LUCKSTONE', 'LOADSTONE',
    'TOUCHSTONE', 'BANANA',
].map((k) => ONAMES[k]).filter((v) => v !== undefined));


// src/apply.c:1997 is_valid_jump_pos() — can the hero jump to <x,y>?
//
// The first arm is the one every recorded jump takes: without a jumping
// intrinsic the destination must be a knight's move away, distu == 5. The
// door-trajectory tail (which decides whether a diagonal jump can leave or
// enter a doorway) is recorded.
/* src/apply.c:1997 — C prints inline and returns FALSE. Our pline is async
   and get_valid_jump_position() is called from a sync path, so the test
   returns the reason C would have printed (null when the jump is legal) and
   the caller with a message to give prints it. The tests and their order are
   C's exactly. */
export function jump_pos_failure(x, y, magic) {
    const distu = dist2(x, y, game.u.ux, game.u.uy);

    if (!magic && !game.u.uprops?.JUMPING && distu !== 5)
        return { pline: 'Illegal move!' };
    if (distu > (magic ? 6 + magic * 3 : 9))
        return { pline: 'Too far!' };
    if (!isok(x, y))
        return { You: 'cannot jump there!' };
    if (!cansee(x, y))
        return { You: 'cannot see where to land!' };

    /* src/apply.c:2003 — classify the trajectory so the door checks below
       can tell a horizontal jump from a vertical one. Knight's moves and
       other irregular directions are flattened onto the nearest axis. */
    const dx = x - game.u.ux, dy = y - game.u.uy;
    let ax = Math.abs(dx), ay = Math.abs(dy);
    const diag = (magic || game.u.uprops?.PASSES_WALLS || (!dx && !dy)) ? jAny
               : !dy ? jHorz : !dx ? jVert : jDiag;
    if (ax >= 2 * ay)
        ay = 0;
    else if (ay >= 2 * ax)
        ax = 0;
    const traj = (magic || game.u.uprops?.PASSES_WALLS || (!ax && !ay)) ? jAny
               : !ay ? jHorz : !ax ? jVert : jDiag;

    const lev = game.level?.at(game.u.ux, game.u.uy);
    if (diag === jDiag && IS_DOOR(lev?.typ) && (lev.doormask & D_ISOPEN))
        return { You_cant: 'jump diagonally out of a doorway.' };
    if (!walk_path({ x: game.u.ux, y: game.u.uy }, { x, y },
                   check_jump, traj))
        return { There: 'is an obstacle preventing that jump.' };
    return null;
}

// src/apply.c:2065 — the caller that wants the messages.
export async function is_valid_jump_pos(x, y, magic, showmsg) {
    const fail = jump_pos_failure(x, y, magic);
    if (!fail)
        return true;
    if (showmsg) {
        if (fail.pline) await pline(fail.pline);
        else if (fail.You) await You(fail.You);
        else if (fail.You_cant) await You_cant(fail.You_cant);
        else if (fail.There) await There(fail.There);
    }
    return false;
}

/* src/apply.c:1975 — the jump trajectory classes. */
const jAny = 0, jHorz = 1, jVert = 2, jDiag = 3;

// src/apply.c:1980 check_jump() — walk_path's per-square callback.
function check_jump(traj, x, y) {
    const lev = game.level?.at(x, y);

    if (game.u.uprops?.PASSES_WALLS)
        return true;
    if (IS_STWALL(lev?.typ))
        return false;
    if (IS_DOOR(lev?.typ)) {
        if (closed_door(x, y))
            return false;
        if ((lev.doormask & D_ISOPEN) && traj !== jAny
            && (traj === jDiag
                || ((traj & jHorz) !== 0) === (!!lev.horizontal)))
            return false;
        /* empty doorways aren't restricted */
    }
    if (sobj_at(ONAMES.BOULDER, x, y))
        return false;                   /* throws_rocks: no giant hero here */
    return true;
}

// src/apply.c:2035 get_valid_jump_position()
export function get_valid_jump_position(x, y) {
    return isok(x, y)
           && (ACCESSIBLE(game.level?.at(x, y)?.typ)
               || game.u.uprops?.PASSES_WALLS)
           && !jump_pos_failure(x, y, game.jumping_is_magic);
}
