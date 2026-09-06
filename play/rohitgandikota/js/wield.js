// wield.js — what the hero is holding.
// C ref: src/wield.c
//
// Only the quiver command so far. doquiver_core's real work is getobj's
// prompt, which is why 'Q' shows "What do you want to ready? [- cd or ?*]"
// before anything is chosen.

import { game } from './gstate.js';
import { pline } from './display.js';
import { cantwield, could_twoweap, humanoid } from './mondata.js';
import { artifact_light, arti_speak, is_art, retouch_object } from './artifact.js';
import { dropx } from './do.js';
import { ACURR } from './attrib.js';
import { rnd } from './rng.js';
import { Upolyd, plur } from './const.js';
import { You_cant } from './pline.js';
import { touch_petrifies } from './dog.js';
import { bimanual, is_plural, pair_of } from './obj.js';
import { is_weptool, set_bknown, splitobj, clear_splitobjs, unsplitobj } from './mkobj.js';
import { reset_remarm } from './do_wear.js';
import { is_pole } from './u_init.js';
import { will_weld } from './monmove.js';
import { hcolor } from './do_name.js';
import { NH_BLACK, NH_BLUE, NH_AMBER, HAND, A_DEX,
         invlet_basic, CXN_PFX_THE } from './const.js';
import { Yobjnam2, otense, simpleonames, makeplural, an, xname, The,
         Tobjnam, aobjnam, Yname2, yname, vtense, doname,
         corpse_xname, killer_xname } from './objnam.js';
import { body_part } from './polyself.js';
import { uncurse } from './mkobj.js';
import { setworn } from './worn.js';
import { update_inventory, useupall, weight, hands_obj, freeinv,
         addinv_nomerge, splittable } from './invent.js';
import { inv_cnt } from './hack.js';
import { strange_feeling } from './potion.js';
import { exercise, encumber_msg } from './attrib.js';
import { makeknown } from './o_init.js';
import { is_elven_weapon } from './obj.js';
import { rn2 } from './rng.js';
import { Your } from './pline.js';
import { getobj, prinv } from './invent.js';
import { W_QUIVER, W_WEP, W_SWAPWEP, W_ARMOR, W_ACCESSORY, W_SADDLE, P_BOOMERANG, P_DART, ECMD_OK, ECMD_TIME, ECMD_FAIL, ECMD_CANCEL, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_PROMPT, GETOBJ_ALLOWCNT } from './const.js';
import { You } from './pline.js';
import { tty_yn_function } from './tty/topl.js';
import { ART_OGRESMASHER } from './artilist_data.js';
import { Blind, Glib, Stone_resistance } from './youprop.js';
import { instapetrify } from './trap.js';
import { del_light_source, new_light_source, LS_OBJECT } from './light.js';

// include/hack.h:1330 ynq()
const ynq = (query) => tty_yn_function(query, 'ynq', 'q');
import { P_BOW, P_CROSSBOW } from './const.js';
import { OCLASSES, ONAMES, SKILLS } from './objects_data.js';
import { Shk_Your } from './shk.js';



// src/wield.c ready_ok() — which objects getobj should suggest for the quiver.
//
// The '-' case answers for "empty the quiver": suggested only when something
// IS quivered, downplayed otherwise. That is what puts the "- " at the front
// of the prompt's letter list.
export function ready_ok(obj) {
    if (!obj)
        return game.u.uquiver ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;

    /* downplay when wielded, unless more than one */
    if (obj === game.u.uwep || (obj === game.u.uswapwep && game.u.twoweap))
        return (obj.quan === 1) ? GETOBJ_DOWNPLAY : GETOBJ_SUGGEST;

    if (is_ammo(obj)) {
        return ((game.u.uwep && ammo_and_launcher(obj, game.u.uwep))
                || (game.u.uswapwep && ammo_and_launcher(obj, game.u.uswapwep)))
               ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
    } else if (is_launcher(obj)) {
        return GETOBJ_DOWNPLAY;
    } else {
        if (obj.oclass === OCLASSES.WEAPON_CLASS
            || obj.oclass === OCLASSES.COIN_CLASS)
            return GETOBJ_SUGGEST;
    }

    return GETOBJ_DOWNPLAY;
}

// include/obj.h:235 — a launcher has a POSITIVE oc_skill in the bow..crossbow
// range; its ammo carries the same value NEGATED, which is what pairs them.
const is_launcher = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_skill >= P_BOW
    && game.objects[o.otyp].oc_skill <= P_CROSSBOW;

// include/obj.h:238 is_ammo()
export const is_ammo = (o) =>
    (o.oclass === OCLASSES.WEAPON_CLASS || o.oclass === OCLASSES.GEM_CLASS)
    && game.objects[o.otyp].oc_skill >= -P_CROSSBOW
    && game.objects[o.otyp].oc_skill <= -P_BOW;

// include/obj.h:243 matching_launcher() and :244 ammo_and_launcher()
export const matching_launcher = (a, l) =>
    !!l && game.objects[a.otyp].oc_skill === -game.objects[l.otyp].oc_skill;
export const ammo_and_launcher = (a, l) => is_ammo(a) && matching_launcher(a, l);

