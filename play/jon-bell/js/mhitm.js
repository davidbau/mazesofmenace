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
import { game } from './gstate.js';
// Preserve legacy import paths while all callers share invent.c's real body.
import { update_inventory } from './inventory_refresh.js';
export { update_inventory };
import { W_ARMOR, W_ACCESSORY, W_WEP, W_SWAPWEP, A_WIS, IS_DOOR, ROOMOFFSET, OBJ_INVENT, HAND, SEE_INVIS, PLNMSG_GROWL } from './const.js';
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { rn2, rnd, d, rn1, rn2_on_display_rng, pushRngLogEntry } from './rng.js';
import { sensemon, canspotmon, canseemon, map_invisible, Deaf, impossible_sync } from './display.js';
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
import { bimanual as bimanual_mm } from './do_wear.js';
import { dist2, s_suffix } from './hacklib.js';
import { attacktype_fordmg, permonstTemplate, hates_silver, dmgtype_fromattack, sliparm, monPmname, monflee, newmextra, ureflects, freemcorpsenm } from './makemon.js';
import { which_armor } from './worn.js';
import { monnear as monnear_real } from './makemon.js';
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
import { hmon_egg_petrify, touch_petrifies, mon_nam, artifact_hit, hmon_hitmon_do_hit, hmon_hitmon_poison, hmon_hitmon_splitmon, hmon_hitmon_msg_hit, hmon_hitmon_msg_silver, hmon_hitmon_msg_lightobj, hmon_hitmon_dmg_recalc, hmon_hitmon_special } from './uhitm.js';
import { exclam } from './zap.js';
import { first_weapon_hit, hmon_hitmon_knockback, Monnam as Monnam_real, hmon_hitmon_pet, backstabbable, uwep_skill_type, setmnotwielded } from './uhitm.js';
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
import { xkilled as xkilled_mh, XKILL_GIVEMSG as XKILL_GIVEMSG_MH, XKILL_NOMSG as XKILL_NOMSG_MH } from './uhitm.js';
import { dmgval as dmgval_weapon, weapon_dam_bonus, use_skill, weapon_type, dbon } from './uhitm.js';
import { MKOBJ_OC_SKILL, MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { split_mon_ml as split_mon } from './mklev.js';
import { setmangry, wake_msg, wake_nearto, healmon, angry_guards } from './mon.js';
import { obfree } from './shk.js';
import { obj_stop_timers } from './timeout.js';
import { weight } from './weight.js';
import { place_object } from './mklev.js';
import { explode } from './explode.js';
/* make_stunned — js/potion.js:5813 (C ref: potion.c:106-127) is the one real
 * body; re-export it so js/mcastu.js's `make_stunned as make_stunned_mc`
 * import (mcast_stun_you, its OWN monster-cast-stuns-hero path) also stops
 * seeing this file's stub the moment it is deleted below. */
import { make_stunned } from './potion.js';
export { make_stunned };
import { abuse_dog, sticks, unstuck } from './dog.js';
/* mbodypart lives in js/cmd.js:33308 (the only real body in js/; js/makemon.js
 * exports a throw-stub and js/shk.js a "hand" constant).  cmd.js already
 * imports from this file, so this is a cycle — safe because mbodypart is a
 * hoisted function declaration and is only called at runtime. */
import { mbodypart, Breathless, body_part, is_pole, set_msg_xy } from './cmd.js';
import { dry_a_towel } from './weapon.js';
import { growl_sound } from './sounds.js';
import { a_gname_at } from './pray.js';
import { newsym as _wakeup_newsym } from './display.js';
import { objdescr_is as objdescr_is_real } from './o_init.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { getObjDescr, just_an, The, vtense, xname, cxname, mshot_xname, Yobjnam2, makeplural } from './objnam.js';
import { newoextra } from './mklev.js';
import { lcase } from './hacklib.js';
import { str_start_is } from './hacklib.js';   /* C hacklib.c:276 — title_to_mon's prefix test */
import { ROLE_RANKS } from './rank_data.js'; /* C role.c roles[].rank[9] */
import { ROLE_PM_MNUM } from './roles.js';   /* C role.c roles[].mnum (the mons[] index) */
/* x_monnam's priest/minion and hallucination branches — C ref: do_name.c:887-904,
 * 950-955.  priestname() is ported (js/priest.js:424); rndmonnam()/bogon_is_pname()
 * are not yet, and self-report if a hallucinating name is ever requested. */
import { priestname, rndmonnam, bogon_is_pname, temple_occupied, has_shrine } from './priest.js';
/* x_monnam's shopkeeper branch — C ref: do_name.c:919-936. */
import { shkname, free_oname as free_oname_real, hot_pursuit } from './dokick.js';
import { nomul } from './allmain.js';
import { monstseesu, monstunseesu, shieldeff, buzz } from './mcastu.js';
import { resist, drain_item, hit } from './zap.js';
import { finish_meating, dmgtype as dmgtype_real } from './dogmove.js';
import { FAINTED, M_AP_NOTHING, PRONOUN_HALLU, TEMPLE } from './const.js';
import { in_rooms } from './hack.js';
import { PM_SAMURAI as PM_SAMURAI_HM, PM_ELF as PM_ELF_HM } from './pm.generated.js';
/* C end.c:185-300 done_in_by — use the canonical death attribution path.
 * mhitm's local no-op used to discard the stoning killer, leaving the
 * tombstone/scoreline without the attacking monster.  end.js already exposes
 * the synchronous body used by mhitu's lethal damage paths; this wrapper
 * avoids a second implementation. */
import { done_in_by as done_in_by_real } from './end.js';
import { polymon } from './polyself.js';

/* C youprop.h resistance macros: both intrinsic and extrinsic property bits
 * contribute to the hero's resistance. */
function _hero_resists(prop) {
    const p = game.u?.uprops?.[prop];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
function _hero_prop_active(prop) {
    const p = game.u?.uprops?.[prop];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
function _hero_blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)) && !(p?.blocked | 0);
}
/* ---------------------------------------------------------------------------
 * Attack-type constants (monattk.h) — inlined as locals since const.js
 * doesn't export them yet.
 * ---------------------------------------------------------------------------
 */
const AT_NONE = 0;
const AT_CLAW = 1;
const AT_BITE = 2;
const AT_KICK = 3;
const AT_BUTT = 4;
const AT_TUCH = 5;
const AT_STNG = 6;
const AT_HUGS = 7;
/* monattk.h:20-26 — the 5.0 values.  This block used to stop at AT_HUGS and
 * every arm below that needed one of these spelled a NUMBER instead, and the
 * numbers it spelled were NetHack 3.7's (AT_SPIT 7, AT_EXPL 8, AT_BOOM 9,
 * AT_GAZE 10, AT_ENGL 13).  5.0 renumbered the whole tail. */
