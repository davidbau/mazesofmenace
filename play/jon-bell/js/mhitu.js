import { urgent_pline, pline_The, You, Your } from './pline.js';
import { pline_mon } from './pline.js';
import { Monnam as Monnam_real } from './uhitm.js';
import { Mgender } from './do_name.js';
import { reset_occupations } from './cmd.js';
import { rounddiv } from './hack.js';
import { u_carried_gloves } from './invent.js';
import { set_msg_xy as set_msg_xy_mu } from './pline.js';
import { registerStaticReset } from './statics.js';
import { yyyymmdd } from './calendar.js';
import { attacktype_fordmg } from './mondata.js';
import { drain_item } from './zap.js';
import { stagger } from './mondata.js';
import { tele_restrict } from './teleport.js';
let mon_currwep = null;
import { spoteffects } from './hack.js';
// @ts-nocheck
/* js/mhitu.js — gazemu(): monster gaze attack on hero.
 * C ref: nethack-c/src/mhitu.c:1662-1893
 *
 * cadence-1: port gazemu() with bit-exact RNG ordering.
 *
 * RNG call map (path-dependent; up to 25 per call):
 *   Hallucination path:      rn2(4)                              [line 1693]
 *   AD_STON cancelled hall:  rn2(3)                              [line 1707]
 *   AD_CONF active path:     rn2(5), d(3,4), rn2(6)             [line 1755,1760,1762]
 *   AD_CONF cancelled path:  rn2(5)                              [line 1755]
 *   AD_STUN active path:     rn2(5), d(2,6), rn2(6)             [line 1774,1779,1780]
 *   AD_STUN cancelled path:  rn2(5)                              [line 1774]
 *   AD_BLND cancelled:       rn1(2,2) [=rn2(2)+2], rn2(5)       [line 1792,1796]
 *   AD_BLND active:          d(damn,damd), rnd(3)                [line 1799,1810]
 *   AD_FIRE active:          rn2(5), d(2,6), d(12,6), rn2(20), rn2(20) [lines 1820,1824,1833,1839,1841]
 *   AD_FIRE cancelled:       rn2(5), rn1(2,4)                   [line 1820,1822]
 *   AD_SLEE active:          rn2(5), rnd(10) [via fall_asleep]  [line 1852,1857]
 *   AD_SLOW active:          rn2(4)                              [line 1867]
 *   react branch:            rn2(3), rn2(8) [halluc], rn2(3)    [lines 1883,1884,1888]
 *
 * @ts-nocheck — js sibling; ambient game types not declared.
 */
import { game } from './gstate.js';
import { freehand } from './engrave.js';
import { is_youmonst as is_youmonst_mu } from './mhitm.js';
import { seemimic as seemimic_real, killed as killed_real } from './mon.js';
import { get_atkdam_type } from './mondata.js';
import { erode_armor as erode_armor_um } from './uhitm.js';
import { mon_hates_blessings } from './mondata.js';
import monKbMsizePack from './makemon_msize.json' with { type: 'json' };
import monKbMattkPack from './makemon_mattk.json' with { type: 'json' };
import monKbMonsPack from './makemon_mons.json' with { type: 'json' };
import { rn1, pushRngLogEntry } from './rng.js';
import { rn2, rnd, d } from './rnd.js';
import { newsym, mon_visible as mon_visible_disp, canspotmon as canspotmon_disp, map_invisible, glyph_is_invisible_at, tmp_at, obj_to_glyph, DISP_END, DISP_FLASH, DISP_TETHER, DISP_FREEMEM, Unaware as Unaware_real, shieldeff, _topline_more_pending, _more_never_dismissed, flush_pending_messages, pline_flush_point } from './display.js';
import { bot as bot_um } from './botl.js';
import { pline, urgent_pline as urgent_pline_disp } from './pline.js';
import { m_at as uhitm_m_at, resists_fire as resists_fire_um, resists_elec as resists_elec_um } from './uhitm.js';
import { golemeffects as golemeffects_um } from './mon.js';
import { hitval, mon_wield_item, dmgval, select_rwep } from './weapon.js';
import { spec_abon } from './artifact.js';
import { burnarmor, erode_obj, drain_en as drain_en_trap } from './trap.js';
import { goodpos } from './teleport.js';
import { attrcurse as attrcurse_mu } from './sit.js';
import { msummon as msummon_real } from './minion.js';
import { PM_CLAY_GOLEM as PM_CLAY_GOLEM_MU, PM_CLERIC, PM_ERINYS } from './pm.generated.js';
import { _mon_reflects_zap as mon_reflects_real } from './zap.js';
/* C uhitm.c:4424 mhitm_ad_legs — one body, shared by both attack directions. */
import { mhitm_ad_legs as mhitm_ad_legs_uh } from './uhitm.js';
import { PM_GREMLIN as PM_GREMLIN_MU } from './pm.generated.js';
const AD_LEGS_MU = 17;   /* monattk.h:59 */
import { mhitm_ad_ench as mhitm_ad_ench_uh, mhitm_ad_fire as mhitm_ad_fire_uh, mhitm_ad_heal as mhitm_ad_heal_uh, mhitm_ad_plys as mhitm_ad_plys_uh, mhitm_ad_rust as mhitm_ad_rust_uh, mhitm_ad_slee as mhitm_ad_slee_uh, mhitm_ad_slow as mhitm_ad_slow_uh, mhitm_ad_tlpt as mhitm_ad_tlpt_uh } from './uhitm.js';
import { minstapetrify as minstapetrify_mu } from './trap.js';
import { munstone as munstone_mu } from './muse.js';
const AD_ENCH_MU = 41;  /* monattk.h:83 */
const AD_CURS_MU = 253; /* monattk.h:98 */
const AD_HEAL_MU = 27;  /* monattk.h:69 */
const AD_PLYS_MU = 14;  /* monattk.h:56 */
const AD_RUST_MU = 24;  /* monattk.h:66 */
const AD_TLPT_MU = 23;  /* monattk.h:65 */
import { acid_damage as acid_damage_um } from './trap.js';
import { done, do_death_sequence, deadhero, done_in_by, pending_death_is_final, delayed_killer } from './end.js';
/* C potion.c:194 make_slimed() — mhitm_ad_slim's hero-defender arm. */
import { make_slimed } from './potion.js';
import { polymon, polyself as polyself_real } from './polyself.js';
/* C end.c:1023 done(), run at C's own position inside the attack loop. */
import { drain_pending_death_in_place } from './fastforward.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_AGR_DIED, M_ATTK_DEF_DIED, M_SEEN_NOTHING, M_SEEN_FIRE, M_SEEN_SLEEP, M_SEEN_REFL, SLEEP_RES as SLEEP_RES_MU, FIRE_RES as FIRE_RES_MU, COLD_RES as COLD_RES_MGP, DISINT_RES as DISINT_RES_MGP, SHOCK_RES as SHOCK_RES_MGP, STONE_RES as STONE_RES_MU, REFLECTING as REFLECTING_MU, NATTK, Upolyd as Upolyd_fn, INVIS, DISPLACED as DISPLACED_MU, SEE_INVIS, P_WHIP, Is_rogue_level, CONFUSION, SLIMED, CQ_CANNED, DETECT_MONSTERS as DETECT_MONSTERS_MU, DEAF, PROT_FROM_SHAPE_CHANGERS as PROT_FROM_SHAPE_CHANGERS_MU, CONFLICT as CONFLICT_MU, is_pit as is_pit_mu, NEW_MOON, ERODE_CORRODE, ERODE_ROT, PROTECTION, W_AMUL, MM_IGNOREWATER, MM_IGNORELAVA, } from './const.js';
/* C exper.c:207 losexp(drainer) — mhitm_ad_drli's hero-defender arm. */
import { losexp } from './exper.js';
/* C attrib.c:509 exercise(i, incr) — mhitm_ad_phys_u's AT_HUGS "already
 * grabbed" arm (uhitm.c:4030), RNG-free (FALSE == decrement, no rn2). */
import { exercise, adjattrib, ART_NONARTIFACT, arti_spfx, arti_cspfx } from './attrib.js';
import { get_artifact } from './artifact.js';
import { eat_brains } from './eat.js';
import { drain_weapon_skill } from './weapon.js';
import { losespells } from './spell.js';
/* Object metadata extracted from compiled include/objects.h; pure data module. */
import { MKOBJ_OC_OPROP, MKOBJ_OC_MAGIC } from './mkobj_erosion_meta.js';
/* C monst.h PM_ROPE_GOLEM — mhitm_ad_phys_u's AT_HUGS choke-vs-crush wording
 * (uhitm.c:4033). */
import { PM_ROPE_GOLEM as PM_ROPE_GOLEM_MU } from './pm.generated.js';
import { set_apparxy as set_apparxy_kb, dissolve_bars } from './monmove.js';
/* C uhitm.c:3866 -> pline.c:387-400: Death's touch uses the dream
 * prefix while the hero is unaware, just like other You_feel messages. */
import { You_hear, You_feel as You_feel_mu } from './pline.js';
import { impossible as impossible_breath } from './pline.js';
import { cmdq_clear } from './cmd.js';
import { test_move as test_move_kb } from './hack.js';
import { snuff_lit as snuff_lit_mu, catch_lit as catch_lit_mu } from './apply.js';
import { hurtle as hurtle_cmd, mhurtle as mhurtle_kb, will_hurtle as will_hurtle_mu } from './dothrow.js';
import { m_is_steadfast as m_is_steadfast_kb } from './uhitm.js';
import { W_SADDLE as W_SADDLE_KB, DISMOUNT_KNOCKED as DISMOUNT_KNOCKED_KB } from './const.js';
import { ARTICLE_A as ARTICLE_A_MU, SUPPRESS_SADDLE as SUPPRESS_SADDLE_MU, AUGMENT_IT as AUGMENT_IT_MU } from './const.js';
import { xm_has_mgivenname as xm_has_mgivenname_mu } from './mhitm.js';
import { x_monnam as x_monnam_mu } from './do_name.js';
import { mbodypart as mbodypart_mu } from './cmd.js';
import { snuff_candle as snuff_candle_mu } from './apply.js';
/* C steal.c:569-570 — unpaid stolen objects are removed from the shop bill
 * before leaving inventory.  Reuse shk.js's canonical synchronous body. */
import { subfrombill as subfrombill_real, shop_keeper as shop_keeper_real } from './shk.js';
/* mwelded (C wield.c:1072) is used at the autoreturn_weapon arm below; the
   binding was never imported, so reaching that arm threw a ReferenceError. */
import { showdamage as showdamage_mu } from './hack.js';
import { growl_sound } from './sounds.js';
import { mwelded, welded } from './wield.js';
import { make_confused, make_stoned, make_sick, potionhit } from './potion.js';
import { STONING as STONING_MU } from './const.js';
import { SICK_RES as SICK_RES_MU, SICK_NONVOMITABLE as SICK_NONVOMITABLE_MU } from './const.js';
import { PM_MEDUSA, PM_ARCHON, PM_STONE_GOLEM, PM_INCUBUS, PM_HIGH_PRIEST, PM_PRIEST as PM_ALIGNED_CLERIC, PM_BARBED_DEVIL as PM_BARBED_DEVIL_MU, } from './pm.generated.js';
/* C mhitu.c:2536 `u.umonnum == PM_FLOATING_EYE` — passiveum()'s AD_PLYS arm. */
import { PM_FLOATING_EYE as PM_FLOATING_EYE_MU, PM_CYCLOPS as PM_CYCLOPS_MU } from './pm.generated.js';
/* C mhitm.c:1210 paralyze_monst(mon, amt) — passiveum()'s AD_PLYS arm
 * (mhitu.c:2551/:2557) shares the same body uhitm.js already wires for the
 * hero-attacks-monster direction. */
import { paralyze_monst as paralyze_monst_mu } from './mhitm.js';
import { destroy_items, destroy_items as destroy_items_zap, destroy_items_mon as destroy_items_mon_zap } from './zap.js';
import { mon_nam as uhitm_mon_nam } from './uhitm.js';
import { XKILL_NOMSG as XKILL_NOMSG_UH } from './uhitm.js';
import { xkilled as xkilled_uh } from './mon.js';
import { dmgtype } from './dogmove.js';
import { mattackm, rustm as rustm_mu } from './mhitm.js';
import { can_carry as can_carry_mu } from './mon.js';
import { permonstTemplate } from './makemon.js';
import { name_to_mon, gender } from './mondata.js';
import { find_offensive } from './muse.js';
import { poly_gender } from './polyself.js';
import { monflee } from './monmove.js';
import { pmname } from './do_name.js';
import { lined_up } from './mthrowu.js';
import { Inhell } from './makemon.js';
import { noteleport_level as noteleport_level_mu } from './teleport.js';
/* js/mhitu.js:262 declares a local `mon_nam` stub that returns the literal
 * "monster"; tele_restrict's pline needs the real uhitm.c:232 body. */
import { mon_nam as mon_nam_uh, sr_oc_material as sr_oc_material_mu } from './uhitm.js';
import { PM_BLACK_PUDDING as PM_BLACK_PUDDING_MU, PM_BROWN_PUDDING as PM_BROWN_PUDDING_MU } from './pm.generated.js';
/* C mondata.c:1367 locomotion() — the "tries to run away with" verb. */
import { m_monnam as m_monnam_mu } from './do_name.js';
import { locomotion } from './mondata.js';
/* C mhitu.c:1176 Amonnam(mtmp) — the hider-reveal message's subject. */
import { Amonnam as Amonnam_mu } from './do_name.js';
import { split_mon_ml as split_mon, WEAPON_CLASS, TOOL_CLASS } from './mklev.js';
import { mksobj } from './mkobj.js';
/* C mthrowu.c:190 drop_throw -> stackobj(obj) (mkobj.c:2170). */
import { stackobj } from './invent.js';
import { worm_move } from './worm.js';
import { stop_occupation } from './allmain.js';
import { nomul, unmul } from './hack.js';
import { night, midnight } from './calendar.js';
import { is_were as is_were_real, new_were as new_were_real,
         were_summon as were_summon_real, set_ulycn as set_ulycn_real } from './were.js';
import { you_were, you_unwere } from './were.js';
/* The real canseemon — this file also declares a file-local
 * `canseemon() { return false; }` stub, which the older arms below still use. */
import { canseemon, canseemon as canseemon_mu, tp_sensemon as tp_sensemon_mu, sensemon as sensemon_mu } from './display.js';
/* C vision.h:50-53 m_canseeu(m) — the real port lives in dochug.js. dochug.js
 * already imports mattacku etc. from this file, so this closes an existing
 * cycle; both sides only use the other's export inside a function body, never
 * at module-eval time. */
import { m_canseeu as m_canseeu_dh } from './dochug.js';
/* C muse.c:2834 ureflects(fmt,str) — the real port lives in js/makemon.js
 * (already imported extensively above, no cycle). js/mhitm.js ALSO carries a
 * copy of this name, but that copy is itself a stub
 * (`export function ureflects(_fmt,_arg1,_arg2){ return false; }`) — do not
 * pick it by filename; the makemon.js one is the real body. */
import { ureflects as ureflects_mm } from './muse.js';
/* C mondata.c:79-85 poly_when_stoned(ptr) — the one port lives in mondata.js. */
import { poly_when_stoned } from './mondata.js';
/* C timeout.c:955-980 fall_asleep(how_long,wakeup_msg) — RNG-free. */
import { fall_asleep } from './timeout.js';
/* C mondata.c:1557-1568 monstseesu(seenres) — RNG-free. The real port lives
 * in js/mcastu.js (which already imports mdamageu FROM this file, so this
 * closes an existing cycle rather than opening a new one). js/mhitm.js also
 * carries a same-named copy but it is a local, unexported stub there — do
 * not pick it by filename. */
import { monstunseesu } from './mondata.js';
import { monstseesu } from './mondata.js';
import { retouch_equipment as retouch_equipment_mu } from './artifact.js';
import { bot as bot_mu } from './botl.js';
/* C display.c:2064 cls()'s opening display_nhwindow(WIN_MESSAGE, FALSE) — the
 * page this port's cls() does not do (see expels_gu). */
import { force_more_pages as force_more_pages_mu,
         _topl_merge_result as _topl_merge_result_mu,
         _topl_joins_snapshot as _topl_joins_snapshot_mu } from './display.js';
import { cansee as cansee_mu, vision_recalc as vision_recalc_mu } from './vision.js';
import { breaks as breaks_mu } from './dothrow.js';
import { is_waterwall as is_waterwall_mu } from './dbridge.js';
import { harmless_missile as harmless_missile_mu } from './dothrow.js';
/* explmu's callees (C mhitu.c:1589-1665).  Every one of these has a REAL body
 * elsewhere in js/ and this file carries a file-local no-op or `return false`
 * shadow of two of them (resists_blnd at :220, make_blinded at :314), so the
 * real ones are imported under aliases rather than reached by bare name. */
import { BlindedTimeout as BlindedTimeout_mu } from './zap.js';
import { make_blinded, make_blinded as make_blinded_real_mu } from './potion.js';
import { mon_explodes as mon_explodes_mu } from './explode.js';
import { make_hallucinated as make_hallucinated_mu } from './potion.js';
import { mondead as mondead_mu, wake_nearto as wake_nearto_mu } from './mon.js';
import { ugolemeffects } from './polyself.js';
import { resists_blnd, defended as defended_mu } from './mondata.js';
import { PM_BLACK_LIGHT as PM_BLACK_LIGHT_MU, PM_VIOLET_FUNGUS as PM_VIOLET_FUNGUS_MU,
         PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_GRID_BUG } from './pm.generated.js';
import { isok as isok_mu, IS_OBSTRUCTED as IS_OBSTRUCTED_MU, IRONBARS as IRONBARS_MU,
         SINK as SINK_MU, u_at as u_at_mu } from './const.js';
import { BACKTRACK as BACKTRACK_MU, W_WEP, W_WEP as W_WEP_MU, HAND as HAND_MU,
         FOOT as FOOT_MU, LEG as LEG_MU, FACE as FACE_MU, EYE as EYE_MU,
         ARM, W_NONDIGGABLE } from './const.js';
import { is_pool as is_pool_mu } from './look.js';
import { closed_door as closed_door_mu } from './monmove.js';
import { y_monnam as y_monnam_mu } from './do_name.js';
import { Is_waterlevel as Is_waterlevel_mu, Is_airlevel as Is_airlevel_mu, LEVITATION as LEVITATION_MU, FLYING as FLYING_MU, DROWNING as DROWNING_MU } from './const.js';
import { observe_object as observe_object_mu } from './o_init.js';
import { hold_another_object } from './invent.js';
import { dropy } from './do.js';
import { LAST_REAL_GEM, LAST_GLASS_GEM, CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING,
         SPE_BOOK_OF_THE_DEAD } from './objclass_ranges.js';
/* C objnam.c:2424 simpleonames(obj) — minimal_xname made plural for quan>1.
 * RNG-free; C evaluates it twice in the u_catch_thrown_obj call, once per
 * argument, so calling it once and reusing the string is faithful. */
import { simpleonames as simpleonames_mu, doname } from './objnam.js';
import { is_quest_artifact } from './questpgr.js';
import { obj_resists as obj_resists_mu } from './dogmove.js';
import { monkilled_trap as monkilled_mu, openholdingtrap as openholdingtrap_mu } from './trap.js';
import { thitu } from './mthrowu.js';
import { t_at as t_at_mu } from './trap.js';
/* ── engulf/swallow (gulpmu, expels) ── */
import { failed_grab as failed_grab_mu } from './mhitm.js';
import monMsizePack_mu from './makemon_msize.json' with { type: 'json' };
const MONS_MSIZE_MU = monMsizePack_mu.msize;
import { place_monster as place_monster_mu } from './steed.js';
import { unstuck as unstuck_mu } from './mon.js';
import { sticks as sticks_mu } from './mondata.js';
import { attacktype as attacktype_mu } from './mondata.js';
import { number_leashed as number_leashed_mu } from './apply.js';
import { dismount_steed as dismount_steed_mu } from './steed.js';
import { DISMOUNT_ENGULFED } from './const.js';
import { _movemon_page_frames_reset as _movemon_page_frames_reset_mu } from './display.js';
import { swallowed as swallowed_mu, docrt_flags as docrt_flags_mu, topl_force_break_now as topl_force_break_now_mu, capture_flushed_cells as capture_flushed_cells_mu } from './display.js';
import { acurr as acurr_raw_mu } from './attrib.js';
import { arti_defn_adtyp as arti_defn_adtyp_u } from './attrib.js';
function acurr_mu(i) { return acurr_raw_mu(game.u, i) | 0; }
import { use_offensive } from './muse.js';
/* dobuzz is the ray engine breamm() fires (C mthrowu.c:1123).  js/zap.js
 * already imports ignite_items from this file, so this is a cycle — both
 * bindings are hoisted `export function` declarations and neither module
 * calls the other at evaluation time, so the cycle is inert. */
import { dobuzz, destroy_items as destroy_items_hero_zap } from './zap.js';
import { m_lined_up } from './mthrowu.js';
import { cloak_simple_name, helm_simple_name, mimic_obj_name, an, the, obj_is_pname, mshot_xname, singular, Tobjnam, makeplural, vtense } from './objnam.js';
import { xname, bimanual as bimanual_mu } from './do_wear.js';
/* ohitmon dependencies (C mthrowu.c:321).  Each is imported under a `_mu` alias
 * because this file carries older file-local stubs of several of these names. */
import { miss as miss_mu, hit as hit_mu,
         incr_HBlinded as incr_HBlinded_mu } from './zap.js';
import { distant_name as distant_name_mu, killer_xname as killer_xname_mu } from './objnam.js';
import { The as The_mu } from './objnam.js';
import { otense as otense_mu } from './objnam.js';
import { find_mac as find_mac_mu } from './worn.js';
import { reset_utrap as reset_utrap_mu } from './trap.js';
import { omon_adj as omon_adj_mu } from './dothrow.js';
import { exclam as exclam_mu } from './zap.js';
/* NOT s_suffix: this file already has a local s_suffix_mu (:2303) that handles
 * a name already ending in 's' (C hacklib.c), which mhitm.js's exported
 * `s + "'s"` does not — the local is the more faithful body, so keep it. */
import { hliquid as hliquid_mu } from './do_name.js';
import { shade_miss as shade_miss_mu } from './uhitm.js';
import { can_blnd as can_blnd_mu, mon_hates_silver as mon_hates_silver_mu } from './mondata.js';
import { setmangry as setmangry_mu } from './mon.js';
import { nonliving as nonliving_mu, monPmname as monPmname_mu } from './makemon.js';
import { hates_silver as hates_silver_mu } from './mondata.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';

/* thrwmu/monshoot/m_throw dependencies (C mthrowu.c). */
import { autoreturn_weapon, setmnotwielded } from './weapon.js';
import { artifact_hit } from './artifact.js';
import { splitobj } from './makemon.js';
import { mhe as mhe_mu } from './makemon.js';
/* C mhitu.c:1917 — mdamageu()'s Upolyd arm. */
import { rehumanize } from './polyself.js';
/* C mhitu.c:924 mattacku's AT_MAGC case. */
import { castmu, buzzmu } from './mcastu.js';
import { cvt_adtyp_to_mseenres } from './mondata.js';
import { burn_away_slime } from './timeout.js';
/* C mcastu.c:322 touch_of_death — mhitm_ad_deth_u's Death-touch arm below. */
import { touch_of_death as touch_of_death_mc } from './mcastu.js';
/* C makemon.c:35 — getmattk()'s home-elemental damage doubling. */
import { is_home_elemental } from './makemon.js';
import { extract_from_minvent_dm } from './dogmove.js';
import { down_gate, ship_object, add_to_minv} from './dokick.js';
import { obfree } from './shk.js';
import { delobj as delobj_mu } from './invent.js';
import { place_object, remove_object, obj_extract_self, clear_dknown } from './mkobj.js';
import { set_ustuck as set_ustuck_mu } from './mon.js';
import { mondied_dm } from './dogmove.js';
import { attk_protection as attk_protection_mu } from './mhitm.js';
import { passive_obj } from './uhitm.js';
import { resists_ston as resists_ston_mu } from './mklev.js';
import { mon_to_stone as mon_to_stone_mu } from './mon.js';
import { W_ARMG as W_ARMG_MU } from './const.js';
/* NOTE: this file carries a file-local `couldsee() { return false; }` stub at
 * :124 (feeding the unported Medusa-gaze arms, alongside the same file's
 * canseemon stub — the real one is already imported as canseemon_mu).  thrwmu
 * must use the REAL vision test, so import it under an alias rather than let
 * the stub shadow it; the gaze arms are left on the stub, out of scope here. */
import { couldsee as couldsee_mu } from './vision.js';
import { dist2, s_suffix, strsubst } from './hacklib.js';
import { acurr } from './attrib.js';
import { weight as weight_mu } from './weight.js';
import { calc_capacity } from './hack.js';
import { obj_is_burning } from './light.js';
import { is_flammable as is_flammable_mu } from './mkobj.js';
import { bhp_is_lava as bhp_is_lava_mu, thit_is_unicorn as is_unicorn } from './cmd.js';
import { rnl } from './rnd.js';
import { BLINDED, STUNNED, FUMBLING, A_INT, A_DEX, A_CON } from './const.js';
/* prop ids for the youprop.h macro block above (const.js:2310-2361). */
import { HALLUC as HALLUC_MU, HALLUC_RES as HALLUC_RES_MU, FAST as FAST_MU } from './const.js';
import { flooreffects as flooreffects_real_mu } from './do.js';
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { update_inventory } from './mhitm.js';
/* ---------------------------------------------------------------------------
 * Local constants — attack/damage types (monattk.h), inlined.
 * ---------------------------------------------------------------------------
 */
const AD_STON = 18;
const AD_CONF = 25;
const AD_STUN = 12;
const AD_BLND = 11;
const AD_FIRE = 2;
const AD_SLEE = 4;
const AD_SLOW = 13;
/* monattk.h AD_COLD 3, AD_ELEC 6, AD_HALU 10 — the three explmu arms this file
 * did not already name.  (AD_FIRE 2 and AD_BLND 11 are above.) */
const AD_COLD_MU = 3;
const AD_ELEC_MU = 6;
const AD_HALU = 36;
/* M_SEEN constants (monst.h) */
/* M_SEEN_FIRE is imported from const.js */
const M_SEEN_COLD = 0x0004;
/* M_SEEN_SLEEP is imported from const.js */
const M_SEEN_ELEC = 0x0020;
const M_SEEN_ACID = 0x0080;
/* m_seenres — C ref: nethack-c/include/monst.h:88 macro */
function m_seenres(mon, mask) {
    return (mon.seen_resistance & mask) !== 0;
}
/* ---------------------------------------------------------------------------
 * Stub helpers — side-effects not yet ported; no RNG inside these stubs.
 * ---------------------------------------------------------------------------
 */
/* C mhitu.c: canseemon(mon) — imported directly from display.js (also aliased
 * as `canseemon_mu`). */
function couldsee(x, y) { return couldsee_mu(x, y); }
function m_canseeu(mon) { return m_canseeu_dh(mon); }
// C ref: allmain.c:755 stop_occupation() — interrupt the current occupation:
// pline "You stop <occtxt>." and clear go.occupation.  hitmu()/missmu()
// (mhitu.c:1263 / :99) call this at the point a monster's attack lands, so the
// stop message joins the topline INSIDE the combat message stream — after the
// interrupting hit, BEFORE the turn's trailing combat plines — exactly where C
// emits it.  Deferring it to the end of the turn (the old learn-driver behavior)
// pushed a trailing --More-- past the last combat pline and leaked the next
//
// Historical implementation below was emit-only; all callers now use the
// canonical immediate clear (C allmain.c:684-695).
// EMIT-ONLY (does NOT clear go.occupation): the clear itself is left to the
// existing dochugw() post-move path (monmove.js:1477), which already clears the
// occupation at the SAME point C's movemon does and is RNG-aligned with the C
// trace.  Clearing here (mid-attack, one dochug earlier) shifted a later
// only emit the message and let dochugw perform the state transition.  A
// per-study guard (g._studyStopMsg) prevents re-emission across the monster's
// multiple hits.  Scoped to the study occupation (occtxt "studying").
//
// The cmdq_clear(CQ_CANNED) TAIL (allmain.c:695) is NOT part of that narrowing
// and is now wired.  C's stop_occupation ends by throwing away the canned
// command queue, and this port's `m_throw` reaches THIS copy (mthrowu.c:786,
// wield-then-requeue arm — wield_tool() prints "You now wield a lamp.", then
// `cmdq_add_ec(CQ_CANNED, dorub)` + `cmdq_add_key(CQ_CANNED, invlet)` bank a
// SECOND dorub pass for the next moveloop_core iteration.  In C that second
// pass never runs: the goblin's thrown dagger hits during the same world turn,
// m_throw calls stop_occupation(), and the clear discards it.  Without the
// clear this port drained the queue, ran dorub again (drawing the magic-lamp
// rn2(3) and the puff-of-smoke rn2(2) that C never draws) and spent ANOTHER
// turn on it — so every monster on the level moved one turn further than C's
// step 31 (the pet at (41,17)/(43,17) instead of (42,16), the goblin at (45,17)
// instead of (46,17)) AND its first RNG divergence.  RNG-neutral in itself.
//
// was written for the LEARN occupation and silently swallowed every OTHER one.
// A COUNTED `.` / `s` arms go.occupation = timed_occupation with occtxt
// "waiting" / "searching" (js/cmd.js CMD_F_TEXT), and for those this function
// did nothing at all: no message, no clear.  So a monster that lands a hit on a
// resting hero did not stop the rest -- js/ kept counting down while C
// abandoned the count on the FIRST landed blow.
//
// `50.` rest and its topline reads
//     "It hits!  You stop waiting.  It hits again!  It bites!"
// -- hitmu's tail (mhitu.c:1265) fires stop_occupation() after attack #1, which
// prints and clears, so attacks #2/#3 hit the `else if (gm.multi >= 0) nomul(0)`
// arm and say nothing.  This port printed
//     "It hits!  It hits again!  It bites!  It hits!  It hits again!--More--"
// -- the count kept running into another round of attacks, the topline
// overflowed 71 columns, and the resulting --More-- chain ate the next 500
// recorded keys.
//
function DEADMONSTER(mon) { return !!(mon && mon.mhp <= 0); }
/* make_confused's C home is potion.c:88; this used to be an EXPORTED empty body
 * and it was the copy js/potion.js and js/spell.js imported, so every store any
 * of the three made went nowhere.  Re-exported here so the old import path
 * keeps working and there is still exactly one implementation. */
export { make_confused };
import { make_stunned } from './potion.js';
/* make_blinded's one body is potion.c:260-331 in js/potion.js; keep the export path. */
export { make_blinded };
/* mdamageu — C ref: nethack-c-v5/upstream/src/mhitu.c:1902-1927.
 * Apply n points of damage to the hero. No RNG consumed (showdamage is
 * RNG-free). C calls rehumanize() or done_in_by(mtmp, DIED) when HP drops
 * below 1. */
export async function mdamageu(mtmp, n) {
    const u = game.u || (game.u = {});
    if (n < 0) {
        await impossible_mu(`mdamageu for negative damage? (${n})`);
        n = 0;
    }
    /* C mhitu.c:1909 requests a repaint but does not call bot(). The last
     * pline already flushed; inventory damage since then is still unpainted. */
    if (game.disp) game.disp.botl = true;       /* C mhitu.c:1909 */
    if (Upolyd_fn(u)) {
        u.mh = (u.mh | 0) - n;
        showdamage_mu(n);                      /* C mhitu.c:1912 */
        if ((u.mhmax | 0) && u.mh > u.mhmax) u.mh = u.mhmax;
        if ((u.mh | 0) < 1) return await rehumanize();
    }
    else {
        u.uhp = (u.uhp | 0) - n;
        showdamage_mu(n);                      /* C mhitu.c:1920 */
        if ((u.uhpmax | 0) && u.uhp > u.uhpmax) u.uhp = u.uhpmax;
        /* C mhitu.c:1925 — if (u.uhp < 1) done_in_by(mtmp, DIED).  This used
         * to call deadhero() directly, which flags the death but records no
         * KILLER, so the tombstone read "killed by an []". */
        if ((u.uhp | 0) < 1) done_in_by(mtmp, DIED);
    }
}
// C zap.c:5964-6097 destroy_items — canonical port in js/zap.js
export { destroy_items };
function Your1(_msg) { pline("Your " + _msg); }
/* C you.h:324 mhis(mtmp) — use the canonical pronoun implementation below,
 * including hallucination's rn2(4) choice and gender/visibility rules. */
function mhis(mon) { return mhis_mon(mon); }
/* C ref: hacklib.c:343-359 s_suffix — imported from js/hacklib.js.  The note
 * that used to sit here said the copy was "kept local rather than imported
 * because js/mhitm.js already imports from this file"; that was a reason to
 * avoid importing from js/mhitm.js, not a reason to re-derive the body.
 * js/hacklib.js imports only js/gstate.js, so there is no cycle to avoid. */
function Hallucination(gs) {
    /* C youprop.h:307 Hallucination ((HHallucination || EHallucination)
       && !Halluc_resistance); js/ has no HALLUC_RES writer either, but the
       spelling mirrors js/mhitm.js:1584. */
    const p = gs.u?.uprops?.[HALLUC_MU];
    const r = gs.u?.uprops?.[HALLUC_RES_MU];
    const res = ((r?.intrinsic | 0) || (r?.extrinsic | 0));
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !res;
}
function Unaware(_gs) { return Unaware_real(); }
function Reflecting(gs) { const p = gs.u?.uprops?.[REFLECTING_MU]; return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)); }
function Confusion(gs) { return ((gs.u?.uprops?.[CONFUSION]?.intrinsic) | 0) !== 0; }
/* C youprop.h:103 Blind ((HBlinded || EBlinded) && !BBlinded) — the reader
   js/vision.js and js/trap.js already share. */
function Blind(gs) {
    const p = gs.u?.uprops?.[BLINDED];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
function Fire_resistance(gs) { const p = gs.u?.uprops?.[FIRE_RES_MU]; return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)); }
function Stone_resistance(gs) { const p = gs.u?.uprops?.[STONE_RES_MU]; return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)); }
function Sleep_resistance(gs) { const p = gs.u?.uprops?.[SLEEP_RES_MU]; return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)); }
/* C youprop.h:374 HFast u.uprops[FAST].intrinsic. */
function HFast(gs) { return (gs.u?.uprops?.[FAST_MU]?.intrinsic) | 0; }
/* C youprop.h:80-81 HStun u.uprops[STUNNED].intrinsic, and Stunned == HStun. */
function HStun(gs) { return (gs.u?.uprops?.[STUNNED]?.intrinsic) | 0; }
/* C youprop.h:83-84  Confusion == HConfusion == u.uprops[CONFUSION].intrinsic.
 * The `gs.flags.confusion` / `gs.flags.confusion_dur` spellings these two used
 * to read are assigned by NOTHING in js/, so gazemu's AD_CONF arm always chose
 * the "%s gaze confuses you!" wording and always added its d(3,4) to a base of
 * zero.  This is the same word js/potion.js's make_confused writes. */
function HConfusion(gs) { return (gs.u?.uprops?.[CONFUSION]?.intrinsic) | 0; }
function distu(x, y) {
    const gs = game;
    const u = gs.u || {};
    const dx = x - (u.ux || 0), dy = y - (u.uy || 0);
    return dx * dx + dy * dy;
}
function mdistu(mon) { return distu(mon.mx, mon.my); }
const BOLT_LIM = 8;
const BOLT_LIM_SQ = BOLT_LIM * BOLT_LIM;
/* gy.youmonst stub */
function youmonst_data(gs) {
    return gs.youmonst ? gs.youmonst.data : null;
}
/* Intrinsic flags for AD_SLOW check */
const INTRINSIC = 0x07000000;
const TIMEOUT = 0x00ffffff;
/* KILLED_BY for killer.format */
const KILLED_BY = 1;
/* ---------------------------------------------------------------------------
 * gazemu — C ref: nethack-c/src/mhitu.c:1662-1893
 *
 * Handle a gaze attack from monster mtmp (mattk describes the attack).
 * Returns M_ATTK_AGR_DIED if the aggressor died, M_ATTK_MISS otherwise.
 *
 * RNG calls are preserved in exact C order; all side-effect stubs are safe
 * to replace with full implementations later without disturbing RNG order.
 * ---------------------------------------------------------------------------
 */
