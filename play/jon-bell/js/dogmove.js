import { xname } from './do_wear.js'; // re-export of objnam.js
import { Monnam, mon_nam } from './do_name.js';
import { You_feel, You, pline_mon } from './pline.js';
import { AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_TUCH, AT_STNG, AT_SPIT, AT_BREA, AT_EXPL, AT_BOOM, AT_GAZE, AT_TENT, AT_WEAP, AT_MAGC, AT_HUGS, AT_ENGL } from './const.js'; // monattk.h
import { shkgone, unpaid_cost, currency, obfree, costly_spot } from './shk.js';
import { in_rooms } from './hack.js';
import { is_mines_prize, is_soko_prize } from './cmd.js';
import { mpickobj } from './steal.js';
import { AD_FIRE, AD_RUST } from './mhitm.js';
import { a_monnam, noname_monnam, mon_nam_too } from './do_name.js';
import { obj_pmname as obj_pmname_real } from './do_name.js';
import { noit_mon_nam } from './do_name.js';
import { PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_KILLER_BEE, PM_LONG_WORM } from './pm.generated.js';
import { costly_alteration } from './cmd.js';
import { u_locomotion } from './hack.js';
import { mergable } from './invent.js';
import { surface } from './dungeon.js';
import { domonnoise } from './sounds.js';
import { NATTK, COST_DEGRD, COST_CONTENTS, M_ATTK_AGR_DIED, M_ATTK_DEF_DIED, M_ATTK_HIT, M_ATTK_MISS } from './const.js';
import { Amonnam } from './do_name.js';
import { shade_miss as shade_miss_hm, AD_CORR } from './uhitm.js';
import { rloc_to } from './teleport.js';
import { expels_gu, digests_gu } from './mhitu.js';
import { SUPPRESS_HALLUCINATION, LOW_PM } from './const.js';
import { quest_monster_died } from './quest.js';
import { PM_MAIL_DAEMON } from './pm.generated.js';
import { touch_artifact_mon, kop_revival, record_death_achievement, NON_PM } from './mklev.js';
import { add_to_minv as add_to_minv_real, obj_timer_checks } from './mkobj.js';
import { lifesaved_monster, m_consume_obj, monnear } from './mon.js';
import { newobj } from './game.js';
import { beg } from './sounds.js';
import { is_pole as is_pole_dm, xytodir as xytodir_dm, dirtocoord as dirtocoord_dm } from './cmd.js';
import { flooreffects as flooreffects_dm } from './do.js';
import { wizdeadorgone } from './wizard.js';
import { set_msg_xy as set_msg_xy_dm } from './pline.js';
import { obj_no_longer_held } from './do.js';
import { impossible as polystone_impossible } from './pline.js';
import { m_in_out_region as m_in_out_region_dm, create_gas_cloud as create_gas_cloud_dm } from './region.js';
import { set_apparxy as set_apparxy_dm, itsstuck, find_pmmonst, bee_eat_jelly } from './monmove.js';
// @ts-nocheck
// js/dogmove.js — Pet AI: dog_move, dog_goal, dog_invent, dog_hunger helpers.
// C ref: nethack-c/src/dogmove.c
// Hand-maintained JS (not tsc-emitted). Mirrors C source structure.
// WIRE_PENDING: port-m_move-monmove-1779329519 — called from monmove.js:m_move
import { rn1 } from './rng.js';
import { rn2, rnd, d } from './rnd.js';
/* C zap.c:1458 obj_resists — the single body (see the re-export below). */
import { obj_resists, drain_item } from './zap.js';
import { mon_explodes as mon_explodes_dm } from './explode.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { sticks, dismount_steed as dismount_steed_qm } from './dog.js';
import { unstuck as unstuck_dm } from './mon.js';
import { m_unleash } from './apply.js';
import { topl_force_break_after as topl_force_break_after_qm, GLYPHCLS_OBJ as GLYPHCLS_OBJ_DM, Deaf as Deaf_dm, flush_screen, nh_sprintf } from './display.js';
import { snuff_lit } from './apply.js';
import { whimper as whimper_dm } from './sounds.js';
import { mwelded as mwelded_dm } from './wield.js';
import { PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_PYROLISK } from './pm.generated.js';
import { SUPPRESS_NAME, SUPPRESS_IT, SUPPRESS_INVISIBLE, NO_NC_FLAGS } from './const.js';
import { y_monnam as y_monnam_qm } from './do_name.js';
import { mon_hates_silver, stagger as stagger_dm, locomotion, same_race } from './mondata.js';
import { an as an_qm, makeplural as makeplural_dm, vtense, simpleonames } from './objnam.js';
import { oname as oname_dm } from './do_name.js';
import { OC_DESCR as OC_DESCR_QM } from './oc_descr_data.js';
import { OC_NAME as OC_NAME_QM } from './oc_name_data.js';
import { DEFSYM_EXPLANATION as DEFSYM_EXPL_QM } from './defsym_data.js';
import { check_gear_next_turn as check_gear_next_turn_dm } from './mon.js';
import { In_sokoban, In_sokoban as In_sokoban_dm } from './const.js';
import { PLNMSG_HIDE_UNDER as PLNMSG_HIDE_UNDER_C } from './const.js';
import { HALLUC, HALLUC_RES } from './const.js';
import { PROT_FROM_SHAPE_CHANGERS as PROT_SHAPE_QM, DISMOUNT_POLY } from './const.js';
import { mon_mattk_raw, getmattk, could_seduce, mattacku, mswings_verb, mhis_mon as mhis_mon_mu } from './mhitu.js';
import { breamm as breamm_mu, spitmm } from './mthrowu.js';
import { monshoot } from './mthrowu.js';
import { m_lined_up } from './mthrowu.js';
import { m_is_steadfast } from './uhitm.js';
import { select_rwep } from './weapon.js';
import { ammo_and_launcher as ammo_and_launcher_dm } from './hold_another_object.js';
import { nomul as nomul_dm } from './hack.js';
import { x_monnam, hliquid, noit_Monnam, some_mon_nam } from './do_name.js';
import { game, wizard } from './gstate.js';
/* C do_name.c Mgender()/pmname(): the real bodies, not file-local copies. */
import { Mgender as Mgender_dm, pmname as pmname_dm } from './do_name.js';
import { place_monster } from './steed.js';
import { pre_mm_attack } from './mhitm.js';
import { dist2, s_suffix } from './hacklib.js';
import { couldsee as couldsee_vision, clear_path, do_clear_area, cansee, recalc_block_point } from './vision.js';
import { gettrack, hastrack } from './track.js';
import { t_at } from './trap.js';
import { find_mac as find_mac_mon, extract_from_minvent as extract_from_minvent_tp } from './worn.js';
import { pushRngLogEntry } from './rng.js';
import { obj_stop_timers, obj_split_timers, end_burn } from './timeout.js';
import { IS_ROOM, OBJ_FREE, OBJ_DELETED, OBJ_MINVENT, OBJ_FLOOR, W_WEP, W_ARMS, W_SADDLE, SHOPBASE, IRONBARS, IS_OBSTRUCTED, IS_TREE, ERODE_NONE, ERODE_CORRODE, ERODE_RUST, ERODE_BURN, EF_GREASE, EF_VERBOSE, PASSES_WALLS } from './const.js';
import { resists_ston, resists_poison } from './mklev.js';
import { place_object, mkcorpstat, mksobj_at, add_to_container, dealloc_obj, mksobj as mksobj_dg, set_corpsenm as set_corpsenm_dg } from './mkobj.js';
import { makemon } from './makemon.js';
import { set_ustuck, mondead, newcham, mongone, minliquid as minliquid_real, healmon as healmon_dg, wake_nearto as wake_nearto_dg, mlifesaver as mlifesaver_dg } from './mon.js';
import { is_pool } from './look.js';
import { closed_door, accessible } from './monmove.js';
import { may_dig } from './hack.js';
import { erode_obj, mintrap as mintrap_real } from './trap.js';
import { goodpos as goodpos_real } from './teleport.js';
import { m_useup as m_useup_dg } from './mthrowu.js';
import { PM_WEREJACKAL, PM_WEREWOLF, PM_WERERAT, PM_HUMAN_WEREJACKAL, PM_HUMAN_WEREWOLF, PM_HUMAN_WERERAT } from './pm.generated.js';
import { PM_GHOUL, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_STEAM_VORTEX, PM_AIR_ELEMENTAL, PM_BLACK_PUDDING, PM_BROWN_PUDDING, PM_SHADE, PM_DEATH, PM_PESTILENCE, PM_FAMINE, PM_CHICKATRICE, PM_COCKATRICE, PM_MEDUSA, PM_STONE_GOLEM, PM_ANGEL, PM_RUST_MONSTER, PM_GELATINOUS_CUBE, PM_ARCHON } from './pm.generated.js';
import { grow_up, nonliving, monPmname, splitobj, nextoid, permonstTemplate, emits_light } from './makemon.js';
import { dmgtype_fromattack, set_mon_data } from './mondata.js';
import { onscary } from './monmove.js';
import { zombie_maker } from './mon.js';
import { which_armor } from './worn.js';
import { del_light_source, obj_merge_light_sources, obj_split_light_source } from './light.js';
import { monst_to_any } from './hack.js';
import { LS_MONSTER } from './const.js';
import { newsym, _topline_more_pending, _more_never_dismissed, _more_pages_exceed_input, flush_pending_messages, mon_visible, canseemon, canspotmon, map_invisible, glyph_is_invisible_at, GLYPHCLS_INVIS, unmap_object, Deaf, sensemon, impossible_sync, Unaware } from './display.js';
import { pline, pline_xy, Your, You_hear } from './pline.js';
import { W_ARMG, ACID_RES, COLD_RES, FIRE_RES, SHOCK_RES, STRAT_WAITMASK } from './const.js';
import { Japanese_item_name, xname_scroll, xname_armor, doname, distant_name, in_distant_name } from './objnam.js';
import { is_quest_artifact } from './questpgr.js';
/* C o_init.c:441-452 observe_object(obj) — the ONE side effect a formatting
 * call has, and the reason distant_name() exists at all.  Imported here
 * because _dm_doname() below reproduces xname_flags()'s prologue for the
 * per-class arms, which reach js/objnam.js's _xname_arm() directly and so
 * never run it themselves. */
import { observe_object as observe_object_dm } from './o_init.js';
/* C youprop.h:103 Blind — prop.h BLINDED. */
import { BLINDED as BLINDED_DM } from './const.js';
import { FF_FAITHFUL } from './fastforward.js';
import { remove_worm, wormgone as wormgone_real,
         place_worm_tail_randomly } from './worm.js';

import monsPack from './makemon_mons.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import { oc_delay, oc_nutrition, mons_cnutrit } from './food_props.js';
import { eaten_stat } from './eat.js';
import monMsoundPack_dm from './makemon_msound.json' with { type: 'json' };
import { resists_cold as resists_cold_pm, resists_fire as resists_fire_pm, resists_elec as resists_elec_pm } from './uhitm.js';
import { golemeffects as golemeffects_pm } from './mon.js';
import { m_at, mhitm_adtyping } from './uhitm.js';
import { corpse_chance as corpse_chance_uh } from './mon.js';
import { mon_wield_item, setmnotwielded, hitval } from './weapon.js';
import { perceives as perceives_dm } from './mcastu.js';
import { mon_givit as mon_givit_dg } from './mon.js';
import { _mon_reflects_zap as mon_reflects_dm } from './zap.js';
import { attk_protection } from './mhitm.js';
import { erode_armor } from './uhitm.js';
import { dmgtype, attacktype, max_passive_dmg, resist_conflict, poly_when_stoned } from './mondata.js';
import { Adjmonnam as Adjmonnam_gz } from './do_name.js';
import { resists_blnd as resists_blnd_gz } from './mondata.js';
import { mhitm_ad_blnd as mhitm_ad_blnd_gz } from './uhitm.js';
import { seemimic } from './mon.js';
import { resists_magm as resists_magm_dm, defended as defended_dm, Resists_Elem } from './mondata.js';
import { slimeproof, M2_NEUTER, ROCK_CLASS, G_NOCORPSE, G_GENOD } from './mklev.js';
import { erosion_matters } from './objnam.js';
import { PM_GREEN_SLIME } from './pm.generated.js';
import { is_rustprone, clone_mon_ml as clone_mon, split_mon_ml } from './mklev.js';
import { On_stairs } from './stairs.js';
import { mfndpos, make_corpse, zombie_form } from './mon.js';
import { isok, is_pit, ARTICLE_A, ARTICLE_NONE, MON_DETACH, CORPSTAT_NONE, CORPSTAT_FEMALE, CORPSTAT_MALE, CORPSTAT_HISTORIC, G_GONE, CONFLICT as CONFLICT_DM, engulfing_u as engulfing_u_const, MAGIC_PORTAL } from './const.js';
import { thiefdead } from './steal.js';
import { otrapped_of } from './const.js';   /* obj.h:139 #define opoisoned otrapped */
import { should_displace, undesirable_disp, _can_open_mv, _passes_bars_mv, m_avoid_soko_push_loc, m_avoid_kicked_loc, m_digweapon_check } from './monmove.js';
import { mon_allowflags } from './mon.js';
import { enexto_out, rloc as rloc_tp, tele_restrict as tele_restrict_tp } from './teleport.js';
import { vamprises } from './mon.js';
import { stop_occupation as stop_occupation_dm } from './allmain.js';
import { grddead } from './vault.js';
/* MONS row layout: [mlet, mlevel, mov, geno, malign, mr, mflags1, mflags2, ...] */
const _MONS = /** @type {number[][]} */ (monsPack.mons);
/* C monflag.h dietary M1_* flags (permonst.mflags1 column 5 of MONS_ROWS). */
import { M1_HERBIVORE } from './dog.js';
import { M1_CARNIVORE } from './dog.js';
/* Monster size array — same source as uhitm.js MONS_MSIZE */
const MONS_MSIZE = monMsizePack.msize;
const MZ_TINY  = 0;
const MZ_SMALL = 1;
/* C monflag.h:177-183 — note MZ_GIGANTIC is 7, not 5. */
const MZ_MEDIUM = 2;
const MZ_GIGANTIC = 7;
/* monflag.h:201 G_NOCORPSE — species leaves no corpse ever.  G_GONE
 * (G_GENOD|G_EXTINCT, monflag.h:211) is the runtime half of the same
 * mvitals[].mvflags word and comes from js/const.js, which is authoritative for
 * constant VALUES.  (The file-local G_NOCORPSE copy that used to live here went
 * away with the inlined corpse path — js/mklev.js's make_corpse owns that test
 * now, on the correct side of C's special-species switch.) */
const MONS_AC = [3,-1,3,3,4,-4,8,8,8,8,6,6,7,7,7,7,6,5,5,4,4,4,4,4,4,4,2,10,9,4,4,4,6,5,6,6,6,4,6,-10,2,-4,-2,10,10,5,10,10,5,0,7,6,2,7,2,5,8,8,8,10,10,10,6,8,7,7,7,9,9,9,10,10,10,10,10,10,5,10,3,0,0,7,0,4,2,6,5,5,7,7,6,6,0,0,3,3,4,3,3,3,6,2,2,2,5,4,0,2,2,2,2,2,5,5,5,6,9,-4,0,0,3,5,0,-4,-5,-6,8,7,6,6,4,3,2,2,2,2,2,2,2,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3,2,2,2,2,9,9,9,9,9,7,7,10,10,4,10,0,0,6,4,3,3,3,-3,6,-2,10,10,10,10,0,-2,-4,-6,6,6,5,5,4,4,4,3,6,6,6,6,4,2,2,0,5,3,4,8,8,6,6,3,3,2,-10,8,3,3,5,2,2,4,2,0,4,-4,2,1,0,-6,5,4,0,-2,6,6,5,6,6,6,10,10,9,9,9,8,6,10,6,4,10,10,8,6,6,4,9,7,5,1,3,10,10,10,10,10,10,10,10,10,10,5,0,10,10,0,10,7,10,10,0,10,10,10,10,2,-8,0,-5,10,-4,0,-5,2,0,-6,0,-2,-1,-4,-1,-3,4,-2,-7,-5,-6,-3,-2,-5,-7,-8,-5,-5,-5,10,4,6,4,2,-1,-3,6,8,8,7,7,6,6,5,-1,0,10,10,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,7,0,0,0,10,0,0,-2,0,0,0,-1,-10,-2,10,0,0,2,0,10,10,10,10,10,10,10,10,10,10,10,10,10,10];
/* x_monnam(do_name.c:943-945) "saddled " adjective: prepended to the base monster
 * name when the monster is wearing a saddle and the hero can perceive it normally:
 *   do_saddle && (mtmp->misc_worn_check & W_SADDLE) && !Blind && !Hallucination
 * mon_nam()/Monnam() pass SUPPRESS_SADDLE only when the monster has a given name
 * (do_name.c:1037-1045), so the adjective appears only for unnamed monsters — which
 * is the case handled below (the given-name branch returns before reaching here). */
function _saddled_prefix_dm(mtmp) {
    const f = game?.flags || {};
    if (f.blind || f.hallucination) return '';
    if ((((mtmp?.misc_worn_check ?? 0) | 0) & W_SADDLE) !== 0) return 'saddled ';
    return '';
}
/* mon_nam_dm(mtmp) — "the newt" style name for defender.
 * C ref: mon.c mon_nam() → do_name.c x_monnam().
 * When !canspotmon(mdef), C do_it=TRUE → returns "it". Mirror here.
 * C ref: do_name.c:863 x_monnam: do_it = !canspotmon(mtmp) && article==THE. */
/* C const.js spellings, local to keep this file's import list unchanged. */
const ARTICLE_THE_DM = 1;      /* hack.h ARTICLE_THE */
const SUPPRESS_SADDLE_DM = 0x08;
function _has_mgivenname_dm(mtmp) {
    if (!mtmp) return false;
    return !!(mtmp?.mextra?.mgivenname
              || (('mgivenname' in mtmp) ? mtmp.mgivenname : ''));
}
/* C do_name.c:1319-1345 obj_pmname(obj) — the corpse/statue/figurine species
 * name, whose gender comes from the CORPSTAT_GENDER bits of obj->spe
 * (hack.h:1189-1199), not from any monst.  The partial namer this used to be
 * (corpsenm straight to monPmname) dropped C's otyp CORPSE/STATUE/FIGURINE +
 * ismnum guard, the PM_ALIGNED_CLERIC && CORPSTAT_RANDOM -> PM_CLERIC swap,
 * and the impossible() + "two-legged glorkum-seeker" fallback; it forwards to
 * the one shared port now (js/mhitm.js obj_pmname), the same convention as
 * mon_nam_dm above routing through x_monnam. */
function obj_pmname_dm(obj) {
    return obj_pmname_real(obj);
}
function mon_nam_dm(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE_DM, null,
                    _has_mgivenname_dm(mtmp) ? SUPPRESS_SADDLE_DM : 0, false);
}
/* Monnam_dm(mtmp) — "Sirius" or "The newt" for aggressor.
 * C ref: mon.c Monnam() → do_name.c x_monnam().
 * When the monster cannot be spotted (!canspotmon), C's do_it=TRUE fires and
 * x_monnam returns "it"; Monnam capitalizes to "It". Mirror that here:
 *   do_it = !canspotmon(mtmp) && not u.usteed && not gameover && not suppress.
 * C ref: do_name.c:863-865 x_monnam: do_it = !canspotmon(mtmp) && ... */
/* C ref: do_name.c:1073-1080 Monnam(mtmp) = highc(*mon_nam(mtmp)).  highc()
 * only uppercases a-z (hacklib.h), so a bogus name that already starts with a
 * capital ("Barney the dinosaur") is returned unchanged. */
export function Monnam_dm(mtmp) {
    const bp = mon_nam_dm(mtmp);
    if (!bp) return bp;
    const c = bp.charAt(0);
    return (c >= 'a' && c <= 'z') ? c.toUpperCase() + bp.slice(1) : bp;
}
/* M_ATTK_HIT / M_ATTK_DEF_DIED / M_ATTK_AGR_DIED (C monattk.h via const.js) */
/* FF_FAITHFUL gating uses the single module source of truth imported from
 * fastforward.js (`env.FF_FAITHFUL !== '0'` = DEFAULT-ON).  Every faithful-only
 * RNG site below references that const directly so dogmove's gating is
 * bit-consistent with the moveloop (no ad-hoc `=== '1'` reads). */
