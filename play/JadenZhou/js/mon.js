// mon.js — Monster movement allotment and per-turn monster upkeep.
// C ref: mon.c
//
// Ported so far: mcalcmove(), mcalcdistress(), movemon(), mfndpos(),
// monnear(), mon_allowflags().

import { may_dig } from './dig.js';
import { monhaskey, m_can_break_boulder } from './monmove.js';
import { online2, sgn, plur, NODIAG } from './hacklib.js';
import { game } from './gstate.js';
import { LL_KILLEDPET, LL_UMONST, LL_ACHIEVE, ACH_MEDU,
         has_mgivenname, MGIVENNAME } from './const.js';
import { EXACT_NAME, Mgender } from './do_name.js';
import { record_achievement } from './insight.js';
import { shtypes } from './shknam.js';
import { PM_MEDUSA, PM_HIGH_CLERIC } from './monsters.js';
import { livelog_printf, verbalize, You_hear, You_feel } from './display.js';
import { LL_CONDUCT } from './const.js';
import { remove_worm, wormgone, worm_known, worm_cross, count_wsegs, get_wormno,
         initworm, place_worm_tail_randomly } from './worm.js';
import { healup_nocure } from './potion.js';
import { mcureblindness, mon_has_special } from './muse.js';
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
import { newsym, pline, glyph_is_invisible, unmap_object, shieldeff } from './display.js';
import { m_at, sobj_at, is_pool, is_lava, may_passwall, accessible, nonliving,
         is_golem, closed_door, hideunder, In_endgame, mbirth_limit, newmonhp,
         pm_to_cham } from './makemon.js';
import { is_male, is_female, is_neuter, pm_invisible, humanoid, is_animal,
         throws_rocks, verysmall, bigmonst, slithy, amorphous, is_whirly,
         unique_corpstat, always_hostile, is_clinger, polyok, notake, has_head,
         tunnels, needspick, is_unicorn, is_vampire, is_rider, flesh_petrifies,
         is_mplayer, is_placeholder, resist_conflict, is_watch,
         breathless } from './mondata.js';
import { set_mon_data, emits_light } from './mondata.js';
import { new_light_source, del_light_source, any_light_source } from './light.js';
import { LS_MONSTER } from './const.js';
import { Monnam, noit_mon_nam } from './do_name.js';
import { m_dowear, which_armor, mon_break_armor_g, worn_pline } from './worn.js';
import {
    MS_NEMESIS, AT_BOOM, G_FREQ, AD_RBRE, AD_DCAY, AD_DGST, AD_FIRE,
    PM_LIZARD, PM_VLAD_THE_IMPALER, PM_WEREJACKAL, PM_HUMAN_WEREJACKAL,
    PM_WEREWOLF, PM_HUMAN_WEREWOLF, PM_WERERAT, PM_HUMAN_WERERAT,
    PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_IRON_GOLEM, PM_WOOD_GOLEM,
    PM_LEATHER_GOLEM, PM_STEAM_VORTEX, S_KOP,
} from './monsters.js';
import { t_at, TRAPNUM, fixed_tele_trap, m_harmless_trap, fire_damage_chain,
         water_damage_chain as water_damage_chain_mn } from './trap.js';
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
import { BOULDER, CLOVE_OF_GARLIC, CREDIT_CARD, SKELETON_KEY, LOCK_PICK, EGG,
         CORPSE, AMULET_OF_LIFE_SAVING, GRAY_DRAGON_SCALES,
         YELLOW_DRAGON_SCALES, GRAY_DRAGON_SCALE_MAIL,
         YELLOW_DRAGON_SCALE_MAIL, TIN, GLOB_OF_GREEN_SLIME, CARROT, ICE_BOX,
         objects, is_pick, is_axe } from './objects.js';
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
import { curr_mon_load, finish_meating } from './dogmove.js';
import { can_hide_under_obj, set_mimic_sym, hideunder_async } from './makemon.js';
import { vobj_at } from './display.js';
import { ceiling_hider } from './engrave.js';
import { has_ceiling } from './insight.js';
import { M_AP_FURNITURE, M_AP_OBJECT, ROOM } from './const.js';
import { dead_species } from './mkobj.js';
import { kill_egg, peek_timer, stop_timer, start_timer, obj_to_any,
         monst_to_any } from './timeout.js';
import { ZOMBIFY_MON, TIMER_OBJECT } from './const.js';
import { relobj, thiefdead, mdrop_special_objs, discard_minvent } from './steal.js';
import { dochugw, onscary, mon_regen, m_everyturn_effect,
         mon_track_clear, monflee,
         set_apparxy as set_apparxy_mn } from './monmove.js';
import { tele_restrict, rloc } from './teleport.js';
import { can_teleport, resists_fire } from './mondata.js';
import { on_fire } from './uhitm.js';
import { m_in_air, can_fog } from './monmove.js';
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
import { canspotmon, see_monsters } from './display.js';
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
import { growl, maybe_gasp } from './sounds.js';
import { PLNMSG_GROWL } from './const.js';
import { little_to_big } from './mondata.js';
import { quest_info } from './questpgr.js';
import { is_lightblocker_mappear, does_block, unblock_point,
         couldsee } from './vision.js';
