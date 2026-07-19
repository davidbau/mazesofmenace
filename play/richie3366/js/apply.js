// apply.js — Apply / use tool command.
// C ref: apply.c doapply / apply_ok (LOCK_PICK / key / STETHOSCOPE body).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { vision_recalc } from './vision.js';
import {
    TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, POTION_CLASS,
    COIN_CLASS, GEM_CLASS, FOOD_CLASS, objectNames,
} from './objects.js';
import {
    P_AXE, P_PICK_AXE, P_POLEARMS, P_LANCE,
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, nothing_happens,
    FACE, TIMEOUT, OBJ_FREE,
} from './const.js';
import { pick_lock } from './lock.js';
import { ustatusline } from './insight.js';
import { compactify_invlets, makeknown } from './invent.js';
import { rn2, rn1, rnd } from './rng.js';
import { nohands, haseyes } from './monsters.js';
import { wield_tool } from './wield.js';
import { splitobj, delobj } from './mkobj.js';
import { xname, the, makeplural } from './objnam.js';

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
const WOODEN_FLUTE = objectNames.indexOf('WOODEN_FLUTE');
const MAGIC_FLUTE = objectNames.indexOf('MAGIC_FLUTE');
const TOOLED_HORN = objectNames.indexOf('TOOLED_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const WOODEN_HARP = objectNames.indexOf('WOODEN_HARP');
const MAGIC_HARP = objectNames.indexOf('MAGIC_HARP');
const BUGLE = objectNames.indexOf('BUGLE');
const LEATHER_DRUM = objectNames.indexOf('LEATHER_DRUM');
const DRUM_OF_EARTHQUAKE = objectNames.indexOf('DRUM_OF_EARTHQUAKE');
const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');

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

/** C invent.c getobj: if (suggested > 5) compactify(bp) for prompt only. */
function apply_prompt_lets(raw) {
    if (!raw || raw.length <= 5) return raw;
    return compactify_invlets(raw);
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
        const rawLets = apply_lets();
        if (!rawLets && !apply_has_downplay()) {
            await pline("You don't have anything to use or apply.");
            return null;
        }
        // C: Strcpy(lets, bp); if (suggested > 5) compactify(bp); prompt uses bp
        const lets = apply_prompt_lets(rawLets);
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
            // C: display_pickinv uses non-compacted lets[]
            const { display_pickinv_reply } = await import('./invent.js');
            const ilet = await display_pickinv_reply(ch === '*' ? '*' : rawLets);
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

/** C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716: no sticky). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/**
 * C ref: potion.c make_blinded + toggle_blindness subset.
 * Sets HBlinded TIMEOUT; on sight toggle → botl + vision_recalc(0).
 * Eyes override / Punished set_bc / Blind_telepat see_monsters / talk deferred.
 */
function make_blinded(xtime, _talk) {
    const u = game.u || (game.u = {});
    const old = BlindedTimeout();
    // C probes Blind via props before committing xtime
    const u_could_see = !Blind();
    u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | (xtime ? 1 : 0);
    const can_see_now = !Blind();
    u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | (old & TIMEOUT);

    u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | (xtime ? (xtime & TIMEOUT) : 0);
    u.Blind = Blind();
    if (u_could_see !== can_see_now) {
        // C: toggle_blindness — botl + vision_full_recalc + vision_recalc(0)
        if (game.flags) game.flags.botl = true;
        game.vision_full_recalc = 1;
        vision_recalc(0);
        // Blind_telepat / Infravision / Sting see_monsters deferred
    }
}

/** C ref: mondata.c body_part — FACE → "face"; poly table deferred. */
function body_part(part) {
    if (part === FACE) return 'face';
    return 'body part';
}

/**
 * C ref: mondata.c can_blnd(NULL, &youmonst, AT_WEAP, cream_pie) subset.
 * Named omissions: visored helmet; mon_perma_blind; raven-vs-raven.
 */
function can_blnd_cream_self(obj) {
    const you = game.youmonst;
    if (!haseyes(you?.data)) return false;
    // C: Blindfolded ≡ EBlinded / ublindf blocks cream on hero
    if (game.u?.ublindf || (game.u?.EBlinded | 0)) return false;
    void obj;
    return true;
}

/** C ref: worn.c setnotworn — clear hero worn slots pointing at obj. */
function setnotworn(obj) {
    if (!obj) return;
    const u = game.u || {};
    for (const slot of [
        'uwep', 'uswapwep', 'uqwep',
        'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
        'uleft', 'uright', 'uamul', 'ublindf',
    ]) {
        if (u[slot] === obj) u[slot] = null;
    }
    obj.owornmask = 0;
}

/** Remove obj from invent array (C freeinv / obj_extract_self OBJ_INVENT). */
function freeinv_pie(obj) {
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.where = OBJ_FREE;
}

/**
 * C ref: apply.c use_cream_pie — immerse face; blindinc rnd(25); splat+delobj.
 * Named omissions: costly_alteration COST_SPLAT shop bill; invent-array
 * wiring when splitobj child is not pushed (quan>1 rare for wish).
 * @returns {number} ECMD_OK (C never spends a turn)
 */
async function use_cream_pie(obj) {
    const u = game.u || (game.u = {});
    const wasblind = Blind();
    const wascreamed = !!(u.ucreamed | 0);
    let several = false;
    let pie = obj;

    if ((pie.quan || 1) > 1) {
        several = true;
        const child = splitobj(pie, 1);
        if (child) {
            // C invent split leaves child free of parent stack; splice child in
            const inv = game.invent || [];
            const pidx = inv.indexOf(pie);
            if (pidx >= 0) inv.splice(pidx + 1, 0, child);
            else inv.push(child);
            child.where = pie.where;
            pie = child;
        }
    }

    if (u.Hallucination) {
        await pline('You give yourself a facial.');
    } else {
        const xn = xname(pie);
        await pline(
            `You immerse your ${body_part(FACE)} in ${
                several ? 'one of ' : ''
            }${several ? makeplural(the(xn)) : the(xn)}.`,
        );
    }

    if (can_blnd_cream_self(pie)) {
        const blindinc = rnd(25);
        u.ucreamed = (u.ucreamed | 0) + blindinc;
        make_blinded(BlindedTimeout() + blindinc, false);
        if (!Blind() || (Blind() && wasblind)) {
            await pline(
                `There's ${wascreamed ? 'more ' : ''}sticky goop all over your ${
                    body_part(FACE)}.`,
            );
        } else {
            await pline(
                `You can't see through all the sticky goop on your ${
                    body_part(FACE)}.`,
            );
        }
    }

    setnotworn(pie);
    // costly_alteration(COST_SPLAT) deferred — shop unpaid message only
    freeinv_pie(pie);
    delobj(pie); // obj_resists rn2(100) then extract+free
    return ECMD_OK;
}

/**
 * C ref: apply.c doapply() — getobj + LOCK_PICK/key/STETHOSCOPE + sack/bag
 * use_container + musical instruments (do_play_instrument) + cream pie.
 * Named omissions: nohands/capacity; retouch; do_break_wand; flip_through_book;
 * flip_coin; jelly; whip/grapple/blindfold/lenses; use_stone; use_pole/
 * use_pick_axe; traps; oil; BoT; most non-instrument tools.
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

    // C apply.c: WOODEN_FLUTE..DRUM_OF_EARTHQUAKE → do_play_instrument
    if (obj.otyp === WOODEN_FLUTE || obj.otyp === MAGIC_FLUTE
        || obj.otyp === TOOLED_HORN || obj.otyp === FROST_HORN
        || obj.otyp === FIRE_HORN || obj.otyp === WOODEN_HARP
        || obj.otyp === MAGIC_HARP || obj.otyp === BUGLE
        || obj.otyp === LEATHER_DRUM || obj.otyp === DRUM_OF_EARTHQUAKE) {
        const { do_play_instrument } = await import('./music.js');
        const { ECMD_TIME } = await import('./const.js');
        const res = await do_play_instrument(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case CREAM_PIE → use_cream_pie (D-0711)
    if (obj.otyp === CREAM_PIE) {
        const res = await use_cream_pie(obj);
        return res === ECMD_TIME;
    }

    // Other apply otyps deferred
    await pline("Sorry, I don't know how to use that.");
    return false;
}

/** C ref: apply.c rub_ok */
function rub_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || obj.otyp === BRASS_LANTERN || is_graystone(obj)
        || obj.otyp === LUMP_OF_ROYAL_JELLY) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_EXCLUDE;
}

