// mon.js — Monster movement allotment and per-turn monster upkeep.
// C ref: mon.c
//
// Ported so far: mcalcmove(), mcalcdistress(), movemon(), mfndpos(),
// monnear(), mon_allowflags().

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import * as MM from './monsters.js';
import { SPECIAL_PM, NUMMONS } from './monsters.js';
import {
    MSLOW, MFAST, NORMAL_SPEED, LOW_PM, I_SPECIAL, CONFLICT, INVIS,
    DISPLACED, COLNO, ROWNO, IS_OBSTRUCTED, IS_TREE, IS_WATERWALL, IS_DOOR,
    IS_STWALL, IRONBARS, LAVAWALL, W_NONDIGGABLE, D_CLOSED, D_LOCKED,
    D_BROKEN, isok,
    ALLOW_U, ALLOW_M, ALLOW_TM, ALLOW_ALL, ALLOW_MDISP, ALLOW_TRAPS,
    ALLOW_SANCT, ALLOW_SSM, ALLOW_ROCK, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS,
    NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, NOGARLIC,
    M_AP_MONSTER, MON_DETACH, W_AMUL, NON_PM, NATTK, Is_rogue_level,
    G_GENOD, STRAT_WAITMASK, STRAT_WAITFORU, BOLT_LIM, W_ARM,
} from './const.js';
import { dist2 } from './hacklib.js';
import { vision_recalc, cansee } from './vision.js';
import { newsym, pline, glyph_is_invisible, unmap_object } from './display.js';
import { m_at, sobj_at, is_pool, is_lava, may_passwall, accessible,
         nonliving, is_golem, is_mplayer, closed_door, hideunder,
         In_endgame, is_placeholder, mbirth_limit, newmonhp,
         pm_to_cham } from './makemon.js';
import { is_male, is_female, is_neuter, pm_invisible } from './mondata.js';
import { set_mon_data } from './mondata.js';
import { Monnam, noit_mon_nam } from './do_name.js';
import { m_dowear, which_armor } from './worn.js';
import {
    MS_NEMESIS, AT_BOOM, G_FREQ, AD_RBRE, AD_DCAY, AD_DGST, AD_FIRE,
    PM_LIZARD, PM_VLAD_THE_IMPALER, PM_WEREJACKAL, PM_HUMAN_WEREJACKAL,
    PM_WEREWOLF, PM_HUMAN_WEREWOLF, PM_WERERAT, PM_HUMAN_WERERAT,
    PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_IRON_GOLEM, PM_WOOD_GOLEM,
    PM_LEATHER_GOLEM, PM_STEAM_VORTEX, S_KOP,
} from './monsters.js';
import { t_at, TRAPNUM, fixed_tele_trap, m_harmless_trap } from './trap.js';
import { hastrack } from './track.js';
import { mon_knows_traps } from './mondata.js';
import { monsndx, is_flyer, is_floater, is_swimmer, passes_walls,
         perceives, is_were, is_human, is_undead, is_vampshifter,
         dmgtype, is_elf, is_dwarf } from './mondata.js';
import {
    mons, S_EEL, S_UNICORN, S_GHOST, S_VORTEX, S_ZOMBIE, S_LICH,
    M1_NOHANDS, M1_TUNNEL, M1_NEEDPICK, M1_AMORPHOUS, M1_UNSOLID,
    M1_SLITHY, M1_HIDE, M1_METALLIVORE, M2_GIANT, M2_ROCKTHROW, M2_MINION,
    M2_JEWELS, M3_DISPLACES, MZ_SMALL, MZ_LARGE, MS_LEADER, AD_RUST, AD_CORR,
    PM_GRID_BUG, PM_DEATH, PM_FAMINE, PM_PESTILENCE, PM_MINOTAUR,
    PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_FLOATING_EYE, PM_PURPLE_WORM,
    PM_BABY_PURPLE_WORM, PM_SHRIEKER, PM_GHOUL, PM_SKELETON,
    PM_AIR_ELEMENTAL, M1_ANIMAL, M1_MINDLESS, S_MUMMY,
    PM_FLESH_GOLEM, G_UNIQ,
} from './monsters.js';
import { BOULDER, CLOVE_OF_GARLIC, CREDIT_CARD, SKELETON_KEY,
         LOCK_PICK, EGG, CORPSE, AMULET_OF_LIFE_SAVING, GRAY_DRAGON_SCALES,
         YELLOW_DRAGON_SCALES, GRAY_DRAGON_SCALE_MAIL,
         YELLOW_DRAGON_SCALE_MAIL, TIN, GLOB_OF_GREEN_SLIME, CARROT,
         objects } from './objects.js';
import { NO_NC_FLAGS, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES,
         POISON_RES, STONE_RES } from './const.js';
import { corpse_intrinsic, should_givit } from './eat.js';
import { delobj } from './invent.js';
import { grow_up } from './makemon.js';
import { dead_species } from './mkobj.js';
import { kill_egg } from './timeout.js';
import { relobj } from './steal.js';
import { dochugw, onscary, mon_regen, m_everyturn_effect,
         mon_track_clear } from './monmove.js';
import { canseemon, sensemon } from './display.js';
import { UNICORN_HORN, WORM_TOOTH } from './objects.js';
import { CORPSTAT_NONE, CORPSTAT_BURIED, CORPSTAT_INIT, CORPSTAT_FEMALE,
         CORPSTAT_MALE, TAINT_AGE, ONAME_NO_FLAGS, BLINDED } from './const.js';
import { mksobj_at, mkcorpstat, undead_to_corpse,
         clear_dknown } from './mkobj.js';
import { stackobj } from './invent.js';
import { oname } from './do_name.js';

/* monster inventory: makemon.js keeps mon->minvent as an array in pickup
   order; C prepends, so walk it newest first */
function minv(mon) { return (mon.minvent || []).slice().reverse(); }

// C ref: mon.c mcalcmove()
export function mcalcmove(mon,
                          m_moving) /* True: adjust for moving;
                                     * False: just adjust for speed */
{
    const u = game.u;
    let mmove = mon.data.mmove;
    let mmove_adj;

    /* Note: MSLOW's `+ 1' prevents slowed speed 1 getting reduced to 0;
     *       MFAST's `+ 2' prevents hasted speed 1 from becoming a no-op;
     *       both adjustments have negligible effect on higher speeds.
     */
    if (mon.mspeed === MSLOW) {
        /* slow-monster effects work better against faster monsters: they
           lose 1/3 of their speed below 12 but 2/3 of their speed above */
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST)
        mmove = Math.trunc((4 * mmove + 2) / 3);

    if (mon === u.usteed && u.ugallop && game.context.mv) {
        /* increase movement by a factor of 1.5; also increase variance of
           movement speed (if it's naturally 24, we don't want it to always
           become 36) */
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    }

    if (m_moving) {
        /* Randomly round the monster's speed to a multiple of NORMAL_SPEED.
           This makes it impossible for the player to predict when they'll
           get a free turn (thus preventing exploits like "melee kiting"),
           while retaining guarantees about shopkeepers not being outsped
           by a normal-speed player, normal-speed players being unable
           to open up a gap when fleeing a normal-speed monster, etc. */
        mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}

// ── C ref: mon.c mcalcdistress() / m_calcdistress() ──
export function mcalcdistress() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp)) continue; /* iter_mons() */
        m_calcdistress(mtmp);
    }
}

function m_calcdistress(mtmp) {
    /* must check non-moving monsters once/turn in case they managed
       to end up in water or lava; note: when not in liquid they regen,
       shape-shift, timeout temporary maladies just like other monsters */
    if (mtmp.data.mmove === 0) {
        if (game.vision_full_recalc)
            vision_recalc(0);
        if (minliquid(mtmp))
            return;
    }

    /* regenerate hit points */
    mon_regen(mtmp, false);

    /* possibly polymorph shapechangers and lycanthropes */
    if (mtmp.cham !== undefined && mtmp.cham >= LOW_PM) /* ismnum() */
        decide_to_shapeshift(mtmp);
    if (is_were(mtmp.data))
        throw new Error('m_calcdistress(): were_change() not ported yet');

    /* gradually time out temporary problems */
    if (mtmp.mblinded && !--mtmp.mblinded)
        mtmp.mcansee = 1;
    if (mtmp.mfrozen && !--mtmp.mfrozen)
        mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !--mtmp.mfleetim)
        mtmp.mflee = 0;

    /* FIXME: mtmp->mlstmv ought to be updated here */
}

/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER(mon) { return mon.mhp < 1; }

// C ref: mon.c mongone() -- the parts reached so far (level creation):
// unstuck(), mdrop_special_objs() and the vault guard case are not ported.
/* remove a monster from the game without leaving a corpse */
export function mongone(mdef) {
    mdef.mhp = 0; /* can skip some inventory bookkeeping */

    if (mdef.isgd)
        throw new Error('mongone: vault guards are not ported yet');
    /* release rest of monster's inventory--it is removed from game */
    /* discard_minvent(mdef, FALSE): obfree() each; nothing to free in JS */
    for (const o of mdef.minvent || [])
        o.where = 'OBJ_DELETED';
    mdef.minvent = null;
    m_detach(mdef, mdef.data, false);
}

// C ref: mon.c mon_leaving_level() -- the parts reached so far
function mon_leaving_level(mon) {
    const mx = mon.mx, my = mon.my;
    const lst = game.level.monsters || [];
    const i = lst.indexOf(mon);
    const onmap = (isok(mx, my) && i >= 0);

    /* to prevent an infinite relobj-flooreffects-hmon-killed loop */
    mon.mtrapped = 0;
    /* unstuck(mon) */
    if (game.u.ustuck === mon)
        throw new Error('mon_leaving_level(): unstuck() not ported yet');

    if (onmap) {
        if (mon.wormno)
            throw new Error('mon_leaving_level(): remove_worm() not ported yet');
        /* remove_monster(mx, my) */
        lst.splice(i, 1);
    }
    if (onmap) {
        mon.mundetected = 0; /* for migration; doesn't matter for death */
        if (mon.m_ap_type && mon.m_ap_type !== M_AP_MONSTER)
            throw new Error('mon_leaving_level(): seemimic() not ported yet');
        /* fill_pit(mx, my): boulders dropping into pits not ported */
        newsym(mx, my);
    }
}

