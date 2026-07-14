// fountain.js — Fountain dryup / dip / drink effects.
// C ref: fountain.c dryup, dipfountain, drinkfountain, dofindgem.
//
// Branch envelope (drinkfountain): fate=rnd(30) before Levitation;
// mgkftn restore+adjattrib; fate<10 refresh; switch default/19–30
// message+RNG arms; case 27 dofindgem when !FOUNTAIN_IS_LOOTED.
// Deferred: dowatersnakes/demon/nymph (incl. case 27 fallthrough when
// looted), dogushforth, monster_detect body, enlightenment body,
// vomit body, town warn/angry_guards, wizard yn, FOUNTAIN_IS_WARNED
// force dryup, Excalibur LONG_SWORD body, wash_hands, dipfountain
// cases 17–23/25–29.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline, newsym, You_feel, flush_topl_more } from './display.js';
import { curse, mksobj_at, rnd_class } from './mkobj.js';
import { water_damage } from './trap.js';
import { COIN_CLASS, objectNames } from './objects.js';
import {
    ROOM, IS_FOUNTAIN,
    ER_NOTHING, ER_DESTROYED,
    F_LOOTED, F_WARNED, FROMOUTSIDE,
    nothing_seems_to_happen,
    KILLED_BY_AN,
} from './const.js';
import { hands_obj } from './weapon.js';
import { PM_KNIGHT } from './generated/monsters_data.js';
import { A_MAX, A_WIS, A_CON, adjattrib, exercise } from './attrib.js';
import { lesshungry, morehungry, poison_strdmg } from './eat.js';
import { losehp } from './hack.js';

const LONG_SWORD = objectNames.indexOf('LONG_SWORD');
const DILITHIUM_CRYSTAL = objectNames.indexOf('DILITHIUM_CRYSTAL');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');

/** C ref: rm.h FOUNTAIN_IS_WARNED */
function FOUNTAIN_IS_WARNED(x, y) {
    const loc = game.level?.at(x, y);
    return !!((loc?.looted || 0) & F_WARNED);
}

/** C ref: rm.h FOUNTAIN_IS_LOOTED / SET_FOUNTAIN_LOOTED */
function FOUNTAIN_IS_LOOTED(x, y) {
    const loc = game.level?.at(x, y);
    return !!((loc?.looted || 0) & F_LOOTED);
}

function SET_FOUNTAIN_LOOTED(x, y) {
    const loc = game.level?.at(x, y);
    if (loc) loc.looted = (loc.looted || 0) | F_LOOTED;
}

/**
 * C ref: fountain.c dofindgem — gem in sparkling waters.
 * mksobj_at(..., FALSE, FALSE): next_ident only (no mksobj_init).
 */
async function dofindgem() {
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    if (!Blind) {
        await pline('You spot a gem in the sparkling waters!');
    } else {
        await You_feel('a gem here!');
    }
    // C: rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1)
    mksobj_at(
        rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
        u.ux, u.uy,
        false, false,
    );
    SET_FOUNTAIN_LOOTED(u.ux, u.uy);
    newsym(u.ux, u.uy);
    exercise(A_WIS, true);
}