function rub_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && rub_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/**
 * C ref: invent.c getobj("rub", rub_ok) — also consumes CMDQ_KEY from
 * game._cmdq_canned when dorub re-queues after wield_tool.
 */
async function getobj_rub() {
    // C getobj: cmdq_pop CMDQ_KEY before interactive prompt
    const q = game._cmdq_canned;
    if (q?.length) {
        const head = q[0];
        if (head && typeof head === 'object' && head.typ === 'key') {
            q.shift();
            const ch = String.fromCharCode(head.key);
            for (const o of game.invent || []) {
                if (o.invlet === ch && rub_ok(o) === GETOBJ_SUGGEST) return o;
            }
            game._cmdq_canned = [];
            return null;
        }
    }

    const raw = rub_suggest_lets();
    if (!raw) {
        await pline("You don't have anything to rub.");
        return null;
    }
    for (;;) {
        await flush_topl_more();
        const lets = raw.length > 5 ? compactify_invlets(raw) : raw;
        const query = `What do you want to rub? [${lets} or ?*]`;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        if (key === 27) return null;
        const ch = String.fromCharCode(key);
        if (ch === '?' || ch === '*') {
            // menu listing deferred — re-prompt
            continue;
        }
        for (const o of game.invent || []) {
            if (o.invlet === ch && rub_ok(o) === GETOBJ_SUGGEST) return o;
        }
        await pline(`You don't have that object.`);
    }
}

