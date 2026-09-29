import { spoteffects } from './landing-effects.js';
// do_wear.c — wearing / taking off worn objects; armor-class calculation.
// C ref: do_wear.c — find_ac (line 2472).
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).
import { game } from './gstate.js';
import { setworn, setnotworn } from './worn.js';
import { impossible as equipment_impossible } from './pline.js';
import { end_burn } from './timeout.js';
/* C ref: do_wear.c:2476 mons[u.umonnum].ac — the mons pack carries lvl/mr/mov
 * but not ac; js/makemon_ac.json is generated from monsters.h LVL() by
 * scripts/gen-mons-ac.mjs, aligned to the same mndx order. */
import monAcPack from './makemon_ac.json' with { type: 'json' };
const MONS_AC = monAcPack.ac;
/* C mons[] rows (permonst); row[6] = mflags1.  Imported as a raw data pack for
 * the same reason monAcPack is — do_wear.js is already inside makemon.js's
 * import cycle (makemon.js imports xname from here). */
import monsPackDw from './makemon_mons.json' with { type: 'json' };
const MONS_DW = /** @type {number[][]} */ (monsPackDw.mons);
/* C permonst.msize (MZ_*) per MON() row order — the same generated pack
 * js/makemon.js:58 reads (scripts/gen-mons-msize.mjs).  canwearobj's
 * verysmall()/WrappingAllowed() guards are msize tests, and MONS_DW carries no
 * msize column. */
import monMsizePackDw from './makemon_msize.json' with { type: 'json' };
const MONS_MSIZE_DW = /** @type {number[]} */ (monMsizePackDw.msize);
/* C permonst.mflags1 for the hero's CURRENT form (gy.youmonst.data).  Prefer
 * the live youmonst.data (polyself.js / the capture reconstructor set it), else
 * resolve u.umonnum — u_init.c:991 sets u.umonnum = u.umonster = gu.urole.mnum
 * and polyself keeps it current (same resolution find_ac uses for MONS_AC). */
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
import { flush_screen, _topline_more_pending } from './display.js';
import { _topl_merge_result, _topl_joins_snapshot, _topl_record_join } from './display.js';
import { nhgetch } from './input.js';
import { nomul, unmul, stop_occupation } from './allmain.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { discover_object } from './o_init.js';
import { exercise, change_luck, acurr, C_ATTR_TO_DISP } from './attrib.js';
import { STR19, PROTECTION, INTRINSIC } from './const.js';
import { PM_ARCHEOLOGIST, PM_HOBBIT, PM_MARILITH, PM_WINGED_GARGOYLE } from './pm.generated.js';
import { float_vs_flight, breakarm, num_horns, obj_pmname } from './mhitm.js';
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
/* C hack.h:511-538 `enum getobj_callback_returns`:
 *   GETOBJ_EXCLUDE = -3, GETOBJ_EXCLUDE_NONINVENT = -2,
 *   GETOBJ_EXCLUDE_INACCESS = -1, GETOBJ_EXCLUDE_SELECTABLE = 0,
 *   GETOBJ_DOWNPLAY = 1, GETOBJ_SUGGEST = 2.
 * SEPARATE FINDING, deliberately NOT fixed here: js/const.js:1957-1962 exports
 * this enum as 0/1/2/3/4/5, so four of its six members carry a value C never
 * uses, and js/cmd.js:9385 keeps its own file-local copy with the same wrong
 * EXCLUDE.  Re-basing that shared enum inverts every `if (!ok(obj))`-shaped
 * caller in js/cmd.js (0 is falsy, -3 is not), which is a measured-and-scored
 * change of its own and is not in this target's scope.  The two members this
 * file needs are spelled with C's values and C's citation, the same way
 * js/cmd.js:29828 already spells any_obj_ok's pair. */
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
/* C rm.h W_SADDLE — the worn-mask bit float_down's message gate tests. */
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
/* C ref.c cmd.js:1638 trycall(obj) — do_call.c's "call an object type" prompt,
 * gated on the type being unnamed/uncalled.  Reused rather than duplicated: see
 * the `welded`/`useup` imports above for the established cross-file pattern. */
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
    /* C polyself.c:290 `u.umonnum = u.umonster;` — a faithful no-op while not
     * polymorphed (u.umonster is the hero's fixed ROLE base form; u_init.c:991
     * sets u.umonnum = u.umonster = gu.urole.mnum once at game start and
     * u.umonster never changes after — the SAME invariant js/uhitm.js's abon()
     * already relies on, deriving it from game.urole.mnum because no capture
     * carries a separate u.umonster side-channel). Reading the bare
     * `u.umonster` field here always evaluated to `undefined | 0 === 0` in
     * replay (that field is never seeded), so this line CORRUPTED
     * hero.umonnum from its real value to 0 on every non-polymorphed call.
     * MEASURED doputon rec#17 (a worn amulet of change, non-polymorphed hero,
     * role.mnum/hero.umonnum both 331): C's assignment is 331 -> 331; this
     * port wrote 331 -> 0. Prefer the real field when it IS live (the scored
     * path sets it at chargen and never touches it again), else the
     * game.urole.mnum invariant, else leave umonnum as its current value —
     * the correct no-op when nothing else is known. */
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
import { W_TOOL as W_TOOL_C, HEAD as HEAD_DW } from './const.js';
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
/* C ref: hack.h:1531 — ARM_BONUS(obj):
 *   objects[obj->otyp].a_ac + obj->spe
 *     - min((int)greatest_erosion(obj), objects[obj->otyp].a_ac)
 *
 * The a_ac term is indexed BY OTYP out of the objects[] table (objclass.h:99,
 * 102 — a_ac is the oc_oc1 union slot); it is never a per-object field in C.
 * This port used to read only `obj.a_ac`, a value the SYNTHETIC records
 * precompute (js/u_init.js iniInvWornArmor, js/mapstate_game_bridge.js
 * applyWornToGame).  A REAL struct obj — a wished dragon scale mail, anything
 * picked up and worn — carries no such field, so `obj.a_ac | 0` was 0 and the
 * piece's entire AC contribution silently vanished (seed0364 step 142: C
 * "AC:-4" vs JS "AC:5", exactly the orange DSM's a_ac of 9).  Resolve it from
 * the generated objects.h table, as C does, and keep obj.a_ac only for a
 * record whose otyp has no ARMOR_CLASS row at all.
 *
 * At post_init, freshly-spawned armor has no erosion (oeroded=oeroded2=0),
 * so greatest_erosion(obj) == 0 and the min() term is 0.  (obj.oeroded||0) +
 * (obj.oeroded2||0) stands in as the erosion proxy for forward compatibility
 * when a real erosion model lands.
 */
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
    /* Pull erosion from the invent node too — see _worn_invent_node.  Without
     * this a fire ray that scorched the hero's worn cloak left AC unchanged:
     * seed5500 step 832 onward, C "AC:10" vs JS "AC:9" for 79 captured frames.
     * Deliberately NOT extended to `spe`: seed0365 step 147's enchant-armor
     * scroll writes +4 to the stand-in only, and reading spe off the invent node
     * instead loses it (measured: 147-151 flip from pass to fail).  Merging the
     * two records is the real fix and belongs in u_init.js, out of scope here. */
     // PARKED-NOTE: session=seed5500,seed0365 citation-only
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
/* C ref: do_wear.c:567-573 hard_helmet() — hard helms provide better protection
 * against falling rocks. Returns TRUE if obj is a metallic or crackable helmet.
 * C source:
 *   boolean hard_helmet(struct obj *obj)
 *   {
 *       if (!obj || !is_helmet(obj))
 *           return FALSE;
 *       return (is_metallic(obj) || is_crackable(obj)) ? TRUE : FALSE;
 *   }
 * Port: check oclass==ARMOR_CLASS as proxy for is_helmet; the full is_helmet
 * macro also checks oc_armcat==ARM_HELM but captured obj records all have
 * oclass==ARMOR_CLASS for armor objects. */
export function hard_helmet(obj) {
    if (!obj || (obj.oclass | 0) !== ARMOR_CLASS)
        return false;
    return isMetallic(obj) || isCrackable(obj);
}
/* C ref: do_wear.c:3014-3019 reset_remarm() — clear saved context to avoid
 * inappropriate resumption of interrupted 'A' (doremarm/takeoff-all).
 * C source:
 *   void reset_remarm(void)
 *   {
 *       svc.context.takeoff.what = svc.context.takeoff.mask = 0L;
 *       svc.context.takeoff.disrobing[0] = '\0';
 *   }
 * Port: clears g.context.takeoff state fields. RNG-free, no observable
 * state_after_diff in the capture oracle (this is internal bookkeeping). */
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
/* Worn-armor metadata: oc_delay (take-off / put-on delay), oc_armcat and
 * oc_material for every ARMOR_CLASS otyp.  These used to be a hand-transcribed
 * literal covering only the starter pieces; four of its cells had drifted from
 * C (LEATHER_ARMOR 0 vs 3, ROBE 5 vs 0, CLOAK_OF_DISPLACEMENT 1 vs 0,
 * HAWAIIAN_SHIRT 10 vs 0), and since armoroff()/armoron() BRANCH on oc_delay,
 * each wrong cell silently added or deleted whole game turns.  js/armor_data.js
 * is now generated straight from the C objects table
 * (tools/gen-armor-data.mjs) and gated by tools/oc-delay-parity.mjs, so the
 * transcription step — and its whole defect class — is gone.
 *
 * Records reach here two ways: real gi.invent objects (js/u_init.js
 * _adjust_and_addinv_ini, readobjnam/mksobj wishes) carry a NUMERIC otyp, while
 * the legacy iniInvWornArmor() synthetic u.u* records carry the SYMBOLIC name
 * ("LEATHER_ARMOR").  Both resolve to the same generated row. */
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

/* ---- the *_simple_name family (objnam.c:5432-5601) ---------------------
 * armoroff()/armoron() build their nomovemsg from armor_simple_name()'s
 * per-category helper ("You finish taking off your <what>."), so these are
 * screen-channel-load-bearing, not cosmetic.
 *
 * DUPLICATION, DELIBERATE AND TEMPORARY — js/objnam.js also exports a
 * *_simple_name family, but its armor_simple_name() cannot be called here yet:
 *   - its dispatch switch transliterated C's CASE ORDER as the armcat ordinals,
 *     so ARM_SHIELD(1) and ARM_CLOAK(5) are SWAPPED; a cloak therefore reaches
 *     shield_simple_name(), which is still a `throw new Error('not yet ported')`
 *     stub (js/objnam.js:2612) — i.e. it throws on every cloak;
 *   - its suit_simple_name() tests dragon SCALES as otyp 89-98, which is the
 *     HELM range (scales are 111-120, mail 101-110);
 *   - its name lookups go through getObjName(), which returns null for most
 *     armor otyps, so "ring mail" silently degrades to "suit" instead of "mail".
 * The version here is backed by js/armor_data.js (the generated C table), so it
 * has the real names, armcats and materials.  UNIFY the two when
 * port-gen-armor_simple_name-001 lands the objnam.js side behind its
 * capture-replay sweep; this file should then import from there. */

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
            return (obj?.oc_name_known && obj?.dknown) ? 'smock' : 'apron';
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
        const visible = obj?.oc_name_known ? row.name : row.descr;
        if (visible && visible.includes('gauntlets')) return 'gauntlets';
    }
    return 'gloves';
}
/* C ref: objnam.c:5548 boots_simple_name(boots) — "shoes" when the description
 * contains "shoes", or the actual name does and the type is known. */
