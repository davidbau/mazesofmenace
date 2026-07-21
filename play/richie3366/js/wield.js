// wield.js — Wield / weapon slot (partial).
// C ref: wield.c — setuwep, ready_weapon, dowield, doquiver_core, welded,
//         can_twoweapon, dotwoweapon, set_twoweap, untwoweapon, chwepon.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { xprname, xname, makeplural, vtense, an, doname } from './objnam.js';
import { yn_function } from './getline.js';
import { hands_obj } from './weapon.js';
import { humanoid, mons } from './monsters.js';
import { AT_WEAP } from './mhitm.js';
import { acurr, A_DEX, exercise } from './attrib.js';
import { rn2, rnd } from './rng.js';
import {
    WEAPON_CLASS, TOOL_CLASS, COIN_CLASS, GEM_CLASS, SCROLL_CLASS,
    objectNames,
} from './objects.js';
import {
    W_WEP, W_SWAPWEP, W_QUIVER, W_ARMOR, W_ACCESSORY, W_SADDLE,
    P_NONE, P_BOW, P_CROSSBOW, P_DART, P_BOOMERANG, P_POLEARMS, P_LANCE,
    ECMD_OK, ECMD_TIME, Upolyd, HAND,
} from './const.js';
import { retouch_object, set_artifact_intrinsic } from './artifact.js';
import { makeknown, encumber_msg, compactify_invlets } from './invent.js';
import { uncurse, weight } from './mkobj.js';
import { trycall } from './do_name.js';

/** C: are_no_longer_twoweap / can_no_longer_twoweap */
const are_no_longer_twoweap = 'are no longer using two weapons at once';
const can_no_longer_twoweap = 'can no longer wield two weapons at once';

/**
 * C ref: wield.c empty_handed — gloves → "empty handed"; else humanoid
 * bare hands / non-humanoid "not wielding anything".
 * Missing youmonst.data (set_uasmon deferred) → humanoid start form.
 */
export function empty_handed() {
    if (game.u?.uarmg) return 'empty handed';
    const ptr = game.youmonst?.data;
    if (!ptr || humanoid(ptr)) return 'bare handed';
    return 'not wielding anything';
}

/** C invent getobj callback ranks (subset). */
const GETOBJ_SUGGEST = 1;
const GETOBJ_DOWNPLAY = 2;
const GETOBJ_EXCLUDE = 3;
/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE (named fallback). */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    if (sk != null && sk !== P_NONE) return true;
    const n = objectNames[obj.otyp];
    return n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN'
        || n === 'AKLYS' || n === 'BULLWHIP';
}

/** C ref: obj.h is_launcher */
export function is_launcher(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= P_BOW && sk <= P_CROSSBOW;
}

/** C ref: obj.h is_ammo */
export function is_ammo(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== GEM_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

/** C ref: obj.h matching_launcher / ammo_and_launcher */
export function ammo_and_launcher(ammo, launcher) {
    if (!ammo || !launcher || !is_ammo(ammo)) return false;
    const ask = game.objects?.[ammo.otyp]?.oc_skill ?? 0;
    const lsk = game.objects?.[launcher.otyp]?.oc_skill ?? 0;
    return ask === -lsk;
}

/** C ref: obj.h is_missile */
export function is_missile(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_BOOMERANG && sk <= -P_DART;
}

/** C ref: obj.h is_pole — polearms/lance (Snickersnee artifact deferred). */
export function is_pole(obj) {
    if (!obj) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk === P_POLEARMS || sk === P_LANCE;
}

/** C ref: wield.c erodeable_wep / will_weld */
function will_weld(obj) {
    if (!obj?.cursed) return false;
    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)) return true;
    const n = objectNames[obj.otyp];
    return n === 'HEAVY_IRON_BALL' || n === 'IRON_CHAIN' || n === 'TIN_OPENER';
}

/** C ref: wield.c welded */
export function welded(obj) {
    const uwep = game.u?.uwep;
    if (obj && obj === uwep && will_weld(obj)) {
        obj.bknown = 1;
        return true;
    }
    return false;
}

