// dog.js -- Pet AI helper functions
// C ref: dog.c dogfood(), initedog()
// Focus: exact RNG consumption alignment with C NetHack

import {
    mons, NUMMONS,
    MR_POISON, MR_ACID, MR_STONE, MR_FIRE,
    M1_FLY, M1_SWIM, M1_AMPHIBIOUS, M2_DOMESTIC,
    S_BLOB, S_JELLY, S_FUNGUS, S_VORTEX, S_LIGHT, S_ELEMENTAL,
    S_GOLEM, S_GHOST, S_YETI, S_KOBOLD, S_ORC, S_OGRE,
    PM_COCKATRICE, PM_CHICKATRICE, PM_MEDUSA,
    PM_STALKER, PM_FLESH_GOLEM, PM_LEATHER_GOLEM,
    PM_GHOUL, PM_KILLER_BEE, PM_PYROLISK,
    PM_GELATINOUS_CUBE, PM_RUST_MONSTER,
    PM_DEATH, PM_PESTILENCE, PM_FAMINE, PM_LIZARD, PM_LICHEN,
    PM_LITTLE_DOG, PM_KITTEN, PM_PONY,
} from './monsters.js';

import {
    objectData,
    FOOD_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, COIN_CLASS, GEM_CLASS,
    SILVER,
    CORPSE, TIN, EGG,
    TRIPE_RATION, MEATBALL, MEAT_STICK, ENORMOUS_MEATBALL, MEAT_RING,
    LUMP_OF_ROYAL_JELLY, GLOB_OF_GREEN_SLIME,
    CLOVE_OF_GARLIC, APPLE, CARROT, BANANA, SLIME_MOLD,
    AMULET_OF_STRANGULATION, RIN_SLOW_DIGESTION,
} from './objects.js';

import { obj_resists, is_organic, is_metallic, is_rustprone } from './objdata.js';
import {
    carnivorous, herbivorous, is_undead, is_elf,
    is_humanoid, acidic, poisonous, is_metallivore,
} from './mondata.js';
import { rn2, rn1 } from './rng.js';
import { isok, ACCESSIBLE, COLNO, ROWNO, IS_DOOR, D_CLOSED, D_LOCKED,
         POOL, LAVAPOOL, PM_CAVEMAN, PM_SAMURAI, PM_BARBARIAN, PM_RANGER } from './config.js';
import { SADDLE } from './objects.js';
import { roles } from './player.js';
import { makemon, NO_MINVENT, MM_EDOG } from './makemon.js';
import { mksobj } from './mkobj.js';
import { mpickobj } from './monutil.js';

// Re-export dogmove.c functions that were previously defined here
export { can_carry, dog_eat } from './dogmove.js';

// ========================================================================
// dogfood return categories (C ref: mextra.h dogfood_types)
// ========================================================================
export const DOGFOOD  = 0;
export const CADAVER  = 1;
export const ACCFOOD  = 2;
export const MANFOOD  = 3;
export const APPORT   = 4;
export const POISON   = 5;
export const UNDEF    = 6;
export const TABU     = 7;

const NON_PM = -1;

function monIndex(mon) {
    if (Number.isInteger(mon?.mnum)) return mon.mnum;
    if (Number.isInteger(mon?.mndx)) return mon.mndx;
    return NON_PM;
}

function monPtr(mon) {
    const idx = monIndex(mon);
    return ismnum(idx) ? mons[idx] : null;
}

// ========================================================================
// Helper predicates matching C macros from mondata.h
// ========================================================================

function mon_vegan(ptr) {
    return ptr.symbol === S_BLOB || ptr.symbol === S_JELLY
        || ptr.symbol === S_FUNGUS || ptr.symbol === S_VORTEX
        || ptr.symbol === S_LIGHT
        || (ptr.symbol === S_ELEMENTAL && ptr !== mons[PM_STALKER])
        || (ptr.symbol === S_GOLEM && ptr !== mons[PM_FLESH_GOLEM]
            && ptr !== mons[PM_LEATHER_GOLEM])
        || ptr.symbol === S_GHOST;
}

function flesh_petrifies(pm) {
    return pm === mons[PM_COCKATRICE] || pm === mons[PM_CHICKATRICE]
        || pm === mons[PM_MEDUSA];
}

function is_rider(ptr) {
    return ptr === mons[PM_DEATH] || ptr === mons[PM_PESTILENCE]
        || ptr === mons[PM_FAMINE];
}