// src/wield.c:512 doquiver_core() — "ready" or "fire".
export async function doquiver_core(verb) {
    let qbuf;
    let newquiver;
    let res;
    let was_uwep = false;
    const was_twoweap = !!game.u.twoweap;
    let flow = '';

    /* Since the quiver isn't in your hands, don't check cantwield(),
       will_weld(), touch_petrifies(), etc. */
    game.multi = 0;
    if (!(game.invent || []).length) {
        /* could accept '-' to empty quiver, but there's no point since
           inventory is empty so uquiver is already Null */
        await You('have nothing to ready for firing.');
        return ECMD_OK;
    }

    /* forget last splitobj() before calling getobj() with GETOBJ_ALLOWCNT */
    clear_splitobjs();
    /* Prompt for a new quiver: "What do you want to {ready|fire}?" */
    newquiver = await getobj(verb, ready_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);

    if (!newquiver) {
        /* Cancelled */
        return ECMD_CANCEL;
    } else if (newquiver === hands_obj) { /* no object */
        /* Explicitly nothing */
        if (game.u.uquiver) {
            await You('now have no ammunition readied.');
            /* skip 'quivering: prinv()' */
            setuqwep(null);
        } else {
            await You('already have no ammunition readied!');
        }
        return ECMD_OK;
    } else if (newquiver.o_id === game.context?.objsplit?.child_oid) {
        /* if newquiver is the result of supplying a count to getobj()
           we don't want to split something already in the quiver;
           for any other item, we need to give it its own inventory slot */
        if (game.u.uquiver && game.u.uquiver.o_id === game.context.objsplit.parent_oid) {
            unsplitobj(newquiver);
            flow = 'already_quivered';
        } else if (newquiver.oclass === OCLASSES.COIN_CLASS) {
            /* don't allow splitting a stack of coins into quiver */
            await You("can't ready only part of your gold.");
            unsplitobj(newquiver);
            return ECMD_OK;
        } else {
            finish_splitting(newquiver);
        }
    } else if (newquiver === game.u.uquiver) {
        flow = 'already_quivered';
    }
    if (flow === 'already_quivered') {
 /* already_quivered: */
        await pline('That ammunition is already readied!');
        return ECMD_OK;
    } else if (flow === '' && newquiver.o_id !== game.context?.objsplit?.child_oid) {
        const uwep = game.u.uwep, uswapwep = game.u.uswapwep;

        if (newquiver.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
            await You(`cannot ${verb} that!`);
            return ECMD_OK;
        } else if (newquiver === uwep) {
            const weld_res = !uwep.bknown;

            if (welded(uwep)) {
                await weldmsg(uwep);
                reset_remarm(); /* same as dowield() */
                return weld_res ? ECMD_TIME : ECMD_OK;
            }
            /* offer to split stack if wielding more than 1 */
            if (uwep.quan > 1 && inv_cnt(false) < invlet_basic
                                        && splittable(uwep)) {
                qbuf = `You are wielding ${uwep.quan} ${simpleonames(uwep)}.  Ready ${
                        uwep.quan - 1} of them?`;
                switch (await ynq(qbuf)) {
                case 'q':
                    return ECMD_OK;
                case 'y':
                    /* leave 1 wielded, split rest off and put into quiver */
                    newquiver = splitobj(uwep, uwep.quan - 1);
                    finish_splitting(newquiver);
                    flow = 'quivering';
                    break;
                default:
                    break;
                }
                qbuf = 'Ready all of them instead?';
            } else {
                const use_plural = (is_plural(uwep) || pair_of(uwep));

                qbuf = `You are wielding ${!use_plural ? 'that' : 'those'}.  Ready ${
                        !use_plural ? 'it' : 'them'} instead?`;
            }
            if (flow !== 'quivering') {
                /* require confirmation to ready the main weapon */
                if (await ynq(qbuf) !== 'y') {
                    qbuf = Shk_Your(uwep); /* replace qbuf[] contents */
                    await pline(`${qbuf}${simpleonames(uwep)} ${otense(uwep, 'remain')} wielded.`);
                    return ECMD_OK;
                }
                /* quivering main weapon, so no longer wielding it */
                setuwep(null);
                untwoweapon();
                was_uwep = true;
            }
        } else if (newquiver === uswapwep) {
            if (uswapwep.quan > 1 && inv_cnt(false) < invlet_basic
                && splittable(uswapwep)) {
                qbuf = `${game.u.twoweap ? 'You are dual wielding'
                                         : 'Your alternate weapon is'} ${
                        uswapwep.quan} ${simpleonames(uswapwep)}.  Ready ${
                        uswapwep.quan - 1} of them?`;
                switch (await ynq(qbuf)) {
                case 'q':
                    return ECMD_OK;
                case 'y':
                    /* leave 1 alt-wielded, split rest off and put into quiver */
                    newquiver = splitobj(uswapwep, uswapwep.quan - 1);
                    finish_splitting(newquiver);
                    flow = 'quivering';
                    break;
                default:
                    break;
                }
                qbuf = 'Ready all of them instead?';
            } else {
                const use_plural = (is_plural(uswapwep) || pair_of(uswapwep));

                qbuf = `${!use_plural ? 'That is' : 'Those are'} your ${
                        game.u.twoweap ? 'second' : 'alternate'} weapon.  Ready ${
                        !use_plural ? 'it' : 'them'} instead?`;
            }
            if (flow !== 'quivering') {
                /* require confirmation to ready the alternate weapon */
                if (await ynq(qbuf) !== 'y') {
                    qbuf = Shk_Your(uswapwep); /* replace qbuf[] contents */
                    await pline(`${qbuf}${simpleonames(uswapwep)} ${
                                otense(uswapwep, 'remain')} ${
                                game.u.twoweap ? 'wielded' : 'as secondary weapon'}.`);
                    return ECMD_OK;
                }
                /* quivering alternate weapon, so no more uswapwep */
                setuswapwep(null);
                untwoweapon();
            }
        }
    }

 /* quivering: */
    if (verb === 'ready') {
        /* place item in quiver before printing so that inventory feedback
           includes "(at the ready)" */
        setuqwep(newquiver);
        await prinv(null, newquiver, 0);
    } else { /* verb=="fire", manually refilling quiver during 'f'ire */
        /* prefix item with description of action, so don't want that to
           include "(at the ready)" */
        await prinv('You ready:', newquiver, 0);
        setuqwep(newquiver);
    }

    /* quiver is a convenience slot and manipulating it ordinarily
       consumes no time, but unwielding primary or secondary weapon
       should take time (perhaps we're adjacent to a rust monster
       or disenchanter and want to hit it immediately, but not with
       something we're wielding that's vulnerable to its damage) */
    res = 0;
    if (was_uwep) {
        await You(`are now ${empty_handed()}.`);
        res = 1;
    } else if (was_twoweap && !game.u.twoweap) {
        await You(`${are_no_longer_twoweap}.`);
        res = 1;
    }
    return res ? ECMD_TIME : ECMD_OK;
}