const AT_SPIT = 10;
const AT_ENGL = 11;
const AT_BREA = 12;
const AT_EXPL = 13;
const AT_BOOM = 14;
const AT_GAZE = 15;
const AT_TENT = 16;
const AT_WEAP = 254;
const AT_MAGC = 255;
/* ---------------------------------------------------------------------------
 * Damage-type constants (monattk.h) — inlined as locals.
 * ---------------------------------------------------------------------------
 */
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_SLEE = 4;
const AD_ACID = 8;
const AD_STON = 18;
const AD_RUST = 24;
const AD_ENCH = 41;
const AD_CORR = 42;
const AD_PLYS = 14;
const AD_COLD = 3;
const AD_STUN = 12;
const AD_ELEC = 6;
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
export function ugolemeffects(damtype, dam) {
    const g = game;
    const u = g.u;
    let heal = 0;
    if ((u.umonnum | 0) !== PM_FLESH_GOLEM && (u.umonnum | 0) !== PM_IRON_GOLEM)
        return;
    switch (damtype) {
    case AD_ELEC:
        if ((u.umonnum | 0) === PM_FLESH_GOLEM)
            heal = ((dam | 0) + 5) / 6 | 0; /* Approx 1 per die */
        break;
    case AD_FIRE:
        if ((u.umonnum | 0) === PM_IRON_GOLEM)
            heal = dam | 0;
        break;
    }
    if (heal && (u.mh | 0) < (u.mhmax | 0)) {
        u.mh = (u.mh | 0) + heal;
        if (u.mh > u.mhmax)
            u.mh = u.mhmax;
        if (g.disp) g.disp.botl = 1;
        void pline('Strangely, you feel better than before.');
        exercise(A_STR, true);
    }
}
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
function dynamic_multi_reason(mon, verb, by_gaze) {
    const who = x_monnam(mon, ARTICLE_A, null,
        SUPPRESS_IT | SUPPRESS_INVISIBLE | SUPPRESS_HALLUCINATION
        | SUPPRESS_SADDLE | SUPPRESS_NAME, false);
    game.multi_reason = `${verb} by ${by_gaze ? s_suffix(who) : who}${by_gaze ? ' gaze' : ''}`;
    /* C uhitm.c:113-122 — "m_id:" prefix kept for done_in_by()'s fixup */
    game.multireasonbuf = `${mon.m_id >>> 0}:${game.multi_reason}`;
}
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
function monnear(mon, x, y) {
    return monnear_real(mon, x, y); /* C mon.c:2476: NODIAG grid bugs. */
}
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
const _hliquids = [
    "yoghurt", "oobleck", "clotted blood", "diluted water", "purified water",
    "instant coffee", "tea", "herbal infusion", "liquid rainbow",
    "creamy foam", "mulled wine", "bouillon", "nectar", "grog", "flubber",
    "ketchup", "slow light", "oil", "vinaigrette", "liquid crystal", "honey",
    "caramel sauce", "ink", "aqueous humour", "milk substitute",
    "fruit juice", "glowing lava", "gastric acid", "mineral water",
    "cough syrup", "quicksilver", "sweet vitriol", "grey goo", "pink slime",
    "cosmic latte", "bone oil", "custard", "lard", "vinegar", "creosote",
    /* "new coke (tm)", --better not */
];
export function hliquid(liquidpref) {
    const hallucinate = xm_Hallucination() && !xm_gameover();
    if (hallucinate || !liquidpref) {
        let count = _hliquids.length;
        if (liquidpref) ++count;
        const indx = rn2_on_display_rng(count);
        if (indx >= 0 && indx < _hliquids.length)
            return _hliquids[indx];
    }
    return liquidpref;
}

/* ===========================================================================
 * The x_monnam family — C ref: nethack-c/src/do_name.c:826-1165.
 * ===========================================================================
 */

const XM_EXACT_NAME = 0x1F;
/* C ref: nethack-c/include/monst.h:52-72 — M_AP_TYPE(m) is m_ap_type masked. */
const M_AP_MONSTER = 3;
const M_AP_TYPMASK = 0x7;
/* C ref: nethack-c/include/monflag.h:101-103,141,194 */
const M1_MINDLESS = 0x00010000;
const M1_HUMANOID = 0x00020000;
const M1_ANIMAL = 0x00040000;
const M2_PNAME = 0x00080000;
const G_UNIQ = 0x1000;

/* C ref: nethack-c/include/hacklib.h highc(c) — uppercase only a-z. */
function xm_highc_first(bp) {
    if (!bp) return bp;
    let first = bp.charCodeAt(0);
    if (0x61 <= first && first <= 0x7a) first &= ~0x20;
    return String.fromCharCode(first) + bp.slice(1);
}

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
/* C ref: nethack-c/src/allmain.c program_state.gameover */
function xm_gameover() {
    return !!(game && game.program_state && game.program_state.gameover);
}
/* C ref: nethack-c/include/monst.h:248 engulfing_u(mon) */
function xm_engulfing_u(mon) {
    const u = game.u || {};
    return !!(u.uswallow && xm_same_monst(u.ustuck, mon));
}

/* mondata.h:64-66,135 predicates over mtmp->data. */
function xm_mindless(mdat) { return (mdat.mflags1 & M1_MINDLESS) !== 0; }
function xm_humanoid(mdat) { return (mdat.mflags1 & M1_HUMANOID) !== 0; }
function xm_is_animal(mdat) { return (mdat.mflags1 & M1_ANIMAL) !== 0; }
function xm_type_is_pname(mdat) { return (mdat.mflags2 & M2_PNAME) !== 0; }
/* C ref: mondata.h:157 is_mplayer(ptr) — &mons[PM_ARCHEOLOGIST]..&mons[PM_WIZARD] */
function xm_is_mplayer(mdat) {
    const i = mdat.pmidx | 0;
    return i >= PM_ARCHEOLOGIST && i <= PM_WIZARD;
}

/* C ref: nethack-c/src/do_name.c:1289-1300 Mgender(mtmp).  The
 * `mtmp == &gy.youmonst` arm is unreachable from x_monnam (which returns "you"
 * before ever asking for a gender), so this is the plain monster arm. */
function xm_Mgender(mtmp) {
    return mtmp.female ? FEMALE : MALE;
}

export function xm_has_mgivenname(mtmp) {
    if (!mtmp) return false;
    if ('has_mgivenname' in mtmp) return !!mtmp.has_mgivenname;
    if ('mextra' in mtmp && mtmp.mextra && mtmp.mextra.mgivenname != null) return true;
    return ('mgivenname' in mtmp) && mtmp.mgivenname != null;
}
function xm_MGIVENNAME(mtmp) {
    if ('mextra' in mtmp && mtmp.mextra && mtmp.mextra.mgivenname != null)
        return mtmp.mextra.mgivenname;
    return ('mgivenname' in mtmp) ? mtmp.mgivenname : null;
}

/* C ref: nethack-c/src/hacklib.c:804 strstri() — case-insensitive strstr.
 * Returns the index of the match, or -1 (C returns a pointer or NULL). */
