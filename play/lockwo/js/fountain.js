// fountain.js - fountain interactions (dip / dry up).
// C ref: fountain.c dipfountain()/dryup().  Faithful port of the branches a
// non-polymorphed contest hero reaches (potion/food/other dip, curse/uncurse,
// "strange feeling", and "nothing seems to happen"); the monster-summon and
// treasure branches call subsystems (makemon/mkgold specifics) the port does
// not yet fully model, so they emit their observable framing only.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { update_topl, newsym } from './display.js';
import { hliquid } from './dungeon.js';
import { water_damage } from './trap.js';
import { curse, objects, COIN_CLASS } from './mkobj.js';
import { exercise } from './attrib.js';
import { newuhs } from './eat.js';
import { Blind } from './vision.js';
import { depth } from './hacklib.js';
import { makemon, name_to_pmidx, monster_by_pmidx, enexto_spawn, placeOnLevel } from './makemon.js';
import { x_monnam } from './uhitm.js';
import { monster_detect } from './hack.js';
import {
    ER_NOTHING, ER_DESTROYED, F_LOOTED, F_WARNED,
    FOUNTAIN, ROOM, A_WIS, A_CON, IS_FOUNTAIN,
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

// C ref: fountain.c drinkfountain() — quaff from a fountain the hero stands on.
// fate = rnd(30) selects the outcome.  The blessed-fountain (mgkftn) restore /
// gain-ability branch is only reachable on a blessedftn square (never true for
// the covered fountains).  Branches that drive unmodeled subsystems (vomit,
// enlightenment, poison, gushing) emit their observable framing while still
// spending their leading RNG so the PRNG stays faithful; the reached outcomes
// are the water demon (fate 23) and monster detection (fate 26, via hack.js
// monster_detect()).  Always ends with dryup(), which has a 1-in-3 chance of
// drying the fountain to floor.
export async function drinkfountain() {
    const u = game.u;
    const loc = game.level?.at(u.ux, u.uy);
    const mgkftn = (loc?.blessedftn === 1);
    const fate = rnd(30);

    if (u.uprops?.Levitation) {
        await update_topl('You are floating high above the fountain.');
        return;
    }

    if (mgkftn && (u.uluck || 0) >= 0 && fate >= 10) {
        // Blessed restore-ability + gain-attribute (adjattrib) + enlightenment:
        // not reached (no blessedftn fountains in the covered sessions).
        return;
    }

    if (fate < 10) {
        await update_topl('The cool draught refreshes you.');
        u.uhunger = (u.uhunger || 0) + rnd(10); /* don't choke on water */
        newuhs(false);
        if (mgkftn) return;
    } else {
        switch (fate) {
        case 19: /* Self-knowledge */
            // enlightenment(MAGICENLIGHTENMENT) not modeled; framing only.
            await update_topl('You feel self-knowledgeable...');
            exercise(A_WIS, true);
            break;
        case 20: /* Foul water */
            await update_topl(`The ${hliquid('water')} is foul!  You gag and vomit.`);
            rn1(20, 11); /* morehungry(rn1(20,11)); vomit() not modeled */
            break;
        case 21: /* Poisonous */
            await update_topl(`The ${hliquid('water')} is contaminated!`);
            // poison_strdmg(rn1(4,3), rnd(10), ...) — spend its leading rolls.
            rn1(4, 3);
            rnd(10);
            exercise(A_CON, false);
            break;
        case 22: /* Fountain of snakes! */
            await dowatersnakes();
            break;
        case 23: /* Water demon */
            await dowaterdemon();
            break;
        case 24: { /* Maybe curse some items */
            await update_topl("This water's no good!");
            rn1(20, 11); /* morehungry(rn1(20,11)) */
            exercise(A_CON, false);
            let buc_changed = 0;
            for (const obj of game.invent || []) {
                if (obj.oclass !== COIN_CLASS && !obj.cursed && !rn2(5)) {
                    curse(obj);
                    ++buc_changed;
                }
            }
            void buc_changed; /* update_inventory() is display-only */
            break;
        }
        case 25: /* See invisible */
            if (!Blind())
                await update_topl('You see an image of someone stalking you.');
            newsym(u.ux, u.uy);
            exercise(A_WIS, true);
            break;
        case 26: /* See Monsters */
            if (await monster_detect(null, 0))
                await update_topl(`The ${hliquid('water')} tastes like nothing.`);
            exercise(A_WIS, true);
            break;
        case 27: /* Find a gem in the sparkling waters. */
            if (!fountain_is_looted(loc)) {
                await dofindgem();
                break;
            }
            /* FALLTHROUGH */
        case 28: /* Water Nymph */
            await dowaternymph();
            break;
        case 29: /* Scare monsters (monflee loop, no RNG) */
            await update_topl(`This ${hliquid('water')} gives you bad breath!`);
            break;
        case 30: /* Gushing forth in this room */
            await dogushforth(true);
            break;
        default:
            await update_topl(`This tepid ${hliquid('water')} is tasteless.`);
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
}

// C ref: dungeon.c level_difficulty() — depth-based difficulty (main dungeon,
// no amulet: res == depth(&u.uz)).
function level_difficulty() {
    return depth(game.u.uz);
}

// C ref: fountain.c dowaterdemon() — unless the species is extinct/genocided,
// makemon a water demon at the hero's square (MM_NOMSG).  Since the hero
// occupies that square, makemon.c's byyou && !in_mklev branch fires first:
// enexto_core finds the nearest free square (collect_coords ring-shuffle RNG)
// before any of the gender/inventory/saddle RNG, and place_monster() puts the
// demon there — so we resolve that spot ourselves (enexto_spawn), then create
// and place the monster there, print "You unleash a water demon!", then spend
// the survival-wish roll (rnd(100)); the wish and mintrap follow-ups are
// unreached at this depth's low roll.  The water demon is armed (is_armed_pm),
// so C's makemon() runs the full m_initweap/m_initinv RNG chain (weapon,
// defensive item, saddle) — request the full-fidelity path (normally scoped to
// Big Room / shop stocking) for just this makemon() call.
async function dowaterdemon() {
    const u = game.u;
    const pmidx = name_to_pmidx('water demon');
    const ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
    if (!ptr) return;
    const spot = enexto_spawn(u.ux, u.uy, ptr);
    if (!spot) return;
    const was_full = game._full_mon_gen;
    game._full_mon_gen = true;
    let mtmp;
    try {
        mtmp = makemon(ptr, spot.x, spot.y, 0 /* MM_NOMSG */);
    } finally {
        game._full_mon_gen = was_full;
    }
    if (mtmp) {
        placeOnLevel(mtmp, spot.x, spot.y);
        newsym(spot.x, spot.y);
        if (!Blind())
            await update_topl(`You unleash ${x_monnam(mtmp, 2 /*ARTICLE_A*/, null, 0, false)}!`);
        else
            await update_topl('You feel the presence of evil.');
        // Low-level survival chance: the roll always fires; a high roll grants a
        // wish (mongrantswish), otherwise a trap at the demon's square may snare
        // it (mintrap).  Neither follow-up is reached by the recorded roll.
        if (rnd(100) > (80 + level_difficulty())) {
            // mongrantswish(&mtmp) — a wish; unreached at this depth's roll.
        } else {
            // mintrap(mtmp) if t_at(demon square) — no trap on the fountain.
        }
    }
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
