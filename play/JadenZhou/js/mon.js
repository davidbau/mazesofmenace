// mon.js — Monster movement allotment and per-turn monster upkeep.
// C ref: mon.c
//
// Ported so far: mcalcmove(), mcalcdistress(), movemon(), mfndpos(),
// monnear(), mon_allowflags().

import { game } from './gstate.js';
import { remove_worm, wormgone, worm_known, worm_cross, count_wsegs, get_wormno,
         initworm, place_worm_tail_randomly } from './worm.js';
import { healup_nocure } from './potion.js';
import { mcureblindness } from './muse.js';
import { clear_bypasses, bypass_obj } from './worn.js';
import { rn2, rn1 } from './rng.js';
import * as MM from './monsters.js';
import { SPECIAL_PM, NUMMONS } from './monsters.js';
import { pick_nasty } from './wizard.js';
import { tt_doppel } from './topten.js';
import { were_change } from './were.js';
import {
    MSLOW, MFAST, NORMAL_SPEED, LOW_PM, I_SPECIAL, CONFLICT, INVIS,
    DISPLACED, COLNO, ROWNO, IS_OBSTRUCTED, IS_TREE, IS_WATERWALL, IS_DOOR,
    IS_STWALL, IRONBARS, LAVAWALL, W_NONDIGGABLE, D_CLOSED, D_LOCKED,
    D_BROKEN, isok,
    ALLOW_U, ALLOW_M, ALLOW_TM, ALLOW_ALL, ALLOW_MDISP, ALLOW_TRAPS,
    ALLOW_SANCT, ALLOW_SSM, ALLOW_ROCK, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS,
    NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, NOGARLIC,
    M_AP_MONSTER, MON_DETACH, MON_MIGRATING, W_AMUL, NON_PM, NATTK, Is_rogue_level,
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
import { m_dowear, which_armor, mon_break_armor } from './worn.js';
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
         POISON_RES, STONE_RES, M_POISONGAS_OK, M_POISONGAS_MINOR, M_POISONGAS_BAD,
         MAGICAL_BREATHING, Is_waterlevel } from './const.js';
import { attacktype_fordmg, resists_poison } from './mondata.js';
import { visible_region_at, cmap_to_glyph, S_poisoncloud, create_gas_cloud } from './region.js';
import { corpse_intrinsic, should_givit } from './eat.js';
import { delobj } from './invent.js';
import { unpunish } from './read.js';
import { grow_up, goodpos, place_monster } from './makemon.js';
import { enexto, rloc_to_core } from './teleport.js';
import { PICK_AXE, DWARVISH_MATTOCK, AXE, BATTLE_AXE, WEAPON_CLASS,
         TOOL_CLASS } from './objects.js';
import { NO_WEAPON_WANTED, W_ARMS, SHOPBASE, P_AXE, P_PICK_AXE, WT_TOOMUCH_DIAGONAL } from './const.js';
import { curr_mon_load } from './dogmove.js';
import { can_hide_under_obj, set_mimic_sym } from './makemon.js';
import { vobj_at } from './display.js';
import { ceiling_hider } from './engrave.js';
import { has_ceiling } from './insight.js';
import { M_AP_FURNITURE, M_AP_OBJECT, ROOM } from './const.js';
import { dead_species } from './mkobj.js';
import { kill_egg } from './timeout.js';
import { relobj, thiefdead, mdrop_special_objs, discard_minvent } from './steal.js';
import { dochugw, onscary, mon_regen, m_everyturn_effect,
         mon_track_clear, monflee } from './monmove.js';
import { tele_restrict, rloc } from './teleport.js';
import { can_teleport, resists_fire } from './mondata.js';
import { on_fire } from './uhitm.js';
import { m_in_air } from './monmove.js';
import { FOUNTAIN, FLYING, LEVITATION, RLOC_MSG } from './const.js';
import { canseemon, sensemon } from './display.js';
import { UNICORN_HORN, WORM_TOOTH } from './objects.js';
import { CORPSTAT_NONE, CORPSTAT_BURIED, CORPSTAT_INIT, CORPSTAT_FEMALE,
         CORPSTAT_MALE, TAINT_AGE, ONAME_NO_FLAGS, BLINDED } from './const.js';
import { mksobj_at, mkcorpstat, undead_to_corpse,
         clear_dknown } from './mkobj.js';
import { stackobj } from './invent.js';
import { oname } from './do_name.js';
import { rnd } from './rng.js';
import { XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
         engulfing_u, is_pit, A_CHAOTIC, TELEPAT, INTRINSIC, M_AP_NOTHING,
         TEMPLE } from './const.js';
import { Hallucination, canspotmon, see_monsters } from './display.js';
import { mon_nam, x_monnam, ARTICLE_NONE, ARTICLE_THE,
         SUPPRESS_SADDLE, ARTICLE_A, ARTICLE_YOUR, noname_monnam } from './do_name.js';
import { olfaction, is_orc } from './mondata.js';
import { highc } from './hacklib.js';
import { mkobj, place_object } from './mkobj.js';
import { RANDOM_CLASS, FOOD_CLASS, FIGURINE } from './objects.js';
import { flooreffects, deferred_goto } from './do.js';
import { s_suffix } from './hacklib.js';
import { change_luck, adjalign } from './attrib.js';
import { experience, more_experienced, newexplevel } from './exper.js';
import { You_hear, growl, maybe_gasp } from './sounds.js';
import { PLNMSG_GROWL, DEAF } from './const.js';
import { little_to_big } from './mondata.js';
import { quest_info } from './questpgr.js';
import { is_lightblocker_mappear, does_block, unblock_point,
         couldsee } from './vision.js';
import { M1_HUMANOID } from './monsters.js';
import { vtense } from './objnam.js';
import { sengr_at } from './makemon.js';
import { del_engr_at } from './engrave.js';
import { m_canseeu } from './monmove.js';
import { in_rooms } from './hack.js';
import { in_your_sanctuary } from './priest.js';
import { nemdead, leaddead, nemesis_stinks } from './quest.js';
import { stinky_nemesis } from './questpgr.js';

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
export async function mcalcdistress() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp)) continue; /* iter_mons() */
        await m_calcdistress(mtmp);
    }
}

async function m_calcdistress(mtmp) {
    /* must check non-moving monsters once/turn in case they managed
       to end up in water or lava; note: when not in liquid they regen,
       shape-shift, timeout temporary maladies just like other monsters */
    if (mtmp.data.mmove === 0) {
        if (game.vision_full_recalc)
            vision_recalc(0);
        if (await minliquid(mtmp))
            return;
    }

    /* regenerate hit points */
    mon_regen(mtmp, false);

    /* possibly polymorph shapechangers and lycanthropes */
    if (mtmp.cham !== undefined && mtmp.cham >= LOW_PM) /* ismnum() */
        await decide_to_shapeshift(mtmp);
    if (is_were(mtmp.data))
        await were_change(mtmp);

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

// C ref: mon.c mongone() -- the vault guard case is not ported; unstuck()
// is checked in mon_leaving_level().
/* remove a monster from the game without leaving a corpse */
export function mongone(mdef) {
    mdef.mhp = 0; /* can skip some inventory bookkeeping */

    /* dead vault guard is actually kept at coordinate <0,0> until
       his temporary corridor to/from the vault has been removed */
    if (mdef.isgd)
        throw new Error('mongone: vault guards are not ported yet');
    /* stuck to you? release: unstuck(mdef) -- see mon_leaving_level() */
    /* drop special items like the Amulet so that a dismissed Kop or nurse
       can't remove them from the game */
    mdrop_special_objs(mdef);
    /* release rest of monster's inventory--it is removed from game */
    discard_minvent(mdef, false);
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
            remove_worm(mon);
        else
            lst.splice(i, 1); /* remove_monster(mx, my) */
    }
    if (onmap) {
        mon.mundetected = 0; /* for migration; doesn't matter for death */
        /* unhide mimic in case its shape has been blocking line of sight
           or it is accompanying the hero to another level */
        if (mon.m_ap_type && mon.m_ap_type !== M_AP_MONSTER)
            seemimic(mon);
        /* fill_pit(mx, my): boulders dropping into pits not ported */
        newsym(mx, my);
    }
}

// C ref: mon.c mnearto()
/* make monster mtmp next to you (if possible);
   might place monst on far side of a wall or boulder */
/* returns 0: couldn't place; 1: placed (maybe at an alternate spot);
   2: placed and moved another monster out of the way */
