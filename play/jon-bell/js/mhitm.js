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
export { update_inventory } from './inventory_refresh.js';
import { W_ARMOR, W_ACCESSORY, W_WEP, W_SWAPWEP, A_WIS, IS_DOOR, ROOMOFFSET } from './const.js';
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { rn2, rnd, d, rn1, rn2_on_display_rng, pushRngLogEntry } from './rng.js';
import { pline, sensemon, canspotmon, canseemon, rank_of, map_invisible } from './display.js';
import { exercise, acurr, arti_defn_adtyp, arti_cary_adtyp, change_luck } from './attrib.js';
import { erode_obj, mon_learns_traps, m_carrying, split_mon_rt } from './trap.js';
/* C obj.h:257 bimanual(otmp).  Placed immediately after the ./trap.js import
 * above because trap.js:95 already imports this same module, so do_wear.js is
 * already evaluated at this point in the DFS and this edge changes no module
 * evaluation order. */
import { bimanual as bimanual_mm } from './do_wear.js';
import { dist2, s_suffix } from './hacklib.js';
import { attacktype_fordmg, permonstTemplate, hates_silver, dmgtype_fromattack, sliparm, monPmname, monflee, newmextra, which_armor, ureflects, freemcorpsenm } from './makemon.js';
import { has_oname, ONAME, Upolyd, BOLT_LIM, ECMD_OK, ECMD_TIME, Is_astralevel, In_endgame, ismnum, MALE, FEMALE, NEUTRAL, CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, CORPSTAT_RANDOM,
/* x_monnam article / suppression flags — C ref: nethack-c/include/hack.h:1015-1028 */
ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
SUPPRESS_IT, SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE,
SUPPRESS_MAPPEARANCE, SUPPRESS_NAME, AUGMENT_IT,
W_SADDLE, BLINDED, INVIS, STRANGLED, FREE_ACTION, STUNNED } from './const.js';
import { impossible } from './steed.js';
import { M_ATTK_HIT, M_ATTK_MISS, M_ATTK_DEF_DIED, NATTK,
/* attack types */
W_ARMG, W_ARMF, W_ARMH, W_ARMC, W_ARM, W_ARMS, W_ARMU, ER_NOTHING,
/* erosion types */
ERODE_BURN, ERODE_RUST, ERODE_CORRODE,
/* erosion flags */
EF_GREASE, EF_VERBOSE,
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
import { linedup } from './trap.js';
import { mon_nam, exclam } from './uhitm.js';
/* C mon.c:3470 killed() is a one-line wrapper over xkilled(), which lives in
 * js/uhitm.js.  mhitm.js already imports from uhitm.js (mon_nam, dmgval_weapon,
 * ...), so this rides the existing edge rather than adding a new one. */
import { xkilled as xkilled_mh, XKILL_GIVEMSG as XKILL_GIVEMSG_MH, XKILL_NOMSG as XKILL_NOMSG_MH } from './uhitm.js';
import { dmgval as dmgval_weapon, weapon_dam_bonus, use_skill, weapon_type, dbon } from './uhitm.js';
import { MKOBJ_OC_SKILL, MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { setmangry, wake_msg, wake_nearto, healmon } from './mklev.js';
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
import { mbodypart, a_gname_at } from './cmd.js';
import { newsym as _wakeup_newsym } from './display.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { getObjDescr, just_an, The, vtense, xname, cxname, mshot_xname } from './objnam.js';
import { newoextra, lcase } from './mklev.js';
import { str_start_is } from './mklev.js';   /* C hacklib.c:276 — title_to_mon's prefix test */
import { ROLE_RANKS } from './rank_data.js'; /* C role.c roles[].rank[9] */
import { ROLE_PM_MNUM } from './roles.js';   /* C role.c roles[].mnum (the mons[] index) */
/* x_monnam's priest/minion and hallucination branches — C ref: do_name.c:887-904,
 * 950-955.  priestname() is ported (js/priest.js:424); rndmonnam()/bogon_is_pname()
 * are not yet, and self-report if a hallucinating name is ever requested. */
import { priestname, rndmonnam, bogon_is_pname, temple_occupied, has_shrine } from './priest.js';
/* x_monnam's shopkeeper branch — C ref: do_name.c:919-936. */
import { shkname, free_oname as free_oname_real, hot_pursuit } from './dokick.js';
import { nomul } from './allmain.js';
import { monstseesu, shieldeff, buzz } from './mcastu.js';
import { resist, drain_item, hit } from './zap.js';
import { finish_meating } from './dogmove.js';
import { FAINTED } from './const.js';
/* C end.c:185-300 done_in_by — use the canonical death attribution path.
 * mhitm's local no-op used to discard the stoning killer, leaving the
 * tombstone/scoreline without the attacking monster.  end.js already exposes
 * the synchronous body used by mhitu's lethal damage paths; this wrapper
 * avoids a second implementation. */
import { done_in_by as done_in_by_real } from './end.js';

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
 * MONSYM class ordinals (permonst.mlet) — C ref: nethack-c/include/defsym.h
 * MONSYM(idx, ch, basename, sym, desc) => `sym = idx`, so S_* is the ORDINAL,
 * not the display character. Listed with their defsym.h line numbers.
 * ---------------------------------------------------------------------------
 */
const S_EYE = 5;        /* defsym.h:299 */
const S_IMP = 9;        /* defsym.h:305 */
const S_KOBOLD = 11;    /* defsym.h:307 */
const S_NYMPH = 14;     /* defsym.h:310 */
const S_UNICORN = 21;   /* defsym.h:319 */
const S_LIGHT = 25;     /* defsym.h:324 */
const S_CENTAUR = 29;   /* defsym.h:328 */
const S_DRAGON = 30;    /* defsym.h:329 */
const S_LICH = 38;      /* defsym.h:338 */
const S_MUMMY = 39;     /* defsym.h:339 */
const S_NAGA = 40;      /* defsym.h:341 */
const S_OGRE = 41;      /* defsym.h:342 */
const S_VAMPIRE = 48;   /* defsym.h:350 */
const S_WRAITH = 49;    /* defsym.h:351 */
const S_ZOMBIE = 52;    /* defsym.h:355 */
const S_GHOST = 54;     /* defsym.h:358 */
const S_GOLEM = 55;     /* defsym.h:359 */
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
const AD_ACID = 8;
const AD_STON = 18;
const AD_RUST = 24;
const AD_ENCH = 41;
const AD_CORR = 42;
const AD_PLYS = 14;
const AD_COLD = 3;
const AD_STUN = 12;
const AD_ELEC = 6;
const AD_DRLI = 15; /* monattk.h:57 */
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
/* m_canseeu — C ref: nethack-c/include/vision.h:45-52 (macro):
 *   (!Invis || perceives(m->data)) && !Underwater && couldsee(m->mx, m->my)
 * Invis = (HInvis || EInvis) && !BInvis (youprop.h:198)
 * perceives(ptr) = ptr->mflags1 & M1_SEE_INVIS (mondata.h:81)
 * Underwater = u.uinwater (youprop.h:279) */
function m_canseeu(mtmp) {
    const u = game.u;
    const ip = u.uprops?.[INVIS];
    const Invis = !!(ip && (ip.intrinsic || ip.extrinsic) && !(ip.blocked | 0));
    const ptr = permonstTemplate(mtmp.mnum | 0);
    const perceives = !!((ptr.mflags1 || 0) & 0x01000000 /* M1_SEE_INVIS */);
    return (!Invis || perceives) && !u.uinwater && couldsee(mtmp.mx, mtmp.my);
}
/* monstunseesu — C ref: nethack-c/src/mondata.c:1571-1583
 * Monsters in line of sight forget hero resistance to M_SEEN_foo. */
export function monstunseesu(seenres) {
    if (seenres === M_SEEN_NOTHING || game.u.uswallow)
        return;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER */
        if (!m_canseeu(mtmp)) continue;
        mtmp.seen_resistance &= ~seenres; /* m_clearseenres */
    }
}
/* monstseesu — MODULE-LOCAL STUB DELETED.  The real body (js/mcastu.js:315,
 * C ref: mondata.c:1557-1568) is imported at the top of this file; it is the
 * mirror of this file's own already-ported monstunseesu just above (same
 * m_canseeu() guard, same fmon walk) and was verified byte-for-byte against
 * mondata.c before wiring.  The stub dropped all five call sites below
 * (AD_ACID/AD_MAGR/AD_COLD/AD_FIRE/AD_ELEC), so no monster in this file's
 * passive() ever learned it had seen the hero resist a damage type. */
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
function split_mon(mon, you) { return split_mon_rt(mon, you); }
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
/* C ref: nethack-c/src/mondata.c:79-85 poly_when_stoned()
 * is_golem(ptr) == ptr->mlet == S_GOLEM (nethack-c/include/mondata.h:108) */
export function poly_when_stoned(ptr) {
    const S_GOLEM = 55;
    const G_GENOD = 0x02;
    const mv = (game.mvitals && game.mvitals[PM_STONE_GOLEM])
        ? (game.mvitals[PM_STONE_GOLEM].mvflags | 0) : 0;
    return !!(ptr.mlet === S_GOLEM && (ptr.pmidx | 0) !== PM_STONE_GOLEM
              && !(mv & G_GENOD));
}
function monnear(mon, x, y) {
    /* C monmove.c — adjacent or same square. */
    const dx = Math.abs((mon.mx | 0) - (x | 0));
    const dy = Math.abs((mon.my | 0) - (y | 0));
    return dx <= 1 && dy <= 1;
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
    return xm_highc_first(mon_nam(mtmp));
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
        let buf = article === 1 /* ARTICLE_THE */ ? "the " : "";
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

/* ── nh_getenv stub ─────────────────────────────────────────────────────── */
function nh_getenv(name) {
    return null;  /* no environment variables in this port */
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
                await erode_obj(obj, null, ERODE_BURN, EF_GREASE | EF_VERBOSE);
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
            /* C uhitm.c:6180: drain_item(obj, TRUE) — no rn2 */
            if (!mon.mcan) {
                await drain_item(obj, true);
            }
            break;
        default:
            break;
    }
    /* update_inventory() — no RNG */
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
                    void pline("You are splashed!");
                }
                else {
                    void pline(`You are splashed by ${s_suffix(mon_nam(mon))} ${hliquid("acid")}!`);
                }
                const acid_res = _hero_resists(ACID_RES);
                if (!acid_res) {
                    mdamageu(mon, tmp);
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
                    const hero_uptr = (game.youmonst && game.youmonst.data)
                        ? game.youmonst.data
                        : permonstTemplate((u && u.umonnum) | 0);
                    const polymon_to_stone_golem = false; /* KNOWN GAP, above */
                    if (!stone_res &&
                        !(hero_uptr && poly_when_stoned(hero_uptr)
                          && polymon_to_stone_golem)) {
                        done_in_by(mon, STONING);
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
                    void pline("A hail of magic missiles narrowly misses you!");
                }
                else {
                    void pline("You are hit by magic missiles appearing from thin air!");
                    mdamageu(mon, tmp);
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
                        if (ureflects("%s gaze is reflected by your %s.", s_suffix(Monnam(mon)))) {
                            /* reflected — no further action */
                            ;
                        }
                        else {
                            const hallu = _hero_prop_active(HALLUC); /* Hallucination */
                            if (hallu && rn2(4)) {
                                /* C uhitm.c:6031 — hallucination message evasion */
                                void pline(`${Monnam(mon)} looks ${!rn2(2) ? "" : "rather "}${!rn2(2) ? "numb" : "stupefied"}.`);
                            }
                            else {
                                const free_act = _hero_prop_active(FREE_ACTION); /* Free_action */
                                if (free_act) {
                                    void pline(`You momentarily stiffen under ${s_suffix(mon_nam(mon))} gaze!`);
                                }
                                else {
                                    void pline(`You are frozen by ${s_suffix(mon_nam(mon))} gaze!`);
                                    /* C uhitm.c:6043: nomul((ACURR(A_WIS) > 12 || rn2(4)) ? -tmp : -127) */
                                    const awis = (u ? acurr(u, A_WIS) : 0) | 0; /* C: ACURR(A_WIS) */
                                    nomul((awis > 12 || rn2(4)) ? -tmp : -127);
                                    dynamic_multi_reason(mon, "frozen", true);
                                    if (game.n)
                                        game.n.nomovemsg = 0;
                                }
                            }
                        }
                    }
                    else {
                        /* C uhitm.c:6050: mon->mcansee == 0, monster is blind */
                        void pline(`${Monnam(mon)} cannot defend itself.`);
                        /* C uhitm.c:6052: if (!rn2(500)) change_luck(-1) */
                        if (!rn2(500))
                            change_luck(-1);
                    }
                }
                else {
                    /* C uhitm.c:6055: Free_action — gelatinous cube else */
                    const free_act = _hero_prop_active(FREE_ACTION);
                    if (free_act) {
                        void pline("You momentarily stiffen.");
                    }
                    else {
                        void pline(`You are frozen by ${mon_nam(mon)}!`);
                        if (game.n)
                            game.n.nomovemsg = 0; /* You_can_move_again */
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
                        void pline("You feel a mild chill.");
                        monstseesu(M_SEEN_COLD);
                        ugolemeffects(AD_COLD, tmp);
                        break;
                    }
                    monstunseesu(M_SEEN_COLD);
                    void pline("You are suddenly very cold!");
                    mdamageu(mon, tmp);
                    /* C uhitm.c:6080: healmon(mon, (tmp + rn2(2)) / 2, (tmp + 1) / 2) */
                    healmon(mon, ((tmp + rn2(2)) / 2) | 0, ((tmp + 1) / 2) | 0);
                    if ((mon.mhpmax | 0) > (((mon.m_lev | 0) + 1) * 8))
                        split_mon(mon, null /* &gy.youmonst */);
                }
                break;
            case AD_STUN:
                /* C uhitm.c:6086: if (!Stunned) make_stunned((long)tmp, TRUE) */
                {
                    const stunned = _hero_prop_active(STUNNED);
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
                        void pline("You feel mildly warm.");
                        monstseesu(M_SEEN_FIRE);
                        ugolemeffects(AD_FIRE, tmp);
                        break;
                    }
                    monstunseesu(M_SEEN_FIRE);
                    void pline("You are suddenly very hot!");
                    mdamageu(mon, tmp);
                }
                break;
            case AD_ELEC:
                /* C uhitm.c:6104-6114 */
                {
                    const shock_res = _hero_resists(SHOCK_RES);
                    if (shock_res) {
                        shieldeff(ux, uy);
                        void pline("You feel a mild tingle.");
                        monstseesu(M_SEEN_ELEC);
                        ugolemeffects(AD_ELEC, tmp);
                        break;
                    }
                    monstunseesu(M_SEEN_ELEC);
                    void pline("You are jolted with electricity!");
                    mdamageu(mon, tmp);
                }
                break;
            default:
                break;
        }
    }
    return (malive | mhit);
}