// C ref: mon.c m_detach()
// The inventory drop for a death (steal.c relobj(), whose mdrop_obj() can
// give a message) is async: with due_to_death this returns a promise that
// mondead() awaits; mongone() (due_to_death FALSE, called from level
// creation) runs synchronously.
function m_detach(mtmp, mptr, due_to_death) {
    if (mtmp.mleashed)
        throw new Error('m_detach(): m_unleash() not ported yet');

    /* if (mx > 0 && emits_light(mptr)) del_light_source(): monster light
       sources are never created (makemon.js), so there is none to delete */
    void mptr;

    mon_leaving_level(mtmp);

    mtmp.mhp = 0; /* simplify some tests: force mhp to 0 */
    if (mtmp.iswiz)
        throw new Error('m_detach(): wizdeadorgone() not ported yet');

    const after_relobj = () => {
        if (game.stealmid && mtmp.m_id === game.stealmid)
            throw new Error('m_detach(): thiefdead() not ported yet');
        if (mtmp.isshk)
            throw new Error('m_detach(): shkgone() not ported yet');
        if (mtmp.wormno)
            throw new Error('m_detach(): wormgone() not ported yet');
        /* In_endgame(&u.uz): MON_ENDGAME_FREE -- the endgame isn't reached */

        mtmp.mstate = (mtmp.mstate || 0) | MON_DETACH;
        game.purge_monsters = (game.purge_monsters || 0) + 1;

        if (mtmp === game.u.usteed)
            throw new Error('m_detach(): dismount_steed() not ported yet');
    };

    if (due_to_death) {
        if (mtmp.data.msound === MS_NEMESIS)
            throw new Error('m_detach(): nemdead() not ported yet');
        if (mtmp.data.msound === MS_LEADER)
            throw new Error('m_detach(): leaddead() not ported yet');
        /* release (drop onto map) all objects carried by mtmp */
        return relobj(mtmp, 1, false) /* drop mtmp->minvent, issue newsym(mx,my) */
            .then(after_relobj);
    }
    after_relobj();
    return undefined;
}

// C ref: mon.c mlifesaver()
/* find the worn amulet of life saving which will save a monster */
function mlifesaver(mon) {
    if (!nonliving(mon.data) || is_vampshifter(mon)) {
        const otmp = which_armor(mon, W_AMUL);

        if (otmp && otmp.otyp === AMULET_OF_LIFE_SAVING)
            return otmp;
    }
    return null;
}

// C ref: mon.c lifesaved_monster()
function lifesaved_monster(mtmp) {
    const lifesave = mlifesaver(mtmp);

    if (lifesave)
        throw new Error('lifesaved_monster(): life saving not ported yet');
}

// C ref: mon.c mondead()
export async function mondead(mtmp) {
    /* potential pet message; always clear global flag */
    const be_sad = !!game.sad_feeling;
    game.sad_feeling = false;

    mtmp.mhp = 0; /* in case caller hasn't done this */
    lifesaved_monster(mtmp);
    if (!DEADMONSTER(mtmp))
        return;

    /* vampire in bat/fog/wolf form reverts to vampire instead of dying */
    if (is_vampshifter(mtmp))
        throw new Error('mondead(): vamprises() not ported yet');

    if (be_sad)
        await pline('You have a sad feeling for a moment, then it passes.');

    if (mtmp.data === mons[PM_STEAM_VORTEX])
        throw new Error('mondead(): create_gas_cloud() not ported yet');

    if (mtmp.isgd)
        throw new Error('mondead(): grddead() not ported yet');

    const mptr = mtmp.data; /* save this for m_detach() */
    /* restore chameleon, lycanthropes to true form at death */
    if (mtmp.cham >= LOW_PM) { /* ismnum(mtmp->cham) */
        set_mon_data(mtmp, mons[mtmp.cham]);
        mtmp.cham = NON_PM;
    } else if (mtmp.data === mons[PM_WEREJACKAL])
        set_mon_data(mtmp, mons[PM_HUMAN_WEREJACKAL]);
    else if (mtmp.data === mons[PM_WEREWOLF])
        set_mon_data(mtmp, mons[PM_HUMAN_WEREWOLF]);
    else if (mtmp.data === mons[PM_WERERAT])
        set_mon_data(mtmp, mons[PM_HUMAN_WERERAT]);

    const mndx = monsndx(mtmp.data);
    if (game.mvitals[mndx].died < 255)
        game.mvitals[mndx].died++;

    /* if it's a (possibly polymorphed) quest leader, mark him as dead */
    if (game.quest_status?.leader_m_id
        && mtmp.m_id === game.quest_status.leader_m_id)
        game.quest_status.leader_is_dead = true;
    /* MAIL_STRUCTURES: no mail daemon in this build */

    if (mtmp.data.mlet === S_KOP)
        throw new Error('mondead(): dead Kops returning not ported yet');

    /* logdeadmon(mtmp, mndx): achievements/livelog have no game effect here */

    if (glyph_is_invisible(game.level.at(mtmp.mx, mtmp.my).remembered_glyph))
        unmap_object(mtmp.mx, mtmp.my);

    /* remove 'mtmp' from play; it will stay on the fmon list until end of
       current move, then dmonsfree() will get rid of it */
    await m_detach(mtmp, mptr, true);
}

