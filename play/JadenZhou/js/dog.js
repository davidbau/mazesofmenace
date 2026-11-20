// dog.js — pets.
// C ref: dog.c — newedog, initedog, pet_type, makedog.
//
// Not ported yet: make_familiar, pick_familiar_pm, dog movement/food
// (dogmove.c), keepdogs/losedogs, tamedog and the rest of dog.c.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { A_CHA, MM_EDOG, NO_MINVENT, NON_PM, STRAT_WAITFORU,
         STRAT_ARRIVE, MON_MIGRATING, MON_LIMBO, MIGR_EXACT_XY, RLOC_NOMSG,
         PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { mons, PM_LITTLE_DOG, PM_KITTEN, PM_PONY, PM_CAVE_DWELLER,
         PM_SAMURAI, PM_BARBARIAN, PM_RANGER, M2_STALK,
         PM_LONG_WORM } from './monsters.js';
import { AMULET_OF_YENDOR } from './objects.js';
import { makemon, is_domestic, set_malign, put_saddle_on_mon,
         m_at, pm_to_cham } from './makemon.js';
import { monsndx } from './mondata.js';
import { mon_track_clear } from './monmove.js';
import { mnexto, rloc_to } from './teleport.js';

import { ACURR } from './attrib.js';

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

// C ref: monst.h helpless()
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }

// C ref: mondata.c levl_follower()
function levl_follower(mtmp) {
    const u = game.u;
    if (mtmp === u.usteed)
        return true;

    /* Wizard with Amulet won't bother trying to follow across levels */
    if (mtmp.iswiz && mon_has_amulet(mtmp))
        return false;
    /* some monsters will follow even while intending to flee from you */
    if (mtmp.mtame || mtmp.iswiz
        || (mtmp.isshk && mtmp.mextra?.eshk?.following)) /* is_fshk() */
        return true;
    /* stalking types follow, but won't when fleeing unless you hold
       the Amulet */
    return !!((mtmp.data.mflags2 & M2_STALK)
              && (!mtmp.mflee || u.uhave?.amulet));
}

// C ref: steal.c mon_has_amulet()
function mon_has_amulet(mtmp) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === AMULET_OF_YENDOR)
            return true;
    return false;
}

// C ref: dog.c keepdogs()
// The parts reached so far: followers that come along are moved from fmon
// to game.mydogs.  Pets left behind (eating, trapped, carrying the
// Amulet), keep_mon_accessible() monsters and leashes are not ported yet.
export function keepdogs(pets_only) /* true for ascension or final escape */ {
    const g = game;
    const u = g.u;
    let mtmp, mtmp2;

    for (mtmp = g.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (mtmp.mhp <= 0) /* DEADMONSTER() */
            continue;
        if (pets_only)
            throw new Error('keepdogs(): pets_only not ported yet');
        if (((Math.abs(mtmp.mx - u.ux) <= 1 && Math.abs(mtmp.my - u.uy) <= 1 /* monnear() */
              && levl_follower(mtmp))
             /* the wiz will level t-port from anywhere to chase
                the amulet; if you don't have it, will chase you
                only if in range. -3. */
             || (u.uhave?.amulet && mtmp.iswiz))
            && (!helpless(mtmp)
                /* eg if level teleport or new trap, steed has no control
                   to avoid following */
                || (mtmp === u.usteed))
            /* monster won't follow if it hasn't noticed you yet */
            && !(mtmp.mstrategy & STRAT_WAITFORU)) {
            if (mtmp.mtrapped || mtmp === u.usteed || mtmp.meating
                || mon_has_amulet(mtmp))
                throw new Error('keepdogs(): trapped/steed/eating/amulet follower not ported yet');

            /* prepare to take mtmp off the map */
            /* num_segs = mon_leave(mtmp) */
            if (mtmp.wormno || mtmp.mleashed)
                throw new Error('keepdogs(): mon_leave() for worms/leashed pets not ported yet');
            const num_segs = 0;
            /* take off map and move mtmp from fmon list to mydogs */
            /* relmon(mtmp, &gm.mydogs): remove_monster() + unlink from fmon */
            const lst = g.level.monsters || [];
            const i = lst.indexOf(mtmp);
            if (i >= 0)
                lst.splice(i, 1);
            if (g.fmon === mtmp) {
                g.fmon = mtmp.nmon;
            } else {
                let p;
                for (p = g.fmon; p && p.nmon !== mtmp; p = p.nmon)
                    ;
                if (p) p.nmon = mtmp.nmon;
            }
            mtmp.nmon = g.mydogs || null;
            g.mydogs = mtmp;
            /* mtmp->mx,my retain current value */
            mtmp.mx = mtmp.my = 0; /* mx==0 implies migrating */
            mtmp.wormno = num_segs;
            mtmp.mlstmv = g.moves;
        } else if (mtmp.isshk || mtmp.ispriest || mtmp.isgd || mtmp.iswiz) {
            /* keep_mon_accessible(): migrate_to_level() not ported yet */
            throw new Error('keepdogs(): keep_mon_accessible() not ported yet');
        } else if (mtmp.mleashed) {
            throw new Error('keepdogs(): leash goes slack not ported yet');
        }
    }
}

/* note: always reset when used so doesn't need to be part of struct 'g' */
let failed_arrivals = null;

const With_you = 0, After_you = 1, Before_you = 2; /* mon_arrive() 'when' */
const MON_STILL_ARRIVING = 0x100;