/* Attack type constants — C ref: nethack-c/include/monattk.h:12-29.
 * THESE MUST BE C'S NUMBERS.  They are compared against the RAW C-numbered
 * rows returned by mon_mattk_raw() (mattackm's switch, pet_has_ranged_attk,
 * the AT_ENGL glomper test), so any JS-local
 * renumbering silently mis-classifies real attack rows and desynchronises the
 * RNG stream in BOTH directions (skipping / inventing rnd(20+i) in mattackm).
 * C numbering is NOT contiguous: 7 is followed by 10, and AT_WEAP/AT_MAGC are
 * 254/255. */
import { AT_BUTT } from './const.js'; /* monattk.h:16 */
/* Damage type constants — C ref: nethack-c/include/monattk.h:42,61,68,70,74 */
export const AD_PHYS  = 0;   /* monattk.h:42 — ordinary physical */
/* NATTK — max attacks per monster */
/* Pet attack data for common domestic pets — [mndx, aatyp, adtyp, damn, damd].
 * C ref: nethack-c/include/monsters.h — all starting pets have AT_BITE AD_PHYS d(1,6).
 * C ref: u_init.c pet_type() — starting pets are PM_LITTLE_DOG, PM_DOG, PM_KITTEN, PM_HOUSECAT. */
const PET_ATTK = new Map([
    [16, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_LITTLE_DOG */
    [18, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_DOG */
    [32, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_KITTEN */
    [33, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_HOUSECAT */
]);

/* -----------------------------------------------------------------------
 * dogfood classification constants (mextra.h dogfood_types)
 * C ref: nethack-c/include/mextra.h
 * ----------------------------------------------------------------------- */
const DOGFOOD = 0;
const CADAVER = 1;
const ACCFOOD = 2;
const MANFOOD = 3;
const APPORT = 4;
/* POISON = 5; UNDEF = 6; TABU = 7 */
const UNDEF   = 6;

/* -----------------------------------------------------------------------
 * Object type constants used by obj_resists / dogfood
 * C ref: nethack-c/include/objclass.h  objects.h
 * ----------------------------------------------------------------------- */
/* obj_resists' special-otyp constants live with its single body in js/zap.js. */
/* oclass constants */
const FOOD_CLASS  = 7;
const COIN_CLASS  = 12;
const BALL_CLASS  = 15;
const CHAIN_CLASS = 16;
const COIN_CLASS_  = 12;        /* alias for clarity in weight() */

const OC_WEIGHT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,5,30,30,30,35,36,20,25,10,10,10,12,10,5,5,5,20,20,60,120,30,30,30,30,40,40,70,70,40,150,40,60,40,80,50,50,75,150,120,125,60,80,120,150,100,120,180,30,36,120,50,30,20,40,15,15,20,30,30,30,30,3,50,3,30,40,3,4,4,10,40,30,50,50,50,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,450,415,450,400,350,150,150,300,300,250,200,250,250,150,30,5,5,3,10,10,10,10,15,10,15,10,10,10,10,30,30,30,40,50,50,100,100,50,10,10,30,10,10,50,20,20,15,20,15,50,20,15,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,20,20,20,20,20,20,20,20,20,20,20,20,20,350,600,900,15,15,15,15,3,4,1,2,2,30,20,20,12,13,150,3,2,5,200,12,4,100,4,15,50,2,200,200,3,3,5,5,18,18,18,18,30,30,30,10,25,25,100,30,20,10,10,10,0,1,1,1,400,5,20,20,20,20,1,1,2,2,2,5,2,2,1,1,5,2,10,2,1,2,5,15,20,10,10,10,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,10,50,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,10,500,10,10,10,6000,2500,480,120,1,1,0];
const MONS_CWT = [10,1,20,30,200,1,30,200,600,10,30,30,300,300,300,300,150,400,400,800,500,500,250,850,700,200,600,10,10,10,10,10,150,200,600,600,600,250,600,750,100,1000,1200,500,900,1250,900,900,1450,1450,100,60,20,150,200,300,50,50,50,400,450,500,450,60,300,600,800,600,600,600,400,1000,850,1000,1200,1300,1000,1350,200,400,400,400,2500,1200,2500,2650,3800,3800,20,30,30,40,30,30,50,50,200,50,800,800,1300,1300,1300,1300,1500,1800,0,0,0,0,0,0,600,600,1500,2700,15,300,0,0,1200,900,1450,1450,1450,1450,20,30,40,30,2500,2550,2550,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,900,0,0,2500,2500,20,50,50,50,50,100,100,650,700,700,750,2250,2250,2200,2250,2250,1700,2250,2300,1500,1300,1450,1450,1450,1450,1200,1200,1200,1200,400,650,850,900,800,1450,1700,2050,500,500,500,500,2600,2600,2600,2600,1600,1700,1700,500,500,400,900,1450,1450,1000,750,50,100,150,250,100,250,800,1000,1200,1200,1500,1200,1450,1450,1450,1200,0,1450,1200,100,1100,1700,1600,1250,1550,400,650,850,900,800,1450,1700,400,2050,300,400,400,450,450,800,900,1400,1550,1900,1800,2000,1450,1450,1450,1450,800,800,800,800,800,800,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1500,1450,1500,900,1500,1500,1500,1500,1500,1500,1450,1450,1450,600,1500,80,60,500,200,200,1800,10,10,30,200,10,100,1450,1500,0,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,2200,1450,1450,1450,1800,1450,1450,1450,4500,1900,4500,1450,1450,750,1450,1450,2250,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450];

const MZ_LARGE     = 3;
const MZ_HUGE      = 4;
const BAG_OF_HOLDING_OTYP = 219; /* objects.h TOOL_CLASS BAG_OF_HOLDING */
const STATUE_OTYP  = 476; /* objects.h ROCK_CLASS STATUE (215 was `chest`) */
const HEAVY_IRON_BALL_OTYP = -1; /* not tracked in JS dog path */
const CANDELABRUM_OTYP = 261;
const M2_ROCKTHROW = 0x08000000;
const M1_TUNNEL    = 0x00000020; /* monflag.h:90 */
const M1_NEEDPICK  = 0x00000040; /* monflag.h:91 */
const M1_NOHANDS   = 0x00002000;
const M1_MINDLESS  = 0x00010000;
const M1_ANIMAL    = 0x00040000;
const PICK_AXE_OTYP         = 259;
const DWARVISH_MATTOCK_OTYP = 71;
const UNICORN_HORN_OTYP     = 261;
const SKELETON_KEY_OTYP     = 221;
const LOCK_PICK_OTYP        = 222;
const CREDIT_CARD_OTYP      = 223;
const GOLD_PIECE_OTYP       = 438; /* objects.h COIN_CLASS GOLD_PIECE */
const SCR_MAIL_OTYP         = 364; /* objects.h SCROLL_CLASS SCR_MAIL */
function is_pick_otyp(otyp) {
    return (otyp | 0) === PICK_AXE_OTYP || (otyp | 0) === DWARVISH_MATTOCK_OTYP;
}
const S_NYMPH      = 14;
const LARGEST_INT  = 32767;

/* -----------------------------------------------------------------------
 * weight — C ref: mkobj.c:1888 weight(struct obj *).
 * Returns the cached/computed object weight = objects[otyp].oc_weight * quan
 * for the common case; container/statue/corpse/coin special cases follow C.
 * JS objects rarely carry a precomputed owt, so we compute from the table.
 * ----------------------------------------------------------------------- */
function obj_weight(obj) {
    const otyp = obj.otyp | 0;
    const quan = Math.max(1, (obj.quan ?? 1) | 0);
    let wt = (otyp >= 0 && otyp < OC_WEIGHT.length) ? (OC_WEIGHT[otyp] | 0) : 0;

    if (Object.hasOwn(obj, 'globby') && obj.globby)
        return (obj.owt | 0);

    /* C: containers / statue — JS dog path objects are not containers;
     * handle STATUE corpse-weight branch faithfully when corpsenm present. */
    const isContainer = !!(Object.hasOwn(obj, 'cobj') && obj.cobj);
    if (isContainer || otyp === STATUE_OTYP) {
        let stwt = wt;
        if (otyp === STATUE_OTYP && (obj.corpsenm ?? -1) >= 0) {
            const cn = obj.corpsenm | 0;
            const msize = (cn < MONS_MSIZE.length) ? (MONS_MSIZE[cn] | 0) : 0;
            const minwt = (msize + msize + 1) * 100;
            stwt = Math.trunc(3 * ((cn < MONS_CWT.length ? MONS_CWT[cn] : 0) | 0) / 2);
            if (stwt < minwt) stwt = minwt;
            stwt *= quan;
        }
        let cwt = 0;
        for (let c = obj.cobj; c; c = c.nobj) cwt += obj_weight(c);
        if (otyp === BAG_OF_HOLDING_OTYP)
            cwt = obj.cursed ? (cwt * 2)
                : obj.blessed ? Math.trunc((cwt + 3) / 4)
                    : Math.trunc((cwt + 1) / 2);
        return stwt + cwt;
    }

    /* C: CORPSE uses cwt of the corpse's monster. */
    if (otyp === CORPSE_OTYP && (obj.corpsenm ?? -1) >= 0) {
        const cn = obj.corpsenm | 0;
        let lwt = quan * ((cn < MONS_CWT.length ? MONS_CWT[cn] : 0) | 0);
        if (lwt > LARGEST_INT) lwt = LARGEST_INT;
        /* C mkobj.c:1960-1961: a partly eaten corpse weighs its uneaten share */
        if (obj.oeaten) lwt = eaten_stat(lwt | 0, obj);
        return lwt | 0;
    }
    /* C mkobj.c:1964-1965 */
    if ((obj.oclass | 0) === FOOD_CLASS && obj.oeaten)
        return eaten_stat(quan * wt, obj);
    if ((obj.oclass | 0) === COIN_CLASS_) {
        const cwt = Math.trunc((quan + 50) / 100);
        return Math.max(cwt, 1);
    }
    if (otyp === CANDELABRUM_OTYP && (obj.spe | 0))
        return wt + (obj.spe | 0) * (OC_WEIGHT[20] | 0); /* TALLOW_CANDLE oc_weight */

    return wt ? wt * quan : ((quan + 1) >> 1);
}




/* mfndpos return data fields referenced in dogmove */
const ALLOW_M    = 0x00080000;
const ALLOW_MDISP= 0x00001000;
const ALLOW_TRAPS= 0x00020000;
const ALLOW_U    = 0x00040000;
/* C macro Conflict (youprop.h:218) := HConflict || EConflict, i.e.
 * u.uprops[CONFLICT].{intrinsic,extrinsic}.  Same reader js/monmove.js
 * _conflict_mv() and js/mklev.js mon_allowflags use. */
function _conflict_dm() {
    const p = game.u?.uprops?.[CONFLICT_DM];
    return !!(p && (p.intrinsic || p.extrinsic));
}
const ALLOW_ROCK = 0x02000000; /* C mfndpos.h: pushes rocks; not set for ordinary pets */

/* MMOVE return codes (C monmove.h) */
const MMOVE_NOTHING = 0;
const MMOVE_MOVED   = 1;
const MMOVE_DIED    = 2;
const MMOVE_DONE    = 3;

/* Dimension constants */
const COLNO      = 80;
const ROWNO      = 21;
const MTSZ       = 4;
const SQSRCHRADIUS = 5;

/* Dog hunger thresholds (C dogmove.c) */
const DOG_HUNGRY  = 300;
const DOG_WEAK    = 500;
const DOG_STARVE  = 750;

/* -----------------------------------------------------------------------
 * obj_resists — C ref: zap.c:1458-1472.  ONE BODY, in js/zap.js.
 *
 * This file used to carry a SECOND copy, and the copy had DRIFTED: it omitted
 * C's fifth disjunct
 *     || (obj->otyp == CORPSE && is_rider(&mons[obj->corpsenm]))   [zap.c:1462]
 * behind a comment claiming riders were not tracked.  They are — js/zap.js
 * carries the clause against PM_DEATH / PM_PESTILENCE / PM_FAMINE
 * (mondata.h:161-163, is_rider).  Eleven call sites reached the rider-less
 * copy, and at the seven that pass ochance == achance == 0 the special-object
 * list is the ONLY thing that can return TRUE, so the missing clause was the
 * entire discriminator, not an edge case.  C names that intent at two of them:
 * dig.c:2001 "obj_resists(,0,0) prevents Rider corpses from being buried" and
 * invent.c:1445-1447 delobj_core's unforced guard.
 *
 * Re-exported rather than re-implemented so the two bodies cannot drift again.
 * zap.js and this file are already in the same import cycle (zap.js -> mklev.js
 * -> dogmove.js and dogmove.js -> mhitu.js -> zap.js), so the direct edge adds
 * no new cycle; obj_resists is a hoisted function declaration and is never
 * called during module evaluation.
 * ----------------------------------------------------------------------- */
export { obj_resists } from './zap.js';

const CORPSE_OTYP            = 265;
const LUMP_OF_ROYAL_JELLY_OTYP = 286;

const M2_HUMAN     = 0x00000008;
const M2_ELF       = 0x00000010;
const M2_DWARF     = 0x00000020;
const M2_GNOME     = 0x00000040;
const M2_GIANT     = 0x00002000; /* monflag.h:136 (0x200 is M2_MERC) */
const S_VORTEX     = 22;
const S_LIGHT_C    = 25;
const S_GHOST      = 54;
const S_GOLEM      = 55;

function _mlet(mndx)  { return (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][0] | 0) : 0; }
function _mf1(mndx)   { return (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][6] | 0) : 0; }
function _mf2(mndx)   { return (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][7] | 0) : 0; }
function _is_human(mndx)    { return (_mf2(mndx) & M2_HUMAN) !== 0; }
function _is_elf(mndx)      { return (_mf2(mndx) & M2_ELF) !== 0; }
function _is_dwarf(mndx)    { return (_mf2(mndx) & M2_DWARF) !== 0; }
function _is_gnome(mndx)    { return (_mf2(mndx) & M2_GNOME) !== 0; }
function _is_giant(mndx)    { return (_mf2(mndx) & M2_GIANT) !== 0; }
function _is_golem(mndx)    { return _mlet(mndx) === S_GOLEM; }
function _noncorporeal(mndx){ return _mlet(mndx) === S_GHOST; }
/* C mondata.h is_mind_flayer — mlet S_MIND_FLAYER not needed for early pets;
 * approximate via PM range omitted (no mind-flayer corpses early). */
function _is_mind_flayer(mndx) {
    return (mndx | 0) === 48 /* PM_MIND_FLAYER */
        || (mndx | 0) === 49 /* PM_MASTER_MIND_FLAYER */;
}

/* C monst.h ismnum(x): LOW_PM (0) <= x < NUMMONS. _MONS.length == NUMMONS. */
function ismnum_js(x) { return (x | 0) >= 0 && (x | 0) < _MONS.length; }


/* -----------------------------------------------------------------------
 * cursed_object_at — C ref: dogmove.c:146-153
 * Returns true if any object at (x,y) is cursed.
 * No RNG.
 * ----------------------------------------------------------------------- */
function cursed_object_at(x, y) {
    const lobj = game.level?.levelObjects?.[x]?.[y];
    for (let o = lobj; o; o = o.nexthere) {
        if (o.cursed)
            return true;
    }
    return false;
}

/* C dogmove.c:347-358 — shared by both starvation paths in dog_hunger. */
async function dog_starve(mtmp) {
    if ((mtmp.mleashed | 0) && mtmp !== game.u?.usteed)
        await pline('Your leash goes slack.');
    else if (cansee(mtmp.mx | 0, mtmp.my | 0))
        await pline_mon(mtmp, `${Monnam_dm(mtmp)} starves.`);
    else
        await You_feel('%s for a moment.', dm_hallucinating() ? 'bummed' : 'sad');
    await mondied_dm(mtmp);
}

/* -----------------------------------------------------------------------
 * dog_hunger — C ref: dogmove.c:362-398
 * Returns true if pet starves this turn (which is rare early-game).
 * No RNG in the common case (pet has enough food: moves < hungrytime+DOG_WEAK).
 * ----------------------------------------------------------------------- */
async function dog_hunger(mtmp, edog) {
    const moves = (game.moves ?? 0) | 0;
    if (moves <= (edog.hungrytime | 0) + DOG_WEAK)
        return false;
    const mndx = (mtmp.data?.pmidx ?? mtmp.mnum ?? mtmp.mndx ?? -1) | 0;
    const mf1 = (_MONS[mndx]?.[6] | 0);
    const herbi = !!(mf1 & M1_HERBIVORE);
    const carni = !!(mf1 & M1_CARNIVORE);
    if (!herbi && !carni) {
        edog.hungrytime = moves + DOG_WEAK;
        return false;
    }
    if (!edog.mhpmax_penalty) {
        const oldmax = mtmp.mhpmax | 0;
        const newmax = Math.trunc(oldmax / 3);
        mtmp.mconf = 1;
        edog.mhpmax_penalty = oldmax - newmax;
        mtmp.mhpmax = newmax;
        if ((mtmp.mhp | 0) > newmax)
            mtmp.mhp = newmax;
        if ((mtmp.mhp | 0) < 1) {
            await dog_starve(mtmp);
            return true;
        }
        if (cansee(mtmp.mx | 0, mtmp.my | 0))
            await pline_mon(mtmp, `${Monnam_dm(mtmp)} is confused from hunger.`);
        else if (couldsee_vision(mtmp.mx | 0, mtmp.my | 0))
            await beg(mtmp);
        else
            await You_feel('worried about %s.', y_monnam_qm(mtmp));
        /* C dogmove.c:386 — hunger confusion interrupts any occupation after
         * the pet's message has been emitted. */
        await stop_occupation_dm();
        return false;
    }
    if (moves > (edog.hungrytime | 0) + DOG_STARVE || (mtmp.mhp | 0) < 1) {
        await dog_starve(mtmp);
        return true;
    }
    return false;
}

export function obj_extract_floor(obj) {
    if (!obj) return;
    const xi = obj.ox | 0;
    const yi = obj.oy | 0;
    /* per-tile nexthere chain */
    const lvlObjs = game.level?.levelObjects;
    if (lvlObjs?.[xi]) {
        let head = lvlObjs[xi][yi];
        if (head === obj) {
            lvlObjs[xi][yi] = obj.nexthere ?? null;
        } else {
            for (let o = head; o; o = o.nexthere) {
                if (o.nexthere === obj) { o.nexthere = obj.nexthere; break; }
            }
        }
    }
    /* global fobj nobj chain */
    if (game.fobj === obj) {
        game.fobj = obj.nobj ?? null;
    } else {
        for (let o = game.fobj; o; o = o.nobj) {
            if (o.nobj === obj) { o.nobj = obj.nobj; break; }
        }
    }
    obj.nexthere = null;
    obj.nobj = null;
    obj.where = OBJ_FREE;
    // C remove_object updates vision after unlinking a boulder. Another
    // boulder on the same square can still block, hence recalc rather than
    // unconditionally making the square transparent.
    if ((obj.otyp | 0) === BOULDER_OTYP)
        recalc_block_point(xi, yi);
    // C mkobj.c:2519-2520: taking a corpse off ice restores its decay rate.
    if (obj.timed)
        obj_timer_checks(obj, xi, yi, 0);
}