// C ref: mon.c corpse_chance()
/* TRUE if corpse might be dropped, magr may die if mon was swallowed */
export function corpse_chance(mon, magr, was_swallowed) {
    const mdat = mon.data;

    if (!magr && game.mswallower)
        throw new Error('corpse_chance(): engulfer explosions not ported yet');

    if (mdat === mons[PM_VLAD_THE_IMPALER] || mdat.mlet === S_LICH)
        throw new Error('corpse_chance(): body crumbles into dust not ported yet');

    /* Gas spores always explode upon death */
    for (let i = 0; i < NATTK; i++) {
        if (mdat.mattk[i].aatyp === AT_BOOM)
            throw new Error('corpse_chance(): mon_explodes() not ported yet');
    }
    void was_swallowed;

    /* must duplicate this below check in xkilled() since it results in
     * creating no objects as well as no corpse
     */
    /* LEVEL_SPECIFIC_NOCORPSE(mdat) */
    if (Is_rogue_level(game.u.uz)
        || !game.level.flags.deathdrops
        || (game.level.flags.graveyard && is_undead(mdat) && rn2(3)))
        return false;

    if (((bigmonst(mdat) || mdat === mons[PM_LIZARD]) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)
        return true;
    const tmp = 2 + ((mdat.geno & G_FREQ) < 2 ? 1 : 0) + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

/* C ref: mondata.h is_reviver(), unique_corpstat() */
function is_reviver(ptr) { return is_rider(ptr) || ptr.mlet === MM.S_TROLL; }
function unique_corpstat(ptr) { return (ptr.geno & G_UNIQ) !== 0; }

/* C ref: mon.c KEEPTRAITS() -- for deciding whether corpse will carry
   along full monster data */
function KEEPTRAITS(mon) {
    return (mon.isshk || mon.mtame || unique_corpstat(mon.data)
            || is_reviver(mon.data)
            /* normally quest leader will be unique, */
            /* but he or she might have been polymorphed  */
            || mon.m_id === game.quest_status?.leader_m_id
            /* special cancellation handling for these */
            || (dmgtype(mon.data, MM.AD_SEDU) || dmgtype(mon.data, MM.AD_SSEX)));
}

// C ref: mon.c make_corpse()
/* Creates a monster corpse, a "special" corpse, or nothing if it doesn't
 * leave corpses.  Monsters which leave "special" corpses should have
 * G_NOCORPSE set in order to prevent wishing for one, finding tins of one,
 * etc....
 */
function make_corpse(mtmp, corpseflags) {
    const mdat = mtmp.data;
    let num;
    let obj = null;
    const x = mtmp.mx, y = mtmp.my;
    const mndx = monsndx(mdat);
    let corpstatflags = corpseflags;
    const burythem = ((corpstatflags & CORPSTAT_BURIED) !== 0);
    let default_1 = false;

    if (mtmp.female)
        corpstatflags |= CORPSTAT_FEMALE;
    else if (!is_neuter(mtmp.data))
        corpstatflags |= CORPSTAT_MALE;

    switch (mndx) {
    case MM.PM_GRAY_DRAGON:
    case MM.PM_GOLD_DRAGON:
    case MM.PM_SILVER_DRAGON:
    case MM.PM_RED_DRAGON:
    case MM.PM_ORANGE_DRAGON:
    case MM.PM_WHITE_DRAGON:
    case MM.PM_BLACK_DRAGON:
    case MM.PM_BLUE_DRAGON:
    case MM.PM_GREEN_DRAGON:
    case MM.PM_YELLOW_DRAGON:
        /* Make dragon scales.  This assumes that the order of the
           dragons is the same as the order of the scales. */
        if (!rn2(mtmp.mrevived ? 20 : 3)) {
            num = GRAY_DRAGON_SCALES + monsndx(mdat) - MM.PM_GRAY_DRAGON;
            obj = mksobj_at(num, x, y, false, false);
            obj.spe = 0;
            obj.cursed = obj.blessed = 0;
        }
        default_1 = true;
        break;
    case MM.PM_WHITE_UNICORN:
    case MM.PM_GRAY_UNICORN:
    case MM.PM_BLACK_UNICORN:
        if (mtmp.mrevived && rn2(2)) {
            throw new Error('make_corpse(): regrown horn crumbling not ported yet');
        } else {
            obj = mksobj_at(UNICORN_HORN, x, y, true, false);
            if (obj && mtmp.mrevived)
                obj.degraded_horn = 1;
        }
        default_1 = true;
        break;
    case MM.PM_LONG_WORM:
        mksobj_at(WORM_TOOTH, x, y, true, false);
        default_1 = true;
        break;
    case MM.PM_VAMPIRE:
    case MM.PM_VAMPIRE_LEADER:
    case MM.PM_KOBOLD_MUMMY:
    case MM.PM_DWARF_MUMMY:
    case MM.PM_GNOME_MUMMY:
    case MM.PM_ORC_MUMMY:
    case MM.PM_ELF_MUMMY:
    case MM.PM_HUMAN_MUMMY:
    case MM.PM_GIANT_MUMMY:
    case MM.PM_ETTIN_MUMMY:
    case MM.PM_KOBOLD_ZOMBIE:
    case MM.PM_DWARF_ZOMBIE:
    case MM.PM_GNOME_ZOMBIE:
    case MM.PM_ORC_ZOMBIE:
    case MM.PM_ELF_ZOMBIE:
    case MM.PM_HUMAN_ZOMBIE:
    case MM.PM_GIANT_ZOMBIE:
    case MM.PM_ETTIN_ZOMBIE:
        /* (vampires: include mtmp in the mkcorpstat() call) */
        num = undead_to_corpse(mndx);
        corpstatflags |= CORPSTAT_INIT;
        obj = mkcorpstat(CORPSE, mtmp, mons[num], x, y, corpstatflags);
        obj.age -= (TAINT_AGE + 1); /* this is an *OLD* corpse */
        break;
    case MM.PM_IRON_GOLEM:
    case MM.PM_GLASS_GOLEM:
    case MM.PM_CLAY_GOLEM:
    case MM.PM_STONE_GOLEM:
    case MM.PM_WOOD_GOLEM:
    case MM.PM_ROPE_GOLEM:
    case MM.PM_LEATHER_GOLEM:
    case MM.PM_GOLD_GOLEM:
    case MM.PM_PAPER_GOLEM:
        throw new Error('make_corpse(): golem remains not ported yet');
    /* expired puddings will congeal into a large blob;
       like dragons, relies on the order remaining consistent */
    case MM.PM_GRAY_OOZE:
    case MM.PM_BROWN_PUDDING:
    case MM.PM_GREEN_SLIME:
    case MM.PM_BLACK_PUDDING:
        throw new Error('make_corpse(): pudding globs (obj_nexto()) not ported yet');
    case NON_PM: case MM.NUMMONS: /* never use as index */
        break;
    default:
        default_1 = true;
        break;
    }
    if (default_1) {
        if (game.mvitals[mndx].mvflags & MM.G_NOCORPSE) {
            return null;
        } else {
            corpstatflags |= CORPSTAT_INIT;
            /* preserve the unique traits of some creatures */
            obj = mkcorpstat(CORPSE, KEEPTRAITS(mtmp) ? mtmp : null,
                             mdat, x, y, corpstatflags);
            if (burythem)
                throw new Error('make_corpse(): bury_an_obj() not ported yet');
        }
    }
    /* All special cases should precede the G_NOCORPSE check */

    if (!obj)
        return null;

    /* if polymorph or undead turning has killed this monster,
       prevent the same attack beam from hitting its corpse */
    if (game.context?.bypasses)
        throw new Error('make_corpse(): bypass_obj() not ported yet');

    if (mtmp.mgivenname) /* has_mgivenname() */
        obj = oname(obj, mtmp.mgivenname, ONAME_NO_FLAGS);

    /*  Avoid "It was hidden under a green mold corpse!"
     *  during Blind combat. An unseen monster referred to as "it"
     *  could be killed and leave a corpse.  If a hider then hid
     *  underneath it, you could be told the corpse type of a
     *  monster that you never knew was there without this.
     *  The code in hitmu() substitutes the word "something"
     *  if the corpse's obj->dknown is 0.
     */
    if (mon_Blind() && !sensemon(mtmp))
        clear_dknown(obj); /* obj->dknown = 0; */

    stackobj(obj); /* 'obj' remains valid if stacking happens */
    newsym(x, y);
    /* in case the corpse was placed at a different spot from where
       the monster was (not expected to happen) */
    if (obj.ox !== x || obj.oy !== y)
        newsym(obj.ox, obj.oy);
    return obj;
}

/* C ref: you.h Blind -- only the BLINDED property is checked so far */
function mon_Blind() {
    const p = game.u.uprops?.[BLINDED];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: mon.c mondied()
/* drop (perhaps) a cadaver and remove monster */
export async function mondied(mdef) {
    await mondead(mdef);
    if (!DEADMONSTER(mdef))
        return; /* lifesaved */

    /* this assumes that the dead monster's map coordinates remain accurate */
    if (corpse_chance(mdef, null, false)
        && (accessible(mdef.mx, mdef.my) || is_pool(mdef.mx, mdef.my)))
        make_corpse(mdef, CORPSTAT_NONE);
}

// C ref: mon.c monkilled()
/* monster mdef was killed by something other than the hero */
export async function monkilled(mdef, fltxt, how) {
    const mptr = mdef.data;

    /* C tests the pointer: "" is non-null and still gives the message */
    if (fltxt != null && (mdef.wormno ? worm_known(mdef)
                              : cansee(mdef.mx, mdef.my)))
        await pline(`${Monnam(mdef)} is ${nonliving(mptr) ? 'destroyed' : 'killed'}`
                    + `${fltxt ? ' by the ' : ''}${fltxt}!`);
    else
        /* sad feeling is deferred until after potential life-saving */
        game.sad_feeling = mdef.mtame ? true : false;

    /* no corpse if digested or disintegrated or flammable golem burnt up */
    game.disintegested = (how === AD_DGST || how === -AD_RBRE
                          || (how === AD_FIRE && completelyburns(mptr)));
    if (game.disintegested)
        await mondead(mdef); /* never leaves a corpse */
    else
        await mondied(mdef); /* calls mondead() and maybe leaves a corpse */

    if (!DEADMONSTER(mdef))
        return; /* life-saved */
    /* extra message if pet golem is completely destroyed */
    if (mdef.mtame) {
        const rxt = (how === AD_FIRE && completelyburns(mptr)) ? 'roast'
                    : (how === AD_RUST && completelyrusts(mptr)) ? 'rust'
                      : (how === AD_DCAY && completelyrots(mptr)) ? 'rot'
                        : null;
        if (rxt)
            await pline(`May ${noit_mon_nam(mdef)} ${rxt} in peace.`);
    }
}
/* C ref: mondata.h completelyburns(), completelyrusts(), completelyrots() */
function completelyburns(ptr) {
    return ptr === mons[PM_PAPER_GOLEM] || ptr === mons[PM_STRAW_GOLEM];
}
function completelyrusts(ptr) { return ptr === mons[PM_IRON_GOLEM]; }
function completelyrots(ptr) {
    return ptr === mons[PM_WOOD_GOLEM] || ptr === mons[PM_LEATHER_GOLEM];
}
// C ref: worm.c worm_known()
function worm_known(worm) {
    void worm;
    throw new Error('worm_known() not ported yet');
}

// C ref: mon.c minliquid() -- monsters in pools or lava aren't ported yet
function minliquid(mtmp) {
    if (is_pool(mtmp.mx, mtmp.my) || is_lava(mtmp.mx, mtmp.my))
        throw new Error('minliquid() not ported yet');
    return 0;
}

function Conflict() {
    const p = game.u.uprops[CONFLICT];
    return !!(p.intrinsic || p.extrinsic);
}

// ── C ref: mon.c movemon_singlemon() ──
// perform movement for a single monster
async function movemon_singlemon(mtmp) {
    const u = game.u;
    /* end monster movement early if hero is flagged to leave the level */
    if (u.utotype) {
        game.somebody_can_move = false;
        return true;
    }

    /* one dead monster needs to perform a move after death: vault guard */
    if (mtmp.isgd && !mtmp.mx)
        throw new Error('movemon_singlemon(): gd_move() not ported yet');
    if (DEADMONSTER(mtmp))
        return false;

    /* monster isn't on this map anymore: migration isn't ported yet */

    m_everyturn_effect(mtmp);

    /* Find a monster that we have not treated yet. */
    if (mtmp.movement < NORMAL_SPEED)
        return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED)
        game.somebody_can_move = true;

    if (game.vision_full_recalc)
        vision_recalc(0); /* vision! */

    /* reset obj bypasses before next monster moves: clear_bypasses() and
       clear_splitobjs() -- object bypass bits aren't ported yet */
    if (minliquid(mtmp))
        return false;

    /* after losing equipment, try to put on replacement */
    if ((mtmp.misc_worn_check ?? 0) & I_SPECIAL) {
        /* hostiles only try to equip things if they think hero isn't
         * nearby; if they think hero is nearby, leave the flag intact so
         * that it can be checked again on subsequent moves until the hero
         * is perceived to be farther away. */
        if (mtmp.mpeaceful || mtmp.mtame
            || dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > (3 * 3)) {
            mtmp.misc_worn_check &= ~I_SPECIAL;
            const oldworn = mtmp.misc_worn_check;
            await m_dowear(mtmp, false);
            if (mtmp.misc_worn_check !== oldworn || !mtmp.mcanmove)
                return false; /* is spending this turn equipping */
        }
    }

    if ((mtmp.data.mflags1 & M1_HIDE) !== 0) { /* is_hider() */
        throw new Error('movemon_singlemon(): restrap() not ported yet');
    } else if (mtmp.data.mlet === S_EEL && !mtmp.mundetected) {
        throw new Error('movemon_singlemon(): eel hideunder() not ported yet');
    }

    /* continue if the monster died fighting */
    if (Conflict() && !mtmp.iswiz)
        throw new Error('movemon_singlemon(): fightm() not ported yet');
    await dochugw(mtmp, true); /* otherwise just move the monster */
    return false;
}

// ── C ref: mon.c movemon() ──
// perform movement for all monsters
export async function movemon() {
    game.somebody_can_move = false;

    /* iter_mons_safe(movemon_singlemon) */
    const all = [];
    for (let m = game.fmon; m; m = m.nmon) all.push(m);
    for (const m of all) {
        if (await movemon_singlemon(m))
            break;
    }

    /* if (any_light_source()) vision_full_recalc = 1: light sources
       aren't ported yet */
    /* clear_bypasses(), clear_splitobjs(): not ported yet */
    /* remove dead monsters */
    dmonsfree();

    /* a monster may have levteleported player -dlc */
    if (game.u.utotype)
        throw new Error('movemon(): deferred_goto() not ported yet');

    return game.somebody_can_move;
}

// ── C ref: mon.c dmonsfree() ──
// really free dead monsters
function dmonsfree() {
    let prev = null;
    for (let m = game.fmon; m; m = m.nmon) {
        if (DEADMONSTER(m) && !m.isgd) {
            if (prev) prev.nmon = m.nmon; else game.fmon = m.nmon;
        } else prev = m;
    }
}

/* mondata.h */
function polyok(ptr) { return (ptr.mflags2 & MM.M2_NOPOLY) === 0; }
function is_shapeshifter(ptr) { return (ptr.mflags2 & MM.M2_SHAPESHIFTER) !== 0; }
function notake(ptr) { return (ptr.mflags1 & MM.M1_NOTAKE) !== 0; }
function has_head(ptr) { return (ptr.mflags1 & MM.M1_NOHEAD) === 0; }
function is_vampire(ptr) { return ptr.mlet === MM.S_VAMPIRE; }
/* C ref: mondata.h ismnum() */
function ismnum(mndx) { return mndx >= LOW_PM && mndx < NUMMONS; }
function throws_rocks(ptr) { return (ptr.mflags2 & M2_ROCKTHROW) !== 0; }
/* C ref: ncflags for newcham() (monst.h) */
const NC_SHOW_MSG = 0x01;
const NC_VIA_WAND_OR_SPELL = 0x02;

// C ref: mon.c pickvampshape()
function pickvampshape(mon) {
    let mndx = mon.cham, wolfchance = 10;
    /* avoid picking monsters with lowercase display symbols ('d' for wolf
       and 'v' for fog cloud) on rogue level*/
    const uppercase_only = Is_rogue_level(game.u.uz);

    switch (mndx) {
    case MM.PM_VLAD_THE_IMPALER:
        /* ensure Vlad can keep carrying the Candelabrum */
        /* if (mon_has_special(mon)) break; */
        throw new Error('pickvampshape(): mon_has_special() not ported yet');
    case MM.PM_VAMPIRE_LEADER: /* vampire lord or Vlad can become wolf */
        if (!rn2(wolfchance) && !uppercase_only
            /* don't pick a walking form if that would lead to immediate
               drowning or immolation and reversion to vampire form */
            && !(is_pool(mon.mx, mon.my) || is_lava(mon.mx, mon.my))) {
            mndx = MM.PM_WOLF;
            break;
        }
        /*FALLTHRU*/
    case MM.PM_VAMPIRE: /* any vampire can become fog or bat */
        mndx = (!rn2(4) && !uppercase_only) ? MM.PM_FOG_CLOUD : MM.PM_VAMPIRE_BAT;
        break;
    }

    /* return to base form if chosen poly target has been genocided
       or randomly if already in an alternate form (to prevent always
       switching back and forth between bat and fog) */
    if ((game.mvitals[mndx].mvflags & G_GENOD) !== 0
        || (mon.data !== mons[mon.cham] && !rn2(4)))
        return mon.cham;

    return mndx;
}

// C ref: mon.c isspecmon()
/* nonshapechangers who warrant special polymorph handling */
function isspecmon(mon) {
    return !!(mon.isshk || mon.ispriest || mon.isgd
              || (game.quest_status?.leader_m_id
                  && mon.m_id === game.quest_status.leader_m_id));
}

// C ref: mon.c validspecmon()
/* restrict certain special monsters (shopkeepers, aligned priests,
   vault guards) to forms that allow them to behave sensibly (catching
   gold, speaking?) so that they don't need too much extra code */
function validspecmon(mon, mndx) {
    if (mndx === NON_PM)
        return true; /* caller wants random */

    if (!accept_newcham_form(mon, mndx))
        return false; /* geno'd or !polyok */

    if (isspecmon(mon)) {
        const ptr = mons[mndx];

        /* reject notake because object manipulation is expected
           and nohead because speech capability is expected */
        if (notake(ptr) || !has_head(ptr))
            return false;
        /* [should we check ptr->msound here too?] */
    }
    return true; /* potential new form is ok */
}

// C ref: mon.c select_newcham_form()
export function select_newcham_form(mon) {
    let mndx = NON_PM, tryct;

    switch (mon.cham) {
    case MM.PM_SANDESTIN:
        if (rn2(7))
            throw new Error('select_newcham_form(): pick_nasty() not ported yet');
        break;
    case MM.PM_DOPPELGANGER:
        throw new Error('select_newcham_form(): doppelganger forms not ported yet');
    case MM.PM_CHAMELEON:
        if (!rn2(3))
            throw new Error('select_newcham_form(): pick_animal() not ported yet');
        break;
    case MM.PM_VLAD_THE_IMPALER:
    case MM.PM_VAMPIRE_LEADER:
    case MM.PM_VAMPIRE:
        mndx = pickvampshape(mon);
        break;
    case NON_PM: /* ordinary */
      {
        const m_armr = which_armor(mon, W_ARM);

        if (m_armr && m_armr.otyp >= GRAY_DRAGON_SCALES
            && m_armr.otyp <= YELLOW_DRAGON_SCALES) /* Is_dragon_scales() */
            mndx = MM.PM_GRAY_DRAGON + m_armr.otyp - GRAY_DRAGON_SCALES;
        else if (m_armr && m_armr.otyp >= GRAY_DRAGON_SCALE_MAIL
                 && m_armr.otyp <= YELLOW_DRAGON_SCALE_MAIL) /* Is_dragon_mail() */
            mndx = MM.PM_GRAY_DRAGON + m_armr.otyp - GRAY_DRAGON_SCALE_MAIL;
      }
        break;
    }

    /* for debugging: allow control of polymorphed monster */
    if (game.flags.debug && game.iflags.mon_polycontrol)
        throw new Error('select_newcham_form(): wiz_force_cham_form() not ported yet');

    /* if no form was specified above, pick one at random now */
    if (mndx === NON_PM) {
        tryct = 50;
        do {
            mndx = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
            /* assert(ismnum(mndx); */
        } while (--tryct > 0 && !validspecmon(mon, mndx)
                 /* try harder to select uppercase monster on rogue level */
                 && (tryct > 40 && Is_rogue_level(game.u.uz)
                     && !isupper_monsym(mons[mndx])));
    }
    return mndx;
}
/* C ref: isupper(monsym(ptr)) -- monsym() is def_monsyms[mlet].sym */
function isupper_monsym(ptr) {
    /* defsym.h MONSYMS, indexed by mlet (S_ANT = 1) */
    const ch = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ '&;:~]"[ptr.mlet] ?? '';
    return ch >= 'A' && ch <= 'Z';
}

// C ref: mon.c accept_newcham_form()
/* this used to be inline within newcham() but monpolycontrol needs it too */
function accept_newcham_form(mon, mndx) {
    if (mndx === NON_PM)
        return null;
    const mdat = mons[mndx];
    if ((game.mvitals[mndx].mvflags & G_GENOD) !== 0)
        return null;
    if (is_placeholder(mdat))
        return null;
    /* select_newcham_form() might deliberately pick a player
       character type (random selection never does) which
       polyok() rejects, so we need a special case here */
    if (is_mplayer(mdat))
        return mdat;
    /* shapeshifters are rejected by polyok() but allow a shapeshifter
       to take on its 'natural' form */
    if (is_shapeshifter(mdat)
        && ismnum(mon.cham) && mdat === mons[mon.cham])
        return mdat;
    /* polyok() rules out M2_PNAME, M2_WERE, and all humans except Kops */
    return polyok(mdat) ? mdat : null;
}

// C ref: mon.c mgender_from_permonst()
/* shapechanger might take on a shape that forces gender change */
export function mgender_from_permonst(mtmp, mdat) {
    if (is_male(mdat)) {
        mtmp.female = false;
    } else if (is_female(mdat)) {
        mtmp.female = true;
    } else if (!is_neuter(mdat)) {
        /* usually leave as-is; same chance to change as polymorphing hero;
           vampires use controlled shapechange (from their perspective, even
           if it is random from the player's perspective) and don't undergo
           gender change */
        if (!rn2(10) && !(is_vampire(mdat) || is_vampshifter(mtmp)))
            mtmp.female = !mtmp.female;
    }
}

// C ref: mon.c decide_to_shapeshift()
export function decide_to_shapeshift(mon) {
    let ptr = null;
    let mndx;
    const was_female = mon.female;
    let dochng = false;

    if (!is_vampshifter(mon)) {
        /* regular shapeshifter; 'ptr' is Null */
        if (!mon.mspec_used && !rn2(6)) {
            dochng = true;
            mon.mspec_used = 3 + rn2(10);
        }
    } else if (!(mon.mstrategy & STRAT_WAITFORU)) {
        /* The vampire has to be in good health (mhp) to maintain
         * its shifted form.
         *
         * If we're shifted and getting low on hp, maybe shift back, or
         * if we're a fog cloud at full hp, maybe pick a different shape.
         * If we're not already shifted and in good health, maybe shift.
         */
        if (mon.data.mlet !== MM.S_VAMPIRE) {
            if ((mon.mhp <= Math.trunc((mon.mhpmax + 5) / 6)) && rn2(4)
                && ismnum(mon.cham)) {
                ptr = mons[mon.cham];
                dochng = true;
            } else if (mon.data === mons[MM.PM_FOG_CLOUD]
                       && mon.mhp === mon.mhpmax && !rn2(4)
                       && (!canseemon(mon)
                           || dist2(mon.mx, mon.my, game.u.ux, game.u.uy)
                              > BOLT_LIM * BOLT_LIM)) {
                /* if a fog cloud, maybe change to wolf or vampire bat;
                   those are more likely to take damage--at least when
                   tame--and then switch back to vampire; they'll also
                   switch to fog cloud if they encounter a closed door */
                mndx = pickvampshape(mon);
                if (ismnum(mndx)) {
                    ptr = mons[mndx];
                    dochng = (ptr !== mon.data);
                }
            }
            if (dochng && (mon.data.mflags1 & MM.M1_AMORPHOUS) /* amorphous */
                && closed_door(mon.mx, mon.my))
                throw new Error('decide_to_shapeshift(): enexto()/rloc_to() not ported yet');
        } else {
            if (mon.mhp >= Math.trunc(9 * mon.mhpmax / 10) && !rn2(6)
                && (!canseemon(mon)
                    || dist2(mon.mx, mon.my, game.u.ux, game.u.uy)
                       > BOLT_LIM * BOLT_LIM))
                dochng = true; /* 'ptr' stays Null */
        }
    }
    if (dochng) {
        if (newcham(mon, ptr, NC_SHOW_MSG)) {
            /* for vampshift, override the 10% chance for sex change
               (by forcing original gender in case that occurred) */
            if (is_vampshifter(mon)) {
                ptr = mon.data;
                if (!is_male(ptr) && !is_female(ptr) && !is_neuter(ptr))
                    mon.female = was_female;
            }
        }
    }
}

// C ref: mon.c newcham()
/* make a chameleon take on another shape, or a polymorph target
   (possibly self-inflicted) become a different monster;
   returns 1 if it actually changes form */
export function newcham(mtmp, mdat, ncflags) {
    const polyspot = ((ncflags & NC_VIA_WAND_OR_SPELL) !== 0);
    /* "The oldmon turns into a newmon!" */
    const msg = ((ncflags & NC_SHOW_MSG) !== 0);
    let hpn, hpd, mndx, tryct;
    const olddata = mtmp.data;

    /* seenorsensed = canspotmon(mtmp), oldname and l_oldname are only
       used by the messages below, which aren't ported yet */
    if (msg)
        throw new Error('newcham(): NC_SHOW_MSG messages not ported yet');

    /* Riders are immune to polymorph and green slime
       (but apparent Rider might actually be a doppelganger) */
    if (mtmp.cham === NON_PM) { /* not a shapechanger */
        if (is_rider(olddata))
            return 0;
        /* make Nazgul and erinyes immune too, to reduce chance of
           anomalous extinction feedback during final disclosure */
        if (mbirth_limit(monsndx(olddata)) < 120 /* MAXMONNO */)
            return 0;
        /* cancelled shapechangers become uncancelled prior
           to being given a new shape */
        if (mtmp.mcan /* && !Protection_from_shape_changers */) {
            mtmp.cham = pm_to_cham(monsndx(mtmp.data));
            if (mtmp.cham !== NON_PM)
                mtmp.mcan = 0;
        }
    }

    /* mdat = 0 -> caller wants a random monster shape */
    if (!mdat) {
        /* select_newcham_form() loops when resorting to random but
           it doesn't always pick that so we still retry here too */
        tryct = 20;
        do {
            mndx = select_newcham_form(mtmp);
            mdat = accept_newcham_form(mtmp, mndx);
            /* for the first several tries we require upper-case on
               the rogue level (after that, we take whatever we get) */
            if (tryct > 15 && Is_rogue_level(game.u.uz)
                && mdat && !isupper_monsym(mdat))
                mdat = null;
            if (mdat)
                break;
        } while (--tryct > 0);
        if (!tryct)
            return 0;
    } else if (game.mvitals[monsndx(mdat)].mvflags & G_GENOD)
        return 0; /* passed in mdat is genocided */

    if (mdat === olddata)
        return 0; /* still the same monster */

    mgender_from_permonst(mtmp, mdat);
    /* Endgame mplayers start out as "Foo the Bar", but some of the
     * titles are inappropriate when polymorphed, particularly into
     * the opposite sex.  Player characters don't use ranks when
     * polymorphed, so dropping rank for mplayers seems reasonable.
     */
    if (In_endgame(game.u.uz) && is_mplayer(olddata) && mtmp.mgivenname)
        throw new Error('newcham(): endgame mplayer names not ported yet');

    if (mtmp.wormno) /* throw tail away */
        throw new Error('newcham(): wormgone() not ported yet');
    if ((mtmp.m_ap_type || 0) && mdat.mlet !== MM.S_MIMIC)
        throw new Error('newcham(): seemimic() not ported yet');

    /* (this code used to try to adjust the monster's health based on
       a normal one of its type but there are too many special cases
       which need to be handled in order to do that correctly, so just
       give the new form the same proportion of HP as its old one had) */
    hpn = mtmp.mhp;
    hpd = mtmp.mhpmax;
    /* set level and hit points */
    newmonhp(mtmp, monsndx(mdat));
    /* new hp: same fraction of max as before */
    mtmp.mhp = Math.trunc((hpn * mtmp.mhp) / hpd);
    /* sanity check (potential overflow) */
    if (mtmp.mhp < 0 || mtmp.mhp > mtmp.mhpmax)
        mtmp.mhp = mtmp.mhpmax;
    /* unlikely but not impossible; a 1HD creature with 1HP that changes
       into a 0HD creature will require this statement */
    if (!mtmp.mhp)
        mtmp.mhp = 1;

    /* take on the new form... */
    set_mon_data(mtmp, mdat);

    if (mtmp.mleashed)
        throw new Error('newcham(): leashed monsters not ported yet');

    /* emits_light(olddata) != emits_light(mtmp->data): light sources
       aren't ported yet */
    if (!mtmp.perminvis || pm_invisible(olddata))
        mtmp.perminvis = pm_invisible(mdat);
    mtmp.minvis = mtmp.invis_blkd ? 0 : mtmp.perminvis;
    if (mtmp.mundetected)
        hideunder(mtmp);
    if (game.u.ustuck === mtmp)
        throw new Error('newcham(): engulfing/sticky hero not ported yet');

    if (mdat === mons[MM.PM_LONG_WORM])
        throw new Error('newcham(): get_wormno()/initworm() not ported yet');

    mtmp.meverseen = 0; /* never seen mon in present shape; newsym() ->
                         * display_monster() may change it right back */
    newsym(mtmp.mx, mtmp.my);

    /* when polymorph trap/wand/potion produces a vampire, turn in into
       a full-fledged vampshifter unless shape-changing is blocked */
    if (mtmp.cham === NON_PM && mdat.mlet === MM.S_VAMPIRE
        /* && !Protection_from_shape_changers */)
        mtmp.cham = pm_to_cham(monsndx(mdat));

    /* possibly_unwield(mtmp, polyspot), mon_break_armor(mtmp, polyspot),
       mselftouch(): only matter for a monster with a wielded weapon or
       worn armor */
    if (mtmp.mw || ((mtmp.misc_worn_check || 0) & ~I_SPECIAL))
        throw new Error('newcham(): possibly_unwield()/mon_break_armor() not ported yet');
    check_gear_next_turn(mtmp);

    /* former giants can't continue carrying boulders */
    if (mtmp.minvent?.length && !throws_rocks(mdat))
        throw new Error('newcham(): dropping boulders not ported yet');
    if (mtmp === game.u.usteed)
        throw new Error('newcham(): poly_steed() not ported yet');

    /* old form might not have been affected by Elbereth but perhaps the
       new form is */
    if (game.context?.mon_moving)
        throw new Error('newcham(): set_apparxy()/monflee() for a moving monster not ported yet');

    return 1;
}
// C ref: mon.c check_gear_next_turn()
/* setting misc_worn_check's I_SPECIAL bit flags a monster to reassess
   and potentially re-equip gear at the start of its next move */
export function check_gear_next_turn(mon) {
    mon.misc_worn_check = (mon.misc_worn_check || 0) | I_SPECIAL;
}

// C ref: mon.c wake_msg()
async function wake_msg(mtmp, interesting) {
    if (mtmp.msleeping && canseemon(mtmp)) {
        await pline(`${Monnam(mtmp)} wakes up${interesting ? "!" : "."}${
            mtmp.data === mons[PM_FLESH_GOLEM] ? " It's alive!" : ""}`);
    }
}

// C ref: mon.c wake_nearto_core()
/* Wake up monsters near some particular location. */
async function wake_nearto_core(x, y, distance, petcall) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (distance === 0 || dist2(mtmp.mx, mtmp.my, x, y) < distance) {
            /* sleep for N turns uses mtmp->mfrozen, but so does paralysis
               so we leave mfrozen monsters alone */
            await wake_msg(mtmp, false);
            mtmp.msleeping = 0; /* wake indeterminate sleep */
            if (!(mtmp.data.geno & G_UNIQ))
                mtmp.mstrategy &= ~STRAT_WAITMASK; /* wake 'meditation' */
            if (game.context.mon_moving || !petcall)
                continue;
            if (mtmp.mtame) {
                if (!mtmp.isminion)
                    mtmp.edog.whistletime = game.moves;
                /* Fix up a pet who is stuck "fleeing" its master */
                mon_track_clear(mtmp);
            }
        }
    }
    disturb_buried_zombies(x, y);
}

