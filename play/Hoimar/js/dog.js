// dog.js -- starting pet creation.
// C ref: dog.c:makedog(), makemon.c:makemon() near-hero placement.

import { game } from './gstate.js';
import { enexto_core, makemon } from './mklev.js';
import { GP_AVOID_MONPOS, GP_CHECKSCARY, MM_EDOG, NO_MINVENT } from './const.js';
import { rn2 } from './rng.js';

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
};

const PM_PONY = {
    name: 'PONY',
    mlet: 'S_UNICORN',
    mlevel: 3,
    difficulty: 4,
    maligntyp: 0,
    geno: 0x0080 | 1,
    mmove: 16,
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
    }
    return mon;
}

export function pet_arrive_with_you() {
    let pet = game.pet_type || configuredPetType();
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
        ch,
        color: 15,
        data: { ...pet },
        mhp: 1,
        female: false,
        msleeping: 0,
        mpeaceful: 1,
        mtame: 10,
        movement: 12,
    };
    if (game.level?.monsters) game.level.monsters.unshift(mon);
    return mon;
}
