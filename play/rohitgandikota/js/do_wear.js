// do_wear.js — wearing and taking off armour.
// C ref: src/do_wear.c
//
// Initial u.uac is 0 when the first startup status is drawn. u_init's later
// find_ac() computes the real value before welcome and moveloop paging.

import { W_ARMOR, GETOBJ_SUGGEST, GETOBJ_EXCLUDE } from './const.js';
import { obj_resists } from './zap.js';
import { selftouch } from './trap.js';
import { shirt_simple_name, shield_simple_name, vtense } from './objnam.js';
import { urgent_pline } from './display.js';
import { artifact_light } from './artifact.js';
import { end_burn } from './timeout.js';
import { setnotworn } from './worn.js';
import { game } from './gstate.js';
import { mons } from './monst_data.js';
import { objects, ONAMES, OCLASSES } from './objects_data.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_TOOL,
         W_RINGL, W_RINGR, W_AMUL, W_WEP, W_SWAPWEP, W_QUIVER, AC_MAX,
         W_WEAPONS, ECMD_TIME, TT_BEARTRAP, TT_INFLOOR, I_SPECIAL,
         WORN_ARMOR, WORN_CLOAK, WORN_SHIRT, WORN_HELMET, WORN_GLOVES,
         WORN_SHIELD, WORN_BOOTS, WORN_AMUL, WORN_BLINDF,
         LEFT_RING, RIGHT_RING, TIMEOUT, A_STR, A_INT, A_WIS, A_DEX, A_CON,
         A_CHA, A_CURRENT, A_CHAOTIC, A_LAWFUL, A_NEUTRAL, NH_BLACK,
         INTRINSIC, HEAD, HAND, FINGER, CQ_CANNED, st_corpse,
         st_petrifies, MENU_TRADITIONAL, MENU_COMBINATION, MENU_FULL,
         MENU_PARTIAL,
         Is_airlevel, Is_astralevel } from './const.js';
import { setworn } from './worn.js';
import { welded, is_sword, setuwep, setuswapwep, setuqwep, empty_handed }
    from './wield.js';
import { bimanual, is_metallic } from './obj.js';
import { nolimbs, nohands, touch_petrifies, verysmall } from './mondata.js';
import { sgn } from './hacklib.js';
import { erode_obj, float_down, is_flammable, is_rustprone, is_crackable, is_rottable,
         is_corrodeable, is_damageable } from './trap.js';
import { curse, erosion_matters, set_bknown } from './mkobj.js';
import { rn1, rn2, rnd } from './rng.js';
import { ERODE_BURN, ERODE_RUST, ERODE_CRACK, ERODE_ROT, ERODE_CORRODE,
         ERODE_NONE, EF_PAY, EF_DESTROY, ER_NOTHING,
         ER_DESTROYED } from './const.js';
import { set_occupation, stop_occupation } from './allmain.js';
import { newsym, pline, see_monsters } from './display.js';
import { There, You, You_feel, You_cant, Your } from './pline.js';
import { an, xname, doname, the, Tobjnam, gloves_simple_name,
         boots_simple_name, suit_simple_name, Yname2, makeplural,
         makesingular, otense, corpse_xname, CXN_NOCORPSE,
         CXN_NOARTICLE, CXN_SINGULAR } from './objnam.js';
import { makeknown, observe_object } from './o_init.js';
import { hcolor } from './do_name.js';
import { ART_OGRESMASHER } from './artilist_data.js';
import { cmdq_pop } from './cmd.js';
import { CMDQ_KEY, ECMD_FAIL } from './const.js';
import { prinv, update_inventory, useup, ECMD_OK, display_inventory, xprname }
    from './invent.js';
import { nomul, spoteffects, unmul } from './hack.js';
import { tty_yn_function } from './tty/topl.js';
import { ACURR, adjalign, change_luck, encumber_msg, Fast,
         Very_fast } from './attrib.js';
import { paranoia_bits, PARANOID_REMOVE } from './options.js';
import { Blind, Flying, Glib, Hallucination, Invis, Levitation,
         Protection_from_shape_changers, See_invisible } from './youprop.js';
import { body_part, change_sex, poly_gender } from './polyself.js';
import { def_oc_syms } from './drawing_data.js';
import { surface } from './dungeon.js';





const OCLASSES_ARMOR = OCLASSES.ARMOR_CLASS;
const OCLASSES_RING = OCLASSES.RING_CLASS;
const OCLASSES_AMULET = OCLASSES.AMULET_CLASS;

export function worn(mask) {
    return (game.invent || []).find(o => (o.owornmask & mask) !== 0) || null;
}

// include/obj.h:126 greatest_erosion()
export function greatest_erosion(obj) {
    const a = obj.oeroded || 0, b = obj.oeroded2 || 0;
    return a > b ? a : b;
}

// include/hack.h:1526 ARM_BONUS(). include/objclass.h:102 aliases a_ac onto
// the oc_oc1 union member, which is the name the generated table carries.
export function ARM_BONUS(obj) {
    const a_ac = objects[obj.otyp].oc_oc1;
    return a_ac + (obj.spe || 0) - Math.min(greatest_erosion(obj), a_ac);
}

// src/do_wear.c:1500 find_ac()
export function find_ac() {
    const u = game.u;
    let uac = mons[u.umonnum ?? 0].ac;   /* base AC for the current form */

    for (const mask of [W_ARM, W_ARMC, W_ARMH, W_ARMF, W_ARMS, W_ARMG, W_ARMU]) {
        const obj = worn(mask);
        if (obj) uac -= ARM_BONUS(obj);
    }
    for (const mask of [W_RINGL, W_RINGR]) {
        const obj = worn(mask);
        if (obj && obj.otyp === ONAMES.RIN_PROTECTION) uac -= (obj.spe || 0);
    }
    const amul = worn(W_AMUL);
    if (amul && amul.otyp === ONAMES.AMULET_OF_GUARDING) uac -= 2;

    if (((u.intrinsic?.HProtection || 0) & INTRINSIC) !== 0)
        uac -= (u.ublessed || 0);
    uac -= (u.uspellprot || 0);

    if (Math.abs(uac) > AC_MAX) uac = sgn(uac) * AC_MAX;

    if (uac !== u.uac) {
        u.uac = uac;
        game.disp = game.disp || {};
        game.disp.botl = true;
    }
}

// src/do_wear.c:2528 glibr(), the once-per-turn slippery-fingers drop.
export async function glibr() {
    const u = game.u;
    const urighty = (u.uhandedness ?? 0) === 0;
    const uwep = u.uwep;
    let xfl = 0, wastwoweap = false, otherwep = null;

    const leftfall = !!u.uleft && !u.uleft.cursed
        && (!uwep || !(welded(uwep) && !urighty) || !bimanual(uwep));
    const rightfall = !!u.uright && !u.uright.cursed
        && (!uwep || !(welded(uwep) && urighty) || !bimanual(uwep));
    const { dropx, canletgo } = await import('./do.js');
    const { cmdq_clear } = await import('./cmd.js');

    if (!u.uarmg && (leftfall || rightfall)
        && !nolimbs(game.youmonst.data)) {
        await Your(`${leftfall && rightfall ? 'rings slip' : 'ring slips'} `
                   + `off your ${leftfall && rightfall
                       ? 'fingers' : body_part(FINGER)}.`);
        xfl++;
        if (leftfall) {
            const obj = u.uleft;
            await Ring_off(obj);
            await dropx(obj);
            cmdq_clear(CQ_CANNED);
        }
        if (rightfall) {
            const obj = u.uright;
            await Ring_off(obj);
            await dropx(obj);
            cmdq_clear(CQ_CANNED);
        }
    }

    let obj = u.uswapwep;
    if (u.twoweap && obj) {
        const { weapon_descr } = await import('./weapon.js');
        otherwep = is_sword(obj) ? 'sword' : weapon_descr(obj);
        if (obj.quan > 1)
            otherwep = makeplural(otherwep);
        const hand = body_part(HAND);
        const which = urighty ? 'left ' : 'right ';
        await Your(`${otherwep} ${xfl ? 'also ' : ''}`
                   + `${otense(obj, 'slip')} from your ${which}${hand}.`);
        xfl++;
        wastwoweap = true;
        setuswapwep(null);
        cmdq_clear(CQ_CANNED);
        if (canletgo(obj, ''))
            await dropx(obj);
    }

    obj = u.uwep;
    if (obj && obj.otyp !== ONAMES.AKLYS && !welded(obj)) {
        const { weapon_descr } = await import('./weapon.js');
        const savequan = obj.quan;
        let thiswep = is_sword(obj) ? 'sword' : weapon_descr(obj);
        if (otherwep && thiswep !== makesingular(otherwep))
            otherwep = null;
        if (obj.quan > 1) {
            if (thiswep === 'food')
                obj.quan = 1;
            else
                thiswep = makeplural(thiswep);
        }
        let hand = body_part(HAND), which = '';
        if (bimanual(obj))
            hand = makeplural(hand);
        else if (wastwoweap)
            which = urighty ? 'right ' : 'left ';
        await pline(`${thiswep.startsWith('corpse') ? 'The' : 'Your'} `
                    + `${otherwep ? 'other ' : ''}${thiswep} `
                    + `${xfl ? 'also ' : ''}${otense(obj, 'slip')} `
                    + `from your ${which}${hand}.`);
        obj.quan = savequan;
        setuwep(null);
        cmdq_clear(CQ_CANNED);
        if (canletgo(obj, ''))
            await dropx(obj);
    }
}

// src/do_wear.c Armor_on() — called when a suit becomes worn.
//
// The core is two lines and it is SCREEN-VISIBLE: setting uarm.known makes
// the suit's enchantment evident, which is what lets the status line show the
// real AC. C's comment says exactly that.
//
// dragon_armor_handling and the artifact-light branch (begin_burn plus its
// "begins to shine" message) are recorded; neither fires for ordinary
// starting armour.
export async function Armor_on() {
    if (!game.u.uarm)   /* no known instances of !uarm here but play it safe */
        return 0;
    if (!game.u.uarm.known) {
        game.u.uarm.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Armor_on:update_inventory');
    }
    await dragon_armor_handling(game.u.uarm, true);
    if (is_gold_dragon_armor(game.u.uarm) && !game.u.uarm.lamplit)
        await begin_gold_dragon_light(game.u.uarm);
    else if (game.u.uarm.oartifact)
        note_unported_do_wear('Armor_on:artifact_light');
    return 0;
}

function is_gold_dragon_armor(obj) {
    return obj?.otyp === ONAMES.GOLD_DRAGON_SCALES
        || obj?.otyp === ONAMES.GOLD_DRAGON_SCALE_MAIL;
}

function gold_dragon_light_radius(obj) {
    let radius = obj.blessed ? 3 : obj.cursed ? 1 : 2;
    if (obj.otyp === ONAMES.GOLD_DRAGON_SCALE_MAIL)
        radius++;
    return radius;
}

function gold_dragon_light_description(obj) {
    return ['strangely', 'dimly', 'brightly', 'brilliantly', 'radiantly'][
        gold_dragon_light_radius(obj)] || 'strangely';
}

async function begin_gold_dragon_light(obj) {
    const { new_light_source, LS_OBJECT } = await import('./light.js');
    obj.lamplit = 1;
    new_light_source(game.u.ux, game.u.uy, gold_dragon_light_radius(obj),
                     LS_OBJECT, obj.o_id);
    game.vision_full_recalc = 1;
    update_inventory();
    if (!Blind())
        await pline(`${Yname2(obj)} begins to shine ${
            gold_dragon_light_description(obj)}!`);
}

async function end_gold_dragon_light(obj) {
    const { del_light_source, LS_OBJECT } = await import('./light.js');
    del_light_source(LS_OBJECT, obj.o_id);
    obj.lamplit = 0;
    game.vision_full_recalc = 1;
    update_inventory();
    if (!Blind())
        await pline(`${Tobjnam(obj, 'stop')} shining.`);
}

// src/do_wear.c dragon_armor_handling(). The armor's primary property is
// managed by setworn(); this switch supplies its second property.
async function dragon_armor_handling(obj, putOn) {
    const props = (game.u.uprops ||= {});
    let secondary = null;

    switch (obj.otyp) {
    case ONAMES.BLACK_DRAGON_SCALES:
    case ONAMES.BLACK_DRAGON_SCALE_MAIL:
        secondary = 'DRAIN_RES';
        break;
    case ONAMES.BLUE_DRAGON_SCALES:
    case ONAMES.BLUE_DRAGON_SCALE_MAIL: {
        const hfast = game.u.intrinsic?.HFast | 0;
        const efast = props.FAST | 0;
        if (putOn) {
            const fast = !!(hfast || efast);
            const very_fast = !!((hfast & TIMEOUT) || efast);
            if (!very_fast)
                await You(`speed up${fast ? ' a bit more' : ''}.`);
            props.FAST = efast | W_ARM;
        } else {
            set_dragon_secondary(props, 'FAST', false);
            if (!Very_fast() && !game.context_takeoff?.cancelled_don)
                await You('slow down.');
        }
        return;
    }
    case ONAMES.GREEN_DRAGON_SCALES:
    case ONAMES.GREEN_DRAGON_SCALE_MAIL:
        secondary = 'SICK_RES';
        break;
    case ONAMES.RED_DRAGON_SCALES:
    case ONAMES.RED_DRAGON_SCALE_MAIL:
        secondary = 'INFRAVISION';
        break;
    case ONAMES.GOLD_DRAGON_SCALES:
    case ONAMES.GOLD_DRAGON_SCALE_MAIL: {
        const { make_hallucinated } = await import('./potion.js');
        await make_hallucinated(putOn ? 0 : 1, true, W_ARM);
        return;
    }
    case ONAMES.ORANGE_DRAGON_SCALES:
    case ONAMES.ORANGE_DRAGON_SCALE_MAIL:
        secondary = 'FREE_ACTION';
        break;
    case ONAMES.YELLOW_DRAGON_SCALES:
    case ONAMES.YELLOW_DRAGON_SCALE_MAIL:
        secondary = 'STONE_RES';
        break;
    case ONAMES.WHITE_DRAGON_SCALES:
    case ONAMES.WHITE_DRAGON_SCALE_MAIL:
        secondary = 'SLOW_DIGESTION';
        break;
    default:
        return;
    }

    set_dragon_secondary(props, secondary, putOn);
    if (secondary === 'INFRAVISION')
        see_monsters();
    if (!putOn && secondary === 'STONE_RES'
        && [game.u.uwep, game.u.uswapwep].some(
            item => item?.otyp === ONAMES.CORPSE))
        note_unported_do_wear('dragon_armor_handling:wielding_corpse');
}