// C ref: mon.c wake_nearto()
export async function wake_nearto(x, y, distance) {
    await wake_nearto_core(x, y, distance, false);
}

// C ref: mon.c wake_nearby()
/* Wake up nearby monsters without angering them. */
export async function wake_nearby(petcall) {
    await wake_nearto_core(game.u.ux, game.u.uy, game.u.ulevel * 20, petcall);
}

// C ref: hack.c disturb_buried_zombies()
function disturb_buried_zombies(x, y) {
    for (const otmp of game.level.buriedobjlist || []) {
        if (otmp.otyp === CORPSE && otmp.timed
            && otmp.ox >= x - 1 && otmp.ox <= x + 1
            && otmp.oy >= y - 1 && otmp.oy <= y + 1)
            throw new Error('disturb_buried_zombies(): ZOMBIFY_MON timers not ported yet');
    }
}

// ── C ref: mon.c monnear() ──
// Is the square close enough for the monster to move or attack into?
export function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);

    if (distance === 2 && NODIAG(monsndx(mon.data)))
        return false;
    return (distance < 3);
}
/* C ref: mondata.h NODIAG() */
function NODIAG(monnum) { return monnum === PM_GRID_BUG; }

/* mondata.h */
function verysmall(ptr) { return ptr.msize < MZ_SMALL; }

