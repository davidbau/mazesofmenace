// dog.js -- starting pet creation.
// C ref: dog.c:makedog(), makemon.c:makemon() near-hero placement.

import { game } from './gstate.js';
import { enexto_core, makemon, place_object } from './mklev.js';
import { OBJECT_CLASS } from './object_data.js';
import { newsym, pline, queue_more_prompt, flush_screen, clear_pending_message } from './display.js';
import { nhgetch } from './input.js';
import {
    ACCFOOD, APPORT, CADAVER, DOGFOOD, MANFOOD, TABU, UNDEF,
    D_CLOSED, D_LOCKED, GP_AVOID_MONPOS, GP_CHECKSCARY, IS_DOOR, IS_OBSTRUCTED,
    IS_LAVA, IS_POOL, IS_ROOM, MM_EDOG, NO_MINVENT, SPACE_POS,
    isok,
} from './const.js';
import { d, rn2, rnd } from './rng.js';
import { clear_path } from './vision.js';

const FOOD_CLASS = 7;
const ROCK_CLASS = 14;
const QUARTERSTAFF = 79;
const TRIPE_RATION = 264;
const BOULDER = 475;
const CORPSE = 265;
const EGG = 266;
const MEATBALL = 267;
const MEAT_STICK = 268;
const ENORMOUS_MEATBALL = 269;
const GLOB_OF_GREEN_SLIME = 273;
const BANANA = 281;
const CARROT = 282;
const CLOVE_OF_GARLIC = 284;
const SLIME_MOLD = 285;
const TIN = 296;
const TINNING_KIT = 238;
const BELL_OF_OPENING = 263;
const CANDELABRUM_OF_INVOCATION = 262;
const DOG_HUNGRY = 300;
const M2_STRONG = 0x04000000;

const OBJECT_WEIGHT_OVERRIDES = new Map([
    [TINNING_KIT, 100],
]);

// These ids come from the generated object table used by mklev.js.
const AMULET_OF_YENDOR = 185;
const SPE_BOOK_OF_THE_DEAD = 373;

const PM_LITTLE_DOG = {
    name: 'LITTLE_DOG',
    mlet: 'S_DOG',
    mlevel: 2,
    difficulty: 3,
    maligntyp: 0,
    geno: 0x0080 | 1,
    mmove: 18,
};

const PM_KITTEN = {
    name: 'KITTEN',
    mlet: 'S_FELINE',
    mlevel: 2,
    difficulty: 3,
    maligntyp: 0,
    geno: 0x0080 | 1,
    mmove: 18,
    m2_wander: true,
};

const PM_PONY = {
    name: 'PONY',
    mlet: 'S_UNICORN',
    mlevel: 3,
    difficulty: 4,
    maligntyp: 0,
    geno: 0x0080 | 1,
    mmove: 16,
    m2_wander: true,
};

function configuredPetType() {
    switch (game.preferred_pet) {
    case 'n': return null;
    case 'c': return PM_KITTEN;
    case 'd': return PM_LITTLE_DOG;
    default: break;
    }

    switch (game.urole?.name?.m) {
    case 'Caveman':
    case 'Ranger':
    case 'Samurai':
        return PM_LITTLE_DOG;
    case 'Knight':
        return PM_PONY;
    case 'Wizard':
        return PM_KITTEN;
    default:
        // C's default is rn2(2) ? kitten : little dog.
        return undefined;
    }
}

export async function makedog() {
    let pet = configuredPetType();
    if (pet === null) return null;
    if (pet === undefined) {
        pet = rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
    }
    const mon = await makemon(pet, game.u.ux, game.u.uy, MM_EDOG | NO_MINVENT);
    if (mon) {
        game.pet_type = pet;
        mon.mtame = Math.max(10, mon.mtame || 0);
        mon.mpeaceful = 1;
        init_edog(mon);
    }
    return mon;
}

function hero_charisma() {
    const cha = game.u?.acurr?.a?.[5] ?? 0;
    if (cha <= 3) return 3;
    if (cha >= 25) return 25;
    return cha;
}