/**
 * C ref: wield.c wield_tool — #rub / apply pick/whip/polearm auto-wield.
 * Named omissions: welded verbose hand/plural; cantwield; bimanual+shield;
 * will_weld → ready_weapon; untwoweapon side effects beyond basic clear.
 * Lamp #rub path uses the common doname wield message.
 * @returns {Promise<boolean>} TRUE if ready to use as uwep
 */
export async function wield_tool(obj, verb) {
    const u = game.u || {};
    if (u.uwep && obj === u.uwep) return true;
    if (!verb) verb = 'wield';

    if ((obj.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) {
        await pline(`You can't ${verb} ${xname(obj)} while wearing it.`);
        return false;
    }
    if (u.uwep && welded(u.uwep)) {
        await pline("You can't do that.");
        return false;
    }
    // cantwield / bimanual+shield deferred

    if (u.uquiver === obj) setuqwep(null);
    if (u.uswapwep === obj) {
        const swapRes = await doswapweapon();
        if (u.uswapwep === obj) return false;
        void swapRes;
    } else {
        // C wield.c wield_tool: oldwep = uwep; then pushweapon → setuswapwep
        const oldwep = u.uwep || null;
        if (will_weld(obj)) {
            await ready_weapon(obj);
        } else {
            await pline(`You now wield ${doname(obj)}.`);
            setuwep(obj);
        }
        if (game.flags?.pushweapon && oldwep && game.u?.uwep !== oldwep) {
            setuswapwep(oldwep);
        }
    }
    if (u.uwep && u.uwep !== obj) return false;
    if (u.twoweap) await untwoweapon();
    if (obj.oclass !== WEAPON_CLASS) {
        // C: gu.unweapon = TRUE
        if (!game.u) game.u = u;
        game.unweapon = true;
    }
    return true;
}

/**
 * C ref: wield.c setuwep — W_WEP slot + set_artifact_intrinsic on/off.
 * Ogresmasher/Sunsword light deferred.
 */
export function setuwep(obj) {
    const u = game.u || (game.u = {});
    const olduwep = u.uwep || null;
    if (obj === olduwep) return;

    // C worn.c setworn: clearing W_WEP while twoweap → set_twoweap(FALSE)
    if (u.twoweap && olduwep
        && ((olduwep.owornmask || 0) & (W_WEP | W_SWAPWEP))) {
        set_twoweap(false);
    }

    if (olduwep) {
        // C worn.c setworn: set_artifact_intrinsic(oobj, 0, mask) before clear
        if (olduwep.oartifact) set_artifact_intrinsic(olduwep, false, W_WEP);
        olduwep.owornmask = (olduwep.owornmask || 0) & ~W_WEP;
    }
    if (obj) {
        // clear other weapon slots if this object was there
        if (u.uswapwep === obj) {
            u.uswapwep = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_SWAPWEP;
        }
        if (u.uquiver === obj) {
            u.uquiver = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_QUIVER;
        }
        obj.owornmask = (obj.owornmask || 0) | W_WEP;
        u.uwep = obj;
        // C: set_artifact_intrinsic(obj, 1, W_WEP) after wear
        if (obj.oartifact) set_artifact_intrinsic(obj, true, W_WEP);
        // C: gu.unweapon for launchers/ammo/missiles/poles/non-weptools
        if (!game.gu) game.gu = {};
        game.gu.unweapon = (obj.oclass === WEAPON_CLASS)
            ? (is_launcher(obj) || is_ammo(obj) || is_missile(obj)
                || (is_pole(obj) && !u.usteed))
            : (!is_weptool(obj));
    } else {
        u.uwep = null;
        if (!game.gu) game.gu = {};
        game.gu.unweapon = true;
    }
}

/**
 * C ref: wield.c setuswapwep — W_SWAPWEP slot.
 */
export function setuswapwep(obj) {
    const u = game.u || (game.u = {});
    const old = u.uswapwep || null;
    if (obj === old) return;

    // C worn.c setworn: clearing W_SWAPWEP while twoweap → set_twoweap(FALSE)
    if (u.twoweap && old
        && ((old.owornmask || 0) & (W_WEP | W_SWAPWEP))) {
        set_twoweap(false);
    }

    if (old) old.owornmask = (old.owornmask || 0) & ~W_SWAPWEP;
    if (obj) {
        if (u.uwep === obj) {
            u.uwep = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
        }
        if (u.uquiver === obj) {
            u.uquiver = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_QUIVER;
        }
        obj.owornmask = (obj.owornmask || 0) | W_SWAPWEP;
        u.uswapwep = obj;
    } else {
        u.uswapwep = null;
    }
}

/**
 * C ref: wield.c setuqwep — W_QUIVER slot.
 */
export function setuqwep(obj) {
    const u = game.u || (game.u = {});
    const old = u.uquiver || null;
    if (obj === old) return;

    if (old) old.owornmask = (old.owornmask || 0) & ~W_QUIVER;
    if (obj) {
        if (u.uwep === obj) {
            u.uwep = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
        }
        if (u.uswapwep === obj) {
            u.uswapwep = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_SWAPWEP;
        }
        obj.owornmask = (obj.owornmask || 0) | W_QUIVER;
        u.uquiver = obj;
    } else {
        u.uquiver = null;
    }
}
/**
 * C ref: wield.c doswapweapon — exchange uwep ↔ uswapwep (takes time on success).
 * @returns {number} 0 fail; 1 took time (ECMD_TIME)
 */
export async function doswapweapon() {
    game.multi = 0;
    const u = game.u || (game.u = {});
    // C: cantwield → "Don't be ridiculous!" deferred (set_uasmon)
    if (welded(u.uwep)) {
        await pline('Your weapon is welded to your hand!');
        return 0;
    }

    const oldwep = u.uwep || null;
    const oldswap = u.uswapwep || null;
    // C: setuswapwep(0) via setworn clears twoweap before ready_weapon
    setuswapwep(null);

    const result = await ready_weapon(oldswap);

    if (u.uwep === oldwep) {
        setuswapwep(oldswap);
    } else {
        setuswapwep(oldwep);
        // C: second prinv triggers more() on the ready_weapon message
        if (u.uswapwep) await pline(xprname(u.uswapwep, undefined, true));
        else await pline('You have no secondary weapon readied.');
    }

    // C: if (u.twoweap && !can_twoweapon()) untwoweapon();
    if (u.twoweap && !(await can_twoweapon())) await untwoweapon();
    return result;
}

/**
 * C ref: wield.c ready_weapon — hero path without corpse/bimanual weld
 * messages beyond the common retouch + prinv + setuwep.
 * @returns {number} 0 fail/cancel semantics caller maps; 1 took time
 */
async function ready_weapon(wep) {
    const u = game.u || {};
    const had_wep = !!u.uwep;
    const was_twoweap = !!u.twoweap;

    if (!wep) {
        if (u.uwep) {
            await pline(`You are ${empty_handed()}.`);
            setuwep(null);
            return 1;
        }
        await pline(`You are already ${empty_handed()}.`);
        return 0;
    }

    // cant_wield_corpse / bimanual+shield deferred
    if (!(await retouch_object(wep, false))) {
        return 1; // C: ECMD_TIME even when not wielded
    }

    if (will_weld(wep)) {
        // weld pline deferred — still set bknown + wield
        wep.bknown = 1;
        setuwep(wep);
        return 1;
    }

    const dummy = wep.owornmask || 0;
    wep.owornmask = dummy | W_WEP;
    await pline(xprname(wep, undefined, true)); // C: prinv → xprname(..., TRUE)
    wep.owornmask = dummy;

    setuwep(wep);
    // C: was_twoweap && !u.twoweap && verbose → are/can_no_longer message
    if (was_twoweap && !u.twoweap && game.flags?.verbose !== false && u.uwep) {
        const ok = TWOWEAPOK(u.uwep) && !bimanual(u.uwep);
        await pline(`You ${ok ? are_no_longer_twoweap : can_no_longer_twoweap}.`);
    }
    // arti_speak / artifact_light / unpaid shop / twoweap messages deferred
    if (had_wep !== !!game.u?.uwep && game.flags) game.flags.botl = true;
    return 1;
}

/**
 * C ref: wield.c wield_ok — SUGGEST weapons/weptools; EXCLUDE coins;
 * DOWNPLAY other invent (selectable but not listed in prompt).
 */
function wield_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST; // '-'
    if (obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)) return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

