import { spoteffects } from './landing-effects.js';
import { is_pool_or_lava } from './look.js';
// do_wear.c — wearing / taking off worn objects; armor-class calculation.
// C ref: do_wear.c — find_ac (line 2472).
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).
import { game } from './gstate.js';
import { setworn, setnotworn } from './worn.js';
import { impossible as equipment_impossible } from './pline.js';
import { end_burn } from './timeout.js';
import monAcPack from './makemon_ac.json' with { type: 'json' };
const MONS_AC = monAcPack.ac;
/* C mons[] rows (permonst); row[6] = mflags1.  Imported as a raw data pack for
 * the same reason monAcPack is — do_wear.js is already inside makemon.js's
 * import cycle (makemon.js imports xname from here). */
import monsPackDw from './makemon_mons.json' with { type: 'json' };
const MONS_DW = /** @type {number[][]} */ (monsPackDw.mons);
import monMsizePackDw from './makemon_msize.json' with { type: 'json' };
const MONS_MSIZE_DW = /** @type {number[]} */ (monMsizePackDw.msize);
function _hero_mflags1_dw() {
    const d = game.youmonst && game.youmonst.data;
    if (d && d.mflags1 != null) return d.mflags1 >>> 0;
    let i = (d && d.pmidx != null) ? (d.pmidx | 0)
          : ((game.u && game.u.umonnum != null) ? (game.u.umonnum | 0) : -1);
    return (i >= 0 && i < MONS_DW.length) ? (MONS_DW[i][6] >>> 0) : 0;
}
/* C mondata.h:65 — #define humanoid(ptr) (((ptr)->mflags1 & M1_HUMANOID) != 0L)
 * monflag.h:102 M1_HUMANOID = 0x00020000L ("has humanoid head/arms/torso"). */
const M1_HUMANOID_DW = 0x00020000;
function _humanoid_dw() { return (_hero_mflags1_dw() & M1_HUMANOID_DW) !== 0; }
import { pline, urgent_pline } from './display.js';
import { see_monsters } from './display.js';
import { topl_park_cursor } from './display.js';
import { flush_screen, _topline_more_pending, _topl_stash_result } from './display.js';
import { _topl_merge_result, _topl_joins_snapshot, _topl_record_join } from './display.js';
import { nhgetch } from './input.js';
import { nomul, unmul, stop_occupation } from './allmain.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { discover_object } from './o_init.js';
import { exercise, change_luck, acurr, C_ATTR_TO_DISP } from './attrib.js';
import { STR19, PROTECTION, INTRINSIC } from './const.js';
import { PM_ARCHEOLOGIST, PM_HOBBIT, PM_MARILITH, PM_WINGED_GARGOYLE } from './pm.generated.js';
import { float_vs_flight, breakarm, num_horns, obj_pmname, y_monnam } from './mhitm.js';
import { s_suffix } from './hacklib.js';
import { hcolor } from './mhitm.js';
import { curse } from './mkobj.js';
import { update_inventory } from './inventory_refresh.js';
import { HALLUC, HALLUC_RES } from './const.js';
/* C mondata.c:632 sliparm(ptr) — the real one, exported by js/makemon.js:462.
 * canwearobj's cantweararm(ptr) is breakarm(ptr) || sliparm(ptr) (mondata.h:133);
 * both halves are imported rather than re-derived here. */
import { sliparm, permonstTemplate } from './makemon.js';
import { canletgo } from './makemon.js';
import { weapon_descr, touch_petrifies as corpse_touch_petrifies } from './uhitm.js';
import { setuwep, setuswapwep, setuqwep, empty_handed, cmdq_pop, cmdq_peek, dropx, cmdq_clear, instapetrify as corpse_instapetrify,
         carrying_stoning_corpse } from './cmd.js';
import { otense, makesingular, corpse_xname as petrify_corpse_xname, killer_xname as petrify_killer_xname, simpleonames as petrify_simpleonames } from './objnam.js';
import { HAND, FINGER, RIGHT_HANDED, LEFT_HANDED, CQ_CANNED, CXN_ARTICLE as PETRIFY_ARTICLE } from './const.js';
import { W_WEP, W_SWAPWEP, W_QUIVER, W_RINGL, W_RINGR, W_TOOL,
         CMDQ_KEY, ECMD_FAIL, FOOT } from './const.js';
const PETRIFY_CORPSE = 265; /* objects.h CORPSE */
/* C mkobj.c:1865 set_bknown() — the project's real one (js/mklev.js:11078).
 * mklev.js does not import this file, so there is no cycle. */
import { set_bknown } from './mklev.js';
import { Can_fall_thru } from './mklev.js';
import { on_level } from './dungeon.js';
import { self_invis_message } from './potion.js';
import { set_mimic_blocking } from './sit.js';
import { paranoid_query } from './paranoid.js';
/* C do_wear.c:3258 obj_erode_type() / :3299 destroy_arm() read the objclass.h
 * material predicates.  js/mklev.js already owns the single copy of that set
 * (mkobj.c:2272-2298 + objnam.c:1195 erosion_matters); import them rather than
 * adding a fourth private transcription (js/trap.js and js/mklev.js each hold
 * one already, and the trap.js header records what a divergent copy cost). */
import { erosion_matters, is_flammable, is_rottable, is_rustprone,
         is_crackable, is_corrodeable, is_damageable } from './mklev.js';
/* C trap.c:171 await erode_obj() — the single shared body lives in js/trap.js next to
 * burnarmor/water_damage.  js/trap.js imports float_up/bimanual from this file,
 * so this closes an import cycle; both sides are hoisted function declarations
 * used only at call time, never at module-eval time. */
import { erode_obj, dotrap, t_at, reset_utrap, fill_pit } from './trap.js';
import { remove_worn_item } from './steal.js';
/* C do_wear.c:3247 selftouch("You") — losing gloves means the wielded weapon
 * gets touched bare-handed.  js/trap.js:3260 is the single body. */
import { selftouch } from './trap.js';
import { u_safe_from_fatal_corpse } from './pickup.js';
/* C zap.c:1457 obj_resists() — maybe_destroy_armor's 90%-for-artifacts save.
 * js/zap.js imports only xname from this file, so this cycle is import-only. */
import { obj_resists } from './zap.js';
const GETOBJ_EXCLUDE_DW = -3;   /* hack.h:515 */
const GETOBJ_SUGGEST_DW = 2;    /* hack.h:538 */
import { ERODE_NONE, ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE,
         ERODE_CRACK, ER_NOTHING, ER_DESTROYED, EF_PAY, EF_DESTROY } from './const.js';
/* welded (js/cmd.js:16832) and body_part (js/cmd.js:18731) — the project's real
 * ones.  do_wear.js used to carry `function welded() { throw }` as a local stub;
 * that stub is gone, so these calls reach the real implementations rather than a
 * seventeenth copy.  See _uwep_welded_dw() below for the one C guard cmd.js's
 * `welded` omits. */
import { welded, body_part, _plineVFmt, _spoteffects_pickup as _spoteffects_pickup_fd, surface, useup, getObjFromGetobj } from './cmd.js';
const W_SADDLE_FD = 0x00100000;
/* C's go.oldcap is ONE global (decl.h:741, BSS-zero at game start) and C has ONE
 * encumber_msg() (pickup.c:1978).  This file used to carry a SECOND body of it
 * whose only difference was the initial go.oldcap: it defaulted an unset
 * u._oldcap to near_capacity(), i.e. to the ALREADY-CHANGED post-event value,
 * so the very first encumbrance crossing of a game printed nothing.  Re-export
 * js/weight.js's body (which keeps C's zero baseline) so both halves of the
 * port share one global, exactly as C does. */
import { near_capacity, encumber_msg } from './weight.js';
export { encumber_msg };
import { make_glib } from './potion.js';
import { obj_typename, getObjDescr, armor_simple_name, xname_armor, xname_amulet, an, doname, makeplural, xname, cxname, the, obj_is_pname, ansimpleoname, simpleonames, thesimpleoname } from './objnam.js';
/* The per-slot simple names disintegrate_arm's messages use (C do_wear.c:3211+)
 * and vtense (C objnam.c:2984) for the "dragon scales turn/fall" plural.
 *
 * ALIASED, not plain-imported: this file already declares seven functions with
 * these C names, but they take an ARMOR_DATA *row* (see the armor_simple_name
 * note above), while C's objnam.c copies take a `struct obj *`.  Two different
 * argument types under one C name is exactly the shadowing class that made
 * mstatusline print "your <mon> ... AC 0" (commit 60d255c4), so the obj-taking
 * copies are imported under an explicit `_obj` suffix rather than by silently
 * winning or losing a name race. */
import { cloak_simple_name as cloak_simple_name_obj,
         suit_simple_name as suit_simple_name_obj,
         shirt_simple_name as shirt_simple_name_obj,
         helm_simple_name as helm_simple_name_obj,
         gloves_simple_name as gloves_simple_name_obj,
         boots_simple_name as boots_simple_name_obj,
         shield_simple_name as shield_simple_name_obj,
         vtense } from './objnam.js';
import { getObjName } from './o_init.js';
import { ARMOR_DATA, armorIsMetallic, armorIsCrackable } from './armor_data.js';
import { LEVITATION as LEVITATION_PROP, GLIB as GLIB_PROP, Upolyd, I_SPECIAL,
         HOLE, TRAPDOOR, STATUE_TRAP, TT_PIT, TT_BEARTRAP, TT_WEB, TT_BURIEDBALL, TT_LAVA, Is_airlevel, Is_waterlevel } from './const.js';
/* C prop.h:63 UNCHANGING — youprop.h:372 Unchanging = (HUnchanging || EUnchanging). */
import { UNCHANGING as UNCHANGING_PROP } from './const.js';
/* C polyself.c poly_gender() — js/makemon.js:2112 is the ONE definition (do_wear.c
 * itself calls the same global function; not duplicating it here). */
import { poly_gender } from './makemon.js';
import { trycall } from './cmd.js';
/* C objects.h — AMULET_OF_RESTFUL_SLEEP is otyp 204 (same numbering
 * js/mklev.js:370 uses for the amulet_curse table). */
const AMULET_OF_RESTFUL_SLEEP_DW = 204;
/* C objects.h AMULET() ordinals (verified js/oc_name_data.js OC_NAME[201..211]:
 * "amulet of ESP" / "amulet of strangulation" / "amulet of magical breathing" /
 * "amulet of flying" — same table js/monmove.js:986 / js/trap.js:2140 /
 * js/makemon.js:1443 read for 202/208).  Used by Amulet_off's per-otyp switch. */
const AMULET_OF_ESP_DW = 201;
const AMULET_OF_STRANGULATION_DW = 203;
const AMULET_OF_MAGICAL_BREATHING_DW = 209;
const AMULET_OF_FLYING_DW = 211;
const AMULET_OF_CHANGE_DW = 206;
/* C monflag.h M2_MALE/M2_FEMALE/M2_NEUTER — js/polyself.c:98-100's own copy
 * (module-local there, so not importable; same values, same bit layout every
 * other `is_male`/`is_female`/`is_neuter` re-derivation in this codebase uses,
 * e.g. js/mklev.js:16416-16418, js/makemon.js:6515-6516). */
const M2_MALE_DW = 0x00010000;
const M2_FEMALE_DW = 0x00020000;
const M2_NEUTER_DW = 0x00040000;
function is_male_dw(ptr) { return ((ptr?.mflags2 | 0) & M2_MALE_DW) !== 0; }
function is_female_dw(ptr) { return ((ptr?.mflags2 | 0) & M2_FEMALE_DW) !== 0; }
function is_neuter_dw(ptr) { return ((ptr?.mflags2 | 0) & M2_NEUTER_DW) !== 0; }
/* C ref: polyself.c:272 change_sex() — flip hero gender.  RNG-free (verified:
 * js/polyself.js's own copy, the ONE other implementation in this codebase, is
 * commented "RNG-free" and its body confirms it — no rn2/rnd/d call anywhere
 * in the function).  Reimplemented here rather than imported because
 * js/polyself.js's change_sex() is module-local (not exported) and this file
 * may only edit js/do_wear.js — see the `_dw`-suffixed reimplementation
 * convention already used throughout this file (is_male_dw above,
 * _humanoid_dw, etc.) for cross-file helpers this file cannot import. */
function change_sex_dw() {
    const g = game;
    const u = g.u || {};
    /* C you.h:554 Upolyd := (u.umonnum != u.umonster).  Was (u.mtimedone > 0),
     * you.h:422 — the poly TIMER, a different field. */
    const upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const ptr = g.youmonst && g.youmonst.data;
    if (!upolyd
        || (ptr && !is_male_dw(ptr) && !is_female_dw(ptr) && !is_neuter_dw(ptr))) {
        if (g.flags) g.flags.female = !g.flags.female;
    }
    if (upolyd) u.mfemale = !u.mfemale;
    if (!upolyd) {
        u.umonnum = (u.umonster != null) ? (u.umonster | 0)
            : (g.urole ? (g.urole.mnum | 0) : (u.umonnum | 0));
    }
}
/* C ref: youprop.h:372 Unchanging = (HUnchanging || EUnchanging). */
function Unchanging_dw() {
    const p = ensure_uprop(UNCHANGING_PROP);
    return !!((p.intrinsic | 0) || (p.extrinsic | 0));
}
/* C prop.h:46 SLEEPY = 27; youprop.h HSleepy is u.uprops[SLEEPY].intrinsic.
 * C obj.h TIMEOUT is the low 24 bits of an intrinsic. */
const SLEEPY_DW = 27;
const TIMEOUT_DW = 0x00FFFFFF;
/* `Your` used to be imported from js/vault.js:481, which is a throw-stub; the
 * real body is now declared in this file (C pline.c:380). */
import { rn2, rnd } from './rng.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU } from './const.js';
/* C ref: youprop.h:375-383 / prop.h — the property slots dragon_armor_handling
 * toggles as EXTRINSICS on the W_ARM bit. */
import { FAST as FAST_PROP, DRAIN_RES as DRAIN_RES_PROP, FREE_ACTION as FREE_ACTION_PROP,
         STONE_RES as STONE_RES_PROP, SLOW_DIGESTION as SLOW_DIGESTION_PROP,
         SICK_RES as SICK_RES_PROP, INFRAVISION as INFRAVISION_PROP } from './const.js';
import { BLINDED as BLINDED_PROP, INVIS as INVIS_PROP, DISPLACED as DISPLACED_PROP } from './const.js';
/* ── Cloak_on()'s per-otyp switch (do_wear.c:363-419) reads two more props and
 * paints/names on two of its arms. ── */
import { SEE_INVIS as SEE_INVIS_PROP, ACID_RES as ACID_RES_PROP,
         TELEPAT as TELEPAT_DISP_PROP, DETECT_MONSTERS as DETECT_MONSTERS_PROP } from './const.js';
import { newsym } from './display.js';   /* C display.c */
import { STRANGLED, NECK, MAGICAL_BREATHING as MAGICAL_BREATHING_DW } from './const.js';
import { Tobjnam } from './objnam.js';   /* C objnam.c:2810 */
/* C youprop.h `EProp |= <mask>` over u.uprops[p].extrinsic, for the arms that
 * set a SECOND property by hand (the alchemy smock's acid resistance).  Same
 * sparse-slot create-on-demand idiom as _dw_set_extrinsic()/setworn_armor(). */
function _dw_set_extrinsic_mask(prop, mask, on) {
    const u = game.u;
    if (!u || !prop)
        return;
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[prop]) u.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const rec = u.uprops[prop];
    rec.extrinsic = on ? ((rec.extrinsic | 0) | mask) : ((rec.extrinsic | 0) & ~mask);
}
/* W_TOOL is the "facewear" worn mask (worn.c:31 `{ W_TOOL, &ublindf, ... }`);
 * HEAD is the body_part() index used by a TOWEL's on_msg.  Both taken from
 * const.js rather than re-spelled, so the eyewear slot agrees with is_worn()'s
 * WORN_BLINDF_VAL by construction. */
import { W_TOOL as W_TOOL_C, HEAD as HEAD_DW, FACE as FACE_DW } from './const.js';
/* vision_recalc — the load-bearing half of toggle_blindness().  js/vision.js
 * carries the real `else if (Blind)` arm of C's vision_recalc (vision.c:548),
 * so conferring EBlinded below is what makes it fire.  vision.js imports only
 * gstate/const/display, so this closes no cycle. */
import { vision_recalc } from './vision.js';
/* objects.h:648 CLOAK_OF_DISPLACEMENT — same otyp used by ARMOR_DELAY_CAT_BY_OTYP. */
const CLOAK_OF_DISPLACEMENT_OTYP = 149;
/* C ref: o_init.c makeknown(x) == discover_object(x, TRUE, TRUE, TRUE).  The
 * legacy iniInvWornArmor() records carry a SYMBOLIC (string) otyp; discovery is
 * keyed by numeric otyp, so a string otyp has nothing to discover. */
function makeknown_otyp(otyp) {
    if (typeof otyp === 'number')
        discover_object(otyp | 0, true, true, true);
}
/* C ref: you.h:466 — abs(u.uac) capped at AC_MAX. */
const AC_MAX = 99;
/* C ref: objclass.h enum obj_material_types — for is_metallic/is_crackable */
const IRON = 11;
const MITHRIL = 17;
const GLASS = 19;
/* C ref: include/objects.h — symbol numbers (enum) for the starter armor
 * pieces that may be worn at post_init.  Numeric values come from
 * include/objects.h OBJECTS_ENUM ordering and are stable across versions.
 *
 * find_ac() needs a_ac (oc_oc1) for the worn pieces; it reads it out of the
 * generated objects.h table (js/armor_data.js ARMOR_DATA[otyp].a_ac) exactly
 * as C's ARM_BONUS indexes objects[obj->otyp], falling back to the record's
 * own precomputed a_ac for the legacy iniInvWornArmor() records whose otyp is
 * still SYMBOLIC (a string, so it has no ARMOR_DATA row).  The otyp field is
 * also used for the RIN_PROTECTION / AMULET_OF_GUARDING checks below — at
 * post_init these are never worn, so those are defensive / future-proofing.
 */
const RIN_PROTECTION = 178; /* objects.c RIN_PROTECTION otyp (verified via simple_typename) */
const AMULET_OF_GUARDING = 210; /* objects.h AMULET() amulet of guarding */
const AMULET_OF_UNCHANGING = 207; /* objects.h AMULET() amulet of unchanging */
const GAUNTLETS_OF_DEXTERITY = 162; /* from objects.h */
const HELM_OF_BRILLIANCE = 96; /* from objects.h */
/* C ref: hack.h:87-93 — ability attribute indices in u.abon.a[] */
const A_INT = 1;
const A_WIS = 2;
const A_DEX = 3;
/* C attrib.h:11-13 enum attrib_types — A_STR=0, A_CON=4, A_CHA=5 (A_INT/A_WIS/
 * A_DEX above are the other three of the six). */
const A_STR = 0;
const A_CON = 4;
const A_CHA = 5;
/* GAUNTLETS_OF_POWER otyp 161 — see GAUNTLETS_OF_POWER_OTYP at do_wear.js:1338
 * (js/attrib.js:117 independently carries the same literal 161). */
const GAUNTLETS_OF_POWER_OTYP_DW = 161;
/* C-faithful sign function (hacklib.c sgn): -1, 0, or 1. */
function sgn(n) {
    return (n < 0) ? -1 : (n !== 0 ? 1 : 0);
}
/* C ref: objclass.h:193-212 — material property predicates.
 * These check objects[obj->otyp].oc_material via MKOBJ_OC_MATERIAL. */
function objOcMaterial(otyp) {
    return (otyp !== null && otyp >= 0 && otyp < MKOBJ_OC_MATERIAL.length)
        ? (MKOBJ_OC_MATERIAL[otyp | 0] | 0) : 0;
}
function isMetallic(obj) {
    if (!obj) return false;
    const mat = objOcMaterial(obj.otyp | 0);
    return mat >= IRON && mat <= MITHRIL;
}
function isCrackable(obj) {
    if (!obj) return false;
    const mat = objOcMaterial(obj.otyp | 0);
    return mat === GLASS && (obj.oclass | 0) === ARMOR_CLASS;
}
/* The gi.invent node bearing `slotmask`, or null.  C worn.c:78 setworn() puts
 * that very node into u.uarm/uarmc/…, so C's ARM_BONUS reads one object; this
 * port keeps TWO representations for a worn slot (see the "BRIDGE OVER A MODEL
 * GAP" note at js/read.js:1337-1353): the chargen stand-in record that
 * u_init.js ROLE_STARTER_ARMOR built, and the real numeric-otyp gi.invent node
 * carrying the W_ARM* mask.  Different code paths write different halves —
 * seffect_enchant_armor bumps `spe` on the STAND-IN (read.js:1341-1344),
 * erode_obj sets `oeroded` on the INVENT NODE (trap.js _hero_worn) — so
 * armBonus has to read each field from wherever it is actually written.
 * RNG-free, read-only.  Mirrors trap.js _hero_worn. */
function _worn_invent_node(slotmask) {
    for (let o = game.invent; o; o = o.nobj) {
        if ((o.owornmask | 0) & (slotmask | 0)) return o;
    }
    return null;
}
function armBonus(obj, slotmask) {
    const row = ARMOR_DATA[obj.otyp | 0];
    const a_ac = row ? (row.a_ac | 0) : (obj.a_ac | 0);
    const spe = (obj.spe | 0);
    /* C obj.h:126-128 greatest_erosion(otmp) is the MAX of the two erosion
     * counters, not their sum (they are alternative damage kinds — burnt vs
     * rusted/rotted — and only the worse one counts). */
    let er1 = (obj.oeroded || 0) | 0, er2 = (obj.oeroded2 || 0) | 0;
    if (slotmask) {
        const inode = _worn_invent_node(slotmask);
        if (inode && inode !== obj) {
            const i1 = (inode.oeroded || 0) | 0, i2 = (inode.oeroded2 || 0) | 0;
            if (i1 > er1) er1 = i1;
            if (i2 > er2) er2 = i2;
        }
    }
    const erosion = er1 > er2 ? er1 : er2;
    const eroded = erosion < a_ac ? erosion : a_ac;
    return a_ac + spe - eroded;
}
/**
 * C ref: do_wear.c:2474 find_ac() — recompute u.uac from worn gear.
 *
 *   int uac = mons[u.umonnum].ac;   // base AC for current form
 *   if (uarm)  uac -= ARM_BONUS(uarm);
 *   if (uarmc) uac -= ARM_BONUS(uarmc);
 *   if (uarmh) uac -= ARM_BONUS(uarmh);
 *   if (uarmf) uac -= ARM_BONUS(uarmf);
 *   if (uarms) uac -= ARM_BONUS(uarms);
 *   if (uarmg) uac -= ARM_BONUS(uarmg);
 *   if (uarmu) uac -= ARM_BONUS(uarmu);
 *   if (uleft  && uleft->otyp  == RIN_PROTECTION)    uac -= uleft->spe;
 *   if (uright && uright->otyp == RIN_PROTECTION)    uac -= uright->spe;
 *   if (uamul  && uamul->otyp  == AMULET_OF_GUARDING) uac -= 2;
 *   if (HProtection & INTRINSIC) uac -= u.ublessed;
 *   uac -= u.uspellprot;
 *   if (abs(uac) > AC_MAX) uac = sgn(uac) * AC_MAX;
 *   if (uac != u.uac) { u.uac = uac; SET_BOTL(); ... }
 *
 * Notes for this port:
 *
 *   - mons[u.umonnum].ac is 10 for every player-class monster in
 *     monsters.h (Arc/Bar/Cav/Hea/Kni/Mon/Pri/Rog/Ran/Sam/Tou/Val/Wiz
 *     all use LVL(10,12,10,1,X) where the 3rd field is ac).  We
 *     therefore default to 10 when u.umonnum is unset.
 *   - The worn-armor slots (u.uarm/uarmc/uarmh/uarmf/uarms/uarmg/uarmu)
 *     are set by src/u_init.ts iniInvWornArmor() prior to this being
 *     called.  Each slot is either null/undefined (not worn) or a
 *     small record { otyp, a_ac, spe, oeroded, oeroded2 } — minimal
 *     subset of struct obj sufficient for ARM_BONUS.
 *   - uleft/uright/uamul: at post_init, no rings or amulets are worn
 *     (ini_inv only puts on armor pieces; rings/amulets stay in invent
 *     until the player puts them on).  We still emit the C-faithful
 *     branches; they are no-ops on the current u_init state.
 *   - HProtection & INTRINSIC: the only intrinsic Protection at start
 *     is granted by Monk's u.ublessed = 0 default (no intrinsic), so
 *     this branch is a no-op at post_init.
 *   - u.uspellprot is 0 from u_init_misc().
 *   - SET_BOTL() is the C status-line dirty flag.  Ported as
 *     g.disp.botl = 1 (do_wear.c:2511; hack.h:1728).
 */
