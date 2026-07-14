// potion.js — Quaff / #dip commands (dodrink / dodip subset).
// C ref: potion.c dodrink, dopotion, peffects, peffect_oil, dodip;
//         invent.c getobj; fountain.c drinkfountain / dipfountain.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { POTION_CLASS, COIN_CLASS, objectNames } from './objects.js';
import { weight, obj_extract_self } from './mkobj.js';
import { A_WIS, A_DEX, A_CON, exercise } from './attrib.js';
import { makeknown } from './invent.js';
import { yn_function } from './getline.js';
import { doname, xname } from './objnam.js';
import { dipfountain, drinkfountain } from './fountain.js';
import {
    IS_FOUNTAIN, IS_SINK, IS_POOL,
    ECMD_TIME, ECMD_CANCEL,
    POTHIT_OTHER_THROW, KILLED_BY_AN,
} from './const.js';
import { hands_obj } from './weapon.js';
import { rn2, rnd, d } from './rng.js';
import { losehp, nomul, maybe_half_phys } from './hack.js';
import { cansee } from './vision.js';
import { mons } from './monsters.js';
import { PM_HUMAN } from './generated/monsters_data.js';
import { can_reach_floor } from './engrave.js';

const POT_OIL = objectNames.indexOf('POT_OIL');
const POT_ACID = objectNames.indexOf('POT_ACID');
const POT_SLEEPING = objectNames.indexOf('POT_SLEEPING');
const POT_PARALYSIS = objectNames.indexOf('POT_PARALYSIS');
const POT_CONFUSION = objectNames.indexOf('POT_CONFUSION');
const POT_BLINDNESS = objectNames.indexOf('POT_BLINDNESS');
const POT_BOOZE = objectNames.indexOf('POT_BOOZE');

const BOTTLENAMES = [
    'bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar', 'vial',
];
const HBOTTLENAMES = [
    'jug', 'pitcher', 'barrel', 'tin', 'bag', 'box', 'glass', 'beaker',
    'tumbler', 'vase', 'flowerpot', 'pan', 'thingy', 'mug', 'teacup',
    'teapot', 'keg', 'bucket', 'thermos', 'amphora', 'wineskin', 'parcel',
    'bowl', 'ampoule',
];

/** Invent letters of drinkable potions (C drink_ok → GETOBJ_SUGGEST). */
function drinkable_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (o.oclass === POTION_CLASS && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    return lets.join('');
}

/** Compact consecutive invent letters (C invent.c compactify). */
function compact_lets(lets) {
    if (!lets.length) return '';
    if (lets.length <= 5) return lets.join('');
    let out = lets[0];
    let runStart = lets[0];
    let prev = lets[0];
    for (let i = 1; i < lets.length; i++) {
        const ch = lets[i];
        if (ch.charCodeAt(0) === prev.charCodeAt(0) + 1) {
            prev = ch;
            continue;
        }
        if (prev !== runStart) {
            out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
                ? prev
                : `-${prev}`;
        }
        out += ch;
        runStart = prev = ch;
    }
    if (prev !== runStart) {
        out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
            ? prev
            : `-${prev}`;
    }
    return out;
}

/** C ref: potion.c dip_ok — suggest non-coin invent. */
function dippable_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (o.oclass === COIN_CLASS) continue;
        if (o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    return compact_lets(lets);
}

/**
 * C ref: invent.c getobj("drink", drink_ok, GETOBJ_NOFLAGS)
 * Called after fountain/sink prompts (or when menu_requested).
 */
