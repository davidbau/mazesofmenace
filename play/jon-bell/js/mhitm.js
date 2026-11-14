// @ts-nocheck
/* js/mhitm.js — passive() hero-side passive counterattack dispatcher.
 * C ref: nethack-c/src/uhitm.c:5866-6121 passive()
 *        nethack-c/src/mhitm.c:1475-1512 attk_protection()
 *        nethack-c/src/uhitm.c:6127-6196 passive_obj()
 *
 * W4d: port passive() with bit-exact RNG ordering.
 * RNG sites (path-dependent; up to 13 per call depending on adtyp/conditions):
 *   1. d(damn,damd) or d(m_lev+1,damd)  — always if mattk has damage dice
 *   AD_FIRE  first block: rn2(6) [kick path]  or passive_obj → rn2(6)
 *   AD_ACID  first block: rn2(2), rn2(30), rn2(6) [kick] or passive_obj → rn2(6)
 *   second block (malive && !mcan && rn2(3)):
 *   AD_PLYS  floating-eye: rn2(4)[halluc], rn2(2), rn2(2), rn2(4)[nomul], rn2(500)
 *   AD_COLD  block: rn2(2) inside healmon
 *   passive_obj AD_FIRE/AD_ACID: rn2(6); AD_RUST/AD_CORR: no rn2
 *
 * @ts-nocheck — js sibling; ambient game types not declared.
 */
import { AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_TUCH, AT_STNG, AT_SPIT, AT_BREA, AT_EXPL, AT_BOOM, AT_GAZE, AT_TENT, AT_WEAP, AT_MAGC, AT_HUGS, AT_ENGL } from './const.js'; // monattk.h
import { AT_BUTT } from './const.js';
import { game } from './gstate.js';
import { mon_nam, Monnam } from './do_name.js';
// Preserve legacy import paths while all callers share invent.c's real body.
import { update_inventory } from './invent.js';
export { update_inventory };
import { W_ARMOR, W_ACCESSORY, W_WEP, W_SWAPWEP, A_WIS, IS_DOOR, ROOMOFFSET, OBJ_INVENT, HAND, SEE_INVIS, PLNMSG_GROWL } from './const.js';
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { rn1, pushRngLogEntry } from './rng.js';
import { rn2, rnd, d, rn2_on_display_rng } from './rnd.js';
import { sensemon, canspotmon, canseemon, map_invisible, Deaf, impossible_sync, shieldeff } from './display.js';
import { rank_of } from './botl.js';
import { pline } from './pline.js';
import { exercise, acurr, arti_defn_adtyp, arti_cary_adtyp, change_luck } from './attrib.js';
import { erode_obj } from './trap.js';
import { mon_learns_traps } from './mondata.js';
import { m_carrying } from './mthrowu.js';
/* C obj.h:257 bimanual(otmp).  Placed immediately after the ./trap.js import
 * above because trap.js:95 already imports this same module, so do_wear.js is
 * already evaluated at this point in the DFS and this edge changes no module
 * evaluation order. */
import { bimanual as bimanual_mm, xname } from './do_wear.js';
import { dist2, s_suffix } from './hacklib.js';
import { permonstTemplate, sliparm, monPmname, newmextra, freemcorpsenm } from './makemon.js';
import { attacktype_fordmg, hates_silver, dmgtype_fromattack } from './mondata.js';
import { ureflects } from './muse.js';
import { monflee } from './monmove.js';
import { which_armor } from './worn.js';
import { monnear } from './mon.js';
import { has_oname, ONAME, Upolyd, BOLT_LIM, ECMD_OK, ECMD_TIME, Is_astralevel, In_endgame, ismnum, MALE, FEMALE, NEUTRAL, CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, CORPSTAT_RANDOM,
/* x_monnam article / suppression flags — C ref: nethack-c/include/hack.h:1015-1028 */
ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
SUPPRESS_IT, SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE,
SUPPRESS_MAPPEARANCE, SUPPRESS_NAME, AUGMENT_IT,
W_SADDLE, BLINDED, INVIS, STRANGLED, FREE_ACTION, STUNNED, NOTELL, M_AP_TYPE } from './const.js';
import { impossible } from './steed.js';
import { M_ATTK_HIT, M_ATTK_MISS, M_ATTK_DEF_DIED, NATTK,
/* attack types */
W_ARMG, W_ARMF, W_ARMH, W_ARMC, W_ARM, W_ARMS, W_ARMU, ER_NOTHING,
/* erosion types */
ERODE_BURN, ERODE_RUST, ERODE_CORRODE,
/* erosion flags */
EF_NONE, EF_GREASE, EF_VERBOSE,
/* monster-seen flags */
M_SEEN_ACID, M_SEEN_COLD, M_SEEN_FIRE, M_SEEN_ELEC, M_SEEN_MAGR,
M_SEEN_NOTHING, M_SEEN_SLEEP, M_SEEN_DISINT, M_SEEN_POISON, M_SEEN_REFL,
/* attribute indices */
A_STR, A_DEX, A_CHA,
/* death types */
STONING,
/* property resistances */
ANTIMAGIC, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, POISON_RES, SHOCK_RES, ACID_RES, STONE_RES, DRAIN_RES, BLND_RES, REFLECTING, HALLUC, HALLUC_RES, } from './const.js';
import { PM_FLOATING_EYE, PM_STONE_GOLEM, PM_STEAM_VORTEX, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_SHADE, PM_MARILITH, PM_WINGED_GARGOYLE, PM_BABY_GRAY_DRAGON, PM_FLESH_GOLEM, PM_IRON_GOLEM,
PM_FLAMING_SPHERE, PM_FIRE_VORTEX, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_WATER_ELEMENTAL, PM_FOG_CLOUD, PM_ICE_VORTEX, PM_GLASS_GOLEM, PM_CLAY_GOLEM, PM_GOLD_GOLEM, PM_AIR_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_DUST_VORTEX, PM_ENERGY_VORTEX,
/* x_monnam special-cased forms — C ref: do_name.c:963, 1001, 919/928, 988 */
PM_GHOST, PM_WIZARD_OF_YENDOR, PM_SHOPKEEPER, PM_ARCHEOLOGIST, PM_WIZARD, } from './pm.generated.js';
import { cansee, couldsee, clear_path, is_lightblocker_mappear, does_block, unblock_point } from './vision.js';
import { linedup } from './mthrowu.js';
import { hmon_egg_petrify, touch_petrifies, hmon_hitmon_do_hit, hmon_hitmon_poison, hmon_hitmon_splitmon, hmon_hitmon_msg_hit, hmon_hitmon_msg_silver, hmon_hitmon_msg_lightobj, hmon_hitmon_dmg_recalc, hmon_hitmon_special, _hero_resists, AD_STON, AD_ENCH, AD_CORR, AD_PLYS, AD_STUN, AD_ACID, AD_COLD, AD_ELEC, AD_FIRE, AD_RUST, ARMOR_CLASS, GEM_CLASS, HMON_APPLIED, HMON_KICKED, HMON_MELEE, HMON_THROWN } from './uhitm.js';
import { artifact_hit } from './artifact.js';
import { exclam } from './zap.js';
import { first_weapon_hit, hmon_hitmon_knockback, hmon_hitmon_pet, backstabbable, dynamic_multi_reason } from './uhitm.js';
import { uwep_skill_type, setmnotwielded } from './weapon.js';
import { PM_HEALER as PM_HEALER_HM, PM_ROGUE as PM_ROGUE_HM } from './pm.generated.js';
import { P_NONE as P_NONE_HM, P_KNIFE as P_KNIFE_HM, P_SKILLED as P_SKILLED_HM, NEED_WEAPON as NEED_WEAPON_HM } from './const.js';
import { P_SKILL } from './skills.js';
import { is_flimsy } from './do_wear.js';
import { obj_resists } from './zap.js';
import { m_useupall } from './mthrowu.js';
import { otense, is_poisonable } from './objnam.js';
import { is_art } from './artifact.js';
/* C mon.c:3470 killed() is a one-line wrapper over xkilled(), which lives in
 * js/uhitm.js.  mhitm.js already imports from uhitm.js (mon_nam, dmgval_weapon,
 * ...), so this rides the existing edge rather than adding a new one. */
import { XKILL_NOMSG } from './uhitm.js';
import { xkilled } from './mon.js';
import { XKILL_GIVEMSG } from './const.js';
import { dmgval, weapon_dam_bonus, use_skill, weapon_type, dbon } from './weapon.js';
import { MKOBJ_OC_SKILL, MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { split_mon_ml as split_mon, NON_PM } from './mklev.js';
import { setmangry, wake_msg, wake_nearto, healmon, angry_guards } from './mon.js';
import { obfree } from './shk.js';
import { obj_stop_timers } from './timeout.js';
import { weight } from './weight.js';
import { place_object } from './mkobj.js';
import { explode } from './explode.js';
/* make_stunned — js/potion.js:5813 (C ref: potion.c:106-127) is the one real
 * body; re-export it so js/mcastu.js's `make_stunned as make_stunned_mc`
 * import (mcast_stun_you, its OWN monster-cast-stuns-hero path) also stops
 * seeing this file's stub the moment it is deleted below. */
import { make_stunned } from './potion.js';
export { make_stunned };
import { abuse_dog, sticks } from './dog.js';
import { unstuck } from './mon.js';
/* mbodypart lives in js/cmd.js:33308 (the only real body in js/; js/makemon.js
 * exports a throw-stub and js/shk.js a "hand" constant).  cmd.js already
 * imports from this file, so this is a cycle — safe because mbodypart is a
 * hoisted function declaration and is only called at runtime. */
import { mbodypart, Breathless, body_part, is_pole } from './cmd.js';
import { set_msg_xy } from './pline.js';
import { dry_a_towel } from './weapon.js';
import { growl_sound } from './sounds.js';
import { a_gname_at } from './pray.js';
import { newsym as _wakeup_newsym } from './display.js';
import { objdescr_is as objdescr_is_real } from './o_init.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { getObjDescr, just_an, The, vtense, cxname, mshot_xname, Yobjnam2, makeplural } from './objnam.js';
import { newoextra } from './mkobj.js';
import { lcase } from './hacklib.js';
import { str_start_is } from './hacklib.js';   /* C hacklib.c:276 — title_to_mon's prefix test */
import { ROLE_RANKS } from './rank_data.js'; /* C role.c roles[].rank[9] */
import { ROLE_PM_MNUM } from './roles.js';   /* C role.c roles[].mnum (the mons[] index) */
/* x_monnam's priest/minion and hallucination branches — C ref: do_name.c:887-904,
 * 950-955.  priestname() is ported (js/priest.js:424); rndmonnam()/bogon_is_pname()
 * are not yet, and self-report if a hallucinating name is ever requested. */
import { rndmonnam, bogon_is_pname } from './do_name.js';
import { priestname, temple_occupied, has_shrine } from './priest.js';
/* x_monnam's shopkeeper branch — C ref: do_name.c:919-936. */
import { shkname, hot_pursuit } from './dokick.js';
import { free_oname } from './do_name.js';
import { nomul } from './hack.js';
import { monstseesu, monstunseesu, buzz } from './mcastu.js';
import { resist, drain_item, hit } from './zap.js';
import { finish_meating, dmgtype as dmgtype_real } from './dogmove.js';
import { FAINTED, M_AP_NOTHING, PRONOUN_HALLU, TEMPLE, TRUE, FALSE } from './const.js';
import { in_rooms } from './hack.js';
import { PM_SAMURAI as PM_SAMURAI_HM, PM_ELF as PM_ELF_HM } from './pm.generated.js';
/* C end.c:185-300 done_in_by — use the canonical death attribution path.
 * mhitm's local no-op used to discard the stoning killer, leaving the
 * tombstone/scoreline without the attacking monster.  end.js already exposes
 * the synchronous body used by mhitu's lethal damage paths; this wrapper
 * avoids a second implementation. */
import { done_in_by as done_in_by_real } from './end.js';
import { polymon, ugolemeffects } from './polyself.js';

/* ---------------------------------------------------------------------------
 * Attack-type constants (monattk.h) — inlined as locals since const.js
 * doesn't export them yet.
 * ---------------------------------------------------------------------------
 */
/* monattk.h:20-26 — the 5.0 values.  This block used to stop at AT_HUGS and
 * every arm below that needed one of these spelled a NUMBER instead, and the
 * numbers it spelled were NetHack 3.7's (AT_SPIT 7, AT_EXPL 8, AT_BOOM 9,
 * AT_GAZE 10, AT_ENGL 13).  5.0 renumbered the whole tail. */
const AD_SLEE = 4;
/* ---------------------------------------------------------------------------
 * attk_protection — C ref: nethack-c/src/mhitm.c:1475-1512
 * Maps an attack type to the worn-armor slot that provides protection.
 * Returns the W_ARM* bitmask (0 = no defense, ~0 = fully protected/special).
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function attk_protection(aatyp) {
    switch (aatyp) {
        case AT_NONE:
        case AT_SPIT:
        case AT_EXPL:
        case AT_BOOM:
        case AT_GAZE:
        case AT_BREA:
        case AT_MAGC:
            return ~0; /* special: no defense needed */
        case AT_CLAW:
        case AT_TUCH:
        case AT_WEAP:
            return W_ARMG; /* needs weapon/gauntlets check */
        case AT_KICK:
            return W_ARMF;
        case AT_BUTT:
            return W_ARMH;
        case AT_HUGS:
            return (W_ARMC | W_ARMG); /* attacker needs both to be protected */
        case AT_BITE:
        case AT_STNG:
        case AT_ENGL:
        case AT_TENT:
        default:
            return 0; /* no defense */
    }
}
/* ---------------------------------------------------------------------------
 * Stub helpers — side-effects not yet ported; no RNG inside these stubs.
 * The stubs are intentionally empty; the RNG-critical calls are in passive()
 * itself and passive_obj() below, not in the side-effect helpers.
 * ---------------------------------------------------------------------------
 */
