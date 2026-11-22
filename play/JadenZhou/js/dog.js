// dog.js — pets.
// C ref: dog.c — newedog, initedog, pet_type, makedog.
//
// Not ported yet: make_familiar, pick_familiar_pm, dog movement/food
// (dogmove.c), keepdogs/losedogs, tamedog and the rest of dog.c.

import { set_residency } from './shk.js';
import { game } from './gstate.js';
import { redraw_worm, count_wsegs, wormgone, get_wormno, initworm,
         MAX_NUM_WORMS } from './worm.js';
import { rn2 } from './rng.js';
import { A_CHA, MM_EDOG, NO_MINVENT, NON_PM, STRAT_WAITFORU,
         STRAT_ARRIVE, MON_MIGRATING, MON_LIMBO, MIGR_EXACT_XY, RLOC_NOMSG,
         PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { mons, PM_LITTLE_DOG, PM_KITTEN, PM_PONY, PM_CAVE_DWELLER,
         PM_SAMURAI, PM_BARBARIAN, PM_RANGER, M2_STALK,
         PM_LONG_WORM } from './monsters.js';
import { AMULET_OF_YENDOR } from './objects.js';
import { makemon, is_domestic, set_malign, put_saddle_on_mon,
         m_at, pm_to_cham, place_monster } from './makemon.js';
import { monsndx, regenerates } from './mondata.js';
import { healmon } from './mon.js';
import { M1_CARNIVORE, M1_HERBIVORE, S_MIMIC } from './monsters.js';
import { LARGEST_INT, M_AP_NOTHING } from './const.js';
import { mon_track_clear } from './monmove.js';
import { mnexto, rloc_to } from './teleport.js';
import { on_level, ledger_to_dnum, ledger_to_dlev, depth,
         In_W_tower } from './dungeon.js';
import { relmon, mnearto } from './mon.js';
import { stairway_find_from, stairway_find, somexy } from './mklev.js';
import { in_rooms } from './hack.js';
import { rloc } from './teleport.js';
import { rn1 } from './rng.js';
import { MIGR_APPROX_XY, MIGR_WITH_HERO, MIGR_STAIRS_UP, MIGR_STAIRS_DOWN,
         MIGR_LADDER_UP, MIGR_LADDER_DOWN, MIGR_SSTAIRS, MIGR_PORTAL,
         MIGR_RANDOM, MIGR_LEFTOVERS, ROOMOFFSET, COLNO, ROWNO,
         } from './const.js';
import { vision_recalc } from './vision.js';
import { PM_FLAMING_SPHERE, PM_SHOCKING_SPHERE, PM_BABY_GOLD_DRAGON,
         PM_FIRE_VORTEX, PM_FIRE_ELEMENTAL, PM_GOLD_DRAGON,
         S_LIGHT } from './monsters.js';
import { mintrap } from './trap.js';
import { NO_TRAP_FLAGS } from './const.js';
import { pline, canseemon, newsym } from './display.js';
import { yelp, growl } from './sounds.js';
import { AGGRAVATE_MONSTER, CONFLICT } from './const.js';
import { Monnam } from './do_name.js';

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

// C ref: dog.c abuse_dog()
/* hero has abused pet */
export async function abuse_dog(mtmp) {
    if (!mtmp.mtame)
        return;

    const p = (i) => game.u.uprops[i];
    if (!!(p(AGGRAVATE_MONSTER).intrinsic || p(AGGRAVATE_MONSTER).extrinsic)
        || !!(p(CONFLICT).intrinsic || p(CONFLICT).extrinsic)) /* Aggravate_monster || Conflict */
        mtmp.mtame = Math.trunc(mtmp.mtame / 2);
    else
        mtmp.mtame--;

    if (mtmp.mtame && !mtmp.isminion)
        mtmp.edog.abuse++;

    if (!mtmp.mtame && mtmp.mleashed)
        throw new Error('abuse_dog(): m_unleash() not ported yet');

    /* don't make a sound if pet is in the middle of leaving the level */
    /* newsym isn't necessary in this case either */
    if (mtmp.mx !== 0) {
        if (mtmp.mtame && rn2(mtmp.mtame))
            await yelp(mtmp);
        else
            await growl(mtmp); /* give them a moment's worry */

        if (!mtmp.mtame) {
            newsym(mtmp.mx, mtmp.my);
            if (mtmp.wormno)
                redraw_worm(mtmp);
        }
    }
}

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
export function mon_has_amulet(mtmp) {
    for (const otmp of mtmp.minvent || [])
        if (otmp.otyp === AMULET_OF_YENDOR)
            return true;
    return false;
}

// C ref: dog.c mon_leave()
/* bookkeeping when mtmp is about to leave the current level;
   common to keepdogs() and migrate_to_level() */
function mon_leave(mtmp) {
    let num_segs = 0; /* return value */

    /* set minvent's obj->no_charge to 0 */
    for (const obj of mtmp.minvent || []) {
        if (obj.cobj && obj.cobj.length) /* Has_contents(obj) */
            throw new Error('mon_leave(): picked_container() not ported yet');
        obj.no_charge = 0;
    }

    /* if this is a shopkeeper, clear the 'resident' field of her shop;
       if/when she returns, it will be set back by mon_arrive()  */
    if (mtmp.isshk)
        set_residency(mtmp, true);

    /* if this is a long worm, handle its tail segments before mtmp itself;
       we pass possibly truncated segment count to caller via return value  */
    if (mtmp.wormno) {
        const cnt = count_wsegs(mtmp), mx = mtmp.mx, my = mtmp.my;

        /* since monst->wormno is overloaded to hold the number of
           tail segments during migration, a very long worm with
           more segments than can fit in that field gets truncated */
        num_segs = Math.min(cnt, MAX_NUM_WORMS - 1);
        wormgone(mtmp);
        /* put the head back; note: mtmp might not be on the map if this
           is happening during a failed attempt to migrate to this level */
        if (mx)
            place_monster(mtmp, mx, my);
    }

    return num_segs;
}

// C ref: dog.c keep_mon_accessible()
/* when hero leaves a level, some monsters should be placed on the
   migrating_mons list instead of being stashed inside the level's file */
function keep_mon_accessible(mon) {
    const u = game.u;
    /* the Wizard is kept accessible so that his harassment can fetch
       him instead of creating a new instance but also so that he can
       be put back at his current location if hero returns to his level */
    if (mon.iswiz)
        return true;
    /* monsters with special attachment to a particular level only need
       to be kept accessible when on some other level */
    const eshk = mon.mextra?.eshk, epri = mon.epri || mon.mextra?.epri,
        egd = mon.egd || mon.mextra?.egd;
    if ((mon.isshk && eshk && !on_level(u.uz, eshk.shoplevel))
        || (mon.ispriest && epri && !on_level(u.uz, epri.shrlevel))
        || (mon.isgd && egd && !on_level(u.uz, egd.gdlevel)))
        return true;
    /* normal monsters go into the level save file instead of being held
       on the migrating_mons list for off-level accessibility */
    return false;
}

// C ref: dog.c keepdogs()
// Followers that come along are moved from fmon to game.mydogs.
// Leashed pets, migrate_to_level() for keep_mon_accessible() monsters and
// the steed are not ported yet.
export async function keepdogs(pets_only) /* true for ascension or final escape */ {
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
            let stay_behind = false;

            if (mtmp.mtrapped)
                await mintrap(mtmp, NO_TRAP_FLAGS); /* try to escape */
            if (mtmp === u.usteed) {
                /* make sure steed is eligible to accompany hero */
                throw new Error('keepdogs(): steed accompanying hero not ported yet');
            } else if (mtmp.meating || mtmp.mtrapped) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} is still ${
                        mtmp.meating ? "eating" : "trapped"}.`);
                stay_behind = true;
            } else if (mon_has_amulet(mtmp)) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} seems very disoriented for a moment.`);
                stay_behind = true;
            }
            if (stay_behind) {
                if (mtmp.mleashed)
                    throw new Error('keepdogs(): leash comes loose (m_unleash()) not ported yet');
                continue;
            }

            /* prepare to take mtmp off the map */
            if (mtmp.mleashed)
                throw new Error('keepdogs(): leashed pet following not ported yet');
            const num_segs = mon_leave(mtmp);
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
        } else if (keep_mon_accessible(mtmp)) {
            /* we want to be able to find the Wizard when his next
               resurrection chance comes up, but have him resume his
               present location if player returns to this level before
               that time; also needed for monsters (shopkeeper, temple
               priest, vault guard) who have level data in mon->mextra
               in case #wizmakemap is used to replace their home level
               while they're away from it */
            throw new Error('keepdogs(): migrate_to_level() not ported yet');
        } else if (mtmp.mleashed) {
            throw new Error('keepdogs(): leash goes slack not ported yet');
        }
    }
}