function xm_strstri(str, sub) {
    if (!sub) return 0;
    return String(str).toLowerCase().indexOf(String(sub).toLowerCase());
}

/*
 * x_monnam — C ref: nethack-c/src/do_name.c:826-1032.
 * The generic monster-naming function; every wrapper below routes through it.
 * RNG: rn2(2) in the AUGMENT_IT-while-hallucinating arm, plus whatever
 * rndmonnam() consumes in the hallucination arm.
 */
export function x_monnam(mtmp, article, adjective, suppress, called) {
    const mdat = mtmp.data;
    const mappear_as_mon = ((mtmp.m_ap_type | 0) & M_AP_TYPMASK) === M_AP_MONSTER;
    let pm_name, name_at_start = false, bp;

    /* C do_name.c:843-844 */
    if (is_youmonst(mtmp))
        return "you"; /* ignore article, "invisible", &c */

    /* C do_name.c:846-849 */
    if (xm_gameover())
        suppress |= SUPPRESS_HALLUCINATION;
    if (article === ARTICLE_YOUR && !mtmp.mtame)
        article = ARTICLE_THE;

    /* C do_name.c:851-860 — the hero's consumer is worthy of ARTICLE_THE, and
       its invisibility stops mattering once you are inside it. */
    const u = game.u || {};
    if (u.uswallow && xm_same_monst(mtmp, u.ustuck)) {
        article = ARTICLE_THE;
        suppress |= SUPPRESS_INVISIBLE;
    }
    /* C do_name.c:861-870 */
    const do_hallu = xm_Hallucination() && !(suppress & SUPPRESS_HALLUCINATION);
    const do_invis = !!mtmp.minvis && !(suppress & SUPPRESS_INVISIBLE);
    const do_it = !canspotmon(mtmp) && article !== ARTICLE_YOUR
                  && !xm_gameover() && !xm_same_monst(mtmp, u.usteed)
                  && !xm_engulfing_u(mtmp) && !(suppress & SUPPRESS_IT);
    const do_saddle = !(suppress & SUPPRESS_SADDLE);
    const do_mappear = mappear_as_mon && !(suppress & SUPPRESS_MAPPEARANCE);
    const do_exact = (suppress & XM_EXACT_NAME) === XM_EXACT_NAME;
    const do_name = !(suppress & SUPPRESS_NAME) || xm_type_is_pname(mdat);
    const augment_it = (suppress & AUGMENT_IT) !== 0;

    /* FF_NAME_TRACE is a RNG-neutral witness for the display-name branch.
     * It pairs with FF_HIDE_TRACE and the display-rng hook: when a render
     * diverges, this tells us which visible monster naming call actually
     * consumed the hallucinatory name draw, including its visibility and
     * suppression inputs. */
    if (do_hallu && typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
        pushRngLogEntry(`^name_trace[moves=${game.moves | 0} id=${mtmp.m_id | 0} xy=${mtmp.mx | 0},${mtmp.my | 0}`
            + ` mndx=${mdat.pmidx | 0} article=${article | 0} suppress=${suppress | 0}`
            + ` mappear=${do_mappear ? 1 : 0} cansee=${canspotmon(mtmp) ? 1 : 0}]`);

    let buf = "";

    /* C do_name.c:874-884 — unseen monsters; usually "it" but sometimes more
       specific, and when hallucinating the specific values might be inverted.
       !is_animal excludes all Y; !mindless excludes Z, M, '. */
    if (do_it) {
        const s_one = xm_humanoid(mdat) && !xm_is_animal(mdat) && !xm_mindless(mdat);
        return !augment_it ? "it"
               : ((!do_hallu ? s_one : !rn2(2)) ? "someone" : "something");
    }

    /* C do_name.c:886-904 — priests and minions: don't even use this function. */
    if ((mtmp.ispriest || mtmp.isminion) && !do_mappear) {
        const hres = (game.u && game.u.uprops) ? game.u.uprops[HALLUC_RES] : null;
        const save_prop = hres ? hres.extrinsic : 0;
        const save_invis = mtmp.minvis;

        /* when true name is wanted, explicitly block Hallucination */
        if (!do_hallu && hres)
            hres.extrinsic = 1;
        if (!do_invis)
            mtmp.minvis = 0;
        /* EXACT_NAME will force "of <deity>" on the Astral Plane */
        let name = priestname(mtmp, article, do_exact, "");
        if (hres)
            hres.extrinsic = save_prop;
        mtmp.minvis = save_invis;
        if (article === ARTICLE_NONE && String(name).slice(0, 4) === "the ")
            name = String(name).slice(4);
        return name;
    }

    /* C do_name.c:906-912 — 'pm_name' is the base part of most names. */
    if (do_mappear) {
        pm_name = monPmname(mtmp.mappearance | 0, xm_Mgender(mtmp));
    } else {
        pm_name = monPmname(mdat.pmidx | 0, xm_Mgender(mtmp));
    }

    /* C do_name.c:914-936 — shopkeepers use the shopkeeper name. */
    if (mtmp.isshk && !do_hallu && !do_mappear) {
        if (adjective && article === ARTICLE_THE) {
            /* pathological case: "the angry Asidonhopo the blue dragon"
               sounds silly */
            buf = "the ";
            buf += adjective + " ";
            buf += shkname(mtmp);
        } else {
            buf += shkname(mtmp);
            if ((mdat.pmidx | 0) !== PM_SHOPKEEPER || do_invis) {
                buf += " the ";
                if (do_invis)
                    buf += "invisible ";
                buf += pm_name;
            }
        }
        return buf;
    }

    /* C do_name.c:938-946 — put the adjectives in the buffer. */
    if (adjective)
        buf += adjective + " ";
    if (do_invis)
        buf += "invisible ";
    if (do_saddle && ((mtmp.misc_worn_check | 0) & W_SADDLE) && !xm_Blind()
        && !xm_Hallucination())
        buf += "saddled ";
    const has_adjectives = (buf !== "");

    /* C do_name.c:948-998 — the actual monster name or type; remember whether
       the buffer starts with a personal name. */
    if (do_hallu) {
        const rnamecode = {};
        const rname = rndmonnam(rnamecode);

        buf += rname;
        name_at_start = bogon_is_pname(rnamecode.code);
    } else if (do_name && xm_has_mgivenname(mtmp)) {
        const name = xm_MGIVENNAME(mtmp);

        if ((mdat.pmidx | 0) === PM_GHOST) {
            buf += s_suffix(name) + " ghost";
            name_at_start = true;
        } else if (called) {
            buf += pm_name + " called " + name;
            name_at_start = xm_type_is_pname(mdat);
        } else if (xm_is_mplayer(mdat) && (bp = xm_strstri(name, " the ")) >= 0) {
            /* <name> the <adjective> <invisible> <saddled> <rank> */
            let pbuf = name.slice(0, bp + 5); /* adjectives right after " the " */
            if (has_adjectives)
                pbuf += buf;
            pbuf += name.slice(bp + 5); /* append the rest of the name */
            buf = pbuf;
            article = ARTICLE_NONE;
            name_at_start = true;
        } else {
            buf += name;
            name_at_start = true;
        }
    } else if (xm_is_mplayer(mdat) && !In_endgame(u.uz)) {
        /* C: rank_of((int) mtmp->m_lev, monsndx(mdat), (boolean) mtmp->female).
         * monsndx(mdat) is the mons[] index, i.e. mdat->pmidx.  (js/display.js's
         * rank_of currently expects a 0..12 role ordinal rather than a mndx —
         * that is a display.js defect, not a reason to pass it the wrong
         * argument here.) */
        buf += lcase(rank_of(mtmp.m_lev | 0, mdat.pmidx | 0, !!mtmp.female));
        name_at_start = false;
    } else {
        buf += pm_name;
        name_at_start = xm_type_is_pname(mdat);
    }

    /* C do_name.c:1000-1007 */
    if (name_at_start && (article === ARTICLE_YOUR || !has_adjectives)) {
        if ((mdat.pmidx | 0) === PM_WIZARD_OF_YENDOR)
            article = ARTICLE_THE;
        else
            article = ARTICLE_NONE;
    } else if ((mdat.geno & G_UNIQ) !== 0 && article === ARTICLE_A) {
        article = ARTICLE_THE;
    }

    /* C do_name.c:1009-1031 */
    let insertbuf2 = true;
    let buf2 = "";
    switch (article) {
    case ARTICLE_YOUR:
        buf2 = "your ";
        break;
    case ARTICLE_THE:
        buf2 = "the ";
        break;
    case ARTICLE_A:
        /* avoid an() here */
        buf2 = just_an({}, buf); /* "a " or "an " */
        break;
    case ARTICLE_NONE:
    default:
        insertbuf2 = false;
        break;
    }
    if (insertbuf2)
        buf = buf2 + buf;
    return buf;
}

/* l_monnam — C ref: nethack-c/src/do_name.c:1034-1039 */
export function l_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null,
                    xm_has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, true);
}