/* ---------------------------------------------------------------------------
 * num_horns — C ref: nethack-c/src/mondata.c:677-695
 * Returns the number of horns for a given monster, by pmidx.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function num_horns(ptr) {
    /* C: switch (monsndx(ptr)) — the permonst index. A `struct permonst *`
       arrives here as the reconstructed object carrying .pmidx (the idiom used
       by breakarm/poly_when_stoned/haseyes elsewhere in this file); js/polyself.js
       _has_horns passes the bare index instead, so accept both forms. */
    const ptr_pmidx = (ptr && typeof ptr === 'object')
        ? (ptr.pmidx !== undefined ? (ptr.pmidx | 0) : -1)
        : (ptr | 0);
    const PM_HORNED_DEVIL = 291;
    const PM_MINOTAUR = 177;
    const PM_ASMODEUS = 309;
    const PM_BALROG = 302;
    const PM_WHITE_UNICORN = 101;
    const PM_GRAY_UNICORN = 102;
    const PM_BLACK_UNICORN = 103;
    const PM_KI_RIN = 124;

    switch (ptr_pmidx) {
    case PM_HORNED_DEVIL:
    case PM_MINOTAUR:
    case PM_ASMODEUS:
    case PM_BALROG:
        return 2;
    case PM_WHITE_UNICORN:
    case PM_GRAY_UNICORN:
    case PM_BLACK_UNICORN:
    case PM_KI_RIN:
        return 1;
    default:
        break;
    }
    return 0;
}

const GROWNUPS = [
    [9, 10],     /* chickatrice -> cockatrice */
    [16, 18],    /* little dog -> dog */
    [18, 19],    /* dog -> large dog */
    [25, 26],    /* hell hound pup -> hell hound */
    [22, 24],    /* winter wolf cub -> winter wolf */
    [32, 33],    /* kitten -> housecat */
    [33, 37],    /* housecat -> large cat */
    [100, 104],  /* pony -> horse */
    [104, 105],  /* horse -> warhorse */
    [59, 60],    /* kobold -> large kobold */
    [60, 61],    /* large kobold -> kobold leader */
    [165, 166],  /* gnome -> gnome leader */
    [166, 168],  /* gnome leader -> gnome ruler */
    [44, 46],    /* dwarf -> dwarf leader */
    [46, 47],    /* dwarf leader -> dwarf ruler */
    [48, 49],    /* mind flayer -> master mind flayer */
    [72, 77],    /* orc -> orc captain */
    [73, 77],    /* hill orc -> orc captain */
    [74, 77],    /* Mordor orc -> orc captain */
    [75, 77],    /* Uruk-hai -> orc captain */
    [88, 89],    /* sewer rat -> giant rat */
    [94, 96],    /* cave spider -> giant spider */
    [203, 204],  /* ogre -> ogre leader */
    [204, 205],  /* ogre leader -> ogre tyrant */
    [264, 268],  /* elf -> elf-noble */
    [265, 268],  /* Woodland-elf -> elf-noble */
    [266, 268],  /* Green-elf -> elf-noble */
    [267, 268],  /* Grey-elf -> elf-noble */
    [268, 269],  /* elf-noble -> elven monarch */
    [183, 184],  /* lich -> demilich */
    [184, 185],  /* demilich -> master lich */
    [185, 186],  /* master lich -> arch-lich */
    [226, 227],  /* vampire -> vampire leader */
    [126, 127],  /* bat -> giant bat */
    [133, 143],  /* baby gray dragon -> gray dragon */
    [134, 144],  /* baby gold dragon -> gold dragon */
    [135, 145],  /* baby silver dragon -> silver dragon */
    /* C mondata.c:1266-1268 has baby shimmering -> shimmering inside #if 0 */
    [136, 146],  /* baby red dragon -> red dragon */
    [137, 147],  /* baby white dragon -> white dragon */
    [138, 148],  /* baby orange dragon -> orange dragon */
    [139, 149],  /* baby black dragon -> black dragon */
    [140, 150],  /* baby blue dragon -> blue dragon */
    [141, 151],  /* baby green dragon -> green dragon */
    [142, 152],  /* baby yellow dragon -> yellow dragon */
    [195, 199],  /* red naga hatchling -> red naga */
    [196, 200],  /* black naga hatchling -> black naga */
    [197, 201],  /* golden naga hatchling -> golden naga */
    [198, 202],  /* guardian naga hatchling -> guardian naga */
    [64, 65],    /* small mimic -> large mimic */
    [65, 66],    /* large mimic -> giant mimic */
    [112, 114],  /* baby long worm -> long worm */
    [113, 115],  /* baby purple worm -> purple worm */
    [325, 328],  /* baby crocodile -> crocodile */
    [277, 278],  /* soldier -> sergeant */
    [278, 280],  /* sergeant -> lieutenant */
    [280, 281],  /* lieutenant -> captain */
    [282, 283],  /* watchman -> watch captain */
    [275, 276],  /* aligned cleric -> high cleric */
    [369, 331],  /* student -> archeologist */
    [372, 334],  /* attendant -> healer */
    [373, 335],  /* page -> knight */
    [375, 337],  /* acolyte -> cleric */
    [382, 343],  /* apprentice -> wizard */
    [50, 53],    /* manes -> lemure */
    [179, 180],  /* Keystone Kop -> Kop Sergeant */
    [180, 181],  /* Kop Sergeant -> Kop Lieutenant */
    [181, 182],  /* Kop Lieutenant -> Kop Kaptain */
    [-1, -1],    /* sentinel: NON_PM */
];

/* ---------------------------------------------------------------------------
 * little_to_big — C ref: nethack-c/src/mondata.c:1302-1313
 * Returns the large (adult) form of a monster, or montype unchanged.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function little_to_big(montype) {
    for (let i = 0; GROWNUPS[i][0] >= LOW_PM; i++) {
        if (montype === GROWNUPS[i][0]) {
            montype = GROWNUPS[i][1];
            break;
        }
    }
    return montype;
}

/* ---------------------------------------------------------------------------
 * big_to_little — C ref: nethack-c/src/mondata.c:1315-1326
 * Returns the small (baby) form of a monster, or montype unchanged.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function big_to_little(montype) {
    for (let i = 0; GROWNUPS[i][0] >= LOW_PM; i++) {
        if (montype === GROWNUPS[i][1]) {
            montype = GROWNUPS[i][0];
            break;
        }
    }
    return montype;
}

/* ---------------------------------------------------------------------------
 * same_race — C ref: nethack-c/src/mondata.c:770-879
 * Returns true if two permonst types are considered the same race.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function same_race(pm1, pm2) {
    /* mflags2 bits for race checks */
    const M2_HUMAN = 0x00000008;
    const M2_ELF = 0x00000010;
    const M2_DWARF = 0x00000020;
    const M2_GNOME = 0x00000040;
    const M2_ORC = 0x00000080;
    const M2_MINION = 0x00001000;  /* monflag.h:135 */
    const M2_GIANT = 0x00002000;   /* monflag.h:136 */
    const M2_JEWELS = 0x20000000;  /* monflag.h:151 */
    const M2_DEMON = 0x00000100;
    const M2_UNDEAD = 0x00000002;

    /* monster class symbols: the defsym.h MONSYM ordinals, module-level above. */

    /* pmidx values for specific monsters (js/pm.generated.js) */
    const PM_KOBOLD_ZOMBIE = 239;
    const PM_KOBOLD_MUMMY = 187;
    const PM_TENGU = 55;
    const PM_GARGOYLE = 41;
    const PM_WINGED_GARGOYLE = 42;
    const PM_KILLER_BEE = 1;
    const PM_QUEEN_BEE = 5;
    const PM_MIND_FLAYER = 48;
    const PM_MASTER_MIND_FLAYER = 49;
    const PM_DEATH = 311;
    const PM_PESTILENCE = 312;
    const PM_FAMINE = 313;
    const PM_BABY_LONG_WORM = 112;
    const PM_LONG_WORM = 114;
    const PM_LONG_WORM_TAIL = 330;

    function is_human(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_HUMAN) !== 0;
    }
    function is_elf(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_ELF) !== 0;
    }
    function is_dwarf(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_DWARF) !== 0;
    }
    function is_gnome(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_GNOME) !== 0;
    }
    function is_orc(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_ORC) !== 0;
    }
    function is_giant(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_GIANT) !== 0;
    }
    /* C mondata.h:108 — is_golem(ptr) == ((ptr)->mlet == S_GOLEM) */
    function is_golem(ptr) {
        if (!ptr) return false;
        return (ptr.mlet | 0) === S_GOLEM;
    }
    /* C mondata.h:210-211 */
    function is_mind_flayer(ptr) {
        if (!ptr) return false;
        const pmidx = ptr.pmidx | 0;
        return pmidx === PM_MIND_FLAYER || pmidx === PM_MASTER_MIND_FLAYER;
    }
    /* C mondata.h:149 — mlet == S_UNICORN && likes_gems(ptr) (mondata.h:144) */
    function is_unicorn(ptr) {
        if (!ptr) return false;
        return (ptr.mlet | 0) === S_UNICORN
            && ((ptr.mflags2 | 0) & M2_JEWELS) !== 0;
    }
    /* C mondata.h:161-163 */
    function is_rider(ptr) {
        if (!ptr) return false;
        const pmidx = ptr.pmidx | 0;
        return pmidx === PM_DEATH || pmidx === PM_FAMINE
            || pmidx === PM_PESTILENCE;
    }
    /* C mondata.h:142 */
    function is_minion(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_MINION) !== 0;
    }
    function is_demon(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_DEMON) !== 0;
    }
    /* is_undead lives at module scope (C mondata.h:95, mflags2 & M2_UNDEAD);
       the identical local copy that used to sit here was a shadow. */
    /* C mondata.h:150-152 */
    function is_longworm(ptr) {
        if (!ptr) return false;
        const pmidx = ptr.pmidx | 0;
        return pmidx === PM_BABY_LONG_WORM || pmidx === PM_LONG_WORM
            || pmidx === PM_LONG_WORM_TAIL;
    }

    const let1 = pm1.mlet | 0;
    const let2 = pm2.mlet | 0;

    /* C mondata.c:775 `if (pm1 == pm2)` compares two `struct permonst *`
       into the mons[] table, i.e. it asks "same monster index?". JS has no
       such table identity: js/makemon.js permonstTemplate() mints a FRESH
       object per call (see makemon.js:3467 `mtmp.data = permonstTemplate(
       mtmp.mnum)`), so `pm1 === pm2` is reference equality that never fires
       and every pair falls through to the looser mlet/mflags arms below.
       Ported as the index comparison the C pointer test actually means.
       Guarded on Number.isInteger rather than `|0`: a permonst-shaped object
       without pmidx cannot establish identity, and `undefined|0 === undefined|0`
       would claim every such pair is the same monster. Falling through to the
       mlet/mflags arms is what the (broken) `===` already did, so an
       unidentifiable pair keeps its old answer instead of a new wrong one. */
    const ndx1 = pm1.pmidx, ndx2 = pm2.pmidx;
    if (Number.isInteger(ndx1) && ndx1 === ndx2)
        return true; /* exact match */
    /* player races have their own predicates */
    if (is_human(pm1))
        return is_human(pm2);
    if (is_elf(pm1))
        return is_elf(pm2);
    if (is_dwarf(pm1))
        return is_dwarf(pm2);
    if (is_gnome(pm1))
        return is_gnome(pm2);
    if (is_orc(pm1))
        return is_orc(pm2);
    /* other creatures are less precise */
    if (is_giant(pm1))
        return is_giant(pm2);
    if (is_golem(pm1))
        return is_golem(pm2);
    if (is_mind_flayer(pm1))
        return is_mind_flayer(pm2);
    if (let1 === S_KOBOLD || (pm1.pmidx | 0) === PM_KOBOLD_ZOMBIE
        || (pm1.pmidx | 0) === PM_KOBOLD_MUMMY)
        return (let2 === S_KOBOLD || (pm2.pmidx | 0) === PM_KOBOLD_ZOMBIE
                || (pm2.pmidx | 0) === PM_KOBOLD_MUMMY);
    if (let1 === S_OGRE)
        return (let2 === S_OGRE);
    if (let1 === S_NYMPH)
        return (let2 === S_NYMPH);
    if (let1 === S_CENTAUR)
        return (let2 === S_CENTAUR);
    if (is_unicorn(pm1))
        return is_unicorn(pm2);
    if (let1 === S_DRAGON)
        return (let2 === S_DRAGON);
    if (let1 === S_NAGA)
        return (let2 === S_NAGA);
    /* other critters get steadily messier */
    if (is_rider(pm1))
        return is_rider(pm2);
    if (is_minion(pm1))
        return is_minion(pm2);
    /* tengu don't match imps (first test handled case of both being tengu) */
    if ((pm1.pmidx | 0) === PM_TENGU || (pm2.pmidx | 0) === PM_TENGU)
        return false;
    if (let1 === S_IMP)
        return (let2 === S_IMP);
    /* and minor demons (imps) don't match major demons */
    else if (let2 === S_IMP)
        return false;
    if (is_demon(pm1))
        return is_demon(pm2);
    if (is_undead(pm1)) {
        if (let1 === S_ZOMBIE)
            return (let2 === S_ZOMBIE);
        if (let1 === S_MUMMY)
            return (let2 === S_MUMMY);
        if (let1 === S_VAMPIRE)
            return (let2 === S_VAMPIRE);
        if (let1 === S_LICH)
            return (let2 === S_LICH);
        if (let1 === S_WRAITH)
            return (let2 === S_WRAITH);
        if (let1 === S_GHOST)
            return (let2 === S_GHOST);
    } else if (is_undead(pm2))
        return false;

    /* check for monsters which grow into more mature forms */
    if (let1 === let2) {
        const m1 = pm1.pmidx | 0;
        const m2 = pm2.pmidx | 0;
        let prv, nxt;

        for (prv = m1, nxt = big_to_little(m1); nxt !== prv;
             prv = nxt, nxt = big_to_little(nxt))
            if (nxt === m2)
                return true;
        for (prv = m1, nxt = little_to_big(m1); nxt !== prv;
             prv = nxt, nxt = little_to_big(nxt))
            if (nxt === m2)
                return true;
    }
    /* not caught by little/big handling */
    if ((pm1.pmidx | 0) === PM_GARGOYLE || (pm1.pmidx | 0) === PM_WINGED_GARGOYLE)
        return ((pm2.pmidx | 0) === PM_GARGOYLE
                || (pm2.pmidx | 0) === PM_WINGED_GARGOYLE);
    if ((pm1.pmidx | 0) === PM_KILLER_BEE || (pm1.pmidx | 0) === PM_QUEEN_BEE)
        return ((pm2.pmidx | 0) === PM_KILLER_BEE || (pm2.pmidx | 0) === PM_QUEEN_BEE);

    if (is_longworm(pm1))
        return is_longworm(pm2);
    return false;
}