/* C ref: mondata.h emits_light() */
function emits_light(ptr) {
    return (ptr.mlet === S_LIGHT || ptr === mons[PM_FLAMING_SPHERE]
            || ptr === mons[PM_SHOCKING_SPHERE]
            || ptr === mons[PM_BABY_GOLD_DRAGON]
            || ptr === mons[PM_FIRE_VORTEX])
        ? 1
        : (ptr === mons[PM_FIRE_ELEMENTAL]
           || ptr === mons[PM_GOLD_DRAGON]) ? 1 : 0;
}

// C ref: dog.c migrate_to_level()
export function migrate_to_level(
    mtmp,
    tolev, /* destination level */
    xyloc, /* MIGR_xxx destination xy location: */
    cc)    /* optional destination coordinates */
{
    const u = game.u;
    const new_lev = { dnum: 0, dlevel: 0 };
    let xyflags;
    const mx = mtmp.mx, my = mtmp.my; /* <mx,my> needed below */

    if (mtmp.mleashed)
        throw new Error('migrate_to_level(): m_unleash() not ported yet');

    /* prepare to take mtmp off the map */
    const num_segs = mon_leave(mtmp);
    /* take off map and move mtmp from fmon list to migrating_mons */
    relmon(mtmp, 'migrating_mons'); /* mtmp->mx,my retain their value */
    mtmp.mstate = (mtmp.mstate || 0) | MON_MIGRATING;

    new_lev.dnum = ledger_to_dnum(tolev);
    new_lev.dlevel = ledger_to_dlev(tolev);
    /* overload mtmp->[mx,my], mtmp->[mux,muy], and mtmp->mtrack[] as
       destination codes */
    xyflags = (depth(new_lev) < depth(u.uz)) ? 1 : 0; /* 1 => up */
    if (In_W_tower(mx, my, u.uz))
        xyflags |= 2;
    mtmp.wormno = num_segs;
    mtmp.mlstmv = game.moves;
    if (!mtmp.mtrack)
        mon_track_clear(mtmp);
    /* (mtrack[] entries are replaced rather than modified: JS shares the
       coordinate objects that mon_track_add() shifts along) */
    mtmp.mtrack[2] = { x: u.uz.dnum,  /* migrating from this dungeon */
                       y: u.uz.dlevel }; /* migrating from this dungeon level */
    mtmp.mtrack[1] = { x: cc ? cc.x : mx,
                       y: cc ? cc.y : my };
    mtmp.mtrack[0] = { x: xyloc, y: xyflags };
    mtmp.mux = new_lev.dnum;
    mtmp.muy = new_lev.dlevel;
    mtmp.mx = mtmp.my = 0; /* mx==0 implies migrating */

    /* don't extinguish a mobile light; it still exists but has changed
       from local (monst->mx > 0) to global (mx==0, not on this level) */
    if (emits_light(mtmp.data))
        vision_recalc(0);
}