export async function gazemu(mtmp, mattk) {
    /* C: static const char *const reactions[] — 8 entries, indices 0..7 */
    const reactions = [
        "confused", /* [0] */
        "stunned", /* [1] */
        "puzzled", "dazzled", /* [2,3] */
        "irritated", "inflamed", /* [4,5] */
        "tired", /* [6] */
        "dulled", /* [7] */
    ];
    /* `game` (imported above from ./gstate.js) is the live state OBJECT, not a
     * factory function — every other function in this file reads it directly
     * as `game.foo`.  This function and `distu()` above both wrote `game()`,
     * which throws "game is not a function" the instant either is actually
     * called.  That was invisible for as long as gazemu() had no caller (see
     * mattacku's newly-added AT_GAZE case) and distu()'s only reader
     * (mdistu(), used by this function's AD_BLND arm) went unexercised. */
    const gs = game;
    const u = gs.u || {};
    const gy = gs.gy || {};
    const gm_obj = gs.gm || {};
    /* C mhitu.c:1754-1755 writes the global killer before done(STONING). */
    const svk = gs.svk || (gs.svk = {});
    svk.killer ||= { id: 0, format: 0, name: "", next: null };
    /* C: int react = -1; */
    let react = -1;
    /* C: boolean is_medusa, reflectable, cancelled, already, mcanseeu */
    /* C mhitu.c:1682 `is_medusa = (mtmp->data == &mons[PM_MEDUSA]);` — a
       permonst POINTER identity test. The old first arm compared the OBJECT
       mtmp.data against the NUMBER PM_MEDUSA and was dead by construction;
       it was masked by the mnum arm. C keeps the two in lockstep
       (mondata.c:18-19 set_mon_data: `mon->data = ptr;
       mon->mnum = monsndx(ptr)`), so mnum IS the pointer test. */
    const is_medusa = (mtmp.mnum === PM_MEDUSA);
    /* C makemon() starts every monst field from cg.zeromonst.  The JS
     * constructor can omit zero fields, so coerce before matching
     * C's integer tests: undefined !== 0 would incorrectly cancel every gaze. */
    const mcan = mtmp.mcan | 0;
    let cancelled = (mcan !== 0);
    let already = false;
    /* mcanseeu: canseemon(mtmp) && couldsee(mx,my) && mtmp->mcansee */
    const mcanseeu = (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my) && mtmp.mcansee);
    /* C: if (m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk->adtyp))) return M_ATTK_MISS; */
    if (m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk.adtyp)))
        return M_ATTK_MISS;
    /* C: reflectable = (Reflecting && couldsee(...) && is_medusa) */
    const reflectable = (Reflecting(gs) && couldsee(mtmp.mx, mtmp.my) && is_medusa);
    /* C: if ((Hallucination && rn2(4)) || (Unaware && !reflectable)) cancelled = TRUE; */
    if ((Hallucination(gs) && rn2(4)) || (Unaware(gs) && !reflectable))
        cancelled = true;
    switch (mattk.adtyp) {
        case AD_STON:
            /* Medusa is the only monster with stoning gaze */
            if (cancelled || !mtmp.mcansee) {
                if (!canseemon(mtmp))
                    break; /* silently */
                if (Unaware(gs)) {
                    /* can't see attacker even though not blind */
                    react = is_medusa ? 4 : 2; /* irritated or puzzled */
                    break;
                }
                if (is_medusa && Hallucination(gs) && !rn2(3))
                    pline("Someone seems overdue for a serpent cut.");
                else
                    pline_mon(mtmp, "%s %s.", Monnam(mtmp), (is_medusa && mtmp.mcan && !react)
                        ? "doesn't look all that ugly"
                        : "gazes ineffectually");
                break;
            }
            if (reflectable) {
                /* hero has line of sight to Medusa and she's not blind */
                const useeit = canseemon(mtmp);
                if (useeit)
                    await ureflects("%s gaze is reflected by your %s.", s_suffix(Monnam(mtmp)));
                if (await mon_reflects(mtmp, !useeit ? null
                    : "The gaze is reflected away by %s %s!"))
                    break;
                if (!m_canseeu(mtmp)) { /* probably you're invisible */
                    if (useeit)
                        pline("%s doesn't seem to notice that %s gaze was reflected.", Monnam(mtmp), mhis(mtmp));
                    break;
                }
                if (useeit)
                    pline_mon(mtmp, "%s is turned to stone!", Monnam(mtmp));
                gs.stoned = true;
                await killed(mtmp);
                if (!DEADMONSTER(mtmp))
                    break;
                return M_ATTK_AGR_DIED;
            }
            if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)
                && !Stone_resistance(gs) && !Unaware(gs)) {
                pline("You meet " + s_suffix(mon_nam(mtmp)) + " gaze.");
                await stop_occupation();
                if (poly_when_stoned(youmonst_data(gs)) && await polymon(PM_STONE_GOLEM))
                    break;
                urgent_pline("You turn to stone...");
                svk.killer.format = KILLED_BY;
                svk.killer.name = pmname(mtmp.data, Mgender(mtmp));
                await done(STONING_MU, drain_pending_death_in_place);
            }
            break;
        case AD_CONF:
            if (mcanseeu && !mtmp.mspec_used && rn2(5)) {
                if (cancelled) {
                    react = 0; /* "confused" */
                    already = ((mtmp.mconf | 0) !== 0);
                }
                else {
                    const conf = d(3, 4);
                    mtmp.mspec_used = (mtmp.mspec_used | 0) + (conf + rn2(6));
                    if (!Confusion(gs))
                        pline_mon(mtmp, "%s gaze confuses you!", s_suffix(Monnam(mtmp)));
                    else
                        pline("You are getting more and more confused.");
                    make_confused(HConfusion(gs) + conf, false);
                    await stop_occupation();
                }
            }
            break;
        case AD_STUN:
            if (mcanseeu && !mtmp.mspec_used && rn2(5)) {
                if (cancelled) {
                    react = 1; /* "stunned" */
                    already = ((mtmp.mstun | 0) !== 0);
                }
                else {
                    const stun = d(2, 6);
                    mtmp.mspec_used = (mtmp.mspec_used | 0) + (stun + rn2(6));
                    pline_mon(mtmp, "%s stares piercingly at you!", Monnam(mtmp));
                    make_stunned((HStun(gs) & TIMEOUT) + stun, true);
                    await stop_occupation();
                }
            }
            break;
        case AD_BLND:
            if (canseemon(mtmp) && !resists_blnd(gs.youmonst)
                && mdistu(mtmp) <= BOLT_LIM_SQ) {
                if (cancelled) {
                    react = rn1(2, 2); /* "puzzled" || "dazzled" */
                    already = (mtmp.mcansee === 0);
                    /* Archons gaze every round; suppress react for cancelled ones */
                    /* C mhitu.c:1796 `mtmp->mcan && mtmp->data == &mons[PM_ARCHON]
                       && rn2(5)` — same dead object-vs-number arm as the
                       is_medusa site above; mnum is the faithful form of the
                       permonst-pointer test (mondata.c:18-19). */
                    if (mtmp.mcan
                        && mtmp.mnum === PM_ARCHON
                        && rn2(5))
                        react = -1;
                }
                else {
                    const blnd = d(mattk.damn, mattk.damd);
                    pline("You are blinded by " + s_suffix(mon_nam(mtmp)) + " radiance!");
                    make_blinded(blnd, false);
                    await stop_occupation();
                    /* Eyes of the Overworld block this stun too */
                    if (!Blind(gs)) {
                        Your1("vision quickly clears.");
                    }
                    else {
                        const oldstun = (HStun(gs) & TIMEOUT);
                        const newstun = rnd(3);
                        make_stunned(Math.max(oldstun, newstun), true);
                    }
                }
            }
            break;
        case AD_FIRE:
            if (mcanseeu && !mtmp.mspec_used && rn2(5)) {
                if (cancelled) {
                    react = rn1(2, 4); /* "irritated" || "inflamed" */
                }
                else {
                    const dmg_base = d(2, 6);
                    const orig_dmg = dmg_base;
                    const lev = mtmp.m_lev | 0;
                    pline_mon(mtmp, "%s attacks you with a fiery gaze!", Monnam(mtmp));
                    await stop_occupation();
                    let dmg = dmg_base;
                    if (Fire_resistance(gs)) {
                        shieldeff(u.ux || 0, u.uy || 0);
                        pline_The("fire doesn't feel hot!");
                        monstseesu(M_SEEN_FIRE);
                        ugolemeffects(AD_FIRE, d(12, 6));
                        dmg = 0;
                    }
                    else {
                        monstunseesu(M_SEEN_FIRE);
                    }
                    await burn_away_slime();
                    if (lev > rn2(20))
                        await burnarmor(game.youmonst);
                    if (lev > rn2(20)) {
                        await destroy_items(game.youmonst, AD_FIRE, orig_dmg);
                        await ignite_items(gs.invent || null);
                    }
                    if (dmg) {
                        const deathBeforeDamage = game._pendingDeath || null;
                        await mdamageu(mtmp, dmg);
                        /* C mhitu.c:1851,1925: done_in_by() handles death
                         * before gazemu returns and the next attack starts. */
                        if (game._pendingDeath && game._pendingDeath !== deathBeforeDamage)
                            await drain_pending_death_in_place();
                    }
                }
            }
            break;
        /* AD_SLEE / AD_SLOW: compiled only when PM_BEHOLDER defined.
         * Port them anyway to preserve RNG fidelity if they appear at runtime. */
        case AD_SLEE:
            if (mcanseeu && (gm_obj.multi || 0) >= 0 && !rn2(5)
                && !Sleep_resistance(gs)) {
                if (cancelled) {
                    react = 6; /* "tired" */
                    already = ((mtmp.mfrozen | 0) !== 0);
                }
                else {
                    await fall_asleep(-rnd(10), true);
                    pline(s_suffix(Monnam(mtmp)) + " gaze makes you very sleepy...");
                    monstunseesu(M_SEEN_SLEEP);
                }
            }
            break;
        case AD_SLOW:
            if (mcanseeu
                && (HFast(gs) & (INTRINSIC | TIMEOUT))
                && !rn2(4)) {
                if (cancelled) {
                    react = 7; /* "dulled" */
                    already = (mtmp.mspeed === 2 /* MSLOW */);
                }
                else {
                    u_slow_down();
                    await stop_occupation();
                }
            }
            break;
        default:
            pline("Gaze attack " + mattk.adtyp + "?"); /* impossible() */
            break;
    }
    if (react >= 0) {
        if (Hallucination(gs) && rn2(3))
            react = rn2(8); /* rn2(SIZE(reactions)) — 8 entries */
        /* cancelled/hallucinatory feedback */
        pline_mon(mtmp, "%s looks %s%s.", Monnam(mtmp), !rn2(3) ? "" : already ? "quite "
            : (!rn2(2) ? "a bit " : "somewhat "), reactions[react]);
    }
    return M_ATTK_MISS;
}
// WIRE_PENDING: cadence-1-gazemu


/* monattk.h attack/damage-type constants (those not already in scope above). */
const AT_NONE_ = 0;
const AT_CLAW_ = 1;
const AT_BITE_ = 2;
const AT_KICK_ = 3;
const AT_BUTT_ = 4;
const AT_TUCH_ = 5;
const AT_STNG_ = 6;
const AT_HUGS_ = 7;
const AT_BOOM_ = 14;
const AT_WEAP_ = 254;
const AD_PHYS_ = 0;
const AD_ELEC_ = 6;

/* objects[otyp].a_can for worn armor.  Keyed by both the symbolic otyp name
 * (starter armor in u_init carries a string otyp) and the numeric otyp.
 * Values are the C objects.h `can` field (3.7 monsters/objects).  Only
 * nonzero entries are listed; everything else is 0.
 * C ref: nethack-c/include/objects.h ARMOR()/HELM()/CLOAK() macros. */
const A_CAN_BY_NAME = {
    /* suits */
    PLATE_MAIL: 2, CRYSTAL_PLATE_MAIL: 2, BRONZE_PLATE_MAIL: 1, SPLINT_MAIL: 1,
    BANDED_MAIL: 1, DWARVISH_MITHRIL_COAT: 2, ELVEN_MITHRIL_COAT: 2,
    CHAIN_MAIL: 1, ORCISH_CHAIN_MAIL: 1, SCALE_MAIL: 1, STUDDED_LEATHER_ARMOR: 1,
    RING_MAIL: 1, ORCISH_RING_MAIL: 1, LEATHER_ARMOR: 1,
    /* cloaks */
    MUMMY_WRAPPING: 1, ELVEN_CLOAK: 1, ORCISH_CLOAK: 1, DWARVISH_CLOAK: 1,
    OILSKIN_CLOAK: 2, ROBE: 2, ALCHEMY_SMOCK: 1, LEATHER_CLOAK: 1,
    CLOAK_OF_PROTECTION: 3, CLOAK_OF_INVISIBILITY: 1, CLOAK_OF_MAGIC_RESISTANCE: 1,
    CLOAK_OF_DISPLACEMENT: 1,
    /* helms */
    CORNUTHAUM: 1,
};
/* numeric otyp → a_can, for armor picked up in-game (numeric otyp).
 * Anchors verified against js/u_init.js otyp constants. */
const A_CAN_BY_OTYP = {
    /* suits 121..134 */
    121: 2, 122: 2, 123: 1, 124: 1, 125: 1, 126: 2, 127: 2, 128: 1, 129: 1,
    130: 1, 131: 1, 132: 1, 133: 1, 134: 1,
    /* cloaks 138..149 */
    138: 1, 139: 1, 140: 1, 141: 1, 142: 2, 143: 2, 144: 1, 145: 1, 146: 3,
    147: 1, 148: 1, 149: 1,
    /* helm: cornuthaum 93 */
    93: 1,
};
function obj_a_can(obj) {
    if (!obj) return 0;
    const ot = obj.otyp;
    if (typeof ot === 'string') return A_CAN_BY_NAME[ot] | 0;
    return A_CAN_BY_OTYP[ot | 0] | 0;
}

const MON_MATTK = /** @type {(number[][]|0)[]} */ ([[[2,0,1,4]],[[6,7,1,3]],[[2,0,2,4],[6,7,3,4]],[[2,0,2,4],[2,2,2,4]],[[2,0,3,6]],[[6,7,1,8]],[[0,8,1,8]],[[5,0,1,8]],[[5,14,2,4],[0,14,1,4]],[[2,0,1,2],[5,18,0,0],[0,18,0,0]],[[2,0,1,3],[5,18,0,0],[0,18,0,0]],[[15,2,2,6],[2,0,1,6]],[[2,0,1,2]],[[2,0,1,3]],[[2,0,1,4]],[[2,29,1,4]],[[2,0,1,6]],[[2,0,1,6]],[[2,0,1,6]],[[2,0,2,4]],[[2,0,2,4]],[[2,29,2,6]],[[2,0,1,8],[12,3,1,6]],[[2,0,2,6]],[[2,0,2,6],[12,3,2,6]],[[2,0,2,6],[12,2,2,6]],[[2,0,3,6],[12,2,3,6]],[[14,0,4,6]],[[0,14,0,70]],[[13,3,4,6]],[[13,2,4,6]],[[13,6,4,6]],[[2,0,1,6]],[[2,0,1,6]],[[1,0,1,4],[1,0,1,4],[2,0,1,8]],[[1,0,1,4],[1,0,1,4],[2,0,1,10]],[[1,0,1,6],[1,0,1,6],[2,0,1,10]],[[2,0,2,4]],[[1,0,2,4],[1,0,2,4],[2,0,1,10]],[[1,0,4,4],[1,0,4,4],[2,0,2,10]],[[1,0,1,6],[1,0,1,6],[2,0,1,4],[1,253,0,0]],[[1,0,2,6],[1,0,2,6],[2,0,2,4]],[[1,0,3,6],[1,0,3,6],[2,0,3,4]],[[254,0,1,6]],[[254,0,1,8]],[[254,0,2,4]],[[254,0,2,4],[254,0,2,4]],[[254,0,2,6],[254,0,2,6]],[[254,0,1,4],[16,32,2,1],[16,32,2,1],[16,32,2,1]],[[254,0,1,8],[16,32,2,1],[16,32,2,1],[16,32,2,1],[16,32,2,1],[16,32,2,1]],[[1,0,1,3],[1,0,1,3],[2,0,1,4]],[[2,4,1,3]],[[1,0,1,4]],[[1,0,1,3]],[[1,30,1,2],[1,30,1,2],[2,0,1,4]],[[2,0,1,7]],[[0,3,0,6]],[[0,8,0,6]],[[11,8,3,6],[0,8,3,6]],[[254,0,1,4]],[[254,0,1,6]],[[254,0,2,4]],[[255,241,0,0]],[[1,20,1,2]],[[1,0,3,4]],[[1,19,3,4]],[[1,19,3,6],[1,19,3,6]],[[1,21,0,0],[1,22,0,0]],[[1,21,0,0],[1,22,0,0]],[[1,21,0,0],[1,22,0,0]],[[254,0,1,4]],[[254,0,1,6]],[[254,0,1,8]],[[254,0,1,6]],[[254,0,1,6]],[[254,0,1,8]],[[255,241,0,0]],[[254,0,2,4],[254,0,2,4]],[[2,0,2,6]],[[2,0,3,6]],[[2,0,4,6]],[[1,0,1,3],[2,0,1,3],[2,0,1,8]],[[4,0,4,12],[2,0,2,6]],[[1,0,2,6],[2,0,2,6],[1,0,2,6]],[[2,0,3,6]],[[1,0,2,8]],[[1,0,5,4],[1,0,5,4]],[[4,0,4,8],[4,0,4,8]],[[2,0,1,3]],[[2,0,1,3]],[[2,31,2,4]],[[2,29,1,4]],[[2,0,1,6]],[[2,0,1,6]],[[2,0,1,2]],[[2,7,1,3]],[[2,7,2,4]],[[1,0,1,2],[1,0,1,2],[6,7,1,4]],[[11,28,1,6],[11,0,2,6]],[[11,28,1,8],[11,0,2,8]],[[3,0,1,6],[2,0,1,2]],[[4,0,1,12],[3,0,1,6]],[[4,0,1,12],[3,0,1,6]],[[4,0,1,12],[3,0,1,6]],[[3,0,1,8],[2,0,1,3]],[[3,0,1,10],[2,0,1,4]],[[11,0,1,6]],[[11,11,2,8]],[[11,3,1,6]],[[11,6,1,6],[11,16,2,6],[0,6,0,4]],[[11,2,1,8]],[[11,2,1,10],[0,2,0,4]],[[2,0,1,4]],[[2,0,1,6]],[[2,0,2,4]],[[2,0,2,8],[11,26,1,10]],[[2,6,1,1]],[[6,17,1,4]],[[13,11,10,20]],[[13,36,10,12]],[[1,0,3,4],[1,0,3,4],[2,0,3,6]],[[2,7,2,4],[2,0,1,3],[7,28,2,4]],[[254,0,1,6],[254,0,1,6],[3,0,1,4]],[[254,0,1,6],[254,0,1,6],[1,0,1,4],[255,1,2,6]],[[3,0,2,4],[3,0,2,4],[4,0,3,6],[255,241,2,6]],[[254,0,2,4],[254,0,2,4],[15,11,2,6],[1,0,1,8],[255,241,4,6]],[[2,0,1,4]],[[2,0,1,6]],[[2,0,1,6],[1,11,1,6]],[[2,0,1,6],[2,7,0,0]],[[254,0,1,6],[3,0,1,6]],[[254,0,1,8],[3,0,1,6]],[[254,0,1,10],[3,0,1,6],[3,0,1,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[12,1,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,2,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,3,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,2,6,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,3,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,4,4,25],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,5,1,255],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,6,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,7,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,8,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[1,0,4,4]],[[11,0,1,10]],[[1,2,3,6],[0,2,0,4]],[[1,0,4,6]],[[1,0,5,6]],[[5,19,0,0]],[[0,3,0,6]],[[0,12,0,4]],[[0,8,0,4]],[[0,2,0,4]],0,[[5,0,1,4],[5,19,0,0]],[[254,0,1,6]],[[254,0,1,8]],[[255,241,0,0]],[[254,0,2,6]],[[254,0,2,10]],[[254,0,2,10]],[[254,0,2,8]],[[254,0,2,10]],[[254,0,2,12]],[[254,0,2,8],[254,0,3,6]],[[254,0,2,12]],[[254,0,2,8],[255,241,0,0]],[[1,0,3,10],[1,0,3,10],[4,0,2,8]],[[2,0,2,10],[2,0,2,10],[1,0,2,10],[1,0,2,10]],[[254,0,1,4]],[[254,0,1,6]],[[254,0,1,8]],[[254,0,2,6]],[[5,3,1,10],[255,241,0,0]],[[5,3,3,4],[255,241,0,0]],[[5,3,3,6],[255,241,0,0]],[[5,3,5,6],[255,241,0,0]],[[1,0,1,4]],[[1,0,1,6]],[[1,0,1,6]],[[1,0,1,6]],[[1,0,2,4]],[[1,0,2,4],[1,0,2,4]],[[1,0,2,6],[1,0,2,6]],[[1,0,3,4],[1,0,3,4]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,2,4],[12,2,2,6]],[[2,0,2,6],[10,8,0,0]],[[2,0,2,6],[255,241,4,6]],[[10,7,1,6],[2,14,1,6],[5,0,0,0],[7,28,2,4]],[[254,0,2,5]],[[254,0,2,6]],[[254,0,3,5]],[[2,24,2,8]],[[2,34,0,0]],[[5,40,1,4],[0,40,0,0]],[[2,42,3,8],[0,42,0,0]],[[1,23,1,4]],[[1,43,1,4]],[[5,24,0,0],[5,24,0,0],[0,24,0,0]],[[1,41,4,4],[0,41,0,0]],[[2,0,1,2]],[[2,7,1,6]],[[2,7,1,6]],[[2,0,1,4],[5,0,0,0],[7,28,1,4],[7,0,2,4]],[[2,7,1,4],[2,7,1,4]],[[2,7,2,4],[10,11,0,0]],[[254,0,4,2],[1,0,4,2],[2,0,2,6]],[[254,0,2,6],[1,3,2,6],[2,0,2,6]],[[254,0,3,6],[1,0,2,8],[2,0,2,6]],[[254,0,2,8],[1,0,2,8],[2,0,2,6]],[[254,0,3,6],[1,0,2,8],[2,0,2,6]],[[1,0,3,4],[1,0,3,4],[2,0,2,5],[15,25,0,0]],[[1,0,1,6],[2,15,1,6]],[[1,0,1,8],[2,15,1,8]],[[254,0,2,10],[2,15,1,12]],[[254,15,0,0],[255,241,0,0],[1,0,1,4],[5,3,1,4]],[[5,15,1,6]],[[254,15,1,4],[12,4,2,25]],[[1,0,1,3],[1,0,1,3],[1,0,1,3],[2,0,4,6]],[[1,21,0,0],[2,0,1,3]],[[1,0,1,3],[1,0,1,3],[2,0,1,6]],[[1,0,1,6],[1,0,1,6],[7,0,2,8]],[[1,0,1,6],[1,0,1,6],[2,0,1,4]],[[1,0,1,4],[1,0,1,4],[7,0,1,8]],[[1,0,1,6],[1,0,1,6],[3,0,1,8]],[[1,0,1,4]],[[1,0,1,5]],[[1,0,1,6]],[[1,0,1,6]],[[1,0,1,7]],[[1,0,1,8]],[[1,0,1,10],[1,0,1,10]],[[1,14,1,2],[1,0,1,3]],[[1,0,2,8],[1,0,2,8]],[[254,0,2,6],[5,13,1,6]],[[1,0,1,2],[1,0,1,2]],[[1,0,1,3]],[[1,0,1,4],[1,0,1,4],[7,0,6,1]],[[1,0,2,3],[1,0,2,3]],[[1,0,1,6],[1,0,1,6]],[[1,0,3,4]],[[1,0,2,8],[1,0,2,8]],[[1,0,3,10]],[[1,0,3,8]],[[1,0,2,8],[1,0,2,8]],[[254,0,4,10],[12,7,4,6]],[[254,0,1,6]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,1,8]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,2,4],[254,0,2,4]],[[254,0,2,4],[254,0,2,4]],[[254,0,1,12]],[[254,0,4,4],[254,0,4,4]],[[254,0,4,10]],[[254,0,1,6]],[[0,1,0,4]],[[254,0,4,10],[3,0,1,4],[255,240,0,0]],[[254,0,4,10],[3,0,2,8],[255,240,2,8],[255,240,2,8]],[[254,0,1,8]],[[254,0,2,6]],[[1,27,2,6]],[[254,0,3,4],[254,0,3,4]],[[254,0,4,4],[254,0,4,4]],[[254,0,1,8]],[[254,0,3,4],[254,0,3,4]],[[254,0,2,4],[1,0,1,8],[15,18,0,0],[2,7,1,6]],[[1,252,2,12],[255,241,0,0]],[[254,0,4,10]],[[5,0,1,1]],[[5,14,2,6],[5,13,1,6]],[[254,0,1,3],[1,0,1,3],[2,0,1,3]],[[2,35,0,0],[1,0,1,3],[1,0,1,3]],[[254,0,1,4],[1,0,1,4],[2,0,2,3],[6,0,1,3]],[[254,7,2,4]],[[1,0,2,4],[1,19,2,4],[6,0,3,4]],[[254,0,2,4],[254,0,2,4],[1,0,2,4],[1,0,2,4],[1,0,2,4],[1,0,2,4]],[[1,0,1,4],[1,0,1,4],[1,0,1,8],[1,0,1,8],[2,0,1,6]],[[1,0,1,3],[1,0,1,3],[2,0,4,4]],[[254,0,3,4],[6,7,2,4]],[[1,0,1,4],[1,0,1,4],[2,0,2,4],[6,3,3,4],[5,13,1,1]],[[1,0,1,4],[1,0,1,4],[2,0,2,4],[255,241,0,0]],[[254,0,4,2],[254,0,4,2],[7,0,2,4]],[[254,0,2,6],[254,0,2,6]],[[254,0,8,4],[254,0,4,6]],[[11,33,4,10],[10,8,3,6]],[[254,0,3,6],[254,25,2,8],[1,14,1,6],[255,1,2,6]],[[254,0,3,6],[1,0,3,4],[1,0,3,4],[255,241,8,6],[6,7,2,4]],[[1,0,3,6],[1,0,3,6],[6,7,2,4]],[[254,0,4,6],[255,241,6,6]],[[2,7,2,6],[15,12,2,6]],[[1,0,4,4],[255,3,6,6]],[[255,241,8,6],[6,15,1,4],[1,33,1,6],[1,33,1,6]],[[5,37,8,8],[5,37,8,8]],[[5,38,8,8],[5,38,8,8]],[[5,39,8,8],[5,39,8,8]],0,[[254,0,2,8]],[[6,7,3,3]],[[2,0,2,6],[2,0,2,6]],[[2,0,5,6]],[[2,0,3,6],[5,28,0,0]],[[2,6,4,6],[5,28,0,0]],[[1,0,2,4],[1,0,2,4],[7,28,2,6],[2,0,5,4]],[[2,0,1,2]],[[2,0,1,3]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,1,6]],[[2,0,4,2]],[[2,0,4,2],[1,0,1,12]],[[254,0,2,8],[5,2,1,6],[7,0,2,6],[7,2,3,6]],0,[[254,0,1,6],[254,0,1,6]],[[254,0,1,6],[254,0,1,6]],[[254,0,2,4]],[[254,0,1,6]],[[254,0,1,6],[254,0,1,6]],[[1,0,1,8],[3,0,1,8]],[[254,0,1,6],[255,240,0,0]],[[254,0,1,4]],[[254,0,1,6],[254,0,1,6]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[254,0,1,6]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[255,241,0,0]],[[254,0,4,10],[255,241,4,8]],[[254,0,4,10],[254,0,4,10]],[[254,0,4,10],[255,240,2,8]],[[254,0,1,6],[255,240,3,8],[255,240,3,8]],[[254,0,4,10],[254,0,4,10]],[[1,0,4,10],[3,0,2,8],[255,240,2,8],[255,240,2,8]],[[254,0,4,10],[3,0,2,8],[255,240,2,8],[255,240,2,8]],[[254,0,4,10],[255,241,4,8]],[[254,0,4,10],[254,0,2,6],[1,252,2,4]],[[254,0,4,10],[254,0,4,10]],[[254,0,4,10]],[[254,0,4,10],[254,0,4,10]],[[254,0,4,10],[255,241,2,8],[255,241,2,8]],[[254,0,8,4],[254,0,4,6],[255,241,0,0],[1,252,2,6]],[[254,0,1,6],[255,241,0,0],[255,241,0,0],[1,252,1,4]],[[12,242,6,6],[255,241,0,0],[1,252,2,8],[2,0,4,8],[2,0,4,8],[6,0,1,6]],[[254,0,4,8],[254,0,4,8],[1,252,2,6]],[[12,2,8,6],[2,0,4,8],[255,241,0,0],[1,0,2,4],[1,252,2,4]],[[1,0,16,2],[1,0,16,2],[255,240,0,0],[1,252,1,4]],[[254,0,8,4],[254,0,4,6],[255,241,0,0],[1,252,2,6]],[[1,0,2,6],[1,252,2,6],[6,33,1,4]],[[254,7,2,6],[254,0,2,8],[1,252,2,6]],[[254,0,2,6],[254,0,2,6],[1,252,2,6]],[[254,0,2,10],[254,0,2,10],[1,252,2,6]],[[254,0,1,6],[254,0,1,6],[1,252,1,4],[255,241,0,0]],[[254,0,1,6]],[[254,0,1,6]],[[254,0,2,4]],[[254,0,1,6]],[[254,0,1,6],[254,0,1,6]],[[1,0,8,2],[3,12,3,2],[255,240,0,0]],[[254,0,1,6],[255,240,0,0]],[[254,0,1,4]],[[254,0,1,6],[254,0,1,6]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[255,241,0,0]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[255,241,0,0]]]);

/* Fetch a monster's mattk[i] tuple as {aatyp,adtyp,damn,damd}, or null if the
 * monster index or attack slot is empty (NO_ATTK). */
function mon_mattk(mndx, i) {
    const row = mon_mattk_raw(mndx);
    if (!row) return null;
    const a = (i < row.length) ? row[i] : null;
    if (!a || (a[0] === AT_NONE_ && a[1] === 0 && a[2] === 0 && a[3] === 0))
        return null;
    return { aatyp: a[0] | 0, adtyp: a[1] | 0, damn: a[2] | 0, damd: a[3] | 0 };
}

/* C ref: mondata.c:61 noattacks — TRUE iff every attack is AT_NONE/AT_BOOM. */
export function noattacks_mndx(mndx) {
    const row = mon_mattk_raw(mndx);
    if (!row) return true;
    for (const a of row) {
        if (a[0] === AT_BOOM_) continue;
        if (a[0]) return false;
    }
    return true;
}

/* Raw mattk[] table accessor: returns the array of [aatyp,adtyp,damn,damd]
 * tuples for `mndx`, or null if the monster has no attack row.  Callers that
 * need the C-faithful NATTK fixed-array semantics (trailing slots are the
 * implicit {AT_NONE,AD_PHYS,0,0}) handle the padding themselves — e.g.
 * passivemm's "find first AT_NONE slot" loop. */
export function mon_mattk_raw(mndx) {
    /* C mon.c:5922-5961 adj_erinys mutates this species' attacks in mons[].
     * Read the shared mutable row (_KB_MATTK IS monKbMattkPack.mattk, the
     * object rows attrib.js mutates), including newly enabled attack slots. */
    if (mndx === PM_ERINYS)
        return _KB_MATTK[mndx].map(a => [a.aatyp, a.adtyp, a.damn, a.damd]);
    const row = (mndx >= 0 && mndx < MON_MATTK.length) ? MON_MATTK[mndx] : 0;
    return row ? row : null;
}

/* AT_TENT / AT_EXPL / AT_BOOM — attack-type constants used only by hitmsg().
 * C ref: nethack-c/include/monattk.h:26 `#define AT_TENT 16` and :23
 * `#define AT_EXPL 13`.  AT_TENT IS unconditionally defined in released 3.7
 * (the previous comment here claimed it was not, and set 9 — a value no AT_
 * ever takes, since monattk.h skips 8 and 9 entirely).  With 9 the
 * `case AT_TENT_` arm of hitmsg() below was unreachable, so a tentacle
 * attacker printed "hits you!" instead of "<Monster>'s tentacles suck your
 * brain!". */
const AT_TENT_ = 16;
const AT_EXPL_ = 13;

/* C ref: youprop.h:125 Deaf = (HDeaf || EDeaf || u.uroleplay.deaf).
 * Mirrors the existing Blind(gs) simplification in this file (gs.flags.*
 * placeholder), for the same reason: the full HDeaf/EDeaf intrinsic-prop
 * machinery isn't wired into the replay bridge yet. */
function Deaf(gs) {
    const p = gs.u?.uprops?.[DEAF];
    return !!((gs.flags && gs.flags.deaf) || (p?.intrinsic | 0) || (p?.extrinsic | 0)
              || (gs.u?.HDeaf | 0) || gs.u?.uroleplay?.deaf);
}

/* C ref: nethack-c/src/mhitu.c:29-82 hitmsg() — emit "<Monster> bites/
 * kicks/stings/.../hits you[!|.]", with the seduction ("smiles at you
 * seductively") and repeat-attack ("bites again") special cases, and
 * update the gh.hitmsg_mid/gh.hitmsg_prev "last attack" tracking used by
 * the repeat-attack check on the NEXT call.
 *
 * gh.hitmsg_prev is a `struct attack *` in C; "mattk == gh.hitmsg_prev + 1"
 * tests pointer identity into the monster's fixed mattk[NATTK] array (the
 * next slot). JS attack objects carry no pointer identity, so — mirroring
 * hitmsg_je's existing _ai convention in this file — the attack-array index
 * a caller stamps onto mattk._ai stands in for the pointer; unstamped
 * (_ai == null) calls can never satisfy "prev + 1" (structurally false),
 * same as C: a NULL/foreign gh.hitmsg_prev never satisfies the check
 * either. */
export async function hitmsg(mtmp, mattk) {
    const gs = game;
    const gh = gs.gh || (gs.gh = {});
    let verb, again;
    let punct = '!';
    let Monst_name = Monnam(mtmp);

    const compat = could_seduce(mtmp, gs.youmonst, mattk);
    if (compat !== 0 && !mtmp.mcan && !mtmp.mspec_used) {
        await pline_mon(mtmp, '%s %s you %s.', Monst_name, !Blind(gs) ? 'smiles at' : !Deaf(gs) ? 'talks to' : 'touches', (compat === 2) ? 'engagingly' : 'seductively');
    } else {
        switch (mattk.aatyp) {
            case AT_BITE_:
                verb = 'bites';
                break;
            case AT_KICK_:
                if (thick_skinned(youmonst_data(gs)))
                    punct = '.';
                verb = 'kicks';
                break;
            case AT_STNG_:
                verb = 'stings';
                break;
            case AT_BUTT_:
                verb = 'butts';
                break;
            case AT_TUCH_:
                verb = 'touches you';
                break;
            case AT_TENT_:
                verb = 'tentacles suck your brain';
                Monst_name = s_suffix(Monst_name);
                break;
            case AT_EXPL_:
            case AT_BOOM_:
                verb = 'explodes';
                break;
            default:
                verb = 'hits';
        }
        /* one shared "last attack" record with hitmsg_je/missmu_je (the
         * attack-slot index stands in for C's struct attack pointer) */
        again = (mtmp.m_id === gs._hitmsg_mid
            && gs._hitmsg_prev_ai != null
            && mattk._ai != null
            && mattk._ao === gs._hitmsg_prev_ao
            && (mattk._ai | 0) === (gs._hitmsg_prev_ai | 0) + 1
            && mattk.aatyp === gs._hitmsg_prev_aatyp) ? ' again' : '';
        await pline_mon(mtmp, '%s %s%s%s', Monst_name, verb, again, punct);
    }
    /* C win/tty/topl.c update_topl() calls blocking more() at this exact
     * putmesg boundary when the new hit message overflows the topline.  The
     * JS display model accumulates messages until a flush boundary, so drain
     * that already-detected page before combat continues to its next effect or
     * allmain reaches unmul() and prints a delayed-action completion message. */
    if (_topline_more_pending())
        await flush_pending_messages();
    gs._hitmsg_mid = mtmp.m_id;
    gs._hitmsg_prev_ai = (mattk._ai != null ? (mattk._ai | 0) : null);
    gs._hitmsg_prev_ao = mattk._ao;
    gs._hitmsg_prev_aatyp = mattk.aatyp;
}

/* C ref: mhitu.c hitmsg() — emit the "<Monster> bites/butts/..." message. */
export function hitmsg_je(mtmp, mattk) {
    let verb;
    switch (mattk.aatyp) {
        case AT_BITE_: verb = 'bites'; break;
        case AT_KICK_: verb = 'kicks'; break;
        case AT_STNG_: verb = 'stings'; break;
        case AT_BUTT_: verb = 'butts'; break;
        case AT_TUCH_: verb = 'touches you'; break;
        case AT_CLAW_:
        default: verb = 'hits'; break;
    }
    /* C ref: mhitu.c:73-77 — "if a monster hits more than once with a similar
     * attack, say so": append " again" when this is the SAME monster hitting
     * with the immediately-following attack slot (mattk == hitmsg_prev + 1) of
     * the same aatyp.  gh.hitmsg_prev is the attack index within the monster's
     * mattk[] array (set by mattacku as mattk._ai). */
    const g = game;
    const again = (mtmp && mtmp.m_id === g._hitmsg_mid
        && g._hitmsg_prev_ai != null
        && mattk._ai != null
        && mattk._ao === g._hitmsg_prev_ao
        && (mattk._ai | 0) === (g._hitmsg_prev_ai | 0) + 1
        && mattk.aatyp === g._hitmsg_prev_aatyp) ? ' again' : '';
    const Monst_name = je_Monnam(mtmp);
    /* C mhitu.c:77 pline_mon(mtmp, ...) */
    pline_mon(mtmp, `${Monst_name} ${verb}${again}!`);
    /* C ref: mhitu.c:80-81 — remember this monster + attack for the next hitmsg. */
    g._hitmsg_mid = mtmp ? mtmp.m_id : 0;
    g._hitmsg_prev_ai = (mattk._ai != null ? (mattk._ai | 0) : null);
    g._hitmsg_prev_ao = mattk._ao;
    g._hitmsg_prev_aatyp = mattk.aatyp;
}

/* C ref: mon.c Monnam() — capitalized "the <species>". */
function je_Monnam(mtmp) {
    return Monnam_mhu(mtmp);
}

/* C ref: mhitu.c:1086 magic_negation — hero defender (is_you) path only.
 * Returns mc in [0..3]. Reads worn-armor a_can, extrinsic Protection, and
 * intrinsic Protection when blessed, the spell-protection minimum, and the
 * innate minimum for minion forms. Aligned-cleric intrinsic protection remains
 * unmodeled here. */