function resists_poison(mon) { return !!(monPtr(mon)?.mr1 & MR_POISON); }
function resists_acid(mon)   { return !!(monPtr(mon)?.mr1 & MR_ACID); }
function resists_ston(mon)   { return !!(monPtr(mon)?.mr1 & MR_STONE); }
function likes_fire(ptr) { return !!(ptr.mr1 & MR_FIRE); }
function polyfood(obj) { return false; }
function slimeproof(ptr) { return false; }

function mon_hates_silver(mon) {
    const ptr = monPtr(mon);
    if (!ptr) return false;
    return !!(ptr.flags2 & 0x00000400);
}

function ismnum(fx) { return fx >= 0 && fx < NUMMONS; }
const humanoid = is_humanoid;

function same_race(ptr1, ptr2) {
    const race_flags = 0x00004000 | 0x00008000 | 0x00010000 | 0x00020000 | 0x00040000;
    return !!(ptr1.flags2 & ptr2.flags2 & race_flags);
}

function is_quest_artifact(obj) { return false; }
function peek_at_iced_corpse_age(obj) { return obj.age || 0; }

// ========================================================================
// dogfood — classify object for pet food evaluation
// C ref: dog.c:988-1130 dogfood(mon, obj)
// ========================================================================

export function dogfood(mon, obj, moves) {
    const mptr = monPtr(mon);
    if (!mptr) return APPORT;
    const carni = carnivorous(mptr);
    const herbi = herbivorous(mptr);

    if (obj.opoisoned && !resists_poison(mon))
        return POISON;

    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    if (obj.oclass === FOOD_CLASS) {
        const fx = (obj.otyp === CORPSE || obj.otyp === TIN || obj.otyp === EGG)
            ? (obj.corpsenm !== undefined ? obj.corpsenm : NON_PM)
            : NON_PM;
        const fptr = ismnum(fx) ? mons[fx] : null;

        if (obj.otyp === CORPSE && fptr && is_rider(fptr))
            return TABU;

        if ((obj.otyp === CORPSE || obj.otyp === EGG)
            && fptr && flesh_petrifies(fptr)
            && !resists_ston(mon))
            return POISON;

        if (obj.otyp === LUMP_OF_ROYAL_JELLY
            && mptr === mons[PM_KILLER_BEE]) {
            return TABU;
        }

        if (!carni && !herbi)
            return obj.cursed ? UNDEF : APPORT;

        const starving = !!(mon.tame && !mon.isminion
                           && mon.edog && mon.edog.mhpmax_penalty);
        const mblind = false;

        if (monIndex(mon) === PM_GHOUL) {
            if (obj.otyp === CORPSE) {
                const corpseAge = peek_at_iced_corpse_age(obj);
                return (corpseAge + 50 <= (moves || 0)
                        && fx !== PM_LIZARD && fx !== PM_LICHEN) ? DOGFOOD
                    : (starving && fptr && !mon_vegan(fptr)) ? ACCFOOD
                    : POISON;
            }
            if (obj.otyp === EGG)
                return starving ? ACCFOOD : POISON;
            return TABU;
        }

        switch (obj.otyp) {
        case TRIPE_RATION:
        case MEATBALL:
        case MEAT_RING:
        case MEAT_STICK:
        case ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;

        case EGG:
            if (fx === PM_PYROLISK && !likes_fire(mptr))
                return POISON;
            return carni ? CADAVER : MANFOOD;

        case CORPSE: {
            const corpseAge = peek_at_iced_corpse_age(obj);
            if ((corpseAge + 50 <= (moves || 0)
                 && fx !== PM_LIZARD && fx !== PM_LICHEN
                 && mptr.symbol !== S_FUNGUS)
                || (fptr && acidic(fptr) && !resists_acid(mon))
                || (fptr && poisonous(fptr) && !resists_poison(mon)))
                return POISON;
            else if (polyfood(obj) && mon.tame > 1 && !starving)
                return MANFOOD;
            else if (fptr && mon_vegan(fptr))
                return herbi ? CADAVER : MANFOOD;
            else if (humanoid(mptr) && fptr && same_race(mptr, fptr)
                     && !is_undead(mptr) && fptr.symbol !== S_KOBOLD
                     && fptr.symbol !== S_ORC && fptr.symbol !== S_OGRE)
                return (starving && carni && !is_elf(mptr)) ? ACCFOOD : TABU;
            else
                return carni ? CADAVER : MANFOOD;
        }

        case GLOB_OF_GREEN_SLIME:
            return (starving || slimeproof(mptr)) ? ACCFOOD : POISON;

        case CLOVE_OF_GARLIC:
            return is_undead(mptr) ? TABU
                : (herbi || starving) ? ACCFOOD
                : MANFOOD;

        case TIN:
            return is_metallivore(mptr) ? ACCFOOD : MANFOOD;

        case APPLE:
            return herbi ? DOGFOOD : starving ? ACCFOOD : MANFOOD;

        case CARROT:
            return (herbi || mblind) ? DOGFOOD : starving ? ACCFOOD : MANFOOD;

        case BANANA:
            return (mptr.symbol === S_YETI && herbi) ? DOGFOOD
                : (herbi || starving) ? ACCFOOD
                : MANFOOD;

        default:
            if (starving) return ACCFOOD;
            return (obj.otyp > SLIME_MOLD) ? (carni ? ACCFOOD : MANFOOD)
                                           : (herbi ? ACCFOOD : MANFOOD);
        }
    }

    if (obj.oclass === ROCK_CLASS)
        return UNDEF;

    if (obj.otyp === AMULET_OF_STRANGULATION
        || obj.otyp === RIN_SLOW_DIGESTION)
        return TABU;

    if (mon_hates_silver(mon)
        && objectData[obj.otyp].material === SILVER)
        return TABU;

    if (monIndex(mon) === PM_GELATINOUS_CUBE && is_organic(obj))
        return ACCFOOD;

    if (is_metallivore(mptr) && is_metallic(obj)
        && (is_rustprone(obj) || monIndex(mon) !== PM_RUST_MONSTER)) {
        return (is_rustprone(obj) && !obj.oerodeproof) ? DOGFOOD : ACCFOOD;
    }

    if (!obj.cursed
        && obj.oclass !== BALL_CLASS
        && obj.oclass !== CHAIN_CLASS)
        return APPORT;

    return UNDEF;
}


