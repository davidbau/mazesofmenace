// dog.js — the starting pet.
// C ref: src/dog.c
//
// makedog() runs between u_on_upstairs() and u_init_inventory_attrs()
// (src/allmain.c:814), not with the rest of hero setup. Getting that ordering
// wrong puts the pet's draws on the wrong side of the inventory's.
//
// The cost is small but very visible in the log: one rn2(2) from pet_type()
// when the role has no fixed pet, then a whole collect_coords() ring shuffle
// from enexto() to place it.

import { vision_recalc } from './vision.js';
import { emits_light } from './mondata.js';
import { ledger_to_dnum, ledger_to_dlev, depth, In_W_tower } from './dungeon.js';
import { relmon } from './mon.js';
import { m_unleash } from './apply.js';
import { count_wsegs, wormgone } from './worm.js';
import { picked_container, set_residency } from './shk.js';
import { Has_contents, MAX_NUM_WORMS, W_ARMS } from './const.js';
import { game } from './gstate.js';
import { which_armor } from './worn.js';
import { DEADMONSTER, is_vampshifter, MON_WEP } from './monst.js';
import { mnexto, mnearto } from './mon.js';
import { m_avoid_kicked_loc, m_avoid_soko_push_loc, monnear, onscary } from './monmove.js';
/* include/hack.h:1322 — MMOVE_MOVED is 1 and MMOVE_DIED is 2. This file had
   its own copy with MMOVE_MOVED = 2 (C's DIED value) and no MMOVE_DIED at all,
   so dog_move's death return was an unbound name. */
import { MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE,
         NEED_WEAPON, NEED_HTH_WEAPON } from './const.js';
import { acurr } from './attrib.js';
import { put_saddle_on_mon } from './steed.js';
import { perceives, is_domestic, is_undead, needspick, nohands, verysmall,
         is_animal, mindless, attacktype, dmgtype, resists_ston, resists_acid,
         max_passive_dmg, is_flyer, is_floater, regenerates, resist_conflict,
         is_covetous, is_human, sticks } from './mondata.js';
import { sobj_at, eaten_stat, obj_extract_self } from './invent.js';
import { may_dig } from './hack.js';
import { is_metallic, OBJ_FLOOR } from './obj.js';
import { obj_resists } from './zap.js';
import { newsym, canspotmon, mon_visible, pline, canseemon } from './display.js';
import { splitobj, peek_at_iced_corpse_age, place_object } from './mkobj.js';
import { yelp, growl } from './sounds.js';
import { m_consume_obj, is_pick, check_gear_next_turn, healmon,
         wake_nearto, unstuck } from './mon.js';
import {
    mfndpos, mon_allowflags, is_pool, is_lava, can_carry, m_at, t_at,
} from './mon.js';
import {
    COLNO, ROWNO, IS_ROOM, MAGIC_PORTAL, ALLOW_M, ALLOW_U,
    IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, isok,
    IS_STWALL, IS_TREE, W_NONDIGGABLE,
    ALLOW_MDISP, ALLOW_TRAPS, A_CHA, CORPSTAT_GENDER,
    CORPSTAT_FEMALE, CORPSTAT_MALE, Upolyd,
} from './const.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { MFLAGS, MONSYMS, NUMMONS, MSOUND, ATTKS } from './monst_data.js';

const { WOOD, IRON, SILVER, MITHRIL } = MATERIALS;
import { rn2, rnd, getRngLog } from './rng.js';
import { dist2, sgn } from './hacklib.js';
import { couldsee, clear_path, cansee } from './vision.js';
import { distant_name, doname, xname, the, The } from './objnam.js';
import { Monnam, noit_Monnam, christen_monst, x_monnam,
         y_monnam } from './do_name.js';
import { ARTICLE_YOUR } from './const.js';
import { MIGR_RANDOM, MIGR_APPROX_XY, MIGR_EXACT_XY, MIGR_WITH_HERO,
         MIGR_LEFTOVERS, MON_MIGRATING, MON_LIMBO,
         RLOC_NOMSG } from './const.js';
import { Hallucination } from './youprop.js';
import { night } from './calendar.js';
import { pline_xy, You, You_feel } from './pline.js';
import { relobj } from './steal.js';
import { set_apparxy, mon_track_add } from './monmove.js';
import { gettrack } from './track.js';
import { do_clear_area } from './vision.js';
import { mattackm } from './mhitm.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED } from './const.js';
import { PMNAMES } from './monst_data.js';
import {
    makemon, MM_EDOG, MM_IGNOREWATER, MM_NOMSG, MM_MALE, MM_FEMALE,
    NO_MINVENT, place_monster, remove_monster, is_rider, mpickobj, set_malign,
    deliver_obj_to_mon, DF_ALL } from './makemon.js';
import { rloc } from './teleport.js';
import { finish_meating } from './dogmove.js';
import { FULL_MOON } from './const.js';

const NON_PM = -1;

// gu.urole.petnum is a PM_ name in the generated role table.
function petnumOf(role) {
    const p = role?.petnum;
    if (typeof p === 'number') return p;
    if (!p || p === 'NON_PM') return NON_PM;
    return PMNAMES[p] !== undefined ? PMNAMES[p] : NON_PM;
}

// src/dog.c:93 pet_type()
export function pet_type() {
    const petnum = petnumOf(game.urole);
    if (petnum !== NON_PM)
        return petnum;
    if (game.preferred_pet === 'c')
        return PMNAMES.PM_KITTEN;
    if (game.preferred_pet === 'd')
        return PMNAMES.PM_LITTLE_DOG;
    return rn2(2) ? PMNAMES.PM_KITTEN : PMNAMES.PM_LITTLE_DOG;
}

// src/dog.c:111 makedog()
export function makedog() {
    if (game.preferred_pet === 'n') {
        game.context.startingpet_typ = NON_PM;
        return null;
    }

    const pettype = game.context.startingpet_typ = pet_type();
    /* src/dog.c:232 — the rc's DOGNAME/CATNAME/HORSENAME override, else the
       role defaults; every default name belongs to the little dog. */
    let petname = (pettype === PMNAMES.PM_LITTLE_DOG) ? (game.dogname || '')
                  : (pettype === PMNAMES.PM_KITTEN) ? (game.catname || '')
                    : (pettype === PMNAMES.PM_PONY) ? (game.horsename || '')
                      : '';
    if (!petname && pettype === PMNAMES.PM_LITTLE_DOG) {
        const m = game.urole?.mnum;
        const role_is = (pm) => m === pm || m === PMNAMES[pm];
        if (role_is('PM_CAVE_DWELLER'))
            petname = 'Slasher';        /* The Warrior */
        if (role_is('PM_SAMURAI'))
            petname = 'Hachi';          /* Shibuya Station */
        if (role_is('PM_BARBARIAN'))
            petname = 'Idefix';         /* Obelix */
        if (role_is('PM_RANGER'))
            petname = 'Sirius';         /* Orion's dog */
    }

    /* NO_MINVENT stops makemon() giving a pony an already-worn saddle */
    const mtmp = makemon(game.mons[pettype], game.u.ux, game.u.uy,
                         MM_EDOG | NO_MINVENT);
    if (!mtmp)
        return null;

    /* src/dog.c:260 — the starting pet is recorded, and an initial PONY comes
       already saddled unless the hero is a pauper. Passing no saddle makes
       put_saddle_on_mon() create one, and that mksobj() spends a next_ident().
       Skipping it lost a draw in the middle of character creation. */
    if (!game.context.startingpet_mid) {
        game.context.startingpet_mid = mtmp.m_id;
        if (!game.u.uroleplay?.pauper) {
            if (pettype === PMNAMES.PM_PONY)
                put_saddle_on_mon(null, mtmp);
        }
        /* see_monster_closeup() is display bookkeeping */
    }

    /* src/dog.c:279 — only the first pet gets the name */
    if (!game.petname_used++ && petname)
        christen_monst(mtmp, petname);

    initedog(mtmp, true);
    return mtmp;
}

// src/dog.c:45 initedog() — make mtmp tame and fill in its edog struct.
//
// Draws nothing, but several of these fields are read by code that DOES draw,
// and a missing one silently changes the draw count rather than the outcome:
//
//   apport      dog_goal's APPORT branch is `edog->apport > rn2(8)`. Leaving
//               it undefined makes that test false for every object, so the
//               goal is never set and EVERY later object in the search box
//               re-enters the branch and spends another rn2(8). C spends one.
//   hungrytime  gates dog_move's "eat it even if not starving" arm.
//   dropdist    starts at 10000, not 0; dog_invent compares against it.
//
// `everything` is FALSE when re-taming an already-tame monster, and then only
// the apport floor is applied.
export function initedog(mtmp, everything) {
    const edogp = (mtmp.edog ||= {});
    const minhungry = game.moves + 1000;
    const minimumtame = is_domestic(mtmp.data) ? 10 : 5;

    mtmp.mtame = Math.max(minimumtame, mtmp.mtame || 0);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    set_malign(mtmp);

    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        /* ACURR(A_CHA), not u.acurr.a[A_CHA]. newgame() calls makedog()
           BEFORE u_init_inventory_attrs(), where init_attr() lives, so the
           array is still zeroed here -- but acurr() clamps its result to a
           floor of 3, so the starting pet gets apport 3 rather than 0. That
           difference decides whether dog_goal ever settles on a goal. */
        edogp.apport = acurr(A_CHA);
        edogp.whistletime = 0;
        edogp.ogoal = { x: -1, y: -1 };  /* force error if used before set */
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else {
        if (edogp.apport <= 0)
            edogp.apport = 1;
    }

    /* always set for a newly tamed pet; hungrytime might already be higher
       when taming magic affects an already-tame monster */
    if ((edogp.hungrytime ?? 0) < minhungry)
        edogp.hungrytime = minhungry;
    /* src/dog.c:87 — pets-conduct counter (the first-pet livelog is
       invisible); gain_guardian_angel() reads it on the Astral Plane */
    (game.u.uconduct ||= {}).pets = ((game.u.uconduct.pets | 0) + 1);
}

// src/dog.c:138 make_familiar(), for figurines. Spell-created familiars use
// a separate random-species path and remain outside this entry point.
export async function make_familiar(otmp, x, y, quietly = false) {
    const mndx = otmp?.corpsenm;
    if (!Number.isInteger(mndx) || mndx < 0 || mndx >= NUMMONS)
        return null;

    const vitals = game.mvitals[mndx];
    const hasSpecialLimit = mndx === PMNAMES.PM_NAZGUL
                         || mndx === PMNAMES.PM_ERINYS;
    if (hasSpecialLimit && (vitals?.mvflags & MFLAGS.G_EXTINCT)) {
        if (!quietly)
            await pline('... into a pile of dust.');
        return null;
    }

    let mmflags = MM_EDOG | MM_IGNOREWATER | NO_MINVENT | MM_NOMSG;
    const cgend = (otmp.spe | 0) & CORPSTAT_GENDER;
    if (cgend === CORPSTAT_FEMALE)
        mmflags |= MM_FEMALE;
    else if (cgend === CORPSTAT_MALE)
        mmflags |= MM_MALE;

    const mtmp = makemon(game.mons[mndx], x, y, mmflags);
    if (!mtmp) {
        if (!quietly)
            await pline('The figurine writhes and then shatters into pieces!');
        return null;
    }
    if (mtmp.isminion) {
        mtmp.isminion = 0;
        if (mtmp.mextra)
            delete mtmp.mextra.emin;
    }
    if (is_pool(mtmp.mx, mtmp.my)) {
        const { minliquid } = await import('./mon.js');
        if (await minliquid(mtmp))
            return null;
    }

    let chance = rn2(10);
    if (chance > 2)
        chance = otmp.blessed ? 0 : !otmp.cursed ? 1 : 2;
    if (chance === 0) {
        initedog(mtmp, true);
    } else if (chance === 2) {
        if (!quietly)
            await You('get a bad feeling about this.');
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
    }
    if (otmp.oname)
        christen_monst(mtmp, otmp.oname);

    mtmp.msleeping = 0;
    set_malign(mtmp);
    newsym(mtmp.mx, mtmp.my);
    if (mtmp.mtame && attacktype(mtmp.data, ATTKS.AT_WEAP)) {
        mtmp.weapon_check = NEED_HTH_WEAPON;
        const { mon_wield_item } = await import('./weapon.js');
        await mon_wield_item(mtmp);
    }
    return mtmp;
}

// ---------------------------------------------------------------------------
// The pet's turn. dog_goal() scans a 5-square radius for something worth
// walking to, and calls dogfood() on every object it finds.
// ---------------------------------------------------------------------------