/* Monnam — C ref: nethack-c/src/do_name.c:1073-1080 */
function Monnam(mtmp) {
    return Monnam_real(mtmp);
}

/* noit_Monnam — C ref: nethack-c/src/do_name.c:1082-1089 */
export function noit_Monnam(mtmp) {
    return xm_highc_first(noit_mon_nam(mtmp));
}

/* Some_Monnam — C ref: nethack-c/src/do_name.c:1091-1098 */
export function Some_Monnam(mtmp) {
    return xm_highc_first(some_mon_nam(mtmp));
}

/* noname_monnam — C ref: nethack-c/src/do_name.c:1100-1105 */
export function noname_monnam(mtmp, article) {
    return x_monnam(mtmp, article, null, SUPPRESS_NAME, false);
}

/* m_monnam — C ref: nethack-c/src/do_name.c:1107-1113 */
export function m_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null, XM_EXACT_NAME, false);
}

/* YMonnam — C ref: nethack-c/src/do_name.c:1131-1139 */
export function YMonnam(mtmp) {
    return xm_highc_first(y_monnam(mtmp));
}

/* Adjmonnam — C ref: nethack-c/src/do_name.c:1141-1149 */
export function Adjmonnam(mtmp, adj) {
    return xm_highc_first(
        x_monnam(mtmp, ARTICLE_THE, adj,
                 xm_has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false));
}

/* a_monnam — C ref: nethack-c/src/do_name.c:1151-1156 */
export function a_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null,
                    xm_has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}

/* Amonnam — C ref: nethack-c/src/do_name.c:1158-1165 */
export function Amonnam(mtmp) {
    return xm_highc_first(a_monnam(mtmp));
}

/* C ref: do_name.c:1512-1534 — road-runner nemesis aliases for coyotes. */
const coynames = [
    "Carnivorous Vulgaris", "Road-Runnerus Digestus", "Eatibus Anythingus",
    "Famishus-Famishus", "Eatibus Almost Anythingus", "Eatius Birdius",
    "Famishius Fantasticus", "Eternalii Famishiis", "Famishus Vulgarus",
    "Famishius Vulgaris Ingeniusi", "Eatius-Slobbius", "Hardheadipus Oedipus",
    "Carnivorous Slobbius", "Hard-Headipus Ravenus", "Evereadii Eatibus",
    "Apetitius Giganticus", "Hungrii Flea-Bagius", "Overconfidentii Vulgaris",
    "Caninus Nervous Rex", "Grotesques Appetitus", "Nemesis Ridiculii",
    "Canis latrans"
];

export function coyotename(mtmp) {
    if (!mtmp) return "";
    return `${x_monnam(mtmp, ARTICLE_NONE, null, 0, true)} - ${
        mtmp.mcan ? coynames[coynames.length - 1]
                  : coynames[(mtmp.m_id >>> 0) % (coynames.length - 1)]}`;
}

/* ── distant_monnam ──────────────────────────────────────────────────────
 * C ref: nethack-c/src/do_name.c (ground truth)
 * Port of distant_monnam — obfuscates high priest(ess) on Astral Plane
 * unless adjacent or hallucinating.
 * ─────────────────────────────────────────────────────────────────────── */
const PM_HIGH_CLERIC = 276;

export function distant_monnam(mon, article) {
    /* compute Hallucination: HHallucination && !Halluc_resistance */
    const HHallucination = game.u?.uprops?.[HALLUC]?.intrinsic || 0;
    const HHalluc_resistance = game.u?.uprops?.[HALLUC_RES]?.intrinsic || 0;
    const EHalluc_resistance = game.u?.uprops?.[HALLUC_RES]?.extrinsic || 0;
    const Halluc_resistance = HHalluc_resistance || EHalluc_resistance;
    const Hallucination = HHallucination && !Halluc_resistance;

    if (mon.data && mon.data.pmidx === PM_HIGH_CLERIC && !Hallucination
        && Is_astralevel(game.u.uz) && !m_next2u(mon)) {
        let buf = article === ARTICLE_THE ? "the " : "";
        buf += mon.female ? "high priestess" : "high priest";
        return buf;
    } else {
        return x_monnam(mon, article, null, 0, true);
    }
}

/* ---------------------------------------------------------------------------
 * rndghostname — C ref: nethack-c/src/do_name.c:772-776
 * Returns a random ghost name, or the player's own name (1/7 chance).
 * RNG: rn2(7), and rn2(34) when the ghost-name branch is taken.
 * --------------------------------------------------------------------------- */
const ghostnames = [
    "Adri", "Andries", "Andreas", "Bert", "David", "Dirk",
    "Emile", "Frans", "Fred", "Greg", "Hether", "Jay",
    "John", "Jon", "Karnov", "Kay", "Kenny", "Kevin",
    "Maud", "Michiel", "Mike", "Peter", "Robert", "Ron",
    "Tom", "Wilmar", "Nick Danger", "Phoenix", "Jiro", "Mizue",
    "Stephan", "Lance Braccus", "Shadowhawk", "Murphy"
];