function init_edog(mon) {
    if (!mon.edog) {
        mon.edog = {
            apport: hero_charisma(),
            hungrytime: 1000,
            mhpmax_penalty: 0,
            whistletime: 0,
            ogoal: { x: 0, y: 0 },
        };
    } else if (!mon.edog.apport || mon.edog.apport <= 0) {
        mon.edog.apport = hero_charisma();
    }
    return mon.edog;
}

export function pet_arrive_with_you() {
    const migrating = game._migrating_pet || null;
    game._migrating_pet = null;
    if (!migrating) return null;
    let pet = migrating.data;
    if (!pet) return null;
    game.pet_type = pet;

    const exact = !rn2(10);
    let x = game.u.ux;
    let y = game.u.uy;
    if (!exact) {
        const flags = GP_CHECKSCARY | GP_AVOID_MONPOS;
        const cc = enexto_core(game.u.ux, game.u.uy, pet, flags)
            || enexto_core(game.u.ux, game.u.uy, pet, flags & ~GP_CHECKSCARY);
        if (!cc) return null;
        x = cc.x;
        y = cc.y;
    }

    const ch = pet === PM_KITTEN ? 'f' : pet === PM_PONY ? 'u' : 'd';
    const mon = {
        mx: x, my: y,
        ch: migrating?.ch || ch,
        color: migrating?.color ?? 15,
        data: { ...pet },
        m_lev: migrating?.m_lev ?? pet.mlevel ?? 0,
        mhp: migrating?.mhp ?? 1,
        mhpmax: migrating?.mhpmax ?? migrating?.mhp ?? 1,
        female: migrating?.female ?? false,
        msleeping: migrating?.msleeping ?? 0,
        mpeaceful: migrating?.mpeaceful ?? 1,
        mtame: migrating?.mtame ?? 10,
        movement: migrating?.movement ?? 0,
    };
    if (migrating?.edog) mon.edog = { ...migrating.edog };
    init_edog(mon);
    if (game.level?.monsters) game.level.monsters.unshift(mon);
    return mon;
}

function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

