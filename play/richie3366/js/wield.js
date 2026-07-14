// wield.js — Wield / weapon slot (partial).
// C ref: wield.c — setuwep, ready_weapon, dowield, doquiver_core, welded.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { xprname } from './objnam.js';
import { yn_function } from './getline.js';
import { hands_obj } from './weapon.js';
import { humanoid } from './monsters.js';
import {
    WEAPON_CLASS, TOOL_CLASS, COIN_CLASS, GEM_CLASS, objectNames,
} from './objects.js';
import {
    W_WEP, W_SWAPWEP, W_QUIVER, W_ARMOR, W_ACCESSORY, W_SADDLE,
    P_NONE, P_BOW, P_CROSSBOW, P_DART, P_BOOMERANG, P_POLEARMS, P_LANCE,
} from './const.js';
import { retouch_object } from './artifact.js';

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
 * C ref: wield.c setuwep — W_WEP slot only; Ogresmasher/Sunsword light
 * and full setworn prop wiring deferred.
 */
export function setuwep(obj) {
    const u = game.u || (game.u = {});
    const olduwep = u.uwep || null;
    if (obj === olduwep) return;

    if (olduwep) {
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
    if (welded(u.uwep)) {
        await pline('Your weapon is welded to your hand!');
        return 0;
    }

    const oldwep = u.uwep || null;
    const oldswap = u.uswapwep || null;
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

    if (u.twoweap) u.twoweap = false;
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
    // arti_speak / artifact_light / unpaid shop / twoweap messages deferred
    if (had_wep !== !!game.u?.uwep && game.flags) game.flags.botl = true;
    return 1;
}

/** C ref: wield.c wield_ok — SUGGEST weapons/weptools; exclude coins. */
function wield_ok(obj) {
    if (!obj) return true; // '-'
    if (obj.oclass === COIN_CLASS) return false;
    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)) return true;
    return true; // C DOWNPLAY — still selectable
}

function wield_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if (o.oclass === COIN_CLASS) continue;
        if (wield_ok(o)) lets.push(o.invlet);
    }
    return lets.join('');
}

/**
 * C ref: invent.c getobj("wield", wield_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * Count-split path deferred; '-' → empty hands sentinel.
 */
async function getobj_wield() {
    for (;;) {
        await flush_topl_more();
        const lets = wield_lets();
        const query = lets
            ? `What do you want to wield? [-${lets} or ?*]`
            : 'What do you want to wield? [- or ?*]';
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
            await pline('Never mind.');
            return undefined;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (otmp.oclass === COIN_CLASS) {
            await pline('You cannot wield that!');
            return undefined;
        }
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

    const result = await ready_weapon(wep);
    // flags.pushweapon deferred
    if (u.twoweap) u.twoweap = false; // untwoweapon stub
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