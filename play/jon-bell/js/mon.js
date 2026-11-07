// mon.js — C ref: mon.c.
import { adjalign } from './attrib.js';
import { SetVoice, coord_desc, disturb_buried_zombies, fire_damage_chain, flooreffects_obj_meld, flooreffects_obj_nexto_xy, flooreffects_pudding_merge_message, is_mines_prize as is_mines_prize_real, is_soko_prize as is_soko_prize_real, may_passwall, obj_to_any, set_msg_xy, surface, um_dist, water_damage_chain as water_damage_chain_ml, wizdeadorgone } from './cmd.js';
import { mwelded } from './wield.js';
import { flooreffects } from './do.js';
import { ALLOW_ALL, ALLOW_BARS, ALLOW_DIG, ALLOW_M, ALLOW_MDISP, ALLOW_ROCK, ALLOW_SANCT, ALLOW_SSM, ALLOW_TM, ALLOW_TRAPS, ALLOW_U, ALLOW_WALL, ARTICLE_A, ARTICLE_NONE, ARTICLE_THE, ARTICLE_YOUR, BOLT_LIM, BUSTDOOR, COLNO, CORPSTAT_BURIED, CORPSTAT_FEMALE, CORPSTAT_INIT, CORPSTAT_MALE, CORPSTAT_NONE, CORPSTAT_SPE_VAL, DB_LAVA, DB_MOAT, DB_UNDER, DISMOUNT_GENERIC, DISPLACED, DRAWBRIDGE_UP, D_BROKEN, D_CLOSED, D_LOCKED, EXPL_FIERY, FIRE_RES, FLYING, FOUNTAIN, HATCH_EGG, HEADSTONE, INVIS, IRONBARS, IS_DOOR, IS_OBSTRUCTED, IS_TREE, IS_WATERWALL, In_endgame, Is_earthlevel, Is_juiblex_level, Is_rogue_level, Is_stronghold, Is_waterlevel, LAVAPOOL, LAVAWALL, LEVITATION, LOW_PM, LS_MONSTER, MAGICAL_BREATHING, M_AP_MONSTER, M_AP_NOTHING, M_AP_TYPMASK, HALLUC as MK_HALLUC, INVIS as MK_INVIS, TELEPAT as MK_TELEPAT, MOAT, MON_DETACH, MON_ENDGAME_FREE, MON_FLOOR, M_POISONGAS_BAD, M_POISONGAS_MINOR, M_POISONGAS_OK, NC_SHOW_MSG, NC_VIA_WAND_OR_SPELL, NO_NC_FLAGS, NEED_WEAPON, NOGARLIC, NOTONL, NO_WEAPON_WANTED, OPENDOOR, PLNMSG_GROWL, PLNMSG_HIDE_UNDER, POISON_RES, POOL, RLOC_NOMSG, ROOM, ROWNO, SHOPBASE, STONE, STONE_RES, STRAT_CLOSE, STRAT_WAITFORU, SUPPRESS_SADDLE, TAINT_AGE, TELEP_TRAP, TEMPLE, TRAPNUM, UNLOCKDOOR, Upolyd, WATER, W_AMUL, W_ARM, W_ARMG, W_ARMS, W_NONDIGGABLE, XKILL_NOMSG, engulfing_u, is_pit, ismnum, isok, u_at } from './const.js';
import { bury_an_obj, is_pick } from './dig.js';
import { unpunish } from './read.js';
import { Deaf as Deaf_live, GLYPHCLS_INVIS, canseemon, canspotmon, newsym, sensemon, swallowed, unmap_object } from './display.js';
import { You_feel, You_hear, You_see, pline } from './pline.js';
import { dismount_steed as dismount_steed_mk, mon_leaving_level as mon_leaving_level_mk, newedog, sticks, unstuck as unstuck_mk, wary_dog } from './dog.js';
import { m_unleash as m_unleash_mk } from './apply.js';
import { dmgtype, finish_meating as finish_meating_mk, mon_to_stone, monstone, obj_resists, quickmimic as quickmimic_mk } from './dogmove.js';
import { m_harmless_trap } from './trap.js';
import { obfree } from './dokick.js';
import { delobj as delobj_real } from './invent.js';
import { mon_givit } from './eat.js';
import { more_experienced } from './exper.js';
import { game, wizard } from './gstate.js';
import { dist2, s_suffix as lifesave_s_suffix } from './hacklib.js';
import { ENV } from './hostenv.js';
import { del_light_source, new_light_source } from './light.js';
import { monst_to_any } from './hack.js';
import { is_pool, is_pool_or_lava } from './look.js'; /* C dbridge.c is_pool */
import { closed_door } from './monmove.js';
import { may_dig } from './hack.js';
import { MAXMONNO, attacktype_fordmg, check_gear_next_turn, dmgtype_fromattack, emits_light, grow_up, nonliving as lifesave_nonliving, m_in_air, mbirth_limit, monGeno, mondied as mondied_ml, monflee, name_to_mon as name_to_mon_wf, name_to_monclass as name_to_monclass_wf, newMonHp, newmextra, olfaction, onscary, permonstTemplate, set_mon_data, zombie_maker } from './makemon.js';
import { removed_from_icebox } from './pickup.js';
import { which_armor } from './worn.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import { aggravate as aggravate_real } from './wizard.js';
import { AT_BOOM, AT_EXPL, AT_GAZE, M1_ANIMAL, hliquid as hliquid_ml, is_youmonst, new_mgivenname, noit_mon_nam, noname_monnam, seemimic, update_inventory, x_monnam, y_monnam } from './mhitm.js';
import { growl } from './sounds.js';
import { Resists_Elem, attacktype, big_to_little, little_to_big, locomotion, mon_hates_silver, on_fire as on_fire_ml, poly_when_stoned } from './mondata.js';
import { digests_gu, expels_gu, mon_mattk_raw } from './mhitu.js';
import { AMULET_OF_STRANGULATION, BELL_OF_OPENING, BOULDER, CORPSE, EGG, GLOB_OF_BLACK_PUDDING, GLOB_OF_GREEN_SLIME, G_GENOD, G_NOCORPSE, Has_contents, ICE_BOX, M2_FEMALE, M2_MALE, M2_NEUTER, M2_SHAPESHIFTER, MONS_PMNAMES_ROWS, MONS_ROWS, MON_WEP_nc, MPICKOBJ_AT_ENGL, Monnam, Monnam_wm, NON_PM, PM_ARCHON_NC, PM_BLACK_LIGHT, PM_DEATH_R, PM_DOPPELGANGER_NC, PM_FAMINE, PM_FOG_CLOUD_NC, PM_HUMAN, PM_KILLER_BEE, PM_PESTILENCE, PM_STALKER, PM_VAMPIRE_BAT_NC, PM_VAMPIRE_LEADER_NC, PM_VAMPIRE_NC, PM_VLAD_THE_IMPALER_NC, PM_WOLF_NC, PM_WRAITH, Protection_from_shape_changers_nc, ROCK, ROCK_CLASS, SCROLL_CLASS, SPECIAL_PM_NC, STATUE, S_GHOST_MV, S_GIANT, S_GNOME, S_HUMAN, S_KOBOLD, S_KOP, S_ORC, S_TROLL, S_VAMPIRE, S_ZOMBIE, TOOL_CLASS, UNICORN_HORN, WEAPON_CLASS, WORM_TOOTH, _Blind_mk, _Hallucination_mk, _engr_map, aggravate_stub, can_hide_under_obj, clear_dknown, del_engr_at, extract_from_minvent, is_lava_mv, is_mplayer_nc, is_organic, is_rider_pm, is_shapeshifter_nc, is_vampire_nc, is_vampshifter_nc, kop_revival, makemon, mdrop_obj_md, mindless_mv, mkclass_poly_nc, mkcorpstat, mkgold, mksobj, mksobj_at, mon_has_special_nc, mons_is_human, monsym_isupper_nc, mselftouch_nc, mvitals_genod_nc, newegd, obj_extract_self, ofood, place_object, pline_mon, polyfood, record_death_achievement, relobj_md, resists_poison, resists_ston, revive_corpse, set_mimic_sym, slimeproof, special_corpse, split_mon_ml, splitobj, start_corpse_timeout, throws_rocks_mv, touch_artifact, validvamp_nc, vegan, weight } from './mklev.js';
import { mpickobj } from './steal.js';
import { pick_nasty } from './wizard.js';
import { nxtobj, sobj_at } from './invent.js';
import { sengr_at } from './engrave.js';
import { neweshk } from './shknam.js';
import { level_difficulty } from './dungeon.js';
import { mungspaces, online2, upstart, strncmpi } from './hacklib.js';
import { save_mtraits } from './mkobj.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { can_fog, mon_track_clear, set_apparxy } from './monmove.js';
import { discover_object as lifesave_discover_object, objdescr_is } from './o_init.js';
import { The as The_rc, ansimpleoname, distant_name as distant_name_nc, doname as doname_nc, is_quest_artifact, makeplural, oname, quest_info, vtense, xname } from './objnam.js';
import { OC_WEIGHT } from './oc_weight.generated.js';
import { impossible as lifecycle_impossible } from './pline.js';
import { PM_SCORPIUS, PM_SCORPION, PM_AIR_ELEMENTAL, PM_ASMODEUS, PM_BABY_PURPLE_WORM, PM_BALROG, PM_BARBARIAN, PM_BLACK_UNICORN, PM_BLACK_UNICORN as PM_BLACK_UNICORN_MC, PM_CAVEMAN, PM_CHICKATRICE, PM_COCKATRICE, PM_DISPATER, PM_DWARF, PM_ELF, PM_FIRE_ELEMENTAL, PM_FLOATING_EYE, PM_FOG_CLOUD, PM_GELATINOUS_CUBE, PM_GIANT, PM_GNOME, PM_GRAY_DRAGON, PM_GRAY_OOZE as PM_GRAY_OOZE_MK, PM_GRAY_UNICORN, PM_GREEN_SLIME, PM_GREMLIN as PM_GREMLIN_ML, PM_GRID_BUG, PM_HEZROU, PM_HORNED_DEVIL, PM_HUMAN_WEREJACKAL, PM_HUMAN_WERERAT, PM_HUMAN_WEREWOLF, PM_IRON_GOLEM as PM_IRON_GOLEM_ML, PM_JELLYFISH, PM_KOBOLD, PM_LONG_WORM, PM_MAIL_DAEMON, PM_MANES, PM_MINOTAUR, PM_NEANDERTHAL, PM_NURSE, PM_ORC, PM_ORCUS, PM_OWLBEAR, PM_PONY, PM_PURPLE_WORM as PM_PURPLE_WORM_MK, PM_PYROLISK, PM_ROTHE, PM_SALAMANDER, PM_SHRIEKER, PM_STEAM_VORTEX, PM_VAMPIRE, PM_VAMPIRE_BAT, PM_VAMPIRE_LORD, PM_VIOLET_FUNGUS, PM_VLAD_THE_IMPALER, PM_VROCK, PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_WEREJACKAL, PM_WERERAT, PM_WEREWOLF, PM_WHITE_UNICORN, PM_WHITE_UNICORN as PM_WHITE_UNICORN_MC, PM_WOLF, PM_YEENOGHU, PM_YELLOW_DRAGON as PM_YELLOW_DRAGON_MC } from './pm.generated.js';
import { healup } from './potion.js';
import { dryup as dryup_ml } from './fountain.js';
import { in_your_sanctuary, newepri, p_coaligned } from './priest.js';
import { quest_monster_died } from './quest.js';
import { create_gas_cloud, poisoncloud_at } from './region.js';
import { d as d_ml, pushRngLogEntry, rn1, rn2, rnd, rnl as rnl_mc } from './rng.js';
import { shkgone } from './shk.js';
import { in_rooms } from './hack.js';
import { newemin } from './sit.js';
import { stackobj } from './sp_lev.js';
import { rloco as steal_rloco, thiefdead } from './steal.js';
import { place_monster, poly_steed } from './steed.js';
import { minimal_monnam } from './do_name.js';
import { Mgender, mon_pmname, pmname } from './do_name.js';
import { MON_ENDGAME_MIGR, MON_LIMBO, MON_MIGRATING, MON_OFFMAP, NEUTRAL, W_SADDLE, has_edog, has_egd, has_emin, has_epri, has_eshk } from './const.js';
import { deal_with_overcrowding, enexto_out, rloc, rloc_to, tele_restrict, vamprises } from './teleport.js';
import { obj_stop_timers, stop_timer } from './timeout.js';
import { tt_doppel } from './topten.js';
import { hastrack } from './track.js';
import { t_at } from './trap.js';
import { mon_knows_traps } from './mondata.js';
import { m_useup as lifesave_m_useup, m_carrying } from './mthrowu.js';
import { extract_from_minvent as extract_from_minvent_md, mon_break_armor } from './worn.js';
import { experience, m_at, mon_nam as mon_nam_wm, newexplevel, setmnotwielded, xkilled as xkilled_ml } from './uhitm.js';
import { grddead } from './vault.js';
import { cansee, couldsee, vision_recalc } from './vision.js';
import { is_were, new_were, were_change } from './were.js';
import { getlin as getlin_wf } from './windows.js';
import { count_wsegs, get_wormno, initworm, place_worm_tail_randomly, remove_worm as remove_worm_mk, worm_cross, wormgone as wormgone_mk } from './worm.js';
import { bypass_obj } from './worn.js';
import { explode } from './explode.js';
import monMattkPackAt from './makemon_mattk.json' with { type: 'json' }; // relocate-fns
import monsPackAt from './makemon_mons.json' with { type: 'json' }; // relocate-fns
import monPmnamesPackAt from './makemon_pmnames.json' with { type: 'json' }; // relocate-fns
import { COULD_SEE, IN_SIGHT } from './const.js'; // relocate-fns
import { _sparkle_on, flash_glyph_at, mon_to_glyph } from './display.js'; // relocate-fns
import { MONS, NORMAL_SPEED } from './fastforward.js'; // relocate-fns
import { dealloc_monst } from './dog.js'; // relocate-fns
import { describe_level_buf } from './dungeon.js'; // relocate-fns
import { impossible } from './pline.js'; // relocate-fns

const MS_LEADER = 36; /* C monflag.h MS_LEADER — your class leader */

const S_HUMANOID = 8;

/* Beehive and gargoyle species */
const PM_QUEEN_BEE = 5;

const PM_GARGOYLE = 41;

const PM_WINGED_GARGOYLE = 42;

const PM_ETTIN = 174;

const PM_KOBOLD_ZOMBIE = 239;

const PM_ORC_ZOMBIE = 241;

const PM_GNOME_ZOMBIE = 240;

const PM_DWARF_ZOMBIE = 242;

const PM_ELF_ZOMBIE = 243;

const PM_HUMAN_ZOMBIE = 244;

const PM_ETTIN_ZOMBIE = 245;

const PM_GIANT_ZOMBIE = 247;

/** C monflag.h M2_* subset for zombie_form */
const M2_ELF = 0x00000010;

const M2_DWARF = 0x00000020;

const SCR_SCARE_MONSTER = 326;

const CARROT = 282;

const PM_SMALL_MIMIC = 64, PM_LARGE_MIMIC = 65, PM_GIANT_MIMIC = 66;

/** C monflag.h M1_OVIPAROUS */
const M1_OVIPAROUS = 0x00400000;

/** C objclass.h enum obj_material_types SILVER = 14 */
const SILVER_MATERIAL = 14;

// C ref: dungeon.c In_hell(d_level *) — svd.dungeons[lev->dnum].flags.hellish
// C ref: mon.c:2461 monnear(struct monst *mon, coordxy x, coordxy y)
export function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    if (distance === 2 && mon.data.pmidx === PM_GRID_BUG)
        return false;
    return distance < 3;
}

/* C ref: mon.c:415-460 undead_to_corpse — convert the monster index of an
 * undead to its living counterpart.  PM_VAMPIRE_LORD is pm.generated.js's
 * (3.7) spelling of v5's PM_VAMPIRE_LEADER; PM_VAMPIRE_MAGE is #if 0 in C. */
export function undead_to_corpse(mndx) {
    switch (mndx | 0) {
        case PM_KOBOLD_ZOMBIE:
        case PM_KOBOLD_MUMMY: return PM_KOBOLD;
        case PM_DWARF_ZOMBIE:
        case PM_DWARF_MUMMY: return PM_DWARF;
        case PM_GNOME_ZOMBIE:
        case PM_GNOME_MUMMY: return PM_GNOME;
        case PM_ORC_ZOMBIE:
        case PM_ORC_MUMMY: return PM_ORC;
        case PM_ELF_ZOMBIE:
        case PM_ELF_MUMMY: return PM_ELF;
        case PM_VAMPIRE:
        case PM_VAMPIRE_LORD:
        case PM_HUMAN_ZOMBIE:
        case PM_HUMAN_MUMMY: return PM_HUMAN;
        case PM_GIANT_ZOMBIE:
        case PM_GIANT_MUMMY: return PM_GIANT;
        case PM_ETTIN_ZOMBIE:
        case PM_ETTIN_MUMMY: return PM_ETTIN;
        default: return mndx | 0;
    }
}

/** C mon.c zombie_form */
export function zombie_form(pm) {
    switch (pm.mlet) {
        case S_ZOMBIE:
            return NON_PM;
        case S_KOBOLD:
            return PM_KOBOLD_ZOMBIE;
        case S_ORC:
            return PM_ORC_ZOMBIE;
        case S_GIANT:
            return pm.pmidx === PM_ETTIN ? PM_ETTIN_ZOMBIE : PM_GIANT_ZOMBIE;
        case S_HUMAN:
        case S_KOP:
            return (pm.mflags2 & M2_ELF) !== 0 ? PM_ELF_ZOMBIE : PM_HUMAN_ZOMBIE;
        case S_HUMANOID:
            if ((pm.mflags2 & M2_DWARF) !== 0)
                return PM_DWARF_ZOMBIE;
            return NON_PM;
        case S_GNOME:
            return PM_GNOME_ZOMBIE;
        default:
            return NON_PM;
    }
}

const little_to_big_pm = little_to_big;

const big_to_little_pm = big_to_little;

/**
 * C mon.c can_be_hatched (mon.c:5534) — can mnum hatch from an egg?
 * Always calls rn2(77) (BREEDER_EGG) when lays_eggs is true.
 * KILLER_BEE (1) and GARGOYLE (41) short-circuit without rn2(77).
 */
export function can_be_hatched(mnum) {
    if (mnum === PM_SCORPIUS)
        mnum = PM_SCORPION;
    mnum = little_to_big_pm(mnum);
    if (mnum === PM_KILLER_BEE || mnum === PM_GARGOYLE)
        return mnum;
    if (mnum >= 0 && mnum < MONS_ROWS.length
        && (MONS_ROWS[mnum][6] & M1_OVIPAROUS) !== 0) {
        /* BREEDER_EGG = !rn2(77) — always consumed when lays_eggs(mnum) */
        if (!rn2(77) || (mnum !== PM_QUEEN_BEE && mnum !== PM_WINGED_GARGOYLE))
            return mnum;
    }
    return NON_PM;
}

export function dead_species(m_idx, egg) {
    /* generic eggs are unhatchable and have corpsenm of NON_PM */
    if (m_idx < LOW_PM)
        return true;
    /* For monsters with both baby and adult forms, genociding either form
       kills all eggs of that monster. */
    const alt_idx = egg ? big_to_little_pm(m_idx) : m_idx;
    const genod = (m) => (((game.mvitals && game.mvitals[m]
                            ? game.mvitals[m].mvflags : 0) | 0) & G_GENOD) !== 0;
    return genod(m_idx) || genod(alt_idx);
}

/*
 * C ref: nethack-c/src/mon.c:2634 dealloc_mextra(struct monst *m) —
 * free each populated mextra substruct, reset mcorpsenm, free mextra itself.
 */
export function dealloc_mextra(m) {
    const x = m.mextra;
    if (x) {
        if (x.mgivenname)
            x.mgivenname = null;
        if (x.egd)
            x.egd = null;
        if (x.epri)
            x.epri = null;
        if (x.eshk)
            x.eshk = null;
        if (x.emin)
            x.emin = null;
        if (x.edog)
            x.edog = null;
        if (x.ebones)
            x.ebones = null;
        x.mcorpsenm = NON_PM;
        m.mextra = null;
    }
}

/* C `*DST = *SRC` for an mextra substruct: a struct VALUE copy.  Inline
 * arrays (egd.fakecorr[], eshk.bill[], eshk.customer) and nested structs
 * (coord, d_level, align) are duplicated, not shared; only a real C pointer
 * member (eshk.bill_p, which keeps pointing at mtmp1's bill as in C) is
 * copied as a reference.  parentmid is overwritten too, as in C. */
function mextra_struct_copy(dst, src) {
    const clone = (v) => (v && typeof v === 'object' && !Array.isArray(v)
                          && Object.getPrototypeOf(v) === Object.prototype)
        ? { ...v } : v;
    for (const k of Object.keys(src)) {
        const v = src[k];
        if (k === 'bill_p')
            dst[k] = v;
        else if (Array.isArray(v))
            dst[k] = v.map(clone);
        else
            dst[k] = clone(v);
    }
}

/*
 * C ref: mon.c:2597 copy_mextra(struct monst *mtmp2, struct monst *mtmp1)
 * Copy mextra substructs from mtmp1 to mtmp2.  The assert(has_xxx(mtmp2))
 * lines (mon.c:2611-2641) are debug-only checks that the newxxx() call just
 * above succeeded; they cannot fire here and are kept as comments.
 */
export function copy_mextra(mtmp2, mtmp1) {
    if (!mtmp2 || !mtmp1 || !mtmp1.mextra)
        return;

    if (!mtmp2.mextra)
        mtmp2.mextra = newmextra();

    if (mtmp1.mextra.mgivenname) {
        new_mgivenname(mtmp2, mtmp1.mextra.mgivenname.length + 1);
        mtmp2.mextra.mgivenname = mtmp1.mextra.mgivenname;
    }
    if (mtmp1.mextra.egd) {
        if (!mtmp2.mextra.egd)
            newegd(mtmp2);
        /* assert(has_egd(mtmp2)); */
        mextra_struct_copy(mtmp2.mextra.egd, mtmp1.mextra.egd);
    }
    if (mtmp1.mextra.epri) {
        if (!mtmp2.mextra.epri)
            newepri(mtmp2);
        /* assert(has_epri(mtmp2)); */
        mextra_struct_copy(mtmp2.mextra.epri, mtmp1.mextra.epri);
    }
    if (mtmp1.mextra.eshk) {
        if (!mtmp2.mextra.eshk)
            neweshk(mtmp2);
        /* assert(has_eshk(mtmp2)); */
        mextra_struct_copy(mtmp2.mextra.eshk, mtmp1.mextra.eshk);
    }
    if (mtmp1.mextra.emin) {
        if (!mtmp2.mextra.emin)
            newemin(mtmp2);
        /* assert(has_emin(mtmp2)); */
        mextra_struct_copy(mtmp2.mextra.emin, mtmp1.mextra.emin);
    }
    if (mtmp1.mextra.edog) {
        if (!mtmp2.mextra.edog)
            newedog(mtmp2);
        /* assert(has_edog(mtmp2)); */
        mextra_struct_copy(mtmp2.mextra.edog, mtmp1.mextra.edog);
    }
    if (mtmp1.mextra.ebones) {
        if (!mtmp2.mextra.ebones)
            newebones(mtmp2);
        /* assert(has_ebones(mtmp2)); */
        mextra_struct_copy(mtmp2.mextra.ebones, mtmp1.mextra.ebones);
    }
    /* C: if (has_mcorpsenm(mtmp1)) MCORPSENM(mtmp2) = MCORPSENM(mtmp1); */
    if (mtmp1.mextra.mcorpsenm !== undefined && mtmp1.mextra.mcorpsenm !== NON_PM)
        mtmp2.mextra.mcorpsenm = mtmp1.mextra.mcorpsenm;
}

function newebones(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.ebones)
        mtmp.mextra.ebones = { parentmid: mtmp.m_id };
}

export async function mongone(mdef) {
    mdef.mhp = 0;
    /* C mon.c:3271-3274: a dead vault guard is kept at <0,0> until his
     * temporary corridor has been removed.  grddead() (js/vault.js) is the
     * real port, backed by the real clear_fcorr(), so the early return is
     * taken exactly when C takes it. */
    if (mdef.isgd && !await grddead(mdef))
        return;
    /* C mon.c:3267-3282: mhp is 0 but the grid still holds mdef until
     * m_detach -> mon_leaving_level, so a vision flush from the inventory
     * teardown (setmnotwielded's "stops shining" pline) still draws it. */
    mdef._zeroHpOnGrid = true;
    /* C mon.c:3276 unstuck(mdef): reachable from class genocide, where the
     * victim may be u.ustuck (rnd(2) mspec_used for a holder/engulfer). */
    await unstuck_mk(mdef);
    /* C mon.c:2728-2732 m_detach(), reached below by mongone(): remove a
     * mobile light source while the monster still has its map coordinates
     * and original permonst.  The temporary monster built by
     * mk_trap_statue() can itself emit light; leaving that source linked after
     * mongone() makes any_light_source() permanently true and schedules a
     * full vision repaint every monster turn. */
    /* C steal.c:851-871 mdrop_special_objs(mdef) */
    for (let obj = mdef.minvent, next = null; obj; obj = next) {
        next = obj.nobj ?? null;
        if (obj_resists(obj, 0, 0) || is_quest_artifact(obj)) {
            /* C mdrop_special_objs() keeps a resistant object by dropping it
             * at the monster's map position.  mongone() is reached for live
             * level monsters (the stock-room shopkeeper and statue path), so
             * the on-map arm is fully answerable by the canonical mdrop_obj
             * port in this file.  Migrating monsters have no valid map
             * destination here; retain the explicit guard for that separate
             * rloco-dependent arm rather than silently discarding the object.
             */
            /* C steal.c:863: mx alone marks the map; my can hold migration flags. */
            if (mdef.mx) {
                await mdrop_obj_md(mdef, obj, false);
            } else {
                /* C steal.c:866-869 — remove the object from minvent and
                 * relocate it on this level's random valid square. */
                await extract_from_minvent_md(mdef, obj, true, true);
                await steal_rloco(obj);
            }
        }
    }
    while (mdef.minvent) {
        const otmp = mdef.minvent;
        /* C mkobj.c obj_extract_self(), OBJ_MINVENT arm:
         *     extract_nobj(obj, &obj->ocarry->minvent);
         * every object taken here is the head, so the unlink is that
         * function's head step — the same one mk_trap_statue below performs.
         * nobj must be read BEFORE dealloc_obj, which re-uses it as the
         * objs_deleted queue link. */
        await extract_from_minvent(mdef, otmp, true, true);
        const previouslyDeleted = game.objs_deleted;
        await obfree(otmp, null);
        /* C shk.c:1199-1200 recursively deletes container contents; count
         * every object queued by mkobj.c:2802-2806, including those contents.
         * Billed or Lua-held objects are not queued and must not count. */
        const _bstore = game.__bridge__ || (game.__bridge__ = {});
        const _bkey = 'objs_deleted.count';
        const _bcur = _bstore[_bkey] !== undefined ? Number(_bstore[_bkey]) : 0;
        let deletedCount = 0;
        for (let obj = game.objs_deleted; obj && obj !== previouslyDeleted; obj = obj.nobj)
            deletedCount++;
        if (deletedCount) _bstore[_bkey] = String(_bcur + deletedCount);
    }
    /* C mon.c:2733 m_detach -> mon_leaving_level: vacate the map and newsym
     * (potion.c:2803 mongrantswish relies on it to clear the djinni). */
    /* m_at() skips mhp<=0 nodes but C's onmap test reads the grid, so
     * present the node as live for the duration of the call. */
    if (mdef.mleashed)
        await m_unleash_mk(mdef, false);
    if ((mdef.mx | 0) > 0 && emits_light(mdef.data))
        del_light_source(LS_MONSTER, monst_to_any(mdef));
    mdef.mhp = 1;
    mdef._zeroHpOnGrid = false;
    await mon_leaving_level_mk(mdef);
    mdef.mhp = 0;
    if (mdef.iswiz) wizdeadorgone(); /* C mon.c:2761-2762, m_detach */
    if (mdef.m_id === game.stealmid) thiefdead(); // C mon.c:2782-2783
    if (mdef.isshk) await shkgone(mdef); // C mon.c:2784-2785
    if (mdef.wormno)
        wormgone_mk(mdef);
    if (In_endgame(game.u.uz))
        mdef.mstate = (mdef.mstate | 0) | MON_ENDGAME_FREE;
    if ((mdef.mstate | 0) & MON_DETACH) {
        await lifecycle_impossible('m_detach: %s is already detached?', minimal_monnam(mdef, false));
    } else {
        mdef.mstate = (mdef.mstate | 0) | MON_DETACH;
        game.iflags.purge_monsters = (game.iflags.purge_monsters | 0) + 1;
    }
    /* C mon.c:2799-2801: disappearance also throws the rider off. */
    if (mdef === game.u.usteed)
        await dismount_steed_mk(DISMOUNT_GENERIC);
}