// include/dog.h — dogfood() return values, best first.
export const DOGFOOD = 0, CADAVER = 1, ACCFOOD = 2, MANFOOD = 3, APPORT = 4,
             POISON = 5, UNDEF = 6, TABU = 7;

/* include/mondata.h and include/objclass.h — the predicates dogfood() sorts
   with. None of them draws; they only decide which branch is taken, and a wrong
   branch changes how far the caller's loop runs before it breaks. */
const carnivorous  = (ptr) => (ptr.mflags1 & MFLAGS.M1_CARNIVORE) !== 0;
const herbivorous  = (ptr) => (ptr.mflags1 & MFLAGS.M1_HERBIVORE) !== 0;
const metallivorous = (ptr) => (ptr.mflags1 & MFLAGS.M1_METALLIVORE) !== 0;
const haseyes      = (ptr) => (ptr.mflags1 & MFLAGS.M1_NOEYES) === 0;
const humanoid     = (ptr) => (ptr.mflags1 & MFLAGS.M1_HUMANOID) !== 0;
export const acidic = (ptr) => (ptr.mflags1 & MFLAGS.M1_ACID) !== 0;
const poisonous    = (ptr) => (ptr.mflags1 & MFLAGS.M1_POIS) !== 0;
/* is_undead lives in js/mondata.js, its C home (include/mondata.h:95). */
const is_elf       = (ptr) => (ptr.mflags2 & MFLAGS.M2_ELF) !== 0;
const noncorporeal = (ptr) => ptr.mlet === MONSYMS.S_GHOST;
/* include/mondata.h:59,190 — both are explicit species lists, not flag tests.
   There is no M1_FIRE_RES; fire resistance lives in mresists as MR_FIRE, and
   guessing a flag here silently made every monster flaming. */
const flaming      = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_VORTEX
                           || ptr.pmidx === PMNAMES.PM_FLAMING_SPHERE
                           || ptr.pmidx === PMNAMES.PM_FIRE_ELEMENTAL
                           || ptr.pmidx === PMNAMES.PM_SALAMANDER;
const likes_lava   = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_ELEMENTAL
                           || ptr.pmidx === PMNAMES.PM_SALAMANDER;

// include/monst.h:285 ismnum()
const ismnum = (x) => x >= 0 && x < NUMMONS;

// include/mondata.h:200-203
export const touch_petrifies = (ptr) => ptr.pmidx === PMNAMES.PM_COCKATRICE
                              || ptr.pmidx === PMNAMES.PM_CHICKATRICE;
const flesh_petrifies = (pm) => touch_petrifies(pm)
                             || pm.pmidx === PMNAMES.PM_MEDUSA;

// include/mondata.h:75
export const slimeproof = (ptr) => ptr.pmidx === PMNAMES.PM_GREEN_SLIME
                         || flaming(ptr) || noncorporeal(ptr);

// include/mondata.h:196
const likes_fire = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_VORTEX
                         || ptr.pmidx === PMNAMES.PM_FLAMING_SPHERE
                         || likes_lava(ptr);

// include/mondata.h:232
const vegan = (ptr) =>
    ptr.mlet === MONSYMS.S_BLOB || ptr.mlet === MONSYMS.S_JELLY
    || ptr.mlet === MONSYMS.S_FUNGUS || ptr.mlet === MONSYMS.S_VORTEX
    || ptr.mlet === MONSYMS.S_LIGHT
    || (ptr.mlet === MONSYMS.S_ELEMENTAL && ptr.pmidx !== PMNAMES.PM_STALKER)
    || (ptr.mlet === MONSYMS.S_GOLEM && ptr.pmidx !== PMNAMES.PM_FLESH_GOLEM
        && ptr.pmidx !== PMNAMES.PM_LEATHER_GOLEM)
    || noncorporeal(ptr);

// include/objclass.h:193-200. WOOD, IRON and MITHRIL are material ordinals.
const is_organic   = (otmp) => game.objects[otmp.otyp].oc_material <= WOOD;
const is_rustprone = (otmp) => game.objects[otmp.otyp].oc_material === IRON;

/* The remaining tests reach subsystems that are absent. Each is only reachable
   through a corpse, egg or tin, none of which exists before the death-drop and
   cooking code lands, so recording keeps the gap visible without inventing a
   branch. */
/* peek_at_iced_corpse_age() now lives in js/mkobj.js (its src/mkobj.c home) */

function stale_egg(obj) {
    note_unported('stale_egg');
    return false;
}

function polyfood(obj) {
    if ((obj.otyp !== ONAMES.CORPSE && obj.otyp !== ONAMES.EGG
         && obj.otyp !== ONAMES.TIN)
        || !ismnum(obj.corpsenm))
        return false;
    const ptr = game.mons[obj.corpsenm];
    return !!((ptr.mflags2 & MFLAGS.M2_SHAPESHIFTER)
              || dmgtype(ptr, ATTKS.AD_POLY));
}

export function same_race(pm1, pm2) {
    note_unported('same_race');
    return pm1 === pm2;
}

function find_pmmonst(pm) {
    return (game.level?.monsters || []).find(m => m.mnum === pm) || null;
}

// src/mondata.c:517 mon_hates_silver() / :524 hates_silver()
export function mon_hates_silver(mon) {
    return is_vampshifter(mon) || hates_silver(game.mons[mon.mnum]);
}

// src/mondata.c:524 — True if monster-type is especially affected by silver.
function hates_silver(ptr) {
    return is_were(ptr) || ptr.mlet === MONSYMS.S_VAMPIRE || is_demon(ptr)
        || ptr.pmidx === PMNAMES.PM_SHADE
        || (ptr.mlet === MONSYMS.S_IMP && ptr.pmidx !== PMNAMES.PM_TENGU);
}

const is_were = (ptr) => (ptr.mflags2 & MFLAGS.M2_WERE) !== 0;
const is_demon = (ptr) => (ptr.mflags2 & MFLAGS.M2_DEMON) !== 0;

/* resists_ston / resists_acid — the real Resists_Elem tests live in
   js/mondata.js now; the note-stubs that stood here always said "no". */

// src/dogmove.c could_reach_item()
export function could_reach_item(mon, nx, ny) {
    if ((!is_pool(nx, ny) || is_swimmer(game.mons[mon.mnum]))
        && (!is_lava(nx, ny) || likes_lava(game.mons[mon.mnum]))
        && (!sobj_at(ONAMES.BOULDER, nx, ny) || throws_rocks(game.mons[mon.mnum])))
        return true;
    return false;
}

// src/dogmove.c can_reach_location() — a recursive walk toward <fx,fy> that
// only ever steps strictly closer, so it terminates.
function can_reach_location(mon, mx, my, fx, fy) {
    if (mx === fx && my === fy)
        return true;
    if (!isok(mx, my))
        return false; /* should not happen */

    const dist = dist2(mx, my, fx, fy);
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            if (!isok(i, j))
                continue;
            if (dist2(i, j, fx, fy) >= dist)
                continue;
            const loc = game.level.at(i, j);
            if (IS_OBSTRUCTED(loc.typ) && !passes_walls(game.mons[mon.mnum])
                && (!may_dig(i, j) || !tunnels(game.mons[mon.mnum])))
                continue;
            if (IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED)))
                continue;
            if (!could_reach_item(mon, i, j))
                continue;
            if (can_reach_location(mon, i, j, fx, fy))
                return true;
        }
    }
    return false;
}

const is_swimmer   = (ptr) => (ptr.mflags1 & MFLAGS.M1_SWIM) !== 0;
const throws_rocks = (ptr) => (ptr.mflags2 & MFLAGS.M2_ROCKTHROW) !== 0;
const passes_walls = (ptr) => (ptr.mflags1 & MFLAGS.M1_WALLWALK) !== 0;
const tunnels      = (ptr) => (ptr.mflags1 & MFLAGS.M1_TUNNEL) !== 0;



// include/vision.h:42 m_cansee(mtmp, x2, y2) = clear_path(mx, my, x2, y2)
function m_cansee(mon, x, y) {
    return clear_path(mon.mx, mon.my, x, y);
}

// src/dog.c:995 dogfood() — only the part that draws is ported.
//
// The second test is the one that matters for the stream:
//
//     if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
//
// obj_resists always draws rn2(100) for an ordinary object and, with ochance 0,
// always returns false. So EVERY object the pet looks at costs exactly one
// rn2(100) here — which is why the recordings show obj_resists arriving before
// dog_goal's own rn2(8) rather than after it, even though the C line that names
// can_carry() sits later in the same condition.
export function dogfood(mon, obj) {
    // NetHack aliases opoisoned to otrapped for non-food objects in obj.h.
    if ((obj.opoisoned || obj.otrapped) && !resists_poison(mon))
        return POISON;
    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    const mptr = game.mons[mon.mnum];
    const carni = carnivorous(mptr), herbi = herbivorous(mptr);
    let fx;

    switch (obj.oclass) {
    case OCLASSES.FOOD_CLASS: {
        fx = (obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.TIN
              || obj.otyp === ONAMES.EGG)
             /* corpsenm might be NON_PM (special tin, unhatchable egg) */
             ? obj.corpsenm
             : NON_PM;
        /* mons[NUMMONS] is a valid array entry, though not a valid monster;
           predicate tests against it will fail */
        const fptr = game.mons[ismnum(fx) ? fx : NUMMONS];

        if (obj.otyp === ONAMES.CORPSE && is_rider(fptr))
            return TABU;
        if ((obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.EGG)
            && flesh_petrifies(fptr) /* c*ckatrice or Medusa */
            && !resists_ston(mon))
            return POISON;
        if (obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY
            && mon.mnum === PMNAMES.PM_KILLER_BEE) {
            /* if there's a queen bee on the level, don't eat royal jelly;
               if there isn't, do eat it and grow into a queen */
            return !find_pmmonst(PMNAMES.PM_QUEEN_BEE) ? DOGFOOD : TABU;
        }
        if (!carni && !herbi)
            return obj.cursed ? UNDEF : APPORT;

        /* a starving pet will eat almost anything */
        const starving = !!(mon.mtame && !mon.isminion && mon.edog?.mhpmax_penalty);
        /* even carnivores will eat carrots if they're temporarily blind */
        const mblind = (!mon.mcansee && haseyes(mptr));

        /* ghouls prefer old corpses and unhatchable eggs, yum! */
        if (mon.mnum === PMNAMES.PM_GHOUL) {
            if (obj.otyp === ONAMES.CORPSE)
                return (peek_at_iced_corpse_age(obj) + 50 <= game.moves
                        && !(fx === PMNAMES.PM_LIZARD || fx === PMNAMES.PM_LICHEN))
                       ? DOGFOOD
                       : (starving && !vegan(fptr)) ? ACCFOOD
                       : POISON;
            if (obj.otyp === ONAMES.EGG)
                return stale_egg(obj) ? CADAVER : starving ? ACCFOOD : POISON;
            return TABU;
        }

        switch (obj.otyp) {
        case ONAMES.TRIPE_RATION:
        case ONAMES.MEATBALL:
        case ONAMES.MEAT_RING:
        case ONAMES.MEAT_STICK:
        case ONAMES.ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;
        case ONAMES.EGG:
            if (obj.corpsenm === PMNAMES.PM_PYROLISK && !likes_fire(mptr))
                return POISON;
            return carni ? CADAVER : MANFOOD;
        case ONAMES.CORPSE:
            if ((peek_at_iced_corpse_age(obj) + 50 <= game.moves
                 && !(fx === PMNAMES.PM_LIZARD || fx === PMNAMES.PM_LICHEN)
                 && mptr.mlet !== MONSYMS.S_FUNGUS)
                || (acidic(fptr) && !resists_acid(mon))
                || (poisonous(fptr) && !resists_poison(mon)))
                return POISON;
            /* avoid polymorph unless starving or abused */
            else if (polyfood(obj) && mon.mtame > 1 && !starving)
                return MANFOOD;
            else if (vegan(fptr))
                return herbi ? CADAVER : MANFOOD;
            /* most humanoids avoid cannibalism unless starving; arbitrary:
               elves won't eat other elves even then */
            else if (humanoid(mptr) && same_race(mptr, fptr)
                     && (!is_undead(mptr) && fptr.mlet !== MONSYMS.S_KOBOLD
                         && fptr.mlet !== MONSYMS.S_ORC
                         && fptr.mlet !== MONSYMS.S_OGRE))
                return (starving && carni && !is_elf(mptr)) ? ACCFOOD : TABU;
            else
                return carni ? CADAVER : MANFOOD;
        case ONAMES.GLOB_OF_GREEN_SLIME: /* other globs use the default case */
            /* turning into slime is preferable to starvation */
            return (starving || slimeproof(mptr)) ? ACCFOOD : POISON;
        case ONAMES.CLOVE_OF_GARLIC:
            return (is_undead(mptr) || is_vampshifter(mon)) ? TABU
                   : (herbi || starving) ? ACCFOOD
                   : MANFOOD;
        case ONAMES.TIN:
            return metallivorous(mptr) ? ACCFOOD : MANFOOD;
        case ONAMES.APPLE:
            return herbi ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
        case ONAMES.CARROT:
            return (herbi || mblind) ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
        case ONAMES.BANANA:
            /* monkeys and apes (tamable) plus sasquatch prefer these,
               yetis will only eat them if starving */
            return (mptr.mlet === MONSYMS.S_YETI && herbi) ? DOGFOOD
                   : (herbi || starving) ? ACCFOOD
                   : MANFOOD;
        default:
            if (starving)
                return ACCFOOD;
            return (obj.otyp > ONAMES.SLIME_MOLD) ? (carni ? ACCFOOD : MANFOOD)
                                                  : (herbi ? ACCFOOD : MANFOOD);
        }
    }
    case OCLASSES.ROCK_CLASS:
        return UNDEF;
    default:
        if (obj.otyp === ONAMES.AMULET_OF_STRANGULATION
            || obj.otyp === ONAMES.RIN_SLOW_DIGESTION)
            return TABU;
        if (mon_hates_silver(mon)
            && game.objects[obj.otyp].oc_material === SILVER)
            return TABU;
        if (mon.mnum === PMNAMES.PM_GELATINOUS_CUBE && is_organic(obj))
            return ACCFOOD;
        if (metallivorous(mptr) && is_metallic(obj)
            && (is_rustprone(obj) || mon.mnum !== PMNAMES.PM_RUST_MONSTER)) {
            /* Non-rustproofed ferrous-based metals are preferred. */
            return (is_rustprone(obj) && !obj.oerodeproof) ? DOGFOOD : ACCFOOD;
        }
        if (!obj.cursed
            && obj.oclass !== OCLASSES.BALL_CLASS
            && obj.oclass !== OCLASSES.CHAIN_CLASS)
            return APPORT;
        /* FALLTHRU to ROCK_CLASS's UNDEF */
        return UNDEF;
    }
}