export function rndghostname() {
    return rn2(7) ? ghostnames[rn2(34)] : String(game.plname);
}


export function roguename() {
    const opts = nh_getenv("ROGUEOPTS");
    if (opts) {
        for (let i = 0; i < opts.length; i++) {
            if (opts.substr(i, 5) === "name=") {
                const nameStart = i + 5;
                const commaIdx = opts.indexOf(',', nameStart);
                if (commaIdx !== -1) {
                    return opts.substring(nameStart, commaIdx);
                }
                return opts.substring(nameStart);
            }
        }
    }
    return rn2(3) ? (rn2(2) ? "Michael Toy" : "Kenneth Arnold")
                  : "Glenn Wichman";
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







/* ---------------------------------------------------------------------------
 * hcolor — C ref: nethack-c/src/do_name.c:1460-1467
 * Returns a hallucinated color or the provided color preference.
 * RNG: rn2_on_display_rng(SIZE(hcolors)) if Hallucination or !colorpref
 * ---------------------------------------------------------------------------
 */
import { hcolor } from './do_name.js'; // C do_name.c:1461; single body lives in do_name.js
export { hcolor };



import monsPack from './makemon_mons.json' with { type: 'json' };
import { LEVITATION, FLYING, STEALTH, I_SPECIAL, FROMOUTSIDE } from './const.js';










/* C ref: do_name.c mon_nam_too(struct monst *mon, struct monst *other_mon)
 * PRONOUN_HALLU = 2 (random if hallucinating) */
export function mon_nam_too(mon, other_mon) {
    /* C compares the two struct monst pointers; see xm_same_monst() for why
       the replay-side identity has to go through m_id. */
    if (!xm_same_monst(mon, other_mon)) {
        return mon_nam(mon);
    } else {
        let buf = "";
        switch (pronoun_gender(mon, PRONOUN_HALLU)) {
        case 0:
            buf = "himself";
            break;
        case 1:
            buf = "herself";
            break;
        case 2:
        default:
            buf = "itself";
            break;
        case 3: /* could happen when hallucinating */
            buf = "themselves";
            break;
        }
        return buf;
    }
}




/* ---------------------------------------------------------------------------
 * new_oname — C ref: nethack-c/src/do_name.c:60-76
 * Allocates space for an object's custom name, freeing any prior oextra/name
 * first; a zero-length request just releases the existing name.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function new_oname(obj, lth) {
    if (lth) {
        if (!obj.oextra_present) {
            const oe = newoextra();
            obj.oextra_present = 1;
            obj.oextra_oname_present = oe.oname ? 1 : 0;
            obj.oextra_omonst_present = oe.omonst ? 1 : 0;
            obj.oextra_omailcmd_present = oe.omailcmd ? 1 : 0;
            obj.oextra_omid = oe.omid | 0;
        } else {
            free_oname(obj); /* already has oextra, might also have name */
        }
        obj.oextra_oname_present = 1; /* ONAME(obj) = alloc(lth) */
        if (!obj.oextra) obj.oextra = {};
        obj.oextra.oname = alloc(lth);
        obj.oname = obj.oextra.oname;
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if (obj.oextra_present && obj.oextra_oname_present)
            free_oname(obj);
    }
}

function alloc(size) {
    /* C: char *alloc(unsigned n) — raw buffer allocation; the (unported)
     * do_oname() caller copies the actual name text in afterward. */
    return '';
}

/* ---------------------------------------------------------------------------
 * free_oname — C ref: nethack-c/src/do_name.c:80-88
 * Frees the oname (object custom name) if it exists.
 * No RNG.
 * ---------------------------------------------------------------------------
 */

function free(ptr) {} /* no-op in JS; C: free((genericptr_t) ONAME(obj)) */

/* free_oname: shared body handles nested and flattened object names. */
export function free_oname(obj) { return free_oname_real(obj); }


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
    if ((mdef.data.pmidx | 0) !== PM_SHADE || (obj && dmgval_weapon(obj, mdef)))
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

/* ---------------------------------------------------------------------------
 * domindblast — C ref: nethack-c/src/polyself.c:1881-1926
 * Mind-flayer polymorph attack: psychic blast on nearby monsters.
 * Uses RNG: rn2(2), rn2(10), rnd(15) — path-dependent based on conditions.
 * State changes: u.uen -= 10, monsters may die, botl updated.
 * ---------------------------------------------------------------------------
 */
export async function domindblast() {
    const u = game.u;
    if (!u) return ECMD_OK;

    if ((u.uen | 0) < 10) {
        pline("You concentrate but lack the energy to maintain doing so.");
        return ECMD_OK;
    }

    /* Deduct energy and mark bottom line for update */
    u.uen -= 10;
    /* SET_BOTL() — mark display botl for update */
    if (game.disp) game.disp.botl = 1;

    pline("You concentrate.");
    pline("A wave of psychic energy pours out.");

    /* Iterate through all monsters on level */
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        let nmon = mtmp.nmon;
        let u_sen;
        let dmg;

        /* Skip dead monsters */
        if ((mtmp.mhp | 0) < 1)
            continue;

        /* Skip monsters too far away (distance > BOLT_LIM squared) */
        if (mdistu(mtmp) > ((BOLT_LIM | 0) * (BOLT_LIM | 0)))
            continue;

        /* Skip peaceful monsters */
        if (mtmp.mpeaceful)
            continue;

        /* Skip mindless monsters */
        if (mindless(mtmp.data))
            continue;

        /* Check if we sense this monster via telepathy */
        /* u_sen = telepathic(mtmp->data) && !mtmp->mcansee */
        u_sen = telepathic(mtmp.data) && !mtmp.mcansee;

        /* Main condition: sense via telepathy OR telepathic with 50% chance OR hit 10% */
        /* if (u_sen || (telepathic(mtmp->data) && rn2(2)) || !rn2(10)) */
        if (u_sen || (telepathic(mtmp.data) && rn2(2)) || !rn2(10)) {
            dmg = rnd(15);

            /* Wake up the monster; make hostile only if it survives */
            await wakeup_attack(mtmp, (dmg > (mtmp.mhp | 0)) ? 1 : 0);

            /* Display message */
            const mon_type = u_sen ? "telepathy"
                : telepathic(mtmp.data) ? "latent telepathy"
                : "mind";
            /* C polyself.c:1916 You("lock in on %s %s.", s_suffix(mon_nam(mtmp)),
             * <mon_type>) — pline() takes one formatted string, so interpolate.
             * Passing the args positionally (as this line did) rendered the raw
             * "%s" conversions onto the topline. */
            pline(`You lock in on ${s_suffix(mon_nam(mtmp))} ${mon_type}.`);

            /* Apply damage */
            mtmp.mhp -= dmg;

            /* Kill if dead */
            if ((mtmp.mhp | 0) < 1)
                await killed(mtmp);
        }
    }

    return ECMD_TIME;
}