// ========================================================================
// makedog — C ref: dog.c:219
// Pet creation and placement at game start.
// ========================================================================

// C ref: dog.c:90-101 pet_type()
function pet_type(roleIndex) {
    const role = roles[roleIndex];
    if (role.petType === 'pony') return PM_PONY;
    if (role.petType === 'cat') return PM_KITTEN;
    if (role.petType === 'dog') return PM_LITTLE_DOG;
    return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}

function is_domestic(ptr) { return !!(ptr.flags2 & M2_DOMESTIC); }

// C ref: dog.c makedog()
export function makedog(map, player, depth) {
    const pmIdx = pet_type(player.roleIndex);
    let petName = '';
    if (pmIdx === PM_LITTLE_DOG) {
        if (player.roleIndex === PM_CAVEMAN) petName = 'Slasher';
        else if (player.roleIndex === PM_SAMURAI) petName = 'Hachi';
        else if (player.roleIndex === PM_BARBARIAN) petName = 'Idefix';
        else if (player.roleIndex === PM_RANGER) petName = 'Sirius';
    }

    const pet = makemon(pmIdx, player.x, player.y, MM_EDOG | NO_MINVENT, depth, map);
    if (!pet) return null;

    if (pmIdx === PM_PONY) {
        const saddleObj = mksobj(SADDLE, true, false);
        if (saddleObj) {
            saddleObj.owornmask = 0x100000; // W_SADDLE
            mpickobj(pet, saddleObj);
            pet.misc_worn_check = 0x100000;
        }
    }

    if (petName) pet.name = petName;

    // C ref: dog.c:271 — initedog(mtmp, TRUE)
    pet.tame = true;
    pet.mtame = is_domestic(mons[pmIdx]) ? 10 : 5;
    pet.peaceful = true;
    pet.mpeaceful = true;
    pet.edog.apport = 0;
    pet.edog.hungrytime = 1000;
    pet.edog.droptime = 0;
    pet.edog.dropdist = 10000;
    pet.edog.whistletime = 0;
    pet.edog.ogoal = { x: 0, y: 0 };
    pet.edog.abuse = 0;
    pet.edog.revivals = 0;
    pet.edog.mhpmax_penalty = 0;
    pet.edog.killed_by_u = false;

    return pet;
}

// ========================================================================
// mon_arrive — C ref: dog.c:474
// Pet/follower migration between levels.
// ========================================================================