function bigmonst(ptr) { return ptr.msize >= MZ_LARGE; }
function slithy(ptr) { return (ptr.mflags1 & M1_SLITHY) !== 0; }
function amorphous(ptr) { return (ptr.mflags1 & M1_AMORPHOUS) !== 0; }
function tunnels(ptr) { return (ptr.mflags1 & M1_TUNNEL) !== 0; }
function needspick(ptr) { return (ptr.mflags1 & M1_NEEDPICK) !== 0; }
function is_whirly(ptr) {
    return ptr.mlet === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
}
function is_rider(ptr) {
    const n = monsndx(ptr);
    return n === PM_DEATH || n === PM_FAMINE || n === PM_PESTILENCE;
}

/* C ref: monmove.c m_can_break_boulder() */
function m_can_break_boulder(mtmp) {
    return (is_rider(mtmp.data)
            || (!mtmp.mspec_used
                && (mtmp.isshk || mtmp.ispriest
                    || (mtmp.data.msound === MS_LEADER))));
}
/* C ref: mthrowu.c m_carrying() */
function m_carrying(mtmp, type) {
    for (const otmp of minv(mtmp))
        if (otmp.otyp === type) return otmp;
    return null;
}
/* C ref: monmove.c monhaskey() */
function monhaskey(mon, for_unlocking) {
    if (for_unlocking && m_carrying(mon, CREDIT_CARD))
        return true;
    return !!(m_carrying(mon, SKELETON_KEY) || m_carrying(mon, LOCK_PICK));
}
/* C ref: mondata.c passes_bars() */
function passes_bars(mptr) {
    return (passes_walls(mptr) || amorphous(mptr)
            || (mptr.mflags1 & M1_UNSOLID) !== 0
            || is_whirly(mptr) || verysmall(mptr)
            /* rust monsters and some puddings can destroy bars */
            || dmgtype(mptr, AD_RUST) || dmgtype(mptr, AD_CORR)
            /* rock moles can eat bars */
            || (mptr.mflags1 & M1_METALLIVORE) !== 0
            || (slithy(mptr) && !bigmonst(mptr)));
}