export async function mnearto(
    mtmp,
    x,
    y,
    move_other, /* make sure mtmp gets to x, y! so move m_at(x, y) */
    rlocflags)
{
    let othermon = null;
    let newx, newy;
    const mm = { x: 0, y: 0 };
    let res = 1;

    if (mtmp.mx === x && mtmp.my === y && m_at(x, y) === mtmp)
        return res;

    if (move_other && (othermon = m_at(x, y)) !== null)
        throw new Error('mnearto(): moving another monster out of the way not ported yet');

    newx = x;
    newy = y;
    if (!goodpos(newx, newy, mtmp, 0)) {
        /* Actually we have real problems if enexto ever fails.
         * Migrating_mons that need to be placed will cause
         * no end of trouble.
         */
        if (!enexto(mm, newx, newy, mtmp.data) || !isok(mm.x, mm.y))
            return 0;
        newx = mm.x;
        newy = mm.y;
    }
    /* [this doesn't honor the 'montelecontrol' option] */
    await rloc_to_core(mtmp, newx, newy, rlocflags); /* rloc_to_flag() */

    return res;
}

// C ref: mon.c relmon()
/* remove a monster from the fmon list (and the map); 'list' is the name
   of the game list to put it on ('migrating_mons' or 'mydogs') or null */
export function relmon(mon, list) {
    const g = game;

    if (!g.fmon)
        throw new Error('relmon: no fmon available.'); /* panic() */

    /* take 'mon' off the map */
    mon_leaving_level(mon);

    /* remove 'mon' from the 'fmon' list */
    if (mon === g.fmon) {
        g.fmon = g.fmon.nmon;
    } else {
        let mtmp;

        for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon)
            if (mtmp.nmon === mon) {
                mtmp.nmon = mon.nmon;
                break;
            }
        if (!mtmp)
            throw new Error('relmon: mon not in list.'); /* panic() */
    }

    if (list) {
        /* insert into gm.mydogs or gm.migrating_mons */
        mon.nmon = g[list] || null;
        g[list] = mon;
    } else {
        /* orphan has no next monster */
        mon.nmon = null;
    }
}

// C ref: mon.c m_detach()
// The inventory drop for a death (steal.c relobj(), whose mdrop_obj() can
// give a message) is async: with due_to_death this returns a promise that
// mondead() awaits; mongone() (due_to_death FALSE, called from level
// creation) runs synchronously.
function m_detach(mtmp, mptr, due_to_death) {
    const mx = mtmp.mx, my = mtmp.my;

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
            thiefdead();
        if (mtmp.isshk)
            shkgone(mtmp);
        if (mtmp.wormno)
            wormgone(mtmp);
        /* In_endgame(&u.uz): MON_ENDGAME_FREE -- the endgame isn't reached */

        mtmp.mstate = (mtmp.mstate || 0) | MON_DETACH;
        game.purge_monsters = (game.purge_monsters || 0) + 1;

        if (mtmp === game.u.usteed)
            throw new Error('m_detach(): dismount_steed() not ported yet');
    };

    /* foodead() might give quest feedback for foo having died; skip that
       if we're called for mongone() rather than mondead(); saving bones
       or wizard mode genocide of "*" can result in special monsters going
       away without having been killed */
    if (due_to_death) {
        return (async () => {
            if (mtmp.data.msound === MS_NEMESIS) {
                await nemdead();
                /* The Archeologist, Caveman, and Priest quest texts describe
                   the nemesis's body creating noxious fumes/gas when killed. */
                if (await stinky_nemesis(mtmp))
                    await nemesis_stinks(mx, my);
            }
            if (mtmp.data.msound === MS_LEADER)
                leaddead();
            /* release (drop onto map) all objects carried by mtmp; assumes
               that mtmp->mx,my contains the appropriate location */
            await relobj(mtmp, 1, false); /* drop mtmp->minvent, issue newsym(mx,my) */
            after_relobj();
        })();
    }
    after_relobj();
    return undefined;
}