const AMULET_OF_GUARDING_MU = 210; /* C objects.h:855 */
function magic_negation_u() {
    const u = game.u || {};
    let mc = 0;
    const slots = [u.uarm, u.uarmc, u.uarmh, u.uarms, u.uarmg, u.uarmf, u.uarmu];
    for (const o of slots) {
        if (!o) continue;
        const armpro = obj_a_can(o);
        if (armpro > mc) mc = armpro;
    }
    const protProp = (u.uprops && u.uprops[PROTECTION]) || {};
    let via_amul = false;
    for (let o = game.invent; o; o = o.nobj)
        if ((o.owornmask & W_AMUL) !== 0 && o.otyp === AMULET_OF_GUARDING_MU)
            via_amul = true;
    /* C mhitu.c:1115-1133: EProtection raises mc once (twice for a guarding
     * amulet), capped at 3. Without it, blessed HProtection and u.uspellprot
     * each provide a minimum of 1. */
    if (protProp.extrinsic) {
        mc += via_amul ? 2 : 1;
        if (mc > 3) mc = 3;
    } else if (mc < 1 && ((protProp.intrinsic && u.ublessed > 0) || u.uspellprot
        || is_minion(game.youmonst?.data))) {
        mc = 1;
    }
    return mc;
}

function mhitm_mgc_atk_negated_u(verbosely, magr) {
    if (magr && (magr.mcan | 0))
        return true;
    const armpro = magic_negation_u();
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        if (verbosely) pline('You avoid harm.');
        return true;
    }
    return false;
}

/* mhitm AD_* result holder, mirroring C struct mhitm_data. */
function newMhm(dmg) {
    return { damage: dmg, hitflags: M_ATTK_MISS, permdmg: 0, specialdmg: 0, done: false };
}

/* C ref: uhitm.c:3982 mhitm_ad_phys, mdef == &youmonst branch (no weapon,
 * non-HUGS hand-to-hand): emits hit message, sets M_ATTK_HIT, no RNG.
 * (Weapon/HUGS/corpse paths are deferred — see DEFERRED note.) */
async function mhitm_ad_phys_u(mtmp, mattk, mhm) {
    if (mattk.aatyp === AT_HUGS_) {
        const u = game.u || (game.u = {});
        if (!_kb_sticks(_hero_form_mndx_mu())) {
            if (!u.ustuck && rn2(2)) {
                if (u_slip_free(mtmp, mattk)) {
                    mhm.damage = 0;
                    mhm.hitflags |= M_ATTK_MISS;
                } else {
                    set_ustuck_mu(mtmp);
                    pline_mon(mtmp, `${Monnam(mtmp)} grabs you!`);
                    mhm.hitflags |= M_ATTK_HIT;
                }
            } else if (u.ustuck === mtmp) {
                exercise(A_STR_AD, false);
                const pa_mndx = (mtmp.mnum ?? mtmp.mndx ?? -1) | 0;
                pline(`You are being ${pa_mndx === PM_ROPE_GOLEM_MU
                    ? 'choked' : 'crushed'}.`);
            }
            return;
        }
        /* sticks(pd) true: fall through to the hand-to-hand/weapon code
         * below, matching C's `else` arm. */
    }
    /* C uhitm.c:4041-4121 — the wielded-weapon arm.  A monster attacking the
     * hero with AT_WEAP and a wielded weapon adds dmgval(otmp, &youmonst) on
     * top of the mattk dice; the plain-hitmsg arm below is C's `else if`. */
    const otmp = MON_WEP(mtmp);
    if (mattk.aatyp === AT_WEAP_ && otmp) {
        /* C uhitm.c:4047-4060 cockatrice-corpse-as-weapon petrification;
         * do_stone_u() itself declines when already Stoned or resistant. */
        if ((otmp.otyp | 0) === CORPSE_MK && touch_petrifies_mk(otmp.corpsenm)) {
            mhm.damage = 1;
            pline_mon(mtmp, `${Monnam(mtmp)} hits you with the ${monPmname_mu(otmp.corpsenm | 0, 2)} corpse.`);
            if (await do_stone_u(mtmp)) {
                mhm.hitflags = M_ATTK_HIT;
                mhm.done = 1;
                return;
            }
        }
        /* C:4061 */
        mhm.damage += dmgval(otmp, game.youmonst || { data: game.youmonst?.data });
        /* C:4062-4064 — a monster wearing gauntlets of power (otyp 161,
         * objects.h:694; e.g. an Astral player-monster) adds rn1(4, 3). */
        {
            const marmg = which_armor_mu(mtmp, W_ARMG_MU);
            if (marmg && (marmg.otyp | 0) === 161 /* GAUNTLETS_OF_POWER */)
                mhm.damage += rn1(4, 3); /* 3..6 */
        }
        if (mhm.damage <= 0)
            mhm.damage = 1;
        /* C:4067-4072 — if (!otmp->oartifact || !artifact_hit(magr, mdef,
         * otmp, &mhm->damage, gm.mhitu_dieroll)) hitmsg().  artifact_hit adds
         * spec_dbon to the damage and may print its own message (e.g. the
         * Staff of Aesculapius' "drains your life!" + losexp). */
        let arti_special = false;
        if (otmp.oartifact | 0) {
            const ah = await artifact_hit(mtmp, null, otmp, mhm.damage,
                                          (game.gm ||= {}).mhitu_dieroll,
                                          (game.u?.umonnum ?? -1) | 0);
            mhm.damage = ah.dmg;
            arti_special = ah.special;
        }
        if (!(otmp.oartifact | 0) || !arti_special) {
            hitmsg_je(mtmp, mattk);
            /* hitmsg's pline blocks in more() when it overflows (topl.c:257-268);
             * drain that page before the mhitu.c:1191 knockback draws run. */
            if (_topline_more_pending()) await flush_pending_messages();
            mhm.hitflags |= M_ATTK_HIT;
        }
        /* C uhitm.c:4073-4074 */
        if (!mhm.damage)
            return;
        /* C uhitm.c:4075-4079 — silver weapon vs a silver-hating hero form
         * (Hate_silver, youprop.h:401: lycanthropy or hates_silver(youmonst.data)).
         * exercise(A_CON, FALSE) returns early when Upolyd. */
        if (sr_oc_material_mu(otmp.otyp) === SILVER_MU
            && (((game.u?.ulycn ?? -1) | 0) >= 0
                || hates_silver_mu(game.youmonst && game.youmonst.data))) {
            await pline("The silver sears your flesh!");
            exercise(A_CON, false);
        }
        const _u = game.u || {};
        let ptmp = mhm.damage;
        if ((_u.uac | 0) < 0)
            ptmp -= rnd(-(_u.uac | 0));
        if (ptmp < 1)
            ptmp = 1;
        /* C:4088 Half_physical_damage halving of the local tmp — RNG-free. */
        ptmp = maybe_half_phys_mu(ptmp);
        const _pmat = sr_oc_material_mu(otmp.otyp);
        if (_u.mh - ptmp > 1
            && (_pmat === 11 /* IRON */ || _pmat === 12 /* METAL */)
            && (_u.umonnum === PM_BLACK_PUDDING_MU
                || _u.umonnum === PM_BROWN_PUDDING_MU)) {
            if (ptmp > 1)
                exercise(0 /* A_STR */, false);
            /* inflict damage now; we know it can't be fatal */
            _u.mh -= ptmp;
            (game.disp ||= {}).botl = 1;
            mhm.damage = 0; /* don't inflict more damage below */
            if (await cloneu())
                await pline(`You divide as ${mon_nam_uh(mtmp)} hits you!`);
        }
        /* C:4106 rustm(&gy.youmonst, otmp) — RNG-free unless the DEFENDER has an
         * AD_CORR/AD_RUST/AD_FIRE attack (a polymorphed hero); its rn2(chance)
         * sits behind `dmgtyp != ERODE_NONE`. */
        await rustm_mu(game.youmonst, otmp);
        /* C:4107-4121 — the was_poisoned poisoned() call (was_poisoned is
         * otmp->opoisoned || permapoisoned(otmp), fixed before dmgval). */
        if (((otmp.opoisoned | 0) || _permapoisoned_mu(otmp))
            && ((game.gm ||= {}).mhitu_dieroll | 0) <= 5) {
            const buf = `${s_suffix(je_Monnam(mtmp))} ${mpoisons_subj(mtmp, mattk)}`;
            await poisoned_u(buf, A_STR_AD, monPmname_mu((mtmp.mnum ?? mtmp.mndx ?? 0) | 0,
                                               mtmp.female ? 1 : 0), 10, false);
        }
        return;
    }
    const u_pt = game.u || {};
    if (mattk.aatyp !== AT_TUCH_ || mhm.damage !== 0 || mtmp !== u_pt.ustuck) {
        hitmsg_je(mtmp, mattk);
        if (_topline_more_pending()) await flush_pending_messages();
        mhm.hitflags |= M_ATTK_HIT;
    }
}

async function mhitm_ad_elec_u(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    hitmsg_je(mtmp, mattk);
    if (!mhitm_mgc_atk_negated_u(true, mtmp)) {
        pline('You get zapped!');
        /* C: `if (Shock_resistance)`.  This used to read the raw (always
         * undefined) `u.Shock_resistance` property; the real reader,
         * Shock_resistance_gu() (below, same SHOCK_RES uprops-slot fix its own
         * header documents), is what AD_FIRE's sibling gaze arm already uses. */
        if (Shock_resistance_gu()) {
            pline('The zap doesn\'t shock you!');
            monstseesu(M_SEEN_ELEC);
            mhm.damage = 0;
        } else {
            monstunseesu(M_SEEN_ELEC);
        }
        /* C uhitm.c:2719: if ((int) magr->m_lev > rn2(20)) destroy_items(...) */
        if ((mtmp.m_lev | 0) > rn2(20)) {
            await destroy_items_zap(true, AD_ELEC_, orig_dmg);
        }
    }
    else {
        mhm.damage = 0;
    }
}

async function mhitm_ad_cold_u(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    hitmsg_je(mtmp, mattk);
    if (!mhitm_mgc_atk_negated_u(true, mtmp)) {
        pline("You're covered in frost!");
        if (Cold_resistance_mk()) {
            pline_The("frost doesn't seem cold!");
            monstseesu(M_SEEN_COLD);
            mhm.damage = 0;
        } else {
            monstunseesu(M_SEEN_COLD);
        }
        /* C uhitm.c:2660: if ((int) magr->m_lev > rn2(20)) destroy_items(...) */
        if ((mtmp.m_lev | 0) > rn2(20)) {
            await destroy_items_hero_zap(true, AD_COLD_MK, orig_dmg);
        }
    } else {
        mhm.damage = 0;
    }
}

async function mhitm_ad_acid_u(mtmp, mattk, mhm) {
    hitmsg_je(mtmp, mattk);
    if (!(mtmp.mcan | 0) && !rn2(3)) {
        if (Acid_resistance_gu()) {
            pline(`You're covered in ${hliquid_mu('acid')}, but it seems harmless.`);
            monstseesu(M_SEEN_ACID);
            mhm.damage = 0;
        } else {
            pline(`You're covered in ${hliquid_mu('acid')}!  It burns!`);
            exercise(A_STR_AD, false);
            monstunseesu(M_SEEN_ACID);
        }
    } else
        mhm.damage = 0;
}

/* monattk.h / monflag.h constants for knockback gating. */
const AT_ENGL_ = 11;       /* engulf */
const AD_STCK_ = 19;       /* sticks to you */
const AD_WRAP_ = 28;       /* eel "stick" */
const AD_DRIN_ = 32;       /* drains intelligence (mind flayer) */
const OILSKIN_CLOAK_ = 142; /* objects.h otyp index (145 is the leather cloak) */
const MZ_HUMAN_ = 2;       /* monflag.h: MZ_HUMAN == MZ_MEDIUM */
const MZ_HUGE_ = 4;        /* monflag.h: MZ_HUGE */
const M1_UNSOLID_ = 0x00100000; /* monflag.h mflags1 */
const IS_OBSTRUCTED_TYP = 16;   /* rm.h: IS_OBSTRUCTED(typ) = typ < POOL(16) */
const IRONBARS_TYP = 22;        /* rm.h: IRONBARS */
const DOOR_TYP = 23;            /* rm.h: DOOR */
const D_CLOSED_KB = 0x04;       /* rm.h doormask */
const D_LOCKED_KB = 0x08;

/* permonst scalar lookups by monster index — the replay's mtmp.data does not
 * carry msize/mattk/mflags1, so source them from the makemon packs (parallel to
 * mons[] row order), the same arrays makemon.js uses. */
const _KB_MSIZE = monKbMsizePack.msize;
const _KB_MATTK = monKbMattkPack.mattk;
const _KB_MONS = monKbMonsPack.mons;
function _kb_msize(mndx) {
    return (mndx >= 0 && mndx < _KB_MSIZE.length) ? (_KB_MSIZE[mndx] | 0) : 2;
}
function _kb_mflags1(mndx) {
    const row = (mndx >= 0 && mndx < _KB_MONS.length) ? _KB_MONS[mndx] : null;
    return row ? (row[6] | 0) : 0; /* row[6] = mflags1 (makemon.js convention) */
}

const M1_CONCEAL_MU = 0x00000080;
const S_EEL_MU = 57;

/* C ref: youprop.h:190 Detect_monsters = HDetect_monsters || EDetect_monsters.
 * Same three-spelling read js/display.js:1622 makes for newsym(), because this
 * port has writers on the uprops slot AND on a mirrored scalar. */
function _Detect_monsters_mu() {
    const u = game.u || {};
    const slot = u.uprops?.[DETECT_MONSTERS_MU];
    return !!((slot?.intrinsic | 0) || (slot?.extrinsic | 0));
}

/* C ref: mondata.c:54 attacktype(ptr, atyp); adapt the index to the shared port. */
function _kb_attacktype(mndx, atyp) {
    return mndx >= 0 && mndx < _KB_MATTK.length
        && attacktype_mu({ pmidx: mndx }, atyp);
}
/* C ref: mondata.c:654 sticks() — AD_STCK, (AD_WRAP && !AT_ENGL), or AT_HUGS. */
function _kb_sticks(mndx) {
    return mndx >= 0 && mndx < _KB_MATTK.length
        && sticks_mu({ pmidx: mndx });
}

function _kb_test_move_hero(ux, uy, dx, dy) {
    const x = ux + dx, y = uy + dy;
    if (!(x >= 1 && x < 80 && y >= 0 && y < 21))
        return false; /* !isok */
    const loc = game.level?.locations?.[x]?.[y];
    const typ = loc ? (loc.typ | 0) : 0;
    if (typ < IS_OBSTRUCTED_TYP || typ === IRONBARS_TYP) {
        /* obstructed / iron bars: hero (no passwall/tunnel) is blocked */
        return false;
    }
    if (typ === DOOR_TYP) {
        const dmask = loc ? (loc.doormask ?? 0) : 0;
        const closed = (dmask & (D_CLOSED_KB | D_LOCKED_KB)) !== 0;
        if (closed)
            return false; /* TEST_MOVE returns FALSE at a closed/locked door */
        /* diagonal move into a doorway is not allowed */
        if (dx && dy)
            return false;
    }
    return true;
}

/* C ref: dothrow.c:978 will_hurtle(mon, x, y) — used by mhitm_knockback to
 * decide the message word ("backward" if the target will actually change
 * location, else "back").  Hero-defender subset: isok + msize<MZ_HUGE +
 * !ustuck + !mtrapped(u.utrap) + goodpos(x,y,hero, IGNOREWATER|IGNORELAVA).
 * goodpos here = accessible terrain (water/lava ignored) with no blocking
 * monster and not a closed/locked door — the same terrain test _kb_test_move
 * applies plus a MON_AT check. */
function will_hurtle_hero(x, y) {
    const u = game.u || {};
    if (!(x >= 1 && x < 80 && y >= 0 && y < 21))
        return false; /* !isok */
    const heroMsize = Upolyd_fn(u) ? heroPolyMsize_kb(u) : MZ_HUMAN_;
    if (heroMsize >= MZ_HUGE_)
        return false;
    /* C's `mon == u.ustuck` is false for the hero (mon is &youmonst), so a
     * stuck hero still "will hurtle". */
    /* mon->mtrapped is youmonst.mtrapped, which C never sets from u.utrap
     * (set_utrap() writes only u.utrap), so a trapped hero still "will hurtle". */
    /* C goodpos(x, y, &gy.youmonst, MM_IGNOREWATER|MM_IGNORELAVA)
     * (teleport.c:86): MON_AT, accessible() (closed doors and obstructed
     * terrain), and sobj_at(BOULDER) all refuse the hero's destination.
     * The hand-rolled terrain test here omitted the boulder check, so a
     * boulder square read "backward" where C reads "back". */
    return !!goodpos(x, y, game.youmonst, MM_IGNOREWATER | MM_IGNORELAVA);
}

/* sgn for knockback direction. */
function sgn_kb(n) { return n > 0 ? 1 : (n < 0 ? -1 : 0); }
function heroPolyMsize_kb(u) {
    return _kb_msize((u?.umonnum ?? -1) | 0);
}

const BOULDER_OTYP_KB = 475; /* objects.h ROCK_CLASS BOULDER (mklev.js) */
function _kb_boulder_at(x, y) {
    let o = game.level?.levelObjects?.[x]?.[y];
    for (; o; o = o.nexthere) {
        if ((o.otyp | 0) === BOULDER_OTYP_KB)
            return true;
    }
    return false;
}

/* C ref: dothrow.c:853-859 — the hurtle "bump into" name is a_monnam() with
 * AUGMENT_IT added ("combination of a_monnam() and some_mon_nam(); yields
 * 'someone' or 'something' instead of 'it' for unseen mon"):
 *     x_monnam(mon, ARTICLE_A, (char *) 0,
 *              (has_mgivenname(mon) ? SUPPRESS_SADDLE : 0) | AUGMENT_IT, FALSE)
 * The hand-rolled approximation this replaces returned the mgivenname before
 * C's do_hallu arm ever ran (hallucination names take precedence over given
 * names, do_name.c:952-956), always said "something" for an unseen monster
 * where C says "someone" for non-animal non-mindless humanoids — flipping a
 * rn2(2) display coin while hallucinating — and built the article with a bare
 * vowel test instead of just_an(). */
function a_monnam_kb(mtmp) {
    return x_monnam_mu(mtmp, ARTICLE_A_MU, null,
                       (xm_has_mgivenname_mu(mtmp) ? SUPPRESS_SADDLE_MU : 0)
                           | AUGMENT_IT_MU,
                       false);
}

/* C youprop.h:77 `#define Punished (uball != 0)` — decl.h:97 uball is a
 * global that keeps pointing at the object even while it is unlinked from both
 * chains, so read u.uball first and fall back to the owornmask scan. */
function _kb_uball() {
    const u = game.u;
    if (u && u.uball)
        return u.uball;
    for (let o = game.invent; o; o = o.nobj)
        if ((o.owornmask | 0) & W_BALL_KB)
            return o;
    for (let o = game.fobj; o; o = o.nobj)
        if ((o.owornmask | 0) & W_BALL_KB)
            return o;
    return null;
}
const W_BALL_KB = 0x00200000; /* worn.h W_BALL */
/* C dothrow.c:1096-1100 — the trap noun in "You are anchored by the %s." */
function _kb_utrap_name(u) {
    switch (u.utraptype | 0) {
    case TT_WEB_KB: return 'web';
    case TT_LAVA_KB: return 'lava';
    case TT_INFLOOR_KB: return surface_kb(u.ux | 0, u.uy | 0);
    case TT_BURIEDBALL_KB: return 'buried ball';
    default: return 'trap';
    }
}
const TT_WEB_KB = 2, TT_LAVA_KB = 3, TT_INFLOOR_KB = 4, TT_BURIEDBALL_KB = 5;

function hurtle_u(dx, dy, range) {
    const u = game.u || (game.u = {});
    const uball = _kb_uball();
    if (uball && (uball.where | 0) !== 3 /* !carried: OBJ_INVENT */) {
        pline((Unaware_real() ? 'You dream that you feel ' : 'You feel ') + 'a tug from the iron ball.'); /* You_feel, pline.c:387 */
        nomul(0);
        return;
    } else if (u.utrap) {
        pline(`You are anchored by the ${_kb_utrap_name(u)}.`);
        nomul(0);
        return;
    }
    dx = sgn_kb(dx); dy = sgn_kb(dy);
    if (!range || (!dx && !dy) || u.uswallow || u.ustuck)
        return;
    nomul(-(range | 0));
    game.multi_reason = 'moving through the air';
    game.nomovemsg = '';                /* dothrow.c:1114, "it just happens" */
    let rem = range | 0;
    while (rem > 0) {
        const ox = u.ux | 0, oy = u.uy | 0;
        const x = ox + dx, y = oy + dy;
        if (!(x >= 1 && x < 80 && y >= 0 && y < 21))
            return; /* !isok — spirits hold you back, no move */
        const loc = game.level?.locations?.[x]?.[y];
        const typ = loc ? (loc.typ | 0) : 0;
        const dmask = loc ? (loc.doormask ?? 0) : 0;
        const obstructed = typ < IS_OBSTRUCTED_TYP;
        const closedDoor = typ === DOOR_TYP
            && (dmask & (D_CLOSED_KB | D_LOCKED_KB)) !== 0;
        const ironbars = typ === IRONBARS_TYP;
        const boulder = _kb_boulder_at(x, y);
        if (obstructed || closedDoor || ironbars || boulder) {
            /* C dothrow.c:835 — dmg = rnd(2 + *range); losehp(...) */
            rnd(2 + rem);
            /* losehp side-effect (HP decrement) deferred; RNG consumed. */
            return;
        }
        const bumpMon = uhitm_m_at(x, y);
        if (bumpMon) {
            /* C dothrow.c:855-867 (noit_mhim is "it" for an unspotted monster) — a square whose shown glyph is neither a
             * monster nor the remembered-unseen 'I' gives "You find %s by
             * bumping into %s", then map_invisible() if !canspotmon().  A
             * monster glyph is on screen exactly when canspotmon(). */
            const _spot = !!canspotmon_disp(bumpMon);
            if (!_spot && !glyph_is_invisible_at(x, y)) {
                pline(`You find ${a_monnam_kb(bumpMon)} by bumping into ${['him','her','it','them'][pronoun_gender_nit_mu(bumpMon)]}.`);
            } else
                pline(`You bump into ${a_monnam_kb(bumpMon)}.`);
            if (!_spot)
                map_invisible(x, y);
            return;
        }
        /* C dothrow.c:907-910 — move the hero one square. */
        u.ux = x; u.uy = y;
        newsym(ox, oy);
        /* dothrow.c:912 — vision_recalc's own tail newsym()s the hero's square; C has
         * no second newsym(x, y) (it drew an extra hallucinated object glyph). */
        vision_recalc_mu(1);
        rem -= 1;
    }
}

/* C mon.c:1726 mon_give_prop. */
function mon_give_prop_mu(mtmp, prop) {
    let msg = null, intrinsic = 0;
    switch (prop) {
    case FIRE_RES_MU: msg = "%s shivers slightly."; break;
    case COLD_RES_MGP: msg = "%s looks quite warm."; break;
    case SLEEP_RES_MU: msg = "%s looks wide awake."; break;
    case DISINT_RES_MGP: msg = "%s looks very firm."; break;
    case SHOCK_RES_MGP: msg = "%s crackles with static electricity."; break;
    case POISON_RES_MU: msg = "%s looks healthy."; break;
    default: return; /* can't give it */
    }
    /* prop.h res_to_mr(r): MR_* bit for FIRE_RES..STONE_RES. */
    intrinsic = (FIRE_RES_MU <= prop && prop <= STONE_RES_MU) ? (1 << (prop - 1)) : 0;
    const ptr = mtmp.data || {};
    if (((ptr.mresists | 0) | (mtmp.mintrinsics | 0)) & intrinsic)
        msg = null;
    mtmp.mintrinsics = (mtmp.mintrinsics | 0) | intrinsic;
    if (canseemon(mtmp) && msg)
        pline(msg, Monnam(mtmp));
}

/* C uhitm.c:5217-5243 m_is_steadfast(&youmonst) — equipment/terrain check that
 * protects the hero from knockback.  Flying here is the property only (the
 * Upolyd-flyer / flying-steed clauses of youprop.h Flying are not modelled). */
function _hero_is_steadfast_mu() {
    const u = game.u || {};
    const prop = (k) => {
        const p = u.uprops?.[k];
        return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
    };
    if (prop(LEVITATION_MU) || prop(FLYING_MU)
        || Is_airlevel_mu(u.uz)
        || (Is_waterlevel_mu(u.uz) && !is_pool_mu(u.ux | 0, u.uy | 0)))
        return false;
    if (u.uwep && (u.uwep.oartifact | 0) === 15 /* ART_GIANTSLAYER */)
        return true;
    for (let o = game.invent; o; o = o.nobj)
        if ((o.otyp | 0) === 471 /* LOADSTONE */)
            return true;
    return false;
}
/* C artifact.c:2837 permapoisoned(obj) — only Grimtooth (artilist.h #5). */
import { permapoisoned as _permapoisoned_mu } from './artifact.js';
async function mhitm_knockback_u(mtmp, mattk, hitflags) {
    const u = game.u || (game.u = {});
    /* C uhitm.c:5259 — int knockdistance = rn2(3) ? 1 : 2;  (unconditional) */
    const knockdistance = rn2(3) ? 1 : 2;
    let chance = 6;
    /* C uhitm.c:5256-5257 — wep = weapon_used ? MON_WEP(magr) : NULL, where
     * mhitu.c:1193 passes weapon_used = (MON_WEP(mtmp) != 0). */
    let wep = null;
    for (let o = mtmp.minvent; o; o = o.nobj)
        if (((o.owornmask | 0) & W_WEP_MU) !== 0) { wep = o; break; }
    /* C uhitm.c:5262-5263 — ART_OGRESMASHER (artifact index 16). */
    if (wep && (wep.oartifact | 0) === 16)
        chance = 2;
    /* C uhitm.c:5270 — if (rn2(chance)) return FALSE; */
    if (rn2(chance))
        return false;

    /* C uhitm.c:5274 — only AD_PHYS claw/kick/butt/weap qualify. */
    if (!(mattk.adtyp === AD_PHYS_
          && (mattk.aatyp === AT_CLAW_ || mattk.aatyp === AT_KICK_
              || mattk.aatyp === AT_BUTT_ || mattk.aatyp === AT_WEAP_)))
        return false;

    const magrMndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    /* C uhitm.c:5282 — don't knockback if attacker also wants to grab/engulf. */
    if (_kb_attacktype(magrMndx, AT_ENGL_)
        || _kb_attacktype(magrMndx, 7 /* AT_HUGS */)
        || _kb_sticks(magrMndx))
        return false;

    /* C uhitm.c:5290-5293 — first-step placement & direction (hero defender). */
    const defx = u.ux | 0, defy = u.uy | 0;
    const dx = sgn_kb((u.ux | 0) - (mtmp.mx | 0));
    const dy = sgn_kb((u.uy | 0) - (mtmp.my | 0));

    /* C uhitm.c:5296-5298 — u_def: if (!test_move(...)) return FALSE; */
    if (!test_move_kb(defx, defy, dx, dy, 1 /* TEST_MOVE */))
        return false;

    /* C uhitm.c:5310-5318 — if hero is stuck to a cursed saddle, knock the
     * steed back (mdef = u.usteed, was_u); otherwise knock hero out of it. */
    let steedDef = null, dismount = false;
    if (u.usteed) {
        const sad = which_armor_mu(u.usteed, W_SADDLE_KB);
        if (sad && sad.cursed)
            steedDef = u.usteed;
        else
            dismount = true;
    }
    /* C uhitm.c:5321-5323 — monsters must be alive. */
    if (DEADMONSTER(mtmp) || (steedDef && DEADMONSTER(steedDef)))
        return false;

    const defMsize = steedDef
        ? _kb_msize((steedDef.mndx ?? steedDef.mnum ?? -1) | 0)
        : Upolyd_fn(u) ? heroPolyMsize_kb(u) : MZ_HUMAN_;
    if (!(_kb_msize(magrMndx) > (defMsize + 1)))
        return false;

    /* C uhitm.c:5329-5331 — no knockback with a flimsy or non-blunt weapon.
     * is_flimsy: oc_material <= LEATHER or RUBBER_HOSE; is_blunt_weapon: WHACK
     * rows (otyp 69..81 minus 72, plus pick-axe 259 / grappling hook 260). */
    if (wep) {
        const wo = wep.otyp | 0;
        const blunt = (wo >= 69 && wo <= 81 && wo !== 72) || wo === 259 || wo === 260;
        if ((MKOBJ_OC_MATERIAL[wo] | 0) <= 7 /* LEATHER */ || wo === 78 /* RUBBER_HOSE */ || !blunt)
            return false;
    }

    /* C uhitm.c:5334 — unsolid attacker can't deliver a solid hit. */
    if ((_kb_mflags1(magrMndx) & M1_UNSOLID_) !== 0)
        return false;

    /* C uhitm.c:5339-5341 — (u_agr || u_def) && !(*hitflags & M_ATTK_HIT) ->
     * FALSE.  artifact_hit() returning TRUE (e.g. the Staff of Aesculapius'
     * life drain) leaves M_ATTK_HIT unset in mhitm_ad_phys (uhitm.c:4067-4072). */
    if (!((hitflags | 0) & M_ATTK_HIT))
        return false;
    if (steedDef ? m_is_steadfast_kb(steedDef) : _hero_is_steadfast_mu()) {
        await pline(`You ${u.usteed ? `and ${y_monnam_mu(u.usteed)} ` : ''}don't budge.`);
        return false;
    }

    const knockedhow = dismount ? 'out of your saddle'
        : steedDef ? (will_hurtle_mu(steedDef, defx + dx, defy + dy) ? 'backward' : 'back')
        : will_hurtle_hero(defx + dx, defy + dy) ? 'backward' : 'back';

    const magrbuf = je_Monnam(mtmp);
    const verb = vtense(magrbuf, 'knock'); /* C uhitm.c:5373 vtense() */
    const word1 = rn2(2) ? 'forceful' : 'powerful';
    const word2 = rn2(2) ? 'blow' : 'strike';
    const mdefbuf = steedDef ? `you and ${y_monnam_mu(u.usteed)}` : 'you';
    pline(`${magrbuf} ${verb} ${mdefbuf} ${knockedhow} with a ${word1} ${word2}!`);

    /* C uhitm.c:5381-5382 — release the holder before hurtle's stuck check. */
    if (u.ustuck)
        await unstuck_mu(u.ustuck);

    if (steedDef) {
        /* C uhitm.c:5401-5413 — !u_def branch with mdef == u.usteed. */
        await mhurtle_kb(steedDef, dx, dy, knockdistance);
        if (!DEADMONSTER(steedDef) && !rn2(4)) {
            steedDef.mstun = 1;
            set_apparxy_kb(mtmp);
        }
        return true;
    }
    if (dismount) {
        /* C uhitm.c:5386-5391 — u.dx,u.dy pass the preferred direction to
         * dismount_steed (DISMOUNT_KNOCKED only). */
        u.dx = dx;
        u.dy = dy;
        await dismount_steed_mu(DISMOUNT_KNOCKED_KB);
    } else {
        await hurtle_cmd(dx, dy, knockdistance, false);
    }
    /* C uhitm.c:5395 — set_apparxy(magr): update magr's idea of where you are
     * (draws rn2 when the hero is displaced/invisible). */
    set_apparxy_kb(mtmp);
    /* C uhitm.c:5398 — if (!Stunned && !rn2(4)) make_stunned(knockdistance+1). */
    const Stunned = HStun(game) !== 0; /* youprop.h:81 Stunned == HStun, FROMFORM bit included */
    if (!Stunned) {
        if (!rn2(4)) {
            /* potion.c:120-128: "You stagger..." flushes (bot() paints the
             * pre-stun line) BEFORE make_stunned raises disp.botl, so the
             * botl flag is raised AFTER that flush and mdamageu's pre-damage
             * latch must not repaint it — same shape as mhitm_ad_drli_u.
             * Unaware suppresses the pline, so nothing flushed then. */
            const _talked = !Unaware();
            make_stunned(knockdistance + 1, true);
            if (_talked) game._botlRaisedAfterFlush = true;
        }
    }
    return true;
}


/* --- the steal() chain's imports/aliases -------------------------------- */
import { W_ARMOR, W_ARMOR as W_ARMOR_MU, W_ACCESSORY, W_ACCESSORY as W_ACCESSORY_MU,
         LEFT_RING as LEFT_RING_MU, RIGHT_RING as RIGHT_RING_MU,
         W_WEAPONS as W_WEAPONS_MU, ADORNED as ADORNED_MU, RLOC_MSG as RLOC_MSG_MU,
         M_ATTK_AGR_DONE, TT_BURIEDBALL, TT_PIT,
         PLNMSG_MON_TAKES_OFF_ITEM as PLNMSG_MON_TAKES_OFF_ITEM_MU } from './const.js';
import { remove_worn_item, unresponsive } from './steal.js';
import { maybe_finished_meal as maybe_finished_meal_mu, is_fainted as is_fainted_mu,
         morehungry as morehungry_mu } from './eat.js';
import { doname_body as doname_body_mu } from './cmd.js';
import { inv_cnt as inv_cnt_mu } from './hack.js';
import { freeinv as freeinv_mu } from './invent.js';
import { surface as surface_kb } from './dungeon.js';
import { mpickobj } from './steal.js';
import { encumber_msg as encumber_msg_mu } from './pickup.js';
/* poisoned() (attrib.c:316) helpers — imported here, next to the encumber_msg
 * its tail calls, rather than folded into the big const.js/attrib.js lines. */
import { adjattrib as adjattrib_mu, poisontell as poisontell_mu,
         setuhpmax as setuhpmax_mu, minuhpmax as minuhpmax_mu, adjuhploss } from './attrib.js';
import { losehp as losehp_mu } from './hack.js';
import { KILLED_BY_AN as KILLED_BY_AN_MU, KILLED_BY as KILLED_BY_MU,
         POISON_RES as POISON_RES_MU, DIED, POISONING } from './const.js';
/* C youprop.h Poison_resistance = (HPoison_resistance || EPoison_resistance ||
 * ...); read the same way js/potion.js:4055 reads it. */