export const MON_ARRIVE_WITH_YOU = 'With_you';

// C ref: teleport.c collect_coords() — collect positions by ring and shuffle.
// Used by mon_arrive for mnexto-style placement.
function collectCoordsShuffle(cx, cy, maxRadius) {
    const allPositions = [];
    for (let radius = 1; radius <= maxRadius; radius++) {
        const ring = [];
        const loy = cy - radius, hiy = cy + radius;
        const lox = cx - radius, hix = cx + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                if (isok(x, y)) ring.push({ x, y });
            }
        }
        let start = 0;
        let n = ring.length;
        while (n > 1) {
            const k = rn2(n);
            if (k !== 0) {
                const temp = ring[start];
                ring[start] = ring[start + k];
                ring[start + k] = temp;
            }
            start++;
            n--;
        }
        for (const pos of ring) allPositions.push(pos);
    }
    return allPositions;
}

// C ref: teleport.c goodpos() subset for mon_arrive/mnexto placement.
function arrivalGoodPos(map, mon, x, y) {
    const loc = map.at(x, y);
    if (!loc || !ACCESSIBLE(loc.typ)) return false;
    if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED))) return false;
    if (map.monsterAt(x, y)) return false;
    const flags1 = mon?.type?.flags1 || 0;
    const canFlyOrSwim = !!(flags1 & (M1_FLY | M1_SWIM | M1_AMPHIBIOUS));
    if ((loc.typ === POOL || loc.typ === LAVAPOOL) && !canFlyOrSwim) return false;
    return true;
}

// C ref: dog.c mon_catchup_elapsed_time()
function monCatchupElapsedTime(mtmp, nmv) {
    const imv = Math.max(0, Math.min(0x7ffffffe, Math.trunc(nmv || 0)));
    if (!imv) return;

    if (mtmp.mtrapped && rn2(imv + 1) > 20) mtmp.mtrapped = false;
    if (mtmp.mconf && rn2(imv + 1) > 25) mtmp.mconf = false;
    if (mtmp.mstun && rn2(imv + 1) > 5) mtmp.mstun = false;

    if (Number.isInteger(mtmp.meating) && mtmp.meating > 0) {
        if (imv > mtmp.meating) mtmp.meating = 0;
        else mtmp.meating -= imv;
    }

    if ((mtmp.mtame || 0) > 0) {
        const wilder = Math.floor((imv + 75) / 150);
        if (mtmp.mtame > wilder) mtmp.mtame -= wilder;
        else if (mtmp.mtame > rn2(Math.max(1, wilder))) mtmp.mtame = 0;
        else {
            mtmp.mtame = 0;
            mtmp.mpeaceful = 0;
        }
    }
}