export function find_ac() {
    const g = game;
    g.u = g.u || {};
    const u = g.u;
    /* C ref: do_wear.c:2476 — int uac = mons[u.umonnum].ac.  u.umonnum is set
     * by u_init.c:991 (u.umonnum = u.umonster = gu.urole.mnum, js/u_init.js:327)
     * and re-set by polymon(); every player-class monster has ac=10, so this is
     * identical to the previous hardcoded 10 for an un-polymorphed hero and
     * correct for a poly'd one (red dragon: -1). */
    let uac = MONS_AC[u.umonnum | 0];
    if (uac === undefined) uac = 10;
    /* armor class from worn gear.  The second argument is the slot's W_ARM* mask
     * so armBonus can find the gi.invent node for the slot; see armBonus and
     * _worn_invent_node for why the two representations must both be read. */
    if (u.uarm)
        uac -= armBonus(u.uarm, W_ARM);
    if (u.uarmc)
        uac -= armBonus(u.uarmc, W_ARMC);
    if (u.uarmh)
        uac -= armBonus(u.uarmh, W_ARMH);
    if (u.uarmf)
        uac -= armBonus(u.uarmf, W_ARMF);
    if (u.uarms)
        uac -= armBonus(u.uarms, W_ARMS);
    if (u.uarmg)
        uac -= armBonus(u.uarmg, W_ARMG);
    if (u.uarmu)
        uac -= armBonus(u.uarmu, W_ARMU);
    if (u.uleft && u.uleft.otyp === RIN_PROTECTION)
        uac -= (u.uleft.spe | 0);
    if (u.uright && u.uright.otyp === RIN_PROTECTION)
        uac -= (u.uright.spe | 0);
    if (u.uamul && u.uamul.otyp === AMULET_OF_GUARDING)
        uac -= 2; /* fixed amount; main benefit is to MC */
    /* armor class from other sources */
    if ((u.uprops?.[PROTECTION]?.intrinsic | 0) & INTRINSIC)
        uac -= (u.ublessed | 0);
    uac -= (u.uspellprot | 0);
    /* put a cap on armor class — abs(uac) <= AC_MAX (you.h:466). */
    if (Math.abs(uac) > AC_MAX)
        uac = sgn(uac) * AC_MAX;
    if (uac !== u.uac) {
        u.uac = uac;
        /* C ref: do_wear.c:2511 — SET_BOTL() fires whenever uac changes.
         * hack.h:1728 expands SET_BOTL() to event_log(...) + disp.botl = TRUE.
         * This is observable at post_init snapshot time; bot() reset in W12.1
         * clears disp.botl=0 before find_ac runs, so we must set it back here. */
        if (g.disp)
            g.disp.botl = 1;
    }
}
export function hard_helmet(obj) {
    if (!obj || (obj.oclass | 0) !== ARMOR_CLASS)
        return false;
    return isMetallic(obj) || isCrackable(obj);
}
export function reset_remarm() {
    const g = game;
    g.context = g.context || {};
    g.context.takeoff = g.context.takeoff || {};
    g.context.takeoff.what = 0;
    g.context.takeoff.mask = 0;
    g.context.takeoff.disrobing = '';
}
/* ECMD_* return codes — C ref: hack.h (cmd dispatch result flags). */
const ECMD_CANCEL = 2;
const ECMD_OK = 0;
const ECMD_TIME = 1;
/* C ref: do_wear.c:15 — c_that_[] = "that".  already_wearing() picks the
 * trailing punctuation by pointer identity ('!' when cc == c_that_, '.'
 * otherwise — do_wear.c:2014). */
const c_that_ = 'that';
/* C ref: do_wear.c:10-15 — the rest of the same static string block, read by
 * canwearobj()'s per-slot arms.  C compares `which != c_cloak` by POINTER
 * identity; every assignment to `which` here comes from these same consts, so
 * a JS string `!==` is equivalent. */
const c_armor = 'armor', c_suit = 'suit', c_shirt = 'shirt', c_cloak = 'cloak',
      c_gloves = 'gloves', c_boots = 'boots', c_shield = 'shield',
      c_weapon = 'weapon', c_sword = 'sword', c_axe = 'axe';
/* C ref: objclass.h — oc_armcat values. */
const ARM_SUIT = 0;
const ARM_SHIELD = 1;
const ARM_HELM = 2;
const ARM_GLOVES = 3;
const ARM_BOOTS = 4;
const ARM_CLOAK = 5;
const ARM_SHIRT = 6;
const ARMOR_ROW_BY_NAME = (() => {
    const m = new Map();
    for (const otyp of Object.keys(ARMOR_DATA)) {
        const row = ARMOR_DATA[otyp];
        if (row.name) m.set(row.name.toLowerCase(), row);
    }
    return m;
})();
/* Symbolic key ("CLOAK_OF_MAGIC_RESISTANCE") → C oc_name ("cloak of magic
 * resistance").  Every ARMOR() row's symbolic name is its oc_name upper-cased
 * with spaces as underscores, so the mapping needs no table of its own. */
function armorRowBySymbol(sym) {
    return ARMOR_ROW_BY_NAME.get(String(sym).toLowerCase().replace(/_/g, ' ')) || null;
}
/* Resolve the C objects[] row for an object record, preferring its numeric
 * otyp.  Returns null for records this table cannot identify. */
function armorRow(obj) {
    if (!obj) return null;
    const ot = obj.otyp;
    if (typeof ot === 'number') return ARMOR_DATA[ot] || null;
    if (typeof ot === 'string') return armorRowBySymbol(ot);
    return null;
}
/* Resolve {delay, armcat} for an object record.
 * C ref: objects[otmp->otyp].oc_delay / .oc_armcat. */
function armorMeta(obj) {
    return armorRow(obj) || { delay: 0, armcat: ARM_SUIT };
}


/* C ref: obj.h:347-350 Is_dragon_scales / Is_dragon_mail — contiguous otyp
 * runs.  Resolved by C oc_name rather than by re-typing the otyp bounds. */
function isDragonMailRow(row) {
    return !!row?.name && /^\w+ dragon scale mail$/.test(row.name);
}
function isDragonScalesRow(row) {
    return !!row?.name && /^\w+ dragon scales$/.test(row.name);
}
/* C ref: objnam.c:5468 suit_simple_name(suit) */
function suit_simple_name(row) {
    if (row) {
        if (isDragonMailRow(row)) return 'dragon mail';
        if (isDragonScalesRow(row)) return 'dragon scales';
        const suitnm = row.name;
        if (suitnm) {
            /* strlen > 5 && the last 5 chars are " mail"; likewise " jacket". */
            if (suitnm.length > 5 && suitnm.endsWith(' mail')) return 'mail';
            if (suitnm.length > 7 && suitnm.endsWith(' jacket')) return 'jacket';
        }
    }
    /* objnam.c:5484 — "suit" is lame but "armor" is ambiguous. */
    return 'suit';
}
/* C ref: objnam.c:5489 cloak_simple_name(cloak).  ALCHEMY_SMOCK's smock/apron
 * split depends on oc_name_known && dknown; every cloak has oc_delay 0 so this
 * never feeds armoroff()'s nomovemsg, but keep the discovery-state branch
 * faithful for the other callers. */
function cloak_simple_name(row, obj) {
    if (row) {
        if (row.name === 'robe') return 'robe';
        if (row.name === 'mummy wrapping') return 'wrapping';
        if (row.name === 'alchemy smock')
            return ((game._oc_name_known && game._oc_name_known[obj?.otyp]) && obj?.dknown) ? 'smock' : 'apron';
    }
    return 'cloak';
}
/* C ref: objnam.c:5510 helm_simple_name(helmet) — !hard_helmet ? "hat" : "helm".
 * hard_helmet (do_wear.c:568) = is_helmet && (is_metallic || is_crackable). */
function helm_simple_name(row) {
    const hard = !!row && row.armcat === ARM_HELM
        && (armorIsMetallic(row) || armorIsCrackable(row));
    return hard ? 'helm' : 'hat';
}
/* C ref: objnam.c:5529 gloves_simple_name(gloves) — "gauntlets" when the name
 * the hero can currently see contains "gauntlets" (actual name once the type is
 * known, description otherwise); needs dknown. */
function gloves_simple_name(row, obj) {
    if (row && obj?.dknown) {
        const visible = (game._oc_name_known && game._oc_name_known[obj?.otyp]) ? row.name : row.descr;
        if (visible && visible.includes('gauntlets')) return 'gauntlets';
    }
    return 'gloves';
}
/* C ref: objnam.c:5548 boots_simple_name(boots) — "shoes" when the description
 * contains "shoes", or the actual name does and the type is known. */
function boots_simple_name(row, obj) {
    if (row && obj?.dknown) {
        if (row.descr && row.descr.includes('shoes')) return 'shoes';
        if ((game._oc_name_known && game._oc_name_known[obj?.otyp]) && row.name && row.name.includes('shoes'))
            return 'shoes';
    }
    return 'boots';
}
/* C ref: objnam.c:5567 shield_simple_name(shield) */
function shield_simple_name(row, obj) {
    if (row && row.name === 'shield of reflection')
        return obj?.dknown ? 'silver shield' : 'smooth shield';
    return 'shield';
}
/* C ref: objnam.c:5597 shirt_simple_name(shirt) — use the canonical object
 * naming body already imported above instead of keeping a duplicate shadow. */
function shirt_simple_name(shirt) {
    return shirt_simple_name_obj(shirt);
}
/* C ref: objnam.c:5435 armor_simple_name(armor) — the category dispatcher over
 * the family above.  It had no combined form here at all, only the seven
 * per-category helpers, so js/mhitu.js's steal() ARMOR_CLASS arm (C
 * steal.c:530/:540, the nymph's "you start taking off your <what>") had nothing
 * to call.  js/objnam.js exports a function of this name but the file-header
 * note at :393 records why it is not usable yet: its dispatch switch swapped
 * ARM_SHIELD and ARM_CLOAK, so a cloak reaches a throwing shield stub.  Exported
 * from HERE, where the helpers are backed by js/armor_data.js (the generated C
 * table), rather than adding a fourth copy at the call site. */
export function armor_simple_name_dw(obj) {
    const row = armorRow(obj);
    switch (armorMeta(obj).armcat) {
    case ARM_SUIT:   return suit_simple_name(row);
    case ARM_CLOAK:  return cloak_simple_name(row, obj);
    case ARM_HELM:   return helm_simple_name(row);
    case ARM_GLOVES: return gloves_simple_name(row, obj);
    case ARM_BOOTS:  return boots_simple_name(row, obj);
    case ARM_SHIELD: return shield_simple_name(row, obj);
    case ARM_SHIRT:  return shirt_simple_name(obj);
    /* C's default is simpleonames() + impossible(); an unknown armcat cannot
     * arise here because armorMeta() falls back to ARM_SUIT. */
    default:         return suit_simple_name(row);
    }
}
/* C ref: objects[obj->otyp].oc_armcat — the armor category read by
 * objnam.c armor_simple_name().  objnam.js has no oc_armcat column of its own
 * (game._oc_armcat is never populated), so it resolves the category through
 * here; ARMOR_DELAY_CAT_BY_OTYP is the authoritative otyp→armcat mapping in
 * this port.  Falls back to ARM_SUIT for an otyp not yet in that table, which
 * is what objnam.js did unconditionally before. */
export function oc_armcat(obj) {
    return armorMeta(obj).armcat;
}
/* Map a worn-armor record's u_init slot to its oc_armcat, so we can pick the
 * correct *_off callback / clear the correct u.* slot.  The slot is set by
 * src/u_init.ts ARMOR_META. */
const SLOT_TO_ARMCAT = {
    uarm: ARM_SUIT, uarms: ARM_SHIELD, uarmh: ARM_HELM,
    uarmg: ARM_GLOVES, uarmf: ARM_BOOTS, uarmc: ARM_CLOAK, uarmu: ARM_SHIRT,
};
const ARMCAT_TO_SLOT = ['uarm', 'uarms', 'uarmh', 'uarmg', 'uarmf', 'uarmc', 'uarmu'];
/* C ref: worn.c:26 worn[] — the (w_mask, w_obj) pairs setworn() walks.  Keyed by
 * the JS slot name so both the don (setworn_armor) and doff (takeoff_slot) sides
 * agree on which owornmask bit / extrinsic mask the slot owns. */
const SLOT_TO_WMASK = {
    uarm: W_ARM, uarms: W_ARMS, uarmh: W_ARMH, uarmg: W_ARMG,
    uarmf: W_ARMF, uarmc: W_ARMC, uarmu: W_ARMU,
};
/* BRIDGE OVER THE WORN-ITEM MODEL GAP (see armBonus/_worn_invent_node above and
 * the note at js/read.js:1337-1353).  C has ONE object per worn slot: setworn()
 * puts the gi.invent node itself into u.uarm/uarmc/…, so `u.uarmc` is a valid
 * inventory pointer that dropx()/useup() can act on.  This port keeps two halves
 * — the chargen stand-in that u_init.js ROLE_STARTER_ARMOR built (symbolic string
 * otyp, never in gi.invent) and the real numeric-otyp gi.invent node carrying the
 * W_ARM* mask.  Any C code that hands u.<slot> to an INVENTORY operation needs
 * the invent half; hand it the stand-in and the operation silently no-ops
 * (polyself.c:1141 dropp's `for (otmp = gi.invent; …) if (otmp == obj)` scan
 * never matches, so break_armor() shed nothing at all).
 * Returns the gi.invent node still bearing the slot's worn mask, falling back to
 * u.<slot> when there is only one record.  MUST be called BEFORE the slot's
 * setworn(0, mask) clears that mask.  RNG-free, read-only. */
export function worn_invent_obj(slot) {
    const g = game;
    const stand_in = (g.u && slot) ? g.u[slot] : null;
    const mask = SLOT_TO_WMASK[slot] | 0;
    const inode = mask ? _worn_invent_node(mask) : null;
    return inode || stand_in;
}
/* afternmv string tags — C stores a function pointer ga.afternmv; the JS
 * faithful analogue is a string tag dispatched through afternmv_dispatch()
 * (allmain.js).  One tag per armor category. */
const ARMCAT_TO_AFTERNMV = [
    'Armor_off', 'Shield_off', 'Helmet_off',
    'Gloves_off', 'Boots_off', 'Cloak_off', 'Shirt_off',
];
const ARMCAT_TO_AFTERNMV_ON = [
    'Armor_on', 'Shield_on', 'Helmet_on',
    'Gloves_on', 'Boots_on', 'Cloak_on', 'Shirt_on',
];
/* Shared slot bookkeeping used at the C callbacks' setworn(NULL, mask) sites.
 * Do not recompute AC here: the main loop owns that refresh after removal. */
export async function takeoff_slot(slot) {
    await setworn(null, SLOT_TO_WMASK[slot]);
    return 0;
}
/* Polymorph uses the same slot bookkeeping. Its callback-specific effects
 * still need consolidation with the complete armor removal callbacks. */
export function takeoff_slot_noac(slot) {
    return takeoff_slot(slot);
}
/* C ref: do_wear.c:908-930 Armor_off() — setworn(0, W_ARM) first (takeoff_slot),
 * THEN dragon_armor_handling(otmp, FALSE, TRUE) on the piece just removed.  The
 * arti-light half (do_wear.c:920-923) is deferred with the GOLD arm. */
export async function Armor_off()  {
    const otmp = game.u ? game.u.uarm : null;
    const r = await takeoff_slot('uarm');
    await dragon_armor_handling(otmp, false, true);
    return r;
}
export function Shield_off() { return takeoff_slot('uarms'); }
export async function Helmet_off() {
    const u = game.u;
    const otmp = u ? u.uarmh : null;
    const cancelledDon = !!game.context?.takeoff?.cancelled_don;
    if (game.context?.takeoff)
        game.context.takeoff.mask = (game.context.takeoff.mask | 0) & ~W_ARMH;
    if (otmp && ((otmp.otyp | 0) === FEDORA_OTYP || otmp.otyp === 'FEDORA')) {
        /* Role_if(PM_ARCHEOLOGIST) — the roles[] ORDINAL, see Helmet_on. */
        const ARCHEOLOGIST_ROLE_IDX = 0; /* roles.js index; C roles[0] = Arc */
        if (((game.flags?.initrole ?? -1) | 0) === ARCHEOLOGIST_ROLE_IDX)
            change_luck(-1);
    }
    if (otmp && (otmp.otyp | 0) === CORNUTHAUM_OTYP
        && !cancelledDon) {
        // C do_wear.c:536-540: undo only a completed donning bonus.
        u.abon ||= {};
        u.abon.a ||= [0, 0, 0, 0, 0, 0];
        u.abon.a[A_CHA] = (u.abon.a[A_CHA] | 0)
            + (game.flags?.initrole === 12 ? -1 : 1);
        if (game.disp) game.disp.botl = 1;
    }
    if (otmp && (otmp.otyp | 0) === HELM_OF_BRILLIANCE
        && !cancelledDon)
        adj_abon(otmp, -(otmp.spe | 0));
    const result = await takeoff_slot('uarmh');
    if (game.context?.takeoff)
        game.context.takeoff.cancelled_don = false;
    return result;
}
/* C do_wear.c:645-696 — remove gloves, then immediately test bare-handed
 * wielded corpses after their protection is gone. */
export async function Gloves_off() {
    const u = game.u;
    const otmp = u ? u.uarmg : null;
    const cancelledDon = !!game.context?.takeoff?.cancelled_don;
    const otyp = otmp ? (otmp.otyp | 0) : -1;
    const oprop = otyp >= 0 ? (MKOBJ_OC_OPROP[otyp] | 0) : 0;
    const rec = oprop ? u?.uprops?.[oprop] : null;
    const oldprop = rec ? ((rec.extrinsic | 0) & ~W_ARMG) : 0;
    if (game.context?.takeoff)
        game.context.takeoff.mask = (game.context.takeoff.mask | 0) & ~W_ARMG;
    if (otyp === GAUNTLETS_OF_FUMBLING_OTYP
        && !oldprop && !((rec?.intrinsic | 0) & ~PROP_TIMEOUT) && rec)
        rec.intrinsic = rec.extrinsic = 0;
    else if (otyp === GAUNTLETS_OF_POWER_OTYP) {
        makeknown_otyp(otyp);
        if (game.disp) game.disp.botl = 1;
    } else if (otyp === GAUNTLETS_OF_DEXTERITY && !cancelledDon)
        adj_abon(otmp, -(otmp.spe | 0));
    const result = await takeoff_slot('uarmg');
    if (game.context?.takeoff)
        game.context.takeoff.cancelled_don = false;
    /* C do_wear.c:676-684 — losing gauntlets of power can immediately alter
     * carrying capacity; slippery fingers belong to the hero, not the absent
     * gloves, after an involuntary removal as well. */
    await encumber_msg();
    if (Glib_dw())
        make_glib(0);
    const voluntary = !game.context?.mon_moving && !otmp?.in_use;
    await wielding_corpse(u?.uwep, otmp, voluntary);
    await wielding_corpse(u?.uswapwep, otmp, voluntary);
    return result;
}

/* C do_wear.c:608-641 — called after gloves/yellow dragon armor are lost and
 * when timeout.c expires temporary stone resistance. */
export async function wielding_corpse(obj, how, voluntary) {
    const u = game.u || {};
    if (!obj || (obj.otyp | 0) !== PETRIFY_CORPSE || u.uarmg)
        return;
    if (obj !== u.uwep && (obj !== u.uswapwep || !u.twoweap))
        return;
    const stone_resistant = () => !!(u.uprops?.[STONE_RES_PROP]?.intrinsic
        || u.uprops?.[STONE_RES_PROP]?.extrinsic);
    if (!corpse_touch_petrifies(permonstTemplate(obj.corpsenm | 0)) || stone_resistant())
        return;
    await pline(`You ${how && is_gloves(how) ? 'now wield' : 'are wielding'} ${
        petrify_corpse_xname(obj, null, PETRIFY_ARTICLE)} in your bare ${
        makeplural(body_part(HAND))}.`);
    const hbuf = how
        ? `${voluntary ? 'removing' : 'losing'} ${is_gloves(how)
            ? gloves_simple_name_obj(how)
            : petrify_simpleonames(how).replace('set of ', '')}`
        : 'resistance timing out';
    await corpse_instapetrify(`${hbuf} while wielding ${petrify_killer_xname(obj)}`.slice(0, 255));
    if (!stone_resistant())
        await remove_worn_item(obj, false);
}

export async function Boots_off() {
    const g = game;
    const u = g.u || {};
    const otmp = u.uarmf;
    const otyp = otmp ? (otmp.otyp | 0) : -1;
    const oprop = otyp >= 0 ? (MKOBJ_OC_OPROP[otyp] | 0) : 0;
    const rec = oprop && u.uprops ? u.uprops[oprop] : null;
    const oldprop = rec ? ((rec.extrinsic | 0) & ~W_ARMF) : 0;
    const cancelled = !!g.context?.takeoff?.cancelled_don;
    const result = await takeoff_slot('uarmf');
    if (otyp === ELVEN_BOOTS_OTYP_DW) {
        /* C do_wear.c:294 — toggle_stealth() reports the loss of the boots'
         * stealth after setworn clears their extrinsic bit. */
        const HStealth = rec ? (rec.intrinsic | 0) : 0;
        const BStealth = rec ? (rec.blocked | 0) : 0;
        if (!oldprop && !HStealth && !BStealth) {
            makeknown_otyp(otyp);
            await pline('You sure are noisy.');
        }
    } else if (otyp === FUMBLE_BOOTS_OTYP_DW) {
        /* C do_wear.c:319-321 — removing fumble boots clears their timeout
         * when no other untimed fumbling source remains. */
        const HFumbling = rec ? (rec.intrinsic | 0) : 0;
        if (!oldprop && !(HFumbling & ~PROP_TIMEOUT) && rec)
            rec.intrinsic = HFumbling & ~PROP_TIMEOUT;
    } else if (otyp === SPEED_BOOTS_OTYP) {
        /* C do_wear.c:274-280 — after setworn clears the boots, reveal the
         * speed boots and report slowing only when no speed source remains. */
        const HFast = rec ? (rec.intrinsic | 0) : 0;
        if (!oldprop && !(HFast & PROP_TIMEOUT) && !cancelled) {
            makeknown_otyp(otyp);
            await pline(`You feel yourself slow down${HFast ? ' a bit' : ''}.`);
        }
    } else if (otyp === LEVITATION_BOOTS_OTYP_DW) {
        const BLevFromOutside = (rec ? (rec.blocked | 0) : 0) & 0x04000000;
        if (!oldprop && !(rec ? (rec.intrinsic | 0) : 0)
            && !BLevFromOutside && !cancelled) {
            await float_down(0, 0);
            makeknown_otyp(otyp);
        } else {
            float_vs_flight();
        }
    }
    if (g.context?.takeoff)
        g.context.takeoff.cancelled_don = false;
    return result;
}
export function Shirt_off()  { return takeoff_slot('uarmu'); }
/* C ref: youprop.h — a prop is "on" when intrinsic or extrinsic is set and it
 * is not blocked.  Mirrored locally from js/mcastu.js propOn()/Invis() (not
 * exported there); js/mklev.js Displaced_mv()/Invis_mv() is the same precedent. */
function _propOn(p) {
    const r = game.u?.uprops?.[p];
    return !!(r && ((r.intrinsic | 0) || (r.extrinsic | 0)) && !(r.blocked | 0));
}
/* C ref: do_wear.c:147 toggle_displacement(obj, oldprop, on).  Give feedback and
 * discover the cloak iff the hero's displacement state is actually changing AND
 * the hero can notice it (see self, or sense monsters by telepathy/detection).
 * RNG-free.
 *
 * For timed displacement C passes obj==Null and only emits the message —
 * mirrored by the `if (obj)` guard on makeknown. */
export async function toggle_displacement(obj, oldprop, on) {
    const g = game;
    /* do_wear.c:154 — suppress on the initial don and on a cancelled don. */
    if (on ? g.initial_don : g.context?.takeoff?.cancelled_don)
        return;
    const rec = g.u?.uprops?.[DISPLACED_PROP];
    if (!oldprop                                  /* extrinsic from something else */
        && !(rec ? (rec.intrinsic | 0) : 0)       /* timed, from eating */
        && !(rec ? (rec.blocked | 0) : 0)         /* (theoretical) */
        && (() => {
            const blind = _propOn(BLINDED_PROP);
            /* C youprop.h: See_invisible, Blind_telepat,
             * Unblind_telepat and Detect_monsters do not consult `blocked`. */
            const seeInvisible = g.u?.uprops?.[SEE_INVIS_PROP];
            const telepat = g.u?.uprops?.[TELEPAT_DISP_PROP];
            const detect = g.u?.uprops?.[DETECT_MONSTERS_PROP];
            const canSeeInvisible = !!((seeInvisible?.intrinsic | 0) || (seeInvisible?.extrinsic | 0));
            const invisible = _propOn(INVIS_PROP) && !canSeeInvisible;
            const unblindTelepat = !!(telepat?.extrinsic | 0);
            const blindTelepat = !!((telepat?.intrinsic | 0) || (telepat?.extrinsic | 0));
            const detectMonsters = !!((detect?.intrinsic | 0) || (detect?.extrinsic | 0));
            return ((!blind && !g.u?.uswallow && !invisible)
                || unblindTelepat || (blindTelepat && blind) || detectMonsters);
        })()) {
        if (obj)
            makeknown_otyp(obj.otyp);
        await pline(`You feel that monsters${on ? '' : ' no longer'} have difficulty pinpointing your location.`);
    }
}
/* C ref: do_wear.c:383 Cloak_off().  Unlike the other *_off callbacks this one
 * dispatches on the cloak's otyp: most cloaks are pure bookkeeping, but the
 * elven cloak, cloak of displacement, mummy wrapping and cloak of invisibility
 * have visible removal effects.  oldprop is read BEFORE setworn() clears the
 * worn bit, exactly as C does (do_wear.c:387).  RNG-free. */
