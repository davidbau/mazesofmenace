import { spoteffects } from './landing-effects.js';
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
import { get_atkdam_type, is_youmonst as is_youmonst_mu, ugolemeffects as ugolemeffects_mh,
         seemimic as seemimic_real, killed as killed_real } from './mhitm.js';
import { erode_armor as erode_armor_um } from './mhitm.js';
import monKbMsizePack from './makemon_msize.json' with { type: 'json' };
import monKbMattkPack from './makemon_mattk.json' with { type: 'json' };
import monKbMonsPack from './makemon_mons.json' with { type: 'json' };
import { rn2, rn1, rnd, d, pushRngLogEntry } from './rng.js';
import { pline, urgent_pline as urgent_pline_disp, newsym, mon_visible as mon_visible_disp, canspotmon as canspotmon_disp, map_invisible, tmp_at, obj_to_glyph, DISP_END, DISP_FLASH, DISP_TETHER, DISP_FREEMEM, Unaware as Unaware_real, shieldeff, _topline_more_pending, flush_pending_messages } from './display.js';
import { m_at as uhitm_m_at, hitval, mon_wield_item, dmgval, select_rwep } from './uhitm.js';
import { burnarmor as burnarmor_real, erode_obj, drain_en as drain_en_trap } from './trap.js';
/* C mhitu.c:968 summonmu delegates to msummon (sit.c:452). */
import { msummon as msummon_real } from './sit.js';
import { _mon_reflects_zap as mon_reflects_real } from './zap.js';
/* C uhitm.c:4424 mhitm_ad_legs — one body, shared by both attack directions. */
import { mhitm_ad_legs as mhitm_ad_legs_uh } from './uhitm.js';
import { PM_GREMLIN as PM_GREMLIN_MU } from './pm.generated.js';
const AD_LEGS_MU = 17;   /* monattk.h:59 */
/* C uhitm.c:4782 mhitm_adtyping — ONE dispatch shared by all three call
 * sites; js/uhitm.js's exported mhitm_ad_* bodies below already carry their
 * own `mdef === game.youmonst` (mhitu) branch (uhitm.c's mdef == &gy.youmonst
 * arm), correct for use here, and are unreachable from THIS file's own
 * dispatch without being wired in. Measured 2026-09-04
 * (tools/equiv-test/auto-replay-sweep.mjs, corrected mhitm_adtyping routing):
 * AD_ENCH/AD_FIRE/AD_HEAL/AD_PLYS/AD_RUST/AD_SLEE/AD_SLOW/AD_TLPT had NO case
 * in mhitm_adtyping_u's switch, so every one of these attacks landed in the
 * `default:` arm below — no message, no damage, and (for the ones that draw)
 * no RNG. */
import {
    mhitm_ad_ench as mhitm_ad_ench_uh,
    mhitm_ad_fire as mhitm_ad_fire_uh,
    mhitm_ad_heal as mhitm_ad_heal_uh,
    mhitm_ad_plys as mhitm_ad_plys_uh,
    mhitm_ad_rust as mhitm_ad_rust_uh,
    mhitm_ad_slee as mhitm_ad_slee_uh,
    mhitm_ad_slow as mhitm_ad_slow_uh,
    mhitm_ad_tlpt as mhitm_ad_tlpt_uh,
    u_slow_down as u_slow_down_uh,
} from './uhitm.js';
const AD_ENCH_MU = 41;  /* monattk.h:83 */
const AD_CURS_MU = 253; /* monattk.h:98 */
const AD_HEAL_MU = 27;  /* monattk.h:69 */
const AD_PLYS_MU = 14;  /* monattk.h:56 */
const AD_RUST_MU = 24;  /* monattk.h:66 */
const AD_TLPT_MU = 23;  /* monattk.h:65 */
const _SCROLL_CLASS_MU = 9, _SCR_BLANK_PAPER_MU = 365;
async function acid_damage_um(obj) {
    if (!obj) return;
    if ((obj.greased | 0)) {
        await erode_obj(obj, null, ERODE_CORRODE, 1 | 4);
    } else if ((obj.oclass | 0) === _SCROLL_CLASS_MU
               && (obj.otyp | 0) !== _SCR_BLANK_PAPER_MU) {
        obj.otyp = _SCR_BLANK_PAPER_MU;
        obj.spe = 0;
        obj.dknown = 0;
    } else {
        await erode_obj(obj, null, ERODE_CORRODE, 1 | 4);
    }
}
import { do_death_sequence, deadhero, done_in_by, pending_death_is_final, delayed_killer } from './end.js';
/* C potion.c:194 make_slimed() — mhitm_ad_slim's hero-defender arm. */
import { make_slimed } from './potion.js';
import { polymon as polymon_polyself } from './polyself.js';
/* C end.c:1023 done(), run at C's own position inside the attack loop. */
import { drain_pending_death_in_place } from './fastforward.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_AGR_DIED, M_ATTK_DEF_DIED, M_SEEN_NOTHING, M_SEEN_FIRE, M_SEEN_SLEEP, M_SEEN_REFL, SLEEP_RES as SLEEP_RES_MU, FIRE_RES as FIRE_RES_MU, STONE_RES as STONE_RES_MU, REFLECTING as REFLECTING_MU, NATTK, Upolyd as Upolyd_fn, INVIS, DISPLACED as DISPLACED_MU, SEE_INVIS, P_WHIP, Is_rogue_level, CONFUSION, SLIMED, CQ_CANNED, DETECT_MONSTERS as DETECT_MONSTERS_MU, DEAF, PROT_FROM_SHAPE_CHANGERS as PROT_FROM_SHAPE_CHANGERS_MU, CONFLICT as CONFLICT_MU, is_pit as is_pit_mu, NEW_MOON, ERODE_CORRODE, } from './const.js';
/* C exper.c:207 losexp(drainer) — mhitm_ad_drli's hero-defender arm. */
import { losexp } from './exper.js';
/* C attrib.c:509 exercise(i, incr) — mhitm_ad_phys_u's AT_HUGS "already
 * grabbed" arm (uhitm.c:4030), RNG-free (FALSE == decrement, no rn2). */
import { exercise, adjattrib, get_artifact, ART_NONARTIFACT, arti_spfx, arti_cspfx } from './attrib.js';
import { eat_brains } from './eat.js';
import { losespells, drain_weapon_skill } from './read.js';
/* objects[otyp].oc_oprop, extracted from the compiled include/objects.h — the
 * same table js/do_wear.js and js/mhitm.js read.  Pure data module, no cycle. */
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
/* C monst.h PM_ROPE_GOLEM — mhitm_ad_phys_u's AT_HUGS choke-vs-crush wording
 * (uhitm.c:4033). */
import { PM_ROPE_GOLEM as PM_ROPE_GOLEM_MU } from './pm.generated.js';
import { cmdq_clear, catch_lit as catch_lit_mu } from './cmd.js';
import { mbodypart as mbodypart_mu, snuff_candle as snuff_candle_mu } from './cmd.js';
/* C steal.c:569-570 — unpaid stolen objects are removed from the shop bill
 * before leaving inventory.  Reuse shk.js's canonical synchronous body. */
import { subfrombill as subfrombill_real, shop_keeper as shop_keeper_real } from './shk.js';
/* mwelded (C wield.c:1072) is used at the autoreturn_weapon arm below; the
   binding was never imported, so reaching that arm threw a ReferenceError. */
import { mwelded } from './cmd.js';
import { make_confused, make_stoned, make_sick, potionhit } from './potion.js';
import { SICK_RES as SICK_RES_MU, SICK_NONVOMITABLE as SICK_NONVOMITABLE_MU } from './const.js';
import { PM_MEDUSA, PM_ARCHON, PM_STONE_GOLEM, PM_INCUBUS, PM_HIGH_PRIEST, PM_PRIEST as PM_ALIGNED_CLERIC, PM_BARBED_DEVIL as PM_BARBED_DEVIL_MU, } from './pm.generated.js';
/* C mhitu.c:2536 `u.umonnum == PM_FLOATING_EYE` — passiveum()'s AD_PLYS arm. */
import { PM_FLOATING_EYE as PM_FLOATING_EYE_MU } from './pm.generated.js';
/* C mhitm.c:1210 paralyze_monst(mon, amt) — passiveum()'s AD_PLYS arm
 * (mhitu.c:2551/:2557) shares the same body uhitm.js already wires for the
 * hero-attacks-monster direction. */
import { paralyze_monst as paralyze_monst_mu } from './dogmove.js';
/* C zap.c:5965 destroy_items(mon, dmgtyp, dmg_in) — the REAL body, ported for
 * exactly this file's hero-defender arms (js/zap.js:848's own comment names
 * this file).  This file's local `destroy_items` (below) is a `return false`
 * stub that draws nothing; mhitm_ad_elec_u called it and then commented "RNG
 * already consumed via rn2(20)" — wrong, destroy_items draws its OWN entry
 * rn2(DMG_DESTROY_SCALE) once the rn2(20) gate passes.  MEASURED on
 * probe-reach-melee/gen045-objective-seed1849727 record #107: C draws
 * rn2(5)@destroy_items(zap.c:5998) right after the rn2(20) gate; this port
 * drew nothing there and every later draw in the record shifted by one. */
import { destroy_items as destroy_items_zap, destroy_items_mon as destroy_items_mon_zap } from './zap.js';
import { mon_nam as uhitm_mon_nam } from './uhitm.js';
/* C mhitu.c:2359 assess_dmg() and mhitu.c:2501 passiveum()'s AD_STON arm both
 * call xkilled(mtmp, XKILL_NOMSG) — the SAME shared kill sequence uhitm.c uses.
 * This port used to substitute js/mklev.js mondead() there because xkilled() is
 * async and the hit chain was sync; that substitution skipped C's whole
 * post-mondead tail (the mon.c:3587 rn2(6) treasure drop, its mkobj chain, and
 * corpse_chance), which is the seed4500-knight-coverage first RNG divergence at
 * leaf 101687. */
import { xkilled as xkilled_uh, XKILL_NOMSG as XKILL_NOMSG_UH } from './uhitm.js';
import { dmgtype, mattackm, can_carry as can_carry_mu } from './dogmove.js';
import { name_to_mon, permonstTemplate, gender, poly_gender, find_offensive, lined_up, monflee, monPmname } from './makemon.js';
import { noteleport_level as noteleport_level_mu, Inhell } from './makemon.js';
/* js/mhitu.js:262 declares a local `mon_nam` stub that returns the literal
 * "monster"; tele_restrict's pline needs the real uhitm.c:232 body. */
import { mon_nam as mon_nam_uh } from './uhitm.js';
/* C mondata.c:1367 locomotion() — the "tries to run away with" verb. */
import { locomotion } from './mhitm.js';
/* C mhitu.c:1176 Amonnam(mtmp) — the hider-reveal message's subject. */
import { Amonnam as Amonnam_mu } from './mhitm.js';
import { mksobj } from './mklev.js';
/* C mthrowu.c:190 drop_throw -> stackobj(obj) (mkobj.c:2170). */
import { stackobj } from './sp_lev.js';
import { nomul, night, stop_occupation as real_stop_occupation } from './allmain.js';
/* C mhitu.c:974-1012 — were-creature summoning and form changes.  were.js
 * already owns the synchronous transformation and async compatible-critter
 * helpers; wire them here rather than spending the C gates and dropping the
 * effects. */
import { is_were as is_were_real, new_were as new_were_real,
         were_summon as were_summon_real, set_ulycn as set_ulycn_real } from './were.js';
/* The real canseemon — this file also declares a file-local
 * `canseemon() { return false; }` stub, which the older arms below still use. */
import { canseemon as canseemon_mu, tp_sensemon as tp_sensemon_mu, sensemon as sensemon_mu } from './display.js';
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
import { ureflects as ureflects_mm } from './makemon.js';
/* C mondata.c:79-85 poly_when_stoned(ptr) — the real port lives in
 * js/mhitm.js (mhitm.js is already imported extensively above, no new
 * cycle). js/dogmove.js ALSO carries a same-named
 * `function poly_when_stoned(data) { return false; }` stub — do not pick it
 * by filename; the mhitm.js one is the real body. */
import { poly_when_stoned as poly_when_stoned_mh } from './mhitm.js';
/* C timeout.c:955-980 fall_asleep(how_long,wakeup_msg) — RNG-free. */
import { fall_asleep as fall_asleep_to } from './timeout.js';
/* C mondata.c:1557-1568 monstseesu(seenres) — RNG-free. The real port lives
 * in js/mcastu.js (which already imports mdamageu FROM this file, so this
 * closes an existing cycle rather than opening a new one). js/mhitm.js also
 * carries a same-named copy but it is a local, unexported stub there — do
 * not pick it by filename. */
import { monstseesu as monstseesu_mc, monstunseesu as monstunseesu_mc } from './mcastu.js';
import { bot as bot_mu } from './display.js';
/* C display.c:2064 cls()'s opening display_nhwindow(WIN_MESSAGE, FALSE) — the
 * page this port's cls() does not do (see expels_gu). */
import { force_more_pages as force_more_pages_mu,
         _topl_merge_result as _topl_merge_result_mu,
         _topl_joins_snapshot as _topl_joins_snapshot_mu } from './display.js';
import { cansee as cansee_mu, vision_recalc as vision_recalc_mu } from './vision.js';
import { is_waterwall as is_waterwall_mu } from './dokick.js';
/* explmu's callees (C mhitu.c:1589-1665).  Every one of these has a REAL body
 * elsewhere in js/ and this file carries a file-local no-op or `return false`
 * shadow of two of them (resists_blnd at :220, make_blinded at :314), so the
 * real ones are imported under aliases rather than reached by bare name. */
import { mon_explodes as mon_explodes_mu, make_blinded as make_blinded_real_mu,
         BlindedTimeout as BlindedTimeout_mu } from './zap.js';
import { make_hallucinated as make_hallucinated_mu } from './potion.js';
import { mondead as mondead_mu, wake_nearto as wake_nearto_mu } from './mklev.js';
import { ugolemeffects as ugolemeffects_mu, resists_blnd as resists_blnd_real_mu } from './mhitm.js';
import { PM_BLACK_LIGHT as PM_BLACK_LIGHT_MU, PM_VIOLET_FUNGUS as PM_VIOLET_FUNGUS_MU } from './pm.generated.js';
import { isok as isok_mu, IS_OBSTRUCTED as IS_OBSTRUCTED_MU, IRONBARS as IRONBARS_MU,
         SINK as SINK_MU, u_at as u_at_mu } from './const.js';
import { BACKTRACK as BACKTRACK_MU, W_WEP as W_WEP_MU, HAND as HAND_MU,
         FOOT as FOOT_MU, LEG as LEG_MU } from './const.js';
import { closed_door as closed_door_mu, is_pool as is_pool_mu } from './look.js';
import { observe_object as observe_object_mu } from './o_init.js';
/* C invent.c:1208 hold_another_object() — u_catch_thrown_obj's tail.  Lives in
 * its own module: it is invent.c, and js/cmd.js (which hosts the rest of
 * invent.c) is owned by another lane. */
import { hold_another_object } from './hold_another_object.js';
/* C objnam.c:2424 simpleonames(obj) — minimal_xname made plural for quan>1.
 * RNG-free; C evaluates it twice in the u_catch_thrown_obj call, once per
 * argument, so calling it once and reusing the string is faithful. */
import { simpleonames as simpleonames_mu } from './objnam.js';
import { obj_resists as obj_resists_mu } from './dogmove.js';
import { thitu as thitu_mu, monkilled_trap as monkilled_mu,
         openholdingtrap as openholdingtrap_mu } from './trap.js';
import { t_at as t_at_mu } from './trap.js';
/* ── engulf/swallow (gulpmu, expels) ── */
import { failed_grab as failed_grab_mu } from './dogmove.js';
import monMsizePack_mu from './makemon_msize.json' with { type: 'json' };
const MONS_MSIZE_MU = monMsizePack_mu.msize;
import { place_monster as place_monster_mu } from './steed.js';
import { unstuck as unstuck_mu } from './dog.js';
import { swallowed as swallowed_mu, docrt_flags as docrt_flags_mu, topl_force_break_now as topl_force_break_now_mu } from './display.js';
import { acurr as acurr_raw_mu } from './attrib.js';
import { arti_defn_adtyp as arti_defn_adtyp_u } from './attrib.js';
function acurr_mu(i) { return acurr_raw_mu(game.u, i) | 0; }
import { use_offensive } from './muse.js';
/* dobuzz is the ray engine breamm() fires (C mthrowu.c:1123).  js/zap.js
 * already imports ignite_items from this file, so this is a cycle — both
 * bindings are hoisted `export function` declarations and neither module
 * calls the other at evaluation time, so the cycle is inert. */
import { dobuzz, destroy_items as destroy_items_hero_zap } from './zap.js';
import { m_lined_up } from './makemon.js';
import { cloak_simple_name, helm_simple_name, an, the, obj_is_pname, mshot_xname, singular, Tobjnam, makeplural } from './objnam.js';
/* C obj.h:257 bimanual(otmp) — (WEAPON_CLASS || TOOL_CLASS) && oc_bimanual.
 * Imported rather than re-listed: js/do_wear.js already owns the one copy the
 * public floor and the train canary run against, and mhitu.js already imports
 * from that module on this very line, so this adds NO module edge. */
import { xname, bimanual as bimanual_mu } from './do_wear.js';
/* ohitmon dependencies (C mthrowu.c:321).  Each is imported under a `_mu` alias
 * because this file carries older file-local stubs of several of these names. */
import { miss as miss_mu, hit as hit_mu,
         make_blinded as make_blinded_real,
         incr_HBlinded as incr_HBlinded_mu } from './zap.js';
import { distant_name as distant_name_mu } from './objnam.js';
import { find_mac as find_mac_mu } from './trap.js';
import { omon_adj as omon_adj_mu } from './cmd.js';
import { exclam as exclam_mu } from './uhitm.js';
/* NOT s_suffix: this file already has a local s_suffix_mu (:2303) that handles
 * a name already ending in 's' (C hacklib.c), which mhitm.js's exported
 * `s + "'s"` does not — the local is the more faithful body, so keep it. */
import { shade_miss as shade_miss_mu, can_blnd as can_blnd_mu,
         mon_hates_silver as mon_hates_silver_mu,
         hliquid as hliquid_mu } from './mhitm.js';
import { setmangry as setmangry_mu } from './mklev.js';
import { nonliving as nonliving_mu, monPmname as monPmname_mu } from './makemon.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
/* je_Monnam (mcastu.js Monnam) and VENOM_CLASS_MU are ALREADY bound in this
 * file (:66 and :1369) — re-importing either is a duplicate-declaration
 * SyntaxError, which is how this edit first failed `node --check`. */
/* C:363/384 — a mimic stops pretending when something hits it.  js/ has two
 * bodies: js/dogmove.js:3914 is an empty no-op stub, js/muse.js:428 is the real
 * one but is file-local there.  No corpus missile crosses a mimic; a local
 * no-op with the gap named beats importing the stub silently. */
function seemimic_mu(mtmp) { return seemimic_real(mtmp); }

/* thrwmu/monshoot/m_throw dependencies (C mthrowu.c). */
import { autoreturn_weapon, setmnotwielded } from './uhitm.js';
import { splitobj } from './makemon.js';
/* C mhitu.c:1917 — mdamageu()'s Upolyd arm. */
import { rehumanize } from './polyself.js';
/* C mhitu.c:924 mattacku's AT_MAGC case. */
import { castmu, buzzmu } from './mcastu.js';
/* C mcastu.c:322 touch_of_death — mhitm_ad_deth_u's Death-touch arm below. */
import { touch_of_death as touch_of_death_mc } from './mcastu.js';
/* C makemon.c:35 — getmattk()'s home-elemental damage doubling. */
import { is_home_elemental } from './makemon.js';
import { extract_from_minvent_dm } from './dogmove.js';
import { down_gate, ship_object, add_to_minv } from './dokick.js';
import { place_object, remove_object, set_ustuck as set_ustuck_mu } from './mklev.js';
import { mondied_dm } from './dogmove.js';
import { passive_obj } from './mhitm.js';
/* NOTE: this file carries a file-local `couldsee() { return false; }` stub at
 * :124 (feeding the unported Medusa-gaze arms, alongside the same file's
 * canseemon stub — the real one is already imported as canseemon_mu).  thrwmu
 * must use the REAL vision test, so import it under an alias rather than let
 * the stub shadow it; the gaze arms are left on the stub, out of scope here. */
import { couldsee as couldsee_mu } from './vision.js';
import { dist2, s_suffix } from './hacklib.js';
import { acurr } from './attrib.js';
import { calc_capacity } from './weight.js';
import { rnl } from './rng.js';
import { BLINDED, STUNNED, FUMBLING, A_INT, A_DEX, A_CON } from './const.js';
/* prop ids for the youprop.h macro block above (const.js:2310-2361). */
import { HALLUC as HALLUC_MU, HALLUC_RES as HALLUC_RES_MU, FAST as FAST_MU } from './const.js';
/* C dothrow.c flooreffects() — use the canonical do.c body.  cmd.js already
 * imports mhitu.js for noattacks_mndx, so this is an intentional cycle; both
 * sides expose function declarations and the call occurs after evaluation.
 * Keeping the real dispatcher here matters for missiles landing in water,
 * lava, pits, drawbridges, shops, and other non-floor terrain. */
import { flooreffects as flooreffects_real_mu } from './cmd.js';
async function flooreffects_mu(obj, x, y, verb) {
    return await flooreffects_real_mu(obj, x, y, verb);
}
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
const M_SEEN_MAGR = 0x0001;
/* M_SEEN_FIRE is imported from const.js */
const M_SEEN_COLD = 0x0004;
/* M_SEEN_SLEEP is imported from const.js */
const M_SEEN_DISINT = 0x0010;
const M_SEEN_ELEC = 0x0020;
const M_SEEN_POISON = 0x0040;
const M_SEEN_ACID = 0x0080;
/* AD_* → M_SEEN_* mapping — C ref: nethack-c/src/mondata.c:1522 */
function cvt_adtyp_to_mseenres(adtyp) {
    switch (adtyp) {
        case 1: return M_SEEN_MAGR; /* AD_MAGM */
        case AD_FIRE: return M_SEEN_FIRE;
        case 3: return M_SEEN_COLD; /* AD_COLD */
        case AD_SLEE: return M_SEEN_SLEEP;
        case 5: return M_SEEN_DISINT; /* AD_DISN — was 15, which is AD_DRLI */
        case 6: return M_SEEN_ELEC; /* AD_ELEC */
        case 7: return M_SEEN_POISON; /* AD_DRST — was 30, which is AD_DRDX */
        case 8: return M_SEEN_ACID; /* AD_ACID */
        default: return M_SEEN_NOTHING; /* 0 */
    }
}
/* m_seenres — C ref: nethack-c/include/monst.h:88 macro */
function m_seenres(mon, mask) {
    return (mon.seen_resistance & mask) !== 0;
}
/* ---------------------------------------------------------------------------
 * Stub helpers — side-effects not yet ported; no RNG inside these stubs.
 * ---------------------------------------------------------------------------
 */
/* C mhitu.c: canseemon(mon) — this file already imports the real body under
 * the alias `canseemon_mu` (display.js) and every arm since :1674 uses that
 * alias; only gazemu's older arms below still called this local stub, which
 * unconditionally returned false. Delegate rather than duplicate. */
function canseemon(mon) { return canseemon_mu(mon); }
/* C mhitu.c: couldsee(x,y) — this file already imports the real body under
 * the alias `couldsee_mu` (vision.js:1010; see the note at :166), used by
 * thrwmu. Only gazemu's older arms still called this local stub. Delegate
 * rather than duplicate. */
function couldsee(x, y) { return couldsee_mu(x, y); }
/* C vision.h:50-53 m_canseeu(m) — this file's real port lives in dochug.js
 * (imported below under the alias m_canseeu_dh); gazemu was the only caller
 * left on this local `return false` stub. Delegate rather than duplicate. */
function m_canseeu(mon) { return m_canseeu_dh(mon); }
function mon_reflects(mon, msg) { return mon_reflects_real(mon, msg); }
function ureflects(fmt, arg1) { return ureflects_mm(fmt, arg1); }
function poly_when_stoned(mdat) { return poly_when_stoned_mh(mdat); }
async function polymon(pm) { return await polymon_polyself(pm); }
/* C mondata.c:278 resists_blnd(mon) — this file already imports the real
 * body under the alias resists_blnd_real_mu (mhitm.js), used at :5450 for
 * the newer expels_gu arm. Only gazemu's older AD_BLND arm still called
 * this local `return false` stub. Delegate rather than duplicate. */
function resists_blnd(mon) { return resists_blnd_real_mu(mon); }
// C ref: allmain.c:755 stop_occupation() — interrupt the current occupation:
// pline "You stop <occtxt>." and clear go.occupation.  hitmu()/missmu()
// (mhitu.c:1263 / :100) call this at the point a monster's attack lands, so the
// stop message joins the topline INSIDE the combat message stream — after the
// interrupting hit, BEFORE the turn's trailing combat plines — exactly where C
// emits it.  Deferring it to the end of the turn (the old learn-driver behavior)
// pushed a trailing --More-- past the last combat pline and leaked the next
// command key (seed4200 key 717).
//
// EMIT-ONLY (does NOT clear go.occupation): the clear itself is left to the
// existing dochugw() post-move path (monmove.js:1477), which already clears the
// occupation at the SAME point C's movemon does and is RNG-aligned with the C
// trace.  Clearing here (mid-attack, one dochug earlier) shifted a later
// same-turn monster-scan in the JS movemon and regressed the RNG stream, so we
// only emit the message and let dochugw perform the state transition.  A
// per-study guard (g._studyStopMsg) prevents re-emission across the monster's
// multiple hits.  Scoped to the study occupation (occtxt "studying").
//
// The cmdq_clear(CQ_CANNED) TAIL (allmain.c:695) is NOT part of that narrowing
// and is now wired.  C's stop_occupation ends by throwing away the canned
// command queue, and this port's `m_throw` reaches THIS copy (mthrowu.c:786,
// the call right after the missile lands on the hero).  seed0108 is the
// measured case: `#rub` on a not-yet-wielded lamp takes apply.c:1806's
// wield-then-requeue arm — wield_tool() prints "You now wield a lamp.", then
// `cmdq_add_ec(CQ_CANNED, dorub)` + `cmdq_add_key(CQ_CANNED, invlet)` bank a
// SECOND dorub pass for the next moveloop_core iteration.  In C that second
// pass never runs: the goblin's thrown dagger hits during the same world turn,
// m_throw calls stop_occupation(), and the clear discards it.  Without the
// clear this port drained the queue, ran dorub again (drawing the magic-lamp
// rn2(3) and the puff-of-smoke rn2(2) that C never draws) and spent ANOTHER
// turn on it — so every monster on the level moved one turn further than C's
// before the next frame was painted.  That is seed0108's first screen miss at
// step 31 (the pet at (41,17)/(43,17) instead of (42,16), the goblin at (45,17)
// instead of (46,17)) AND its first RNG divergence.  RNG-neutral in itself.
//
// CORRECTED 2026-08-20 — the narrowing above ("EMIT-ONLY", occtxt 'studying')
// was written for the LEARN occupation and silently swallowed every OTHER one.
// A COUNTED `.` / `s` arms go.occupation = timed_occupation with occtxt
// "waiting" / "searching" (js/cmd.js CMD_F_TEXT), and for those this function
// did nothing at all: no message, no clear.  So a monster that lands a hit on a
// resting hero did not stop the rest -- js/ kept counting down while C
// abandoned the count on the FIRST landed blow.
//
// seed4500 step 1073 is the measured case.  C's tiger lands three attacks on a
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
// The 'studying' arm keeps its emit-only shape verbatim (its deferred clear is
// coordinated with stop_occupation_learn in js/allmain.js via g._studyStopMsg,
// and clearing here was measured to shift the same-turn monster scan).  Every
// other occupation gets C's whole function, which is what this file should have
// been calling all along.
async function stop_occupation() {
    const g = game;
    if (g.occupation && g.occtxt === 'studying') {
        if (!g._studyStopMsg) {
            pline(`You stop ${g.occtxt}.`);
            g._studyStopMsg = true;
        }
        /* C allmain.c:695 — cmdq_clear(CQ_CANNED), unconditional, outside both
         * arms of the go.occupation test. */
        cmdq_clear(CQ_CANNED);
        return;
    }
    /* C allmain.c:684 in full — pline "You stop <occtxt>.", clear
     * go.occupation, disp.botl, nomul(0); or, with no occupation, the bare
     * nomul(0) when gm.multi >= 0.  Then cmdq_clear(CQ_CANNED). */
    await real_stop_occupation();
}
/* C mon.c:3469 killed() — use the canonical async xkilled sequence. */
async function killed(mon) { return await killed_real(mon); }
function DEADMONSTER(mon) { return !!(mon && mon.mhp <= 0); }
/* make_confused's C home is potion.c:88; this used to be an EXPORTED empty body
 * and it was the copy js/potion.js and js/spell.js imported, so every store any
 * of the three made went nowhere.  Re-exported here so the old import path
 * keeps working and there is still exactly one implementation. */
export { make_confused };
/* make_stunned's C home is potion.c:4699 and js/potion.js carries the real
 * port; this was a file-local EMPTY BODY shadowing it, exactly like the
 * make_confused stub two lines above (js/read.js:661 and js/cmd.js:68 already
 * import the real one).  Every make_stunned() in this file therefore set no
 * HStun and printed no "You stagger...", which is 117 frames of
 * gen232-reseed-seed1268561 on its own: C pages the knockback line with a
 * --More-- because the stun message follows it in the same turn, and with the
 * message missing JS raised no --More-- and read eight recorded keystrokes as
 * commands. */
import { make_stunned } from './potion.js';
/* Keep the historical export path, but share zap.js's canonical stateful
 * implementation instead of dropping blindness entirely. */
export function make_blinded(dur, vis) {
    return make_blinded_real_mu(dur, vis);
}
async function fall_asleep(dur, vis) { return await fall_asleep_to(dur, vis); }
const u_slow_down = u_slow_down_uh;
/* mdamageu — C ref: nethack-c/src/mhitu.c:1896-1923.
 * Apply n points of damage to the hero. No RNG consumed (saving_grace and
 * showdamage are RNG-free for the common case). C calls done_in_by/rehumanize
 * when HP drops below 1; we set a death flag and clamp at 0 (the corpus heroes
 * survive, so the death branch is not exercised — left as a faithful no-op
 * beyond clamping). */
export async function mdamageu(mtmp, n) {
    const u = game.u || (game.u = {});
    if (n < 0) n = 0;
    if (Upolyd_fn(u)) {
        u.mh = (u.mh | 0) - n;
        if ((u.mhmax | 0) && u.mh > u.mhmax) u.mh = u.mhmax;
        /* C mhitu.c:1916-1917 — `if (u.mh < 1) rehumanize();`.  rehumanize()
         * REVERTS the hero to their own form; it reaches done(DIED) only when
         * the hero is Unchanging.  This called deadhero() instead, i.e. it
         * KILLED a hero C merely un-polymorphs, under a comment claiming
         * "rehumanize -> done(DIED) when the hero cannot revert" — true only of
         * the Unchanging arm.  MEASURED on seed4500-knight-coverage step 1763:
         * C prints "You return to human form!  You can see again.--More--" and
         * plays on at HP:60(83) as a Knight; this port printed "You die..." and
         * then "Die? [yn] (n)".  js/polyself.js:rehumanize() is the real body.
         * mdamageu is sync in C and in this port, and rehumanize() is async
         * (its plines are), so the promise is handed to the caller's chain via
         * game._pendingRehumanize rather than being dropped on the floor. */
        if ((u.mh | 0) < 1) return await rehumanize();
    }
    else {
        /* C: n = saving_grace(n) — returns n unchanged unless near-death */
        u.uhp = (u.uhp | 0) - n;
        if ((u.uhpmax | 0) && u.uhp > u.uhpmax) u.uhp = u.uhpmax;
        /* C mhitu.c:1925 — if (u.uhp < 1) done_in_by(mtmp, DIED).  This used
         * to call deadhero() directly, which flags the death but records no
         * KILLER, so the tombstone read "killed by an []". */
        if ((u.uhp | 0) < 1) done_in_by(mtmp, 0 /* DIED */);
    }
}
/* C end.c:1023 done() — direct death transitions from this module (currently
 * the Medusa gaze stoning arm) enter the same deferred death machinery as
 * done_in_by()/losehp.  The caller has already emitted the cause-specific
 * line ("You turn to stone..."), so suppress end.c's generic "You die..."
 * line; do_death_sequence() still performs the wizard/lifesaving/game-over
 * handling at the command boundary.  The old empty body silently left a
 * stoned hero alive and discarded the killer state. */
function done(how) { return deadhero(how, { noDeathLine: true }); }
function monstseesu(flag) { return monstseesu_mc(flag); }
function monstunseesu(flag) { return monstunseesu_mc(flag); }
function ugolemeffects(typ, dmg) { return ugolemeffects_mh(typ, dmg); }
async function burn_away_slime() {
    const p = game.u?.uprops?.[SLIMED];
    if ((p?.intrinsic | 0) || (p?.extrinsic | 0))
        await make_slimed(0, 'The slime that covers you is burned away!');
}
async function burnarmor(mon) { return await burnarmor_real(mon); }
/* C zap.c:5964-6097 destroy_items(mon, dmgtyp, dmg_in) — the top-level
 * dispatcher.  This was a `return false` stub that drew nothing and shadowed
 * the two REAL bodies this port already carries: js/zap.js's exported
 * `destroy_items` (the `u_carry = (mon == &gy.youmonst)` TRUE arm, ported in
 * full against the live gi.invent chain) and js/zap.js's exported
 * `destroy_items_mon` (the FALSE arm, ported in full against mon->minvent —
 * see that function's own SUPERVISOR OVERRIDE comment). C picks the arm with
 * one pointer comparison (`u_carry = (mon == &gy.youmonst)`); this port picks
 * it with `is_youmonst(mon)`, the m_id-based equivalent every other hero
 * identity test in this file already uses (m_id 1 is reserved for
 * gy.youmonst, polyself.c:44 / js/polyself.js:212), NEVER a raw m_id === 0/1
 * literal, which the fleet-feedback ledger already flags as a proven defect
 * once the hero has polymorphed.
 *
 * async: js/zap.js's hero-carry `destroy_items` is `async` (it awaits
 * maybe_destroy_item/maybe_destroy_item_elec per destroyed stack); the
 * monster-carry `destroy_items_mon` is synchronous and returns a plain int.
 * Declaring this dispatcher `async` lets both arms resolve through one
 * `await`-able return without perturbing the RNG order: everything up to the
 * first genuine `await` inside the callee still runs synchronously, exactly
 * as it does at every other `await destroy_items_zap(...)` call site already
 * in this file (e.g. mhitm_ad_elec_u below). */
export async function destroy_items(mon, dmgtyp, dmg_in) {
    if (is_youmonst_mu(mon)) {
        return await destroy_items_zap(true, dmgtyp, dmg_in);
    }
    return await destroy_items_mon_zap(mon, dmgtyp, dmg_in);
}
/* C apply.c:1577 / trap.c:7139 — ignite_items(objchn).  Fire affects
 * exposed inventory or a floor pile; walk the corresponding link field and
 * let catch_lit() own all fuel, curse, location, light-source, and message
 * rules.  This used to be an empty stub, so fire attacks never lit lamps,
 * candles, candelabra, or oil. */
export async function ignite_items(objchn) {
    if (!objchn) return;
    const floorChain = (objchn.where | 0) === 1; /* OBJ_FLOOR */
    for (let obj = objchn; obj; ) {
        const next = floorChain ? obj.nexthere : obj.nobj;
        await catch_lit_mu(obj);
        obj = next;
    }
}
function urgent_pline(_msg) { return urgent_pline_disp(_msg); }
function pline_mon(_mon, ...args) { pline(...args); }
function pline_The(_msg) { pline("The " + _msg); }
function Your1(_msg) { pline("Your " + _msg); }
/* These two were literal "Monster" / "monster" stubs.  They are not shims for
 * an unported helper: this file already carries the real bodies -- je_Monnam()
 * below (which capitalises uhitm.js's mon_nam) and uhitm.js's mon_nam itself,
 * imported at the top as uhitm_mon_nam -- and every OTHER call site in this
 * file uses those.  Only the arms that reached these two printed the literal
 * word, and it reaches the screen: seed4500-knight-coverage step 1576, C's
 * topline "It bites!  It is suddenly very cold!  It touches you!" against this
 * port's "... Monster touches you!".  ("It" is what mon_nam gives for a
 * monster a BLIND hero cannot see, which is the whole point of routing through
 * the real body rather than a placeholder.)  RNG-free. */
function Monnam(mon) { return je_Monnam(mon); }
function mon_nam(mon) { return uhitm_mon_nam(mon) || 'it'; }
/* C you.h:324 mhis(mtmp) — use the canonical pronoun implementation below,
 * including hallucination's rn2(4) choice and gender/visibility rules. */
function mhis(mon) { return mhis_mon(mon); }
/* C ref: hacklib.c:343-359 s_suffix — imported from js/hacklib.js.  The note
 * that used to sit here said the copy was "kept local rather than imported
 * because js/mhitm.js already imports from this file"; that was a reason to
 * avoid importing from js/mhitm.js, not a reason to re-derive the body.
 * js/hacklib.js imports only js/gstate.js, so there is no cycle to avoid. */
function pmname(mdat, mgender) {
    /* C pmname() receives a permonst pointer; reconstructed forms carry its
       table index as pmidx.  Keep the null arm used for the hero's blind-self
       message on its original generic wording. */
    if (!mdat || !Number.isInteger(mdat.pmidx)) return "monster";
    return monPmname(mdat.pmidx | 0, mgender | 0);
}
function Mgender(mon) { return mon?.female ? 1 : 0; }
/* Macro equivalents from C youprop.h.  EVERY ONE of these used to read a
 * `game.flags.<name>` key, and `grep -c 'flags\.<name>\s*='` over js/ is ZERO for
 * all seven of them — the same shape the HConfusion note below already recorded
 * for `gs.flags.confusion`, left standing for its nine neighbours.  They are
 * re-pointed at u.uprops[<numeric>], the only spelling anything in js/ writes
 * (see _uprop_on_mu below, and js/potion.js's make_* writers).
 *   HFire_resistance/HStone_resistance/HSleep_resistance/HReflecting have no
 * numeric prop written anywhere in js/ either, so those four keep an honest
 * `false` rather than a fabricated read — but they no longer *look* like live
 * state reads.  All four sites are NEVER-RUN on the scored corpus today
 * (tools/line-reached.mjs). */
function Hallucination(gs) {
    /* C youprop.h:307 Hallucination ((HHallucination || EHallucination)
       && !Halluc_resistance); js/ has no HALLUC_RES writer either, but the
       spelling mirrors js/mhitm.js:1584. */
    const p = gs.u?.uprops?.[HALLUC_MU];
    const r = gs.u?.uprops?.[HALLUC_RES_MU];
    const res = ((r?.intrinsic | 0) || (r?.extrinsic | 0));
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !res;
}
/* C youprop.h:399 Unaware (gm.multi < 0 && (unconscious() || is_fainted())).
   js/ carries no g.multi/nomul state on this path, so this stays an honest
   false; both call sites are NEVER-RUN on the scored corpus. */
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
/* C uhitm.c:3924 do_stone_u — shared cockatrice petrification transition. */
async function do_stone_u(magr) {
    const u = game.u || {};
    const props = u.uprops || {};
    const stoned = props[18] || props.STONED;
    const stoneRes = props[8] || props.STONE_RES;
    if ((stoned?.intrinsic | 0) || (stoneRes?.intrinsic | 0) || (stoneRes?.extrinsic | 0))
        return false;
    const data = magr?.data || {};
    const unique = !!((data.geno | 0) & 0x1000);
    const name = mon_nam_uh(magr);
    /* C uhitm.c:3924-3937: this state transition must complete before the
     * attack returns.  make_stoned updates the delayed killer and bottom line
     * asynchronously in the JS port, so await it rather than dropping its
     * promise and letting knockback run first. */
    await make_stoned(5, null, unique ? KILLED_BY_MU : KILLED_BY_AN_MU,
                      unique ? `the ${name}` : name);
    return true;
}
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
    const svk = gs.svk || { killer: { format: 0, name: "" } };
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
                    ureflects("%s gaze is reflected by your %s.", s_suffix(Monnam(mtmp)));
                if (mon_reflects(mtmp, !useeit ? null
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
                done(18 /* STONING */);
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
            if (canseemon(mtmp) && !resists_blnd(gy.youmonst || {})
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
                        await burnarmor(gy.youmonst || {});
                    if (lev > rn2(20)) {
                        destroy_items(gy.youmonst || {}, AD_FIRE, orig_dmg);
                        await ignite_items(gs.invent || null);
                    }
                    if (dmg)
                        await mdamageu(mtmp, dmg);
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

/* ===========================================================================
 * mattacku() — monster attacks the hero.  C ref: nethack-c/src/mhitu.c
 *   mattacku        mhitu.c:489
 *   calc_mattacku_vars mhitu.c:446
 *   getmattk        mhitu.c:308
 *   hitmu           mhitu.c:1140
 *   missmu          mhitu.c:85
 *   magic_negation  mhitu.c:1086
 *   mhitm_ad_phys   uhitm.c:3982 (mhitu defender path)
 *   mhitm_ad_elec   uhitm.c:2685 (mhitu defender path)
 *   mhitm_mgc_atk_negated uhitm.c:74
 *   mhitm_knockback uhitm.c:5248
 *
 * Scope (this increment): the single-physical / single-electric hand-to-hand
 * attack path used by the corpus monsters (jackal AT_BITE/AD_PHYS,
 * grid bug AT_BITE/AD_ELEC).  RNG order matched bit-exactly against the C
 * traces for seed0003 (jackal) and seed0300 (grid bug):
 *   to-hit  rnd(20+i)               @ mhitu.c:805
 *   damage  d(damn,damd)            @ mhitu.c:1185
 *   [AD_ELEC] rn2(10)               @ mhitm_mgc_atk_negated uhitm.c:87
 *   [AD_ELEC not-negated] rn2(20)   @ mhitm_ad_elec uhitm.c:2719
 *   knockback rn2(3), rn2(chance)   @ mhitm_knockback uhitm.c:5259,5270
 * Non-AD_PHYS/AD_ELEC adtypes and weapon/grab/ranged paths are deferred
 * (see DEFERRED note at end of file); for those the attack is skipped so no
 * spurious RNG is fired (preserves current behaviour, no regression).
 * PARKED-NOTE: session=seed0003,seed0300 leaf=rn2(10)@mhitm_mgc_atk_negated,rn2(20)@mhitm_ad_elec
 * ===========================================================================
 */

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

/* Per-monster attack table (mattk[]) indexed by mndx, aligned to the runtime
 * PM ordering (matches js/uhitm.js MONS_NAMES / js/pm.generated.js).  Each
 * entry is an array of [aatyp, adtyp, damn, damd] tuples (trailing NO_ATTK
 * trimmed); a 0 entry means "no real monster at this index".  Generated from
 * nethack-c/include/monsters.h MON(...A(ATTK(...))) macros by normalized-name
 * alignment to MONS_NAMES (all 383 names matched, 0 missing).
 * C ref: nethack-c/include/monsters.h.
 *
 * FIXED 2026-09-05: mndx 290 (PM_INCUBUS -- "incubus"/"succubus"/"amorous
 * demon") read a bare `0` (no attacks at all) instead of its three real
 * attacks.  monsters.h's MON() entry for this monster passes the attack list
 * as a bare macro name, `SEDUCTION_ATTACKS_YES`, rather than an inline
 * `A(ATTK(...))` call -- it is the ONLY monster in the whole table that does
 * this -- and the generator's textual `MON(...A(ATTK(...)))` pattern match
 * cannot see through a macro indirection, so it silently emitted an empty row
 * while still counting the monster in its "383 names matched, 0 missing"
 * self-check (that check verifies NAME alignment, not that every row is
 * non-empty). Root-caused via `getmattk` -> `mon_mattk(mndx, i)` returning
 * null for i=0..5 on a live capture (mattacku board record #269, an incubus
 * mattacku call): C draws three real hand-to-hand rolls
 * (`rnd(20)`/`rnd(21)`/`rnd(22)` @ mhitu.c:806) while this port's
 * `if (!mattk) continue;` skipped the entire per-attack loop and drew
 * nothing, for EVERY caller of MON_MATTK[290] (mattacku, mhitm's mon-vs-mon
 * path, passivemm, noattacks_mndx), not mattacku alone.
 * C (monsters.h:2922-2924, monattk.h numeric codes AT_BITE=2, AT_CLAW=1,
 * AD_PHYS=0, AD_SSEX=35):
 *     #define SEDUCTION_ATTACKS_YES \
 *         A(ATTK(AT_BITE, AD_SSEX, 0, 0), ATTK(AT_CLAW, AD_PHYS, 1, 3), \
 *           ATTK(AT_CLAW, AD_PHYS, 1, 3), NO_ATTK, NO_ATTK, NO_ATTK)
 * -> mndx 290's row is now [[2,35,0,0],[1,0,1,3],[1,0,1,3]], matching every
 * other row's [aatyp,adtyp,damn,damd] tuple convention exactly.
 *
 * FIXED 2026-09-05 (five more rows, found by a full mechanical 383-row check
 * against nethack-c-v5/upstream/include/monsters.h, not just the four this
 * was commissioned to check): mndx 261/262/263 (PM_HUMAN_WERERAT/
 * WEREJACKAL/WEREWOLF -- the human-form lycanthrope monsters, S_HUMAN
 * entries at monsters.h:2609/2618/2627) and mndx 337 (PM_CLERIC, the
 * role-class monster at monsters.h:3396) each read a bare `0` (no attacks)
 * instead of their real single ATTK(AT_WEAP, AD_PHYS, ...) row -- these are
 * plain inline `A(ATTK(...))` calls with no macro indirection, so this is a
 * SEPARATE mechanism from the mndx-290 macro-blindness bug above; the exact
 * generator defect that dropped these four specific rows was not
 * re-diagnosed, only the output verified against C.
 *   261/262/263 -> [[254,0,2,4]]           (ATTK(AT_WEAP, AD_PHYS, 2, 4))
 *   337         -> [[254,0,1,6],[255,240,0,0]]
 *                  (ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_CLRC, 0, 0))
 *
 * A fifth row was WRONG rather than missing, and was not on the original
 * list: mndx 343 (PM_CLERIC's sibling role-class monster PM_WIZARD,
 * monsters.h:3452) held [[254,0,1,6]] -- present and non-null, so it would
 * NOT have been caught by a bare-zero scan -- missing its second attack
 * ATTK(AT_MAGC, AD_SPEL, 0, 0) (AD_SPEL=241). Fixed to
 * [[254,0,1,6],[255,241,0,0]].
 *
 * ROOT CAUSE OF 337/343 specifically, and it is a DIFFERENT bug from the
 * other three: js/makemon_mattk.json itself (scripts/gen-mons-mattk.mjs) is
 * generated from `nethack-c/include/monsters.h` -- the retired NetHack 3.7
 * tree -- not `nethack-c-v5/upstream/include/monsters.h`, the current
 * scoring target (the same "generated dat tables still from 3.7" class as
 * js/engrave_data.js). In 3.7, PM_CLERIC and PM_WIZARD each had ONLY the
 * ATTK(AT_WEAP, AD_PHYS, ...) melee attack; 5.0 added a second
 * ATTK(AT_MAGC, AD_CLRC/AD_SPEL, 0, 0) "random spell" attack to both. The
 * JSON (and, for mndx 343, this table) still reflect the 3.7 shape.
 * Mechanically confirmed via scripts/gen-mons-mattk.mjs re-pointed at the v5
 * tree: re-running the SAME alignment logic against v5 sources reproduces
 * 383 rows (alignment holds) and disagrees with the committed
 * js/makemon_mattk.json at EXACTLY these two indices (337, 343) -- no other
 * row differs. js/makemon_mattk.json has NOT been fixed (it is a shared
 * table read directly by js/makemon.js, js/uhitm.js, js/zap.js and
 * js/attrib.js, all outside this file's ownership); this table's local copy
 * is fixed for both, but the shared JSON's own 337/343 rows remain
 * 3.7-stale for its other three consumers.
 *
 * Full-table re-verification after this fix: all 383 rows now match a v5
 * source re-derivation of the same generator exactly (0 mismatches, was 5).
 */
const MON_MATTK = /** @type {(number[][]|0)[]} */ ([[[2,0,1,4]],[[6,7,1,3]],[[2,0,2,4],[6,7,3,4]],[[2,0,2,4],[2,2,2,4]],[[2,0,3,6]],[[6,7,1,8]],[[0,8,1,8]],[[5,0,1,8]],[[5,14,2,4],[0,14,1,4]],[[2,0,1,2],[5,18,0,0],[0,18,0,0]],[[2,0,1,3],[5,18,0,0],[0,18,0,0]],[[15,2,2,6],[2,0,1,6]],[[2,0,1,2]],[[2,0,1,3]],[[2,0,1,4]],[[2,29,1,4]],[[2,0,1,6]],[[2,0,1,6]],[[2,0,1,6]],[[2,0,2,4]],[[2,0,2,4]],[[2,29,2,6]],[[2,0,1,8],[12,3,1,6]],[[2,0,2,6]],[[2,0,2,6],[12,3,2,6]],[[2,0,2,6],[12,2,2,6]],[[2,0,3,6],[12,2,3,6]],[[14,0,4,6]],[[0,14,0,70]],[[13,3,4,6]],[[13,2,4,6]],[[13,6,4,6]],[[2,0,1,6]],[[2,0,1,6]],[[1,0,1,4],[1,0,1,4],[2,0,1,8]],[[1,0,1,4],[1,0,1,4],[2,0,1,10]],[[1,0,1,6],[1,0,1,6],[2,0,1,10]],[[2,0,2,4]],[[1,0,2,4],[1,0,2,4],[2,0,1,10]],[[1,0,4,4],[1,0,4,4],[2,0,2,10]],[[1,0,1,6],[1,0,1,6],[2,0,1,4],[1,253,0,0]],[[1,0,2,6],[1,0,2,6],[2,0,2,4]],[[1,0,3,6],[1,0,3,6],[2,0,3,4]],[[254,0,1,6]],[[254,0,1,8]],[[254,0,2,4]],[[254,0,2,4],[254,0,2,4]],[[254,0,2,6],[254,0,2,6]],[[254,0,1,4],[16,32,2,1],[16,32,2,1],[16,32,2,1]],[[254,0,1,8],[16,32,2,1],[16,32,2,1],[16,32,2,1],[16,32,2,1],[16,32,2,1]],[[1,0,1,3],[1,0,1,3],[2,0,1,4]],[[2,4,1,3]],[[1,0,1,4]],[[1,0,1,3]],[[1,30,1,2],[1,30,1,2],[2,0,1,4]],[[2,0,1,7]],[[0,3,0,6]],[[0,8,0,6]],[[11,8,3,6],[0,8,3,6]],[[254,0,1,4]],[[254,0,1,6]],[[254,0,2,4]],[[255,241,0,0]],[[1,20,1,2]],[[1,0,3,4]],[[1,19,3,4]],[[1,19,3,6],[1,19,3,6]],[[1,21,0,0],[1,22,0,0]],[[1,21,0,0],[1,22,0,0]],[[1,21,0,0],[1,22,0,0]],[[254,0,1,4]],[[254,0,1,6]],[[254,0,1,8]],[[254,0,1,6]],[[254,0,1,6]],[[254,0,1,8]],[[255,241,0,0]],[[254,0,2,4],[254,0,2,4]],[[2,0,2,6]],[[2,0,3,6]],[[2,0,4,6]],[[1,0,1,3],[2,0,1,3],[2,0,1,8]],[[4,0,4,12],[2,0,2,6]],[[1,0,2,6],[2,0,2,6],[1,0,2,6]],[[2,0,3,6]],[[1,0,2,8]],[[1,0,5,4],[1,0,5,4]],[[4,0,4,8],[4,0,4,8]],[[2,0,1,3]],[[2,0,1,3]],[[2,31,2,4]],[[2,29,1,4]],[[2,0,1,6]],[[2,0,1,6]],[[2,0,1,2]],[[2,7,1,3]],[[2,7,2,4]],[[1,0,1,2],[1,0,1,2],[6,7,1,4]],[[11,28,1,6],[11,0,2,6]],[[11,28,1,8],[11,0,2,8]],[[3,0,1,6],[2,0,1,2]],[[4,0,1,12],[3,0,1,6]],[[4,0,1,12],[3,0,1,6]],[[4,0,1,12],[3,0,1,6]],[[3,0,1,8],[2,0,1,3]],[[3,0,1,10],[2,0,1,4]],[[11,0,1,6]],[[11,11,2,8]],[[11,3,1,6]],[[11,6,1,6],[11,16,2,6],[0,6,0,4]],[[11,2,1,8]],[[11,2,1,10],[0,2,0,4]],[[2,0,1,4]],[[2,0,1,6]],[[2,0,2,4]],[[2,0,2,8],[11,26,1,10]],[[2,6,1,1]],[[6,17,1,4]],[[13,11,10,20]],[[13,36,10,12]],[[1,0,3,4],[1,0,3,4],[2,0,3,6]],[[2,7,2,4],[2,0,1,3],[7,28,2,4]],[[254,0,1,6],[254,0,1,6],[3,0,1,4]],[[254,0,1,6],[254,0,1,6],[1,0,1,4],[255,1,2,6]],[[3,0,2,4],[3,0,2,4],[4,0,3,6],[255,241,2,6]],[[254,0,2,4],[254,0,2,4],[15,11,2,6],[1,0,1,8],[255,241,4,6]],[[2,0,1,4]],[[2,0,1,6]],[[2,0,1,6],[1,11,1,6]],[[2,0,1,6],[2,7,0,0]],[[254,0,1,6],[3,0,1,6]],[[254,0,1,8],[3,0,1,6]],[[254,0,1,10],[3,0,1,6],[3,0,1,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[2,0,2,6]],[[12,1,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,2,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,3,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,2,6,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,3,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,4,4,25],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,5,1,255],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,6,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,7,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[12,8,4,6],[2,0,3,8],[1,0,1,4],[1,0,1,4]],[[1,0,4,4]],[[11,0,1,10]],[[1,2,3,6],[0,2,0,4]],[[1,0,4,6]],[[1,0,5,6]],[[5,19,0,0]],[[0,3,0,6]],[[0,12,0,4]],[[0,8,0,4]],[[0,2,0,4]],0,[[5,0,1,4],[5,19,0,0]],[[254,0,1,6]],[[254,0,1,8]],[[255,241,0,0]],[[254,0,2,6]],[[254,0,2,10]],[[254,0,2,10]],[[254,0,2,8]],[[254,0,2,10]],[[254,0,2,12]],[[254,0,2,8],[254,0,3,6]],[[254,0,2,12]],[[254,0,2,8],[255,241,0,0]],[[1,0,3,10],[1,0,3,10],[4,0,2,8]],[[2,0,2,10],[2,0,2,10],[1,0,2,10],[1,0,2,10]],[[254,0,1,4]],[[254,0,1,6]],[[254,0,1,8]],[[254,0,2,6]],[[5,3,1,10],[255,241,0,0]],[[5,3,3,4],[255,241,0,0]],[[5,3,3,6],[255,241,0,0]],[[5,3,5,6],[255,241,0,0]],[[1,0,1,4]],[[1,0,1,6]],[[1,0,1,6]],[[1,0,1,6]],[[1,0,2,4]],[[1,0,2,4],[1,0,2,4]],[[1,0,2,6],[1,0,2,6]],[[1,0,3,4],[1,0,3,4]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,2,4],[12,2,2,6]],[[2,0,2,6],[10,8,0,0]],[[2,0,2,6],[255,241,4,6]],[[10,7,1,6],[2,14,1,6],[5,0,0,0],[7,28,2,4]],[[254,0,2,5]],[[254,0,2,6]],[[254,0,3,5]],[[2,24,2,8]],[[2,34,0,0]],[[5,40,1,4],[0,40,0,0]],[[2,42,3,8],[0,42,0,0]],[[1,23,1,4]],[[1,43,1,4]],[[5,24,0,0],[5,24,0,0],[0,24,0,0]],[[1,41,4,4],[0,41,0,0]],[[2,0,1,2]],[[2,7,1,6]],[[2,7,1,6]],[[2,0,1,4],[5,0,0,0],[7,28,1,4],[7,0,2,4]],[[2,7,1,4],[2,7,1,4]],[[2,7,2,4],[10,11,0,0]],[[254,0,4,2],[1,0,4,2],[2,0,2,6]],[[254,0,2,6],[1,3,2,6],[2,0,2,6]],[[254,0,3,6],[1,0,2,8],[2,0,2,6]],[[254,0,2,8],[1,0,2,8],[2,0,2,6]],[[254,0,3,6],[1,0,2,8],[2,0,2,6]],[[1,0,3,4],[1,0,3,4],[2,0,2,5],[15,25,0,0]],[[1,0,1,6],[2,15,1,6]],[[1,0,1,8],[2,15,1,8]],[[254,0,2,10],[2,15,1,12]],[[254,15,0,0],[255,241,0,0],[1,0,1,4],[5,3,1,4]],[[5,15,1,6]],[[254,15,1,4],[12,4,2,25]],[[1,0,1,3],[1,0,1,3],[1,0,1,3],[2,0,4,6]],[[1,21,0,0],[2,0,1,3]],[[1,0,1,3],[1,0,1,3],[2,0,1,6]],[[1,0,1,6],[1,0,1,6],[7,0,2,8]],[[1,0,1,6],[1,0,1,6],[2,0,1,4]],[[1,0,1,4],[1,0,1,4],[7,0,1,8]],[[1,0,1,6],[1,0,1,6],[3,0,1,8]],[[1,0,1,4]],[[1,0,1,5]],[[1,0,1,6]],[[1,0,1,6]],[[1,0,1,7]],[[1,0,1,8]],[[1,0,1,10],[1,0,1,10]],[[1,14,1,2],[1,0,1,3]],[[1,0,2,8],[1,0,2,8]],[[254,0,2,6],[5,13,1,6]],[[1,0,1,2],[1,0,1,2]],[[1,0,1,3]],[[1,0,1,4],[1,0,1,4],[7,0,6,1]],[[1,0,2,3],[1,0,2,3]],[[1,0,1,6],[1,0,1,6]],[[1,0,3,4]],[[1,0,2,8],[1,0,2,8]],[[1,0,3,10]],[[1,0,3,8]],[[1,0,2,8],[1,0,2,8]],[[254,0,4,10],[12,7,4,6]],[[254,0,1,6]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,1,8]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,2,4]],[[254,0,2,4],[254,0,2,4]],[[254,0,2,4],[254,0,2,4]],[[254,0,1,12]],[[254,0,4,4],[254,0,4,4]],[[254,0,4,10]],[[254,0,1,6]],[[0,1,0,4]],[[254,0,4,10],[3,0,1,4],[255,240,0,0]],[[254,0,4,10],[3,0,2,8],[255,240,2,8],[255,240,2,8]],[[254,0,1,8]],[[254,0,2,6]],[[1,27,2,6]],[[254,0,3,4],[254,0,3,4]],[[254,0,4,4],[254,0,4,4]],[[254,0,1,8]],[[254,0,3,4],[254,0,3,4]],[[254,0,2,4],[1,0,1,8],[15,18,0,0],[2,7,1,6]],[[1,252,2,12],[255,241,0,0]],[[254,0,4,10]],[[5,0,1,1]],[[5,14,2,6],[5,13,1,6]],[[254,0,1,3],[1,0,1,3],[2,0,1,3]],[[2,35,0,0],[1,0,1,3],[1,0,1,3]],[[254,0,1,4],[1,0,1,4],[2,0,2,3],[6,0,1,3]],[[254,7,2,4]],[[1,0,2,4],[1,19,2,4],[6,0,3,4]],[[254,0,2,4],[254,0,2,4],[1,0,2,4],[1,0,2,4],[1,0,2,4],[1,0,2,4]],[[1,0,1,4],[1,0,1,4],[1,0,1,8],[1,0,1,8],[2,0,1,6]],[[1,0,1,3],[1,0,1,3],[2,0,4,4]],[[254,0,3,4],[6,7,2,4]],[[1,0,1,4],[1,0,1,4],[2,0,2,4],[6,3,3,4],[5,13,1,1]],[[1,0,1,4],[1,0,1,4],[2,0,2,4],[255,241,0,0]],[[254,0,4,2],[254,0,4,2],[7,0,2,4]],[[254,0,2,6],[254,0,2,6]],[[254,0,8,4],[254,0,4,6]],[[11,33,4,10],[10,8,3,6]],[[254,0,3,6],[254,25,2,8],[1,14,1,6],[255,1,2,6]],[[254,0,3,6],[1,0,3,4],[1,0,3,4],[255,241,8,6],[6,7,2,4]],[[1,0,3,6],[1,0,3,6],[6,7,2,4]],[[254,0,4,6],[255,241,6,6]],[[2,7,2,6],[15,12,2,6]],[[1,0,4,4],[255,3,6,6]],[[255,241,8,6],[6,15,1,4],[1,33,1,6],[1,33,1,6]],[[5,37,8,8],[5,37,8,8]],[[5,38,8,8],[5,38,8,8]],[[5,39,8,8],[5,39,8,8]],0,[[254,0,2,8]],[[6,7,3,3]],[[2,0,2,6],[2,0,2,6]],[[2,0,5,6]],[[2,0,3,6],[5,28,0,0]],[[2,6,4,6],[5,28,0,0]],[[1,0,2,4],[1,0,2,4],[7,28,2,6],[2,0,5,4]],[[2,0,1,2]],[[2,0,1,3]],[[2,0,1,4]],[[2,0,1,4]],[[2,0,1,6]],[[2,0,4,2]],[[2,0,4,2],[1,0,1,12]],[[254,0,2,8],[5,2,1,6],[7,0,2,6],[7,2,3,6]],0,[[254,0,1,6],[254,0,1,6]],[[254,0,1,6],[254,0,1,6]],[[254,0,2,4]],[[254,0,1,6]],[[254,0,1,6],[254,0,1,6]],[[1,0,1,8],[3,0,1,8]],[[254,0,1,6],[255,240,0,0]],[[254,0,1,4]],[[254,0,1,6],[254,0,1,6]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[254,0,1,6]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[255,241,0,0]],[[254,0,4,10],[255,241,4,8]],[[254,0,4,10],[254,0,4,10]],[[254,0,4,10],[255,240,2,8]],[[254,0,1,6],[255,240,3,8],[255,240,3,8]],[[254,0,4,10],[254,0,4,10]],[[1,0,4,10],[3,0,2,8],[255,240,2,8],[255,240,2,8]],[[254,0,4,10],[3,0,2,8],[255,240,2,8],[255,240,2,8]],[[254,0,4,10],[255,241,4,8]],[[254,0,4,10],[254,0,2,6],[1,252,2,4]],[[254,0,4,10],[254,0,4,10]],[[254,0,4,10]],[[254,0,4,10],[254,0,4,10]],[[254,0,4,10],[255,241,2,8],[255,241,2,8]],[[254,0,8,4],[254,0,4,6],[255,241,0,0],[1,252,2,6]],[[254,0,1,6],[255,241,0,0],[255,241,0,0],[1,252,1,4]],[[12,242,6,6],[255,241,0,0],[1,252,2,8],[2,0,4,8],[2,0,4,8],[6,0,1,6]],[[254,0,4,8],[254,0,4,8],[1,252,2,6]],[[12,2,8,6],[2,0,4,8],[255,241,0,0],[1,0,2,4],[1,252,2,4]],[[1,0,16,2],[1,0,16,2],[255,240,0,0],[1,252,1,4]],[[254,0,8,4],[254,0,4,6],[255,241,0,0],[1,252,2,6]],[[1,0,2,6],[1,252,2,6],[6,33,1,4]],[[254,7,2,6],[254,0,2,8],[1,252,2,6]],[[254,0,2,6],[254,0,2,6],[1,252,2,6]],[[254,0,2,10],[254,0,2,10],[1,252,2,6]],[[254,0,1,6],[254,0,1,6],[1,252,1,4],[255,241,0,0]],[[254,0,1,6]],[[254,0,1,6]],[[254,0,2,4]],[[254,0,1,6]],[[254,0,1,6],[254,0,1,6]],[[1,0,8,2],[3,12,3,2],[255,240,0,0]],[[254,0,1,6],[255,240,0,0]],[[254,0,1,4]],[[254,0,1,6],[254,0,1,6]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[255,241,0,0]],[[254,0,1,8],[254,0,1,8]],[[254,0,1,6],[255,241,0,0]]]);

/* Fetch a monster's mattk[i] tuple as {aatyp,adtyp,damn,damd}, or null if the
 * monster index or attack slot is empty (NO_ATTK). */
function mon_mattk(mndx, i) {
    const row = (mndx >= 0 && mndx < MON_MATTK.length) ? MON_MATTK[mndx] : 0;
    if (!row) return null;
    const a = (i < row.length) ? row[i] : null;
    if (!a || (a[0] === AT_NONE_ && a[1] === 0 && a[2] === 0 && a[3] === 0))
        return null;
    return { aatyp: a[0] | 0, adtyp: a[1] | 0, damn: a[2] | 0, damd: a[3] | 0 };
}

/* C ref: mondata.c:61 noattacks — TRUE iff every attack is AT_NONE/AT_BOOM. */
export function noattacks_mndx(mndx) {
    const row = (mndx >= 0 && mndx < MON_MATTK.length) ? MON_MATTK[mndx] : 0;
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
function Deaf(gs) { return !!(gs.flags && gs.flags.deaf); }

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
        await pline('%s %s you %s.', Monst_name, !Blind(gs) ? 'smiles at' : !Deaf(gs) ? 'talks to' : 'touches', (compat === 2) ? 'engagingly' : 'seductively');
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
        const prev = gh.hitmsg_prev;
        again = (mtmp.m_id === gh.hitmsg_mid
            && prev != null
            && mattk._ai != null && prev._ai != null
            && (mattk._ai | 0) === (prev._ai | 0) + 1
            && mattk.aatyp === prev.aatyp) ? ' again' : '';
        await pline('%s %s%s%s', Monst_name, verb, again, punct);
    }
    /* C win/tty/topl.c update_topl() calls blocking more() at this exact
     * putmesg boundary when the new hit message overflows the topline.  The
     * JS display model accumulates messages until a flush boundary, so drain
     * that already-detected page before combat continues to its next effect or
     * allmain reaches unmul() and prints a delayed-action completion message. */
    if (_topline_more_pending())
        await flush_pending_messages();
    gh.hitmsg_mid = mtmp.m_id;
    gh.hitmsg_prev = mattk;
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
        && (mattk._ai | 0) === (g._hitmsg_prev_ai | 0) + 1
        && mattk.aatyp === g._hitmsg_prev_aatyp) ? ' again' : '';
    const Monst_name = je_Monnam(mtmp);
    pline(`${Monst_name} ${verb}${again}!`);
    /* C ref: mhitu.c:80-81 — remember this monster + attack for the next hitmsg. */
    g._hitmsg_mid = mtmp ? mtmp.m_id : 0;
    g._hitmsg_prev_ai = (mattk._ai != null ? (mattk._ai | 0) : null);
    g._hitmsg_prev_aatyp = mattk.aatyp;
}

/* C ref: mon.c Monnam() — capitalized "the <species>". */
function je_Monnam(mtmp) {
    const s = uhitm_mon_nam(mtmp);
    if (!s) return 'It';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* C ref: mhitu.c:1086 magic_negation — hero defender (is_you) path only.
 * Returns mc in [0..3].  Reads worn-armor a_can and extrinsic Protection. */
function magic_negation_u() {
    const u = game.u || {};
    let mc = 0;
    const slots = [u.uarm, u.uarmc, u.uarmh, u.uarms, u.uarmg, u.uarmf, u.uarmu];
    for (const o of slots) {
        if (!o) continue;
        const armpro = obj_a_can(o);
        if (armpro > mc) mc = armpro;
    }
    /* C: extrinsic Protection (EProtection) increments mc; via amulet of
     * guarding +2.  EProtection / amulet of guarding not tracked in JS state
     * yet — gotprot path is a no-op here (no corpus hero has it).  Intrinsic
     * Protection (HProtection && ublessed>0 || uspellprot) likewise not
     * tracked. */
    return mc;
}

/* C ref: uhitm.c:74 mhitm_mgc_atk_negated — hero defender path.
 * Fires rn2(10).  Returns TRUE if the attack is magically negated. */
function mhitm_mgc_atk_negated_u(verbosely) {
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
function mhitm_ad_phys_u(mtmp, mattk, mhm) {
    if (mattk.aatyp === AT_HUGS_) {
        /* C uhitm.c:4018-4032 (mhitu arm):
         *   if (mattk->aatyp == AT_HUGS && !sticks(pd)) {
         *       if (!u.ustuck && rn2(2)) {                       <- the draw
         *           if (u_slip_free(magr, mattk)) {
         *               mhm->damage = 0;
         *               mhm->hitflags |= M_ATTK_MISS;
         *           } else {
         *               set_ustuck(magr);
         *               pline_mon(magr, "%s grabs you!", Monnam(magr));
         *               mhm->hitflags |= M_ATTK_HIT;
         *           }
         *       } else if (u.ustuck == magr) {
         *           exercise(A_STR, FALSE);
         *           You("are being %s.",
         *               (pa == &mons[PM_ROPE_GOLEM]) ? "choked" : "crushed");
         *       }
         *   } else { hand to hand weapon ... }
         * `sticks(pd)` tests the HERO's OWN current form (pd = mdef->data);
         * a hero polymorphed into a naturally-sticky shape skips this whole
         * probabilistic-grab arm and falls to the hand-to-hand/weapon code
         * below instead (the `return` here is scoped to the !sticks case for
         * exactly that reason).
         *
         * The unconditional "treat as plain hit, fire no RNG" this replaced
         * was a fabricated shortcut: it never drew the rn2(2), so a captured
         * grab attempt left that draw stranded on the tape
         * (rng_result_tape_residual) while coincidentally landing on the same
         * hitflags/damage VALUES as the "already grabbed, hug lands" branch —
         * a value-match hiding a missing draw and the wrong code path.
         * Measured: probe-blastvapor/gen008-objective-seed444777's mattacku
         * capture of a monster's first AT_HUGS swing (u.ustuck unset,
         * rn2(2)=1, u_slip_free false) records rng_consumed=[1]; this port
         * drew nothing. */
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
        /* C:4047-4060 cockatrice-corpse-as-weapon petrification: deferred
         * (select_hwep only picks CORPSE for a gloved or stoning-resistant
         * monster, which the corpus does not produce). */
        /* C:4061 */
        mhm.damage += dmgval(otmp, game.youmonst || { data: game.youmonst?.data });
        /* C:4062-4064 gauntlets of power rn1(4,3): which_armor(magr, W_ARMG)
         * == GAUNTLETS_OF_POWER.  Monster-worn gauntlets are not modelled in
         * this port's monster inventory, so the draw would be unconditional
         * mis-firing; left out (it is guarded in C too). */
        if (mhm.damage <= 0)
            mhm.damage = 1;
        /* C:4067-4072 — a non-artifact weapon always prints the hit message. */
        if (!(otmp.oartifact | 0)) {
            hitmsg_je(mtmp, mattk);
            mhm.hitflags |= M_ATTK_HIT;
        }
        /* C uhitm.c:4073-4074 */
        if (!mhm.damage)
            return;
        /* C:4075-4079 — the silver-sear arm: `objects[otyp].oc_material ==
         * SILVER && Hate_silver`, then exercise(A_CON, FALSE), which DRAWS
         * rn2(2) @exercise(attrib.c:509).  Hate_silver is a hero-polymorph
         * property (were/demon/undead form) that no corpus hero carries, so the
         * guard is false and the draw is not made.  GAP. */
        /* C uhitm.c:4080-4089 — "this redundancy necessary because you have to
         * take the damage _before_ being cloned; need to have at least 2 hp
         * left to split":
         *     tmp = mhm->damage;
         *     if (u.uac < 0)
         *         tmp -= rnd(-u.uac);
         *     if (tmp < 1) tmp = 1;
         *     if (Half_physical_damage) tmp = (tmp + 1) / 2;
         * This rnd(-u.uac) is a SECOND draw, entirely separate from hitmu's own
         * at mhitu.c:1209, and C makes it whenever u.uac < 0 — the pudding test
         * comes AFTER, at C:4091, and does not gate it.  It was missing here, so
         * every weapon hit on a hero with negative AC lost one leaf.
         * MEASURED on corpus-generated/v5/train/gen275-reseed-seed1872667: C's
         * first divergent leaf is `rnd(4)=3 @ mhitm_ad_phys(uhitm.c:4085)`
         * (u.uac == -4) where this port had already moved on to
         * mhitm_knockback's rn2(3). */
        const _u = game.u || {};
        let ptmp = mhm.damage;
        if ((_u.uac | 0) < 0)
            ptmp -= rnd(-(_u.uac | 0));
        if (ptmp < 1)
            ptmp = 1;
        /* C:4088 Half_physical_damage halving of the local tmp — RNG-free. */
        /* C:4091-4105 — the black/brown-pudding clone-on-iron arm, guarded on
         * u.umonnum == PM_BLACK_PUDDING / PM_BROWN_PUDDING.  Its exercise(A_STR)
         * DRAWS, but no corpus hero is a pudding and cloneu() is not ported.
         * GAP, and ptmp is what it would consume. */
        void ptmp;
        /* C:4106 rustm(&gy.youmonst, otmp) — RNG-free unless the DEFENDER has an
         * AD_CORR/AD_RUST/AD_FIRE attack (a polymorphed hero); its rn2(chance)
         * sits behind `dmgtyp != ERODE_NONE`.  GAP. */
        /* C:4107-4121 — the was_poisoned poisoned() call; no corpus monster
         * weapon is poisoned.  GAP. */
        return;
    }
    /* C uhitm.c:4122: else if (aatyp != AT_TUCH || damage != 0 || magr != ustuck)
     * — this port was missing the third disjunct (`magr != u.ustuck`), so a
     * zero-damage AT_TUCH attack from a monster that is NOT currently holding
     * the hero fell through and printed nothing / set no hit flag, where C
     * still hits (only a zero-damage touch from the monster ALREADY holding
     * you, via u.ustuck, is silently absorbed here). Measured on
     * probe-golevel/gen003-objective-seed1113940 (a PM_GUARDIAN_NAGA AT_TUCH/
     * AD_PHYS 0-damage touch): C's mhitm_adtyping records args_after
     * mhm.hitflags=1, this port produced 0. */
    const u_pt = game.u || {};
    if (mattk.aatyp !== AT_TUCH_ || mhm.damage !== 0 || mtmp !== u_pt.ustuck) {
        hitmsg_je(mtmp, mattk);
        mhm.hitflags |= M_ATTK_HIT;
    }
}

/* C ref: uhitm.c:2685 mhitm_ad_elec, mdef == &youmonst branch.
 *   hitmsg; if (!mgc_atk_negated(verbose)) { "You get zapped!"; if
 *   (Shock_resistance) dmg=0 else ...; if (m_lev > rn2(20)) destroy_items }
 *   else dmg = 0.
 * Shock_resistance/destroy_items side-effects deferred; RNG order preserved. */
async function mhitm_ad_elec_u(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    hitmsg_je(mtmp, mattk);
    if (!mhitm_mgc_atk_negated_u(true)) {
        pline('You get zapped!');
        /* C: `if (Shock_resistance)`.  This used to read the raw (always
         * undefined) `u.Shock_resistance` property; the real reader,
         * Shock_resistance_gu() (below, same SHOCK_RES uprops-slot fix its own
         * header documents), is what AD_FIRE's sibling gaze arm already uses. */
        if (Shock_resistance_gu()) {
            pline('The zap doesn\'t shock you!');
            mhm.damage = 0;
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

/* C ref: uhitm.c:2647-2665 mhitm_ad_cold, the `mdef == &gy.youmonst` branch:
 *     hitmsg(magr, mattk);
 *     if (!mhitm_mgc_atk_negated(magr, mdef, TRUE)) {          <- rn2(10)
 *         pline("You're covered in frost!");
 *         if (Cold_resistance) {
 *             pline_The("frost doesn't seem cold!");
 *             monstseesu(M_SEEN_COLD);
 *             mhm->damage = 0;
 *         } else {
 *             monstunseesu(M_SEEN_COLD);
 *         }
 *         if ((int) magr->m_lev > rn2(20))                     <- rn2(20)
 *             (void) destroy_items(&gy.youmonst, AD_COLD, orig_dmg);
 *     } else
 *         mhm->damage = 0;
 *
 * mhitm_adtyping_u had NO AD_COLD case, so every cold attack on the hero fell
 * into the `default:` arm — no message, no damage, and NO DRAWS.  MEASURED on
 * seed0383 leaf 11402 (the session's core first divergence): a mumak's
 * AT_TUCH/AD_COLD touch, where C draws rn2(10) @mhitm_mgc_atk_negated then
 * rn2(20) @mhitm_ad_cold(uhitm.c:2660) before mhitm_knockback's rn2(3), and
 * this port went straight to the knockback.  C's toplines "The mumak touches
 * you!" and "You're covered in frost!" are the two plines below.
 *
 * Same shape and same scope as mhitm_ad_elec_u directly above: destroy_items
 * is a stub in this file, so its rn2(20) gate is drawn (it is C's, and
 * unconditional on this path) and the call itself is a named GAP rather than
 * an invention. */
async function mhitm_ad_cold_u(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    hitmsg_je(mtmp, mattk);
    if (!mhitm_mgc_atk_negated_u(true)) {
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
            /* The REAL destroy_items lives in js/zap.js (C zap.c:5965); this
             * file's own `destroy_items` is a constant-return stub that shadows
             * it, which is why the C draws inside it were missing.  MEASURED on
             * seed0383: after this arm was added the session's first core
             * divergence became leaf 11471, C rn2(5)=4 @destroy_items(zap.c:5998)
             * — the limit roll at the top of that function. */
            await destroy_items_hero_zap(true, AD_COLD_MK, orig_dmg);
        }
    } else {
        mhm.damage = 0;
    }
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

/* C ref: monflag.h:92 M1_CONCEAL 0x00000080L "hides under objects" — the flag
 * mondata.h:35 hides_under(ptr) tests.  Transcribed from the header.
 * (js/dig.js:700 and js/uhitm.js:1142 both carried 0x08000000 here — M1_ACID —
 * which this comment used to record as a live defect; both were repaired
 * 2026-08-28.  Keep transcribing from monflag.h, not from a sibling file.)
 * C ref: defsym.h:362 MONSYM(57, ';', EEL, S_EEL, "sea monster"). */
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

/* C ref: mondata.c:54 attacktype(ptr, atyp) — does the monster's permonst have
 * an attack of the given aatyp?  Reads mattk[] from the makemon pack by mndx. */
function _kb_attacktype(mndx, atyp) {
    const mattks = (mndx >= 0 && mndx < _KB_MATTK.length) ? _KB_MATTK[mndx] : null;
    if (!Array.isArray(mattks)) return false;
    for (const a of mattks) {
        if (!a) continue;
        if ((a.aatyp | 0) === atyp && (a.aatyp | 0) !== 0)
            return true;
    }
    return false;
}
/* C ref: mondata.c — dmgtype: does ptr have an attack with the given adtyp? */
function _kb_dmgtype(mndx, dtyp) {
    const mattks = (mndx >= 0 && mndx < _KB_MATTK.length) ? _KB_MATTK[mndx] : null;
    if (!Array.isArray(mattks)) return false;
    for (const a of mattks) {
        if (!a) continue;
        if ((a.aatyp | 0) !== 0 && (a.adtyp | 0) === dtyp)
            return true;
    }
    return false;
}
/* C ref: mondata.c:654 sticks() — AD_STCK, (AD_WRAP && !AT_ENGL), or AT_HUGS. */
function _kb_sticks(mndx) {
    return _kb_dmgtype(mndx, AD_STCK_)
        || (_kb_dmgtype(mndx, AD_WRAP_) && !_kb_attacktype(mndx, AT_ENGL_))
        || _kb_attacktype(mndx, 7 /* AT_HUGS */);
}

/* C ref: hack.c:974 test_move — TEST_MOVE mode, hero (no Passes_walls / tunnels
 * for the corpus heroes).  Returns whether the hero can be pushed from (ux,uy)
 * by (dx,dy).  Subset: isok + obstruction + closed-door + diagonal-into-door.
 * The DO_MOVE-only message/dig/autoopen branches consume no RNG and are not
 * reachable in TEST_MOVE mode, so they're omitted. */
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
    if (u.ustuck)
        return false;
    if (u.utrap)
        return false; /* mon->mtrapped, i.e. the hero is trapped */
    const loc = game.level?.locations?.[x]?.[y];
    if (!loc)
        return false;
    const typ = loc.typ | 0;
    /* ACCESSIBLE(typ) with water/lava ignored (MM_IGNOREWATER|MM_IGNORELAVA):
     * obstructed rock (< POOL) and iron bars are never goodpos for the hero. */
    if (typ < IS_OBSTRUCTED_TYP || typ === IRONBARS_TYP)
        return false;
    if (typ === DOOR_TYP) {
        const dmask = loc ? (loc.doormask ?? 0) : 0;
        if ((dmask & (D_CLOSED_KB | D_LOCKED_KB)) !== 0)
            return false; /* closed_door */
    }
    /* MON_AT(x,y): another monster already occupies the destination. */
    if (uhitm_m_at(x, y))
        return false;
    return true;
}

/* sgn for knockback direction. */
function sgn_kb(n) { return n > 0 ? 1 : (n < 0 ? -1 : 0); }
/* vtense for "knock": subject "You"/"you" → "knock"; a monster name → "knocks". */
function vtense_knock_kb(subj) {
    return (subj === 'You' || subj === 'you') ? 'knock' : 'knocks';
}
/* Polymorphed-hero msize (deferred — no corpus case reaches the size gate). */
/* C uhitm.c:5324 reads `mdef->data->msize` and mdef is &gy.youmonst, whose
 * data is &mons[u.umonnum] — the POLYMORPHED form's permonst, not a constant.
 * This returned MZ_HUMAN unconditionally, which quietly made the size gate
 * `magr->data->msize > mdef->data->msize + 1` a test against a HUMAN-sized
 * hero however small the hero had become.  Measured on gen232-reseed-
 * seed1268561 step 1552: the hero is polymorphed into a giant rat (MZ_TINY, 0)
 * and a panther (MZ_LARGE, 3) knocks it backward in C — 3 > 1 — while JS asked
 * 3 > 3 and returned FALSE, losing the message's two rn2(2) rolls and the
 * stun's rn2(4) off the stream. */
function heroPolyMsize_kb(u) {
    return _kb_msize((u?.umonnum ?? -1) | 0);
}

const BOULDER_OTYP_KB = 475; /* objects.h ROCK_CLASS BOULDER (mklev.js) */
/* sobj_at(BOULDER, x, y) — any boulder on the floor at (x,y)? */
function _kb_boulder_at(x, y) {
    let o = game.level?.levelObjects?.[x]?.[y];
    for (; o; o = o.nexthere) {
        if ((o.otyp | 0) === BOULDER_OTYP_KB)
            return true;
    }
    return false;
}

/* C ref: do_name.c x_monnam(mon, ARTICLE_A, ...) for the hurtle "bump into"
 * message — indefinite-article monster name ("a kitten"/"an ettin mummy").  A
 * monster with a given name yields that name; otherwise an(species).  The
 * species text (with any "saddled " prefix) comes from the shared mon_nam
 * ("the <species>"); we swap the "the " article for a/an. */
function a_monnam_kb(mtmp) {
    const given = mtmp?.mextra?.mgivenname || ''; /* C: mextra && MGIVENNAME — no flat fallback (2026-09-05) */
    if (given) return given;
    let s = uhitm_mon_nam(mtmp);
    if (!s || s === 'it') return 'something';
    s = s.replace(/^the /, '');
    const vowel = /^[aeiou]/i.test(s);
    return (vowel ? 'an ' : 'a ') + s;
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
/* trap.h trap_types: TT_BEARTRAP 0, TT_PIT 1, TT_WEB 2, TT_LAVA 3,
 * TT_INFLOOR 4, TT_BURIEDBALL 5 */
const TT_WEB_KB = 2, TT_LAVA_KB = 3, TT_INFLOOR_KB = 4, TT_BURIEDBALL_KB = 5;

/* C ref: dothrow.c:1079 hurtle + dothrow.c:773 hurtle_step — hero recoil.
 * Faithful subset for the knockback case: walk up to `range` cardinal/diagonal
 * steps in (dx,dy); stop (and roll rnd(2+remaining) damage) on a wall / closed
 * door / iron bars / boulder; stop (no RNG) on a monster; otherwise update the
 * hero position.  Pool/lava/trap landing effects are deferred (not exercised by
 * the corpus knockback, which lands on open floor). */
function hurtle_u(dx, dy, range) {
    const u = game.u || (game.u = {});
    /* C dothrow.c:1088-1102 — the TWO head-guards of hurtle(), which this
     * subset dropped:
     *     if (Punished && !carried(uball)) {
     *         You_feel("a tug from the iron ball."); nomul(0); return;
     *     } else if (u.utrap) {
     *         You("are anchored by the %s.", ...); nomul(0); return;
     *     }
     * They come BEFORE the sgn()/range paranoia and before any movement, so a
     * punished or trapped hero is knocked back exactly nowhere and gets a
     * message instead.  Missing them cost gen232-reseed-seed1268561 126 frames
     * at step 1025: C's red dragon knocks a ball-and-chained hero backward,
     * prints the tug, and pages the knockback line with a --More-- because a
     * second message follows in the same turn; JS silently moved the hero two
     * squares, printed nothing more, raised no --More--, and from there read
     * the next eight recorded keystrokes as commands where C was still sitting
     * in xwaitforspace().
     *
     * Punished is youprop.h:77 `(uball != 0)` — js/cmd.js:14735 _st_Punished()
     * reads exactly u.uball, with the owornmask scan kept as the fallback for
     * fixtures that seed the object chains without the u.* slots (the same
     * reasoning as js/ball.js findBallChain). */
    const uball = _kb_uball();
    if (uball && (uball.where | 0) !== 3 /* !carried: OBJ_INVENT */) {
        pline('You feel a tug from the iron ball.');
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
    /* ── C dothrow.c:1112-1114, the three statements this subset dropped ─────
     *     nomul(-range);
     *     gm.multi_reason = "moving through the air";
     *     gn.nomovemsg = "";           /* it just happens * /
     * They sit immediately after the sgn()/paranoia guard and before
     * walk_path(), so a hurtled hero is IMMOBILE for `range` turns.  C's
     * dispatch tail (allmain.c:514-536) reads no key while gm.multi < 0, so
     * every one of those turns runs a FULL per-turn world block — movemon,
     * HEAD, maybe_generate_rnd_mon, u_calc_moveamt, regen_hp, gethungry — with
     * no keystroke between them.  Without the nomul the port simply does not
     * run them, and the two RNG streams part at the first draw of the first
     * skipped block.
     *
     * MEASURED on gen446-recombine-seed373399, C step 1049 (the red dragon's
     * knockback).  Leaf-for-leaf, C and this port agree through the stun roll
     * and then split:
     *
     *   leaf   C                                      JS (before this change)
     *   3659   rn2(4)=3  mhitm_knockback(uhitm.c:5397)  rn2(4)=3 js/mhitu.js:1547
     *   3660   rn2(12)=4 mcalcmove(mon.c:1164)          rnd(10)  js/restore.js:216
     *   3661   rn2(12)=6 mcalcmove(mon.c:1164)
     *   3662   rn2(70)=0 maybe_generate_rnd_mon(allmain.c:166)
     *   3663   rn2(3)=0  u_calc_moveamt(allmain.c:131)
     *   3664   rn2(100)=52 regen_hp(allmain.c:659)
     *   3665   rn2(20)=12 gethungry(eat.c:3191)
     *   3666   rn2(67)=0  moveloop_core(allmain.c:360)
     *   3667   rnd(3)=1   moveloop_core(allmain.c:361)
     *   3668   rnd(10)=10 getlev(restore.c:1219)        <- C's step-1061 ^V
     *                                                      level teleport
     * i.e. C runs one whole delayed world block that this port skips, and the
     * port's NEXT draw is C's leaf 3668.  The getlev the port appears to run
     * "early" is not an early level change at all — it is the same wizard-mode
     * level teleport C runs at step 1061, landing eight draws sooner because
     * eight draws are missing in front of it.  The visible cost is HP: C skips
     * the regen_hp roll of a turn it never runs, so C reads HP:36 where this
     * port read HP:37 at step 1067, and 730 step points sit behind it. */
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
            /* C dothrow.c:842-882 hurtle_step — the hurtling hero collides with a
             * monster: emit "You bump into <a monster>." (x_monnam ARTICLE_A) and
             * stop.  wakeup()/setmangry()/wake_nearto() are RNG-neutral for the
             * already-awake adjacent pet the corpus knockback lands on (verified:
             * the RNG stream stays aligned through this step), so only the message
             * is ported.  The glyph_is_monster branch ("You find %s by bumping
             * into %s") is not reached for a visible adjacent monster. */
            pline(`You bump into ${a_monnam_kb(bumpMon)}.`);
            return;
        }
        /* C dothrow.c:907-910 — move the hero one square. */
        u.ux = x; u.uy = y;
        newsym(ox, oy);
        newsym(x, y);
        rem -= 1;
    }
}

/* C ref: uhitm.c:5248 mhitm_knockback — hero-defender path (u_def, magr=mtmp).
 * Fires rn2(3) (knockdistance, unconditional) then rn2(chance) (chance=6).
 * When the chance gate passes AND all positional/size/weapon gates qualify, the
 * monster knocks the hero back: emits the message (rn2(2) x2), hurtles the hero
 * (deferred — no RNG on open floor), and rolls the stun (rn2(4) if !Stunned).
 * Returns TRUE if knockback happened.
 *
 * Faithful subset for the corpus monster-vs-hero case (no monster weapon, no
 * steed): the flimsy/blunt-weapon gate only applies when the monster wields a
 * weapon (weapon_used && MON_WEP), which the corpus melee monsters do not. */
function mhitm_knockback_u(mtmp, mattk) {
    const u = game.u || (game.u = {});
    /* C uhitm.c:5259 — int knockdistance = rn2(3) ? 1 : 2;  (unconditional) */
    const knockdistance = rn2(3) ? 1 : 2;
    const chance = 6;
    /* C: if (wep && is_art(wep, ART_OGRESMASHER)) chance = 2; — corpus monsters
     * wield no ogresmasher; chance stays 6. */
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
    if (!_kb_test_move_hero(defx, defy, dx, dy))
        return false;

    /* C uhitm.c:5310-5318 — cursed-saddle steed redirect: no steed in corpus. */
    /* C uhitm.c:5321-5323 — attacker must be alive (it just attacked). */
    if (DEADMONSTER(mtmp))
        return false;

    /* C uhitm.c:5325-5327 — attacker much larger than defender (hero).
     * Hero (!Upolyd) is MZ_HUMAN; Upolyd hero size deferred (no corpus case). */
    const heroMsize = Upolyd_fn(u) ? heroPolyMsize_kb(u) : MZ_HUMAN_;
    if (!(_kb_msize(magrMndx) > (heroMsize + 1)))
        return false;

    /* C uhitm.c:5329-5331 — flimsy/non-blunt weapon: only when the monster
     * wields a weapon.  Corpus melee monsters fight bare-handed (MON_WEP == 0),
     * so the gate is skipped (matches C's `if (wep && ...)`). */

    /* C uhitm.c:5334 — unsolid attacker can't deliver a solid hit. */
    if ((_kb_mflags1(magrMndx) & M1_UNSOLID_) !== 0)
        return false;

    /* C uhitm.c:5339 — for u_def the attack must have hit; hitmu only calls this
     * after a successful hit, so M_ATTK_HIT is set. */
    /* C uhitm.c:5343 — steadfast defender: hero is not steadfast in the corpus
     * (m_is_steadfast requires a unicorn-horn-like artifact). */

    /* C uhitm.c:5356-5359 — message word:
     *   dismount ? "out of your saddle"
     *   : will_hurtle(mdef, defx+dx, defy+dy) ? "backward"  (target will move)
     *   : "back".
     * No steed in the corpus, so dismount is false; will_hurtle decides
     * "backward" vs "back". */
    const knockedhow = will_hurtle_hero(defx + dx, defy + dy) ? 'backward' : 'back';

    /* C uhitm.c:5361-5375 — message (u_def is always true, so the canseemon
     * gate is bypassed).  Two rn2(2) rolls pick the adjective and the noun. */
    const magrbuf = je_Monnam(mtmp);
    const verb = vtense_knock_kb(magrbuf);
    const word1 = rn2(2) ? 'forceful' : 'powerful';
    const word2 = rn2(2) ? 'blow' : 'strike';
    pline(`${magrbuf} ${verb} you ${knockedhow} with a ${word1} ${word2}!`);

    /* C uhitm.c:5381-5382 — unstuck if hero was held (no held-hero in corpus). */

    /* C uhitm.c:5384-5399 — u_def branch: hurtle the hero, then maybe stun.
     * dismount path (cursed-saddle steed) is deferred (no steed in corpus). */
    hurtle_u(dx, dy, knockdistance);
    /* set_apparxy(magr) — no RNG; mux/muy refresh deferred. */
    /* C uhitm.c:5398 — if (!Stunned && !rn2(4)) make_stunned(knockdistance+1). */
    const Stunned = (HStun(game) & 0xffffff) !== 0;
    if (!Stunned) {
        if (!rn2(4))
            make_stunned(knockdistance + 1, true);
    }
    return true;
}


/* --- the steal() chain's imports/aliases -------------------------------- */
import { W_ARMOR as W_ARMOR_MU, W_ACCESSORY as W_ACCESSORY_MU,
         LEFT_RING as LEFT_RING_MU, RIGHT_RING as RIGHT_RING_MU,
         W_WEAPONS as W_WEAPONS_MU, ADORNED as ADORNED_MU, RLOC_MSG as RLOC_MSG_MU,
         M_ATTK_AGR_DONE,
         PLNMSG_MON_TAKES_OFF_ITEM as PLNMSG_MON_TAKES_OFF_ITEM_MU } from './const.js';
import { remove_worn_item as remove_worn_item_mu } from './steal.js';
import { maybe_finished_meal as maybe_finished_meal_mu, is_fainted as is_fainted_mu,
         morehungry as morehungry_mu } from './eat.js';
import { inv_cnt as inv_cnt_mu, freeinv as freeinv_mu,
         doname_body as doname_body_mu, surface as surface_kb } from './cmd.js';
import { mpickobj as mpickobj_mu } from './mklev.js';
import { encumber_msg as encumber_msg_mu } from './weight.js';
/* poisoned() (attrib.c:316) helpers — imported here, next to the encumber_msg
 * its tail calls, rather than folded into the big const.js/attrib.js lines. */
import { adjattrib as adjattrib_mu, poisontell as poisontell_mu,
         setuhpmax as setuhpmax_mu, minuhpmax as minuhpmax_mu } from './attrib.js';
import { losehp as losehp_mu } from './dokick.js';
import { KILLED_BY_AN as KILLED_BY_AN_MU, KILLED_BY as KILLED_BY_MU,
         POISON_RES as POISON_RES_MU, DIED, POISONING } from './const.js';
/* C youprop.h Poison_resistance = (HPoison_resistance || EPoison_resistance ||
 * ...); read the same way js/potion.js:4055 reads it. */
function _Poison_resistance_mu() {
    const p = game.u && game.u.uprops && game.u.uprops[POISON_RES_MU];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
function Upolyd_mu() { return !!Upolyd_fn(game.u); }
import { doffing as doffing_mu, yname as yname_mu, armor_simple_name_dw as armor_simple_name_mu } from './do_wear.js';
/* C objects[otyp].oc_delay for ARMOR_CLASS — the generated C table. */
import { ARMOR_DATA as ARMOR_DATA_MU } from './armor_data.js';
import { rloc, mnexto as mnexto_mu } from './teleport.js';
import { RLOC_NOMSG as RLOC_NOMSG_MU } from './const.js';
import { um_dist as um_dist_mu } from './cmd.js';
import { Some_Monnam as Some_Monnam_mu, Adjmonnam as Adjmonnam_mu } from './mhitm.js';
import { some_mon_nam } from './mhitm.js';
import { RIGHT_HANDED as RIGHT_HANDED_MU } from './const.js';
import { ENV } from './hostenv.js';

/* C mondata.h is_animal(ptr) — M1_ANIMAL. */
function is_animal_mu(data) { return !!data && ((data.mflags1 | 0) & M1_ANIMAL_MU) !== 0; }
const M1_ANIMAL_MU = 0x00000040; /* monflag.h M1_ANIMAL */
/* C mondata.h throws_rocks(ptr) — M2_ROCKTHROW. */
const M2_ROCKTHROW_MU = 0x08000000; /* monflag.h; mirrors js/makemon.js:3612 */
function throws_rocks_mu(mdat) { return ((mdat?.mflags2 | 0) & M2_ROCKTHROW_MU) !== 0; }
/* C youprop.h Adornment — the EXTRINSIC mask only (a ring of adornment is worn,
 * never intrinsic), which is what steal.c:405/408 tests against LEFT_RING /
 * RIGHT_RING to find which hand carries it. */
function Adornment_mu() { return game.u?.uprops?.[ADORNED_MU]?.extrinsic | 0; }
/* C hack.h Deaf.  This file's existing Deaf(gs) takes the game state. */
function Deaf_mu() { return Deaf(game); }
/* C teleport.c:1949-1959 tele_restrict(mon):
 *     if (noteleport_level(mon)) {
 *         if (canseemon(mon))
 *             pline("A mysterious force prevents %s from teleporting!",
 *                   mon_nam(mon));
 *         return TRUE;
 *     }
 *     return FALSE;
 *
 * This was `return false` with the comment "no level in the public corpus is
 * noteleport, so js/uhitm.js's constant-FALSE body is the live answer".  That
 * absence claim is MEASURED FALSE: seed4500-knight-coverage spends steps
 * 946-1060 on Medusa's level, and dat/medusa-3.lua opens with
 * des.level_flags("noteleport", "mazelevel", "shortsighted").
 * noteleport_level() is fully ported in js/makemon.js:4517 and
 * game.level.flags.noteleport is written by js/sp_lev.js from that very
 * des.level_flags() call, so the predicate had everything it needed.
 *
 * MEASURED: at step 986 a wood nymph steals from the hero and C does NOT
 * teleport away — uhitm.c:4681's `!is_animal(magr->data) && !tele_restrict()`
 * is false — so C's next leaves are mhitm_knockback's rn2(3)/rn2(6), while
 * this port ran rloc()'s rnd(79)/rn2(21) rejection loop instead. */
function tele_restrict_mu(magr) {
    if (noteleport_level_mu(magr)) {
        if (canseemon_mu(magr))
            pline("A mysterious force prevents %s from teleporting!",
                  mon_nam_uh(magr));
        return true;
    }
    return false;
}
/* C objnam.c doname(obj). */
async function doname_mu(obj) {
    return await doname_body_mu(obj,
        (game.u?.uhandedness === RIGHT_HANDED_MU) ? 'right' : 'left');
}
/* C monmove.c monnear(mon, x, y) — adjacent or same square (mirrors the
 * identical body in js/mhitm.js:224, which is file-local there). */
function monnear_mu(mon, x, y) {
    const dx = Math.abs((mon.mx | 0) - (x | 0));
    const dy = Math.abs((mon.my | 0) - (y | 0));
    return dx <= 1 && dy <= 1;
}
/* C monattk.h:65 AD_SSEX. */
const AD_SSEX_ = 23;

const AD_SITM_ = 21;       /* monattk.h:63 — steals item (nymphs) */
const AD_SEDU_ = 22;       /* monattk.h:64 */
const S_NYMPH_ = 14;       /* monsym.h — matches js/makemon.js:1890 */
const COIN_CLASS_ = 12;
/* objects.h is an X-macro file, so both otyps are verified by NAME against
 * js/oc_name_data.js: OC_NAME[236] === 'leash', OC_NAME[475] === 'boulder'. */
const LEASH_MU = 236;
const BOULDER_MU = 475;

/* C uhitm.c:4623-4700 mhitm_ad_sedu(), the `mdef == &gy.youmonst` (mhitu) arm.
 *
 * The water nymph's AD_SITM attack landed in mhitm_adtyping_u's default arm,
 * which zeroes the damage and draws nothing.  C runs steal() here, which is one
 * rn2 -- and then, on a successful steal, rloc()s the thief away, which is
 * another eleven draws.  seed0014 step 415 is where our stream left C's: C drew
 * rn2(21) at steal.c:421 and we drew mhitm_knockback's rn2(3), i.e. we fell
 * straight past the attack to the knockback.
 *
 * The three arms above the steal (animal, hero-is-a-seducer, cancelled monster)
 * are ported because each one changes the draw count; none is taken here.
 */
async function mhitm_ad_sedu_u(magr, mattk, mhm) {
    const g = game;

    if (is_animal_mu(magr.data)) {
        await hitmsg(magr, mattk);
        if (magr.mcan | 0)
            return;
        /* Continue below */
    } else if (dmgtype(g.youmonst?.data ?? g.u?.data, AD_SEDU_)
               || dmgtype(g.youmonst?.data ?? g.u?.data, AD_SSEX_)) {
        pline(`${je_Monnam(magr)} ${Deaf_mu()
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
            pline(`${Adjmonnam_mu(magr, 'plain')} tries to ${
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
        /* C uhitm.c:4685-4690 — the animal arm is gated on canseemon() and its
         * wording is "%s tries to %s away with %s." with locomotion(data,"run"),
         * NOT the ungated "escapes with your %s!" this port had. */
        if (is_animal_mu(magr.data) && buf.s) {
            if (canseemon_mu(magr))
                pline(`${je_Monnam(magr)} tries to ${
                    locomotion(magr.data, 'run')} away with ${buf.s}.`);
        }
        /* C uhitm.c:4691-4694 — monflee(), then hitflags = M_ATTK_AGR_DONE and
         * done = TRUE.  BOTH were missing here, and the hitflags is what
         * mattacku (mhitu.c:944, `if ((sum[i] & M_ATTK_AGR_DONE)) break;
         * /-* attacker teleported, no more attacks *-/`) reads to stop the
         * attack loop.  Without it a water nymph that had already stolen and
         * rloc'd away kept going and ran its SECOND attack against the hero.
         * Measured on seed0014 at leaf 16725: C leaves mattacku and the next
         * monster's dochug draws rn2(5) @ distfleeck(monmove.c:538); this port
         * drew rnd(20+i) @ mattacku instead, and the nymph stayed painted on
         * the hero's square for the rest of the run. */
        await monflee(magr, 0, false, false);
        mhm.hitflags = M_ATTK_AGR_DONE;
        mhm.done = true;
        return;
    }
    /* C's mhitu arm has no post-switch statement — every case returns.  Only
     * `case 0:` (steal() found nothing to take) leaves damage alone, and it
     * returns above. */
}

/* C steal.c:292-334 — static void worn_item_removal(struct monst *mon,
 *                                                   struct obj *obj)
 *
 * The message that prefaces a theft of a WORN item, and then the removal.  It
 * is built by string-surgery on doname(), not by re-formatting:
 *
 *   objbuf = doname(obj);                      "a black onyx ring (on right hand)"
 *   strip "a "/"an "/"the " -> "your "         "your black onyx ring (on right hand)"
 *   strsubst " (being worn)" -> ""
 *   strsubst " (alternate weapon; not wielded)" -> ""
 *   " (on left|right " -> " (from left|right " (strsubst at p+2, so only the
 *                                               "on" inside that parenthesis)
 *   verb = W_WEAPONS ? "disarms" : W_ACCESSORY ? "removes" : "takes off"
 *   pline("%s %s %s.", Some_Monnam(mon), verb, objbuf)
 *
 * which is how seed0014 step 416 reads "The water nymph removes your black onyx
 * ring (from right hand)." -- a sentence no namer produces directly.
 *
 * iflags.last_msg is C's channel for telling steal() that this message was just
 * printed, so steal() can shorten its own to "She stole ...".  C clears it in
 * pline(); this port's pline does not, so steal() clears it on entry instead --
 * same value on every path through steal(), since worn_item_removal is the only
 * setter reachable in between.
 */
async function worn_item_removal(mon, obj) {
    const g = game;
    let objbuf = await doname_mu(obj);

    const strip_art = objbuf.startsWith('the ') ? 4
                    : objbuf.startsWith('an ') ? 3
                      : objbuf.startsWith('a ') ? 2
                        : 0;
    if (strip_art) {
        /* C:305 — "an iron chain (attached to you)" becomes "the ...", not
         * "your ...", when the caller passed uchain. */
        objbuf = ((obj === g.uchain) ? 'the ' : 'your ') + objbuf.slice(strip_art);
    }
    objbuf = objbuf.replace(' (being worn)', '');
    objbuf = objbuf.replace(' (alternate weapon; not wielded)', '');
    /* C:319-322 — strsubst(p + 2, "on", "from"), i.e. only the "on" that opens
     * a "(on left hand)" / "(on right hand)" suffix. */
    const p = objbuf.indexOf(' (on ');
    if (p >= 0 && (objbuf.startsWith('left ', p + 5)
                   || objbuf.startsWith('right ', p + 5)))
        objbuf = objbuf.slice(0, p + 2) + 'from' + objbuf.slice(p + 4);

    const verb = ((obj.owornmask | 0) & W_WEAPONS_MU) ? 'disarms'
               : ((obj.owornmask | 0) & W_ACCESSORY_MU) ? 'removes'
                 : 'takes off';
    await pline(`${Some_Monnam_mu(mon)} ${verb} ${objbuf}.`);
    (g.iflags ||= {}).last_msg = PLNMSG_MON_TAKES_OFF_ITEM_MU;
    /* removal might trigger more messages (due to loss of Lev|Fly) */
    await remove_worn_item_mu(obj, true);
}

/* C steal.c:340-560 — int steal(struct monst *mtmp, char *objnambuf)
 *
 * Returns 1 when something was stolen (or at least when the thief should flee),
 * 0 when nothing happened, -1 if the thief died trying.
 *
 * The one RNG call on the normal path is the WEIGHTED pick at steal.c:421:
 * every non-coin, non-skin, non-cloak-shadowed inventory item contributes 1,
 * or 5 if it is worn, and `tmp = rn2(tmp)` selects by walking the same weights
 * back down.  seed0014's hero has a 21-weight inventory at step 415 and C rolls
 * rn2(21)=12, which lands on the worn black onyx ring.
 *
 * Placement note: this is steal.c code and js/steal.js exists, but that file is
 * a stub farm -- its file-local pline() is a no-op and its Monnam() returns the
 * literal "monster" -- so a steal() written there would silently drop both of
 * this function's messages.  It lives beside its only caller instead, on the
 * real pline/Monnam/canspotmon of this file.  js/steal.js's stub bodies are the
 * defect; they are left alone here rather than half-fixed.
 *
 * Deliberately NOT ported, each throwing rather than guessing: the Punished /
 * uchain arms of nothing_to_steal, the monkey_business (is_animal) stickiness
 * and can_carry checks, the ARMOR_CLASS seduction/undressing arm with its
 * nomul() delay and afternmv=stealarm continuation, and the petrification
 * check.  None is reachable for a water nymph stealing an accessory from an
 * unpunished hero, and each would need its own RNG to be right.
 */
/* C apply.c:711-724 — a leash which is stolen is detached from its pet before
 * the object leaves the hero's inventory.  `leashmon` is the object's
 * corpsenm alias; the monster list is the authoritative place to clear the
 * matching mleashed bit.  This is deliberately synchronous: steal() is called
 * from the synchronous monster attack path, and update_inventory() is the
 * corresponding synchronous C routine. */
function o_unleash_mu(otmp) {
    if (!otmp)
        return;
    const leashmon = otmp.leashmon | 0;
    if (leashmon) {
        for (let m = game.fmon; m; m = m.nmon) {
            if ((m.m_id | 0) === leashmon) {
                m.mleashed = 0;
                break;
            }
        }
    }
    otmp.leashmon = 0;
    update_inventory();
}

async function steal(mtmp, objnambuf) {
    const g = game, u = g.u;
    let otmp, tmp, named = 0, retrycnt = 0;
    const monkey_business = is_animal_mu(mtmp.data);

    if (objnambuf)
        objnambuf.s = '';
    /* C:352 — true if successful on the first of two attacks. */
    if (!monnear_mu(mtmp, u.ux, u.uy))
        return 0;

    /* C:361 — remember the name NOW: stealing a worn item can drop the hero
     * into water, or remove the Eyes of the Overworld, either of which changes
     * whether the thief is visible by the time the message is printed. */
    const Monnambuf = Some_Monnam_mu(mtmp);
    /* C steal.c:346 `seen = canspotmon(mtmp)` — captured with Monnambuf, and
     * used by the ARMOR_CLASS arm's "She"/<Monnam> choice below. */
    const seen = canspotmon_disp(mtmp);

    /* C:365-367 — food being eaten may be used up but not yet removed from
     * inventory; don't steal that. */
    if (g.occupation)
        await maybe_finished_meal_mu(false);

    (g.iflags ||= {}).last_msg = 0 /* PLNMSG_UNKNOWN */;

    /* C steal.c:376-391, shared by an empty inventory and by the retry
     * path whose weighted candidate set is empty.  Keeping this as one
     * closure matters: the punishment and buried-ball rn2(4) gates are
     * reached in exactly the same order in both cases. */
    const nothing_to_steal = async () => {
        const punished = !!(u.uball || _kb_uball());
        const is_buried_ball = !!(u.utrap &&
            ((u.utraptype | 0) === TT_BURIEDBALL_KB ||
             (u.utraptype | 0) === 6));
        if (!monkey_business && punished && rn2(4)) {
            const chain = u.uchain || g.uchain;
            if (chain)
                await worn_item_removal(mtmp, chain);
            return 1; /* C falls through to the common flee return. */
        } else if (!monkey_business && is_buried_ball && !rn2(4)) {
            await pline(`${Monnambuf} takes off your unseen chain.`);
            const noticed = { value: false };
            await openholdingtrap_mu(game.youmonst, noticed);
            return 1; /* C's nothing_to_steal label returns immediately. */
        }
        if (Blind_mu())
            await pline('Somebody tries to rob you, but finds nothing to steal.');
        else if (inv_cnt_mu(true) > inv_cnt_mu(false))
            await pline(`${Monnambuf} tries to rob you, but isn't interested in gold.`);
        else
            await pline(`${Monnambuf} tries to rob you, but there is nothing to steal!`);
        return 1; /* let her flee */
    };
    /* C steal.c:476-490 — an animal that cannot overcome a cursed/welded
     * item, or cannot carry it, gives up.  This is also the target of the
     * second boulder retry (the `cant_take:` label), so keep the message and
     * its final flee-roll in one helper. */
    const cant_take = () => {
        const how = ['steal', 'snatch', 'grab', 'take'];
        const verb = how[rn2(how.length)];
        const worn = !!((otmp.owornmask | 0) & W_ARMOR_MU);
        const what = worn ? `your ${armor_simple_name_mu(otmp)}` : yname_mu(otmp);
        pline(`${Monnambuf} tries to ${verb} ${what} but gives up.`);
        return !rn2(Math.trunc(inv_cnt_mu(false) / 5) + 2);
    };
    const icnt = inv_cnt_mu(false); /* don't include gold */
    if (!icnt || (icnt === 1 && u.uskin))
        return await nothing_to_steal();

    /* C:403-411 — a ring of adornment targets a worn ring directly, skipping
     * the weighted pick (and its rn2). */
    let gotobj = false;
    if (monkey_business || u.uarmg) {
        ; /* skip ring special cases */
    } else if (Adornment_mu() & LEFT_RING_MU) {
        otmp = u.uleft;
        gotobj = true;
    } else if (Adornment_mu() & RIGHT_RING_MU) {
        otmp = u.uright;
        gotobj = true;
    }

    if (!gotobj) {
      for (;;) { /* C's `retry:` label */
        tmp = 0;
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if ((!u.uarm || otmp !== u.uarmc) && otmp !== u.uskin
                && otmp.oclass !== COIN_CLASS_)
                tmp += ((otmp.owornmask | 0) & (W_ARMOR_MU | W_ACCESSORY_MU)) ? 5 : 1;
        /* C:421's zero-weight case jumps to nothing_to_steal.  This can
         * occur when inventory contains only skin/excluded objects, even
         * though icnt was nonzero; do not consume an RNG draw or throw. */
        if (!tmp)
            return await nothing_to_steal();
        tmp = rn2(tmp);
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if ((!u.uarm || otmp !== u.uarmc) && otmp !== u.uskin
                && otmp.oclass !== COIN_CLASS_) {
                tmp -= ((otmp.owornmask | 0) & (W_ARMOR_MU | W_ACCESSORY_MU)) ? 5 : 1;
                if (tmp < 0)
                    break;
            }
        if (!otmp)
            return 0; /* C impossible("Steal fails!") */

        /* C:432-447 — the "can't take X while wearing Y" substitutions. */
        if ((otmp === u.uleft || otmp === u.uright) && u.uarmg)
            otmp = u.uarmg;
        if (otmp === u.uarmg && u.uwep)
            otmp = u.uwep;
        else if (otmp === u.uarm && u.uarmc)
            otmp = u.uarmc;
        else if (otmp === u.uarmu && u.uarmc)
            otmp = u.uarmc;
        else if (otmp === u.uarmu && u.uarm)
            otmp = u.uarm;

        if (otmp.otyp === BOULDER_MU && !throws_rocks_mu(mtmp.data)) {
            if (!retrycnt++)
                continue; /* C: goto retry */
            return cant_take(); /* C: goto cant_take */
        }
        break;
    }
    }

    /* C:449-450 `gotobj:` */
    if (otmp.o_id === g.stealoid)
        return 0;
    /* C steal.c:465-490 — animals cannot overcome cursed stickiness (or
     * welded rings) and cannot take objects beyond their carrying capacity.
     * Quiver and an inactive secondary weapon are not really worn for this
     * test, while the ball is effectively worn because its curse is implicit. */
    if (monkey_business) {
        let ostuck;
        if (otmp === u.uball)
            ostuck = true;
        else if (otmp === u.uquiver || (otmp === u.uswapwep && !u.twoweap))
            ostuck = false;
        else
            ostuck = !!(((otmp.cursed | 0) && (otmp.owornmask | 0))
                || (otmp === ((u.uhandedness === RIGHT_HANDED_MU) ? u.uright : u.uleft)
                    && welded_mu(u.uwep))
                || (otmp === ((u.uhandedness === RIGHT_HANDED_MU) ? u.uleft : u.uright)
                    && welded_mu(u.uwep)
                    && bimanual_mu(u.uwep)));
        if (ostuck || can_carry_mu(mtmp, otmp) === 0)
            return cant_take();
    }
    if (otmp.otyp === LEASH_MU && otmp.leashmon)
        o_unleash_mu(otmp);

    const was_doffing = doffing_mu(otmp);
    /* C:499 stop_donning(otmp) returns the remaining donning delay; nothing in
     * js/ tracks a partially-donned item, and the ARMOR_CLASS arm that consumes
     * it throws below, so the only value it can legally have here is 0. */
    const olddelay = 0;
    void olddelay;
    await stop_occupation();

    if ((otmp.owornmask | 0) & (W_ARMOR_MU | W_ACCESSORY_MU)) {
        /* objclass.h's class ids come from the OBJCLASS() X-macro table
         * (include/defsym.h:466-478), not from a greppable enum:
         *   2 WEAPON  3 ARMOR  4 RING  5 AMULET  6 TOOL  7 FOOD  12 COIN */
        switch (otmp.oclass) {
        case 6:  /* TOOL_CLASS */
        case 5:  /* AMULET_CLASS */
        case 4:  /* RING_CLASS */
        case 7:  /* FOOD_CLASS -- meat ring */
            await worn_item_removal(mtmp, otmp);
            break;
        case 3: {  /* ARMOR_CLASS — C steal.c:513-560 */
            /* C:514-516 —
             *     armordelay = objects[otmp->otyp].oc_delay;
             *     if (olddelay > 0 && olddelay < armordelay)
             *         armordelay = olddelay;
             * `olddelay` is stop_donning()'s return and is 0 on every path this
             * port can reach (nothing tracks a partially-donned item — see the
             * note above), so the clamp cannot fire here. */
            const _row = ARMOR_DATA_MU[otmp.otyp | 0];
            const armordelay = _row ? (_row.delay | 0) : 0;
            /* C:517 `if (monkey_business || unresponsive())`.  monkey_business
             * is already refused above (it throws), and unresponsive() is
             * `gm.multi >= 0 ? FALSE : (unconscious() || is_fainted() || ...)`
             * — this port has no multi < 0 state at a monster's attack, so the
             * seduction branch is the one C takes. */
            const curssv = otmp.cursed;
            otmp.cursed = 0;
            /* C:527 slowly = (armordelay >= 1 || gm.multi < 0) */
            const slowly = (armordelay >= 1) || ((game.multi | 0) < 0);
            if (game.flags?.female) {
                pline(`${!seen ? 'She' : Monnambuf} charms you.  You gladly ${
                    curssv ? 'let her take'
                    : !slowly ? 'hand over'
                    : was_doffing ? 'continue removing'
                    : 'start removing'} your ${armor_simple_name_mu(otmp)}.`);
            } else {
                pline(`${!seen ? 'She' : Adjmonnam_mu(mtmp, 'beautiful')} seduces you and ${
                    curssv ? 'helps you to take'
                    : !slowly ? 'you take'
                    : was_doffing ? 'you continue taking'
                    : 'you start taking'} off your ${armor_simple_name_mu(otmp)}.`);
            }
            ++named;
            /* C:551-553 — set multi for later on. */
            nomul(-armordelay);
            game.multi_reason = 'taking off clothes';
            game.nomovemsg = 0;
            await remove_worn_item_mu(otmp, true);
            otmp.cursed = curssv;
            if ((game.multi | 0) < 0) {
                /* C:556-559 — the undressing takes real turns; the theft
                 * itself is finished later by afternmv = stealarm.  This port
                 * has no afternmv channel, so the continuation is NOT
                 * fabricated: record the ids C records and return 0, which is
                 * C's own return value on this path.  The gap is the delayed
                 * completion, not this branch. */
                g.stealoid = otmp.o_id;
                g.stealmid = mtmp.m_id;
                return 0;
            }
            break;
        }
        default:
            break; /* C impossible("Tried to steal a strange worn thing.") */
        }
    } else if (otmp.owornmask | 0) {
        /* C steal.c:570-583 — weapon or ball & chain.
         *     struct obj *item = otmp;
         *     if (otmp == uball) item = uchain;
         *     worn_item_removal(mtmp, item);
         *     if ((otmp->owornmask & W_WEAPONS) != 0L)
         *         remove_worn_item(otmp, FALSE);
         * This is the arm C takes on seed4500-knight-coverage step 987 — "The
         * wood nymph disarms your +1 lance.  She stole a +1 lance." — and it
         * was a throw. */
        const item = (otmp === g.uball && g.uchain) ? g.uchain : otmp;
        await worn_item_removal(mtmp, item);
        if ((otmp.owornmask | 0) & W_WEAPONS_MU)
            await remove_worn_item_mu(otmp, false);
    }

    /* C:566 — do this before removing it from inventory. */
    if (objnambuf)
        objnambuf.s = yname_mu(otmp);
    /* C:569-570 — set mavenge so knights don't take an alignment penalty for
     * retaliating. */
    if (!_conflict_mu())
        mtmp.mavenge = 1;
    if (otmp.unpaid) {
        const shops = g.u?.ushops || '';
        const shkp = shops.length ? shop_keeper_real(shops[0]) : null;
        await subfrombill_real(otmp, shkp);
    }
    freeinv_mu(otmp);

    /* C:578-581 — if worn_item_removal just spoke and nothing has spoken since,
     * shorten "<mon> stole <item>" to "She stole <item>". */
    if ((g.iflags?.last_msg | 0) === PLNMSG_MON_TAKES_OFF_ITEM_MU
        && (mtmp.data?.mlet | 0) === S_NYMPH_)
        ++named;
    pline(`${named ? 'She' : Monnambuf} stole ${(await doname_mu(otmp))}.`);
    encumber_msg_mu();
    otmp.how_lost = 2 /* LOST_STOLEN */;
    await mpickobj_mu(mtmp, otmp);
    return 1;
}

/* C ref: uhitm.c mhitm_adtyping dispatch, hero-defender subset.
 *
 * Exported (2026-09-04) so the capture-replay sweep can grade a captured
 * mhitm_adtyping record against the dispatcher that actually receives it at
 * runtime. C has ONE mhitm_adtyping(magr, mattk, mdef, mhm) (uhitm.c:4782)
 * shared by three call sites; this port split it into two 14-case
 * dispatchers — js/uhitm.js's exported `mhitm_adtyping` and this file's
 * hero-defender subset. Exporting does not change what runs on the scored
 * path: the sole caller remains this file's own mhitu() at line ~2695
 * (`await mhitm_adtyping_u(mtmp, mattk, mhm)`), unchanged. */
export async function mhitm_adtyping_u(mtmp, mattk, mhm) {
    switch (mattk.adtyp) {
        case AD_PHYS_: mhitm_ad_phys_u(mtmp, mattk, mhm); break;
        case AD_ELEC_: await mhitm_ad_elec_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4809-4811 — AD_DRST/AD_DRDX/AD_DRCO share mhitm_ad_drst. */
        case AD_DRST_: case AD_DRDX_: case AD_DRCO_:
            await mhitm_ad_drst_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4798-4799 — AD_SITM and AD_SEDU share mhitm_ad_sedu. */
        case AD_SITM_: case AD_SEDU_:
            await mhitm_ad_sedu_u(mtmp, mattk, mhm); break;
        case AD_BLND_U:
            mhitm_ad_blnd_u(mtmp, mattk, mhm); break;
        case AD_STON:
            await mhitm_ad_ston_u(mtmp, mattk, mhm); break;
        case AD_STCK_:
            mhitm_ad_stck_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4813 `case AD_WRAP: mhitm_ad_wrap(...)` — see
         * mhitm_ad_wrap_u's header for what its absence cost. */
        case AD_WRAP_:
            mhitm_ad_wrap_u(mtmp, mattk, mhm); break;
        /* C uhitm.c:4814 `case AD_LEGS: mhitm_ad_legs(...)`.  C has ONE
         * mhitm_adtyping and ONE mhitm_ad_legs; this file keeps a hero-defender
         * SUBSET of the dispatch, and AD_LEGS was missing from it, so a xan's
         * sting fell into the `default:` and drew nothing.  MEASURED on
         * seed4500-knight-coverage step 1792: C draws rn2(2) @mhitm_ad_legs
         * (uhitm.c:4442) for the side, rnd(51) @:4475 for set_wounded_legs and
         * two rn2(2) @exercise; this port drew rn2(3).  js/uhitm.js:4764 has
         * the full body already — it was reachable only from the
         * monster-vs-monster dispatch. */
        case AD_LEGS_MU:
            await mhitm_ad_legs_uh(mtmp, mattk, game.youmonst, mhm); break;
        /* C uhitm.c:4795 `case AD_COLD: mhitm_ad_cold(...)` — see
         * mhitm_ad_cold_u's header for what its absence cost. */
        case AD_COLD_MK:
            await mhitm_ad_cold_u(mtmp, mattk, mhm); break;
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
            mhitm_ad_were_u(mtmp, mattk, mhm); break;
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
        /* C uhitm.c:4803 `case AD_CURS: mhitm_ad_curs(...)`.  The
         * mhitu arm always emits hitmsg first.  A gremlin attack at
         * daytime then returns before the curse roll (uhitm.c:3029-3032),
         * which is the exact zero-RNG/display-only path used by gen040's
         * AD_CURS slot (mattk adtyp 253, damn/damd 0). */
        case AD_CURS_MU:
            hitmsg_je(mtmp, mattk);
            if (!night() && ((mtmp.mndx ?? mtmp.mnum ?? -1) | 0) === PM_GREMLIN_MU)
                break;
            /* The remaining curse effect is not yet ported; preserve the
             * existing no-RNG behavior until a captured active arm is
             * available. */
            break;
        default:
            /* unported adtyp — no RNG, no damage applied (deferred) */
            mhm.damage = 0;
            break;
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

    const halfPhysical = game.u?.uprops?.[74]; /* prop.h HALF_PHYS_DAM */
    if (halfPhysical && ((halfPhysical.intrinsic | 0) || (halfPhysical.extrinsic | 0)))
        mhm.damage = Math.trunc(((mhm.damage | 0) + 1) / 2);
    await mdamageu(mtmp, mhm.damage | 0);
    mhm.damage = 0;

    if (!u.uarmh || (u.uarmh.otyp | 0) !== 94 /* DUNCE_CAP */) {
        const oldmort = u.umortality | 0;
        const result = await eat_brains(mtmp, game.youmonst, true, null);
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
        drain_weapon_skill(rnd(2));
        game.s.skipdrin = 1;
    }
}

/* C ref: uhitm.c:2478-2487 mhitm_ad_drli, the `mdef == &gy.youmonst` arm —
 * a life-draining hit on the hero (barrow wight / wraith / vampire / a
 * Stormbringer-alike in monster hands).  C:
 *
 *     hitmsg(magr, mattk);
 *     if (!rn2(3) && !Drain_resistance
 *         && !mhitm_mgc_atk_negated(magr, mdef, TRUE))       <- rn2(10)
 *         losexp("life drainage");
 *
 * mhitm_adtyping_u had NO AD_DRLI case, so every drain attack on the hero fell
 * into the `default:` arm: no hit message, no damage, AND NO DRAW.  Measured on
 * gen362-reseed-seed208714 step 362 (leaf 72596): C prints "The barrow wight
 * swings his long sword.  The barrow wight hits!" and draws rn2(3)=0
 * @mhitm_ad_drli(uhitm.c:2482) then rn2(10)=3 @mhitm_mgc_atk_negated(uhitm.c:87);
 * this port printed only the swing and fell straight through to
 * mhitm_knockback's rn2(3)/rn2(6), which is why first-divergence reported the
 * JS half as mhitm_knockback_u — the knockdistance rn2(3) had slid up into the
 * hole the missing case left.
 *
 * Drain_resistance is HDrain_resistance || EDrain_resistance
 * (youprop.h:52) = u.uprops[DRAIN_RES], read through the same numeric
 * spelling the rest of this file uses.  losexp() is js/exper.js:525.
 * C applies NO damage of its own here — mhm.damage keeps the d(damn,damd)
 * hitmu rolled — so this arm deliberately leaves mhm.damage alone, unlike the
 * `default:` arm it replaces, which zeroed it. */
async function mhitm_ad_drli_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    if (!rn2(3) && !Drain_resistance_mu()
        && !mhitm_mgc_atk_negated_u(true)) {
        await losexp("life drainage");
        /* C's own comment: unlike hitting with Stormbringer, wounded attacker
           doesn't heal any from the drained life */
    }
    /* C uhitm.c:2477-2484 (the mhitu arm) ends after hitmsg()/losexp() and
     * NEVER touches mhm->hitflags — grep confirms no `hitflags` write in
     * mhitm_ad_drli's mdef==youmonst branch at all. The `mhm.hitflags |=
     * M_ATTK_HIT` that used to sit here was fabricated (not in C): it made
     * hitmu's downstream mhitm_knockback see a "hit" that C's own hitflags
     * (left at M_ATTK_MISS by the caller) does not report. Measured:
     * probe-golevel/gen003-objective-seed1113940's PM_VAMPIRE_LORD drain-bite
     * records args_after mhm.hitflags=0; this port produced 1. */
}
/* C youprop.h:52 Drain_resistance = HDrain_resistance || EDrain_resistance. */
function Drain_resistance_mu() {
    const p = game.u && game.u.uprops && game.u.uprops[DRAIN_RES_MU];
    return !!(p && (p.intrinsic || p.extrinsic));
}
const AD_DRLI_MU = 15;    /* monattk.h:57 */
const DRAIN_RES_MU = 9;   /* prop.h:27 (js/const.js:2335) */
const AD_CORR_MU = 42;    /* monattk.h:84 */

async function mhitm_ad_corr_u(mtmp, mattk) {
    await hitmsg(mtmp, mattk);
    if (mtmp.mcan)
        return;
    await erode_armor_um(game.youmonst, ERODE_CORRODE);
}

/* C ref: uhitm.c:3837-3883 mhitm_ad_deth, the `mdef == &gy.youmonst` arm — a
 * touch of Death (or a death-touch-wielding monster) on the hero. C:
 *
 *     pline_mon(magr, "%s reaches out with its deadly touch.", Monnam(magr));
 *     if (is_undead(pd)) {
 *         mhm->damage = (mhm->damage + 1) / 2;
 *         pline("Was that the touch of death?");
 *         return;
 *     }
 *     switch (rn2(20)) {
 *     case 19: case 18: case 17:
 *         if (!Antimagic) {
 *             touch_of_death(magr);
 *             mhm->damage = 0;
 *             return;
 *         }
 *         FALLTHROUGH;
 *     default: /* case 16 .. case 5 * /
 *         You_feel("your life force draining away...");
 *         mhm->permdmg = 1;
 *         return;
 *     case 4: case 3: case 2: case 1: case 0:
 *         if (Antimagic)
 *             shieldeff(u.ux, u.uy);
 *         pline("Lucky for you, it didn't work!");
 *         mhm->damage = 0;
 *         return;
 *     }
 *
 * mhitm_adtyping_u had NO AD_DETH case at all, so a Death hit on the hero
 * fell into the `default:` arm: no message, no draw, mhm.damage zeroed.
 * Measured on probe-reach-melee/gen042-objective-seed836413 step 1628: C
 * draws rn2(20)=17 @mhitm_ad_deth(uhitm.c:3858) then d(8,6)=24
 * @touch_of_death(mcastu.c:326); this port drew nothing.
 *
 * touch_of_death (mcastu.c:322, js/mcastu.js's exported touch_of_death) is
 * itself async (it can call rehumanize()), so this arm and its dispatcher
 * case are both async. pd is mdef->data == game.youmonst.data here (mdef is
 * always the hero on this dispatcher). */
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
/* C ref: uhitm.c:3789-3796 mhitm_ad_famn, the `mdef == &gy.youmonst` arm —
 * Famine (or a Famine-alike) draining the hero's food:
 *
 *     pline_mon(magr, "%s reaches out, and your body shrivels.", Monnam(magr));
 *     exercise(A_CON, FALSE);
 *     if (!is_fainted())
 *         morehungry(rn1(40, 40));
 *     /* plus the normal damage * /
 *
 * mhitm_adtyping_u had NO AD_FAMN case at all, so a Famine hit on the hero
 * fell into the `default:` arm: no message, no exercise draw, no hunger
 * change, and mhm.damage zeroed (C leaves it alone — "plus the normal
 * damage"). Measured on probe-reach-melee/gen003-objective-seed1882708 step
 * 182: C draws rn2(2)=0 @exercise(attrib.c:509) then rn2(40)=39
 * @mhitm_ad_famn(uhitm.c:3795) [rn1(40,40) = rn2(40)+40]; this port drew
 * nothing. */
async function mhitm_ad_famn_u(magr, mattk, mhm) {
    pline_mon(magr, "%s reaches out, and your body shrivels.", Monnam(magr));
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
function You_feel_mu(msg) { pline('You feel ' + msg); }
const AD_DETH_MU = 37;    /* monattk.h:79 */
const AD_FAMN_MU = 39;    /* monattk.h:81 */
const ANTIMAGIC_MU = 12;  /* prop.h:30 (js/const.js:2339) */

/* C ref: uhitm.c:3526-3570 mhitm_ad_slim, the `mdef == &gy.youmonst` (mhitu)
 * arm — a green slime's touch, starting the hero down the road to turning
 * into slime. C:
 *
 *     negated = mhitm_mgc_atk_negated(magr, mdef, FALSE);   <- rn2(10)
 *     pd = mdef->data;
 *     hitmsg(magr, mattk);
 *     if (negated) {
 *         if (!magr->mcan) You("escape harm.");
 *         return;
 *     }
 *     if (flaming(pd)) {
 *         pline_The("slime burns away!");
 *         mhm->damage = 0;
 *     } else if (Unchanging || noncorporeal(pd) || pd == &mons[PM_GREEN_SLIME]) {
 *         You("are unaffected.");
 *         mhm->damage = 0;
 *     } else if (!Slimed) {
 *         You("don't feel very well.");
 *         make_slimed(10L, (char *) 0);
 *         delayed_killer(SLIMED, KILLED_BY_AN, pmname(magr->data, Mgender(magr)));
 *     } else
 *         pline("Yuck!");
 *
 * mhitm_adtyping_u had NO AD_SLIM case at all, so a green slime's touch on
 * the hero fell into the `default:` arm: no rn2(10), no message, no
 * make_slimed call — the hero could never start sliming from a monster hit.
 * MEASURED, 12 of this packet's 21 rng-tape residuals: e.g.
 * probe-reach-melee record #87 draws rn2(10)=4 @mhitm_mgc_atk_negated
 * (uhitm.c:87); this port drew nothing and left the value stranded on the
 * recorded tape.
 *
 * `pd` is game.youmonst.data (the hero's current form), same as
 * mhitm_ad_deth_u above; flaming/noncorporeal are read by mndx via this
 * file's own flaming_gu/noncorporeal_mu helpers, and the PM_GREEN_SLIME
 * check compares mndx directly (a hero already polymorphed into a green
 * slime has no permonst POINTER to compare against — the pointer compare is
 * an mndx compare here). delayed_killer's killer-name argument uses
 * monPmname_mu, this file's real (non-stub) pmname substitute — the same one
 * mhitm_ad_drst_u uses for poisoned()'s killer name just above — rather than
 * this file's file-local pmname()/Mgender() stubs at :502-503. */
async function mhitm_ad_slim_u(mtmp, mattk, mhm) {
    const negated = mhitm_mgc_atk_negated_u(false);
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

/* C ref: uhitm.c:4265-4290 mhitm_ad_were, the `mdef == &gy.youmonst` (mhitu)
 * arm — a were-creature's bite that can confer lycanthropy:
 *
 *   hitmsg(magr, mattk);
 *   if (!rn2(4) && u.ulycn == NON_PM
 *       && !Protection_from_shape_changers && !defends(AD_WERE, uwep)
 *       && !mhitm_mgc_atk_negated(magr, mdef, TRUE)) {
 *       urgent_pline("You feel feverish.");
 *       exercise(A_CON, FALSE);
 *       set_ulycn(monsndx(pa));
 *       retouch_equipment(2);
 *   }
 *
 * mhitm_adtyping_u had NO AD_WERE case at all, so a wererat/werejackal/wereboar
 * bite in ANIMAL form (ATTK(AT_BITE, AD_WERE, ...) — the human form of the same
 * monster bites with plain AD_PHYS and is unaffected) fell into `default:`: no
 * message, no rn2(4), no damage change (mhm.damage is left untouched here on
 * every C arm, so the `default:` zeroing this file's OTHER cases share was
 * ALSO wrong for this one specifically).  MEASURED: a rat-form wererat
 * (PM_WERERAT, mndx 91) biting the hero draws rn2(4) unconditionally at this
 * point; this port drew nothing and the next value it read off the tape
 * (whatever mhitm_knockback expected) came out as an impossible rn2(3)==5.
 *
 * `rn2(4)` is the LEFT operand of the whole `&&` chain, so it draws every time
 * this arm is reached, win or lose; `mhitm_mgc_atk_negated`'s rn2(10) is the
 * RIGHT operand and only draws when every state test left of it (u.ulycn,
 * Protection_from_shape_changers, defends) already passed — ported with the
 * same short-circuit order C uses, via the JS `&&` chain below.
 *
 * SCOPE: the state TESTS (u.ulycn, Protection_from_shape_changers, defends)
 * are readable from this port's own uprops/uwep, so the gate is faithful all
 * the way to mhitm_mgc_atk_negated_u's draw.  The BODY when the gate passes —
 * set_ulycn() (js/potion.js:1321, a throw-stub: "not yet ported") and
 * retouch_equipment() (no js/ definition anywhere) — is named as a GAP rather
 * than invented, same shape as mhitm_ad_ston_u's do_stone_u gap above: calling
 * a throw-stub here would turn a silent divergence into a halt, which is
 * strictly worse. exercise(A_CON, FALSE) is RNG-free and skipped with it,
 * since applying it without the lycanthropy state it is paired with would be
 * inventing a partial effect C never produces alone. */
function mhitm_ad_were_u(mtmp, mattk, mhm) {
    hitmsg_je(mtmp, mattk);
    const u = game.u || (game.u = {});
    if (!rn2(4) && ((u.ulycn ?? NON_PM_MU) | 0) === NON_PM_MU
        && !_ac_prot_from_shape_changers_u()
        && !_defends_u(AD_WERE_MU, u.uwep)
        && !mhitm_mgc_atk_negated_u(true)) {
        /* C uhitm.c:4280-4285: the bite changes the hero's lycanthropy
         * species immediately.  mtmp.mnum is monsndx(mtmp->data), the same
         * numeric identity used by set_ulycn(). */
        pline('You feel feverish.');
        exercise(A_CON, false);
        set_ulycn_real((mtmp.mnum ?? mtmp.mndx ?? NON_PM_MU) | 0);
        /* C retouch_equipment(2) can damage or remove worn gear.  There is no
         * canonical JS implementation yet; retain the state transition and
         * its RNG order rather than invoking a throwing placeholder. */
    }
}
const AD_WERE_MU = 29;   /* monattk.h:71 */
/* C ref: youprop.h Protection_from_shape_changers.  Same uprops-slot read as
 * js/uhitm.js's own (unexported) _ac_prot_from_shape_changers() and
 * js/were.js's Protection_from_shape_changers(): no corpus hero has the
 * property, so this reads the real state honestly rather than hardcoding
 * FALSE. */
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

/* C ref: uhitm.c:4202-4256 mhitm_ad_ston, the `mdef == &gy.youmonst` arm — a
 * cockatrice (or chickatrice / Medusa) BITE, not the gaze the AD_STON case at
 * :422 above handles.  C:
 *
 *     hitmsg(magr, mattk);
 *     if (!rn2(3)) {
 *         if (magr->mcan)  You_hear("a cough from %s!", mon_nam(magr));
 *         else {           ...hissing/grimace message...
 *                          if (!rn2(10) || flags.moonphase == NEW_MOON)
 *                              if (do_stone_u(magr)) { ...done... }
 *         }
 *     }
 *
 * mhitm_adtyping_u had no AD_STON case, so the bite landed in the `default`
 * arm: no message, no damage, AND NO DRAW.  The rn2(3) is real and unconditional
 * on this path — seed4500-knight-coverage leaf 101378, step 1562.
 *
 * SCOPE: the `!rn2(3)` body is ported down to the second gate; do_stone_u()
 * (the petrification chain: munstone/instapetrify/delayed killer) is NOT
 * reachable from this file and is named as a GAP rather than invented.  The
 * corpus never reaches it — leaf 101378 rolls rn2(3)=2, so the whole body is
 * skipped — and reaching it needs BOTH !rn2(3) and (!rn2(10) || new moon).
 * Deaf/Hallucination are read the same way the rest of this file reads them. */
async function mhitm_ad_ston_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    if (!rn2(3)) {
        if (mtmp.mcan) {
            pline(`You hear a cough from ${uhitm_mon_nam(mtmp)}!`);
        } else {
            pline(`You hear ${s_suffix_mu(uhitm_mon_nam(mtmp))} hissing!`);
            /* C:4245-4251
             *     if (!rn2(10) || flags.moonphase == NEW_MOON) {
             *         if (do_stone_u(magr)) { hitflags = M_ATTK_HIT;
             *                                 done = TRUE; return; }
             *     }
             * The rn2(10) is the LEFT operand of a `||`, so C draws it EVERY
             * time it reaches this branch, whatever the moon is doing.  It used
             * to be skipped here on the argument that drawing without the body
             * would be an error of the same class; that argument is wrong in
             * this specific case, because do_stone_u() is RNG-FREE on every arm
             * the corpus can reach (Stoned / Stone_resistance are property
             * reads and make_stoned only sets a timer plus the delayed killer).
             * Omitting the draw therefore cost a leaf on 100% of cockatrice
             * hisses to buy nothing on the 10% branch.
             * MEASURED on corpus-generated/v5/train/gen172-reseed-seed776356:
             * C's first divergent leaf is exactly
             *   rn2(10)=5 @ mhitm_ad_ston(uhitm.c:4245)
             * (5, so the branch is NOT taken) while this port had already moved
             * on to mhitm_knockback's rn2(3).
             * STILL A GAP, unchanged by this: do_stone_u's BODY.  When the
             * branch IS taken C petrifies the hero and returns with
             * mhm->done = TRUE, which makes hitmu return at mhitu.c:1196 and
             * SKIP mhitm_knockback's rn2(3)+rn2(chance).  This port runs them.
             * That divergence existed before this line and is not made worse by
             * it; porting do_stone_u (js/potion.js:2741 make_stoned is the real
             * body) is the next step. */
            /* C's `!rn2(10) || flags.moonphase == NEW_MOON` always spends
             * the rn2(10) draw, even during a new moon; the moon only changes
             * whether the already-consumed roll gates petrification. */
            const _ston = !rn2(10) || ((game.flags?.moonphase | 0) === NEW_MOON);
            if (_ston && await do_stone_u(mtmp)) {
                mhm.hitflags = M_ATTK_HIT;
                mhm.done = true;
            }
        }
    }
    void mhm;
}

/* C ref: uhitm.c:2977-2985 mhitm_ad_blnd, the `mdef == &gy.youmonst` arm:
 *
 *   if (can_blnd(magr, mdef, mattk->aatyp, (struct obj *) 0)) {
 *       if (!Blind)
 *           pline("%s blinds you!", Monnam(magr));
 *       make_blinded(BlindedTimeout + (long) mhm->damage, FALSE);
 *       if (!Blind)                 // => Eyes of the Overworld
 *           Your1(vision_clears);
 *   }
 *   mhm->damage = 0;
 *
 * mhitm_adtyping_u had no AD_BLND case at all, so a raven's AT_CLAW/AD_BLND
 * landed in the default arm: no message, no blindness, damage zeroed.
 * seed4500 step 994 is the case — C's topline reads
 *   "The raven misses!  The raven blinds you!  It bites!"
 * and this port printed
 *   "The raven misses!  The raven bites!"
 * The third clause is the tell: C names the SECOND raven "It" because the
 * hero is now blind, so the omission costs both the missing line and every
 * later monster name, and it opens the session's longest wrong-frame run.
 *
 * can_blnd (mondata.c:340) is RNG-FREE on every arm, so this adds no draw.
 * It is js/mhitm.js's shared copy; its AT_CLAW arm (case 1) is correct — the
 * stale 3.7 case labels js/mhitu.js:2566 warns about are AT_EXPL/AT_BOOM/
 * AT_GAZE/AT_BREA/AT_SPIT/AT_ENGL, none of which a claw reaches.
 *
 * make_blinded is imported from js/zap.js — the REAL body (it probes, sets
 * HBlinded and calls toggle_blindness).  This file's own `export function
 * make_blinded(_dur, _vis) {}` at js/mhitu.js:222 is an empty stub that
 * SHADOWS it for every caller inside this module.  Deliberately NOT re-pointed
 * wholesale here: the other in-module caller is gazemu (js/mhitu.js:486), and
 * flipping a silent stub to a real body across a whole module has cost this
 * project 2059 points once already.  This one call site is wired, measured,
 * and left as the precedent for doing the rest one site at a time. */
function mhitm_ad_blnd_u(mtmp, mattk, mhm) {
    const gs = game;
    /* C's mdef is &gy.youmonst; js/mhitm.js can_blnd reads mdef.m_id === 0 as
     * "is_you" and mdef.data for haseyes(). */
    if (can_blnd_mu(mtmp, gs.youmonst || {}, mattk.aatyp | 0, null)) {
        if (!Blind(gs))
            pline(je_Monnam(mtmp) + ' blinds you!');
        /* C youprop.h BlindedTimeout == (Blinded & TIMEOUT). */
        const blindedTimeout = ((gs.u?.uprops?.[BLINDED]?.intrinsic) | 0) & TIMEOUT;
        make_blinded_real(blindedTimeout + (mhm.damage | 0), false);
        if (!Blind(gs)) /* => Eyes of the Overworld */
            Your1('vision quickly clears.');
    }
    mhm.damage = 0;
}
const AD_BLND_U = 11;   /* monattk.h:53 */

/* C ref: uhitm.c:3306-3332 mhitm_ad_stck, the `mdef == &gy.youmonst` (mhitu)
 * arm:
 *
 *   boolean negated = mhitm_mgc_atk_negated(magr, mdef, FALSE);   <- rn2(10)
 *   struct permonst *pd = mdef->data;          <- the HERO's current form
 *   boolean barbs = (magr->data == &mons[PM_BARBED_DEVIL]);
 *   ...
 *   hitmsg(magr, mattk);
 *   if (!negated && !u.ustuck && !sticks(pd)) {
 *       set_ustuck(magr);
 *       if (barbs)
 *           pline("The barbs stick to you!");
 *   }
 *
 * Note the ORDER: the rn2(10) fires BEFORE hitmsg, so the draw precedes the
 * topline it pays for.  Note also that this arm does NOT zero mhm->damage --
 * only the monster-vs-monster arm does -- so a mimic's AT_CLAW/AD_STCK 3d4
 * still hurts; the old `default` arm zeroed it.
 *
 * mhitm_adtyping_u() had no AD_STCK case at all, so every sticky touch on the
 * hero landed in `default`: no rn2(10), no message, no damage, no set_ustuck.
 * Measured on the UNSEEN corpus session gen000-reseed-seed5472 (a reseed of
 * seed0367-priest-quest-tour) step 138: a lichen (ATTK(AT_TUCH, AD_STCK, 0, 0))
 * touches the hero, C draws `rn2(10)=9 @ mhitm_mgc_atk_negated(uhitm.c:87)` at
 * leaf 2840 and this port drew nothing -- that leaf is the session's FIRST RNG
 * divergence.  It is the first SCREEN miss too, and for the same reason: the
 * suppressed hitmsg is the third message of step 138's topline, so C pages
 * ("...The kitten misses the lichen.--More--") where we did not.
 *
 * PM_BARBED_DEVIL is read through the same `(mtmp.mndx ?? mtmp.mnum)` accessor
 * the neighbouring arms use.  set_ustuck() is js/mklev.js's (mon.c:3421); its
 * `disp.botl = TRUE` is not modelled there, which is a pre-existing gap in that
 * function rather than one this arm introduces. */
function mhitm_ad_stck_u(mtmp, mattk, mhm) {
    const negated = mhitm_mgc_atk_negated_u(false);
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
/* C ref: uhitm.c:3337-3403 mhitm_ad_wrap, the `mdef == &gy.youmonst` (mhitu)
 * arm — a snake/naga/eel-class monster's grab-and-hold attack:
 *
 *   struct permonst *pd = mdef->data, *pa = magr->data;
 *   boolean coil = slithy(pa) && (pa->mlet == S_SNAKE || pa->mlet == S_NAGA);
 *   if ((!magr->mcan || u.ustuck == magr) && !sticks(pd)) {
 *       if (!u.ustuck && !rn2(10)) {                         <- the draw
 *           if (u_slip_free(magr, mattk)) {
 *               mhm->damage = 0;
 *           } else {
 *               set_ustuck(magr); / * before message, for botl update * /
 *               urgent_pline("%s %s itself around you!", Some_Monnam(magr),
 *                            coil ? "coils" : "swings");
 *           }
 *       } else if (u.ustuck == magr) {
 *           if (is_pool(magr->mx, magr->my) && !Swimming && !Amphibious
 *               && !Breathless) {
 *               ... urgent_pline("%s drowns you...", ...); done(DROWNING);
 *           } else if (mattk->aatyp == AT_HUGS) {
 *               You("are being crushed.");
 *           }
 *       } else {
 *           mhm->damage = 0;
 *           if (flags.verbose) {
 *               if (coil) pline_mon(magr, "%s brushes against you.", Monnam(magr));
 *               else pline_mon(magr, "%s brushes against your %s.",
 *                              Monnam(magr), body_part(LEG));
 *           }
 *       }
 *   } else
 *       mhm->damage = 0;
 *
 * mhitm_adtyping_u() had NO AD_WRAP case at all, so every eel/snake/naga grab
 * on the hero landed in `default`: no rn2(10), no damage, no set_ustuck, and
 * the hero could never be seized.  MEASURED on the gen043 corpus, a giant eel
 * (S_EEL, ATTK(AT_TUCH, AD_WRAP,0,0)) biting-then-wrapping the hero: C draws
 * `rn2(10) @ mhitm_ad_wrap(uhitm.c:3345)` at the point this port drew nothing,
 * leaving that value stranded on the recorded tape (rng_result_tape_residual)
 * on three otherwise-identical mattacku captures.
 *
 * SCOPE: the `!u.ustuck` first-grab branch (the one the corpus's rn2(10)
 * belongs to) is ported down to `u_slip_free`, itself already a full C-faithful
 * port at this file's :5984 (its own rn2(3) for cursed greased armor).  The
 * `u.ustuck == magr` (ALREADY grabbed, checking for drowning) sub-branch is
 * named as a GAP rather than invented: Swimming/Amphibious/Breathless have no
 * js/ reader anywhere in this codebase (SWIMMING's uprop index exists at
 * const.js:2378 but nothing reads it; AMPHIBIOUS/BREATHLESS have no js/
 * constant at all), so faithfully gating the drown-vs-crush split would mean
 * inventing state this port has never written. It is RNG-free on every arm —
 * mhitm_ad_wrap's ONLY draw is the `!u.ustuck` one already ported above — so
 * leaving it unported costs no RNG divergence, only the drown/crush message
 * and (rarely) a death this session's corpus never exercises: none of the
 * gen001/gen043 mattacku captures have u.ustuck already pointed at the
 * attacking monster on entry. Same shape as mhitm_ad_ston_u's do_stone_u gap
 * above. The AT_HUGS "You are being crushed." arm needs the same u.ustuck ==
 * magr precondition and is included in the same named gap. */
function mhitm_ad_wrap_u(mtmp, mattk, mhm) {
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
            /* GAP: is_pool/Swimming/Amphibious/Breathless drowning check and
             * the AT_HUGS crush message -- see header. RNG-free either way,
             * and unreached by this session's corpus. */
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
const M1_SLITHY_MU = 0x00080000, S_SNAKE_MU = 45, S_NAGA_MU = 40;
/* C ref: mhitm.c:594-634 failed_grab(magr, mdef, mattk) — "can't hold an
 * unsolid target ... or a long worm tail":
 *     if ((unsolid(mdef->data) || gn.notonhead)
 *         && (mattk->aatyp == AT_HUGS || mattk->adtyp == AD_WRAP
 *             || mattk->adtyp == AD_STCK || mattk->adtyp == AD_DGST)) { ... }
 * mdef is always the hero at every call site in this file, so C's
 * `(gv.vis && canspotmon(mdef)) || magr == &gy.youmonst || mdef == &gy.
 * youmonst` message gate reduces to always-true (mdef == &gy.youmonst holds
 * unconditionally) and is not modelled separately.  RNG-free.
 *
 * Takes `mattk` and applies the type gate explicitly: this now has TWO
 * callers — mattacku's AT_HUGS_ case (mattk.aatyp is always AT_HUGS_, so the
 * gate is trivially true there) and its AT_CLAW_/AT_KICK_/.../AT_TENT_ "hand
 * to hand" case (mhitu.c:806-808), where the gate is NOT trivial: a plain
 * AT_CLAW/AT_BITE hit against an unsolid-form hero must NOT be treated as a
 * failed grab, only AT_TENT/AD_WRAP (eel) and AT_TUCH/AD_STCK (mimic/lichen
 * adhere) are.  mhitu.c:806's own outer `unsolid(gy.youmonst.data) &&` gate
 * is redundant with the OR below given `notonhead` cannot be true for a hero
 * defender (see next paragraph), so it is not modelled as a separate
 * pre-check.
 *
 * `gn.notonhead` (a worm-tail miss) is ported for structural fidelity even
 * though C's own comment says it cannot fire for a hero defender ("hero
 * poly'd into long worm can't grow tail so no youmonst handling is needed
 * here"). */
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
        pline(`${magrnam} grab attempt `
            + `${!notonhead ? 'passes right through' : 'fails to hold'} `
            + `${mdefnam}!`);
        return true;
    }
    return false;
}
/* C ref: uhitm.c:3122 mhitm_ad_drst, the `mdef == &gy.youmonst` (mhitu) arm:
 *
 *   negated = mhitm_mgc_atk_negated(magr, mdef, FALSE);   <- rn2(10)
 *   ptmp = A_STR / A_DEX / A_CON by adtyp;
 *   hitmsg(magr, mattk);
 *   if (!negated && !rn2(8))
 *       poisoned(buf, ptmp, pmname(pa, Mgender(magr)), 30, FALSE);
 *
 * Note the ORDER: the rn2(10) fires before hitmsg, and the rn2(8) after it.
 * The old default arm of mhitm_adtyping_u() drew neither and zeroed the
 * damage, so a poisonous bite on the hero was silent, harmless, and two draws
 * short.  Measured on seed4500-knight-coverage step 266: PM_COBRA bites,
 * C draws rn2(10)=6 then rn2(8)=2 and prints "The cobra bites!"; we printed
 * nothing, applied 0 damage, and the next PRNG leaf we emitted was already
 * mhitm_knockback's.  (Both the topline and the STATUS HP row were wrong,
 * which is exactly what render-root-differ classified it as.)
 *
 * poisoned() (attrib.c:213) is a documented GAP: js/uhitm.js's copy is a
 * no-op stub and the real one draws rn2(fatal) plus d(4,6) on the instakill
 * arm.  It is reached only when rn2(8) rolls 0, so it is not on the measured
 * path here; when it does fire it will surface as its own first-divergence at
 * this call site rather than silently mis-scoring. */
async function mhitm_ad_drst_u(mtmp, mattk, mhm) {
    const negated = mhitm_mgc_atk_negated_u(false);
    let ptmp = A_STR_AD;
    switch (mattk.adtyp) {
        case AD_DRST_: ptmp = A_STR_AD; break;
        case AD_DRDX_: ptmp = A_DEX_AD; break;
        case AD_DRCO_: ptmp = A_CON_AD; break;
    }
    hitmsg_je(mtmp, mattk);
    /* C uhitm.c:3143-3157 (the mhitu arm) is `hitmsg(); if (!negated &&
     * !rn2(8)) poisoned(...);` and never writes mhm->hitflags — same absence
     * as mhitm_ad_drli's mhitu arm just above. The unconditional `mhm.hitflags
     * |= M_ATTK_HIT` that used to sit here was fabricated: it made hitmu's
     * downstream mhitm_knockback see a "hit" C's own hitflags (left at
     * M_ATTK_MISS by the caller) does not report. Measured: three
     * probe-golevel/gen003-objective-seed1113940 PM_GIANT_SPIDER poison-bite
     * records all record args_after mhm.hitflags=0; this port produced 1. */
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
/* C ref: attrib.c:316-408 poisoned(reason, typ, pkiller, fatal, thrown_weapon).
 *
 * Was a no-op with the note "GAP: draws rn2(fatal) and, on the instakill arm,
 * d(4,6)", on the grounds that it is reached only when mhitm_ad_drst's rn2(8)
 * rolls 0 and so is "not on the measured path".  It IS: seed0399-wizard-hallu-
 * actions leaf 11151 is that rn2(8)=0, and C's next two leaves are
 *     11152 rn2(30)=5 @ poisoned(attrib.c:362)
 *     11153 d(2,2)=3  @ poisoned(attrib.c:395)
 * while the scored run went straight on to mhitm_knockback.  That is the
 * session's first RNG divergence once the Lifesaved arm lands.
 *
 * RNG, in C's order:
 *   i = !fatal ? 1 : rn2(fatal + (thrown_weapon ? 20 : 0))    attrib.c:362
 *   i == 0 && typ != A_CHA : loss = 6 + d(4,6)                attrib.c:365
 *   i > 5                  : loss = thrown_weapon ? rnd(6) : rn1(10,6)
 *   else                   : loss = (thrown_weapon || !fatal) ? 1 : d(2,2)
 * adjattrib() can itself draw (rn2 when ABASE would fall below ATTRMIN) and
 * losestr() draws rn1(4,3) per point below the floor; both are the real
 * functions here, so those draws are C's too.
 *
 * Killer attribution, wet-towel mitigation and immediate death follow the
 * shared attrib.c contract, including its deliberate base-HP polymorph FIXME. */
const _POIS_A_CHA = 5, _POIS_A_CON = 4;
export async function poisoned_u(reason, typ, pkiller, fatal, thrown_weapon) {
    const u = game.u || (game.u = {});
    let kprefix = KILLED_BY_AN_MU;
    const blast = (reason === 'blast');

    /* C attrib.c:328-338 — tell the player, unless the message already did. */
    if (!blast && !String(reason).toLowerCase().includes('poison')) {
        const r = String(reason);
        const plural = r.charAt(r.length - 1) === 's';
        const lead = /[A-Z]/.test(r.charAt(0)) ? '' : 'The ';
        await pline(`${lead}${r} ${plural ? 'were' : 'was'} poisoned!`);
    }
    if (_Poison_resistance_mu()) {
        if (blast) shieldeff(u.ux, u.uy);
        await pline("The poison doesn't seem to affect you.");
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
            await pline('The poison was deadly...');
        } else {
            const olduhp = u.uhp | 0;
            const newuhpmax = (u.uhpmax | 0) - Math.trunc(loss / 2);
            setuhpmax_mu(Math.max(newuhpmax, minuhpmax_mu(3)), true);
            /* C attrib.c:1182-1194 adjuhploss(loss, olduhp). */
            if (!Upolyd_mu()) {
                if ((u.uhp | 0) < olduhp) loss -= olduhp - (u.uhp | 0);
            } else {
                if ((u.mh | 0) < olduhp) loss -= olduhp - (u.mh | 0);
            }
            loss = Math.max(loss, 1);
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
        deadhero(pk.toLowerCase().includes('poison') ? DIED : POISONING,
            { alreadySaidYouDie: true, noDeathLine: true });
        await do_death_sequence({ inPlace: true });
    }
    await encumber_msg_mu();
}

/* C ref: mhitu.c:1140 hitmu — monster's attack hit the hero.
 * Returns MM_/M_ATTK_ flags.  Scoped to AD_PHYS/AD_ELEC hand-to-hand. */
async function hitmu_je(mtmp, mattk) {
    const u = game.u || (game.u = {});
    /* C ref: mhitu.c:1155-1156 — the FIRST thing hitmu does:
     *     if (!canspotmon(mtmp))
     *         map_invisible(mtmp->mx, mtmp->my);
     * "If the monster is undetected & hits you, you should know where the
     * attack came from" — the square is remembered as GLYPH_INVISIBLE ('I')
     * and keeps showing 'I' until unmap_object()+newsym() clear it.
     * This was missing, which was invisible for as long as nothing in js/ could
     * make canspotmon() false for an adjacent lit-room monster.  A hero wearing
     * a blindfold can (js/do_wear.js Blindf_on now confers EBlinded), and
     * seed5006 step 121 is the case: C paints 'I' on the sewer rat's square,
     * the port left the remembered floor glyph.  RNG-free. */
    if (!canspotmon_disp(mtmp))
        map_invisible(mtmp.mx | 0, mtmp.my | 0);
    /* C ref: mhitu.c:1161-1184 — "If the monster is undetected & hits you, you
     * should know where the attack came from."  A hider (M1_CONCEAL, or an
     * S_EEL lurking in water) that swings STOPS being undetected, and unless
     * the hero can sense it another way C announces what it was hiding under
     * and repaints the square:
     *     if (mtmp->mundetected && (hides_under(mdat) || mdat->mlet == S_EEL)) {
     *         mtmp->mundetected = 0;
     *         if (!tp_sensemon(mtmp) && !Detect_monsters) {
     *             if ((obj = svl.level.objects[mtmp->mx][mtmp->my]) != 0) {
     *                 ... pline("%s was hidden under %s!", Amonbuf, what);
     *             }
     *             newsym(mtmp->mx, mtmp->my);
     *         }
     *     }
     * RNG-free, but NOT screen-free, and the screen effect is a page boundary:
     * seed4500-knight-coverage step 1629, C pages "You hear someone counting
     * gold coins.--More--" on its own and puts "Something was hidden under
     * something!  It bites!" on the NEXT page.  Without this pline the two
     * messages joined into one 51-column topline that never split, so every
     * frame from 1629 on was one page ahead of C's. */
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
    /* (undead/vampshifter midnight extra damage path deferred — not in corpus) */
    await mhitm_adtyping_u(mtmp, mattk, mhm);
    /* C mhitu.c:1191 mhitm_knockback. */
    mhitm_knockback_u(mtmp, mattk);
    if (mhm.done)
        return mhm.hitflags;
    /* C mhitu.c:1206 — negative AC reduces damage: rnd(-uac). */
    if (mhm.damage && (u.uac | 0) < 0) {
        mhm.damage -= rnd(-(u.uac | 0));
        if (mhm.damage < 1) mhm.damage = 1;
    }
    /* C mhitu.c:1212 — Half_physical_damage / mitre path deferred (no RNG). */
    if (mhm.damage > 0) {
        const _deathBeforeDamage = game._pendingDeath || null;
        /* awaited because mdamageu()'s Upolyd arm is rehumanize(), which is async. */
        await mdamageu(mtmp, mhm.damage);
        /* C mhitu.c:1909 mdamageu -> done_in_by -> done(), and in wizard/explore
         * mode (or when lifesaved) done() opens its blocking prompt RIGHT HERE
         * and RETURNS, so passiveum and the attacker's REMAINING attacks happen
         * AFTER it.  This port drained the deferred interaction only at the
         * movemon boundary (js/fastforward.js ff_movemon_one_pass), which puts
         * every one of those messages BEFORE the prompt instead of after.
         * MEASURED on seed4500-knight-coverage step 1005: C pages
         *   "You hit it.  It bites!  It bites!  It misses!  It bites!--More--"
         *   | "You die...--More--" | "Die? [yn] (n)"
         *   | "OK, so you don't die.  It misses!--More--"
         * -- the fifth attack's "It misses!" lands after "OK, so you don't
         * die.", and this port had it on the page before.  RNG-FREE. */
        if (game._pendingDeath && game._pendingDeath !== _deathBeforeDamage)
            await drain_pending_death_in_place();
    }
    /* C mhitu.c:1259-1262 —
     *     if (mhm.damage) res = passiveum(olduasmon, mtmp, mattk);
     *     else            res = M_ATTK_HIT;
     * This used to be a comment saying passiveum "consumes no RNG ... deferred
     * otherwise", which is true only of a hero with no passive attack.  A
     * POLYMORPHED hero has one, and it draws: seed4500-knight-coverage step
     * 1560, hero as a brown mold (ATTK(AT_NONE, AD_COLD, 0, 6)), C draws
     * d(2,6) then rn2(3) then rn2(2) at leaves 101373-101375 and prints "It is
     * suddenly very cold!" -- and the hero GAINS hp from it, which is why C's
     * status reads HP:7(7) where this port read 3(6). */
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

/* C mhitu.c:466-476 mtrapped_in_pit(struct monst *mtmp) — the ATTACKER-side
 * arm only (the `mtmp == &gy.youmonst` arm is dead here: mattacku's mtmp is
 * always the attacking monster, never the hero):
 *     ttmp = mtmp->mtrapped ? t_at(mtmp->mx, mtmp->my) : 0;
 *     return (ttmp && is_pit(ttmp->ttyp));
 * RNG-free. */
function _mtrapped_in_pit_attacker_mu(mtmp) {
    if (!(mtmp.mtrapped | 0))
        return false;
    const ttmp = t_at_mu(mtmp.mx | 0, mtmp.my | 0);
    return !!(ttmp && is_pit_mu(ttmp.ttyp));
}

/* C mhitu.c:2482-2492 assess_dmg(mtmp, tmp) —
 *     if ((mtmp->mhp -= tmp) <= 0) {
 *         pline_mon(mtmp, "%s dies!", Monnam(mtmp));
 *         xkilled(mtmp, XKILL_NOMSG);
 *         ...
 *     }
 *     return M_ATTK_HIT;
 * assess_dmg() ITSELF is RNG-free, but xkilled() is not, and this is the whole
 * point of the 2026-08-20 repair: the death tail used to be substituted with
 * js/mklev.js mondead(), on the grounds that "the corpus passive never kills".
 * It does.  seed4500-knight-coverage step 1624 is a hero polymorphed into a
 * brown mold whose AD_COLD passive kills the monster that bit it, and C runs
 * the FULL xkilled() there: rn2(6) @mon.c:3587 (the "illogical but traditional
 * treasure drop"), the mkobj(RANDOM_CLASS) chain it gates
 * (rnd(100)@mkobj.c:280, rnd(1000)@:289, rnd(2)@next_ident, rn2(5)@mksobj_init,
 * rn2(17)@blessorcurse) and rn2(2) @corpse_chance(mon.c:3248).  mondead() draws
 * none of those six leaves, so JS ran on to the NEXT monster's
 * decide_to_shapeshift() while C was still creating the death drop — the
 * session's first RNG divergence, at leaf 101687, and the head of its 190-frame
 * miss run.  (The old comment's "the corpus passive never kills" is exactly the
 * comment-asserting-absence shape CLAUDE.md warns about; the very next comment
 * in the same function described the kill it claimed did not happen.)
 *
 * This is now C's own call, so the corpse, the treasure drop, the carried-gear
 * relobj(), the experience and the alignment adjustment all come from one
 * place.  Being async is what made it unavailable before; hitmu_je/passiveum
 * are async now and mattacku awaits them. */
async function assess_dmg_um(mtmp, tmp) {
    mtmp.mhp = (mtmp.mhp | 0) - (tmp | 0);
    if ((mtmp.mhp | 0) <= 0) {
        pline(`${je_Monnam(mtmp)} dies!`);
        /* C:2359 xkilled(mtmp, XKILL_NOMSG).  XKILL_NOMSG suppresses xkilled's
         * own "You kill %s!" — the "%s dies!" line above is assess_dmg's, and C
         * prints it first, exactly as here.  xkilled() also carries the
         * remembered-'I' retirement (glyph_is_invisible -> unmap_object) and the
         * m_detach unlink + newsym that mondead() was standing in for, so
         * nothing that substitution provided is lost.
         * The RETURN VALUE is not a gap and is load-bearing: C:2486-2489 is
         *     if (!DEADMONSTER(mtmp)) return M_ATTK_HIT;
         *     return M_ATTK_AGR_DIED;
         * and DEADMONSTER is mhp <= 0 — true after the subtraction above unless
         * xkilled()'s lifesaving arm put the monster back on its feet, which is
         * why C re-tests it AFTER the call rather than before.
         * mattacku's loop reads it (`if (sum[i] & M_ATTK_AGR_DIED) return 1;`)
         * and stops attacking.  Returning M_ATTK_HIT instead let a monster the
         * hero's passive had just killed keep hitting: seed4500-knight-coverage
         * step 1624, C "It is suddenly very cold!  It dies!" against this port's
         * "... It dies!  It touches you!". */
        await xkilled_uh(mtmp, XKILL_NOMSG_UH);
        if ((mtmp.mhp | 0) > 0)   /* C:2360 !DEADMONSTER(mtmp) */
            return M_ATTK_HIT;
        return M_ATTK_AGR_DIED;
    }
    return M_ATTK_HIT;
}

/* C mondata.h resists_cold(mon) — the monster's own MR_COLD bit plus anything
 * its gear confers.  Same expression js/mhitm.js:1774-1777 uses. */
const MR_COLD_UM = 0x02;   /* monflag.h:63 */
function _resists_cold_um(mtmp) {
    const bits = (((mtmp && mtmp.data) ? (mtmp.data.mresists | 0) : 0)
                  | ((mtmp && mtmp.mextrinsics) | 0)
                  | ((mtmp && mtmp.mintrinsics) | 0));
    return (bits & MR_COLD_UM) !== 0;
}

/* C ref: mhitu.c:2434-2612 passiveum(olduasmon, mtmp, mattk) — the hero's
 * PASSIVE counterattack against a monster that just hit for damage.
 *
 * The attack used is the FIRST slot of the OLD form whose aatyp is AT_NONE or
 * AT_BOOM (C walks the fixed NATTK array; this port's MON_MATTK row drops the
 * trailing NO_ATTKs, so an out-of-row index reads as the implicit
 * {AT_NONE, AD_PHYS, 0, 0} exactly as C's zeroed slot does).
 *
 * RNG, in C's order:
 *   :2458  tmp = damn ? d(damn, damd) : damd ? d(mlevel + 1, damd) : 0
 *   :2523  if (rn2(3))            -- gates the "still a monster" switch
 *   :2570  u.mh += (tmp + rn2(2)) / 2   -- the AD_COLD arm
 *
 * SCOPE.  AD_ACID is now ported (see below); AD_STON and AD_ENCH remain GAPS
 * -- they need mon_to_stone / drain_item, neither reachable from this file,
 * and unlike AD_ACID no capture has yet been measured reaching them.  Given
 * how wrong "none of which a corpus hero's form has" turned out to be for
 * AD_ACID (MEASURED on probe-reach-melee/gen044-objective-seed77143 step
 * 309 -- a hero polymorphed into an acid-attack form, e.g. an acid blob,
 * countering a hit with `d(3,6)=6 @ passiveum(mhitu.c:2456)`,
 * `rn2(2)=1 @ :2465`, `rn2(30)=3 @ :2477`, `rn2(6)=1 @ :2479`, none of
 * which this port drew), do not trust that claim for STON/ENCH either --
 * it is simply unverified, not confirmed absent.  The post-Upolyd arms
 * other than AD_COLD (AD_PHYS/AT_BOOM, AD_PLYS, AD_STUN, AD_FIRE, AD_ELEC)
 * are RNG-free message/flag arms and are ported. */
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
    if (oldu_mattk.adtyp === AD_STON_UM || oldu_mattk.adtyp === AD_ENCH_UM)
        return M_ATTK_HIT;

    /* C:2520-2521 */
    if (!Upolyd_fn(u))
        return M_ATTK_HIT;

    /* C:2523 — "These affect the enemy only if you are still a monster". */
    if (rn2(3)) {
        switch (oldu_mattk.adtyp) {
        case AD_PHYS_UM:
            /* C:2525-2532 — AT_BOOM explodes and rehumanizes.  rehumanize() is
             * not reachable from this file; no corpus form is AT_BOOM. */
            break;
        case AD_PLYS_UM: {
            /* C:2533-2560 — floating eye / gelatinous cube paralysis:
             *     if (tmp > 127) tmp = 127;
             *     if (u.umonnum == PM_FLOATING_EYE) {
             *         if (!rn2(4)) tmp = 127;
             *         if (mtmp->mcansee && haseyes(mtmp->data) && rn2(3)
             *             && (perceives(mtmp->data) || !Invis)) {
             *             if (Blind) {
             *                 pline("As a blind %s, you cannot defend
             *                        yourself.", pmname(...));
             *             } else {
             *                 if (mon_reflects(mtmp, "..."))
             *                     return 1;
             *                 pline_mon(mtmp, "%s is frozen by your gaze!", ...);
             *                 paralyze_monst(mtmp, tmp);
             *                 return M_ATTK_AGR_DONE;
             *             }
             *         }
             *     } else { / * gelatinous cube * /
             *         pline_mon(mtmp, "%s is frozen by you.", Monnam(mtmp));
             *         paralyze_monst(mtmp, tmp);
             *         return M_ATTK_AGR_DONE;
             *     }
             *     return M_ATTK_HIT;
             * Was GAP'd as unreachable ("no corpus form is either"); MEASURED
             * false on probe-reach-itemuse/gen040-objective-seed1407837 step
             * 2668 (record #172): a floating-eye-form hero counterattacks and
             * C draws rn2(4)@:2537, rn2(3)@:2539 where this port drew neither. */
            if (tmp > 127) tmp = 127;
            if ((u.umonnum | 0) === PM_FLOATING_EYE_MU) {
                if (!rn2(4)) tmp = 127;
                if ((mtmp.mcansee | 0) && haseyes_pu(mtmp.data) && rn2(3)
                    && (perceives_mu(mtmp.data) || !_Invis_mu())) {
                    if (Blind(game)) {
                        pline(`As a blind ${pmname(null, game.flags?.female ? 1 : 0)}, you cannot defend yourself.`);
                    } else {
                        if (mon_reflects(mtmp, "Your gaze is reflected by %s %s."))
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
                pline(`${je_Monnam(mtmp)} is mildly chilly.`);
                /* GAP — C:2565 golemeffects(mtmp, AD_COLD, tmp). */
                tmp = 0;
                break;
            }
            pline(`${je_Monnam(mtmp)} is suddenly very cold!`);
            u.mh = (u.mh | 0) + (((tmp | 0) + rn2(2)) / 2 | 0);
            if ((u.mhmax | 0) < (u.mh | 0))
                u.mhmax = u.mh | 0;
            /* C:2573-2574 — an over-fed mold splits.  GAP: split_mon() is not
             * reachable from this file (js/mhitm.js:202 is an empty stub, and
             * js/potion.js's is file-local).  Named rather than faked; a mold
             * needs mhmax > (mlevel+1)*8 to reach it. */
            break;
        case AD_STUN_UM:   /* C:2576-2584 — yellow mold */
            if (!(mtmp.mstun | 0)) {
                mtmp.mstun = 1;
                pline(`${je_Monnam(mtmp)} staggers.`);
            }
            tmp = 0;
            break;
        case AD_FIRE_UM:   /* C:2585-2594 — red mold */
            pline(`${je_Monnam(mtmp)} is suddenly very hot!`);
            break;
        case AD_ELEC_UM:   /* C:2595-2604 */
            pline(`${je_Monnam(mtmp)} is jolted with your electricity!`);
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

/* C ref: mhitu.c:173-261 wildmiss(mtmp, mattk) — "monster attacked wrong
 * location due to monster blindness, hero invisibility, hero displacement, or
 * hero being underwater".  mattacku()'s two `else` arms (the !foundyou side of
 * the AT_CLAW/KICK/BITE/STNG/TUCH/BUTT/TENT case at mhitu.c:816 and of the
 * AT_WEAP case at :920) called it and then set skipnonmagc.
 *
 * This port had BOTH arms as an empty comment reading "wildmiss — deferred (no
 * RNG in the common case); skip", and that parenthetical is only half true:
 * the `unotseen` arm below draws rn2(3) to pick which of three taunts to
 * print.  What the omission cost on seed0360 is the OTHER arm: the hero wears
 * displacement, the quasit swings at the image, and C pages "The quasit strikes
 * at your displaced image and misses you!--More--" (steps 671-672) while this
 * port printed nothing at all — so every --More-- from there on was one page
 * out of step with C's, and the frozen map behind the page showed the hero two
 * squares further along the travel than C's did.
 *
 * set_msg_xy(mtmp->mx, mtmp->my) is message-origin bookkeeping for the
 * message-colour/`msgtype` machinery, which this port does not model (see
 * js/teleport.js:928 for the same call, likewise a no-op); it changes no
 * rendered text.
 *
 * RNG: exactly one rn2(3), and ONLY on the `unotseen && !compat` arm. */
function wildmiss(mtmp, mattk) {
    /* C:180-182 — the expected reasons for wildmiss(). */
    const unotseen = (!(mtmp.mcansee | 0)
                      || (_Invis_mu() && !perceives_mu(mtmp.data)));
    const unotthere = _Displaced_mu();
    const usubmerged = _Underwater_mu();

    /* C:184-191 — checked twice so the impossible can fire before the early
     * returns.  impossible_mu is this file's no-op (C's impossible writes a
     * paniclog line and a pline; neither is on the recorded channel). */
    if (!unotseen && !unotthere && !usubmerged) {
        impossible_mu(`${Some_Monnam_mu(mtmp)} attacks you without knowing your location?`);
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
            pline(`${Monst_name} tries to touch you and misses!`);
        } else {
            switch (rn2(3)) {
            case 0:
                pline(`${Monst_name} ${swings} wildly and misses!`);
                break;
            case 1:
                pline(`${Monst_name} attacks a spot beside you.`);
                break;
            case 2:
                pline(`${Monst_name} strikes at ${
                    is_waterwall_mu(mtmp.mux | 0, mtmp.muy | 0)
                        ? 'empty water' : 'thin air'}!`);
                break;
            default:
                pline(`${Monst_name} ${swings} wildly!`);
                break;
            }
        }
    } else if (unotthere) { /* C:236-249 Displaced */
        /* give 'displaced' message even if hero is Blind */
        if (compat)
            pline(`${Monst_name} smiles ${(compat === 2) ? 'engagingly' : 'seductively'
                  } at your ${Invis ? 'invisible ' : ''}displaced image...`);
        else
            /* Note:  if you're both invisible and displaced, only monsters
             * which see invisible will attack your displaced image, since the
             * displaced image is also invisible. */
            pline(`${Monst_name} strikes at your ${Invis ? 'invisible ' : ''
                  }displaced image and misses you!`);
    } else if (usubmerged) { /* C:250-258 Underwater */
        /* monsters may miss especially on water level where bubbles shake
           the player here and there */
        if (compat)
            pline(`${Monst_name} reaches towards your distorted image.`);
        else
            pline(`${Monst_name} is fooled by water reflections and misses!`);
    }
    /* C:259-260 else: NOTREACHED (the impossible above already returned). */
}

/* C ref: mhitu.c:85 missmu — monster missed the hero. */
async function missmu_je(mtmp, nearmiss, mattk) {
    void mattk;
    /* C ref: mhitu.c:88-89 — a miss clears the hitmsg "again" tracking so the
     * next hit does not spuriously say "again". */
    game._hitmsg_mid = 0;
    game._hitmsg_prev_ai = null;
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
    pline(`${Monst_name} ${nearmiss_verbose ? 'just ' : ''}misses!`);
    /* C mhitu.c:100 — stop_occupation() (RNG-neutral); emits "You stop studying."
     * into the combat stream when a miss interrupts the study. */
    await stop_occupation();
}

/* C objects.h VENOM() rows (mirrors js/mhitm.js:3514 and js/cmd.js:23206). */
const BLINDING_VENOM_MU = 479;
const ACID_VENOM_MU = 480;
const AD_DRST_MU = 7;    /* monattk.h:49 */
const AD_ACID_MU = 8;    /* monattk.h:50 */
const AD_BLND_MU = 11;   /* monattk.h:53 */
const BOLT_LIM_MU = 8;   /* hack.h:49 */

/* C ref: mthrowu.c:1016 spitmm(mtmp, mattk, mtarg) — the AT_SPIT attack.  Only
 * the hero-target call (spitmu) is wired; mtarg is carried so the signature
 * matches C and a monster-vs-monster caller can be added without reshaping it.
 *
 * The stream C draws on this path, and which we were drawing NONE of:
 *   mksobj(BLINDING_VENOM, TRUE, FALSE)  -> next_ident() rnd(2)  [mkobj.c:521]
 *   !rn2(BOLT_LIM - distmin(mx,my,tx,ty))                        [mthrowu.c:1050]
 * seed4500 step 272: the cobra is 3 squares off, so C rolls rn2(5), gets 1, and
 * takes the else arm — the venom is freed and nothing is thrown.  We drew
 * neither, which is where the run left C's stream.
 *
 * m_lined_up(&youmonst, mtmp) is js/makemon.js's exported lined_up(), and it is
 * what sets gt.tbx/gt.tby for the m_throw direction below.
 */
export async function spitmm(mtmp, mattk, mtarg) {
    /* C mthrowu.c:1020-1032 — a cancelled spitter just rattles.  RNG-free. */
    if (mtmp.mcan | 0) {
        if (!Deaf(game) && mdistu(mtmp) < BOLT_LIM_MU * BOLT_LIM_MU) {
            if (canspotmon_disp(mtmp))
                pline(`A dry rattle comes from ${s_suffix_mu(uhitm_mon_nam(mtmp))} throat.`);
            else
                pline('You hear a dry rattle nearby.');
        }
        return M_ATTK_MISS;
    }
    /* C mthrowu.c:1033 m_lined_up(mtarg, mtmp); for a hero target that is
     * lined_up(mtmp), which also publishes gt.tbx/gt.tby. */
    const utarg = (mtarg === null);
    if (utarg ? lined_up(mtmp) : false) {
        const tx = (mtmp.mux | 0), ty = (mtmp.muy | 0);

        /* C mthrowu.c:1038-1048 — the venom object.  AD_BLND/AD_DRST spit
         * blinding venom, everything else acid venom (C's default arm is an
         * impossible() that falls through to AD_ACID). */
        const adtyp = (mattk.adtyp | 0);
        const venom_otyp = (adtyp === AD_BLND_MU || adtyp === AD_DRST_MU)
            ? BLINDING_VENOM_MU
            : (void (adtyp !== AD_ACID_MU && impossible_mu('bad attack type in spitmm')),
               ACID_VENOM_MU);
        const otmp = await mksobj(venom_otyp, true, false);

        /* C mthrowu.c:1050 — the closer the spitter, the likelier the spit. */
        const dist = distmin_mu(mtmp.mx | 0, mtmp.my | 0, tx, ty);
        if (!rn2(BOLT_LIM_MU - dist)) {
            /* C mthrowu.c:1051-1052 — note the REAL canseemon, not this file's
             * `canseemon() { return false; }` stub two hundred lines up. */
            if (canseemon_mu(mtmp))
                pline(`${je_Monnam(mtmp)} spits venom!`);
            /* C mthrowu.c:1055 — m_throw(mtmp, mx, my, sgn(gt.tbx), sgn(gt.tby),
             * distmin(...), otmp).  linedup() published gt.tbx/gt.tby. */
            const gt = game.gt || {};
            await m_throw(mtmp, mtmp.mx | 0, mtmp.my | 0,
                       sgn_mu(gt.tbx | 0), sgn_mu(gt.tby | 0), dist, otmp);
            nomul(0);
            return M_ATTK_HIT;
        }
        /* C mthrowu.c:1074-1075 — obj_extract_self + obfree on a venom that was
         * never placed: pure deallocation, no RNG, and nothing in this port
         * holds a reference to it. */
    }
    return M_ATTK_MISS;
}


/* C ref: mthrowu.c:24-28 breathwep[] — the breath-weapon names, indexed by
 * BZ_OFS_AD(adtyp). */
const BREATHWEP_MU = [
    'fragments', 'fire', 'frost', 'sleep gas', 'a disintegration blast',
    'lightning', 'poison gas', 'acid', 'strange breath #8',
    'strange breath #9',
];
/* C ref: mthrowu.c:31-48 hallublasts[] + :51-55 rnd_hallublast() =
 * ROLL_FROM(hallublasts) = hallublasts[rn2(SIZE(hallublasts))].  The draw is
 * real: a hallucinating hero who can see the breather makes C roll here. */
const HALLUBLASTS_MU = [
    'asteroids', 'beads', 'bubbles', 'butterflies', 'champagne', 'chaos',
    'coins', 'cotton candy', 'crumbs', 'dark matter', 'darkness', 'data',
    'dust specks', 'emoticons', 'emotions', 'entropy', 'flowers', 'foam',
    'fog', 'gamma rays', 'gelatin', 'gemstones', 'ghosts', 'glass shards',
    'glitter', 'good vibes', 'gravel', 'gravity', 'gravy', 'grawlixes',
    'holy light', 'hornets', 'hot air', 'hyphens', 'hypnosis', 'infrared',
    'insects', 'jargon', 'laser beams', 'leaves', 'lightening', 'logic gates',
    'magma', 'marbles', 'mathematics', 'megabytes', 'metal shavings',
    'metapatterns', 'meteors', 'mist', 'mud', 'music', 'nanites', 'needles',
    'noise', 'nostalgia', 'oil', 'paint', 'photons', 'pixels', 'plasma',
    'polarity', 'powder', 'powerups', 'prismatic light', 'pure logic',
    'purple', 'radio waves', 'rainbows', 'rock music', 'rocket fuel', 'rope',
    'sadness', 'salt', 'sand', 'scrolls', 'sludge', 'smileys', 'snowflakes',
    'sparkles', 'specularity', 'spores', 'stars', 'steam', 'tetrahedrons',
    'text', 'the past', 'tornadoes', 'toxic waste', 'ultraviolet light',
    'viruses', 'water', 'waveforms', 'wind', 'X-rays', 'zorkmids',
];
/* C ref: mthrowu.c:1079-1089 breathwep_name(typ). */
function breathwep_name_mu(typ) {
    if (_uprop_on_mu(HALLUC_MU))
        return HALLUBLASTS_MU[rn2(HALLUBLASTS_MU.length)];
    return BREATHWEP_MU[BZ_OFS_AD_MU(typ)];
}
/* C hack.h:1474-1488 — the buzz-type encoding.
 *   BZ_VALID_ADTYP(adtyp) ((adtyp) >= AD_MAGM && (adtyp) <= AD_SPC2)
 *   BZ_OFS_AD(adtyp)      (abs((adtyp) - AD_MAGM) % 10)
 *   BZ_M_BREATH(bztyp)    (-20 - (bztyp))          / * -29..-20 * /  */
const AD_MAGM_MU = 1, AD_SPC2_MU = 10, AD_SLEE_MU = 4;
function BZ_VALID_ADTYP_MU(adtyp) { return adtyp >= AD_MAGM_MU && adtyp <= AD_SPC2_MU; }
function BZ_OFS_AD_MU(adtyp) { return Math.abs(adtyp - AD_MAGM_MU) % 10; }
function BZ_M_BREATH_MU(bztyp) { return -20 - bztyp; }

/* C ref: mthrowu.c:1091-1146 breamm(mtmp, mattk, mtarg) — "monster breathes at
 * monster (ranged)".  mtarg === null means the hero (this file's spitmm uses the
 * same convention; the port has no global youmonst record).
 *
 * This whole attack was MISSING: mattacku's switch had no `case AT_BREA` at
 * all, so it fell into the `default:` "deferred" arm and consumed nothing.
 * seed4500 step 997 is where that costs: a fire-breather on Dlvl 24 reaches
 * PHASE FOUR after m_move (dochug's "Monsters can move and then shoot on same
 * turn" break, which IS ported) and C draws
 *     rn2(3)=1  @ breamm(mthrowu.c:1117)      <- the !mspec_used && rn2(3) gate
 *     rn2(7)=3  @ dobuzz(zap.c:4823)          <- rn1(7,7) ray range
 *     ... the whole ray: two water squares, a monster, the hero, another monster
 *     rn2(3)=1  @ breamm(mthrowu.c:1131)      <- the mspec_used recharge gate
 * where this port drew the NEXT monster's distfleeck rn2(5) instead.  That is
 * the session's first RNG divergence (global leaf 86672) and the head of its
 * 704-frame miss run.
 *
 * ASYNC: dobuzz() is async (its plines page a --More--, and C's breath topline
 * "... The blast of fire hits it!--More--" is exactly such a frame), so breamm,
 * breamu, mattacku and dochug are all async now.  The RNG order depends on it:
 * calling dobuzz() unawaited would suspend the ray at its first internal await
 * and resume it after the NEXT monster had already moved. */
export async function breamm(mtmp, mattk, mtarg) {
    const typ = get_atkdam_type(mattk.adtyp | 0);
    const utarget = (mtarg === null);

    /* C mthrowu.c:1098 — m_lined_up(mtarg, mtmp); for a hero target that is
     * js/makemon.js's lined_up(mtmp), which publishes gt.tbx/gt.tby. */
    if (utarget ? lined_up(mtmp) : (m_lined_up(mtarg, mtmp) ? true : false)) {
        /* C mthrowu.c:1099-1109 — a cancelled breather just coughs.  RNG-free. */
        if (mtmp.mcan | 0) {
            if (!Deaf(game)) {
                if (canseemon_mu(mtmp))
                    pline(`${je_Monnam(mtmp)} coughs.`);
                else
                    pline('You hear a cough.');
            }
            return M_ATTK_MISS;
        }

        /* C mthrowu.c:1113-1115 — "if we've seen the actual resistance, don't
         * bother, or if we're close by and they reflect, just jump the player". */
        if (utarget && (m_seenres(mtmp, cvt_adtyp_to_mseenres(typ))
                        || m_seenres(mtmp, M_SEEN_REFL)))
            return M_ATTK_HIT;

        if (!(mtmp.mspec_used | 0) && rn2(3)) {
            if (BZ_VALID_ADTYP_MU(typ)) {
                if (canseemon_mu(mtmp))
                    pline(`${je_Monnam(mtmp)} breathes ${breathwep_name_mu(typ)}!`);
                const gb = (game.gb ||= {});
                const gt = game.gt || {};
                gb.buzzer = mtmp;
                await dobuzz(BZ_M_BREATH_MU(BZ_OFS_AD_MU(typ)), mattk.damn | 0,
                             mtmp.mx | 0, mtmp.my | 0,
                             sgn_mu(gt.tbx | 0), sgn_mu(gt.tby | 0),
                             utarget, utarget, false);
                gb.buzzer = 0;
                nomul(0);
                /* C mthrowu.c:1128-1135 — "breath runs out sometimes.  Also,
                 * give monster some cunning; don't breath if the target fell
                 * asleep." */
                if (!utarget || !rn2(3))
                    mtmp.mspec_used = 8 + rn2(18);
                if (utarget && typ === AD_SLEE_MU && !_uprop_on_mu(SLEEP_RES_MU))
                    mtmp.mspec_used = (mtmp.mspec_used | 0) + rnd(20);

                /* C mthrowu.c:1137-1144 — a breathing pet gets hungry. */
                if ((mtmp.mtame | 0) && !(mtmp.isminion | 0)) {
                    const dog = mtmp.mextra?.edog ?? mtmp.edog ?? null;
                    if (dog && (dog.hungrytime | 0) >= 10)
                        dog.hungrytime = (dog.hungrytime | 0) - 10;
                }
            } else {
                /* C: impossible("Breath weapon %d used", typ-1) — no RNG. */
            }
        } else
            return M_ATTK_MISS;
    }
    return M_ATTK_HIT;
}

/* C ref: mthrowu.c:1274-1278 breamu(mtmp, mattk) = breamm(mtmp, mattk,
 * &gy.youmonst) — "monster breathes at you (ranged)". */
export async function breamu(mtmp, mattk) {
    return breamm(mtmp, mattk, null);
}

const VENOM_CLASS_MU = 17;  /* objclass.h */

/* C ref: mthrowu.c:1174 thrwmu(mtmp) — a monster's ranged weapon attack on the
 * hero.  PROLOGUE ONLY, and the prologue is the load-bearing half for the
 * corpus: C's first act is a WIELD CHECK whose lasting effect is
 * `mtmp->weapon_check`, and that field is what monmove.c:854 reads on a LATER
 * turn to decide whether the monster spends its move wielding instead of
 * walking.
 *
 * Measured on seed0030 segment 9 (instrumented C recorder, turns 69/72/73):
 * the goblin 70#137 reaches mattacku at range twice with weapon_check == 0 and
 * no wielded weapon, so `!MON_WEP(mtmp)` opens this block; mon_wield_item finds
 * no ranged weapon and leaves weapon_check == NEED_WEAPON; on turn 73, once
 * dist2 to (mux,muy) reaches 8, dochug's wield block fires off THAT value and
 * the goblin stands still to wield.  With this prologue missing, weapon_check
 * stayed 0 for every monster in the port and dochug's wield block was dead
 * code — the monster walked a square C leaves it standing on.
 *
 * RNG-free through select_rwep, exactly as in C: the wield check and
 * select_rwep consume nothing.
 *
 * The body from C mthrowu.c:1196 on (the polearm thrust and the monshoot()
 * missile volley) is now ported below.  Measured on seed0108 step 30: the
 * goblin's `The goblin throws a crude dagger!` was a MISSING ACTION, not a
 * missing pline — C draws rn2(5) x3 (m_throw forcehit), rn2(82)
 * (u_catch_thrown_obj), rnd(3) (dmgval) and rnd(20) (thitu) here and this
 * port drew none of them, which is where seed0108's RNG stream left C's
 * (first divergence at leaf 2788). */
export async function thrwmu(mtmp) {
    if (ENV.FF_MATTACK_TRACE === '1')
        pushRngLogEntry(`^thrwmu_enter[id=${mtmp.m_id|0} pos=${mtmp.mx|0},${mtmp.my|0} target=${mtmp.mux|0},${mtmp.muy|0}]`);
    const u = game.u || (game.u = {});
    /* C mthrowu.c:1188-1192 — "Rearranged beginning so monsters can use
     * polearms not in a line". */
    if ((mtmp.weapon_check | 0) === MHU_NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = MHU_NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (await mon_wield_item(mtmp) !== 0)
            return;
    }

    /* C mthrowu.c:1195: otmp = select_rwep(mtmp); if (!otmp) return; */
    const otmp = await select_rwep(mtmp);
    if (!otmp)
        return;

    let always_toss = false;
    let rang;

    if (is_pole_mhu(otmp)) {
        /* C mthrowu.c:1198-1240 — polearm/lance thrust at MON_POLE_DIST. */
        if (otmp !== MON_WEP(mtmp))
            return; /* polearm, aklys must be wielded */
        rang = dist2(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0);
        if (rang > MON_POLE_DIST_MU || !couldsee_mu(mtmp.mx | 0, mtmp.my | 0))
            return; /* Out of range, or intervening wall */

        if (canseemon_mu(mtmp)) {
            const onm = xname(otmp);
            pline(`${je_Monnam(mtmp)} ${mswings_verb(otmp, rang <= 2)} `
                  + `${obj_is_pname(otmp) ? the(onm) : an(onm)}.`);
        }

        let dam = dmgval(otmp, _hero_monst_mu());
        let hitv = 3 - distmin_mu(u.ux | 0, u.uy | 0, mtmp.mx | 0, mtmp.my | 0);
        if (hitv < -4)
            hitv = -4;
        if (bigmonst_mu(_hero_permonst_mu()))
            hitv++;
        hitv += 8 + (otmp.spe | 0);
        if (dam < 1)
            dam = 1;
        await thitu_mu(hitv, maybe_half_phys_mu(dam), otmp, null);
        await stop_occupation();
        return;
    } else {
        /* C mthrowu.c:1241-1247 — an aklys/boomerang-class returning weapon
         * is tossed even when the hero is running away. */
        const arw = autoreturn_weapon(otmp);
        if (arw && !mwelded(otmp)) {
            rang = dist2(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0);
            if (rang > (arw.range | 0) || !couldsee_mu(mtmp.mx | 0, mtmp.my | 0))
                return; /* Out of range, or intervening wall */
            always_toss = true;
        }
    }

    const x = mtmp.mx | 0, y = mtmp.my | 0;
    /* C mthrowu.c:1249-1258 — "If you are coming toward the monster, the
     * monster should try to soften you up with missiles.  If you are going
     * away, you are probably hurt or running.  Give chase, but if you are
     * getting too far away, throw."
     * lined_up() is what publishes gt.tbx/gt.tby for monshoot's m_throw. */
    if (!lined_up(mtmp)
        || (URETREATING_MU(x, y)
            && (!always_toss
                && rn2(BOLT_LIM_MU - distmin_mu(x, y, mtmp.mux | 0, mtmp.muy | 0)))))
        return;

    const mwep = MON_WEP(mtmp); /* wielded weapon */
    await monshoot(mtmp, otmp, mwep); /* multishot shooting or throwing */
    nomul(0);
}

/* C hack.h:1435 MON_POLE_DIST — how far monsters can use pole-weapons. */
const MON_POLE_DIST_MU = 5;
/* C mthrowu.c:18 URETREATING(x,y) — is the hero moving away from <x,y>? */
function URETREATING_MU(x, y) {
    const u = game.u || {};
    return distmin_mu(u.ux | 0, u.uy | 0, x, y)
         > distmin_mu(u.ux0 | 0, u.uy0 | 0, x, y);
}
/* C mondata.h:12 bigmonst(ptr) = ptr->msize >= MZ_LARGE (monflag.h MZ_LARGE=3). */
function bigmonst_mu(ptr) { return !!ptr && (ptr.msize | 0) >= 3; }
/* C hack.h:1236 Maybe_Half_Phys(dmg) — Half_physical_damage is an unported
 * hero property (js/dokick.js:176 says the same), so this is the identity. */
function maybe_half_phys_mu(dmg) { return dmg | 0; }
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

/* C ref: mthrowu.c:200 monmulti(mtmp, otmp, mwep) — the multishot volley count.
 * RNG: rnd(multishot) ONLY when the stack is >1 and (ammo+matching launcher, or
 * any stackable non-ammo weapon) and the monster is not confused; a quan==1
 * throw draws nothing, which is what seed0108's goblin does. */
function monmulti(mtmp, otmp, mwep) {
    let multishot = 1;
    const quan = (otmp.quan ?? 1) | 0;

    if (quan > 1
        && (is_ammo_mu(otmp)
                ? matching_launcher_mu(otmp, mwep)
                : (otmp.oclass | 0) === OCLASS_WEAPON_MHU)
        && !(mtmp.mconf | 0)) {
        const ptr = mtmp.data;
        /* Assumes lords are skilled, princes are expert */
        if (is_prince_mu(ptr))
            multishot += 2;
        else if (is_lord_mu(ptr))
            multishot++;
        else if (is_mplayer_mu(ptr))
            multishot++;

        /* Elven Craftsmanship makes for light, quick bows */
        if ((otmp.otyp | 0) === ELVEN_ARROW_MU && !(otmp.cursed | 0))
            multishot++;
        if (mwep && (mwep.otyp | 0) === ELVEN_BOW_MU
            && ammo_and_launcher_mu(otmp, mwep) && !(mwep.cursed | 0))
            multishot++;
        /* 1/3 of launcher enchantment */
        if (ammo_and_launcher_mu(otmp, mwep) && (mwep.spe | 0) > 1)
            multishot += rounddiv_mu(mwep.spe | 0, 3);
        /* Some randomness */
        multishot = rnd(multishot);

        /* class bonus */
        multishot += multishot_class_bonus_mu(mtmp, otmp, mwep);

        /* racial bonus */
        if ((is_elf_mu(ptr) && (otmp.otyp | 0) === ELVEN_ARROW_MU
             && mwep && (mwep.otyp | 0) === ELVEN_BOW_MU)
            || (is_orc_mu(ptr) && (otmp.otyp | 0) === ORCISH_ARROW_MU
                && mwep && (mwep.otyp | 0) === ORCISH_BOW_MU)
            || (is_gnome_mu(ptr) && (otmp.otyp | 0) === CROSSBOW_BOLT_MU
                && mwep && (mwep.otyp | 0) === CROSSBOW_MU))
            multishot++;
    }

    if (quan < multishot)
        multishot = quan;
    if (multishot < 1)
        multishot = 1;
    if (ENV.FF_MATTACK_TRACE === '1')
        pushRngLogEntry(`^monmulti[id=${mtmp.m_id|0} obj=${otmp.otyp|0} quan=${quan} launcher=${mwep?.otyp ?? -1} shots=${multishot}]`);
    return multishot;
}

/* C ref: mthrowu.c:262 monshoot(mtmp, otmp, mwep) — mtmp throws otmp, or shoots
 * otmp with mwep, at the hero (gm.mtarget == 0 on the thrwmu path) or at mtarg.
 * Caller must have called lined_up() to set up <gt.tbx, gt.tby>. */
async function monshoot(mtmp, otmp, mwep) {
    const g = game;
    const gm = g.gm || (g.gm = {});
    const mtarg = gm.mtarget || null;
    const dm = distmin_mu(mtmp.mx | 0, mtmp.my | 0,
                          mtarg ? (mtarg.mx | 0) : (mtmp.mux | 0),
                          mtarg ? (mtarg.my | 0) : (mtmp.muy | 0));
    const multishot = monmulti(mtmp, otmp, mwep);

    gm.m_shot = gm.m_shot || { i: 0, n: 0, o: 0, s: false };
    if (canseemon_mu(mtmp)) {
        let onm;
        if (multishot > 1) {
            /* "N arrows"; multishot > 1 implies otmp->quan > 1, so xname()'s
               result will already be pluralized */
            onm = `${multishot} ${xname(otmp)}`;
        } else {
            /* "an arrow" */
            onm = (await singular(otmp, xname));
            onm = obj_is_pname(otmp) ? the(onm) : an(onm);
        }
        gm.m_shot.s = ammo_and_launcher_mu(otmp, mwep) ? true : false;
        /* C:288 Strcpy(trgbuf, mtarg ? some_mon_nam(mtarg) : "") — the thrwmu
         * path always has mtarg == 0, and the monster-vs-monster caller
         * (thrwmm) is not wired to monshoot in this port. */
        const trgbuf = mtarg ? uhitm_mon_nam(mtarg) : '';
        pline(`${je_Monnam(mtmp)} ${gm.m_shot.s ? 'shoots' : 'throws'} ${onm}`
              + `${mtarg ? ' at ' : ''}${trgbuf}!`);
        gm.m_shot.o = otmp.otyp | 0;
    } else {
        gm.m_shot.o = 0; /* STRANGE_OBJECT — don't give multishot feedback */
    }
    gm.m_shot.n = multishot;
    const gt = g.gt || (g.gt = {});
    for (gm.m_shot.i = 1; gm.m_shot.i <= gm.m_shot.n; gm.m_shot.i++) {
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^monshoot_shot[id=${mtmp.m_id|0} i=${gm.m_shot.i|0} n=${gm.m_shot.n|0} hp=${mtmp.mhp|0}]`);
        await m_throw(mtmp, mtmp.mx | 0, mtmp.my | 0,
                sgn_mu(gt.tbx | 0), sgn_mu(gt.tby | 0), dm, otmp);
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^monshoot_done[id=${mtmp.m_id|0} i=${gm.m_shot.i|0} n=${gm.m_shot.n|0} hp=${mtmp.mhp|0} pending=${game._pendingDeath ? 1 : 0}]`);
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^monshoot_page_probe[id=${mtmp.m_id|0} i=${gm.m_shot.i|0} more=${_topline_more_pending() ? 1 : 0} force=${game._topl_force_breaks?.length|0} topl=${encodeURIComponent(String(game._pending_message || '').slice(-100))}]`);
        /* C:299-306 — cancel pending shots if the thrower died mid-volley. */
        if ((mtmp.mhp | 0) <= 0 && gm.m_shot.i < gm.m_shot.n)
            break;
    }
    /* reset 'gm.m_shot' */
    gm.m_shot.n = gm.m_shot.i = 0;
    gm.m_shot.o = 0;
    gm.m_shot.s = false;
}

/* C obj.h:238/242/244/245 — is_ammo / matching_launcher / ammo_and_launcher /
 * is_missile, off MKOBJ_OC_SKILL (the same table is_pole_mhu reads).
 * skills.h: P_BOW=20, P_CROSSBOW=22, P_DART=23, P_BOOMERANG=25. */
/* C objclass.h:136-142 + defsym.h:480 — GEM_CLASS is 13.  This constant read 9,
 * which is SCROLL_CLASS, so is_ammo() answered FALSE for every gem/stone
 * (sling ammo: flint, rocks, and the gems that share oc_skill -P_SLING).  A
 * sling-armed monster shooting flint therefore skipped monmulti()'s whole
 * multishot block including its live `multishot = rnd(multishot)` — seed4500
 * step 842, C `rnd(1)=1 @monmulti(mthrowu.c:238)` against a JS stream that had
 * already moved on to the split's next_ident. */
const OCLASS_GEM_MU = 13;
function is_ammo_mu(otmp) {
    const oc = otmp.oclass | 0, sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (oc === OCLASS_WEAPON_MHU || oc === OCLASS_GEM_MU)
        && sk >= -22 && sk <= -20;
}
function matching_launcher_mu(a, l) {
    return !!l && (MKOBJ_OC_SKILL[a.otyp | 0] | 0)
                   === -(MKOBJ_OC_SKILL[l.otyp | 0] | 0);
}
function ammo_and_launcher_mu(a, l) {
    return is_ammo_mu(a) && matching_launcher_mu(a, l);
}
function is_missile_mu(otmp) {
    const oc = otmp.oclass | 0, sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (oc === OCLASS_WEAPON_MHU || oc === OCLASS_TOOL_MHU)
        && sk >= -25 && sk <= -23;
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
const M2_LORD_MU = 0x00000400, M2_PRINCE_MU = 0x00000800;
/* C mondata.h:157-158 is_mplayer(ptr) is NOT a flag test at all —
 *     (((ptr) >= &mons[PM_ARCHEOLOGIST]) && ((ptr) <= &mons[PM_WIZARD]))
 * i.e. a monster-index RANGE over the thirteen fake-player entries.  The
 * M2_MPLAYER bit this file invented (0x00800000) is M2_WANDER in 5.0, so the
 * predicate answered "is a wanderer".  Indices verified by name against
 * js/makemon_pmnames.json (archeologist 331 .. wizard 343). */
const PM_ARCHEOLOGIST_MU = 331, PM_WIZARD_MU = 343;
function _mf2(ptr) { return (ptr && ptr.mflags2) | 0; }
function _mndx_of(ptr) {
    const i = (ptr && (ptr.pmidx ?? ptr.mndx ?? ptr.mnum));
    return (i == null) ? -1 : (i | 0);
}
function is_lord_mu(ptr) { return (_mf2(ptr) & M2_LORD_MU) !== 0; }
function is_prince_mu(ptr) { return (_mf2(ptr) & M2_PRINCE_MU) !== 0; }
function is_mplayer_mu(ptr) {
    const i = _mndx_of(ptr);
    return i >= PM_ARCHEOLOGIST_MU && i <= PM_WIZARD_MU;
}
function is_elf_mu(ptr) { return (_mf2(ptr) & M2_ELF_MU) !== 0; }
function is_orc_mu(ptr) { return (_mf2(ptr) & M2_ORC_MU) !== 0; }
function is_gnome_mu(ptr) { return (_mf2(ptr) & M2_GNOME_MU) !== 0; }
/* C hacklib.c rounddiv(x, y) — divide, rounding to nearest. */
function rounddiv_mu(x, y) {
    if (y === 0) return 0;
    const r = Math.trunc(x / y), m = x % y;
    return (Math.abs(m) * 2 >= Math.abs(y)) ? r + Math.sign(x / y) : r;
}
/* otyps for the multishot racial/elven bonuses.  All six of these were WRONG.
 * Resolved against the scored 5.0 binary's own headers
 * (`node tools/c-const-oracle.mjs`, which reads nethack-c-v5/recorder):
 *     ELVEN_ARROW 19 (was 13)   ELVEN_BOW  84 (was 75)
 *     ORCISH_ARROW 20 (was 12)  ORCISH_BOW 85 (was 76)
 *     CROSSBOW_BOLT 23 (was 17) CROSSBOW   88 (was 78)
 * The old values are below FIRST_OBJECT (objects.h reserves [0..17] for the
 * per-class GENERIC placeholders), so no real object could ever equal them and
 * every one of these bonuses was dead code -- both the +1s in monmulti() and
 * m_throw's elven to-hit/damage bonus at mthrowu.c:758-764.  The comment that
 * stood here asserted "js numbering == C numbering in the weapon range", which
 * is true and is exactly why the numbers were checkable; nobody checked them.
 * tools/pm-otyp-audit.mjs independently reports the js/read.js copy of
 * ELVEN_BOW as declared=83 truth=84, but it does NOT see these -- it does not
 * normalise the `_MU` suffix, so an entire file of local variants is invisible
 * to it (see the fleet-feedback note for this session). */
const ELVEN_ARROW_MU = 19, ORCISH_ARROW_MU = 20, CROSSBOW_BOLT_MU = 23,
      ELVEN_BOW_MU = 84, ORCISH_BOW_MU = 85, CROSSBOW_MU = 88;
/* C ref: weapon.c multishot_class_bonus(pm, ammo, launcher) — the hero-class
 * bonus for monsters that are fake players (@ class).  GAP: js/cmd.js:15287
 * carries the ported body but importing cmd.js here would close a module cycle
 * with cmd.js's own `import { noattacks_mndx } from './mhitu.js'`; every corpus
 * ranged monster so far is a plain monster (not is_mplayer), for which C's own
 * body returns 0 on its `default:` arm.  RNG-free either way. */
function multishot_class_bonus_mu(mtmp, otmp, mwep) {
    void otmp; void mwep;
    return is_mplayer_mu(mtmp.data) ? 0 : 0;
}

/* C mthrowu.c:1498 hits_bars() — classify whether an object collides with
 * iron bars.  This is the non-hero arm used by m_throw: `always_hit` is zero
 * on the pre-move check and is the caller's forcehit roll on later checks.
 * Small arrows, darts, spears, knives, and the listed tools pass through;
 * substantial objects stop at the bars.  The full hit_bars side effects are
 * display/object-break work, but the boolean decision is what controls the
 * flight path and its RNG alignment here. */
function hits_bars_mu(obj, always_hit) {
    if (!obj) return false;
    if (always_hit) return true;
    const otyp = obj.otyp | 0;
    const oclass = obj.oclass | 0;
    const skill = MKOBJ_OC_SKILL[otyp] | 0;
    /* WEAPON_CLASS: C excludes bows, crossbows, darts, shuriken, spears,
     * knives; daggers are intentionally allowed to hit. */
    if (oclass === OCLASS_WEAPON_MHU)
        return skill !== -20 && skill !== -21 && skill !== -23
            && skill !== -24 && skill !== P_SPEAR_MHU && skill !== P_KNIFE_MHU;
    if (oclass === ARMOR_CLASS_MHU)
        return (ARMOR_DATA_MU[otyp]?.armcat | 0) !== ARM_GLOVES_MHU;
    if (oclass === OCLASS_TOOL_MHU)
        return otyp !== SKELETON_KEY_MHU && otyp !== LOCK_PICK_MHU
            && otyp !== CREDIT_CARD_MHU && otyp !== TALLOW_CANDLE_MHU
            && otyp !== WAX_CANDLE_MHU && otyp !== LENSES_MHU
            && otyp !== TIN_WHISTLE_MHU && otyp !== MAGIC_WHISTLE_MHU;
    if (oclass === ROCK_CLASS_MHU)
        return otyp !== STATUE_MHU || (obj.msize | 0) > 1;
    if (oclass === FOOD_CLASS_MHU)
        return otyp === MEAT_STICK_MHU || otyp === ENORMOUS_MEATBALL_MHU
            || (otyp === CORPSE_MHU && (obj.msize | 0) > 1);
    return oclass === SPBOOK_CLASS_MHU || oclass === WAND_CLASS_MHU
        || oclass === BALL_CLASS_MHU || oclass === CHAIN_CLASS_MHU;
}

/* objects.h class and skill ordinals used by hits_bars(). */
const ARMOR_CLASS_MHU = 3, ROCK_CLASS_MHU = 4, FOOD_CLASS_MHU = 7,
      SPBOOK_CLASS_MHU = 10, WAND_CLASS_MHU = 11, BALL_CLASS_MHU = 15,
      CHAIN_CLASS_MHU = 16, ARM_GLOVES_MHU = 3,
      P_KNIFE_MHU = 2, P_SPEAR_MHU = 17;
const SKELETON_KEY_MHU = 221, LOCK_PICK_MHU = 222, CREDIT_CARD_MHU = 223,
      TALLOW_CANDLE_MHU = 224, WAX_CANDLE_MHU = 225, LENSES_MHU = 232,
      TIN_WHISTLE_MHU = 245, MAGIC_WHISTLE_MHU = 246, STATUE_MHU = 476,
      CORPSE_MHU = 265, MEAT_STICK_MHU = 268, ENORMOUS_MEATBALL_MHU = 269;

/* C ref: mthrowu.c:552 MT_FLIGHTCHECK(pre, forcehit) — has the missile run out
 * of map?  Evaluated at <bhitpos + d>, except the sink test which is at
 * <bhitpos> itself and only on the post-move pass. */
export function mt_flightcheck(bx, by, dx, dy, pre, forcehit = false, obj = null) {
    const nx = bx + dx, ny = by + dy;
    if (!isok_mu(nx, ny)) return true;
    const nloc = game.level?.at(nx, ny);
    if (nloc && IS_OBSTRUCTED_MU(nloc.typ | 0)) return true;
    if (closed_door_mu(nx, ny)) return true;
    if (nloc && (nloc.typ | 0) === IRONBARS_MU
        && hits_bars_mu(obj, !pre && !!forcehit)) return true;
    if (!pre) {
        const cloc = game.level?.at(bx, by);
        if (cloc && (cloc.typ | 0) === SINK_MU) return true;
    }
    return false;
}

/* C ref: mthrowu.c:161 drop_throw(obj, ohit, x, y) — dispose of a missile that
 * has finished flying.  A cream pie, a VENOM_CLASS object and a hit egg are
 * always `broken`; anything else breaks only if it hit and should_mulch_missile
 * says so.
 * RNG: delobj -> delobj_core -> obj_resists(obj, 0, 0) = rn2(100) on the broken
 * arm; should_mulch_missile draws rn2 ONLY for ammo/missiles (nothing for a
 * thrown dagger, which is what seed0108's goblin throws). */
export async function drop_throw(obj, ohit, x, y) {
    /* JS otyps: CREAM_PIE 287 (js/cmd.js:24621, js/m_initweap.js:144),
     * EGG 266 (js/cmd.js:9233). */
    const CREAM_PIE_MU = 287, EGG_MU = 266;
    let broken;
    if ((obj.otyp | 0) === CREAM_PIE_MU || (obj.oclass | 0) === VENOM_CLASS_MU
        || (ohit && (obj.otyp | 0) === EGG_MU)) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile_mu(obj));
    }

    if (broken) {
        /* C mkobj.c delobj -> delobj_core(obj, FALSE) -> obj_resists(obj,0,0). */
        obj_resists_mu(obj, 0, 0);
    } else {
        /* C:180-181 — a trapdoor/hole under the landing square ships the object
         * to the level below.  GAP: ship_object's shop bookkeeping is ported
         * (js/dokick.js:935) but down_gate is only meaningful once the object
         * actually lands on a gate square; both are called faithfully. */
        if (down_gate(x, y) !== -1)
            broken = !!(await ship_object(obj, x, y, false));
        if (!broken) {
            let mtmp = uhitm_m_at(x, y);
            broken = !!await flooreffects_mu(obj, x, y, 'fall');
            if (!broken) {
                place_object(obj, x, y);
                if (!mtmp && (x === (game.u?.ux | 0)) && (y === (game.u?.uy | 0)))
                    mtmp = _hero_monst_mu();
                if (mtmp && ohit)
                    await passive_obj(mtmp, obj, null);
                /* C mthrowu.c:190 `stackobj(obj);` — the landed missile merges
                 * into any mergable stack already on the square, and C's
                 * `merged(&obj, &otmp)` makes the NEW object the survivor, so
                 * the combined stack keeps the new object's place at the head of
                 * fobj.  The comment that stood here called js/sp_lev.js's
                 * stackobj a no-op; it stopped being one on 2026-08-17 and this
                 * call site was never wired to it.
                 * MEASURED, seed0030: segment 6's floor ends the game with
                 * `18 q1, 18 q1` where C has a single `18 q3` — one extra object
                 * struct — and segment 9 reads that level back out of the bones
                 * file, so its bones load drew 50 `rnd(2) @next_ident` against
                 * C's 49.  RNG-free in C and here. */
                await stackobj(obj);
            }
        }
    }
    game.thrownobj = null;
    if (game.gt) game.gt.thrownobj = null;
    return broken;
}
/* C ref: dothrow.c should_mulch_missile(obj) — only ammo (excluding magic
 * stones) or missiles break.  Ported locally rather than imported from
 * js/cmd.js:23073 to keep this file off the cmd.js import cycle; the two
 * bodies must stay in step (both are transcriptions of the same C function). */
function should_mulch_missile_mu(obj) {
    if (!obj || !(is_ammo_mu(obj) || is_missile_mu(obj)))
        return false;
    const BOOMERANG_MU = 26; /* js otyp (js/m_initweap.js:52) */
    if ((obj.otyp | 0) === BOOMERANG_MU)
        return false;
    /* C: || objects[obj->otyp].oc_magic — no standard ammo/missile carries it
     * (the magic stones are GEM_CLASS luckstone/loadstone/flint/touchstone,
     * excluded by is_ammo's oc_skill range). */
    const chance = 3 + Math.max(obj.oeroded | 0, obj.oeroded2 | 0) - (obj.spe | 0);
    let broken = chance > 1 ? !!rn2(chance) : !rn2(4);
    if (obj.blessed) {
        const mon_moving = !!(game.context && game.context.mon_moving);
        if (mon_moving ? !rn2(3) : !rnl(4))
            broken = false;
    }
    /* C: flint and hard gems don't break easily.  oc_tough is not carried in
     * js/mkobj_data.js; FLINT is (js otyp 473). */
    const FLINT_MU = 473;
    if ((obj.otyp | 0) === FLINT_MU && !rn2(2))
        broken = false;
    return broken;
}

/* C ref: mthrowu.c:321-501 boolean ohitmon(struct monst *mtmp, struct obj *otmp,
 *   int range, boolean verbose)
 * "an object launched by someone/thing other than player attacks a monster;
 *  return 1 if the object has stopped moving (hit or its range used up)".
 *
 * seed0002 step 256: the goblin's crude dagger crosses the hero's little dog.
 * C draws `rnd(20)` here (mthrowu.c:350) and the dagger STOPS on the dog; this
 * port had no ohitmon at all, so the dagger flew straight through the dog and
 * on into the hero — JS printed "A crude dagger misses you." where C prints
 * "The crude dagger hits the little dog." on the far side of a --More--.
 *
 * RNG, in C order:
 *   rnd(20)                              to-hit                        (:350)
 *   dmgval(otmp, mtmp)                   damage dice                   (:373)
 *   rn2(30) [+ rnd(6)]                   poison, only if otmp->opoisoned(:407)
 *   rnd(25)                              blinding, only if can_blnd    (:487)
 *   drop_throw(otmp, 1, ...)             mulch/obj_resists             (:494)
 *
 * gm.marcher / gm.mtarget: C sets BOTH only in thrwmm (monster shooting at
 * another monster, mthrowu.c:1003-1006) and mtarget alone in spitmm (:1054).
 * The thrwmu path that seed0002 takes leaves both NULL, so the archer-level
 * to-hit bonus at :344-348 is skipped and `verbose && !gm.mtarget` is true.
 */
export async function ohitmon(mtmp, otmp, range, verbose) {
    let damage, tmp;
    const gm = game.gm || (game.gm = {});
    const gn = game.gn || (game.gn = {});
    const gb = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    const bx = gb.x | 0, by = gb.y | 0;

    /* C:331 */
    const mon_launcher = gm.marcher ? MON_WEP(gm.marcher) : null;
    /* C:334 — a long worm hit on a tail segment rather than the head. */
    gn.notonhead = (bx !== (mtmp.mx | 0) || by !== (mtmp.my | 0));
    /* C:335 — M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER */
    const ismimic = !!M_AP_TYPE_MU(mtmp) && M_AP_TYPE_MU(mtmp) !== M_AP_MONSTER_MU;
    const vis = cansee_mu(bx, by);
    if (vis)
        observe_object_mu(otmp);

    /* C:340 */
    tmp = 5 + find_mac_mu(mtmp) + omon_adj_mu(mtmp, otmp, false);
    /* C:344-348 — high level archers hit more often, but only against the
     * monster they were actually aiming at. */
    if (gm.marcher && gm.mtarget === mtmp) {
        if ((gm.marcher.m_lev | 0) > 5)
            tmp += (gm.marcher.m_lev | 0) - 5;
        if (mon_launcher && (mon_launcher.oartifact | 0)) {
            /* GAP — C:348 spec_abon(mon_launcher, mtmp) (artifact.c).  Not
             * ported; RNG-free in C for every non-Magicbane artifact.  Only
             * reachable on the thrwmm path with an artifact launcher. */
        }
    }

    if (tmp < rnd(20)) {
        /* ── MISS ── C:349-360 */
        if (!ismimic) {
            if (vis)
                miss_mu((await distant_name_mu(otmp, mshot_xname)), mtmp);
            else if (verbose && !gm.mtarget)
                pline('It is missed.');
        }
        if (!range) { /* C:356 last position; object drops */
            await drop_throw(otmp, 0, mtmp.mx | 0, mtmp.my | 0);
            return true;
        }
    } else if ((otmp.oclass | 0) === POTION_CLASS_MU) {
        /* GAP — C:361-370 potionhit(mtmp, otmp, POTHIT_OTHER_THROW), i.e. a
         * thrown potion hitting a MONSTER.  js/potion.js:potionhit() now exists
         * but carries only the hero-target half; the monster-target half needs
         * sleep_monst/mcureblindness/split_mon/mon-side bhitm, none of which are
         * ported.  (The two claims that used to stand here — "potionhit is not
         * ported anywhere in js/" and "no corpus monster throws a potion" — were
         * both falsified by seed0030 segment 0 step 50, where a gnome hurls a
         * potion of sleeping at the hero.)  Leaving the arm explicit rather than
         * silently falling into the weapon arm below. */
        if (ismimic) seemimic_mu(mtmp);
        mtmp.msleeping = 0;
        return true;
    } else {
        /* ── HIT ── C:371-500 */
        const material = MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0;
        const harmless = (stone_missile_mu(otmp) && passes_rocks_mu(mtmp.data));

        damage = dmgval(otmp, mtmp);
        if ((otmp.otyp | 0) === ACID_VENOM_MU && resists_acid_mu(mtmp))
            damage = 0;
        if (ismimic) seemimic_mu(mtmp);
        mtmp.msleeping = 0;
        /* C:388 Soundeffect(se_splat_egg, 35) — not a scored channel. */
        if (vis) {
            if ((otmp.otyp | 0) === EGG_OHITMON_MU) {
                /* C:390-394 */
                pline(`Splat!  ${je_Monnam(mtmp)} is hit with `
                      + `${otmp.known ? an(monPmname_mu(otmp.corpsenm | 0)) : 'an'} egg!`);
            } else {
                /* C:396-403 */
                let how;
                if (!harmless)
                    how = exclam_mu(damage); /* "!" or "." */
                else
                    how = ` but passes harmlessly through ${String(mhim_mu(mtmp)).slice(0, 9)}.`;
                hit_mu((await distant_name_mu(otmp, mshot_xname)), mtmp, how);
            }
        } else if (verbose && !gm.mtarget) {
            /* C:404-406 */
            pline(`${((otmp.otyp | 0) === EGG_OHITMON_MU) ? 'Splat!  ' : ''}`
                  + `${je_Monnam(mtmp)} is hit${exclam_mu(damage)}`);
        }

        /* C:408-424 — poison.  DRAWS: rn2(30), then rnd(6) on the common arm. */
        if ((otmp.opoisoned | 0) && is_poisonable_mu(otmp)) {
            if (resists_poison_mu(mtmp)) {
                if (vis)
                    pline(`The poison doesn't seem to affect ${uhitm_mon_nam(mtmp)}.`);
            } else {
                if (rn2(30)) {
                    damage += rnd(6);
                } else {
                    if (vis)
                        pline('The poison was deadly...');
                    damage = mtmp.mhp | 0;
                }
            }
        }

        /* C:425-437 — silver sears a silver-hating monster.  RNG-free (the
         * extra damage itself is already inside dmgval). */
        if (material === SILVER_MU && mon_hates_silver_mu(mtmp)) {
            const flesh = (!noncorporeal_mu(mtmp.data) && !amorphous_mu(mtmp.data));
            if (vis) {
                let m_name = uhitm_mon_nam(mtmp);
                if (flesh)
                    m_name = s_suffix_mu(m_name) + ' flesh';
                pline(`The silver sears ${m_name}!`);
            } else if (verbose && !gm.mtarget) {
                pline(`${flesh ? 'Its flesh' : 'It'} is seared!`);
            }
        }

        /* C:438-450 — acid venom.  RNG-free. */
        if ((otmp.otyp | 0) === ACID_VENOM_MU && cansee_mu(mtmp.mx | 0, mtmp.my | 0)) {
            if (resists_acid_mu(mtmp)) {
                if (vis || (verbose && !gm.mtarget))
                    pline(`${je_Monnam(mtmp)} is unaffected.`);
            } else {
                if (vis)
                    pline(`The ${hliquid_mu('acid')} burns ${uhitm_mon_nam(mtmp)}!`);
                else if (verbose && !gm.mtarget)
                    pline('It is burned!');
            }
        }

        /* GAP — C:451-456, a thrown cockatrice EGG petrifying its target
         * (munstone/minstapetrify).  Neither is ported anywhere in js/ and both
         * draw; no corpus monster throws an egg. */

        /* C:458-473 — apply the damage. */
        if (!harmless && (mtmp.mhp | 0) >= 1) {
            mtmp.mhp = (mtmp.mhp | 0) - damage;
            if ((mtmp.mhp | 0) < 1) {
                if (vis || (verbose && !gm.mtarget))
                    pline(`${je_Monnam(mtmp)} is `
                          + `${(nonliving_mu(mtmp.data) || !canspotmon_disp(mtmp))
                              ? 'destroyed' : 'killed'}!`);
                /* C mthrowu.c:470-473
                 *     if (!svc.context.mon_moving
                 *         && (otmp->otyp != BOULDER || range >= 0
                 *             || otmp->otrapped))
                 *         xkilled(mtmp, XKILL_NOMSG);
                 *     else
                 *         mondied(mtmp);
                 * "don't blame hero for unknown rolling boulder trap".  The
                 * mondied() arm is the one this port can reach: js/dogmove.js
                 * has carried a full mondead+m_detach+corpse_chance+make_corpse
                 * body all along (it is what a pet melee kill runs), and it is
                 * now exported as mondied_dm().  The old note here — "mondied is
                 * still a throw-stub", "not reached by the corpus" — was wrong on
                 * both counts as of seed0014 step 560, where a rolling boulder
                 * kills a gnome lord and C draws rn2(2) @corpse_chance
                 * (mon.c:3248) at leaf 33278.
                 *
                 * The xkilled() arm is a NAMED GAP and the condition guarding
                 * it is not written out, because both halves are unreachable
                 * here and writing the test would misrepresent that: xkilled()
                 * is async while this whole flight path is synchronous, and its
                 * guard needs `!svc.context.mon_moving`, which has no writer
                 * anywhere in js/.  Every ohitmon() this port can reach comes
                 * from launch_obj() on a monster's own turn, where C's
                 * context.mon_moving IS set and C takes mondied() too.  A
                 * hero-thrown missile that kills is the case that would differ,
                 * and it does not reach this file. */
                await mondied_dm(mtmp);
            }
        }

        /* C:477-490 — blinding venom / cream pie.  DRAWS rnd(25). */
        if ((mtmp.mhp | 0) >= 1
            && can_blnd_mu(null, mtmp,
                           ((otmp.otyp | 0) === BLINDING_VENOM_MU) ? AT_SPIT_MU : AT_WEAP_MU,
                           otmp)) {
            if (vis && (mtmp.mcansee | 0))
                pline(`${je_Monnam(mtmp)} is blinded by `
                      + `${the((otmp.oclass | 0) === VENOM_CLASS_MU ? 'venom'
                               : ((otmp.otyp | 0) === CREAM_PIE_OHITMON_MU ? 'pie'
                                  : xname(otmp)))}.`);
            mtmp.mcansee = 0;
            tmp = (mtmp.mblinded | 0) + rnd(25) + 20;
            if (tmp > 127) tmp = 127;
            mtmp.mblinded = tmp;
        }

        /* C:492-493 — the thrower angers the target only when the HERO is
         * responsible; on a monster's own turn context.mon_moving is set. */
        if ((mtmp.mhp | 0) >= 1 && !mon_moving_mu())
            await setmangry_mu(mtmp, true);

        /* C:495-500 */
        const objgone = await drop_throw(otmp, 1, bx, by);
        if (!objgone && range === -1) { /* special case: rolling boulder */
            /* C mthrowu.c:496-498
             *     obj_extract_self(otmp);    /* free it for motion again *\/
             *     return FALSE;
             * drop_throw() has just place_object()ed the boulder on the square
             * it hit; range == -1 means "keep going even after a hit", so C
             * takes it straight back off the floor and launch_obj() rolls it on.
             * The extract was a NAMED GAP here, and skipping it is not inert:
             * launch_obj's next flooreffects() call panics with "flooreffects:
             * obj not free" (js/cmd.js:5327) because the boulder is still
             * OBJ_FLOOR.  Measured on seed0014 step 560, where that panic
             * halted the scored run at 560/714 frames.
             * obj->where is OBJ_FLOOR here by construction (drop_throw placed
             * it and !objgone says it was not consumed), which is the arm
             * mkobj.c:2426 obj_extract_self dispatches to remove_object(). */
            remove_object(otmp);
            return false;
        }
        return true;
    }
    return false;
}
/* ── ohitmon's leaf helpers ──────────────────────────────────────────────────
 * Constants and one-line macros, each cited to its C definition.  The `_MU`
 * suffix is this file's existing convention for a name that must not be
 * shadowed by one of mhitu.js's older file-local stubs. */
/* monst.h:130-131 M_AP_NOTHING 0 / M_AP_FURNITURE 1 / M_AP_OBJECT 2 /
 * M_AP_MONSTER 3 */
const M_AP_MONSTER_MU = 3;
function M_AP_TYPE_MU(mon) { return mon?.m_ap_type ?? 0; }
/* objclass indices — defsym.h:468-484 OBJCLASS(): WEAPON 2, RING 4, POTION 8,
 * GEM 13, VENOM 17.  VENOM_CLASS_MU is already declared in this file (:1369). */
const POTION_CLASS_MU = 8;
/* objclass.h:27 SILVER = 14 (Ag).  NOT 10 — every constant in this block was
 * guessed once and every guess was wrong; they are now read off the 5.0 headers
 * one by one, per the S_LIGHT/S_BAT precedent. */
const SILVER_MU = 14;
/* otyps, matching drop_throw's copies at the top of this file. */
const EGG_OHITMON_MU = 266, CREAM_PIE_OHITMON_MU = 287;
/* monattk.h:28 AT_WEAP = 254, :19 AT_SPIT = 10.  NOT 2 and 8 — passing 2 fell
 * through can_blnd's switch to a default that answered TRUE, which blinded the
 * little dog with a crude dagger and put a third message on seed0002 step 257.
 *
 * The FINDING this note used to carry -- "js/mhitm.js's can_blnd switch still
 * labels its cases with 3.7 attack-type numbers, so feeding it the correct
 * AT_SPIT (10) would land on its AT_GAZE arm, whose resists_blnd is a
 * throw-stub" -- is FIXED as of the commit before this one: those labels are
 * 5.0's now and resists_blnd is ported.  AT_SPIT is therefore spelled
 * correctly below.  C gives AT_WEAP, AT_SPIT and AT_NONE one shared case label
 * (mondata.c:340-342), so this is the same arm either way. */
const AT_WEAP_MU = 254;
const AT_SPIT_MU = 10;
/* mondata.h:30-31 */
function amorphous_mu(ptr) { return !!(ptr && ((ptr.mflags1 | 0) & M1_AMORPHOUS_MU)); }
function noncorporeal_mu(ptr) { return !!(ptr && (ptr.mlet | 0) === S_GHOST_MU); }
const M1_AMORPHOUS_MU = 0x00000004; /* monflag.h:87 (js/makemon.js:121 agrees) */
const S_GHOST_MU = 54;              /* defsym.h:358 MONSYM(54, ..., S_GHOST) */
/* mondata.h:208 passes_rocks(ptr) = passes_walls(ptr) && !unsolid(ptr) */
function passes_rocks_mu(ptr) {
    if (!ptr) return false;
    /* monflag.h:88 M1_WALLWALK 0x08, :105 M1_UNSOLID 0x00100000 */
    const M1_WALLWALK = 0x00000008, M1_UNSOLID = 0x00100000;
    return ((ptr.mflags1 | 0) & M1_WALLWALK) !== 0
        && ((ptr.mflags1 | 0) & M1_UNSOLID) === 0;
}
/* obj.h:274 stone_missile(o) — objclass.h:33-34 GEMSTONE 20 / MINERAL 21
 * material, and defsym.h:470 RING_CLASS 4. */
function stone_missile_mu(o) {
    const GEMSTONE = 20, MINERAL = 21, RING_CLASS = 4;
    const m = MKOBJ_OC_MATERIAL[o.otyp | 0] | 0;
    return (m === GEMSTONE || m === MINERAL) && (o.oclass | 0) !== RING_CLASS;
}
/* obj.h:264 is_poisonable(otmp) — a WEAPON_CLASS object whose oc_skill is in
 * [-P_SHURIKEN, -P_BOW], i.e. a launchable missile.  skills.h:43-47 P_BOW 20,
 * P_SHURIKEN 24.  permapoisoned() covers only the Sceptre of Might's arrows and
 * is not ported. */
function is_poisonable_mu(otmp) {
    const WEAPON_CLASS = 2, NEG_P_SHURIKEN = -24, NEG_P_BOW = -20;
    if ((otmp.oclass | 0) !== WEAPON_CLASS) return false;
    const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return sk >= NEG_P_SHURIKEN && sk <= NEG_P_BOW;
}
/* monst.h:277 resists_poison(mon) = Resists_Elem(mon, POISON_RES), i.e.
 * mon_resistancebits(mon) & MR_POISON (js/mhitm.js:3246 builds the same OR). */
function resists_poison_mu(mon) {
    const MR_POISON = 0x20;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_POISON) !== 0;
}
/* mhitm.js has resists_acid only as a function nested inside another body, so
 * it cannot be imported; monst.h:276 Resists_Elem(mon, ACID_RES) = MR_ACID. */
function resists_acid_mu(mon) {
    const MR_ACID = 0x08;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_ACID) !== 0;
}
/* C mon.c mhim(mon) — the object pronoun.  js/ carries only trap.js's nested
 * `return "him"` stub; this arm is reached only for a stone missile against a
 * rock-passing monster, which no corpus session throws. */
function mhim_mu(mon) {
    const g = (mon?.female | 0) ? 'her' : 'him';
    return g;
}
/* C mon.c:3253 mondied's caller-side "is it still alive" test is
 * DEADMONSTER(mon) == mon->mhp < 1 (monst.h:214); written inline above. */
/* C decl.c svc.context.mon_moving — TRUE for the whole movemon() block
 * (allmain.c:250).  MEASURED: `context.mon_moving` has ZERO writers anywhere in
 * js/ — js/cmd.js:3557,4361,4451 and js/mhitm.js:2237 all read a field nothing
 * assigns, so every one of them is permanently false.  What allmain.js:818/846
 * and :2379/2381 actually maintain is `game._inMovemonBlock`, so read that and
 * keep the C-named field as the fallback for whenever it acquires a writer.
 * Getting this backwards is not cosmetic: ohitmon's setmangry() arm fires only
 * when mon_moving is FALSE, and defaulting-to-false made a thrown dagger anger
 * the hero's own pet — which is what put a second message (and a spurious
 * --More--) on seed0002 step 257 where C has exactly one. */
function mon_moving_mu() {
    return !!(game._inMovemonBlock || game.context?.mon_moving);
}

/* C ref: mthrowu.c:596 m_throw(mon, x, y, dx, dy, range, obj) — fly a monster's
 * missile from <x,y> along <dx,dy> for up to `range` squares.
 *
 * Ported for the single-object, non-tethered, non-ammo flight the AT_SPIT path
 * produces.  The C control flow and its RNG order are preserved exactly:
 *   per loop iteration, AFTER the square is resolved: forcehit = !rn2(5)
 *   on reaching the hero:  thitu(8, 0, &obj, NULL)      -> rnd(20)
 *   at end of path:        drop_throw(obj, 0, ...)      -> rn2(100)
 * seed4500 step 274: distmin 3, so C draws rn2(5) rn2(5) rnd(20) rn2(5) rn2(100)
 * in that order — the thitu roll lands BETWEEN the second and third forcehit
 * because the hero is resolved at the top of the third iteration and the
 * forcehit draw is at the bottom of it.
 *
 * GAPs, each an arm C has and we do not, none of them on a corpus flight path:
 *   - tmp_at()/nh_delay_output animation (display RNG, a separate stream)
 *   - ohitmon() when a monster is in the flight path — UNPORTED and it DRAWS,
 *     so a spit that crosses another monster still diverges
 *   - ucatchgem (hero poly'd into a unicorn) / potionhit
 *   - the tethered-weapon return flight
 */
export async function m_throw(mon, x, y, dx, dy, range, obj) {
    let singleobj;
    let blindinc = 0;
    let bx = x, by = y;

    /* C mthrowu.c:589-591 — gb.bhitpos tracks the missile, and ohitmon()/hit()/
     * miss() all read it rather than taking coordinates.  This port carried the
     * flight position only in the locals bx/by, so those three read whatever
     * bhitpos a previous zap/apply had left behind. */
    const gb = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    gb.x = x;
    gb.y = y;
    (game.gn || (game.gn = {})).notonhead = false; /* C:591 reset stale value */

    /* C mthrowu.c:606-609 — a wielded aklys/boomerang comes back on a tether. */
    const arw = autoreturn_weapon(obj);
    const tethered_weapon = (obj === MON_WEP(mon) && !!arw && !!(arw.tethered | 0));
    /* C mthrowu.c:587 `return_flightpath = FALSE` — set when the flight ends in
     * a way that hands the missile back to return_from_mtoss (C:788-793 and
     * C:814-820) rather than dropping it on the floor. */
    let return_flightpath = false;

    /* C mthrowu.c:626-644 — remove the missile from the thrower's inventory
     * NOW ("the infamous 2^32-1 orcish dagger bug"); a stack of >1 is split
     * first.  For a VENOM the extraction is a documented no-op (it is already
     * OBJ_FREE, C's comment at mthrowu.c:626). */
    if (((obj.quan ?? 1) | 0) === 1) {
        if (MON_WEP(mon) === obj)
            setmnotwielded(mon, obj);
        extract_from_minvent_dm(mon, obj);
        singleobj = obj;
        obj = null;
    } else {
        singleobj = (await splitobj(obj, 1));
        extract_from_minvent_dm(mon, singleobj);
    }
    game.thrownobj = singleobj;
    if (game.gt) game.gt.thrownobj = singleobj;
    singleobj.owornmask = 0;
    if (!canseemon_mu(mon))
        singleobj.dknown = 0;

    /* C mthrowu.c:622-637 — a cursed or greased missile can slip out of the
     * thrower's grip and fly off in a random direction:
     *   if ((singleobj->cursed || singleobj->greased) && (dx || dy) && !rn2(7))
     * The rn2(7) is drawn on EVERY throw of a cursed-or-greased object that has
     * a direction, whether or not the misfire fires, so its absence shifted the
     * whole leaf stream from the first such throw onward.  Measured on three
     * train sessions whose FIRST skipped C draw is exactly this leaf
     * (`rn2(7) @ m_throw(mthrowu.c:622)`): gen223 (=0, the misfire FIRES and C
     * prints "The dagger slips as the soldier throws it!"), gen039 (=1) and
     * gen315 (=2), where only the draw itself is missing. */
    if (((singleobj.cursed | 0) || (singleobj.greased | 0)) && (dx || dy)
        && !rn2(7)) {
        /* C:623-629 */
        if (canseemon_mu(mon) && (game.flags?.verbose ?? true)) {
            if (is_ammo_mu(singleobj))
                pline(`${Monnam(mon)} misfires!`);
            else
                pline(`${Tobjnam(singleobj, 'slip')} as ${mon_nam_uh(mon)} throws it!`);
        }
        /* C:630-631 */
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        /* C:632-636 — check validity of new direction */
        if (!dx && !dy) {
            await drop_throw(singleobj, 0, bx, by);
            return;
        }
    }

    /* C mthrowu.c:639-642 — blocked before it even starts. */
    if (mt_flightcheck(bx, by, dx, dy, true, false, singleobj)) {
        await drop_throw(singleobj, 0, bx, by);
        return;
    }
    const gm = game.gm || (game.gm = {});
    gm.mesg_given = 0; /* C:648 — no 'missile misses' message shown yet */

    /* C mthrowu.c:655-660 — open the missile-flight animation.  This is not
     * cosmetic for the scorer: the frame captured at a --More-- inside thitu()
     * still carries the LAST flash cell, one square short of the hero (seed0108
     * step 30's `)` at x=43).
     *
     * The DISP_TETHER arm (C mthrowu.c:653) used to be skipped as "a GAP along
     * with the rest of the tethered path", which left the effect stack CLOSED
     * for a tethered throw while the flight loop below still calls
     * tmp_at(bx, by) — and C's tmp_at panics with "tglyph not initialized" when
     * it is handed a position with no effect open.  So the gap was not inert:
     * it halted the run.  Measured on
     * corpus-generated/v5/train/gen177-reseed-seed1374727, where a monster
     * throws its wielded aklys and this port panicked out of the segment.
     * js/display.js's tmp_at implements DISP_TETHER in full (the saved[] walk
     * and tether_glyph painting), so opening it is C-faithful and RNG-free;
     * what remains a GAP is only the RETURN journey (return_flightpath /
     * return_from_mtoss at mthrowu.c:828-830). */
    if (obj_sym_mu(singleobj)) {
        if (!tethered_weapon)
            tmp_at(DISP_FLASH, obj_to_glyph(singleobj));
        else
            tmp_at(DISP_TETHER, obj_to_glyph(singleobj));
    }

    while (range-- > 0) {
        /* C mthrowu.c:674-675 `singleobj->ox = gb.bhitpos.x += dx` */
        bx += dx; by += dy;
        gb.x = bx; gb.y = by;
        singleobj.ox = bx; singleobj.oy = by;
        if (cansee_mu(bx, by))
            observe_object_mu(singleobj);

        let mtmp = uhitm_m_at(bx, by);
        /* C mthrowu.c:680-683 — a shade lets the missile pass harmlessly
         * through; the flight then continues as if the square were empty. */
        if (mtmp && shade_miss_mu(mon, mtmp, singleobj, true, true))
            mtmp = null;
        if (mtmp) {
            /* C mthrowu.c:684-686 */
            if (await ohitmon(mtmp, singleobj, range, true))
                break;
        } else if (u_at_mu(bx, by)) {
            if (game.multi) nomul(0);

            /* C mthrowu.c:719-720 — GAP: ucatchgem (hero poly'd into a
             * unicorn catching a thrown gem); RNG-free in C. */

            /* C mthrowu.c:695 — the hero may catch the missile outright:
             *     if (!tethered_weapon && u_catch_thrown_obj(singleobj))
             * The `!tethered_weapon &&` was missing here, so every monster
             * throw of a WIELDED aklys ran u_catch_thrown_obj's
             * `!rn2(catch_chance)` (mthrowu.c:541) that C never reaches — a
             * draw out of nowhere, on the leaf C spends rolling dmgval.
             * MEASURED, gen177-reseed-seed1374727: C's first divergent leaf is
             * `rnd(6)=4 @ dmgval(weapon.c:265)`, ours `rn2(88)=85` in
             * u_catch_thrown_obj, on the step whose topline reads "You are hit
             * by a thonged club." */
            if (!tethered_weapon && await u_catch_thrown_obj(singleobj))
                break;

            /* C mthrowu.c:725-728 — a thrown POTION never rolls to-hit; it
             * always crashes on the hero:
             *   if (singleobj->oclass == POTION_CLASS) {
             *       potionhit(&gy.youmonst, singleobj, POTHIT_MONST_THROW);
             *       break;
             *   }
             * potionhit() consumes the object (obfree), so the `break` skips
             * the drop_throw/flight tail entirely. */
            if ((singleobj.oclass | 0) === POTION_CLASS_MU) {
                await potionhit(_hero_monst_mu(), singleobj, POTHIT_MONST_THROW_MU);
                break;
            }

            let hitu;
            /* C mthrowu.c:732-771 — EGG / CREAM_PIE / BLINDING_VENOM take the
             * flat thitu(8, 0, ...) arm; everything else takes `default:`. */
            if ((singleobj.otyp | 0) === BLINDING_VENOM_MU
                || (singleobj.otyp | 0) === CREAM_PIE_M_THROW_MU
                || (singleobj.otyp | 0) === EGG_M_THROW_MU) {
                hitu = await thitu_mu(8, 0, singleobj, null);
            } else {
                /* C mthrowu.c:752-770 default: */
                let dam = dmgval(singleobj, _hero_monst_mu());
                let hitv = 3 - distmin_mu((game.u?.ux | 0), (game.u?.uy | 0),
                                          mon.mx | 0, mon.my | 0);
                if (hitv < -4)
                    hitv = -4;
                /* C:758-764 — elves get a shooting bonus, orcs don't. */
                if (is_elf_mu(mon.data)
                    && (MKOBJ_OC_SKILL[singleobj.otyp | 0] | 0) === -20 /* -P_BOW */) {
                    hitv++;
                    const mw = MON_WEP(mon);
                    if (mw && (mw.otyp | 0) === ELVEN_BOW_MU)
                        hitv++;
                    if ((singleobj.otyp | 0) === ELVEN_ARROW_MU)
                        dam++;
                }
                if (bigmonst_mu(_hero_permonst_mu()))
                    hitv++;
                hitv += 8 + (singleobj.spe | 0);
                if (dam < 1)
                    dam = 1;
                if ((singleobj.otyp | 0) !== ACID_VENOM_MU)
                    dam = maybe_half_phys_mu(dam);
                hitu = await thitu_mu(hitv, dam, singleobj, null);
            }
            if (ENV.FF_MATTACK_TRACE === '1')
                pushRngLogEntry(`^mthrow_hit[id=${mon.m_id|0} otyp=${singleobj.otyp|0} hit=${hitu ? 1 : 0} mesg=${gm.mesg_given|0} hp=${game.u?.uhp|0}]`);
            /* C mthrowu.c:758-760 — the hero-targeted BLINDING_VENOM arm
             * spends rnd(25) after thitu succeeds.  This is deliberately
             * outside thitu: C defers applying the blindness until the flight
             * cleanup below, after the missile's display effect closes. */
            if (hitu && can_blnd_mu(null, _hero_monst_mu(),
                                    ((singleobj.otyp | 0) === BLINDING_VENOM_MU)
                                        ? AT_SPIT_MU : AT_WEAP_MU,
                                    singleobj)) {
                blindinc = rnd(25);
                if ((singleobj.otyp | 0) === BLINDING_VENOM_MU && !Blind(game))
                    pline('The venom blinds you.');
            }
            /* C mthrowu.c:772 onward is NOT REACHED when the missile killed the
             * hero: thitu -> losehp -> done() does not return in C, so the whole
             * tail below — stop_occupation, drop_throw and drop_throw's
             * breaktest -> obj_resists / should_mulch_missile — is code C never
             * runs.  In this port losehp only FLAGS the death (js/end.js
             * deadhero) and returns, so without this guard the killing arrow
             * still got its landing rolled.
             * MEASURED, seed0030 segment 6 step 240: after C's last leaf
             * `rnd(20)=4 @thitu(mthrowu.c:106)` C's very next leaf is
             * `rn2(2)=1 @can_make_bones(bones.c:377)`; this port drew
             * rn2(2)/rn2(3) @should_mulch_missile and rn2(100) @obj_resists
             * first, so its can_make_bones read the wrong value, returned
             * FALSE, and no bones file was written for segment 9 to load.
             * Same guard, same reason, as js/zap.js:3537.
             * `break`, not `return`: C's process really does end here, but this
             * port replays the NEXT segment in the same module instances, and
             * js/display.js's tmp_at() effect stack is module state.  A bare
             * return skipped the `tmp_at(DISP_END, 0)` in this function's tail
             * and left _tglyph non-null forever, so the FIRST tmp_at of a later
             * segment took the nested-effect arm and threw
             * `not yet ported: alloc` — measured as seed0030 segment 9 halting
             * at step 260 (gas-spore explode -> tmp_at) and forfeiting 208 step
             * points.  Breaking out runs the display-only, RNG-free tail. */
            if (game._pendingDeath)
                break;
            /* C mthrowu.c:772-786 — GAPs: the opoisoned `poisoned()` call
             * (DRAWS in C; no corpus missile is poisoned), blindinc/make_blinded
             * (RNG-free) and the EGG make_stoned arm. */
            await stop_occupation();
            if (hitu) {
                /* C mthrowu.c:788-793 — a TETHERED weapon is not dropped where
                 * it struck; it is queued for the return journey. */
                if (!tethered_weapon)
                    await drop_throw(singleobj, hitu, (game.u?.ux | 0), (game.u?.uy | 0));
                else
                    return_flightpath = true;
                break;
            }
        }

        /* C mthrowu.c:798 — forcehit is rolled every iteration that did not
         * already break out. */
        const forcehit = !rn2(5);
        void forcehit; /* only hits_bars consumes it, and that arm is a GAP */
        if (!range || mt_flightcheck(bx, by, dx, dy, false, forcehit, singleobj)) {
            /* C mthrowu.c:810-814 — "<The missile> misses." when a multishot
             * volley overshoots in view. */
            if (range && cansee_mu(bx, by) && gm.m_shot && (gm.m_shot.n | 0) > 1
                && (!gm.mesg_given || bx !== (game.u?.ux | 0) || by !== (game.u?.uy | 0)))
                pline(`${the(mshot_xname(singleobj))} misses.`);
            /* C mthrowu.c:814-820 — same fork as the hit case above. */
            if (!tethered_weapon)
                await drop_throw(singleobj, 0, bx, by);
            else
                return_flightpath = true;
            break;
        }
        /* C mthrowu.c:824-825 — advance the flash one square. */
        tmp_at(bx, by);
        nh_delay_output_mu();
    }
    /* C mthrowu.c:827-833 — one last flash at the resting square, then close
     * the animation (DISP_END erases it).
     *
     * NOT REACHED WHEN THE MISSILE KILLED THE HERO.  thitu -> losehp -> done()
     * does not return in C, so the flash is still lit at its LAST in-loop
     * square when the game ends, and every frame from there on keeps it: C's
     * screen for seed0030 segment 6 steps 241-246 shows ")" at (27,13) — the
     * square the arrow was on when "You are hit by an arrow!" was plined — and
     * so does the tombstone page behind it.  This port defers the death, ran
     * the tail, and DISP_END's newsym put the floor's ")" back to the pile's
     * "?" on all six frames.
     *
     * C does tear the effect stack down, but at EXIT: save.c:1088
     * freedynamicdata() calls `tmp_at(DISP_FREEMEM, 0)` — "in case game ends
     * with tmp_at() in progress" — which unwinds the stack WITHOUT erasing.
     * That is what this port needs too, because js/display.js's _tglyph is
     * module state that survives into the next runSegment().
     *
     * pending_death_is_final(), not the bare flag: a lifesaved or
     * wizard-declined death DOES return from done() in C and the flight really
     * does finish. */
    if (pending_death_is_final()) {
        tmp_at(DISP_FREEMEM, 0);
    } else {
        tmp_at(bx, by);
        nh_delay_output_mu();
        /* C mthrowu.c:829-833
         *     if (arw && return_flightpath)
         *         return_from_mtoss(mon, singleobj, tethered_weapon);
         *     else
         *         tmp_at(DISP_END, 0);
         * return_from_mtoss closes the effect stack itself (DISP_END/BACKTRACK
         * on the tethered arm, plain DISP_END on the others). */
        if (arw && return_flightpath)
            await return_from_mtoss(mon, singleobj, tethered_weapon);
        else
            tmp_at(DISP_END, 0);
    }
    gm.mesg_given = 0; /* C:835 reset */
    /* C mthrowu.c:836-839 — apply the deferred hero blindness after the
     * missile flight has ended.  ucreamed is separate from HBlinded because
     * timeout decay removes the cream contribution independently. */
    if (blindinc) {
        const u = game.u || (game.u = {});
        u.ucreamed = (u.ucreamed | 0) + blindinc;
        make_blinded_real_mu(BlindedTimeout_mu() + blindinc, false);
        if (!Blind(game))
            Your1('vision quickly clears.');
    }
    /* C mthrowu.c:836 `gt.thrownobj = 0` is NOT REACHED when the missile killed
     * the hero, and that matters: done_object_cleanup() (end.c:881) places a
     * still-OBJ_FREE gt.thrownobj on the map so it goes into the bones file.
     * MEASURED, seed0030 segment 6: the arrow that kills the Priestess is placed
     * at (28,12) — `u.ux + u.dx, u.uy + u.dy` — inside done(), between
     * `^botl[done]` and `rn2(2) @can_make_bones`, and segment 9 reads it back
     * as one of its 49 bones objects.  Clearing it here dropped that object. */
    if (!game._pendingDeath) {
        game.thrownobj = null;
        if (game.gt) game.gt.thrownobj = null;
    }
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

/* C hacklib.c sgn(). */
function sgn_mtoss(x) { return (x > 0) ? 1 : (x < 0) ? -1 : 0; }

/* C mthrowu.c:883 `static long do_not_annoy = 0;` — a FUNCTION-STATIC that
 * throttles the "returns to <its> hand!" message to once per 500 moves.  It is
 * process lifetime in C, so it is module state here. */
let _mtoss_do_not_annoy = 0;

/* C ref: mthrowu.c:849-965 return_from_mtoss(magr, otmp, tethered_weapon) —
 * the return journey of a monster's thrown-and-returning weapon.  C's whole
 * arwep[] table is one row, the AKLYS (weapon.c:512-517), so in practice this
 * is a monster throwing its wielded thonged club and getting it back.
 *
 * TWO DRAWS, and both were missing because the entire return journey was a
 * documented GAP in m_throw's header:
 *   C:858  int made_it_back = rn2(100)   -- in the declaration's initializer,
 *          so it is UNCONDITIONAL once this function is entered
 *   C:881  if (!impaired && rn2(100))    -- the catch test
 * MEASURED on corpus-generated/v5/train/gen177-reseed-seed1374727: with
 * m_throw's `!tethered_weapon` guard restored, C's next two leaves after the
 * aklys hits the hero are exactly
 *     rn2(100)=26 @ return_from_mtoss(mthrowu.c:858)
 *     rn2(100)=97 @ return_from_mtoss(mthrowu.c:881)
 * and C's topline reads "The thonged club returns to its hand!".
 *
 * GAPs, all on the not-caught arms and all RNG-free:
 *   C:935-936 artifact_hit() when the returning weapon is an artifact
 *   C:952-958 the splash/plop sound effects (is_lava is not in this port)
 *   C:959-960 obj_sheds_light -> vision_full_recalc
 */
async function return_from_mtoss(magr, otmp, tethered_weapon) {
    const impaired = !!((magr.mconf | 0) || (magr.mstun | 0)
                        || (magr.mblinded | 0));
    let notcaught = false, hits_thrower = false;
    const gb = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    let x = gb.x | 0, y = gb.y | 0;
    /* C:858 */
    const made_it_back = rn2(100);
    let dmg = 0;

    if (otmp && made_it_back) {
        /* C:860-878 — it made it back to the thrower's location. */
        if (tethered_weapon) {
            tmp_at(DISP_END, BACKTRACK_MU);
        } else {
            const sdx = sgn_mtoss(x - (magr.mx | 0)),
                  sdy = sgn_mtoss(y - (magr.my | 0));
            if (x !== (magr.mx | 0) || y !== (magr.my | 0)) {
                tmp_at(DISP_FLASH, obj_to_glyph(otmp));
                while (isok_mu(x, y)
                       && (x !== (magr.mx | 0) || y !== (magr.my | 0))) {
                    tmp_at(x, y);
                    nh_delay_output_mu();
                    x -= sdx;
                    y -= sdy;
                }
                tmp_at(DISP_END, 0);
            }
        }
        x = magr.mx | 0;
        y = magr.my | 0;
        /* C:881 */
        if (!impaired && rn2(100)) {
            /* C:885-889 */
            if (!_mtoss_do_not_annoy
                || ((game.moves | 0) - _mtoss_do_not_annoy) > 500) {
                pline(`${Tobjnam(otmp, 'return')} to `
                      + `${s_suffix(mon_nam_uh(magr))} `
                      + `${mbodypart_mu(magr, HAND_MU)}!`);
                _mtoss_do_not_annoy = game.moves | 0;
            }
            /* C:890-896 */
            await add_to_minv(magr, otmp);
            if (tethered_weapon) {
                magr.mw = otmp;
                otmp.owornmask = (otmp.owornmask | 0) | W_WEP_MU;
            }
            if (cansee_mu(x, y))
                newsym(x, y);
        } else {
            /* C:899-925 — it came back but the thrower failed to catch it. */
            dmg = rn2(2);
            if (!dmg) {
                if (canseemon_mu(magr)) {
                    /* C:905-908, with mlevitating hardcoded FALSE ("msg
                     * future-proofing only", C:900). */
                    pline(`${Tobjnam(otmp, 'return')} back to `
                          + `${mon_nam_uh(magr)}, landing at ${mhis(magr)} `
                          + `${makeplural(mbodypart_mu(magr, FOOT_MU))}.`);
                } else if (!Deaf_mu()) {
                    You_hear_mu(`something land near ${mon_nam_uh(magr)}.`);
                }
            } else {
                dmg += rnd(3);
                if (canseemon_mu(magr)) {
                    pline(`${Tobjnam(otmp, 'fly')} back toward `
                          + `${mon_nam_uh(magr)}, hitting ${mhis(magr)} arm!`);
                } else if (!Deaf_mu()) {
                    You_hear_mu(`something hit ${mon_nam_uh(magr)} with a thud!`);
                }
                hits_thrower = true;
            }
            notcaught = true;
        }
    } else {
        /* C:926-932 — it didn't make it back. */
        if (tethered_weapon)
            tmp_at(DISP_END, 0);
        You_hear_mu('a loud snap!');
        notcaught = true;
    }
    if (otmp) {
        if (hits_thrower) {
            /* C:935-936 artifact_hit is a GAP (no artifact aklys in C's
             * arwep[] reach). */
            magr.mhp = (magr.mhp | 0) - dmg;
            if ((magr.mhp | 0) <= 0) {
                /* C:939 monkilled(magr, canspotmon(magr) ? "" : NULL, AD_PHYS)
                 * — a NULL fltxt suppresses the message; js/trap.js's shared
                 * monkilled body always prints when the square is seen, so the
                 * unseen case is routed with the message it would print
                 * anyway.  RNG-free either way. */
                await monkilled_mu(magr, '');
            }
        }
        if (notcaught) {
            /* C:942-951 */
            await snuff_candle_mu(otmp);
            if (!(await ship_object(otmp, x, y, false))) {
                if (await flooreffects_mu(otmp, x, y, 'drop')) {
                    if (cansee_mu(x, y))
                        newsym(x, y);
                    return;
                }
                place_object(otmp, x, y);
                await stackobj(otmp);
            }
            /* C:952-960 — sound effects and obj_sheds_light: GAP, RNG-free. */
        }
    }
    /* C:963-964 */
    if (cansee_mu(x, y))
        newsym(x, y);
}

/* C mthrowu.c:604 `char sym = obj->oclass` — the animation is opened only when
 * the object has a display class at all (always true for a real object). */
function obj_sym_mu(obj) { return (obj.oclass | 0) !== 0; }
/* C's nh_delay_output — a no-op in this port (js/display.js:4958 says the same). */
function nh_delay_output_mu() { }
/* JS otyps used by m_throw's flat-thitu arm — see drop_throw's copies. */
const CREAM_PIE_M_THROW_MU = 287, EGG_M_THROW_MU = 266;
/* C obj.h:477 POTHIT_MONST_THROW (POTION_CLASS_MU is declared at :2516). */
const POTHIT_MONST_THROW_MU = 2;

/* C ref: mthrowu.c:533 u_catch_thrown_obj(otmp) — the hero may catch a thrown
 * object; it is added to inventory if possible.
 * RNG: rn2(catch_chance) — and it is the LAST test, so every guard above it
 * must be right or the draw happens at the wrong moment (or not at all).
 * seed0108 step 30: a Dex-18 wizard gives catch_chance 82, which is C's
 * `rn2(82)=63` at leaf 2789. */
async function u_catch_thrown_obj(otmp) {
    const u = game.u || {};
    /* attrib.h A_DEX == 3 (js/const.js:241).  acurr() translates the C
     * constant into the display-ordered u.acurr.a slot itself. */
    const catch_chance = 100 - (acurr(u, A_DEX) | 0)
        - ((_Role_if_mu(PM_MONK_MU) || _Role_if_mu(PM_ROGUE_MU)) ? 20 : 0);
    const SLT_ENCUMBER = 1; /* hack.h */

    if (!Blind_mu() && !Confusion_mu() && !Stunned_mu() && !Fumbling_mu()
        && (otmp.oclass | 0) !== VENOM_CLASS_MU
        && !nohands_mu(_hero_permonst_mu()) && freehand()
        && calc_capacity(otmp.owt | 0) <= SLT_ENCUMBER
        && !rn2(catch_chance)) {
        /* C:543-548
         *     Snprintf(buf, BUFSZ, "You catch the %s!", simpleonames(otmp));
         *     (void) hold_another_object(otmp, "You catch, but drop, the %s.",
         *                                simpleonames(otmp), buf);
         *     return TRUE;
         * hold_another_object lives in js/hold_another_object.js (invent.c:1208);
         * it was a throwing stub here until 2026-09-01, which HALTED the scored
         * replay of any session that reached a successful catch — gen137 stopped
         * at frame 173 of 219.  Note simpleonames() is evaluated TWICE by C, once
         * per argument, and it is RNG-free, so one call is faithful.
         *
         * NO RECORDING IN THIS REPO CONTAINS A SUCCESSFUL CATCH: this site draws
         * 46 times across 19 train sessions and 10 times across the 44 public
         * ones, and not one of the 56 draws returned 0.  So everything below the
         * `!rn2(catch_chance)` is written from the C source and has no corpus
         * ground truth behind it. */
        const nm = simpleonames_mu(otmp);
        await hold_another_object(otmp, 'You catch, but drop, the %s.', nm,
                            `You catch the ${nm}!`);
        return true;
    }
    return false;
}
/* Hero-property shims for u_catch_thrown_obj.  Each names the C macro it
 * stands for; the underlying property plumbing lives in js/const.js's uprops
 * numbering (see js/mhitu.js's own Blind handling above). */
/* C flags.initrole is an index into roles[] (C flag.h "index into roles[]"),
 * NOT a PM_ mons[] index, and the two orders DISAGREE for exactly this pair:
 * nethack-c-v5/upstream/src/role.c lists ... Priest(6), ROGUE(7), Ranger(8) ...
 * while mons[] has PM_RANGER 338 before PM_ROGUE 339.  ROGUE was written 8 here
 * — Ranger's index — so `Role_if(PM_ROGUE)` answered FALSE for every rogue.
 * MEASURED on corpus-generated/v5/train/gen387-reseed-seed1075442 (a Rogue with
 * DEX 18): C's u_catch_thrown_obj draws `rn2(62)` (100 - 18 - 20) and this port
 * drew `rn2(82)`, missing the 20-point Monk/Rogue catch bonus entirely.
 * js/u_init.js:46 and js/skills.js:54 already carry ROLE_ROGUE = 7; this file
 * was the odd one out.  The names keep the PM_ prefix they were introduced
 * with, but they are ROLE indices — see [[PM_ prefix hides a role index]]. */
const PM_MONK_MU = 5, PM_ROGUE_MU = 7;
function _Role_if_mu(role_idx) {
    const ir = (game.flags && game.flags.initrole != null)
        ? (game.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === role_idx;
    return ((game.urole && game.urole.mnum != null)
        ? (game.urole.mnum | 0) : -1) === role_idx;
}
/* Same reader as js/trap.js:2114 Blind_thitu — u.uprops[<numeric>] is the only
 * spelling anything writes (the string-keyed reads elsewhere are dead). */
function _uprop_on_mu(idx) {
    const p = game.u?.uprops?.[idx];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
function Blind_mu() { return _uprop_on_mu(BLINDED); }
function Confusion_mu() { return _uprop_on_mu(CONFUSION); }
function Stunned_mu() { return _uprop_on_mu(STUNNED); }
function Fumbling_mu() { return _uprop_on_mu(FUMBLING); }
/* C mondata.h:52 nohands(ptr) = (ptr->mflags1 & M1_NOHANDS) != 0.  Absent
 * permonst defaults to "has hands" (the same convention as js/cmd.js:5332). */
function nohands_mu(ptr) {
    const M1_NOHANDS = 0x00002000;
    return !!ptr && ((ptr.mflags1 | 0) & M1_NOHANDS) !== 0;
}
function welded_mu(obj) {
    return !!(obj && (obj.cursed | 0) && ((obj.owornmask | 0) & 0x100));
}

/* C ref: mthrowu.c:1268 spitmu(mtmp, mattk) = spitmm(mtmp, mattk, &youmonst).
 * The hero-monst is passed as null because this port has no global youmonst
 * record; spitmm reads that as "the target is the hero". */
export async function spitmu(mtmp, mattk) {
    return await spitmm(mtmp, mattk, null);
}

/* C ref: mthrowu.c's impossible() — a local shim so the arms above read like
 * C without dragging new modules in.  s_suffix_mu was a SECOND copy of
 * hacklib.c's s_suffix in this one file (the first is at :369), and it carried
 * only two of C's four arms — it printed "Its" as "It's" and "You" as "You's".
 * It now forwards to the shared body. */
function s_suffix_mu(s) { return s_suffix(s); }
function impossible_mu(msg) { void msg; }
/* C hacklib.c sgn(n) — -1 / 0 / 1. */
function sgn_mu(n) { return (n | 0) < 0 ? -1 : ((n | 0) > 0 ? 1 : 0); }
/* C hack.h distmin(x0,y0,x1,y1) = max(|x0-x1|, |y0-y1|). */
function distmin_mu(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

/* C ref: mhitu.c:446 calc_mattacku_vars (subset needed for hand-to-hand).
 * range2 = !monnear(mux,muy); foundyou = u_at(mux,muy); ranged = mdistu>3.
 *
 * `mdistu(mon)` is hack.h:1532 `distu(mon->mx, mon->my)`, and hack.h:1531
 * `distu(xx,yy) = dist2(xx, yy, u.ux, u.uy)` — dist2 is SQUARED EUCLIDEAN
 * distance ((dx*dx)+(dy*dy)), not Chebyshev.  This function's `ranged` used
 * `Math.max(|dx|,|dy|)` (Chebyshev) instead, so a monster exactly 2 tiles away
 * in a straight line — dist2 = 0*0+2*2 = 4 > 3 (C: ranged) — read Chebyshev 2,
 * not > 3, and came out "close" (C: far).  `ranged` itself had no reader
 * anywhere until mattacku's `!ranged -> nomul(0)` was wired, so the wrong
 * formula was invisible until then; fixed together because shipping the wrong
 * distance formula under a newly-wired reader is the same defect as never
 * wiring it. MEASURED: three records (a gnome lord/ice troll/goblin each 2
 * tiles from the hero) went from correct (unreached) to `hero.multi:EXTRA` /
 * `context.run:EXTRA` with the Chebyshev formula, and are clean with dist2. */
function calc_mattacku_vars(mtmp) {
    const u = game.u || {};
    const mux = (mtmp.mux !== undefined ? mtmp.mux : (u.ux | 0)) | 0;
    const muy = (mtmp.muy !== undefined ? mtmp.muy : (u.uy | 0)) | 0;
    const mdistu = dist2((mtmp.mx | 0), (mtmp.my | 0), (u.ux | 0), (u.uy | 0));
    const ranged = mdistu > 3;
    const adx = Math.abs((mtmp.mx | 0) - mux), ady = Math.abs((mtmp.my | 0) - muy);
    const range2 = !(adx <= 1 && ady <= 1); /* !monnear(mux,muy) */
    const foundyou = (mux === (u.ux | 0) && muy === (u.uy | 0));
    return { ranged, range2, foundyou };
}

/* C mondata.h — mflags2 bit tests.  M2_WERE 0x00000004, M2_DEMON 0x00000100
 * (include/monflag.h:125,131); NON_PM is -1 (include/monsters.h). */
const M2_WERE_MU = 0x00000004, M2_DEMON_MU = 0x00000100, NON_PM_MU = -1;
function is_were_mu(ptr) { return ((ptr?.mflags2 | 0) & M2_WERE_MU) !== 0; }
function is_demon_mu(ptr) { return ((ptr?.mflags2 | 0) & M2_DEMON_MU) !== 0; }

/* C mhitu.c:955-1012 summonmu(mtmp, youseeit) — "monster summons help for its
 * fight against hero".  DEMON ARM ONLY:
 *
 *     if (is_demon(mdat)) {
 *         if (mdat != &mons[PM_BALROG] && mdat != &mons[PM_AMOROUS_DEMON]) {
 *             if (!rn2(Inhell ? 10 : 16))
 *                 (void) msummon(mtmp);
 *         }
 *         return;
 *     }
 *
 * The `youseeit` parameter is only read by the were arm's "%s summons help!"
 * pline, so it is not threaded here.
 *
 * The demon arm is synchronous in this file.  The were arm is async only
 * because makemon() is async in JS, so its caller awaits this helper. */
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

    /* C:976-984 — human-form weres may become beasts; beast-form weres
     * normally revert.  Both rn2 gates are in the C short-circuit order. */
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
        const numhelp = await were_summon_real(mtmp.data, false, visible, 'creature');
        if (youseeit) {
            await pline(`${Monnam(mtmp)} summons help!`);
            if (numhelp > 0) {
                if ((visible.value | 0) === 0)
                    await pline('You feel hemmed in.');
            } else {
                await pline('But none comes.');
            }
        } else if (numhelp > 0 && (visible.value | 0) === 0) {
            await pline('You feel hemmed in.');
        }
    }
}

/* ── engulf / swallow ────────────────────────────────────────────────────────
 * C ref: mhitu.c:1289-1584 gulpmu() and mhitu.c:264-305 expels().
 *
 * Before this landed, AT_ENGL fell through mattacku's `default:` and drew
 * NOTHING, so a swallowing monster's whole turn was invisible to the port.
 * MEASURED on seed0383-wizard-hallucinate leaf 10282 (0-based 10281): C draws
 * `rnd(20)=14 @mattacku(mhitu.c:848)`, the AT_ENGL to-hit, and then the three
 * gulpmu draws below; this port went straight on to the next monster's
 * mcalcmove rn2(12).  The ice vortex's "The ice vortex engulfs you!" and the
 * cyan "/o\ x@x \s/" stomach cage are 50+ frames of that session.
 *
 * C's monattk.h numbering: AT_ENGL 11, AD_DGST 1, AD_PHYS 0, AD_ACID 8,
 * AD_BLND 11, AD_ELEC 6, AD_COLD 3, AD_FIRE 2, AD_DISE 26, AD_DREN 34. */
/* Helpers this engulf port needs from other modules.  Aliased on import in the
 * file's own idiom (mon_nam_uh / bot_mu / ...) so the local file-scope names
 * above are not shadowed. */
const A_CON_GU = 2; /* attrib.h A_CON */
const AT_ENGL_MU = 11;
/* monattk.h:42-76.  THREE of these were wrong, and not with 3.7's numbers
 * either — 3.7 and 5.0 agree on every AD_* below, so they were transcription
 * errors from the start:
 *   AD_DGST said 1  (that is AD_MAGM) — so the digestion arm of the switch and
 *                   digests_gu()'s "swallows you whole" wording were keyed to a
 *                   damage type no engulfer has, and a trapper/lurker above/
 *                   purple worm fell through to the AD_DISE label below.  It
 *                   also mis-selects the first-engulf timer: C branches on
 *                   AD_DGST to draw rn2(20) instead of rnd(m_lev + 5).
 *   AD_DISE said 26 (that is AD_DGST) — the mis-catch above.
 *   AD_DREN said 34 (that is AD_DCAY) — so an ENERGY VORTEX (AT_ENGL/AD_DREN)
 *                   missed its arm's rn2(4) and landed in `default`, which sets
 *                   physical_damage and therefore draws rnd(-u.uac) instead.
 * NO train or public session engulfs with AD_DGST or AD_WRAP today (grep for
 * "swallows you whole" / "folds itself around you": 0 of 688 and 0 of 44), so
 * those two are structural with no measurable delta; AD_DREN has two train
 * sessions naming an energy vortex.  Corrected together because a wrong
 * constant beside a correct one is how the next reader is misled. */
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
function digests_gu(mndx) { return _engl_dmgtype_gu(mndx, AD_DGST_GU); }
function enfolds_gu(mndx) { return _engl_dmgtype_gu(mndx, AD_WRAP_GU); }
/* C mondata.h:57 is_whirly(ptr) — mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL].
 * monsym.h S_VORTEX is monster class 22; PM_AIR_ELEMENTAL is 154. */
const S_VORTEX_GU = 22, PM_AIR_ELEMENTAL_GU = 154;
function is_whirly_gu(mndx, data) {
    const mlet = (data && data.mlet != null) ? (data.mlet | 0) : -1;
    return mlet === S_VORTEX_GU || (mndx | 0) === PM_AIR_ELEMENTAL_GU;
}
/* C mondata.h:59-61 flaming(ptr) — fire vortex / flaming sphere / fire elemental
 * / salamander (pm.generated.js indices). */
const _FLAMING_MNDX_GU = new Set([111 /* fire vortex */, 168 /* flaming sphere */,
                                  270 /* fire elemental */, 189 /* salamander */]);
function flaming_gu(mndx) { return _FLAMING_MNDX_GU.has(mndx | 0); }
/* Hero property reader.  Same two-spelling problem js/display.js:_uprop
 * documents: some writers use u.uprops[<idx>], some a mirrored u.H<name>. */
function _uprop_on_gu(idx) {
    const p = game.u?.uprops?.[idx];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* C const.js SHOCK_RES/ACID_RES are 5/7 (js/const.js:2332,2334); this file's
 * copy had 4/6 (DISINT_RES/POISON_RES's ids), so Shock_resistance_gu() and
 * Acid_resistance_gu() read the WRONG uprops slot and always saw it unset for
 * a hero whose real shock/acid resistance lives at index 5/7.  MEASURED on a
 * captured gulpmu (energy vortex AD_ELEC, mattacku-green-pin record #103): the
 * hero has real shock resistance (uprops[5].intrinsic nonzero) and C's own
 * recorded outcome shows no uhp/umh change at all (the AD_ELEC arm's
 * `if (Shock_resistance) { ...; tmp = 0; }` fired), while this port read
 * uprops[4] (unset), took the "not resistant" else-arm, and applied the
 * drawn d(1,6) as real damage to u.mh — a phantom hit C never dealt. */
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
    if ((u.utrap | 0) || (magr?.mtrapped | 0))
        return false;
    const loc = game.level?.at?.(u.ux | 0, u.uy | 0);
    if (loc && (IS_OBSTRUCTED_MU(loc.typ | 0) || closed_door_mu(u.ux | 0, u.uy | 0)))
        return false;
    return true;
}

/* C ref: mhitu.c:264-305 expels(mtmp, mdat, message).
 *
 * C's tail is
 *     unstuck(mtmp);              / * ball&chain returned in unstuck() * /
 *     mnexto(mtmp, RLOC_NOMSG);
 *     newsym(u.ux, u.uy);
 *     if (um_dist(mtmp->mx, mtmp->my, 1))
 *         pline("Brrooaa...  You land hard at some distance.");
 *     spoteffects(TRUE);
 *
 * The mnexto() was omitted with the note "the corpus reaches this path with
 * the swallower already adjacent", which is not what mnexto tests: it
 * RE-PLACES the swallower via enexto()/collect_coords whether or not it is
 * already adjacent, and collect_coords shuffles its candidate list with a
 * descending rn2 ladder.  MEASURED on seed0383 leaf 10917, immediately after
 * the `rnd(2) @unstuck(mon.c:3465)` both sides do agree on: C draws
 * rn2(8) rn2(7) rn2(6) rn2(5) rn2(4) rn2(3) ... @collect_coords(teleport.c:700)
 * and this port drew the next monster's distfleeck rn2(5) instead.
 *
 * spoteffects(TRUE) is shared with other landing callers and is awaited so
 * trap effects finish before the interrupted monster turn resumes.
 *
 * The `message` arm is written out in full since gulpmu's own expulsion passes
 * message=FALSE and prints "You get expelled!" itself. */
export async function expels_gu(mtmp, mndx, message) {
    /* Callers may pass a live monster number (`mnum`), while the attack table
     * and C's `struct permonst *` predicates are indexed by species. */
    const pmndx = (mtmp?.data?.pmidx ?? mndx) | 0;
    (game.disp ||= {}).botl = 1;
    if (message) {
        if (digests_gu(pmndx)) {
            pline('You get regurgitated!');
        } else if (enfolds_gu(pmndx)) {
            pline(`${Monnam(mtmp)} unfolds and you are released!`);
        } else {
            let blast = '';
            if (is_whirly_gu(pmndx, mtmp.data)) {
                const attks = mon_mattk_raw(pmndx) || [];
                const attk = attks.find((a) => a && ((a.aatyp ?? a[0]) | 0) === AT_ENGL_MU);
                if (attk && (((attk.adtyp ?? attk[1]) | 0) === AD_ELEC_GU))
                    blast = ' in a shower of sparks';
                else if (attk && (((attk.adtyp ?? attk[1]) | 0) === AD_COLD_GU))
                    blast = ' in a blast of frost';
            } else {
                blast = ' with a squelch';
            }
            pline(`You get expelled from ${mon_nam(mtmp)}${blast}!`);
        }
    }
    /* C: unstuck(mtmp) — ball&chain returned in unstuck(). */
    await unstuck_mu(mtmp);
    {
        /* C mon.c:3480 unstuck() -> docrt() -> display.c:2064 cls(), whose FIRST
         * statement is `display_nhwindow(WIN_MESSAGE, FALSE)` — it PAGES an
         * unacknowledged topline, and it does so BEFORE clear_nhwindow(WIN_MAP),
         * so the frozen frame still shows the stomach cage.  This port's cls()
         * (js/display.js:4835) DISCARDS `_pending_message` instead, modelling a
         * different call site (the same distinction js/cmd.js:7249 spells out
         * for drag_down's cls()), so the page is forced here, at C's position.
         * MEASURED on seed0383 step 171: C's frame is "You hit the monkey.  You
         * are freezing to death!  You get expelled!--More--" over the cage, and
         * the space at step 172 acknowledges it; this port dropped both later
         * messages and spent that space on "Unknown command ' '.".
         *
         * The topline C pages here is the WHOLE line, and this port keeps it in
         * two channels: `_resultMessage` (the command's own pline, moved there
         * by js/allmain.js's post-rhack block) and `_pending_message` (whatever
         * the world block has added since).  _topl_merge_result is the same
         * `result + "  " + pending` join flush_screen would do, and it carries
         * the join offsets the pager splits on — forcing the page over
         * _pending_message alone dropped the hero's own "You hit the monkey."
         * off the front of C's line. */
        const _joins = _topl_joins_snapshot_mu(game._resultMessage || '');
        const _line = _topl_merge_result_mu(game._resultMessage || '',
                                            game._pending_message || '', _joins);
        if (_line) {
            game._resultMessage = '';
            /* PAGE PER SPLIT, not once for the whole line.  C reaches this
             * display_nhwindow with the earlier plines ALREADY paged by
             * update_topl's CO-1-8 = 71 column reserve, so a topline that owes
             * two page-acks must produce two --More--s here; force_more() alone
             * produced one over-wide page and swallowed the other keystroke.
             * MEASURED on seed0383 step 175: "You hit the spotted jelly.  You
             * are freezing to death!" is 54 columns and appending "  You get
             * expelled!" reaches 73, so C pages there (step 175) and pages the
             * expulsion on its own line (step 176); this port joined all three.
             * force_more_pages() uses flush_screen's own split sequence, so the
             * boundaries are the ones the width rule would have chosen anyway,
             * and installs each pline's recorded map/status frame while paging.
             * The page cannot be DEFERRED to flush_screen (a registered break),
             * because docrt_flags_mu below reaches this port's cls(), which
             * DISCARDS _pending_message — the message would be lost. */
            await force_more_pages_mu(_line);
        }
    }
    /* C mon.c:3478-3480 — still inside unstuck(): `gv.vision_full_recalc = 1;
     * docrt();`.  The whole level was cls()'d by swallowed(1), and this is the
     * repaint that puts it back; it runs BEFORE expels' mnexto, as in C. */
    docrt_flags_mu(0);
    /* C mhitu.c:300-301 — `mnexto(mtmp, RLOC_NOMSG); newsym(u.ux, u.uy);` and
     * NOTHING ELSE.  The old-square and new-square repaints belong to
     * rloc_to_core (js/teleport.js:1070/1104, teleport.c's own
     * `newsym(oldx, oldy)` / `newsym(x, y)` pair), which mnexto already runs —
     * re-issuing them here painted the engulfer's new square TWICE.  That is
     * invisible on the scored RNG stream, because newsym draws none, and
     * invisible on the screen, because the second paint is identical — but a
     * HALLUCINATING hero re-rolls the glyph on every newsym, so the duplicate
     * consumed one extra rn2(383) on the DISPLAY stream and shifted every
     * hallucinated glyph for the rest of the session.  Measured against the C
     * recorder (NETHACK_RNGLOG_DISP=1) on seed0383: C makes 2 display draws
     * between this docrt and the next turn's see_monsters, this port made 3. */
    await mnexto_mu(mtmp, RLOC_NOMSG_MU);
    newsym(game.u.ux | 0, game.u.uy | 0);
    /* C mhitu.c:302-304 — "to cover for a case where mtmp is not in a next
     * square".  um_dist(x, y, n) is hack.c's `distu(x,y) > n*n` test. */
    if (um_dist_mu(mtmp.mx | 0, mtmp.my | 0, 1))
        pline('Brrooaa...  You land hard at some distance.');
    /* C mhitu.c:305 — landing effects can trigger traps or another death. */
    await spoteffects(true);
}

/* C ref: mhitu.c:1289-1584 gulpmu(mtmp, mattk).
 *
 * RNG, in C's order:
 *   d(mattk->damn, mattk->damd)          ALWAYS, at declaration time
 *   [first engulf only, AD_DGST]  rn2(20)          the digestion timer
 *   [first engulf only, else]     rnd(m_lev + 10/2)
 *   [per adtyp]                   rn2(2) / rn2(4) etc.
 *   [physical_damage && u.uac<0]  rnd(-u.uac)
 *
 * MEASURED against the 5.0 recorder on seed0383 leaves 10283-10285:
 *   10283 d(1,6)=3   @gulpmu(mhitu.c:1292)
 *   10284 rnd(12)=9  @gulpmu(mhitu.c:1392)   [m_lev 7 + 10/2 = 12]
 *   10285 rn2(2)=1   @gulpmu(mhitu.c:1503)   [the AD_COLD arm]
 *
 * KNOWN GAPS, each left as C's own no-draw path so the stream is unaffected:
 * the touch_petrifies statue arm, Punished ball&chain relocation, leash
 * snapping, steed dismount, and snuff_lit over the whole pack.  None of them
 * draws; all of them are message/state work this corpus does not reach. */
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
    if ((sickRes?.intrinsic | 0) || (sickRes?.extrinsic | 0)) {
        pline('You feel a slight illness.');
        return false;
    }
    const sick = u.uprops?.[11]; /* SICK, prop.h */
    const current = sick?.intrinsic | 0;
    const duration = current ? Math.trunc(current / 3) + 1
                             : rn1(Math.max(1, acurr_mu(A_CON_GU)), 20);
    const mndx = (mdat?.pmidx ?? mdat?.mnum ?? 0) | 0;
    await make_sick(duration, monPmname_mu(mndx, 0), true,
                    SICK_NONVOMITABLE_MU);
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
        if (failed_grab_mu(mtmp, _hero_monst_mu(), mattk))
            return M_ATTK_MISS;

        remove_monster_gu(omx, omy);
        mtmp.mtrapped = 0; /* no longer on old trap */
        place_monster_mu(mtmp, u.ux | 0, u.uy | 0);
        set_ustuck_mu(mtmp);
        newsym(mtmp.mx | 0, mtmp.my | 0);
        /* C mhitu.c:1316-1346 — the steed arm is a KNOWN GAP (see header). */
        urgent_pline(`${Monnam(mtmp)} ${digests_gu(mndx) ? 'swallows you whole'
                      : enfolds_gu(mndx) ? 'folds itself around you'
                        : 'engulfs you'}!`);
        await real_stop_occupation();
        /* C: reset_occupations() — "behave as if you had moved". */

        /* C mhitu.c:1370 display_nhwindow(WIN_MESSAGE, FALSE) — an
         * unconditional page-ack of the engulf message, so C shows "The <foo>
         * engulfs you!--More--" on a topline of its own and the next turn's
         * damage message starts fresh.  See js/display.js
         * topl_force_break_after for why this is registered by text. */
        topl_force_break_now_mu();
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
    }

    if (mtmp !== u.ustuck)
        return M_ATTK_MISS;
    if ((u.uswldtim | 0) > 0)
        u.uswldtim = (u.uswldtim | 0) - 1;

    switch (mattk.adtyp | 0) {
    case AD_DGST_GU:
        physical_damage = true;
        if ((u.uswldtim | 0) === 0) {
            pline(`${Monnam(mtmp)} totally digests you!`);
            tmp = u.uhp | 0;
        } else {
            pline(`${Monnam(mtmp)}${(u.uswldtim | 0) === 2 ? ' thoroughly'
                   : (u.uswldtim | 0) === 1 ? ' utterly' : ''} digests you!`);
            /* mhitu.c:1432 — a nonfatal digestion exercises Strength. */
            exercise(A_STR_AD, false);
        }
        break;
    case AD_PHYS_GU:
        physical_damage = true;
        pline(`You are ${enfolds_gu(mndx) ? 'being squashed'
                : 'pummeled with debris'}!`);
        if ((mndx | 0) !== 106) {
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
                pline('You feel mildly chilly.');
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
                pline('You feel mildly hot.');
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
        /* C mhitu.c:1470-1485.  A dust vortex is ATTK(AT_ENGL, AD_BLND, 2, 8)
         * (monsters.h:1064), so this is the whole of what an engulfing blinder
         * does: the hero goes blind and STAYS blind for as long as he is
         * inside, because every later turn re-enters here on the `else` arm
         * and adds back the point of timeout nh_timeout() just took off.
         *
         * MEASURED on corpus-generated/v5/train/gen128-reseed-seed1659512
         * step 138 (Wizard, dlvl 11): C's topline is "You can't see in here!"
         * and its status row gains " Blind"; this port printed neither, and
         * the miss run that opens there is 349 frames long — the session's
         * whole remaining screen score.  gen392-reseed-seed77105 step 285 is
         * the same arm for another 271.
         *
         * RNG: none.  can_blnd() is RNG-free on every arm (mondata.c:305) and
         * so is make_blinded() (potion.c:261) — its own `talk` messages are
         * suppressed here because C passes FALSE.  The tmp handed to it is the
         * d(damn,damd) already drawn at the top of gulpmu, and the trailing
         * `tmp = 0` keeps physical_damage's rnd(-u.uac) out of the stream
         * exactly as C does. */
        if (can_blnd_mu(mtmp, game.youmonst || {}, mattk.aatyp | 0, null)) {
            if (!Blind(game)) {
                const was_blinded = Blinded_gu();
                if (!was_blinded)
                    pline("You can't see in here!");
                make_blinded_real(tmp, false);
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
    await mdamageu(mtmp, tmp);
    game.gm.mswallower = 0;
    if (tmp)
        await real_stop_occupation();

    if (!(u.uswallow | 0)) {
        ; /* life-saving has already expelled swallowed hero */
    } else if (!(u.uswldtim | 0)) {
        pline(`You get ${digests_gu(mndx) ? 'regurgitated'
                : enfolds_gu(mndx) ? 'released' : 'expelled'}!`);
        await expels_gu(mtmp, mndx, false);
    }
    return M_ATTK_HIT;
}

/* ══════════════════════════════════════════════════════════════════════════
 * C mhitu.c:308 getmattk(magr, mdef, indx, prev_result, alt_attk_buf) —
 *   "select a monster's next attack, possibly substituting for its usual one"
 *
 * Every attack loop in C goes through this: mattacku (mhitu.c:786), mattackm
 * (mhitm.c:383) and the polymorphed hero's own loop (uhitm.c:5441,5463).  This
 * port read mptr->mattk[indx] raw and so made NONE of the six substitutions.
 *
 * MEASURED on seed4500-knight-coverage step 1759 — the session's first
 * RNG-VALUE divergence, leaf 106531.  A master lich touches a hero who is
 * polymorphed into a brown mold; brown mold is MR_COLD (monsters.h:1627), so
 * Cold_resistance is set FROM_FORM and C's fifth arm (mhitu.c:414-433) rewrites
 * the lich's AT_TUCH/AD_COLD 3d6 into AD_PHYS 2d6 — C draws `d(2,6)=7`, this
 * port drew the untouched `d(3,6)=13`, and the streams never resynchronised
 * (47 wrong frames from step 1759 to the end of the session).  C's own comment
 * on that arm spells the substitution out as a table: master 3d6 -> 2d6.
 *
 * POINTER SEMANTICS.  C returns either a pointer INTO mptr->mattk[] (nothing
 * substituted) or the caller's alt_attk_buf (something was).  js mon_mattk()
 * already returns a fresh object per call, so mutating it cannot corrupt the
 * table — but the elemental arm's `attk != alt_attk_buf` test is load-bearing
 * behaviour (an attack that was ALREADY substituted does not also get the
 * home-elemental doubling), so the "did we substitute?" bit is tracked
 * explicitly rather than being implied by object identity.
 * ══════════════════════════════════════════════════════════════════════════ */
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
 * C mhitu.c:308.  Returns the attack to use for slot `indx`, or null when that
 * slot is NO_ATTK (C returns the AT_NONE row itself; every js caller tests for
 * the null the same way it used to test mon_mattk()'s).
 *
 * @param magr        attacking monster
 * @param udefend     true when the defender is the hero (C: mdef == &youmonst)
 * @param mdef        defending monster when !udefend, else null
 * @param indx        attack slot
 * @param prev_result the caller's sum[]/res[] array of earlier slots' results
 */
function getmattk(magr, udefend, mdef, indx, prev_result) {
    const mndx = (magr.mndx ?? magr.mnum ?? -1) | 0;
    const raw = mon_mattk_raw(mndx);
    const attk = mon_mattk(mndx, indx);
    if (!attk) return null;
    /* C:317 `struct obj *weap = (magr == &youmonst) ? uwep : MON_WEP(magr);` */
    const magr_is_hero = (magr === game.youmonst);
    const weap = magr_is_hero ? (game.u?.uwep ?? null) : MON_WEP(magr);
    /* C's `attk != alt_attk_buf`. */
    let substituted = false;
    /* C's fixed permonst.mattk[NATTK]: slots past the end of the trimmed js row
     * are the implicit {AT_NONE, AD_PHYS, 0, 0}, so an absent adtyp reads 0. */
    const raw_adtyp = (k) => ((raw && raw[k]) ? (raw[k][1] | 0) : 0);
    const raw_aatyp = (k) => ((raw && raw[k]) ? (raw[k][0] | 0) : 0);

    /* C:320-334 — honor SEDUCE=0:
     *     if (!SYSOPT_SEDUCE) {
     *         if (mptr->mattk[0].adtyp == AD_SSEX) { all six -> c_sa_no[indx]; }
     *         else if (attk->adtyp == AD_SSEX)     { adtyp = AD_DRLI; }
     *     }
     * NOT ported, and this is an evidenced skip rather than an assumption:
     * sysopt.seduce is initialised to 1 at sys.c:100 ("if it's compiled in,
     * default to on") and the shipped sysconf's only SEDUCE line is the
     * commented-out `#SEDUCE=0` at sys/unix/sysconf:67, so SYSOPT_SEDUCE is 1
     * for every recording in sessions/.  If a future corpus ships a sysconf
     * that sets it, this arm needs the c_sa_no[] table (monst.c) ported too.
     * The two adtypes it tests are AD_SSEX (monattk.h:77 = 35 -- NOT the
     * AD_SSEX_ = 23 spelled at js/mhitu.js:1419, which is AD_TLPT's number)
     * and AD_DRLI (monattk.h:57 = 15). */

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

    return attk;
}

/* C ref: mhitu.c:489 mattacku — monster attacks the hero.
 * Returns 1 if the monster dies, 0 otherwise.  Scoped to the single
 * hand-to-hand AD_PHYS/AD_ELEC attack used by the corpus monsters. */
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
    /* C:1604 not_affected = defended(mtmp, mattk->adtyp) — mondata.c:91, TRUE
     * only when the EXPLODER wields an artifact that defends against its own
     * damage type, or is an adult dragon / wears dragon scales.  No exploder in
     * monsters.h is a dragon and none is generated with an artifact, so this is
     * structurally FALSE for every AT_EXPL row; js/uhitm.js already carries the
     * same `defended → false` reading.  Written as the C name so the read is
     * visible if an exploder ever does wield one. */
    not_affected = false;

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
        not_affected = resists_blnd_real_mu(gs.youmonst);
        if (ufound && !not_affected) {
            /* C:1627 mutates tmp only while evaluating the RHS of ||.
             * A visible yellow light short-circuits, retaining the full
             * d(10,20) damage as the blindness timeout and drawing no rnd(). */
            if (mon_visible_disp(mtmp)
                || (rnd((tmp = Math.trunc(tmp / 2))) > (u.ulevel | 0))) {
                await pline('You are blinded by a blast of light!');
                await make_blinded_real_mu(tmp, false);
                if (!Blind(gs))
                    Your1('vision quickly clears.');
            } else if (gs.flags?.verbose !== false) {
                await pline('You get the impression it was not terribly bright.');
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
                await pline('You are caught in a blast of kaleidoscopic light!');
            /* "avoid hallucinating the black light as it dies" — remove it from
             * the map NOW, before the property flips. */
            await mondead_mu(mtmp);
            kill_agr = false; /* already killed (maybe lifesaved) */
            const chg = await make_hallucinated_mu(
                (_HHallucination_mu(gs) | 0) + tmp, false, 0);
            await pline(`You ${chg ? 'are freaked out' : 'seem unaffected'}.`);
        }
        break;
    default:
        /* C:1652-1654 impossible("unknown exploder damage type %d") — the five
         * monsters.h rows cover every reachable adtyp, so this is C's own
         * can't-happen and prints no topline the recorder would capture. */
        break;
    }
    if (not_affected) {                                   /* C:1656-1659 */
        await pline('You seem unaffected by it.');
        ugolemeffects_mu(mattk.adtyp | 0, tmp);
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
    let { ranged, range2, foundyou } = calc_mattacku_vars(mtmp);
    /* C mhitu.c:511-513 — the very first thing mattacku does, UNCONDITIONALLY
     * on every call where the attacker is within mdistu<=3 ("not ranged" in
     * this function's inverted naming), regardless of hit/miss/attack-type or
     * whether the rest of the function goes on to do anything at all:
     *     if (!ranged)
     *         nomul(0);
     *     if (DEADMONSTER(mtmp))
     *         return 1;
     * `calc_mattacku_vars` already computed `ranged` (mdistu(mtmp) > 3); this
     * port destructured only {range2, foundyou} from it and dropped `ranged`
     * on the floor, so a hero mid-`80s`-search/rest/travel who was merely
     * APPROACHED by a monster within 3 tiles never had the count interrupted
     * here.  RNG-free (nomul/DEADMONSTER are both state-only).  MEASURED on a
     * captured mattacku call with an EMPTY rng_consumed tape (an ogre king
     * adjacent to a hero with hero.multi=80/context.run=3 before the call):
     * C's `state_after` shows both cleared and this port left them untouched —
     * the whole divergence, with zero RNG involved either side. */
    if (!ranged)
        nomul(0);
    if (DEADMONSTER(mtmp))
        return 1;
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

    /* C ref: mhitu.c:527-547 — the `else if (u.usteed)` arm of the
     * swallowed/mounted chain that opens mattacku:
     *     } else if (u.usteed) {
     *         if (mtmp == u.usteed)
     *             return 0;                / * Your steed won't attack you * /
     *         / * Orcs like to steal and eat horses and the like * /
     *         if (!rn2(is_orc(mtmp->data) ? 2 : 4) && m_next2u(mtmp)) {
     *             i = mattackm(mtmp, u.usteed);
     *             if ((i & M_ATTK_AGR_DIED) != 0) return 1;
     *             if ((i & M_ATTK_DEF_DIED) != 0 || !u.usteed || !m_next2u(mtmp))
     *                 return 0;
     *             gb.bhitpos.x = mtmp->mx, gb.bhitpos.y = mtmp->my;
     *             gn.notonhead = FALSE;
     *             return !!(mattackm(u.usteed, mtmp) & M_ATTK_DEF_DIED);
     *         }
     *     }
     * The rn2 is evaluated BEFORE m_next2u (C's && short-circuits left to
     * right), so every adjacent-or-not hostile pays the draw once the hero is
     * mounted.  seed0104 leaf 2841: C draws rn2(2)=0 for the goblin (an orc, so
     * the 1-in-2 arm) and diverts its whole turn onto the pony; this port had no
     * steed arm at all, went straight on to the next mcalcmove, and from there
     * the two runs never realigned.
     * The preceding `if (u.uswallow)` head of the same chain (mhitu.c:519-526)
     * is NOT ported — calc_mattacku_vars above computes range2/foundyou without
     * it — so the guard here is spelled `!u.uswallow` rather than as an else-if.
     * A swallowed hero cannot be mounted in C either (dismount_steed runs on
     * engulf), so the two arms cannot both want to fire. */
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

    /* C mhitu.c:707 — armor class differential.
     * tmp = AC_VALUE(u.uac) + 10; AC_VALUE(AC) = AC>=0 ? AC : -rnd(-AC). */
    const uac = u.uac | 0;
    let tmp = (uac >= 0 ? uac : -rnd(-uac)) + 10;
    tmp += (mtmp.m_lev | 0);
    if ((game.multi | 0) < 0) tmp += 4;
    /* (Invis && !perceives) || !mcansee  → -2 */
    if (!(mtmp.mcansee | 0)) tmp -= 2;
    if (mtmp.mtrapped | 0) tmp -= 2;
    if (tmp <= 0) tmp = 1;

    /* C mhitu.c:727-741 — "when not cancelled and not in current form due to
     * shapechange, many demons can summon more demons and were creatures can
     * summon critters":
     *     if (mtmp->cham == NON_PM && !mtmp->mcan && !range2
     *         && (is_demon(mdat) || is_were(mdat))) {
     *         boolean already_fleeing = mtmp->mflee != 0;
     *         summonmu(mtmp, youseeit);
     *         if (mtmp->mflee && !already_fleeing) return 0;
     *         mdat = mtmp->data;
     *     }
     * This sits BEFORE the u.uinvulnerable check and before find_offensive, and
     * it was missing entirely: every adjacent demon melee turn draws one rn2
     * that this port did not.  MEASURED on seed0006 leaf 6660 — the water demon
     * unleashed from the fountain closes on the hero and C draws
     * `rn2(16)=3 @summonmu(mhitu.c:968)` before the to-hit
     * `rnd(21) @mattacku(mhitu.c:806)`; this port went straight to the rnd(21).
     * See summonmu_mu() for what is and is not ported inside it. */
    if ((mtmp.cham ?? NON_PM_MU) === NON_PM_MU && !(mtmp.mcan | 0) && !range2
        && (is_demon_mu(mtmp.data) || is_were_mu(mtmp.data))) {
        const already_fleeing = (mtmp.mflee | 0) !== 0;
        await summonmu_mu(mtmp, canseemon_mu(mtmp));
        if ((mtmp.mflee | 0) && !already_fleeing)
            return 0;
    }

    /* C mhitu.c:743-756 — the PRAYER INVULNERABILITY gate:
     *     if (u.uinvulnerable) {         / * in the midst of successful prayer * /
     *         / * monsters won't attack you * /
     *         if (mtmp == u.ustuck) {
     *             pline_mon(mtmp, "%s loosens its grip slightly.", Monnam(mtmp));
     *         } else if (!range2) {
     *             if (youseeit || sensemon(mtmp))
     *                 pline("%s starts to attack you, but pulls back.", Monnam(mtmp));
     *             else
     *                 You_feel("%s move nearby.", something);
     *         }
     *         return 0;
     *     }
     *
     * u.uinvulnerable is the prayer window (js/cmd.js sets it, prayer_done
     * clears it) — the same flag js/allmain.js already honours to stop
     * nh_timeout() counting down through a prayer.  Here it stops the monster
     * turn: NO to-hit roll, NO damage, NO find_offensive, just the flavour line.
     *
     * It was missing, so every adjacent monster attacked a praying hero for
     * real.  MEASURED on corpus-generated/v5/train/gen140-reseed-seed844901: the
     * hero #prays at step 1129 and answers the wizard-mode "Force the gods to be
     * pleased?" with y.  From step 1136 C draws exactly one
     * `rn2(5) @distfleeck(monmove.c:538)` per turn and pages "The minotaur
     * starts to attack you, but pulls back.--More--"; this port drew the
     * minotaur's rnd(20) to-hit and its damage tail and paged "The minotaur
     * hits!  The minotaur hits again!  The minotaur butts!  The red dragon
     * bites!", taking the hero from HP:44 to HP:33 while C stayed at 44.
     * That was the session's first RNG-value divergence (global leaf 71125) and
     * the head of a 450-frame contiguous miss run.
     *
     * Position is load-bearing: this sits AFTER the armour-class differential
     * (whose AC_VALUE draws rnd(-uac) when uac is negative) and AFTER the
     * summonmu block, and BEFORE find_offensive — so a praying hero's attacker
     * still pays those draws and still summons, exactly as C does.
     *
     * `youseeit` is C's calc_mattacku_vars out-param canseemon(mtmp); this
     * port's calc_mattacku_vars does not return it, and the file-local
     * `canseemon()` stub two hundred lines up returns FALSE unconditionally, so
     * read the REAL body (canseemon_mu) here or the visible case prints the
     * blind-hero line. */
    if (u.uinvulnerable | 0) {
        if (mtmp === u.ustuck) {
            await pline(`${Monnam(mtmp)} loosens its grip slightly.`);
        } else if (!range2) {
            if (canseemon_mu(mtmp) || sensemon_mu(mtmp))
                await pline(`${Monnam(mtmp)} starts to attack you, but pulls back.`);
            else
                await pline('You feel something move nearby.');
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
    /* C mhitu.c:722 `boolean skipnonmagc = FALSE;` — set by wildmiss's two call
     * sites, tested at mhitu.c:787 to skip every remaining non-AT_MAGC attack. */
    let skipnonmagc = false;
    /* C mhitu.c:766 `firstfoundyou = foundyou;` — latched BEFORE the loop. */
    const firstfoundyou = foundyou;
    const _deathBeforeAttacks = game._pendingDeath || null;
    for (let i = 0; i < NATTK; i++) {
        /* C mhitu.c has no such test because it does not need one: a hit that
         * takes the hero below 1 HP reaches done_in_by() -> done(), which never
         * returns, so the attacker's REMAINING attacks are simply never made.
         * This port defers the death interaction to a movemon boundary
         * (js/end.js deadhero, js/fastforward.js:633), so the loop kept going
         * and the corpse-to-be took one more attack.  MEASURED on seed0006 step
         * 107: C pages "The water demon hits!--More--" and this port paged "The
         * water demon hits!  The water demon bites!--More--", then drew four
         * leaves (rnd(22) to-hit and its tail) that C never draws — C's next
         * leaf is already `rn2(1) @can_make_bones(bones.c:377)`.
         * Placed at the loop head, so the attack that kills still completes.
         * Gated on the death being NEW (the js/fastforward.js:470/633 pattern):
         * a _pendingDeath that was already standing when this attack sequence
         * began is not this sequence's doing -- and on pending_death_is_final(),
         * because done() RETURNS when the hero is lifesaved or is in
         * wizard/explore mode and declines "Die?" (end.c:1080-1117), and in
         * that case C's own loop keeps attacking.  Without that second gate
         * seed4500's wizard-mode knight lost 539 step points. */
        if (game._pendingDeath && game._pendingDeath !== _deathBeforeAttacks
            && pending_death_is_final())
            return 0;
        /* C mhitu.c:771-772 — "counterattack against attack [i-1] might have
         * been fatal". */
        if (DEADMONSTER(mtmp))
            return 1;
        /* C mhitu.c:773-784 — RECOMPUTE the positional variables for every
         * attack after the first, "in case prior attack moved hero":
         *     if (i > 0) {
         *         calc_mattacku_vars(mtmp, &ranged, &range2, &foundyou, &youseeit);
         *         if (firstfoundyou && !foundyou)
         *             continue;
         *         if (!u_at(gb.bhitpos.x, gb.bhitpos.y))
         *             continue;
         *     }
         * This whole block was missing, so an attack that MOVED the hero — a
         * successful mhitm_knockback is the corpus case — left the monster
         * still believing the hero was where it swung, and the loop kept
         * swinging.  C's mtmp->mux/muy is the monster's BELIEF about the hero's
         * square and knockback does not update it, so `foundyou` goes false and
         * every remaining attack is skipped.
         *
         * C:782's `!u_at(gb.bhitpos)` is intentionally NOT mirrored: C's
         * calc_mattacku_vars assigns `gb.bhitpos.x = u.ux, gb.bhitpos.y = u.uy`
         * (mhitu.c:459) on the line before, so that test can never be true.
         * Skipping it is exactly faithful, not a shortcut.
         *
         * MEASURED on corpus-generated/v5/train/gen446-recombine-seed373399:
         * after the i=2 attack knocked the hero backward
         * (rn2(6)=0 @ mhitm_knockback(uhitm.c:5269) then the :5374/:5397 tail)
         * C's very next leaf is `rn2(12)=4 @ mcalcmove(mon.c:1164)` — the
         * monster-movement phase — while this port drew a fourth to-hit
         * `rnd(23)` and its whole damage tail. */
        if (i > 0) {
            ({ range2, foundyou } = calc_mattacku_vars(mtmp));
            if (firstfoundyou && !foundyou)
                continue;
        }
        /* C mhitu.c:786 `mattk = getmattk(mtmp, &gy.youmonst, i, sum, &alt_attk);`
         * — NOT a raw mptr->mattk[i] read.  See getmattk() above for the six
         * substitutions and for the seed4500 master-lich measurement. */
        const mattk = getmattk(mtmp, true, null, i, sum);
        if (!mattk) continue;
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^mattacku_attack[id=${mtmp.m_id|0} slot=${i} aatyp=${mattk.aatyp|0} adtyp=${mattk.adtyp|0} damn=${mattk.damn|0} damd=${mattk.damd|0} range=${range2 ? 1 : 0} found=${foundyou ? 1 : 0}]`);
        /* C mhitu.c:786-790 — skipnonmagc suppresses everything but AT_MAGC;
         * skipdrin suppresses a mind flayer's remaining brain-drain tentacles
         * after an ineffective or terminal one. */
        if ((skipnonmagc && mattk.aatyp !== AT_MAGC)
            || (game.s.skipdrin && mattk.aatyp === AT_TENT_
                && mattk.adtyp === AD_DRIN_))
            continue;
        /* C ref: mhitu.c hitmsg "again" tracking — record this attack's slot
         * index so hitmsg_je can test mattk == hitmsg_prev + 1. */
        mattk._ai = i;
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
                    wildmiss(mtmp, mattk);
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
                    const mon_currwep = MON_WEP(mtmp);
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
                        mswings(mtmp, mon_currwep, bash);
                    }
                    /* C:912 if (tmp > (j = gm.mhitu_dieroll = rnd(20 + i))) */
                    const j = rnd(20 + i);
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
                    wildmiss(mtmp, mattk);
                    skipnonmagc = true;
                }
                break;
            }
            case AT_BREA: {
                /* C mhitu.c:868-871 — breamu takes care of displacement.
                 * This case did not exist: every breath attack in the corpus
                 * fell into `default:` and drew nothing.  See breamm() above. */
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
                /* C mhitu.c:832-837:
                 *     case AT_GAZE: / * can affect you either ranged or not * /
                 *         / * Medusa gaze already operated through m_respond in
                 *            dochug(); don't gaze more than once per round. * /
                 *         if (mdat != &mons[PM_MEDUSA])
                 *             sum[i] = gazemu(mtmp, mattk);
                 *         break;
                 * This case did not exist at all — AT_GAZE fell through to
                 * `default:` below and gazemu() (exported, fully ported, and
                 * otherwise uncalled) never ran for a monster attacking the
                 * hero.  `mdat != &mons[PM_MEDUSA]` is the same permonst-
                 * pointer identity test as is_medusa above (mondata.c:18-19
                 * keeps mnum in lockstep with data), so mtmp.mnum is the
                 * faithful comparison.  MEASURED on
                 * probe-reach-itemuse/gen033-objective-seed1341728 step 2266:
                 * after three AT_CLAW hits, C's fourth attack slot is AT_GAZE/
                 * AD_CONF and draws `rn2(5)=1 @ gazemu(mhitu.c:1760)`,
                 * `d(3,4)=4 @ gazemu(mhitu.c:1765)`,
                 * `rn2(6)=1 @ gazemu(mhitu.c:1767)`; this port drew nothing
                 * for that slot. */
                if (mtmp.mnum !== PM_MEDUSA)
                    sum[i] = await gazemu(mtmp, mattk);
                break;
            }
            case AT_EXPL_: {
                /* C mhitu.c:839-842 — "automatic hit if next to, and aimed at
                 * you".  This case did not exist: every exploder that reached
                 * the hero fell through `default:` and drew NOTHING, so C's
                 * d(damn,damd) at mhitu.c:1603 had no counterpart and the
                 * stream sheared there.  Seven train sessions reach it. */
                if (!range2)
                    sum[i] = await explmu(mtmp, mattk, foundyou);
                break;
            }
            case AT_ENGL_MU: {
                /* C mhitu.c:843-871 — the engulf arm.  Note C's short-circuit:
                 * an ALREADY-swallowed hero skips the to-hit entirely (`j` is
                 * left uninitialised there and missmu is unreachable), so a
                 * swallower re-attacks its stomach's occupant for free every
                 * turn.  MEASURED on seed0383 leaf 10282: `rnd(20)=14
                 * @mattacku(mhitu.c:848)` for the FIRST engulf and no to-hit on
                 * any later turn.  mspec_used gates the first grab only. */
                if (range2) break;
                if (foundyou) {
                    let j = 0;
                    if ((game.u.uswallow | 0)
                        || (!(mtmp.mspec_used | 0) && tmp > (j = rnd(20 + i)))) {
                        /* C: flush_screen(1) — "force swallowing monster to be
                         * displayed even when hero is moving away".  This
                         * port's flush_screen is the frame-emitting paint, and
                         * gulpmu's own swallowed(1) repaints the whole map a
                         * moment later, so calling it here would emit a frame C
                         * does not capture (C's flush_screen writes to the tty,
                         * it does not raise a blocking read).  Left out
                         * deliberately; the cage still lands on the same frame. */
                        sum[i] = await gulpmu(mtmp, mattk);
                    } else {
                        await missmu_je(mtmp, (tmp === j), mattk);
                    }
                } else if (digests_gu(mndx)) {
                    pline(`${Monnam(mtmp)} gulps some air!`);
                } else {
                    /* C mhitu.c:864-871 — the "lunges forward and recoils"
                     * / You_hear arm for an engulfer that swung at the hero's
                     * displaced image. */
                    if (canseemon_mu(mtmp))
                        pline(`${Monnam(mtmp)} lunges forward and recoils!`);
                    else
                        pline(`You hear a ${is_whirly_gu(mndx, mtmp.data)
                               ? 'rushing noise' : 'splat'} nearby.`);
                }
                break;
            }
            case AT_MAGC: {
                /* C mhitu.c:924-929:
                 *     case AT_MAGC:
                 *         if (range2) sum[i] = buzzmu(mtmp, mattk);
                 *         else        sum[i] = castmu(mtmp, mattk, TRUE, foundyou);
                 * This whole case fell through the `default:` below, whose
                 * comment called AT_MAGC deferred; both callees have been
                 * ported in js/mcastu.js since (castmu:582, buzzmu:742) and
                 * nothing wired them to the monster-attacks-hero loop.
                 * MEASURED on seed4500-knight-coverage step 1761: a master lich
                 * that just touched the hero casts with its mattk[1], and C
                 * draws rn2(23) @choose_monster_spell(mcastu.c:111),
                 * rn2(230) @castmu(mcastu.c:208) and d(12,6) @castmu(mcastu.c
                 * :243) where this port drew nothing at all. */
                if (range2)
                    sum[i] = await buzzmu(mtmp, mattk);
                else
                    sum[i] = await castmu(mtmp, mattk, true, foundyou);
                break;
            }
            case AT_HUGS_: {
                /* C mhitu.c:811-819 — the automatic hug/bearhug follow-up,
                 * gated on the PREVIOUS TWO attack slots both having hit
                 * (C's own comment: "if displaced, prev attacks never
                 * succeeded", since a wild miss leaves sum[i-1]/sum[i-2] at
                 * M_ATTK_MISS):
                 *     case AT_HUGS: /' automatic if prev two attacks succeed '/
                 *         if ((!range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                 *             || mtmp == u.ustuck) {
                 *             if (!failed_grab(mtmp, &gy.youmonst, mattk))
                 *                 sum[i] = hitmu(mtmp, mattk);
                 *         }
                 *         break;
                 * This case did not exist at all — every hug-class monster
                 * (owlbear's third attack slot is the corpus example: two
                 * AT_CLAW then AT_HUGS) fell through to `default:`, so a
                 * landed double-claw's automatic hug never rolled, and
                 * hitmu's whole draw sequence for it (base d(damn,damd), the
                 * mhitm_adtyping_u dispatch, mhitm_knockback) was stranded on
                 * the recorded tape.  MEASURED: an owlbear
                 * (PM_OWLBEAR, ATTK(AT_HUGS, AD_PHYS, 2, 8) at slot 2) whose
                 * first two claws both hit leaves 4 recorded draws unconsumed
                 * under exactly this gap. */
                if ((!range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                    || mtmp === u.ustuck) {
                    if (!_failed_grab_u(mtmp, mattk))
                        sum[i] = await hitmu_je(mtmp, mattk);
                }
                break;
            }
            default:
                /* ranged / etc. — deferred.
                 * Skip without firing RNG so behaviour is unchanged for the
                 * unported attack classes (no regression). */
                break;
        }
        /* C mhitu.c:936-937 — `if (disp.botl) bot();`, INSIDE the per-attack
         * loop, after the attack's switch and before the wake-up check.  bot()
         * repaints the status line and then clears disp.botl/botlx/time_botl,
         * so at mattacku's return C is back to disp.botl == 0 even though
         * mdamageu (mhitu.c:1909) set it on every hit that landed.
         *
         * This port dropped the call, so mattacku returned with disp.botl == 1.
         * Measured through the command-replay oracle on the 120-record
         * mattacku-green-pin fixture: 40 of its 44 RED records were a lone
         * extra botl write — C both enters and leaves the call with the flag
         * down, while this port left it raised.  That single missing line was
         * what kept the five Gate-0 registry entries gating on this fixture
         * (mhitu-, throw-, music-, dip- and kick-dispatch) ERRORing as
         * un-validatable instruments.
         *
         * bot() is DISPLAY-ONLY and RNG-free (js/display.js:4515); what it
         * changes besides the flag is the _botlPaintedCap / _lastPaintedBotl
         * latch, i.e. what a later frozen --More-- page renders — which is
         * exactly the C behaviour being restored. */
        if (game.disp && game.disp.botl)
            await bot_mu();
        /* C mhitu.c:938-943 — "give player a chance of waking up before dying".
         * Guarded on the hero being asleep, so the rn2(10) never fires for an
         * awake hero; ported so the draw site is visible where C has it. */
        if (sum[i] === M_ATTK_HIT) {
            if ((game.u?.usleep | 0) && (game.u.usleep | 0) < (game.moves | 0)
                && !rn2(10)) {
                game.multi = -1;
                (game.gn ||= {}).nomovemsg = 'The combat suddenly awakens you.';
            }
        }
        if (sum[i] & M_ATTK_AGR_DIED) return 1;
        /* C mhitu.c:944-945:
         *     if ((sum[i] & M_ATTK_AGR_DONE))
         *         break;   / * attacker teleported, no more attacks * /
         * This was missing entirely, so a monster whose attack ended with
         * M_ATTK_AGR_DONE — a nymph that stole and rloc'd away, a seducer that
         * teleported off — went straight on to its NEXT attack from a square it
         * no longer occupied.  seed0014 leaf 16725: after the water nymph steals
         * the black onyx ring and rloc's, C leaves mattacku and the next
         * monster's dochug draws rn2(5) @ distfleeck(monmove.c:538); this port
         * drew the nymph's second attack's rnd(20+1) instead. */
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
    /* C reads mtmp->data->mattk[]. Live monst objects built by makemon/makedog
     * carry `mnum` and no `mndx` (only the capture-replay reconstructor sets
     * `mndx`), so `mtmp.mndx | 0` read 0 — the giant ant's attack row — for
     * every monster in live play, and this returned false unconditionally.
     * Same `(mndx ?? mnum ?? 0)` resolution the mon.c-family ports in
     * js/monmove.js already use. Measured: PM_COBRA (219) has AT_SPIT at
     * mattk[1]; with the mndx-only read it looked like a giant ant's single
     * AT_BITE and m_balks_at_approaching never fired (seed4500 step 261). */
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

export function free_youbuf() {
    const gy = game.gy || {};
    if (gy.you_buf)
        gy.you_buf = null;
    gy.you_buf_siz = 0;
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
    if (adtyp === AD_SSEX && !game.sysopt.seduce)
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
/* C ref: artifact.c:696-710 — "determine whether an item confers Protection".
 *
 *     boolean
 *     protects(struct obj *otmp, boolean being_worn)
 *     {
 *         const struct artifact *arti;
 *
 *         if (being_worn && objects[otmp->otyp].oc_oprop == PROTECTION)
 *             return TRUE;
 *         arti = get_artifact(otmp);
 *         if (arti == &artilist[ART_NONARTIFACT])
 *             return FALSE;
 *         return (boolean) ((arti->cspfx & SPFX_PROTECT) != 0
 *                           || (being_worn && (arti->spfx & SPFX_PROTECT) != 0));
 *     }
 *
 * Draws no RNG.  js/attrib.js's get_artifact() returns the artilist INDEX where
 * C returns a pointer, so `arti === ART_NONARTIFACT` is C's
 * `arti == &artilist[ART_NONARTIFACT]` (js/attrib.js:1137-1152); its
 * ARTILIST_SPFX / ARTILIST_CSPFX columns are the ones extracted from the
 * COMPILED include/artilist.h, and SPFX_PROTECT is set in exactly the two rows
 * artilist.h sets it in: 27 The Mitre of Holiness (artilist.h:266) and 30 The
 * Tsurugi of Muramasa (artilist.h:287), both in spfx with cspfx 0.
 * MKOBJ_OC_OPROP holds oc_oprop; exactly three otyps carry PROTECTION —
 * 146 CLOAK_OF_PROTECTION (objects.h:638), 178 RIN_PROTECTION (objects.h:756)
 * and 210 AMULET_OF_GUARDING (objects.h:855).
 * Was a throw stub; the merge that brought magic_negation() /
 * mhitm_mgc_atk_negated() in made it REACHED, and because js/uhitm.js:2805
 * called mhitm_adtyping unawaited the throw became a process-killing
 * unhandledRejection that aborted the whole capture-replay board sweep. */
const PROTECTION_PROP = 59;      /* C prop.h:82 */
const SPFX_PROTECT = 0x08000000; /* C artifact.h:43 */
function protects(otmp, being_worn) {
    if (being_worn && (MKOBJ_OC_OPROP[otmp.otyp | 0] | 0) === PROTECTION_PROP)
        return true;
    const arti = get_artifact(otmp);
    if (arti === ART_NONARTIFACT)
        return false;
    return ((arti_cspfx(arti) & SPFX_PROTECT) !== 0
            || (being_worn && (arti_spfx(arti) & SPFX_PROTECT) !== 0));
}
/* C ref: obj.h:249 is_weptool(o) — (o)->oclass == TOOL_CLASS && objects[(o)->otyp].oc_skill != P_NONE. Macro, inlined. */
function is_weptool(obj) {
    return (obj.oclass | 0) === 6 /* TOOL_CLASS */
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) !== 0 /* P_NONE */;
}

/* C ref: mhitu.c:1085 magic_negation
 * is_you: mon->m_id is a fixed sentinel (gy.youmonst.m_id = 1, reserved by
 * next_ident()); (mon.m_id === 1) is the faithful equivalent of C's
 * (mon == &gy.youmonst) — see trap.js:2938-2943 for the established idiom. */
export function magic_negation(mon) {
    const u = game.u || {};
    const is_you = (mon.m_id === 1);
    let via_amul = false;
    let gotprot;

    if (is_you) {
        /* EProtection != 0L */
        const protProp = (u.uprops && u.uprops[59]) || {};
        gotprot = !!(protProp.extrinsic);
    } else {
        /* high priests have innate protection */
        gotprot = ((mon.data_mndx | 0) === PM_HIGH_PRIEST);
    }

    let mc = 0;
    const inv = is_you ? game.invent : mon.minvent;
    for (let o = inv; o; o = o.nobj) {
        /* a_can field is only applicable for armor (which must be worn) */
        if ((o.owornmask & 0x0000007F) !== 0) { /* W_ARMOR */
            const armpro = obj_a_can(o);
            if (armpro > mc) mc = armpro;
        } else if ((o.owornmask & 0x00010000) !== 0) { /* W_AMUL */
            via_amul = (o.otyp === 342); /* AMULET_OF_GUARDING */
        }
        /* if we've already confirmed Protection, skip additional checks */
        if (is_you || gotprot)
            continue;

        /* omit W_SWAPWEP+W_QUIVER; W_ART+W_ARTI handled by protects() */
        let wearmask = 0x0000007F | 0x000F0000; /* W_ARMOR | W_ACCESSORY */
        if (o.oclass === 2 /* WEAPON_CLASS */ || is_weptool(o))
            wearmask |= 0x00000100; /* W_WEP */
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
        const protProp = (u.uprops && u.uprops[59]) || {};
        if ((is_you && ((protProp.intrinsic && u.ublessed > 0) || u.uspellprot))
            /* aligned priests and angels have innate intrinsic Protection */
            || ((mon.data_mndx | 0) === PM_ALIGNED_CLERIC
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

/* C ref: objects[].oc_dir, WEAPON_CLASS rows only (objects.h WEAPON()/
 * PROJECTILE()/BOW() "typ" field, P=PIERCE=1, S=SLASH=2, B=WHACK=4, 0 for
 * bows/none). Non-weapon rows are 0. Indices align 1:1 with otyp and with
 * MKOBJ_OC_SKILL (js/mkobj_erosion_meta.js) — both derived from the same
 * objects.h OBJECTS_INIT table. */
const MKOBJ_OC_DIR = new Int8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 0, 1, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 3, 2, 2, 3, 2, 3, 5, 5, 4, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 2, 1, 2, 2, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0]);

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
/* C you.h:324 mhis(mtmp) = genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his,
 * with genders[].his = {"his", "her", "its", "their"} (role.c:688-693) and
 * pronoun_gender at mondata.c:1191-1207.  The stub two functions up returns a
 * flat "its" for every monster and is left alone (it feeds unrelated gaze/
 * seduction messages outside this fix's scope); this is the real one, used by
 * mswings.  NOTE the hallucination arm DOES draw rn2(4) in C — it is ported,
 * not skipped, because the corpus has hallucination sessions. */
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
export function mswings(mtmp, otemp, bash) {
    const gs = game;
    if ((gs.flags?.verbose ?? true) && !Blind(gs) && mon_visible_disp(mtmp)) {
        pline(`${Monnam_mhu(mtmp)} ${mswings_verb(otemp, bash)} `
              + `${((otemp.quan | 0) > 1) ? 'one of ' : ''}`
              + `${mhis_mon(mtmp)} ${xname(otemp)}.`);
    }
}
/* do_name.c Monnam() — mon_nam() with the first letter capitalized.  The
 * file-local `Monnam` stub above returns the literal "Monster"; js/uhitm.js's
 * mon_nam is the real x_monnam-backed namer. */
function Monnam_mhu(mtmp) {
    const bp = uhitm_mon_nam(mtmp);
    if (!bp) return bp;
    const c = bp.charCodeAt(0);
    return (c >= 0x61 && c <= 0x7a)
        ? String.fromCharCode(c & ~0x20) + bp.slice(1) : bp;
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