async function getobj_drink() {
    const lets = drinkable_lets();
    const query = lets
        ? `What do you want to drink? [${lets} or ?*]`
        : 'What do you want to drink? [*]';
    const prompt = `${query} `;

    game._pending_message = prompt;
    const disp = game.nhDisplay;
    await flush_screen(1);
    if (disp?.setCursor) disp.setCursor(prompt.length, 0);

    const key = await nhgetch();
    const ch = String.fromCharCode(key);

    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        if (game.flags?.verbose !== false) await pline('Never mind.');
        return null;
    }
    if (ch === '?' || ch === '*') {
        await pline('Never mind.');
        return null;
    }

    const otmp = (game.invent || []).find(o => o.invlet === ch);
    if (!otmp) {
        await pline("You don't have that object.");
        return null;
    }
    if (otmp.oclass !== POTION_CLASS) {
        await pline('That is a silly thing to drink.');
        return null;
    }
    return otmp;
}

/** C ref: invent.c useup() — consume one from a stack / remove if gone. */
function useup(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        otmp.owt = weight(otmp);
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
}

/**
 * C ref: potion.c peffect_oil()
 * Lit/fire-resist and burn_away_slime paths deferred.
 */
async function peffect_oil(otmp) {
    let good_for_you = false;
    if (otmp.lamplit) {
        // C: likes_fire → refreshing; else burn face + losehp + burn_away_slime
        // Lit-oil body deferred (starting kit oil is unlit)
        await pline('That was smooth!');
    } else if (otmp.cursed) {
        await pline('This tastes like castor oil.');
    } else {
        await pline('That was smooth!');
    }
    exercise(A_WIS, good_for_you);
}

/**
 * C ref: potion.c healup — add HP; optional sick/blind cure.
 * Upolyd / make_blinded / make_deaf / make_sick bodies deferred when flags set.
 * Also available via zap.js for SPE_HEALING zapyourself (avoids import cycle).
 */
export function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;
    if (!u) return;
    if (nhp) {
        if (u.Upolyd) {
            u.mh = (u.mh ?? 0) + nhp;
            if (u.mh > (u.mhmax ?? 0)) {
                u.mhmax = (u.mhmax ?? 0) + nxtra;
                u.mh = u.mhmax;
            }
        } else {
            u.uhp = (u.uhp ?? 0) + nhp;
            if (u.uhp > (u.uhpmax ?? 0)) {
                u.uhpmax = (u.uhpmax ?? 0) + nxtra;
                u.uhp = u.uhpmax;
                if ((u.uhppeak ?? 0) < u.uhpmax) u.uhppeak = u.uhpmax;
            }
        }
    }
    if (cureblind) {
        u.ucreamed = 0;
        // make_blinded / make_deaf deferred
        u.Blinded = 0;
    }
    if (curesick) {
        // make_vomiting / make_sick deferred
        u.Sick = 0;
    }
}

/**
 * C ref: potion.c peffects() — POT_OIL only; other otyps named in C-JS-MAP.
 * Returns -1 to continue dopotion makeknown/useup; >=0 early ECMD
 * (0 = ECMD_OK without useup, matching C impossible/default return 0).
 */
async function peffects(otmp) {
    switch (otmp.otyp) {
    case POT_OIL:
        await peffect_oil(otmp);
        return -1;
    default:
        // Other peffect_* deferred — do not useup
        await pline('That potion is not implemented yet.');
        return 0;
    }
}

/**
 * C ref: potion.c dopotion()
 * Ghost/djinni bottle RNG, Hallucination peculiar-feeling, trycall deferred.
 */
async function dopotion(otmp) {
    otmp.in_use = true;
    const retval = await peffects(otmp);
    if (retval >= 0) return retval ? 1 : 0;

    const oc = game.objects?.[otmp.otyp];
    if (otmp.dknown && oc && !oc.oc_name_known) {
        discover_object(otmp.otyp, true, true);
        // more_experienced(0, 10) deferred
    }
    useup(otmp);
    return 1;
}

/**
 * C ref: potion.c dodrink() / #quaff
 * Fountain-at-feet yn → drinkfountain. Sink / underwater / Strangled /
 * milky-ghost / smoky-djinni deferred. Worn-stack split deferred
 * (starting oils are unworn).
 * @returns {number} ECMD_* — CANCEL on getobj abort; TIME after quaff
 */
