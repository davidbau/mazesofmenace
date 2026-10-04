import { xdir, ydir } from './const.js';
import { unmap_invisible } from './display.js';
import { lifesaved_monster, wipe_engr_at } from './mklev.js';
// @ts-nocheck
import { game, wizard, discover } from './gstate.js';
import { rehumanize } from './polyself.js';
import { helm_simple_name, cloak_simple_name } from './objnam.js';
import { xname, cxname as cxname_sh, Tobjnam as Tobjnam_sh, makeplural, simpleonames, obj_is_pname, bare_artifactname, otense, distant_name, vtense,
         Yobjnam2 as Yobjnam2_real,
         makesingular as makesingular_real } from './objnam.js';
import { rn2, rnd, d, rn1, pushRngLogEntry } from './rng.js';
import { m_move } from './monmove.js';
import { pline, canspotmon, newsym, sensemon,
/* canseemon is the real _canseemon macro from js/display.js (display.h:117-120).
 * A file-local stub returning false for every monster used to shadow it here;
 * only three sites were migrated to a `canseemon_real` alias, leaving thirteen
 * call sites silently resolving to the stub.  The stub is now retired and every
 * site uses the real body. */
         canseemon, livelog_printf, unmap_object, glyph_is_invisible_at,
         map_invisible, You_hear, glyph_is_warning_at, Unaware, shieldeff } from './display.js';
import { gethungry, eat_brains } from './eat.js';
/* C attrib.c:316-408 poisoned() — canonical implementation lives in the
 * hero-defender path in mhitu.js and is safe to call synchronously here. */
import { poisoned_u as poisoned_real } from './mhitu.js';
/* Fire's inventory ignition is shared with the monster-defender path. */
import { ignite_items as ignite_items_real } from './mhitu.js';
import { exercise, acurr, adjalign, change_luck as change_luck_uh, get_artifact, ART_NONARTIFACT } from './attrib.js';
import { P_SKILL } from './skills.js';
import { near_capacity } from './weight.js';
import { ARMOR_DATA } from './armor_data.js';
import { Upolyd, STR18, P_BARE_HANDED_COMBAT, P_NONE, P_NUM_SKILLS, P_SKILL_LIMIT, P_ISRESTRICTED,
P_BASIC, P_SKILLED, P_EXPERT, P_UNSKILLED, P_RIDING,
P_BOW, P_SLING, P_CROSSBOW, P_FLAIL, P_PICK_AXE, W_SADDLE, LEFT_SIDE, RIGHT_SIDE, LEG, M_AP_TYPE, M_AP_MONSTER, M_ATTK_AGR_DIED, M_ATTK_MISS, W_ARMG, W_ARM, W_ARMC, W_ARMU, W_ARMH, W_ARMS, W_ARMF, W_AMUL, W_RINGL, W_RINGR, engulfing_u, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP, M_SEEN_ELEC, STRAT_WAITFORU, FIRE_RES, COLD_RES, SLEEP_RES, FREE_ACTION, SHOCK_RES, POISON_RES, DRAIN_RES, STONE_RES, SEE_INVIS, DETECT_MONSTERS, ERODE_RUST, BLINDED, TIMEOUT,
/* mon_nam's x_monnam call — C ref: nethack-c/src/do_name.c:1041-1046 */
ARTICLE_THE, ARTICLE_NONE, SUPPRESS_SADDLE, SUPPRESS_IT, SUPPRESS_INVISIBLE,
SUPPRESS_HALLUCINATION, SUPPRESS_NAME,
/* prop.h HALLUC/HALLUC_RES — the live keys for the Hallucination macro. */
HALLUC, HALLUC_RES, CONFUSION, STUNNED, P_LAST_WEAPON, P_LAST_SPELL, P_TWO_WEAPON_COMBAT,
TIP_ENHANCE, SHOPBASE, ROOMOFFSET, IS_OBSTRUCTED, HVY_ENCUMBER, FAST,
/* youprop.h:67-69,108 — Sick_resistance / Sick, read by hmonas's AT_ENGL
 * zombie/mummy sickness arm (uhitm.c:5783-5789). */
SICK_RES, SICK, DEAF, HALF_PHDAM, TELEPORT_CONTROL, KILLED_BY, KILLED_BY_AN, LOW_PM, MALE, FEMALE,
isok } from './const.js';

function _hero_resists(prop) {
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
import { handle_tip, mbodypart as mbodypart_real } from './cmd.js';
import { paranoid_query } from './paranoid.js';
import { newuexp } from './exper_pure.js';
import { clong } from './integer.js';
import { pluslvl, more_experienced, losexp } from './exper.js';
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import monsPack from './makemon_mons.json' with { type: 'json' };
import monMsoundPack from './makemon_msound.json' with { type: 'json' };
import { set_malign, levelDifficulty, which_armor, grow_up, monflee, nonlivingMon, is_demon, monhp_per_lvl, monPmname } from './makemon.js';
import { noteleport_level as noteleport_level_uh, emits_light, permonstTemplate } from './makemon.js';
import { ureflects as ureflects_uh } from './makemon.js';
import { PM_FLOATING_EYE as PM_FLOATING_EYE_UH, PM_JABBERWOCK as PM_JABBERWOCK_UH } from './pm.generated.js';
import { observe_object } from './o_init.js';
/* C mon.c:2744's m_detach light-source teardown (light.c:98, hack.c:97). */
import { del_light_source, monst_to_any, artifact_light } from './light.js';
import { end_burn, fall_asleep as fall_asleep_real } from './timeout.js';
import { can_reach_floor } from './hold_another_object.js';
import { monstseesu, monstunseesu, touch_of_death,
         burn_away_slime as burn_away_slime_real } from './mcastu.js';
import { LS_MONSTER, Is_rogue_level } from './const.js';
import monXpPack from './exper_monxp.json' with { type: 'json' };
import { make_corpse, mkobj, mksobj, mksobj_at, place_object, can_touch_safely, set_ustuck, mongone, mondead, mkcorpstat, add_to_container, dealloc_obj, newcham, makemon, healmon, touch_artifact as touch_artifact_real, resists_ston as resists_ston_real, slimeproof, wake_nearto } from './mklev.js';
/* ndemon: C uhitm.c:4133 demonpet()'s "ndemon(u.ualign.type)" — a random
 * class-S_DEMON monster of the given alignment (or NON_PM). */
import { ndemon } from './sit.js';
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
import { mon_hates_blessings, mon_hates_silver, shade_miss, mon_nam_too, x_monnam,
         xm_has_mgivenname as has_mgivenname } from './mhitm.js';
import { some_mon_nam } from './mhitm.js';
import { Resists_Elem, sleep_monst } from './mhitm.js';
import { y_monnam, helpless } from './mhitm.js';
/* C uhitm.c:331 check_caitiff / mon.c:4331 wakeup — both live in js/mhitm.js,
 * which this file already imports from (see above). */
import { check_caitiff, wakeup, wakeup_attack, seemimic } from './mhitm.js';
import { Adjmonnam as Adjmonnam_uh } from './mhitm.js';
import { defended as defended_real } from './mhitm.js';
import { passive as passive_uh } from './mhitm.js';
import { attacktype } from './mhitm.js';
/* hcolor(colorpref) — do_name.c:1461-1466. Needed by artifact_hit's SPFX_DRLI
 * arm (Stormbringer's "The black blade draws the life..." message uses
 * hcolor(NH_BLACK)); real body already lives in js/mhitm.js. */
import { hcolor } from './mhitm.js';
import { erode_armor } from './mhitm.js';
/* a_monnam / x_monnam's ARTICLE_A form and the M_AP_* enum both come from
 * const.js, which is byte-identical to the C header values (monst.h:52-55). */
import { ARTICLE_A, EXACT_NAME, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPMASK,
         PROT_FROM_SHAPE_CHANGERS } from './const.js';
/* end_running: hack.c's run/travel terminator (hack.c:1360), imported the same
 * way js/cmd.js does. */
import { end_running, is_pool as is_pool_uh, accessible } from './look.js';
/* do_attack's shop arm (C uhitm.c:481-495).  js/shk.js already imports m_at from
 * this file, so this is a late-bound ES-module cycle like the cmd.js one above;
 * all three are hoisted function declarations, so the cycle cannot leave them
 * in TDZ at call time. */
import { in_rooms, tended_shop, dopay } from './shk.js';
import { couldsee, cansee } from './vision.js';
import { dist2, s_suffix } from './hacklib.js';
import { m_carrying, mon_adjust_speed, drain_en, m_useup, monkilled_trap } from './trap.js';
import { worm_seg_at } from './worm.js';
import { mwelded, body_part, flooreffects, _drop_doname, set_wounded_legs, is_pole,
         mhurtle, will_hurtle } from './cmd.js';
/* C wield.c:543 yname(obj) -- "your <xname>" / "the <xname>"; the one body
 * lives in js/do_wear.js.  do_attack's gu.unweapon line needs it. */
import { yname, You, is_shield, bimanual } from './do_wear.js';
import { obj_resists, dmgtype, slept_monst, engulf_target } from './dogmove.js';
import { destroy_items as destroy_items_zap,
         destroy_items_mon as destroy_items_mon_zap } from './zap.js';
import { poly_when_stoned } from './mhitm.js';
import { PM_BALROG, PM_COCKATRICE, PM_CHICKATRICE, PM_BARBED_DEVIL, PM_SHADE, PM_ROPE_GOLEM, PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_PURPLE_WORM, PM_SHRIEKER, PM_BLACK_PUDDING, PM_BROWN_PUDDING, PM_FLESH_GOLEM, PM_IRON_GOLEM, PM_ARCHON, PM_STONE_GOLEM, PM_WATER_ELEMENTAL,
         PM_VLAD_THE_IMPALER, PM_LIZARD, PM_ARCHEOLOGIST, PM_WIZARD,
         PM_DEATH, PM_FAMINE, PM_PESTILENCE, PM_VAMPIRE, PM_VAMPIRE_LORD } from './pm.generated.js';
import { hitmsg, hitmsg_je, u_slip_free, make_blinded, mpoisons_subj, magic_negation,
         could_seduce, mdamageu, mhis_mon } from './mhitu.js';
import { drain_item, resist, cancel_monst } from './zap.js';
import { make_stunned, make_confused } from './potion.js';
import { mstatusline } from './cmd.js';
import { upstart } from './mklev.js';
import { noit_Monnam } from './mhitm.js';
import { deadhero } from './end.js';
/* C explode.c:1013 mon_explodes — corpse_chance()'s AT_BOOM arm calls it. */
import { mon_explodes } from './zap.js';
/* C permonst.mattk[NATTK] (js/makemon_mattk.json — the same pack js/makemon.js
 * and js/mhitu.js read); corpse_chance scans it for the AT_BOOM attack. */
import monMattkPack from './makemon_mattk.json' with { type: 'json' };
const MONS_MATTK = /** @type {{aatyp:number,adtyp:number,damn:number,damd:number}[][]} */ (monMattkPack.mattk);
const NATTK_UH = 6;          /* C monattk.h:9 NATTK */
const AT_BOOM = 14;          /* C monattk.h:24 — explodes when killed */
import { tele, rloc, RLOC_NOMSG, u_teleport_mon as u_teleport_mon_real } from './teleport.js';
import { sticks, abuse_dog, tamedog, unstuck } from './dog.js';
import { paralyze_monst, rustm, extract_from_minvent_dm, stackobj_dm, mondied_dm } from './dogmove.js';
import { stackobj } from './sp_lev.js';
import { nomul } from './allmain.js';
import { unconscious } from './pickup.js';
import { impossible } from './steed.js';
/* healup(nhp, nxtra, curesick, cureblind) — potion.c real body, RNG-free.
 * artifact_hit's SPFX_DRLI arm (Stormbringer) heals the hero for half the
 * drained HP. */
import { healup, make_sick, make_stoned, make_slimed } from './potion.js';
import { ENV } from './hostenv.js';
function makesingular(str) { return makesingular_real(str); }

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
const MAXULEV = 30;
/* MONS row layout (the authoritative column map is js/makemon.js
 * permonstTemplate, which materialises `mon->data` from these rows):
 *   [0]mlet [1]mlevel [3]geno [4]maligntyp [5]mresists [6]mflags1
 *   [7]mflags2 [8]mflags3 [9]mmove
 * This comment used to read "[mlet, mlevel, mov, geno, ...]", i.e. it put
 * permonst.mmove in column [2].  It is column [9] — column [2] is something
 * else entirely (the water nymph, mmove 12, has row[2] == 5).  The wrong
 * spelling reads as plausible data, so it does not throw; it silently answers a
 * different question. */
const _MONS = /** @type {number[][]} */ (monsPack.mons);
/* C permonst.msound (MS_*) per MON() row — parallel to _MONS row order. */
const _MONS_MSOUND = /** @type {number[]} */ (monMsoundPack.msound);
/* C monflag.h ms_sounds — nemesis / guardian (used by the xkilled align block). */
const MS_NEMESIS = 37, MS_GUARDIAN = 38;
/* G_FREQ = 0x0007 creation frequency mask (monflag.h). */
const G_FREQ = 7;
/* C attrib.h attribute indices (mirrors attrib.js) */
const A_STR = 0;
const A_WIS = 2;
const A_DEX = 3;
/* MZ_SMALL = 1 (monflag.h); verysmall(ptr) = (msize < MZ_SMALL) */
const MZ_SMALL = 1;
/* MZ_LARGE = 3 (monflag.h); bigmonst(ptr) = (msize >= MZ_LARGE) */
const MZ_LARGE = 3;
/* Starting weapon otyp constants (from nethack-c/include/objects.h counts).
 * C ref: u_init.c Valkyrie[]/Wizard[] trobj tables. */
const OTYP_SPEAR = 27;         /* SPEAR — Valkyrie uwep (spe=1) */
const OTYP_DAGGER = 34;        /* DAGGER — Valkyrie uswapwep (spe=0) */
const OTYP_QUARTERSTAFF = 79;  /* QUARTERSTAFF — Wizard uwep (spe=1) */
/* Object class constants (objclass.h). */
const RANDOM_CLASS = 0;        /* mkobj() random-class selector */
const WEAPON_CLASS = 2;        /* weapon objects */
const TOOL_CLASS = 6;          /* tool objects */
const FOOD_CLASS = 7;          /* comestibles (xkilled treasure-drop food check) */
const GEM_CLASS = 13;          /* gem/stone/orb objects */
/* xkilled() "illogical but traditional treasure drop" constants (mon.c:3573). */
const FIGURINE = 241;          /* objects.h FIGURINE — exempt from the big-object cull */
const S_KOP = 37;              /* monsym.h S_KOP — Kops drop no treasure */
const MZ_HUMAN = 2;            /* monflag.h MZ_HUMAN (== MZ_MEDIUM) */
const G_NOCORPSE = 0x0010;     /* monflag.h G_NOCORPSE — species leaves no corpse */
const M2_COLLECT = 0x40000000; /* monflag.h M2_COLLECT — picks up weapons and food */
const M2_UNDEAD = 0x00000002;  /* monflag.h M2_UNDEAD — mondata.h is_undead(ptr) */
/* Per-mndx AC lookup (permonst.ac). Generated from nethack-c/include/monsters.h
 * via LVL(lvl, mov, AC, ...) extraction, matched to js/pm.generated.js indices.
 * Default 10 for unmatched entries (easy to hit — safe fallback).
 * C ref: worn.c:709 find_mac(mon) = mon->data->ac (for unarmored monsters). */
const MONS_AC = [3,-1,3,3,4,-4,8,8,8,8,6,6,7,7,7,7,6,5,5,4,4,4,4,4,4,4,2,10,9,4,4,4,6,5,6,6,6,4,6,-10,2,-4,-2,10,10,5,10,10,5,0,7,6,2,7,2,5,8,8,8,10,10,10,6,8,7,7,7,9,9,9,10,10,10,10,10,10,5,10,3,0,0,7,0,4,2,6,5,5,7,7,6,6,0,0,3,3,4,3,3,3,6,2,2,2,5,4,0,2,2,2,2,2,5,5,5,6,9,-4,0,0,3,5,0,-4,-5,-6,8,7,6,6,4,3,2,2,2,2,2,2,2,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3,2,2,2,2,9,9,9,9,9,7,7,10,10,4,10,0,0,6,4,3,3,3,-3,6,-2,10,10,10,10,0,-2,-4,-6,6,6,5,5,4,4,4,3,6,6,6,6,4,2,2,0,5,3,4,8,8,6,6,3,3,2,-10,8,3,3,5,2,2,4,2,0,4,-4,2,1,0,-6,5,4,0,-2,6,6,5,6,6,6,10,10,9,9,9,8,6,10,6,4,10,10,8,6,6,4,9,7,5,1,3,10,10,10,10,10,10,10,10,10,10,5,0,10,10,0,10,7,10,10,0,10,10,10,10,2,-8,0,-5,10,-4,0,-5,2,0,-6,0,-2,-1,-4,-1,-3,4,-2,-7,-5,-6,-3,-2,-5,-7,-8,-5,-5,-5,10,4,6,4,2,-1,-3,6,8,8,7,7,6,6,5,-1,0,10,10,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,7,0,0,0,10,0,0,-2,0,0,0,-1,-10,-2,10,0,0,2,0,10,10,10,10,10,10,10,10,10,10,10,10,10,10];
const MONS_MSIZE = monMsizePack.msize;
/* C monsters.h — Wizard of Yendor PM index (mons[] order); needed by abon's
 * adj_lev(&mons[u.umonnum]) Upolyd branch below. */
const PM_WIZARD_OF_YENDOR = 285; /* monsters.h:2858 MON(... WIZARD_OF_YENDOR);
                                  * was 291 = PM_HORNED_DEVIL */

export function abon() {
    const u = game.u || {};
    const str = acurr(u, A_STR);
    const dex = acurr(u, A_DEX);
    const umonnum = u.umonnum | 0;
    const umonster = u.umonster | 0;
    if (umonnum !== umonster) {
        const mlevel = _MONS[umonnum][1] | 0;
        let tmp;
        if (umonnum === PM_WIZARD_OF_YENDOR) {
            const died = (game.mvitals && game.mvitals[PM_WIZARD_OF_YENDOR])
                ? (game.mvitals[PM_WIZARD_OF_YENDOR].died | 0) : 0;
            tmp = mlevel + died;
            if (tmp > 49) tmp = 49;
            return tmp - 3;
        }
        if (mlevel > 49) return 50 - 3;
        tmp = mlevel;
        const tmp2a = levelDifficulty() - tmp;
        if (tmp2a < 0) tmp--;
        else tmp += Math.trunc(tmp2a / 5);
        const tmp2b = (u.ulevel | 0) - mlevel;
        if (tmp2b > 0) tmp += Math.trunc(tmp2b / 4);
        let tmp2c = Math.trunc((3 * mlevel) / 2);
        if (tmp2c > 49) tmp2c = 49;
        const adjlev = tmp > tmp2c ? tmp2c : tmp > 0 ? tmp : 0;
        return adjlev - 3;
    }
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str <= 68) sbon = 1; /* STR18(50) = 18+50 */
    else if (str < 118) sbon = 2; /* STR18(100) = 18+100 */
    else sbon = 3;
    /* Game tuning kludge: make it a bit easier for a low level character to
     * hit (weapon.c:970-972). */
    sbon += ((u.ulevel | 0) < 3) ? 1 : 0;
    if (dex < 4) return sbon - 3;
    else if (dex < 6) return sbon - 2;
    else if (dex < 8) return sbon - 1;
    else if (dex < 14) return sbon;
    else return sbon + dex - 14;
}
/* Damage bonus from strength (weapon.c dbon).
 * C ref: nethack-c/src/weapon.c dbon() */
export function dbon() {
    const u = game.u || {};
    const str = acurr(u, A_STR);
    if (Upolyd(u))
        return 0;
    if (str < 6)
        return -1;
    else if (str < 16)
        return 0;
    else if (str < 18)
        return 1;
    else if (str == 18)
        return 2; /* up to 18 */
    else if (str <= STR18(75))
        return 3; /* up to 18/75 */
    else if (str <= STR18(90))
        return 4; /* up to 18/90 */
    else if (str < STR18(100))
        return 5; /* up to 18/99 */
    else
        return 6;
}
/* Monster species names, indexed by PM_xxx constant value.
 * Generated from js/pm.generated.js: PM_FOO = N → MONS_NAMES[N] = "foo".
 * C ref: monsters.h NAM() macro — same order as C mons[] array.
 * Used by mon_nam() / Monnam() helpers below for hit/miss/kill messages. */
export const MONS_NAMES = ["giant ant","killer bee","soldier ant","fire ant","giant beetle","queen bee","acid blob","quivering blob","gelatinous cube","chickatrice","cockatrice","pyrolisk","jackal","fox","coyote","werejackal","little dog","dingo","dog","large dog","wolf","werewolf","winter wolf cub","warg","winter wolf","hell hound pup","hell hound","gas spore","floating eye","freezing sphere","flaming sphere","shocking sphere","kitten","housecat","jaguar","lynx","panther","large cat","tiger","displacer beast","gremlin","gargoyle","winged gargoyle","hobbit","dwarf","bugbear","dwarf lord","dwarf king","mind flayer","master mind flayer","manes","homunculus","imp","lemure","quasit","tengu","blue jelly","spotted jelly","ochre jelly","kobold","large kobold","kobold lord","kobold shaman","leprechaun","small mimic","large mimic","giant mimic","wood nymph","water nymph","mountain nymph","goblin","hobgoblin","orc","hill orc","mordor orc","uruk hai","orc shaman","orc captain","rock piercer","iron piercer","glass piercer","rothe","mumak","leocrotta","wumpus","titanothere","baluchitherium","mastodon","sewer rat","giant rat","rabid rat","wererat","rock mole","woodchuck","cave spider","centipede","giant spider","scorpion","lurker above","trapper","pony","white unicorn","gray unicorn","black unicorn","horse","warhorse","fog cloud","dust vortex","ice vortex","energy vortex","steam vortex","fire vortex","baby long worm","baby purple worm","long worm","purple worm","grid bug","xan","yellow light","black light","zruty","couatl","aleax","angel","ki rin","archon","bat","giant bat","raven","vampire bat","plains centaur","forest centaur","mountain centaur","baby gray dragon","baby gold dragon","baby silver dragon","baby red dragon","baby white dragon","baby orange dragon","baby black dragon","baby blue dragon","baby green dragon","baby yellow dragon","gray dragon","gold dragon","silver dragon","red dragon","white dragon","orange dragon","black dragon","blue dragon","green dragon","yellow dragon","stalker","air elemental","fire elemental","earth elemental","water elemental","lichen","brown mold","yellow mold","green mold","red mold","shrieker","violet fungus","gnome","gnome lord","gnomish wizard","gnome king","giant","stone giant","hill giant","fire giant","frost giant","ettin","storm giant","titan","minotaur","jabberwock","keystone kop","kop sergeant","kop lieutenant","kop kaptain","lich","demilich","master lich","arch lich","kobold mummy","gnome mummy","orc mummy","dwarf mummy","elf mummy","human mummy","ettin mummy","giant mummy","red naga hatchling","black naga hatchling","golden naga hatchling","guardian naga hatchling","red naga","black naga","golden naga","guardian naga","ogre","ogre lord","ogre king","gray ooze","brown pudding","green slime","black pudding","quantum mechanic","genetic engineer","rust monster","disenchanter","garter snake","snake","water moccasin","python","pit viper","cobra","troll","ice troll","rock troll","water troll","olog hai","umber hulk","vampire","vampire lord","vlad the impaler","barrow wight","wraith","nazgul","xorn","monkey","ape","owlbear","yeti","carnivorous ape","sasquatch","kobold zombie","gnome zombie","orc zombie","dwarf zombie","elf zombie","human zombie","ettin zombie","ghoul","giant zombie","skeleton","straw golem","paper golem","rope golem","gold golem","leather golem","wood golem","flesh golem","clay golem","stone golem","glass golem","iron golem","human","","","","elf","woodland elf","green elf","grey elf","elf lord","elvenking","doppelganger","shopkeeper","guard","prisoner","oracle","priest","high priest","soldier","sergeant","nurse","lieutenant","captain","watchman","watch captain","medusa","wizard of yendor","croesus","ghost","shade","water demon","incubus","horned devil","erinys","barbed devil","marilith","vrock","hezrou","bone devil","ice devil","nalfeshnee","pit fiend","sandestin","balrog","juiblex","yeenoghu","orcus","geryon","dispater","baalzebub","asmodeus","demogorgon","death","pestilence","famine","mail daemon","djinni","jellyfish","piranha","shark","giant eel","electric eel","kraken","newt","gecko","iguana","baby crocodile","lizard","chameleon","crocodile","salamander","long worm tail","archeologist","barbarian","caveman","healer","knight","monk","","ranger","rogue","samurai","tourist","valkyrie","wizard","lord carnarvon","pelias","shaman karnov","hippocrates","king arthur","grand master","arch priest","orion","master of thieves","lord sato","twoflower","norn","neferet the green","minion of huhetotl","thoth amon","chromatic dragon","cyclops","ixoth","master kaen","nalzok","scorpius","master assassin","ashikaga takauji","lord surtur","dark one","student","chieftain","neanderthal","attendant","page","abbot","acolyte","hunter","thug","ninja","roshi","guide","warrior","apprentice"];
export function mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
                    has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}
/* Monnam(mtmp) — C ref: nethack-c/src/do_name.c:1073-1080.
 *   char *bp = mon_nam(mtmp); *bp = highc(*bp); return bp;
 * highc() only uppercases a-z (hacklib.h), so a name already starting with a
 * capital or a non-letter is returned unchanged. */
function Monnam(mtmp) {
    const bp = mon_nam(mtmp);
    if (!bp) return bp;
    let first = bp.charCodeAt(0);
    if (0x61 <= first && first <= 0x7a) first &= ~0x20;
    return String.fromCharCode(first) + bp.slice(1);
}
/* exclam(dmg) — C ref: zap.c:3542 exclam().
 * Returns "!" if dmg > 4, else ".". */
export function exclam(dmg) {
    return (dmg > 4) ? '!' : '.';
}
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
/* Per-otyp oc_hitbon ("to hit" bonus), indexed by otyp.
 * Generated from nethack-c/include/objects.h WEAPON()/PROJECTILE()/BOW() macros:
 * the hitbon field is added unconditionally in hitval() [weapon.c:159].
 * Weapons start at otyp 18 (ARROW); index = otyp; all non-weapon otyps are 0.
 * C ref: weapon.c:159 tmp += objects[otmp->otyp].oc_hitbon. */
const WEAPON_HITBON = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
/* objects.h WEPTOOL() entries — pick-axe/grappling hook (WHACK) and unicorn
 * horn (PIERCE) — see the oc_hitbon comment in hitval() below. */
const PICK_AXE_HITBON_UH = 259, GRAPPLING_HOOK_HITBON_UH = 260,
      UNICORN_HORN_HITBON_UH = 261;
/* SPEAR-skill otyps (objects.h: oc_skill == P_SPEAR=17): spear(27), elven(28),
 * orcish(29), dwarvish(30), silver(31), javelin(32). Trident(33) is P_TRIDENT.
 * C ref: obj.h:233 is_spear(otmp) = oclass==WEAPON_CLASS && oc_skill==P_SPEAR. */
const SPEAR_OTYPS = new Set([27, 28, 29, 30, 31, 32]);
/* kebabable monster letters (mlet): S_XORN(50), S_DRAGON(30), S_JABBERWOCK(36),
 * S_NAGA(40), S_GIANT(34). C ref: weapon.c:71 kebabable[]. */
const KEBABABLE_MLET = new Set([50, 30, 36, 40, 34]);
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
/* C artifact.c:626 attacks() — use the attack column, not the defense or
 * carried-resistance column. get_artifact supplies the non-artifact sentinel. */