import { acid_damage } from './trap.js';
function MON_WEP_dm(mon) {
    /* C MON_WEP(mon) = mon->mw (the wielded weapon). */
    if (mon.mw) return mon.mw;
    for (let o = mon.minvent; o; o = o.nobj)
        if (((o.owornmask | 0) & W_WEP) !== 0) return o;
    return null;
}
export function droppables(mon) {
    const mndx = (mon.mndx ?? mon.mnum ?? -1) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    const mflags1 = mrow ? (mrow[6] | 0) : 0;
    const isAnimalOrMindless = !!(mflags1 & (M1_ANIMAL | M1_MINDLESS));

    /* dummy keeper sentinel: a non-null marker meaning "already have one". */
    const DUMMY = { otyp: GOLD_PIECE_OTYP, oartifact: 1, _dummy: true };
    let pickaxe = null, unihorn = null, key = null;
    const wep = MON_WEP_dm(mon);

    if (isAnimalOrMindless) {
        /* won't hang on to any tool — act as if already holding each. */
        pickaxe = unihorn = key = DUMMY;
    } else {
        /* C dogmove.c:50-58: don't hang on to a pick-axe if can't use one or
         * don't need one; don't hang on to a key if can't open doors. */
        const tunnels = (mflags1 & M1_TUNNEL) !== 0;
        const needspick = (mflags1 & M1_NEEDPICK) !== 0;
        if (!tunnels || !needspick)
            pickaxe = DUMMY;
        const msize = (mndx >= 0 && mndx < MONS_MSIZE.length) ? (MONS_MSIZE[mndx] | 0) : MZ_SMALL;
        if ((mflags1 & M1_NOHANDS) || msize < MZ_SMALL)
            key = DUMMY;
    }
    if (wep) {
        if (is_pick_otyp(wep.otyp)) pickaxe = wep;
        if (wep.otyp === UNICORN_HORN_OTYP) unihorn = wep;
    }

    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        switch (obj.otyp | 0) {
        case DWARVISH_MATTOCK_OTYP:
            /* reject mattock if couldn't wield it */
            if (which_armor(mon, W_ARMS))
                break;
            /* keep mattock in preference to pick unless pick is already
               wielded or is an artifact and mattock isn't */
            if (pickaxe && pickaxe.otyp === PICK_AXE_OTYP && pickaxe !== wep
                && (!pickaxe.oartifact || obj.oartifact))
                return pickaxe;
            /* FALLTHRU */
        case PICK_AXE_OTYP:
            if (!pickaxe || (obj.oartifact && !pickaxe.oartifact)) {
                if (pickaxe) return pickaxe;
                pickaxe = obj; /* keep this digging tool */
                continue;
            }
            break;
        case UNICORN_HORN_OTYP:
            if (obj.cursed) break;
            if (!unihorn || (obj.oartifact && !unihorn.oartifact)) {
                if (unihorn) return unihorn;
                unihorn = obj;
                continue;
            }
            break;
        case SKELETON_KEY_OTYP:
            /* keep key in preference to lock-pick */
            if (key && key.otyp === LOCK_PICK_OTYP
                && (!key.oartifact || obj.oartifact))
                return key;
            /* FALLTHRU */
        case LOCK_PICK_OTYP:
            /* keep lock-pick in preference to credit card */
            if (key && key.otyp === CREDIT_CARD_OTYP
                && (!key.oartifact || obj.oartifact))
                return key;
            /* FALLTHRU */
        case CREDIT_CARD_OTYP:
            if (!key || (obj.oartifact && !key.oartifact)) {
                if (key) return key;
                key = obj;
                continue;
            }
            break;
        default:
            break;
        }
        /* C dogmove.c:130 — !obj->owornmask && obj != wep → droppable. */
        if (!(obj.owornmask | 0) && obj !== wep)
            return obj;
    }
    return null; /* don't drop anything */
}

async function relobj_dm(mtmp) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    let otmp;
    while ((otmp = droppables(mtmp)) != null) {
        const stale_ox = otmp.ox, stale_oy = otmp.oy;
        otmp.ox = omx; otmp.oy = omy;
        const objName = await distant_obj_name(otmp);
        otmp.ox = stale_ox; otmp.oy = stale_oy;
        /* C steal.c:mdrop_obj — extract_from_minvent then place_object. */
        await extract_from_minvent_tp(mtmp, otmp, false, true);
        /* C steal.c:839 — verbose && cansee → pline "<Monnam> drops <obj>." */
        if (cansee(omx, omy) && game.flags?.verbose !== false)
            { set_msg_xy_dm(mtmp.mx, mtmp.my); await pline(`${Monnam_dm(mtmp)} drops ${objName}.`); } /* pline_mon, steal.c:836 */
        if (!await flooreffects_dm(otmp, omx, omy, 'fall')) {
            await obj_no_longer_held(otmp);
            place_object(otmp, omx, omy);
            await stackobj_dm(otmp);
        }
    }
    // C dog_invent passes minvis as relobj's show flag.
    if (mtmp.minvis && cansee(omx, omy)) newsym(omx, omy);
}

async function relobj_dead_dm(mtmp) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    /* C objnam.c:370-371 distant_name: r = (u.xray_range > 2) ? u.xray_range : 2,
     * neardist = r*r*2 - r (6 without xray, 15 with the Eyes of the Overworld). */
    const xr = (game.u?.xray_range | 0) > 2 ? (game.u.xray_range | 0) : 2;
    const neardist = xr * xr * 2 - xr;
    const nearAndSeen = cansee(omx, omy) && distu(omx, omy) <= neardist;
    let otmp;
    while ((otmp = mtmp.minvent) != null) {
        /* objnam.c:387-388: an artifact is observed from any seen square. */
        if (nearAndSeen || (cansee(omx, omy) && otmp.oartifact))
            /* C distant_name() reaches observe_object(), which both marks the
             * appearance seen and appends the type to svd.disco[].  Keeping
             * only the dknown bit loses discoveries for gear dropped by a
             * monster killed by a pet (e.g. an iron skull cap). */
            observe_object_dm(otmp);
        /* C steal.c:825: extraction also unwields the weapon via mwepgone
         * (worn.c:1415-1416), extinguishing artifact light before the drop. */
        const unwornmask = otmp.owornmask | 0;
        await extract_from_minvent_tp(mtmp, otmp, false, true);
        /* C steal.c:826-833: don't charge for an owned saddle on a dead steed
           (provided the hero is within the same shop at the time) */
        if (unwornmask && mtmp.mtame && (unwornmask & W_SADDLE) !== 0
            && !otmp.unpaid && costly_spot(omx, omy)
            && in_rooms(game.u.ux, game.u.uy, SHOPBASE)
                .includes(game.level?.locations?.[omx]?.[omy]?.roomno | 0))
            otmp.no_charge = 1;
        if (!await flooreffects_dm(otmp, omx, omy, "fall")) {
            await obj_no_longer_held(otmp); /* C mkobj.c:2330 via place_object */
            place_object(otmp, omx, omy);
            await stackobj_dm(otmp);
        }
    }
    /* C steal.c:895-896 — show && cansee(omx, omy) → newsym(omx, omy).
     * This repaint is immediate even when a --More-- prompt is pending.  It
     * is observably distinct from m_detach's earlier newsym and a subsequent
     * make_corpse repaint: while hallucinating, each call draws a fresh object
     * glyph from the display RNG.  Deferring this call let the tty flush
     * coalesce it with the later corpse repaint, dropping one display draw and
     * shifting every hallucinated monster glyph on the completed turn. */
    if (cansee(omx, omy))
        newsym(omx, omy);
}

export async function stackobj_dm(obj) {
    if (!obj) return;
    const xi = obj.ox | 0;
    const yi = obj.oy | 0;
    const head = game.level?.levelObjects?.[xi]?.[yi] ?? null;
    for (let otmp = head; otmp; otmp = otmp.nexthere) {
        /* C merged(&obj, &otmp) -> mergable(otmp=*potmp=obj, obj=*pobj=otmp). */
        if (otmp !== obj && (await mergable_dm(obj, otmp))) {
            await merged_dm(obj, otmp);
            break;
        }
    }
}

async function mergable_dm(otmp, obj) {
    return await mergable(otmp, obj);
}


async function merged_dm(otmp, obj) {
    if (!obj.lamplit && !obj.globby
        && (otmp.quan | 0) + (obj.quan | 0) > 0
        && (otmp.age != null || obj.age != null)) {
        const oa = otmp.age | 0, oq = otmp.quan | 0, ba = obj.age | 0, bq = obj.quan | 0;
        otmp.age = Math.trunc((oa * oq + ba * bq) / (oq + bq));
    }
    if (!otmp.globby)
        otmp.quan = (otmp.quan | 0) + (obj.quan | 0);
    /* C invent.c merged: coins refresh owt+clear bknown; otherwise refresh owt
     * unless pudding (globby).  Puddings are globby on the JS side. */
    if ((otmp.oclass | 0) === COIN_CLASS_) {
        otmp.owt = obj_weight(otmp);
        otmp.bknown = 0;
    } else if (!otmp.globby) {
        otmp.owt = obj_weight(otmp);
    }
    /* C invent.c:858-872 — identification states union (the `discovered`
     * pline is OBJ_INVENT-only). */
    if ((obj.known | 0) !== (otmp.known | 0)) otmp.known = 1;
    if ((obj.rknown | 0) !== (otmp.rknown | 0)) otmp.rknown = 1;
    if ((obj.bknown | 0) !== (otmp.bknown | 0)) otmp.bknown = 1;
    /* obj_extract_self(obj): unlink from per-tile nexthere + global fobj, mark deleted. */
    const xi = obj.ox | 0, yi = obj.oy | 0;
    const lvlObjs = game.level?.levelObjects;
    if (lvlObjs?.[xi]) {
        let h = lvlObjs[xi][yi];
        if (h === obj) {
            lvlObjs[xi][yi] = obj.nexthere ?? null;
        } else {
            for (let o = h; o; o = o.nexthere) {
                if (o.nexthere === obj) { o.nexthere = obj.nexthere; break; }
            }
        }
    }
    if (game.fobj === obj) {
        game.fobj = obj.nobj ?? null;
    } else {
        for (let o = game.fobj; o; o = o.nobj) {
            if (o.nobj === obj) { o.nobj = obj.nobj; break; }
        }
    }
    obj.nexthere = null;
    obj.nobj = null;
    /* C invent.c:825-828 merged(): "really should merge the timeouts" — what C
     * does is stop the absorbed object's, so its ROT_CORPSE never fires on a
     * deleted object. */
    if (obj.lamplit)
        obj_merge_light_sources(obj, otmp); /* invent.c:850 */
    if (obj.timed)
        obj_stop_timers(obj); /* follows lights */
    obj.where = OBJ_FREE;
    /* C invent.c:944 -> shk.c:1249-1264: merge billing and retain the
     * higher o_id-based price adjustment before freeing the absorbed stack. */
    await obfree(obj, otmp);
}

/* extract_from_minvent — unlink obj from mon->minvent (RNG-free). */
export function extract_from_minvent_dm(mon, obj) {
    if (mon.minvent === obj) {
        mon.minvent = obj.nobj ?? null;
    } else {
        for (let o = mon.minvent; o; o = o.nobj) {
            if (o.nobj === obj) { o.nobj = obj.nobj; break; }
        }
    }
    obj.nobj = null;
    obj.ocarry = null;
    obj.where = OBJ_FREE;
}

/* "Your kitten" / "Sirius" — C noit_Monnam(mtmp) for a tame, hero-owned pet.
 * Unnamed tame pet → "Your {species}".  Named pet → the given name.
 * mon_nam_dm gives "the {species}"; convert leading "the " → "Your ". */