function boots_simple_name(row, obj) {
    if (row && obj?.dknown) {
        if (row.descr && row.descr.includes('shoes')) return 'shoes';
        if (obj?.oc_name_known && row.name && row.name.includes('shoes'))
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
/* Donning afternmv tags (the put-on counterpart).  C ref: do_wear.c:2379-2394 —
 * accessory_or_armor_on sets ga.afternmv = Armor_on / Helmet_on / Gloves_on /
 * Boots_on / Shield_on / Cloak_on / Shirt_on selected by which u.* slot the
 * object was just setworn() into.  Indexed by oc_armcat (same order as
 * ARMCAT_TO_SLOT).  All *_on callbacks are RNG-free AC/intrinsic recomputes for
 * the starter (non-artifact, non-dragon) armor in the corpus (verified Armor_on
 * do_wear.c:887-906 — 0 RNG call-sites via cref-extract). */
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
/* C ref: do_wear.c:1006-1063 Helmet_off() — the per-otyp switch runs BEFORE the
 * shared `setworn((struct obj *) 0, W_ARMH)` tail, so it still reads uarmh.
 * Only the FEDORA arm is ported, mirroring Helmet_on() above (do_wear.c:432):
 *
 *     case FEDORA:
 *         if (Role_if(PM_ARCHEOLOGIST)) change_luck(-1);
 *         break;
 *
 * It is the exact inverse of the +1 Helmet_on grants, and WITHOUT it an
 * Archeologist who takes her fedora off keeps Luck 1 forever.  That is not a
 * cosmetic drift: nh_timeout (timeout.c:603-604) computes
 * `baseluck += 1` only while `Role_if(PM_ARCHEOLOGIST) && uarmh
 * && uarmh->otyp == FEDORA`, so with the hat off C's baseluck is 0 and u.uluck
 * times out to 0 — while this port sat at 1 with nothing to pull it back.  A
 * nonzero Luck makes rnl(x) DRAW: rnd.c:225 `if (adjustment && rn2(37 +
 * abs(adjustment)))` is an extra rn2 C never fires at Luck 0.  seed0361 takes
 * the fedora off at step 15 ("Tc") and diverges 7,900 leaves later on the first
 * rnl in the run — doopen_indir's rnl(20) (lock.c:905), where C logs one leaf
 * and this port logged rn2(38) first.
 *
 * The remaining arms (DUNCE_CAP disp.botl, HELM_OF_TELEPATHY/
 * HELM_OF_CAUTION's early return through see_monsters, HELM_OF_BRILLIANCE's
 * adj_abon, HELM_OF_OPPOSITE_ALIGNMENT's uchangealign) reach helpers this port
 * does not have and no corpus session wears those helmets — deferred, not
 * guessed, exactly as Helmet_on defers them. */
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
            await pline('Sure, you are noisy.');
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
    /* do_wear.c:392 switch (otyp) — only the types with a removal effect.  The
     * plain cloaks (orcish/dwarvish/protection/magic resistance/oilskin/robe/
     * leather) break with no effect.  Elven cloak (toggle_stealth), mummy
     * wrapping and cloak of invisibility are not reached by the corpus 'T'
     * steps and are left to their own ports. */
    if (otyp === CLOAK_OF_DISPLACEMENT_OTYP || otyp === 'CLOAK_OF_DISPLACEMENT')
        await toggle_displacement(otmp, oldprop, false);
    return 0;
}
/* C ref: do_wear.c:887 Armor_on() and the sibling *_on functions — the donning
 * afternmv callbacks.  By the time these fire, accessory_or_armor_on has already
 * called setworn(obj, mask) (do_wear.c:2377), so the slot is occupied; the
 * callback's remaining job is the AC/intrinsic recompute.  For the starter armor
 * pieces in the corpus each *_on is pure bookkeeping:
 *   Armor_on  (do_wear.c:887): set uarm->known, dragon_armor_handling, arti light
 *   Helmet_on/Gloves_on/Boots_on/Shield_on/Cloak_on/Shirt_on: intrinsic side
 *     effects (e.g. Boots_on speed/levitation, Gloves_on fumbling) that are all
 *     no-ops for the plain starter pieces.
 * All are RNG-free (verified Armor_on do_wear.c:887-906 — 0 rn2/rnd via
 * cref-extract).  We recompute u.uac via find_ac() and return 0 like the C
 * callbacks.  When the per-slot intrinsics/light/dragon handling is needed by a
 * later corpus session, extend the matching callback. */
function don_slot(_slot) {
    /* C ref: every one of the five *_on callbacks this helper stands in for ends
     * with the SAME tail, immediately after its per-otyp switch:
     *   Armor_on   do_wear.c:891  if (!uarm->known)  { uarm->known = 1;  ... }
     *   Cloak_on   do_wear.c:375  if (uarmc && !uarmc->known) { uarmc->known = 1; ... }
     *   Helmet_on  do_wear.c:510  if (uarmh && !uarmh->known) { uarmh->known = 1; ... }
     *   Gloves_on  do_wear.c:598  if (!uarmg->known) { uarmg->known = 1; ... }
     *   Shield_on  do_wear.c:725  if (!uarms->known) { uarms->known = 1; ... }
     *   Shirt_on   do_wear.c:770  if (!uarmu->known) { uarmu->known = 1; ... }
     * — "the +/- is evident because of the status line AC": donning any armor
     * reveals its enchantment, because the hero can read the AC change off the
     * bottom line.  Boots_on already ports its copy (do_wear.c:255, above); this
     * helper dropped the other six, so a worn piece kept known=0 and doname()
     * printed it without its spe.  seed0014 step 126: the -4 orcish helm the hero
     * has just finished donning lists as "an orcish helm" where C lists
     * "a -4 orcish helm".  update_inventory() is the persistent-inventory-window
     * refresh, a no-op on tty.  RNG-free. */
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
/* C ref: do_wear.c:797-882 dragon_armor_handling(otmp, puton, on_purpose) —
 * "handle extra abilities for hero wearing dragon scale armor".
 *
 * Dragon scale mail's oc_oprop is its RESISTANCE (objects.h:521: blue is
 * SHOCK_RES), so setworn() confers only that; every OTHER property a DSM grants
 * is set here, by hand, on the W_ARM bit.  This function was not ported at all
 * and Armor_on()/Armor_off() did not call it, so a hero in blue dragon scale
 * mail was never Fast, one in orange never had Free_action, and so on.
 *
 * Corpus witness: seed0367-priest-quest-tour step 141 (PUBLIC).  The hero
 * finishes donning wished blue dragon scale mail and C's topline reads
 *     "You finish your dressing maneuver.  You speed up."
 * where this port stopped at "You finish your dressing maneuver."
 * gen030-reseed-seed1082511 is its reseed twin and reaches the same code.
 *
 * RNG-FREE: none of the eleven arms draws rn2/rnd in C.
 *
 * Two arms are DEFERRED rather than guessed, and say so:
 *   - GOLD: `make_hallucinated(!puton, ..., W_ARM)` (potion.c:2401 here).
 *     js/do_wear.js has no import edge to js/potion.js and adding one for an
 *     unwitnessed arm is not worth a new module cycle.
 *   - YELLOW on REMOVAL: the two `wielding_corpse()` calls (do_wear.c:867-868),
 *     which can kill the hero; wielding_corpse is not ported anywhere in js/.
 *     The EStone_resistance clear itself IS ported.
 * Both are unreached by anything measured; a session that hits one diverges on
 * state, not on the leaf stream.
 */
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
    /* u.uprops is a SPARSE object in this port — a slot exists only once
     * something has written it — so the record must be created on demand, the
     * same idiom setworn_armor() uses (do_wear.js:1421).  Reading it and
     * returning early instead would make the whole function a silent no-op for
     * exactly the properties a DSM is the FIRST writer of, which is all of
     * them: seed0367's `EFast |= W_ARM` landed nowhere, so u_calc_moveamt
     * (allmain.c:127) still saw a non-Fast hero and skipped C's rn2(3). */
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
/* C ref: do_wear.c:432 Helmet_on(void) — per-otyp switch on uarmh->otyp.
 * FEDORA/PM_ARCHEOLOGIST is the only case that consumes replay-visible state
 * (change_luck); the remaining cases (HELM_OF_CAUTION/BRILLIANCE/
 * HELM_OF_OPPOSITE_ALIGNMENT/DUNCE_CAP) reach unported helpers (see_monsters
 * side effects, ABON/uchangealign/curse) not exercised by the corpus for this
 * function and are deferred rather than guessed. */
const FEDORA_OTYP = 92, CORNUTHAUM_OTYP = 93;
export function Helmet_on() {
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
    return don_slot('uarmh');
}
/* Gloves_on's real body (with C's per-otyp switch) is below, beside Cloak_on. */
/* C ref: do_wear.c:186-257 Boots_on(void) — the donning afternmv for the boots
 * slot.  setworn() already ran (accessory_or_armor_on, do_wear.c:2377), so
 * uarmf is set and its extrinsic property is already conferred; oldprop is the
 * property the hero had from OTHER sources, with the boots' own bit stripped.
 *
 *   long oldprop = u.uprops[objects[uarmf->otyp].oc_oprop].extrinsic
 *                  & ~WORN_BOOTS;
 *   switch (uarmf->otyp) {
 *   case LOW_BOOTS: case IRON_SHOES: case HIGH_BOOTS:
 *   case JUMPING_BOOTS: case KICKING_BOOTS:  break;
 *   case SPEED_BOOTS:
 *       if (!oldprop && !(HFast & TIMEOUT)) {
 *           makeknown(uarmf->otyp);
 *           You_feel("yourself speed up%s.", (oldprop || HFast) ? " a bit more" : "");
 *       }
 *       break;
 *   ...
 *   }
 *   if (uarmf && !uarmf->known) { uarmf->known = 1; update_inventory(); }
 *
 * seed0360 step 137: the wished speed boots finish donning and C emits
 * "You feel yourself speed up." joined onto the nomovemsg topline.  RNG-free.
 * The WATER_WALKING_BOOTS (spoteffects), ELVEN_BOOTS (toggle_stealth),
 * FUMBLE_BOOTS (incr_itimeout(rnd(20))) and LEVITATION_BOOTS (float_up)
 * branches reach unported helpers and are deferred rather than guessed — none
 * is reached by the corpus.  Async because the SPEED_BOOTS feedback is a
 * pline; afternmv_dispatch (allmain.js) already awaits its callbacks. */
 // PARKED-NOTE: session=seed0360 citation-only
const LOW_BOOTS_OTYP = 163, IRON_SHOES_OTYP = 164, HIGH_BOOTS_OTYP = 165;
const SPEED_BOOTS_OTYP = 166, JUMPING_BOOTS_OTYP = 168, KICKING_BOOTS_OTYP = 170;
const WATER_WALKING_BOOTS_OTYP_DW = 167;
export const ELVEN_BOOTS_OTYP_DW = 169, LEVITATION_BOOTS_OTYP_DW = 172;
/* Resolved against the recorded binary with `node tools/c-const-oracle.mjs`,
 * not guessed: FUMBLE_BOOTS 171 (WATER_WALKING_BOOTS 167, ELVEN_BOOTS 169,
 * LEVITATION_BOOTS 172 for the arms still deferred below). */
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
                /* hack.h:1535 — makeknown(x) = discover_object(x, TRUE, TRUE, TRUE).
                 * The 4th arg (credit_hero) is RNG-LOAD-BEARING: o_init.c:482
                 * exercises A_WIS, which draws rn2(19) @ attrib.c:509.  seed0360
                 * step 137 is exactly that call, sequenced between unmul()'s
                 * nomovemsg pline and the You_feel below. */
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
            /* C do_wear.c:231-234:
             *     case FUMBLE_BOOTS:
             *         if (!oldprop && !(HFumbling & ~TIMEOUT))
             *             incr_itimeout(&HFumbling, rnd(20));
             *         break;
             * HFumbling is u.uprops[FUMBLING].intrinsic; `& ~TIMEOUT` is its
             * SOURCE bits (FROMOUTSIDE &c), so the guard is "no untimed
             * fumbling from anywhere else".  No makeknown on this arm — the
             * boots stay "a pair of combat boots".
             * The comment above used to say this arm and its three siblings are
             * "not reached by the corpus"; seed0014 step 470 wears exactly these
             * boots, and C's rnd(20)=14 @ Boots_on(do_wear.c:233) is leaf 18433
             * — the session's first RNG divergence before this. */
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
            /* deferred boots types — WATER_WALKING_BOOTS (spoteffects),
             * ELVEN_BOOTS (toggle_stealth) and LEVITATION_BOOTS (float_up)
             * reach unported helpers.  All three are RNG-free on this arm, so
             * a session that dons one diverges on state/messages, not on the
             * leaf stream. */
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
/* C ref: do_wear.c:363-419 Cloak_on(void).
 *
 * This was `don_slot('uarmc')` — the shared tail ONLY, with the whole per-otyp
 * switch missing, so donning a cloak of displacement set `known` and did
 * nothing else.  Measured on seed0360-wizard-world-tour step 497: the hero
 * wears the wished cloak of displacement and C emits
 *     "You feel that monsters have difficulty pinpointing your location.--More--"
 * plus the makeknown() behind it, whose discover_object(credit_hero=TRUE)
 * exercises A_WIS and draws rn2(19) @ attrib.c:509 (leaf 101931) — this port
 * drew nothing and printed nothing.  toggle_displacement was already ported
 * (Cloak_off calls it); only the donning half had no caller.
 *
 * `oldprop` is read from the ALREADY-worn cloak with its own WORN_CLOAK bit
 * masked off, exactly as C does (accessory_or_armor_on ran setworn() first).
 * RNG-free on every arm. */
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
            /* C do_wear.c:376 toggle_stealth(uarmc, oldprop, TRUE) — not
             * ported anywhere in js/ (Cloak_off defers the same arm).  RNG-free
             * either way; a session that dons one diverges on its message, not
             * on the leaf stream. */
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
/* C ref: do_wear.c:574-604 Gloves_on(void).  Same defect as Cloak_on above: the
 * per-otyp switch was missing entirely.  seed0360-wizard-world-tour step 495 is
 * the witness — the hero finishes donning wished gauntlets of power and C runs
 *     case GAUNTLETS_OF_POWER: makeknown(uarmg->otyp); disp.botl = TRUE;
 * whose discover_object(credit_hero=TRUE) exercises A_WIS for rn2(19)
 * @attrib.c:509 (leaf 101930).  The recorded C event log marks it
 * `^botl[Gloves_on]` on that very turn.
 * The GAUNTLETS_OF_FUMBLING arm DRAWS rnd(20) — same shape as Boots_on's
 * FUMBLE_BOOTS arm above, and ported the same way. */
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
    /* C ref: do_wear.c:1846-1853 dotakeoff() — its whole body after the
     * count_worn_stuff/getobj selection is `return armor_or_accessory_off(otmp)`.
     * It does NOT clear any worn state itself: setworn(0, mask) lives inside the
     * *_off callback, which for a DELAYED take-off runs only when unmul() fires
     * ga.afternmv at the end of the nomul countdown (do_wear.c:1931-1937).  This
     * port used to null the slot and the invent node's owornmask right here, at
     * command time — which unwore the piece turns early, so any find_ac() during
     * the countdown saw the hero already stripped (seed0365 step 42's paged frame
     * showed the post-removal AC:7 where C still shows AC:3).  takeoff_slot() now
     * clears both representations at C's own setworn() moment instead. */
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
/* objclass.h (defsym order) — oclass values used to route accessory_or_armor_on.
 * These MUST match the JS reconstructed-object scheme (js/objnam.js): the corpus
 * objects carry oclass per the defsym enum (WEAPON=2 ARMOR=3 RING=4 AMULET=5
 * TOOL=6 FOOD=7 ...), NOT a different numbering. */
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
/* C ref: worn.c:49-69 recalc_telepat_range() — "calc the range of hero's
 * unblind telepathy".
 *
 *     for (wp = worn; wp->w_mask; wp++) {
 *         struct obj *oobj = *(wp->w_obj);
 *         if (oobj && objects[oobj->otyp].oc_oprop == TELEPAT) nobjs++;
 *     }
 *     if (ETelepat & W_ART) nobjs++;   [all SPFX_ESP artifacts count as one]
 *     u.unblind_telepat_range = nobjs ? (BOLT_LIM * BOLT_LIM) * nobjs : -1;
 *
 * C calls it from the tail of setworn() (worn.c:144) and setnotworn()
 * (worn.c:183), and from set_artifact_intrinsic() (artifact.c:803).
 *
 * u.unblind_telepat_range HAD NO WRITER IN js/ AT ALL.  js/display.js
 * tp_sensemon() reads it as `(u.unblind_telepat_range | 0)` — undefined|0 === 0
 * — so `mdistu(mon) <= range` was false for every monster that is not standing
 * on the hero, and an amulet of ESP conferred nothing.  MEASURED on
 * seed0367-priest-quest-tour, whose Priest wields an amulet of ESP through a
 * graveyard: at step 203 C paints the wraiths ('W', CLR_BLACK) and the ghosts
 * (S_GHOST is a BLANK) it senses telepathically, and this port painted a
 * Warning digit over every one of them — 27 cells over 11 rows, the session's
 * first screen miss.
 *
 * The worn[] table is C's (worn.c:26-36), in C's order.  Reading each slot off
 * u.<name> is this port's model of C's `*(wp->w_obj)`; the chargen stand-in
 * records carry a symbolic string otyp, for which MKOBJ_OC_OPROP[otyp|0] is 0,
 * i.e. the same "confers nothing" answer C gives for a non-TELEPAT item. */
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

/* ═══ canwearobj() and the predicates it reads ═══════════════════════════════
 * C ref: do_wear.c:2030-2207.  "Can the hero wear this piece?"; on success it
 * writes otmp's slot mask through `mask` and returns !err.
 *
 * EVERY reject arm is RNG-FREE — C returns (or falls out with err++) before any
 * rn2/rnd draw, and accessory_or_armor_on then returns ECMD_OK, so the step
 * costs NO turn.  That is exactly the defect this ports out: seed0003 step 154
 * applies a leather cloak (otyp 145) while the Monk's robe (otyp 143) already
 * holds u.uarmc.  C rejects in the is_cloak arm (do_wear.c:2172-2178) with
 * "You are already wearing a robe." and spends no move; JS only rejected when
 * the *incoming* piece was itself worn (owornmask), so it fell through to
 * armoron() → setworn + nomul(-delay) → ECMD_TIME, spending a move C never
 * spent.  The hero then stands one square off C's, and every later
 * pet-movement modulus is computed from the wrong hero coordinate. */

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
/* objects.h otyps read by the guards below (verified against a compiled
 * OBJECTS_INIT dump, the same ground truth tools/dump-oc-delay.c reads). */
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
/* obj.h:257 bimanual(otmp) — (WEAPON_CLASS || TOOL_CLASS) && oc_bimanual.
 * The oc_bimanual otyps of those two classes, straight from the compiled
 * objects table: battle-axe, two-handed sword, tsurugi, the twelve polearms
 * (partisan..bec de corbin), dwarvish mattock, quarterstaff, unicorn horn.
 * (objects.h also sets oc_bimanual on dragon scale mail/scales, plate/splint/
 * banded mail, large shield and boulder, but C's oclass test excludes them.)
 *
 * THAT NOTE IS NOW STALE AND HAS BEEN CORRECTED (2026-09-10): js/cmd.js's
 * _BIMANUAL_INV_OTYPS carries the same 18 otyps and the shared auditor grades
 * it AGREES.  Do not "fix" cmd.js back to the four-value set.  This body is now
 * the ONE copy js/mhitu.js, js/mhitm.js, js/makemon.js, js/u_init.js,
 * js/trap.js, js/dig.js and js/mkobj.js all import; js/objnam.js and js/cmd.js
 * keep private copies that agree with it value-for-value. */
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

/* C ref: gy.youmonst.data — the hero's permonst, reduced to the three fields
 * canwearobj's guards read (mlet, mflags1, msize).  Prefer the live
 * youmonst.data (polyself.js / the capture reconstructor set it), else resolve
 * u.umonnum against the generated mons[] packs — the same resolution
 * _hero_mflags1_dw() above uses.
 *
 * Defaulting convention (identical to js/cmd.js:5332 _hero_nohands /
 * _wt_cantwield): when neither source identifies a form, default to "human" —
 * mflags1 = 0, msize = MZ_MEDIUM — NOT to a zeroed permonst.  A zeroed msize is
 * MZ_TINY, which would make verysmall() true and reject EVERY 'W' with "You
 * can't wear any armor in your current form." */
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
/* C ref: invent.c:2093-2131 silly_thing(word, otmp).  (extern.h:1373 declares
 * it; the body is in invent.c, not objnam.c — the previous comment here named
 * the wrong file.)  The whole OBSOLETE_HANDLING 'P'/'R' vs 'W'/'T' block at
 * invent.c:2097-2122 is #ifdef'd out and never compiled, so the live body is
 * just the two-arm if/else at invent.c:2125-2130.
 *   silly_thing_to = "That is a silly thing to %s."  (decl.c:43, reached via
 *   decl.h:34 #define silly_thing_to c_common_strings.c_silly_thing_to)
 * No RNG on either arm.  C DOES reach invent.c:2130 in the corpus — 4 times in
 * seed1100 — but through getobj's own call (invent.c:2072) with word "call",
 * not through this do_wear.c:2195 call site, which stays a can't-happen arm
 * (an ARMOR_CLASS object whose oc_armcat is none of the seven).
 * KNOWN GAP within this port: the AMULET_OF_YENDOR / FAKE_AMULET_OF_YENDOR
 * arm needs those two otyp constants, which js/do_wear.js does not import; it
 * is dead for every do_wear.c:2195 caller anyway, since that arm requires
 * word == "call" and this call site passes "wear".  No RNG on it either. */
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

/* C ref: do_wear.c:2210 accessory_or_armor_on(obj) — shared by 'W'/'P'.
 * Routes by oclass: armor → armoron (donning delay); ring/amulet/eyewear →
 * immediate accessory don (Ring_on/Amulet_on/Blindf_on, no delay).
 *
 * Stage-4 scope: the armor branch (the delay machinery) is the keystone path.
 * The accessory branches are modeled at the control-flow level (setworn +
 * RNG-free *_on); their full intrinsic side-effects (and the ring left/right
 * yn_function prompt at do_wear.c:2270-2288) are extended as corpus sessions
 * reach them — no session currently diverges at a W/P/R step (every wear/puton
 * session diverges upstream first), so these paths are presently unreached. */
export async function accessory_or_armor_on(obj) {
    const g = game;
    const u = g.u = g.u || {};
    if (!obj) {
        return ECMD_CANCEL;
    }
    /* C ref: do_wear.c:2214-2217 — the object is already worn (any armor or
     * accessory slot occupied): "You are already wearing that!" and bail with
     * NO turn (ECMD_OK).  This is the same reject canwearobj() repeats at
     * do_wear.c:2058 for the armor path; checking it here first matches C and
     * covers accessories too.  Without it a redundant 'W' on already-worn armor
     * would fall through to armoron → nomul(-1), spending a spurious don turn
     * that desyncs the turn stream (seed0116 W/b on a worn piece). */
    if ((obj.owornmask | 0) & (W_ACCESSORY_MASK | W_ARMOR_C)) {
        await already_wearing(c_that_);
        return ECMD_OK;
    }
    const oclass = obj.oclass | 0;
    const armor = (oclass === ARMOR_CLASS);
    const ring = (oclass === RING_CLASS || obj.otyp === MEAT_RING);
    const amulet = (oclass === AMULET_CLASS);
    if (armor) {
        /* do_wear.c:2225-2227 —
         *     if (!canwearobj(obj, &mask, TRUE)) return ECMD_OK;
         * A reject costs NO time and NO RNG; C returns ECMD_OK before touching
         * the item.  (do_wear.c:2229-2239's HELM_OF_OPPOSITE_ALIGNMENT quest
         * branch is not ported — no corpus session wears one on the quest.) */
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
        /* C do_wear.c:2254-2257 — the FIRST thing the ring branch does:
         *     if (nolimbs(gy.youmonst.data)) {
         *         You("cannot make the ring stick to your body.");
         *         return ECMD_OK;
         *     }
         * mondata.h:53 nolimbs(ptr) is `(mflags1 & M1_NOLIMBS) == M1_NOLIMBS`,
         * i.e. BOTH bits of monflag.h:99's 0x00006000 (M1_NOHANDS | the limbs
         * bit) -- not a plain non-zero test; this file's nolimbs() at the
         * bottom already spells it that way.  The guard was absent, so a
         * polymorphed limbless hero was prompted for a finger and put the ring
         * on: seed4500-knight-coverage step 1503, a brown mold, where C refuses
         * and this port asked "Which finger, Right or Left? [rl]" and then
         * consumed the answer key, desynchronising every following keystroke.
         * RNG-free. */
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
            /* do_wear.c:2259 — no free fingers; "There are no more ...". RNG-free,
             * no turn.  Deferred message (not reached by corpus). */
            return ECMD_OK;
        }
        if (g.u.uleft) {
            mask = RIGHT_RING_VAL;
        } else if (g.u.uright) {
            mask = LEFT_RING_VAL;
        } else {
            /* do_wear.c:2270 — prompt for finger, read one key via yn_function.
             * The "Which ring-finger, Right or Left? [rl]" prompt is rendered to
             * the topline, then tty_nhgetch reads the answer (the session's finger
             * key).  ESC/'\0' cancels (ECMD_OK, no turn). */
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
                /* C's accessory finger reader treats space/CR/LF as a
                 * cancelled choice, returning to the command loop while the
                 * prompt remains painted; it is not yn_function's default
                 * answer path (gen041). */
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
        /* do_wear.c:2290-2318 — Glib/cursed-gloves/welded-weapon guards: none of
         * these apply to the corpus hero (no gloves, weapon not welded). */
        /* do_wear.c:2356 retouch_object(): no silver/material conflict here. */
        /* do_wear.c:2409-2416 — setworn(obj, mask); Ring_on(obj); on_msg. */
        await setworn(obj, mask);
        await Ring_on(obj);
        find_ac();
        /* do_wear.c:2416 on_msg(obj) → prinv(NULL, obj, 0) — the
         * "<invlet> - <doname> (on {right|left} hand)." add-to-invent feedback
         * (do_wear.c:76 on_msg; objnam.c:1494 worn-ring suffix).  RNG-free. */
        await on_msg(obj);
        return ECMD_TIME;
    }
    if (amulet) {
        /* do_wear.c:2419 — Amulet_on(obj).  RNG-free except AMULET_OF_RESTFUL_SLEEP
         * (rnd(98), do_wear.c:1048), which IS in the corpus (seed0007 step 285)
         * and is ported below.  setworn + on_msg in Amulet_on.
         *
         * C's Amulet_on (do_wear.c:963-1087) is setworn(amul, W_AMUL), a per-otyp
         * switch, then "if (!on_msg_done) on_msg(uamul);" at :1085.  The tail
         * on_msg was missing here, so JS never printed the
         * "<invlet> - <doname> (being worn)." prinv line.  That is not merely a
         * cosmetic loss: the missing line shortens the topline, so the following
         * movemon plines fit where C had to raise --More--, and JS then eats C's
         * page-ack key as a command (seed0360 MISSING-CONSUME at step 140).
         * setworn also confers the extrinsic property, which JS was dropping. */
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
        /* C ref: do_wear.c:1046-1054 — case AMULET_OF_RESTFUL_SLEEP:
         *     long newnap = (long) rnd(98) + 2L, oldnap = (HSleepy & TIMEOUT);
         *     if (newnap < oldnap || oldnap == 0L)
         *         HSleepy = (HSleepy & ~TIMEOUT) | newnap;
         * The comment above this block used to call this arm "not in corpus".
         * seed0007 step 285 ('P' then 'p' on "a cubical amulet") IS this arm,
         * and its rnd(98) is that session's FIRST RNG divergence: leaf 15877,
         * C rnd(98)=77 @Amulet_on(do_wear.c:1048) against a JS still inside the
         * previous turn's distfleeck().  The draw is the load-bearing part —
         * nothing in this port reads HSleepy (js/fastforward.js says so, and
         * nh_timeout's SLEEPY arm is not ported) — but C writes it, so write it.
         * "avoid clobbering FROMOUTSIDE bit" is why C masks rather than
         * assigns. */
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
        /* C ref: do_wear.c:997-1023 — case AMULET_OF_CHANGE.  Previously a bare
         * "reaches unported helpers, stays deferred" branch (see the comment two
         * paragraphs up): the generic setworn+on_msg above ran and this port
         * left the amulet sitting worn.  C instead flips the hero's sex, prints
         * an ALTERNATE message (never on_msg's default), and the amulet
         * DISINTEGRATES the same turn — so "the amulet stays on the hero"
         * (invent_delta.worn_*) is wrong on two counts at once.
         *
         * MEASURED on board12-s doputon rec#17 (a fresh '*'-search 'P' onto a
         * cubical amulet already in the corpus): C's expected side is a
         * `gone_*` invent delta (o_id 82, otyp 206 = AMULET_OF_CHANGE — see
         * js/objnam.js:372's AMULET_OF_ESP=201 anchor, +5 ordinal), never a
         * `worn_*` one, and the record carries ONE extra recorded RNG draw this
         * port's replay left unconsumed (rng_result_tape_residual) — traced to
         * discover_object's credit_hero exercise(A_WIS,TRUE) (rn2(19)) firing
         * only on the branch below, via makeknown(AMULET_OF_CHANGE) when the
         * sex-flip is observable and the type was not already known. change_sex
         * itself draws nothing (see change_sex_dw's own citation). */
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
                /* do_wear.c:1020 — `call_it = (uamul->dknown != 0);`.  Every
                 * corpus amulet is dknown (amulets always show their shape),
                 * per do_wear.c's own comment two lines below in C; obj.dknown
                 * may be absent on a reconstructed record, so default TRUE
                 * rather than mis-reading an uncaptured field as FALSE. */
                callIt = obj.dknown !== undefined ? !!obj.dknown : true;
            }
            /* do_wear.c:1023 livelog_newform(FALSE, orig_sex, new_sex) — writes
             * to the external livelog file only; no RNG, no captured game
             * state, no screen output.  Not ported for the same reason no
             * other livelog_printf call site in this codebase is (grep
             * livelog_printf js/*.js: cited in comments only, never a body). */
            await pline('The amulet disintegrates!');
            if (callIt)
                await trycall(obj);
            await useup(obj);
            return ECMD_TIME;
        }
        await on_msg(obj);
        return ECMD_TIME;
    }
    /* C ref: do_wear.c:2420-2422 — the eyewear arm.
     *     } else if (eyewear) {
     *         Blindf_on(obj);   // setworn() and on_msg() handled by Blindf_on()
     * `eyewear` is do_wear.c:2213 `obj->oclass == TOOL_CLASS && is_worn_eyewear`,
     * i.e. the three EYEWEAR otyps (objects.h:944-950): lenses, blindfold, towel.
     * This branch used to be a bare `return ECMD_TIME` with the comment
     * "eyewear / unwearable accessory", which made putting on a blindfold a
     * silent no-op: ublindf was never set, u.uprops[BLINDED].extrinsic was never
     * conferred, and neither of C's two toplines was printed.  seed5006 step 121
     * is that miss — its FIRST screen divergence, and the head of a 73-step
     * contiguous miss run to the end of the segment.
     *
     * The `else impossible("putting on unexpected type of accessory")` arm
     * (do_wear.c:2423) stays a plain fall-through: C's impossible() is not a
     * scored channel and costs no RNG.
     *
     * C ref: do_wear.c:2323-2345 — the two guards this arm used to skip
     * straight past, ported now:
     *     if (!has_head(gy.youmonst.data)) {
     *         You("have no head to wear %s on.", ansimpleoname(obj));
     *         return ECMD_OK;
     *     }
     *     if (ublindf) {
     *         if (ublindf->otyp == TOWEL) Your("%s is already covered by a
     *             towel.", body_part(FACE));
     *         else if (ublindf->otyp == BLINDFOLD) {
     *             if (obj->otyp == LENSES) already_wearing2("lenses", "a
     *                 blindfold");
     *             else already_wearing("a blindfold");
     *         } else if (ublindf->otyp == LENSES) {
     *             if (obj->otyp == BLINDFOLD) already_wearing2("a blindfold",
     *                 "some lenses");
     *             else already_wearing("some lenses");
     *         } else already_wearing(something); // ???
     *         return ECMD_OK;
     *     }
     * Both are RNG-free rejects costing no turn. Without the second, the
     * eyewear slot (a single W_TOOL/ublindf pointer) had no conflict check at
     * all: putting on a second item of eyewear while one was already worn
     * silently OVERWROTE u.ublindf and flipped owornmask on the incoming item
     * without clearing the outgoing one's, corrupting the worn-accessory
     * state for every later doremring/dotakeoff search on that slot. MEASURED
     * board12-s doputon rec#22 — a fresh '*'-search 'P' onto "a pair of
     * lenses" while a blindfold already occupies the slot; C changes nothing
     * ("You can't wear lenses because you're wearing a blindfold there
     * already."), this port wore them anyway. */
    if (oclass === TOOL_CLASS_DW && _is_eyewear_dw(obj)) {
        if (!has_head(game.youmonst && game.youmonst.data)) {
            await pline(`You have no head to wear ${ansimpleoname(obj)} on.`);
            return ECMD_OK;
        }
        /* Read the eyewear occupant off the invent chain's own owornmask bit
         * (the same pattern this function's own top guard uses,
         * `obj.owornmask & (W_ARMOR|W_ACCESSORY)`) rather than trusting
         * g.u.ublindf directly. In a continuous session setworn_tool() keeps
         * them identical (u.ublindf IS the invent node with W_TOOL set) — but
         * prefer the invent-derived read since it is the same ground truth
         * `wornAccessoryPieces()` above and this file's other worn-state
         * reads already use. */
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
                await pline(`Your ${body_part(HEAD_DW)} is already covered by a towel.`);
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
/* C ref: do_wear.c:2433 dowear() — the 'W' command.
 *   if (verysmall(data) || nohands(data)) { "Don't even bother."; ECMD_OK }
 *   if (<all 11 armor+accessory slots full>) {
 *       "You are already wearing a full complement of armor."; ECMD_OK }
 *   otmp = getobj("wear", wear_ok, GETOBJ_NOFLAGS);
 *   return otmp ? accessory_or_armor_on(otmp) : ECMD_CANCEL;
 *
 * do_wear.c's dowear() takes NO parameter; js/cmd.js's 'W' handler already
 * runs BOTH of these guards at its call site (js/cmd.js:31278-31321, with its
 * own comment explaining why: this port's dowear() historically took the
 * object already chosen, so the guards had to live where the getobj key-read
 * does) before ever calling in with an already-resolved `otmp`. Running them
 * again here is therefore a no-op on that path — cmd.js guarantees they are
 * both false by the time it calls dowear(otmp) — but it makes this function
 * correct when called bare.
 *
 * SUPERSEDED (do not re-revert without re-measuring): past these two guards,
 * this function used to say C's own getobj() "reads a keystroke this bare
 * call has no access to" and returned ECMD_CANCEL outright whenever no object
 * was supplied. That was true only for as long as this port had no keystroke
 * channel. record.getch_returns now carries the exact keys C's tty_nhgetch()
 * read, and the oracle seeds this port's own nhgetch queue from them before
 * calling in — so a bare call (`otmp === undefined`, true zero-argument call:
 * cmd.js NEVER omits the argument, it always passes either a resolved object
 * or an explicit null on its own getobj cancel) now calls THE SAME
 * getObjFromGetobj (js/cmd.js:14407, invent.c:1752's getobj) js/cmd.js's live
 * 'W' path already uses, with wear_ok as the classifier. When cmd.js DOES
 * pass an explicit otmp (object or null), this branch is skipped entirely —
 * `otmp === undefined` is false either way — so the live scored path is
 * byte-for-byte unchanged. */
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
    /* do_wear.c never touches context.move — rhack() (cmd.c:3816-3819) does,
     * keyed off the ECMD_* return value.  Confirmed on captured ground truth:
     * every dowear() record's state_after_diff is empty, including the
     * getobj-cancelled ones that return ECMD_CANCEL here. */
    if (!otmp) {
        return ECMD_CANCEL;
    }
    return await accessory_or_armor_on(otmp);
}
/* C ref: do_wear.c:2455 doputon() — the 'P' command.  getobj("put on", puton_ok)
 * then accessory_or_armor_on(otmp).
 *
 * SUPERSEDED, same finding as dowear() above: a bare call (`otmp ===
 * undefined`) now resolves the object itself via getObjFromGetobj + puton_ok,
 * replayed from record.getch_returns. cmd.js's 'P' handler always passes an
 * explicit otmp (object or null from its own getobj call), so this branch is
 * never reached from the live scored path. */
export async function doputon(otmp) {
    const g = game;
    const u = g.u || {};

    /* do_wear.c never touches context.move — rhack() (cmd.c:3816-3819) does,
     * keyed off the ECMD_* return value.  Confirmed on captured ground truth:
     * every doputon() record's state_after_diff is empty, both the
     * full-slots ECMD_OK and the getobj-cancelled ECMD_CANCEL records
     * included. */
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
/* C ref: objnam.c doname() for a worn ring — the bare (article-less) body plus
 * the worn-hand suffix.  xname uses the TYPE name when the ring's type is
 * name-known (oc_name_known && dknown), otherwise the shuffled APPEARANCE
 * ("ivory ring").  No +N prefix unless `known` (charge identified) — the corpus
 * ring is unidentified, so its charge is unknown and no enchantment shows.
 * (objnam.c:1494 worn suffix, :1500 spe-prefix gate.)  RNG-free. */
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
    /* C objnam.c:1499-1501, the RING_CLASS tail of doname_base():
     *     if (known && objects[obj->otyp].oc_charged)
     *         Sprintf(eos(prefix), "%+d ", obj->spe);
     * oc_charged holds for the six spec==1 rings adornment(173)..protection(178)
     * (objects.h:741-757); every other ring type has no enchantment to show, so
     * a known ring of levitation stays "a ring of levitation".  seed5500's
     * removal of its +3 ring of protection is the corpus case:
     * "You were wearing a +3 ring of protection (on right hand)."
     * The BUC word (objnam.c:1318-1348) is NOT added here: it is gated on
     * obj->bknown, and no corpus ring reaches a doname with bknown set. */
    const RIN_BASE = 173, RIN_LAST_CHARGED = 178;
    let prefix = '';
    if (otmp.known && otyp >= RIN_BASE && otyp <= RIN_LAST_CHARGED) {
        const spe = otmp.spe | 0;
        prefix = `${spe >= 0 ? '+' : ''}${spe} `;
    }
    return `${prefix}${name} (on ${hand} ${body_part(HAND)})`;
}
/* C ref: do_wear.c:76 on_msg(otmp) — add-to-invent feedback after donning a ring
 * or amulet.  For W_RING|W_AMUL it calls prinv(NULL, otmp, 0), which prints
 * "<invlet> - <doname>." on the topline.  RNG-free (display only).
 *
 * Putting on a ring consumes a turn (accessory_or_armor_on → ECMD_TIME), so the
 * moveloop runs a world block AND nhgetch clears the topline before the next
 * command read.  The C topline set here persists until that next nhgetch (tty
 * clears it at the start of the read).  Mirror that persistence with
 * g._resultMessage — rhack(key=0) restores it to _pending_message before
 * flush_screen, so the preNhgetchHook captures it at the next command boundary
 * (the same mechanism the throw/wish result lines use). */
async function on_msg(otmp) {
    const g = game;
    const W_RING = 0x00060000; /* W_RINGL|W_RINGR */
    if ((otmp.owornmask | 0) & W_RING) {
        const body = ringDonameBody(otmp);
        const article = /^[aeiou]/i.test(body) ? 'an' : 'a';
        const invlet = String.fromCharCode(otmp.invlet | 0);
        const line = `${invlet} - ${article} ${body}.`;
        /* C on_msg -> prinv -> pline.  Using the canonical pline path here is
         * what makes update_topl evaluate overflow at this exact call boundary,
         * before the wear command's world turn.  Preserve the surviving final
         * topline through rhack's command-result handoff. */
        await pline(line);
        if (g._pending_message)
            g._resultMessage = g._pending_message;
        return;
    }
    /* C ref: do_wear.c:80-85 — W_AMUL takes the same prinv(NULL, otmp, 0) branch
     * as W_RING.  doname's AMULET_CLASS case (objnam.c:1383-1386) appends
     * " (being worn)" when owornmask & W_AMUL.  Unlike the ring path above there
     * is no preceding float_up/encumber topline to merge with: C emits this
     * prinv as a plain pline BEFORE returning ECMD_TIME, and the turn's movemon
     * plines then join onto it (seed0360 step 139:
     * "q - a cubical amulet (being worn).  The kitten misses the goblin.--More--").
     * Route it to _resultMessage exactly like the ring branch above: rhack's tail
     * (allmain.js:1209) wipes _pending_message once the command returns, and
     * moveloop_core merges the world block's movemon plines onto _resultMessage
     * (rebasing the join offsets so _topl_split_for_more can still page it).
     * RNG-free (display only). */
    if ((otmp.owornmask | 0) & W_AMUL_C) {
        /* prinv -> xprname(obj, NULL, invlet, TRUE, 0, 0) -> "<invlet> - " +
         * doname(obj) + ".".  This used to re-derive doname by hand as
         * `an(xname_amulet(otmp)) + " (being worn)"`, which is a PARTIAL namer:
         * xname_amulet is the type name only, so every doname prefix in front
         * of it was silently dropped -- most visibly the BUC word.
         * gen030-reseed-seed1082511 step 143 is the witness: the hero wishes
         * for a blessed amulet of ESP (so bknown AND blessed are set, and the
         * pickup line at step 136 already read "j - a blessed oval amulet.")
         * and puts it on, where C says
         *     "j - a blessed oval amulet (being worn)."
         * and this port said "j - an oval amulet (being worn)." -- it even got
         * the ARTICLE wrong, because the hand-rolled a/an test ran against the
         * type name instead of against the real first word.
         * objnam.js doname() already carries the AMULET_CLASS "(being worn)"
         * suffix (objnam.c:1383-1386) and just_an()'s article fixup
         * (objnam.c:1687-1693), so the whole re-derivation goes away. */
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
    /* C ref: do_wear.c:87-98 — the ARMOR (and verbose eyewear) arm:
     *     if (flags.verbose) {
     *         const char *otmp_name = xname(otmp);
     *         if (otmp->otyp == TOWEL) Sprintf(how, " around your %s", body_part(HEAD));
     *         You("are now wearing %s%s.",
     *             obj_is_pname(otmp) ? the(otmp_name) : an(otmp_name), how);
     *     }
     * This arm was MISSING, so accessory_or_armor_on's zero-delay branch
     * (do_wear.c:2402 `unmul(""); on_msg(obj);`) printed nothing at all for a
     * cloak — every cloak has oc_delay 0, so that is the ONLY branch a cloak
     * ever takes.  seed0360-wizard-world-tour step 498: C's topline reads
     * "You are now wearing a cloak of displacement." (paged off step 497's
     * displacement message, which is why C raises --More-- there and this port
     * did not, leaking the page-ack key into rhack as "Unknown command ' '.").
     * CORRECTED: the sentence that used to end this note -- "flags.verbose is
     * On by default and no corpus nethackrc turns it off" -- is false.  Two
     * public sessions open with `OPTIONS=!autopickup,!verbose,...`
     * (seed4500-knight-coverage and seed0398-wizard-wandpoly-pile), and with
     * verbose off C's on_msg falls off the end printing NOTHING for armor.
     * RNG-free. */
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
/* C ref: objnam.c doname() for an armor piece — the full body the off_msg shows
 * AFTER removal (so owornmask is cleared and the "(being worn)" suffix from
 * objnam.c:1388 does NOT appear).  Components (objnam.c:1387-1424):
 *   - BUC word when bknown (objnam.c:1339 add_erosion_words path → "uncursed")
 *   - "%+d " enchantment when `known` (objnam.c:1423) — armor is enchantable
 *   - the type name: name-known → "<actualn>" ("cloak of magic resistance"),
 *     else the shuffled appearance ("<descr>", e.g. "ornamental cope").
 * RNG-free.  (Erosion words / poisoned / artifact-light branches are not on the
 * corpus path: the starter cloak is uneroded, non-artifact.) */
function armorDonameBody(otmp) {
    /* BUC word — objnam.c:1318-1349.  flags.implicit_uncursed defaults On
     * (optlist.h:396-397 NHOPTB(implicit_uncursed, ..., On, ...)), so the
     * leading `!flags.implicit_uncursed` disjunct is FALSE and the second one
     * decides whether "uncursed " is emitted:
     *   ((!known || !oc_charged || ARMOR_CLASS || RING_CLASS)
     *    && otyp != FAKE_AMULET_OF_YENDOR && otyp != AMULET_OF_YENDOR
     *    && !Role_if(PM_CLERIC))
     * For ARMOR_CLASS the first parenthesis is unconditionally true and the two
     * amulet exclusions cannot apply, so the whole test reduces to
     * !Role_if(PM_CLERIC): a Priest/Priestess (who always knows BUC) never sees
     * the redundant "uncursed" word.  seed0367 step 54 is exactly that case —
     * C "You were wearing a +0 robe." for the priest's bknown uncursed robe,
     * while the port emitted "an uncursed +0 armor.". */
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

/* C ref: do_wear.c:1347 Ring_off_or_gone(obj, gone) — clear the ring's conferred
 * extrinsic property bit and the worn slot, then dispatch the ring's removal
 * side-effect.  For RIN_LEVITATION that is float_down().  RNG-free up to the
 * dispatched side-effect; float_down() itself is RNG-free on the corpus path. */
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
        /* do_wear.c:1406 — if (!(BLevitation & FROMOUTSIDE)) float_down(0,0);
         * the corpus hero has no FROMOUTSIDE block, so float_down runs. */
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

/* C ref: do_wear.c:66-71 off_msg(otmp) — "You were wearing %s." doname(otmp),
 * called AFTER setworn() has cleared the mask (so doname's "(being worn)"
 * suffix — objnam.js:4927, gated on the object's OWN owornmask — is correctly
 * absent, unlike on_msg's amulet branch which fires BEFORE the mask clears).
 * Generic across every accessory/armor type in C; this file already has a
 * ring-specific and an armor-specific copy (off_msg/armor_off_msg) built
 * before doname() was safe to call for every class, so this is a THIRD
 * narrow copy rather than a refactor of those two — unifying them is out of
 * this fix's scope. RNG-free. */
async function off_msg_amulet(otmp) {
    if (!(game.flags && game.flags.verbose))
        return;
    await pline(`You were wearing ${(await doname(otmp))}.`);
}
/* C ref: do_wear.c:1090-1184 Amulet_off() — the doremring/dotakeoff accessory-
 * off dispatch's amulet arm.  Reads the global uamul (this file's u.uamul),
 * exactly like the C signature (void, no args).
 *
 * Ported at the same fidelity as Ring_off/Blindf_off above: the tail every
 * case arm shares (setworn(0,W_AMUL) + off_msg, do_wear.c:1180-1183) always
 * runs, and the per-otyp switch is ported for the arms this file can reach
 * faithfully.  AMULET_OF_LIFE_SAVING / VERSUS_POISON / REFLECTION /
 * AMULET_OF_CHANGE / AMULET_OF_UNCHANGING / FAKE_AMULET_OF_YENDOR /
 * AMULET_OF_YENDOR are bare `break;` in C (do_wear.c:1092-1099) — nothing to
 * port, the shared tail is their whole body, and this file's oracle corpus
 * exercises VERSUS_POISON/UNCHANGING/REFLECTION removal exactly this way.
 * AMULET_OF_GUARDING recomputes AC (find_ac() already models the AMULET_OF_
 * GUARDING -2 term, do_wear.c:366).  The remaining arms (ESP/STRANGULATION/
 * MAGICAL_BREATHING/RESTFUL_SLEEP/FLYING) run their shared setworn+off_msg
 * EARLY per C, then defer their otyp-specific follow-on effect: each needs
 * either display machinery this file does not have (ESP's see_monsters(),
 * FLYING's spoteffects()) or hero state no corpus session reaches this call
 * while actually experiencing (Strangled/Underwater/HSleepy — none of which
 * has a reader anywhere in js/ per this file's existing SLEEPY_DW note
 * above). None of the deferred follow-ons touches the worn-mask/return
 * channel this fix targets. */
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
        /* Strangled-clear / "can breathe more easily" follow-up deferred —
         * no corpus session removes this amulet while actually Strangled. */
    } else if (otyp === AMULET_OF_RESTFUL_SLEEP_DW) {
        /* do_wear.c:1150-1154 — setworn only; off_msg comes from the shared
         * tail below (early_off_msg is NOT set for this case in C). */
        await setworn(null, W_AMUL_C);
        /* HSleepy timeout-bit clear deferred — same rationale as this file's
         * existing Amulet_on RESTFUL_SLEEP note: nothing in js/ reads HSleepy. */
    } else if (otyp === AMULET_OF_MAGICAL_BREATHING_DW) {
        /* do_wear.c:1113-1132 */
        await setworn(null, W_AMUL_C);
        await off_msg_amulet(amul);
        earlyOffMsg = true;
        /* Underwater drown()/region_danger() follow-up deferred — hero is
         * never Underwater at this call in the corpus. */
    } else if (otyp === AMULET_OF_FLYING_DW) {
        /* do_wear.c:1155-1170 */
        await setworn(null, W_AMUL_C);
        await off_msg_amulet(amul);
        earlyOffMsg = true;
        /* float_vs_flight()/"stop flying or land"/spoteffects() follow-up
         * deferred — no corpus session removes a worn amulet of flying while
         * actually flying. */
    } else if (otyp === AMULET_OF_GUARDING) {
        find_ac(); /* do_wear.c:1176 — shared tail handles setworn+off_msg. */
    }
    /* do_wear.c:1180-1183 — shared tail every case arm falls into. */
    await setworn(null, W_AMUL_C);
    if (!earlyOffMsg)
        await off_msg_amulet(amul);
}

/* C ref: trap.c:4004 float_down(hmask, emask) — end-of-levitation feedback.
 * Corpus path: hero is untrapped, not flying/swallowed/in-water, on normal
 * dungeon floor (no pool/lava/trap), not Sokoban/airlevel/waterlevel, not
 * punished — so the only feedback is "You float gently to the floor." followed
 * by encumber_msg() (carrying capacity dropped now that levitation ended).
 * RNG-free on this path (pickup(1) at the tail finds no floor items here, and
 * the per-turn exerchk that draws rn2(19) fires later from the moveloop engine
 * after this ECMD_TIME command returns).  Deferred branches (BLevitation/BFlying/
 * uswallow/Punished/pool/lava/trap/Sokoban/steed) are annotated, not reached. */
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
    // floor. Clear the blocker and update carrying capacity without landing.
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
    float_vs_flight();
    /* BFlying/uswallow/Punished/pool/lava branches deferred (FALSE here). */
    /* trap = t_at(u.ux,u.uy): no trap on the hero's square → the "float gently"
     * branch (do_wear.c equivalent trap.c:4124): You("float gently to the %s",
     * surface) → "floor" on normal dungeon floor.
     * C trap.c:4100 gates that whole message block on `if (!(emask & W_SADDLE))`:
     * dismount_steed calls float_down(0L, W_SADDLE) unconditionally (steed.c:810)
     * precisely so the hero comes down WITHOUT a levitation-ending line.  The
     * gate was missing, so the first dismount this port ever performed printed
     * "You float gently to the floor." where C prints nothing (seed0104 step 29,
     * which also swallowed the frame C uses for the floor pile). */
     // PARKED-NOTE: session=seed0104 citation-only
    if (!(emask & W_SADDLE_FD)) {
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
        && on_level(levelBeforeTrap, u.uz))
        await _spoteffects_pickup_fd();
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

/* C ref: do_wear.c:1602-1640 doffing(otmp) — check if an object is queued for
 * doffing by the 'A' command (takeoff-all).
 *
 *   boolean doffing(struct obj *otmp)
 *   {
 *       long what = svc.context.takeoff.what;
 *       boolean result = FALSE;
 *       if (otmp == uarm)
 *           result = (ga.afternmv == Armor_off || what == WORN_ARMOR);
 *       else if (otmp == uarmu)
 *           result = (ga.afternmv == Shirt_off || what == WORN_SHIRT);
 *       ...
 *       return result;
 *   }
 *
 * Port: otmp is a struct obj record (marshalled from C via capture). Compare
 * it against the player's worn slots using object identity (===). If it's worn
 * and either the afternmv tag matches the *_off for that slot OR the takeoff
 * what bitmask includes the slot, return true. RNG-free. */
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

/* ───────────────────────── EYEWEAR (the W_TOOL slot) ─────────────────────────
 * objects.h:944-950 EYEWEAR rows — lenses confer NOTHING (oc_oprop 0),
 * blindfold and towel both confer BLINDED.  The property itself comes from
 * MKOBJ_OC_OPROP rather than a local table, so a towel goes through the
 * identical path; the otyps are only needed by name for the "still cannot see"
 * suppression in Blindf_off and the TOWEL wording in on_msg (LENSES_OTYP_DW /
 * BLINDFOLD_OTYP_DW / TOWEL_OTYP_DW are declared above).
 *
 * C ref: youprop.h:96-103
 *     Blindfolded  EBlinded                    (u.uprops[BLINDED].extrinsic)
 *     Blind        ((HBlinded || EBlinded) && !BBlinded)
 * The same triple js/vision.js:19 Blind(), js/display.js:3941 _disp_Blind() and
 * js/trap.js:2033 already read — including the `u.ublind` alias those accept —
 * so the vision recalc, the status line and this agree by construction.
 *
 * NOTE this is deliberately NOT `u._blind`.  Five sites in js/ derive a local
 * `const Blind = !!(u._blind)` from a field that NOTHING in js/ or frozen/ ever
 * assigns (js/dokick.js:201 even labels itself `WIRE_PENDING: full Blind
 * macro`), so every one of them is permanently false.  Reading uprops here is
 * what makes the property a real one rather than a sixth dead guard. */
function _Blind_dw() {
    const u = game.u;
    if (!u) return false;
    const bp = u.uprops && u.uprops[BLINDED_PROP];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
            && !(bp.blocked | 0);
}


/* C ref: potion.c:335-364 toggle_blindness().
 *     SET_BOTL; gv.vision_full_recalc = 1; vision_recalc(0);
 *     if (Blind_telepat || Infravision || Stinging) see_monsters();
 *     if (Stinging) Sting_effects(-1);
 *     if (!Blind) learn_unseen_invent();
 * No RNG on any arm.  This is the same body js/zap.js:355 carries file-locally
 * for flashburn; kept local here for the same reason (zap.js does not export
 * it, and importing zap.js from do_wear.js would close a cycle through
 * mhitm.js).  vision_recalc(0) is the load-bearing call: js/vision.js:596 has
 * the real `else if (Blind)` arm, so once EBlinded is set this is what clears
 * IN_SIGHT everywhere and repaints the remembered map.
 *
 * KNOWN GAP: see_monsters()/Sting_effects()/learn_unseen_invent() are not
 * called.  Blind_telepat and Infravision are false for every corpus hero form
 * and Stinging needs the artifact Sting, so C skips all three too; the !Blind
 * arm's learn_unseen_invent only marks dknown on unseen inventory, which no
 * corpus screen reads back.  None of the four draws RNG. */
function toggle_blindness_dw() {
    const g = game;
    g.disp = g.disp || {};
    g.disp.botl = 1;
    g.vision_full_recalc = 1;
    vision_recalc(0);
}

/* C ref: do_wear.c:76-100 on_msg(otmp), the EYEWEAR arm.  For W_TOOL with
 * flags.verbose (the corpus default — no `!verbose` in any session's
 * nethackrc) C skips the prinv add-to-invent line and prints
 *     You("are now wearing %s%s.", obj_is_pname(otmp) ? the(name) : an(name),
 *         how);
 * with `how` = " around your <head>" for a TOWEL and empty otherwise.
 * RNG-free.  KNOWN GAP: obj_is_pname (a named/artifact blindfold) is not
 * tested — no corpus eyewear is named, and the branch only changes the
 * article. */
async function eyewear_on_msg(otmp) {
    /* C do_wear.c:81-85 — for W_TOOL the verbose test comes FIRST and inverted:
     *     if (... || ((otmp->owornmask & W_TOOL) != 0L && !flags.verbose)) {
     *         prinv((char *) NULL, otmp, 0L);
     *         return;
     *     }
     * so with `!verbose` (seed4500 / seed0398) the eyewear line is the prinv
     * add-to-invent form, not "You are now wearing ...".  The comment above
     * asserted no corpus nethackrc turns verbose off; two do. */
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

/* C ref: do_wear.c:67-71 off_msg(otmp) — You("were wearing %s.", doname(otmp)).
 * Blindf_off calls setworn(0, mask) FIRST, so owornmask is already clear by the
 * time this runs and doname adds no "(being worn)" suffix.  The corpus eyewear
 * is an unnamed, non-bknown blindfold, for which doname reduces to
 * an(xname(obj)) — "a blindfold". */
async function eyewear_off_msg(otmp) {
    /* C do_wear.c:69 — off_msg is `if (flags.verbose)`; see armor_off_msg. */
    if (!(game.flags && game.flags.verbose))
        return;
    /* off_msg calls doname(), not an(xname()).  The distinction matters when
     * the blindfold's blessed/uncursed state is known: C then says
     * "an uncursed blindfold" (gen432), while an unidentified one still says
     * "a blindfold" (the public eyewear sessions). */
    await pline(`You were wearing ${(await doname(otmp))}.`);
}

/* C ref: do_wear.c:1479-1512 Blindf_on(otmp).
 *     boolean already_blind = Blind, changed = FALSE;
 *     remove_worn_item(otmp, FALSE);      // blindfold might be wielded
 *     setworn(otmp, W_TOOL);
 *     on_msg(otmp);
 *     if (Blind && !already_blind) { changed = TRUE; You_cant("see any more."); ... }
 *     else if (already_blind && !Blind) { changed = TRUE; You("can see!"); }
 *     if (changed) toggle_blindness();
 *
 * Note the ORDER, which is what the screen shows: setworn confers EBlinded
 * BEFORE on_msg, so the "You are now wearing a blindfold." pline is already
 * emitted from a blind hero — and the "You can't see any more." line follows it
 * on the same topline.  seed5006 step 121 is exactly that pair, with the turn's
 * movemon line joined on:
 *     "You are now wearing a blindfold.  You can't see any more.  It bites!"
 * ("It", not "The sewer rat", because canspotmon is now false; and the kitten's
 * miss is suppressed entirely for the same reason.)
 *
 * RNG-free: setworn, on_msg, the message arms and toggle_blindness all draw
 * nothing.  KNOWN GAPS, none of them RNG-bearing and none corpus-reachable:
 * the Punished/set_bc(0) ball-and-chain arm (no corpus hero is punished), and
 * the `already_blind && !Blind` arm, which needs the Eyes of the Overworld
 * (w_blocks → BBlinded) plus the u.uroleplay.blind conduct. */
export async function Blindf_on(otmp) {
    const already_blind = _Blind_dw();
    let changed = false;

    // C removes a wielded/quivered blindfold before putting it on.
    await remove_worn_item(otmp, false);
    await setworn(otmp, W_TOOL_C);
    await eyewear_on_msg(otmp);

    if (_Blind_dw() && !already_blind) {
        changed = true;
        /* flags.verbose is on for every corpus session; You_cant() is
         * You("can't %s", ...) → "You can't see any more." */
        await pline("You can't see any more.");
    } else if (already_blind && !_Blind_dw()) {
        changed = true;
        await pline('You can see!');
    }
    if (changed)
        toggle_blindness_dw();
}

/* C ref: do_wear.c:1514-1553 Blindf_off(otmp).
 *     boolean was_blind = Blind, changed = FALSE;
 *     svc.context.takeoff.mask &= ~W_TOOL;
 *     setworn((struct obj *) 0, otmp->owornmask);
 *     if (!nooffmsg) off_msg(otmp);
 *     if (Blind) { if (was_blind) { if (otyp != LENSES) You("still cannot see."); }
 *                  else { changed = TRUE; You_cant("see anything now!"); ... } }
 *     else if (was_blind) { if (!gulp_blnd_check()) { changed = TRUE;
 *                                                    You("can see again."); } }
 *     if (changed) toggle_blindness();
 *
 * seed5006 step 125: "You were wearing a blindfold.  You can see again.--More--"
 * — off_msg first, then the regained-sight line, both before the turn's world
 * block, which is what raises the --More--.
 *
 * KNOWN GAPS (RNG-free, not corpus-reachable): gulp_blnd_check() — a hero
 * swallowed by a light-blocking engulfer stays blind on removal, and no corpus
 * hero is engulfed while wearing eyewear; the Punished/set_bc(0) arm; and the
 * `Blind && !was_blind` arm, which again needs the Eyes of the Overworld. */
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

/* C ref: prop.h LEVITATION property + ring otyps used by Ring_on.
 * otyp values are the contiguous RIN_* block from objects.c (verified against
 * the JS object table via simple_typename): adornment=173, gain strength=174,
 * gain constitution=175, increase accuracy=176, increase damage=177,
 * protection=178, regeneration=179, ... levitation=183.  The prior constants
 * here (adornment=168, gain_str=178, protection=170 …) were wrong — they made
 * Ring_on's switch miss the real ring types, so e.g. putting on a ring of
 * protection skipped learnring()→discover_object()→exercise(A_WIS,TRUE) and
 * dropped C's rn2(19) (seed5500 step 820 first-divergence). */
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

/* C ref: do_wear.c:1193 learnring(ring, observed).  For the corpus we need the
 * `makeknown(ringtype)` discovery path (ring->dknown && !oc_name_known).
 * RNG-free. */
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
    /* C do_wear.c:1215-1218 — "make enchantment of charged ring known (might be
     * +0) ... if we've seen this ring and know its type":
     *     if (ring->dknown && objects[ringtype].oc_name_known) {
     *         if (objects[ringtype].oc_charged) ring->known = 1;
     *         update_inventory();
     *     }
     * `known` is what doname's RING_CLASS tail (objnam.c:1499-1501) gates the
     * "%+d " on, so without it the prinv/off_msg for a charged ring lost its
     * enchantment: seed5500 step 820 C "F - a +3 ring of protection (on right
     * hand)." vs JS "F - a ring of protection (on right hand).".  oc_charged is
     * the six spec==1 rings adornment(173)..protection(178) (objects.h:741-757).
     * update_inventory() is a perm-invent repaint we do not model. */
    const RIN_BASE = 173, RIN_LAST_CHARGED = 178;
    if (ring.dknown && g._oc_name_known[ringtype]) {
        if (ringtype >= RIN_BASE && ringtype <= RIN_LAST_CHARGED)
            ring.known = 1;
    }
}

/* C ref: attrib.c:1268 extremeattr(attrindx) — "does attrindx's value match
 * its max or min?".  A_STR's GAUNTLETS_OF_POWER hilimit override is ported
 * (uarmg is already tracked by this file); A_CON's u_wield_art(ART_OGRESMASHER)
 * override is NOT — no corpus record reaches adjust_attrib for A_STR or A_CON
 * (only A_CHA, via RIN_ADORNMENT, is proven reached — board12-s doputon
 * rec#3), and A_CHA takes neither branch, so this is complete for the
 * proven-reached path. */
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
/* C ref: do_wear.c:1223 adjust_attrib(obj, which, val) — Ring_on's
 * RIN_GAIN_STRENGTH/RIN_GAIN_CONSTITUTION/RIN_ADORNMENT arms.
 *     old_attrib = ACURR(which);
 *     ABON(which) += val;
 *     observable = (old_attrib != ACURR(which));
 *     if (observable || !extremeattr(which)) learnring(obj, observable);
 *     disp.botl = TRUE;
 * RNG-free itself; learnring() CAN draw (discover_object's credit_hero
 * exercise(A_WIS,TRUE) on first discovery — see learnring's own citation
 * above, and change_sex_dw's sibling AMULET_OF_CHANGE finding, same
 * mechanism, same board12-s wave). */
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

/* C ref: trap.c:3917 float_up().  Levitation onset feedback + float_vs_flight +
 * encumber_msg.  The corpus hero floats up while untrapped and not in water/
 * swallowed/hallucinating/airlevel → the final "You start to float in the air!"
 * branch.  Trapped / water / steed branches are deferred (annotated). */
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
    } else {
        /* Hallucination / Is_airlevel deferred (FALSE for corpus). */
        await pline('You start to float in the air!');
    }
    /* steed branch (u.usteed) — none. */
    /* Flying branch — not flying. */
    float_vs_flight();
    /* levitation gives maximum carrying capacity, so encumbrance state may
     * drop — encumber_msg() emits the load-change line. */
    await encumber_msg();
}