// src/wield.c:505 dowieldquiver() — the 'Q' command.
export async function dowieldquiver() {
    return await doquiver_core('ready');
}

function note_unported_wield(what) {
    (game.unported ||= new Set()).add(what);
}

/* include/obj.h:245 is_missile() — dart/shuriken/boomerang class throwables. */
// include/obj.h:223 is_sword()
export const is_sword = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_skill >= SKILLS.P_SHORT_SWORD
    && game.objects[o.otyp].oc_skill <= SKILLS.P_SABER;

export const is_missile = (o) =>
    (o.oclass === OCLASSES.WEAPON_CLASS || o.oclass === OCLASSES.TOOL_CLASS)
    && game.objects[o.otyp].oc_skill >= -P_BOOMERANG
    && game.objects[o.otyp].oc_skill <= -P_DART;

/* include/obj.h:256 is_wet_towel() */
const is_wet_towel = (o) => o.otyp === ONAMES.TOWEL && o.spe > 0;

/* src/wield.c:75 TWOWEAPOK() — a weapon or weapon-tool, and not a bow,
   ammo or missile. */
const TWOWEAPOK = (obj) =>
    (obj.oclass === OCLASSES.WEAPON_CLASS)
    ? !(is_launcher(obj) || is_ammo(obj) || is_missile(obj))
    : is_weptool(obj, game.objects);

// src/wield.c:80
const are_no_longer_twoweap = 'are no longer using two weapons at once',
      can_no_longer_twoweap = 'can no longer wield two weapons at once';

// src/wield.c:100 setuwep() — make obj the wielded weapon.
//
function artifact_light_radius(obj) {
    return obj.blessed ? 3 : obj.cursed ? 1 : 2;
}

function artifact_light_description(obj) {
    return ['strangely', 'dimly', 'brightly', 'brilliantly'][
        artifact_light_radius(obj)] || 'strangely';
}

function begin_artifact_light(obj) {
    obj.lamplit = 1;
    new_light_source(game.u.ux, game.u.uy, artifact_light_radius(obj),
                     LS_OBJECT, obj.o_id);
    game.vision_full_recalc = 1;
    update_inventory();
}

function end_artifact_light(obj) {
    del_light_source(LS_OBJECT, obj.o_id);
    obj.lamplit = 0;
    game.vision_full_recalc = 1;
    update_inventory();
}

// The return value is the old artifact whose permanent light was stopped.
// Async callers use it to print C's message after the slot update.
export function setuwep(obj) {
    const olduwep = game.u.uwep;

    if (obj === game.u.uwep)
        return null; /* necessary to not set gu.unweapon */
    setworn(obj, W_WEP);
    if (game.u.uwep === obj
        && (is_art(game.u.uwep, ART_OGRESMASHER)
            || is_art(olduwep, ART_OGRESMASHER)))
        (game.disp ||= {}).botl = true;
    let stoppedLight = null;
    if (game.u.uwep === obj && artifact_light(olduwep) && olduwep.lamplit) {
        end_artifact_light(olduwep);
        stoppedLight = olduwep;
    }
    if (obj) {
        game.unweapon = (obj.oclass === OCLASSES.WEAPON_CLASS)
                       ? is_launcher(obj) || is_ammo(obj) || is_missile(obj)
                         || (is_pole(obj) && !game.u.usteed)
                       : !is_weptool(obj, game.objects) && !is_wet_towel(obj);
    } else
        game.unweapon = true; /* for "bare hands" message */
    return stoppedLight;
}