/* ---------------------------------------------------------------------------
 * get_atkdam_type — C ref: nethack-c/src/mondata.c:1659-1670
 * Returns a random breath weapon type (if AD_RBRE) or adtyp unchanged.
 * RNG: rn2(SIZE(rnd_breath_typ)) = rn2(8) when adtyp == AD_RBRE.
 * ---------------------------------------------------------------------------
 */
export function get_atkdam_type(adtyp) {
    const AD_RBRE = 242;
    const AD_MAGM = 1;
    const AD_FIRE = 2;
    const AD_COLD = 3;
    const AD_SLEE = 4;
    const AD_DISN = 5;
    const AD_ELEC = 6;
    const AD_DRST = 7;
    const AD_ACID = 8;

    if (adtyp === AD_RBRE) {
        const rnd_breath_typ = [
            AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE,
            AD_DISN, AD_ELEC, AD_DRST, AD_ACID
        ];
        return rnd_breath_typ[rn2(rnd_breath_typ.length)];
    }
    return adtyp;
}

/* ---------------------------------------------------------------------------
 * hcolor — C ref: nethack-c/src/do_name.c:1460-1467
 * Returns a hallucinated color or the provided color preference.
 * RNG: rn2_on_display_rng(SIZE(hcolors)) if Hallucination or !colorpref
 * ---------------------------------------------------------------------------
 */
export function hcolor(colorpref) {
    const hcolors = [
        "ultraviolet", "infrared", "bluish-orange", "reddish-green", "dark white",
        "light black", "sky blue-pink", "pinkish-cyan", "indigo-chartreuse",
        "salty", "sweet", "sour", "bitter", "umami", /* basic tastes */
        "striped", "spiral", "swirly", "plaid", "checkered", "argyle", "paisley",
        "blotchy", "guernsey-spotted", "polka-dotted", "square", "round",
        "triangular", "cabernet", "sangria", "fuchsia", "wisteria", "lemon-lime",
        "strawberry-banana", "peppermint", "romantic", "incandescent",
        "octarine", /* Discworld: the Colour of Magic */
        "excitingly dull", "mauve", "electric",
        "neon", "fluorescent", "phosphorescent", "translucent", "opaque",
        "psychedelic", "iridescent", "rainbow-colored", "polychromatic",
        "colorless", "colorless green",
        "dancing", "singing", "loving", "loudy", "noisy", "clattery", "silent",
        "apocyan", "infra-pink", "opalescent", "violant", "tuneless",
        "viridian", "aureolin", "cinnabar", "purpurin", "gamboge", "madder",
        "bistre", "ecru", "fulvous", "tekhelet", "selective yellow",
    ];

    // Check Hallucination: HHallucination && !Halluc_resistance
    const HHallucination = game.u?.uprops?.[HALLUC]?.intrinsic || 0;
    const HHalluc_resistance = game.u?.uprops?.[HALLUC_RES]?.intrinsic || 0;
    const EHalluc_resistance = game.u?.uprops?.[HALLUC_RES]?.extrinsic || 0;
    const Halluc_resistance = HHalluc_resistance || EHalluc_resistance;
    const Hallucination = HHallucination && !Halluc_resistance;

    if (Hallucination || !colorpref) {
        return hcolors[rn2_on_display_rng(hcolors.length)];
    }
    return colorpref;
}


/* ---------------------------------------------------------------------------
 * cvt_prop_to_mseenres — C ref: nethack-c/src/mondata.c:1539-1555
 * Converts a property resistance to a monster-seen-flag bitmask.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function cvt_prop_to_mseenres(prop) {
    switch (prop) {
    case ANTIMAGIC: return M_SEEN_MAGR;
    case FIRE_RES: return M_SEEN_FIRE;
    case COLD_RES: return M_SEEN_COLD;
    case SLEEP_RES: return M_SEEN_SLEEP;
    case DISINT_RES: return M_SEEN_DISINT;
    case POISON_RES: return M_SEEN_POISON;
    case SHOCK_RES: return M_SEEN_ELEC;
    case ACID_RES: return M_SEEN_ACID;
    case REFLECTING: return M_SEEN_REFL;
    default: return M_SEEN_NOTHING;
    }
}

import monsPack from './makemon_mons.json' with { type: 'json' };
import { LEVITATION, FLYING, STEALTH, I_SPECIAL, FROMOUTSIDE } from './const.js';

const MONS_CT = /** @type {number[][]} */ (monsPack.mons);
/* ---------------------------------------------------------------------------
 * can_track — C ref: nethack-c/src/mondata.c:622-629
 * Returns true if monster can be tracked well.
 * Returns: TRUE if hero wields Excalibur, else TRUE if monster has eyes.
 * No RNG, no state changes.
 * Argument: ptr is a permonst * (marshalled as {pmidx}, the monster index)
 * ---------------------------------------------------------------------------
 */
export function can_track(ptr) {
    /* Returns true if monster can track well.
     * If wielding Excalibur: always true.
     * Otherwise: true if the monster has eyes (no M1_NOEYES flag).
     */
    if (u_wield_art(ART_EXCALIBUR))
        return true;
    /* ptr is {pmidx: mndx}; extract the monster index */
    const mndx = (ptr && typeof ptr === 'object' && ptr.pmidx !== undefined)
        ? (ptr.pmidx | 0)
        : -1;
    return haseyes_idx(mndx);
}

/* Macro: haseyes — C ref: nethack-c/include/mondata.h:46
 * Returns true if monster data does NOT have M1_NOEYES flag set.
 * Expands to: (ptr->mflags1 & M1_NOEYES) == 0
 * Implementation for index-based access to MONS array.
 */
function haseyes_idx(mndx) {
    const M1_NOEYES = 0x00001000; /* monflag.h */
    if ((mndx | 0) < 0 || (mndx | 0) >= MONS_CT.length)
        return true; /* out of bounds: assume has eyes */
    const mflags1 = (MONS_CT[mndx | 0][6] | 0);
    return (mflags1 & M1_NOEYES) === 0;
}

/* Macro: u_wield_art — C ref: nethack-c/include/obj.h:441
 * Returns true if the wielded weapon is the specified artifact.
 * Expands to: is_art(uwep, art) → uwep && uwep->oartifact == art
 */
function u_wield_art(art) {
    const uwep = (game.u && game.u.uwep) || null;
    if (!uwep) return false;
    return ((uwep.oartifact | 0) === art);
}

/* Artifact constant: Excalibur (C ref: nethack-c/include/artilist.h)
 * artilist[0] is a dummy element, artilist[1] is Excalibur */
const ART_EXCALIBUR = 1;

/* ---------------------------------------------------------------------------
 * can_blow — C ref: nethack-c/src/mondata.c:566-576
 * Returns true if a monster can blow (whistle, etc).
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function can_blow(mtmp) {
    const MS_SILENT = 0;
    const MS_BUZZ = 10;
    const M1_BREATHLESS = 0x00000400;
    const M1_NOHEAD = 0x00008000;
    const MZ_SMALL = 1;
    const S_EEL = 57;

    /* Get the monster's data template (permonst). mon.data is materialized
       by the replay reconstructor from data_mndx. */
    const data = mtmp.data;
    if (!data) return true; /* fallback: allow blowing if data missing */

    /* C: if ((is_silent(mtmp->data) || mtmp->data->msound == MS_BUZZ)
            && (breathless(mtmp->data) || verysmall(mtmp->data)
                || !has_head(mtmp->data) || mtmp->data->mlet == S_EEL))
            return FALSE; */
    const is_silent = (data.msound | 0) === MS_SILENT;
    const msound_is_buzz = (data.msound | 0) === MS_BUZZ;
    const breathless = ((data.mflags1 | 0) & M1_BREATHLESS) !== 0;
    const verysmall = (data.msize | 0) < MZ_SMALL;
    const has_head = ((data.mflags1 | 0) & M1_NOHEAD) === 0;
    const is_eel = (data.mlet | 0) === S_EEL;

    if ((is_silent || msound_is_buzz) &&
        (breathless || verysmall || !has_head || is_eel)) {
        return false;
    }

    /* C: if ((mtmp == &gy.youmonst) && Strangled)
            return FALSE; */
    const is_you = is_youmonst(mtmp); /* C: mtmp == &gy.youmonst */
    if (is_you) {
        const u = game.u;
        const strangled = u && u.uprops && u.uprops[STRANGLED]
            && u.uprops[STRANGLED].intrinsic;
        if (strangled) {
            return false;
        }
    }

    return true;
}

/* ---------------------------------------------------------------------------
 * max_passive_dmg — C ref: nethack-c/src/mondata.c:720-767
 * Returns the maximum damage a defender can do to the attacker via
 * a passive defense.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function max_passive_dmg(mdef, magr) {
    /* NATTK (import, permonst.h:48 == 6) and AT_NONE/AT_CLAW/AT_BITE/AT_KICK/
       AT_BUTT/AT_TUCH/AT_STNG/AT_HUGS/AT_WEAP + AD_FIRE/AD_RUST/AD_ACID/
       AD_COLD/AD_ELEC all come from module scope.  The local copies that used
       to be here silently overrode them, and AT_HUGS was 12 (that is AT_BREA,
       monattk.h:22) instead of monattk.h:19's 7 — so the AT_HUGS arm of the
       multi2 loop below matched breath attackers and missed huggers.
       Only the constants with no module-scope declaration stay local: */
    const AT_ENGL = 11;  /* C monattk.h:21 (was 13, which is AT_EXPL) */
    const AT_TENT = 16;  /* C monattk.h:26 (was 15, which is AT_GAZE) */
    const AT_BOOM = 14;  /* C monattk.h:24 */
    const AD_DCAY = 34;  /* C monattk.h:76 (was 5, which is AD_DISN) */
    const AD_PHYS = 0;   /* C monattk.h:42 */

    /* C mondata.h:223-227 — three mons[] IDENTITY tests (js/makemon_pmnames.json
     * confirms 249 straw, 250 paper, 253 leather, 254 wood, 259 iron golem). */
    const PM_STRAW_GOLEM_ = 249, PM_PAPER_GOLEM_ = 250;
    const PM_LEATHER_GOLEM_ = 253, PM_WOOD_GOLEM_ = 254, PM_IRON_GOLEM_ = 259;
    const pmidx_of = (ptr) => (ptr ? ((ptr.pmidx ?? ptr.mnum ?? -1) | 0) : -1);
    function completelyburns(ptr) {
        const i = pmidx_of(ptr);
        return i === PM_PAPER_GOLEM_ || i === PM_STRAW_GOLEM_;
    }
    function completelyrots(ptr) {
        const i = pmidx_of(ptr);
        return i === PM_WOOD_GOLEM_ || i === PM_LEATHER_GOLEM_;
    }
    function completelyrusts(ptr) {
        return pmidx_of(ptr) === PM_IRON_GOLEM_;
    }
    /* C monst.h:270-279 — Resists_Elem(mon, X) over
     * mon_resistancebits(mon) = data->mresists | mextrinsics | mintrinsics.
     * Bits are monflag.h:62-69; note MR_ACID is 0x40, NOT the 0x08 that
     * js/mhitu.js's local resists_acid_mu carries (0x08 is MR_DISINT). */
    const MR_FIRE_ = 0x01, MR_COLD_ = 0x02, MR_ELEC_ = 0x10, MR_ACID_ = 0x40;
    const resistancebits = (mon) =>
        (((mon && mon.data) ? (mon.data.mresists | 0) : 0)
         | ((mon && mon.mextrinsics) | 0) | ((mon && mon.mintrinsics) | 0));
    function resists_acid(mtmp) { return (resistancebits(mtmp) & MR_ACID_) !== 0; }
    function resists_cold(mtmp) { return (resistancebits(mtmp) & MR_COLD_) !== 0; }
    function resists_fire(mtmp) { return (resistancebits(mtmp) & MR_FIRE_) !== 0; }
    function resists_elec(mtmp) { return (resistancebits(mtmp) & MR_ELEC_) !== 0; }

    let multi2 = 0;
    let i;

    /* C: for (i = 0; i < NATTK; i++)
            switch (magr->data->mattk[i].aatyp) {
            case AT_CLAW: ... case AT_WEAP: multi2++; break; } */
    const magr_data = magr.data;
    if (magr_data && magr_data.mattk) {
        for (i = 0; i < NATTK; i++) {
            const aatyp = magr_data.mattk[i].aatyp | 0;
            switch (aatyp) {
                case AT_CLAW:
                case AT_BITE:
                case AT_KICK:
                case AT_BUTT:
                case AT_TUCH:
                case AT_STNG:
                case AT_HUGS:
                case AT_ENGL:
                case AT_TENT:
                case AT_WEAP:
                    multi2++;
                    break;
                default:
                    break;
            }
        }
    }

    let dmg = 0;
    const mdef_data = mdef.data;
    if (mdef_data && mdef_data.mattk) {
        /* C: for (i = 0; i < NATTK; i++)
                if (mdef->data->mattk[i].aatyp == AT_NONE
                    || mdef->data->mattk[i].aatyp == AT_BOOM) { ... } */
        for (i = 0; i < NATTK; i++) {
            const aatyp = mdef_data.mattk[i].aatyp | 0;
            if (aatyp === AT_NONE || aatyp === AT_BOOM) {
                const adtyp = mdef_data.mattk[i].adtyp | 0;
                /* C: if ((adtyp == AD_FIRE && completelyburns(magr->data))
                        || (adtyp == AD_DCAY && completelyrots(magr->data))
                        || (adtyp == AD_RUST && completelyrusts(magr->data))) {
                        dmg = magr->mhp;
                    } else if ((adtyp == AD_ACID && !resists_acid(magr))
                               || (adtyp == AD_COLD && !resists_cold(magr))
                               || (adtyp == AD_FIRE && !resists_fire(magr))
                               || (adtyp == AD_ELEC && !resists_elec(magr))
                               || adtyp == AD_PHYS) {
                        dmg = mdef->data->mattk[i].damn;
                        if (!dmg)
                            dmg = mdef->data->mlevel + 1;
                        dmg *= mdef->data->mattk[i].damd;
                    } */
                if ((adtyp === AD_FIRE && completelyburns(magr_data))
                    || (adtyp === AD_DCAY && completelyrots(magr_data))
                    || (adtyp === AD_RUST && completelyrusts(magr_data))) {
                    dmg = magr.mhp | 0;
                } else if ((adtyp === AD_ACID && !resists_acid(magr))
                           || (adtyp === AD_COLD && !resists_cold(magr))
                           || (adtyp === AD_FIRE && !resists_fire(magr))
                           || (adtyp === AD_ELEC && !resists_elec(magr))
                           || adtyp === AD_PHYS) {
                    dmg = mdef_data.mattk[i].damn | 0;
                    if (!dmg) {
                        dmg = (mdef_data.mlevel | 0) + 1;
                    }
                    dmg = Math.imul(dmg, mdef_data.mattk[i].damd | 0);
                }
                /* C: dmg *= multi2; break; */
                dmg = Math.imul(dmg, multi2);
                break;
            }
        }
    }

    return dmg | 0;
}