function noit_Monnam_dm(mtmp) {
    const givenname = mtmp?.mextra?.mgivenname
        || (('mgivenname' in mtmp) ? mtmp.mgivenname : '') || '';
    if (givenname) return givenname;
    const s = mon_nam_dm(mtmp); /* "the kitten" / "it" */
    if (s.startsWith('the ') && (mtmp.mtame | 0))
        return 'Your ' + s.slice(4);
    /* noit_Monnam keeps a tame pet's species even when x_monnam's
     * visibility-driven do_it branch returned "it". */
    if (s === 'it' && (mtmp.mtame | 0)) {
        const species = mtmp.data?.pmnames?.[2] || mtmp.data?.mname || '';
        if (species) return 'Your ' + species;
    }
    if (s.startsWith('the '))
        return 'The ' + s.slice(4);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

async function dog_obj_name(obj) {
    const otyp = obj.otyp | 0;
    /* The corpse shortcut dropped doname's prefixes ("greased frost giant
     * corpse", dogmove.c:285 distant_name(obj, doname)); doname covers it. */
    /* A greased corpse is "a greased jackal corpse" (objnam.c:1370-1371), which
     * the species shortcut below cannot render; only a bare corpse may take it. */
    /* wizweight (objnam.c:1696-1702) appends " (N aum)" in doname; so must not shortcut. */
    if (otyp === 230 /* MIRROR */)
        return 'a looking glass';
    return await distant_name(obj, doname);
}

function dm_hallucinating() {
    const up = game.u?.uprops;
    const h = up?.[HALLUC]?.intrinsic || 0;
    return !!(h && !((up?.[HALLUC_RES]?.intrinsic || 0) || (up?.[HALLUC_RES]?.extrinsic || 0)));
}
function top_floor_obj(x, y) {
    return game.level?.levelObjects?.[x | 0]?.[y | 0] ?? null;
}

/* an_dm — indefinite-article helper (C hacklib.c an()): "a"/"an" by first letter.
 * Names already carrying their own article ("the …") are returned verbatim. */
function an_dm(word) {
    if (!word) return 'an it';
    if (/^[aeiouAEIOU]/.test(word)) return 'an ' + word;
    return 'a ' + word;
}

export async function distant_obj_name(obj) {
    return await distant_name(obj, _dm_doname);
}

async function _dm_doname(obj) {
    if (!_dm_Blind() && !in_distant_name())
        observe_object_dm(obj);
    if (_dm_Role_if_cleric())
        obj.bknown = 1;

    /* C dogmove.c:457 uses doname for corpses too.  Let the shared formatter
     * below supply the count, prefixes and personal name (objnam.c:998-1006,
     * 1505-1527), rather than reducing the object to its species. */
    /* C dogmove.c:457 passes doname for coins too: its objnam.c:1696-1702
     * wizweight suffix participates in update_topl's paging decision. */
    const generic = await doname(obj);
    if (generic)
        return generic;
    /* fallback: reuse dog_obj_name's generic form (rare off-corpse case). */
    return await dog_obj_name(obj);
}

/* C youprop.h:103 Blind -- (HBlind || EBlind) && !blocked.  Mirrors
 * js/objnam.js's own _Blind(); this port has no single shared property
 * accessor (that file's comment says so, and lists three other copies). */
function _dm_Blind() {
    const p = game.u && game.u.uprops ? game.u.uprops[BLINDED_DM] : null;
    if (!p) return false;
    return !!(((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
/* C hack.h Role_if(PM_CLERIC).  Same shape as js/objnam.js's _Role_if(): this
 * port carries the role as an INDEX into role.c's roles[] (flags.initrole),
 * not as a PM_ monster number.  PM_CLERIC is role index 6. */
const _ROLE_IDX_PRIEST_DM = 6;
function _dm_Role_if_cleric() {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === _ROLE_IDX_PRIEST_DM;
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === _ROLE_IDX_PRIEST_DM;
}
const _ROLE_IDX_SAMURAI_DM = 9; /* roles[] index of PM_SAMURAI (js/eat.js uses 9) */
function _dm_Role_if_samurai() {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === _ROLE_IDX_SAMURAI_DM;
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === _ROLE_IDX_SAMURAI_DM;
}
const _ARMOR_CLASS_DM = 3; /* C ARMOR_CLASS */
const SCROLL_CLASS_DM = 9; /* C SCROLL_CLASS */
const POTION_CLASS_DM = 8; /* C POTION_CLASS */
const WEAPON_OTYP_NAMES = { 18: 'arrow', 24: 'dart', 474: 'rock' };
const FOOD_OTYP_NAMES = { 293: 'food ration', 264: 'tripe ration' };

/* is_flyer / is_floater — C mondata.h:19-20.  is_floater is mlet S_EYE/S_LIGHT. */
function is_flyer_dm(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const f1 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][6] | 0) : 0;
    return (f1 & 0x00000001) !== 0; /* M1_FLY */
}
function is_floater_dm(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const mlet = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][0] | 0) : 0;
    return mlet === 5 /* S_EYE */ || mlet === S_LIGHT_C;
}

export function dog_nutrition(mtmp, obj) {
    let nutrit;

    /* C dogmove.c:165-194 */
    if ((obj.oclass | 0) === FOOD_CLASS) {
        if ((obj.otyp | 0) === CORPSE_OTYP) {
            /* C:166-167 meating = 3 + (mons[corpsenm].cwt >> 6); nutrit = cnutrit */
            const cn = obj.corpsenm | 0;
            const cwt = (cn >= 0 && cn < MONS_CWT.length) ? (MONS_CWT[cn] | 0) : 0;
            mtmp.meating = 3 + (cwt >> 6);
            nutrit = mons_cnutrit(cn);
        } else {
            /* C:169-170 meating = oc_delay; nutrit = oc_nutrition */
            mtmp.meating = oc_delay(obj.otyp | 0);
            nutrit = oc_nutrition(obj.otyp | 0);
        }
        /* C:172-192 msize multiplier on nutrit (NOT on meating) */
        const mndx = (mtmp?.data?.pmidx ?? mtmp?.mndx ?? mtmp?.mnum ?? 0) | 0;
        const msize = mtmp?.data?.msize ?? ((mndx >= 0 && mndx < MONS_MSIZE.length)
            ? (MONS_MSIZE[mndx] | 0) : MZ_MEDIUM);
        switch (msize) {
        case MZ_TINY:     nutrit *= 8; break;
        case MZ_SMALL:    nutrit *= 6; break;
        case MZ_LARGE:    nutrit *= 4; break;
        case MZ_HUGE:     nutrit *= 3; break;
        case MZ_GIGANTIC: nutrit *= 2; break;
        case MZ_MEDIUM:
        default:          nutrit *= 5; break;
        }
        /* C:193-196 partly-eaten food scales BOTH meating and nutrit */
        if (obj.oeaten | 0) {
            mtmp.meating = eaten_stat(mtmp.meating | 0, obj);
            nutrit = eaten_stat(nutrit, obj);
        }
    } else if ((obj.oclass | 0) === COIN_CLASS) {
        /* C:197-203 */
        mtmp.meating = Math.trunc((obj.quan | 0) / 2000) + 1;
        if ((mtmp.meating | 0) < 0) mtmp.meating = 1;
        nutrit = Math.trunc((obj.quan | 0) / 20);
        if (nutrit < 0) nutrit = 0;
    } else {
        mtmp.meating = Math.trunc((obj.owt | 0) / 20) + 1;
        nutrit = 5 * _oc_nutrition_nonfood(obj);
    }
    return nutrit;
}

/* objects[otyp].oc_nutrition for the classes js/food_props.js lacks (objects.h):
 * WEAPON/ARMOR/TOOL (incl. WEPTOOL, CONTAINER) carry oc_weight, RING 15,
 * AMULET 20, POTION 10, SCROLL 6, SPBOOK 20, WAND 30, COIN 0.
 * GEM (439-460 real gems: 15, 461-469 glass: 6, 470-474 rocks/stones: 10).
 * ROCK (475 BOULDER 2000, 476 STATUE 2500), BALL 200, CHAIN 200, VENOM 0. */
function _oc_nutrition_nonfood(obj) {
    const otyp = obj.otyp | 0;
    switch (obj.oclass | 0) {
    case 2: case 3: case 6: /* WEAPON, ARMOR, TOOL */
        return OC_WEIGHT[otyp] | 0;
    case 4: return 15;  /* RING */
    case 5: return 20;  /* AMULET */
    case 8: return 10;  /* POTION */
    case 9: return 6;   /* SCROLL */
    case 10: return 20; /* SPBOOK */
    case 11: return 30; /* WAND */
    case 12: return 0;  /* COIN */
    case 13: return otyp <= 460 ? 15 : otyp <= 469 ? 6 : 10; /* GEM */
    case 14: return otyp === 475 ? 2000 : 2500; /* ROCK: BOULDER, STATUE */
    case 15: case 16: return 200; /* BALL, CHAIN */
    case 17: return 0;  /* VENOM */
    default: return oc_nutrition(otyp);
    }
}

export async function dog_eat(mtmp, obj, x, y, devour) {
    const edog = (mtmp.mtame && mtmp.mextra?.edog) ? mtmp.mextra.edog : null;
    const moves = (game.moves ?? 0) | 0;

    /* C dogmove.c:231-232: edog->hungrytime = max(hungrytime, moves) */
    if (edog && (edog.hungrytime | 0) < moves)
        edog.hungrytime = moves;

    /* C dogmove.c:233: nutrit = dog_nutrition(mtmp, obj).  No RNG. */
    let nutrit = dog_nutrition(mtmp, obj);

    if (devour) {
        if ((mtmp.meating | 0) > 1) mtmp.meating = Math.trunc(mtmp.meating / 2);
        if (nutrit > 1) nutrit = Math.trunc((nutrit * 3) / 4);
    }
    if (edog) edog.hungrytime = (edog.hungrytime | 0) + nutrit;
    mtmp.mconf = 0;
    /* C dogmove.c:245-249 mhpmax_penalty restore — early game: none. */
    if (edog && (edog.mhpmax_penalty | 0)) {
        mtmp.mhpmax = (mtmp.mhpmax | 0) + (edog.mhpmax_penalty | 0);
        edog.mhpmax_penalty = 0;
    }
    /* C dogmove.c:251-252 mflee halving */
    if ((mtmp.mflee | 0) && (mtmp.mfleetim | 0) > 1)
        mtmp.mfleetim = Math.trunc(mtmp.mfleetim / 2);
    /* C dogmove.c:253-254 mtame++ (< 20) */
    if ((mtmp.mtame | 0) < 20) mtmp.mtame = (mtmp.mtame | 0) + 1;
    /* C dogmove.c:255-258 newsym on moved+ate */
    if (x !== (mtmp.mx | 0) || y !== (mtmp.my | 0)) {
        newsym(x, y);
        newsym(mtmp.mx | 0, mtmp.my | 0);
    }

    // C dogmove.c:255-259: bee growth bypasses ordinary eating and apport.
    if (mtmp.data.pmidx === PM_KILLER_BEE && obj.otyp === LUMP_OF_ROYAL_JELLY_OTYP) {
        const res = await bee_eat_jelly(mtmp, obj);
        if (res >= 0) return res + 1;
    }
    if (((obj.quan ?? 1) | 0) > 1 && (obj.oclass | 0) === FOOD_CLASS)
        obj = (await splitobj(obj, 1));
    if (obj.unpaid) game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;

    /* C dogmove.c:271-298 — the eat message.  is_pool branch (no print) vs the
     * cansee branch.  seeobj = cansee(mx,my); sawpet = cansee(x,y) && mon_visible. */
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    const inpool = is_pool(mx, my) && !game.u.uinwater;
    const seeobj = !inpool && cansee(mx, my);
    const sawpet = !inpool && cansee(x, y) && mon_visible(mtmp);
    if (sawpet || (seeobj && canspotmon(mtmp))) {
        const objName = await dog_obj_name(obj);
        /* C: pline_mon(mtmp, "%s %s %s.", noit_Monnam(mtmp), devour?"devours":"eats", obj_name) */
        /* C dogmove.c:286-290: a tunneler "digs in" instead of naming the meal. */
        const _mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
        const _tunnels = _mndx >= 0 && _mndx < _MONS.length
            && ((_MONS[_mndx][6] | 0) & M1_TUNNEL) !== 0; /* tunnels() */
        if (_tunnels)
            pline_mon(mtmp, `${noit_Monnam(mtmp)} digs in.`);
        else
            pline_mon(mtmp, `${noit_Monnam(mtmp)} ${devour ? 'devours' : 'eats'} ${objName}.`);
    } else if (seeobj) {
        const objName = await dog_obj_name(obj);
        void pline(`It ${devour ? 'devours' : 'eats'} ${objName}.`);
    }
    const objnambuf = obj.unpaid ? xname(obj) : '';
    if (obj.unpaid) game.iflags.suppress_price--;
    // C dogmove.c:300-313: strip rustproofing without consuming the object.
    if (mtmp.data.pmidx === PM_RUST_MONSTER && obj.oerodeproof) {
        if (obj.unpaid) await costly_alteration(obj, COST_DEGRD);
        obj.oerodeproof = 0;
        mtmp.mstun = 1;
        if (canseemon(mtmp)) {
            const objName = await distant_name(obj, doname);
            if (game.flags.verbose) await pline(`${Monnam(mtmp)} spits ${objName} out in disgust!`);
        }
        return ((mtmp.mhp | 0) <= 0) ? 2 : 1;
    }

    /* C dogmove.c:316-338 else-branch (not RUST_MONSTER):
     *   if (dogfood(mtmp,obj) == DOGFOOD && obj->invlet) { apport... }
     *     ← dogfood fires obj_resists(0,95) = rn2(100)  [FIRST post-pline rn2(100)]
     *   m_consume_obj(mtmp, obj) → delobj → delobj_core:
     *     obj_resists(obj,0,0) = rn2(100)               [SECOND post-pline rn2(100)] */
    const dfres = dogfood(mtmp, obj); /* obj_resists(0,95) — fires rn2(100) */
    if (dfres === DOGFOOD && obj.invlet) {
        if (edog) {
            const prior_apport = edog.apport | 0;
            const dropdist = (edog.dropdist | 0);
            const droptime = (edog.droptime | 0);
            edog.apport = (edog.apport | 0)
                + Math.trunc(200 / (dropdist + moves - droptime));
            if ((edog.apport | 0) <= 0) {
                await polystone_impossible('dog_eat: pet apport <= 0 (%d, %d, %ld, %ld, %d, %u, %u)',
                    edog.apport, dropdist, droptime, moves, prior_apport, mtmp.m_id, edog.parentmid);
                edog.apport = 1;
            }
        }
    }

    /* C dogmove.c:341: shared consumption includes real object teardown.
     * A bare unlink left corpse timers pointing at an already deleted object. */
    if (obj.unpaid) {
        const oprice = await unpaid_cost(obj, COST_CONTENTS);
        await pline(`That ${objnambuf} will cost you ${oprice} ${currency(oprice)}.`);
    }
    await m_consume_obj(mtmp, obj);

    /* C dogmove.c:341: return DEADMONSTER(mtmp) ? 2 : 1 — pet survives a corpse. */
    return ((mtmp.mhp | 0) <= 0) ? 2 : 1;
}

async function dog_invent(mtmp, edog, udist) {
    /* C dogmove.c:406-407: if (helpless(mtmp) || mtmp->meating) return 0;
     * helpless(mon) is monst.h:251 "(mon)->msleeping || !(mon)->mcanmove". */
    if (helpless_dm(mtmp) || mtmp.meating)
        return 0;

    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const moves = (game.moves ?? 0) | 0;

    /* C dogmove.c:418 — if (droppables(mtmp)): pet carrying something it would
     * drop.  C drops it (near @) and decrements apport. */
    if (droppables(mtmp) != null) {
        /* C dogmove.c:420-428 */
        if (!rn2(udist + 1) || !rn2(edog.apport)) {
            /* C: if (rn2(10) < edog->apport) { relobj(...); apport--; ... } */
            if (rn2(10) < (edog.apport | 0)) {
                await relobj_dm(mtmp);
                if ((edog.apport | 0) > 1)
                    edog.apport = (edog.apport | 0) - 1;
                edog.dropdist = udist;
                edog.droptime = moves;
            }
        }
        return 0;
    }

    /* C: obj = svl.level.objects[omx][omy] (first object at pet's tile) */
    const floorObj = game.level?.levelObjects?.[omx]?.[omy] ?? null;
    if (!floorObj)
        return 0;

    /* C: !strchr(nofetch, obj->oclass) — skip BALL/CHAIN/ROCK */
    const oc = floorObj.oclass | 0;
    if (oc === BALL_CLASS || oc === CHAIN_CLASS || oc === ROCK_CLASS)
        return 0;

    /* C dogmove.c:430-432 — #ifdef MAIL_STRUCTURES (defined, global.h:430):
     * && obj->otyp != SCR_MAIL */
    if ((floorObj.otyp | 0) === SCR_MAIL_OTYP)
        return 0;

    /* C: !(is_mines_prize || is_soko_prize) — skip special items */
    if (is_mines_prize(floorObj) || is_soko_prize(floorObj))
        return 0;

    /* C: dogfood(mtmp, obj) — fires obj_resists → rn2(100) */
    const edible = dogfood(mtmp, floorObj);

    const starving = (edog.mhpmax_penalty | 0) > 0;
    if ((edible <= CADAVER || (starving && edible === ACCFOOD))
        && could_reach_item(mtmp, floorObj.ox | 0, floorObj.oy | 0)) {
        return await dog_eat(mtmp, floorObj, omx, omy, false);
    }

    const carryamt = can_carry(mtmp, floorObj);
    /* C: && could_reach_item(mtmp, obj->ox, obj->oy) */
    if (carryamt > 0 && !floorObj.cursed
        && could_reach_item(mtmp, floorObj.ox | 0, floorObj.oy | 0)) {
        /* C: if (rn2(20) < edog->apport + 3) */
        if (rn2(20) < (edog.apport | 0) + 3) {
            /* C: if (rn2(udist) || !rn2(edog->apport)) */
            if (rn2(udist) || !rn2(edog.apport)) {
                let otmp = floorObj;
                if (carryamt !== ((floorObj.quan ?? 1) | 0))
                    otmp = await splitobj(floorObj, carryamt);
                /* C dogmove.c:451-461: distant_name side-effects + the verbose
                 * "<Monnam> picks up <obj>." pline when the tile is in sight. */
                if (cansee(omx, omy)) {
                    const otmpname = await distant_obj_name(otmp);
                    if (game.flags?.verbose !== false) {
                        /* C pline_xy(omx, omy, ...) = set_msg_xy + vpline (pline.c:150-157) */
                        void pline_xy(omx, omy, '%s picks up %s.',
                                      Monnam_dm(mtmp), otmpname);
                        if (_topline_more_pending() && _more_never_dismissed())
                            await flush_pending_messages();
                    }
                }
                /* C: obj_extract_self(otmp); newsym(omx,omy); mpickobj(mtmp,otmp). */
                obj_extract_floor(otmp);
                newsym(omx, omy);
                await mpickobj(mtmp, otmp);
                /* C dogmove.c:466-471: a weapon-using pet (e.g. a tame gnome
                 * lord) wields what it just picked up; mon_wield_item's
                 * "%s wields %s!" topline follows the pickup pline. */
                if (attacktype(mtmp.data, AT_WEAP)
                    && (mtmp.weapon_check | 0) === NEED_WEAPON$) {
                    mtmp.weapon_check = NEED_HTH_WEAPON$;
                    await mon_wield_item(mtmp);
                }
                check_gear_next_turn_dm(mtmp);
            }
        }
    }

    return 0;
}

function add_to_minv_dm(mon, obj) {
    obj.where = OBJ_MINVENT;
    obj.ocarry = mon;
    obj.nobj = mon.minvent ?? null;
    mon.minvent = obj;
}


function dog_goal(mtmp, edog, after, udist, whappr) {
    if (mtmp === game.u?.usteed)
        return -2;

    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const moves = (game.moves ?? 0) | 0;

    /* Initialize goal globals */
    const gg = game.gg ?? (game.gg = { gx: 0, gy: 0, gtyp: UNDEF });
    game.gg = gg;

    /* C dogmove.c:512 — couldsee() is a strict vision-map query.  The old
     * helper returned TRUE when viz_array was absent, which made pets treat
     * hidden/opaque squares as visible and select goals C rejects. */
    const in_masters_sight = !!(game.viz_array && couldsee_vision(omx, omy));
    /* droppables stub: pet has inventory */
    const dog_has_minvent = (droppables(mtmp) != null);

    if (!edog || mtmp.mleashed) {
        /* leashed: stay near hero */
        gg.gtyp = APPORT;
        gg.gx = (game.u?.ux | 0);
        gg.gy = (game.u?.uy | 0);
    } else {
        let min_x = Math.max(1, omx - SQSRCHRADIUS);
        let max_x = Math.min(COLNO - 1, omx + SQSRCHRADIUS);
        let min_y = Math.max(0, omy - SQSRCHRADIUS);
        let max_y = Math.min(ROWNO - 1, omy + SQSRCHRADIUS);

        gg.gtyp = UNDEF;
        gg.gx = 0;
        gg.gy = 0;

        for (let obj = game.fobj; obj; obj = obj.nobj) {
            const nx = obj.ox | 0;
            const ny = obj.oy | 0;
            /* C: if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) */
            if (nx < min_x || nx > max_x || ny < min_y || ny > max_y)
                continue;
            /* C: otyp = dogfood(mtmp, obj) — fires rn2(100) */
            const otyp = dogfood(mtmp, obj);
            /* C: if (otyp > gg.gtyp || otyp == UNDEF) continue */
            if (otyp > gg.gtyp || otyp === UNDEF)
                continue;
            /* C: if (cursed_object_at && !(starving && otyp < MANFOOD)) continue */
            if (cursed_object_at(nx, ny)
                && !((edog.mhpmax_penalty | 0) && otyp < MANFOOD))
                continue;
            /* C dogmove.c:540-541: reach checks.
             * could_reach_item: checks for pool/lava/boulder.
             * can_reach_location: recursive pathfinding check.
             * C short-circuits: !could_reach_item || !can_reach_location */
            if (!could_reach_item(mtmp, nx, ny)
                || !can_reach_location(mtmp, mtmp.mx | 0, mtmp.my | 0, nx, ny))
                continue;
            if (otyp < MANFOOD) {
                /* preferred food: update goal */
                if (otyp < gg.gtyp
                    || dist2(nx, ny, omx, omy) < dist2(gg.gx, gg.gy, omx, omy)) {
                    gg.gx = nx;
                    gg.gy = ny;
                    gg.gtyp = otyp;
                }
            } else if (gg.gtyp === UNDEF && in_masters_sight && !dog_has_minvent) {
                /* C dogmove.c:550-559:
                 * else if (gg.gtyp == UNDEF && in_masters_sight && !dog_has_minvent
                 *          && (!levl[omx][omy].lit || levl[u.ux][u.uy].lit)
                 *          && (otyp == MANFOOD || m_cansee(mtmp, nx, ny))) {
                 *     int aproll = rn2(8); ... }
                 * Lighting check: (!pet_tile.lit || hero_tile.lit)
                 * m_cansee(mtmp, nx, ny) = clear_path(mtmp->mx, mtmp->my, nx, ny)
                 *   — real line-of-sight check via vision.js:clear_path */
                const petLoc  = game.level?.locations?.[omx]?.[omy];
                const _gu     = game.u; /* u not yet declared at this scope */
                const heroLoc = game.level?.locations?.[_gu?.ux ?? 0]?.[_gu?.uy ?? 0];
                const petLit  = !!(petLoc?.lit);
                const heroLit = !!(heroLoc?.lit);
                const litOk   = (!petLit || heroLit);
                /* m_cansee(mtmp, nx, ny) = clear_path(mtmp->mx, mtmp->my, nx, ny) */
                const canSee  = (otyp === MANFOOD) || !!(clear_path(omx, omy, nx, ny));
                if (litOk && canSee) {
                    const aproll = rn2(8);
                    const carry_res = ((edog.apport | 0) > aproll) ? can_carry(mtmp, obj) : 0;
                    const sel = ((edog.apport | 0) > aproll && carry_res > 0);
                    if (sel) {
                        gg.gx = nx;
                        gg.gy = ny;
                        gg.gtyp = APPORT;
                    }
                }
            }
        }
    }

    /* C: follow player if no food goal or food found but still hungry */
    const u = game.u;
    let appr;
    if (gg.gtyp === UNDEF || (gg.gtyp !== DOGFOOD && gg.gtyp !== APPORT
                              && moves < edog.hungrytime)) {
        gg.gx = (u?.ux | 0);
        gg.gy = (u?.uy | 0);
        /* C: if (after && udist <= 4 && u_at(gg.gx, gg.gy)) return -2 */
        if (after && udist <= 4 && (u?.ux | 0) === gg.gx && (u?.uy | 0) === gg.gy)
            return -2;
        appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        if (udist > 1) {
            /* C dogmove.c:575: if (!IS_ROOM(levl[u.ux][u.uy].typ) || !rn2(4) || whappr
             *                       || (dog_has_minvent && rn2(edog->apport)))
             *     appr = 1;
             * IS_ROOM(typ) = (typ >= ROOM).  C short-circuits: when !IS_ROOM is true
             * (hero in corridor/wall/etc.) rn2(4) is NOT called.  Only fire rn2(4) when
             * the hero IS in a room (IS_ROOM true) and the !IS_ROOM branch didn't trigger.
             */
            const heroTyp = (game.level?.locations?.[u?.ux | 0]?.[u?.uy | 0]?.typ ?? 0) | 0;
            const heroInRoom = IS_ROOM(heroTyp);
            if (!heroInRoom) {
                /* !IS_ROOM = true: short-circuit — appr=1 without consuming rn2(4) */
                appr = 1;
            } else if (!rn2(4) || whappr || (dog_has_minvent && rn2(edog.apport))) {
                appr = 1;
            }
        }
        /* C dogmove.c:582-604: if (appr == 0) check stairs/invent/portal */
        if (appr === 0) {
            /* C dogmove.c:583 / stairs.c:148 — On_stairs() is stairway_at() != NULL,
             * the stairway LIST, not the terrain type: a sink dug onto a stairway
             * square leaves the stairway node, so the pet still follows. */
            if (On_stairs(u?.ux | 0, u?.uy | 0)) {
                appr = 1;
            } else {
                // C dogmove.c:586-590 — scan the one live inventory in its actual order.
                for (let obj = game.invent; obj; obj = obj.nobj) {
                    if (dogfood(mtmp, obj) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
                /* C dogmove.c:596-601 — a nearby magic portal is treated like
                 * dog food, so the pet approaches the hero more eagerly.  C
                 * assumes at most one portal and stops at the first portal,
                 * even when it is too far away; preserve that traversal order
                 * and the squared-distance test (distu <= 2). */
                if (appr === 0) {
                    for (let _t = game.ftrap ?? null; _t; _t = _t.ntrap ?? null) {
                        if ((_t.ttyp | 0) === MAGIC_PORTAL) {
                            if (distu(_t.tx | 0, _t.ty | 0) <= 2)
                                appr = 1;
                            break;
                        }
                    }
                }
            }
        }
    } else {
        appr = 1; /* gtyp != UNDEF, has food goal */
    }

    /* C: if (mtmp->mconf) appr = 0 */
    if (mtmp.mconf | 0)
        appr = 0;

    /* C dogmove.c:610-644 — FARAWAY block.
     * #define FARAWAY (COLNO + 2)  // position outside the screen
     * If the goal landed on the hero but the pet can't see the hero, the pet
     * has lost the hero: follow the hero's footstep track (gettrack), reuse the
     * previous goal (edog->ogoal), or shadow-cast from the pet's position to
     * pick the visible square nearest the hero (do_clear_area + wantdoor).  Bit-exact
     * here is what determines GDIST() in dog_move and thus the rn2(++chcnt)
     * candidate-selection sequence. */
    const FARAWAY = COLNO + 2; /* 82 */
    if ((gg.gx === (u?.ux | 0)) && (gg.gy === (u?.uy | 0)) && !in_masters_sight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            gg.gx = cp.x;
            gg.gy = cp.y;
            if (edog) {
                edog.ogoal = edog.ogoal ?? { x: 0, y: 0 };
                edog.ogoal.x = 0;
            }
        } else {
            /* assume master hasn't moved far, and reuse previous goal */
            if (edog && edog.ogoal && (edog.ogoal.x | 0)
                && ((edog.ogoal.x | 0) !== omx || (edog.ogoal.y | 0) !== omy)) {
                gg.gx = edog.ogoal.x | 0;
                gg.gy = edog.ogoal.y | 0;
                edog.ogoal.x = 0;
            } else {
                /* do_clear_area(omx, omy, 9, wantdoor, &fardist) */
                const ctx = { fardist: FARAWAY * FARAWAY };
                gg.gx = gg.gy = FARAWAY;
                /* wantdoor(x,y,distance): keep the square nearest the hero
                 * that the pet can see (min distu).  C ref: dogmove.c:1418. */
                const wantdoor = (x, y, distance) => {
                    const ndist = distu(x, y);
                    if (distance.fardist > ndist) {
                        gg.gx = x;
                        gg.gy = y;
                        distance.fardist = ndist;
                    }
                };
                do_clear_area(omx, omy, 9, wantdoor, ctx);
                /* here gx == FARAWAY e.g. when dog is in a vault */
                if (gg.gx === FARAWAY || (gg.gx === omx && gg.gy === omy)) {
                    gg.gx = (u?.ux | 0);
                    gg.gy = (u?.uy | 0);
                } else if (edog) {
                    edog.ogoal = edog.ogoal ?? { x: 0, y: 0 };
                    edog.ogoal.x = gg.gx;
                    edog.ogoal.y = gg.gy;
                }
            }
        }
    } else if (edog) {
        edog.ogoal = edog.ogoal ?? { x: 0, y: 0 };
        edog.ogoal.x = 0;
    }

    pushRngLogEntry(`^dog_goal_end[M${mtmp.m_id >>> 0} goal=${gg.gx},${gg.gy} gtyp=${gg.gtyp} appr=${appr}]`);

    return appr;
}

/* -----------------------------------------------------------------------
 * Tile type constants for can_reach_location / could_reach_item.
 * C ref: nethack-c/include/rm.h
 * IS_OBSTRUCTED(typ) = typ < POOL (typ < 16) — walls, stone, etc.
 * IS_DOOR(typ) = typ == DOOR (23)
 * D_CLOSED = 0x04, D_LOCKED = 0x08
 * is_pool: POOL(16), MOAT(17), WATER(18) — also DRAWBRIDGE_UP(19) by IS_POOL
 * is_lava: LAVAPOOL(20), LAVAWALL(21)
 * ----------------------------------------------------------------------- */
const POOL_TYP       = 16;
const MOAT_TYP       = 17;
const WATER_TYP      = 18;
const DRAWBRIDGE_UP_TYP = 19;
const LAVAPOOL_TYP   = 20;
const LAVAWALL_TYP   = 21;
const DOOR_TYP = 23;
const D_CLOSED = 0x04;
const D_LOCKED = 0x08;
const D_BROKEN = 0x01;

/* C ref: dungeon.h:129 Is_rogue_level(&u.uz).  The dungeon topology
 * (svd.dungeon_topology.d_rogue_level) is not yet modelled in the JS port, so
 * game.rogue_level is currently always unset and this returns false.  Mirrors
 * const.js Is_rogue_level so the behaviour upgrades automatically once the
 * dungeon-topology port lands. */
function Is_rogue_level_dm() {
    const rl = game?.rogue_level;
    const uz = game?.u?.uz;
    return !!(rl && uz && uz.dnum === rl.dnum && uz.dlevel === rl.dlevel);
}
/* BOULDER otyp (C objects.h ROCK_CLASS entry) */
const BOULDER_OTYP   = 475;
/* C monflag.h:86 M1_SWIM; mons[] indices for C mondata.h:190 likes_lava(). */
const M1_SWIM_DM = 0x00000002;
const PM_FIRE_ELEMENTAL_DM = 155, PM_SALAMANDER_DM = 329;

export function could_reach_item(mtmp, nx, ny) {
    const locs = game.level?.locations;
    const typ = (locs?.[nx]?.[ny]?.typ ?? 0) | 0;
    /* C dogmove.c:1423-1429 reads mtmp->data, which may differ from the
     * original mndx after polymorphing.  Prefer the live permonst index so
     * swimmer/lava/rock throwing capabilities follow the current form. */
    const _mndx = (mtmp?.data?.pmidx ?? mtmp?.mndx ?? mtmp?.mnum ?? -1) | 0;
    const _mrow = (_mndx >= 0 && _mndx < _MONS.length) ? _MONS[_mndx] : null;
    const _mf1 = _mrow ? (_mrow[6] >>> 0) : 0;
    const _mf2 = _mrow ? (_mrow[7] >>> 0) : 0;
    /* is_pool: POOL, MOAT, WATER, DRAWBRIDGE_UP (typ 16-19) */
    if (typ >= POOL_TYP && typ <= DRAWBRIDGE_UP_TYP
        && !(_mf1 & M1_SWIM_DM))            /* C mondata.h:25 is_swimmer(ptr) */
        return false;
    /* is_lava: LAVAPOOL(20), LAVAWALL(21) */
    if ((typ === LAVAPOOL_TYP || typ === LAVAWALL_TYP)
        /* C mondata.h:190 likes_lava(ptr) — fire elemental / salamander only */
        && _mndx !== PM_FIRE_ELEMENTAL_DM && _mndx !== PM_SALAMANDER_DM)
        return false;
    const firstObj = game.level?.levelObjects?.[nx]?.[ny];
    if (firstObj) {
        for (let o = firstObj; o; o = o.nexthere) {
            /* C: !sobj_at(BOULDER,nx,ny) || throws_rocks(mon->data)
             * (mondata.h:134 throws_rocks(ptr) = mflags2 & M2_ROCKTHROW). */
            if ((o.otyp | 0) === BOULDER_OTYP && !(_mf2 & M2_ROCKTHROW))
                return false;
        }
    }
    return true;
}

/* -----------------------------------------------------------------------
 * can_reach_location — C ref: dogmove.c:1439-1475
 * Recursive check: can the monster reach (fx,fy) from (mx,my)?
 * Checks for walls/closed doors along the path.
 * No RNG consumed.
 * ----------------------------------------------------------------------- */
function can_reach_location(mtmp, mx, my, fx, fy) {
    mx |= 0; my |= 0; fx |= 0; fy |= 0;
    if (mx === fx && my === fy) return true;
    /* C: if (!isok(mx, my)) return FALSE */
    if (!isok(mx, my)) return false;
    const locs = game.level?.locations;
    const dist = dist2(mx, my, fx, fy);
    /* C dogmove.c:1399-1400: passes_walls(mon->data) and tunnels(mon->data)
     * evaluate against the live permonst (mtmp.data), not the original mndx/mnum. */
    const _cm_ndx = (mtmp?.data?.pmidx ?? mtmp?.mndx ?? mtmp?.mnum ?? -1) | 0;
    const _cm_row = (_cm_ndx >= 0 && _cm_ndx < _MONS.length) ? _MONS[_cm_ndx] : null;
    const _cm_f1 = (mtmp?.data?.mflags1 ?? _cm_row?.[6] ?? 0) | 0;
    const _cm_passwall = passes_walls(mtmp?.data ?? { mflags1: _cm_f1 });
    const _cm_tunnels = (_cm_f1 & M1_TUNNEL) !== 0; /* tunnels(mon->data) */
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            /* C: if (!isok(i,j)) continue */
            if (!isok(i, j)) continue;
            /* C: if (dist2(i,j,fx,fy) >= dist) continue */
            if (dist2(i, j, fx, fy) >= dist) continue;
            /* C: if (IS_OBSTRUCTED(typ) && !passes_walls && ...) continue */
            const loc = locs?.[i]?.[j];
            const typ = loc?.typ ?? 0;
            if (typ < POOL_TYP && !_cm_passwall
                && (!may_dig(i, j) || !_cm_tunnels || Is_rogue_level_dm()))
                continue; /* wall/stone → obstructed, unless a digger may tunnel it */
            /* C: if (IS_DOOR && (D_CLOSED|D_LOCKED)) continue */
            if (typ === DOOR_TYP) {
                const dm = loc.doormask ?? 0;
                if (dm & (D_CLOSED | D_LOCKED)) continue;
            }
            /* C: if (!could_reach_item(mon, i, j)) continue — dogmove.c:1407 */
            if (!could_reach_item(mtmp, i, j)) continue;
            /* C: if (can_reach_location(mon, i, j, fx, fy)) return TRUE */
            if (can_reach_location(mtmp, i, j, fx, fy)) return true;
        }
    }
    return false;
}