// ── C ref: mon.c mon_allowflags() ──
// return flags based on monster data, for mfndpos()
export function mon_allowflags(mtmp) {
    const u = game.u;
    const ptr = mtmp.data;
    let allowflags = 0;
    const can_open = !((ptr.mflags1 & M1_NOHANDS) !== 0 || verysmall(ptr));
    const can_unlock = ((can_open && monhaskey(mtmp, true))
                        || mtmp.iswiz || is_rider(ptr));
    const doorbuster = (ptr.mflags2 & M2_GIANT) !== 0;
    /* don't tunnel if on rogue level or if hostile and close enough
       to prefer a weapon; same criteria as in m_move() */
    let can_tunnel = tunnels(ptr); /* && !Is_rogue_level(&u.uz) */

    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || Conflict())
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    if (mtmp.mtame)
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    else if (mtmp.mpeaceful)
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else
        allowflags |= ALLOW_U;
    if (Conflict())
        throw new Error('mon_allowflags(): resist_conflict() not ported yet');
    if (mtmp.isshk)
        allowflags |= ALLOW_SSM;
    if (mtmp.ispriest)
        allowflags |= ALLOW_SSM | ALLOW_SANCT;
    if (passes_walls(ptr))
        allowflags |= (ALLOW_ROCK | ALLOW_WALL);
    if ((ptr.mflags2 & M2_ROCKTHROW) || m_can_break_boulder(mtmp))
        allowflags |= ALLOW_ROCK;
    if (can_tunnel)
        allowflags |= ALLOW_DIG;
    if (doorbuster)
        allowflags |= BUSTDOOR;
    if (can_open)
        allowflags |= OPENDOOR;
    if (can_unlock)
        allowflags |= UNLOCKDOOR;
    if (passes_bars(ptr)
        /* restrict engulfer or holder who might try to pass iron bars while
           carrying hero; accept small subset for poly'd hero passes_bars() */
        && (mtmp !== u.ustuck))
        allowflags |= ALLOW_BARS;
    if ((ptr.mflags2 & M2_MINION) || is_rider(ptr))
        allowflags |= ALLOW_SANCT;
    /* unicorn may not be able to avoid hero on a noteleport level */
    if (ptr.mlet === S_UNICORN && (ptr.mflags2 & M2_JEWELS) /* is_unicorn */
        && !game.level.flags?.noteleport)
        allowflags |= NOTONL;
    if (is_human(ptr) || ptr === mons[PM_MINOTAUR])
        allowflags |= ALLOW_SSM;
    if ((is_undead(ptr) && ptr.mlet !== S_GHOST) || is_vampshifter(mtmp))
        allowflags |= NOGARLIC;

    return allowflags;
}

/* C ref: obj.h OBJ_AT() -- floor objects live in game.level.objects */
function OBJ_AT(x, y) {
    for (const o of game.level.objects || [])
        if (o.ox === x && o.oy === y) return true;
    return false;
}

/* C ref: hacklib.c online2() */
function online2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    /*  If either delta is zero then they're on an orthogonal line,
     *  else if the deltas are equal (signs ignored) they're on a diagonal.
     */
    return (!dy || !dx || dy === dx || dy === -dx);
}
/* C ref: mon.c monlineu() */
function monlineu(mon, nx, ny) {
    return online2(nx, ny, mon.mux, mon.muy);
}

/* C ref: hack.c may_dig() */
function may_dig(x, y) {
    const lev = game.level.at(x, y);
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && ((lev.wall_info ?? 0) & W_NONDIGGABLE));
}
/* C ref: hack.c bad_rock() */
export function bad_rock(mdat, x, y) {
    return (/* (Sokoban && sobj_at(BOULDER, x, y)) || */
            (IS_OBSTRUCTED(game.level.at(x, y).typ)
             && (!tunnels(mdat) || needspick(mdat) || !may_dig(x, y))
             && !(passes_walls(mdat) && may_passwall(x, y))));
}
/* C ref: hack.c cant_squeeze_thru() */
function cant_squeeze_thru(mon) {
    const ptr = mon.data;

    if (passes_walls(ptr))
        return 0;

    /* too big? */
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || ptr.mlet === S_GHOST
             || slithy(ptr) /* || can_fog(mon) */))
        return 1;

    /* lugging too much junk? curr_mon_load() */
    if (minv(mon).length)
        throw new Error('cant_squeeze_thru(): curr_mon_load() not ported yet');

    /* can squeeze through */
    return 0;
}

/* C ref: mon.c zombie_maker() */
export function zombie_maker(mon) {
    const pm = mon.data;
    if (mon.mcan) return false;
    switch (pm.mlet) {
    case S_ZOMBIE:
        /* Z-class monsters that aren't actually zombies go here */
        if (pm === mons[PM_GHOUL] || pm === mons[PM_SKELETON])
            return false;
        return true;
    case S_LICH:
        /* all liches will create zombies as well */
        return true;
    }
    return false;
}
// C ref: mon.c zombie_form()
/* Return monster index of zombie monster which this monster could
   be turned into, or NON_PM if it doesn't have a direct counterpart.
   Sort of the zombie-specific inverse of undead_to_corpse. */