/* ---------------------------------------------------------------------------
 * on_fire — C ref: nethack-c/src/mondata.c:1410-1446
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function on_fire(mptr, mattk) {
    let what;
    switch (mptr.pmidx | 0) {
    case PM_FLAMING_SPHERE:
    case PM_FIRE_VORTEX:
    case PM_FIRE_ELEMENTAL:
    case PM_SALAMANDER:
        what = "already on fire";
        break;
    case PM_WATER_ELEMENTAL:
    case PM_FOG_CLOUD:
    case PM_STEAM_VORTEX:
        what = "boiling";
        break;
    case PM_ICE_VORTEX:
    case PM_GLASS_GOLEM:
        what = "melting";
        break;
    case PM_STONE_GOLEM:
    case PM_CLAY_GOLEM:
    case PM_GOLD_GOLEM:
    case PM_AIR_ELEMENTAL:
    case PM_EARTH_ELEMENTAL:
    case PM_DUST_VORTEX:
    case PM_ENERGY_VORTEX:
        what = "heating up";
        break;
    default:
        what = ((mattk.aatyp | 0) === AT_HUGS) ? "being roasted" : "on fire";
        break;
    }
    return what;
}

/* C ref: do_name.c pronoun_gender(struct monst *mtmp, unsigned pg_flags)
 * flags&1: suppress visibility check; flags&2: random if hallucinating.
 * Macros (mondata.h): is_neuter=M2_NEUTER, humanoid=M1_HUMANOID, type_is_pname=M2_PNAME, G_UNIQ=0x1000. */
export function pronoun_gender(mtmp, pg_flags) {
    const override_vis = (pg_flags & 1) ? true : false;
    const hallu_rand = (pg_flags & 2) ? true : false;
    if (hallu_rand && game.u?.uprops?.[HALLUC]?.intrinsic)
        return rn2(4);
    if (!override_vis && !canspotmon(mtmp))
        return 2;
    if (mtmp.data.mflags2 & 0x00040000) /* is_neuter (M2_NEUTER) */
        return 2;
    const is_humanoid = (mtmp.data.mflags1 & 0x00020000); /* M1_HUMANOID */
    const is_unique = (mtmp.data.geno & 0x1000);          /* G_UNIQ */
    const is_pname = (mtmp.data.mflags2 & 0x00080000);    /* M2_PNAME */
    return (is_humanoid || is_unique || is_pname) ? (mtmp.female | 0) : 2;
}

/* C ref: do_name.c mon_nam_too(struct monst *mon, struct monst *other_mon)
 * PRONOUN_HALLU = 2 (random if hallucinating) */
export function mon_nam_too(mon, other_mon) {
    /* C compares the two struct monst pointers; see xm_same_monst() for why
       the replay-side identity has to go through m_id. */
    if (!xm_same_monst(mon, other_mon)) {
        return mon_nam(mon);
    } else {
        let buf = "";
        switch (pronoun_gender(mon, 2)) { /* PRONOUN_HALLU */
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

/* C ref: monst.h:215 is_vampshifter(mon) — cham is one of the vampire-shifter forms.
 * (PM_VAMPIRE_LEADER ≡ index 227 ≡ JS PM_VAMPIRE_LORD; version naming, same mons[] idx.) */
function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD || mon.cham === PM_VLAD_THE_IMPALER;
}
/* C ref: mondata.c mon_hates_silver(struct monst *mon) —
 *   return is_vampshifter(mon) || hates_silver(mon->data); */
export function mon_hates_silver(mon) {
    return !!(is_vampshifter(mon) || hates_silver(mon.data));
}

/* ---------------------------------------------------------------------------
 * hates_blessings — C ref: nethack-c/src/mondata.c:539-543
 * Returns true if monster-type is especially affected by blessed objects.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
function hates_blessings(ptr) {
    const M2_DEMON = 0x00000100; /* C monflag.h:131 */
    /* C mondata.c:541: return (is_undead(ptr) || is_demon(ptr));
       is_undead is the module-scope predicate (mflags2 & M2_UNDEAD); a local
       `const is_undead` used to shadow it here with the same value. */
    const is_demon = (ptr.mflags2 & M2_DEMON) !== 0;
    return is_undead(ptr) || is_demon;
}

/* ---------------------------------------------------------------------------
 * mon_hates_blessings — C ref: nethack-c/src/mondata.c:532-537
 * Returns true if the monster hates blessed objects (either vampshifter or
 * if the monster type is undead or demon).
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function mon_hates_blessings(mon) {
    return !!(is_vampshifter(mon) || hates_blessings(mon.data));
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
        obj.oname = alloc(lth);
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

/* ---------------------------------------------------------------------------
 * raceptr — C ref: nethack-c/src/mondata.c:1358-1364
 * Returns correct pointer for non-polymorphed and polymorphed player.
 * It does not return a pointer to player role character.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function raceptr(mtmp) {
    /* C: if (mtmp == &gy.youmonst && !Upolyd).  Was `(mtmp.m_id | 0) === 0`,
     * this file's own documented-stale is_you spelling (see can_blnd's header
     * comment above) — correct only while game.youmonst is unpopulated, wrong
     * once the hero polymorphs (game.youmonst.m_id becomes 1).  Unlike
     * can_blnd, raceptr has ZERO live callers anywhere in js/ (grep-verified
     * 2026-09; only two stale comments in js/do_wear.js and js/trap.js name
     * it), so there is no fabricated-youmonst-placeholder caller this could
     * silently invert behaviour for — safe to switch to the file's
     * pointer-identity-correct is_youmonst(). */
    const is_you = is_youmonst(mtmp);
    const u = game.u;
    if (is_you && !Upolyd(u)) {
        /* C: return &mons[gu.urace.mnum] */
        const urace_mnum = (u && u.urace && (u.urace.mnum | 0)) || 0;
        return permonstTemplate(urace_mnum);
    }
    /* C: return mtmp->data */
    return mtmp.data;
}

export function shade_miss(magr, mdef, obj, thrown, verbose) {
    const youagr = (magr.m_id | 0) === 0;
    const youdef = (mdef.m_id | 0) === 0;

    /* we're using dmgval() for zero/not-zero, not for actual damage amount */
    /* C uhitm.c:2028 calls the one dmgval() (weapon.c:216).  It is the SAME
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
            /* C uhitm.c:2042-2043: pline("%s %s %s%s%s.", whose, what,
             *   vtense(what, "pass"), harmlessly_thru, target); */
            const whose = youagr ? "Your" : s_suffix(Monnam(magr));
            pline(`${whose} ${what} ${vtense(what, "pass")}${harmlessly_thru}${target}.`);
        } else {
            /* C uhitm.c:2045-2046: pline("%s %s%s%s.", The(what),
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

function growl_sound(ptr) {
    /* C monflag.h:11-59 ms_sounds — values transcribed from the 5.0 enum, not
     * assumed contiguous (MS_HISS is 9, MS_GROAN is 44). */
    const MS_SILENT = 0, MS_BARK = 1, MS_MEW = 2, MS_ROAR = 3, MS_BELLOW = 4,
          MS_GROWL = 5, MS_SQEEK = 6, MS_SQAWK = 7, MS_HISS = 9, MS_BUZZ = 10,
          MS_NEIGH = 12, MS_MOO = 13, MS_WAIL = 14, MS_GROAN = 44;
    switch (ptr.msound | 0) {
    case MS_MEW: case MS_HISS: return 'hiss';
    case MS_BARK: case MS_GROWL: return 'growl';
    case MS_ROAR: return 'roar';
    case MS_BELLOW: return 'bellow';
    case MS_BUZZ: return 'buzz';
    case MS_SQEEK: return 'squeal';
    case MS_SQAWK: return 'screech';
    case MS_NEIGH: return 'neigh';
    case MS_WAIL: return 'wail';
    case MS_GROAN: return 'groan';
    case MS_MOO: return 'low';
    case MS_SILENT: return 'commotion';
    default: return 'scream';
    }
}
/* RETURN VALUE: C's growl() is void; its callers read `iflags.last_msg ==
 * PLNMSG_GROWL` afterwards to learn whether a growl message actually printed
 * (mon.c:4243).  js/ has no last_msg channel, so this returns that same
 * predicate — TRUE iff the pline below ran.  Every existing caller ignores it. */
export function growl(mtmp) {
    const data = mtmp.data || permonstTemplate((mtmp.mndx ?? mtmp.mnum ?? -1) | 0);
    if (!data) return false;
    /* C mondata.h helpless(mon) — msleeping || !mcanmove.  wakeup() clears
     * msleeping BEFORE calling growl, so this normally passes. */
    if ((mtmp.msleeping | 0) || !(mtmp.mcanmove | 0) || (data.msound | 0) === 0 /* MS_SILENT */)
        return false;
    /* C sounds.c:365-368 — `if (Hallucination) growl_verb = ROLL_FROM(h_sounds);
     * else growl_verb = growl_sound(mtmp);`.  The hallucination arm was missing,
     * and it is an rn2(35) on the CORE stream, not just a different word. */
    const growl_verb = xm_Hallucination()
        ? H_SOUNDS_MM[rn2(H_SOUNDS_MM.length)]
        : growl_sound(data);
    if (growl_verb) {
        /* C: if (canseemon(mtmp) || !Deaf) — this port has no deaf hero. */
        pline(Monnam_mm(mtmp) + ' ' + vtense(null, growl_verb) + '!');
        wake_nearto(mtmp.mx | 0, mtmp.my | 0, (data.mlevel | 0) * 18);
        return true;
    }
    return false;
}
const H_SOUNDS_MM = [
    'beep',   'boing',   'sing',   'belche', 'creak',   'cough',
    'rattle', 'ululate', 'pop',    'jingle', 'sniffle', 'tinkle',
    'eep',    'clatter', 'hum',    'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk',    'lisp',   'yodel',  'coo',     'burp',
    'moo',    'boom',    'murmur', 'oink',   'quack',   'rumble',
    'twang',  'toot',    'gargle', 'hoot',   'warble',
];
/* C monflag.h msound ordinals read by yelp()'s switch. */
/* C monflag.h:12-25 — ms_sounds enum values. */
const MS_BARK_MM = 1, MS_MEW_MM = 2, MS_ROAR_MM = 3, MS_GROWL_MM = 5,
      MS_SQEEK_MM = 6, MS_SQAWK_MM = 7, MS_WAIL_MM = 14;