/* Helper: mdistu — distance squared from hero to monster */
function mdistu(mon) {
    const u = game.u;
    if (!u) return 9999;
    const dx = (u.ux | 0) - (mon.mx | 0);
    const dy = (u.uy | 0) - (mon.my | 0);
    return (dx * dx + dy * dy) | 0;
}

/* Helper: telepathic — check if monster is telepathic */
function telepathic(mdata) {
    if (!mdata) return false;
    const pmidx = (mdata.pmidx | 0);
    /* Floating eye, mind flayer, or master mind flayer */
    return pmidx === 28 || pmidx === 48 || pmidx === 49;  /* PM_FLOATING_EYE, PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER */
}

/* Helper: mindless — C mondata.h:64 mindless(ptr) = (mflags1 & M1_MINDLESS) != 0.
 * M1_MINDLESS is monflag.h:101 == 0x00010000; uses the file-level constant
 * declared above (there must be exactly one copy per file). */
function mindless(mdata) {
    if (!mdata) return false;
    const mflags1 = (mdata.mflags1 | 0);
    return (mflags1 & M1_MINDLESS) !== 0;
}

export async function killed(mtmp) {
    await xkilled_mh(mtmp, XKILL_GIVEMSG_MH);
}

/* C do_name.c:1367 Monnam — upstart(mon_nam(mon)); mon_nam is imported above. */
function Monnam_mm(mon) {
    return Monnam(mon);
}

/* C mon.c seemimic: release appearance metadata and unblock revealed mimics
 * only when no remaining terrain, object, or region blocks the square. */
