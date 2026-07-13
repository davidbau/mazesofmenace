// wield.js — Wield / weapon slot (partial).
// C ref: wield.c — setuwep, ready_weapon, dowield, welded.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { xprname } from './objnam.js';
import {
    WEAPON_CLASS, TOOL_CLASS, COIN_CLASS, GEM_CLASS, objectNames,
} from './objects.js';
import {
    W_WEP, W_SWAPWEP, W_QUIVER, W_ARMOR, W_ACCESSORY, W_SADDLE,
    P_NONE, P_BOW, P_CROSSBOW, P_DART, P_BOOMERANG, P_POLEARMS, P_LANCE,
} from './const.js';
import { retouch_object } from './artifact.js';

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE (named fallback). */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    if (sk != null && sk !== P_NONE) return true;
    const n = objectNames[obj.otyp];
    return n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN'
        || n === 'AKLYS' || n === 'BULLWHIP';
}

function is_launcher(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= P_BOW && sk <= P_CROSSBOW;
}

function is_ammo(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== GEM_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

function is_missile(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_BOOMERANG && sk <= -P_DART;
}

function is_pole(obj) {
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
 * C ref: wield.c ready_weapon — hero path without corpse/bimanual weld
 * messages beyond the common retouch + prinv + setuwep.
 * @returns {number} 0 fail/cancel semantics caller maps; 1 took time
 */
async function ready_weapon(wep) {
    const u = game.u || {};
    const had_wep = !!u.uwep;

    if (!wep) {
        if (u.uwep) {
            await pline('You are empty handed.');
            setuwep(null);
            return 1;
        }
        await pline('You are already empty handed.');
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
    await pline(xprname(wep));
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
        // C: return doswapweapon() — deferred; clear swap and wield
        u.uswapwep = null;
        wep.owornmask = (wep.owornmask || 0) & ~W_SWAPWEP;
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