export function yelp(mtmp) {
    const data = mtmp.data || permonstTemplate((mtmp.mndx ?? mtmp.mnum ?? -1) | 0);
    if (!data) return;
    const msound = data.msound | 0;
    /* C mondata.h helpless(mon) = msleeping || !mcanmove. */
    if ((mtmp.msleeping | 0) || !(mtmp.mcanmove | 0) || !msound)
        return;
    let yelp_verb = null;
    if (xm_Hallucination()) {
        yelp_verb = H_SOUNDS_MM[rn2(H_SOUNDS_MM.length)];
    } else {
        switch (msound) {
        case MS_MEW_MM:   yelp_verb = 'yowl'; break;
        case MS_BARK_MM:
        case MS_GROWL_MM: yelp_verb = 'yelp'; break;
        case MS_ROAR_MM:  yelp_verb = 'snarl'; break;
        case MS_SQEEK_MM: yelp_verb = 'squeal'; break;
        case MS_SQAWK_MM: yelp_verb = 'screak'; break;
        case MS_WAIL_MM:  yelp_verb = 'wail'; break;
        default: break;
        }
    }
    if (yelp_verb) {
        pline(Monnam_mm(mtmp) + ' ' + vtense(null, yelp_verb) + '!');
        if (game.context?.run)
            nomul(0);
        wake_nearto(mtmp.mx | 0, mtmp.my | 0, (data.mlevel | 0) * 12);
    }
}
/* C do_name.c:1367 Monnam — upstart(mon_nam(mon)); mon_nam is imported above. */
function Monnam_mm(mon) {
    const s = mon_nam(mon);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* C mon.c seemimic: release appearance metadata and unblock revealed mimics
 * only when no remaining terrain, object, or region blocks the square. */
export function seemimic(mtmp) {
    const wasBlocker = is_lightblocker_mappear(mtmp);
    if (mtmp.mextra && mtmp.mextra.mcorpsenm !== NON_PM)
        freemcorpsenm(mtmp);
    mtmp.m_ap_type = 0; /* M_AP_NOTHING */
    mtmp.mappearance = 0;
    if (wasBlocker && !does_block(mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my);
    _wakeup_newsym(mtmp.mx | 0, mtmp.my | 0);
}

export async function wakeup(mtmp, via_attack, defer_priest = false) {
    const was_sleeping = mtmp.msleeping;
    wake_msg(mtmp, via_attack);
    mtmp.msleeping = 0;
    const M_AP_NOTHING = 0, M_AP_MONSTER = 3;
    const apType = (mtmp.m_ap_type | 0) & 0x7 /* M_AP_TYPMASK */;
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
            if (mtmp.ispriest && !defer_priest)
                ghod_hitsu(mtmp);
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
    await wakeup(mtmp, via_attack, true);
    if (via_attack && mtmp.mpeaceful && mtmp.ispriest)
        await ghod_hitsu(mtmp);
}

export async function hmon(mon, obj, thrown, dieroll) {
    const anger_guards = (mon.mpeaceful
        && (mon.ispriest || mon.isshk /* || is_watch(mon.data) */));
    const result = await hmon_hitmon(mon, obj, thrown, dieroll);
    if (mon.ispriest && !rn2(2))
        await ghod_hitsu(mon);
    if (anger_guards) {
    }
    return result;
}

/* HMON_xxx (hack.h) */
const HMON_MELEE = 0, HMON_THROWN = 1, HMON_KICKED = 2, HMON_APPLIED = 3;
const _OCLASS_WEAPON = 2, _OCLASS_TOOL = 6, _OCLASS_GEM = 13;
const _MAT_SILVER_HMON = 10; /* oc_material SILVER (mkobj material encoding) */

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
            || (thrown === HMON_APPLIED && uwep && is_pole_hmon(uwep))),
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
        await _hmon_hitmon_dmg_recalc(hmd, obj, u, uwep);

    if (hmd.dmg < 1) {
        const mon_is_shade = (mon.data && (mon.data.pmidx | 0) === PM_SHADE);
        hmd.dmg = (hmd.get_dmg_bonus && !mon_is_shade) ? 1 : 0;
    }

    let maybe_knockback = false;
    if (hmd.jousting) {
        /* not exercised */
    } else if (hmd.unarmed && hmd.dmg > 1 && !thrown && !obj && !Upolyd(u)) {
        /* stagger — not exercised (thrown) */
    } else if (!hmd.unarmed && hmd.dmg > 1 && !thrown && !Upolyd(u)
               && !u.twoweap && uwep) {
        maybe_knockback = true;
    }

    if (!hmd.already_killed) {
        /* first_weapon_hit requires thrown==MELEE/APPLIED — skipped for THROWN */
        mon.mhp -= hmd.dmg;
    }
    if ((mon.mhp | 0) > (mon.mhpmax | 0))
        mon.mhp = mon.mhpmax;
    if ((mon.mx | 0) === 0)
        hmd.offmap = true;
    if ((mon.mhp | 0) < 1) /* DEADMONSTER */
        hmd.destroyed = true;

    await _hmon_hitmon_pet(hmd, mon);
    /* splitmon: puddings + hand_to_hand only — never for THROWN */
    _hmon_hitmon_msg_hit(hmd, mon, obj);

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
        /* confusing touch — hand_to_hand only, not for THROWN */
    }

    if (!hmd.destroyed && !hmd.offmap) {
        await wakeup_attack(mon, true);
        void maybe_knockback;
    }
    return hmd.destroyed ? false : true;
}

function is_pole_hmon(otmp) {
    const o = otmp.oclass | 0;
    const sk = _oc_skill_hmon(otmp);
    /* P_POLEARMS / P_LANCE skill ids */
    return (o === _OCLASS_WEAPON || o === _OCLASS_TOOL) && (sk === 27 || sk === 26);
}

/* uhitm.c:1388 hmon_hitmon_do_hit */
async function _hmon_hitmon_do_hit(hmd, mon, obj, u, uwep) {
    if (!obj) {
        hmd.dmg = 0;
        return;
    }
    if (hmd.mdat && (hmd.mdat.pmidx | 0) === PM_SHADE) {
    }
    if ((obj.oclass | 0) === _OCLASS_WEAPON || (obj.oclass | 0) === _OCLASS_GEM) {
        _hmon_hitmon_weapon(hmd, mon, obj, u, uwep);
    } else if ((obj.oclass | 0) === 8 /* POTION_CLASS */) {
    } else {
        await _hmon_hitmon_misc_obj(hmd, mon, obj);
    }
}