/* in_rooms (C hack.c:3497-3559) — this file used to carry `return []`, a
 * file-local stub that SHADOWED the complete port in js/shk.js and was
 * re-exported from here, so js/cmd.js, js/dig.js, js/teleport.js and js/trap.js
 * all imported the empty one while js/dochug.js, js/dokick.js, js/lock.js,
 * js/monmove.js, js/muse.js and js/priest.js imported the real one.  The real
 * body is imported at the top of this file and re-exported here so that both
 * halves of the tree resolve to one implementation. */
// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================
// C ref: allmain.c l_nhcore_init()
// C ref: mon.c make_corpse() — drop a corpse (or species-specific remains) for a
// dead monster.  ORDINARY-MONSTER path only (the default_1 branch, mon.c:874):
// most melee/ranged kills.  The special-species cases (dragons → scales, golems →
// gems/chains/weapons, unicorns → horn, undead → old corpse, etc.) consume DIFFERENT
// switch.  Returns the created corpse object (already placed) or null (G_NOCORPSE).
//
// RNG sequence (mirrors C mkcorpstat(CORPSE, 0, mdat, x, y, INIT) → mksobj(CORPSE,
// init=TRUE)): next_ident rnd(2) → CORPSE-init random corpsenm via undead_to_corpse(
// rndmonnum()) [the rndmonst_adj rolls] → gender rn2(2) → set_corpsenm →
// start_corpse_timeout [rn2(1000)/rn2(4)/rne(4)/rn2(2)/rnz(10)].  The randomly-chosen
// corpsenm is then OVERRIDDEN to the dead monster's species (C: otmp->corpsenm =
// monsndx(ptr)); the random pick's RNG is consumed regardless — bug-for-bug faithful.
/* The eight mummies and eight zombies of C's mon.c:629-644 case list.  NOT the
 * same set as undead_to_corpse()'s (js/mklev.js:718), which also folds in the
 * two vampires — those have their own make_corpse arm (mon.c:622), not ported.
 * The zombie mndx constants are the file's existing ones (js/mklev.js:164-171);
 * the eight mummies had no constant here yet. */
const PM_KOBOLD_MUMMY = 187, PM_GNOME_MUMMY = 188, PM_ORC_MUMMY = 189,
      PM_DWARF_MUMMY = 190, PM_ELF_MUMMY = 191, PM_HUMAN_MUMMY = 192,
      PM_ETTIN_MUMMY = 193, PM_GIANT_MUMMY = 194;

const _MUMMY_ZOMBIE_MNDX = new Set([
    PM_KOBOLD_MUMMY, PM_DWARF_MUMMY, PM_GNOME_MUMMY, PM_ORC_MUMMY,
    PM_ELF_MUMMY, PM_HUMAN_MUMMY, PM_GIANT_MUMMY, PM_ETTIN_MUMMY,
    PM_KOBOLD_ZOMBIE, PM_DWARF_ZOMBIE, PM_GNOME_ZOMBIE, PM_ORC_ZOMBIE,
    PM_ELF_ZOMBIE, PM_HUMAN_ZOMBIE, PM_GIANT_ZOMBIE, PM_ETTIN_ZOMBIE,
]);

/* C ref: mkobj.c:2067 mkcorpstat(CORPSE, mtmp, ptr, x, y, CORPSTAT_INIT) with a
 * non-random <x,y>: mksobj_at(CORPSE, x, y, init=TRUE, FALSE), then override the
 * randomly-rolled corpsenm with monsndx(ptr) and re-fire the corpse timeout when
 * either the old or the new species is special.  The random pick's RNG is
 * consumed regardless — bug-for-bug faithful, see this function's header. */
async function _mkcorpstat_corpse(corpsenm, x, y, corpstatflags, mtmp = null) {
    const otmp = await mksobj(CORPSE, true, false);
    /* C mkobj.c:2101 mkcorpstat — `otmp->spe = (corpstatflags & CORPSTAT_SPE_VAL)`.
     * RNG-free, but it is the corpse's recorded gender and make_corpse's caller
     * cannot set it any other way. */
    otmp.spe = ((corpstatflags | 0) & CORPSTAT_SPE_VAL) | 0;
    /* C mkobj.c:2087-2102 — `mtmp` non-null: save_mtraits() attaches the dead
     * monster's omonst, which mergable() (invent.c:4462 has_omonst) treats as
     * never-mergeable, so zombie/mummy/vampire corpses never stack. */
    if (mtmp) {
        save_mtraits(otmp, mtmp);
        if (mtmp.mcan && !is_rider_pm(mtmp.mndx ?? mtmp.mnum ?? 0))
            otmp.norevive = 1;
    }
    const old_corpsenm = otmp.corpsenm | 0;
    otmp.corpsenm = corpsenm | 0;
    otmp.owt = weight(otmp);
    if (otmp.otyp === CORPSE
        && (!!game.flags?.zombify || special_corpse(old_corpsenm)
            || special_corpse(otmp.corpsenm))) {
        obj_stop_timers(otmp); /* C mkobj.c:2111-2114: drop the random species' timer */
        start_corpse_timeout(otmp);
    }
    place_object(otmp, x | 0, y | 0);
    return otmp;
}

export async function make_corpse(mtmp, x, y, corpseflags) {
    const g = game;
    // C mon.c:911-939: undead corpses also pass through the common tail.
    async function finish_undead_corpse(obj) {
        if (g.context?.bypasses) bypass_obj(obj);
        if (mtmp.mextra?.mgivenname)
            obj = await oname(obj, mtmp.mextra.mgivenname, 0);
        if (_Blind_mk() && !sensemon(mtmp)) clear_dknown(obj);
        await stackobj(obj);
        newsym(x | 0, y | 0);
        if (obj.ox !== x || obj.oy !== y) newsym(obj.ox, obj.oy);
        return obj;
    }
    if (ENV.FF_DEATH_TRACE === '1')
        pushRngLogEntry(`^make_corpse[id=${mtmp.m_id|0} pm=${(mtmp.mndx ?? mtmp.mnum ?? -1)|0} pos=${x|0},${y|0}]`);
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    /* C mon.c:576-579 — make_corpse's own preamble, before the switch:
     *     if (mtmp->female) corpstatflags |= CORPSTAT_FEMALE;
     *     else if (!is_neuter(mtmp->data)) corpstatflags |= CORPSTAT_MALE;
     * RNG-free.  It was missing here, so every corpse this body made came out
     * with spe == 0 (neuter) whatever the monster was. */
    let corpstatflags = (corpseflags | 0) || CORPSTAT_NONE;
    if (mtmp.female) corpstatflags |= CORPSTAT_FEMALE;
    else if (((mtmp.data?.mflags2 | 0) & M2_NEUTER) === 0) corpstatflags |= CORPSTAT_MALE;
    if (_MUMMY_ZOMBIE_MNDX.has(mndx)) {
        const obj = await _mkcorpstat_corpse(undead_to_corpse(mndx), x, y,
                                       corpstatflags | CORPSTAT_INIT, mtmp);
        obj.age = (obj.age | 0) - (TAINT_AGE + 1);
        return await finish_undead_corpse(obj);
    }
    /* C mon.c:622-628 — vampires: the corpse of the BASE creature, old. */
    if (mndx === 226 /* PM_VAMPIRE */ || mndx === 227 /* PM_VAMPIRE_LEADER */) {
        const obj = await _mkcorpstat_corpse(undead_to_corpse(mndx), x, y,
                                       corpstatflags | CORPSTAT_INIT, mtmp);
        obj.age = (obj.age | 0) - (TAINT_AGE + 1);
        return await finish_undead_corpse(obj);
    }
    /* C mon.c:650-712 — golems leave their material instead of a corpse.
     * Each arm ends 'free_mgivenname(mtmp); break;' into the common tail
     * (mon.c:896-938), ported below; 'obj' is the LAST drop of the loop. */
    {
        const PM_PAPER_GOLEM_MC = 250, PM_ROPE_GOLEM_MC = 251, PM_GOLD_GOLEM_MC = 252,
              PM_LEATHER_GOLEM_MC = 253, PM_WOOD_GOLEM_MC = 254, PM_CLAY_GOLEM_MC = 256,
              PM_STONE_GOLEM_MC = 257, PM_GLASS_GOLEM_MC = 258, PM_IRON_GOLEM_MC = 259;
        const IRON_CHAIN_MC = 478, FIRST_GLASS_GEM_MC = 461, NUM_GLASS_GEMS_MC = 9,
              SCR_BLANK_PAPER_MC = 365, LEASH_MC = 236, BULLWHIP_MC = 82,
              GRAPPLING_HOOK_MC = 260, LEATHER_ARMOR_MC = 134, LEATHER_CLOAK_MC = 145,
              SADDLE_MC = 235, QUARTERSTAFF_MC = 79, SMALL_SHIELD_MC = 150, CLUB_MC = 77,
              ELVEN_SPEAR_MC = 28, BOOMERANG_MC = 26;
        let num, obj = null, golem = true;
        switch (mndx) {
        case PM_IRON_GOLEM_MC:
            num = d_ml(2, 6);
            while (num-- > 0) obj = await mksobj_at(IRON_CHAIN_MC, x, y, true, false);
            break;
        case PM_GLASS_GOLEM_MC:
            num = d_ml(2, 4);
            while (num-- > 0)
                obj = await mksobj_at(FIRST_GLASS_GEM_MC + rn2(NUM_GLASS_GEMS_MC), x, y, true, false);
            break;
        case PM_CLAY_GOLEM_MC:
            obj = await mksobj_at(ROCK, x, y, false, false);
            obj.quan = rn2(20) + 50;
            obj.owt = weight(obj);
            break;
        case PM_STONE_GOLEM_MC:
            obj = await mkcorpstat(STATUE, null, mndx, x, y,
                                   corpstatflags & ~CORPSTAT_INIT);
            break;
        case PM_WOOD_GOLEM_MC:
            num = d_ml(2, 4);
            while (num-- > 0) {
                obj = await mksobj_at(rn2(2) ? QUARTERSTAFF_MC
                                      : rn2(3) ? SMALL_SHIELD_MC
                                      : rn2(3) ? CLUB_MC
                                      : rn2(3) ? ELVEN_SPEAR_MC : BOOMERANG_MC,
                                      x, y, true, false);
            }
            break;
        case PM_ROPE_GOLEM_MC:
            num = rn2(3);
            while (num-- > 0)
                obj = await mksobj_at(rn2(2) ? LEASH_MC
                                      : rn2(3) ? BULLWHIP_MC : GRAPPLING_HOOK_MC,
                                      x, y, true, false);
            break;
        case PM_LEATHER_GOLEM_MC:
            num = d_ml(2, 4);
            while (num-- > 0)
                obj = await mksobj_at(rn2(4) ? LEATHER_ARMOR_MC
                                      : rn2(3) ? LEATHER_CLOAK_MC : SADDLE_MC,
                                      x, y, true, false);
            break;
        case PM_GOLD_GOLEM_MC:
            obj = await mkgold(200 - rnl_mc(101), x, y);
            break;
        case PM_PAPER_GOLEM_MC:
            num = rnd(4);
            while (num-- > 0) obj = await mksobj_at(SCR_BLANK_PAPER_MC, x, y, true, false);
            break;
        default:
            golem = false;
        }
        /* C mon.c:655+ — every golem arm frees the dead monster's given name
         * ("don't christen obj") except stone golem, whose named statue does
         * get christened (C's own omission, ported). */
        if (golem && mndx !== PM_STONE_GOLEM_MC && mtmp.mextra)
            mtmp.mextra.mgivenname = null;
        if (golem) {
            if (!obj) /* rope golem, rn2(3) == 0: C returns before newsym */
                return null;
            if (g.context?.bypasses)
                bypass_obj(obj);
            if (mtmp.mextra?.mgivenname)
                await oname(obj, mtmp.mextra.mgivenname, 0);
            if (_Blind_mk() && !sensemon(mtmp))
                clear_dknown(obj);
            await stackobj(obj);
            newsym(x | 0, y | 0);
            /* C mon.c:936-938 — in case the drop landed off-spot */
            if ((obj.ox | 0) !== (x | 0) || (obj.oy | 0) !== (y | 0))
                newsym(obj.ox | 0, obj.oy | 0);
            return obj;
        }
    }
    /* C mon.c:716-731 — oozes and puddings leave a glob, not a corpse:
     *     obj = mksobj_at(GLOB_OF_BLACK_PUDDING - (PM_BLACK_PUDDING - mndx), x, y, TRUE, FALSE);
     *     while (obj && (otmp = obj_nexto(obj)) != 0) { pudding_merge_message(obj, otmp);
     *            obj = obj_meld(&obj, &otmp); }
     * These species are G_NOCORPSE, so default_1 below returned null and drew
     * nothing (missing next_ident / start_glob_timeout / obj_nexto_xy draws). */
    if (mndx >= PM_GRAY_OOZE_MK && mndx <= PM_GRAY_OOZE_MK + 3) {
        let gobj = await mksobj_at(GLOB_OF_BLACK_PUDDING - (PM_GRAY_OOZE_MK + 3 - mndx), x, y, true, false);
        let gother;
        while (gobj && (gother = await flooreffects_obj_nexto_xy(gobj, gobj.ox | 0, gobj.oy | 0, true)) != null) {
            await flooreffects_pudding_merge_message(gobj, gother);
            gobj = await flooreffects_obj_meld(gobj, gother);
        }
        if (mtmp.mextra) mtmp.mextra.mgivenname = null; /* C mon.c:729 */
        newsym(x | 0, y | 0);
        return gobj;
    }
    /* C mon.c:582-597 — gray/gold/silver fall through into the colored dragons: scales first (rn2 3, or 20 if revived), then
     * goto default_1.  The dragon order matches the scale order. */
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON_MC) {
        if (!rn2(mtmp.mrevived ? 20 : 3)) {
            const sc = await mksobj_at(GRAY_DRAGON_SCALES_NC + mndx - PM_GRAY_DRAGON, x, y, false, false);
            sc.spe = 0;
            sc.cursed = sc.blessed = false;
        }
    }
    /* C mon.c:603-616 — unicorn horn (the "crumbles to dust" pline needs canseemon). */
    if (mndx >= PM_WHITE_UNICORN_MC && mndx <= PM_BLACK_UNICORN_MC) {
        if (mtmp.mrevived && rn2(2)) {
            if (canseemon(mtmp))
                await pline(`${lifesave_s_suffix(Monnam_wm(mtmp))} recently regrown horn crumbles to dust.`);
        } else {
            const h = await mksobj_at(UNICORN_HORN, x, y, true, false);
            if (h && mtmp.mrevived) h.degraded_horn = 1;
        }
    }
    /* C mon.c:617-619 */
    if (mndx === PM_LONG_WORM)
        await mksobj_at(WORM_TOOTH, x, y, true, false);
    // C mon.c:874 default_1 — G_NOCORPSE species drop nothing.
    // mvflags is the dynamic per-game state; G_NOCORPSE seeds from mons[].geno
    // (MONS row col 3) at game start, G_GONE accrues from genocide/extinction.
    const noCorpseStatic = (mndx >= 0 && mndx < MONS_ROWS.length)
        ? ((MONS_ROWS[mndx][3] | 0) & G_NOCORPSE) : 0;
    /* mon.c:893 tests only G_NOCORPSE; G_GONE (G_EXTINCT set when a unique dies) does not suppress the corpse. */
    const goneDyn = (g.mvitals?.[mndx]?.mvflags | 0) & G_NOCORPSE;
    if ((noCorpseStatic | goneDyn) !== 0)
        return null;
    // C mon.c:549-556,898: KEEPTRAITS preserves revivers' levels and other traits.
    const mdat = mtmp.data ?? permonstTemplate(mndx);
    const keeptraits = mtmp.isshk || mtmp.mtame || (mdat.geno & 0x1000 /* G_UNIQ */)
        || is_rider_pm(mndx) || mdat.mlet === S_TROLL
        || mtmp.m_id === (game.svq?.quest_status?.leader_m_id ?? 0)
        || dmgtype_fromattack(mdat, 22 /* AD_SEDU */, -1 /* AT_ANY */)
        || dmgtype_fromattack(mdat, 35 /* AD_SSEX */, -1);
    const otmp = await mkcorpstat(CORPSE, keeptraits ? mtmp : null, mdat,
                                x, y, corpstatflags | CORPSTAT_INIT);
    // C mon.c:900-905: burial precedes naming, bypassing, and stacking.
    if (corpstatflags & CORPSTAT_BURIED) {
        const dealloc = { value: false };
        await bury_an_obj(otmp, dealloc);
        newsym(x | 0, y | 0);
        return dealloc.value ? null : otmp;
    }
    /* C mon.c:915-918 — "if polymorph or undead turning has killed this
     * monster, prevent the same attack beam from hitting its corpse":
     * `if (svc.context.bypasses) bypass_obj(obj);` (destroy_items leaves the
     * flag TRUE for the rest of the move, zap.c:6040). */
    if (g.context?.bypasses)
        bypass_obj(otmp);
    /* C mon.c:920-921 — the common tail names the corpse after a named
     * monster: `if (has_mgivenname(mtmp)) obj = oname(obj, MGIVENNAME(mtmp),
     * ONAME_NO_FLAGS);` (ONAME_NO_FLAGS == 0).  Missing here, so a named pet's
     * corpse listed as "a little dog corpse" instead of "... named Slasher". */
    if (mtmp.mextra?.mgivenname)
        await oname(otmp, mtmp.mextra.mgivenname, 0);
    if (_Blind_mk() && !sensemon(mtmp)) clear_dknown(otmp); // C mon.c:931-932
    // C mon.c:934-935 — make_corpse ends `stackobj(obj); newsym(x, y);`.  Every
    // newsym the death path issued before this one ran while the corpse did not
    // exist yet (mondead → m_detach → mon_leaving_level, mon.c:2725), so they
    // mergable() allows (C mon.c:934); 'obj' remains the survivor.
    await stackobj(otmp);
    newsym(x | 0, y | 0);
    if (otmp.ox !== x || otmp.oy !== y) newsym(otmp.ox, otmp.oy); // C mon.c:938-939
    return otmp;
}

// C ref: mon.c:5002-5012 valid_vampshiftform(base, form)
// Check if a vampire (base) can shift to a given form.
export function valid_vampshiftform(base, form) {
    if ((base | 0) >= LOW_PM && (MONS_ROWS[base | 0]?.[0] | 0) === S_VAMPIRE) {
        if ((form | 0) === PM_VAMPIRE_BAT || (form | 0) === PM_FOG_CLOUD
            || ((form | 0) === PM_WOLF && (base | 0) !== PM_VAMPIRE))
            return true;
    }
    return false;
}

// C ref: mon.c:4455-4456 itermonarr / itermonsiz
// Static module globals for safe iteration over all monsters on the level
let itermonarr = null; // array of struct monst *

let itermonsiz = 0; // size in 'monst *' pointers

/* C ref: mon.c:5551-5568 — egg_type_from_parent: convert parent monster type to
 * the egg type it lays. BREEDER_EGG macro expands to (!rn2(77)), so !BREEDER_EGG
 * is !(!rn2(77)) i.e. (rn2(77) != 0) — truthy when rn2(77) returned nonzero. */
export function egg_type_from_parent(mnum, force_ordinary) {
    if (force_ordinary || rn2(77)) {
        if (mnum === PM_QUEEN_BEE)
            mnum = PM_KILLER_BEE;
        else if (mnum === PM_WINGED_GARGOYLE)
            mnum = PM_GARGOYLE;
    }
    return mnum;
}

/* C ref: mon.c:516-528 — pm_to_cham: return monster index if chameleon, or NON_PM if not */
export function pm_to_cham(mndx) {
    let mcham = NON_PM;

    /*
     * As of 3.6.0 we just check M2_SHAPESHIFTER instead of having a
     * big switch statement with hardcoded shapeshifter types here.
     */
    if (ismnum(mndx) && (MONS_ROWS[mndx][7] & M2_SHAPESHIFTER) !== 0)
        mcham = mndx;
    return mcham;
}

/* C ref: mon.c:4460-4480 alloc_itermonarr(unsigned count)
 * Manages the itermonarr buffer used for safe iteration over all monsters.
 * Allocates, reallocates, or frees itermonarr based on the requested count.
 */
export function alloc_itermonarr(count) {
    /* if count is 0 or bigger than itermonsiz or much smaller than
       itermonsiz, release itermonarr (and reset itermonsiz to 0) */
    if (!count || count > itermonsiz || count + 40 < itermonsiz) {
        if (itermonarr)
            itermonarr = null;
        itermonsiz = 0;
    }
    /* when count is more than itermonsiz (including when that just
       got reset to 0), allocate a new instance of itermonarr;
       implies that count is greater than 0 */
    if (count > itermonsiz) {
        /* overallocate to reduce free/alloc-again thrashing when the
           number of monsters varies from turn to turn */
        itermonsiz = count + 20;
        itermonarr = new Array(itermonsiz);
    }
}

/* C ref: mon.c:1945-1962 — can_touch_safely: can monster touch object safely?
 * Returns boolean: true if can safely touch, false otherwise.
 * No RNG consumption in this function.
 *
 * Macro implementations:
 * - touch_petrifies(ptr): ptr == &mons[PM_COCKATRICE] || ptr == &mons[PM_CHICKATRICE]
 * - is_rider(ptr): ptr == &mons[PM_DEATH_R] || ptr == &mons[PM_FAMINE] || ptr == &mons[PM_PESTILENCE]
 * - resists_ston(mon): Resists_Elem(mon, STONE_RES)
 * - touch_artifact(otmp, mtmp): artifact.c touch_artifact
 * - is_covetous(ptr): (ptr->mflags3 & M3_COVETOUS), mondata.h */
const M3_COVETOUS = 0x001f; /* monflag.h: M3_WANTSAMUL|WANTSBELL|WANTSBOOK|WANTSCAND|WANTSARTI */
function is_covetous(ptr) { return ((ptr?.mflags3 | 0) & M3_COVETOUS) !== 0; }
export async function can_touch_safely(mtmp, otmp) {
    const otyp = otmp.otyp | 0;
    const mdat = mtmp.data;
    const corpsenm = otmp.corpsenm | 0;

    /* First check: CORPSE && touch_petrifies && !wearing gloves && !resists stone */
    if (otyp === CORPSE) {
        /* touch_petrifies(ptr): check if ptr is &mons[PM_COCKATRICE] or &mons[PM_CHICKATRICE] */
        const petrifies = corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;

        if (petrifies && !(mtmp.misc_worn_check & W_ARMG)
            && !resists_ston(mtmp))
            return false;

        /* is_rider(ptr): check if ptr is &mons[PM_DEATH_R], &mons[PM_FAMINE], or &mons[PM_PESTILENCE] */
        const isRider = corpsenm === PM_DEATH_R || corpsenm === PM_FAMINE || corpsenm === PM_PESTILENCE;
        if (isRider)
            return false;
    }

    /* Second check: SILVER material && mon_hates_silver && (not BELL_OF_OPENING or !is_covetous) */
    /* objects[otyp].oc_material is the RUNTIME value: o_init.c:141-146 swaps it with
     * the description when shuffling whole classes (wands, rings, ...), so a wand
     * whose appearance is "silver" is silver whatever its otyp. */
    const _ocMat = (game._objMaterials && game._objMaterials[otyp] != null)
        ? (game._objMaterials[otyp] | 0) : MKOBJ_OC_MATERIAL[otyp | 0];
    if (_ocMat === SILVER_MATERIAL && mon_hates_silver(mtmp)) {
        if (otyp !== BELL_OF_OPENING || !is_covetous(mdat)) {
            return false;
        }
    }

    /* Third check: touch_artifact */
    if (!await touch_artifact(otmp, mtmp))
        return false;

    return true;
}

/* C ref: mon.c:4311-4320 — wake_msg: print message when monster wakes up.
 * void wake_msg(struct monst *mtmp, boolean interesting)
 *
 * Prints a pline message if the monster is sleeping and can be seen by the player.
 * The message includes the monster's name and may add "!" or "." depending on
 * whether the wake-up is interesting, plus " It's alive!" for flesh golems.
 * These functions are not yet ported; they're stubbed here but won't execute
 * in recorded test cases (which have msleeping=0).
 */
export function wake_msg(mtmp, interesting) {
    if (mtmp.msleeping && canseemon(mtmp)) {
        const pmidx = mtmp?.data?.pmidx;
        const mndx = (typeof pmidx === 'number') ? (pmidx | 0)
            : (mtmp.data_mndx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
        const suffix = mndx === PM_FLESH_GOLEM_WM() ? " It's alive!" : "";
        const punct = interesting ? "!" : ".";
        pline_mon(mtmp, Monnam_wm(mtmp) + " wakes up" + punct + suffix);
    }
}

let _pmFleshGolem = null;

function PM_FLESH_GOLEM_WM() {
    if (_pmFleshGolem === null) {
        _pmFleshGolem = -1;
        for (let i = 0; i < 400; i++) {
            const t = permonstTemplate(i);
            if (!t) continue;
            if ((t.pmnames || []).some((n) => n === 'flesh golem')) { _pmFleshGolem = i; break; }
        }
    }
    return _pmFleshGolem;
}

/* C ref: mon.c:4392-4395 — wake_nearto: wake monsters near a location
 * void wake_nearto(coordxy x, coordxy y, int distance)
 *
 * Simple wrapper around wake_nearto_core, passing FALSE for petcall.
 */
export function wake_nearto(x, y, distance) {
    wake_nearto_core(x, y, distance, false);
}

/* C mon.c:4357-4368 wake_nearby(petcall).  This is deliberately separate
 * from wake_nearto(): a whistle's pet call also timestamps non-minion pets
 * and clears their movement tracks. */
export function wake_nearby(petcall) {
    const u = game.u || {};
    wake_nearto_core(u.ux | 0, u.uy | 0, (u.ulevel | 0) * 20, !!petcall);
}

function wake_nearto_core(x, y, distance, petcall) {
    /* C monst.h:179 STRAT_WAITMASK = STRAT_CLOSE | STRAT_WAITFORU; both are
     * already imported from js/const.js at the top of this file. */
    const STRAT_WAITMASK_WNC = (STRAT_CLOSE | STRAT_WAITFORU) >>> 0;
    const G_UNIQ_WNC = 0x1000;             /* C monflag.h G_UNIQ (geno bit) */
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER */
        if (distance === 0 || dist2(mtmp.mx | 0, mtmp.my | 0, x | 0, y | 0) < distance) {
            wake_msg(mtmp, false);
            mtmp.msleeping = 0;
            const geno = (mtmp.data ? (mtmp.data.geno | 0) : (monGeno(mtmp.mnum | 0) | 0));
            if (!(geno & G_UNIQ_WNC))
                mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK_WNC;
            if (!game.context?.mon_moving && petcall && mtmp.mtame) {
                if (!mtmp.isminion)
                    ((mtmp.mextra ||= {}).edog ||= {}).whistletime = game.moves | 0;
                mon_track_clear(mtmp);
            }
        }
    }
    disturb_buried_zombies(x | 0, y | 0);
}

/* C ref: mon.c:4111-4122 — m_respond: handle monster special responses
 * void m_respond(struct monst *mtmp)
 *
 * Handles special abilities and behaviors when a monster responds:
 * - If it's a shrieker and within 1 step of the hero, call m_respond_shrieker
 * - If it's a medusa and can see the hero, call m_respond_medusa
 * - If it's an erinys, not peaceful, and can see the hero, call aggravate
 */