import { mdamageu } from './mhitu.js';
import { drain_pending_death_in_place } from './fastforward.js';
import { pending_death_is_final } from './end.js';
/* C mondata.c:1558-1583: learning and forgetting share mcastu's observer
 * filtering, including the monster's current data for see-invisible. */
export { monstunseesu };
/* shieldeff — MODULE-LOCAL STUB DELETED.  The magic-shield shimmer
 * (C ref: display.c:1109-1122) is DISPLAY-ONLY and RNG-free: it paints
 * SHIELD_COUNT glyph frames then restores the original with newsym(), so it
 * cannot change any recorded observable.  js/mcastu.js:309 already carries
 * this exact no-op deliberately (see its comment); import it instead of
 * duplicating a second copy here — behaviourally identical, one fewer stub
 * to shadow a real port later. */
/* ugolemeffects — GENUINE PORT (no real body existed anywhere in js/;
 * js/mhitu.js:424 carries its own separate no-op stub).
 * C ref: polyself.c:2159-2185 void ugolemeffects(int damtype, int dam)
 * RNG-free. */
export { ugolemeffects };
/* xname/cxname — C objnam.c:574 / :1920.  Both were private best-effort copies
 * here (xname returned "" outright; cxname returned the shuffled appearance
 * description).  js/objnam.js now carries the real xname_flags() body, so both
 * resolve there; see the import at the head of this file. */
/* C ref: hacklib.c:343-359 s_suffix — THE body now lives in js/hacklib.js,
 * which is where C keeps it and which is a leaf module every caller can reach.
 * Re-exported here because six modules already import s_suffix from THIS file
 * (js/eat.js, js/zap.js, js/dog.js, js/makemon.js, js/dogmove.js, js/uhitm.js)
 * and the import path is not what this change is about. */
export { s_suffix };

/* ===========================================================================
 * The x_monnam family — C ref: nethack-c/src/do_name.c:826-1165.
 * ===========================================================================
 */

const M_AP_TYPMASK = 0x7;
/* C ref: nethack-c/include/monflag.h:101-103,141,194 */
const M1_MINDLESS = 0x00010000;
const M1_ANIMAL = 0x00040000;


function xm_same_monst(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const ai = ('m_id' in a) ? a.m_id : undefined;
    const bi = ('m_id' in b) ? b.m_id : undefined;
    return ai != null && bi != null && (ai | 0) === (bi | 0);
}
/* C: `mtmp == &gy.youmonst`.  nethack-c/src/polyself.c:44 sets
 * gy.youmonst.m_id = 1 outright and next_ident() reserves id 1, so no real
 * monster can collide; js/polyself.js:212 mirrors that. */
export function is_youmonst(mtmp) {
    return xm_same_monst(mtmp, (game && game.youmonst) ? game.youmonst : null);
}

/* C ref: nethack-c/include/youprop.h:116-120 Hallucination. */
function xm_Hallucination() {
    const up = game.u && game.u.uprops;
    const HHallucination = (up && up[HALLUC]) ? (up[HALLUC].intrinsic || 0) : 0;
    const HHalluc_resistance = (up && up[HALLUC_RES]) ? (up[HALLUC_RES].intrinsic || 0) : 0;
    const EHalluc_resistance = (up && up[HALLUC_RES]) ? (up[HALLUC_RES].extrinsic || 0) : 0;
    return !!(HHallucination && !(HHalluc_resistance || EHalluc_resistance));
}
/* C ref: nethack-c/include/youprop.h:103 Blind. */
function xm_Blind() {
    const up = game.u && game.u.uprops;
    const p = up ? up[BLINDED] : null;
    if (!p) return false;
    return !!(((p.intrinsic || 0) || (p.extrinsic || 0)) && !(p.blocked || 0));
}



export function xm_has_mgivenname(mtmp) {
    if (!mtmp) return false;
    if ('has_mgivenname' in mtmp) return !!mtmp.has_mgivenname;
    if ('mextra' in mtmp && mtmp.mextra && mtmp.mextra.mgivenname != null) return true;
    return ('mgivenname' in mtmp) && mtmp.mgivenname != null;
}














/* ── distant_monnam ──────────────────────────────────────────────────────
 * C ref: nethack-c/src/do_name.c (ground truth)
 * Port of distant_monnam — obfuscates high priest(ess) on Astral Plane
 * unless adjacent or hallucinating.
 * ─────────────────────────────────────────────────────────────────────── */
const PM_HIGH_CLERIC = 276;













/* ---------------------------------------------------------------------------
 * hcolor — C ref: nethack-c/src/do_name.c:1460-1467
 * Returns a hallucinated color or the provided color preference.
 * RNG: rn2_on_display_rng(SIZE(hcolors)) if Hallucination or !colorpref
 * ---------------------------------------------------------------------------
 */
import { hcolor, nextmbuf, currentmbuf } from './do_name.js'; // C do_name.c:1461; single body lives in do_name.js
export { hcolor };



import monsPack from './makemon_mons.json' with { type: 'json' };
import { LEVITATION, FLYING, STEALTH, I_SPECIAL, FROMOUTSIDE } from './const.js';
















/* ---------------------------------------------------------------------------
 * free_oname — C ref: nethack-c/src/do_name.c:80-88
 * Frees the oname (object custom name) if it exists.
 * No RNG.
 * ---------------------------------------------------------------------------
 */







/* Helper: mindless — C mondata.h:64 mindless(ptr) = (mflags1 & M1_MINDLESS) != 0.
 * M1_MINDLESS is monflag.h:101 == 0x00010000; uses the file-level constant
 * declared above (there must be exactly one copy per file). */
function mindless(mdata) {
    if (!mdata) return false;
    const mflags1 = (mdata.mflags1 | 0);
    return (mflags1 & M1_MINDLESS) !== 0;
}


/* C do_name.c:1367 Monnam — upstart(mon_nam(mon)); mon_nam is imported above. */
function Monnam_mm(mon) {
    return Monnam(mon);
}


/* C mhitm.c:40-71 — reveal both combatants before hit/miss feedback,
 * even when the hero cannot see the fight. */
export function pre_mm_attack(magr, mdef) {
    let showit = false;
    const vis = !!game.v?.vis;
    if ((mdef.m_ap_type | 0) & M_AP_TYPMASK) { /* C M_AP_TYPE(mdef) */
        seemimic(mdef);
        showit ||= vis;
    } else if (mdef.mundetected) {
        mdef.mundetected = 0;
        showit ||= vis;
    }
    if ((magr.m_ap_type | 0) & M_AP_TYPMASK) { /* C M_AP_TYPE(magr) */
        seemimic(magr);
        showit ||= vis;
    } else if (magr.mundetected) {
        magr.mundetected = 0;
        showit ||= vis;
    }
    if (vis) {
        if (!canspotmon(magr)) map_invisible(magr.mx, magr.my);
        else if (showit) _wakeup_newsym(magr.mx, magr.my);
        if (!canspotmon(mdef)) map_invisible(mdef.mx, mdef.my);
        else if (showit) _wakeup_newsym(mdef.mx, mdef.my);
    }
}


/* Async attack boundary for callers that can preserve C's retaliation order.
 * The base wakeup() remains synchronous because mintrap, collision, and mimic
 * paths are synchronous; those callers cannot await ghod_hitsu without a
 * broad control-flow conversion. */
export async function wakeup_attack(mtmp, via_attack) {
    /* wakeup()'s own was_peaceful (mon.c:4350): setmangry() clears mpeaceful,
     * so it must be sampled before the call, not after. */
    const was_peaceful = mtmp.mpeaceful;
    await wakeup(mtmp, via_attack, true);
    if (via_attack && was_peaceful && mtmp.ispriest
        && in_rooms(mtmp.mx, mtmp.my, TEMPLE).length) /* C mon.c:4357 */
        await ghod_hitsu(mtmp);
}


/* HMON_xxx (hack.h) */
const _OCLASS_WEAPON = 2, _OCLASS_TOOL = 6, _OCLASS_GEM = 13;


function _oc_skill_hmon(otmp) {
    return MKOBJ_OC_SKILL[(otmp.otyp | 0)] | 0;
}
/* C obj.h:245 is_missile: (WEAPON||TOOL) && oc_skill in [-P_BOOMERANG(-25)..-P_DART(-23)] */
function _is_missile_hmon(otmp) {
    const o = otmp.oclass | 0;
    const sk = _oc_skill_hmon(otmp);
    return (o === _OCLASS_WEAPON || o === _OCLASS_TOOL) && sk >= -25 && sk <= -23;
}
/* C obj.h:238 is_ammo: (WEAPON||GEM) && oc_skill in [-P_CROSSBOW(-22)..-P_BOW(-20)] */
function _is_ammo_hmon(otmp) {
    const o = otmp.oclass | 0;
    const sk = _oc_skill_hmon(otmp);
    return (o === _OCLASS_WEAPON || o === _OCLASS_GEM) && sk >= -22 && sk <= -20;
}
/* C obj.h:242 matching_launcher / ammo_and_launcher */
function _ammo_and_launcher_hmon(a, l) {
    return _is_ammo_hmon(a) && !!l && _oc_skill_hmon(a) === -_oc_skill_hmon(l);
}







/* uhitm.c:1437 hmon_hitmon_dmg_recalc — strength + skill bonuses (no RNG) */
async function _hmon_hitmon_dmg_recalc(hmd, obj, u, uwep) {
    let dmgbonus = 0;
    if (hmd.get_dmg_bonus) {
        dmgbonus = (u.udaminc | 0);
        if (hmd.thrown !== HMON_THROWN
            || !obj || !uwep || !_ammo_and_launcher_hmon(obj, uwep)) {
            let strbonus = dbon();
            const absbonus = Math.abs(strbonus);
            const sgn = (strbonus > 0) ? 1 : (strbonus < 0) ? -1 : 0;
            if (hmd.twohits)
                strbonus = (((3 * absbonus + 2) / 4) | 0) * sgn;
            else if (hmd.thrown === HMON_MELEE && uwep && bimanual_mm(uwep))
                strbonus = (((3 * absbonus + 1) / 2) | 0) * sgn;
            dmgbonus += strbonus;
        }
    }
    if (hmd.use_weapon_skill) {
        let skillwep = obj;
        if ((_is_ammo_hmon(obj) || _is_missile_hmon(obj)) && _ammo_and_launcher_hmon(obj, uwep))
            skillwep = uwep;
        dmgbonus += await weapon_dam_bonus(skillwep);
        if (hmd.train_weapon_skill) {
            const wtype = hmd.thrown ? weapon_type(skillwep) : weapon_type(uwep);
            await use_skill(wtype, 1);
        }
    }
    hmd.dmg += dmgbonus;
    if (hmd.dmg < 1)
        hmd.dmg = 1;
}


/* C dog.c:1371 abuse_dog — defined in js/dog.js, which imports yelp/growl from
 * here; the cycle is runtime-only and both sides are hoisted declarations, the
 * same shape as this file's existing mklev.js / uhitm.js edges. */
/* uhitm.c:1589 hmon_hitmon_pet — the real body is js/uhitm.js's (it also
 * keeps a zero-HP pet visible to abuse_dog's newsym); imported above. */

/* uhitm.c:1638 hmon_hitmon_msg_hit — message only, no RNG / no state-diff */
function _hmon_hitmon_msg_hit(hmd, mon, obj) {
    /* C uhitm.c:1640-1642: the killing missile of a multishot volley still
     * gets its 'The 1st <missile> hits <mon>.' line. */
    const _ms = game.gm?.m_shot || {};
    if (!hmd.hittxt && (!hmd.destroyed
            || (hmd.thrown && (_ms.n | 0) > 1 && obj && (_ms.o | 0) === (obj.otyp | 0)))) {
        if (hmd.thrown)
            hit(mshot_xname(obj), mon, exclam(hmd.dmg));
    }
}



/* cxname(obj) — C ref: nethack-c/src/objnam.c:1920-1927.  Was a private
 * best-effort copy here (it returned the object's shuffled appearance
 * description) because there was no live xname() anywhere in js/.  There is
 * now: js/objnam.js exports both cxname() and xname(), and this file imports
 * them at the top.  The one C-visible difference from the old copy is that the
 * real cxname() routes a CORPSE through corpse_xname(). */

/* Macro: m_next2u — C ref: nethack-c/include/you.h
 * Checks if monster is adjacent to hero (distance <= 2).
 * Expands to: distu(m->mx, m->my) <= 2
 * distu returns distance squared.
 */
function m_next2u(m) {
    const u = game.u;
    if (!u) return false;
    const dx = (u.ux | 0) - (m.mx | 0);
    const dy = (u.uy | 0) - (m.my | 0);
    const dist_sq = (dx * dx + dy * dy) | 0;
    return dist_sq <= 2;
}









/* Helper: haseyes — C macro: (ptr->mflags1 & M1_NOEYES) == 0 */
function haseyes(mdata) {
    if (!mdata) return true; /* no data: assume has eyes */
    const mflags1 = (mdata.mflags1 | 0);
    const M1_NOEYES = 0x00001000;
    return (mflags1 & M1_NOEYES) === 0;
}