/* uhitm.c:1071 hmon_hitmon_weapon — dispatch melee vs ranged */
function _hmon_hitmon_weapon(hmd, mon, obj, u, uwep) {
    if (_is_launcher_hmon(obj)
        || (!hmd.thrown && (_is_missile_hmon(obj) || _is_ammo_hmon(obj)))
        || (_is_ammo_hmon(obj) && (hmd.thrown !== HMON_THROWN
                                   || !_ammo_and_launcher_hmon(obj, uwep)))) {
        _hmon_hitmon_weapon_ranged(hmd, mon, obj);
    } else {
        hmon_hitmon_weapon_melee(hmd, mon, obj, u, uwep);
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
export function hmon_hitmon_weapon_melee(hmd, mon, obj, u, uwep) {
    hmd.use_weapon_skill = true;
    hmd.dmg = dmgval_weapon(obj, mon);
    hmd.train_weapon_skill = (hmd.dmg > 1);

    /* Healer/rogue/shatter special cases require hand_to_hand — skipped for THROWN */

    if (obj.oartifact) {
    }
    if (hmd.material === _MAT_SILVER_HMON && mon_hates_silver(mon))
        hmd.silvermsg = hmd.silverobj = true;
    /* light / jousting require !thrown or usteed — skipped */

    if (hmd.thrown === HMON_THROWN
        && (_is_ammo_hmon(obj) || _is_missile_hmon(obj))) {
        if (_ammo_and_launcher_hmon(obj, uwep)) {
            hmd.train_weapon_skill = (hmd.dmg > 0);
        }
        if (obj.opoisoned /* && is_poisonable(obj) */)
            hmd.ispoisoned = true;
    }
}

async function _hmon_hitmon_misc_obj(hmd, mon, obj) {
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
        dmgbonus += weapon_dam_bonus(skillwep);
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
/* uhitm.c:1589 hmon_hitmon_pet — tame monster reprisal (RNG only if tame) */
async function _hmon_hitmon_pet(hmd, mon) {
    if (mon.mtame && hmd.dmg > 0) {
        abuse_dog(mon);
        if (mon.mtame && !hmd.destroyed)
            await monflee(mon, 10 * rnd(hmd.dmg), false, false);
    }
}

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
    /* C uhitm.c:2012: return FALSE; */
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
function steed_vs_stealth() {
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
    const Flying = ((hFlying || eFlying) || (u.usteed && is_flyer(u.usteed.data))) && !(bFlying & I_SPECIAL);
    /* Levitation macro: (HLevitation || ELevitation) && !BLevitation */
    const Levitation = (hLevit || eLevit) && !(bLevit & I_SPECIAL);

    if (u.usteed && !Flying && !Levitation) {
        /* BStealth |= FROMOUTSIDE */
        u.uprops[STEALTH].blocked = (u.uprops[STEALTH].blocked | 0) | FROMOUTSIDE;
    } else {
        /* BStealth &= ~FROMOUTSIDE */
        u.uprops[STEALTH].blocked = ((u.uprops[STEALTH].blocked | 0) & ~FROMOUTSIDE) | 0;
    }
}

/* ---------------------------------------------------------------------------
 * resist_conflict — C ref: nethack-c/src/mondata.c:1606-1613
 * Can monster resist conflict caused by hero?
 * High-CHA heroes will be able to 'convince' monsters (through the magic of
 * the ring, of course) to fight for them much more easily than low-CHA ones.
 * RNG: one rnd(20) call.
 * ---------------------------------------------------------------------------
 */
export function resist_conflict(mtmp) {
    const u = game.u;
    /* always a small chance at 19 */
    const resist_chance = Math.min(19, (acurr(u, A_CHA) - mtmp.m_lev + u.ulevel));
    return (rnd(20) > resist_chance);
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

/* ---------------------------------------------------------------------------
 * levl_follower — C ref: nethack-c/src/mondata.c:1210-1226
 * Determines if a monster will follow you to another level. No RNG.
 * --------------------------------------------------------------------------- */
export function levl_follower(mtmp) {
    /* your steed always follows */
    if (mtmp === game.u.usteed)
        return true;
    /* Wizard with Amulet won't bother trying to follow across levels */
    if (mtmp.iswiz && mon_has_amulet(mtmp))
        return false;
    /* some monsters will follow even while intending to flee from you */
    if (mtmp.mtame || mtmp.iswiz || is_fshk(mtmp))
        return true;
    /* stalking types follow, but won't when fleeing unless you hold the Amulet */
    const M2_STALK = 0x01000000; /* follows you to other levels */
    return ((mtmp.data.mflags2 & M2_STALK)
            && (!mtmp.mflee || game.u.uhave.amulet)) ? true : false;
}
/* C shk.c:5010-5015 is_fshk(mtmp) — "for use in levl_follower":
 *     return (boolean) (mtmp->isshk && ESHK(mtmp)->following);
 * ESHK(mon) is mon->mextra->eshk (mextra.h); this port keeps it at
 * mtmp.mextra.eshk, the same spelling js/priest.js:403 and js/shk.js:1571
 * already read.  Was a throw stub, and levl_follower() reaches it for EVERY
 * non-tame monster, so the whole stalker arm below was unreachable. */
export function is_fshk(mtmp) {
    return !!(mtmp?.isshk && mtmp.mextra?.eshk?.following);
}
/* C mon.c mon_has_amulet(mon) — `m_carrying(mon, AMULET_OF_YENDOR)`. */
export function mon_has_amulet(mtmp) {
    return m_carrying(mtmp, AMULET_OF_YENDOR_MH) ? 1 : 0;
}
/* objects.h AMULET() AMULET_OF_YENDOR.  (This file's other copy is declared
 * far below at :3252 inside a different scope; one constant per scope.) */
const AMULET_OF_YENDOR_MH = 213;

/* Helper: is_animal — C mondata.h:66 is_animal(ptr) = (mflags1 & M1_ANIMAL) != 0.
 * M1_ANIMAL is monflag.h:103 == 0x00040000; uses the file-level constant
 * declared above (there must be exactly one copy per file). */
function is_animal(mdata) {
    if (!mdata) return false;
    const mflags1 = (mdata.mflags1 | 0);
    return (mflags1 & M1_ANIMAL) !== 0;
}

/* Helper: haseyes — C macro: (ptr->mflags1 & M1_NOEYES) == 0 */
function haseyes(mdata) {
    if (!mdata) return true; /* no data: assume has eyes */
    const mflags1 = (mdata.mflags1 | 0);
    const M1_NOEYES = 0x00001000;
    return (mflags1 & M1_NOEYES) === 0;
}

/* C vision.h:42 — #define m_cansee(mtmp, x2, y2)
 *                      clear_path((mtmp)->mx, (mtmp)->my, (x2), (y2))
 * The macro, verbatim.  It stood here as a `throw`, which made the whole of
 * mons_see_trap() below unreachable in practice; clear_path() is the real
 * Algorithm-C line-of-sight walk and has been in js/vision.js all along. */
function m_cansee(mtmp, x, y) {
    return clear_path(mtmp.mx | 0, mtmp.my | 0, x | 0, y | 0);
}

/* mons_see_trap — C ref: nethack-c/src/mondata.c:1640-1658 */
export function mons_see_trap(ttmp) {
    const tx = ttmp.tx | 0, ty = ttmp.ty | 0;
    const loc = game.level.at(tx, ty);
    const maxdist = loc.lit ? 7 * 7 : 2;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (is_animal(mtmp.data) || mindless(mtmp.data)
            || !haseyes(mtmp.data) || !mtmp.mcansee)
            continue;
        if (dist2(mtmp.mx, mtmp.my, tx, ty) > maxdist)
            continue;
        if (!m_cansee(mtmp, tx, ty))
            continue;
        mon_learns_traps(mtmp, ttmp.ttyp);
    }
}

const AT_ANY = -1; /* monattk.h */
function dmgtype(mon_data, ad_type) { return dmgtype_fromattack(mon_data, ad_type, AT_ANY) ? true : false; }
const AD_ANY = -1; /* monattk.h */
/* C mondata.c:53 attacktype */
export function attacktype(ptr, atyp) { return attacktype_fordmg(ptr, atyp, AD_ANY) ? true : false; }
export function passes_bars(mptr) {
    if (!mptr || mptr.pmidx === undefined)
        return false;

    /* If mptr is partial (only pmidx), reconstruct the full template */
    const ptr = (mptr.mlet !== undefined) ? mptr : permonstTemplate(mptr.pmidx | 0);
    if (!ptr)
        return false;

    const pmidx = (ptr.pmidx | 0);
    const mflags1 = (ptr.mflags1 | 0);
    const msize = (ptr.msize | 0);
    const mlet = (ptr.mlet | 0);

    /* Flags and sizes */
    const M1_WALLWALK = 0x00000008;
    const M1_AMORPHOUS = 0x00000004;
    const M1_UNSOLID = 0x00100000;
    const M1_SLITHY = 0x00080000;
    const M1_METALLIVORE = 0x80000000;
    const MZ_SMALL = 1;
    const MZ_LARGE = 3;
    const S_VORTEX = 22;
    const PM_AIR_ELEMENTAL = 154;

    /* C: passes_walls(ptr) */
    if ((mflags1 & M1_WALLWALK) !== 0)
        return true;
    /* C: amorphous(ptr) */
    if ((mflags1 & M1_AMORPHOUS) !== 0)
        return true;
    /* C: unsolid(ptr) */
    if ((mflags1 & M1_UNSOLID) !== 0)
        return true;
    /* C: is_whirly(ptr) — mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL] */
    if ((mlet | 0) === S_VORTEX || (pmidx | 0) === PM_AIR_ELEMENTAL)
        return true;
    /* C: verysmall(ptr) — msize < MZ_SMALL */
    if ((msize | 0) < MZ_SMALL)
        return true;
    /* C: dmgtype(ptr, AD_RUST) and dmgtype(ptr, AD_CORR) */
    const AD_RUST = 24;
    const AD_CORR = 42;
    if (dmgtype(ptr, AD_RUST) || dmgtype(ptr, AD_CORR))
        return true;
    /* C: metallivorous(ptr) */
    if ((mflags1 & M1_METALLIVORE) !== 0)
        return true;
    /* C: slithy(ptr) && !bigmonst(ptr) */
    if ((mflags1 & M1_SLITHY) !== 0 && (msize | 0) < MZ_LARGE)
        return true;
    return false;
}

/** C ref: nethack-c/src/mondata.c:639-650 breakarm(ptr)
 *  Creature will break out of armor.
 *  Returns true if the monster type can break/slip out of armor.
 *  Called with a permonst struct (may be partial with just pmidx).
 */
export function breakarm(ptr) {
    // Handle partial struct (just pmidx) by reconstructing full template
    const fullPtr = (ptr && ptr.mlet !== undefined) ? ptr : (ptr ? permonstTemplate(ptr.pmidx | 0) : null);

    if (!fullPtr) {
        return false;
    }

    // C: if (sliparm(ptr)) return FALSE;
    if (sliparm(fullPtr)) {
        return false;
    }

    // Local constants for size checks
    const MZ_SMALL = 1;
    const MZ_LARGE = 3;

    // C: return (boolean) (bigmonst(ptr)
    //                      || (ptr->msize > MZ_SMALL && !humanoid(ptr))
    //                      || ptr == &mons[PM_MARILITH]
    //                      || ptr == &mons[PM_WINGED_GARGOYLE]);

    // C: bigmonst(ptr) = (ptr->msize >= MZ_LARGE)
    const bigmonst = (fullPtr.msize | 0) >= MZ_LARGE;

    // C: humanoid(ptr) = (((ptr)->mflags1 & M1_HUMANOID) != 0L)
    const M1_HUMANOID = 0x00020000;
    const humanoid = ((fullPtr.mflags1 | 0) & M1_HUMANOID) !== 0;

    const pmidx = fullPtr.pmidx | 0;

    return bigmonst
        || ((fullPtr.msize | 0) > MZ_SMALL && !humanoid)
        || pmidx === PM_MARILITH
        || pmidx === PM_WINGED_GARGOYLE;
}

/* ---------------------------------------------------------------------------
 * locomotion — C ref: nethack-c/src/mondata.c:1379-1391
 * Returns the locomotion verb for a monster type.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function locomotion(ptr, def) {
    /* C: int locoindx = (*def != highc(*def)) ? 0 : 1; */
    const firstChar = def.charCodeAt(0);
    let upperChar = firstChar;
    if (0x61 <= firstChar && firstChar <= 0x7a) upperChar &= ~0x20;
    const locoindx = (firstChar !== upperChar) ? 0 : 1;

    /* locoverbs arrays (C: mondata.c:1367-1376) */
    const levitate = ["float", "Float", "wobble", "Wobble"];
    const flys = ["fly", "Fly", "flutter", "Flutter"];
    const flyl = ["fly", "Fly", "stagger", "Stagger"];
    const slither = ["slither", "Slither", "falter", "Falter"];
    const ooze = ["ooze", "Ooze", "tremble", "Tremble"];
    const immobile = ["wiggle", "Wiggle", "pulsate", "Pulsate"];
    const crawl = ["crawl", "Crawl", "falter", "Falter"];

    /* permonst fields */
    const mflags1 = ptr.mflags1 | 0;
    const msize = ptr.msize | 0;
    const mmove = ptr.mmove | 0;
    const mlet = ptr.mlet | 0;

    /* M1 flags (mondata.h) */
    const M1_FLY = 0x00000001;
    /* monflag.h:99 — M1_NOLIMBS is a TWO-BIT composite (M1_NOHANDS 0x2000
     * included); mondata.h:53 nolimbs(ptr) requires BOTH bits, not just one. */
    const M1_NOLIMBS = 0x00006000;
    const M1_SLITHY = 0x00080000;
    const M1_AMORPHOUS = 0x00000004;
    const MZ_SMALL = 1;

    /* C macros inlined */
    /* C mondata.h:20 — is_floater(ptr) == (mlet == S_EYE || mlet == S_LIGHT) */
    const is_floater = (mlet === S_EYE || mlet === S_LIGHT);
    /* C mondata.h:19 */
    const is_flyer = (mflags1 & M1_FLY) !== 0;
    const slithy = (mflags1 & M1_SLITHY) !== 0;
    const amorphous = (mflags1 & M1_AMORPHOUS) !== 0;
    /* C mondata.h:53 — ((mflags1 & M1_NOLIMBS) == M1_NOLIMBS), all bits set. */
    const nolimbs = (mflags1 & M1_NOLIMBS) === M1_NOLIMBS;

    /* C: return (is_floater(ptr) ? levitate[locoindx]
            : (is_flyer(ptr) && ptr->msize <= MZ_SMALL) ? flys[locoindx]
              : (is_flyer(ptr) && ptr->msize > MZ_SMALL) ? flyl[locoindx]
                : slithy(ptr) ? slither[locoindx]
                  : amorphous(ptr) ? ooze[locoindx]
                    : !ptr->mmove ? immobile[locoindx]
                      : nolimbs(ptr) ? crawl[locoindx]
                        : def); */
    if (is_floater) return levitate[locoindx];
    if (is_flyer && msize <= MZ_SMALL) return flys[locoindx];
    if (is_flyer && msize > MZ_SMALL) return flyl[locoindx];
    if (slithy) return slither[locoindx];
    if (amorphous) return ooze[locoindx];
    if (!mmove) return immobile[locoindx];
    if (nolimbs) return crawl[locoindx];
    return def;
}

/* ---------------------------------------------------------------------------
 * stagger — C ref: nethack-c/src/mondata.c:1394-1408
 * Returns the stagger verb for a monster type (indices 2/3 of locoverbs).
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function stagger(ptr, def) {
    /* C: int locoindx = (*def != highc(*def)) ? 2 : 3; */
    const firstChar = def.charCodeAt(0);
    let upperChar = firstChar;
    if (0x61 <= firstChar && firstChar <= 0x7a) upperChar &= ~0x20;
    const locoindx = (firstChar !== upperChar) ? 2 : 3;

    /* locoverbs arrays (C: mondata.c:1367-1376) */
    const levitate = ["float", "Float", "wobble", "Wobble"];
    const flys = ["fly", "Fly", "flutter", "Flutter"];
    const flyl = ["fly", "Fly", "stagger", "Stagger"];
    const slither = ["slither", "Slither", "falter", "Falter"];
    const ooze = ["ooze", "Ooze", "tremble", "Tremble"];
    const immobile = ["wiggle", "Wiggle", "pulsate", "Pulsate"];
    const crawl = ["crawl", "Crawl", "falter", "Falter"];

    /* permonst fields */
    const mflags1 = ptr.mflags1 | 0;
    const msize = ptr.msize | 0;
    const mmove = ptr.mmove | 0;
    const mlet = ptr.mlet | 0;

    /* M1 flags (mondata.h) */
    const M1_FLY = 0x00000001;
    /* monflag.h:99 — M1_NOLIMBS is a TWO-BIT composite (M1_NOHANDS 0x2000
     * included); mondata.h:53 nolimbs(ptr) requires BOTH bits, not just one. */
    const M1_NOLIMBS = 0x00006000;
    const M1_SLITHY = 0x00080000;
    const M1_AMORPHOUS = 0x00000004;
    const MZ_SMALL = 1;

    /* C macros inlined */
    /* C mondata.h:20 — is_floater(ptr) == (mlet == S_EYE || mlet == S_LIGHT) */
    const is_floater = (mlet === S_EYE || mlet === S_LIGHT);
    /* C mondata.h:19 */
    const is_flyer = (mflags1 & M1_FLY) !== 0;
    const slithy = (mflags1 & M1_SLITHY) !== 0;
    const amorphous = (mflags1 & M1_AMORPHOUS) !== 0;
    /* C mondata.h:53 — ((mflags1 & M1_NOLIMBS) == M1_NOLIMBS), all bits set. */
    const nolimbs = (mflags1 & M1_NOLIMBS) === M1_NOLIMBS;

    /* C: return (is_floater(ptr) ? levitate[locoindx]
            : (is_flyer(ptr) && ptr->msize <= MZ_SMALL) ? flys[locoindx]
              : (is_flyer(ptr) && ptr->msize > MZ_SMALL) ? flyl[locoindx]
                : slithy(ptr) ? slither[locoindx]
                  : amorphous(ptr) ? ooze[locoindx]
                    : !ptr->mmove ? immobile[locoindx]
                      : nolimbs(ptr) ? crawl[locoindx]
                        : def); */
    if (is_floater) return levitate[locoindx];
    if (is_flyer && msize <= MZ_SMALL) return flys[locoindx];
    if (is_flyer && msize > MZ_SMALL) return flyl[locoindx];
    if (slithy) return slither[locoindx];
    if (amorphous) return ooze[locoindx];
    if (!mmove) return immobile[locoindx];
    if (nolimbs) return crawl[locoindx];
    return def;
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

/** C ref: nethack-c/src/do_name.c:428-463 objtyp_is_callable(int i)
 *  boolean objtyp_is_callable(int i)
/** C ref: nethack-c/src/do_name.c:428-463 objtyp_is_callable(int i)
 *  boolean objtyp_is_callable(int i)
 *  Determine if an object type can be called (given a user-defined name).
 *  Returns TRUE if the object class supports descriptions (except special amulets).
 *  No RNG, no state changes.
 *  Args: i (int) — object type index
 *  Return: boolean (1 for true, 0 for false)
 */
export function objtyp_is_callable(i) {
    const ityp = i | 0;
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
        /* All objects in these classes have descriptions and can be called */
        return 1; /* TRUE */
    default:
        break;
    }
    return 0; /* FALSE */
}

/* C ref: nethack-c/src/mondata.c:214-244 resists_magm(struct monst *mon)
 * Check if a monster has magic resistance.
 * Returns boolean: TRUE if magic resistance granted by dmgtype, special form,
 * wielded weapon, worn armor, or carried items.
 * No RNG calls (rng_calls_count: 0).
 * Args: mon (struct monst *)
 * Return: boolean (JS: true/false; C: TRUE/FALSE)
 */
export function resists_magm(mon) {
    const AD_MAGM = 1;
    const AD_RBRE = 242;  /* random breath weapon */
    const WEAPON_CLASS = 2;

    if (!mon) return false;

    const ptr = mon.data;
    /* C: `mon == &gy.youmonst` (mondata.c resists_magm/Resists_Elem).  Pointer
     * equality alone misses the replay-reconstructed hero; see xm_same_monst(). */
    const is_you = is_youmonst(mon);

    if (dmgtype(ptr, AD_MAGM)
        || (ptr && (ptr.pmidx | 0) === PM_BABY_GRAY_DRAGON)
        || dmgtype(ptr, AD_RBRE)) {
        return true;
    }

    /* check for magic resistance granted by wielded weapon */
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && (o.oartifact | 0) && defends(AD_MAGM, o)) {
        return true;
    }

    /* check for magic resistance granted by worn or carried items */
    o = is_you ? (game.invent ?? null) : (mon.minvent ?? null);

    let slotmask = W_ARMOR | W_ACCESSORY;

    if (!is_you || (game?.u?.uwep && ((game.u.uwep.oclass | 0) === WEAPON_CLASS || is_weptool(game.u.uwep)))) {
        slotmask |= W_WEP;
    }

    if (is_you && (game?.u?.twoweap | 0)) {
        slotmask |= W_SWAPWEP;
    }

    for (; o; o = o.nobj) {
        if (((o.owornmask | 0) & slotmask) !== 0
             && (MKOBJ_OC_OPROP[o.otyp | 0] | 0) === ANTIMAGIC) {
            return true;
        }
        if ((o.oartifact | 0) && defends_when_carried(AD_MAGM, o)) {
            return true;
        }
    }

    return false;
}

export function Resists_Elem(mon, propindx) {
    const ALCHEMY_SMOCK = 144; /* objclass.h enum value (matches objnam.js) */
    const WEAPON_CLASS = 2;

    if (!mon) return false;
    /* C: `mon == &gy.youmonst` (mondata.c resists_magm/Resists_Elem).  Pointer
     * equality alone misses the replay-reconstructed hero; see xm_same_monst(). */
    const is_you = is_youmonst(mon);
    let u_resist = 0, damgtype = 0, rsstmask = 0;

    switch (propindx) {
    case FIRE_RES:   /* 1 */
    case COLD_RES:   /* 2 */
    case SLEEP_RES:  /* 3 */
    case DISINT_RES: /* 4 */
    case SHOCK_RES:  /* 5 */
    case POISON_RES: /* 6 */
    case ACID_RES:   /* 7 */
    case STONE_RES:  /* 8 */
        damgtype = propindx + 1;        /* damgtype 2..9 */
        rsstmask = 1 << (propindx - 1); /* 1,2,4,...,128 */
        u_resist = (game?.u?.uprops?.[propindx]?.intrinsic
                    || game?.u?.uprops?.[propindx]?.extrinsic) ? 1 : 0;
        break;
    /* accept these, but callers are expected to use their routines directly */
    case ANTIMAGIC:
        return resists_magm(mon);
    case DRAIN_RES:
        return resists_drli(mon);
    case BLND_RES:
        return resists_blnd(mon);
    default:
        /* C calls impossible() here (a warning) then returns FALSE */
        return false;
    }

    const ptr = mon.data;
    const rbits = ((ptr ? (ptr.mresists | 0) : 0)
                   | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    if (is_you ? u_resist : ((rbits & rsstmask) !== 0))
        return true;

    /* resistance granted by wielded artifact weapon */
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && (o.oartifact | 0) && defends(damgtype, o))
        return true;

    /* resistance granted by worn or carried items */
    o = is_you ? (game.invent ?? null) : (mon.minvent ?? null);
    let slotmask = W_ARMOR | W_ACCESSORY;
    if (!is_you
        || (game?.u?.uwep && ((game.u.uwep.oclass | 0) === WEAPON_CLASS || is_weptool(game.u.uwep))))
        slotmask |= W_WEP;
    if (is_you && (game?.u?.twoweap | 0))
        slotmask |= W_SWAPWEP;

    for (; o; o = o.nobj)
        if ((((o.owornmask | 0) & slotmask) !== 0
             && (MKOBJ_OC_OPROP[o.otyp | 0] | 0) === propindx)
            || (((o.owornmask | 0) & W_ARMC) === W_ARMC
                && (o.otyp | 0) === ALCHEMY_SMOCK
                && (propindx === POISON_RES || propindx === ACID_RES))
            || ((o.oartifact | 0) && defends_when_carried(damgtype, o)))
            return true;
    return false;
}