function set_dragon_secondary(props, prop, putOn) {
    if (putOn) {
        props[prop] = (props[prop] | 0) | W_ARM;
    } else {
        const left = (props[prop] | 0) & ~W_ARM;
        if (left)
            props[prop] = left;
        else
            delete props[prop];
    }
}

/* Every armor-slot on-handler ends by revealing the item's enchantment: the
   status-line AC change makes its +/- value evident. Slot-specific magical
   effects remain in their dedicated handlers; these common tails cover the
   ordinary armor paths. */
function reveal_worn_armor(mask) {
    const obj = worn(mask);
    if (obj && !obj.known) {
        obj.known = 1;
        update_inventory();
    }
    return 0;
}

async function Cloak_on() {
    const uarmc = worn(W_ARMC);
    if (!uarmc)
        return 0;
    const prop = PROP_KEYS[objects[uarmc.otyp].oc_oprop];
    const oldprop = prop
        ? (game.u.uprops?.[prop] || 0) & ~WORN_CLOAK : 0;

    switch (uarmc.otyp) {
    case ONAMES.CLOAK_OF_PROTECTION:
        makeknown(uarmc.otyp);
        break;
    case ONAMES.ELVEN_CLOAK:
        await toggle_stealth(uarmc, oldprop, true);
        break;
    case ONAMES.CLOAK_OF_DISPLACEMENT:
        await toggle_displacement(uarmc, oldprop, true);
        break;
    case ONAMES.MUMMY_WRAPPING:
        if ((game.u.intrinsic?.HInvis || game.u.uprops?.INVIS) && !Blind()) {
            newsym(game.u.ux, game.u.uy);
            await You(`can ${See_invisible()
                ? 'no longer see through yourself' : 'see yourself'}!`);
        }
        break;
    case ONAMES.CLOAK_OF_INVISIBILITY:
        if (!oldprop && !game.u.intrinsic?.HInvis && !Blind()) {
            makeknown(uarmc.otyp);
            newsym(game.u.ux, game.u.uy);
            await pline(`Suddenly you can${See_invisible()
                ? ' see through' : 'not see'} yourself.`);
        }
        break;
    case ONAMES.OILSKIN_CLOAK:
        await pline(`${Tobjnam(uarmc, 'fit')} very tightly.`);
        break;
    case ONAMES.ALCHEMY_SMOCK:
        (game.u.uprops ||= {}).ACID_RES =
            (game.u.uprops.ACID_RES || 0) | WORN_CLOAK;
        break;
    }
    return reveal_worn_armor(W_ARMC);
}

export async function Cloak_off(otmp) {
    const prop = PROP_KEYS[objects[otmp.otyp].oc_oprop];
    const oldprop = prop
        ? (game.u.uprops?.[prop] || 0) & ~WORN_CLOAK : 0;

    (game.context_takeoff ||= {}).mask &= ~W_ARMC;
    setworn(null, W_ARMC);
    switch (otmp.otyp) {
    case ONAMES.ELVEN_CLOAK:
        await toggle_stealth(otmp, oldprop, false);
        break;
    case ONAMES.CLOAK_OF_DISPLACEMENT:
        await toggle_displacement(otmp, oldprop, false);
        break;
    case ONAMES.MUMMY_WRAPPING:
        if (Invis() && !Blind()) {
            newsym(game.u.ux, game.u.uy);
            await You(`can ${See_invisible()
                ? 'see through yourself' : 'no longer see yourself'}.`);
        }
        break;
    case ONAMES.CLOAK_OF_INVISIBILITY:
        if (!oldprop && !game.u.intrinsic?.HInvis && !Blind()) {
            makeknown(otmp.otyp);
            newsym(game.u.ux, game.u.uy);
            await pline(`Suddenly you can ${See_invisible()
                ? 'no longer see through yourself' : 'see yourself'}.`);
        }
        break;
    case ONAMES.ALCHEMY_SMOCK: {
        const left = (game.u.uprops?.ACID_RES || 0) & ~WORN_CLOAK;
        if (left)
            game.u.uprops.ACID_RES = left;
        else if (game.u.uprops)
            delete game.u.uprops.ACID_RES;
        break;
    }
    }
}
async function Helmet_on() {
    const uarmh = worn(W_ARMH);
    if (!uarmh)
        return 0;

    switch (uarmh.otyp) {
    case ONAMES.FEDORA:
        if (game.urole?.name?.m === 'Archeologist')
            change_luck(1);
        break;
    case ONAMES.HELM_OF_CAUTION:
        see_monsters();
        break;
    case ONAMES.HELM_OF_BRILLIANCE:
        adjust_helmet_brilliance(uarmh, uarmh.spe || 0);
        break;
    case ONAMES.CORNUTHAUM:
        attribute_bonus_array()[A_CHA] +=
            game.urole?.name?.m === 'Wizard' ? 1 : -1;
        (game.disp ||= {}).botl = true;
        makeknown(uarmh.otyp);
        break;
    case ONAMES.HELM_OF_OPPOSITE_ALIGNMENT:
        uarmh.known = 1;
        await change_helm_alignment(
            game.u.ualign.type !== A_NEUTRAL
                ? -game.u.ualign.type
                : ((uarmh.o_id || 0) % 2 ? A_CHAOTIC : A_LAWFUL),
            true);
        /* fall through: opposite-alignment helms and dunce caps autocurse */
    case ONAMES.DUNCE_CAP:
        if (!uarmh.cursed) {
            if (Blind())
                await pline(`${Tobjnam(uarmh, 'vibrate')} for a moment.`);
            else
                await pline(`${Tobjnam(uarmh, 'glow')} ${hcolor(NH_BLACK)} `
                            + 'for a moment.');
            curse(uarmh);
            if (Blind())
                set_bknown(uarmh, 0);
            else if (game.urole?.name?.m === 'Priest')
                set_bknown(uarmh, 1);
            else if (uarmh.bknown)
                update_inventory();
        }
        (game.disp ||= {}).botl = true;
        if (Hallucination()) {
            await pline('My brain hurts!');
        } else if (uarmh.otyp === ONAMES.DUNCE_CAP) {
            const score = (game.u.acurr?.a?.[A_INT] || 0)
                + (game.u.abon?.a?.[A_INT] || 0)
                + (game.u.atemp?.a?.[A_INT] || 0);
            await You_feel(ACURR(A_INT) <= score
                ? 'like sitting in a corner.' : 'giddy.');
        } else {
            makeknown(ONAMES.HELM_OF_OPPOSITE_ALIGNMENT);
        }
        break;
    }
    return reveal_worn_armor(W_ARMH);
}

function adjust_helmet_brilliance(obj, delta) {
    if (delta) {
        makeknown(obj.otyp);
        const abon = attribute_bonus_array();
        abon[A_INT] += delta;
        abon[A_WIS] += delta;
    }
    (game.disp ||= {}).botl = true;
}