// C ref: mon.c mlifesaver()
/* find the worn amulet of life saving which will save a monster */
export function mlifesaver(mon) {
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
        await create_gas_cloud(mtmp.mx, mtmp.my, rn2(10) + 5, 0); /* harmless */

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
export async function corpse_chance(mon, magr, was_swallowed) {
    const mdat = mon.data;
    let tmp;

    if (!magr && game.mswallower)
        throw new Error('corpse_chance(): engulfer explosions not ported yet');

    if (mdat === mons[PM_VLAD_THE_IMPALER] || mdat.mlet === S_LICH)
        throw new Error('corpse_chance(): body crumbles into dust not ported yet');

    /* Gas spores always explode upon death */
    for (let i = 0; i < NATTK; i++) {
        if (mdat.mattk[i].aatyp === AT_BOOM) {
            if (mdat.mattk[i].damn)
                tmp = d(mdat.mattk[i].damn, mdat.mattk[i].damd);
            else if (mdat.mattk[i].damd)
                tmp = d(mdat.mlevel + 1, mdat.mattk[i].damd);
            else
                tmp = 0;

            if (was_swallowed && magr) {
                /* mdef is a gas spore (AT_BOOM) that is exploding inside an
                   engulfer; suppress usual explosion since it's contained */
                if (magr === game.youmonst) {
                    await There_mn(`is an explosion in your ${body_part_mn(STOMACH_MN)}!`);
                    killer_mn().name = `${s_suffix(pmname(mdat, mon.female ? 1 : 0))} explosion`;
                    await losehp_mn(Maybe_Half_Phys_mn(tmp), killer_mn().name,
                                    KILLED_BY_AN_MN);
                } else {
                    await You_hear("an explosion.");
                    magr.mhp -= tmp;
                    if (DEADMONSTER(magr))
                        await mondied(magr);
                    if (DEADMONSTER(magr)) { /* maybe lifesaved */
                        if (canspotmon(magr))
                            await pline(`${Monnam(magr)} rips open!`);
                    } else if (canseemon(magr))
                        await pline(`${Monnam(magr)} seems to have indigestion.`);
                }
                return false;
            }

            await mon_explodes(mon, mdat.mattk[i]);
            return false;
        }
    }

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
    tmp = 2 + ((mdat.geno & G_FREQ) < 2 ? 1 : 0) + (verysmall(mdat) ? 1 : 0);
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
        bypass_obj(obj);

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
    if (await corpse_chance(mdef, null, false)
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

/* C ref: mondata.h always_hostile(), is_unicorn(); hack.h sgn() */
function always_hostile(ptr) { return (ptr.mflags2 & MM.M2_HOSTILE) !== 0; }
function is_unicorn(ptr) {
    return ptr.mlet === S_UNICORN && (ptr.mflags2 & M2_JEWELS) !== 0;
}
function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }
/* C ref: align.h ALIGNLIM */
function ALIGNLIM() { return 10 + Math.trunc(game.moves / 200); }

// C ref: mon.c killed()
export async function killed(mtmp) {
    await xkilled(mtmp, XKILL_GIVEMSG);
}

// C ref: mon.c xkilled()
/* the player has killed the monster mtmp */
export async function xkilled(
    mtmp,
    xkill_flags) /* 1: suppress mesg, 2: suppress corpse, 4: pacifist */ {
    const u = game.u;
    let tmp, mndx;
    const x = mtmp.mx, y = mtmp.my;
    let mdat;
    let otmp;
    let t;
    const wasinside = engulfing_u(mtmp);
    let burycorpse = false;
    const nomsg = (xkill_flags & XKILL_NOMSG) !== 0;
    let nocorpse = (xkill_flags & XKILL_NOCORPSE) !== 0;
    const noconduct = (xkill_flags & XKILL_NOCONDUCT) !== 0;

    /* potential pet message; always clear global flag */
    const be_sad = !!game.sad_feeling;
    game.sad_feeling = false;

    mtmp.mhp = 0; /* caller will usually have already done this */
    if (!noconduct) { /* KMH, conduct */
        /* livelog_printf(LL_CONDUCT, "killed for the first time") has no
           game effect */
        u.uconduct.killer = (u.uconduct.killer || 0) + 1;
    }
    if (!nomsg) {
        const namedpet = !!mtmp.mgivenname && !Hallucination();

        await pline(`You ${nonliving(mtmp.data) ? 'destroy' : 'kill'} ${
            !(wasinside || canspotmon(mtmp)) ? 'it'
            : !mtmp.mtame ? mon_nam(mtmp)
              : x_monnam(mtmp, namedpet ? ARTICLE_NONE : ARTICLE_THE,
                         'poor', namedpet ? SUPPRESS_SADDLE : 0, false)}!`);
    }

    if (mtmp.mtrapped && (t = t_at(x, y)) != null && is_pit(t.ttyp)) {
        if (sobj_at(BOULDER, x, y))
            nocorpse = true; /* Prevent corpses/treasure being created
                              * "on top" of boulder that is about to fall in.
                              * This is out of order, but cannot be helped
                              * unless this whole routine is rearranged. */
        if (m_carrying(mtmp, BOULDER))
            burycorpse = true;
    }

    /* your pet knows who just killed it...watch out */
    if (mtmp.mtame && !mtmp.isminion)
        mtmp.edog.killed_by_u = 1;

    if (wasinside && game.thrownobj)
        throw new Error('xkilled(): thrown object killing engulfer not ported yet');

    game.vamp_rise_msg = false; /* might get set in mondead(); checked below */
    game.disintegested = nocorpse; /* alternate vamp_rise mesg needed if true */
    /* dispose of monster and make cadaver */
    if (game.stoned)
        throw new Error('xkilled(): monstone() not ported yet');
    else
        await mondead(mtmp);
    game.disintegested = false; /* reset */

    if (!DEADMONSTER(mtmp)) { /* monster lifesaved */
        /* Cannot put the non-visible lifesaving message in
         * lifesaved_monster() since the message appears only when _you_
         * kill it (as opposed to visible lifesaving which always appears).
         */
        game.stoned = false;
        if (!cansee(x, y) && !game.vamp_rise_msg)
            await pline('Maybe not...');
        return;
    }

    if (be_sad)
        await pline('You have a sad feeling for a moment, then it passes.');

    mdat = mtmp.data; /* note: mondead can change mtmp->data */
    mndx = monsndx(mdat);

    let do_cleanup = false;
    if (game.stoned) {
        game.stoned = false;
        do_cleanup = true; /* goto cleanup */
    }

    /* LEVEL_SPECIFIC_NOCORPSE(mdat) */
    if (!do_cleanup
        && (nocorpse
            || (Is_rogue_level(u.uz)
                || !game.level.flags.deathdrops
                || (game.level.flags.graveyard && is_undead(mdat) && rn2(3)))))
        do_cleanup = true; /* goto cleanup */

    if (!do_cleanup) {
        /* MAIL_STRUCTURES: no mail daemon in this build */
        if (accessible(x, y) || is_pool(x, y)) {
            let cadaver;
            let otyp;

            /* illogical but traditional "treasure drop" */
            if (!rn2(6) && !(game.mvitals[mndx].mvflags & MM.G_NOCORPSE)
                /* no extra item from swallower or steed */
                && (x !== u.ux || y !== u.uy)
                /* no extra item from kops--too easy to abuse */
                && mdat.mlet !== S_KOP
                /* no items from cloned monsters */
                && !mtmp.mcloned) {
                otmp = mkobj(RANDOM_CLASS, true);
                /* don't create large objects from small monsters */
                otyp = otmp.otyp;
                if (otmp.oclass === FOOD_CLASS && !(mdat.mflags2 & MM.M2_COLLECT)
                    && !otmp.oartifact) {
                    /* don't drop newly created permafood from kills, unless
                       the monster collects food; it creates too much nutrition
                       in the late game and encourages grinding in the early
                       game; oartifact check is paranoia and will be redundant
                       until an artifact comestible is added */
                    delobj(otmp);
                } else if (mdat.msize < MM.MZ_HUMAN && otyp !== FIGURINE
                    /* oc_big is also oc_bimanual and oc_bulky */
                    && (otmp.owt > 30 || objects[otyp].oc_big)) {
                    if (otmp.oartifact) /* un-create */
                        throw new Error('xkilled(): artifact_exists() not ported yet');
                    delobj(otmp);
                } else if (!await flooreffects(otmp, x, y, nomsg ? '' : 'fall')) {
                    place_object(otmp, x, y);
                    stackobj(otmp);
                }
            }
            /* corpse--none if hero was inside the monster */
            if (!wasinside && await corpse_chance(mtmp, null, false)) {
                game.zombify = (!game.thrownobj && !game.stoned && !game.uwep
                                && zombie_maker(game.youmonst)
                                && zombie_form(mtmp.data) !== NON_PM);
                cadaver = make_corpse(mtmp, burycorpse ? CORPSTAT_BURIED
                                                       : CORPSTAT_NONE);
                game.zombify = false; /* reset */
                if (burycorpse && cadaver && cansee(x, y) && !mtmp.minvis
                    && cadaver.where === 'OBJ_BURIED' && !nomsg) {
                    await pline(`${s_suffix(Monnam(mtmp))} corpse ends up buried.`);
                }
            }
        }

        if (wasinside)
            throw new Error('xkilled(): killing an engulfer from inside (spoteffects()) not ported yet');
        /* monster is gone, corpse or other object might now be visible */
        newsym(x, y);
    }

    /* cleanup: */
    /*
     * Punish bad behavior.
     */
    if (is_human(mdat)
        && (!always_hostile(mdat) && mtmp.malign <= 0)
        /* exclude role monsters */
        && (mndx < MM.PM_ARCHEOLOGIST || mndx > MM.PM_WIZARD)
        /* exclude plain "human", which isn't flagged as always hostile;
           it is rare and most likely to occur as the result of resurrecting
           a corpse or animating a statue and usually will be hostile */
        && mndx !== MM.PM_HUMAN
        /* only applicable if hero is lawful or neutral */
        && u.ualign.type !== A_CHAOTIC) {
        u.uprops[TELEPAT].intrinsic &= ~INTRINSIC; /* HTelepat &= ~INTRINSIC */
        change_luck(-2);
        await pline('You murderer!');
        if (mon_Blind() && !u.uprops[TELEPAT].intrinsic
            && !u.uprops[TELEPAT].extrinsic) /* Blind && !Blind_telepat */
            see_monsters(); /* Can't sense monsters any more. */
    }
    if ((mtmp.mpeaceful && !rn2(2)) || mtmp.mtame)
        change_luck(-1);
    if (is_unicorn(mdat) && sgn(u.ualign.type) === sgn(mdat.maligntyp)) {
        change_luck(-5);
        await pline('You feel guilty...');
    }

    /* give experience points */
    tmp = experience(mtmp, game.mvitals[mndx].died);
    more_experienced(tmp, 0);
    await newexplevel(); /* will decide if you go up */

    /* adjust alignment points */
    if (game.quest_status?.leader_m_id
        && mtmp.m_id === game.quest_status.leader_m_id) { /* REAL BAD! */
        throw new Error('xkilled(): killing the quest leader not ported yet');
    } else if (mdat.msound === MS_NEMESIS) { /* Real good! */
        if (!game.quest_status?.killed_leader)
            adjalign(Math.trunc(ALIGNLIM() / 4));
    } else if (mdat.msound === MM.MS_GUARDIAN) { /* Bad */
        adjalign(-Math.trunc(ALIGNLIM() / 8));
        u.ugangr = (u.ugangr || 0) + 1;
        change_luck(-4);
        if (!Hallucination())
            await pline('That was probably a bad idea...');
        else
            await pline('Whoopsie-daisy!');
    } else if (mtmp.ispriest) {
        throw new Error('xkilled(): killing a priest (p_coaligned()) not ported yet');
    } else if (mtmp.mtame) {
        adjalign(-15); /* bad!! */
        /* your god is mighty displeased... */
        if (!Hallucination()) {
            await You_hear('the rumble of distant thunder...');
        } else {
            await You_hear('the studio audience applaud!');
        }
        /* livelog_printf(LL_KILLEDPET, ...) has no game effect */
    } else if (mtmp.mpeaceful)
        adjalign(-5);

    /* malign was already adjusted for u.ualign.type and randomization */
    adjalign(mtmp.malign);
}

// C ref: mon.c seemimic()
/* force all chameleons and mimics to become themselves */
export function seemimic(mtmp) {
    const is_blocker_appear = is_lightblocker_mappear(mtmp);

    if (mtmp.mextra?.mcorpsenm !== undefined) /* has_mcorpsenm() */
        delete mtmp.mextra.mcorpsenm; /* freemcorpsenm(mtmp) */

    mtmp.m_ap_type = M_AP_NOTHING;
    mtmp.m_ap_fdknown = 0; /* M_AP_F_DKNOWN, kept apart from m_ap_type */
    mtmp.mappearance = 0;

    /*
     *  Discovered mimics don't block light.
     */
    if (is_blocker_appear
        && !does_block(mtmp.mx, mtmp.my, game.level.at(mtmp.mx, mtmp.my)))
        unblock_point(mtmp.mx, mtmp.my);

    newsym(mtmp.mx, mtmp.my);
}

// C ref: dogmove.c finish_meating()
function finish_meating(mtmp) {
    mtmp.meating = 0;
    if ((mtmp.m_ap_type || 0) !== M_AP_NOTHING && mtmp.data.mlet !== MM.S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}

// C ref: mon.c peacefuls_respond()
/* make other peaceful monsters react */
async function peacefuls_respond(mtmp) {
    const mndx = monsndx(mtmp.data);

    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if (DEADMONSTER(mon))
            continue;
        if (mon === mtmp) /* the mpeaceful test catches this since mtmp */
            continue;    /* is no longer peaceful, but be explicit...  */

        if (!(mon.data.mflags1 & M1_MINDLESS) && mon.mpeaceful
            && couldsee(mon.mx, mon.my) && !mon.msleeping
            && mon.mcansee && m_canseeu(mon)) {
            let buf = '';
            let exclaimed = false, needpunct = false, alreadyfleeing;
            const is_watch = ptr => ptr === MM.mons[MM.PM_WATCHMAN]
                                    || ptr === MM.mons[MM.PM_WATCH_CAPTAIN];
            const Deaf = () => !!(game.u.uprops[DEAF]?.intrinsic
                                  || game.u.uprops[DEAF]?.extrinsic);

            if (humanoid(mon.data) || mon.isshk || mon.ispriest) {
                if (is_watch(mon.data)) {
                    /* SetVoice(mon, 0, 80, 0); verbalize() */
                    if (!Deaf())
                        await pline('"Halt!  You\'re under arrest!"');
                    await angry_guards(Deaf());
                } else {
                    if (!Deaf() && !rn2(5)) {
                        const gasp = maybe_gasp(mon);

                        if (gasp) {
                            if (gasp.slice(0, 4).toLowerCase() === "gasp") {
                                buf = `${Monnam(mon)} gasps`;
                                needpunct = true;
                            } else {
                                buf = `${Monnam(mon)} exclaims "${gasp}"`;
                            }
                            exclaimed = true;
                        }
                    }
                    /* shopkeepers and temple priests might gasp in
                       surprise, but they won't become angry here;
                       quest leader will only get angry if hero attacks
                       own quest guardians */
                    if (mon.isshk || mon.ispriest
                        || (mon.data === MM.mons[quest_info(MM.MS_LEADER)]
                            && mtmp.data !== MM.mons[game.urole.guardnum])) {
                        if (exclaimed)
                            await pline(`${buf} then shrugs.`); /* pline_mon() */
                        continue;
                    }

                    if (mon.data.mlevel < rn2(10)
                        /* don't have quest guardians turn to flee */
                        && (mon.data !== MM.mons[game.urole.guardnum])) {
                        alreadyfleeing = (mon.mflee || mon.mfleetim);
                        await monflee(mon, rn2(50) + 25, true, !exclaimed);
                        if (exclaimed) {
                            if (game.flags.verbose && !alreadyfleeing) {
                                buf += " and then turns to flee.";
                                needpunct = false;
                            }
                        } else
                            exclaimed = true; /* got msg from monflee() */
                    }
                    if (buf)
                        await pline(`${buf}${needpunct ? "." : ""}`); /* pline_mon() */
                    if (mon.mtame) {
                        ; /* mustn't set mpeaceful to 0 as below;
                           * perhaps reduce tameness? */
                    } else {
                        mon.mpeaceful = 0;
                        mon.mstrategy &= ~STRAT_WAITMASK;
                        adjalign(-1);
                        if (!exclaimed)
                            await pline(`${Monnam(mon)} gets angry!`); /* pline_mon() */
                    }
                }
            } else if (mon.data.mlet === mtmp.data.mlet
                       && big_little_match(mndx, monsndx(mon.data))
                       && !rn2(3)) {
                if (!rn2(4)) {
                    await growl(mon);
                    exclaimed = (game.iflags.last_msg === PLNMSG_GROWL);
                }
                if (rn2(6)) {
                    alreadyfleeing = (mon.mflee || mon.mfleetim);
                    await monflee(mon, rn2(25) + 15, true, !exclaimed);
                    if (exclaimed && !alreadyfleeing)
                        /* word like a separate sentence so that we
                           don't have to poke around inside growl() */
                        await pline("And then starts to flee.");
                }
            }
        }
    }
}

// C ref: mondata.c big_little_match()
function big_little_match(montyp1, montyp2) {
    let l, b;

    /* simplest case: both are same pm */
    if (montyp1 === montyp2)
        return true;
    /* assume it isn't possible to grow from one class letter to another */
    if (MM.mons[montyp1].mlet !== MM.mons[montyp2].mlet)
        return false;
    /* check whether montyp1 can grow up into montyp2 */
    for (l = montyp1; (b = little_to_big(l)) !== l; l = b)
        if (b === montyp2)
            return true;
    /* check whether montyp2 can grow up into montyp1 */
    for (l = montyp2; (b = little_to_big(l)) !== l; l = b)
        if (b === montyp1)
            return true;
    /* neither grows up to become the other; no match */
    return false;
}

// C ref: mon.c setmangry()
/* Called whenever the player attacks mtmp; also called in other situations
   where mtmp gets annoyed at the player. Handles mtmp getting annoyed at the
   attack and any ramifications that might have. Useful also in situations
   where mtmp was already hostile; it checks for situations where the player
   shouldn't be attacking and any ramifications /that/ might have. */
export async function setmangry(mtmp, via_attack) {
    const u = game.u;
    if (via_attack && sengr_at('Elbereth', u.ux, u.uy, true)
        /* only hypocritical if monster is vulnerable to Elbereth (or
           peaceful--not vulnerable but attacking it is hypocritical) */
        && (onscary(u.ux, u.uy, mtmp) || mtmp.mpeaceful)) {
        await pline('You feel like a hypocrite.');
        /* AIS: Yes, I know alignment penalties and bonuses aren't balanced
           at the moment. This is about correct relative to other "small"
           penalties; it should be fairly large, as attacking while standing
           on an Elbereth means that you're requesting peace and then
           violating your own request. I know 5 isn't actually large, but
           it's intentionally larger than the 1s and 2s that are normally
           given for this sort of thing. */
        /* reduce to 3 (average) when alignment is already very low */
        adjalign((u.ualign.record > 5) ? -5 : -rnd(5));

        if (!mon_Blind())
            await pline('The engraving beneath you fades.');
        del_engr_at(u.ux, u.uy);
    }

    /* AIS: Should this be in both places, or just in wakeup()? */
    mtmp.mstrategy &= ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful)
        return;
    /* [FIXME: this logic seems wrong; peaceful humanoids gasp or exclaim
       when they see you attack a peaceful monster but they just casually
       look the other way when you attack a pet?] */
    if (mtmp.mtame)
        return;
    mtmp.mpeaceful = 0;
    if (mtmp.ispriest) {
        throw new Error('setmangry(): angering a priest (p_coaligned()) not ported yet');
    } else
        adjalign(-1); /* attacking peaceful monsters is bad */
    if ((mtmp.data.mflags1 & M1_HUMANOID) || mtmp.isshk || mtmp.isgd) {
        if (couldsee(mtmp.mx, mtmp.my))
            await pline(`${Monnam(mtmp)} gets angry!`);
    } else {
        await growl(mtmp);
    }

    /* attacking your own quest leader will anger his or her guardians */
    if (mtmp.data === mons[game.urole.ldrnum]) /* quest_info(MS_LEADER) */
        throw new Error('setmangry(): qst_guardians_respond() not ported yet');

    /* make other peaceful monsters react */
    if (!game.context.mon_moving)
        await peacefuls_respond(mtmp);
}

// C ref: mon.c wakeup()
/* wake up a monster, possibly making it angry in the process */
export async function wakeup(mtmp, via_attack) {
    const was_sleeping = mtmp.msleeping;

    await wake_msg(mtmp, via_attack);
    mtmp.msleeping = 0;
    if ((mtmp.m_ap_type || 0) !== M_AP_NOTHING) {
        /* mimics come out of hiding, but disguised Wizard doesn't
           have to lose his disguise */
        if (mtmp.m_ap_type !== M_AP_MONSTER)
            seemimic(mtmp);
    } else if (game.context.forcefight && !game.context.mon_moving
               && mtmp.mundetected) {
        mtmp.mundetected = 0;
        newsym(mtmp.mx, mtmp.my);
    }
    finish_meating(mtmp);
    if (via_attack) {
        const was_peaceful = mtmp.mpeaceful;

        if (was_sleeping)
            await growl(mtmp);
        await setmangry(mtmp, true);
        if (was_peaceful) {
            if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE).length)
                throw new Error('wakeup(): ghod_hitsu() not ported yet');
            if (mtmp.isshk && !(game.u.ushops && game.u.ushops.length))
                throw new Error('wakeup(): hot_pursuit() not ported yet');
        }
    }
}