/* C mondata.c:200-211 resists_drli(mon). */
export function resists_drli(mon) {
    const ptr = mon?.data || mon;
    const M2_UNDEAD = 0x00000002, M2_DEMON = 0x00000100, M2_WERE = 0x00000040;
    const pmidx = (ptr?.pmidx ?? mon?.mndx ?? mon?.mnum ?? -1) | 0;
    if ((ptr?.mflags2 | 0) & (M2_UNDEAD | M2_DEMON | M2_WERE)) return true;
    if (pmidx === 311 || (mon === game.youmonst && ((game.u?.ulycn ?? -1) | 0) >= 0)
        || mon?.cham === PM_VAMPIRE || mon?.cham === PM_VAMPIRE_LORD
        || mon?.cham === PM_VLAD_THE_IMPALER)
        return true;
    return defended(mon, AD_DRLI);
}

export function resists_blnd(mon) {
    const ptr = mon ? mon.data : null;
    const is_you = is_youmonst(mon);

    if (is_you ? (xm_Blind() || Unaware())
               : ((mon.mblinded | 0) || !(mon.mcansee | 0) || !haseyes(ptr)
                  /* C's own BUG note: temporary sleep sets mfrozen, but so does
                     paralysis, so mfrozen cannot be checked here. */
                  || (mon.msleeping | 0)))
        return true;
    /* yellow light, Archon; !dust vortex, !cobra, !raven */
    const mndx = (ptr && ptr.pmidx !== undefined) ? (ptr.pmidx | 0) : -1;
    if (mndx >= 0
        && (dmgtype_fromattack(ptr, AD_BLND, AT_EXPL)
            || dmgtype_fromattack(ptr, AD_BLND, AT_GAZE)))
        return true;
    /* Sunsword */
    if (resists_blnd_by_arti(mon))
        return true;
    /* catchall */
    if (is_you && _Blnd_resist()) {
        impossible("'Blnd_resist' but not resists_blnd()?");
        return true;
    }
    return false;
}
/* C youprop.h Blnd_resist == (HBlnd_resist || EBlnd_resist).  Nothing in js/
 * writes uprops[BLND_RES] today, so this is an honest false; it is spelled out
 * rather than hard-coded because the C arm it guards is a can't-happen check
 * whose whole point is that it fires if a writer ever appears. */
function _Blnd_resist() {
    const pr = game?.u?.uprops?.[BLND_RES];
    return !!(pr && ((pr.intrinsic | 0) || (pr.extrinsic | 0)));
}
/* C ref: mondata.c:278 resists_blnd_by_arti(mon). */
function resists_blnd_by_arti(mon) {
    const is_you = ((mon && mon.m_id) | 0) === 0;
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && defends(AD_BLND, o))
        return true;
    o = is_you ? (game.invent ?? null) : (mon.minvent ?? null);
    for (; o; o = o.nobj)
        if (defends_when_carried(AD_BLND, o))
            return true;
    return false;
}
/* monattk.h:53 AD_BLND. */
const AD_BLND = 11;

function MON_WEP(mon) {
    if (!mon) return null;
    return mon.mw ?? null;
}

/* C ref: artifact.c defends(adtyp, otmp) / defends_when_carried(adtyp, otmp).
 * Both are one line over get_artifact(otmp), which is
 *   ((obj && obj->oartifact) ? &artilist[(int) obj->oartifact] : 0)
 * so a non-artifact answers FALSE without consulting any table.  The two adtyp
 * columns come from js/attrib.js, which parsed them out of
 * nethack-c-v5/upstream/include/artilist.h's A() X-macro and validated the
 * parse against the compiled spfx column — see the provenance note there.
 *
 * These were throw-stubs; resists_prop() below calls BOTH of them, guarded only
 * by obj->oartifact, so a hero wielding or carrying ANY artifact and asked for
 * a resistance halted the run.  No RNG on either side. */
function defends(adtyp, obj) {
    const a = obj ? (obj.oartifact | 0) : 0;
    if (a)
        return arti_defn_adtyp(a) === (adtyp | 0);
    let otyp = obj ? (obj.otyp | 0) : 0;
    if (otyp >= 101 && otyp <= 110)
        otyp += 10;
    else if (otyp < 111 || otyp > 120)
        return false;
    switch (adtyp | 0) {
    case 1:  return otyp === 111;
    case 36: return otyp === 112;
    case 2:  return otyp === 114;
    case 3:  return otyp === 115;
    case 7:
    case 33: return otyp === 119;
    case 4:
    case 14: return otyp === 116;
    case 5:
    case 15: return otyp === 117;
    case 6:
    case 13: return otyp === 118;
    case 8:
    case 18: return otyp === 120;
    default: return false;
    }
}

function defends_when_carried(adtyp, obj) {
    const a = obj ? (obj.oartifact | 0) : 0;
    return !!a && arti_cary_adtyp(a) === (adtyp | 0);
}

/* C mondata.c:91-125 defended(mon, adtyp): wielded defensive artifact,
 * worn dragon armor, or an adult dragon's own scales. */
export function defended(mon, adtyp) {
    if (!mon)
        return false;
    const is_you = is_youmonst(mon);
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && (o.oartifact | 0) && defends(adtyp, o))
        return true;

    const mndx = (mon.data?.pmidx ?? mon.mnum ?? mon.mndx ?? -1) | 0;
    if (mndx >= 143 && mndx <= 152)
        o = { oclass: ARMOR_CLASS, otyp: 111 + (mndx - 143) };
    else
        o = is_you ? (game?.u?.uarm ?? null)
                   : which_armor(mon, 0x00000001 /* W_ARM */);
    return !!(o && (o.otyp | 0) >= 101 && (o.otyp | 0) <= 120
              && defends(adtyp, o));
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
    const apType = (mon.m_ap_type | 0) & 0x7;
    if ((how | 0) >= 0 && !mon.msleeping && !(mon.mfrozen | 0)
        && (mon.data?.mlet | 0) === 13 /* S_MIMIC */
        && (apType === 1 /* M_AP_FURNITURE */ || apType === 2 /* M_AP_OBJECT */))
        seemimic(mon);

    if (Resists_Elem(mon, SLEEP_RES) || defended(mon, 4 /* AD_SLEE */)
        || ((how | 0) >= 0 && await resist(mon, how | 0, 0, 0 /* NOTELL */))) {
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
        /* C pline_mon() attributes the message to the monster's coordinates;
         * this terminal has no equivalent message-coordinate channel. */
        await pline(`${s_suffix(Monnam_mm(mon))} grip relaxes.`);
        await unstuck(mon);
    }
}

/* C priest.c:796 — the shrine's retaliation when its priest is attacked. */
export async function ghod_hitsu(priest) {
    const u = game.u;
    const roomno = temple_occupied(u?.urooms || '');
    if (!roomno || !has_shrine(priest)) return;
    const shrine = priest?.mextra?.epri?.shrpos;
    const troom = game.level?.rooms?.[(roomno | 0) - ROOMOFFSET];
    if (!shrine || !troom) return;
    const ax = shrine.x | 0, ay = shrine.y | 0;
    let x = ax, y = ay;
    if ((x === (u.ux | 0) && y === (u.uy | 0))
        || !linedup(u.ux | 0, u.uy | 0, x, y, 1)) {
        const here = game.level?.at?.(u.ux | 0, u.uy | 0);
        if (here && IS_DOOR(here.typ | 0)) {
            if ((u.ux | 0) === ((troom.lx | 0) - 1)) { x = troom.hx; y = u.uy; }
            else if ((u.ux | 0) === ((troom.hx | 0) + 1)) { x = troom.lx; y = u.uy; }
            else if ((u.uy | 0) === ((troom.ly | 0) - 1)) { x = u.ux; y = troom.hy; }
            else if ((u.uy | 0) === ((troom.hy | 0) + 1)) { x = u.ux; y = troom.ly; }
        } else {
            switch (rn2(4)) {
            case 0: x = u.ux; y = troom.ly; break;
            case 1: x = u.ux; y = troom.hy; break;
            case 2: x = troom.lx; y = u.uy; break;
            default: x = troom.hx; y = u.uy; break;
            }
        }
        if (!linedup(u.ux | 0, u.uy | 0, x, y, 1)) return;
    }
    const god = a_gname_at(ax, ay);
    switch (rn2(3)) {
    case 0: await pline(`${god} roars in anger:  "Thou shalt suffer!"`); break;
    case 1: await pline(`${s_suffix(god)} voice booms:  "How darest thou harm my servant!"`); break;
    default: await pline(`${god} roars:  "Thou dost profane my shrine!"`); break;
    }
    const oldWand = game.gc_current_wand;
    const oldBuzzer = game.gb?.buzzer;
    game.gc_current_wand = 0;
    if (game.gb) game.gb.buzzer = 0;
    await buzz(17, 6, x, y, Math.sign(game.gt?.tbx || 0), Math.sign(game.gt?.tby || 0));
    if (game.gb) game.gb.buzzer = oldBuzzer;
    game.gc_current_wand = oldWand;
    exercise(A_WIS, false);
}

/* ---------------------------------------------------------------------------
 * can_blnd — C ref: nethack-c/src/mondata.c:304-399
 * Returns TRUE if mdef can be blinded by the given attack.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function can_blnd(magr, mdef, aatyp, obj) {
    const is_you = is_youmonst(mdef);
    let check_visor = false;
    let o;

    /* no eyes protect against all attacks for now */
    if (!haseyes(mdef.data))
        return false;

    /* if monster has been permanently blinded, the deed is already done */
    if (!is_you && mon_perma_blind(mdef))
        return false;

    /* ravens don't blind each other */
    if (magr && magr.data.pmidx === PM_RAVEN && mdef.data.pmidx === PM_RAVEN)
        return false;

    switch (aatyp) {
    case AT_EXPL: /* 13 */
    case AT_BOOM: /* 14 */
    case AT_GAZE: /* 15 */
    case AT_MAGC: /* 255 */
    case AT_BREA: /* 12 — assumed to be lightning */
        /* light-based attacks may be cancelled or resisted */
        if (magr && magr.mcan)
            return false;
        return !resists_blnd(mdef);

    case AT_WEAP: /* 254 */
    case AT_SPIT: /* 10 */
    case AT_NONE: /* 0 */
        if (obj && obj.otyp === CREAM_PIE) {
            if (is_you && Blindfolded())
                return false;
        } else if (obj && obj.otyp === BLINDING_VENOM) {
            if (is_you && (ublindf_p() || game.u.ucreamed))
                return false;
            check_visor = true;
        } else if (obj && obj.otyp === POT_BLINDNESS) {
            return true; /* no defense */
        } else
            return false; /* other objects cannot cause blindness yet */
        if ((magr !== null && is_youmonst(magr)) && game.u.uswallow)
            return false;
        break;

    case AT_ENGL: /* 11 */
        if (is_you && (Blindfolded() || Unaware() || game.u.ucreamed))
            return false;
        if (!is_you && mdef.msleeping)
            return false;
        break;

    case AT_CLAW: /* 1 */
        if (is_you && ublindf_p())
            return false;
        if ((magr !== null && is_youmonst(magr)) && game.u.uswallow)
            return false;
        check_visor = true;
        break;

    case AT_TUCH: /* 5 */
    case AT_STNG: /* 6 */
        if (magr && magr.mcan)
            return false;
        break;

    default:
        break;
    }

    /* check if wearing a visor (only checked if visor might help) */
    if (check_visor) {
        o = is_youmonst(mdef) ? game.invent : mdef.minvent;
        for (; o; o = o.nobj)
            if (((o.owornmask | 0) & W_ARMH)
                && objdescr_is(o, "visored helmet"))
                return false;
    }

    return true;
}

/* Helper stubs and local constants for can_blnd */
const PM_RAVEN = 128;
const CREAM_PIE = 287;
/* objects.h VENOM() BLINDING_VENOM — js/cmd.js:32321. */
const BLINDING_VENOM_HM = 479;
/* hack.h:133 FACE = 2.  (The AT_SPIT that used to be declared here said 7,
 * which is 5.0's AT_HUGS; the one live constant is the shared AT_SPIT above.) */
const FACE_HM = 2;
/* pm.generated.js PM_FLOATING_EYE. */
const PM_FLOATING_EYE_HM = PM_FLOATING_EYE;
const BLINDING_VENOM = 479; /* objects.h VENOM() BLINDING_VENOM; was 250 = FROST_HORN */
const POT_BLINDNESS = 300; /* objects.h POTION() BLINDNESS; was 246 = MAGIC_WHISTLE */
/* objects.h LENSES otyp is 232 (the TOOL_CLASS run; js/u_init.js:962 and
 * js/objnam.js agree).  This said 373, a spellbook slot, which made
 * Blindfolded() below report TRUE for a hero wearing lenses — C's
 * youprop.h Blindfolded is `(ublindf && ublindf->otyp != LENSES)`. */
const LENSES = 232;

function Blindfolded() {
    const u = game.u;
    return !!(u && u.ublindf && u.ublindf.otyp !== LENSES);
}

function ublindf_p() {
    const u = game.u;
    return !!(u && u.ublindf);
}

function Unaware() {
    const u = game.u;
    /* C youprop.h:399: gm.multi < 0 && (unconscious() || is_fainted()). */
    if (!u || (game.multi | 0) >= 0)
        return false;
    const nmm = game.nomovemsg;
    const unconscious = !!(u.usleep || (nmm && (nmm.startsWith('You awake')
        || nmm.startsWith('You regain con') || nmm.startsWith('You are consci'))));
    return unconscious || ((u.uhs | 0) === FAINTED);
}

function mon_perma_blind(mdef) {
    return !!(mdef && mdef.mblinded);
}

function objdescr_is(obj, desc) {
    return !!obj && getObjDescr(obj.otyp | 0) === desc;
}

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