export async function Helmet_off(otmp) {
    (game.context_takeoff ||= {}).mask &= ~W_ARMH;
    switch (otmp.otyp) {
    case ONAMES.FEDORA:
        if (game.urole?.name?.m === 'Archeologist')
            change_luck(-1);
        break;
    case ONAMES.DUNCE_CAP:
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.CORNUTHAUM:
        if (!game.context_takeoff?.cancelled_don) {
            attribute_bonus_array()[A_CHA] +=
                game.urole?.name?.m === 'Wizard' ? -1 : 1;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.HELM_OF_TELEPATHY:
    case ONAMES.HELM_OF_CAUTION:
        setworn(null, W_ARMH);
        see_monsters();
        return;
    case ONAMES.HELM_OF_BRILLIANCE:
        if (!game.context_takeoff?.cancelled_don)
            adjust_helmet_brilliance(otmp, -(otmp.spe || 0));
        break;
    case ONAMES.HELM_OF_OPPOSITE_ALIGNMENT:
        await change_helm_alignment(
            game.u.ualignbase?.[A_CURRENT] ?? game.u.ualign.type,
            false);
        break;
    }
    setworn(null, W_ARMH);
    game.context_takeoff.cancelled_don = false;
}

// src/attrib.c:1320 uchangealign(), helm-on and helm-off arms.
async function change_helm_alignment(newalign, puttingOn) {
    const oldalign = game.u.ualign.type;

    game.u.ublessed = 0;
    (game.disp ||= {}).botl = true;
    game.u.ualign.type = newalign;

    if (puttingOn) {
        adjalign(-7);
        await Your(`mind oscillates ${Hallucination() ? 'wildly'
                                                       : 'briefly'}.`);
        const { make_confused } = await import('./potion.js');
        await make_confused(rn1(2, 3), false);
        if (Is_astralevel(game.u.uz)
            || rn2(50) < (game.u.ualign.abuse || 0))
            note_unported_do_wear('change_helm_alignment:summon_furies');
    } else {
        await Your(`mind is ${Hallucination()
            ? 'much of a muchness' : 'back in sync with your body'}.`);
    }

    if (game.u.ualign.type !== oldalign) {
        game.u.ualign.record = 0;
        if ((game.invent || []).some(obj => obj.oartifact))
            note_unported_do_wear('change_helm_alignment:retouch_equipment');
    }
}

function attribute_bonus_array() {
    const abon = (game.u.abon ||= {});
    return abon.a ||= new Array(game.u.acurr?.a?.length || 6).fill(0);
}
function Gloves_on() {
    const uarmg = worn(W_ARMG);
    if (!uarmg)
        return 0;

    switch (uarmg.otyp) {
    case ONAMES.GAUNTLETS_OF_POWER:
        makeknown(uarmg.otyp);
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        if (uarmg.spe) {
            makeknown(uarmg.otyp);
            attribute_bonus_array()[A_DEX] += uarmg.spe;
        }
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_FUMBLING: {
        const intrinsic = (game.u.intrinsic ||= {});
        const old = intrinsic.HFumbling || 0;
        const oldprop = (game.u.uprops?.FUMBLING || 0) & ~WORN_GLOVES;
        if (!oldprop && !(old & ~TIMEOUT))
            intrinsic.HFumbling = (old & ~TIMEOUT)
                | Math.min(TIMEOUT, (old & TIMEOUT) + rnd(20));
        break;
    }
    }
    return reveal_worn_armor(W_ARMG);
}
function Shield_on() { return reveal_worn_armor(W_ARMS); }
function Shirt_on()  { return reveal_worn_armor(W_ARMU); }

/* include/prop.h enum prop_types, index -> uprops key. The flat uprops map
   keys by the C constant's name; setworn's generic property arm (src/worn.c)
   writes through this table when gear is put on. Index 0 is unused in C. */
export const PROP_KEYS = [null,
    'FIRE_RES', 'COLD_RES', 'SLEEP_RES', 'DISINT_RES', 'SHOCK_RES',
    'POISON_RES', 'ACID_RES', 'STONE_RES', 'DRAIN_RES', 'SICK_RES',
    'INVULNERABLE', 'ANTIMAGIC', 'STUNNED', 'CONFUSION', 'BLINDED', 'DEAF',
    'SICK', 'STONED', 'STRANGLED', 'VOMITING', 'GLIB', 'SLIMED', 'HALLUC',
    'HALLUC_RES', 'FUMBLING', 'WOUNDED_LEGS', 'SLEEPY', 'HUNGER',
    'SEE_INVIS', 'TELEPAT', 'WARNING', 'WARN_OF_MON', 'WARN_UNDEAD',
    'SEARCHING', 'CLAIRVOYANT', 'INFRAVISION', 'DETECT_MONSTERS', 'BLND_RES',
    'ADORNED', 'INVIS', 'DISPLACED', 'STEALTH', 'AGGRAVATE_MONSTER',
    'CONFLICT', 'JUMPING', 'TELEPORT', 'TELEPORT_CONTROL', 'LEVITATION',
    'FLYING', 'WWALKING', 'SWIMMING', 'MAGICAL_BREATHING', 'PASSES_WALLS',
    'SLOW_DIGESTION', 'HALF_SPDAM', 'HALF_PHDAM', 'REGENERATION',
    'ENERGY_REGENERATION', 'PROTECTION', 'PROT_FROM_SHAPE_CHANGERS',
    'POLYMORPH', 'POLYMORPH_CONTROL', 'UNCHANGING', 'FAST', 'REFLECTING',
    'FREE_ACTION', 'FIXED_ABIL', 'LIFESAVED'];

// src/do_wear.c set_wear() — apply the on-effects of worn gear.
//
// With obj null it walks EVERY worn slot; with an object it does just that
// one. C's `!obj ? uslot != 0 : (obj == uslot)` is that test written once per
// slot, and the ORDER is fixed: blindfold, right ring, left ring, amulet,
// then shirt, suit, cloak, boots, gloves, helmet, shield.
//
// The property grant each handler relies on comes from setworn and is applied
// here per slot. The handlers' remaining effects are messages (suppressed at
// initial don) and side effects like vision recalcs; the slots whose handler
// does more than the property keep their record.
export function set_wear(obj) {
    game.initial_don = !obj;
    const slotobj = (mask) => worn(mask);

    if (game.u.ublindf && (!obj || obj === game.u.ublindf))
        note_unported_do_wear('set_wear:Blindf_on');
    for (const mask of [W_RINGR, W_RINGL]) {
        const o = slotobj(mask);
        if (o && (!obj || obj === o))
            note_unported_do_wear('set_wear:Ring_on');
    }
    {
        const o = slotobj(W_AMUL);
        if (o && (!obj || obj === o))
            note_unported_do_wear('set_wear:Amulet_on');
    }

    /* the worn items' oc_oprop extrinsics were granted by setworn() when
       u_init dressed the hero, exactly as in C; the handlers here add only
       their slot-specific side effects (messages are suppressed at initial
       don, C gates them on gi.initial_don) */
    for (const [mask, arm] of [[W_ARMU, 'Shirt_on'], [W_ARM, 'Armor_on'],
                               [W_ARMC, 'Cloak_on'], [W_ARMF, 'Boots_on'],
                               [W_ARMG, 'Gloves_on'], [W_ARMH, 'Helmet_on'],
                               [W_ARMS, 'Shield_on']]) {
        const o = slotobj(mask);
        if (o && (!obj || obj === o)) {
            if (arm === 'Armor_on')
                Armor_on();
            else if (arm === 'Helmet_on' && o.otyp === ONAMES.FEDORA
                     && game.urole?.name?.m === 'Archeologist')
                change_luck(1);
        }
    }

    game.initial_don = false;
}

function note_unported_do_wear(what) {
    (game.unported ||= new Set()).add('do_wear:' + what);
}

/* ---- the wear/take-off command layer (src/do_wear.c:1729-2489) ---- */

/* include/obj.h:278 — each of these is TWO tests in C: the object is armour
   AND its oc_armcat matches. oc_subtyp is a union field that means the weapon
   skill for a weapon, so without the class test a weapon whose skill happens
   to be 1 reads as a shield. */
const is_suit   = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 0; /* ARM_SUIT */
const is_shield = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 1;
const is_helmet = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 2;
const is_gloves = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 3;
const is_boots  = (o) => objects[o.otyp].oc_subtyp === 4;
const is_cloak  = (o) => objects[o.otyp].oc_subtyp === 5;
const is_shirt  = (o) => objects[o.otyp].oc_subtyp === 6;

/* setworn()/setnotworn() live in js/worn.js (src/worn.c), imported above.
   The reduced local copies that only tracked owornmask and a boolean
   property flag were replaced when the worn[] table landed there. */

/* src/do_wear.c:1574 donning() — is a multi-turn wear of otmp in progress?
   ga.afternmv can only hold a handler this port has; comparisons against
   unported handlers are vacuously false, exactly as if they could never be
   in progress (they cannot: nothing sets afternmv to a missing function). */
export function donning(otmp) {
    let result = false;

    if (doffing(otmp))
        result = true;
    else if (otmp === game.u.uarm)
        result = (game.afternmv === Armor_on);
    else if (otmp === game.u.uarmc)
        result = (game.afternmv === Cloak_on);
    else if (otmp === game.u.uarmh)
        result = (game.afternmv === Helmet_on);
    else if (otmp === game.u.uarmg)
        result = (game.afternmv === Gloves_on);
    else if (otmp === game.u.uarmf)
        result = (game.afternmv === Boots_on);
    else if (otmp === game.u.uarms)
        result = (game.afternmv === Shield_on);
    else if (otmp === game.u.uarmu)
        result = (game.afternmv === Shirt_on);

    return result;
}

// src/do_wear.c:1603 doffing() — is removal of otmp in progress or pending?
export function doffing(otmp) {
    const what = game.context_takeoff?.what || 0;
    let result = false;

    /* 'T' (or 'R' used for armor) sets ga.afternmv, 'A' sets takeoff.what */
    if (otmp === game.u.uarmf)
        result = (what === WORN_BOOTS);   /* Boots_off is not an afternmv */
    else if (otmp === game.u.uarm)
        result = (what === WORN_ARMOR);
    else if (otmp === game.u.uarmu)
        result = (what === WORN_SHIRT);
    else if (otmp === game.u.uarmc)
        result = (what === WORN_CLOAK);
    else if (otmp === game.u.uarmh)
        result = (what === WORN_HELMET);
    else if (otmp === game.u.uarmg)
        result = (what === WORN_GLOVES);
    else if (otmp === game.u.uarms)
        result = (what === WORN_SHIELD);
    /* these 1-turn items don't need 'ga.afternmv' checks */
    else if (otmp === game.u.uamul)
        result = (what === WORN_AMUL);
    else if (otmp === game.u.uleft)
        result = (what === LEFT_RING);
    else if (otmp === game.u.uright)
        result = (what === RIGHT_RING);
    else if (otmp === game.u.ublindf)
        result = (what === WORN_BLINDF);
    else if (otmp === game.u.uwep)
        result = (what === W_WEP);
    else if (otmp === game.u.uswapwep)
        result = (what === W_SWAPWEP);
    else if (otmp === game.u.uquiver)
        result = (what === W_QUIVER);

    return result;
}

// src/do_wear.c:1664 cancel_don() — the piece being donned/doffed vanished.
export function cancel_don() {
    const tk = (game.context_takeoff ||= { mask: 0 });
    /* afternmv never has some of these values because every item of the
       corresponding armor category takes 1 turn to wear, but check all of
       them anyway (only the ported handlers can appear on this tree) */
    tk.cancelled_don = (game.afternmv === Armor_on
                        || game.afternmv === Cloak_on
                        || game.afternmv === Helmet_on
                        || game.afternmv === Gloves_on
                        || game.afternmv === Boots_on
                        || game.afternmv === Shield_on
                        || game.afternmv === Shirt_on);
    game.afternmv = null;
    game.nomovemsg = null;
    game.multi = 0;
    tk.delay = 0;
    tk.what = 0;
}

// src/do_wear.c:1645 cancel_doff() — called by setworn() for the old item in
// a slot, or by setnotworn() for a specific item.
export function cancel_doff(obj, slotmask) {
    const tk = (game.context_takeoff ||= { mask: 0 });

    if (!(tk.mask & I_SPECIAL) && donning(obj))
        cancel_don(); /* applies to doffing too */
    tk.mask &= ~slotmask;
}

// src/do_wear.c:68 off_msg() / :76 on_msg()
async function off_msg(otmp) {
    if (game.flags?.verbose !== false)
        await You(`were wearing ${doname(otmp)}.`);
}

async function on_msg(otmp) {
    if ((otmp.owornmask & (W_RINGL | W_RINGR | W_AMUL)) !== 0) {
        await prinv(null, otmp, 0);
        return;
    }
    if (game.flags?.verbose !== false) {
        const otmp_name = xname(otmp);
        const how = otmp.otyp === ONAMES.TOWEL
            ? ` around your ${body_part(HEAD)}` : '';
        /* obj_is_pname() only for artifacts */
        await You(`are now wearing ${an(otmp_name)}${how}.`);
    }
}

// src/do_wear.c:187 Boots_on()
export async function Boots_on() {
    const uarmf = worn(W_ARMF);
    if (!uarmf) return;
    const prop = PROP_KEYS[objects[uarmf.otyp].oc_oprop];
    const oldprop = prop
        ? (game.u.uprops?.[prop] || 0) & ~WORN_BOOTS : 0;
    switch (uarmf.otyp) {
    case ONAMES.LOW_BOOTS:
    case ONAMES.IRON_SHOES:
    case ONAMES.HIGH_BOOTS:
    case ONAMES.JUMPING_BOOTS:
    case ONAMES.KICKING_BOOTS:
        break;
    case ONAMES.SPEED_BOOTS:
        if (!oldprop && !((game.u.intrinsic?.HFast || 0) & TIMEOUT)) {
            makeknown(uarmf.otyp);
            await You_feel(`yourself speed up${
                game.u.intrinsic?.HFast ? ' a bit more' : ''}.`);
        }
        break;
    case ONAMES.WATER_WALKING_BOOTS:
        if (game.u.uinwater)
            await spoteffects(true);
        break;
    case ONAMES.ELVEN_BOOTS:
        await toggle_stealth(uarmf, oldprop, true);
        break;
    case ONAMES.LEVITATION_BOOTS:
        if (!oldprop && !game.u.intrinsic?.HLevitation
            && !game.u.blocked?.LEVITATION) {
            uarmf.known = 1;
            (game.disp ||= {}).botl = true;
            makeknown(uarmf.otyp);
            await float_up_from_wearable('Boots_on');
            if (Levitation())
                await spoteffects(false);
        }
        break;
    case ONAMES.FUMBLE_BOOTS: {
        const intrinsic = (game.u.intrinsic ||= {});
        const old = intrinsic.HFumbling || 0;
        if (!oldprop && !(old & ~TIMEOUT)) {
            const timeout = Math.min(TIMEOUT, (old & TIMEOUT) + rnd(20));
            intrinsic.HFumbling = (old & ~TIMEOUT) | timeout;
        }
        break;
    }
    }
    if (game.u.uarmf && !game.u.uarmf.known) {
        game.u.uarmf.known = 1;
        update_inventory();
    }
}

// src/do_wear.c:239 Boots_off()
export async function Boots_off(otmp) {
    const prop = PROP_KEYS[objects[otmp.otyp].oc_oprop];
    const oldprop = prop
        ? (game.u.uprops?.[prop] || 0) & ~WORN_BOOTS : 0;
    setworn(null, W_ARMF);
    switch (otmp.otyp) {
    case ONAMES.SPEED_BOOTS:
        if (!Very_fast() && !game.context_takeoff?.cancelled_don) {
            makeknown(otmp.otyp);
            await You_feel(`yourself slow down${Fast() ? ' a bit' : ''}.`);
        }
        break;
    case ONAMES.WATER_WALKING_BOOTS:
        break;
    case ONAMES.ELVEN_BOOTS:
        await toggle_stealth(otmp, oldprop, false);
        break;
    case ONAMES.FUMBLE_BOOTS:
        if (!oldprop
            && !((game.u.intrinsic?.HFumbling || 0) & ~TIMEOUT)) {
            (game.u.intrinsic ||= {}).HFumbling = 0;
            if (game.u.uprops)
                delete game.u.uprops.FUMBLING;
        }
        break;
    case ONAMES.LEVITATION_BOOTS:
        if (!oldprop && !game.u.intrinsic?.HLevitation
            && !game.u.blocked?.LEVITATION
            && !game.context_takeoff?.cancelled_don) {
            await float_down(0, 0);
            makeknown(otmp.otyp);
        }
        break;
    case ONAMES.LOW_BOOTS:
    case ONAMES.IRON_SHOES:
    case ONAMES.HIGH_BOOTS:
    case ONAMES.JUMPING_BOOTS:
    case ONAMES.KICKING_BOOTS:
        break;
    }
    (game.context_takeoff ||= {}).cancelled_don = false;
}

// src/do_wear.c:963 Amulet_on() — setworn and on_msg are its own business.
export async function Amulet_on(amul) {
    const was_flying = Flying();
    const was_strangled = !!game.u.uprops?.STRANGLED;
    setworn(amul, W_AMUL);
    let on_msg_done = false;
    switch (amul.otyp) {
    case ONAMES.AMULET_OF_ESP:
    case ONAMES.AMULET_OF_LIFE_SAVING:
    case ONAMES.AMULET_VERSUS_POISON:
    case ONAMES.AMULET_OF_REFLECTION:
    case ONAMES.FAKE_AMULET_OF_YENDOR:
        break;
    case ONAMES.AMULET_OF_STRANGULATION:
        if (!was_strangled) {
            makeknown(amul.otyp);
            (game.u.intrinsic ||= {}).HStrangled = 6;
            (game.disp ||= {}).botl = true;
            await on_msg(amul);
            on_msg_done = true;
            await pline('It constricts your throat!');
        }
        break;
    case ONAMES.AMULET_OF_RESTFUL_SLEEP: {
        const intrinsic = (game.u.intrinsic ||= {});
        const oldnap = (intrinsic.HSleepy || 0) & TIMEOUT;
        const newnap = rnd(98) + 2;
        if (newnap < oldnap || oldnap === 0)
            intrinsic.HSleepy = ((intrinsic.HSleepy || 0) & ~TIMEOUT)
                                | newnap;
        break;
    }
    case ONAMES.AMULET_OF_FLYING:
        if (Flying() && !was_flying) {
            makeknown(amul.otyp);
            await on_msg(amul);
            on_msg_done = true;
            (game.disp ||= {}).botl = true;
            await You('are now in flight.');
        }
        break;
    case ONAMES.AMULET_OF_GUARDING:
        makeknown(amul.otyp);
        find_ac();
        break;
    case ONAMES.AMULET_OF_CHANGE: {
        const old_sex = poly_gender();
        if (!(game.u.intrinsic?.HUnchanging || game.u.uprops?.UNCHANGING))
            change_sex();
        const new_sex = poly_gender();
        if (new_sex !== old_sex)
            makeknown(amul.otyp);
        await on_msg(amul);
        on_msg_done = true;
        if (new_sex !== old_sex) {
            newsym(game.u.ux, game.u.uy);
            (game.disp ||= {}).botl = true;
            await You(`are suddenly very ${
                game.flags.female ? 'feminine' : 'masculine'}!`);
        } else {
            await You("don't feel like yourself.");
        }
        await pline('The amulet disintegrates!');
        useup(amul);
        break;
    }
    default:
        note_unported_do_wear(`Amulet_on:otyp=${amul.otyp}`);
        break;
    }
    if (!on_msg_done)
        await on_msg(amul);
}

// src/do_wear.c:1030 Amulet_off() — does its own off_msg.
// src/do_wear.c:733 Shield_off()
export async function Shield_off() {
    const uarms = worn(W_ARMS);
    (game.context_takeoff ||= {}).mask &= ~W_ARMS;
    /* no shield currently requires special handling when taken off, but
       keep this uncommented in case somebody adds a new one which does */
    switch (uarms?.otyp) {
    case ONAMES.SMALL_SHIELD:
    case ONAMES.SHIELD_OF_DRAIN_RESISTANCE:
    case ONAMES.SHIELD_OF_SHOCK_RESISTANCE:
    case ONAMES.ELVEN_SHIELD:
    case ONAMES.URUK_HAI_SHIELD:
    case ONAMES.ORCISH_SHIELD:
    case ONAMES.DWARVISH_ROUNDSHIELD:
    case ONAMES.LARGE_SHIELD:
    case ONAMES.SHIELD_OF_REFLECTION:
        break;
    default:
        /* impossible(unknown_type, c_shield, uarms->otyp) */
        break;
    }
    setworn(null, W_ARMS);
    return 0;
}

// src/do_wear.c:778 Shirt_off()
export async function Shirt_off() {
    const uarmu = worn(W_ARMU);
    (game.context_takeoff ||= {}).mask &= ~W_ARMU;
    /* no shirt currently requires special handling when taken off, but
       keep this uncommented in case somebody adds a new one which does */
    switch (uarmu?.otyp) {
    case ONAMES.HAWAIIAN_SHIRT:
    case ONAMES.T_SHIRT:
        break;
    default:
        /* impossible(unknown_type, c_shirt, uarmu->otyp) */
        break;
    }
    setworn(null, W_ARMU);
    return 0;
}

// src/do_wear.c:909 Armor_off() — the body armor comes off; a lit artifact
// stops shining and dragon armor's secondary property is withdrawn.
export async function Armor_off() {
    const otmp = worn(W_ARM);
    const was_arti_light = !!(otmp && otmp.lamplit && artifact_light(otmp));

    (game.context_takeoff ||= {}).mask &= ~W_ARM;
    setworn(null, W_ARM);
    game.context_takeoff.cancelled_don = false;

    /* taking off yellow dragon scales/mail might be fatal; arti_light
       comes from gold dragon scales/mail so they don't overlap, but
       conceptually the non-fatal change should be done before the
       potentially fatal change in case the latter results in bones */
    if (was_arti_light && !artifact_light(otmp)) {
        await end_burn(otmp, false);
        if (!Blind())
            await pline(`${Tobjnam(otmp, 'stop')} shining.`);
    }
    await dragon_armor_handling(otmp, false);
    return 0;
}

// src/do_wear.c:939 Armor_gone(); used for destroying armor (and by
// break_armor())
export async function Armor_gone() {
    const otmp = game.u.uarm;
    const was_arti_light = !!(otmp && otmp.lamplit && artifact_light(otmp));

    (game.context_takeoff ||= {}).mask &= ~W_ARM;
    setnotworn(game.u.uarm);
    game.context_takeoff.cancelled_don = false;

    /* taking off yellow dragon scales/mail might be fatal; arti_light
       comes from gold dragon scales/mail so they don't overlap, but
       conceptually the non-fatal change should be done before the
       potentially fatal change in case the latter results in bones */
    if (was_arti_light && !artifact_light(otmp)) {
        await end_burn(otmp, false);
        if (!Blind())
            await pline(`${Tobjnam(otmp, 'stop')} shining.`);
    }
    await dragon_armor_handling(otmp, false);
    return 0;
}

export async function Amulet_off() {
    const uamul = worn(W_AMUL);
    if (!uamul) return;
    const was_flying = Flying();
    const was_strangled = !!game.u.uprops?.STRANGLED;
    setworn(null, W_AMUL);   /* src/do_wear.c:1100 */
    await off_msg(uamul);
    switch (uamul.otyp) {
    case ONAMES.AMULET_OF_ESP:
        see_monsters();
        break;
    case ONAMES.AMULET_OF_LIFE_SAVING:
    case ONAMES.AMULET_VERSUS_POISON:
    case ONAMES.AMULET_OF_REFLECTION:
    case ONAMES.FAKE_AMULET_OF_YENDOR:
        break;
    case ONAMES.AMULET_OF_STRANGULATION:
        if (was_strangled) {
            (game.u.intrinsic ||= {}).HStrangled = 0;
            (game.disp ||= {}).botl = true;
            await You('can breathe more easily!');
            makeknown(uamul.otyp);
        }
        break;
    case ONAMES.AMULET_OF_RESTFUL_SLEEP:
        if (!game.u.uprops?.SLEEPY
            && !((game.u.intrinsic?.HSleepy || 0) & ~TIMEOUT))
            game.u.intrinsic.HSleepy &= ~TIMEOUT;
        break;
    case ONAMES.AMULET_OF_FLYING:
        if (was_flying && !Flying()) {
            (game.disp ||= {}).botl = true;
            await You('land.');
            makeknown(uamul.otyp);
            await spoteffects(true);
        }
        break;
    case ONAMES.AMULET_OF_GUARDING:
        find_ac();
        break;
    default:
        note_unported_do_wear(`Amulet_off:otyp=${uamul.otyp}`);
        break;
    }
    find_ac();
}

// src/do_wear.c:1193 learnring(): reveal an observed effect and, once the
// type is known, the enchantment of a charged ring.
function learnring(ring, observed) {
    const ringtype = ring.otyp;
    if (observed) {
        if (game.objects[ringtype].oc_name_known)
            observe_object(ring);
        else if (ring.dknown)
            makeknown(ringtype);
    }
    if (ring.dknown && game.objects[ringtype].oc_name_known) {
        if (game.objects[ringtype].oc_charged)
            ring.known = 1;
        update_inventory();
    }
}

// src/do_wear.c extremeattr() and adjust_attrib(), limited to the three
// characteristics rings can change.  The exceptional lower limits matter
// when gauntlets of power or Ogresmasher already force an attribute to 25.
function extreme_ring_attribute(which) {
    let low = 3, high = 25;
    if (which === A_STR) {
        high = 125;
        if (worn(W_ARMG)?.otyp === ONAMES.GAUNTLETS_OF_POWER)
            low = high;
    } else if (which === A_CON
               && game.u.uwep?.oartifact === ART_OGRESMASHER) {
        low = high;
    }
    const current = ACURR(which);
    return current === low || current === high;
}

function adjust_ring_attribute(ring, which, amount) {
    const old = ACURR(which);
    game.u.abon ||= {};
    game.u.abon.a ||= new Array(game.u.acurr.a.length).fill(0);
    game.u.abon.a[which] += amount;
    const observable = old !== ACURR(which);
    if (observable || !extreme_ring_attribute(which))
        learnring(ring, observable);
    (game.disp ||= {}).botl = true;
}

// src/trap.c float_up(), for the states currently represented by the port.
// Traps, engulfers, and mounted levitation retain explicit reachability marks
// until their source-specific state transitions are available here.
async function float_up_from_wearable(source) {
    (game.disp ||= {}).botl = true;
    if (game.u.utrap) {
        note_unported_do_wear(`${source}:levitation_trap`);
    } else if (game.u.uinwater) {
        await spoteffects(true);
    } else if (game.u.uswallow) {
        note_unported_do_wear(`${source}:levitation_swallowed`);
    } else if (Hallucination()) {
        await pline("Up, up, and awaaaay!  You're walking on air!");
    } else if (Is_airlevel(game.u.uz)) {
        await You('gain control over your movements.');
    } else {
        await You('start to float in the air!');
    }
    if (game.u.usteed)
        note_unported_do_wear(`${source}:levitation_steed`);
    if (Flying())
        await You('are no longer able to control your flight.');
    await encumber_msg();
}

// src/do_wear.c toggle_stealth().  A visible change in stealth identifies
// the ring or boots and gives immediate feedback.  The blocked term is
// tracked separately from the worn-property mask, as in C's BStealth.
async function toggle_stealth(obj, oldprop, on) {
    if (on ? game.initial_don : game.context_takeoff?.cancelled_don)
        return;
    if (!oldprop && !game.u.intrinsic?.HStealth
        && !game.u.blocked?.STEALTH) {
        if (obj.otyp === ONAMES.RIN_STEALTH)
            learnring(obj, true);
        else
            makeknown(obj.otyp);
        if (on && obj.otyp === ONAMES.ELVEN_BOOTS) {
            await You(Levitation() || Flying()
                ? 'float imperceptibly.' : 'walk very quietly.');
        } else {
            await You(on ? 'move very quietly.' : 'sure are noisy.');
        }
    }
}

// src/do_wear.c toggle_displacement().
export async function toggle_displacement(obj, oldprop, on) {
    if (on ? game.initial_don : game.context_takeoff?.cancelled_don)
        return;
    if (!oldprop && !game.u.intrinsic?.HDisplaced
        && !game.u.blocked?.DISPLACED
        && ((!Blind() && !game.u.uswallow && !Invis())
            || game.u.unblind_telepat_range >= 0
            || game.u.uprops?.DETECT_MONSTERS)) {
        if (obj)
            makeknown(obj.otyp);
        await You_feel(`that monsters${on ? '' : ' no longer'} have difficulty `
                       + 'pinpointing your location.');
    }
}

// src/potion.c:471 self_invis_message().
export async function self_invis_message() {
    await pline(`${Hallucination() ? 'Far out, man!  You'
                                  : 'Gee!  All of a sudden, you'} ${
        See_invisible() ? 'can see right through yourself'
                        : "can't see yourself"}.`);
}

// src/do_wear.c Ring_on()/Ring_off().
const PASSIVE_RING_TYPES = new Set([
    ONAMES.RIN_TELEPORTATION, ONAMES.RIN_REGENERATION,
    ONAMES.RIN_SEARCHING, ONAMES.RIN_HUNGER,
    ONAMES.RIN_AGGRAVATE_MONSTER, ONAMES.RIN_POISON_RESISTANCE,
    ONAMES.RIN_FIRE_RESISTANCE, ONAMES.RIN_COLD_RESISTANCE,
    ONAMES.RIN_SHOCK_RESISTANCE, ONAMES.RIN_CONFLICT,
    ONAMES.RIN_TELEPORT_CONTROL, ONAMES.RIN_POLYMORPH,
    ONAMES.RIN_POLYMORPH_CONTROL, ONAMES.RIN_FREE_ACTION,
    ONAMES.RIN_SLOW_DIGESTION, ONAMES.RIN_SUSTAIN_ABILITY,
    ONAMES.MEAT_RING,
]);

export async function Ring_on(obj) {
    const ringmask = W_RINGL | W_RINGR;
    const prop = PROP_KEYS[objects[obj.otyp].oc_oprop];
    let oldprop = prop ? (game.u.uprops?.[prop] || 0) : 0;
    /* setworn() has already added this ring.  Unless both hands carry the
       same property, strip the ring bits to recover the previous state. */
    if ((oldprop & ringmask) !== ringmask)
        oldprop &= ~ringmask;

    switch (obj.otyp) {
    case ONAMES.RIN_WARNING:
        see_monsters();
        break;
    case ONAMES.RIN_SEE_INVISIBLE:
        see_monsters();
        if (Invis() && !oldprop && !game.u.intrinsic?.HSee_invisible
            && !Blind()) {
            newsym(game.u.ux, game.u.uy);
            await pline('Suddenly you are transparent, but there!');
            learnring(obj, true);
        }
        break;
    case ONAMES.RIN_INVISIBILITY:
        if (!oldprop && !game.u.intrinsic?.HInvis
            && !game.u.blocked?.INVIS && !Blind()) {
            learnring(obj, true);
            newsym(game.u.ux, game.u.uy);
            await self_invis_message();
        }
        break;
    case ONAMES.RIN_GAIN_STRENGTH:
        adjust_ring_attribute(obj, A_STR, obj.spe);
        break;
    case ONAMES.RIN_GAIN_CONSTITUTION:
        adjust_ring_attribute(obj, A_CON, obj.spe);
        break;
    case ONAMES.RIN_ADORNMENT:
        adjust_ring_attribute(obj, A_CHA, obj.spe);
        break;
    case ONAMES.RIN_INCREASE_ACCURACY:
        game.u.uhitinc = (game.u.uhitinc || 0) + obj.spe;
        break;
    case ONAMES.RIN_INCREASE_DAMAGE:
        game.u.udaminc = (game.u.udaminc || 0) + obj.spe;
        break;
    case ONAMES.RIN_LEVITATION:
        if (!oldprop && !game.u.intrinsic?.HLevitation
            && !game.u.blocked?.LEVITATION) {
            await float_up_from_wearable('Ring_on');
            learnring(obj, true);
            if (Levitation())
                await spoteffects(false);
        }
        break;
    case ONAMES.RIN_STEALTH:
        await toggle_stealth(obj, oldprop, true);
        break;
    case ONAMES.RIN_PROTECTION:
        learnring(obj, obj.spe !== 0);
        if (obj.spe)
            find_ac();
        break;
    case ONAMES.RIN_PROTECTION_FROM_SHAPE_CHAN:
        {
            const { rescham } = await import('./mon.js');
            await rescham();
        }
        break;
    default:
        if (!PASSIVE_RING_TYPES.has(obj.otyp))
            note_unported_do_wear(`Ring_on:otyp=${obj.otyp}`);
        break;
    }
}

// src/do_wear.c:1300 Ring_off_or_gone() — the ring leaves its finger: taken
// off (setworn) or gone entirely (setnotworn, e.g. destroyed or stolen).
async function Ring_off_or_gone(obj, gone) {
    const mask = obj.owornmask & (W_RINGL | W_RINGR);
    const oldprop = (game.u.uprops?.STEALTH || 0) & ~mask;
    const observable = obj.otyp === ONAMES.RIN_PROTECTION && obj.spe !== 0;
    (game.context_takeoff ||= {}).mask &= ~mask;
    if (gone)
        setnotworn(obj);
    else
        setworn(null, obj.owornmask);
    if (obj.otyp === ONAMES.RIN_PROTECTION) {
        learnring(obj, observable);
        if (obj.spe)
            find_ac();
    } else if (obj.otyp === ONAMES.RIN_GAIN_STRENGTH) {
        adjust_ring_attribute(obj, A_STR, -obj.spe);
    } else if (obj.otyp === ONAMES.RIN_GAIN_CONSTITUTION) {
        adjust_ring_attribute(obj, A_CON, -obj.spe);
    } else if (obj.otyp === ONAMES.RIN_ADORNMENT) {
        adjust_ring_attribute(obj, A_CHA, -obj.spe);
    } else if (obj.otyp === ONAMES.RIN_INCREASE_ACCURACY) {
        game.u.uhitinc = (game.u.uhitinc || 0) - obj.spe;
    } else if (obj.otyp === ONAMES.RIN_INCREASE_DAMAGE) {
        game.u.udaminc = (game.u.udaminc || 0) - obj.spe;
    } else if (obj.otyp === ONAMES.RIN_LEVITATION) {
        if (!game.u.blocked?.LEVITATION) {
            await float_down(0, 0);
            if (!Levitation())
                learnring(obj, true);
        }
    } else if (obj.otyp === ONAMES.RIN_STEALTH) {
        await toggle_stealth(obj, oldprop, false);
    } else if (obj.otyp === ONAMES.RIN_SEE_INVISIBLE) {
        if (!See_invisible())
            see_monsters();
        if ((game.u.intrinsic?.HInvis || game.u.uprops?.INVIS)
            && !Blind()) {
            newsym(game.u.ux, game.u.uy);
            await pline('Suddenly you cannot see yourself.');
            learnring(obj, true);
        }
    } else if (obj.otyp === ONAMES.RIN_INVISIBILITY) {
        if (!Invis() && !game.u.blocked?.INVIS && !Blind()) {
            newsym(game.u.ux, game.u.uy);
            await Your(`body seems to unfade${
                See_invisible() ? ' completely.' : '...'}`);
            learnring(obj, true);
        }
    } else if (obj.otyp === ONAMES.RIN_WARNING) {
        see_monsters();
    } else if (obj.otyp === ONAMES.RIN_PROTECTION_FROM_SHAPE_CHAN) {
        if (!Protection_from_shape_changers()) {
            const { restartcham } = await import('./mon.js');
            restartcham();
        }
    } else if (PASSIVE_RING_TYPES.has(obj.otyp)) {
        /* setworn() already removed the ring's ordinary property. */
    } else {
        note_unported_do_wear(`Ring_off:otyp=${obj.otyp}`);
    }
}

// src/do_wear.c:1449 Ring_off()
export async function Ring_off(obj) {
    await Ring_off_or_gone(obj, false);
}

// src/do_wear.c:1455 Ring_gone()
export async function Ring_gone(obj) {
    await Ring_off_or_gone(obj, true);
}

// src/do_wear.c:2030 canwearobj() — find the slot; refuse with C's message
// when it is taken. The polymorph, trap and welded-weapon arms record.
// src/do_wear.c:1911 canwearobj() — which slot this armor would occupy, or
// 0 with the reason. The silent core is synchronous so equip_ok() (the
// getobj filter, src/do_wear.c:3413) can consult it per item; the async
// wrapper prints the failure when the caller asked for noise.
export function canwearobj_core(otmp) {
    const fail = (msg) => ({ mask: 0, msg });
    const already_wearing = (cc) => fail(() => You(`are already wearing ${cc}.`));

    if (otmp.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG
                          | W_ARMF | W_ARMU))
        return already_wearing('that');
    if (is_helmet(otmp)) {
        const uarmh = worn(W_ARMH);
        if (uarmh)
            return already_wearing(an(helm_simple_name(uarmh)));
        return { mask: W_ARMH };
    } else if (is_shield(otmp)) {
        const uarms = worn(W_ARMS);
        if (uarms) return already_wearing('a shield');
        if (game.u.uwep && bimanual_obj(game.u.uwep))
            return fail(() => You(
                'cannot wear a shield while wielding a two-handed weapon.'));
        return { mask: W_ARMS };
    } else if (is_boots(otmp)) {
        const uarmf = worn(W_ARMF);
        if (uarmf) return already_wearing('boots');
        if (game.u.utrap) {
            note_unported_do_wear('canwearobj:boots_trapped');
            return { mask: 0 };
        }
        return { mask: W_ARMF };
    } else if (is_gloves(otmp)) {
        const uarmg = worn(W_ARMG);
        if (uarmg) return already_wearing('gloves');
        return { mask: W_ARMG };
    } else if (is_shirt(otmp)) {
        const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarmu = worn(W_ARMU);
        if (uarm || uarmc || uarmu) {
            if (uarmu)
                return already_wearing('a shirt');
            return fail(() => You(`can't wear that over your ${
                (uarm && !uarmc) ? 'armor'
                : cloak_simple_name(uarmc)}.`));
        }
        return { mask: W_ARMU };
    } else if (is_cloak(otmp)) {
        const uarmc = worn(W_ARMC);
        if (uarmc)
            return already_wearing(an(cloak_simple_name(uarmc)));
        return { mask: W_ARMC };
    } else if (is_suit(otmp)) {
        const uarmc = worn(W_ARMC);
        if (uarmc)
            return fail(() => You(`cannot wear armor over a ${
                cloak_simple_name(uarmc)}.`));
        if (worn(W_ARM)) return already_wearing('some armor');
        return { mask: W_ARM };
    }
    note_unported_do_wear(`canwearobj:otyp=${otmp.otyp}`);
    return { mask: 0 };
}