// src/dog.c:1143 tamedog(), tame a monster or feed an existing pet.
export async function tamedog(mtmp, obj, givemsg) {
    let blessedScroll = false;
    if (obj && (obj.oclass === OCLASSES.SCROLL_CLASS
                || obj.oclass === OCLASSES.SPBOOK_CLASS)) {
        blessedScroll = !!obj.blessed;
        obj = null;
    }

    if (mtmp.mfrozen)
        mtmp.mfrozen = Math.trunc((mtmp.mfrozen + 1) / 2);
    if (mtmp.msleeping)
        await wake_nearto(mtmp.mx, mtmp.my, 1);

    if (mtmp.iswiz || mtmp.mnum === PMNAMES.PM_MEDUSA
        || (mtmp.data.mflags3 & MFLAGS.M3_WANTSARTI))
        return false;

    if (givemsg && !mtmp.mpeaceful && canspotmon(mtmp)) {
        await pline(`${Monnam(mtmp)} seems ${Hallucination()
            ? 'really chill' : 'more amiable'}.`);
        givemsg = false;
    }
    mtmp.mpeaceful = 1;
    set_malign(mtmp);

    if (game.flags?.moonphase === FULL_MOON && night() && rn2(6) && obj
        && mtmp.data.mlet === MONSYMS.S_DOG)
        return false;

    mtmp.mflee = 0;
    mtmp.mfleetim = 0;

    if (mtmp === game.u.ustuck) {
        if (game.u.uswallow) {
            const { expels } = await import('./mhitu.js');
            await expels(mtmp, mtmp.data, true);
        } else {
            const heroData = game.youmonst?.data ?? game.mons[game.u.umonnum];
            if (!(Upolyd(game.u) && sticks(heroData)))
                await unstuck(mtmp);
        }
    }

    if (mtmp.mtame && obj) {
        if (mtmp.mcanmove && !mtmp.mconf && !mtmp.meating) {
            const tasty = dogfood(mtmp, obj);
            if (!(tasty === DOGFOOD
                  || (tasty <= ACCFOOD
                      && mtmp.edog.hungrytime <= game.moves)))
                return false;
            if (canseemon(mtmp)) {
                const bigCorpse = obj.otyp === ONAMES.CORPSE
                    && ismnum(obj.corpsenm)
                    && game.mons[obj.corpsenm].msize > mtmp.data.msize;
                await pline(`${Monnam(mtmp)} catches ${the(xname(obj))}${
                    bigCorpse ? ', or vice versa!' : '.'}`);
            } else if (cansee(mtmp.mx, mtmp.my)) {
                await pline(`${The(xname(obj))} stops.`);
            }
            place_object(obj, mtmp.mx, mtmp.my);
            await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, false);
            return true;
        }
        return false;
    }

    if (mtmp.mtame && mtmp.mtame < 10) {
        if (mtmp.mtame < rnd(10))
            mtmp.mtame++;
        if (blessedScroll)
            mtmp.mtame = Math.min(10, mtmp.mtame + 2);
        return false;
    }

    if (mtmp.isshk) {
        const { make_happy_shk } = await import('./shk.js');
        await make_happy_shk(mtmp, false);
        return false;
    }

    const heroData = game.youmonst?.data ?? game.mons[game.u.umonnum];
    if (!mtmp.mcanmove || mtmp.isshk || mtmp.isgd || mtmp.ispriest
        || mtmp.isminion || is_covetous(mtmp.data) || is_human(mtmp.data)
        || (is_demon(mtmp.data) && !is_demon(heroData))
        || (obj && dogfood(mtmp, obj) >= MANFOOD))
        return false;

    if (mtmp.m_id === game.quest_status?.leader_m_id)
        return false;

    initedog(mtmp, !mtmp.edog);

    if (obj) {
        place_object(obj, mtmp.mx, mtmp.my);
        if (await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, true) === 2)
            return true;
    }

    if (givemsg && canspotmon(mtmp)) {
        await pline(`${Monnam(mtmp)} seems quite ${Hallucination()
            ? 'approachable' : 'friendly'}.`);
    }

    newsym(mtmp.mx, mtmp.my);
    if (mtmp.wormno)
        note_unported('tamedog:redraw_worm');
    if (attacktype(mtmp.data, ATTKS.AT_WEAP)) {
        mtmp.weapon_check = NEED_HTH_WEAPON;
        const { mon_wield_item } = await import('./weapon.js');
        await mon_wield_item(mtmp);
    }
    return true;
}

/* src/artifact.c is not ported; no session generates a quest artifact this
   early, and the call draws nothing either way. */
function is_quest_artifact(obj) { return false; }

/* include/monst.h:277 resists_poison(). This read mon.data.mresists, but our
   monsters carry mnum indexing game.mons rather than a data pointer, so it
   was ALWAYS FALSE. */