export async function m_respond(mtmp) {
    const MS_SHRIEK = 18; /* C monflag.h ms_sounds */
    const couldsee_impl = couldsee;
    const um_dist_impl = um_dist;
    const PM_MEDUSA_CONST = 284; /* pm.generated.js PM_MEDUSA = 284 */
    const PM_ERINYS_CONST = 292; /* pm.generated.js PM_ERINYS = 292 */

    /* First check: shrieker that's close to the hero */
    if ((mtmp.data.msound | 0) === MS_SHRIEK && !um_dist_impl(mtmp.mx | 0, mtmp.my | 0, 1)) {
        await m_respond_shrieker(mtmp);
    }

    /* Second check: medusa that can see the hero */
    if ((mtmp.data.pmidx | 0) === PM_MEDUSA_CONST && couldsee_impl(mtmp.mx | 0, mtmp.my | 0)) {
        await m_respond_medusa(mtmp);
    }

    /* Third check: erinys that can see the hero (Erinyes will inform surrounding monsters of your crimes) */
    if ((mtmp.data.pmidx | 0) === PM_ERINYS_CONST && !mtmp.mpeaceful && m_canseeu(mtmp)) {
        aggravate_stub();
    }
}

/* Unported helper for m_respond shrieker case */
async function m_respond_shrieker(mtmp) {
    if (!Deaf_live()) { /* C mon.c:4091 !Deaf */
        await pline(`${Monnam(mtmp)} shrieks.`);
        /* C: mon.c:4093 stop_occupation() follows the shriek pline. */
        const { stop_occupation } = await import('./allmain.js');
        await stop_occupation();
    }
    /* C: !rn2(10) makemon(rn2(13) ? random : purple/baby-purple,0,0). */
    if (!rn2(10)) {
        const ptr = rn2(13) ? null : permonstTemplate(
            MONS_ROWS[PM_PURPLE_WORM_MK][2]
                > Math.trunc((level_difficulty() + game.u.ulevel) / 2)
                ? PM_BABY_PURPLE_WORM : PM_PURPLE_WORM_MK);
        await makemon(ptr, 0, 0, 0 /* NO_MM_FLAGS; C mon.c:4098-4102 */);
    }
    aggravate_real();
}

/* Unported helper for m_respond medusa case */
async function m_respond_medusa(mtmp) {
    const attks = mon_mattk_raw(mtmp.data?.pmidx ?? mtmp.mnum) || [];
    const raw = attks.find(a => a && (a[0] | 0) === AT_GAZE);
    if (!raw)
        return;
    const mattk = { aatyp: raw[0] | 0, adtyp: raw[1] | 0,
                    damn: raw[2] | 0, damd: raw[3] | 0 };
    const { gazemu } = await import('./mhitu.js');
    return gazemu(mtmp, mattk);
}

/* Unported helper: monster can see hero */
/* C vision.h:45-52 m_canseeu(m) —
 *     (!Invis || perceives(m->data)) && !Underwater && couldsee(m->mx, m->my)
 * with Invis = (HInvis || EInvis) && !BInvis and perceives = M1_SEE_INVIS.
 * This was `throw new Error('not yet ported: m_canseeu')`, which is reached by
 * adj_erinys (:11968) and by peacefuls_respond below.  js/mhitm.js:176 already
 * carries this exact body, unexported; the macro is four lines, so it is
 * written out against vision.h rather than routed through a new export edge
 * (mhitm.js imports wake_nearto FROM this file). */
function m_canseeu(mtmp) {
    const u = game.u || {};
    const ip = u.uprops?.[MK_INVIS];
    const Invis = !!(ip && (ip.intrinsic || ip.extrinsic) && !(ip.blocked | 0));
    const ptr = mtmp.data || permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? -1) | 0);
    const perceives = !!(((ptr && ptr.mflags1) | 0) & 0x01000000 /* M1_SEE_INVIS */);
    return (!Invis || perceives) && !u.uinwater && couldsee(mtmp.mx | 0, mtmp.my | 0);
}

/* C ref: mon.c:6015-6045 — see_nearby_monsters: show nearby monsters to the hero
 * void see_nearby_monsters(void)
 *
 * Iterates over the 3x3 grid centered on the hero. For each monster found,
 * if the hero can see it (or sense it when hidden), record the hit position
 * and call see_monster_closeup to display its close-up info.
 */
export function see_nearby_monsters() {
    /* C: Hallucination, Blind, Blind_telepat are flags/bitfields */
    const Hallucination = _Hallucination_mk();
    const Blind = _Blind_mk();
    const Blind_telepat = !!(game.u?.uprops?.[MK_TELEPAT]?.intrinsic
        || game.u?.uprops?.[MK_TELEPAT]?.extrinsic);

    if (Hallucination || (Blind && !Blind_telepat))
        return;

    const ux = game.u.ux | 0;
    const uy = game.u.uy | 0;
    const M_AP_MONSTER = 3; /* C decl.h: M_AP_MONSTER */

    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok(x, y))
                continue;

            /* m_at(x, y): scan fmon list for monster at (x, y) */
            let mtmp = null;
            for (let m = game.fmon; m; m = m.nmon) {
                if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at reads the grid, which m_detach cleared */
                if (m.mx === x && m.my === y) {
                    mtmp = m;
                    break;
                }
            }
            if (!mtmp)
                continue;

            /* C mon.c:6031 mndx = monsndx(mtmp->data).  mondata.h:10 defines
             * `#define monsndx(ptr) ((ptr)->pmidx)` — `struct permonst` has
             * NO `mndx` member, so the field to read is `pmidx`, the same
             * spelling the sibling see_monster_closeup below (and mklev.js
             * :8626/:8631) already uses on an fmon-walked monster. */
            let mndx = mtmp.data.pmidx | 0;
            if ((mtmp.m_ap_type | 0) === M_AP_MONSTER)
                mndx = mtmp.mappearance | 0;

            /* skip closeup handling if this mon type has already been done */
            if (game.mvitals?.[mndx]?.seen_close)
                continue;

            /* disguised mimics pass canseemon(); undetected hiders don't */
            if (canseemon(mtmp) || (mtmp.mundetected && sensemon(mtmp))) {
                if (!game.gb) game.gb = {};
                if (!game.gb.bhitpos) game.gb.bhitpos = {};
                game.gb.bhitpos.x = x;
                game.gb.bhitpos.y = y;
                if (!game.gn) game.gn = {};
                game.gn.notonhead = (x !== mtmp.mx || y !== mtmp.my);
                see_monster_closeup(mtmp, false);
            }
        }
    }
}

/* C ref: mon.c:5958-6013 — see_monster_closeup: mark individual monster type
 * as seen from close-up, if we haven't seen it nearby before.
 * void see_monster_closeup(struct monst *mtmp, boolean photo) */
export function see_monster_closeup(mtmp, photo) {
    const Hallucination = _Hallucination_mk();
    const Blind = _Blind_mk();
    const Blind_telepat = !!(game.u?.uprops?.[MK_TELEPAT]?.intrinsic
        || game.u?.uprops?.[MK_TELEPAT]?.extrinsic);

    if (Hallucination || (Blind && !Blind_telepat))
        return;

    const M_AP_MONSTER = 3;
    const M_AP_NOTHING = 0;
    const PM_LONG_WORM = 114;
    const PM_LONG_WORM_TAIL = 330;
    const PM_TOURIST = 341;

    let mndx = mtmp.data.pmidx | 0;
    if ((mtmp.m_ap_type | 0) === M_AP_MONSTER && !sensemon(mtmp))
        mndx = mtmp.mappearance | 0;
    if (mndx === PM_LONG_WORM && game.gn?.notonhead)
        mndx = PM_LONG_WORM_TAIL;

    if (!game.mvitals) game.mvitals = {};
    if (!game.mvitals[mndx]) game.mvitals[mndx] = {};
    if (!game.mvitals[mndx].seen_close) {
        game.mvitals[mndx].seen_close = 1;
        if (!game.context) game.context = {};
        if (!game.context.lifelist) game.context.lifelist = {};
        game.context.lifelist.total_seen_upclose = (game.context.lifelist.total_seen_upclose | 0) + 1;
    }

    /* hallucinatory monsters don't reach here--they're not recorded;
       being able to see invisible doesn't make invisible monsters show up
       on photos; likewise, telepathy allows hero to see hidden monsters
       but doesn't cause them to appear on photos */
    if (photo && !mtmp.minvis && !mtmp.mundetected
        && ((mtmp.m_ap_type | 0) === M_AP_NOTHING
            || (mtmp.m_ap_type | 0) === M_AP_MONSTER)) {
        if ((mtmp.m_ap_type | 0) === M_AP_MONSTER) /* cloned Wizard of Yendor */
            mndx = mtmp.mappearance | 0;

        if (!game.mvitals) game.mvitals = {};
        if (!game.mvitals[mndx]) game.mvitals[mndx] = {};
        if (!game.mvitals[mndx].photographed) {
            game.mvitals[mndx].photographed = 1;
            if (!game.context) game.context = {};
            if (!game.context.lifelist) game.context.lifelist = {};
            game.context.lifelist.total_photographed = (game.context.lifelist.total_photographed | 0) + 1;

            /* tourist earns points (toward EXP but not final score) for
               the first instance of each type of monster photographed;
               worm tail can be photographed but yields no EXP bonus */
            /* C you.h:247 Role_if(X) := (gu.urole.mnum == (X)).  `malenum` is
             * not a field js/roles.js:595 writes, so this test was dead. */
            if ((game.urole?.mnum ?? -1) === PM_TOURIST
                /* suppress extra points for photographing the pet that hero
                   started with (unless it has changed shape due to growing
                   up or being polymorphed) */
                && (mtmp.m_id !== game.context.startingpet_mid
                    || mndx !== game.context.startingpet_typ)
                /* monsndx() check covers worm tail and also disguised
                   Wizard of Yendor; experienced() won't yield a reasonable
                   value for those */
                && mndx === (mtmp.data.pmidx | 0)) {
                more_experienced(experience(mtmp, 0), 0);
                newexplevel();
            }
        }
    }
}

export function hideunder(mtmp) {
    const M1_CONCEAL = 0x00000080; /* monflag.h */
    const S_EEL = 57;
    const is_u = mtmp === game.youmonst;
    const x = is_u ? game.u.ux : mtmp.mx;
    const y = is_u ? game.u.uy : mtmp.my;
    const seeit = game.in_mklev ? 0 : canseemon(mtmp);
    let undetected = false;
    /* C mon.c:4729-4731 — `const char *seenmon = 0, *seenobj = 0, *locomo = 0;` */
    let seenmon = null, seenobj = null, locomo = null;

    const isTrapped = is_u ? !!game.u.utrap : !!mtmp.mtrapped;
    let onNonPitTrap = false;
    if (!isTrapped) {
        const t = t_at(x, y);
        onNonPitTrap = !!(t && !is_pit(t.ttyp | 0));
    }

    if (mtmp === game.u.ustuck) {
        /* undetected stays FALSE: can't hide while holding/held by hero */
    } else if (isTrapped || onNonPitTrap) {
        /* undetected stays FALSE: trapped, or on/in/under a non-pit trap */
    } else if ((mtmp.data.mlet | 0) === S_EEL) {
        /* aquatic creatures only hide under water, not under objects */
        undetected = is_pool(x, y) && !Is_waterlevel(game.u.uz)
            && (!game.u.uinwater || !couldsee(x, y));
        /* C mon.c:4749-4752 — assigned on `seeit` alone, NOT on `undetected`. */
        if (seeit) {
            seenobj = 'the water';
            locomo = 'dive';
        }
    } else if (((mtmp.data.mflags1 | 0) & M1_CONCEAL) !== 0) {
        /* hides_under(mtmp->data): hider-underers only hide under objects */
        let otmp = game.level?.levelObjects?.[x]?.[y] ?? null;
        if (otmp
            && can_hide_under_obj(otmp)
            && (!mtmp.mtame || !cursed_object_at_hu(x, y))
            && !is_pool_or_lava(x, y)) {
            /* C mon.c:4763-4764 — seenobj names the object at the TOP of the
             * pile, before the cockatrice-corpse skip below advances otmp. */
            if (seeit)
                seenobj = ansimpleoname(otmp);
            /* most monsters won't hide under a cockatrice/chickatrice
               corpse but can hide under a pile with more than just those */
            if (is_u ? !(game.u.uprops?.[STONE_RES]?.intrinsic
                         || game.u.uprops?.[STONE_RES]?.extrinsic) : !resists_ston(mtmp)) {
                while (otmp && (otmp.otyp | 0) === CORPSE
                       && ((otmp.corpsenm | 0) === PM_COCKATRICE
                           || (otmp.corpsenm | 0) === PM_CHICKATRICE))
                    otmp = otmp.nexthere ?? null;
            }
            if (otmp) undetected = true;
        }
    }

    let oldundetctd;
    if (is_u) {
        oldundetctd = (game.u.uundetected | 0) !== 0;
        game.u.uundetected = undetected ? 1 : 0;
    } else {
        /* C mon.c:4782-4783 — computed on `seeit` alone, so a visible monster
         * that FAILS to hide still pays y_monnam()'s cost (which under
         * Hallucination draws RNG through rndmonnam()). */
        if (seeit)
            seenmon = y_monnam(mtmp);
        /* C's boolean field is zero-initialized.  An absent JS field likewise
         * means false; `undefined !== 0` incorrectly treated a never-hidden
         * monster as hidden and caused an extra repaint when hideunder() ran. */
        oldundetctd = (mtmp.mundetected | 0) !== 0;
        mtmp.mundetected = undetected ? 1 : 0;
        /* C mon.c:4787-4796 — "the 'you see' message won't be shown for monster
         * hiding during level creation because 'seeit' will be 0 so 'seenmon'
         * and 'seenobj' will be Null". */
        if (undetected && seenmon && seenobj) {
            if (!locomo)
                locomo = locomotion(mtmp.data, 'hide');
            set_msg_xy(mtmp.mx, mtmp.my); /* pline() will reset this */
            You_see(`${seenmon} ${locomo} under ${seenobj}.`);
            /* C mon.c:4794-4795 — read back by mhitm.c:342-345 when the hider
             * is later revealed ("%s emerges from hiding."). */
            if (!game.iflags) game.iflags = {};
            game.iflags.last_msg = PLNMSG_HIDE_UNDER;
            if (!game.l) game.l = {};
            game.l.last_hider = mtmp.m_id;
        }
    }
    if (undetected !== oldundetctd) newsym(x, y);
    return undetected;
}

/* C ref: mon.c:4795-4817 — called when returning to a previously visited level */
export async function hide_monst(mon) {
    const M1_HIDE = 0x00000100; /* C monflag.h:93 (0x10 is M1_CLING) */
    const M1_CONCEAL = 0x00000080;
    const S_EEL = 57;
    const S_MIMIC = 13;
    const IN_SIGHT = 0x2;
    const COULD_SEE = 0x1;

    function is_hider(ptr) {
        return ((ptr.mflags1 | 0) & M1_HIDE) !== 0;
    }
    function hides_under(ptr) {
        return ((ptr.mflags1 | 0) & M1_CONCEAL) !== 0;
    }

    const hider_under = hides_under(mon.data) || (mon.data.mlet | 0) === S_EEL;

    if ((is_hider(mon.data) || hider_under)
        && !(mon.mundetected || (mon.m_ap_type | 0))) {
        const x = mon.mx | 0, y = mon.my | 0;
        const save_viz = game.viz_array[y][x];

        /* override vision, forcing hero to be unable to see monster's spot */
        game.viz_array[y][x] &= ~(IN_SIGHT | COULD_SEE);
        if (is_hider(mon.data))
            await restrap(mon);
        /* try again if mimic missed its 1/3 chance to hide */
        if ((mon.data.mlet | 0) === S_MIMIC && !(mon.m_ap_type | 0))
            await restrap(mon);
        game.viz_array[y][x] = save_viz;
        if (hider_under)
            hideunder(mon);
    }
}

/* C ref: mon.c:4660-4693 restrap(mtmp) — "unwatched hiders may hide again;
 * if so, returns True".
 *
 *   if (mtmp->mcan || M_AP_TYPE(mtmp) || cansee(mtmp->mx, mtmp->my)
 *       || rn2(3) || mtmp == u.ustuck
 *       || (mtmp->mtrapped && (t = t_at(mtmp->mx, mtmp->my)) != 0
 *           && !is_pit(t->ttyp))
 *       || (ceiling_hider(mtmp->data) && !has_ceiling(&u.uz))
 *       || (sensemon(mtmp) && m_next2u(mtmp)))
 *       return FALSE;
 *
 * The `||` chain short-circuits left to right, so rn2(3) is the FOURTH term:
 * it fires only for a non-cancelled, non-disguised, unseen hider, and it is
 * skipped entirely for anything the hero can see. That ordering is the RNG
 * contract — the terms AFTER rn2(3) consume nothing, so they change only the
 * return value (whether the monster forfeits its move), never the stream.
 *
 * monst.h:73     M_AP_TYPE(m)      = m->m_ap_type & M_AP_TYPMASK
 * you.h:560      m_next2u(m)       = distu(m->mx, m->my) <= 2
 * mondata.h:43   ceiling_hider(p)  = is_hider(p) && ((is_clinger(p)
 *                                    && p->mlet != S_MIMIC) || is_flyer(p))
 * dungeon.c:1690 has_ceiling(lev)  = !(In_endgame(lev) && !Is_earthlevel(lev))
 */
export async function restrap(mtmp) {
    if (!mtmp) return false;
    const M_AP_TYPMASK_RS = 0x3;     /* monst.h M_AP_TYPMASK */
    const M1_FLY_RS = 0x00000001;    /* monflag.h:85 */
    const M1_CLING_RS = 0x00000010;  /* monflag.h:89 */
    const M1_HIDE_RS = 0x00000100;   /* monflag.h:93 */
    const S_MIMIC_RS = 13;
    const data = mtmp.data || {};
    const mf1 = (data.mflags1 | 0);

    if (mtmp.mcan | 0) return false;
    if (((mtmp.m_ap_type | 0) & M_AP_TYPMASK_RS) !== 0) return false;
    if (cansee(mtmp.mx | 0, mtmp.my | 0)) return false;
    if (ENV.FF_TURNTRACE === '1')
        pushRngLogEntry(`^restrap_js[moves=${game.moves | 0} id=${mtmp.m_id | 0}]`);
    if (rn2(3)) return false;
    if (game.u && mtmp === game.u.ustuck) return false;
    if (mtmp.mtrapped | 0) {
        const t = t_at(mtmp.mx | 0, mtmp.my | 0);
        if (t && !is_pit(t.ttyp | 0)) return false;
    }
    const is_hider_rs = (mf1 & M1_HIDE_RS) !== 0;
    const ceiling_hider = is_hider_rs
        && ((((mf1 & M1_CLING_RS) !== 0) && (data.mlet | 0) !== S_MIMIC_RS)
            || (mf1 & M1_FLY_RS) !== 0);
    if (ceiling_hider && !has_ceiling_rs()) return false;
    if (sensemon(mtmp) && distu_rs(mtmp.mx | 0, mtmp.my | 0) <= 2) return false;

    if ((data.mlet | 0) === S_MIMIC_RS) {
        /* The mimic needs to be awake to disguise itself as something else. */
        if ((mtmp.msleeping | 0) || (mtmp.mfrozen | 0))
            return false;
        await set_mimic_sym(mtmp);
        return true;
    } else if ((game.level?.at?.(mtmp.mx | 0, mtmp.my | 0)?.typ | 0) === ROOM) {
        mtmp.mundetected = 1;
        return true;
    }
    return false;
}

function has_ceiling_rs() {
    const uz = game.u?.uz;
    if (!uz) return true;
    return !(In_endgame(uz) && !Is_earthlevel_rs(uz));
}

function Is_earthlevel_rs(lev) {
    return Is_earthlevel(lev);
}

/* C monmove.c:177-180 distu(x, y) — dx*dx + dy*dy from the hero. */
function distu_rs(x, y) {
    const u = game.u;
    if (!u) return 0;
    const dx = (x | 0) - (u.ux | 0), dy = (y | 0) - (u.uy | 0);
    return (dx * dx) + (dy * dy);
}

/* C ref: mon.c:4687-4711 — maybe_unhide_at(x, y): if a monster (or the hero)
 * at (x,y) is undetected and the terrain/object situation no longer
 * supports hiding there, call hideunder() to try to re-hide.
 * void maybe_unhide_at(coordxy x, coordxy y) */
export function maybe_unhide_at(x, y) {
    const M1_CONCEAL = 0x00000080; /* monflag.h */
    const S_EEL = 57;

    let mtmp = null;
    let undetected = false;
    let trapped = false;

    /* C: mtmp = m_at(x, y) — scan fmon chain for a live monster at (x, y). */
    for (let m = game.fmon; m; m = m.nmon) {
        if ((m.mhp | 0) > 0 && m.mx === x && m.my === y) {
            mtmp = m;
            break;
        }
    }
    if (mtmp !== null) {
        undetected = !!mtmp.mundetected;
        trapped = !!mtmp.mtrapped;
    } else if (u_at(x, y)) {
        mtmp = game.youmonst;
        undetected = !!game.u.uundetected;
        trapped = !!game.u.utrap;
    } else {
        return;
    }

    /* C mon.c:4704-4710. The `mtmp->data` dereferences sit INSIDE C's `&&`
     * chain, so C evaluates them only once `undetected` is true; hoisting
     * them above the `if` (as this port used to) made a *lazy* read eager and
     * threw on records where C never looks at ->data at all (that eager read
     * is what forced the third, reordered copy in js/cmd.js). Written here as
     * the same short-circuiting expression C has.
     *   hides_under(ptr) = ((ptr)->mflags1 & M1_CONCEAL) != 0  [mondata.h:35]
     *   OBJ_AT(x,y)      = svl.level.objects[x][y] != 0 */
    if (undetected
        && (((((mtmp.data.mflags1 | 0) & M1_CONCEAL) !== 0)
             && (!(game.level?.levelObjects?.[x]?.[y] ?? null) || trapped
                 || !can_hide_under_obj(game.level?.levelObjects?.[x]?.[y] ?? null)))
            || ((mtmp.data.mlet | 0) === S_EEL && !is_pool(x, y))))
        hideunder(mtmp);
}

/* C ref: mondata.h macros used only by m_poisongas_ok (mon.c:311) — local
 * copies rather than imports, matching this file's is_vampshifter/S_EEL
 * per-callsite duplication convention for macro-shaped C helpers. */
function m_poisongas_ok_nonliving(ptr) {
    const is_undead = ((ptr.mflags2 | 0) & 0x00000002) !== 0; /* M2_UNDEAD */
    const is_golem = (ptr.mlet | 0) === 55; /* S_GOLEM */
    const weirdnonliving = is_golem || (ptr.mlet | 0) === 22; /* S_VORTEX */
    return is_undead || (ptr.pmidx | 0) === PM_MANES || weirdnonliving;
}

function is_vampshifter_mon(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD
        || mon.cham === PM_VLAD_THE_IMPALER;
}

function m_poisongas_ok_breathless(ptr) {
    return ((ptr.mflags1 | 0) & 0x00000400) !== 0; /* M1_BREATHLESS */
}

function m_poisongas_ok_immune_poisongas(ptr) {
    return (ptr.pmidx | 0) === PM_HEZROU || (ptr.pmidx | 0) === PM_VROCK;
}

export function m_poisongas_ok(mtmp) {
    const is_you = is_youmonst(mtmp);

    /* Non living, non breathing, immune monsters are not concerned */
    if (m_poisongas_ok_nonliving(mtmp.data) || is_vampshifter_mon(mtmp)
        || m_poisongas_ok_breathless(mtmp.data) || m_poisongas_ok_immune_poisongas(mtmp.data))
        return M_POISONGAS_OK;
    /* not is_swimmer(); assume that non-fish are swimming on
       the surface and breathing the air above it periodically
       unless located at water spot on plane of water */
    const px = is_you ? game.u.ux : mtmp.mx;
    const py = is_you ? game.u.uy : mtmp.my;
    if (((mtmp.data.mlet | 0) === 57 /* S_EEL */ || Is_waterlevel(game.u.uz))
        && is_pool(px, py))
        return M_POISONGAS_OK;
    /* exclude monsters with poison gas breath attack:
       adult green dragon and Chromatic Dragon (and iron golem,
       but nonliving() and breathless() tests also catch that) */
    if (attacktype_fordmg(mtmp.data, 12 /* AT_BREA */, 7 /* AD_DRST */)
        || attacktype_fordmg(mtmp.data, 12 /* AT_BREA */, 242 /* AD_RBRE */))
        return M_POISONGAS_OK;
    if (is_you) {
        const magBreathProp = game.u.uprops?.[MAGICAL_BREATHING];
        const magicalBreathing = !!((magBreathProp?.intrinsic | 0) || (magBreathProp?.extrinsic | 0));
        const isBreathless = magicalBreathing || m_poisongas_ok_breathless(mtmp.data);
        if (game.u.uinvulnerable || isBreathless || game.u.uinwater)
            return M_POISONGAS_OK;
    }
    const poisonRes = is_you
        ? (() => {
              const p = game.u.uprops?.[POISON_RES];
              return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
          })()
        : Resists_Elem(mtmp, POISON_RES); /* C mon.c:355: includes equipment. */
    if (poisonRes) return M_POISONGAS_MINOR;
    return M_POISONGAS_BAD;
}

/* C ref: dogmove.c:143-153 cursed_object_at(x,y) — TRUE if any object in the
 * pile at (x,y) is cursed. No RNG. */
function cursed_object_at_hu(x, y) {
    for (let otmp = game.level?.levelObjects?.[x]?.[y] ?? null; otmp; otmp = otmp.nexthere ?? null) {
        if (otmp.cursed) return true;
    }
    return false;
}

export async function kill_genocided_monsters() {
    let mtmp, mtmp2, kill_cham, mndx;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (mtmp.mhp <= 0)
            continue;
        /* C mon.c:5660 mndx = monsndx(mtmp->data); mondata.h:10
         * `#define monsndx(ptr) ((ptr)->pmidx)` — permonst has no `mndx`. */
        mndx = mtmp.data.pmidx;
        kill_cham = (ismnum(mtmp.cham)
                     && ((game.mvitals?.[mtmp.cham]?.mvflags | 0) & G_GENOD));
        if (((game.mvitals?.[mndx]?.mvflags | 0) & G_GENOD) || kill_cham) {
            if (ismnum(mtmp.cham) && !kill_cham)
                await newcham(mtmp, null, NC_SHOW_MSG); /* C mon.c:5665 */
            else
                await mondead(mtmp);
        }
        if (mtmp.minvent)
            kill_eggs(mtmp.minvent);
    }

    kill_eggs(game.invent);
    kill_eggs(game.fobj);
    kill_eggs(game.gm?.migrating_objs);
    kill_eggs(game.level?.buriedobjlist);
}

export async function mcalcdistress() {
    for (let mtmp = game.fmon, mtmp2; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (!mtmp || mtmp.mhp <= 0 || (mtmp.mstate | 0) !== MON_FLOOR)
            continue;
        await m_calcdistress(mtmp);
    }
}

export function mon_animal_list(construct) {
    if (construct) {
        const SPECIAL_PM = monsPack.special_pm;
        const LOW_PM = 0;
        const animal_temp = [];
        let n = 0;

        for (let i = LOW_PM; i < SPECIAL_PM; i++) {
            // is_animal(mndx) checks (mons[i].mflags1 & M1_ANIMAL) !== 0
            // MONS_ROWS[i][6] is mflags1
            if ((MONS_ROWS[i][6] & M1_ANIMAL) !== 0) {
                animal_temp[n++] = i;
            }
        }

        // Allocate and copy the array to ga.animal_list
        if (game.ga === undefined) game.ga = {};
        game.ga.animal_list = animal_temp.slice(0, n);
        game.ga.animal_list_count = n;
    } else { /* release */
        if (game.ga === undefined) game.ga = {};
        if (game.ga.animal_list) {
            game.ga.animal_list = null;
        }
        game.ga.animal_list_count = 0;
    }
}

/* C ref: mon.c:1520-1638 — meatobj: for gelatinous cubes (and other engulfers).
 * Returns 0 if nothing eaten/engulfed, 1 if something was eaten/engulfed,
 * 2 if monster polymorphed, 1 if monster changed form but didn't die. */