/* C ref: mondata.h completelyburns(), completelyrusts(), completelyrots() */
export function completelyburns(ptr) {
    return ptr === mons[PM_PAPER_GOLEM] || ptr === mons[PM_STRAW_GOLEM];
}
export function completelyrusts(ptr) { return ptr === mons[PM_IRON_GOLEM]; }
export function completelyrots(ptr) {
    return ptr === mons[PM_WOOD_GOLEM] || ptr === mons[PM_LEATHER_GOLEM];
}

/* C ref: mondata.h is_clinger() */
function is_clinger(ptr) { return (ptr.mflags1 & MM.M1_CLING) !== 0; }

// C ref: mon.c minliquid()
/* check mtmp and water/lava for compatibility, 0 (survived), 1 (died) */
export async function minliquid(mtmp) {
    let res;

    /* set up flag for mondead() and xkilled() */
    game.sad_feeling = (mtmp.mtame && !canseemon(mtmp));
    res = await minliquid_core(mtmp);
    /* always clear the flag */
    game.sad_feeling = false;
    return res;
}

// C ref: mon.c minliquid_core()
/* guts of minliquid() */
async function minliquid_core(mtmp) {
    let inpool, inlava, infountain;
    const u = game.u;
    const waterwall = isok(mtmp.mx, mtmp.my)
                      && IS_WATERWALL(game.level.at(mtmp.mx, mtmp.my).typ);
    const ptr = mtmp.data;
    const uhas = (p) => !!(u.uprops[p]?.intrinsic || u.uprops[p]?.extrinsic);

    /* [ceiling clingers are handled below] */
    inpool = (is_pool(mtmp.mx, mtmp.my)
              && (!(is_flyer(ptr) || is_floater(ptr))
                  /* there's no "above the surface" on the plane of water */
                  || Is_waterlevel(u.uz)));
    inlava = (is_lava(mtmp.mx, mtmp.my)
              && !(is_flyer(ptr) || is_floater(ptr)));
    infountain = (game.level.at(mtmp.mx, mtmp.my).typ === FOUNTAIN);

    /* Flying and levitation keeps our steed out of the liquid
       (but not water-walking or swimming; note: if hero is in a
       water location on the Plane of Water, flight and levitating
       are blocked so this (Flying || Levitation) test fails there
       and steed will be subject to water effects, as intended) */
    if (mtmp === u.usteed && (uhas(FLYING) || uhas(LEVITATION)) && !waterwall)
        return 0;

    /* Gremlin multiplying won't go on forever since the hit points
     * keep going down, and when it gets to 1 hit point the clone
     * function will fail.
     */
    if (ptr === mons[MM.PM_GREMLIN] && (inpool || infountain) && rn2(3)) {
        throw new Error('minliquid(): split_mon() not ported yet');
    } else if (ptr === mons[MM.PM_IRON_GOLEM] && inpool && !rn2(5)) {
        const dam = d(2, 6);

        if (cansee(mtmp.mx, mtmp.my))
            await pline(`${Monnam(mtmp)} rusts.`); /* pline_mon() */
        mtmp.mhp -= dam;
        if (mtmp.mhpmax > dam)
            mtmp.mhpmax -= dam;
        if (DEADMONSTER(mtmp)) {
            await mondied(mtmp);
            if (DEADMONSTER(mtmp))
                return 1;
        }
        /* water_damage_chain(mtmp->minvent, FALSE) */
        if (mtmp.minvent?.length)
            throw new Error('minliquid(): water_damage_chain() not ported yet');
        return 0;
    }

    if (inlava) {
        /*
         * Lava effects much as water effects. Lava likers are able to
         * protect their stuff. Fire resistant monsters can only protect
         * themselves  --ALI
         */
        if (!is_clinger(ptr)
            && !(ptr === mons[PM_FIRE_ELEMENTAL] || ptr === mons[PM_SALAMANDER])) {
            /* !likes_lava() */
            /* not fair...?  hero doesn't automatically teleport away
               from lava, just from water */
            if (can_teleport(ptr) && !(await tele_restrict(mtmp))) {
                if (await rloc(mtmp, RLOC_MSG))
                    return 0;
            }
            if (!resists_fire(mtmp)) {
                if (cansee(mtmp.mx, mtmp.my)) {
                    const dummy = ptr.mattk[0];
                    const how = on_fire(ptr, dummy);

                    await pline(`${Monnam(mtmp)} ${how === "boiling" ? "boils away"
                                 : how === "melting" ? "melts away"
                                   : "burns to a crisp"}.`); /* pline_mon() */
                }
                /* unlike fire -> melt ice -> pool, there's no way for the
                   hero to create lava beneath a monster, so the !mon_moving
                   case is not expected to happen */
                if (game.context.mon_moving)
                    await mondead(mtmp); /* no corpse */
                else
                    await xkilled(mtmp, XKILL_NOMSG);
            } else {
                mtmp.mhp -= 1;
                if (DEADMONSTER(mtmp)) {
                    if (cansee(mtmp.mx, mtmp.my)) /* pline_mon() */
                        await pline(`${Monnam(mtmp)} surrenders to the fire.`);
                    await mondead(mtmp); /* no corpse */
                } else if (cansee(mtmp.mx, mtmp.my)) {
                    await pline(`${Monnam(mtmp)} burns slightly.`);
                }
            }
            if (!DEADMONSTER(mtmp)) {
                if (m_in_air(mtmp)) {
                    ; /* vampshifter in wolf form can revert to vampire lord
                       * and become a flyer so not need to teleport */
                } else {
                    /* (likes_lava case is hypothetical) */
                    throw new Error('minliquid(): fire_damage_chain() not ported yet');
                }
                return 0;
            }
            return 1;
        }
    } else if (inpool || waterwall) {
        /* Most monsters drown in pools.  flooreffects() will take care of
         * water damage to dead monsters' inventory, but survivors need to
         * be handled here.  Swimmers are able to protect their stuff...
         */
        if ((waterwall || !is_clinger(ptr))
            /* !cant_drown(): is_swimmer() || amphibious() || breathless() */
            && !(is_swimmer(ptr) || (ptr.mflags1 & MM.M1_AMPHIBIOUS) !== 0
                 || (ptr.mflags1 & MM.M1_BREATHLESS) !== 0)) {
            /* like hero with teleport intrinsic or spell, teleport away
               if possible */
            if (can_teleport(ptr) && !(await tele_restrict(mtmp))) {
                if (await rloc(mtmp, RLOC_MSG))
                    return 0;
            }
            if (cansee(mtmp.mx, mtmp.my)) {
                if (game.context.mon_moving)
                    await pline(`${Monnam(mtmp)} drowns.`); /* pline_mon() */
                else
                    /* hero used fire to melt ice that monster was on */
                    await pline(`You drown ${mon_nam(mtmp)}.`);
            }
            if (u.ustuck === mtmp && u.uswallow) { /* engulfing_u() */
                /* This can happen after a purple worm plucks you off a
                   flying steed while you are over water. */
                throw new Error('minliquid(): engulfer sinking not ported yet');
            }
            if (game.context.mon_moving)
                await mondied(mtmp); /* ok to leave corpse despite water */
            else
                await xkilled(mtmp, XKILL_NOMSG);
            if (!DEADMONSTER(mtmp)) {
                /* lifesaved: m_in_air(), water_damage_chain(), rloc(),
                   deal_with_overcrowding() */
                throw new Error('minliquid(): lifesaved drowning monster not ported yet');
            }
            return 1;
        }
    } else {
        /* but eels have a difficult time outside */
        if (ptr.mlet === S_EEL && !Is_waterlevel(u.uz)
            && !((ptr.mflags1 & MM.M1_BREATHLESS) !== 0)) {
            /* as mhp gets lower, the rate of further loss slows down */
            if (mtmp.mhp > 1 && rn2(mtmp.mhp) > rn2(8))
                mtmp.mhp--;
            await monflee(mtmp, 2, false, false);
        }
    }
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
    if (mtmp.isgd && !mtmp.mx && !((mtmp.mstate || 0) & MON_MIGRATING))
        throw new Error('movemon_singlemon(): gd_move() not ported yet');
    if (DEADMONSTER(mtmp))
        return false;

    /* monster isn't on this map anymore */
    if (mtmp.mstate) /* mon_offmap(): mstate != MON_FLOOR */
        return false;

    await m_everyturn_effect(mtmp);

    /* Find a monster that we have not treated yet. */
    if (mtmp.movement < NORMAL_SPEED)
        return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED)
        game.somebody_can_move = true;

    if (game.vision_full_recalc)
        vision_recalc(0); /* vision! */

    /* reset obj bypasses before next monster moves */
    if (game.context.bypasses)
        clear_bypasses();
    /* clear_splitobjs(): not ported yet */
    if (await minliquid(mtmp))
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
        /* unwatched mimics and piercers may hide again  [MRS] */
        if (restrap(mtmp))
            return false;
        if (mtmp.m_ap_type === M_AP_FURNITURE
            || mtmp.m_ap_type === M_AP_OBJECT)
            return false;
        if (mtmp.mundetected)
            return false;
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
    /* reset obj bypasses after last monster has moved */
    if (game.context.bypasses)
        clear_bypasses();
    /* clear_splitobjs(): not ported yet */
    /* remove dead monsters */
    dmonsfree();

    /* a monster may have levteleported player -dlc */
    if (game.u.utotype) {
        await deferred_goto();
        /* changed levels, so these monsters are dormant */
        game.somebody_can_move = false;
    }

    return game.somebody_can_move;
}