// C ref: dog.c losedogs()
// Shopkeepers dismissing Kops (make_happy_shoppers()) and failed
// arrivals going into limbo (m_into_limbo()) are not ported yet.
export async function losedogs() {
    const g = game;
    const u = g.u;
    let mtmp, prev;
    let dismissKops = 0, xyloc;

    failed_arrivals = null;

    /* check for returning shk(s) */
    for (mtmp = g.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mux !== u.uz.dnum || mtmp.muy !== u.uz.dlevel)
            continue;
        if (mtmp.isshk)
            throw new Error('losedogs(): returning shopkeeper not ported yet');
    }
    /* make the same check for gm.mydogs */
    for (mtmp = g.mydogs; mtmp && dismissKops >= 0; mtmp = mtmp.nmon) {
        if (mtmp.isshk) {
            /* hostile shk might accompany hero */
            if (!mtmp.mpeaceful)
                dismissKops = -1;
        }
    }

    if (dismissKops > 0)
        throw new Error('losedogs(): make_happy_shoppers() not ported yet');

    /* put monsters who went onto migrating_mons in order to be accessible
       when other levels are active back to their positions on this level */
    for (prev = null, mtmp = g.migrating_mons; mtmp; ) {
        xyloc = mtmp.mtrack[0].x; /* (for legibility) */
        const next = mtmp.nmon;
        if (mtmp.mux === u.uz.dnum && mtmp.muy === u.uz.dlevel
            && xyloc === MIGR_EXACT_XY) {
            /* remove mtmp from migrating_mons */
            if (prev) prev.nmon = next; else g.migrating_mons = next;
            await mon_arrive(mtmp, Before_you);
        } else {
            prev = mtmp;
        }
        mtmp = next;
    }

    /* place pets and/or any other monsters who accompany hero */
    while ((mtmp = g.mydogs) != null) {
        g.mydogs = mtmp.nmon;
        await mon_arrive(mtmp, With_you);
    }

    /* time for migrating monsters to arrive */
    for (prev = null, mtmp = g.migrating_mons; mtmp; ) {
        xyloc = mtmp.mtrack[0].x;
        const next = mtmp.nmon;
        if (mtmp.mux === u.uz.dnum && mtmp.muy === u.uz.dlevel
            && xyloc !== MIGR_EXACT_XY) {
            /* remove mtmp from migrating_mons */
            if (prev) prev.nmon = next; else g.migrating_mons = next;
            /* note: if there's no room, it ends up on failed_arrivals list */
            await mon_arrive(mtmp, After_you);
        } else {
            prev = mtmp;
        }
        mtmp = next;
    }

    /* put any monsters who couldn't arrive back on migrating_mons */
    if (failed_arrivals)
        throw new Error('losedogs(): m_into_limbo() not ported yet');
}

// C ref: dog.c mon_arrive()
// Only arrival with the hero (With_you) is ported; monsters migrating
// independently (mon_catchup_elapsed_time(), the MIGR_* placement switch)
// and long worm tails are not ported yet.
export async function mon_arrive(mtmp, when) {
    const g = game;
    const u = g.u;
    let num_segs;

    mtmp.mstate = (mtmp.mstate || 0) | MON_STILL_ARRIVING;
    /* mtmp->nmon = fmon; fmon = mtmp; */
    mtmp.nmon = g.fmon;
    g.fmon = mtmp;
    if (mtmp.isshk)
        throw new Error('mon_arrive(): set_residency() not ported yet');

    num_segs = mtmp.wormno;
    /* baby long worms have no tail so don't use is_longworm() */
    if (mtmp.data === mons[PM_LONG_WORM]) {
        throw new Error('mon_arrive(): long worm get_wormno()/initworm() not ported yet');
    } else
        mtmp.wormno = 0;

    /* some monsters might need to do something special upon arrival
       _after_ the current level has been fully set up; see dochug() */
    mtmp.mstrategy |= STRAT_ARRIVE;
    mtmp.mstate &= ~(MON_MIGRATING | MON_LIMBO);

    /* make sure mnexto(rloc_to(set_apparxy())) doesn't use stale data */
    mtmp.mux = u.ux, mtmp.muy = u.uy;
    /* xyloc/xyflags/xlocale/ylocale/fromdlev come from mtrack[0..2];
       only used for independent arrivals, not ported yet */
    mon_track_clear(mtmp);
    /* restore_cham(mtmp) */
    if (u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.intrinsic
        || u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.extrinsic || mtmp.mcan)
        throw new Error('mon_arrive(): restore_cham() normal_shape() not ported yet');
    else if (mtmp.cham === NON_PM && pm_to_cham(monsndx(mtmp.data)) !== NON_PM)
        throw new Error('mon_arrive(): restore_cham() pm_to_cham() not ported yet');

    if (mtmp === u.usteed)
        return; /* don't place steed on the map */
    if (when === With_you) {
        /* When a monster accompanies you, sometimes it will arrive
           at your intended destination and you'll end up next to
           that spot.  This code doesn't control the final outcome;
           goto_level(do.c) decides who ends up at your target spot
           when there is a monster there too. */
        if (!m_at(u.ux, u.uy)
            && !rn2(mtmp.mtame ? 10 : mtmp.mpeaceful ? 5 : 2))
            await rloc_to(mtmp, u.ux, u.uy);
        else
            await mnexto(mtmp, RLOC_NOMSG);
        mtmp.mstate &= ~MON_STILL_ARRIVING;
        return;
    }
    /*
     * The monster arrived on this level independently of the player.
     */
    throw new Error('mon_arrive(): independent arrival (mon_catchup_elapsed_time(), MIGR_* placement) not ported yet');
}