export async function meatobj(mtmp) {
    let otmp, otmp2;
    let ptr, original_mnum = mtmp.mnum;
    let count = 0, ecount = 0;
    let buf = "";
    let otmpname;

    /* C mon.c:1541: pets eat through dog.c. */
    if (mtmp.mtame) return 0;

    /* eat organic objects, including cloth and wood, if present;
       engulf others, except huge rocks and metal attached to player */
    for (otmp = (game.level?.levelObjects?.[mtmp.mx]?.[mtmp.my]) ?? null; otmp; otmp = otmp2) {
        otmp2 = otmp.nexthere;

        /* avoid special items */
        if (is_mines_prize(otmp) || is_soko_prize(otmp))
            continue;

        /* touch sensitive items */
        if (otmp.otyp === CORPSE && (otmp.corpsenm === PM_DEATH_R || otmp.corpsenm === PM_FAMINE || otmp.corpsenm === PM_PESTILENCE)) {
            let ox = otmp.ox, oy = otmp.oy;
            let revived_it = await revive_corpse(otmp);

            newsym(ox, oy);
            if (!revived_it)
                continue;
            break;

        /* untouchable (or inaccessible) items */
        } else if ((otmp.otyp === CORPSE
                    && (otmp.corpsenm === PM_COCKATRICE || otmp.corpsenm === PM_CHICKATRICE)
                    && !resists_ston(mtmp))
                   || otmp.oclass === ROCK_CLASS
                   || otmp === game.u.uball || otmp === game.u.uchain
                   || otmp.otyp === SCR_SCARE_MONSTER) {
            continue;

        /* inedible items -- engulf these */
        } else if (!is_organic(otmp) || obj_resists(otmp, 5, 95)
                   || !await touch_artifact(otmp, mtmp)
                   || (otmp.otyp === AMULET_OF_STRANGULATION
                       || otmp.otyp === RIN_SLOW_DIGESTION)
                   || (otmp.opoisoned && !resists_poison(mtmp))
                   || (mstoning(otmp) && !resists_ston(mtmp))
                   || (otmp.otyp === GLOB_OF_GREEN_SLIME
                       && !slimeproof(mtmp.data))) {
            /* engulf */
            ++ecount;
            otmpname = (await distant_name_nc(otmp, doname_nc));
            if (ecount === 1)
                buf = Monnam(mtmp) + " engulfs " + otmpname + ".";
            else if (ecount === 2)
                buf = Monnam(mtmp) + " engulfs several objects.";
            obj_extract_self(otmp);
            await mpickobj(mtmp, otmp);

        /* lastly, edible items; yum! */
        } else {
            /* devour */
            ++count;
            if (cansee(mtmp.mx, mtmp.my)) {
                otmpname = (await distant_name_nc(otmp, doname_nc));
                if (game.flags.verbose)
                    pline_mon(mtmp, "%s eats %s!",
                              Monnam(mtmp), otmpname);
                if (otmp.oclass === SCROLL_CLASS
                    && objdescr_is(otmp, "YUM YUM"))
                    /* C ref: mon.c:1611 pline("Yum%c", otmp->blessed ? '!' : '.').
                     * js/display.js pline() takes one already-formatted string
                     * (no varargs/%-expansion), so the %c is expanded here. */
                    pline("Yum" + (otmp.blessed ? '!' : '.'));
            } else {
                Soundeffect(se_slurping_sound, 30); /* C mon.c:1625 */
                if (game.flags.verbose)
                    You_hear("a slurping sound.");
            }
            await m_consume_obj(mtmp, otmp);
            ptr = mtmp.mnum;
            if (ptr !== original_mnum)
                return mtmp.data ? 1 : 2; /* C tests the data pointer, not index 0. */
        }

        if (mtmp.minvis)
            newsym(mtmp.mx, mtmp.my);
    }

    if (ecount > 0) {
        if (cansee(mtmp.mx, mtmp.my) && game.flags.verbose && buf !== "")
            pline1(buf);
        else if (game.flags.verbose)
            You_hear("%s slurping sound%s.",
                     (ecount === 1) ? "a" : "several", plur(ecount));
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

/* C ref: mon.c:1643-1711 — meatcorpse: monster eats a corpse off the ground
 * (for purple worms and other voracious monsters).
 * Return value: 0 = nothing eaten, 1 = ate a corpse, 2 = died. */
export async function meatcorpse(mtmp) {
    let otmp, ptr, corpsepm;
    const original_mnum = mtmp.mnum;
    const x = mtmp.mx, y = mtmp.my;

    if (mtmp.mtame)
        return 0;

    /* skips past any globs */
    for (otmp = sobj_at(CORPSE, x, y); otmp;
         /* won't get back here if otmp is split or gets used up */
         otmp = nxtobj(otmp, CORPSE, true)) {

        corpsepm = permonstTemplate(otmp.corpsenm);
        /* skip some corpses */
        if (vegan(corpsepm) /* ignore veggy corpse even if omnivorous */
            /* don't eat harmful corpses */
            || (flesh_petrifies(corpsepm) && !resists_ston(mtmp)))
            continue;
        if (is_rider(corpsepm)) {
            const revived_it = await revive_corpse(otmp);

            newsym(x, y); /* corpse is gone; mtmp might be too so do this now
                             since we're bypassing the bottom of the loop */
            if (!revived_it)
                continue; /* revival failed? if so, corpse is gone */
            /* Successful Rider revival; unlike skipped corpses, don't
               just move on to next corpse as if nothing has happened. */
            break;
        }

        if (otmp.quan > 1)
            otmp = (await splitobj(otmp, 1));

        if (cansee(x, y) && canseemon(mtmp)) {
            /* call distant_name() for its possible side-effects even if
               the result won't be printed */
            const otmpname = await distant_name_nc(otmp, doname_nc);

            if (game.flags.verbose)
                pline_mon(mtmp, "%s eats %s!",
                          Monnam(mtmp), otmpname);
        } else {
            Soundeffect(se_masticating_sound, 50);
            if (game.flags.verbose)
                You_hear("a masticating sound.");
        }

        await m_consume_obj(mtmp, otmp);
        /* in case it polymorphed or died */
        /* C tests the data pointer for NULL; mnum 0 (giant ant) is a valid
         * form, so the death test must read mtmp.data, not the index. */
        ptr = mtmp.mnum;
        if (ptr !== original_mnum)
            return !mtmp.data ? 2 : 1;

        /* Engulf & devour is instant, so don't set meating */
        if (mtmp.minvis)
            newsym(x, y);

        return 1;
    }
    return 0;
}

/* constant: se_masticating_sound (sounds.h enum) — Soundeffect is a no-op
 * stub, so the exact value carries no observable behavior. */
const se_masticating_sound = 0;
/* C monflag.h:97 M1_NOEYES (no shared export in js/). */
const M1_NOEYES = 0x00001000;

function flesh_petrifies(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === 9 || (n | 0) === 10 || (n | 0) === 284;
}

function is_rider(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === PM_DEATH_R || (n | 0) === PM_FAMINE
        || (n | 0) === PM_PESTILENCE;
}

/* C mon.c:2451-2468 mm_displacement().  This is evaluated only when a
 * neighbour is occupied and the ordinary ALLOW_M aggression bit is absent;
 * keeping it here lets mfndpos admit exactly the cells a displacer may barge
 * through without changing the ordinary movement candidate set. */
const M3_DISPLACES_MK = 0x0400;

function mm_displacement_mk(magr, mdef) {
    const pa = magr?.data;
    const pd = mdef?.data;
    if (!pa || !pd || !((pa.mflags3 | 0) & M3_DISPLACES_MK)) return 0;
    if (((pd.mflags3 | 0) & M3_DISPLACES_MK)
        && ((magr.m_lev | 0) <= (mdef.m_lev | 0))) return 0;
    if ((magr.mx | 0) !== (mdef.mx | 0) && (magr.my | 0) !== (mdef.my | 0)
        && ((pd.pmidx ?? mdef.mndx ?? mdef.mnum) | 0) === PM_GRID_BUG) return 0;
    if ((mdef.mtrapped | 0) || ((mdef.wormno | 0) && count_wsegs(mdef))) return 0;
    const rider = is_rider(pa);
    if (!rider && (pa.msize | 0) < (pd.msize | 0)) return 0;
    return ALLOW_MDISP;
}

/* C mon.c:2385-2448 mm_2way_aggression() — the half of mm_aggression that
 * applies in both directions.  Only the W-tower pairing and the
 * zombie-maker-vs-zombifiable arm exist in 5.0. */
function mm_2way_aggression_mk(magr, mdef) {
    const uz = game.u?.uz;
    const same = (a, b) => !!a && !!b && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
    const wlev = same(uz, game.wiz1_level) || same(uz, game.wiz2_level)
        || same(uz, game.wiz3_level);
    if (wlev) {
        const dn = game.dndest;
        const inTower = (x, y) => !!dn && !!(dn.nlx | 0)
            && x >= (dn.nlx | 0) && x <= (dn.nhx | 0)
            && y >= (dn.nly | 0) && y <= (dn.nhy | 0);
        const hin = inTower(game.u.ux | 0, game.u.uy | 0);
        const ain = inTower(magr.mx | 0, magr.my | 0);
        const din = inTower(mdef.mx | 0, mdef.my | 0);
        if (hin ? (!ain || !din) : (ain || din))
            return 0;
    }
    if (zombie_maker(magr) && zombie_form(mdef.data) !== NON_PM) {
        if ((magr.mgenmklev | 0) && (mdef.mgenmklev | 0))
            return 0;
        const uniq = (m) => ((monGeno(m.data?.pmidx ?? m.mndx ?? m.mnum) | 0) & 0x1000) !== 0;
        if (!Is_stronghold(uz) && !uniq(magr) && !uniq(mdef))
            return ALLOW_M | ALLOW_TM;
    }
    return 0;
}

/* C mon.c:2451-2468 mm_aggression() */
function mm_aggression_mk(magr, mdef) {
    const mndx = (magr.data?.pmidx ?? magr.mndx ?? magr.mnum) | 0;
    if ((magr.mtame | 0) && (mdef.mtame | 0))
        return 0;
    if ((mndx === PM_PURPLE_WORM_MK || mndx === PM_BABY_PURPLE_WORM)
        && (mdef.data?.pmidx ?? mdef.mndx ?? mdef.mnum) === PM_SHRIEKER)
        return ALLOW_M | ALLOW_TM;
    return mm_2way_aggression_mk(magr, mdef) | mm_2way_aggression_mk(mdef, magr);
}

/* C mon.c:1338-1368 — dispose of the contents of an eaten container. */
async function meatbox_consume(mtmp, box) {
    if (!box?.cobj || !isok(mtmp.mx | 0, mtmp.my | 0))
        return;
    const engulf = (mtmp.mndx ?? mtmp.data?.pmidx ?? -1) === PM_GELATINOUS_CUBE;
    if (!engulf && cansee(mtmp.mx, mtmp.my))
        await pline('%s contents spill out onto the %s.',
            lifesave_s_suffix(The_rc(await distant_name_nc(box, xname))), surface(mtmp.mx, mtmp.my));
    while (box.cobj) {
        const obj = box.cobj;
        obj_extract_self(obj);
        if (box.otyp === ICE_BOX) removed_from_icebox(obj);
        if (engulf)
            await mpickobj(mtmp, obj);
        else if (!await flooreffects(obj, mtmp.mx, mtmp.my, ''))
            place_object(obj, mtmp.mx | 0, mtmp.my | 0);
    }
}

/* C mon.c:1392-1452 — consume an object after a monster has accepted it.
 * The object deletion and the ordinary food side effects are kept here rather
 * than duplicated in meatobj/meatcorpse.  Side effects follow C's order,
 * including its CORPSE-only corpsenm assignment below; consuming the
 * object itself is still essential (and preserves delobj's obj_resists draw). */
export async function m_consume_obj(mtmp, otmp) {
    const ispet = !!(mtmp?.mtame | 0);

    /* C: non-pets heal by the raw objects[].oc_weight column. */
    if (!ispet && (mtmp.mhp | 0) < (mtmp.mhpmax | 0))
        healmon(mtmp, OC_WEIGHT[otmp.otyp | 0] | 0, 0);

    if (Has_contents(otmp))
        await meatbox_consume(mtmp, otmp);

    /* C's ball/chain cases call unpunish before deleting (or instead of it). */
    if (otmp === game.u?.uball) {
        await unpunish();
        await delobj_real(otmp);
        return;
    }
    if (otmp === game.u?.uchain) {
        await unpunish();
        return;
    }

    const corpsenm = ((otmp.otyp | 0) === CORPSE) ? (otmp.corpsenm | 0) : NON_PM;
    const deadmimic = ((otmp.otyp | 0) === CORPSE)
        && (corpsenm === PM_SMALL_MIMIC || corpsenm === PM_LARGE_MIMIC
            || corpsenm === PM_GIANT_MIMIC);
    const slimer = (otmp.otyp | 0) === GLOB_OF_GREEN_SLIME;
    const poly = polyfood(otmp);
    const grow = mlevelgain(otmp);
    const heal = mhealup(otmp);
    const eyes = (otmp.otyp | 0) === CARROT;
    const mstone = mstoning(otmp);
    const vis = canseemon(mtmp);

    /* C: delobj() is deliberately before all aftermath effects. */
    await delobj_real(otmp);

    if (poly || slimer)
        await newcham(mtmp, slimer ? PM_GREEN_SLIME : null,
                vis ? NC_SHOW_MSG : NO_NC_FLAGS);
    if (grow && (ispet ? (mtmp.m_lev | 0) < ((mtmp.data?.mlevel | 0) + 15) : true))
        await grow_up(mtmp, null);
    /* C mon.c:1432-1441 — petrifying food either turns a golem into a stone
     * golem or creates a statue/rock through monstone(). */
    if (mstone) {
        if (poly_when_stoned(mtmp.data))
            await mon_to_stone(mtmp);
        else if (!resists_ston(mtmp)) {
            if (vis)
                await pline_mon(mtmp, '%s turns to stone!', Monnam(mtmp));
            await monstone(mtmp);
        }
    }
    if (heal)
        healmon(mtmp, mtmp.mhpmax | 0, 0);
    /* C muse.c:2872 mcureblindness(): restore sight and report visible eyes;
     * the haseyes() test is !(mflags1 & M1_NOEYES), monflag.h:97. */
    if ((eyes || heal) && !mtmp.mcansee) {
        mtmp.mcansee = 1;
        mtmp.mblinded = 0;
        if (canseemon(mtmp) && !((mtmp.data.mflags1 | 0) & M1_NOEYES))
            await pline_mon(mtmp, '%s can see again.', Monnam(mtmp));
    }
    /* C mon.c:1446 quickmimic(): eating a mimic corpse ends a pet's
     * disguise meal immediately.  The shared dogmove helper performs the
     * meal/taming state cleanup and redraw. */
    if (ispet && deadmimic)
        await quickmimic_mk(mtmp);
    if (otmp.otyp === EGG && corpsenm === PM_PYROLISK)
        await explode(mtmp.mx, mtmp.my, -11, d_ml(3, 6), 0, EXPL_FIERY);
    if (corpsenm !== NON_PM)
        await mon_givit(mtmp, permonstTemplate(corpsenm));
}

/* obj.h:435-436 — use the canonical achievement-object ID checks. */
function is_mines_prize(otmp) { return is_mines_prize_real(otmp); }

function is_soko_prize(otmp) { return is_soko_prize_real(otmp); }

function mstoning(otmp) {
    if (!ofood(otmp) || !ismnum(otmp.corpsenm))
        return false;
    return flesh_petrifies(permonstTemplate(otmp.corpsenm | 0));
}

/* C obj.h:325-326 — the two special corpse foods consumed by monsters. */
function mlevelgain(otmp) {
    return ofood(otmp) && (otmp.corpsenm | 0) === PM_WRAITH;
}

function mhealup(otmp) {
    return ofood(otmp) && (otmp.corpsenm | 0) === PM_NURSE;
}

/* C o_init.c:352-363 — compare an object's randomized unidentified
 * description.  getObjDescr owns the shuffled description table; null objects
 * and objects without an appearance simply cannot match. */

/* C sndprocs.h:272 Soundeffect(seid, vol) — compiled empty without
 * SND_LIB_INTEGRATED; the tty game has no soundlib, so a no-op is faithful.
 * seffects.h enum sound_effect_entries (se_zero_invalid = 0 first). */
export const se_crunching_sound = 60, se_slurping_sound = 154;
export function Soundeffect(se, vol) {
}

/* C pline.c:113 pline1 — literal topline message without formatting or a
 * separate pager operation.  The display port already accepts a complete
 * string, so this is the same synchronous call shape used by nearby ports. */
function pline1(buf) {
    pline(buf);
}

/* Stub: plur — not yet ported */
function plur(n) {
    return (n === 1) ? "" : "s";
}

/* RIN_SLOW_DIGESTION constant */
const RIN_SLOW_DIGESTION = 193;

export function set_ustuck(mtmp) {
    /* C mon.c:3423-3427 iflags.sanity_check/debug_fuzzer m_next2u() check
     * only reports through impossible(); not ported (impossible-only).
     * C mon.c:3429 disp.botl = TRUE: the status line must be redrawn whenever
     * the stuck monster changes, including when clearing an attachment. */
    if (game.disp)
        game.disp.botl = 1;
    game.u.ustuck = mtmp;
    if (!game.u.ustuck) {
        game.u.uswallow = 0;
        game.u.uswldtim = 0;
    }
}

/* C mon.c:5597-5621 — cancel hatch timers for eggs belonging to a genocided
 * species, recursively covering container contents. */
function kill_eggs(objlist) {
    for (let otmp = objlist; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === EGG) {
            if (dead_species(otmp.corpsenm | 0, true))
                stop_timer(HATCH_EGG, obj_to_any(otmp));
        } else if (Has_contents(otmp)) {
            kill_eggs(otmp.cobj);
        }
    }
}

/* Stub: mondead — not yet ported */
/* C objects.h AMULET_OF_LIFE_SAVING otyp (no shared otyp export in js/). */
const AMULET_OF_LIFE_SAVING = 202;

/* C mon.c:2827-2836: only a worn life-saving amulet can save this monster. */
export function mlifesaver(mon) {
    if (!lifesave_nonliving(mon.data) || is_vampshifter_mon(mon)) {
        const amulet = which_armor(mon, W_AMUL);
        if (amulet?.otyp === AMULET_OF_LIFE_SAVING) return amulet;
    }
    return null;
}

/* C mon.c:2839-2884. Called before any death counters, drops or detachment. */
export async function lifesaved_monster(mon) {
    const amulet = mlifesaver(mon);
    if (!amulet) return;
    if (cansee(mon.mx, mon.my)) {
        await pline('But wait...');
        await pline(`${lifesave_s_suffix(Monnam_wm(mon))} medallion begins to glow!`);
        lifesave_discover_object(AMULET_OF_LIFE_SAVING, true, true, true);
        if (canseemon(mon)) {
            const explodes = attacktype(mon.data, AT_EXPL)
                || attacktype(mon.data, AT_BOOM);
            await pline(`${Monnam_wm(mon)} ${explodes ? 'reconstitutes' : 'looks much better'}!`);
        }
        await pline('The medallion crumbles to dust!');
    }
    await lifesave_m_useup(mon, amulet);
    check_gear_next_turn(mon);
    const survives = !((game.mvitals?.[mon.data.pmidx]?.mvflags | 0) & G_GENOD);
    mon.mcanmove = 1;
    mon.mfrozen = 0;
    if (mon.mtame && !mon.isminion) {
        mon._zeroHpOnGrid = true; /* still on C's monster grid while mhp == 0 */
        try { await wary_dog(mon, !survives); } finally { mon._zeroHpOnGrid = false; }
    }
    mon.mhpmax = Math.max(mon.mhpmax | 0, (mon.m_lev | 0) + 1, 10);
    mon.mhp = mon.mhpmax;
    if (!survives) {
        if (cansee(mon.mx, mon.my))
            await pline(`Unfortunately, ${mon_nam_wm(mon)} is still genocided...`);
        mon.mhp = 0;
    }
}

export async function mondead(mtmp) {
    if (!mtmp)
        return;
    const beSad = !!game.iflags?.sad_feeling;
    if (game.iflags) game.iflags.sad_feeling = false;
    let mx = mtmp.mx | 0, my = mtmp.my | 0;
    /* FF_DEATH_TRACE is deliberately opt-in and RNG-neutral.  It records the
     * map state at the exact mondead boundary, which is the only useful point
     * for diagnosing cells hidden by a monster until its death repaint. */
    if (typeof process !== 'undefined' && ENV?.FF_DEATH_TRACE === '1') {
        const cell = game.level?.at(mx, my);
        pushRngLogEntry(`^mondead[x=${mx},y=${my},mndx=${(mtmp.mndx ?? mtmp.mnum ?? -1) | 0},` +
            `mhp=${mtmp.mhp | 0},typ=${cell?.typ ?? -1},seenv=${cell?.seenv ?? -1},` +
            `lit=${cell?.lit ? 1 : 0},waslit=${cell?.waslit ? 1 : 0},` +
            `minvent=${mtmp.minvent ? 1 : 0},wormno=${mtmp.wormno | 0}]`);
    }
    mtmp.mhp = 0; /* C mon.c: "be sure" */
    /* C mon.c:3093→3174: from `mhp = 0` until m_detach()'s mon_leaving_level()
     * remove_monster(), the dying monster is STILL IN svl.level.monsters —
     * MON_AT()/m_at() answer "occupied" for its square through the whole death
     * sequence, including kop_revival()'s makemon() → enexto_core() → goodpos()
     * (mon.c:3145-3163).  This port's fmon-walking m_at family models only the
     * post-detach state (dead node linked until the dmonsfree purge, hidden by
     * the mhp<1 guard); `_dyingInGrid` marks the pre-detach window those guards
     * must not hide (fx21-artifact_hit-01653: the revived Kop was placed on the
     * dying Kop's square, (51,7), where C — which still sees it in the grid —
     * relocates to (51,5)).  Cleared at every mondead exit past this point. */
    mtmp._dyingInGrid = true;
    await lifesaved_monster(mtmp);
    if ((mtmp.mhp | 0) > 0) { mtmp._dyingInGrid = false; return; }
    /* C mon.c:3096-3098: a killed vampire in another form rises before
     * death bookkeeping; newcham() also consumes the new form's gender/HP RNG. */
    if (is_vampshifter_mon(mtmp) && await vamprises(mtmp))
        { mtmp._dyingInGrid = false; return; }
    if (beSad) await pline('You have a sad feeling for a moment, then it passes.');
    /* C mon.c:3103-3104 */
    if ((mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum) === PM_STEAM_VORTEX)
        create_gas_cloud(mx, my, rn2(10) + 5, 0); /* harmless */
    /* C mon.c:3108-3112: grddead may park the guard at <0,0>. */
    if (mtmp.isgd && !await grddead(mtmp))
        { mtmp._dyingInGrid = false; return; }
    mx = mtmp.mx | 0; my = mtmp.my | 0;
    const mptr = mtmp.data; /* preserve the pre-unshapeshift light source */
    /* C mon.c:3113-3123 — restore chameleon, lycanthropes to true form at
     * death, before mvitals and m_detach.  mon_explodes (explode.c:1053-1058)
     * formats the killer name from mon->data AFTER this mondead, so a
     * chameleon exploding as a freezing sphere is "the chameleon's explosion". */
    if (ismnum(mtmp.cham)) {
        set_mon_data(mtmp, permonstTemplate(mtmp.cham | 0));
        mtmp.cham = NON_PM;
    } else if ((mtmp.mnum | 0) === PM_WEREJACKAL)
        set_mon_data(mtmp, permonstTemplate(PM_HUMAN_WEREJACKAL));
    else if ((mtmp.mnum | 0) === PM_WEREWOLF)
        set_mon_data(mtmp, permonstTemplate(PM_HUMAN_WEREWOLF));
    else if ((mtmp.mnum | 0) === PM_WERERAT)
        set_mon_data(mtmp, permonstTemplate(PM_HUMAN_WERERAT));
    /* C mon.c:3121 svm.mvitals[mndx].died++ (no rng), capped at 255. */
    const mndx = (mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if (game.mvitals && mndx >= 0) {
        const mv = (game.mvitals[mndx] ||= { died: 0, mvflags: 0 });
        if ((mv.died | 0) < 255)
            mv.died = (mv.died | 0) + 1;
        // C mon.c:3141-3144: a dead mail daemon prevents further delivery.
        if (mndx === PM_MAIL_DAEMON) mv.mvflags |= G_GENOD;
    }
    /* C mon.c:3137-3139: identity survives polymorphing the quest leader. */
    if (mtmp.m_id === game.svq?.quest_status?.leader_m_id)
        game.svq.quest_status.leader_is_dead = true;
    await kop_revival(mtmp);
    record_death_achievement(mndx, mtmp);
    /* C mon.c:3170-3171: retire remembered 'I' before m_detach.  The test is
     * levl[][].glyph (hero memory), not glyph_at(): underwater the painted
     * cells are blanked while memory keeps the 'I'. */
    if (game.level?.at(mx, my)?.remembered_glyph?.cls === GLYPHCLS_INVIS)
        unmap_object(mx, my);
    /* C mon.c:2741-2742 m_detach(): a dying leashed monster releases its leash. */
    if (mtmp.mleashed)
        m_unleash_mk(mtmp, false);
    /* C mon.c:2744-2746,2702-2703: m_detach follows death bookkeeping. */
    if (mx > 0 && emits_light(mptr))
        del_light_source(LS_MONSTER, monst_to_any(mtmp));
    mtmp.mtrapped = 0;
    await unstuck_mk(mtmp);
    /* C mon.c:2707-2710, the wormno arm of mon_leaving_level(), which m_detach()
     * calls FIRST and which the inlined detach below stands in for:
     *     if (mon->wormno) remove_worm(mon); else remove_monster(mx, my);
     * The else arm is the fmon unlink just below.  The wormno arm is not — a
     * worm's segments are not fmon entries, they live in js/worm.js's _seg_occ,
     * this port's stand-in for svl.level.monsters[][].  Without it every dead
     * worm left its whole body behind as PHANTOM occupancy: nothing painted
     * wrong, but m_at() answered "occupied" where C answers "empty", which
     * silently SUPPRESSES the makemon() draws C makes there (makemon.c:1193's
     * MON_AT early return).  Position is C's: before the fmon unlink. */
    if (mtmp.wormno)
        remove_worm_mk(mtmp);
    mtmp.mstate = (mtmp.mstate | 0) | MON_DETACH;
    game.iflags.purge_monsters = (game.iflags.purge_monsters | 0) + 1; /* C mon.c:2796 m_detach */
    /* C m_detach() has now vacated the grid cell (mon_leaving_level →
     * remove_monster): the pre-detach `_dyingInGrid` window ends here. */
    mtmp._dyingInGrid = false;
    /* C mon.c:2718-2720, mon_leaving_level(), is explicit that mx/my must NOT
     * be zeroed here:
     *     #if 0   / * mustn't do this; too many places assume that the stale
     *              * monst->mx,my values are still valid * /
     *         mon->mx = mon->my = 0; / * off normal map * /
     *     #endif
     * This body deliberately leaves both fields at the death square (the
     * KEYSTONE-A note above says so) — the concrete reason is explode.c:1048-
     * 1058 mon_explodes(), which calls mondead(mon) and THEN reads mon->mx/
     * mon->my as the blast centre passed to explode(); zeroing them would blow
     * every AT_BOOM/AT_EXPL death (gas spore, exploding sphere) up at <0,0>
     * and silently drop the RNG draws a real blast makes.  js/uhitm.js's
     * unlink_mon() carries the same rule.  Do not add a `mtmp.mx = mtmp.my = 0`
     * here. */
    /* C mon.c:2711 mon_leaving_level -> newsym(mx, my): repaint the cell the
     * monster just vacated.  RNG-free. */
    if (mx > 0) newsym(mx, my); /* mon_leaving_level: parked guard is off-map */
    if (mtmp.iswiz) wizdeadorgone(); /* C mon.c:2761-2762, before relobj */
    await quest_monster_died(mtmp);
    await relobj_md(mtmp);
    if (mtmp.m_id === game.stealmid) thiefdead(); // C mon.c:2782-2783
    if (mtmp.isshk) await shkgone(mtmp); // C mon.c:2784-2785
    /* C mon.c:2786-2787, near the END of m_detach():
     *     if (mtmp->wormno) wormgone(mtmp);
     * remove_worm() above took the body off the map; this discards the segment
     * chain and RELEASES THE SLOT, which is the half that compounds: without
     * it wheads[]/wtails[] leak one entry per dead worm and get_wormno() stops
     * handing out the numbers C hands out.  Order is C's — after
     * mon_leaving_level, not instead of it; both fire for the same worm, and
     * toss_wsegs()'s `if (curr->wx)` guard is what keeps the second one from
     * repainting cells remove_worm() has already zeroed. */
    if (mtmp.wormno)
        wormgone_mk(mtmp);
    /* C mon.c:2799-2801 m_detach() tail: hero is thrown from his steed when it
     * dies or gets genocided. */
    if (game.u && mtmp === game.u.usteed)
        await dismount_steed_mk(DISMOUNT_GENERIC);
}

const PM_ORC_NC = 72;

const PM_GIANT_NC = 169;

const PM_ELF_NC = 264;

const PM_SANDESTIN_NC = 301;

const PM_CHAMELEON_NC = 327;

/* obj.h Is_dragon_scales/Is_dragon_mail otyp bands — select_newcham_form()'s
 * `case NON_PM:` dragon-armor check.  Same values js/makemon.js already
 * anchors independently (:2863-2864, :4788-4789) for its own muse_newcham_mon. */
const GRAY_DRAGON_SCALE_MAIL_NC = 101;

const YELLOW_DRAGON_SCALE_MAIL_NC = 110;

const GRAY_DRAGON_SCALES_NC = 111;

const YELLOW_DRAGON_SCALES_NC = 120;

const PM_JABBERWOCK_NC = 178;

const PM_STUDENT_NC = 369;

const PM_APPRENTICE_NC = 382;

/* C monflag.h */
const M1_NOTAKE_NC = 0x00000800;

const M1_NOHEAD_NC = 0x00008000;

const M1_HUMANOID_NC = 0x00020000;

const M1_ANIMAL_NC = 0x00040000;

const M2_NOPOLY_NC = 0x00000001;

/* C mondata.h:66/54/55/93/166/157/213 and monst.h:217. */
function is_animal_nc(ptr) { return ((ptr.mflags1 | 0) & M1_ANIMAL_NC) !== 0; }

function humanoid_nc(ptr) { return ((ptr.mflags1 | 0) & M1_HUMANOID_NC) !== 0; }

function notake_nc(ptr) { return ((ptr.mflags1 | 0) & M1_NOTAKE_NC) !== 0; }

function has_head_nc(ptr) { return ((ptr.mflags1 | 0) & M1_NOHEAD_NC) === 0; }

function polyok_nc(ptr) { return ((ptr.mflags2 | 0) & M2_NOPOLY_NC) === 0; }

function is_placeholder_nc(mndx) {
    return mndx === PM_ORC_NC || mndx === PM_GIANT_NC
        || mndx === PM_ELF_NC || mndx === PM_HUMAN;
}

/* C mon.c:4995 isspecmon — shopkeeper / priest / vault guard / quest leader. */
function isspecmon_nc(mon) {
    return !!(mon.isshk || mon.ispriest || mon.isgd
              || (game.quest_status && mon.m_id === game.quest_status.leader_m_id));
}

/* C mondata.h:192 pm_invisible(ptr) — an identity test against two forms, NOT
 * an mflags1 bit (PM_BLACK_LIGHT / PM_STALKER are this file's locals). */
function pm_invisible_nc(mndx) {
    return mndx === PM_STALKER || mndx === PM_BLACK_LIGHT;
}

/* C role.c urole[].guardnum, in roles[] order (Arc, Bar, Cav, Hea, Kni, Mon,
 * Pri, Rog, Ran, Sam, Tou, Val, Wiz — Rogue precedes Ranger).  Read off role.c
 * and resolved to 5.0 mons[] rows by NAME via js/makemon_pmnames.json; note
 * ninja (378) is NOT a guardian and is deliberately absent. */
const ROLE_GUARDNUM_NC = [
    369, /* Arc: student */      370, /* Bar: chieftain */
    371, /* Cav: neanderthal */  372, /* Hea: attendant */
    373, /* Kni: page */         374, /* Mon: abbot */
    375, /* Pri: acolyte */      377, /* Rog: thug */
    376, /* Ran: hunter */       379, /* Sam: roshi */
    380, /* Tou: guide */        381, /* Val: warrior */
    382, /* Wiz: apprentice */
];

/* C gu.urole.guardnum.  js/makemon.js keys the same lookup on
 * game.flags.initrole; NON_PM when the role is unknown, which makes the
 * "avoid own role's guardian" test simply never fire. */
function guardnum_nc() {
    const roleIx = (game.flags?.initrole ?? -1) | 0;
    return (roleIx >= 0 && roleIx < ROLE_GUARDNUM_NC.length)
        ? ROLE_GUARDNUM_NC[roleIx] : NON_PM;
}

/* C mon.c:4941 pickvampshape(mon) — which form a vampire takes. */
function pickvampshape(mon) {
    let mndx = mon.cham | 0;
    let wolfchance = 10;
    /* avoid picking monsters with lowercase display symbols ('d' for wolf
       and 'v' for fog cloud) on rogue level */
    const uppercase_only = Is_rogue_level(game.u?.uz);

    switch (mndx) {
    case PM_VLAD_THE_IMPALER_NC:
        /* ensure Vlad can keep carrying the Candelabrum */
        if (mon_has_special_nc(mon))
            break; /* leave mndx as is */
        wolfchance = 3;
        /* FALLTHRU */
    case PM_VAMPIRE_LEADER_NC: /* vampire lord or Vlad can become wolf */
        if (!rn2(wolfchance) && !uppercase_only
            /* don't pick a walking form if that would lead to immediate
               drowning or immolation and reversion to vampire form */
            && !is_pool_or_lava(mon.mx, mon.my)) {
            mndx = PM_WOLF_NC;
            break;
        }
        /* FALLTHRU */
    case PM_VAMPIRE_NC: /* any vampire can become fog or bat */
        mndx = (!rn2(4) && !uppercase_only) ? PM_FOG_CLOUD_NC : PM_VAMPIRE_BAT_NC;
        break;
    }

    /* return to base form if chosen poly target has been genocided
       or randomly if already in an alternate form (to prevent always
       switching back and forth between bat and fog) */
    if (mvitals_genod_nc(mndx)
        || ((mon.mnum | 0) !== (mon.cham | 0) && !rn2(4)))
        return mon.cham | 0;

    return mndx;
}

/* C mon.c:5228 accept_newcham_form(mon, mndx) — returns the permonst to take on,
 * or null.  JS returns the mndx (or NON_PM); callers resolve via
 * permonstTemplate, since this port identifies forms by index not pointer. */
function accept_newcham_form(mon, mndx) {
    if (mndx === NON_PM)
        return NON_PM;
    const mdat = permonstTemplate(mndx);
    if (!mdat)
        return NON_PM;
    if (mvitals_genod_nc(mndx))
        return NON_PM;
    if (is_placeholder_nc(mndx))
        return NON_PM;
    /* select_newcham_form() might deliberately pick a player character type
       (random selection never does) which polyok() rejects */
    if (is_mplayer_nc(mndx))
        return mndx;
    /* shapeshifters are rejected by polyok() but allow a shapeshifter
       to take on its 'natural' form */
    if (is_shapeshifter_nc(mdat) && ismnum(mon.cham | 0) && mndx === (mon.cham | 0))
        return mndx;
    /* polyok() rules out M2_PNAME, M2_WERE, and all humans except Kops */
    return polyok_nc(mdat) ? mndx : NON_PM;
}

/* C mon.c:5117 validspecmon(mon, mndx) */
export function validspecmon(mon, mndx) {
    if (mndx === NON_PM)
        return true; /* caller wants random */
    if (accept_newcham_form(mon, mndx) === NON_PM)
        return false; /* geno'd or !polyok */
    if (isspecmon_nc(mon)) {
        const ptr = permonstTemplate(mndx);
        /* reject notake because object manipulation is expected
           and nohead because speech capability is expected */
        if (notake_nc(ptr) || !has_head_nc(ptr))
            return false;
    }
    return true; /* potential new form is ok */
}

/* C mon.c:4855 pick_animal() — ga.animal_list is built once from every
 * is_animal() permonst in [LOW_PM, SPECIAL_PM) and cached for the process. */
let _animal_list_nc = null;

function pick_animal() {
    if (!_animal_list_nc) {
        const list = [];
        for (let i = LOW_PM; i < SPECIAL_PM_NC; i++) {
            if (is_animal_nc(permonstTemplate(i)))
                list.push(i);
        }
        _animal_list_nc = list;
    }
    if (!_animal_list_nc) /* C mon.c:4861 assert(ga.animal_list != 0) */
        throw new Error('assertion failed: ga.animal_list != 0');
    let res = _animal_list_nc[rn2(_animal_list_nc.length)];
    /* rogue level should use monsters represented by uppercase letters only,
       but since chameleons aren't generated there we don't retry a lot */
    if (Is_rogue_level(game.u?.uz) && !monsym_isupper_nc(res))
        res = _animal_list_nc[rn2(_animal_list_nc.length)];
    return res;
}

/* C mon.c:5072 wiz_force_cham_form(mon) — monpolycontrol prompt. */
async function wiz_force_cham_form(mon) {
    const TRYLIMIT = 5;
    let monclass, mndx = NON_PM, tryct = TRYLIMIT;
    let pprompt = "Change " + noit_mon_nam(mon);
    const gpc = game.iflags?.getpos_coords;
    const parttwo = " @ " + coord_desc(mon.mx | 0, mon.my | 0,
                                      (gpc && gpc !== 'n') ? gpc : 'm')
                    + " into what?";
    const QBUFSZ = 128;
    const len = pprompt.length + parttwo.length;
    if (len >= QBUFSZ)
        pprompt = pprompt.slice(0, pprompt.length - (len - (QBUFSZ - 1)));
    pprompt += parttwo;
    do {
        if (tryct === TRYLIMIT - 1 && pprompt.length + 15 < QBUFSZ)
            pprompt = pprompt.slice(0, -1) + " kind of monster?";
        monclass = 0;
        let buf = await getlin_wf(pprompt);
        buf = mungspaces(buf || '');
        if (buf[0] === '\x1b')
            break;
        if (buf === '*' || buf.toLowerCase() === 'random') {
            mndx = NON_PM;
            break;
        }
        mndx = name_to_mon_wf(buf, null).mntmp;
        if (mndx === NON_PM) {
            const p = { value: NON_PM };
            monclass = name_to_monclass_wf(buf, p);
            mndx = p.value;
            if (monclass && mndx === NON_PM)
                mndx = mkclass_poly_nc(monclass);
        }
        if (ismnum(mndx)) {
            const [ok, m2] = validvamp_nc(mon, mndx, monclass);
            mndx = m2;
            if (ok)
                break;
            mndx = NON_PM;
        }
        await pline("It can't become that.");
    } while (--tryct > 0);
    if (!tryct)
        await pline("That's enough tries!");
    if (is_vampshifter_nc(mon)) {
        /* validvamp() updates *mndx_p even when it is called as a test
           (Vlad with the Candelabrum is forced to his own form) */
        const [ok, m2] = validvamp_nc(mon, mndx, monclass);
        mndx = m2;
        if (!ok)
            mndx = pickvampshape(mon); /* don't resort to arbitrary */
    }
    return mndx;
}

/* C mon.c:5157 select_newcham_form(mon) — pick the mndx of the next form.
 *
 * The quest-guardian arm's [PM_STUDENT, PM_APPRENTICE] span and gu.urole.guardnum
 * are read from ROLE_GUARDNUM_NC below rather than js/makemon.js's ROLE_GUARDNUM,
 * which is stale: its entries (379..393) run off the end of the 383-row 5.0
 * mons[] table.  That is a live defect in peaceMinded(), not one this port
 * introduces, and it is left alone here rather than fixed in passing. */
async function select_newcham_form(mon) {
    let mndx = NON_PM;
    let tryct;

    switch (mon.cham | 0) {
    case PM_SANDESTIN_NC:
        if (rn2(7))
            mndx = pick_nasty((MONS_ROWS[PM_ARCHON_NC][2] | 0) - 1);
        break;
    case PM_DOPPELGANGER_NC:
        if (!rn2(7)) {
            mndx = pick_nasty((MONS_ROWS[PM_JABBERWOCK_NC][2] | 0) - 1);
        } else if (rn2(3)) { /* role monsters */
            mndx = tt_doppel(mon);
        } else if (!rn2(3)) { /* quest guardians */
            mndx = rn1(PM_APPRENTICE_NC - PM_STUDENT_NC + 1, PM_STUDENT_NC);
            /* avoid own role's guardian */
            if (mndx === guardnum_nc())
                mndx = NON_PM;
        } else { /* general humanoids */
            tryct = 5;
            do {
                mndx = rn1(SPECIAL_PM_NC - LOW_PM, LOW_PM);
                const ptr = permonstTemplate(mndx);
                if (humanoid_nc(ptr) && polyok_nc(ptr))
                    break;
            } while (--tryct > 0);
            if (!tryct)
                mndx = NON_PM;
        }
        break;
    case PM_CHAMELEON_NC:
        if (!rn2(3))
            mndx = pick_animal();
        break;
    case PM_VLAD_THE_IMPALER_NC:
    case PM_VAMPIRE_LEADER_NC:
    case PM_VAMPIRE_NC:
        mndx = pickvampshape(mon);
        break;
    case NON_PM: { /* ordinary — dragon-scale-driven form, no RNG */
        /* C mon.c:5197-5206.  Was an empty branch: every EXISTING caller of
         * this function arrives with mon.cham already set to a real
         * shapechanger index (PM_SANDESTIN/DOPPELGANGER/CHAMELEON/vampire
         * family), so `mon.cham === NON_PM` was unreachable here until
         * newcham()'s own guard above was fixed to fall through for an
         * ordinary monster — see that fix's comment.  Deterministic: a
         * monster wearing dragon scales or dragon scale mail becomes the
         * matching dragon type; draws no RNG either way. */
        const m_armr = which_armor(mon, W_ARM);
        if (m_armr) {
            const otyp = m_armr.otyp | 0;
            if (otyp >= GRAY_DRAGON_SCALES_NC && otyp <= YELLOW_DRAGON_SCALES_NC)
                mndx = PM_GRAY_DRAGON + (otyp - GRAY_DRAGON_SCALES_NC);
            else if (otyp >= GRAY_DRAGON_SCALE_MAIL_NC && otyp <= YELLOW_DRAGON_SCALE_MAIL_NC)
                mndx = PM_GRAY_DRAGON + (otyp - GRAY_DRAGON_SCALE_MAIL_NC);
        }
        break;
    }
    }

    /* C mon.c:5209-5211 for debugging: allow control of polymorphed monster */
    if (wizard() && game.iflags?.monpolycontrol)
        mndx = await wiz_force_cham_form(mon);

    /* if no form was specified above, pick one at random now */
    if (mndx === NON_PM) {
        tryct = 50;
        do {
            mndx = rn1(SPECIAL_PM_NC - LOW_PM, LOW_PM);
        } while (--tryct > 0 && !validspecmon(mon, mndx)
                 /* try harder to select uppercase monster on rogue level */
                 && (tryct > 40 && Is_rogue_level(game.u?.uz)
                     && !monsym_isupper_nc(mndx)));
    }
    return mndx;
}

/* C mon.c:5256 mgender_from_permonst(mtmp, mdat) — a shapechanger might take on
 * a shape that forces a gender change. */
function mgender_from_permonst(mtmp, mdat) {
    if (((mdat.mflags2 | 0) & M2_MALE) !== 0) {
        mtmp.female = 0;
    } else if (((mdat.mflags2 | 0) & M2_FEMALE) !== 0) {
        mtmp.female = 1;
    } else if (((mdat.mflags2 | 0) & M2_NEUTER) === 0) {
        /* usually leave as-is; same chance to change as polymorphing hero;
           vampires use controlled shapechange and don't undergo gender change */
        if (!rn2(10) && !(is_vampire_nc(mdat) || is_vampshifter_nc(mtmp)))
            mtmp.female = mtmp.female ? 0 : 1;
    }
}

/* C monst.h:214 DEADMONSTER(mon) == mon->mhp < 1. */
function DEADMONSTER_nc(mon) { return (mon.mhp | 0) < 1; }

/* C monattk.h:28 AT_WEAP == 254 — the same literal js/dochug.js:165 and
 * js/dog.js:48 already carry (it is NOT 1; see js/monmove.js:1350). */
const AT_WEAP_NC = 254;

/* C monflag.h M2_ROCKTHROW / mondata.h throws_rocks(ptr).  Same literal this
 * file already spells at :17596 for its own mflags2 decode. */
const M2_ROCKTHROW_NC = 0x08000000;

function throws_rocks_nc(ptr) { return ((ptr.mflags2 | 0) & M2_ROCKTHROW_NC) !== 0; }

function obj_extract_from_minvent_nc(mon, obj) {
    let prev = null, curr = mon.minvent;
    while (curr && curr !== obj) { prev = curr; curr = curr.nobj; }
    if (!curr)
        return; /* C extract_nobj's impossible("extract_nobj: object lost") */
    if (prev)
        prev.nobj = curr.nobj;
    else
        mon.minvent = curr.nobj;
    obj.where = 0;
    obj.nobj = null;
    obj.ocarry = null;
}

async function possibly_unwield_nc(mon, polyspot) {
    let obj;
    const mw_tmp = MON_WEP_nc(mon);

    if (!mw_tmp)
        return;
    for (obj = mon.minvent; obj; obj = obj.nobj)
        if (obj === mw_tmp)
            break;
    if (!obj) { /* The weapon was stolen or destroyed */
        mon.mw = null; /* C MON_NOWEP(mon) */
        mon.weapon_check = NEED_WEAPON;
        return;
    }
    if (!attacktype(mon.data, AT_WEAP_NC)) {
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = NO_WEAPON_WANTED;
        /* if we're going to call distant_name(), do so before extract_self */
        if (cansee(mon.mx | 0, mon.my | 0)) {
            await pline_mon(mon, "%s drops %s.", Monnam(mon),
                      (await distant_name_nc(obj, doname_nc)));
            newsym(mon.mx | 0, mon.my | 0);
        }
        obj_extract_from_minvent_nc(mon, obj); /* C obj_extract_self(obj) */
        /* might be dropping object into water or lava */
        if (!await flooreffects(obj, mon.mx | 0, mon.my | 0, "drop")) {
            if (polyspot)
                bypass_obj(obj);
            place_object(obj, mon.mx | 0, mon.my | 0);
            await stackobj(obj);
        }
        return;
    }
    /* The remaining case where there is a change is where a monster is
     * polymorphed into a stronger/weaker monster with a different choice of
     * weapons.  ... Note that if there is no change, setting the check to
     * NEED_WEAPON is harmless. */
    if (!(mwelded(mw_tmp) && (mon.weapon_check | 0) === NO_WEAPON_WANTED))
        mon.weapon_check = NEED_WEAPON;
}

/* C mon.c:5796-5919 usmellmon().  Each message is a blocking pline (vpline
 * flushes the map before a --More--), so callers await it. */
export async function usmellmon(mdat) {
    if (!mdat || !olfaction(game.youmonst?.data))
        return false;

    const PM_CAVE_DWELLER = PM_CAVEMAN;
    const S_DOG = 4, S_DRAGON = 30, S_FUNGUS = 32, S_UNICORN = 21, S_EEL = 57;

    const mndx = (mdat.pmidx ?? mdat.mndx ?? mdat.mnum ?? -1) | 0;
    let nonspecific = false;
    switch (mndx) {
    case PM_ROTHE:
    case PM_MINOTAUR:
        await pline('You notice a bovine smell.');
        return true;
    case PM_CAVE_DWELLER:
    case PM_BARBARIAN:
    case PM_NEANDERTHAL:
        await pline('You smell body odor.');
        return true;
    case PM_HORNED_DEVIL:
    case PM_BALROG:
    case PM_ASMODEUS:
    case PM_DISPATER:
    case PM_YEENOGHU:
    case PM_ORCUS:
        return false;
    case PM_HUMAN_WEREJACKAL:
    case PM_HUMAN_WERERAT:
    case PM_HUMAN_WEREWOLF:
    case PM_WEREJACKAL:
    case PM_WERERAT:
    case PM_WEREWOLF:
    case PM_OWLBEAR:
        await pline("You detect an odor reminiscent of an animal's den.");
        return true;
    case PM_STEAM_VORTEX:
        await pline('You smell steam.');
        return true;
    case PM_GREEN_SLIME:
        await pline('Something stinks.');
        return true;
    case PM_VIOLET_FUNGUS:
    case PM_SHRIEKER:
        await pline('You smell mushrooms.');
        return true;
    case PM_WHITE_UNICORN:
    case PM_GRAY_UNICORN:
    case PM_BLACK_UNICORN:
    case PM_JELLYFISH:
        return false;
    default:
        nonspecific = true;
        break;
    }

    if (nonspecific) {
        switch (mdat.mlet | 0) {
        case S_DOG:
            await pline('You notice a dog smell.');
            return true;
        case S_DRAGON:
            await pline('You smell a dragon!');
            return true;
        case S_FUNGUS:
            await pline('Something smells moldy.');
            return true;
        case S_UNICORN:
            await pline('You detect a%s odor reminiscent of a stable.',
                  mndx === PM_PONY ? 'n' : ' strong');
            return true;
        case S_ZOMBIE:
            await pline('You smell rotting flesh.');
            return true;
        case S_EEL:
            await pline('You smell fish.');
            return true;
        case S_ORC: {
            const M2_ORC = 0x00000080;
            const currentFormIsOrc = !!((game.youmonst?.data?.mflags2 | 0)
                                         & M2_ORC);
            const heroIsOrc = Upolyd(game.u)
                ? currentFormIsOrc
                : ((game.urace?.mnum | 0) === PM_ORC);
            await pline(heroIsOrc ? 'You notice an attractive smell.'
                            : 'A foul stench makes you feel a little nauseated.');
            return true;
        }
        default:
            break;
        }
    }
    return false;
}

/* C mon.c:5277 newcham(mtmp, mdat, ncflags) — make a chameleon take on another
 * shape, or a polymorph target become a different monster.  Returns 1 if the
 * form actually changed.  Accept a permonst or its index; NON_PM/null requests
 * a random shape. */
export async function newcham(mtmp, mdat, ncflags) {
    let mndx;
    let tryct;
    const olddata = mtmp.mnum | 0;
    // C mon.c:5321-5343: a supplied permonst names that exact form.
    let newmndx = (mdat === null || mdat === undefined) ? NON_PM
        : (typeof mdat === 'object' ? mdat.pmidx : mdat) | 0;

    const polyspot = ((ncflags | 0) & NC_VIA_WAND_OR_SPELL) !== 0;
    let msg = ((ncflags | 0) & NC_SHOW_MSG) !== 0;
    const seenorsensed = canspotmon(mtmp);

    /* C mon.c:5292-5306 — the `cham == NON_PM` (not-a-shapechanger) guards:
     * Riders and birth-limited species are immune, and a cancelled shapechanger
     * is uncancelled first.
     *
     * WAS an unconditional `return 0` for this whole branch.  That is correct
     * for every caller IN THIS FILE (mklev.js:5530/9857/14491/16509 and
     * decide_to_shapeshift above) — a chameleon/doppelganger/vampshifter
     * always arrives here with mtmp.cham already set to a real shapechanger
     * index, so none of them ever enters this branch and its contents were
     * dead code for them either way.  It stopped being universally true when
     * js/makemon.js's muse.c ports (MUSE_POLY_TRAP / MUSE_WAN_POLYMORPH /
     * MUSE_POT_POLYMORPH) started calling this newcham() for an ORDINARY
     * monster — cham === NON_PM, not a pre-existing shapechanger — and the
     * blanket return silently no-op'd their whole polymorph (use_misc board
     * rec#31/#32: C consumed 3 RNG draws and returned a changed monster; this
     * stub consumed 0 and returned unchanged).  is_rider() below checks all
     * three Riders against the monster's current permonst. */
    if ((mtmp.cham | 0) === NON_PM) {
        if (is_rider(mtmp.data))
            return 0;
        if (mbirth_limit(olddata) < MAXMONNO)
            return 0;
        if (mtmp.mcan && !Protection_from_shape_changers_nc()) {
            mtmp.cham = pm_to_cham(olddata);
            if ((mtmp.cham | 0) !== NON_PM)
                mtmp.mcan = 0;
        }
    }

    let oldname;
    if (msg) {
        oldname = upstart(x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE,
                                    null, SUPPRESS_SADDLE, false));
    }

    /* C mon.c:5314-5320 always computes l_oldname immediately after oldname,
     * even though most live callers never read it.  Under hallucination this
     * is observable: x_monnam() consumes the display RNG while preparing the
     * swallow/vampshifter fallback.  Keep the call (and its suppression arm)
     * so the later newsym/noname_monnam sequence starts at the same display
     * draw as C. */
    const l_oldname = x_monnam(mtmp, ARTICLE_THE, null,
        mtmp.mextra?.mgivenname ? SUPPRESS_SADDLE : 0, false);

    /* mdat = 0 -> caller wants a random monster shape */
    if (newmndx === NON_PM) {
        /* select_newcham_form() loops when resorting to random but it doesn't
           always pick that so we still retry here too */
        tryct = 20;
        do {
            mndx = await select_newcham_form(mtmp);
            newmndx = accept_newcham_form(mtmp, mndx);
            /* for the first several tries we require upper-case on the rogue
               level (after that, we take whatever we get) */
            if (tryct > 15 && Is_rogue_level(game.u?.uz)
                && newmndx !== NON_PM && !monsym_isupper_nc(newmndx))
                newmndx = NON_PM;
            if (newmndx !== NON_PM)
                break;
        } while (--tryct > 0);
        if (!tryct)
            return 0;
    } else if (mvitals_genod_nc(newmndx)) {
        return 0; /* passed in mdat is genocided */
    }

    if (newmndx === olddata)
        return 0; /* still the same monster */

    const newdata = permonstTemplate(newmndx);
    mgender_from_permonst(mtmp, newdata);
    /* C mon.c:5346-5354 — endgame mplayers start out as "Foo the Bar"; drop the
     * rank when polymorphed. */
    if (In_endgame(game.u.uz) && is_mplayer_nc(olddata)
        && mtmp.mextra?.mgivenname) {
        const p = mtmp.mextra.mgivenname.indexOf(" the ");
        if (p >= 0)
            mtmp.mextra.mgivenname = mtmp.mextra.mgivenname.slice(0, p);
    }

    /* C mon.c:5356-5361 — throw a long worm's tail away and put the head back.
     * Reached when decide_to_shapeshift() turns a shapeshifter that had taken
     * long-worm form into something else; without it the new form keeps a
     * stale wormno and worm_move()s (rnd(5)/d(2,2)) that C never draws. */
    if (mtmp.wormno) {
        const wmx = mtmp.mx, wmy = mtmp.my;
        wormgone_mk(mtmp);
        place_monster(mtmp, wmx, wmy);
    }
    /* C mon.c:5363-5364 — a non-mimic form loses its previous disguise. */
    if (((mtmp.m_ap_type | 0) & 0x7 /* M_AP_TYPMASK */)
        && (newdata.mlet | 0) !== 13 /* S_MIMIC */)
        seemimic(mtmp);

    /* (this code used to try to adjust the monster's health based on a normal
       one of its type but there are too many special cases, so just give the
       new form the same proportion of HP as its old one had) */
    const hpn = mtmp.mhp | 0;
    const hpd = mtmp.mhpmax | 0;
    /* set level and hit points */
    newMonHp(mtmp, newmndx);
    /* new hp: same fraction of max as before */
    mtmp.mhp = Math.trunc((hpn * (mtmp.mhp | 0)) / hpd);
    /* sanity check (potential overflow) */
    if (mtmp.mhp < 0 || mtmp.mhp > (mtmp.mhpmax | 0))
        mtmp.mhp = mtmp.mhpmax | 0;
    /* unlikely but not impossible; a 1HD creature with 1HP that changes into a
       0HD creature will require this statement */
    if (!mtmp.mhp)
        mtmp.mhp = 1;

    /* take on the new form... C mon.c:5385 set_mon_data(mtmp, mdat).
     * NOTE: this function's `olddata` is an MNDX (`mtmp.mnum | 0`, line above),
     * not a permonst — pm_invisible_nc(olddata) below reads it that way.  The
     * light-source swap needs the permonst, so grab it before it is replaced. */
    const oldPermonst = mtmp.data;
    set_mon_data(mtmp, newdata);

    /* C mon.c:5387-5395; apply.c:761-766 leashable(). */
    if (mtmp.mleashed) {
        const flags = newdata.mflags1 | 0;
        if (newmndx === PM_LONG_WORM || unsolid_mv(newdata)
            || ((flags & 0x00006000) === 0x00006000 && !has_head_nc(newdata)))
            await m_unleash_mk(mtmp, true);
        else
            update_inventory();
    }

    /* C mon.c:5397-5405 — the light-source swap:
     *     if (emits_light(olddata) != emits_light(mtmp->data)) {
     *         if (emits_light(olddata)) del_light_source(LS_MONSTER, ...);
     *         if (emits_light(mtmp->data)) new_light_source(mtmp->mx, mtmp->my,
     *                          emits_light(mtmp->data), LS_MONSTER, ...);
     *     }
     * This block USED to carry a comment saying a just-created monster "is
     * neither leashed nor a registered light source".  The second half of that
     * stopped being true when makemon.c:1347's new_light_source landed: C
     * registers the source at makemon.c:1347, BEFORE the shapechanger arm at
     * makemon.c:1356 calls newcham, so a chameleon that rolls a gold dragon
     * (or a yellow light, or a fire elemental) arrives here with olddata dark
     * and newdata lit and must gain a source.  RNG-free either way. */
    {
        const oldLight = emits_light(oldPermonst);
        const newLight = emits_light(newdata);
        if (oldLight !== newLight) {
            if (oldLight)
                del_light_source(LS_MONSTER, monst_to_any(mtmp));
            if (newLight)
                new_light_source(mtmp.mx | 0, mtmp.my | 0, newLight,
                                 LS_MONSTER, monst_to_any(mtmp));
        }
    }

    if (!mtmp.perminvis || pm_invisible_nc(olddata))
        mtmp.perminvis = pm_invisible_nc(newmndx) ? 1 : 0;
    mtmp.minvis = mtmp.invis_blkd ? 0 : mtmp.perminvis;
    if (mtmp.mundetected)
        hideunder(mtmp);

    /* C mon.c:5411-5443 — live: an engulfing fog cloud shapeshifts mid-fight
     * (mon.c:4894), expels the hero and draws collect_coords (teleport.c:700). */
    if (game.u.ustuck === mtmp) {
        if (game.u.uswallow) {
            if (!attacktype(newdata, MPICKOBJ_AT_ENGL)) {
                /* Does mdat care? */
                if (!noncorporeal_mv(newdata) && !is_whirly_mv(newdata, newmndx)
                    && !(amorphous_mcd(newdata) || (newdata.mlet | 0) === 25 /* S_LIGHT, defsym.h:324 */)) {
                    let msgtrail = '';
                    if (is_vampshifter_nc(mtmp)) {
                        msgtrail = ` which was a shapeshifted ${noname_monnam(mtmp, ARTICLE_NONE)}`;
                    } else if (digests_gu(newmndx)) {
                        msgtrail = "'s stomach";
                    }
                    const emerge = amorphous_mcd(oldPermonst) || is_whirly_mv(oldPermonst, olddata);
                    await pline(`You ${emerge ? 'emerge from' : 'break out of'} ${l_oldname}${msgtrail}!`);
                    msg = false; /* message has been given */
                    mtmp.mhp = 1; /* almost dead */
                }
                await expels_gu(mtmp, olddata, false);
            } else {
                /* update swallow glyphs for new monster */
                swallowed(0);
            }
        } else if ((!sticks(newdata) && !sticks(game.youmonst.data)) || unsolid_mv(newdata)) {
            await unstuck_mk(mtmp);
        }
    }

    if (newmndx === PM_LONG_WORM && (mtmp.wormno = get_wormno()) !== 0) {
        initworm(mtmp, rn2(5));
        place_worm_tail_randomly(mtmp, mtmp.mx | 0, mtmp.my | 0);
    }

    mtmp.meverseen = 0; /* never seen mon in present shape */
    newsym(mtmp.mx, mtmp.my);

    /* C mon.c:5455-5471 — the msg arms.  WAS a no-op comment claiming this is
     * unreachable under NO_NC_FLAGS: true only for makemon's shapechanger-
     * creation caller.  decide_to_shapeshift() (:16724 below, C mon.c:4928)
     * calls newcham(mon, ptr, NC_SHOW_MSG) on the live per-turn shapeshift
     * path, so `msg` DOES carry true there and this block was being silently
     * dropped for every such call. */
    if (msg) {
        if (!canspotmon(mtmp)) { /* can't see or sense it now */
            if (seenorsensed) /* could see or sense it before */
                await pline_mon(mtmp, "%s disappears!", oldname);
            /* C mon.c:5465: smell the new form when it cannot be spotted. */
            await usmellmon(newdata);
        } else if (!seenorsensed) { /* couldn't see/sense before, can now */
            const mnm = x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_A,
                                  null, 0, false);
            await pline_mon(mtmp, "%s appears!", upstart(mnm));
        } else { /* saw/sensed it before, still see/sense it now */
            /* C mon.c:5475-5488: a blocking message finishes before gear drops. */
            await pline_mon(mtmp, "%s turns into %s!", oldname,
                      /* "a <monster type>" even if it has a name assigned */
                      noname_monnam(mtmp, ARTICLE_A));
        }
    }

    /* when polymorph trap/wand/potion produces a vampire, turn it into a
       full-fledged vampshifter unless shape-changing is blocked */
    if ((mtmp.cham | 0) === NON_PM && is_vampire_nc(newdata)
        && !Protection_from_shape_changers_nc())
        mtmp.cham = pm_to_cham(newmndx);

    await possibly_unwield_nc(mtmp, polyspot); /* might lose use of weapon */
    /* C worn.c:1177 mon_break_armor — the real port, js/trap.js:8138.  Several
     * of ITS OWN helpers are stubs in that file (breakarm/sliparm/m_lose_armor/
     * can_saddle), which is a pre-existing gap in js/trap.js and not this
     * change's to fix; calling it is still strictly closer to C than skipping
     * it, and it draws no RNG on any arm reachable without a steed. */
    await mon_break_armor(mtmp, polyspot);
    if (!((mtmp.misc_worn_check | 0) & W_ARMG))
        await mselftouch_nc(mtmp, "No longer petrify-resistant, ",
                      !(game.context && game.context.mon_moving));
    check_gear_next_turn(mtmp);

    /* This ought to re-test can_carry() on each item in the inventory rather
     * than just checking ex-giants & boulders, but that'd be pretty expensive
     * to perform.  If implemented, then perhaps minvent should be sorted in
     * order to drop heaviest items first. */
    /* former giants can't continue carrying boulders */
    if (mtmp.minvent && !throws_rocks_nc(newdata)) {
        let otmp, otmp2;

        for (otmp = mtmp.minvent; otmp && !DEADMONSTER_nc(mtmp); otmp = otmp2) {
            otmp2 = otmp.nobj;
            if ((otmp.otyp | 0) === BOULDER) {
                /* this keeps otmp from being polymorphed in the same zap that
                   the monster that held it is polymorphed */
                if (polyspot)
                    bypass_obj(otmp);
                obj_extract_from_minvent_nc(mtmp, otmp); /* C obj_extract_self */
                /* probably ought to give some "drop" message here */
                if (await flooreffects(otmp, mtmp.mx | 0, mtmp.my | 0, ""))
                    continue;
                place_object(otmp, mtmp.mx | 0, mtmp.my | 0);
            }
        }
    }
    /* C mon.c:5517-5518 — adjust riding after armor handling. */
    if (game.u && mtmp === game.u.usteed)
        await poly_steed(mtmp, oldPermonst);

    /* old form might not have been affected by Elbereth but perhaps the
       new form is.  C mon.c:5522-5533.
     *
     * INERT ON THE TWO PATHS THAT REACH newcham TODAY, and deliberately ported
     * anyway.  svc.context.mon_moving is TRUE only inside movemon (C
     * allmain.c:210-216); js/zap.js's bhitm is a HERO zap and
     * decide_to_shapeshift runs from mcalcdistress at allmain.c:228, which is
     * AFTER mon_moving is cleared at :216.  It becomes live the moment a
     * MONSTER zaps a wand of polymorph (muse.c MUSE_WAN_POLYMORPH), which
     * js/makemon.js already routes through this function. */
    if (game.context && game.context.mon_moving) {
        /* give 'mtmp' a new chance to pinpoint hero's location */
        if (!u_at(mtmp.mux | 0, mtmp.muy | 0))
            set_apparxy(mtmp);
        /* if hero is on Elbereth or scare monster, mtmp in new form might
           become scared */
        if (!mtmp.mpeaceful
            && onscary(mtmp.mux | 0, mtmp.muy | 0, mtmp)
            && monnear(mtmp, mtmp.mux | 0, mtmp.muy | 0))
            await monflee(mtmp, rn1(9, 2), true, true); /* 2..10 turns */
    }

    return 1;
}