export async function Cloak_off() {
    const g = game;
    const otmp = g.u?.uarmc;
    const otyp = otmp ? otmp.otyp : 0;
    /* do_wear.c:387 — oldprop = u.uprops[oc_oprop].extrinsic & ~WORN_CLOAK. */
    const oprop = (typeof otyp === 'number') ? (MKOBJ_OC_OPROP[otyp | 0] | 0) : 0;
    const propRec = oprop ? g.u?.uprops?.[oprop] : null;
    const oldprop = propRec ? ((propRec.extrinsic | 0) & ~W_ARMC) : 0;
    /* svc.context.takeoff.mask &= ~W_ARMC — takeoff-selection bookkeeping. */
    if (g.context?.takeoff)
        g.context.takeoff.mask = (g.context.takeoff.mask | 0) & ~W_ARMC;
    /* do_wear.c:391 setworn((struct obj *) 0, W_ARMC) — clears the slot, the
     * worn mask, and the conferred extrinsic bit (worn.c:73). */
    if (propRec)
        propRec.extrinsic = (propRec.extrinsic | 0) & ~W_ARMC;
    await takeoff_slot('uarmc');
    if (otyp === ELVEN_CLOAK_OTYP) {
        /* C do_wear.c:401 toggle_stealth(otmp, oldprop, FALSE) */
        if (!g.context?.takeoff?.cancelled_don && !oldprop
            && !(propRec ? (propRec.intrinsic | 0) : 0)
            && !(propRec ? (propRec.blocked | 0) : 0)) {
            makeknown_otyp(otyp);
            await pline('You sure are noisy.');
        }
    } else if (otyp === CLOAK_OF_DISPLACEMENT_OTYP || otyp === 'CLOAK_OF_DISPLACEMENT')
        await toggle_displacement(otmp, oldprop, false);
    return 0;
}
function don_slot(_slot) {
    const otmp = game.u ? game.u[_slot] : null;
    if (otmp && !otmp.known)
        otmp.known = 1;
    /* NO find_ac() — symmetric with takeoff_slot() above and for the same C
     * reason: accessory_or_armor_on() (do_wear.c:2377) does setworn(obj, mask)
     * and then the *_on callback, and none of Armor_on/Shield_on/Helmet_on/
     * Gloves_on/Boots_on/Cloak_on/Shirt_on calls find_ac.  The don's AC change
     * lands at the next allmain.c:453 find_ac(), which is why the "You are now
     * wearing ..." pline still pages against the pre-don AC.  RNG-free. */
    return 0;
}
const GOLD_DRAGON_SCALE_MAIL_DW = 102, RED_DRAGON_SCALE_MAIL_DW = 104,
      WHITE_DRAGON_SCALE_MAIL_DW = 105, ORANGE_DRAGON_SCALE_MAIL_DW = 106,
      BLACK_DRAGON_SCALE_MAIL_DW = 107, BLUE_DRAGON_SCALE_MAIL_DW = 108,
      GREEN_DRAGON_SCALE_MAIL_DW = 109, YELLOW_DRAGON_SCALE_MAIL_DW = 110,
      GOLD_DRAGON_SCALES_DW = 112, RED_DRAGON_SCALES_DW = 114,
      WHITE_DRAGON_SCALES_DW = 115, ORANGE_DRAGON_SCALES_DW = 116,
      BLACK_DRAGON_SCALES_DW = 117, BLUE_DRAGON_SCALES_DW = 118,
      GREEN_DRAGON_SCALES_DW = 119, YELLOW_DRAGON_SCALES_DW = 120;
/* C youprop.h: EProp |= W_ARM / EProp &= ~W_ARM over u.uprops[p].extrinsic. */
function _dw_set_extrinsic(prop, on) {
    const u = game.u;
    if (!u)
        return;
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[prop]) u.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const rec = u.uprops[prop];
    if (on)
        rec.extrinsic = (rec.extrinsic | 0) | W_ARM;
    else
        rec.extrinsic = (rec.extrinsic | 0) & ~W_ARM;
}
/* C youprop.h:375-377 — HFast is u.uprops[FAST].intrinsic, EFast is .extrinsic;
 *   Fast      = (HFast || EFast)
 *   Very_fast = ((HFast & ~INTRINSIC) || EFast) */
const INTRINSIC_DW = 0x10000000; /* prop.h INTRINSIC */
function _dw_HFast() { return (game.u?.uprops?.[FAST_PROP]?.intrinsic | 0); }
function _dw_EFast() { return (game.u?.uprops?.[FAST_PROP]?.extrinsic | 0); }
function _dw_Fast() { return !!(_dw_HFast() || _dw_EFast()); }
function _dw_Very_fast() { return !!((_dw_HFast() & ~INTRINSIC_DW) || _dw_EFast()); }
async function dragon_armor_handling(otmp, puton, on_purpose) {
    if (!otmp)
        return;
    switch (otmp.otyp | 0) {
    /* grey: no extra effect */
    /* silver: no extra effect */
    case BLACK_DRAGON_SCALES_DW:
    case BLACK_DRAGON_SCALE_MAIL_DW:
        _dw_set_extrinsic(DRAIN_RES_PROP, puton);   /* EDrain_resistance */
        break;
    case BLUE_DRAGON_SCALES_DW:
    case BLUE_DRAGON_SCALE_MAIL_DW:
        if (puton) {
            /* C do_wear.c:820-822 — the message is emitted BEFORE EFast is
             * set, so Very_fast/Fast here read the hero's OTHER speed sources. */
            if (!_dw_Very_fast())
                await You(`speed up${_dw_Fast() ? ' a bit more' : ''}.`);
            _dw_set_extrinsic(FAST_PROP, true);     /* EFast |= W_ARM */
        } else {
            _dw_set_extrinsic(FAST_PROP, false);
            /* C do_wear.c:826-827 — svc.context.takeoff.cancelled_don. */
            if (!_dw_Very_fast() && !(game.context?.takeoff?.cancelled_don))
                await You('slow down.');
        }
        break;
    case GREEN_DRAGON_SCALES_DW:
    case GREEN_DRAGON_SCALE_MAIL_DW:
        _dw_set_extrinsic(SICK_RES_PROP, puton);    /* ESick_resistance */
        break;
    case RED_DRAGON_SCALES_DW:
    case RED_DRAGON_SCALE_MAIL_DW:
        _dw_set_extrinsic(INFRAVISION_PROP, puton); /* EInfravision */
        see_monsters();                             /* C do_wear.c:844, both ways */
        break;
    case GOLD_DRAGON_SCALES_DW:
    case GOLD_DRAGON_SCALE_MAIL_DW:
        /* DEFERRED — C do_wear.c:848-850
         *     (void) make_hallucinated((long) !puton,
         *                              program_state.restoring ? FALSE : TRUE,
         *                              W_ARM);
         * make_hallucinated lives in js/potion.js and this module has no import
         * edge to it; see the header note. */
        break;
    case ORANGE_DRAGON_SCALES_DW:
    case ORANGE_DRAGON_SCALE_MAIL_DW:
        _dw_set_extrinsic(FREE_ACTION_PROP, puton); /* Free_action */
        break;
    case YELLOW_DRAGON_SCALES_DW:
    case YELLOW_DRAGON_SCALE_MAIL_DW:
        _dw_set_extrinsic(STONE_RES_PROP, puton);   /* EStone_resistance */
        if (!puton) {
            await wielding_corpse(game.u?.uwep, otmp, on_purpose);
            await wielding_corpse(game.u?.uswapwep, otmp, on_purpose);
        }
        break;
    case WHITE_DRAGON_SCALES_DW:
    case WHITE_DRAGON_SCALE_MAIL_DW:
        _dw_set_extrinsic(SLOW_DIGESTION_PROP, puton); /* ESlow_digestion */
        break;
    default:
        break;
    }
}
/* C ref: do_wear.c:885-906 Armor_on() — the suit slot's donning afternmv.
 * The `if (!uarm->known) uarm->known = 1` half is don_slot()'s shared tail; the
 * dragon_armor_handling call was missing entirely.  artifact_light(uarm) (gold
 * DSM's worn glow, do_wear.c:899-905) needs the artifact table and stays
 * deferred with the GOLD arm above. */
export async function Armor_on()  {
    await dragon_armor_handling(game.u ? game.u.uarm : null, true, true);
    return don_slot('uarm');
}
export function Shield_on() { return don_slot('uarms'); }
const FEDORA_OTYP = 92, CORNUTHAUM_OTYP = 93;
export async function Helmet_on() {
    const u = game.u;
    /* u_init.js's starting-gear scaffold (iniInvWornArmor) stores the worn
     * armor's otyp as its NAME string, while mksobj-created objects carry the
     * numeric otyp; accept both, the same dual test Cloak_on already uses for
     * CLOAK_OF_DISPLACEMENT (do_wear.js:544). */
    if (u.uarmh && ((u.uarmh.otyp | 0) === FEDORA_OTYP || u.uarmh.otyp === 'FEDORA')) {
        /* C: Role_if(PM_ARCHEOLOGIST), i.e. gu.urole.mnum == PM_ARCHEOLOGIST.
         * NOTE the convention gap: C's roles[].mnum IS the PM_ monster index
         * (PM_ARCHEOLOGIST), but js/roles.js stores the roles[] ORDINAL there
         * (Arc=0 … Wiz=12) and js/allmain.js does not even copy it onto
         * g.urole — so `game.urole.mnum === PM_ARCHEOLOGIST` (331 in
         * pm.generated.js) was undefined === 331, permanently false.  Use the
         * ordinal on g.flags.initrole, the Role_if idiom the rest of the port
         * already uses (dokick.js martial(), o_init.js skill_based_spellbook_id,
         * both roles[]-indexed). */
        const ARCHEOLOGIST_ROLE_IDX = 0; /* roles.js index; C roles[0] = Arc */
        if (((game.flags?.initrole ?? -1) | 0) === ARCHEOLOGIST_ROLE_IDX)
            change_luck(1);
    }
    if (u.uarmh && (u.uarmh.otyp | 0) === CORNUTHAUM_OTYP) {
        // C do_wear.c:454-460: role bonus is independent of enchantment.
        u.abon ||= {};
        u.abon.a ||= [0, 0, 0, 0, 0, 0];
        u.abon.a[A_CHA] = (u.abon.a[A_CHA] | 0)
            + (game.flags?.initrole === 12 ? 1 : -1);
        if (game.disp) game.disp.botl = 1;
        makeknown_otyp(u.uarmh.otyp);
    }
    if (u.uarmh && (u.uarmh.otyp | 0) === HELM_OF_BRILLIANCE)
        adj_abon(u.uarmh, u.uarmh.spe | 0);
    /* C do_wear.c:451-452 HELM_OF_CAUTION: see_monsters(). */
    if (u.uarmh && (u.uarmh.otyp | 0) === 95)
        see_monsters();
    /* C do_wear.c:480-505 DUNCE_CAP (HELM_OF_OPPOSITE_ALIGNMENT's uchangealign
     * half is still unported and stays deferred). */
    if (u.uarmh && (u.uarmh.otyp | 0) === 94) {
        if (!u.uarmh.cursed) {
            if (_propOn(BLINDED_PROP))
                await pline(`${Tobjnam(u.uarmh, 'vibrate')} for a moment.`);
            else
                await pline(`${Tobjnam(u.uarmh, 'glow')} ${hcolor('black')} for a moment.`);
            curse(u.uarmh);
            if (_propOn(BLINDED_PROP))
                set_bknown(u.uarmh, 0);
            else if ((game.flags?.initrole ?? -1) === 6) /* Role_if(PM_CLERIC) */
                set_bknown(u.uarmh, 1);
            else if (u.uarmh.bknown)
                update_inventory();
        }
        if (game.disp) game.disp.botl = 1;
        const hallu = game.u?.uprops?.[HALLUC]?.intrinsic
            && !(game.u.uprops[HALLUC_RES]?.intrinsic || game.u.uprops[HALLUC_RES]?.extrinsic);
        if (hallu) {
            await pline('My brain hurts!');
        } else {
            const di = C_ATTR_TO_DISP[A_INT] ?? A_INT;
            const tot = ((u.acurr?.a?.[di]) | 0) + ((u.abon?.a?.[di]) | 0) + ((u.atemp?.a?.[di]) | 0);
            await pline(`You feel ${acurr(u, A_INT) <= tot ? 'like sitting in a corner' : 'giddy'}.`);
        }
    }
    return don_slot('uarmh');
}
/* Gloves_on's real body (with C's per-otyp switch) is below, beside Cloak_on. */
const LOW_BOOTS_OTYP = 163, IRON_SHOES_OTYP = 164, HIGH_BOOTS_OTYP = 165;
const SPEED_BOOTS_OTYP = 166, JUMPING_BOOTS_OTYP = 168, KICKING_BOOTS_OTYP = 170;
const WATER_WALKING_BOOTS_OTYP_DW = 167;
export const ELVEN_BOOTS_OTYP_DW = 169, LEVITATION_BOOTS_OTYP_DW = 172;
const FUMBLE_BOOTS_OTYP_DW = 171;
const PROP_TIMEOUT = 0x00ffffff; /* C prop.h TIMEOUT */
export async function Boots_on() {
    const g = game;
    const u = g.u || (g.u = {});
    const otmp = u.uarmf;
    if (!otmp) return don_slot('uarmf');
    const otyp = otmp.otyp | 0;
    const oprop = MKOBJ_OC_OPROP[otyp] | 0;
    const rec = (oprop && u.uprops) ? u.uprops[oprop] : null;
    const oldprop = rec ? ((rec.extrinsic | 0) & ~W_ARMF) : 0;
    switch (otyp) {
        case LOW_BOOTS_OTYP:
        case IRON_SHOES_OTYP:
        case HIGH_BOOTS_OTYP:
        case JUMPING_BOOTS_OTYP:
        case KICKING_BOOTS_OTYP:
            break;
        case SPEED_BOOTS_OTYP: {
            /* Speed boots are still better than intrinsic speed, though not
             * better than potion speed (do_wear.c:219-226). */
            const HFast = rec ? (rec.intrinsic | 0) : 0;
            if (!oldprop && !(HFast & PROP_TIMEOUT)) {
                discover_object(otyp, true, true, true);
                await pline(`You feel yourself speed up${(oldprop || HFast) ? ' a bit more' : ''}.`);
            }
            break;
        }
        case ELVEN_BOOTS_OTYP_DW:
            /* C do_wear.c:229 — toggle_stealth() discovers the boots and
             * reports the new stealth state after setworn() has conferred
             * their extrinsic property. */
            if (!oldprop && !((rec ? (rec.intrinsic | 0) : 0))
                && !((rec ? (rec.blocked | 0) : 0))) {
                makeknown_otyp(otyp);
                if (Levitation() || Flying())
                    await pline('You float imperceptibly.');
                else
                    await pline('You walk very quietly.');
            }
            break;
        case WATER_WALKING_BOOTS_OTYP_DW:
            /* C do_wear.c:211-216 — Boots_on consumes the saved underwater
             * state after setworn has conferred water walking. */
            if (g.wasinwater) {
                if (!u.uinwater)
                    makeknown_otyp(otyp);
                g.wasinwater = 0;
            }
            break;
        case LEVITATION_BOOTS_OTYP_DW: {
            /* C do_wear.c:236-249 — levitation boots make the hero float
             * immediately when no other source or blocker is active. */
            const HLev = rec ? (rec.intrinsic | 0) : 0;
            const BLevFromOutside = (rec ? (rec.blocked | 0) : 0) & 0x04000000;
            if (!oldprop && !HLev && !BLevFromOutside) {
                otmp.known = 1;
                if (g.disp) g.disp.botl = 1;
                makeknown_otyp(otyp);
                await float_up();
                if (Levitation())
                    await spoteffects_for_levitation();
            } else {
                float_vs_flight();
            }
            break;
        }
        case FUMBLE_BOOTS_OTYP_DW:
            if (!oldprop && !((rec ? (rec.intrinsic | 0) : 0) & ~PROP_TIMEOUT)) {
                const _incr = rnd(20);
                if (rec) {
                    let v = ((rec.intrinsic | 0) & PROP_TIMEOUT) + _incr;
                    if (v > PROP_TIMEOUT) v = PROP_TIMEOUT;
                    rec.intrinsic = ((rec.intrinsic | 0) & ~PROP_TIMEOUT) | v;
                }
            }
            break;
        default:
            break;
    }
    /* do_wear.c:253-256 — boots' +/- is evident because of the status-line AC. */
    if (!otmp.known)
        otmp.known = 1;
    return don_slot('uarmf');
}
/* objects.h otyps for the cloak slot (OC_NAME row indices, cross-checked
 * against js/oc_name_data.js). */
const MUMMY_WRAPPING_OTYP = 138, ELVEN_CLOAK_OTYP = 139, ORCISH_CLOAK_OTYP = 140,
      DWARVISH_CLOAK_OTYP = 141, OILSKIN_CLOAK_OTYP_DW = 142, ROBE_OTYP_DW = 143,
      ALCHEMY_SMOCK_OTYP = 144, LEATHER_CLOAK_OTYP_DW = 145,
      CLOAK_OF_PROTECTION_OTYP = 146, CLOAK_OF_INVISIBILITY_OTYP = 147,
      CLOAK_OF_MAGIC_RESISTANCE_OTYP = 148;
export async function Cloak_on() {
    const g = game;
    const u = g.u || (g.u = {});
    const otmp = u.uarmc;
    if (!otmp)
        return don_slot('uarmc');
    /* The legacy iniInvWornArmor records carry a SYMBOLIC otyp; the switch is
     * numeric, so a string otyp falls to the shared tail (as it did before). */
    const otyp = (typeof otmp.otyp === 'number') ? (otmp.otyp | 0) : -1;
    const oprop = (otyp >= 0) ? (MKOBJ_OC_OPROP[otyp] | 0) : 0;
    const rec = (oprop && u.uprops) ? u.uprops[oprop] : null;
    const oldprop = rec ? ((rec.extrinsic | 0) & ~W_ARMC) : 0;
    switch (otyp) {
        case ORCISH_CLOAK_OTYP:
        case DWARVISH_CLOAK_OTYP:
        case CLOAK_OF_MAGIC_RESISTANCE_OTYP:
        case ROBE_OTYP_DW:
        case LEATHER_CLOAK_OTYP_DW:
            break;
        case CLOAK_OF_PROTECTION_OTYP:
            /* C do_wear.c:373 makeknown(uarmc->otyp) — credit_hero=TRUE, so
             * discover_object exercises A_WIS (rn2(19)) on first discovery. */
            makeknown_otyp(otyp);
            break;
        case ELVEN_CLOAK_OTYP:
            /* C do_wear.c:376 toggle_stealth(uarmc, oldprop, TRUE) */
            if (!g.initial_don && !oldprop
                && !(rec ? (rec.intrinsic | 0) : 0)
                && !(rec ? (rec.blocked | 0) : 0)) {
                makeknown_otyp(otyp);
                await pline('You move very quietly.');
            }
            break;
        case CLOAK_OF_DISPLACEMENT_OTYP:
            await toggle_displacement(otmp, oldprop, true);
            break;
        case MUMMY_WRAPPING_OTYP:
            /* C do_wear.c:381-388 — "it's already being worn, so we have to
             * cheat here": if the hero is invisible and not blind, the wrapping
             * makes them visible again.  HInvis/EInvis/See_invisible are the
             * same uprops reads toggle_displacement uses. */
            if (_propOn(INVIS_PROP) && !_propOn(BLINDED_PROP)) {
                newsym(u.ux | 0, u.uy | 0);
                await pline(`You can ${_propOn(SEE_INVIS_PROP)
                    ? 'no longer see through yourself' : 'see yourself'}!`);
            }
            break;
        case CLOAK_OF_INVISIBILITY_OTYP:
            /* C do_wear.c:389-398 — "since cloak of invisibility was worn, we
             * know mummy wrapping wasn't, so no need to check oldprop against
             * blocked". */
            if (!oldprop && !((rec ? (rec.intrinsic | 0) : 0)) && !_propOn(BLINDED_PROP)) {
                makeknown_otyp(otyp);
                newsym(u.ux | 0, u.uy | 0);
                await pline(`Suddenly you can${_propOn(SEE_INVIS_PROP)
                    ? ' see through' : 'not see'} yourself.`);
            }
            break;
        case OILSKIN_CLOAK_OTYP_DW:
            /* C do_wear.c:400: pline("%s very tightly.", Tobjnam(uarmc, "fit")) */
            await pline(`${Tobjnam(otmp, 'fit')} very tightly.`);
            break;
        case ALCHEMY_SMOCK_OTYP:
            /* C do_wear.c:404: EAcid_resistance |= WORN_CLOAK.  The smock's own
             * oc_oprop is POISON_RES, which setworn() has already conferred;
             * this is the SECOND, hand-set property. */
            _dw_set_extrinsic_mask(ACID_RES_PROP, W_ARMC, true);
            break;
        default:
            /* C: impossible(unknown_type, c_cloak, uarmc->otyp) — no state
             * change, no RNG. */
            break;
    }
    return don_slot('uarmc');
}
export function Shirt_on()  { return don_slot('uarmu'); }
/* objects.h otyps for the glove slot. */
const LEATHER_GLOVES_OTYP = 159, GAUNTLETS_OF_FUMBLING_OTYP = 160,
      GAUNTLETS_OF_POWER_OTYP = 161, GAUNTLETS_OF_DEXTERITY_OTYP = 162;
export function Gloves_on() {
    const g = game;
    const u = g.u || (g.u = {});
    const otmp = u.uarmg;
    if (!otmp)
        return don_slot('uarmg');
    const otyp = (typeof otmp.otyp === 'number') ? (otmp.otyp | 0) : -1;
    const oprop = (otyp >= 0) ? (MKOBJ_OC_OPROP[otyp] | 0) : 0;
    const rec = (oprop && u.uprops) ? u.uprops[oprop] : null;
    const oldprop = rec ? ((rec.extrinsic | 0) & ~W_ARMG) : 0;
    switch (otyp) {
        case LEATHER_GLOVES_OTYP:
            break;
        case GAUNTLETS_OF_FUMBLING_OTYP:
            /* C do_wear.c:583-585:
             *   if (!oldprop && !(HFumbling & ~TIMEOUT))
             *       incr_itimeout(&HFumbling, rnd(20)); */
            if (!oldprop && !((rec ? (rec.intrinsic | 0) : 0) & ~PROP_TIMEOUT)) {
                const _incr = rnd(20);
                if (rec) {
                    let v = ((rec.intrinsic | 0) & PROP_TIMEOUT) + _incr;
                    if (v > PROP_TIMEOUT) v = PROP_TIMEOUT;
                    rec.intrinsic = ((rec.intrinsic | 0) & ~PROP_TIMEOUT) | v;
                }
            }
            break;
        case GAUNTLETS_OF_POWER_OTYP:
            makeknown_otyp(otyp);
            if (g.disp) g.disp.botl = 1; /* C: disp.botl = TRUE */
            break;
        case GAUNTLETS_OF_DEXTERITY_OTYP:
            adj_abon(otmp, otmp.spe | 0);
            break;
        default:
            /* C: impossible(unknown_type, c_gloves, uarmg->otyp) */
            break;
    }
    return don_slot('uarmg');
}
/* Resolve the armor category for a worn-armor record (slot field set by
 * u_init; fall back to the objects table armcat). */
function armorCatOf(obj) {
    if (obj && obj.slot != null && SLOT_TO_ARMCAT[obj.slot] != null)
        return SLOT_TO_ARMCAT[obj.slot];
    return armorMeta(obj).armcat;
}
/* C ref: do_wear.c:1921 armoroff(otmp) — schedule the take-off occupation.
 *   int delay = -objects[otmp->otyp].oc_delay;
 *   if (cursed(otmp)) return 0;          (cursed check not yet modeled; starter
 *                                         armor is uncursed, so skipped)
 *   if (delay) { nomul(delay); gm.multi_reason = "disrobing";
 *                ga.afternmv = <*_off by armcat>; gn.nomovemsg = "You finish
 *                taking off your <what>."; }
 *   else       { (*<*_off>)(); }         (no delay → immediate, no nomul) */
export async function armoroff(otmp) {
    const g = game;
    const delay = -armorMeta(otmp).delay;
    const armcat = armorCatOf(otmp);
    let what = null;
    if (await cursed_dw(otmp)) return 0;
    if (delay) {
        nomul(delay);
        g.multi_reason = 'disrobing';
        switch (armcat) {
        case ARM_SUIT: what = suit_simple_name_obj(otmp); g.afternmv = 'Armor_off'; break;
        case ARM_SHIELD: what = shield_simple_name_obj(otmp); g.afternmv = 'Shield_off'; break;
        case ARM_HELM: what = helm_simple_name_obj(otmp); g.afternmv = 'Helmet_off'; break;
        case ARM_GLOVES: what = gloves_simple_name_obj(otmp); g.afternmv = 'Gloves_off'; break;
        case ARM_BOOTS: what = boots_simple_name_obj(otmp); g.afternmv = 'Boots_off'; break;
        case ARM_CLOAK: what = cloak_simple_name_obj(otmp); g.afternmv = 'Cloak_off'; break;
        case ARM_SHIRT: what = shirt_simple_name_obj(otmp); g.afternmv = 'Shirt_off'; break;
        default: impossible('Taking off unknown armor (%d: %d), delay %d', otmp.otyp, armcat, delay);
        }
        if (what) g.nomovemsg = `You finish taking off your ${what}.`.slice(0, 59);
    } else {
        switch (armcat) {
        case ARM_SUIT: await Armor_off(); break;
        case ARM_SHIELD: await Shield_off(); break;
        case ARM_HELM: await Helmet_off(); break;
        case ARM_GLOVES: await Gloves_off(); break;
        case ARM_BOOTS: await Boots_off(); break;
        case ARM_CLOAK: await Cloak_off(); break;
        case ARM_SHIRT: await Shirt_off(); break;
        default: impossible('Taking off unknown armor (%d: %d), no delay', otmp.otyp, armcat);
        }
        await off_msg(otmp);
    }
    g.context.takeoff.mask = g.context.takeoff.what = 0;
    return 1;
}
/* oc_armcat → the *_off callback C's switch selects (do_wear.c:1935-1972 for the
 * delay branch, :1975-2000 for the immediate branch — same set either way).
 * Same order as ARMCAT_TO_SLOT / ARMCAT_TO_AFTERNMV. */
