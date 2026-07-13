// fountain.js — Fountain dryup / dip effects.
// C ref: fountain.c dryup, dipfountain (fountain-at-feet subset).
//
// Branch envelope: water_damage ER_NOTHING → switch case 16 (curse) /
// default (nothing_seems_to_happen) → dryup rn2(3) gate.
// Deferred: Excalibur LONG_SWORD body (gate+rn2 order preserved),
// wash_hands, cases 17–29, town warn / angry_guards, wizard yn,
// FOUNTAIN_IS_WARNED force dryup.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { pline, newsym } from './display.js';
import { curse } from './mkobj.js';
import { water_damage } from './trap.js';
import { COIN_CLASS, objectNames } from './objects.js';
import {
    ROOM, IS_FOUNTAIN,
    ER_NOTHING, ER_DESTROYED,
    F_WARNED,
    nothing_seems_to_happen,
} from './const.js';
import { hands_obj } from './weapon.js';
import { PM_KNIGHT } from './generated/monsters_data.js';

const LONG_SWORD = objectNames.indexOf('LONG_SWORD');

/** C ref: rm.h FOUNTAIN_IS_WARNED */
function FOUNTAIN_IS_WARNED(x, y) {
    const loc = game.level?.at(x, y);
    return !!((loc?.looted || 0) & F_WARNED);
}

/** C ref: fountain.c floating_above */
async function floating_above(what) {
    await pline(`You are floating high above the ${what}.`);
}

/**
 * C ref: fountain.c dryup
 * Town warn / wizard yn / angry_guards deferred.
 */
export async function dryup(x, y, isyou) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_FOUNTAIN(loc.typ)) return;
    if (!(!rn2(3) || FOUNTAIN_IS_WARNED(x, y))) return;

    await pline('The fountain dries up!');
    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessedftn = 0;
    if (game.level?.flags && (game.level.flags.nfountains | 0) > 0) {
        game.level.flags.nfountains--;
    }
    newsym(x, y);
    void isyou;
}

/**
 * C ref: fountain.c dipfountain
 * @param {object} obj invent object or hands_obj
 */
export async function dipfountain(obj) {
    const u = game.u || {};
    if (u.Levitation) {
        await floating_above('fountain');
        return;
    }

    const is_hands = obj === hands_obj;

    // C && order: otyp, ulevel, rn2, quan, !oartifact, !exist_artifact
    if (obj && obj.otyp === LONG_SWORD && (u.ulevel | 0) >= 5
        && !rn2(game.urole?.mnum === PM_KNIGHT ? 6 : 30)
        && (obj.quan | 0) === 1 && !obj.oartifact) {
        // exist_artifact stub: assume none — Excalibur body deferred
        await dryup(u.ux, u.uy, true);
        return;
    }

    let er = ER_NOTHING;
    if (is_hands || obj === u.uarmg) {
        // wash_hands deferred — ER_NOTHING (no RNG)
        er = ER_NOTHING;
    } else {
        er = water_damage(obj, null, true);
    }

    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return;
    }

    switch (rnd(30)) {
    case 16: // Curse the item
        if (!is_hands && obj.oclass !== COIN_CLASS && !obj.cursed) {
            curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20:
    case 21:
    case 22:
    case 23:
    case 24:
    case 25:
    case 26:
    case 27:
    case 28:
    case 29:
        // Uncurse / demon / nymph / snakes / gem / gush / feelings /
        // bath / coins — deferred
        break;
    default:
        if (er === ER_NOTHING) {
            await pline(nothing_seems_to_happen);
        }
        break;
    }
    await dryup(u.ux, u.uy, true);
}