/* C hack.h:1532 mdistu(mon) — distu(mon->mx, mon->my), i.e. dist2 to the hero. */
function mdistu_mcd(mon) {
    const u = game.u || {};
    return dist2(mon.mx | 0, mon.my | 0, u.ux | 0, u.uy | 0);
}

/* C mondata.h is_male/is_female/is_neuter — permonst gender flags. */
function is_male_mcd(ptr) { return ((ptr.mflags2 | 0) & M2_MALE) !== 0; }

function is_female_mcd(ptr) { return ((ptr.mflags2 | 0) & M2_FEMALE) !== 0; }

function is_neuter_mcd(ptr) { return ((ptr.mflags2 | 0) & M2_NEUTER) !== 0; }

/* C mondata.h:52 amorphous(ptr) — M1_AMORPHOUS on mflags1. */
function amorphous_mcd(ptr) { return ((ptr.mflags1 | 0) & M1_AMORPHOUS_MV) !== 0; }

/* C monmove.c:307 mon_regen(mon, digest_meal) — regenerate lost hit points.
 * Consumes NO RNG.  js/monmove.js carries a copy of this function, but its
 * healmon() is a file-local THROWING stub that shadows this file's real port
 * (mklev.js healmon, C mon.c:4585), so that copy cannot be called; it has zero
 * callers.  Only the digest_meal=FALSE form is reachable from m_calcdistress,
 * so finish_meating (unported) is never entered from here. */