import { M1_HUMANOID } from './monsters.js';
import { vtense, The, distant_name, xname } from './objnam.js';
import { removed_from_icebox } from './pickup.js';
import { mpickobj } from './steal.js';
import { surface } from './iactions.js';
import { sengr_at } from './makemon.js';
import { del_engr_at } from './engrave.js';
import { m_canseeu } from './monmove.js';
import { fightm } from './mhitm.js';
import { BOLT_LIM as BOLT_LIM_mn } from './const.js';
import { in_rooms, spoteffects } from './hack.js';
import { in_your_sanctuary } from './priest.js';
import { nemdead, leaddead, nemesis_stinks } from './quest.js';
import { stinky_nemesis } from './questpgr.js';
import { Hallucination, Conflict, Deaf } from './youprop.js';
import { m_next2u } from './const.js';
import { uhis, unstuck } from './mhitu.js';
import { obj_extract_self } from './mkobj.js';
import { possibly_unwield } from './weapon.js';
import { split_mon } from './potion.js';
import { hot_pursuit } from './shk.js';
import { safe_oname } from './do_name.js';
import { artifact_exists } from './artifact.js';
import { DISMOUNT_GENERIC, EXPL_FIERY } from './const.js';
import { dismount_steed } from './steed.js';
import { bury_an_obj } from './dig.js';
import { dryup } from './fountain.js';
import { explode } from './explode.js';
import { p_coaligned } from './priest.js';
import { A_NONE } from './const.js';
import { AD_ELEC as AD_ELEC_MN, AD_FIRE as AD_FIRE_MN,
         AD_COLD as AD_COLD_MN } from './monsters.js';
import { mon_adjust_speed as mon_adjust_speed_mn } from './worn.js';
import { d } from './rng.js';
import { pmname } from './do_name.js';
import { There as There_mn } from './display.js';
import { body_part as body_part_mn } from './insight.js';
import { STOMACH as STOMACH_MN, KILLED_BY_AN as KILLED_BY_AN_MN } from './const.js';
import { killer as killer_mn } from './topten.js';
import { losehp as losehp_mn, Maybe_Half_Phys as Maybe_Half_Phys_mn } from './trap.js';
import { mon_explodes } from './explode.js';
import { shkgone } from './shk.js';
import { gd_move } from './vault.js';
import { rloc_to as rloc_to_mn } from './teleport.js';
import { place_wsegs as place_wsegs_rm } from './worm.js';
import { set_ustuck as set_ustuck_rm } from './uhitm.js';
import { m_carrying } from './mthrowu.js';
import { extract_from_minvent } from './steal.js';
import { obj_resists } from './dogmove.js';
import { end_burn } from './timeout.js';
import { add_to_container, weight } from './mkobj.js';
import { digests } from './mondata.js';
import { You } from './display.js';
import { u_locomotion } from './trap.js';
import { STATUE, ROCK } from './objects.js';
import { MZ_TINY, PM_STONE_GOLEM, S_GOLEM, MR_STONE } from './monsters.js';
import { CORPSTAT_HISTORIC } from './const.js';
import { a_monnam } from './do_name.js';
import { an } from './objnam.js';
import { impossible } from './hack.js';
import { POTION_CLASS } from './objects.js';

/* monster inventory: makemon.js keeps mon->minvent as an array in pickup
   order; C prepends, so walk it newest first */
export function minv(mon) { return (mon.minvent || []).slice().reverse(); }

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
export function DEADMONSTER(mon) { return mon.mhp < 1; }

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