export function attacks(adtyp, otmp) {
    const weap = get_artifact(otmp);
    if (weap !== ART_NONARTIFACT)
        return ARTI_SPEC[weap].adtyp === adtyp;
    return false;
}
/* C artifact.h:21,35-40 */
const SPFX_ATTK_UH   = 0x00000040;
const SPFX_DMONS_UH  = 0x00100000;
const SPFX_DCLAS_UH  = 0x00200000;
const SPFX_DFLAG1_UH = 0x00400000;
const SPFX_DFLAG2_UH = 0x00800000;
const SPFX_DALIGN_UH = 0x01000000;
const SPFX_DBONUS_UH = 0x01F00000;
/* C monattk.h:42-58.  AD_PHYS_UH / AD_DRLI_UH / AD_STON_UH are already declared
 * further down this file (the mhitm_ad_* block) and are reused here. */
const AD_MAGM_UH = 1, AD_FIRE_UH = 2, AD_COLD_UH = 3,
      AD_ELEC_UH = 6, AD_DRST_UH = 7, AD_STUN_UH = 12;
/* C align.h — A_NONE is the "no alignment" sentinel artilist[] uses. */
const A_NONE_UH = -128;
/* C monflag.h M2_WERE (compiled: 0x4). */
const M2_WERE_UH = 0x00000004;

/* C ref: artifact.c:1023-1069 spec_applies(weap, mtmp).  `mtmp === null` is
 * this file's existing convention for "the defender is the hero"
 * (js/mhitu.js:4028 calls hitval that way), i.e. C's `mtmp == &gy.youmonst`,
 * and `mndx` is then u.umonnum. */
function spec_applies(arti, mtmp, mndx) {
    const spfx = arti.spfx | 0;

    if (!(spfx & (SPFX_DBONUS_UH | SPFX_ATTK_UH)))
        return (arti.adtyp | 0) === AD_PHYS_UH;

    const yours = !mtmp;
    const ptr = yours ? permonstTemplate(mndx) : mtmp.data;
    if (!ptr)
        return false;

    if (spfx & SPFX_DMONS_UH) {
        return (ptr.pmidx | 0) === (arti.mtype | 0);
    } else if (spfx & SPFX_DCLAS_UH) {
        return (arti.mtype | 0) === (ptr.mlet | 0);
    } else if (spfx & SPFX_DFLAG1_UH) {
        return (((ptr.mflags1 >>> 0) & (arti.mtype >>> 0)) !== 0);
    } else if (spfx & SPFX_DFLAG2_UH) {
        /* C's second disjunct covers the hero in her OWN form: the race's
         * selfmask, and the were mask against u.ulycn.  js/ has no urace
         * selfmask table, so only the ulycn half is spelled; a hero attacked
         * with Demonbane/Giantslayer/Sunsword while un-polymorphed and of the
         * matching race is the case this misses (artifact.c:1042-1045). */
        return (((ptr.mflags2 >>> 0) & (arti.mtype >>> 0)) !== 0)
               || (yours && ((arti.mtype & M2_WERE_UH) !== 0)
                   && ((game.u?.ulycn ?? -1) | 0) >= 0);
    } else if (spfx & SPFX_DALIGN_UH) {
        return yours ? ((game.u?.ualign?.type | 0) !== (arti.align | 0))
                     : ((ptr.maligntyp | 0) === A_NONE_UH
                        || Math.sign(ptr.maligntyp | 0) !== (arti.align | 0));
    } else if (spfx & SPFX_ATTK_UH) {
        if (defended(mtmp, arti.adtyp | 0))
            return false;

        switch (arti.adtyp | 0) {
        case AD_FIRE_UH:
            return !(yours ? _hero_resists(FIRE_RES) : resists_fire(mtmp));
        case AD_COLD_UH:
            return !(yours ? _hero_resists(COLD_RES) : resists_cold(mtmp));
        case AD_MAGM_UH:
        case AD_STUN_UH:
            /* THE ONE RNG DRAW IN THIS FUNCTION (artifact.c:1049). */
            return !(yours ? Antimagic_uh() : (rn2(100) < (ptr.mr | 0)));
        case AD_ELEC_UH:
            /* artifact.c:1044 `resists_elec(mtmp)` (the yours branch is
             * unreached from do_attack's mtmp-is-a-real-monster call sites).
             * resists_elec below (this file) is the same mintrinsics-only
             * simplification resists_fire/resists_cold above are documented
             * as carrying — the worn/wielded-item tail of Resists_Elem is a
             * KNOWN GAP, not this arm's. The artifact reaching this case is
             * Mjollnir. */
            return !(yours ? _hero_resists(SHOCK_RES) : resists_elec(mtmp));
        case AD_DRST_UH:
            /* artifact.c:1049 `resists_poison(mtmp)`.  resists_poison_uh
             * below carries the same mresists|mextrinsics|mintrinsics
             * simplification. Unreached in practice (no artilist[] row with
             * SPFX_ATTK + nonzero damn has this adtyp), ported for
             * completeness (Cardinal Rule 1: port the whole switch). */
            return !(yours ? _hero_resists(POISON_RES) : resists_poison_uh(mtmp));
        case AD_DRLI_UH:
            return !(yours ? _hero_resists(DRAIN_RES) : resists_drli_deth(mtmp));
        case AD_STON_UH:
            return !(yours ? _hero_resists(STONE_RES) : sh_resists_ston(mtmp));
        default:
            impossible("Weird weapon special attack.");
        }
    }
    return false;
}

/* C ref: you.h — Antimagic is the hero's ANTIMAGIC property. */
function Antimagic_uh() {
    const pr = game.u?.uprops?.[ANTIMAGIC_UH];
    return !!(pr && (pr.intrinsic || pr.extrinsic));
}
/* C prop.h:30 */
const ANTIMAGIC_UH = 12;

/* C ref: artifact.c:1075-1088 spec_abon(otmp, mon) — "special attack bonus".
 *   const struct artifact *weap = get_artifact(otmp);
 *   if (weap != &artilist[ART_NONARTIFACT]
 *       && weap->attk.damn && spec_applies(weap, mon))
 *       return rnd((int) weap->attk.damn);
 *   return 0;
 * The `weap->attk.damn &&` short-circuit matters: it keeps spec_applies (and
 * its rn2(100)) from running at all for an artifact with no to-hit die. */
export function spec_abon(otmp, mtmp, mndx) {
    const artidx = (otmp?.oartifact | 0);
    if (artidx <= 0 || artidx >= ARTI_SPEC.length)
        return 0;
    const weap = ARTI_SPEC[artidx];
    if (weap.damn && spec_applies(weap, mtmp, mndx))
        return rnd(weap.damn | 0);
    return 0;
}

let gs_spec_dbon_applies = false;
/* artilist[] ordinal of Grimtooth, the one artifact whose damage bonus
 * deliberately bypasses spec_applies() (artifact.c:1099-1102). */
const ART_GRIMTOOTH_UH = 5;

export function spec_dbon(otmp, mtmp, mndx, tmp) {
    const artidx = (otmp?.oartifact | 0);
    const weap = (artidx > 0 && artidx < ARTI_SPEC.length)
        ? ARTI_SPEC[artidx] : null;

    if (!weap
        || ((weap.adtyp | 0) === AD_PHYS_UH && (weap.damn | 0) === 0
            && (weap.damd | 0) === 0))
        gs_spec_dbon_applies = false;
    else if (artidx === ART_GRIMTOOTH_UH)
        gs_spec_dbon_applies = true;
    else
        gs_spec_dbon_applies = spec_applies(weap, mtmp, mndx);

    if (gs_spec_dbon_applies)
        return (weap.damd | 0) ? rnd(weap.damd | 0) : Math.max(tmp | 0, 1);
    return 0;
}

/* C ref: artifact.c:626-634 attacks(adtyp, otmp) and artifact.c:515-523
 * spec_ability(otmp, abil) — both are "get_artifact(), then read one column",
 * and both answer FALSE for a non-artifact. */
function arti_attacks(adtyp, otmp) {
    const artidx = (otmp?.oartifact | 0);
    if (artidx <= 0 || artidx >= ARTI_SPEC.length)
        return false;
    return (ARTI_SPEC[artidx].adtyp | 0) === (adtyp | 0);
}
function spec_ability(otmp, abil) {
    const artidx = (otmp?.oartifact | 0);
    if (artidx <= 0 || artidx >= ARTI_SPEC.length)
        return false;
    return ((ARTI_SPEC[artidx].spfx >>> 0) & (abil >>> 0)) !== 0;
}
/* C artifact.h:22,24 */
const SPFX_DRLI_UH   = 0x00000100;
const SPFX_BEHEAD_UH = 0x00000400;

export async function artifact_hit(magr, mdef, otmp, dmg, dieroll, mdefMndx = -1) {
    /* artifact.c:1448-1454 — youattack/youdefend/vis, needed by the SPFX_DRLI
     * arm below.  This file's convention is that a null monst means
     * &gy.youmonst (spec_applies() above uses the same one). */
    const youattack = !magr;
    const youdefend = !mdef;
    const vis = (!youattack && magr && cansee(magr.mx | 0, magr.my | 0))
        || (!youdefend && mdef && cansee(mdef.mx | 0, mdef.my | 0))
        || (youattack && engulfing_u(mdef) && !_uh_Blind());
    const realizesDamage = youdefend || vis
        || (youattack && mdef === game.u?.ustuck);
    const hittee = youdefend ? 'you' : mon_nam(mdef);

    /* artifact.c:1470 — "The following takes care of most of the damage".
     * Runs BEFORE every arm below, including the ones that return early.
     * `mdefMndx` is the hero's u.umonnum when mdef is null (youdefend). */
    dmg = (dmg | 0) + spec_dbon(otmp, mdef, mdefMndx, dmg | 0);

    if (arti_attacks(AD_FIRE_UH, otmp)) {
        if (realizesDamage) {
            const verb = !gs_spec_dbon_applies ? 'hits'
                : ((mdefMndx | 0) === PM_WATER_ELEMENTAL
                   ? 'vaporizes part of' : 'burns');
            await pline_The("fiery blade %s %s%c", verb, hittee,
                            !gs_spec_dbon_applies ? '.' : '!');
        }
        if (!rn2(4)) {
            const itemdmg = youdefend
                ? await destroy_items_zap(true, AD_FIRE_UH, dmg)
                : (await destroy_items_mon_zap(mdef, AD_FIRE_UH, dmg));
            if (!youdefend)
                dmg += itemdmg;
            await ignite_items_real(youdefend ? game.invent : mdef.minvent);
        }
        if (youdefend)
            await burn_away_slime_real();
        return { dmg, special: realizesDamage };
    }
    if (arti_attacks(AD_COLD_UH, otmp)) {
        if (realizesDamage)
            await pline_The("ice-cold blade %s %s%c",
                            !gs_spec_dbon_applies ? 'hits' : 'freezes', hittee,
                            !gs_spec_dbon_applies ? '.' : '!');
        if (!rn2(4)) {
            const itemdmg = youdefend
                ? await destroy_items_zap(true, AD_COLD_UH, dmg)
                : (await destroy_items_mon_zap(mdef, AD_COLD_UH, dmg));
            if (!youdefend)
                dmg += itemdmg;
        }
        return { dmg, special: realizesDamage };
    }
    if (arti_attacks(AD_ELEC_UH, otmp)) {
        if (realizesDamage)
            await pline_The("massive hammer hits%s %s%c",
                            !gs_spec_dbon_applies ? '' : '!  Lightning strikes',
                            hittee, !gs_spec_dbon_applies ? '.' : '!');
        if (gs_spec_dbon_applies) {
            const wakeTarget = youdefend ? game.u : mdef;
            wake_nearto(wakeTarget.ux ?? wakeTarget.mx,
                        wakeTarget.uy ?? wakeTarget.my, 4 * 4);
        }
        if (!rn2(5)) {
            const itemdmg = youdefend
                ? await destroy_items_zap(true, AD_ELEC_UH, dmg)
                : (await destroy_items_mon_zap(mdef, AD_ELEC_UH, dmg));
            if (!youdefend)
                dmg += itemdmg;
        }
        return { dmg, special: realizesDamage };
    }
    if (arti_attacks(AD_MAGM_UH, otmp))
        return { dmg, special: false }; /* KNOWN GAP above, no RNG owed */

    /* artifact.c:1538-1541 */
    if (arti_attacks(AD_STUN_UH, otmp) && dieroll <= MB_MAX_DIEROLL_UH) {
        const mb = await Mb_hit(magr, mdef, otmp, dmg, dieroll, vis, hittee);
        return { dmg: mb.dmg, special: mb.result };
    }

    if (!gs_spec_dbon_applies)
        return { dmg, special: false };

    /* artifact.c:1550-1644 — "We really want 'on a natural 20' but Nethack does
     * it in reverse from AD&D."  Tsurugi 30, Vorpal Blade 18 (artilist index). */
    if (spec_ability(otmp, SPFX_BEHEAD_UH)) {
        const M1_NOHEAD_UH = 0x00008000, M1_AMORPHOUS_UH = 0x00000004;
        const S_GHOST_UH = 54;
        const hasHead = (ptr) => !((ptr.mflags1 | 0) & M1_NOHEAD_UH);
        const noncorpAmorph = (ptr) => (ptr.mlet | 0) === S_GHOST_UH
            || !!((ptr.mflags1 | 0) & M1_AMORPHOUS_UH);
        const notonhead = !!(game.gn && game.gn.notonhead);
        const uhp = () => (Upolyd(game.u) ? game.u.mh : game.u.uhp) | 0;
        let wepdesc;
        if (sr_is_art(otmp, 30) && (dieroll | 0) === 1) {
            wepdesc = 'The razor-sharp blade';
            if (youattack && engulfing_u(mdef)) {
                await pline(`You slice ${mon_nam(mdef)} wide open!`);
                return { dmg: 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH, special: true };
            }
            if (!youdefend) {
                /* allow normal cutworm() call to add extra damage */
                if (notonhead)
                    return { dmg, special: false };
                if ((mdef.data.msize | 0) >= MZ_LARGE) {
                    if (youattack)
                        await pline(`You slice deeply into ${mon_nam(mdef)}!`);
                    else if (vis)
                        await pline(`${Monnam(magr)} cuts deeply into ${hittee}!`);
                    return { dmg: dmg * 2, special: true };
                }
                dmg = 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH;
                await pline(`${wepdesc} cuts ${mon_nam(mdef)} in half!`);
                observe_object(otmp);
                return { dmg, special: true };
            }
            const ydata = game.youmonst.data;
            if ((ydata.msize | 0) >= MZ_LARGE) {
                await pline(`${magr ? Monnam(magr) : wepdesc} cuts deeply into you!`);
                return { dmg: dmg * 2, special: true };
            }
            dmg = 2 * uhp() + FATAL_DAMAGE_MODIFIER_UH;
            await pline(`${wepdesc} cuts you in half!`);
            observe_object(otmp);
            return { dmg, special: true };
        } else if (sr_is_art(otmp, 18)
                   && ((dieroll | 0) === 1
                       || (mdef && (mdef.data.pmidx | 0) === PM_JABBERWOCK_UH))) {
            const behead_msg = ['%s beheads %s!', '%s decapitates %s!'];
            if (youattack && engulfing_u(mdef))
                return { dmg, special: false };
            wepdesc = 'Vorpal Blade';
            if (!youdefend) {
                if (!hasHead(mdef.data) || notonhead || game.u.uswallow) {
                    if (youattack)
                        await pline(`Somehow, you miss ${mon_nam(mdef)} wildly.`);
                    else if (vis)
                        await pline(`Somehow, ${mon_nam(magr)} misses wildly.`);
                    return { dmg: 0, special: !!(youattack || vis) };
                }
                if (noncorpAmorph(mdef.data)) {
                    await pline(`${wepdesc} slices through ${s_suffix(mon_nam(mdef))} ${mbodypart(mdef, 11 /* NECK */)}.`);
                    return { dmg, special: true };
                }
                dmg = 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH;
                const fmt = behead_msg[rn2(2)]; /* ROLL_FROM(behead_msg) */
                await pline(fmt.replace('%s', wepdesc).replace('%s', mon_nam(mdef)));
                if (_xk_hallu() && !game.flags?.female)
                    await pline("Good job Henry, but that wasn't Anne.");
                observe_object(otmp);
                return { dmg, special: true };
            }
            const ydata = game.youmonst.data;
            if (!hasHead(ydata)) {
                await pline(`Somehow, ${magr ? mon_nam(magr) : wepdesc} misses you wildly.`);
                return { dmg: 0, special: true };
            }
            if (noncorpAmorph(ydata)) {
                await pline(`${wepdesc} slices through your ${body_part(11 /* NECK */)}.`);
                return { dmg, special: true };
            }
            dmg = 2 * uhp() + FATAL_DAMAGE_MODIFIER_UH;
            const fmt = behead_msg[rn2(2)];
            await pline(fmt.replace('%s', wepdesc).replace('%s', 'you'));
            observe_object(otmp);
            return { dmg, special: true };
        }
    }

    if (spec_ability(otmp, SPFX_DRLI_UH)) {
        /* artifact.c:1645-1720. `life` names the message noun; nonliving
         * targets (golems, vortices) get "animating force" instead. */
        const life = nonlivingMon(mdefMndx) ? 'animating force' : 'life';

        if (!youdefend) {
            const m_lev = mdef.m_lev | 0;
            const mhpmax0 = mdef.mhpmax | 0;
            let drain = monhp_per_lvl(mdef); /* usually 1d8 */

            /* "stop draining HP if it drops too low (still drains level;
             * also caller still inflicts regular weapon damage)" */
            if (mhpmax0 - drain <= m_lev)
                drain = (mhpmax0 > m_lev) ? (mhpmax0 - (m_lev + 1)) : 0;

            if (vis) {
                /* call distant_name() for possible side-effects even if the
                 * result won't be printed, exactly as C's comment says. */
                const otmpname = await distant_name(otmp, xname);
                if (sr_is_art(otmp, _AC_ART_STORMBRINGER))
                    pline_The('%s blade draws the %s from %s!',
                               hcolor(NH_BLACK_UH), life, mon_nam(mdef));
                else
                    pline('%s draws the %s from %s!', The(otmpname), life,
                          mon_nam(mdef));
            }
            if ((mdef.m_lev | 0) === 0) {
                /* losing a level when at 0 is fatal */
                dmg = 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH;
            } else {
                dmg += drain;
                mdef.mhpmax = mhpmax0 - drain;
                mdef.m_lev = m_lev - 1;
            }

            if (drain > 0) {
                /* drain: was target's damage, now heal attacker by half */
                drain = ((drain + 1) / 2) | 0; /* drain/2 rounded up */
                if (youattack)
                    healup(drain, 0, false, false);
                else
                    healmon(magr, drain, 0);
            }
            return { dmg, special: vis };
        } else { /* youdefend — not reached from do_attack's call site */
            const oldhpmax = game.u.uhpmax | 0;

            if (_uh_Blind()) {
                await pline('You feel an %s drain your %s!',
                            sr_is_art(otmp, _AC_ART_STORMBRINGER)
                                ? 'unholy blade' : 'object', life);
            } else {
                const otmpname = await distant_name(otmp, xname);
                if (sr_is_art(otmp, _AC_ART_STORMBRINGER))
                    await pline_The('%s blade drains your %s!',
                                    hcolor(NH_BLACK_UH), life);
                else
                    await pline('%s drains your %s!', The(otmpname), life);
            }
            /* C artifact.c:1708 — finish level loss (including death or life
             * saving at level 1) before artifact_hit returns to its caller. */
            await losexp('life drainage');
            if (magr && (magr.mhp | 0) < (magr.mhpmax | 0))
                healmon(magr, (Math.abs(oldhpmax - (game.u.uhpmax | 0)) + 1) / 2 | 0, 0);
            return { dmg, special: true };
        }
    }

    /* artifact.c:1721 */
    return { dmg, special: false };
}
/* C ref: artifact.c:1252-1440 Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis,
 * hittee) — Magicbane's special effects.  `dmg` is C's *dmgptr, returned in
 * `{dmg, result}`.  probe_monster() (zap.c:626) is unported: its
 * non-empty-minvent arm throws rather than guessing. */