export function seemimic(mtmp) {
    const wasBlocker = is_lightblocker_mappear(mtmp);
    if (mtmp.mextra && mtmp.mextra.mcorpsenm !== NON_PM)
        freemcorpsenm(mtmp);
    mtmp.m_ap_type = M_AP_NOTHING;
    mtmp.mappearance = 0;
    if (wasBlocker && !does_block(mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my);
    _wakeup_newsym(mtmp.mx | 0, mtmp.my | 0);
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

export async function wakeup(mtmp, via_attack, defer_priest = false) {
    const was_sleeping = mtmp.msleeping;
    wake_msg(mtmp, via_attack);
    mtmp.msleeping = 0;
    const M_AP_MONSTER = 3;
    const apType = M_AP_TYPE(mtmp);
    if (apType !== M_AP_NOTHING) {
        if (apType !== M_AP_MONSTER)
            seemimic(mtmp);
    } else {
        const ctx = game.context || {};
        if (ctx.forcefight && !ctx.mon_moving && mtmp.mundetected) {
            mtmp.mundetected = 0;
            _wakeup_newsym(mtmp.mx, mtmp.my);
        }
    }
    finish_meating(mtmp);
    if (via_attack) {
        const was_peaceful = mtmp.mpeaceful;
        if (was_sleeping)
            growl(mtmp);
        await setmangry(mtmp, true);
        if (was_peaceful) {
            if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE).length
                && !defer_priest)
                await ghod_hitsu(mtmp); // C mon.c:4358: finish retaliation before returning.
            if (mtmp.isshk && !(game.u && game.u.ushops && game.u.ushops[0]))
                hot_pursuit(mtmp);
        }
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

/* HMON_xxx (hack.h) */
const HMON_MELEE = 0, HMON_THROWN = 1, HMON_KICKED = 2, HMON_APPLIED = 3;
const _OCLASS_WEAPON = 2, _OCLASS_TOOL = 6, _OCLASS_GEM = 13;
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
/* C obj.h:235 is_launcher: WEAPON && oc_skill in [P_BOW(20)..P_CROSSBOW(22)] */
function _is_launcher_hmon(otmp) {
    const sk = _oc_skill_hmon(otmp);
    return (otmp.oclass | 0) === _OCLASS_WEAPON && sk >= 20 && sk <= 22;
}
/* C obj.h:242 matching_launcher / ammo_and_launcher */
function _ammo_and_launcher_hmon(a, l) {
    return _is_ammo_hmon(a) && !!l && _oc_skill_hmon(a) === -_oc_skill_hmon(l);
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
            await xkilled_mh(mon, XKILL_NOMSG_MH);
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
    hmd.dmg = dmgval_weapon(obj, mon);
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
        hmd.dmg = dmgval_weapon(obj, mon);
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
            hmd.dmg = dmgval_weapon(obj, mon);
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

/* Ensure a uprops[p] record exists.  C's u.uprops[] is a dense, zero-initialized
 * array (struct prop uprops[LAST_PROP+1]), so every BFlying/BLevitation/BStealth
 * read and read-modify-write below is well-defined in C even when nothing has
 * ever set the property.  The JS replay stores uprops sparsely, so materialize
 * the zero record first — same convention as do_wear.js ensure_uprop(). */
function _ensure_uprop(p) {
    const u = game.u;
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[p])
        u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[p];
}

/* is_flyer(ptr) — C mondata.h:19 macro: ((ptr)->mflags1 & M1_FLY) != 0 */
const M1_FLY_STEED = 0x00000001;
function is_flyer(data) {
    return ((data?.mflags1 | 0) & M1_FLY_STEED) !== 0;
}

export function float_vs_flight() {
    const u = game.u;
    const TT_PIT_VAL = 2;

    _ensure_uprop(LEVITATION);
    _ensure_uprop(FLYING);

    const stuck_in_floor = (u.utrap | 0) && ((u.utraptype | 0) !== TT_PIT_VAL);


    const hLevit = (u.uprops[LEVITATION].intrinsic | 0);
    const eLevit = (u.uprops[LEVITATION].extrinsic | 0);
    const hFlying = (u.uprops[FLYING].intrinsic | 0);
    const eFlying = (u.uprops[FLYING].extrinsic | 0);

    if ((hLevit || eLevit) || ((hFlying || eFlying) && stuck_in_floor)) {
        /* BFlying |= I_SPECIAL */
        u.uprops[FLYING].blocked = (u.uprops[FLYING].blocked | 0) | I_SPECIAL;
    } else {
        /* BFlying &= ~I_SPECIAL */
        u.uprops[FLYING].blocked = ((u.uprops[FLYING].blocked | 0) & ~I_SPECIAL) | 0;
    }

    /* being trapped on the ground overrides floating */
    if ((hLevit || eLevit) && stuck_in_floor) {
        /* BLevitation |= I_SPECIAL */
        u.uprops[LEVITATION].blocked = (u.uprops[LEVITATION].blocked | 0) | I_SPECIAL;
    } else {
        /* BLevitation &= ~I_SPECIAL */
        u.uprops[LEVITATION].blocked = ((u.uprops[LEVITATION].blocked | 0) & ~I_SPECIAL) | 0;
    }

    /* riding blocks stealth unless hero+steed fly */
    steed_vs_stealth();

    /* SET_BOTL */
    if (game.disp) {
        game.disp.botl = 1;
    }
}

/* ---------------------------------------------------------------------------
 * steed_vs_stealth — C ref: nethack-c/src/polyself.c:158-164
 * Updates stealth blocked bit based on mounted status and flying.
 * No RNG calls, state changes only to u.uprops[STEALTH].blocked.
 * ---------------------------------------------------------------------------
 */
export function steed_vs_stealth() {
    const u = game.u;

    _ensure_uprop(LEVITATION);
    _ensure_uprop(FLYING);
    _ensure_uprop(STEALTH);

    const hFlying = (u.uprops[FLYING].intrinsic | 0);
    const eFlying = (u.uprops[FLYING].extrinsic | 0);
    const bFlying = (u.uprops[FLYING].blocked | 0);
    const hLevit = (u.uprops[LEVITATION].intrinsic | 0);
    const eLevit = (u.uprops[LEVITATION].extrinsic | 0);
    const bLevit = (u.uprops[LEVITATION].blocked | 0);

    /* Flying macro: (HFlying || EFlying || is_flyer) && !BFlying */
    const Flying = ((hFlying || eFlying) || (u.usteed && is_flyer(u.usteed.data))) && !bFlying;
    /* Levitation macro: (HLevitation || ELevitation) && !BLevitation */
    const Levitation = (hLevit || eLevit) && !bLevit;

    if (u.usteed && !Flying && !Levitation) {
        /* BStealth |= FROMOUTSIDE */
        u.uprops[STEALTH].blocked = (u.uprops[STEALTH].blocked | 0) | FROMOUTSIDE;
    } else {
        /* BStealth &= ~FROMOUTSIDE */
        u.uprops[STEALTH].blocked = ((u.uprops[STEALTH].blocked | 0) & ~FROMOUTSIDE) | 0;
    }
}


/* ---------------------------------------------------------------------------
 * rndorcname — C ref: nethack-c/src/do_name.c:1538-1555
 * Generate a random orc name by concatenating random vowels and consonants.
 * RNG: rn1(2,3) loop count, rn2(2) initial vstart, conditional rn2(30) per
 *      iteration (i>0), and rn2(4)/rn2(11) for the vowel/consonant rolls.
 * --------------------------------------------------------------------------- */
export function rndorcname(s) {
    /* C do_name.c:1540 */
    const v = ["a", "ai", "og", "u"];
    /* C do_name.c:1541-1542 */
    const snd = ["gor", "gris", "un", "bane", "ruk", "oth", "ul", "z", "thos", "akh", "hai"];

    /* C do_name.c:1543 `int i, iend = rn1(2, 3), vstart = rn2(2);` — BOTH draws
     * happen before the `if (s)` guard, so rndorcname(NULL) still burns two
     * rn2(2)s.  Declarator initialisers are evaluated left to right: iend first. */
    let iend = rn1(2, 3);
    let vstart = rn2(2);

    /* C do_name.c:1545 `if (s)` is a NULL-POINTER test on a `char buf[BUFSZ]`.
     * Both C call sites (do_name.c:1562 christen_orc, mkmaze.c:819 stolen_booty)
     * pass the address of a stack buffer, so the branch is always taken.  JS's
     * `if (s)` would additionally reject "" — the natural JS spelling of an
     * empty C buffer — and silently skip the whole loop, dropping 2*iend-1
     * draws.  Test for null/undefined only, which is what C tests. */
    if (s !== null && s !== undefined) {
        s = "";                                 /* C do_name.c:1546 `*s = '\0'` */
        for (let i = 0; i < iend; ++i) {
            vstart = 1 - vstart;                /* 0 -> 1, 1 -> 0 */
            let dash = "";
            if (i > 0 && !rn2(30)) {
                dash = "-";
            }
            let rolled = vstart ? v[rn2(v.length)] : snd[rn2(snd.length)];
            s = s + dash + rolled;
        }
    }
    return s;                                   /* C do_name.c:1553 */
}



/* Helper: haseyes — C macro: (ptr->mflags1 & M1_NOEYES) == 0 */
function haseyes(mdata) {
    if (!mdata) return true; /* no data: assume has eyes */
    const mflags1 = (mdata.mflags1 | 0);
    const M1_NOEYES = 0x00001000;
    return (mflags1 & M1_NOEYES) === 0;
}







/* Amulet constants (object type indices; C ref: objects.h) */
const AMULET_OF_YENDOR = 213;
const FAKE_AMULET_OF_YENDOR = 212; /* objects.h AMULET() FAKE_AMULET_OF_YENDOR — cheap plastic imitation, the slot before AMULET_OF_YENDOR(213); was 420 = WAN_SPEED_MONSTER */

/* Object class enum values (C ref: objclass.h defsym.h) */
const AMULET_CLASS = 5;
const POTION_CLASS = 8;
const WAND_CLASS = 11;
const RING_CLASS = 4;
const GEM_CLASS = 13;
const SPBOOK_CLASS = 10;
const ARMOR_CLASS = 3;
const TOOL_CLASS = 6;
const VENOM_CLASS = 17;
const SCROLL_CLASS = 9;

// C v5 do_name.c:429-465: an existing user name always allows renaming;
// otherwise only the listed classes with an appearance can be called.
export function objtyp_is_callable(i) {
    const ityp = i | 0;
    if (game._oc_uname?.[ityp] != null)
        return 1;
    const oc_class = (MKOBJ_OC_CLASS[ityp] | 0);

    switch (oc_class) {
    case AMULET_CLASS:
        /* Special amulets (AMULET_OF_YENDOR and FAKE_AMULET_OF_YENDOR)
         * cannot be called to prevent players from identifying them
         * via the discovery mechanism. */
        if (ityp === AMULET_OF_YENDOR || ityp === FAKE_AMULET_OF_YENDOR)
            return 0; /* FALSE */
        /* FALLTHROUGH */
    case SCROLL_CLASS:
    case POTION_CLASS:
    case WAND_CLASS:
    case RING_CLASS:
    case GEM_CLASS:
    case SPBOOK_CLASS:
    case ARMOR_CLASS:
    case TOOL_CLASS:
    case VENOM_CLASS:
        return getObjDescr(ityp) != null ? 1 : 0;
    default:
        break;
    }
    return 0; /* FALSE */
}









/* C obj.h:249 is_weptool(o) — a tool with a non-zero weapon skill. */
export function is_weptool(obj) {
    return !!obj && (obj.oclass | 0) === TOOL_CLASS
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) !== 0;
}

/* some_mon_nam — C ref: nethack-c/src/do_name.c:1062-1071.
 * In between noit_mon_nam() and mon_nam(): where the latter would pick "it",
 * use "someone" (humanoids) or "something" (everything else) instead. */
export function some_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
                    xm_has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | AUGMENT_IT)
                                            : AUGMENT_IT,
                    false);
}

/* y_monnam — C ref: nethack-c/src/do_name.c:1115-1129.  Pet name: "your little
 * dog".  ARTICLE_YOUR is handled by x_monnam itself (do_name.c:1012-1014); the
 * old local "your " prefix double-applied it for pets and mis-applied it for
 * the hostile ARTICLE_THE case. */
