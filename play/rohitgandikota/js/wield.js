// wield.js — what the hero is holding.
// C ref: src/wield.c
//
// Only the quiver command so far. doquiver_core's real work is getobj's
// prompt, which is why 'Q' shows "What do you want to ready? [- cd or ?*]"
// before anything is chosen.

import { game } from './gstate.js';
import { pline } from './display.js';
import { cantwield } from './mondata.js';
import { touch_petrifies } from './dog.js';
import { bimanual } from './obj.js';
import { is_weptool } from './mkobj.js';
import { is_pole } from './u_init.js';
import { will_weld } from './monmove.js';
import { hcolor } from './do_name.js';
import { NH_BLACK, NH_BLUE, NH_AMBER, HAND, A_DEX } from './const.js';
import { Yobjnam2, otense, simpleonames, makeplural, an } from './objnam.js';
import { body_part } from './polyself.js';
import { uncurse } from './mkobj.js';
import { update_inventory, useupall, weight } from './invent.js';
import { strange_feeling } from './potion.js';
import { exercise, encumber_msg } from './attrib.js';
import { makeknown } from './o_init.js';
import { is_elven_weapon } from './obj.js';
import { rn2 } from './rng.js';
import { Your } from './pline.js';
import { getobj, prinv } from './invent.js';
import { W_QUIVER, W_WEP, W_SWAPWEP, W_ARMOR, W_ACCESSORY, W_SADDLE, P_BOOMERANG, P_DART, ECMD_OK, ECMD_TIME, ECMD_FAIL, ECMD_CANCEL, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_PROMPT, GETOBJ_ALLOWCNT } from './const.js';
import { You } from './pline.js';
import { tty_yn_function } from './tty/topl.js';

// include/hack.h:1330 ynq()
const ynq = (query) => tty_yn_function(query, 'ynq', 'q');
import { P_BOW, P_CROSSBOW } from './const.js';
import { OCLASSES, ONAMES, SKILLS } from './objects_data.js';

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
const matching_launcher = (a, l) =>
    !!l && game.objects[a.otyp].oc_skill === -game.objects[l.otyp].oc_skill;
export const ammo_and_launcher = (a, l) => is_ammo(a) && matching_launcher(a, l);