async function Mb_hit(magr, mdef, mb, dmg, dieroll, vis, hittee) {
    const youattack = !magr;
    const youdefend = !mdef;
    const u = game.u;
    let resisted = false, do_stun, do_confuse, result = false;
    let scare_dieroll = (MB_MAX_DIEROLL_UH / 2) | 0;
    const spe = mb.spe | 0;

    if (spe >= 3)
        scare_dieroll = (scare_dieroll / (1 << ((spe / 3) | 0))) | 0;
    if (!gs_spec_dbon_applies)
        dieroll += 1;

    do_stun = (Math.max(spe, 0) < rn2(gs_spec_dbon_applies ? 11 : 7));

    let attack_indx = 0; /* MB_INDEX_PROBE */
    dmg += rnd(4);
    if (do_stun) {
        attack_indx = 1; /* STUN */
        dmg += rnd(4);
    }
    if (dieroll <= scare_dieroll) {
        attack_indx = 2; /* SCARE */
        dmg += rnd(4);
    }
    if (dieroll <= ((scare_dieroll / 2) | 0)) {
        attack_indx = 3; /* CANCEL */
        dmg += rnd(4);
    }

    const MB_VERB = [["probe", "stun", "scare", "cancel"],
                     ["prod", "amaze", "tickle", "purge"]];
    const verb = MB_VERB[_xk_hallu() ? 1 : 0][attack_indx];
    if (youattack || youdefend || vis) {
        result = true;
        await pline_The("magic-absorbing blade %s %s!",
                        vtense(null, verb), hittee);
        if (attack_indx === 0 && !canspotmon(mdef))
            map_invisible(mdef.mx, mdef.my);
    }

    switch (attack_indx) {
    case 3: { /* CANCEL */
        const old_mdat = youdefend ? game.youmonst.data : mdef.data;
        if (!await cancel_monst(youdefend ? game.youmonst : mdef, mb,
                                youattack, false, false)) {
            resisted = true;
        } else {
            do_stun = false;
            if (youdefend) {
                if (game.youmonst.data !== old_mdat)
                    dmg = 0; /* rehumanized, so no more damage */
                if ((u.uenmax | 0) > 0) {
                    u.uenmax--;
                    if ((u.uen | 0) > 0)
                        u.uen--;
                    game.disp && (game.disp.botl = true);
                    await You("lose magical energy!");
                }
            } else {
                if (mdef.data !== old_mdat)
                    hittee = mon_nam(mdef);
                if ((mdef.data?.pmidx | 0) === PM_CLAY_GOLEM_UH)
                    mdef.mhp = 1; /* cancelled clay golems will die */
                if (youattack && attacktype(mdef.data, AT_MAGC_UH)) {
                    u.uenmax++;
                    if (u.uenmax > u.uenpeak)
                        u.uenpeak = u.uenmax;
                    u.uen++;
                    game.disp && (game.disp.botl = true);
                    await You("absorb magical energy!");
                }
            }
        }
        break;
    }
    case 2: /* SCARE */
        if (youdefend) {
            if (Antimagic_uh()) {
                resisted = true;
            } else {
                nomul(-3);
                game.multi_reason = "being scared stiff";
                game.nomovemsg = "";
                if (magr && magr === u.ustuck && sticks(game.youmonst.data)) {
                    set_ustuck(null);
                    await You("release %s!", mon_nam(magr));
                }
            }
        } else {
            if (rn2(2) && await resist(mdef, WEAPON_CLASS_UH, 0, NOTELL_UH))
                resisted = true;
            else
                await monflee(mdef, 3, false, (mdef.mhp | 0) > dmg);
        }
        if (!resisted)
            do_stun = false;
        break;
    case 1: /* STUN */
        do_stun = true;
        break;
    case 0: /* PROBE */
        if (youattack && (spe === 0 || !rn2(3 * Math.abs(spe)))) {
            await pline_The("%s is insightful.", verb);
            if (mdef.minvent)
                throw new Error('not yet ported: probe_monster (zap.c:626) minvent arm');
            await mstatusline(mdef);
            await pline("%s is not carrying anything%s.", noit_Monnam(mdef),
                        engulfing_u(mdef) ? " besides you" : "");
        }
        break;
    }
    if (do_stun) {
        if (youdefend) {
            const ps = u.uprops[STUNNED] || (u.uprops[STUNNED] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
            make_stunned(((ps.intrinsic | 0) & TIMEOUT) + 3, false);
        } else
            mdef.mstun = 1;
        if (attack_indx === 1)
            do_stun = false;
    }
    do_confuse = !rn2(12);
    if (do_confuse) {
        if (youdefend) {
            const pc = u.uprops[CONFUSION] || (u.uprops[CONFUSION] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
            make_confused(((pc.intrinsic | 0) & TIMEOUT) + 4, false);
        } else
            mdef.mconf = 1;
    }

    const fakename = youdefend ? "You" : "Someone"; /* decl.c c_fakename */
    if (youattack || youdefend || vis) {
        hittee = upstart(hittee);
        if (resisted) {
            await pline("%s %s!", hittee, vtense(fakename, "resist"));
            shieldeff(youdefend ? u.ux : mdef.mx, youdefend ? u.uy : mdef.my);
        }
        if ((do_stun || do_confuse) && (game.flags?.verbose ?? true)) {
            let buf = '';
            if (do_stun)
                buf += "stunned";
            if (do_stun && do_confuse)
                buf += " and ";
            if (do_confuse)
                buf += "confused";
            await pline("%s %s %s%s", hittee, vtense(fakename, "are"), buf,
                        (do_stun && do_confuse) ? '!' : '.');
        }
    }
    return { dmg, result };
}
const PM_CLAY_GOLEM_UH = 256; /* pm.generated.js PM_CLAY_GOLEM */
const WEAPON_CLASS_UH = 2; /* objclass.h WEAPON_CLASS */
const NOTELL_UH = 0; /* const.js NOTELL */
/* C artifact.c:63 FATAL_DAMAGE_MODIFIER — enough to guarantee xkilled(). */
const FATAL_DAMAGE_MODIFIER_UH = 200;
/* C decl.c:17 c_color_names.c_black. */
const NH_BLACK_UH = 'black';
/* C artifact.c:1241 — "rolls above this aren't magical". */
const MB_MAX_DIEROLL_UH = 8;

export function hitval(weapon, mtmp, mndx) {
    if (!weapon) return 0;
    let tmp = 0;
    const otyp = (weapon.otyp | 0);
    const row = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    const mlet = row ? (row[0] | 0) : -1;
    /* Is_weapon: starting weapons here are all WEAPON_CLASS, so spe applies. */
    tmp += (weapon.spe | 0);
    tmp += (otyp === PICK_AXE_HITBON_UH || otyp === GRAPPLING_HOOK_HITBON_UH) ? 4
         : (otyp === UNICORN_HORN_HITBON_UH) ? 1
         : (otyp >= 0 && otyp < WEAPON_HITBON.length) ? (WEAPON_HITBON[otyp] | 0) : 0;
    /* C weapon.c:164-165 — blessed weapon vs undead or demon.
     * mon_hates_blessings(mon) = mon_hates_material(mon, ...)-style predicate
     * over the DEFENDER; js/ has no definition for it, so this term is a
     * KNOWN GAP (weapon.c:164).  Named rather than silently absent. */
    /* is_spear(weapon) && strchr(kebabable, ptr->mlet) */
    if (SPEAR_OTYPS.has(otyp)) {
        if (KEBABABLE_MLET.has(mlet)) tmp += 2;
    }
    /* C weapon.c:171-176 — trident vs swimmers.  TRIDENT is objects.h otyp 33;
     * is_swimmer(ptr) = mflags1 & M1_SWIM.  S_EEL is 22, S_SNAKE is 41
     * (monsym.h), the same numbering KEBABABLE_MLET above uses. */
    if (otyp === TRIDENT_UH && row && ((row[6] >>> 0) & M1_SWIM_UH) !== 0) {
        if (is_pool_uh(mtmp ? (mtmp.mx | 0) : (game.u?.ux | 0),
                       mtmp ? (mtmp.my | 0) : (game.u?.uy | 0)))
            tmp += 4;
        else if (mlet === S_EEL_UH || mlet === S_SNAKE_UH)
            tmp += 2;
    }
    /* C weapon.c:179-180 — picks vs xorns and earth elementals.
     * is_pick(otmp) = oc_skill == P_PICK_AXE; passes_walls = mflags1 & M1_WALLWALK;
     * thick_skinned = mflags1 & M1_THICK_HIDE. */
    if (PICK_OTYPS_UH.has(otyp) && row
        && ((row[6] >>> 0) & M1_WALLWALK_UH) !== 0
        && ((row[6] >>> 0) & M1_THICK_HIDE_UH) !== 0)
        tmp += 2;
    /* C weapon.c:183-184 */
    if (weapon.oartifact)
        tmp += spec_abon(weapon, mtmp, mndx);
    return tmp;
}
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
const TRIDENT_UH = 33;
/* The two oc_skill == P_PICK_AXE rows in objects.h. */
const PICK_OTYPS_UH = new Set([259, 71]);
const M1_SWIM_UH = 0x00000002;
const M1_THICK_HIDE_UH = 0x00200000;
const M1_WALLWALK_UH = 0x00000008;
/* monflag.h:105 M1_UNSOLID "has no solid or liquid body" — one of the two
 * predicates mhitm.c:597 failed_grab() reads (AD_STCK/AD_WRAP are declared
 * further down this file, AD_STCK at line ~5892 and AD_WRAP_UH at ~3375). */
const M1_UNSOLID_UH = 0x00100000;
/* monflag.h:102 M1_HUMANOID — mondata.h:65's humanoid(ptr), read by the
 * weaponless-attack shade check (uhitm.c:5640-5642). */
const M1_HUMANOID_UH = 0x00020000;
const S_SNAKE_UH = 45;
/* is_pool(x,y) is js/look.js's, already imported above as is_pool_uh; hitval's
 * caller passes mtmp === null for the hero, so the hero's square is used then. */
export function weapon_hit_bonus(weapon) {
    if (!weapon) {
        /* C weapon.c:1601-1607, read straight off the skill array rather than
         * off a hardcoded starting value:
         *   bonus = P_SKILL(type);
         *   bonus = max(bonus, P_UNSKILLED) - 1;
         *   bonus = ((bonus + 2) * (martial_bonus() ? 2 : 1)) / 2;
         * skill_init (js/skills.js, weapon.c:1784) is the writer. */
        const martial = _uh_martial_bonus(); /* skills.h:81 — Samurai or Monk */
        const pSkill = P_SKILL(P_BARE_HANDED_COMBAT);
        let bonus = Math.max(pSkill, P_UNSKILLED) - 1;
        bonus = ((bonus + 2) * (martial ? 2 : 1)) / 2 | 0;
        return bonus;
    }
    const _u = game.u || {};
    const wep_type = weapon_type(weapon);
    const type = (_u.twoweap && (weapon === _u.uwep || weapon === _u.uswapwep))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    let bonus = 0;
    if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        case P_SKILLED: bonus = 2; break;
        case P_EXPERT:  bonus = 3; break;
        case P_BASIC:   bonus = 0; break;
        default:        bonus = -4; break; /* P_ISRESTRICTED / P_UNSKILLED */
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        if (P_SKILL(wep_type) < skill)
            skill = P_SKILL(wep_type);
        switch (skill) {
        case P_SKILLED: bonus = -5; break;
        case P_EXPERT:  bonus = -3; break;
        case P_BASIC:   bonus = -7; break;
        default:        bonus = -9; break; /* P_ISRESTRICTED / P_UNSKILLED */
        }
    }
    /* C weapon.c:1665-1682 — "It's harder to hit while you are riding". */
    if (_u.usteed) {
        switch (P_SKILL(P_RIDING)) {
        case P_SKILLED:
        case P_EXPERT:  break;
        case P_BASIC:   bonus -= 1; break;
        default:        bonus -= 2; break;
        }
        if (_u.twoweap) bonus -= 2;
    }
    return bonus;
}

/* weapon_dam_bonus(weapon) — damage bonus from weapon skill and other factors.
 * C ref: weapon.c:1638-1725 */
export function weapon_dam_bonus(weapon) {
    if (!weapon) {
        /* C weapon.c:1696-1701, read straight off the skill array.  The old
         * `pSkill = isMonk ? P_BASIC : P_UNSKILLED` hardcode was wrong for the
         * SAMURAI: skill_init's "high potential fighters already know how to
         * use their hands" bump (weapon.c:1784) fires whenever
         * P_MAX_SKILL(P_BARE_HANDED_COMBAT) > P_EXPERT, and u_init.c Skill_S
         * carries { P_MARTIAL_ARTS, P_MASTER } — P_MARTIAL_ARTS IS
         * P_BARE_HANDED_COMBAT (skills.h:69) — so a Samurai starts at P_BASIC
         * too, for a C bonus of ((1+1)*3)/2 = 3, not the 1 this produced. */
        const martial = _uh_martial_bonus(); /* skills.h:81 — Samurai or Monk */
        const pSkill = P_SKILL(P_BARE_HANDED_COMBAT);
        let bonus = Math.max(pSkill, P_UNSKILLED) - 1;
        bonus = ((bonus + 1) * (martial ? 3 : 1)) / 2 | 0;
        return bonus;
    }
    const _u = game.u || {};
    const wep_type = weapon_type(weapon);
    const type = (_u.twoweap && (weapon === _u.uwep || weapon === _u.uswapwep))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    let bonus = 0;
    if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        case P_SKILLED: bonus = 1; break;
        case P_EXPERT:  bonus = 2; break;
        case P_BASIC:   bonus = 0; break;
        default:        bonus = -2; break; /* P_ISRESTRICTED / P_UNSKILLED */
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        if (P_SKILL(wep_type) < skill)
            skill = P_SKILL(wep_type);
        switch (skill) {
        case P_SKILLED: bonus = 0; break;
        case P_EXPERT:  bonus = 1; break;
        case P_BASIC:   bonus = -1; break;
        default:        bonus = -3; break; /* P_ISRESTRICTED / P_UNSKILLED */
        }
    }
    /* C weapon.c:1702-1714 — "Riding gives some thrusting damage". */
    if (_u.usteed && type !== P_TWO_WEAPON_COMBAT) {
        switch (P_SKILL(P_RIDING)) {
        case P_SKILLED: bonus += 1; break;
        case P_EXPERT:  bonus += 2; break;
        default:        break; /* P_ISRESTRICTED / P_UNSKILLED / P_BASIC */
        }
    }
    return bonus;
}

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
export function is_safemon(mtmp) {
    if (!mtmp)
        return false;
    const safe_dog = (game.flags?.safe_dog !== false);
    if (!safe_dog)
        return false;
    if (!mtmp.mpeaceful)
        return false;
    /* canspotmon — real implementation from display.js (display.h:129) */
    if (!canspotmon(mtmp))
        return false;
    const u = game.u;
    if ((u?.uprops?.[CONFUSION]?.intrinsic | 0)
        || (u?.uprops?.[STUNNED]?.intrinsic | 0)
        || _xk_hallu())
        return false;
    return true;
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
    return !(game.u && game.u.usteed) && is_pole(otmp) && !sr_is_art(otmp, 19 /* ART_SNICKERSNEE, artilist.h */);
}
function _uh_hmon_hitmon_weapon_ranged(obj, mon) {
    const isShade = (mon?.data?.pmidx | 0) === PM_SHADE;
    let dmg = (isShade && !shade_glare(obj)) ? 0 : rnd(2);
    const material = MKOBJ_OC_MATERIAL[(obj?.otyp | 0)] | 0;
    if (material === 14 /* objclass.h SILVER */ && mon_hates_silver(mon))
        dmg += rnd(dmg ? 20 : 10);
    return dmg;
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
            /* C: seemimic(mtmp); return FALSE — unported (see header). */
            return false;
        }
        if (!sensemon(mtmp) && !_ac_detect_monsters()) {
            if (Blind || is_pool_uh(mtmp.mx | 0, mtmp.my | 0))
                void pline("Wait!  There's a hidden monster there!");
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
function _ac_is_art(o, art) { return !!(o && (o.oartifact | 0) === art); }
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
    if (!OC_NAME[glyphotyp])
        throw new Error(`object_from_map: no OBJ_NAME for otyp ${glyphotyp} `
                        + `(C mkobj(oc_class, FALSE) fallback is unported)`);
    const otmp = await mksobj(glyphotyp, false, false);
    /* C pager.c:329-330 — mksobj(init=FALSE) still starts corpse-rot / egg-hatch
     * / figurine timers; obj_stop_timers cancels them.  RNG-free, and no timed
     * otyp is reachable through a mimic disguise. */
    if (otmp.timed)
        void otmp.timed;
    /* C pager.c:335-338 — coins pluralize, slime mold takes current_fruit. */
    if ((otmp.oclass | 0) === _AC_COIN_CLASS)
        otmp.quan = 2;
    otmp.where = 3;
    otmp.ox = mtmp.mx | 0;
    otmp.oy = mtmp.my | 0;
    return otmp;
}