const ARMCAT_OFF_FN = [
    Armor_off, Shield_off, Helmet_off,
    Gloves_off, Boots_off, Cloak_off, Shirt_off,
];
// C do_wear.c:1893 — whether this particular worn object can be removed.
const LENSES_OTYP_DW = 232;
async function cursed_dw(otmp) {
    const u = game.u;
    if (!otmp) {
        impossible('cursed without otmp');
        return false;
    }
    if (otmp === u.uwep ? welded(otmp) : otmp.cursed) {
        const use_plural = is_boots(otmp) || is_gloves(otmp)
            || otmp.otyp === LENSES_OTYP_DW || otmp.quan > 1;
        if (Glib_dw() && otmp.bknown
            && (u.uarmg ? otmp === u.uwep : (otmp.owornmask & (W_WEP | W_RINGL | W_RINGR)))) {
            await pline(`Despite your slippery ${fingers_or_gloves(true)}, you can't.`);
        } else {
            await You(`can't.  ${use_plural ? 'They are' : 'It is'} cursed.`);
        }
        set_bknown(otmp, 1);
        return true;
    }
    return false;
}

// C do_wear.c:2696 — all selection guards, then the actual equipment-slot bit.
async function select_off(otmp) {
    const u = game.u;
    if (!otmp) return 0;
    let why = null, buf = '';
    if (otmp === u.uright || otmp === u.uleft) {
        if (nolimbs({mflags1: _hero_mflags1_dw()})) {
            await pline('The ring is stuck.');
            return 0;
        }
        const glibdummy = {};
        const primary = u.uhandedness === LEFT_HANDED ? u.uleft : u.uright;
        if (welded(u.uwep) && (otmp === primary || bimanual(u.uwep))) {
            buf = `free a weapon ${body_part(HAND)}`;
            why = u.uwep;
        } else if (u.uarmg && (u.uarmg.cursed || Glib_dw())) {
            buf = `take off your ${Glib_dw() ? 'slippery ' : ''}${gloves_simple_name_obj(u.uarmg)}`;
            why = !Glib_dw() ? u.uarmg : glibdummy;
        }
        if (why) {
            await You(`cannot ${buf} to remove the ring.`);
            set_bknown(why, 1);
            return 0;
        }
    }
    if (otmp === u.uarmg) {
        if (welded(u.uwep)) {
            await You(`are unable to take off your ${c_gloves} while wielding that ${is_sword(u.uwep) ? c_sword : c_weapon}.`);
            set_bknown(u.uwep, 1);
            return 0;
        } else if (Glib_dw()) {
            await pline(`${u.uarmg.unpaid ? 'The' : 'Your'} ${gloves_simple_name_obj(u.uarmg)} are too slippery to take off.`);
            return 0;
        }
        if (await better_not_take_that_off(otmp)) return 0;
    }
    if (otmp === u.uarmf) {
        if (u.utrap && u.utraptype === TT_BEARTRAP) {
            await pline(`The bear trap prevents you from pulling your ${body_part(FOOT)} out.`);
            return 0;
        } else if (u.utrap && u.utraptype === TT_INFLOOR_DW) {
            await You(`are stuck in the ${surface(u.ux, u.uy)}, and cannot pull your ${makeplural(body_part(FOOT))} out.`);
            return 0;
        }
    }
    if (otmp === u.uarm || otmp === u.uarmu) {
        why = null;
        if (u.uarmc && u.uarmc.cursed) {
            buf = `remove your ${cloak_simple_name_obj(u.uarmc)}`;
            why = u.uarmc;
        } else if (otmp === u.uarmu && u.uarm && u.uarm.cursed) {
            buf = `remove your ${c_suit}`;
            why = u.uarm;
        } else if (welded(u.uwep) && bimanual(u.uwep)) {
            buf = `release your ${is_sword(u.uwep) ? c_sword : u.uwep.otyp === BATTLE_AXE_DW ? c_axe : c_weapon}`;
            why = u.uwep;
        }
        if (why) {
            await You(`cannot ${buf} to take off ${the(xname(otmp))}.`);
            set_bknown(why, 1);
            return 0;
        }
    }
    if (otmp !== u.uquiver && !(otmp === u.uswapwep && !u.twoweap))
        if (await cursed_dw(otmp)) return 0;

    const doff = game.context.takeoff;
    if (otmp === u.uarm) doff.mask |= W_ARM;
    else if (otmp === u.uarmc) doff.mask |= W_ARMC;
    else if (otmp === u.uarmf) doff.mask |= W_ARMF;
    else if (otmp === u.uarmg) doff.mask |= W_ARMG;
    else if (otmp === u.uarmh) doff.mask |= W_ARMH;
    else if (otmp === u.uarms) doff.mask |= W_ARMS;
    else if (otmp === u.uarmu) doff.mask |= W_ARMU;
    else if (otmp === u.uleft) doff.mask |= W_RINGL;
    else if (otmp === u.uright) doff.mask |= W_RINGR;
    else if (otmp === u.uamul) doff.mask |= W_AMUL_C;
    else if (otmp === u.ublindf) doff.mask |= W_TOOL;
    else if (otmp === u.uwep) doff.mask |= W_WEP;
    else if (otmp === u.uswapwep) doff.mask |= W_SWAPWEP;
    else if (otmp === u.uquiver) doff.mask |= W_QUIVER;
    else impossible('select_off: %s???', (await doname(otmp)));
    return 0;
}

// C do_wear.c:1771 — common removal body, including selection bookkeeping.
async function armor_or_accessory_off(obj) {
    const u = game.u;
    if (!(obj.owornmask & (W_ARMOR_C | W_ACCESSORY_MASK))) {
        await You('are not wearing that.');
        return ECMD_OK;
    }
    if (obj === u.uskin || (obj === u.uarm && u.uarmc)
        || (obj === u.uarmu && (u.uarmc || u.uarm))) {
        let why = '', what = '';
        if (obj !== u.uskin) {
            if (u.uarmc) what += cloak_simple_name_obj(u.uarmc);
            if (obj === u.uarmu && u.uarm) {
                if (u.uarmc) what += ' and ';
                what += suit_simple_name_obj(u.uarm);
            }
            why = ` without taking off your ${what} first`;
        } else {
            why = "; it's embedded";
        }
        await You(`can't take that off${why}.`);
        return ECMD_OK;
    }
    reset_remarm();
    await select_off(obj);
    if (!game.context.takeoff.mask) return ECMD_OK;
    reset_remarm();

    if (obj.owornmask & W_ARMOR_C) {
        await armoroff(obj);
    } else if (obj === u.uright || obj === u.uleft) {
        await off_msg(obj);
        await Ring_off(obj);
    } else if (obj === u.uamul) {
        await Amulet_off();
    } else if (obj === u.ublindf) {
        await Blindf_off(obj);
    } else {
        impossible('removing strange accessory: %s', obj_typename(obj.otyp));
        if (obj.owornmask) await remove_worn_item(obj, false);
    }
    return ECMD_TIME;
}

/* C do_wear.c:2990-3011 better_not_take_that_off().  This is called only for
 * voluntary glove removal by select_off(), before the normal cursed-item
 * refusal.  `st_corpse | st_petrifies` intentionally omits `st_resists`:
 * keeping gloves on is still prudent when temporary stone resistance is what
 * currently makes handling the carried corpse safe. */
async function better_not_take_that_off(gloves) {
    const corpse = carrying_stoning_corpse();
    if (!corpse || u_safe_from_fatal_corpse(corpse, 0x02 | 0x04))
        return false;
    const question = `Take off your ${gloves_simple_name_obj(gloves)} despite carrying a dead ${obj_pmname(corpse)}?`;
    /* C calls paranoid_ynq(TRUE,...): even without ParanoidConfirm this is
     * the whole-word getlin reader, not ordinary y/n. */
    return !(await paranoid_query(true, question));
}
/* C ref: you.h W_ARMOR — union of the seven body-armor worn masks. */
const W_ARM_C = 0x001, W_ARMC_C = 0x002, W_ARMH_C = 0x004, W_ARMS_C = 0x008,
      W_ARMG_C = 0x010, W_ARMF_C = 0x020, W_ARMU_C = 0x040;
const W_ARMOR_C = W_ARM_C | W_ARMC_C | W_ARMH_C | W_ARMS_C | W_ARMG_C | W_ARMF_C | W_ARMU_C;
/* C ref: do_wear.c count_worn_stuff() — collect the worn ARMOR pieces from the
 * real gi.invent chain (each carries an armor worn-mask bit).  Returns the list
 * of worn-armor invent records, in invent order.  RNG-free. */
export function wornArmorPieces() {
    const g = game;
    const out = [];
    for (let o = g.invent; o; o = o.nobj) {
        if ((o.oclass | 0) === ARMOR_CLASS && ((o.owornmask | 0) & W_ARMOR_C))
            out.push(o);
    }
    return out;
}
/* C ref: do_wear.c count_worn_stuff() — collect the worn ACCESSORY pieces
 * (rings/amulet/blindfold-tool) from the real gi.invent chain, in invent order.
 * These are exactly the items getobj("remove", remove_ok) suggests for the 'R'
 * command: equip_ok(obj, removing=TRUE, accessory=TRUE) returns GETOBJ_SUGGEST
 * only for worn non-armor equippables (worn armor is GETOBJ_DOWNPLAY, selectable
 * via ?* but not listed in the suggested-letter set).  RNG-free. */
const W_ACCESSORY_MASK = 0x000F0000; /* W_AMUL|W_RINGL|W_RINGR|W_TOOL */
const W_AMUL_C = 0x00010000;         /* C obj.h W_AMUL */
export function wornAccessoryPieces() {
    const g = game;
    const out = [];
    for (let o = g.invent; o; o = o.nobj) {
        if ((o.owornmask | 0) & W_ACCESSORY_MASK)
            out.push(o);
    }
    return out;
}
/* C ref: do_wear.c:1874 doremring() → armor_or_accessory_off(otmp) for a
 * caller-resolved accessory.  Used by the FF_FAITHFUL 'R' path in cmd.js after
 * getobj reads the object letter.  `otmp` is a live gi.invent record (the worn
 * accessory selected by its invlet). */
export async function doremove_obj(otmp) {
    const g = game;
    g.context = g.context || {};
    if (!otmp) {
        /* getobj returned NULL → ECMD_CANCEL, no turn (do_wear.c:1886). */
        return ECMD_CANCEL;
    }
    const res = await armor_or_accessory_off(otmp);
    return res;
}
/* C ref: do_wear.c:1834 dotakeoff() → armor_or_accessory_off(otmp) for a
 * caller-resolved object.  Used by the FF_FAITHFUL 'T' path in cmd.js after
 * getobj reads the object letter.  `otmp` is a live gi.invent record (the worn
 * piece selected by its invlet); take it off (schedules the disrobe nomul) and
 * clear its worn state so count_worn_stuff no longer sees it. */
export async function dotakeoff_obj(otmp) {
    const g = game;
    g.context = g.context || {};
    if (!otmp) {
        /* getobj returned NULL → ECMD_CANCEL, no turn (do_wear.c:1852). */
        return ECMD_CANCEL;
    }
    const res = await armor_or_accessory_off(otmp);
    return res;
}
/* C ref: do_wear.c:1727 count_worn_stuff(which, accessorizing) — assigns the
 * static Narmorpieces/Naccessories counts and, via the `which` out-param,
 * the SOLE candidate to auto-select when its count is exactly 1.
 *
 * Narmorpieces collapses uarmc/uarm/uarmu to their OUTERMOST layer (a cloak
 * over a suit counts as ONE piece, and it is the CLOAK that auto-selects,
 * never the suit beneath it) — `wornArmorPieces()` elsewhere in this file
 * does NOT do this collapse (it lists every worn armor slot separately,
 * which is what cmd.js's 'T' getobj MENU wants), so this is a distinct,
 * C-exact count kept local to dotakeoff/doremring. RNG-free; matches
 * do_wear.c:1727-1763 exactly. */
function _count_worn_stuff_dw(accessorizing) {
    const u = game.u || {};
    let Narmorpieces = 0, Naccessories = 0;
    let armorWhich = null, accWhich = null;
    if (u.uarmh) { Narmorpieces++; armorWhich = u.uarmh; }
    if (u.uarms) { Narmorpieces++; armorWhich = u.uarms; }
    if (u.uarmg) { Narmorpieces++; armorWhich = u.uarmg; }
    if (u.uarmf) { Narmorpieces++; armorWhich = u.uarmf; }
    if (u.uarmc) { Narmorpieces++; armorWhich = u.uarmc; }
    else if (u.uarm) { Narmorpieces++; armorWhich = u.uarm; }
    else if (u.uarmu) { Narmorpieces++; armorWhich = u.uarmu; }
    if (u.uleft) { Naccessories++; accWhich = u.uleft; }
    if (u.uright) { Naccessories++; accWhich = u.uright; }
    if (u.uamul) { Naccessories++; accWhich = u.uamul; }
    if (u.ublindf) { Naccessories++; accWhich = u.ublindf; }
    return {
        Narmorpieces, Naccessories,
        which: accessorizing ? accWhich : armorWhich,
    };
}
/* C ref: do_wear.c:1752-1790 equip_ok(obj, removing, accessory) — the shared
 * getobj-callback classifier behind all FOUR of this file's own getobj calls
 * (wear_ok/puton_ok/takeoff_ok/remove_ok below).  Returns one of the local
 * GETOBJ_*_CMD verdicts below; the values are chosen to match js/cmd.js's OWN
 * private copy of this same C function (js/cmd.js:13906-13929, its own
 * `equip_ok`/GETOBJ_* consts) NUMBER FOR NUMBER, because the shared
 * getObjFromGetobj (js/cmd.js:14407, imported below) is blind to which module
 * defined the callback — it only ever compares the returned NUMBER against
 * ITS OWN local consts, which are NOT C's real hack.h enum values (see the
 * file-top comment on GETOBJ_EXCLUDE_DW/GETOBJ_SUGGEST_DW above — those two
 * spell the true C values for a DIFFERENT consumer, js/read.js's own getobj;
 * the `_CMD` suffix here marks this as the third, cmd.js-shaped, numbering).
 * do_wear.c is this callback's true home (cmd.c has no equip_ok of its own);
 * cmd.js's private copy predates this file's own getobj integration and is
 * left as-is (out of this file's ownership).
 *
 * do_wear.c:1728 removing^is_worn / do_wear.c:1734 class filter /
 * do_wear.c:1744 accessory^(oclass!=ARMOR) / do_wear.c:1748 canwearobj /
 * do_wear.c:1758 inaccessible_equipment. */
const GETOBJ_EXCLUDE_CMD = 0, GETOBJ_DOWNPLAY_CMD = 1, GETOBJ_SUGGEST_CMD = 2;
const GETOBJ_EXCLUDE_INACCESS_CMD = -1;
/* C hack.h GETOBJ_NOFLAGS — all four of dowear/doputon/dotakeoff/doremring
 * pass this (no ALLOWCNT, no forced PROMPT). js/const.js's own GETOBJ_NOFLAGS
 * is the same value (0); spelled locally so this cluster has no import-order
 * dependency on that file. */
const GETOBJ_NOFLAGS_CMD = 0;
async function equip_ok(obj, removing, accessory) {
    if (!obj) return GETOBJ_EXCLUDE_CMD;                     /* do_wear.c:1756 */
    const oclass = obj.oclass | 0;
    /* do_wear.c:1728 — ignore for putting on if already worn, removing if not. */
    const is_worn = ((obj.owornmask | 0) & (W_ARMOR_C | W_ACCESSORY_MASK)) !== 0;
    if (removing !== is_worn) return GETOBJ_EXCLUDE_INACCESS_CMD;
    /* do_wear.c:1734-1739 — exclude most classes outright, except the few
     * non-class wearables (meat ring, blindfold, towel, lenses). */
    if (oclass !== ARMOR_CLASS && oclass !== RING_CLASS && oclass !== AMULET_CLASS) {
        const otyp = obj.otyp | 0;
        if (otyp !== MEAT_RING && otyp !== BLINDFOLD_OTYP_DW
            && otyp !== TOWEL_OTYP_DW && otyp !== LENSES_OTYP_DW)
            return GETOBJ_EXCLUDE_CMD;
    }
    /* do_wear.c:1744 — armor with 'P'/'R' or accessory with 'W'/'T'. */
    if (accessory !== (oclass !== ARMOR_CLASS)) return GETOBJ_DOWNPLAY_CMD;
    /* do_wear.c:1748-1750 — armor we can't wear (e.g. from polyform).
     * noisy=FALSE: canwearobj emits no message and draws no RNG here. */
    if (oclass === ARMOR_CLASS && !removing) {
        const dummymask = { mask: 0 };
        if (!(await canwearobj(obj, dummymask, false)))
            return GETOBJ_DOWNPLAY_CMD;
    }
    // C do_wear.c:3435 — item actions select covered equipment so the common
    // removal body can explain the obstruction instead of excluding the item.
    if (removing && !game.gi.item_action_in_progress) {
        if (await inaccessible_equipment(obj, null, oclass === RING_CLASS))
            return GETOBJ_EXCLUDE_INACCESS_CMD;
    }
    return GETOBJ_SUGGEST_CMD;                                /* do_wear.c:1763 */
}
/* C ref: do_wear.c:3446 wear_ok — getobj callback for 'W'. */
async function wear_ok(obj) { return equip_ok(obj, false, false); }
/* C ref: do_wear.c:3453 puton_ok — getobj callback for 'P'. */
async function puton_ok(obj) { return equip_ok(obj, false, true); }
/* C ref: do_wear.c:3460 takeoff_ok — getobj callback for 'T'. */
async function takeoff_ok(obj) { return equip_ok(obj, true, false); }
/* C ref: do_wear.c:3459 remove_ok — getobj callback for 'R'. */
async function remove_ok(obj) { return equip_ok(obj, true, true); }
// C do_wear.c:1834 — the shared #takeoff entry.
export async function dotakeoff() {
    const u = game.u;
    const {Narmorpieces, Naccessories, which} = _count_worn_stuff_dw(false);
    let otmp = which;
    if (!Narmorpieces && !Naccessories) {
        if (u.uskin)
            await pline(`The ${u.uskin.otyp >= 111 ? 'dragon scales are' : 'dragon scale mail is'} merged with your skin!`);
        else
            await pline('Not wearing any armor or accessories.');
        return ECMD_OK;
    }
    if (Narmorpieces !== 1 || ((game.flags.paranoia_bits | 0) & 0x0040)
        || game.gi.item_action_in_progress)
        otmp = await getObjFromGetobj('take off', takeoff_ok, GETOBJ_NOFLAGS_CMD);
    if (!otmp) return ECMD_CANCEL;
    return armor_or_accessory_off(otmp);
}

// C do_wear.c:1862 — item actions must select even under covering armor.
export async function ia_dotakeoff() {
    game.gi.item_action_in_progress = true;
    const res = await dotakeoff();
    game.gi.item_action_in_progress = false;
    return res;
}

// C do_wear.c:2824 — shared removal worker, not a swap-slot-only substitute.
export async function do_takeoff() {
    const u = game.u, doff = game.context.takeoff;
    const was_twoweap = u.twoweap;
    let otmp = null;
    doff.mask |= I_SPECIAL;
    if (doff.what === W_WEP) {
        if (!(await cursed_dw(u.uwep))) {
            await setuwep(null);
            await You(was_twoweap ? 'are no longer wielding either weapon.'
                                 : `are ${empty_handed()}.`);
        }
    } else if (doff.what === W_SWAPWEP) {
        await setuswapwep(null);
        await You(`${was_twoweap ? 'are ' : ''}no longer ${was_twoweap ? 'wielding two weapons at once' : 'have a second weapon readied'}.`);
    } else if (doff.what === W_QUIVER) {
        await setuqwep(null);
        await You('no longer have ammunition readied.');
    } else if (doff.what === W_ARM) {
        otmp = u.uarm;
        if (!(await cursed_dw(otmp))) await Armor_off();
    } else if (doff.what === W_ARMC) {
        otmp = u.uarmc;
        if (!(await cursed_dw(otmp))) await Cloak_off();
    } else if (doff.what === W_ARMF) {
        otmp = u.uarmf;
        if (!(await cursed_dw(otmp))) await Boots_off();
    } else if (doff.what === W_ARMG) {
        otmp = u.uarmg;
        if (!(await cursed_dw(otmp))) await Gloves_off();
    } else if (doff.what === W_ARMH) {
        otmp = u.uarmh;
        if (!(await cursed_dw(otmp))) await Helmet_off();
    } else if (doff.what === W_ARMS) {
        otmp = u.uarms;
        if (!(await cursed_dw(otmp))) await Shield_off();
    } else if (doff.what === W_ARMU) {
        otmp = u.uarmu;
        if (!(await cursed_dw(otmp))) await Shirt_off();
    } else if (doff.what === W_AMUL_C) {
        otmp = u.uamul;
        if (!(await cursed_dw(otmp))) await Amulet_off();
    } else if (doff.what === W_RINGL) {
        otmp = u.uleft;
        if (!(await cursed_dw(otmp))) await Ring_off(u.uleft);
    } else if (doff.what === W_RINGR) {
        otmp = u.uright;
        if (!(await cursed_dw(otmp))) await Ring_off(u.uright);
    } else if (doff.what === W_TOOL) {
        if (!(await cursed_dw(u.ublindf))) await Blindf_off(u.ublindf);
    } else {
        impossible('do_takeoff: taking off %lx', doff.what);
    }
    doff.mask &= ~I_SPECIAL;
    return otmp;
}

// C do_wear.c:3062 — consume precisely the queued '-' and preserve ECMD ownership.
export async function remarm_swapwep() {
    const cq = cmdq_pop() || {typ: CMDQ_KEY, key: 0};
    if (cq.typ !== CMDQ_KEY || cq.key !== 45 || !game.u.uswapwep)
        return ECMD_FAIL;
    const oldbknown = game.u.uswapwep.bknown;
    reset_remarm();
    game.context.takeoff.what = game.context.takeoff.mask = W_SWAPWEP;
    await do_takeoff();
    return !game.u.uswapwep || game.u.uswapwep.bknown !== oldbknown ? ECMD_TIME : ECMD_OK;
}
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
/* C ref: objects.h — MEAT_RING otyp (worn like a ring). At post_init it is never
 * worn; defensive only. */
const MEAT_RING = 270;
/* C ref: do_wear.c:887 — donning side of accessory_or_armor_on for the ARMOR
 * branch (do_wear.c:2359-2407).  Setworn the piece, pick the *_on afternmv by
 * slot, then schedule the donning delay nomul(-oc_delay) — or, if delay==0,
 * fire the *_on callback immediately via unmul("") (do_wear.c:2402).
 *
 *   gw.wasinwater = u.uinwater;       (WWALKING; not modeled — no-op)
 *   setworn(obj, mask);               (slot now occupied)
 *   ga.afternmv = <*_on by slot>;
 *   delay = -objects[obj->otyp].oc_delay;
 *   if (delay) { nomul(delay); gm.multi_reason = "dressing up";
 *                gn.nomovemsg = "You finish your dressing maneuver."; }
 *   else       { unmul(""); on_msg(obj); }
 *
 * RNG-free (Armor_on et al. have 0 RNG call-sites — cref-extract). */
const WORN_SLOTS_TP = ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf',
                       'uarmu', 'uleft', 'uright', 'uwep', 'uswapwep',
                       'uquiver', 'uamul', 'ublindf', 'uball', 'uchain'];
const TELEPAT_PROP = 30;        /* C prop.h:50 TELEPAT */
const W_ART_TP = 0x00001000;    /* C prop.h:114 W_ART — carried artifact */
const BOLT_LIM_TP = 8;          /* C hack.h:49 BOLT_LIM */
export function recalc_telepat_range() {
    const u = game.u;
    if (!u)
        return;
    let nobjs = 0;
    for (const slot of WORN_SLOTS_TP) {
        const oobj = u[slot];
        if (oobj && (MKOBJ_OC_OPROP[oobj.otyp | 0] | 0) === TELEPAT_PROP)
            nobjs++;
    }
    /* C worn.c:62-63 — count all artifacts with SPFX_ESP as one. */
    if (((u.uprops && u.uprops[TELEPAT_PROP] && u.uprops[TELEPAT_PROP].extrinsic) | 0) & W_ART_TP)
        nobjs++;
    u.unblind_telepat_range = nobjs ? (BOLT_LIM_TP * BOLT_LIM_TP) * nobjs : -1;
}
export async function armoron(otmp) {
    const g = game;
    g.u = g.u || {};
    const armcat = armorCatOf(otmp);
    const slot = ARMCAT_TO_SLOT[armcat];
    /* setworn(obj, mask): the object now occupies its armor slot.  src/u_init.ts
     * tags worn-armor records with .slot; tag the incoming object so find_ac and
     * the *_off path see a consistent record. */
    if (otmp && slot) {
        otmp.slot = slot; // JS armor metadata; C stores its category in objects[].
        await setworn(otmp, SLOT_TO_WMASK[slot]);
    }
    g.afternmv = ARMCAT_TO_AFTERNMV_ON[armcat]; /* do_wear.c:2379.. */
    const meta = armorMeta(otmp);
    const delay = -(meta.delay | 0);
    if (delay) {
        nomul(delay);                       /* hack.c:4068 — sets g.multi=delay */
        g.multi_reason = 'dressing up';     /* do_wear.c:2399 */
        g.nomovemsg = 'You finish your dressing maneuver.'; /* do_wear.c:2400 */
    } else {
        /* do_wear.c:2402-2403 — no delay: run *_on now (unmul fires afternmv),
         * then on_msg(obj).  The on_msg call was missing, so a zero-delay don
         * (every cloak: oc_delay 0) never printed "You are now wearing ...". */
        await unmul('');
        await on_msg(otmp);
    }
    /* do_wear.c:2405 — clear takeoff bookkeeping; RNG-free no-op in JS. */
    return ECMD_TIME;
}
/* C ref: do_wear.c:2012 already_wearing(cc) —
 *   You("are already wearing %s%c", cc, (cc == c_that_) ? '!' : '.');
 * The C You() macro prefixes "You "; the trailing char is '!' only for the
 * c_that_ ("that") case, '.' for the named-slot cases (an(helm…) etc.). */