// C ref: mon.c mon_leaving_level()
// unstuck() is async (docrt() after an engulfer lets go), so when 'mon' is
// holding or engulfing the hero this returns a promise that the async caller
// (m_detach() for a death) awaits; otherwise it runs synchronously, which
// keeps the level-creation callers of mongone()/relmon() synchronous.
function mon_leaving_level(mon) {
    const mx = mon.mx, my = mon.my;
    const lst = game.level.monsters || [];
    const i = lst.indexOf(mon);
    const onmap = (isok(mx, my) && i >= 0);

    /* to prevent an infinite relobj-flooreffects-hmon-killed loop */
    mon.mtrapped = 0;

    const leave_map = () => {
        if (onmap) {
            if (mon.wormno)
                remove_worm(mon);
            else
                lst.splice(lst.indexOf(mon), 1); /* remove_monster(mx, my) */
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
        /* if mon is a remembered target, forget it since it isn't here anymore */
        if (game.context?.polearm && mon === game.context.polearm.hitmon)
            game.context.polearm.hitmon = null;
    };

    if (game.u.ustuck === mon) {
        return (async () => {
            await unstuck(mon); /* mon is not swallowing or holding you nor held by you */
            leave_map();
        })();
    }
    leave_map();
    return undefined;
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

// C ref: mon.c replmon()
/* replace a non-shopkeeper monster with another one */
export function replmon(mtmp, mtmp2) {
    const u = game.u;

    /* transfer the monster's inventory (minvent is an array here) */
    for (const otmp of mtmp2.minvent || []) {
        if (otmp.where !== 'OBJ_MINVENT' || otmp.ocarry !== mtmp)
            console.error('impossible: replmon: minvent inconsistency');
        otmp.ocarry = mtmp2;
    }
    mtmp.minvent = null;
    /* before relmon(mtmp), because it could clear polearm.hitmon */
    if (game.context?.polearm?.hitmon === mtmp)
        game.context.polearm.hitmon = mtmp2;

    /* remove the old monster from the map and from `fmon' list */
    relmon(mtmp, null);

    /* finish adding its replacement */
    if (mtmp !== u.usteed) /* don't place steed onto the map */
        place_monster(mtmp2, mtmp2.mx, mtmp2.my);
    if (mtmp2.wormno)      /* update level.monsters[wseg->wx][wseg->wy] */
        place_wsegs_rm(mtmp2, mtmp); /* locations to mtmp2 not mtmp. */
    if (emits_light(mtmp2.data)) {
        /* since this is so rare, we don't have any `mon_move_light_source' */
        new_light_source(mtmp2.mx, mtmp2.my, emits_light(mtmp2.data),
                         LS_MONSTER, monst_to_any(mtmp2));
        /* here we rely on fact that `mtmp' hasn't actually been deleted */
        del_light_source(LS_MONSTER, monst_to_any(mtmp));
    }
    mtmp2.nmon = game.fmon;
    game.fmon = mtmp2;
    if (u.ustuck === mtmp)
        set_ustuck_rm(mtmp2);
    if (u.usteed === mtmp)
        u.usteed = mtmp2;
    if (mtmp2.isshk)
        throw new Error('replmon(): replshk() not ported yet');

    /* discard the old monster: dealloc_monst(mtmp) */
}

// C ref: mon.c relmon()
/* remove a monster from the fmon list (and the map); 'list' is the name
   of the game list to put it on ('migrating_mons' or 'mydogs') or null */
export function relmon(mon, list) {
    const g = game;

    if (!g.fmon)
        throw new Error('relmon: no fmon available.'); /* panic() */

    /* take 'mon' off the map */
    if (game.u.ustuck === mon) /* relmon() and its callers are synchronous */
        throw new Error('relmon(): async unstuck() under synchronous relmon() not ported yet');
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

    if (mx > 0 && emits_light(mptr))
        del_light_source(LS_MONSTER, monst_to_any(mtmp));

    if (!due_to_death && game.u.ustuck === mtmp) /* mongone() is synchronous */
        throw new Error('m_detach(): async unstuck() under synchronous mongone() not ported yet');
    /* a promise only when mtmp holds or engulfs the hero (unstuck()) */
    const leaving = mon_leaving_level(mtmp);

    const after_leaving = () => {
        mtmp.mhp = 0; /* simplify some tests: force mhp to 0 */
        if (mtmp.iswiz)
            throw new Error('m_detach(): wizdeadorgone() not ported yet');
    };

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
    };

    /* foodead() might give quest feedback for foo having died; skip that
       if we're called for mongone() rather than mondead(); saving bones
       or wizard mode genocide of "*" can result in special monsters going
       away without having been killed */
    if (due_to_death) {
        return (async () => {
            if (leaving)
                await leaving;
            after_leaving();
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
            if (mtmp === game.u.usteed)
                await dismount_steed(DISMOUNT_GENERIC);
        })();
    }
    after_leaving();
    after_relobj();
    if (mtmp === game.u.usteed) /* mongone() is synchronous */
        throw new Error('m_detach(): async dismount_steed() under synchronous mongone() not ported yet');
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

    /* achievement and/or livelog */
    logdeadmon(mtmp, mndx);

    if (glyph_is_invisible(game.level.at(mtmp.mx, mtmp.my).remembered_glyph))
        unmap_object(mtmp.mx, mtmp.my);

    /* remove 'mtmp' from play; it will stay on the fmon list until end of
       current move, then dmonsfree() will get rid of it */
    await m_detach(mtmp, mptr, true);
}

// C ref: mon.c monstone()
/* drop (perhaps) a cadaver and remove monster */
export async function monstone(mdef) {
    let otmp, obj;
    const oldminvent = []; /* C's oldminvent chain; [0] is its head */
    const x = mdef.mx, y = mdef.my;
    let wasinside = false;

    /* vampshifter reverts to vampire;
       3.6.3: also used to unshift shape-changed sandestin */
    if (!(await vamp_stone(mdef)))
        return;

    /* we have to make the statue before calling mondead, to be able to
     * put inventory in it, and we have to check for lifesaving before
     * making the statue....
     */
    mdef.mhp = 0; /* in case caller hasn't done this */
    lifesaved_monster(mdef);
    if (!DEADMONSTER(mdef))
        return;

    mdef.mtrapped = 0; /* (see m_detach) */

    if (mdef.data.msize > MZ_TINY
        || !rn2(2 + ((mdef.data.geno & G_FREQ) > 2 ? 1 : 0))) {
        let corpstatflags = CORPSTAT_NONE;

        /* some objects may end up outside the statue; C walks
           mdef->minvent from its head, the newest object, which is the
           last element of the JS minvent array */
        while ((obj = (mdef.minvent && mdef.minvent.length)
                      ? mdef.minvent[mdef.minvent.length - 1] : null) !== null) {
            extract_from_minvent(mdef, obj, true, true);
            if (obj.otyp === BOULDER
                /* invocation tools resist even with 0% resistance */
                || obj_resists(obj, 0, 0)) {
                if (await flooreffects(obj, x, y, "fall"))
                    continue;
                place_object(obj, x, y);
            } else {
                if (obj.lamplit)
                    end_burn(obj, true);
                oldminvent.unshift(obj); /* obj->nobj = oldminvent; oldminvent = obj */
            }
        }
        /* defer statue creation until after inventory removal
           so that saved monster traits won't retain any stale
           item-conferred attributes */
        if (mdef.female)
            corpstatflags |= CORPSTAT_FEMALE;
        else if (!is_neuter(mdef.data))
            corpstatflags |= CORPSTAT_MALE;
        /* Archeologists should not break unique statues */
        if (mdef.data.geno & G_UNIQ)
            corpstatflags |= CORPSTAT_HISTORIC;
        otmp = mkcorpstat(STATUE, mdef, mdef.data, x, y, corpstatflags);
        if (has_mgivenname(mdef))
            otmp = oname(otmp, MGIVENNAME(mdef), ONAME_NO_FLAGS);
        for (const cobj of oldminvent)
            add_to_container(otmp, cobj);
        otmp.owt = weight(otmp);
    } else
        otmp = mksobj_at(ROCK, x, y, true, false);

    stackobj(otmp);
    /* mondead() already does this, but we must do it before the newsym */
    if (glyph_is_invisible(game.level.at(x, y).remembered_glyph))
        unmap_object(x, y);
    if (cansee(x, y))
        newsym(x, y);
    /* we don't currently trap the hero in the statue in this case but we
       could */
    if (engulfing_u(mdef))
        wasinside = true;
    await mondead(mdef);
    if (wasinside) {
        if (digests(mdef.data))
            await You(`${u_locomotion("jump")} through an opening in the new ${
                xname(otmp)}.`);
    }
}

// C ref: mon.c set_mon_min_mhpmax()
export function set_mon_min_mhpmax(mon, minimum_mhpmax) {
    /* can't be less than m_lev+1 (if we just used m_lev itself, level 0
       monsters would end up allowing a minimum of 0); since life draining
       reduces m_lev, this usually won't give the monster much of a boost */
    if (mon.mhpmax < mon.m_lev + 1)
        mon.mhpmax = mon.m_lev + 1;
    /* caller can specify an alternate minimum; we'll honor it iff it is
       greater than m_lev+1 */
    if (mon.mhpmax < minimum_mhpmax)
        mon.mhpmax = minimum_mhpmax;
}

// C ref: mon.c mon_to_stone()
/* changes the monster into a stone monster of the same type
   this should only be called when poly_when_stoned() is true */
export async function mon_to_stone(mtmp) {
    if (mtmp.data.mlet === S_GOLEM) {
        /* it's a golem, and not a stone golem */
        if (canseemon(mtmp))
            await pline(`${Monnam(mtmp)} solidifies...`); /* pline_mon() */
        if (await newcham(mtmp, mons[PM_STONE_GOLEM], NO_NC_FLAGS)) {
            if (canseemon(mtmp))
                await pline(`Now it's ${an(pmname(mtmp.data, Mgender(mtmp)))}.`);
        } else {
            if (canseemon(mtmp))
                await pline("... and returns to normal.");
        }
    } else
        impossible(`Can't polystone ${a_monnam(mtmp)}!`);
}

// C ref: mon.c vamp_stone()
export async function vamp_stone(mtmp) {
    if (is_vampshifter(mtmp)) {
        const mndx = mtmp.cham;

        /* this only happens if shapeshifted */
        if (mndx >= LOW_PM && mndx !== monsndx(mtmp.data)
            && !(game.mvitals[mndx].mvflags & G_GENOD))
            throw new Error('vamp_stone(): lapidifying vampshifter not ported yet');
    } else if (ismnum(mtmp.cham)
               && (mons[mtmp.cham].mresists & MR_STONE)) {
        /* sandestins are stoning-immune so if hit by stoning damage
           they revert to innate shape rather than become a statue */
        mtmp.mcanmove = 1;
        mtmp.mfrozen = 0;
        set_mon_min_mhpmax(mtmp, 10); /* mtmp->mhpmax=max(mtmp->m_lev+1,10) */
        mtmp.mhp = mtmp.mhpmax;
        await newcham(mtmp, mons[mtmp.cham], NC_SHOW_MSG);
        newsym(mtmp.mx, mtmp.my);
        return false; /* didn't petrify */
    }
    return true;
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

/* C ref: mondata.h is_reviver() */
function is_reviver(ptr) { return is_rider(ptr) || ptr.mlet === MM.S_TROLL; }

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
            if (burythem) {
                const dealloc = { v: false };

                bury_an_obj(obj, dealloc);
                newsym(x, y);
                return dealloc.v ? null : obj;
            }
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
        if (!u.uconduct.killer++)
            livelog_printf(LL_CONDUCT, "killed for the first time");
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

    if (wasinside && game.thrownobj && game.thrownobj !== game.uball
        /* don't give to mon if missile is going to be destroyed */
        && game.thrownobj.oclass !== POTION_CLASS
        /* don't give to mon if missile is going to return to hero */
        && game.thrownobj !== game.iflags.returning_missile) {
        /* thrown object has killed hero's engulfer; add it to mon's
           inventory now so that it will be placed with mon's other
           stuff prior to lookhere/autopickup when hero is expelled
           below (as a side-effect, this missile has immunity from
           being consumed [for this shot/throw only]) */
        mpickobj(mtmp, game.thrownobj);
        /* let throwing code know that missile has been disposed of */
        game.thrownobj = null;
    }

    game.vamp_rise_msg = false; /* might get set in mondead(); checked below */
    game.disintegested = nocorpse; /* alternate vamp_rise mesg needed if true */
    /* dispose of monster and make cadaver */
    if (game.stoned)
        await monstone(mtmp);
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
                        artifact_exists(otmp, safe_oname(otmp), false,
                                        ONAME_NO_FLAGS);
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

        if (wasinside) {
            /* spoteffects() can end up clearing level of monsters; grab a copy */
            const museum = Object.assign(Object.create(Object.getPrototypeOf(mtmp)), mtmp);
            museum.nmon = null;
            museum.minvent = null;
            museum.mextra = null;
            delete museum.mgivenname; /* JS keeps the given name beside mextra */
            await spoteffects(true); /* poor man's expels() */
            mtmp = museum; /* use the reference copy now */
        }
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
        await You_feel('guilty...');
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
        adjalign((p_coaligned(mtmp)) ? -2 : 2);
        /* cancel divine protection for killing your priest */
        if (p_coaligned(mtmp))
            game.u.ublessed = 0;
        if (mdat.maligntyp === A_NONE)
            adjalign(Math.trunc(ALIGNLIM() / 4)); /* BIG bonus */
    } else if (mtmp.mtame) {
        adjalign(-15); /* bad!! */
        /* your god is mighty displeased... */
        if (!Hallucination()) {
            await You_hear('the rumble of distant thunder...');
        } else {
            await You_hear('the studio audience applaud!');
        }
        if (!((mdat.geno & G_UNIQ) !== 0)) { /* !unique_corpstat(mdat) */
            const mname = has_mgivenname(mtmp);

            livelog_printf(LL_KILLEDPET, `murdered ${mname ? MGIVENNAME(mtmp) : ""}${
                               mname ? ", " : ""}${uhis()} faithful ${pmname(mdat, Mgender(mtmp))}`);
        }
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

            if (humanoid(mon.data) || mon.isshk || mon.ispriest) {
                if (is_watch(mon.data)) {
                    /* SetVoice(mon, 0, 80, 0) */
                    await verbalize("Halt!  You're under arrest!");
                    await angry_guards(!!Deaf());
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
        await You_feel('like a hypocrite.');
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
        if (p_coaligned(mtmp))
            adjalign(-5); /* very bad */
        else
            adjalign(2);
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
                hot_pursuit(mtmp);
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
        if (await split_mon(mtmp, null))
            await dryup(mtmp.mx, mtmp.my, false);
        if (inpool)
            /* water_damage_chain(mtmp->minvent, FALSE): minvent in C's chain
               order (newest first) */
            await water_damage_chain_mn(mtmp.minvent ? mtmp.minvent.slice().reverse()
                                                     : null, false);
        return 0;
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
        /* water_damage_chain(mtmp->minvent, FALSE): minvent in C's chain
           order (newest first) */
        await water_damage_chain_mn(mtmp.minvent ? mtmp.minvent.slice().reverse()
                                                 : null, false);
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
                    /* mtmp->minvent in C's chain order (newest first) */
                    await fire_damage_chain(mtmp.minvent ? mtmp.minvent.slice().reverse()
                                                         : null,
                                            false, false, mtmp.mx, mtmp.my);
                    if (!(await rloc(mtmp, RLOC_MSG)))
                        throw new Error('minliquid(): deal_with_overcrowding() not ported yet');
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
    if (mtmp.isgd && !mtmp.mx && !((mtmp.mstate || 0) & MON_MIGRATING)) {
        /* parked at <0,0>; eventually isgd should get set to false */
        if (game.moves > (mtmp.mlstmv || 0)) {
            await gd_move(mtmp);
            mtmp.mlstmv = game.moves;
        }
        return false;
    }
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
    } else if (mtmp.data.mlet === S_EEL && !mtmp.mundetected
               && (mtmp.mflee || !m_next2u(mtmp))
               && !canseemon(mtmp) && !rn2(4)) {
        /* some eels end up stuck in isolated pools, where they
           can't--or at least won't--move, so they never reach
           their post-move chance to re-hide */
        if (await hideunder_async(mtmp))
            return false;
    }

    /* continue if the monster died fighting */
    if (Conflict() && !mtmp.iswiz && m_canseeu(mtmp)) {
        /* Note:
         *  Conflict does not take effect in the first round.
         *  Therefore, A monster when stepping into the area will
         *  get to swing at you.
         *
         *  The call to fightm() must be _last_.  The monster might
         *  have died if it returns 1.
         */
        if (cansee(mtmp.mx, mtmp.my)
            && (dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy)
                <= BOLT_LIM_mn * BOLT_LIM_mn) /* mdistu() */
            && (await fightm(mtmp)))
            return false; /* mon might have died */
    }
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

    if (any_light_source())
        game.vision_full_recalc = 1; /* in case a mon moved w/ a light source */
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
    game.purge_monsters = 0; /* iflags.purge_monsters = 0 */
}

/* mondata.h */

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
/* C ref: mondata.h ismnum() */
function ismnum(mndx) { return mndx >= LOW_PM && mndx < NUMMONS; }
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
        if (mon_has_special(mon))
            break; /* leave mndx as is */
        wolfchance = 3;
        /*FALLTHRU*/
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
                && closed_door(mon.mx, mon.my)) {
                const new_xy = { x: 0, y: 0 };

                if (enexto(new_xy, mon.mx, mon.my, ptr)) {
                    await rloc_to_mn(mon, new_xy.x, new_xy.y);
                }
            }
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
    let r, v;
    while (!(r = gen.next(v)).done) {
        v = undefined;
        if (r.value?.newcham_async) {
            /* an async callee of newcham(); its result goes back to newcham_g() */
            v = await r.value.newcham_async();
            continue;
        }
        if (r.value === NEWCHAM_MON_MOVING) {
            /* the end of newcham() when a monster is moving: */
            /* old form might not have been affected by Elbereth but
               perhaps the new form is */
            /* give 'mtmp' a new chance to pinpoint hero's location */
            if (!(game.u.ux === mtmp.mux && game.u.uy === mtmp.muy)) /* u_at() */
                set_apparxy_mn(mtmp);
            /* if hero is on Elbereth or scare monster, mtmp in new form
               might become scared */
            if (!mtmp.mpeaceful
                && onscary(mtmp.mux, mtmp.muy, mtmp)
                && monnear(mtmp, mtmp.mux, mtmp.muy))
                await monflee(mtmp, rn1(9, 2), true, true); /* 2..10 turns */
            continue;
        }
        await worn_pline(r.value); /* pline_mon(), or You_hear() */
    }
    return r.value;
}
/* newcham_g() yields this (instead of a message) to have newcham() run
   its final mon_moving step, which may call the async monflee() */
