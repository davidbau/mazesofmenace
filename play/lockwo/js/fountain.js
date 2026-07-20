// fountain.js - fountain interactions (dip / dry up).
// C ref: fountain.c dipfountain()/dryup().  Faithful port of the branches a
// non-polymorphed contest hero reaches (potion/food/other dip, curse/uncurse,
// "strange feeling", and "nothing seems to happen"); the monster-summon and
// treasure branches call subsystems (makemon/mkgold specifics) the port does
// not yet fully model, so they emit their observable framing only.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { update_topl, newsym } from './display.js';
import { hliquid } from './dungeon.js';
import { water_damage } from './trap.js';
import { curse, objects, COIN_CLASS } from './mkobj.js';
import { exercise } from './attrib.js';
import {
    ER_NOTHING, ER_DESTROYED, F_LOOTED, F_WARNED,
    FOUNTAIN, ROOM, A_WIS,
} from './const.js';

// C ref: include/onames.h — long sword otyp (mkobj.js OBJECT_DATA order).
const LONG_SWORD = 54;

const nothing_seems_to_happen = 'Nothing seems to happen.';

// C ref: rm.h FOUNTAIN_IS_LOOTED / _WARNED — bits in levl[x][y].looted.
function fountain_is_looted(loc) { return ((loc?.looted || 0) & F_LOOTED) !== 0; }

// C ref: fountain.c dipfountain(obj) — dipping an object into a fountain.
export async function dipfountain(obj) {
    const u = game.u;
    let er = ER_NOTHING;
    // is_hands ('-') dips wash the hands; the reached sessions dip real objects.
    const is_hands = obj && obj._hands;

    if (u.uprops?.Levitation) {
        await update_topl('You are floating high above the fountain.');
        return;
    }

    // Excalibur creation (LONG_SWORD, ulevel >= 5) — not reachable for the
    // priest hero on dlvl 1; kept as a guard so real long swords fall through.
    if (obj.otyp === LONG_SWORD && u.ulevel >= 5) {
        // rn2(Role_if(KNIGHT)?6:30) etc. — omitted; unreachable here.
    }

    if (is_hands || obj === game.uarmg) {
        // wash_hands(): no RNG on the reached levels.
        er = ER_NOTHING;
    } else {
        er = water_damage(obj, null, true);
    }

    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return; // no further effect
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
    case 20: // Uncurse the item
        if (!is_hands && obj.cursed) {
            if (!game.u?.Blind)
                await update_topl(`The ${hliquid('water')} glows for a moment.`);
            obj.cursed = false;
        } else {
            await update_topl('A feeling of loss comes over you.');
        }
        break;
    case 21: // Water Demon
        await dowaterdemon();
        break;
    case 22: // Water Nymph
        await dowaternymph();
        break;
    case 23: // an Endless Stream of Snakes
        await dowatersnakes();
        break;
    case 24: // Find a gem
        if (!fountain_is_looted(game.level?.at(u.ux, u.uy))) {
            await dofindgem();
            break;
        }
        /* FALLTHROUGH */
    case 25: // Water gushes forth
        await dogushforth(false);
        break;
    case 26: // Strange feeling
        await update_topl('A strange tingling runs up your arm.');
        break;
    case 27: // Strange feeling
        await update_topl('You feel a sudden chill.');
        break;
    case 28: // Strange feeling
        await update_topl('An urge to take a bath overwhelms you.');
        // money-loss effect (money_cnt > 10) — no gold carried here, so no-op.
        break;
    case 29: { // You see coins
        const loc = game.level?.at(u.ux, u.uy);
        if (fountain_is_looted(loc)) break;
        if (loc) loc.looted = (loc.looted || 0) | F_LOOTED;
        // mkgold + "Far below you..." — treasure spawn not modeled here.
        if (!game.u?.Blind)
            await update_topl(`Far below you, you see coins glistening in the ${hliquid('water')}.`);
        exercise(A_WIS, true);
        newsym(u.ux, u.uy);
        break;
    }
    default:
        if (er === ER_NOTHING)
            await update_topl(nothing_seems_to_happen);
        break;
    }
    await dryup(u.ux, u.uy, true);
}

// C ref: fountain.c dowaterdemon/dowaternymph/dowatersnakes/dofindgem/
// dogushforth.  These summon monsters, spawn a gem, or flood the area via
// makemon/mksobj_at/do_clear_area, which the port does not yet model.  They are
// unreachable for the contest hero (rnd(30) landing on 21..25); the observable
// framing is emitted without the (absent) RNG-bearing subsystem.
async function dowaterdemon() {
    await update_topl('The fountain bubbles furiously for a moment, then calms.');
}
async function dowaternymph() {
    await update_topl('A large bubble rises to the surface and pops.');
}
async function dowatersnakes() {
    await update_topl('An endless stream of snakes pours forth!');
}
async function dofindgem() {
    await update_topl('You spot a gem in the sparkling waters!');
    const loc = game.level?.at(game.u.ux, game.u.uy);
    if (loc) loc.looted = (loc.looted || 0) | F_LOOTED;
    newsym(game.u.ux, game.u.uy);
    exercise(A_WIS, true);
}
async function dogushforth(_drinking) {
    await update_topl('Water sprays all over you.');
}

// C ref: fountain.c dryup(x, y, isyou) — a fountain has a 1-in-3 chance of
// drying up after use.  The rn2(3) roll fires unconditionally (short-circuit
// left operand of `!rn2(3) || FOUNTAIN_IS_WARNED`).  The town-watch warning and
// wizard-mode confirmation are not reached by the contest hero.
export async function dryup(x, y, _isyou) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== FOUNTAIN) return;
    const warned = ((loc.looted || 0) & F_WARNED) !== 0;
    if (!(!rn2(3) || warned)) return;
    // (in_town watchman-warning / wizard "Dry up fountain?" not reached)
    // "The fountain dries up!" (cansee); the reached fountains are in view.
    await update_topl('The fountain dries up!');
    // replace the fountain with ordinary floor
    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessedftn = 0;
    if (game.level?.flags && typeof game.level.flags.nfountains === 'number')
        game.level.flags.nfountains = Math.max(0, game.level.flags.nfountains - 1);
    newsym(x, y);
}