function resists_poison(mon) {
    return !!((game.mons[mon.mnum]?.mresists ?? 0) & MFLAGS.MR_POISON);
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/dogmove.c:495 dog_goal() — pick somewhere worth walking to.
//
// Only the object search is ported. It walks the level's object list (fobj,
// newest-first) and calls dogfood() on everything inside a 5-square box around
// the pet, so it costs one rn2(100) per nearby object before any of its own
// draws. That is the whole reason obj_resists shows up ahead of dog_goal's
// rn2(8) in the recordings.
const SQSRCHRADIUS = 5;

// src/dogmove.c:156 dog_nutrition() — how much food value obj gives mtmp, and
// how many turns eating it costs (returned through mtmp.meating, as in C).
//
// Draws nothing. The size multiplier is a switch on the PET's size, not the
// food's, and MZ_MEDIUM shares the default arm.
export function dog_nutrition(mtmp, obj) {
    let nutrit;
    const mdat = game.mons[mtmp.mnum];

    /* It is arbitrary that the pet takes the same length of time to eat
       as a human, but gets more nutritional value. */
    if (obj.oclass === OCLASSES.FOOD_CLASS) {
        if (obj.otyp === ONAMES.CORPSE) {
            mtmp.meating = 3 + (game.mons[obj.corpsenm].cwt >> 6);
            nutrit = game.mons[obj.corpsenm].cnutrit;
        } else {
            mtmp.meating = game.objects[obj.otyp].oc_delay;
            nutrit = game.objects[obj.otyp].oc_nutrition;
        }
        switch (mdat.msize) {
        case MFLAGS.MZ_TINY:     nutrit *= 8; break;
        case MFLAGS.MZ_SMALL:    nutrit *= 6; break;
        default:
        case MFLAGS.MZ_MEDIUM:   nutrit *= 5; break;
        case MFLAGS.MZ_LARGE:    nutrit *= 4; break;
        case MFLAGS.MZ_HUGE:     nutrit *= 3; break;
        case MFLAGS.MZ_GIGANTIC: nutrit *= 2; break;
        }
        if (obj.oeaten) {
            mtmp.meating = eaten_stat(mtmp.meating, obj);
            nutrit = eaten_stat(nutrit, obj);
        }
    } else if (obj.oclass === OCLASSES.COIN_CLASS) {
        mtmp.meating = Math.trunc(obj.quan / 2000) + 1;
        if (mtmp.meating < 0)
            mtmp.meating = 1;
        nutrit = Math.trunc(obj.quan / 20);
        if (nutrit < 0)
            nutrit = 0;
    } else {
        /* Unusual pet such as gelatinous cube eating odd stuff. */
        mtmp.meating = Math.trunc(obj.owt / 20) + 1;
        nutrit = 5 * game.objects[obj.otyp].oc_nutrition;
    }
    return nutrit;
}

// src/dogmove.c:218 dog_eat() — the pet eats obj. Returns 2 if the pet died,
// otherwise 1.
//
// Draws nothing itself. It matters anyway, and this is why the whole
// dog_move(dogmove.c:1255) cluster was stuck: our eat branch used to return
// MMOVE_NOTHING, so the pet neither moved nor ate and stood still while C's
// walked onto the food. C reaches the eat through newdogpos, which MOVES the
// pet first and only then calls dog_eat -- that is what do_eat exists for.
// A pet parked on the wrong square feeds a wrong mfndpos count and a wrong
// `nearby` into dochug on every later turn.
//
// x,y are the pet's location at the START of the turn, which is why they are
// passed separately from mtmp.mx,my.
//
// Not ported, each recorded rather than faked: the killer-bee royal jelly
// bypass, the rust monster's erodeproof branch, shop billing (unpaid,
// costly_alteration, unpaid_cost) and the eating messages.
export async function dog_eat(mtmp, obj, x, y, devour) {
    const edog = mtmp.edog;
    let nutrit;

    if (edog.hungrytime < game.moves)
        edog.hungrytime = game.moves;
    nutrit = dog_nutrition(mtmp, obj);

    if (devour) {
        if (mtmp.meating > 1)
            mtmp.meating = Math.trunc(mtmp.meating / 2);
        if (nutrit > 1)
            nutrit = Math.trunc((nutrit * 3) / 4);
    }
    edog.hungrytime += nutrit;
    mtmp.mconf = 0;
    if (edog.mhpmax_penalty) {
        /* no longer starving */
        mtmp.mhpmax += edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }
    if (mtmp.mflee && mtmp.mfleetim > 1)
        mtmp.mfleetim = Math.trunc(mtmp.mfleetim / 2);
    if (mtmp.mtame < 20)
        mtmp.mtame++;
    if (x !== mtmp.mx || y !== mtmp.my) {   /* moved & ate on same turn */
        newsym(x, y);
        newsym(mtmp.mx, mtmp.my);
    }
    if (game.mons[mtmp.mnum] === game.mons[PMNAMES.PM_KILLER_BEE]
        && obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY) {
        note_unported('dog_eat:bee_eat_jelly');
        return 1;
    }

    /* food items are eaten one at a time; entire stack for other stuff */
    if (obj.quan > 1 && obj.oclass === OCLASSES.FOOD_CLASS)
        obj = splitobj(obj, 1);

    if (obj.unpaid)
        note_unported('dog_eat:shop');

    /* src/dogmove.c:264 — announce the meal. The food is at the pet's
       CURRENT square; <x,y> is where it started the turn, and the two differ
       when it moved and ate on the same turn. */
    if (is_pool(mtmp.mx, mtmp.my) && !game.u.uinwater) {
        /* Don't print obj */
    } else {
        const seeobj = cansee(mtmp.mx, mtmp.my);
        const sawpet = cansee(x, y) && mon_visible(mtmp);

        if (sawpet || (seeobj && canspotmon(mtmp))) {
            const obj_name = doname(obj);   /* distant_name(obj, doname) */
            if (tunnels(game.mons[mtmp.mnum]))
                await pline(`${noit_Monnam(mtmp)} digs in.`);
            else
                await pline(`${noit_Monnam(mtmp)} ${
                    devour ? 'devours' : 'eats'} ${obj_name}.`);
        } else if (seeobj) {
            const obj_name = doname(obj);
            await pline(`It ${devour ? 'devours' : 'eats'} ${obj_name}.`);
        }
    }

    if (game.mons[mtmp.mnum] === game.mons[PMNAMES.PM_RUST_MONSTER]
        && obj.oerodeproof) {
        note_unported('dog_eat:rustproof');
        obj.oerodeproof = 0;
        mtmp.mstun = 1;
    } else {
        /* It's a reward if it's DOGFOOD and the player dropped/threw it.
           We know the player had it if invlet is set. -dlc */
        if (dogfood(mtmp, obj) === DOGFOOD && obj.invlet) {
            edog.apport += Math.trunc(200 / (edog.dropdist + game.moves
                                             - edog.droptime));
            if (edog.apport <= 0)
                edog.apport = 1;        /* impossible() in C */
        }
        await m_consume_obj(mtmp, obj);
    }

    return DEADMONSTER(mtmp) ? 2 : 1;
}

export function dog_goal(mtmp, edog, after, udist, whappr) {
    /* src/dogmove.c:495 — steeds don't move on their own will */
    if (mtmp === game.u.usteed)
        return -2;

    const omx = mtmp.mx, omy = mtmp.my;

    const min_x = Math.max(omx - SQSRCHRADIUS, 1);
    const max_x = Math.min(omx + SQSRCHRADIUS, COLNO - 1);
    const min_y = Math.max(omy - SQSRCHRADIUS, 0);
    const max_y = Math.min(omy + SQSRCHRADIUS, ROWNO - 1);

    /* src/dogmove.c — gg.gtyp/gg.gx/gg.gy, the goal chosen so far. C suppresses
       a 'used before set' warning by zeroing the coordinates. */
    let gtyp = UNDEF;
    let gx = 0, gy = 0;

    /* #define DDIST(x, y) (dist2(x, y, omx, omy)) */
    const DDIST = (x, y) => dist2(x, y, omx, omy);

    /* src/dogmove.c — both gate the APPORT branch. droppables() reads the
       real minvent now that dog_invent's fetch arm calls mpickobj, and the
       flag flips the moment the pet picks something up: the apport rn2(8)
       stops drawing and the follow block gains its rn2(apport) term. */
    const in_masters_sight = couldsee(omx, omy);
    const dog_has_minvent = !!droppables(mtmp);

    if (!edog || mtmp.mleashed) {
        gtyp = APPORT;
        gx = game.u.ux;
        gy = game.u.uy;
    } else for (const obj of (game.level.objects || [])) {
        /* C walks fobj, the FLOOR chain: an object the hero picked up
           (where OBJ_INVENT, ox/oy stale) or a contained one must not be
           scanned — dogfood() draws, so a phantom entry desyncs the pet. */
        if (obj.where !== undefined && obj.where !== OBJ_FLOOR)
            continue;
        const nx = obj.ox, ny = obj.oy;
        if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) {
            const otyp = dogfood(mtmp, obj);
            /* skip inferior goals */
            if (otyp > gtyp || otyp === UNDEF)
                continue;
            /* src/dogmove.c:536 — avoid cursed items unless starving. This
               `continue` is NOT draw-neutral: it skips the APPORT arm below,
               whose `apport > rn2(8)` is a draw. */
            if (cursed_object_at(nx, ny)
                && !(mtmp.edog?.mhpmax_penalty && otyp < MANFOOD))
                continue;
            if (!could_reach_item(mtmp, nx, ny)
                || !can_reach_location(mtmp, mtmp.mx, mtmp.my, nx, ny))
                continue;
            if (otyp < MANFOOD) {
                if (otyp < gtyp || DDIST(nx, ny) < DDIST(gx, gy)) {
                    gx = nx;
                    gy = ny;
                    gtyp = otyp;
                }
            } else if (gtyp === UNDEF && in_masters_sight
                       && !dog_has_minvent
                       && (!game.level.at(omx, omy)?.lit
                           || game.level.at(game.u.ux, game.u.uy)?.lit)
                       && (otyp === MANFOOD || m_cansee(mtmp, nx, ny))
                       && mtmp.edog?.apport > rn2(8)
                       && can_carry(mtmp, obj) > 0) {
                gx = nx;
                gy = ny;
                gtyp = APPORT;
            }
        }
    }

    /* src/dogmove.c:483 — appr is declared at function scope in C, and both
       the follow-player branch and its else arm assign it. */
    let appr = 0;

    /* src/dogmove.c:566 — follow the player.
     *
     *     if (gg.gtyp == UNDEF || (gg.gtyp != DOGFOOD && gg.gtyp != APPORT
     *                           && svm.moves < edog->hungrytime)) {
     *
     * The second arm is not optional. A goal that is neither DOGFOOD nor
     * APPORT is something the pet would eat only if it were hungry, so while
     * it is still full it follows the hero INSTEAD, and follows with an appr
     * computed here rather than the flat 1 the else arm uses. That changes
     * dog_move's `j = (ndist - nidist) * appr`: with appr 0 every candidate
     * gives j == 0 and spends an rn2(++chcnt), and with appr 1 none of them
     * do. Testing only for UNDEF made the pet march at a corpse it had no
     * appetite for and skip that whole run of draws. */
    if (gtyp === UNDEF || (gtyp !== DOGFOOD && gtyp !== APPORT
                           && game.moves < (edog?.hungrytime ?? 0))) {
        /* src/dogmove.c:566 — gg.gx/gg.gy ARE the goal dog_move steers by
           (GDIST reads them). Writing them into a separate game.gg left the
           local gx/gy at 0,0, so an appr = 1 pet walked toward the top-left
           corner of the map instead of toward the hero. */
        gx = game.u.ux;
        gy = game.u.uy;

        if (after && udist <= 4 && game.u.ux === gx && game.u.uy === gy)
            return -2;

        appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        if (udist > 1) {
            if (!IS_ROOM(game.level.at(game.u.ux, game.u.uy)?.typ)
                || !rn2(4) || whappr
                || (dog_has_minvent && rn2(edog?.apport ?? 0)))
                appr = 1;
        }

        /* a pet follows more closely when the hero is carrying its food, is
           on stairs, or is beside a magic portal. The inventory scan calls
           dogfood() on EVERY carried item, and dogfood() draws — so this is
           one rn2(100) per item in the pack. */
        if (appr === 0) {
            if (On_stairs(game.u.ux, game.u.uy)) {
                appr = 1;
            } else {
                for (const obj of (game.invent || [])) {
                    if (dogfood(mtmp, obj) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
                if (appr === 0) {
                    const t = (game.level?.traps || [])
                                  .find(tr => tr.ttyp === MAGIC_PORTAL);
                    if (t && distu(t.tx, t.ty) <= 2)
                        appr = 1;
                }
            }
        }
    } else {
        /* src/dogmove.c:605-606 — the else arm of the follow-player test sets
           appr = 1 because gtyp is not UNDEF: the object search DID find a
           goal, so head for it. Returning 0 here made the pet wander instead,
           discarding the goal the box scan had just computed. */
        appr = 1;
    }

    /* src/dogmove.c:607 */
    if (mtmp.mconf)
        appr = 0;

    /* src/dogmove.c:611-641 — the goal is the hero but the master cannot
       see the pet: aim at the hero's trail instead, then at the remembered
       ogoal, then at the point of the pet's sight area nearest the hero
       (wantdoor over do_clear_area radius 9 — in practice the room exit),
       and only give up and target the hero directly from a vault. */
    const FARAWAY = COLNO + 2; /* position outside screen */
    if (gx === game.u.ux && gy === game.u.uy && !in_masters_sight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            gx = cp.x;
            gy = cp.y;
            if (edog)
                edog.ogoal = { x: 0, y: 0 };
        } else {
            /* assume master hasn't moved far, and reuse previous goal */
            if (edog && edog.ogoal && edog.ogoal.x
                && (edog.ogoal.x !== omx || edog.ogoal.y !== omy)) {
                gx = edog.ogoal.x;
                gy = edog.ogoal.y;
                edog.ogoal = { x: 0, y: 0 };
            } else {
                const fard = { dist: FARAWAY * FARAWAY, x: FARAWAY, y: FARAWAY };
                do_clear_area(omx, omy, 9, wantdoor, fard);
                gx = fard.x;
                gy = fard.y;

                /* here gx == FARAWAY e.g. when dog is in a vault */
                if (gx === FARAWAY || (gx === omx && gy === omy)) {
                    gx = game.u.ux;
                    gy = game.u.uy;
                } else if (edog) {
                    edog.ogoal = { x: gx, y: gy };
                }
            }
        }
    } else if (edog) {
        edog.ogoal = { x: 0, y: 0 };
    }

    /* src/dogmove.c — gg is ONE struct shared by dog_goal and dog_move; our
       dog_move reads it through GDIST(), so publish the goal rather than
       leaving the two halves out of step. */
    game.gg = { gx, gy, gtyp };
    return appr;
}

// src/dogmove.c:1470 wantdoor() — do_clear_area callback: remember the
// position closest to the hero. C writes straight into gg.gx/gg.gy; the
// port carries them in the arg so dog_goal's locals stay the source of
// truth until it publishes game.gg.
function wantdoor(x, y, dd) {
    const ndist = distu(x, y);
    if (dd.dist > ndist) {
        dd.x = x;
        dd.y = y;
        dd.dist = ndist;
    }
}

/* src/stairs.c:148 On_stairs() — stairway_at(x, y) != NULL.
   The stairs live on the game.stairs LINKED LIST written by mklev
   (js/mklev.js:181, C's gs.stairs chain). This used to read
   game.level.stairs, an array nothing ever writes, so it was always false
   and every pet turn ran the hero-inventory dogfood scan that C skips
   whenever the hero stands on stairs -- which the hero does from turn one,
   since the game starts on the upstairs. Four extra rn2(100)s per pet turn
   from the first move. */
function On_stairs(x, y) {
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y)
            return true;
    return false;
}

// src/dogmove.c:977 dog_move() — the pet's turn.
//
// dog_hunger() and dog_invent() come first in C and both draw; neither is
// ported, so this reaches dog_goal()'s search only. The stream is right up to
// the point one of those would have fired.
// src/dogmove.c find_friends() — is the master or another pet standing behind
// the target, in the line of fire? Draws nothing.
function find_friends(mtmp, mtarg, maxdist) {
    const dx = sgn(mtarg.mx - mtmp.mx), dy = sgn(mtarg.my - mtmp.my);
    let curx = mtarg.mx, cury = mtarg.my;
    let dist = distmin(mtarg.mx, mtarg.my, mtmp.mx, mtmp.my);

    for (; dist <= maxdist; ++dist) {
        curx += dx;
        cury += dy;

        if (!isok(curx, cury))
            return false;
        /* If the pet can't see beyond this point, don't check any farther */
        if (!m_cansee(mtmp, curx, cury))
            return false;
        /* Does pet think you're here? */
        if (mtmp.mux === curx && mtmp.muy === cury)
            return true;

        const pal = m_at(curx, cury);
        if (pal) {
            if (pal.mtame) {
                /* Pet won't notice invisible pets */
                if (!pal.minvis || perceives(game.mons[mtmp.mnum]))
                    return true;
            } else {
                /* Quest leaders and guardians are always seen */
                const pd = game.mons[pal.mnum];
                if (pd.msound === MSOUND.MS_LEADER
                    || pd.msound === MSOUND.MS_GUARDIAN)
                    return true;
            }
        }
    }
    return false;
}

// src/dogmove.c find_targ() — walk outwards along <dx,dy> for maxdist squares
// and return the first monster the pet can see. Draws nothing, but m_cansee()
// stops the walk, which is what keeps the pet from targeting through walls.
function find_targ(mtmp, dx, dy, maxdist) {
    let targ = null;
    let curx = mtmp.mx, cury = mtmp.my;

    for (let dist = 0; dist < maxdist; ++dist) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury))
            break;
        if (!m_cansee(mtmp, curx, cury))
            break;
        if (curx === mtmp.mux && cury === mtmp.muy)
            return game.u;                 /* &gy.youmonst */

        targ = m_at(curx, cury);
        if (targ) {
            /* Is the monster visible to the pet? */
            if ((!targ.minvis || perceives(game.mons[mtmp.mnum]))
                && !targ.mundetected
                /* if a long worm, only accept the head as a target */
                && targ.mx === curx && targ.my === cury)
                break;
            /* If the pet can't see it, it assumes it ain't there */
            targ = null;
        }
    }
    return targ;
}