function _Poison_resistance_mu() {
    const p = game.u && game.u.uprops && game.u.uprops[POISON_RES_MU];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
function Upolyd_mu() { return !!Upolyd_fn(game.u); }
import { stop_donning, doffing as doffing_mu, armor_simple_name_dw as armor_simple_name_mu } from './do_wear.js';
import { yname as yname_mu } from './objnam.js';
/* C objects[otyp].oc_delay for ARMOR_CLASS — the generated C table. */
import { ARMOR_DATA as ARMOR_DATA_MU } from './armor_data.js';
import { rloc, enexto_out as enexto, teleds as teleds_mu } from './teleport.js';
import { mnexto as mnexto_mu } from './mon.js';
import { which_armor as which_armor_mu } from './worn.js';
import { hard_helmet as hard_helmet_mu } from './do_wear.js';
import { ceiling as ceiling_mu } from './dungeon.js';
import { PM_TRAPPER as PM_TRAPPER_MU } from './pm.generated.js';
import { WORN_HELMET as WORN_HELMET_MU } from './const.js';
import { RLOC_NOMSG as RLOC_NOMSG_MU } from './const.js';
import { um_dist as um_dist_mu } from './apply.js';
import { Some_Monnam as Some_Monnam_mu, Adjmonnam as Adjmonnam_mu } from './do_name.js';
import { some_mon_nam } from './do_name.js';
import { pronoun_gender as pronoun_gender_nit_mu_real } from './mondata.js';
/* C you.h:328 noit_mhim(mtmp): pronoun_gender(mtmp, PRONOUN_NO_IT|PRONOUN_HALLU) */
function pronoun_gender_nit_mu(m) { return pronoun_gender_nit_mu_real(m, 3); }
import { RIGHT_HANDED as RIGHT_HANDED_MU } from './const.js';
import { ENV } from './hostenv.js';
import { unplacebc as unplacebc_mu, placebc as placebc_mu } from './ball.js';

/* C mondata.h is_animal(ptr) — M1_ANIMAL. */
function is_animal_mu(data) { return !!data && ((data.mflags1 | 0) & M1_ANIMAL_MU) !== 0; }
const M1_ANIMAL_MU = 0x00040000; /* monflag.h:103 M1_ANIMAL (0x40 is M1_NEEDPICK) */
/* C hack.h Deaf.  This file's existing Deaf(gs) takes the game state. */
function Deaf_mu() { return Deaf(game); }
function tele_restrict_mu(magr) {
    return tele_restrict(magr);
}
/* C objnam.c doname(obj). */
async function doname_mu(obj) {
    return await doname_body_mu(obj,
        (game.u?.uhandedness === RIGHT_HANDED_MU) ? 'right' : 'left');
}
import { noit_Monnam as noit_Monnam_ds, noit_mon_nam as noit_mon_nam_ds } from './do_name.js';
import { resists_drli as resists_drli_ds } from './mondata.js';
import { money2mon as money2mon_ds } from './shk.js';
import { safe_qbuf as safe_qbuf_ds } from './objnam.js';
import { yn_function as yn_function_ds } from './cmd.js';
import { verbalize as verbalize_ds, body_part as body_part_ds } from './cmd.js';
import { prinv as prinv_ds } from './invent.js';
import { Ring_gone as Ring_gone_ds, Ring_on as Ring_on_ds } from './do_wear.js';
import { setworn as setworn_ds } from './worn.js';
import { discover_object as discover_object_ds } from './o_init.js';
import { pluslvl as pluslvl_ds } from './exper.js';
import { adjalign as adjalign_ds } from './attrib.js';
import { currency as currency_ds } from './invent.js';
import { money_cnt as money_cnt_ds } from './hack.js';
import { suit_simple_name as suit_simple_name_ds, simpleonames as simpleonames_ds } from './objnam.js';

const A_STR_DS = 0, A_WIS_DS = 2, A_DEX_DS = 3, A_CON_DS = 4, A_CHA_DS = 5;
const HAND_DS = 6, HAIR_DS = 14;
const RIN_ADORNMENT_DS = 173, PM_LEPRECHAUN_DS = 63, PM_AMOROUS_DEMON_DS = 290;
/* C mhitu.c:2309 mayberem() — 'mon' tries to remove a piece of hero's armor. */
async function mayberem_ds(mon, seducer, obj, str) {
    const u = game.u;
    if (!obj || !obj.owornmask)
        return;
    /* removal of a previous item might have sent the hero elsewhere */
    if ((u.utotype | 0) || !m_next2u_ds(mon))
        return;
    if (Deaf_mu()) {
        pline(`${seducer} takes off your ${str}.`);
    } else if (rn2(20) < acurr(u, A_CHA_DS)) {
        const qbuf = `"Shall I remove your ${str}, ${
            !rn2(2) ? 'lover' : !rn2(2) ? 'dear' : 'sweetheart'}?"`;
        if (await yn_function_ds(qbuf, 'yn', 'n', true) === 'n')
            return;
    } else {
        const hairbuf = `let me run my fingers through your ${body_part_ds(HAIR_DS)}`;
        await verbalize_ds(`Take off your ${str}; ${
            (obj === u.uarm) ? "let's get a little closer"
            : (obj === u.uarmc || obj === u.uarms) ? "it's in the way"
            : (obj === u.uarmf) ? 'let me rub your feet'
            : (obj === u.uarmg) ? "they're too clumsy"
            : (obj === u.uarmu) ? 'let me massage you'
            : hairbuf}.`);
    }
    await remove_worn_item(obj, true);
}
/* C hack.h m_next2u(mon) — distu(mon->mx, mon->my) <= 2. */
function m_next2u_ds(mon) {
    const u = game.u;
    const dx = (mon.mx | 0) - (u.ux | 0), dy = (mon.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}
/* C mhitu.c:1985 doseduce() — returns 1 if monster teleported (or hero leaves
 * monster's vicinity). */
export async function doseduce(mon) {
    const g = game, u = g.u;
    const mndx = (mon.mndx ?? mon.mnum ?? -1) | 0;
    const fem = (mndx === PM_AMOROUS_DEMON_DS && Mgender(mon) === 1);
    let tried_gloves = 0;

    if (mon.mcan || mon.mspec_used) {
        await pline_mon(mon, `${Monnam(mon)} acts as though ${mhe_mu(mon)} has got a ${mon.mcan ? 'severe ' : ''}headache.`);
        return 0;
    }
    if (unresponsive()) {
        await pline_mon(mon, `${Monnam(mon)} seems dismayed at your lack of response.`);
        return 0;
    }
    const seewho = canseemon(mon);
    if (!seewho)
        await pline('Someone caresses you...');
    else
        await You_feel_mu(`very attracted to ${mon_nam(mon)}.`);
    const Who = !seewho ? (fem ? 'She' : 'He') : Monnam(mon);

    await stop_donning(null);
    if (u.uwep && welded(u.uwep))
        tried_gloves = 1;

    let nring;
    for (let ring = g.invent; ring; ring = nring) {
        nring = ring.nobj;
        if ((ring.otyp | 0) !== RIN_ADORNMENT_DS)
            continue;
        if (fem) {
            if (ring.owornmask && u.uarmg) {
                if (!tried_gloves++)
                    await mayberem_ds(mon, Who, u.uarmg, 'gloves');
                if (u.uarmg)
                    continue;
            }
            if (!Deaf_mu() && rn2(20) < acurr(u, A_CHA_DS)) {
                const qbuf = await safe_qbuf_ds('', '"That ',
                    ' looks pretty.  May I have it?"', ring, xname, simpleonames_ds, 'ring');
                discover_object_ds(RIN_ADORNMENT_DS, true, true, true);
                if (await yn_function_ds(qbuf, 'yn', 'n', true) === 'n')
                    continue;
            } else
                await pline(`${Who} decides she'd like ${await yname_mu(ring)}, and takes it.`);
            discover_object_ds(RIN_ADORNMENT_DS, true, true, true);
            if (ring.owornmask)
                await remove_worn_item(ring, false);
            freeinv_mu(ring);
            await mpickobj(mon, ring);
        } else {
            if (u.uleft && u.uright && u.uleft.otyp === RIN_ADORNMENT_DS
                && u.uright.otyp === RIN_ADORNMENT_DS)
                break;
            if (ring === u.uleft || ring === u.uright)
                continue;
            if (u.uarmg) {
                if (!tried_gloves++)
                    await mayberem_ds(mon, Who, u.uarmg, 'gloves');
                if (u.uarmg)
                    break;
            }
            if (!Deaf_mu() && rn2(20) < acurr(u, A_CHA_DS)) {
                const qbuf = await safe_qbuf_ds('', '"That ',
                    ' looks pretty.  Would you wear it for me?"', ring, xname, simpleonames_ds, 'ring');
                discover_object_ds(RIN_ADORNMENT_DS, true, true, true);
                if (await yn_function_ds(qbuf, 'yn', 'n', true) === 'n')
                    continue;
            } else {
                await pline(`${Who} decides you'd look prettier wearing ${await yname_mu(ring)},`);
                await pline('and puts it on your finger.');
            }
            discover_object_ds(RIN_ADORNMENT_DS, true, true, true);
            if (!u.uright) {
                await pline(`${Who} puts ${the(await xname(ring))} on your right ${body_part_ds(HAND_DS)}.`);
                await setworn_ds(ring, RIGHT_RING_MU);
            } else if (!u.uleft) {
                await pline(`${Who} puts ${the(await xname(ring))} on your left ${body_part_ds(HAND_DS)}.`);
                await setworn_ds(ring, LEFT_RING_MU);
            } else if (u.uright && u.uright.otyp !== RIN_ADORNMENT_DS) {
                await pline(`${Who} replaces ${await yname_mu(u.uright)} with ${await yname_mu(ring)}.`);
                await Ring_gone_ds(u.uright);
                if ((u.utotype | 0) || !m_next2u_ds(mon))
                    return 1;
                await setworn_ds(ring, RIGHT_RING_MU);
            } else if (u.uleft && u.uleft.otyp !== RIN_ADORNMENT_DS) {
                await pline(`${Who} replaces ${await yname_mu(u.uleft)} with ${await yname_mu(ring)}.`);
                await Ring_gone_ds(u.uleft);
                if ((u.utotype | 0) || !m_next2u_ds(mon))
                    return 1;
                await setworn_ds(ring, LEFT_RING_MU);
            } else
                await impossible_mu('ring replacement');
            await Ring_on_ds(ring);
            await prinv_ds(null, ring, 0);
        }
    }

    const naked = (!u.uarmc && !u.uarmf && !u.uarmg && !u.uarms && !u.uarmh && !u.uarmu);
    await urgent_pline(`${Who} ${Deaf_mu() ? 'seems to murmur into your ear'
        : naked ? 'murmurs sweet nothings into your ear' : 'murmurs in your ear'}${
        naked ? '' : ', while helping you undress'}.`);
    await mayberem_ds(mon, Who, u.uarmc, u.uarmc ? cloak_simple_name(u.uarmc) : '');
    if (!u.uarmc)
        await mayberem_ds(mon, Who, u.uarm, u.uarm ? suit_simple_name_ds(u.uarm) : '');
    await mayberem_ds(mon, Who, u.uarmf, 'boots');
    if (!tried_gloves)
        await mayberem_ds(mon, Who, u.uarmg, 'gloves');
    await mayberem_ds(mon, Who, u.uarms, 'shield');
    await mayberem_ds(mon, Who, u.uarmh, u.uarmh ? helm_simple_name(u.uarmh) : '');
    if (!u.uarmc && !u.uarm)
        await mayberem_ds(mon, Who, u.uarmu, 'shirt');

    if ((u.utotype | 0) || !m_next2u_ds(mon))
        return 1;

    if (u.uarm || u.uarmc) {
        if (!Deaf_mu()) {
            if (yyyymmdd(0) % 10000 === 229 && mon.female) {
                const gloves = u_carried_gloves();
                if (gloves) observe_object_mu(gloves);
                await verbalize_ds(`Well, then you owe me ${gloves ? await yname_mu(gloves) : 'twelve pairs of gloves'}${gloves ? ' and eleven more pairs of gloves' : ''}!`);
            } else
                await verbalize_ds(`You're such a ${g.flags?.female ? 'sweet lady' : 'nice guy'}; I wish...`);
        } else if (seewho)
            await pline_mon(mon, `${Monnam(mon)} appears to sigh.`);
        if (!tele_restrict_mu(mon))
            await rloc(mon, RLOC_MSG_MU);
        return 1;
    }
    if ((u.ualign?.type | 0) === -1 /* A_CHAOTIC */)
        adjalign_ds(1);

    await urgent_pline(`Time stands still while you and ${noit_mon_nam_ds(mon)} lie in each other's arms...`);
    const attr_tot = acurr(u, A_CHA_DS) + acurr(u, A_INT);
    if (rn2(35) > Math.min(attr_tot, 32)) {
        await pline(`${noit_Monnam_ds(mon)} seems to have enjoyed it more than you...`);
        switch (rn2(5)) {
        case 0:
            await You_feel_mu('drained of energy.');
            /* C mhitu.c:2184-2186: Pw changes after the pline's flush_screen()
             * with no disp.botl, so the status keeps the pre-drain Pw. */
            if (!(g.disp && ((g.disp.botl | 0) || (g.disp.botlx | 0)))) {
                if (g._botlStaleUen === undefined) g._botlStaleUen = u.uen | 0;
                if (g._botlStaleUenmax === undefined) g._botlStaleUenmax = u.uenmax | 0;
            }
            u.uen = 0;
            u.uenmax -= rnd(_half_phys_prop_mu() ? 5 : 10);
            exercise(A_CON_DS, false);
            if (u.uenmax < 0) u.uenmax = 0;
            break;
        case 1:
            await You('are down in the dumps.');
            adjattrib(A_CON_DS, -1, true);
            exercise(A_CON_DS, false);
            if (g.disp) g.disp.botl = true;
            break;
        case 2:
            await Your('senses are dulled.');
            adjattrib(A_WIS_DS, -1, true);
            exercise(A_WIS_DS, false);
            if (g.disp) g.disp.botl = true;
            break;
        case 3:
            if (!resists_drli_ds(g.youmonst)) {
                await You_feel_mu('out of shape.');
                await losexp('overexertion');
            } else {
                await You('have a curious feeling...');
            }
            exercise(A_CON_DS, false);
            exercise(A_DEX_DS, false);
            exercise(A_WIS_DS, false);
            break;
        case 4: {
            await You_feel_mu('exhausted.');
            exercise(A_STR_DS, false);
            const tmp = rn1(10, 6);
            await losehp_mu(maybe_half_phys_mu(tmp), 'exhaustion', 1 /* KILLED_BY */);
            break;
        }
        }
    } else {
        mon.mspec_used = rnd(100);
        await You(`seem to have enjoyed it more than ${noit_mon_nam_ds(mon)}...`);
        switch (rn2(5)) {
        case 0:
            await You_feel_mu('raised to your full potential.');
            /* C mhitu.c:2229-2231: Pw changes after the pline with no botl flag. */
            if (!(g.disp && ((g.disp.botl | 0) || (g.disp.botlx | 0)))) {
                if (g._botlStaleUen === undefined) g._botlStaleUen = u.uen | 0;
                if (g._botlStaleUenmax === undefined) g._botlStaleUenmax = u.uenmax | 0;
            }
            exercise(A_CON_DS, true);
            u.uen = (u.uenmax += rnd(5));
            if (u.uenmax > u.uenpeak) u.uenpeak = u.uenmax;
            break;
        case 1:
            await You_feel_mu('good enough to do it again.');
            adjattrib(A_CON_DS, 1, true);
            exercise(A_CON_DS, true);
            if (g.disp) g.disp.botl = true;
            break;
        case 2:
            await You(`will always remember ${noit_mon_nam_ds(mon)}...`);
            adjattrib(A_WIS_DS, 1, true);
            exercise(A_WIS_DS, true);
            if (g.disp) g.disp.botl = true;
            break;
        case 3:
            await pline('That was a very educational experience.');
            await pluslvl_ds(false);
            exercise(A_WIS_DS, true);
            break;
        case 4:
            await You_feel_mu('restored to health!');
            u.uhp = u.uhpmax;
            if (Upolyd_fn(u)) u.mh = u.mhmax;
            exercise(A_STR_DS, true);
            if (g.disp) g.disp.botl = true;
            break;
        }
    }

    if (mon.mtame) {
        ; /* don't charge */
    } else if (rn2(20) < acurr(u, A_CHA_DS)) {
        // C mhitu.c:2267 noit_mhim(): hallucination also draws rn2(4).
        const whom = ['him', 'her', 'it', 'them'][pronoun_gender_nit_mu(mon)];
        await pline(`${noit_Monnam_ds(mon)} demands that you pay ${whom}, but you refuse...`);
    } else if ((u.umonnum | 0) === PM_LEPRECHAUN_DS) {
        await pline_mon(mon, `${noit_Monnam_ds(mon)} tries to take your gold, but fails...`);
    } else {
        const umoney = money_cnt_ds(g.invent);
        let cost;
        if (umoney > 32767 - 10)
            cost = rnd(32767) + 500;
        else
            cost = rnd(umoney + 10) + 500;
        if (mon.mpeaceful) {
            cost = Math.trunc(cost / 5);
            if (!cost) cost = 1;
        }
        if (cost > umoney)
            cost = umoney;
        if (!cost) {
            if (!Deaf_mu())
                await verbalize_ds("It's on the house!");
            else
                await pline('No charge.');
        } else {
            await pline_mon(mon, `${noit_Monnam_ds(mon)} takes ${cost} ${currency_ds(cost)} for services rendered!`);
            await money2mon_ds(mon, cost);
            if (g.disp) g.disp.botl = true;
        }
    }
    if (!rn2(25))
        mon.mcan = 1;
    if (!tele_restrict_mu(mon))
        await rloc(mon, RLOC_MSG_MU);
    return 1;
}

/* C monattk.h:77 AD_SSEX (23 is AD_TLPT). */
const AD_SSEX_ = 35;

const AD_SGLD_ = 20;      /* monattk.h:62 — steals gold (leprechaun) */
import { stealgold as stealgold_mu } from './steal.js';
import { mon_reflects } from './muse.js'; // relocate-fns
import { ureflects } from './muse.js';
import { Monnam, mon_nam } from './do_name.js'; // relocate-fns
import { is_pit } from './const.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { monnear } from './mon.js'; // relocate-fns
import { killed } from './mon.js';
import { protects } from './artifact.js'; // relocate-fns
export { je_Monnam }; // relocate-fns
const AD_SITM_ = 21;      /* monattk.h:63 — steals item (nymphs) */
const AD_SEDU_ = 22;       /* monattk.h:64 */
const BOULDER_MU = 475;

async function mhitm_ad_sedu_u(magr, mattk, mhm) {
    const g = game;

    if (is_animal_mu(magr.data)) {
        await hitmsg(magr, mattk);
        if (magr.mcan | 0)
            return;
        /* Continue below */
    } else if (dmgtype(g.youmonst?.data ?? g.u?.data, AD_SEDU_)
               || dmgtype(g.youmonst?.data ?? g.u?.data, AD_SSEX_)) {
        await pline(`${Monnam(magr)} ${Deaf_mu()
            ? "says something but you can't hear it"
            : magr.minvent
              ? 'brags about the goods some dungeon explorer provided'
              : 'makes some remarks about how difficult theft is lately'}.`);
        if (!tele_restrict_mu(magr))
            await rloc(magr, RLOC_MSG_MU);
        mhm.hitflags = M_ATTK_AGR_DONE;
        mhm.done = true;
        return;
    } else if (magr.mcan | 0) {
        if (!Blind_mu())
            await pline(`${Adjmonnam_mu(magr, 'plain')} tries to ${
                g.flags?.female ? 'charm' : 'seduce'} you, but you seem ${
                g.flags?.female ? 'unaffected' : 'uninterested'}.`);
        if (rn2(3)) {
            if (!tele_restrict_mu(magr))
                await rloc(magr, RLOC_MSG_MU);
            mhm.hitflags = M_ATTK_AGR_DONE;
            mhm.done = true;
            return;
        }
        return;
    }

    const buf = { s: '' };
    switch (await steal(magr, buf)) {
    case -1:
        mhm.hitflags = M_ATTK_AGR_DIED;
        mhm.done = true;
        return;
    case 0:
        return;
    default:
        if (!is_animal_mu(magr.data) && !tele_restrict_mu(magr))
            await rloc(magr, RLOC_MSG_MU);
        if (is_animal_mu(magr.data) && buf.s) {
            if (canseemon_mu(magr))
                await pline(`${Monnam(magr)} tries to ${
                    locomotion(magr.data, 'run')} away with ${buf.s}.`);
        }
        await monflee(magr, 0, false, false);
        mhm.hitflags = M_ATTK_AGR_DONE;
        mhm.done = true;
        return;
    }
    /* C's mhitu arm has no post-switch statement — every case returns.  Only
     * `case 0:` (steal() found nothing to take) leaves damage alone, and it
     * returns above. */
}


/* C steal.c:494 o_unleash() is apply.c:711's, ported in js/apply.js. */
import { o_unleash } from './apply.js';


/* C steal.c:165-208 stealarm() — finish stealing an item of armor which takes
 * multiple turns to take off; fired by unmul() via afternmv. */
export async function stealarm_mu() {
    const g = game;
    if (g.stealoid && g.stealmid) {
        for (let otmp = g.invent, nextobj; otmp; otmp = nextobj) {
            nextobj = otmp.nobj;
            if (otmp.o_id !== g.stealoid)
                continue;
            for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                if (mtmp.m_id !== g.stealmid)
                    continue;
                if (DEADMONSTER(mtmp)) {
                    await impossible_breath('stealarm(): dead monster stealing');
                    break; /* C: goto botm */
                }
                if (!dmgtype(mtmp.data, AD_SITM_) || mdistu(mtmp) > 2)
                    break;
                if (otmp.unpaid) {
                    const shops = g.u?.ushops || '';
                    await subfrombill_real(otmp, shops.length ? shop_keeper_real(shops[0]) : null);
                }
                freeinv_mu(otmp);
                await pline(`${Monnam(mtmp)} steals ${await doname(otmp)}!`);
                await mpickobj(mtmp, otmp);
                await monflee(mtmp, 0, false, false);
                if (!tele_restrict_mu(mtmp))
                    await rloc(mtmp, RLOC_MSG_MU);
                break;
            }
            break;
        }
    }
    g.stealoid = g.stealmid = 0;
    return 0;
}

/* C ref: steal.c:688-766 stealamulet(mtmp) — AD_SAMU (the Wizard and quest
 * nemeses).  Targets any quest artifact (obj.h:271 oartifact >= 21), else the
 * Amulet / Bell / Book / Candelabrum the hero carries. */
const AMULET_OF_YENDOR_MU = 213;      /* objects.h AMULET(), LAST_AMULET */
const FAKE_AMULET_OF_YENDOR_MU = 212; /* the slot before AMULET_OF_YENDOR */
const BELL_MU = 255;                  /* objects.h TOOL() BELL (js/mklev.js BELL) */
const M1_TPORT_MU = 0x02000000;       /* monflag.h:110 */
async function stealamulet_mu(mtmp) {
    const g = game;
    const isQA = (o) => (o.oartifact | 0) >= 21; /* ART_ORB_OF_DETECTION */
    let otmp = null, n = 0, real = 0, fake = 0;
    for (let o = g.invent; o; o = o.nobj)
        if (isQA(o)) { ++n; otmp = o; }
    if (n > 1) {
        n = rnd(n);
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if (isQA(otmp) && !--n) break;
    }
    if (!otmp) {
        const uh = g.u?.uhave || {};
        if (uh.amulet) { real = AMULET_OF_YENDOR_MU; fake = FAKE_AMULET_OF_YENDOR_MU; }
        else if (uh.bell) { real = BELL_OF_OPENING; fake = BELL_MU; }
        else if (uh.book) { real = SPE_BOOK_OF_THE_DEAD; }
        else if (uh.menorah) { real = CANDELABRUM_OF_INVOCATION; }
        else return;
        const match = (o) => (o.otyp | 0) === real
            || ((o.otyp | 0) === fake && fake && !mtmp.iswiz);
        for (let o = g.invent; o; o = o.nobj)
            if (match(o)) { ++n; otmp = o; }
        if (n > 1) {
            n = rnd(n);
            for (otmp = g.invent; otmp; otmp = otmp.nobj)
                if (match(otmp) && !--n) break;
        }
    }
    if (!otmp) return;
    const u = g.u;
    if ((otmp === u.uarm || otmp === u.uarmu) && u.uarmc)
        await worn_item_removal(mtmp, u.uarmc);
    if (otmp === u.uarmu && u.uarm)
        await worn_item_removal(mtmp, u.uarm);
    if ((otmp === u.uarmg || ((otmp === u.uright || otmp === u.uleft) && u.uarmg))
        && u.uwep) {
        if (u.twoweap)
            await worn_item_removal(mtmp, u.uswapwep);
        await worn_item_removal(mtmp, u.uwep);
    }
    if ((otmp === u.uright || otmp === u.uleft) && u.uarmg)
        await worn_item_removal(mtmp, u.uarmg);
    if (otmp.owornmask)
        await worn_item_removal(mtmp, otmp);
    if (otmp.unpaid) {
        const shops = u.ushops || '';
        await subfrombill_real(otmp, shops.length ? shop_keeper_real(shops[0]) : null);
    }
    freeinv_mu(otmp);
    const buf = await doname_mu(otmp);
    await mpickobj(mtmp, otmp);
    await pline(`${Some_Monnam_mu(mtmp)} steals ${buf}!`);
    if (((mtmp.data?.mflags1 | 0) & M1_TPORT_MU) /* can_teleport(mtmp->data) */
        && !tele_restrict_mu(mtmp))
        await rloc(mtmp, RLOC_MSG_MU);
    /* C steal.c:765 encumber_msg() — async here; unawaited, its message
     * would land after the caller's next pline. */
    await encumber_msg_mu();
}


export async function mhitm_adtyping_u(mtmp, mattk, mhm) {
    switch (mattk.adtyp) {
        case AD_PHYS_: await mhitm_ad_phys_u(mtmp, mattk, mhm); break;
        case AD_ELEC_: await mhitm_ad_elec_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4809-4811 — AD_DRST/AD_DRDX/AD_DRCO share mhitm_ad_drst. */
        case AD_DRST_: case AD_DRDX_: case AD_DRCO_:
            await mhitm_ad_drst_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4798-4799 — AD_SITM and AD_SEDU share mhitm_ad_sedu. */
        case AD_SITM_: case AD_SEDU_:
            await mhitm_ad_sedu_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4751-4772 mhitm_ad_ssex, mdef == &gy.youmonst arm. */
        case 35 /* AD_SSEX */:
            if (game.sysopt?.seduce ?? true) {
                if (could_seduce(mtmp, game.youmonst ?? game.u, mattk) === 1 && !mtmp.mcan)
                    if (await doseduce(mtmp)) {
                        mhm.hitflags = M_ATTK_AGR_DONE;
                        mhm.done = true;
                    }
                break;
            }
            await mhitm_ad_sedu_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:2815-2821 `mhitm_ad_sgld`, mdef == &gy.youmonst arm:
         * hitmsg, nothing more against the same monster class, else
         * stealgold unless the thief is cancelled. */
        case AD_SGLD_:
            await hitmsg(mtmp, mattk);
            if ((game.youmonst?.data ?? game.u?.data)?.mlet === mtmp.data?.mlet)
                break;
            if (!(mtmp.mcan | 0))
                await stealgold_mu(mtmp);
            break;
        case AD_BLND_U:
            mhitm_ad_blnd_u(mtmp, mattk, mhm); break;
        case AD_STON:
            await mhitm_ad_ston_u(mtmp, mattk, mhm); break;
        case AD_STCK_:
            mhitm_ad_stck_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4813 `case AD_WRAP: mhitm_ad_wrap(...)` — see
         * mhitm_ad_wrap_u's header for what its absence cost. */
        case AD_WRAP_:
            await mhitm_ad_wrap_u(mtmp, mattk, mhm); break;
        case AD_LEGS_MU:
            await mhitm_ad_legs_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4795 `case AD_COLD: mhitm_ad_cold(...)` — see
         * mhitm_ad_cold_u's header for what its absence cost. */
        case AD_COLD_MK:
            await mhitm_ad_cold_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4784 `case AD_ACID: mhitm_ad_acid(...)`. */
        case 8 /* AD_ACID */:
            await mhitm_ad_acid_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4804 `case AD_DRLI: mhitm_ad_drli(...)` — see
         * mhitm_ad_drli_u's header for what its absence cost. */
        case AD_DRLI_MU:
            await mhitm_ad_drli_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4812 `case AD_DRIN: mhitm_ad_drin(...)`. */
        case AD_DRIN_:
            await mhitm_ad_drin_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4790 `case AD_HEAL: mhitm_ad_heal(...)`. js/uhitm.js's
         * exported mhitm_ad_heal already carries the `mdef === game.youmonst`
         * (nurse-heals-hero) branch; only the wiring was missing here. */
        case AD_HEAL_MU:
            await mhitm_ad_heal_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4792 `case AD_FIRE: mhitm_ad_fire(...)`. */
        case AD_FIRE:
            await mhitm_ad_fire_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4797 `case AD_ELEC: mhitm_ad_elec(...)` is this file's own
         * AD_ELEC_ case above (not this arm); C uhitm.c:4785 `case AD_HEAL`
         * above and C:4798-4799's AD_SITM/AD_SEDU are also this file's own
         * cases. C uhitm.c:4801 `case AD_TLPT: mhitm_ad_tlpt(...)`. */
        case AD_TLPT_MU:
            await mhitm_ad_tlpt_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4805 `case AD_RUST: mhitm_ad_rust(...)`. */
        case AD_RUST_MU:
            await mhitm_ad_rust_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:2340-2353 `mhitm_ad_corr`, hero-defender arm.  Corrosion
         * happens inside mhitm_adtyping, before hitmu's unconditional
         * mhitm_knockback call. */
        case AD_CORR_MU:
            await mhitm_ad_corr_u(mtmp, mattk); break;
        /* C uhitm.c:4806 `case AD_DCAY: mhitm_ad_dcay(...)`. */
        case AD_DCAY_MU:
            await mhitm_ad_dcay_u(mtmp, mattk); break;
        /* C uhitm.c:4812 `case AD_PLYS: mhitm_ad_plys(...)`. */
        case AD_PLYS_MU:
            await mhitm_ad_plys_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4813 `case AD_SLEE: mhitm_ad_slee(...)`. */
        case AD_SLEE:
            await mhitm_ad_slee_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4818 `case AD_ENCH: mhitm_ad_ench(...)`. */
        case AD_ENCH_MU:
            await mhitm_ad_ench_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4819 `case AD_SLOW: mhitm_ad_slow(...)`. */
        case AD_SLOW:
            await mhitm_ad_slow_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4789 `case AD_WERE: mhitm_ad_were(...)`. */
        case AD_WERE_MU:
            await mhitm_ad_were_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:3858 `case AD_DETH: mhitm_ad_deth(...)` — see
         * mhitm_ad_deth_u's header for what its absence cost. */
        case AD_DETH_MU:
            await mhitm_ad_deth_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:3777 `case AD_FAMN: mhitm_ad_famn(...)`. */
        case AD_FAMN_MU:
            await mhitm_ad_famn_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:3557 `case AD_SLIM: mhitm_ad_slim(...)`. */
        case AD_SLIM_MU:
            await mhitm_ad_slim_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4583 mhitm_ad_samu, mhitu arm: hitmsg, then 1/20 stealamulet. */
        case 252 /* AD_SAMU */:
            await hitmsg(mtmp, mattk);
            if (!rn2(20))
                await stealamulet_mu(mtmp);
            break;
        /* C uhitm.c:4606-4608 mhitm_ad_dise, mhitu arm: hitmsg, then
         * diseasemu(pa); resistance zeroes the damage.  This adtyp fell into
         * the default arm below, so a sting AD_DISE (Scorpius) skipped the
         * make_sick rn1(ACURR(A_CON),20) draw and its "deathly sick" message. */
        case AD_DISE_MK:
            await hitmsg(mtmp, mattk);
            if (!(await diseasemu_gu(mtmp.data)))
                mhm.damage = 0;
            break;
        /* C uhitm.c:3808-3822 mhitm_ad_pest, mhitu arm: its own pline_mon
         * message (no hitmsg), then diseasemu(pa) with the return IGNORED, so
         * resistance does not zero the damage (unlike AD_DISE above).  This
         * adtyp fell into the default arm, which printed "touches you!" and
         * skipped the make_sick rn1(ACURR(A_CON),20) draw. */
        case AD_PEST_MK:
            await pline('%s reaches out, and you feel fever and chills.', Monnam(mtmp));
            await diseasemu_gu(mtmp.data);
            break;
        /* C uhitm.c:3729-3763 mhitm_ad_poly + mhitm.c:1122 mon_poly, hero arm. */
        case AD_POLY_MK:
            await mhitm_ad_poly_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4401-4408 mhitm_ad_stun, mhitu arm — also the attack
         * getmattk() (mhitu.c:336-344) substitutes for a second consecutive
         * AD_DISE/AD_PEST/AD_FAMN hit (Pestilence, Famine). */
        case AD_STUN:
            await hitmsg(mtmp, mattk);
            if (!(mtmp.mcan | 0) && !rn2(4)) {
                /* potion.c:120-128: "You stagger..." flushes before make_stunned
                 * raises the botl flag, so mdamageu's pre-damage latch must not
                 * repaint it (same shape as the knockback stun above). */
                const _talked = !Unaware();
                make_stunned((HStun(game) & TIMEOUT) + (mhm.damage | 0), true);
                if (_talked) game._botlRaisedAfterFlush = true;
                mhm.damage = Math.trunc(mhm.damage / 2);
            }
            break;
        /* C uhitm.c:3689-3711 mhitm_ad_conf, mhitu arm: hitmsg, then (not cancelled,
         * !rn2(4), !mspec_used) spec_used += damage + rn2(6) and confuse the hero;
         * damage is zeroed either way.  Yeenoghu's AT_WEAP/AD_CONF hit. */
        case AD_CONF:
            await hitmsg(mtmp, mattk);
            if (!(mtmp.mcan | 0) && !rn2(4) && !(mtmp.mspec_used | 0)) {
                mtmp.mspec_used = (mtmp.mspec_used | 0) + ((mhm.damage | 0) + rn2(6));
                if (HConfusion(game))
                    pline("You are getting even more confused.");
                else
                    pline("You are getting confused.");
                make_confused(HConfusion(game) + (mhm.damage | 0), false);
            }
            mhm.damage = 0;
            break;
        case AD_CURS_MU:
            hitmsg_je(mtmp, mattk);
            if (!night() && ((mtmp.mndx ?? mtmp.mnum ?? -1) | 0) === PM_GREMLIN_MU)
                break;
            /* C uhitm.c:3045-3061 mhitm_ad_curs, mhitu arm. */
            if (!mtmp.mcan && !rn2(10)) {
                if (!Deaf(game)) {
                    if (Blind(game))
                        pline("You hear laughter.");
                    else
                        pline("%s chuckles.", Monnam(mtmp));
                }
                if (((game.u?.umonnum ?? -1) | 0) === PM_CLAY_GOLEM_MU) {
                    pline("Some writing vanishes from your head!");
                    await rehumanize();
                    break;
                }
                mon_give_prop_mu(mtmp, await attrcurse_mu());
            }
            break;
        default:
            /* unported adtyp — no RNG, no damage applied (deferred) */
            mhm.damage = 0;
            break;
    }
}

async function mhitm_ad_poly_u(mtmp, mattk, mhm) {
    const negated = mhitm_mgc_atk_negated_u(false, mtmp) || !!(mtmp.mspec_used | 0);
    await hitmsg(mtmp, mattk);
    const u = game.u || {};
    if (maybe_half_phys_mu(mhm.damage) < ((u.mtimedone | 0) ? u.mh : u.uhp)) {
        if (negated) {
            if (mtmp.mcan) pline("You aren't transformed.");
        } else {
            const oldform = (game.u?.umonnum ?? -1) | 0; /* mhitm.c:1124 (data identity ~ form index) */
            if (Antimagic_mu()) {
                shieldeff(u.ux, u.uy);
            } else if (Unchanging_mu()) {
                /* just take a little damage */
            } else {
                if (u.ulycn === -1) {
                    await pline('You are subjected to a freakish metamorphosis.');
                    await polyself_real(0);
                } else if (u.umonnum !== u.ulycn) {
                    await You_feel_mu('an unnatural urge coming on.');
                    await you_were();
                } else {
                    await You_feel_mu('a natural urge coming on.');
                    await you_unwere(false);
                }
                mhm.damage = 0;
            }
            /* mhitm.c:1203-1204: a changed hero form (magr != youmonst)
             * costs the attacker rnd(2) of mspec_used. */
            if (((game.u?.umonnum ?? -1) | 0) !== oldform)
                mtmp.mspec_used = (mtmp.mspec_used | 0) + rnd(2);
            mhm.hitflags |= M_ATTK_HIT;
            mhm.done = true;
        }
    }
}

/* C ref: uhitm.c:3221-3270 mhitm_ad_drin, mdef == &gy.youmonst.
 * A mind flayer's tentacle hit first tests the hero's weapon/head/slippery
 * helmet defenses, then applies the base damage and eat_brains effects. */
async function mhitm_ad_drin_u(mtmp, mattk, mhm) {
    const u = game.u || (game.u = {});
    game.s = game.s || {};
    await hitmsg(mtmp, mattk);

    const heroData = game.youmonst?.data || _hero_permonst_mu();
    const hasHead = !heroData || (((heroData.mflags1 | 0) & 0x00008000) === 0);
    if (_defends_u(AD_DRIN_, u.uwep) || !hasHead) {
        pline("You don't seem harmed.");
        game.s.skipdrin = 1;
        return;
    }
    if (u_slip_free(mtmp, mattk))
        return;

    if (u.uarmh && rn2(8)) {
        pline(`Your ${helm_simple_name(u.uarmh)} blocks the attack to your head.`);
        return;
    }

    const halfPhysical = game.u?.uprops?.[56]; /* prop.h HALF_PHDAM = 56 (was 74: not a prop.h index) */
    if (halfPhysical && ((halfPhysical.intrinsic | 0) || (halfPhysical.extrinsic | 0)))
    /* C uhitm.c:3242 `if (Half_physical_damage)` = HALF_PHDAM (prop.h:79, 56). */
    if (_half_phys_prop_mu())
        mhm.damage = Math.trunc(((mhm.damage | 0) + 1) / 2);
    const _deathBeforeDamage = game._pendingDeath || null;
    await mdamageu(mtmp, mhm.damage | 0);
    mhm.damage = 0;
    if (game._pendingDeath && game._pendingDeath !== _deathBeforeDamage) {
        await drain_pending_death_in_place();
        if (pending_death_is_final()) return;
    }

    if (!u.uarmh || (u.uarmh.otyp | 0) !== 94 /* DUNCE_CAP */) {
        const oldmort = u.umortality | 0;
        const deathBeforeBrains = game._pendingDeath || null;
        const result = await eat_brains(mtmp, game.youmonst, true, null);
        /* C eat.c:715 done(DIED) does not return after fatal brainlessness.
         * Finish that deferred death before uhitm.c:3263's Int-loss roll. */
        if (game._pendingDeath && game._pendingDeath !== deathBeforeBrains) {
            await drain_pending_death_in_place();
            if (pending_death_is_final()) return;
        }
        if ((u.umortality | 0) > oldmort)
            game.s.skipdrin = 1;
        if (result === M_ATTK_MISS)
            return;
    }
    adjattrib(A_INT, -rnd(2), false);
    if (!rn2(5)) {
        losespells();
        game.s.skipdrin = 1;
    }
    if (!rn2(5)) {
        await drain_weapon_skill(rnd(2));
        game.s.skipdrin = 1;
    }
}

async function mhitm_ad_drli_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    if (!rn2(3) && !Drain_resistance_mu()
        && !mhitm_mgc_atk_negated_u(true, mtmp)) {
        await losexp("life drainage");
        game._botlRaisedAfterFlush = true;
        /* C's own comment: unlike hitting with Stormbringer, wounded attacker
           doesn't heal any from the drained life */
    }
}
/* C youprop.h:52 Drain_resistance = HDrain_resistance || EDrain_resistance. */
function Drain_resistance_mu() {
    const p = game.u && game.u.uprops && game.u.uprops[DRAIN_RES_MU];
    return !!(p && (p.intrinsic || p.extrinsic));
}
const AD_DRLI_MU = 15;    /* monattk.h:57 */
const DRAIN_RES_MU = 9;   /* prop.h:27 (js/const.js:2335) */
const AD_CORR_MU = 42;    /* monattk.h:84 */
const AD_DCAY_MU = 34;    /* monattk.h:76 */