// ── C ref: mon.c dmonsfree() ──
// really free dead monsters
export function dmonsfree() {
    let prev = null;
    for (let m = game.fmon; m; m = m.nmon) {
        if (DEADMONSTER(m) && !m.isgd) {
            if (prev) prev.nmon = m.nmon; else game.fmon = m.nmon;
        } else prev = m;
    }
}

/* mondata.h */
function polyok(ptr) { return (ptr.mflags2 & MM.M2_NOPOLY) === 0; }
function humanoid(ptr) { return (ptr.mflags1 & MM.M1_HUMANOID) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & MM.M1_ANIMAL) !== 0; }

// C ref: mon.c mon_animal_list()
export function mon_animal_list(construct) {
    if (construct) {
        const animal_temp = [];
        let i, n;

        /* if (animal_list) impossible("animal_list already exists"); */

        for (n = 0, i = LOW_PM; i < SPECIAL_PM; i++)
            if (is_animal(mons[i]))
                animal_temp[n++] = i;
        /* if (n == 0) animal_temp[n++] = NON_PM; */

        game.animal_list = animal_temp.slice(0, n);
        game.animal_list_count = n;
    } else { /* release */
        if (game.animal_list)
            game.animal_list = null;
        game.animal_list_count = 0;
    }
}

// C ref: mon.c pick_animal()
function pick_animal() {
    let res;

    if (!game.animal_list)
        mon_animal_list(true);
    /* assert(ga.animal_list != 0); */
    res = game.animal_list[rn2(game.animal_list_count)];
    /* rogue level should use monsters represented by uppercase letters
       only, but since chameleons aren't generated there (not uppercase!)
       we don't perform a lot of retries */
    if (Is_rogue_level(game.u.uz) && !isupper_monsym(mons[res]))
        res = game.animal_list[rn2(game.animal_list_count)];
    return res;
}
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
            mndx = pick_nasty(mons[MM.PM_ARCHON].difficulty - 1);
        break;
    case MM.PM_DOPPELGANGER:
        if (!rn2(7)) {
            mndx = pick_nasty(mons[MM.PM_JABBERWOCK].difficulty - 1);
        } else if (rn2(3)) { /* role monsters */
            mndx = tt_doppel(mon);
        } else if (!rn2(3)) { /* quest guardians */
            mndx = rn1(MM.PM_APPRENTICE - MM.PM_STUDENT + 1, MM.PM_STUDENT);
            /* avoid own role's guardian */
            if (mndx === game.urole.guardnum)
                mndx = NON_PM;
        } else { /* general humanoids */
            tryct = 5;
            do {
                mndx = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
                /* assert(ismnum(mndx)); */
                if (humanoid(mons[mndx]) && polyok(mons[mndx]))
                    break;
            } while (--tryct > 0);
            if (!tryct)
                mndx = NON_PM;
        }
        break;
    case MM.PM_CHAMELEON:
        if (!rn2(3))
            mndx = pick_animal();
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
export async function decide_to_shapeshift(mon) {
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
        if (await newcham(mon, ptr, NC_SHOW_MSG)) {
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
export async function newcham(mtmp, mdat, ncflags) {
    const gen = newcham_g(mtmp, mdat, ncflags);
    let r;
    while (!(r = gen.next()).done)
        await pline(r.value); /* pline_mon() */
    return r.value;
}
/* newcham() from a synchronous caller (makemon(), level creation), which
   never asks for messages */
export function newcham_sync(mtmp, mdat, ncflags) {
    const r = newcham_g(mtmp, mdat, ncflags).next();
    if (!r.done)
        throw new Error(`newcham(): message from a synchronous caller not ported yet: ${r.value}`);
    return r.value;
}
/* the body of newcham(); yields the messages it gives */
function* newcham_g(mtmp, mdat, ncflags) {
    const polyspot = ((ncflags & NC_VIA_WAND_OR_SPELL) !== 0);
    /* "The oldmon turns into a newmon!" */
    let msg = ((ncflags & NC_SHOW_MSG) !== 0);
    const seenorsensed = canspotmon(mtmp);
    let hpn, hpd, mndx, tryct;
    const olddata = mtmp.data;
    let oldname = '';

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

    if (msg) {
        oldname = /* like YMonnam() but never mention saddle */
            x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE,
                     null, SUPPRESS_SADDLE, false);
        oldname = highc(oldname[0]) + oldname.slice(1);
    }
    /* we need this one whether msg is true or not: l_oldname is only
       used by the engulfing case, which isn't ported yet */

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

    if (mtmp.wormno) { /* throw tail away */
        const mx = mtmp.mx, my = mtmp.my;

        wormgone(mtmp); /* discards tail segments, takes head off the map */
        /* put the head back; it will morph into mtmp's new form */
        place_monster(mtmp, mx, my);
    }
    if ((mtmp.m_ap_type || 0) && mdat.mlet !== MM.S_MIMIC)
        seemimic(mtmp); /* revert to normal monster */

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

    if (mdat === mons[MM.PM_LONG_WORM] && (mtmp.wormno = get_wormno()) !== 0) {
        initworm(mtmp, rn2(5));
        place_worm_tail_randomly(mtmp, mtmp.mx, mtmp.my);
    }

    mtmp.meverseen = 0; /* never seen mon in present shape; newsym() ->
                         * display_monster() may change it right back */
    newsym(mtmp.mx, mtmp.my);

    if (msg) {
        /* oldname is capitalized and might be an assigned name */
        if (!canspotmon(mtmp)) { /* can't see or sense it now */
            if (seenorsensed) /* could see or sense it before */
                yield `${oldname} disappears!`;
            /* (void) */ yield* usmellmon_g(mdat);
        } else if (!seenorsensed) { /* couldn't see/sense before, can now */
            const mnm = x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_A,
                                 null, 0, false);

            yield `${highc(mnm[0]) + mnm.slice(1)} appears!`; /* upstart() */
        } else { /* saw/sensed it before, still see/sense it now */
            yield `${oldname} turns into ${
                /* "a <monster type>" even if it has a name assigned */
                noname_monnam(mtmp, ARTICLE_A)}!`;
        }
    }

    /* when polymorph trap/wand/potion produces a vampire, turn in into
       a full-fledged vampshifter unless shape-changing is blocked */
    if (mtmp.cham === NON_PM && mdat.mlet === MM.S_VAMPIRE
        /* && !Protection_from_shape_changers */)
        mtmp.cham = pm_to_cham(monsndx(mdat));

    /* possibly_unwield(mtmp, polyspot): might lose use of weapon */
    if (mtmp.mw)
        throw new Error('newcham(): possibly_unwield() not ported yet');
    mon_break_armor(mtmp, polyspot);
    /* mselftouch(): only matters for a monster wielding a cockatrice
       corpse (no weapon here) */
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
// C ref: mon.c usmellmon()
export async function usmellmon(mdat) {
    const gen = usmellmon_g(mdat);
    let r;
    while (!(r = gen.next()).done)
        await pline(r.value);
    return r.value;
}
/* the body of usmellmon(); yields the messages it gives */
function* usmellmon_g(mdat) {
    let mndx;
    let nonspecific = false;
    let msg_given = false;
    const u = game.u;

    if (mdat) {
        if (!olfaction(game.youmonst.data))
            return false;
        mndx = monsndx(mdat);
        switch (mndx) {
        case MM.PM_ROTHE:
        case MM.PM_MINOTAUR:
            yield "You notice a bovine smell.";
            msg_given = true;
            break;
        case MM.PM_CAVE_DWELLER:
        case MM.PM_BARBARIAN:
        case MM.PM_NEANDERTHAL:
            yield "You smell body odor.";
            msg_given = true;
            break;
        case MM.PM_HORNED_DEVIL:
        case MM.PM_BALROG:
        case MM.PM_ASMODEUS:
        case MM.PM_DISPATER:
        case MM.PM_YEENOGHU:
        case MM.PM_ORCUS:
            break;
        case MM.PM_HUMAN_WEREJACKAL:
        case MM.PM_HUMAN_WERERAT:
        case MM.PM_HUMAN_WEREWOLF:
        case MM.PM_WEREJACKAL:
        case MM.PM_WERERAT:
        case MM.PM_WEREWOLF:
        case MM.PM_OWLBEAR:
            yield "You detect an odor reminiscent of an animal's den.";
            msg_given = true;
            break;
        case MM.PM_STEAM_VORTEX:
            yield "You smell steam.";
            msg_given = true;
            break;
        case MM.PM_GREEN_SLIME:
            yield "Something stinks.";
            msg_given = true;
            break;
        case MM.PM_VIOLET_FUNGUS:
        case MM.PM_SHRIEKER:
            yield "You smell mushrooms.";
            msg_given = true;
            break;
        /* These are here to avoid triggering the
           nonspecific treatment through the default case below*/
        case MM.PM_WHITE_UNICORN:
        case MM.PM_GRAY_UNICORN:
        case MM.PM_BLACK_UNICORN:
        case MM.PM_JELLYFISH:
            break;
        default:
            nonspecific = true;
            break;
        }

        if (nonspecific)
            switch (mdat.mlet) {
            case MM.S_DOG:
                yield "You notice a dog smell.";
                msg_given = true;
                break;
            case MM.S_DRAGON:
                yield "You smell a dragon!";
                msg_given = true;
                break;
            case MM.S_FUNGUS:
                yield "Something smells moldy.";
                msg_given = true;
                break;
            case MM.S_UNICORN:
                yield `You detect a${(mndx === MM.PM_PONY) ? "n" : " strong"} odor reminiscent of a stable.`;
                msg_given = true;
                break;
            case MM.S_ZOMBIE:
                yield "You smell rotting flesh.";
                msg_given = true;
                break;
            case MM.S_EEL:
                yield "You smell fish.";
                msg_given = true;
                break;
            case MM.S_ORC:
                /* maybe_polyd(is_orc(youmonst.data), Race_if(PM_ORC)) */
                if ((u.umonnum !== u.umonster) ? is_orc(game.youmonst.data)
                                                : game.urace.mnum === MM.PM_ORC)
                    yield "You notice an attractive smell.";
                else
                    yield "A foul stench makes you feel a little nauseated.";
                msg_given = true;
                break;
            default:
                break;
            }
    }
    return msg_given ? true : false;
}

// C ref: mon.c check_gear_next_turn()
/* setting misc_worn_check's I_SPECIAL bit flags a monster to reassess
   and potentially re-equip gear at the start of its next move */
export function check_gear_next_turn(mon) {
    mon.misc_worn_check = (mon.misc_worn_check || 0) | I_SPECIAL;
}

// C ref: mon.c wake_msg()
export async function wake_msg(mtmp, interesting) {
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
export function passes_bars(mptr) {
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

/* C ref: obj.h is_pick() */
function is_pick(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
            && objects[otmp.otyp].oc_skill === P_PICK_AXE);
}
/* C ref: obj.h is_axe() */
function is_axe(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
            && objects[otmp.otyp].oc_skill === P_AXE);
}
/* C ref: hack.c may_dig() */
function may_dig(x, y) {
    const lev = game.level.at(x, y);
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && ((lev.wall_info ?? 0) & W_NONDIGGABLE));
}
/* C ref: hack.c bad_rock() */
export function bad_rock(mdat, x, y) {
    return ((game.level.flags.sokoban_rules && sobj_at(BOULDER, x, y))
            || (IS_OBSTRUCTED(game.level.at(x, y).typ)
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

    /* lugging too much junk? */
    const amt = curr_mon_load(mon);
    if (amt > WT_TOOMUCH_DIAGONAL)
        return 2;

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
        /* no displacing trapped monsters or multi-location longworms */
        && !mdef.mtrapped && (!mdef.wormno || !count_wsegs(mdef))
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
    let rockok = false, treeok = false;

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
    let thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);
    const poisongas_ok = (m_poisongas_ok(mon) === M_POISONGAS_OK);
    const gas_glyph = cmap_to_glyph(S_poisoncloud);
    const gas_reg0 = visible_region_at(x, y);
    const in_poisongas = (gas_reg0 != null && gas_reg0.glyph === gas_glyph);

    if (flag & ALLOW_DIG) {
        let mw_tmp;

        /* need to be specific about what can currently be dug */
        if (!needspick(mdat)) {
            rockok = treeok = true;
        } else if ((mw_tmp = mon.mw) /* MON_WEP(mon) */ && mw_tmp.cursed
                   && mon.weapon_check === NO_WEAPON_WANTED) {
            rockok = is_pick(mw_tmp);
            treeok = is_axe(mw_tmp);
        } else {
            rockok = !!(m_carrying(mon, PICK_AXE)
                        || (m_carrying(mon, DWARVISH_MATTOCK)
                            && !which_armor(mon, W_ARMS)));
            treeok = !!(m_carrying(mon, AXE) || (m_carrying(mon, BATTLE_AXE)
                                                 && !which_armor(mon, W_ARMS)));
        }
        if (rockok || treeok)
            thrudoor = true;
    }

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
                /* intelligent peacefuls avoid digging shop/temple walls */
                if (IS_OBSTRUCTED(ntyp) && rockok
                    && !((mdat.mflags1 & M1_MINDLESS) !== 0) /* mindless() */
                    && (mon.mpeaceful || mon.mtame)
                    && (in_rooms(nx, ny, TEMPLE).length
                        || in_rooms(nx, ny, SHOPBASE).length)
                    && !(in_rooms(x, y, TEMPLE).length
                         || in_rooms(x, y, SHOPBASE).length))
                    continue;
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
                /* avoid poison gas? */
                let gas_reg;
                if (!poisongas_ok && !in_poisongas
                    && (gas_reg = visible_region_at(nx, ny)) != null
                    && gas_reg.glyph === gas_glyph)
                    continue;
                /* first diagonal checks (tight squeezes handled below) */
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && ((lev.at(x, y).doormask ?? 0) & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && ((nloc.doormask ?? 0) & ~D_BROKEN))
                        || ((IS_DOOR(nowtyp) || IS_DOOR(ntyp))
                            && Is_rogue_level(game.u.uz))
                        /* mustn't pass between adjacent long worm segments,
                           but can attack that way */
                        || (m_at(x, ny) && m_at(nx, y) && worm_cross(x, y, nx, ny)
                            && !m_at(nx, ny) && (nx !== game.u.ux || ny !== game.u.uy))))
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
                        if (lev.flags?.has_temple
                            && in_rooms(nx, ny, TEMPLE).length
                            && !in_rooms(x, y, TEMPLE).length
                            && in_your_sanctuary(null, nx, ny)) {
                            if (!(flag & ALLOW_SANCT))
                                continue;
                            info |= ALLOW_SANCT;
                        }
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
        const u = game.u;
        const Upolyd = u.umonnum !== u.umonster;
        const oldhp = Upolyd ? u.mh : u.uhp;
        healup_nocure(amt, 0); /* healup(amt, 0, 0, 0) */
        return (Upolyd ? u.mh : u.uhp) - oldhp;
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

