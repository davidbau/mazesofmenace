// dog.js -- starting pet creation.
// C ref: dog.c:makedog(), makemon.c:makemon() near-hero placement.

import { game } from './gstate.js';
import { enexto_core, makemon } from './mklev.js';
import { OBJECT_CLASS } from './object_data.js';
import {
    ACCFOOD, APPORT, CADAVER, DOGFOOD, MANFOOD, TABU, UNDEF,
    D_CLOSED, D_LOCKED, GP_AVOID_MONPOS, GP_CHECKSCARY, IS_DOOR, IS_OBSTRUCTED,
    IS_LAVA, IS_POOL, IS_ROOM, MM_EDOG, NO_MINVENT, SPACE_POS,
    isok,
} from './const.js';
import { rn2 } from './rng.js';
import { clear_path } from './vision.js';

const FOOD_CLASS = 7;
const ROCK_CLASS = 14;
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
const BELL_OF_OPENING = 263;
const CANDELABRUM_OF_INVOCATION = 262;

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
    let pet = migrating?.data || game.pet_type || configuredPetType();
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
        mhp: migrating?.mhp ?? 1,
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
    return Math.max(1, obj.quan || 1);
}

function pet_can_see_object(mtmp, x, y) {
    return clear_path(mtmp.mx, mtmp.my, x, y);
}

function pet_can_step(mtmp, x, y) {
    if (!isok(x, y)) return false;
    if (x === game.u?.ux && y === game.u?.uy) return false;
    if (mon_at(x, y, mtmp)) return false;
    const loc = game.level?.at(x, y);
    return !!loc && SPACE_POS(loc.typ);
}

function pet_goal(mtmp, after, udist) {
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
    const inMastersSight = true;
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
    if (udist > 1 && (!loc || !IS_ROOM(loc.typ) || !rn2(4)
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

export function dog_move(mtmp, after = true) {
    const udist = dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my);
    if (!udist) return 0;

    const goal = pet_goal(mtmp, after, udist);
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
            if (!pet_can_step(mtmp, nx, ny)) continue;

            // NetHack lessens backtracking only for pets more than five
            // squares from the hero.  Track history is not modeled yet.
            if (distmin(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my) > 5) {
                // Placeholder for dogmove.c mtrack avoidance; no RNG without
                // real track state because that would invent consumers.
            }

            const ndist = dist2(nx, ny, goal.gx, goal.gy);
            const j = (ndist - nidist) * goal.appr;
            if ((j === 0 && !rn2(++chcnt))
                || j < 0
                || (j > 0 && ((mtmp.mx === nix && mtmp.my === niy && !rn2(3)) || !rn2(12)))) {
                nix = nx;
                niy = ny;
                nidist = ndist;
            }
        }
    }

    if (nix === mtmp.mx && niy === mtmp.my) return 0;
    mtmp.mx = nix;
    mtmp.my = niy;
    return 1;
}