// C ref: dog.c:474 mon_arrive() — tame pets follow player between levels.
export function mon_arrive(oldMap, newMap, player, opts = {}) {
    if (!oldMap || !newMap) return false;
    const when = opts.when || MON_ARRIVE_WITH_YOU;
    const sourceHeroX = Number.isInteger(opts.sourceHeroX) ? opts.sourceHeroX : player.x;
    const sourceHeroY = Number.isInteger(opts.sourceHeroY) ? opts.sourceHeroY : player.y;
    const heroX = Number.isInteger(opts.heroX) ? opts.heroX : player.x;
    const heroY = Number.isInteger(opts.heroY) ? opts.heroY : player.y;
    const currentMoves = Number.isInteger(opts.moves)
        ? opts.moves
        : (Number.isInteger(player?.turns) ? player.turns : 0);
    const failedArrivals = Array.isArray(opts.failedArrivals)
        ? opts.failedArrivals
        : (newMap.failedArrivals || (newMap.failedArrivals = []));
    const oldFailed = Array.isArray(oldMap.failedArrivals) ? oldMap.failedArrivals : [];
    const oldFailedSet = new Set(oldFailed);
    const seen = new Set();
    const addUnique = (arr, mon) => {
        if (!mon || seen.has(mon)) return;
        seen.add(mon);
        arr.push(mon);
    };

    const candidates = [];
    for (const m of oldFailed) addUnique(candidates, m);
    for (const m of (oldMap.monsters || [])) addUnique(candidates, m);

    const pets = candidates.filter((m) => {
        const tameLike = !!m?.tame || (m?.mtame || 0) > 0;
        if (!m || m.dead || !tameLike) return false;
        if (oldFailedSet.has(m)) return true;
        if (m.mtrapped || m.meating) return false;
        const dx = Math.abs((m.mx ?? 0) - sourceHeroX);
        const dy = Math.abs((m.my ?? 0) - sourceHeroY);
        return dx <= 1 && dy <= 1;
    });
    if (pets.length === 0) return false;
    if (oldFailed.length) oldMap.failedArrivals = [];

    let migratedCount = 0;

    for (let i = pets.length - 1; i >= 0; i--) {
        const pet = pets[i];
        const wasOnOldMap = oldMap.monsters.includes(pet);
        if (wasOnOldMap) {
            oldMap.removeMonster(pet);
        }
        const mtame = pet.mtame || (pet.tame ? 10 : 0);
        const bound = mtame > 0 ? 10 : (pet.mpeaceful ? 5 : 2);

        pet.mux = heroX;
        pet.muy = heroY;
        pet.mtrack = new Array(4).fill(null).map(() => ({ x: 0, y: 0 }));

        let petX = 0;
        let petY = 0;
        let foundPos = false;

        if (when === MON_ARRIVE_WITH_YOU) {
            if (!newMap.monsterAt(heroX, heroY) && !rn2(bound)) {
                petX = heroX;
                petY = heroY;
                foundPos = true;
            } else {
                const positions = collectCoordsShuffle(heroX, heroY, 3);
                for (const pos of positions) {
                    if (arrivalGoodPos(newMap, pet, pos.x, pos.y)
                        && !(pos.x === heroX && pos.y === heroY)) {
                        petX = pos.x;
                        petY = pos.y;
                        foundPos = true;
                        break;
                    }
                }
            }
        } else {
            let localeX = Number.isInteger(opts.localeX) ? opts.localeX : heroX;
            let localeY = Number.isInteger(opts.localeY) ? opts.localeY : heroY;
            const exact = !!opts.localeExact;
            let wander = exact ? 0 : Math.max(0, Math.min(8, opts.wander || 0));
            const randomPlacement = !!opts.randomPlacement;
            const shouldCatchup = Number.isInteger(pet.mlstmv)
                && pet.mlstmv < (currentMoves - 1);

            if (shouldCatchup) {
                const nmv = (currentMoves - 1) - pet.mlstmv;
                monCatchupElapsedTime(pet, nmv);
                if (!exact && !Number.isInteger(opts.wander)) {
                    wander = Math.max(0, Math.min(8, nmv));
                }
            }

            if (wander > 0 && localeX > 0) {
                const xmin = Math.max(1, localeX - wander);
                const xmax = Math.min(COLNO - 1, localeX + wander);
                const ymin = Math.max(0, localeY - wander);
                const ymax = Math.min(ROWNO - 1, localeY + wander);
                localeX = rn1(xmax - xmin + 1, xmin);
                localeY = rn1(ymax - ymin + 1, ymin);
            }

            if (randomPlacement) {
                for (let tries = 0; tries < (COLNO * ROWNO); tries++) {
                    const rx = rn1(COLNO - 1, 1);
                    const ry = rn2(ROWNO);
                    if (arrivalGoodPos(newMap, pet, rx, ry)) {
                        petX = rx;
                        petY = ry;
                        foundPos = true;
                        break;
                    }
                }
            } else {
                const exactLoc = newMap.at(localeX, localeY);
                if (exact && exactLoc && arrivalGoodPos(newMap, pet, localeX, localeY)) {
                    petX = localeX;
                    petY = localeY;
                    foundPos = true;
                } else {
                    const positions = collectCoordsShuffle(localeX, localeY, 3);
                    for (const pos of positions) {
                        if (arrivalGoodPos(newMap, pet, pos.x, pos.y)) {
                            petX = pos.x;
                            petY = pos.y;
                            foundPos = true;
                            break;
                        }
                    }
                }
            }
        }
        if (!foundPos) {
            if (!failedArrivals.includes(pet)) failedArrivals.push(pet);
            continue;
        }

        pet.mx = petX;
        pet.my = petY;
        pet.sleeping = false;
        pet.dead = false;
        if (Number.isInteger(currentMoves)) pet.mlstmv = currentMoves;
        if ('migrating' in pet) pet.migrating = false;
        if ('limbo' in pet) pet.limbo = false;
        newMap.addMonster(pet);
        migratedCount++;
    }

    return migratedCount > 0;
}