const SPBOOK_CLASS = 10;
const TOOL_CLASS = 6;










/* C obj.h:249 is_weptool(o) — a tool with a non-zero weapon skill. */
export function is_weptool(obj) {
    return !!obj && (obj.oclass | 0) === TOOL_CLASS
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) !== 0;
}




/* christen_monst — C do_name.c:133; single body lives in do_name.js */
export { christen_monst } from './do_name.js';




function is_undead(ptr) {
    return ptr && ((ptr.mflags2 | 0) & 0x00000002 /* M2_UNDEAD */) !== 0;
}

/* helpless(mon) — C ref: nethack-c-v5/upstream/include/monst.h:251, the ONLY
 * definition in the 5.0 tree:
 *     #define helpless(mon) ((mon)->msleeping || !(mon)->mcanmove)
 * This body also OR'd in mstun, mconf and mfrozen.  mfrozen was redundant
 * (mfrozen > 0 implies !mcanmove), but mstun and mconf are not: they made an
 * awake, mobile, merely stunned or confused monster read as helpless, so
 * check_caitiff() below charged a lawful Knight `You("caitiff!")` + adjalign(-1)
 * on an attack C does not penalise.  The other two spellings of this macro in js/
 * (shk.js:2404 and monmove.js:2736 helpless_mv) agree with C; this was the
 * outlier, which is why it is corrected here and EXPORTED rather than copied a
 * fourth time -- js/uhitm.js do_attack and js/dog.js keepdogs now import it. */
export function helpless(mon) {
    return !!(mon.msleeping || !mon.mcanmove);
}

/* C mhitm.c:1223-1260 sleep_monst()/slept_monst().  Preserve the resistance
 * check order: only the final resist() check consumes RNG. */