const _MIM_REVEAL = 1;      /* C hack.h:1185 */
const _MIM_OMIT_WAIT = 2;   /* C hack.h:1186 */
async function that_is_a_mimic(mtmp, mimic_flags) {
    const generic = 'a monster';
    let fmtbuf = "Wait!  That's %s!";
    let what = null;
    const reveal_it = (mimic_flags & _MIM_REVEAL) !== 0;
    const omit_wait = (mimic_flags & _MIM_OMIT_WAIT) !== 0;
    const apt = (mtmp.m_ap_type | 0) & M_AP_TYPMASK;

    if (_ac_blind()) {
        /* C uhitm.c:6211-6216 — Blind_telepat has no js/ reader; without it C
         * takes the `what = generic` branch. */
        what = generic;
    } else {
        if (apt === M_AP_OBJECT) {
            /* C uhitm.c:6232-6244 — glyph_is_object(glyph). */
            const glyphotyp = mtmp.mappearance | 0;
            const otmp = await _mimic_object_from_map(mtmp, glyphotyp);
            const otmp_name = (otmp && (otmp.otyp | 0) !== 0 /* STRANGE_OBJECT */)
                ? simpleonames(otmp) : 'strange object';
            fmtbuf = `${_ac_is_plural(otmp) ? 'Those' : 'That'} ${otmp_name} `
                   + `${otmp ? otense(otmp, 'are') : 'is'} %s!`;
            /* C uhitm.c:6240-6243 — the fake object is freed here; JS is
             * garbage-collected, so dropping the reference is the whole of it. */
        }
        /* C uhitm.c:6254-6268 — who the mimic actually is. */
        if ((mtmp.minvis | 0) && !_ac_see_invisible())
            what = generic;
        else if (apt === M_AP_MONSTER)
            what = x_monnam(mtmp, ARTICLE_A, null, EXACT_NAME, true);
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
        void pline(fmtbuf.slice(i).replace('%s', what));
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
    if (!canspotmon(mtmp) && !glyph_is_invisible_at(mtmp.mx | 0, mtmp.my | 0))
        map_invisible(mtmp.mx | 0, mtmp.my | 0);
}

/* C do_name.c:1152-1156 a_monnam(mtmp). */
function _ac_a_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null,
                    has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
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

async function missum(mdef, wouldhavehit) {
    if (wouldhavehit)
        pline('Your armor is rather cumbersome...');
    if (canspotmon(mdef) && (game.flags?.verbose ?? true))
        pline('You miss ' + mon_nam(mdef) + '.');
    else
        pline('You miss it.');
    /* C uhitm.c:5212-5213 `if (!helpless(mdef)) wakeup(mdef, TRUE);` */
    if (!((mdef.msleeping | 0) || !(mdef.mcanmove | 0)))
        await wakeup_attack(mdef, true);
}

/* C hack.c:3035 overexert_hp: use the current form's HP; otherwise interrupt
 * occupation and sleep. Melee, kicking, and turn upkeep share this body. */
export async function overexert_hp() {
    const _oeU = game.u || {};
    const _polyd = Upolyd(_oeU);
    const _hpKey = _polyd ? 'mh' : 'uhp';
    const _hpVal = (_oeU[_hpKey] | 0);
    if (_hpVal > 1) {
        _oeU[_hpKey] = _hpVal - 1;
        (game.disp ||= {}).botl = 1;
    }
    else {
        /* C hack.c:3043-3045: message, exercise, then the canonical timeout
         * helper.  The helper awaits stop_occupation(), which is synchronous
         * in C but can complete an async meal in this port. */
        pline('You pass out from exertion!');
        exercise(A_CON, false);
        await fall_asleep_real(-10, false);
    }
}

/* C hack.c:3051 overexertion: hunger precedes encumbrance damage, and the
 * live multi countdown determines whether combat must stop. */
export async function overexertion() {
    await gethungry(); /* fires rn2(20) inside gethungry [eat.c:3191] */
    if (((game.moves | 0) % 3) !== 0 && near_capacity() >= HVY_ENCUMBER) {
        await overexert_hp();
    }
    return (game.multi | 0) < 0;
}

/* C uhitm.c:5247-5421 mhitm_knockback, hero-attacker/monster-defender arm.
 * The old melee path spent only the two prologue rolls, so a successful
 * knockback never named, moved, or stunned its target.  Keep the effect here
 * beside its hmon_hitmon caller; cmd.js owns the shared dothrow.c mhurtle. */
async function _hero_mhitm_knockback(mdef, wep) {
    const u = game.u || {};
    const knockdistance = rn2(3) ? 1 : 2;
    /* ART_OGRESMASHER is not currently represented by this melee subset;
     * every ordinary weapon uses C's default one-in-six chance. */
    if (rn2(6))
        return false;

    const youdata = game.youmonst?.data || {};
    /* This caller is hmon_hitmon's armed hand-to-hand path, hence AT_WEAP /
     * AD_PHYS.  C next rejects attackers which also grab or engulf. */
    if (attacktype(youdata, 11 /* AT_ENGL */)
        || attacktype(youdata, 7 /* AT_HUGS */) || sticks(youdata))
        return false;

    const defx = mdef.mx | 0, defy = mdef.my | 0;
    const dx = defx > (u.ux | 0) ? 1 : (defx < (u.ux | 0) ? -1 : 0);
    const dy = defy > (u.uy | 0) ? 1 : (defy < (u.uy | 0) ? -1 : 0);
    if (!isok(defx + dx, defy + dy) || (mdef.mhp | 0) <= 0)
        return false;

    const heroMsize = (youdata.msize != null)
        ? (youdata.msize | 0)
        : (MONS_MSIZE[(u.umonnum ?? game.youmonst?.mnum ?? -1) | 0] | 0);
    const defMsize = (mdef.data?.msize != null)
        ? (mdef.data.msize | 0)
        : (MONS_MSIZE[(mdef.mnum ?? mdef.mndx ?? -1) | 0] | 0);
    if (!(heroMsize > defMsize + 1)
        || ((youdata.mflags1 | 0) & M1_UNSOLID_UH))
        return false;

    /* obj.h is_flimsy()/is_blunt_weapon().  The weapon block's WHACK rows
     * are otyp 69..81 as listed below; pick-axe and grappling hook are the
     * two blunt WEPTOOL rows. */
    const otyp = wep?.otyp | 0;
    const blunt = (otyp >= 69 && otyp <= 81 && otyp !== 72)
        || otyp === 259 || otyp === 260;
    if (!wep || sr_oc_material(otyp) <= 7 /* LEATHER */
        || otyp === 78 /* RUBBER_HOSE */ || !blunt)
        return false;

    const knockedhow = will_hurtle(mdef, defx + dx, defy + dy)
        ? 'backward' : 'back';
    if (canseemon(mdef)) {
        await pline(`You knock ${y_monnam(mdef)} ${knockedhow} with a ${
            rn2(2) ? 'forceful' : 'powerful'} ${rn2(2) ? 'blow' : 'strike'}!`);
    } else {
        await You_feel_uh(`${some_mon_nam(mdef)} be knocked ${knockedhow}!`);
    }

    if (u.ustuck)
        unstuck(u.ustuck);
    await mhurtle(mdef, dx, dy, knockdistance);
    if ((mdef.mhp | 0) > 0 && !rn2(4))
        mdef.mstun = 1;
    return true;
}

/* hitum_cleave's `static boolean clockwise` (uhitm.c:659) */
let _cleave_clockwise = false;

export async function do_attack(mtmpOrX, y) {
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
        /* Punished = u.uchain != null (ball-and-chain) */
        const punished = !!(game.u?.uchain);
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
    _ensure_role_weapons_uhitm(game.u);

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
    if (await attack_checks(mtmp, game.u?.uwep ?? null))
        return true;

    /* Step 2: check_capacity() — returns FALSE for UNENCUMBERED heroes.
     * No RNG. Skip. */

    /* Step 3: overexertion() [hack.c:3051-3061] — "combat increases
     * metabolism".  Extracted above (this file's other export, `overexertion`)
     * so apply.c's other caller (use_pole's monster-hit arm, js/cmd.js) can
     * reuse the identical sequence instead of re-deriving it. */
    if (await overexertion()) {
        /* hero passed out from overexertion; goto atk_done, return TRUE */
        return true;
    }


    if (game.unweapon) {
        game.unweapon = false;
        if (game.flags?.verbose ?? true) {
            if (game.u?.uwep) {
                void pline(`You begin bashing monsters with ${yname(game.u.uwep)}.`);
            } else if (!_uh_cantwield(game.youmonst?.data)) {
                /* C: You("begin %s monsters with your %s %s.",
                 *        ing_suffix(Role_if(PM_MONK) ? "strike" : "bash"),
                 *        uarmg ? "gloved" : "bare",
                 *        makeplural(body_part(HAND))); */
                const verb = _uh_role_is_monk() ? 'striking' : 'bashing';
                const glove = game.u?.uarmg ? 'gloved' : 'bare';
                void pline(`You begin ${verb} monsters with your ${glove} ${makeplural(body_part(HAND_UH))}.`);
            }
        }
    }

    /* Step 4: exercise(A_STR, TRUE) [uhitm.c:552] */
    exercise(A_STR, true);

    /* Step 5: C uhitm.c:554 u_wipe_engr(3). */
    if (can_reach_floor(true))
        wipe_engr_at(game.u?.ux | 0, game.u?.uy | 0, 3, false);

    /* Step 6: hitum() — find_roll_to_hit (pure arithmetic) + rnd(20) + ... */
    const u = game.u;

    check_caitiff(mtmp);

    let mndx = 0, _tmpBase = 0, _armorpenalty = 0;
    /* find_roll_to_hit's target-dependent terms; re-run per target by
     * hitum_cleave (uhitm.c:703) */
    const _find_roll_to_hit = () => {
    _armorpenalty = 0; /* C uhitm.c:374 *role_roll_penalty = 0 */
    mndx = (mtmp.mndx ?? mtmp.mnum) | 0;
    const monAC = find_mac_full_uh(mtmp);
    const abon_val = abon();
    /* luck bonus: sgn(Luck) * ((abs(Luck)+2)/3) — C ref: uhitm.c:378 */
    const luck = (u && u.uluck) ? (u.uluck | 0) : 0;
    const luckBonus = (luck > 0 ? 1 : luck < 0 ? -1 : 0) * (((luck < 0 ? -luck : luck) + 2) / 3 | 0);
    const ulevel = Upolyd(u)
        ? (((u.umonnum | 0) >= 0 && (u.umonnum | 0) < _MONS.length)
            ? (_MONS[u.umonnum | 0][1] | 0) : 0)
        : ((u && u.ulevel) ? (u.ulevel | 0) : 1);
    /* tmp = 1 + abon() + find_mac(mtmp) + u.uhitinc + luck + maybe_polyd(...) */
    let tmp = 1 + abon_val + monAC + ((u && u.uhitinc) ? (u.uhitinc | 0) : 0) + luckBonus + ulevel;
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
            tmp += ((ulevel / 3) | 0) + 2;
        }
    }
    const _encumbrance = near_capacity();
    if (_encumbrance !== 0)
        tmp -= (_encumbrance * 2) - 1;
    if (u && u.utrap)
        tmp -= 3;
    _tmpBase = tmp;
    };
    _find_roll_to_hit();

    let malive = true; /* monster still alive after this attack */

    const _swing = async (weapon, second, viaHmonas, cleaving) => {
    let tmp = _tmpBase;
    const uwepForHit = weapon;
    if (uwepForHit)
        tmp += hitval(uwepForHit, mtmp, mndx);
    tmp += weapon_hit_bonus(uwepForHit);

    mon_maybe_unparalyze(mtmp);
    /* hitum() rnd(20) dieroll [uhitm.c:781 / uhitm.c:804] */
    const dieroll = rnd(20);
    const mhit = (tmp > dieroll) || !!(u && u.uswallow); /* uswallow = always hits */

    /* C uhitm.c:602-606 known_hitum — Stormbringer's override announces itself */
    if (game.go?.override_confirmation && (game.flags?.verbose ?? true))
        await pline('Your bloodthirsty blade attacks!');

    /* C uhitm.c:610 missum(mon, uattk, (rollneeded + armorpenalty > dieroll)) */
    if (!mhit)
        await missum(mtmp, tmp + _armorpenalty > dieroll);
    if (mhit) {
        if (!second && !cleaving && tmp > dieroll) exercise(A_DEX, true);

        if (weapon && ((weapon.oclass | 0) === WEAPON_CLASS || is_weptool(weapon))) {
            const uc = (u.uconduct ||= {});
            uc.weaphit = (uc.weaphit | 0) + 1;
        }

        /* dmgval: hmon → hmon_hitmon → dmgval [weapon.c:216-295].
         * Bare-handed: hmon_hitmon_barehands, rnd(2)/rnd(4) [uhitm.c:848].
         * Armed: the real dmgval(obj, mon) below, which derives bigmonst
         * from mon.data internally (weapon.c:224). */
        const uwep = weapon; /* C: known_hitum(mon, <this swing's weapon>, ...) */
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
        if (!uwep) {
            /* hmon_hitmon_barehands [uhitm.c:848]:
             *   hmd->dmg = rnd(!martial_bonus() ? 2 : 4);
             * martial_bonus() = Role_if(PM_SAMURAI) || Role_if(PM_MONK)
             * (skills.h:81) — for the Monk this is TRUE regardless of monster
             * size, so the damage die is rnd(4), NOT the dmgval small/large
             * (rnd(2)/rnd(4)) split used for weapons.  For non-martial heroes
             * martial_bonus() is false → rnd(2). */
            const martial = _uh_martial_bonus();
            dmg = rnd(martial ? 4 : 2);
            /* the bare-handed weapon-skill bonus is weapon_dam_bonus(NULL);
             * it is added below, through the same single call C makes from
             * hmon_hitmon_dmg_recalc for BOTH the armed and unarmed cases. */
        } else {
            if (isRangedMelee) {
                dmg = _uh_hmon_hitmon_weapon_ranged(uwep, mtmp);
            } else if (isWeaponClassHit) {
                dmg = dmgval(uwep, mtmp);
            } else {
                dmg = _uh_misc_obj_dmg(uwep, mtmp);
            }
        }

        const _backstabData = mtmp?.data;
        const _backstabMlet = _backstabData?.mlet | 0;
        const _backstabbable = !!_backstabData
            && (((_backstabData.mflags1 | 0) & 0x00000004) === 0) /* !amorphous */
            && _backstabMlet !== 22  /* !is_whirly: S_VORTEX */
            && (_backstabData.pmidx | 0) !== 154 /* PM_AIR_ELEMENTAL */
            && _backstabMlet !== 54  /* !noncorporeal: S_GHOST */
            && _backstabMlet !== 2   /* S_BLOB */
            && _backstabMlet !== 5   /* S_EYE */
            && _backstabMlet !== 32  /* S_FUNGUS */
            && canseemon(mtmp)
            && (!!mtmp.mflee || helpless(mtmp));
        if ((game.flags?.initrole | 0) === 7 /* Rogue */
            && !Upolyd(u)
            && isWeaponClassHit && !isRangedMelee
            && dmg > 1
            && mtmp !== u.ustuck
            && !u.twoweap
            && (uwep?.oartifact | 0) !== 4 /* ART_CLEAVER */
            && _backstabbable) {
            You(`strike ${mon_nam(mtmp)} from behind!`);
            dmg += rnd(Math.max(1, u.ulevel | 0));
        }

        let dbon_val = 0;
        if (!Upolyd(u)) {
            const str2 = acurr(u, A_STR);
            if (str2 < 6) dbon_val = -1;
            else if (str2 < 16) dbon_val = 0;
            else if (str2 < 18) dbon_val = 1;
            else if (str2 === 18) dbon_val = 2;
            else if (str2 <= 93) dbon_val = 3;   /* <= STR18(75) */
            else if (str2 <= 108) dbon_val = 4;  /* <= STR18(90) */
            else if (str2 < 118) dbon_val = 5;   /* < STR18(100) */
            else dbon_val = 6;
        }
        const _twohitsDmg = second || (!viaHmonas && uwep && u.twoweap);
        if (dbon_val !== 0) {
            const _abs = Math.abs(dbon_val);
            if (_twohitsDmg)
                dbon_val = Math.trunc((3 * _abs + 2) / 4) * Math.sign(dbon_val);
            else if (uwep && bimanual(uwep))
                dbon_val = Math.trunc((3 * _abs + 1) / 2) * Math.sign(dbon_val);
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
         * NOT PORTED, and deliberately: C's PM_SHADE arm (uhitm.c:842-843) sets
         * dmg = 0 and leaves train_weapon_skill FALSE, and the jousting arm
         * (:1044-1046) forces it TRUE.  Neither is modelled in this body --
         * there is no shade branch here at all, and the comment ~110 lines
         * below records that jousting is unmodelled -- so both are left alone
         * rather than half-wired. */
        /* C uhitm.c:936/850 set use_weapon_skill TRUE only on the weapon-melee
         * and bare-handed arms; hmon_hitmon_misc_obj never touches the flag,
         * so it stays FALSE (struct init) for a misc-object hit — no skill
         * bonus, no skill training, and (since artifact_hit is only called
         * from hmon_hitmon_weapon_melee, uhitm.c:1015) no artifact_hit either. */
        /* hmon_hitmon_weapon_ranged (uhitm.c:885-909) is the same kind of gap
         * as misc_obj above: it never sets use_weapon_skill and never calls
         * artifact_hit -- both are exclusive to hmon_hitmon_weapon_melee. */
        const useWeaponSkillHit = !uwep || (isWeaponClassHit && !isRangedMelee);
        const trainWeaponSkill = useWeaponSkillHit && dmgvalResult > 1;
        let artiHittxt = false;
        if (uwep && isWeaponClassHit && !isRangedMelee && (uwep.oartifact | 0)) {
            const ah = await artifact_hit(null /* &gy.youmonst */, mtmp, uwep,
                                          dmgvalResult, dieroll, mndx);
            dmgvalResult = ah.dmg;
            if (ah.special)
                artiHittxt = true;
        }

        /* C uhitm.c:1485-1500 hmon_hitmon_dmg_recalc:
         *     if (hmd->use_weapon_skill) dmgbonus += weapon_dam_bonus(skillwep);
         * use_weapon_skill is TRUE for both a hand-to-hand ordinary weapon
         * (uhitm.c:936) and a bare-handed attack (uhitm.c:850), so ONE call
         * covers both — the bare-handed half used to be inlined here and the
         * armed half was simply missing.
         *
         * hmon_hitmon: dmg < 1 is clamped to 1 (get_dmg_bonus && !shade) at
         * uhitm.c:1813-1818.  dbon()/weapon_dam_bonus consume no RNG. */
        const skillDmgBonus = useWeaponSkillHit ? weapon_dam_bonus(uwep || null) : 0;
        if (trainWeaponSkill)
            await use_skill(uwep_skill_type(), 1);
        const totalDmg = Math.max(1, dmgvalResult + (u.udaminc | 0)
            + dbon_val + skillDmgBonus);

        const heroUnarmed = !uwep && !(u && u.uarm) && !(u && u.uarms);
        if (heroUnarmed && totalDmg > 1 && !Upolyd(u)) {
            rnd(100); /* stagger stun check — RNG consumed, stun unmodelled */
        }

        if (weapon && totalDmg > 0 && ((u.uconduct?.weaphit | 0) <= 1))
            first_weapon_hit(weapon);

        /* kill check: monster dies if total damage >= current HP */
        const curHp = (mtmp.mhp | 0);
        const _hmon_destroyed = (curHp > 0 && totalDmg >= curHp);
        if ((mtmp.mtame | 0) && totalDmg > 0) {
            abuse_dog(mtmp);
            if ((mtmp.mtame | 0) && !_hmon_destroyed)
                await monflee(mtmp, 10 * rnd(totalDmg), false, false);
        }
        if (curHp > 0 && totalDmg >= curHp) {
            /* monster killed */
            malive = false;
            mtmp.mhp = 0;

            /* hmon_hitmon_msg_hit fires ONLY if !destroyed [uhitm.c:1643-1661].
             * When hero kills the monster, destroyed=TRUE so generic hit msg
             * is suppressed; xkilled emits "You kill ..." instead.
             *
             * Shared kill sequence: xkilled(mtmp, XKILL_GIVEMSG) [mon.c:3464].
             * It runs the message, rn2(6) treasure, corpse_chance, peaceful/tame
             * luck rn2(2), experience, m_detach+newsym, newexplevel — the exact
             * RNG order the ray path (zap.js zhitm) also needs.  For an ordinary
             * hostile melee target (mtame=0, mpeaceful=0) the message uses
             * mon_nam and the luck rn2(2) does not fire — bit-identical to the
             * previous inlined sequence. */
            await xkilled(mtmp, XKILL_GIVEMSG);
        } else {
            mtmp.mhp = Math.max(0, curHp - totalDmg);

            if (artiHittxt) {
                /* C uhitm.c:1643 — hmon_hitmon_msg_hit is guarded by
                 * `!hmd->hittxt`; artifact_hit() set it by printing its own. */
            } else if (!(game.flags?.verbose ?? true)) {
                pline('You hit it.');
            } else {
                pline('You ' + _hmon_hit_verb(u && u.uwep) + ' ' + mon_nam(mtmp)
                      + (canseemon(mtmp) ? exclam(totalDmg) : '.'));
            }

            await wakeup_attack(mtmp, true);

            /* mhitm_knockback [uhitm.c:5248-5430] — called from hmon_hitmon when
             * maybe_knockback=TRUE. Conditions for maybe_knockback (uhitm.c:1832):
             *   !unarmed && dmg>1 && !thrown && !Upolyd && !twoweap && uwep.
             * Two RNG calls always fire at top of mhitm_knockback before further
             * conditions are checked (uhitm.c:5259, 5270):
             *   rn2(3) — knockdistance (1 or 2 steps)
             *   rn2(chance) — chance check; chance=6 normally (2 for OGRESMASHER)
             * C ref: uhitm.c:5248-5270. */
            const maybeKnockback = (uwep && totalDmg > 1 && !Upolyd(u) && !u.twoweap);
            if (maybeKnockback) {
                await _hero_mhitm_knockback(mtmp, uwep);
            }

            /* known_hitum monflee check — C ref: nethack-c/src/uhitm.c:625-634:
             *   if (!rn2(25) && mon->mhp < mon->mhpmax / 2
             *       && !engulfing_u(mon)) {
             *       monflee(mon, !rn2(3) ? rnd(100) : 0, FALSE, TRUE);
             *       if (u.ustuck == mon && !u.uswallow
             *           && !sticks(gy.youmonst.data))
             *           set_ustuck((struct monst *) 0);
             *   }
             *
             * C's `&&` short-circuits: when rn2(25) != 0, OR when the monster
             * is still at half HP or better, NO further RNG is drawn.  This
             * block used to draw rn2(3) (and, 1 time in 3, rnd(100)) on EVERY
             * rn2(25)==0 regardless of HP.  Its own comment claimed "We check
             * mhp < mhpmax/2 too to mirror C" — the test was simply absent, so
             * the comment described code that was not there.  That is 1-2
             * surplus draws on ~4% of surviving melee hits: an RNG-sequence
             * divergence (Cardinal Rule 2), not a cosmetic one.
             *
             * mhp here is post-damage (assigned above, mirroring C's read
             * after hmon()).  mhpmax/2 is C integer division -> Math.trunc.
             * engulfing_u(mon) is mon.h:  (u.ustuck == mon && u.uswallow);
             * pointer identity is carried by m_id (see the same substitution in
             * js/mhitm.js xm_same_monst).
             * fleemsg is TRUE in C, so monflee may emit "<Monster> turns to
             * flee." — that pline was previously missing entirely. */
            const _kh_engulfing_u = !!(u && u.uswallow && u.ustuck
                && ((u.ustuck.m_id | 0) === (mtmp.m_id | 0)));
            if (!rn2(25) && (mtmp.mhp | 0) < Math.trunc((mtmp.mhpmax | 0) / 2)
                && !_kh_engulfing_u) {
                /* C: !rn2(3) ? rnd(100) : 0 — the fleetime argument. */
                await monflee(mtmp, !rn2(3) ? rnd(100) : 0, false, true);
                /* C uhitm.c:631-633 */
                if (u && u.ustuck && ((u.ustuck.m_id | 0) === (mtmp.m_id | 0))
                    && !u.uswallow
                    && !sticks(game.youmonst ? game.youmonst.data : null))
                    set_ustuck(null);
            }
        }
    }

    if (!viaHmonas && (!second || mhit)) {
        await passive_uh(mtmp, weapon, mhit, malive, 254 /* AT_WEAP, uhitm.c aatyp enum */, false);
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
     *   AT_HUGS/AT_MAGC/AT_BREA/AT_SPIT/AT_GAZE/AT_NONE/AT_BOOM -> NAMED GAP,
     *   see the per-branch comments below for exactly what each skips.
     * `attknum`/`armorpenalty` (find_roll_to_hit's silver/shop-item checks)
     * and could_seduce/special_dmgval/failed_grab/silver_sears/mhitm_adtyping
     * are also NAMED GAPS: this covers the RNG-consuming entry of each
     * handler, not its full message/effect body. */
    const _hmonas = async () => {
        const AT_CLAW_H = 1, AT_KICK_H = 3, AT_SPIT_H = 10, AT_ENGL_H = 11,
              AT_BREA_H = 12, AT_EXPL_H = 13, AT_GAZE_H = 15,
              AT_HUGS_H = 7, AT_WEAP_H = 254, AT_MAGC_H = 255;
        const pmndx = (u && u.umonnum) | 0;
        const rows = MONS_MATTK[pmndx] || [];
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
                /* uhitm.c:4855-4867 — the three message arms, ported: a tame,
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
                 * no message and no second kill.  NAMED GAP: `mattk->aatyp ==
                 * AT_WEAP || AT_CLAW` -> troll_baned()'s
                 * gm.mkcorpstat_norevive is not ported (corpse-revival only,
                 * no message/RNG effect on this path). */
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
                return M_ATTK_DEF_DIED; /* C uhitm.c:4881 */
            }
            return M_ATTK_HIT; /* C uhitm.c:4883 */
        };
        const _passiveAndKnockback = async (aatypRow, mhitRow, weaponRow) => {
            const diedThisRow = DEADMONSTER(mtmp);
            /* C uhitm.c:5828-5834:
             *     if (sum[i] == M_ATTK_DEF_DIED)
             *         passive(mon, weapon, 1, 0, mattk->aatyp, FALSE);
             *     else
             *         passive(mon, weapon, (sum[i] != M_ATTK_MISS), 1,
             *                 mattk->aatyp, FALSE); */
            await passive_uh(mtmp, weaponRow || null,
                       diedThisRow ? true : !!mhitRow,
                       !diedThisRow, aatypRow | 0, false);
            rn2(3);   /* mhitm_knockback knockdistance: uhitm.c:5258 */
            rn2(6);   /* mhitm_knockback chance check: uhitm.c:5269 */
        };
        let weapon_used = false;
        for (let i = 0; i < NATTK_UH; i++) {
            /* uhitm.c:5455-5458 — after the first attack, skip if the target
             * has been knocked out of range or already died. */
            if (i > 0) {
                const _bp = game.gb?.bhitpos;
                if (m_at(_bp?.x | 0, _bp?.y | 0) !== mtmp || DEADMONSTER(mtmp))
                    continue;
            }
            const row = rows[i] || { aatyp: 0, adtyp: 0, damn: 0, damd: 0 };
            const aatyp = row.aatyp | 0;
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
                 * NAMED GAP: the AD_* switch, u.mh=-1 and rehumanize() are
                 * not ported (rehumanize() is already a no-op stub above),
                 * and so is the You("explode!") topline.
                 * explum() RETURNS M_ATTK_DEF_DIED at uhitm.c:4920 (the
                 * AD_COLD/AD_FIRE/AD_ELEC arm, when the named target died in
                 * explode()) and M_ATTK_HIT at uhitm.c:4927 on EVERY other
                 * path — including AD_BLND, AD_HALU, the default arm, and an
                 * explode() the target survived.  It never returns
                 * M_ATTK_MISS, so this row's sum[i] is never the loop-top
                 * default and passive()'s mhitb argument here is never FALSE.
                 * This call site passed a hardcoded `false` for it.
                 * explode() is a named gap in this port, so the DEF_DIED arm
                 * is unreachable here and M_ATTK_HIT is what C returns on
                 * every path this port models.
                 * The wakeup(mon, TRUE) at uhitm.c:5764 was absent; it runs
                 * BEFORE explum()'s die, so it has to go first.  wakeup()
                 * (mon.c:4332-4363) is RNG-free for an already-awake hostile
                 * target: its draws are growl()'s hallucination ROLL_FROM
                 * rn2(35) (sounds.c:365, and only when the target WAS
                 * sleeping), and setmangry()'s Elbereth-hypocrite rnd(5) plus
                 * the peaceful-target growl() (mon.c:4290-4318). */
                await wakeup_attack(mtmp, true); /* C uhitm.c:5764 */
                d(row.damn | 0, row.damd | 0);
                const _sumIExpl = M_ATTK_HIT; /* C uhitm.c:4927 */
                await _passiveAndKnockback(aatyp, _sumIExpl !== M_ATTK_MISS, null);
                continue;
            }
            if (aatyp === AT_ENGL_H) {
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
                /* uhitm.c:5779 `} else if (failed_grab(&gy.youmonst, mon,
                 * mattk)) { ; }` — gulpum() is skipped, with NO further RNG
                 * draw (failed_grab itself is a pure predicate: mhitm.c:597
                 * `(unsolid(mdef->data) || gn.notonhead) && (aatyp==AT_HUGS
                 * || adtyp==AD_WRAP || adtyp==AD_STCK || adtyp==AD_DGST)`;
                 * this call site's own aatyp is always AT_ENGL, never
                 * AT_HUGS, so the first disjunct of the second clause never
                 * applies here).  This was previously an unconditional
                 * "gulpum() always runs on a hit" (the header comment's
                 * "NAMED GAP: shade / failed_grab checks skipped"), which
                 * drew gulpum's die for e.g. an unsolid target (ghost,
                 * vortex, light) or a worm-tail hit where C prints "passes
                 * right through"/"fails to hold" and draws nothing.
                 * sum[i] stays at its loop-top M_ATTK_MISS default on the
                 * shade arm, on this failed_grab arm, and on the `else`
                 * (missum) arm — but NOT on the row as a whole: C assigns it
                 * in the gulpum branch, uhitm.c:5782
                 * `sum[i] = gulpum(mon, mattk)`.  This paragraph used to say
                 * "C never assigns it", which is false, and the call site
                 * below contradicted even that by passing the landed-hit
                 * condition.  `_sumIEngl` now mirrors C's sum[i] directly. */
                const _englAdtyp = row.adtyp | 0;
                const _englUnsolid = !!(mtmp.data
                    && ((mtmp.data.mflags1 | 0) & M1_UNSOLID_UH));
                const _englNotonhead = !!(game.gn && game.gn.notonhead);
                const _grabFailed = dhit && (_englUnsolid || _englNotonhead)
                    && (_englAdtyp === AD_WRAP_UH || _englAdtyp === AD_STCK
                        || _englAdtyp === 26 /* AD_DGST */);
                /* C uhitm.c:5424 `int sum[NATTK]` / 5462 `sum[i] = 0`
                 * (M_ATTK_MISS).  gulpum() [uhitm.c:4957-5195] returns:
                 *   M_ATTK_MISS     4981  !engulf_target()      — NAMED GAP
                 *   M_ATTK_HIT      5007  vampshifter reverts   — NAMED GAP
                 *   M_ATTK_MISS     5044  Rider, hero lifesaved — NAMED GAP
                 *   M_ATTK_DEF_DIED 5106  the AD_DGST digest tail
                 *   M_ATTK_DEF_DIED 5185  non-digest kill, defender not lifesaved
                 *   M_ATTK_MISS     5194  defender survived and was expelled
                 * Note the LAST row: an engulf that HITS, damages, and does
                 * not kill still returns M_ATTK_MISS, so passive()'s mhitb is
                 * FALSE on the commonest path of all.  This call site used to
                 * pass the landed-hit condition, which is TRUE there. */
                let _sumIEngl = M_ATTK_MISS;
                if (dhit && !_grabFailed) {
                    /* NAMED GAP: shade check skipped.
                     * gulpum(mon, mattk) [uhitm.c:4958-4962] — its own first
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
                    if (adtyp === 26 /* AD_DGST */) {
                        /* NAMED GAP: the whole digest-and-kill sequence
                         * (petrification, lifesave, corpse/nutrition math,
                         * the Finish_digestion timer) is not ported — that
                         * arm's xkilled call is XKILL_NOCORPSE, so it draws
                         * no further RNG here (mon.c:3510-3573 `goto
                         * cleanup` before the treasure-drop rn2(6)).
                         * C returns M_ATTK_DEF_DIED at uhitm.c:5106 on this
                         * arm whether or not the defender was lifesaved; the
                         * two exits that do NOT (Slow_digestion breaks out of
                         * the switch at 5049 and falls to 5194's
                         * M_ATTK_MISS, is_rider returns M_ATTK_MISS at 5044)
                         * are part of the same named gap. */
                        _sumIEngl = M_ATTK_DEF_DIED; /* C uhitm.c:5106 */
                    } else {
                        if (adtyp === 6 /* AD_ELEC */ || adtyp === 3 /* AD_COLD */
                            || adtyp === 2 /* AD_FIRE */) {
                            if (!rn2(2))
                                dam = 0;
                        } else if (adtyp === 16 /* AD_DREN */) {
                            /* xdrainenergym omitted — NAMED GAP */
                            rn2(4);
                            dam = 0;
                        } else if (adtyp === 11 /* AD_BLND */) {
                            dam = 0; /* no RNG on this arm */
                        }
                        mtmp.mhp = (mtmp.mhp | 0) - dam;
                        if (DEADMONSTER(mtmp)) {
                            await xkilled(mtmp, XKILL_GIVEMSG);
                            /* C uhitm.c:5184-5185 — the kill only counts as
                             * M_ATTK_DEF_DIED if the defender was NOT
                             * lifesaved; otherwise C falls through to the
                             * "You expel <mon>!" tail and returns
                             * M_ATTK_MISS at 5194. */
                            if (DEADMONSTER(mtmp))
                                _sumIEngl = M_ATTK_DEF_DIED; /* C uhitm.c:5185 */
                        }
                        /* else: C uhitm.c:5187-5194 expels the survivor and
                         * returns M_ATTK_MISS — _sumIEngl keeps its
                         * initialiser. */
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
                await _passiveAndKnockback(aatyp, _sumIEngl !== M_ATTK_MISS, null);
                continue;
            }
            if (aatyp === AT_WEAP_H) {
                /* use_weapon: [uhitm.c:5518-5546] — the SAME known_hitum/
                 * hmon_hitmon chain as hitum(), including the bare-handed
                 * case when uwep is null.  viaHmonas=true: this row's
                 * passive() draw comes from the shared tail below
                 * (_passiveAndKnockback), not from _swing itself — see
                 * _swing's own comment on `viaHmonas`. */
                weapon_used = true;
                const _mhitRowWeap = await _swing(u && u.uwep, false, true);
                await _passiveAndKnockback(aatyp, _mhitRowWeap, u && u.uwep);
                continue;
            }
            if (aatyp === AT_CLAW_H && (u && u.uwep)
                && !_uh_cantwield(game.youmonst?.data) && !weapon_used) {
                /* uhitm.c:5548-5550 `case AT_CLAW: if (uwep &&
                 * !cantwield(gy.youmonst.data) && !weapon_used) goto
                 * use_weapon;` — same use_weapon body as the AT_WEAP row
                 * above (FALLTHROUGH in C reaches the identical code). */
                weapon_used = true;
                const _mhitRowClaw = await _swing(u && u.uwep, false, true);
                await _passiveAndKnockback(aatyp, _mhitRowClaw, u && u.uwep);
                continue;
            }
            if (aatyp === AT_HUGS_H || aatyp === AT_MAGC_H)
                continue; /* NAMED GAP: grab/strangle and spellcaster-weapon-
                             fallback state machines are not modelled. */
            /* weaponless: AT_CLAW/AT_TUCH/AT_KICK/AT_BITE/AT_STNG/AT_BUTT/
             * AT_TENT [uhitm.c:5564-5568]. */
            let tmp = _tmpBase;
            /* uhitm.c:419-423 — weapon==NULL here, so `if (weapon)
             * tmp += hitval(...)` never fires; `tmp += weapon_hit_bonus(weapon)`
             * still does for AT_CLAW, and AT_KICK gets it only with
             * martial_bonus(). */
            if (aatyp === AT_CLAW_H)
                tmp += weapon_hit_bonus(null);
            else if (aatyp === AT_KICK_H && _uh_martial_bonus())
                tmp += weapon_hit_bonus(null);
            mon_maybe_unparalyze(mtmp);
            const dieroll = rnd(20);
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
                /* uhitm.c:5640-5644 — specialdmg is always 0 above, so this
                 * arm always fires for a shade defender in this port. */
                const isShade = !!(mtmp.data && (mtmp.data.pmidx | 0) === PM_SHADE);
                if (isShade) {
                    if (verb === 'hit'
                        || (aatyp === AT_CLAW_H
                            && !!(mtmp.data && ((mtmp.data.mflags1 | 0) & M1_HUMANOID_UH))))
                        verb = 'attack';
                    await Your('%s %s harmlessly through %s.', verb, vtense(verb, 'pass'),
                         mon_nam(mtmp));
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
                        }
                        _sumI = await _damageum(row, 0);
                    }
                }
            } else {
                /* C uhitm.c:5667-5668 `else { !dhit: missum(mon, mattk,
                 * (tmp + armorpenalty > dieroll)); }` — armorpenalty is 0
                 * here (find_roll_to_hit sets it only for !Upolyd Monks). */
                await missum(mtmp, tmp + _armorpenalty > dieroll);
            }
            await _passiveAndKnockback(aatyp, _sumI !== M_ATTK_MISS, null);
        }
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
    } else {
        const _twohits = (u && u.uwep) ? (u.twoweap ? 1 : 0) : (double_punch() ? 1 : 0);
        /* C hitum: `x = u.ux + u.dx, y = u.uy + u.dy` — the attacked square,
         * used to check the monster is still there before the second swing. */
        const _atkx = mtmp.mx | 0, _atky = mtmp.my | 0;

        /* C uhitm.c:758-760 hitum(): Cleaver attacks three spots, cannot be
         * part of dual-wielding; hitum_cleave() (uhitm.c:651-722). */
        if (u && u.uwep && (u.uwep.oartifact | 0) === 4 /* ART_CLEAVER */
            && !u.twoweap && !u.uswallow && !u.ustuck
            && (u.umonnum | 0) !== 116 /* NODIAG: PM_GRID_BUG */) {
            const i0 = xdir.findIndex((xd, k) => k < 8 && xd === (u.dx | 0)
                                                && ydir[k] === (u.dy | 0));
            if (i0 >= 0) {
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
                return true;
            }
        }
        await _swing(u && u.uwep, false);

        /* C uhitm.c:794-814 — the second swing.  C's full guard is
         *   !(go.override_confirmation || gm.multi < 0 || u.umortality > oldumort
         *     || !malive || m_at(x, y) != mon)
         * The Stormbringer override and the paralysis/life-save terms are not
         * modelled state in this port; !malive and m_at are. */
        if (_twohits && malive && m_at(_atkx, _atky) === mtmp) {
            /* C: secondwep = u.twoweap ? uswapwep : NULL — the bare-handed
             * double_punch case swings with no weapon. */
            const _secondwep = (u && u.twoweap) ? (u.uswapwep || null) : null;
            await _swing(_secondwep, true);
        }
    }

    /* C uhitm.c:570-581 atk_done — an F-fight at a monster the hero cannot
     * spot leaves the 'I' marker AFTER the blow (attack_checks skips it for
     * forcefight, uhitm.c:201-214), unless the monster died. */
    if (game.context?.forcefight && (mtmp.mhp | 0) > 0 && !canspotmon(mtmp)
        && !glyph_is_invisible_at((game.u.ux | 0) + (game.u.dx | 0), (game.u.uy | 0) + (game.u.dy | 0))
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
const AT_BUTT_UH = 4, AT_WEAP_UH = 254, AT_MAGC_UH = 255; /* monattk.h */
const AD_PHYS_UH = 0, AD_BLND_UH = 11, AD_DRLI_UH = 15, AD_STON_UH = 18,
      AD_SLIM_UH = 40, AD_WRAP_UH = 28;                   /* monattk.h */
const S_EEL_UH = 57;          /* C monsym.h S_EEL */
const M2_NASTY_UH = 0x02000000; /* C monflag.h:147 M2_NASTY */
const M1_AMPHIBIOUS_UH = 0x00080000; /* C monflag.h M1_AMPHIBIOUS */
const MAGICAL_BREATHING_IDX_UH = 52; /* C prop.h MAGICAL_BREATHING */
/* C mondata.h:120 extra_nasty(ptr) */
function _extra_nasty_uh(row) { return ((row[7] | 0) & M2_NASTY_UH) !== 0; }
/* C worn.c:709 find_mac(mon) — the same MONS_AC base-AC lookup js/trap.js:96
 * exports under this name; kept local so uhitm.js does not import trap.js.
 * NOTE: this is the BASE-ONLY approximation (permonst.ac), pre-existing and
 * still used by experience() below — C's own find_mac() (worn.c:717) also
 * subtracts the monster's WORN ARMOR; see find_mac_full_uh for that. */
function find_mac(mtmp) {
    const mndx = (mtmp?.mndx ?? mtmp?.mnum ?? -1) | 0;
    return (mndx >= 0 && mndx < MONS_AC.length) ? (MONS_AC[mndx] | 0) : 10;
}
/* C hack.h:1531 ARM_BONUS(obj), applied to one worn armor chain node:
 *     objects[obj->otyp].a_ac + obj->spe
 *       - min((int) greatest_erosion(obj), objects[obj->otyp].a_ac)
 * a_ac is read from the generated js/armor_data.js table (indexed by otyp,
 * exactly as C indexes objects[] — see js/do_wear.js's armBonus(), the same
 * pattern for the HERO's worn slots). greatest_erosion is the MAX of the two
 * 2-bit erosion counters, not their sum. */
function _arm_bonus_uh(obj) {
    const row = ARMOR_DATA[obj.otyp | 0];
    const a_ac = row ? (row.a_ac | 0) : 0;
    const spe = (obj.spe | 0);
    const er = Math.max((obj.oeroded | 0), (obj.oeroded2 | 0));
    return a_ac + spe - Math.min(er, a_ac);
}
const AMULET_OF_GUARDING_UH = 210; /* objects.h AMULET() amulet of guarding —
    same otyp js/do_wear.js:273 uses for the hero's identical -2 special case */
const AC_MAX_UH = 99; /* C you.h:472 AC_MAX */
function find_mac_full_uh(mtmp) {
    let base = find_mac(mtmp);
    const mwflags = (mtmp?.misc_worn_check | 0);
    for (let obj = mtmp?.minvent; obj; obj = obj.nobj) {
        if (((obj.owornmask | 0) & mwflags) === 0)
            continue;
        if ((obj.otyp | 0) === AMULET_OF_GUARDING_UH)
            base -= 2;
        else
            base -= _arm_bonus_uh(obj);
    }
    if (Math.abs(base) > AC_MAX_UH)
        base = (base > 0 ? 1 : base < 0 ? -1 : 0) * AC_MAX_UH;
    return base;
}
/* C Amphibious := Breathless || amphibious(youmonst.data); the same read
 * js/teleport.js:1060 Amphibious_hero() uses. */
function _Amphibious_uh() {
    const p = game.u?.uprops?.[MAGICAL_BREATHING_IDX_UH];
    if (p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0))
        return true;
    const d = game.youmonst?.data;
    return !!d && ((d.mflags1 | 0) & M1_AMPHIBIOUS_UH) !== 0;
}
export function experience(mtmp, nk) {
    const mndx = (mtmp?.mndx ?? mtmp?.mnum ?? -1) | 0;
    const row = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    if (!row)
        return 1;
    const attk = MONS_MATTK[mndx] || [];
    const mlev = mtmp.m_lev | 0;
    let i, tmp2;
    let tmp = 1 + mlev * mlev;

    /* C exper.c:91-93 — for higher ac values, give extra experience */
    if ((i = find_mac(mtmp)) < 3)
        tmp += (7 - i) * ((i < 0) ? 2 : 1);

    /* C exper.c:95-97 — for very fast monsters, give extra experience.
     * permonst.mmove is MONS column [9] (see the row-layout note above). */
    const mmove = row[9] | 0;
    if (mmove > NORMAL_SPEED_UH)
        tmp += (mmove > Math.trunc(3 * NORMAL_SPEED_UH / 2)) ? 5 : 3;

    /* C exper.c:99-108 — for each "special" attack type give extra experience */
    for (i = 0; i < NATTK_UH; i++) {
        tmp2 = attk[i] ? (attk[i].aatyp | 0) : 0;
        if (tmp2 > AT_BUTT_UH) {
            if (tmp2 === AT_WEAP_UH)
                tmp += 5;
            else if (tmp2 === AT_MAGC_UH)
                tmp += 10;
            else
                tmp += 3;
        }
    }

    /* C exper.c:110-127 — for each "special" damage type give extra experience */
    for (i = 0; i < NATTK_UH; i++) {
        const a = attk[i];
        tmp2 = a ? (a.adtyp | 0) : 0;
        if (tmp2 > AD_PHYS_UH && tmp2 < AD_BLND_UH)
            tmp += 2 * mlev;
        else if (tmp2 === AD_DRLI_UH || tmp2 === AD_STON_UH || tmp2 === AD_SLIM_UH)
            tmp += 50;
        else if (tmp2 !== AD_PHYS_UH)
            tmp += mlev;
        /* extra heavy damage bonus */
        if (a && ((a.damd | 0) * (a.damn | 0)) > 23)
            tmp += mlev;
        if (tmp2 === AD_WRAP_UH && (row[0] | 0) === S_EEL_UH && !_Amphibious_uh())
            tmp += 1000;
    }

    /* C exper.c:129-131 — for certain "extra nasty" monsters, give even more */
    if (_extra_nasty_uh(row))
        tmp += (7 * mlev);

    /* C exper.c:133-135 — for higher level monsters, an additional bonus */
    if (mlev > 8)
        tmp += 50;

    /* C exper.c:141-163 — reduce experience awarded for repeated killings of
     * "the same monster" (revived/cloned only). */
    if (mtmp.mrevived || mtmp.mcloned) {
        let n = nk | 0;
        for (i = 0, tmp2 = 20; n > tmp2 && tmp > 1; ++i) {
            tmp = Math.trunc((tmp + 1) / 2);
            n -= tmp2;
            if (i & 1)
                tmp2 += 20;
        }
    }

    return tmp;
}

