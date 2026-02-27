// eat.js -- Eating mechanics
// cf. eat.c — doeat, start_eating, eatfood, bite, corpse intrinsics, hunger

import { rn2, rn1, rnd, d } from './rng.js';
import { nhgetch } from './input.js';
import { objectData, FOOD_CLASS, CORPSE, TRIPE_RATION, CLOVE_OF_GARLIC,
         TIN, EGG, FOOD_RATION, LEMBAS_WAFER, CRAM_RATION,
         MEAT_RING, MEATBALL, MEAT_STICK, ENORMOUS_MEATBALL,
         LUMP_OF_ROYAL_JELLY, EUCALYPTUS_LEAF, APPLE, PEAR,
         FORTUNE_COOKIE, CREAM_PIE, CANDY_BAR, PANCAKE, SPRIG_OF_WOLFSBANE,
         CARROT, K_RATION, C_RATION, SLIME_MOLD,
         FLESH, VEGGY } from './objects.js';
import { doname, next_ident } from './mkobj.js';
import { mons, PM_LIZARD, PM_LICHEN, PM_NEWT,
         PM_ACID_BLOB, PM_COCKATRICE, PM_CHICKATRICE,
         PM_LITTLE_DOG, PM_DOG, PM_LARGE_DOG,
         PM_KITTEN, PM_HOUSECAT, PM_LARGE_CAT,
         PM_WRAITH, PM_NURSE, PM_STALKER, PM_YELLOW_LIGHT,
         PM_GIANT_BAT, PM_BAT,
         PM_SMALL_MIMIC, PM_LARGE_MIMIC, PM_GIANT_MIMIC,
         PM_QUANTUM_MECHANIC, PM_CHAMELEON, PM_DOPPELGANGER,
         PM_SANDESTIN, PM_GENETIC_ENGINEER,
         PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER,
         PM_GREEN_SLIME, PM_DEATH, PM_PESTILENCE, PM_FAMINE,
         PM_DISPLACER_BEAST, PM_DISENCHANTER,
         PM_HUMAN_WERERAT, PM_HUMAN_WEREJACKAL, PM_HUMAN_WEREWOLF,
         PM_WERERAT, PM_WEREJACKAL, PM_WEREWOLF,
         PM_FLOATING_EYE, PM_RAVEN, PM_PYROLISK,
         PM_KILLER_BEE, PM_SCORPION, PM_VIOLET_FUNGUS,
         S_GOLEM, S_EYE, S_JELLY, S_PUDDING, S_BLOB, S_VORTEX,
         S_ELEMENTAL, S_FUNGUS, S_LIGHT, S_MIMIC,
         AT_MAGC, AD_STUN, AD_HALU,
         MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC,
         MR_POISON, MR_ACID, MR_STONE } from './monsters.js';
import { PM_CAVEMAN, RACE_ORC, RACE_ELF, RACE_DWARF,
         A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES,
         POISON_RES, ACID_RES, STONE_RES,
         TELEPORT, TELEPORT_CONTROL, TELEPAT, LAST_PROP,
         FROMOUTSIDE, INTRINSIC, TIMEOUT } from './config.js';
import { applyMonflee } from './mhitu.js';
import { obj_resists } from './objdata.js';
import { compactInvletPromptChars } from './invent.js';
import { pline, You, Your, You_feel, You_cant, pline_The, You_hear } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { pluslvl } from './exper.js';
import { is_rider, is_giant, acidic, poisonous, flesh_petrifies,
         vegan, vegetarian, carnivorous, herbivorous,
         is_humanoid, is_undead, attacktype, dmgtype,
         telepathic, can_teleport, control_teleport,
         noncorporeal, slimeproof, is_orc, is_elf, is_dwarf,
         type_is_pname } from './mondata.js';


// ============================================================
// 1. Data / constants
// ============================================================

// Hunger states (hack.h)
const SATIATED = 0;
const NOT_HUNGRY = 1;
const HUNGRY = 2;
const WEAK = 3;
const FAINTING = 4;
const FAINTED = 5;
const STARVED = 6;

// Hunger state name table (cf. eat.c hu_stat[])
const hu_stat = [
    'Satiated', '        ', 'Hungry  ', 'Weak    ',
    'Fainting', 'Fainted ', 'Starved '
];

// Tin variety constants
const SPINACH_TIN = -1;
const ROTTEN_TIN = 0;
const HOMEMADE_TIN = 1;

// Tin type table (cf. eat.c tintxts[])
const tintxts = [
    { txt: 'rotten', nut: -50, fodder: false, greasy: false },
    { txt: 'homemade', nut: 50, fodder: true, greasy: false },
    { txt: 'soup made from', nut: 20, fodder: true, greasy: false },
    { txt: 'french fried', nut: 40, fodder: false, greasy: true },
    { txt: 'pickled', nut: 40, fodder: true, greasy: false },
    { txt: 'boiled', nut: 50, fodder: true, greasy: false },
    { txt: 'smoked', nut: 50, fodder: true, greasy: false },
    { txt: 'dried', nut: 55, fodder: true, greasy: false },
    { txt: 'deep fried', nut: 60, fodder: false, greasy: true },
    { txt: 'szechuan', nut: 70, fodder: true, greasy: false },
    { txt: 'broiled', nut: 80, fodder: false, greasy: false },
    { txt: 'stir fried', nut: 80, fodder: false, greasy: true },
    { txt: 'sauteed', nut: 95, fodder: false, greasy: false },
    { txt: 'candied', nut: 100, fodder: true, greasy: false },
    { txt: 'pureed', nut: 500, fodder: true, greasy: false },
    { txt: '', nut: 0, fodder: false, greasy: false }
];
const TTSZ = tintxts.length;

// cf. eat.c CANNIBAL_ALLOWED()
function CANNIBAL_ALLOWED(player) {
    return player.roleIndex === PM_CAVEMAN || player.race === RACE_ORC;
}

// cf. eat.c nonrotting_corpse()
function nonrotting_corpse(mnum) {
    return mnum === PM_LIZARD || mnum === PM_LICHEN
        || is_rider(mons[mnum])
        || mnum === PM_ACID_BLOB;
}

// cf. eat.c nonrotting_food()
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
}


// ============================================================
// 2. Utility
// ============================================================

// cf. eat.c is_edible() — check if object is edible by hero
function is_edible(obj) {
    const od = objectData[obj.otyp];
    if (od && od.unique) return false;
    // Simplified: in JS we don't track polymorphed forms for metallivore etc.
    return obj.oclass === FOOD_CLASS;
}