export async function setuwep_with_feedback(obj) {
    const stoppedLight = setuwep(obj);
    if (stoppedLight && !Blind())
        await pline(`${Tobjnam(stoppedLight, 'stop')} shining.`);
    return stoppedLight;
}

// src/wield.c:158 empty_handed() — description of hands when not wielding.
export function empty_handed() {
    return game.u.uarmg ? "empty handed" /* gloves imply hands */
           : humanoid(game.youmonst.data) ? "bare handed"
             : "not wielding anything";
}

// src/wield.c:138 cant_wield_corpse() — cockatrice corpse, bare hands.
async function cant_wield_corpse(obj) {
    if (game.u.uarmg || obj.otyp !== ONAMES.CORPSE
        || !touch_petrifies(game.mons[obj.corpsenm]) || Stone_resistance())
        return false;

    await You(`wield ${corpse_xname(obj, null, CXN_PFX_THE)} in your bare `
        + `${makeplural(body_part(HAND))}.`);
    const kbuf = `wielding ${killer_xname(obj)} bare-handed`;
    await instapetrify(kbuf);
    return true;
}

/*
 * src/wield.c:169 ready_weapon() — separated function so swapping works
 * easily. async because prinv() is.
 *
 * Recorded arms: the weld message (needs aobjnam/The/set_bknown),
 * retouch_object (only matters for artifacts and silver-hating heroes;
 * an ordinary object always touches fine and draws nothing), arti_speak,
 * artifact light, and the shopkeeper unpaid warning.
 */
export async function ready_weapon(wep) {
    let res = ECMD_OK;
    const was_twoweap = !!game.u.twoweap, had_wep = (game.u.uwep != null);

    if (!wep) {
        /* No weapon */
        if (game.u.uwep) {
            await You(`are ${empty_handed()}.`);
            await setuwep_with_feedback(null);
            res = ECMD_TIME;
        } else
            await You(`are already ${empty_handed()}.`);
    } else if (wep.otyp === ONAMES.CORPSE && await cant_wield_corpse(wep)) {
        /* hero must have been life-saved to get here; use a turn */
        res = ECMD_TIME; /* corpse won't be wielded */
    } else if (game.u.uarms && bimanual(wep)) {
        await You(`cannot wield a two-handed ${is_sword(wep) ? "sword"
                  : wep.otyp === ONAMES.BATTLE_AXE ? "axe" : "weapon"} while wearing a shield.`);
        res = ECMD_FAIL;
    } else if (!await retouch_object(wep, false)) {
        /* src/wield.c:191 — an artifact that resists handling still costs
           the turn */
        res = ECMD_TIME;
    } else {
        /* Weapon WILL be wielded after this point */
        res = ECMD_TIME;
        if (will_weld(wep)) {
            /* src/wield.c:196-209 — the weld announcement. C prefixes "The "
               when xname carries no article but The() would add one. */
            let tmp = xname(wep);
            tmp = (!tmp.startsWith('The ') && The(tmp).startsWith('The '))
                  ? 'The ' : '';
            /* URIGHTY: u.uhandedness == RIGHT_HANDED (0); the lefthanded
               option is not parsed by this port, so the field stays 0. */
            const urighty = (game.u.uhandedness || 0) === 0;
            await pline(`${tmp}${aobjnam(wep, 'weld')} `
                + `${(wep.quan === 1) ? 'itself' : 'themselves'} to your `
                + `${bimanual(wep) ? '' : (urighty ? 'dominant right '
                                                   : 'dominant left ')}`
                + `${bimanual(wep) ? makeplural(body_part(HAND))
                                   : body_part(HAND)}!`);
            set_bknown(wep, 1);
        } else {
            /* The message must be printed before setuwep [...] yet we want
               the message to say "weapon in hand", thus this kludge. */
            const dummy = wep.owornmask;

            wep.owornmask |= W_WEP;
            if (wep.otyp === ONAMES.AKLYS && (wep.owornmask & W_WEP) !== 0)
                await You("secure the tether.");
            await prinv(null, wep, 0);
            wep.owornmask = dummy;
        }

        await setuwep_with_feedback(wep);
        if (was_twoweap && !game.u.twoweap && game.flags.verbose) {
            /* skip this message if we already got "empty handed" one above;
               also, Null is not safe for neither TWOWEAPOK() or bimanual() */
            if (game.u.uwep)
                await You(`${(TWOWEAPOK(game.u.uwep) && !bimanual(game.u.uwep))
                            ? are_no_longer_twoweap
                            : can_no_longer_twoweap}.`);
        }
        if (wep.oartifact)
            res |= await arti_speak(wep);
        if (artifact_light(wep) && !wep.lamplit) {
            begin_artifact_light(wep);
            if (!Blind())
                await pline(`${Tobjnam(wep, 'begin')} to shine ${
                    artifact_light_description(wep)}!`);
        }
        if (wep.unpaid)
            note_unported_wield('ready_weapon:shk_warning');
    }
    /* src/wield.c:270 — condtests[bl_bareh] is an opt-in status condition,
       disabled by default; nothing in this port enables it. */
    if (had_wep !== (game.u.uwep != null) && game.condtests?.bl_bareh?.enabled)
        (game.disp ||= {}).botl = true;
    return res;
}