function sgn(value) {
    return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function mon_at(x, y, self) {
    return game.level?.monsters?.find((mon) => mon !== self && mon.mx === x && mon.my === y);
}

function object_class(otyp) {
    return OBJECT_CLASS[otyp] || 0;
}

function objects_at(x, y) {
    return (game.level?.objects || []).filter((obj) => obj.ox === x && obj.oy === y);
}

function cursed_object_at(x, y) {
    return objects_at(x, y).some((obj) => obj.cursed);
}

function is_boulder_at(x, y) {
    return objects_at(x, y).some((obj) => obj.otyp === BOULDER);
}

function is_sokoban_level() {
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    return !!game.level?.flags?.sokoban_rules || dungeon?.dname === 'Sokoban';
}

function avoid_soko_push_loc(mtmp, nx, ny) {
    if (!is_sokoban_level()) return false;
    if (!(mtmp.mpeaceful || mtmp.mtame)) return false;
    if (mtmp.mconf || mtmp.mstun || game.u?.conflict) return false;
    const ux = game.u?.ux ?? nx;
    const uy = game.u?.uy ?? ny;
    if (dist2(nx, ny, ux, uy) !== 4) return false;
    return is_boulder_at(nx + sgn(ux - nx), ny + sgn(uy - ny));
}

function obj_resists(obj, ochance, achance) {
    if (obj.otyp === AMULET_OF_YENDOR
        || obj.otyp === SPE_BOOK_OF_THE_DEAD
        || obj.otyp === CANDELABRUM_OF_INVOCATION
        || obj.otyp === BELL_OF_OPENING
        || (obj.otyp === CORPSE && obj.corpsenm?.is_rider)) {
        return true;
    }
    const chance = rn2(100);
    return chance < (obj.oartifact ? achance : ochance);
}

function pet_diet(mtmp) {
    if (mtmp.data?.mlet === 'S_UNICORN') return { carni: false, herbi: true };
    return { carni: true, herbi: false };
}

function dogfood(mtmp, obj) {
    // C ref: dog.c:dogfood().  The object-resistance check is deliberately
    // first; it is a common hidden RNG consumer before pet goal selection.
    if (obj_resists(obj, 0, 95)) return obj.cursed ? TABU : APPORT;
    if (object_class(obj.otyp) === FOOD_CLASS) {
        const { carni, herbi } = pet_diet(mtmp);
        switch (obj.otyp) {
        case TRIPE_RATION:
        case MEATBALL:
        case MEAT_STICK:
        case ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;
        case CORPSE:
            return carni ? CADAVER : MANFOOD;
        case EGG:
            return carni ? CADAVER : MANFOOD;
        case GLOB_OF_GREEN_SLIME:
            return MANFOOD;
        case CLOVE_OF_GARLIC:
            return herbi ? ACCFOOD : MANFOOD;
        case TIN:
            return MANFOOD;
        case BANANA:
            return herbi ? ACCFOOD : MANFOOD;
        case CARROT:
            return herbi ? DOGFOOD : MANFOOD;
        default:
            if (obj.otyp > SLIME_MOLD) return carni ? ACCFOOD : MANFOOD;
            return herbi ? ACCFOOD : MANFOOD;
        }
    }
    if (object_class(obj.otyp) === ROCK_CLASS) return UNDEF;
    return obj.cursed ? UNDEF : APPORT;
}

function could_reach_item(mtmp, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (IS_POOL(loc.typ) && !mtmp.data?.swimmer) return false;
    if (IS_LAVA(loc.typ) && !mtmp.data?.likes_lava) return false;
    if (is_boulder_at(x, y) && !mtmp.data?.throws_rocks) return false;
    return true;
}

function can_reach_location(mtmp, mx, my, fx, fy, depth = 0) {
    if (mx === fx && my === fy) return true;
    if (!isok(mx, my) || depth > 6) return false;

    const curdist = dist2(mx, my, fx, fy);
    for (let x = mx - 1; x <= mx + 1; x++) {
        for (let y = my - 1; y <= my + 1; y++) {
            if (!isok(x, y)) continue;
            if (dist2(x, y, fx, fy) >= curdist) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (IS_OBSTRUCTED(loc.typ)) continue;
            if (IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED))) continue;
            if (!could_reach_item(mtmp, x, y)) continue;
            if (can_reach_location(mtmp, x, y, fx, fy, depth + 1)) return true;
        }
    }
    return false;
}

function can_carry(mtmp, obj) {
    if (mtmp === game.u?.usteed) return 0;
    if (obj.cursed) return 0;
    if (object_class(obj.otyp) === ROCK_CLASS && obj.otyp === BOULDER && !mtmp.data?.throws_rocks) return 0;
    if (current_mon_load(mtmp) + object_weight(obj) > max_mon_load(mtmp)) return 0;
    return Math.max(1, obj.quan || 1);
}

function object_weight(obj) {
    if (!obj) return 0;
    if (typeof obj.owt === 'number' && obj.owt > 1) return obj.owt;
    return OBJECT_WEIGHT_OVERRIDES.get(obj.otyp) || obj.owt || 1;
}

function current_mon_load(mtmp) {
    return (mtmp.inventory || []).reduce((sum, obj) => sum + object_weight(obj), 0);
}

function max_mon_load(mtmp) {
    // C ref: mon.c:max_mon_load().  Monster cwt/msize are not generated
    // yet; keep known small domestic pet capacity conservative so heavy
    // tools are rejected by can_carry().
    const name = mtmp.data?.name;
    if (name === 'KITTEN' || name === 'LITTLE_DOG') return 50;
    return ((mtmp.data?.mflags2 ?? 0) & M2_STRONG) ? 1000 : 500;
}