// cf. eat.c food_xname() — food-specific naming for messages
function food_xname(food, the_pfx) {
    // Simplified: use doname for corpses, object name otherwise
    if (food.otyp === CORPSE) {
        const cnum = food.corpsenm;
        if (cnum >= 0 && cnum < mons.length) {
            const name = mons[cnum].name;
            return the_pfx ? `the ${name} corpse` : `${name} corpse`;
        }
    }
    const name = food.name || (objectData[food.otyp] ? objectData[food.otyp].name : 'food');
    return the_pfx ? `the ${name}` : name;
}

// cf. eat.c foodword() — word for eating action
function foodword(otmp) {
    if (otmp.oclass === FOOD_CLASS) return 'food';
    return 'food'; // simplified; C version indexes by material
}

// cf. eat.c obj_nutrition() — get nutrition value for an object
function obj_nutrition(otmp) {
    if (otmp.otyp === CORPSE) {
        const cnum = otmp.corpsenm;
        if (cnum >= 0 && cnum < mons.length) return mons[cnum].nutrition || 0;
    }
    const od = objectData[otmp.otyp];
    return od ? (od.nutrition || 0) : 0;
}

// cf. eat.c init_uhunger() — initialize hunger state at game start
function init_uhunger(player) {
    player.hunger = 900;
    player.nutrition = 900;
}


// ============================================================
// 3. Hunger system
// ============================================================

// cf. eat.c gethungry() — process hunger each turn
function gethungry(player) {
    // Simplified: basic hunger decrement (the real version checks
    // poly form, rings, amulets, regeneration, etc.)
    player.hunger--;
    // cf. eat.c: accessorytime = rn2(20)
    rn2(20);
    newuhs(player, true);
}

// cf. eat.c morehungry() — increase hunger by amount
export function morehungry(player, num) {
    player.hunger -= num;
    newuhs(player, true);
}

// cf. eat.c lesshungry() — decrease hunger by amount
function lesshungry(player, num) {
    player.hunger += num;
    if (player.hunger >= 2000) {
        // choking territory - simplified
        choke(player, null);
    } else if (player.hunger >= 1500) {
        pline("You're having a hard time getting all of it down.");
    }
    newuhs(player, false);
}

// cf. eat.c canchoke() — whether current hunger is in choking-warning range
function canchoke(player) {
    return (player.hunger || 0) >= 1500;
}

// cf. eat.c newuhs() — update hunger state and messages
function newuhs(player, incr) {
    const h = player.hunger;
    let newhs;
    if (h > 1000) newhs = SATIATED;
    else if (h > 150) newhs = NOT_HUNGRY;
    else if (h > 50) newhs = HUNGRY;
    else if (h > 0) newhs = WEAK;
    else newhs = FAINTING;

    const oldhs = player.hungerState || NOT_HUNGRY;
    if (newhs !== oldhs) {
        if (newhs >= WEAK && oldhs < WEAK) {
            // temporary strength loss
            // cf. eat.c ATEMP(A_STR) = -1
        } else if (newhs < WEAK && oldhs >= WEAK) {
            // repair temporary strength loss
        }
        switch (newhs) {
        case HUNGRY:
            You(incr ? 'are beginning to feel hungry.'
                     : 'only feel hungry now.');
            break;
        case WEAK:
            You(incr ? 'are beginning to feel weak.'
                     : 'are still weak.');
            break;
        }
        player.hungerState = newhs;
    }
}

// cf. eat.c unfaint() — recover from fainting
function unfaint(player) {
    Hear_again();
    if ((player.hungerState || NOT_HUNGRY) > FAINTING) {
        player.hungerState = FAINTING;
    }
    return 0;
}

// cf. eat.c is_fainted() — check if hero is fainted from hunger
export function is_fainted(player) {
    return (player.hungerState || NOT_HUNGRY) === FAINTED;
}

// cf. eat.c reset_faint() — reset faint counter
function reset_faint(player) {
    // stub — would clear faint timer
}

// cf. eat.c choke() — choking on food
function choke(player, food) {
    if ((player.hungerState || NOT_HUNGRY) !== SATIATED) {
        if (!food) return;
    }
    exercise(player, A_CON, false);
    if (!rn2(20)) {
        You('stuff yourself and then vomit voluminously.');
        morehungry(player, 1000);
        vomit(player);
    } else {
        You('choke over your food.');
        // In C this can be fatal; here we just log a message
    }
}


// ============================================================
// 4. Food state
// ============================================================

// cf. eat.c touchfood() — mark food as touched (started eating)
function touchfood(otmp, player) {
    // Simplified: in JS, stack splitting is handled in handleEat
    if (!otmp.oeaten) {
        otmp.oeaten = obj_nutrition(otmp);
    }
    return otmp;
}

// cf. eat.c reset_eat() — reset eating state
function reset_eat(game) {
    if (game && game.occupation) {
        game.occupation = null;
    }
}

// cf. eat.c do_reset_eat() — external reset_eat wrapper
function do_reset_eat(game) {
    reset_eat(game);
}

// cf. eat.c food_disappears() — check if food vanishes on level change
function food_disappears(obj) {
    // stub — in JS, object lifecycle is managed differently
}

// cf. eat.c food_substitution() — substitute food type
function food_substitution(old_obj, new_obj) {
    // stub — for renaming objects
}

// cf. eat.c recalc_wt() — recalculate object weight after partial eating
function recalc_wt(piece) {
    // stub — weight recalculation after eating
}

// cf. eat.c adj_victual_nutrition() — adjust nutrition for race
function adj_victual_nutrition(player, nmod) {
    let nut = -nmod;
    // Race-based adjustment for lembas/cram could go here
    return Math.max(nut, 1);
}


// ============================================================
// 5. Intrinsic system
// ============================================================

// cf. eat.c intrinsic_possible() — check if monster can give an intrinsic
function intrinsic_possible(type, ptr) {
    switch (type) {
    case FIRE_RES:    return (ptr.mr2 & MR_FIRE) !== 0;
    case SLEEP_RES:   return (ptr.mr2 & MR_SLEEP) !== 0;
    case COLD_RES:    return (ptr.mr2 & MR_COLD) !== 0;
    case DISINT_RES:  return (ptr.mr2 & MR_DISINT) !== 0;
    case SHOCK_RES:   return (ptr.mr2 & MR_ELEC) !== 0;
    case POISON_RES:  return (ptr.mr2 & MR_POISON) !== 0;
    case ACID_RES:    return (ptr.mr2 & MR_ACID) !== 0;
    case STONE_RES:   return (ptr.mr2 & MR_STONE) !== 0;
    case TELEPORT:    return can_teleport(ptr);
    case TELEPORT_CONTROL: return control_teleport(ptr);
    case TELEPAT:     return telepathic(ptr);
    default:          return false;
    }
}