/* -----------------------------------------------------------------------
 * couldsee_stub — C ref: vision.c couldsee(x,y)
 * Returns true if hero could potentially see position (x,y).
 * Uses real vision array (game.viz_array) if available; falls back to true.
 * C: !!(viz_array[y][x] & COULD_SEE)
 * ----------------------------------------------------------------------- */
function couldsee_stub(x, y) {
    /* Use real couldsee from vision.js if game state is populated */
    if (game.viz_array) {
        try { return couldsee_vision(x | 0, y | 0); } catch (_) {}
    }
    return true; /* fallback: assume visible */
}

/* -----------------------------------------------------------------------
 * distu — squared distance from (x,y) to hero
 * C ref: hack.h distu(x,y) = dist2(x,y,u.ux,u.uy)
 * ----------------------------------------------------------------------- */
function distu(x, y) {
    const u = game.u;
    if (!u) return 0;
    return dist2(x | 0, y | 0, u.ux | 0, u.uy | 0);
}

/* m_avoid_kicked_loc (C monmove.c:1322-1334) is defined once, in
 * js/monmove.js, and imported at the top of this file. */

/* m_avoid_soko_push_loc (C monmove.c:1337-1349) is defined once, in
 * js/monmove.js, mirroring C's own file layout (defined in monmove.c, called
 * from dogmove.c:1238); it is imported at the top of this file.  The local
 * `return false` stub that used to sit here was a second body for the same C
 * function and shadowed the real one at every call site. */

/* -----------------------------------------------------------------------
 * distmin — Chebyshev (max) distance
 * C ref: hack.h distmin(x0,y0,x1,y1) = max(abs(x0-x1), abs(y0-y1))
 * ----------------------------------------------------------------------- */
function distmin_dogmove(x0, y0, x1, y1) {
    return Math.max(Math.abs((x0 | 0) - (x1 | 0)), Math.abs((y0 | 0) - (y1 | 0)));
}

/* C monsym.h — quest-role msound values; the two score_targ / find_friends
 * treat as "always seen, never targeted". Same numbers as js/objnam.js:154. */
const MS_LEADER_DM = 36;
const MS_GUARDIAN_DM = 38;
/** C permonst.msound — parallel to _MONS row order (js/makemon_msound.json). */
const _MSOUND = /** @type {number[]} */ (monMsoundPack_dm.msound);
/* -----------------------------------------------------------------------
 * find_friends — C ref: dogmove.c:753-792 (called from score_targ)
 * Walk from the target back along the pet→target line, up to maxdist, and
 * report whether the hero (as the pet believes) or another pet / quest
 * friendly stands behind it — in which case the pet must not fire.
 * No RNG.
 * ----------------------------------------------------------------------- */
function find_friends(mtmp, mtarg, maxdist) {
    if (!mtmp || !mtarg)
        return 0;
    const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
    const tx = mtarg.mx | 0, ty = mtarg.my | 0;
    const dx = sgn(tx - (mtmp.mx | 0));
    const dy = sgn(ty - (mtmp.my | 0));
    let curx = tx, cury = ty;
    let dist = distmin_dogmove(tx, ty, mtmp.mx | 0, mtmp.my | 0);
    for (; dist <= maxdist; ++dist) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury))
            return 0;
        /* C: m_cansee(mtmp, curx, cury) == clear_path(mtmp->mx, mtmp->my, x, y)
         * — the same expansion find_targ above already relies on. */
        if (!clear_path(mtmp.mx | 0, mtmp.my | 0, curx, cury))
            return 0;
        /* Does pet think you're here? */
        if ((mtmp.mux | 0) === curx && (mtmp.muy | 0) === cury)
            return 1;
        const pal = m_at(curx, cury);
        if (pal) {
            if (pal.mtame | 0) {
                /* C dogmove.c:724 — invisible tame friends are visible
                 * only to a pet whose species can see invisibility. */
                const _pdata = mtmp.data ?? { mflags1: _MONS[(mtmp.mndx ?? mtmp.mnum ?? -1) | 0]?.[6] ?? 0 };
                if (!(pal.minvis | 0) || perceives_dm(_pdata))
                    return 1;
            }
            else {
                /* Quest leaders and guardians are always seen */
                const pmndx = (pal.mndx ?? pal.mnum ?? -1) | 0;
                const ps = (pmndx >= 0 && pmndx < _MSOUND.length) ? (_MSOUND[pmndx] | 0) : 0;
                if (ps === MS_LEADER_DM || ps === MS_GUARDIAN_DM)
                    return 1;
            }
        }
    }
    return 0;
}
/* -----------------------------------------------------------------------
 * score_targ — C ref: dogmove.c:738-835
 * Scores a potential ranged attack target.
 *
 * C control flow with early returns:
 *   if (!mconf || !rn2(3) || Is_qstart) {
 *     ... many non-RNG checks with early returns (score -= 3000/5000) ...
 *     ... vampshifter: rn2(mtmp_lev/2+1) ...
 *     score += level scores
 *   }
 *   score += rnd(5);   ← ALWAYS fires (both confused and non-confused)
 *   if (mconf && !rn2(3)) score -= 1000;
 *   return score;
 *
 * CRITICAL EARLY RETURNS (before rnd(5)):
 *   - Quest leaders/guardians → score -= 5000, return
 *   - Coaligned faithfuls     → score -= 5000, return
 *   - Adjacent (dist <= 1)    → score -= 3000, return
 *   - Tame/peaceful/hero      → score -= 3000, return
 *   - Behind master           → score -= 3000, return
 *
 * For early-game pets, hero is usually at mux/muy → find_targ returns hero →
 * score_targ returns -3000 without rnd(5) → best_target returns null →
 * pet_ranged_attk returns MMOVE_NOTHING.
 * ----------------------------------------------------------------------- */
/* C dungeon.h:110-111,132: Is_qstart = assigned level plus on_level. */
function is_qstart_dm(lev) {
    const q = game.qstart_level;
    return !!(q && (q.dnum || q.dlevel) && lev
        && lev.dnum === q.dnum && lev.dlevel === q.dlevel);
}

function score_targ(mtmp, mtarg) {
    let score = 0;
    if (!(mtmp.mconf | 0) || !rn2(3) || is_qstart_dm(game.u?.uz)) {
        /* C: multiple early returns (score -= 3000 or -5000) before rnd(5).
         * Order follows C dogmove.c:748-790 exactly; the pseudo-youmonst target
         * skips the msound / priest-alignment arms (gy.youmonst is never a quest
         * leader and its isminion/ispriest are FALSE, so faith2 is FALSE). */
        if (mtarg !== game.u) {
            /* C dogmove.c:766-769 — never target quest friendlies. */
            const tmndx = (mtarg?.mndx ?? mtarg?.mnum ?? -1) | 0;
            const tsound = (tmndx >= 0 && tmndx < _MSOUND.length) ? (_MSOUND[tmndx] | 0) : 0;
            if (tsound === MS_LEADER_DM || tsound === MS_GUARDIAN_DM)
                return -5000;
            /* C dogmove.c:750-774 — protect coaligned priests/minions. */
            const faith1 = mtmp.isminion || mtmp.ispriest;
            const faith2 = mtarg.isminion || mtarg.ispriest;
            const align1 = mtmp.isminion ? mtmp.mextra.emin.min_align : mtmp.mextra?.epri?.shralign;
            const align2 = mtarg.isminion ? mtarg.mextra.emin.min_align : mtarg.mextra?.epri?.shralign;
            if (faith1 && faith2 && align1 === align2 && mtarg.mpeaceful)
                return -5000;
        }
        /* Adjacent target: score -= 3000, return (C dogmove.c:775-779) */
        if (mtarg && distmin_dogmove(mtmp.mx, mtmp.my, mtarg.mx ?? 0, mtarg.my ?? 0) <= 1) {
            score -= 3000;
            return score;
        }
        /* Tame target or the hero: score -= 3000, return (C dogmove.c:780-785) */
        if (mtarg === game.u || (mtarg && (mtarg.mtame | 0))) {
            score -= 3000;
            return score;
        }
        /* C dogmove.c:786-790 — is master/pet behind the monster?  Missing
         * entirely until now, so every such target drew an rnd(5) C skips. */
        if (find_friends(mtmp, mtarg, 15)) {
            score -= 3000;
            return score;
        }
        // C score_targ: hostility, passive attacks, and relative strength
        // affect which target wins even though most of this consumes no RNG.
        if (!mtarg.mpeaceful) score += 10;
        const targetPm = (mtarg.mndx ?? mtarg.mnum ?? -1) | 0;
        const targetAttacks = mon_mattk_raw(targetPm);
        if ((targetAttacks?.[0]?.[0] ?? AT_NONE) === AT_NONE) score -= 1000;
        const targetLevel = mtarg.m_lev | 0;
        let petLevel = mtmp.m_lev | 0;
        const heroLevel = game.u?.ulevel | 0;
        if ((targetLevel < 2 && petLevel > 5)
            || (petLevel > 12 && targetLevel < petLevel - 9
                && heroLevel > 8 && targetLevel < heroLevel - 7))
            score -= 25;
        const cham = mtmp.cham;
        const petPm = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
        if ((cham === PM_VAMPIRE || cham === PM_VAMPIRE_LORD
             || cham === PM_VLAD_THE_IMPALER)
            && _MONS[petPm]?.[0] !== _MONS[PM_VAMPIRE][0]) {
            petLevel = _MONS[cham][1];
            petLevel += rn2(Math.trunc(petLevel / 2) + 1);
            petLevel = Math.max(petLevel, mtmp.m_lev | 0);
        }
        if (targetLevel > petLevel + 4)
            score -= (targetLevel - petLevel) * 20;
        score += targetLevel * 2 + Math.trunc((mtarg.mhp | 0) / 3);
    }
    /* C dogmove.c:830: score += rnd(5) — fires for all NON-early-return paths */
    score += rnd(5);
    /* C dogmove.c:832: if (mconf && !rn2(3)) score -= 1000 */
    if ((mtmp.mconf | 0) && !rn2(3))
        score -= 1000;
    return score;
}

/* -----------------------------------------------------------------------
 * find_targ — C ref: dogmove.c:650-691
 * Find first monster in direction (dx,dy) from pet, within maxdist.
 * No RNG. Returns a monster object or null.
 * ----------------------------------------------------------------------- */
function find_targ(mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx | 0;
    let cury = mtmp.my | 0;
    const u = game.u;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        /* C dogmove.c:711: if (!isok(curx, cury)) break;
         * isok(x,y) = x >= 1 && x <= COLNO-1 && y >= 0 && y <= ROWNO-1. */
        if (curx < 1 || curx > COLNO - 1 || cury < 0 || cury > ROWNO - 1)
            break;
        /* C dogmove.c:721-722: if (!m_cansee(mtmp, curx, cury)) break;
         * m_cansee(mtmp, x, y) = clear_path(mtmp->mx, mtmp->my, x, y) — a real
         * line-of-sight check.  The pet stops scanning a direction at the first
         * square it cannot see (wall/door/dark), so it does NOT find targets
         * behind obstructions.  (Was stubbed "assume visible", which made the
         * pet find targets C never sees → a spurious score_targ rnd(5).) */
        if (!clear_path(mtmp.mx | 0, mtmp.my | 0, curx, cury))
            break;
        /* C: if (curx == mtmp->mux && cury == mtmp->muy) return &youmonst */
        if (curx === (mtmp.mux | 0) && cury === (mtmp.muy | 0))
            return game.u; /* pseudo-youmonst */
        /* C dogmove.c:727-735: targ = m_at(curx, cury); accept it as a target
         * only if visible to the pet AND not mundetected AND (for a long worm)
         * this square is the head, not a tail segment. */
        const m = m_at_dm(curx, cury);
        if (m) {
            /* C dogmove.c:729-732 — an invisible tame pet is visible to
             * this pet only when its species has M1_SEE_INVIS.  The
             * reconstructed monster may lack `data`, so use the
             * authoritative MONS row as the same fallback. */
            const _petdata = mtmp.data ?? { mflags1: _MONS[(mtmp.mndx ?? mtmp.mnum ?? -1) | 0]?.[6] ?? 0 };
            if ((!m.minvis || perceives_dm(_petdata))
                && !(m.mundetected | 0)
                && (m.mx | 0) === curx && (m.my | 0) === cury /* not tail */)
                return m;
            /* C: pet can't see it → assume it ain't there; keep scanning. */
        }
    }
    return null;
}

/* -----------------------------------------------------------------------
 * best_target — C ref: dogmove.c:885-933
 * Find best ranged attack target among all 8 directions.
 * Calls find_targ (no RNG) then score_targ (fires rnd(5) per target found).
 * ----------------------------------------------------------------------- */
function best_target(mtmp, forced) {
    if (!mtmp || !(mtmp.mcansee | 0))
        return null;
    let bestscore = -40000;
    let best_targ = null;
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            if (!dx && !dy) continue;
            const temp_targ = find_targ(mtmp, dx, dy, 7);
            if (!temp_targ) continue;
            const currscore = score_targ(mtmp, temp_targ);
            if (currscore > bestscore) {
                bestscore = currscore;
                best_targ = temp_targ;
            }
        }
    }
    if (!forced && bestscore < 0)
        best_targ = null;
    return best_targ;
}

