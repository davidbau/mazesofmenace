// dog.js — pets.
// C ref: dog.c — newedog, initedog, pet_type, makedog.
//
// Not ported yet: make_familiar, pick_familiar_pm, dog movement/food
// (dogmove.c), keepdogs/losedogs, tamedog and the rest of dog.c.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { A_CHA, MM_EDOG, NO_MINVENT, NON_PM } from './const.js';
import { mons, PM_LITTLE_DOG, PM_KITTEN, PM_PONY, PM_CAVE_DWELLER,
         PM_SAMURAI, PM_BARBARIAN, PM_RANGER } from './monsters.js';
import { makemon, is_domestic, set_malign, put_saddle_on_mon } from './makemon.js';

// C ref: attrib.h ACURR() -- acurr() is not ported yet; u.acurr holds the
// current value (still zero this early in newgame()).
function ACURR(x) { return game.u.acurr?.a?.[x] || 0; }

// C ref: role.c Role_if()
function Role_if(pm) { return game.urole.mnum === pm; }

// C ref: dog.c newedog()
export function newedog(mtmp) {
    /* if (!mtmp->mextra) mtmp->mextra = newmextra(); -- mextra fields
       live directly on the monster in JS */
    if (!mtmp.edog) {
        /* alloc + memset(0) */
        mtmp.edog = {
            droptime: 0, dropdist: 0, apport: 0, whistletime: 0,
            hungrytime: 0, ogoal: { x: 0, y: 0 }, abuse: 0, revivals: 0,
            mhpmax_penalty: 0, killed_by_u: 0, parentmid: 0,
        };
        mtmp.edog.parentmid = mtmp.m_id;
    }
}

// C ref: dog.c initedog()
export function initedog(mtmp, everything) {
    const edogp = mtmp.edog;
    const minhungry = (game.moves || 0) + 1000;
    const minimumtame = is_domestic(mtmp.data) ? 10 : 5;

    mtmp.mtame = Math.max(minimumtame, mtmp.mtame || 0);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    set_malign(mtmp); /* recalc alignment now that it's tamed */
    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        edogp.apport = ACURR(A_CHA);
        edogp.whistletime = 0;
        /* edogp->hungrytime = 0L; // set below */
        edogp.ogoal = { x: -1, y: -1 }; /* force error if used before set */
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else {
        if (edogp.apport <= 0)
            edogp.apport = 1;
    }
    /* always set for newly tamed pet or feral former pet; hungrytime might
       already be higher when taming magic affects already tame monst */
    if (edogp.hungrytime < minhungry)
        edogp.hungrytime = minhungry;
    /* livelog of the first pet (only once in_moveloop): not ported yet */
    game.u.uconduct.pets = (game.u.uconduct.pets || 0) + 1;
}

// C ref: dog.c pet_type()
function pet_type() {
    if (game.urole.petnum !== NON_PM)
        return game.urole.petnum;
    else if (game.preferred_pet === 'c')
        return PM_KITTEN;
    else if (game.preferred_pet === 'd')
        return PM_LITTLE_DOG;
    else
        return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}

// C ref: do_name.c christen_monst() -- only records the name; the
// name-length limit and the shopkeeper/priest name handling are not
// needed for a starting pet.
function christen_monst(mtmp, name) {
    mtmp.mgivenname = name;
    return mtmp;
}

// C ref: dog.c makedog()
export function makedog() {
    const g = game;
    let mtmp;
    let petname;
    let pettype;

    if (!g.context) g.context = {};
    if (g.preferred_pet === 'n') {
        /* static init yields 0 (PM_GIANT_ANT); fix that up now */
        g.context.startingpet_typ = NON_PM;
        return null;
    }

    pettype = g.context.startingpet_typ = pet_type();
    petname = (pettype === PM_LITTLE_DOG) ? (g.dogname || '')
              : (pettype === PM_KITTEN) ? (g.catname || '')
                : (pettype === PM_PONY) ? (g.horsename || '')
                  : '';

    /* default pet names */
    if (!petname && pettype === PM_LITTLE_DOG) {
        /* All of these names were for dogs. */
        if (Role_if(PM_CAVE_DWELLER))
            petname = "Slasher"; /* The Warrior */
        if (Role_if(PM_SAMURAI))
            petname = "Hachi"; /* Shibuya Station */
        if (Role_if(PM_BARBARIAN))
            petname = "Idefix"; /* Obelix */
        if (Role_if(PM_RANGER))
            petname = "Sirius"; /* Orion's dog */
    }

    /* specifying NO_MINVENT prevents makemon() from having a 1% chance
       of creating a pony with an already worn saddle; dogs and cats
       aren't affected because they don't have any initial inventory
       [if anybody adds stranger pets that are expected to have such,
       they'll need to modify this] */
    mtmp = makemon(mons[pettype], g.u.ux, g.u.uy, MM_EDOG | NO_MINVENT);

    if (!mtmp)
        return null; /* pets were genocided [how?] */

    if (!g.context.startingpet_mid) {
        g.context.startingpet_mid = mtmp.m_id;
        if (!g.u.uroleplay.pauper) {
            /* initial horses start wearing a saddle (pauper hero excluded) */
            if (pettype === PM_PONY) {
                /* NULL obj arg means put_saddle_on_mon()
                 * will carry out the saddle creation */
                put_saddle_on_mon(null, mtmp);
            }
        }
        /* starting pet's type has been seen up close (unless PermaBlind)
           and for tourist treat it as having already been photographed */
        g.bhitpos = { x: mtmp.mx, y: mtmp.my };
        g.notonhead = false;
        /* see_monster_closeup(): mvitals seen bits only, not ported yet */
    } else {
        console.error("impossible: makedog() when startingpet_mid is already non-zero?");
    }

    const petname_used = g.petname_used || 0; /* gp.petname_used++ */
    g.petname_used = petname_used + 1;
    if (!petname_used && petname)
        mtmp = christen_monst(mtmp, petname);

    initedog(mtmp, true);
    return mtmp;
}