async function mhitm_ad_corr_u(mtmp, mattk) {
    await hitmsg(mtmp, mattk);
    if (mtmp.mcan)
        return;
    await erode_armor_um(game.youmonst, ERODE_CORRODE);
}

/* C ref: uhitm.c:2362-2395 mhitm_ad_dcay, the `mdef == &gy.youmonst` arm — a
 * brown pudding's rotting bite.  Was absent from mhitm_adtyping_u's switch, so
 * it fell into the default arm and drew nothing where C loops rn2(5) inside
 * erode_armor(). */
async function mhitm_ad_dcay_u(mtmp, mattk) {
    await hitmsg(mtmp, mattk);
    if (mtmp.mcan)
        return;
    const hm = _hero_form_mndx_mu();
    if (hm === 254 /* PM_WOOD_GOLEM */ || hm === 253 /* PM_LEATHER_GOLEM */) {
        pline('You rot!');
        await rehumanize();
        return;
    }
    await erode_armor_um(game.youmonst, ERODE_ROT);
}

async function mhitm_ad_deth_u(magr, mattk, mhm) {
    const pd = game.youmonst.data;
    pline_mon(magr, "%s reaches out with its deadly touch.", Monnam(magr));
    if (is_undead_mu(pd)) {
        mhm.damage = Math.trunc((mhm.damage + 1) / 2);
        pline('Was that the touch of death?');
        return;
    }
    switch (rn2(20)) {
        case 19: case 18: case 17:
            if (!Antimagic_mu()) {
                await touch_of_death_mc(magr);
                mhm.damage = 0;
                return;
            }
            /* FALLTHROUGH */
        default: /* case 16 .. case 5 */
            You_feel_mu('your life force draining away...');
            mhm.permdmg = 1;
            return;
        case 4: case 3: case 2: case 1: case 0:
            if (Antimagic_mu())
                shieldeff(game.u.ux | 0, game.u.uy | 0);
            pline("Lucky for you, it didn't work!");
            mhm.damage = 0;
            return;
    }
}
async function mhitm_ad_famn_u(magr, mattk, mhm) {
    await pline('%s reaches out, and your body shrivels.', Monnam(magr));
    exercise(A_CON, false);
    if (!is_fainted_mu())
        await morehungry_mu(rn1(40, 40));
    /* C's own comment: plus the normal damage — mhm.damage is left alone */
}
/* C youprop.h:57 Antimagic = HAntimagic || EAntimagic. */
function Antimagic_mu() {
    const p = game.u && game.u.uprops && game.u.uprops[ANTIMAGIC_MU];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C mondata.h is_undead(ptr) — (ptr->mflags2 & M2_UNDEAD) != 0, same numeric
 * spelling as js/uhitm.js:179 / js/mhitm.js:4044's file-local copies. */
function is_undead_mu(ptr) {
    return !!(ptr && ((ptr.mflags2 | 0) & 0x00000002 /* M2_UNDEAD */) !== 0);
}
const AD_DETH_MU = 37;    /* monattk.h:79 */
const AD_FAMN_MU = 39;    /* monattk.h:81 */
const ANTIMAGIC_MU = 12;  /* prop.h:30 (js/const.js:2339) */

async function mhitm_ad_slim_u(mtmp, mattk, mhm) {
    const negated = mhitm_mgc_atk_negated_u(false, mtmp);
    const pdMndx = _hero_form_mndx_mu();
    hitmsg_je(mtmp, mattk);
    if (negated) {
        if (!mtmp.mcan)
            pline('You escape harm.');
        return;
    }
    if (flaming_gu(pdMndx)) {
        pline_The('slime burns away!');
        mhm.damage = 0;
    } else if (Unchanging_mu() || noncorporeal_mu(game.youmonst.data)
               || pdMndx === PM_GREEN_SLIME_MU) {
        pline('You are unaffected.');
        mhm.damage = 0;
    } else if (!Slimed_mu()) {
        pline("You don't feel very well.");
        await make_slimed(10, null);
        delayed_killer(SLIMED_MU, KILLED_BY_AN_MU,
                        monPmname_mu((mtmp.mnum ?? mtmp.mndx ?? 0) | 0,
                                     mtmp.female ? 1 : 0));
    } else {
        pline('Yuck!');
    }
}
const AD_SLIM_MU = 40;       /* monattk.h:82 */
const PM_GREEN_SLIME_MU = 208; /* pm.generated.js */
const SLIMED_MU = 22;         /* const.js:2350 SLIMED (delayed-killer id) */
/* C youprop.h:372 Unchanging = HUnchanging || EUnchanging. */
function Unchanging_mu() {
    const p = game.u && game.u.uprops && game.u.uprops[UNCHANGING_MU];
    return !!(p && (p.intrinsic || p.extrinsic));
}
const UNCHANGING_MU = 63; /* prop.h UNCHANGING (js/const.js:2391) */
/* C youprop.h:113 Slimed = u.uprops[SLIMED].intrinsic — intrinsic ONLY,
 * unlike the HFoo||EFoo pattern the other _mu boolean readers above use. */
function Slimed_mu() {
    const p = game.u && game.u.uprops && game.u.uprops[SLIMED_MU];
    return !!(p && (p.intrinsic | 0));
}

async function mhitm_ad_were_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    const u = game.u || (game.u = {});
    if (!rn2(4) && ((u.ulycn ?? NON_PM_MU) | 0) === NON_PM_MU
        && !_ac_prot_from_shape_changers_u()
        && !_defends_u(AD_WERE_MU, u.uwep)
        && !mhitm_mgc_atk_negated_u(true, mtmp)) {
        /* C uhitm.c:4280-4285: the bite changes the hero's lycanthropy
         * species immediately.  mtmp.mnum is monsndx(mtmp->data), the same
         * numeric identity used by set_ulycn(). */
        await urgent_pline_disp('You feel feverish.');
        exercise(A_CON, false);
        set_ulycn_real(mtmp.data.pmidx);
        /* C uhitm.c:4285 retouch_equipment(2) */
        await retouch_equipment_mu(2);
    }
}
const AD_WERE_MU = 29;   /* monattk.h:71 */
function _ac_prot_from_shape_changers_u() {
    const p = game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS_MU];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* C ref: obj.h defends(adtyp, obj) == get_artifact(obj) && artilist[...].
 * defn.adtyp == adtyp.  Same expression js/mhitm.js:3890's (unexported)
 * defends() uses. */
function _defends_u(adtyp, obj) {
    const a = obj ? (obj.oartifact | 0) : 0;
    return !!a && arti_defn_adtyp_u(a) === (adtyp | 0);
}

async function mhitm_ad_ston_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    if (!rn2(3)) {
        if (mtmp.mcan) {
            if (!Deaf_mu()) await You_hear(`a cough from ${uhitm_mon_nam(mtmp)}!`);
        } else {
            /* C uhitm.c:4217-4226 uses You_hear, including its Unaware
             * dream wording and underwater/acoustics handling. */
            if (Hallucination(game) && !Blind_mu()) {
                await You_hear("hissing.");
                pline(`${Monnam(mtmp)} appears to be blowing you a kiss...`);
            } else if (!Deaf_mu()) {
                await You_hear(`${s_suffix_mu(uhitm_mon_nam(mtmp))} hissing!`);
            } else if (!Blind_mu()) {
                pline(`${Monnam(mtmp)} seems to grimace.`);
            }
            const _ston = !rn2(10) || ((game.flags?.moonphase | 0) === NEW_MOON);
            if (_ston && await do_stone_u(mtmp)) {
                mhm.hitflags = M_ATTK_HIT;
                mhm.done = true;
            }
        }
    }
    void mhm;
}

function mhitm_ad_blnd_u(mtmp, mattk, mhm) {
    const gs = game;
    /* C's mdef is &gy.youmonst; js/mhitm.js can_blnd reads mdef.m_id === 0 as
     * "is_you" and mdef.data for haseyes(). */
    if (can_blnd_mu(mtmp, gs.youmonst || {}, mattk.aatyp | 0, null)) {
        if (!Blind(gs))
            pline(je_Monnam(mtmp) + ' blinds you!');
        /* C youprop.h BlindedTimeout == (Blinded & TIMEOUT). */
        const blindedTimeout = ((gs.u?.uprops?.[BLINDED]?.intrinsic) | 0) & TIMEOUT;
        make_blinded(blindedTimeout + (mhm.damage | 0), false);
        if (!Blind(gs)) /* => Eyes of the Overworld */
            Your1('vision quickly clears.');
    }
    mhm.damage = 0;
}
const AD_BLND_U = 11;   /* monattk.h:53 */

function mhitm_ad_stck_u(mtmp, mattk, mhm) {
    const negated = mhitm_mgc_atk_negated_u(false, mtmp);
    const barbs = ((mtmp.mndx ?? mtmp.mnum ?? -1) | 0) === PM_BARBED_DEVIL_MU;
    hitmsg_je(mtmp, mattk);
    const u = game.u || {};
    if (!negated && !u.ustuck && !_kb_sticks(_hero_form_mndx_mu())) {
        set_ustuck_mu(mtmp);
        if (barbs)
            pline('The barbs stick to you!');
    }
    void mhm;
}
async function mhitm_ad_wrap_u(mtmp, mattk, mhm) {
    const u = game.u || (game.u = {});
    const pd_mndx = _hero_form_mndx_mu();
    const pa_mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const pa_mlet = (pa_mndx >= 0 && pa_mndx < _KB_MONS.length)
        ? (_KB_MONS[pa_mndx][0] | 0) : -1;
    const coil = ((_kb_mflags1(pa_mndx) & M1_SLITHY_MU) !== 0)
        && (pa_mlet === S_SNAKE_MU || pa_mlet === S_NAGA_MU);
    if ((!(mtmp.mcan | 0) || u.ustuck === mtmp) && !_kb_sticks(pd_mndx)) {
        if (!u.ustuck && !rn2(10)) {
            if (u_slip_free(mtmp, mattk)) {
                mhm.damage = 0;
            } else {
                /* before message, for botl update -- matches mhitm_ad_stck_u's
                 * set_ustuck-then-pline ordering above. */
                set_ustuck_mu(mtmp);
                urgent_pline(`${Some_Monnam_mu(mtmp)} `
                    + `${coil ? 'coils' : 'swings'} itself around you!`);
            }
        } else if (u.ustuck === mtmp) {
            /* uhitm.c:3387-3406: drown test comes BEFORE the crush message. */
            if (is_pool_mu(mtmp.mx, mtmp.my) && !_Swimming_wrap()
                && !_Amphibious_wrap() && !_Breathless_wrap()) {
                const typ = game.level?.locations?.[mtmp.mx]?.[mtmp.my]?.typ | 0;
                const moat = typ !== POOL_WRAP && !is_waterwall_mu(mtmp.mx, mtmp.my)
                    && !(game.medusa_level && game.medusa_level.dnum === u.uz?.dnum
                         && game.medusa_level.dlevel === u.uz?.dlevel)
                    && !Is_waterlevel_mu(game.u?.uz);
                urgent_pline(`${Monnam(mtmp)} drowns you...`);
                const svk = game.svk || (game.svk = {});
                svk.killer ||= { id: 0, format: 0, name: '', next: null };
                svk.killer.format = KILLED_BY_AN_MU;
                svk.killer.name = `${moat ? 'moat' : 'pool of water'} by `
                    + an(pmname(mtmp.data ?? { pmidx: (mtmp.mnum ?? mtmp.mndx ?? 0) | 0 },
                                Mgender(mtmp)));
                await done(DROWNING_MU, drain_pending_death_in_place);
                /* done() blocks here in C (wizard "Die?" prompt), so
                 * later text and mdamageu land after it. */
            } else if (mattk.aatyp === AT_HUGS_) {
                pline(`You are being crushed.`);
            }
        } else {
            mhm.damage = 0;
            if (game.flags?.verbose) {
                if (coil)
                    pline_mon(mtmp, `${Monnam(mtmp)} brushes against you.`);
                else
                    pline_mon(mtmp, `${Monnam(mtmp)} brushes against your `
                        + `${mbodypart_mu(_hero_monst_mu(), LEG_MU)}.`);
            }
        }
    } else {
        mhm.damage = 0;
    }
}
const POOL_WRAP = 16; /* const.js POOL */
function _uprop_wrap(idx) {
    const p = game.u?.uprops?.[idx];
    return !!(p && (p.intrinsic || p.extrinsic) && !(p.blocked | 0));
}
function _Swimming_wrap() {
    const st = game.u?.usteed;
    return _uprop_wrap(51 /* SWIMMING */)
        || !!(st && ((st.data?.mflags1 | 0) & 0x00000002 /* M1_SWIM */));
}
function _Amphibious_wrap() {
    return _uprop_wrap(52 /* MAGICAL_BREATHING */)
        || !!(((game.youmonst?.data?.mflags1 | 0) & 0x00000200 /* M1_AMPHIBIOUS */));
}
function _Breathless_wrap() {
    return _uprop_wrap(52 /* MAGICAL_BREATHING */)
        || !!(((game.youmonst?.data?.mflags1 | 0) & 0x00000400 /* M1_BREATHLESS */));
}
const M1_SLITHY_MU = 0x00080000, S_SNAKE_MU = 45, S_NAGA_MU = 40;
function _failed_grab_u(mtmp, mattk) {
    const heroMndx = _hero_form_mndx_mu();
    const heroUnsolid = (_kb_mflags1(heroMndx) & M1_UNSOLID_) !== 0;
    const notonhead = !!(game.gn && game.gn.notonhead);
    if ((heroUnsolid || notonhead)
        && (mattk.aatyp === AT_HUGS_ || mattk.adtyp === AD_WRAP_
            || mattk.adtyp === AD_STCK_ || mattk.adtyp === AD_DGST_GU)) {
        const magrnam = s_suffix(Monnam(mtmp));
        const mdefnam = !notonhead ? 'you'
            : `${s_suffix(some_mon_nam(mtmp))} tail`;
        const verb = mattk.adtyp === AD_DGST_GU ? 'gulp'
            : mattk.adtyp === AD_STCK_ ? 'adhere' : 'grab';
        pline(`${magrnam} ${verb} attempt `
            + `${!notonhead ? 'passes right through' : 'fails to hold'} `
            + `${mdefnam}!`);
        return true;
    }
    return false;
}
async function mhitm_ad_drst_u(mtmp, mattk, mhm) {
    const negated = mhitm_mgc_atk_negated_u(false, mtmp);
    let ptmp = A_STR_AD;
    switch (mattk.adtyp) {
        case AD_DRST_: ptmp = A_STR_AD; break;
        case AD_DRDX_: ptmp = A_DEX_AD; break;
        case AD_DRCO_: ptmp = A_CON_AD; break;
    }
    hitmsg_je(mtmp, mattk);
    if (!negated && !rn2(8)) {
        const buf = `${s_suffix(je_Monnam(mtmp))} ${mpoisons_subj(mtmp, mattk)}`;
        /* C uhitm.c:3157 — poisoned(buf, ptmp, pmname(pa, Mgender(magr)), 30,
         * FALSE); the third argument is the KILLER name, not the reason. */
        await poisoned_u(buf, ptmp, monPmname_mu((mtmp.mnum ?? mtmp.mndx ?? 0) | 0,
                                           mtmp.female ? 1 : 0), 30, false);
    }
}
/* C ref: monattk.h:49,72,73 AD_DRST/AD_DRDX/AD_DRCO; attrib.h A_STR/A_DEX/A_CON. */
const AD_DRST_ = 7, AD_DRDX_ = 30, AD_DRCO_ = 31;
const A_STR_AD = 0, A_DEX_AD = 3, A_CON_AD = 4;  /* attrib.h enum: STR,INT,WIS,DEX,CON,CHA */
const _POIS_A_CHA = 5, _POIS_A_CON = 4;
export async function poisoned_u(reason, typ, pkiller, fatal, thrown_weapon) {
    const u = game.u || (game.u = {});
    let kprefix = KILLED_BY_AN_MU;
    const blast = (reason === 'blast');

    /* C attrib.c:330-337 — tell the player, unless the message already did. */
    if (!blast && !strstri(reason, 'poison')) {
        const r = String(reason);
        const plural = r.charAt(r.length - 1) === 's';
        const lead = /[A-Z]/.test(r.charAt(0)) ? '' : 'The ';
        await pline(`${lead}${r} ${plural ? 'were' : 'was'} poisoned!`);
    }
    if (_Poison_resistance_mu()) {
        if (blast) shieldeff(u.ux, u.uy);
        await pline_The("poison doesn't seem to affect you.");
        return;
    }

    // C attrib.c:346-356: unique monsters and existing articles own the prefix.
    let pk = String(pkiller ?? '');
    const { mntmp: mndx } = name_to_mon(pk);
    const data = mndx >= 0 ? permonstTemplate(mndx) : null;
    if (data && (data.geno & G_UNIQ_MHU)) {
        kprefix = KILLED_BY_MU;
        if (!(data.mflags2 & M2_PNAME_MHU)) pk = the(pk);
    } else if (/^(the |an |a )/i.test(pk)) {
        kprefix = KILLED_BY_MU;
    }

    const i = !fatal ? 1 : rn2((fatal | 0) + (thrown_weapon ? 20 : 0));
    let loss;
    if (i === 0 && typ !== _POIS_A_CHA) {
        /* C attrib.c:364-383 — sometimes survivable instant kill. */
        loss = 6 + d(4, 6);
        if ((u.uhp | 0) <= loss) {
            u.uhp = -1;
            if (game.disp) game.disp.botl = true;
            await pline_The('poison was deadly...');
        } else {
            const olduhp = u.uhp | 0;
            const newuhpmax = (u.uhpmax | 0) - Math.trunc(loss / 2);
            setuhpmax_mu(Math.max(newuhpmax, minuhpmax_mu(3)), true);
            loss = adjuhploss(loss, olduhp);
            await losehp_mu(loss, pk, kprefix);
            if (adjattrib_mu(_POIS_A_CON, (typ !== _POIS_A_CON) ? -1 : -3, 1))
                await poisontell_mu(_POIS_A_CON, true);
            if (typ !== _POIS_A_CON && adjattrib_mu(typ, -3, 1))
                await poisontell_mu(typ, true);
        }
    } else if (i > 5) {
        // C youprop.h Half_gas_damage: a wet towel worn over the face.
        loss = thrown_weapon ? rnd(6) : rn1(10, 6);
        if ((blast || reason === 'gas cloud') && u.ublindf
            && u.ublindf.otyp === OTYP_TOWEL && u.ublindf.spe > 0)
            loss = Math.trunc((loss + 1) / 2);
        await losehp_mu(loss, pk, kprefix);
        /* losehp raises botl after the last flush (no pline follows), so
         * mdamageu must not bot() the pre-damage line (attrib.c:388). */
        game._botlRaisedAfterFlush = true;
    } else {
        /* C attrib.c:393-399 — attribute loss. */
        loss = (thrown_weapon || !fatal) ? 1 : d(2, 2);
        if (adjattrib_mu(typ, -loss, 1))
            await poisontell_mu(typ, true);
    }

    // C attrib.c:401-408: done() returns only after lifesaving/wizard recovery.
    if ((u.uhp | 0) < 1) {
        game.svk ||= {};
        game.svk.killer ||= { id: 0, format: 0, name: '', next: null };
        game.svk.killer.format = kprefix;
        game.svk.killer.name = pk;
        deadhero(strstri(pk, 'poison') ? DIED : POISONING,
            { alreadySaidYouDie: true, noDeathLine: true });
        await do_death_sequence({ inPlace: true });
    }
    await encumber_msg_mu();
}

/* C ref: mhitu.c:1140 hitmu — monster's attack hit the hero.
 * Returns MM_/M_ATTK_ flags.  Scoped to AD_PHYS/AD_ELEC hand-to-hand. */
async function hitmu_je(mtmp, mattk) {
    const u = game.u || (game.u = {});
    /* C mhitu.c:1147 — olduasmon is latched per hitmu() call, so an earlier
     * attack that rehumanized the hero leaves later attacks with the new form. */
    game._olduasmon_mndx = _hero_form_mndx_mu();
    if (!canspotmon_disp(mtmp))
        map_invisible(mtmp.mx | 0, mtmp.my | 0);
    {
        const mdatMndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
        const mlet_hu = (mdatMndx >= 0 && mdatMndx < _KB_MONS.length)
            ? (_KB_MONS[mdatMndx][0] | 0) : -1;
        if ((mtmp.mundetected | 0)
            && (((_kb_mflags1(mdatMndx) & M1_CONCEAL_MU) !== 0) || mlet_hu === S_EEL_MU)) {
            mtmp.mundetected = 0;
            if (!tp_sensemon_mu(mtmp) && !_Detect_monsters_mu()) {
                const mx = mtmp.mx | 0, my = mtmp.my | 0;
                const obj = game.level?.levelObjects?.[mx]?.[my] ?? null;
                if (obj) {
                    /* C:1169-1174 — blind-and-unidentified reads as the generic
                     * "something"; a pool the hero is not inside reads as "the
                     * water"; otherwise the object's full doname(). */
                    let what;
                    if (Blind(game) && !(obj.dknown | 0))
                        what = 'something';
                    else if (is_pool_mu(mx, my) && !(game.u?.uinwater | 0))
                        what = 'the water';
                    else
                        what = (await doname_mu(obj));
                    /* C:1176-1179 — "mtmp might be invisible with hero unable to
                     * see same"; the bare "It" is replaced by "Something".  C
                     * uses strcmp, not strcmpi, so only the capitalised form is
                     * caught — port the case-sensitivity. */
                    let Amonbuf = Amonnam_mu(mtmp);
                    if (Amonbuf === 'It')
                        Amonbuf = 'Something';
                    pline(`${Amonbuf} was hidden under ${what}!`);
                }
                newsym(mx, my);
            }
        }
    }
    const mhm = newMhm(0);
    /* C mhitu.c:1185 — base damage d(damn, damd). */
    mhm.damage = d(mattk.damn | 0, mattk.damd | 0);
    /* C mhitu.c:1186-1188 — undead (or a vampshifter) hit at midnight() roll
     * the dice a second time for extra damage, BEFORE mhitm_adtyping. */
    {
        const mi = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
        const mf2 = (mi >= 0 && mi < _KB_MONS.length) ? (_KB_MONS[mi][7] | 0) : 0;
        if (((mf2 & 0x00000002 /* M2_UNDEAD */) !== 0 || is_vampshifter(mtmp)) && midnight())
            mhm.damage += d(mattk.damn | 0, mattk.damd | 0);
    }
    await mhitm_adtyping_u(mtmp, mattk, mhm);
    /* C mhitu.c:1191 mhitm_knockback. */
    await mhitm_knockback_u(mtmp, mattk, mhm.hitflags);
    if (mhm.done)
        return mhm.hitflags;
    /* C mhitu.c:1199-1203 — already dead? call rehumanize() or done_in_by() as appropriate */
    if ((Upolyd_fn(u) ? (u.mh | 0) : (u.uhp | 0)) < 1) {
        if (!game._pendingDeath) {
            const _deathBefore = game._pendingDeath || null;
            await mdamageu(mtmp, 1);
            if (game._pendingDeath && game._pendingDeath !== _deathBefore)
                await drain_pending_death_in_place();
        }
        mhm.damage = 0; /* don't do it a second time below */
    }
    /* C mhitu.c:1206 — negative AC reduces damage: rnd(-uac). */
    if (mhm.damage && (u.uac | 0) < 0) {
        mhm.damage -= rnd(-(u.uac | 0));
        if (mhm.damage < 1) mhm.damage = 1;
    }
    if (mhm.damage > 0) {
        /* C mhitu.c:1216-1220 — the Cleric's quest helm also halves damage
         * from monsters that hate blessings, even when the helm is cursed. */
        if (_half_phys_prop_mu()
            || (game.urole?.mnum === PM_CLERIC && u.uarmh
                && is_quest_artifact(u.uarmh) && mon_hates_blessings(mtmp)))
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);
        /* C mhitu.c:1222-1252 — Death's life force drain (mhm.permdmg). */
        if (mhm.permdmg) {
            const polyd = !!Upolyd_fn(u);
            mhm.permdmg = rn2(Math.trunc(mhm.damage / 2) + 1);
            if (polyd || (u.uhpmax | 0) > 25 * (u.ulevel | 0))
                mhm.permdmg = mhm.damage;
            else if ((u.uhpmax | 0) > 10 * (u.ulevel | 0))
                mhm.permdmg += Math.trunc(mhm.damage / 2);
            else if ((u.uhpmax | 0) > 5 * (u.ulevel | 0))
                mhm.permdmg += Math.trunc(mhm.damage / 4);
            let lowerlimit;
            if (polyd)
                lowerlimit = Math.min(((game.youmonst?.data?.mlevel ?? u.ulevel) | 0), u.ulevel | 0);
            else
                lowerlimit = minuhpmax_mu(1);
            const hpmaxKey = polyd ? 'mhmax' : 'uhpmax';
            if ((u[hpmaxKey] | 0) - mhm.permdmg > lowerlimit)
                u[hpmaxKey] = (u[hpmaxKey] | 0) - mhm.permdmg;
            else if ((u[hpmaxKey] | 0) > lowerlimit)
                u[hpmaxKey] = lowerlimit;
            if (game.disp) game.disp.botl = true;
        }
        const _deathBeforeDamage = game._pendingDeath || null;
        /* awaited because mdamageu()'s Upolyd arm is rehumanize(), which is async. */
        await mdamageu(mtmp, mhm.damage);
        if (game._pendingDeath && game._pendingDeath !== _deathBeforeDamage)
            await drain_pending_death_in_place();
    }
    const res = mhm.damage ? await passiveum(game._olduasmon_mndx, mtmp, mattk)
                           : M_ATTK_HIT;
    /* C mhitu.c:1263 — stop_occupation() at the end of a landed hit (reached only
     * when the earlier mhm.done knockback path did not return early).  Emits
     * "You stop studying." into the combat stream at C's point. */
    await stop_occupation();
    return res;
}

/* C mondata.h — the hero's CURRENT form index: u.umonnum while polymorphed,
 * otherwise the role/race monster.  Only the polymorphed value is read here
 * (passiveum's !Upolyd arm returns before the form matters). */
function _hero_form_mndx_mu() {
    const u = game.u || {};
    if (Upolyd_fn(u))
        return (u.umonnum ?? -1) | 0;
    return (u.umonster ?? u.umonnum ?? -1) | 0;
}

/* C macro Conflict (youprop.h:218) := HConflict || EConflict, i.e.
 * u.uprops[CONFLICT].{intrinsic,extrinsic}.  Same reader js/dogmove.js
 * _conflict_dm()/js/monmove.js _conflict_mv() use — mattacku's own local
 * copy per this codebase's convention of one small reader per file. */
function _conflict_mu() {
    const p = game.u?.uprops?.[CONFLICT_MU];
    return !!(p && (p.intrinsic || p.extrinsic));
}

/* C mhitu.c:466-476 mtrapped_in_pit(struct monst *mtmp). */
function _mtrapped_in_pit_attacker_mu(mtmp) {
    return mtrapped_in_pit(mtmp);
}

async function assess_dmg_um(mtmp, tmp) {
    mtmp.mhp = (mtmp.mhp | 0) - (tmp | 0);
    if ((mtmp.mhp | 0) <= 0) {
        pline(`${je_Monnam(mtmp)} dies!`);
        await xkilled_uh(mtmp, XKILL_NOMSG_UH);
        if (!DEADMONSTER(mtmp))   /* C mhitu.c:2360 !DEADMONSTER(mtmp) */
            return M_ATTK_HIT;
        return M_ATTK_AGR_DIED;
    }
    return M_ATTK_HIT;
}

import { Resists_Elem as Resists_Elem_cold_um } from './mondata.js';
import { strstri } from './hacklib.js'; // relocate-fns
import { ignite_items } from './trap.js'; // relocate-fns
import { do_stone_u } from './uhitm.js'; // relocate-fns
import { steal, worn_item_removal } from './steal.js'; // relocate-fns
import { FAST } from './const.js'; // relocate-fns
import { initedog } from './dog.js'; // relocate-fns
import { makemon } from './makemon.js'; // relocate-fns
import { christen_monst } from './mhitm.js'; // relocate-fns
import { SET_BOTL } from './uhitm.js'; // relocate-fns
export { stealarm } from './steal.js'; // relocate-fns
export { BOULDER_MU, Blind_mu, CORPSE_MK, _conflict_mu, _kb_uball, doname_mu, is_animal_mu, touch_petrifies_mk }; // relocate-fns
export { do_stone_u } from './uhitm.js'; // relocate-fns
export { is_uniq_mhu, type_is_pname_mhu, youmonst_data }; // relocate-fns
export { free_youbuf } from './pline.js'; // relocate-fns
const COLD_RES_UM = 2;      /* prop.h COLD_RES (js/const.js:2313) */
function _resists_cold_um(mtmp) {
    return Resists_Elem_cold_um(mtmp, COLD_RES_UM);
}

/* C monattk.h — the adtyp numbers, transcribed from the header rather than
 * counted off: AD_PHYS 0 (:42), AD_FIRE 2 (:44), AD_COLD 3 (:45), AD_ELEC 6
 * (:47), AD_ACID 8 (:49), AD_STUN 12 (:54), AD_PLYS 14 (:56), AD_STON 18
 * (:60), AD_ENCH 41 (:83). */
const AD_PHYS_UM = 0, AD_FIRE_UM = 2, AD_COLD_UM = 3, AD_ELEC_UM = 6,
      AD_ACID_UM = 8, AD_STUN_UM = 12, AD_PLYS_UM = 14, AD_STON_UM = 18,
      AD_ENCH_UM = 41;