const NEWCHAM_MON_MOVING = { newcham_mon_moving: true };
/* newcham_g() yields { newcham_async: () => promise, what } to have newcham()
   await an async callee (possibly_unwield(), flooreffects()) */
/* newcham() from a synchronous caller (makemon(), level creation), which
   never asks for messages */
export function newcham_sync(mtmp, mdat, ncflags) {
    const gen = newcham_g(mtmp, mdat, ncflags);
    let r;
    while (!(r = gen.next()).done) {
        if (r.value?.newcham_async)
            throw new Error(`newcham(): async ${r.value.what} from a synchronous caller not ported yet`);
        if (r.value === NEWCHAM_MON_MOVING) {
            /* the end of newcham() when a monster is moving (e.g. a level
               made by deferred_goto() from movemon()): */
            /* give 'mtmp' a new chance to pinpoint hero's location */
            if (!(game.u.ux === mtmp.mux && game.u.uy === mtmp.muy)) /* u_at() */
                set_apparxy_mn(mtmp);
            /* if hero is on Elbereth or scare monster, mtmp in new form
               might become scared */
            if (!mtmp.mpeaceful
                && onscary(mtmp.mux, mtmp.muy, mtmp)
                && monnear(mtmp, mtmp.mux, mtmp.muy))
                throw new Error('newcham(): monflee() from a synchronous caller not ported yet');
            continue;
        }
        throw new Error(`newcham(): message from a synchronous caller not ported yet: ${r.value}`);
    }
    return r.value;
}
/* the body of newcham(); yields the messages it gives.  The generator is
   named newcham (an object-literal method, taken out as newcham_g) so that
   js/rng.js credits its roll, rn2(5) for initworm(), to newcham as in C */