export function zombie_form(pm) {
    switch (pm.mlet) {
    case S_ZOMBIE: /* when already a zombie/ghoul/skeleton, will stay as is */
        return NON_PM;
    case MM.S_KOBOLD:
        return MM.PM_KOBOLD_ZOMBIE;
    case MM.S_ORC:
        return MM.PM_ORC_ZOMBIE;
    case MM.S_GIANT:
        if (pm === mons[MM.PM_ETTIN])
            return MM.PM_ETTIN_ZOMBIE;
        return MM.PM_GIANT_ZOMBIE;
    case MM.S_HUMAN:
    case S_KOP:
        if (is_elf(pm))
            return MM.PM_ELF_ZOMBIE;
        return MM.PM_HUMAN_ZOMBIE;
    case MM.S_HUMANOID:
        if (is_dwarf(pm))
            return MM.PM_DWARF_ZOMBIE;
        else
            break;
    case MM.S_GNOME:
        return MM.PM_GNOME_ZOMBIE;
    }
    return NON_PM;
}
// C ref: dungeon.h Is_stronghold() -- Lcheck(x, &stronghold_level)
function Is_stronghold(lev) {
    const z = game.dungeon_topology.d_stronghold_level;
    return !!(z && (z.dlevel || z.dnum)
              && lev.dnum === z.dnum && lev.dlevel === z.dlevel);
}
/* C ref: mon.c mm_2way_aggression() */
function mm_2way_aggression(magr, mdef) {
    /* On_W_tower_level(): the Wizard's tower isn't generated by this
       port yet, so the tower check never applies */
    /* liches/zombies vs things that can be zombified

       Note: avoid this on the Castle level, partly for balance reasons
       (the monster-versus-monster fights clear out significant portions of
       the Castle and make it easier than it should be), partly for flavor
       reasons (monsters who attacked other monsters to zombify them would
       have been counterattacked to death long before the hero arrived).

       Also don't include unique monsters in this, otherwise it leads to
       them waking up early (e.g. because a zombie decided to attack the
       Wizard of Yendor). */
    if (zombie_maker(magr) && zombie_form(mdef.data) !== NON_PM) {
        if (magr.mgenmklev && mdef.mgenmklev)
            return 0;
        if (!Is_stronghold(game.u.uz)
            && !((magr.data.geno & G_UNIQ) !== 0)
            && !((mdef.data.geno & G_UNIQ) !== 0))
            return (ALLOW_M | ALLOW_TM);
    }
    return 0;
}
/* C ref: mon.c mm_aggression() */
function mm_aggression(magr, mdef) {
    const mndx = monsndx(magr.data);

    /* don't allow pets to fight each other */
    if (magr.mtame && mdef.mtame)
        return 0;

    /* supposedly purple worms are attracted to shrieking because they
       like to eat shriekers, so attack the latter when feasible */
    if ((mndx === PM_PURPLE_WORM || mndx === PM_BABY_PURPLE_WORM)
        && mdef.data === mons[PM_SHRIEKER])
        return ALLOW_M | ALLOW_TM;
    return (mm_2way_aggression(magr, mdef) | mm_2way_aggression(mdef, magr));
}
/* C ref: mon.c mm_displacement() */
function mm_displacement(magr, mdef) {
    const pa = magr.data, pd = mdef.data;
    const is_displacer = p => (p.mflags3 & M3_DISPLACES) !== 0;

    if (is_displacer(pa) && (!is_displacer(pd) || magr.m_lev > mdef.m_lev)
        /* no displacing grid bugs diagonally */
        && !(magr.mx !== mdef.mx && magr.my !== mdef.my
             && NODIAG(monsndx(pd)))
        /* no displacing trapped monsters or multi-location longworms
           (long worms aren't ported yet) */
        && !mdef.mtrapped && !mdef.wormno
        /* riders can move anything; others, same size or smaller only */
        && (is_rider(pa) || pa.msize >= pd.msize))
        return ALLOW_MDISP;
    return 0;
}

// ── C ref: mon.c mfndpos() ──
// return number of acceptable neighbour positions
export function mfndpos(mon, data, flag) {
    const u = game.u;
    const lev = game.level;
    const mdat = mon.data;
    let cnt = 0;
    const rockok = false, treeok = false;

    const x = mon.mx;
    const y = mon.my;
    const nowtyp = lev.at(x, y).typ;

    data.cnt = 0; data.poss = []; data.info = [];

    const nodiag = NODIAG(monsndx(mdat));
    let wantpool = (mdat.mlet === S_EEL);
    /* m_in_air(): clinging hiders aren't ported yet */
    const in_air = is_flyer(mdat) || is_floater(mdat);
    const poolok = ((/* !Is_waterlevel(&u.uz) && */ in_air)
                    || (is_swimmer(mdat) && !wantpool));
    let lavaok = (in_air || mdat === mons[PM_FIRE_ELEMENTAL]
                  || mdat === mons[PM_SALAMANDER]); /* likes_lava() */
    if (mdat === mons[PM_FLOATING_EYE]) /* prefers to avoid heat */
        lavaok = false;
    const thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);
    /* poison gas regions: visible_region_at() is not ported yet; the
       only regions so far are harmless clouds (S_cloud), which mfndpos()
       does not avoid */

    if (flag & ALLOW_DIG)
        throw new Error('mfndpos(): ALLOW_DIG not ported yet');

    for (;;) { /* nexttry: eels prefer the water, but if there is no water
                  nearby, they will crawl over land */
        if (mon.mconf) {
            flag |= ALLOW_ALL;
            flag &= ~NOTONL;
        }
        if (!mon.mcansee)
            flag |= ALLOW_SSM;
        const maxx = Math.min(x + 1, COLNO - 1);
        const maxy = Math.min(y + 1, ROWNO - 1);
        for (let nx = Math.max(1, x - 1); nx <= maxx; nx++)
            for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
                if (nx === x && ny === y)
                    continue;
                const nloc = lev.at(nx, ny);
                const ntyp = nloc.typ;
                if (IS_OBSTRUCTED(ntyp)
                    && !((flag & ALLOW_WALL) && may_passwall(nx, ny))
                    && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny)))
                    continue;
                /* intelligent peacefuls avoid digging shop/temple walls:
                   only reachable with rockok (ALLOW_DIG, above) */
                if (IS_WATERWALL(ntyp) && !is_swimmer(mdat))
                    continue;
                /* KMH -- Added iron bars */
                if (ntyp === IRONBARS
                    && (!(flag & ALLOW_BARS)
                        || (((nloc.wall_info ?? 0) & W_NONDIGGABLE)
                            && (dmgtype(mdat, AD_RUST)
                                || dmgtype(mdat, AD_CORR)))))
                    continue;
                if (IS_DOOR(ntyp)
                    /* an amorphous creature can only move under/through a
                       closed door if it doesn't currently have hero
                       engulfed (can_fog(): vampshifters aren't ported) */
                    && !(amorphous(mdat) && !(u.uswallow && u.ustuck === mon))
                    && ((((nloc.doormask ?? 0) & D_CLOSED) && !(flag & OPENDOOR))
                        || (((nloc.doormask ?? 0) & D_LOCKED)
                            && !(flag & UNLOCKDOOR))) && !thrudoor)
                    continue;
                /* first diagonal checks (tight squeezes handled below) */
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && ((lev.at(x, y).doormask ?? 0) & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && ((nloc.doormask ?? 0) & ~D_BROKEN))
                        /* Is_rogue_level() and long worm segment crossing:
                           not ported yet */
                        ))
                    continue;
                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL)
                    continue;
                if ((poolok || is_pool(nx, ny) === wantpool)
                    && (lavaok || !is_lava(nx, ny))) {
                    let dispx, dispy;
                    const Invis = (u.uprops[INVIS].intrinsic
                                   || u.uprops[INVIS].extrinsic)
                                  && !u.uprops[INVIS].blocked;
                    const Displaced = (u.uprops[DISPLACED].intrinsic
                                       || u.uprops[DISPLACED].extrinsic)
                                      && !u.uprops[DISPLACED].blocked;
                    const monseeu = (mon.mcansee
                                     && (!Invis || perceives(mdat)));
                    const checkobj = OBJ_AT(nx, ny);

                    /* Displacement also displaces the Elbereth/scare monster,
                     * as long as you are visible.
                     */
                    if (Displaced && monseeu
                        && mon.mux === nx && mon.muy === ny) {
                        dispx = u.ux;
                        dispy = u.uy;
                    } else {
                        dispx = nx;
                        dispy = ny;
                    }

                    let info = 0;
                    if (onscary(dispx, dispy, mon)) {
                        if (!(flag & ALLOW_SSM))
                            continue;
                        info |= ALLOW_SSM;
                    }
                    if ((u.ux === nx && u.uy === ny)
                        || (nx === mon.mux && ny === mon.muy)) {
                        if (u.ux === nx && u.uy === ny) {
                            /* If it's right next to you, it found you,
                             * displaced or no.  We must set mux and muy
                             * right now, so when we return we can tell
                             * that the ALLOW_U means to attack _you_ and
                             * not the image.
                             */
                            mon.mux = u.ux;
                            mon.muy = u.uy;
                        }
                        if (!(flag & ALLOW_U))
                            continue;
                        info |= ALLOW_U;
                    } else {
                        const mtmp2 = m_at(nx, ny);
                        if (mtmp2) {
                            let mmflag = flag | mm_aggression(mon, mtmp2);

                            if (mmflag & ALLOW_M) {
                                info |= ALLOW_M;
                                if (mtmp2.mtame) {
                                    if (!(mmflag & ALLOW_TM))
                                        continue;
                                    info |= ALLOW_TM;
                                }
                            } else {
                                flag &= ~ALLOW_MDISP; /* depends upon defender */
                                mmflag = flag | mm_displacement(mon, mtmp2);
                                if (!(mmflag & ALLOW_MDISP))
                                    continue;
                                info |= ALLOW_MDISP;
                            }
                        }
                        /* Note: ALLOW_SANCT only prevents movement, not
                           attack, into a temple. */
                        if (lev.flags?.has_temple)
                            throw new Error('mfndpos(): temples not ported yet');
                    }
                    if (checkobj && sobj_at(CLOVE_OF_GARLIC, nx, ny)) {
                        if (flag & NOGARLIC)
                            continue;
                        info |= NOGARLIC;
                    }
                    if (checkobj && sobj_at(BOULDER, nx, ny)) {
                        if (!(flag & ALLOW_ROCK))
                            continue;
                        info |= ALLOW_ROCK;
                    }
                    if (monseeu && monlineu(mon, nx, ny)) {
                        if (flag & NOTONL)
                            continue;
                        info |= NOTONL;
                    }
                    /* check for diagonal tight squeeze */
                    if (nx !== x && ny !== y && bad_rock(mdat, x, ny)
                        && bad_rock(mdat, nx, y) && cant_squeeze_thru(mon))
                        continue;
                    /* The monster avoids a particular type of trap if it's
                     * familiar with the trap type.  Pets get ALLOW_TRAPS
                     * and checking is done in dogmove.c.  In either case,
                     * "harmless" traps are neither avoided nor marked in info[].
                     */
                    const ttmp = t_at(nx, ny);
                    if (ttmp) {
                        if (ttmp.ttyp >= TRAPNUM || ttmp.ttyp === 0) {
                            /* impossible("A monster looked at a very
                               strange trap of type %d.") */
                            continue;
                        }
                        /* fixed-destination teleport trap, was used by hero */
                        if (fixed_tele_trap(ttmp) && hastrack(nx, ny))
                            info |= ALLOW_TRAPS;
                        else if (!m_harmless_trap(mon, ttmp)) {
                            if (!(flag & ALLOW_TRAPS)) {
                                if (mon_knows_traps(mon, ttmp.ttyp))
                                    continue;
                            }
                            info |= ALLOW_TRAPS;
                        }
                    }
                    data.poss[cnt] = { x: nx, y: ny };
                    data.info[cnt] = info;
                    cnt++;
                }
            }
        if (!cnt && wantpool && !is_pool(x, y)) {
            wantpool = false;
            continue; /* goto nexttry */
        }
        break;
    }
    data.cnt = cnt;
    return cnt;
}