// C ref: mon.c golemeffects()
/* Called when a monster is hit by an elemental attack */
export async function golemeffects(mon, damtype, dam) {
    let heal = 0, slow = 0;

    if (mon.data === mons[PM_FLESH_GOLEM]) {
        if (damtype === AD_ELEC_MN)
            heal = Math.trunc((dam + 5) / 6);
        else if (damtype === AD_FIRE_MN || damtype === AD_COLD_MN)
            slow = 1;
    } else if (mon.data === mons[PM_IRON_GOLEM]) {
        if (damtype === AD_ELEC_MN)
            slow = 1;
        else if (damtype === AD_FIRE_MN)
            heal = dam;
    } else {
        return;
    }
    if (slow) {
        if (mon.mspeed !== MSLOW)
            await mon_adjust_speed_mn(mon, -1, null);
    }
    if (heal) {
        if (healmon(mon, heal, 0)) {
            if (cansee(mon.mx, mon.my))
                await pline(`${Monnam(mon)} seems healthier.`);
        }
    }
}
import { AD_ELEC as AD_ELEC_MN, AD_FIRE as AD_FIRE_MN,
         AD_COLD as AD_COLD_MN } from './monsters.js';
import { mon_adjust_speed as mon_adjust_speed_mn } from './worn.js';