/* -----------------------------------------------------------------------
 * pet_ranged_attk — C ref: dogmove.c:935-1015
 * Pet considers and maybe executes a ranged attack.
 * Returns MMOVE_DONE if attack made, MMOVE_NOTHING otherwise.
 *
 * RNG consumed:
 *  - score_targ → rnd(5) for each target found by find_targ
 *  - If hungry: rn2(5)
 *  - If target and attack: mattackm → complex (skip attack)
 * ----------------------------------------------------------------------- */
/* -----------------------------------------------------------------------
 * pet_has_ranged_attk — does this pet have any RANGED attack type?
 * C ref: implicit in mattackm — only AT_SPIT/AT_BREA/AT_GAZE/AT_MAGC (and a
 * wielded AT_WEAP that can be thrown) produce a hit at distmin > 1; all melee
 * attack types `continue` (mhitm.c:429) leaving res[] == M_ATTK_MISS.
 *
 * We lack a full per-monster attack table in JS.  Every pet in PET_ATTK and
 * the unknown-pet fallback is melee-only (AT_BITE), so the early-game pet
 * cluster has NO ranged attack → this returns false and pet_ranged_attk falls
 * through to MMOVE_NOTHING, matching C.  WIRE_PENDING: when the full mons[]
 * attack table is ported, consult it here (attacktype AT_SPIT/AT_BREA/etc.).
 * No RNG consumed.
 * ----------------------------------------------------------------------- */
function pet_has_ranged_attk(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const attk = PET_ATTK.get(mndx);
    if (!attk) return false; /* unknown pet → assume melee-only (early-game) */
    const a = attk.aatyp | 0;
    return a === AT_SPIT || a === AT_BREA || a === AT_GAZE
        || a === AT_MAGC || a === AT_WEAP;
}

/* C mondata.h:46 haseyes(ptr) — !(M1_NOEYES) */
function haseyes_dm(data) {
    const mndx = (data?.pmidx ?? data?.mndx ?? -1) | 0;
    if (mndx < 0 || mndx >= _MONS.length) return true;
    return ((_MONS[mndx][6] | 0) & 0x00001000) === 0;
}

export async function pet_ranged_attk(mtmp, forced) {
    /* C: hungry check */
    let hungry = 0;
    if (!(mtmp.isminion | 0)) {
        const edog = mtmp.mextra?.edog;
        if (edog) {
            const moves = (game.moves ?? 0) | 0;
            hungry = (moves > (edog.hungrytime + DOG_HUNGRY)) ? 1 : 0;
        }
    }

    /* C: mtarg = best_target(mtmp, forced) — fires score_targ → rnd(5) per dir target */
    const mtarg = best_target(mtmp, forced);

    /* C: if (mtarg && (!hungry || !rn2(5))) { ... attack ... } */
    if (mtarg && (!hungry || !rn2(5))) {
        /* C dogmove.c:923 calls mattackm even when no ranged attack is
         * available. Its defender-state updates precede the attack-range
         * checks; substituting M_ATTK_MISS loses those effects. */
        {
            // C still calls mattackm for a melee-only pet's distant target.
            // Before rejecting out-of-range attacks it wakes the defender.
            if (mtarg === game.u) {
                /* C dogmove.c:910-919: a pet whose best target is the hero
                 * (confused pet) calls mattacku(); whatever it returns short of
                 * death the pet counts as having attacked and loses its move. */
                if (await mattacku(mtmp))
                    return MMOVE_DIED;
                return MMOVE_DONE;
            }
            if (mtarg !== game.u) {
                (game.gb ||= {}).bhitpos = { x: mtmp.mx, y: mtmp.my };
                (game.gn ||= {}).notonhead = false;
                const mstatus = await mattackm(mtmp, mtarg);
                if (mstatus & M_ATTK_AGR_DIED) return MMOVE_DIED;
                /* C dogmove.c:929-950 — the targeted nasty may strike back */
                if ((mstatus & M_ATTK_HIT) && !(mstatus & M_ATTK_DEF_DIED)
                    && rn2(4)) {
                    if (mtarg.mcansee && haseyes_dm(mtarg.data)) {
                        game.gb.bhitpos = { x: mtmp.mx, y: mtmp.my };
                        game.gn.notonhead = false;
                        const mresp = await mattackm(mtarg, mtmp);
                        if (mresp & M_ATTK_DEF_DIED) return MMOVE_DIED;
                    }
                }
                if (mstatus !== M_ATTK_MISS) return MMOVE_DONE;
            }
        }
    } else if (forced) {
        await domonnoise(mtmp);
    }
    return MMOVE_NOTHING;
}

/* -----------------------------------------------------------------------
 * mfndpos_stub — generates candidate positions for monster movement.
 * C ref: mon.c:2128 mfndpos — no RNG consumed.
 * Returns array of {x, y, info} objects.
 * Stub: returns all 8 adjacent cells that are within bounds.
 * Full port would check walls/doors/water/etc.
 * ----------------------------------------------------------------------- */
/* C ref: hack.h:1419 — NODIAG(monnum) = ((monnum) == PM_GRID_BUG); pm.generated.js: PM_GRID_BUG=116 */
const PM_GRID_BUG_DG = 116;

/* C trap.h trap-type enum (subset used by m_harmless_trap). */
const T_ARROW=1, T_DART=2, T_ROCK=3, T_SQKY=4, T_BEAR=5, T_LANDMINE=6,
      T_ROLLBOULDER=7, T_SLPGAS=8, T_RUST=9, T_FIRE=10, T_PIT=11, T_SPIKEDPIT=12,
      T_HOLE=13, T_TRAPDOOR=14, T_TELEP=15, T_LEVTELEP=16, T_MAGICPORTAL=17,
      T_WEB=18, T_STATUE=19, T_MAGIC=20, T_ANTIMAGIC=21, T_POLY=22, T_VIBSQ=23;
const M1_FLY_DM = 0x00000001, M1_AMORPHOUS_DM = 0x00000004, M1_UNSOLID_DM = 0x00100000;
const SILVER_DM = 14;                 /* C objclass.h:27 SILVER */



/* C ref: trap.h fixed_tele_trap(t) = (t->ttyp==TELEP_TRAP && isok(teledest)). */
function fixed_tele_trap_dm(ttmp) {
    if ((ttmp.ttyp | 0) !== T_TELEP) return false;
    const tx = ttmp.teledest?.x ?? ttmp.tx_dest ?? 0;
    const ty = ttmp.teledest?.y ?? ttmp.ty_dest ?? 0;
    return tx > 0 && tx < COLNO && ty >= 0 && ty < ROWNO;
}

function trapInfoBit(mtmp, nx, ny, flag) {
    const ttmp = t_at(nx, ny);
    if (!ttmp) return 0;
    const ttyp = ttmp.ttyp | 0;
    if (ttyp >= 24 /* TRAPNUM */ || ttyp === 0) return 0;
    if (fixed_tele_trap_dm(ttmp) && hastrack(nx, ny))
        return ALLOW_TRAPS;
    if (!m_harmless_trap(mtmp, ttmp)) {
        if (!(flag & ALLOW_TRAPS)) {
        }
        return ALLOW_TRAPS;
    }
    return 0;
}

function door_blocks_diag(loc) {
    if (!loc || (loc.typ | 0) !== DOOR_TYP) return false;
    const dm = (loc.doormask ?? loc.flags ?? 0) | 0;
    return (dm & ~D_BROKEN) !== 0;
}

/* C ref: hack.c:922 bad_rock(mdat,x,y) — for a non-tunneling, non-wallwalking
 * pet this reduces to IS_OBSTRUCTED(levl[x][y].typ) (Sokoban boulder path and
 * the dig/passwall exceptions don't apply to ordinary pets). */
function bad_rock_pet(loc) {
    const typ = (loc?.typ ?? 0) | 0;
    return typ < POOL_TYP; /* IS_OBSTRUCTED */
}

/* Faithful port of C mon.c:2128 mfndpos (pet subset: no ALLOW_WALL/DIG/BARS,
 * not a swimmer/flyer/lava-liker, sighted, unconfused, not amorphous).
 * Enumerates the 8 neighbours in C's column-major (nx outer, ny inner) order
 * and applies the rejection conditions in C's exact sequence so the candidate
 * COUNT and ORDER match C — which is what determines how many rn2() the
 * downstream dog_move selection loop draws. */
function mfndpos_stub(mtmp, allowflags) {
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const locs = game.level?.locations;
    const nowloc = locs?.[x]?.[y];
    const nowIsDoor = (nowloc?.typ | 0) === DOOR_TYP;
    /* C mon.c:2152 — nodiag = NODIAG(mdat - mons): grid bugs can't move diagonally. */
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const nodiag = (mndx === PM_GRID_BUG_DG);
    /* C mon.c:2238 — Is_rogue_level(&u.uz): on the rogue level a monster may not
     * move diagonally into OR out of a doorway.  Mirrors the const.js helper. */
    const onRogueLevel = !!Is_rogue_level_dm();
    const positions = [];
    for (let nx = x - 1; nx <= x + 1; nx++) {
        for (let ny = y - 1; ny <= y + 1; ny++) {
            if (nx === x && ny === y) continue;
            if (nx < 1 || nx >= COLNO - 1 || ny < 0 || ny >= ROWNO) continue;
            const loc = locs?.[nx]?.[ny];
            if (!loc) continue; /* off-map / no data → STONE, obstructed */
            const ntyp = loc.typ | 0;
            /* C mon.c:2200 — IS_OBSTRUCTED(ntyp) (no passwall/dig for a pet). */
            if (ntyp < POOL_TYP) continue;
            /* C mon.c:2219 — closed/locked door without thrudoor. */
            if (ntyp === DOOR_TYP) {
                const dm = (loc.doormask ?? loc.flags ?? 0) | 0;
                if (dm & (D_CLOSED | D_LOCKED)) continue;
            }
            const isDiag = (nx !== x && ny !== y);
            /* C mon.c:2233-2243 — first diagonal checks. */
            if (isDiag
                && (nodiag
                    || (nowIsDoor && door_blocks_diag(nowloc))
                    || (ntyp === DOOR_TYP && door_blocks_diag(loc))
                    || ((nowIsDoor || ntyp === DOOR_TYP) && onRogueLevel)))
                continue;
            /* C mon.c:2246-2247 — pool/lava gating.  A plain pet is not a
             * swimmer and not in air/lava-liking: poolok=lavaok=wantpool=FALSE,
             * so pool squares (is_pool) and lava squares are rejected. */
            if (ntyp >= POOL_TYP && ntyp <= DRAWBRIDGE_UP_TYP) continue; /* is_pool */
            if (ntyp === LAVAPOOL_TYP || ntyp === LAVAWALL_TYP) continue; /* is_lava */
            let info = 0;
            /* C mon.c:2271-2285 — hero at (nx,ny). */
            const u = game.u;
            if (u && (u.ux | 0) === nx && (u.uy | 0) === ny) {
                if (!(allowflags & ALLOW_U)) continue;
                info |= ALLOW_U;
            } else {
                /* C mon.c:2287-2305 — another monster at (nx,ny). */
                if (allowflags & ALLOW_M) {
                    for (let m = game.fmon; m; m = m.nmon) {
                        if ((m.mhp | 0) > 0 && (m.mx | 0) === nx && (m.my | 0) === ny
                                && !m.mtame) {
                            info |= ALLOW_M;
                            break;
                        }
                    }
                }
            }
            /* C mon.c:2322-2326 — boulder check: exclude squares with a boulder unless
             * ALLOW_ROCK is set. Pets don't have ALLOW_ROCK (flags=0x600a0000), so
             * boulder squares are always excluded for ordinary pets.
             * C ref: checkobj && sobj_at(BOULDER, nx, ny) && !(flag & ALLOW_ROCK) → continue.
             * OBJ_AT(nx,ny) ↔ !!game.level.levelObjects[nx][ny] (the checkobj equivalent). */
            if (game.level?.levelObjects?.[nx]?.[ny]) {
                /* sobj_at(BOULDER, nx, ny): walk the nexthere chain */
                let _hasBoulder = false;
                for (let _o = game.level.levelObjects[nx][ny]; _o; _o = _o.nexthere) {
                    if ((_o.otyp | 0) === BOULDER_OTYP) { _hasBoulder = true; break; }
                }
                if (_hasBoulder && !(allowflags & ALLOW_ROCK))
                    continue;
                if (_hasBoulder)
                    info |= ALLOW_ROCK;
            }
            /* C mon.c:2333-2335 — diagonal tight squeeze between two bad-rock
             * squares (a pet that can't squeeze through). */
            if (isDiag && bad_rock_pet(locs?.[x]?.[ny]) && bad_rock_pet(locs?.[nx]?.[y]))
                continue;
            /* C mon.c:2341-2358 — mark ALLOW_TRAPS for a (non-harmless) trap. */
            info |= trapInfoBit(mtmp, nx, ny, allowflags);
            positions.push({ x: nx, y: ny, info });
        }
    }
    return positions;
}

/* mattackm_rng_stub — DELETED.  It was a second body for C's mattackm()
 * (mhitm.c:292-615): a calibrated RNG-order model that the live dog_move ALLOW_M
 * branch called instead of the real port below.  The real mattackm() is now
 * wired at C's call sites (dogmove.c:1204, 1218), so keeping the model would
 * leave two divergent JS copies of one C function. */

const _PM_FLOATING_EYE = 28;


/* -----------------------------------------------------------------------
 * mattackm — C ref: nethack-c/src/mhitm.c:292-594
 * Monster-vs-monster attack. Returns M_ATTK_* flags.
 * ----------------------------------------------------------------------- */
const M_ATTK_AGR_DONE$ = 0x08;
/* AD_DRIN/AD_WRAP/AD_STCK/AD_DGST and AT_HUGS/AT_EXPL: single definitions live
 * in the monattk.h block near the top of this file.  They used to be
 * re-declared here with invented numbering (AD_DRIN was 12 = C's AD_STUN,
 * AD_WRAP 10, AD_STCK 9, AD_DGST 11, AT_EXPL 14 = C's AT_BOOM). */
/* PM_BLACK_PUDDING/PM_BROWN_PUDDING/PM_SHADE used to be re-declared here as
 * PM_*$ with invented indices (233/232/285) instead of the real v5 mons[]
 * slots (209/207/288, js/pm.generated.js, cross-checked against
 * nethack-c-v5/upstream/src/mhitm.c:456-511's `mons[PM_BLACK_PUDDING]` etc.)
 * — a wrong-index local copy of the class undefined-const-lint's `$`-suffix
 * bug hid from the lint (it flagged the bare unsuffixed name as an
 * undefined-const false positive, never the wrong value on the real,
 * in-scope `$` name). Now imported from pm.generated.js like every other
 * PM_* this file already uses unaliased. */
const NEED_WEAPON$ = 1;
/* C monst.h:32 enum wpn_chk_flags — NEED_HTH_WEAPON is 3; 2 is
 * NEED_RANGED_WEAPON.  This was 2, which sent mattackm's melee wield check
 * (mhitm.c:407) down mon_wield_item's RANGED arm.  It read as harmless while
 * that arm wrongly wielded select_rwep's return value (a hand-thrown missile
 * is usually the same object select_hwep would pick), and became visible the
 * moment the ranged arm was corrected to wield gp.propellor as C does. */
const NEED_HTH_WEAPON$ = 3;



/* Stubs and helpers for mattackm */
function helpless_dm(mon) {
    if (!mon) return true;
    if (mon.msleeping) return true;
    if (!mon.mcanmove) return true;
    return false;
}


function DEADMONSTER_dm(mon) {
    if (!mon) return true;
    return (mon.mhp | 0) < 1;
}




/* C mon.c m_at(x, y).  js/uhitm.js owns the single port and this file already
 * imports it; the previous `return null` body was a second, degenerate copy. */
function m_at_dm(x, y) { return m_at(x, y); }

function unsolid_dm(data) {
    if (!data) return false;
    return (data.mflags1 & M1_UNSOLID_DM) ? true : false;
}

function touch_petrifies_dm(data) {
    const n = data?.pmidx ?? data?.mnum ?? data?.mndx;
    return (n | 0) === PM_CHICKATRICE || (n | 0) === PM_COCKATRICE;
}



function mon_offmap_dm(mdef) {
    if (!mdef) return true;
    return (mdef.mstate | 0) !== 0;
}

function objects_material_dm(otyp) {
    return (otyp >= 0 && otyp < MKOBJ_OC_MATERIAL.length)
        ? (MKOBJ_OC_MATERIAL[otyp] | 0) : 0;
}


function sgn_dm(n) { return n > 0 ? 1 : (n < 0 ? -1 : 0); }



/* C mon.c:3254 mondied(mdef) — mondead() plus the corpse roll:
 *
 *     mondead(mdef);
 *     if (!DEADMONSTER(mdef)) return;
 *     if (corpse_chance(mdef, NULL, FALSE)
 *         && (accessible(mdef->mx, mdef->my) || is_pool(mdef->mx, mdef->my)))
 *         (void) make_corpse(mdef, CORPSTAT_NONE);
 *
 * Split out of monkilled_dm() so the OTHER mon.c:3264 call site can reach it:
 * mthrowu.c:473 ohitmon() ends a monster's life with `mondied(mtmp)` whenever
 * svc.context.mon_moving is set, and js/mhitu.js carried that as a named GAP
 * ("mondied is still a throw-stub") while this file had the whole body.
 * monkilled_dm() is now monkilled()'s pline plus a call to this. */