// src/dogmove.c:738 score_targ() — how attractive is this target?
//
// Its `score += rnd(5)` fires once per target found and is the draw that
// seed0102 and seed0105 were missing. The two rn2(3)s only fire for a confused
// pet and the rn2(mtmp_lev/2+1) only for a vampshifter, so an ordinary pet
// spends exactly one draw here per target.
function score_targ(mtmp, mtarg) {
    let score = 0;

    /* Give 1 in 3 chance of safe breathing even if pet is confused */
    if (!mtmp.mconf || !rn2(3)) {
        let mtmp_lev;
        const tdat = (mtarg === game.u) ? null : game.mons[mtarg.mnum];

        /* the priest/minion alignment arms need the priest subsystem; no
           minion or priest is adjacent to a pet on an ordinary level */
        if (mtmp.isminion || mtmp.ispriest || mtarg.isminion || mtarg.ispriest)
            note_unported('score_targ:faith');

        /* Never target quest friendlies */
        if (tdat && (tdat.msound === MSOUND.MS_LEADER
                     || tdat.msound === MSOUND.MS_GUARDIAN))
            return -5000;
        /* Is monster adjacent? */
        if (distmin(mtmp.mx, mtmp.my, mtarg.mx ?? game.u.ux,
                    mtarg.my ?? game.u.uy) <= 1)
            return score - 3000;
        /* Is the monster peaceful or tame? Pets are never targeted */
        if (mtarg === game.u || mtarg.mtame)
            return score - 3000;
        /* Is master/pet behind monster? Check up to 15 squares beyond pet. */
        if (find_friends(mtmp, mtarg, 15))
            return score - 3000;
        /* Target hostile monsters in preference to peaceful ones */
        if (!mtarg.mpeaceful)
            score += 10;
        /* Is the monster passive? Don't waste energy on it, if so */
        if (tdat.mattk[0][0] === ATTKS.AT_NONE)
            score -= 1000;
        /* Even weak pets with breath attacks shouldn't take on very
           low-level monsters. */
        if ((mtarg.m_lev < 2 && mtmp.m_lev > 5)
            || (mtmp.m_lev > 12 && mtarg.m_lev < mtmp.m_lev - 9
                && game.u.ulevel > 8 && mtarg.m_lev < game.u.ulevel - 7))
            score -= 25;
        /* a vampshifter in weak form attacks as if in vampire form */
        mtmp_lev = mtmp.m_lev;
        if (is_vampshifter(mtmp)
            && game.mons[mtmp.mnum].mlet !== MONSYMS.S_VAMPIRE) {
            mtmp_lev = game.mons[mtmp.cham].mlevel;
            /* actual vampire level ranges from 1.0*mlvl to 1.5*mlvl */
            mtmp_lev += rn2(Math.trunc(mtmp_lev / 2) + 1);
            if (mtmp.m_lev > mtmp_lev)
                mtmp_lev = mtmp.m_lev;
        }
        /* pets hesitate to attack vastly stronger foes */
        if (mtarg.m_lev > mtmp_lev + 4)
            score -= (mtarg.m_lev - mtmp_lev) * 20;
        /* All things being the same, go for the beefiest monster. */
        score += mtarg.m_lev * 2 + Math.trunc(mtarg.mhp / 3);
    }
    /* Fuzz factor to make things less predictable when very similar targets
       are abundant. */
    score += rnd(5);
    /* Pet may decide not to use ranged attack when confused */
    if (mtmp.mconf && !rn2(3))
        score -= 1000;
    return score;
}

// src/dogmove.c:838 best_target() — the best target in a straight line from the
// pet, scanning all eight directions out to 7 squares.
function best_target(mtmp, forced) {
    let bestscore = -40000;
    let best_targ = null;

    if (!mtmp)
        return null;
    /* If the pet is blind, it's not going to see any target */
    if (!mtmp.mcansee)
        return null;

    for (let dy = -1; dy < 2; ++dy) {
        for (let dx = -1; dx < 2; ++dx) {
            if (!dx && !dy)
                continue;
            const temp_targ = find_targ(mtmp, dx, dy, 7);
            if (!temp_targ)
                continue;
            const currscore = score_targ(mtmp, temp_targ);
            if (currscore > bestscore) {
                bestscore = currscore;
                best_targ = temp_targ;
            }
        }
    }

    /* Filter out targets the pet doesn't like */
    if (!forced && bestscore < 0)
        best_targ = null;

    return best_targ;
}

// src/dogmove.c:889 pet_ranged_attk() — the pet considers a ranged attack.
//
// dog_move calls this AFTER its position loop and BEFORE committing the move
// (src/dogmove.c:1273). We were not calling it at all, which is why seed0102
// and seed0105 both stop at score_targ's rnd(5).
export async function pet_ranged_attk(mtmp, forced) {
    let hungry = false;

    /* How hungry is the pet? */
    if (!mtmp.isminion && mtmp.edog)
        hungry = (game.moves > (mtmp.edog.hungrytime + DOG_HUNGRY));

    const mtarg = best_target(mtmp, forced);

    /* Hungry pets are unlikely to use breath/spit attacks */
    if (mtarg && (!hungry || !rn2(5))) {
        let mstatus = M_ATTK_MISS;

        if (mtarg === game.youmonst) {
            /* same dynamic import this file already uses for mattacku */
            const { mattacku } = await import('./mhitu.js');
            if (await mattacku(mtmp))
                return MMOVE_DIED;
            /* Treat this as the pet having initiated an attack even if it
             * didn't, so it will lose its move. */
            mstatus = M_ATTK_HIT;
        } else {
            game.bhitpos = { x: mtmp.mx, y: mtmp.my };
            game.notonhead = false;
            mstatus = await mattackm(mtmp, mtarg);

            /* Shouldn't happen, really */
            if (mstatus & M_ATTK_AGR_DIED)
                return MMOVE_DIED;

            /* Allow the targeted nasty to strike back - if
             * the targeted beast doesn't have a ranged attack,
             * nothing will happen. */
            if ((mstatus & M_ATTK_HIT) && !(mstatus & M_ATTK_DEF_DIED)
                && rn2(4) && mtarg !== game.youmonst) {
                /* if it can see, it can retaliate even if the pet is
                   invisible: it saw the direction the attack came from */
                if (mtarg.mcansee && haseyes(game.mons[mtarg.mnum])) {
                    game.bhitpos = { x: mtmp.mx, y: mtmp.my };
                    game.notonhead = false;
                    const mresp = await mattackm(mtarg, mtmp);
                    if (mresp & M_ATTK_DEF_DIED)
                        return MMOVE_DIED;
                }
            }
        }
        /* Only return MMOVE_DONE if the pet actually made a ranged attack,
         * and thus should lose the rest of its move. */
        if (mstatus !== M_ATTK_MISS)
            return MMOVE_DONE;
    } else if (forced) {
        /* domonnoise() (src/sounds.c) is not ported; only #chat-forced
           calls pass forced=TRUE and none does yet */
        note_unported('pet_ranged_attk:domonnoise');
    }
    return MMOVE_NOTHING;
}

// src/dogmove.c:11-12
// src/dogmove.c:10-12
const DOG_HUNGRY = 300, DOG_WEAK = 500, DOG_STARVE = 750;


// src/dogmove.c dog_hunger() — a pet that has not eaten in DOG_WEAK turns is
// weakened, and in DOG_STARVE turns it dies. Draws nothing: it is a comparison
// of moves against edog->hungrytime, plus messages.
//
// Returns TRUE when the pet died, which makes dog_move return MMOVE_DIED and
// stops dochug from calling distfleeck a second time for it — so a pet that
// starves changes the DRAW COUNT of the turn even though this function itself
// spends nothing.
async function dog_hunger(mtmp, edog) {
    const mdat = game.mons[mtmp.mnum];

    if (game.moves > edog.hungrytime + DOG_WEAK) {
        if (!carnivorous(mdat) && !herbivorous(mdat)) {
            edog.hungrytime = game.moves + DOG_WEAK;
            /* but not too high; it might polymorph */
        } else if (!edog.mhpmax_penalty) {
            /* starving pets are limited in healing */
            const newmhpmax = Math.trunc(mtmp.mhpmax / 3);
            mtmp.mconf = 1;
            edog.mhpmax_penalty = mtmp.mhpmax - newmhpmax;
            mtmp.mhpmax = newmhpmax;
            if (mtmp.mhp > mtmp.mhpmax)
                mtmp.mhp = mtmp.mhpmax;
            if (DEADMONSTER(mtmp)) {
                note_unported('dog_starve');
                return true;
            }
            if (cansee(mtmp.mx, mtmp.my)) {
                await pline(`${Monnam(mtmp)} is confused from hunger.`);
            } else if (couldsee(mtmp.mx, mtmp.my)) {
                note_unported('dog_hunger:beg');
            } else {
                await You_feel(`worried about ${y_monnam(mtmp)}.`);
            }
            const { stop_occupation } = await import('./allmain.js');
            await stop_occupation();
        } else if (game.moves > edog.hungrytime + DOG_STARVE
                   || DEADMONSTER(mtmp)) {
            note_unported('dog_starve');
            return true;
        }
    }
    return false;
}