/* C ref: obj.h ofood(), polyfood(), mlevelgain(), mhealup();
   mon.c mstoning(); mondata.h flesh_petrifies() */
function ofood(o) {
    return o.otyp === CORPSE || o.otyp === EGG || o.otyp === TIN;
}
export function polyfood(obj) {
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
    if (otmp === game.uball) {
        await unpunish();
        delobj(otmp);
    } else if (otmp === game.uchain) {
        await unpunish(); /* frees uchain */
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

            await newcham(mtmp, ptr, vis ? NC_SHOW_MSG : NO_NC_FLAGS);
        }
        if (grow) {
            if ((ispet && mtmp.m_lev < mtmp.data.mlevel + 15)
                || !ispet)
                await grow_up(mtmp, null);
        }
        if (mstone)
            throw new Error('m_consume_obj(): monster stoning not ported yet');
        if (heal)
            healmon(mtmp, mtmp.mhpmax, 0);
        if ((eyes || heal) && !mtmp.mcansee)
            await mcureblindness(mtmp, canseemon(mtmp));
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
export async function mon_give_prop(mtmp, prop) {
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

// C ref: mon.c m_poisongas_ok()
/* check whether a monster is tolerant of poison gas */
export function m_poisongas_ok(mtmp) {
    let px, py;
    const is_you = (mtmp === game.youmonst);
    const u = game.u;
    const uhas = (p) => !!(u.uprops[p]?.intrinsic || u.uprops[p]?.extrinsic);
    const breathless = (ptr) => (ptr.mflags1 & MM.M1_BREATHLESS) !== 0;

    /* Non living, non breathing, immune monsters are not concerned */
    if (nonliving(mtmp.data) || is_vampshifter(mtmp)
        || breathless(mtmp.data)
        /* immune_poisongas() */
        || mtmp.data === mons[MM.PM_HEZROU] || mtmp.data === mons[MM.PM_VROCK])
        return M_POISONGAS_OK;
    /* not is_swimmer(); assume that non-fish are swimming on
       the surface and breathing the air above it periodically
       unless located at water spot on plane of water */
    px = is_you ? u.ux : mtmp.mx;
    py = is_you ? u.uy : mtmp.my;
    if ((mtmp.data.mlet === S_EEL || Is_waterlevel(u.uz))
        && is_pool(px, py))
        return M_POISONGAS_OK;
    /* exclude monsters with poison gas breath attack:
       adult green dragon and Chromatic Dragon (and iron golem,
       but nonliving() and breathless() tests also catch that) */
    if (attacktype_fordmg(mtmp.data, MM.AT_BREA, MM.AD_DRST)
        || attacktype_fordmg(mtmp.data, MM.AT_BREA, MM.AD_RBRE))
        return M_POISONGAS_OK;
    if (is_you && (u.uinvulnerable
                   /* Breathless */
                   || uhas(MAGICAL_BREATHING) || breathless(game.youmonst.data)
                   || u.uinwater /* Underwater */))
        return M_POISONGAS_OK;
    if (is_you ? uhas(POISON_RES) : resists_poison(mtmp))
        return M_POISONGAS_MINOR;
    return M_POISONGAS_BAD;
}

// C ref: mon.c hide_monst()
/* monster/hero tries to hide under something at the current location */
export function hide_monst(mon) {
    const hider_under = ((mon.data.mflags1 & MM.M1_CONCEAL) !== 0) /* hides_under() */
                        || mon.data.mlet === MM.S_EEL;

    if (((mon.data.mflags1 & MM.M1_HIDE) !== 0 /* is_hider() */ || hider_under)
        && !(mon.mundetected || mon.m_ap_type)) {
        const x = mon.mx, y = mon.my;
        const save_viz = game.viz_array[y][x];

        /* override vision, forcing hero to be unable to see monster's spot */
        game.viz_array[y][x] &= ~(0x2 /* IN_SIGHT */ | 0x1 /* COULD_SEE */);
        if ((mon.data.mflags1 & MM.M1_HIDE) !== 0) /* is_hider() */
            restrap(mon);
        /* try again if mimic missed its 1/3 chance to hide */
        if (mon.data.mlet === MM.S_MIMIC && !mon.m_ap_type)
            restrap(mon);
        game.viz_array[y][x] = save_viz;
        if (hider_under)
            hideunder(mon);
    }
}

// C ref: mon.c restrap()
/* unwatched hiders may hide again; if so, returns True */
function restrap(mtmp) {
    let t;

    if (mtmp.mcan || mtmp.m_ap_type || cansee(mtmp.mx, mtmp.my)
        || rn2(3) || mtmp === game.u.ustuck
        /* can't hide while trapped except in pits */
        || (mtmp.mtrapped && (t = t_at(mtmp.mx, mtmp.my)) != null
            && !is_pit(t.ttyp))
        /* can't hide on ceiling if there isn't one */
        || (ceiling_hider(mtmp.data) && !has_ceiling(game.u.uz))
        /* won't hide when adjacent to hero */
        || (sensemon(mtmp) && m_next2u(mtmp)))
        return false;

    if (mtmp.data.mlet === MM.S_MIMIC) {
        if (mtmp.msleeping || mtmp.mfrozen) {
        /*
         * The mimic needs to be awake to disguise itself
         * as something else.
         */
            return false;
        }
        set_mimic_sym(mtmp);
        return true;
    } else if (game.level.at(mtmp.mx, mtmp.my).typ === ROOM) {
        mtmp.mundetected = 1;
        return true;
    }

    return false;
}

/* C ref: hack.h m_next2u() */
function m_next2u(mtmp) {
    return dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) < 3;
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

    if (undetected
        && ((((mtmp.data.mflags1 & MM.M1_CONCEAL) !== 0) /* hides_under() */
             && (!OBJ_AT(x, y) || trapped
                 || !can_hide_under_obj(vobj_at(x, y)))) /* level.objects[x][y] */
            || (mtmp.data.mlet === S_EEL && !is_pool(x, y))))
        hideunder(mtmp);
}

// C ref: mon.c angry_guards() -- the town watch turns hostile
export async function angry_guards(silent) {
    const is_watch = ptr => ptr === MM.mons[MM.PM_WATCHMAN]
                            || ptr === MM.mons[MM.PM_WATCH_CAPTAIN];
    /* C ref: hack.h m_next2u() */
    const m_next2u = m => dist2(m.mx, m.my, game.u.ux, game.u.uy) < 3;
    const plur = n => (n === 1 ? "" : "s");
    let ct = 0, nct = 0, sct = 0, slct = 0;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (is_watch(mtmp.data) && mtmp.mpeaceful) {
            ct++;
            if (canspotmon(mtmp) && mtmp.mcanmove) {
                if (m_next2u(mtmp))
                    nct++;
                else
                    sct++;
            }
            if (mtmp.msleeping || mtmp.mfrozen) {
                slct++;
                mtmp.msleeping = mtmp.mfrozen = 0;
            }
            mtmp.mpeaceful = 0;
        }
    }
    if (ct) {
        if (!silent) { /* do we want pline msgs? */
            let buf;

            if (slct) { /* sleeping guard(s) */
                buf = `guard${plur(slct)}`;
                await pline(`The ${buf} ${vtense(buf, "wake")} up.`);
            }

            if (nct) { /* seen/sensed adjacent guard(s) */
                buf = `guard${plur(nct)}`;
                await pline(`The ${buf} ${vtense(buf, "get")} angry!`);
            } else if (sct) { /* seen/sensed non-adjacent guard(s) */
                buf = `guard${plur(sct)}`;
                await pline(`${(sct === 1) ? "An angry" : "Angry"} ${buf} ${
                    vtense(buf, "are")} approaching!`);
            } else {
                buf = (ct === 1) ? "a guard's" : "guards'";
                /* Soundeffect(se_shrill_whistle, 100) */
                await You_hear(`the shrill sound of ${buf} whistle${plur(ct)}.`);
            }
        }
        return true;
    }
    return false;
}
import { d } from './rng.js';
import { pmname } from './do_name.js';
import { There as There_mn } from './display.js';
import { body_part as body_part_mn } from './insight.js';
import { STOMACH as STOMACH_MN, KILLED_BY_AN as KILLED_BY_AN_MN } from './const.js';
import { killer as killer_mn } from './topten.js';
import { losehp as losehp_mn, Maybe_Half_Phys as Maybe_Half_Phys_mn } from './trap.js';
import { mon_explodes } from './explode.js';
import { shkgone } from './shk.js';