// cf. eat.c should_givit() — decide whether to grant intrinsic
function should_givit(type, ptr) {
    let chance;
    switch (type) {
    case POISON_RES:
        if ((ptr === mons[PM_KILLER_BEE] || ptr === mons[PM_SCORPION])
            && !rn2(4))
            chance = 1;
        else
            chance = 15;
        break;
    case TELEPORT:
        chance = 10;
        break;
    case TELEPORT_CONTROL:
        chance = 12;
        break;
    case TELEPAT:
        chance = 1;
        break;
    default:
        chance = 15;
        break;
    }
    return ptr.mlevel > rn2(chance);
}

// cf. eat.c temp_givit() — grant temporary intrinsic from corpse
export function temp_givit(type, ptr) {
    const chance = (type === STONE_RES) ? 6 : (type === ACID_RES) ? 3 : 0;
    return chance ? (ptr.mlevel > rn2(chance)) : false;
}

// cf. eat.c givit() — grant intrinsic from corpse
function givit(player, type, ptr) {
    if (!should_givit(type, ptr) && !temp_givit(type, ptr))
        return;

    const prop = player.getProp(type);
    switch (type) {
    case FIRE_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('a momentary chill.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case SLEEP_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('wide awake.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case COLD_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('full of hot air.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case DISINT_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('very firm.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case SHOCK_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            Your('health currently feels amplified!');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case POISON_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('healthy.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPORT:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('very jumpy.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPORT_CONTROL:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('in control of yourself.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPAT:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            You_feel('a strange mental acuity.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case ACID_RES:
        // Timed resistance
        You_feel('less concerned about being harmed by acid.');
        prop.intrinsic = (prop.intrinsic & ~TIMEOUT)
            | Math.min(((prop.intrinsic & TIMEOUT) + d(3, 6)), TIMEOUT);
        break;
    case STONE_RES:
        // Timed resistance
        You_feel('less concerned about becoming petrified.');
        prop.intrinsic = (prop.intrinsic & ~TIMEOUT)
            | Math.min(((prop.intrinsic & TIMEOUT) + d(3, 6)), TIMEOUT);
        break;
    }
}

// cf. eat.c eye_of_newt_buzz() — energy boost from eating newt
export function eye_of_newt_buzz(player) {
    if (rn2(3) || 3 * (player.pw || 0) <= 2 * (player.pwmax || 0)) {
        const oldPw = player.pw || 0;
        player.pw = (player.pw || 0) + rnd(3);
        if ((player.pw || 0) > (player.pwmax || 0)) {
            if (!rn2(3)) {
                player.pwmax = (player.pwmax || 0) + 1;
            }
            player.pw = player.pwmax || 0;
        }
        if ((player.pw || 0) !== oldPw) {
            You_feel('a mild buzz.');
        }
    }
}

// cf. eat.c corpse_intrinsic() — choose intrinsic from corpse
function corpse_intrinsic(ptr) {
    const conveys_STR = is_giant(ptr);
    let count = 0;
    let prop = 0;

    if (conveys_STR) {
        count = 1;
        prop = -1; // fake prop index for STR
    }
    for (let i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr))
            continue;
        ++count;
        if (!rn2(count)) {
            prop = i;
        }
    }
    // if strength is the only candidate, give it 50% chance
    if (conveys_STR && count === 1 && !rn2(2))
        prop = 0;

    return prop;
}


// ============================================================
// 6. Corpse prefix / postfix effects
// ============================================================

// cf. eat.c maybe_cannibal() — check/apply cannibalism effects
function maybe_cannibal(player, pm, allowmsg) {
    if (!CANNIBAL_ALLOWED(player)) {
        // Simplified: check if eating own race
        // In full version this checks your_race() etc.
        if (allowmsg) {
            You('cannibal!  You will regret this!');
        }
        // Would apply luck penalty: change_luck(-rn1(4, 2))
        return true;
    }
    return false;
}

// cf. eat.c fix_petrification() — cure petrification by eating
function fix_petrification(player) {
    You_feel('limber!');
    // Would call make_stoned(0, ...)
}

// cf. eat.c cprefx() — corpse prefix effects (before eating)
function cprefx(player, pm) {
    // In full C version: calls maybe_cannibal, checks flesh_petrifies,
    // handles dogs/cats penalty, lizard un-stoning, rider death, green slime
    // Stub: consume RNG as C does but skip most side effects
    // maybe_cannibal is called by eatcorpse in the tainted path

    if (flesh_petrifies(mons[pm])) {
        // Would check Stone_resistance, polymon, etc.
    }

    switch (pm) {
    case PM_LITTLE_DOG: case PM_DOG: case PM_LARGE_DOG:
    case PM_KITTEN: case PM_HOUSECAT: case PM_LARGE_CAT:
        if (!CANNIBAL_ALLOWED(player)) {
            You_feel(`that eating the ${mons[pm].name} was a bad idea.`);
        }
        break;
    case PM_LIZARD:
        // Would cure petrification
        break;
    case PM_DEATH: case PM_PESTILENCE: case PM_FAMINE:
        pline('Eating that is instantly fatal.');
        exercise(player, A_WIS, false);
        break;
    case PM_GREEN_SLIME:
        // Would apply sliming
        break;
    default:
        if (acidic(mons[pm])) {
            // Would cure petrification if stoned
        }
        break;
    }
}

// cf. eat.c cpostfx() — corpse postfix effects (after eating)
function cpostfx(player, pm, display) {
    let tmp = 0;
    let check_intrinsics = false;

    switch (pm) {
    case PM_WRAITH:
        pluslvl(player, display, false);
        break;
    case PM_HUMAN_WERERAT:
    case PM_HUMAN_WEREJACKAL:
    case PM_HUMAN_WEREWOLF:
        // Would set lycanthropy
        break;
    case PM_NURSE:
        player.uhp = player.uhpmax;
        check_intrinsics = true;
        break;
    case PM_STALKER:
        // Would grant temporary invisibility
        // Falls through to yellow light / bat stun
        // FALLTHROUGH
    case PM_YELLOW_LIGHT:
    case PM_GIANT_BAT:
        // Would make_stunned
        // FALLTHROUGH
    case PM_BAT:
        // Would make_stunned
        break;
    case PM_GIANT_MIMIC:
        tmp += 10;
        // FALLTHROUGH
    case PM_LARGE_MIMIC:
        tmp += 20;
        // FALLTHROUGH
    case PM_SMALL_MIMIC:
        tmp += 20;
        // Would start mimicking
        break;
    case PM_QUANTUM_MECHANIC:
        Your('velocity suddenly seems very uncertain!');
        // Would toggle speed
        break;
    case PM_LIZARD:
        // Would reduce stun/confusion
        check_intrinsics = true;
        break;
    case PM_CHAMELEON:
    case PM_DOPPELGANGER:
    case PM_SANDESTIN:
    case PM_GENETIC_ENGINEER:
        You_feel('momentarily different.');
        break;
    case PM_DISPLACER_BEAST:
        // Would grant temporary displacement; consume d(6,6)
        d(6, 6);
        break;
    case PM_DISENCHANTER:
        // Would strip a random intrinsic
        break;
    case PM_DEATH: case PM_PESTILENCE: case PM_FAMINE:
        // Life-saved; don't attempt to confer intrinsics
        break;
    case PM_MIND_FLAYER:
    case PM_MASTER_MIND_FLAYER:
        if (!rn2(2)) {
            pline('Yum!  That was real brain food!');
            // Would adjattrib(A_INT, 1)
            break; // don't give telepathy too
        } else {
            pline('For some reason, that tasted bland.');
        }
        // FALLTHROUGH
    default:
        check_intrinsics = true;
        break;
    }

    if (check_intrinsics) {
        const ptr = mons[pm];

        if (dmgtype(ptr, AD_STUN) || dmgtype(ptr, AD_HALU)
            || pm === PM_VIOLET_FUNGUS) {
            pline('Oh wow!  Great stuff!');
            // Would make_hallucinated
        }

        // Eating magical monsters can give magical energy
        if (attacktype(ptr, AT_MAGC) || pm === PM_NEWT)
            eye_of_newt_buzz(player);

        tmp = corpse_intrinsic(ptr);

        if (tmp === -1) {
            // gainstr - would increase strength from giant
        } else if (tmp > 0) {
            givit(player, tmp, ptr);
        }
    }
}


// ============================================================
// 7. Conducts
// ============================================================

// cf. eat.c eating_conducts() — track dietary conducts
function eating_conducts(player, pd) {
    // Simplified: just track the conduct flags
    if (!player.conduct) player.conduct = {};
    player.conduct.food = (player.conduct.food || 0) + 1;
    if (!vegan(pd)) {
        player.conduct.unvegan = (player.conduct.unvegan || 0) + 1;
    }
    if (!vegetarian(pd)) {
        violated_vegetarian(player);
    }
}

// cf. eat.c violated_vegetarian() — check vegetarian conduct violation
function violated_vegetarian(player) {
    if (!player.conduct) player.conduct = {};
    player.conduct.unvegetarian = (player.conduct.unvegetarian || 0) + 1;
}


// ============================================================
// 8. Rotten food / corpse eating
// ============================================================

// cf. eat.c Hear_again() — restore hearing after deafening food
function Hear_again() {
    if (!rn2(2)) {
        // Would make_deaf(0)
    }
    return 0;
}

// cf. eat.c rottenfood() — effects of eating rotten food
function rottenfood(player, obj) {
    pline(`Blecch!  Rotten ${foodword(obj)}!`);
    if (!rn2(4)) {
        You_feel('rather light-headed.');
        // Would make_confused
    } else if (!rn2(4)) {
        pline('Everything suddenly goes dark.');
        // Would make_blinded; consume d(2,10)
        d(2, 10);
    } else if (!rn2(3)) {
        const duration = rnd(10);
        pline_The('world spins and goes dark.');
        // Would nomul(-duration), set deafness
        return 1;
    }
    return 0;
}

// cf. eat.c eatcorpse() — eat a corpse (rot checks, reqtime, etc.)
function eatcorpse(player, otmp) {
    let retcode = 0, tp = 0;
    const mnum = otmp.corpsenm;

    if (mnum < 0 || mnum >= mons.length) return 0;

    // Conduct tracking
    if (!vegan(mons[mnum])) {
        // unvegan conduct
    }
    if (!vegetarian(mons[mnum])) {
        violated_vegetarian(player);
    }

    let rotted = 0;
    if (!nonrotting_corpse(mnum)) {
        // cf. eat.c: rotted = (moves - age) / (10 + rn2(20))
        rotted = rn2(20); // consume RNG for denominator
        // Simplified rotted calculation
    }

    // Delay is weight dependent
    const reqtime = 3 + ((mons[mnum].weight || 0) >> 6);

    if (!tp && !nonrotting_corpse(mnum) && !rn2(7)) {
        if (rottenfood(player, otmp)) {
            retcode = 1;
        }
        if (!mons[mnum].nutrition) {
            // Corpse rots away completely
            retcode = 2;
        }
    }

    return { retcode, reqtime };
}


// ============================================================
// 9. Food prefix / postfix
// ============================================================

// cf. eat.c garlic_breath() — scare nearby olfaction monsters
function garlic_breath(player, map) {
    if (!map) return;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        const sym = mon.type?.mlet ?? (mons[mon.mndx]?.mlet);
        // cf. mondata.c olfaction() — these monster types lack olfaction
        if (sym === S_GOLEM || sym === S_EYE || sym === S_JELLY
            || sym === S_PUDDING || sym === S_BLOB || sym === S_VORTEX
            || sym === S_ELEMENTAL || sym === S_FUNGUS || sym === S_LIGHT) {
            continue;
        }
        const dx = mon.mx - player.x, dy = mon.my - player.y;
        if (dx * dx + dy * dy < 7) {
            applyMonflee(mon, 0, false);
        }
    }
}

// cf. eat.c fprefx() — food prefix effects (non-corpse)
function fprefx(player, otmp, reqtime, map) {
    switch (otmp.otyp) {
    case EGG:
        // Simplified: skip pyrolisk explosion, stale egg checks
        break;
    case FOOD_RATION:
        if (player.hunger <= 200)
            pline('This food really hits the spot!');
        else if (player.hunger < 700)
            pline('This satiates your stomach!');
        break;
    case TRIPE_RATION:
        if (carnivorous(mons[0] || {}) && !is_humanoid(mons[0] || {})) {
            pline('This tripe ration is surprisingly good!');
        } else if (player.race === RACE_ORC) {
            pline('Mmm, tripe... not bad!');
        } else {
            pline('Yak - dog food!');
            if (rn2(2) && !CANNIBAL_ALLOWED(player)) {
                rn1(reqtime, 14); // make_vomiting duration
            }
        }
        break;
    case LEMBAS_WAFER:
        if (player.race === RACE_ORC) {
            pline('!#?&* elf kibble!');
        } else if (player.race === RACE_ELF) {
            pline('A little goes a long way.');
        } else {
            // give_feedback
            pline(`This ${otmp.name || 'food'} is delicious!`);
        }
        break;
    case CLOVE_OF_GARLIC:
        garlic_breath(player, map);
        // FALLTHROUGH to default
        pline(`This ${otmp.name || 'food'} is delicious!`);
        break;
    default:
        pline(`This ${otmp.name || 'food'} is delicious!`);
        break;
    }
    return true;
}

// cf. eat.c fpostfx() — food postfix effects (non-corpse)
function fpostfx(player, otmp) {
    switch (otmp.otyp) {
    case SPRIG_OF_WOLFSBANE:
        // Would cure lycanthropy
        break;
    case CARROT:
        // Would cure blindness
        break;
    case FORTUNE_COOKIE:
        // Would display rumor
        break;
    case LUMP_OF_ROYAL_JELLY:
        // Would grant strength, heal
        {
            const hpChange = otmp.cursed ? -rnd(20) : rnd(20);
            player.uhp += hpChange;
            if (player.uhp > player.uhpmax) {
                if (!rn2(17))
                    player.uhpmax++;
                player.uhp = player.uhpmax;
            } else if (player.uhp <= 0) {
                player.uhp = 1; // simplified — C version kills or rehumanizes
            }
        }
        break;
    case EGG:
        // Would check for cockatrice egg petrification
        break;
    case EUCALYPTUS_LEAF:
        // Would cure sickness/vomiting if uncursed
        break;
    case APPLE:
        if (otmp.cursed) {
            // Would cause sleep if !Sleep_resistance
            rn1(11, 20); // fall_asleep duration
        }
        break;
    }
}


// ============================================================
// 10. Accessory / special eating
// ============================================================

// cf. eat.c bounded_increase() — bounded stat increase helper
function bounded_increase(old, inc, typ) {
    const absold = Math.abs(old), absinc = Math.abs(inc);
    const sgnold = Math.sign(old), sgninc = Math.sign(inc);
    let actualInc = inc;

    if (absinc === 0 || sgnold !== sgninc || absold + absinc < 10) {
        // use inc as-is
    } else if (absold + absinc < 20) {
        let ai = rnd(absinc);
        if (absold + ai < 10) ai = 10 - absold;
        actualInc = sgninc * ai;
    } else if (absold + absinc < 40) {
        let ai = rn2(absinc) ? 1 : 0;
        if (absold + ai < 20) ai = rnd(20 - absold);
        actualInc = sgninc * ai;
    } else {
        actualInc = 0;
    }
    return old + actualInc;
}

// cf. eat.c accessory_has_effect() — check if accessory eating has effect
function accessory_has_effect(otmp) {
    pline(`Magic spreads through your body as you digest the ${
        otmp.oclass === 3 /* RING_CLASS */ ? 'ring' : 'amulet'}.`);
}

// cf. eat.c eataccessory() — eat a ring or amulet
function eataccessory(player, otmp) {
    // Stub: in full version this grants intrinsics based on ring/amulet type
    // For RNG parity we'd need rn2(3) for rings, rn2(5) for amulets
}

// cf. eat.c eatspecial() — eat special non-food items
function eatspecial(player, otmp) {
    // Stub: handles eating non-food items (coins, paper, rings, etc.)
    // In full C version: lesshungry(nmod), then type-specific effects
}


// ============================================================
// 11. Tin handling
// ============================================================

// cf. eat.c tin_variety_txt() — text for tin variety
function tin_variety_txt(s) {
    if (!s) return { offset: 0, variety: -1 };
    for (let k = 0; k < TTSZ - 1; k++) {
        const txt = tintxts[k].txt;
        if (s.startsWith(txt + ' ')) {
            return { offset: txt.length + 1, variety: k };
        }
    }
    return { offset: 0, variety: -1 };
}

// cf. eat.c tin_details() — determine tin contents and variety
function tin_details(obj, mnum, buf) {
    // Stub: would format tin description
    return buf || '';
}

// cf. eat.c set_tin_variety() — set variety on a tin object
function set_tin_variety(obj, forcetype) {
    const mnum = obj.corpsenm;
    let r;
    if (forcetype === SPINACH_TIN) {
        obj.corpsenm = -1;
        obj.spe = 1;
        return;
    }
    if (forcetype >= 0 && forcetype < TTSZ - 1) {
        r = forcetype;
    } else {
        r = rn2(TTSZ - 1);
        if (r === ROTTEN_TIN && mnum >= 0 && nonrotting_corpse(mnum))
            r = HOMEMADE_TIN;
    }
    obj.spe = -(r + 1);
}

// cf. eat.c tin_variety() — get tin variety
function tin_variety(obj, displ) {
    let r;
    const mnum = obj.corpsenm;
    if (obj.spe === 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN;
    } else if (obj.spe < 0) {
        r = -(obj.spe) - 1;
    } else {
        r = rn2(TTSZ - 1);
    }
    if (!displ && r === HOMEMADE_TIN && !obj.blessed && !rn2(7))
        r = ROTTEN_TIN;
    if (r === ROTTEN_TIN && mnum >= 0 && nonrotting_corpse(mnum))
        r = HOMEMADE_TIN;
    return r;
}

// cf. eat.c costly_tin() — handle cost of tin from shop
function costly_tin(tin) {
    // Stub: shop cost handling
    return tin;
}

// cf. eat.c use_up_tin() — consume a tin after opening
function use_up_tin(player, tin) {
    if (tin) {
        player.removeFromInventory(tin);
    }
}

// cf. eat.c consume_tin() — eat the contents of an opened tin
function consume_tin(player, tin, mesg) {
    // Stub: would handle full tin consumption with variety effects
    pline(mesg || 'You succeed in opening the tin.');
}

// cf. eat.c start_tin() — begin opening a tin
function start_tin(player, otmp, game) {
    // Stub: would set up tin-opening occupation
    pline('It is not so easy to open this tin.');
}


// ============================================================
// 12. Prompts / nonfood
// ============================================================

// cf. eat.c edibility_prompts() — prompts about food edibility
function edibility_prompts(player, otmp) {
    // Stub: blessed food detection warnings
    return 0;
}

// cf. eat.c doeat_nonfood() — attempt to eat non-food item
function doeat_nonfood(player, otmp) {
    // Stub: would handle eating non-food items
    pline('You cannot eat that!');
    return 0;
}

// cf. eat.c eating_dangerous_corpse() — warn about dangerous corpses
function eating_dangerous_corpse(res) {
    // Stub: checks if currently eating something dangerous
    return false;
}


// ============================================================
// 13. Callbacks / floor
// ============================================================

// cf. eat.c eat_ok() — getobj callback for edible items
function eat_ok(obj) {
    if (!obj) return false;
    return is_edible(obj);
}

// cf. eat.c offer_ok() — getobj callback for sacrifice items
function offer_ok(obj) {
    if (!obj) return false;
    return obj.otyp === CORPSE;
}

// cf. eat.c tin_ok() — getobj callback for tins
function tin_ok(obj) {
    if (!obj) return false;
    return obj.otyp === TIN;
}

// cf. eat.c tinopen_ok() — getobj callback for tin opener
function tinopen_ok(obj) {
    if (!obj) return false;
    return obj.otyp === TIN;
}

// cf. eat.c floorfood() — check/prompt for food on floor
function floorfood(player, map, verb) {
    // Stub: the actual floor food logic is in handleEat
    return null;
}


// ============================================================
// 14. Side effects
// ============================================================

// cf. eat.c vomit() — vomiting effects
function vomit(player) {
    // Simplified vomiting
    // Would cure SICK_VOMITABLE, apply nomul(-2)
}

// cf. eat.c eaten_stat() — calculate how much of food has been eaten
function eaten_stat(base, obj) {
    const full_amount = obj_nutrition(obj);
    let uneaten_amt = obj.oeaten || 0;
    if (uneaten_amt > full_amount) uneaten_amt = full_amount;
    if (full_amount === 0) return 0;
    const result = Math.floor(base * uneaten_amt / full_amount);
    return result < 1 ? 1 : result;
}

// cf. eat.c consume_oeaten() — reduce oeaten field
function consume_oeaten(obj, amt) {
    if (!obj_nutrition(obj)) return;
    if (amt > 0) {
        obj.oeaten >>= amt;
    } else {
        if (obj.oeaten > -amt)
            obj.oeaten += amt;
        else
            obj.oeaten = 0;
    }
    if (obj.oeaten === 0) {
        obj.oeaten = 1;
    }
}

// cf. eat.c maybe_finished_meal() — check if meal is done
function maybe_finished_meal(game, stopping) {
    const occ = game?.occupation;
    if (!occ || typeof occ.fn !== 'function' || !occ.isEating) return false;
    const reqtime = Number.isInteger(occ?.eatState?.reqtime) ? occ.eatState.reqtime : (occ.xtime | 0);
    const usedtime = Number.isInteger(occ?.eatState?.usedtime) ? occ.eatState.usedtime : 0;
    if (usedtime < reqtime) return false;
    if (stopping) {
        game.occupation = null;
    }
    // C ref: maybe_finished_meal() calls eatfood() to finish the meal.
    occ.fn(game);
    return true;
}

// cf. eat.c cant_finish_meal() — interrupt meal completion
function cant_finish_meal(game, corpse) {
    // Stub: prevents corpse from being consumed when it gets revived
}

// cf. eat.c Popeye() — spinach strength boost check
function Popeye(threat) {
    // Stub: checks if opening a tin of spinach might save hero
    return false;
}

// cf. eat.c Finish_digestion() — complete digestion process
function Finish_digestion() {
    // Stub: called via afternmv after swallowing a monster whole
    return 0;
}

// cf. eat.c eat_brains() — eat brain effects (for mind flayer attacks)
function eat_brains(magr, mdef, visflag, dmg_p) {
    // Stub: handles mind flayer brain-eating attack
    const xtra_dmg = rnd(10);
    if (noncorporeal(mdef.data || mons[mdef.mndx])) {
        return 0; // M_ATTK_MISS
    }
    return 1; // M_ATTK_HIT
}


// ============================================================
// 15. Main command — handleEat
// ============================================================

// cf. eat.c doeat() — main eat command (partial).
// cf. eat.c opentin() — open a tin.
// cf. eat.c bite() — apply incremental nutrition per turn (partial).

// handleEat implements partial doeat()/eatcorpse()/bite()/start_eating()/eatfood().
// Covers: floor food prompt, inventory selection, corpse rot checks, stack splitting,
// nutrition distribution, tripe flavor, newt energy, garlic breath, multi-turn occupation.
async function handleEat(player, display, game) {
    const map = game?.map;
    const floorFoods = map
        ? map.objectsAt(player.x, player.y).filter((o) => o && o.oclass === FOOD_CLASS)
        : [];

    // cf. eat.c floorfood() (partial) — if edible food is at hero square,
    // ask before opening inventory selector.
    if (floorFoods.length > 0) {
        const floorItem = floorFoods[0];
        const floorDescribed = doname(floorItem, null);
        const floorName = floorDescribed.replace(/^(?:an?|the)\s+/i, '');
        const article = /^[aeiou]/i.test(floorName) ? 'an' : 'a';
        display.putstr_message(`There is ${article} ${floorName} here; eat it? [ynq] (n)`);
        const ans = String.fromCharCode(await nhgetch()).toLowerCase();
        if (ans === 'q') {
            // cf. eat.c floorfood() — 'q' exits immediately
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (ans === 'y') {
            if (floorItem.otyp === CORPSE) {
                const cnum = Number.isInteger(floorItem.corpsenm) ? floorItem.corpsenm : -1;
                const nonrotting = (cnum === PM_LIZARD || cnum === PM_LICHEN);
                let rottenTriggered = false;
                if (!nonrotting) {
                    rn2(20); // C: rotted age denominator
                    if (!rn2(7)) {
                        rottenTriggered = true;
                        // cf. eat.c rottenfood() branch probes
                        const c1 = rn2(4);
                        if (c1 !== 0) {
                            const c2 = rn2(4);
                            if (c2 !== 0) rn2(3);
                        }
                    }
                }
                const corpseWeight = (cnum >= 0 && mons[cnum]) ? (mons[cnum].weight || 0) : 0;
                // cf. eat.c eatcorpse() -> reqtime from corpse weight, then
                // rotten path consume_oeaten(..., 2) effectively quarters meal size.
                const baseReqtime = 3 + (corpseWeight >> 6);
                const reqtime = rottenTriggered
                    ? Math.max(1, Math.floor((baseReqtime + 2) / 4))
                    : baseReqtime;
                const eatState = { usedtime: 1, reqtime }; // first bite already happened
                let consumedFloorItem = false;
                const consumeFloorItem = () => {
                    if (consumedFloorItem) return;
                    consumedFloorItem = true;
                    // cf. eat.c done_eating() -> useupf() -> delobj() -> delobj_core()
                    // delobj_core consumes obj_resists(obj, 0, 0) for ordinary objects.
                    obj_resists(floorItem, 0, 0);
                    map.removeObject(floorItem);
                };

                if (reqtime > 1) {
                    const finishFloorEating = () => {
                        consumeFloorItem();
                        if (rottenTriggered) {
                            display.putstr_message(`Blecch!  Rotten food!  You finish eating the ${floorName}.`);
                        } else {
                            display.putstr_message(`You finish eating the ${floorName}.`);
                        }
                    };
                    // cf. eat.c eatfood() / start_eating() — set_occupation
                    game.occupation = {
                        fn: () => {
                            eatState.usedtime++;
                            // cf. eat.c eatfood(): done when ++usedtime > reqtime.
                            if (eatState.usedtime > reqtime) {
                                finishFloorEating();
                                return 0;
                            }
                            return 1;
                        },
                        isEating: true,
                        eatState,
                        occtxt: `eating ${floorName}`,
                        txt: `eating ${floorName}`,
                        xtime: reqtime,
                    };
                } else {
                    consumeFloorItem();
                    if (rottenTriggered) {
                        display.putstr_message(`Blecch!  Rotten food!  You finish eating the ${floorName}.`);
                    } else {
                        display.putstr_message(`You finish eating the ${floorName}.`);
                    }
                }
                return { moved: false, tookTime: true };
            }
        }
        // cf. eat.c floorfood() — 'n' (or default) falls through to getobj()
        // for inventory food selection, NOT "Never mind."
    }

    // cf. eat.c doeat() / eat_ok() (partial) — inventory food selection
    const food = player.inventory.filter(o => o.oclass === 6); // FOOD_CLASS
    if (food.length === 0) {
        display.putstr_message("You don't have anything to eat.");
        return { moved: false, tookTime: false };
    }

    const eatChoices = compactInvletPromptChars(food.map(f => f.invlet).join(''));
    while (true) {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        display.putstr_message(`What do you want to eat? [${eatChoices} or ?*]`);
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            display.topMessage = null;
            display.messageNeedsMore = false;
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            continue;
        }

        const item = food.find(f => f.invlet === c);
        if (!item) {
            const anyItem = player.inventory.find((o) => o.invlet === c);
            if (anyItem) {
                // cf. eat.c doeat() → getobj returns non-food item
                // (eat_ok returns GETOBJ_EXCLUDE_SELECTABLE), then
                // is_edible() check fails → "You cannot eat that!" and exit.
                display.putstr_message('You cannot eat that!');
                return { moved: false, tookTime: false };
            }
            // cf. eat.c getobj() handles invalid letters differently depending
            // on mode. In non-wizard mode, it emits a "--More--" that blocks
            // until Space/Enter/Esc; in wizard mode it silently re-prompts.
            if (!player.wizard) {
                display.putstr_message("You don't have that object.--More--");
                while (true) {
                    const moreCh = await nhgetch();
                    if (moreCh === 32 || moreCh === 10 || moreCh === 13 || moreCh === 27) break;
                }
            }
            continue;
        }
        // cf. eat.c doesplit() path — splitobj() for stacked comestibles:
        // splitobj() creates a single-item object and consumes next_ident() (rnd(2)).
        const eatingFromStack = ((item.quan || 1) > 1 && item.oclass === FOOD_CLASS);
        let eatenItem = item;
        if (eatingFromStack) {
            // cf. eat.c splitobj() keeps both pieces in inventory until done_eating().
            eatenItem = { ...item, quan: 1, o_id: next_ident() };
            item.quan = (item.quan || 1) - 1;
            const itemIndex = player.inventory.indexOf(item);
            if (itemIndex >= 0) {
                eatenItem.invlet = item.invlet;
                player.inventory.splice(itemIndex + 1, 0, eatenItem);
            }
        }

        let corpseTasteIdx = null;
        // cf. eat.c eatcorpse() RNG used by taint/rotting checks.
        if (eatenItem.otyp === CORPSE) {
            const cnum = Number.isInteger(eatenItem.corpsenm) ? eatenItem.corpsenm : -1;
            const nonrotting = (cnum === PM_LIZARD || cnum === PM_LICHEN);
            if (!nonrotting) {
                rn2(20); // rotted denominator
                rn2(7);  // rottenfood gate (when no prior taste effect triggered)
            }
            rn2(10); // palatable taste gate
            corpseTasteIdx = rn2(5);  // palatable message choice index
        }
        const od = objectData[eatenItem.otyp];
        const cnum = Number.isInteger(eatenItem.corpsenm) ? eatenItem.corpsenm : -1;
        const isCorpse = eatenItem.otyp === CORPSE && cnum >= 0 && cnum < mons.length;
        // cf. eat.c eatcorpse() overrides reqtime to 3 + (corpse weight >> 6).
        const reqtime = isCorpse
            ? (3 + ((mons[cnum].weight || 0) >> 6))
            : Math.max(1, (od ? od.delay : 1));
        const baseNutr = isCorpse
            ? (mons[cnum].nutrition || (od ? od.nutrition : 200))
            : (od ? od.nutrition : 200);
        // cf. eat.c bite() nmod calculation — nutrition distributed per bite.
        // nmod < 0 means add -nmod each turn; nmod > 0 means add 1 some turns
        const nmod = (reqtime === 0 || baseNutr === 0) ? 0
            : (baseNutr >= reqtime) ? -Math.floor(baseNutr / reqtime)
            : reqtime % baseNutr;
        const eatState = { usedtime: 0, reqtime };

        // cf. eat.c bite() — apply incremental nutrition (partial)
        function doBite() {
            if (nmod < 0) {
                lesshungry(player, -nmod);
                player.nutrition += (-nmod);
            } else if (nmod > 0 && (eatState.usedtime % nmod)) {
                lesshungry(player, 1);
                player.nutrition += 1;
            }
        }

        // First bite (turn 1) — mirrors C start_eating() + bite()
        eatState.usedtime++;
        doBite();
        // cf. eat.c start_eating() — fprefx() is called for fresh
        // (not already partly eaten) non-corpse food, producing flavor
        // messages and RNG calls for specific food types.
        if (!isCorpse) {
            // cf. eat.c fprefx() (partial)
            if (eatenItem.otyp === TRIPE_RATION) {
                // cf. eat.c fprefx() tripe — carnivorous non-humanoid: "surprisingly good!"
                // orc: "Mmm, tripe..." (no RNG)
                // else: "Yak - dog food!" + rn2(2) vomit check
                const isOrc = player.race === RACE_ORC;
                if (!isOrc) {
                    const cannibalAllowed = (player.roleIndex === PM_CAVEMAN || isOrc);
                    if (rn2(2) && !cannibalAllowed) {
                        rn1(reqtime, 14); // make_vomiting duration
                    }
                }
            }
            if (reqtime > 1) {
                display.putstr_message(`You begin eating the ${eatenItem.name}.`);
            }
        }
        let consumedInventoryItem = false;
        const consumeInventoryItem = () => {
            if (consumedInventoryItem) return;
            consumedInventoryItem = true;
            player.removeFromInventory(eatingFromStack ? eatenItem : item);
        };

        if (reqtime > 1) {
            const finishEating = (gameCtx) => {
                // cf. eat.c done_eating()/cpostfx() runs from eatfood() when
                // occupation reaches completion, before moveloop's next monster turn.
                consumeInventoryItem();
                if (isCorpse && corpseTasteIdx !== null) {
                    const tastes = ['okay', 'stringy', 'gamey', 'fatty', 'tough'];
                    const idx = Math.max(0, Math.min(tastes.length - 1, corpseTasteIdx));
                    const verb = idx === 0 ? 'tastes' : 'is';
                    display.putstr_message(
                        `This ${eatenItem.name} ${verb} ${tastes[idx]}.  `
                        + `You finish eating the ${eatenItem.name}.--More--`
                    );
                } else {
                    // cf. eat.c done_eating() generic multi-turn completion line.
                    display.putstr_message("You're finally finished.");
                }
                if (isCorpse && cnum === PM_NEWT) {
                    // cf. eat.c eye_of_newt_buzz() from cpostfx(PM_NEWT) (partial).
                    if (rn2(3) || (3 * (player.pw || 0) <= 2 * (player.pwmax || 0))) {
                        const oldPw = player.pw || 0;
                        player.pw = (player.pw || 0) + rnd(3);
                        if ((player.pw || 0) > (player.pwmax || 0)) {
                            if (!rn2(3)) {
                                player.pwmax = (player.pwmax || 0) + 1;
                            }
                            player.pw = player.pwmax || 0;
                        }
                        if ((player.pw || 0) !== oldPw) {
                            if (gameCtx) {
                                gameCtx.pendingToplineMessage = 'You feel a mild buzz.';
                            } else {
                                display.putstr_message('You feel a mild buzz.');
                            }
                        }
                    }
                }
            };
            // cf. eat.c eatfood() / start_eating() — set_occupation
            let fullwarn = false;
            game.occupation = {
                fn: () => {
                    eatState.usedtime++;
                    // cf. eat.c eatfood(): done when ++usedtime > reqtime.
                    if (eatState.usedtime > reqtime) {
                        finishEating(game);
                        return 0; // done
                    }
                    doBite();
                    const bitesLeft = reqtime - eatState.usedtime;
                    // C ref: eat.c lesshungry()/eatfood() — fullwarn path.
                    if (!fullwarn && bitesLeft > 1 && canchoke(player)) {
                        fullwarn = true;
                        display.putstr_message('Continue eating? [yn] (n)');
                        game.pendingPrompt = {
                            type: 'eat_continue',
                            onKey: (chCode, gameCtx) => {
                                if (chCode === 121 || chCode === 89) { // y/Y
                                    gameCtx.pendingPrompt = null;
                                    return { handled: true, continueEating: true };
                                }
                                // default answer is "n" on Enter/Esc/Space or explicit n/N
                                if (chCode === 110 || chCode === 78
                                    || chCode === 13 || chCode === 10
                                    || chCode === 27 || chCode === 32) {
                                    gameCtx.pendingPrompt = null;
                                    gameCtx.occupation = null;
                                    display.putstr_message(`You stop eating the ${eatenItem.name}.`);
                                    return { handled: true, continueEating: false };
                                }
                                // Ignore unrelated keys while prompt is active.
                                return { handled: true, continueEating: null };
                            },
                        };
                        return 'prompt';
                    }
                    return 1; // continue
                },
                isEating: true,
                eatState,
                occtxt: `eating ${eatenItem.name}`,
                txt: `eating ${eatenItem.name}`,
                xtime: reqtime,
            };
        } else {
            // Single-turn food — eat instantly
            consumeInventoryItem();
            display.putstr_message(`This ${eatenItem.name} is delicious!`);
            // cf. eat.c garlic_breath() — scare nearby olfaction monsters (partial).
            if (eatenItem.otyp === CLOVE_OF_GARLIC && map) {
                for (const mon of map.monsters) {
                    if (mon.dead) continue;
                    const sym = mon.type?.mlet ?? (mons[mon.mndx]?.mlet);
                    // cf. mondata.c olfaction() — golems, eyes, jellies, puddings,
                    // blobs, vortexes, elementals, fungi, and lights lack olfaction.
                    if (sym === S_GOLEM || sym === S_EYE || sym === S_JELLY
                        || sym === S_PUDDING || sym === S_BLOB || sym === S_VORTEX
                        || sym === S_ELEMENTAL || sym === S_FUNGUS || sym === S_LIGHT) {
                        continue;
                    }
                    // cf. eat.c garlic_breath() — distu(mtmp) < 7
                    const dx = mon.mx - player.x, dy = mon.my - player.y;
                    if (dx * dx + dy * dy < 7) {
                        applyMonflee(mon, 0, false);
                    }
                }
            }
        }
        return { moved: false, tookTime: true };
    }
}


// ============================================================
// Exports
// ============================================================

export { handleEat, // Hunger system
    hu_stat, SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED, STARVED, init_uhunger, gethungry, lesshungry, newuhs, unfaint, reset_faint, // Food state
    is_edible, food_xname, foodword, obj_nutrition, touchfood, reset_eat, do_reset_eat, food_disappears, food_substitution, recalc_wt, adj_victual_nutrition, // Choking
    choke, // Intrinsics
    intrinsic_possible, should_givit, givit, corpse_intrinsic, // Corpse effects
    maybe_cannibal, fix_petrification, cprefx, cpostfx, // Conducts
    eating_conducts, violated_vegetarian, // Rotten/corpse
    Hear_again, rottenfood, eatcorpse, // Food effects
    garlic_breath, fprefx, fpostfx, // Accessories
    bounded_increase, accessory_has_effect, eataccessory, eatspecial, // Tins
    tin_variety_txt, tin_details, set_tin_variety, tin_variety, costly_tin, use_up_tin, consume_tin, start_tin, // Prompts
    edibility_prompts, doeat_nonfood, eating_dangerous_corpse, // Callbacks
    eat_ok, offer_ok, tin_ok, tinopen_ok, floorfood, // Side effects
    vomit, eaten_stat, consume_oeaten, maybe_finished_meal, cant_finish_meal, Popeye, Finish_digestion, eat_brains, // Constants
    nonrotting_corpse, nonrotting_food, CANNIBAL_ALLOWED, canchoke, SPINACH_TIN, ROTTEN_TIN, HOMEMADE_TIN, tintxts, TTSZ };