export async function canwearobj(otmp, noisy) {
    const r = canwearobj_core(otmp);
    if (!r.mask && noisy && r.msg)
        await r.msg();
    return r.mask;
}

/* include/obj.h bimanual() needs both hands */
function bimanual_obj(o) {
    return objects[o.otyp].oc_bimanual
        || (objects[o.otyp].oc_class === 2 /* WEAPON */
            && objects[o.otyp].oc_big);
}

export function helm_simple_name(h) {
    /* "hat" for flimsy headgear, else "helm" */
    if (!h)
        return 'hat';
    return hard_helmet(h) ? 'helm' : 'hat';
}
export function cloak_simple_name(c) {
    if (c) {
        switch (c.otyp) {
        case ONAMES.ROBE: return 'robe';
        case ONAMES.MUMMY_WRAPPING: return 'wrapping';
        case ONAMES.ALCHEMY_SMOCK:
            return (objects[c.otyp].oc_name_known && c.dknown)
                ? 'smock' : 'apron';
        default: break;
        }
    }
    return 'cloak';
}

// src/do_wear.c:2201 accessory_or_armor_on()
export async function accessory_or_armor_on(obj) {
    let mask = 0;
    const armor = obj.oclass === OCLASSES_ARMOR;
    const ring = obj.oclass === OCLASSES_RING || obj.otyp === ONAMES.MEAT_RING;
    const amulet = obj.oclass === OCLASSES_AMULET;
    const eyewear = obj.otyp === ONAMES.BLINDFOLD || obj.otyp === ONAMES.TOWEL
        || obj.otyp === ONAMES.LENSES;

    if (obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                         | W_ARMU | W_RINGL | W_RINGR | W_AMUL)) {
        await You('are already wearing that!');
        return ECMD_OK;
    }

    if (armor) {
        mask = await canwearobj(obj, true);
        if (!mask)
            return ECMD_OK;
    } else if (ring) {
        if (nolimbs(game.youmonst.data)) {
            await You('cannot make the ring stick to your body.');
            return ECMD_OK;
        }
        const uleft = worn(W_RINGL), uright = worn(W_RINGR);
        if (uleft && uright) {
            await pline('There are no more ring-fingers to fill.');
            return ECMD_OK;
        }
        if (uleft) {
            mask = W_RINGR;
        } else if (uright) {
            mask = W_RINGL;
        } else {
            for (;;) {
                const answer = await tty_yn_function(
                    'Which ring-finger, Right or Left?', 'rl', '\0');
                if (answer === '\0' || answer === '\x1b')
                    return ECMD_OK;
                if (answer === 'l' || answer === 'L') { mask = W_RINGL; break; }
                if (answer === 'r' || answer === 'R') { mask = W_RINGR; break; }
            }
        }
        if (worn(W_ARMG) && worn(W_ARMG).cursed) {
            note_unported_do_wear('accessory_on:cursed_gloves');
            return ECMD_OK;
        }
    } else if (amulet) {
        if (worn(W_AMUL)) {
            await You('are already wearing an amulet.');
            return ECMD_OK;
        }
    } else if (eyewear) {
        /* src/do_wear.c:2324 — has_head() is true for every current hero
           form; the ublindf conflict messages */
        const ub = worn(W_TOOL);
        if (ub) {
            if (ub.otyp === ONAMES.TOWEL)
                await Your('face is already covered by a towel.');
            else if (ub.otyp === ONAMES.BLINDFOLD)
                await You(`are already wearing ${
                    obj.otyp === ONAMES.LENSES ? 'lenses' : 'a blindfold'}.`);
            else if (ub.otyp === ONAMES.LENSES)
                await You(`are already wearing ${
                    obj.otyp === ONAMES.BLINDFOLD ? 'a blindfold'
                                                  : 'some lenses'}.`);
            return ECMD_OK;
        }
    } else {
        await You("can't wear that!");
        return ECMD_OK;
    }

    /* retouch_object(): silver/artifact touch effects; nothing reachable */

    if (armor) {
        setworn(obj, mask);
        let afternmv = null;
        if (mask === W_ARM) afternmv = Armor_on;
        else if (mask === W_ARMC) afternmv = Cloak_on;
        else if (mask === W_ARMH) afternmv = Helmet_on;
        else if (mask === W_ARMG) afternmv = Gloves_on;
        else if (mask === W_ARMF) afternmv = Boots_on;
        else if (mask === W_ARMS) afternmv = Shield_on;
        else if (mask === W_ARMU) afternmv = Shirt_on;

        const delay = -(objects[obj.otyp].oc_delay || 0);
        if (delay) {
            game.afternmv = afternmv;
            nomul(delay);
            game.multi_reason = 'dressing up';
            game.nomovemsg = 'You finish your dressing maneuver.';
        } else {
            game.afternmv = afternmv;
            await unmul('');
            await on_msg(obj);
        }
    } else if (ring) {
        setworn(obj, mask);
        await Ring_on(obj);
        await on_msg(obj);
    } else if (amulet) {
        await Amulet_on(obj);
    } else if (eyewear) {
        await Blindf_on(obj);
    }
    return ECMD_TIME;
}