export { more_experienced };

/* C ref: exper.c:305 newexplevel(void) — decide whether the hero levels up.
 *   if (u.ulevel < MAXULEV && u.uexp >= newuexp(u.ulevel)) pluslvl(TRUE);
 * pluslvl(TRUE) consumes RNG (newhp/newpw); for sub-threshold kills (e.g. a fox
 * giving 4xp to a level-1 hero who needs 20) it is NOT called, so no RNG fires.
 * C ref: exper.c:305-317. */
export async function newexplevel() {
    const u = game.u;
    if (!u) return;
    const ulevel = (u.ulevel | 0);
    const threshold = newuexp(ulevel); /* BigInt */
    if (ulevel < MAXULEV && clong(u.uexp) >= threshold) {
        await pluslvl(true);
    }
}

/* C ref: mon.c:2720 m_detach() (via mondead) — unlink a dead monster from the
 * fmon chain so newsym/see_monsters no longer render its glyph and m_at no
 * longer finds it.  JS monsters have no per-tile placement table; the chain is
 * the only structure, so unlinking by identity is the whole job.
 * C ref: mon.c:2720-2780 m_detach (the unlink portion). */
async function unlink_mon(mtmp) {
    /* C mon.c:2744-2745, the head of m_detach():
     *     if (mx > 0 && emits_light(mptr))
     *         del_light_source(LS_MONSTER, monst_to_any(mtmp));
     * `mptr` is the monster's data PRIOR to death, which on this path is still
     * mtmp.data (nothing here reshapes the corpse's former owner).  mtmp.mx is
     * still its death square at this point — the caller reads it one line
     * later for the newsym.  Without this a killed gold dragon (or yellow
     * light, or fire elemental) would keep lighting its square for the rest of
     * the level: get_mon_location() only stops reporting a monster once mx
     * reaches 0, and nothing on this path zeroes it. */
    if ((mtmp.mx | 0) > 0 && emits_light(mtmp.data))
        del_light_source(LS_MONSTER, monst_to_any(mtmp));
    await unstuck(mtmp);
    mtmp.mstate = (mtmp.mstate | 0) | 0x02; /* MON_DETACH (const.js) */
}

/* XKILL flags (mon.h). */
export const XKILL_GIVEMSG = 0;
export const XKILL_NOMSG = 1;
export const XKILL_NOCORPSE = 2;
export const XKILL_NOCONDUCT = 4;

/* C ref: mon.c:3464 xkilled() — the shared "hero kills monster" sequence used
 * by both the melee path (do_attack) and the ray path (zap.js buzz/zhitm).
 * Factored out of do_attack so both callers run an identical, C-faithful RNG
 * sequence:
 *   1. kill message ("You kill/destroy <name>!"); tame monsters use the
 *      "the poor <species>" form (x_monnam with "poor"), hostile use mon_nam.
 *   2. mondead() — no RNG for ordinary monsters.
 *   3. treasure drop: rn2(6) [mon.c:3574]; we do not model the mkobj branch.
 *   4. corpse_chance: !rn2(tmp) where tmp = 2 + ((geno&G_FREQ)<2) + verysmall.
 *      make_corpse() consumes further RNG (next_ident, gender, timeout).
 *   5. peaceful/tame luck penalty: rn2(2) only when mpeaceful [mon.c:3651].
 *   6. experience() + more_experienced() + newexplevel().
 *   7. m_detach (unlink) + newsym.
 * C ref: mon.c:3464-3700. */
async function relobj_xkilled(mtmp) {
    const omx = mtmp.mx | 0, omy = mtmp.my | 0;
    let otmp;
    while ((otmp = mtmp.minvent) != null) {
        await distant_name(otmp, doname_sh);
        /* C worn.c:1377-1403 extract_from_minvent(mon, obj, FALSE, TRUE):
         * obj_extract_self then owornmask = 0.  update_mon_extrinsics is
         * skipped for a DEADMONSTER, which mtmp already is (mhp was zeroed
         * above), so the do_extrinsics arm is unreachable here. */
        extract_from_minvent_dm(mtmp, otmp);
        otmp.owornmask = 0;
        if (!await flooreffects(otmp, omx, omy, 'fall')) {
            place_object(otmp, omx, omy);
            stackobj_dm(otmp);
        }
    }
    /* C steal.c:895-896 — show && cansee(omx, omy) → newsym. */
    if (cansee(omx, omy))
        newsym(omx, omy);
}

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
function first_weapon_hit(weapon) {
    let buf = '';
    if (weapon.cursed && weapon.bknown)
        buf += 'cursed ';
    let pname;
    try {
        pname = obj_is_pname(weapon);
    } catch {
        pname = false;
    }
    buf += pname
        ? (weapon.oname ?? weapon.mextra?.oname ?? simpleonames(weapon))
        : simpleonames(weapon);
    /* C uhitm.c:1974-1976 — disclose the canonical bare artifact name when
     * the weapon's description is known. */
    if ((weapon.oartifact | 0) && weapon.dknown)
        buf += ` named ${bare_artifactname(weapon)}`;
    livelog_printf(_LL_CONDUCT_UHITM,
                   'hit with a wielded weapon (%s) for the first time', buf);
}

/* C defsym.h:339,359 MONSYM rows — permonst.mlet values corpse_chance tests. */
const S_LICH = 38;
const S_GOLEM = 55;
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

export async function corpse_chance(mtmp, magr, was_swallowed) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const row = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    const mlet = row ? (row[0] | 0) : -1;
    const geno = row ? (row[3] | 0) : 0;
    const msize = (mndx >= 0 && mndx < MONS_MSIZE.length) ? (MONS_MSIZE[mndx] | 0) : 2;
    void magr;

    /* C mon.c:3184-3190 — Vlad and the liches crumble to dust: no corpse, and
     * no RNG on the way out. */
    if (mndx === PM_VLAD_THE_IMPALER || mlet === S_LICH) {
        if (cansee(mtmp.mx | 0, mtmp.my | 0) && !was_swallowed)
            pline(`${s_suffix(Monnam(mtmp))} body crumbles into dust.`);
        return false;
    }

    const mattks = MONS_MATTK[mndx] || [];
    for (let i = 0; i < NATTK_UH; i++) {
        const atk = mattks[i];
        if (!atk || (atk.aatyp | 0) !== AT_BOOM)
            continue;
        let tmp_boom;
        if (atk.damn)
            tmp_boom = d(atk.damn | 0, atk.damd | 0);
        else if (atk.damd)
            tmp_boom = d((row ? (row[1] | 0) : 0) + 1, atk.damd | 0);
        else
            tmp_boom = 0;

        if (was_swallowed && magr) {
            /* C mon.c:3208-3229 — the blast is contained inside the engulfer.
             * The hero arm still belongs to losehp(), but a monster engulfer
             * has a complete local death path: damage first, then mondied()
             * (which also handles lifesaving and the deferred detach). */
            if (magr === game.youmonst || magr === game.u?.youmonst) {
                /* C mon.c:3210-3215 — an exploding gas spore inside the hero
                 * damages the hero directly and records the spore as killer. */
                await pline('There is an explosion in your stomach!');
                const killer = `${s_suffix(Monnam(mtmp))} explosion`;
                const u = game.u;
                u.uhp = (u.uhp | 0) - (tmp_boom | 0);
                if (!game.svk) game.svk = {};
                if (!game.svk.killer) game.svk.killer = {};
                game.svk.killer.name = killer;
                game.svk.killer.format = KILLED_BY_AN;
                if ((u.uhp | 0) < 1)
                    deadhero(0);
                else if ((u.uhp | 0) > (u.uhpmax | 0))
                    u.uhpmax = u.uhp;
                return false;
            }
            await You_hear('an explosion.');
            magr.mhp = (magr.mhp | 0) - (tmp_boom | 0);
            if ((magr.mhp | 0) < 1) {
                await mondied_dm(magr);
                if ((magr.mhp | 0) < 1) {
                    if (canspotmon(magr))
                        await pline(`${Monnam(magr)} rips open!`);
                } else if (canseemon(magr)) {
                    await pline(`${Monnam(magr)} seems to have indigestion.`);
                }
            } else if (canseemon(magr)) {
                await pline(`${Monnam(magr)} seems to have indigestion.`);
            }
            return false;
        }
        void tmp_boom; /* C discards it here — mon_explodes rolls its own */

        await mon_explodes(mtmp, atk);
        return false;
    }

    /* C mon.c:3241 LEVEL_SPECIFIC_NOCORPSE(mdat) (mon.c:44).  This
     * check is deliberately repeated in xkilled(), because C evaluates the
     * macro once here and once again around the treasure/corpse block. */
    const mflags2 = row ? (row[7] | 0) : 0;
    const levelNoCorpse = Is_rogue_level(game.u?.uz)
        || !(game.level?.flags?.deathdrops)
        || (!!(game.level?.flags?.graveyard) && (mflags2 & M2_UNDEAD) !== 0
            && !!rn2(3));
    if (levelNoCorpse)
        return false;

    const bigmonst = (msize >= MZ_LARGE);
    const mcloned = Object.hasOwn(mtmp, 'mcloned') ? (mtmp.mcloned | 0) : 0;
    if (((bigmonst || mndx === PM_LIZARD) && !mcloned)
        || mlet === S_GOLEM
        || (mndx >= PM_ARCHEOLOGIST && mndx <= PM_WIZARD)
        || mndx === PM_DEATH || mndx === PM_FAMINE || mndx === PM_PESTILENCE
        || (mtmp.isshk | 0))
        return true;

    /* C mon.c:3234-3235 — tmp = 2 + ((geno & G_FREQ) < 2) + verysmall(mdat). */
    const tmp = 2 + (((geno & G_FREQ) < 2) ? 1 : 0) + ((msize < MZ_SMALL) ? 1 : 0);
    return !rn2(tmp);
}

async function _uh_dealloc_and_bump(otmp) {
    await dealloc_obj(otmp);
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + 1);
}

export async function xkilled(mtmp, xkflags) {
    if (!mtmp) return;
    const flags = (xkflags | 0);
    const nomsg = (flags & XKILL_NOMSG) !== 0;
    const nocorpse = (flags & XKILL_NOCORPSE) !== 0;
    const mndx = (mtmp.mndx ?? mtmp.mnum) | 0;
    /* C mon.c:3489 `boolean wasinside = engulfing_u(mtmp)` — sampled at ENTRY,
     * before mondead() clears u.ustuck, and read by the naming block below. */
    const wasinside = !!engulfing_u(mtmp);

    mtmp.mhp = 0;

    if (!((flags & XKILL_NOCONDUCT) !== 0)) {
        const uc = ((game.u || {}).uconduct ||= {});
        if (!(uc.killer | 0))
            livelog_printf(_LL_CONDUCT_UHITM, 'killed for the first time');
        uc.killer = (uc.killer | 0) + 1;
    }

    /* C mon.c:3490-3499 — "You kill/destroy <name>!".  nonliving monsters are
     * "destroyed".  A tame monster is named "the poor <species>"
     * (x_monnam(mtmp, ARTICLE_THE, "poor", ...)); hostile use mon_nam. */
    if (!nomsg) {
        const verb = nonlivingMon(mndx) ? 'destroy' : 'kill';
        const namedpet = has_mgivenname(mtmp) && !_xk_hallu();
        const name = !(wasinside || canspotmon(mtmp)) ? 'it'
            : !mtmp.mtame ? mon_nam(mtmp)
              : x_monnam(mtmp, namedpet ? ARTICLE_NONE : ARTICLE_THE,
                         'poor', namedpet ? SUPPRESS_SADDLE : 0, false);
        await pline('You ' + verb + ' ' + name + '!');
        /* The command (fire/throw/zap/apply, not only melee) published this
         * line: the rhack-tail stash in allmain.js must not discard it as a
         * stale leftover when the topline already held an earlier message
         * ("The jackal bites!" before `f`+`l`: C shows "You kill the jackal!"). */
        game._attackPublished = true;
    }


    // C xkilled marks a pet's killer before mondead attempts life saving.
    if (mtmp.mtame && !mtmp.isminion && mtmp.mextra?.edog)
        mtmp.mextra.edog.killed_by_u = 1;
    await lifesaved_monster(mtmp);
    if ((mtmp.mhp | 0) > 0) {
        if (!cansee(mtmp.mx, mtmp.my)) await pline('Maybe not...');
        return;
    }

    if (game.mvitals && mndx >= 0) {
        const mv = (game.mvitals[mndx] ||= { born: 0, died: 0, mvflags: 0 });
        if ((mv.died | 0) < 255) mv.died = (mv.died | 0) + 1;
    }

    const dx = (mtmp.mx | 0), dy = (mtmp.my | 0);
    if (typeof process !== 'undefined' && ENV?.FF_DEATH_TRACE === '1') {
        const cell = game.level?.at(dx, dy);
        pushRngLogEntry(`^xkilled[x=${dx},y=${dy},mndx=${mndx},mhp=${mtmp.mhp | 0},` +
            `typ=${cell?.typ ?? -1},seenv=${cell?.seenv ?? -1},lit=${cell?.lit ? 1 : 0},` +
            `waslit=${cell?.waslit ? 1 : 0},minvent=${mtmp.minvent ? 1 : 0}]`);
    }
    if (glyph_is_invisible_at(dx, dy))
        unmap_object(dx, dy);
    await unlink_mon(mtmp);
    newsym(dx, dy);

    await relobj_xkilled(mtmp);

    const _xk_mflags2 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][7] | 0) : 0;
    const _xk_levelSpecificNoCorpse = Is_rogue_level(game.u?.uz)
        || !(game.level?.flags?.deathdrops)
        || (!!(game.level?.flags?.graveyard) && (_xk_mflags2 & M2_UNDEAD) !== 0
            && !!rn2(3));
    if (!(nocorpse || _xk_levelSpecificNoCorpse)
        && (accessible(dx, dy) || is_pool_uh(dx, dy))) {
        {
            const tx = (mtmp.mx | 0), ty = (mtmp.my | 0);
            const u = game.u || {};
            const geno = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][3] | 0) : 0;
            const mlet_x = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][0] | 0) : -1;
            const mf2 = _xk_mflags2;
            const msize_x = (mndx >= 0 && mndx < MONS_MSIZE.length) ? (MONS_MSIZE[mndx] | 0) : 2;
            if (rn2(6) === 0
                && (geno & G_NOCORPSE) === 0
                && (tx !== (u.ux | 0) || ty !== (u.uy | 0))
                && mlet_x !== S_KOP
                && !mtmp.mcloned) {
                const otmp = await mkobj(RANDOM_CLASS, true);
                const otyp = (otmp.otyp | 0);
                if ((otmp.oclass | 0) === FOOD_CLASS && (mf2 & M2_COLLECT) === 0 && !otmp.oartifact) {
                    if (!obj_resists(otmp, 0, 0))
                        await _uh_dealloc_and_bump(otmp);
                } else if (msize_x < MZ_HUMAN && otyp !== FIGURINE && (otmp.owt | 0) > 30) {
                    if (!obj_resists(otmp, 0, 0))
                        await _uh_dealloc_and_bump(otmp);
                } else if (!await flooreffects(otmp, tx, ty, nomsg ? '' : 'fall')) {
                    place_object(otmp, tx, ty);
                }
            }
        }

        if (!wasinside) {
            if (await corpse_chance(mtmp, null, false)) {
                await make_corpse(mtmp, (mtmp.mx | 0), (mtmp.my | 0));
            }
        }
    }

    newsym(dx, dy);

    /* C mon.c:3651 — peaceful/tame luck penalty.
     *   if ((mtmp->mpeaceful && !rn2(2)) || mtmp->mtame) change_luck(-1);
     * rn2(2) is only evaluated when mpeaceful is set. */
    if (mtmp.mpeaceful && !rn2(2)) {
        if (game.u && game.u.uluck != null) game.u.uluck = (game.u.uluck | 0) - 1;
    } else if (mtmp.mtame) {
        if (game.u && game.u.uluck != null) game.u.uluck = (game.u.uluck | 0) - 1;
    }

    /* C mon.c:3672 — tmp = experience(mtmp, (int) svm.mvitals[mndx].died);
     * the kill count is already incremented by m_detach above, exactly as C's
     * comment at exper.c:145 requires ("including the current monster"). */
    const xpgain = experience(mtmp, (game.mvitals?.[mndx]?.died | 0));
    more_experienced(xpgain, 0);

    /* C's m_detach + newsym already ran, up at the mondead() call site. */

    await newexplevel(); /* C mon.c:3664 */

    await _xkilled_adjust_alignment(mtmp, mndx);
}

async function _xkilled_adjust_alignment(mtmp, mndx) {
    const u = game.u;
    if (!u) return;
    const row = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    const mdatMsound = (mndx >= 0 && mndx < _MONS_MSOUND.length) ? (_MONS_MSOUND[mndx] | 0) : 0;
    const maligntyp = row ? (row[4] | 0) : 0;
    const ALIGNLIM = 10 + Math.floor((game.moves | 0) / 200); /* align.h:17 */

    /* C mon.c:3667 — quest leader id (svq.quest_status.leader_m_id).  JS does
     * not track per-monster m_id for the leader; when absent, this is false —
     * faithful for all non-leader kills (the overwhelming majority). */
    const leaderId = game?.svq?.quest_status?.leader_m_id;
    const isLeaderKill = (leaderId != null && mtmp.m_id != null && mtmp.m_id === leaderId);

    if (isLeaderKill) { /* REAL BAD! — mon.c:3667-3674 */
        adjalign(-((u.ualign.record | 0) + Math.floor(ALIGNLIM / 2)));
        u.ugangr = (u.ugangr | 0) + 7;
        /* change_luck(-20) + anger_quest_guardians — luck/AI, no RNG, no screen here */
        if (u.uluck != null) u.uluck = (u.uluck | 0) - 20;
        await pline(`That was ${(game?.u?.uevent?.qcompleted) ? 'probably ' : ''}a bad idea...`);
    } else if (mdatMsound === MS_NEMESIS) { /* Real good! — mon.c:3675-3677 */
        if (!(game?.svq?.quest_status?.killed_leader))
            adjalign(Math.floor(ALIGNLIM / 4));
    } else if (mdatMsound === MS_GUARDIAN) { /* Bad — mon.c:3678-3685 */
        adjalign(-Math.floor(ALIGNLIM / 8));
        u.ugangr = (u.ugangr | 0) + 1;
        if (u.uluck != null) u.uluck = (u.uluck | 0) - 4;
        await pline('That was probably a bad idea...');
    } else if (mtmp.ispriest) { /* mon.c:3686-3692 */
        /* p_coaligned(priest): u.ualign.type == mon_aligntyp(priest).  Priest
         * shrine alignment lives in mextra.epri.shralign when present. */
        const shralign = mtmp?.mextra?.epri?.shralign;
        const monAlign = (shralign != null) ? (shralign | 0) : maligntyp;
        const coaligned = ((u.ualign?.type | 0) === monAlign);
        adjalign(coaligned ? -2 : 2);
        if (coaligned) u.ublessed = 0; /* cancel divine protection */
        if (maligntyp === A_NONE_U)
            adjalign(Math.floor(ALIGNLIM / 4)); /* BIG bonus */
    } else if (mtmp.mtame) { /* bad!! — mon.c:3693-3710 */
        adjalign(-15);
        /* your god is mighty displeased... (screen-visible) */
        const Hallucination = !!(game.u && _xk_hallu());
        if (!Hallucination)
            await pline('You hear the rumble of distant thunder...');
        else
            await pline('You hear the studio audience applaud!');
        /* livelog "murdered ... faithful ..." omitted (no screen) */
    } else if (mtmp.mpeaceful) { /* mon.c:3711-3712 */
        adjalign(-5);
    }

    /* C mon.c:3714-3715 — malign was already adjusted for u.ualign.type and
     * randomization; apply it.  Fires for EVERY kill. */
    adjalign(mtmp.malign | 0);
}

function _xk_hallu() {
    const u = game.u;
    if (!u) return false;
    const hh = (u.uprops?.[HALLUC]?.intrinsic | 0);
    const hr = u.uprops?.[HALLUC_RES];
    const res = ((hr?.intrinsic | 0) || (hr?.extrinsic | 0));
    return !!hh && !res;
}

const A_NONE_U = -128; /* align.h:19 */

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
        if ((m.mhp | 0) > 0 && m.mx === x && m.my === y)
            return m;
    }
    return worm_seg_at(x, y);
}

/* uwep_skill_type() — return the skill type for the primary (right-hand) weapon.
 * If two-weaponing, return P_TWO_WEAPON_COMBAT (36).
 * Otherwise return weapon_type(uwep).
 * C ref: weapon.c:1526-1533 */
export function uwep_skill_type() {
    const u = game.u || {};
    if (u.twoweap)
        return 36;  /* P_TWO_WEAPON_COMBAT */
    return weapon_type(u.uwep);
}

/* weapon_type(obj) — return the skill type of a weapon or weapon-tool object.
 * Returns P_BARE_HANDED_COMBAT (35) if obj is null.
 * Returns P_NONE (0) if obj is not a weapon/tool/gem/ammo.
 * Otherwise returns the absolute value of objects[otyp].oc_skill.
 * C ref: weapon.c:1511-1524 */
export function weapon_type(obj) {
    if (!obj)
        return P_BARE_HANDED_COMBAT; /* Not using a weapon */
    const oclass = obj.oclass | 0;
    if (oclass !== WEAPON_CLASS && oclass !== TOOL_CLASS && oclass !== GEM_CLASS)
        return P_NONE; /* Not a weapon, weapon-tool, or ammo */
    const otyp = obj.otyp | 0;
    const type = (otyp >= 0 && otyp < MKOBJ_OC_SKILL.length)
        ? (MKOBJ_OC_SKILL[otyp] | 0)
        : 0;
    return (type < 0) ? -type : type;
}

/* C ref: weapon.c:1119-1123
 * P_NAME macro implementation. Maps skill to skill name string via:
 * - skill_names_indices lookup (skill -> object otyp or negative index)
 * - For positive indices: getObjName(otyp)
 * - For P_BARE_HANDED_COMBAT: barehands_or_martial[martial_bonus()]
 * - For other negative indices: odd_skill_names[-idx]
 */
const skill_names_indices = [
    /* C ref: weapon.c:38-49 — maps skill index to object otyp or negative index (PN_*) */
    /* Indexed by P_* constants: 0=P_NONE, 1=P_DAGGER, ... 37=P_RIDING */
    0,                             /* 0:  P_NONE */
    34,   40,   44,   259,  46,   52,   54,   55,    /* 1-8:  P_DAGGER...P_TWO_HANDED_SWORD */
    -5,   77,   73,   75,   81,   -6,   79,   -4,    /* 9-16: P_SABER...PN_POLEARMS */
    /* 17-24: P_SPEAR, P_TRIDENT, P_LANCE, P_BOW, P_SLING, P_CROSSBOW,
     * P_DART, P_SHURIKEN.  Index 22 (P_CROSSBOW) read 23 = "crossbow bolt",
     * the AMMO otyp; C weapon.c:42 has CROSSBOW, the launcher = otyp 88
     * (objects.h; oc_skill 88 == +22 == P_CROSSBOW, matching 87 == SLING at
     * index 21).  Latent until now: the local P_CROSSBOW was 23, so
     * skill_name() was never reached for a wielded crossbow. */
    27,   33,   72,   83,   87,   88,   24,   25,
    26,   -7,   0,                                    /* 25-27: P_WHIP, P_UNICORN_HORN (UNICORN_HORN not exported) */
    -8,   -9,   -10,  -11,  -12,  -13,  -14,         /* 28-34: P_ATTACK_SPELL...P_MATTER_SPELL */
    -1,   -2,   -3,                                   /* 35-37: P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_RIDING */
];
/* C ref: weapon.c:52-57 — odd_skill_names array for negative indices */
const odd_skill_names = [
    "no skill",                    /* index 0 (unused) */
    "bare hands",                  /* index 1 (use barehands_or_martial[] instead) */
    "two weapon combat",           /* index 2, PN_TWO_WEAPONS = -2 */
    "riding",                      /* index 3, PN_RIDING = -3 */
    "polearms",                    /* index 4, PN_POLEARMS = -4 */
    "saber",                       /* index 5, PN_SABER = -5 */
    "hammer",                      /* index 6, PN_HAMMER = -6 */
    "whip",                        /* index 7, PN_WHIP = -7 */
    "attack spells",               /* index 8, PN_ATTACK_SPELL = -8 */
    "healing spells",              /* index 9, PN_HEALING_SPELL = -9 */
    "divination spells",           /* index 10, PN_DIVINATION_SPELL = -10 */
    "enchantment spells",          /* index 11, PN_ENCHANTMENT_SPELL = -11 */
    "clerical spells",             /* index 12, PN_CLERIC_SPELL = -12 */
    "escape spells",               /* index 13, PN_ESCAPE_SPELL = -13 */
    "matter spells",               /* index 14, PN_MATTER_SPELL = -14 */
];
const barehands_or_martial = [
    "bare handed combat",          /* martial_bonus() = 0 */
    "martial arts",                /* martial_bonus() = 1 (Samurai or Monk) */
];

/**
 * skill_name: return the name of a skill.
 * C ref: weapon.c:1119-1123
 * Returns string name of skill; dispatch via:
 * - positive index: getObjName(skill_names_indices[skill])
 * - P_BARE_HANDED_COMBAT: barehands_or_martial[martial_bonus()]
 * - negative index: odd_skill_names[-skill_names_indices[skill]]
 * @param {number} skill - skill index (P_* constant)
 * @return {string} - skill name
 */
export function skill_name(skill) {
    skill = skill | 0;
    if (skill < 0 || skill >= skill_names_indices.length)
        return "unknown skill";

    const idx = skill_names_indices[skill];

    /* Positive index: look up object name */
    if (idx > 0) {
        /* getObjName() is built from discovery-name tables and omits the
         * fixed-name pick-axe.  C's table entry is PICK_AXE itself. */
        return getObjName(idx) ?? (idx === 259 ? OC_NAME[idx] : null) ?? "unknown";
    }

    /* P_BARE_HANDED_COMBAT (index 35): use barehands_or_martial */
    if (skill === 35) { /* P_BARE_HANDED_COMBAT */
        const martial = _uh_martial_bonus() ? 1 : 0;
        return barehands_or_martial[martial];
    }

    /* Negative index: look up in odd_skill_names */
    const negIdx = -idx;
    if (negIdx >= 0 && negIdx < odd_skill_names.length) {
        return odd_skill_names[negIdx];
    }

    return "unknown skill";
}

/* skill_level_name(skill, buf) — copy the skill level name into the buffer.
 * C ref: weapon.c:1086-1118.
 * Returns the buffer with the proficiency level name (Unskilled/Basic/etc). */