// src/wield.c:512 doquiver_core() — "ready" or "fire".
export async function doquiver_core(verb) {
    if (!(game.invent || []).length) {
        await You('have nothing to ready for firing.');
        return ECMD_OK;
    }

    const newquiver = await getobj(verb, ready_ok,
                                   GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (!newquiver)
        return ECMD_CANCEL;

    /* src/wield.c:633 — readying the ALTERNATE weapon needs confirmation.
       The wording tracks two/one-handed use and singular/plural. */
    if (newquiver === game.u.uswapwep) {
        const use_plural = false;       /* is_plural/pair_of need objnam */
        const qbuf = `${!use_plural ? 'That is' : 'Those are'} your `
                   + `${game.u.twoweap ? 'second' : 'alternate'} weapon.  `
                   + `Ready ${!use_plural ? 'it' : 'them'} instead?`;

        if (await ynq(qbuf) !== 'y') {
            note_unported_wield('doquiver_core:decline message');
            return ECMD_OK;
        }
        /* src/wield.c:648 — quivering the alternate weapon, so no more
           uswapwep. This must go through setuswapwep(), which clears
           W_SWAPWEP from the object's owornmask; nulling the pointer alone
           left the mask set, so doname kept appending
           "(alternate weapon; not wielded)" alongside "(at the ready)". */
        setuswapwep(null);
        note_unported_wield('doquiver_core:untwoweapon');
    }

    /* src/wield.c:652 — place the item in the quiver BEFORE printing, so the
       inventory line already reads "(at the ready)". */
    setuqwep(newquiver);
    await prinv(null, newquiver, 0);
    return ECMD_OK;
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

// src/wield.c:100 setuwep() — make obj the wielded weapon.
//
// The Ogresmasher botl updates and the Sunsword artifact-light shutdown are
// recorded; both need artifact state this tree does not track. The unweapon
// computation is the load-bearing part: it decides the "bashing" message for
// every later attack with a non-weapon.
export function setuwep(obj) {
    const olduwep = game.u.uwep;

    if (obj === game.u.uwep)
        return; /* necessary to not set gu.unweapon */
    if (game.u.uwep)
        game.u.uwep.owornmask &= ~W_WEP;
    game.u.uwep = obj;
    if (obj)
        obj.owornmask |= W_WEP;
    if ((obj && obj.oartifact) || (olduwep && olduwep.oartifact))
        note_unported_wield('setuwep:artifact arms');
    if (obj) {
        game.unweapon = (obj.oclass === OCLASSES.WEAPON_CLASS)
                       ? is_launcher(obj) || is_ammo(obj) || is_missile(obj)
                         || (is_pole(obj) && !game.u.usteed)
                       : !is_weptool(obj, game.objects) && !is_wet_towel(obj);
    } else
        game.unweapon = true; /* for "bare hands" message */
}

// src/wield.c:158 empty_handed() — description of hands when not wielding.
export function empty_handed() {
    return game.u.uarmg ? "empty handed" /* gloves imply hands */
           : "bare handed"; /* humanoid(youmonst.data) is true for every
                               un-polymorphed playable form, and polyself is
                               not ported, so the paws arm is unreachable */
}

// src/wield.c:138 cant_wield_corpse() — cockatrice corpse, bare hands.
function cant_wield_corpse(obj) {
    if (game.u.uarmg || obj.otyp !== ONAMES.CORPSE
        || !touch_petrifies(game.mons[obj.corpsenm]))
        return false;
    /* Stone_resistance and instapetrify are not ported; the message and the
       petrification are recorded together. */
    note_unported_wield('cant_wield_corpse:instapetrify');
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
            setuwep(null);
            res = ECMD_TIME;
        } else
            await You(`are already ${empty_handed()}.`);
    } else if (wep.otyp === ONAMES.CORPSE && cant_wield_corpse(wep)) {
        /* hero must have been life-saved to get here; use a turn */
        res = ECMD_TIME; /* corpse won't be wielded */
    } else if (game.u.uarms && bimanual(wep)) {
        await You(`cannot wield a two-handed ${is_sword(wep) ? "sword"
                  : wep.otyp === ONAMES.BATTLE_AXE ? "axe" : "weapon"} while wearing a shield.`);
        res = ECMD_FAIL;
    } else {
        /* Weapon WILL be wielded after this point */
        res = ECMD_TIME;
        if (will_weld(wep)) {
            note_unported_wield('ready_weapon:weldmsg');
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

        setuwep(wep);
        if (was_twoweap && !game.u.twoweap && game.flags.verbose)
            note_unported_wield('ready_weapon:no_longer_twoweap');
        if (wep.oartifact)
            note_unported_wield('ready_weapon:arti_speak');
        if (wep.unpaid)
            note_unported_wield('ready_weapon:shk_warning');
    }
    if (had_wep !== (game.u.uwep != null))
        game.botl = true;
    return res;
}

// src/wield.c setuqwep() — put an object in the quiver slot.
export function setuqwep(obj) {
    if (game.u.uquiver)
        game.u.uquiver.owornmask &= ~W_QUIVER;
    game.u.uquiver = obj;
    if (obj)
        obj.owornmask |= W_QUIVER;
}

// src/wield.c:285 setuswapwep() — put an object in the secondary slot.
export function setuswapwep(obj) {
    if (game.u.uswapwep)
        game.u.uswapwep.owornmask &= ~W_SWAPWEP;
    game.u.uswapwep = obj;
    if (obj)
        obj.owornmask |= W_SWAPWEP;
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
    if (!(wep = await getobj("wield", wield_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT))) {
        /* Cancelled */
        return ECMD_CANCEL;
    } else if (wep === game.u.uwep) {
        await You("are already wielding that!");
        if (is_weptool(wep, game.objects) || is_wet_towel(wep))
            game.unweapon = false; /* [see setuwep()] */
        return ECMD_FAIL;
    } else if (welded(game.u.uwep)) {
        note_unported_wield('dowield:weldmsg');
        return ECMD_FAIL;
    }

    /* Handle no object, or object in other slot */
    if (wep === game.u.uswapwep) {
        return await doswapweapon();
    } else if (wep === game.u.uquiver) {
        /* the split-or-wield-all confirmation prompts read keys this port
           cannot yet answer faithfully; recorded, quiver left as-is */
        note_unported_wield('dowield:quivered_weapon_prompt');
        return ECMD_OK;
    } else if (wep.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await You("cannot wield that!");
        return ECMD_FAIL;
    }

    /* wielding: set your new primary weapon */
    const oldwep = game.u.uwep;
    result = await ready_weapon(wep);
    if (game.flags.pushweapon && oldwep && game.u.uwep !== oldwep)
        setuswapwep(oldwep);
    if (game.u.twoweap)
        note_unported_wield('dowield:untwoweapon');

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
        note_unported_wield('doswapweapon:weldmsg');
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

    if (game.u.twoweap)
        note_unported_wield('doswapweapon:untwoweapon');

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
            uncurse(uwep);
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
            uncurse(uwep);
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
            uncurse(uwep);
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

export function welded(obj) {
    if (obj && obj === game.uwep && will_weld(obj)) {
        note_unported_wield('welded:set_bknown');
        return 1;
    }
    return 0;
}