export async function mondied_dm(mdef, mondead_only = false) {
    /* C mon.c:3088-3089 mondead(): potential pet message; always clear the
     * global flag. */
    const be_sad = !!game.iflags?.sad_feeling;
    if (game.iflags) game.iflags.sad_feeling = false;
    mdef.mhp = 0;
    await lifesaved_monster(mdef);
    if ((mdef.mhp | 0) > 0) return;
    /* C mon.c:3098-3100 mondead(): vampire in bat/fog/wolf form reverts to
     * vampire instead of dying (is_vampshifter: cham is PM_VAMPIRE{,_LORD}/VLAD). */
    if ([PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER].includes(mdef.cham | 0) && await vamprises(mdef))
        return;
    /* C mon.c:3100-3101 — a pet killed out of sight (monkilled's else arm). */
    if (be_sad)
        await You('have a sad feeling for a moment, then it passes.');
    /* C mon.c:3103-3104: the dead monster still occupies the grid while
     * add_region() repaints its cloud, until mon_leaving_level removes it. */
    mdef._dyingInGrid = true;
    /* C mon.c:3103-3104 mondead(): steam vortex leaves a harmless cloud */
    if ((mdef.mnum ?? mdef.mndx) === PM_STEAM_VORTEX)
        create_gas_cloud_dm(mdef.mx, mdef.my, rn2(10) + 5, 0);
    /* C mon.c:3108-3111 mondead(): a dead vault guard is kept at <0,0> until
     * his temporary corridor has been removed (grddead may rloc() whatever
     * wandered into it); if not disposed, mondead returns before m_detach, but
     * mondied() still runs corpse_chance (the guard is DEADMONSTER). */
    if (mdef.isgd) {
        const disposed = await grddead(mdef);
        /* Parked at <0,0> (parkguard): m_detach's mon_leaving_level sees
         * onmap == FALSE (mon.c:2698), so there is no remove/newsym/relobj
         * show for him; only unstuck() and the died++ remain. */
        if (!disposed || (mdef.mx | 0) === 0) {
            mdef._dyingInGrid = false;
            if (disposed) {
                mdef.mtrapped = 0;
                await unstuck_dm(mdef);
                const g = game;
                const mndx_dead = (mdef.mndx ?? mdef.mnum ?? -1) | 0;
                if (g.mvitals && mndx_dead >= 0) {
                    const mv = (g.mvitals[mndx_dead] ||= { born: 0, died: 0, mvflags: 0 });
                    if ((mv.died | 0) < 255) mv.died = (mv.died | 0) + 1;
                }
                record_death_achievement(mndx_dead, mdef);
                mdef.mstate = (mdef.mstate | 0) | MON_DETACH;
                game.iflags.purge_monsters = (game.iflags.purge_monsters | 0) + 1; /* C mon.c:2796 m_detach */
                if (mdef.m_id === game.stealmid) thiefdead(); // C mon.c:2782-2783
                if (mdef.isshk) await shkgone(mdef); // C mon.c:2784-2785
            }
            if (mondead_only)
                return;
            if ((await corpse_chance_uh(mdef, null, false))
                && (accessible(mdef.mx | 0, mdef.my | 0) || is_pool(mdef.mx | 0, mdef.my | 0)))
                await make_corpse(mdef, mdef.mx | 0, mdef.my | 0, CORPSTAT_NONE);
            return;
        }
    }
    const deadMx = mdef.mx | 0;
    const deadMy = mdef.my | 0;
    const priorData = mdef.data; /* C mon.c:3112: save for m_detach before restoring the form. */
    if (typeof process !== 'undefined' && ENV?.FF_DEATH_TRACE === '1') {
        const cell = game.level?.at(deadMx, deadMy);
        pushRngLogEntry(`^mondied_dm[x=${deadMx},y=${deadMy},mndx=${(mdef.mndx ?? mdef.mnum ?? -1) | 0},` +
            `mhp=${mdef.mhp | 0},typ=${cell?.typ ?? -1},seenv=${cell?.seenv ?? -1},` +
            `lit=${cell?.lit ? 1 : 0},waslit=${cell?.waslit ? 1 : 0},minvent=${mdef.minvent ? 1 : 0}]`);
    }
    /* C mon.c:3113-3116 mondead(): "restore chameleon, lycanthropes to true
     * form at death" — before m_detach() and before mondied()'s
     * corpse_chance(), which reads mon->data (mon.c:3248 tmp uses the TRUE
     * form's geno/size).  Mirrors js/uhitm.js xkilled's same restore. */
    {
        const _cham = (mdef.cham == null ? -1 : mdef.cham) | 0;
        const _cur = (mdef.mnum ?? -1) | 0;
        let _true = -1;
        if (_cham >= 0) {
            _true = _cham;
            mdef.cham = -1; /* NON_PM */
        } else if (_cur === PM_WEREJACKAL) _true = PM_HUMAN_WEREJACKAL;
        else if (_cur === PM_WEREWOLF) _true = PM_HUMAN_WEREWOLF;
        else if (_cur === PM_WERERAT) _true = PM_HUMAN_WERERAT; /* mon.c:3117 */
        if (_true >= 0) set_mon_data(mdef, permonstTemplate(_true));
    }
        /* Apply these writes at m_detach below, after its light teardown. */
    mdef.mhp = 0;
    /* Same pre-detach window as js/mklev.js mondead(): until the inlined
     * m_detach's mon_leaving_level() remove_monster() (the newsym below), C's
     * svl.level.monsters still holds this monster — `_dyingInGrid` keeps the
     * fmon-walking m_at/MON_AT family answering "occupied" for its square
     * through kop_revival()'s makemon() → enexto_core() → goodpos(). */
    {
        const g = game;
        const mndx_dead = (mdef.mndx ?? mdef.mnum ?? -1) | 0;
        if (g.mvitals && mndx_dead >= 0) {
            const mv = (g.mvitals[mndx_dead] ||= { born: 0, died: 0, mvflags: 0 });
            if ((mv.died | 0) < 255) mv.died = (mv.died | 0) + 1;
            // C mon.c:3141-3144: a dead mail daemon prevents further delivery.
            if (mndx_dead === PM_MAIL_DAEMON) mv.mvflags |= G_GENOD;
        }
    }
    /* C mon.c:3138-3140 mondead(): leader identity survives polymorph. */
    if (mdef.m_id === game.svq.quest_status.leader_m_id)
        game.svq.quest_status.leader_is_dead = true;
    /* C mon.c:3147-3165 mondead(): dead Kops may return, before m_detach
     * and mondied()'s corpse_chance roll. */
    await kop_revival(mdef);
    record_death_achievement((mdef.mndx ?? mdef.mnum ?? -1) | 0, mdef);
    /* levl[][].glyph is hero memory; glyph_is_invisible_at() reads the painted cell, which under_water() blanks. */
    if (game.level?.at(deadMx, deadMy)?.remembered_glyph?.cls === GLYPHCLS_INVIS) unmap_object(deadMx, deadMy);

    /* C mon.c:2741-2749 m_detach: retire the old form's mobile light before
     * mon_leaving_level.  Otherwise a freed monster keeps vision dirty and
     * every later vision refresh consumes extra hallucination display draws. */
    if (mdef.mleashed) m_unleash(mdef, false);
    if (deadMx > 0 && emits_light(priorData))
        del_light_source(LS_MONSTER, monst_to_any(mdef));
    mdef.mtrapped = 0;
    await unstuck_dm(mdef);

    /* C mon.c:2700 leaves mx/my untouched on death (the zeroing is #if 0'd
     * out in C itself — "too many places assume that the stale monst->mx,my
     * values are still valid"). Off-map status is carried by mstate alone. */
    mdef.mstate = (mdef.mstate | 0) | MON_DETACH;
    game.iflags.purge_monsters = (game.iflags.purge_monsters | 0) + 1; /* C mon.c:2796 m_detach */
    /* C mon.c:2709-2710 mon_leaving_level(): a long worm takes its whole tail
     * off the map (remove_worm, newsym per segment) before the head newsym. */
    mdef._dyingInGrid = false; /* remove_monster precedes newsym */
    if (mdef.wormno)
        remove_worm(mdef);
    /* C mon.c:2722 mon_leaving_level(): newsym only `if (onmap)`; a steed is never
     * placed on the map (mon.c:2534), so the hero's square is not repainted here. */
    if (mdef !== game.u?.usteed) newsym(deadMx, deadMy);

    if (mdef.iswiz) wizdeadorgone(); /* C mon.c:2761-2762, before relobj */
    await quest_monster_died(mdef);
    await relobj_dead_dm(mdef);
    if (mdef.m_id === game.stealmid) thiefdead(); // C mon.c:2782-2783
    if (mdef.isshk) await shkgone(mdef); // C mon.c:2784-2785
    /* C mon.c:2786-2787 m_detach(): if (mtmp->wormno) wormgone(mtmp); */
    if (mdef.wormno)
        wormgone_real(mdef);
    /* C mon.c:2799-2801 m_detach() tail: hero is thrown from his steed when it
     * dies or gets genocided. */
    if (game.u && mdef === game.u.usteed)
        await dismount_steed_qm(0 /* DISMOUNT_GENERIC */);

    /* C mon.c:3234 corpse_chance (default/common case):
     *   tmp = 2 + ((mdat->geno & G_FREQ) < 2) + verysmall(mdat);
     *   return !rn2(tmp);
     */
    /* corpse_chance's four RNG-free early arms (mon.c:3184-3233: lich, AT_BOOM,
     * level-nocorpse, bigmonst/golem/mplayer/rider/shk -> TRUE) live in the shared
     * body; the inlined tail alone drew a spurious rn2(tmp) for them. */
    if (mondead_only)
        return; /* mon.c:3400-3401 disintegested: mondead() only, never a corpse */
    if ((await corpse_chance_uh(mdef, null, false)) && (accessible(deadMx, deadMy) || is_pool(deadMx, deadMy)))
        await make_corpse(mdef, deadMx, deadMy, CORPSTAT_NONE);
}

/* C uhitm.c:4694-4745 mhitm_ad_sedu(), monster-vs-monster arm (also reached for
 * AD_SITM and AD_SSEX): a thief takes the defender's first usable item and a
 * nymph then teleports away (rloc, RLOC_NOMSG), ending its turn (AGR_DONE).
 * mselftouch (uhitm.c:4727) is RNG-free and not modelled here. */
/* C uhitm.c:4492-4565 mhitm_ad_dgst, mon-vs-mon arm only (the hero arms never
 * reach mattackm).  Gap: the Rider arm (mondied of a pet that eats a Rider). */
const NC_SHOW_MSG_DG = 0x01; /* C NC_SHOW_MSG */
async function mhitm_ad_dgst_mm(magr, mdef, mhm) {
    if (game.flags?.verbose !== false && !Deaf())
        pline('"Burrrrp!"');
    wake_nearto_dg(magr.mx, magr.my, 2 * 2); /* Burrrrp! */
    mhm.damage = mdef.mhp;
    let obj = mlifesaver_dg(mdef);
    if (obj)
        await m_useup_dg(mdef, obj);

    /* Is a corpse for nutrition possible?  It may kill magr */
    if (!(await corpse_chance_uh(mdef, magr, true)) || DEADMONSTER_dm(magr))
        return;

    const num = (mdef.mndx ?? mdef.mnum) | 0;
    const g = game;
    const mv = (g.mvitals?.[num] || { mvflags: 0 });
    if (magr.mtame && !(magr.isminion | 0) && !((mv.mvflags | 0) & G_NOCORPSE) && !((_MONS[num]?.[3] | 0) & G_NOCORPSE)) {
        const virtualcorpse = await mksobj_dg(CORPSE_OTYP, false, false);
        set_corpsenm_dg(virtualcorpse, num);
        let nutrit = dog_nutrition(magr, virtualcorpse);
        await dealloc_obj(virtualcorpse);
        /* only 50% nutrition, 25% of normal eating time */
        if (magr.meating > 1)
            magr.meating = Math.trunc((magr.meating + 3) / 4);
        if (nutrit > 1)
            nutrit = Math.trunc(nutrit / 2);
        magr.mextra.edog.hungrytime += nutrit;
    }
}

async function mhitm_ad_sedu_mm(magr, mdef, mhm) {
    if (magr.mcan)
        return;
    let obj;
    for (obj = mdef.minvent; obj; obj = obj.nobj)
        if (!magr.mtame || !obj.cursed)
            break;
    if (obj) {
        let onambuf = '';
        const buf = Monnam_dm(magr);
        await extract_from_minvent_tp(mdef, obj, true, false);
        if (game.v?.vis)
            onambuf = await doname(obj);
        await add_to_minv_real(magr, obj);
        if (game.v?.vis && canseemon(mdef))
            pline(buf + ' steals ' + onambuf + ' from ' + mon_nam_dm(mdef) + '!');
        await possibly_unwield(mdef, false);
        mdef.mstrategy = (mdef.mstrategy | 0) & ~0x20000000 /* STRAT_WAITFORU */;
        if (DEADMONSTER_dm(mdef)) {
            mhm.hitflags = M_ATTK_DEF_DIED
                           | ((await grow_up(magr, mdef)) ? 0 : M_ATTK_AGR_DIED);
            mhm.done = true;
            return;
        }
        if ((permonstTemplate(magr.mndx ?? magr.mnum).mlet | 0) === S_NYMPH && !tele_restrict_tp(magr)) {
            const couldspot = canspotmon(magr);
            mhm.hitflags = M_ATTK_AGR_DONE$;
            await rloc_tp(magr, 0x04 /* RLOC_NOMSG */);
            if (game.v?.vis && couldspot && !canspotmon(magr))
                pline(buf + ' suddenly disappears!');
        }
    }
    mhm.damage = 0;
}







export async function dog_move(mtmp, after) {
    /* C: edog = EDOG(mtmp) if mtame && has_edog */
    const edog = (mtmp.mtame && mtmp.mextra?.edog) ? mtmp.mextra.edog : null;

    /* C: if (!edog && !mtmp->isminion) impossible() */
    if (!edog && !(mtmp.isminion | 0)) {
        await polystone_impossible('dog_move for non-pet?');
        return MMOVE_NOTHING;
    }

    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const u   = game.u;
    const moves = (game.moves ?? 0) | 0;

    /* C: dog_hunger(mtmp, edog) — check starvation */
    if (edog && await dog_hunger(mtmp, edog))
        return MMOVE_DIED;

    /* C: udist = distu(omx, omy) */
    let udist = distu(omx, omy);

    /* C dogmove.c:1015-1020 — "Let steeds eat and maybe throw rider during
     * Conflict".  resist_conflict() draws rnd(20) whenever Conflict is on. */
    if (mtmp === game.u?.usteed) {
        if (_conflict_dm() && !resist_conflict(mtmp)) {
            await dismount_steed_qm(2 /* DISMOUNT_THROWN */);
            return MMOVE_MOVED;
        }
        udist = 1;
    } else if (!udist) {
        /* swallowed case */
        return MMOVE_NOTHING;
    }

    let nix = omx;
    let niy = omy;

    /* C dogmove.c:1030 declares `int appr, whappr, udist;` once at the top of
     * dog_move() and assigns whappr in BOTH arms of the edog test below.  This
     * used to be two `var whappr` declarations, one per arm — legal (var is
     * function-scoped and hoisted, so both wrote the same binding) but a
     * duplicate declaration in one scope, which is how a real second binding
     * sneaks in unnoticed.  One declaration, C's. */
    let whappr;
    /* C: if (edog) { j = dog_invent(...); ... } */
    if (edog) {
        const j = await dog_invent(mtmp, edog, udist);
        if (j === 2 || mon_offmap_dm(mtmp))
            return (mtmp.mhp | 0) < 1 ? MMOVE_DIED : MMOVE_DONE;
        if (j === 1)
            /* ate something — C `goto newdogpos` with nix/niy == omx/omy */
            return leash_kludge_dm(mtmp, omx, omy, nix, niy);

        const moves_c = FF_FAITHFUL ? moves : (moves - 1);
        whappr = ((moves_c - (edog.whistletime | 0)) < 5) ? 1 : 0;
    } else {
        whappr = 0;
    }

    /* C: appr = dog_goal(mtmp, edog, after, udist, whappr) */
    const appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2)
        return MMOVE_NOTHING;

    if (_conflict_dm() && !resist_conflict(mtmp)) {
        if (!edog) {
            /* C dogmove.c:1050 lose_guardian_angel(mtmp) (minion.c:468) */
            await lose_guardian_angel(mtmp);
            return MMOVE_DIED;
        }
    }

    /* C dogmove.c:1062: allowflags = mon_allowflags(mtmp).
     * This used to be a hand-inlined literal justified by "mon_allowflags()
     * itself is still unported" — stale: js/monmove.js:mon_allowflags is a full
     * transcription of mon.c:2064-2124 (m_move's own site already calls it).
     * The literal also silently dropped mon.c:2086
     *     if (Conflict && !resist_conflict(mtmp)) allowflags |= ALLOW_U;
     * which is the SECOND of the two rnd(20)s C draws here. */
    const allowflags = mon_allowflags(mtmp);

    /* C: cnt = mfndpos(mtmp, &mfp, allowflags)
     * WIRING: real mfndpos (js/mklev.js) replaces mfndpos_stub. mfndpos
     * writes parallel data.poss[]/data.info[] arrays (C struct layout);
     * zip them into the same {x,y,info} shape mfndpos_stub returned so the
     * rest of this function (unchanged below) keeps working. */
    const mfp = { cnt: 0, poss: [], info: [] };
    const real_cnt = mfndpos(mtmp, mfp, allowflags);
    const mfp_poss = [];
    for (let i = 0; i < real_cnt; i++)
        mfp_poss.push({ x: mfp.poss[i].x, y: mfp.poss[i].y, info: mfp.info[i] | 0 });
    const cnt = mfp_poss.length;

    /* C: compute uncursedcnt — number of candidate positions without cursed items */
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const { x: nx, y: ny, info } = mfp_poss[i];
        if (m_at(nx, ny) && !((info & ALLOW_M) || (info & ALLOW_MDISP)))
            continue;
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    /* C: better_with_displacing = should_displace(mtmp, &mfp, gg.gx, gg.gy).
     * mfndpos supplies ALLOW_MDISP for eligible adjacent monster squares. */
    const gg  = game.gg ?? { gx: 0, gy: 0, gtyp: UNDEF };
    const better_with_displacing = should_displace(mtmp, mfp, gg.gx | 0, gg.gy | 0);

    let chcnt = 0;
    let chi   = -1;
    const GDIST = (x, y) => dist2(x | 0, y | 0, gg.gx | 0, gg.gy | 0);
    let nidist = GDIST(nix, niy);
    let do_eat = false;
    let eatObj  = null;
    const cursemsg = new Array(cnt).fill(false);

    for (let i = 0; i < cnt; i++) {
        const { x: nx, y: ny, info } = mfp_poss[i];
        cursemsg[i] = false;

        /* C: if leashed and distu > 4, skip */
        if ((mtmp.mleashed | 0) && distu(nx, ny) > 4)
            continue;

        /* C: if guardian (!edog) and too far, skip */
        if (!edog) {
            const j2 = distu(nx, ny);
            if (j2 > 16 && j2 >= udist)
                continue;
        }

        /* C: ALLOW_M branch — attack adjacent monster
         * C ref: dogmove.c:1155-1222 */
        if (info & ALLOW_M) {
            /* Find the monster at (nx, ny). */
            /* C dogmove.c:1101-1102 MON_AT/m_at read the level's monster grid,
             * which also holds a long worm's tail segments (mx,my is the head),
             * so an fmon scan on (mx,my) missed them and fell through to the
             * object loop (a spurious dogfood rn2(100)). */
            /* C dogmove.c:1103 `mtmp2 = m_at(nx, ny)` — level.monsters[][] also
             * holds long-worm TAIL squares (the head's monst), which a walk
             * comparing m.mx/m.my against <nx,ny> never matches. */
            const mtmp2 = m_at(nx, ny);
            if (mtmp2) {
                const agr_mlev = (mtmp.m_lev | 0);
                const agr_mhp  = (mtmp.mhp | 0);
                const agr_mhpmax = (mtmp.mhpmax | 0) || 1;
                const balk = agr_mlev + Math.trunc((5 * agr_mhp) / agr_mhpmax) - 2;
                const mndx_def = (mtmp2.mndx ?? mtmp2.mnum ?? 0) | 0;
                const def_mlev_base = (mndx_def >= 0 && mndx_def < _MONS.length)
                    ? (_MONS[mndx_def][1] | 0) : 0;
                const def_mlev = (mtmp2.m_lev ?? def_mlev_base) | 0;

                /* C dogmove.c:1118-1126, all four disjuncts.  Conflict has no
                 * source in this port (see m_avoid_kicked_loc above), so
                 * !Conflict is TRUE throughout. */
                const def_msound = (mndx_def >= 0 && mndx_def < _MSOUND.length)
                    ? (_MSOUND[mndx_def] | 0) : 0;
                if (def_mlev >= balk
                    || ((mtmp2.mtame | 0) && (mtmp.mtame | 0) && !_conflict_dm())
                    || (max_passive_dmg(mtmp2, mtmp) >= agr_mhp)
                    || (((agr_mhp * 4 < agr_mhpmax)
                         || def_msound === MS_GUARDIAN_DM
                         || def_msound === MS_LEADER_DM)
                        && (mtmp2.mpeaceful | 0) && !_conflict_dm())) {
                    /* dog balks — skip this position, try next */
                    continue;
                }

                /* C dogmove.c:1127-1141: skip foes whose touch/gaze is
                 * dangerous unless a ranged attack is viable; ranged_only
                 * then also skips (dogmove.c:1143 FIXME). */
                {
                    const _pm = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
                    const _pdat = mtmp.data ?? { mflags1: _MONS[_pm]?.[6] ?? 0 };
                    const _haseyes = !((_pdat.mflags1 | 0) & 0x00001000);
                    if ((mndx_def === _PM_FLOATING_EYE && rn2(10)
                         && (mtmp.mcansee | 0) && _haseyes && (mtmp2.mcansee | 0)
                         && (!(mtmp2.minvis | 0) || perceives_dm(_pdat))
                         && !await mon_reflects_dm(mtmp, null))
                        || (mndx_def === 8 && rn2(10)) /* PM_GELATINOUS_CUBE */
                        || (touch_petrifies_dm({ mnum: mndx_def })
                            && !resists_ston_dm(mtmp))) {
                        if (dist2(mtmp.mx | 0, mtmp.my | 0, mtmp2.mx | 0, mtmp2.my | 0) <= 2
                            || best_target(mtmp, false) !== mtmp2)
                            continue;
                        continue; /* ranged_only */
                    }
                }

                if (after) {
                    /* C dogmove.c:1199: if (after) return MMOVE_NOTHING */
                    return MMOVE_NOTHING;
                }

                /* C dogmove.c:1200-1204:
                 *   gb.bhitpos.x = nx, gb.bhitpos.y = ny;
                 *   gn.notonhead = mtmp2->mx != nx || mtmp2->my != ny;
                 *   mstatus = mattackm(mtmp, mtmp2);
                 * bhitpos is read back by mattackm's i>0 target-still-there
                 * guard (mhitm.c:381), so it must be set BEFORE the call. */
                (game.gb ||= {}).bhitpos = { x: nx | 0, y: ny | 0 };
                (game.gn ||= {}).notonhead =
                    ((mtmp2.mx | 0) !== (nx | 0) || (mtmp2.my | 0) !== (ny | 0));
                const mstatus = await mattackm(mtmp, mtmp2);

                if (mstatus & M_ATTK_AGR_DIED)
                    return MMOVE_DIED;

                if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT) {
                    if (rn2(4)
                        && (mtmp2.mlstmv | 0) !== (game.moves | 0)
                        && !onscary(mtmp.mx | 0, mtmp.my | 0, mtmp2)
                        /* C mon.c monnear(mon,x,y): dist2 < 3, with dist2 == 2
                         * (a diagonal) rejected for a grid bug (NODIAG). */
                        && (monnear(mtmp2, mtmp.mx | 0, mtmp.my | 0)
                            && !(((mtmp2.mnum ?? mtmp2.mndx ?? -1) | 0) === PM_GRID_BUG_DG
                                 && dist2(mtmp2.mx | 0, mtmp2.my | 0,
                                          mtmp.mx | 0, mtmp.my | 0) === 2))) {
                        /* C dogmove.c:1216-1218 */
                        game.gb.bhitpos = { x: mtmp.mx | 0, y: mtmp.my | 0 };
                        game.gn.notonhead = false;
                        const mstatus2 = await mattackm(mtmp2, mtmp);
                        if (mstatus2 & M_ATTK_DEF_DIED)
                            return MMOVE_DIED; /* pet died in counter-attack */
                    }
                }
                return MMOVE_DONE;
            }
            /* No monster found at (nx,ny) despite ALLOW_M — shouldn't happen.
             * Fall through to treat as normal move. */
        }

        /* C dogmove.c:1224-1233 — a displacing pet swaps places with the
         * adjacent monster when that route is preferable.  mfndpos now emits
         * ALLOW_MDISP and mdisplacem is live, so retaining the old inert stub
         * here skipped both the displacement's rn2(7) and the position swap. */
        if ((info & ALLOW_MDISP) && m_at(nx, ny)
            && better_with_displacing && !undesirable_disp(mtmp, nx, ny)) {
            const mtmp2 = m_at(nx, ny);
            const mstatus = await mdisplacem(mtmp, mtmp2, false);
            if (mstatus & M_ATTK_DEF_DIED)
                return MMOVE_DIED;
            return MMOVE_NOTHING;
        }

        if (m_avoid_kicked_loc(mtmp, nx, ny))
            continue;
        if (m_avoid_soko_push_loc(mtmp, nx, ny))
            continue;

        if (info & ALLOW_TRAPS) {
            const trap = t_at(nx, ny);
            if (trap) {
                if (mtmp.mleashed | 0) {
                    if (!Deaf_dm())
                        whimper_dm(mtmp);
                } else if (trap.tseen && rn2(40)) {
                    continue;
                }
            }
        }

        if (edog) {
            let goto_newdogpos = false;
            const can_reach_food = could_reach_item(mtmp, nx, ny);
            const firstObj = game.level?.levelObjects?.[nx]?.[ny];
            for (let obj = firstObj; obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else if (can_reach_food) {
                    /* C: dogfood(mtmp, obj) — fires rn2(100) */
                    const otyp = dogfood(mtmp, obj);
                    const hungrytime = edog.hungrytime | 0;
                    if (otyp < MANFOOD
                        && (otyp < ACCFOOD || hungrytime <= moves)) {
                        nix = nx;
                        niy = ny;
                        chi = i;
                        do_eat = true;
                        eatObj = obj;
                        cursemsg[i] = false;
                        goto_newdogpos = true;
                        break;
                    }
                }
            }
            if (goto_newdogpos)
                break; /* C: goto newdogpos */
        }

        /* C: if cursed and not forced, usually skip */
        if (cursemsg[i] && !(mtmp.mleashed | 0) && uncursedcnt > 0
            && rn2(13 * uncursedcnt))
            continue;

        /* C: backtrack avoidance (only when !leashed and >5 from hero) */
        if (!(mtmp.mleashed | 0) && distmin_dogmove(mtmp.mx, mtmp.my, u?.ux ?? 0, u?.uy ?? 0) > 5) {
            const k = edog ? uncursedcnt : cnt;
            let skip = false;
            const mtrack = mtmp.mtrack ?? [];
            for (let j = 0; j < MTSZ && j < k - 1; j++) {
                if (mtrack[j] && nx === mtrack[j].x && ny === mtrack[j].y) {
                    if (rn2(MTSZ * (k - j))) {
                        skip = true;
                        break;
                    }
                }
            }
            if (skip) continue;
        }

        /* C: j = (ndist - nidist) * appr; position selection */
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

    /* C: pet_ranged_attk(mtmp, FALSE) — fires score_targ → rnd(5) per dir */
    if (!do_eat) {
        const ra = await pet_ranged_attk(mtmp, false);
        if (ra !== MMOVE_NOTHING)
            return ra;
    }

    /* newdogpos: */
    if (nix !== omx || niy !== omy) {
        if (chi >= 0 && (mfp_poss[chi].info & ALLOW_U)) {
            if (mtmp.mleashed | 0) {
                void pline(`${Monnam_dm(mtmp)} breaks loose of ${mhis_dm(mtmp)} leash!`);
                m_unleash(mtmp, false);
            }
            await mattacku(mtmp);
            return MMOVE_DONE;
        }
        /* C dogmove.c:1289 */
        if (!m_in_out_region_dm(mtmp, nix, niy))
            return MMOVE_MOVED;
        /* C dogmove.c:1291-1292: a tame digger heading into rock/wall/door
         * spends this move wielding its pick (mon_wield_item) instead. */
        if (await m_digweapon_check(mtmp, nix, niy))
            return MMOVE_NOTHING;
        /* C dogmove.c:1354: wasseen = canseemon(mtmp) BEFORE the move. */
        const wasseen = !!canseemon(mtmp);
        /* C: move monster */
        /* Stub: update position */
        mtmp.mx = nix;
        mtmp.my = niy;
        if (chi >= 0 && cursemsg[chi] && (wasseen || canseemon(mtmp))) {
            /* C dogmove.c:1360: o = (!Hallucination && hero_memory && glyph_is_object) ? vobj_at : 0 */
            /* C tests the REMEMBERED glyph (levl[][].glyph), not the live pile:
             * a pet stepping onto a corpse the hero has never seen reads
             * "something", not the object's name. */
            const _rg = game.level?.at?.(nix, niy)?.remembered_glyph;
            const o = (!dm_hallucinating() && game.level?.flags?.hero_memory
                       && _rg?.cls === GLYPHCLS_OBJ_DM) ? top_floor_obj(nix, niy) : null;
            const what = o ? (await distant_obj_name(o)) : 'something';
            const verb = vtense(null, locomotion(mtmp.data, 'step')); // C dogmove.c:1308
            const prep = (is_flyer_dm(mtmp) || is_floater_dm(mtmp)) ? 'over' : 'onto';
            pline_mon(mtmp, "%s", `${noit_Monnam(mtmp)} ${verb} reluctantly ${prep} ${what}.`);
        }
        /* C: mon_track_add(mtmp, omx, omy) — update mtrack */
        if (!mtmp.mtrack) mtmp.mtrack = [];
        mtmp.mtrack.unshift({ x: omx, y: omy });
        if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;
        /* C dogmove.c newdogpos does NOT call newsym at all: remove_monster() and
         * place_monster() (rm.h:534 / steed.c:898) only touch svl.level.monsters,
         * and the redraw belongs to the CALLER, postmov().  postmov splits the
         * pair around mintrap: newsym(omx,omy) at monmove.c:1508, then
         * mintrap(), the door block, then newsym(mtmp->mx,mtmp->my) at
         * monmove.c:1656.  Doing both here drew the pet on its DESTINATION cell
         * before mintrap could speak, so a --More-- raised by mintrap's pline
         * flushed a screen C had not painted yet.  See js/monmove.js m_move()
         * pet branch for the two calls in their C positions. */
        /* C dogmove.c:1379-1381: if (do_eat) dog_eat(mtmp, obj, omx, omy, FALSE).
         * The pet has just been moved onto the food tile (nix,niy == eatObj tile);
         * dog_eat fires the eat pline + the two obj_resists (dogfood + delobj). */
        if (do_eat && eatObj) {
            if ((await dog_eat(mtmp, eatObj, omx, omy, false)) === 2)
                return MMOVE_DIED;
        }
        return MMOVE_MOVED;
    }

    return leash_kludge_dm(mtmp, omx, omy, nix, niy);
}