// src/do_wear.c:1461 Blindf_on() — wear a blindfold/towel/lenses. The
// wielded-release, ball&chain and Eyes-of-the-Overworld arms need absent
// state; the blindness toggle itself is the live path.
async function toggle_blindness() {
    (game.disp ||= {}).botl = true;
    game.vision_full_recalc = 1;
    const { vision_recalc } = await import('./vision.js');
    vision_recalc(0);
}

function current_equipment_blindness() {
    const u = game.u;
    const facewear_blinds = u.ublindf
        && (u.ublindf.otyp === ONAMES.BLINDFOLD
            || u.ublindf.otyp === ONAMES.TOWEL);
    return !u.blocked?.BLINDED
        && (!!u.intrinsic?.HBlinded || facewear_blinds);
}

export async function Blindf_on(otmp) {
    const already_blind = Blind();

    setworn(otmp, W_TOOL);
    game.u.ublind = current_equipment_blindness() ? 1 : 0;
    await on_msg(otmp);

    const blind_now = Blind();
    if (blind_now && !already_blind) {
        if (game.flags?.verbose)
            await You_cant('see any more.');
        await toggle_blindness();
    } else if (already_blind && !blind_now) {
        await You('can see!');
        await toggle_blindness();
    }
}

// src/do_wear.c:1893 cursed() — check if something worn is cursed _and_
// unremovable; prints the refusal and learns bknown.
export async function cursed(otmp) {
    const uwep = worn(W_WEP);
    if ((otmp === uwep) ? welded(otmp) : !!otmp.cursed) {
        const use_plural = is_boots(otmp) || is_gloves(otmp)
                           || otmp.otyp === ONAMES.LENSES || otmp.quan > 1;
        const uarmg = worn(W_ARMG);
        if (Glib() && otmp.bknown
            && (uarmg ? otmp === uwep
                       : !!(otmp.owornmask & (W_WEP | W_RINGL | W_RINGR)))) {
            await pline(`Despite your slippery ${uarmg
                ? gloves_simple_name(uarmg) : 'fingers'}, you can't.`);
        } else {
            await You(`can't.  ${use_plural ? 'They are' : 'It is'} cursed.`);
        }
        otmp.bknown = 1;
        return 1;
    }
    return 0;
}