/* C ref: do_wear.c:1242 Ring_on(obj) — ring-effect dispatch.  The ring is
 * already worn (setworn ran first) so u.uprops[oc_oprop].extrinsic is set.
 * Property-only rings (teleport/regen/searching/.../sustain-ability) just
 * `break` (no immediate effect).  Effect rings are ported per the corpus need;
 * the +N stat / accuracy / damage / protection setups are cheap and C-faithful. */
export async function Ring_on(obj) {
    const u = game.u;
    const otyp = obj.otyp | 0;
    const W_RING = 0x00060000;
    const oprop = MKOBJ_OC_OPROP[otyp] | 0;
    const prop = u.uprops?.[oprop];
    let oldprop = prop?.extrinsic | 0;
    if ((oldprop & W_RING) !== W_RING)
        oldprop &= ~W_RING;
    /* C do_wear.c:1249 — make sure ring isn't wielded (corpus rings aren't). */
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
        /* C do_wear.c:1313-1319 — adjust_attrib(obj, A_STR|A_CON|A_CHA, obj->spe).
         * MEASURED reached by board12-s doputon rec#3 (RIN_ADORNMENT/A_CHA):
         * previously a bare no-op, which left u.abon untouched (a silent
         * attribute-bump loss) and skipped adjust_attrib_dw's learnring() call
         * — the record's rng_result_tape_residual (1 unconsumed draw) traced to
         * exactly that missing learnring()->discover_object()->
         * exercise(A_WIS,TRUE) on first-discovery, the same mechanism as the
         * AMULET_OF_CHANGE finding above. */
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
            /* property rings (RIN_TELEPORTATION..RIN_SUSTAIN_ABILITY, MEAT_RING)
             * and toggle rings (stealth/warning/see-invis/invis/poly/...): the
             * extrinsic is already set by setworn; their immediate-don effects
             * (toggle_stealth/see_monsters/...) consume no RNG on the corpus
             * path and are deferred until a session reaches them. */
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
        Helmet_on();
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


/* C ref: do_wear.c:3342-3401 inaccessible_equipment() — check whether equipment
 * is blocked from being removed by outer armor covering it.
 * C source:
 *   boolean
 *   inaccessible_equipment(
 *       struct obj *obj,
 *       const char *verb, // "dip" or "grease", or null to avoid messages
 *       boolean only_if_known_cursed) // ignore covering unless cursed+known
 *   {
 *       static NEARDATA const char need_to_take_off_outer_armor[] =
 *           "need to take off %s to %s %s.";
 *       char buf[BUFSZ];
 *       boolean anycovering = !only_if_known_cursed;
 *   #define BLOCKSACCESS(x) (anycovering || ((x)->cursed && (x)->bknown))
 *       if (!obj || !obj->owornmask) return FALSE;
 *       if (obj == uarm && uarmc && BLOCKSACCESS(uarmc)) {
 *           if (verb) { Strcpy(buf, yname(uarmc)); You(..., buf, verb, yname(obj)); }
 *           return TRUE;
 *       }
 *       if (obj == uarmu && ((uarm && BLOCKSACCESS(uarm)) || ...)) {
 *           if (verb) { ... You(...); }
 *           return TRUE;
 *       }
 *       if ((obj == uleft || obj == uright) && uarmg && BLOCKSACCESS(uarmg)) {
 *           if (verb) { Strcpy(buf, yname(uarmg)); You(...); }
 *           return TRUE;
 *       }
 *       return FALSE;
 *   }
 * Port: checks worn armor slots for blocking equipment. RNG-free; no state
 * modifications in recorded captures.  verb is null in all recorded replays, so
 * the message arms below are unexercised by the capture corpus — they are still
 * C-shaped rather than stubbed, because `verb` is caller-supplied ("dip" /
 * "grease") and a corpus that has not yet reached those callers is not evidence
 * that they are unreachable (the drain_item `spe == 0` lesson). */
export function inaccessible_equipment(obj, verb, only_if_known_cursed) {
    const g = game;
    g.u = g.u || {};
    const u = g.u;

    /* obj is null → not inaccessible */
    if (!obj)
        return false;

    /* Check if obj is actually worn by checking against worn slots.
     * The C function checks obj->owornmask, but that field is not captured
     * in the harness records. We infer it from object identity: if obj matches
     * any worn slot (u.uarm, u.uarmc, u.uarmu, u.uleft, u.uright, u.uarmg),
     * then it is worn (owornmask is nonzero). If it doesn't match any worn slot,
     * it's not currently being worn. */
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

    /* C do_wear.c:3349-3350 static const char need_to_take_off_outer_armor[].
     * These three call sites were `You(verb, obj)` — a two-argument call to a
     * function C invokes with FOUR (the format plus three strings), against a
     * `You` that was a throw-stub.  Porting You() without fixing the shape
     * would have replaced a guaranteed abort with a guaranteed wrong topline
     * (the format string itself, printed verbatim), which the render gates read
     * as real output.  C ref: do_wear.c:3359-3395. */
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
    /* C: victim == &gy.youmonst.  Reference equality is canonical but the
       sweep may reconstruct objects separately; fall back to m_id. */
    const is_you = (victim === g.youmonst)
        || (g.youmonst && victim.m_id === g.youmonst.m_id);

    /* Walk a monster's minvent for worn armor matching mask.
       Mirrors C's which_armor (worn.c).  When minvent is missing (sweep
       reconstruction edge-case), search global chains. */
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

/* ── C ref: do_wear.c:3198-3253 disintegrate_arm(struct obj *atmp) ────────────
 * hit by destroy armor scroll (cursed, or blessed) / black dragon breath.
 * Returns 1 if something was destroyed, 0 if nothing could be.
 *
 * Note (C's own comment): if the cloak resisted, the suit or shirt underneath
 * is not impacted either; likewise a resisting suit shields the shirt.  That is
 * what `resistedc` / `resistedsuit` carry, and it is why those two slots use
 * their own boxes rather than sharing `resisted`.
 *
 * RNG (C order): one rn2(100) inside obj_resists per slot actually TESTED, in
 * the order cloak, suit, shirt, helm, gloves, boots, shield — stopping at the
 * first slot that yields a victim.
 *
 * C calls end_burn(otmp, FALSE) for a lamplit suit (a gold dragon scale mail)
 * before printing, so that Armor_gone() cannot report "stops shining" after the
 * destruction message.  That call used to be OMITTED here, on the stated
 * grounds that end_burn was a throw-stub in this tree; it is a real body now
 * (js/timeout.js, landed 2026-08-25 with begin_burn), so the call is made.
 * RNG-free either way, and nothing on the 44 public sessions reaches
 * disintegrate_arm at all (measured: zero recorded draws at do_wear.c:3189
 * across the whole corpus). */
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


/* You — C pline.c:369-377.
 *   You(const char *line, ...) {
 *       va_start(the_args, line);
 *       vpline(YouMessage(tmp, "You ", line), the_args);
 *   }
 * i.e. printf-format `line`, prefix the literal "You ", hand it to pline.
 * C draws NO RNG here: vpline formats, may call vision_recalc()/flush_screen()
 * when gv.vision_full_recalc is set, then putmesg() — no rn2/rnd/d anywhere on
 * any arm (pline.c:153-287).
 *
 * This was `throw new Error('not yet ported: You')`, and it was IMPORTED by
 * js/cmd.js:84 and js/ball.js:34 — so it was bound, and every one of the 29
 * call sites across those two files was a guaranteed total session loss (the
 * replay runner discards the whole matched RNG prefix on an exception), which
 * no binding gate could see. The class is now gated by
 * tools/js-binding-audit.mjs --stub-resolve.
 *
 * Async because the pline it delegates to is async and several call sites
 * already write `await You(...)`; pline's body has no await before it mutates
 * game._pending_message, so the non-awaited call sites still take effect in
 * step order.
 *
 * KNOWN GAP, all of it C-shaped rather than fatal: vpline's BUFSZ-1 truncation
 * ("___ extremely l...ext"), the a11y.accessiblemsg location prefix, and
 * msgtype NOREP/NOSHOW suppression are not ported — pline() itself does not
 * implement them either, so You() must not invent them. Conversion specifiers
 * outside _plineVFmt's set are left verbatim rather than mis-substituted. */
export async function You(line, ...args) {
    return pline('You ' + _plineVFmt(line, args));
}

/* Your — C pline.c:380-388, identical to You() with the "Your " prefix.
 * Was imported from js/vault.js:481, another throw-stub, for the single call at
 * do_wear.js:1615 (accessory_or_armor_on's "all slots full" message) — a live,
 * measured-hot path. js/cmd.js:19663, js/potion.js:1188, js/read.js:2307,
 * js/shk.js:1848 and js/sit.js:75 each hold a separate Your body; this is the
 * one that shares pline's formatter instead of re-deriving it. */
export async function Your(line, ...args) {
    return pline('Your ' + _plineVFmt(line, args));
}

/* yname — C objnam.c:2568-2582.
 *   yname(obj) { s = cxname(obj);
 *                if (!carried(obj) || !obj_is_pname(obj)
 *                    || obj->oartifact >= ART_ORB_OF_DETECTION)
 *                    s = strcat(shk_your(nextobuf(), obj), s);
 *                return s; }
 * RNG-free on every arm.
 *
 * This was a throw-stub here AND at js/cmd.js:19318, which mattered because
 * js/cmd.js:6674 is `await You("smear royal jelly all over %s.", yname(eobj))`
 * — porting You() alone would have moved the abort one argument to the left,
 * exactly the failure recorded in the cmd.js:6537 comment. Both sites now
 * resolve to this body.
 *
 * KNOWN GAP: shk_your()'s shopkeeper/monster-owner arms are not ported (they
 * yield "Izchak's " for an unpaid item and "the Oracle's " for a monster's),
 * and obj_is_pname/oartifact gating of the possessive is not modelled — so an
 * artifact the hero carries gets "your " where C would omit it. The fallback
 * arm C reaches for every ordinary object, `the_your[carried(obj)]`, is what is
 * ported; js/cmd.js:19700 Shk_Your carries the same simplification with the
 * same caveat. */
export function yname(obj) {
    /* C shk.c the_your[] fallback: carried → "your ", otherwise "the ".
     * carried(o) is obj.h:332 `(o)->where == OBJ_INVENT`.
     *
     * THIS PORT DOES NOT MAINTAIN obj.where ON THE INVENTORY PATHS — u_init's
     * starting inventory and the pickup path both leave it unset, so the bare
     * `where === 3` test called every carried object "the".  js/lock.js:993
     * measured that same defect on its own copy of yname (seed0014's starting
     * dwarvish spear and seed0108's wished-for Mjollnir both came out "the")
     * and worked around it by walking the gi.invent chain, which is what
     * OBJ_INVENT MEANS and which this port DOES maintain; do the same here, in
     * the shared body, rather than growing a third private copy.
     *
     * The `where === 3` disjunct is kept so this can only ever turn a "the "
     * into a "your ", never the reverse: the WORN-armor records (u.uarm and
     * friends, js/u_init.js:186) are not linked on the invent chain but do
     * carry the field, and do_wear.js's need_to_take_off_outer_armor callers
     * name them through here.
     *
     * Measured on seed5002 segment 0: the fire-destroyed potions rendered as
     * "The potion of invisibility boils and explodes!" against C's "Your". */
    let owned = !!obj && (obj.where | 0) === 3;
    if (obj && !owned) {
        for (let o = game.invent; o; o = o.nobj) {
            if (o === obj) { owned = true; break; }
        }
    }
    return (owned ? 'your ' : 'the ') + cxname(obj);
}
/* xname — C objnam.c:574-578.  Its home is objnam.c, i.e. js/objnam.js, which
 * now carries the real xname_flags() body; this used to be a throw-stub, which
 * meant every js/ball.js and js/mhitu.js caller that reached it aborted the
 * whole session (and the replay runner discards the session's entire matched
 * RNG prefix on an exception).  Re-exported rather than re-implemented so
 * js/ball.js:35 and js/mhitu.js:40, which import it from here, resolve to the
 * single body. */
export { xname };
/* C shk.c:5863-5875 shk_your() fallback.  Shopkeeper/monster ownership is
 * handled by js/shk.js; this local export is used by wear naming and needs the
 * ordinary carried-versus-floor prefix without throwing. */
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