async function already_wearing(cc) {
    await pline(`You are already wearing ${cc}${cc === c_that_ ? '!' : '.'}`);
}

/* C ref: do_wear.c:2016-2020 already_wearing2(cc1, cc2) —
 *   You_cant("wear %s because you're wearing %s there already.", cc1, cc2);
 * Used only by accessory_or_armor_on's eyewear branch (do_wear.c:2333/2339) to
 * report a slot conflict between two DIFFERENT eyewear otyps. */
async function already_wearing2(cc1, cc2) {
    await pline(`You can't wear ${cc1} because you're wearing ${cc2} there already.`);
}


/* C ref: obj.h:280-298 is_helmet/is_shield/is_boots/is_gloves/is_cloak/
 * is_shirt/is_suit — oclass == ARMOR_CLASS && objects[otyp].oc_armcat == ARM_x.
 * armorMeta() resolves oc_armcat out of the generated C objects table
 * (js/armor_data.js), the same lookup armoron()/armoroff() use.  Note its
 * documented fallback: an otyp with no ARMOR_DATA row reads as ARM_SUIT, so an
 * unidentifiable ARMOR_CLASS record routes to the is_suit arm rather than to
 * C's silly_thing() else-arm.  Every real armor otyp has a row. */
function _armcat_is_dw(otmp, cat) {
    return !!otmp && (otmp.oclass | 0) === ARMOR_CLASS
        && armorMeta(otmp).armcat === cat;
}
export function is_helmet(otmp) { return _armcat_is_dw(otmp, ARM_HELM); }
export function is_shield(otmp) { return _armcat_is_dw(otmp, ARM_SHIELD); }
export function is_boots(otmp) { return _armcat_is_dw(otmp, ARM_BOOTS); }
export function is_gloves(otmp) { return _armcat_is_dw(otmp, ARM_GLOVES); }
export function is_shirt(otmp) { return _armcat_is_dw(otmp, ARM_SHIRT); }
export function is_cloak(otmp) { return _armcat_is_dw(otmp, ARM_CLOAK); }
export function is_suit(otmp) { return _armcat_is_dw(otmp, ARM_SUIT); }

/* objclass.h oclass ordinals not already declared below (ARMOR_CLASS et al.). */
const WEAPON_CLASS_DW = 2;
const TOOL_CLASS_DW = 6;
/* monflag.h:177-183 MZ_* */
const MZ_SMALL_DW = 1, MZ_MEDIUM_DW = 2, MZ_HUGE_DW = 4;
/* monflag.h:98 M1_NOHANDS */
const M1_NOHANDS_DW = 0x00002000;
/* defsym.h:328,358 MONSYM ordinals */
const S_CENTAUR_DW = 29, S_GHOST_DW = 54;
const MUMMY_WRAPPING_DW = 138;
const RUBBER_HOSE_DW = 78;
const BATTLE_AXE_DW = 45;
/* obj.h:299-303 is_elven_armor(otmp) — elven leather helm / mithril-coat /
 * cloak / shield / boots. */
const ELVEN_ARMOR_OTYPS_DW = new Set([89, 127, 139, 153, 169]);
/* obj.h:223-226 is_sword(otmp) — WEAPON_CLASS && oc_skill in
 * [P_SHORT_SWORD(5) .. P_SABER(9)]: the contiguous otyp run 46..58
 * (short sword, elven/orcish/dwarvish short sword, scimitar, silver saber,
 * broadsword, elven broadsword, long sword, two-handed sword, katana,
 * tsurugi, runesword). */
const SWORD_OTYP_LO_DW = 46, SWORD_OTYP_HI_DW = 58;
const BIMANUAL_OTYPS_DW = new Set([45, 55, 57, 59, 60, 61, 62, 63, 64, 65, 66,
                                   67, 68, 69, 70, 71, 79, 261]);
function is_sword(otmp) {
    return !!otmp && (otmp.oclass | 0) === WEAPON_CLASS_DW
        && (otmp.otyp | 0) >= SWORD_OTYP_LO_DW && (otmp.otyp | 0) <= SWORD_OTYP_HI_DW;
}
function is_elven_armor(otmp) {
    return !!otmp && ELVEN_ARMOR_OTYPS_DW.has(otmp.otyp | 0);
}

/* C ref: hack.h plur(x) — ((x) == 1) ? "" : "s". */
function plur_dw(x) { return (x | 0) === 1 ? '' : 's'; }

function _hero_data_dw() {
    const d = game.youmonst && game.youmonst.data;
    const i = (d && d.pmidx != null) ? (d.pmidx | 0)
            : ((game.u && game.u.umonnum != null) ? (game.u.umonnum | 0) : -1);
    const row = (i >= 0 && i < MONS_DW.length) ? MONS_DW[i] : null;
    return {
        pmidx: i,
        mlet: (d && d.mlet != null) ? (d.mlet | 0) : (row ? row[0] | 0 : -1),
        mflags1: (d && d.mflags1 != null) ? (d.mflags1 >>> 0)
               : (row ? row[6] >>> 0 : 0),
        msize: (d && d.msize != null) ? (d.msize | 0)
             : ((i >= 0 && i < MONS_MSIZE_DW.length) ? MONS_MSIZE_DW[i] | 0
                                                     : MZ_MEDIUM_DW),
    };
}
/* C mondata.h:11 verysmall(ptr) / :52 nohands(ptr) / :65 humanoid(ptr) /
 * :31 noncorporeal(ptr) / :12 bigmonst(ptr). */
function verysmall_dw(ptr) { return (ptr.msize | 0) < MZ_SMALL_DW; }
function nohands_dw(ptr) { return ((ptr.mflags1 >>> 0) & M1_NOHANDS_DW) !== 0; }

function humanoid_dw(ptr) { return ((ptr.mflags1 >>> 0) & M1_HUMANOID_DW) !== 0; }
function noncorporeal_dw(ptr) { return (ptr.mlet | 0) === S_GHOST_DW; }
/* C mondata.h:133 cantweararm(ptr) = breakarm(ptr) || sliparm(ptr) — both
 * imported (js/mhitm.js:2779, js/makemon.js:462). */
function cantweararm_dw(ptr) { return !!breakarm(ptr) || !!sliparm(ptr); }
/* C obj.h:444-447 WrappingAllowed(mptr) — mummy wrappings fit more sizes than
 * other cloaks. */
function WrappingAllowed_dw(ptr) {
    return humanoid_dw(ptr) && (ptr.msize | 0) >= MZ_SMALL_DW
        && (ptr.msize | 0) <= MZ_HUGE_DW && !noncorporeal_dw(ptr)
        && (ptr.mlet | 0) !== S_CENTAUR_DW
        && (ptr.pmidx | 0) !== PM_WINGED_GARGOYLE
        && (ptr.pmidx | 0) !== PM_MARILITH;
}
/* C ref: worn.c:1352 racial_exception(mon, obj) — 1 for a hobbit in elven
 * armor, 0 otherwise (the "unacceptable exceptions" arm is commented out in C).
 * raceptr(&youmonst) is &mons[gu.urace.mnum] while !Upolyd and youmonst.data
 * once polymorphed (mondata.h raceptr); no PLAYER race is PM_HOBBIT, so the
 * exception can only fire for a hero poly'd into a hobbit. */
function racial_exception_dw(otmp) {
    const ptr = _hero_data_dw();
    if ((ptr.pmidx | 0) === PM_HOBBIT && is_elven_armor(otmp))
        return 1;
    return 0;
}
/* C ref: wield.c:1044 welded(obj) —
 *   if (obj && obj == uwep && will_weld(obj)) { set_bknown(obj, 1); return 1; }
 *   return 0;
 * Every welded() call in do_wear.c passes uwep, so `obj == uwep` is trivially
 * satisfied and the whole macro reduces to `uwep && will_weld(uwep)`.  The
 * imported js/cmd.js `welded` is exactly will_weld (wield.c:68) — it omits both
 * the NULL guard (it dereferences obj) and the identity test — so C's guard is
 * applied here, in the one form this file needs.  (C's set_bknown(obj, 1) on a
 * TRUE result is likewise absent from the shared helper; it only fires for a
 * cursed WIELDED weapon, and fixing js/cmd.js is out of scope for this task.) */
function _uwep_welded_dw() {
    const uwep = (game.u || {}).uwep;
    return !!uwep && !!welded(uwep);
}
/* C ref: obj.h:257 bimanual(otmp).  REPLACES the throw stub that used to sit
 * next to stuck_ring(). */
export function bimanual(otmp) {
    if (!otmp) return false;
    const oclass = otmp.oclass | 0;
    return (oclass === WEAPON_CLASS_DW || oclass === TOOL_CLASS_DW)
        && BIMANUAL_OTYPS_DW.has(otmp.otyp | 0);
}
/* C ref: obj.h:418-420 is_flimsy(otmp) — oc_material <= LEATHER(7) ||
 * otyp == RUBBER_HOSE. */
const LEATHER_MAT_DW = 7;
function is_flimsy(otmp) {
    if (!otmp) return false;
    return ((MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) <= LEATHER_MAT_DW)
        || (otmp.otyp | 0) === RUBBER_HOSE_DW;
}
/* C ref: youprop.h:112 Glib — u.uprops[GLIB].intrinsic. */
function Glib_dw() {
    const u = game.u || {};
    return ((u.uprops && u.uprops[GLIB_PROP] && u.uprops[GLIB_PROP].intrinsic) | 0) !== 0;
}

/* C do_wear.c:2528-2625 glibr: slippery fingers release rings and weapons
 * before the once-per-turn timeout countdown (allmain.c:271-273). */
export async function glibr() {
    const u = game.u;
    const righty = u.uhandedness === RIGHT_HANDED;
    const lefty = u.uhandedness === LEFT_HANDED;
    const leftfall = u.uleft && !u.uleft.cursed
        && (!u.uwep || !(welded(u.uwep) && lefty) || !bimanual(u.uwep));
    const rightfall = u.uright && !u.uright.cursed
        && (!u.uwep || !(welded(u.uwep) && righty) || !bimanual(u.uwep));
    let xfl = 0, wastwoweap = false, otherwep = null;
    if (!u.uarmg && (leftfall || rightfall)
        && !nolimbs({ mflags1: _hero_mflags1_dw() })) {
        await pline(`Your ${leftfall && rightfall ? 'rings slip' : 'ring slips'} off your ${
            leftfall && rightfall ? fingers_or_gloves(false) : body_part(FINGER)}.`);
        xfl++;
        if (leftfall) {
            const obj = u.uleft;
            await Ring_off(obj);
            await dropx(obj);
            cmdq_clear(CQ_CANNED);
        }
        if (rightfall) {
            const obj = u.uright;
            await Ring_off(obj);
            await dropx(obj);
            cmdq_clear(CQ_CANNED);
        }
    }
    let obj = u.uswapwep;
    if (u.twoweap && obj) {
        otherwep = is_sword(obj) ? c_sword : weapon_descr(obj);
        if (obj.quan > 1) otherwep = makeplural(otherwep);
        await pline(`Your ${otherwep} ${xfl ? 'also ' : ''}${otense(obj, 'slip')} from your ${
            righty ? 'left ' : 'right '}${body_part(HAND)}.`);
        xfl++;
        wastwoweap = true;
        await setuswapwep(null);
        cmdq_clear(CQ_CANNED);
        if (canletgo(obj, '')) await dropx(obj);
    }
    obj = u.uwep;
    if (obj && obj.otyp !== 80 /* AKLYS */ && !welded(obj)) {
        const savequan = obj.quan;
        let thiswep = is_sword(obj) ? c_sword : weapon_descr(obj);
        if (otherwep && thiswep !== makesingular(otherwep)) otherwep = null;
        if (obj.quan > 1) {
            if (thiswep === 'food') obj.quan = 1;
            else thiswep = makeplural(thiswep);
        }
        let hand = body_part(HAND), which = '';
        if (bimanual(obj)) hand = makeplural(hand);
        else if (wastwoweap) which = righty ? 'right ' : 'left ';
        await pline(`${thiswep.startsWith('corpse') ? 'The' : 'Your'} ${otherwep ? 'other ' : ''}${
            thiswep} ${xfl ? 'also ' : ''}${otense(obj, 'slip')} from your ${which}${hand}.`);
        obj.quan = savequan;
        await setuwep(null);
        cmdq_clear(CQ_CANNED);
        if (canletgo(obj, '')) await dropx(obj);
    }
}
/* C ref: hack.h body_part(FOOT/LEG) — polyself.c:2129 mbodypart(&youmonst, x).
 * js/cmd.js:18731 exports the real one; the part ordinals come from
 * hack.h's body-part enum. */
const BP_FOOT_DW = 5, BP_LEG_DW = 9;
/* C ref: hack.h surface(x, y) — use the canonical terrain description. */
function surface_dw(x, y) { return surface(x, y); }
const AMULET_OF_YENDOR_DW = 213;      /* C objects.h:874 (js/mcastu.js:739 same value) */
const FAKE_AMULET_OF_YENDOR_DW = 212; /* C objects.h:869 (js/eat.js:43 same value) */
export async function silly_thing_dw(word, otmp) {
    if (word === 'call'
        && ((otmp && (otmp.otyp | 0) === AMULET_OF_YENDOR_DW)
            || (otmp && (otmp.otyp | 0) === FAKE_AMULET_OF_YENDOR_DW
                && !otmp.known)))
        await pline('The Amulet doesn\'t like being called names.');
    else
        await pline(`That is a silly thing to ${word}.`);
}

/* C ref: do_wear.c:2030 canwearobj(otmp, mask, noisy).
 * `mask` is C's `long *` out-parameter; JS passes a one-field box.
 * Returns C's `!err` as a boolean. */
export async function canwearobj(otmp, maskbox, noisy) {
    const g = game;
    const u = g.u = g.u || {};
    let err = 0;
    let which;
    const ydata = _hero_data_dw();

    /* do_wear.c:2036-2042 — same check as 'W' (dowear) but a different message,
     * in case we arrived via 'P' (doputon). */
    if (verysmall_dw(ydata) || nohands_dw(ydata)) {
        if (noisy)
            await pline("You can't wear any armor in your current form.");
        return false;
    }

    /* do_wear.c:2044-2047 */
    which = is_cloak(otmp) ? c_cloak
          : is_shirt(otmp) ? c_shirt
            : is_suit(otmp) ? c_suit
              : 0;
    /* do_wear.c:2048-2057 — form can't wear body armor at all.  The cloak
     * exception is the one m_dowear() uses. */
    if (which && cantweararm_dw(ydata)
        && (which !== c_cloak
            || (((otmp.otyp | 0) !== MUMMY_WRAPPING_DW)
                ? (ydata.msize | 0) !== MZ_SMALL_DW
                : !WrappingAllowed_dw(ydata)))
        && (racial_exception_dw(otmp) < 1)) {
        if (noisy)
            await pline(`The ${which} will not fit on your body.`);
        return false;
    } else if ((otmp.owornmask | 0) & W_ARMOR_C) {
        /* do_wear.c:2058-2062.  accessory_or_armor_on() already rejects this at
         * do_wear.c:2215 for the wider W_ACCESSORY|W_ARMOR mask, so for the 'W'
         * path this arm is unreachable; ported for structural fidelity. */
        if (noisy)
            await already_wearing(c_that_);
        return false;
    }

    /* do_wear.c:2064-2069 */
    if (_uwep_welded_dw() && bimanual(u.uwep) && (is_suit(otmp) || is_shirt(otmp))) {
        if (noisy)
            await pline(`You cannot do that while holding your ${is_sword(u.uwep) ? c_sword : c_weapon}.`);
        return false;
    }

    if (is_helmet(otmp)) {                              /* do_wear.c:2071 */
        if (u.uarmh) {
            if (noisy)
                await already_wearing(an(helm_simple_name(armorRow(u.uarmh))));
            err++;
        } else if (Upolyd(u) && num_horns(ydata) > 0 && !is_flimsy(otmp)) {
            /* do_wear.c:2076 — has_horns(ptr) is mondata.h:56 num_horns > 0.
             * (flimsy exception matches polyself handling) */
            if (noisy)
                await pline(`The ${helm_simple_name(armorRow(otmp))} won't fit over your horn${plur_dw(num_horns(ydata))}.`);
            err++;
        } else
            maskbox.mask = W_ARMH;
    } else if (is_shield(otmp)) {                       /* do_wear.c:2085 */
        if (u.uarms) {
            if (noisy)
                await already_wearing(an(c_shield));
            err++;
        } else if (u.uwep && bimanual(u.uwep)) {
            if (noisy)
                await pline(`You cannot wear a shield while wielding a two-handed ${
                    is_sword(u.uwep) ? c_sword
                    : (u.uwep.otyp | 0) === BATTLE_AXE_DW ? c_axe
                      : c_weapon}.`);
            err++;
        } else if (u.twoweap) {
            if (noisy)
                await pline('You cannot wear a shield while wielding two weapons.');
            err++;
        } else
            maskbox.mask = W_ARMS;
    } else if (is_boots(otmp)) {                        /* do_wear.c:2103 */
        if (u.uarmf) {
            if (noisy)
                await already_wearing(c_boots);   /* no an() — C passes c_boots bare */
            err++;
        } else if (Upolyd(u) && _slithy_dw(ydata)) {
            if (noisy)
                await pline('You have no feet...');   /* not body_part(FOOT) */
            err++;
        } else if (Upolyd(u) && (ydata.mlet | 0) === S_CENTAUR_DW) {
            /* do_wear.c:2112 — break_armor() pushes boots off for centaurs, so
             * don't let dowear() put them back on; C hard-codes "hooves". */
            if (noisy)
                await pline(`You have too many hooves to wear ${c_boots}.`);
            err++;
        } else if (u.utrap
                   && ((u.utraptype | 0) === TT_BEARTRAP_DW
                       || (u.utraptype | 0) === TT_INFLOOR_DW
                       || (u.utraptype | 0) === TT_LAVA_DW
                       || (u.utraptype | 0) === TT_BURIEDBALL_DW)) {
            if ((u.utraptype | 0) === TT_BEARTRAP_DW) {
                if (noisy)
                    await pline(`Your ${body_part(BP_FOOT_DW)} is trapped!`);
            } else if ((u.utraptype | 0) === TT_INFLOOR_DW
                       || (u.utraptype | 0) === TT_LAVA_DW) {
                if (noisy)
                    await pline(`Your ${makeplural(body_part(BP_FOOT_DW))} are stuck in the ${surface_dw(u.ux, u.uy)}!`);
            } else { /*TT_BURIEDBALL*/
                if (noisy)
                    await pline(`Your ${body_part(BP_LEG_DW)} is attached to the buried ball!`);
            }
            err++;
        } else
            maskbox.mask = W_ARMF;
    } else if (is_gloves(otmp)) {                       /* do_wear.c:2139 */
        if (u.uarmg) {
            if (noisy)
                await already_wearing(c_gloves);  /* no an() — C passes c_gloves bare */
            err++;
        } else if (_uwep_welded_dw()) {
            if (noisy)
                await pline(`You cannot wear gloves over your ${is_sword(u.uwep) ? c_sword : c_weapon}.`);
            err++;
        } else if (Glib_dw()) {
            /* prevent slippery bare fingers from transferring to gloved fingers */
            if (noisy)
                await pline(`Your ${fingers_or_gloves(false)} are too slippery to pull on ${gloves_simple_name(armorRow(otmp), otmp)}.`);
            err++;
        } else
            maskbox.mask = W_ARMG;
    } else if (is_shirt(otmp)) {                        /* do_wear.c:2158 */
        if (u.uarm || u.uarmc || u.uarmu) {
            if (u.uarmu) {
                if (noisy)
                    await already_wearing(an(c_shirt));
            } else {
                if (noisy)
                    await pline(`You can't wear that over your ${
                        (u.uarm && !u.uarmc) ? c_armor
                                             : cloak_simple_name(armorRow(u.uarmc), u.uarmc)}.`);
            }
            err++;
        } else
            maskbox.mask = W_ARMU;
    } else if (is_cloak(otmp)) {                        /* do_wear.c:2172 */
        if (u.uarmc) {
            if (noisy)
                await already_wearing(an(cloak_simple_name(armorRow(u.uarmc), u.uarmc)));
            err++;
        } else
            maskbox.mask = W_ARMC;
    } else if (is_suit(otmp)) {                         /* do_wear.c:2179 */
        if (u.uarmc) {
            if (noisy)
                await pline(`You cannot wear armor over a ${cloak_simple_name(armorRow(u.uarmc), u.uarmc)}.`);
            err++;
        } else if (u.uarm) {
            if (noisy)
                await already_wearing('some armor');
            err++;
        } else
            maskbox.mask = W_ARM;
    } else {                                            /* do_wear.c:2190 */
        /* getobj can't do this after setting its allow_all flag; that happens
           if you have armor for slots that are covered up or extra armor for
           slots that are filled */
        if (noisy)
            await silly_thing_dw('wear', otmp);
        err++;
    }
    /* do_wear.c:2198-2205 — the welded(otmp) arm is #if 0'd out in C ("only
     * weapons ... get welded to your hand, not armor"); not ported. */
    return !err;                                        /* do_wear.c:2206 */
}
/* C mondata.h slithy(ptr) — (mflags1 & M1_SLITHY) != 0; monflag.h:104
 * M1_SLITHY = 0x00080000 ("has serpent body").  Read only by the Upolyd boots
 * arm above. */
const M1_SLITHY_DW = 0x00080000;
function _slithy_dw(ptr) { return ((ptr.mflags1 >>> 0) & M1_SLITHY_DW) !== 0; }
/* C ref: you.h:340-345 u.utraptype enum. */
const TT_BEARTRAP_DW = 1, TT_LAVA_DW = 4, TT_INFLOOR_DW = 5, TT_BURIEDBALL_DW = 6;