/** C ref: hacklib / potion.hliquid — Hallucination synonym deferred. */
function hliquid(waterword) {
    return waterword || 'water';
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
 * C ref: fountain.c drinkfountain — quaff while standing on a fountain.
 */
export async function drinkfountain() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const mgkftn = (loc?.blessedftn | 0) === 1;
    // C: fate = rnd(30) before Levitation check
    const fate = rnd(30);

    if (u.Levitation) {
        await floating_above('fountain');
        return;
    }

    if (mgkftn && (u.uluck | 0) >= 0 && fate >= 10) {
        const littleluck = (u.uluck | 0) < 4;
        await pline('Wow!  This makes you feel great!');
        // blessed restore ability
        for (let ii = 0; ii < A_MAX; ii++) {
            const base = u.acurr?.a?.[ii] | 0;
            const mx = u.amax?.a?.[ii] | 0;
            if (base < mx) {
                u.acurr.a[ii] = mx;
                if (!game.flags) game.flags = {};
                game.flags.botl = true;
            }
        }
        // gain ability; blessed if natural luck high
        let i = rn2(A_MAX);
        for (let ii = 0; ii < A_MAX; ii++) {
            if (await adjattrib(i, 1, littleluck ? -1 : 0) && littleluck) break;
            if (++i >= A_MAX) i = 0;
        }
        await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, FALSE)
        await pline('A wisp of vapor escapes the fountain...');
        exercise(A_WIS, true);
        if (loc) loc.blessedftn = 0;
        return;
    }

    if (fate < 10) {
        await pline('The cool draught refreshes you.');
        lesshungry(rnd(10)); // u.uhunger += rnd(10); newuhs deferred
        if (mgkftn) return;
    } else {
        switch (fate) {
        case 19: // Self-knowledge — enlightenment body deferred
            await You_feel('self-knowledgeable...');
            await flush_topl_more();
            // enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS) deferred
            exercise(A_WIS, true);
            await pline('The feeling subsides.');
            break;
        case 20: // Foul water
            await pline('The water is foul!  You gag and vomit.');
            morehungry(rn1(20, 11));
            // vomit() body deferred (no RNG when not polymorphed)
            break;
        case 21: { // Poisonous
            await pline('The water is contaminated!');
            const poisRes = !!(u.HPoison_resistance || u.EPoison_resistance
                || u.Poison_resistance);
            if (poisRes) {
                await pline(
                    'Perhaps it is runoff from the nearby fruit farm.',
                );
                losehp(rnd(4), 'unrefrigerated sip of juice', KILLED_BY_AN);
                break;
            }
            // clang LTR: poison_strdmg(rn1(4,3), rnd(10), ...)
            const strloss = rn1(4, 3);
            const dmg = rnd(10);
            await poison_strdmg(strloss, dmg);
            exercise(A_CON, false);
            break;
        }
        case 22: // Fountain of snakes — dowatersnakes deferred
            break;
        case 23: // Water demon — dowaterdemon deferred
            break;
        case 24: { // Maybe curse some items
            await pline("This water's no good!");
            morehungry(rn1(20, 11));
            exercise(A_CON, false);
            let buc_changed = 0;
            for (const obj of [...(game.invent || [])]) {
                if (obj.oclass !== COIN_CLASS && !obj.cursed && !rn2(5)) {
                    curse(obj);
                    buc_changed++;
                }
            }
            void buc_changed; // update_inventory deferred
            break;
        }
        case 25: // See invisible
            if (u.Blind || u.ublind) {
                if (u.HInvis || u.EInvis || u.Invis) {
                    await pline('You feel transparent.');
                } else {
                    await pline('You feel very self-conscious.');
                    await pline('Then it passes.');
                }
            } else {
                await pline('You see an image of someone stalking you.');
                await pline('But it disappears.');
            }
            u.HSee_invisible = (u.HSee_invisible || 0) | FROMOUTSIDE;
            newsym(u.ux, u.uy);
            exercise(A_WIS, true);
            break;
        case 26: // See Monsters — monster_detect body deferred
            exercise(A_WIS, true);
            break;
        case 27: // Find a gem in the sparkling waters
            if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
                await dofindgem();
                break;
            }
            // FALLTHROUGH — dowaternymph when already looted (deferred)
            /* falls through */
        case 28: // Water Nymph — dowaternymph deferred
            break;
        case 29: { // Scare
            await pline(`This ${hliquid('water')} gives you bad breath!`);
            for (const mtmp of game.fmon || []) {
                if (mtmp.mhp <= 0) continue;
                // monflee(mtmp, 0, FALSE, FALSE) — fleetime 0, no RNG
                mtmp.mflee = 1;
                mtmp.mfleetim = 0;
            }
            break;
        }
        case 30: // Gushing forth — dogushforth deferred
            break;
        default:
            await pline(`This tepid ${hliquid('water')} is tasteless.`);
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
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
        // Uncurse / demon / nymph / snakes — deferred
        break;
    case 24: // Find a gem
        if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
            await dofindgem();
            break;
        }
        // FALLTHROUGH — dogushforth when already looted (deferred)
        /* falls through */
    case 25:
    case 26:
    case 27:
    case 28:
    case 29:
        // Gush / feelings / bath / coins — deferred
        break;
    default:
        if (er === ER_NOTHING) {
            await pline(nothing_seems_to_happen);
        }
        break;
    }
    await dryup(u.ux, u.uy, true);
}