export function skill_level_name(skill, buf) {
    /* P_SKILL(skill) — in C this macro extracts the proficiency level.
     * The proficiency constants are P_UNSKILLED=1 through P_GRAND_MASTER=6. */
    const P_UNSKILLED = 1;
    const P_BASIC = 2;
    const P_SKILLED = 3;
    const P_EXPERT = 4;
    const P_MASTER = 5;
    const P_GRAND_MASTER = 6;
    let ptr;

    switch (skill) {
    case P_UNSKILLED:
        ptr = "Unskilled";
        break;
    case P_BASIC:
        ptr = "Basic";
        break;
    case P_SKILLED:
        ptr = "Skilled";
        break;
    case P_EXPERT:
        ptr = "Expert";
        break;
    case P_MASTER:
        ptr = "Master";
        break;
    case P_GRAND_MASTER:
        ptr = "Grand Master";
        break;
    default:
        ptr = "Unknown";
        break;
    }
    /* Strcpy(buf, ptr) — in JS just return the string */
    return ptr;
}

/* weapon_descr(obj) — returns a short description of a wielded weapon/object.
 * C ref: weapon.c:89-143.
 * Returns a singular noun string describing the object in a combat context. */
export function weapon_descr(obj) {
    /* Skill constants P_SLING/P_BOW/P_CROSSBOW/P_FLAIL/P_PICK_AXE now come
     * from const.js (see the import at the top of this file).  The five
     * file-local copies that used to sit here read 22/21/23/13/4; skills.h:38-44
     * says 21/20/22/13/4, so the three launcher skills were each +1 and the
     * other two were right — NOT a uniform offset.  Effect: weapon_type()
     * returns the true skills.h value, so `case P_BOW` never matched a bow
     * (20 vs 21) while `case P_BOW` DID match a sling (21), `case P_SLING`
     * matched a crossbow (22) and `case P_CROSSBOW` matched a dart (23) — a
     * four-way mis-dispatch, not an off-by-one that cancels. */

    /* Object type constants */
    const CORPSE = 265;
    const TIN = 296;
    const EGG = 266;
    const STATUE = 476;
    const BOULDER = 475;
    const TOWEL = 234;      /* objects.h:949; was 237 = STETHOSCOPE */
    const TIN_OPENER = 239; /* objects.h:962; was 236 = LEASH */
    const ROCK = 474;
    const GRAPPLING_HOOK = 260; /* objects.h:1012; was 82 = BULLWHIP */
    const DWARVISH_MATTOCK = 71;
    const GEM_CLASS = 13;

    /* Gray stone otyps for is_graystone */
    /* objects.h:1599/1601/1603/1605 — the four gray stones.  Were 478..481
     * (iron chain / blinding venom / acid venom / past the end of objects[]),
     * i.e. is_graystone() below never matched anything.  The correct values are
     * already in this file at line ~2017 as SR_LUCKSTONE/SR_LOADSTONE/SR_FLINT. */
    const LUCKSTONE = 470;
    const LOADSTONE = 471;
    const TOUCHSTONE = 472;
    const FLINT = 473;

    /* def_oc_syms lookup: class index → display name */
    const def_oc_syms = [
        "strange object",  /* 0 */
        "strange object",  /* 1 */
        "weapon",          /* 2 */
        "armor",           /* 3 */
        "ring",            /* 4 */
        "amulet",          /* 5 */
        "tool",            /* 6 */
        "food",            /* 7 */
        "potion",          /* 8 */
        "scroll",          /* 9 */
        "spellbook",       /* 10 */
        "wand",            /* 11 */
        "coin",            /* 12 */
        "gem",             /* 13 */
        "large rock",      /* 14 */
        "ball",            /* 15 */
        "chain",           /* 16 */
        "venom"            /* 17 */
    ];

    function is_ammo(o) {
        const otyp = o.otyp | 0;
        if (otyp < 0 || otyp >= MKOBJ_OC_SKILL.length) return false;
        return (MKOBJ_OC_SKILL[otyp] | 0) < 0;
    }

    function is_graystone(o) {
        const otyp = o.otyp | 0;
        return otyp === LUCKSTONE || otyp === LOADSTONE ||
               otyp === TOUCHSTONE || otyp === FLINT;
    }

    const skill = weapon_type(obj);
    let descr = skill_name(skill);

    /* assorted special cases */
    switch (skill) {
    case P_NONE:
        /* not a weapon or weptool: use item class name;
           override class name for things where it sounds strange and
           for things that aren't unexpected to find being wielded:
           corpses, tins, eggs, and globs avoid "food",
           statues and boulders avoid "large rock",
           and towels and tin openers avoid "tool" */
        descr = (obj.otyp === CORPSE || obj.otyp === TIN || obj.otyp === EGG
                 || obj.otyp === STATUE || obj.otyp === BOULDER
                 || obj.otyp === TOWEL || obj.otyp === TIN_OPENER)
                ? OC_NAME[obj.otyp]
                : obj.globby ? "glob"
                  : (def_oc_syms[obj.oclass | 0] || "strange object");
        break;
    case P_SLING:
        if (is_ammo(obj))
            descr = (obj.otyp === ROCK || is_graystone(obj))
                        ? "stone"
                        : (obj.oclass === GEM_CLASS)
                            ? "gem"
                            : (def_oc_syms[obj.oclass | 0] || "strange object");
        break;
    case P_BOW:
        if (is_ammo(obj))
            descr = "arrow";
        break;
    case P_CROSSBOW:
        if (is_ammo(obj))
            descr = "bolt";
        break;
    case P_FLAIL:
        if (obj.otyp === GRAPPLING_HOOK)
            descr = "hook";
        break;
    case P_PICK_AXE:
        /* even if "dwarvish mattock" hasn't been discovered yet */
        if (obj.otyp === DWARVISH_MATTOCK)
            descr = "mattock";
        break;
    default:
        break;
    }
    return makesingular(descr);
}

const SHADE_GLARE_SILVER_MAT = 14; /* objclass.h:20 enum obj_material_types */

function shade_glare(obj) {
    if (!obj)
        return false;
    /* C artifact.c:560-561: any silver object is effective */
    if (sr_oc_material(obj.otyp | 0) === SHADE_GLARE_SILVER_MAT)
        return true;
    /* C artifact.c:563-566 — see KNOWN GAP above */
    return false;
}

/* C mondata.h:68 is_wooden(ptr) = (ptr == &mons[PM_WOOD_GOLEM]);
 * mondata.h:215 hates_light(ptr) = (ptr == &mons[PM_GREMLIN]).
 * pmidx values from js/pm.generated.js (PM_WOOD_GOLEM 254, PM_GREMLIN 40). */
/* C obj.h:126 greatest_erosion(otmp) — max of the two 2-bit erosion fields. */
function greatest_erosion_dv(otmp) {
    if (!otmp)
        return 0;
    const e1 = otmp.oeroded | 0, e2 = otmp.oeroded2 | 0;
    return e1 > e2 ? e1 : e2;
}
const PM_WOOD_GOLEM_DV = 254;
const PM_GREMLIN_DV = 40;
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
function _uh_misc_obj_dmg(obj, mon) {
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
    const owt = (otyp >= 0 && otyp < OC_WEIGHT.length) ? (OC_WEIGHT[otyp] | 0) : 0;
    let dmg = Math.trunc((owt + 99) / 100);
    dmg = (dmg <= 1) ? 1 : rnd(dmg);
    if (dmg > 6) dmg = 6;
    if (material === SILVER_UH && mon_hates_silver(mon)) {
        dmg += rnd(20);
    }
    if (obj.blessed && mon_hates_blessings(mon)) {
        dmg += rnd(4);
    }
    return dmg;
}

export function dmgval(otmp, mon) {
    /* Weapon constants (otyp values from objects.h order). */
    const CREAM_PIE = 287; /* objects.h:1100 FOOD("cream pie", ...);
                            * was 286 = LUMP_OF_ROYAL_JELLY */
    const BOULDER = 475;          /* objects.h ROCK_CLASS, oc_wsdam=oc_wldam=20 */
    const STATUE = 476;          /* objects.h ROCK_CLASS, oc_wsdam=oc_wldam=20 */
    const HEAVY_IRON_BALL = 477;  /* objects.h BALL_CLASS, oc_wsdam=oc_wldam=25, oc_weight=480 */

    /* Weapon otyp constants from C weapon.c / objects.h */
    const IRON_CHAIN_OTYP = 478; /* objects.h:1631 CHAIN_CLASS IRON_CHAIN;
                                  * was 9 = GENERIC_SCROLL, so the d(4,4) chain
                                  * damage case below was dead */
    const CROSSBOW_BOLT = 23;
    const MORNING_STAR = 75;
    const PARTISAN = 59;
    const RUNESWORD = 58;
    const ELVEN_BROADSWORD = 53;
    const BROADSWORD = 52;
    const FLAIL = 81;
    const RANSEUR = 60;
    const VOULGE = 65;
    const ACID_VENOM = 480; /* objects.h:1642 VENOM_CLASS ACID_VENOM;
                             * was 245 = TIN_WHISTLE */
    const HALBERD = 63;
    const SPETUM = 61;
    const BATTLE_AXE = 45;
    const BARDICHE = 64;
    const TRIDENT = 33;
    const TSURUGI = 57;
    const DWARVISH_MATTOCK = 71;
    const TWO_HANDED_SWORD = 55;
    const MACE = 73;
    const SILVER_MACE = 74;
    const WAR_HAMMER = 76;
    const BILL_GUISARME = 68;
    const GUISARME = 67;
    const LUCERN_HAMMER = 69;

    /* Object class constants (objclass.h) */
    const BALL_CLASS = 15;
    const CHAIN_CLASS = 16;

    /* Helper to compute weapon damage die. */
    function ocWsDam(otyp) {
        return (otyp >= 0 && otyp < WEAPON_WSDAM.length) ? (WEAPON_WSDAM[otyp] | 0) : 0;
    }
    function ocWlDam(otyp) {
        return (otyp >= 0 && otyp < WEAPON_WLDAM.length) ? (WEAPON_WLDAM[otyp] | 0) : 0;
    }

    let tmp = 0;
    const otyp = (otmp?.otyp | 0);
    const ptr = mon?.data;

    if (!ptr) return 0;

    /* C boolean Is_weapon = (otmp->oclass == WEAPON_CLASS || is_weptool(otmp)).
     * C obj.h:249 `is_weptool(o) ((o)->oclass == TOOL_CLASS
     *                             && objects[(o)->otyp].oc_skill != P_NONE)`
     * — the three WEPTOOL() rows (pick-axe, grappling hook, unicorn horn) are
     * the only TOOL_CLASS objects objects.h gives an oc_skill.  With this term
     * missing, a wielded pick-axe skipped BOTH the `tmp += otmp->spe`
     * enchantment (weapon.c:297-302) and the weapon-vs-monster bonus block
     * (weapon.c:323-342), whose blessed arm DRAWS rnd(4). */
    const P_NONE_SKILL = 0; /* C skills.h P_NONE */
    const Is_weapon = ((otmp?.oclass | 0) === WEAPON_CLASS)
        || (((otmp?.oclass | 0) === TOOL_CLASS)
            && (MKOBJ_OC_SKILL[(otmp?.otyp | 0)] | 0) !== P_NONE_SKILL);

    /* CREAM_PIE does no damage */
    if (otyp === CREAM_PIE)
        return 0;

    /* Determine base damage die by monster size */
    const msize = (ptr?.msize | 0) ?? 2;
    const bigmonst = (msize >= MZ_LARGE); /* MZ_LARGE = 3 */

    if (bigmonst) {
        /* WEAPON_WLDAM now covers every otyp objects.h gives a damage die, so the
         * hand-written boulder/statue/heavy-iron-ball fallbacks that used to sit
         * here are table rows; keeping them would be a stale premise. */
        const wldam = ocWlDam(otyp);
        if (wldam)
            tmp = rnd(wldam);

        /* Large monster damage bonuses (switch statement) */
        switch (otyp) {
        case IRON_CHAIN_OTYP:
        case CROSSBOW_BOLT:
        case MORNING_STAR:
        case PARTISAN:
        case RUNESWORD:
        case ELVEN_BROADSWORD:
        case BROADSWORD:
            tmp++;
            break;

        case FLAIL:
        case RANSEUR:
        case VOULGE:
            tmp += rnd(4);
            break;

        case ACID_VENOM:
        case HALBERD:
        case SPETUM:
            tmp += rnd(6);
            break;

        case BATTLE_AXE:
        case BARDICHE:
        case TRIDENT:
            tmp += d(2, 4);
            break;

        case TSURUGI:
        case DWARVISH_MATTOCK:
        case TWO_HANDED_SWORD:
            tmp += d(2, 6);
            break;
        }
    } else {
        const wsdam = ocWsDam(otyp);  /* see the WLDAM note above: table, not fallbacks */
        if (wsdam)
            tmp = rnd(wsdam);

        /* Small monster damage bonuses (switch statement) */
        switch (otyp) {
        case IRON_CHAIN_OTYP:
        case CROSSBOW_BOLT:
        case MACE:
        case SILVER_MACE:
        case WAR_HAMMER:
        case FLAIL:
        case SPETUM:
        case TRIDENT:
            tmp++;
            break;

        case BATTLE_AXE:
        case BARDICHE:
        case BILL_GUISARME:
        case GUISARME:
        case LUCERN_HAMMER:
        case MORNING_STAR:
        case RANSEUR:
        case BROADSWORD:
        case ELVEN_BROADSWORD:
        case RUNESWORD:
        case VOULGE:
            tmp += rnd(4);
            break;

        case ACID_VENOM:
            tmp += rnd(6);
            break;
        }
    }

    /* Add weapon enchantment bonus (spe) */
    if (Is_weapon) {
        tmp += (otmp?.spe | 0);
        if (tmp < 0)
            tmp = 0;
    }

    /* Thick-skinned and shade checks */
    /* C weapon.c:304 —
     *   if (objects[otyp].oc_material <= LEATHER && thick_skinned(ptr))
     *       tmp = 0;
     * objclass.h:20 LEATHER = 7; thick_skinned is mondata.h:69
     * (mflags1 & M1_THICK_HIDE, monflag.h:106 = 0x00200000L). */
    if (sr_oc_material(otyp) <= LEATHER_MAT && thick_skinned(ptr))
        tmp = 0;
    /* C weapon.c:306-307 —
     *   if (ptr == &mons[PM_SHADE] && !shade_glare(otmp))
     *       tmp = 0;
     * This arm was previously written as `if (ptr === null)`, which is dead
     * code (a null ptr already returned 0 above), so dmgval() returned a
     * non-zero damage for ordinary weapons against a shade.  That is exactly
     * the value shade_miss() (uhitm.c:2028) tests for zero/not-zero, so the
     * arm is load-bearing on the shade path. */
    if ((ptr?.pmidx | 0) === PM_SHADE && !shade_glare(otmp))
        tmp = 0;

    /* "very heavy iron ball"; weight increase is in increments (weapon.c:310-319).
     * oc_weight[HEAVY_IRON_BALL]=480, WT_IRON_BALL_INCR=160 (objects.h:1626, weight.h:18). */
    if (otyp === HEAVY_IRON_BALL && tmp > 0) {
        const wt_base = (otmp?.owt | 0) > 480 ? ((otmp?.owt | 0) - 480) / 160 : 0;
        if (wt_base > 0) {
            tmp += rnd(4 * wt_base);
            if (tmp > 25)
                tmp = 25;
        }
    }

    /* Weapon vs. monster type bonuses */
    if (Is_weapon || (otmp?.oclass | 0) === GEM_CLASS ||
        (otmp?.oclass | 0) === BALL_CLASS || (otmp?.oclass | 0) === CHAIN_CLASS) {
        let bonus = 0;

        if ((otmp?.blessed | 0) && mon_hates_blessings(mon))
            bonus += rnd(4);
        /* C weapon.c:329-330 —
         *   if (is_axe(otmp) && is_wooden(ptr))
         *       bonus += rnd(4);
         * obj.h:217 is_axe(otmp) = ((otmp->oclass == WEAPON_CLASS
         *                            || otmp->oclass == TOOL_CLASS)
         *                           && objects[otmp->otyp].oc_skill == P_AXE);
         * mondata.h:68 is_wooden(ptr) = ((ptr) == &mons[PM_WOOD_GOLEM]).
         * NOTE js/dig.js:452 carries a file-local is_axe() that answers
         * `otyp === AXE` only — narrower than C, which admits every P_AXE-skill
         * otyp (AXE 44 and BATTLE_AXE 45).  It is not exported and is not the
         * body used here; this spells C's predicate off MKOBJ_OC_SKILL, the
         * same table Is_weapon above reads. */
        if (is_axe_dv(otmp) && (ptr.pmidx | 0) === PM_WOOD_GOLEM_DV)
            bonus += rnd(4);
        /* C weapon.c:331-332 —
         *   if (objects[otyp].oc_material == SILVER && mon_hates_silver(mon))
         *       bonus += rnd(20);
         * objclass.h:20 SILVER == 14, which is the same constant
         * SHADE_GLARE_SILVER_MAT above already carries for shade_glare().
         * mon_hates_silver is mondata.c:517 and is the REAL exported body in
         * js/mhitm.js:2023 (is_vampshifter || hates_silver(mon->data), and
         * hates_silver is js/makemon.js:685, C mondata.c:524 verbatim) — it is
         * already imported at the top of this file and already used by
         * special_dmgval below, so this is not a private stand-in. */
        if (sr_oc_material(otyp) === SHADE_GLARE_SILVER_MAT && mon_hates_silver(mon))
            bonus += rnd(20);
        /* C weapon.c:333-334 —
         *   if (artifact_light(otmp) && otmp->lamplit && hates_light(ptr))
         *       bonus += rnd(8);
         * hates_light is mondata.h:215, `((ptr) == &mons[PM_GREMLIN])`, and
         * nothing else.  js/makemon.js:3608 carries a file-local hates_light()
         * that answers `mlet is S_VAMPIRE/S_GHOST/S_ZOMBIE/S_LICH` — a
         * DIFFERENT predicate that C does not have; it is not exported and is
         * not used here, and C's one-monster test is spelled inline. */
        if (artifact_light(otmp) && (otmp?.lamplit | 0)
            && (ptr.pmidx | 0) === PM_GREMLIN_DV)
            bonus += rnd(8);

        if (bonus > 1 && (otmp?.oartifact | 0)
            && spec_dbon(otmp, mon, -1, 25) >= 25)
            bonus = ((bonus + 1) / 2) | 0;

        tmp += bonus;
    }

    /* Erosion penalty */
    if (tmp > 0) {
        /* C weapon.c:350 `tmp -= greatest_erosion(otmp);`.  obj.h:126
         * greatest_erosion(otmp) = max(otmp->oeroded, otmp->oeroded2), both
         * 2-bit fields (MAX_ERODE 3), so this is a 0..3 damage penalty and
         * DRAWS NO RNG.  js/dig.js:104 has the same body but file-local and
         * unexported; js/cmd.js:15640 has a third copy as
         * greatest_erosion_st(). Spelled inline rather than adding a fourth
         * cross-file import. */
        tmp -= greatest_erosion_dv(otmp);
        if (tmp < 1)
            tmp = 1;
    }

    return tmp;
}

export function autoreturn_weapon(otmp) {
    // arwep static array: throw-and-return weapons
    // C: static NEARDATA const struct throw_and_return_weapon arwep[] = {
    //     { AKLYS, AKLYS_LIM * AKLYS_LIM, 1 },
    // };
    const AKLYS = 80;  // weapon otyp constant
    const AKLYS_LIM = 4;  // BOLT_LIM / 2; BOLT_LIM = 8
    const arwep = [
        { otyp: AKLYS, range: AKLYS_LIM * AKLYS_LIM, tethered: 1 }
    ];

    // Loop through arwep and return first match
    for (let i = 0; i < arwep.length; i++) {
        if (otmp.otyp === arwep[i].otyp) {
            return arwep[i];
        }
    }
    return null;
}


/* can_advance(skill, speedy) — C ref: weapon.c:1150-1164.
 * Check if a skill can be advanced.
 * Args: skill (int), speedy (boolean)
 * Returns: boolean
 * Calls: practice_needed_to_advance (macro: level*level*20),
 *        slots_required (unported, stub).
 * Reads: u.weapon_skills[skill], u.skills_advanced, u.weapon_slots,
 *        wizard (flags.debug, via gstate.js wizard() — C's flag.h:30 macro).
 * C source:
 *   if (P_RESTRICTED(skill)
 *       || P_SKILL(skill) >= P_MAX_SKILL(skill)
 *       || u.skills_advanced >= P_SKILL_LIMIT)
 *       return FALSE;
 *   if (wizard && speedy)
 *       return TRUE;
 *   return (boolean) ((int) P_ADVANCE(skill)
 *                     >= practice_needed_to_advance(P_SKILL(skill))
 *                     && u.weapon_slots >= slots_required(skill));
 */
export function can_advance(skill, speedy) {
    const u = game.u;
    if (!u.weapon_skills) return false;

    const skillData = u.weapon_skills[skill];
    if (!skillData) return false;

    // P_RESTRICTED(skill) = (u.weapon_skills[skill].skill == P_ISRESTRICTED)
    if (skillData.skill === P_ISRESTRICTED)
        return false;

    // P_MAX_SKILL(type) = u.weapon_skills[type].max_skill
    if (skillData.skill >= (skillData.max_skill | 0))
        return false;

    // P_SKILL_LIMIT = 60
    if ((u.skills_advanced | 0) >= P_SKILL_LIMIT)
        return false;

    // wizard && speedy
    if (wizard() && speedy)
        return true;

    // P_ADVANCE(skill) = u.weapon_skills[skill].advance
    const advance = (skillData.advance | 0);
    // P_SKILL(skill) = u.weapon_skills[skill].skill
    const skillLevel = (skillData.skill | 0);
    // practice_needed_to_advance(level) = level * level * 20
    const practice_needed = Math.imul(Math.imul(skillLevel, skillLevel), 20);

    if (advance < practice_needed)
        return false;

    // slots_required(skill) — unported, stub
    const slots = slots_required(skill);
    if ((u.weapon_slots | 0) < slots)
        return false;

    return true;
}

/* slots_required(skill) — C ref: weapon.c:1129-1150.
 * C source:
 *   int tmp = P_SKILL(skill);
 *   if (skill <= P_LAST_WEAPON || skill == P_TWO_WEAPON_COMBAT)
 *       return tmp;
 *   return (tmp + 1) / 2;
 * The comment tables in C spell it out: a weapon skill costs its CURRENT level
 * in slots (unskilled->basic 1, basic->skilled 2, skilled->expert 3); unarmed,
 * martial and riding cost half that, rounded up.
 * This was a throwing stub, which made can_advance() above unreachable for any
 * non-wizard caller — it threw before it could return.  RNG-free. */
export function slots_required(skill) {
    const tmp = (game.u?.weapon_skills?.[skill]?.skill | 0);
    if (skill <= P_LAST_WEAPON || skill === P_TWO_WEAPON_COMBAT)
        return tmp;
    return ((tmp + 1) / 2) | 0;
}

/* lose_weapon_skill(n) — number of slots to lose; normally one.
 * C ref: weapon.c:1448-1469. */
export function lose_weapon_skill(n) {
    const u = game.u;
    let skill;
    const P_UNSKILLED = 1;
    while (--n >= 0) {
        if (u.weapon_slots) {
            u.weapon_slots--;
        } else if (u.skills_advanced) {
            skill = u.skill_record[--u.skills_advanced];
            if (u.weapon_skills[skill].skill <= P_UNSKILLED)
                throw new Error("panic: lose_weapon_skill (" + skill + ")");
            u.weapon_skills[skill].skill--;
            u.weapon_slots = slots_required(skill) - 1;
        }
    }
}

/* add_weapon_skill(n) — number of slots to gain; normally one.
 * C ref: weapon.c:1431-1445. */