/** C ref: cmd.c cmdq_add_ec / cmdq_add_key for dorub re-queue after wield. */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}
function cmdq_add_key(ch) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    const key = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    game._cmdq_canned.push({ typ: 'key', key });
}

/**
 * C ref: apply.c dorub — #rub lamp/stone/jelly.
 * Named omissions: use_stone / use_royal_jelly; djinni_from_bottle / begin_burn
 * full lamp transform; check_unpaid_usage; Blind smoke wording uses see/smell.
 * @returns {number} ECMD_*
 */
export async function dorub() {
    const youdata = game.youmonst?.data;
    if (youdata && nohands(youdata)) {
        await pline("You aren't able to rub anything without hands.");
        return ECMD_OK;
    }
    const obj = await getobj_rub();
    if (!obj) return ECMD_CANCEL;

    if (obj.oclass === GEM_CLASS || obj.oclass === FOOD_CLASS) {
        // use_stone / use_royal_jelly deferred
        await pline("Sorry, I don't know how to use that.");
        return ECMD_OK;
    }

    const u = game.u || {};
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'rub')) {
            cmdq_add_ec(dorub);
            cmdq_add_key(obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    // now uwep is obj
    if (obj.otyp === MAGIC_LAMP) {
        if ((obj.spe | 0) > 0 && !rn2(3)) {
            // djinni_from_bottle / begin_burn / check_unpaid deferred
            obj.otyp = OIL_LAMP;
            obj.spe = 0;
            obj.age = rn1(500, 1000);
            makeknown(MAGIC_LAMP);
        } else if (rn2(2)) {
            const Blind = !!(u.Blind);
            await pline(`You ${Blind ? 'smell' : 'see a puff of'} smoke.`);
        } else {
            await pline(nothing_happens);
        }
    } else if (obj.otyp === BRASS_LANTERN) {
        await pline('Rubbing the electric lamp is not particularly rewarding.');
        await pline('Anyway, nothing exciting happens.');
    } else {
        await pline(nothing_happens);
    }
    return ECMD_TIME;
}