async function passiveum(olduasmonMndx, mtmp, mattk) {
    void mattk;
    const u = game.u || {};
    const mndx = olduasmonMndx | 0;
    /* js/makemon_mattk.json keeps all NATTK slots (zero-filled), which is C's
     * fixed array; MON_MATTK above drops the trailing NO_ATTKs, so it is the
     * wrong table for a loop whose whole job is to find the first EMPTY slot. */
    const row = (mndx >= 0 && mndx < _KB_MATTK.length) ? _KB_MATTK[mndx] : null;

    /* C:2450-2456 — first AT_NONE / AT_BOOM slot of the OLD form. */
    let oldu_mattk = null;
    for (let i = 0; !oldu_mattk; i++) {
        if (i >= NATTK)
            return M_ATTK_HIT;
        const a = (row && i < row.length) ? row[i] : null;
        const aatyp = a ? (a.aatyp | 0) : AT_NONE_;
        if (aatyp === AT_NONE_ || aatyp === AT_BOOM_)
            oldu_mattk = a ? { aatyp, adtyp: a.adtyp | 0, damn: a.damn | 0, damd: a.damd | 0 }
                           : { aatyp: AT_NONE_, adtyp: AD_PHYS_UM, damn: 0, damd: 0 };
    }

    /* C:2457-2462 */
    const mlevel = (mndx >= 0 && mndx < _KB_MONS.length) ? (_KB_MONS[mndx][1] | 0) : 0;
    let tmp;
    if (oldu_mattk.damn)
        tmp = d(oldu_mattk.damn, oldu_mattk.damd);
    else if (oldu_mattk.damd)
        tmp = d(mlevel + 1, oldu_mattk.damd);
    else
        tmp = 0;

    /* C:2464-2481 — AD_ACID: "These affect the enemy even if you were
     * killed."  mhitu.c:2465-2480:
     *     case AD_ACID:
     *         if (!rn2(2)) {
     *             pline_mon(mtmp, "%s is splashed by %s%s!", Monnam(mtmp),
     *                   !Upolyd ? "" : "your ", hliquid("acid"));
     *             if (resists_acid(mtmp)) {
     *                 pline_mon(mtmp, "%s is not affected.", Monnam(mtmp));
     *                 tmp = 0;
     *             }
     *         } else
     *             tmp = 0;
     *         if (!rn2(30))
     *             erode_armor(mtmp, ERODE_CORRODE);
     *         if (!rn2(6))
     *             acid_damage(MON_WEP(mtmp));
     *         return assess_dmg(mtmp, tmp);
     * All three draws are UNCONDITIONAL -- rn2(30)/rn2(6) are evaluated
     * whether or not the splash landed. */
    if (oldu_mattk.adtyp === AD_ACID_UM) {
        if (!rn2(2)) {
            pline_mon(mtmp, `${je_Monnam(mtmp)} is splashed by ${Upolyd_fn(u) ? "your " : ""}${hliquid_mu("acid")}!`);
            if (resists_acid_mu(mtmp)) {
                pline_mon(mtmp, `${je_Monnam(mtmp)} is not affected.`);
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        if (!rn2(30))
            await erode_armor_um(mtmp, ERODE_CORRODE);
        if (!rn2(6))
            await acid_damage_um(MON_WEP(mtmp));
        return assess_dmg_um(mtmp, tmp);
    }

    /* C:2482-2515 — AD_STON, AD_ENCH.  GAP, see the header; every other
     * adtyp falls out of C's own `default: break` here. */
    if (oldu_mattk.adtyp === AD_STON_UM) {
        /* C:2482-2506 — cockatrice passive */
        const protector = attk_protection_mu(mattk.aatyp | 0);
        let wornitems = (mtmp.misc_worn_check | 0);
        /* wielded weapon gives same protection as gloves here */
        if (MON_WEP(mtmp))
            wornitems |= W_ARMG_MU;
        if (!resists_ston_mu(mtmp)
            && (protector === 0
                || (protector !== ~0 && (wornitems & protector) !== protector))) {
            if (poly_when_stoned(mtmp.data)) {
                await mon_to_stone_mu(mtmp);
                return 1;
            }
            pline_mon(mtmp, `${je_Monnam(mtmp)} turns to stone!`);
            game.stoned = 1;
            await xkilled_uh(mtmp, XKILL_NOMSG_UH);
            if ((mtmp.mhp | 0) > 0)
                return M_ATTK_HIT;
            return M_ATTK_AGR_DIED;
        }
        return M_ATTK_HIT;
    }
    if (oldu_mattk.adtyp === AD_ENCH_UM) {
        if (mon_currwep) await drain_item(mon_currwep, true);
        return M_ATTK_HIT;
    }

    /* C:2520-2521 */
    if (!Upolyd_fn(u))
        return M_ATTK_HIT;

    /* C:2523 — "These affect the enemy only if you are still a monster". */
    if (rn2(3)) {
        switch (oldu_mattk.adtyp) {
        case AD_PHYS_UM:
            if (oldu_mattk.aatyp === AT_BOOM_) {
                await pline('You explode!');
                await rehumanize();
                return assess_dmg_um(mtmp, tmp);
            }
            break;
        case AD_PLYS_UM: {
            if (tmp > 127) tmp = 127;
            if ((u.umonnum | 0) === PM_FLOATING_EYE_MU) {
                if (!rn2(4)) tmp = 127;
                if ((mtmp.mcansee | 0) && haseyes_pu(mtmp.data) && rn2(3)
                    && (perceives_mu(mtmp.data) || !_Invis_mu())) {
                    if (Blind(game)) {
                        pline(`As a blind ${pmname(youmonst_data(game), game.flags?.female ? 1 : 0)}, you cannot defend yourself.`);
                    } else {
                        if (await mon_reflects(mtmp, "Your gaze is reflected by %s %s."))
                            return 1;
                        pline_mon(mtmp, `${je_Monnam(mtmp)} is frozen by your gaze!`);
                        paralyze_monst_mu(mtmp, tmp);
                        return M_ATTK_AGR_DONE;
                    }
                }
            } else { /* gelatinous cube */
                pline_mon(mtmp, `${je_Monnam(mtmp)} is frozen by you.`);
                paralyze_monst_mu(mtmp, tmp);
                return M_ATTK_AGR_DONE;
            }
            /* C:2560 `return M_ATTK_HIT;` — a case-specific direct return,
             * NOT a `break` into the shared `return assess_dmg(mtmp, tmp);`
             * every other arm of this switch falls through to. */
            return M_ATTK_HIT;
        }
        case AD_COLD_UM:   /* C:2561-2575 — brown mold or blue jelly */
            if (_resists_cold_um(mtmp)) {
                shieldeff(mtmp.mx | 0, mtmp.my | 0);
                pline_mon(mtmp, `${je_Monnam(mtmp)} is mildly chilly.`);
                golemeffects_um(mtmp, AD_COLD_UM, tmp);
                tmp = 0;
                break;
            }
            pline_mon(mtmp, `${je_Monnam(mtmp)} is suddenly very cold!`);
            /* C pline.c:273-274 vpline() flush_screen()->bot() paints the status line
             * (mdamageu's botl) BEFORE the heal below, which sets no botl flag, so
             * the --More-- raised by the next pline still shows the pre-heal HP. */
            await bot_um();
            game._botlStaleHp = u.mh | 0;           /* js/potion.js healup() latch */
            game._botlStaleHpmax = u.mhmax | 0;
            u.mh = (u.mh | 0) + (((tmp | 0) + rn2(2)) / 2 | 0);
            if ((u.mhmax | 0) < (u.mh | 0))
                u.mhmax = u.mh | 0;
            /* C mhitu.c:2569-2570 — an over-fed mold splits. */
            if (u.mhmax > (game.youmonst.data.mlevel + 1) * 8)
                await split_mon(game.youmonst, mtmp);
            break;
        case AD_STUN_UM:   /* C:2576-2584 — yellow mold */
            if (!(mtmp.mstun | 0)) {
                mtmp.mstun = 1;
                pline_mon(mtmp, `${je_Monnam(mtmp)} ${makeplural(stagger(mtmp.data, 'stagger'))}.`);
            }
            tmp = 0;
            break;
        case AD_FIRE_UM:   /* C:2585-2594 — red mold */
            if (resists_fire_um(mtmp)) {
                shieldeff(mtmp.mx | 0, mtmp.my | 0);
                pline_mon(mtmp, `${je_Monnam(mtmp)} is mildly warm.`);
                golemeffects_um(mtmp, AD_FIRE_UM, tmp);
                tmp = 0;
                break;
            }
            pline_mon(mtmp, `${je_Monnam(mtmp)} is suddenly very hot!`);
            break;
        case AD_ELEC_UM:   /* C:2595-2604 */
            if (resists_elec_um(mtmp)) {
                shieldeff(mtmp.mx | 0, mtmp.my | 0);
                pline_mon(mtmp, `${je_Monnam(mtmp)} is slightly tingled.`);
                golemeffects_um(mtmp, AD_ELEC_UM, tmp);
                tmp = 0;
                break;
            }
            pline_mon(mtmp, `${je_Monnam(mtmp)} is jolted with your electricity!`);
            break;
        default:
            tmp = 0;
            break;
        }
    } else {
        tmp = 0;
    }

    return await assess_dmg_um(mtmp, tmp);
}

/* C monflag.h:99/:109 — the two mflags1 bits wildmiss() reads through
 * mondata.h:53 nolimbs(ptr) and mondata.h:81 perceives(ptr). */
const M1_NOLIMBS_MU = 0x00006000;
const M1_SEE_INVIS_MU = 0x01000000;
function nolimbs_mu(ptr) {
    return (((ptr?.mflags1 | 0) & M1_NOLIMBS_MU) === M1_NOLIMBS_MU);
}
function perceives_mu(ptr) {
    return (((ptr?.mflags1 | 0) & M1_SEE_INVIS_MU) !== 0);
}
/* C mondata.h:46 haseyes(ptr) = (ptr->mflags1 & M1_NOEYES) == 0 — passiveum's
 * AD_PLYS arm (mhitu.c:2539).  Neither of js/mhitm.js's two haseyes bodies is
 * exported, so this is the same local-macro-copy convention nolimbs_mu/
 * perceives_mu above already use in this file. */
const M1_NOEYES_MU = 0x00001000;
function haseyes_pu(ptr) {
    if (!ptr) return true;
    return (((ptr.mflags1 | 0) & M1_NOEYES_MU) === 0);
}
/* C youprop.h Invis / Displaced / Underwater, read the one way anything in js/
 * actually WRITES them (u.uprops[<numeric>]) — the same reader
 * js/monmove.js:2362 set_apparxy and js/mcastu.js:73 already use. */
function _Invis_mu() {
    const p = game.u?.uprops?.[INVIS];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
function _Displaced_mu() {
    const p = game.u?.uprops?.[DISPLACED_MU];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
function _Underwater_mu() {
    return !!(game.u?.uinwater);
}

async function wildmiss(mtmp, mattk) {
    /* C:180-182 — the expected reasons for wildmiss(). */
    const unotseen = (!(mtmp.mcansee | 0)
                      || (_Invis_mu() && !perceives_mu(mtmp.data)));
    const unotthere = _Displaced_mu();
    const usubmerged = _Underwater_mu();

    /* C:184-191 — report the impossible before the verbosity/visibility
     * early returns, including pline.c's visible diagnostic messages. */
    if (!unotseen && !unotthere && !usubmerged) {
        await impossible_mu(`${Some_Monnam_mu(mtmp)} attacks you without knowing your location?`);
        return;
    }

    /* C:195-196 — no feedback at all in a terse game. */
    if (!(game.flags?.verbose))
        return;
    /* C:198-199 — no feedback if the hero doesn't see the monster's spot. */
    if (!cansee_mu(mtmp.mx | 0, mtmp.my | 0))
        return;

    /* C:202-204 — maybe it's attacking an image around the corner? */
    const compat = ((mattk.adtyp === AD_SEDU_ || mattk.adtyp === AD_SSEX_)
                    ? could_seduce(mtmp, game.youmonst ?? game.u, mattk) : 0);
    const Monst_name = Monnam(mtmp);
    const Invis = _Invis_mu();

    if (unotseen) { /* C:207-235 */
        const swings = (mattk.aatyp === AT_BITE_) ? 'snaps'
                       : (mattk.aatyp === AT_KICK_) ? 'kicks'
                         : (mattk.aatyp === AT_STNG_
                            || mattk.aatyp === AT_BUTT_
                            || nolimbs_mu(mtmp.data)) ? 'lunges'
                           : 'swings';

        if (compat) {
            await pline_mon(mtmp, `${Monst_name} tries to touch you and misses!`);
        } else {
            switch (rn2(3)) {
            case 0:
                await pline_mon(mtmp, `${Monst_name} ${swings} wildly and misses!`);
                break;
            case 1:
                await pline_mon(mtmp, `${Monst_name} attacks a spot beside you.`);
                break;
            case 2:
                await pline_mon(mtmp, `${Monst_name} strikes at ${
                    is_waterwall_mu(mtmp.mux | 0, mtmp.muy | 0)
                        ? 'empty water' : 'thin air'}!`);
                break;
            default:
                await pline_mon(mtmp, `${Monst_name} ${swings} wildly!`);
                break;
            }
        }
    } else if (unotthere) { /* C:236-249 Displaced */
        /* give 'displaced' message even if hero is Blind */
        if (compat)
            await pline_mon(mtmp, `${Monst_name} smiles ${(compat === 2) ? 'engagingly' : 'seductively'
                  } at your ${Invis ? 'invisible ' : ''}displaced image...`);
        else
            /* Note:  if you're both invisible and displaced, only monsters
             * which see invisible will attack your displaced image, since the
             * displaced image is also invisible. */
            await pline_mon(mtmp, `${Monst_name} strikes at your ${Invis ? 'invisible ' : ''
                  }displaced image and misses you!`);
    } else if (usubmerged) { /* C:250-258 Underwater */
        /* monsters may miss especially on water level where bubbles shake
           the player here and there */
        if (compat)
            await pline_mon(mtmp, `${Monst_name} reaches towards your distorted image.`);
        else
            await pline_mon(mtmp, `${Monst_name} is fooled by water reflections and misses!`);
    }
    /* C:259-260 else: NOTREACHED (the impossible above already returned). */
}

/* C ref: mhitu.c:85 missmu — monster missed the hero. */
async function missmu_je(mtmp, nearmiss, mattk) {
    /* C ref: mhitu.c:88-89 — a miss clears the hitmsg "again" tracking so the
     * next hit does not spuriously say "again". */
    game._hitmsg_mid = 0;
    game._hitmsg_prev_ai = null;
    game._hitmsg_prev_ao = undefined;
    game._hitmsg_prev_aatyp = undefined;
    /* C ref: mhitu.c:90-91 — missmu marks the attacker's square the same way
     * hitmu does, and for the same reason: an unspottable monster that swings
     * at you still tells you where it is.  RNG-free. */
    if (!canspotmon_disp(mtmp))
        map_invisible(mtmp.mx | 0, mtmp.my | 0);
    const Monst_name = je_Monnam(mtmp);
    /* C mhitu.c:95-96 — the "just " qualifier needs BOTH a near miss and
     * flags.verbose; a !verbose game prints the plain "misses!" for a roll that
     * lands exactly on the to-hit threshold. */
    const nearmiss_verbose = nearmiss && (game.flags?.verbose ?? true);
    /* C mhitu.c:93-94 — a seductive attacker (nymph/incubus) that misses a
     * hero it could seduce "pretends to be friendly" instead. */
    if (could_seduce(mtmp, game.youmonst ?? game.u, mattk) && !mtmp.mcan)
        await pline_mon(mtmp, `${Monst_name} pretends to be friendly.`);   /* mhitu.c:94 */
    else
        await pline_mon(mtmp, `${Monst_name} ${nearmiss_verbose ? 'just ' : ''}misses!`);   /* mhitu.c:96 */
    if (_topline_more_pending() && _more_never_dismissed())
        await flush_pending_messages();
    /* C mhitu.c:99 — stop_occupation() (RNG-neutral); emits "You stop studying."
     * into the combat stream when a miss interrupts the study. */
    await stop_occupation();
}


const se_splat_egg = 122, se_dry_throat_rattle = 123, se_cough = 124,
      se_angry_snakes = 125, se_whang = 126, se_whap = 127,
      se_flapp = 128, se_clink = 129, se_clonk = 130;
function Soundeffect(_se, _vol) {}
import { distmin } from './hacklib.js';
import { breamu, spitmu, thrwmu } from './mthrowu.js'; // relocate-fns
export { breamu, drop_throw, m_throw, ohitmon, thrwmu } from './mthrowu.js'; // relocate-fns
export { Blind, Deaf, Deaf_mu, Hallucination, KILLED_BY, M2_ELF_MU, M2_GNOME_MU, MHU_NEED_RANGED_WEAPON, MHU_NEED_WEAPON, MON_WEP, OCLASS_TOOL_MHU, OCLASS_WEAPON_MHU, P_BOW_MHU, P_SPEAR_MHU, SILVER_MU, Soundeffect, Stone_resistance, Your1, _Underwater_mu, _hero_monst_mu, _hero_permonst_mu, _mf2, _uprop_on_mu, amorphous_mu, haseyes_pu, is_orc_mu, is_pole_mhu, is_vampshifter, m_seenres, maybe_half_phys_mu, mdistu, mhis, noncorporeal_mu, resists_acid_mu, s_suffix_mu, se_cough, se_dry_throat_rattle, se_splat_egg }; // relocate-fns








/* C hack.h:1236 Maybe_Half_Phys(dmg) — Half_physical_damage is an unported
 * hero property (js/dokick.js:176 says the same), so this is the identity. */
function _half_phys_prop_mu() {
    const p = game.u?.uprops?.[56 /* HALF_PHDAM */];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
function maybe_half_phys_mu(dmg) {
    return _half_phys_prop_mu() ? Math.trunc(((dmg | 0) + 1) / 2) : (dmg | 0);
}
/* C &gy.youmonst / gy.youmonst.data.  dmgval(otmp, mon) reads mon.data, so the
 * hero-as-monster record must carry it; game.youmonst is not always seeded
 * (js/cmd.js:5332 documents the same defaulting), so reconstruct from u.umonnum. */
function _hero_permonst_mu() {
    const ym = game.youmonst;
    if (ym && ym.data) return ym.data;
    return null;
}
function _hero_monst_mu() {
    const ym = game.youmonst;
    if (ym && ym.data) return ym;
    return { m_id: 1, data: null };
}



/* C monflag.h:126-133 M2_* — race and rank bits.  EVERY value in this block was
 * wrong, each by exactly the amount that made it alias a DIFFERENT live flag:
 *     was 0x400 M2_ELF    -> C 0x010   (0x400 is M2_LORD)
 *     was 0x800 M2_ORC    -> C 0x080   (0x800 is M2_PRINCE)
 *     was 0x200 M2_GNOME  -> C 0x040   (0x200 is M2_MERC)
 *     was 0x10000 M2_LORD -> C 0x400   (0x10000 is M2_MALE)
 *     was 0x20000 M2_PRINCE-> C 0x800  (0x20000 is M2_FEMALE)
 * so monmulti() below treated every always-male monster as a lord (+1 shot) and
 * every always-female one as a prince (+2), feeding a wrong bound to its
 * `multishot = rnd(multishot)`.  js/dokick.js:1204-1208 and js/m_initweap.js:35-40
 * already carry the C values; this copy was the odd one out.
 * (The value block, not the predicate bodies, is the whole bug — grepping for
 * "M2_ORC" found the right name sitting on the wrong number, which is why the
 * const-agreement checker is the tool that should have caught it.) */
const M2_ELF_MU = 0x00000010, M2_ORC_MU = 0x00000080, M2_GNOME_MU = 0x00000040;
function _mf2(ptr) { return (ptr && ptr.mflags2) | 0; }
function is_orc_mu(ptr) { return (_mf2(ptr) & M2_ORC_MU) !== 0; }

/* C mthrowu.c:1498 hits_bars() — classify whether an object collides with
 * iron bars.  This is the non-hero arm used by m_throw: `always_hit` is zero
 * on the pre-move check and is the caller's forcehit roll on later checks.
 * Small arrows, darts, spears, knives, and the listed tools pass through;
 * substantial objects stop at the bars.  The full hit_bars side effects are
 * display/object-break work, but the boolean decision is what controls the
 * flight path and its RNG alignment here. */
export function hits_bars_mu(obj, always_hit) {
    if (!obj) return false;
    if (always_hit) return true;
    const otyp = obj.otyp | 0;
    const oclass = obj.oclass | 0;
    const skill = MKOBJ_OC_SKILL[otyp] | 0;
    /* WEAPON_CLASS: C excludes bows, crossbows, darts, shuriken, spears,
     * knives; daggers are intentionally allowed to hit. */
    if (oclass === OCLASS_WEAPON_MHU)
        return skill !== -P_BOW_MHU && skill !== -P_CROSSBOW_MHU && skill !== -P_DART_MHU
            && skill !== -P_SHURIKEN_MHU && skill !== P_SPEAR_MHU && skill !== P_KNIFE_MHU;
    if (oclass === ARMOR_CLASS_MHU)
        return (ARMOR_DATA_MU[otyp]?.armcat | 0) !== ARM_GLOVES_MHU;
    if (oclass === OCLASS_TOOL_MHU)
        return otyp !== SKELETON_KEY_MHU && otyp !== LOCK_PICK_MHU
            && otyp !== CREDIT_CARD_MHU && otyp !== TALLOW_CANDLE_MHU
            && otyp !== WAX_CANDLE_MHU && otyp !== LENSES_MHU
            && otyp !== TIN_WHISTLE_MHU && otyp !== MAGIC_WHISTLE_MHU;
    /* C: mons[otmp->corpsenm].msize > MZ_TINY (0) — the size is the
     * MONSTER's, not a field on the object, so read it from the pack. */
    if (oclass === ROCK_CLASS_MHU)
        return otyp !== STATUE_MHU || _kb_msize(obj.corpsenm | 0) > MZ_TINY_MHU;
    if (oclass === FOOD_CLASS_MHU)
        return otyp === MEAT_STICK_MHU || otyp === ENORMOUS_MEATBALL_MHU
            || (otyp === CORPSE_MHU && _kb_msize(obj.corpsenm | 0) > MZ_TINY_MHU);
    return oclass === SPBOOK_CLASS_MHU || oclass === WAND_CLASS_MHU
        || oclass === BALL_CLASS_MHU || oclass === CHAIN_CLASS_MHU;
}

/* objects.h class and skill ordinals used by hits_bars(). */
const ARMOR_CLASS_MHU = 3, ROCK_CLASS_MHU = 14, FOOD_CLASS_MHU = 7,
      SPBOOK_CLASS_MHU = 10, WAND_CLASS_MHU = 11, BALL_CLASS_MHU = 15,
      CHAIN_CLASS_MHU = 16, ARM_GLOVES_MHU = 3,
      P_KNIFE_MHU = 2, P_SPEAR_MHU = 17,
      P_BOW_MHU = 20, P_CROSSBOW_MHU = 22, P_DART_MHU = 23, P_SHURIKEN_MHU = 24,
      MZ_TINY_MHU = 0;
const SKELETON_KEY_MHU = 221, LOCK_PICK_MHU = 222, CREDIT_CARD_MHU = 223,
      TALLOW_CANDLE_MHU = 224, WAX_CANDLE_MHU = 225, LENSES_MHU = 232,
      TIN_WHISTLE_MHU = 245, MAGIC_WHISTLE_MHU = 246, STATUE_MHU = 476,
      CORPSE_MHU = 265, MEAT_STICK_MHU = 268, ENORMOUS_MEATBALL_MHU = 269;
const BOULDER = 475, HEAVY_IRON_BALL = 477, POT_ACID = 320,
      SILVER = 14, GOLD = 15;

/* C ref: mthrowu.c:552 MT_FLIGHTCHECK(pre, forcehit) — has the missile run out
 * of map?  Evaluated at <bhitpos + d>, except the sink test which is at
 * <bhitpos> itself and only on the post-move pass. */
/* C ref: mthrowu.c:1417-1496 hit_bars(), non-hero arm (your_fault FALSE): the
 * missile either breaks on the bars (breaks() -> breaktest -> obj_resists
 * rn2(100)) or clangs against them.
 * Returns TRUE when the object is gone (C: *objp = 0). */
export async function hit_bars_mu(otmp, objx, objy, barsx, barsy) {
    const t = otmp.otyp | 0;
    const nodissolve = (game.level.at(barsx, barsy).wall_info & W_NONDIGGABLE) !== 0;
    if (await breaks_mu(otmp, objx, objy)) {
        if (t === POT_ACID) {
            if (cansee_mu(barsx, barsy) && !nodissolve)
                await pline('The iron bars are dissolved!');
            else {
                Soundeffect(se_angry_snakes, 100);
                await You_hear(Hallucination(game) ? 'angry snakes!' : 'a hissing noise.');
            }
            if (!nodissolve) await dissolve_bars(barsx, barsy);
        }
        return true;
    }
    const flimsy = (MKOBJ_OC_MATERIAL[t] | 0) <= 7 /* LEATHER */ || t === 78 /* RUBBER_HOSE */;
    const harmless = harmless_missile_mu(otmp);
    const mat = MKOBJ_OC_MATERIAL[t] | 0;
    if (!Deaf_mu()) {
        const sfx = ['', 'Whang', 'Whap', 'Flapp', 'Clink', 'Clonk'];
        const se = [0, se_whang, se_whap, se_flapp, se_clink, se_clonk];
        const idx = (t === BOULDER || t === HEAVY_IRON_BALL) ? 1 : harmless ? 2 : flimsy ? 3
            : ((otmp.oclass | 0) === 12 /* COIN_CLASS */ || mat === GOLD || mat === SILVER) ? 4 : 5;
        Soundeffect(se[idx], 100);
        await pline(`${sfx[idx]}!`);
    }
    if (!(harmless || flimsy))
        wake_nearto_mu(barsx, barsy, 4 * 4);
    return false;
}


export async function mt_flightcheck(bx, by, dx, dy, pre, forcehit = false, obj = null) {
    const nx = bx + dx, ny = by + dy;
    if (!isok_mu(nx, ny)) return true;
    const nloc = game.level?.at(nx, ny);
    if (nloc && IS_OBSTRUCTED_MU(nloc.typ | 0)) return true;
    if (closed_door_mu(nx, ny)) return true;
    if (nloc && (nloc.typ | 0) === IRONBARS_MU
        && hits_bars_mu(obj, !pre && !!forcehit)) {
        /* C mthrowu.c:1554 hits_bars(whodidit 0) -> hit_bars; the missile may
         * be destroyed ("hits_bars might have destroyed it", mthrowu.c:801). */
        if (obj && await hit_bars_mu(obj, bx, by, nx, ny))
            (game.gm || (game.gm = {}))._mt_obj_gone = true;
        return true;
    }
    if (!pre) {
        const cloc = game.level?.at(bx, by);
        if (cloc && (cloc.typ | 0) === SINK_MU) return true;
    }
    return false;
}


/* monst.h:158-160 is_vampshifter(mon) */
function is_vampshifter(mon) {
    const c = mon?.cham | 0;
    return c === PM_VAMPIRE || c === PM_VAMPIRE_LORD || c === PM_VLAD_THE_IMPALER;
}
/* objclass.h:27 SILVER = 14 (Ag).  NOT 10 — every constant in this block was
 * guessed once and every guess was wrong; they are now read off the 5.0 headers
 * one by one, per the S_LIGHT/S_BAT precedent. */
const SILVER_MU = 14;
/* mondata.h:30-31 */
function amorphous_mu(ptr) { return !!(ptr && ((ptr.mflags1 | 0) & M1_AMORPHOUS_MU)); }
function noncorporeal_mu(ptr) { return !!(ptr && (ptr.mlet | 0) === S_GHOST_MU); }
const M1_AMORPHOUS_MU = 0x00000004; /* monflag.h:87 (js/makemon.js:121 agrees) */
const S_GHOST_MU = 54;              /* defsym.h:358 MONSYM(54, ..., S_GHOST) */
/* mhitm.js has resists_acid only as a function nested inside another body, so
 * it cannot be imported; monst.h:276 Resists_Elem(mon, ACID_RES) = MR_ACID. */
function resists_acid_mu(mon) {
    const MR_ACID = 0x40; /* C monflag.h:68; 0x08 is MR_DISINT. */
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_ACID) !== 0;
}

/* C ref: pline.c:436-452 You_hear(fmt) — "You hear <x>", suppressed entirely
 * while Deaf (and !Unaware) or with acoustics off.  GAPs, both message-only and
 * neither reachable here: Underwater ("You barely hear ") and Unaware ("You
 * dream that you hear "). */
function You_hear_mu(text) {
    if (Deaf_mu())
        return;
    if (game.flags && game.flags.acoustics === false)
        return;
    pline(`You hear ${text}`);
}





/* Same reader as js/trap.js:2114 Blind_thitu — u.uprops[<numeric>] is the only
 * spelling anything writes (the string-keyed reads elsewhere are dead). */
function _uprop_on_mu(idx) {
    const p = game.u?.uprops?.[idx];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
function Blind_mu() { return _uprop_on_mu(BLINDED); }


/* C ref: mthrowu.c's impossible() — a local shim so the arms above read like
 * C without dragging new modules in.  s_suffix_mu was a SECOND copy of
 * hacklib.c's s_suffix in this one file (the first is at :369), and it carried
 * only two of C's four arms — it printed "Its" as "It's" and "You" as "You's".
 * It now forwards to the shared body. */
function s_suffix_mu(s) { return s_suffix(s); }
function impossible_mu(msg) { return impossible_breath(msg); }

function calc_mattacku_vars(mtmp) {
    const u = game.u || {};
    const mux = (mtmp.mux !== undefined ? mtmp.mux : (u.ux | 0)) | 0;
    const muy = (mtmp.muy !== undefined ? mtmp.muy : (u.uy | 0)) | 0;
    const mdistu = dist2((mtmp.mx | 0), (mtmp.my | 0), (u.ux | 0), (u.uy | 0));
    const ranged = mdistu > 3;
    const adx = Math.abs((mtmp.mx | 0) - mux), ady = Math.abs((mtmp.my | 0) - muy);
    /* C mon.c:2461 monnear: dist2 < 3, but a grid bug (NODIAG) never
     * counts a diagonal as near. */
    const mnd2 = adx * adx + ady * ady;
    const gridbug = ((mtmp.mnum ?? mtmp.mndx ?? mtmp.data?.pmidx) | 0) === PM_GRID_BUG;
    const range2 = !(mnd2 < 3 && !(mnd2 === 2 && gridbug)); /* !monnear(mux,muy) */
    const foundyou = (mux === (u.ux | 0) && muy === (u.uy | 0));
    /* C mhitu.c:458-462: do_attack() uses bhitpos to set/clear notonhead; do
     * likewise here -- a hero can't have a worm tail, so clear stale value.
     * Zap effects read game.bhitpos; both names represent C's gb.bhitpos. */
    game.bhitpos = (game.gb ||= {}).bhitpos = { x: u.ux | 0, y: u.uy | 0 };
    (game.gn ||= {}).notonhead = false;
    return { ranged, range2, foundyou, youseeit: canseemon_mu(mtmp) };
}

/* C mondata.h — mflags2 bit tests.  M2_WERE 0x00000004, M2_DEMON 0x00000100
 * (include/monflag.h:125,131); NON_PM is -1 (include/monsters.h). */
const M2_WERE_MU = 0x00000004, M2_DEMON_MU = 0x00000100, NON_PM_MU = -1;
function is_were_mu(ptr) { return ((ptr?.mflags2 | 0) & M2_WERE_MU) !== 0; }
function is_demon_mu(ptr) { return ((ptr?.mflags2 | 0) & M2_DEMON_MU) !== 0; }

/* C mhitu.c:955-1029 summonmu(mtmp, youseeit) — demon and were help. */
const M2_HUMAN_SUMMONMU = 0x00000008;
async function summonmu_mu(mtmp, youseeit = false) {
    const mdat = mtmp.data;
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const PM_BALROG_MU = 302, PM_AMOROUS_DEMON_MU = 290;

    if (is_demon_mu(mdat)) {
        if (mndx !== PM_BALROG_MU && mndx !== PM_AMOROUS_DEMON_MU) {
            if (!rn2(Inhell() ? 10 : 16))
                await msummon_real(mtmp);
        }
        return;
    }
    if (!is_were_real(mdat))
        return;

    if (((mdat.mflags2 | 0) & M2_HUMAN_SUMMONMU) !== 0) {
        if (!_ac_prot_from_shape_changers_u()
            && !rn2(5 - (night() * 2)))
            await new_were_real(mtmp);
    } else if (_ac_prot_from_shape_changers_u() || !rn2(30)) {
        await new_were_real(mtmp);
    }

    /* C:987-1012 — after the possible form change, one in ten weres summons
     * compatible critters.  were_summon supplies C's rnd(5) and selector
     * draws, and reports how many were visible. */
    if (!rn2(10)) {
        const visible = { value: 0 };
        const genericwere = { value: 'creature' };
        /* C:994-995 — the announcement precedes were_summon's makemon calls */
        if (youseeit)
            await pline_mon(mtmp, `${Monnam(mtmp)} summons help!`);
        const numhelp = await were_summon_real(mtmp.data, false, visible, genericwere);
        if (youseeit) {
            if (numhelp > 0) {
                if ((visible.value | 0) === 0)
                    await You_feel_mu('hemmed in.');
            } else {
                await pline('But none comes.');
            }
        } else {
            /* C:1003-1020 — unseen summoner: growl unless Deaf; then the help
             * that came is announced ("appears from nowhere" when Deaf), or
             * felt as "hemmed in" if none of it was visible. */
            let from_nowhere = '';
            if (!Deaf_mu()) {
                await pline(`Something ${makeplural(growl_sound(mtmp))}!`);
            } else {
                from_nowhere = ' from nowhere';
            }
            if (numhelp > 0) {
                if ((visible.value | 0) < 1) {
                    await You_feel_mu('hemmed in.');
                } else {
                    const buf = (visible.value | 0) === 1
                        ? `${an(genericwere.value)} appears`
                        : `${makeplural(genericwere.value)} appear`;
                    await pline(`${buf.charAt(0).toUpperCase()}${buf.slice(1)}${from_nowhere}!`);
                }
            } /* else no help came; but you didn't know it tried */
        }
    }
}

/* Helpers this engulf port needs from other modules.  Aliased on import in the
 * file's own idiom (mon_nam_uh / bot_mu / ...) so the local file-scope names
 * above are not shadowed. */
const A_CON_GU = 4; /* attrib.h A_CON (A_STR 0, A_INT 1, A_WIS 2, A_DEX 3, A_CON 4, A_CHA 5) */
const AT_ENGL_MU = 11;
const AD_DGST_GU = 26, AD_PHYS_GU = 0, AD_ACID_GU = 8, AD_BLND_GU = 11,
      AD_ELEC_GU = 6, AD_COLD_GU = 3, AD_FIRE_GU = 2, AD_DISE_GU = 33,
      AD_DREN_GU = 16, AD_WRAP_GU = 28;
/* C mondata.h:71-74 digests(ptr)/enfolds(ptr) — an AT_ENGL attack whose damage
 * type is AD_DGST / AD_WRAP.  Read off the same per-mndx attack table
 * mon_mattk_raw() serves, because `ptr` here is a permonst and this port's
 * permonst records carry no mattk[]. */
function _engl_dmgtype_gu(mndx, adtyp) {
    const attks = mon_mattk_raw(mndx);
    if (!attks) return false;
    for (const a of attks) {
        if (!a) continue;
        if (((a.aatyp ?? a[0]) | 0) === AT_ENGL_MU
            && ((a.adtyp ?? a[1]) | 0) === adtyp) return true;
    }
    return false;
}
export function digests_gu(mndx) { return _engl_dmgtype_gu(mndx, AD_DGST_GU); }
export function enfolds_gu(mndx) { return _engl_dmgtype_gu(mndx, AD_WRAP_GU); }
/* C mondata.h:57 is_whirly(ptr) — mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL].
 * monsym.h S_VORTEX is monster class 22; PM_AIR_ELEMENTAL is 154. */
const S_VORTEX_GU = 22, PM_AIR_ELEMENTAL_GU = 154;
function is_whirly_gu(mndx, data) {
    const mlet = (data && data.mlet != null) ? (data.mlet | 0) : -1;
    return mlet === S_VORTEX_GU || (mndx | 0) === PM_AIR_ELEMENTAL_GU;
}
/* C mondata.h:59-61 flaming(ptr) — fire vortex / flaming sphere / fire elemental
 * / salamander (pm.generated.js indices). */
const _FLAMING_MNDX_GU = new Set([111 /* fire vortex */, 30 /* flaming sphere */,
                                  155 /* fire elemental */, 329 /* salamander */]);
function flaming_gu(mndx) { return _FLAMING_MNDX_GU.has(mndx | 0); }
/* Hero property reader.  Same two-spelling problem js/display.js:_uprop
 * documents: some writers use u.uprops[<idx>], some a mirrored u.H<name>. */
function _uprop_on_gu(idx) {
    const p = game.u?.uprops?.[idx];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
const SLOW_DIGESTION_GU = 54; /* const.js SLOW_DIGESTION */
const PASSES_WALLS_GU = 53; /* const.js PASSES_WALLS */
const COLD_RES_GU = 2, FIRE_RES_GU = 1, SHOCK_RES_GU = 5, ACID_RES_GU = 7;
function Cold_resistance_gu() {
    return _uprop_on_gu(COLD_RES_GU);
}
function Fire_resistance_gu() {
    return _uprop_on_gu(FIRE_RES_GU);
}
function Shock_resistance_gu() {
    return _uprop_on_gu(SHOCK_RES_GU);
}
function Acid_resistance_gu() {
    return _uprop_on_gu(ACID_RES_GU);
}
/* C rm.h:534 remove_monster(x,y) clears svl.level.monsters[x][y].  This port
 * has no monster GRID (m_at walks fmon), so the removal has no state to
 * change — the same no-op js/worm.js, js/makemon.js and js/dogmove.js already
 * carry for it.  Kept as a named call so the C shape stays readable. */
function remove_monster_gu(_x, _y) { }
/* C ref: mhitm.c engulf_target(magr, mdef) — with mdef == &gy.youmonst.
 * js/dogmove.js's exported engulf_target is written for the MON-vs-MON case:
 * it recognises the hero only by identity with game.youmonst and then reads
 * `game.hero.ux`, a record nothing in js/ builds, so for the hero it falls
 * through to locations[0][0] (solid stone) and refuses every engulf.  This is
 * the same predicate against the hero's real square.
 *   if (mdef->data->msize >= MZ_HUGE
 *       || (magr->data->msize < mdef->data->msize && !is_whirly(magr->data)))
 *       return FALSE;
 *   if (mdef->mtrapped || magr->mtrapped) return FALSE;
 *   <terrain checks on both squares>
 * The two terrain tests are the "phasing in solid rock" guard; the hero and
 * the engulfer are on the same accessible square by the time AT_ENGL fires
 * (the attack is melee-range only), so they collapse to the hero's own tile. */
const MZ_HUGE_GU = 4;
function engulf_target_hero_mu(magr) {
    const u = game.u || {};
    const heroMndx = (u.umonnum ?? -1) | 0;
    const magrMndx = (magr?.mnum ?? magr?.mndx ?? -1) | 0;
    const msizeOf = (n) => (n >= 0 && n < MONS_MSIZE_MU.length) ? (MONS_MSIZE_MU[n] | 0) : 0;
    const defSize = msizeOf(heroMndx), agrSize = msizeOf(magrMndx);
    if (defSize >= MZ_HUGE_GU
        || (agrSize < defSize && !is_whirly_gu(magrMndx, magr?.data)))
        return false;
    /* mdef->mtrapped is youmonst.mtrapped, which the hero's own traps (u.utrap)
     * never set, so a web-trapped hero can still be engulfed (the engulf then
     * releases them, mhitu.c:1352). */
    if (magr?.mtrapped | 0)
        return false;
    /* mhitm.c:828-841 — the "phasing in solid rock" guard, for the hero's
     * square (mdef) and the engulfer's square (magr).  Passes_walls is the
     * hero property (set by polymon for a wall-walker); passes_walls(magr->data)
     * is M1_WALLWALK. */
    const M1_WALLWALK_GU = 0x00000008, TREE_GU = 13;
    const blocked = (x, y, ironbarsOk) => {
        const l = game.level?.at?.(x, y);
        return !!l && (IS_OBSTRUCTED_MU(l.typ | 0) || closed_door_mu(x, y)
                       || (l.typ | 0) === TREE_GU
                       || ((l.typ | 0) === IRONBARS_MU && !ironbarsOk));
    };
    if (!_uprop_on_gu(PASSES_WALLS_GU)
        && blocked(u.ux | 0, u.uy | 0, is_whirly_gu(magrMndx, magr?.data)))
        return false;
    if (!(((magr?.data?.mflags1 | 0) & M1_WALLWALK_GU) !== 0)
        && blocked(magr.mx | 0, magr.my | 0, is_whirly_gu(heroMndx, null)))
        return false;
    return true;
}

export async function expels_gu(mtmp, mndx, message) {
    /* Callers may pass a live monster number (`mnum`), while the attack table
     * and C's `struct permonst *` predicates are indexed by species. */
    /* C mhitu.c:265 — `mdat` is the caller's argument ("if mtmp is
     * polymorphed, mdat != mtmp->data"), so a numeric mndx wins. */
    const pmndx = (Number.isInteger(mndx) ? mndx : mtmp?.data?.pmidx) | 0;
    (game.disp ||= {}).botl = 1;
    if (message) {
        if (digests_gu(pmndx)) {
            You('get regurgitated!');                                    /* C mhitu.c:268 */
        } else if (enfolds_gu(pmndx)) {
            pline_mon(mtmp, `${Monnam(mtmp)} unfolds and you are released!`); /* C mhitu.c:270 */
        } else {
            const attks = mon_mattk_raw(pmndx) || [];
            const attk = attks.find((a) => a && ((a.aatyp ?? a[0]) | 0) === AT_ENGL_MU);
            if (!attk) {
                await impossible_mu('Swallower has no engulfing attack?');
            } else {
                let blast = '';
                /* C is_whirly(mdat): the mlet of the caller's mdat. */
                const _mdat = (pmndx >= 0 && pmndx < _KB_MONS.length)
                    ? { mlet: _KB_MONS[pmndx][0] | 0 } : mtmp.data;
                if (is_whirly_gu(pmndx, _mdat)) {
                    if (((attk.adtyp ?? attk[1]) | 0) === AD_ELEC_GU)
                        blast = ' in a shower of sparks';
                    else if (((attk.adtyp ?? attk[1]) | 0) === AD_COLD_GU)
                        blast = ' in a blast of frost';
                } else {
                    blast = ' with a squelch';
                }
                You(`get expelled from ${mon_nam(mtmp)}${blast}!`);      /* C mhitu.c:291 */
            }
        }
    }
    /* C: unstuck(mtmp) — ball&chain returned in unstuck(). */
    await unstuck_mu(mtmp, true);
    {
        const _joins = _topl_joins_snapshot_mu(game._resultMessage || '');
        const _line = _topl_merge_result_mu(game._resultMessage || '',
                                            game._pending_message || '', _joins);
        if (_line) {
            game._resultMessage = '';
            /* C's more() here (cls -> display_nhwindow(WIN_MESSAGE)) runs no
             * pline, so pline.c:266-272's `if (vision_full_recalc) vision_recalc(0)`
             * does not fire between unstuck()'s `vision_full_recalc = 1` and
             * docrt_flags' own vision_recalc(2).  This port pages by re-plining
             * an ESC-suppressed line (force_more), which would run that recalc
             * early and, hallucinating, draw display-RNG glyphs C never draws. */
            const _vfr = game.vision_full_recalc;
            game.vision_full_recalc = 0;
            await force_more_pages_mu(_line);
            game.vision_full_recalc = _vfr;
            /* Those pages were frozen by movemon's overflow log; this docrt()
             * repaints the map, so the next overflowing pline logs its own. */
            _movemon_page_frames_reset_mu();
            /* This more() comes from cls()'s display_nhwindow(WIN_MESSAGE) (a
             * flush), not from update_topl, so topl.c:232-235's WIN_STOP is live
             * for the very next pline -- there is no incoming owner message that
             * "skip" was sampled for.  force_more() only ARMS the bit (the
             * update_topl shape); promote it so "The trapper hits!" after an
             * ESC'd "You get released!--More--" stays hidden. */
            if (game._topl_win_stop_armed) {
                game._topl_win_stop_armed = false;
                game._topl_win_stop = true;
            }
        }
    }
    /* C mon.c:3478-3480 — still inside unstuck(): `gv.vision_full_recalc = 1;
     * docrt();`.  The whole level was cls()'d by swallowed(1), and this is the
     * repaint that puts it back; it runs BEFORE expels' mnexto, as in C. */
    await docrt_flags_mu(0);
    /* C mon.c:3462-3465: holder/engulfer cooldown roll follows docrt() */
    const hold = dmgtype(mtmp.data, AD_STCK_)
        || attacktype_mu(mtmp.data, AT_ENGL_)
        || attacktype_mu(mtmp.data, AT_HUGS_);
    if (!(mtmp.mspec_used | 0) && hold)
        mtmp.mspec_used = rnd(2);
    await mnexto_mu(mtmp, RLOC_NOMSG_MU);
    newsym(game.u.ux | 0, game.u.uy | 0);
    /* C mhitu.c:302-304 — "to cover for a case where mtmp is not in a next
     * square".  um_dist(x, y, n) is hack.c's `distu(x,y) > n*n` test. */
    if (um_dist_mu(mtmp.mx | 0, mtmp.my | 0, 1))
        pline('Brrooaa...  You land hard at some distance.');
    /* C mhitu.c:305 — landing effects can trigger traps or another death. */
    await spoteffects(true);
}

/* C youprop.h:92 `#define Blinded (HBlinded && !BBlinded)` — NOT the same
 * question as Blind() twelve lines up, which also counts EBlinded (a blindfold)
 * and is what gulpmu's outer test asks.  Reads the one live spelling of the
 * property triple, the same u.uprops[BLINDED] object js/zap.js make_blinded and
 * js/allmain.js nh_timeout_blinded write. */
function Blinded_gu() {
    const p = game.u?.uprops?.[BLINDED];
    return !!p && !!(p.intrinsic | 0) && !(p.blocked | 0);
}
/* C mhitu.c:1031-1042 diseasemu().  Disease engulfing attacks schedule
 * non-vomitable sickness; resistance suppresses the attack's damage. */
async function diseasemu_gu(mdat) {
    const u = game.u || (game.u = {});
    const sickRes = u.uprops?.[SICK_RES_MU];
    /* C youprop.h:69 Sick_resistance: intrinsic || extrinsic || defended(&youmonst, AD_DISE) */
    if ((sickRes?.intrinsic | 0) || (sickRes?.extrinsic | 0)
        || defended_mu(game.youmonst, AD_DISE_MK)) {
        await You_feel_mu('a slight illness.');
        return false;
    }
    const sick = u.uprops?.[17]; /* SICK, prop.h (const.js:2364); [11] was another property */
    const current = sick?.intrinsic | 0;
    const duration = current ? Math.trunc(current / 3) + 1
                             : rn1(Math.max(1, acurr_mu(A_CON_GU)), 20);
    const mndx = (mdat?.pmidx ?? mdat?.mnum ?? 0) | 0;
    await make_sick(duration, monPmname_mu(mndx, 2 /* NEUTRAL */), true,
                    SICK_NONVOMITABLE_MU);
    return true;
}
/* C mhitu.c:1271-1285: reapply engulfing blindness after sight is restored. */
export async function gulp_blnd_check() {
    const u = game.u, m = u.ustuck;
    const a = !Blinded_gu() && u.uswallow && attacktype_fordmg(m.data, AT_ENGL_, AD_BLND_GU);
    if (!a || !can_blnd_mu(m, game.youmonst, a.aatyp, null)) return false;
    ++u.uswldtim;
    await gulpmu(m, a);
    return true;
}
async function gulpmu(mtmp, mattk) {
    const u = game.u || (game.u = {});
    const mndx = (mtmp.mnum ?? mtmp.mndx ?? -1) | 0;
    /* C mhitu.c:1292 — evaluated at declaration, BEFORE the !u.uswallow test. */
    let tmp = d((mattk.damn | 0), (mattk.damd | 0));
    let physical_damage = false;

    if (!(u.uswallow | 0)) { /* swallows you */
        const omx = mtmp.mx | 0, omy = mtmp.my | 0;

        if (!engulf_target_hero_mu(mtmp))
            return M_ATTK_MISS;
        /* C: (t && is_pit(t->ttyp)) && sobj_at(BOULDER, u.ux, u.uy) — a hero in
         * a pit under a boulder cannot be engulfed.  Both halves are RNG-free. */
        const t = t_at_mu(u.ux, u.uy);
        if (t && is_pit_mu(t.ttyp) && _kb_boulder_at(u.ux, u.uy))
            return M_ATTK_MISS;
        if (failed_grab_mu(mtmp, _hero_monst_mu(), mattk))
            return M_ATTK_MISS;

        if (u.uball) /* C mhitu.c:1309 Punished */
            unplacebc_mu(); /* ball&chain go away */
        remove_monster_gu(omx, omy);
        mtmp.mtrapped = 0; /* no longer on old trap */
        place_monster_mu(mtmp, u.ux | 0, u.uy | 0);
        set_ustuck_mu(mtmp);
        newsym(mtmp.mx | 0, mtmp.my | 0);
        /* C mhitu.c:1316-1346 — 5.0: dismount for all engulfers. */
        if (u.usteed) {
            const buf = mon_nam(u.usteed);
            await urgent_pline(`${Some_Monnam_mu(mtmp)} ${is_animal_mu(mtmp.data) ? 'lunges'
                : is_whirly_gu(mndx, mtmp.data) ? 'whirls'
                : ((mtmp.data.mflags1 | 0) & M1_UNSOLID_) ? 'flows'
                : amorphous_mu(mtmp.data) ? 'oozes' : 'surges'} forward and plucks you off ${buf}!`);
            await dismount_steed_mu(DISMOUNT_ENGULFED);
        } else {
            await urgent_pline(`${Monnam(mtmp)} ${digests_gu(mndx) ? 'swallows you whole'
                          : enfolds_gu(mndx) ? 'folds itself around you'
                            : 'engulfs you'}!`);
        }
        await stop_occupation();
        /* C: reset_occupations() — "behave as if you had moved". */
        reset_occupations();
        if (u.utrap | 0) { /* C mhitu.c:1352-1355 */
            pline(`You are released from the ${((u.utraptype | 0) === 3 /* const.js TT_WEB */) ? 'web' : 'trap'}!`);
            await reset_utrap_mu(false);
        }

        /* C mhitu.c:1357-1363 — a leashed pet's leash snaps; unleash_all()
         * (apply.c:746) clears every leash's leashmon and every mleashed. */
        {
            const nleashed = number_leashed_mu();
            if (nleashed > 0) {
                const s = nleashed > 1 ? 'leashes' : 'leash';
                await pline(`The ${s} ${nleashed > 1 ? 'snap' : 'snaps'} loose.`);
                for (let o = game.invent; o; o = o.nobj)
                    if ((o.otyp | 0) === 236 /* LEASH */) o.leashmon = 0;
                for (let m = game.fmon; m; m = m.nmon)
                    m.mleashed = 0;
            }
        }

        if (touch_petrifies_mk(_hero_form_mndx_mu()) && !resists_ston_mu(mtmp)) {
            remove_monster_gu(mtmp.mx, mtmp.my);
            place_monster_mu(mtmp, omx, omy);
            await minstapetrify_mu(mtmp, true);
            if (u.uball) await placebc_mu();
            set_ustuck_mu(null);
            return mtmp.mhp > 0 ? M_ATTK_MISS : M_ATTK_AGR_DIED;
        }
        /* C mhitu.c:1370 display_nhwindow(WIN_MESSAGE, FALSE) — an
         * unconditional page-ack of the engulf message, so C shows "The <foo>
         * engulfs you!--More--" on a topline of its own and the next turn's
         * damage message starts fresh.  See js/display.js
         * topl_force_break_after for why this is registered by text. */
        topl_force_break_now_mu(true, capture_flushed_cells_mu(), game._lastPaintedBotl || null); /* tty more() does not bot(): reset_utrap above must not show Lev yet */
        /* C mhitu.c:1371 vision_recalc(2) — "hero can't see anything".  It is
         * the reason a swallowed hero's pet stops apporting: dog_goal's
         * `in_masters_sight = couldsee(omx, omy)` goes false, and with it the
         * `edog->apport > rn2(8)` draw at dogmove.c:554. */
        vision_recalc_mu(2);
        u.uswallow = 1;
        /* C mhitu.c:1381-1394 — "for digestion, shorter time is more dangerous;
         * for other swallowings, longer time means more chances for the
         * swallower to attack". */
        let tim_tmp;
        if ((mattk.adtyp | 0) === AD_DGST_GU) {
            tim_tmp = (acurr_mu(A_CON_GU) | 0) + 10 - (u.uac | 0) + rn2(20);
            if (tim_tmp < 0) tim_tmp = 0;
            tim_tmp = Math.trunc(tim_tmp / (mtmp.m_lev | 0 || 1));
            tim_tmp += 3;
        } else {
            /* higher level attacker takes longer to eject hero */
            tim_tmp = rnd((mtmp.m_lev | 0) + 5 /* 10/2, C integer division */);
        }
        /* C: u.uswldtim always set > 1 */
        u.uswldtim = (tim_tmp < 2) ? 2 : tim_tmp;
        swallowed_mu(1); /* update the map display, shows hero swallowed */
        /* display.c:2060-2072: stomach descriptions finish before damage. */
        if (game._mentionMapPending) await game._mentionMapPending;
        /* C mhitu.c:1396-1401 — a non-flaming engulfer snuffs every lit light. */
        if (!flaming_gu(mndx)) {
            let nextobj;
            for (let o = game.invent; o; o = nextobj) {
                nextobj = o.nobj;
                await snuff_lit_mu(o);
            }
        }
    }

    if (mtmp !== u.ustuck)
        return M_ATTK_MISS;
    if (u.uball)
        for (const o of [u.uchain, u.uball])
            if (o && o.where === 0 /* OBJ_FREE */)
                o.ox = mtmp.mx, o.oy = mtmp.my;
    if ((u.uswldtim | 0) > 0)
        u.uswldtim = (u.uswldtim | 0) - 1;

    switch (mattk.adtyp | 0) {
    case AD_DGST_GU:
        physical_damage = true;
        if (_uprop_on_gu(SLOW_DIGESTION_GU)) { /* mhitu.c:1424 */
            /* Messages are handled below */
            u.uswldtim = 0;
            tmp = 0;
        } else if ((u.uswldtim | 0) === 0) {
            await pline(`${Monnam(mtmp)} totally digests you!`);
            tmp = u.uhp | 0;
            if (_half_phys_prop_mu())
                tmp *= 2; /* C mhitu.c:1429: sorry */
        } else {
            /* C mhitu.c:1431: finish the pline (including pending
             * show_glyph announcements) before applying digestion damage. */
            await pline(`${Monnam(mtmp)}${(u.uswldtim | 0) === 2 ? ' thoroughly'
                   : (u.uswldtim | 0) === 1 ? ' utterly' : ''} digests you!`);
            /* mhitu.c:1432 — a nonfatal digestion exercises Strength. */
            exercise(A_STR_AD, false);
        }
        break;
    case AD_PHYS_GU:
        physical_damage = true;
        if ((mndx | 0) === 106 /* PM_FOG_CLOUD */) {
            /* mhitu.c:1438-1448 */
            const ymf1 = (game.youmonst?.data?.mflags1 | 0);
            const M1_AMPH = 0x00000200, M1_BRTHLS = 0x00000400;
            const youFlaming = flaming_gu((game.u?.umonnum ?? -1) | 0);
            const breathless = _Breathless_wrap();
            const amphibious = (ymf1 & (M1_AMPH | M1_BRTHLS)) !== 0;
            pline(`You are laden with moisture and ${youFlaming
                    ? 'are smoldering out!'
                    : breathless ? 'find it mildly uncomfortable.'
                    : amphibious ? 'feel comforted.'
                    : 'can barely breathe!'}`);
            if ((_Amphibious_wrap() || breathless) && !youFlaming)
                tmp = 0;
        } else {
            pline(`You are ${enfolds_gu(mndx) ? 'being squashed'
                    : 'pummeled with debris'}!`);
            /* mhitu.c:1452 — ordinary physical engulfing exercises Strength. */
            exercise(A_STR_AD, false);
        }
        break;
    case AD_ACID_GU:
        if (Acid_resistance_gu()) {
            pline('You are covered with a seemingly harmless goo.');
            monstseesu(M_SEEN_ACID);
            tmp = 0;
        } else {
            /* mhitu.c:1463-1466 */
            if (Hallucination(game))
                pline("Ouch!  You've been slimed!");
            else
                pline('You are covered in slime!  It burns!');
            /* mhitu.c:1462 — acid damage exercises Strength when unresisted. */
            exercise(A_STR_AD, false);
            monstunseesu(M_SEEN_ACID);
        }
        break;
    case AD_ELEC_GU:
        if (!(mtmp.mcan | 0) && rn2(2)) {
            pline('The air around you crackles with electricity.');
            if (Shock_resistance_gu()) {
                shieldeff(u.ux | 0, u.uy | 0);
                pline('You seem unhurt.');
                monstseesu(M_SEEN_ELEC);
                ugolemeffects(AD_ELEC_GU, tmp);
                tmp = 0;
            } else {
                monstunseesu(M_SEEN_ELEC);
            }
        } else
            tmp = 0;
        break;
    case AD_COLD_GU:
        if (!(mtmp.mcan | 0) && rn2(2)) {
            if (Cold_resistance_gu()) {
                shieldeff(u.ux | 0, u.uy | 0);
                await You_feel_mu('mildly chilly.');
                monstseesu(M_SEEN_COLD);
                ugolemeffects(AD_COLD_GU, tmp);
                tmp = 0;
            } else {
                pline('You are freezing to death!');
                monstunseesu(M_SEEN_COLD);
            }
        } else
            tmp = 0;
        break;
    case AD_FIRE_GU:
        if (!(mtmp.mcan | 0) && rn2(2)) {
            if (Fire_resistance_gu()) {
                shieldeff(u.ux | 0, u.uy | 0);
                await You_feel_mu('mildly hot.');
                monstseesu(M_SEEN_FIRE);
                ugolemeffects(AD_FIRE_GU, tmp);
                tmp = 0;
            } else {
                pline('You are burning to a crisp!');
                monstunseesu(M_SEEN_FIRE);
            }
            await burn_away_slime();
        } else
            tmp = 0;
        break;
    case AD_DREN_GU:
        /* C: AC magic cancellation doesn't help when engulfed */
        if (!(mtmp.mcan | 0) && rn2(4)) /* 75% chance */
            await drain_en_trap(tmp, false); /* trap.c:5182 drain_en(tmp, FALSE) */
        tmp = 0;
        break;
    case AD_BLND_GU:
        if (can_blnd_mu(mtmp, game.youmonst || {}, mattk.aatyp | 0, null)) {
            if (!Blind(game)) {
                const was_blinded = Blinded_gu();
                if (!was_blinded)
                    pline("You can't see in here!");
                make_blinded(tmp, false);
                if (!was_blinded && !Blind(game))
                    Your1('vision quickly clears.'); /* => Eyes of the Overworld */
            } else {
                /* C: "keep him blind until disgorged" */
                incr_HBlinded_mu(1);
            }
        }
        tmp = 0;
        break;
    case AD_DISE_GU:
        /* C: diseasemu(mtmp->data); resistance returns FALSE and suppresses
         * the engulfing damage, while an unresisted attack schedules sickness.
         * The helper owns the one rn1(CON,20) draw and make_sick side effects. */
        if (!(await diseasemu_gu(mtmp.data)))
            tmp = 0;
        break;
    default:
        physical_damage = true;
        tmp = 0;
        break;
    }

    if (physical_damage) {
        /* C mhitu.c:1548-1554 — same damage reduction for AC as in hitmu. */
        if ((u.uac | 0) < 0)
            tmp -= rnd(-(u.uac | 0));
        if (tmp < 0)
            tmp = 1;
        tmp = maybe_half_phys_mu(tmp);
    }

    (game.gm ||= {}).mswallower = mtmp;
    const _deathBefore = game._pendingDeath || null;
    await mdamageu(mtmp, tmp);
    game.gm.mswallower = 0;
    /* C: mdamageu -> done_in_by -> done() never returns for a final death, so
     * nothing below (regurgitation message, expels) is reached.  This port
     * defers the death, so stop here.  A declined death (wizard/lifesaved)
     * is not final, but C's done() ran expels(TRUE) itself (end.c:748) and
     * then gulpmu sees !u.uswallow; do_death_sequence performs that expels
     * (js/end.js:621), so gulpmu must not also print/expel. */
    if (game._pendingDeath && game._pendingDeath !== _deathBefore) {
        /* done() runs IN PLACE here (mhitu.c:1536 mdamageu -> done_in_by):
         * "You die..." is paged while the hero is still swallowed, and a
         * lifesaved/declined death expels (end.c:748) before gulpmu resumes. */
        await drain_pending_death_in_place();
        if (pending_death_is_final())
            return M_ATTK_HIT;
    }
    if (tmp)
        await stop_occupation();

    if (!(u.uswallow | 0)) {
        ; /* life-saving has already expelled swallowed hero */
    } else if (touch_petrifies_mk(_hero_form_mndx_mu()) && !resists_ston_mu(mtmp)) {
        await pline(`${Monnam(mtmp)} very hurriedly ${digests_gu(mndx) ? 'regurgitates'
            : enfolds_gu(mndx) ? 'releases' : 'expels'} you!`);
        await expels_gu(mtmp, mndx, false);
    } else if (!(u.uswldtim | 0)
               || (MONS_MSIZE_MU[(u.umonnum ?? -1) | 0] | 0) >= MZ_HUGE_GU) {
        pline(`You get ${digests_gu(mndx) ? 'regurgitated'
                : enfolds_gu(mndx) ? 'released' : 'expelled'}!`);
        if (game.flags?.verbose && digests_gu(mndx) && _uprop_on_gu(SLOW_DIGESTION_GU))
            pline(`Obviously ${mon_nam_uh(mtmp)} doesn't like your taste.`);
        await expels_gu(mtmp, mndx, false);
    }
    return M_ATTK_HIT;
}

/* monattk.h values not already spelled in this file. */
const AD_DREN_MK = 16;  /* monattk.h:58 */
const AD_ACID_MK = 8;   /* monattk.h:50 */
const AD_COLD_MK = 3;   /* monattk.h:45 */
const AD_DISE_MK = 33;  /* monattk.h:75 */
const AD_PEST_MK = 38;  /* monattk.h:80 */
const AD_FAMN_MK = 39;  /* monattk.h:81 */
const AD_POLY_MK = 43;  /* monattk.h:85 */
const COLD_RES_MK = 2;          /* prop.h COLD_RES (js/const.js:2313) */
const CORPSE_MK = 265;          /* objects.h ordinal, as js/dig.js:509 */
const PM_COCKATRICE_MK = 10, PM_CHICKATRICE_MK = 9;  /* js/pm.generated.js */
const ART_STORMBRINGER_MK = 2, ART_VORPAL_BLADE_MK = 18;
/* artilist.h ordinals: counted off nethack-c-v5/upstream/include/artilist.h's
 * A("...") rows (0 = the empty row).  Cross-checks against the one artifact
 * ordinal already in this tree: Snickersnee is 19, which is what
 * js/uhitm.js:3752 SR_ART_SNICKERSNEE says. */
const PM_SHADE_MK = 288;        /* js/pm.generated.js:291 */

/* C youprop.h:32 Cold_resistance == (HCold_resistance || ECold_resistance).
 * set_uasmon() PROPSETs COLD_RES |= FROM_FORM for a cold-resistant polyform
 * (js/polyself.js:255), so this covers the polymorphed hero too. */
function Cold_resistance_mk() {
    const p = game.u?.uprops?.[COLD_RES_MK];
    return !!(p && (((p.intrinsic | 0) !== 0) || ((p.extrinsic | 0) !== 0)));
}
/* C mondata.h touch_petrifies(ptr) — cockatrice or chickatrice.  Mirrors the
 * file-local sr_touch_petrifies at js/uhitm.js:3794. */
function touch_petrifies_mk(corpsenm) {
    return (corpsenm | 0) === PM_COCKATRICE_MK || (corpsenm | 0) === PM_CHICKATRICE_MK;
}
/* C artifact.h is_art(otmp, art). */
function is_art_mk(otmp, art) {
    return !!otmp && (otmp.oartifact | 0) === (art | 0);
}

/**
 * C mhitu.c:310-317.  Returns the attack for slot `indx`, including NO_ATTK.
 *
 * @param magr        attacking monster
 * @param udefend     true when the defender is the hero (C: mdef == &youmonst)
 * @param mdef        defending monster when !udefend, else null
 * @param indx        attack slot
 * @param prev_result the caller's sum[]/res[] array of earlier slots' results
 */
export function getmattk(magr, udefend, mdef, indx, prev_result) {
    const mndx = (magr.mndx ?? magr.mnum ?? magr.data?.pmidx ?? -1) | 0;
    const raw = mon_mattk_raw(mndx)
        || magr.data?.mattk?.map(a => [a.aatyp, a.adtyp, a.damn, a.damd]);
    const a = raw?.[indx] || [AT_NONE_, AD_PHYS_, 0, 0];
    const attk = { aatyp: a[0] | 0, adtyp: a[1] | 0, damn: a[2] | 0, damd: a[3] | 0 };
    /* C:317 `struct obj *weap = (magr == &youmonst) ? uwep : MON_WEP(magr);` */
    const magr_is_hero = is_youmonst_mu(magr);
    const weap = magr_is_hero ? (game.u?.uwep ?? null) : MON_WEP(magr);
    /* C's `attk != alt_attk_buf`. */
    let substituted = false;
    /* C's fixed permonst.mattk[NATTK]: slots past the end of the trimmed js row
     * are the implicit {AT_NONE, AD_PHYS, 0, 0}, so an absent adtyp reads 0. */
    const raw_adtyp = (k) => ((raw && raw[k]) ? (raw[k][1] | 0) : 0);
    const raw_aatyp = (k) => ((raw && raw[k]) ? (raw[k][0] | 0) : 0);

    /* C mhitu.c:320-334; monsters.h:2925-2927 c_sa_no, including NO_ATTKs. */
    if (!(game.sysopt?.seduce ?? true)) {
        if (raw_adtyp(0) === AD_SSEX) {
            const a = [[AT_CLAW_, AD_PHYS_, 1, 3], [AT_CLAW_, AD_PHYS_, 1, 3], [AT_BITE_, AD_DRLI_MU, 2, 6]][indx] || [AT_NONE_, AD_PHYS_, 0, 0];
            Object.assign(attk, { aatyp: a[0], adtyp: a[1], damn: a[2], damd: a[3] });
            substituted = true;
        } else if (attk.adtyp === AD_SSEX) {
            attk.adtyp = AD_DRLI_MU;
            substituted = true;
        }
    }

    if (indx > 0 && (prev_result?.[indx - 1] | 0) > M_ATTK_MISS
        && (attk.adtyp === AD_DISE_MK || attk.adtyp === AD_PEST_MK
            || attk.adtyp === AD_FAMN_MK)
        && attk.adtyp === raw_adtyp(indx - 1)) {
        /* C:336-344 — "prevent a monster with two consecutive disease or
         * hunger attacks from hitting with both of them on the same turn". */
        substituted = true;
        attk.adtyp = AD_STUN;

    } else if (attk.adtyp === AD_DREN_MK && udefend) {
        /* C:346-366 — "make drain-energy damage be somewhat in proportion to
         * energy".  Base is 2d6. */
        const u = game.u || {};
        const ulev = Math.max(u.ulevel | 0, 6);

        substituted = true;
        if ((u.uen | 0) <= 5 * ulev && attk.damn > 1) {
            attk.damn -= 1;                     /* low energy: 2d6 -> 1d6 */
            if ((u.uenmax | 0) <= 2 * ulev && attk.damd > 3)
                attk.damd -= 3;                 /* very low: 1d6 -> 1d3 */
        } else if ((u.uen | 0) > 12 * ulev) {
            attk.damn += 1;                     /* high energy: 2d6 -> 3d6 */
            if ((u.uenmax | 0) > 20 * ulev)
                attk.damd += 3;                 /* very high: 3d6 -> 3d9 */
        }

    } else if ((magr.mspec_used | 0)
               && (attk.aatyp === AT_ENGL_ || attk.aatyp === AT_HUGS_
                   || attk.adtyp === AD_STCK_ || attk.adtyp === AD_POLY_MK)) {
        /* C:368-390 — a holder/engulfer that has released the hero can't
         * re-hold or re-engulf until mspec_used counts back down; it switches
         * to a simpler attack instead. */
        const wimpy = (attk.damd === 0);   /* lichen, violet fungus */

        substituted = true;
        if (attk.adtyp === AD_ACID_MK || attk.adtyp === AD_ELEC_
            || attk.adtyp === AD_COLD_MK || attk.adtyp === AD_FIRE) {
            attk.aatyp = AT_TUCH_;
        } else {
            attk.aatyp = AT_CLAW_;   /* attack message will be "<foo> hits" */
            attk.adtyp = AD_PHYS_;
        }
        attk.damn = 1;               /* relatively weak: 1d6 */
        attk.damd = 6;
        if (wimpy && attk.aatyp === AT_CLAW_) {
            attk.aatyp = AT_TUCH_;
            attk.damn = attk.damd = 0;
        }

    } else if (indx === 0 && !magr_is_hero
               && attk.aatyp === AT_WEAP_ && attk.adtyp !== AD_PHYS_
               && !(raw_aatyp(1) === AT_WEAP_ && raw_adtyp(1) === AD_PHYS_)
               && ((magr.mcan | 0)
                   || (weap && (((weap.otyp | 0) === CORPSE_MK
                                 && touch_petrifies_mk(weap.corpsenm))
                                || is_art_mk(weap, ART_STORMBRINGER_MK)
                                || is_art_mk(weap, ART_VORPAL_BLADE_MK))))) {
        /* C:392-411 — barrow wight, Nazgul, erinys: force physical damage when
         * the attacker is cancelled or its weapon is sufficiently interesting. */
        substituted = true;
        attk.adtyp = AD_PHYS_;

    } else if (indx === 0 && attk.aatyp === AT_TUCH_ && attk.adtyp === AD_COLD_MK
               && (udefend ? Cold_resistance_mk() : _resists_cold_um(mdef))
               /* C:421 don't substitute if target is immune to normal damage */
               && (udefend ? _hero_form_mndx_mu() !== PM_SHADE_MK
                           : (((mdef?.mndx ?? mdef?.mnum ?? -1) | 0) !== PM_SHADE_MK))) {
        /* C:413-433 — "liches have a touch attack for cold damage and also a
         * spell attack; they won't use the spell for monster vs monster so
         * become impotent against cold resistant foes; change the touch damage
         * from cold to physical if target will resist".  C's own table of the
         * damage it lessens to:
         *        before  after
         * lich:    1d10  1d6
         * demi:    3d4   2d4
         * master:  3d6   2d6
         * arch-:   5d6   3d6 */
        substituted = true;
        attk.adtyp = AD_PHYS_;
        attk.damn = ((attk.damn + 1) / 2) | 0;
        if (attk.damd === 10)
            attk.damd = 6;
    }

    /* C:436-441 — elementals on their home plane do double damage.  The guard
     * is C's `attk != alt_attk_buf`: an attack one of the arms above already
     * substituted is NOT doubled. */
    if (!substituted && mndx >= 0 && is_home_elemental({ pmidx: mndx })) {
        substituted = true;
        attk.damn *= 2;
    }

    /* C hands back &alt_attk_buf for a substituted attack, never a pointer
     * into mptr->mattk[], so hitmsg()'s `mattk == hitmsg_prev + 1` can't hold
     * for it (nor for the attack after it): mattacku leaves _ai unstamped. */
    if (substituted)
        attk._alt = true;
    return attk;
}

/* C ref: nethack-c-v5/upstream/src/mhitu.c:1589-1665 explmu(mtmp, mattk, ufound)
 * — "monster explodes in your face".  Reached from mattacku's AT_EXPL arm; the
 * five AT_EXPL rows in monsters.h are the freezing/flaming/shocking spheres
 * (AD_COLD/AD_FIRE/AD_ELEC 4d6), the yellow light (AD_BLND 10d20) and the
 * black light (AD_HALU 10d12).
 *
 * RNG: the unconditional d(damn,damd) at C:1603, plus one rnd(tmp/2) in the
 * AD_BLND arm when the light is NOT visible.  Nothing else here draws
 * (mon_explodes has its own draws and is C's own callee). */
async function explmu(mtmp, mattk, ufound) {
    const gs = game;
    const u = gs.u || {};
    let kill_agr = true;
    let not_affected;
    let tmp;

    if (mtmp.mcan)                                        /* C:1600-1601 */
        return M_ATTK_MISS;

    tmp = d(mattk.damn | 0, mattk.damd | 0);              /* C:1603 */
    not_affected = defended_mu(mtmp, mattk.adtyp | 0);      /* C:1604 */

    if (!ufound) {                                        /* C:1606-1611 */
        await pline(`${canseemon_mu(mtmp) ? Monnam(mtmp) : 'It'} explodes at a`
            + ` spot in ${is_waterwall_mu(mtmp.mux | 0, mtmp.muy | 0)
                ? 'empty water' : 'thin air'}!`);
    } else {
        await hitmsg(mtmp, mattk);                        /* C:1613 */
    }

    switch (mattk.adtyp | 0) {
    case AD_COLD_MU:
    case AD_FIRE:
    case AD_ELEC_MU:
        /* C:1619-1622 */
        await mon_explodes_mu(mtmp, mattk);
        if (!DEADMONSTER(mtmp))
            kill_agr = false; /* lifesaving? */
        break;
    case AD_BLND:
        /* C:1624-1637 */
        not_affected = resists_blnd(gs.youmonst);
        if (ufound && !not_affected) {
            /* C:1627 mutates tmp only while evaluating the RHS of ||.
             * A visible yellow light short-circuits, retaining the full
             * d(10,20) damage as the blindness timeout and drawing no rnd(). */
            if (mon_visible_disp(mtmp)
                || (rnd((tmp = Math.trunc(tmp / 2))) > (u.ulevel | 0))) {
                await You('are blinded by a blast of light!');
                await make_blinded_real_mu(tmp, false);
                if (!Blind(gs))
                    Your1('vision quickly clears.');
            } else if (gs.flags?.verbose) {                       /* C mhitu.c:1632 */
                await You('get the impression it was not terribly bright.');
            }
        }
        break;
    case AD_HALU:
        /* C:1638-1651 */
        not_affected = not_affected || Blind(gs)
            || ((u.umonnum | 0) === PM_BLACK_LIGHT_MU
                || (u.umonnum | 0) === PM_VIOLET_FUNGUS_MU
                || dmgtype(gs.youmonst?.data, AD_STUN));
        if (ufound && !not_affected) {
            if (!Hallucination(gs))
                await You('are caught in a blast of kaleidoscopic light!');
            /* "avoid hallucinating the black light as it dies" — remove it from
             * the map NOW, before the property flips. */
            await mondead_mu(mtmp);
            kill_agr = false; /* already killed (maybe lifesaved) */
            const chg = await make_hallucinated_mu(
                (_HHallucination_mu(gs) | 0) + tmp, false, 0);
            await You(`${chg ? 'are freaked out' : 'seem unaffected'}.`);
        }
        break;
    default:
        await impossible_breath("unknown exploder damage type %d", mattk.adtyp);
        break;
    }
    if (not_affected) {                                   /* C:1656-1659 */
        await You('seem unaffected by it.');
        ugolemeffects(mattk.adtyp | 0, tmp);
    }
    if (kill_agr && !DEADMONSTER(mtmp))                    /* C:1660-1661 */
        await mondead_mu(mtmp);
    wake_nearto_mu(mtmp.mx | 0, mtmp.my | 0, 7 * 7);       /* C:1662 */
    return (!DEADMONSTER(mtmp)) ? M_ATTK_MISS : M_ATTK_AGR_DIED;
}

/* C youprop.h HHallucination — u.uprops[HALLUC].intrinsic (the TIMEOUT/INTRINSIC
 * half only; make_hallucinated adds to it, so the caller passes the current
 * value, not the Hallucination() predicate). */
function _HHallucination_mu(gs) {
    return (gs.u?.uprops?.[HALLUC_MU]?.intrinsic | 0);
}

export async function mattacku(mtmp) {
    if (!mtmp) return 0;
    const u = game.u || (game.u = {});
    /* C mhitu.c:1147 `struct permonst *olduasmon = gy.youmonst.data;` — the
     * hero's form as of BEFORE this attack resolves, because the attack may
     * rehumanize the hero and the passive counterattack still comes from the
     * OLD form.  C keeps it as a local in hitmu(); this port's hitmu_je() is a
     * separate function, so it is latched here (the whole mattacku call is
     * synchronous with respect to the hero's form). */
    game._olduasmon_mndx = _hero_form_mndx_mu();
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if (ENV.FF_MATTACK_TRACE === '1')
        pushRngLogEntry(`^mattacku_enter[id=${mtmp.m_id|0} pm=${mndx} pos=${mtmp.mx|0},${mtmp.my|0} target=${mtmp.mux|0},${mtmp.muy|0} pass=${game._ffMlPass|0} swallow=${game.u?.uswallow ? 1 : 0}]`);
    let { ranged, range2, foundyou, youseeit } = calc_mattacku_vars(mtmp);
    if (!ranged)
        nomul(0);
    if (DEADMONSTER(mtmp))
        return 1;
    /* C ref: mhitu.c:516-517 — a submerged hero can only be attacked by a
     * swimmer (is_swimmer(ptr) = M1_SWIM, mondata.h); anything else returns
     * before any to-hit roll is drawn.  RNG-free up to here. */
    if (_Underwater_mu() && !((mtmp.data?.mflags1 | 0) & 0x00000002 /* M1_SWIM */))
        return 0;
    /* C ref: mhitu.c:519-526 — the head of the swallowed/mounted chain:
     *     if (u.uswallow) {
     *         if (mtmp != u.ustuck) return 0;
     *         u.ustuck->mux = u.ux; u.ustuck->muy = u.uy;
     *         if (u.uinvulnerable) return 0;   / * stomachs can't hurt you! * /
     *         range2 = 0; foundyou = 1;
     *     } else if (u.usteed) { ... }
     * Unported until the engulf arm landed, and load-bearing in BOTH
     * directions once it did: without the early return every OTHER monster on
     * the level keeps attacking a hero who is inside a stomach, and without
     * the range2/foundyou override the swallower's own AT_ENGL is treated as a
     * ranged swing and never re-hits.  C's own comment: "If swallowed, can
     * only be affected by u.ustuck". */
    if (u.uswallow | 0) {
        if (mtmp !== u.ustuck)
            return 0;
        u.ustuck.mux = u.ux | 0;
        u.ustuck.muy = u.uy | 0;
        if (u.uinvulnerable | 0)
            return 0;
        range2 = 0;
        foundyou = 1;
    }

    if (!(u.uswallow | 0) && u.usteed) {
        if (mtmp === u.usteed)
            return 0;
        if (!rn2(is_orc_mu(mtmp.data) ? 2 : 4) && m_next2u_mhu(mtmp)) {
            const i0 = await mattackm(mtmp, u.usteed);
            if ((i0 & M_ATTK_AGR_DIED) !== 0)
                return 1;
            if ((i0 & M_ATTK_DEF_DIED) !== 0 || !u.usteed || !m_next2u_mhu(mtmp))
                return 0;
            /* C: gb.bhitpos is the square being attacked — mattackm's
             * displacement check (dogmove.js) reads game.gb.bhitpos. */
            game.gb = game.gb || {};
            game.gb.bhitpos = { x: mtmp.mx | 0, y: mtmp.my | 0 };
            game.gn = game.gn || {};
            game.gn.notonhead = false;
            return (await mattackm(u.usteed, mtmp) & M_ATTK_DEF_DIED) ? 1 : 0;
        }
    }

    /* C mhitu.c:551-654 — a concealed hero (u.uundetected) that a monster
     * attacks is exposed and the monster's turn ends. */
    if ((u.uundetected | 0) && !range2 && foundyou && !(u.uswallow | 0)) {
        const youseeit0 = canseemon_mu(mtmp);
        if (!canspotmon_disp(mtmp))
            map_invisible(mtmp.mx | 0, mtmp.my | 0);
        u.uundetected = 0;
        const hider = (((game.youmonst?.data?.mflags1 | 0) >>> 0) & 0x100) !== 0;
        if (hider && (u.umonnum | 0) !== PM_TRAPPER_MU) {
            /* C mhitu.c:556-615 — ceiling hider: the monster takes hero's
             * square and the hero is placed beside it via enexto/teleds. */
            await pline(`You fall from the ${ceiling_mu(u.ux | 0, u.uy | 0)}!`);
            /* remove_monster: this port has no grid, so park the monster off
             * the map so its square is eligible for placing the hero. */
            const omx = mtmp.mx | 0, omy = mtmp.my | 0;
            mtmp.mx = 0; mtmp.my = 0;
            let cc = enexto(u.ux | 0, u.uy | 0, game.youmonst.data);
            if (!cc || ((mtmp.data?.mlet | 0) === S_EEL_MU
                        && is_pool_mu(omx, omy) && !is_pool_mu(u.ux | 0, u.uy | 0))) {
                place_monster_mu(mtmp, omx, omy); /* put back */
                newsym(u.ux | 0, u.uy | 0);
                await pline_mon(mtmp, `${Monnam(mtmp)} draws back as you drop!`);
                return 0;
            }
            newsym(omx, omy); /* finish removal */
            place_monster_mu(mtmp, u.ux | 0, u.uy | 0);
            if (mtmp.wormno) {
                worm_move(mtmp);
                if (uhitm_m_at(cc.x, cc.y))
                    cc = enexto(u.ux | 0, u.uy | 0, game.youmonst.data) || cc;
            }
            await teleds_mu(cc.x, cc.y, 1 /* TELEDS_ALLOW_DRAG */);
            set_apparxy_kb(mtmp);
            newsym(u.ux | 0, u.uy | 0);
            if ((game.youmonst.data?.mlet | 0) !== 16 /* S_PIERCER */)
                return 0; /* lurkers don't attack */
            const obj = which_armor_mu(mtmp, WORN_HELMET_MU);
            if (hard_helmet_mu(obj)) {
                await pline(`Your blow glances off ${s_suffix(mon_nam(mtmp))} ${helm_simple_name(obj)}.`);
            } else if (3 + find_mac_mu(mtmp) <= rnd(20)) {
                await pline(`${Monnam(mtmp)} is hit by a falling piercer (you)!`);
                mtmp.mhp -= d(3, 6);
                if ((mtmp.mhp | 0) < 1)
                    await killed(mtmp);
            } else {
                await pline(`${Monnam(mtmp)} is almost hit by a falling piercer (you)!`);
            }
            return 0;
        }
        if (!youseeit0) {
            await pline('It tries to move where you are hiding.');
        } else {
            /* C mhitu.c:618-648 — surface hider, hero can see the attacker. */
            const obj = game.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0] ?? null;
            const hmndx = (u.umonnum | 0);
            const hgend = (Upolyd_fn(u) ? u.mfemale : game.flags?.female) ? 1 : 0;
            if (obj || hmndx === PM_TRAPPER_MU
                || ((game.youmonst?.data?.mlet | 0) === S_EEL_MU && is_pool_mu(u.ux | 0, u.uy | 0))) {
                const save_spe = obj ? obj.spe : 0;
                if (obj && (obj.otyp | 0) === 266 /* EGG */)
                    obj.spe = 0;
                const hname = monPmname_mu(hmndx, hgend);
                if ((game.youmonst?.data?.mlet | 0) === S_EEL_MU || hmndx === PM_TRAPPER_MU)
                    await pline(`Wait, ${m_monnam_mu(mtmp)}!  There's a hidden ${hname} named ${game.plname} there!`);
                else
                    await pline(`Wait, ${m_monnam_mu(mtmp)}!  There's a ${hname} named ${game.plname} hiding under ${await doname_mu(obj)}!`);
                if (obj)
                    obj.spe = save_spe;
            } else await impossible_mu('hiding under nothing?');
        }
        newsym(u.ux | 0, u.uy | 0);
        return 0;
    }

    /* C mhitu.c:664-679 — hero might be a mimic, concealed via #monster. */
    if ((game.youmonst?.data?.mlet | 0) === 13 /* S_MIMIC */
        && (((game.youmonst?.m_ap_type | 0) & 7) !== 0) && !range2
        && foundyou && !(u.uswallow | 0)) {
        const sticky = _kb_sticks(_hero_form_mndx_mu());
        const youseeit1 = canseemon_mu(mtmp);
        if (!canspotmon_disp(mtmp))
            map_invisible(mtmp.mx | 0, mtmp.my | 0);
        if (sticky && !youseeit1)
            await pline('It gets stuck on you.');
        else
            await pline(`Wait, ${m_monnam_mu(mtmp)}!  That's a ${monPmname_mu(u.umonnum | 0, u.mfemale ? 1 : 0)} named ${game.plname}!`);
        if (sticky)
            set_ustuck_mu(mtmp);
        game.youmonst.m_ap_type = 0;
        game.youmonst.mappearance = 0;
        newsym(u.ux | 0, u.uy | 0);
        return 0;
    }

    /* C mhitu.c:681-704 — eating a mimic corpse can disguise any hero. */
    if (((game.youmonst?.m_ap_type | 0) & 7) === 2 /* M_AP_OBJECT */
        && !range2 && foundyou && !u.uswallow) {
        if (!canspotmon_disp(mtmp))
            map_invisible(mtmp.mx | 0, mtmp.my | 0);
        if (!canseemon_mu(mtmp))
            await pline(`Something ${((mtmp.data?.mflags2 | 0) & 0x10000000 /* M2_GREEDY */)
                && game.youmonst.mappearance === 438 /* GOLD_PIECE */
                ? 'tries to pick you up' : 'disturbs you'}!`);
        else
            await pline(`Wait, ${m_monnam_mu(mtmp)}!  That ${mimic_obj_name(game.youmonst)} is really ${an(monPmname_mu(u.umonnum | 0, (Upolyd_fn(u) ? u.mfemale : game.flags?.female) ? 1 : 0))} named ${game.plname}!`);
        if (game.multi < 0)
            await unmul(`You appear to be ${Upolyd_fn(u) ? an(monPmname_mu(u.umonnum | 0, game.flags?.female ? 1 : 0)) : 'yourself'} again.`);
        return 0;
    }
    /* C mhitu.c:707 — armor class differential.
     * tmp = AC_VALUE(u.uac) + 10; AC_VALUE(AC) = AC>=0 ? AC : -rnd(-AC). */
    const uac = u.uac | 0;
    let tmp = (uac >= 0 ? uac : -rnd(-uac)) + 10;
    tmp += (mtmp.m_lev | 0);
    if ((game.multi | 0) < 0) tmp += 4;
    /* (Invis && !perceives) || !mcansee  → -2 */
    if ((_Invis_mu() && !perceives_mu(mtmp.data)) || !(mtmp.mcansee | 0)) tmp -= 2;
    if (mtmp.mtrapped | 0) tmp -= 2;
    if (tmp <= 0) tmp = 1;

    if ((mtmp.data?.mlet | 0) === S_EEL_MU && mtmp.minvis && cansee_mu(mtmp.mx, mtmp.my)) {
        mtmp.minvis = 0;
        newsym(mtmp.mx, mtmp.my);
    }

    if ((mtmp.cham ?? NON_PM_MU) === NON_PM_MU && !(mtmp.mcan | 0) && !range2
        && (is_demon_mu(mtmp.data) || is_were_mu(mtmp.data))) {
        const already_fleeing = (mtmp.mflee | 0) !== 0;
        await summonmu_mu(mtmp, youseeit);
        if ((mtmp.mflee | 0) && !already_fleeing)
            return 0;
    }

    if (u.uinvulnerable | 0) {
        if (mtmp === u.ustuck) {
            await pline_mon(mtmp, `${Monnam(mtmp)} loosens its grip slightly.`);
        } else if (!range2) {
            if (youseeit || sensemon_mu(mtmp))
                await pline(`${Monnam(mtmp)} starts to attack you, but pulls back.`);
            else
                await You_feel_mu('something move nearby.');
        }
        return 0;
    }

    /* C mhitu.c:757-761 — "Unlike defensive stuff, don't let them use item
     * _and_ attack."  find_offensive() sets gm.m.offensive/has_offense (js:
     * game.offensive / game.has_offense); use_offensive() acts on it and
     * returns 0 (did nothing), 1 (monster died) or 2 (acted). */
    if (find_offensive(mtmp)) {
        const offended = await use_offensive(mtmp);

        if (offended !== 0)
            return (offended === 1) ? 1 : 0;
    }

    /* C mhitu.c:763 — reset the per-attacker brain-drain suppression flag. */
    game.s = game.s || {};
    game.s.skipdrin = 0;

    /* C mhitu.c:767 — the attack loop over the monster's attacks. */
    const sum = new Array(NATTK).fill(M_ATTK_MISS);
    /* C mattacku `int j` is function-scoped: the AT_ENGL arm reads it stale when
     * u.uswallow/mspec_used short-circuits the to-hit roll (mhitu.c:848-854). */
    let j_stale = 0;
    /* C mhitu.c:722 `boolean skipnonmagc = FALSE;` — set by wildmiss's two call
     * sites, tested at mhitu.c:787 to skip every remaining non-AT_MAGC attack. */
    let skipnonmagc = false;
    /* C mhitu.c:766 `firstfoundyou = foundyou;` — latched BEFORE the loop. */
    const firstfoundyou = foundyou;
    const _deathBeforeAttacks = game._pendingDeath || null;
    for (let i = 0; i < NATTK; i++) {
        if (game._pendingDeath && game._pendingDeath !== _deathBeforeAttacks
            && pending_death_is_final())
            return 0;
        /* C mhitu.c:771-772 — "counterattack against attack [i-1] might have
         * been fatal". */
        if (DEADMONSTER(mtmp))
            return 1;
        if (i > 0) {
            ({ ranged, range2, foundyou, youseeit } = calc_mattacku_vars(mtmp));
            if (firstfoundyou && !foundyou)
                continue;
            if (!u_at_mu(game.gb.bhitpos.x, game.gb.bhitpos.y))
                continue;
        }
        mon_currwep = null; /* C mhitu.c:785 */
        const mattk = getmattk(mtmp, true, null, i, sum);
        if (!mattk) continue;
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^mattacku_attack[id=${mtmp.m_id|0} slot=${i} aatyp=${mattk.aatyp|0} adtyp=${mattk.adtyp|0} damn=${mattk.damn|0} damd=${mattk.damd|0} range=${range2 ? 1 : 0} found=${foundyou ? 1 : 0}]`);
        /* C mhitu.c:786-790 — skipnonmagc suppresses everything but AT_MAGC;
         * skipdrin suppresses a mind flayer's remaining brain-drain tentacles
         * after an ineffective or terminal one. */
        if (((game.u.uswallow | 0) && mattk.aatyp !== AT_ENGL_MU)
            || (skipnonmagc && mattk.aatyp !== AT_MAGC)
            || (game.s.skipdrin && mattk.aatyp === AT_TENT_
                && mattk.adtyp === AD_DRIN_))
            continue;
        /* C ref: mhitu.c hitmsg "again" tracking — record this attack's slot
         * index so hitmsg_je can test mattk == hitmsg_prev + 1. */
        mattk._ai = mattk._alt ? null : i;
        /* identity of the attack ARRAY: C's hitmsg_prev is a pointer, so an
         * index from a previous polymorph form never satisfies prev + 1. */
        mattk._ao = mtmp.data;
        switch (mattk.aatyp) {
            case AT_CLAW_:
            case AT_KICK_:
            case AT_BITE_:
            case AT_STNG_:
            case AT_TUCH_:
            case AT_BUTT_:
            case AT_TENT_: {
                /* C mhitu.c:791-793 — a monster stuck in a (spiked) pit can't
                 * kick.  This whole case (including AT_TENT — kraken tentacle
                 * attacks) was previously unreachable for AT_TENT and this
                 * KICK/pit guard did not exist at all. */
                if (mattk.aatyp === AT_KICK_ && _mtrapped_in_pit_attacker_mu(mtmp))
                    continue;
                /* C mhitu.c:794-802 — only when !range2 (adjacent), AND
                 * (unarmed monster OR confused OR hero has Conflict OR hero's
                 * CURRENT form does not touch-petrify):
                 *     if (!range2 && (!MON_WEP(mtmp) || mtmp->mconf || Conflict
                 *                     || !touch_petrifies(gy.youmonst.data))) {
                 * Was previously just `if (range2) break;` — a weapon-wielding,
                 * unconfused monster attacking a non-Conflicted hero who is
                 * currently a cockatrice/chickatrice must skip this hand
                 * attack entirely (no roll, no message), same as the range2
                 * case, because touching a petrifier bare-handed would stone
                 * an armed monster that could instead just swing its weapon
                 * (see the AT_WEAP_ case below). */
                if (range2) break;
                if (!(!MON_WEP(mtmp) || (mtmp.mconf | 0) || _conflict_mu()
                      || !touch_petrifies_mk(_hero_form_mndx_mu())))
                    break;
                if (foundyou) {
                    /* C mhitu.c:805 — to-hit roll. */
                    const j = rnd(20 + i);
                    j_stale = j;
                    if (tmp > j) {
                        /* C mhitu.c:806-808 — an unsolid-form hero can pass a
                         * grab-type attack (AT_TENT/AD_WRAP eel, AT_TUCH/
                         * AD_STCK mimic/lichen) right through.  Was entirely
                         * unported for this arm (only AT_HUGS_ called
                         * _failed_grab_u before). */
                        if (_failed_grab_u(mtmp, mattk))
                            continue;
                        /* C mhitu.c:809-810 — a thick-hided hero form (e.g.
                         * polymorphed into an iron golem) takes no damage
                         * from a kick. */
                        if (mattk.aatyp !== AT_KICK_
                            || !((_kb_mflags1(_hero_form_mndx_mu()) & M1_THICK_HIDE) !== 0))
                            sum[i] = await hitmu_je(mtmp, mattk);
                    }
                    else {
                        await missmu_je(mtmp, (tmp === j), mattk);
                    }
                }
                else {
                    /* C mhitu.c:815-818 — the monster swung where it THOUGHT
                     * the hero was.  wildmiss() prints the taunt; skipnonmagc
                     * then suppresses this monster's remaining NON-spell
                     * attacks this turn (mhitu.c:787), which is why C pages one
                     * "strikes at your displaced image" per turn and not one
                     * per attack slot. */
                    await wildmiss(mtmp, mattk);
                    skipnonmagc = true;
                }
                break;
            }
            case AT_WEAP_: {
                /* C mhitu.c:883-924 — "hand to hand" weapon attack. */
                if (range2) {
                    /* C mhitu.c:884-886: if (!Is_rogue_level(&u.uz)) thrwmu(mtmp); */
                    if (!Is_rogue_level(game.u?.uz))
                        await thrwmu(mtmp);
                    break;
                }
                let hittmp = 0;

                /* C:893-899 — "Rare but not impossible.  Normally the monster
                 * wields when 2 spaces away, but it can be teleported or
                 * whatever...."  mon_wield_item resets weapon_check as
                 * appropriate, and a monster that spends its move wielding
                 * does not get to swing this turn. */
                if ((mtmp.weapon_check | 0) === MHU_NEED_WEAPON || !MON_WEP(mtmp)) {
                    mtmp.weapon_check = MHU_NEED_HTH_WEAPON;
                    if (await mon_wield_item(mtmp) !== 0)
                        break;
                }
                if (foundyou) {
                    mon_currwep = MON_WEP(mtmp);
                    if (mon_currwep) {
                        /* C:904-907 — a polearm used at melee range bashes. */
                        const bash = (is_pole_mhu(mon_currwep)
                                      && (mon_currwep.oartifact | 0) !== ART_SNICKERSNEE_MHU
                                      && m_next2u_mhu(mtmp));

                        /* C:909 hitval(mon_currwep, &gy.youmonst) — the
                         * defender is the hero here, so hitval's per-defender
                         * arms (kebabable mlet, swimmer, xorn) read the hero's
                         * own permonst, whose index is u.umonnum. */
                        hittmp = hitval(mon_currwep, null,
                                        (game.u?.umonnum ?? -1) | 0);
                        tmp += hittmp;
                        await mswings(mtmp, mon_currwep, bash);
                    }
                    /* C:912 if (tmp > (j = gm.mhitu_dieroll = rnd(20 + i))) */
                    const j = rnd(20 + i);
                    j_stale = j;
                    (game.gm ||= {}).mhitu_dieroll = j;
                    if (tmp > j)
                        sum[i] = await hitmu_je(mtmp, mattk);
                    else
                        await missmu_je(mtmp, (tmp === j), mattk);
                    /* C:917-919 KMH -- Don't accumulate to-hit bonuses */
                    if (mon_currwep)
                        tmp -= hittmp;
                } else {
                    /* C:919-923 — same pair as the CLAW arm above. */
                    await wildmiss(mtmp, mattk);
                    skipnonmagc = true;
                }
                break;
            }
            case AT_BREA: {
                if (range2)
                    sum[i] = await breamu(mtmp, mattk);
                break;
            }
            case AT_SPIT: {
                /* C mhitu.c:878-881 — spitmu takes care of displacement. */
                if (range2)
                    sum[i] = await spitmu(mtmp, mattk);
                break;
            }
            case AT_GAZE: {
                if (mtmp.mnum !== PM_MEDUSA)
                    sum[i] = await gazemu(mtmp, mattk);
                break;
            }
            case AT_EXPL_: {
                if (!range2)
                    sum[i] = await explmu(mtmp, mattk, foundyou);
                break;
            }
            case AT_ENGL_MU: {
                if (range2) break;
                if (foundyou) {
                    let j = j_stale;
                    const engulfed = (game.u.uswallow | 0)
                        || (!(mtmp.mspec_used | 0) && tmp > (j = rnd(20 + i)));
                    j_stale = j;
                    if (engulfed) {
                        /* C mhitu.c:851: flush_screen(1) before gulpmu,
                         * even when engulf_target will reject the attack.
                         * Use the synchronous repaint without deferred paging. */
                        pline_flush_point();
                        sum[i] = await gulpmu(mtmp, mattk);
                    } else {
                        await missmu_je(mtmp, (tmp === j), mattk);
                    }
                } else if (digests_gu(mndx)) {
                    await pline_mon(mtmp, `${Monnam(mtmp)} gulps some air!`);
                } else {
                    /* C mhitu.c:864-871 — the "lunges forward and recoils"
                     * / You_hear arm for an engulfer that swung at the hero's
                     * displaced image. */
                    if (youseeit)
                        await pline_mon(mtmp, `${Monnam(mtmp)} lunges forward and recoils!`);
                    else
                        await You_hear(`a ${is_whirly_gu(mndx, mtmp.data)
                               ? 'rushing noise' : 'splat'} nearby.`);
                }
                break;
            }
            case AT_MAGC: {
                if (range2)
                    sum[i] = await buzzmu(mtmp, mattk);
                else
                    sum[i] = await castmu(mtmp, mattk, true, foundyou);
                break;
            }
            case AT_HUGS_: {
                if ((!range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                    || mtmp === u.ustuck) {
                    if (!_failed_grab_u(mtmp, mattk))
                        sum[i] = await hitmu_je(mtmp, mattk);
                }
                break;
            }
            default:
                /* C mhitu.c:932 — no attack. */
                break;
        }
        if (game.disp && game.disp.botl) {
            await bot_mu();
            /* bot() repaints the physical status row, so a later --More-- raised
             * by a prompt shows this status, not the pline-time frame's. */
            game._statusPaintSeq = (game._statusPaintSeq | 0) + 1;
            /* bot() writes only the status rows; unlike moveloop's
             * curs_on_u() it runs no flush_screen, so the pline-time map
             * frame of a later prompt's more() is still the physical map. */
            const lf = game._lonePlineFrame;
            if (lf && lf.statusSeq === ((game._statusPaintSeq | 0) - 1))
                lf.statusSeq = game._statusPaintSeq | 0;
        }
        /* C mhitu.c:938-943 — "give player a chance of waking up before dying".
         * Guarded on the hero being asleep, so the rn2(10) never fires for an
         * awake hero; ported so the draw site is visible where C has it. */
        if (sum[i] === M_ATTK_HIT) {
            if ((game.u?.usleep | 0) && (game.u.usleep | 0) < (game.moves | 0)
                && !rn2(10)) {
                game.multi = -1;
                game.nomovemsg = 'The combat suddenly awakens you.';
            }
        }
        if (sum[i] & M_ATTK_AGR_DIED) return 1;
        if (sum[i] & M_ATTK_AGR_DONE) break;
    }
    return 0;
}

const AT_SPIT = 10;  /* ranged */
const AT_BREA = 12;  /* ranged */
const AT_GAZE = 15;  /* ranged */
const AT_MAGC = 255; /* ranged */
const DISTANCE_ATTK_TYPE = (atyp) => atyp === AT_SPIT || atyp === AT_BREA || atyp === AT_MAGC || atyp === AT_GAZE;

/* C ref: mhitu.c:2405-2418 ranged_attk_available */
export function ranged_attk_available(mtmp) {
    let typ = -1;
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;

    for (let i = 0; i < NATTK; i++) {
        const mattk = mon_mattk(mndx, i);
        if (!mattk) continue;
        /* C: `m_seenres(mtmp, ...) == 0`, where the macro yields the MASKED
         * VALUE (monst.h:89). This file's m_seenres() returns a JS boolean
         * instead, and `false === 0` is false — so this clause could never be
         * satisfied and the function returned false for every monster, even
         * before the mndx bug above. Compare as a boolean, which is what the
         * C `== 0` means once the value has already been reduced. */
        if (DISTANCE_ATTK_TYPE(mattk.aatyp)
            && (typ = get_atkdam_type(mattk.adtyp)) >= 0
                && !m_seenres(mtmp, cvt_adtyp_to_mseenres(typ))) {
                return true;
        }
    }
    return false;
}


/* ---------------------------------------------------------------------------
 * could_seduce — C ref: nethack-c/src/mhitu.c:1929-1978.
 * Whether magr could seduce mdef via AD_SEDU/AD_SSEX/AD_SITM (mattk non-null:
 * current attack; null: general capability check). No RNG. Returns 0/1/2.
 * ---------------------------------------------------------------------------
 */
const AD_PHYS = 0;
const AD_SITM = 21;
const AD_SEDU = 22;
const AD_SSEX = 35;
const M1_ANIMAL = 0x00040000;   /* monflag.h:103 (0x00100000 is M1_UNSOLID) */
const M1_SEE_INVIS = 0x01000000;
const S_NYMPH = 14;

/* C mondata.h is_animal(ptr) = (ptr->mflags1 & M1_ANIMAL) != 0 */
function couldSeduceIsAnimal(mdata) {
    return ((mdata.mflags1 | 0) & M1_ANIMAL) !== 0;
}
/* C mondata.h perceives(ptr) = (ptr->mflags1 & M1_SEE_INVIS) != 0 */
function couldSeducePerceives(mdata) {
    return ((mdata.mflags1 | 0) & M1_SEE_INVIS) !== 0;
}
/* C mondata.h:69 thick_skinned(ptr) = (ptr->mflags1 & M1_THICK_HIDE) != 0 */
const M1_THICK_HIDE = 0x00200000;
function thick_skinned(mdata) {
    return ((mdata.mflags1 | 0) & M1_THICK_HIDE) !== 0;
}

export function could_seduce(magr, mdef, mattk) {
    if (couldSeduceIsAnimal(magr.data))
        return 0;

    let pagr, agrinvis, genagr;
    if (magr === game.youmonst) {
        pagr = game.youmonst.data;
        /* C u.uprops[] is a dense array, so an unset property reads as all
         * zeroes; js/ builds uprops lazily as a sparse object (js/u_init.js:1613
         * creates a slot only when something grants the property), so an absent
         * slot IS the all-zero C row.  Reading it undefended threw a TypeError
         * -- this branch had no caller until js/uhitm.js's hmonas weaponless arm
         * became one, and the ported hmonas calls it on EVERY landed weaponless
         * attack.  Same absent-means-zero convention js/jsmain.js:615 uses. */
        const invisProp = game.u.uprops[INVIS] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
        agrinvis = !!((invisProp.intrinsic || invisProp.extrinsic) && !invisProp.blocked);
        genagr = poly_gender();
    } else {
        pagr = magr.data;
        agrinvis = !!magr.minvis;
        genagr = gender(magr);
    }

    let defperc, gendef;
    if (mdef === game.youmonst) {
        const seeInvisProp = game.u.uprops[SEE_INVIS] || { intrinsic: 0, extrinsic: 0 };
        defperc = !!(seeInvisProp.intrinsic || seeInvisProp.extrinsic);
        gendef = poly_gender();
    } else {
        defperc = couldSeducePerceives(mdef.data);
        gendef = gender(mdef);
    }

    let adtyp = mattk ? mattk.adtyp
        : dmgtype(pagr, AD_SSEX) ? AD_SSEX
        : dmgtype(pagr, AD_SEDU) ? AD_SEDU
        : AD_PHYS;
    if (adtyp === AD_SSEX && !(game.sysopt?.seduce ?? true))
        adtyp = AD_SEDU;

    if (agrinvis && !defperc && adtyp === AD_SEDU)
        return 0;

    if ((pagr.mlet !== S_NYMPH && pagr.pmidx !== PM_INCUBUS)
        || (adtyp !== AD_SEDU && adtyp !== AD_SSEX && adtyp !== AD_SITM))
        return 0;

    return (genagr === 1 - gendef) ? 1 : (pagr.mlet === S_NYMPH) ? 2 : 0;
}

/* check whether slippery clothing protects from hug or wrap attack
 * C ref: mhitu.c:1044-1080 */
export function u_slip_free(mtmp, mattk) {
    const u = game.u || (game.u = {});

    /* greased armor does not protect against AT_ENGL+AD_WRAP */
    if (mattk.aatyp === AT_ENGL_)
        return false;

    let obj = (u.uarmc ? u.uarmc : u.uarm);
    if (!obj)
        obj = u.uarmu;
    if (mattk.adtyp === AD_DRIN_)
        obj = u.uarmh;

    /* if your cloak/armor is greased, monster slips off; this
       protection might fail (33% chance) when the armor is cursed */
    if (obj && (obj.greased || obj.otyp === OILSKIN_CLOAK_)
        && (!obj.cursed || rn2(3))) {
        pline_mon(mtmp, "%s %s your %s %s!", Monnam(mtmp),
            (mattk.adtyp === AD_WRAP_) ? "slips off of"
                                        : "grabs you, but cannot hold onto",
            obj.greased ? "greased" : "slippery",
            /* avoid "slippery slippery cloak"
               for undiscovered oilskin cloak */
            (obj.greased || (game._oc_name_known && game._oc_name_known[obj.otyp]))
                ? xname(obj)
                : cloak_simple_name(obj));

        if (obj.greased && !rn2(2)) {
            pline_The("grease wears off.");
            obj.greased = 0;
            update_inventory();
        }
        return true;
    }
    return false;
}

/* C ref: mondata.h:142 is_minion(ptr) — ((ptr)->mflags2 & M2_MINION) != 0. Macro, inlined. */
const M2_MINION = 0x00001000;
function is_minion(data) {
    return !!(data && (data.mflags2 & M2_MINION) !== 0);
}
/* C ref: obj.h:249 is_weptool(o) — (o)->oclass == TOOL_CLASS && objects[(o)->otyp].oc_skill != P_NONE. Macro, inlined. */
function is_weptool(obj) {
    return (obj.oclass | 0) === TOOL_CLASS
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) !== 0 /* P_NONE */;
}

/* C ref: mhitu.c:1085 magic_negation
 * is_you: mon->m_id is a fixed sentinel (gy.youmonst.m_id = 1, reserved by
 * next_ident()); (mon.m_id === 1) is the faithful equivalent of C's
 * (mon == &gy.youmonst) — see trap.js:2938-2943 for the established idiom. */
export function magic_negation(mon) {
    const u = game.u || {};
    const mndx = (mon.data?.pmidx ?? mon.mnum ?? -1) | 0;
    const is_you = (mon.m_id === 1);
    let via_amul = false;
    let gotprot;

    if (is_you) {
        /* EProtection != 0L */
        const protProp = (u.uprops && u.uprops[PROTECTION]) || {};
        gotprot = !!(protProp.extrinsic);
    } else {
        /* high priests have innate protection */
        gotprot = (mndx === PM_HIGH_PRIEST);
    }

    let mc = 0;
    const inv = is_you ? game.invent : mon.minvent;
    for (let o = inv; o; o = o.nobj) {
        /* a_can field is only applicable for armor (which must be worn) */
        if ((o.owornmask & W_ARMOR) !== 0) {
            const armpro = obj_a_can(o);
            if (armpro > mc) mc = armpro;
        } else if ((o.owornmask & W_AMUL) !== 0) {
            via_amul = (o.otyp === AMULET_OF_GUARDING_MU);
        }
        /* if we've already confirmed Protection, skip additional checks */
        if (is_you || gotprot)
            continue;

        /* omit W_SWAPWEP+W_QUIVER; W_ART+W_ARTI handled by protects() */
        let wearmask = W_ARMOR | W_ACCESSORY;
        if (o.oclass === WEAPON_CLASS || is_weptool(o))
            wearmask |= W_WEP;
        if (protects(o, ((o.owornmask & wearmask) !== 0)))
            gotprot = true;
    }

    if (gotprot) {
        /* extrinsic Protection increases mc by 1 (2 for amulet of guarding);
           multiple sources don't provide multiple increments */
        mc += via_amul ? 2 : 1;
        if (mc > 3)
            mc = 3;
    } else if (mc < 1) {
        /* intrinsic Protection is weaker (play balance; obtaining divine
           protection is too easy); it confers minimum mc 1 instead of 0 */
        const protProp = (u.uprops && u.uprops[PROTECTION]) || {};
        if ((is_you && ((protProp.intrinsic && u.ublessed > 0) || u.uspellprot))
            /* aligned priests and angels have innate intrinsic Protection */
            || (mndx === PM_ALIGNED_CLERIC
                || is_minion(mon.data)))
            mc = 1;
    }
    return mc;
}

/* C ref: objclass.h:79-81 PIERCE/SLASH/WHACK — weapon strike-mode bits
 * overloading oc_dir for the WEAPON_CLASS rows. */
const PIERCE = 1;

/* C ref: obj.h:256 is_wet_towel(o) — (o)->otyp == TOWEL && (o)->spe > 0.
 * Macro, inlined; OTYP_TOWEL verified against objects.h OBJECTS_ENUM order. */
const OTYP_TOWEL = 234;
function is_wet_towel(obj) {
    return (obj.otyp | 0) === OTYP_TOWEL && (obj.spe | 0) > 0;
}

/* C ref: objects[].oc_dir, WEAPON_CLASS rows plus the WEPTOOL() weapon-tools
 * (objects.h WEAPON()/PROJECTILE()/BOW()/WEPTOOL() "typ" field, P=PIERCE=1,
 * S=SLASH=2, B=WHACK=4, 0 for bows/none). Other non-weapon rows are 0.
 * WEPTOOL rows (pick-axe 259, grappling hook 260, unicorn horn 261) were
 * missing and read 0, so mswings_verb never said "thrusts" for a horn.
 * Indices align 1:1 with otyp and with MKOBJ_OC_SKILL
 * (js/mkobj_erosion_meta.js) — both derived from the same objects.h
 * OBJECTS_INIT table. */
const MKOBJ_OC_DIR = new Int8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 0, 1, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 3, 2, 2, 3, 2, 3, 5, 5, 4, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 2, 1, 2, 2, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0]);

/* C ref: mhitu.c:105-128 mswings_verb(mwep, bash). */
export function mswings_verb(mwep, bash) {
    const otyp = mwep.otyp | 0;
    const oc_dir = MKOBJ_OC_DIR[otyp] | 0;
    const lash = ((MKOBJ_OC_SKILL[otyp] | 0) === P_WHIP || is_wet_towel(mwep));
    const thrust = ((oc_dir & PIERCE) !== 0
                     && ((oc_dir & ~PIERCE) === 0 || !rn2(2)));

    const verb = bash ? "bashes with" /*sigh*/
        : lash ? "lashes"
            : thrust ? "thrusts"
                : "swings";
    return verb;
}

/* C ref: makemon.js MON_WEP helper — not exported, copied locally. */
function MON_WEP(mon) { return mon.mw; }

/* ── mattacku's AT_WEAP arm support (mhitu.c:128-142, weapon.c) ────────────── */
/* monst.h enum wpn_chk_flags; js/const.js:2689-2696 carries the same values. */
const MHU_NEED_WEAPON = 1, MHU_NEED_HTH_WEAPON = 3, MHU_NEED_RANGED_WEAPON = 2;
/* artilist.h index of Snickersnee (the same ordinal js/uhitm.js's select_rwep
 * uses for SR_ART_SNICKERSNEE). */
const ART_SNICKERSNEE_MHU = 19;
/* C obj.h:228 is_pole(otmp) —
 *   (oclass == WEAPON_CLASS || oclass == TOOL_CLASS)
 *   && (oc_skill == P_POLEARMS || oc_skill == P_LANCE
 *       || is_art(otmp, ART_SNICKERSNEE))
 * skills.h: P_POLEARMS = 16, P_LANCE = 19.  This used to test WEAPON_CLASS and
 * P_POLEARMS only, which silently excluded lances, weptool polearms and
 * Snickersnee from thrwmu's polearm arm and from mattacku's melee bash test. */
const P_POLEARMS_MHU = 16, P_LANCE_MHU = 19;
const OCLASS_WEAPON_MHU = 2, OCLASS_TOOL_MHU = 6;
function is_pole_mhu(obj) {
    const oc = obj.oclass | 0;
    if (oc !== OCLASS_WEAPON_MHU && oc !== OCLASS_TOOL_MHU)
        return false;
    const sk = MKOBJ_OC_SKILL[obj.otyp | 0] | 0;
    return sk === P_POLEARMS_MHU || sk === P_LANCE_MHU
        || (obj.oartifact | 0) === ART_SNICKERSNEE_MHU;
}
/* hack.h m_next2u(mon) — distu(mon->mx, mon->my) <= 2. */
function m_next2u_mhu(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0), dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}
const PRONOUN_GENDERS_HIS = ['his', 'her', 'its', 'their'];
function pronoun_gender_hallu_mhu(mtmp) {
    const gs = game;
    if (Hallucination(gs))
        return rn2(4); /* 0..3 */
    /* !override_vis && !canspotmon(mtmp) → 2 */
    if (!canspotmon_mhu(mtmp))
        return 2;
    if (is_neuter_mhu(mtmp))
        return 2;
    return (humanoid_mhu(mtmp) || is_uniq_mhu(mtmp) || type_is_pname_mhu(mtmp))
        ? ((mtmp.female | 0)) : 2;
}
export function mhis_mon(mtmp) {
    return PRONOUN_GENDERS_HIS[pronoun_gender_hallu_mhu(mtmp)];
}
/* monflag.h bits used by pronoun_gender's tail. */
const M1_HUMANOID_MHU = 0x00020000, M2_NEUTER_MHU = 0x00040000,
      M2_PNAME_MHU = 0x00080000, G_UNIQ_MHU = 0x1000;
function humanoid_mhu(m)     { return ((m.data?.mflags1 | 0) & M1_HUMANOID_MHU) !== 0; }
function is_neuter_mhu(m)    { return ((m.data?.mflags2 | 0) & M2_NEUTER_MHU) !== 0; }
function type_is_pname_mhu(m){ return ((m.data?.mflags2 | 0) & M2_PNAME_MHU) !== 0; }
function is_uniq_mhu(m)      { return ((m.data?.geno | 0) & G_UNIQ_MHU) !== 0; }
function canspotmon_mhu(m)   { return !!canspotmon_disp(m); }

/* C mhitu.c:129-142 mswings — monster swings obj.  RNG-free except through
 * mswings_verb, whose rn2(2) fires only for a weapon with PIERCE *plus*
 * another strike bit. */
export async function mswings(mtmp, otemp, bash) {
    const gs = game;
    if ((gs.flags?.verbose ?? true) && !Blind(gs) && mon_visible_disp(mtmp)) {
        set_msg_xy_mu(mtmp.mx, mtmp.my); /* C mhitu.c:136 pline_mon */
        await pline(`${Monnam_mhu(mtmp)} ${mswings_verb(otemp, bash)} `
              + `${((otemp.quan | 0) > 1) ? 'one of ' : ''}`
              + `${mhis_mon(mtmp)} ${xname(otemp)}.`);
        if (_topline_more_pending() && _more_never_dismissed())
            await flush_pending_messages();
    }
}
/* do_name.c Monnam() — mon_nam() with the first letter capitalized.  The
 * file-local `Monnam` stub above returns the literal "Monster"; js/uhitm.js's
 * mon_nam is the real x_monnam-backed namer. */
function Monnam_mhu(mtmp) {
    return Monnam_real(mtmp);
}

/* C ref: mhitu.c mpoisons_subj — subject noun for poison message. */
export function mpoisons_subj(mtmp, mattk) {
    if (mattk.aatyp === AT_WEAP_) {
        const mwep = (mtmp.m_id === 1) ? (game.u && game.u.uwep) : MON_WEP(mtmp);
        return (!mwep || !mwep.opoisoned) ? "attack" : "weapon";
    } else {
        return (mattk.aatyp === AT_TUCH_) ? "contact"
            : (mattk.aatyp === AT_GAZE) ? "gaze"
                : (mattk.aatyp === AT_BITE_) ? "bite" : "sting";
    }
}

export async function expels(mtmp, data, flag) { return expels_gu(mtmp, data?.pmidx ?? mtmp?.data?.pmidx, flag); }

export function mtrapped_in_pit(magr) {
    let ttmp = null;
    if (magr && (magr === game.youmonst || magr === game.u || is_youmonst_mu(magr))) {
        const u = game.u || {};
        ttmp = ((u.utrap | 0) && (u.utraptype | 0) === TT_PIT)
            ? t_at(u.ux | 0, u.uy | 0) : null;
    } else {
        ttmp = (magr?.mtrapped | 0) ? t_at(magr.mx | 0, magr.my | 0) : null;
    }
    return !!(ttmp && is_pit(ttmp.ttyp | 0));
}

/* C mhitu.c:162-170 — called when an attack removes intrinsic speed. */
export function u_slow_down() {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FAST] || (u.uprops[FAST] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
    const hasExtrinsic = !!(prop.extrinsic | 0);
    prop.intrinsic = 0;
    /* C's Fast macro is evaluated after HFast is cleared: speed boots leave
     * the message about quickness feeling less natural. */
    if (!hasExtrinsic)
        You("slow down.");
    else
        Your("quickness feels less natural.");
    /* exercise() is unconditional in C, even if the intrinsic was already
     * absent (the caller normally guarantees it was present). */
    exercise(A_DEX, false);
}

/* artifact_hit's real body is next to spec_applies()/spec_abon()/spec_dbon(),
 * the artilist[] readers it shares ARTI_SPEC with (js/uhitm.js:~618).  The
 * constant-FALSE stub that used to sit here has been retired; its two callers
 * below now consume the returned damage, which is what C's `*dmgptr` is for. */
/* C mhitu.c:2616-2638 cloneu() */
export async function cloneu() {
    const mndx = game.u.umonnum | 0; /* monsndx(youmonst.data) */
    if (game.u.mh <= 1)
        return null;
    if (((game.mvitals?.[mndx]?.mvflags | 0) & 0x01 /* G_EXTINCT */) !== 0)
        return null;
    let mon = await makemon(mndx, game.u.ux, game.u.uy,
                            0x00000001 /* NO_MINVENT */ | 0x00000800 /* MM_EDOG */
                            | 0x00020000 /* MM_NOMSG */);
    if (!mon)
        return null;
    mon.mcloned = 1;
    mon = christen_monst(mon, String(game.plname));
    initedog(mon, true);
    mon.m_lev = game.youmonst.data.mlevel;
    mon.mhpmax = game.u.mhmax;
    mon.mhp = Math.trunc(game.u.mh / 2);
    game.u.mh -= mon.mhp;
    SET_BOTL();
    return mon;
}