/* C dogmove.c:1322-1355 — newdogpos's `else if (mtmp->mleashed &&
 * distu(omx, omy) > 4)` arm ("an incredible kludge"). */
function leash_kludge_dm(mtmp, omx, omy, nix, niy) {
    if (mtmp.mleashed && distu(omx, omy) > 4) {
        const u = game.u;
        const nx = sgn_dm(omx - (u.ux | 0));
        const ny = sgn_dm(omy - (u.uy | 0));
        const cc = { x: (u.ux | 0) + nx, y: (u.uy | 0) + ny };
        let found = !!goodpos_real(cc.x, cc.y, mtmp, 0);
        if (!found) {
            const i = xytodir_dm(nx, ny);
            /* hack.h DIR_LEFT/RIGHT/LEFT2/RIGHT2 */
            const l1 = (i + 7) % 8, r1 = (i + 1) % 8;
            const l2 = (i + 6) % 8, r2 = (i + 2) % 8;
            for (let j = l1; !found && j < r1; j++) {
                dirtocoord_dm(cc, j);
                if (goodpos_real(cc.x, cc.y, mtmp, 0)) found = true;
            }
            for (let j = l2; !found && j < r2; j++) {
                dirtocoord_dm(cc, j);
                if (goodpos_real(cc.x, cc.y, mtmp, 0)) found = true;
            }
            if (!found) {
                cc.x = mtmp.mx;
                cc.y = mtmp.my;
            }
        }
        /* dognext: (stale nix/niy are C's) */
        if (!m_in_out_region_dm(mtmp, nix, niy))
            return MMOVE_MOVED;
        mtmp.mx = cc.x;
        mtmp.my = cc.y;
        newsym(cc.x, cc.y);
        set_apparxy_dm(mtmp);
    }
    return MMOVE_MOVED;
}


/* C ref: nethack-c/include/mondata.h:29
 *   #define passes_walls(ptr) (((ptr)->mflags1 & M1_WALLWALK) != 0L)
 * M1_WALLWALK is nethack-c/include/monflag.h:88 == 0x00000008.  Value confirmed
 * by compiling the real headers (printf "%lx", M1_WALLWALK) — NOT 0x00080000,
 * which is M1_SLITHY and which a sibling file had wrong under this name. */
const M1_WALLWALK_DM = 0x00000008;
function passes_walls(mon_data) {
    return ((mon_data.mflags1 | 0) & M1_WALLWALK_DM) !== 0;
}

export { dmgtype };





/* C dogmove.c:1430-1440 qm[] — "Things that some pets might be thinking about".
 * PM ids (pm.generated.js): LITTLE_DOG 16, DOG 18, LARGE_DOG 19, KITTEN 32,
 * HOUSECAT 33, LARGE_CAT 37, GIANT_RAT 89; S_DOG 4; S_sink = cmap "sink";
 * TRIPE_RATION otyp 264. */
const QM_S_SINK = DEFSYM_EXPL_QM.indexOf('sink');
const QM_TABLE = [
    [16, 0, 32, 3], [18, 0, 33, 3], [19, 0, 37, 3], [32, 0, 16, 3],
    [33, 0, 18, 3], [37, 0, 19, 3], [33, 0, 89, 3],
    [0, 4, QM_S_SINK, 1], [0, 0, 264, 2],
];

/* C dogmove.c:1461 mnum_leashable() */
function mnum_leashable_qm(mnum) {
    const d = permonstTemplate(mnum);
    if (!d) return false;
    const f1 = d.mflags1 >>> 0;
    const nolimbs = (f1 & 0x6000) === 0x6000, has_head = !(f1 & 0x8000);
    return !!(mnum >= 0 && mnum !== PM_LONG_WORM && !(f1 & M1_UNSOLID_DM)
              && (!nolimbs || has_head));
}

export async function quickmimic(mtmp) {
    const u = game.u;
    const prot = u?.uprops?.[PROT_SHAPE_QM];
    if ((prot && ((prot.intrinsic | 0) || (prot.extrinsic | 0))) || !(mtmp.meating | 0))
        return;
    const was_leashed = !!(mtmp.mleashed | 0);
    if (mtmp === u?.usteed)
        await dismount_steed_qm(DISMOUNT_POLY);

    let idx = 0, trycnt = 5;
    const mndx = (mtmp.data?.pmidx ?? mtmp.mnum) | 0;
    do {
        idx = rn2(QM_TABLE.length);
        const q = QM_TABLE[idx];
        if (q[0] !== 0 && mndx === q[0]) break;
        if (q[1] !== 0 && (mtmp.data.mlet | 0) === q[1]) break;
        if (q[0] === 0 && q[1] === 0) break;
    } while (--trycnt > 0);
    if (trycnt === 0)
        idx = QM_TABLE.length - 1;

    const buf = y_monnam_qm(mtmp);
    const spotted = canspotmon(mtmp);
    const seeloc = cansee(mtmp.mx | 0, mtmp.my | 0);

    mtmp.m_ap_type = QM_TABLE[idx][3];
    mtmp.mappearance = QM_TABLE[idx][2];

    if (spotted || seeloc || canspotmon(mtmp)) {
        const x = mtmp.mx | 0, y = mtmp.my | 0;
        const gl = () => {
            const l = game.level?.at(x, y);
            return l ? [l.disp_ch, l.disp_color, l.disp_cls, l.disp_obj_otyp,
                        l.disp_obj_corpsenm, l.disp_attr, l.disp_mon_pm, l.disp_mon_kind,
                        l.disp_mon_female].join('|') : '';
        };
        const prev_glyph = gl();
        const apt = mtmp.m_ap_type | 0, app = mtmp.mappearance | 0;
        const what = (apt === 1) ? DEFSYM_EXPL_QM[app]
            : (apt === 2 && OC_DESCR_QM[app]) ? OC_DESCR_QM[app]
            : (apt === 2 && OC_NAME_QM[app]) ? OC_NAME_QM[app]
            : (apt === 3) ? pmname_dm(permonstTemplate(app), Mgender_dm(mtmp))
            : 'something';

        newsym(x, y);
        if (was_leashed && (apt !== 3 || !mnum_leashable_qm(app))) {
            await Your('leash goes slack.');
            m_unleash(mtmp, false);
        }
        let fmt, args;
        if (gl() !== prev_glyph) {
            fmt = '%s %s %s where %s was!';
            args = [seeloc ? 'see' : 'sense that',
                    (what !== 'something') ? an_qm(what) : what,
                    seeloc ? 'appear' : 'has appeared', buf];
        } else {
            fmt = 'sense that %s feels rather %s-ish.';
            args = [buf, what];
        }
        await You(fmt, ...args);
        const msg = 'You ' + nh_sprintf(fmt, args);
        /* display_nhwindow(WIN_MAP, TRUE) */
        topl_force_break_after_qm(msg);
    }
}

/* C dogmove.c:1448-1458 finish_meating(mtmp).  Besides ending the meal, a
 * non-mimic which had assumed an appearance while eating a mimic must shed
 * that appearance and repaint its square.  This exported body is shared by
 * mhitm.sleep_monst(), so every production caller gets the same C behavior. */
export function finish_meating(mtmp) {
    mtmp.meating = 0;
    if (((mtmp.m_ap_type | 0) & 0x7 /* M_AP_TYPMASK */) !== 0 /* M_AP_NOTHING */
        && (mtmp.data?.mlet | 0) !== 13 /* S_MIMIC */) {
        mtmp.m_ap_type = 0;
        mtmp.mappearance = 0;
        newsym(mtmp.mx | 0, mtmp.my | 0);
    }
}



/* seemimic: the LOCAL `no-op stub` IS DELETED.  It shadowed the C-faithful
 * body at js/mhitm.js:2609 (C mon.c:4409 — m_ap_type = M_AP_NOTHING,
 * mappearance = 0, newsym) at mdisplacem()'s call site below (C mhitm.c:210),
 * so a displaced mimic silently kept its disguise and its map glyph was never
 * redrawn.  RNG-free on both sides.  Imported from './mhitm.js' at the header;
 * that module already imports finish_meating from THIS file, so the cycle
 * already exists and is function-call-only (no module-evaluation-time use). */
import { update_monster_region } from './region.js';
import { ENV } from './hostenv.js';
import { lose_guardian_angel } from './minion.js';
import { m_harmless_trap } from './trap.js'; // relocate-fns
import { mtrapped_in_pit } from './mhitu.js'; // relocate-fns
import { possibly_unwield } from './weapon.js'; // relocate-fns
import { dogfood } from './dog.js'; // relocate-fns
import { thrwmm } from './mthrowu.js'; // relocate-fns
import { can_carry, mon_to_stone, monstone } from './mon.js'; // relocate-fns
import { mhitm_knockback } from './uhitm.js'; // relocate-fns
import { mattackm, mdisplacem } from './mhitm.js'; // relocate-fns
export { engulf_target, mattackm, mdisplacem, paralyze_monst, rustm } from './mhitm.js'; // relocate-fns
export { ARTICLE_THE_DM, MZ_HUGE, M_ATTK_AGR_DONE$, NEED_HTH_WEAPON$, PM_GRID_BUG_DG, _PM_FLOATING_EYE, _conflict_dm, helpless_dm, m_at_dm, mhis_dm, mon_nam_dm, mon_offmap_dm, passes_walls, resists_ston_dm, touch_petrifies_dm }; // relocate-fns
export { mhitm_knockback } from './uhitm.js'; // relocate-fns
export { DEADMONSTER_dm, DOOR_TYP, sgn_dm, unsolid_dm }; // relocate-fns
export { monstone } from './mon.js'; // relocate-fns
export { BOULDER_OTYP, COIN_CLASS_, LARGEST_INT, M1_NOHANDS, M2_ROCKTHROW, MONS_CWT, MZ_MEDIUM, MZ_TINY, NC_SHOW_MSG_DG, SILVER_DM, STATUE_OTYP, SUPPRESS_SADDLE_DM, S_NYMPH, _has_mgivenname_dm, obj_weight }; // relocate-fns
export { MON_WEP_dm, M_ATTK_MISS, distmin_dogmove }; // relocate-fns
export { dogfood } from './dog.js'; // relocate-fns
export { ACCFOOD, APPORT, BALL_CLASS, CADAVER, CHAIN_CLASS, CORPSE_OTYP, DOGFOOD, FOOD_CLASS, LUMP_OF_ROYAL_JELLY_OTYP, MANFOOD, PM_FIRE_ELEMENTAL_DM, PM_SALAMANDER_DM, S_GOLEM, S_LIGHT_C, UNDEF, _is_elf, _mf1, _mf2, _noncorporeal, haseyes_dm, is_rider_dm, ismnum_js, objects_material_dm }; // relocate-fns
export { AT_WEAP, NEED_WEAPON$ }; // relocate-fns
export { M1_AMORPHOUS_DM, M1_FLY_DM, M1_UNSOLID_DM, MONS_MSIZE, MZ_SMALL, S_VORTEX, T_ANTIMAGIC, T_ARROW, T_BEAR, T_DART, T_FIRE, T_HOLE, T_LANDMINE, T_LEVTELEP, T_MAGIC, T_MAGICPORTAL, T_PIT, T_POLY, T_ROCK, T_ROLLBOULDER, T_RUST, T_SLPGAS, T_SPIKEDPIT, T_SQKY, T_STATUE, T_TELEP, T_TRAPDOOR, T_VIBSQ, T_WEB, _MONS, _mlet, is_floater_dm }; // relocate-fns


/* Local helpers that exist in other modules but not exported */
function mhis_dm(mon) { return mhis_mon_mu(mon); } /* C mondata.c pronoun_gender via mhis() */
function is_rider_dm(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === PM_DEATH || (n | 0) === PM_PESTILENCE || (n | 0) === PM_FAMINE;
}
function resists_ston_dm(mtmp) { return !!resists_ston(mtmp); }

