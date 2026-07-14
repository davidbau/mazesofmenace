// dog.js — Starting pet.
// C ref: dog.c — pet_type, makedog.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { makemon } from './makemon.js';
import { mons, NON_PM } from './monsters.js';
import { MM_EDOG, NO_MINVENT, STRAT_WAITFORU } from './const.js';
import {
    monsterNames,
    PM_CAVE_DWELLER,
    PM_SAMURAI,
    PM_BARBARIAN,
    PM_RANGER,
} from './generated/monsters_data.js';
import { acurr, A_CHA } from './attrib.js';
import { christen_monst } from './do_name.js';
import { monnear, m_at } from './mon.js';
import { enexto, rloc_to } from './teleport.js';
import { put_saddle_on_mon } from './steed.js';

const PM_LITTLE_DOG = monsterNames.indexOf('PM_LITTLE_DOG');
const PM_KITTEN = monsterNames.indexOf('PM_KITTEN');
const PM_PONY = monsterNames.indexOf('PM_PONY');

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

// C ref: dog.c pet_type()
function pet_type() {
    const rolePet = game.urole?.petnum;
    if (rolePet != null && rolePet !== NON_PM && rolePet >= 0) return rolePet;
    const pref = game.preferred_pet;
    if (pref === 'c') return PM_KITTEN;
    if (pref === 'd') return PM_LITTLE_DOG;
    return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}

// C ref: dog.c initedog()
function initedog(mtmp, everything) {
    if (!mtmp.edog) mtmp.edog = {};
    const edogp = mtmp.edog;
    const minhungry = (game.moves ?? 1) + 1000;
    mtmp.mtame = Math.max(10, mtmp.mtame || 0);
    mtmp.mpeaceful = 1;
    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        // C: ACURR(A_CHA) at makedog — before init_attr, clamps to 3
        edogp.apport = acurr(A_CHA);
        edogp.whistletime = 0;
        edogp.ogoal = { x: 0, y: 0 }; // C: ogoal.x==0 means unset
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else if ((edogp.apport || 0) <= 0) {
        edogp.apport = 1;
    }
    if ((edogp.hungrytime || 0) < minhungry) edogp.hungrytime = minhungry;
    // C: u.uconduct.pets++ (livelog only when !pets && in_moveloop — deferred)
    if (!game.u) game.u = {};
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.pets = (game.u.uconduct.pets | 0) + 1;
}

// C ref: dog.c makedog()
export function makedog() {
    if (game.preferred_pet === 'n') {
        if (!game.context) game.context = {};
        game.context.startingpet_typ = NON_PM;
        return null;
    }

    const pettype = pet_type();
    if (!game.context) game.context = {};
    game.context.startingpet_typ = pettype;

    // C: option dogname / catname / horsename, else role defaults for dogs
    let petname = (pettype === PM_LITTLE_DOG) ? (game.dogname || '')
        : (pettype === PM_KITTEN) ? (game.catname || '')
            : (pettype === PM_PONY) ? (game.horsename || '')
                : '';
    if (!petname && pettype === PM_LITTLE_DOG) {
        if (Role_if(PM_CAVE_DWELLER)) petname = 'Slasher';
        if (Role_if(PM_SAMURAI)) petname = 'Hachi';
        if (Role_if(PM_BARBARIAN)) petname = 'Idefix';
        if (Role_if(PM_RANGER)) petname = 'Sirius';
    }

    const ptr = mons(pettype);
    if (!ptr) return null;

    let mtmp = makemon(ptr, game.u?.ux ?? 0, game.u?.uy ?? 0, MM_EDOG | NO_MINVENT);
    if (!mtmp) return null;

    if (!game.context.startingpet_mid) {
        game.context.startingpet_mid = mtmp.m_id ?? 1;
        // C: initial horses wear a saddle (pauper excluded); see_monster_closeup deferred
        if (!game.u?.uroleplay?.pauper && pettype === PM_PONY) {
            put_saddle_on_mon(null, mtmp);
        }
    }

    // C: if (!gp.petname_used++ && *petname) christen_monst
    const used = game.petname_used || 0;
    game.petname_used = used + 1;
    if (!used && petname) mtmp = christen_monst(mtmp, petname);

    initedog(mtmp, true);
    return mtmp;
}

/** C ref: mondata.c levl_follower — pets / wiz / stalkers follow across levels. */
export function levl_follower(mtmp) {
    if (mtmp === game.u?.usteed) return true;
    if (mtmp.iswiz && mtmp.minvent) {
        // mon_has_amulet deferred — wiz with amulet won't follow
    }
    if (mtmp.mtame || mtmp.iswiz) return true;
    // M2_STALK / fleeing / amulet deferred
    return false;
}

/**
 * C ref: dog.c keepdogs — move nearby followers onto mydogs before level leave.
 * pets_only path and migrate_to_level / leash / wizard chase deferred.
 */
export function keepdogs(pets_only = false) {
    const u = game.u;
    const list = game.fmon || [];
    const stay = [];
    if (!game.mydogs) game.mydogs = [];

    for (const mtmp of list) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) {
            stay.push(mtmp);
            continue;
        }
        if (pets_only && !mtmp.mtame) {
            stay.push(mtmp);
            continue;
        }
        const near = monnear(mtmp, u.ux, u.uy);
        const follow = levl_follower(mtmp);
        const helpless = !mtmp.mcanmove || mtmp.msleeping || (mtmp.mfrozen | 0) > 0;
        const waiting = !!(mtmp.mstrategy & STRAT_WAITFORU);
        if (near && follow && (!helpless || mtmp === u.usteed) && !waiting) {
            if (mtmp.meating || mtmp.mtrapped) {
                stay.push(mtmp);
                continue;
            }
            // Onto mydogs; mx=0 marks migrating
            game.mydogs.push(mtmp);
            mtmp.mx = 0;
            mtmp.my = 0;
            mtmp.mlstmv = game.moves | 0;
        } else {
            stay.push(mtmp);
        }
    }
    game.fmon = stay;
}

/**
 * C ref: dog.c mon_arrive(With_you) — place accompanying pet near hero.
 */
function mon_arrive_with_you(mtmp) {
    const u = game.u;
    if (!game.fmon) game.fmon = [];
    game.fmon.unshift(mtmp);
    mtmp.mux = u.ux;
    mtmp.muy = u.uy;
    if (mtmp === u.usteed) return;

    const onSpot = m_at(u.ux, u.uy);
    if (!onSpot && !rn2(mtmp.mtame ? 10 : mtmp.mpeaceful ? 5 : 2)) {
        rloc_to(mtmp, u.ux, u.uy);
    } else {
        // C: mnexto — enexto near hero then rloc_to
        const mm = { x: 0, y: 0 };
        if (enexto(mm, u.ux, u.uy, mtmp.data)) rloc_to(mtmp, mm.x, mm.y);
        else rloc_to(mtmp, u.ux, u.uy);
    }
}

/**
 * C ref: dog.c losedogs — place mydogs (With_you); migrating_mons deferred.
 */
export function losedogs() {
    const dogs = game.mydogs || [];
    game.mydogs = [];
    for (const mtmp of dogs) {
        mon_arrive_with_you(mtmp);
    }
}