export async function accessory_or_armor_on(obj) {
    const g = game;
    const u = g.u = g.u || {};
    if (!obj) {
        return ECMD_CANCEL;
    }
    if ((obj.owornmask | 0) & (W_ACCESSORY_MASK | W_ARMOR_C)) {
        await already_wearing(c_that_);
        return ECMD_OK;
    }
    const oclass = obj.oclass | 0;
    const armor = (oclass === ARMOR_CLASS);
    const ring = (oclass === RING_CLASS || obj.otyp === MEAT_RING);
    const amulet = (oclass === AMULET_CLASS);
    if (armor) {
        const maskbox = { mask: 0 };
        if (!(await canwearobj(obj, maskbox, true))) {
            return ECMD_OK;
        }
        /* C do_wear.c:2375 — save underwater state before setworn/Boots_on.
         * Boots_on needs this to discover water-walking boots after the
         * property changes the hero's position. */
        if ((obj.otyp | 0) === WATER_WALKING_BOOTS_OTYP_DW)
            g.wasinwater = u.uinwater ? 1 : 0;
        return await armoron(obj);
    }
    if (ring) {
        if (nolimbs(game.youmonst && game.youmonst.data)) {
            await pline('You cannot make the ring stick to your body.');
            return ECMD_OK;
        }
        /* do_wear.c:2258 — ring branch.  Determine the finger mask: if both
         * fingers are full or none free, handle accordingly; otherwise prompt
         * "Which ring-finger, Right or Left?" and read the answer key. */
        const LEFT_RING_VAL = 0x00020000;
        const RIGHT_RING_VAL = 0x00040000;
        let mask = 0;
        if (g.u.uleft && g.u.uright) {
            return ECMD_OK;
        }
        if (g.u.uleft) {
            mask = RIGHT_RING_VAL;
        } else if (g.u.uright) {
            mask = LEFT_RING_VAL;
        } else {
            const u = g.u;
            /* C do_wear.c:2271-2272 — humanoid(gy.youmonst.data) ? "ring-" : ""
             * (mondata.h:65, mflags1 & M1_HUMANOID). */
            const humanoid = _humanoid_dw();
            const qbuf = `Which ${humanoid ? 'ring-' : ''}${body_part(FINGER)}, Right or Left?`;
            /* tty_yn_function renders "<q> [rl]" with cursor one past the prompt. */
            const promptText = `${qbuf} [rl]`;
            g._pending_message = promptText;
            await flush_screen(1);
            {
                const disp = g.nhDisplay;
                if (disp) topl_park_cursor(disp, promptText + ' ');
            }
            for (;;) {
                const raw = await nhgetch();
                const key = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
                if (key === 0 || key === 27 /* ESC */) {
                    return ECMD_OK;
                }
                if (key === 32 || key === 13 || key === 10) {
                    g._topl_sticky = promptText;
                    return ECMD_OK;
                }
                const c = String.fromCharCode(key);
                if (c === 'l' || c === 'L') { mask = LEFT_RING_VAL; break; }
                if (c === 'r' || c === 'R') { mask = RIGHT_RING_VAL; break; }
                /* invalid key: loop and re-read (C do..while !mask). */
            }
        }
        /* do_wear.c:2290-2317 — Glib / cursed-gloves / welded-weapon guards. */
        {
            const u = g.u;
            if (u.uarmg && Glib_dw()) {
                await Your(`${gloves_simple_name_obj(u.uarmg)} are too slippery to remove, so you cannot put on the ring.`);
                return ECMD_TIME; /* always uses move */
            }
            if (u.uarmg && u.uarmg.cursed) {
                const res = !u.uarmg.bknown;
                set_bknown(u.uarmg, 1);
                await You(`cannot remove your ${c_gloves} to put on the ring.`);
                return res ? ECMD_TIME : ECMD_OK;
            }
            if (u.uwep) {
                const res = !u.uwep.bknown; /* before welded() sets bknown */
                if (((mask === RIGHT_RING_VAL && u.uhandedness === RIGHT_HANDED)
                     || (mask === LEFT_RING_VAL && u.uhandedness === LEFT_HANDED)
                     || bimanual(u.uwep)) && _uwep_welded_dw()) {
                    let hand = body_part(HAND);
                    if (bimanual(u.uwep)) hand = makeplural(hand);
                    set_bknown(u.uwep, 1);
                    await You(`cannot free your weapon ${hand} to put on the ring.`);
                    return res ? ECMD_TIME : ECMD_OK;
                }
            }
        }
        /* do_wear.c:2356 retouch_object(): no silver/material conflict here. */
        /* do_wear.c:2409-2416 — setworn(obj, mask); Ring_on(obj); on_msg. */
        await setworn(obj, mask);
        await Ring_on(obj);
        find_ac();
        /* do_wear.c:2416 on_msg(obj) → prinv(NULL, obj, 0) — the
         * "<invlet> - <doname> (on {right|left} hand)." add-to-invent feedback
         * (do_wear.c:76 on_msg; objnam.c:1494 worn-ring suffix).  RNG-free. */
        /* do_wear.c:2412-2413 — is_worn(obj) is false only for a ring of
         * levitation put on at a sink (dosinkfall already removed it). */
        if ((obj.owornmask | 0) !== 0)
            await on_msg(obj);
        return ECMD_TIME;
    }
    if (amulet) {
        await remove_worn_item(obj, false);
        await setworn(obj, W_AMUL_C);
        find_ac();
        if (g.disp) g.disp.botl = 1;
        /* The AMULET_OF_ESP / LIFE_SAVING / VERSUS_POISON / REFLECTION /
         * FAKE_AMULET_OF_YENDOR cases of C's switch are a bare break (:972-977),
         * so on_msg is the whole remaining body for them.  AMULET_OF_CHANGE is
         * ported below (own early-return arm — see its citation).  MAGICAL_
         * BREATHING / UNCHANGING / STRANGULATION still reach unported helpers
         * and stay deferred. */
        if ((obj.otyp | 0) === AMULET_OF_RESTFUL_SLEEP_DW) {
            const u = g.u;
            if (!u.uprops) u.uprops = {};
            if (!u.uprops[SLEEPY_DW])
                u.uprops[SLEEPY_DW] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
            const newnap = rnd(98) + 2;
            const oldnap = (u.uprops[SLEEPY_DW].intrinsic | 0) & TIMEOUT_DW;
            if (newnap < oldnap || oldnap === 0)
                u.uprops[SLEEPY_DW].intrinsic =
                    ((u.uprops[SLEEPY_DW].intrinsic | 0) & ~TIMEOUT_DW) | newnap;
        }
        if ((obj.otyp | 0) === AMULET_OF_CHANGE_DW) {
            const origSex = poly_gender();
            if (!Unchanging_dw())
                change_sex_dw();
            const newSex = poly_gender();
            if (newSex !== origSex)
                makeknown_otyp(AMULET_OF_CHANGE_DW);
            /* do_wear.c:1006 on_msg(uamul) — "z - amulet of change (being
             * worn)."  Fires BEFORE useup destroys the object, unlike the
             * generic tail call this branch skips by returning early. */
            await on_msg(obj);
            let callIt = false;
            if (newSex !== origSex) {
                newsym(g.u.ux | 0, g.u.uy | 0);
                if (g.disp) g.disp.botl = 1;
                await You('are suddenly very %s!',
                    (g.flags && g.flags.female) ? 'feminine' : 'masculine');
            } else {
                await You("don't feel like yourself.");
                callIt = obj.dknown !== undefined ? !!obj.dknown : true;
            }
            await pline('The amulet disintegrates!');
            if (callIt)
                await trycall(obj);
            await useup(obj);
            return ECMD_TIME;
        }
        /* C ref: do_wear.c:1078 — case AMULET_OF_GUARDING: makeknown();
         * find_ac().  makeknown -> discover_object(credit_hero) draws
         * exercise(A_WIS)'s rn2(19) (attrib.c:509) and makes the name known. */
        if ((obj.otyp | 0) === AMULET_OF_GUARDING) {
            makeknown_otyp(AMULET_OF_GUARDING);
            find_ac();
        }
        /* C ref: do_wear.c:1030-1042 — case AMULET_OF_STRANGULATION. */
        let onMsgDone = false;
        if ((obj.otyp | 0) === AMULET_OF_STRANGULATION_DW) {
            const bre = g.u.uprops && g.u.uprops[MAGICAL_BREATHING_DW];
            const breathless = !!(bre && ((bre.intrinsic | 0) || (bre.extrinsic | 0)));
            const sp = ensure_uprop(STRANGLED);
            if (has_head(g.youmonst && g.youmonst.data) && !breathless
                && !(sp.intrinsic | 0)) {
                makeknown_otyp(AMULET_OF_STRANGULATION_DW);
                sp.intrinsic = 6;
                if (g.disp) g.disp.botl = 1;
                await on_msg(obj);
                onMsgDone = true;
                await pline('It constricts your throat!');
            }
        }
        /* C ref: do_wear.c:1056-1074 — case AMULET_OF_FLYING. */
        if ((obj.otyp | 0) === AMULET_OF_FLYING_DW) {
            float_vs_flight();
            if (Flying()) {
                const fp = ensure_uprop(FLYING_PROP);
                const was = (fp.extrinsic | 0) & ~W_AMUL_C;
                const alreadyFlying = !!((fp.intrinsic | 0) || was) && !(fp.blocked | 0);
                if (!alreadyFlying) {
                    makeknown_otyp(AMULET_OF_FLYING_DW);
                    await on_msg(obj);
                    onMsgDone = true;
                    if (g.disp) g.disp.botl = 1;
                    await You('are now in flight.');
                }
            }
        }
        if (!onMsgDone)
            await on_msg(obj);
        return ECMD_TIME;
    }
    if (oclass === TOOL_CLASS_DW && _is_eyewear_dw(obj)) {
        if (!has_head(game.youmonst && game.youmonst.data)) {
            await pline(`You have no head to wear ${ansimpleoname(obj)} on.`);
            return ECMD_OK;
        }
        let ub = g.u.ublindf;
        if (!ub) {
            for (let o = g.invent; o; o = o.nobj) {
                if ((o.owornmask | 0) & W_TOOL_C) { ub = o; break; }
            }
        }
        if (ub) {
            const ubOtyp = ub.otyp | 0;
            const objOtyp = obj.otyp | 0;
            if (ubOtyp === TOWEL_OTYP_DW) {
                await pline(`Your ${body_part(FACE_DW)} is already covered by a towel.`);
            } else if (ubOtyp === BLINDFOLD_OTYP_DW) {
                if (objOtyp === LENSES_OTYP_DW)
                    await already_wearing2('lenses', 'a blindfold');
                else
                    await already_wearing('a blindfold');
            } else if (ubOtyp === LENSES_OTYP_DW) {
                if (objOtyp === BLINDFOLD_OTYP_DW)
                    await already_wearing2('a blindfold', 'some lenses');
                else
                    await already_wearing('some lenses');
            } else {
                /* C's defensive `???` fallback — unreachable (the only three
                 * eyewear otyps are TOWEL/BLINDFOLD/LENSES), ported anyway. */
                await already_wearing('something');
            }
            return ECMD_OK;
        }
        await Blindf_on(obj);
        return ECMD_TIME;
    }
    return ECMD_TIME;
}
/* C ref: do_wear.c:2213 `is_worn_eyewear(obj)` — objects.h:944-950's three
 * EYEWEAR rows (lenses 232, blindfold 233, towel 234).  Tested by otyp rather
 * than by oc_oprop, because LENSES confer NO property (oc_oprop 0) yet are
 * still eyewear and still occupy the W_TOOL slot. */
const BLINDFOLD_OTYP_DW = 233;
const TOWEL_OTYP_DW = 234;
function _is_eyewear_dw(obj) {
    const otyp = obj.otyp | 0;
    return otyp === LENSES_OTYP_DW || otyp === BLINDFOLD_OTYP_DW
        || otyp === TOWEL_OTYP_DW;
}
export async function dowear(otmp) {
    const ydata = _hero_data_dw();
    if (verysmall_dw(ydata) || nohands_dw(ydata)) {
        /* do_wear.c:2437-2441 */
        await pline("Don't even bother.");
        return ECMD_OK;
    }
    const u = game.u || {};
    if (u.uarm && u.uarmu && u.uarmc && u.uarmh && u.uarms && u.uarmg && u.uarmf
        && u.uleft && u.uright && u.uamul && u.ublindf) {
        /* do_wear.c:2442-2448 — 'W' message doesn't mention accessories. */
        await You('are already wearing a full complement of armor.');
        return ECMD_OK;
    }
    /* do_wear.c:2449 — otmp = getobj("wear", wear_ok, GETOBJ_NOFLAGS).  Only
     * when NO caller has already resolved one (see doc comment above). */
    if (otmp === undefined) {
        otmp = await getObjFromGetobj('wear', wear_ok, GETOBJ_NOFLAGS_CMD);
    }
    if (!otmp) {
        return ECMD_CANCEL;
    }
    return await accessory_or_armor_on(otmp);
}
export async function doputon(otmp) {
    const g = game;
    const u = g.u || {};

    /* Guard: all slots full — do_wear.c:2459-2467 */
    if (u.uleft && u.uright && u.uamul && u.ublindf
        && u.uarm && u.uarmu && u.uarmc && u.uarmh && u.uarms && u.uarmg && u.uarmf) {
        /* 'P' message doesn't mention armor */
        /* objects.h LENSES otyp is 232 (OBJ("lenses","concave glass"), the
         * TOOL_CLASS run; js/u_init.js:962 and js/objnam.js agree).  This local
         * said 14, which is not even a real object slot, so a hero wearing
         * lenses was told "a blindfold" here. */
        const LENSES = 232;
        await Your("%s%s are full, and you're already wearing an amulet and %s.",
             /* C do_wear.c:2463 — humanoid(gy.youmonst.data) ? "ring-" : "" */
             _humanoid_dw() ? "ring-" : "",
             fingers_or_gloves(false),
             (u.ublindf.otyp === LENSES) ? "some lenses" : "a blindfold");
        return ECMD_OK;
    }

    /* do_wear.c:2468 — otmp = getobj("put on", puton_ok, GETOBJ_NOFLAGS).
     * Only when no caller has already resolved one. */
    if (otmp === undefined) {
        otmp = await getObjFromGetobj('put on', puton_ok, GETOBJ_NOFLAGS_CMD);
    }
    if (!otmp) {
        return ECMD_CANCEL;
    }
    return await accessory_or_armor_on(otmp);
}
/* C ref: do_wear.c:67 off_msg(otmp) — "You were wearing <doname>." when verbose.
 * For a worn ring, doname(otmp) renders "a <type> (on {right|left} hand)" — the
 * type name (ring identified on don via learnring), no +N (charge not known), the
 * worn-hand suffix from owornmask.  RNG-free.  Drives the topline; the --More--
 * pagination is handled by flush_screen's per-pline reserve split. */
export async function off_msg(otmp) {
    if (game.flags.verbose) await You('were wearing %s.', (await doname(otmp)));
}
function ringDonameBody(otmp) {
    const g = game;
    const otyp = otmp.otyp | 0;
    const LEFT_RING_VAL = 0x00020000;
    const oc_name_known = !!(g._oc_name_known && g._oc_name_known[otyp]);
    const dknown = !!otmp.dknown;
    let name;
    if (oc_name_known && dknown) {
        /* xname name-known: "ring of <actualn>". */
        name = `ring of ${getObjName(otyp) || 'unknown'}`;
    } else {
        /* xname appearance: "<descr> ring". */
        const descr = getObjDescr(otyp);
        name = descr ? `${descr} ring` : 'ring';
    }
    const hand = ((otmp.owornmask | 0) & LEFT_RING_VAL) ? 'left' : 'right';
    const RIN_BASE = 173, RIN_LAST_CHARGED = 178;
    let prefix = '';
    if (otmp.known && otyp >= RIN_BASE && otyp <= RIN_LAST_CHARGED) {
        const spe = otmp.spe | 0;
        prefix = `${spe >= 0 ? '+' : ''}${spe} `;
    }
    return `${prefix}${name} (on ${hand} ${body_part(HAND)})`;
}
async function on_msg(otmp) {
    const g = game;
    const W_RING = 0x00060000; /* W_RINGL|W_RINGR */
    if ((otmp.owornmask | 0) & W_RING) {
        /* prinv -> xprname -> doname (do_wear.c:76-80): the real namer, so the BUC
         * word and article come from objnam.c, not a hand-scoped ring partial. */
        const invlet = String.fromCharCode(otmp.invlet | 0);
        const line = `${invlet} - ${(await doname(otmp))}.`;
        /* C on_msg -> prinv -> pline.  Using the canonical pline path here is
         * what makes update_topl evaluate overflow at this exact call boundary,
         * before the wear command's world turn.  Preserve the surviving final
         * topline through rhack's command-result handoff. */
        await pline(line);
        if (g._pending_message)
            g._resultMessage = g._pending_message;
        return;
    }
    if ((otmp.owornmask | 0) & W_AMUL_C) {
        const invlet = String.fromCharCode(otmp.invlet | 0);
        const line = `${invlet} - ${(await doname(otmp))}.`;
        const committed = g._pending_message || '';
        const merged = committed
            ? _topl_merge_result(committed, line, _topl_joins_snapshot(committed))
            : line;
        g._resultMessage = g._resultMessage
            ? _topl_merge_result(g._resultMessage, merged)
            : merged;
        return;
    }
    if (!(game.flags && game.flags.verbose))
        return;
    const _otmp_name = xname(otmp);
    let _how = '';
    if ((otmp.otyp | 0) === TOWEL_OTYP_DW)
        _how = ` around your ${body_part(HEAD_DW)}`;
    await pline(`You are now wearing ${obj_is_pname(otmp)
        ? the(_otmp_name) : an(_otmp_name)}${_how}.`);
}
/* C ref: decl.h Role_if(pm) — urole.mnum == pm - LOW_PM.  LOW_PM is 0 in this
 * port and the role is carried as flags.initrole (PM_CLERIC = role index 6,
 * the same encoding js/cmd.js:9250 _Role_if uses for doturn). */
const _PM_CLERIC_ROLE = 6;
function _Role_if_cleric() {
    return ((game.flags?.initrole ?? -1) | 0) === _PM_CLERIC_ROLE;
}
function armorDonameBody(otmp) {
    let prefix = '';
    if (otmp.bknown) {
        if (otmp.cursed) prefix += 'cursed ';
        else if (otmp.blessed) prefix += 'blessed ';
        else if (!_Role_if_cleric()) prefix += 'uncursed ';
    }
    /* "%+d " enchantment when the charge is known (objnam.c:1422-1424). */
    if (otmp.known) {
        const spe = otmp.spe | 0;
        prefix += `${spe >= 0 ? '+' : ''}${spe} `;
    }
    /* Type name — objnam.c:1387 doname_base calls xname(obj), i.e. the
     * ARMOR_CLASS branch of xname_flags (objnam.c:763-778).  The local
     * re-derivation this used to do went through getObjName(), the PARTIAL
     * (shuffled-appearance + weapon) OBJ_NAME table, which returns null for
     * every fixed-name armor otyp — including ROBE (143) — so a name-known
     * robe fell all the way through to the 'armor' fallback.  xname_armor()
     * resolves the name through _objName() (full-coverage OBJ_NAME) and also
     * carries the pair-of / dragon-scale / unseen-shield branches this copy
     * lacked. */
    return `${prefix}${xname_armor(otmp)}`;
}
/* C off_msg runs after the armor's removal callback and before armoroff
 * returns. Its message can block while u.uac still has the pre-removal value. */

async function Ring_off_or_gone(obj, gone) {
    const u = game.u;
    const W_RING = 0x00060000; /* RIGHT|LEFT ring masks */
    const mask = (obj.owornmask | 0) & W_RING;
    game.context.takeoff ||= { mask: 0 };
    game.context.takeoff.mask &= ~mask;
    const oprop = MKOBJ_OC_OPROP[obj.otyp | 0] | 0;
    if (!(u.uprops?.[oprop]?.extrinsic & mask))
        await equipment_impossible("Strange... I didn't know you had that ring.");
    if (gone)
        setnotworn(obj);
    else
        await setworn(null, obj.owornmask);

    /* C do_wear.c:1360 switch(obj->otyp): only the ring types that produce an
     * immediate off-effect are handled; the property/break rings fall through
     * with no effect (already deconferred above). */
    if ((obj.otyp | 0) === RIN_SEE_INVISIBLE_OTYP) {
        const see = u.uprops?.[SEE_INVIS_PROP];
        const seeInvisible = !!((see?.intrinsic | 0) || (see?.extrinsic | 0));
        if (!seeInvisible) {
            set_mimic_blocking();
            see_monsters();
        }
        const inv = u.uprops?.[INVIS_PROP];
        const invis = !!((inv?.intrinsic | 0) || (inv?.extrinsic | 0))
            && !(inv?.blocked | 0);
        if (invis && !seeInvisible && !_Blind_dw()) {
            newsym(u.ux | 0, u.uy | 0);
            await pline('Suddenly you cannot see yourself.');
            learnring(obj, true);
        }
    } else if ((obj.otyp | 0) === RIN_INVISIBILITY_OTYP) {
        const inv = u.uprops?.[INVIS_PROP];
        const invis = !!((inv?.intrinsic | 0) || (inv?.extrinsic | 0))
            && !(inv?.blocked | 0);
        if (!invis && !(inv?.blocked | 0) && !_Blind_dw()) {
            const see = u.uprops?.[SEE_INVIS_PROP];
            const seeInvisible = !!((see?.intrinsic | 0) || (see?.extrinsic | 0));
            newsym(u.ux | 0, u.uy | 0);
            await pline(`Your body seems to unfade${seeInvisible ? ' completely' : '..'}.`);
            learnring(obj, true);
        }
    }
    if ((obj.otyp | 0) === RIN_LEVITATION_OTYP) {
        const p = uprop_levitation_record();
        const FROMOUTSIDE = 0x04000000;
        if (!((p.blocked | 0) & FROMOUTSIDE)) {
            await float_down(0, 0);
            if (!Levitation())
                learnring(obj, true);
        } else {
            float_vs_flight();
        }
    }
    // C do_wear.c:1416-1440: undo charged-ring bonuses and refresh protection
    // immediately, before glibr's next message can freeze a status frame.
    switch (obj.otyp | 0) {
    case RIN_GAIN_STRENGTH_OTYP:
        adjust_attrib_dw(obj, A_STR, -(obj.spe | 0));
        break;
    case RIN_GAIN_CONSTITUTION_OTYP:
        adjust_attrib_dw(obj, A_CON, -(obj.spe | 0));
        break;
    case RIN_ADORNMENT_OTYP:
        adjust_attrib_dw(obj, A_CHA, -(obj.spe | 0));
        break;
    case RIN_INCREASE_ACCURACY_OTYP:
        u.uhitinc = (u.uhitinc | 0) - (obj.spe | 0);
        break;
    case RIN_INCREASE_DAMAGE_OTYP:
        u.udaminc = (u.udaminc | 0) - (obj.spe | 0);
        break;
    case RIN_PROTECTION_OTYP:
        learnring(obj, !!obj.spe);
        if (obj.spe) find_ac();
        break;
    }
    /* Other immediate toggle-ring effects (stealth/warning/see-invis/invis/
     * shapechanger protection) remain deferred in both Ring_on and Ring_off. */
}

/* C do_wear.c:1454 Ring_gone(obj) — removal outside the ordinary take-off
 * command.  Ring_off_or_gone can land the hero, so callers await it. */
export async function Ring_gone(obj) {
    await Ring_off_or_gone(obj, true);
}

/* C ref: do_wear.c:1448 Ring_off(obj) — Ring_off_or_gone(obj, FALSE). */
export async function Ring_off(obj) {
    await Ring_off_or_gone(obj, false);
}

async function off_msg_amulet(otmp) {
    if (!(game.flags && game.flags.verbose))
        return;
    await pline(`You were wearing ${(await doname(otmp))}.`);
}
export async function Amulet_off() {
    const g = game;
    const u = g.u || (g.u = {});
    const amul = u.uamul;
    if (!amul) return; /* C has no impossible() guard; unreachable via the
                         * obj===u.uamul call site above. */
    g.context = g.context || {};
    if (g.context.takeoff)
        g.context.takeoff.mask = (g.context.takeoff.mask | 0) & ~W_AMUL_C;
    const otyp = amul.otyp | 0;
    let earlyOffMsg = false;
    if (otyp === AMULET_OF_ESP_DW) {
        /* do_wear.c:1097-1105 — setworn+off_msg early so the ability is
         * already off before see_monsters() re-derives vision.
         * see_monsters() itself deferred: display-only vision recompute. */
        await setworn(null, W_AMUL_C);
        await off_msg_amulet(amul);
        earlyOffMsg = true;
    } else if (otyp === AMULET_OF_STRANGULATION_DW) {
        /* do_wear.c:1134-1148 */
        await setworn(null, W_AMUL_C);
        await off_msg_amulet(amul);
        earlyOffMsg = true;
        /* do_wear.c:1139-1146 */
        const sp = ensure_uprop(STRANGLED);
        if (sp.intrinsic | 0) {
            sp.intrinsic = 0;
            if (g.disp) g.disp.botl = 1;
            const bre = u.uprops && u.uprops[MAGICAL_BREATHING_DW];
            const breathless = !!(bre && ((bre.intrinsic | 0) || (bre.extrinsic | 0)));
            if (breathless)
                await pline(`Your ${body_part(NECK)} is no longer constricted!`);
            else
                await pline('You can breathe more easily!');
            makeknown_otyp(AMULET_OF_STRANGULATION_DW);
        }
    } else if (otyp === AMULET_OF_RESTFUL_SLEEP_DW) {
        /* do_wear.c:1150-1154 — setworn only; off_msg comes from the shared
         * tail below (early_off_msg is NOT set for this case in C). */
        await setworn(null, W_AMUL_C);
        /* C do_wear.c:1152-1153 — clear the timeout bits only when no other
         * source (ESleepy, FROMOUTSIDE bits) holds the property. */
        const sl = u.uprops && u.uprops[SLEEPY_DW];
        if (sl && !(sl.extrinsic | 0) && !((sl.intrinsic | 0) & ~TIMEOUT_DW))
            sl.intrinsic = (sl.intrinsic | 0) & ~TIMEOUT_DW;
        /* do_wear.c:1151-1153 — HSleepy = 0L avoided to keep FROMOUTSIDE. */
        const slp = u.uprops && u.uprops[SLEEPY_DW];
        if (slp && !(slp.extrinsic | 0) && !((slp.intrinsic | 0) & ~PROP_TIMEOUT))
            slp.intrinsic = (slp.intrinsic | 0) & ~PROP_TIMEOUT;
    } else if (otyp === AMULET_OF_MAGICAL_BREATHING_DW) {
        /* do_wear.c:1113-1132 */
        await setworn(null, W_AMUL_C);
        await off_msg_amulet(amul);
        earlyOffMsg = true;
    } else if (otyp === AMULET_OF_FLYING_DW) {
        /* do_wear.c:1155-1170 */
        const was_flying = Flying();
        await setworn(null, W_AMUL_C);
        await off_msg_amulet(amul);
        earlyOffMsg = true;
        float_vs_flight();
        if (was_flying && !Flying()) {
            if (g.disp) g.disp.botl = 1;
            await pline(`You ${(is_pool_or_lava(u.ux, u.uy)
                || Is_waterlevel(u.uz) || Is_airlevel(u.uz))
                ? "stop flying" : "land"}.`);
            makeknown_otyp(AMULET_OF_FLYING_DW);
            await spoteffects(true);
        }
    } else if (otyp === AMULET_OF_GUARDING) {
        find_ac(); /* do_wear.c:1176 — shared tail handles setworn+off_msg. */
    }
    /* do_wear.c:1180-1183 — shared tail every case arm falls into. */
    await setworn(null, W_AMUL_C);
    if (!earlyOffMsg)
        await off_msg_amulet(amul);
}