// C ref: dog.c update_mlstmv()
/* record `last move time' for all monsters prior to level save so that
   mon_arrive() can catch up for lost time when they're restored later */
export function update_mlstmv() {
    /* iter_mons(set_mon_lastmove) */
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        if (!(mtmp.mhp <= 0)) /* !DEADMONSTER(mtmp) */
            mtmp.mlstmv = game.moves; /* set_mon_lastmove() */
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
// Portal arrivals and failed arrivals (m_into_limbo())
// are not ported yet.
export async function mon_arrive(mtmp, when) {
    const g = game;
    const u = g.u;
    let num_segs;

    mtmp.mstate = (mtmp.mstate || 0) | MON_STILL_ARRIVING;
    /* mtmp->nmon = fmon; fmon = mtmp; */
    mtmp.nmon = g.fmon;
    g.fmon = mtmp;
    if (mtmp.isshk)
        set_residency(mtmp, false);

    num_segs = mtmp.wormno;
    /* baby long worms have no tail so don't use is_longworm() */
    if (mtmp.data === mons[PM_LONG_WORM]) {
        mtmp.wormno = get_wormno();
        if (mtmp.wormno)
            initworm(mtmp, num_segs);
    } else
        mtmp.wormno = 0;

    /* some monsters might need to do something special upon arrival
       _after_ the current level has been fully set up; see dochug() */
    mtmp.mstrategy |= STRAT_ARRIVE;
    mtmp.mstate &= ~(MON_MIGRATING | MON_LIMBO);

    /* make sure mnexto(rloc_to(set_apparxy())) doesn't use stale data */
    mtmp.mux = u.ux, mtmp.muy = u.uy;
    if (!mtmp.mtrack)
        mon_track_clear(mtmp);
    const xyloc = mtmp.mtrack[0].x;
    const xyflags = mtmp.mtrack[0].y;
    let xlocale = mtmp.mtrack[1].x;
    let ylocale = mtmp.mtrack[1].y;
    const fromdlev = { dnum: mtmp.mtrack[2].x, dlevel: mtmp.mtrack[2].y };
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
    /* (when == Wiz_arrive: the Wizard's resurrect() isn't ported) */
    /*
     * The monster arrived on this level independently of the player.
     * Its coordinate fields were overloaded for use as flags that
     * specify its final destination.
     */
    let wander, stway;

    if (mtmp.mlstmv < g.moves - 1) {
        /* heal monster for time spent in limbo */
        const nmv = g.moves - 1 - mtmp.mlstmv;

        mon_catchup_elapsed_time(mtmp, nmv);

        /* let monster move a bit on new level (see placement code below) */
        wander = Math.min(nmv, 8);
    } else
        wander = 0;

    switch (xyloc) {
    case MIGR_APPROX_XY: /* {x,y}locale set above */
        break;
    case MIGR_EXACT_XY:
        wander = 0;
        break;
    case MIGR_WITH_HERO:
        xlocale = u.ux, ylocale = u.uy;
        break;
    case MIGR_STAIRS_UP:
        if ((stway = stairway_find_from(fromdlev, false)) !== null) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case MIGR_STAIRS_DOWN:
        if ((stway = stairway_find_from(fromdlev, false)) !== null) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case MIGR_LADDER_UP:
        if ((stway = stairway_find_from(fromdlev, true)) !== null) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case MIGR_LADDER_DOWN:
        if ((stway = stairway_find_from(fromdlev, true)) !== null) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case MIGR_SSTAIRS:
        if ((stway = stairway_find(fromdlev)) !== null) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case MIGR_PORTAL:
        throw new Error('mon_arrive(): MIGR_PORTAL arrival not ported yet');
    default:
    case MIGR_RANDOM:
        xlocale = ylocale = 0;
        break;
    }

    if (((mtmp.migflags || 0) & MIGR_LEFTOVERS) !== 0) {
        /* Pick up the rest of the MIGR_TO_SPECIES objects */
        if (g.migrating_objs)
            throw new Error('mon_arrive(): deliver_obj_to_mon() not ported yet');
    }

    if (xlocale && wander) {
        /* monster moved a bit; pick a nearby location */
        /* mnearto() deals w/stone, et al */
        const r = in_rooms(xlocale, ylocale, 0);

        if (r && r.length) {
            const c = { x: 0, y: 0 };

            /* somexy() handles irregular rooms */
            if (somexy(g.level.rooms[r.charCodeAt(0) - ROOMOFFSET], c))
                xlocale = c.x, ylocale = c.y;
            else
                xlocale = ylocale = 0;
        } else { /* not in a room */
            let i, j;

            i = Math.max(1, xlocale - wander);
            j = Math.min(COLNO - 1, xlocale + wander);
            xlocale = rn1(j - i, i);
            i = Math.max(0, ylocale - wander);
            j = Math.min(ROWNO - 1, ylocale + wander);
            ylocale = rn1(j - i, i);
        }
    } /* moved a bit */

    mtmp.mx = 0; /*(already is 0)*/
    mtmp.my = xyflags;

    let failed_to_place;
    if (xlocale)
        failed_to_place = !(await mnearto(mtmp, xlocale, ylocale, false,
                                          RLOC_NOMSG));
    else
        failed_to_place = !(await rloc(mtmp, RLOC_NOMSG));

    if (failed_to_place)
        /* relmon(mtmp, &failed_arrivals): losedogs() would deal with it */
        throw new Error('mon_arrive(): failed arrival (m_into_limbo()) not ported yet');
    mtmp.mstate &= ~MON_STILL_ARRIVING;
}

// C ref: dog.c mon_catchup_elapsed_time()
/* heal monster for time spent elsewhere */
export function mon_catchup_elapsed_time(
    mtmp,
    nmv) /* number of moves */
{
    let imv = 0; /* avoid zillions of casts and lint warnings */

    /* NH_DEVEL_STATUS != NH_STATUS_RELEASED in this build */
    if (nmv < 0) { /* crash likely... */
        throw new Error('panic: catchup from future time?');
    } else if (nmv === 0) { /* safe, but shouldn't happen */
        /* impossible("catchup from now?") */
    } else if (nmv >= LARGEST_INT) /* paranoia */
        imv = LARGEST_INT - 1;
    else
        imv = nmv;

    /* might stop being afraid, blind or frozen */
    /* set to 1 and allow final decrement in movemon() */
    if (mtmp.mblinded) {
        if (imv >= mtmp.mblinded)
            mtmp.mblinded = 1;
        else
            mtmp.mblinded -= imv;
    }
    if (mtmp.mfrozen) {
        if (imv >= mtmp.mfrozen)
            mtmp.mfrozen = 1;
        else
            mtmp.mfrozen -= imv;
    }
    if (mtmp.mfleetim) {
        if (imv >= mtmp.mfleetim)
            mtmp.mfleetim = 1;
        else
            mtmp.mfleetim -= imv;
    }

    /* might recover from temporary trouble */
    if (mtmp.mtrapped && rn2(imv + 1) > (40 / 2 | 0))
        mtmp.mtrapped = 0;
    if (mtmp.mconf && rn2(imv + 1) > (50 / 2 | 0))
        mtmp.mconf = 0;
    if (mtmp.mstun && rn2(imv + 1) > (10 / 2 | 0))
        mtmp.mstun = 0;

    /* might finish eating or be able to use special ability again */
    if (mtmp.meating) {
        if (imv > mtmp.meating)
            finish_meating(mtmp);
        else
            mtmp.meating -= imv;
    }
    if (imv > (mtmp.mspec_used || 0))
        mtmp.mspec_used = 0;
    else
        mtmp.mspec_used -= imv;

    /* reduce tameness for every 150 moves you are separated */
    if (mtmp.mtame) {
        const wilder = Math.trunc((imv + 75) / 150);
        if (mtmp.mtame > wilder)
            mtmp.mtame -= wilder; /* less tame */
        else if (mtmp.mtame > rn2(wilder))
            mtmp.mtame = 0; /* untame */
        else
            mtmp.mtame = mtmp.mpeaceful = 0; /* hostile! */
    }
    /* check to see if it would have died as a pet; if so, go wild instead
     * of dying the next time we call dog_move()
     */
    if (mtmp.mtame && !mtmp.isminion
        && ((mtmp.data.mflags1 & M1_CARNIVORE) /* carnivorous() */
            || (mtmp.data.mflags1 & M1_HERBIVORE))) { /* herbivorous() */
        const edog = mtmp.edog;

        if ((game.moves > edog.hungrytime + 500 && mtmp.mhp < 3)
            || (game.moves > edog.hungrytime + 750))
            mtmp.mtame = mtmp.mpeaceful = 0;
    }

    if (!mtmp.mtame && mtmp.mleashed) {
        /* leashed monsters should always be with hero, consequently
           never losing any time to be accounted for later */
        /* impossible("catching up for leashed monster?") */
        throw new Error('mon_catchup_elapsed_time(): m_unleash() not ported yet');
    }

    /* recover lost hit points */
    if (!regenerates(mtmp.data))
        imv = Math.trunc(imv / 20);
    healmon(mtmp, imv, 0);

    /* set_mon_lastmove(mtmp) */
    mtmp.mlstmv = game.moves;
}

// C ref: dogmove.c finish_meating()
function finish_meating(mtmp) {
    mtmp.meating = 0;
    if ((mtmp.m_ap_type || 0) !== M_AP_NOTHING && mtmp.data.mlet !== S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}