export async function dog_move(mtmp, after) {
    const edog = mtmp.mtame ? (mtmp.edog || {}) : null;
    if (!edog) return 0;

    if (await dog_hunger(mtmp, edog))
        return MMOVE_DIED;

    const omx = mtmp.mx, omy = mtmp.my;
    let udist = distu(omx, omy);

    /* src/dogmove.c:1016 — let steeds eat and maybe throw rider during
       Conflict; a steed shares the hero's square so distu()==0, and C forces
       udist to 1 instead of taking the !udist early return. */
    if (mtmp === game.u.usteed) {
        if (game.u.uprops?.CONFLICT)
            note_unported('dog_move:steed_conflict_throw');
        udist = 1;
    } else if (!udist) {
        /* maybe we tamed him while being swallowed --jgm */
        return MMOVE_NOTHING;
    }

    /* src/dogmove.c:1032 — a pet that ate or picked something up is done for
       the turn; `goto newdogpos` with nix,niy still at omx,omy, so the
       movement block reduces to the leash kludge and it returns MMOVE_MOVED. */
    const j_inv = await dog_invent(mtmp, edog, udist);
    if (j_inv === 2) {
        if (globalThis.__dog_trace) console.error('DOGPRE invent2');
        return DEADMONSTER(mtmp) ? MMOVE_DIED : MMOVE_DONE;
    } else if (j_inv === 1) {
        if (globalThis.__dog_trace) console.error('DOGPRE invent1');
        return MMOVE_MOVED;
    }

    /* src/dogmove.c:1038 — whappr is TRUE for the five turns after the pet was
       whistled for, and edog->whistletime starts at 0, so it is TRUE for the
       whole opening of the game. Hardcoding it to 0 left appr at 0 there, which
       makes the pet WANDER by reservoir sample instead of approaching the hero
       — a completely different path from C's, drawn with the same numbers. */
    const whappr = (game.moves - (edog.whistletime || 0)) < 5 ? 1 : 0;
    const appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2) {
        if (globalThis.__dog_trace) console.error('DOGPRE goal-2');
        return MMOVE_NOTHING;
    }

    /* src/dogmove.c:1046 — a conflicted pet rolls resist_conflict every
       action; an edog that fails just keeps going (the non-edog guardian
       angel arm needs minions) */
    if (game.u.uprops?.CONFLICT && !resist_conflict(mtmp)) {
        if (!edog)
            (game.unported ||= new Set()).add('dog_move:lose_guardian_angel');
    }

    /* src/dogmove.c:1062 — the squares the pet may move to */
    const mfp = {};
    const cnt = mfndpos(mtmp, mfp, mon_allowflags(mtmp));

    /* Debug-only trace (never set during scoring): log the pet's goal and
       candidate squares. globalThis.__dog_trace = true */
    if (globalThis.__dog_trace) {
        const trk = (mtmp.mtrack || []);
        console.error(`DOGTRK t=${game.moves} (${omx},${omy}) trk=` +
            [0,1,2,3].map(i => `${trk[i]?.x ?? 0},${trk[i]?.y ?? 0}`).join(' '));
    }
    if (globalThis.__dog_trace)
        console.error(`DOGTRACE turn=${game.moves} pet(${omx},${omy})`
            + ` goal=(${game.gg?.gtyp},${game.gg?.gx},${game.gg?.gy})`
            + ` appr=${appr} cnt=${cnt} poss=${(mfp.poss || []).slice(0, cnt)
                  .map((p, i) => `${p.x},${p.y}:${(mfp.info[i] || 0).toString(16)}`)
                  .join(' ')}`);

    /* Dogs normally avoid cursed items, so count the clean squares first;
       the count is the bound of the rn2 below. */
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;
        /* src/dogmove.c:1073 — a square holding a monster the pet may not
           attack or displace is not a free square, so it does not count. */
        if (m_at(nx, ny) && !(mfp.info[i] & (ALLOW_M | ALLOW_MDISP))) {
            if (globalThis.__dog_trace)
                console.error(`DOGUNC skip-mon (${nx},${ny}) info=${(mfp.info[i]|0).toString(16)} ALLOW_M=${ALLOW_M.toString(16)}`);
            continue;
        }
        if (cursed_object_at(nx, ny)) {
            if (globalThis.__dog_trace)
                console.error(`DOGUNC skip-curse (${nx},${ny})`);
            continue;
        }
        uncursedcnt++;
    }
    if (globalThis.__dog_trace)
        console.error(`DOGUNC t=${game.moves} uncursedcnt=${uncursedcnt}`);

    let nix = omx, niy = omy, chi = -1, chcnt = 0;
    /* src/dogmove.c:1010 — do_eat and the obj it refers to are function-scope
       in C because the pet has to be MOVED before it can eat; the flag is what
       carries the decision across the goto to newdogpos. */
    let do_eat = false, eat_obj = null;
    let nidist = GDIST(nix, niy);
    /* src/dogmove.c:989 — cursemsg[] is PER CANDIDATE and is filled in by the
       object walk below, not by a helper called on demand. Keeping it as an
       array matters because the newdogpos code reads cursemsg[chi] for the
       square finally chosen. */
    const cursemsg = new Array(cnt).fill(false);

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;

        if (mtmp.mleashed && distu(nx, ny) > 4)
            continue;

        /* src/dogmove.c:1141 — the ALLOW_M attack and ALLOW_MDISP displace
           branches need mattackm/mdisplacem, the monster-vs-monster combat
           path. Both draw, so stop rather than guess their numbers. */
        /* src/dogmove.c:1073 — a square holding a monster is only a
           candidate when attacking or displacing it is permitted. */
        if (m_at(nx, ny) && !(mfp.info[i] & (ALLOW_M | ALLOW_MDISP)))
            continue;

        /* src/dogmove.c:1102 — the ALLOW_M attack branch.

           ALLOW_U is no longer skipped here, because C does not skip it: it
           handles it at newdogpos (dogmove.c:1280). In practice this changes
           nothing for a pet -- mon_allowflags (src/mon.c:2085) only sets
           ALLOW_U on the non-tame, non-peaceful arm, so a pet never carries
           it -- but matching the C costs nothing and removes a condition that
           would be wrong the moment a conflicted pet did get the flag. */
        if ((mfp.info[i] & ALLOW_M) && m_at(nx, ny)) {
            const mtmp2 = m_at(nx, ny);
            /* audacity: how much higher-level a foe the pet will start */
            const balk = mtmp.m_lev
                         + Math.trunc((5 * mtmp.mhp) / mtmp.mhpmax) - 2;

            if (mtmp2.m_lev >= balk
                || (mtmp2.mtame && mtmp.mtame /* && !Conflict */)
                || (max_passive_dmg(mtmp2, mtmp) >= mtmp.mhp)
                || ((mtmp.mhp * 4 < mtmp.mhpmax
                     || game.mons[mtmp2.mnum].msound === MSOUND.MS_GUARDIAN
                     || game.mons[mtmp2.mnum].msound === MSOUND.MS_LEADER)
                    && mtmp2.mpeaceful /* && !Conflict */)) {
                continue;
            }
            /* src/dogmove.c:1130 — the floating eye / gelatinous cube /
               petrifier avoidance. The eye and cube arms DRAW rn2(10). */
            if ((mtmp2.mnum === PMNAMES.PM_FLOATING_EYE && rn2(10)
                 && mtmp.mcansee && haseyes(game.mons[mtmp.mnum])
                 && mtmp2.mcansee && !mtmp2.minvis)
                || (mtmp2.mnum === PMNAMES.PM_GELATINOUS_CUBE && rn2(10))
                || (touch_petrifies(game.mons[mtmp2.mnum])
                    && !resists_ston(mtmp))) {
                /* adjacent, so a ranged attack is never the fallback */
                continue;
            }

            if (after)
                return MMOVE_NOTHING; /* hit only once each move */

            game.bhitpos = { x: nx, y: ny };
            let mstatus = await mattackm(mtmp, mtmp2);

            /* aggressor (pet) died */
            if (mstatus & M_ATTK_AGR_DIED)
                return MMOVE_DIED;

            if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                && rn2(4)
                && mtmp2.mlstmv !== game.moves
                && !onscary(mtmp.mx, mtmp.my, mtmp2)
                && monnear(mtmp2, mtmp.mx, mtmp.my)) {
                game.bhitpos = { x: mtmp.mx, y: mtmp.my };
                mstatus = await mattackm(mtmp2, mtmp); /* return attack */
                if (mstatus & M_ATTK_DEF_DIED)
                    return MMOVE_DIED;
            }
            return MMOVE_DONE;
        }
        if ((mfp.info[i] & ALLOW_MDISP) && m_at(nx, ny)) {
            /* mdisplacem — monster displacement is absent */
            note_unported('dog_move displace branch');
            continue;
        }

        /* src/dogmove.c:1182 — keep clear of the square the hero just kicked,
           and of a Sokoban push line. Neither draws. */
        if (m_avoid_kicked_loc(mtmp, nx, ny))
            continue;
        if (m_avoid_soko_push_loc(mtmp, nx, ny))
            continue;

        /* src/dogmove.c:1197 — a dog avoids a harmful trap, but may have to
           cross one to keep up with the hero, so it steps on a trap it has
           SEEN once in forty tries. That rn2(40) was missing entirely: the
           whole block was absent, so no pet ever spent it.
           A leashed dog whimpers instead and is dragged across. */
        if ((mfp.info[i] & ALLOW_TRAPS) && t_at(nx, ny)) {
            const trap = t_at(nx, ny);
            if (mtmp.mleashed) {
                /* whimper() needs the sound code and the Deaf test */
                note_unported('dog_move:whimper');
            } else {
                if (trap.tseen && rn2(40))
                    continue;
            }
        }

        /* src/dogmove.c:1214 — dog eschews cursed objects, but likes dog food.
         *
         * This walks the objects ON the square, and that walk DRAWS: dogfood()
         * opens with obj_resists(obj, 0, 95), which spends an rn2(100) whatever
         * it returns. Substituting a cursed_object_at() helper for the walk
         * skipped one draw per non-cursed object on every candidate square,
         * which is the run of consecutive obj_resists calls the recordings show
         * right after dog_goal's rn2(8).
         *
         * Both short-circuits are load-bearing: a cursed object never reaches
         * dogfood(), and neither does anything when can_reach_food is false.
         */
        if (edog) {
            const can_reach_food = could_reach_item(mtmp, nx, ny);

            for (const obj of objects_at(nx, ny)) {
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else if (can_reach_food) {
                    const otyp = dogfood(mtmp, obj);
                    if (otyp < MANFOOD
                        && (otyp < ACCFOOD
                            || (edog.hungrytime ?? 0) <= game.moves)) {
                        /* the dog likes the food so much it might eat it even
                           when it conceals a cursed object */
                        nix = nx;
                        niy = ny;
                        chi = i;
                        cursemsg[i] = false;    /* not reluctant */
                        eat_obj = obj;
                        do_eat = true;          /* do_eat = TRUE */
                        break;                  /* goto newdogpos */
                    }
                }
            }
            if (do_eat)
                break;                          /* goto newdogpos */
        }

        /* didn't find something to eat; if we saw a cursed item and aren't
           being forced to walk on it, usually keep looking */
        if (cursemsg[i] && !mtmp.mleashed && uncursedcnt > 0
            && rn2(13 * uncursedcnt))
            continue;

        /* lessen the chance of backtracking; only when loose and far away */
        if (!mtmp.mleashed && distmin(omx, omy, game.u.ux, game.u.uy) > 5) {
            const k = edog ? uncursedcnt : cnt;
            let skip = false;
            const track = mtmp.mtrack || [];
            for (let j = 0; j < MTSZ && j < k - 1; j++)
                if (track[j] && nx === track[j].x && ny === track[j].y)
                    if (rn2(MTSZ * (k - j))) { skip = true; break; }
            if (skip) continue;
        }

        const ndist = GDIST(nx, ny);
        const j = (ndist - nidist) * appr;
        if ((j === 0 && !rn2(++chcnt)) || j < 0
            || (j > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0) chcnt = 0;
            chi = i;
        }
    }

    /* src/dogmove.c:1273 — the pet has not attacked anything but is about to
       move; now is the time for a ranged attack. C calls this AFTER the
       position loop and BEFORE newdogpos, unconditionally. */
    if (!do_eat) {      /* C's `goto newdogpos` at dogmove.c:1231 jumps OVER
                           this call, so a pet that is about to eat never
                           reaches it and never spends score_targ's rnd(5) */
        const i = await pet_ranged_attk(mtmp, false);
        if (i !== MMOVE_NOTHING)
            return i;
    }

    if (globalThis.__dog_trace)
        console.error(`DOGCHOSE turn=${game.moves} (${omx},${omy})->` +
            `(${nix},${niy}) chi=${chi} do_eat=${do_eat} hero(${game.u.ux},${game.u.uy})`);

    /* src/dogmove.c:1276 newdogpos — apply the move. Draws nothing: it is
       remove_monster() followed by place_monster(), which for us is just the
       pet's coordinates. C does NOT reorder fmon here, so neither do we.
       Without this the pet stands still for the whole game and its search box
       drifts further from C's with every turn. */
    if (nix !== omx || niy !== omy) {
        /* src/dogmove.c:1280 — a pet whose chosen square is the hero's
           attacks instead of moving (conflict, confusion). */
        if (chi >= 0 && (mfp.info[chi] & ALLOW_U)) {
            if (mtmp.mleashed)
                note_unported('newdogpos:m_unleash');
            const { mattacku } = await import('./mhitu.js');
            await mattacku(mtmp);
            return MMOVE_DONE;
        }
        /* src/dogmove.c:1313 mon_track_add() — remember where we came
           from, newest first */
        mon_track_add(mtmp, omx, omy);

        /* src/monmove.c:2051 — remove then place, so level.monsters[][] tracks
           the move. Writing mx/my alone leaves m_at() answering with the old
           square. */
        const wasseen = canseemon(mtmp);
        remove_monster(omx, omy);
        place_monster(mtmp, nix, niy);
        /* src/dogmove.c:1298 — the pet moved onto a pile it dislikes (a
           cursed object somewhere in it): describe the TOP remembered item
           of the pile, not the cursed item itself. */
        if (cursemsg[chi] && (wasseen || canseemon(mtmp))) {
            const loc = game.level.at(nix, niy);
            const memobj = (!Hallucination()
                            && loc?.remembered_glyph?.glyph?.kind === 'obj')
                ? (game.level.objects || []).find(o => o.ox === nix && o.oy === niy)
                : null;
            const what = memobj ? doname(memobj) : 'something';
            await pline(`${x_monnam(mtmp, ARTICLE_YOUR, null, 0, false)
                .replace(/^./, c => c.toUpperCase())} steps reluctantly ${
                (is_flyer(mtmp.data) || is_floater(mtmp.data)) ? 'over' : 'onto'
                } ${what}.`);
        }
        /* src/dogmove.c:1354 — the move refreshes the pet's idea of where
           the hero is. A tame monster's set_apparxy draws nothing, but the
           call belongs here for the day a pet goes feral mid-move. */
        set_apparxy(mtmp);
        /* src/dogmove.c:1318 — "We have to know if the pet's going to do a
           combined eat and move before moving it, but it can't eat until
           after being moved. Thus the do_eat flag." omx,omy is where the pet
           STARTED the turn, which is what dog_eat wants for its newsym pair. */
        if (do_eat) {
            if (await dog_eat(mtmp, eat_obj, omx, omy, false) === 2)
                return MMOVE_DIED;
        }
        return MMOVE_MOVED;
    }
    /* src/dogmove.c:1356 — the STAY case also returns MMOVE_MOVED: the pet
       spent its action, and postmov() then runs mintrap() on the square it
       is standing on. A pony camped on a seen bear trap draws the
       already-seen rn2(4) dodge on every stay-action; returning
       MMOVE_NOTHING here silently skipped all of them (seed0004's head). */
    return MMOVE_MOVED;
}

/* include/monst.h MTSZ — how many previous squares a monster remembers. */
const MTSZ = 4;