export async function float_down(hmask, emask) {
    const g = game;
    const u = g.u;
    const p = uprop_levitation_record();
    // C trap.c:4032-4033: clear requested sources before checking others.
    p.intrinsic = (p.intrinsic | 0) & ~hmask;
    p.extrinsic = (p.extrinsic | 0) & ~emask;
    if (Levitation())
        return 0; /* maybe another ring/potion/boots still levitating */
    // C trap.c:4036-4053: a blocked source never lifted the hero off the
    if (p.blocked | 0) {
        const trapped = (p.blocked | 0) === I_SPECIAL;
        float_vs_flight();
        if (trapped && u.utrap) {
            const kind = (u.utraptype | 0) === TT_BEARTRAP ? "trap's jaws"
                : (u.utraptype | 0) === TT_WEB ? 'web'
                : (u.utraptype | 0) === TT_BURIEDBALL ? 'chain'
                : (u.utraptype | 0) === TT_LAVA ? 'lava' : 'ground';
            await pline(`You are no longer trying to float up from the ${kind}.`);
        }
        await encumber_msg();
        return 0;
    }
    /* SET_BOTL */
    if (g.disp) g.disp.botl = 1;
    /* botl event tag (parity with C's flush_screen → bot during the more()). */
    nomul(0); /* stop running or resting (hack.c) */
    /* C trap.c:4059-4066 — controlled flight no longer overridden by levitation. */
    if (ensure_uprop(FLYING_PROP).blocked | 0) {
        float_vs_flight();
        if (Flying()) {
            await pline('You have stopped levitating and are now flying.');
            await encumber_msg(); /* carrying capacity might have changed */
            return 1;
        }
    } else {
        float_vs_flight();
    }
    /* uswallow/Punished/pool/lava branches deferred (FALSE here). */
    if (!(emask & W_SADDLE_FD)) {
        const hallu = u.uprops?.[HALLUC]?.intrinsic
            && !(u.uprops[HALLUC_RES]?.intrinsic || u.uprops[HALLUC_RES]?.extrinsic);
        if (hallu) /* C trap.c:4138-4141 (is_pool arm deferred with the pool branch) */
            await pline("Bummer!  You've hit the ground.");
        else
            await pline(`You float gently to the ${surface(u.ux, u.uy)}.`);
        // C update_topl may block here before landing triggers another effect.
        if (_topline_more_pending())
            await flush_screen(1);
    }
    /* levitation gave maximum carrying capacity; ending it may raise encumbrance.
     * encumber_msg() is emitted after the come-down message (trap.c:4133). */
    await encumber_msg();
    /* C trap.c:4147-4160 — activate a non-statue trap before pickup.  C's
     * hole/trapdoor arm additionally checks Can_fall_thru() and u.ustuck;
     * leave those transitions to their dedicated path rather than inventing
     * a fall-through predicate here. */
    const levelBeforeTrap = { dnum: u.uz?.dnum, dlevel: u.uz?.dlevel };
    const trap = t_at(u.ux | 0, u.uy | 0);
    if (trap) {
        const ttype = trap.ttyp | 0;
        const holeLike = ttype === HOLE || ttype === TRAPDOOR;
        const canTrigger = !holeLike
            || (Can_fall_thru(u.uz) && !u.ustuck);
        if (ttype !== STATUE_TRAP && canTrigger && !u.utrap) {
            await dotrap(trap, 0);
        }
    }
    /* C trap.c:4162-4167 — pickup only on a normal level, outside air/water
     * levels and swallowing; the existing helper is pickup(1). */
    if (!Is_airlevel(u.uz) && !Is_waterlevel(u.uz) && !u.uswallow
        && on_level(levelBeforeTrap, u.uz)) {
        /* The pickup's look_here text goes to the command-result channel; move the
         * live "You float gently..." line there first so it keeps C's single-
         * topline order (float message, then "You see here ..."). */
        _topl_stash_result();
        await _spoteffects_pickup_fd();
    }
    return 1;
}

// C do_wear.c:1874 — the shared #remove entry.
export async function doremring() {
    const {Narmorpieces, Naccessories, which} = _count_worn_stuff_dw(true);
    let otmp = which;
    if (!Naccessories && !Narmorpieces) {
        await pline('Not wearing any accessories or armor.');
        return ECMD_OK;
    }
    if (Naccessories !== 1 || ((game.flags.paranoia_bits | 0) & 0x0040)
        || cmdq_peek(CQ_CANNED))
        otmp = await getObjFromGetobj('remove', remove_ok, GETOBJ_NOFLAGS_CMD);
    if (!otmp) return ECMD_CANCEL;
    return armor_or_accessory_off(otmp);
}
export { doremring as doremove };
/**
 * C ref: do_wear.c:3319-3337 — adj_abon()
 * Adjust ability bonuses when GAUNTLETS_OF_DEXTERITY or HELM_OF_BRILLIANCE
 * are worn or unworn.
 */
export function adj_abon(otmp, delta) {
    const g = game;
    g.u = g.u || {};
    const u = g.u;
    /* Check GAUNTLETS_OF_DEXTERITY: uarmg must equal otmp and otyp must match. */
    if (u.uarmg && u.uarmg === otmp && (otmp.otyp | 0) === GAUNTLETS_OF_DEXTERITY) {
        if (delta) {
            /* C do_wear.c adj_abon() calls makeknown(uarmg->otyp), and
             * hack.h:1530 makes that discover_object(x, TRUE, TRUE, TRUE) --
             * the third TRUE is credit_hero, which draws exercise(A_WIS)'s
             * rn2(19).  Two arguments left it undefined and skipped the draw. */
            discover_object(u.uarmg.otyp, true, true, true);
            u.abon = u.abon || {};
            u.abon.a = u.abon.a || [0, 0, 0, 0, 0, 0];
            const di = C_ATTR_TO_DISP[A_DEX] ?? A_DEX;
            u.abon.a[di] = ((u.abon.a[di] | 0) + (delta | 0)) | 0;
        }
        /* C ref: do_wear.c:2511 — SET_BOTL() fires whenever uac changes. */
        if (g.disp)
            g.disp.botl = 1;
    }
    /* Check HELM_OF_BRILLIANCE: uarmh must equal otmp and otyp must match. */
    if (u.uarmh && u.uarmh === otmp && (otmp.otyp | 0) === HELM_OF_BRILLIANCE) {
        if (delta) {
            /* C: makeknown(uarmh->otyp) -- see the gauntlets arm above. */
            discover_object(u.uarmh.otyp, true, true, true);
            u.abon = u.abon || {};
            u.abon.a = u.abon.a || [0, 0, 0, 0, 0, 0];
            const intDi = C_ATTR_TO_DISP[A_INT] ?? A_INT;
            const wisDi = C_ATTR_TO_DISP[A_WIS] ?? A_WIS;
            u.abon.a[intDi] = ((u.abon.a[intDi] | 0) + (delta | 0)) | 0;
            u.abon.a[wisDi] = ((u.abon.a[wisDi] | 0) + (delta | 0)) | 0;
        }
        /* C ref: do_wear.c:2511 — SET_BOTL() fires whenever uac changes. */
        if (g.disp)
            g.disp.botl = 1;
    }
}

/* Helper stubs for unported functions — to be ported later. */
/* C ref: nethack-c/src/pline.c:587-637 — impossible() logs and RETURNS; it
 * never aborts.  stuck_ring's "neither left nor right" arm relies on falling
 * through to `return (struct obj *) 0`. */
function impossible(_msg, ..._args) { }
/* C mondata.h:53 — #define nolimbs(ptr) (((ptr)->mflags1 & M1_NOLIMBS) == M1_NOLIMBS)
 * monflag.h:99 M1_NOLIMBS = 0x00006000L — a TWO-BIT composite (M1_NOHANDS
 * 0x2000 | 0x4000).  The test is `== M1_NOLIMBS`, i.e. BOTH bits set, NOT
 * `!= 0`: a merely handless monster (M1_NOHANDS alone) is not limbless. */
const M1_NOLIMBS_DW = 0x00006000;
function nolimbs(mondata) {
    return (((mondata && mondata.mflags1) >>> 0) & M1_NOLIMBS_DW) === M1_NOLIMBS_DW;
}
/* C mondata.h:55 — #define has_head(ptr) (((ptr)->mflags1 & M1_NOHEAD) == 0L)
 * monflag.h:100 M1_NOHEAD = 0x00008000L ("no head to behead"). */
const M1_NOHEAD_DW = 0x00008000;
function has_head(mondata) {
    return (((mondata && mondata.mflags1) >>> 0) & M1_NOHEAD_DW) === 0;
}
/* welded() and bimanual() used to be `throw new Error('not yet ported')` stubs
 * here.  Both are now really ported, next to canwearobj() above (welded wraps
 * js/cmd.js's exported will_weld; bimanual is obj.h:257 over the C oc_bimanual
 * otyps).  stuck_ring() below calls those. */

/* C ref: do_wear.c:2657-2684 — stuck_ring(ring, otyp): check if ring is stuck.
 * Used for praying to check and fix levitation trouble.
 * C source:
 *   struct obj *
 *   stuck_ring(struct obj *ring, int otyp)
 *   {
 *       if (ring != uleft && ring != uright) {
 *           impossible("stuck_ring: neither left nor right?");
 *           return (struct obj *) 0;
 *       }
 *       if (ring && ring->otyp == otyp) {
 *           if (nolimbs(gy.youmonst.data) && uamul
 *               && uamul->otyp == AMULET_OF_UNCHANGING && uamul->cursed)
 *               return uamul;
 *           if (welded(uwep) && ((ring == RING_ON_PRIMARY) || bimanual(uwep)))
 *               return uwep;
 *           if (uarmg && uarmg->cursed)
 *               return uarmg;
 *           if (ring->cursed)
 *               return ring;
 *           if (uarmg && Glib)
 *               return uarmg;
 *       }
 *       return (struct obj *) 0;
 *   }
 */
export function stuck_ring(ring, otyp) {
    const g = game;
    g.u = g.u || {};
    const u = g.u;

    /* Check if ring is uleft or uright; if not, return null (error case). */
    if (ring !== u.uleft && ring !== u.uright) {
        impossible("stuck_ring: neither left nor right?");
        return null;
    }

    /* Check conditions if ring exists and matches the requested otyp. */
    if (ring && (ring.otyp | 0) === (otyp | 0)) {
        /* Check for nolimbs with AMULET_OF_UNCHANGING amulet cursed. */
        if (nolimbs(g.youmonst && g.youmonst.data) && u.uamul
            && (u.uamul.otyp | 0) === AMULET_OF_UNCHANGING && u.uamul.cursed)
            return u.uamul;

        /* Check for welded weapon (primary hand). */
        if (_uwep_welded_dw() && ((ring === (u.uleft ? u.uleft : u.uright)) || bimanual(u.uwep)))
            return u.uwep;

        /* Check for cursed gloves. */
        if (u.uarmg && u.uarmg.cursed)
            return u.uarmg;

        /* Check if ring itself is cursed. */
        if (ring.cursed)
            return ring;

        /* Check for gloves and Glib (slipperiness). */
        if (u.uarmg && Glib_dw())
            return u.uarmg;
    }

    /* No obstruction found; ring can be removed. */
    return null;
}

export function doffing(otmp) {
    const g = game;
    g.u = g.u || {};
    const u = g.u;
    const what = ((g.context && g.context.takeoff && g.context.takeoff.what) || 0) | 0;
    let result = false;

    /* Import the WORN_* constants via computed values since they're not imported
     * at module level. Use the W_* constants directly. */
    const WORN_ARMOR_VAL = 0x00000001;   /* W_ARM */
    const WORN_SHIRT_VAL = 0x00000040;   /* W_ARMU */
    const WORN_CLOAK_VAL = 0x00000002;   /* W_ARMC */
    const WORN_BOOTS_VAL = 0x00000020;   /* W_ARMF */
    const WORN_HELMET_VAL = 0x00000004; /* W_ARMH */
    const WORN_GLOVES_VAL = 0x00000010; /* W_ARMG */
    const WORN_SHIELD_VAL = 0x00000008; /* W_ARMS */
    const WORN_AMUL_VAL = 0x00010000;   /* W_AMUL */
    const LEFT_RING_VAL = 0x00020000;   /* W_RINGL */
    const RIGHT_RING_VAL = 0x00040000;  /* W_RINGR */
    const WORN_BLINDF_VAL = 0x00080000; /* W_TOOL */
    const W_WEP_VAL = 0x00000100;
    const W_SWAPWEP_VAL = 0x00000400;
    const W_QUIVER_VAL = 0x00000200;

    /* afternmv tags — these are stored as string tags in g.afternmv. */
    const afternmv = g.afternmv || '';

    /* Check each worn slot and its corresponding *_off tag. */
    if (otmp === u.uarm)
        result = (afternmv === 'Armor_off' || what === WORN_ARMOR_VAL);
    else if (otmp === u.uarmu)
        result = (afternmv === 'Shirt_off' || what === WORN_SHIRT_VAL);
    else if (otmp === u.uarmc)
        result = (afternmv === 'Cloak_off' || what === WORN_CLOAK_VAL);
    else if (otmp === u.uarmf)
        result = (afternmv === 'Boots_off' || what === WORN_BOOTS_VAL);
    else if (otmp === u.uarmh)
        result = (afternmv === 'Helmet_off' || what === WORN_HELMET_VAL);
    else if (otmp === u.uarmg)
        result = (afternmv === 'Gloves_off' || what === WORN_GLOVES_VAL);
    else if (otmp === u.uarms)
        result = (afternmv === 'Shield_off' || what === WORN_SHIELD_VAL);
    /* these 1-turn items don't need 'ga.afternmv' checks */
    else if (otmp === u.uamul)
        result = (what === WORN_AMUL_VAL);
    else if (otmp === u.uleft)
        result = (what === LEFT_RING_VAL);
    else if (otmp === u.uright)
        result = (what === RIGHT_RING_VAL);
    else if (otmp === u.ublindf)
        result = (what === WORN_BLINDF_VAL);
    else if (otmp === u.uwep)
        result = (what === W_WEP_VAL);
    else if (otmp === u.uswapwep)
        result = (what === W_SWAPWEP_VAL);
    else if (otmp === u.uquiver)
        result = (what === W_QUIVER_VAL);

    return result;
}

function _Blind_dw() {
    const u = game.u;
    if (!u) return false;
    const bp = u.uprops && u.uprops[BLINDED_PROP];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
            && !(bp.blocked | 0);
}


function toggle_blindness_dw() {
    const g = game;
    g.disp = g.disp || {};
    g.disp.botl = 1;
    g.vision_full_recalc = 1;
    vision_recalc(0);
}

async function eyewear_on_msg(otmp) {
    if (!(game.flags && game.flags.verbose)) {
        const invlet = String.fromCharCode(otmp.invlet | 0);
        await pline(`${invlet} - ${(await doname(otmp))}.`);
        return;
    }
    const name = xname(otmp);
    const how = ((otmp.otyp | 0) === TOWEL_OTYP_DW)
        ? ` around your ${body_part(HEAD_DW)}` : '';
    await pline(`You are now wearing ${an(name)}${how}.`);
}

async function eyewear_off_msg(otmp) {
    /* C do_wear.c:69 — off_msg is `if (flags.verbose)`; see armor_off_msg. */
    if (!(game.flags && game.flags.verbose))
        return;
    await pline(`You were wearing ${(await doname(otmp))}.`);
}

export async function Blindf_on(otmp) {
    const already_blind = _Blind_dw();
    let changed = false;

    // C removes a wielded/quivered blindfold before putting it on.
    await remove_worn_item(otmp, false);
    await setworn(otmp, W_TOOL_C);
    await eyewear_on_msg(otmp);

    if (_Blind_dw() && !already_blind) {
        changed = true;
        await pline("You can't see any more.");
    } else if (already_blind && !_Blind_dw()) {
        changed = true;
        await pline('You can see!');
    }
    if (changed)
        toggle_blindness_dw();
}

export async function Blindf_off(otmp) {
    const g = game;
    const was_blind = _Blind_dw();
    let changed = false;

    if (!otmp) otmp = g.u?.ublindf;
    if (!otmp) return; /* C impossible("Blindf_off without eyewear?") */

    g.context = g.context || {};
    if (g.context.takeoff)
        g.context.takeoff.mask = (g.context.takeoff.mask | 0) & ~W_TOOL_C;
    await setworn(null, otmp.owornmask);
    // C clears the worn property before off_msg, but the physical status
    // remains blind until toggle_blindness requests its redraw. Preserve that
    // status in the message's flush snapshot, including involuntary removal.
    const savedFrameBlind = g._blindfoldOffFrameBlind;
    g._blindfoldOffFrameBlind = was_blind;
    try {
        await eyewear_off_msg(otmp);
    } finally {
        if (savedFrameBlind === undefined) delete g._blindfoldOffFrameBlind;
        else g._blindfoldOffFrameBlind = savedFrameBlind;
    }

    if (_Blind_dw()) {
        if (was_blind) {
            if ((otmp.otyp | 0) !== LENSES_OTYP_DW)
                await pline('You still cannot see.');
        } else {
            changed = true;
            await pline("You can't see anything now!");
        }
    } else if (was_blind) {
        changed = true;
        await pline('You can see again.');
    }
    if (changed)
        toggle_blindness_dw();
}

export const RIN_LEVITATION_OTYP = 183;
const RIN_INVISIBILITY_OTYP = 198;
const RIN_SEE_INVISIBLE_OTYP = 199;
const RIN_GAIN_STRENGTH_OTYP = 174;
const RIN_GAIN_CONSTITUTION_OTYP = 175;
const RIN_ADORNMENT_OTYP = 173;
const RIN_INCREASE_ACCURACY_OTYP = 176;
const RIN_INCREASE_DAMAGE_OTYP = 177;
const RIN_PROTECTION_OTYP = 178;
/* property-only / break-only rings: no immediate side effect on don
 * (RIN_TELEPORTATION..RIN_SUSTAIN_ABILITY all `break;` in C). */

const FLYING_PROP = 49; /* C prop.h FLYING — read by float_vs_flight. */
const STEALTH_PROP = 42; /* C prop.h STEALTH — read by steed_vs_stealth. */
/* Ensure a uprops[p] record exists (C's uprops[] is a dense array; the JS replay
 * stores it sparsely).  float_vs_flight() reads LEVITATION and FLYING without
 * guards, so both must be materialized before it runs. */
function ensure_uprop(p) {
    const u = game.u;
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[p])
        u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[p];
}
/* C ref: youprop.h:240 — Levitation = ((HLevitation || ELevitation) && !BLevitation).
 * HLevitation/ELevitation/BLevitation = u.uprops[LEVITATION].{intrinsic,extrinsic,blocked}. */
function uprop_levitation_record() {
    ensure_uprop(FLYING_PROP);
    return ensure_uprop(LEVITATION_PROP);
}
function Levitation() {
    const p = uprop_levitation_record();
    const FROMOUTSIDE = 0x04000000; /* W_ARTI not relevant; I_SPECIAL=0x4000 etc */
    const I_SPECIAL_BIT = 0x20000000;
    /* C: (HLevitation || ELevitation) && !BLevitation */
    return ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}

/* C youprop.h: Flying — active hero flying property. */
function Flying() {
    const p = ensure_uprop(FLYING_PROP);
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}

function learnring(ring, observed) {
    const ringtype = ring.otyp | 0;
    const g = game;
    g._oc_name_known = g._oc_name_known || {};
    if (observed) {
        if (g._oc_name_known[ringtype]) {
            /* observe_object(ring) — already typed; mark seen. RNG-free no-op
             * for the replay (no perm-invent window state we track). */
        } else if (ring.dknown) {
            /* makeknown(ringtype) = discover_object(x, TRUE, TRUE, TRUE). */
            discover_object(ringtype, true, true, true);
        }
    }
    const RIN_BASE = 173, RIN_LAST_CHARGED = 178;
    if (ring.dknown && g._oc_name_known[ringtype]) {
        if (ringtype >= RIN_BASE && ringtype <= RIN_LAST_CHARGED)
            ring.known = 1;
    }
}

function extremeattr_dw(which) {
    const g = game;
    const u = g.u || {};
    let lolimit = 3, hilimit = 25;
    if (which === A_STR) {
        hilimit = STR19(25);
        if (u.uarmg && (u.uarmg.otyp | 0) === GAUNTLETS_OF_POWER_OTYP_DW)
            lolimit = hilimit;
    }
    const curval = acurr(u, which);
    return curval === lolimit || curval === hilimit;
}
function adjust_attrib_dw(obj, which, val) {
    const g = game;
    const u = g.u || {};
    const oldAttrib = acurr(u, which);
    const di = C_ATTR_TO_DISP[which] ?? which;
    if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon.a) u.abon.a = [0, 0, 0, 0, 0, 0];
    u.abon.a[di] = (u.abon.a[di] | 0) + (val | 0);
    const observable = oldAttrib !== acurr(u, which);
    if (observable || !extremeattr_dw(which))
        learnring(obj, observable);
    if (g.disp) g.disp.botl = 1;
}

export async function float_up() {
    const u = game.u;
    ensure_uprop(LEVITATION_PROP);
    ensure_uprop(FLYING_PROP);
    ensure_uprop(STEALTH_PROP);
    /* SET_BOTL */
    if (game.disp) game.disp.botl = 1;
    if (u.utrap) {
        /* C trap.c:3937-3945 — a pit is cleared before the message, then the
         * vision flag and boulder-fill tail run.  reset_utrap(FALSE) is the
         * existing trap.js helper and does not recurse into float_up(). */
        if ((u.utraptype | 0) === TT_PIT) {
            await reset_utrap(false);
            await pline('You float up, out of the pit!');
            game.vision_full_recalc = 1;
            await fill_pit(u.ux | 0, u.uy | 0);
        } else if ((u.utraptype | 0) === TT_BEARTRAP
                   || (u.utraptype | 0) === TT_WEB) {
            // C trap.c:3963 compares utraptype with WEB (trap kind 7), not
            // TT_WEB (holding state 3), so this release uses its leg-stuck
            // fallback for both bear traps and webs. The C web witness
            // confirms that wording; float_vs_flight keeps ascent blocked.
            await pline(`You float up slightly, but your ${body_part(BP_LEG_DW)} is still stuck.`);
        }
        /* Other trapped float_up branches remain deferred below. */
    } else if (u.uinwater) {
        await spoteffects(true);
    } else if (u.uswallow) {
        /* swallowed branch — not reached. */
    } else if (u.uprops?.[HALLUC]?.intrinsic
               && !(u.uprops[HALLUC_RES]?.intrinsic || u.uprops[HALLUC_RES]?.extrinsic)) {
        /* C trap.c:3984-3985 */
        await pline("Up, up, and awaaaay!  You're walking on air!");
    } else {
        await pline('You start to float in the air!');
    }
    /* steed branch (u.usteed) — none. */
    /* Flying branch — not flying. */
    float_vs_flight();
    /* levitation gives maximum carrying capacity, so encumbrance state may
     * drop — encumber_msg() emits the load-change line. */
    await encumber_msg();
}

export async function Ring_on(obj) {
    const u = game.u;
    const otyp = obj.otyp | 0;
    const W_RING = 0x00060000;
    const oprop = MKOBJ_OC_OPROP[otyp] | 0;
    const prop = u.uprops?.[oprop];
    let oldprop = prop?.extrinsic | 0;
    if ((oldprop & W_RING) !== W_RING)
        oldprop &= ~W_RING;
    switch (otyp) {
        case RIN_SEE_INVISIBLE_OTYP: {
            set_mimic_blocking();
            see_monsters();
            const inv = u.uprops?.[INVIS_PROP];
            const invis = !!((inv?.intrinsic | 0) || (inv?.extrinsic | 0))
                && !(inv?.blocked | 0);
            const hSee = u.uprops?.[SEE_INVIS_PROP]?.intrinsic | 0;
            if (invis && !oldprop && !hSee && !_Blind_dw()) {
                newsym(u.ux | 0, u.uy | 0);
                await pline('Suddenly you are transparent, but there!');
                learnring(obj, true);
            }
            break;
        }
        case RIN_INVISIBILITY_OTYP: {
            const inv = u.uprops?.[INVIS_PROP];
            const hInvis = inv?.intrinsic | 0;
            const bInvis = inv?.blocked | 0;
            if (!oldprop && !hInvis && !bInvis && !_Blind_dw()) {
                learnring(obj, true);
                newsym(u.ux | 0, u.uy | 0);
                await self_invis_message();
            }
            break;
        }
        case RIN_LEVITATION_OTYP: {
            const p = uprop_levitation_record();
            /* C do_wear.c:1307: if (!oldprop && !HLevitation && !(BLevitation & FROMOUTSIDE)).
             * oldprop = the extrinsic BEFORE setworn masked off the new ring bit;
             * here the hero had no prior levitation so the float-up branch fires. */
            const FROMOUTSIDE = 0x04000000;
            const HLev = p.intrinsic | 0;
            const BLevFromOutside = (p.blocked | 0) & FROMOUTSIDE;
            /* oldprop: extrinsic minus the just-set ring mask (W_RING handling) */
            const oldprop = ((p.extrinsic | 0) & ~(obj.owornmask | 0));
            if (!oldprop && !HLev && !BLevFromOutside) {
                await float_up();
                learnring(obj, true);
                if (Levitation())
                    await spoteffects_for_levitation();
            } else {
                float_vs_flight();
            }
            break;
        }
        case RIN_GAIN_STRENGTH_OTYP:
            adjust_attrib_dw(obj, A_STR, obj.spe | 0);
            break;
        case RIN_GAIN_CONSTITUTION_OTYP:
            adjust_attrib_dw(obj, A_CON, obj.spe | 0);
            break;
        case RIN_ADORNMENT_OTYP:
            adjust_attrib_dw(obj, A_CHA, obj.spe | 0);
            break;
        case RIN_INCREASE_ACCURACY_OTYP:
            u.uhitinc = (u.uhitinc | 0) + (obj.spe | 0);
            break;
        case RIN_INCREASE_DAMAGE_OTYP:
            u.udaminc = (u.udaminc | 0) + (obj.spe | 0);
            break;
        case RIN_PROTECTION_OTYP: {
            const observable = (obj.spe | 0) !== 0;
            learnring(obj, observable);
            if (obj.spe | 0)
                find_ac();
            break;
        }
        default:
            break;
    }
}