// src/do_wear.c:2987 better_not_take_that_off(). The prompt deliberately
// ignores current stone resistance. Losing that resistance later while the
// corpse is still carried would otherwise leave the hero unprotected.
async function better_not_take_that_off(otmp) {
    const corpse = (game.invent || []).find((obj) =>
        obj.otyp === ONAMES.CORPSE
        && touch_petrifies(game.mons[obj.corpsenm]));
    if (!corpse)
        return false;

    const { u_safe_from_fatal_corpse } = await import('./pickup.js');
    if (u_safe_from_fatal_corpse(corpse, st_corpse | st_petrifies))
        return false;

    const species = corpse_xname(corpse, null,
        CXN_SINGULAR | CXN_NOCORPSE | CXN_NOARTICLE);
    const prompt = `Take off your ${gloves_simple_name(otmp)} despite `
                 + `carrying a dead ${species}?`;
    const { paranoid_ynq } = await import('./cmd.js');
    return (await paranoid_ynq(true, prompt, false)) !== 'y';
}

// src/do_wear.c:2696 select_off() — vet removal and accumulate the takeoff
// mask; a refusal prints its reason and leaves the mask empty.
async function select_off(otmp) {
    if (!otmp) return 0;
    const uwep = worn(W_WEP), uarmg = worn(W_ARMG), uarmc = worn(W_ARMC),
          uarm = worn(W_ARM);
    const uleft = worn(W_RINGL), uright = worn(W_RINGR);
    if (!game.context_takeoff) game.context_takeoff = { mask: 0 };

    /* special ring checks; RING_ON_PRIMARY is the right hand (righty) */
    if (otmp === uright || otmp === uleft) {
        let buf = null, why = null;
        if (nolimbs(game.youmonst.data)) {
            await pline('The ring is stuck.');
            return 0;
        } else if (welded(uwep) && (otmp === uright || bimanual(uwep))) {
            buf = 'free a weapon hand';
            why = uwep;
        } else if (uarmg && (uarmg.cursed || Glib())) {
            buf = `take off your ${Glib() ? 'slippery ' : ''}`
                + gloves_simple_name(uarmg);
            if (uarmg.cursed)
                why = uarmg;
        }
        if (buf) {
            await You(`cannot ${buf} to remove the ring.`);
            if (why)
                why.bknown = 1;
            return 0;
        }
    }
    /* special glove checks */
    if (otmp === uarmg) {
        if (welded(uwep)) {
            await You('are unable to take off your gloves'
                      + ` while wielding that ${is_sword(uwep) ? 'sword' : 'weapon'}.`);
            uwep.bknown = 1;
            return 0;
        } else if (Glib()) {
            await pline(`${uarmg.unpaid ? 'The' : 'Your'} `
                      + `${gloves_simple_name(uarmg)} are too slippery to take off.`);
            return 0;
        }
        if (await better_not_take_that_off(otmp))
            return 0;
    }
    /* special boot checks */
    if (otmp === worn(W_ARMF)) {
        if (game.u.utrap && game.u.utraptype === TT_BEARTRAP) {
            await pline('The bear trap prevents you from pulling your foot out.');
            return 0;
        } else if (game.u.utrap && game.u.utraptype === TT_INFLOOR) {
            await You('are stuck in the ' + surface(game.u.ux, game.u.uy)
                      + ', and cannot pull your feet out.');
            return 0;
        }
    }
    /* special suit and shirt checks */
    if (otmp === uarm || otmp === worn(W_ARMU)) {
        let buf = null, why = null;
        if (uarmc && uarmc.cursed) {
            buf = `remove your ${cloak_simple_name(uarmc)}`;
            why = uarmc;
        } else if (otmp === worn(W_ARMU) && uarm && uarm.cursed) {
            buf = 'remove your suit';
            why = uarm;
        } else if (welded(uwep) && bimanual(uwep)) {
            buf = `release your ${is_sword(uwep) ? 'sword' : 'weapon'}`;
            why = uwep;
        }
        if (why) {
            await You(`cannot ${buf} to take off ${the(xname(otmp))}.`);
            why.bknown = 1;
            return 0;
        }
    }
    /* Cursed alternate and quivered items can be un-readied. A secondary
       weapon only uses the ordinary curse check while it is actively being
       wielded as the second half of two-weapon combat. */
    if (otmp !== worn(W_QUIVER)
        && !(otmp === worn(W_SWAPWEP) && !game.u.twoweap)
        && await cursed(otmp))
        return 0;

    for (const mask of [W_ARM, W_ARMC, W_ARMF, W_ARMG, W_ARMH, W_ARMS,
                        W_ARMU, W_RINGL, W_RINGR, W_AMUL, W_TOOL, W_WEP,
                        W_SWAPWEP, W_QUIVER]) {
        if (otmp === worn(mask)) {
            game.context_takeoff.mask |= mask;
            break;
        }
    }
    return 0;
}

// src/do_wear.c:3016 reset_remarm()
export function reset_remarm() {
    game.context_takeoff = {
        mask: 0, what: 0, delay: 0, disrobing: '',
    };
}

const takeoff_order = [
    W_TOOL, W_WEP, W_ARMS, W_ARMG, W_RINGL, W_RINGR, W_ARMC, W_ARMH,
    W_AMUL, W_ARM, W_ARMU, W_ARMF, W_SWAPWEP, W_QUIVER,
];

// src/do_wear.c do_takeoff(), one item from the 'A' occupation. Weapon slots
// have their own feedback; armor and rings return the removed item so the
// occupation can print off_msg() in the same place C does.
async function do_takeoff() {
    const doff = game.context_takeoff;
    const was_twoweap = !!game.u.twoweap;
    let otmp = null;

    doff.mask |= I_SPECIAL;
    try {
        if (doff.what === W_WEP) {
            const uwep = worn(W_WEP);
            if (uwep && !await cursed(uwep)) {
                setuwep(null);
                await You(was_twoweap
                    ? 'are no longer wielding either weapon.'
                    : `are ${empty_handed()}.`);
            }
        } else if (doff.what === W_SWAPWEP) {
            setuswapwep(null);
            await You(`${was_twoweap ? 'are ' : ''}no longer ${
                was_twoweap ? 'wielding two weapons at once'
                    : 'have a second weapon readied'}.`);
        } else if (doff.what === W_QUIVER) {
            setuqwep(null);
            await You('no longer have ammunition readied.');
        } else if (doff.what & (W_ARM | W_ARMC | W_ARMF | W_ARMG | W_ARMH
                                | W_ARMS | W_ARMU)) {
            otmp = worn(doff.what);
            if (otmp && !await cursed(otmp))
                await slot_off(otmp);
        } else if (doff.what === W_AMUL) {
            otmp = worn(W_AMUL);
            if (otmp && !await cursed(otmp))
                await Amulet_off();
        } else if (doff.what === W_RINGL || doff.what === W_RINGR) {
            otmp = worn(doff.what);
            if (otmp && !await cursed(otmp))
                await Ring_off(otmp);
        } else if (doff.what === W_TOOL) {
            const blindf = worn(W_TOOL);
            if (blindf && !await cursed(blindf))
                await Blindf_off(blindf);
        }
    } finally {
        doff.mask &= ~I_SPECIAL;
    }
    return otmp;
}

// src/do_wear.c take_off(), occupation callback for the 'A' command.
async function take_off() {
    const doff = game.context_takeoff;

    if (doff.what) {
        if (doff.delay > 0) {
            doff.delay--;
            return 1;
        }
        const otmp = await do_takeoff();
        if (otmp)
            await off_msg(otmp);
        doff.mask &= ~doff.what;
        doff.what = 0;
    }

    doff.what = takeoff_order.find((mask) => (doff.mask & mask) !== 0) || 0;
    doff.delay = 0;
    let otmp = null;

    if (!doff.what) {
        await You(`finish ${doff.disrobing}.`);
        return 0;
    }
    if (doff.what === W_WEP || doff.what === W_SWAPWEP
        || doff.what === W_QUIVER || doff.what === W_AMUL
        || doff.what === W_RINGL || doff.what === W_RINGR
        || doff.what === W_TOOL) {
        doff.delay = 1;
    } else {
        otmp = worn(doff.what);
        if (doff.what === W_ARM && worn(W_ARMC))
            doff.delay += 2 * (objects[worn(W_ARMC).otyp].oc_delay || 0) + 1;
        if (doff.what === W_ARMU) {
            if (worn(W_ARM))
                doff.delay += 2 * (objects[worn(W_ARM).otyp].oc_delay || 0);
            if (worn(W_ARMC))
                doff.delay += 2 * (objects[worn(W_ARMC).otyp].oc_delay || 0) + 1;
        }
    }
    if (otmp)
        doff.delay += objects[otmp.otyp].oc_delay || 0;
    if (doff.delay > 0)
        doff.delay--;

    set_occupation(take_off, doff.disrobing, 0);
    return 1;
}

async function query_worn_items(allow) {
    const eligible = (game.invent || []).filter((obj) =>
        !!obj.owornmask && allow(obj));
    if (!eligible.length)
        return null;

    const letters = eligible.map((obj) => obj.invlet).join('');
    const entries = display_inventory(letters);
    const {
        tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
        tty_select_menu, tty_destroy_nhwindow, NHW_MENU,
    } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ANY } =
        await import('./const.js');
    const { NO_COLOR } = await import('./terminal.js');

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const entry of entries) {
        tty_add_menu(win, entry.glyphinfo ?? null,
                     entry.heading ? 0 : entry.invlet.charCodeAt(0),
                     entry.invlet || 0, 0, entry.attr, NO_COLOR, entry.str,
                     MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, 'What do you want to take off?');
    const picks = await tty_select_menu(win, PICK_ANY);
    tty_destroy_nhwindow(win);
    return picks.map((id) => (game.invent || [])
        .find((obj) => obj.invlet.charCodeAt(0) === id)).filter(Boolean);
}

const removable_mask = W_WEAPONS | W_ARM | W_ARMC | W_ARMH | W_ARMS
                     | W_ARMG | W_ARMF | W_ARMU | W_RINGL | W_RINGR
                     | W_AMUL | W_TOOL;

function takeoff_menu_style() {
    const raw = game.flags?.menu_style ?? game.flags?.menustyle
              ?? game.rc?.opts?.menustyle;
    if (typeof raw === 'number')
        return raw;
    switch (String(raw || 'full').toLowerCase()[0]) {
    case 't': return MENU_TRADITIONAL;
    case 'c': return MENU_COMBINATION;
    case 'p': return MENU_PARTIAL;
    default: return MENU_FULL;
    }
}

function is_worn_for_takeoff(obj) {
    return !!(obj?.owornmask & removable_mask);
}

function takeoff_buc(obj) {
    /* Priests know the BUC state of carried objects. */
    if (game.urole?.mnum === 'PM_CLERIC' && !obj.bknown)
        obj.bknown = 1;
    return !obj.bknown ? 'X' : obj.blessed ? 'B' : obj.cursed ? 'C' : 'U';
}

function has_unpaid(olist) {
    return (olist || []).some((obj) => obj.unpaid || has_unpaid(obj.cobj));
}

/* src/invent.c ggetobj("take off", ...). Traditional mode performs the
   selection itself. Combination mode only gathers filters unless the player
   chose lowercase 'a', which is the direct all-items shortcut. */