function mon_regen_mcd(mon, digest_meal) {
    if (((game.moves | 0) % 20) === 0 || regenerates_mcd(mon.data))
        healmon(mon, 1, 0);
    if (mon.mspec_used)
        mon.mspec_used = (mon.mspec_used | 0) - 1;
    if (digest_meal) {
        if (mon.meating) {
            mon.meating = (mon.meating | 0) - 1;
            if (mon.meating <= 0)
                finish_meating_mcd(mon);
        }
    }
}

/* C monflag.h M1_REGEN / mondata.h:80 regenerates(ptr). */
const M1_REGEN_MCD = 0x00800000;

function regenerates_mcd(ptr) { return ((ptr.mflags1 | 0) & M1_REGEN_MCD) !== 0; }

/* C monmove.c finish_meating — share dogmove's faithful body even if a future
 * caller enables the digest-meal form of this helper. */
function finish_meating_mcd(mon) {
    return finish_meating_mk(mon);
}

/* C mon.c:4872 decide_to_shapeshift(mon) — per-turn shape-change decision for a
 * monster whose `cham` names a shapechanger form.  `ptr` is a permonst pointer
 * in C; this port identifies forms by index, so NON_PM stands in for C's NULL
 * (both mean "newcham picks a random form").
 *
 * C mon.c:4916: enexto tests the destination form, including scary squares. */
async function decide_to_shapeshift(mon) {
    let ptr = NON_PM;
    let mndx;
    const was_female = mon.female;
    let dochng = false;

    if (!is_vampshifter_nc(mon)) {
        /* regular shapeshifter; 'ptr' is Null */
        if (!(mon.mspec_used | 0) && !rn2(6)) {
            dochng = true;
            mon.mspec_used = 3 + rn2(10);
        }
    } else if (!((mon.mstrategy | 0) & STRAT_WAITFORU)) {
        /* The vampire has to be in good health (mhp) to maintain its shifted
         * form.  If we're shifted and getting low on hp, maybe shift back, or
         * if we're a fog cloud at full hp, maybe pick a different shape.
         * If we're not already shifted and in good health, maybe shift. */
        if (!is_vampire_nc(mon.data)) {
            if ((mon.mhp | 0) <= Math.trunc(((mon.mhpmax | 0) + 5) / 6) && rn2(4)
                && ismnum(mon.cham | 0)) {
                ptr = mon.cham | 0;
                dochng = true;
            } else if ((mon.mnum | 0) === PM_FOG_CLOUD_NC
                       && (mon.mhp | 0) === (mon.mhpmax | 0) && !rn2(4)
                       && (!canseemon(mon)
                           || mdistu_mcd(mon) > BOLT_LIM * BOLT_LIM)) {
                /* if a fog cloud, maybe change to wolf or vampire bat */
                mndx = pickvampshape(mon);
                if (ismnum(mndx)) {
                    ptr = mndx;
                    dochng = (ptr !== (mon.mnum | 0));
                }
            }
            if (dochng && amorphous_mcd(mon.data)
                && closed_door(mon.mx, mon.my)) {
                const new_xy = enexto_out(mon.mx, mon.my, ptr === NON_PM ? null : permonstTemplate(ptr));
                if (new_xy)
                    await rloc_to(mon, new_xy.x, new_xy.y);
            }
        } else {
            if ((mon.mhp | 0) >= Math.trunc(9 * (mon.mhpmax | 0) / 10) && !rn2(6)
                && (!canseemon(mon)
                    || mdistu_mcd(mon) > BOLT_LIM * BOLT_LIM))
                dochng = true; /* 'ptr' stays Null */
        }
    }
    if (dochng) {
        if (await newcham(mon, ptr === NON_PM ? null : ptr, NC_SHOW_MSG)) {
            /* for vampshift, override the 10% chance for sex change
               (by forcing original gender in case that occurred) */
            if (is_vampshifter_nc(mon)) {
                const newptr = mon.data;
                if (!is_male_mcd(newptr) && !is_female_mcd(newptr)
                    && !is_neuter_mcd(newptr))
                    mon.female = was_female;
            }
        }
    }
}

/* C mon.c:1180 m_calcdistress(mtmp). */
async function m_calcdistress(mtmp) {
    /* must check non-moving monsters once/turn in case they managed
       to end up in water or lava; note: when not in liquid they regen,
       shape-shift, timeout temporary maladies just like other monsters */
    if ((mtmp.data.mmove | 0) === 0) {
        if (game.vision_full_recalc)
            vision_recalc(0);
        if (await minliquid(mtmp))
            return;
    }

    /* regenerate hit points */
    mon_regen_mcd(mtmp, false);

    /* possibly polymorph shapechangers and lycanthropes */
    if (ismnum(mtmp.cham | 0))
        await decide_to_shapeshift(mtmp);
    await were_change(mtmp);

    /* gradually time out temporary problems */
    if ((mtmp.mblinded | 0) && !(mtmp.mblinded = (mtmp.mblinded | 0) - 1))
        mtmp.mcansee = 1;
    if ((mtmp.mfrozen | 0) && !(mtmp.mfrozen = (mtmp.mfrozen | 0) - 1))
        mtmp.mcanmove = 1;
    if ((mtmp.mfleetim | 0) && !(mtmp.mfleetim = (mtmp.mfleetim | 0) - 1))
        mtmp.mflee = 0;

    /* C FIXME retained: mtmp->mlstmv ought to be updated here */
}

/* port-gen-minliquid-001: minliquid — check mtmp and water/lava for compatibility */
export async function minliquid(mtmp) {
    let res;
    game.iflags.sad_feeling = !!mtmp.mtame && !canseemon(mtmp);
    res = await minliquid_core(mtmp);
    /* always clear the flag */
    game.iflags.sad_feeling = false;
    return res;
}

const M1_FLY_ML = 0x00000001;     /* C monflag.h */

const M1_CLING_ML = 0x00000010;

const M1_TPORT_ML = 0x02000000;

const S_EYE_ML = 5;               /* C defsym.h MONSYM(5, 'e', EYE, S_EYE, ...) */

const S_EEL_ML = 57;              /* C defsym.h:362 MONSYM(57, ';', EEL, S_EEL, ...) */

const M1_BREATHLESS_ML = 0x00000400; /* C monflag.h:95 */

const S_LIGHT_ML = 25;            /* C defsym.h MONSYM(25, 'y', LIGHT, S_LIGHT, ...) */

const M1_SWIM_ML = 0x00000002;       /* C monflag.h */

const M1_AMPHIBIOUS_ML = 0x00000200; /* C monflag.h */

/* C hack.h:1393 RLOC_MSG — imported by name everywhere else in this port; the
 * const.js export is the same 0x02. */
const RLOC_MSG_ML = 0x02;