/* C do_wear.c Ring_on(RIN_LEVITATION): check landing effects (including
 * sinks) without autopickup. */
async function spoteffects_for_levitation() {
    await spoteffects(false);
}




/* C do_wear.c:Amulet_on. Shared equipment bookkeeping is canonical; the
 * remaining effect/message body is still partial and duplicated by the
 * interactive accessory path above. It is not a completed Amulet_on port. */
export async function Amulet_on(obj) {
    if (!obj) return;
    const g = game, u = g.u || (g.u = {});
    await remove_worn_item(obj, false);
    await setworn(obj, W_AMUL_C);
    find_ac();
    if (g.disp) g.disp.botl = 1;
    /* C do_wear.c:1046-1054 — restful sleep changes the sleepy timeout only
     * when the new randomized nap is shorter than the existing one. */
    if ((obj.otyp | 0) === AMULET_OF_RESTFUL_SLEEP_DW) {
        if (!u.uprops) u.uprops = {};
        if (!u.uprops[SLEEPY_DW])
            u.uprops[SLEEPY_DW] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        const nap = rnd(98) + 2;
        const old = (u.uprops[SLEEPY_DW].intrinsic | 0) & TIMEOUT_DW;
        if (!old || nap < old)
            u.uprops[SLEEPY_DW].intrinsic =
                ((u.uprops[SLEEPY_DW].intrinsic | 0) & ~TIMEOUT_DW) | nap;
    }
}
/* C ref: do_wear.c:1539-1569 set_wear(obj) — if Null, do all worn items;
 * otherwise just obj. Sets gi.initial_don flag for the duration of the call.
 * The helper functions (Blindf_on, Ring_on, etc.) are called for the slots
 * that match the condition. RNG-free. */
export async function set_wear(obj) {
    const g = game;
    g.initial_don = !obj;  /* true if obj is null, false otherwise */
    const u = g.u || (g.u = {});

    /* if (!obj ? ublindf != 0 : (obj == ublindf)) */
    if (!obj ? (u.ublindf != null) : (obj === u.ublindf))
        await Blindf_on(u.ublindf);
    if (!obj ? (u.uright != null) : (obj === u.uright))
        await Ring_on(u.uright);
    if (!obj ? (u.uleft != null) : (obj === u.uleft))
        await Ring_on(u.uleft);
    if (!obj ? (u.uamul != null) : (obj === u.uamul))
        await Amulet_on(u.uamul);

    if (!obj ? (u.uarmu != null) : (obj === u.uarmu))
        Shirt_on();
    if (!obj ? (u.uarm != null) : (obj === u.uarm))
        await Armor_on();
    if (!obj ? (u.uarmc != null) : (obj === u.uarmc))
        await Cloak_on();
    if (!obj ? (u.uarmf != null) : (obj === u.uarmf))
        await Boots_on();
    if (!obj ? (u.uarmg != null) : (obj === u.uarmg))
        Gloves_on();
    if (!obj ? (u.uarmh != null) : (obj === u.uarmh))
        await Helmet_on();
    if (!obj ? (u.uarms != null) : (obj === u.uarms))
        Shield_on();

    g.initial_don = false;
}

/* C ref: do_wear.c:1573-1597 donning(otmp) — check if an object is being donned
 * (put on) by the 'W' or 'P' command.
 *
 *   boolean donning(struct obj *otmp)
 *   {
 *       boolean result = FALSE;
 *       if (doffing(otmp))
 *           result = TRUE;
 *       else if (otmp == uarm)
 *           result = (ga.afternmv == Armor_on);
 *       else if (otmp == uarmu)
 *           result = (ga.afternmv == Shirt_on);
 *       ...
 *       return result;
 *   }
 *
 * Port: Check if the object is being doffed first. If not, compare the object
 * against each worn slot and check whether the current afternmv tag matches the
 * corresponding *_on callback tag for that slot. RNG-free. */
export function donning(otmp) {
    const g = game;
    g.u = g.u || {};
    const u = g.u;
    let result = false;

    /* Check if the object is being doffed (takeoff-all or scheduled disrobe). */
    if (doffing(otmp))
        result = true;
    /* Check each worn slot and match against the *_on afternmv tag for that slot. */
    else if (otmp === u.uarm)
        result = (g.afternmv === 'Armor_on');
    else if (otmp === u.uarmu)
        result = (g.afternmv === 'Shirt_on');
    else if (otmp === u.uarmc)
        result = (g.afternmv === 'Cloak_on');
    else if (otmp === u.uarmf)
        result = (g.afternmv === 'Boots_on');
    else if (otmp === u.uarmh)
        result = (g.afternmv === 'Helmet_on');
    else if (otmp === u.uarmg)
        result = (g.afternmv === 'Gloves_on');
    else if (otmp === u.uarms)
        result = (g.afternmv === 'Shield_on');

    return result;
}

/* C ref: do_wear.c:1688 stop_donning().  An interrupted armor-on action has
 * already installed its item in a worn slot; cancel_don() alone leaves that
 * slot and its property active.  An interrupted armor-off action stays worn. */
export async function stop_donning(stolenobj = null) {
    const g = game;
    const u = g.u || (g.u = {});
    let otmp = null;
    for (let obj = g.invent || null; obj; obj = obj.nobj || null) {
        if (((obj.owornmask | 0) & W_ARMOR_C) && donning(obj)) {
            otmp = obj;
            break;
        }
    }
    if (!otmp)
        return 0;

    const puttingOn = !doffing(otmp);
    cancel_don();
    /* Do not let unmul dispatch the callback that was just interrupted. */
    g.afternmv = null;
    const silent = !puttingOn && otmp === stolenobj;
    const result = silent ? -(g.multi | 0) : 0;
    await unmul(silent ? ''
        : `You stop ${puttingOn ? 'putting on' : 'taking off'} ${thesimpleoname(otmp)}.`);

    /* C remove_worn_item(otmp,FALSE), on the armor-on path.  Dispatch the
     * canonical slot callback so per-otyp side effects stay in the shared
     * wear lifecycle; each callback clears its slot before its first await. */
    if (puttingOn) {
        if (otmp === u.uarm) await Armor_off();
        else if (otmp === u.uarmu) await Shirt_off();
        else if (otmp === u.uarmc) await Cloak_off();
        else if (otmp === u.uarmf) await Boots_off();
        else if (otmp === u.uarmh) await Helmet_off();
        else if (otmp === u.uarmg) await Gloves_off();
        else if (otmp === u.uarms) await Shield_off();
    }
    return result;
}


/* C ref: do_wear.c:1644-1660 cancel_doff(obj, slotmask) — bookkeeping when an
 * item is removed from a worn slot via setworn()/setnotworn().
 *   void cancel_doff(struct obj *obj, long slotmask)
 * Port: void; RNG-free. Uses donning() (local) and cancel_don() (steal.js). */
export function cancel_doff(obj, slotmask) {
    const g = game;
    g.context = g.context || {};
    g.context.takeoff = g.context.takeoff || {};
    const takeoff = g.context.takeoff;
    takeoff.mask = (takeoff.mask | 0);
    const I_SPECIAL = 0x20000000;

    if (!(takeoff.mask & I_SPECIAL) && donning(obj))
        cancel_don();
    takeoff.mask &= ~slotmask;
}


export function inaccessible_equipment(obj, verb, only_if_known_cursed) {
    const g = game;
    g.u = g.u || {};
    const u = g.u;

    /* obj is null → not inaccessible */
    if (!obj)
        return false;

    const isWorn = (obj === u.uarm || obj === u.uarmc || obj === u.uarmu ||
                    obj === u.uleft || obj === u.uright || obj === u.uarmg ||
                    obj === u.uarmh || obj === u.uarmf || obj === u.uarms);
    if (!isWorn)
        return false;

    /* BLOCKSACCESS macro expansion:
     * (anycovering || ((x)->cursed && (x)->bknown))
     * where anycovering = !only_if_known_cursed */
    const anycovering = !only_if_known_cursed;
    function blocksaccess(x) {
        if (!x) return false;
        return anycovering || ((x.cursed || false) && (x.bknown || false));
    }

    const need_to_take_off_outer_armor = 'need to take off %s to %s %s.';

    /* check for suit covered by cloak */
    if (obj === u.uarm && u.uarmc && blocksaccess(u.uarmc)) {
        if (verb) {
            /* C: Strcpy(buf, yname(uarmc)); You(fmt, buf, verb, yname(obj)); */
            You(need_to_take_off_outer_armor, yname(u.uarmc), verb, yname(obj));
        }
        return true;
    }

    /* check for shirt covered by suit and/or cloak */
    if (obj === u.uarmu && ((u.uarm && blocksaccess(u.uarm))
                             || (u.uarmc && blocksaccess(u.uarmc)))) {
        if (verb) {
            /* C do_wear.c:3369-3384 builds buf as
             *   yname(uarmc) [+ " and "] [+ (sameprefix ? xname : yname)(uarm)]
             * where sameprefix compares shk_your(uarmc) with shk_your(uarm).
             * KNOWN GAP: shk_your() is not ported (see yname above), so the
             * sameprefix test cannot be evaluated; both possessives come from
             * yname's carried/not-carried fallback, which agrees with C
             * whenever neither piece is shop- or monster-owned.  C draws no RNG
             * on any arm of this branch. */
            let buf = '';
            if (u.uarmc) buf += yname(u.uarmc);
            if (u.uarm && u.uarmc) buf += ' and ';
            if (u.uarm) buf += yname(u.uarm);
            You(need_to_take_off_outer_armor, buf, verb, yname(obj));
        }
        return true;
    }

    /* check for ring covered by gloves */
    if ((obj === u.uleft || obj === u.uright) && u.uarmg && blocksaccess(u.uarmg)) {
        if (verb) {
            /* C: Strcpy(buf, yname(uarmg)); You(fmt, buf, verb, yname(obj)); */
            You(need_to_take_off_outer_armor, yname(u.uarmg), verb, yname(obj));
        }
        return true;
    }

    /* item is not inaccessible */
    return false;
}

export function count_worn_armor() {
    const u = game.u;
    let ret = 0;
    if (u.uarm) ret++;
    if (u.uarmc) ret++;
    if (u.uarmh) ret++;
    if (u.uarms) ret++;
    if (u.uarmg) ret++;
    if (u.uarmf) ret++;
    if (u.uarmu) ret++;
    return ret;
}

/* C ref: do_wear.c:2630-2655 — some_armor: pick a random piece of armor from a monster. */
export function some_armor(victim) {
    const g = game;
    const u = g.u;
    const is_you = (victim === g.youmonst)
        || (g.youmonst && victim.m_id === g.youmonst.m_id);

    function which_armor_mon(mon, mask) {
        for (let obj = mon.minvent; obj; obj = obj.nobj) {
            if ((obj.owornmask | 0) & mask)
                return obj;
        }
        /* Fallback: global fobj chain (level.objlist).  Drop the where==3
           constraint — the reconstructed where may differ from the C value. */
        for (let obj = g.fobj; obj; obj = obj.nobj) {
            if (((obj.owornmask | 0) & mask)
                && (obj.ox | 0) === (mon.mx | 0)
                && (obj.oy | 0) === (mon.my | 0))
                return obj;
        }
        /* Fallback: player inventory (when victim is the hero but
           g.youmonst was not reconstructed). */
        for (let obj = g.invent; obj; obj = obj.nobj) {
            if ((obj.owornmask | 0) & mask)
                return obj;
        }
        return null;
    }

    let otmph = is_you ? u.uarmc : which_armor_mon(victim, W_ARMC);
    if (!otmph)
        otmph = is_you ? u.uarm : which_armor_mon(victim, W_ARM);
    if (!otmph)
        otmph = is_you ? u.uarmu : which_armor_mon(victim, W_ARMU);

    let otmp = is_you ? u.uarmh : which_armor_mon(victim, W_ARMH);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    otmp = is_you ? u.uarmg : which_armor_mon(victim, W_ARMG);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    otmp = is_you ? u.uarmf : which_armor_mon(victim, W_ARMF);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    otmp = is_you ? u.uarms : which_armor_mon(victim, W_ARMS);
    if (otmp && (!otmph || !rn2(4)))
        otmph = otmp;
    return otmph;
}

/* ── C ref: do_wear.c:3258-3273 obj_erode_type(struct obj *otmp) ──────────────
 *   if (is_flammable(otmp))       return ERODE_BURN;
 *   else if (is_rustprone(otmp))  return ERODE_RUST;
 *   else if (is_crackable(otmp))  return ERODE_CRACK;
 *   else if (is_rottable(otmp))   return ERODE_ROT;
 *   else if (is_corrodeable(otmp))return ERODE_CORRODE;
 *   return ERODE_NONE;
 * The predicate order is load-bearing: a leather (organic) suit is BOTH
 * flammable and rottable, and C's first-match ordering picks ERODE_BURN, which
 * is what produces "Your leather armor smoulders!" rather than "rots!".
 * RNG: none on any arm. */
function obj_erode_type(otmp) {
    if (is_flammable(otmp))
        return ERODE_BURN;
    else if (is_rustprone(otmp))
        return ERODE_RUST;
    else if (is_crackable(otmp))
        return ERODE_CRACK;
    else if (is_rottable(otmp))
        return ERODE_ROT;
    else if (is_corrodeable(otmp))
        return ERODE_CORRODE;
    return ERODE_NONE;
}

/* ── C ref: do_wear.c:3276-3315 destroy_arm(void) ─────────────────────────────
 *   int i, idx = 0, hits = rn2(4) + 1;
 *   ... gather worn armor into armors[] (uarm, uarmc, uarmh, uarms, uarmg,
 *       uarmf, uarmu — "include non-erodeable ones") ...
 *   if (!idx) return 0;
 *   for (i = 0; i < hits; i++) {
 *       otmp = armors[rn2(idx)];
 *       if (erosion_matters(otmp) && is_damageable(otmp) && !otmp->oerodeproof) {
 *           int erosion = obj_erode_type(otmp);
 *           if (erosion != ERODE_NONE) {
 *               int r = await erode_obj(otmp, xname(otmp), erosion, EF_PAY|EF_DESTROY);
 *               if (r != ER_NOTHING) ret = 1;
 *               if (r == ER_DESTROYED) break;
 *           }
 *       }
 *   }
 *   if (ret) stop_occupation();
 *   return ret;
 *
 * 5.0 renamed the scroll's effect: destroy_arm() now ERODES rather than
 * disintegrates (disintegrate_arm() below is the 3.7 behaviour, kept for the
 * cursed/blessed scroll arms and black-dragon breath).  Cardinal Rule 1: the
 * rn2(4) is inside the DECLARATION, so it is consumed BEFORE the armor gather
 * and therefore even when the hero wears nothing and the function returns 0.
 *
 * RNG (C order): rn2(4) once, then rn2(idx) once per hit.
 *
 * u.uarm/uarmc/... : C's worn slot IS the gi.invent node (worn.c:78 setworn).
 * This port still carries two representations for a worn slot on some paths
 * (see the note at _worn_invent_node above), and erode_obj's `uvictim` test
 * and `oeroded` bump both need the invent node, so each slot is resolved
 * through _worn_invent_node() with the u.<slot> value as the fallback.  That
 * resolution changes no count and no RNG argument: idx is the number of
 * occupied slots either way. */
export async function destroy_arm() {
    const u = game.u || {};
    const armors = [];
    let ret = 0;
    const hits = rn2(4) + 1;                    /* do_wear.c:3282 */

    /* gather worn armor; include non-erodeable ones (do_wear.c:3286-3292) */
    if (u.uarm) armors.push(_worn_invent_node(W_ARM) || u.uarm);
    if (u.uarmc) armors.push(_worn_invent_node(W_ARMC) || u.uarmc);
    if (u.uarmh) armors.push(_worn_invent_node(W_ARMH) || u.uarmh);
    if (u.uarms) armors.push(_worn_invent_node(W_ARMS) || u.uarms);
    if (u.uarmg) armors.push(_worn_invent_node(W_ARMG) || u.uarmg);
    if (u.uarmf) armors.push(_worn_invent_node(W_ARMF) || u.uarmf);
    if (u.uarmu) armors.push(_worn_invent_node(W_ARMU) || u.uarmu);
    const idx = armors.length;
    if (!idx)
        return 0;                               /* do_wear.c:3293-3294 */

    for (let i = 0; i < hits; i++) {
        const otmp = armors[rn2(idx)];          /* do_wear.c:3297 */

        if (erosion_matters(otmp) && is_damageable(otmp) && !otmp.oerodeproof) {
            const erosion = obj_erode_type(otmp);

            if (erosion !== ERODE_NONE) {
                const r = await erode_obj(otmp, xname(otmp), erosion, EF_PAY | EF_DESTROY);

                if (r !== ER_NOTHING)
                    ret = 1;
                if (r === ER_DESTROYED)
                    break;
            }
        }
    }

    if (ret)
        await stop_occupation();
    return ret;
}

/* ── C ref: do_wear.c:3182-3193 maybe_destroy_armor() ─────────────────────────
 *   if ((armor != 0) && (!atmp || atmp == armor)
 *       && ((*resisted = obj_resists(armor, 0, 90)) == FALSE)) {
 *       armor->in_use = 1;
 *       return armor;
 *   }
 *   return (struct obj *) 0;
 * RNG: obj_resists draws rn2(100) for every non-unique candidate, and the &&
 * short-circuit means it is NOT drawn when `armor` is absent or `atmp` names a
 * different piece.  `resisted` is C's out-parameter; the JS shape is a
 * one-field box, the convention this tree already uses (js/cmd.js noveltitle).
 */
function maybe_destroy_armor(armor, atmp, resistedBox) {
    if (armor && (!atmp || atmp === armor)
        && ((resistedBox.value = obj_resists(armor, 0, 90)) === false)) {
        armor.in_use = 1;
        return armor;
    }
    return null;
}

/* ── C ref: do_wear.c:3140-3182 wornarm_destroyed(struct obj *wornarm) ────────
 * take off the specific worn object and, if it still exists after that,
 * destroy it.  RNG: none directly; the *_off callbacks are bookkeeping. */
async function wornarm_destroyed(wornarm) {
    const g = game, u = g.u || {};
    const wornoid = wornarm.o_id;

    /* cancel_don() resets 'afternmv' when appropriate but doesn't reset
       uarmc/uarm/&c so doing this now won't interfere with the tests below. */
    if (donning(wornarm))
        cancel_don();

    if (wornarm === u.uarmc) await Cloak_off();
    else if (wornarm === u.uarm) await Armor_off();
    else if (wornarm === u.uarmu) await Shirt_off();
    else if (wornarm === u.uarmh) await Helmet_off();
    else if (wornarm === u.uarmg) await Gloves_off();
    else if (wornarm === u.uarmf) await Boots_off();
    else if (wornarm === u.uarms) await Shield_off();

    /* 'wornarm' might be destroyed as a side-effect of xxx_off(), so scan
       invent instead of testing where==OBJ_INVENT; verify o_id too. */
    for (let invobj = g.invent, nextobj; invobj; invobj = nextobj) {
        nextobj = invobj.nobj;
        if (invobj === wornarm && invobj.o_id === wornoid) {
            await useup(wornarm);
            break;
        }
    }
}

export async function disintegrate_arm(atmp) {
    const u = game.u || {};
    let otmp = null;
    let losing_gloves = false;
    const resisted = { value: false },
          resistedc = { value: false },
          resistedsuit = { value: false };

    if ((otmp = maybe_destroy_armor(u.uarmc, atmp, resistedc)) !== null) {
        /* cloak/robe/apron/smock (ID'd apron)/wrapping */
        await urgent_pline(`Your ${cloak_simple_name_obj(otmp)} crumbles and turns to dust!`);
    } else if (!resistedc.value
               && (otmp = maybe_destroy_armor(u.uarm, atmp, resistedsuit)) !== null) {
        const suit = suit_simple_name_obj(otmp);

        /* C do_wear.c:3224: stop a lit suit shining before announcing
         * its destruction, so Armor_off cannot report the light afterward. */
        if (otmp.lamplit)
            end_burn(otmp, false);
        /* suit might be "dragon scales", so C uses vtense() for both verbs */
        await urgent_pline(`Your ${suit} ${vtense(suit, 'turn')} to dust and ${vtense(suit, 'fall')} to the ${surface(u.ux, u.uy)}!`);
    } else if (!resistedc.value && !resistedsuit.value
               && (otmp = maybe_destroy_armor(u.uarmu, atmp, resisted)) !== null) {
        await urgent_pline(`Your ${shirt_simple_name_obj(otmp)} crumbles into tiny threads and falls apart!`);
    } else if ((otmp = maybe_destroy_armor(u.uarmh, atmp, resisted)) !== null) {
        await urgent_pline(`Your ${helm_simple_name_obj(otmp)} turns to dust and is blown away!`);
    } else if ((otmp = maybe_destroy_armor(u.uarmg, atmp, resisted)) !== null) {
        await urgent_pline(`Your ${gloves_simple_name_obj(otmp)} vanish!`);
        losing_gloves = true;
    } else if ((otmp = maybe_destroy_armor(u.uarmf, atmp, resisted)) !== null) {
        await urgent_pline(`Your ${boots_simple_name_obj(otmp)} disintegrate!`);
    } else if ((otmp = maybe_destroy_armor(u.uarms, atmp, resisted)) !== null) {
        await urgent_pline(`Your ${shield_simple_name_obj(otmp)} crumbles away!`);
    } else {
        return 0; /* could not destroy anything */
    }

    /* cancel_don() if applicable, Cloak_off()/Armor_off()/&c, and useup() */
    await wornarm_destroyed(otmp);
    /* glove loss means wielded weapon will be touched */
    if (losing_gloves)
        await selftouch('You');

    await stop_occupation();
    return 1;
}

/* ── C ref: do_wear.c:3479-3486 any_worn_armor_ok(obj) ────────────────────────
 * getobj classifier for the blessed destroy-armor scroll: suggest any worn
 * armor, even if covered by other armor.  RNG: none. */
export function any_worn_armor_ok(obj) {
    const W_ARMOR_ALL = W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF | W_ARMU;
    if (obj && ((obj.owornmask | 0) & W_ARMOR_ALL))
        return GETOBJ_SUGGEST_DW;
    return GETOBJ_EXCLUDE_DW;
}

/* ── C ref: do_wear.c:3020-3040 cancel_don(void) ──────────────────────────────
 *   svc.context.takeoff.cancelled_don = (ga.afternmv == Cloak_on || ... );
 *   ga.afternmv = 0; gn.nomovemsg = 0; gm.multi = 0;
 *   svc.context.takeoff.delay = 0; svc.context.takeoff.what = 0L;
 * The piece of armor being donned/doffed has vanished, so stop wasting time on
 * it.  This port stores ga.afternmv as a string tag (ARMCAT_TO_AFTERNMV_ON
 * above), so the seven function-pointer comparisons become one membership test
 * against that same table.  RNG: none.  Was a throw-stub in js/polyself.js and
 * js/steal.js; its home is do_wear.c, so the body lives here. */
export function cancel_don() {
    const g = game;
    g.context = g.context || {};
    g.context.takeoff = g.context.takeoff || {};
    g.context.takeoff.cancelled_don = ARMCAT_TO_AFTERNMV_ON.includes(g.afternmv);
    g.afternmv = null;
    g.nomovemsg = null;
    g.multi = 0;
    g.context.takeoff.delay = 0;
    g.context.takeoff.what = 0;
}


export async function You(line, ...args) {
    return pline('You ' + _plineVFmt(line, args));
}

export async function Your(line, ...args) {
    return pline('Your ' + _plineVFmt(line, args));
}

export function yname(obj) {
    let owned = !!obj && (obj.where | 0) === 3;
    if (obj && !owned) {
        for (let o = game.invent; o; o = o.nobj) {
            if (o === obj) { owned = true; break; }
        }
    }
    /* C shk.c:5871,5899-5905 mon_owns(): an object in a monster's minvent is
     * "<monster>'s " (s_suffix(y_monnam(obj->ocarry))), not "the ". */
    if (!owned && obj && (obj.where | 0) === 4 /* OBJ_MINVENT */ && obj.ocarry)
        return s_suffix(y_monnam(obj.ocarry)) + ' ' + cxname(obj);
    return (owned ? 'your ' : 'the ') + cxname(obj);
}
export { xname };
export function shk_your(obj) {
    const carried = !!obj && ((obj.where | 0) === 3
        || obj === game.invent
        || (() => {
            for (let o = game.invent; o; o = o.nobj)
                if (o === obj) return true;
            return false;
        })());
    return carried ? 'your ' : 'the ';
}
/* C do_wear.c:60-65 — describe the fingers, or the worn gloves when requested. */
export function fingers_or_gloves(check_gloves) {
    const uarmg = game.u?.uarmg || null;
    if (check_gloves && uarmg)
        return gloves_simple_name(armorRow(uarmg), uarmg);
    return makeplural(body_part(FINGER));
}