export async function dodrink() {
    // C: Strangled → message, ECMD_OK (no turn) — deferred unless needed
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const here = loc?.typ ?? 0;

    // C: !menu_requested → fountain / sink / underwater prompts first
    if (!game.iflags?.menu_requested) {
        if (IS_FOUNTAIN(here) && can_reach_floor(false)) {
            if ((await yn_function('Drink from the fountain?', 'yn', 'n')) === 'y') {
                await drinkfountain();
                return ECMD_TIME;
            }
            // drink_ok_extra++ deferred (affects getobj empty-suggest only)
        }
        // sink / underwater prompts deferred
    }

    const otmp = await getobj_drink();
    if (!otmp) return ECMD_CANCEL;

    otmp.in_use = true;
    // milky/smoky occupant paths deferred (no RNG when descr unmatched)
    return dopotion(otmp);
}

/**
 * C ref: invent.c getobj("dip", dip_ok / dip_hands_ok, GETOBJ_PROMPT)
 * Hands `-` only when Glib (dip_hands_ok); otherwise invent letters.
 * Loop on missing letter.
 */
async function getobj_dip(at_here) {
    void at_here; // Glib hands suggest deferred
    for (;;) {
        await flush_topl_more();
        const lets = dippable_lets();
        const query = lets
            ? `What do you want to dip? [${lets} or ?*]`
            : 'What do you want to dip? [*]';
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
        if (ch === '-') {
            // hands only meaningful with Glib; still accept letter
            game._pending_message = '';
            return hands_obj;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (otmp.oclass === COIN_CLASS) {
            await pline('You cannot dip that!');
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: potion.c dodip — #dip
 * Branch envelope: fountain-at-feet yn → dipfountain.
 * Deferred: sink/pool dips, potion_dip alchemy, m-prefix skip floor,
 * inaccessible_equipment, can_reach_floor false.
 * @returns {number} ECMD_*
 */
export async function dodip() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const here = loc?.typ ?? 0;
    const at_fountain = IS_FOUNTAIN(here);
    const at_sink = IS_SINK(here);
    const at_pool = IS_POOL(here);
    const at_here = !game.iflags?.menu_requested
        && (at_pool || at_fountain || at_sink);

    const obj = await getobj_dip(at_here);
    if (!obj) return ECMD_CANCEL;
    // inaccessible_equipment deferred

    const is_hands = obj === hands_obj;
    const shortestname = (is_hands || (obj.quan | 0) !== 1) ? 'them' : 'it';
    const obuf = is_hands
        ? 'your hands'
        : doname(obj);

    if (!game.iflags?.menu_requested) {
        // can_reach_floor deferred — assume reachable when not levitating
        if (u.Levitation) {
            // leave floor prompts; potion getobj path deferred
        } else if (at_fountain) {
            const q = `Dip ${game.flags?.verbose !== false ? obuf : shortestname} into the fountain?`;
            if ((await yn_function(q, 'yn', 'n')) === 'y') {
                if (!is_hands) obj.pickup_prev = 0;
                await dipfountain(obj);
                return ECMD_TIME;
            }
            // drink_ok_extra++ then potion getobj — deferred cancel
            return ECMD_CANCEL;
        } else if (at_sink || at_pool) {
            // dipsink / pool dip deferred
            return ECMD_CANCEL;
        }
    }

    // potion_dip getobj deferred
    await pline('Never mind.');
    return ECMD_CANCEL;
}

/** C ref: potion.c bottlename — ROLL_FROM bottlenames / hbottlenames. */
function bottlename() {
    const u = game.u || {};
    const hallu = !!(u.Hallucination || u.HHallucination);
    const names = hallu ? HBOTTLENAMES : BOTTLENAMES;
    return names[rn2(names.length)];
}

/**
 * C ref: potion.c potionbreathe — vapor on hero (thrown-potion distance 0).
 * Envelope: paralysis / sleeping / confusion / blindness / acid exercise.
 * Other otyps and towel / Free_action resist msgs deferred partially.
 */
function potionbreathe(obj) {
    const u = game.u || {};
    const Free_action = !!(u.Free_action || u.HFree_action || u.EFree_action);
    const Sleep_resistance = !!(u.HSleep_resistance || u.ESleep_resistance);
    let kn = 0;

    switch (obj.otyp) {
    case POT_CONFUSION:
    case POT_BOOZE:
        pline('You feel somewhat dizzy.');
        // make_confused body deferred — set Confusion timeout stub
        u.Confusion = (u.Confusion | 0) + rnd(5);
        break;
    case POT_PARALYSIS:
        kn++;
        if (!Free_action) {
            pline('Something seems to be holding you.');
            nomul(-rnd(5));
            game.multi_reason = 'frozen by a potion';
            game.nomovemsg = 'You can move again.';
            exercise(A_DEX, false);
        } else {
            pline('You stiffen momentarily.');
        }
        break;
    case POT_SLEEPING:
        kn++;
        if (!Free_action && !Sleep_resistance) {
            pline('You feel rather tired.');
            nomul(-rnd(5));
            game.multi_reason = 'sleeping off a magical draught';
            game.nomovemsg = 'You can move again.';
            exercise(A_DEX, false);
        } else {
            pline('You yawn.');
            // monstseesu(M_SEEN_SLEEP) deferred
        }
        break;
    case POT_BLINDNESS:
        kn++;
        // make_blinded deferred — brief Blind stub
        if (!(u.Blind || u.ublind)) pline('It suddenly gets dark.');
        u.Blinded = (u.Blinded | 0) + rnd(5);
        break;
    case POT_ACID:
        exercise(A_CON, false);
        break;
    default:
        break;
    }

    // C: if (obj->dknown) { kn ? makeknown : trycall }
    if (obj.dknown) {
        if (kn) makeknown(obj.otyp);
        // trycall deferred when !kn
    }
}

/**
 * C ref: potion.c potionhit — hero-hit path (mon == null → youmonst).
 * Monster-target / saddle / shop unpaid deferred.
 * @param {object|null} mon null = hero
 * @param {object} obj potion missile (consumed)
 * @param {number} how POTHIT_*
 */
export async function potionhit(mon, obj, how) {
    const isyou = mon == null;
    if (!isyou) {
        // Monster-target potionhit deferred — destroy missile via obfree
        obj_extract_self(obj);
        obj.quan = 0;
        obj.where = 0;
        return;
    }

    const botlnam = bottlename();
    const u = game.u || {};
    // C: pline blocks through --More-- while m_throw tmp_at flash still shows
    await pline(`The ${botlnam} crashes on your head and breaks into shards.`);
    const killer = (how === POTHIT_OTHER_THROW)
        ? 'propelled potion'
        : 'thrown potion';
    losehp(maybe_half_phys(rnd(2)), killer, KILLED_BY_AN);

    if (obj.otyp !== POT_OIL && cansee(u.ux, u.uy)) {
        // C: pline("%s.", Tobjnam(obj, "evaporate"))
        await pline(`The ${xname(obj)} evaporates.`);
    }

    if (obj.otyp === POT_ACID) {
        const Acid_resistance = !!(u.HAcid_resistance || u.EAcid_resistance);
        if (!Acid_resistance) {
            const burn = obj.blessed ? ' a little' : obj.cursed ? ' a lot' : '';
            await pline(`This burns${burn}!`);
            const dmg = d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
            losehp(maybe_half_phys(dmg), 'potion of acid', KILLED_BY_AN);
        }
    }
    // POT_OIL explode / POLYMORPH deferred

    // distance == 0 for hero hit → always breathe if humanoid eyes/breath
    // breathless/haseyes deferred — human start always qualifies
    void mons(PM_HUMAN);
    potionbreathe(obj);

    // C: obfree — no obj_resists (delobj would burn rn2(100))
    game._thrownobj = null;
    obj_extract_self(obj);
    obj.quan = 0;
    obj.where = 0; // OBJ_FREE
}