async function minliquid_core(mtmp) {
    const ptr = mtmp && mtmp.data;
    if (!ptr) return 0;
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    const loc = game.level?.at(mx, my);
    const typ = loc ? (loc.typ | 0) : STONE;
    if (typeof process !== 'undefined' && ENV?.FF_LIQUID_TRACE === '1')
        pushRngLogEntry(`^liquid_trace[moves=${game.moves | 0} id=${mtmp?.m_id | 0}`
            + ` mndx=${mtmp?.mndx ?? mtmp?.mnum ?? mtmp?.data?.pmidx ?? -1}`
            + ` xy=${mx},${my} typ=${typ}]`);
    /* C dbridge.c is_lava(x,y), including lava under a raised drawbridge. */
    const is_lava_here = (typ === LAVAPOOL || typ === LAVAWALL)
        || (typ === DRAWBRIDGE_UP && ((loc?.drawbridgemask | 0) & DB_UNDER) === DB_LAVA);
    /* C mon.c:1126-1127 — inlava = is_lava(...) && !(is_flyer || is_floater).
     * mondata.h:19-20: is_flyer = mflags1 & M1_FLY; is_floater = mlet is
     * S_EYE or S_LIGHT. */
    const mf1 = ptr.mflags1 | 0, mlet = ptr.mlet | 0;
    const inlava = is_lava_here
        && !((mf1 & M1_FLY_ML) !== 0 || mlet === S_EYE_ML || mlet === S_LIGHT_ML);
    const inpool = is_pool(mx, my)
        && (!((mf1 & M1_FLY_ML) !== 0 || mlet === S_EYE_ML || mlet === S_LIGHT_ML)
            || Is_waterlevel(game.u?.uz));
    /* C mon.c:1120 `boolean waterwall = is_waterwall(mtmp->mx, mtmp->my)`;
     * dbridge.c:38 is `isok(x,y) && IS_WATERWALL(levl[x][y].typ)`, and rm.h:141
     * is `IS_WATERWALL(typ) ((typ) == WATER)`.  It is a SEPARATE disjunct from
     * inpool in C's `else if (inpool || waterwall)`: a flyer over the Plane of
     * Water's WATER squares has inpool FALSE (is_flyer) and waterwall TRUE, so
     * this must be tested before the eel `else`, not inside the pool arm. */
    const waterwall = isok(mx, my) && IS_WATERWALL(typ);
    // C mon.c:973-980: the rider's flight/levitation protects the steed.
    const u = game.u, flight = u.uprops?.[FLYING], levitation = u.uprops?.[LEVITATION];
    const flying = (flight?.intrinsic || flight?.extrinsic || (u.usteed?.data?.mflags1 & M1_FLY_ML)) && !flight?.blocked;
    const floating = (levitation?.intrinsic || levitation?.extrinsic) && !levitation?.blocked;
    if (mtmp === u.usteed && (flying || floating) && !waterwall) return 0;
    if (typeof process !== 'undefined' && ENV?.FF_LIQUID_TRACE === '2')
        pushRngLogEntry(`^liquid_decision[moves=${game.moves | 0} id=${mtmp?.m_id | 0}`
            + ` xy=${mx},${my} typ=${typ} lava=${is_lava_here ? 1 : 0}`
            + ` pool=${inpool ? 1 : 0} wall=${waterwall ? 1 : 0}`
            + ` tport=${(mf1 & M1_TPORT_ML) !== 0 ? 1 : 0}`
            + ` cling=${(mf1 & M1_CLING_ML) !== 0 ? 1 : 0}`
            + ` drown=${(mf1 & (M1_SWIM_ML | M1_AMPHIBIOUS_ML
                | M1_BREATHLESS_ML)) !== 0 ? 0 : 1}]`);
    /* C mon.c:990-1001 — `else if (mtmp->data == &mons[PM_IRON_GOLEM] && inpool
     * && !rn2(5))`: an iron golem in a pool rusts for d(2,6).  The PM_GREMLIN
     * split arm (mon.c:983-989) precedes it below
     * (split_mon is js/mklev.js split_mon_ml, a port of potion.c:2873). */
    /* C mon.c:983-989 — gremlin in water/fountain multiplies:
     *     if (mtmp->data == &mons[PM_GREMLIN] && (inpool || infountain)
     *         && rn2(3)) {
     *         if (split_mon(mtmp, NULL)) dryup(mtmp->mx, mtmp->my, FALSE);
     *         if (inpool) water_damage_chain(mtmp->minvent, FALSE);
     *         return 0; }
     * (infountain = IS_FOUNTAIN(levl[x][y].typ), mon.c:1124.) */
    if ((ptr.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) === PM_GREMLIN_ML
        && (inpool || typ === FOUNTAIN) && rn2(3)) {
        if (await split_mon_ml(mtmp, null))
            await dryup_ml(mx, my, false);
        if (inpool)
            await water_damage_chain_ml(mtmp.minvent || null, false);
        return 0;
    }
    if (inpool && (ptr.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) === PM_IRON_GOLEM_ML
        && !rn2(5)) {
        const dam = d_ml(2, 6);
        if (cansee(mx, my))
            await pline_mon(mtmp, `${Monnam_wm(mtmp)} rusts.`);
        mtmp.mhp = (mtmp.mhp | 0) - dam;
        if ((mtmp.mhpmax | 0) > dam)
            mtmp.mhpmax = (mtmp.mhpmax | 0) - dam;
        if ((mtmp.mhp | 0) < 1) {
            await mondied_ml(mtmp);
            if ((mtmp.mhp | 0) < 1)
                return 1;
        }
        await water_damage_chain_ml(mtmp.minvent || null, false);
        return 0;
    }
    if (!inlava && !inpool && !waterwall) {
        if (mlet === S_EEL_ML && !Is_waterlevel(game.u?.uz)
            && (mf1 & M1_BREATHLESS_ML) === 0) {
            if ((mtmp.mhp | 0) > 1 && rn2(mtmp.mhp | 0) > rn2(8))
                mtmp.mhp = (mtmp.mhp | 0) - 1;
            await monflee(mtmp, 2, false, false);
        }
        return 0;
    }
    if (!inlava && (inpool || waterwall)) {   /* C's `else if` — inlava wins */
        const is_clinger_ml = (mf1 & M1_CLING_ML) !== 0;
        /* C mondata.h:28 cant_drown(ptr) = is_swimmer || amphibious || breathless */
        const cant_drown_ml = (mf1 & (M1_SWIM_ML | M1_AMPHIBIOUS_ML
                                      | M1_BREATHLESS_ML)) !== 0;
        if ((waterwall || !is_clinger_ml) && !cant_drown_ml) {
            if ((mf1 & M1_TPORT_ML) !== 0 && !tele_restrict(mtmp)) {
                if (await rloc(mtmp, RLOC_MSG_ML))
                    return 0;
            }
        }
        if ((waterwall || !is_clinger_ml) && !cant_drown_ml) {
            /* C mon.c:1081-1101 — the drowning tail. */
            if (cansee(mx, my)) {
                if (game.context && game.context.mon_moving)
                    await pline_mon(mtmp, `${Monnam_wm(mtmp)} drowns.`);
                else
                    await pline(`You drown ${mon_nam_wm(mtmp)}.`);
            }
            if (engulfing_u(mtmp))
                await pline(`${Monnam_wm(mtmp)} sinks as ${hliquid_ml('water')} rushes in and flushes you out.`);
            if (game.context && game.context.mon_moving)
                await mondied_ml(mtmp); /* ok to leave corpse despite water */
            else
                await xkilled_ml(mtmp, XKILL_NOMSG);
            if (!((mtmp.mhp | 0) < 1)) {
                if (!m_in_air(mtmp)) {
                    await water_damage_chain_ml(mtmp.minvent || null, false);
                    if (!await rloc(mtmp, RLOC_NOMSG))
                        await deal_with_overcrowding(mtmp);
                }
                return 0;
            }
            return 1;
        }
        return 0;
    }
    if (!inlava)
        return 0;
    /* C mon.c:1163 — `if (!is_clinger(mtmp->data) && !likes_lava(mtmp->data))`. */
    const mndx = (ptr.pmidx ?? mtmp.data_mndx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if ((mf1 & M1_CLING_ML) !== 0 || likes_lava_mv(mndx))
        return 0;
    /* C mon.c:1016-1022 — `if (can_teleport(mtmp->data) && !tele_restrict(mtmp))
     * { if (rloc(mtmp, RLOC_MSG)) return 0; }`. can_teleport(ptr) is
     * mondata.h:82 `(ptr->mflags1 & M1_TPORT) != 0`, i.e. M1_TPORT_ML above.
     * rloc() DRAWS (rnd(COLNO-1) + rn2(ROWNO) per placement attempt,
     * teleport.c:1850-1851) — this is the LAVA twin of the pool/waterwall
     * arm ported above at line ~16927; unlike that arm, a failed/skipped
     * teleport here falls through to the fire-resist check below rather
     * than returning immediately, exactly as C does. */
    if ((mf1 & M1_TPORT_ML) !== 0 && !tele_restrict(mtmp)) {
        if (await rloc(mtmp, RLOC_MSG_ML))
            return 0;
    }
    /* C monst.h:272 resists_fire(mon) = Resists_Elem(mon, FIRE_RES); the
     * non-hero term is `mon_resistancebits(mon) & MR_FIRE`, i.e.
     * data->mresists | mextrinsics | mintrinsics (monst.h:268) — the same
     * three-way read m_poisongas_ok_resists_poison above already uses. */
    if (Resists_Elem(mtmp, FIRE_RES)) {
        /* C mon.c:1028-1045 — fire resistance protects the monster itself,
         * but not its inventory.  The survivor loses one hit point, then
         * every carried item is exposed to fire before the monster is moved
         * off the lava.  This ordering is load-bearing: fire_damage_chain()
         * may consume inventory RNG before rloc() supplies the escape draws.
         */
        mtmp.mhp = (mtmp.mhp | 0) - 1;
        if ((mtmp.mhp | 0) < 1) {
            if (cansee(mx, my))
                await pline_mon(mtmp, `${Monnam_wm(mtmp)} surrenders to the fire.`);
            await mondead(mtmp);
            if ((mtmp.mhp | 0) < 1) return 1;
        } else if (cansee(mx, my))
            await pline_mon(mtmp, `${Monnam_wm(mtmp)} burns slightly.`);
        /* C mon.c:1056: life saving can change the monster's current form. */
        if (!m_in_air(mtmp) && !likes_lava_mv(mtmp.data.pmidx)) {
            await fire_damage_chain(mtmp.minvent || null, false, false, mx, my);
            if (!await rloc(mtmp, RLOC_MSG_ML))
                await deal_with_overcrowding(mtmp);
        }
        return 0;
    }
    /* C mon.c:1027-1031 — verb from on_fire(mtmp->data, &mattk[0]). */
    if (cansee(mx, my)) {
        const a0 = (mon_mattk_raw(ptr.pmidx ?? mtmp.mnum) || [])[0] || [0];
        const how = on_fire_ml({ pmidx: mndx }, { aatyp: a0[0] | 0 });
        await pline_mon(mtmp, `${Monnam_wm(mtmp)} ${how === "boiling" ? "boils away"
            : how === "melting" ? "melts away" : "burns to a crisp"}.`);
    }
    /* C mon.c:1037-1040 — the hero gets the experience when it is not
     * the monster's own move. */
    if (game.context && game.context.mon_moving)
        await mondead(mtmp); /* no corpse */
    else
        await xkilled_ml(mtmp, XKILL_NOMSG);
    if ((mtmp.mhp | 0) > 0) {
        if (!m_in_air(mtmp) && !likes_lava_mv(mtmp.data.pmidx)) {
            await fire_damage_chain(mtmp.minvent || null, false, false, mx, my);
            if (!await rloc(mtmp, RLOC_MSG_ML))
                await deal_with_overcrowding(mtmp);
        }
        return 0;
    }
    return 1;
}

// monflag.h bitflags used by mfndpos's own mondata.h-macro predicates.
const M1_SWIM_MV = 0x00000002;

const M1_AMORPHOUS_MV = 0x00000004;

const M1_WALLWALK_MV = 0x00000008;

const M1_TUNNEL_MV = 0x00000020;

const M1_NEEDPICK_MV = 0x00000040;

const M1_SLITHY_MV = 0x00080000;

const M1_SEE_INVIS_MV = 0x01000000;

const MZ_LARGE_MV = 3; /* monflag.h */

// defsym.h MONSYM enum (verified against nethack-c/include/defsym.h — 1-based,
// S_ANT=1..S_MIMIC_DEF=60).
const S_EEL_MV = 57;

const S_VORTEX_MV = 22;

// objects.h otyp indices (established literal-constant convention used
// throughout this codebase — js/u_init.js, js/m_initweap.js, js/dig.js,
// js/dokick.js — rather than a generated table import).
const PICK_AXE_MV = 259;

const DWARVISH_MATTOCK_MV = 71;

const AXE_MV = 44;

const BATTLE_AXE_MV = 45;

const BOULDER_MV = 475;

const CLOVE_OF_GARLIC_MV = 284;

// monattk.h damage types (used by the IRONBARS dmgtype check).
const AD_RUST_MV = 24;

const AD_CORR_MV = 42;

function amorphous_mv(ptr) { return ((ptr.mflags1 | 0) & M1_AMORPHOUS_MV) !== 0; }

function is_swimmer_mv(ptr) { return ((ptr.mflags1 | 0) & M1_SWIM_MV) !== 0; }

function passes_walls_mv(ptr) { return ((ptr.mflags1 | 0) & M1_WALLWALK_MV) !== 0; }

function tunnels_mv(ptr) { return ((ptr.mflags1 | 0) & M1_TUNNEL_MV) !== 0; }

function needspick_mv(ptr) { return ((ptr.mflags1 | 0) & M1_NEEDPICK_MV) !== 0; }

function slithy_mv(ptr) { return ((ptr.mflags1 | 0) & M1_SLITHY_MV) !== 0; }

function unsolid_mv(ptr) { return ((ptr.mflags1 | 0) & 0x00100000) !== 0; } /* M1_UNSOLID */

function bigmonst_mv(ptr) { return (ptr.msize | 0) >= MZ_LARGE_MV; }

function noncorporeal_mv(ptr) { return (ptr.mlet | 0) === S_GHOST_MV; }

function perceives_mv(ptr) { return ((ptr.mflags1 | 0) & M1_SEE_INVIS_MV) !== 0; }

function is_whirly_mv(ptr, mndx) { return (ptr.mlet | 0) === S_VORTEX_MV || mndx === PM_AIR_ELEMENTAL; }

function likes_lava_mv(mndx) { return mndx === PM_FIRE_ELEMENTAL || mndx === PM_SALAMANDER; }

// C ref: rm.h Sokoban — svl.level.flags.sokoban_rules (js/makemon.js
// sokobanRules() precedent, mirrored locally to avoid a needless import).
function Sokoban_mv() { return !!(game.level?.flags?.sokoban_rules ?? game.sokoban); }

// channel (js/mcastu.js propOn()/Invis() precedent; not exported there, so
// mirrored locally).
function Displaced_mv() {
    const p = game.u?.uprops?.[DISPLACED];
    return !!(p && (p.intrinsic || p.extrinsic));
}

function Invis_mv() {
    const p = game.u?.uprops?.[INVIS];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}

// C ref: hack.c:921 bad_rock(mdat,x,y).
function bad_rock_mv(mdat, x, y) {
    if (Sokoban_mv() && sobj_at(BOULDER_MV, x, y)) return true;
    const loc = game.level?.at(x, y);
    const typ = loc ? (loc.typ | 0) : STONE;
    if (!IS_OBSTRUCTED(typ)) return false;
    if ((!tunnels_mv(mdat) || needspick_mv(mdat) || !may_dig(x, y))
        && !(passes_walls_mv(mdat) && may_passwall(x, y))) {
        return true;
    }
    return false;
}

// C ref: hack.c:934 cant_squeeze_thru(mon). `mon` is never the hero in this
// are structurally omitted (they can never fire). curr_mon_load walks
function cant_squeeze_thru_mv(mon) {
    const mdat = mon.data;
    if (passes_walls_mv(mdat)) return 0;
    if (bigmonst_mv(mdat)
        && !(amorphous_mv(mdat) || is_whirly_mv(mdat, (typeof mdat.pmidx === "number" ? mdat.pmidx : mon.data_mndx)) || noncorporeal_mv(mdat)
             || slithy_mv(mdat) || can_fog_mv(mon))) {
        return 1;
    }
    let amt = 0;
    for (let o = mon.minvent; o; o = o.nobj) {
        if ((o.otyp | 0) !== BOULDER_MV || !throws_rocks_mv(mdat)) amt += (o.owt | 0);
    }
    if (amt > 600 /* weight.h WT_TOOMUCH_DIAGONAL */) return 2;
    return 0;
}

// C ref: monmove.c:2365 can_fog(mon) — REAL now (js/monmove.js:3315, exported).
//   if (!(svm.mvitals[PM_FOG_CLOUD].mvflags & G_GENOD) && is_vampshifter(mtmp)
//       && !Protection_from_shape_changers && !stuff_prevents_passage(mtmp))
//       return TRUE;
// stuff_prevents_passage inventory walk all live in js/monmove.js, exported,
// and are already what js/cmd.js:23843 calls at the cant_squeeze_thru site.
// Both mfndpos uses here are the SAME C predicate — the diagonal tight-squeeze
// test (hack.c:964, via cant_squeeze_thru) and the closed-door amorphous test
// (mon.c:2234) — so they re-point together.  RNG-free.
const can_fog_mv = can_fog;

// C ref: worm.c:898 worm_cross(x1,y1,x2,y2) — REAL now (js/worm.js:466,
// exported). C mon.c:2249 mfndpos calls worm_cross directly.

// C ref: include/trap.h:125
//   #define fixed_tele_trap(t) ((t)->ttyp == TELEP_TRAP \
//                               && isok((t)->teledest.x,(t)->teledest.y))
// The old caption's premise ("STRUCT_FIELDS['struct trap *'] has no
// teledest is real state in js/, defaulted to {-1,-1} at maketrap
// (js/mklev.js:6187) and set from a des.trap({teledest=...}) at mklev.js:6292 /
// trap.js:1538, and js/teleport.js:935 already branches on isok(teledest) at
// the HERO's side of the same trap.  isok(-1,-1) is false, so an ordinary
// teleport trap is still not "fixed" — this only differs on a Lua-placed
// fixed-destination trap, which is the case mon.c:2361 exists for.
function fixed_tele_trap_mv(ttmp) {
    return (ttmp.ttyp | 0) === TELEP_TRAP
        && isok((ttmp.teledest?.x | 0), (ttmp.teledest?.y | 0));
}

// C ref: monmove.c:242 onscary(x,y,mtmp) — REAL now (js/makemon.js:4546).
// The "established precedent" this stub cited was a chain of copies of the
// same false, and it is RNG-load-bearing HERE in a way it is not at the
// find_defensive/find_misc sites: mfndpos's `cnt` is the argument of m_move's
// mtrack draw `rn2(4 * (cnt - j))` (monmove.c:1963), so one wrongly-kept
// candidate square shifts that argument for every later candidate AND lets the
// mfndpos for the yellow light at (57,5) returns cnt=7 and this port returned
// cnt=8 — first RNG divergence at leaf 10348, C rn2(24) vs JS rn2(28), and the
// 'y' ended one row south of where C put it for the rest of the segment.
const onscary_mv = onscary;

// C ref: rm.h is_pool(x,y) — same POOL|MOAT|WATER|DRAWBRIDGE_UP check as
// js/dokick.js:20-25 (keystone spec §7; not exported from either existing
// copy, so inlined here rather than imported).
function is_pool_mv(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    if (t === POOL || t === MOAT || t === WATER) return true;
    return t === DRAWBRIDGE_UP
        && !Is_juiblex_level(game.u?.uz)
        && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_MOAT;
}

// C ref: mon.c:2044 monlineu(mon,nx,ny) = online2(nx,ny,mon->mux,mon->muy).
function monlineu_mv(mon, nx, ny) { return online2(nx, ny, mon.mux, mon.muy); }

// C worn.c:1006-1035 — share the lookup used by all worn-armor callers.
function which_armor_mv(mon, flag) {
    return which_armor(mon, flag);
}

/* C include/obj.h:217
 *   #define is_axe(otmp)                                              \
 *       ((otmp->oclass == WEAPON_CLASS || otmp->oclass == TOOL_CLASS) \
 *        && objects[otmp->otyp].oc_skill == P_AXE)
 * This read `otyp === AXE` (44) only, which excludes the BATTLE-AXE (45).
 * The oclass guard is load-bearing: oc_skill is a shared schar field and otyps
 * 159-162 (leather gloves, the three gauntlets) also hold P_AXE in it.
 * (The old caption here claimed js/dig.js carried "an apparently-stale AXE=12";
 * it did not — it carried 44 — and it is now the same oc_skill test as this.)
 * Used by mfndpos's cursed wielded-tool restriction (C mon.c:2178-2181). */
const P_AXE_MV = 3; /* skills.h P_AXE */

function is_axe_mv(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    if (oc !== WEAPON_CLASS && oc !== TOOL_CLASS) return false;
    return (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) === P_AXE_MV;
}

// C ref: mon.c:2126-2370 mfndpos(mon,data,flag) — return count of acceptable
// neighbour positions, filling data->poss[]/info[] in place (fixed 9-slot
// buffers, matching mfndpos.h's `coord poss[9]; long info[9];`).
export function mfndpos(mon, data, flag) {
    const x = mon.mx | 0;
    const y = mon.my | 0;
    // WIRING FIX (movemon integration spec): `mon.data` (a materialized
    // permonst-shaped object) and `mon.data_mndx` only exist on the
    // reconstructMonst) — LIVE monst objects created by makemon/makedog
    // never get a `.data` field (verified: no `.data =` assignment exists
    // anywhere in js/makemon.js or js/dog.js), only `.mndx`/`.mnum` (the
    // monsndx() convention every sibling mon.c-family port already uses,
    // e.g. js/monmove.js:mfndpos_nontame, js/dogmove.js:mfndpos_stub). The
    // prior direct `mon.data.mlet` / `mon.data_mndx` reads crashed with
    // "Cannot read properties of undefined (reading 'mlet')" the instant
    // this function was wired into a live dog_move/m_move call (the leaf
    // populates `.data`/`.data_mndx`, so this path was untested on live
    // state). permonstTemplate(mndx) is the SAME materializer
    // reconstructMonst itself calls — reusing it here keeps mdat's shape
    // identical on both the replay and live paths.
    const mndx = (mon.data_mndx ?? mon.mndx ?? mon.mnum) | 0;
    const mdat = mon.data ?? permonstTemplate(mndx);
    const nowloc = game.level?.at(x, y);
    const nowtyp = nowloc ? (nowloc.typ | 0) : STONE;

    // C mon.c:2150 memset(data,0,sizeof(*data)) — explicit reset so this
    // port is correct for any caller, not just the replay fixture's
    data.cnt = 0;
    for (let i = 0; i < 9; i++) { data.poss[i] = { x: 0, y: 0 }; data.info[i] = 0; }

    const nodiag = (mndx === PM_GRID_BUG);
    let wantpool = ((mdat.mlet | 0) === S_EEL_MV);
    const poolok = ((!Is_waterlevel(game.u?.uz) && m_in_air(mon))
                     || (is_swimmer_mv(mdat) && !wantpool));
    let lavaok = (m_in_air(mon) || likes_lava_mv(mndx));
    if (mndx === PM_FLOATING_EYE) lavaok = false; /* prefers to avoid heat */
    let thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);
    // C mon.c:2172-2174 — a damaging (poison) cloud makes the avoidance live.
    const poisongas_ok = (m_poisongas_ok(mon) === M_POISONGAS_OK);
    const in_poisongas = poisoncloud_at(x, y);

    let rockok = false, treeok = false;
    if (flag & ALLOW_DIG) {
        if (!needspick_mv(mdat)) {
            rockok = treeok = true;
        } else if (MON_WEP_nc(mon)?.cursed && mon.weapon_check === NO_WEAPON_WANTED) {
            rockok = is_pick(MON_WEP_nc(mon));
            treeok = is_axe_mv(MON_WEP_nc(mon));
        } else {
            rockok = !!m_carrying(mon, PICK_AXE_MV)
                || (!!m_carrying(mon, DWARVISH_MATTOCK_MV) && !which_armor_mv(mon, W_ARMS));
            treeok = !!m_carrying(mon, AXE_MV)
                || (!!m_carrying(mon, BATTLE_AXE_MV) && !which_armor_mv(mon, W_ARMS));
        }
        if (rockok || treeok) thrudoor = true;
    }

    let cnt = 0;
    for (;;) { /* C mon.c:2185 nexttry: (eels retry on land if no water found) */
        cnt = 0;
        if (mon.mconf) { flag |= ALLOW_ALL; flag &= ~NOTONL; }
        if (!mon.mcansee) flag |= ALLOW_SSM;
        const maxx = Math.min(x + 1, COLNO - 1);
        const maxy = Math.min(y + 1, ROWNO - 1);
        /* FF_MFNDTRACE-only candidate rejection ledger.  Keep this at the
         * actual rejection sites so C/JS traces can be joined by id/coord;
         * this helper is inert in normal gameplay and does not inspect RNG. */
        const traceReject = (nx, ny, reason) => {
            if (typeof process !== 'undefined' && ENV?.FF_MFNDTRACE === '1')
                pushRngLogEntry(`^mfnd_reject[moves=${game.moves | 0} id=${mon.m_id | 0} mnum=${mndx}`
                    + ` xy=${x},${y} cand=${nx},${ny} reason=${reason} flag=${flag >>> 0}`
                    + ` typ=${game.level?.at(nx, ny)?.typ ?? -1}]`);
        };
        for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
            for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
                if (nx === x && ny === y) continue;
                const nloc = game.level?.at(nx, ny);
                const ntyp = nloc ? (nloc.typ | 0) : STONE;

                if (IS_OBSTRUCTED(ntyp)
                    && !((flag & ALLOW_WALL) && may_passwall(nx, ny))
                    && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny))) {
                    traceReject(nx, ny, 'obstructed');
                    continue;
                }

                /* intelligent peacefuls avoid digging shop/temple walls.
                   C mon.c:2217-2220.  (The note that used to sit here — "in_rooms
                   is a local stub, so this branch is always false" — was true of
                   the shadowing stub this file carried and is false now.) */
                if (IS_OBSTRUCTED(ntyp) && rockok
                    && !mindless_mv(mdat) && (mon.mpeaceful || mon.mtame)
                    && ((in_rooms(nx, ny, TEMPLE)[0] | 0) || (in_rooms(nx, ny, SHOPBASE)[0] | 0))
                    && !((in_rooms(x, y, TEMPLE)[0] | 0) || (in_rooms(x, y, SHOPBASE)[0] | 0))) {
                    traceReject(nx, ny, 'peaceful_dig_shop_temple');
                    continue;
                }

                if (IS_WATERWALL(ntyp) && !is_swimmer_mv(mdat)) {
                    traceReject(nx, ny, 'waterwall');
                    continue;
                }


                /* KMH -- Added iron bars */
                if (ntyp === IRONBARS
                    && (!(flag & ALLOW_BARS)
                        || (((nloc ? (nloc.wall_info | 0) : 0) & W_NONDIGGABLE)
                            && (dmgtype(mdat, AD_RUST_MV) || dmgtype(mdat, AD_CORR_MV))))) {
                    traceReject(nx, ny, 'ironbars');
                    continue;
                }

                if (IS_DOOR(ntyp)
                    /* an amorphous creature can only move under/through a
                       closed door if it doesn't currently have hero engulfed */
                    && !((amorphous_mv(mdat) || can_fog_mv(mon)) && !engulfing_u(mon))
                    && (((((nloc ? nloc.doormask : 0) | 0) & D_CLOSED) && !(flag & OPENDOOR))
                        || ((((nloc ? nloc.doormask : 0) | 0) & D_LOCKED) && !(flag & UNLOCKDOOR)))
                    && !thrudoor) {
                    traceReject(nx, ny, 'door');
                    continue;
                }

                /* avoid poison gas? (mon.c:2240-2243) */
                if (!poisongas_ok && !in_poisongas && poisoncloud_at(nx, ny)) {
                    traceReject(nx, ny, 'poisongas');
                    continue;
                }

                /* first diagonal checks (tight squeezes handled below) */
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && (((nowloc ? nowloc.doormask : 0) | 0) & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && (((nloc ? nloc.doormask : 0) | 0) & ~D_BROKEN))
                        || ((IS_DOOR(nowtyp) || IS_DOOR(ntyp)) && Is_rogue_level(game.u?.uz))
                        || (m_at(x, ny) && m_at(nx, y) && worm_cross(x, y, nx, ny)
                            && !m_at(nx, ny) && (nx !== game.u.ux || ny !== game.u.uy)))) {
                    traceReject(nx, ny, 'diagonal');
                    continue;
                }

                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL) {
                    traceReject(nx, ny, 'lavawall');
                    continue;
                }

                if ((poolok || (is_pool_mv(nx, ny) === wantpool))
                    && (lavaok || !is_lava_mv(nx, ny))) {
                    /* Displacement also displaces the Elbereth/scare monster,
                       as long as you are visible. */
                    const monseeu = (mon.mcansee && (!Invis_mv() || perceives_mv(mdat)));
                    let dispx, dispy;
                    if (Displaced_mv() && monseeu && mon.mux === nx && mon.muy === ny) {
                        dispx = game.u.ux; dispy = game.u.uy;
                    } else {
                        dispx = nx; dispy = ny;
                    }

                    data.info[cnt] = 0;
                    if (onscary_mv(dispx, dispy, mon)) {
                        if (!(flag & ALLOW_SSM)) {
                            traceReject(nx, ny, 'scary');
                            continue;
                        }
                        data.info[cnt] |= ALLOW_SSM;
                    }
                    if (u_at(nx, ny) || (nx === mon.mux && ny === mon.muy)) {
                        if (u_at(nx, ny)) {
                            /* found you at this square — set mux/muy so the
                               caller knows ALLOW_U means "attack you", not
                               the displaced image. */
                            mon.mux = game.u.ux;
                            mon.muy = game.u.uy;
                        }
                        if (!(flag & ALLOW_U)) {
                            traceReject(nx, ny, 'hero_not_allowed');
                            continue;
                        }
                        data.info[cnt] |= ALLOW_U;
                    } else {
                        const mtmp2 = m_at(nx, ny);
                        if (mtmp2) {
                            /* C mon.c:2287-2305.  mm_aggression_mk / mm_displacement_mk above are
                             * the ports of mon.c:2385-2468. */
                            let mmflag = flag | mm_aggression_mk(mon, mtmp2);
                            if (mmflag & ALLOW_M) {
                                data.info[cnt] |= ALLOW_M;
                                if (mtmp2.mtame) {
                                    if (!(mmflag & ALLOW_TM)) {
                                        traceReject(nx, ny, 'tame_monster');
                                        continue;
                                    }
                                    data.info[cnt] |= ALLOW_TM;
                                }
                            } else {
                                flag &= ~ALLOW_MDISP;
                                mmflag = flag | mm_displacement_mk(mon, mtmp2);
                                if (!(mmflag & ALLOW_MDISP)) {
                                    traceReject(nx, ny, 'occupied_monster');
                                    continue;
                                }
                                data.info[cnt] |= ALLOW_MDISP;
                            }
                        }
                        /* ALLOW_SANCT only prevents movement, not attack,
                           into a temple.  C mon.c:2319-2323. */
                        if (game.level?.flags?.has_temple
                            && (in_rooms(nx, ny, TEMPLE)[0] | 0)
                            && !(in_rooms(x, y, TEMPLE)[0] | 0)
                            && in_your_sanctuary(null, nx, ny)) {
                            if (!(flag & ALLOW_SANCT)) {
                                traceReject(nx, ny, 'sanctuary');
                                continue;
                            }
                            data.info[cnt] |= ALLOW_SANCT;
                        }
                    }
                    if (sobj_at(CLOVE_OF_GARLIC_MV, nx, ny)) {
                        if (flag & NOGARLIC) {
                            traceReject(nx, ny, 'garlic');
                            continue;
                        }
                        data.info[cnt] |= NOGARLIC;
                    }
                    if (sobj_at(BOULDER_MV, nx, ny)) {
                        if (!(flag & ALLOW_ROCK)) {
                            traceReject(nx, ny, 'boulder');
                            continue;
                        }
                        data.info[cnt] |= ALLOW_ROCK;
                    }
                    if (monseeu && monlineu_mv(mon, nx, ny)) {
                        if (flag & NOTONL) {
                            traceReject(nx, ny, 'not_on_line');
                            continue;
                        }
                        data.info[cnt] |= NOTONL;
                    }
                    /* check for diagonal tight squeeze */
                    if (nx !== x && ny !== y) {
                        const sideA = bad_rock_mv(mdat, x, ny);
                        const sideB = bad_rock_mv(mdat, nx, y);
                        const squeeze = cant_squeeze_thru_mv(mon);
                        if (typeof process !== 'undefined' && ENV?.FF_MFNDTRACE === '1')
                            pushRngLogEntry(`^mfnd_diag[moves=${game.moves | 0} id=${mon.m_id | 0} mnum=${mndx} xy=${x},${y} cand=${nx},${ny} a=${sideA ? 1 : 0} b=${sideB ? 1 : 0} squeeze=${squeeze | 0} skip=${sideA && sideB && squeeze ? 1 : 0}]`);
                        if (sideA && sideB && squeeze) {
                            traceReject(nx, ny, 'tight_squeeze');
                            continue;
                        }
                    }
                    /* The monster avoids a particular type of trap if it's
                       familiar with the trap type. */
                    const ttmp = t_at(nx, ny);
                    if (ttmp) {
                        if ((ttmp.ttyp | 0) >= TRAPNUM || (ttmp.ttyp | 0) === 0) {
                            /* impossible(...) — logging no-op, no state effect. */
                            traceReject(nx, ny, 'invalid_trap');
                            continue;
                        }
                        if (fixed_tele_trap_mv(ttmp) && hastrack(nx, ny)) {
                            data.info[cnt] |= ALLOW_TRAPS;
                        } else if (!m_harmless_trap(mon, ttmp)) {
                            if (!(flag & ALLOW_TRAPS) && mon_knows_traps(mon, ttmp.ttyp)) {
                                traceReject(nx, ny, 'known_trap');
                                continue;
                            }
                            data.info[cnt] |= ALLOW_TRAPS;
                        }
                    }
                    data.poss[cnt] = { x: nx, y: ny };
                    cnt++;
                }
            }
        }
        if (!cnt && wantpool && !is_pool_mv(x, y)) {
            wantpool = false;
            continue;
        }
        break;
    }
    data.cnt = cnt;
    return cnt;
}