export function y_monnam(mtmp) {
    const prefix = mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE;
    /* "saddled" is redundant when mounted */
    const suppression_flag = (xm_has_mgivenname(mtmp)
                              || xm_same_monst(mtmp, (game.u || {}).usteed))
                                 ? SUPPRESS_SADDLE
                                 : 0;

    return x_monnam(mtmp, prefix, null, suppression_flag, false);
}

/* noit_mon_nam — C ref: nethack-c/src/do_name.c:1048-1060.
 * mon_nam() (y_monnam() if tame) but assume the player can always see the
 * monster — used for probing, for cursed-potion-of-invisibility aggravation,
 * and for a pet moving "reluctantly" onto a cursed object. */
export function noit_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_YOUR, null,
                    xm_has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | SUPPRESS_IT)
                                            : SUPPRESS_IT,
                    false);
}

/* ---------------------------------------------------------------------------
 * christen_monst — C ref: nethack-c/src/do_name.c:132-153
 *
 * Give a monster a name. Truncates to PL_PSIZ (63) if necessary.
 * Returns the monster pointer.
 * ---------------------------------------------------------------------------
 */
export function christen_monst(mtmp, name) {
    const PL_PSIZ = 63;
    let lth = (name && name.length > 0) ? (name.length + 1) : 0;
    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        name = name.substring(0, PL_PSIZ - 1);
    }
    new_mgivenname(mtmp, lth); /* removes old name if one is present */
    if (lth)
        mtmp.mextra.mgivenname = name; /* C: Strcpy(MGIVENNAME(mtmp), name) */
    if (mtmp.mleashed) update_inventory(); /* C do_name.c:148-149 */
    return mtmp;
}

/* new_mgivenname — C ref: nethack-c/src/do_name.c:30-46
 * Allocate space for a monster's name; removes old name if one is present.
 * In JS we just clear the old name; caller assigns the new one via Strcpy.
 */
export function new_mgivenname(mtmp, lth) {
    if (lth) {
        /* C: if (!mtmp->mextra) mtmp->mextra = newmextra();
         *    if (MGIVENNAME(mtmp)) free(MGIVENNAME(mtmp));
         *    MGIVENNAME(mtmp) = (char *) alloc((unsigned) lth);
         * The name lives ONLY in mextra (mextra.h MGIVENNAME); the flat
         * mtmp.mgivenname this used to write was invisible to C's
         * has_mgivenname() macro and to every reader that mirrors it. */
        if (!mtmp.mextra)
            mtmp.mextra = newmextra();
        mtmp.mextra.mgivenname = null;
    } else {
        if (mtmp.mextra && mtmp.mextra.mgivenname)
            mtmp.mextra.mgivenname = null;
    }
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
/* objects.h VENOM() BLINDING_VENOM — js/cmd.js:32321. */
const BLINDING_VENOM_HM = 479;
const ACID_VENOM_HM = 480; /* objects.h:1642 VENOM_CLASS ACID_VENOM */
/* hack.h:133 FACE = 2.  (The AT_SPIT that used to be declared here said 7,
 * which is 5.0's AT_HUGS; the one live constant is the shared AT_SPIT above.) */
const FACE_HM = 2;
/* pm.generated.js PM_FLOATING_EYE. */
const PM_FLOATING_EYE_HM = PM_FLOATING_EYE;






/* C do_name.c:1320-1360 obj_pmname(obj) — mons[].pmname for a corpse/statue/
 * figurine, keyed off obj->corpsenm + the CORPSTAT_GENDER bits in obj->spe.
 * The #if 0 saved-montraits branch is dead in the compiled C (never taken);
 * it is not ported here.
 * PM_ALIGNED_CLERIC = 275 (== the "priest"/"priestess"/"aligned cleric"
 * class-monster row; pm.generated.js dedups its name onto PM_PRIEST).
 * PM_CLERIC = 337 (the role monster "priest"/"priestess"/"cleric" row; no
 * exported const — same dedup collision). */
const OBJ_PMNAME_CORPSE = 265;
const OBJ_PMNAME_STATUE = 476;
const OBJ_PMNAME_FIGURINE = 241;
const PM_ALIGNED_CLERIC = 275;
const PM_CLERIC = 337;
export function obj_pmname(obj) {
    if ((obj.otyp === OBJ_PMNAME_CORPSE || obj.otyp === OBJ_PMNAME_STATUE
         || obj.otyp === OBJ_PMNAME_FIGURINE) && ismnum(obj.corpsenm)) {
        const cgend = obj.spe & CORPSTAT_GENDER;
        const mgend = (cgend === CORPSTAT_MALE) ? MALE
                      : (cgend === CORPSTAT_FEMALE) ? FEMALE
                        : NEUTRAL;
        let mndx = obj.corpsenm;

        if (mndx === PM_ALIGNED_CLERIC && cgend === CORPSTAT_RANDOM)
            mndx = PM_CLERIC;

        return monPmname(mndx, mgend);
    }
    impossible("obj_pmname otyp:%i,corpsenm:%i", obj.otyp, obj.corpsenm);
    return "two-legged glorkum-seeker";
}






const PM_WATCHMAN = 282;                 /* was 236 = yeti */
const PM_WATCH_CAPTAIN = 283;             /* pm.generated.js */
const NON_PM = -1;
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
export { title_to_mon } from './botl.js'; // relocate-fns
export { ghod_hitsu } from './priest.js'; // relocate-fns
export { mon_has_amulet } from './wizard.js'; // relocate-fns
export { growl } from './sounds.js'; // relocate-fns
export { Monnam_mm }; // relocate-fns
export { Resists_Elem, attacktype, big_to_little, breakarm, can_be_strangled, can_blnd, can_blow, can_track, cvt_prop_to_mseenres, defended, get_atkdam_type, levl_follower, little_to_big, locomotion, max_passive_dmg, mon_hates_blessings, mon_hates_silver, mons_see_trap, name_to_monplus, num_horns, on_fire, passes_bars, poly_when_stoned, pronoun_gender, raceptr, resist_conflict, resists_blnd, resists_drli, resists_magm, same_race, stagger } from './mondata.js'; // relocate-fns
export { AD_ACID, AD_COLD, AD_ELEC, AD_FIRE, AD_RUST, ARMOR_CLASS, AT_BITE, AT_BOOM, AT_BREA, AT_BUTT, AT_CLAW, AT_ENGL, AT_EXPL, AT_GAZE, AT_HUGS, AT_KICK, AT_MAGC, AT_NONE, AT_SPIT, AT_STNG, AT_TUCH, AT_WEAP, CREAM_PIE, M1_ANIMAL, M1_MINDLESS, NON_PM, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, PM_WATCHMAN, haseyes, is_undead, mindless, xm_Blind, xm_Hallucination }; // relocate-fns
export { adjalign };
