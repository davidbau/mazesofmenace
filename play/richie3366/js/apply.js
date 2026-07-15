// apply.js — Apply / use tool command.
// C ref: apply.c doapply / apply_ok (LOCK_PICK / key / STETHOSCOPE body).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import {
    TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, POTION_CLASS,
    COIN_CLASS, objectNames,
} from './objects.js';
import { P_AXE, P_PICK_AXE, P_POLEARMS, P_LANCE } from './const.js';
import { pick_lock } from './lock.js';
import { ustatusline } from './insight.js';

const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const STETHOSCOPE = objectNames.indexOf('STETHOSCOPE');
const BULLWHIP = objectNames.indexOf('BULLWHIP');
const POT_OIL = objectNames.indexOf('POT_OIL');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const EUCALYPTUS_LEAF = objectNames.indexOf('EUCALYPTUS_LEAF');
const LUMP_OF_ROYAL_JELLY = objectNames.indexOf('LUMP_OF_ROYAL_JELLY');
const BANANA = objectNames.indexOf('BANANA');
const TOUCHSTONE = objectNames.indexOf('TOUCHSTONE');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const FLINT = objectNames.indexOf('FLINT');
const SACK = objectNames.indexOf('SACK');
const OILSKIN_SACK = objectNames.indexOf('OILSKIN_SACK');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const ICE_BOX = objectNames.indexOf('ICE_BOX');

/** C invent getobj callback ranks (hack.h). */
const GETOBJ_EXCLUDE = -3;
const GETOBJ_EXCLUDE_SELECTABLE = 0;
const GETOBJ_DOWNPLAY = 1;
const GETOBJ_SUGGEST = 2;

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/** C ref: obj.h is_axe — WEAPON/TOOL with P_AXE skill. */
function is_axe(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_AXE;
}

/** C ref: obj.h is_pick — WEAPON/TOOL with P_PICK_AXE skill. */
function is_pick(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}

/** C ref: obj.h is_pole — polearms/lance (Snickersnee artifact deferred). */
function is_pole(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk === P_POLEARMS || sk === P_LANCE;
}

/** C ref: obj.h is_graystone. */
function is_graystone(obj) {
    if (!obj) return false;
    const o = obj.otyp;
    return o === LUCKSTONE || o === LOADSTONE || o === FLINT || o === TOUCHSTONE;
}

/**
 * C ref: apply.c apply_ok — SUGGEST tools/wands/spellbooks + applicable
 * weapons/oil/food/graystones; DOWNPLAY coins/unknown potions/hallu banana;
 * EXCLUDE_SELECTABLE for known non-touchstone graystones and unapplicable.
 * Snickersnee pole path deferred with other artifacts.
 */
function apply_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;

    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === SPBOOK_CLASS) {
        return GETOBJ_SUGGEST;
    }

    if (obj.oclass === COIN_CLASS) return GETOBJ_DOWNPLAY;

    if (obj.oclass === WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === BULLWHIP)) {
        return GETOBJ_SUGGEST;
    }

    if (obj.oclass === POTION_CLASS) {
        const oc = game.objects?.[obj.otyp];
        if (!obj.dknown || !oc?.oc_name_known) return GETOBJ_DOWNPLAY;
        if (obj.otyp === POT_OIL) return GETOBJ_SUGGEST;
    }

    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY) {
        return GETOBJ_SUGGEST;
    }

    if (obj.otyp === BANANA && game.u?.Hallucination) return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        if (!obj.dknown) return GETOBJ_SUGGEST;
        const touchKnown = !!game.objects?.[TOUCHSTONE]?.oc_name_known;
        const selfKnown = !!game.objects?.[obj.otyp]?.oc_name_known;
        if (obj.otyp !== TOUCHSTONE && (touchKnown || selfKnown)) {
            return GETOBJ_EXCLUDE_SELECTABLE;
        }
        return GETOBJ_SUGGEST;
    }

    return GETOBJ_EXCLUDE_SELECTABLE;
}

/** Invent-order SUGGEST letters only (C getobj; DOWNPLAY stays off prompt). */
function apply_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && apply_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    return lets.join('');
}

/** True when invent has DOWNPLAY (forces prompt even if SUGGEST empty). */
function apply_has_downplay() {
    for (const o of game.invent || []) {
        if (apply_ok(o) === GETOBJ_DOWNPLAY) return true;
    }
    return false;
}

/**
 * C ref: invent.c getobj("use or apply", apply_ok) — loop on missing letter;
 * flush_topl_more before re-prompt so "don't have" gets --More--.
 * Empty SUGGEST with no DOWNPLAY/hands → early "don't have anything"
 * (C suggested==0 && !forceprompt && !allownone); do not prompt [*].
 */