/* src/dogmove.c GDIST(x,y) = dist2(x, y, gg.gx, gg.gy) */
function GDIST(x, y) {
    const gx = game.gg?.gx ?? game.u.ux, gy = game.gg?.gy ?? game.u.uy;
    const dx = x - gx, dy = y - gy;
    return dx * dx + dy * dy;
}

/* src/hack.c distmin() — the Chebyshev distance */
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
}

/* src/dogmove.c cursed_object_at() */
function cursed_object_at(x, y) {
    return (game.level?.objects || [])
               .some(o => o.ox === x && o.oy === y && o.cursed);
}

/* src/rm.h svl.level.objects[x][y] — the pile on one square, walked through
   ->nexthere. place_object() PREPENDS to the level list, so filtering it in
   order gives newest-first, which is the order the chain has. Every caller
   that draws per object depends on that order. */
function objects_at(x, y) {
    /* C's svl.level.objects[x][y] nexthere chain holds FLOOR objects only;
       a contained/buried object at the same coords must not be scanned.
       (Retried per NOTES now that place_object stamps where=OBJ_FLOOR.) */
    return (game.level?.objects || [])
        .filter(o => o.ox === x && o.oy === y
                     && (o.where === undefined || o.where === OBJ_FLOOR));
}

// src/dogmove.c:410 dog_invent() — the pet drops what it carries, or picks up
// what it is standing on.
//
// Both halves are guarded, and in the common case — nothing carried, nothing
// underfoot — this draws NOTHING. That is what the recordings show: seed0101
// and seed0102 both go straight from distfleeck to dog_goal's first dogfood.
// Getting the guards right therefore matters as much as the draws.
/* src/dogmove.c:138 nofetch[] = { BALL_CLASS, CHAIN_CLASS, ROCK_CLASS } */
const nofetch = [OCLASSES.BALL_CLASS, OCLASSES.CHAIN_CLASS, OCLASSES.ROCK_CLASS];

export async function dog_invent(mtmp, edog, udist) {
    if (helpless(mtmp) || mtmp.meating)
        return 0;

    const omx = mtmp.mx, omy = mtmp.my;

    if (droppables(mtmp)) {
        if (!rn2(udist + 1) || !rn2(edog.apport))
            if (rn2(10) < edog.apport) {
                await relobj(mtmp, mtmp.minvis ? 1 : 0, true);
                if (edog.apport > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = game.moves;
            }
    } else {
        const obj = (game.level.objects || [])
                        .find(o => o.ox === omx && o.oy === omy);
        if (obj && !nofetch.includes(obj.oclass)) {
            const edible = dogfood(mtmp, obj);

            if ((edible <= CADAVER
                 /* a starving pet is more aggressive about eating */
                 || (edog.mhpmax_penalty && edible === ACCFOOD))
                && could_reach_item(mtmp, obj.ox, obj.oy))
                return await dog_eat(mtmp, obj, omx, omy, false);

            /* src/dogmove.c:443 — the fetch. can_carry() and
               could_reach_item() draw nothing, but they gate TWO draws that
               were being skipped entirely: rn2(20) for whether the pet is
               interested at all, and then rn2(udist) or rn2(apport) for
               whether it bothers at this distance. */
            const carryamt = can_carry(mtmp, obj);
            if (carryamt > 0 && !obj.cursed
                && could_reach_item(mtmp, obj.ox, obj.oy)) {
                if (rn2(20) < edog.apport + 3) {
                    if (rn2(udist) || !rn2(edog.apport)) {
                        /* src/dogmove.c:450 — the pet takes the object. */
                        let otmp = obj;
                        if (carryamt !== obj.quan)
                            otmp = splitobj(obj, carryamt);
                        if (cansee(omx, omy)) {
                            /* C calls distant_name() BEFORE the extract,
                               because the chain distant_name -> doname ->
                               xname -> find_artifact wants otmp still on the
                               floor; no artifact discovery on this tree, so
                               doname supplies the printed name. */
                            const otmpname = distant_name(otmp, doname);
                            if (game.flags?.verbose)
                                await pline_xy(omx, omy,
                                    `${Monnam(mtmp)} picks up ${otmpname}.`);
                        }
                        obj_extract_self(otmp);
                        newsym(omx, omy);
                        mpickobj(mtmp, otmp);
                        if (attacktype(mtmp.data, ATTKS.AT_WEAP)
                            && mtmp.weapon_check === NEED_WEAPON) {
                            mtmp.weapon_check = NEED_HTH_WEAPON;
                            note_unported('dog_invent:mon_wield_item');
                        }
                        check_gear_next_turn(mtmp);
                    }
                }
            }
        }
    }
    return 0;
}

/* src/mon.c droppables() — the first thing in the pet's pack it would drop.
   Our monsters carry no inventory yet, so this is empty rather than wrong;
   m_initinv() is the gap, and it is recorded there. */
// src/dogmove.c droppables() — the object a pet will put down, or null.
//
// This was a one-line stub returning minvent[0] unconditionally, with no
// note_unported marker, so nothing flagged it and it read as finished code.
// It made our saddled pony report its WORN saddle as droppable, which sent
// dog_invent into a block C skips and spent an rn2(udist + 1) C never spends.
//
// The final test is the one that matters most and the stub had none of it:
//
//     if (!obj->owornmask && obj != wep) return obj;
//
// A worn or wielded object is never dropped. Everything above it decides
// which of several TOOLS the pet keeps: &dummy stands in for "already have
// one", so an animal or mindless monster keeps nothing, and an intelligent
// one holds a pick-axe only if it tunnels and needs one, a key only if it
// has hands and is not verysmall.
export function droppables(mtmp) {
    const dummy = { otyp: ONAMES.STRANGE_OBJECT, oartifact: 0 };
    const mdat = game.mons[mtmp.mnum];
    const wep = MON_WEP(mtmp);
    let pickaxe = null, unihorn = null, key = null;

    if (is_animal(mdat) || mindless(mdat)) {
        /* won't hang on to any objects of these types */
        pickaxe = unihorn = key = dummy;    /* act as if already have them */
    } else {
        /* don't hang on to pick-axe if can't use one or don't need one */
        if (!tunnels(mdat) || !needspick(mdat))
            pickaxe = dummy;
        /* don't hang on to key if can't open doors */
        if (nohands(mdat) || verysmall(mdat))
            key = dummy;
    }
    if (wep) {
        if (is_pick(wep))
            pickaxe = wep;
        if (wep.otyp === ONAMES.UNICORN_HORN)
            unihorn = wep;
        /* don't need any wielded check for keys... */
    }

    for (const obj of (mtmp.minvent || [])) {
        switch (obj.otyp) {
        case ONAMES.DWARVISH_MATTOCK:
            /* reject mattock if couldn't wield it */
            if (which_armor(mtmp, W_ARMS))
                break;
            /* keep mattock in preference to pick unless pick is already
               wielded or is an artifact and mattock isn't */
            if (pickaxe && pickaxe.otyp === ONAMES.PICK_AXE && pickaxe !== wep
                && (!pickaxe.oartifact || obj.oartifact))
                return pickaxe;         /* drop the one we decided to keep */
            /* FALLTHRU */
        case ONAMES.PICK_AXE:
            if (!pickaxe || (obj.oartifact && !pickaxe.oartifact)) {
                if (pickaxe)
                    return pickaxe;
                pickaxe = obj;          /* keep this digging tool */
                continue;
            }
            break;

        case ONAMES.UNICORN_HORN:
            if (obj.cursed)             /* reject cursed unicorn horns */
                break;
            if (!unihorn || (obj.oartifact && !unihorn.oartifact)) {
                if (unihorn)
                    return unihorn;
                unihorn = obj;
                continue;
            }
            break;

        case ONAMES.SKELETON_KEY:
            /* keep key in preference to lock-pick */
            if (key && key.otyp === ONAMES.LOCK_PICK
                && (!key.oartifact || obj.oartifact))
                return key;
            /* FALLTHRU */
        case ONAMES.LOCK_PICK:
            if (!key || (obj.oartifact && !key.oartifact)) {
                if (key)
                    return key;
                key = obj;              /* keep this unlocking tool */
                continue;
            }
            break;

        default:
            break;
        }

        if (!obj.owornmask && obj !== wep)
            return obj;
    }

    return null;                        /* don't drop anything */
}

/* src/mondata.h helpless() */
function helpless(mtmp) {
    return !!(mtmp.msleeping || !mtmp.mcanmove || (mtmp.mfrozen | 0) > 0);
}

// src/hack.c distu() — squared distance from the hero.
function distu(x, y) {
    const dx = x - game.u.ux, dy = y - game.u.uy;
    return dx * dx + dy * dy;
}

function same_level(a, b) {
    return !!a && !!b && a.dnum === b.dnum && a.dlevel === b.dlevel;
}

// src/dog.c:768 keep_mon_accessible(). The Wizard is globally reachable.
// A shopkeeper, priest, or guard only needs this treatment while away from
// the level recorded in its role-specific state.
function keep_mon_accessible(mtmp) {
    if (mtmp.iswiz)
        return true;
    const eshk = mtmp.eshk || mtmp.mextra?.eshk;
    const epri = mtmp.epri || mtmp.mextra?.epri;
    const egd = mtmp.egd || mtmp.mextra?.egd;
    return !!((mtmp.isshk && eshk?.shoplevel
               && !same_level(game.u.uz, eshk.shoplevel))
              || (mtmp.ispriest && epri?.shrlevel
                  && !same_level(game.u.uz, epri.shrlevel))
              || (mtmp.isgd && egd?.gdlevel
                  && !same_level(game.u.uz, egd.gdlevel)));
}

// migrate_to_level() for keep_mon_accessible's exact-position case. Its
// destination is the level being left, so no ledger conversion is needed.
function migrate_accessible_monster(mtmp) {
    const mx = mtmp.mx, my = mtmp.my;
    remove_monster(mx, my);
    const idx = game.level.monsters.indexOf(mtmp);
    if (idx >= 0)
        game.level.monsters.splice(idx, 1);

    mtmp.mstate = (mtmp.mstate || 0) | MON_MIGRATING;
    mtmp.mtrack ||= [];
    mtmp.mtrack[2] = { x: game.u.uz.dnum, y: game.u.uz.dlevel };
    mtmp.mtrack[1] = { x: mx, y: my };
    mtmp.mtrack[0] = { x: MIGR_EXACT_XY, y: 0 };
    mtmp.mux = game.u.uz.dnum;
    mtmp.muy = game.u.uz.dlevel;
    mtmp.mx = mtmp.my = 0;
    mtmp.mlstmv = game.moves;
    (game.migrating_mons ||= []).unshift(mtmp);
}

// src/dog.c:789 keepdogs() moves adjacent followers off the map and onto
// the mydogs list before the hero leaves the level.
export function keepdogs(pets_only) {
    const chain = [...(game.level?.monsters || [])];
    for (const mtmp of chain) {
        if (DEADMONSTER(mtmp))
            continue;
        if (pets_only && !mtmp.mtame)
            continue;
        if (((mdistu_dog(mtmp) <= 2 && levl_follower(mtmp))
             || (game.u.uhave?.amulet && mtmp.iswiz))
            && (!helpless(mtmp))
            && !(mtmp.mstrategy & 0x20000000 /* STRAT_WAITFORU */)) {
            if (mtmp.mtrapped)
                note_unported('keepdogs:mintrap');
            if (mtmp.meating || mtmp.mtrapped) {
                note_unported('keepdogs:stay_behind');
                continue;
            }
            /* mon_leave/relmon: off the map, onto mydogs. C PREPENDS
               (relmon: mtmp->nmon = gm.mydogs; gm.mydogs = mtmp) and
               losedogs pops the head, so arrivals run in REVERSE of the
               fmon scan order: the pet (newest, scanned first) lands
               last. Pushing here played them forwards. */
            remove_monster(mtmp.mx, mtmp.my);
            const idx = game.level.monsters.indexOf(mtmp);
            if (idx >= 0)
                game.level.monsters.splice(idx, 1);
            (game.mydogs ||= []).unshift(mtmp);
            mtmp.mx = mtmp.my = 0; /* mx==0 implies migrating */
            mtmp.mlstmv = game.moves;
        } else if (keep_mon_accessible(mtmp)) {
            migrate_accessible_monster(mtmp);
        }
    }
}

// src/dogmove.c / include mdistu — hero distance for the follower test.
function mdistu_dog(mtmp) {
    const dx = mtmp.mx - game.u.ux, dy = mtmp.my - game.u.uy;
    return dx * dx + dy * dy;
}

// src/mondata.c:1211 levl_follower()
function levl_follower(mtmp) {
    if (mtmp === game.u.usteed)
        return true;
    if (mtmp.iswiz)
        return true; /* (amulet check is inside the wiz arm in C) */
    /* is_fshk() means a shopkeeper who is actively following the customer,
       not every shopkeeper. Ordinary peaceful shopkeepers stay with their
       shop when the hero changes levels. */
    if (mtmp.mtame
        || (mtmp.isshk
            && !!(mtmp.eshk || mtmp.mextra?.eshk)?.following))
        return true;
    return (game.mons[mtmp.mnum].mflags2 & MFLAGS.M2_STALK) !== 0
        && (!mtmp.mflee || game.u.uhave?.amulet);
}

const Before_you = 0, With_you = 1, After_you = 2, Wiz_arrive = -1;
const MON_STILL_ARRIVING = 0x100;

// src/dog.c:304 losedogs(). Restore exact-position residents first, then
// companions, then independent migrants scheduled for this level.
export async function losedogs() {
    const migrating = game.migrating_mons || [];
    const failed = [];

    for (let i = 0; i < migrating.length; ) {
        const mtmp = migrating[i];
        const xyloc = mtmp.mtrack?.[0]?.x ?? MIGR_RANDOM;
        if (mtmp.mux === game.u.uz.dnum && mtmp.muy === game.u.uz.dlevel
            && xyloc === MIGR_EXACT_XY) {
            migrating.splice(i, 1);
            if (!(await mon_arrive(mtmp, Before_you)))
                failed.push(mtmp);
        } else {
            i++;
        }
    }

    while ((game.mydogs || []).length) {
        const mtmp = game.mydogs.shift();
        if (!(await mon_arrive(mtmp, With_you)))
            failed.push(mtmp);
    }

    for (let i = 0; i < migrating.length; ) {
        const mtmp = migrating[i];
        const xyloc = mtmp.mtrack?.[0]?.x ?? MIGR_RANDOM;
        if (mtmp.mux === game.u.uz.dnum && mtmp.muy === game.u.uz.dlevel
            && xyloc !== MIGR_EXACT_XY) {
            migrating.splice(i, 1);
            if (!(await mon_arrive(mtmp, After_you)))
                failed.push(mtmp);
        } else {
            i++;
        }
    }

    for (let i = failed.length - 1; i >= 0; i--)
        migrating.unshift(failed[i]);
}

// src/dog.c:420 mon_arrive(). This covers companions plus random,
// approximate, exact, and hero-relative independent arrivals.
export async function mon_arrive(mtmp, when) {
    (game.level.monsters ||= []).unshift(mtmp);
    mtmp.mstate = (mtmp.mstate || 0) | MON_STILL_ARRIVING;
    mtmp.mstrategy = (mtmp.mstrategy | 0) | 0x40000000; /* STRAT_ARRIVE */
    mtmp.mstate &= ~(MON_MIGRATING | MON_LIMBO);

    let xyloc = mtmp.mtrack?.[0]?.x ?? MIGR_RANDOM;
    const xyflags = mtmp.mtrack?.[0]?.y ?? 0;
    let xlocale = mtmp.mtrack?.[1]?.x ?? 0;
    let ylocale = mtmp.mtrack?.[1]?.y ?? 0;
    mtmp.mux = game.u.ux;
    mtmp.muy = game.u.uy;
    mon_track_clear_dog(mtmp);

    if (mtmp === game.u.usteed) {
        mtmp.mstate &= ~MON_STILL_ARRIVING;
        return true;
    }
    if (when === With_you) {
        if (!m_at(game.u.ux, game.u.uy)
            && !rn2(mtmp.mtame ? 10 : mtmp.mpeaceful ? 5 : 2)) {
            place_monster(mtmp, game.u.ux, game.u.uy);
            newsym(mtmp.mx, mtmp.my);
        } else {
            await mnexto(mtmp, RLOC_NOMSG);
        }
        mtmp.mstate &= ~MON_STILL_ARRIVING;
        return true;
    } else if (when === Wiz_arrive)
        xyloc = MIGR_WITH_HERO;

    let wander = 0;
    if ((mtmp.mlstmv ?? game.moves) < game.moves - 1) {
        const elapsed = game.moves - 1 - mtmp.mlstmv;
        await mon_catchup_elapsed_time(mtmp, elapsed);
        wander = Math.min(elapsed, 8);
    }

    switch (xyloc) {
    case MIGR_APPROX_XY:
    case MIGR_EXACT_XY:
        if (xyloc === MIGR_EXACT_XY)
            wander = 0;
        break;
    case MIGR_WITH_HERO:
        xlocale = game.u.ux;
        ylocale = game.u.uy;
        break;
    default:
        xlocale = ylocale = 0;
        break;
    }

    if ((mtmp.migflags || 0) & MIGR_LEFTOVERS)
        deliver_obj_to_mon(mtmp, 0, DF_ALL);

    if (xlocale && wander)
        note_unported('mon_arrive:wander_near_arrival');

    mtmp.mx = 0;
    mtmp.my = xyflags;
    const placed = xlocale
        ? !!(await mnearto(mtmp, xlocale, ylocale, false, RLOC_NOMSG))
        : await rloc(mtmp, RLOC_NOMSG);
    mtmp.mstate &= ~MON_STILL_ARRIVING;

    if (!placed) {
        const at = game.level.monsters.indexOf(mtmp);
        if (at >= 0)
            game.level.monsters.splice(at, 1);
        mtmp.mstate |= MON_MIGRATING;
    }
    return placed;
}

// src/monmove.c:88 mon_track_clear()
function mon_track_clear_dog(mtmp) {
    mtmp.mtrack = [];
}

// src/dog.c abuse_dog() — hitting your own pet reduces tameness.
export async function abuse_dog(mtmp) {
    if (!mtmp.mtame)
        return;

    if (game.u.uprops?.AGGRAVATE_MONSTER || game.u.uprops?.CONFLICT)
        mtmp.mtame = (mtmp.mtame / 2) | 0;
    else
        mtmp.mtame--;

    if (mtmp.mtame && !mtmp.isminion && mtmp.edog)
        mtmp.edog.abuse++;

    if (!mtmp.mtame && mtmp.mleashed)
        note_unported('abuse_dog:m_unleash');

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
                note_unported('abuse_dog:redraw_worm');
        }
    }
}