/* C ref: nethack-c-v5/upstream/src/mon.c:4596 healmon() */
export function healmon(mtmp, amt, overheal) {
    const g = game;
    const u = g.u;
    if (is_youmonst(mtmp)) {
        const oldhp = Upolyd(u) ? u.mh : u.uhp;
        healup(amt, 0, 0, 0);
        return (Upolyd(u) ? u.mh : u.uhp) - oldhp;
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

export async function restore_cham(mon) {
    /* C mon.c:4651 — arriving monsters must honor the hero's protection. */
    if (Protection_from_shape_changers_nc() || mon.mcan) {
        await normal_shape(mon);
    } else if (mon.cham === NON_PM) {
        mon.cham = pm_to_cham(mon.data.pmidx);
    }
}

/* C mon.c:4626-4643 — resume shapechanging and sleeping mimic disguises. */
async function m_restartcham(mon) {
    if (!mon.mcan)
        mon.cham = pm_to_cham(mon.data.pmidx);
    if (mon.data.mlet === 13 /* S_MIMIC */ && mon.msleeping) {
        await set_mimic_sym(mon);
        newsym(mon.mx, mon.my);
    }
}

export async function restartcham() {
    for (let mon = game.fmon, next; mon; mon = next) {
        next = mon.nmon;
        if ((mon.mhp | 0) < 1 || (mon.mstate | 0) !== MON_FLOOR)
            continue;
        await m_restartcham(mon);
    }
}

export async function rescham() {
    /* C mon.c:4621 rescham -> iter_mons (:4529): normal_shape must finish
     * before the next monster; the general iter_mons has synchronous callers. */
    for (let mon = game.fmon, next; mon; mon = next) {
        next = mon.nmon;
        if ((mon.mhp | 0) < 1 || (mon.mstate | 0) !== MON_FLOOR)
            continue;
        await normal_shape(mon);
    }
}

/* C mon.c:4421-4455 — restore a monster's ordinary shape.  This is used by
 * rescham() and by callers which cancel a shape change; it must preserve the
 * cancelled flag across newcham(), then reveal disguises and finish mimic
 * meals exactly as C does. */
export async function normal_shape(mon) {
    const mcham = mon?.cham | 0;
    if (ismnum(mcham)) {
        const mcan = mon.mcan;
        await newcham(mon, mcham, NC_SHOW_MSG);
        mon.cham = NON_PM;
        if (mcan)
            mon.mcan = 1;
        newsym(mon.mx | 0, mon.my | 0);
    }
    if (is_were(mon?.data) && (mon.data.mlet | 0) !== S_HUMAN)
        await new_were(mon);
    const apType = (mon.m_ap_type | 0) & M_AP_TYPMASK;
    if (apType !== M_AP_NOTHING) {
        if (!mon.meating) {
            if (apType !== M_AP_MONSTER)
                mon.msleeping = 1;
            seemimic(mon);
        } else {
            finish_meating_mcd(mon);
        }
    }
}

/* C mon.c:4517-4531 — walk the live, on-level monster chain.  Cache nmon
 * before invoking the callback because callbacks such as normal_shape can
 * mutate or unlink the current monster. */
export function iter_mons(fn) {
    for (let mtmp = game.fmon, next; mtmp; mtmp = next) {
        next = mtmp.nmon;
        if ((mtmp.mhp | 0) < 1)
            continue;
        if ((mtmp.mstate | 0) !== (MON_FLOOR | 0))
            continue;
        fn(mtmp);
    }
}

/* C ref: mon.c:2064-2124 mon_allowflags() — re-export canonical body from js/monmove.js */
export { mon_allowflags } from './monmove.js';

/* C monflag.h MS_* — only the values this tail actually tests. */
const MS_SILENT_SM = 0, MS_HUMANOID_SM = 25, MS_ARREST_SM = 26,
      MS_SOLDIER_SM = 27, MS_GUARD_SM = 28, MS_DJINNI_SM = 29, MS_NURSE_SM = 30,
      MS_SEDUCE_SM = 31, MS_VAMPIRE_SM = 32, MS_CUSS_SM = 34, MS_LEADER_SM = 36,
      MS_GUARDIAN_SM = 38, MS_SELL_SM = 39, MS_ORACLE_SM = 40, MS_PRIEST_SM = 41,
      MS_SPELL_SM = 42, MS_BOAST_SM = 43, MS_IMITATE_SM = 22, MS_WERE_SM = 23,
      MS_ORC_SM = 24, MS_GRUNT_SM = 11, MS_LAUGH_SM = 20, MS_ROAR_SM = 3,
      MS_BELLOW_SM = 4;

/* C monflag.h M1_HUMANOID / M1_MINDLESS. */
const M1_HUMANOID_SM = 0x00020000, M1_MINDLESS_SM = 0x00010000;

/* C mondata.h:159 is_watch(ptr). */
function is_watch_sm(ptr) {
    const ix = (ptr?.pmidx ?? -1) | 0;
    return ix === PM_WATCHMAN || ix === PM_WATCH_CAPTAIN;
}

/* C mondata.c:1331-1351 big_little_match(montyp1, montyp2). */
function big_little_match_sm(montyp1, montyp2) {
    if (montyp1 === montyp2)
        return true;
    const m1 = permonstTemplate(montyp1), m2 = permonstTemplate(montyp2);
    if (!m1 || !m2 || (m1.mlet | 0) !== (m2.mlet | 0))
        return false;
    for (let l = montyp1, b; (b = little_to_big_pm(l)) !== l; l = b)
        if (b === montyp2)
            return true;
    for (let l = montyp2, b; (b = little_to_big_pm(l)) !== l; l = b)
        if (b === montyp1)
            return true;
    return false;
}

/* C ref: sounds.c:546-609 maybe_gasp(mon) — "hero has attacked a peaceful
 * monster within 'mon's view".  Returns the exclamation, or null.
 *
 * THE RNG LEAF: hack.h:1493 ROLL_FROM(Exclam) is `Exclam[rn2(SIZE(Exclam))]`,
 * i.e. an rn2(5) drawn ONLY when dogasp is true.  Getting the dogasp switch
 * wrong therefore costs a draw, not just a message.
 *
 * EMIN lives in mextra.emin, including the renegade flag. */
function maybe_gasp_sm(mon) {
    const Exclam = ["Gasp!", "Uh-oh.", "Oh my!", "What?", "Why?"];
    const mptr = mon.data;
    let msound = (mptr?.msound | 0);
    let dogasp = false;

    /* C sounds.c:556-558 — other roles' guardians and cross-aligned priests
     * don't gasp. */
    if ((msound === MS_GUARDIAN_SM && (mptr?.pmidx | 0) !== quest_info(MS_GUARDIAN_SM))
        || (msound === MS_PRIEST_SM && !p_coaligned(mon)))
        msound = MS_SILENT_SM;
    else if (msound === MS_CUSS_SM && mon.mextra?.emin
             && (p_coaligned(mon) ? !mon.mextra.emin.renegade : mon.mextra.emin.renegade))
        msound = MS_HUMANOID_SM;

    switch (msound) {
    case MS_HUMANOID_SM: case MS_ARREST_SM: case MS_SOLDIER_SM:
    case MS_GUARD_SM: case MS_NURSE_SM: case MS_SEDUCE_SM:
    case MS_LEADER_SM: case MS_GUARDIAN_SM: case MS_SELL_SM:
    case MS_ORACLE_SM: case MS_PRIEST_SM: case MS_BOAST_SM:
    case MS_IMITATE_SM:
        dogasp = true;
        break;
    /* C sounds.c:585-596 — "issue comprehensible word(s) if hero is similar
     * type of creature". */
    case MS_ORC_SM: case MS_GRUNT_SM: case MS_LAUGH_SM: case MS_ROAR_SM:
    case MS_BELLOW_SM: case MS_DJINNI_SM: case MS_VAMPIRE_SM:
    case MS_WERE_SM: case MS_SPELL_SM:
        dogasp = ((mptr?.mlet | 0) === (game.youmonst?.data?.mlet | 0));
        break;
    default:
        break;
    }
    if (dogasp)
        return Exclam[rn2(Exclam.length)];
    return null;
}

export function get_iter_mons(bfunc) {
    for (let mtmp = game.fmon, next; mtmp; mtmp = next) {
        next = mtmp.nmon;
        if ((mtmp.mhp | 0) < 1)       /* DEADMONSTER */
            continue;
        if ((mtmp.mstate | 0) !== MON_FLOOR)
            continue;
        if (mtmp.data === undefined)
            mtmp.data = permonstTemplate(mtmp.mnum);
        if (bfunc(mtmp))
            return mtmp;
    }
    return null;
}

export async function angry_guards(silent) {
    let ct = 0, nct = 0, sct = 0, slct = 0;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER */
        if (is_watch_sm(mtmp.data) && mtmp.mpeaceful) {
            ct++;
            if (canspotmon(mtmp) && mtmp.mcanmove) {
                if (_sm_m_next2u(mtmp)) nct++;
                else sct++;
            }
            if (mtmp.msleeping || mtmp.mfrozen) {
                slct++;
                mtmp.msleeping = mtmp.mfrozen = 0;
            }
            mtmp.mpeaceful = 0;
        }
    }
    if (ct) {
        if (!silent) {
            if (slct) {
                const buf = "guard" + (slct === 1 ? "" : "s");
                await pline("The " + buf + " " + vtense(buf, "wake") + " up.");
            }
            if (nct) {
                const buf = "guard" + (nct === 1 ? "" : "s");
                await pline("The " + buf + " " + vtense(buf, "get") + " angry!");
            } else if (sct) {
                const buf = "guard" + (sct === 1 ? "" : "s");
                await pline((sct === 1 ? "An angry" : "Angry") + " " + buf + " "
                      + vtense(buf, "are") + " approaching!");
            } else {
                const buf = (ct === 1) ? "a guard's" : "guards'";
                await You_hear("the shrill sound of " + buf + " whistle"
                      + (ct === 1 ? "" : "s") + ".");
            }
        }
        return true;
    }
    return false;
}

/* C mondata.h m_next2u(mon) — dist2(mon, hero) <= 2. */
function _sm_m_next2u(mon) {
    return dist2(mon.mx | 0, mon.my | 0, game.u.ux | 0, game.u.uy | 0) <= 2;
}

/* C ref: mon.c:4159-4256 peacefuls_respond(mtmp) — every OTHER peaceful monster
 * that can see the hero attack `mtmp` reacts.
 *
 * RNG, in C's order, per qualifying monster:
 *   humanoid/shk/priest arm : rn2(5) gasp roll (guarded by !Deaf), then, for a
 *                             non-shk/non-priest/non-leader, rn2(10) against
 *                             mlevel and rn2(50) for the flee timer.
 *   same-mlet arm           : rn2(3), then rn2(4) growl and rn2(6) flee,
 *                             the last with an rn2(25) timer.
 *
 *
 * `exclaimed` after growl() tests C's `iflags.last_msg == PLNMSG_GROWL`.
 * It is message-only: monflee's own two
 * draws sit behind flees_light() (an artifact light source) and PM_VROCK,
 * neither of which any of these monsters has. */
async function peacefuls_respond(mtmp) {
    const mndx = (mtmp.data?.pmidx ?? mtmp.mnum ?? -1) | 0;
    const Deaf = Deaf_live();

    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) < 1) continue;   /* DEADMONSTER */
        if (mon === mtmp) continue;

        const mdata = mon.data;
        /* C mondata.h mindless(ptr) = ptr->mflags1 & M1_MINDLESS. */
        if (((mdata?.mflags1 | 0) & M1_MINDLESS_SM) !== 0) continue;
        if (!mon.mpeaceful || !couldsee(mon.mx, mon.my) || mon.msleeping
            || !mon.mcansee || !m_canseeu(mon))
            continue;

        let buf = '', exclaimed = false, needpunct = false, alreadyfleeing;

        if (((mdata?.mflags1 | 0) & M1_HUMANOID_SM) || mon.isshk || mon.ispriest) {
            if (is_watch_sm(mdata)) {
                SetVoice(mon, 0, 80, 0);
                await pline("\"Halt!  You're under arrest!\"");
                await angry_guards(!!Deaf);
            } else {
                if (!Deaf && !rn2(5)) {
                    const gasp = maybe_gasp_sm(mon);
                    if (gasp) {
                        if (!strncmpi(gasp, 'gasp', 4)) {
                            buf = Monnam(mon) + " gasps";
                            needpunct = true;
                        } else {
                            buf = Monnam(mon) + ' exclaims "' + gasp + '"';
                        }
                        exclaimed = true;
                    }
                }
                /* C mon.c:4203-4210 — shopkeepers and temple priests might gasp
                   in surprise, but they won't become angry here; quest leader
                   only gets angry if the hero attacks own quest guardians. */
                if (mon.isshk || mon.ispriest
                    || ((mdata?.pmidx | 0) === quest_info(MS_LEADER_SM)
                        && (mtmp.data?.pmidx | 0) !== _sm_guardnum())) {
                    if (exclaimed)
                        await pline_mon(mon, "%s%s", buf, " then shrugs.");
                    continue;
                }
                if ((mdata?.mlevel | 0) < rn2(10)
                    && (mdata?.pmidx | 0) !== _sm_guardnum()) {
                    alreadyfleeing = (mon.mflee || mon.mfleetim);
                    await monflee(mon, rn2(50) + 25, true, !exclaimed);
                    if (exclaimed) {
                        if ((game.flags?.verbose ?? true) && !alreadyfleeing) {
                            buf += " and then turns to flee.";
                            needpunct = false;
                        }
                    } else {
                        exclaimed = true; /* got msg from monflee() */
                    }
                }
                if (buf)
                    await pline_mon(mon, "%s%s", buf, needpunct ? "." : "");
                if (mon.mtame) {
                    /* C: mustn't set mpeaceful to 0 as below */
                } else {
                    mon.mpeaceful = 0;
                    mon.mstrategy = (mon.mstrategy | 0) & ~(STRAT_CLOSE | STRAT_WAITFORU);
                    adjalign(-1);
                    if (!exclaimed)
                        await pline_mon(mon, "%s gets angry!", Monnam(mon));
                }
            }
        } else if ((mdata?.mlet | 0) === (mtmp.data?.mlet | 0)
                   && big_little_match_sm(mndx, (mdata?.pmidx | 0))
                   && !rn2(3)) {
            if (!rn2(4)) {
                growl(mon);
                exclaimed = game.iflags?.last_msg === PLNMSG_GROWL;
            }
            if (rn2(6)) {
                alreadyfleeing = (mon.mflee || mon.mfleetim);
                await monflee(mon, rn2(25) + 15, true, !exclaimed);
                if (exclaimed && !alreadyfleeing)
                    pline("And then starts to flee.");
            }
        }
    }
}

/* C role.c gu.urole.guardnum, i.e. quest_info(MS_GUARDIAN). */
function _sm_guardnum() { return quest_info(MS_GUARDIAN_SM) | 0; }

/* C ref: mon.c:4137-4157 qst_guardians_respond() — RNG-FREE. */
async function qst_guardians_respond() {
    const q_guardian = _sm_guardnum();
    let got_mad = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) < 1) continue;
        if ((mon.data?.pmidx | 0) === q_guardian && mon.mpeaceful) {
            mon.mpeaceful = 0;
            if (canseemon(mon))
                ++got_mad;
        }
    }
    if (got_mad && !_Hallucination_mk()) {
        /* C mon.c:4152 q_guardian->pmnames[NEUTRAL] — makemon_pmnames.json rows
         * are [male, female, neutral] in C's pmnames[] order; NEUTRAL is the
         * last entry and is the only one C uses here. */
        const nrow = MONS_PMNAMES_ROWS[q_guardian] || [];
        let who = nrow[nrow.length - 1] || nrow[0] || "guardian";
        if (got_mad > 1)
            who = makeplural(who);
        await pline("The " + who + " " + vtense(who, "appear") + " to be angry too...");
    }
}

// C ref: mon.c:4255 setmangry — monster gets angry at player
export async function setmangry(mtmp, via_attack) {
    const g = game;
    const u = g.u;
    /* C monst.h:177 STRAT_WAITMASK = STRAT_CLOSE | STRAT_WAITFORU; both flags are
     * now imported from const.js at the top of this file (the local
     * `const STRAT_CLOSE` that used to live here shadowed that import). */
    const STRAT_WAITMASK = STRAT_CLOSE | STRAT_WAITFORU;
    const Blind = _Blind_mk();

    // humanoid: C mondata.h humanoid(ptr) = mflags1 & M1_HUMANOID (the
    // file's monflag.h constant M1_HUMANOID_SM, shared with peacefuls_respond)
    function humanoid(ptr) {
        return ((ptr.mflags1 | 0) & M1_HUMANOID_SM) !== 0;
    }

    if (via_attack && sengr_at("Elbereth", u.ux, u.uy, true)
        && (onscary(u.ux, u.uy, mtmp) || mtmp.mpeaceful)) {
        await You_feel("like a hypocrite.");
        adjalign((u.ualign.record > 5) ? -5 : -rnd(5));
        if (!Blind)
            pline("The engraving beneath you fades.");
        del_engr_at(u.ux, u.uy);
    }

    mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful)
        return;
    if (mtmp.mtame)
        return;
    mtmp.mpeaceful = 0;
    if (mtmp.ispriest) {
        if (p_coaligned(mtmp))
            adjalign(-5);
        else
            adjalign(2);
    } else {
        adjalign(-1);
    }
    if (humanoid(mtmp.data) || mtmp.isshk || mtmp.isgd) {
        if (couldsee(mtmp.mx, mtmp.my))
            await pline_mon(mtmp, "%s gets angry!", Monnam(mtmp));
    } else {
        growl(mtmp);
    }

    if (mtmp.data && mtmp.data.pmidx === quest_info(MS_LEADER))
        await qst_guardians_respond();

    /* mon.c:4316 — svc.context.mon_moving lives at game.context (allmain.js writes it) */
    if (!(g.context && g.context.mon_moving))
        await peacefuls_respond(mtmp);
}

const M1_FLY = 0x00000001;         /* monflag.h:85 */

const M1_AMPHIBIOUS = 0x00000200;  /* monflag.h:94 */

const M1_REGEN = 0x00800000;       /* monflag.h:108 */

const M1_SEE_INVIS = 0x01000000;   /* monflag.h:109 */

const M1_TPORT = 0x02000000;       /* monflag.h:110 */

const M1_TPORT_CNTRL = 0x04000000; /* monflag.h:111 */

const AT_WEAP_ERI = 254;           /* monattk.h:28 */

const AT_MAGC_ERI = 255;           /* monattk.h:29 */

const AD_DRST_ERI = 7;             /* monattk.h:49 */

const AD_SPEL_ERI = 241;           /* monattk.h:88 */

let _pmErinys = -2;

function pmErinys() {
    if (_pmErinys === -2) {
        _pmErinys = -1;
        const rows = monPmnamesPackAt.pmnames;
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (r && (r[2] === 'erinys' || r[1] === 'erinys' || r[0] === 'erinys')) {
                _pmErinys = i;
                break;
            }
        }
    }
    return _pmErinys;
}

export function adj_erinys(abuse) {
    const mndx = pmErinys();
    if (mndx < 0)
        return;                         /* no such row — nothing C could mutate */
    const pm = monsPackAt.mons[mndx];
    const mattk = monMattkPackAt.mattk[mndx];
    const ab = abuse >>> 0;

    if (ab > 5)
        pm[6] = (pm[6] >>> 0) | M1_SEE_INVIS;          /* mon.c:5926-5928 */
    if (ab > 10)
        pm[6] = (pm[6] >>> 0) | M1_AMPHIBIOUS;         /* mon.c:5929-5931 */
    if (ab > 15)
        pm[6] = (pm[6] >>> 0) | M1_FLY;                /* mon.c:5932-5934 */
    if (ab > 20)
        mattk[0].damn = 3;              /* more powerful attack — mon.c:5935-5938 */
    if (ab > 25)
        pm[6] = (pm[6] >>> 0) | M1_REGEN;              /* mon.c:5939-5941 */
    if (ab > 30)
        pm[6] = (pm[6] >>> 0) | M1_TPORT_CNTRL;        /* mon.c:5942-5944 */
    if (ab > 35) {                      /* second attack — mon.c:5945-5951 */
        mattk[1].aatyp = AT_WEAP_ERI;
        mattk[1].adtyp = AD_DRST_ERI;
        mattk[1].damn = 3;
        mattk[1].damd = 4;
    }
    if (ab > 40)
        pm[6] = (pm[6] >>> 0) | M1_TPORT;              /* mon.c:5952-5954 */
    if (ab > 50) {                      /* third (spellcasting) attack — :5955-5961 */
        mattk[2].aatyp = AT_MAGC_ERI;
        mattk[2].adtyp = AD_SPEL_ERI;
        mattk[2].damn = 3;
        mattk[2].damd = 4;
    }
    /* also adjust level and difficulty — mon.c:5963-5964, UNCONDITIONAL.
     * MONS row layout (js/makemon.js:1319 permonstTemplate): [1]=mlevel,
     * [2]=difficulty. */
    pm[1] = Math.min(7 + ab, 50);
    pm[2] = Math.min(10 + Math.trunc(ab / 3), 25);

    /* C mon.c:5924-5964 mutates the permonst shared by every erinys.
     * permonstTemplate() copies scalar fields, so update existing instances
     * too. Stored levels retain monsters in memory instead of restmon()'s
     * fresh pointers into mons[]; restored saves also copy the attack array. */
    const heads = [game.fmon, game.migrating_mons, game.mydogs,
                   game.youmonst, game.u?.usteed, game.u?.ustuck];
    for (const snap of game.levelStore?.values() ?? [])
        heads.push(snap.fmon);
    const seen = new Set();
    for (const head of heads) {
        for (let mon = head; mon && !seen.has(mon); mon = mon.nmon) {
            seen.add(mon);
            const data = mon.data;
            if (data?.pmidx !== mndx) continue;
            data.mflags1 = pm[6] >>> 0;
            data.mlevel = pm[1];
            data.mattk = mattk;
        }
    }
}

/* C mon.c:6077 flash_mon + display.c:1305 flash_glyph_at.  Temporarily grant
 * visibility to the square, alternate the monster with its remembered
 * background, then restore both vision and the normal map cell. */
export function flash_mon(mon) {
    const x = mon.mx | 0, y = mon.my | 0;
    let count = couldsee(x, y) ? 8 : 4;
    if (!_sparkle_on())
        count = Math.trunc(count / 2);
    const row = game.viz_array?.[y];
    const saved = row?.[x] | 0;
    if (row)
        row[x] = saved | IN_SIGHT | COULD_SEE;
    try {
        flash_glyph_at(x, y, mon_to_glyph(mon), count);
    } finally {
        if (row)
            row[x] = saved;
    }
    newsym(x, y);
}

const MSLOW = 1; /* C monst.h:205 */

const MFAST = 2; /* C monst.h:206 */

/* C ref: mon.c:1108-1150 mcalcmove(mon, m_moving).
 * Computes the movement allotment for one monster and, ONLY when m_moving is
 * true, fires exactly one rn2(NORMAL_SPEED) for the random rounding —
 * unconditionally within that arm, even when mmove is already a multiple of
 * NORMAL_SPEED (mmove_adj == 0). Every real caller in this file passes
 * m_moving=TRUE (the fmon reallocation loop and u_calc_moveamt's steed arm,
 * both allmain.c call sites); the parameter and its default are kept to match
 * C's actual two-argument signature (worm_move's `mcalcmove(worm, FALSE)`,
 * worm.c:222, is the one caller that passes FALSE and skips the rounding arm
 * entirely; js/worm.js imports this export for it).
 * mmove (move speed) is column 9 of makemon_mons.json (LVL(lvl, mov, ...)).
 * mspeed MSLOW/MFAST adjustments mirror C; usteed gallop branch (rn2(2)) is
 * guarded — fmon monsters are never u.usteed, so it never fires here. */
export function mcalcmove(mon, m_moving = true) {
    const mndx = (mon.data?.pmidx ?? mon.mndx ?? mon.mnum ?? 0) | 0;
    let mmove = (mndx >= 0 && mndx < MONS.length) ? ((MONS[mndx][9] ?? 0) | 0) : 0;
    const mspeed = (mon.mspeed | 0);
    if (mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }
    if (mon === game.u?.usteed && (game.u?.ugallop | 0) && (game.context?.mv | 0)) {
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    }
    /* C mon.c:1155-1166 — only when m_moving: random rounding to a
     * NORMAL_SPEED multiple. When m_moving is false (worm_move's call), C
     * skips this whole block and draws nothing here. */
    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}

/* C mon.c:3469 killed() — re-export canonical body from js/mhitm.js */
export { killed } from './mhitm.js';

// C ref: mon.c:2472-2511 dmonsfree() — purge dead (non-guard) monsters from
// the fmon chain, then reconcile the freed count against mon.c:2796's
// iflags.purge_monsters counter (every m_detach twin increments it).  A
// mismatch is C's impossible("dmonsfree: %d removed doesn't match %d pending
// on %s") — reached when a no-time level change saves the old level FREEING
// (save.c:487 skips the purge) and the pending death surfaces at the next
// dmonsfree (mkmaze.c:1191, after load_special).
export async function dmonsfree() {
    const g = game;
    let count = 0;
    let prev = null;
    let mtmp = g.fmon;
    while (mtmp) {
        const next = mtmp.nmon;
        if (mtmp.mhp < 1 && !mtmp.isgd) {
            if (prev)
                prev.nmon = next;
            else
                g.fmon = next;
            mtmp.nmon = null;
            dealloc_monst(mtmp);
            count++;
        } else {
            prev = mtmp;
        }
        mtmp = next;
    }
    /* mon.c:2504-2509 — describe_level(buf, 2) keeps the "Plane of " prefix
     * (dflgs&2), so an endgame mismatch names the full plane. */
    if (count !== (g.iflags.purge_monsters | 0))
        await impossible('dmonsfree: %d removed doesn\'t match %d pending on %s',
                         count, g.iflags.purge_monsters | 0,
                         describe_level_buf(2, g.u && g.u.uz));
    g.iflags.purge_monsters = 0; /* mon.c:2510 */
}

/* C ref: mon.c:57-70 pet_sanity_check(mtmp, msgarg). */
async function pet_sanity_check(mtmp, msgarg) {
    if (has_edog(mtmp)) {
        const edog = mtmp.mextra.edog;

        if ((edog.droptime | 0) > (game.moves | 0))
            await lifecycle_impossible(
                'insane pet #%u has droptime (%ld) in the future (%ld) (%s)',
                mtmp.m_id, edog.droptime, game.moves, msgarg);
        /* TODO: verify some of the other edog fields */
    }
}

const SADDLE_SC = 235; /* C onames.h SADDLE (js/u_init.js) */
const LEASH_SC = 236;  /* C onames.h LEASH (js/mklev.js) */

/* C ref: apply.c get_mleash(mtmp) — the hero's leash attached to mtmp. */
function get_mleash_sc(mtmp) {
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if ((otmp.otyp | 0) === LEASH_SC && (otmp.leashmon | 0) === (mtmp.m_id | 0))
            return otmp;
    return null;
}

/* C ref: mon.c:72-254 sanity_check_single_mon(mtmp, chk_geno, msg).
 * PARTIAL PORT.  Not ported: the mnum/monsndx and illegal-data checks (JS
 * monsters carry no permonst pointer to compare), and the mundetected /
 * M_AP_TYPE hiding-and-mimicry block (mon.c:166-232). */
async function sanity_check_single_mon(mtmp, chk_geno, msg) {
    const mptr = mtmp.data;
    const mx = mtmp.mx, my = mtmp.my;
    const mndx = (mptr?.pmidx ?? mtmp.mnum) | 0;
    const mhp = mtmp.mhp | 0, mhpmax = mtmp.mhpmax | 0;

    /* check before DEADMONSTER() because dead monsters should still
       have sane mhpmax */
    if (mhpmax < 1 || mhp > mhpmax)
        await lifecycle_impossible('%s: level %d %s #%u [%s] has %d cur HP, %d max HP',
            msg, mtmp.m_lev | 0, pmname(mptr, NEUTRAL), mtmp.m_id, '(ptr)',
            mhp, mhpmax);
    if (mhp < 1) /* DEADMONSTER */
        return;
    if (chk_geno && mvitals_genod_nc(mndx))
        await lifecycle_impossible('genocided %s in play (%s)',
                                   pmname(mptr, Mgender(mtmp)), msg);
    if (mtmp.mtame && !mtmp.mpeaceful)
        await lifecycle_impossible('tame %s is not peaceful (%s)',
                                   pmname(mptr, Mgender(mtmp)), msg);
    if (mtmp.isshk && !has_eshk(mtmp))
        await lifecycle_impossible('shk without eshk (%s)', msg);
    if (mtmp.ispriest && !has_epri(mtmp))
        await lifecycle_impossible('priest without epri (%s)', msg);
    if (mtmp.isgd && !has_egd(mtmp))
        await lifecycle_impossible('guard without egd (%s)', msg);
    if (mtmp.isminion && !has_emin(mtmp))
        await lifecycle_impossible('minion without emin (%s)', msg);
    /* guardian angel on astral level is tame but has emin rather than edog */
    if (mtmp.mtame) {
        if (!has_edog(mtmp) && !mtmp.isminion)
            await lifecycle_impossible('pet without edog (%s)', msg);
        else
            await pet_sanity_check(mtmp, msg);
    }
    /* steed should be tame and saddled */
    if (mtmp === game.u.usteed) {
        const nt = !mtmp.mtame ? 'not tame' : null;
        const ns = !m_carrying(mtmp, SADDLE_SC) ? 'no saddle'
            : !which_armor(mtmp, W_SADDLE) ? 'saddle not worn'
                : null;
        if (ns || nt)
            await lifecycle_impossible('steed: %s%s%s (%s)',
                ns ? ns : '', (ns && nt) ? ', ' : '', nt ? nt : '', msg);
    }

    if (mtmp.mtrapped) {
        if (mtmp.wormno) {
            ; /* TODO: how to check worm in trap? */
        } else if (!t_at(mx, my))
            await lifecycle_impossible('trapped without a trap (%s)', msg);
    }
    if (mtmp.mfrozen && mtmp.mcanmove)
        await lifecycle_impossible('frozen monster [%s%s] is able to move (%s)',
            mtmp.mtame ? 'tame ' : mtmp.mpeaceful ? 'peaceful ' : '',
            pmname(mptr, Mgender(mtmp)), msg);

    if (mtmp.mleashed) {
        if (!get_mleash_sc(mtmp))
            await lifecycle_impossible('monst %u: leashed but no leash for %s',
                                       mtmp.m_id, mon_pmname(mtmp));
        else if (!mtmp.mtame)
            await lifecycle_impossible('monst %u: leashed but not tame %s',
                                       mtmp.m_id, mon_pmname(mtmp));
    }
}

/* C ref: mon.c:257-319 mon_sanity_check(void).  PARTIAL PORT: the per-
 * monster checks over fmon and migrating_mons.  Not ported: the
 * map-grid/fmon cross-checks (this port has no grid separate from fmon —
 * js/uhitm.js m_at walks fmon) and the worm checks (sanity_check_worm,
 * wormno_sanity_check). */
export async function mon_sanity_check() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        /* dead monsters should still have sane data */
        await sanity_check_single_mon(mtmp, true, 'fmon');
        if ((mtmp.mhp | 0) < 1 && !mtmp.isgd)
            continue;

        const x = mtmp.mx, y = mtmp.my;
        if (!isok(x, y) && !(mtmp.isgd && x === 0 && y === 0)) {
            await lifecycle_impossible('mon (%s) claims to be at <%d,%d>?',
                                       '(ptr)', x, y);
        } else if (mtmp === game.u.usteed) {
            /* steed is in fmon list but not on the map; its
               <mx,my> coordinates should match hero's location */
            if (x !== game.u.ux || y !== game.u.uy)
                await lifecycle_impossible('steed (%s) claims to be at <%d,%d>?',
                                           '(ptr)', x, y);
        }
    }

    for (let mtmp = game.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        await sanity_check_single_mon(mtmp, false, 'migr');

        if (((mtmp.mstate | 0)
             & ~(MON_MIGRATING | MON_LIMBO | MON_ENDGAME_MIGR | MON_OFFMAP)) !== 0
            || !((mtmp.mstate | 0) & MON_MIGRATING))
            await lifecycle_impossible('migrating mon (%s) with mstate set to 0x%08lx',
                                       '(ptr)', mtmp.mstate | 0);
    }
}
