import { Your, pline_The, verbalize, pline_mon, You } from './pline.js';
import { SR_DART, SR_BOW, SR_ELVEN_BOW, SR_ORCISH_BOW, SR_YUMI, SR_SLING, SR_CROSSBOW, SR_LUCKSTONE, SR_LOADSTONE, SR_FLINT, SR_BOULDER, SR_CORPSE, SR_EGG, SR_CREAM_PIE, SR_GEM_CLASS, SR_S_KOP, SR_NON_PM, SR_NO_WEAPON_WANTED, SR_W_ARMS, SR_W_WEP, SR_SILVER, SR_ART_SNICKERSNEE, SR_P_BOW, SR_P_SLING, SR_P_CROSSBOW, SR_M1_MINDLESS, SR_M1_ANIMAL, SR_M2_STRONG, SR_M2_ROCKTHROW, SR_M2_JEWELS, SR_rwep, SR_pwep, SR_arwep, SR_BIMANUAL, SH_DWARVISH_MATTOCK, SH_BATTLE_AXE, SH_AXE, SH_BULLWHIP, SH_CLUB, SH_PICK_AXE, SH_W_ARMG, SH_M2_GIANT, SH_NO_WEAPON_WANTED, SH_NEED_WEAPON, SH_NEED_HTH_WEAPON, SH_NEED_RANGED_WEAPON, SH_NEED_PICK_AXE, SH_NEED_AXE, SH_NEED_PICK_OR_AXE, SH_hwep, SH_BIMANUAL } from './weapon.js'; // weapon.c object-type tables
import { Mgender, hcolor } from './do_name.js';
import { quest_monster_died } from './quest.js';
import { find_mac } from './worn.js';
import { artifact_exists } from './artifact.js';
import { safe_oname } from './do_name.js';
import { create_gas_cloud } from './region.js';
import { xdir, ydir, A_CON, A_DEX, A_STR, A_WIS, HAND, M_ATTK_DEF_DIED, M_ATTK_HIT } from './const.js';
import { tele_restrict } from './teleport.js';
import { vamprises } from './mon.js';
import { spoteffects } from './hack.js';
import { unmap_invisible, Deaf } from './display.js';
import { There } from './pline.js';
import { glyph_cmap_at } from './display.js';
import { green_mon } from './muse.js';
import { S_KOP, G_NOCORPSE, G_GENOD, PM_FAMINE, PM_HUMAN, PM_PESTILENCE } from './mklev.js';
import { set_corpsenm } from './mkobj.js';
import { wipe_engr_at } from './engrave.js';
import { lifesaved_monster, mlifesaver } from './mon.js';
import { record_death_achievement } from './mklev.js';
import { add_to_minv } from './mkobj.js';
import { pm_to_cham } from './mon.js';
import { addinv } from './invent.js';
import { inv_cnt } from './hack.js';
import { merge_choice } from './invent.js';
import { dropy } from './do.js';
import { wizdeadorgone } from './wizard.js';
import { obj_no_longer_held } from './do.js';
import { set_msg_xy as set_msg_xy_uh } from './pline.js';
import { silver_sears } from './weapon.js';
import { is_youmonst, is_weptool } from './mhitm.js';
import { resists_magm, can_be_strangled } from './mondata.js';
import { mzapwand, mplayhorn } from './muse.js';
import { can_blow } from './mondata.js';
import { mhitm_adtyping_u, getmattk } from './mhitu.js';
import './mhitu.js';
import { night } from './calendar.js';
import { is_were, were_change } from './were.js';
import { Is_airlevel, Is_waterlevel } from './const.js';
import { PM_GREMLIN, PM_CLAY_GOLEM, PM_GHOUL, PM_SAMURAI, PM_MAIL_DAEMON } from './pm.generated.js';
import { PM_MEDUSA } from './pm.generated.js';
import { PM_BAT, PM_GIANT_BAT, PM_VAMPIRE_BAT, PM_STALKER } from './pm.generated.js';
import { snuff_lit } from './apply.js';
import { is_art } from './artifact.js'; /* obj.h:439 is_art */
// @ts-nocheck
import { game, wizard, discover } from './gstate.js';
import { rehumanize, uunstick } from './polyself.js';
import { The, helm_simple_name, cloak_simple_name, an, doname, mshot_xname } from './objnam.js';
import { quest_info } from './questpgr.js';
import { corpse_xname, the as the_sh, cxname as cxname_sh, Tobjnam as Tobjnam_sh, makeplural, simpleonames, obj_is_pname, bare_artifactname, otense, distant_name, vtense, Yobjnam2, singular, makesingular } from './objnam.js';
import { rn1, pushRngLogEntry } from './rng.js';
import { rn2, rnd, d } from './rnd.js';
import { m_move, set_apparxy } from './monmove.js';
import { canspotmon, newsym, sensemon, _topline_more_pending, flush_pending_messages, canseemon, unmap_object, glyph_is_invisible_at, remembered_glyph_is_invisible, map_invisible, glyph_is_warning_at, Unaware, shieldeff, see_monsters, GLYPHCLS_OBJ, GLYPHCLS_INVIS, tp_sensemon } from './display.js';
import { pline, livelog_printf, You_hear } from './pline.js';
import { gethungry, eat_brains, eating_conducts, newuhs } from './eat.js';
/* C attrib.c:316-408 poisoned() — canonical implementation lives in the
 * hero-defender path in mhitu.js and is safe to call synchronously here. */
import { poisoned_u as poisoned_real } from './mhitu.js';
/* Fire's inventory ignition is shared with the monster-defender path. */
import { ignite_items as ignite_items_real } from './trap.js';
import { digests_gu, enfolds_gu, noattacks_mndx } from './mhitu.js';
import { exercise, acurr, adjalign, change_luck as change_luck_uh, ART_NONARTIFACT, arti_spfx } from './attrib.js';
import { get_artifact, spec_m2 } from './artifact.js';
import { P_SKILL } from './skills.js';
import { P_DAGGER, P_KNIFE } from './const.js';
import { near_capacity } from './hack.js';
import { weight } from './weight.js';
import { useupall } from './invent.js';
import { obj_stop_timers } from './timeout.js';
import { EXPL_FIERY, MSLOW } from './const.js';
import { ARMOR_DATA } from './armor_data.js';
import { Upolyd, STR18, P_BARE_HANDED_COMBAT, P_NONE, P_NUM_SKILLS, P_SKILL_LIMIT, P_ISRESTRICTED,
P_BASIC, P_SKILLED, P_EXPERT, P_UNSKILLED, P_RIDING,
P_BOW, P_SLING, P_CROSSBOW, P_FLAIL, P_PICK_AXE, W_SADDLE, LEFT_SIDE, RIGHT_SIDE, LEG, M_AP_TYPE, M_AP_MONSTER, M_ATTK_AGR_DIED, M_ATTK_MISS, W_ARMG, W_ARM, W_ARMC, W_ARMU, W_ARMH, W_ARMS, W_ARMF, W_AMUL, W_RINGL, W_RINGR, engulfing_u, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP, M_SEEN_ELEC, STRAT_WAITFORU, FIRE_RES, COLD_RES, SLEEP_RES, FREE_ACTION, SHOCK_RES, POISON_RES, DRAIN_RES, STONE_RES, SEE_INVIS, DETECT_MONSTERS, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, BLINDED, TIMEOUT,
/* mon_nam's x_monnam call — C ref: nethack-c/src/do_name.c:1041-1046 */
ARTICLE_THE, ARTICLE_NONE, SUPPRESS_SADDLE, SUPPRESS_IT, SUPPRESS_INVISIBLE,
SUPPRESS_HALLUCINATION, SUPPRESS_NAME,
/* prop.h HALLUC/HALLUC_RES — the live keys for the Hallucination macro. */
HALLUC, HALLUC_RES, CONFUSION, STUNNED, P_LAST_WEAPON, P_LAST_SPELL, P_TWO_WEAPON_COMBAT,
TIP_ENHANCE, SHOPBASE, ROOMOFFSET, IS_OBSTRUCTED, HVY_ENCUMBER, FAST,
/* youprop.h:67-69,108 — Sick_resistance / Sick, read by hmonas's AT_ENGL
 * zombie/mummy sickness arm (uhitm.c:5783-5789). */
SICK_RES, SICK, DEAF, HALF_PHDAM, TELEPORT_CONTROL, KILLED_BY, KILLED_BY_AN, LOW_PM, MALE, FEMALE,
isok, STOMACH, ismnum, TELL } from './const.js';

export function _hero_resists(prop) {
    const p = game.u?.uprops?.[prop];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
/* Most hero properties live in u.uprops now. */
function _hero_resists_compat(prop, legacyField) {
    return _hero_resists(prop) || !!(legacyField && game?.[legacyField]);
}
/* C youprop.h:341 — Half_physical_damage is stored in the numeric uprops slot. */
function _half_physical_damage_uh() {
    return _hero_resists(HALF_PHDAM);
}
function _hero_hates_silver_uh() {
    const u = game.u || {};
    if (((u.ulycn ?? -1) | 0) >= LOW_PM) return true;
    return !!(game.youmonst && mon_hates_silver(game.youmonst));
}
/* handle_tip lives in js/cmd.js (it owns game.context.tips and the tip texts);
 * cmd.js imports this file, so this is a late-bound ES-module cycle — the same
 * shape js/monmove.js relies on for shk_move / pri_move. */
import { mbodypart, mbodypart as mbodypart_real } from './cmd.js';
import { handle_tip } from './hack.js';
import { dry_a_towel } from './weapon.js';
import { can_twoweapon, untwoweapon } from './wield.js';
import { artifact_alignment } from './wizcmds.js';
import { paranoid_query } from './cmd.js';
import { newuexp } from './exper.js';
import { clong } from './integer.js';
import { pluslvl, more_experienced, losexp } from './exper.js';
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import monsPack from './makemon_mons.json' with { type: 'json' };
import monMsoundPack from './makemon_msound.json' with { type: 'json' };
import { set_malign, levelDifficulty, grow_up, nonlivingMon, is_demon, monhp_per_lvl, monPmname } from './makemon.js';
import { monflee } from './monmove.js';
import { zombie_maker } from './mon.js';
import { pmname, Monnam, mon_nam } from './do_name.js';
import { which_armor } from './worn.js';
import { emits_light, permonstTemplate } from './makemon.js';
import { set_mon_data } from './mondata.js';
import { noteleport_level as noteleport_level_uh } from './teleport.js';
import { ureflects as ureflects_uh } from './muse.js';
import { PM_FLOATING_EYE as PM_FLOATING_EYE_UH, PM_JABBERWOCK as PM_JABBERWOCK_UH } from './pm.generated.js';
import { observe_object, discover_object } from './o_init.js';
import { ansimpleoname } from './objnam.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
/* C mon.c:2744's m_detach light-source teardown (light.c:98, hack.c:97). */
import { del_light_source, arti_light_description } from './light.js';
import { artifact_light } from './artifact.js';
import { monst_to_any } from './hack.js';
import { end_burn, begin_burn, fall_asleep } from './timeout.js';
import { can_reach_floor } from './engrave.js';
import { hold_another_object } from './invent.js';
import { extract_from_minvent, mselftouch_nc } from './mklev.js';
import { obj_extract_self } from './mkobj.js';
import { mpickobj } from './steal.js';
import { mhe } from './makemon.js';
import { findgold } from './steal.js';
import { gender } from './mondata.js';
import { mreadmsg } from './muse.js';
import { trycall } from './do.js';
import { bcsign } from './mkobj.js';
import { dog_nutrition, AD_PHYS, MONS_MSIZE } from './dogmove.js';
import { possibly_unwield } from './weapon.js';
import { instapetrify } from './cmd.js';
import { dismount_steed } from './steed.js';
import { DISMOUNT_GENERIC, DISMOUNT_POLY, M_ATTK_AGR_DONE, CXN_ARTICLE, LL_ARTIFACT, LL_KILLEDPET, MGIVENNAME, A_LAWFUL, NO_TRAP_FLAGS } from './const.js';
import { monstseesu, monstunseesu, touch_of_death } from './mcastu.js';
import { burn_away_slime as burn_away_slime_real } from './timeout.js';
import { LS_MONSTER, Is_rogue_level, TELEPAT as TELEPAT_PROP } from './const.js';
import monXpPack from './exper_monxp.json' with { type: 'json' };
import { kop_revival, resists_ston as resists_ston_real, slimeproof } from './mklev.js';
import { mkobj, mksobj, mksobj_at, place_object, mkcorpstat, add_to_container, dealloc_obj } from './mkobj.js';
import { makemon } from './makemon.js';
import { touch_artifact as touch_artifact_real } from './artifact.js';
import { make_corpse, can_touch_safely, set_ustuck, mongone, mondead, newcham, healmon, wake_nearto, zombie_form } from './mon.js';
/* ndemon: C uhitm.c:4133 demonpet()'s "ndemon(u.ualign.type)" — a random
 * class-S_DEMON monster of the given alignment (or NON_PM). */
import { ndemon } from './minion.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { MKOBJ_OC_SKILL, MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
/* objects.h object names, indexed by otyp — used by initWeaponDmg() below to
 * find FLINT and the four non-weapon damage rows BY NAME instead of by a pinned
 * integer literal. */
import { OC_NAME } from './oc_name_data.js';
import { OC_WEIGHT } from './oc_weight.generated.js';
import { getObjName } from './o_init.js';
/* xm_has_mgivenname rather than js/const.js's has_mgivenname: the latter walks
 * `mtmp.mextra`, and the replay's strict struct-monst proxy has no `mextra` key
 * (it exposes the has_mgivenname presence bit directly), so that walk throws. */
import { xm_has_mgivenname } from './mhitm.js';
import { mon_nam_too, x_monnam } from './do_name.js';
import { mon_hates_blessings, mon_hates_silver } from './mondata.js';
import { some_mon_nam, l_monnam, a_monnam } from './do_name.js';
import { sleep_monst, slept_monst } from './mhitm.js';
import { Resists_Elem, resists_blnd, can_blnd } from './mondata.js';
import { helpless } from './mhitm.js';
import { y_monnam } from './do_name.js';
import { locomotion } from './mondata.js';
import { place_monster } from './steed.js';
import { FIRE_TRAP } from './const.js';
/* C uhitm.c:331 check_caitiff / mon.c:4331 wakeup — both live in js/mhitm.js,
 * which this file already imports from (see above). */
import { wakeup_attack } from './mhitm.js';
import { wakeup, seemimic } from './mon.js';
import { ghod_hitsu } from './priest.js';
import { Adjmonnam as Adjmonnam_uh } from './do_name.js';
import { defended, resists_drli } from './mondata.js';
import './mhitm.js';
import { attacktype } from './mondata.js';
import { attacktype_fordmg as attacktype_fordmg_uh } from './mondata.js';
/* hcolor(colorpref) — do_name.c:1461-1466. Needed by artifact_hit's SPFX_DRLI
 * arm (Stormbringer's "The black blade draws the life..." message uses
 * hcolor(NH_BLACK)); real body already lives in js/mhitm.js. */
import { on_fire as on_fire_real } from './mondata.js';
import './mhitm.js';
/* a_monnam / x_monnam's ARTICLE_A form and the M_AP_* enum both come from
 * const.js, which is byte-identical to the C header values (monst.h:52-55). */
import { M_AP_F_DKNOWN, ARTICLE_A, EXACT_NAME, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPMASK,
         PROT_FROM_SHAPE_CHANGERS } from './const.js';
/* end_running: hack.c's run/travel terminator (hack.c:1360), imported the same
 * way js/cmd.js does. */
import { is_pool as is_pool_uh } from './look.js';
import { accessible } from './monmove.js';
import { end_running } from './hack.js';
/* do_attack's shop arm (C uhitm.c:481-495).  js/shk.js already imports m_at from
 * this file, so this is a late-bound ES-module cycle like the cmd.js one above;
 * all three are hoisted function declarations, so the cycle cannot leave them
 * in TDZ at call time. */
import { tended_shop, dopay, delete_contents, costly_spot } from './shk.js';
import { in_rooms } from './hack.js';
import { shkgone, obfree } from "./shk.js";
import { couldsee, cansee } from './vision.js';
import { dist2, s_suffix } from './hacklib.js';
import { drain_en, monkilled_trap, mintrap, t_at, acid_damage, fill_pit } from './trap.js';
import { m_carrying, m_useup, m_useupall } from './mthrowu.js';
import { mon_adjust_speed } from './worn.js';
import { ACID_RES } from './const.js';
import { hliquid } from './do_name.js';
import { clone_mon_ml } from './mklev.js';
import { sobj_at } from './invent.js';
import { is_pit, TT_PIT, CORPSTAT_BURIED, OBJ_BURIED, OBJ_INVENT } from './const.js';
import { worm_seg_at, remove_worm, wormgone, cutworm, worm_move } from './worm.js';
import { body_part, _drop_doname, is_pole } from './cmd.js';
import { mwelded } from './wield.js';
import { mhurtle, will_hurtle } from './dothrow.js';
import { flooreffects, set_wounded_legs } from './do.js';
/* C wield.c:543 yname(obj) -- "your <xname>" / "the <xname>"; the one body
 * lives in js/do_wear.js.  do_attack's gu.unweapon line needs it. */
import { is_shield, bimanual, is_flimsy, some_armor } from './do_wear.js';
import { xname } from './objnam.js';
import { yname } from './objnam.js';
import { dmgtype } from './dogmove.js';
import { engulf_target } from './mhitm.js';
import { monstone, mon_to_stone, vamp_stone } from './mon.js';
import { destroy_items as destroy_items_zap,
         destroy_items_mon as destroy_items_mon_zap, obj_resists } from './zap.js';
import { poly_when_stoned } from './mondata.js';
import { PM_BALROG, PM_COCKATRICE, PM_CHICKATRICE, PM_BARBED_DEVIL, PM_SHADE, PM_ROPE_GOLEM, PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_PURPLE_WORM, PM_SHRIEKER, PM_BLACK_PUDDING, PM_BROWN_PUDDING, PM_FLESH_GOLEM, PM_IRON_GOLEM, PM_ARCHON, PM_STONE_GOLEM, PM_WATER_ELEMENTAL, PM_VLAD_THE_IMPALER, PM_LIZARD, PM_ARCHEOLOGIST, PM_WIZARD, PM_DEATH, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_WOOD_GOLEM, PM_LEATHER_GOLEM } from './pm.generated.js';
import { hitmsg, hitmsg_je, u_slip_free, make_blinded, mpoisons_subj, magic_negation,
         could_seduce, mdamageu, mhis_mon } from './mhitu.js';
import { drain_item, resist, cancel_monst, probe_monster, hit as hit_projectile } from './zap.js';
import { shieldeff_mon } from './mon.js';
import { make_stunned, make_confused, potionhit } from './potion.js';
import { splitobj } from './makemon.js';
import { freeinv } from './invent.js';
import { Yname2 } from './objnam.js';
import { setuwep, set_twoweap, drop_uswapwep } from './wield.js';
import { thiefdead } from './steal.js';
import { uwepgone } from './wield.js';
import { rnl } from './rnd.js';
import { FUMBLING as FUMBLING_UH, P_LANCE } from './const.js';
import { check_capacity_sync as check_capacity_hit } from './cmd.js';
import { mstatusline } from './insight.js';
import { ysimple_name as ysimple_name_hit } from './cmd.js';
import { useup } from './invent.js';
import { release_camera_demon as release_camera_demon_hit } from './dothrow.js';
import { breaktest } from './dothrow.js';
import { upstart } from './hacklib.js';
import { angry_guards, setmangry } from './mon.js';
import { noit_Monnam, noit_mon_nam } from './do_name.js';
import { stagger } from './mondata.js';
import { deadhero, pending_death_is_final, done } from './end.js';
import { DIED, NO_KILLER_PREFIX } from './const.js';
import { drain_pending_death_in_place } from './fastforward.js';
/* C explode.c:1013 mon_explodes — corpse_chance()'s AT_BOOM arm calls it. */
import { losehp } from './hack.js';
import { _zhitm } from './zap.js';
import { mon_explodes, explode as explode_uh, adtyp_to_expltype as adtyp_to_expltype_uh } from './explode.js';
import { MON_EXPLODE } from './const.js';
/* C permonst.mattk[NATTK] (js/makemon_mattk.json — the same pack js/makemon.js
 * and js/mhitu.js read); corpse_chance scans it for the AT_BOOM attack. */
import monMattkPack from './makemon_mattk.json' with { type: 'json' };
const MONS_MATTK = /** @type {{aatyp:number,adtyp:number,damn:number,damd:number}[][]} */ (monMattkPack.mattk);
const NATTK_UH = 6;          /* C monattk.h:9 NATTK */
import { tele, rloc, RLOC_NOMSG, u_teleport_mon } from './teleport.js';
import { sticks, abuse_dog, tamedog, initedog } from './dog.js';
import { unstuck } from './mon.js';
import { m_unleash } from './apply.js';
import { christen_monst } from './mhitm.js';
import { extract_from_minvent_dm, stackobj_dm, mondied_dm } from './dogmove.js';
import { paralyze_monst, rustm } from './mhitm.js';
import { stackobj } from './invent.js';
import { nomul } from './hack.js';
import { MONS_CWT } from './mklev.js'; /* C mons[].cwt, uhitm.c:5078 */
import { mons_cnutrit } from './food_props.js'; /* C mons[].cnutrit, uhitm.c:5082 */
import { unconscious } from './trap.js';
import { impossible } from './steed.js';
import { impossible as skill_impossible } from './pline.js';
/* healup(nhp, nxtra, curesick, cureblind) — potion.c real body, RNG-free.
 * artifact_hit's SPFX_DRLI arm (Stormbringer) heals the hero for half the
 * drained HP. */
import { healup, make_sick, make_stoned, make_slimed } from './potion.js';
import { ENV } from './hostenv.js';
import { grddead } from './vault.js';

/* object class constants (global for zap.js drain_item) */
globalThis.WEAPON_CLASS = 2;
globalThis.ARMOR_CLASS = 3;
globalThis.RING_CLASS = 4;
globalThis.AMULET_CLASS = 5;
globalThis.TOOL_CLASS = 6;

/* Per-mndx experience() result for a NORMAL kill (mrevived=0, mcloned=0).
 * Generated from nethack-c/include/monsters.h via the full C experience()
 * formula (exper.c:84-166): pure function of mndx for the common case.
 * C ref: exper.c:84 experience(struct monst *mtmp, int nk). */
const MONS_XP = /** @type {number[]} */ (monXpPack.xp);
import { MAXULEV } from './const.js';
/* MONS row layout (the authoritative column map is js/makemon.js
 * permonstTemplate, which materialises `mon->data` from these rows):
 *   [0]mlet [1]mlevel [3]geno [4]maligntyp [5]mresists [6]mflags1
 *   [7]mflags2 [8]mflags3 [9]mmove
 * This comment used to read "[mlet, mlevel, mov, geno, ...]", i.e. it put
 * permonst.mmove in column [2].  It is column [9] — column [2] is something
 * else entirely (the water nymph, mmove 12, has row[2] == 5).  The wrong
 * spelling reads as plausible data, so it does not throw; it silently answers a
 * different question. */
import { _MONS } from './dogmove.js'; /* same makemon_mons.json .mons array */
/* G_FREQ = 0x0007 creation frequency mask (monflag.h); same value in mon.js. */
import { G_FREQ } from './mon.js';
/* MZ_LARGE = 3 (monflag.h); bigmonst(ptr) = (msize >= MZ_LARGE) */
const MZ_LARGE = 3;
/* Starting weapon otyp constants (from nethack-c/include/objects.h counts).
 * C ref: u_init.c Valkyrie[]/Wizard[] trobj tables. */
const OTYP_SPEAR = 27;         /* SPEAR — Valkyrie uwep (spe=1) */
const OTYP_DAGGER = 34;        /* DAGGER — Valkyrie uswapwep (spe=0) */
const OTYP_QUARTERSTAFF = 79;  /* QUARTERSTAFF — Wizard uwep (spe=1) */
const WEAPON_CLASS = 2;        /* weapon objects */
export const ARMOR_CLASS = 3;         /* armor objects */
const TOOL_CLASS = 6;          /* tool objects */
const POTION_CLASS = 8;         /* potion objects (objclass.h) */
export const GEM_CLASS = 13;          /* gem/stone/orb objects */
import { MZ_HUMAN } from './mon.js'; /* monflag.h MZ_HUMAN (== MZ_MEDIUM) */
const M2_UNDEAD = 0x00000002;  /* monflag.h M2_UNDEAD — mondata.h is_undead(ptr) */
/* Per-mndx AC lookup (permonst.ac). Generated from nethack-c/include/monsters.h
 * via LVL(lvl, mov, AC, ...) extraction, matched to js/pm.generated.js indices.
 * Default 10 for unmatched entries (easy to hit — safe fallback).
 * C ref: worn.c:709 find_mac(mon) = mon->data->ac (for unarmored monsters). */
const MONS_AC = [3,-1,3,3,4,-4,8,8,8,8,6,6,7,7,7,7,6,5,5,4,4,4,4,4,4,4,2,10,9,4,4,4,6,5,6,6,6,4,6,-10,2,-4,-2,10,10,5,10,10,5,0,7,6,2,7,2,5,8,8,8,10,10,10,6,8,7,7,7,9,9,9,10,10,10,10,10,10,5,10,3,0,0,7,0,4,2,6,5,5,7,7,6,6,0,0,3,3,4,3,3,3,6,2,2,2,5,4,0,2,2,2,2,2,5,5,5,6,9,-4,0,0,3,5,0,-4,-5,-6,8,7,6,6,4,3,2,2,2,2,2,2,2,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3,2,2,2,2,9,9,9,9,9,7,7,10,10,4,10,0,0,6,4,3,3,3,-3,6,-2,10,10,10,10,0,-2,-4,-6,6,6,5,5,4,4,4,3,6,6,6,6,4,2,2,0,5,3,4,8,8,6,6,3,3,2,-10,8,3,3,5,2,2,4,2,0,4,-4,2,1,0,-6,5,4,0,-2,6,6,5,6,6,6,10,10,9,9,9,8,6,10,6,4,10,10,8,6,6,4,9,7,5,1,3,10,10,10,10,10,10,10,10,10,10,5,0,10,10,0,10,7,10,10,0,10,10,10,10,2,-8,0,-5,10,-4,0,-5,2,0,-6,0,-2,-1,-4,-1,-3,4,-2,-7,-5,-6,-3,-2,-5,-7,-8,-5,-5,-5,10,4,6,4,2,-1,-3,6,8,8,7,7,6,6,5,-1,0,10,10,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,7,0,0,0,10,0,0,-2,0,0,0,-1,-10,-2,10,0,0,2,0,10,10,10,10,10,10,10,10,10,10,10,10,10,10];

/* Monster species names, indexed by PM_xxx constant value.
 * Generated from js/pm.generated.js: PM_FOO = N → MONS_NAMES[N] = "foo".
 * C ref: monsters.h NAM() macro — same order as C mons[] array.
 * Used by mon_nam() / Monnam() helpers below for hit/miss/kill messages. */
export const MONS_NAMES = ["giant ant","killer bee","soldier ant","fire ant","giant beetle","queen bee","acid blob","quivering blob","gelatinous cube","chickatrice","cockatrice","pyrolisk","jackal","fox","coyote","werejackal","little dog","dingo","dog","large dog","wolf","werewolf","winter wolf cub","warg","winter wolf","hell hound pup","hell hound","gas spore","floating eye","freezing sphere","flaming sphere","shocking sphere","kitten","housecat","jaguar","lynx","panther","large cat","tiger","displacer beast","gremlin","gargoyle","winged gargoyle","hobbit","dwarf","bugbear","dwarf lord","dwarf king","mind flayer","master mind flayer","manes","homunculus","imp","lemure","quasit","tengu","blue jelly","spotted jelly","ochre jelly","kobold","large kobold","kobold lord","kobold shaman","leprechaun","small mimic","large mimic","giant mimic","wood nymph","water nymph","mountain nymph","goblin","hobgoblin","orc","hill orc","mordor orc","uruk hai","orc shaman","orc captain","rock piercer","iron piercer","glass piercer","rothe","mumak","leocrotta","wumpus","titanothere","baluchitherium","mastodon","sewer rat","giant rat","rabid rat","wererat","rock mole","woodchuck","cave spider","centipede","giant spider","scorpion","lurker above","trapper","pony","white unicorn","gray unicorn","black unicorn","horse","warhorse","fog cloud","dust vortex","ice vortex","energy vortex","steam vortex","fire vortex","baby long worm","baby purple worm","long worm","purple worm","grid bug","xan","yellow light","black light","zruty","couatl","aleax","angel","ki rin","archon","bat","giant bat","raven","vampire bat","plains centaur","forest centaur","mountain centaur","baby gray dragon","baby gold dragon","baby silver dragon","baby red dragon","baby white dragon","baby orange dragon","baby black dragon","baby blue dragon","baby green dragon","baby yellow dragon","gray dragon","gold dragon","silver dragon","red dragon","white dragon","orange dragon","black dragon","blue dragon","green dragon","yellow dragon","stalker","air elemental","fire elemental","earth elemental","water elemental","lichen","brown mold","yellow mold","green mold","red mold","shrieker","violet fungus","gnome","gnome lord","gnomish wizard","gnome king","giant","stone giant","hill giant","fire giant","frost giant","ettin","storm giant","titan","minotaur","jabberwock","keystone kop","kop sergeant","kop lieutenant","kop kaptain","lich","demilich","master lich","arch lich","kobold mummy","gnome mummy","orc mummy","dwarf mummy","elf mummy","human mummy","ettin mummy","giant mummy","red naga hatchling","black naga hatchling","golden naga hatchling","guardian naga hatchling","red naga","black naga","golden naga","guardian naga","ogre","ogre lord","ogre king","gray ooze","brown pudding","green slime","black pudding","quantum mechanic","genetic engineer","rust monster","disenchanter","garter snake","snake","water moccasin","python","pit viper","cobra","troll","ice troll","rock troll","water troll","olog hai","umber hulk","vampire","vampire lord","vlad the impaler","barrow wight","wraith","nazgul","xorn","monkey","ape","owlbear","yeti","carnivorous ape","sasquatch","kobold zombie","gnome zombie","orc zombie","dwarf zombie","elf zombie","human zombie","ettin zombie","ghoul","giant zombie","skeleton","straw golem","paper golem","rope golem","gold golem","leather golem","wood golem","flesh golem","clay golem","stone golem","glass golem","iron golem","human","","","","elf","woodland elf","green elf","grey elf","elf lord","elvenking","doppelganger","shopkeeper","guard","prisoner","oracle","priest","high priest","soldier","sergeant","nurse","lieutenant","captain","watchman","watch captain","medusa","wizard of yendor","croesus","ghost","shade","water demon","incubus","horned devil","erinys","barbed devil","marilith","vrock","hezrou","bone devil","ice devil","nalfeshnee","pit fiend","sandestin","balrog","juiblex","yeenoghu","orcus","geryon","dispater","baalzebub","asmodeus","demogorgon","death","pestilence","famine","mail daemon","djinni","jellyfish","piranha","shark","giant eel","electric eel","kraken","newt","gecko","iguana","baby crocodile","lizard","chameleon","crocodile","salamander","long worm tail","archeologist","barbarian","caveman","healer","knight","monk","","ranger","rogue","samurai","tourist","valkyrie","wizard","lord carnarvon","pelias","shaman karnov","hippocrates","king arthur","grand master","arch priest","orion","master of thieves","lord sato","twoflower","norn","neferet the green","minion of huhetotl","thoth amon","chromatic dragon","cyclops","ixoth","master kaen","nalzok","scorpius","master assassin","ashikaga takauji","lord surtur","dark one","student","chieftain","neanderthal","attendant","page","abbot","acolyte","hunter","thug","ninja","roshi","guide","warrior","apprentice"];
/* mon_nam / Monnam — C ref: do_name.c:1041, 1073; the one body lives in js/do_name.js. */
export { mon_nam, Monnam };
/* Per-otyp weapon damage dice for small (wsdam) and large (wldam) targets.
 * Generated from nethack-c/include/objects.h WEAPON()/PROJECTILE() macros.
 * Weapons start at otyp 18 (ARROW). Index = otyp. 0 = no damage die.
 * C ref: weapon.c:216 dmgval() — uses objects[otyp].oc_wsdam / .oc_wldam. */
const OTYP_LIMIT = 481;              /* objects.h: last object is ACID_VENOM=480 */
const WEAPON_WSDAM = new Uint8Array(OTYP_LIMIT);
const WEAPON_WLDAM = new Uint8Array(OTYP_LIMIT);
/* Exported for lock.js doforce: gx.xlock.chance = objects[uwep->otyp].oc_wldam * 2
 * (lock.c:745).  Same objects.h-derived oc_wldam data; export avoids duplication. */
export { WEAPON_WLDAM };
(function initWeaponDmg() {
    /* Objects.h order (otyp=18 onward): arrows first, then melee weapons.
     * Format: [otyp, wsdam, wldam] pairs.
     * Only weapons with non-zero damage are listed. */
    const DATA = [
        /* projectiles — objects.h:141-157 PROJECTILE() macro: sdam=wsdam, ldam=wldam.
         * ARROW:       cost=2, sdam=6, ldam=6  (was 2,6 — cost mistaken for sdam)
         * ELVEN_ARROW: cost=2, sdam=7, ldam=6  (was 2,7 — same error)
         * ORCISH_ARROW:cost=2, sdam=5, ldam=6  (was 2,5 — same error)
         * SILVER_ARROW:cost=5, sdam=6, ldam=6  (was 5,6 — cost mistaken for sdam)
         * YA:          cost=4, sdam=7, ldam=7  (was 4,7 — cost mistaken for sdam)
         * XBOLT:       cost=2, sdam=4, ldam=6  (was 2,4 — cost mistaken for sdam) */
        18,6,6,  19,7,6,  20,5,6,  21,6,6,  22,7,7,  23,4,6, /* ARROW-XBOLT */
        24,3,2,  25,8,6,  26,9,9,  /* DART SHURIKEN BOOMERANG */
        /* spears — objects.h:174-196 */
        27,6,8,  28,7,8,  29,5,8,  30,8,8,  31,6,8,  32,6,6,  /* SPEAR-JAVELIN */
        33,6,4,  /* TRIDENT */
        /* blades — objects.h:200-233 */
        34,4,3,  35,5,3,  36,3,3,  37,4,3,  38,4,3,  /* DAGGER-ATHAME */
        39,3,3,  40,3,2,  41,3,2,  /* SCALPEL KNIFE STILETTO */
        42,2,2,  43,10,10, /* WORM_TOOTH CRYSKNIFE */
        /* axes — objects.h:236-241 */
        44,6,4,  45,8,6,  /* AXE BATTLE_AXE */
        /* swords — objects.h:244-290 */
        46,6,8,  47,8,8,  48,5,8,  49,7,8,  /* SHORT_SWORD variants */
        50,8,8,  51,8,8,  /* SCIMITAR SILVER_SABER */
        52,4,6,  53,6,6,  /* BROADSWORD ELVEN_BROADSWORD (+d4 extra not modeled) */
        54,8,12, 55,12,6, 56,10,12, 57,16,8, 58,4,6,  /* LONG-RUNESWORD */
        /* polearms — objects.h:294-350 */
        59,6,6,  60,4,4,  61,6,6,  62,6,10, 63,10,6, 64,4,4,  65,4,4,
        66,6,8,  67,4,8,  68,4,10, 69,4,6,  70,8,6,  /* PARTISAN-BEC_DE_CORBIN */
        71,12,8, 72,6,8,  /* DWARVISH_MATTOCK LANCE */
        /* bludgeons — objects.h:355-392 */
        73,6,6,  74,6,6,  75,4,6,  76,4,4,  77,6,3,  78,4,3,  79,6,6, /* MACE-QSTAFF */
        80,6,3,  81,6,4,  /* AKLYS FLAIL */
        82,2,1,  /* BULLWHIP */
        /* bows — objects.h:395-406 BOW() macro hardcodes sdam=2, ldam=2.
         * Listed so dmgval fires rnd(2) not the rnd(2) fallback (same value, but
         * the table path is C-faithful: objects[otyp].oc_wsdam == 2 triggers
         * rnd(objects[otyp].oc_wsdam) rather than the else-branch skip). */
        83,2,2,  84,2,2,  85,2,2,  86,2,2,  87,2,2,  88,2,2, /* BOW-CROSSBOW */
    ];
    for (let i = 0; i + 2 < DATA.length; i += 3) {
        const otyp = DATA[i];
        if (otyp < WEAPON_WSDAM.length) {
            WEAPON_WSDAM[otyp] = DATA[i + 1];
            WEAPON_WLDAM[otyp] = DATA[i + 2];
        }
    }

    const P_SLING_NEG = -21; /* C skills.h:44 P_SLING = 21 */
    for (let otyp = 0; otyp < OTYP_LIMIT; otyp++) {
        if ((MKOBJ_OC_SKILL[otyp] | 0) !== P_SLING_NEG) continue;
        const dmg = (OC_NAME[otyp] === 'flint') ? 6 : 3; /* objects.h:1604 ROCK("flint", ... 6, 6, ...) */
        WEAPON_WSDAM[otyp] = dmg;
        WEAPON_WLDAM[otyp] = dmg;
    }
    /* objects.h:1617-1631 — the four remaining non-weapon rows with damage.
     * Named through OC_NAME so a shifted objects.h cannot silently re-point them
     * at a neighbour, which is the inline-numeric-literal defect class. */
    const NON_WEAPON_DMG = [
        ['boulder', 20, 20],          /* objects.h:1617 ROCK_CLASS  */
        ['statue', 20, 20],           /* objects.h:1620 ROCK_CLASS  */
        ['heavy iron ball', 25, 25],  /* objects.h:1624 BALL_CLASS  */
        ['iron chain', 4, 4],         /* objects.h:1629 CHAIN_CLASS, "+1 both l & s" */
    ];
    for (const [name, sdam, ldam] of NON_WEAPON_DMG) {
        const otyp = OC_NAME.indexOf(name);
        if (otyp > 0 && otyp < OTYP_LIMIT) { WEAPON_WSDAM[otyp] = sdam; WEAPON_WLDAM[otyp] = ldam; }
    }
    const WEPTOOL_DMG = [
        ['pick-axe', 6, 3],            /* objects.h:1007 WEPTOOL, P_PICK_AXE */
        ['grappling hook', 2, 6],      /* objects.h:1010 WEPTOOL, P_FLAIL    */
        ['unicorn horn', 12, 12],      /* objects.h:1013 WEPTOOL, P_UNICORN_HORN */
        ['splash of acid venom', 6, 6],/* objects.h:1645 VENOM_CLASS, "+d6 small or large" */
    ];
    for (const [name, sdam, ldam] of WEPTOOL_DMG) {
        const otyp = OC_NAME.indexOf(name);
        if (otyp > 0 && otyp < OTYP_LIMIT) { WEAPON_WSDAM[otyp] = sdam; WEAPON_WLDAM[otyp] = ldam; }
    }
})();
/* ── artifact to-hit: spec_abon (artifact.c:1075-1088) ────────────────────── */
const ARTI_SPEC = [
    /*  0 dummy                */ { spfx: 0x00000000, adtyp:  0, damn: 0, damd:  0, mtype:    0, align: -128 },
    /*  1 Excalibur            */ { spfx: 0x00000297, adtyp:  0, damn: 5, damd: 10, mtype:    0, align:    1 },
    /*  2 Stormbringer         */ { spfx: 0x000001c6, adtyp: 15, damn: 5, damd:  2, mtype:    0, align:   -1 },
    /*  3 Mjollnir             */ { spfx: 0x00000042, adtyp:  6, damn: 5, damd: 24, mtype:    0, align:    0 },
    /*  4 Cleaver              */ { spfx: 0x00000002, adtyp:  0, damn: 3, damd:  6, mtype:    0, align:    0 },
    /*  5 Grimtooth            */ { spfx: 0x00800022, adtyp:  0, damn: 2, damd:  6, mtype:   16, align:   -1 },
    /*  6 Orcrist              */ { spfx: 0x00800020, adtyp:  0, damn: 5, damd:  0, mtype:  128, align:   -1 },
    /*  7 Sting                */ { spfx: 0x00800020, adtyp:  0, damn: 5, damd:  0, mtype:  128, align:   -1 },
    /*  8 Magicbane            */ { spfx: 0x000000c2, adtyp: 12, damn: 3, damd:  4, mtype:    0, align:    0 },
    /*  9 Frost Brand          */ { spfx: 0x000000c2, adtyp:  3, damn: 5, damd:  0, mtype:    0, align: -128 },
    /* 10 Fire Brand           */ { spfx: 0x000000c2, adtyp:  2, damn: 5, damd:  0, mtype:    0, align: -128 },
    /* 11 Dragonbane           */ { spfx: 0x04200002, adtyp:  0, damn: 5, damd:  0, mtype:   30, align: -128 },
    /* 12 Demonbane            */ { spfx: 0x00800002, adtyp:  0, damn: 5, damd:  0, mtype:  256, align:    1 },
    /* 13 Werebane             */ { spfx: 0x00800002, adtyp:  0, damn: 5, damd:  0, mtype:    4, align: -128 },
    /* 14 Grayswandir          */ { spfx: 0x00000802, adtyp:  0, damn: 5, damd:  0, mtype:    0, align:    1 },
    /* 15 Giantslayer          */ { spfx: 0x00800002, adtyp:  0, damn: 5, damd:  0, mtype: 8192, align:    0 },
    /* 16 Ogresmasher          */ { spfx: 0x00200002, adtyp:  0, damn: 5, damd:  0, mtype:   41, align: -128 },
    /* 17 Trollsbane           */ { spfx: 0x00204002, adtyp:  0, damn: 5, damd:  0, mtype:   46, align: -128 },
    /* 18 Vorpal Blade         */ { spfx: 0x00000402, adtyp:  0, damn: 5, damd:  1, mtype:    0, align:    0 },
    /* 19 Snickersnee          */ { spfx: 0x00000002, adtyp:  0, damn: 0, damd:  8, mtype:    0, align:    1 },
    /* 20 Sunsword             */ { spfx: 0x00800002, adtyp:  0, damn: 5, damd:  0, mtype:    2, align:    1 },
    /* 21 Orb of Detection     */ { spfx: 0x00000007, adtyp:  0, damn: 0, damd:  0, mtype:    0, align:    1 },
    /* 22 Heart of Ahriman     */ { spfx: 0x00000007, adtyp:  0, damn: 5, damd:  0, mtype:    0, align:    0 },
    /* 23 Sceptre of Might     */ { spfx: 0x01000007, adtyp:  0, damn: 5, damd:  0, mtype:    0, align:    1 },
    /* 24 Staff of Aesculapius */ { spfx: 0x00004147, adtyp: 15, damn: 0, damd:  0, mtype:    0, align:    0 },
    /* 25 Magic Mirror         */ { spfx: 0x0000000f, adtyp:  0, damn: 0, damd:  0, mtype:    0, align:    1 },
    /* 26 Eyes of the Overwrld */ { spfx: 0x02000007, adtyp:  0, damn: 0, damd:  0, mtype:    0, align:    0 },
    /* 27 Mitre of Holiness    */ { spfx: 0x08800007, adtyp:  0, damn: 0, damd:  0, mtype:    2, align:    1 },
    /* 28 Longbow of Diana     */ { spfx: 0x04000007, adtyp:  0, damn: 5, damd:  0, mtype:    0, align:   -1 },
    /* 29 Master Key           */ { spfx: 0x0000000f, adtyp:  0, damn: 0, damd:  0, mtype:    0, align:   -1 },
    /* 30 Tsurugi of Muramasa  */ { spfx: 0x08080407, adtyp:  0, damn: 0, damd:  8, mtype:    0, align:    1 },
    /* 31 Platinum Yendorian   */ { spfx: 0x00000087, adtyp:  0, damn: 0, damd:  0, mtype:    0, align:    0 },
    /* 32 Orb of Fate          */ { spfx: 0x00080007, adtyp:  0, damn: 0, damd:  0, mtype:    0, align:    0 },
    /* 33 Eye of the Aethiopica*/ { spfx: 0x00000007, adtyp:  0, damn: 0, damd:  0, mtype:    0, align:    0 },
];
/* C monflag.h M2_WERE (compiled: 0x4). */
const M2_WERE_UH = 0x00000004;


/* C ref: you.h — Antimagic is the hero's ANTIMAGIC property. */
function Antimagic_uh() {
    const pr = game.u?.uprops?.[ANTIMAGIC_UH];
    return !!(pr && (pr.intrinsic || pr.extrinsic));
}
/* C prop.h:30 */
const ANTIMAGIC_UH = 12;




import { spec_ability } from './artifact.js';


/* objects.h otyps / monsym.h mlets / monflag.h M1_ bits used by hitval above.
 * Every number here came out of the same compiled probe as ARTI_SPEC, not from
 * reading the headers: PICK_AXE is 259 and DWARVISH_MATTOCK is 71 (they are far
 * apart in objects.h), M1_SWIM is 0x2 and M1_WALLWALK 0x8, and S_SNAKE is 45.
 * S_EEL_UH (57) is already declared further down this file. */
/* C mondata.h:150-152 is_longworm(ptr) and mondata.h passes_walls(ptr).  The
 * pmidx values are the same three js/mhitm.js:1431-1433 already uses. */
const PM_BABY_LONG_WORM_UH = 112, PM_LONG_WORM_UH = 114, PM_LONG_WORM_TAIL_UH = 330;
function _is_longworm_uh(ptr) {
    if (!ptr) return false;
    const pmidx = ptr.pmidx | 0;
    return pmidx === PM_BABY_LONG_WORM_UH || pmidx === PM_LONG_WORM_UH
        || pmidx === PM_LONG_WORM_TAIL_UH;
}
function _passes_walls_uh(ptr) {
    return !!ptr && ((ptr.mflags1 | 0) & M1_WALLWALK_UH) !== 0;
}
const M1_WALLWALK_UH = 0x00000008;
/* monflag.h:105 M1_UNSOLID "has no solid or liquid body" — one of the two
 * predicates mhitm.c:597 failed_grab() reads (AD_STCK/AD_WRAP are declared
 * further down this file, AD_STCK at line ~5892 and AD_WRAP_UH at ~3375). */
const M1_UNSOLID_UH = 0x00100000;
/* monflag.h:102 M1_HUMANOID — mondata.h:65's humanoid(ptr), read by the
 * weaponless-attack shade check (uhitm.c:5640-5642). */
const M1_HUMANOID_UH = 0x00020000;
const S_SNAKE_UH = 45;


/* C ref: u_init.c ini_inv_use_obj — lazy-init weapon slots for roles that
 * wield a weapon at game start.  Mirrors the assignment order of ini_inv_use_obj:
 * first non-ammo/missile WEAPON_CLASS → uwep, second → uswapwep.
 * For Ranger: ammo (ARROW) goes to uquiver first; DAGGER→uwep, BOW→uswapwep.
 *
 * Called at the start of do_attack so that dmgval uses the correct weapon die
 * even before the first dofire/doinv interaction triggers cmd.js weapon init.
 *
 * C ref: u_init.c:1281-1292 (WEAPON_CLASS branch of ini_inv_use_obj).
 * C ref: u_init.c:1176-1198 ini_inv_obj_substitution() — race-based weapon substitution.
 *
 * Covered roles:
 *   Ranger   (8):  dagger→uwep, bow→uswapwep, arrow→uquiver (with race substitution)
 *   Valkyrie (11): spear(spe=1)→uwep, dagger(spe=0)→uswapwep
 *   Wizard   (12): quarterstaff(spe=1)→uwep */
/* Ranger otyp constants with race variants (objects.h) */
const OTYP_ARROW        = 18;  /* ARROW */
const OTYP_BOW          = 83;  /* BOW */
const OTYP_ELVEN_DAGGER = 35;  /* ELVEN_DAGGER — wsdam=5 */
const OTYP_ORCISH_DAGGER = 36; /* ORCISH_DAGGER — wsdam=3 */
const OTYP_ELVEN_BOW    = 84;  /* ELVEN_BOW */
const OTYP_ORCISH_BOW   = 85;  /* ORCISH_BOW */
const OTYP_ELVEN_ARROW  = 19;  /* ELVEN_ARROW — wsdam=7 */
const OTYP_ORCISH_ARROW = 20;  /* ORCISH_ARROW — wsdam=5 */
function _ensure_role_weapons_uhitm(u) {
    if (!u || u._weaponsInitUhitm)
        return;
    u._weaponsInitUhitm = true;
    if ((game.moves | 0) > 20)
        return;
    if (game.invent)
        return;
    /* nhlua.c:1775-1783 nhl_gamestate(): the tutorial stash detaches the whole
     * inventory (setnotworn -> uwep = NULL); the empty chain is a FACT, not
     * chargen laziness.  Fabricating the quarterstaff here made a polymorphed
     * tutorial Wizard swing a weapon (dmgval) where C's hmonas took damageum. */
    if (game.gg && game.gg.gmst_stored)
        return;
    if (u.uwep && (game.flags?.initrole ?? -1) !== 8)
        return; /* already wielding something (Ranger still needs uswapwep/uquiver check) */
    const initrole = (game.flags?.initrole ?? -1) | 0;
    const PM_RANGER   = 8;
    const PM_VALKYRIE = 11;
    const PM_WIZARD   = 12;
    if (initrole === PM_RANGER) {
        if (u.uwep && u.uswapwep && u.uquiver)
            return; /* fully initialized by cmd.js already */
        /* C ref: TROBJ_RANGER — DAGGER(spe=1)→uwep, BOW(spe=1)→uswapwep, ARROW(spe=2)→uquiver.
         * C ref: u_init.c:1176-1198 inv_subs[] race substitution:
         *   PM_ELF: DAGGER→ELVEN_DAGGER (35,wsdam=5), BOW→ELVEN_BOW (84), ARROW→ELVEN_ARROW (19,wsdam=7)
         *   PM_ORC: DAGGER→ORCISH_DAGGER (36,wsdam=3), BOW→ORCISH_BOW (85), ARROW→ORCISH_ARROW (20,wsdam=5)
         * (u_init.c:226-243; gu.urace.mnum corresponds to flags.initrace). */
        const PM_ELF_RACE  = 1;
        const PM_ORC_RACE  = 4;
        const initrace = (game.flags?.initrace ?? 0) | 0;
        let dagTyp   = OTYP_DAGGER;
        let bowTyp   = OTYP_BOW;
        let arrowTyp = OTYP_ARROW;
        if (initrace === PM_ELF_RACE) {
            dagTyp   = OTYP_ELVEN_DAGGER;
            bowTyp   = OTYP_ELVEN_BOW;
            arrowTyp = OTYP_ELVEN_ARROW;
        } else if (initrace === PM_ORC_RACE) {
            dagTyp   = OTYP_ORCISH_DAGGER;
            bowTyp   = OTYP_ORCISH_BOW;
            arrowTyp = OTYP_ORCISH_ARROW;
        }
        /* C u_init.c:125-127 TROBJ_RANGER rows are WEAPON_CLASS with
         * trquan_min == trquan_max == 1 for the dagger and the bow, and ini_inv
         * builds them through mksobj, which stamps oclass and quan.  These
         * slots stamped neither; an unstamped oclass makes is_ammo()/
         * is_launcher() (both open on `oclass !== WEAPON_CLASS`) answer FALSE
         * for the hero's own starting kit.  The arrow's quan is 50 + rn2(10)
         * and is not knowable here without that draw, so it stays unstamped
         * rather than invented. */
        if (!u.uwep)
            u.uwep     = { otyp: dagTyp,   spe: 1, invlet: 97 /* 'a' */,
                           oclass: OCLASS_WEAPON_SH, quan: 1 };
        if (!u.uswapwep)
            u.uswapwep = { otyp: bowTyp,   spe: 1, invlet: 98 /* 'b' */,
                           oclass: OCLASS_WEAPON_SH, quan: 1 };
        if (!u.uquiver)
            u.uquiver  = { otyp: arrowTyp, spe: 2, invlet: 99 /* 'c' */,
                           oclass: OCLASS_WEAPON_SH };
    } else if (u.uwep) {
        return; /* non-Ranger with uwep already set */
    } else if (initrole === PM_VALKYRIE) {
        /* C u_init.c:160-162: SPEAR(spe=1)→uwep, DAGGER(spe=0)→uswapwep */
        u.uwep     = { otyp: OTYP_SPEAR,   spe: 1, invlet: 97 /* 'a' */,
                       oclass: OCLASS_WEAPON_SH, quan: 1 };
        u.uswapwep = { otyp: OTYP_DAGGER,  spe: 0, invlet: 98 /* 'b' */,
                       oclass: OCLASS_WEAPON_SH, quan: 1 };
    } else if (initrole === PM_WIZARD) {
        /* C u_init.c:167-168: QUARTERSTAFF(spe=1)→uwep, quan 1..1 */
        u.uwep = { otyp: OTYP_QUARTERSTAFF, spe: 1, invlet: 97 /* 'a' */,
                   oclass: OCLASS_WEAPON_SH, quan: 1 };
    }
    /* All other roles: weapon slots left as-is. */
}
/* C ref: uhitm.c:449 do_attack — handle hero moving into a monster cell.
 *
 * W22.4 CALLING-CONVENTION COMPAT: cmd.js W21.3 wire (commit b677362)
 * passes (newx, newy) instead of the monster object. Accept both:
 *   do_attack(mtmp)    — canonical form (monster object, future callers)
 *   do_attack(x, y)    — compat form (cmd.js W21.3 wire; will be cleaned
 *                         up in a separate cmd.js patch)
 * When coords are received, look up the monster at that position.
 *
 * Mirror: nethack-c/src/uhitm.c::do_attack, lines 449-584. */
/* C monst.h STRAT_* — the "waiting for the hero" strategy bits attack_checks
 * clears on contact.  Same values js/dochug.js:117-120 carries. */
const _AC_STRAT_WAITFORU = 0x20000000, _AC_STRAT_CLOSE = 0x10000000;
const _AC_STRAT_WAITMASK = (_AC_STRAT_CLOSE | _AC_STRAT_WAITFORU);
/* C decl.c `something[] = "something"` — the noun attack_checks uses for a
 * monster the hero cannot identify. */
const _AC_SOMETHING = 'something';
const _AC_M1_CONCEAL = 0x00000080;
function _ac_hides_under(ptr) { return !!(((ptr && ptr.mflags1) | 0) & _AC_M1_CONCEAL); }

/* Read the actual displayed glyph, as C attack_checks does. */
function _ac_glyph_is_warning_at(x, y, _mon) {
    return glyph_is_warning_at(x, y);
}
/* C mondata.h:123 cantwield(ptr) = nohands(ptr) || verysmall(ptr). */
const _UH_M1_NOHANDS = 0x00002000;   /* monflag.h:98 */
const _UH_MZ_SMALL = 1;              /* monflag.h:178 */
function _uh_cantwield(ptr) {
    return !!(((ptr?.mflags1) | 0) & _UH_M1_NOHANDS) || ((ptr?.msize | 0) < _UH_MZ_SMALL);
}
function _uh_is_launcher(otmp) {
    const sk = MKOBJ_OC_SKILL[(otmp?.otyp | 0)] | 0;
    return (otmp?.oclass | 0) === WEAPON_CLASS && sk >= P_BOW && sk <= P_CROSSBOW;
}
function _uh_is_ammo(otmp) {
    const o = otmp?.oclass | 0;
    const sk = MKOBJ_OC_SKILL[(otmp?.otyp | 0)] | 0;
    return (o === WEAPON_CLASS || o === GEM_CLASS) && sk >= -P_CROSSBOW && sk <= -P_BOW;
}
function _uh_is_missile(otmp) {
    const o = otmp?.oclass | 0;
    const sk = MKOBJ_OC_SKILL[(otmp?.otyp | 0)] | 0;
    /* obj.h:245 — [-P_BOOMERANG(-25)..-P_DART(-23)] */
    return (o === WEAPON_CLASS || o === TOOL_CLASS) && sk >= -25 && sk <= -23;
}
/* C uhitm.c:1077-1078 — `!hmd->thrown && !u.usteed && is_pole(obj) &&
 * !is_art(obj, ART_SNICKERSNEE)`.  do_attack's melee call always has
 * hmd->thrown == HMON_MELEE (0), so `!hmd->thrown` is always true here. */
function _uh_is_pole_ranged(otmp) {
    return !(game.u && game.u.usteed) && is_pole(otmp) && !is_art(otmp, 19 /* ART_SNICKERSNEE, artilist.h */);
}
async function _uh_hmon_hitmon_weapon_ranged(obj, mon) {
    const isShade = (mon?.data?.pmidx | 0) === PM_SHADE;
    let dmg = (isShade && !shade_glare(obj)) ? 0 : rnd(2);
    let hittxt = false;
    const material = MKOBJ_OC_MATERIAL[(obj?.otyp | 0)] | 0;
    if (material === 14 /* objclass.h SILVER */ && mon_hates_silver(mon))
        dmg += rnd(dmg ? 20 : 10);
    if (obj === game.u.uwep && (obj.otyp | 0) === 26 /* BOOMERANG */
        && rnl(4) === 4 - 1) {
        const more_than_1 = (obj.quan | 0) > 1;
        await pline(`As you hit ${mon_nam(mon)}, ${more_than_1 ? 'one of ' : ''}${yname(obj)} breaks into splinters.`);
        if (!more_than_1)
            await uwepgone(); /* set gu.unweapon */
        await useup(obj);
        hittxt = true;
        if (!isShade)
            dmg++;
    }
    return { dmg, hittxt };
}
/* C pm.h — PM_AMOROUS_DEMON has no pm.generated.js export (js/mhitu.js:5409
 * and js/mhitm.js:4318 both carry this same 290 under a private name). */
const PM_AMOROUS_DEMON_UH = 290;
const NON_PM_UH = -1;
async function _uh_demonpet() {
    await pline('Some hell-p has arrived!');
    const i = !rn2(6) ? ndemon((game.u?.ualign?.type | 0)) : NON_PM_UH;
    const pm = (i !== NON_PM_UH) ? permonstTemplate(i) : game.youmonst?.data;
    const dtmp = await makemon(pm, game.u?.ux | 0, game.u?.uy | 0, 0 /* NO_MM_FLAGS */);
    if (dtmp)
        await tamedog(dtmp, null, false);
    exercise(A_WIS, true);
}
/* C you.h Role_if(PM_MONK).  g.flags.initrole is the roles[] index; Monk = 5,
 * the same index js/dokick.js martial() uses. */
function _uh_role_is_monk() {
    return ((game.flags?.initrole ?? -1) | 0) === 5;
}
const _UH_ROLE_MONK = 5, _UH_ROLE_SAMURAI = 9;
function _uh_martial_bonus() {
    const ir = (game.flags?.initrole ?? -1) | 0;
    return ir === _UH_ROLE_SAMURAI || ir === _UH_ROLE_MONK;
}
/* C body.h HAND — the index into mbodypart()'s parts tables (js/cmd.js:34832). */
const HAND_UH = 6;

export async function attack_checks(mtmp, wep) {
    void wep;
    const u = game.u || {};

    /* C uhitm.c:195 — "if you're close enough to attack, alert any waiting
     * monster". */
    mtmp.mstrategy = (mtmp.mstrategy | 0) & ~_AC_STRAT_WAITMASK;

    /* C uhitm.c:198 — engulfing_u(mtmp): attacking from inside is always OK. */
    if ((u.uswallow | 0) && u.ustuck === mtmp)
        return false;

    /* C uhitm.c:201-214 — F-fight deliberately skips every check below. */
    if (game.context?.forcefight)
        return false;

    /* C uhitm.c:220 — cache the shown glyph BEFORE anything can change it. */
    const bx = (game.gb?.bhitpos?.x ?? mtmp.mx) | 0;
    const by = (game.gb?.bhitpos?.y ?? mtmp.my) | 0;
    const glyph_invisible = glyph_is_invisible_at(bx, by);
    const glyph_warning = _ac_glyph_is_warning_at(bx, by, mtmp);
    const Blind = _ac_blind();

    /* C uhitm.c:229-252 — the hero bumps something it cannot see. */
    if (!canspotmon(mtmp)
        && !glyph_warning && !glyph_invisible
        && !(!Blind && (mtmp.mundetected | 0) && _ac_hides_under(mtmp.data))) {
        void pline(`Wait!  There's ${_AC_SOMETHING} there you can't see!`);
        map_invisible(bx, by);
        /* C uhitm.c:236-243 — if it was an invisible mimic, treat it as if we
         * stumbled onto a visible mimic (it sticks the hero; "applied pole-arm
         * attack is too far to get stuck"). */
        if (M_AP_TYPE(mtmp) && !_ac_prot_from_shape_changers()) {
            if (!u.ustuck && !(mtmp.mflee | 0) && dmgtype(mtmp.data, _AC_AD_STCK)
                && _ac_m_next2u(mtmp))
                set_ustuck(mtmp);
        }
        await wakeup_attack(mtmp, true); /* "always necessary; also un-mimics mimics" */
        return true;
    }

    if (M_AP_TYPE(mtmp) && !_ac_prot_from_shape_changers() && !sensemon(mtmp)
        && !glyph_warning) {
        if (glyph_invisible) {
            /* C uhitm.c:261-263 — the player remembered an unseen monster on
             * this square, so the hidden mimic gets attacked after all. */
            seemimic(mtmp);
            return false;
        }
        await stumble_onto_mimic(mtmp);
        return true;
    }

    /* C uhitm.c:272-300 — a hider (hides_under, or an eel) the hero cannot see
     * is revealed instead of hit. */
    if ((mtmp.mundetected | 0) && !canseemon(mtmp) && !glyph_warning
        && (_ac_hides_under(mtmp.data) || (mtmp.data?.mlet | 0) === _AC_S_EEL)) {
        mtmp.mundetected = 0;
        mtmp.msleeping = 0;
        newsym(mtmp.mx | 0, mtmp.my | 0);
        if (glyph_invisible) {
            seemimic(mtmp); /* C uhitm.c:281-284 */
            return false;
        }
        if (!tp_sensemon(mtmp) && !_ac_detect_monsters()) {
            /* C uhitm.c:286-301 */
            const lmonbuf = l_monnam(mtmp);
            const notseen = lmonbuf === 'it';
            let obj;
            if (!Blind && _xk_hallu())
                void pline(`A ${mtmp.mtame ? 'tame' : 'wild'} `
                           + `${notseen ? 'creature' : lmonbuf} `
                           + `${notseen ? 'is present' : 'appears'}!`);
            else if (Blind || (is_pool_uh(mtmp.mx | 0, mtmp.my | 0)
                               && !(game.u?.uinwater | 0)))
                void pline("Wait!  There's a hidden monster there!");
            else if ((obj = game.level?.levelObjects?.[mtmp.mx | 0]?.[mtmp.my | 0]) != null)
                void pline(`Wait!  There's ${notseen ? _AC_SOMETHING : an(lmonbuf)} `
                           + `hiding under ${await doname(obj)}!`);
            return true;
        }
    }

    /* C uhitm.c:303-306 — wake anything the hero can sense regardless. */
    if (((mtmp.mundetected | 0) || (mtmp.m_ap_type | 0)) && sensemon(mtmp)) {
        mtmp.mundetected = 0;
        await wakeup_attack(mtmp, true);
    }

    if (_ac_flags_confirm() && (mtmp.mpeaceful | 0) && !_ac_conf_hallu_stun()) {
        /* C uhitm.c:310-314 — an intelligent chaotic weapon wants blood and
         * skips the question.  go.override_confirmation is read by
         * known_hitum (uhitm.c:602) and by the twohits guard at :797. */
        if (_ac_is_art(wep, _AC_ART_STORMBRINGER)) {
            (game.go ||= {}).override_confirmation = true;
            return false;
        }
        if (canspotmon(mtmp)) {
            const qbuf = `Really attack ${mon_nam(mtmp)}?`;
            if (!(await paranoid_query(_ac_ParanoidHit(), qbuf))) {
                /* C: svc.context.move = 0 — the command consumes NO turn, which
                 * is why this is a keystroke-consumption defect and not just a
                 * missing message. */
                (game.context ||= {}).move = 0;
                return true;
            }
        }
    }

    return false;
}
const _AC_PARANOID_HIT = 0x0010;   /* flag.h:87 */
const _AC_PARANOID_PRAY = 0x0020, _AC_PARANOID_SWIM = 0x0400,
      _AC_PARANOID_TRAP = 0x0800; /* flag.h:88, :93, :94 */
function _ac_ParanoidHit() {
    const bits = (game.flags?.paranoia_bits != null)
        ? (game.flags.paranoia_bits | 0)
        : (_AC_PARANOID_PRAY | _AC_PARANOID_SWIM | _AC_PARANOID_TRAP);
    return (bits & _AC_PARANOID_HIT) !== 0;
}
/* C optlist.h:239 NHOPTB(confirm, ..., On, ...) &flags.confirm — "ask before
 * hitting tame or peaceful monsters", default On.  js/options.js lowers a
 * boolean rc line into game.flags[name], so an absent field means the default. */
function _ac_flags_confirm() { return game.flags?.confirm !== false; }
/* C uhitm.c:309 `!Confusion && !Hallucination && !Stunned`, spelled off
 * u.uprops exactly as is_safemon above does — same three properties, same
 * three spellings, one place each. */
function _ac_conf_hallu_stun() {
    const u = game.u;
    return !!((u?.uprops?.[CONFUSION]?.intrinsic | 0)
        || (u?.uprops?.[STUNNED]?.intrinsic | 0)
        || _xk_hallu());
}
/* C obj.h:439 is_art(o, art) == ((o) && (o)->oartifact == (art)).
 * ART_STORMBRINGER is artilist.h ordinal 2 — the same value js/mhitu.js:5098
 * carries, cross-checked there against Snickersnee = 19 (js/uhitm.js's own
 * SR_ART_SNICKERSNEE). */
const _AC_ART_STORMBRINGER = 2;
function _ac_is_art(o, art) { return is_art(o, art); }
/* C youprop.h Protection_from_shape_changers.  js/const.js pins the property
 * slot (PROT_FROM_SHAPE_CHANGERS = 60); js/monmove.js:3037 already reads this
 * as always-false for want of a source, and js/timeout.js:650 is the only other
 * mention.  Read the uprops slot properly rather than hardcode FALSE, so the
 * day something writes it this arm follows. */
function _ac_prot_from_shape_changers() {
    const p = game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    return !!(p && (((p.intrinsic | 0)) || ((p.extrinsic | 0))));
}

/* C obj.h:421 is_plural(o) — quan != 1, plus the Eyes of the Overworld
 * artifact special case (no artifact ever reaches the temporary object
 * that_is_a_mimic makes, so oartifact is 0 there). */
function _ac_is_plural(o) { return (o?.quan | 0) !== 1; }

async function _mimic_object_from_map(mtmp, glyphotyp) {
    /* C pager.c:318-330: a nameless slot (hallucinated glyph of a shuffled-out
     * item) gets mkobj(oc_class, FALSE) instead of mksobj(otyp, FALSE, FALSE). */
    const otmp = OC_NAME[glyphotyp]
        ? await mksobj(glyphotyp, false, false)
        : await mkobj(MKOBJ_OC_CLASS[glyphotyp] | 0, false);
    /* C pager.c:329-330 — mksobj(init=FALSE) still starts corpse-rot / egg-hatch
     * / figurine timers; obj_stop_timers cancels them.  RNG-free, and no timed
     * otyp is reachable through a mimic disguise. */
    if (otmp.timed)
        void otmp.timed;
    /* C pager.c:335-338 — coins pluralize, slime mold takes current_fruit. */
    if ((otmp.oclass | 0) === _AC_COIN_CLASS)
        otmp.quan = 2;
    else if ((otmp.otyp | 0) === 285 /* SLIME_MOLD */) {
        otmp.spe = game.svc?.context?.current_fruit | 0;
        /* C pager.c:338-343 — the mimic's own fruit overrides current_fruit. */
        if (mtmp.mextra && (mtmp.mextra.mcorpsenm ?? NON_PM_UH) !== NON_PM_UH)
            otmp.spe = mtmp.mextra.mcorpsenm;
    }
    otmp.where = 3;
    otmp.ox = mtmp.mx | 0;
    otmp.oy = mtmp.my | 0;
    /* C pager.c:361-368 — a fake object seen up close (adjacent, !Blind,
     * !Hallucination) gets dknown, so the name carries its description
     * ("scroll labeled X"); a prior look recorded in M_AP_F_DKNOWN does too. */
    if (_ac_m_next2u(mtmp) && !_ac_blind() && !_xk_hallu())
        observe_object(otmp);
    if (otmp.dknown || ((mtmp.m_ap_type | 0) & M_AP_F_DKNOWN)) {
        mtmp.m_ap_type |= M_AP_F_DKNOWN;
        observe_object(otmp);
    }
    return otmp;
}

const _MIM_REVEAL = 1;      /* C hack.h:1185 */
const _MIM_OMIT_WAIT = 2;   /* C hack.h:1186 */
export async function that_is_a_mimic(mtmp, mimic_flags) {
    const generic = 'a monster';
    let fmtbuf = "Wait!  That's %s!";
    let what = null;
    const reveal_it = (mimic_flags & _MIM_REVEAL) !== 0;
    const omit_wait = (mimic_flags & _MIM_OMIT_WAIT) !== 0;
    const apt = (mtmp.m_ap_type | 0) & M_AP_TYPMASK;

    if (_ac_blind()) {
        const tp = game.u?.uprops?.[TELEPAT_PROP];
        if (!(tp?.intrinsic || tp?.extrinsic))
            what = generic;
        else if (apt === M_AP_MONSTER)
            what = _ac_a_monnam(mtmp);
    } else {
        const cell = game.level?.at(mtmp.mx | 0, mtmp.my | 0);
        if (glyph_cmap_at(mtmp.mx, mtmp.my) >= 0) {
            /* C uhitm.c:6224-6231 — glyph_is_cmap(glyph) arm for furniture:
             * "That %s actually is %%s!" with defsyms[sym].explanation.  The
             * glyph_to_cmap is the cell's stored cmap index. */
            const sym = glyph_cmap_at(mtmp.mx, mtmp.my);
            const explanation = DEFSYM_EXPLANATION[sym];
            if ((apt === M_AP_FURNITURE || (apt === M_AP_OBJECT && sym === 73))
                && explanation !== undefined) /* S_trapped_chest */
                fmtbuf = `That ${explanation} actually is %s!`;
        } else if (cell?.disp_cls === GLYPHCLS_OBJ) {
            /* C uhitm.c:6232-6244 — glyph_is_object(glyph), glyph = glyph_at(x,y):
             * the PAINTED glyph, not the disguise.  While hallucinating the
             * painted object glyph is a random_obj_to_glyph() draw (display.h:965),
             * so the name is that draw's otyp, not mappearance. */
            const paintedOtyp = (cell?.disp_cls === GLYPHCLS_OBJ
                                 && Number.isInteger(cell.disp_obj_otyp))
                ? cell.disp_obj_otyp : null;
            const glyphotyp = paintedOtyp ?? (mtmp.mappearance | 0);
            const otmp = await _mimic_object_from_map(mtmp, glyphotyp);
            const otmp_name = (otmp && (otmp.otyp | 0) !== 0 /* STRANGE_OBJECT */)
                ? simpleonames(otmp) : 'strange object';
            fmtbuf = `${(otmp && _ac_is_plural(otmp)) ? 'Those' : 'That'} ${otmp_name} `
                   + `${otmp ? otense(otmp, 'are') : 'is'} %s!`;
            /* C uhitm.c:6239-6243: _mimic_object_from_map always makes a fake
             * (fakeobj TRUE); free it only when it exists. */
            if (otmp) {
                otmp.where = 0; /* OBJ_FREE before dealloc. */
                await _uh_dealloc_and_bump(otmp);
            }
        } else if (cell?.disp_cls === 'mon' && !cell.disp_is_warning) {
            /* Warning digits share cls 'mon' here, but aren't monster glyphs. */
            /* C uhitm.c:6245-6251 — glyph_is_monster(glyph): the painted
             * disguise monster (mappearance), named via pmname(). */
            const mtmp_name = monPmname(cell.disp_mon_pm, Mgender(mtmp));
            fmtbuf = `Wait!  That ${mtmp_name} is really %s!`;
        }
        /* C uhitm.c:6254-6268 — who the mimic actually is. */
        if ((mtmp.minvis | 0) && !_ac_see_invisible())
            what = generic;
        else if (apt === M_AP_MONSTER)
            what = x_monnam(mtmp, ARTICLE_A, null, 0x1F /* C hack.h EXACT_NAME; const.js value is wrong, see mhitm.js XM_EXACT_NAME */, true);
        else if ((mtmp.data?.mlet | 0) === _AC_S_MIMIC
                 && (apt === M_AP_OBJECT || apt === M_AP_FURNITURE)
                 && ((mtmp.msleeping | 0) || (mtmp.mfrozen | 0)))
            /* C's own BUG, ported: a paralyzed mimic is called sleeping. */
            what = x_monnam(mtmp, ARTICLE_A, 'sleeping', 0, false);
        else
            what = _ac_a_monnam(mtmp);
    }

    if (what) {
        /* C uhitm.c:6270-6273 — MIM_OMIT_WAIT strips a leading "Wait!  ". */
        const i = (omit_wait && fmtbuf.startsWith('Wait!  ')) ? 7 : 0;
        await pline(fmtbuf.slice(i).replace('%s', what));
    }
    if (reveal_it)
        seemimic(mtmp);
}

/* C ref: uhitm.c:6281-6297 stumble_onto_mimic(mtmp).  "Note: caller must
 * ascertain mtmp is mimicking..." */
export async function stumble_onto_mimic(mtmp) {
    await that_is_a_mimic(mtmp, _MIM_REVEAL);

    const u = game.u || {};
    /* C uhitm.c:6285-6288 — AD_STCK (every S_MIMIC) sticks the hero to it.
     * "must be adjacent; attack via polearm could be from farther away". */
    if (!u.ustuck && !(mtmp.mflee | 0) && dmgtype(mtmp.data, _AC_AD_STCK)
        && _ac_m_next2u(mtmp))
        set_ustuck(mtmp);

    await wakeup(mtmp, false); /* clears mimicking */
    /* C uhitm.c:6293-6296 — if the hero is blind, wakeup() will not have shown
     * the monster even though it is no longer concealed. */
    if (!canspotmon(mtmp) && !remembered_glyph_is_invisible(mtmp.mx | 0, mtmp.my | 0))
        map_invisible(mtmp.mx | 0, mtmp.my | 0);
}

/* C do_name.c:1152-1156 a_monnam(mtmp). */
function _ac_a_monnam(mtmp) {
    return a_monnam(mtmp);
}
/* C youprop.h See_invisible — no js/ writer; reads FALSE, the same answer the
 * port gave before this function existed. */
function _ac_see_invisible() { return _hero_resists(SEE_INVIS); }
/* C mondata.h m_next2u(mon) — dist2 <= 2, i.e. orthogonally or diagonally
 * adjacent to the hero (js/makemon.js:3724 carries the same body, unexported). */
function _ac_m_next2u(mon) {
    return dist2(mon.mx | 0, mon.my | 0, game.u.ux | 0, game.u.uy | 0) <= 2;
}
/* C defsym.h MONSYM(13, 'm', MIMIC, S_MIMIC); C monattk.h:61 AD_STCK 19.
 * C objclass.h COIN_CLASS. */
const _AC_COIN_CLASS = 12;
const _AC_S_MIMIC = 13;
const _AC_AD_STCK = 19;
/* C defsym.h:362 MONSYM(57, ';', EEL, S_EEL, "sea monster").
 * The mlet enum is the macro index 57, not the ASCII code for ';'. */
const _AC_S_EEL = 57;
/* C youprop.h Blind — the same uprops reader the rest of this file uses. */
function _ac_blind() {
    const p = game.u?.uprops?.[15 /* BLINDED */];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
/* C youprop.h Detect_monsters — no writer in js/; reads FALSE. */
function _ac_detect_monsters() { return _hero_resists(DETECT_MONSTERS); }

async function missum(mdef, wouldhavehit, mattk = null) {
    if (wouldhavehit)
        pline('Your armor is rather cumbersome...');
    /* C uhitm.c:5206 `if (could_seduce(&gy.youmonst, mdef, mattk))` */
    if (could_seduce(game.youmonst, mdef, mattk))
        pline('You pretend to be friendly to ' + mon_nam(mdef) + '.');
    else if (canspotmon(mdef) && (game.flags?.verbose ?? true))
        pline('You miss ' + mon_nam(mdef) + '.');
    else
        pline('You miss it.');
    /* C uhitm.c:5212-5213 `if (!helpless(mdef)) wakeup(mdef, TRUE);` */
    if (!((mdef.msleeping | 0) || !(mdef.mcanmove | 0)))
        await wakeup_attack(mdef, true);
}



/* C uhitm.c:5217-5243: only grounded creatures benefit from Giantslayer
 * or a loadstone.  The rider's loadstone also protects the steed. */
export function m_is_steadfast(mtmp) {
    const u = game.u;
    const is_u = is_youmonst(mtmp);
    const data = mtmp.data;
    const weapon = is_u ? u.uwep : which_armor(mtmp, 0x100 /* W_WEP */);
    if ((is_u ? (_legs_Flying() || _legs_Levitation())
              : (is_flyer(data) || data.mlet === 5 || data.mlet === 25))
        || Is_airlevel(u.uz)
        || (Is_waterlevel(u.uz) && !is_pool_uh(u.ux, u.uy)))
        return false;
    if (weapon && weapon.oartifact === 15 /* ART_GIANTSLAYER */)
        return true;
    for (let obj = is_u ? game.invent : mtmp.minvent; obj; obj = obj.nobj)
        if (obj.otyp === 471 /* LOADSTONE */) return true;
    if (u.usteed && mtmp === u.usteed)
        for (let obj = game.invent; obj; obj = obj.nobj)
            if (obj.otyp === 471) return true;
    return false;
}

/* C uhitm.c:5247-5421 mhitm_knockback, hero-attacker/monster-defender arm.
 * Forwards to the shared C-faithful mhitm_knockback in js/dogmove.js. */
async function _hero_mhitm_knockback(mdef, wep, aatyp = 254 /* AT_WEAP */,
                                     adtyp = 0 /* AD_PHYS */, hit = true) {
    return await mhitm_knockback(game.youmonst, mdef, { aatyp, adtyp },
                                 { hitflags: hit ? M_ATTK_HIT : 0 }, !!wep);
}

// C uhitm.c:1923: share the armed hero's knockback with the hmon() path.
export function hmon_hitmon_knockback(mon) {
    return _hero_mhitm_knockback(mon, game.u.uwep);
}

/* hitum_cleave's `static boolean clockwise` (uhitm.c:660) — BSS, so FALSE
 * at every process start (each restored segment), never saved. */
let _cleave_clockwise = false;
export function hitum_cleave_reset_process_state() {
    _cleave_clockwise = false;
}

/* C uhitm.c:431-443 force_attack — temporarily override 'safepet' (fake the
 * 'F' prefix) for hostiles/peacefuls, and for pets only when pets_too. */
export async function force_attack(mtmp, pets_too) {
    const save_Forcefight = game.context.forcefight;
    if (pets_too || !mtmp.mtame)
        game.context.forcefight = true; /* TRUE; C uhitm.c:439 */
    const attacked = await do_attack(mtmp);
    game.context.forcefight = save_Forcefight;
    return attacked;
}

export async function do_attack(mtmpOrX, y, kickOnly = false) {
    /* Resolve calling convention: (monster_object) vs (x, y) coords. */
    let mtmp;
    if (typeof mtmpOrX === 'number') {
        /* Called with (x, y) coordinates — cmd.js W21.3 compat */
        mtmp = m_at(mtmpOrX, y | 0);
    }
    else {
        mtmp = mtmpOrX;
    }
    if (!mtmp)
        return false;
    const forcefight = (game.context?.forcefight | 0);
    /* C uhitm.c:462-463 — `if (is_safemon(mtmp) && !forcefight) { if
     * (!u_wield_art(ART_STORMBRINGER)) {...} }`: an intelligent chaotic
     * weapon skips the swap/stop block and falls through to the attack. */
    if (is_safemon(mtmp) && !forcefight
        && !_ac_is_art(game.u?.uwep, _AC_ART_STORMBRINGER)) {
        /* C uhitm.c:475-478:
         *   boolean foo = (Punished || !rn2(7)
         *                  || (is_longworm(mtmp->data) && mtmp->wormno)
         *                  || (IS_OBSTRUCTED(levl[u.ux][u.uy].typ)
         *                      && !passes_walls(mtmp->data)));
         * C's `||` SHORT-CIRCUITS, so the rn2(7) is NOT drawn when the hero is
         * Punished.  This port evaluated `rn2(7)` into a temporary BEFORE the
         * disjunction, which draws where C does not — a latent RNG defect on
         * any ball-and-chain game.  Written as C writes it. */
        /* C youprop.h:75: Punished is the ball pointer. */
        const punished = !!(game.u?.uball);
        const foo = punished || rn2(7) === 0
            || (_is_longworm_uh(mtmp.data) && (mtmp.wormno | 0))
            || (IS_OBSTRUCTED(game.level?.locations?.[game.u?.ux | 0]?.[game.u?.uy | 0]?.typ | 0)
                && !_passes_walls_uh(mtmp.data));
        let inshop = false;
        if (!foo) {
            const _rooms = game.level?.rooms ?? [];
            for (const p of in_rooms(mtmp.mx | 0, mtmp.my | 0, SHOPBASE)) {
                const _sroom = _rooms[(p | 0) - ROOMOFFSET];
                if (_sroom && tended_shop(_sroom)) {
                    inshop = true;
                    break;
                }
            }
        }
        if (inshop || foo) {
            /* C uhitm.c:493-495:
             *     if (!svc.context.travel && !svc.context.run)
             *         if (canspotmon(mtmp) && mtmp->isshk)
             *             return ECMD_TIME | dopay();
             * Walking (not running, not travelling) into a visible shopkeeper is
             * how C opens the pay dialogue; `ECMD_TIME | dopay()` is non-zero
             * whatever dopay returns, so the boolean result is always TRUE. */
            if (!(game.context?.travel) && !(game.context?.run | 0)
                && canspotmon(mtmp) && mtmp.isshk) {
                await dopay();
                return true;
            }
            /* C uhitm.c:497-498 — if (mtmp->mtame) monflee(mtmp, rnd(6), FALSE, FALSE);
             * The rnd(6) is the ARGUMENT; monflee itself draws nothing on this
             * path (its two draws are behind fleemsg — FALSE here — and behind
             * PM_VROCK, monmove.c:490/521).  This used to be a bare `rnd(6)`
             * standing in for the whole call, so the pet never actually got
             * mflee/mfleetim set. */
            if (mtmp.mtame)
                await monflee(mtmp, rnd(6), false, false);
            const buf = y_monnam(mtmp) || '';
            const first = buf.charCodeAt(0);
            const monname = (first >= 0x61 && first <= 0x7a)
                ? String.fromCharCode(first & ~0x20) + buf.slice(1) : buf;
            await pline(`You stop.  ${monname} is in the way!`);
            end_running(true);
            return true;
        }
        /* C uhitm.c:503-507:
         *     } else if (mtmp->mfrozen || helpless(mtmp)
         *                || (mtmp->data->mmove == 0 && rn2(6))) {
         *         pline("%s doesn't seem to move!", Monnam(mtmp));
         *         end_running(TRUE);
         *         return TRUE;
         *     } else
         *         return FALSE;
         * The `helpless(mtmp) ||` operand was MISSING, and its sibling CONSUMES
         * RNG, so this was an RNG defect as well as a behavioural one:
         *   - a SLEEPING or IMMOBILISED monster whose data->mmove is 0 (mold,
         *     jelly, fungus, lichen) made C short-circuit at helpless() and never
         *     reach the rn2(6); this port drew it.
         *   - a SLEEPING but MOBILE monster takes this branch in C and returns
         *     TRUE; this port fell through to `return false` and displaced it.
         * helpless() is monst.h:251 (msleeping || !mcanmove) — imported from
         * js/mhitm.js rather than spelled a fourth time in js/.
         * The body carried the two defects the "in the way" branch above already
         * fixed for itself: `mtmp.mname` is a field nothing in js/ assigns (so it
         * always printed "it doesn't seem to move!" instead of C's Monnam), and
         * `game.context.move = 0` is invented — C runs end_running(TRUE) here and
         * does NOT suppress the turn. */
        else if (mtmp.mfrozen || helpless(mtmp)
                 || (mtmp.data?.mmove === 0 && rn2(6))) {
            await pline(`${Monnam(mtmp)} doesn't seem to move!`);
            end_running(true);
            return true;
        }
        else {
            /* C uhitm.c:510 — return FALSE: hero displaces monster, no attack */
            return false;
        }
    }

    /* Lazy weapon init: ensure u.uwep reflects starting equipment for roles
     * that wield a weapon at game start (Valkyrie: spear, Wizard: quarterstaff).
     * C: ini_inv_use_obj() runs during initplyr() before the first command.
     * JS defers this until first attack so it also covers cmd.js dofire path. */
    /* NOT CALLED any more: ini_inv_use_obj (u_init.js) wields the starting kit
     * for real, and this fabricator re-wielded a spear into a polymorphed
     * hero whose drop_weapon() (polyself.c:1346) had emptied uwep. */

    /* C uhitm.c:515 — go.override_confirmation = FALSE (set by attack_checks) */
    (game.go ||= {}).override_confirmation = false;
    {
        const _u = game.u || {};
        const _bx = ((_u.ux | 0) + (_u.dx | 0)) | 0;
        const _by = ((_u.uy | 0) + (_u.dy | 0)) | 0;
        (game.gb ||= {}).bhitpos = { x: _bx, y: _by };
        (game.gn ||= {}).notonhead =
            (_bx !== (mtmp.mx | 0) || _by !== (mtmp.my | 0));
    }
    /* Step 1: C uhitm.c:519 `if (attack_checks(mtmp, uwep)) return TRUE;`.
     * TRUE aborts do_attack BEFORE overexertion() and exercise(), so neither
     * gethungry's rn2(20) nor exercise's rn2(19) is drawn. */
    /* kickOnly: dokick.c:183 kick_monster's polyform AT_KICK loop enters
     * here directly -- none of do_attack's preamble runs in C. */
    if (!kickOnly && await attack_checks(mtmp, game.u?.uwep ?? null))
        return true;

    if (!kickOnly && Upolyd(game.u) && noattacks_mndx(game.u.umonnum | 0)) {
        await You("have no way to attack monsters physically.");
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~_AC_STRAT_WAITMASK;
        /* goto atk_done (uhitm.c:570-577): an F-fight at an unspotted monster
         * still leaves the 'I' marker. */
        if (game.context?.forcefight && (mtmp.mhp | 0) > 0 && !canspotmon(mtmp)
            && game.level.at((game.u.ux | 0) + (game.u.dx | 0), (game.u.uy | 0) + (game.u.dy | 0))?.remembered_glyph?.cls !== GLYPHCLS_INVIS
            && !((game.u.uswallow | 0) && game.u.ustuck === mtmp))
            map_invisible((game.u.ux | 0) + (game.u.dx | 0), (game.u.uy | 0) + (game.u.dy | 0));
        return true;
    }

    /* Step 2: check_capacity() — returns FALSE for UNENCUMBERED heroes.
     * No RNG. Skip. */

    /* Step 3: overexertion() [hack.c:3051-3061] — "combat increases
     * metabolism".  Extracted above (this file's other export, `overexertion`)
     * so apply.c's other caller (use_pole's monster-hit arm, js/cmd.js) can
     * reuse the identical sequence instead of re-deriving it. */
    if (!kickOnly && (check_capacity_hit('You cannot fight while so heavily loaded.')
        || await overexertion())) {
        /* hero passed out from overexertion; goto atk_done, return TRUE.
         * atk_done (uhitm.c:572-577): an F-fight at an unspotted monster
         * still leaves the 'I' marker. */
        if (game.context?.forcefight && (mtmp.mhp | 0) > 0 && !canspotmon(mtmp)
            && game.level.at((game.u.ux | 0) + (game.u.dx | 0), (game.u.uy | 0) + (game.u.dy | 0))?.remembered_glyph?.cls !== GLYPHCLS_INVIS
            && !((game.u.uswallow | 0) && game.u.ustuck === mtmp))
            map_invisible((game.u.ux | 0) + (game.u.dx | 0), (game.u.uy | 0) + (game.u.dy | 0));
        return true;
    }

    if (!kickOnly && game.u.twoweap && !await can_twoweapon())
        await untwoweapon(); /* C uhitm.c:536-537 */

    if (!kickOnly && game.unweapon) {
        game.unweapon = false;
        if (game.flags?.verbose ?? true) {
            if (game.u?.uwep) {
                await pline(`You begin bashing monsters with ${yname(game.u.uwep)}.`);
            } else if (!_uh_cantwield(game.youmonst?.data)) {
                /* C: You("begin %s monsters with your %s %s.",
                 *        ing_suffix(Role_if(PM_MONK) ? "strike" : "bash"),
                 *        uarmg ? "gloved" : "bare",
                 *        makeplural(body_part(HAND))); */
                const verb = _uh_role_is_monk() ? 'striking' : 'bashing';
                const glove = game.u?.uarmg ? 'gloved' : 'bare';
                await pline(`You begin ${verb} monsters with your ${glove} ${makeplural(body_part(HAND_UH))}.`);
            }
        }
    }

    /* Step 4: exercise(A_STR, TRUE) [uhitm.c:552] */
    if (!kickOnly)
        exercise(A_STR, true);

    /* Step 5: C uhitm.c:554 u_wipe_engr(3). */
    if (!kickOnly && can_reach_floor(true))
        wipe_engr_at(game.u?.ux | 0, game.u?.uy | 0, 3, false);

    /* Step 6: hitum() — find_roll_to_hit (pure arithmetic) + rnd(20) + ... */
    const u = game.u;

    /* Upolyd: hmonas passes one attknum through every row's find_roll_to_hit
     * (uhitm.c:5423+), so check_caitiff fires in _hmonas on the first row
     * that rolls to hit -- never for AT_EXPL (uhitm.c:5762-5767). */

    let mndx = 0, _tmpBase = 0, _armorpenalty = 0;
    /* find_roll_to_hit's target-dependent terms; re-run per target by
     * hitum_cleave (uhitm.c:703) */
    const _find_roll_to_hit = () => {
    _armorpenalty = 0; /* C uhitm.c:374 *role_roll_penalty = 0 */
    mndx = (mtmp.mndx ?? mtmp.mnum) | 0;
    const monAC = find_mac(mtmp);
    const abon_val = abon();
    /* luck bonus: sgn(Luck) * ((abs(Luck)+2)/3) — C ref: uhitm.c:378 */
    const luck = u ? (((u.uluck | 0) + (u.moreluck | 0)) | 0) : 0; /* C Luck = u.uluck + u.moreluck */
    const luckBonus = (luck > 0 ? 1 : luck < 0 ? -1 : 0) * (((luck < 0 ? -luck : luck) + 2) / 3 | 0);
    const formOrUlevel = Upolyd(u)
        ? (((u.umonnum | 0) >= 0 && (u.umonnum | 0) < _MONS.length)
            ? (_MONS[u.umonnum | 0][1] | 0) : 0)
        : ((u && u.ulevel) ? (u.ulevel | 0) : 1);
    /* tmp = 1 + abon() + find_mac(mtmp) + u.uhitinc + luck + maybe_polyd(...) */
    let tmp = 1 + abon_val + monAC + ((u && u.uhitinc) ? (u.uhitinc | 0) : 0) + luckBonus + formOrUlevel;
    /* adjust vs. monster state — C ref: uhitm.c:388-395 */
    if (mtmp.mstun) tmp += 2;
    if (mtmp.mflee) tmp += 2;
    if (mtmp.msleeping) tmp += 2;
    if (!mtmp.mcanmove) tmp += 4;
    const initrole = (game.flags?.initrole ?? -1) | 0;
    const isMonk = (initrole === 5); /* roles[] index 5 = Monk = PM_MONK */
    if (isMonk && !Upolyd(u)) {
        const uarmBody = u && u.uarm;        /* body armor */
        const uarmsShield = u && u.uarms;    /* shield */
        const uwepHeld = u && u.uwep;
        if (uarmBody) {
            /* C uhitm.c:399 tmp -= (*role_roll_penalty = urole.spelarmr) */
            _armorpenalty = (game.urole?.spelarmr ?? 0) | 0;
            tmp -= _armorpenalty;
        } else if (!uwepHeld && !uarmsShield) {
            tmp += ((formOrUlevel / 3) | 0) + 2;
        }
    }
    /* C uhitm.c:404-406 — elves hit orcs more easily:
     *     if (is_orc(mtmp->data) && maybe_polyd(is_elf(youmonst.data), Race_if(PM_ELF))) tmp++;
     * M2_ORC 0x80 / M2_ELF 0x10 (monflag.h:127,130) are mflags2, MONS column [7]. */
    {
        const _row = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
        const _isOrc = !!_row && ((_row[7] | 0) & 0x80) !== 0;
        const _elf = Upolyd(u)
            ? (((_MONS[u.umonnum | 0]?.[7] | 0) & 0x10) !== 0)
            : ((game.urace?.mnum | 0) === 264); /* PM_ELF */
        if (_isOrc && _elf) tmp++;
    }
    const _encumbrance = near_capacity();
    if (_encumbrance !== 0)
        tmp -= (_encumbrance * 2) - 1;
    if (u && u.utrap)
        tmp -= 3;
    /* weapon block — C ref: uhitm.c:419-425:
     * In C find_roll_to_hit, the weapon and kick blocks run:
     *   if (aatyp == AT_WEAP || aatyp == AT_CLAW) {
     *       if (weapon) tmp += hitval(weapon, mtmp);
     *       tmp += weapon_hit_bonus(weapon);
     *   } else if (aatyp == AT_KICK && martial_bonus()) {
     *       tmp += weapon_hit_bonus((struct obj *) 0);
     *   }
     * Because weapon_hit_bonus is async in js/, _find_roll_to_hit stores base tmp
     * into _tmpBase, and its callers apply this block right after it:
     *   - _swing (AT_WEAP): hitval + await weapon_hit_bonus(weapon)
     *   - _hmonas weaponless rows: AT_CLAW weapon_hit_bonus(null), AT_KICK
     *     weapon_hit_bonus(null) only with martial_bonus() */
    _tmpBase = tmp;
    };
    _find_roll_to_hit();

    let malive = true; /* monster still alive after this attack */
    let _swingDied = false; /* a lethal passive() ended the hero in place */

    const _swing = async (weapon, second, viaHmonas, cleaving, twohits = 0) => {
    _find_roll_to_hit(); /* C hitum/hmonas recompute after every prior hit. */
    let tmp = _tmpBase;
    const uwepForHit = weapon;
    if (uwepForHit)
        tmp += hitval(uwepForHit, mtmp, mndx);
    tmp += await weapon_hit_bonus(uwepForHit);

    mon_maybe_unparalyze(mtmp);
    /* hitum() rnd(20) dieroll [uhitm.c:781 / uhitm.c:804] */
    const dieroll = rnd(20);
    let mhit = (tmp > dieroll) || !!(u && u.uswallow); /* uswallow = always hits */
    let _wepDestroyed = false; /* C: wepbefore && !uwep */

    /* C uhitm.c:602-606 known_hitum — Stormbringer's override announces itself */
    if (game.go?.override_confirmation && (game.flags?.verbose ?? true))
        await pline('Your bloodthirsty blade attacks!');

    /* C uhitm.c:610 missum(mon, uattk, (rollneeded + armorpenalty > dieroll)) */
    if (!mhit)
        await missum(mtmp, tmp + _armorpenalty > dieroll);
    if (mhit) {
        if (!second && !cleaving && tmp > dieroll) exercise(A_DEX, true);

        // C uhitm.c:612-639: a zero-damage hit restores weapon conduct.
        const oldhp = mtmp.mhp;
        const oldweaphit = u.uconduct?.weaphit | 0;
        const angerGuards = !!(mtmp.mpeaceful && (mtmp.ispriest || mtmp.isshk
            || mtmp.data?.pmidx === 282 || mtmp.data?.pmidx === 283));
        if (weapon && ((weapon.oclass | 0) === WEAPON_CLASS || is_weptool(weapon))) {
            const uc = (u.uconduct ||= {});
            uc.weaphit = (uc.weaphit | 0) + 1;
        }

        /* dmgval: hmon → hmon_hitmon → dmgval [weapon.c:216-295].
         * Bare-handed: hmon_hitmon_barehands, rnd(2)/rnd(4) [uhitm.c:848].
         * Armed: the real dmgval(obj, mon) below, which derives bigmonst
         * from mon.data internally (weapon.c:224). */
        const uwep = weapon; /* C: known_hitum(mon, <this swing's weapon>, ...) */
        const hmd = {
            thrown: 0, twohits,
            mdat: mtmp.data, material: uwep ? sr_oc_material(uwep.otyp) : 0,
            saved_oname: uwep ? (artifact_light(uwep) && uwep.lamplit
                ? bare_artifactname(uwep) : cxname_sh(uwep)) : '',
            barehand_silver_rings: 0, silvermsg: false, silverobj: false,
            lightobj: false, already_killed: false, offmap: false, dryit: false,
            hand_to_hand: true, hittxt: false, unarmed: !u.uwep && !u.uarm && !u.uarms,
        };
        hit_body: {
        /* C uhitm.c:1341-1347 hmon_hitmon_misc_obj EXPENSIVE_CAMERA: the wielded
         * camera breaks, release_camera_demon draws rn2(3) (dothrow.c:2460),
         * hmon returns TRUE with no damage.  known_hitum then still runs its
         * flee check and the Vorpal "mhp == oldhp -> miss" conversion. */
        if (uwep && (uwep.otyp | 0) === 229 /* EXPENSIVE_CAMERA */
            && (hmd.mdat?.pmidx | 0) !== PM_SHADE) {
            You(`succeed in destroying ${await ysimple_name_hit(uwep)}.  Congratulations!`);
            await release_camera_demon_hit(uwep, u.ux, u.uy);
            await useup(uwep);
            _wepDestroyed = true;
            break hit_body;
        }
        const isWeaponClassHit = !!uwep && ((uwep.oclass | 0) === WEAPON_CLASS
            || is_weptool(uwep) || (uwep.oclass | 0) === GEM_CLASS);
        /* C uhitm.c:1071-1080 hmon_hitmon_weapon's dispatch — see
         * _uh_hmon_hitmon_weapon_ranged's header comment above. Only reachable
         * when isWeaponClassHit (hmon_hitmon_weapon is called only from the
         * WEAPON_CLASS/GEM_CLASS arm of hmon_hitmon_do_hit, uhitm.c:1393-1401). */
        const isRangedMelee = isWeaponClassHit
            && (_uh_is_launcher(uwep) || _uh_is_missile(uwep) || _uh_is_ammo(uwep)
                || _uh_is_pole_ranged(uwep));
        let dmg;
        let _potHittxt = false;
        let _noDmgBonus = false;
        let barehandTrain = false;
        let trainWeaponSkill = false;
        if (!uwep) {
            /* hmon_hitmon_barehands [uhitm.c:848]:
             *   hmd->dmg = rnd(!martial_bonus() ? 2 : 4);
             * martial_bonus() = Role_if(PM_SAMURAI) || Role_if(PM_MONK)
             * (skills.h:81) — for the Monk this is TRUE regardless of monster
             * size, so the damage die is rnd(4), NOT the dmgval small/large
             * (rnd(2)/rnd(4)) split used for weapons.  For non-martial heroes
             * martial_bonus() is false → rnd(2). */
            const martial = _uh_martial_bonus();
            /* C uhitm.c:842-843: a shade takes dmg = 0 with no die rolled. */
            /* C uhitm.c:841-846 hmon_hitmon_barehands: a shade takes dmg 0
             * with NO die roll (and no use_weapon_skill); only other
             * defenders draw rnd(martial ? 4 : 2). */
            dmg = ((mtmp.data?.pmidx | 0) === PM_SHADE) ? 0 : rnd(martial ? 4 : 2);
            barehandTrain = dmg > 1;
            trainWeaponSkill = barehandTrain;
            trainWeaponSkill = dmg > 1;
            const silverhit = { value: 0 };
            const mask = u.uarmg ? W_ARMG
                : ((hmd.twohits < 2 ? W_RINGR : 0)
                   | (hmd.twohits === 0 || hmd.twohits === 2 ? W_RINGL : 0));
            dmg += special_dmgval(game.youmonst, mtmp, mask, silverhit);
            hmd.barehand_silver_rings = (silverhit.value & (W_RINGR | W_RINGL)) ? 1 : 0;
            hmd.silvermsg = !!hmd.barehand_silver_rings;
        } else {
            if (isRangedMelee) {
                const _rh = await _uh_hmon_hitmon_weapon_ranged(uwep, mtmp);
                dmg = _rh.dmg;
                if (_rh.hittxt) _potHittxt = true;
            } else if (isWeaponClassHit) {
                dmg = dmgval(uwep, mtmp);
                trainWeaponSkill = dmg > 1;
            } else if ((uwep.oclass | 0) === POTION_CLASS) {
                /* C uhitm.c:1421-1423 -> hmon_hitmon_potion (:1095-1115): the
                 * wielded potion is split/unwielded, freed from inventory and
                 * shattered by potionhit(); survivors take dmg 1 (0 for a shade)
                 * with hittxt set. */
                let pot = uwep;
                if ((pot.quan | 0) > 1) pot = await splitobj(pot, 1);
                else await setuwep(null);
                freeinv(pot);
                await potionhit(mtmp, pot, 0 /* POTHIT_HERO_BASH */);
                if ((mtmp.mhp | 0) <= 0) {
                    malive = false;
                    break hit_body;
                }
                _potHittxt = true;
                hmd.mdat = mtmp.data;
                dmg = ((mtmp.data?.pmidx | 0) === PM_SHADE) ? 0 : 1;
            } else if ((hmd.mdat?.pmidx | 0) === PM_SHADE && !hmon_shade_aware(uwep)) {
                // C uhitm.c:1425: do not run misc-object effects against a shade.
                dmg = 0;
            } else if ([475 /* BOULDER */, 477 /* HEAVY_IRON_BALL */,
                        478 /* IRON_CHAIN */].includes(uwep.otyp | 0)) {
                // C uhitm.c:1125-1129: these non-weapons use dmgval, without weapon skill.
                dmg = dmgval(uwep, mtmp);
            } else if ((uwep.otyp | 0) === 230 /* MIRROR */) {
                await hmon_hitmon_mirror(hmd, uwep);
                dmg = hmd.dmg;
                _potHittxt = hmd.hittxt;
                _noDmgBonus = hmd.get_dmg_bonus === false;
            } else if ((uwep.otyp | 0) === 265 /* CORPSE */) {
                /* C uhitm.c:1151-1176 hmon_hitmon_misc_obj CORPSE: a wielded
                 * cockatrice corpse prints its own "You hit X with Y." (hittxt),
                 * observe_object, then munstone/minstapetrify; unless the
                 * target resists stoning the hit returns at once.  Other
                 * corpses do msize + 1. */
                const cn = uwep.corpsenm | 0;
                if (touch_petrifies_corpsenm(cn)) {
                    dmg = 1;
                    _potHittxt = true;
                    await pline(`You hit ${mon_nam(mtmp)} with ${corpse_xname(uwep, null, uwep.dknown ? 4 /* CXN_PFX_THE */ : 8 /* CXN_ARTICLE */)}.`);
                    observe_object(uwep);
                    if (!(await munstone(mtmp, true)))
                        await minstapetrify(mtmp, true);
                    if (!sh_resists_ston(mtmp)) {
                        malive = (mtmp.mhp | 0) > 0;
                        break hit_body;
                    }
                } else {
                    dmg = ((MONS_MSIZE[cn] | 0) + 1);
                }
            } else if ((uwep.otyp | 0) === 266 /* EGG */) {
                // C uhitm.c:1186-1257: eggs are consumed or turned into rocks.
                dmg = 1;
                _potHittxt = _noDmgBonus = true;
                if (touch_petrifies_corpsenm(uwep.corpsenm)) {
                    if (await hmon_egg_petrify(hmd, mtmp, uwep)) {
                        malive = hmd.retval; _wepDestroyed = !u.uwep; break hit_body;
                    }
                } else {
                    const cnt = uwep.quan;
                    const cn = uwep.corpsenm;
                    if (uwep === u.uwep) game.unweapon = true;
                    if (uwep.spe && cn >= 0 && cn < _MONS.length) change_luck_uh(-Math.min(cnt, 5));
                    const eggp = cn >= 0 && cn < _MONS.length && uwep.known
                        ? the_sh(permonstTemplate(cn).pmnames[2]) : cnt > 1 ? 'some' : 'an';
                    await You(`hit ${mon_nam(mtmp)} with ${eggp} egg${cnt === 1 ? '' : 's'}.`);
                    if (touch_petrifies(hmd.mdat) && game.moves - uwep.age <= 400) {
                        await pline_The(`egg${cnt === 1 ? " isn't" : "s aren't"} alive any more...`);
                        if (uwep.timed) obj_stop_timers(uwep);
                        uwep.otyp = 474; /* ROCK */
                        uwep.oclass = GEM_CLASS;
                        uwep.oartifact = uwep.spe = uwep.known = uwep.dknown = uwep.bknown = 0;
                        uwep.owt = weight(uwep);
                    } else {
                        if (cn !== 11 /* PM_PYROLISK */) await pline('Splat!');
                        await useupall(uwep);
                        if (cn === 11) {
                            await explode_uh(mtmp.mx, mtmp.my, -11, d(3, 6), 0, EXPL_FIERY);
                            malive = mtmp.mhp > 0; _wepDestroyed = !u.uwep; break hit_body;
                        }
                        exercise(A_WIS, false);
                    }
                }
                _wepDestroyed = !u.uwep;
            } else if ((uwep.otyp | 0) === 287 /* CREAM_PIE */ || (uwep.otyp | 0) === 479 /* BLINDING_VENOM */) {
                /* C uhitm.c:1266-1316 hmon_hitmon_misc_obj CREAM_PIE/BLINDING_VENOM:
                 * wakes the monster; if it can be blinded the pie splashes,
                 * setmangry, mcansee = 0 and dmg = rn1(25, 21) is added to
                 * mblinded; otherwise "Splat!".  The pie is used up, hittxt is
                 * set and the hit does no damage and no damage bonus. */
                const isPie = (uwep.otyp | 0) === 287;
                mtmp.msleeping = 0;
                if (can_blnd(game.youmonst, mtmp, isPie ? 254 /* AT_WEAP */ : 233 /* AT_SPIT */, uwep)) {
                    if (_uh_Blind()) {
                        await pline(isPie ? "Splat!" : "Splash!");
                    } else if (!isPie) {
                        await pline_The(`venom blinds ${mon_nam(mtmp)}${mtmp.mcansee ? "" : " further"}!`);
                    } else {
                        let whom = mon_nam(mtmp);
                        let what = The(xname(uwep));
                        if ((uwep.quan | 0) > 1)
                            what = an(await singular(uwep, xname)).replace(/^./, (c) => c.toUpperCase());
                        if (!(((hmd.mdat?.mflags1) | 0) & 0x00001000 /* !haseyes */)
                            && (hmd.mdat?.pmidx | 0) !== PM_FLOATING_EYE_UH)
                            whom = s_suffix(whom) + " " + mbodypart(mtmp, 2 /* FACE */);
                        await pline(`${what} ${vtense(what, "splash")} over ${whom}!`);
                    }
                    await setmangry(mtmp, true);
                    mtmp.mcansee = 0;
                    const bdmg = rn1(25, 21);
                    mtmp.mblinded = ((mtmp.mblinded | 0) + bdmg > 127) ? 127 : ((mtmp.mblinded | 0) + bdmg);
                } else {
                    await pline(isPie ? "Splat!" : "Splash!");
                    await setmangry(mtmp, true);
                }
                await useup(uwep);
                _wepDestroyed = !u.uwep;
                _potHittxt = true;
                _noDmgBonus = true;
                dmg = 0;
            } else if ((uwep.otyp | 0) === 480 /* ACID_VENOM */) {
                // C uhitm.c:1319-1339: acid venom is consumed even in melee.
                if (Resists_Elem(mtmp, ACID_RES)) {
                    await Your(`venom hits ${mon_nam(mtmp)} harmlessly.`);
                    dmg = 0;
                } else {
                    await Your(`venom burns ${mon_nam(mtmp)}!`);
                    dmg = dmgval(uwep, mtmp);
                }
                await useup(uwep);
                _wepDestroyed = !u.uwep;
                _potHittxt = _noDmgBonus = true;
            } else if ((uwep.otyp | 0) === 284 /* CLOVE_OF_GARLIC */) {
                /* C uhitm.c:1259-1264 hmon_hitmon_misc_obj CLOVE_OF_GARLIC:
                 * "no effect against demons"; undead and vampshifters flee for
                 * d(2,4), and the hit does a nominal 1 with get_dmg_bonus left
                 * TRUE.  Without this arm the veggy default below zeroed the
                 * damage and clamped it to 0, so a wielded clove never hurt the
                 * monster and a fleeing one kept its full hp (monmove.c:759). */
                const _gMflags2 = (_MONS[mtmp.mnum | 0] ? (_MONS[mtmp.mnum | 0][7] | 0) : 0);
                if ((_gMflags2 & M2_UNDEAD) !== 0 || is_vampshifter_uh(mtmp))
                    await monflee(mtmp, d(2, 4), false, true);
                dmg = 1;
            } else {
                /* C uhitm.c:1348-1373: generic misc-object damage. */
                dmg = _uh_misc_obj_dmg(uwep, mtmp, hmd);
                /* C uhitm.c:1346-1349: veggy/paper objects set dmg = 0 AND
                 * get_dmg_bonus = FALSE, so the dmg < 1 clamp at
                 * uhitm.c:1813-1818 yields 0, not 1. */
                if (dmg === 0 && !_potHittxt) _noDmgBonus = true;
            }
        }

        /* C uhitm.c:943-947 hmon_hitmon_weapon_melee: Healer with anatomy
         * knowledge adds min(3, died/6) with a knife (before the backstab). */
        if (Role_if(PM_HEALER)
            && isWeaponClassHit && !isRangedMelee
            && (uwep.oclass | 0) === WEAPON_CLASS
            && sr_oc_skill(uwep.otyp) === 2 /* P_KNIFE */)
            dmg += Math.min(3, Math.trunc(((game.mvitals?.[mtmp.data?.pmidx | 0]?.died) | 0) / 6));
        const _backstabbable = backstabbable(mtmp);
        if ((game.flags?.initrole | 0) === 7 /* Rogue */
            && !Upolyd(u)
            && isWeaponClassHit && !isRangedMelee
            && trainWeaponSkill
            && mtmp !== u.ustuck
            && !u.twoweap
            && (uwep?.oartifact | 0) !== 4 /* ART_CLEAVER */
            && _backstabbable) {
            You(`strike ${mon_nam(mtmp)} from behind!`);
            dmg += rnd(Math.max(1, u.ulevel | 0));
            _potHittxt = true;
        }
        /* C uhitm.c:967-1012 — the else-if after the Rogue backstab arm: a
         * dieroll of 2 with a two-handed (or Samurai katana) weapon at
         * Skilled+ can shatter the defender's non-flimsy wielded weapon. */
        else if (isWeaponClassHit && !isRangedMelee && trainWeaponSkill
                 && mtmp !== u.ustuck && !u.twoweap
                 && (uwep?.oartifact | 0) !== 4 /* ART_CLEAVER */
                 && (dieroll | 0) === 2 && uwep
                 && (uwep.oclass | 0) === WEAPON_CLASS
                 && (bimanual(uwep)
                     || ((game.flags?.initrole | 0) === 9 /* Samurai */
                         && (uwep.otyp | 0) === 56 /* KATANA */ && !u.uarms))
                 && uwep_skill_type() !== 0 /* P_NONE */
                 && (P_SKILL(uwep_skill_type()) | 0) >= 3 /* P_SKILLED */
                 && mtmp.mw && !is_flimsy(mtmp.mw)
                 && !obj_resists(mtmp.mw,
                                 50 + 15 * (Math.max(uwep.oeroded | 0, uwep.oeroded2 | 0)
                                            - Math.max(mtmp.mw.oeroded | 0, mtmp.mw.oeroded2 | 0)),
                                 100)) {
            const monwep = mtmp.mw;
            const from_your_blow = ' from the force of your blow!';
            setmnotwielded(mtmp, monwep);
            mtmp.weapon_check = 1; /* NEED_WEAPON */
            let buf;
            if (canseemon(mtmp))
                buf = Yobjnam2(monwep, 'shatter');
            else
                buf = `${s_suffix(Monnam(mtmp))} weapon${(monwep.quan | 0) === 1 ? '' : 's'} ${otense(monwep, 'shatter')}`;
            await pline(buf + from_your_blow);
            await m_useupall(mtmp, monwep);
            /* If someone just shattered MY weapon, I'd flee! */
            if (rn2(4))
                await monflee(mtmp, d(2, 3), true, true);
            _potHittxt = true;
        }

        /* C uhitm.c:1015-1023, the tail of hmon_hitmon_weapon_melee:
         *     if (obj->oartifact
         *         && artifact_hit(&gy.youmonst, mon, obj, &hmd->dmg,
         *                         hmd->dieroll)) {
         *         if (DEADMONSTER(mon)) return FALSE;
         *         if (hmd->dmg == 0) return TRUE;
         *         hmd->hittxt = TRUE;
         *     }
         * This call was absent entirely, and with it the spec_dbon() damage
         * bonus every artifact weapon gets.
         *
         * ORDER MATTERS AND IS C's: artifact_hit takes hmd->dmg, which at this
         * point is dmgval(obj, mon) — the weapon's damage die PLUS its
         * enchantment (weapon.c:298-302) and nothing else.  dbon()'s strength
         * bonus and weapon_dam_bonus()'s skill bonus are added AFTERWARDS, by
         * hmon_hitmon_dmg_recalc (uhitm.c:1485-1500).  So an artifact that
         * doubles damage doubles the die+spe only; doubling the strength bonus
         * too would be a different (and larger) number.  `dmg` for the armed
         * case is now the REAL dmgval(obj, mon) — die, switch bonus,
         * enchantment, thick-skinned/shade/heavy-ball/weapon-vs-monster-type/
         * erosion, all in one call — so `dmgvalResult` starts as `dmg`
         * directly; no separate spe term (dmgval() already added
         * `otmp.spe` internally, and re-adding it here would double-count).
         *
         * `special` is C's artifact_hit() return: TRUE means the artifact
         * printed its own message, so hmon_hitmon_msg_hit must not print the
         * generic one (uhitm.c:1643, `!hittxt`).  Every arm this port has
         * reached so far returns FALSE (see artifact_hit's KNOWN GAPS), but the
         * flag is wired rather than assumed away. */
        let dmgvalResult = dmg;
        /* C uhitm.c:849 (bare hands) and :946 (weapon):
         *     hmd->train_weapon_skill = (hmd->dmg > 1);
         *   with the comment "a minimal hit doesn't exercise proficiency".
         * In both cases hmd->dmg is the damage BEFORE dbon()/weapon_dam_bonus
         * and before artifact_hit -- for the armed case that is dmgval(obj,mon)
         * (now the real one) and for bare hands it is the rnd(2)/rnd(4) die;
         * `dmgvalResult` is exactly that in both cases.  Computed BEFORE artifact_hit for
         * the same reason C sets it before uhitm.c:1015.
         */
        /* C uhitm.c:936/850 set use_weapon_skill TRUE only on the weapon-melee
         * and bare-handed arms; hmon_hitmon_misc_obj never touches the flag,
         * so it stays FALSE (struct init) for a misc-object hit — no skill
         * bonus, no skill training, and (since artifact_hit is only called
         * from hmon_hitmon_weapon_melee, uhitm.c:1015) no artifact_hit either. */
        /* hmon_hitmon_weapon_ranged (uhitm.c:885-909) is the same kind of gap
         * as misc_obj above: it never sets use_weapon_skill and never calls
         * artifact_hit -- both are exclusive to hmon_hitmon_weapon_melee. */
        const useWeaponSkillHit = (!uwep && (hmd.mdat?.pmidx | 0) !== PM_SHADE)
            || (isWeaponClassHit && !isRangedMelee);
        trainWeaponSkill = useWeaponSkillHit && trainWeaponSkill;
        let artiHittxt = _potHittxt;
        if (uwep && isWeaponClassHit && !isRangedMelee && (uwep.oartifact | 0)) {
            const ah = await artifact_hit(null /* &gy.youmonst */, mtmp, uwep,
                                          dmgvalResult, dieroll, mndx);
            dmgvalResult = ah.dmg;
            if (ah.special) {
                if ((mtmp.mhp | 0) <= 0 || ah.dmg === 0) {
                    malive = (mtmp.mhp | 0) > 0;
                    break hit_body;
                }
                artiHittxt = true;
            }
        }

        /* C uhitm.c:1042-1047: jousting with a lance while mounted. */
        let jousting = 0;
        if (u.usteed && uwep && isWeaponClassHit && !isRangedMelee && dmgvalResult > 0
            && weapon_type(uwep) === P_LANCE && mtmp !== u.ustuck) {
            jousting = joust(mtmp, uwep);
            if (jousting)
                trainWeaponSkill = true;
        }
        hmd.dmg = dmgvalResult;
        hmd.get_dmg_bonus = !_noDmgBonus;
        hmd.use_weapon_skill = useWeaponSkillHit;
        hmd.train_weapon_skill = trainWeaponSkill;
        if (hmd.dmg > 0) await hmon_hitmon_dmg_recalc(hmd, uwep);
        let totalDmg = hmd.dmg;

        // C uhitm.c:1034-1041: remember feedback before hurtling can transform mon.
        if (uwep && hmd.material === 14 && mon_hates_silver(mtmp)
            && (isWeaponClassHit || dmgvalResult > 0))
            hmd.silvermsg = hmd.silverobj = true;
        hmd.lightobj = !!(uwep && isWeaponClassHit && !isRangedMelee
            && hmon_hitmon_lightobj(uwep, mtmp));
        hmd.dmg = totalDmg;
        if (uwep && !isRangedMelee && isWeaponClassHit
            && permapoisoned(uwep) && dieroll <= 5)
            await hmon_hitmon_poison(hmd, mtmp, uwep);
        if (hmd.dmg < 1) {
            hmd.dmg = !_noDmgBonus && mtmp.data?.pmidx !== PM_SHADE ? 1 : 0;
            if (mtmp.data?.pmidx === PM_SHADE && !artiHittxt)
                artiHittxt = !!shade_miss(game.youmonst, mtmp, uwep || null, false, true);
        }
        hmd.jousting = jousting;
        hmd.hittxt = artiHittxt;
        await hmon_hitmon_special(hmd, mtmp, uwep);
        totalDmg = hmd.dmg;

        // C uhitm.c:1839-1850: record the first weapon hit before a kill.
        if (!hmd.already_killed && weapon && (weapon === u.uwep || (u.twoweap && weapon === u.uswapwep))
            && ((weapon.oclass | 0) === WEAPON_CLASS || is_weptool(weapon))
            && !jousting && totalDmg > 0 && ((u.uconduct?.weaphit | 0) <= 1))
            first_weapon_hit(weapon);

        // C uhitm.c:1838-1870: apply HP before pet abuse, even after a trap kill.
        if (!hmd.already_killed) mtmp.mhp -= totalDmg;
        if (mtmp.mhp > mtmp.mhpmax) mtmp.mhp = mtmp.mhpmax;
        hmd.offmap = mtmp.mx === 0;
        hmd.destroyed = mtmp.mhp < 1;
        await hmon_hitmon_pet(hmd, mtmp);
        await hmon_hitmon_splitmon(hmd, mtmp, uwep);
        await hmon_hitmon_msg_hit(hmd, mtmp, uwep);
        // C uhitm.c:1877-1880: dry the towel after the hit message.
        if (hmd.dryit) await dry_a_towel(uwep, -1, true);
        if (hmd.silvermsg) await hmon_hitmon_msg_silver(hmd, mtmp);
        if (hmd.lightobj) await hmon_hitmon_msg_lightobj(hmd, mtmp);
        if (hmd.needpoismsg)
            await pline("The poison doesn't seem to affect " + mon_nam(mtmp) + '.');
        if (hmd.poiskilled) {
            await pline('The poison was deadly...');
            if (!hmd.already_killed) await xkilled(mtmp, XKILL_NOMSG);
            hmd.destroyed = true;
        } else if (hmd.destroyed) {
            if (!hmd.already_killed) await xkilled(mtmp, XKILL_GIVEMSG);
        } else {
            /* C uhitm.c:1911-1918 hmon_hitmon: confusing touch (melee is
             * always hand_to_hand).  nohandglow() is uhitm.c:6315-6337. */
            if ((u.umconf | 0) && !(mtmp.mconf | 0)) {
                const hands = makeplural(body_part(HAND_UH));
                const altfeedback = _ac_blind()
                    || (_hero_resists(40 /* INVIS */) && !_ac_see_invisible());
                if ((u.umconf | 0) === 1) {
                    if (altfeedback)
                        await pline('Your ' + hands + ' stop tingling.');
                    else
                        await pline('Your ' + hands + ' stop glowing '
                                    + hcolor('red') + '.');
                } else if (altfeedback) {
                    await pline('The tingling in your ' + hands + ' lessens.');
                } else {
                    await pline('Your ' + hands + ' no longer glow so brightly '
                                + hcolor('red') + '.');
                }
                u.umconf = (u.umconf | 0) - 1;
                if (!await resist(mtmp, 10 /* SPBOOK_CLASS */, 0, 0 /* NOTELL */)) {
                    mtmp.mconf = 1;
                    if (!(mtmp.mstun | 0) && !helpless(mtmp) && canseemon(mtmp))
                        await pline(Monnam(mtmp) + ' appears confused.');
                }
            } else if ((u.umconf | 0) && (mtmp.mconf | 0)) {
                /* C: nohandglow() returns early, then !mon->mconf is false */
            }
        }
        malive = !hmd.destroyed;
        if (!hmd.destroyed && !hmd.offmap) {
            await wakeup_attack(mtmp, true);
            if (!jousting && u.uwep && totalDmg > 1 && !Upolyd(u) && !u.twoweap) {
                await _hero_mhitm_knockback(mtmp, uwep);
                if (mtmp.mhp < 1) malive = false;
            }
        }
        } /* hit_body */
        // C uhitm.c:824-833: hmon's wrapper also runs after an early return.
        if (mtmp.ispriest && !rn2(2)) await ghod_hitsu(mtmp);
        if (angerGuards) await angry_guards(_uh_Deaf());
        // C uhitm.c:623-642: known_hitum's survivor checks.
        if (malive) {
            if (!rn2(25) && mtmp.mhp < Math.trunc(mtmp.mhpmax / 2)
                && !(u.uswallow && u.ustuck === mtmp)) {
                await monflee(mtmp, !rn2(3) ? rnd(100) : 0, false, true);
                if (u.ustuck === mtmp && !u.uswallow && !sticks(game.youmonst.data))
                    set_ustuck(null);
            }
            if (mtmp.mhp === oldhp) {
                mhit = false;
                (u.uconduct ||= {}).weaphit = oldweaphit;
            }
            if (mtmp.wormno && mhit) {
                /* C uhitm.c:599 is_blade || is_axe; obj.h:213 is_blade spans
                 * P_DAGGER..P_SABER, and v5 skills.h:32 has P_SABER = 9. */
                const skill = weapon ? sr_oc_skill(weapon.otyp) : 0;
                const sliceOrChop = !!weapon && ((weapon.oclass === WEAPON_CLASS
                    && skill >= 1 /* P_DAGGER */ && skill <= 9 /* P_SABER */)
                    || is_axe_dv(weapon));
                await cutworm(mtmp, game.gb?.bhitpos?.x ?? mtmp.mx,
                    game.gb?.bhitpos?.y ?? mtmp.my, sliceOrChop);
            }
        }
        _wepDestroyed = !!uwepForHit && !(second ? u.uswapwep : u.uwep);

    }

    if (!viaHmonas && (!second || mhit)) {
        const _passMalive = cleaving ? (mtmp.mhp | 0) >= 1 : malive;
        const _passWepGone = cleaving ? !(u && u.uwep) : _wepDestroyed;
        // C uhitm.c:789,811: first swing passes the surviving primary slot;
        // the second swing retains secondwep, even if that weapon was consumed.
        const _deathBeforePassive = game._pendingDeath || null;
        await passive(mtmp, second ? weapon : u.uwep, mhit, _passMalive,
            254 /* AT_WEAP */, _passWepGone);
        /* C uhitm.c:6019-ish passive -> mdamageu -> done() never returns, so no
         * second swing (uhitm.c:794 u.umortality guard) can follow a lethal passive. */
        if (game._pendingDeath && game._pendingDeath !== _deathBeforePassive) {
            await drain_pending_death_in_place();
            if (pending_death_is_final()) { _swingDied = true; return mhit; }
        }
    }
    return mhit;
    }; /* end _swing */

    /* hmonas(mtmp) [uhitm.c:5423-5824] — the Upolyd (polymorphed-hero)
     * multi-attack loop.  For each row of the CURRENT form's mattk[] table
     * (MONS_MATTK[u.umonnum], same table `passive()` above reads for the
     * TARGET), C dispatches on aatyp:
     *   AT_WEAP           -> use_weapon: find_roll_to_hit/dieroll/known_hitum,
     *                        the SAME chain hitum() runs below -- reused here
     *                        via `_swing`.
     *   AT_CLAW/TUCH/KICK/BITE/STNG/BUTT/TENT (the "weaponless:" fallthrough)
     *                        -> find_roll_to_hit(NULL weapon)/dieroll/damageum().
     *   AT_EXPL           -> explum().  AT_ENGL -> gulpum() (own dieroll,
     *                        no `|| u.uswallow` override -- uhitm.c:5744).
     *   AT_HUGS (uhitm.c:5671-5757), AT_MAGC (use_weapon for S_KOBOLD/
     *   S_ORC/S_GNOME forms, else skipped), AT_BREA/AT_SPIT/AT_GAZE (dhit=0,
     *   passive tail) and AT_NONE/AT_BOOM (continue) -- each has its own
     *   arm below.
     * `attknum`/`armorpenalty` (find_roll_to_hit's silver/shop-item checks)
     * and failed_grab feedback remain incomplete; the weaponless bonus
     * damage and silver-ring feedback follow weapon.c:360-468. */
    const _hmonas = async () => {
        // C uhitm.c:5434: shared visibility for the mhitm_ad_* handlers.
        game.v = game.v || {};
        game.v.vis = canseemon(mtmp) || _ac_m_next2u(mtmp);
        const AT_CLAW_H = 1, AT_KICK_H = 3, AT_SPIT_H = 10, AT_ENGL_H = 11,
              AT_BREA_H = 12, AT_EXPL_H = 13, AT_GAZE_H = 15,
              AT_HUGS_H = 7, AT_WEAP_H = 254, AT_MAGC_H = 255;
        // C uhitm.c:5441,5462: count and execute the substituted attacks,
        // including physical lich touches against cold-resistant defenders.
        const _sumHist = Array(NATTK_UH).fill(M_ATTK_MISS);
        const rows = Array.from({ length: NATTK_UH }, (_, i) =>
            getmattk(game.youmonst, false, mtmp, i, _sumHist)
            || { aatyp: 0, adtyp: 0, damn: 0, damd: 0 });
        let odd_claw = true; /* C uhitm.c:5428, 5445-5448, 5470 */
        const multi_weap = rows.slice(0, NATTK_UH).filter(row => row.aatyp === AT_WEAP_H).length;
        let weaponHits = 0;
        const multi_claw = rows.slice(0, NATTK_UH).filter(
            row => [AT_WEAP_H, AT_CLAW_H, 5 /* AT_TUCH */].includes(row.aatyp)).length > 1;
        const _damageum = async (mattk, specialdmg) => {
            const mhm = { damage: d(mattk.damn | 0, mattk.damd | 0),
                          hitflags: M_ATTK_MISS, permdmg: 0,
                          specialdmg: specialdmg | 0, done: false };
            if (is_demon(game.youmonst?.data) && !rn2(13) && !(u && u.uwep)
                && (u?.umonnum | 0) !== PM_AMOROUS_DEMON_UH
                && (u?.umonnum | 0) !== PM_BALROG) {
                await _uh_demonpet();
                return M_ATTK_MISS; /* C uhitm.c:4851 -- mdef untouched */
            }
            await mhitm_adtyping(game.youmonst, mattk, mtmp, mhm);
            if (mhm.done)
                return mhm.hitflags; /* C uhitm.c:4857 */
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITFORU;
            mtmp.mhp = (mtmp.mhp | 0) - (mhm.damage | 0);
            if (DEADMONSTER(mtmp)) {
                /* uhitm.c:4869-4879 — the three message arms, ported: a tame,
                 * out-of-sight kill gets "You feel embarrassed for a
                 * moment.", a non-verbose game gets "You destroy it!", and
                 * the ordinary (visible + verbose) case runs killed(mdef) =
                 * xkilled(mdef, XKILL_GIVEMSG) -- mon.c:3469-3472 -- which
                 * prints "You kill <mon>!" itself.  All three still route
                 * through xkilled for the shared kill sequence (rn2(6)
                 * treasure, corpse_chance, m_detach, ...); the first two
                 * arms only fire it when there is fresh damage this hit
                 * (mhm.damage), matching C's own `if (mhm.damage)` guards --
                 * an already-dead mdef reaching here with no new damage gets
                 * no message and no second kill. */
                if (mattk.aatyp === AT_WEAP_H || mattk.aatyp === AT_CLAW_H) /* AT_WEAP/AT_CLAW; C uhitm.c:4866 */
                    (game.gm ||= {}).mkcorpstat_norevive = mtmp.data.mlet === 46 && u.uwep?.oartifact === 17;
                if ((mtmp.mtame | 0) && !cansee(mtmp.mx | 0, mtmp.my | 0)) {
                    /* C uhitm.c:4870 You_feel("embarrassed for a moment.") —
                     * NOT a bare pline: You_feel (pline.c:387-400) prints
                     * "You dream that you feel ..." while the hero is
                     * Unaware. */
                    await You_feel_uh('embarrassed for a moment.');
                    if (mhm.damage)
                        await xkilled(mtmp, XKILL_NOMSG);
                } else if (!game.flags.verbose) {
                    await You('destroy it!');
                    if (mhm.damage)
                        await xkilled(mtmp, XKILL_NOMSG);
                } else if (mhm.damage) {
                    await xkilled(mtmp, XKILL_GIVEMSG);
                }
                (game.gm ||= {}).mkcorpstat_norevive = false;
                return M_ATTK_DEF_DIED; /* C uhitm.c:4881 */
            }
            return M_ATTK_HIT; /* C uhitm.c:4883 */
        };
        const _passiveAndKnockback = async (aatypRow, mhitRow, weaponRow, sumRow = M_ATTK_MISS) => {
            /* C hmonas: retain every row's sum[i], including explum/gulpum,
             * for getmattk and the later hug/two-handed-weapon checks. */
            _lastRowSum = sumRow;
            /* sum[i] == M_ATTK_DEF_DIED, not DEADMONSTER(): a shapeshifted
             * vampire that "dies" and rises is alive again by now. */
            const diedThisRow = sumRow === M_ATTK_DEF_DIED;
            /* C uhitm.c:5828-5834:
             *     if (sum[i] == M_ATTK_DEF_DIED)
             *         passive(mon, weapon, 1, 0, mattk->aatyp, FALSE);
             *     else
             *         passive(mon, weapon, (sum[i] != M_ATTK_MISS), 1,
             *                 mattk->aatyp, FALSE); */
            await passive(mtmp, weaponRow || null,
                       diedThisRow ? true : !!mhitRow,
                       !diedThisRow, aatypRow | 0, false);
            /* uhitm.c:5833 mhitm_knockback(&youmonst, mon, mattk, &sum[i],
             * weapon_used): TRUE breaks out of the attack loop. */
            if (!kickOnly && await _hero_mhitm_knockback(mtmp, weapon_used ? u.uwep : null,
                                            aatypRow | 0, _curAdtyp, !!(sumRow & M_ATTK_HIT)))
                _knockedBreak = true;
        };
        let _curAdtyp = 0, _knockedBreak = false, _caitiffDone = false;
        let weapon_used = false;
        /* C uhitm.c:5487-5515 — alternating two-weapon mode: `altwep` toggles
         * each use_weapon row so a multi-weapon form alternates uwep and
         * uswapwep.  Returns the swing's weapon and a reader for
         * `*originalweapon` after the hit. */
        let altwep = false;
        const _useWeaponSlot = () => {
            const sw = u.uswapwep, w = u.uwep;
            let slot = (altwep && sw) ? (() => u.uswapwep) : (() => u.uwep);
            if (sw && w && ((w.oclass | 0) === WEAPON_CLASS || is_weptool(w))
                && !bimanual(w) && !u.uarms && !sw.oartifact
                && ((sw.oclass | 0) === WEAPON_CLASS || is_weptool(sw))
                && !(_uh_is_launcher(sw) || _uh_is_ammo(sw) || _uh_is_missile(sw))
                && !bimanual(sw)
                && !(sr_oc_material(sw.otyp) === 14 /* SILVER */ && _hero_hates_silver_uh()))
                altwep = !altwep;
            const weapon = slot() || null;
            /* uhitm.c:5516-5517: no weapon -> gloves get passive erosion */
            if (!weapon)
                slot = () => u.uarmg;
            return { weapon, after: () => slot() || null };
        };
        /* C uhitm.c:5842-5845 passivedone: a cursed uswapwep gets dropped. */
        const _cursedSwapDrop = async (weapon) => {
            if (u.uswapwep && weapon === u.uswapwep && weapon.cursed) {
                await drop_uswapwep();
                return true;
            }
            return false;
        };
        /* C uhitm.c:5540-5561 — the use_weapon tail shared by AT_WEAP and the
         * AT_CLAW use_weapon row: DEF_DIED if killed; the m_at(u.ux+u.dx) worm
         * split exit (null); else damageum(mon, mattk, 0) when dhit and
         * adtyp is neither AD_SPEL nor AD_PHYS. */
        const _weaponRowSum = async (row, dhit) => {
            if (DEADMONSTER(mtmp) || !malive)
                return M_ATTK_DEF_DIED;
            if (m_at(((u.ux | 0) + (u.dx | 0)) | 0, ((u.uy | 0) + (u.dy | 0)) | 0) !== mtmp)
                return null;
            const adtyp = row.adtyp | 0;
            if (dhit && adtyp !== 241 /* AD_SPEL, monattk.h:88 */ && adtyp !== AD_PHYS_UH)
                return await _damageum(row, 0);
            return dhit ? M_ATTK_HIT : M_ATTK_MISS;
        };
        game.s = game.s || {};
        game.s.skipdrin = 0; /* C uhitm.c:5451 */
        /* sum[i - 1] for the use_weapon bimanual test (uhitm.c:5483); only
         * weapon rows record a sum, any other row leaves M_ATTK_MISS. */
        let _lastRowSum = M_ATTK_MISS;
        for (let i = 0; i < NATTK_UH; i++) {
            const _prevRowSum = _lastRowSum;
            _lastRowSum = M_ATTK_MISS;
            _sumHist[i - 1] = _prevRowSum;
            /* uhitm.c:5455-5458 — after the first attack, skip if the target
             * has been knocked out of range or already died. */
            if (i > 0) {
                const _bp = game.gb?.bhitpos;
                if (m_at(_bp?.x | 0, _bp?.y | 0) !== mtmp || DEADMONSTER(mtmp))
                    continue;
            }
            if (_knockedBreak)
                break;
            /* C uhitm.c:5849-5852 loop tail: no extra attacks once the hero
             * is no longer a monster (rehumanize) or has been paralyzed. */
            if (i > 0 && (!Upolyd(u) || (game.multi | 0) < 0))
                break;
            const row = getmattk(game.youmonst, false, mtmp, i, _sumHist)
                || { aatyp: 0, adtyp: 0, damn: 0, damd: 0 };
            const aatyp = row.aatyp | 0;
            _curAdtyp = row.adtyp | 0;
            if (kickOnly && aatyp !== AT_KICK_H)
                continue; /* dokick.c:201 "we only care about kicking attacks" */
            /* C uhitm.c:5559 — a kick can't be made from inside a pit
             * (mtrapped_in_pit(&youmonst), mhitu.c:467-476). */
            if (aatyp === AT_KICK_H && u.utrap && (u.utraptype | 0) === TT_PIT) {
                const _kp = t_at(u.ux, u.uy);
                if (_kp && is_pit(_kp.ttyp))
                    continue;
            }
            if (!_caitiffDone && aatyp !== 0 && aatyp !== AT_BOOM && aatyp !== AT_EXPL_H
                && aatyp !== AT_BREA_H && aatyp !== AT_SPIT_H && aatyp !== AT_GAZE_H) {
                _caitiffDone = true; /* find_roll_to_hit's !(*attk_count)++ */
                check_caitiff(mtmp);
            }
            /* C uhitm.c:5464 */
            if (game.s.skipdrin && aatyp === 16 /* AT_TENT */ && _curAdtyp === 32 /* AD_DRIN */)
                continue;
            if (aatyp === 0 /* AT_NONE */ || aatyp === AT_BOOM)
                continue;
            if (aatyp === AT_BREA_H || aatyp === AT_SPIT_H || aatyp === AT_GAZE_H) {
                /* uhitm.c:5793-5796 — "all done using #monster command":
                 * dhit = 0, no RNG of its own, but (unlike AT_NONE/AT_BOOM's
                 * `continue`) this arm `break`s out of the switch and falls
                 * through to the unconditional passive()/knockback tail. */
                await _passiveAndKnockback(aatyp, false, null);
                continue;
            }
            if (aatyp === AT_EXPL_H) {
                /* C uhitm.c:5762-5767:
                 *     case AT_EXPL:
                 *         dhit = -1;
                 *         wakeup(mon, TRUE);
                 *         You("explode!");
                 *         sum[i] = explum(mon, mattk);
                 *         break;
                 * explum(mon, mattk) [uhitm.c:4890-4928] — its OWN first
                 * draw, unconditional (tmp = d(damn,damd) before the switch).
                 * explum()'s AD_* switch, the You("explode!") topline and
                 * the u.mh=-1/rehumanize() tail (uhitm.c:5822-5823) are all
                 * ported below.
                 * explum() RETURNS M_ATTK_DEF_DIED at uhitm.c:4920 (the
                 * AD_COLD/AD_FIRE/AD_ELEC arm, when the named target died in
                 * explode()) and M_ATTK_HIT at uhitm.c:4927 on EVERY other
                 * path — including AD_BLND, AD_HALU, the default arm, and an
                 * explode() the target survived.  It never returns
                 * M_ATTK_MISS, so this row's sum[i] is never the loop-top
                 * default and passive()'s mhitb argument here is never FALSE.
                 * This call site passed a hardcoded `false` for it.
                 * explode_uh() runs the AD_COLD/AD_FIRE/AD_ELEC arm and the
                 * DEF_DIED return follows DEADMONSTER(mtmp) as C does.
                 * The wakeup(mon, TRUE) at uhitm.c:5764 was absent; it runs
                 * BEFORE explum()'s die, so it has to go first.  wakeup()
                 * (mon.c:4332-4363) is RNG-free for an already-awake hostile
                 * target: its draws are growl()'s hallucination ROLL_FROM
                 * rn2(35) (sounds.c:365, and only when the target WAS
                 * sleeping), and setmangry()'s Elbereth-hypocrite rnd(5) plus
                 * the peaceful-target growl() (mon.c:4290-4318). */
                await wakeup_attack(mtmp, true); /* C uhitm.c:5764 */
                await You('explode!'); /* C uhitm.c:5765 */
                /* explum() [uhitm.c:4890-4928]: tmp = d(damn,damd) first;
                 * AD_COLD/AD_FIRE/AD_ELEC run explode() centred on the hero
                 * AD_BLND/AD_HALU are the flash arms (uhitm.c:4896-4909); then
                 * wake_nearto(u.ux, u.uy, 7*7). */
                const _explTmp = d(row.damn | 0, row.damd | 0);
                let _sumIExpl = M_ATTK_HIT; /* C uhitm.c:4927 */
                const _explAd = row.adtyp | 0;
                let _explDone = false;
                if (_explAd === AD_COLD || _explAd === AD_FIRE || _explAd === AD_ELEC) {
                    await explode_uh(u.ux, u.uy, (_explAd - 1) + 20, _explTmp,
                                     MON_EXPLODE, await adtyp_to_expltype_uh(_explAd));
                    if (DEADMONSTER(mtmp)) {
                        _sumIExpl = M_ATTK_DEF_DIED; /* C uhitm.c:4920 */
                        _explDone = true;
                    }
                } else if (_explAd === AD_BLND_UH) {
                    /* C uhitm.c:4896-4901 AD_BLND: flash blinds the target */
                    if (!resists_blnd(mtmp)) {
                        await pline(`${Monnam(mtmp)} is blinded by your flash of light!`);
                        mtmp.mblinded = Math.min((mtmp.mblinded | 0) + _explTmp, 127);
                        mtmp.mcansee = 0;
                    }
                } else if (_explAd === 36 /* AD_HALU */) {
                    /* C uhitm.c:4902-4909 AD_HALU: flash confuses a seeing target */
                    if (((mtmp.data?.mflags1 | 0) & 0x00001000) === 0 && (mtmp.mcansee | 0)) {
                        await pline(`${Monnam(mtmp)} is affected by your flash of light!`);
                        mtmp.mconf = 1;
                    }
                }
                if (!_explDone)
                    wake_nearto(u.ux, u.uy, 7 * 7); /* C uhitm.c:4926 */
                /* C uhitm.c:5822-5823 `if (dhit == -1) { u.mh = -1;
                 * rehumanize(); }` precedes the passive() tail. */
                u.mh = -1;
                await rehumanize();
                await _passiveAndKnockback(aatyp, _sumIExpl !== M_ATTK_MISS, null, _sumIExpl);
                continue;
            }
            if (aatyp === AT_ENGL_H) {
                _find_roll_to_hit(); /* C uhitm.c:5770, after earlier attacks. */
                /* uhitm.c:5762-5764 */
                const tmp = _tmpBase;
                mon_maybe_unparalyze(mtmp);
                const dieroll = rnd(20 + i);
                const dhit = tmp > dieroll; /* no uswallow override here */
                /* C uhitm.c:5773-5774 `if ((dhit = (tmp > rnd(20 + i)))) {
                 *     wakeup(mon, TRUE);` — the FIRST statement inside the hit
                 * branch, ahead of the shade check, the failed_grab check and
                 * gulpum().  It was absent.  Same RNG profile as the AT_EXPL
                 * call above: nothing for an already-awake hostile target.
                 * NOTE the miss arm's own wake is still a gap — uhitm.c:5792
                 * `missum(mon, mattk, FALSE)` ends in
                 * `if (!helpless(mdef)) wakeup(mdef, TRUE)` (uhitm.c:5212-5213)
                 * and this row has no missum() call at all. */
                if (dhit)
                    await wakeup_attack(mtmp, true);
                const _englAdtyp = row.adtyp | 0;
                const _englUnsolid = !!(mtmp.data
                    && ((mtmp.data.mflags1 | 0) & M1_UNSOLID_UH));
                const _englNotonhead = !!(game.gn && game.gn.notonhead);
                const _grabFailed = dhit && (_englUnsolid || _englNotonhead)
                    && (_englAdtyp === AD_WRAP_UH || _englAdtyp === AD_STCK
                        || _englAdtyp === 26 /* AD_DGST */);
                /* C uhitm.c:5424 `int sum[NATTK]` / 5462 `sum[i] = 0`
                 * (M_ATTK_MISS).  gulpum() [uhitm.c:4957-5195] returns:
                 *   M_ATTK_MISS     4981  !engulf_target()      — ported below
                 *   M_ATTK_HIT      5007  vampshifter reverts
                 *   M_ATTK_MISS     5044  Rider, hero lifesaved — ported below
                 *   M_ATTK_DEF_DIED 5106  the AD_DGST digest tail
                 *   M_ATTK_DEF_DIED 5185  non-digest kill, defender not lifesaved
                 *   M_ATTK_MISS     5194  defender survived and was expelled
                 * Note the LAST row: an engulf that HITS, damages, and does
                 * not kill still returns M_ATTK_MISS, so passive()'s mhitb is
                 * FALSE on the commonest path of all.  This call site used to
                 * pass the landed-hit condition, which is TRUE there. */
                let _sumIEngl = M_ATTK_MISS;
                if (dhit && (mtmp.data.pmidx | 0) === PM_SHADE) {
                    /* C uhitm.c:5775-5777 — the shade arm precedes both the
                     * failed_grab test and gulpum(); sum[i] stays a miss. */
                    await Your('attempt to surround %s is harmless.', mon_nam(mtmp));
                } else if (_grabFailed) {
                    const _verb = _englAdtyp === 26 /* AD_DGST */ ? 'gulp'
                        : _englAdtyp === AD_STCK ? 'adhere' : 'grab';
                    const _nm = !_englNotonhead ? mon_nam(mtmp)
                        : (s_suffix(some_mon_nam(mtmp)) + ' tail');
                    await pline(`Your ${_verb} attempt ${!_englNotonhead ? 'passes right through' : 'fails to hold'} ${_nm}!`);
                } else if (dhit) {
                    /* gulpum(mon, mattk) [uhitm.c:4958-4962] — its own first
                     * draw, unconditional. */
                    let dam = d(row.damn | 0, row.damd | 0);
                    /* C mhitm.c:gulpum() draws dam before engulf_target().
                     * Keep that order, then reject an impossible engulf
                     * without running any of the damage/effect arms. */
                    if (!engulf_target(game.youmonst, mtmp)) {
                        await _passiveAndKnockback(aatyp, false, null);
                        continue;
                    }
                    const adtyp = _englAdtyp;
                    const _udig = digests_gu(u.umonnum | 0), _uenf = enfolds_gu(u.umonnum | 0);
                    const _slow = _hero_resists(54 /* SLOW_DIGESTION */);
                    const _fatal = (sr_touch_petrifies(mtmp.data.pmidx) && !_hero_resists(STONE_RES))
                        || (adtyp === 26 && ([PM_DEATH, PM_FAMINE, PM_PESTILENCE].includes(mtmp.data.pmidx)
                            || (mtmp.data.pmidx === PM_MEDUSA && !_hero_resists(STONE_RES))));
                    if ((_udig && u.uhunger >= 1500) || u.uswallow) {
                        await _passiveAndKnockback(aatyp, false, null);
                        continue;
                    }
                    if (![30, 111, 155, 329].includes(u.umonnum | 0)) /* !flaming, C uhitm.c:4984 */
                        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
                            await snuff_lit(otmp);
                    /* C uhitm.c:4990-5007: revert a vampire before swallowing it. */
                    if (is_vampshifter_deth(mtmp) && await newcham(mtmp, mtmp.cham, 0)) {
                        await You('%s it, then %s it.', _udig ? 'swallow' : _uenf ? 'enclose' : 'engulf',
                            _udig ? 'regurgitate' : _uenf ? 'release' : 'expel');
                        if (canspotmon(mtmp))
                            await pline('It turns into %s.', x_monnam(mtmp, ARTICLE_A, null,
                                SUPPRESS_NAME | SUPPRESS_IT | SUPPRESS_INVISIBLE, false));
                        else map_invisible(mtmp.mx, mtmp.my);
                        await _passiveAndKnockback(aatyp, true, null, M_ATTK_HIT);
                        continue;
                    }
                    /* C uhitm.c:5016-5017: conduct precedes start_engulf(),
                     * including its display changes and swallowing message. */
                    if (adtyp === 26 /* AD_DGST */
                        && (!_slow || _fatal))
                        await eating_conducts(mtmp.data);
                    const rider = [PM_DEATH, PM_FAMINE, PM_PESTILENCE].includes(mtmp.data.pmidx);
                    if (_fatal && !rider) { /* C uhitm.c:5019-5032 */
                        let mnam = pmname(mtmp.data, Mgender(mtmp));
                        if (!(mtmp.data.mflags2 & 0x00080000 /* M2_PNAME */)) mnam = an(mnam);
                        await You('%s %s.', _udig ? 'englut' : 'engulf', mon_nam(mtmp));
                        await instapetrify(`${_udig ? 'swallowing' : _uenf ? 'enclosing' : 'engulfing'} ${mnam}${_udig ? ' whole' : ''}`);
                        await _passiveAndKnockback(aatyp, false, null);
                        continue;
                    }
                    {
                        /* C start_engulf(mdef) uhitm.c:4931: map the hero's square,
                         * flash the hero glyph on the engulfer, then print. */
                        start_engulf(mtmp);
                        await You(`${_udig ? 'swallow' : _uenf ? 'enclose' : 'engulf'} ${mon_nam(mtmp)}${_udig ? ' whole' : ''}!`); /* start_engulf, uhitm.c:4941 */
                    }
                    if (adtyp === 26 && rider) { /* C uhitm.c:5037-5044 */
                        await pline('Unfortunately, digesting any of it is fatal.');
                        end_engulf();
                        ((game.svk ||= {}).killer ||= {}).name = `unwisely tried to eat ${pmname(mtmp.data, Mgender(mtmp))}`;
                        game.svk.killer.format = NO_KILLER_PREFIX;
                        await done(DIED);
                        await _passiveAndKnockback(aatyp, false, null);
                        continue;
                    }
                    if (adtyp === 26 /* AD_DGST */ && (!_slow || _fatal)) {
                        /* Petrification and Rider death are handled above. This
                         * arm's xkilled call is XKILL_NOCORPSE, so it draws
                         * no further RNG here (mon.c:3510-3573 `goto
                         * cleanup` before the treasure-drop rn2(6)).
                         * C returns M_ATTK_DEF_DIED at uhitm.c:5106 on this
                         * arm whether or not the defender was lifesaved; the
                         * two exits that do NOT (Slow_digestion breaks out of
                         * the switch at 5049 and falls to 5194's
                         * M_ATTK_MISS, is_rider returns M_ATTK_MISS at 5044)
                         * are handled outside this ordinary digestion arm. */
                        /* C uhitm.c:5061-5064: gm.mswallower = &youmonst;
                         * xkilled(mdef, XKILL_GIVEMSG | XKILL_NOCORPSE).  The
                         * monster must be DEADMONSTER for passive()'s `malive`
                         * test (uhitm.c:6019 rn2(3)). */
                        const _pmi = mtmp.data && mtmp.data.pmidx != null ? mtmp.data.pmidx | 0 : -1; /* C pd = mdef->data, taken before mondead's new_were() */
                        const lifesaver = mlifesaver(mtmp);
                        if (lifesaver) await m_useup(mtmp, lifesaver);
                        await newuhs(false);
                        (game.gm ||= {}).mswallower = game.youmonst;
                        mtmp.mhp = 0;
                        await xkilled(mtmp, XKILL_GIVEMSG | XKILL_NOCORPSE);
                        /* C uhitm.c:5065-5102: regurgitation or nutrition, and
                         * the nomul digest timer with Finish_digestion as the
                         * afternmv continuation (eat.c:3961). */
                        if (!DEADMONSTER(mtmp)) {
                            await You('hurriedly regurgitate the sizzling in your %s.', body_part(18 /* STOMACH */));
                        } else {
                            let _tmp = 1 + ((MONS_CWT[_pmi] | 0) >> 8); /* uhitm.c:5078 */
                            const _msg = `You totally digest ${mon_nam(mtmp)}.`;
                            if ((await corpse_chance(mtmp, game.youmonst, true)) && !((((_MONS[_pmi]?.[3] | 0) & G_NOCORPSE) | (game.mvitals?.[_pmi]?.mvflags | 0)) & G_NOCORPSE)) {
                                game.u.uhunger = (game.u.uhunger | 0) + ((mons_cnutrit(_pmi) + 1) >> 1); /* uhitm.c:5082 */
                            } else _tmp = 0;
                            if (_tmp !== 0) {
                                await You(`digest ${mon_nam(mtmp)}.`); /* uhitm.c:5091 */
                                if (_hero_resists(54 /* SLOW_DIGESTION */)) _tmp *= 2;
                                nomul(-_tmp); /* uhitm.c:5094 */
                                game.multi_reason = 'digesting something';
                                game.nomovemsg = _msg;
                                game.corpsenm_digested = _pmi; /* uhitm.c:5100 */
                                game.afternmv = 'Finish_digestion'; /* uhitm.c:5101 */
                            } else await pline(_msg);
                            if (_pmi === PM_GREEN_SLIME_UH) {
                                if (_tmp !== 0)
                                    game.nomovemsg = `${The(pmname(permonstTemplate(_pmi), Mgender(mtmp)))} isn't sitting well with you.`;
                                if (!_hero_resists(63 /* UNCHANGING */))
                                    await make_slimed(5, null);
                            } else
                                exercise(A_CON, true);
                        }
                        game.gm.mswallower = null;
                        end_engulf(); /* C uhitm.c:5105 */
                        _sumIEngl = M_ATTK_DEF_DIED; /* C uhitm.c:5106 */
                    } else {
                        const _MRacid = 0x40;
                        const _mrE = (mtmp.data ? (mtmp.data.mresists | 0) : 0)
                            | (mtmp.mextrinsics | 0) | (mtmp.mintrinsics | 0);
                        if (adtyp === 26 /* AD_DGST: Slow_digestion, uhitm.c:5047 */) dam = 0;
                        else if (adtyp === 0 /* AD_PHYS */) {
                            /* uhitm.c:5107-5118 */
                            if ((u.umonnum | 0) === 106 /* PM_FOG_CLOUD */) {
                                await pline(`${Monnam(mtmp)} is laden with your moisture.`);
                                const _pf = (mtmp.data?.mflags1 | 0);
                                const _pi = (mtmp.data?.pmidx | 0);
                                const _flam = _pi === 111 || _pi === 30 || _pi === 155 || _pi === 329; /* flaming() */
                                if ((_pf & (0x400 | 0x200)) !== 0 && !_flam) { /* breathless || amphibious */
                                    dam = 0;
                                    await pline(`${Monnam(mtmp)} seems unharmed.`);
                                }
                            } else
                            await pline(`${Monnam(mtmp)} is ${enfolds_gu(u.umonnum | 0) ? "being squashed" : "pummeled with your debris"}!`);
                        } else if (adtyp === 8 /* AD_ACID */) {
                            await pline(`${Monnam(mtmp)} is covered with your goo!`);
                            if (_mrE & _MRacid) {
                                await pline(`It seems harmless to ${mon_nam(mtmp)}.`);
                                dam = 0;
                            }
                        } else if (adtyp === 11 /* AD_BLND */) {
                            /* uhitm.c:5093-5105 */
                            if (can_blnd(game.youmonst, mtmp, 11, null)) {
                                if (mtmp.mcansee)
                                    await pline(`${Monnam(mtmp)} can't see in there!`);
                                mtmp.mcansee = 0;
                                dam += (mtmp.mblinded | 0);
                                if (dam > 127) dam = 127;
                                mtmp.mblinded = dam;
                            }
                            dam = 0;
                        } else if (adtyp === 6 /* AD_ELEC */) {
                            if (rn2(2)) {
                                await pline(`The air around ${mon_nam(mtmp)} crackles with electricity.`);
                                if (resists_elec(mtmp)) {
                                    await pline(`${Monnam(mtmp)} seems unhurt.`);
                                    dam = 0;
                                }
                                golemeffects(mtmp, AD_ELEC, dam);
                            } else dam = 0;
                        } else if (adtyp === 3 /* AD_COLD */) {
                            if (rn2(2)) {
                                if (resists_cold(mtmp)) {
                                    await pline(`${Monnam(mtmp)} seems mildly chilly.`);
                                    dam = 0;
                                } else
                                    await pline(`${Monnam(mtmp)} is freezing to death!`);
                                golemeffects(mtmp, AD_COLD, dam);
                            } else dam = 0;
                        } else if (adtyp === 2 /* AD_FIRE */) {
                            if (rn2(2)) {
                                if (resists_fire(mtmp)) {
                                    await pline(`${Monnam(mtmp)} seems mildly hot.`);
                                    dam = 0;
                                } else
                                    await pline(`${Monnam(mtmp)} is burning to a crisp!`);
                                golemeffects(mtmp, AD_FIRE, dam);
                            } else dam = 0;
                        } else if (adtyp === 16 /* AD_DREN */) {
                            if (!rn2(4)) xdrainenergym(mtmp, true); /* C uhitm.c:5174-5176 */
                            dam = 0;
                        }
                        end_engulf(); /* C uhitm.c:5111 — unconditional before the damage */
                        mtmp.mhp = (mtmp.mhp | 0) - dam;
                        if (DEADMONSTER(mtmp)) {
                            await xkilled(mtmp, XKILL_GIVEMSG);
                            if (DEADMONSTER(mtmp))
                                _sumIEngl = M_ATTK_DEF_DIED; /* C uhitm.c:5185 */
                        }
                        if (_sumIEngl !== M_ATTK_DEF_DIED) {
                            /* C uhitm.c:5187-5194 expels the survivor */
                            /* expel_verb, uhitm.c:4968-4970 */
                            await You(`${digests_gu(u.umonnum | 0) ? 'regurgitate' : enfolds_gu(u.umonnum | 0) ? 'release' : 'expel'} ${mon_nam(mtmp)}!`);
                            if ((_slow || sr_is_animal(game.youmonst.data)) && _udig)
                                await pline("Obviously, you didn't like %s taste.", s_suffix(mon_nam(mtmp)));
                        }
                    }
                    /* C uhitm.c:5783-5789 — swallowing an undead makes the
                     * hero sick:
                     *     if (sum[i] == M_ATTK_DEF_DIED
                     *         && (mon->data->mlet == S_ZOMBIE
                     *             || mon->data->mlet == S_MUMMY)
                     *         && rn2(5) && !Sick_resistance) {
                     *         You_feel("%ssick.", (Sick) ? "very " : "");
                     *         mdamageu(mon, rnd(8));
                     *     }
                     * Neither draw was present.  C's && short-circuits left to
                     * right, so the ORDER is: sum[i] and the mlet test are
                     * free, then rn2(5), and rnd(8) only if that was nonzero
                     * and the hero is not Sick_resistance.  rnd(8) is the
                     * argument to mdamageu(), so it is drawn AFTER the
                     * You_feel() topline, not before it.
                     * mdamageu() itself is RNG-free (mhitu.c:1902-1927); it is
                     * awaited because its Upolyd arm is rehumanize(), which is
                     * async in this port — and Upolyd is always true here,
                     * hmonas() only runs for a polymorphed hero. */
                    if (_sumIEngl === M_ATTK_DEF_DIED
                        && ((mtmp.data?.mlet | 0) === S_ZOMBIE_UH
                            || (mtmp.data?.mlet | 0) === S_MUMMY_UH)
                        && rn2(5) && !_uh_Sick_resistance()) {
                        await You_feel_uh((_uh_Sick() ? 'very ' : '') + 'sick.');
                        await mdamageu(mtmp, rnd(8));
                    }
                }
                /* C uhitm.c:5791-5793 `} else { missum(mon, mattk, FALSE); }`
                 * — the failed to-hit roll prints "You miss <mon>." (or
                 * "it") and wakes a non-helpless target. */
                if (!dhit)
                    await missum(mtmp, false, row);
                await _passiveAndKnockback(aatyp, _sumIEngl !== M_ATTK_MISS, null, _sumIEngl);
                continue;
            }
            /* C uhitm.c:5796-5802 AT_MAGC: a kobold/orc/gnome form with no
             * weapon row used yet takes `goto use_weapon` (S_KOBOLD 11,
             * S_ORC 15, S_GNOME 33); every other form `continue`s. */
            const _magcWeap = aatyp === AT_MAGC_H && !weapon_used
                && [11, 15, 33].includes(game.youmonst?.data?.mlet | 0);
            if (aatyp === AT_WEAP_H || _magcWeap) {
                odd_claw = !odd_claw;
                /* use_weapon: [uhitm.c:5518-5546] — the SAME known_hitum/
                 * hmon_hitmon chain as hitum(), including the bare-handed
                 * case when uwep is null.  viaHmonas=true: this row's
                 * passive() draw comes from the shared tail below
                 * (_passiveAndKnockback), not from _swing itself — see
                 * _swing's own comment on `viaHmonas`. */
                /* uhitm.c:5483-5486 — after a hit with a two-handed weapon the
                 * next weapon row is skipped. */
                if (weapon_used && _prevRowSum > M_ATTK_MISS
                    && u.uwep && bimanual(u.uwep))
                    continue;
                weapon_used = true;
                const _wsWeap = _useWeaponSlot();
                const _mhitRowWeap = await _swing(_wsWeap.weapon, false, true, false, multi_weap > 1 ? ++weaponHits : 0);
                const _sumWeap = await _weaponRowSum(row, _mhitRowWeap);
                if (_sumWeap === null) {
                    await _cursedSwapDrop(_wsWeap.after());
                    break; /* C i = NATTK; goto passivedone (worm split) */
                }
                _lastRowSum = _sumWeap;
                await _passiveAndKnockback(aatyp, _sumWeap !== M_ATTK_MISS, _wsWeap.after(), _sumWeap);
                if (await _cursedSwapDrop(_wsWeap.after()))
                    break;
                continue;
            }
            if (u.uwep && !weapon_used
                && ((aatyp === AT_CLAW_H && !_uh_cantwield(game.youmonst?.data))
                    || ([AT_CLAW_H, 5 /* AT_TUCH */].includes(aatyp)
                        && game.youmonst?.data?.mlet === S_LICH))) {
                odd_claw = !odd_claw;
                /* C uhitm.c:5548-5555: claws can use a wielded weapon;
                 * falling through to AT_TUCH also allows liches to do so.
                 * Both enter the same use_weapon body as AT_WEAP above. */
                weapon_used = true;
                const _wsClaw = _useWeaponSlot();
                const _mhitRowClaw = await _swing(_wsClaw.weapon, false, true, false, multi_weap > 1 ? ++weaponHits : 0);
                const _sumClaw = await _weaponRowSum(row, _mhitRowClaw);
                if (_sumClaw === null) {
                    await _cursedSwapDrop(_wsClaw.after());
                    break; /* C i = NATTK; goto passivedone (worm split) */
                }
                _lastRowSum = _sumClaw;
                await _passiveAndKnockback(aatyp, _sumClaw !== M_ATTK_MISS, _wsClaw.after(), _sumClaw);
                if (await _cursedSwapDrop(_wsClaw.after()))
                    break;
                continue;
            }
            if (aatyp === AT_HUGS_H) {
                /* C uhitm.c:5671-5757 AT_HUGS. */
                const byhand = (u.umonnum | 0) === PM_ROPE_GOLEM;
                let unconcerned = byhand && !can_be_strangled(mtmp);
                let hugAttack = row;
                const _hugHead = !((mtmp.data.mflags1 | 0) & 0x00008000 /* M1_NOHEAD */);
                if (sticks(mtmp.data) || u.uswallow || game.gn?.notonhead
                    || (byhand && (u.uwep || !_hugHead))) {
                    if (byhand && u.uwep && u.ustuck
                        && !(sticks(u.ustuck.data) || u.uswallow))
                        await uunstick();
                    continue; /* not 'break'; bypass passive */
                }
                await wakeup(mtmp, true);
                const _hugSilver = { value: 0 };
                const _hugSpec = special_dmgval(game.youmonst, mtmp,
                    byhand ? (W_ARMG | W_RINGL | W_RINGR) : (W_ARMC | W_ARM | W_ARMU),
                    _hugSilver);
                /* C uhitm.c:5700-5714: choke-immune targets still take
                 * minimal physical damage.  Copy the attack so subsequent
                 * attacks and the monster's template retain their dice. */
                if (unconcerned) {
                    hugAttack = { ...row, damn: 1, damd: 1 };
                    if (_hugSpec || sr_mindless(mtmp.data)
                        || mtmp.mhp <= 1 + Math.max(u.udaminc | 0, 1))
                        unconcerned = false;
                }
                if ((mtmp.data.pmidx | 0) === PM_SHADE) {
                    const hverb = byhand ? 'grasp' : 'hug';
                    if (_hugSpec) {
                        await You('%s %s%s', hverb, mon_nam(mtmp), exclam(_hugSpec));
                        if (_hugSilver.value && game.flags.verbose)
                            await silver_sears(game.youmonst, mtmp, _hugSilver.value);
                        _lastRowSum = await _damageum(hugAttack, _hugSpec);
                    } else {
                        await Your('%s passes harmlessly through %s.', hverb, mon_nam(mtmp));
                    }
                } else {
                    /* mhitm.c:597 failed_grab(): aatyp is AT_HUGS here */
                    const _hugUnsolid = !!((mtmp.data.mflags1 | 0) & M1_UNSOLID_UH);
                    const _hugTail = !!(game.gn && game.gn.notonhead);
                    if (_hugUnsolid || _hugTail) {
                        const nm = !_hugTail ? mon_nam(mtmp)
                            : (s_suffix(some_mon_nam(mtmp)) + ' tail');
                        await pline(`Your grab attempt ${!_hugTail ? 'passes right through' : 'fails to hold'} ${nm}!`);
                    } else if (mtmp === u.ustuck) {
                        await pline(`${Monnam(mtmp)} is being ${byhand ? 'throttled' : 'crushed'}${unconcerned ? " but doesn't seem concerned" : ''}.`);
                        if (_hugSilver.value && game.flags.verbose)
                            await silver_sears(game.youmonst, mtmp, _hugSilver.value);
                        _lastRowSum = await _damageum(hugAttack, _hugSpec);
                    } else if (i >= 2 && (_sumHist[i - 1] > M_ATTK_MISS)
                               && (_sumHist[i - 2] > M_ATTK_MISS)) {
                        if (u.ustuck && u.ustuck !== mtmp)
                            await uunstick();
                        await You('grab %s!', mon_nam(mtmp));
                        set_ustuck(mtmp);
                        if (_hugSilver.value && game.flags.verbose)
                            await silver_sears(game.youmonst, mtmp, _hugSilver.value);
                        _lastRowSum = await _damageum(hugAttack, _hugSpec);
                    }
                }
                await _passiveAndKnockback(aatyp, _lastRowSum !== M_ATTK_MISS, null, _lastRowSum);
                continue;
            }
            if (aatyp === AT_MAGC_H)
                continue; /* C uhitm.c:5796-5807: the kobold/orc/gnome
                             use_weapon arm is taken above (_magcWeap). */
            /* weaponless: AT_CLAW/AT_TUCH/AT_KICK/AT_BITE/AT_STNG/AT_BUTT/
             * AT_TENT [uhitm.c:5564-5568]. */
            /* C uhitm.c:5566 find_roll_to_hit() runs per attack row, so state
             * changed by an earlier row (a steal making the target flee, etc.)
             * is seen by the next row's to-hit. */
            _find_roll_to_hit();
            let tmp = _tmpBase;
            /* uhitm.c:419-423 — weapon==NULL here, so `if (weapon)
             * tmp += hitval(...)` never fires; `tmp += weapon_hit_bonus(weapon)`
             * still does for AT_CLAW, and AT_KICK gets it only with
             * martial_bonus(). */
            if (aatyp === AT_CLAW_H)
                tmp += await weapon_hit_bonus(null);
            else if (aatyp === AT_KICK_H && _uh_martial_bonus())
                tmp += await weapon_hit_bonus(null);
            mon_maybe_unparalyze(mtmp);
            const dieroll = rnd(20);
            /* C dokick.c:204-214: kick_monster checks special damage and
             * shade immunity even when the kick's to-hit roll would miss.
             * A harmless kick ends the sequence without passive retaliation. */
            const kickSpecial = kickOnly
                ? special_dmgval(game.youmonst, mtmp, W_ARMF, null) : 0;
            if (kickOnly && mtmp.data?.pmidx === PM_SHADE && !kickSpecial) {
                await Your('kick passes harmlessly through %s.', mon_nam(mtmp));
                break;
            }
            const dhit = tmp > dieroll || !!(u && u.uswallow);
            let _sumI = M_ATTK_MISS;
            /* C uhitm.c:5581-5590, the prologue of this arm's `if (dhit)`:
             *     if (!u.uswallow
             *         && (compat = could_seduce(&gy.youmonst, mon, mattk)) != 0) {
             *         You("%s %s %s.",
             *             (mon->mcansee && haseyes(mon->data)) ? "smile at"
             *                                                  : "talk to",
             *             mon_nam(mon),
             *             (compat == 2) ? "engagingly" : "seductively");
             *         /+ doesn't anger it; no wakeup() +/
             *         sum[i] = damageum(mon, mattk, 0);
             *         break;
             *     }
             *     wakeup(mon, TRUE);
             * BOTH halves were missing.  The wakeup() is the RNG-bearing one, and
             * the comment this replaced called it a "wakeup-message" gap,
             * which is wrong.  wakeup() (mon.c:4332-4363) runs growl() when
             * the target was sleeping, setmangry(mtmp, TRUE) always, and —
             * for a formerly peaceful target — ghod_hitsu()/hot_pursuit().
             * Where those draw, precisely:
             *   - growl (sounds.c:329) draws only `ROLL_FROM(h_sounds)` while
             *     Hallucinating; growl_sound() itself is RNG-free;
             *   - setmangry (mon.c:4262) draws rnd(5) on the Elbereth
             *     hypocrite arm, and — for a peaceful, non-tame target —
             *     falls into peacefuls_respond(), which draws rn2(5),
             *     rn2(10), rn2(50)+25, rn2(3), rn2(4), rn2(6), rn2(25)+15;
             *   - ghod_hitsu (priest.c) draws.
             * For an already-awake HOSTILE target none of that fires
             * (setmangry returns at its `if (!mtmp->mpeaceful) return;`), but
             * wakeup still clears msleeping and setmangry still clears
             * STRAT_WAITMASK, which changes what the monster does next turn.
             * wakeup() is already imported in this file and called at four
             * other sites (js/uhitm.js:1605, 1657, 1908, 1983).
             * The could_seduce() guard is ported WITH it rather than after
             * it, because porting wakeup() alone would fire it on the one
             * path where C deliberately does not ("doesn't anger it; no
             * wakeup()") — a new divergence in exchange for the fixed one.
             * could_seduce() (mhitu.c:1933-1979) is RNG-free and already
             * exported from js/mhitu.js, which this file already imports. */
            const _compat = (dhit && !(u && u.uswallow))
                ? (could_seduce(game.youmonst, mtmp, row) | 0) : 0;
            if (_compat !== 0) {
                /* C mondata.h:46 haseyes(ptr) = !(mflags1 & M1_NOEYES),
                 * monflag.h:97 M1_NOEYES 0x00001000. */
                const _seduceEyes = ((mtmp.data?.mflags1 | 0) & 0x00001000) === 0;
                await You('%s %s %s.',
                          ((mtmp.mcansee | 0) && _seduceEyes) ? 'smile at'
                                                              : 'talk to',
                          mon_nam(mtmp),
                          (_compat === 2) ? 'engagingly' : 'seductively');
                _sumI = await _damageum(row, 0);
            } else if (dhit) {
                if (!kickOnly)
                    await wakeup_attack(mtmp, true); /* C uhitm.c:5590 */
                const AT_TUCH_H = 5, AT_BUTT_H = 4, AT_STNG_H = 6,
                      AT_BITE_H = 2, AT_TENT_H = 16;
                let verb;
                switch (aatyp) {
                case AT_CLAW_H:
                case AT_TUCH_H: verb = (aatyp === AT_TUCH_H) ? 'touch' : 'claws'; break;
                case AT_TENT_H: verb = 'tentacles'; break;
                case AT_KICK_H: verb = 'kick'; break;
                case AT_BUTT_H: verb = 'head butt'; break;
                case AT_BITE_H: verb = 'bite'; break;
                case AT_STNG_H: verb = 'sting'; break;
                default: verb = 'hit'; break;
                }
                let armask = 0, specialdmg = 0;
                const silverhit = { value: 0 };
                if (aatyp === AT_CLAW_H || aatyp === AT_TUCH_H) {
                    odd_claw = !odd_claw;
                    armask = W_ARMG | ((odd_claw || !multi_claw) ? W_RINGL : 0)
                        | ((!odd_claw || !multi_claw) ? W_RINGR : 0);
                } else if (aatyp === AT_KICK_H) armask = W_ARMF;
                else if (aatyp === AT_BUTT_H) armask = W_ARMH;
                if (armask) specialdmg = kickOnly ? kickSpecial
                    : special_dmgval(game.youmonst, mtmp, armask, silverhit);
                const isShade = !!(mtmp.data && (mtmp.data.pmidx | 0) === PM_SHADE);
                if (isShade && !specialdmg) {
                    if (verb === 'hit'
                        || (aatyp === AT_CLAW_H
                            && !!(mtmp.data && ((mtmp.data.mflags1 | 0) & M1_HUMANOID_UH))))
                        verb = 'attack';
                    await Your('%s %s harmlessly through %s.', verb, vtense(verb, 'pass'),
                         mon_nam(mtmp));
                    /* dokick.c:213-216 -- the kick loop breaks here: no
                     * passive() for a shade, no further kicks. */
                    if (kickOnly)
                        break;
                } else {
                    const adtyp = row.adtyp | 0;
                    const isUnsolid = !!(mtmp.data
                        && ((mtmp.data.mflags1 | 0) & M1_UNSOLID_UH));
                    const notonhead = !!(game.gn && game.gn.notonhead);
                    const grabFailed = (isUnsolid || notonhead)
                        && (adtyp === AD_WRAP_UH || adtyp === AD_STCK
                            || adtyp === 26 /* AD_DGST */);
                    if (!grabFailed) {
                        if (aatyp === AT_TENT_H) {
                            await Your('tentacles suck %s.', mon_nam(mtmp));
                        } else {
                            if (aatyp === AT_CLAW_H)
                                verb = 'hit';
                            await You('%s %s.', verb, mon_nam(mtmp));
                            if (silverhit.value && game.flags.verbose)
                                await silver_sears(game.youmonst, mtmp, silverhit.value);
                        }
                        _sumI = await _damageum(row, specialdmg);
                    } else {
                        const grabVerb = adtyp === 26 ? 'gulp'
                            : adtyp === AD_STCK ? 'adhere' : 'grab';
                        const grabNm = !notonhead ? mon_nam(mtmp)
                            : (s_suffix(some_mon_nam(mtmp)) + ' tail');
                        await pline(`Your ${grabVerb} attempt `
                            + `${!notonhead ? 'passes right through' : 'fails to hold'} `
                            + `${grabNm}!`);
                    }
                }
            } else {
                /* C uhitm.c:5667-5668 `else { !dhit: missum(mon, mattk,
                 * (tmp + armorpenalty > dieroll)); }` — armorpenalty is 0
                 * here (find_roll_to_hit sets it only for !Upolyd Monks). */
                await missum(mtmp, tmp + _armorpenalty > dieroll, row);
            }
            _lastRowSum = _sumI; /* C sum[i], read by AT_HUGS / use_weapon */
            await _passiveAndKnockback(aatyp, _sumI !== M_ATTK_MISS, null, _sumI);
        }
        game.v.vis = false; /* C uhitm.c:5856 hmonas cleanup. */
    };

    /* C uhitm.c:556-563 — a leprechaun may dodge: `mdat->mlet == S_LEPRECHAUN
     * && !mfrozen && !helpless && !mconf && mcansee && !rn2(7) &&
     * (m_move(mtmp, 0) == MMOVE_DIED || it moved)` -> "You miss wildly and
     * stumble forwards." and do_attack returns FALSE.  The rn2(7) comes
     * before the to-hit roll. */
    if (mtmp.data && (mtmp.data.mlet | 0) === 12 /* S_LEPRECHAUN */
        && !(mtmp.mfrozen | 0) && !helpless(mtmp)
        && !(mtmp.mconf | 0) && (mtmp.mcansee | 0) && !rn2(7)
        && (((await m_move(mtmp, 0)) | 0) === 2 /* MMOVE_DIED */
            || (mtmp.mx | 0) !== ((u.ux | 0) + (u.dx | 0))
            || (mtmp.my | 0) !== ((u.uy | 0) + (u.dy | 0)))) {
        await You('miss wildly and stumble forwards.');
        return false;
    }

    if (Upolyd(u)) {
        await _hmonas();
    } else hitum: {
        const _twohits = (u && u.uwep) ? (u.twoweap ? 1 : 0) : (double_punch() ? 1 : 0);
        /* C hitum: `x = u.ux + u.dx, y = u.uy + u.dy` — the attacked square,
         * used to check the monster is still there before the second swing. */
        const _atkx = (u.ux | 0) + (u.dx | 0), _atky = (u.uy | 0) + (u.dy | 0);

        /* C uhitm.c:758-760 hitum(): Cleaver attacks three spots, cannot be
         * part of dual-wielding; hitum_cleave() (uhitm.c:651-722). */
        if (u && u.uwep && (u.uwep.oartifact | 0) === 4 /* ART_CLEAVER */
            && !u.twoweap && !u.uswallow && !u.ustuck
            && (u.umonnum | 0) !== 116 /* NODIAG: PM_GRID_BUG */) {
            const i0 = xdir.findIndex((xd, k) => k < 8 && xd === (u.dx | 0)
                                                && ydir[k] === (u.dy | 0));
            if (i0 >= 0) {
                const target = mtmp;
                let i = _cleave_clockwise ? (i0 + 6) % 8 : (i0 + 2) % 8;
                const umort = u.umortality | 0;
                const save_bhitpos = game.gb.bhitpos;
                const save_notonhead = game.gn.notonhead;
                for (let count = 3; count > 0; --count) {
                    i = _cleave_clockwise ? (i + 1) % 8 : (i + 7) % 8;
                    const tx = (u.ux | 0) + xdir[i], ty = (u.uy | 0) + ydir[i];
                    if (!isok(tx, ty)) continue;
                    const m = m_at(tx, ty);
                    if (!m) {
                        if (glyph_is_invisible_at(tx, ty)) unmap_invisible(tx, ty);
                        continue;
                    }
                    mtmp = m;
                    check_caitiff(mtmp);
                    _find_roll_to_hit();
                    game.gb.bhitpos = { x: tx, y: ty };
                    game.gn.notonhead = ((mtmp.mx | 0) !== tx || (mtmp.my | 0) !== ty);
                    /* C hitum_cleave passes !DEADMONSTER(mtmp) of THIS target to
                     * passive() (uhitm.c:710); malive is shared, so reset it or a
                     * prior target's kill suppresses passive()'s rn2(3). */
                    malive = true;
                    await _swing(u.uwep, false, false, true);
                    if (!u.uwep || game.multi < 0 || (u.umortality | 0) > umort)
                        break;
                }
                _cleave_clockwise = !_cleave_clockwise;
                game.gb.bhitpos = save_bhitpos;
                game.gn.notonhead = save_notonhead;
                mtmp = target; /* do_attack still owns its original target. */
                break hitum; /* C hitum returns to do_attack's cleanup. */
            }
        }
        /* C find_roll_to_hit: once per hitum, after leprechaun evasion. */
        check_caitiff(mtmp);
        const _oldumort = u.umortality | 0; /* C hitum oldumort */
        const _secondwep = (u && u.twoweap) ? (u.uswapwep || null) : null;
        await _swing(u && u.uwep, false, false, false, _twohits);

        /* C uhitm.c:794-814 — the second swing.  C's full guard is
         *   !(go.override_confirmation || gm.multi < 0 || u.umortality > oldumort
         *     || !malive || m_at(x, y) != mon)
         * Stormbringer's forced attack never uses the secondary weapon. */
        if (_twohits && !game.go?.override_confirmation && malive && !_swingDied && game.multi >= 0 && (u.umortality | 0) <= _oldumort && m_at(_atkx, _atky) === mtmp) {
            /* C uhitm.c:798 re-runs find_roll_to_hit: the first hit may have
             * set mflee/mstun (abuse_dog, knockback), changing tmp. */
            _find_roll_to_hit();
            await _swing(_secondwep, true, false, false, 2);
        }
    }
    mtmp.mstrategy = (mtmp.mstrategy | 0) & ~_AC_STRAT_WAITMASK;

    /* C uhitm.c:570-581 atk_done — an F-fight at a monster the hero cannot
     * spot leaves the 'I' marker AFTER the blow (attack_checks skips it for
     * forcefight, uhitm.c:201-214), unless the monster died. */
    /* A lethal passive() runs done() IN PLACE (uhitm.c:700-ish): a final death never
     * returns, a declined one (wizard 'Die? n') resumes at atk_done. */
    if (game._pendingDeath) {
        await drain_pending_death_in_place();
        if (pending_death_is_final()) return true;
    }
    /* C uhitm.c:578 tests levl[].glyph (hero memory), not glyph_at().
     * under_water() can blank the painted 'I' while memory still holds it;
     * do not paint it again in that case.  The early atk_done paths do likewise. */
    if (game.context?.forcefight && (mtmp.mhp | 0) > 0 && !canspotmon(mtmp)
        && game.level.at((game.u.ux | 0) + (game.u.dx | 0), (game.u.uy | 0) + (game.u.dy | 0))?.remembered_glyph?.cls !== GLYPHCLS_INVIS
        && !((game.u.uswallow | 0) && game.u.ustuck === mtmp))
        map_invisible((game.u.ux | 0) + (game.u.dx | 0), (game.u.uy | 0) + (game.u.dy | 0));

    return true; /* attack happened (C returns TRUE from do_attack) */
}

/* C uhitm.c:735-753 double_punch() — "returns True if hero is fighting without
 * a weapon and without a shield and has sufficient skill in bare-handed/martial
 * arts to attack twice".  NOT RNG-free: the rn2(5) is drawn whenever the hero
 * is unarmed, unshielded and above P_BASIC, so omitting it would desynchronise
 * the stream for a skilled martial artist. */
function double_punch() {
    const u = game.u || {};
    const skl_lvl = P_SKILL(P_BARE_HANDED_COMBAT);
    if (!u.uwep && !u.uarms && skl_lvl > P_BASIC)
        return (skl_lvl - P_BASIC) > rn2(5);
    return false;
}
const NORMAL_SPEED_UH = 12;   /* C monmove.h NORMAL_SPEED */
const AT_BUTT_UH = 4, AT_BREA_UH = 12, AT_WEAP_UH = 254, AT_MAGC_UH = 255; /* monattk.h */
const AD_PHYS_UH = 0, AD_BLND_UH = 11, AD_DRLI_UH = 15, AD_STON_UH = 18,
      AD_SLIM_UH = 40, AD_WRAP_UH = 28;                   /* monattk.h */
const S_EEL_UH = 57;          /* C monsym.h S_EEL */

export { more_experienced };



/* XKILL flags (mon.h). */
import { XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT } from './const.js';
export { XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT };


/* C ref: uhitm.c:1962 first_weapon_hit(weapon) — the chronicle entry for
 * breaking never-hit-with-a-wielded-weapon conduct.  C deliberately avoids
 * xname() here ("we don't want player-supplied <foo> in livelog"):
 *     buf = (weapon->cursed && weapon->bknown ? "cursed " : "")
 *           + (obj_is_pname(weapon) ? ONAME(weapon) : simpleonames(weapon))
 *     [+ " named <bare_artifactname>" when oartifact && dknown]
 *     livelog_printf(LL_CONDUCT,
 *                    "hit with a wielded weapon (%s) for the first time", buf);
 * The artifact tail is display/livelog-only and RNG-free. */
const _LL_CONDUCT_UHITM = 0x0020; /* const.js:749 */
/* joust — C uhitm.c:2095-2122: hit with a lance while mounted.
 *   1: joust hit; 0: ordinary hit; -1: joust but break lance */
function joust(mon, obj) {
    const u = game.u;
    const pr = (p) => ((u.uprops?.[p]?.intrinsic | 0) || (u.uprops?.[p]?.extrinsic | 0));
    if (pr(FUMBLING_UH) || (u.uprops?.[STUNNED]?.intrinsic | 0))
        return 0;
    if (obj !== u.uwep && (obj !== u.uswapwep || !u.twoweap))
        return 0;
    if (u.utrap)
        return 0;
    let skill_rating = P_SKILL(weapon_type(obj));
    if (u.twoweap && P_SKILL(P_TWO_WEAPON_COMBAT) < skill_rating)
        skill_rating = P_SKILL(P_TWO_WEAPON_COMBAT);
    if (skill_rating === P_ISRESTRICTED)
        skill_rating = P_UNSKILLED;
    const joust_dieroll = rn2(5);
    if (joust_dieroll < skill_rating) {
        if (joust_dieroll === 0 && rnl(50) === (50 - 1)
            && !(((mon.data?.mflags1 | 0) & M1_UNSOLID_UH) !== 0)
            && !obj_resists(obj, 0, 100))
            return -1;
        return 1;
    }
    return 0;
}

export function first_weapon_hit(weapon) {
    let buf = '';
    if (weapon.cursed && weapon.bknown)
        buf += 'cursed ';
    let pname;
    try {
        pname = obj_is_pname(weapon);
    } catch {
        pname = false;
    }
    if (pname) {
        buf += weapon.oextra.oname; /* ONAME(weapon) */
    } else {
        buf += simpleonames(weapon);
        /* C uhitm.c:1976-1978 — only the not-fully-IDed arm names it. */
        if ((weapon.oartifact | 0) && weapon.dknown)
            buf += ` named ${bare_artifactname(weapon)}`;
    }
    livelog_printf(_LL_CONDUCT_UHITM,
                   'hit with a wielded weapon (%s) for the first time', buf);
}

/* C defsym.h:339,359 MONSYM rows — permonst.mlet values corpse_chance tests. */
import { S_LICH } from './makemon.js';
import { S_GOLEM } from './dogmove.js';
/* C defsym.h:340,355 MONSYM rows — hmonas's AT_ENGL sickness arm
 * (uhitm.c:5784-5785) tests these two. */
const S_MUMMY_UH = 39;
const S_ZOMBIE_UH = 52;

/* C youprop.h:69 Sick_resistance
 *     (HSick_resistance || ESick_resistance || defended(&gy.youmonst, AD_DISE))
 * defended() in this file is the shared stub that returns FALSE, so the third
 * disjunct is inert here — it is written out anyway so the day the stub gets a
 * body this reader picks it up, the way resists_drli_deth above already does. */
function _uh_Sick_resistance() {
    const sp = game.u?.uprops?.[SICK_RES];
    return !!((sp?.intrinsic | 0) || (sp?.extrinsic | 0))
           || defended(game.youmonst, 33 /* AD_DISE, monattk.h:75 */);
}
/* C youprop.h:108 Sick = u.uprops[SICK].intrinsic — the "very sick" prefix. */
function _uh_Sick() {
    return !!(game.u?.uprops?.[SICK]?.intrinsic | 0);
}
/* Canonical youprop readers for the remaining combat message guards. */
function _uh_Blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
function _uh_Deaf() {
    const p = game.u?.uprops?.[DEAF];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)
              || (game.u?.HDeaf | 0)
              || (game.u?.uroleplay?.deaf ? 1 : 0));
}


async function _uh_dealloc_and_bump(otmp) {
    /* C mkobj.c delobj_core -> shk.c obfree: Has_contents -> delete_contents
     * before dealloc_obj (a random drop may be a chest/box with contents). */
    let n = 1;
    const count = (o) => { for (let c = o.cobj; c; c = c.nobj) { n++; count(c); } };
    count(otmp);
    if (otmp.cobj)
        await delete_contents(otmp);
    await dealloc_obj(otmp);
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + n);
}



function _xk_hallu() {
    const u = game.u;
    if (!u) return false;
    const hh = (u.uprops?.[HALLUC]?.intrinsic | 0);
    const hr = u.uprops?.[HALLUC_RES];
    const res = ((hr?.intrinsic | 0) || (hr?.extrinsic | 0));
    return !!hh && !res;
}


/* C ref: hack.c m_at(x, y) — find monster at position by walking fmon chain.
 * C invariant: dead monsters (mhp <= 0) are removed from fmon by m_detach()
 * before the next call to m_at.  JS stub skips dead monsters to preserve this
 * invariant when mattackm_rng_stub kills a monster without full m_detach. */
export function m_at(x, y) {
    /* C ref: rm.h:534 m_at(x,y) reads svl.level.monsters[x][y] — the MAP GRID,
     * not the fmon chain.  A mounted steed is deliberately absent from that grid
     * (steed.c:380 remove_monster) while staying on fmon with its <mx,my>
     * tracking the hero's square (mon.c:272-277 asserts exactly that pair of
     * invariants).  This port has no separate grid, so the same statement is
     * made here: the steed is not AT anywhere. */
    const steed = game.u ? game.u.usteed : null;
    for (let m = game.fmon; m; m = m.nmon) {
        if (m === steed || m._mapRemoved)
            continue;
        /* `(m.mhp|0) > 0 || m._dyingInGrid` — a monster inside mondead()'s
         * mhp=0 → m_detach window is still in C's grid (mon.c:3093→3174), so
         * m_at must return it: makemon()'s MON_AT guard and enexto placement
         * reject its square exactly as C does (see js/mklev.js mondead). */
        if (((m.mhp | 0) > 0 || m._dyingInGrid) && m.mx === x && m.my === y)
            return m;
    }
    return worm_seg_at(x, y);
}







/* shade_glare(obj) — C ref: artifact.c:555-571.
 * Decide whether this obj is effective when attacking against shades; does
 * not consider the bonus for blessed objects versus undead.
 *   1. any silver object is effective                       -> TRUE
 *   2. non-silver artifacts with SPFX_DFLAG2 && mtype == M2_UNDEAD -> TRUE
 *   3. otherwise harmless to shades                         -> FALSE */
const SHADE_GLARE_SILVER_MAT = 14; /* objclass.h:20 enum obj_material_types */


/* C skills.h P_AXE (js/const.js:2664). */
const P_AXE_DV = 3;
/* C obj.h:217 is_axe(otmp). */
function is_axe_dv(otmp) {
    if (!otmp)
        return false;
    const oclass = otmp.oclass | 0;
    if (oclass !== WEAPON_CLASS && oclass !== TOOL_CLASS)
        return false;
    return sr_oc_skill(otmp.otyp | 0) === P_AXE_DV;
}

/* dmgval(otmp, mon) — weapon/object damage value vs. a monster.
 * C ref: weapon.c:216-356 dmgval().
 * Computes the effective damage that an object/weapon does when used against
 * a specific monster, accounting for:
 * - Base damage die (oc_wsdam for small/normal monsters, oc_wldam for large)
 * - Weapon enchantment (spe)
 * - Thickness/material resistance (thick_skinned, shade_glare)
 * - Heavy iron ball weight bonus
 * - Blessed/silver/artifact/light bonuses
 * - Erosion penalties
 * Returns integer damage value >= 1 (if tmp > 0 after penalties). */
/* C uhitm.c:1341-1362, the "default" arm of hmon_hitmon_misc_obj — a
 * hand-to-hand hit with an object that is neither a weapon (WEAPON_CLASS),
 * a weptool, nor a gem (GEM_CLASS): a wielded tool, a crystal ball, a bag,
 * etc., after the object-specific cases have been handled above.
 * Wet towel damage and deferred drying follow uhitm.c:1360-1373. */
function _uh_misc_obj_dmg(obj, mon, hmd) {
    const VEGGY_UH = 3, PAPER_UH = 5, SILVER_UH = 14;
    const SPBOOK_CLASS_UH = 10;
    const otyp = obj.otyp | 0;
    const material = (otyp >= 0 && otyp < MKOBJ_OC_MATERIAL.length)
        ? (MKOBJ_OC_MATERIAL[otyp] | 0) : 0;
    if ((material === VEGGY_UH || material === PAPER_UH)
        && (obj.oclass | 0) !== SPBOOK_CLASS_UH) {
        /* vegetables/paper aren't rigid enough to do damage */
        return 0;
    }
    // C uhitm.c:1354 uses the object's current weight (including glob growth).
    const owt = obj.owt | 0;
    let dmg = Math.trunc((owt + 99) / 100);
    dmg = (dmg <= 1) ? 1 : rnd(dmg);
    if (dmg > 6) dmg = 6;
    // C uhitm.c:1360-1373: wetness adds damage before its own roll.
    if (otyp === OTYP_TOWEL_HV && (obj.spe | 0) > 0) {
        dmg += obj.spe * (mon.data?.pmidx === PM_IRON_GOLEM ? 2 : 1);
        dmg = rnd(dmg);
        hmd.dryit = rn2((obj.spe | 0) + 1) > 0;
    }
    if (material === SILVER_UH && mon_hates_silver(mon)) {
        dmg += rnd(20);
    }
    if (obj.blessed && mon_hates_blessings(mon)) {
        dmg += rnd(4);
    }
    return dmg;
}












/* W_WEP bitmask for owornmask (obj.h). */
const W_WEP = 0x100;
/* HAND body part constant (bodyparts.h). */


/* artifact_light(obj) — C ref: artifact.c:2263-2276.  The file-local body that
 * used to sit here was `return false;`, i.e. a SHADOW that silently disabled
 * both of this file's call sites: setmnotwielded()'s "stops shining" arm
 * (weapon.c:1812) and dmgval()'s rnd(8) light bonus (weapon.c:333).  The real
 * exported body is js/light.js:375 and is imported at the top of this file. */

/* end_burn — real body imported from js/timeout.js (C ref: timeout.c:1804);
 * this file's local copy was a no-op stub silently swallowing
 * setmnotwielded()'s "stops shining" light-source teardown (weapon.c:1812). */


/* C ref: hacklib.c:343-359 s_suffix — imported from js/hacklib.js.
 * This was a "stub (unported helper)" carrying only the LAST of C's four arms
 * (`str + "'s"`), which is wrong for every subject already ending in 's — and
 * the call sites here are exactly that shape: "%s weapons" at :4305 and
 * "%s hissing!" at :4883 both take a plural mon_nam().  The C ref it cited
 * (objnam.c) was wrong too; s_suffix is hacklib.c's. */

/* can_blnd is the real mhitm.c:1214 body imported from js/mhitm.js; the former
 * local stub wrongly refused already-blind defenders (C only checks
 * mon_perma_blind) and ignored aatyp. */

/* Your1(msg) — C ref: mhitu.c */
function Your1(msg) {
    pline("Your " + msg);
}

/* BlindedTimeout() — returns current blinded timeout.
 * C ref: (Blinded & TIMEOUT) */
function BlindedTimeout() {
    if (game.u && game.u.uprops && game.u.uprops[BLINDED])
        return (game.u.uprops[BLINDED].intrinsic & TIMEOUT);
    return 0;
}

/* C polyself.c:1972-2140 mbodypart — imported from cmd.js (polyself.js). */

/* otense() is imported from js/objnam.js (the real objnam.c:2756 body).
 * It used to be a file-local `return verb + "s"` stub here, which is right only
 * by accident for the two verbs it was handed: "stop" -> "stops" matches, but
 * uhitm.js:3339's otense(mw_tmp, "are") produced "ares welded to ..." where C
 * prints "is welded to ..." (vtense collapses a singular "are" to "is").
 * Known shadowing class: a file-local stub shadowing a landed port. */




export function sr_oc_material(otyp) { return MKOBJ_OC_MATERIAL[otyp | 0] | 0; }
function sr_oc_skill(otyp) { return MKOBJ_OC_SKILL[otyp | 0] | 0; }
function sr_mindless(data)     { return ((data.mflags1 | 0) & SR_M1_MINDLESS) !== 0; }
function sr_is_animal(data)    { return ((data.mflags1 | 0) & SR_M1_ANIMAL) !== 0; }
/* mondata.h:touch_petrifies(ptr): cockatrice or chickatrice. */
function sr_touch_petrifies(corpsenm) {
    return corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;
}
function sr_MON_WEP(mtmp) {
    for (let o = mtmp.minvent; o; o = o.nobj)
        if (((o.owornmask | 0) & SR_W_WEP) !== 0)
            return o;
    return null;
}



/* objects.h bi=1 also covers every polearm but the lance (SR_BIMANUAL). */
function sh_oc_bimanual(otyp) { return SH_BIMANUAL.has(otyp | 0) || SR_BIMANUAL.has(otyp | 0); }
function sh_resists_ston(mtmp) { return resists_ston_real(mtmp); }

const OCLASS_WEAPON_SH = 2; /* objclass.h WEAPON_CLASS */



function mhitm_mgc_atk_negated(magr, mdef, verbosely) {
    /* C uhitm.c:83-84 — mcan doesn't apply to youmonst; hero can't be
     * cancelled, so this arm draws NO RNG (short-circuits before armpro). */
    if (magr !== game.youmonst && magr.mcan)
        return true;
    const armpro = magic_negation(mdef);
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        /* C uhitm.c:88-93 — display-only, RNG-free. */
        if (verbosely) {
            if (mdef === game.youmonst)
                You('avoid harm.');
            else if (game.v?.vis && canseemon(mdef))
                pline_mon(mdef, '%s avoids harm.', Monnam(mdef));
        }
        return true;
    }
    return false;
}

export async function mhitm_ad_stck(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false);
    const pd = mdef.data;
    const barbs = (magr.data_mndx === PM_BARBED_DEVIL);

    if (magr === game.youmonst) {
        /* uhitm */
        if (!negated && !sticks(pd) && _ac_m_next2u(mdef)) {
            set_ustuck(mdef); /* it's now stuck to you */
            if (barbs)
                Your("barbs stick to %s!", y_monnam(mdef));
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!negated && !game.u.ustuck && !sticks(pd)) {
            set_ustuck(magr);
            if (barbs)
                pline("The barbs stick to you!");
        }
    } else {
        /* mhitm */
        if (negated)
            mhm.damage = 0;
    }
}

export const AD_PLYS = 14;
const AD_SLEE = 4;
const AD_STCK = 19;
const AD_LEGS = 17;
const AD_HEAL = 27;
export const AD_ENCH = 41;

const LOW_BOOTS = 163;  /* objects.h:701; was 7 = GENERIC_FOOD */
const IRON_SHOES = 164; /* objects.h:703; was 8 = GENERIC_POTION */
/* monflag.h:85 M1_FLY = 0x00000001 (0x00000004 is M1_AMORPHOUS). */
const M1_FLY = 0x00000001;
/* monst.h:175 STRAT_WAITFORU = 0x20000000 and monst.h:80 M_SEEN_SLEEP = 0x0008
 * both come from const.js now — the local copies here held 0x02 and 0x0001. */
const AD_BLND = 11;

export function mhitm_ad_blnd(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        if (can_blnd(magr, mdef, mattk.aatyp, null)) {
            if (!_uh_Blind() && mdef.mcansee)
                pline(Monnam(mdef) + " is blinded.");
            mdef.mcansee = 0;
            mhm.damage += (mdef.mblinded | 0);
            if (mhm.damage > 127)
                mhm.damage = 127;
            mdef.mblinded = mhm.damage;
        }
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if (can_blnd(magr, mdef, mattk.aatyp, null)) {
            let was_blind = (BlindedTimeout() !== 0);
            if (!was_blind)
                pline(Monnam(magr) + " blinds you!");
            make_blinded(BlindedTimeout() + mhm.damage, false);
            if (!was_blind && game.disp)
                game.disp.botl = 1;
            if (!_uh_Blind()) /* => Eyes of the Overworld */
                Your1("vision quickly clears.");
        }
        mhm.damage = 0;
    } else {
        /* mhitm */
        if (can_blnd(magr, mdef, mattk.aatyp, null)) {
            let rnd_tmp;

            if (game.v?.vis && mdef.mcansee && canspotmon(mdef)) {
                let buf = Monnam(mdef) + " is blinded";
                if (mdef.data && mdef.data.pmidx === PM_ARCHON && canseemon(mdef))
                    buf += " by " + s_suffix(mon_nam(magr)) + " radiance";
                pline(buf + ".");
            }
            rnd_tmp = d(mattk.damn, mattk.damd);
            if ((rnd_tmp += (mdef.mblinded | 0)) > 127)
                rnd_tmp = 127;
            mdef.mblinded = rnd_tmp;
            mdef.mcansee = 0;
            mdef.mstrategy &= ~STRAT_WAITFORU;
        }
        if (mhm)
            mhm.damage = 0;
    }
}

export async function mhitm_ad_plys(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        if (!rn2(3) && mhm.damage < mdef.mhp
            && !mhitm_mgc_atk_negated(magr, mdef, true)) {
            if (!_uh_Blind())
                pline("%s is frozen by you!", Monnam(mdef));
            paralyze_monst(mdef, rnd(10));
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (game.multi >= 0 && !rn2(3)
            && !mhitm_mgc_atk_negated(magr, mdef, true)) {
            /* youprop.h:383 — Free_action is the EXTRINSIC slot only. */
            if ((game.u?.uprops?.[FREE_ACTION]?.extrinsic | 0) || game.Free_action) {
                You("momentarily stiffen.");
            } else {
                if (_uh_Blind())
                    You("are frozen!");
                else
                    You("are frozen by %s!", mon_nam(magr));
                game.nomovemsg = "You can move again.";
                nomul(-rnd(10));
                dynamic_multi_reason(magr, "paralyzed", false);
                exercise(A_DEX, false);
            }
        }
    } else {
        /* mhitm */
        if (mdef.mcanmove && !rn2(3)
            && !mhitm_mgc_atk_negated(magr, mdef, true)) {
            if (game.v?.vis && canspotmon(mdef)) {
                let buf = Monnam(mdef);
                pline("%s is frozen by %s.", buf, mon_nam(magr));
            }
            paralyze_monst(mdef, rnd(10));
        }
    }
}

export async function mhitm_ad_slee(magr, mattk, mdef, mhm) {

    if (magr === game.youmonst) {
        /* uhitm */
        if (!mdef.msleeping && !mhitm_mgc_atk_negated(magr, mdef, false)
            && await sleep_monst(mdef, rnd(10), -1)) {
            if (!_uh_Blind())
                pline("%s is put to sleep by you!", Monnam(mdef));
            await slept_monst(mdef);
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (game.multi >= 0 && !rn2(5)
            && !mhitm_mgc_atk_negated(magr, mdef, true)) {
            if (_hero_resists_compat(SLEEP_RES, 'Sleep_resistance')) {
                monstseesu(M_SEEN_SLEEP);
                return;
            }
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-rnd(10), true);
            if (_uh_Blind())
                You("are put to sleep!");
            else
                You("are put to sleep by %s!", mon_nam(magr));
        }
    } else {
        /* mhitm */
        if (!mdef.msleeping && await sleep_monst(mdef, rnd(10), -1)
            && await sleep_monst(mdef, rnd(10), -1)) {
            if (game.v?.vis && canspotmon(mdef)) {
                let buf = Monnam(mdef);
                pline("%s is put to sleep by %s.", buf, mon_nam(magr));
            }
            mdef.mstrategy &= ~STRAT_WAITFORU;
            await slept_monst(mdef);
        }
    }
}

export const AD_STON = 18;
const AD_SLOW = 13;
const NEW_MOON = 0;

/* mhitm_ad_slow — slow down the defender.
 * Port of nethack-c/src/uhitm.c:mhitm_ad_slow. */
export async function mhitm_ad_slow(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false);

    if (defended(mdef, AD_SLOW))
        return;

    if (magr === game.youmonst) {
        /* uhitm */
        if (!negated && mdef.mspeed !== MSLOW) {
            const oldspeed = mdef.mspeed;

            mon_adjust_speed(mdef, -1, null);
            if (mdef.mspeed !== oldspeed && canseemon(mdef))
                pline("%s slows down.", Monnam(mdef));
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        /* C: HFast is u.uprops[FAST].intrinsic (youprop.h:375) */
        if (!negated && (game.u?.uprops?.[FAST]?.intrinsic | 0) && !rn2(4))
            u_slow_down();
    } else {
        /* mhitm */
        if (!negated && mdef.mspeed !== MSLOW) {
            const oldspeed = mdef.mspeed;

            mon_adjust_speed(mdef, -1, null);
            mdef.mstrategy &= ~STRAT_WAITFORU;
            if (mdef.mspeed !== oldspeed && game.v?.vis && canspotmon(mdef))
                pline("%s slows down.", Monnam(mdef));
        }
    }
}

/* completelyburns: C macro — true for paper or straw golems */
function completelyburns(pd) {
    if (!pd) return false;
    return (pd.pmidx === PM_PAPER_GOLEM || pd.pmidx === PM_STRAW_GOLEM);
}

/* resists_fire: C macro monst.h:272 resists_fire(mon) = Resists_Elem(mon,
 * FIRE_RES). mon_resistancebits(mon) = data->mresists | mextrinsics |
 * mintrinsics (monst.h:268) — species innate resistance (mons[].mresists,
 * e.g. fire elementals) was MISSING here, checking only acquired mintrinsics;
 * a species-resistant defender drew an artifact-bonus rnd() it shouldn't have
 * (mhitm.js:1941-1952 already carries this exact pattern for the same macro).
 * The worn/wielded-item half of Resists_Elem (mondata.c:173-196) remains a
 * KNOWN GAP, same as the AD_ELEC/DRST/DRLI/STON block above. */
const MR_FIRE = 0x01;
export function resists_fire(mon) {
    if (!mon) return false;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_FIRE) !== 0;
}

function on_fire_local(pd, mattk) {
    return on_fire_real(pd, mattk);
}

/* DEADMONSTER: C macro — true if monster is dead (mhp < 1) */
export function DEADMONSTER(mon) { return (mon.mhp | 0) < 1; }
/* C timeout.c:448-452.  The canonical async body is exported by mcastu.js;
 * this caller is already async, so preserve the cure and its message rather
 * than silently dropping it through the old local no-op. */
/* completelyrusts: C macro — true for iron golems */
function completelyrusts(pd) {
    if (!pd) return false;
    return (pd.pmidx === PM_IRON_GOLEM);
}
function completelyrots(pd) { return !!pd && (pd.pmidx === PM_WOOD_GOLEM || pd.pmidx === PM_LEATHER_GOLEM); }

/* AD_FIRE constant */
export const AD_FIRE = 2;

/* AD_RUST constant */
export const AD_RUST = 24;
const AD_DCAY = 34; /* monattk.h:76 */

export async function mhitm_ad_rust(magr, mattk, mdef, mhm) {
    const pd = mdef.data;

    if (magr === game.youmonst) {
        /* uhitm */
        if (completelyrusts(pd)) { /* iron golem */
            /* note: the life-saved case is hypothetical because
               life-saving doesn't work for golems */
            pline("%s %s to pieces!", Monnam(mdef),
                  !mlifesaver(mdef) ? "falls" : "starts to fall");
            await xkilled(mdef, XKILL_NOMSG);
            mhm.hitflags |= M_ATTK_DEF_DIED;
        }
        await erode_armor(mdef, ERODE_RUST);
        mhm.damage = 0; /* damageum(), int tmp */
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (magr.mcan) {
            return;
        }
        if (completelyrusts(pd)) {
            You("rust!");
            /* KMH -- this is okay with unchanging */
            await rehumanize();
            return;
        }
        await erode_armor(game.youmonst, ERODE_RUST);
    } else {
        /* mhitm */
        if (magr.mcan)
            return;
        if (completelyrusts(pd)) { /* PM_IRON_GOLEM */
            if (game.v?.vis && canseemon(mdef))
                pline_mon(mdef, "%s %s to pieces!", Monnam(mdef),
                      !mlifesaver(mdef) ? "falls" : "starts to fall");
            await monkilled(mdef, null, AD_RUST);
            if (!DEADMONSTER(mdef)) {
                mhm.hitflags = M_ATTK_MISS;
                mhm.done = true;
                return;
            }
            mhm.hitflags = (M_ATTK_DEF_DIED | (await grow_up(magr, mdef) ? 0
                                            : M_ATTK_AGR_DIED));
            mhm.done = true;
            return;
        }
        await erode_armor(mdef, ERODE_RUST);
        mdef.mstrategy &= ~STRAT_WAITFORU;
        mhm.damage = 0; /* mdamagem(), int tmp */
    }
}

/* mhitm_ad_acid — C uhitm.c:2742-2784, uhitm and mhitm arms (the mhitu arm is
 * mhitm_ad_acid_u in mhitu.js).  Was absent from mhitm_adtyping's switch, so
 * a monster-vs-monster acid hit zeroed damage and skipped the message and
 * the rn2(30)/rn2(6) erosion draws. */
export async function mhitm_ad_acid(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        if (Resists_Elem(mdef, ACID_RES) || defended(mdef, 8 /* AD_ACID */))
            mhm.damage = 0;
    } else {
        /* mhitm */
        if (magr.mcan) {
            mhm.damage = 0;
            return;
        }
        if (Resists_Elem(mdef, ACID_RES) || defended(mdef, 8 /* AD_ACID */)) {
            if (game.v?.vis && canseemon(mdef))
                pline("%s is covered in %s, but it seems harmless.",
                      Monnam(mdef), hliquid("acid"));
            mhm.damage = 0;
        } else if (game.v?.vis && canseemon(mdef)) {
            pline_mon(mdef, "%s is covered in %s!", Monnam(mdef), hliquid("acid"));
            pline("It burns %s!", mon_nam(mdef));
        }
        if (!rn2(30))
            await erode_armor(mdef, ERODE_CORRODE);
        if (!rn2(6))
            await acid_damage(sr_MON_WEP(mdef));
    }
}

/* mhitm_ad_corr — C uhitm.c:2338-2358 (uhitm and mhitm arms; mhitu is in mhitu.js).
 * Was absent from mhitm_adtyping's switch, so a pet's corrosive bite
 * (black pudding) skipped erode_armor's rn2(5) loop. */
export async function mhitm_ad_corr(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        await erode_armor(mdef, ERODE_CORRODE);
        mhm.damage = 0;
    } else {
        /* mhitm */
        if (magr.mcan)
            return;
        await erode_armor(mdef, ERODE_CORRODE);
        mdef.mstrategy &= ~STRAT_WAITFORU;
        mhm.damage = 0;
    }
}

/* mhitm_ad_dcay — C uhitm.c:2363-2411 (uhitm and mhitm arms; mhitu is in mhitu.js) */
export async function mhitm_ad_dcay(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        if (completelyrots(mdef.data)) {
            pline("%s %s to pieces!", Monnam(mdef), !mlifesaver(mdef) ? "falls" : "starts to fall");
            await xkilled(mdef, XKILL_NOMSG);
        }
        await erode_armor(mdef, ERODE_ROT);
        mhm.damage = 0;
    } else {
        /* mhitm */
        if (magr.mcan)
            return;
        if (completelyrots(mdef.data)) {
            if (game.v?.vis && canseemon(mdef))
                pline_mon(mdef, "%s %s to pieces!", Monnam(mdef), !mlifesaver(mdef) ? "falls" : "starts to fall");
            await monkilled(mdef, null, AD_DCAY);
            if (!DEADMONSTER(mdef)) {
                mhm.hitflags = M_ATTK_MISS;
                mhm.done = true;
                return;
            }
            mhm.hitflags = (M_ATTK_DEF_DIED | (await grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED));
            mhm.done = true;
            return;
        }
        await erode_armor(mdef, ERODE_ROT);
        mdef.mstrategy &= ~STRAT_WAITFORU;
        mhm.damage = 0;
    }
}

export async function mhitm_ad_fire(magr, mattk, mdef, mhm) {
    const pd = mdef.data;
    const orig_dmg = mhm.damage; /* damage coming into the function */

    if (magr === game.youmonst) {
        /* uhitm */
        if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!_uh_Blind())
            pline("%s is %s!", Monnam(mdef), on_fire_local(pd, mattk));
        if (completelyburns(pd)) { /* paper golem or straw golem */
            if (!_uh_Blind())
                pline("%s %s!", Monnam(mdef),
                      !mlifesaver(mdef) ? "burns completely"
                                        : "is totally engulfed in flames");
                else
                    You("smell burning%s.",
                    (pd.pmidx === PM_PAPER_GOLEM) ? " paper"
                      : (pd.pmidx === PM_STRAW_GOLEM) ? " straw" : "");
            await xkilled(mdef, XKILL_NOMSG | XKILL_NOCORPSE);
            mhm.damage = 0;
            return;
        }
        if (resists_fire(mdef) || defended(mdef, AD_FIRE)) {
            if (!_uh_Blind())
                pline_The("fire doesn't heat %s!", mon_nam(mdef));
            golemeffects(mdef, AD_FIRE, mhm.damage);
            shieldeff(mdef.mx, mdef.my);
            mhm.damage = 0;
        }
        mhm.damage += (await destroy_items_mon_zap(mdef, AD_FIRE, orig_dmg));
        await ignite_items_real(mdef.minvent);
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!mhitm_mgc_atk_negated(magr, mdef, true)) {
            pline("You're %s!", on_fire_local(pd, mattk));
            if (completelyburns(pd)) { /* paper or straw golem */
                You("go up in flames!");
                monstunseesu(M_SEEN_FIRE);
                /* KMH -- this is okay with unchanging */
                await rehumanize();
                return;
            } else if (_hero_resists(FIRE_RES)) {
                pline_The("fire doesn't feel hot!");
                monstseesu(M_SEEN_FIRE);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_FIRE);
            }
            if ((magr.m_lev | 0) > rn2(20)) {
                await destroy_items_zap(true, AD_FIRE, orig_dmg);
                await ignite_items_real(game.invent);
            }
            await burn_away_slime_real();
        } else {
            mhm.damage = 0;
        }
    } else {
        /* mhitm */
        if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (game.v?.vis && canseemon(mdef))
            pline_mon(mdef, "%s is %s!", Monnam(mdef), on_fire_local(pd, mattk));
        if (completelyburns(pd)) { /* paper golem or straw golem */
            if (game.v?.vis && canseemon(mdef))
                pline_mon(mdef, "%s %s!", Monnam(mdef),
                      !mlifesaver(mdef) ? "burns completely"
                                        : "is totally engulfed in flames");
            await monkilled(mdef, null, AD_FIRE);
            if (!DEADMONSTER(mdef)) {
                mhm.hitflags = M_ATTK_MISS;
                mhm.done = true;
                return;
            }
            mhm.hitflags = (M_ATTK_DEF_DIED
                             | (await grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED));
            mhm.done = true;
            return;
        }
        if (resists_fire(mdef) || defended(mdef, AD_FIRE)) {
            if (game.v?.vis && canseemon(mdef))
                pline_The("fire doesn't seem to burn %s!", mon_nam(mdef));
            shieldeff(mdef.mx, mdef.my);
            golemeffects(mdef, AD_FIRE, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += (await destroy_items_mon_zap(mdef, AD_FIRE, orig_dmg));
        await ignite_items_real(mdef.minvent);
    }
}

/* AD_COLD constant */
export const AD_COLD = 3;
const MR_COLD = 0x02;

/* resists_cold: C macro monst.h:273 resists_cold(mon) = Resists_Elem(mon,
 * COLD_RES) — same mon_resistancebits fix as resists_fire above. */
export function resists_cold(mon) {
    if (!mon) return false;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_COLD) !== 0;
}

export async function mhitm_ad_cold(magr, mattk, mdef, mhm) {
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        /* uhitm */
        if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!_uh_Blind())
            pline("%s is covered in frost!", Monnam(mdef));
        if (resists_cold(mdef) || defended(mdef, AD_COLD)) {
            shieldeff(mdef.mx, mdef.my);
            if (!_uh_Blind())
                pline_The("frost doesn't chill %s!", mon_nam(mdef));
            golemeffects(mdef, AD_COLD, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += (await destroy_items_mon_zap(mdef, AD_COLD, orig_dmg));
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!mhitm_mgc_atk_negated(magr, mdef, true)) {
            pline("You're covered in frost!");
            if (_hero_resists(COLD_RES)) {
                pline_The("frost doesn't seem cold!");
                monstseesu(M_SEEN_COLD);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_COLD);
            }
            if ((magr.m_lev | 0) > rn2(20))
                await destroy_items_zap(true, AD_COLD, orig_dmg);
        } else
            mhm.damage = 0;
    } else {
        /* mhitm */
        if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (game.v?.vis && canseemon(mdef))
            pline_mon(mdef, "%s is covered in frost!", Monnam(mdef));
        if (resists_cold(mdef) || defended(mdef, AD_COLD)) {
            if (game.v?.vis && canseemon(mdef))
                pline_The("frost doesn't seem to chill %s!", mon_nam(mdef));
            shieldeff(mdef.mx, mdef.my);
            golemeffects(mdef, AD_COLD, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += (await destroy_items_mon_zap(mdef, AD_COLD, orig_dmg));
    }
}

/* AD_ELEC constant */
export const AD_ELEC = 6;
const MR_ELEC = 0x10;

export function resists_elec(mon) {
    if (!mon) return false;
    /* C monst.h:273 Resists_Elem(mon, SHOCK_RES) includes the species'
     * innate mresists plus acquired monster and worn-item intrinsics.  The
     * old mintrinsics-only read made shock-resistant species vulnerable and
     * incorrectly ran the damage/item-destruction arms. */
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_ELEC) !== 0;
}

export async function mhitm_ad_elec(magr, mattk, mdef, mhm) {
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        /* uhitm */
        if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (!_uh_Blind())
            pline("%s is zapped!", Monnam(mdef));
        if (resists_elec(mdef) || defended(mdef, AD_ELEC)) {
            if (!_uh_Blind())
                pline_The("zap doesn't shock %s!", mon_nam(mdef));
            golemeffects(mdef, AD_ELEC, mhm.damage);
            shieldeff(mdef.mx, mdef.my);
            mhm.damage = 0;
        }
        mhm.damage += (await destroy_items_mon_zap(mdef, AD_ELEC, orig_dmg));
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!mhitm_mgc_atk_negated(magr, mdef, true)) {
            You("get zapped!");
            if (_hero_resists(SHOCK_RES)) {
                pline_The("zap doesn't shock you!");
                monstseesu(M_SEEN_ELEC);
                mhm.damage = 0;
            } else {
                monstunseesu(M_SEEN_ELEC);
            }
            if ((magr.m_lev | 0) > rn2(20))
                await destroy_items_zap(true, AD_ELEC, orig_dmg);
        } else
            mhm.damage = 0;
    } else {
        /* mhitm */
        if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = 0;
            return;
        }
        if (game.v?.vis && canseemon(mdef))
            pline_mon(mdef, "%s gets zapped!", Monnam(mdef));
        if (resists_elec(mdef) || defended(mdef, AD_ELEC)) {
            if (game.v?.vis && canseemon(mdef))
                pline_The("zap doesn't shock %s!", mon_nam(mdef));
            shieldeff(mdef.mx, mdef.my);
            golemeffects(mdef, AD_ELEC, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += (await destroy_items_mon_zap(mdef, AD_ELEC, orig_dmg));
    }
}

export async function mhitm_ad_ston(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        if (!(await munstone(mdef, true)))
            await minstapetrify(mdef, true);
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!rn2(3)) {
            if (magr.mcan) {
                if (!_uh_Deaf())
                    You_hear("a cough from %s!", mon_nam(magr));
            } else {
                if (_xk_hallu() && !_uh_Blind()) {
                    Soundeffect(se_cockatrice_hiss, 50);
                    You_hear("hissing.");
                    pline("%s appears to be blowing you a kiss...",
                          Monnam(magr));
                } else if (!_uh_Deaf()) {
                    You_hear("%s hissing!", s_suffix(mon_nam(magr)));
                } else if (!_uh_Blind()) {
                    pline("%s seems to grimace.", Monnam(magr));
                }
                if (!rn2(10) || game.flags.moonphase === NEW_MOON) {
                    if (await do_stone_u(magr)) {
                        mhm.hitflags = M_ATTK_HIT;
                        mhm.done = true;
                        return;
                    }
                }
            }
        }
    } else {
        /* mhitm */
        if (magr.mcan)
            return;
        await do_stone_mon(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    }
}

/* is_flyer(ptr) — C macro: ((ptr)->mflags1 & M1_FLY) */
function is_flyer(data) {
    return (data.mflags1 & M1_FLY) !== 0;
}


/* C youprop.h:240 Levitation = ((HLevitation || ELevitation) && !BLevitation)
 * and :253 Flying = ((HFlying || EFlying || (u.usteed && is_flyer(...))) &&
 * !BFlying).  mhitm_ad_legs() below read them as `game.Levitation` and
 * `game.Flying` — field names NOTHING in js/ ever writes, so both terms of
 * C's height guard were permanently false; `game.uarmf` in the same function
 * was the same defect (the worn boot lives at u.uarmf, cf. :3661). */
function _legs_prop(id) {
    const p = game.u?.uprops?.[id];
    return !!(p && (((p.intrinsic | 0) !== 0) || ((p.extrinsic | 0) !== 0))
              && !(p.blocked | 0));
}
function _legs_Levitation() { return _legs_prop(LEVITATION_LG); }
function _legs_Flying() {
    const steed = game.u?.usteed;
    const p = game.u?.uprops?.[FLYING_LG];
    return !!((((p?.intrinsic | 0) !== 0) || ((p?.extrinsic | 0) !== 0)
               || (steed && is_flyer(steed.data)))
              && !(p?.blocked | 0));
}
const LEVITATION_LG = 48, FLYING_LG = 49;   /* prop.h (js/const.js:2360-2361) */
export async function mhitm_ad_legs(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        let side = rn2(2) ? RIGHT_SIDE : LEFT_SIDE;
        let sidestr = (side === RIGHT_SIDE) ? "right" : "left";
        let Monst_name = Monnam(magr);
        let leg = body_part(LEG);

        if ((game.u?.usteed || _legs_Levitation() || _legs_Flying()) && !is_flyer(magr.data)) {
            pline("%s tries to reach your %s %s!", Monst_name, sidestr, leg);
            mhm.damage = 0;
        } else if (magr.mcan) {
            pline_mon(magr, "%s nuzzles against your %s %s!", Monnam(magr),
                  sidestr, leg);
            mhm.damage = 0;
        } else {
            if (game.u?.uarmf) {
                if (rn2(2) && ((game.u.uarmf.otyp | 0) === LOW_BOOTS
                               || (game.u.uarmf.otyp | 0) === IRON_SHOES)) {
                    pline("%s pricks the exposed part of your %s %s!",
                          Monst_name, sidestr, leg);
                } else if (!rn2(5)) {
                    pline("%s pricks through your %s boot!", Monst_name,
                          sidestr);
                } else {
                    pline("%s scratches your %s boot!", Monst_name,
                          sidestr);
                    mhm.damage = 0;
                    return;
                }
            } else
                pline("%s pricks your %s %s!", Monst_name, sidestr, leg);

            /* C uhitm.c:4475 `rnd(60 - ACURR(A_DEX))`.  acurr() (js/attrib.js
             * :101) takes the HERO RECORD, not youmonst — passing youmonst made
             * getAbase() read an object with no attribute array, so every draw
             * here was rnd(57) (the tmp<=3 clamp) instead of rnd(60-Dex).
             * js/uhitm.js:182 already calls it the right way. */
            set_wounded_legs(side, rnd(60 - acurr(game.u, A_DEX)));
            exercise(A_STR, false);
            exercise(A_DEX, false);
        }
    } else {
        /* mhitm */
        if (magr.mcan) {
            mhm.damage = 0;
            return;
        }
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    }
}

/* mhitm_ad_heal: C ref uhitm.c:4297 */
export async function mhitm_ad_heal(magr, mattk, mdef, mhm) {
    let pd = mdef.data;

    if (magr === game.youmonst) {
        /* uhitm */
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        /* a cancelled nurse is just an ordinary monster,
         * nurses don't heal those that cause petrification */
        if (magr.mcan || (Upolyd(game.u) && touch_petrifies(pd))) {
            await hitmsg(magr, mattk);
            return;
        }
        /* weapon check should match the one in sounds.c for MS_NURSE */
        if (!(game.u.uwep && (game.u.uwep.oclass === WEAPON_CLASS || is_weptool(game.u.uwep)))
            && !game.u.uarmu && !game.u.uarm && !game.u.uarmc
            && !game.u.uarms && !game.u.uarmg && !game.u.uarmf && !game.u.uarmh) {
            let goaway = false;

            pline_mon(magr, "%s hits!  (I hope you don't mind.)",
                      Monnam(magr));
            if (Upolyd(game.u)) {
                game.u.mh += rnd(7);
                if (!rn2(7)) {
                    /* no upper limit necessary; effect is temporary */
                    game.u.mhmax++;
                    if (!rn2(13))
                        goaway = true;
                }
                if (game.u.mh > game.u.mhmax)
                    game.u.mh = game.u.mhmax;
            } else {
                game.u.uhp += rnd(7);
                if (!rn2(7)) {
                    /* hard upper limit via nurse care: 25 * ulevel */
                    if (game.u.uhpmax < 5 * game.u.ulevel + d(2 * game.u.ulevel, 10)) {
                        game.u.uhpmax++;
                        if (game.u.uhpmax > game.u.uhppeak)
                            game.u.uhppeak = game.u.uhpmax;
                    }
                    if (!rn2(13))
                        goaway = true;
                }
                if (game.u.uhp > game.u.uhpmax)
                    game.u.uhp = game.u.uhpmax;
            }
            if (!rn2(3))
                exercise(A_STR, true);
            if (!rn2(3))
                exercise(A_CON, true);
            if (_uh_Sick())
                await make_sick(0, null, false, SICK_ALL);
            SET_BOTL();
            if (goaway) {
                await mongone(magr);
                mhm.done = true;
                mhm.hitflags = M_ATTK_DEF_DIED; /* return 2??? */
                return;
            } else if (!rn2(33)) {
                if (!tele_restrict(magr))
                    await rloc(magr, RLOC_MSG);
                await monflee(magr, d(3, 6), true, false);
                mhm.done = true;
                mhm.hitflags = M_ATTK_HIT | M_ATTK_DEF_DIED; /* return 3??? */
                return;
            }
            mhm.damage = 0;
        } else {
            if (Role_if(PM_HEALER)) {
                if (!_uh_Deaf() && !(game.moves % 5)) {
                    SetVoice(magr, 0, 80, 0);
                    verbalize("Doc, I can't help you unless you cooperate.");
                }
                mhm.damage = 0;
            } else
                await hitmsg(magr, mattk);
        }
    } else {
        /* mhitm */
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        if (mhm.done)
            return;
    }
}

/* AD_TLPT — teleport attack */
const AD_TLPT = 23;
/* RLOC_NOMSG — LOCAL DEFINITION DELETED; now imported from js/teleport.js.
 * It was `0` here, which is not a flag bit at all: C hack.h:1397-1399 has
 * RLOC_ERR=0x01, RLOC_MSG=0x02, RLOC_NOMSG=0x04.  Passing 0 would have cleared
 * the `preventmsg` test in rloc_to_core (teleport.js:565), i.e. inverted the
 * "prevent appear msg" meaning of the flag.  It never bit because the local
 * rloc() stub next to it ignored its flags argument entirely.  js/teleport.js
 * carries the corrected 0x04 (js/const.js's frozen RLOC_NOMSG is 0x0001, which
 * also disagrees with C — see the note at teleport.js:526-535 — so this must
 * NOT be imported from const.js). */

/* C teleport.c:2261-2292 — u_teleport_mon imported directly from ./teleport.js */

export async function mhitm_ad_tlpt(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        if (mhm.damage <= 0)
            mhm.damage = 1;
        if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            pline("%s is not affected.", Monnam(mdef));
        } else {
            let u_saw_mon = (canseemon(mdef) || engulfing_u(mdef));
            /* record the name before losing sight of monster */
            let nambuf = Monnam(mdef);
            if (await u_teleport_mon(mdef, false) && u_saw_mon
                && !(canseemon(mdef) || engulfing_u(mdef)))
                pline("%s suddenly disappears!", nambuf);
            if (mhm.damage >= mdef.mhp) { /* see hitmu(mhitu.c) */
                if (mdef.mhp == 1)
                    ++mdef.mhp;
                mhm.damage = mdef.mhp - 1;
            }
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        let tmphp;
        await hitmsg(magr, mattk);
        if (mhitm_mgc_atk_negated(magr, mdef, false)) {
            You("are not affected.");
        } else {
            if (game.flags.verbose)
                Your("position suddenly seems %suncertain!",
                     (_hero_resists(TELEPORT_CONTROL) && !_hero_resists(STUNNED) && !unconscious()) ? ""
                     : "very ");
            await tele();
            if ((_half_physical_damage_uh() ? Math.floor((mhm.damage - 1) / 2) : mhm.damage)
                >= (tmphp = (Upolyd(game.u) ? game.u.mh : game.u.uhp))) {
                mhm.damage = tmphp - 1;
                if (_half_physical_damage_uh())
                    mhm.damage *= 2;
                if (mhm.damage < 1) {
                    mhm.damage = 1;
                    if (Upolyd(game.u) && game.u.mh == 1)
                        ++game.u.mh;
                    else if (!Upolyd(game.u) && game.u.uhp == 1)
                        ++game.u.uhp;
                }
            }
        }
    } else {
        /* mhitm */
        if (magr.mcan || mhm.damage >= mdef.mhp || tele_restrict(mdef)) {
            ; /* no negation message */
        } else if (mhitm_mgc_atk_negated(magr, mdef, true)) {
            if (game.v?.vis)
                pline_mon(mdef, "%s is not affected.", Monnam(mdef));
        } else {
            let mdef_Monnam;
            let wasseen = canspotmon(mdef);
            /* save the name before monster teleports */
            if (game.v?.vis && wasseen)
                mdef_Monnam = Monnam(mdef);
            mdef.mstrategy &= ~STRAT_WAITFORU;
            await rloc(mdef, RLOC_NOMSG);
            if (game.v?.vis && wasseen && !canspotmon(mdef) && mdef != game.u.usteed)
                pline("%s suddenly disappears!", mdef_Monnam);
            if (mhm.damage >= mdef.mhp) { /* see hitmu(mhitu.c) */
                if (mdef.mhp == 1)
                    ++mdef.mhp;
                mhm.damage = mdef.mhp - 1;
            }
        }
    }
}

export async function mhitm_ad_ench(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        /* there's no msomearmor() function, so just do damage */
    } else if (mdef === game.youmonst) {
        /* mhitu */
        const negated = mhitm_mgc_atk_negated(magr, mdef, false);

        await hitmsg(magr, mattk);
        /* uncancelled is sufficient enough; please
           don't make this attack less frequent */
        if (!negated) {
            let obj = some_armor(mdef);

            if (!obj) {
                /* some rings are susceptible;
                   amulets and blindfolds aren't (at present) */
                switch (rn2(5)) {
                case 0:
                    break;
                case 1:
                    obj = game.u.uright;
                    break;
                case 2:
                    obj = game.u.uleft;
                    break;
                case 3:
                    obj = game.u.uamul;
                    break;
                case 4:
                    obj = game.u.ublindf;
                    break;
                }
            }
            if (obj && (await drain_item(obj, false))) {
                /* C uhitm.c:3642. */
                await pline('%s less effective.', Yobjnam2(obj, 'seem'));
            }
        }
    } else {
        /* mhitm */
        /* there's no msomearmor() function, so just do damage */
    }
}

const AD_DETH = 37; /* monattk.h:79 */
const AD_DRLI = 15; /* monattk.h:57 */
const AD_SLIM = 40; /* monattk.h:82 */
const M2_DEMON_DETH = 0x00000100; /* monflag.h M2_DEMON */
const DRAIN_RES_DETH = 9; /* prop.h:27 */

/* C mondata.h is_undead(ptr) — (ptr->mflags2 & M2_UNDEAD) != 0.  This file
 * already spells the flag as M2_UNDEAD (line 179); mhitm_ad_deth/drli are the
 * first callers in this file to need the predicate itself. */
function is_undead_deth(ptr) {
    return !!(ptr && ((ptr.mflags2 | 0) & M2_UNDEAD) !== 0);
}
/* C mondata.h is_demon(ptr) — reuses js/makemon.js's exported is_demon. */
/* C mondata.h is_were(ptr) — reuses this file's M2_WERE_UH (line 491). */
function is_were_deth(ptr) {
    return !!(ptr && ((ptr.mflags2 | 0) & M2_WERE_UH) !== 0);
}
/* C monst.h:215 is_vampshifter(mon) — cham is one of the three vampire-
 * shifter true forms. */
function is_vampshifter_deth(mon) {
    const c = mon?.cham;
    return c === PM_VAMPIRE || c === PM_VAMPIRE_LORD || c === PM_VLAD_THE_IMPALER;
}
/* C youprop.h:52 Drain_resistance = HDrain_resistance || EDrain_resistance. */
function Drain_resistance_deth() {
    const p = game.u && game.u.uprops && game.u.uprops[DRAIN_RES_DETH];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C pline.c:387-400 You_feel(line, ...) —
 *     if (Unaware) YouPrefix(tmp, "You dream that you feel ", line);
 *     else         YouPrefix(tmp, "You feel ", line);
 * The Unaware arm was missing: this body was an unconditional
 * "You feel " + msg.  Unaware (youprop.h:399) is imported from js/display.js,
 * which already carries the ported gm.multi/unconscious()/is_fainted() body.
 * RNG-free.  Renamed from the mhitm_ad_deth-specific spelling it used to
 * carry, because it is now shared with damageum's own You_feel at
 * uhitm.c:4870 — this file's second C You_feel site — and there is no reason
 * for two spellings of the same C function inside one module. */
function You_feel_uh(msg) {
    return pline((Unaware() ? 'You dream that you feel ' : 'You feel ') + msg);
}

/* mhitm_ad_drli — C ref: uhitm.c:2444-2518.
 * mhitm_ad_deth's mon-vs-mon path (below) redirects into this function's
 * `mhitm` (final else) arm, per C's own comment there ("mhitm_ad_deth gets
 * redirected here for Death's touch"). Ported in full for structural fidelity
 * with the C, though only the `magr==youmonst` and plain-`mhitm` arms are
 * reachable via that redirect (mdef is never the hero on that path). */
async function mhitm_ad_drli(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        /* uhitm */
        if (!rn2(3) && !(resists_drli(mdef) || defended(mdef, AD_DRLI))
            && !mhitm_mgc_atk_negated(magr, mdef, true)) {
            mhm.damage = d(2, 6); /* Stormbringer uses monhp_per_lvl */
            pline("%s becomes weaker!", Monnam(mdef));
            if (mdef.mhpmax - mhm.damage > (mdef.m_lev | 0)) {
                mdef.mhpmax -= mhm.damage;
            } else {
                if (mdef.mhpmax > (mdef.m_lev | 0))
                    mdef.mhpmax = (mdef.m_lev | 0) + 1;
            }
            mdef.mhp -= mhm.damage;
            if (DEADMONSTER(mdef) || !mdef.m_lev) {
                pline("%s %s!", Monnam(mdef), nonlivingMon(mdef.mndx ?? mdef.mnum) ? 'expires' : 'dies');
                await xkilled(mdef, XKILL_NOMSG);
            } else {
                mdef.m_lev--;
            }
            mhm.damage = 0; /* damage has already been inflicted */
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!rn2(3) && !Drain_resistance_deth()
            && !mhitm_mgc_atk_negated(magr, mdef, true)) {
            await losexp('life drainage');
        }
    } else {
        /* mhitm; mhitm_ad_deth gets redirected here for Death's touch */
        const is_death = (mattk.adtyp === AD_DETH);

        if (is_death
            || (!rn2(3) && !(resists_drli(mdef) || defended(mdef, AD_DRLI))
                && !mhitm_mgc_atk_negated(magr, mdef, true))) {
            if (!is_death) /* Stormbringer uses monhp_per_lvl (1d8) */
                mhm.damage = d(2, 6);
            if (game.v?.vis && canspotmon(mdef))
                pline_mon(mdef, "%s becomes weaker!", Monnam(mdef));
            if (mdef.mhpmax - mhm.damage > (mdef.m_lev | 0)) {
                mdef.mhpmax -= mhm.damage;
            } else {
                if (mdef.mhpmax > (mdef.m_lev | 0))
                    mdef.mhpmax = (mdef.m_lev | 0) + 1;
            }
            if ((mdef.m_lev | 0) === 0)
                mhm.damage = mdef.mhp;
            else
                mdef.m_lev--;
        }
    }
}

async function mhitm_ad_deth(magr, mattk, mdef, mhm) {
    const pd = mdef.data;

    if (magr === game.youmonst) {
        /* uhitm; hero can't polymorph into anything with this attack so this
           won't happen; if it could, it would be the same as the mhitm case
           except for messaging */
        if (is_undead_deth(pd) && mhm.damage > 1)
            mhm.damage = rnd(Math.trunc(mhm.damage / 2));
        await mhitm_ad_drli(magr, mattk, mdef, mhm);
    } else if (mdef === game.youmonst) {
        /* mhitu */
        pline_mon(magr, "%s reaches out with its deadly touch.", Monnam(magr));
        if (is_undead_deth(pd)) {
            /* still does some damage */
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);
            pline('Was that the touch of death?');
            return;
        }
        switch (rn2(20)) {
        case 19:
        case 18:
        case 17:
            if (!Antimagic_uh()) {
                await touch_of_death(magr);
                mhm.damage = 0;
                return;
            }
            /* FALLTHROUGH */
        default: /* case 16: ... case 5: */
            You_feel_uh('your life force draining away...');
            mhm.permdmg = 1;
            return;
        case 4:
        case 3:
        case 2:
        case 1:
        case 0:
            if (Antimagic_uh())
                shieldeff(game.u.ux | 0, game.u.uy | 0);
            pline("Lucky for you, it didn't work!");
            mhm.damage = 0;
            return;
        }
    } else {
        /* mhitm; it's possible for Death to hit another monster; if target
           is undead, it will take some damage but less than an undead hero
           would; otherwise, just inflict the normal damage */
        if (is_undead_deth(pd) && mhm.damage > 1)
            mhm.damage = rnd(Math.trunc(mhm.damage / 2));
        /* simulate Death's touch with drain life attack */
        await mhitm_ad_drli(magr, mattk, mdef, mhm);
    }
}

const PM_GREEN_SLIME_UH = 208; /* pm.generated.js */


async function mhitm_ad_slim(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false);
    if (magr !== game.youmonst) {
        if (mdef === game.youmonst)
            return; /* mhitu arm: js/mhitu.js mhitm_ad_slim_u */
        /* mhitm arm, C uhitm.c:3573-3598 */
        if (negated)
            return; /* physical damage only */
        if (!rn2(4) && !slimeproof(mdef.data)) {
            if (!(await munslime(mdef, false)) && !DEADMONSTER(mdef)) {
                let ncflags = 0;
                if (game.v?.vis && canseemon(mdef))
                    ncflags |= 1 /* NC_SHOW_MSG */;
                await newcham(mdef, PM_GREEN_SLIME_UH, ncflags);
                mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
                mhm.hitflags = M_ATTK_HIT;
            }
            if (DEADMONSTER(magr))
                mhm.hitflags |= M_ATTK_AGR_DIED;
            if (DEADMONSTER(mdef))
                mhm.hitflags |= M_ATTK_DEF_DIED;
            mhm.damage = 0;
        }
        return;
    }
    if (negated)
        return; /* physical damage only */
    if (!rn2(4) && !slimeproof(mdef?.data)) {
        /* C uhitm.c:3537: munslime(mdef, TRUE) */
        if (!(await munslime(mdef, true)) && !DEADMONSTER(mdef)) {
            You('turn %s into slime.', mon_nam(mdef));
            await newcham(mdef, PM_GREEN_SLIME_UH, 0 /* NO_NC_FLAGS */);
        }
        if (DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_DEF_DIED;
            mhm.done = true;
            return;
        }
        mhm.damage = 0;
    }
}

const AD_DREN = 16; /* monattk.h:58 */
const AD_SGLD = 20, AD_SITM = 21,
      AD_SEDU = 22, AD_CONF = 25, AD_DGST = 26, AD_WRAP = 28, AD_WERE = 29,
      AD_DRIN = 32, AD_DISE = 33, AD_SSEX = 35, AD_HALU = 36, AD_PEST = 38,
      AD_FAMN = 39, AD_POLY = 43, AD_SAMU = 252, AD_CURS = 253; /* monattk.h */
export const AD_ACID = 8;
export const AD_STUN = 12;
export const AD_CORR = 42; /* monattk.h */
const COIN_CLASS = 12; /* defsym.h:479 */
const S_NYMPH = 14;    /* defsym.h:310 */
const M1_SLITHY = 0x00080000; /* monflag.h:104 */
const S_NAGA = 40; /* defsym.h S_NAGA; S_SNAKE is S_SNAKE_UH */
const slithy = (ptr) => !!((ptr.mflags1 | 0) & M1_SLITHY); /* mondata.h */
const AD_DRST = 7, AD_DRDX = 30, AD_DRCO = 31; /* monattk.h:49,72,73 */


async function mhitm_ad_dren(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false);

    if (magr === game.youmonst) {
        /* uhitm */
        if (!negated && !rn2(4))
            xdrainenergym(mdef, true);
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!negated && !rn2(4)) /* 25% chance */
            await drain_en(mhm.damage, false);
        mhm.damage = 0;
    } else {
        /* mhitm */
        if (!negated && !rn2(4))
            xdrainenergym(mdef, !!(game.v?.vis && canspotmon(mdef)
                                    && mattk.aatyp !== AT_ENGL));
        mhm.damage = 0;
    }
}

/* Your — C ref: pline.c:375-383. RNG-free "Your " message prefix; this file
 * already imports the plain "You" from js/do_wear.js and carries the same
 * pattern locally for pline_The (below). */

/* resists_poison_uh — C ref: monst.h:275 resists_poison(mon) =
 * Resists_Elem(mon, POISON_RES) (mondata.c:128-193), for the non-hero
 * defenders in mhitm_ad_drst/mhitm_really_poison. Mirrors
 * Resists_Elem's `mon_resistancebits(mon) & rsstmask` (monst.h:268,
 * mresists | mextrinsics | mintrinsics) against MR_POISON (0x20,
 * monflag.h:67).  Use the canonical body so the worn/carried-item and
 * wielded-artifact resistance arms are included too. */
function resists_poison_uh(mon) {
    return Resists_Elem(mon, POISON_RES);
}

/* C uhitm.c:3120-3166: poison strength, dexterity, or constitution. */
async function mhitm_ad_drst(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false);

    if (is_youmonst(magr)) {
        /* uhitm */
        if (!negated && !rn2(8)) {
            await Your('%s was poisoned!', mpoisons_subj(magr, mattk));
            if (resists_poison_uh(mdef)) {
                await pline_The("poison doesn't seem to affect %s.", mon_nam(mdef));
            } else if (!rn2(10)) {
                await Your('poison was deadly...');
                mhm.damage = mdef.mhp;
            } else {
                mhm.damage += rn1(10, 6);
            }
        }
    } else if (is_youmonst(mdef)) {
        const ptmp = mattk.adtyp === AD_DRDX ? A_DEX : mattk.adtyp === AD_DRCO ? A_CON : A_STR;
        await hitmsg(magr, mattk);
        if (!negated && !rn2(8)) {
            const buf = `${s_suffix(Monnam(magr))} ${mpoisons_subj(magr, mattk)}`;
            await poisoned(buf, ptmp, pmname(magr.data, Mgender(magr)), 30, false);
        }
    } else {
        /* mhitm */
        if (!negated && !rn2(8))
            await mhitm_really_poison(magr, mattk, mdef, mhm);
    }
}

/* C uhitm.c:2054-2090 m_slips_free — [currently assumes that you are the
 * attacker].  A greased/oilskin head covering (AD_DRIN) or body armor
 * makes the hero's grab slip off. */
async function m_slips_free(mdef, mattk) {
    let obj;
    if ((mattk.adtyp | 0) === 32 /* AD_DRIN */) {
        obj = which_armor(mdef, W_ARMH);
    } else {
        obj = which_armor(mdef, W_ARMC);
        if (!obj) obj = which_armor(mdef, W_ARM);
        if (!obj) obj = which_armor(mdef, W_ARMU);
    }
    if (obj && (obj.greased || (obj.otyp | 0) === 142 /* OILSKIN_CLOAK */)
        && (!obj.cursed || rn2(3))) {
        await You("%s %s %s %s!",
            ((mattk.adtyp | 0) === 28 /* AD_WRAP */) ? "slip off of"
                                                    : "grab, but cannot hold onto",
            s_suffix(mon_nam(mdef)), obj.greased ? "greased" : "slippery",
            (obj.greased || (game._oc_name_known && game._oc_name_known[obj.otyp]))
                ? xname(obj) : cloak_simple_name(obj));
        if (obj.greased && !rn2(2)) {
            await pline_The("grease wears off.");
            obj.greased = 0;
        }
        return true;
    }
    return false;
}

/* C uhitm.c:3167-3320 mhitm_ad_drin — the `magr == &gy.youmonst` (uhitm)
 * arm: a polymorphed hero's mind-flayer tentacle.  The mhitu / mhitm arms
 * live in js/mhitu.js and js/mhitm.js. */
/* C mhitm.c mhitm_ad_drin, the mon-vs-mon arm (mhitm.c:387-411 region in
 * the C tree's mhitm_ad_drin "mhitm" branch): brain-eating between monsters. */
async function mhitm_ad_drin_mm(magr, mattk, mdef, mhm) {
    game.s = game.s || {};
    const pd = mdef.data;
    const hasHead = !pd || (((pd.mflags1 >>> 0) & 0x00008000) === 0);
    if ((game.gn && game.gn.notonhead) || !hasHead) {
        if (game.v?.vis && canspotmon(mdef))
            pline_mon(mdef, "%s doesn't seem harmed.", Monnam(mdef));
        mhm.damage = 0;
        game.s.skipdrin = 1;
        return;
    }
    const helmet = which_armor(mdef, W_ARMH);
    if (helmet && rn2(8)) {
        if (game.v?.vis && canspotmon(magr) && canseemon(mdef))
            pline("%s helmet blocks %s attack to %s head.",
                  s_suffix(Monnam(mdef)), s_suffix(mon_nam(magr)), mhis_mon(mdef));
        return;
    }
    const amu = which_armor(mdef, W_AMUL);
    const lifsav = !!(amu && (amu.otyp | 0) === 202 /* AMULET_OF_LIFE_SAVING */);
    const dmg_p = { value: mhm.damage | 0 };
    mhm.hitflags = await eat_brains(magr, mdef, !!game.v?.vis, dmg_p);
    mhm.damage = dmg_p.value;
    if (lifsav && !which_armor(mdef, W_AMUL))
        game.s.skipdrin = 1;
}

async function mhitm_ad_drin(magr, mattk, mdef, mhm) {
    game.s = game.s || {};
    if (!is_youmonst(magr)) {
        if (is_youmonst(mdef)) await mhitm_adtyping_u(magr, mattk, mhm);
        else await mhitm_ad_drin_mm(magr, mattk, mdef, mhm);
        return;
    }
    const pd = mdef.data;
    const hasHead = !pd || (((pd.mflags1 >>> 0) & 0x00008000) === 0);
    if ((game.gn && game.gn.notonhead) || !hasHead) {
        pline("%s doesn't seem harmed.", Monnam(mdef));
        game.s.skipdrin = 1;
        mhm.damage = 0;
        const up = game.u && game.u.uprops;
        const unch = !!(up && up[63] && (up[63].intrinsic || up[63].extrinsic));
        if (!unch && pd?.pmidx === PM_GREEN_SLIME_UH) {
            const sl = up && up[22 /* SLIMED */];
            if (!(sl && (sl.intrinsic | 0))) {
                You("suck in some slime and don't feel very well.");
                await make_slimed(10, null);
            }
        }
        return;
    }
    if (await m_slips_free(mdef, mattk))
        return;
    const helmet = which_armor(mdef, W_ARMH);
    if (helmet && rn2(8)) {
        pline("%s %s blocks your attack to %s head.",
              s_suffix(Monnam(mdef)), helm_simple_name(helmet), mhis_mon(mdef));
        return;
    }
    const amu = which_armor(mdef, W_AMUL);
    const lifsav = !!(amu && (amu.otyp | 0) === 202 /* AMULET_OF_LIFE_SAVING */);
    const dmg_p = { value: mhm.damage | 0 };
    await eat_brains(game.youmonst, mdef, true, dmg_p);
    mhm.damage = dmg_p.value;
    if (lifsav && !which_armor(mdef, W_AMUL))
        game.s.skipdrin = 1;
}

/* C uhitm.c:2160-2265 steal_it() + uhitm.c:4621-4630 mhitm_ad_sedu() hero arm:
 * a polymorphed nymph hero steals from the monster it attacks.  The whole
 * AD_SITM/AD_SEDU/AD_SSEX hero arm was missing from mhitm_adtyping, so the
 * hero's theft attack dealt nothing and printed no "You steal: ..." line.
 */
/* C uhitm.c:2147-2164. Even a life-saved thief stops after touching the
 * stolen corpse; the poly_when_stoned shortcut is #if 0 in C. */
async function theft_petrifies(otmp) {
    if (game.u.uarmg || otmp.otyp !== 265 /* CORPSE */
        || !touch_petrifies_corpsenm(otmp.corpsenm) || _hero_resists(STONE_RES))
        return false;
    await instapetrify(corpse_xname(otmp, 'stolen', CXN_ARTICLE));
    return true;
}

async function steal_it(mdef, mattk) {
    let otmp = mdef.minvent;
    if (!otmp || ((otmp.oclass | 0) === COIN_CLASS && !otmp.nobj))
        return; /* nothing to take */

    /* look for worn body armor */
    let ustealo = null;
    if (could_seduce(game.youmonst, mdef, mattk) && mdef.mcanmove) {
        /* find armor, and move it to end of inventory in the process */
        let prev = null;
        otmp = mdef.minvent;
        while (otmp) {
            const nxt = otmp.nobj;
            if ((otmp.owornmask | 0) & W_ARM) {
                if (ustealo)
                    throw new Error('steal_it: multiple worn suits');
                if (prev) prev.nobj = nxt; else mdef.minvent = nxt;
                ustealo = otmp;
                ustealo.nobj = null;
            } else {
                prev = otmp;
            }
            otmp = nxt;
        }
        if (ustealo) {
            let tail = mdef.minvent;
            if (!tail) mdef.minvent = ustealo;
            else {
                while (tail.nobj) tail = tail.nobj;
                tail.nobj = ustealo; /* put armor back into minvent */
            }
        }
    }
    let gold = findgold(mdef.minvent);

    if (ustealo) { /* we will be taking everything */
        const heshe = upstart(mhe(mdef));
        if (gender(mdef) === ((game.u.mfemale | 0))
            && (game.youmonst.data?.mlet | 0) === S_NYMPH)
            await You('charm %s.  %s gladly hands over %s%s possessions.',
                      mon_nam(mdef), heshe, !gold ? '' : 'most of ',
                      mhis_mon(mdef));
        else
            await You('seduce %s and %s starts to take off %s clothes.',
                      mon_nam(mdef), mhe(mdef), mhis_mon(mdef));
    }

    if (gold)
        obj_extract_self(gold);
    while ((otmp = mdef.minvent) != null) {
        if (gold) { /* put 'mdef's gold back after remembering minvent */
            await mpickobj(mdef, gold);
            gold = null;
        }
        if (!Upolyd(game.u))
            break; /* no longer have ability to steal */
        const unwornmask = otmp.owornmask | 0;
        /* C uhitm.c:2236-2237, artifact.c:418-459 find_artifact: record
         * the find while the artifact is still carried by the monster. */
        if (otmp.oartifact && !_ac_blind()) {
            const a = otmp.oartifact;
            const artifacts = game._artiexist || (game._artiexist = {});
            const info = artifacts[a];
            if (!info?.found) {
                if (a < 1 || a >= ARTI_SPEC.length)
                    impossible('found_artifact: invalid artifact index! (%d)', a);
                else if (!info || (info !== true && !info.exists))
                    impossible("found_artifact: artifact doesn't exist yet? (%d)", a);
                else if (info === true) artifacts[a] = { exists: 1, found: 1 };
                else info.found = 1;
                livelog_printf(LL_ARTIFACT, 'found %s carried by a monster',
                               bare_artifactname(otmp));
            }
        }
        await extract_from_minvent(mdef, otmp, true, false);
        if (otmp === ustealo)
            await pline('%s finishes taking off %s suit.', Monnam(mdef),
                        mhis_mon(mdef));
        otmp = await hold_another_object(otmp, 'You snatched but dropped %s.',
                                         await doname(otmp), 'You steal: ');
        if (!otmp || (otmp.where | 0) !== OBJ_INVENT)
            continue;
        if (await theft_petrifies(otmp))
            break;
        if (unwornmask & W_WEP) {
            await possibly_unwield(mdef, false);
        } else if (unwornmask & W_ARMG) {
            await mselftouch_nc(mdef, null, true);
            if (DEADMONSTER(mdef))
                break;
        }
        if (!ustealo)
            break; /* only taking one item */
        if ((gold = findgold(mdef.minvent)) != null)
            obj_extract_self(gold);
    }
    if (gold)
        await mpickobj(mdef, gold);
}

/* C uhitm.c:2789-2854.  The hero-defender branch already lives in
 * mhitu.js's dispatcher; reuse that branch for these shared handlers. */
async function mhitm_ad_sgld(magr, mattk, mdef, mhm) {
    if (is_youmonst(magr)) {
        const gold = findgold(mdef.minvent);
        if (gold) {
            obj_extract_self(gold);
            if ((await merge_choice(game.invent, gold)) || inv_cnt(false) < 52) {
                await addinv(gold);
                await Your('purse feels heavier.');
            } else {
                await You("grab %s's gold, but find no room in your knapsack.", mon_nam(mdef));
                await dropy(gold);
            }
        }
        exercise(A_DEX, true);
        mhm.damage = 0;
    } else if (is_youmonst(mdef)) {
        await mhitm_adtyping_u(magr, mattk, mhm);
    } else {
        mhm.damage = 0;
        if (magr.mcan) return;
        const gold = findgold(mdef.minvent);
        if (!gold) return;
        obj_extract_self(gold);
        await add_to_minv(magr, gold);
        mdef.mstrategy &= ~STRAT_WAITFORU;
        const buf = Monnam(magr);
        if (game.v?.vis && canseemon(mdef))
            await pline('%s steals some gold from %s.', buf, mon_nam(mdef));
        if (!tele_restrict(magr)) {
            const couldspot = canspotmon(magr);
            mhm.hitflags = 0x8; /* M_ATTK_AGR_DONE */
            await rloc(magr, RLOC_NOMSG);
            if (game.v?.vis && couldspot && !canspotmon(magr))
                await pline('%s suddenly disappears!', buf);
        }
    }
}

/* C uhitm.c:3014-3091.  Keep the night test before the curse roll, and
 * retain the pre-transformation permonst for the clay-golem test. */
async function mhitm_ad_curs(magr, mattk, mdef, mhm) {
    const pd = mdef.data;
    if (is_youmonst(magr)) {
        if (night() && !rn2(10) && !mdef.mcan) {
            if (pd.pmidx === PM_CLAY_GOLEM) {
                if (!_ac_blind())
                    await pline('Some writing vanishes from %s head!', s_suffix(mon_nam(mdef)));
                await xkilled(mdef, XKILL_NOMSG);
            } else {
                mdef.mcan = 1;
                await You('chuckle.');
            }
        }
        mhm.damage = 0;
    } else if (is_youmonst(mdef)) {
        await mhitm_adtyping_u(magr, mattk, mhm);
    } else {
        if (!night() && magr.data.pmidx === PM_GREMLIN) return;
        if (!magr.mcan && !rn2(10)) {
            mdef.mcan = 1;
            mdef.mstrategy &= ~STRAT_WAITFORU;
            if (is_were(pd) && pd.mlet !== 53 /* S_HUMAN */)
                await were_change(mdef);
            if (pd.pmidx === PM_CLAY_GOLEM) {
                if (game.v?.vis && canseemon(mdef)) {
                    await pline('Some writing vanishes from %s head!', s_suffix(mon_nam(mdef)));
                    await pline('%s is destroyed!', Monnam(mdef));
                }
                await mondied_dm(mdef);
                if (!DEADMONSTER(mdef)) {
                    mhm.hitflags = M_ATTK_MISS;
                    mhm.done = true;
                    return;
                } else if (mdef.mtame && !game.v?.vis) {
                    await You('have a %s feeling for a moment, then it passes.', 'strangely sad');
                }
                mhm.hitflags = M_ATTK_DEF_DIED | (await grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED);
                mhm.done = true;
                return;
            }
            if (!_uh_Deaf()) {
                if (!game.v?.vis) await You_hear('laughter.');
                else if (canseemon(magr)) await pline('%s chuckles.', Monnam(magr));
            }
        }
    }
}

/* C uhitm.c:3336-3430.  C's inverted-looking tailmiss assignment is
 * intentional here: port !notonhead exactly, including its consequences. */
async function mhitm_ad_wrap(magr, mattk, mdef, mhm) {
    const pd = mdef.data, pa = magr.data, u = game.u;
    const coil = slithy(pa) && (pa.mlet === S_SNAKE_UH || pa.mlet === S_NAGA);
    if (is_youmonst(magr)) {
        if (!sticks(pd)) {
            const tailmiss = !game.gn?.notonhead;
            if (!u.ustuck && !tailmiss && !rn2(10)) {
                if (await m_slips_free(mdef, mattk)) mhm.damage = 0;
                else {
                    await You('%s yourself around %s!', coil ? 'coil' : 'swing', mon_nam(mdef));
                    set_ustuck(mdef);
                }
            } else if (u.ustuck === mdef && !tailmiss) {
                if (is_pool_uh(u.ux, u.uy)
                    && !(pd.mflags1 & (0x2 | 0x200 | 0x400))) { /* cant_drown */
                    await You('drown %s...', mon_nam(mdef));
                    mhm.damage = mdef.mhp;
                } else if (mattk.aatyp === AT_HUGS)
                    await pline('%s is being crushed.', Monnam(mdef));
            } else {
                mhm.damage = 0;
                if (game.flags.verbose) {
                    if (coil && !tailmiss) await You('brush against %s.', mon_nam(mdef));
                    else await You('brush against %s %s.', s_suffix(mon_nam(mdef)),
                                   tailmiss ? 'tail' : mbodypart_real(mdef, LEG));
                }
            }
        } else mhm.damage = 0;
    } else if (is_youmonst(mdef)) {
        await mhitm_adtyping_u(magr, mattk, mhm);
    } else {
        if (magr.mcan) mhm.damage = 0;
        if (!mhm.damage && (canseemon(magr) || canseemon(mdef)))
            await pline('%s brushes against %s.', upstart(some_mon_nam(magr)), some_mon_nam(mdef));
    }
}

/* C uhitm.c:3689-3725. */
async function mhitm_ad_conf(magr, mattk, mdef, mhm) {
    if (is_youmonst(magr)) {
        if (!mdef.mconf) {
            if (canseemon(mdef)) await pline('%s looks confused.', Monnam(mdef));
            mdef.mconf = 1;
        }
    } else if (is_youmonst(mdef)) {
        await mhitm_adtyping_u(magr, mattk, mhm);
    } else if (!magr.mcan && !mdef.mconf && !magr.mspec_used) {
        if (game.v?.vis && canseemon(mdef)) pline_mon(mdef, '%s looks confused.', Monnam(mdef));
        mdef.mconf = 1;
        mdef.mstrategy &= ~STRAT_WAITFORU;
    }
}


/* C uhitm.c:3728-3773. */
async function mhitm_ad_poly(magr, mattk, mdef, mhm) {
    if (is_youmonst(mdef)) {
        await mhitm_adtyping_u(magr, mattk, mhm);
        return;
    }
    const negated = mhitm_mgc_atk_negated(magr, mdef, false) || magr.mspec_used;
    const uagr = is_youmonst(magr);
    if (mhm.damage < mdef.mhp && (!uagr || !game.u.uwep)) {
        if (negated) {
            if (uagr) await pline('%s is not transformed.', Monnam(mdef));
        } else {
            mhm.damage = await mon_poly(magr, mdef, mhm.damage);
            if (DEADMONSTER(mdef)) mhm.hitflags |= M_ATTK_DEF_DIED;
            mhm.hitflags |= M_ATTK_HIT;
            mhm.done = true;
        }
    }
}

/* C uhitm.c:3776-3804, 3807-3832, 3896-3920, 4592-4619. */
async function mhitm_ad_famn(magr, mattk, mdef, mhm) {
    if (is_youmonst(mdef)) await mhitm_adtyping_u(magr, mattk, mhm);
    else if (!(mdef.data.mflags1 & 0xe0000000)) /* carnivore, herbivore, metallivore */
        mhm.damage = 0;
}
async function mhitm_ad_pest(magr, mattk, mdef, mhm) {
    if (is_youmonst(mdef)) await mhitm_adtyping_u(magr, mattk, mhm);
    else await mhitm_ad_dise(magr, { ...mattk, adtyp: 33 }, mdef, mhm);
}
async function mhitm_ad_halu(magr, mattk, mdef, mhm) {
    if (!is_youmonst(magr) && !is_youmonst(mdef)
        && !magr.mcan && !(mdef.data.mflags1 & 0x1000) && mdef.mcansee) {
        if (game.v?.vis && canseemon(mdef))
            pline_mon(mdef, '%s looks %sconfused.', Monnam(mdef), mdef.mconf ? 'more ' : '');
        mdef.mconf = 1;
        mdef.mstrategy &= ~STRAT_WAITFORU;
    }
    mhm.damage = 0;
}
async function mhitm_ad_dise(magr, mattk, mdef, mhm) {
    if (is_youmonst(mdef)) await mhitm_adtyping_u(magr, mattk, mhm);
    else if (mdef.data.mlet === 32 /* S_FUNGUS */ || mdef.data.pmidx === PM_GHOUL
             || defended(mdef, 33 /* AD_DISE */)) mhm.damage = 0;
}

/* C uhitm.c:4264-4295 and 4387-4422. */
async function mhitm_ad_were(magr, mattk, mdef, mhm) {
    if (is_youmonst(mdef)) await mhitm_adtyping_u(magr, mattk, mhm);
    else await mhitm_ad_phys(magr, mattk, mdef, mhm);
}
async function mhitm_ad_stun(magr, mattk, mdef, mhm) {
    if (is_youmonst(mdef)) {
        await mhitm_adtyping_u(magr, mattk, mhm);
        return;
    }
    const uagr = is_youmonst(magr);
    if (!uagr && magr.mcan) return;
    if (uagr) {
        if (!_ac_blind())
            await pline('%s %s for a moment.', Monnam(mdef), makeplural(stagger(mdef.data, 'stagger')));
    } else if (canseemon(mdef))
        await pline_mon(mdef, '%s %s for a moment.', Monnam(mdef), makeplural(stagger(mdef.data, 'stagger')));
    mdef.mstun = 1;
    await mhitm_ad_phys(magr, mattk, mdef, mhm);
    if (mhm.done) /* C uhitm.c:4401-4402, 4419-4420 */
        return;
}

/* C uhitm.c:4491-4566.  Digestion's Rider test precedes the burp,
 * lifesaving-amulet consumption, and the corpse/nutrition RNG. */
async function mhitm_ad_dgst(magr, mattk, mdef, mhm) {
    if (is_youmonst(magr) || is_youmonst(mdef)) {
        mhm.damage = 0;
        return;
    }
    const pd = mdef.data;
    const num = pd.pmidx;
    if (num === PM_DEATH || num === PM_FAMINE || num === PM_PESTILENCE) {
        if (game.v?.vis && canseemon(magr))
            await pline('%s %s!', Monnam(magr), num === PM_FAMINE
                ? 'belches feebly, shrivels up and dies'
                : num === PM_PESTILENCE
                    ? 'coughs spasmodically and collapses'
                    : 'vomits violently and drops dead');
        await mondied_dm(magr);
        if (!DEADMONSTER(magr)) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            return;
        } else if (magr.mtame && !game.v?.vis) {
            await You('have a %s feeling for a moment, then it passes.', 'queasy');
        }
        mhm.hitflags = M_ATTK_AGR_DIED;
        mhm.done = true;
        return;
    }
    if (game.flags.verbose && !Deaf()) {
        SetVoice(magr, 0, 80, 0);
        await verbalize('Burrrrp!');
    }
    wake_nearto(magr.mx, magr.my, 2 * 2);
    mhm.damage = mdef.mhp;
    const obj = mlifesaver(mdef);
    if (obj) await m_useup(mdef, obj);
    if (!(await corpse_chance(mdef, magr, true)) || DEADMONSTER(magr))
        return;
    if (magr.mtame && !magr.isminion
        && !((((_MONS[num]?.[3] | 0) & G_NOCORPSE) | (game.mvitals?.[num]?.mvflags | 0)) & G_NOCORPSE)) {
        /* mvitals[].mvflags is seeded from mons[].geno & G_NOCORPSE (allmain.c:853) */
        const virtualcorpse = await mksobj(265 /* CORPSE */, false, false);
        set_corpsenm(virtualcorpse, num);
        let nutrit = dog_nutrition(magr, virtualcorpse);
        await _uh_dealloc_and_bump(virtualcorpse);
        if (magr.meating > 1)
            magr.meating = Math.trunc((magr.meating + 3) / 4);
        if (nutrit > 1) nutrit = Math.trunc(nutrit / 2);
        magr.mextra.edog.hungrytime += nutrit;
    }
}

/* C uhitm.c:4569-4588.  The hero-defender arm owns hitmsg and rn2(20). */
async function mhitm_ad_samu(magr, mattk, mdef, mhm) {
    if (!is_youmonst(magr) && is_youmonst(mdef))
        await mhitm_adtyping_u(magr, mattk, mhm);
    else
        mhm.damage = 0;
}

/* C uhitm.c:4622-4747.  Preserve names before inventory mutation: saddle
 * removal changes the defender's name, and add_to_minv can merge/free obj. */
async function mhitm_ad_sedu(magr, mattk, mdef, mhm) {
    const pa = magr.data;
    if (is_youmonst(magr)) {
        await steal_it(mdef, mattk);
        mhm.damage = 0;
    } else if (is_youmonst(mdef)) {
        await mhitm_adtyping_u(magr, mattk, mhm);
    } else {
        if (magr.mcan) return;
        let obj;
        for (obj = mdef.minvent; obj; obj = obj.nobj)
            if (!magr.mtame || !obj.cursed) break;
        if (obj) {
            const mdefnambuf = x_monnam(mdef, ARTICLE_THE, null, 0, false);
            if (game.u.usteed === mdef && obj === which_armor(mdef, W_SADDLE))
                await dismount_steed(DISMOUNT_POLY);
            await extract_from_minvent(mdef, obj, true, false);
            const onambuf = game.v?.vis ? await doname(obj) : '';
            await add_to_minv(magr, obj);
            const buf = Monnam(magr);
            if (game.v?.vis && canseemon(mdef))
                await pline('%s steals %s from %s!', buf, onambuf, mdefnambuf);
            await possibly_unwield(mdef, false);
            mdef.mstrategy &= ~STRAT_WAITFORU;
            await mselftouch_nc(mdef, null, false);
            if (DEADMONSTER(mdef)) {
                mhm.hitflags = M_ATTK_DEF_DIED
                    | ((await grow_up(magr, mdef)) ? 0 : M_ATTK_AGR_DIED);
                mhm.done = true;
                return;
            }
            if (pa.mlet === S_NYMPH && !tele_restrict(magr)) {
                const couldspot = canspotmon(magr);
                mhm.hitflags = M_ATTK_AGR_DONE;
                await rloc(magr, RLOC_NOMSG);
                if (game.v?.vis && couldspot && !canspotmon(magr))
                    await pline('%s suddenly disappears!', buf);
            }
        }
        mhm.damage = 0;
    }
}

/* C uhitm.c:4750-4777. SYSOPT_SEDUCE affects only the hero-defender arm. */
async function mhitm_ad_ssex(magr, mattk, mdef, mhm) {
    if (!is_youmonst(magr) && is_youmonst(mdef))
        await mhitm_adtyping_u(magr, mattk, mhm);
    else
        await mhitm_ad_sedu(magr, mattk, mdef, mhm);
}

export async function mhitm_adtyping(magr, mattk, mdef, mhm) {
    switch (mattk.adtyp) {
    case AD_SGLD: await mhitm_ad_sgld(magr, mattk, mdef, mhm); break;
    case AD_CURS: await mhitm_ad_curs(magr, mattk, mdef, mhm); break;
    case AD_WRAP: await mhitm_ad_wrap(magr, mattk, mdef, mhm); break;
    case AD_CONF: await mhitm_ad_conf(magr, mattk, mdef, mhm); break;
    case AD_POLY: await mhitm_ad_poly(magr, mattk, mdef, mhm); break;
    case AD_FAMN: await mhitm_ad_famn(magr, mattk, mdef, mhm); break;
    case AD_PEST: await mhitm_ad_pest(magr, mattk, mdef, mhm); break;
    case AD_HALU: await mhitm_ad_halu(magr, mattk, mdef, mhm); break;
    case AD_DISE: await mhitm_ad_dise(magr, mattk, mdef, mhm); break;
    case AD_WERE: await mhitm_ad_were(magr, mattk, mdef, mhm); break;
    case AD_STUN: await mhitm_ad_stun(magr, mattk, mdef, mhm); break;
    case AD_DGST: await mhitm_ad_dgst(magr, mattk, mdef, mhm); break;
    case AD_SAMU: await mhitm_ad_samu(magr, mattk, mdef, mhm); break;
    case AD_SITM:
    case AD_SEDU:
        await mhitm_ad_sedu(magr, mattk, mdef, mhm);
        break;
    case AD_SSEX:
        await mhitm_ad_ssex(magr, mattk, mdef, mhm);
        break;
    case AD_PHYS:
        await mhitm_ad_phys(magr, mattk, mdef, mhm);
        break;
    case AD_FIRE:
        await mhitm_ad_fire(magr, mattk, mdef, mhm);
        break;
    case AD_COLD:
        await mhitm_ad_cold(magr, mattk, mdef, mhm);
        break;
    case AD_ELEC:
        await mhitm_ad_elec(magr, mattk, mdef, mhm);
        break;
    case AD_PLYS:
        await mhitm_ad_plys(magr, mattk, mdef, mhm);
        break;
    case AD_SLEE:
        await mhitm_ad_slee(magr, mattk, mdef, mhm);
        break;
    case AD_LEGS:
        await mhitm_ad_legs(magr, mattk, mdef, mhm);
        break;
    case AD_STCK:
        await mhitm_ad_stck(magr, mattk, mdef, mhm);
        break;
    case AD_STON:
        await mhitm_ad_ston(magr, mattk, mdef, mhm);
        break;
    case AD_ENCH:
        await mhitm_ad_ench(magr, mattk, mdef, mhm);
        break;
    case AD_SLOW:
        await mhitm_ad_slow(magr, mattk, mdef, mhm);
        break;
    case AD_HEAL:
        await mhitm_ad_heal(magr, mattk, mdef, mhm);
        break;
    case AD_TLPT:
        await mhitm_ad_tlpt(magr, mattk, mdef, mhm);
        break;
    case AD_RUST:
        await mhitm_ad_rust(magr, mattk, mdef, mhm);
        break;
    case AD_DCAY: await mhitm_ad_dcay(magr, mattk, mdef, mhm); break;
    case AD_ACID:
        await mhitm_ad_acid(magr, mattk, mdef, mhm);
        break;
    case AD_CORR:
        await mhitm_ad_corr(magr, mattk, mdef, mhm);
        break;
    case AD_BLND:
        mhitm_ad_blnd(magr, mattk, mdef, mhm);
        break;
    case AD_DETH:
        await mhitm_ad_deth(magr, mattk, mdef, mhm);
        break;
    case AD_DRLI:
        /* Was defined (line ~6300) but never wired into this switch, so
         * every AD_DRLI (drain life) hit fell to `default:` and drew
         * nothing where C draws rn2(3)/rn2(10)/d(...) via mhitm_ad_drli. */
        await mhitm_ad_drli(magr, mattk, mdef, mhm);
        break;
    case AD_SLIM:
        await mhitm_ad_slim(magr, mattk, mdef, mhm);
        break;
    case AD_DREN:
        await mhitm_ad_dren(magr, mattk, mdef, mhm);
        break;
    case AD_DRIN:
        await mhitm_ad_drin(magr, mattk, mdef, mhm);
        break;
    case AD_DRST:
    case AD_DRDX:
    case AD_DRCO:
        await mhitm_ad_drst(magr, mattk, mdef, mhm);
        break;
    default:
        mhm.damage = 0;
        break;
    }
}

/* disguised_as_non_mon: C ref uhitm.c */
export function disguised_as_non_mon(mtmp) {
    return (!sensemon(mtmp)
            && M_AP_TYPE(mtmp)
            && M_AP_TYPE(mtmp) != M_AP_MONSTER);
}

/* C uhitm.c:6307-6311; sensing a mimic doesn't change its disguise. */
export function disguised_as_mon(mtmp) {
    return (mtmp.m_ap_type & M_AP_TYPMASK) === M_AP_MONSTER;
}

/* monstseesu/monstunseesu — real bodies imported from js/mcastu.js
 * (C ref: mondata.c:1557-1582); this file's local copies were no-op stubs
 * silently dropping every m_setseenres/m_clearseenres update this file
 * triggers (M_SEEN_SLEEP/FIRE/COLD arms below). */
export function dynamic_multi_reason(mon, verb, by_gaze) {
    const who = x_monnam(mon, ARTICLE_A, null,
        SUPPRESS_IT | SUPPRESS_INVISIBLE | SUPPRESS_HALLUCINATION
        | SUPPRESS_SADDLE | SUPPRESS_NAME, false);
    game.multi_reason = `${verb} by ${by_gaze ? s_suffix(who) : who}${by_gaze ? ' gaze' : ''}`;
    /* C uhitm.c:113-122 — "m_id:" prefix kept for done_in_by()'s fixup */
    game.multireasonbuf = `${mon.m_id >>> 0}:${game.multi_reason}`;
}

async function do_stone_mon(magr, mattk, mdef, mhm) {
    // C uhitm.c:3945-3978: a successful cure skips straight to post_stone.
    const cured = await munstone(mdef, false);
    if (!cured && poly_when_stoned(mdef?.data)) {
        await mon_to_stone(mdef);
        mhm.damage = 0;
        return;
    }
    if (!cured && sh_resists_ston(mdef)) {
        mhm.damage = (mattk?.adtyp | 0) === AD_STON ? 0 : 1;
        return;
    }
    if (!cured) {
        if (game.v?.vis && canseemon(mdef))
            await pline(`${Monnam(mdef)} turns to stone!`);
        await monstone(mdef); /* C uhitm.c:3965: statue, newsym, then mondead */
    }
    if (!((mdef.mhp | 0) <= 0)) {
        mhm.hitflags = M_ATTK_MISS;
        mhm.done = true;
        return;
    } else if (mdef.mtame && !game.v?.vis) {
        await You('have a %s feeling for a moment, then it passes.', 'peculiarly sad');
    }
    mhm.hitflags = M_ATTK_DEF_DIED | (await grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED);
    mhm.done = true;
}
function Soundeffect(se, vol) { /* no-op */ }
const se_cockatrice_hiss = 0;


/* mon_adjust_speed — THE ONE BODY lives at js/trap.js (C ref: worn.c:479-556).
 * The empty no-op that used to sit here silently dropped both AD_SLOW slow-downs
 * in mhitm_ad_slow above; it is imported at the top of this file now. */

/* pline_The: prepend "The " to format string, then call pline */

/* mhitm_ad_phys — physical damage handler.
 * C ref: uhitm.c:3982 mhitm_ad_phys */
async function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const pa = magr.data;
    const pd = mdef.data;

    /* AT_* constants — C ref: nethack-c/include/monattk.h:12-28 (NOT mondata.h).
       The whole row was off: AT_WEAP read 1 (= AT_CLAW) and CLAW/KICK/TUCH each
       sat one slot high, so the AT_WEAP arm below never fired and the
       KICK/CLAW/TUCH arm matched BUTT/TUCH/STNG instead. */
    const AT_WEAP = 254, AT_CLAW = 1, AT_KICK = 3, AT_TUCH = 5, AT_HUGS = 7;
    /* Material constants (objects.h); JS uses mkobj_erosion_meta indexing */
    const SILVER_MAT = 14, IRON_MAT = 11, METAL_MAT = 12;
    /* Object otyp constants */
    const CORPSE = 265;
    const GAUNTLETS_OF_POWER = 161; /* objects.h:694; was 23 = CROSSBOW_BOLT
                                     * (a bolt is never worn as gloves, so both
                                     * marmg branches below were dead) */

    if (magr === game.youmonst) {
        /* uhitm */
        if ((pd?.pmidx | 0) === PM_SHADE) {
            mhm.damage = 0;
            if (!mhm.specialdmg)
                impossible("bad shade attack function flow?");
        }
        mhm.damage += mhm.specialdmg;

        if (mattk.aatyp === AT_WEAP) {
            mhm.damage = 0;
        } else if (mattk.aatyp === AT_KICK
                   || mattk.aatyp === AT_CLAW
                   || mattk.aatyp === AT_TUCH
                   || mattk.aatyp === AT_HUGS) {
            if (thick_skinned(pd))
                mhm.damage = (mattk.aatyp === AT_KICK) ? 0
                              : Math.floor((mhm.damage + 1) / 2);
            /* C reads a plain `u.udaminc`, whose C struct storage is
             * zero-initialised; js/'s `game.u.udaminc` has no such guarantee
             * (every other reader in this file — uhitm.js:2247, cmd.js:3387 —
             * masks with `| 0`).  Unmasked, an undefined `udaminc` made the
             * first branch read false (undefined > 0) and the second branch
             * add `undefined` to `mhm.damage`, turning it into NaN that
             * `mhp -= (mhm.damage | 0)` then silently treated as 0 damage —
             * a Marilith's AT_CLAW row (do_attack record #98) killed the
             * target in C and left it alive in this port. */
            const _udaminc = (game.u.udaminc | 0);
            if (_udaminc > 0) {
                mhm.damage += _udaminc;
            } else if (mhm.damage > 0) {
                mhm.damage += _udaminc;
                if (mhm.damage < 1)
                    mhm.damage = 1;
            }
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if (mattk.aatyp === AT_HUGS && !sticks(pd)) {
            if (!game.u.ustuck && rn2(2)) {
                if (u_slip_free(magr, mattk)) {
                    mhm.damage = 0;
                    mhm.hitflags |= 0x0 /* M_ATTK_MISS */;
                } else {
                    set_ustuck(magr);
                    pline_mon(magr, "%s grabs you!", Monnam(magr));
                    mhm.hitflags |= 0x1 /* M_ATTK_HIT */;
                }
            } else if (game.u.ustuck === magr) {
                exercise(0 /* A_STR */, false);
                You("are being %s.",
                    (magr.mndx === PM_ROPE_GOLEM) ? "choked" : "crushed");
            }
        } else {
            let otmp = sr_MON_WEP(magr);

            if (mattk.aatyp === AT_WEAP && otmp) {
                let marmg;
                let tmp;
                let was_poisoned = (otmp.opoisoned || permapoisoned(otmp));

                if (otmp.otyp === CORPSE
                    && touch_petrifies_corpsenm(otmp.corpsenm)) {
                    mhm.damage = 1;
                    pline_mon(magr, "%s hits you with the %s corpse.",
                              Monnam(magr),
                              monPmname(otmp.corpsenm, 2 /* NEUTRAL */));
                    /* do_stone_u() reads the canonical STONED/STONE_RES
                     * property slots and returns false when already stoned or
                     * resistant; otherwise it applies the petrification. */
                    if (await do_stone_u(magr)) {
                        mhm.hitflags = 0x1 /* M_ATTK_HIT */;
                        mhm.done = 1;
                        return;
                    }
                }
                mhm.damage += dmgval(otmp, mdef);
                if ((marmg = which_armor(magr, W_ARMG)) != null
                    && marmg.otyp === GAUNTLETS_OF_POWER)
                    mhm.damage += rn1(4, 3); /* 3..6 */
                if (mhm.damage <= 0)
                    mhm.damage = 1;
                /* C uhitm.c:4067-4072.  artifact_hit() is C's `*dmgptr +=
                 * spec_dbon(...)` site, so its damage has to be read back;
                 * the retired stub returned FALSE and dropped it. */
                let arti_special = false;
                if (otmp.oartifact) {
                    const ah = await artifact_hit(magr, null, otmp, mhm.damage,
                                                  game.mhitu_dieroll,
                                                  game.u?.umonnum | 0);
                    mhm.damage = ah.dmg;
                    arti_special = ah.special;
                }
                if (!otmp.oartifact || !arti_special) {
                    await hitmsg(magr, mattk);
                    mhm.hitflags |= 0x1 /* M_ATTK_HIT */;
                }
                if (!mhm.damage)
                    return;
                if (sr_oc_material(otmp.otyp) === SILVER_MAT
                    && _hero_hates_silver_uh()) {
                    pline_The("silver sears your flesh!");
                    exercise(4 /* A_CON */, false);
                }
                /* this redundancy necessary because you have
                   to take the damage _before_ being cloned;
                   need to have at least 2 hp left to split */
                tmp = mhm.damage;
                if (game.u.uac < 0)
                    tmp -= rnd(-game.u.uac);
                if (tmp < 1)
                    tmp = 1;
                if (_half_physical_damage_uh())
                    tmp = Math.floor((tmp + 1) / 2);

                if (game.u.mh - tmp > 1
                    && (sr_oc_material(otmp.otyp) === IRON_MAT
                        || sr_oc_material(otmp.otyp) === METAL_MAT)
                    && (game.u.umonnum === PM_BLACK_PUDDING
                        || game.u.umonnum === PM_BROWN_PUDDING)) {
                    if (tmp > 1)
                        exercise(0 /* A_STR */, false);
                    /* inflict damage now; we know it can't be fatal */
                    game.u.mh -= tmp;
                    SET_BOTL();
                    mhm.damage = 0; /* don't inflict more damage below */
                    if (await cloneu())
                        You("divide as %s hits you!", mon_nam(magr));
                }
                await rustm(game.youmonst, otmp);
                if (was_poisoned && game.mhitu_dieroll <= 5) {
                    let buf = s_suffix(Monnam(magr)) + " " + mpoisons_subj(magr, mattk);
                    /* arbitrary, but most poison sources in the game are
                     * strength-based. With hpdamchance = 10, HP damage occurs
                     * 1/2 of the time and it will hit Str rest of the time.
                     * (This is the same as poisoned ammo.) */
                    await poisoned(buf, 0 /* A_STR */, pmname(magr.data, Mgender(magr)),
                             10, false);
                }
            } else if (mattk.aatyp !== AT_TUCH || mhm.damage !== 0
                       || magr !== game.u.ustuck) {
                await hitmsg(magr, mattk);
                mhm.hitflags |= 0x1 /* M_ATTK_HIT */;
            }
        }
    } else {
        /* mhitm */
        let mwep = sr_MON_WEP(magr);
        let vis = canseemon(magr) && canseemon(mdef);

        if (mattk.aatyp !== AT_WEAP && mattk.aatyp !== AT_CLAW)
            mwep = null;

        if (shade_miss(magr, mdef, mwep, false, vis)) {
            mhm.damage = 0;
        } else if (mattk.aatyp === AT_KICK && thick_skinned(pd)) {
            /* [no 'kicking boots' check needed; monsters with kick attacks
               can't wear boots and monsters that wear boots don't kick] */
            mhm.damage = 0;
        } else if (mwep) { /* non-Null 'mwep' implies AT_WEAP || AT_CLAW */
            let marmg;

            if (mwep.otyp === CORPSE
                && touch_petrifies_corpsenm(mwep.corpsenm)) {
                await do_stone_mon(magr, mattk, mdef, mhm);
                if (mhm.done)
                    return;
            }

            mhm.damage += dmgval(mwep, mdef);
            if ((marmg = which_armor(magr, W_ARMG)) != null
                && marmg.otyp === GAUNTLETS_OF_POWER)
                mhm.damage += rn1(4, 3); /* 3..6 */
            if (mhm.damage < 1) /* is this necessary?  mhitu.c has it... */
                mhm.damage = 1;
            if (mwep.oartifact) {
                /* when magr's weapon is an artifact, caller suppressed its
                   usual 'hit' message in case artifact_hit() delivers one;
                   now we'll know and might need to deliver skipped message */
                const ah2 = await artifact_hit(magr, mdef, mwep, mhm.damage,
                                               mhm.dieroll,
                                               (mdef.mnum ?? mdef.mndx) | 0);
                mhm.damage = ah2.dmg; /* C uhitm.c:4164 — *dmgptr is an out-param */
                if (!ah2.special) {
                    // C uhitm.c:4166: use the fight's gv.vis, not the local
                    // both-visible flag passed to shade_miss() above.
                    if (game.v?.vis)
                        pline_mon(magr, "%s hits %s.", Monnam(magr),
                              mon_nam_too(mdef, magr));
                    mhm.hitflags |= 0x1 /* M_ATTK_HIT */;
                }
                /* artifact_hit updates 'tmp' but doesn't inflict any
                   damage; however, it might cause carried items to be
                   destroyed and they might do so */
                if (mdef.mhp < 1) { /* DEADMONSTER */
                    mhm.hitflags = (0x2 /* M_ATTK_DEF_DIED */
                                     | (await grow_up(magr, mdef) ? 0
                                        : M_ATTK_AGR_DIED));
                    mhm.done = true;
                    return;
                }
            }
            if (mhm.damage)
                await rustm(mdef, mwep);
            if ((mwep.opoisoned || permapoisoned(mwep)) && !rn2(4)) {
                /* 1/4 chance of weapon poison applying is the same as in
                 * uhitm and mhitu cases. */
                await mhitm_really_poison(magr, mattk, mdef, mhm);
            }
        } else if (pa.pmidx === PM_PURPLE_WORM && pd.pmidx === PM_SHRIEKER) {
            /* hack to enhance mm_aggression(); we don't want purple
               worm's bite attack to kill a shrieker because then it
               won't swallow the corpse; but if the target survives,
               the subsequent engulf attack should accomplish that */
            if (mhm.damage >= mdef.mhp && mdef.mhp > 1)
                mhm.damage = mdef.mhp - 1;
        }
    }
}

/* stub: set_wounded_legs — not yet ported */

/* constants for mhitm_ad_heal */
const SICK_ALL = 0x03;
const RLOC_MSG = 0x0002;
/* C skills.h/role.h Role_if(pm) is `urole.mnum == pm`, and role.c roles[].mnum
 * holds the mons[] index (roles.js:537 sets game.urole.mnum from ROLE_PM_MNUM),
 * so this is the mons[] index, NOT the roles[] ordinal: monsters.h:3377
 * MON(... HEALER) = 334.  Was 18 = PM_DOG, wrong under either reading. */
const PM_HEALER = 334;

/* C mondata.h:200
 *   #define touch_petrifies(ptr) \
 *       ((ptr) == &mons[PM_COCKATRICE] || (ptr) == &mons[PM_CHICKATRICE])
 * `pd` is a permonst (mon->data); the canonical JS spelling of C's
 * `ptr == &mons[X]` is `ptr.pmidx === X` (permonstTemplate sets pmidx =
 * monsndx(ptr), mondata.h:10). */
export function touch_petrifies(pd) {
    const idx = (pd && pd.pmidx != null) ? (pd.pmidx | 0) : -1;
    return idx === PM_COCKATRICE || idx === PM_CHICKATRICE;
}
function touch_petrifies_corpsenm(corpsenm) {
    return corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;
}
/* C ref: obj.h:249 is_weptool(o) —
 *     ((o)->oclass == TOOL_CLASS && objects[(o)->otyp].oc_skill != P_NONE)
 * The `&& false` with "_oc_skill not ported" was a stale absence claim: this
 * file already reads objects[].oc_skill through MKOBJ_OC_SKILL (sr_oc_skill,
 * ~line 2486), which is the same table js/mhitu.js:2721 inlines this macro
 * against.  A hardwired-false predicate reads as ported at every grep. */
// C uhitm.c:1993-2012. Misc-object dispatch must test this before effects.
function hmon_shade_aware(obj) {
    return !!obj && ([475, 477, 478, 230, 284].includes(obj.otyp | 0)
        || sr_oc_material(obj.otyp) === 14);
}

// C uhitm.c:1130-1141. Both melee and projectile dispatch use this mirror arm.
async function hmon_hitmon_mirror(hmd, obj) {
    if (breaktest(obj)) {
        await You(`break ${await ysimple_name_hit(obj)}.  That's bad luck!`);
        change_luck_uh(-2);
        await useup(obj);
        hmd.unarmed = false;
        hmd.get_dmg_bonus = false;
        hmd.hittxt = true;
    }
    hmd.dmg = 1;
}

// C uhitm.c:1386-1432. The callers supply their weapon/misc damage bodies.
/* HMON_xxx constants (hack.h) */
export const HMON_THROWN = 1;
export const HMON_MELEE = 0;
export const HMON_KICKED = 2;
export const HMON_APPLIED = 3;

/* C obj.h:274 stone_missile(o) — gemstone/mineral missile that is not a ring */
function stone_missile(o) {
    const mat = sr_oc_material(o.otyp);
    return (mat === 20 /* GEMSTONE */ || mat === 21 /* MINERAL */)
        && (o.oclass | 0) !== 4 /* RING_CLASS */;
}

export async function hmon_hitmon_do_hit(hmd, mon, obj, weaponHit, miscHit) {
    const u = game.u;
    if (!obj) {
        hmd.dmg = 0;
        if (hmd.mdat.pmidx !== PM_SHADE) {
            hmd.dmg = rnd(_uh_martial_bonus() ? 4 : 2);
            hmd.use_weapon_skill = true;
            hmd.train_weapon_skill = hmd.dmg > 1;
        }
        const mask = u.uarmg ? W_ARMG
            : ((hmd.twohits === 0 || hmd.twohits === 1 ? W_RINGR : 0)
               | (hmd.twohits === 0 || hmd.twohits === 2 ? W_RINGL : 0));
        const silverhit = { value: 0 };
        hmd.dmg += special_dmgval(game.youmonst, mon, mask, silverhit);
        hmd.barehand_silver_rings = (silverhit.value & (W_RINGR | W_RINGL)) ? 1 : 0;
        if (hmd.barehand_silver_rings) hmd.silvermsg = true;
        return;
    }
    if ((hmd.thrown === HMON_THROWN || hmd.thrown === HMON_KICKED)
        && stone_missile(obj)
        && (hmd.mdat.mflags1 & 0x08) && !(hmd.mdat.mflags1 & 0x00100000)) {
        await hit_projectile(mshot_xname(obj), mon, ' but does no harm.');
        await wakeup_attack(mon, true);
        hmd.doreturn = hmd.retval = true;
        return;
    }
    hmd.saved_oname = artifact_light(obj) && obj.lamplit
        ? bare_artifactname(obj) : cxname_sh(obj);
    if (obj.oclass === WEAPON_CLASS || is_weptool(obj) || obj.oclass === GEM_CLASS) {
        await weaponHit(hmd, mon, obj, u, u.uwep);
        if (!hmd.doreturn && hmd.use_weapon_skill) {
            hmd.lightobj = hmon_hitmon_lightobj(obj, mon);
            if (u.usteed && !hmd.thrown && hmd.dmg > 0
                && weapon_type(obj) === P_LANCE && mon !== u.ustuck) {
                hmd.jousting = joust(mon, obj);
                if (hmd.jousting) hmd.train_weapon_skill = true;
            }
            if (permapoisoned(obj) && hmd.dieroll <= 5) hmd.ispoisoned = true;
        }
    } else if (obj.oclass === POTION_CLASS) {
        if (obj.quan > 1) obj = await splitobj(obj, 1);
        else await setuwep(null);
        freeinv(obj);
        await potionhit(mon, obj, hmd.hand_to_hand ? 0 : 1);
        if (mon.mhp < 1) {
            hmd.doreturn = true;
            hmd.retval = false;
            return;
        }
        hmd.hittxt = true;
        hmd.mdat = mon.data;
        hmd.dmg = hmd.mdat.pmidx === PM_SHADE ? 0 : 1;
    } else if (hmd.mdat.pmidx === PM_SHADE && !hmon_shade_aware(obj)) {
        hmd.dmg = 0;
    } else if (obj.otyp === 230 /* MIRROR */) {
        await hmon_hitmon_mirror(hmd, obj);
    } else {
        await miscHit(hmd, mon, obj);
    }
}

// C uhitm.c:1435-1506. Derive bonuses after artifact effects, before poison.
export async function hmon_hitmon_dmg_recalc(hmd, obj) {
    const u = game.u;
    const uwep = u.uwep;
    const ammoAndLauncher = (ammo, launcher) => !!ammo && !!launcher
        && _uh_is_ammo(ammo)
        && sr_oc_skill(ammo.otyp) === -sr_oc_skill(launcher.otyp);
    let bonus = 0;
    if (hmd.get_dmg_bonus) {
        bonus = u.udaminc | 0;
        if (hmd.thrown !== HMON_THROWN || !obj || !uwep || !ammoAndLauncher(obj, uwep)) {
            let strength = dbon();
            const abs = Math.abs(strength);
            if (hmd.twohits)
                strength = Math.trunc((3 * abs + 2) / 4) * Math.sign(strength);
            else if (hmd.thrown === HMON_MELEE && uwep && bimanual(uwep))
                strength = Math.trunc((3 * abs + 1) / 2) * Math.sign(strength);
            bonus += strength;
        }
    }
    if (hmd.use_weapon_skill) {
        const skillwep = _uh_is_ammo(obj) && ammoAndLauncher(obj, uwep) ? uwep : obj;
        bonus += await weapon_dam_bonus(skillwep);
        if (hmd.train_weapon_skill)
            await use_skill(hmd.thrown ? weapon_type(skillwep) : uwep_skill_type(), 1);
    }
    hmd.dmg = Math.max(1, hmd.dmg + bonus);
}

// C uhitm.c:1509-1537. Shared by melee and thrown hits; keep wear-off first.
export async function hmon_hitmon_poison(hmd, mon, obj) {
    const u = game.u;
    const nopoison = Math.max(2, 10 - Math.trunc((obj.owt | 0) / 10));
    if (Role_if(PM_SAMURAI)) {
        await You('dishonorably use a poisoned weapon!');
        adjalign(-Math.sign(u.ualign.type));
    } else if (u.ualign.type === A_LAWFUL && u.ualign.record > -10) {
        await You_feel_uh('like an evil coward for using a poisoned weapon.');
        adjalign(-1);
    }
    if (!permapoisoned(obj) && !rn2(nopoison)) {
        obj.opoisoned = false;
        hmd.unpoisonmsg = true;
    }
    if (resists_poison_uh(mon)) hmd.needpoismsg = true;
    else if (rn2(10)) hmd.dmg += rnd(6);
    else hmd.poiskilled = true;
}

// C uhitm.c:1825-1833: these effects happen after poison and before HP loss.
export async function hmon_hitmon_special(hmd, mon, obj) {
    if (hmd.jousting) await hmon_hitmon_jousting(hmd, mon, obj);
    else if (hmd.unarmed && hmd.dmg > 1 && !hmd.thrown && !obj && !Upolyd(game.u))
        await hmon_hitmon_stagger(hmd, mon);
}

// C uhitm.c:1942-1961. A trap can kill, migrate, or transform the target.
async function hmon_mhurtle_to_doom(hmd, mon) {
    if (hmd.dmg < mon.mhp) {
        await mhurtle(mon, game.u.dx | 0, game.u.dy | 0, 1);
        hmd.mdat = mon.data;
        if (mon.mhp < 1) hmd.already_killed = true;
    }
}

// C uhitm.c:1540-1566. C only nulls its local obj after consuming the lance.
async function hmon_hitmon_jousting(hmd, mon, obj) {
    const u = game.u;
    hmd.dmg += d(2, obj === u.uwep ? 10 : 2);
    await pline('You joust ' + mon_nam(mon) + (canseemon(mon) ? exclam(hmd.dmg) : '.'));
    if ((u.uconduct?.weaphit | 0) <= 1) first_weapon_hit(obj);
    if (hmd.jousting < 0) {
        set_twoweap(false);
        if (obj === u.uwep) await uwepgone();
        await pline(Yname2(obj) + ' shatters on impact!');
        await useup(obj);
    }
    await hmon_mhurtle_to_doom(hmd, mon);
    hmd.hittxt = true;
}

// C uhitm.c:1569-1584: draw before testing size and skin.
async function hmon_hitmon_stagger(hmd, mon) {
    if (rnd(100) < P_SKILL(P_BARE_HANDED_COMBAT)
        && (hmd.mdat.msize | 0) < MZ_LARGE && !thick_skinned(hmd.mdat)) {
        if (canspotmon(mon))
            await pline(Monnam(mon) + ' ' + makeplural(stagger(mon.data, 'stagger'))
                + ' from your powerful strike!');
        await hmon_mhurtle_to_doom(hmd, mon);
        hmd.hittxt = true;
    }
}

// C uhitm.c:1587-1600; HP and destroyed must already be updated by the caller.
export async function hmon_hitmon_pet(hmd, mon) {
    if (mon.mtame && hmd.dmg > 0) {
        /* C uhitm.c:1845 already applied a lethal blow, but killed() has not
         * run: the pet is still on svl.level.monsters, so abuse_dog's
         * newsym (dog.c:1393) sees it through m_at (rm.h:534). Set both
         * _zeroHpOnGrid and _dyingInGrid so m_at (display.js and uhitm.js)
         * finds the zero-HP pet on the grid. */
        const zeroHp = (mon.mhp | 0) < 1;
        if (zeroHp) { mon._zeroHpOnGrid = true; mon._dyingInGrid = true; }
        try { abuse_dog(mon); } finally { if (zeroHp) { mon._zeroHpOnGrid = false; mon._dyingInGrid = false; } }
        if (mon.mtame && !hmd.destroyed)
            await monflee(mon, 10 * rnd(hmd.dmg), false, false);
    }
}

// C uhitm.c:1603-1633.
const IRON_UH = 11, METAL_UH = 12; /* objclass.h materials */
export async function hmon_hitmon_splitmon(hmd, mon, obj) {
    const u = game.u;
    if ((hmd.mdat.pmidx === PM_BLACK_PUDDING || hmd.mdat.pmidx === PM_BROWN_PUDDING)
        && mon.mhp > 1 && !mon.mcan && !hmd.offmap && obj
        && (obj === u.uwep || (u.twoweap && obj === u.uswapwep))
        && (hmd.material === IRON_UH || hmd.material === METAL_UH)
        && !(_uh_is_ammo(obj) || _uh_is_missile(obj)) && hmd.hand_to_hand) {
        const clone = await clone_mon_ml(mon, 0, 0);
        if (clone) {
            const withwhat = u.twoweap && game.flags?.verbose ? ' with ' + yname(obj) : '';
            await pline(Monnam(mon) + ' divides as you hit it' + withwhat + '!');
            hmd.hittxt = true;
            await mintrap(clone, NO_TRAP_FLAGS);
        }
    }
}

// C uhitm.c:1636-1659: the weapon is this hit's object, including off-hand.
export async function hmon_hitmon_msg_hit(hmd, mon, obj) {
    const shot = game.gm?.m_shot;
    if (!hmd.hittxt && (!hmd.destroyed
        || (hmd.thrown && (shot?.n | 0) > 1 && shot.o === obj.otyp))) {
        if (hmd.thrown) await hit_projectile(mshot_xname(obj), mon, exclam(hmd.dmg));
        else if (!(game.flags?.verbose ?? true)) await pline('You hit it.');
        else await pline('You ' + _hmon_hit_verb(obj) + ' ' + mon_nam(mon)
            + (canseemon(mon) ? exclam(hmd.dmg) : '.'));
    }
}

/* C mondata.h:30-31 amorphous(ptr) / noncorporeal(ptr) */
const S_GHOST = 54;
const M1_AMORPHOUS = 0x00000004;
function noncorporeal(ptr) { return !!ptr && (ptr.mlet | 0) === S_GHOST; }
function amorphous(ptr) { return !!ptr && !!((ptr.mflags1 | 0) & M1_AMORPHOUS); }

// C uhitm.c:1662-1698: saved_oname predates destruction and poison removal.
export async function hmon_hitmon_msg_silver(hmd, mon) {
    let whom = mon_nam(mon);
    let prefix;
    const spotted = canspotmon(mon);
    if (spotted) {
        if (hmd.barehand_silver_rings === 1) prefix = 'Your silver ring sears';
        else if (hmd.barehand_silver_rings === 2) prefix = 'Your silver rings sear';
        else if (hmd.silverobj && hmd.saved_oname) {
            const name = hmd.saved_oname;
            prefix = `Your ${/silver/i.test(name) ? '' : 'silver '}${name} ${vtense(name, 'sear')}`;
        } else prefix = 'The silver sears';
    } else whom = whom.charAt(0).toUpperCase() + whom.slice(1);
    if (!noncorporeal(hmd.mdat) && !amorphous(hmd.mdat))
        whom = s_suffix(whom) + ' flesh';
    await pline(spotted ? `${prefix} ${whom}!` : `${whom} is seared!`);
}

/* C uhitm.c:918-930 backstabbable — can monster be stabbed in the back? */
export function backstabbable(mon) {
    const ptr = mon?.data;
    const mlet = ptr?.mlet | 0;
    return !!ptr
        && (((ptr.mflags1 | 0) & 0x00000004) === 0) /* !amorphous */
        && mlet !== 22  /* !is_whirly: S_VORTEX */
        && (ptr.pmidx | 0) !== 154 /* PM_AIR_ELEMENTAL */
        && mlet !== 54  /* !noncorporeal: S_GHOST */
        && mlet !== 2   /* S_BLOB */
        && mlet !== 5   /* S_EYE */
        && mlet !== 32  /* S_FUNGUS */
        && canseemon(mon)
        && (!!mon.mflee || helpless(mon));
}

// C uhitm.c:1038-1041 and mondata.c:547-550.
function hmon_hitmon_lightobj(obj, mon) {
    return !!(artifact_light(obj) && obj.lamplit && mon.data.pmidx === PM_GREMLIN);
}

// C uhitm.c:1701-1730.
export async function hmon_hitmon_msg_lightobj(hmd, mon) {
    let whom = mon_nam(mon);
    const spotted = canspotmon(mon);
    if (!spotted) whom = whom.charAt(0).toUpperCase() + whom.slice(1);
    if (!noncorporeal(hmd.mdat) && !amorphous(hmd.mdat))
        whom = s_suffix(whom) + ' flesh';
    const prefix = hmd.saved_oname
        ? s_suffix(hmd.saved_oname) + ' radiance penetrates deep into' : 'The light sears';
    await pline(spotted ? `${prefix} ${whom}!` : `${whom} is seared!`);
}

/* C ref: uhitm.c:1651-1658 — the verb inside hmon_hitmon_msg_hit's verbose arm:
 *   (is_shield(obj) || obj->otyp == HEAVY_IRON_BALL)          -> "bash"
 *   (objects[obj->otyp].oc_skill == P_WHIP || is_wet_towel)   -> "lash"
 *   Role_if(PM_BARBARIAN)                                     -> "smite"
 *   otherwise                                                 -> "hit"
 * is_shield is shared with the armor code in do_wear.js. */
const HEAVY_IRON_BALL_HV = 477;   /* objects.h BALL_CLASS heavy iron ball */
const OTYP_TOWEL_HV = 234;
const P_WHIP_HV = 26;
function _hmon_hit_verb(obj) {
    if (is_shield(obj) || (obj && (obj.otyp | 0) === HEAVY_IRON_BALL_HV))
        return 'bash';
    if (obj && (((MKOBJ_OC_SKILL[obj.otyp | 0] | 0) === P_WHIP_HV)
                || ((obj.otyp | 0) === OTYP_TOWEL_HV && (obj.spe | 0) > 0)))
        return 'lash';
    if (Role_if(PM_BARBARIAN_HV))
        return 'smite';
    return 'hit';
}
const PM_BARBARIAN_HV = 332;   /* js/pm.generated.js PM_BARBARIAN */

function SET_BOTL() {
    if (game.disp) game.disp.botl = 1;
}
function SetVoice(mtmp, a, b, c) { /* no-op */ }
function Role_if(pm) {
    /* C: urole.mnum == pm */
    return !!(game.urole && game.urole.mnum === pm);
}
/* rloc — LOCAL STUB DELETED; the real body is imported from js/teleport.js.
 * It was `function rloc(magr, flags) { return true; }`: C's rloc
 * (teleport.c:1799) draws rnd(COLNO-1) + rn2(ROWNO) up to 50 times and then
 * an rn2() per candidate over a collect_coords() list, so returning TRUE with
 * no draws was an RNG hole, not a harmless default.  Both call sites here —
 * mhitm_ad_heal (C uhitm.c:4363) and mhitm_ad_tlpt (C uhitm.c:2945) — are
 * `(void) rloc(...)` in C, i.e. the return is discarded; they are wired to the
 * real synchronous rloc with no await and no async cascade. */

/* C pline.c verbalize(): emit the spoken line quoted on the topline. */

/* C mondata.h:69
 *   #define thick_skinned(ptr) (((ptr)->mflags1 & M1_THICK_HIDE) != 0L)
 * monflag.h:106 M1_THICK_HIDE = 0x00200000L ("has thick hide or scales").
 * mflags1 is a uint32 bitfield — read it unsigned (>>> 0) so a set high bit
 * can't wrap the operand negative. */
const M1_THICK_HIDE = 0x00200000;
function thick_skinned(pd) {
    return (((pd && pd.mflags1) >>> 0) & M1_THICK_HIDE) !== 0;
}
import { permapoisoned } from './artifact.js';
import { INVIS } from './const.js'; // relocate-fns
import { DISP_ALWAYS, DISP_END, GLYPHCLS_MON, MON_MCOLOR, MON_MLET, _hallucinating_dsp, _uprop, _wizmgender_attr, map_location, monster_symbol, random_monster, tmp_at } from './display.js'; // relocate-fns
import { exclam } from './zap.js'; // relocate-fns
import { is_safemon } from './display.js'; // relocate-fns
import { poisoned } from './attrib.js'; // relocate-fns
import { KILLED_BY_AN as KILLED_BY_AN_MU, KILLED_BY as KILLED_BY_MU } from './const.js'; // relocate-fns
import { is_uniq_mhu, type_is_pname_mhu, youmonst_data } from './mhitu.js'; // relocate-fns
import { the } from './objnam.js'; // relocate-fns
import { polymon } from './polyself.js'; // relocate-fns
import { change_luck } from './attrib.js'; // relocate-fns
import { ANTIMAGIC, EF_GREASE, EF_NONE, EF_VERBOSE, ERODE_BURN, ER_NOTHING, M_SEEN_ACID, M_SEEN_MAGR, NATTK, NEED_WEAPON as NEED_WEAPON_HM, NEUTRAL, P_KNIFE as P_KNIFE_HM, P_NONE as P_NONE_HM, P_SKILLED as P_SKILLED_HM, STONING } from './const.js'; // relocate-fns
import { bimanual as bimanual_mm } from './do_wear.js'; // relocate-fns
import { done_in_by as done_in_by_real } from './end.js'; // relocate-fns
import { explode } from './explode.js'; // relocate-fns
import { update_inventory } from './invent.js'; // relocate-fns
import { ureflects } from './muse.js'; // relocate-fns
import { AT_ENGL, AT_HUGS, AT_BUTT, AT_BOOM, AT_BITE, AT_CLAW, AT_KICK, AT_MAGC, AT_NONE, AT_SPIT, AT_STNG, AT_TUCH, AT_WEAP } from './const.js';
import { CREAM_PIE, PM_WATCHMAN, SPBOOK_CLASS, _OCLASS_WEAPON, _ammo_and_launcher_hmon, _is_ammo_hmon, _is_missile_hmon, _oc_skill_hmon, attk_protection, haseyes, is_undead, m_next2u, xm_Blind, xm_Hallucination } from './mhitm.js';
import { Adjmonnam } from './do_name.js';
import { killed } from './mon.js'; // relocate-fns
import { split_mon_ml as split_mon } from './mklev.js'; // relocate-fns
import { monnear } from './mon.js'; // relocate-fns
import { cxname, is_poisonable } from './objnam.js'; // relocate-fns
import { PM_ELF as PM_ELF_HM, PM_FLOATING_EYE, PM_HEALER as PM_HEALER_HM, PM_ROGUE as PM_ROGUE_HM, PM_SAMURAI as PM_SAMURAI_HM, PM_STEAM_VORTEX } from './pm.generated.js'; // relocate-fns
import { ugolemeffects } from './polyself.js'; // relocate-fns
import { erode_obj } from './trap.js'; // relocate-fns
import { S_LIGHT, _glyph_at, _glyph_ident, _haseyes, _hero_Deaf, _mhidden_region_tail, _steth_pmname } from './cmd.js';
import { set_msg_xy } from './pline.js'; // relocate-fns
import { ARTICLE_YOUR, M_AP_NOTHING } from './const.js'; // relocate-fns
import { shieldeff as shieldeff_gz, topl_force_break_now } from './display.js'; // relocate-fns
import { resists_blnd_by_arti } from './mondata.js'; // relocate-fns
import { look_at_object } from './pager.js'; // relocate-fns
import { experience, newexplevel } from './exper.js'; // relocate-fns
import { cloneu, u_slow_down } from './mhitu.js'; // relocate-fns
import { munslime, munstone } from './muse.js'; // relocate-fns
import { minstapetrify } from './trap.js'; // relocate-fns
import { artifact_hit, shade_glare, spec_abon, spec_dbon } from './artifact.js'; // relocate-fns
import { overexertion } from './hack.js'; // relocate-fns
import { mon_poly, xdrainenergym } from './mhitm.js'; // relocate-fns
import { y_monnam as y_monnam_qm } from './do_name.js'; // relocate-fns
import { unstuck as unstuck_dm } from './mon.js'; // relocate-fns
import { DEADMONSTER_dm, DOOR_TYP, MON_WEP_dm, Monnam_dm, sgn_dm, unsolid_dm } from './dogmove.js'; // relocate-fns
import { set_apparxy as set_apparxy_dm } from './monmove.js'; // relocate-fns
import { You_feel } from './pline.js'; // relocate-fns
import { abon, dbon, dmgval, hitval, setmnotwielded, special_dmgval, use_skill, uwep_skill_type, weapon_dam_bonus, weapon_hit_bonus, weapon_type } from './weapon.js'; // relocate-fns
import { corpse_chance, golemeffects, monkilled, xkilled } from './mon.js'; // relocate-fns
export { corpse_chance, monkilled, xkilled } from './mon.js'; // relocate-fns
export { AD_DCAY, AD_DGST, POTION_CLASS, _LL_CONDUCT_UHITM, _ac_blind, _uh_dealloc_and_bump, completelyburns, completelyrots, completelyrusts, is_vampshifter_uh }; // relocate-fns
export { abon, add_weapon_skill, autoreturn_weapon, can_advance, dbon, dmgval, hitval, lose_weapon_skill, monmightthrowwep, mwepgone, select_hwep, select_rwep, setmnotwielded, skill_level_name, skill_name, special_dmgval, use_skill, uwep_skill_type, weapon_dam_bonus, weapon_descr, weapon_type } from './weapon.js'; // relocate-fns
export { M1_WALLWALK_UH, OCLASS_WEAPON_SH, S_SNAKE_UH, TOOL_CLASS, WEAPON_WSDAM, W_WEP, You_feel_uh, _uh_martial_bonus, is_axe_dv, sh_oc_bimanual, sr_touch_petrifies, thick_skinned }; // relocate-fns
export { AT_BREA_UH, NON_PM_UH, RLOC_MSG }; // relocate-fns
export { overexert_hp, overexertion } from './hack.js'; // relocate-fns
export { artifact_hit, attacks, spec_dbon } from './artifact.js'; // relocate-fns
export { ARTI_SPEC, Antimagic_uh, M2_UNDEAD, M2_WERE_UH, MZ_LARGE, SHADE_GLARE_SILVER_MAT, _AC_ART_STORMBRINGER, _uh_Blind, resists_poison_uh, sh_resists_ston }; // relocate-fns
export { WEAPON_CLASS, _UH_M1_NOHANDS, sr_MON_WEP, sr_is_animal, sr_mindless, sr_oc_skill }; // relocate-fns
export { SET_BOTL }; // relocate-fns
export { experience, newexplevel } from './exper.js'; // relocate-fns
export { AD_BLND_UH, AD_DRLI_UH, AD_PHYS_UH, AD_SLIM_UH, AD_STON_UH, AD_WRAP_UH, AT_BUTT_UH, AT_MAGC_UH, AT_WEAP_UH, MONS_MATTK, NATTK_UH, NORMAL_SPEED_UH, S_EEL_UH, _MONS }; // relocate-fns
export { poisoned } from './attrib.js'; // relocate-fns
export { is_safemon } from './display.js'; // relocate-fns
export { _xk_hallu }; // relocate-fns
export { exclam } from './zap.js'; // relocate-fns
async function mhitm_really_poison(magr, mattk, mdef, mhm) {
    // C uhitm.c:3108-3117: finish each message before the next roll or effect.
    if (game.v?.vis && canspotmon(magr))
        await pline('%s %s was poisoned!', s_suffix(Monnam(magr)), mpoisons_subj(magr, mattk));
    if (resists_poison_uh(mdef)) {
        if (game.v?.vis && canspotmon(mdef) && canspotmon(magr))
            await pline_The("poison doesn't seem to affect %s.", mon_nam(mdef));
    } else {
        mhm.damage += rn1(10, 6);
        if (mhm.damage >= mdef.mhp && game.v?.vis && canspotmon(mdef))
            await pline_The('poison was deadly...');
    }
}
/* C do_name.c:1303 pmname(pm, mgender) and monst.h Mgender(mon).
 * Use makemon.js's canonical pmname table; the old local stubs always called
 * the attacker "it", corrupting the poison killer/name text for gendered
 * monsters without consuming or suppressing any C RNG. */

/* C ref: uhitm.c:349-359 mon_maybe_unparalyze(struct monst *mtmp) —
 *     if (!mtmp->mcanmove) {
 *         if (!rn2(10)) { mtmp->mcanmove = 1; mtmp->mfrozen = 0; }
 *     }
 * Every hero melee swing calls it between find_roll_to_hit() and the dieroll
 * (uhitm.c:708, :779, :802, :5520, :5570, :5771 and dokick.c:189).  Only the
 * two hitum() sites are wired here; the others sit on the polymorphed-hero
 * damageum() path and the Upolyd kick, neither of which this port reaches. */
export function mon_maybe_unparalyze(mtmp) {
    if (!mtmp)
        return;
    if (!(mtmp.mcanmove | 0)) {
        if (!rn2(10)) {
            mtmp.mcanmove = 1;
            mtmp.mfrozen = 0;
        }
    }
}

function is_vampshifter_uh(m) { const c = m.cham | 0; return c === 226 || c === 227 || c === 228; } /* monst.h:215 */

/* C uhitm.c:1186-1219 hmon_hitmon_misc_obj case EGG, the petrifying-egg arm:
 * returns true when C takes its early `return` (hmd->doreturn set). */
export async function hmon_egg_petrify(hmd, mon, obj) {
    const cn = obj.corpsenm | 0;
    if (!(obj.corpsenm !== undefined && cn >= 0 && touch_petrifies_corpsenm(cn)))
        return false;
    const cnt = obj.quan | 0;
    hmd.dmg = 1; /* nominal physical damage */
    hmd.get_dmg_bonus = false;
    hmd.hittxt = true; /* message always given */
    if (obj === game.u.uwep) game.unweapon = true;
    if (obj.spe) {
        if ((obj.quan | 0) < 5) change_luck_uh(-(obj.quan | 0));
        else change_luck_uh(-5);
    }
    const nm = obj.known ? (permonstTemplate(cn)?.pmnames?.[2] ?? 'petrifying') : 'petrifying';
    await pline(`Splat!  You hit ${mon_nam(mon)} with ${obj.known ? 'the' : cnt > 1 ? 'some' : 'a'} ${nm} egg${cnt === 1 ? '' : 's'}!`);
    obj.known = 1;
    if (hmd.thrown) await obfree(obj, null); /* useup_eggs: obfree (dealloc_obj stops the hatch timer) */
    else await useupall(obj);
    if (!(await munstone(mon, true)))
        await minstapetrify(mon, true);
    if (sh_resists_ston(mon))
        return false;
    hmd.doreturn = true;
    hmd.retval = (mon.mhp | 0) > 0;
    return true;
}

/* C uhitm.c:4931-4943 start_engulf(mdef) — the DISPLAY half only; the
 * "You engulf/swallow <mdef>!" message is printed by the caller in the C order.
 *     if (!Invisible) {
 *         map_location(u.ux, u.uy, TRUE);
 *         tmp_at(DISP_ALWAYS, mon_to_glyph(&gy.youmonst, rn2_on_display_rng));
 *         tmp_at(mdef->mx, mdef->my);
 *     }
 * The hero's own square is re-mapped (it stops showing the hero while
 * engulfing) and the hero's glyph is flashed on the target's square until
 * end_engulf().  Unlike hero_glyph, mon_to_glyph applies what_mon(), so the
 * temporary monster is randomized while hallucinating. */
export function start_engulf(mdef) {
    const u = game.u || {};
    const invisP = _uprop(INVIS);
    const Invis = !!((invisP.i || invisP.e) && !invisP.b);
    const siP = _uprop(SEE_INVIS);
    const Invisible = Invis && !(siP.i || siP.e);
    if (!Invisible) {
        map_location(u.ux, u.uy, true);
        /* C display.h:554-556: use what_mon()'s result as well as its draw. */
        const mndx = _hallucinating_dsp() ? random_monster() : (u.umonnum | 0);
        tmp_at(DISP_ALWAYS, {
            ch: monster_symbol(MON_MLET[mndx]), color: MON_MCOLOR[mndx],
            cls: GLYPHCLS_MON, attr: _wizmgender_attr(game.youmonst?.female),
        });
        tmp_at(mdef.mx, mdef.my);
    }
}

/* C uhitm.c:4947-4956 end_engulf(void): clear the engulf flash and repaint the
 * hero's square.  Called from gulpum() after xkilled() on the digest arm and
 * unconditionally before the damage on the non-digest arms. */
export function end_engulf() {
    const u = game.u || {};
    const invisP = _uprop(INVIS);
    const Invis = !!((invisP.i || invisP.e) && !invisP.b);
    const siP = _uprop(SEE_INVIS);
    const Invisible = Invis && !(siP.i || siP.e);
    if (!Invisible) {
        tmp_at(DISP_END, 0);
        newsym(u.ux, u.uy);
    }
}

// Unported callees (charter: stub, do not port). Neither is ever reached by
// draws any RNG, so that branch never fires).

/* C uhitm.c:3924 do_stone_u — hero stoning transition and killer attribution. */
export async function do_stone_u(magr) {
    const u = game.u || {};
    const props = u.uprops || {};
    const stoned = props[18] || props.STONED;
    const stoneRes = props[8] || props.STONE_RES;
    if ((stoned?.intrinsic | 0) || (stoneRes?.intrinsic | 0) || (stoneRes?.extrinsic | 0))
        return false;
    /* C uhitm.c:3926-3928: a golem-polyd hero turns into a stone golem instead */
    if (poly_when_stoned(youmonst_data(game)) && await polymon(PM_STONE_GOLEM))
        return false;
    const data = magr?.data || {};
    let kformat = KILLED_BY_AN_MU;
    let kname = pmname(data, Mgender(magr));
    if (is_uniq_mhu(magr)) {
        if (!type_is_pname_mhu(magr)) kname = the(kname);
        kformat = KILLED_BY_MU;
    }
    /* C uhitm.c:3924-3937: this state transition must complete before the
     * attack returns.  make_stoned updates the delayed killer and bottom line
     * asynchronously in the JS port, so await it rather than dropping its
     * promise and letting knockback run first. */
    await make_stoned(5, null, kformat, kname);
    return true;
}

/* C youprop.h resistance macros: both intrinsic and extrinsic property bits
 * contribute to the hero's resistance. */
function _hero_prop_active(prop) {
    const p = game.u?.uprops?.[prop];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}

function _hero_blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)) && !(p?.blocked | 0);
}

/* ---------------------------------------------------------------------------
 * Damage-type constants (monattk.h) — inlined as locals.
 * ---------------------------------------------------------------------------
 */
const AD_MAGM = 1;

/* make_stunned — MODULE-LOCAL STUB DELETED.  Imported and re-exported at the
 * top of this file; see that comment.  This file's one call site
 * (uhitm.c:6086: `if (!Stunned) make_stunned((long)tmp, TRUE)`, the
 * floating-eye-touch stun) was silently dropped by the stub. */
/* nomul — MODULE-LOCAL STUB DELETED.  The real body (js/allmain.js:723,
 * C ref: hack.c:4068) is imported at the top of this file; it already backs
 * 17 other files including this one's sibling uhitm.js.  The stub shadowed it
 * for this file's three call sites (uhitm.c:6043 floating-eye touch/paralysis
 * delay, uhitm.c's gelatinous-cube nomul(-tmp) below it, and the
 * svc.context.run nomul(0) further down this file). */
/* change_luck — MODULE-LOCAL STUB DELETED.  The real body (js/attrib.js:621,
 * C ref: attrib.c:411-418) is imported at the top of this file (attrib.js was
 * already imported here for exercise/acurr/arti_*).  Verified byte-for-byte
 * against attrib.c.  RNG-free.  The stub dropped this file's one call site
 * (uhitm.c:6052, the blind-monster-touch luck penalty). */
/* healmon — MODULE-LOCAL STUB DELETED.  The real body (js/mklev.js:17228,
 * C ref: mon.c:4596) is imported at the top of this file (mklev.js was
 * already imported here for setmangry/wake_msg/wake_nearto).  Verified
 * byte-for-byte against C, including the youmonst branch this file never
 * exercises.  RNG-free (the rn2(2) in this file's one call site is drawn
 * by the CALLER, C uhitm.c:6080, before healmon() runs).  The stub silently
 * dropped that heal — the AD_COLD passive counterattack heals the attacking
 * monster and this call site had no effect at all. */
function done_in_by(mon, how) { return done_in_by_real(mon, how); }

/* canseemon is NOT a stub here — the real one (js/display.js:3105, C ref
 * display.h:129) is imported at the top of this file.  A module-local
 * `function canseemon(){ return false; }` used to shadow that import, which
 * silently forced the "can't see it" branch everywhere in this file. */
/* ureflects — MODULE-LOCAL STUB DELETED.  C ref: muse.c:2836-2866.  This file
 * carried `export function ureflects(_fmt,_arg1,_arg2){ return false; }`, which
 * shadowed the real body (js/makemon.js:7055) for this file's one call site,
 * passive()'s AD_PLYS floating-eye arm (C uhitm.c:6023-6031).  The stub forced
 * "not reflected" unconditionally: a hero wearing a shield of reflection, an
 * amulet of reflection, silver dragon scale mail or wielding a reflecting
 * artifact was frozen by the gaze anyway, and the rn2(4) hallucination roll and
 * the rn2(4)/-127 nomul() roll C never reaches were drawn.  The export is a
 * statement-for-statement transliteration of C's five-arm outermost-to-innermost
 * chain (W_ARMS shield / W_WEP weapon / W_AMUL medallion / W_ARM
 * uskin?"luster":"armor" / silver-dragon "scales"), RNG-free itself.  Nothing
 * imported ureflects FROM this file (grepped: mcastu.js, uhitm.js, zap.js and
 * mhitu.js all take it from js/makemon.js), so dropping the re-export is safe.
 * No new module edge: this file already imports from js/makemon.js (above) and
 * js/makemon.js already imports from this file, so the cycle predates the
 * change; neither module calls across it at module-init time.
 * Imported above instead of re-derived. */
export async function erode_armor(mdef, hurt) {
    const targetMon = mdef?.u ? game.youmonst : mdef;
    while (true) {
        let target = null;
        switch (rn2(5)) {
        case 0:
            target = which_armor(targetMon, W_ARMH);
            if (!target || await erode_obj(target, xname(target), hurt, EF_GREASE) === ER_NOTHING)
                continue;
            break;
        case 1:
            target = which_armor(targetMon, W_ARMC);
            if (target) {
                await erode_obj(target, xname(target), hurt, EF_GREASE | EF_VERBOSE);
            } else if ((target = which_armor(targetMon, W_ARM))) {
                await erode_obj(target, xname(target), hurt, EF_GREASE | EF_VERBOSE);
            } else if ((target = which_armor(targetMon, W_ARMU))) {
                await erode_obj(target, xname(target), hurt, EF_GREASE | EF_VERBOSE);
            }
            break;
        case 2:
            target = which_armor(targetMon, W_ARMS);
            if (!target || await erode_obj(target, xname(target), hurt, EF_GREASE) === ER_NOTHING)
                continue;
            break;
        case 3:
            target = which_armor(targetMon, W_ARMG);
            if (!target || await erode_obj(target, xname(target), hurt, EF_GREASE) === ER_NOTHING)
                continue;
            break;
        case 4:
            target = which_armor(targetMon, W_ARMF);
            if (!target || await erode_obj(target, xname(target), hurt, EF_GREASE) === ER_NOTHING)
                continue;
            break;
        }
        return;
    }
}

/* ---------------------------------------------------------------------------
 * passive_obj — C ref: nethack-c/src/uhitm.c:6127-6196
 * Passive counterattack on the weapon/object that struck the monster.
 * Called from passive() after the hero has hit the monster.
 *
 * RNG sites:
 *   AD_FIRE: rn2(6) — erosion chance (and !PM_STEAM_VORTEX guard)
 *   AD_ACID: rn2(6) — erosion chance
 *   AD_RUST: no rn2 (always erodes when !mcan)
 *   AD_CORR: no rn2 (always erodes when !mcan)
 *   AD_ENCH: no rn2 inside this block
 * ---------------------------------------------------------------------------
 */
export async function passive_obj(mon, obj, mattk) {
    const ptr = mon.data;
    const mobjMndx = (mon.mndx ?? mon.mnum ?? 0) | 0;
    /* [this first bit is obsolete; we're not called with null anymore] */
    if (!obj) {
        /* C uhitm.c:6139: u.twoweap && uswapwep && !rn2(2) ? uswapwep : uwep */
        const u = game.u;
        const twoweap = !!(u && u.twoweap);
        const uswapwep = (u && u.uswapwep) || null;
        const uwep = (u && u.uwep) || null;
        if (twoweap && uswapwep && !rn2(2)) {
            obj = uswapwep;
        }
        else {
            obj = uwep;
        }
        if (!obj && mattk && mattk.adtyp === AD_ENCH) {
            obj = (u && u.uarmg) || null;
        }
        if (!obj)
            return;
    }
    /* if caller hasn't specified an attack, find one */
    if (!mattk) {
        const mattks = ptr && ptr.mattk;
        if (!mattks)
            return;
        let i;
        for (i = 0;; i++) {
            if (i >= NATTK)
                return; /* no passive attacks */
            if (mattks[i].aatyp === AT_NONE)
                break;
        }
        mattk = mattks[i];
    }
    switch (mattk.adtyp) {
        case AD_FIRE:
            /* C uhitm.c:6159: if (!rn2(6) && !mon->mcan && mon->data != &mons[PM_STEAM_VORTEX]) */
            if (!rn2(6) && !mon.mcan && mobjMndx !== PM_STEAM_VORTEX) {
                /* C uhitm.c:6161: erode_obj(obj, NULL, ERODE_BURN, EF_NONE) — no EF_VERBOSE,
                 * so "not affected" stays silent; "Somehow, ... not affected" still
                 * prints for a visible oerodeproof item (trap.c erode_obj). */
                await erode_obj(obj, null, ERODE_BURN, EF_NONE);
            }
            break;
        case AD_ACID:
            /* C uhitm.c:6166: if (!rn2(6)) */
            if (!rn2(6)) {
                await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE);
            }
            break;
        case AD_RUST:
            /* C uhitm.c:6171: if (!mon->mcan) — no rn2 */
            if (!mon.mcan) {
                await erode_obj(obj, null, ERODE_RUST, EF_GREASE);
            }
            break;
        case AD_CORR:
            /* C uhitm.c:6175: if (!mon->mcan) — no rn2 */
            if (!mon.mcan) {
                await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE);
            }
            break;
        case AD_ENCH:
            /* C uhitm.c:6180-6184: notify only after a successful drain. */
            if (!mon.mcan) {
                if (await drain_item(obj, true)
                    && obj.where === OBJ_INVENT
                    && (obj.known || obj.oclass === ARMOR_CLASS)) {
                    await pline('%s less effective.', Yobjnam2(obj, 'seem'));
                }
            }
            break;
        default:
            break;
    }
    /* C uhitm.c:6193-6194. */
    if (obj.where === OBJ_INVENT)
        update_inventory();
}

/* ---------------------------------------------------------------------------
 * passive — C ref: nethack-c/src/uhitm.c:5866-6121
 *
 * Special (passive) attacks on the hero by monsters.
 * Called after hero lands a blow on (or is repelled by) a monster that has
 * a passive counterattack slot (mattk[i].aatyp == AT_NONE with adtyp != 0).
 *
 * Parameters:
 *   mon            — the monster being attacked
 *   weapon         — uwep / uswapwep / uarmg / uarmf / null
 *   mhitb          — true if hero's attack hit the monster
 *   maliveb        — true if monster is still alive after the attack
 *   aatyp          — the attack type the hero used (AT_WEAP, AT_KICK, ...)
 *   wep_was_destroyed — true if weapon was destroyed during the attack
 *
 * Returns: bitmask of M_ATTK_HIT | M_ATTK_DEF_DIED | M_ATTK_MISS
 *
 * RNG-critical: preserves exact C call ordering for all rn2/rnd/d calls.
 * ---------------------------------------------------------------------------
 */
export async function passive(mon, weapon, mhitb, maliveb, aatyp, wep_was_destroyed) {
    // C uhitm.c:5893-6117: pline blocks before subsequent damage and RNG.
    // Await each message so MSGTYPE=stop preserves those input boundaries.
    const ptr = mon.data;
    const mattks = ptr && ptr.mattk;
    /* C: ptr == &mons[PM_X] maps to JS: mndx === PM_X (mndx on the monst) */
    const mndx = (mon.mndx ?? mon.mnum ?? 0) | 0;
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    const malive = maliveb ? M_ATTK_HIT : M_ATTK_MISS;
    /* C uhitm.c:5879-5884 — find first AT_NONE slot (the passive attack). */
    let i;
    for (i = 0;; i++) {
        if (i >= NATTK)
            return (malive | mhit); /* no passive attacks */
        if (!mattks || mattks[i].aatyp === AT_NONE)
            break; /* found it */
    }
    const mattk = (mattks && mattks[i]) || { aatyp: AT_NONE, adtyp: 0, damn: 0, damd: 0 };
    /* C uhitm.c:5886-5891 — compute damage tmp.
     * Note: d(n,x) internally calls RND(x) n times — this IS the first RNG site
     * when the monster has damage dice. */
    let tmp = 0;
    if (mattk.damn) {
        tmp = d(mattk.damn | 0, mattk.damd | 0);
    }
    else if (mattk.damd) {
        tmp = d(((mon.m_lev | 0) + 1), mattk.damd | 0);
    }
    /* else tmp = 0 (no dice) */
    const u = game.u;
    const ux = (u && u.ux) | 0;
    const uy = (u && u.uy) | 0;
    /* ==================================================================
     * FIRST BLOCK: affects hero even if monster just died.
     * C uhitm.c:5893-6016
     * ================================================================== */
    switch (mattk.adtyp) {
        case AD_FIRE:
            /* C uhitm.c:5897: if (mhitb && !mon->mcan && weapon) */
            if (mhitb && !mon.mcan && weapon) {
                if (aatyp === AT_KICK) {
                    /* C uhitm.c:5899: if (uarmf && !rn2(6)) */
                    const uarmf = (u && u.uarmf) || null;
                    if (uarmf && !rn2(6)) {
                        await erode_obj(uarmf, xname(uarmf), ERODE_BURN, EF_GREASE | EF_VERBOSE);
                    }
                }
                else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                    || aatyp === AT_MAGC || aatyp === AT_TUCH) {
                    await passive_obj(mon, weapon, mattk);
                }
            }
            break;
        case AD_ACID:
            /* C uhitm.c:5908: if (mhitb && rn2(2)) */
            if (mhitb && rn2(2)) {
                const blind = _hero_blind();
                const verbose = !!(game.flags && game.flags.verbose !== false);
                if (blind || !verbose) {
                    await pline("You are splashed!");
                }
                else {
                    await pline(`You are splashed by ${s_suffix(mon_nam(mon))} ${hliquid("acid")}!`);
                }
                const acid_res = _hero_resists(ACID_RES);
                if (!acid_res) {
                    /* C mhitu.c:1925 mdamageu -> done_in_by runs IN PLACE: a lifesaved
                     * swallowed hero is expelled (unstuck rnd(2)) before the
                     * erode_armor draw below. */
                    const _deathBeforeAcid = game._pendingDeath || null;
                    await mdamageu(mon, tmp);
                    if (game._pendingDeath && game._pendingDeath !== _deathBeforeAcid) {
                        await drain_pending_death_in_place();
                        if (pending_death_is_final())
                            return (malive | mhit);
                    }
                    monstunseesu(M_SEEN_ACID);
                }
                else {
                    monstseesu(M_SEEN_ACID);
                }
                /* C uhitm.c:5921: if (!rn2(30)) erode_armor */
                if (!rn2(30)) {
                    await erode_armor(u && { u }, ERODE_CORRODE);
                }
            }
            /* C uhitm.c:5924: if (mhitb && weapon) */
            if (mhitb && weapon) {
                if (aatyp === AT_KICK) {
                    const uarmf = (u && u.uarmf) || null;
                    /* C uhitm.c:5926: if (uarmf && !rn2(6)) */
                    if (uarmf && !rn2(6)) {
                        await erode_obj(uarmf, xname(uarmf), ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
                    }
                }
                else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                    || aatyp === AT_MAGC || aatyp === AT_TUCH) {
                    await passive_obj(mon, weapon, mattk);
                }
            }
            /* C uhitm.c:5933: exercise(A_STR, FALSE) — may consume rn2(2) */
            exercise(A_STR, false);
            break;
        case AD_STON:
            if (mhitb) {
                let protector = attk_protection(aatyp | 0);
                /* C uhitm.c:5941: if (aatyp == AT_MAGC) protector = W_ARMG */
                if (aatyp === AT_MAGC)
                    protector = W_ARMG;
                const uarmg = (u && u.uarmg) || null;
                const uwep = (u && u.uwep) || null;
                const uarmf = (u && u.uarmf) || null;
                const uarmh = (u && u.uarmh) || null;
                const uarmc = (u && u.uarmc) || null;
                const stone_res = _hero_resists(STONE_RES);
                const unprotected = (protector === 0) ||
                    (protector === W_ARMG && !uarmg && !uwep && !wep_was_destroyed) ||
                    (protector === W_ARMF && !uarmf) ||
                    (protector === W_ARMH && !uarmh) ||
                    (protector === (W_ARMC | W_ARMG) && (!uarmc || !uarmg));
                if (unprotected) {
                    /* C uhitm.c:5949-5953: transform eligible hero forms before fatal stoning. */
                    const hero_uptr = (game.youmonst && game.youmonst.data)
                        ? game.youmonst.data
                        : permonstTemplate((u && u.umonnum) | 0);
                    if (!stone_res &&
                        !(hero_uptr && poly_when_stoned(hero_uptr)
                          && await polymon(PM_STONE_GOLEM))) {
                        done_in_by(mon, STONING);
                        // C uhitm.c:5952: done() returns here after lifesaving.
                        await drain_pending_death_in_place();
                        return M_ATTK_DEF_DIED;
                    }
                }
            }
            break;
        case AD_RUST:
            /* C uhitm.c:5960: if (mhitb && !mon->mcan && weapon) */
            if (mhitb && !mon.mcan && weapon) {
                if (aatyp === AT_KICK) {
                    const uarmf = (u && u.uarmf) || null;
                    /* C uhitm.c:5963: if (uarmf) — no rn2 on rust kick */
                    if (uarmf) {
                        await erode_obj(uarmf, xname(uarmf), ERODE_RUST, EF_GREASE | EF_VERBOSE);
                    }
                }
                else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                    || aatyp === AT_MAGC || aatyp === AT_TUCH) {
                    await passive_obj(mon, weapon, mattk);
                }
            }
            break;
        case AD_CORR:
            /* C uhitm.c:5971: if (mhitb && !mon->mcan && weapon) */
            if (mhitb && !mon.mcan && weapon) {
                if (aatyp === AT_KICK) {
                    const uarmf = (u && u.uarmf) || null;
                    /* C uhitm.c:5974: if (uarmf) — no rn2 on corrode kick */
                    if (uarmf) {
                        await erode_obj(uarmf, xname(uarmf), ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
                    }
                }
                else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                    || aatyp === AT_MAGC || aatyp === AT_TUCH) {
                    await passive_obj(mon, weapon, mattk);
                }
            }
            break;
        case AD_MAGM:
            {
                const antimagic = _hero_prop_active(ANTIMAGIC);
                if (antimagic) {
                    shieldeff(ux, uy);
                    monstseesu(M_SEEN_MAGR);
                    await pline("A hail of magic missiles narrowly misses you!");
                }
                else {
                    await pline("You are hit by magic missiles appearing from thin air!");
                    // C uhitm.c:5988 / mhitu.c:1925: done() runs before
                    // monstunseesu or the second passive block's rn2(3).
                    const deathBeforeMissiles = game._pendingDeath || null;
                    await mdamageu(mon, tmp);
                    if (game._pendingDeath && game._pendingDeath !== deathBeforeMissiles) {
                        await drain_pending_death_in_place();
                        if (pending_death_is_final())
                            return (malive | mhit);
                    }
                    monstunseesu(M_SEEN_MAGR);
                }
            }
            break;
        case AD_ENCH:
            /* C uhitm.c:5993: if (mhitb) */
            if (mhitb) {
                if (aatyp === AT_KICK) {
                    if (!weapon)
                        break;
                }
                else if (aatyp === AT_BITE || aatyp === AT_BUTT
                    || (aatyp >= AT_STNG && aatyp < AT_WEAP)) {
                    break; /* no object involved */
                }
                else {
                    /* TODO: #H2668 ring enchantment reduction */
                    ;
                }
                await passive_obj(mon, weapon, mattk);
            }
            break;
        default:
            break;
    }
    /* ==================================================================
     * SECOND BLOCK: affects hero only if monster still lives.
     * C uhitm.c:6020: if (malive && !mon->mcan && rn2(3))
     * ================================================================== */
    if (malive && !mon.mcan && rn2(3)) {
        switch (mattk.adtyp) {
            case AD_PLYS:
                /* C uhitm.c:6023: if (ptr == &mons[PM_FLOATING_EYE]) */
                if (mndx === PM_FLOATING_EYE) {
                    if (!canseemon(mon)) {
                        break;
                    }
                    if (mon.mcansee) {
                        if (await ureflects("%s gaze is reflected by your %s.", s_suffix(Monnam(mon)))) {
                            /* reflected — no further action */
                            ;
                        }
                        else {
                            const hallu = xm_Hallucination(); /* youprop.h:120: timeout && !resistance */
                            if (hallu && rn2(4)) {
                                /* C uhitm.c:6031 — hallucination message evasion */
                                await pline(`${Monnam(mon)} looks ${!rn2(2) ? "" : "rather "}${!rn2(2) ? "numb" : "stupefied"}.`);
                            }
                            else {
                                /* youprop.h:383 — Free_action is the EXTRINSIC slot only. */
                                const free_act = !!(game.u?.uprops?.[FREE_ACTION]?.extrinsic | 0); /* Free_action */
                                if (free_act) {
                                    await pline(`You momentarily stiffen under ${s_suffix(mon_nam(mon))} gaze!`);
                                }
                                else {
                                    await pline(`You are frozen by ${s_suffix(mon_nam(mon))} gaze!`);
                                    /* C uhitm.c:6043: nomul((ACURR(A_WIS) > 12 || rn2(4)) ? -tmp : -127) */
                                    const awis = (u ? acurr(u, A_WIS) : 0) | 0; /* C: ACURR(A_WIS) */
                                    nomul((awis > 12 || rn2(4)) ? -tmp : -127);
                                    dynamic_multi_reason(mon, "frozen", true);
                                    game.nomovemsg = 0; /* uhitm.c:6045 */
                                }
                            }
                        }
                    }
                    else {
                        /* C uhitm.c:6050: mon->mcansee == 0, monster is blind */
                        await pline(`${Adjmonnam(mon, "blind")} cannot defend itself.`);
                        /* C uhitm.c:6052: if (!rn2(500)) change_luck(-1) */
                        if (!rn2(500))
                            change_luck(-1);
                    }
                }
                else {
                    /* C uhitm.c:6055: Free_action — gelatinous cube else */
                    /* youprop.h:383 — Free_action is the EXTRINSIC slot only. */
                    const free_act = !!(game.u?.uprops?.[FREE_ACTION]?.extrinsic | 0);
                    if (free_act) {
                        await pline("You momentarily stiffen.");
                    }
                    else {
                        await pline(`You are frozen by ${mon_nam(mon)}!`);
                        game.nomovemsg = 'You can move again.'; /* uhitm.c:6058 You_can_move_again */
                        nomul(-tmp);
                        dynamic_multi_reason(mon, "frozen", false);
                        exercise(A_DEX, false);
                    }
                }
                break;
            case AD_COLD:
                /* C uhitm.c:6067: if (monnear(mon, u.ux, u.uy)) */
                if (monnear(mon, ux, uy)) {
                    const cold_res = _hero_resists(COLD_RES);
                    if (cold_res) {
                        shieldeff(ux, uy);
                        await pline("You feel a mild chill.");
                        monstseesu(M_SEEN_COLD);
                        ugolemeffects(AD_COLD, tmp);
                        break;
                    }
                    monstunseesu(M_SEEN_COLD);
                    await pline("You are suddenly very cold!");
                    // C uhitm.c:6077 / mhitu.c:1925: resolve death before
                    // healing or splitting; lifesaving or refusing death lets C return.
                    const deathBeforeCold = game._pendingDeath || null;
                    await mdamageu(mon, tmp);
                    if (game._pendingDeath && game._pendingDeath !== deathBeforeCold) {
                        await drain_pending_death_in_place();
                        if (pending_death_is_final())
                            return (malive | mhit);
                    }
                    /* C uhitm.c:6080: healmon(mon, (tmp + rn2(2)) / 2, (tmp + 1) / 2) */
                    healmon(mon, ((tmp + rn2(2)) / 2) | 0, ((tmp + 1) / 2) | 0);
                    if ((mon.mhpmax | 0) > (((mon.m_lev | 0) + 1) * 8))
                        await split_mon(mon, game.youmonst);
                }
                break;
            case AD_STUN:
                /* C uhitm.c:6086: if (!Stunned) make_stunned((long)tmp, TRUE) */
                {
                    const stunned = (u?.uprops?.[STUNNED]?.intrinsic | 0); /* youprop.h:81 */
                    if (!stunned)
                        make_stunned(tmp, true);
                }
                break;
            case AD_FIRE:
                /* C uhitm.c:6090: if (monnear(mon, u.ux, u.uy)) */
                if (monnear(mon, ux, uy)) {
                    const fire_res = _hero_resists(FIRE_RES);
                    if (fire_res) {
                        shieldeff(ux, uy);
                        await pline("You feel mildly warm.");
                        monstseesu(M_SEEN_FIRE);
                        ugolemeffects(AD_FIRE, tmp);
                        break;
                    }
                    monstunseesu(M_SEEN_FIRE);
                    await pline("You are suddenly very hot!");
                    // C uhitm.c:6100 / mhitu.c:1925: done() runs before
                    // passive returns to the hero's attack or kick.
                    const deathBeforeFire = game._pendingDeath || null;
                    await mdamageu(mon, tmp);
                    if (game._pendingDeath && game._pendingDeath !== deathBeforeFire) {
                        await drain_pending_death_in_place();
                        if (pending_death_is_final())
                            return (malive | mhit);
                    }
                }
                break;
            case AD_ELEC:
                /* C uhitm.c:6104-6114 */
                {
                    const shock_res = _hero_resists(SHOCK_RES);
                    if (shock_res) {
                        shieldeff(ux, uy);
                        await pline("You feel a mild tingle.");
                        monstseesu(M_SEEN_ELEC);
                        ugolemeffects(AD_ELEC, tmp);
                        break;
                    }
                    monstunseesu(M_SEEN_ELEC);
                    await pline("You are jolted with electricity!");
                    // C uhitm.c:6113 / mhitu.c:1925: resolve lethal damage
                    // at the same call site as the other passive attacks.
                    const deathBeforeElectricity = game._pendingDeath || null;
                    await mdamageu(mon, tmp);
                    if (game._pendingDeath && game._pendingDeath !== deathBeforeElectricity) {
                        await drain_pending_death_in_place();
                        if (pending_death_is_final())
                            return (malive | mhit);
                    }
                }
                break;
            default:
                break;
        }
    }
    return (malive | mhit);
}

export function shade_miss(magr, mdef, obj, thrown, verbose) {
    const youagr = is_youmonst(magr);
    const youdef = is_youmonst(mdef);

    /* we're using dmgval() for zero/not-zero, not for actual damage amount */
    /* C uhitm.c:2027 calls the one dmgval() (weapon.c:216).  It is the SAME
     * function the hero's own melee path uses, and it CONSUMES RNG
     * (rnd(oc_wsdam)/rnd(oc_wldam) plus the per-otyp bonus dice) even when
     * the caller only wants zero/not-zero — so it must be the real body, not
     * a predicate.  js/uhitm.js:1442 is that body; it is imported above as
     * dmgval_weapon (aliased only because this file used to carry a
     * shadowing throw-stub of the same name). */
    if ((mdef.data.pmidx | 0) !== PM_SHADE || (obj && dmgval(obj, mdef)))
        return false;

    if (verbose
        && ((youdef || cansee(mdef.mx, mdef.my) || sensemon(mdef))
            || (youagr && m_next2u(mdef)))) {
        const harmlessly_thru = " harmlessly through ";

        const what = (!obj || shade_aware(obj)) ? "attack" : cxname(obj);
        const target = youdef ? "you" : mon_nam(mdef);
        /* js/display.js pline() takes ONE already-formatted string, not
         * printf varargs — the extra arguments were being dropped and the
         * literal "%s %s %s%s%s." was reaching the topline. */
        if (!thrown) {
            /* C uhitm.c:2039-2040: pline("%s %s %s%s%s.", whose, what,
             *   vtense(what, "pass"), harmlessly_thru, target); */
            const whose = youagr ? "Your" : s_suffix(Monnam(magr));
            pline(`${whose} ${what} ${vtense(what, "pass")}${harmlessly_thru}${target}.`);
        } else {
            /* C uhitm.c:2042-2043: pline("%s %s%s%s.", The(what),
             *   vtense(what, "pass"), harmlessly_thru, target);
             * note: The(), not pline_The() */
            pline(`${The(what)} ${vtense(what, "pass")}${harmlessly_thru}${target}.`);
        }
        if (!youdef && !canspotmon(mdef))
            map_invisible(mdef.mx, mdef.my);
    }
    if (!youdef)
        mdef.msleeping = 0;
    return true;
}

export async function hmon(mon, obj, thrown, dieroll) {
    const anger_guards = (mon.mpeaceful
        && (mon.ispriest || mon.isshk
            || mon.data?.pmidx === PM_WATCHMAN || mon.data?.pmidx === PM_WATCH_CAPTAIN));
    const result = await hmon_hitmon(mon, obj, thrown, dieroll);
    if (mon.ispriest && !rn2(2))
        await ghod_hitsu(mon);
    if (anger_guards) {
        await angry_guards(!!Deaf());  /* uhitm.c:832 */
    }
    return result;
}

const _MAT_SILVER_HMON = 14; /* oc_material SILVER (mkobj material encoding) */

/* C monst.h:246-248 troll_baned(m, o) — "is mon m (presumably just killed) a
 * troll and obj o Trollsbane?"  Pure, RNG-free.
 * S_TROLL = 46 (monsym.h, matches js/m_initweap.js:36 / js/mklev.js:208 /
 * js/cmd.js:41195 _MG_S_TROLL).  ART_TROLLSBANE = 17: counting
 * artilist.h's A(...) rows (ART_NONARTIFACT=0 for the leading "" row),
 * Trollsbane is the 18th row / 17th artifact — cross-checked against this
 * file's neighbours in that same enumeration, js/cmd.js's
 * ART_OGRESMASHER=16 (16th row before it) and ART_SUNSWORD=20 (3 rows after). */
const _S_TROLL_HMON = 46;

const _ART_TROLLSBANE_HMON = 17;

function troll_baned(mon, obj) {
    return !!(mon && mon.data && (mon.data.mlet | 0) === _S_TROLL_HMON
              && obj && (obj.oartifact | 0) === _ART_TROLLSBANE_HMON);
}

/* C obj.h:235 is_launcher: WEAPON && oc_skill in [P_BOW(20)..P_CROSSBOW(22)] */
function _is_launcher_hmon(otmp) {
    const sk = _oc_skill_hmon(otmp);
    return (otmp.oclass | 0) === _OCLASS_WEAPON && sk >= 20 && sk <= 22;
}

export async function hmon_hitmon(mon, obj, thrown, dieroll) {
    const u = game.u || {};
    const uwep = u.uwep || null;
    const uarm = u.uarm || null;
    const uarms = u.uarms || null;
    const gt_twohits = (game.gt && game.gt.twohits) ? (game.gt.twohits | 0) : 0;

    const hmd = {
        dmg: 0,
        thrown,
        twohits: thrown ? 0 : gt_twohits,
        dieroll,
        mdat: mon.data,
        use_weapon_skill: false,
        train_weapon_skill: false,
        barehand_silver_rings: 0,
        silvermsg: false,
        silverobj: false,
        lightobj: false,
        material: obj ? (MKOBJ_OC_MATERIAL[(obj.otyp | 0)] | 0) : 0 /* NO_MATERIAL */,
        jousting: 0,
        hittxt: false,
        get_dmg_bonus: true,
        unarmed: !uwep && !uarm && !uarms,
        hand_to_hand: (thrown === HMON_MELEE
            || (thrown === HMON_APPLIED && uwep && is_pole(uwep))),
        ispoisoned: false,
        unpoisonmsg: false,
        needpoismsg: false,
        poiskilled: false,
        already_killed: false,
        offmap: false,
        destroyed: false,
        dryit: false,
        doreturn: false,
        retval: false,
    };

    await _hmon_hitmon_do_hit(hmd, mon, obj, u, uwep);
    if (hmd.doreturn)
        return hmd.retval;

    if (hmd.dmg > 0)
        await hmon_hitmon_dmg_recalc(hmd, obj);

    if (hmd.ispoisoned) await hmon_hitmon_poison(hmd, mon, obj);
    if (hmd.dmg < 1) {
        const mon_is_shade = (mon.data && (mon.data.pmidx | 0) === PM_SHADE);
        hmd.dmg = (hmd.get_dmg_bonus && !mon_is_shade) ? 1 : 0;
        if (mon_is_shade && !hmd.hittxt && thrown !== HMON_THROWN && thrown !== HMON_KICKED)
            hmd.hittxt = shade_miss(game.youmonst, mon, obj, false, true);
    }

    await hmon_hitmon_special(hmd, mon, obj);
    let maybe_knockback = false;
    if (hmd.jousting) {
        /* handled by hmon_hitmon_special above */
    } else if (hmd.unarmed && hmd.dmg > 1 && !thrown && !obj && !Upolyd(u)) {
        /* handled by hmon_hitmon_special above */
    } else if (!hmd.unarmed && hmd.dmg > 1 && !thrown && !Upolyd(u)
               && !u.twoweap && uwep) {
        maybe_knockback = true;
    }

    if (!hmd.already_killed) {
        if (obj && (obj === uwep || (obj === u.uswapwep && u.twoweap))
            && (obj.oclass === _OCLASS_WEAPON || is_weptool(obj))
            && (thrown === HMON_MELEE || thrown === HMON_APPLIED)
            && !hmd.jousting && hmd.dmg > 0 && (u.uconduct?.weaphit | 0) <= 1)
            first_weapon_hit(obj);
        mon.mhp -= hmd.dmg;
    }
    if ((mon.mhp | 0) > (mon.mhpmax | 0))
        mon.mhp = mon.mhpmax;
    if ((mon.mx | 0) === 0)
        hmd.offmap = true;
    if ((mon.mhp | 0) < 1) /* DEADMONSTER */
        hmd.destroyed = true;

    await hmon_hitmon_pet(hmd, mon);
    await hmon_hitmon_splitmon(hmd, mon, obj);
    await hmon_hitmon_msg_hit(hmd, mon, obj);
    if (hmd.dryit) await dry_a_towel(obj, -1, true);
    if (hmd.silvermsg) await hmon_hitmon_msg_silver(hmd, mon);
    if (hmd.lightobj) await hmon_hitmon_msg_lightobj(hmd, mon);
    if (hmd.unpoisonmsg) hmd.saved_oname = cxname(obj);
    if (hmd.needpoismsg) await pline("The poison doesn't seem to affect " + mon_nam(mon) + '.');

    if (hmd.poiskilled) {
        pline('The poison was deadly...');
        if (!hmd.already_killed)
            await xkilled(mon, XKILL_NOMSG);
        hmd.destroyed = true;
    } else if (hmd.destroyed) {
        if (!hmd.already_killed) {
            game.gm = game.gm || {};
            if (troll_baned(mon, obj))
                game.gm.mkcorpstat_norevive = true;
            await killed(mon); /* takes care of most messages */
            game.gm.mkcorpstat_norevive = false;
        }
    } else if (u.umconf && hmd.hand_to_hand) {
        /* C uhitm.c:1911-1918,6315-6337: nohandglow precedes resist. */
        if (!mon.mconf) {
            const hands = makeplural(body_part(HAND));
            const altfeedback = _hero_blind()
                || (_hero_prop_active(INVIS) && !(u.uprops?.[INVIS]?.blocked | 0)
                    && !_hero_prop_active(SEE_INVIS));
            if (u.umconf === 1) {
                if (altfeedback) await pline('Your %s stop tingling.', hands);
                else await pline('Your %s stop glowing %s.', hands, hcolor('red'));
            } else {
                if (altfeedback) await pline('The tingling in your %s lessens.', hands);
                else await pline('Your %s no longer glow so brightly %s.', hands, hcolor('red'));
            }
            u.umconf--;
            if (!await resist(mon, SPBOOK_CLASS, 0, 0 /* NOTELL */)) {
                mon.mconf = 1;
                if (!mon.mstun && !helpless(mon) && canseemon(mon))
                    await pline('%s appears confused.', Monnam(mon));
            }
        }
    }

    if (hmd.unpoisonmsg) await pline(`Your ${hmd.saved_oname} ${vtense(hmd.saved_oname, 'are')} no longer poisoned.`);
    if (!hmd.destroyed && !hmd.offmap) {
        await wakeup_attack(mon, true);
        if (maybe_knockback && await hmon_hitmon_knockback(mon) && mon.mhp < 1)
            hmd.destroyed = true;
    }
    return hmd.destroyed ? false : true;
}

/* uhitm.c:1388 hmon_hitmon_do_hit */
async function _hmon_hitmon_do_hit(hmd, mon, obj, u, uwep) {
    await hmon_hitmon_do_hit(hmd, mon, obj, _hmon_hitmon_weapon, _hmon_hitmon_misc_obj);
}

/* uhitm.c:1071 hmon_hitmon_weapon — dispatch melee vs ranged */
async function _hmon_hitmon_weapon(hmd, mon, obj, u, uwep) {
    if (_is_launcher_hmon(obj)
        || (!hmd.thrown && (_is_missile_hmon(obj) || _is_ammo_hmon(obj)))
        || (_is_ammo_hmon(obj) && (hmd.thrown !== HMON_THROWN
                                   || !_ammo_and_launcher_hmon(obj, uwep)))) {
        _hmon_hitmon_weapon_ranged(hmd, mon, obj);
    } else {
        await hmon_hitmon_weapon_melee(hmd, mon, obj, u, uwep);
    }
}

/* uhitm.c:886 hmon_hitmon_weapon_ranged — 1-2 pts, no skill (boomerang etc.) */
function _hmon_hitmon_weapon_ranged(hmd, mon, obj) {
    if (hmd.mdat && (hmd.mdat.pmidx | 0) === PM_SHADE)
        hmd.dmg = 0;
    else
        hmd.dmg = rnd(2);
    if (hmd.material === _MAT_SILVER_HMON && mon_hates_silver(mon)) {
        hmd.silvermsg = hmd.silverobj = true;
        hmd.dmg += rnd((hmd.dmg) ? 20 : 10);
    }
    /* boomerang-splinter branch requires !thrown — skipped */
}

/* uhitm.c:935 hmon_hitmon_weapon_melee (also handles THROWN missiles/ammo) */
export async function hmon_hitmon_weapon_melee(hmd, mon, obj, u, uwep) {
    hmd.use_weapon_skill = true;
    hmd.dmg = dmgval(obj, mon);
    hmd.train_weapon_skill = (hmd.dmg > 1);

    /* C uhitm.c:948-951 Healer with anatomy knowledge */
    if ((game.urole?.mnum | 0) === PM_HEALER_HM && hmd.hand_to_hand
        && obj.oclass === _OCLASS_WEAPON
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) === P_KNIFE_HM)
        hmd.dmg += Math.min(3, Math.trunc(((game.mvitals?.[mon.data?.pmidx | 0]?.died) | 0) / 6));

    /* C uhitm.c:953-1013 special attack actions.  The Healer and backstab
     * arms need hand_to_hand; the shatter arm does not (a tethered aklys
     * thrown from the hand arrives as HMON_APPLIED with obj == uwep). */
    let monwep;
    if (!hmd.train_weapon_skill || mon === u.ustuck || u.twoweap
        || (hmd.hand_to_hand && is_art(obj, ART_CLEAVER_HM))) {
        ; /* no special bonuses */
    } else if ((game.urole?.mnum | 0) === PM_ROGUE_HM && backstabbable(mon)
               && !Upolyd(u) && hmd.hand_to_hand) {
        await You(`strike ${mon_nam(mon)} from behind!`);
        hmd.dmg += rnd(u.ulevel | 0);
        hmd.hittxt = true;
    } else if (hmd.dieroll === 2 && obj === uwep
               && obj.oclass === _OCLASS_WEAPON
               && (bimanual_mm(obj)
                   || ((game.urole?.mnum | 0) === PM_SAMURAI_HM
                       && (obj.otyp | 0) === KATANA_HM && !u.uarms))
               && (uwep_skill_type() !== P_NONE_HM
                   && P_SKILL(uwep_skill_type()) >= P_SKILLED_HM)
               && ((monwep = mon.mw) && !is_flimsy(monwep)
                   && !obj_resists(monwep,
                                   50 + 15 * (Math.max(obj.oeroded | 0, obj.oeroded2 | 0)
                                              - Math.max(monwep.oeroded | 0, monwep.oeroded2 | 0)),
                                   100))) {
        setmnotwielded(mon, monwep);
        mon.weapon_check = NEED_WEAPON_HM;
        let buf;
        if (canseemon(mon))
            buf = Yobjnam2(monwep, 'shatter');
        else
            buf = `${s_suffix(Monnam(mon))} weapon${(monwep.quan | 0) === 1 ? '' : 's'} ${otense(monwep, 'shatter')}`;
        await pline(buf + ' from the force of your blow!');
        await m_useupall(mon, monwep);
        /* If someone just shattered MY weapon, I'd flee! */
        if (rn2(4))
            await monflee(mon, d(2, 3), true, true);
        hmd.hittxt = true;
    }

    /* C uhitm.c:1015-1033: artifact_hit adds spec_dbon (rnd(24) for
     * Mjollnir) and may print its own message. */
    if (obj.oartifact) {
        const ah = await artifact_hit(null, mon, obj, hmd.dmg, hmd.dieroll);
        hmd.dmg = ah.dmg;
        if (ah.special) {
            if ((mon.mhp | 0) < 1) { /* DEADMONSTER */
                hmd.doreturn = true;
                hmd.retval = false;
                return;
            }
            if (hmd.dmg === 0) {
                hmd.doreturn = true;
                hmd.retval = true;
                return;
            }
            hmd.hittxt = true;
        }
    }
    if (hmd.material === _MAT_SILVER_HMON && mon_hates_silver(mon))
        hmd.silvermsg = hmd.silverobj = true;
    /* C uhitm.c:1038-1047 light and jousting: hmon_hitmon_do_hit (js/uhitm.js)
     * applies both after this returns, together with the permapoisoned arm. */

    if (hmd.thrown === HMON_THROWN
        && (_is_ammo_hmon(obj) || _is_missile_hmon(obj))) {
        if (_ammo_and_launcher_hmon(obj, uwep)) {
            if (((game.urole?.mnum | 0) === PM_SAMURAI_HM) && (obj.otyp | 0) === YA_HM
                && (uwep.otyp | 0) === YUMI_HM)
                hmd.dmg++;
            else if (((game.urace?.mnum | 0) === PM_ELF_HM) && (obj.otyp | 0) === ELVEN_ARROW_HM
                     && (uwep.otyp | 0) === ELVEN_BOW_HM)
                hmd.dmg++;
            hmd.train_weapon_skill = (hmd.dmg > 0);
        }
        if (obj.opoisoned && is_poisonable(obj))
            hmd.ispoisoned = true;
    }
    /* C uhitm.c:1064-1066 permapoisoned arm: hmon_hitmon_do_hit (js/uhitm.js)
     * applies it after this returns (no RNG in between). */
}

/* objects.h otyps / artilist.h / skills.h constants for the arms above. */
const ELVEN_ARROW_HM = 19, YA_HM = 22, KATANA_HM = 56, ELVEN_BOW_HM = 84, YUMI_HM = 86;

const ART_CLEAVER_HM = 4;

async function _hmon_hitmon_misc_obj(hmd, mon, obj) {
    /* C uhitm.c:1125-1130 — BOULDER 1d20, HEAVY_IRON_BALL 1d25, IRON_CHAIN 1d4+1 */
    if ((obj.otyp | 0) === SHADE_AWARE_BOULDER || (obj.otyp | 0) === SHADE_AWARE_HEAVY_IRON_BALL
        || (obj.otyp | 0) === SHADE_AWARE_IRON_CHAIN) {
        hmd.dmg = dmgval(obj, mon);
        return;
    }
    /* C uhitm.c:1186-1219 case EGG, petrifying arm. */
    if ((obj.otyp | 0) === 266 /* EGG */ && ismnum(obj.corpsenm)
        && touch_petrifies(permonstTemplate(obj.corpsenm))) {
        await hmon_egg_petrify(hmd, mon, obj);
        return;
    }
    /* C uhitm.c:1221-1256: ordinary thrown eggs, including petrification. */
    if ((obj.otyp | 0) === 266 /* EGG */ && hmd.thrown) {
        const cnt = obj.quan | 0;
        const cn = obj.corpsenm;
        hmd.dmg = 1; /* nominal physical damage */
        hmd.get_dmg_bonus = false;
        hmd.hittxt = true; /* message always given */
        if (obj.spe && ismnum(cn))
            change_luck(cnt < 5 ? -cnt : -5);
        const eggp = (ismnum(cn) && obj.known)
            ? 'the ' + permonstTemplate(cn).pmnames[NEUTRAL]
            : (cnt > 1) ? 'some' : 'an';
        await pline(`You hit ${mon_nam(mon)} with ${eggp} egg${cnt === 1 ? '' : 's'}.`);
        if (touch_petrifies(hmd.mdat) && game.moves - obj.age <= 400) {
            await pline(`The egg${cnt === 1 ? " isn't" : "s aren't"} alive any more...`);
            if (obj.timed) obj_stop_timers(obj);
            obj.otyp = 474; /* ROCK */
            obj.oclass = GEM_CLASS;
            obj.oartifact = obj.spe = obj.known = obj.dknown = obj.bknown = 0;
            obj.owt = weight(obj);
            place_object(obj, mon.mx, mon.my);
            return;
        }
        if ((cn | 0) === 11 /* PM_PYROLISK */) {
            await obfree(obj, null);
            await explode(mon.mx, mon.my, -11, d(3, 6), 0, 5 /* EXPL_FIERY */);
            hmd.doreturn = true;
            hmd.retval = mon.mhp > 0;
            return;
        }
        await pline('Splat!');
        await obfree(obj, null); /* useup_eggs: obfree (dealloc_obj stops the hatch timer) */
        exercise(A_WIS, false);
        return;
    }
    if ((obj.otyp | 0) === CREAM_PIE || (obj.otyp | 0) === BLINDING_VENOM_HM) {
        mon.msleeping = 0;
        /* C uhitm.c:1265-1268 — AT_SPIT for venom, AT_WEAP for a thrown pie. */
        const aatyp = ((obj.otyp | 0) === BLINDING_VENOM_HM) ? AT_SPIT : AT_WEAP;
        if (can_blnd(game.youmonst, mon, aatyp, obj)) {
            if (xm_Blind()) {
                pline((obj.otyp | 0) === CREAM_PIE ? 'Splat!' : 'Splash!');
            } else if ((obj.otyp | 0) === BLINDING_VENOM_HM) {
                pline(`The venom blinds ${mon_nam(mon)}${mon.mcansee ? '' : ' further'}!`);
            } else {
                /* C uhitm.c:1279-1291 */
                let whom = mon_nam(mon);
                const what = The(xname(obj));
                /* C:1282-1283 — the `!thrown && quan > 1` singular form cannot
                 * apply here: this arm is only reached on a throw. */
                if (haseyes(hmd.mdat) && (hmd.mdat.pmidx | 0) !== PM_FLOATING_EYE_HM)
                    whom = s_suffix(whom) + ' ' + mbodypart(mon, FACE_HM);
                pline(`${what} ${vtense(what, 'splash')} over ${whom}!`);
            }
            await setmangry(mon, true);
            mon.mcansee = 0;
            hmd.dmg = rn2(25) + 21;
            if (((mon.mblinded | 0) + hmd.dmg) > 127)
                mon.mblinded = 127;
            else
                mon.mblinded = (mon.mblinded | 0) + hmd.dmg;
        } else {
            /* C uhitm.c:1300-1302 */
            pline((obj.otyp | 0) === CREAM_PIE ? 'Splat!' : 'Splash!');
            await setmangry(mon, true);
        }
        game.thrownobj = null;
        hmd.hittxt = true;
        hmd.get_dmg_bonus = false;
        hmd.dmg = 0;   /* C uhitm.c:1317 — the pie itself does NO damage */
        return;
    }
    /* C uhitm.c:1319-1337 case ACID_VENOM (thrown or spit).  Unlike the pie
     * arm this one DOES damage: dmgval(obj, mon) unless the monster resists
     * acid, and it sets no blindness and no mangry.  The object is consumed
     * as obfree() when thrown, as useup() otherwise. */
    if ((obj.otyp | 0) === ACID_VENOM_HM) {
        const MR_ACID_HM = 0x40; /* monflag.h MR_ACID; see resists_acid above */
        const resistbits = ((mon.data ? (mon.data.mresists | 0) : 0)
                            | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
        if (resistbits & MR_ACID_HM) {
            pline(`Your venom hits ${mon_nam(mon)} harmlessly.`);
            hmd.dmg = 0;
        } else {
            pline(`Your venom burns ${mon_nam(mon)}!`);
            hmd.dmg = dmgval(obj, mon);
        }
        game.thrownobj = null;
        hmd.hittxt = true;
        hmd.get_dmg_bonus = false;
        return;
    }
    const mat = MKOBJ_OC_MATERIAL[(obj.otyp | 0)] | 0;
    const VEGGY = 3, PAPER = 5; /* objclass.h obj_material_types */
    if ((mat === VEGGY || mat === PAPER) && (obj.oclass | 0) !== 10 /* SPBOOK */) {
        hmd.dmg = 0;
        hmd.get_dmg_bonus = false;
        return;
    }
    let dmg = (((obj.owt | 0) + 99) / 100) | 0;
    dmg = (dmg <= 1) ? 1 : rnd(dmg);
    if (dmg > 6) dmg = 6;
    hmd.dmg = dmg;
    if (hmd.material === _MAT_SILVER_HMON && mon_hates_silver(mon)) {
        hmd.dmg += rnd(20);
        hmd.silvermsg = hmd.silverobj = true;
    }
    if (obj.blessed && mon_hates_blessings(mon))
        hmd.dmg += rnd(4);
}

/* shade_aware(obj) — C ref: nethack-c/src/uhitm.c:1993-2012.
 * "Is this object one that either affects shades, or is dealt with properly
 * by other routines when it comes to shades?"  Used by shade_miss() only, to
 * decide whether the pass-through message names the object or just says
 * "attack".  Draws no RNG and changes no state.
 *
 * C objclass.h:20 enum obj_material_types: SILVER = 14.
 * otyp constants from nethack-c/include/objects.h:
 *   MIRROR = 230, CLOVE_OF_GARLIC = 284, BOULDER = 475,
 *   HEAVY_IRON_BALL = 477, IRON_CHAIN = 478. */
const SHADE_AWARE_MIRROR = 230;

const SHADE_AWARE_CLOVE_OF_GARLIC = 284;

const SHADE_AWARE_BOULDER = 475;

const SHADE_AWARE_HEAVY_IRON_BALL = 477;

const SHADE_AWARE_IRON_CHAIN = 478;

const SHADE_AWARE_SILVER_MATERIAL = 14;

function shade_aware(obj) {
    /* C uhitm.c:1994-1995: if (!obj) return FALSE; */
    if (!obj)
        return false;
    const otyp = (obj.otyp | 0);
    /*
     * C uhitm.c:2005-2011.  The things in this list either
     * 1) affect shades, OR
     * 2) are dealt with properly by other routines when it comes to shades.
     */
    if (otyp === SHADE_AWARE_BOULDER
        || otyp === SHADE_AWARE_HEAVY_IRON_BALL
        || otyp === SHADE_AWARE_IRON_CHAIN      /* dmgval handles those first three */
        || otyp === SHADE_AWARE_MIRROR          /* silver in the reflective surface */
        || otyp === SHADE_AWARE_CLOVE_OF_GARLIC /* causes shades to flee */
        || (MKOBJ_OC_MATERIAL[otyp] | 0) === SHADE_AWARE_SILVER_MATERIAL)
        return true;
    /* C uhitm.c:2010: return FALSE; */
    return false;
}

const _cc_cache = new Map();

function _cc_role_mnum(name) {
    /* LAZY: js/mhitm.js and js/makemon.js are a module cycle, so calling
     * permonstTemplate at module-init time throws
     * "Cannot access 'NUMMONS' before initialization". */
    if (_cc_cache.has(name)) return _cc_cache.get(name);
    let found = -1;
    for (let i = 0; i < 400; i++) {
        const t = permonstTemplate(i);
        if (t && (t.pmnames || []).some((n) => n === name)) { found = i; break; }
    }
    _cc_cache.set(name, found);
    return found;
}

const PM_KNIGHT_CC = () => _cc_role_mnum('knight');

const PM_SAMURAI_CC = () => _cc_role_mnum('samurai');

export function check_caitiff(mtmp) {
    /* if (u.ualign.record <= -10) return */
    const rec = (game.u?.ualign?.record ?? 0) | 0;
    if (rec <= -10)
        return;

    /* Role_if(PM_KNIGHT) — PM_KNIGHT = 342 */
    /* C you.h:247 Role_if(X) := (gu.urole.mnum == (X)).  This read `game.urole
     * .malenum`, a field NOTHING in js/ writes -- js/roles.js:595 builds
     * game.urole with `mnum`, so the role test was permanently 0-vs-335 and
     * both arms were dead even before the wrong PM_ literals below. */
    const malenum = (game.urole?.mnum ?? -1) | 0;

    if (malenum === PM_KNIGHT_CC()
        && ((game.u?.ualign?.type ?? 0) | 0) === 1 /* A_LAWFUL */
        && !is_undead(mtmp.data)
        && (helpless(mtmp)
            || (mtmp.mflee && !mtmp.mavenge))) {
        You("caitiff!");
        adjalign(-1);
    } else if (malenum === PM_SAMURAI_CC() && mtmp.mpeaceful) {
        /* attacking peaceful creatures is bad for the samurai's giri */
        You("dishonorably attack the innocent!");
        adjalign(-1);
    }
}

/* objects.h VENOM() BLINDING_VENOM — js/cmd.js:32321. */
const BLINDING_VENOM_HM = 479;

const ACID_VENOM_HM = 480; /* objects.h:1642 VENOM_CLASS ACID_VENOM */

/* hack.h:133 FACE = 2.  (The AT_SPIT that used to be declared here said 7,
 * which is 5.0's AT_HUGS; the one live constant is the shared AT_SPIT above.) */
const FACE_HM = 2;

/* pm.generated.js PM_FLOATING_EYE. */
const PM_FLOATING_EYE_HM = PM_FLOATING_EYE;

const PM_WATCH_CAPTAIN = 283;             /* pm.generated.js */

/* C ref: uhitm.c:6425-6445 light_hits_gremlin(mon, dmg). */
export async function light_hits_gremlin(mon, dmg) {
    const g = game, u = g.u;
    if (!_hero_Deaf() && dist2(mon.mx | 0, mon.my | 0, u.ux | 0, u.uy | 0) <= 90) {
        set_msg_xy(mon.mx, mon.my);
        await pline(`${Monnam(mon)} ${(dmg > Math.trunc((mon.mhp | 0) / 2))
            ? 'wails in agony' : 'cries out in pain'}!`);
    } else if (canseemon(mon)) {
        set_msg_xy(mon.mx, mon.my);
        await pline(`${Monnam(mon)} recoils from the light!`);
    }
    mon.mhp = (mon.mhp | 0) - dmg;
    wake_nearto(mon.mx, mon.my, 30);
    if (DEADMONSTER(mon)) {
        if (g.context && g.context.mon_moving)
            await monkilled_trap(mon, null);
        else
            await killed(mon);
    } else if (cansee(mon.mx, mon.my) && !canspotmon(mon)) {
        map_invisible(mon.mx, mon.my);
    }
}

/* C ref: uhitm.c:6341-6425 flash_hits_mon(mtmp, otmp). */
export async function flash_hits_mon(mtmp, otmp) {
    const WAN_LIGHT = 410;
    const g = game;
    let res = 0;
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    if (g.gn && g.gn.notonhead)
        return 0;
    const lev = g.level?.locations?.[mx]?.[my];
    const useeit = canseemon(mtmp);

    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING) {
        const oldglyph = _glyph_ident(mx, my);
        // C pager.c:205-215: mhidden_description with MHID_ALTMON only.
        const glyph = g.level.flags.hero_memory ? lev.remembered_glyph : _glyph_at(mx, my);
        let whatbuf = M_AP_TYPE(mtmp) === M_AP_FURNITURE
            ? DEFSYM_EXPLANATION[mtmp.mappearance | 0]
            : M_AP_TYPE(mtmp) === M_AP_MONSTER ? _steth_pmname(mtmp.mappearance, mtmp)
            : glyph?.cls === GLYPHCLS_OBJ ? await look_at_object(mx, my, glyph, true) : 'something';
        const r = Math.max(1, g.u.xray_range | 0);
        if (dist2(g.u.ux, g.u.uy, mx, my) <= r * (r + 1))
            whatbuf += _mhidden_region_tail(mx, my); // pager.c:262-279
        await wakeup(mtmp, false);
        // C uhitm.c:6366-6373: only report a revelation the hero saw.
        if (_glyph_ident(mx, my) !== oldglyph) {
            await pline(`That ${whatbuf} is really ${x_monnam(mtmp,
                mtmp.mtame ? ARTICLE_YOUR : ARTICLE_A, null, 0, false)}${mtmp.mtame ? '.' : '!'}`);
            res = 1;
        }
    }

    if ((mtmp.msleeping | 0) && _haseyes(mtmp.data)) {
        mtmp.msleeping = 0;
        if (useeit) {
            await pline(`The flash awakens ${mon_nam(mtmp)}.`);
            res = 1;
        }
    } else if ((mtmp.data.mlet | 0) !== S_LIGHT) {
        if (!resists_blnd(mtmp)) {
            const tmp = dist2(otmp.ox | 0, otmp.oy | 0, mx, my);
            if (useeit) {
                await pline(`${Monnam(mtmp)} is blinded by the flash!`);
                res = 1;
            }
            if ((mtmp.data.pmidx | 0) === PM_GREMLIN) {
                /* Rule #1: Keep them out of the light. */
                const amt = ((otmp.otyp | 0) === WAN_LIGHT)
                    ? d(1 + (otmp.spe | 0), 4)
                    : rnd(Math.min(mtmp.mhp | 0, 4));
                await light_hits_gremlin(mtmp, amt);
            }
            if (!DEADMONSTER(mtmp)) {
                if (!(g.context && g.context.mon_moving))
                    await setmangry(mtmp, true);
                if (tmp < 9 && !mtmp.isshk && rn2(4))
                    await monflee(mtmp, rn2(4) ? rnd(100) : 0, false, true);
                mtmp.mcansee = 0;
                mtmp.mblinded = (tmp < 3) ? 0 : rnd(1 + Math.trunc(50 / tmp));
            }
        } else if (useeit) {
            if (resists_blnd_by_arti(mtmp))
                shieldeff_gz(mx, my);
            if (g.flags && g.flags.verbose) {
                if (lev && lev.lit)
                    await pline(`The flash of light shines on ${mon_nam(mtmp)}.`);
                else
                    await pline(`${Monnam(mtmp)} is illuminated.`);
                res = 2; /* 'message has been given' temporary value */
            }
        }
    }
    if (res) {
        if (!(lev && lev.lit))
            topl_force_break_now(); /* display_nhwindow(WIN_MESSAGE, TRUE) */
        res &= 1; /* change temporary 2 back to 0 */
    }
    return res;
}
export { AT_ENGL, AT_HUGS };

/* C mondata.c sticks(ptr) — grabbing-attack check; not modeled (rare for the
 * mon-vs-mon melee path), matches the always-false convention used by other
 * unmodeled predicates in this file (e.g. touch_petrifies_dm). */
function sticks_dm(ptr) { return sticks(ptr); }

/* C uhitm.c:5248-5421 mhitm_knockback — hero-attacker (u_agr) and mon-vs-mon
 * arms (the hero-defender arm u_def is mhitu_knockback in js/mhitu.js).
 * The two RNG draws (knockdistance, chance) are ALWAYS consumed first,
 * exactly as C does before any of the disqualifying checks. */
const ART_OGRESMASHER = 16; /* artilist.h */

const LEATHER = 7;          /* objclass.h:20 */

/* obj.h is_flimsy(): oc_material <= LEATHER or RUBBER_HOSE (otyp 78) */
const is_flimsy_dm = (otmp) => (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) <= LEATHER
    || (otmp.otyp | 0) === 78 /* RUBBER_HOSE */;

export async function mhitm_knockback(magr, mdef, mattk, mhm, weapon_used) {
    const knockdistance = rn2(3) ? 1 : 2;
    let chance = 6;
    const u_agr = (magr === game.youmonst);
    const u = game.u || {};
    /* C uhitm.c:5260-5268: wep = weapon_used ? (u_agr ? uwep : MON_WEP(magr)) : 0;
     * Ogresmasher (artifact index 16) knocks back 1/2 of the time. */
    const wep = weapon_used ? (u_agr ? (u.uwep || null) : MON_WEP_dm(magr)) : null;
    if (wep && (wep.oartifact | 0) === ART_OGRESMASHER)
        chance = 2;
    if (rn2(chance))
        return false;

    if (!(((mattk.adtyp | 0) === AD_PHYS)
          && ((mattk.aatyp | 0) === AT_CLAW || (mattk.aatyp | 0) === AT_KICK
              || (mattk.aatyp | 0) === AT_BUTT || (mattk.aatyp | 0) === AT_WEAP)))
        return false;

    const agrdata = magr?.data || {};
    if (attacktype(agrdata, AT_ENGL) || attacktype(agrdata, AT_HUGS)
        || sticks_dm(agrdata))
        return false;

    const defx = mdef.mx | 0, defy = mdef.my | 0;
    const dx = sgn_dm(defx - (u_agr ? (u.ux | 0) : (magr.mx | 0)));
    const dy = sgn_dm(defy - (u_agr ? (u.uy | 0) : (magr.my | 0)));
    if (!isok(defx + dx, defy + dy))
        return false;
    /* C uhitm.c:5302-5306: can't move most targets into or out of a doorway
     * diagonally (uses magr->mx/my even for hero). */
    {
        const { doorless_door } = await import('./cmd.js');
        const dl = game.level?.at(defx, defy);
        if (dl && (dl.typ | 0) === DOOR_TYP && ((defx - (magr?.mx | 0)) && (defy - (magr?.my | 0)))
            && !doorless_door(defx, defy))
            return false;
    }

    if ((!u_agr && DEADMONSTER_dm(magr)) || DEADMONSTER_dm(mdef))
        return false;
    /* C uhitm.c:5325 if (!(magr->data->msize > (mdef->data->msize + 1))) return FALSE. */
    const agrMsize = (agrdata.msize != null)
        ? (agrdata.msize | 0)
        : (u_agr ? (MONS_MSIZE[(u.umonnum ?? magr?.mnum ?? -1) | 0] | 0) : 0);
    const defMsize = (mdef.data?.msize != null)
        ? (mdef.data.msize | 0)
        : (u_agr ? (MONS_MSIZE[(mdef.mnum ?? mdef.mndx ?? -1) | 0] | 0) : 0);
    if (!(agrMsize > defMsize + 1))
        return false;
    /* C uhitm.c:5329-5331: no knockback with a flimsy or non-blunt weapon.
     * is_flimsy: oc_material <= LEATHER or RUBBER_HOSE; is_blunt_weapon: WHACK
     * rows (otyp 69..81 minus 72, plus pick-axe 259 / grappling hook 260),
     * same table as js/mhitu.js mhitu_knockback. */
    if (wep) {
        const wo = wep.otyp | 0;
        const blunt = (wo >= 69 && wo <= 81 && wo !== 72) || wo === 259 || wo === 260;
        if (is_flimsy_dm(wep) || !blunt)
            return false;
    }
    if (unsolid_dm(agrdata))
        return false;
    /* C uhitm.c:5338: if ((u_agr || u_def) && !(*hitflags & M_ATTK_HIT)) return FALSE; */
    if (u_agr && !((mhm?.hitflags | 0) & M_ATTK_HIT))
        return false;
    if (m_is_steadfast(mdef)) { /* C uhitm.c:5342-5353 */
        if (u.usteed && mdef === u.usteed)
            await You("and %s don't budge.", y_monnam_qm(u.usteed));
        else if (canseemon(mdef))
            await pline("%s doesn't budge.", Monnam_dm(mdef));
        return false;
    }

    /* C uhitm.c:5356-5378.  These formatting draws happen while pline is
     * displaying the knockback message.  In particular, pline may suspend
     * the turn at --More--; the mhurtle and stun tail must therefore remain
     * after the awaited message (C resumes it on the next input). */
    if (canseemon(mdef) || u_agr) {
        /* uhitm.c:5356-5358: "backward" when will_hurtle() says the target moves */
        const { will_hurtle } = await import('./cmd.js');
        const knockedhow = will_hurtle(mdef, defx + dx, defy + dy)
            ? 'backward' : 'back';
        if (canseemon(mdef)) {
            /* C uhitm.c:5363 mdefbuf = y_monnam(mdef): a tame defender reads
             * "your kitten", not "the kitten". */
            const magrbuf = u_agr ? 'You' : Monnam_dm(magr);
            const verb = u_agr ? 'knock' : 'knocks';
            await pline(`${magrbuf} ${verb} ${y_monnam_qm(mdef)} ${knockedhow} with a ${
                rn2(2) ? 'forceful' : 'powerful'} ${rn2(2) ? 'blow' : 'strike'}!`);
        } else {
            await You_feel(`${some_mon_nam(mdef)} be knocked ${knockedhow}!`);
        }
    }

    if (u.ustuck && u_agr)
        await unstuck_dm(u.ustuck);

    /* C uhitm.c:5400: move the defender before recording the hit/stun tail.
     * cmd.js owns the shared dothrow.c mhurtle implementation; dynamic import
     * avoids the cmd -> dogmove module cycle while preserving this async point. */
    const { mhurtle } = await import('./cmd.js');
    await mhurtle(mdef, dx, dy, knockdistance);

    if (!u_agr)
        mhm.hitflags |= M_ATTK_HIT;
    if (DEADMONSTER_dm(mdef)) {
        mhm.hitflags |= M_ATTK_DEF_DIED;
    } else if (!rn2(4)) {
        mdef.mstun = 1;
        if (mdef === u.usteed) /* C uhitm.c:5410-5411 */
            set_apparxy_dm(magr);
    }
    if (!u_agr && DEADMONSTER_dm(magr))
        mhm.hitflags |= M_ATTK_AGR_DIED;
    return true;
}