function object_name(obj) {
    if (obj?.otyp === QUARTERSTAFF) {
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : 'uncursed ';
        const spe = typeof obj.spe === 'number' ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} ` : '';
        return `a ${buc}${spe}quarterstaff`;
    }
    return 'an object';
}

function monster_name(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function pet_name(mtmp) {
    return String(mtmp?.data?.name || 'pet').toLowerCase().replace(/_/g, ' ');
}

function occupation_message_boundary_active() {
    return (game._occupation_turns_remaining || 0) > 0 || !!game._occupation_finish_message;
}

async function append_topline_message(line) {
    if (game._pending_message?.startsWith('You start putting on ')) game._pending_message = '';
    if (game._pending_message) {
        game._pending_message = `${game._pending_message}  ${line}`;
        queue_more_prompt();
        if (occupation_message_boundary_active()) {
            // C ref: tty topline handling via pline()/--More--.  A second
            // visible pet-combat pline can block inside the monster turn,
            // before mdamagem()/mondead() apply visible death side effects.
            if (game._occupation_finish_uac != null) game.u.uac = game._occupation_finish_uac;
            await flush_screen(1);
            await nhgetch();
            clear_pending_message();
        }
    } else {
        await pline(line);
    }
}

async function pet_combat_message(mtmp, text) {
    // C ref: mhitm.c:missmm()/hitmm(). Multiple pet-combat plines can land
    // during a delayed occupation turn; tty pauses the occupation on --More--.
    await append_topline_message(`The ${pet_name(mtmp)} ${text}`);
}

function refresh_pet_attack_symbols(mtmp, target) {
    // C ref: mhitm.c:pre_mm_attack(). Refresh visible attacker and defender
    // positions before missmm()/hitmm() writes the combat pline.
    newsym(mtmp.mx, mtmp.my);
    newsym(target.mx, target.my);
}

async function finish_pet_kill(mtmp, target) {
    // C ref: mon.c:monkilled(). Monster-vs-monster death announces the
    // visible defender before corpse/death side effects run.
    await append_topline_message(`The ${monster_name(target)} is killed!`);
    rn2(3); // corpse_chance
    grow_up_from_kill(mtmp, target);
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(target);
    if (idx >= 0) monsters.splice(idx, 1);
    newsym(target.mx, target.my);
}

function dog_invent(mtmp, udist) {
    if (mtmp.meating || !game.level?.objects) return 0;
    const edog = init_edog(mtmp);
    if (mtmp.inventory?.length) {
        if ((!rn2(udist + 1) || !rn2(edog.apport)) && rn2(10) < edog.apport) {
            const obj = mtmp.inventory.shift();
            place_object(obj, mtmp.mx, mtmp.my);
            pline(`The kitten drops ${object_name(obj)}.`);
            if (edog.apport > 1) edog.apport--;
            newsym(mtmp.mx, mtmp.my);
        }
        return 0;
    }

    const omx = mtmp.mx;
    const omy = mtmp.my;
    const obj = game.level.objects.find((item) => item.ox === omx && item.oy === omy);
    if (!obj || typeof obj.otyp !== 'number') return 0;

    dogfood(mtmp, obj);
    const carryamt = can_carry(mtmp, obj);
    if (carryamt > 0 && !obj.cursed && could_reach_item(mtmp, obj.ox, obj.oy)) {
        if (rn2(20) < edog.apport + 3) {
            if (rn2(Math.max(1, udist)) || !rn2(edog.apport)) {
                const idx = game.level.objects.indexOf(obj);
                if (idx >= 0) game.level.objects.splice(idx, 1);
                mtmp.inventory = mtmp.inventory || [];
                mtmp.inventory.unshift(obj);
                pline(`The kitten picks up ${object_name(obj)}.`);
                newsym(omx, omy);
            }
        }
    }
    return 0;
}

function pet_can_see_object(mtmp, x, y) {
    return clear_path(mtmp.mx, mtmp.my, x, y);
}

function pet_master_x(mtmp) {
    return mtmp.mux ?? game.u?.ux ?? mtmp.mx;
}

function pet_master_y(mtmp) {
    return mtmp.muy ?? game.u?.uy ?? mtmp.my;
}

function find_targ(mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx;
    let cury = mtmp.my;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury)) break;
        if (!clear_path(mtmp.mx, mtmp.my, curx, cury)) break;
        if (curx === pet_master_x(mtmp) && cury === pet_master_y(mtmp)) {
            return { _hero: true, mx: curx, my: cury, mtame: 0, mpeaceful: 0 };
        }
        const targ = mon_at(curx, cury, mtmp);
        if (!targ) continue;
        if (targ.minvis || targ.mundetected) continue;
        if (targ.mx === curx && targ.my === cury) return targ;
    }
    return null;
}

function find_friends(mtmp, mtarg, maxdist) {
    const dx = sgn(mtarg.mx - mtmp.mx);
    const dy = sgn(mtarg.my - mtmp.my);
    let curx = mtarg.mx;
    let cury = mtarg.my;
    for (let dist = distmin(mtarg.mx, mtarg.my, mtmp.mx, mtmp.my); dist <= maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury)) return false;
        if (!clear_path(mtmp.mx, mtmp.my, curx, cury)) return false;
        if (curx === pet_master_x(mtmp) && cury === pet_master_y(mtmp)) return true;
        const pal = mon_at(curx, cury, mtmp);
        if (pal?.mtame && !pal.minvis) return true;
    }
    return false;
}

function monster_level(mon) {
    return mon?.m_lev ?? mon?.data?.mlevel ?? 0;
}

function score_targ(mtmp, mtarg) {
    let score = 0;
    if (!mtmp.mconf || !rn2(3)) {
        if (distmin(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my) <= 1) return -3000;
        if (mtarg.mtame || mtarg._hero) return -3000;
        if (find_friends(mtmp, mtarg, 15)) return -3000;
        if (!mtarg.mpeaceful) score += 10;
        const petLev = monster_level(mtmp);
        const targLev = monster_level(mtarg);
        if (targLev > petLev + 4) score -= (targLev - petLev) * 20;
        score += targLev * 2 + Math.trunc((mtarg.mhp ?? 0) / 3);
    }
    score += rnd(5);
    if (mtmp.mconf && !rn2(3)) score -= 1000;
    return score;
}

function best_target(mtmp, forced) {
    if (!mtmp || mtmp.mcansee === 0) return null;
    let bestScore = -40000;
    let bestTarg = null;
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            if (!dx && !dy) continue;
            const targ = find_targ(mtmp, dx, dy, 7);
            if (!targ) continue;
            const score = score_targ(mtmp, targ);
            if (score > bestScore) {
                bestScore = score;
                bestTarg = targ;
            }
        }
    }
    if (!forced && bestScore < 0) return null;
    return bestTarg;
}

function pet_ranged_attk(mtmp, forced = false) {
    const edog = init_edog(mtmp);
    const hungry = (game.moves || 0) > ((edog.hungrytime || 0) + DOG_HUNGRY);
    const mtarg = best_target(mtmp, forced);
    if (mtarg && hungry) rn2(5);
    return 0;
}

function pet_can_enter_square(mtmp, x, y, { ignoreMonster = false } = {}) {
    if (!isok(x, y)) return false;
    if (x === game.u?.ux && y === game.u?.uy) return false;
    if (!ignoreMonster && mon_at(x, y, mtmp)) return false;
    if (is_boulder_at(x, y)) return false;
    const loc = game.level?.at(x, y);
    return !!loc && (SPACE_POS(loc.typ)
        || (IS_DOOR(loc.typ) && !(loc.doormask & (D_CLOSED | D_LOCKED))));
}

function pet_can_step(mtmp, x, y) {
    return pet_can_enter_square(mtmp, x, y);
}

function pet_should_attack(mtmp, target) {
    if (!target || target.mtame) return false;
    if (target.mpeaceful && !game.Conflict) return false;
    const petLevel = monster_level(mtmp);
    const petHp = mtmp.mhp ?? petLevel;
    const petHpMax = Math.max(1, mtmp.mhpmax ?? petHp);
    const balk = petLevel + Math.trunc((5 * petHp) / petHpMax) - 2;
    if (monster_level(target) >= balk) return false;
    return true;
}

function grow_up_from_kill(mtmp, victim) {
    const currentLevel = monster_level(mtmp);
    const victimLevel = monster_level(victim);
    let hpThreshold = currentLevel * 8;
    if (!currentLevel) hpThreshold = 4;

    let maxIncrease = rnd(victimLevel + 1);
    const currentMax = mtmp.mhpmax ?? mtmp.mhp ?? Math.max(1, currentLevel);
    if (currentMax + maxIncrease > hpThreshold + 1) {
        maxIncrease = Math.max((hpThreshold + 1) - currentMax, 0);
    }
    const curIncrease = maxIncrease > 1 ? rn2(maxIncrease) : 0;
    mtmp.mhpmax = currentMax + maxIncrease;
    mtmp.mhp = (mtmp.mhp ?? currentMax) + curIncrease;

    if (mtmp.mhpmax <= hpThreshold) return;
    let levelLimit = Math.trunc(3 * (mtmp.data?.mlevel ?? currentLevel) / 2);
    if (levelLimit < 5) levelLimit = 5;
    if (currentLevel < levelLimit) mtmp.m_lev = currentLevel + 1;
}

async function pet_melee_attack(mtmp, target) {
    if (!pet_should_attack(mtmp, target)) return false;
    // C ref: dogmove.c calls mattackm() for ALLOW_M candidates before
    // ranged attacks.  This is a narrow mhitm.c front door for the current
    // pet evidence: one physical attack, miss passive check, or hit damage
    // plus death/growth follow-up RNG.
    const dieroll = rnd(20);
    if (dieroll > 10) {
        refresh_pet_attack_symbols(mtmp, target);
        await pet_combat_message(mtmp, `misses the ${monster_name(target)}.`);
        rn2(3);
        return true;
    }

    const damage = d(1, 6);
    refresh_pet_attack_symbols(mtmp, target);
    await pet_combat_message(mtmp, `bites the ${monster_name(target)}.`);
    const effectiveHp = Math.min(target.mhp ?? 1, Math.max(1, target.data?.mlevel ?? 1));
    target.mhp = effectiveHp - damage;
    rn2(3); // mhitm_knockback chance
    rn2(6); // mhitm_knockback distance/side gate
    if (target.mhp < 1) {
        await finish_pet_kill(mtmp, target);
    } else {
        rn2(3);
    }
    return true;
}

function pet_goal(mtmp, after, udist, whappr) {
    // C ref: dogmove.c:dog_goal().  This partial path scans nearby floor
    // objects before falling back to the common "follow the hero" goal.
    const gx = game.u?.ux ?? mtmp.mx;
    const gy = game.u?.uy ?? mtmp.my;
    const loc = game.level?.at(gx, gy);
    const petLoc = game.level?.at(mtmp.mx, mtmp.my);
    const edog = init_edog(mtmp);
    let goalType = UNDEF;
    let goalX = 0;
    let goalY = 0;
    let appr = udist >= 9 ? 1 : (mtmp.mflee ? -1 : 0);

    const minX = Math.max(1, mtmp.mx - 5);
    const maxX = Math.min(79, mtmp.mx + 5);
    const minY = Math.max(0, mtmp.my - 5);
    const maxY = Math.min(20, mtmp.my + 5);
    // C ref: dogmove.c uses couldsee(omx, omy).  While swallowed, C's
    // gulpmu() disables ordinary hero vision before later pet goal scans.
    const inMastersSight = !game.u?.uswallow;
    const dogHasMinvent = !!(mtmp.inventory?.length);

    for (const obj of game.level?.objects || []) {
        if (typeof obj.otyp !== 'number') continue;
        const nx = obj.ox;
        const ny = obj.oy;
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        const foodType = dogfood(mtmp, obj);
        if (foodType > goalType || foodType === UNDEF) continue;
        if (cursed_object_at(nx, ny) && !(edog.mhpmax_penalty && foodType < MANFOOD)) continue;
        if (!could_reach_item(mtmp, nx, ny)
            || !can_reach_location(mtmp, mtmp.mx, mtmp.my, nx, ny)) {
            continue;
        }

        if (foodType < MANFOOD) {
            if (foodType < goalType
                || dist2(nx, ny, mtmp.mx, mtmp.my) < dist2(goalX, goalY, mtmp.mx, mtmp.my)) {
                goalX = nx;
                goalY = ny;
                goalType = foodType;
            }
        } else if (goalType === UNDEF && inMastersSight && !dogHasMinvent
                   && (!petLoc?.lit || loc?.lit)
                   && (foodType === MANFOOD || pet_can_see_object(mtmp, nx, ny))
                   && edog.apport > rn2(8)
                   && can_carry(mtmp, obj) > 0) {
            goalX = nx;
            goalY = ny;
            goalType = APPORT;
        }
    }

    if (goalType !== UNDEF) {
        return { abort: false, gx: goalX, gy: goalY, appr: 1 };
    }

    if (after && udist <= 4) return { abort: true, gx, gy, appr };
    if (udist > 1 && (!loc || !IS_ROOM(loc.typ) || !rn2(4) || whappr
        || (dogHasMinvent && rn2(edog.apport)))) appr = 1;
    if (appr === 0) {
        for (const obj of game.inventory || []) {
            if (typeof obj.otyp !== 'number') continue;
            if (dogfood(mtmp, obj) === DOGFOOD) {
                appr = 1;
                break;
            }
        }
    }
    return { abort: false, gx, gy, appr };
}

export async function dog_move(mtmp, after = true) {
    const udist = dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my);
    if (!udist) return 0;

    const edog = init_edog(mtmp);
    dog_invent(mtmp, udist);
    const whappr = (game.moves || 0) - (edog.whistletime || 0) < 5;
    const goal = pet_goal(mtmp, after, udist, whappr);
    if (goal.abort) return 0;

    // C ref: mon.c:mfndpos() scans x first, then y.  dogmove.c then applies
    // distance-weighted reservoir selection against gg.gx/gg.gy.
    let nix = mtmp.mx;
    let niy = mtmp.my;
    let nidist = dist2(nix, niy, goal.gx, goal.gy);
    let chcnt = 0;
    const maxx = Math.min(mtmp.mx + 1, 79);
    const maxy = Math.min(mtmp.my + 1, 20);

    for (let nx = Math.max(1, mtmp.mx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, mtmp.my - 1); ny <= maxy; ny++) {
            if (nx === mtmp.mx && ny === mtmp.my) continue;
            const target = mon_at(nx, ny, mtmp);
            if (!pet_can_enter_square(mtmp, nx, ny, { ignoreMonster: !!target })) continue;
            if (target) {
                if (await pet_melee_attack(mtmp, target)) return 0;
                continue;
            }
            if (avoid_soko_push_loc(mtmp, nx, ny)) continue;

            // NetHack lessens backtracking only for pets more than five
            // squares from the hero.  Track history is not modeled yet.
            if (distmin(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my) > 5) {
                // Placeholder for dogmove.c mtrack avoidance; no RNG without
                // real track state because that would invent consumers.
            }

            const canReachFood = could_reach_item(mtmp, nx, ny);
            for (const obj of objects_at(nx, ny)) {
                if (!obj.cursed && canReachFood) {
                    const foodType = dogfood(mtmp, obj);
                    if (foodType < MANFOOD
                        && (foodType < ACCFOOD || init_edog(mtmp).hungrytime <= (game.moves || 1))) {
                        // Eating/fetching the object is still future work;
                        // this preserves the candidate-square dogfood probe.
                    }
                }
            }

            const ndist = dist2(nx, ny, goal.gx, goal.gy);
            const j = (ndist - nidist) * goal.appr;
            if ((j === 0 && !rn2(++chcnt))
                || j < 0
                || (j > 0 && !whappr
                    && ((mtmp.mx === nix && mtmp.my === niy && !rn2(3)) || !rn2(12)))) {
                nix = nx;
                niy = ny;
                nidist = ndist;
                if (j < 0) chcnt = 0;
            }
        }
    }

    pet_ranged_attk(mtmp, false);

    if (nix === mtmp.mx && niy === mtmp.my) return 0;
    const oldx = mtmp.mx;
    const oldy = mtmp.my;
    mtmp.mx = nix;
    mtmp.my = niy;
    newsym(oldx, oldy);
    newsym(nix, niy);
    return 1;
}