const newcham_g = ({ *newcham(mtmp, mdat, ncflags) {
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
    /* we need this one whether msg is true or not (under hallucination
       x_monnam() draws a random name from the display rng); l_oldname is
       only used by the engulfing case, which isn't ported yet */
    const l_oldname = x_monnam(mtmp, ARTICLE_THE, null,
                               has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
                               false);
    void l_oldname;

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

    if (emits_light(olddata) !== emits_light(mtmp.data)) {
        /* used to give light, now doesn't, or vice versa,
           or light's range has changed */
        if (emits_light(olddata))
            del_light_source(LS_MONSTER, monst_to_any(mtmp));
        if (emits_light(mtmp.data))
            new_light_source(mtmp.mx, mtmp.my, emits_light(mtmp.data),
                             LS_MONSTER, monst_to_any(mtmp));
    }
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

    /* possibly_unwield() returns at once without a wielded weapon */
    if (mtmp.mw) /* MON_WEP(mtmp) */
        yield { newcham_async: () => possibly_unwield(mtmp, polyspot), /* might lose use of weapon */
                what: 'possibly_unwield()' };
    yield* mon_break_armor_g(mtmp, polyspot);
    /* mselftouch(): only matters for a monster wielding a cockatrice
       corpse (no weapon here) */
    check_gear_next_turn(mtmp);

    /* former giants can't continue carrying boulders */
    if (mtmp.minvent?.length && !throws_rocks(mdat)) {
        /* DEADMONSTER(): it is possible for flooreffects() to kill mtmp;
           the rest of its inventory would be dropped making otmp2 stale */
        for (const otmp of minv(mtmp)) { /* C's minvent order */
            if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
                break;
            if (otmp.otyp === BOULDER) {
                /* this keeps otmp from being polymorphed in the
                   same zap that the monster that held it is polymorphed */
                if (polyspot)
                    bypass_obj(otmp);
                obj_extract_self(otmp);
                /* probably ought to give some "drop" message here */
                if (yield { newcham_async: () => flooreffects(otmp, mtmp.mx, mtmp.my, ""),
                            what: 'flooreffects()' })
                    continue;
                place_object(otmp, mtmp.mx, mtmp.my);
            }
        }
    }
    if (mtmp === game.u.usteed)
        throw new Error('newcham(): poly_steed() not ported yet');

    /* old form might not have been affected by Elbereth but perhaps the
       new form is */
    if (game.context?.mon_moving)
        yield NEWCHAM_MON_MOVING; /* set_apparxy()/monflee(), in newcham() */

    return 1;
} }).newcham;
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
/* reduce zombification timeout of buried zombies around px, py */
export function disturb_buried_zombies(x, y) {
    let t;

    for (const otmp of [...(game.level.buriedobjlist || [])]) {
        if (otmp.otyp === CORPSE && otmp.timed
            && otmp.ox >= x - 1 && otmp.ox <= x + 1
            && otmp.oy >= y - 1 && otmp.oy <= y + 1
            && (t = peek_timer(ZOMBIFY_MON, obj_to_any(otmp))) > 0) {
            t = stop_timer(ZOMBIFY_MON, obj_to_any(otmp));
            start_timer(Math.max(1, Math.trunc(t * 2 / 3)), TIMER_OBJECT,
                        ZOMBIFY_MON, obj_to_any(otmp));
        }
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

/* mondata.h */

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
    if (Conflict() && !resist_conflict(mtmp))
        allowflags |= ALLOW_U;
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

/* C ref: mon.c monlineu() */
function monlineu(mon, nx, ny) {
    return online2(nx, ny, mon.mux, mon.muy);
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
             || slithy(ptr) || can_fog(mon)))
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
                       engulfed */
                    && !((amorphous(mdat) || can_fog(mon))
                         && !(u.uswallow && u.ustuck === mon)) /* engulfing_u() */
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
export function mstoning(obj) {
    return (ofood(obj) && obj.corpsenm >= LOW_PM && obj.corpsenm < NUMMONS
            && flesh_petrifies(mons[obj.corpsenm]));
}

// C ref: mon.c meatbox()
/* dispose of contents of an eaten container; used for pets and other mons */
export async function meatbox(mon, otmp) {
    const engulf_contents = (mon.data === mons[MM.PM_GELATINOUS_CUBE]);
    const x = mon.mx, y = mon.my;
    let cobj;

    if (!(otmp.cobj && otmp.cobj.length) || !isok(x, y)) /* !Has_contents() */
        return;

    /* contents of eaten containers become engulfed or dropped onto
      the floor; this is arbitrary, but otherwise g-cubes are too
      powerful */
    if (!engulf_contents && cansee(x, y)) {
        await pline(`${s_suffix(The(distant_name(otmp, xname)))} contents spill out onto the ${surface(x, y)}.`);
    }
    while ((cobj = (otmp.cobj && otmp.cobj.length) ? otmp.cobj[0] : null) !== null) {
        obj_extract_self(cobj);
        if (otmp.otyp === ICE_BOX)
            removed_from_icebox(cobj);
        if (engulf_contents) {
            mpickobj(mon, cobj);
        } else {
            if (!await flooreffects(cobj, x, y, ""))
                place_object(cobj, x, y);
        }
    }
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
        await meatbox(mtmp, otmp);
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
            await explode(mtmp.mx, mtmp.my, -11, d(3, 6), 0, EXPL_FIERY);
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

/* C ref: mon.c livelog_mon_nam() -- specific combination of x_monnam
   flags for livelogging; show what was actually killed even when unseen
   or hallucinated to be something else */
function livelog_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null, EXACT_NAME, false);
}