export async function add_weapon_skill(n) {
    const u = game.u;
    let i, before = 0, after = 0;

    for (i = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            before++;

    u.weapon_slots = (u.weapon_slots | 0) + (n | 0);

    for (i = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            after++;

    if (before < after)
        await give_may_advance_msg(P_NONE);
}


/* use_skill(skill, degree) — C ref: weapon.c:1424-1434.
 * Add degree to skill's advance counter; if that causes the skill
 * to become advanceable, notify the player. */
export async function use_skill(skill, degree) {
    const u = game.u;
    if (!u.weapon_skills) return;
    const skillData = u.weapon_skills[skill];
    if (!skillData) return;
    if (skill !== P_NONE && skillData.skill !== P_ISRESTRICTED) {
        const advance_before = can_advance(skill, false);
        // P_ADVANCE is unsigned short (skills.h), including on subtraction.
        skillData.advance = (skillData.advance + degree) & 0xffff;
        if (!advance_before && can_advance(skill, false))
            await give_may_advance_msg(skill);
    }
}


/* give_may_advance_msg(skill) — C ref: weapon.c:76-84:
 *     You_feel("more confident in your %sskills.",
 *              (skill == P_NONE) ? ""
 *                  : (skill <= P_LAST_WEAPON) ? "weapon "
 *                      : (skill <= P_LAST_SPELL) ? "spell casting "
 *                          : "fighting ");
 *     (void) handle_tip(TIP_ENHANCE);
 * Both message APIs are async in JS; preserve C's sequential calls. */
async function give_may_advance_msg(skill) {
    const which = (skill === P_NONE) ? ''
                : (skill <= P_LAST_WEAPON) ? 'weapon '
                : (skill <= P_LAST_SPELL) ? 'spell casting '
                : 'fighting ';
    await pline('You feel more confident in your ' + which + 'skills.');
    await handle_tip(TIP_ENHANCE);
}

/* W_WEP bitmask for owornmask (obj.h). */
const W_WEP = 0x100;
/* HAND body part constant (bodyparts.h). */
const HAND = 6; /* bodyparts.h HAND */

/* setmnotwielded(mon, obj) — C ref: weapon.c:1808-1824.
 * Clear weapon-wielded status on an object, with artifact-light handling. */
export function setmnotwielded(mon, obj) {
    if (!obj)
        return;
    if (artifact_light(obj) && obj.lamplit) {
        end_burn(obj, false);
        if (canseemon(mon))
            pline("%s in %s %s %s shining.", The(xname(obj)),
                  s_suffix(mon_nam(mon)), mbodypart(mon, HAND),
                  otense(obj, "stop"));
    }
    if (mon && mon.mw === obj)
        mon.mw = null;
    obj.owornmask = (obj.owornmask | 0) & ~W_WEP;
}

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

/* The(str) — stub (unported helper).
 * C ref: objnam.c.
 * TODO: port when available. */
function The(str) {
    return "The " + str;
}

/* can_blnd — local implementation (C ref: mhitm.c).
 * Returns true if mdef can be blinded by magr's attack. */
function can_blnd(magr, mdef, aatyp, obj) {
    if (mdef === game.youmonst) {
        /* hero defender: check Blind state (from uprops) */
        if (game.u && game.u.uprops && game.u.uprops[BLINDED]) {
            if ((game.u.uprops[BLINDED].intrinsic & TIMEOUT) !== 0)
                return false;
        }
        return true;
    }
    if (mdef.mblinded >= 127) return false;
    if (!mdef.mcansee) return false;
    return true;
}

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

/* C polyself.c:1956-2046 mbodypart — use cmd.js's complete body-part
 * table.  The former local stub returned the enum token (for example
 * "hand") instead of the form-specific noun, silently corrupting reachable
 * grabs, bites, and limb messages for non-humanoid monsters. */
function mbodypart(mon, part) {
    return mbodypart_real(mon, part);
}

/* otense() is imported from js/objnam.js (the real objnam.c:2756 body).
 * It used to be a file-local `return verb + "s"` stub here, which is right only
 * by accident for the two verbs it was handed: "stop" -> "stops" matches, but
 * uhitm.js:3339's otense(mw_tmp, "are") produced "ares welded to ..." where C
 * prints "is welded to ..." (vtense collapses a singular "are" to "is").
 * Known shadowing class: a file-local stub shadowing a landed port. */

/* mwepgone(mon) — C ref: weapon.c
 * When a monster's weapon is gone, clear wielded state and set weapon_check. */
export function mwepgone(mon) {
    let mwep = sr_MON_WEP(mon);
    if (mwep) {
        setmnotwielded(mon, mwep);
        mon.weapon_check = 1;  /* NEED_WEAPON */
    }
}

/* special_dmgval(magr, mdef, armask, silverhit_p) — C ref: weapon.c:360-432.
 * objects[].oc_material SILVER = 14 (objclass.h). */
const SPD_SILVER = 14;

function _spd_is_you(mon) {
    return mon === game.youmonst
        || (game.youmonst && mon.m_id === game.youmonst.m_id);
}
function _spd_which_armor(mon, flag) {
    if (_spd_is_you(mon)) {
        const u = game.u;
        switch (flag) {
        case W_ARM:  return u.uarm  || null;
        case W_ARMC: return u.uarmc || null;
        case W_ARMH: return u.uarmh || null;
        case W_ARMS: return u.uarms || null;
        case W_ARMG: return u.uarmg || null;
        case W_ARMF: return u.uarmf || null;
        case W_ARMU: return u.uarmu || null;
        default: return null; /* impossible("bad flag in which_armor") */
        }
    }
    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        if ((obj.owornmask | 0) & flag) return obj;
    }
    return null;
}

export function special_dmgval(magr, mdef, armask, silverhit_p) {
    const left_ring = (armask & W_RINGL) ? true : false;
    const right_ring = (armask & W_RINGR) ? true : false;
    let silverhit = 0;
    let bonus = 0;

    let obj = null;
    if (armask & (W_ARMC | W_ARM | W_ARMU)) {
        if ((armask & W_ARMC) !== 0 && (obj = _spd_which_armor(magr, W_ARMC)) != null)
            armask = W_ARMC;
        else if ((armask & W_ARM) !== 0 && (obj = _spd_which_armor(magr, W_ARM)) != null)
            armask = W_ARM;
        else if ((armask & W_ARMU) !== 0 && (obj = _spd_which_armor(magr, W_ARMU)) != null)
            armask = W_ARMU;
        else
            armask = 0;
    } else if (armask & (W_ARMG | W_RINGL | W_RINGR)) {
        armask = ((obj = _spd_which_armor(magr, W_ARMG)) != null) ? W_ARMG : 0;
    } else {
        obj = _spd_which_armor(magr, armask);
    }

    if (obj) {
        if ((obj.blessed | 0) && mon_hates_blessings(mdef))
            bonus += rnd(4);
        if ((MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) === SPD_SILVER
            && mon_hates_silver(mdef)) {
            bonus += rnd(20);
            silverhit |= armask;
        }
    } else if ((left_ring || right_ring) && _spd_is_you(magr)) {
        const u = game.u;
        if (left_ring && u.uleft) {
            if ((MKOBJ_OC_MATERIAL[u.uleft.otyp | 0] | 0) === SPD_SILVER
                && mon_hates_silver(mdef)) {
                bonus += rnd(20);
                silverhit |= W_RINGL;
            }
        }
        if (right_ring && u.uright) {
            if ((MKOBJ_OC_MATERIAL[u.uright.otyp | 0] | 0) === SPD_SILVER
                && mon_hates_silver(mdef)) {
                if (!(silverhit & W_RINGL))
                    bonus += rnd(20);
                silverhit |= W_RINGR;
            }
        }
    }

    if (silverhit_p)
        silverhit_p.value = silverhit;
    return bonus;
}

/* ── select_rwep: select a ranged weapon for a monster (weapon.c:532) ──
 * Object-type constants (objects.h ordering; cross-checked against
 * MKOBJ_OC_CLASS / MKOBJ_OC_SKILL). */
const SR_ARROW = 18, SR_ELVEN_ARROW = 19, SR_ORCISH_ARROW = 20,
      SR_SILVER_ARROW = 21, SR_YA = 22, SR_CROSSBOW_BOLT = 23, SR_DART = 24,
      SR_SHURIKEN = 25, SR_SPEAR = 27, SR_ELVEN_SPEAR = 28, SR_ORCISH_SPEAR = 29,
      SR_DWARVISH_SPEAR = 30, SR_SILVER_SPEAR = 31, SR_JAVELIN = 32,
      SR_DAGGER = 34, SR_ELVEN_DAGGER = 35, SR_ORCISH_DAGGER = 36,
      SR_SILVER_DAGGER = 37, SR_KNIFE = 40,
      SR_PARTISAN = 59, SR_RANSEUR = 60, SR_SPETUM = 61, SR_GLAIVE = 62,
      SR_HALBERD = 63, SR_BARDICHE = 64, SR_VOULGE = 65, SR_FAUCHARD = 66,
      SR_GUISARME = 67, SR_BILL_GUISARME = 68, SR_LUCERN_HAMMER = 69,
      SR_BEC_DE_CORBIN = 70, SR_LANCE = 72, SR_AKLYS = 80,
      SR_BOW = 83, SR_ELVEN_BOW = 84, SR_ORCISH_BOW = 85, SR_YUMI = 86,
      SR_SLING = 87, SR_CROSSBOW = 88,
      SR_LUCKSTONE = 470, SR_LOADSTONE = 471, SR_FLINT = 473, SR_ROCK = 474,
      SR_BOULDER = 475, SR_CORPSE = 265, SR_EGG = 266,
      /* objects.h:1100 CREAM_PIE = 287; was 286 = LUMP_OF_ROYAL_JELLY */
      SR_CREAM_PIE = 287;
const SR_GEM_CLASS = 13;
const SR_S_KOP = 37;              /* monsym.h S_KOP */
const SR_NON_PM = -1;
const SR_NO_WEAPON_WANTED = 0;    /* objclass.h */
const SR_W_ARMS = 0x00000008;     /* worn shield */
const SR_W_WEP = 0x00000100;      /* prop.h W_WEP — wielded weapon worn mask */
const SR_SILVER = 14;             /* objects.h SILVER material */
const SR_ART_SNICKERSNEE = 19;    /* artilist.h index */
/* skills (skills.h) */
const SR_P_BOW = 20, SR_P_SLING = 21, SR_P_CROSSBOW = 22;
/* monflag.h flag bits */
const SR_M1_MINDLESS = 0x00010000, SR_M1_ANIMAL = 0x00040000;
const SR_M2_STRONG = 0x04000000, SR_M2_ROCKTHROW = 0x08000000,
      SR_M2_JEWELS = 0x20000000;

/* weapon.c:498 rwep[] — most-potent-first ranged weapon list. */
const SR_rwep = [
    SR_DWARVISH_SPEAR, SR_SILVER_SPEAR, SR_ELVEN_SPEAR, SR_SPEAR, SR_ORCISH_SPEAR,
    SR_JAVELIN, SR_SHURIKEN, SR_YA, SR_SILVER_ARROW, SR_ELVEN_ARROW, SR_ARROW,
    SR_ORCISH_ARROW, SR_CROSSBOW_BOLT, SR_SILVER_DAGGER, SR_ELVEN_DAGGER,
    SR_DAGGER, SR_ORCISH_DAGGER, SR_KNIFE, SR_FLINT, SR_ROCK, SR_LOADSTONE,
    SR_LUCKSTONE, SR_DART, SR_CREAM_PIE,
];
/* weapon.c:506 pwep[] — polearms. */
const SR_pwep = [
    SR_HALBERD, SR_BARDICHE, SR_SPETUM, SR_BILL_GUISARME, SR_VOULGE, SR_RANSEUR,
    SR_GUISARME, SR_GLAIVE, SR_LUCERN_HAMMER, SR_BEC_DE_CORBIN, SR_FAUCHARD,
    SR_PARTISAN, SR_LANCE,
];
/* weapon.c:512-517 arwep[] — throw-and-return weapons. AKLYS_LIM = BOLT_LIM/2
 * = 4, range = AKLYS_LIM^2 = 16. */
const SR_arwep = [{ otyp: SR_AKLYS, range: 16 }];
/* oc_bimanual is true for every polearm except the lance (objects.h `bi`
 * field); the aklys is not bimanual. */
const SR_BIMANUAL = new Set([
    SR_PARTISAN, SR_RANSEUR, SR_SPETUM, SR_GLAIVE, SR_HALBERD, SR_BARDICHE,
    SR_VOULGE, SR_FAUCHARD, SR_GUISARME, SR_BILL_GUISARME, SR_LUCERN_HAMMER,
    SR_BEC_DE_CORBIN,
]);
function sr_oc_bimanual(otyp) { return SR_BIMANUAL.has(otyp | 0) ? 1 : 0; }
function sr_oc_material(otyp) { return MKOBJ_OC_MATERIAL[otyp | 0] | 0; }
function sr_oc_skill(otyp) { return MKOBJ_OC_SKILL[otyp | 0] | 0; }
/* mondata.h flag macros (read mon->data->mflags{1,2}). */
function sr_throws_rocks(data) { return ((data.mflags2 | 0) & SR_M2_ROCKTHROW) !== 0; }
function sr_strongmonst(data) { return ((data.mflags2 | 0) & SR_M2_STRONG) !== 0; }
function sr_mindless(data)     { return ((data.mflags1 | 0) & SR_M1_MINDLESS) !== 0; }
function sr_is_animal(data)    { return ((data.mflags1 | 0) & SR_M1_ANIMAL) !== 0; }
function sr_likes_gems(data)   { return ((data.mflags2 | 0) & SR_M2_JEWELS) !== 0; }
/* mondata.h:touch_petrifies(ptr): cockatrice or chickatrice. */
function sr_touch_petrifies(corpsenm) {
    return corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;
}
/* is_art(otmp, art): artifact.h — otmp is that specific artifact. */
function sr_is_art(otmp, art) {
    return !!otmp && (otmp.oartifact | 0) === art;
}
function sr_MON_WEP(mtmp) {
    for (let o = mtmp.minvent; o; o = o.nobj)
        if (((o.owornmask | 0) & SR_W_WEP) !== 0)
            return o;
    return null;
}

/* weapon.c:475 oselect — pick the first minvent obj of a given type the
 * monster can safely wield/throw (file-static helper of select_rwep). */
async function oselect(mtmp, type) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) !== (type | 0))
            continue;
        /* never select non-cockatrice corpses */
        if ((type === SR_CORPSE || type === SR_EGG)
            && ((otmp.corpsenm | 0) === SR_NON_PM
                || !sr_touch_petrifies(otmp.corpsenm | 0)))
            continue;
        if (!await can_touch_safely(mtmp, otmp))
            continue;
        return otmp;
    }
    return null;
}

const SR_hands_obj = {}; /* &hands_obj sentinel: "doesn't need a propellor" */
/* C's gp.propellor (weapon.c:531) — a global that select_rwep writes and
 * mon_wield_item's NEED_RANGED_WEAPON case reads back as the object to WIELD
 * (the bow/sling/crossbow, not the missile).  It was a function-local here, so
 * that case had no way to see it. */