async function ggetobj_takeoff(combo) {
    const invent = game.invent || [];
    const eligible = invent.filter(is_worn_for_takeoff);
    const classes = [];
    for (const obj of eligible) {
        const symbol = def_oc_syms[obj.oclass];
        if (symbol && !classes.includes(symbol))
            classes.push(symbol);
    }

    let choices = `${classes.join('')} `;
    if (has_unpaid(invent))
        choices += 'u';
    for (const buc of 'BUCX') {
        if (eligible.some((obj) => takeoff_buc(obj) === buc))
            choices += buc;
    }
    if (invent.some((obj) => obj.pickup_prev))
        choices += 'P';
    choices += 'ai';
    if (!combo)
        choices += 'm';

    const { getlin } = await import('./cmd.js');
    let answer;
    for (;;) {
        answer = await getlin(
            `What kinds of thing do you want to take off? [${choices}]`);
        if (answer === '\x1b')
            return { result: 0, allFinished: false };
        if (!answer.includes('i'))
            break;

        /* display_inventory(..., TRUE) permits a letter to dismiss the
           inventory. Its return value is intentionally ignored here. */
        const { display_pickinv } = await import('./invent.js');
        const letters = eligible.map((obj) => obj.invlet).join('');
        const picked = await display_pickinv(letters, null, null, false);
        if (picked === '\x1b')
            return { result: 0, allFinished: false };
    }

    const { add_valid_menu_class, allow_category } = await import('./pickup.js');
    const classNumbers = new Map(def_oc_syms.map((symbol, i) => [symbol, i]));
    const removeableClasses = new Set([
        OCLASSES.ARMOR_CLASS, OCLASSES.WEAPON_CLASS, OCLASSES.RING_CLASS,
        OCLASSES.AMULET_CLASS, OCLASSES.TOOL_CLASS,
    ]);
    const extraClasses = new Set(eligible
        .filter((obj) => obj.owornmask & W_WEAPONS)
        .map((obj) => obj.oclass));
    const selectedClasses = [];
    let allflag = false, menuSeen = false;

    for (const symbol of answer) {
        if (symbol === ' ')
            continue;
        const oclass = classNumbers.get(symbol);
        if (oclass !== undefined && oclass !== OCLASSES.MAXOCLASSES
            && !extraClasses.has(oclass)) {
            if (!removeableClasses.has(oclass)) {
                await pline('Not applicable.');
                return { result: 0, allFinished: false };
            }
            if (oclass === OCLASSES.ARMOR_CLASS
                && !eligible.some((obj) => obj.oclass === oclass)) {
                await You('are not wearing any armor.');
                return { result: 0, allFinished: false };
            }
            if (oclass === OCLASSES.WEAPON_CLASS
                && !eligible.some((obj) => obj.owornmask & W_WEAPONS)) {
                await You('are not wielding anything.');
                return { result: 0, allFinished: false };
            }
            if (oclass === OCLASSES.RING_CLASS
                && !eligible.some((obj) => obj.owornmask & (W_RINGL | W_RINGR))) {
                await You('are not wearing rings.');
                return { result: 0, allFinished: false };
            }
            if (oclass === OCLASSES.AMULET_CLASS
                && !eligible.some((obj) => obj.owornmask & W_AMUL)) {
                await You('are not wearing an amulet.');
                return { result: 0, allFinished: false };
            }
            if (oclass === OCLASSES.TOOL_CLASS
                && !eligible.some((obj) => obj.owornmask & W_TOOL)) {
                await You('are not wearing a blindfold.');
                return { result: 0, allFinished: false };
            }
        }

        if (symbol === 'a') {
            allflag = true;
        } else if (symbol === 'A') {
            /* default item-by-item behavior */
        } else if ('uBUCXP'.includes(symbol)) {
            add_valid_menu_class(symbol);
        } else if (symbol === 'm') {
            menuSeen = true;
        } else if (oclass === undefined) {
            await You(`don't have any ${symbol}'s.`);
        } else if (!selectedClasses.includes(oclass)) {
            selectedClasses.push(oclass);
            add_valid_menu_class(oclass);
        }
    }

    if (menuSeen) {
        const filtered = selectedClasses.length
            || [...answer].some((symbol) => 'uBUCXP'.includes(symbol));
        return { result: (allflag || !filtered) ? -2 : -3,
                 allFinished: false };
    }
    if (combo && !allflag)
        return { result: 0, allFinished: false };

    let candidates = [];
    const byCategory = [...answer].some((symbol) => 'uBUCXP'.includes(symbol));
    const addCandidates = (oclass) => {
        for (const obj of eligible) {
            if ((oclass === null || obj.oclass === oclass)
                && (!byCategory || allow_category(obj))
                && !candidates.includes(obj))
                candidates.push(obj);
        }
    };
    if (selectedClasses.length) {
        for (const oclass of selectedClasses)
            addCandidates(oclass);
    } else {
        addCandidates(null);
    }
    candidates.sort((a, b) => a.invlet.localeCompare(b.invlet));

    let sawCandidate = false;
    for (const obj of candidates) {
        sawCandidate = true;
        let choice = 'y';
        if (!allflag) {
            choice = await tty_yn_function(
                `${xprname(obj, null, obj.invlet, false, 0, 0)}?`,
                'ynaq', 'n');
        }
        if (choice === 'q')
            break;
        if (choice === 'a')
            allflag = true;
        if (allflag || choice === 'y')
            await select_off(obj);
    }
    if (!sawCandidate)
        await pline('No applicable objects.');
    return { result: 0, allFinished: combo && allflag };
}

// src/do_wear.c menu_remarm(), all four menu styles.
async function menu_remarm(retry = 0) {
    const {
        query_remove_categories, add_valid_menu_class, allow_category,
    } = await import('./pickup.js');
    /* A negative retry comes from Traditional ggetobj(). Keep the class and
       BUC filters it just collected until query_worn_items() consumes them. */
    if (!retry)
        add_valid_menu_class(0);
    try {
        const style = takeoff_menu_style();
        let all_worn = true;
        if (retry) {
            all_worn = retry === -2;
        } else if (style === MENU_FULL) {
            const categories = await query_remove_categories(game.invent || []);
            if (!categories.length)
                return;

            all_worn = false;
            for (const category of categories) {
                if (category === -2)
                    all_worn = true;
                else
                    add_valid_menu_class(category);
            }
            if (categories.some((category) => {
                const ch = typeof category === 'number'
                    ? String.fromCharCode(category) : category;
                return 'uBUCX'.includes(ch);
            }))
                all_worn = false;
        } else if (style === MENU_COMBINATION) {
            const selection = await ggetobj_takeoff(true);
            if (selection.allFinished)
                return;
            all_worn = selection.result === -2;
        }

        const selected = await query_worn_items(
            all_worn ? () => true : allow_category);
        if (selected === null) {
            if (style !== MENU_COMBINATION)
                await There('is nothing else you can remove or unwield.');
            return;
        }
        for (const obj of selected)
            await select_off(obj);
    } finally {
        add_valid_menu_class(0);
    }
}

// src/do_wear.c doddoremarm(), the 'A' command.
export async function doddoremarm() {
    const doff = game.context_takeoff ||= {
        mask: 0, what: 0, delay: 0, disrobing: '',
    };
    if (doff.what || doff.mask) {
        await You(`continue ${doff.disrobing}.`);
        set_occupation(take_off, doff.disrobing, 0);
        return ECMD_OK;
    }

    const any_worn = (game.invent || []).some(is_worn_for_takeoff);
    if (!any_worn) {
        await You('are not wearing anything.');
        return ECMD_OK;
    }

    const { add_valid_menu_class } = await import('./pickup.js');
    add_valid_menu_class(0);
    const style = takeoff_menu_style();
    if (style === MENU_TRADITIONAL) {
        const selection = await ggetobj_takeoff(false);
        if (selection.result < -1)
            await menu_remarm(selection.result);
    } else {
        await menu_remarm();
    }
    add_valid_menu_class(0);
    if (doff.mask) {
        doff.disrobing = (doff.mask & ~W_WEAPONS)
            ? 'disrobing' : 'disarming';
        await take_off();
    }
    return ECMD_OK;
}

// src/do_wear.c:76 armoroff()
async function armoroff(otmp) {
    const delay = -(objects[otmp.otyp].oc_delay || 0);

    if (await cursed(otmp))
        return 0;
    const cat = objects[otmp.otyp].oc_subtyp;
    const names = ['suit', 'shield', 'helmet', 'gloves', 'boots',
                   'cloak', 'shirt'];
    let what = names[cat] || 'armor';
    if (cat === 0) what = suit_simple_name(otmp);
    if (cat === 5) what = cloak_simple_name(otmp);
    if (cat === 2) what = helm_simple_name(otmp);
    if (cat === 3) what = gloves_simple_name(otmp);
    if (cat === 4) what = boots_simple_name(otmp);

    if (delay) {
        nomul(delay);
        game.multi_reason = 'disrobing';
        game.afternmv = async () => {
            await slot_off(otmp);
        };
        game.nomovemsg = `You finish taking off your ${what}.`;
    } else {
        await slot_off(otmp);
        await off_msg(otmp);
    }
    return 1;
}

/* the per-slot *_off handlers, folded: drop the worn state and run the
   slot-specific feedback that is ported (Boots_off's speed message) */
async function slot_off(otmp) {
    const mask = otmp.owornmask
        & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF | W_ARMU);
    if (otmp.owornmask & W_ARMF) {
        await Boots_off(otmp);
        return;
    }
    if (otmp.owornmask & W_ARMG) {
        await Gloves_off(otmp);
        return;
    }
    if (otmp.owornmask & W_ARMC) {
        await Cloak_off(otmp);
        return;
    }
    if (otmp.owornmask & W_ARMH) {
        await Helmet_off(otmp);
        return;
    }
    if (otmp.owornmask & W_ARM) {
        /* Armor_off clears setworn's primary property before removing the
           second property supplied by dragon armor. */
        const wasGoldLight = is_gold_dragon_armor(otmp) && !!otmp.lamplit;
        setworn(null, W_ARM);
        if (wasGoldLight)
            await end_gold_dragon_light(otmp);
        await dragon_armor_handling(otmp, false);
    } else {
        setworn(null, mask); /* each C *_off handler clears its own slot */
    }
}

export async function Gloves_off(otmp) {
    switch (otmp.otyp) {
    case ONAMES.GAUNTLETS_OF_POWER:
        makeknown(otmp.otyp);
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        if (!game.context_takeoff?.cancelled_don && otmp.spe) {
            makeknown(otmp.otyp);
            attribute_bonus_array()[A_DEX] -= otmp.spe;
        }
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_FUMBLING: {
        const oldprop = (game.u.uprops?.FUMBLING || 0) & ~WORN_GLOVES;
        const intrinsic = (game.u.intrinsic ||= {});
        if (!oldprop && !((intrinsic.HFumbling || 0) & ~TIMEOUT)) {
            intrinsic.HFumbling = 0;
            if (game.u.uprops)
                delete game.u.uprops.FUMBLING;
        }
        break;
    }
    }
    setworn(null, W_ARMG);
    await encumber_msg();
}

// src/do_wear.c:1771 armor_or_accessory_off()
export async function armor_or_accessory_off(obj) {
    if (!(obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                           | W_ARMU | W_RINGL | W_RINGR | W_AMUL | W_TOOL))) {
        await You('are not wearing that.');
        return ECMD_OK;
    }
    const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarmu = worn(W_ARMU);
    if ((obj === uarm && uarmc) || (obj === uarmu && (uarmc || uarm))) {
        let what = '';
        if (uarmc) what += cloak_simple_name(uarmc);
        if (obj === uarmu && uarm) {
            if (uarmc) what += ' and ';
            what += 'suit';
        }
        await You(`can't take that off without taking off your ${what} first.`);
        return ECMD_OK;
    }

    reset_remarm(); /* clear context.takeoff.mask */
    await select_off(obj);
    if (!game.context_takeoff.mask)
        return ECMD_OK;
    /* none of armoroff()/Ring_/Amulet/Blindf_off() use context.takeoff.mask */
    reset_remarm();

    if (obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                         | W_ARMU)) {
        await armoroff(obj);
    } else if (obj.owornmask & (W_RINGL | W_RINGR)) {
        await off_msg(obj);
        await Ring_off(obj);
    } else if (obj.owornmask & W_AMUL) {
        await Amulet_off();
    } else if (obj.owornmask & W_TOOL) {
        await Blindf_off(obj);
    }
    return ECMD_TIME;
}

// src/do_wear.c:1495 Blindf_off()
export async function Blindf_off(otmp) {
    const nooffmsg = !otmp;
    if (!otmp)
        otmp = game.u.ublindf;
    if (!otmp)
        return;
    const was_blind = Blind();

    game._deferred_status_blind = was_blind;
    setworn(null, W_TOOL);   /* src/do_wear.c Blindf_off */
    game.u.ublind = current_equipment_blindness() ? 1 : 0;
    if (!nooffmsg)
        await off_msg(otmp);

    const blind_now = Blind();
    if (blind_now) {
        if (was_blind) {
            if (otmp.otyp !== ONAMES.LENSES)
                await You('still cannot see.');
        } else {
            await You_cant('see anything now!');
            delete game._deferred_status_blind;
            await toggle_blindness();
        }
    } else if (was_blind) {
        /* gulp_blnd_check() needs the engulfed state; absent */
        await You('can see again.');
        delete game._deferred_status_blind;
        await toggle_blindness();
    }
    delete game._deferred_status_blind;
}