// C ref: mon.c logdeadmon()
/* when a mon has died, maybe record an achievement or issue livelog message;
   moved into separate routine to unclutter mondead() */
function logdeadmon(mtmp, mndx) {
    let howmany = game.mvitals[mndx].died;

    if (mndx === PM_MEDUSA && howmany === 1) {
        record_achievement(ACH_MEDU); /* also generates a livelog event */
    } else if ((((mtmp.data.geno & G_UNIQ) !== 0) /* unique_corpstat() */
                && (mndx !== PM_HIGH_CLERIC || !mtmp.mrevived))
               || (mtmp.isshk && !mtmp.mrevived)) {
        let shkdetail;
        let mkilled;
        const herodidit = !game.context.mon_moving;

        /*
         * livelog event; unique_corpstat() includes the Wizard and
         * any High Priest even though they aren't actually unique.
         *
         * Shopkeeper kills are logged, but only the first time per
         * shopkeeper, since their shared kill counter wouldn't work
         * for this purpose (and it wouldn't account for polymorphed
         * shopkeepers either).
         */
        shkdetail = '';
        if (mtmp.isshk) {
            howmany = 1;
            /* ", the <shoptype> proprietor" needs a trailing comma for
               the alternate phrasing "<shk>, shkdetails, has been killed"
               when hero isn't directly responsible */
            shkdetail = `, the ${shtypes[mtmp.mextra.eshk.shoptype - SHOPBASE].name} ${
                         /* in case shk name doesn't include Mr or Ms honorific */
                         mtmp.female ? "proprietrix" : "proprietor"}${herodidit ? "" : ","}`;
        } else if (mndx === PM_HIGH_CLERIC) {
            /* the high priest[ess] monster is not unique; we know that
               this is the first death for this particular high priest
               (because of the !mtmp->mrevived test above) */
            howmany = 1;
        }

        /* killing a unique more than once doesn't get logged every time;
           the Wizard and the Riders can be killed more than once
           "naturally", others require deliberate player action such as
           use of undead turning to revive a corpse or petrification plus
           stone-to-flesh to create and revive a statue */
        if (howmany <= 3 || howmany === 5 || howmany === 10 || howmany === 25
            || (howmany % 50) === 0) { /* 50, 100, 150, 200, 250 */
            let xtra; /* space for " (Nth time)" when N > 1 */
            let llevent_type = LL_UMONST;

            /* the first kill of any unique monster is a major event;
               all kills of the Wizard and the Riders are major when
               they're logged but they still don't get logged every time */
            if (howmany === 1 || mtmp.iswiz || is_rider(mtmp.data))
                llevent_type |= LL_ACHIEVE;
            xtra = '';
            if (howmany > 1) /* "(2nd time)" or "(50th time)" */
                xtra = ` (${howmany}${ordin_ld(howmany)} time)`;

            mkilled = nonliving(mtmp.data) ? "destroyed" : "killed";
            /* hero is responsible: "killed <monst>" */
            if (herodidit)
                livelog_printf(llevent_type,
                               `${mkilled} ${livelog_mon_nam(mtmp)}${shkdetail}${xtra}`);
            else /* trap, pet, conflict:  "<monst> has been killed" */
                livelog_printf(llevent_type,
                               `${livelog_mon_nam(mtmp)}${shkdetail} has been ${mkilled}${xtra}`);
        }
    }
}

/* C ref: hacklib.c ordin() */
function ordin_ld(n) { /* note: should be non-negative */
    const dd = n % 10;

    return (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1) ? "th"
           : (dd === 1) ? "st" : (dd === 2) ? "nd" : "rd";
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
    /* C ref: hack.h m_next2u() */
    const m_next2u = m => dist2(m.mx, m.my, game.u.ux, game.u.uy) < 3;
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

// C ref: mon.c shieldeff_mon()
export async function shieldeff_mon(mtmp) {
    await shieldeff(mtmp.mx, mtmp.my);
    /* does not depend on seeing the monster; the shield effect is visible */
    if (cansee(mtmp.mx, mtmp.my))
        await pline(`${Monnam(mtmp)} resists!`); /* pline_mon() */
}