// src/dog.c:1292 wary_dog() -- revived pets can lose tameness based on how
// they died and how they were treated.  Revival calls this quietly.
export function wary_dog(mtmp, was_dead) {
    const edog = !mtmp.isminion ? mtmp.edog : null;

    finish_meating(mtmp);
    if (!mtmp.mtame)
        return;

    if (edog?.mhpmax_penalty) {
        mtmp.mhpmax += edog.mhpmax_penalty;
        mtmp.mhp += edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }

    if (edog && (edog.killed_by_u === 1 || edog.abuse > 2)) {
        mtmp.mpeaceful = mtmp.mtame = 0;
        if (edog.abuse >= 0 && edog.abuse < 10
            && !rn2(edog.abuse + 1))
            mtmp.mpeaceful = 1;
    } else {
        mtmp.mtame = rn2(mtmp.mtame + 1);
        if (!mtmp.mtame)
            mtmp.mpeaceful = rn2(2);
    }

    if (!mtmp.mtame) {
        if (!was_dead)
            note_unported('wary_dog:life_saved_feedback');
        newsym(mtmp.mx, mtmp.my);
    } else if (edog) {
        edog.revivals = (edog.revivals | 0) + 1;
        edog.killed_by_u = 0;
        edog.abuse = 0;
        edog.ogoal = { x: -1, y: -1 };
        if (was_dead || edog.hungrytime < game.moves + 500)
            edog.hungrytime = game.moves + 500;
        if (was_dead) {
            edog.droptime = 0;
            edog.dropdist = 10000;
            edog.whistletime = 0;
            edog.apport = 5;
        }
    }
}

// src/dog.c:627 mon_catchup_elapsed_time() — a monster restored after the
// hero was away for nmv moves catches up on timers, tameness and healing.
export async function mon_catchup_elapsed_time(mtmp, nmv) {
    const imv = Math.min(nmv, 2147483646);   /* LARGEST_INT paranoia */

    /* might stop being afraid, blind or frozen */
    /* set to 1 and allow final decrement in movemon() */
    if (mtmp.mblinded) {
        if (imv >= mtmp.mblinded) mtmp.mblinded = 1;
        else mtmp.mblinded -= imv;
    }
    if (mtmp.mfrozen) {
        if (imv >= mtmp.mfrozen) mtmp.mfrozen = 1;
        else mtmp.mfrozen -= imv;
    }
    if (mtmp.mfleetim) {
        if (imv >= mtmp.mfleetim) mtmp.mfleetim = 1;
        else mtmp.mfleetim -= imv;
    }

    /* might recover from temporary trouble */
    if (mtmp.mtrapped && rn2(imv + 1) > 40 / 2)
        mtmp.mtrapped = 0;
    if (mtmp.mconf && rn2(imv + 1) > 50 / 2)
        mtmp.mconf = 0;
    if (mtmp.mstun && rn2(imv + 1) > 10 / 2)
        mtmp.mstun = 0;

    /* might finish eating or be able to use special ability again */
    if (mtmp.meating) {
        if (imv > mtmp.meating) {
            const { finish_meating } = await import('./dogmove.js');
            finish_meating(mtmp);
        } else
            mtmp.meating -= imv;
    }
    if (imv > (mtmp.mspec_used | 0))
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
        && (carnivorous(game.mons[mtmp.mnum])
            || herbivorous(game.mons[mtmp.mnum]))) {
        const edog = mtmp.edog;
        if (edog
            && ((game.moves > edog.hungrytime + 500 && mtmp.mhp < 3)
                || (game.moves > edog.hungrytime + 750)))
            mtmp.mtame = mtmp.mpeaceful = 0;
    }

    /* leashed monsters travel with the hero, so never catch up */

    /* recover lost hit points */
    let heal = imv;
    if (!regenerates(game.mons[mtmp.mnum]))
        heal = Math.trunc(imv / 20);
    healmon(mtmp, heal, 0);

    mtmp.mlstmv = game.moves;               /* set_mon_lastmove() */
}

// src/dog.c:729 mon_leave(), what a monster does when it departs the level;
// returns the (possibly truncated) count of long worm tail segments.
export function mon_leave(mtmp) {
    let num_segs = 0; /* return value */

    /* set minvent's obj->no_charge to 0 */
    for (const obj of (mtmp.minvent || [])) {
        if (Has_contents(obj))
            picked_container(obj); /* does the right thing */
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
        /* put the worm's head back in the level's map; wormgone() removed
           it and relmon() expects it to still be there unless this
           is happening during a failed attempt to migrate to this level */
        if (mx)
            place_monster(mtmp, mx, my);
    }
    return num_segs;
}

// src/dog.c:887 migrate_to_level(), send a monster off to another level.
export async function migrate_to_level(mtmp, tolev, xyloc, cc) {
    const new_lev = { dnum: 0, dlevel: 0 };
    let xyflags;
    const mx = mtmp.mx, my = mtmp.my; /* <mx,my> needed below */
    let num_segs; /* count of worm segments */

    if (mtmp.mleashed) {
        mtmp.mtame--;
        await m_unleash(mtmp, true);
    }

    num_segs = mon_leave(mtmp);
    await relmon(mtmp, (game.migrating_mons ||= [])); /* mtmp->mx,my retain their value */
    mtmp.mstate = (mtmp.mstate || 0) | MON_MIGRATING;

    new_lev.dnum = ledger_to_dnum(tolev);
    new_lev.dlevel = ledger_to_dlev(tolev);
    /* overload mtmp->[mx,my], mtmp->[mux,muy], and mtmp->mtrack[] as */
    /* destination codes */
    xyflags = (depth(new_lev) < depth(game.u.uz)) ? 1 : 0; /* 1 => up */
    if (In_W_tower(mx, my, game.u.uz))
        xyflags |= 2;
    mtmp.wormno = num_segs;
    mtmp.mlstmv = game.moves;
    mtmp.mtrack ||= [];
    mtmp.mtrack[2] = { x: game.u.uz.dnum,   /* migrating from this dungeon */
                       y: game.u.uz.dlevel }; /* migrating from this dungeon level */
    mtmp.mtrack[1] = { x: cc ? cc.x : mx, y: cc ? cc.y : my };
    mtmp.mtrack[0] = { x: xyloc, y: xyflags };
    mtmp.mux = new_lev.dnum;
    mtmp.muy = new_lev.dlevel;
    mtmp.mx = mtmp.my = 0; /* mx==0 implies migrating */

    /* don't extinguish a mobile light; it still exists but has changed
       from local (monst->mx > 0) to global (mx==0, not on this level) */
    if (emits_light(mtmp.data))
        vision_recalc(0);
}
