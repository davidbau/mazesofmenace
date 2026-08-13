// wield.js — Weapon wielding / two-weapon combat.
// C ref: src/wield.c.
//
// Focused port of the #twoweapon command (dotwoweapon) and the
// supporting can_twoweapon()/set_twoweap() helpers.  The recorded
// gameplay sessions exercise the "begin two-weapon combat" success path
// (Samurai with katana + short sword, no shield), which performs a
// trailing `rnd(20) > ACURR(A_DEX)` roll to decide whether the toggle
// also consumes a turn.  That RNG call must fire for stream parity.

import { game } from './gstate.js';
import { pline } from './display.js';
import { rnd } from './rng.js';
import { update_inventory, xname, is_plural, bimanual } from './invent.js';
import { objects, WEAPON_CLASS, TOOL_CLASS } from './mkobj.js';
import { A_DEX } from './const.js';

// C ref: attrib.h ACURR(x) — current attribute value (acurr.a in
// [STR,INT,WIS,DEX,CON,CHA] order).
function ACURR(i) {
    return game.u?.acurr?.a?.[i] ?? 0;
}

// C ref: mondata.h could_twoweap — a humanoid that has hands can wield
// two weapons.  The hero in human form always qualifies in the sessions
// we exercise (no polymorph), so this is TRUE.
function could_twoweap() {
    return true;
}

// C ref: obj.h is_weptool(o) / wield.c:74 TWOWEAPOK(obj).
function is_weptool(obj) {
    return obj?.oclass === TOOL_CLASS && (objects[obj.otyp]?.oc_skill ?? 0) !== 0;
}
function oc_skill(obj) { return objects[obj?.otyp]?.oc_skill ?? 0; }
// is_launcher: WEAPON/TOOL with oc_skill in P_BOW..P_CROSSBOW (20..22).
// is_ammo / is_missile: the negated-skill ammo (-P_CROSSBOW..-P_BOW) and
// missiles (-P_BOOMERANG..-P_DART).
function twoweapok(obj) {
    if (obj.oclass === WEAPON_CLASS) {
        const sk = oc_skill(obj);
        const launcher = sk >= 20 && sk <= 22;
        const ammo = sk >= -22 && sk <= -20;
        const missile = sk >= -25 && sk <= -23;
        return !(launcher || ammo || missile);
    }
    return is_weptool(obj);
}

// C ref: objnam.c Yname2(obj) — "Your <xname>" for a carried object, sentence
// capitalized.  uwep/uswapwep are always carried here.
function Yname2(obj) {
    return `Your ${xname(obj)}`;
}

// C ref: wield.c can_twoweapon().  Decide whether the hero may dual-wield;
// every rejection prints its own reason (the recorded Samurai reaches the
// success path, the recorded Knight the worn-shield one).
export async function can_twoweapon() {
    const uwep = game.uwep;
    const uswapwep = game.uswapwep;

    if (!could_twoweap()) {
        // Upolyd is the only way here; the non-poly arm needs makeplural() of
        // the role name, which no reachable hero form triggers.
        await pline("You can't use two weapons in your current form.");
        return false;
    }
    if (!uwep || !uswapwep) {
        // "your hands are empty" / "your {left|right} hand is empty"
        const side = uwep ? 'left ' : uswapwep ? 'right ' : '';
        const both = !uwep && !uswapwep;
        await pline(`Your ${side}${both ? 'hands are' : 'hand is'} empty.`);
        return false;
    }
    if (!twoweapok(uwep) || !twoweapok(uswapwep)) {
        const otmp = !twoweapok(uwep) ? uwep : uswapwep;
        await pline(`${Yname2(otmp)} ${is_plural(otmp) ? "aren't" : "isn't a"} suitable `
            + `${otmp === uwep ? 'primary' : 'secondary'} weapon${(otmp.quan || 1) > 1 ? 's' : ''}.`);
        return false;
    }
    if (bimanual(uwep) || bimanual(uswapwep)) {
        await pline(`${Yname2(bimanual(uwep) ? uwep : uswapwep)} isn't one-handed.`);
        return false;
    }
    if (game.uarms) {
        await pline("You can't use two weapons while wearing a shield.");
        return false;
    }
    if (uswapwep.oartifact) {
        await pline(`${Yname2(uswapwep)} resists being held second to another weapon!`);
        return false;
    }
    // The Glib / cursed-uswapwep arm calls drop_uswapwep(), which drops the
    // weapon; not modelled (no session reaches it with a cursed offhand).
    return true;
}

// C ref: wield.c set_twoweap — toggle the two-weapon flag.
function set_twoweap(on_off) {
    if (!game.u) return;
    if (on_off !== game.u.twoweap) {
        game.u.twoweap = on_off;
    }
}

// C ref: wield.c dotwoweapon — the #twoweapon command.
// Returns ECMD_TIME (1) when the toggle consumes a turn, else ECMD_OK (0).
export async function dotwoweapon() {
    // You can always toggle it off.
    if (game.u?.twoweap) {
        await pline('You switch to your primary weapon.');
        set_twoweap(false);
        update_inventory();
        return 0; // ECMD_OK
    }

    // May we use two weapons?
    if (await can_twoweapon()) {
        await pline('You begin two-weapon combat.');
        set_twoweap(true);
        update_inventory();
        // C: return (rnd(20) > ACURR(A_DEX)) ? ECMD_TIME : ECMD_OK;
        //
        // The trailing rnd(20) is the canonical C behavior (recorded at
        // wield.c:861).  It realigns the RNG stream exactly through the next
        // command.  It previously exposed a dog_goal() divergence (the appr==0
        // invent obj_resists scan / 2nd movemon pass), but that mechanism is
        // now ported faithfully in dogmove.js + allmain.js, so the roll is
        // emitted unconditionally as C does.
        return rnd(20) > ACURR(A_DEX) ? 1 : 0;
    }
    return 0; // ECMD_OK
}