export async function sleep_monst(mon, amt, how) {
    const apType = M_AP_TYPE(mon);
    if ((how | 0) >= 0 && !mon.msleeping && !(mon.mfrozen | 0)
        && (mon.data?.mlet | 0) === 13 /* S_MIMIC */
        && (apType === 1 /* M_AP_FURNITURE */ || apType === 2 /* M_AP_OBJECT */))
        seemimic(mon);

    if (Resists_Elem(mon, SLEEP_RES) || defended(mon, AD_SLEE)
        || ((how | 0) >= 0 && await resist(mon, how | 0, 0, NOTELL))) {
        shieldeff(mon.mx | 0, mon.my | 0);
    } else if (mon.mcanmove) {
        finish_meating(mon);
        amt = (amt | 0) + (mon.mfrozen | 0);
        if (amt > 0) {
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

/* Sleeping holders release the hero; sleeping engulfers do not. */
export async function slept_monst(mon) {
    if (helpless(mon) && mon === game.u?.ustuck
        && !sticks(game.youmonst.data) && !game.u.uswallow) {
        set_msg_xy(mon.mx, mon.my); /* C mhitm.c:1254 pline_mon() */
        await pline(`${s_suffix(Monnam_mm(mon))} grip relaxes.`);
        await unstuck(mon);
    }
}



const CREAM_PIE = 287;






/* C do_name.c:1321 obj_pmname lives in js/do_name.js; re-exported for callers. */
export { obj_pmname } from './do_name.js';
const PM_ALIGNED_CLERIC = 275; // class-monster row, re-exported below (pm.generated.js dedup)






const PM_WATCHMAN = 282;                 /* was 236 = yeti */
const BUFSZ = 256;



/* C pline.c You(line, ...) and attrib.c:1304 adjalign(n).  Both were
 * throw-stubs here while a complete body of each lives elsewhere in js/ —
 * js/eat.js:2794 You() and js/attrib.js:451 adjalign() — the
 * "UNPORTED-CALLEE names a complete port" shape.  check_caitiff() is this
 * module's only caller of either and had no call site of its own, so nothing
 * ever hit them; wiring check_caitiff into js/uhitm.js's do_attack made both
 * live and each halted the scored run in turn. */
/* C pline.c You(line, ...) := pline("You " line) — an IMMEDIATE topline write.
 * This was a throw-stub.  js/eat.js:2794 also exports a `You`, but that one
 * appends to `game._resultMessage`, the command-RESULT channel that is merged
 * after the command finishes (its own header says so and says the timing is
 * deliberate) — so routing check_caitiff through it puts "You caitiff!" AFTER
 * "You hit it." instead of before, which is the wrong topline.  C's You is a
 * pline, so this is a pline.
 *
 * adjalign is js/attrib.js:451's complete body; the stub here shadowed it for
 * this module.  Neither had a live caller until check_caitiff got one. */
import { adjalign } from './attrib.js';
import { ENV } from './hostenv.js';
import { You } from './pline.js'; export { You };
import { Resists_Elem, can_blnd, defended, mon_hates_blessings, mon_hates_silver, poly_when_stoned, pronoun_gender } from './mondata.js'; // relocate-fns
import { growl } from './sounds.js'; // relocate-fns
import { nh_getenv } from './options.js'; // relocate-fns
import { ghod_hitsu } from './priest.js'; // relocate-fns
import { seemimic, wakeup } from './mon.js'; // relocate-fns
import { TELL, XKILL_NOCORPSE } from './const.js'; // relocate-fns
import { x_monnam } from './do_name.js'; // relocate-fns
import { newcham, pm_to_cham, shieldeff_mon } from './mon.js'; // relocate-fns
import { attacktype, resists_magm } from './mondata.js'; // relocate-fns
import { pline_mon } from './pline.js'; // relocate-fns
import { rloc, tele, tele_restrict } from './teleport.js'; // relocate-fns
import { monkilled_trap } from './trap.js'; // relocate-fns
import { AT_BREA_UH, AT_MAGC_UH, DEADMONSTER, NON_PM_UH, RLOC_MSG } from './uhitm.js'; // relocate-fns
import { snuff_lit } from './apply.js'; // relocate-fns
import { is_pole as is_pole_dm } from './cmd.js'; // relocate-fns
import { BLINDED as BLINDED_DM, ERODE_NONE, IRONBARS, IS_OBSTRUCTED, IS_TREE, M_ATTK_AGR_DIED, NO_NC_FLAGS, PASSES_WALLS, PLNMSG_HIDE_UNDER as PLNMSG_HIDE_UNDER_C, STRAT_WAITMASK, engulfing_u as engulfing_u_const } from './const.js'; // relocate-fns
import { Unaware, _more_never_dismissed, _topline_more_pending, flush_pending_messages, flush_screen, mon_visible, newsym } from './display.js'; // relocate-fns
import { Adjmonnam as Adjmonnam_gz, a_monnam, hliquid, mon_nam_too, noit_mon_nam, noname_monnam, some_mon_nam } from './do_name.js'; // relocate-fns
import { ARTICLE_THE_DM, DEADMONSTER_dm, M1_AMORPHOUS_DM, MONS_MSIZE, MON_WEP_dm, MZ_HUGE, M_ATTK_AGR_DONE$, Monnam_dm, NC_SHOW_MSG_DG, NEED_HTH_WEAPON$, NEED_WEAPON$, PM_FIRE_ELEMENTAL_DM, PM_GRID_BUG_DG, PM_SALAMANDER_DM, SILVER_DM, S_VORTEX, _MONS, _PM_FLOATING_EYE, _conflict_dm, _is_elf, _mf1, _mf2, _noncorporeal, distmin_dogmove, helpless_dm, is_rider_dm, ismnum_js, m_at_dm, mhis_dm, mon_nam_dm, mon_offmap_dm, mondied_dm, objects_material_dm, passes_walls, resists_ston_dm, touch_petrifies_dm, unsolid_dm } from './dogmove.js'; // relocate-fns
import { mon_explodes as mon_explodes_dm } from './explode.js'; // relocate-fns
import { grow_up, nonliving } from './makemon.js'; // relocate-fns
import { perceives as perceives_dm } from './mcastu.js'; // relocate-fns
import { could_seduce, getmattk, mon_mattk_raw, mswings_verb, mtrapped_in_pit } from './mhitu.js'; // relocate-fns
import { clone_mon_ml as clone_mon, slimeproof, split_mon_ml } from './mklev.js'; // relocate-fns
import { healmon as healmon_dg, minliquid as minliquid_real, mon_givit as mon_givit_dg, mon_to_stone, mondead, monstone, set_ustuck, zombie_form, zombie_maker } from './mon.js'; // relocate-fns
import { dmgtype, resist_conflict, resists_blnd as resists_blnd_gz, stagger as stagger_dm } from './mondata.js'; // relocate-fns
import { closed_door, itsstuck } from './monmove.js'; // relocate-fns
import { breamm as breamm_mu, spitmm, thrwmm } from './mthrowu.js'; // relocate-fns
import { makeplural as makeplural_dm, simpleonames } from './objnam.js'; // relocate-fns
import { You_hear } from './pline.js'; // relocate-fns
import { PM_ARCHON, PM_BLACK_PUDDING, PM_BROWN_PUDDING, PM_GREEN_SLIME, PM_MEDUSA, PM_PAPER_GOLEM, PM_STRAW_GOLEM } from './pm.generated.js'; // relocate-fns
import { update_monster_region } from './region.js'; // relocate-fns
import { place_monster } from './steed.js'; // relocate-fns
import { acid_damage, mintrap as mintrap_real, t_at } from './trap.js';
import { goodpos as goodpos_real } from './teleport.js'; // relocate-fns
import { erode_armor, m_at, mhitm_ad_blnd as mhitm_ad_blnd_gz, mhitm_adtyping, mhitm_knockback, shade_miss as shade_miss_hm } from './uhitm.js';
import { golemeffects as golemeffects_pm } from './mon.js'; // relocate-fns
import { hitval, mon_wield_item, possibly_unwield } from './weapon.js'; // relocate-fns
import { place_worm_tail_randomly, remove_worm } from './worm.js'; // relocate-fns
import { find_mac as find_mac_mon } from './worn.js'; // relocate-fns
import { _mon_reflects_zap as mon_reflects_dm } from './zap.js'; // relocate-fns
export { Adjmonnam, Amonnam, Some_Monnam, YMonnam, coyotename, distant_monnam, hliquid, l_monnam, m_monnam, mon_nam_too, new_oname, noit_Monnam, noit_mon_nam, objtyp_is_callable, rndghostname, rndorcname, roguename, some_mon_nam, x_monnam, y_monnam } from './do_name.js'; // relocate-fns
export { M_AP_TYPMASK, TOOL_CLASS, xm_same_monst }; // relocate-fns
export { killed, seemimic, wakeup } from './mon.js'; // relocate-fns
export { check_caitiff, erode_armor, hmon, hmon_hitmon, passive, shade_miss } from './uhitm.js'; // relocate-fns
export { SPBOOK_CLASS, _OCLASS_WEAPON, _ammo_and_launcher_hmon, _is_ammo_hmon, _is_missile_hmon, _oc_skill_hmon, m_next2u }; // relocate-fns
export { domindblast, float_vs_flight } from './polyself.js'; // relocate-fns
export { title_to_mon } from './botl.js'; // relocate-fns
export { ghod_hitsu } from './priest.js'; // relocate-fns
export { mon_has_amulet } from './wizard.js'; // relocate-fns
export { growl } from './sounds.js'; // relocate-fns
export { Monnam_mm }; // relocate-fns
export { Resists_Elem, attacktype, big_to_little, breakarm, can_be_strangled, can_blnd, can_blow, can_track, cvt_prop_to_mseenres, defended, get_atkdam_type, levl_follower, little_to_big, locomotion, max_passive_dmg, mon_hates_blessings, mon_hates_silver, mons_see_trap, name_to_monplus, num_horns, on_fire, passes_bars, poly_when_stoned, pronoun_gender, raceptr, resist_conflict, resists_blnd, resists_drli, resists_magm, same_race, stagger } from './mondata.js'; // relocate-fns
export { AD_ACID, AD_COLD, AD_ELEC, AD_FIRE, AD_RUST, ARMOR_CLASS, AT_BITE, AT_BOOM, AT_BREA, AT_BUTT, AT_CLAW, AT_ENGL, AT_EXPL, AT_GAZE, AT_HUGS, AT_KICK, AT_MAGC, AT_NONE, AT_SPIT, AT_STNG, AT_TUCH, AT_WEAP, CREAM_PIE, M1_ANIMAL, M1_MINDLESS, NON_PM, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, PM_WATCHMAN, haseyes, is_undead, mindless, xm_Blind, xm_Hallucination }; // relocate-fns
export { adjalign };

const WAND_CLASS_UH = 11;     /* C objclass.h WAND_CLASS */

const M1_TPORT_UH = 0x02000000; /* C monflag.h M1_TPORT */

export function xdrainenergym(mon, givemsg) {
    if ((mon.mspec_used | 0) < 20 /* limit draining */
        && (attacktype(mon.data, AT_MAGC_UH)
            || attacktype(mon.data, AT_BREA_UH))) {
        mon.mspec_used = (mon.mspec_used | 0) + d(2, 2);
        if (givemsg)
            pline_mon(mon, '%s seems lethargic.', Monnam(mon));
    }
}

/* C mhitm.c:1122-1214 mon_poly, monster-defender branch.  The hero branch
 * is already in mhitu.js, reached through mhitm_adtyping_u below. */
export async function mon_poly(magr, mdef, dmg) {
    const oldform = mdef.data;
    const before = Monnam(mdef);
    if (resists_magm(mdef)) {
        /* C mhitm.c:1151-1153 */
        if (game.v?.vis) await shieldeff_mon(mdef);
    } else if (await resist(mdef, WAND_CLASS_UH, 0, TELL)) {
        // General magic resistance leaves the ordinary damage intact.
    } else if (!rn2(25) && mdef.cham === NON_PM_UH
               && (mdef.mcan || pm_to_cham(mdef.data.pmidx) !== NON_PM_UH)) {
        if (game.v?.vis) await pline('%s shudders!', before);
        dmg += Math.trunc((mdef.mhpmax + 1) / 2);
        mdef.mhp -= dmg;
        dmg = 0;
        if (DEADMONSTER(mdef)) {
            if (is_youmonst(magr)) await xkilled(mdef, XKILL_GIVEMSG | XKILL_NOCORPSE);
            else await monkilled_trap(mdef, '');
        }
    } else if (await newcham(mdef, null, 0)) {
        if (game.v?.vis) {
            const was_seen = before.toLowerCase() !== 'it';
            const verbosely = game.flags.verbose || !was_seen;
            const freaky = ' undergoes a freakish metamorphosis';
            if (canspotmon(mdef))
                await pline('%s%s%s turns into %s.', before, verbosely ? freaky : '',
                            verbosely ? ' and' : '', x_monnam(mdef, ARTICLE_A, null,
                                SUPPRESS_NAME | SUPPRESS_IT | SUPPRESS_INVISIBLE, false));
            else if (was_seen || is_youmonst(magr))
                await pline('%s%s%s.', before, freaky, was_seen ? ' and disappears' : '');
        }
        dmg = 0;
        if (magr.data.mflags1 & M1_TPORT_UH) { /* C can_teleport() */
            if (is_youmonst(magr)) await tele();
            else if (!tele_restrict(magr)) await rloc(magr, RLOC_MSG);
        }
    } else if (game.v?.vis && game.flags.verbose) {
        await pline('Nothing happens.');
    }
    if (mdef.data !== oldform && !is_youmonst(magr))
        magr.mspec_used = (magr.mspec_used | 0) + rnd(2);
    return dmg;
}

/* Monster species names — same array as uhitm.js MONS_NAMES.
 * C ref: monsters.h NAM() macro, indexed by PM_xxx (pm.generated.js) value. */
const MONS_NAMES = ["giant ant","killer bee","soldier ant","fire ant","giant beetle","queen bee","acid blob","quivering blob","gelatinous cube","chickatrice","cockatrice","pyrolisk","jackal","fox","coyote","werejackal","little dog","dingo","dog","large dog","wolf","werewolf","winter wolf cub","warg","winter wolf","hell hound pup","hell hound","gas spore","floating eye","freezing sphere","flaming sphere","shocking sphere","kitten","housecat","jaguar","lynx","panther","large cat","tiger","displacer beast","gremlin","gargoyle","winged gargoyle","hobbit","dwarf","bugbear","dwarf lord","dwarf king","mind flayer","master mind flayer","manes","homunculus","imp","lemure","quasit","tengu","blue jelly","spotted jelly","ochre jelly","kobold","large kobold","kobold lord","kobold shaman","leprechaun","small mimic","large mimic","giant mimic","wood nymph","water nymph","mountain nymph","goblin","hobgoblin","orc","hill orc","mordor orc","uruk hai","orc shaman","orc captain","rock piercer","iron piercer","glass piercer","rothe","mumak","leocrotta","wumpus","titanothere","baluchitherium","mastodon","sewer rat","giant rat","rabid rat","wererat","rock mole","woodchuck","cave spider","centipede","giant spider","scorpion","lurker above","trapper","pony","white unicorn","gray unicorn","black unicorn","horse","warhorse","fog cloud","dust vortex","ice vortex","energy vortex","steam vortex","fire vortex","baby long worm","baby purple worm","long worm","purple worm","grid bug","xan","yellow light","black light","zruty","couatl","aleax","angel","ki rin","archon","bat","giant bat","raven","vampire bat","plains centaur","forest centaur","mountain centaur","baby gray dragon","baby gold dragon","baby silver dragon","baby red dragon","baby white dragon","baby orange dragon","baby black dragon","baby blue dragon","baby green dragon","baby yellow dragon","gray dragon","gold dragon","silver dragon","red dragon","white dragon","orange dragon","black dragon","blue dragon","green dragon","yellow dragon","stalker","air elemental","fire elemental","earth elemental","water elemental","lichen","brown mold","yellow mold","green mold","red mold","shrieker","violet fungus","gnome","gnome lord","gnomish wizard","gnome king","giant","stone giant","hill giant","fire giant","frost giant","ettin","storm giant","titan","minotaur","jabberwock","keystone kop","kop sergeant","kop lieutenant","kop kaptain","lich","demilich","master lich","arch lich","kobold mummy","gnome mummy","orc mummy","dwarf mummy","elf mummy","human mummy","ettin mummy","giant mummy","red naga hatchling","black naga hatchling","golden naga hatchling","guardian naga hatchling","red naga","black naga","golden naga","guardian naga","ogre","ogre lord","ogre king","gray ooze","brown pudding","green slime","black pudding","quantum mechanic","genetic engineer","rust monster","disenchanter","garter snake","snake","water moccasin","python","pit viper","cobra","troll","ice troll","rock troll","water troll","olog hai","umber hulk","vampire","vampire lord","vlad the impaler","barrow wight","wraith","nazgul","xorn","monkey","ape","owlbear","yeti","carnivorous ape","sasquatch","kobold zombie","gnome zombie","orc zombie","dwarf zombie","elf zombie","human zombie","ettin zombie","ghoul","giant zombie","skeleton","straw golem","paper golem","rope golem","gold golem","leather golem","wood golem","flesh golem","clay golem","stone golem","glass golem","iron golem","human","","","","elf","woodland elf","green elf","grey elf","elf lord","elvenking","doppelganger","shopkeeper","guard","prisoner","oracle","priest","high priest","soldier","sergeant","nurse","lieutenant","captain","watchman","watch captain","medusa","wizard of yendor","croesus","ghost","shade","water demon","incubus","horned devil","erinys","barbed devil","marilith","vrock","hezrou","bone devil","ice devil","nalfeshnee","pit fiend","sandestin","balrog","juiblex","yeenoghu","orcus","geryon","dispater","baalzebub","asmodeus","demogorgon","death","pestilence","famine","mail daemon","djinni","jellyfish","piranha","shark","giant eel","electric eel","kraken","newt","gecko","iguana","baby crocodile","lizard","chameleon","crocodile","salamander","long worm tail","archeologist","barbarian","caveman","healer","knight","monk","","ranger","rogue","samurai","tourist","valkyrie","wizard","lord carnarvon","pelias","shaman karnov","hippocrates","king arthur","grand master","arch priest","orion","master of thieves","lord sato","twoflower","norn","neferet the green","minion of huhetotl","thoth amon","chromatic dragon","cyclops","ixoth","master kaen","nalzok","scorpius","master assassin","ashikaga takauji","lord surtur","dark one","student","chieftain","neanderthal","attendant","page","abbot","acolyte","hunter","thug","ninja","roshi","guide","warrior","apprentice"];

/* attack_verb_dm — monster-vs-monster hit message lead "<Monnam> <verb>"
 * (or "<Monnam>'s tentacles suck"), or '' when C's hitmm prints NO message.
 * C ref: mhitm.c:673-706 hitmm() switch (mattk->aatyp):
 *   BITE bites / STNG stings / BUTT butts / TUCH touches;
 *   TENT "%s tentacles suck" (s_suffix of Monnam);
 *   HUGS "squeezes" unless magr == u.ustuck, else falls through;
 *   default "hits" ONLY when the blow is not an artifact weapon hit
 *   (!weaponhit || !mwep || !mwep->oartifact) — an artifact weapon's message
 *   is left to artifact_hit() in mhitm_ad_phys (uhitm.js), so hitmm's buf
 *   stays empty and no pline is raised (mhitm.c:698-705).
 * NOTE: AT_KICK has NO case in C's hitmm → falls to default → "hits".
 * This differs from mhitu.c (monster attacks player) where AT_KICK → "kicks". */
function attack_verb_dm(magr, mattk, mwep, magr_name) {
    const aatyp = mattk.aatyp | 0;
    switch (aatyp) {
    case AT_BITE: return magr_name + ' bites';
    case AT_STNG: return magr_name + ' stings';
    case AT_BUTT: return magr_name + ' butts';
    case AT_TUCH: return magr_name + ' touches';
    case AT_TENT: return s_suffix(magr_name) + ' tentacles suck';
    case AT_HUGS:
        if (magr !== game.u.ustuck)
            return magr_name + ' squeezes';
        /* hugging u.ustuck falls through to the default arm (mhitm.c:694-696) */
        break;
    default:
        break;
    }
    /* C mhitm.c:651-653 weaponhit */
    const weaponhit = (aatyp === AT_WEAP || (aatyp === AT_CLAW && mwep));
    if (!weaponhit || !mwep || !mwep.oartifact)
        return magr_name + ' hits';
    return '';
}

const AD_STCK  = 19;  /* monattk.h:61 — sticks to you (mimic) */

const AD_DGST  = 26;  /* monattk.h:68 — digests opponent (trapper, etc.) */

const AD_WRAP  = 28;  /* monattk.h:70 — special "stick" for eels */

const AD_DRIN  = 32;  /* monattk.h:74 — drains intelligence (mind flayer) */

const M2_ORC       = 0x00000080;

function _is_orc(mndx)      { return (_mf2(mndx) & M2_ORC) !== 0; }

const M1_NOEYES_DM = 0x00001000;      /* C monflag.h M1_NOEYES */

const S_TROLL_DM = 46;                /* C defsym.h:347 S_TROLL */

const ART_TROLLSBANE_DM = 17;         /* C artilist.h enum order */

const ART_SNICKERSNEE_DM = 19;        /* C artilist.h enum order */

const Trap_Killed_Mon_DM = 2;         /* C trap.h:101 Trap_Killed_Mon */

/* -----------------------------------------------------------------------
 * passivemm — C ref: nethack-c-v5/upstream/src/mhitm.c:1305-1457
 *
 * Models the RNG consumption of the defender's passive counter-attack after
 * a monster-vs-monster melee (mattackm).  C consumes RNG as follows, in order:
 *
 *   1. find slot i = first mattk[] entry with aatyp == AT_NONE (the passive
 *      slot).  If none in NATTK(=6) slots → no passive attack → NO RNG.
 *      A monster row that lists fewer than NATTK active attacks has the
 *      remaining slots implicitly {AT_NONE, AD_PHYS, 0, 0}, so the passive
 *      slot is the implicit trailing slot {0,0,0,0} unless an explicit
 *      AT_NONE passive (e.g. [0,AD_ACID,1,8]) is listed.
 *   2. tmp roll: if mattk[i].damn  → d(damn, damd)
 *                elif mattk[i].damd → d(mlevel+1, damd)
 *                else tmp=0    (the d() only matters for RNG count)
 *   3. top switch(adtyp):
 *        AD_ACID(8): rn2(2) [iff mhitb], rn2(30), rn2(6); then DONE (goto
 *                    assess_dmg — skips the rn2(3) block)
 *        AD_ENCH / default: no RNG
 *   4. if (mdead || mcan) → return (no rn2(3))
 *   5. rn2(3) — then inner switch consumes more only for the floating-eye
 *      AD_PLYS case: rn2(4).
 *
 * AD constants here use the C monattk.h numbering (AD_PHYS=0, AD_FIRE=2,
 * AD_COLD=3, AD_ELEC=6, AD_ACID=8, AD_PLYS=14) — these are the raw adtyp
 * values stored in MON_MATTK.
 *
 * Cancellation, resistance, damage, golem effects and death are applied below.
 * ----------------------------------------------------------------------- */
const _AD_FIRE = 2, _AD_COLD = 3, _AD_ELEC = 6, _AD_ACID = 8, _AD_ENCH = 41;

const _AD_STUN = 12, _AD_PLYS = 14;

async function passivemm(magr, mdef, mhitb, mdead, mwep) {
    // C mhitm.c:1335-1442: messages block before damage, effects, and RNG.
    const mndx_def = (mdef.mndx ?? mdef.mnum ?? -1) | 0;
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;

    /* C mhitm.c:1317-1322 — find first AT_NONE slot in the fixed NATTK array. */
    const row = mon_mattk_raw(mndx_def); /* array of [aatyp,adtyp,damn,damd] | null */
    let slot = null; /* the passive {aatyp,adtyp,damn,damd}; null ⇒ no passive */
    {
        let i = 0;
        for (; i < NATTK; i++) {
            const a = (row && i < row.length) ? row[i] : [AT_NONE, 0, 0, 0];
            if ((a[0] | 0) === AT_NONE) { /* found the passive slot */
                slot = { adtyp: a[1] | 0, damn: a[2] | 0, damd: a[3] | 0 };
                break;
            }
        }
        if (i >= NATTK) {
            /* no AT_NONE slot in any of the 6 — no passive attacks, no RNG */
            return mdead | mhit;
        }
    }

    const mddat_mlevel = (mndx_def >= 0 && mndx_def < _MONS.length)
        ? (_MONS[mndx_def][1] | 0) : 0;

    /* C mhitm.c:1323-1328 — tmp damage roll (RNG count only). */
    let tmp = 0;
    if (slot.damn) {
        tmp = d(slot.damn, slot.damd);
    } else if (slot.damd) {
        tmp = d(mddat_mlevel + 1, slot.damd);
    }

    /* C mhitm.c:1331-1358 — top switch.  Only AD_ACID / AD_ENCH special-case. */
    if (slot.adtyp === _AD_ACID) {
        /* C:1332-1342 — splash damage also applies after the defender dies. */
        if (mhitb && !rn2(2)) {
            const magr_name = Monnam_dm(magr);
            if (canseemon(magr)) {
                await pline(`${magr_name} is splashed by ${s_suffix(mon_nam_dm(mdef))} ${hliquid('acid')}!`);
            }
            if (Resists_Elem(magr, ACID_RES)) {
                if (canseemon(magr))
                    await pline(`${Monnam_dm(magr)} is not affected.`);
                tmp = 0;
            }
        } else
            tmp = 0;
        /* C mhitm.c:1345-1346 — corrosion applies even if the defender died. */
        if (!rn2(30)) await erode_armor(magr, ERODE_CORRODE);
        if (!rn2(6)) await acid_damage(MON_WEP_dm(magr));
        /* C mhitm.c:1442-1446 assess_dmg */
        magr.mhp = (magr.mhp | 0) - tmp;
        if (magr.mhp <= 0) {
            await monkilled_dm(magr, slot);
            return mdead | mhit | M_ATTK_AGR_DIED;
        }
        return mdead | mhit;
    }
    /* C mhitm.c:1350-1354 case AD_ENCH — disenchanter drains the attacker's
     * weapon (drain_item -> obj_resists rn2(100)); no message. */
    if (slot.adtyp === _AD_ENCH && mhitb && !mdef.mcan && mwep)
        await drain_item(mwep, false);
    /* default: no RNG, fall through */

    /* C mhitm.c:1359-1360 — defender dead/cancelled → no rn2(3). */
    if (mdead || mdef.mcan) {
        return mdead | mhit;
    }

    if (rn2(3)) {
        switch (slot.adtyp) {
            case _AD_PLYS: /* floating eye / gelatinous cube */
                if (tmp > 127)
                    tmp = 127; /* C mhitm.c:1366 */
                if (mndx_def === _PM_FLOATING_EYE) {
                    if (!rn2(4)) /* C mhitm.c:1369 */
                        tmp = 127;
                    /* C mhitm.c:1370-1385: magr->mcansee && haseyes(madat)
                     * && mdef->mcansee && (perceives(madat) || !mdef->minvis)
                     * -> gaze reflected (return) or magr is frozen (return).
                     */
                    const _madat = magr.data || {};
                    const _haseyes_m = !((_madat.mflags1 | 0) & M1_NOEYES_DM);
                    if ((magr.mcansee | 0) && _haseyes_m && (mdef.mcansee | 0)
                        && (perceives_dm(_madat) || !(mdef.minvis | 0))) {
                        /* C mhitm.c:1376-1378: buf = s_suffix(Monnam(mdef)) is
                         * built UNCONDITIONALLY, before the reflection test —
                         * under hallucination Monnam draws rn2_on_display_rng
                         * (rndmonnam), whether or not anyone sees it. */
                        const _gaze_fmt = `${s_suffix(Monnam_dm(mdef)).replace(/%/g, '%%')} gaze is reflected by %s %s.`;
                        if (await mon_reflects_dm(magr, canseemon(magr) ? _gaze_fmt : null)) {
                            if (game._blockingPline) await game._blockingPline;
                            return mdead | mhit;
                        }
                        const _magr_name = Monnam_dm(magr);
                        if (canseemon(magr))
                            await pline(`${_magr_name} is frozen by ${s_suffix(mon_nam_dm(mdef))} gaze!`);
                        paralyze_monst(magr, tmp);
                        return mdead | mhit;
                    }
                } else { /* gelatinous cube, C mhitm.c:1386-1392 */
                    const _magr_name = Monnam_dm(magr);
                    if (canseemon(magr))
                        await pline(`${_magr_name} is frozen by ${mon_nam_dm(mdef)}.`);
                    paralyze_monst(magr, tmp);
                    return mdead | mhit;
                }
                return 1; /* C mhitm.c:1394 */
            case _AD_STUN: /* C mhitm.c:1398-1412 — stunned attacker, no RNG */
                if (!(magr.mstun | 0)) {
                    magr.mstun = 1;
                    if (canseemon(magr))
                        await pline_mon(magr, '%s %s...', Monnam_dm(magr), makeplural_dm(stagger_dm(magr.data, 'stagger')));
                }
                tmp = 0;
                break;
            case _AD_COLD: /* C mhitm.c:1414-1427 */
                if (Resists_Elem(magr, COLD_RES)) {
                    if (canseemon(magr)) {
                        await pline_mon(magr, '%s is mildly chilly.', Monnam_dm(magr));
                        golemeffects_pm(magr, _AD_COLD, tmp);
                    }
                    tmp = 0;
                    break;
                }
                if (canseemon(magr))
                    await pline_mon(magr, '%s is suddenly very cold!', Monnam_dm(magr));
                healmon_dg(mdef, Math.trunc(tmp / 2), Math.trunc(tmp / 2));
                if ((mdef.mhpmax | 0) > (((mdef.m_lev | 0) + 1) * 8))
                    await split_mon_ml(mdef, magr);
                break;
            case _AD_FIRE: /* C mhitm.c:1436-1446 */
                if (Resists_Elem(magr, FIRE_RES)) {
                    if (canseemon(magr)) {
                        await pline_mon(magr, '%s is mildly warmed.', Monnam_dm(magr));
                        golemeffects_pm(magr, _AD_FIRE, tmp);
                    }
                    tmp = 0;
                    break;
                }
                if (canseemon(magr))
                    await pline_mon(magr, '%s is suddenly very hot!', Monnam_dm(magr));
                break;
            case _AD_ELEC: /* C mhitm.c:1447-1458 */
                if (Resists_Elem(magr, SHOCK_RES)) {
                    if (canseemon(magr)) {
                        await pline_mon(magr, '%s is mildly tingled.', Monnam_dm(magr));
                        golemeffects_pm(magr, _AD_ELEC, tmp);
                    }
                    tmp = 0;
                    break;
                }
                if (canseemon(magr))
                    await pline_mon(magr, '%s is jolted with electricity!', Monnam_dm(magr));
                break;
            default:
                tmp = 0;
                break;
        }
    } else
        tmp = 0;
    /* C mhitm.c:1463-1467 assess_dmg */
    magr.mhp = (magr.mhp | 0) - tmp;
    if (magr.mhp <= 0) {
        await monkilled_dm(magr, slot);
        return mdead | mhit | M_ATTK_AGR_DIED;
    }
    return mdead | mhit;
}

const NO_TRAP_FLAGS$ = 0;

export async function fightm(mtmp) {
    const g = game;
    const u = g.u;
    /* C mhitm.c:110-112 — perhaps the monster will resist Conflict. */
    if (resist_conflict(mtmp))
        return 0;
    if (u && u.ustuck === mtmp && await itsstuck(mtmp)) return 0;
    const has_u_swallowed = engulfing_u_const(mtmp);
    let nmon;
    for (let mon = g.fmon; mon; mon = nmon) {
        nmon = mon.nmon;
        if (nmon === mtmp)
            nmon = mtmp.nmon;
        /* C: ignore monsters that are already dead (DEADMONSTER). */
        if (mon !== mtmp && (mon.mhp | 0) > 0) {
            if (monnear(mtmp, mon.mx | 0, mon.my | 0)) {
                if (!(u && u.uswallow) && u && mtmp === u.ustuck) {
                    if (!rn2(4)) {
                        set_ustuck(null);
                        void pline(`${Monnam_dm(mtmp)} releases you!`);
                    } else {
                        break;
                    }
                }
                /* C mhitm.c:139-142 — bhitpos/notonhead are read back by
                 * mattackm's target-still-there guard, so set them first. */
                (g.gb ||= {}).bhitpos = { x: mon.mx | 0, y: mon.my | 0 };
                (g.gn ||= {}).notonhead = false;
                const result = await mattackm(mtmp, mon);
                if (result & M_ATTK_AGR_DIED)
                    return 1; /* mtmp died */
                /* C: if mtmp has the hero swallowed, lie and say no attack. */
                if (has_u_swallowed)
                    return 0;
                /* C mhitm.c:155-166 — attacked monsters get a chance to hit
                 * back (primarily so conflict-resisting monsters can respond). */
                if ((result & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                    && rn2(4) && (mon.movement | 0) > rn2(NORMAL_SPEED_FM)) {
                    if ((mon.movement | 0) > NORMAL_SPEED_FM)
                        mon.movement = (mon.movement | 0) - NORMAL_SPEED_FM;
                    else
                        mon.movement = 0;
                    g.gb.bhitpos = { x: mtmp.mx | 0, y: mtmp.my | 0 };
                    g.gn.notonhead = false;
                    await mattackm(mon, mtmp); /* return attack */
                }
                return (result & M_ATTK_HIT) ? 1 : 0;
            }
        }
    }
    return 0;
}

/* C monattk.h / permonst.h NORMAL_SPEED = 12. */
const NORMAL_SPEED_FM = 12;

export async function mattackm(magr, mdef) {
    let i, tmp, strike = 0, attk, struck = 0;
    let res = new Array(NATTK);
    let dieroll = 0;
    let mattk, alt_attk;
    let mwep;
    let pa, pd;

    if (!magr || !mdef)
        return M_ATTK_MISS;
    if (helpless_dm(magr))
        return M_ATTK_MISS;
    pa = magr.data;
    pd = mdef.data;

    /* Grid bugs cannot attack at an angle. */
    if (pa && (magr.mnum === PM_GRID_BUG_DG)
        && magr.mx !== mdef.mx && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* Calculate the armour class differential. */
    tmp = find_mac_dm(mdef) + (magr.m_lev | 0);
    if (mdef.mconf || helpless_dm(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    /* C mhitm.c:327-351 — reveal an attacked hider.  noname_monnam and
     * a_monnam use the shared x_monnam port, including hallucination RNG. */
    if (mdef.mundetected) {
        mdef.mundetected = 0;
        newsym(mdef.mx, mdef.my);
        if (canseemon(mdef) && !sensemon_dm(mdef)) {
            if (Unaware()) {
                /* C: justone = (mdef->data->geno & G_UNIQ) != 0 */
                const justone = ((pd && (pd.geno & 0x1000)) ? 1 : 0);
                let montype = noname_monnam(mdef, justone ? ARTICLE_THE_DM : ARTICLE_NONE);
                if (!justone) montype = makeplural_dm(montype);
                pline('You dream of ' + montype + '.');
            } else {
                const last_msg = game.iflags?.last_msg | 0;
                const last_hider = game.l?.last_hider | 0;
                const PLNMSG_HIDE_UNDER = PLNMSG_HIDE_UNDER_C;
                if (last_msg === PLNMSG_HIDE_UNDER && mdef.m_id === last_hider)
                    pline_mon(mdef, '%s emerges from hiding.', Monnam_dm(mdef));
                else if (mdef.m_id === last_hider)
                    pline('You notice ' + mon_nam_dm(mdef) + '.');
                else
                    pline('Suddenly, you notice ' + a_monnam(mdef) + '.');
            }
        }
    }

    /* Elves hate orcs. */
    if (pa && pd && is_elf_dm(pa) && is_orc_dm(pd))
        tmp++;

    /* Set up the visibility of action */
    {
        let spot_magr = canspotmon(magr);
        let spot_mdef = canspotmon(mdef);
        game.v = game.v || {};
        game.v.vis = ((cansee(magr.mx, magr.my) && spot_magr)
                      || (cansee(mdef.mx, mdef.my) && spot_mdef)) ? 1 : 0;
    }

    /* Set flag indicating monster has moved this turn. */
    magr.mlstmv = (game.moves ?? 0) | 0;

    /* skipdrin - mind flayer tentacle DRIN reduction */
    game.s = game.s || {};
    game.s.skipdrin = 0;

    /* Now perform all attacks for the monster. */
    for (i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;

        /* C mhitm.c:380-383 — target might no longer be there:
         *   if (i > 0 && (m_at(gb.bhitpos.x, gb.bhitpos.y) != mdef
         *                 || DEADMONSTER(magr) || DEADMONSTER(mdef)))
         *       continue;
         * gb.bhitpos is set by the CALLER (dogmove.c:1200, 1216) to the square
         * being attacked.  The previous code read `game.b?.bhitpos`, a global
         * that does not exist in this port (the repo spells it `game.gb`), and
         * resolved m_at through a `return null` stub, so this guard was
         * unconditionally true for every i>0 and silently dropped every attack
         * after the first — including its rnd(20+i) to-hit roll. */
        if (i > 0) {
            const bhit = game.gb?.bhitpos || { x: 0, y: 0 };
            if (m_at_dm(bhit.x | 0, bhit.y | 0) !== mdef
                || DEADMONSTER_dm(magr) || DEADMONSTER_dm(mdef))
                continue;
        }

        /* C mhitm.c:383 getmattk(magr, mdef, i, res, &alt_attk) — the one
         * C-faithful body in js/mhitu.js; mdef is never the hero here. */
        mattk = getmattk(magr, false, mdef, i, res);
        if (!mattk) continue;
        if (game.s.skipdrin && mattk.aatyp === AT_TENT && mattk.adtyp === AD_DRIN)
            continue;
        mwep = null;
        attk = 1;

        switch (mattk.aatyp) {
        case AT_WEAP:
            if (distmin_dogmove(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                strike = (await thrwmm(magr, mdef) === M_ATTK_MISS) ? 0 : 1;
                if (strike)
                    res[i] |= M_ATTK_HIT;
                if (DEADMONSTER_dm(mdef))
                    res[i] = M_ATTK_DEF_DIED;
                if (DEADMONSTER_dm(magr))
                    res[i] |= M_ATTK_AGR_DIED;
                break;
            }
            if (magr.weapon_check === NEED_WEAPON$ || !MON_WEP_dm(magr)) {
                magr.weapon_check = NEED_HTH_WEAPON$;
                if (await mon_wield_item(magr) !== 0)
                    return M_ATTK_MISS;
            }
            await possibly_unwield(magr, false);
            mwep = MON_WEP_dm(magr);
            if (mwep) {
                if (game.v?.vis)
                    mswingsm(magr, mdef, mwep);
                tmp += hitval_dm(mwep, mdef);
            }
            /* FALLTHROUGH */
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT:
            if (mattk.aatyp === AT_KICK && mtrapped_in_pit(magr))
                continue;
            if (distmin_dogmove(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            if (!magr.mconf && !_conflict_dm() && mwep
                && mattk.aatyp !== AT_WEAP
                && touch_petrifies_dm(mdef.data)) {
                strike = 0;
                break;
            }
            dieroll = rnd(20 + i);
            strike = (tmp > dieroll) ? 1 : 0;
            if (mwep)
                tmp -= hitval_dm(mwep, mdef);
            if (strike) {
                if (unsolid_dm(mdef.data) && failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
                if ((mdef.data && (mdef.mnum === PM_BLACK_PUDDING
                                   || mdef.mnum === PM_BROWN_PUDDING))
                    && mwep && mwep.otyp !== undefined
                    && (objects_material_dm(mwep.otyp) === 11 /* IRON */
                        || objects_material_dm(mwep.otyp) === 12 /* METAL */)
                    && mdef.mhp > 1 && !mdef.mcan) {
                    let mclone = await clone_mon(mdef, 0, 0);
                    if (mclone) {
                        if (game.v?.vis && canspotmon(mdef))
                            /* C mhitm.c:461 pline("%s divides as %s hits it!",
                             * Monnam(mdef), mon_nam(magr)) — spelled with this
                             * file's local namers; the module-level Monnam/
                             * mon_nam are not bound here and would throw. */
                            pline(Monnam_dm(mdef) + ' divides as ' + mon_nam_dm(magr) + ' hits it!');
                        await mintrap_dm(mclone, NO_TRAP_FLAGS$);
                        if (DEADMONSTER_dm(magr))
                            res[i] |= M_ATTK_AGR_DIED;
                    }
                }
            } else {
                await missmm(magr, mdef, mattk);
            }
            break;

        case AT_HUGS:
            strike = (i >= 2 && res[i - 1] === M_ATTK_HIT
                      && res[i - 2] === M_ATTK_HIT) ? 1 : 0;
            if (strike) {
                if (failed_grab(magr, mdef, mattk))
                    strike = 0;
                else
                    res[i] = await hitmm(magr, mdef, mattk, null, 0);
            }
            break;

        case AT_GAZE:
            strike = 0;
            res[i] = await gazemm(magr, mdef, mattk);
            break;

        case AT_EXPL:
            if (distmin_dogmove(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            res[i] = await explmm(magr, mdef, mattk);
            if (res[i] === M_ATTK_MISS) {
                strike = 0;
                attk = 0;
            } else {
                strike = 1;
            }
            break;

        case AT_ENGL:
            if (mdef.data && mdef.mnum === PM_SHADE) {
                if (game.v?.vis)
                    /* C mhitm.c:513-514 — s_suffix handles "It" and names ending in s. */
                    pline(s_suffix(Monnam_dm(magr)) + ' attempt to engulf ' + mon_nam_dm(mdef) + ' is futile.');
                strike = 0;
                break;
            }
            if (game.u?.usteed && mdef === game.u.usteed) {
                strike = 0;
                break;
            }
            if (distmin_dogmove(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            if (engulfing_u_dm(magr)) {
                strike = 0;
            } else if ((strike = (tmp > rnd(20 + i)) ? 1 : 0) !== 0) {
                if (failed_grab(magr, mdef, mattk))
                    strike = 0;
                else
                    res[i] = await gulpmm(magr, mdef, mattk);
            } else {
                await missmm(magr, mdef, mattk);
            }
            break;

        case AT_BREA:
        case AT_SPIT:
            if (!monnear(magr, mdef.mx, mdef.my)) {
                let mmtmp = (mattk.aatyp === AT_BREA)
                    ? await breamm_mu(magr, mattk, mdef)
                    : await spitmm(magr, mattk, mdef);
                strike = (mmtmp === M_ATTK_MISS) ? 0 : 1;
                if (strike)
                    res[i] |= M_ATTK_HIT;
                if (DEADMONSTER_dm(mdef))
                    res[i] = M_ATTK_DEF_DIED;
                if (DEADMONSTER_dm(magr))
                    res[i] |= M_ATTK_AGR_DIED;
            } else {
                strike = 0;
                attk = 0;
            }
            break;

        default:
            strike = 0;
            attk = 0;
            break;
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin_dogmove(magr.mx, magr.my, mdef.mx, mdef.my) <= 1)
            /* C mhitm.c:572 passivemm(magr, mdef, strike, res[i] & M_ATTK_DEF_DIED, mwep)
             * — the RAW bitmask (0 or M_ATTK_DEF_DIED), not a boolean, since
             * passivemm returns `mdead | mhit` directly as the new res[i]. */
            res[i] = await passivemm(magr, mdef, strike, (res[i] & M_ATTK_DEF_DIED), mwep);

        if (res[i] & M_ATTK_DEF_DIED)
            return res[i];
        if (res[i] & M_ATTK_AGR_DIED)
            return res[i];
        if ((res[i] & M_ATTK_AGR_DONE$) || helpless_dm(magr))
            return res[i];
        if (mon_offmap_dm(mdef))
            return res[i];
        if (res[i] & M_ATTK_HIT)
            struck = 1;
    }

    return (struck ? M_ATTK_HIT : M_ATTK_MISS);
}

function find_mac_dm(mon) {
    /* C worn.c:717 — include every worn armor/accessory contribution.  The
     * shared trap.js implementation is the canonical port of this helper;
     * using the old base-only lookup made an armored monster easier to hit
     * than C, turning a miss (and its passive retaliation) into an extra
     * damage roll. */
    return find_mac_mon(mon);
}

function sensemon_dm(mon) { return sensemon(mon); }

function is_elf_dm(pa) {
    if (!pa) return false;
    let mndx = pa.pmidx;
    if (mndx === undefined) return false;
    return _is_elf(mndx);
}

function is_orc_dm(pd) {
    if (!pd) return false;
    let mndx = pd.pmidx;
    if (mndx === undefined) return false;
    return _is_orc(mndx);
}

/* C weapon.c:149-187 hitval().  The canonical implementation already lives
 * in uhitm.js; the monster-vs-monster path had been using a silent zero-copy. */
function hitval_dm(mwep, mdef) {
    const mndx = (mdef?.data?.pmidx ?? mdef?.mndx ?? mdef?.mnum ?? -1) | 0;
    return hitval(mwep, mdef, mndx);
}

function engulfing_u_dm(magr) {
    return engulfing_u_const(magr);
}

async function mintrap_dm(mclone, flags) { return await mintrap_real(mclone, flags); }

/* C mon.c:3364 monkilled(mdef, "", how) → mondied(mdef) → mondead(mdef)
 * (life-saving, vampshifter-revert, vault-guard-corridor, bones-file paths
 * are not modeled — unreachable for an ordinary mon-vs-mon melee kill) →
 * m_detach → mondied's corpse_chance + make_corpse (default/common case
 * only; the gas-spore/lich/Vlad/golem/mplayer/rider/shopkeeper special cases
 * in corpse_chance and make_corpse are not modeled here). */
async function monkilled_dm(mdef, mattk) {
    const how = mattk?.adtyp ?? 0, pd = mdef.data;
    if (cansee(mdef.mx | 0, mdef.my | 0)) {
        const verb = nonliving(mdef.data) ? 'destroyed' : 'killed';
        pline_mon(mdef, `${Monnam_dm(mdef)} is ${verb}!`);
        if (_topline_more_pending())
            await flush_pending_messages();
    } else {
        /* C mon.c:3390-3391 — the sad feeling is deferred until mondead()
         * has ruled out life-saving. */
        (game.iflags ||= {}).sad_feeling = !!mdef.mtame;
    }
    /* C mon.c:3398-3403: how == AD_DGST => mondead(), never a corpse. */
    const disintegested = how === AD_DGST || how === -242 /* -AD_RBRE */ || (how === _AD_FIRE && [PM_PAPER_GOLEM, PM_STRAW_GOLEM].includes(pd.pmidx));
    (game.gd ||= {}).disintegested = disintegested;
    await mondied_dm(mdef, disintegested);
    if (DEADMONSTER_dm(mdef) && mdef.mtame && disintegested && how === _AD_FIRE) await pline('May %s roast in peace.', noit_mon_nam(mdef));
}

const PM_WRAITH_DG = MONS_NAMES.indexOf('wraith'), PM_NURSE_DG = MONS_NAMES.indexOf('nurse');

/* C mhitm.c:1016-1119 mdamagem(magr, mdef, mattk, mwep, dieroll). */
async function mdamagem_dm(magr, mdef, mattk, mwep, dieroll) {
    const pa_dm = magr.data, pd_dm = mdef.data; /* C mhitm.c:1018 */
    const mhm = {
        damage: d((mattk.damn | 0), (mattk.damd | 0)),
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        dieroll,
        done: false,
    };

    /* C mhitm.c:1032-1057: an attacker that touches a cockatrice (or digests
     * Medusa) without the armor its attack type needs is stoned BEFORE any
     * damage is applied.  monstone() creates the statue, whose o_id draw
     * (rnd(2) @ next_ident, mkobj.c:521) is the first RNG of this branch. */
    if ((touch_petrifies_dm(pd_dm)
         || ((mattk.adtyp | 0) === AD_DGST && (pd_dm?.pmidx | 0) === PM_MEDUSA))
        && !resists_ston_dm(magr)) {
        const protector = attk_protection(mattk.aatyp | 0) | 0;
        let wornitems = magr.misc_worn_check | 0;

        /* wielded weapon gives same protection as gloves here */
        if (mwep)
            wornitems |= W_ARMG;

        if (protector === 0
            || (protector !== ~0 && (wornitems & protector) !== protector)) {
            if (poly_when_stoned(pa_dm)) {
                await mon_to_stone(magr);
                return M_ATTK_HIT; /* no damage during the polymorph */
            }
            if (game.v?.vis && canspotmon(magr))
                await pline_mon(magr, `${Monnam_dm(magr)} turns to stone!`);
            await monstone(magr);
            if (!DEADMONSTER_dm(magr))
                return M_ATTK_HIT; /* lifesaved */
            else if (magr.mtame && !game.v?.vis)
                await You("have a peculiarly sad feeling for a moment, then it passes.");
            return M_ATTK_AGR_DIED;
        }
    }

    // C mhitm.c:1059: all damage types use the shared uhitm.c handlers.
    await mhitm_adtyping(magr, mattk, mdef, mhm);

    /* C mhitm.c:1061 passes (MON_WEP(magr) != 0), not mdamagem's mwep arg:
     * a wielder's claw attack counts as weapon_used. */
    if (await mhitm_knockback(magr, mdef, mattk, mhm, !!MON_WEP_dm(magr))
        && ((mhm.hitflags & (M_ATTK_DEF_DIED | M_ATTK_HIT)) !== 0
            || mon_offmap_dm(mdef)))
        return mhm.hitflags;

    if (mhm.done)
        return mhm.hitflags;
    if (!mhm.damage)
        return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp < 1) {
        /* C mhitm.c:1073-1078: gulpmm() left magr on mdef's square; put mdef
         * back on the grid and take magr off it, so mondead's newsym blanks
         * the square until gulpmm() re-places magr. */
        if (m_at(mdef.mx, mdef.my) === magr) {
            delete mdef._mapRemoved;
            magr._mapRemoved = true;
        }
        /* C mhitm.c:1081-1090 — mkcorpstat_norevive / zombify setup for the
         * corpse the kill leaves (mkcorpstat/start_corpse_timeout read them). */
        game.gm = game.gm || {};
        game.flags = game.flags || {};
        if (mattk.aatyp === AT_WEAP || mattk.aatyp === AT_CLAW)
            game.gm.mkcorpstat_norevive = !!(mwep && (mwep.oartifact | 0) === ART_TROLLSBANE_DM
                && (permonstTemplate(mdef.mndx ?? mdef.mnum).mlet | 0) === S_TROLL_DM);
        game.flags.zombify = !!(!mwep && zombie_maker(magr)
            && (mattk.aatyp === AT_TUCH || mattk.aatyp === AT_CLAW || mattk.aatyp === AT_BITE)
            && zombie_form(permonstTemplate(mdef.mndx ?? mdef.mnum)) !== NON_PM);
        await monkilled_dm(mdef, mattk);
        game.flags.zombify = false; /* reset */
        game.gm.mkcorpstat_norevive = false;
        if (!DEADMONSTER_dm(mdef))
            return mhm.hitflags; /* mdef lifesaved — not modeled, unreachable */
        if (mhm.hitflags === M_ATTK_AGR_DIED)
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);
        if (mattk.adtyp === AD_DGST) {
            /* C mhitm.c:1096-1115, including the chameleon and green-slime
             * newcham arms (mhitm.c:1099-1103). */
            const pdx = (pd_dm?.pmidx ?? (mdef.mndx ?? mdef.mnum)) | 0;
            if (ismnum_js(mdef.cham) && (mdef.cham | 0) >= 0) {
                await newcham(magr, null, NC_SHOW_MSG_DG);
            } else if ((pd_dm?.pmidx | 0) === PM_GREEN_SLIME && !slimeproof(pa_dm)) {
                await newcham(magr, PM_GREEN_SLIME, NC_SHOW_MSG_DG);
            } else if (pdx === PM_WRAITH_DG) {
                await grow_up(magr, null);
                return (M_ATTK_DEF_DIED
                        | (!DEADMONSTER_dm(magr) ? 0 : M_ATTK_AGR_DIED));
            } else if (pdx === PM_NURSE_DG) {
                healmon_dg(magr, magr.mhpmax, 0);
            }
            await mon_givit_dg(magr, pd_dm);
        }
        return (M_ATTK_DEF_DIED | (await grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED));
    }
    return (mhm.hitflags === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
}

/* Unported helpers — stub implementations */
/* C mhitm.c:970-1010 explmm(magr, mdef, mattk) — AT_EXPL monster-vs-monster. */
async function explmm(magr, mdef, mattk) {
    let result;
    if (magr.mcan)
        return M_ATTK_MISS;
    if (cansee(magr.mx | 0, magr.my | 0))
        pline_mon(magr, '%s explodes!', Monnam_dm(magr));
    else
        await noises_dm(magr, mattk);
    /* monster explosion types which actually create an explosion */
    const adt = mattk.adtyp | 0;
    if (adt === _AD_FIRE || adt === _AD_COLD || adt === _AD_ELEC) {
        await mon_explodes_dm(magr, mattk);
        /* unconditionally set AGR_DIED here; lifesaving is accounted below */
        result = M_ATTK_AGR_DIED | (DEADMONSTER_dm(mdef) ? M_ATTK_DEF_DIED : 0);
    } else {
        result = await mdamagem_dm(magr, mdef, mattk, null, 0);
    }
    /* Kill off aggressor if it didn't die. */
    if (!(result & M_ATTK_AGR_DIED)) {
        const was_leashed = !!(magr.mleashed | 0);
        await mondead(magr);
        if (!DEADMONSTER_dm(magr))
            return result; /* life saved */
        result |= M_ATTK_AGR_DIED;
        /* mondead() -> m_detach() -> m_unleash() always suppresses the slack message */
        if (was_leashed)
            pline('Your leash falls slack.');
    }
    if (magr.mtame) /* give this one even if it was visible */
        await You('have a melancholy feeling for a moment, then it passes.');
    return result;
}

export function failed_grab(magr, mdef, mattk) {
    const notonhead = !!game.gn?.notonhead;
    const unsolid = unsolid_dm(mdef?.data);
    const grab = (mattk?.aatyp | 0) === AT_HUGS
        || (mattk?.adtyp | 0) === AD_WRAP
        || (mattk?.adtyp | 0) === AD_STCK
        || (mattk?.adtyp | 0) === AD_DGST;
    if (!(unsolid || notonhead) || !grab)
        return false;
    if ((game.v?.vis && canspotmon(mdef))
        || magr === game.youmonst || mdef === game.youmonst) {
        const magrnam = magr === game.youmonst ? 'Your'
            : s_suffix(Monnam_dm(magr));
        const target = notonhead ? `${s_suffix(some_mon_nam(mdef))} tail`
            : (mdef === game.youmonst ? 'you' : mon_nam_dm(mdef));
        const verb = (mattk?.adtyp | 0) === AD_DGST ? 'gulp'
            : (mattk?.adtyp | 0) === AD_STCK ? 'adhere' : 'grab';
        pline(`${magrnam} ${verb} attempt ${notonhead ? 'fails to hold' : 'passes right through'} ${target}!`);
    }
    return true;
}

/* C mhitm.c:735-798 gazemm() */
async function gazemm(magr, mdef, mattk) {
    const AD_BLND_GZ = 11;
    const archon = (magr.mnum === PM_ARCHON && mattk.adtyp === AD_BLND_GZ);
    const altmesg = (archon && !magr.mcansee);

    if ((mdef.data?.mlet | 0) === 13 /* S_MIMIC */
        && ((mdef.m_ap_type | 0) & 0x7) !== 0 /* M_AP_NOTHING */)
        seemimic(mdef);
    mdef.mundetected = 0;

    if (game.v?.vis) {
        const buf = (altmesg ? Adjmonnam_gz(magr, 'blinded') : Monnam_dm(magr))
                    + ' gazes ' + (altmesg ? 'toward' : 'at');
        pline(buf + ' ' + (canspotmon(mdef) ? mon_nam_dm(mdef) : 'something') + '...');
    }

    if (magr.mcan || !mdef.mcansee
        || (archon ? resists_blnd_gz(mdef) : !magr.mcansee)
        || (magr.minvis && !perceives_dm(mdef.data)) || mdef.msleeping) {
        if (game.v?.vis && canspotmon(mdef))
            pline('but nothing happens.');
        return M_ATTK_MISS;
    }
    if (magr.mnum === PM_MEDUSA && await mon_reflects_dm(mdef, null)) {
        if (canseemon(mdef))
            await mon_reflects_dm(mdef, 'The gaze is reflected away by %s %s.');
        if (mdef.mcansee) {
            if (await mon_reflects_dm(magr, null)) {
                if (canseemon(magr))
                    await mon_reflects_dm(magr, 'The gaze is reflected away by %s %s.');
                return M_ATTK_MISS;
            }
            if (mdef.minvis && !perceives_dm(magr.data)) {
                if (canseemon(magr))
                    pline(Monnam_dm(magr) + " doesn't seem to notice that "
                          + mhis_dm(magr)
                          + ' gaze was reflected.');
                return M_ATTK_MISS;
            }
            if (canseemon(magr))
                pline(Monnam_dm(magr) + ' is turned to stone!');
            await monstone(magr);
            if (!DEADMONSTER_dm(magr))
                return M_ATTK_MISS;
            return M_ATTK_AGR_DIED;
        }
    } else if (archon) {
        mhitm_ad_blnd_gz(magr, mattk, mdef, null);
        if (rn2(2))
            mdef.mstun = 1;
    }

    return await mdamagem_dm(magr, mdef, mattk, null, 0);
}

/* C mhitm.c:849-967 gulpmm(magr, mdef, mattk).  The monster grid is not
 * modelled (m_at walks fmon), so remove_monster/place_monster reduce to the
 * mx/my moves they imply. */
async function gulpmm(magr, mdef, mattk) {
    const MM_IGNOREWATER_DM = 0x00000008;
    if (!engulf_target(magr, mdef))
        return M_ATTK_MISS;
    if (game.v?.vis) {
        /* mondata.h digests()/enfolds(): AT_ENGL attack with AD_DGST / AD_WRAP */
        const engl = (mon_mattk_raw(magr.mnum) || []).find((a) => (a?.[0] | 0) === AT_ENGL);
        const verb = (engl && (engl[1] | 0) === AD_DGST) ? 'swallows'
            : (engl && (engl[1] | 0) === AD_WRAP) ? 'encloses' : 'engulfs';
        await pline(Monnam_dm(magr) + ' ' + verb + ' ' + mon_nam_dm(mdef) + '.');
    }
    if (![PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_FIRE_ELEMENTAL_DM, PM_SALAMANDER_DM].includes(magr.mnum))
        for (let obj = mdef.minvent; obj; obj = obj.nobj)
            await snuff_lit(obj);
    if ((mdef.cham === PM_VAMPIRE || mdef.cham === PM_VAMPIRE_LORD || mdef.cham === PM_VLAD_THE_IMPALER)
        && await newcham(mdef, mdef.cham, NO_NC_FLAGS)) {
        if (game.v?.vis) {
            await pline('%s expels %s.', Monnam_dm(magr), canspotmon(mdef) ? 'it' : 'something');
            if (canspotmon(mdef))
                await pline('It turns into %s.', x_monnam(mdef, ARTICLE_A, null, SUPPRESS_NAME | SUPPRESS_IT | SUPPRESS_INVISIBLE, false));
        }
        return M_ATTK_HIT;
    }
    const ax = magr.mx, ay = magr.my, dx = mdef.mx, dy = mdef.my;
    /* move the aggressor onto the defender's square (mdef stays in fmon) */
    mdef._mapRemoved = true; /* remove_monster(dx, dy): off the grid, still on fmon */
    magr.mx = dx; magr.my = dy;
    newsym(ax, ay);
    newsym(dx, dy);
    game.gm = game.gm || {};
    game.gm.mswallower = magr; /* corpse_chance() wants this */
    let status = await mdamagem_dm(magr, mdef, mattk, null, 0);
    game.gm.mswallower = null;

    if ((status & (M_ATTK_AGR_DIED | M_ATTK_DEF_DIED))
        === (M_ATTK_AGR_DIED | M_ATTK_DEF_DIED)) {
        /* both died -- do nothing */
    } else if (status & M_ATTK_DEF_DIED) {
        const gp = goodpos_real(dx, dy, magr, MM_IGNOREWATER_DM);
        let nx = dx, ny = dy;
        if (!gp) {
            if (m_at(dx, dy) === magr) { magr._mapRemoved = true; newsym(dx, dy); delete magr._mapRemoved; }
            nx = ax; ny = ay;
        }
        if (m_at(nx, ny) !== magr) {
            delete magr._mapRemoved;
            magr.mx = nx; magr.my = ny;
            newsym(nx, ny);
        }
        if ((await minliquid_real(magr))
            || (t_at(nx, ny)
                && (await mintrap_dm(magr, NO_TRAP_FLAGS$)) === Trap_Killed_Mon_DM))
            status |= M_ATTK_AGR_DIED;
    } else if (status & M_ATTK_AGR_DIED) {
        delete mdef._mapRemoved;
        mdef.mx = dx; mdef.my = dy;
        newsym(dx, dy);
    } else {
        if (cansee(dx, dy))
            await pline(Monnam_dm(mdef) + ' is ' + (dmgtype_fromattack(magr.data, AD_DGST, AT_ENGL) ? 'regurgitated' : dmgtype_fromattack(magr.data, AD_WRAP, AT_ENGL) ? 'released' : 'expelled') + '!');
        /* C mhitm.c:960: re-place the aggressor, including after lifesaving
         * temporarily removed it from the monster grid in mdamagem(). */
        place_monster(magr, ax, ay);
        delete mdef._mapRemoved;
        mdef.mx = dx; mdef.my = dy;
        newsym(ax, ay);
        newsym(dx, dy);
    }
    return status;
}

/* C mhitm.c:41-71 pre_mm_attack(magr, mdef) — run at the top of BOTH hitmm()
 * and missmm() before the message.  Unhides/unmimics either party, then for a
 * visible fight places the 'I' glyph over anything the hero cannot spot:
 *   if (gv.vis) {
 *     if (!canspotmon(magr)) map_invisible(magr->mx, magr->my);
 *     else if (showit) newsym(magr->mx, magr->my);
 *     ... same for mdef ...
 *   }
 * RNG-free; the canonical body in mhitm.js also reveals mimics. */
function pre_mm_attack_dm(magr, mdef) {
    return pre_mm_attack(magr, mdef);
}

async function noises_dm(magr, mattk) {
    const u = game.u;
    if (!u) return;
    const farq = dist2(magr.mx | 0, magr.my | 0, u.ux | 0, u.uy | 0) > 15;
    const moves = game.moves | 0;
    const noisetime = game.noisetime | 0;
    /* C mhitm.c:31 `if (!Deaf && (farq != gf.far_noise || ...))` — the Deaf
     * test is part of the SAME condition as the noisetime bookkeeping, so a
     * deaf hero updates neither gf.far_noise nor gn.noisetime.  The comment
     * that used to sit here read "Deaf unported = false", which both printed a
     * line C suppresses and advanced state C leaves alone. */
    if (!Deaf() && (farq !== !!game.far_noise || (moves - noisetime) > 10)) {
        game.far_noise = farq;
        game.noisetime = moves;
        /* C mhitm.c:34 You_hear("%s%s.", ...) — one call, two conversions. */
        await You_hear("%s%s.",
                 ((mattk?.aatyp | 0) === AT_EXPL) ? "an explosion" : "some noises",
                 farq ? " in the distance" : "");
    }
}

async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    // C mhitm.c:664-732: finish hit feedback before applying damage.
    pre_mm_attack_dm(magr, mdef);
    /* C mhitm.c:659 compat = !magr->mcan ? could_seduce(magr, mdef, mattk) : 0.
     * (shade_miss's !compat guard is the KNOWN GAP above and is RNG-free.) */
    const compat = !(magr.mcan | 0) ? could_seduce(magr, mdef, mattk) : 0;
    /* C mhitm.c:663,704: if (gv.vis) pline("%s %s.", buf, mon_nam_too(mdef, magr));
     * mon_nam_too ≈ mon_nam for a non-self attack.  buf is "<Monnam> <verb>"
     * per the mattk->aatyp switch (mhitm.c:674-701). */
    /* C mhitm.c:660-661: shade_miss() calls dmgval() (RNG) for zero/not-zero */
    if (!compat && shade_miss_hm(magr, mdef, mwep, false, !!game.v?.vis))
        return M_ATTK_MISS; /* bypass mdamagem() */
    if (game.v?.vis && compat) {
        await pline(Monnam_dm(magr) + ' ' + ((mdef.mcansee | 0) ? 'smiles at' : 'talks to')
              + ' ' + mon_nam_dm(mdef) + ' '
              + ((compat === 2) ? 'engagingly' : 'seductively') + '.');
    } else if (game.v?.vis) {
        /* C mhitm.c:673-705 — buf = the aatyp switch; pline("%s %s.", buf,
         * mon_nam_too(mdef, magr)) only when *buf (empty for an artifact
         * weapon blow: artifact_hit() in mhitm_ad_phys speaks instead). */
        const magr_name = Monnam_dm(magr), buf = attack_verb_dm(magr, mattk, mwep, magr_name);
        if (buf)
            await pline(buf + ' ' + mon_nam_too(mdef, magr) + '.');
        /* C mhitm.c:708-727 — a silver weapon sears a silver-hating defender */
        const weaponhit = ((mattk.aatyp | 0) === AT_WEAP
                           || ((mattk.aatyp | 0) === AT_CLAW && mwep));
        const silverhit = weaponhit && mwep
            && ((MKOBJ_OC_MATERIAL[mwep.otyp | 0] | 0) === SILVER_DM);
        if (mon_hates_silver(mdef) && silverhit) {
            let mdef_name = mon_nam_too(mdef, magr);
            const dndx = (mdef.mndx ?? mdef.mnum ?? 0) | 0;
            if (!_noncorporeal(dndx) && !(_mf1(dndx) & M1_AMORPHOUS_DM)) {
                if (mdef !== magr)
                    mdef_name = s_suffix(mdef_name);
                else mdef_name = mdef_name.replace('himself', 'his own').replace('herself', 'her own').replace('itself', 'its own');
                mdef_name += ' flesh';
            }
            await pline(s_suffix(magr_name) + ' ' + simpleonames(mwep)
                  + ' sears ' + mdef_name + '!');
        }
    }
    else
        await noises_dm(magr, mattk); /* C mhitm.c:729 */
    if (game.v?.vis && _topline_more_pending() && _more_never_dismissed())
        await flush_pending_messages();
    return await mdamagem_dm(magr, mdef, mattk, mwep, dieroll);
}

async function missmm(magr, mdef, mattk) {
    pre_mm_attack_dm(magr, mdef);
    if (game.v?.vis) {
        await pline(Monnam_dm(magr) + ' '
              + (((magr.mcan | 0) || !could_seduce(magr, mdef, mattk))
                 ? 'misses' : 'pretends to be friendly to')
              + ' ' + mon_nam_dm(mdef) + '.');
        if (_topline_more_pending() && _more_never_dismissed())
            await flush_pending_messages();
    } else
        await noises_dm(magr, mattk); /* C mhitm.c:89 */
}

/* mon_wield_item is the real weapon.c:797 port, kept in js/uhitm.js next to
 * its sibling select_rwep/select_hwep rather than copied here; mattackm's
 * AT_WEAP arm (mhitm.c:408-412) needs its return value, because a monster that
 * spends its move wielding does not attack. */
/* C mhitm.c:1283-1300 mswingsm().  This is deliberately kept synchronous:
 * mswings_verb owns the C-compatible thrust roll and pline is non-blocking in
 * the terminal adapter, so the attacker's RNG/message order is preserved. */
function mswingsm(magr, mdef, mwep) {
    const u = game.u || {};
    const blinded = !!u.uprops?.[BLINDED_DM]
        && !!((u.uprops[BLINDED_DM].intrinsic | 0)
              || (u.uprops[BLINDED_DM].extrinsic | 0))
        && !(u.uprops[BLINDED_DM].blocked | 0);
    if (!(game.flags?.verbose ?? true) || blinded || !mon_visible(magr))
        return;
    const bash = is_pole_dm(mwep) && (mwep?.oartifact | 0) !== ART_SNICKERSNEE_DM
        && dist2(magr.mx | 0, magr.my | 0, mdef.mx | 0, mdef.my | 0) <= 2;
    pline(`${Monnam(magr)} ${mswings_verb(mwep, bash)} ${mwep.quan > 1 ? 'one of ' : ''}${mhis_dm(magr)} ${xname(mwep)} at ${mon_nam(mdef)}.`);
}

/* C ref: nethack-c/include/mondata.h:57-58
 *   #define is_whirly(ptr) \
 *       ((ptr)->mlet == S_VORTEX || (ptr) == &mons[PM_AIR_ELEMENTAL])
 * The C pointer-identity test against &mons[PM_AIR_ELEMENTAL] becomes an index
 * compare on the permonst's own row number: js/struct_reconstructor.js hands out
 * a permonst proxy built by makemon.js permonstTemplate(), whose `pmidx` IS that
 * row number.  Same shape as the already-ported js/mhitm.js:2742 is_whirly leg.
 * S_VORTEX (22) is declared at the top of this file; PM_AIR_ELEMENTAL comes from
 * the generated PM table rather than a local literal. */
function is_whirly(mon_data) {
    return (mon_data.mlet | 0) === S_VORTEX
        || (mon_data.pmidx | 0) === PM_AIR_ELEMENTAL;
}

/* C ref: nethack-c/src/mhitm.c:806-845 engulf_target(magr, mdef)
 * Returns TRUE if aggressor can engulf defender (size and position checks). */
export function engulf_target(magr, mdef) {
    const uatk = (magr === game?.youmonst);
    const udef = (mdef === game?.youmonst);

    /* can't swallow something that's too big */
    const magr_mnum = (magr?.mnum ?? -1) | 0;
    const mdef_mnum = (mdef?.mnum ?? -1) | 0;
    const magr_msize = (magr_mnum >= 0 && magr_mnum < MONS_MSIZE.length) ? (MONS_MSIZE[magr_mnum] | 0) : 0;
    const mdef_msize = (mdef_mnum >= 0 && mdef_mnum < MONS_MSIZE.length) ? (MONS_MSIZE[mdef_mnum] | 0) : 0;

    if (mdef_msize >= MZ_HUGE
        || (magr_msize < mdef_msize && !is_whirly(magr?.data)))
        return false;

    /* can't (move to) swallow if trapped. TODO: could do some? */
    if ((mdef?.mtrapped ?? 0) !== 0 || (magr?.mtrapped ?? 0) !== 0)
        return false;

    /* if attacker is phasing in solid rock and defender can't move there,
       or vice versa, don't allow engulf to succeed; otherwise expelling
       might not be able to place attacker and defender both back on map;
       when defender is the hero, a sanity_check complaint about placing
       the hero on top of a monster can occur */
    const hero = game.u || {};
    const heroPassesWalls = !!hero.uprops?.[PASSES_WALLS]
        && !!((hero.uprops[PASSES_WALLS].intrinsic | 0)
              || (hero.uprops[PASSES_WALLS].extrinsic | 0));
    const dx = udef ? (hero.ux ?? 0) : (mdef?.mx ?? 0);
    const dy = udef ? (hero.uy ?? 0) : (mdef?.my ?? 0);
    const lev = game?.level?.locations?.[dx]?.[dy];
    if (lev && !(udef ? heroPassesWalls : passes_walls(mdef?.data))
          && (IS_OBSTRUCTED(lev.typ) || closed_door(dx, dy) || IS_TREE(lev.typ)
              /* not passes_bars(); engulfer isn't squeezing through */
              || (lev.typ === IRONBARS && !is_whirly(magr?.data))))
        return false;

    const ax = uatk ? (hero.ux ?? 0) : (magr?.mx ?? 0);
    const ay = uatk ? (hero.uy ?? 0) : (magr?.my ?? 0);
    const alev = game?.level?.locations?.[ax]?.[ay];
    if (alev && !(uatk ? heroPassesWalls : passes_walls(magr?.data))
        && (IS_OBSTRUCTED(alev.typ) || closed_door(ax, ay) || IS_TREE(alev.typ)
            || (alev.typ === IRONBARS && !is_whirly(mdef?.data))))
        return false;

    return true;
}

/* C ref: nethack-c-v5/upstream/src/mhitm.c:1259-1281 rustm(mdef, obj)
 * Inflict rusting/corrosion/burning damage on an object. */
export async function rustm(mdef, obj) {
    let dmgtyp = ERODE_NONE;
    let chance = 1;

    if (!mdef || !obj)
        return; /* just in case */
    /* AD_ACID and AD_ENCH are handled in passivemm() and passiveum() */
    if (dmgtype(mdef?.data, AD_CORR)) {
        dmgtyp = ERODE_CORRODE;
    } else if (dmgtype(mdef?.data, AD_RUST)) {
        dmgtyp = ERODE_RUST;
    } else if (dmgtype(mdef?.data, AD_FIRE)
               /* steam vortex: fire resist applies, fire damage doesn't */
               && mdef?.mnum !== PM_STEAM_VORTEX) {
        dmgtyp = ERODE_BURN;
        chance = 6;
    }

    if (dmgtyp !== ERODE_NONE && !rn2(chance))
        await erode_obj(obj, null, dmgtyp, EF_GREASE | EF_VERBOSE);
}

/* C ref: mhitm.c:1210 paralyze_monst(mon, amt). No RNG. */
export function paralyze_monst(mon, amt) {
    if (amt > 127)
        amt = 127;
    mon.mcanmove = 0;
    mon.mfrozen = amt;
    mon.meating = 0; /* terminate any meal-in-progress */
    const STRAT_WAITFORU = 0x20000000;
    mon.mstrategy = (mon.mstrategy & ~STRAT_WAITFORU) >>> 0;
}

function remove_monster(x, y) {
    /* C clears the monster-grid cell before the old-square newsym(). */
    const mtmp = m_at(x, y);
    if (mtmp)
        mtmp._mapRemoved = true;
}

export async function mdisplacem(magr, mdef, quietly) {
    let pa, pd;
    let tx, ty, fx, fy;

    if (!magr || !mdef || magr === mdef)
        return M_ATTK_MISS;
    pa = magr.data;
    pd = mdef.data;
    tx = mdef.mx;
    ty = mdef.my;
    fx = magr.mx;
    fy = magr.my;
    if (m_at(fx, fy) !== magr || m_at(tx, ty) !== mdef)
        return M_ATTK_MISS;

    /* The 1 in 7 failure below matches the chance in do_attack()
     * for pet displacement. */
    if (!rn2(7))
        return M_ATTK_MISS;

    /* Grid bugs cannot displace at an angle. */
    /* C mhitm.c:203 `pa == &mons[PM_GRID_BUG]`: test the attacker's permonst */
    if (((pa?.pmidx ?? -1) | 0) === PM_GRID_BUG_DG && magr.mx !== mdef.mx
        && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* undetected monster becomes un-hidden if it is displaced */
    if (mdef.mundetected)
        mdef.mundetected = 0;
    if ((mdef.m_ap_type ?? 0) && (mdef.m_ap_type ?? 0) !== 3 /* M_AP_MONSTER */)
        seemimic(mdef);
    /* wake up the displaced defender */
    mdef.msleeping = 0;
    mdef.mstrategy = (mdef.mstrategy & ~STRAT_WAITMASK) >>> 0;
    finish_meating(mdef);

    /* Set up the visibility of action. */
    game.v = game.v || {};
    game.v.vis = (canspotmon(magr) && canspotmon(mdef)) ? 1 : 0;

    if (touch_petrifies_dm(pd) && !resists_ston_dm(magr)) {
        if (!which_armor(magr, W_ARMG)) {
            if (poly_when_stoned(pa)) {
                await mon_to_stone(magr);
                return M_ATTK_HIT; /* no damage during the polymorph */
            }
            if (!quietly && canspotmon(magr)) {
                if (game.v.vis) {
                    await pline("%s tries to move %s out of %s way.", Monnam(magr),
                          mon_nam(mdef), is_rider_dm(pa) ? "the" : mhis_dm(magr));
                }
                await pline_mon(magr, "%s turns to stone!", Monnam(magr));
            }
            await monstone(magr);
            if (!DEADMONSTER_dm(magr))
                return M_ATTK_HIT; /* lifesaved */
            else if (magr.mtame && !game.v.vis)
                await You("have a peculiarly sad feeling for a moment, then it passes.");
            return M_ATTK_AGR_DIED;
        }
    }

    remove_monster(fx, fy); /* pick up from orig position */
    if (mdef.wormno)
        remove_worm(mdef);
    else
        remove_monster(tx, ty);
    place_monster(magr, tx, ty); /* put down at target spot */
    place_monster(mdef, fx, fy);
    if (mdef.wormno) /* now put down tail */
        place_worm_tail_randomly(mdef, fx, fy);
    /* either creature might move into or out of a poison gas cloud */
    update_monster_region(magr);
    update_monster_region(mdef);

    if (game.v.vis && !quietly)
        await pline("%s moves %s out of %s way!", Monnam(magr), mon_nam(mdef),
              is_rider_dm(pa) ? "the" : mhis_dm(magr));
    newsym(fx, fy);  /* see it       */
    newsym(tx, ty);  /*   all happen */
    await flush_screen(0); /* make sure it shows up */
    /* the physical map now shows the post-move world: a fireassist
     * pre-movemon frame (js/allmain.js) no longer describes the screen */
    if (game._fireSwapPending && game._fireSwapPreFrame) game._fireSwapPreFrame = null;

    return M_ATTK_HIT;
}