// ── Helpers for name_to_monplus ─────────────────────────────────────────────
function lowc(c) {
    const cc = typeof c === 'string' ? c.charCodeAt(0) : c;
    return (cc >= 65 && cc <= 90) ? cc + 32 : cc;
}

function strcmpi(s1, s2) {
    const n = Math.max(s1.length, s2.length);
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

function strncmp(a, b, n) {
    if (!a || !b) return a === b ? 0 : (a ? 1 : -1);
    for (let i = 0; i < n; i++) {
        if (i >= a.length && i >= b.length) return 0;
        if (i >= a.length) return -1;
        if (i >= b.length) return 1;
        if (a.charCodeAt(i) !== b.charCodeAt(i))
            return a.charCodeAt(i) - b.charCodeAt(i);
    }
    return 0;
}

function strncmpi(s1, s2, n) {
    for (let i = 0; i < n; i++) {
        if (i >= s1.length && i >= s2.length) return 0;
        if (i >= s1.length) return -1;
        if (i >= s2.length) return 1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

function strstri(haystack, needle) {
    const nlen = needle.length;
    if (nlen === 0) return -1;
    for (let i = 0; i <= haystack.length - nlen; i++) {
        if (strncmpi(haystack.substring(i), needle, nlen) === 0)
            return i;
    }
    return -1;
}

// ── PM constants needed by alt_spl table ────────────────────────────────────
// Every value below is the mons[] index of the named monster, i.e. exactly what
// mondata.c:946 `static const struct alt_spl names[]` returns from
// name_to_monplus(). The names here already matched C one-for-one; 31 of the 37
// VALUES did not — they were resolved against a stale index space, so e.g.
// "grey dragon" answered PM_GIANT_SPIDER (96) and "watchmen" answered PM_YETI
// (236). Nothing downstream can depend on the old values: namep[1] is returned
// straight to the caller as "the monster this spelling names", so a wrong index
// is a wrong monster, never a compensating one.
// row-for-row against js/makemon_pmnames.json); re-check with
const PM_GRAY_DRAGON = 143;              /* was 96  = giant spider */
// PM_BABY_GRAY_DRAGON already imported from pm.generated.js
const PM_GRAY_UNICORN = 102;
const PM_GRAY_OOZE = 206;                /* was 210 = quantum mechanic */
const PM_GREY_ELF = 267;                 /* was 68  = water nymph */
const PM_MIND_FLAYER = 48;
const PM_MASTER_MIND_FLAYER = 49;
// PM_ALIGNED_CLERIC, PM_HIGH_CLERIC already defined in this module
const PM_MASTER_OF_THIEVES = 352;        /* was 199 = red naga */
const PM_MASTER_ASSASSIN = 365;          /* was 200 = black naga */
const PM_MASTER_LICH = 185;              /* was 226 = vampire */
const PM_STALKER = 153;                  /* was 134 = baby gold dragon */
const PM_ELVEN_MONARCH = 269;            /* was 70  = goblin */
const PM_WOODLAND_ELF = 265;             /* was 66  = giant mimic */
const PM_WOOD_NYMPH = 67;                /* was 56  = blue jelly */
const PM_HOBBIT = 43;                    /* was 5   = queen bee */
const PM_DJINNI = 315;                   /* was 142 = baby yellow dragon */
const PM_HUMAN_WERERAT = 261;            /* was 88  = sewer rat */
const PM_HUMAN_WEREJACKAL = 262;         /* was 89  = giant rat */
const PM_HUMAN_WEREWOLF = 263;           /* was 90  = rabid rat */
const PM_WERERAT = 91;
const PM_WEREJACKAL = 15;                /* was 92  = rock mole */
const PM_WEREWOLF = 21;                  /* was 93  = woodchuck */
const PM_KI_RIN = 124;
const PM_URUK_HAI = 75;                  /* was 74  = Mordor orc */
const PM_ORC_CAPTAIN = 77;               /* was 73  = hill orc */
const PM_GREEN_ELF = 266;                /* was 65  = large mimic */
const PM_ELF_NOBLE = 268;                /* was 69  = mountain nymph */
const PM_OLOG_HAI = 224;                 /* was 76  = orc shaman */
const PM_ARCH_LICH = 186;                /* was 228 = Vlad the Impaler */
const PM_AMOROUS_DEMON = 290;
const PM_VIOLET_FUNGUS = 164;            /* was 212 = rust monster */
const PM_HOMUNCULUS = 51;                /* was 295 = vrock */
const PM_BALUCHITHERIUM = 86;            /* was 324 = iguana */
const PM_LURKER_ABOVE = 98;              /* was 158 = lichen */
const PM_CAVE_DWELLER = 333;             /* was 178 = jabberwock */
const PM_WATCHMAN = 282;                 /* was 236 = yeti */
const PM_MUMAK = 82;                     /* was 329 = salamander */
const PM_ERINYS = 292;                   /* was 308 = Baalzebub */
const NON_PM = -1;
const LOW_PM = 0;
const NUM_MGENDERS = 3;
const BUFSZ = 256;

export function title_to_mon(str, rank_indx, title_length) {
    /* Loop through each of the roles */
    for (let i = 0; i < ROLE_RANKS.length; i++) {
        /* loop through each of the rank titles for role #i */
        for (let j = 0; j < 9; j++) {
            const rm = ROLE_RANKS[i].rank[j][0];
            const rf = ROLE_RANKS[i].rank[j][1];
            if (rm && str_start_is(str, rm, true)) {
                if (rank_indx) rank_indx.value = j;
                if (title_length) title_length.value = rm.length;
                return ROLE_PM_MNUM[i];
            }
            if (rf && str_start_is(str, rf, true)) {
                if (rank_indx) rank_indx.value = j;
                if (title_length) title_length.value = rf.length;
                return ROLE_PM_MNUM[i];
            }
        }
    }
    if (title_length) title_length.value = 0;
    return NON_PM;
}

export function name_to_monplus(in_str, remainder_p, gender_name_var) {
    let mntmp = NON_PM;
    let matchgend = -1;
    let exact_match = false;
    let len = 0;

    if (remainder_p !== null && remainder_p !== undefined)
        remainder_p.value = null;

    // Copy in_str and track offset from original
    let stripoff = 0;
    let str = in_str;

    if (strncmp(str, "a ", 2) === 0) {
        str = str.substring(2);
        stripoff += 2;
    } else if (strncmp(str, "an ", 3) === 0) {
        str = str.substring(3);
        stripoff += 3;
    } else if (strncmp(str, "the ", 4) === 0) {
        str = str.substring(4);
        stripoff += 4;
    }

    let slen = str.length;

    // Handle "vortices"
    let vortIdx = strstri(str, "vortices");
    if (vortIdx !== -1) {
        str = str.substring(0, vortIdx + 4) + "ex" + str.substring(vortIdx + 4 + 4);
        // vortices = 8 chars, vort = 4 chars, "ex" replaces "ices" (4 chars)
    } else if (slen > 3 && strcmpi(str.substring(slen - 3), "ies") === 0
               && (slen < 7 || strcmpi(str.substring(slen - 7), "zombies") !== 0)) {
        str = str.substring(0, slen - 3) + "y";
    } else if (slen > 3 && strcmpi(str.substring(slen - 3), "ves") === 0) {
        str = str.substring(0, slen - 3) + "f";
    }

    slen = str.length;

    // alt_spl table
    const names = [
        ["grey dragon", PM_GRAY_DRAGON, NEUTRAL],
        ["baby grey dragon", PM_BABY_GRAY_DRAGON, NEUTRAL],
        ["grey unicorn", PM_GRAY_UNICORN, NEUTRAL],
        ["grey ooze", PM_GRAY_OOZE, NEUTRAL],
        ["gray-elf", PM_GREY_ELF, NEUTRAL],
        ["mindflayer", PM_MIND_FLAYER, NEUTRAL],
        ["master mindflayer", PM_MASTER_MIND_FLAYER, NEUTRAL],
        ["aligned priest", PM_ALIGNED_CLERIC, MALE],
        ["aligned priestess", PM_ALIGNED_CLERIC, FEMALE],
        ["high priest", PM_HIGH_CLERIC, MALE],
        ["high priestess", PM_HIGH_CLERIC, FEMALE],
        ["master of thief", PM_MASTER_OF_THIEVES, NEUTRAL],
        ["master thief", PM_MASTER_OF_THIEVES, NEUTRAL],
        ["master of assassin", PM_MASTER_ASSASSIN, NEUTRAL],
        ["master-lich", PM_MASTER_LICH, NEUTRAL],
        ["masterlich", PM_MASTER_LICH, NEUTRAL],
        ["invisible stalker", PM_STALKER, NEUTRAL],
        ["high-elf", PM_ELVEN_MONARCH, NEUTRAL],
        ["wood-elf", PM_WOODLAND_ELF, NEUTRAL],
        ["wood elf", PM_WOODLAND_ELF, NEUTRAL],
        ["woodland nymph", PM_WOOD_NYMPH, NEUTRAL],
        ["halfling", PM_HOBBIT, NEUTRAL],
        ["genie", PM_DJINNI, NEUTRAL],
        ["human wererat", PM_HUMAN_WERERAT, NEUTRAL],
        ["human werejackal", PM_HUMAN_WEREJACKAL, NEUTRAL],
        ["human werewolf", PM_HUMAN_WEREWOLF, NEUTRAL],
        ["rat wererat", PM_WERERAT, NEUTRAL],
        ["jackal werejackal", PM_WEREJACKAL, NEUTRAL],
        ["wolf werewolf", PM_WEREWOLF, NEUTRAL],
        ["ki rin", PM_KI_RIN, NEUTRAL],
        ["kirin", PM_KI_RIN, NEUTRAL],
        ["uruk hai", PM_URUK_HAI, NEUTRAL],
        ["orc captain", PM_ORC_CAPTAIN, NEUTRAL],
        ["woodland elf", PM_WOODLAND_ELF, NEUTRAL],
        ["green elf", PM_GREEN_ELF, NEUTRAL],
        ["grey elf", PM_GREY_ELF, NEUTRAL],
        ["gray elf", PM_GREY_ELF, NEUTRAL],
        ["elf lady", PM_ELF_NOBLE, FEMALE],
        ["elf lord", PM_ELF_NOBLE, MALE],
        ["elf noble", PM_ELF_NOBLE, NEUTRAL],
        ["olog hai", PM_OLOG_HAI, NEUTRAL],
        ["arch lich", PM_ARCH_LICH, NEUTRAL],
        ["archlich", PM_ARCH_LICH, NEUTRAL],
        ["incubi", PM_AMOROUS_DEMON, MALE],
        ["succubi", PM_AMOROUS_DEMON, FEMALE],
        ["violet fungi", PM_VIOLET_FUNGUS, NEUTRAL],
        ["homunculi", PM_HOMUNCULUS, NEUTRAL],
        ["baluchitheria", PM_BALUCHITHERIUM, NEUTRAL],
        ["lurkers above", PM_LURKER_ABOVE, NEUTRAL],
        ["cavemen", PM_CAVE_DWELLER, MALE],
        ["cavewomen", PM_CAVE_DWELLER, FEMALE],
        ["watchmen", PM_WATCHMAN, NEUTRAL],
        ["djinn", PM_DJINNI, NEUTRAL],
        ["mumakil", PM_MUMAK, NEUTRAL],
        ["erinyes", PM_ERINYS, NEUTRAL],
        [null, NON_PM, NEUTRAL]
    ];

    for (const namep of names) {
        if (!namep[0]) break;
        const nlen = namep[0].length;
        if (strncmpi(str, namep[0], nlen) === 0
            && (nlen >= str.length || str[nlen] === ' ' || str[nlen] === "'")) {
            if (remainder_p !== null && remainder_p !== undefined)
                remainder_p.value = in_str.substring(stripoff + nlen);
            if (gender_name_var !== null && gender_name_var !== undefined)
                gender_name_var.value = namep[2];
            return namep[1];
        }
    }

    // Main loop through mons
    const NUMMONS = MONS_CT.length;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        for (let mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
            let mname;
            try {
                mname = monPmname(i, mgend);
            } catch (e) {
                continue;
            }
            if (!mname) continue;
            // If this is MALE or FEMALE and the name is identical to the
            // NEUTRAL name, skip — it's a fallback (C's pmnames[mgend] would
            // be NULL for this gender).
            if (mgend !== NEUTRAL) {
                let nname;
                try { nname = monPmname(i, NEUTRAL); } catch (e) { nname = null; }
                if (nname && nname === mname) continue;
            }

            const m_i_len = mname.length;
            if (m_i_len > len
                && strncmpi(mname, str, m_i_len) === 0) {
                if (m_i_len === slen) {
                    mntmp = i;
                    len = m_i_len;
                    matchgend = mgend;
                    exact_match = true;
                    break;
                } else if (slen > m_i_len
                           && (str[m_i_len] === ' '
                               || strcmpi(str.substring(m_i_len), "s") === 0
                               || strncmpi(str.substring(m_i_len), "s ", 2) === 0
                               || strcmpi(str.substring(m_i_len), "'") === 0
                               || strncmpi(str.substring(m_i_len), "' ", 2) === 0
                               || strcmpi(str.substring(m_i_len), "'s") === 0
                               || strncmpi(str.substring(m_i_len), "'s ", 3) === 0
                               || strcmpi(str.substring(m_i_len), "es") === 0
                               || strncmpi(str.substring(m_i_len), "es ", 3) === 0)) {
                    mntmp = i;
                    len = m_i_len;
                    matchgend = mgend;
                }
            }
        }
        if (exact_match)
            break;
    }

    if (mntmp === NON_PM) {
        const lenRef = { value: 0 };
        mntmp = title_to_mon(str, null, lenRef);
        len = lenRef.value;
    }

    if (len && remainder_p !== null && remainder_p !== undefined)
        remainder_p.value = in_str.substring(stripoff + len);
    if (gender_name_var !== null && gender_name_var !== undefined && matchgend !== -1) {
        if (gender_name_var.value === -1 || matchgend !== NEUTRAL)
            gender_name_var.value = matchgend;
    }
    return mntmp;
}

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
import { adjalign as _adjalign_attrib } from './attrib.js';
import { ENV } from './hostenv.js';
export function You(line, ...args) {
    pline('You ' + (args.length ? String(line).replace(/%s/g, () => String(args.shift())) : String(line)));
}
export function adjalign(n) { return _adjalign_attrib(n); }