async function getobj_apply() {
    const lets0 = apply_lets();
    // C: apply_ok(NULL) is GETOBJ_EXCLUDE — no hands; DOWNPLAY sets forceprompt.
    if (!lets0 && !apply_has_downplay()) {
        await pline("You don't have anything to use or apply.");
        return null;
    }

    for (;;) {
        await flush_topl_more();
        const lets = apply_lets();
        if (!lets && !apply_has_downplay()) {
            await pline("You don't have anything to use or apply.");
            return null;
        }
        const query = lets
            ? `What do you want to use or apply? [${lets} or ?*]`
            : 'What do you want to use or apply? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // C: display_pickinv(lets or all, want_reply) → selected invlet
            const { display_pickinv_reply } = await import('./invent.js');
            const ilet = await display_pickinv_reply(ch === '*' ? '*' : lets);
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) continue; // Space/Return → re-prompt getobj
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            const rank = apply_ok(picked);
            if (rank === GETOBJ_EXCLUDE) {
                await pline('That is a silly thing to apply.');
                return null;
            }
            game._pending_message = '';
            return picked;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        const rank = apply_ok(otmp);
        if (rank === GETOBJ_EXCLUDE) {
            await pline('That is a silly thing to apply.');
            return null;
        }
        // SUGGEST / DOWNPLAY / EXCLUDE_SELECTABLE → return; doapply default
        // prints "Sorry…" for EXCLUDE_SELECTABLE otyps.
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: cmd.c getdir — '.' is self (dx=dy=dz=0, success), not cancel.
 * Used by use_stethoscope; lock.js getdir still treats '.' as cancel.
 */
async function getdir_self_ok(prompt) {
    const msg = prompt || 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(game._pending_message.length, 0);
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    game._pending_message = '';
    if (!game.u) game.u = {};
    if (ch === '.') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return true;
    }
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        return false;
    }
    if (!(ch in DIR_DX)) return false;
    game.u.dx = DIR_DX[ch];
    game.u.dy = DIR_DY[ch];
    game.u.dz = 0;
    return true;
}

/**
 * C ref: apply.c use_stethoscope — one free use per hero_seq; '.' → ustatusline.
 * Branch envelope: self (dx=dy=0) only. Deferred: swallow/steed/dz/cursed
 * heartbeat rn2(2), adjacent mstatusline/SDOOR/SCORR, confdir, Deaf/nohands.
 * @returns {number} 1 = ECMD_TIME, 0 = ECMD_OK, -1 = ECMD_CANCEL
 */
async function use_stethoscope(_obj) {
    if (!(await getdir_self_ok(null))) return -1; // ECMD_CANCEL

    // C: first use this hero_seq is free; another use costs the turn
    if (!game.context) game.context = {};
    if (game.hero_seq == null) game.hero_seq = (game.moves || 1) << 3;
    const seq = game.hero_seq;
    const tookTime = seq === (game.context.stethoscope_seq ?? 0) ? 1 : 0;
    game.context.stethoscope_seq = seq;

    // confdir deferred (not Confused at starter)
    const dx = game.u.dx | 0;
    const dy = game.u.dy | 0;
    if (!dx && !dy) {
        await ustatusline();
        return tookTime;
    }
    // Adjacent monster / terrain stethoscope deferred
    await pline("You hear a faint typing noise.");
    return 0; // ECMD_OK — match C isok-fail path rather than invent TIME
}

/**
 * C ref: apply.c doapply() — getobj + LOCK_PICK/key/STETHOSCOPE + sack/bag
 * use_container. Named omissions: nohands/capacity; retouch; do_break_wand;
 * flip_through_book; flip_coin; cream pie/jelly; whip/grapple/blindfold/
 * lenses; use_stone; use_pole/use_pick_axe; traps; oil; BoT; most tools.
 * @returns {boolean} true if the command took time (ECMD_TIME)
 */
export async function doapply() {
    const obj = await getobj_apply();
    if (!obj) return false;

    if (obj.otyp === LOCK_PICK || obj.otyp === SKELETON_KEY
        || obj.otyp === CREDIT_CARD) {
        // C: res = (pick_lock(...) != 0) ? ECMD_TIME : ECMD_OK
        const pl = await pick_lock(obj);
        return pl !== 0;
    }

    if (obj.otyp === STETHOSCOPE) {
        const res = await use_stethoscope(obj);
        return res > 0; // ECMD_TIME only
    }

    // C: SACK / BAG_OF_HOLDING / OILSKIN_SACK → use_container(&obj, TRUE, FALSE)
    if (obj.otyp === SACK || obj.otyp === OILSKIN_SACK
        || obj.otyp === BAG_OF_HOLDING
        || obj.otyp === LARGE_BOX || obj.otyp === CHEST
        || obj.otyp === ICE_BOX) {
        const { use_container } = await import('./pickup.js');
        const { ECMD_TIME } = await import('./const.js');
        const res = await use_container(obj, true, false);
        return res === ECMD_TIME;
    }
    if (obj.otyp === BAG_OF_TRICKS) {
        await pline("Sorry, I don't know how to use that.");
        return false;
    }

    // Other apply otyps deferred
    await pline("Sorry, I don't know how to use that.");
    return false;
}