// C ref: mon.c kill_eggs()
// Object chains here are either arrays (level.objects, minvent, cobj) or
// nobj-linked lists (invent).
function kill_eggs(obj_list) {
    if (!obj_list)
        return;
    const objs = [];
    if (Array.isArray(obj_list))
        objs.push(...obj_list);
    else
        for (let o = obj_list; o; o = o.nobj)
            objs.push(o);
    for (const otmp of objs)
        if (otmp.otyp === EGG) {
            if (dead_species(otmp.corpsenm, true)) {
                /*
                 * It seems we could also just catch this when
                 * it attempted to hatch, so we wouldn't have to
                 * search all of the objlists.. or stop all
                 * hatch timers based on a corpsenm.
                 */
                kill_egg(otmp);
            }
        } else if (otmp.cobj && otmp.cobj.length) { /* Has_contents() */
            kill_eggs(otmp.cobj);
        }
}

// C ref: mon.c kill_genocided_monsters()
/* kill all members of genocided species */
export function kill_genocided_monsters() {
    const g = game;
    let mtmp, mtmp2;
    let kill_cham;
    let mndx;

    for (mtmp = g.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (mtmp.mhp <= 0) /* DEADMONSTER() */
            continue;
        mndx = monsndx(mtmp.data);
        kill_cham = (mtmp.cham !== undefined && mtmp.cham >= LOW_PM /* ismnum() */
                     && (g.mvitals[mtmp.cham].mvflags & G_GENOD));
        if ((g.mvitals[mndx].mvflags & G_GENOD) || kill_cham) {
            /* newcham(mtmp, NULL, NC_SHOW_MSG) or mondead(mtmp) */
            throw new Error('kill_genocided_monsters(): removing genocided monsters not ported yet');
        }
        if (mtmp.minvent)
            kill_eggs(mtmp.minvent);
    }

    kill_eggs(g.invent);
    kill_eggs(g.level.objects);
    kill_eggs(g.migrating_objs);
    kill_eggs(g.level.buriedobjlist);
}

// C ref: mon.c healmon()
/* heal a monster (or the hero); returns amount of hit points restored */
export function healmon(mtmp, amt, overheal) {
    if (mtmp === game.youmonst) {
        throw new Error('healmon(): healup() for the hero not ported yet');
    } else {
        const oldhp = mtmp.mhp;
        if (mtmp.mhp + amt > mtmp.mhpmax + overheal) {
            mtmp.mhpmax += overheal;
            mtmp.mhp = mtmp.mhpmax;
        } else {
            mtmp.mhp += amt;
            if (mtmp.mhp > mtmp.mhpmax)
                mtmp.mhpmax = mtmp.mhp;
        }
        return mtmp.mhp - oldhp;
    }
}

/* C ref: obj.h ofood(), polyfood(), mlevelgain(), mhealup();
   mon.c mstoning(); mondata.h flesh_petrifies() */
function ofood(o) {
    return o.otyp === CORPSE || o.otyp === EGG || o.otyp === TIN;
}
function polyfood(obj) {
    return (ofood(obj) && obj.corpsenm >= LOW_PM
            && (pm_to_cham(obj.corpsenm) !== NON_PM
                || dmgtype(mons[obj.corpsenm], MM.AD_POLY)));
}
function mlevelgain(obj) { return ofood(obj) && obj.corpsenm === MM.PM_WRAITH; }
function mhealup(obj) { return ofood(obj) && obj.corpsenm === MM.PM_NURSE; }
function flesh_petrifies(pm) {
    return pm === mons[MM.PM_COCKATRICE] || pm === mons[MM.PM_CHICKATRICE]
           || pm === mons[MM.PM_MEDUSA];
}
function mstoning(obj) {
    return (ofood(obj) && obj.corpsenm >= LOW_PM && obj.corpsenm < NUMMONS
            && flesh_petrifies(mons[obj.corpsenm]));
}

// C ref: mon.c m_consume_obj()
/* monster mtmp eats object otmp; caller handles messages */
export async function m_consume_obj(mtmp, otmp) {
    const ispet = mtmp.mtame;

    /* non-pet: Heal up to the object's weight in hp */
    if (!ispet && mtmp.mhp < mtmp.mhpmax) {
        healmon(mtmp, objects[otmp.otyp].oc_weight, 0);
    }
    if (otmp.cobj && otmp.cobj.length) /* Has_contents(otmp) */
        throw new Error('m_consume_obj(): meatbox() not ported yet');
    if (otmp === game.uball || otmp === game.uchain) {
        throw new Error('m_consume_obj(): unpunish() not ported yet');
    } else {
        const vis = canseemon(mtmp);
        const corpsenm = (otmp.otyp === CORPSE ? otmp.corpsenm : NON_PM);

        const deadmimic = (otmp.otyp === CORPSE
                           && (corpsenm === MM.PM_SMALL_MIMIC
                               || corpsenm === MM.PM_LARGE_MIMIC
                               || corpsenm === MM.PM_GIANT_MIMIC));
        const slimer = (otmp.otyp === GLOB_OF_GREEN_SLIME);
        const poly = polyfood(otmp);
        const grow = mlevelgain(otmp);
        const heal = mhealup(otmp);
        const eyes = (otmp.otyp === CARROT);
        const mstone = mstoning(otmp);
        const otyp = otmp.otyp;
        delobj(otmp); /* munch */
        if (poly || slimer) {
            const ptr = slimer ? mons[MM.PM_GREEN_SLIME] : null;

            newcham(mtmp, ptr, vis ? NC_SHOW_MSG : NO_NC_FLAGS);
        }
        if (grow) {
            if ((ispet && mtmp.m_lev < mtmp.data.mlevel + 15)
                || !ispet)
                grow_up(mtmp, null);
        }
        if (mstone)
            throw new Error('m_consume_obj(): monster stoning not ported yet');
        if (heal)
            healmon(mtmp, mtmp.mhpmax, 0);
        if ((eyes || heal) && !mtmp.mcansee)
            throw new Error('m_consume_obj(): mcureblindness() not ported yet');
        if (ispet && deadmimic)
            throw new Error('m_consume_obj(): quickmimic() not ported yet');
        if (otyp === EGG && corpsenm === MM.PM_PYROLISK)
            throw new Error('m_consume_obj(): explode() not ported yet');
        if (corpsenm !== NON_PM)
            await mon_givit(mtmp, mons[corpsenm]);
    }
}

// C ref: mon.c mon_give_prop()
/* give monster property prop */
async function mon_give_prop(mtmp, prop) {
    let msg = null;
    let intrinsic = 0; /* MR_* constant */

    /* Pets don't have all the fields that the hero does, so they can't get
       all the same intrinsics.  If it happens to choose strength gain or
       teleport control or whatever, ignore it. */
    switch (prop) {
    case FIRE_RES:
        msg = "%s shivers slightly.";
        break;
    case COLD_RES:
        msg = "%s looks quite warm.";
        break;
    case SLEEP_RES:
        msg = "%s looks wide awake.";
        break;
    case DISINT_RES:
        msg = "%s looks very firm.";
        break;
    case SHOCK_RES:
        msg = "%s crackles with static electricity.";
        break;
    case POISON_RES:
        msg = "%s looks healthy.";
        break;
    default:
        return; /* can't give it */
    }
    /* res_to_mr() */
    intrinsic = (FIRE_RES <= prop && prop <= STONE_RES) ? (1 << (prop - 1)) : 0;

    /* Don't give message if it already had this property intrinsically, but
       still do grant the intrinsic if it only had it from mresists.
       Do print the message if it only had this property extrinsically, which
       is why mon_resistancebits isn't used here. */
    if ((mtmp.data.mresists | (mtmp.mintrinsics ?? 0)) & intrinsic)
        msg = null;

    if (intrinsic)
        mtmp.mintrinsics = (mtmp.mintrinsics ?? 0) | intrinsic;

    if (canseemon(mtmp) && msg) {
        await pline(msg.replace('%s', Monnam(mtmp)));
    }
}

// C ref: mon.c mon_givit()
/* Maybe give an intrinsic to monster from eating corpse that confers it. */
export async function mon_givit(mtmp, ptr) {
    const prop = corpse_intrinsic(ptr);

    if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
        return;

    if (ptr === mons[MM.PM_STALKER])
        throw new Error('mon_givit(): stalker invisibility not ported yet');

    if (prop === 0)
        return; /* no intrinsic from this corpse */

    if (!should_givit(prop, ptr))
        return; /* failed die roll */

    await mon_give_prop(mtmp, prop);
}

// C ref: mon.c maybe_unhide_at()
/* force a hidden monster or hero out of hiding when its cover goes away */
export function maybe_unhide_at(x, y) {
    let mtmp;
    let undetected = false, trapped = false;

    if ((mtmp = m_at(x, y)) != null) {
        undetected = mtmp.mundetected;
        trapped = mtmp.mtrapped;
    } else if (game.u.ux === x && game.u.uy === y) {
        mtmp = game.youmonst;
        undetected = game.u.uundetected;
        trapped = game.u.utrap;
    } else {
        return;
    }

    if (undetected) {
        const hides_under = (mtmp.data.mflags1 & MM.M1_CONCEAL) !== 0;

        if (hides_under && OBJ_AT(x, y) && !trapped)
            throw new Error('maybe_unhide_at(): can_hide_under_obj() not ported yet');
        if ((hides_under && (!OBJ_AT(x, y) || trapped))
            || (mtmp.data.mlet === S_EEL && !is_pool(x, y)))
            throw new Error('maybe_unhide_at(): hideunder() not ported yet');
    }
}