/**
 * Invent letters with GETOBJ_SUGGEST only (C getobj `bp` / `lets[]`).
 * Sorted by invlet like C sortloot(SORTLOOT_INVLET).
 */
function wield_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if (wield_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/** C invent.c getobj: if (suggested > 5) compactify(bp) for prompt only. */
function wield_prompt_lets(raw) {
    if (!raw || raw.length <= 5) return raw;
    return compactify_invlets(raw);
}

/**
 * C ref: invent.c getobj("wield", wield_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * Hands GETOBJ_SUGGEST → buf prefix "- "; invent SUGGEST letters after;
 * compactify when suggested > 5. Count-split / ?/* pickinv deferred.
 */
async function getobj_wield() {
    for (;;) {
        await flush_topl_more();
        const rawLets = wield_suggest_lets();
        const lets = wield_prompt_lets(rawLets);
        // C: allownone → "- " then invent letters → "[%s or ?*]"
        const buf = lets ? `- ${lets}` : '-';
        const query = `What do you want to wield? [${buf} or ?*]`;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return undefined; // cancel
        }
        if (ch === '-') {
            game._pending_message = '';
            return null; // hands
        }
        if (ch === '?' || ch === '*') {
            // C display_pickinv(lets/altlets) deferred
            await pline('Never mind.');
            return undefined;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        const ok = wield_ok(otmp);
        if (ok === GETOBJ_EXCLUDE) {
            await pline('You cannot wield that!');
            return undefined;
        }
        // SUGGEST + DOWNPLAY both selectable (C getobj)
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: wield.c dowield — #wield / 'w'.
 * @returns {number} 0 = no turn / cancel / fail; 1 = took time
 */
export async function dowield() {
    game.multi = 0;
    // cantwield(youmonst.data) deferred — humanoid always ok

    const wep = await getobj_wield();
    if (wep === undefined) return 0; // cancel

    const u = game.u || {};
    if (wep && wep === u.uwep) {
        await pline('You are already wielding that!');
        return 0;
    }
    if (welded(u.uwep)) {
        await pline('Your weapon is welded to your hand!');
        return 0;
    }

    // uswapwep / uquiver confirm / worn-armor reject
    if (wep && wep === u.uswapwep) {
        return await doswapweapon();
    }
    if (wep && (wep.owornmask || 0) & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await pline('You cannot wield that!');
        return 0;
    }
    if (wep && wep === u.uquiver) {
        // quiver ynq confirm deferred
        await pline('You cannot wield that!');
        return 0;
    }

    // C wield.c dowield wielding:: oldwep = uwep; ready_weapon; pushweapon
    const oldwep = u.uwep || null;
    const result = await ready_weapon(wep);
    if (game.flags?.pushweapon && oldwep && game.u?.uwep !== oldwep) {
        setuswapwep(oldwep);
    }
    if (u.twoweap) await untwoweapon();
    return result;
}

/**
 * C ref: wield.c ready_ok — SUGGEST ammo matching launcher / weapons / coins;
 * DOWNPLAY launchers and lone uwep; '-' when quiver non-empty is SUGGEST.
 */
function ready_ok(obj) {
    const u = game.u || {};
    if (!obj) return u.uquiver ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;

    if (obj === u.uwep || (obj === u.uswapwep && u.twoweap)) {
        return (obj.quan || 1) === 1 ? GETOBJ_DOWNPLAY : GETOBJ_SUGGEST;
    }
    if (is_ammo(obj)) {
        return ((u.uwep && ammo_and_launcher(obj, u.uwep))
            || (u.uswapwep && ammo_and_launcher(obj, u.uswapwep)))
            ? GETOBJ_SUGGEST
            : GETOBJ_DOWNPLAY;
    }
    if (is_launcher(obj)) return GETOBJ_DOWNPLAY;
    if (obj.oclass === WEAPON_CLASS || obj.oclass === COIN_CLASS) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

/** Invent-order SUGGEST letters for #quiver (C getobj; '-' space when SUGGEST). */
function ready_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if (ready_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    return lets.join('');
}

/**
 * C ref: invent.c getobj(verb, ready_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * Count-split deferred; '-' → hands_obj; DOWNPLAY letters still accepted.
 */
async function getobj_ready(verb) {
    for (;;) {
        await flush_topl_more();
        const lets = ready_suggest_lets();
        const dash = ready_ok(null) === GETOBJ_SUGGEST
            ? (lets ? '- ' : '-')
            : '';
        const inner = dash || lets
            ? `${dash}${lets}`
            : '';
        const query = inner
            ? `What do you want to ${verb}? [${inner} or ?*]`
            : `What do you want to ${verb}? [*]` ;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return undefined;
        }
        if (ch === '-') {
            game._pending_message = '';
            return hands_obj;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return undefined;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        const rank = ready_ok(otmp);
        if (rank === GETOBJ_EXCLUDE) {
            await pline(`You cannot ${verb} that!`);
            return undefined;
        }
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: wield.c doquiver_core — #quiver / Q and dofire refill.
 * Branch envelope: empty invent; '-' clear; already quivered; worn reject;
 * uwep/uswapwep ynq confirm (no quan-split); setuqwep + prinv.
 * Deferred: count-split finish_splitting / unsplitobj / coin partial.
 * @returns {number} 0 = ECMD_OK / cancel; 1 = ECMD_TIME
 */
export async function doquiver_core(verb) {
    game.multi = 0;
    if (!(game.invent || []).length) {
        await pline('You have nothing to ready for firing.');
        return 0;
    }

    const newquiver = await getobj_ready(verb);
    if (newquiver === undefined) return 0; // cancel

    const u = game.u || (game.u = {});
    let was_uwep = false;
    const was_twoweap = !!u.twoweap;

    if (newquiver === hands_obj) {
        if (u.uquiver) {
            await pline('You now have no ammunition readied.');
            setuqwep(null);
        } else {
            await pline('You already have no ammunition readied!');
        }
        return 0;
    }

    if (newquiver === u.uquiver) {
        await pline('That ammunition is already readied!');
        return 0;
    }
    if ((newquiver.owornmask || 0) & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await pline(`You cannot ${verb} that!`);
        return 0;
    }

    if (newquiver === u.uwep) {
        if (welded(u.uwep)) {
            await pline('Your weapon is welded to your hand!');
            return u.uwep.bknown ? 0 : 1;
        }
        // quan>1 split path deferred — always confirm ready-all
        const use_plural = (newquiver.quan || 1) > 1;
        const qbuf = `You are wielding ${use_plural ? 'those' : 'that'}.  Ready ${use_plural ? 'them' : 'it'} instead?`;
        if ((await yn_function(qbuf, 'ynq', 'q')) !== 'y') {
            await pline(`Your ${use_plural ? 'weapons remain' : 'weapon remains'} wielded.`);
            return 0;
        }
        setuwep(null);
        u.twoweap = false;
        was_uwep = true;
    } else if (newquiver === u.uswapwep) {
        // quan>1 split path deferred
        const use_plural = (newquiver.quan || 1) > 1;
        const qbuf = `${use_plural ? 'Those are' : 'That is'} your ${u.twoweap ? 'second' : 'alternate'} weapon.  Ready ${use_plural ? 'them' : 'it'} instead?`;
        if ((await yn_function(qbuf, 'ynq', 'q')) !== 'y') {
            await pline(`Your ${use_plural ? 'weapons remain' : 'weapon remains'} as secondary weapon.`);
            return 0;
        }
        setuswapwep(null);
        u.twoweap = false;
    }

    if (verb === 'ready') {
        setuqwep(newquiver);
        await pline(xprname(newquiver, undefined, true));
    } else {
        await pline(`You ready: ${xprname(newquiver, undefined, false)}`);
        setuqwep(newquiver);
    }

    if (was_uwep) {
        await pline(`You are now ${empty_handed()}.`);
        return 1;
    }
    if (was_twoweap && !u.twoweap) {
        await pline('You are no longer fighting two-handed.');
        return 1;
    }
    return 0;
}

/** C ref: wield.c dowieldquiver — #quiver / 'Q'. */
export async function dowieldquiver() {
    return doquiver_core('ready');
}

/**
 * C ref: mondata.h could_twoweap — >1 AT_WEAP among first three mattk slots.
 */
export function could_twoweap(ptr) {
    const mattk = ptr?.mattk;
    if (!mattk) return false;
    let n = 0;
    for (let i = 0; i < 3; i++) {
        if ((mattk[i]?.aatyp | 0) === AT_WEAP) n++;
    }
    return n > 1;
}

/** Hero form for could_twoweap — C youmonst.data; set_uasmon deferred → role. */
function hero_form_data() {
    if (game.youmonst?.data) return game.youmonst.data;
    const mndx = game.u?.umonnum ?? game.urole?.mnum;
    return mons(mndx);
}

/**
 * C ref: wield.c TWOWEAPOK — weapon (not launcher/ammo/missile) or weptool.
 */
function TWOWEAPOK(obj) {
    if (!obj) return false;
    if (obj.oclass === WEAPON_CLASS) {
        return !(is_launcher(obj) || is_ammo(obj) || is_missile(obj));
    }
    return is_weptool(obj);
}

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
}

/**
 * C ref: wield.c set_twoweap — toggle u.twoweap; botl when weaponstatus.
 */
export function set_twoweap(on_off) {
    const u = game.u;
    if (!u) return;
    const want = !!on_off;
    if (want !== !!u.twoweap) {
        u.twoweap = want;
        if (game.flags?.weaponstatus) game.flags.botl = true;
    }
}

/**
 * C ref: wield.c drop_uswapwep — Glib/cursed secondary while dual-wielding.
 * Yobjnam2/otense polish deferred; dropx via dynamic import (do↔wield).
 */
async function drop_uswapwep() {
    const u = game.u;
    const obj = u?.uswapwep;
    if (!obj) return;
    const left_hand = 'left hand';
    if (!obj.cursed) {
        await pline(`${xname(obj)} slips from your ${left_hand}!`);
    } else if (!u.twoweap) {
        await pline(`${xname(obj)} evades your grasp and drops from your ${left_hand}!`);
    } else {
        await pline(`Your ${left_hand} spasms and drops ${xname(obj)}!`);
    }
    const { dropx } = await import('./do.js');
    await dropx(obj);
}

/**
 * C ref: wield.c can_twoweapon — dual-wield eligibility + failure plines.
 * Named omissions: full Yname2/Yobjnam2/body_part/cant_wield_corpse; Glib
 * prop may be incomplete until timeout wiring.
 */
export async function can_twoweapon() {
    const u = game.u || {};
    const uwep = u.uwep;
    const uswapwep = u.uswapwep;
    const ptr = hero_form_data();

    if (!could_twoweap(ptr)) {
        if (Upolyd(u)) {
            await pline("You can't use two weapons in your current form.");
        } else {
            const female = !!(game.flags?.female);
            const nm = (female && game.urole?.name?.f)
                ? game.urole.name.f
                : (game.urole?.name?.m || 'hero');
            await pline(`${makeplural(nm)} aren't able to use two weapons at once.`);
        }
    } else if (!uwep || !uswapwep) {
        let hand_s = 'hand';
        if (!uwep && !uswapwep) hand_s = makeplural(hand_s);
        const which = uwep ? 'left ' : uswapwep ? 'right ' : '';
        await pline(`Your ${which}${hand_s} ${vtense(hand_s, 'are')} empty.`);
    } else if (!TWOWEAPOK(uwep) || !TWOWEAPOK(uswapwep)) {
        const otmp = !TWOWEAPOK(uwep) ? uwep : uswapwep;
        const plural = (otmp.quan || 1) !== 1;
        const suit = plural ? "aren't" : "isn't a";
        const slot = otmp === uwep ? 'primary' : 'secondary';
        const plur = plural ? 's' : '';
        await pline(`${xname(otmp)} ${suit} suitable ${slot} weapon${plur}.`);
    } else if (bimanual(uwep) || bimanual(uswapwep)) {
        const otmp = bimanual(uwep) ? uwep : uswapwep;
        await pline(`${xname(otmp)} isn't one-handed.`);
    } else if (u.uarms) {
        await pline("You can't use two weapons while wearing a shield.");
    } else if (uswapwep.oartifact) {
        await pline(`${xname(uswapwep)} resists being held second to another weapon!`);
    } else if (u.Glib || uswapwep.cursed) {
        if (!u.Glib) uswapwep.bknown = 1;
        await drop_uswapwep();
    } else {
        return true;
    }
    return false;
}

/**
 * C ref: wield.c untwoweapon — end dual-wield with can_no_longer message.
 */
export async function untwoweapon() {
    const u = game.u;
    if (u?.twoweap) {
        await pline(`You ${can_no_longer_twoweap}.`);
        set_twoweap(false);
        // update_inventory deferred
    }
}

/** C ref: mondata.c body_part — HAND → "hand"; full poly table deferred. */
function body_part(part) {
    if (part === HAND) return 'hand';
    return 'body part';
}

/** C ref: potion.c hcolor — Hallucination synonym deferred. */
function hcolor(colorword) {
    return colorword || 'odd';
}

/**
 * C ref: objnam.c Yobjnam2 — "Your <xname> <otense verb>".
 * shk_your / pname / artifact article arms deferred.
 */
function Yobjnam2(obj, verb) {
    const nam = xname(obj);
    return `Your ${nam} ${vtense(nam, verb)}`;
}

/** C ref: objnam.c simpleonames — base type name without spe/BUC. */
function simpleonames(obj) {
    return xname(obj);
}

/**
 * C ref: potion.c strange_feeling — pline + optional trycall/useup.
 * Beginner/Hallucination default text; caller nulls sobj when used up.
 */
async function strange_feeling(obj, txt) {
    const beginner = !!(game.flags?.beginner);
    const Hallucination = !!(game.u?.Hallucination);
    if (beginner || !txt) {
        await pline(
            `You have a ${Hallucination ? 'normal' : 'strange'} feeling for a moment, then it passes.`,
        );
    } else {
        await pline(txt);
    }
    if (!obj) return;
    if (obj.dknown) await trycall(obj);
    // useup one
    if ((obj.quan || 1) > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        const inv = game.invent || [];
        const idx = inv.indexOf(obj);
        if (idx >= 0) inv.splice(idx, 1);
        if (game.u?.uwep === obj) setuwep(null);
    }
}

const WORM_TOOTH = objectNames.indexOf('WORM_TOOTH');
const CRYSKNIFE = objectNames.indexOf('CRYSKNIFE');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');

/** C ref: obj.h is_elven_weapon — name prefix check (full table deferred). */
function is_elven_weapon(obj) {
    const n = objectNames[obj?.otyp];
    return !!(n && n.startsWith('ELVEN_'));
}

/**
 * C ref: wield.c chwepon — enchant / disenchant wielded weapon.
 * Named omissions: full body_part poly; Hallucination hcolor; Magicbane
 * clue polish; artifact restrict_name faint-glow; shop costly_alteration /
 * alter_cost unpaid; useupall multi evaporate inventory sync; encumber_msg
 * after stack fuse only when quan split.
 * @returns {Promise<number>} 1 = enchanted (caller useup); 0 = strange_feeling used up scroll
 */
export async function chwepon(otmp, amount) {
    const u = game.u || {};
    const uwep = u.uwep;
    const Blind = !!(u.Blind || u.ublind);
    const Hallucination = !!(u.Hallucination);
    const color = hcolor(amount < 0 ? 'black' : 'blue');
    let otyp = STRANGE_OBJECT;

    if (!uwep || (uwep.oclass !== WEAPON_CLASS && !is_weptool(uwep))) {
        let buf;
        if (amount >= 0 && uwep && will_weld(uwep)) {
            if (!Blind) {
                buf = `${Yobjnam2(uwep, 'glow')} with ${an(hcolor('amber'))} aura.`;
                uwep.bknown = Hallucination ? 0 : 1;
            } else {
                buf = `Your right ${body_part(HAND)} tingles.`;
            }
            uncurse(uwep);
            // update_inventory deferred
        } else {
            buf = `Your ${makeplural(body_part(HAND))} ${amount >= 0 ? 'twitch' : 'itch'}.`;
        }
        await strange_feeling(otmp, buf);
        exercise(A_DEX, amount >= 0);
        return 0;
    }

    if (otmp && otmp.oclass === SCROLL_CLASS) otyp = otmp.otyp | 0;

    if (WORM_TOOTH >= 0 && (uwep.otyp | 0) === WORM_TOOTH && amount >= 0) {
        const multiple = (uwep.quan || 1) > 1;
        await pline(
            `Your ${simpleonames(uwep)} ${multiple ? 'fuse, and become' : 'is'} much sharper now.`,
        );
        uwep.otyp = CRYSKNIFE;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (uwep.cursed) uncurse(uwep);
        // alter_cost unpaid deferred
        if (otyp !== STRANGE_OBJECT) makeknown(otyp);
        if (multiple) await encumber_msg();
        return 1;
    }
    if (CRYSKNIFE >= 0 && (uwep.otyp | 0) === CRYSKNIFE && amount < 0) {
        const multiple = (uwep.quan || 1) > 1;
        await pline(
            `Your ${simpleonames(uwep)} ${multiple ? 'fuse, and become' : 'is'} much duller now.`,
        );
        // costly_alteration COST_DEGRD deferred
        uwep.otyp = WORM_TOOTH;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (otyp !== STRANGE_OBJECT && otmp?.bknown) makeknown(otyp);
        if (multiple) await encumber_msg();
        return 1;
    }

    // artifact restrict_name faint-glow deferred
    if (((uwep.spe > 5 && amount >= 0) || (uwep.spe < -5 && amount < 0))
        && rn2(3)) {
        if (!Blind) {
            await pline(
                `${Yobjnam2(uwep, 'violently glow')} ${color} for a while and then ${vtense(xname(uwep), 'evaporate')}.`,
            );
        } else {
            await pline(`${Yobjnam2(uwep, 'evaporate')}.`);
        }
        // useupall — remove wielded stack
        const inv = game.invent || [];
        const idx = inv.indexOf(uwep);
        if (idx >= 0) inv.splice(idx, 1);
        setuwep(null);
        return 1;
    }

    if (!Blind) {
        const xtime = (amount * amount === 1) ? 'moment' : 'while';
        await pline(
            `${Yobjnam2(uwep, amount === 0 ? 'violently glow' : 'glow')} ${color} for a ${xtime}.`,
        );
        if (otyp !== STRANGE_OBJECT && uwep.known
            && (amount > 0 || (amount < 0 && otmp?.bknown))) {
            makeknown(otyp);
        }
    }
    if (amount < 0) {
        // costly_alteration COST_DECHNT deferred
    }
    uwep.spe = (uwep.spe | 0) + (amount | 0);
    if (amount > 0) {
        if (uwep.cursed) uncurse(uwep);
        // alter_cost unpaid deferred
    }

    // Magicbane hand itch deferred (u_wield_art ART_MAGICBANE)

    if ((uwep.spe | 0) > 5
        && (is_elven_weapon(uwep) || uwep.oartifact || !rn2(7))) {
        await pline(`${Yobjnam2(uwep, 'suddenly vibrate')} unexpectedly.`);
    }

    return 1;
}

/**
 * C ref: wield.c dotwoweapon — #twoweapon toggle.
 * @returns {Promise<number>} ECMD_OK or ECMD_TIME
 */
export async function dotwoweapon() {
    const u = game.u;
    if (!u) return ECMD_OK;

    if (u.twoweap) {
        await pline('You switch to your primary weapon.');
        set_twoweap(false);
        // update_inventory deferred
        return ECMD_OK;
    }

    if (await can_twoweapon()) {
        await pline('You begin two-weapon combat.');
        set_twoweap(true);
        // update_inventory deferred
        return (rnd(20) > acurr(A_DEX)) ? ECMD_TIME : ECMD_OK;
    }
    return ECMD_OK;
}