let SR_propellor = null;
export async function select_rwep(mtmp) {
    let otmp;
    const mlet = mtmp.data.mlet;

    SR_propellor = SR_hands_obj;
    if ((otmp = await oselect(mtmp, SR_EGG)) != null) /* cockatrice egg */
        return otmp;
    if (mlet === SR_S_KOP) /* pies are first choice for Kops */
        if ((otmp = await oselect(mtmp, SR_CREAM_PIE)) != null)
            return otmp;
    if (sr_throws_rocks(mtmp.data)) /* ...boulders for giants */
        if ((otmp = await oselect(mtmp, SR_BOULDER)) != null)
            return otmp;

    const mwep = sr_MON_WEP(mtmp);
    /* NO_WEAPON_WANTED means we already tried to wield and failed */
    const mweponly = mwelded(mwep) && (mtmp.weapon_check | 0) === SR_NO_WEAPON_WANTED;
    if (dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 13
        && couldsee(mtmp.mx, mtmp.my)) {
        if (sr_is_art(mwep, SR_ART_SNICKERSNEE)) {
            SR_propellor = mwep;
            return mwep;
        }

        for (let i = 0; i < SR_pwep.length; i++) {
            if (((sr_strongmonst(mtmp.data)
                  && ((mtmp.misc_worn_check | 0) & SR_W_ARMS) === 0)
                 || !sr_oc_bimanual(SR_pwep[i]))
                && (sr_oc_material(SR_pwep[i]) !== SR_SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = await oselect(mtmp, SR_pwep[i])) != null
                    && (otmp === mwep || !mweponly)) {
                    SR_propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }
    /* Next, try to select a throw-and-return weapon. */
    for (let i = 0; i < SR_arwep.length; i++) {
        const arw = SR_arwep[i];

        if (!sr_mindless(mtmp.data) && !sr_is_animal(mtmp.data) && !mweponly
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= arw.range
            && couldsee(mtmp.mx, mtmp.my)) {
            if ((((mtmp.misc_worn_check | 0) & SR_W_ARMS) === 0
                 || !sr_oc_bimanual(arw.otyp))
                && (sr_oc_material(arw.otyp) !== SR_SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = await oselect(mtmp, arw.otyp)) != null
                    && (otmp === mwep || !mweponly)) {
                    SR_propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }

    /* other than the specific cases above, always select the most potent
     * ranged weapon to hand. */
    for (let i = 0; i < SR_rwep.length; i++) {
        /* shooting gems from slings; this goes just before the darts */
        if (SR_rwep[i] === SR_DART && !sr_likes_gems(mtmp.data)
            && m_carrying(mtmp, SR_SLING)) { /* SR_propellor */
            for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
                if ((otmp.oclass | 0) === SR_GEM_CLASS
                    && ((otmp.otyp | 0) !== SR_LOADSTONE || !(otmp.cursed | 0))) {
                    SR_propellor = m_carrying(mtmp, SR_SLING);
                    return otmp;
                }
        }

        /* KMH -- This belongs here so darts will work */
        SR_propellor = SR_hands_obj;

        const prop = sr_oc_skill(SR_rwep[i]);
        if (prop < 0) {
            switch (-prop) {
            case SR_P_BOW:
                SR_propellor = await oselect(mtmp, SR_YUMI);
                if (!SR_propellor)
                    SR_propellor = await oselect(mtmp, SR_ELVEN_BOW);
                if (!SR_propellor)
                    SR_propellor = await oselect(mtmp, SR_BOW);
                if (!SR_propellor)
                    SR_propellor = await oselect(mtmp, SR_ORCISH_BOW);
                break;
            case SR_P_SLING:
                SR_propellor = await oselect(mtmp, SR_SLING);
                break;
            case SR_P_CROSSBOW:
                SR_propellor = await oselect(mtmp, SR_CROSSBOW);
            }
            if ((otmp = sr_MON_WEP(mtmp)) && mwelded(otmp) && otmp !== SR_propellor
                && (mtmp.weapon_check | 0) === SR_NO_WEAPON_WANTED)
                SR_propellor = null;
        }
        /* SR_propellor = obj, SR_propellor to use
         * SR_propellor = &hands_obj, doesn't need a SR_propellor
         * SR_propellor = 0, needed one and didn't have one */
        if (SR_propellor != null) {
            if (SR_rwep[i] !== SR_LOADSTONE) {
                /* Don't throw a cursed weapon-in-hand or an artifact */
                if ((otmp = await oselect(mtmp, SR_rwep[i])) && !(otmp.oartifact | 0)
                    && !(otmp === sr_MON_WEP(mtmp) && mwelded(otmp)))
                    return otmp;
            } else {
                for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
                    if ((otmp.otyp | 0) === SR_LOADSTONE && !(otmp.cursed | 0))
                        return otmp;
                }
            }
        }
    }

    /* failure */
    return null;
}

/* ── select_hwep / mon_wield_item (weapon.c:691-933) ────────────────────────
 * The hand-to-hand half of the monster weapon code, the mirror of select_rwep
 * above and sharing its helpers (oselect, sr_MON_WEP, sr_strongmonst,
 * sr_oc_material, mwelded, m_carrying, which_armor).
 *
 * Object-type constants not already in the SR_ block; the otyp space is
 * js/o_init.js's (getObjName), cross-checked name-by-name against the
 * objects.h ordering.  PICK_AXE/UNICORN_HORN/CORPSE are TOOL/FOOD entries and
 * so are quoted from the values js/dig.js:41, js/makemon.js:1889 and
 * js/display.js:69 already use. */
const SH_TSURUGI = 57, SH_RUNESWORD = 58, SH_DWARVISH_MATTOCK = 71,
      SH_TWO_HANDED_SWORD = 55, SH_BATTLE_AXE = 45, SH_KATANA = 56,
      SH_UNICORN_HORN = 261, SH_CRYSKNIFE = 43, SH_TRIDENT = 33,
      SH_LONG_SWORD = 54, SH_ELVEN_BROADSWORD = 53, SH_BROADSWORD = 52,
      SH_SCIMITAR = 50, SH_SILVER_SABER = 51, SH_MORNING_STAR = 75,
      SH_ELVEN_SHORT_SWORD = 47, SH_DWARVISH_SHORT_SWORD = 49,
      SH_SHORT_SWORD = 46, SH_ORCISH_SHORT_SWORD = 48, SH_SILVER_MACE = 74,
      SH_MACE = 73, SH_AXE = 44, SH_FLAIL = 81, SH_BULLWHIP = 82,
      SH_QUARTERSTAFF = 79, SH_CLUB = 77, SH_PICK_AXE = 259,
      SH_RUBBER_HOSE = 78, SH_WAR_HAMMER = 76, SH_ATHAME = 38,
      SH_SCALPEL = 39, SH_WORM_TOOTH = 42;
const SH_W_ARMG = 0x00000010;        /* prop.h W_ARMG — worn gloves */
const SH_M2_GIANT = 0x00000400;      /* monflag.h M2_GIANT */
/* monst.h enum wpn_chk_flags (js/const.js:2689-2696 carries the same values). */
const SH_NO_WEAPON_WANTED = 0, SH_NEED_WEAPON = 1, SH_NEED_HTH_WEAPON = 3,
      SH_NEED_RANGED_WEAPON = 2, SH_NEED_PICK_AXE = 4, SH_NEED_AXE = 5,
      SH_NEED_PICK_OR_AXE = 6;

/* weapon.c:691-701 hwep[] — hand-to-hand weapons in order of preference. */
const SH_hwep = [
    SR_CORPSE, /* cockatrice corpse */
    SH_TSURUGI, SH_RUNESWORD, SH_DWARVISH_MATTOCK, SH_TWO_HANDED_SWORD,
    SH_BATTLE_AXE, SH_KATANA, SH_UNICORN_HORN, SH_CRYSKNIFE, SH_TRIDENT,
    SH_LONG_SWORD, SH_ELVEN_BROADSWORD, SH_BROADSWORD, SH_SCIMITAR,
    SH_SILVER_SABER, SH_MORNING_STAR, SH_ELVEN_SHORT_SWORD,
    SH_DWARVISH_SHORT_SWORD, SH_SHORT_SWORD, SH_ORCISH_SHORT_SWORD,
    SH_SILVER_MACE, SH_MACE, SH_AXE, SR_DWARVISH_SPEAR, SR_SILVER_SPEAR,
    SR_ELVEN_SPEAR, SR_SPEAR, SR_ORCISH_SPEAR, SH_FLAIL, SH_BULLWHIP,
    SH_QUARTERSTAFF, SR_JAVELIN, SR_AKLYS, SH_CLUB, SH_PICK_AXE,
    SH_RUBBER_HOSE, SH_WAR_HAMMER, SR_SILVER_DAGGER, SR_ELVEN_DAGGER,
    SR_DAGGER, SR_ORCISH_DAGGER, SH_ATHAME, SH_SCALPEL, SR_KNIFE,
    SH_WORM_TOOTH,
];
/* objects.h `bi` field, extracted from the WEAPON()/WEPTOOL() rows.  Five of
 * these are WEAPON_CLASS; the unicorn horn is a WEPTOOL (TOOL_CLASS) and was
 * missed by a first pass that only read WEAPON() rows — its row is
 * `WEPTOOL("unicorn horn", NoDes, 1, 1, 1, 0, 20, ...)`, `bi` (4th field) is
 * 1, so it IS bimanual.  The pick-axe is also a WEPTOOL but its `bi` is 0.
 * (objects.h:1013-1016; verified against the WEPTOOL() macro at objects.h:892
 * which maps positional args to kn,mgc,bi,prob,wt,... — so the 3rd numeric
 * field after the two description strings is `bi`.) */
const SH_BIMANUAL = new Set([
    SH_TSURUGI, SH_DWARVISH_MATTOCK, SH_TWO_HANDED_SWORD, SH_BATTLE_AXE,
    SH_QUARTERSTAFF, SH_UNICORN_HORN,
]);
function sh_oc_bimanual(otyp) { return SH_BIMANUAL.has(otyp | 0); }
/* mondata.h:107 is_giant(ptr) — M2_GIANT. */
function sh_is_giant(data) { return ((data?.mflags2 | 0) & SH_M2_GIANT) !== 0; }
function sh_resists_ston(mtmp) { return resists_ston_real(mtmp); }

/* weapon.c:704 select_hwep — select a hand to hand weapon for the monster. */
export async function select_hwep(mtmp) {
    let otmp;
    const strong = sr_strongmonst(mtmp.data);
    const wearing_shield = ((mtmp.misc_worn_check | 0) & SR_W_ARMS) !== 0;

    /* prefer artifacts to everything else */
    for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === OCLASS_WEAPON_SH && (otmp.oartifact | 0)
            && await touch_artifact_sh(otmp, mtmp)
            && ((strong && !wearing_shield) || !sh_oc_bimanual(otmp.otyp)))
            return otmp;
    }

    if (sh_is_giant(mtmp.data)) { /* giants just love to use clubs */
        if ((otmp = await oselect(mtmp, SH_CLUB)) != null) return otmp;
    } else if ((mtmp.mnum | 0) === PM_BALROG && game.u?.uwep) {
        if ((otmp = await oselect(mtmp, SH_BULLWHIP)) != null) return otmp;
    }

    /* only strong monsters can wield big (esp. long) weapons */
    /* big weapon is basically the same as bimanual */
    /* all monsters can wield the remaining weapons */
    for (let i = 0; i < SH_hwep.length; i++) {
        if (SH_hwep[i] === SR_CORPSE && ((mtmp.misc_worn_check | 0) & SH_W_ARMG) === 0
            && !sh_resists_ston(mtmp))
            continue;
        if (((strong && !wearing_shield) || !sh_oc_bimanual(SH_hwep[i]))
            && (sr_oc_material(SH_hwep[i]) !== SR_SILVER
                || !mon_hates_silver(mtmp))) {
            if ((otmp = await oselect(mtmp, SH_hwep[i])) != null) return otmp;
        }
    }

    /* failure */
    return null;
}
const OCLASS_WEAPON_SH = 2; /* objclass.h WEAPON_CLASS */
async function touch_artifact_sh(otmp, _mtmp) {
    return await touch_artifact_real(otmp, _mtmp);
}

/* weapon.c:797-933 mon_wield_item — let a monster try to wield a weapon, based
 * on mon->weapon_check.  Returns 1 if the monster took time to do it, 0 if it
 * did not.  RNG-free in C, and RNG-free here: its whole effect on a replay is
 * the "%s wields %s!" topline plus the control-flow return that makes
 * mattackm() (mhitm.c:408-412) and dochug() (monmove.c:857) abandon the rest
 * of the monster's action for this move. */
export async function mon_wield_item(mon) {
    let obj;
    let exclaim = true; /* assume mon is planning to attack */

    /* This case actually should never happen */
    if ((mon.weapon_check | 0) === SH_NO_WEAPON_WANTED)
        return 0;
    switch (mon.weapon_check | 0) {
    case SH_NEED_HTH_WEAPON:
        obj = await select_hwep(mon);
        break;
    case SH_NEED_RANGED_WEAPON:
        await select_rwep(mon); /* C: (void) select_rwep(mon) — called for its gp.propellor side effect */
        obj = SR_propellor;
        break;
    case SH_NEED_PICK_AXE:
        obj = m_carrying(mon, SH_PICK_AXE);
        /* KMH -- allow other picks */
        if (!obj && !which_armor(mon, SR_W_ARMS))
            obj = m_carrying(mon, SH_DWARVISH_MATTOCK);
        exclaim = false; /* mon is just planning to dig */
        break;
    case SH_NEED_AXE:
        /* currently, only 2 types of axe */
        obj = m_carrying(mon, SH_BATTLE_AXE);
        if (!obj || which_armor(mon, SR_W_ARMS))
            obj = m_carrying(mon, SH_AXE);
        exclaim = false;
        break;
    case SH_NEED_PICK_OR_AXE:
        /* prefer pick for fewer switches on most levels */
        obj = m_carrying(mon, SH_DWARVISH_MATTOCK);
        if (!obj)
            obj = m_carrying(mon, SH_BATTLE_AXE);
        if (!obj || which_armor(mon, SR_W_ARMS)) {
            obj = m_carrying(mon, SH_PICK_AXE);
            if (!obj)
                obj = m_carrying(mon, SH_AXE);
        }
        exclaim = false;
        break;
    default:
        impossible(`weapon_check ${mon.weapon_check} for ${mon_nam(mon)}?`);
        return 0;
    }
    if (obj && obj !== SR_hands_obj) {
        const mw_tmp = sr_MON_WEP(mon);

        if (mw_tmp && (mw_tmp.otyp | 0) === (obj.otyp | 0)) {
            /* already wielding it */
            mon.weapon_check = SH_NEED_WEAPON;
            return 0;
        }
        /* Actually, this isn't necessary--as soon as the monster
         * wields the weapon, the weapon welds itself, so the monster
         * can know it's cursed and needn't even bother trying.
         * Still....
         */
        if (mw_tmp && mwelded(mw_tmp)) {
            if (canseemon(mon)) {
                let mon_hand = mbodypart(mon, HAND);
                if (sh_oc_bimanual(mw_tmp.otyp)) mon_hand = makeplural(mon_hand);
                const welded_buf = `${otense(mw_tmp, 'are')} welded to ${mhis_sh(mon)} ${mon_hand}`;

                if ((obj.otyp | 0) === SH_PICK_AXE) {
                    pline(`Since ${s_suffix(mon_nam(mon))} weapon${(mw_tmp.quan | 0) !== 1 ? 's' : ''} ${welded_buf},`);
                    pline(`${mon_nam(mon)} cannot wield that ${xname(obj)}.`);
                } else {
                    pline(`${Monnam(mon)} tries to wield ${doname_sh(obj)}.`);
                    pline(`${Yname2_sh(mw_tmp, mon)} ${welded_buf}!`);
                }
                mw_tmp.bknown = 1;
            }
            mon.weapon_check = SH_NO_WEAPON_WANTED;
            return 1;
        }
        mon.mw = obj; /* wield obj */
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = SH_NEED_WEAPON;
        obj.owornmask = SR_W_WEP;
        if (canseemon(mon)) {
            const _wieldLine = `${Monnam(mon)} wields ${doname_sh(obj)}${exclaim ? '!' : '.'}`;
            /* C weapon.c:905-918 — a cursed weapon welds as it is picked up.
             * Set W_WEP below before testing mwelded(), then retain the
             * second pline on the same topline as the wield announcement. */
            if (mwelded(obj)) {
                let mon_hand = mbodypart(mon, HAND);
                if (sh_oc_bimanual(obj.otyp)) mon_hand = makeplural(mon_hand);
                pline(_wieldLine);
                pline(`${Tobjnam_sh(obj, 'weld')} ${(obj.quan | 0) !== 1 ? 'themselves' : 'itself'} to ${s_suffix(mon_nam(mon))} ${mon_hand}!`);
            } else {
                pline(_wieldLine);
            }
        }
        return 1;
    }
    mon.weapon_check = SH_NEED_WEAPON;
    return 0;
}
/* Naming helpers for the three plines above; mon_nam()/Monnam() are the ported
 * do_name.c namers already defined near the top of this file. */
function mhis_sh(mon) {
    /* weapon.c:869 mhis(mon) == genders[pronoun_gender(mon, PRONOUN_HALLU)].his */
    return mhis_mon(mon);
}
function Yname2_sh(obj, carrier) {
    /* objnam.c:2377 Yname2 = highc(yname(obj)); yname's shk_your() (shk.c:5862)
     * takes mon_owns() (shk.c:5902) for an OBJ_MINVENT object: the prefix is
     * s_suffix(y_monnam(obj->ocarry)) -- "the ogre's club", not "the club". */
    let s;
    if ((obj.where | 0) === 4 || carrier) {
        s = `${s_suffix(mon_nam(obj.ocarry || carrier))} ${cxname_sh(obj)}`;
    } else {
        s = yname(obj);
    }
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function doname_sh(obj) {
    return _drop_doname(obj);
}

/* weapon.c:680 monmightthrowwep — is 'obj' a type of weapon that any monster
 * knows how to throw? */
export function monmightthrowwep(obj) {
    for (let idx = 0; idx < SR_rwep.length; ++idx)
        if (obj.otyp === SR_rwep[idx])
            return true;
    return false;
}

function mhitm_mgc_atk_negated(magr, mdef, strict) {
    /* C uhitm.c:83-84 — mcan doesn't apply to youmonst; hero can't be
     * cancelled, so this arm draws NO RNG (short-circuits before armpro). */
    if (magr !== game.youmonst && magr.mcan)
        return true;
    const armpro = magic_negation(mdef);
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        /* C uhitm.c:88-93 — display-only, RNG-free. */
        if (strict) {
            if (mdef === game.youmonst)
                You('avoid harm.');
            else if (game.vis && canseemon(mdef))
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

const AD_PLYS = 14;
const AD_SLEE = 4;
const AD_STCK = 19;
const AD_LEGS = 17;
const AD_HEAL = 27;
const AD_ENCH = 41;

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
            mhm.damage += mdef.mblinded;
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

            if (game.vis && mdef.mcansee && canspotmon(mdef)) {
                let buf = Monnam(mdef) + " is blinded";
                if (mdef.data && mdef.data.pmidx === PM_ARCHON && canseemon(mdef))
                    buf += " by " + s_suffix(mon_nam(magr)) + " radiance";
                pline(buf + ".");
            }
            rnd_tmp = d(mattk.damn, mattk.damd);
            if ((rnd_tmp += mdef.mblinded) > 127)
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
            if (_hero_resists_compat(FREE_ACTION, 'Free_action')) {
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
            if (game.vis && canspotmon(mdef)) {
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
            await fall_asleep_real(-rnd(10), true);
            if (_uh_Blind())
                You("are put to sleep!");
            else
                You("are put to sleep by %s!", mon_nam(magr));
        }
    } else {
        /* mhitm */
        if (!mdef.msleeping && await sleep_monst(mdef, rnd(10), -1)
            && await sleep_monst(mdef, rnd(10), -1)) {
            if (game.vis && canspotmon(mdef)) {
                let buf = Monnam(mdef);
                pline("%s is put to sleep by %s.", buf, mon_nam(magr));
            }
            mdef.mstrategy &= ~STRAT_WAITFORU;
            await slept_monst(mdef);
        }
    }
}

const AD_STON = 18;
const AD_SLOW = 13;
const NEW_MOON = 0;
const M_ATTK_HIT = 0x01;

/* mhitm_ad_slow — slow down the defender.
 * Port of nethack-c/src/uhitm.c:mhitm_ad_slow. */
export async function mhitm_ad_slow(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false);

    if (defended(mdef, AD_SLOW))
        return;

    if (magr === game.youmonst) {
        /* uhitm */
        if (!negated && mdef.mspeed !== 1 /* MSLOW */) {
            const oldspeed = mdef.mspeed;

            mon_adjust_speed(mdef, -1, null);
            if (mdef.mspeed !== oldspeed && canseemon(mdef))
                pline("%s slows down.", Monnam(mdef));
        }
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk);
        if (!negated && game.u && game.u.uhave && game.u.uhave.HFast && !rn2(4))
            u_slow_down();
    } else {
        /* mhitm */
        if (!negated && mdef.mspeed !== 1 /* MSLOW */) {
            const oldspeed = mdef.mspeed;

            mon_adjust_speed(mdef, -1, null);
            mdef.mstrategy &= ~STRAT_WAITFORU;
            if (mdef.mspeed !== oldspeed && game.vis && canspotmon(mdef))
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
function resists_fire(mon) {
    if (!mon) return false;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_FIRE) !== 0;
}

/* on_fire: C ref mhitm.c — returns "on fire" or flaming-monster variant.
 * Ported locally because the mhitm.js import can't resolve pd.pmidx. */
function on_fire_local(pd, mattk) {
    if (!pd) return "on fire";
    /* C: if completelyburns(pd) return "burning"; else return "on fire"; */
    /* But C also checks for fire-based monsters that are already "burning" */
    return "on fire";
}

/* C mon.c:5668-5704 golemeffects(mon, adtyp, dam) — elemental damage can
 * heal or slow flesh and iron golems.  RNG-free and synchronous on this path. */
function golemeffects(mon, adtyp, dmg) {
    const pmidx = mon?.data ? (mon.data.pmidx | 0) : -1;
    let heal = 0, slow = false;
    if (pmidx === PM_FLESH_GOLEM) {
        if (adtyp === AD_ELEC) heal = Math.trunc(((dmg | 0) + 5) / 6);
        else if (adtyp === AD_FIRE || adtyp === AD_COLD) slow = true;
    } else if (pmidx === PM_IRON_GOLEM) {
        if (adtyp === AD_ELEC) slow = true;
        else if (adtyp === AD_FIRE) heal = dmg | 0;
    } else return;
    if (slow && (mon.mspeed | 0) !== 1 /* MSLOW */)
        mon_adjust_speed(mon, -1, null);
    if (heal && healmon(mon, heal, 0) && cansee(mon.mx | 0, mon.my | 0))
        pline(`${Monnam(mon)} seems healthier.`);
}
function mlifesaver(mon) {
    /* C mon.c:2827: locate a worn amulet of life saving.  The monster
     * equipment model exposes the same worn-mask walk through which_armor(). */
    const amulet = which_armor(mon, W_AMUL);
    return (amulet && (amulet.otyp | 0) === 202) ? amulet : null;
}
/* C mon.c:3364-3384 monkilled() — the monster-death sequence is shared with
 * trap kills; route this local combat helper through that canonical body. */
async function monkilled(mon, msg, adtyp) {
    return await monkilled_trap(mon, msg);
}
/* DEADMONSTER: C macro — true if monster is dead (mhp < 1) */
function DEADMONSTER(mon) { return (mon.mhp | 0) < 1; }
/* C timeout.c:448-452.  The canonical async body is exported by mcastu.js;
 * this caller is already async, so preserve the cure and its message rather
 * than silently dropping it through the old local no-op. */
/* completelyrusts: C macro — true for iron golems */
function completelyrusts(pd) {
    if (!pd) return false;
    return (pd.pmidx === PM_IRON_GOLEM);
}

/* AD_FIRE constant */
const AD_FIRE = 2;

/* AD_RUST constant */
const AD_RUST = 24;

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
            if (game.vis && canseemon(mdef))
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
        hitmsg_je(magr, mattk);
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
        if (game.vis && canseemon(mdef))
            pline_mon(mdef, "%s is %s!", Monnam(mdef), on_fire_local(pd, mattk));
        if (completelyburns(pd)) { /* paper golem or straw golem */
            if (game.vis && canseemon(mdef))
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
            if (game.vis && canseemon(mdef))
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
const AD_COLD = 3;
const MR_COLD = 0x02;

/* resists_cold: C macro monst.h:273 resists_cold(mon) = Resists_Elem(mon,
 * COLD_RES) — same mon_resistancebits fix as resists_fire above. */
function resists_cold(mon) {
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
        if (game.vis && canseemon(mdef))
            pline_mon(mdef, "%s is covered in frost!", Monnam(mdef));
        if (resists_cold(mdef) || defended(mdef, AD_COLD)) {
            if (game.vis && canseemon(mdef))
                pline_The("frost doesn't seem to chill %s!", mon_nam(mdef));
            shieldeff(mdef.mx, mdef.my);
            golemeffects(mdef, AD_COLD, mhm.damage);
            mhm.damage = 0;
        }
        mhm.damage += (await destroy_items_mon_zap(mdef, AD_COLD, orig_dmg));
    }
}

/* AD_ELEC constant */
const AD_ELEC = 6;
const MR_ELEC = 0x10;

function resists_elec(mon) {
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
        if (game.vis && canseemon(mdef))
            pline_mon(mdef, "%s gets zapped!", Monnam(mdef));
        if (resists_elec(mdef) || defended(mdef, AD_ELEC)) {
            if (game.vis && canseemon(mdef))
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
                    if (do_stone_u(magr)) {
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

/* pline_mon — C: pline with monster attribution */
function pline_mon(mtmp, fmt, ...args) {
    pline(fmt, ...args);
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
        if (magr.mcan || (Upolyd(game.u) && (mdef.mndx === PM_COCKATRICE || mdef.mndx === PM_CHICKATRICE))) {
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

/* C teleport.c:2261-2292 — use the canonical monster-teleport body. */
async function u_teleport_mon(mdef, give_feedback) {
    return await u_teleport_mon_real(mdef, give_feedback);
}

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
            if (game.vis)
                pline_mon(mdef, "%s is not affected.", Monnam(mdef));
        } else {
            let mdef_Monnam;
            let wasseen = canspotmon(mdef);
            /* save the name before monster teleports */
            if (game.vis && wasseen)
                mdef_Monnam = Monnam(mdef);
            mdef.mstrategy &= ~STRAT_WAITFORU;
            await rloc(mdef, RLOC_NOMSG);
            if (game.vis && wasseen && !canspotmon(mdef) && mdef != game.u.usteed)
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
                /* C: pline("%s less effective.", Yobjnam2(obj, "seem"));
                 * KNOWN GAP: Yobjnam2 is not ported here; message omitted.
                 * C draws no RNG on this line. */
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
/* C mondata.c:200-211 resists_drli(mon). */
function resists_drli_deth(mon) {
    const ptr = mon.data;
    if (is_undead_deth(ptr) || is_demon(ptr) || is_were_deth(ptr)
        || (mon === game.youmonst && ((game.u?.ulycn ?? -1) | 0) >= 0)
        || ptr.pmidx === PM_DEATH || is_vampshifter_deth(mon))
        return true;
    return defended(mon, AD_DRLI);
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
        if (!rn2(3) && !(resists_drli_deth(mdef) || defended(mdef, AD_DRLI))
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
            || (!rn2(3) && !(resists_drli_deth(mdef) || defended(mdef, AD_DRLI))
                && !mhitm_mgc_atk_negated(magr, mdef, true))) {
            if (!is_death) /* Stormbringer uses monhp_per_lvl (1d8) */
                mhm.damage = d(2, 6);
            if (game.vis && canspotmon(mdef))
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
    if (magr !== game.youmonst)
        return; /* mhitu/mhitm arms out of scope for do_attack; see above */
    if (negated)
        return; /* physical damage only */
    if (!rn2(4) && !slimeproof(mdef?.data)) {
        /* munslime(mdef, TRUE) -- no js/ body; modelled as always FALSE. */
        if (!DEADMONSTER(mdef)) {
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
const AD_DRST = 7, AD_DRDX = 30, AD_DRCO = 31; /* monattk.h:49,72,73 */

function xdrainenergym(mon, givemsg) {
    if ((mon.mspec_used | 0) < 20 /* limit draining */
        && (attacktype(mon.data, 255 /* AT_MAGC */)
            || attacktype(mon.data, 12 /* AT_BREA */))) {
        mon.mspec_used = (mon.mspec_used | 0) + d(2, 2);
        if (givemsg)
            pline_mon(mon, '%s seems lethargic.', Monnam(mon));
    }
}

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
            xdrainenergym(mdef, !!(game.vis && canspotmon(mdef)
                                    && mattk.aatyp !== 11 /* AT_ENGL */));
        mhm.damage = 0;
    }
}

/* Your — C ref: pline.c:375-383. RNG-free "Your " message prefix; this file
 * already imports the plain "You" from js/do_wear.js and carries the same
 * pattern locally for pline_The (below). */
async function Your(fmt, ...args) {
    await pline('Your ' + fmt, ...args);
}

/* resists_poison_uh — C ref: monst.h:275 resists_poison(mon) =
 * Resists_Elem(mon, POISON_RES) (mondata.c:128-193), non-hero path only
 * (mdef is never the hero in the uhitm/mhitm arms this file's
 * mhitm_ad_drst/mhitm_really_poison implement -- the mhitu arm, where mdef
 * IS the hero, is out of scope, see mhitm_ad_drst below). Mirrors
 * Resists_Elem's `mon_resistancebits(mon) & rsstmask` (monst.h:268,
 * mresists | mextrinsics | mintrinsics) against MR_POISON (0x20,
 * monflag.h:67).  Use the canonical body so the worn/carried-item and
 * wielded-artifact resistance arms are included too. */
function resists_poison_uh(mon) {
    return Resists_Elem(mon, POISON_RES);
}

async function mhitm_ad_drst(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef, false);

    if (magr === game.youmonst) {
        /* uhitm */
        if (!negated && !rn2(8)) {
            Your('%s was poisoned!', mpoisons_subj(magr, mattk));
            if (resists_poison_uh(mdef)) {
                pline_The("poison doesn't seem to affect %s.", mon_nam(mdef));
            } else if (!rn2(10)) {
                Your('poison was deadly...');
                mhm.damage = mdef.mhp;
            } else {
                mhm.damage += rn1(10, 6);
            }
        }
    } else if (mdef === game.youmonst) {
        /* mhitu -- out of scope, see comment above */
        await hitmsg(magr, mattk);
        mhm.damage = 0;
    } else {
        /* mhitm */
        if (!negated && !rn2(8))
            mhitm_really_poison(magr, mattk, mdef, mhm);
    }
}

/* C uhitm.c:2054-2090 m_slips_free — [currently assumes that you are the
 * attacker].  A greased/oilskin head covering (AD_DRIN) or body armor
 * makes the hero's grab slip off. */
function m_slips_free(mdef, mattk) {
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
        You("%s %s %s %s!",
            ((mattk.adtyp | 0) === 28 /* AD_WRAP */) ? "slip off of"
                                                    : "grab, but cannot hold onto",
            s_suffix(mon_nam(mdef)), obj.greased ? "greased" : "slippery",
            (obj.greased || (game._oc_name_known && game._oc_name_known[obj.otyp]))
                ? xname(obj) : cloak_simple_name(obj));
        if (obj.greased && !rn2(2)) {
            pline_The("grease wears off.");
            obj.greased = 0;
        }
        return true;
    }
    return false;
}

/* C uhitm.c:3167-3320 mhitm_ad_drin — the `magr == &gy.youmonst` (uhitm)
 * arm: a polymorphed hero's mind-flayer tentacle.  The mhitu / mhitm arms
 * live in js/mhitu.js and js/mhitm.js. */
async function mhitm_ad_drin(magr, mattk, mdef, mhm) {
    game.s = game.s || {};
    if (magr !== game.youmonst) {
        mhm.damage = 0;
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
        if (!unch && pd && ((mdef.mnum ?? mdef.mndx ?? -1) | 0) === PM_GREEN_SLIME_UH) {
            const sl = up && up[22 /* SLIMED */];
            if (!(sl && (sl.intrinsic | 0))) {
                You("suck in some slime and don't feel very well.");
                await make_slimed(10, null);
            }
        }
        return;
    }
    if (m_slips_free(mdef, mattk))
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

export async function mhitm_adtyping(magr, mattk, mdef, mhm) {
    switch (mattk.adtyp) {
    case 0: /* AD_PHYS */
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
    case 32: /* AD_DRIN */
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

/* monstseesu/monstunseesu — real bodies imported from js/mcastu.js
 * (C ref: mondata.c:1557-1582); this file's local copies were no-op stubs
 * silently dropping every m_setseenres/m_clearseenres update this file
 * triggers (M_SEEN_SLEEP/FIRE/COLD arms below). */
function dynamic_multi_reason(mon, verb, by_gaze) {
    const who = x_monnam(mon, ARTICLE_A, null,
        SUPPRESS_IT | SUPPRESS_INVISIBLE | SUPPRESS_HALLUCINATION
        | SUPPRESS_SADDLE | SUPPRESS_NAME, false);
    game.multi_reason = `${verb} by ${by_gaze ? s_suffix(who) : who}${by_gaze ? ' gaze' : ''}`;
}

/* stubs for mhitm_ad_ston unported helpers */
async function munstone(mdef, by_you) {
    /* C muse.c:2884-2899: a monster carrying a lizard or acidic corpse can
     * eat it to interrupt petrification. */
    const CORPSE = 265, POT_ACID = 320, TIN = 296;
    for (let obj = mdef?.minvent; obj; obj = obj.nobj) {
        const isAcidPotion = (obj.otyp | 0) === POT_ACID;
        const isTinCure = (obj.otyp | 0) === TIN && (obj.corpsenm | 0) === PM_LIZARD;
        const corpsePm = (obj.otyp | 0) === CORPSE ? permonstTemplate(obj.corpsenm | 0) : null;
        const acidic = !!(corpsePm && ((corpsePm.mflags1 >>> 0) & 0x08000000));
        if (!isAcidPotion && !isTinCure
            && ((obj.otyp | 0) !== CORPSE || ((obj.corpsenm | 0) !== PM_LIZARD && !acidic)))
            continue;
        if (canseemon(mdef))
            pline(`${Monnam(mdef)} ${isAcidPotion ? 'quaffs an acid potion' : isTinCure ? 'opens and eats a lizard tin' : `eats the ${obj.corpsenm === PM_LIZARD ? 'lizard' : 'acidic'} corpse`}.`);
        await m_useup(mdef, obj);
        mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
        return true;
    }
    return false;
}
export async function minstapetrify(mdef, by_you) {
    /* C trap.c:3858-3879 — stoning-resistant forms become stone golems;
     * otherwise a player-caused petrification is the normal no-message kill. */
    if (!mdef) return;
    if (poly_when_stoned(mdef.data)) {
        await newcham(mdef, PM_STONE_GOLEM, 0);
        return;
    }
    if (by_you)
        await xkilled(mdef, XKILL_NOMSG);
    else
        mdef.mhp = 0;
}
function do_stone_u(magr) {
    const u = game.u || {};
    const props = u.uprops || {};
    const stoned = props[18] || props.STONED;
    const stoneRes = props[8] || props.STONE_RES;
    if ((stoned?.intrinsic | 0) || (stoneRes?.intrinsic | 0) || (stoneRes?.extrinsic | 0))
        return false;
    const data = magr?.data || {};
    const unique = !!((data.geno | 0) & 0x1000);
    const name = mon_nam(magr);
    void make_stoned(5, null, unique ? KILLED_BY : KILLED_BY_AN,
        unique ? `the ${name}` : name);
    return true;
}
async function do_stone_mon(magr, mattk, mdef, mhm) {
    /* C uhitm.c:3945-3978.  The full lifesaving/stone-curing hooks are not
     * represented in this call path yet; ordinary non-resistant monsters use
     * the canonical statue constructor and death detach below. */
    if ((await munstone(mdef, false))) {
        if ((mdef.mhp | 0) > 0) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            mhm.damage = 0;
            return;
        }
    }
    if (poly_when_stoned(mdef?.data)) {
        await newcham(mdef, PM_STONE_GOLEM, 0);
        mhm.damage = 0;
        return;
    }
    if (sh_resists_ston(mdef)) {
        mhm.damage = (mattk?.adtyp | 0) === 18 ? 0 : 1;
        return;
    }
    const lifesave = mlifesaver(mdef);
    if (lifesave) {
        if (cansee(mdef.mx | 0, mdef.my | 0))
            pline('But wait...  The medallion begins to glow!');
        await m_useup(mdef, lifesave);
        mdef.mhpmax = Math.max(mdef.mhpmax | 0, 10, (mdef.m_lev | 0) + 1);
        mdef.mhp = mdef.mhpmax;
        mhm.hitflags = M_ATTK_MISS;
        mhm.done = true;
        mhm.damage = 0;
        return;
    }
    if (canseemon(mdef))
        pline(`${Monnam(mdef)} turns to stone!`);
    const x = mdef.mx | 0, y = mdef.my | 0;
    const mndx = (mdef.mndx ?? mdef.mnum ?? -1) | 0;
    const mrow = (mndx >= 0 && mndx < monsPack.mons.length) ? monsPack.mons[mndx] : null;
    const msize = (mndx >= 0 && mndx < MONS_MSIZE.length) ? (MONS_MSIZE[mndx] | 0) : 2;
    const geno = mrow ? (mrow[3] | 0) : 0;
    const makeStatue = msize > 0 || !rn2(2 + (((geno & 7) > 2) ? 1 : 0));
    const statue = makeStatue ? (await mkcorpstat(476, mdef, mdef.data, x, y, 0))
                              : (await mksobj_at(474, x, y, true, false));
    let obj;
    while ((obj = mdef.minvent) != null) {
        extract_from_minvent_dm(mdef, obj);
        obj.owornmask = 0;
        obj.nobj = 0;
        if (makeStatue)
            await add_to_container(statue, obj);
        else
            place_object(obj, x, y);
    }
    mdef.mhp = 0;
    await mondead(mdef);
    await stackobj(statue);
    if (cansee(x, y))
        newsym(x, y);
    mhm.hitflags = M_ATTK_DEF_DIED | (await grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED);
    mhm.done = true;
    mhm.damage = 0;
}
function Soundeffect(se, vol) { /* no-op */ }
const se_cockatrice_hiss = 0;

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

/* mon_adjust_speed — THE ONE BODY lives at js/trap.js (C ref: worn.c:479-556).
 * The empty no-op that used to sit here silently dropped both AD_SLOW slow-downs
 * in mhitm_ad_slow above; it is imported at the top of this file now. */

/* pline_The: prepend "The " to format string, then call pline */
function pline_The(fmt, ...args) {
    return pline("The " + fmt, ...args);
}

/* C mondata.c:91-125 — use the shared artifact/dragon-defense predicate. */
function defended(mdef, adtyp) {
    return defended_real(mdef, adtyp);
}

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
    const SILVER_MAT = 14, IRON_MAT = 15, METAL_MAT = 16;
    /* Object otyp constants */
    const CORPSE = 265;
    const GAUNTLETS_OF_POWER = 161; /* objects.h:694; was 23 = CROSSBOW_BOLT
                                     * (a bolt is never worn as gloves, so both
                                     * marmg branches below were dead) */

    if (magr === game.youmonst) {
        /* uhitm */
        if (mdef.mndx === PM_SHADE) {
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
                              mon_nam(magr)); /* simplified: mons[corpsenm].pmnames[NEUTRAL] */
                    /* do_stone_u() reads the canonical STONED/STONE_RES
                     * property slots and returns false when already stoned or
                     * resistant; otherwise it applies the petrification. */
                    if (do_stone_u(magr)) {
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
                    if (cloneu())
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
                    if (vis)
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
                mhitm_really_poison(magr, mattk, mdef, mhm);
            }
        } else if (magr.mndx === PM_PURPLE_WORM && mdef.mndx === PM_SHRIEKER) {
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
const A_CON = 4;
const M_ATTK_DEF_DIED = 0x2;
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
function is_weptool(obj) {
    return !!obj && (obj.oclass | 0) === TOOL_CLASS
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) !== 0 /* P_NONE */;
}
/* C ref: uhitm.c:1651-1658 — the verb inside hmon_hitmon_msg_hit's verbose arm:
 *   (is_shield(obj) || obj->otyp == HEAVY_IRON_BALL)          -> "bash"
 *   (objects[obj->otyp].oc_skill == P_WHIP || is_wet_towel)   -> "lash"
 *   Role_if(PM_BARBARIAN)                                     -> "smite"
 *   otherwise                                                 -> "hit"
 * GAP: the is_shield() arm needs objects[].oc_armcat, which this file does not
 * carry (js/do_wear.js has it but does not export is_shield). A wielded shield
 * is the only way to reach it, so it is left out rather than guessed at. */
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
function tele_restrict(magr) {
    if (noteleport_level_uh(magr)) {
        if (canseemon(magr))
            pline("A mysterious force prevents %s from teleporting!",
                  mon_nam(magr));
        return true;
    }
    return false;
}
/* C pline.c verbalize(): emit the spoken line quoted on the topline. */
function verbalize(msg) { return pline('"' + String(msg) + '"'); }

/* C mondata.h:69
 *   #define thick_skinned(ptr) (((ptr)->mflags1 & M1_THICK_HIDE) != 0L)
 * monflag.h:106 M1_THICK_HIDE = 0x00200000L ("has thick hide or scales").
 * mflags1 is a uint32 bitfield — read it unsigned (>>> 0) so a set high bit
 * can't wrap the operand negative. */
const M1_THICK_HIDE = 0x00200000;
/* C objclass.h:20 — enum obj_material_types LEATHER = 7 (weapon.c:304 tests
 * `objects[otyp].oc_material <= LEATHER`). */
const LEATHER_MAT = 7;
function thick_skinned(pd) {
    return (((pd && pd.mflags1) >>> 0) & M1_THICK_HIDE) !== 0;
}
function permapoisoned(otmp) {
    /* C artifact.c:2837: Grimtooth is permanently poisoned. */
    return !!otmp && (otmp.oartifact | 0) === 5;
}
/* artifact_hit's real body is next to spec_applies()/spec_abon()/spec_dbon(),
 * the artilist[] readers it shares ARTI_SPEC with (js/uhitm.js:~618).  The
 * constant-FALSE stub that used to sit here has been retired; its two callers
 * below now consume the returned damage, which is what C's `*dmgptr` is for. */
function cloneu() {
    return false; /* stub */
}
function mhitm_really_poison(magr, mattk, mdef, mhm) {
    if (game.vis && canspotmon(magr))
        pline('%s %s was poisoned!', s_suffix(Monnam(magr)), mpoisons_subj(magr, mattk));
    if (resists_poison_uh(mdef)) {
        if (game.vis && canspotmon(mdef) && canspotmon(magr))
            pline_The("poison doesn't seem to affect %s.", mon_nam(mdef));
    } else {
        mhm.damage += rn1(10, 6);
        if (mhm.damage >= mdef.mhp && game.vis && canspotmon(mdef))
            pline_The('poison was deadly...');
    }
}
/* mpoisons_subj — real body imported from js/mhitu.js (C ref: mhitu.c:143-158);
 * this file's local copy was a stub returning the constant "poisons you" for
 * every call, e.g. corrupting "%s was poisoned!" (uhitm.c:3132) and the
 * artifact-weapon poison-attack topline (uhitm.c:3109) with a fixed string
 * regardless of AT_WEAP/AT_TUCH/AT_GAZE/AT_BITE or weapon poisoning. */
export async function poisoned(buf, atype, pname, hpdamchance, is_weapon) {
    return await poisoned_real(buf, atype, pname, hpdamchance, is_weapon);
}
/* C do_name.c:1303 pmname(pm, mgender) and monst.h Mgender(mon).
 * Use makemon.js's canonical pmname table; the old local stubs always called
 * the attacker "it", corrupting the poison killer/name text for gendered
 * monsters without consuming or suppressing any C RNG. */
function pmname(pd, gender) {
    return monPmname(pd?.pmidx | 0, gender);
}
function Mgender(mtmp) {
    return mtmp?.female ? FEMALE : MALE;
}

/* stubs for mhitm_ad_ench unported helpers */
function some_armor(mdef) {
    return game.u.uarmg
        || game.u.uarmf
        || game.u.uarmh || game.u.uarms || game.u.uarmc || game.u.uarmu
        || game.u.uarm
        || null;
}
function Yobjnam2(obj, verb) {
    return Yobjnam2_real(obj, verb);
}

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