// src/wield.c:276 setuqwep() — put an object in the quiver slot.
export function setuqwep(obj) {
    setworn(obj, W_QUIVER);
    /* no extra handling needed; this used to include a call to
       update_inventory() but that's already performed by setworn() */
}

// src/wield.c:285 setuswapwep() — put an object in the secondary slot.
export function setuswapwep(obj) {
    setworn(obj, W_SWAPWEP);
}

// src/wield.c:346 finish_splitting() — obj was split off from something;
// give it its own invlet.
function finish_splitting(obj) {
    freeinv(obj);
    addinv_nomerge(obj);
}

// src/wield.c:331 wield_ok() — getobj callback for the #wield command.
export function wield_ok(obj) {
    if (!obj)
        return GETOBJ_SUGGEST;

    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;

    if (obj.oclass === OCLASSES.WEAPON_CLASS || is_weptool(obj, game.objects))
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

/*
 * src/wield.c:355 dowield() — the #wield command.
 *
 * Recorded arms: the split-stack bookkeeping (clear_splitobjs, objsplit,
 * finish_splitting -- getobj here never yields a split because the count
 * path is unported), the quivered-stack confirmation prompts, and weldmsg.
 */
export async function dowield() {
    let wep, result;

    /* May we attempt this? gy.youmonst does not exist on this tree; every
       un-polymorphed playable form can wield, so the guard cannot fire. */
    game.multi = 0;
    const ymd = game.youmonst?.data;
    if (ymd && cantwield(ymd)) {
        await pline("Don't be ridiculous!");
        return ECMD_FAIL;
    }

    /* Prompt for a new weapon */
    clear_splitobjs();
    if (!(wep = await getobj("wield", wield_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT))) {
        /* Cancelled */
        return ECMD_CANCEL;
    } else if (wep === game.u.uwep) {
        await You("are already wielding that!");
        if (is_weptool(wep, game.objects) || is_wet_towel(wep))
            game.unweapon = false; /* [see setuwep()] */
        return ECMD_FAIL;
    } else if (welded(game.u.uwep)) {
        await weldmsg(game.u.uwep);
        /* previously interrupted armor removal mustn't be resumed */
        reset_remarm();
        /* if player chose a partial stack but can't wield it, undo split;
           getobj's count path never splits on this tree (recorded there),
           so the child test cannot match a fresh split */
        if (wep.o_id && wep.o_id === game.context.objsplit?.child_oid)
            note_unported_wield('dowield:unsplitobj');
        return ECMD_FAIL;
    }

    /* Handle no object, or object in other slot */
    let to_wielding = false;
    if (wep === hands_obj) {
        wep = null;
    } else if (wep === game.u.uswapwep) {
        return await doswapweapon();
    } else if (wep === game.u.uquiver) {
        let qbuf;
        /* offer to split stack if multiple are quivered */
        if (game.u.uquiver.quan > 1 && inv_cnt(false) < invlet_basic
            && splittable(game.u.uquiver)) {
            qbuf = `You have ${game.u.uquiver.quan} `
                 + `${simpleonames(game.u.uquiver)} readied.  Wield one?`;
            switch (await ynq(qbuf)) {
            case 'q':
                return ECMD_OK;
            case 'y':
                /* leave N-1 quivered, split off 1 to wield */
                wep = splitobj(game.u.uquiver, 1);
                finish_splitting(wep);
                to_wielding = true;
                break;
            default:
                break;
            }
            if (!to_wielding)
                qbuf = 'Wield all of them instead?';
        } else {
            const use_plural = is_plural(game.u.uquiver)
                               || pair_of(game.u.uquiver);
            qbuf = `You have ${!use_plural ? 'that' : 'those'} readied.  `
                 + `Wield ${!use_plural ? 'it' : 'them'} instead?`;
        }
        if (!to_wielding) {
            /* require confirmation to wield the quivered weapon */
            if (await ynq(qbuf) !== 'y') {
                /* C replaces qbuf via Shk_Your(); the shopkeeper-owned
                   variant needs shk_your(), which is not ported */
                if (game.u.uquiver.unpaid)
                    note_unported_wield('dowield:Shk_Your');
                await pline(`Your ${simpleonames(game.u.uquiver)} `
                            + `${otense(game.u.uquiver, 'remain')} readied.`);
                return ECMD_OK;
            }
            /* wielding whole readied stack, so no longer quivered */
            setuqwep(null);
        }
    } else if (wep.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await You("cannot wield that!");
        return ECMD_FAIL;
    }

    /* wielding: set your new primary weapon */
    const oldwep = game.u.uwep;
    result = await ready_weapon(wep);
    if (game.flags.pushweapon && oldwep && game.u.uwep !== oldwep)
        setuswapwep(oldwep);
    untwoweapon();

    return result;
}

// src/wield.c:461 doswapweapon() — the #swap command.
export async function doswapweapon() {
    let result = 0;

    /* May we attempt this? (see dowield on the youmonst guard) */
    game.multi = 0;
    const ymd = game.youmonst?.data;
    if (ymd && cantwield(ymd)) {
        await pline("Don't be ridiculous!");
        return ECMD_FAIL;
    }
    if (welded(game.u.uwep)) {
        await weldmsg(game.u.uwep);
        return ECMD_FAIL;
    }

    /* Unwield your current secondary weapon */
    const oldwep = game.u.uwep;
    const oldswap = game.u.uswapwep;
    setuswapwep(null);

    /* Set your new primary weapon */
    result = await ready_weapon(oldswap);

    /* Set your new secondary weapon */
    if (game.u.uwep === oldwep) {
        /* Wield failed for some reason */
        setuswapwep(oldswap);
    } else {
        setuswapwep(oldwep);
        if (game.u.uswapwep)
            await prinv(null, game.u.uswapwep, 0);
        else
            await You("have no secondary weapon readied.");
    }

    if (game.u.twoweap && !(await can_twoweapon()))
        untwoweapon();

    return result;
}

// src/wield.c welded() — is this the wielded weapon, and is it stuck?
//
// Only true for the object that IS uwep; a cursed weapon in the pack is not
// welded. The set_bknown(obj, 1) is a real side effect: discovering the weld
// tells you the weapon is cursed, so the B/U/C status becomes known. It is
// recorded, so the weld is detected but the knowledge is not yet recorded on
// the object.
// src/wield.c:918 chwepon() — enchant (amount > 0) or degrade (amount < 0) the
// wielded weapon. Returns 0 when nothing was enchanted, which tells the caller
// its scroll has already been used up by strange_feeling().
//
// The only draws are the rn2(3) "violently glow then evaporate" test at the
// soft +/-5 limit and the rn2(7) elven-vibration clue; the empty-handed arm's
// exercise(A_DEX, amount >= 0) is an INCREMENT for a non-negative amount and so
// costs an rn2(19) inside exercise() itself.
export async function chwepon(otmp, amount) {
    const color = hcolor((amount < 0) ? NH_BLACK : NH_BLUE);
    let xtime, wepname = '';
    let multiple;
    let otyp = ONAMES.STRANGE_OBJECT;
    const uwep = game.u.uwep;

    if (!uwep || (uwep.oclass !== OCLASSES.WEAPON_CLASS
                  && !is_weptool(uwep, game.objects))) {
        let buf;

        if (amount >= 0 && uwep && will_weld(uwep)) { /* cursed tin opener */
            if (!game.u.ublind) {
                buf = `${Yobjnam2(uwep, 'glow')} with `
                      + an(hcolor(NH_AMBER)) + ' aura.';
                /* ok to bypass set_bknown() */
                uwep.bknown = (game.u?.intrinsic?.HHallucination
                               || game.u?.uprops?.HALLUC) ? 0 : 1;
            } else {
                /* cursed tin opener is wielded in right hand */
                buf = `Your right ${body_part(HAND)} tingles.`;
            }
            await uncurse(uwep);
            update_inventory();
        } else {
            buf = `Your ${makeplural(body_part(HAND))} `
                  + `${(amount >= 0) ? 'twitch' : 'itch'}.`;
        }
        await strange_feeling(otmp, buf); /* pline()+docall()+useup() */
        exercise(A_DEX, amount >= 0);
        return 0;
    }

    if (otmp && otmp.oclass === OCLASSES.SCROLL_CLASS)
        otyp = otmp.otyp;

    if (uwep.otyp === ONAMES.WORM_TOOTH && amount >= 0) {
        multiple = (uwep.quan > 1);
        /* order: message, transformation, shop handling */
        await Your(`${simpleonames(uwep)} `
                   + `${multiple ? 'fuse, and become' : 'is'} much sharper now.`);
        uwep.otyp = ONAMES.CRYSKNIFE;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (uwep.cursed)
            await uncurse(uwep);
        /* update shop bill to reflect new higher value */
        if (uwep.unpaid)
            note_unported_wield('chwepon:alter_cost');
        if (otyp !== ONAMES.STRANGE_OBJECT)
            makeknown(otyp);
        if (multiple)
            await encumber_msg();
        return 1;
    } else if (uwep.otyp === ONAMES.CRYSKNIFE && amount < 0) {
        multiple = (uwep.quan > 1);
        /* order matters: message, shop handling, transformation */
        await Your(`${simpleonames(uwep)} `
                   + `${multiple ? 'fuse, and become' : 'is'} much duller now.`);
        note_unported_wield('chwepon:costly_alteration');
        uwep.otyp = ONAMES.WORM_TOOTH;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (otyp !== ONAMES.STRANGE_OBJECT && otmp.bknown)
            makeknown(otyp);
        if (multiple)
            await encumber_msg();
        return 1;
    }

    if (uwep.oname != null)
        wepname = uwep.oname;
    if (amount < 0 && uwep.oartifact) {
        /* restrict_name() needs the artifact tables, which are not ported */
        note_unported_wield('chwepon:restrict_name');
    }
    /* there is a (soft) upper and lower limit to uwep->spe */
    if (((uwep.spe > 5 && amount >= 0) || (uwep.spe < -5 && amount < 0))
        && rn2(3)) {
        if (!game.u.ublind)
            await pline(`${Yobjnam2(uwep, 'violently glow')} ${color} `
                        + `for a while and then ${otense(uwep, 'evaporate')}.`);
        else
            await pline(`${Yobjnam2(uwep, 'evaporate')}.`);

        useupall(uwep);         /* let all of them disappear */
        return 1;
    }
    if (!game.u.ublind) {
        xtime = (amount * amount === 1) ? 'moment' : 'while';
        await pline(`${Yobjnam2(uwep, amount === 0 ? 'violently glow' : 'glow')}`
                    + ` ${color} for a ${xtime}.`);
        if (otyp !== ONAMES.STRANGE_OBJECT && uwep.known
            && (amount > 0 || (amount < 0 && otmp.bknown)))
            makeknown(otyp);
    }
    if (amount < 0)
        note_unported_wield('chwepon:costly_alteration');
    uwep.spe += amount;
    if (amount > 0) {
        if (uwep.cursed)
            await uncurse(uwep);
        /* update shop bill to reflect new higher price */
        if (uwep.unpaid)
            note_unported_wield('chwepon:alter_cost');
    }

    /*
     * Enchantment, which normally improves a weapon, has an additional
     * adverse reaction on Magicbane whose effects are spe dependent.
     * Give an obscure clue here.
     */
    if (uwep.oartifact && uwep.spe >= 0)
        note_unported_wield('chwepon:magicbane');

    /* an elven magic clue, cookie@keebler */
    /* elven weapons vibrate warningly when enchanted beyond a limit */
    if ((uwep.spe > 5)
        && (is_elven_weapon(uwep) || uwep.oartifact || !rn2(7)))
        await pline(`${Yobjnam2(uwep, 'suddenly vibrate')} unexpectedly.`);

    return 1;
}

// src/wield.c:800 drop_uswapwep() — the secondary weapon slips away.
export async function drop_uswapwep() {
    const obj = game.u.uswapwep;

    /* in order to be dual-wielded the weapon must be one-handed; since
       it's secondary, the hand must be the left one */
    const left_hand = `left ${body_part(HAND)}`;
    if (!obj.cursed)
        /* attempting to two-weapon while Glib */
        await pline(`${Yobjnam2(obj, 'slip')} from your ${left_hand}!`);
    else if (!game.u.twoweap)
        /* attempting to two-weapon when uswapwep is cursed */
        await pline(`${Yobjnam2(obj, 'evade')} your grasp and `
                    + `${otense(obj, 'drop')} from your ${left_hand}!`);
    else
        /* already two-weaponing but can't anymore because uswapwep has
           become cursed */
        await Your(`${left_hand} spasms and drops ${yname(obj)}!`);
    await dropx(obj);
}

// src/wield.c:751 can_twoweapon() — every reason two-weaponing can fail,
// with its message; TRUE when none applies.
export async function can_twoweapon() {
    let otmp;
    const ymd = game.youmonst?.data
                || game.mons[game.u.umonnum ?? game.urole.mnum];

    if (!could_twoweap(ymd)) {
        if (Upolyd(game.u))
            await You_cant('use two weapons in your current form.');
        else
            await pline(`${makeplural((game.flags.female && game.urole?.name?.f)
                                      ? game.urole.name.f
                                      : game.urole?.name?.m || 'human')}`
                        + " aren't able to use two weapons at once.");
    } else if (!game.u.uwep || !game.u.uswapwep) {
        let hand_s = body_part(HAND);

        if (!game.u.uwep && !game.u.uswapwep)
            hand_s = makeplural(hand_s);
        /* "your hands are empty" or "your {left|right} hand is empty" */
        await Your(`${game.u.uwep ? 'left ' : game.u.uswapwep ? 'right ' : ''}`
                   + `${hand_s} ${vtense(hand_s, 'are')} empty.`);
    } else if (!TWOWEAPOK(game.u.uwep) || !TWOWEAPOK(game.u.uswapwep)) {
        otmp = !TWOWEAPOK(game.u.uwep) ? game.u.uwep : game.u.uswapwep;
        await pline(`${Yname2(otmp)} ${is_plural(otmp) ? "aren't" : "isn't a"}`
                    + ` suitable ${(otmp === game.u.uwep) ? 'primary'
                                                          : 'secondary'}`
                    + ` weapon${plur(otmp.quan)}.`);
    } else if (bimanual(game.u.uwep) || bimanual(game.u.uswapwep)) {
        otmp = bimanual(game.u.uwep) ? game.u.uwep : game.u.uswapwep;
        await pline(`${Yname2(otmp)} isn't one-handed.`);
    } else if (game.u.uarms) {
        await You_cant('use two weapons while wearing a shield.');
    } else if (game.u.uswapwep.oartifact) {
        await pline(`${Yobjnam2(game.u.uswapwep, 'resist')} being held`
                    + ' second to another weapon!');
    } else if (game.u.uswapwep.otyp === ONAMES.CORPSE
               && await cant_wield_corpse(game.u.uswapwep)) {
        /* [Note: !TWOWEAPOK() check prevents ever getting here...] */
        ; /* must be life-saved to reach here; return FALSE */
    } else if (Glib() || game.u.uswapwep.cursed) {
        if (!Glib())
            set_bknown(game.u.uswapwep, 1);
        await drop_uswapwep();
    } else
        return true;
    return false;
}

// src/wield.c:683 wield_tool(): wield an object before applying it.
// Used by #rub and by several tool applications in C.
export async function wield_tool(obj, verb = 'wield') {
    if (game.u.uwep && obj === game.u.uwep)
        return true;

    const what = xname(obj);
    let more_than_1 = obj.quan > 1
                      || what.toLowerCase().includes('pair of ')
                      || what.toLowerCase().includes('s of ');

    if (obj.owornmask & (W_ARMOR | W_ACCESSORY)) {
        await You_cant(`${verb} ${yname(obj)} while wearing `
                       + `${more_than_1 ? 'them' : 'it'}.`);
        return false;
    }
    if (game.u.uwep && welded(game.u.uwep)) {
        if (game.flags.verbose) {
            let hand = body_part(HAND);
            if (bimanual(game.u.uwep))
                hand = makeplural(hand);
            if (what.toLowerCase().includes('pair of '))
                more_than_1 = false;
            await pline(`Since your weapon is welded to your ${hand}, `
                        + `you cannot ${verb} ${more_than_1 ? 'those' : 'that'} `
                        + `${xname(obj)}.`);
        } else {
            await You_cant('do that.');
        }
        return false;
    }
    if (game.youmonst?.data && cantwield(game.youmonst.data)) {
        await You_cant(`hold ${more_than_1 ? 'them' : 'it'} strongly enough.`);
        return false;
    }
    if (game.u.uarms && bimanual(obj)) {
        await You(`cannot ${verb} a two-handed `
                  + `${obj.oclass === OCLASSES.WEAPON_CLASS ? 'weapon' : 'tool'} `
                  + 'while wearing a shield.');
        return false;
    }

    if (game.u.uquiver === obj)
        setuqwep(null);
    if (game.u.uswapwep === obj) {
        await doswapweapon();
        if (game.u.uswapwep === obj)
            return false;
    } else {
        const oldwep = game.u.uwep;
        if (will_weld(obj)) {
            await ready_weapon(obj);
        } else {
            await You(`now wield ${doname(obj)}.`);
            await setuwep_with_feedback(obj);
        }
        if (game.flags.pushweapon && oldwep && game.u.uwep !== oldwep)
            setuswapwep(oldwep);
    }
    if (game.u.uwep && game.u.uwep !== obj)
        return false;
    if (game.u.twoweap)
        untwoweapon();
    if (obj.oclass !== OCLASSES.WEAPON_CLASS)
        game.unweapon = true;
    return true;
}

// src/wield.c:834 set_twoweap() — flip u.twoweap, flag the status line if
// the weaponstatus option shows it (off by default; not parsed by this port).
export function set_twoweap(on_off) {
    if (on_off !== !!game.u.twoweap) {
        game.u.twoweap = on_off;
        if (game.flags.weaponstatus)
            (game.disp ||= {}).botl = true;
    }
}

// src/wield.c:844 dotwoweapon() — the #twoweapon command ('X').
export async function dotwoweapon() {
    /* You can always toggle it off */
    if (game.u.twoweap) {
        await You('switch to your primary weapon.');
        set_twoweap(false); /* u.twoweap = FALSE */
        update_inventory();
        return ECMD_OK;
    }

    /* May we use two weapons? */
    if (await can_twoweapon()) {
        /* Success! */
        await You('begin two-weapon combat.');
        set_twoweap(true); /* u.twoweap = TRUE */
        update_inventory();
        return (rnd(20) > ACURR(A_DEX)) ? ECMD_TIME : ECMD_OK;
    }
    return ECMD_OK;
}

// src/wield.c:906 untwoweapon()
export function untwoweapon() {
    if (game.u.twoweap) {
        You(`${can_no_longer_twoweap}.`);
        set_twoweap(false); /* u.twoweap = FALSE */
        update_inventory();
    }
}

export function welded(obj) {
    if (obj && obj === game.u.uwep && will_weld(obj)) {
        set_bknown(obj, 1);
        return 1;
    }
    return 0;
}

// src/wield.c:1061 weldmsg() — announce a cursed wielded weapon.
export async function weldmsg(obj) {
    let hand = body_part(HAND);

    if (bimanual(obj))
        hand = makeplural(hand);
    const savewornmask = obj.owornmask;
    obj.owornmask = 0; /* suppress doname()'s "(weapon in hand)" */
    await pline(`${Yobjnam2(obj, 'are')} welded to your ${hand}!`);
    obj.owornmask = savewornmask;
}

// src/wield.c:872 uwepgone() — the wielded weapon is gone (broken, eaten).
export async function uwepgone() {
    if (game.u.uwep) {
        if (artifact_light(game.u.uwep) && game.u.uwep.lamplit) {
            end_artifact_light(game.u.uwep);
            if (!Blind())
                await pline(`${Tobjnam(game.u.uwep, 'stop')} shining.`);
        }
        setworn(null, W_WEP);
        game.unweapon = true;
        update_inventory();
    }
}

// src/wield.c:888 uswapwepgone() — the secondary weapon is gone.
export function uswapwepgone() {
    if (game.u.uswapwep) {
        setworn(null, W_SWAPWEP);
        update_inventory();
    }
}

// src/wield.c:897 uqwepgone() — the quivered ammunition is gone.
export function uqwepgone() {
    if (game.u.uquiver) {
        setworn(null, W_QUIVER);
        update_inventory();
    }
}

// src/wield.c:1078 mwelded(); a monster's wielded weapon is welded to it
export function mwelded(obj) {
    /* caller is responsible for making sure this is a monster's item */
    if (obj && (obj.owornmask & W_WEP) && will_weld(obj))
        return true;
    return false;
}