/* src/do_wear.c:1733 count_worn_stuff() */
function count_worn_stuff(all) {
    let armor = 0, accessories = 0, otmp = null;
    for (const mask of [W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF,
                        W_ARMU]) {
        const o = worn(mask);
        if (o) { armor++; if (!otmp) otmp = o; }
    }
    /* MOREWORN skips cloaked suit/shirt for the pick, but count includes
       only ACCESSIBLE armor; C: uarm counted only if !uarmc, uarmu only if
       !uarm && !uarmc */
    const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarmu = worn(W_ARMU);
    armor = 0; otmp = null;
    for (const [mask, blocked] of [[W_ARMH, false], [W_ARMS, false],
                                   [W_ARMG, false], [W_ARMF, false],
                                   [W_ARMC, false],
                                   [W_ARM, !!uarmc],
                                   [W_ARMU, !!(uarm || uarmc)]]) {
        const o = worn(mask);
        if (o && !blocked) { armor++; otmp = o; }
    }
    let accessory = null;
    for (const mask of [W_RINGL, W_RINGR, W_AMUL, W_TOOL]) {
        const o = worn(mask);
        if (o) {
            accessories++;
            accessory = o;
        }
    }
    return { armor, accessories, otmp: all ? accessory : otmp };
}

// src/do_wear.c:1833 dotakeoff() — the 'T' command.
export async function dotakeoff() {
    const { getobj } = await import('./invent.js');
    const { takeoff_ok } = await import('./cmd.js');
    const { armor, accessories, otmp } = count_worn_stuff(false);
    if (!armor && !accessories) {
        await pline('Not wearing any armor or accessories.');
        return ECMD_OK;
    }
    let pick = otmp;
    if (armor !== 1 || (paranoia_bits() & PARANOID_REMOVE)) {
        pick = await getobj('take off', takeoff_ok, 0);
        if (!pick)
            return ECMD_OK; /* ECMD_CANCEL */
    }
    return await armor_or_accessory_off(pick);
}

// src/do_wear.c:1874 doremring() — the 'R' command.
export async function doremring() {
    const { getobj } = await import('./invent.js');
    const { remove_ok } = await import('./cmd.js');
    const { armor, accessories, otmp } = count_worn_stuff(true);
    if (!accessories && !armor) {
        await pline('Not wearing any accessories or armor.');
        return ECMD_OK;
    }
    let pick = (accessories === 1
                && !(paranoia_bits() & PARANOID_REMOVE)) ? otmp : null;
    if (!pick) {
        pick = await getobj('remove', remove_ok, 0);
        if (!pick)
            return ECMD_OK;
    }
    return await armor_or_accessory_off(pick);
}

// src/do_wear.c:2432 dowear() — the 'W' command.
export async function dowear() {
    if (verysmall(game.youmonst.data) || nohands(game.youmonst.data)) {
        await pline("Don't even bother.");
        return ECMD_OK;
    }
    const { getobj } = await import('./invent.js');
    const { wear_ok } = await import('./cmd.js');
    const otmp = await getobj('wear', wear_ok, 0);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_OK;
}

// src/do_wear.c:2454 doputon() — the 'P' command.
export async function doputon() {
    const { getobj } = await import('./invent.js');
    const { puton_ok } = await import('./cmd.js');
    const otmp = await getobj('put on', puton_ok, 0);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_OK;
}

// src/do_wear.c:3259 obj_erode_type() — which erosion applies to obj.
export function obj_erode_type(otmp) {
    if (is_flammable(otmp))
        return ERODE_BURN;
    else if (is_rustprone(otmp))
        return ERODE_RUST;
    else if (is_crackable(otmp))
        return ERODE_CRACK;
    else if (is_rottable(otmp))
        return ERODE_ROT;
    else if (is_corrodeable(otmp))
        return ERODE_CORRODE;
    return ERODE_NONE;
}

// src/do_wear.c:3277 destroy_arm() — erode rn2(4)+1 random worn armor
// pieces; a piece hit at max erosion is destroyed.
export async function destroy_arm() {
    const armors = [];
    const hits = rn2(4) + 1;
    let ret = 0;

    /* gather worn armor in C's uarm..uarmu order; include non-erodeable */
    for (const mask of [W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF,
                        W_ARMU]) {
        const otmp = (game.invent || [])
            .find(o => ((o.owornmask ?? 0) & mask) !== 0);
        if (otmp)
            armors.push(otmp);
    }
    if (!armors.length)
        return 0;

    for (let i = 0; i < hits; i++) {
        const otmp = armors[rn2(armors.length)];

        if (erosion_matters(otmp, game.objects) && is_damageable(otmp)
            && !otmp.oerodeproof) {
            const erosion = obj_erode_type(otmp);

            if (erosion !== ERODE_NONE) {
                const r = await erode_obj(otmp, xname(otmp), erosion,
                                          EF_PAY | EF_DESTROY);
                if (r !== ER_NOTHING)
                    ret = 1;
                if (r === ER_DESTROYED)
                    break;
            }
        }
    }

    if (ret)
        await stop_occupation();
    return ret;
}

// src/do_wear.c:568 hard_helmet() — hard helms provide better protection
// against falling rocks.
export function hard_helmet(obj) {
    if (!obj || !is_helmet(obj))
        return false;
    return (is_metallic(obj) || is_crackable(obj)) ? true : false;
}

// src/do_wear.c:1862 ia_dotakeoff() — #altdotakeoff, the item-action
// menu's 'T'/'R': the getobj filter skips the inaccessible-equipment test
export async function ia_dotakeoff() {
    game.item_action_in_progress = true;
    const res = await dotakeoff();
    game.item_action_in_progress = false;
    return res;
}

// src/do_wear.c:3062 remarm_swapwep() — '-' picked for the alternate
// weapon from the item-action menu: un-ready it through do_takeoff()
export async function remarm_swapwep() {
    let cq;
    const cmdq = cmdq_pop();
    if (cmdq) {
        /* '-' uswapwep item-action picked from context-sensitive invent */
        cq = cmdq;
    } else {
        cq = { typ: CMDQ_KEY, key: '\0' }; /* something other than '-' */
    }
    if (cq.typ !== CMDQ_KEY || cq.key !== '-' || !game.u.uswapwep)
        return ECMD_FAIL;
    const oldbknown = game.u.uswapwep.bknown; /* when deciding whether this
                                              * command has done something that
                                              * takes time, behave as if a
                                              * cursed secondary weapon can't be
                                              * unwielded even though things
                                              * don't work that way... */
    reset_remarm();
    game.context.takeoff.what = game.context.takeoff.mask = W_SWAPWEP;
    await do_takeoff();
    return (!game.u.uswapwep || game.u.uswapwep.bknown !== oldbknown)
           ? ECMD_TIME : ECMD_OK;
}

// src/do_wear.c:2630 some_armor() — pick a worn armor piece at random,
// weighted toward the body slot (cloak, else suit, else shirt), then a 1/4
// chance each for helmet, gloves, boots and shield.
export function some_armor(victim) {
    const isyou = (victim === game.youmonst);
    let otmph, otmp;

    otmph = isyou ? worn(W_ARMC) : which_armor(victim, W_ARMC);
    if (!otmph)
        otmph = isyou ? worn(W_ARM) : which_armor(victim, W_ARM);
    if (!otmph)
        otmph = isyou ? worn(W_ARMU) : which_armor(victim, W_ARMU);

    otmp = isyou ? worn(W_ARMH) : which_armor(victim, W_ARMH);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    otmp = isyou ? worn(W_ARMG) : which_armor(victim, W_ARMG);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    otmp = isyou ? worn(W_ARMF) : which_armor(victim, W_ARMF);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    otmp = isyou ? worn(W_ARMS) : which_armor(victim, W_ARMS);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    return otmph || null;
}

// src/do_wear.c:3319 adj_abon() — gauntlets of dexterity and helm of
// brilliance move the attribute bonus with their enchantment.
export function adj_abon(otmp, delta) {
    const uarmg = worn(W_ARMG), uarmh = worn(W_ARMH);
    const abon = ((game.u.abon ||= {}).a ||= new Array(A_MAX).fill(0));

    if (uarmg && uarmg === otmp && otmp.otyp === ONAMES.GAUNTLETS_OF_DEXTERITY) {
        if (delta) {
            makeknown(uarmg.otyp);
            abon[A_DEX] += delta;
        }
        (game.disp ||= {}).botl = true;
    }
    if (uarmh && uarmh === otmp && otmp.otyp === ONAMES.HELM_OF_BRILLIANCE) {
        if (delta) {
            makeknown(uarmh.otyp);
            abon[A_INT] += delta;
            abon[A_WIS] += delta;
        }
        (game.disp ||= {}).botl = true;
    }
}

// src/do_wear.c:3144 wornarm_destroyed(), take a destroyed piece of worn
// armor off and use it up.
export async function wornarm_destroyed(wornarm) {
    const wornoid = wornarm.o_id;

    /* if the item is still being donned, stop that; this clears
       uarmc/uarm/&c so doing this now won't interfere with the tests in
       'if (wornarm==uarmc) ... else if (wornarm==uarm) ... else ...' */
    if (donning(wornarm))
        cancel_don();

    if (wornarm === game.u.uarmc)
        await Cloak_off();
    else if (wornarm === game.u.uarm)
        await Armor_off();
    else if (wornarm === game.u.uarmu)
        await Shirt_off();
    else if (wornarm === game.u.uarmh)
        await Helmet_off();
    else if (wornarm === game.u.uarmg)
        await Gloves_off();
    else if (wornarm === game.u.uarmf)
        await Boots_off();
    else if (wornarm === game.u.uarms)
        await Shield_off();

    /* the armor-off routine might have already used up the item;
       using carried() to check wornarm->where==OBJ_INVENT is not viable;
       scan invent instead; if already freed it shouldn't be possible to
       have re-used the stale memory for a new item yet but verify o_id
       just in case */
    for (const invobj of [...(game.invent || [])]) {
        if (invobj === wornarm && invobj.o_id === wornoid) {
            useup(wornarm);
            break;
        }
    }
}

// src/do_wear.c:3184 maybe_destroy_armor(), the armor to destroy unless it
// resists; resisted.v carries the resist so an inner layer stays safe.
function maybe_destroy_armor(armor, atmp, resisted) {
    if ((armor != null) && (!atmp || atmp === armor)
        && ((resisted.v = obj_resists(armor, 0, 90)) === false)) {
        armor.in_use = 1;
        return armor;
    }
    return null;
}

// src/do_wear.c:3196 disintegrate_arm(), destroy one worn piece of armor,
// outermost first; returns 1 when something was destroyed.
export async function disintegrate_arm(atmp) {
    let otmp = null;
    let losing_gloves = false;
    const resisted = { v: false }, resistedc = { v: false },
        resistedsuit = { v: false };

    if ((otmp = maybe_destroy_armor(game.u.uarmc, atmp, resistedc)) != null) {
        await urgent_pline(`Your ${cloak_simple_name(otmp)} crumbles and turns to dust!`);
    } else if (!resistedc.v
             && (otmp = maybe_destroy_armor(game.u.uarm, atmp, resistedsuit)) != null) {
        const suit = suit_simple_name(otmp);

        /* for gold DSM, we don't want Armor_gone() to report that it
           stops shining _after_ we've been told that it is destroyed */
        if (otmp.lamplit)
            await end_burn(otmp, false);
        await urgent_pline(`Your ${suit} ${vtense(suit, 'turn')} to dust and ${
                           vtense(suit, 'fall')} to the ${surface(game.u.ux, game.u.uy)}!`);
    } else if (!resistedc.v && !resistedsuit.v
             && (otmp = maybe_destroy_armor(game.u.uarmu, atmp, resisted)) != null) {
        await urgent_pline(`Your ${shirt_simple_name(otmp)} crumbles into tiny threads and falls apart!`); /* always "shirt" */
    } else if ((otmp = maybe_destroy_armor(game.u.uarmh, atmp, resisted)) != null) {
        await urgent_pline(`Your ${helm_simple_name(otmp)} turns to dust and is blown away!`); /* "helm" or "hat" */
    } else if ((otmp = maybe_destroy_armor(game.u.uarmg, atmp, resisted)) != null) {
        await urgent_pline(`Your ${gloves_simple_name(otmp)} vanish!`);
        losing_gloves = true;
    } else if ((otmp = maybe_destroy_armor(game.u.uarmf, atmp, resisted)) != null) {
        await urgent_pline(`Your ${boots_simple_name(otmp)} disintegrate!`);
    } else if ((otmp = maybe_destroy_armor(game.u.uarms, atmp, resisted)) != null) {
        await urgent_pline(`Your ${shield_simple_name(otmp)} crumbles away!`);
    } else {
        return 0; /* could not destroy anything */
    }

    await wornarm_destroyed(otmp);
    if (losing_gloves)
        await selftouch('You');
    await stop_occupation();
    return 1;
}

// src/do_wear.c:3480 any_worn_armor_ok(), getobj callback: worn armor only.
export function any_worn_armor_ok(obj) {
    if (obj && (obj.owornmask & W_ARMOR))
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/do_wear.c:60 fingers_or_gloves(); plural "fingers" or optionally "gloves"
export function fingers_or_gloves(check_gloves) {
    return ((check_gloves && game.u.uarmg)
            ? gloves_simple_name(game.u.uarmg) /* "gloves" or "gauntlets" */
            : makeplural(body_part(FINGER))); /* "fingers" */
}
