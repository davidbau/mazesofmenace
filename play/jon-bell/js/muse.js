// @ts-nocheck
// muse.js — monsters using objects: the OFFENSIVE half of muse.c.
// C ref: nethack-c-v5/upstream/src/muse.c
//
// find_offensive() already lives in js/makemon.js (it was ported alongside the
// verdict: precheck(), mzapwand(), use_offensive(), and the monster-side beam
// walker mbhit()/mbhitm().
//
// Two arms of use_offensive() are ported: MUSE_WAN_STRIKING (the wand beam) and
// the shared MUSE_POT_PARALYSIS/BLINDNESS/CONFUSION/SLEEPING/ACID arm (the
// hurled potion).  Every other arm returns C's own no-action value (0,
// muse.c:2019 `case 0: return 0;`) and carries a KNOWN GAP comment naming the C
// file:line and the missing dependency.  They are NOT thrown: the replay runner
// of correctly-matched leaves elsewhere.

import { game } from './gstate.js';
import { dist2 } from './hacklib.js';
import { rn1 } from './rng.js';
import { rn2, rnd, d } from './rnd.js';
import { newsym, canspotmon, canseemon, map_invisible, shieldeff } from './display.js';
import { pline, You_hear } from './pline.js';
import { cansee, couldsee } from './vision.js';
import { m_at } from './uhitm.js';
import { exclam } from './zap.js';
import { Monnam, mon_nam } from './do_name.js';
import { find_mac } from './worn.js';
import { _zp_unturn_you, unturn_dead, cancel_monst, resist, hit, miss, dobuzz, bhito, lightdamage, BlindedTimeout, make_blinded } from './zap.js';
import { Blind } from './vision.js';
import { mon_nam_too } from './do_name.js';
import { wakeup } from './mon.js';
import { resists_blnd } from './mondata.js';
import { makeplural } from './objnam.js';
import { verbalize } from './cmd.js';
import { The, vtense, an, xname_wand, simple_typename, xname } from './objnam.js';
import { doname, singular, simpleonames } from './objnam.js';
import { distmin } from './hacklib.js';
import { observe_object } from './o_init.js';
import { m_throw } from './mthrowu.js';
import { losehp } from './hack.js';
import { breaks } from './dothrow.js';
import { find_drawbridge } from './dbridge.js';
import { destroy_drawbridge } from './dbridge.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';
import { monstunseesu } from './mhitm.js';
import { seemimic } from './mon.js';
import { resists_magm } from './mondata.js';
import { monstseesu } from './mondata.js';
import { discover_object } from './o_init.js';
import { QBUFSZ, BZ_OFS_AD, BOLT_LIM, M_AP_NOTHING, ANTIMAGIC, HALF_SPDAM, isok, IS_DOOR, SDOOR, DRAWBRIDGE_UP, D_LOCKED, D_CLOSED, D_BROKEN, SHOPBASE, POOL, OBJ_FLOOR, KILLED_BY_AN, TELL, TEMPLE, RLOC_MSG, NOTELL } from './const.js';
import { doorlock } from './lock.js';
import { unknow_object } from './mkobj.js';
import { add_damage } from './shk.js';
import { in_rooms } from './hack.js';
import { tele, tele_restrict, rloc } from './teleport.js';
import './makemon.js';
import { monkilled_trap } from './trap.js';
import { m_useup } from './mthrowu.js';
import { drop_boulder_on_monster, drop_boulder_on_player } from './read.js';
import { set_msg_xy } from './pline.js';
import { ceiling } from './dungeon.js';
import { closed_door } from './monmove.js';
import { IS_OBSTRUCTED, IS_AIR } from './const.js';
import { HALLUC, HALLUC_RES } from './const.js';
import { impossible } from './pline.js';
import { _mon_reflects_zap as mon_reflects_real } from './zap.js'; // relocate-fns
import { MON_MCOLOR, _display_hallucinating } from './display.js'; // relocate-fns
import { CLR_BRIGHT_GREEN, CLR_GREEN } from './terminal.js'; // relocate-fns
import { PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER } from './pm.generated.js';
import { set_msg_xy as set_msg_xy_uh } from './pline.js'; // relocate-fns
import { ACID_RES, EXPL_FIERY, FIRE_TRAP, P_DAGGER, P_KNIFE, STRAT_WAITFORU, XKILL_NOCONDUCT, XKILL_NOMSG } from './const.js'; // relocate-fns
import { Deaf, Unaware } from './display.js'; // relocate-fns
import { trycall } from './do.js'; // relocate-fns
import { hcolor } from './do_name.js'; // relocate-fns
import { dog_nutrition } from './dogmove.js'; // relocate-fns
import { explode as explode_uh } from './explode.js'; // relocate-fns
import { s_suffix, upstart } from './hacklib.js'; // relocate-fns
import { mhe, nonlivingMon, permonstTemplate } from './makemon.js';
import { attacktype_fordmg as attacktype_fordmg_uh } from './mondata.js'; // relocate-fns
import { splitobj } from './mkobj.js';
import { helpless } from './mhitm.js'; // relocate-fns
import { resists_ston as resists_ston_real, slimeproof } from './mklev.js';
import { bcsign } from './mkobj.js'; // relocate-fns
import { mondead } from './mon.js'; // relocate-fns
import { Resists_Elem, can_blow, locomotion } from './mondata.js'; // relocate-fns
import { accessible } from './monmove.js'; // relocate-fns
import { ansimpleoname, distant_name } from './objnam.js'; // relocate-fns
import { pline_mon } from './pline.js'; // relocate-fns
import { PM_BAT, PM_GIANT_BAT, PM_LIZARD, PM_STALKER, PM_VAMPIRE_BAT } from './pm.generated.js'; // relocate-fns
import { place_monster } from './steed.js'; // relocate-fns
import { begin_burn } from './timeout.js'; // relocate-fns
import { mintrap, t_at } from './trap.js'; // relocate-fns
import { DEADMONSTER, NORMAL_SPEED_UH, WEAPON_CLASS, _UH_M1_NOHANDS, _hero_resists, sr_MON_WEP, sr_is_animal, sr_mindless, sr_oc_skill } from './uhitm.js';
import { monkilled, xkilled } from './mon.js'; // relocate-fns
import { mwelded } from './wield.js'; // relocate-fns
import { worm_move } from './worm.js'; // relocate-fns
import { mon_adjust_speed } from './worn.js'; // relocate-fns
import { _zhitm } from './zap.js'; // relocate-fns
import { HAND, body_part, dirtocoord, xytodir } from './cmd.js'; // relocate-fns
import { BEAR_TRAP, BLINDED, CORR, FORCEBUNGLE, FORCETRAP, HOLE, IS_DRAWBRIDGE, IS_FURNITURE, In_V_tower, In_endgame, Is_botlevel, Is_earthlevel, Is_knox_level, Is_rogue_level, LADDER, MIGR_LADDER_DOWN, MIGR_LADDER_UP, MIGR_RANDOM, MIGR_SSTAIRS, MIGR_STAIRS_DOWN, MIGR_STAIRS_UP, MM_NOMSG, NC_SHOW_MSG, NC_VIA_WAND_OR_SPELL, NO_MM_FLAGS, PIT, PLNMSG_MON_TAKES_OFF_ITEM, POLY_TRAP, POT_EXTRA_HEALING_OTYP, POT_FULL_HEALING_OTYP, POT_HEALING_OTYP, POT_SICKNESS_OTYP, REFLECTING, SCORR, SCR_CREATE_MONSTER_OTYP, SCR_TELEPORTATION_OTYP, SEE_INVIS, STAIRS, TELEPORT_CONTROL, TELEP_TRAP, WAN_CREATE_MONSTER_OTYP, WAN_DIGGING_OTYP, WEB, W_AMUL, W_ARM, W_ARMF, W_ARMH, W_ARMS, W_NONDIGGABLE, W_WEP, _UNICORN_HORN, is_hole, is_pit } from './const.js'; // relocate-fns
import { is_drawbridge_wall, is_lava } from './dbridge.js'; // relocate-fns
import { cls, display_self, docrt, force_more, force_more_pages, sensemon, show_monster_glyph_at } from './display.js'; // relocate-fns
import { canletgo, dropy } from './do.js'; // relocate-fns
import { Some_Monnam, a_monnam, docall, noit_mon_nam, rndmonnam, x_monnam } from './do_name.js'; // relocate-fns
import { bimanual, hard_helmet } from './do_wear.js'; // relocate-fns
import { migrate_to_level } from './dog.js'; // relocate-fns
import { paralyze_monst } from './mhitm.js'; // relocate-fns
import { maybe_unhide_at, obfree, obj_extract_self } from './dokick.js'; // relocate-fns
import { Can_dig_down, Can_fall_thru, Can_rise_up, On_W_tower_level, depth as depth_of_level, dunlev, dunlevs_in_dungeon, get_level, ledger_no, on_level, surface } from './dungeon.js'; // relocate-fns
import { is_ice } from './engrave.js'; // relocate-fns
import { ENV } from './hostenv.js'; // relocate-fns
import { freeinv, sobj_at } from './invent.js'; // relocate-fns
import { is_pool } from './look.js'; // relocate-fns
import { BOULDER, CORPSE, G_GONE, G_UNIQ, HALLUC_MM, HALLUC_RES_MM, Hallucination, Inhell, M1_AMORPHOUS, M1_ANIMAL, M1_MINDLESS, M1_UNSOLID, M2_MERC, NON_PM, NUMMONS, POT_GAIN_LEVEL_OTYP, POT_INVISIBILITY_OTYP, POT_POLYMORPH_OTYP, POT_SPEED_OTYP, S_GHOST, TIN, WAN_MAKE_INVISIBLE_OTYP, WAN_POLYMORPH_OTYP, WAN_SPEED_MONSTER_OTYP, WAN_TELEPORTATION_OTYP, _GRAY_DRAGON_SCALE_MAIL, _SHIELD_OF_REFLECTION, _YELLOW_DRAGON_SCALE_MAIL, grow_up, isAnimal, isFlyerMndx, is_unicorn, makeknown, makemon, monDifficulty, monsndx, mquaffmsg_Deaf, rndmonst, set_malign, sokobanRules, throws_rocks, u_at } from './makemon.js'; // relocate-fns
import { resists_ston } from './mklev.js'; // relocate-fns
import { add_to_container, place_object, unbless } from './mkobj.js'; // relocate-fns
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js'; // relocate-fns
import { can_carry, flash_mon, healmon, mongone, monnear, newcham } from './mon.js'; // relocate-fns
import { S_EYE, S_LIGHT, attacktype, dmgtype, mon_hates_silver, mon_knows_traps, mon_learns_traps, poly_when_stoned, pronoun_gender as pronoun_gender_mm, same_race } from './mondata.js'; // relocate-fns
import { mon_would_take_item, monflee, onscary } from './monmove.js'; // relocate-fns
import { blocking_terrain, lined_up, m_carrying } from './mthrowu.js'; // relocate-fns
import { the } from './objnam.js'; // relocate-fns
import { removed_from_icebox } from './pickup.js'; // relocate-fns
import { Norep, You_feel, pline_The, urgent_pline } from './pline.js'; // relocate-fns
import { PM_ACID_BLOB, PM_CHICKATRICE, PM_COCKATRICE, PM_CROCODILE, PM_GIANT_EEL, PM_GRAY_DRAGON, PM_GREMLIN, PM_GUARD, PM_KI_RIN, PM_PESTILENCE, PM_SILVER_DRAGON } from './pm.generated.js'; // relocate-fns
import { in_your_sanctuary } from './priest.js'; // relocate-fns
import { pushRngLogEntry } from './rng.js';
import { rn2_on_display_rng } from './rnd.js'; // relocate-fns
import { inhishop } from './shk.js'; // relocate-fns
import { stairway_at } from './stairs.js'; // relocate-fns
import { mpickobj, remove_worn_item } from './steal.js'; // relocate-fns
import { impossible as impossible_steed } from './steed.js'; // relocate-fns
import { enexto_out, noteleport_level, random_teleport_level } from './teleport.js'; // relocate-fns
import { fill_pit, maketrap, seetrap, trapname, unconscious } from './trap.js'; // relocate-fns
import { recalc_block_point, unblock_point } from './vision.js'; // relocate-fns
import { weight } from './weight.js'; // relocate-fns
import { welded } from './wield.js'; // relocate-fns
import { mon_has_amulet, mon_has_special } from './wizard.js'; // relocate-fns
import { extract_from_minvent, mon_set_minvis, which_armor } from './worn.js'; // relocate-fns

/* C ref: muse.c:1272-1290 — the offensive MUSE_* values, verbatim. */
const MUSE_WAN_STRIKING = 7;
const MUSE_CAMERA = 18;
const MUSE_SCR_EARTH = 17;
const MUSE_WAN_DEATH = 1, MUSE_WAN_SLEEP = 2, MUSE_WAN_FIRE = 3,
      MUSE_WAN_COLD = 4, MUSE_WAN_LIGHTNING = 5, MUSE_WAN_MAGIC_MISSILE = 6;
const MUSE_FROST_HORN = 12, MUSE_FIRE_HORN = 13;
export const FROST_HORN = 250;
const AD_FIRE = 2, AD_COLD = 3;
const MUSE_POT_PARALYSIS = 9;
const MUSE_POT_BLINDNESS = 10;
const MUSE_POT_CONFUSION = 11;
const MUSE_POT_ACID = 14;
const MUSE_WAN_TELEPORTATION = 15;
const MUSE_POT_SLEEPING = 16;
const MUSE_WAN_UNDEAD_TURNING = 20;

/* objects.h otyps (same values js/makemon.js pins for find_offensive).
 * WAN_STRIKING is the wand the shopkeeper carries. */
const WAN_STRIKING = 417;
const WAN_TELEPORTATION = 424;
const WAN_UNDEAD_TURNING = 421;
const WAN_MAGIC_MISSILE = 429;
const WAN_OPENING = 425, WAN_LOCKING = 426; /* objects.h; js/zap.js:340-341 */
/* objclass.h oclass numbers: POTION_CLASS 8, WAND_CLASS 11 (objects.h:96
 * marks the wand GENERIC entry "[11]"; 10 is SPBOOK_CLASS). */
const POTION_CLASS = 8;
const WAND_CLASS = 11;
const WAN_CANCELLATION = 423, SPE_CANCELLATION = 402; /* zap.js:290, :360 */

/* C ref: hack.h:1415 WAND_BACKFIRE_CHANCE. */
const WAND_BACKFIRE_CHANCE = 100;

/* C ref: monst.h:77 M_SEEN_MAGR — the "hero resists magic missile / AD_MAGM"
 * bit of mtmp->seen_resistance. */
export const M_SEEN_MAGR = 0x0001;

/* C ref: monflag.h M2_UNDEAD. */
const M2_UNDEAD = 0x00000002;

/* C ref: youprop.h — hero properties this file tests. */
function propOn(id) {
    const p = game.u?.uprops?.[id];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Antimagic() { return propOn(ANTIMAGIC); }
function Half_spell_damage() { return propOn(HALF_SPDAM); }

function DEADMONSTER_muse(mon) { return !!(mon && (mon.mhp | 0) <= 0); }

/* C ref: decl.c gy.youmonst — C passes &gy.youmonst to fhitm when the beam
 * crosses the hero, and mbhitm compares against it.  This port keeps no global
 * hero-monst record, so the hero is recognised the same way js/teleport.js
 * does it: m_id == 1 (and the absent game.youmonst itself). */
function is_youmonst(m) { return !m || (m.m_id | 0) === 1; }

function makeknown_muse(otyp) { discover_object(otyp, true, true, true); }

/* C ref: muse.c:58-160 precheck(mon, obj) — pre-use hazards.  ONE port,
 * js/makemon.js precheck (imported above): the POTION_CLASS occupant arms and
 * the muse.c:131-132 cursed-wand backfire `obj->cursed &&
 * !rn2(WAND_BACKFIRE_CHANCE)` (the rn2 is only drawn for a CURSED wand). */

/* C ref: do_name.c:1220-1248 monverbself() */
function _monverbself(mtmp, verb, othertext) {
    let monnamtext = Monnam(mtmp);
    const selfbuf = mon_nam_too(mtmp, mtmp);
    const verbs = vtense(selfbuf, verb);
    if (verbs === verb) {
        monnamtext = makeplural(monnamtext);
        if (monnamtext.toLowerCase() === 'they')
            monnamtext = monnamtext[0] === 'T' ? 'Them' : 'them';
    }
    return `${monnamtext} ${verbs}${othertext ? ' ' + othertext : ''} ${selfbuf}`;
}

/* C ref: muse.c:167-192 mzapwand(mtmp, otmp, self) — announce the zap, spend a
 * charge, and (when seen) interrupt the hero's occupation. */
export async function mzapwand(mtmp, otmp, self) {
    if ((otmp.spe | 0) < 1) {
        /* C: impossible("Mon zapping wand with %d charges?") then return —
         * the charge is NOT spent. */
        await impossible('Mon zapping wand with %d charges?', otmp.spe);
        return;
    }
    if (!canseemon(mtmp)) {
        /* C muse.c:174-181 — an unseen zapper is only heard.  RNG-free. */
        const range = couldsee(mtmp.mx | 0, mtmp.my | 0)
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = dist2(mtmp.mx | 0, mtmp.my | 0,
                           game.u.ux | 0, game.u.uy | 0) <= range * range;
        Soundeffect(se_zap, 100);
        await You_hear(`a ${near ? "nearby" : "distant"} zap.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        await pline(`${_monverbself(mtmp, 'zap', null)} with ${await doname(otmp)}!`);
    } else {
        set_msg_xy(mtmp.mx, mtmp.my); /* pline_mon (pline.c:138-146) */
        await pline(`${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        await stop_occupation();
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/* C ref: muse.c:195-233 mplayhorn(mtmp, otmp, self) — announce the horn,
 * spend a charge.  The self arm is unreachable from use_offensive. */
export async function mplayhorn(mtmp, otmp, self) {
    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx | 0, mtmp.my | 0)
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = dist2(mtmp.mx | 0, mtmp.my | 0,
                           game.u.ux | 0, game.u.uy | 0) <= range * range;
        await You_hear(`a horn being played ${near ? "nearby" : "in the distance"}.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        observe_object(otmp);
        let objnamp = xname(otmp);
        if (objnamp.length >= QBUFSZ)
            objnamp = simpleonames(otmp);
        pline(`${_monverbself(mtmp, 'play', `a ${objnamp} directed at`)}!`);
        makeknown_muse(otmp.otyp | 0);
    } else {
        observe_object(otmp);
        let objnamp = xname(otmp);
        if (objnamp.length >= QBUFSZ)
            objnamp = simpleonames(otmp);
        pline(`${Monnam(mtmp)} plays ${an(objnamp)} directed at you!`);
        makeknown_muse(otmp.otyp | 0);
        await stop_occupation();
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/* C ref: muse.c:1596-1702 mbhitm(mtmp, otmp) — apply otmp's zap effect to one
 * target on the beam.  mtmp is &gy.youmonst when the beam is hitting the hero.
 * Only the WAN_STRIKING case is ported. */
async function mbhitm(mtmp, otmp) {
    let tmp, tgt_x = 0, tgt_y = 0;
    let reveal_invis = false, learnit = false;
    const hits_you = is_youmonst(mtmp);
    const u = game.u || {};
    /* C's dead mtmp keeps its stale mx,my (mon.c:2718); this port's
     * monkilled_trap() zeroes them, so remember the target square for the
     * cansee() test at the end (muse.c:1647-1649). */
    if (!hits_you) { tgt_x = mtmp.mx | 0; tgt_y = mtmp.my | 0; }

    if (!hits_you && otmp.otyp !== WAN_UNDEAD_TURNING) {
        mtmp.msleeping = 0;
        if (mtmp.m_ap_type)
            seemimic(mtmp);
    }
    switch (otmp.otyp | 0) {
    case WAN_STRIKING:
        reveal_invis = true;
        if (hits_you) {
            if (Antimagic()) {
                monstseesu(M_SEEN_MAGR);
                shieldeff(u.ux | 0, u.uy | 0); /* C muse.c:1614 */
                Soundeffect(se_boing, 40);
                pline("Boing!");
                learnit = true;
            } else if (rnd(20) < 10 + (u.uac | 0)
                       && !(game.gb?.buzzer && !game.gb.buzzer.mwandexp)) {
                /* C muse.c:1618-1620 — the to-hit rnd(20) is evaluated FIRST
                 * and is therefore always drawn, even when the second test (a
                 * monster's first-ever wand shot always misses) forces a miss. */
                monstunseesu(M_SEEN_MAGR);
                pline("The wand hits you!");
                tmp = d(2, 12);
                if (Half_spell_damage())
                    tmp = Math.trunc((tmp + 1) / 2);
                await losehp(tmp, "wand", KILLED_BY_AN);
                learnit = true;
            } else {
                pline("The wand misses you.");
            }
            await stop_occupation();
            nomul(0);
        } else if (resists_magm(mtmp)) {
            shieldeff(mtmp.mx | 0, mtmp.my | 0); /* C muse.c:1633 */
            Soundeffect(se_boing, 40);
            pline("Boing!");
            learnit = true;
        } else if (rnd(20) < 10 + find_mac(mtmp)) {
            tmp = d(2, 12);
            hit("wand", mtmp, exclam(tmp));
            await resist(mtmp, otmp.oclass, tmp, TELL);
            learnit = true;
        } else {
            miss("wand", mtmp);
        }
        /* C muse.c:1651-1655 — wand discovery needs the zap AND the impact
         * spot to have been seen. */
        if (learnit && game.zap_oseen
            && (hits_you || cansee(tgt_x, tgt_y)))
            makeknown_muse(WAN_STRIKING);
        break;
    case WAN_TELEPORTATION:
        /* C muse.c:1656-1668 */
        if (hits_you) {
            await tele();
            if (game.zap_oseen)
                makeknown_muse(WAN_TELEPORTATION);
        } else {
            /* for consistency with zap.c, don't identify */
            if (mtmp.ispriest && in_rooms(mtmp.mx | 0, mtmp.my | 0, TEMPLE)?.length) {
                if (cansee(mtmp.mx | 0, mtmp.my | 0))
                    pline(`${Monnam(mtmp)} resists the magic!`);
            } else if (!tele_restrict(mtmp))
                await rloc(mtmp, RLOC_MSG);
        }
        break;
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        /* C muse.c:1666-1668 */
        await cancel_monst(mtmp, otmp, false, true, false);
        break;
    case WAN_UNDEAD_TURNING:
        /* C muse.c:1669-1694 */
        if (hits_you) {
            await _zp_unturn_you();
            learnit = !!game.zap_oseen;
        } else {
            let wake = false;

            if (await unturn_dead(mtmp)) /* affects mtmp's invent, not mtmp */
                wake = true;
            if (is_undead(mtmp.data) || is_vampshifter(mtmp)) {
                wake = reveal_invis = true;
                /* context.bypasses=True: if resist() happens to be fatal,
                   make_corpse() will set obj->bypass on the new corpse */
                game.context.bypasses = true;
                await resist(mtmp, WAND_CLASS, rnd(8), NOTELL);
            }
            if (wake) {
                if (!DEADMONSTER_muse(mtmp))
                    await wakeup(mtmp, false);
                learnit = !!game.zap_oseen;
            }
        }
        if (learnit)
            makeknown_muse(WAN_UNDEAD_TURNING);
        break;
    default:
        break;
    }

    if (reveal_invis && !DEADMONSTER_muse(mtmp)
        && cansee(game.bhitpos.x, game.bhitpos.y) && !canspotmon(mtmp))
        map_invisible(game.bhitpos.x, game.bhitpos.y);

    return 0;
}

async function fhito_loc(obj, tx, ty, fhito) {
    if (!fhito)
        return false;
    let hitanything = 0;
    const pile = game.level?.levelObjects?.[tx]?.[ty] ?? null;
    for (let otmp = pile, next_obj = null; otmp; otmp = next_obj) {
        next_obj = otmp.nexthere;
        if (otmp.where !== OBJ_FLOOR || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }
    return hitanything ? true : false;
}

async function mbhit(mon, range, fhitm, fhito, obj) {
    const otyp = obj.otyp | 0;
    // C muse.c:1746-1807 reads the shared gb.bhitpos even after callbacks;
    // drawbridge debris can change it (explode.c:843-856 scatter).
    game.bhitpos ||= { x: 0, y: 0 };

    game.bhitpos.x = mon.mx | 0;
    game.bhitpos.y = mon.my | 0;
    const ddx = sgn_muse((mon.mux | 0) - (mon.mx | 0));
    const ddy = sgn_muse((mon.muy | 0) - (mon.my | 0));

    while (range-- > 0) {
        game.bhitpos.x += ddx;
        game.bhitpos.y += ddy;
        const x = game.bhitpos.x, y = game.bhitpos.y;

        if (!isok(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }
        const u = game.u || {};
        let mtmp;
        if (x === (u.ux | 0) && y === (u.uy | 0)) {
            await fhitm(game.youmonst, obj);
            range -= 3;
        } else if ((mtmp = m_at(x, y)) != null) {
            if (cansee(x, y) && !canspotmon(mtmp))
                map_invisible(x, y);
            await fhitm(mtmp, obj);
            range -= 3;
        }
        if (await fhito_loc(obj, game.bhitpos.x, game.bhitpos.y, fhito))
            range--;
        const loc = game.level?.at(game.bhitpos.x, game.bhitpos.y);
        const ltyp = loc ? (loc.typ | 0) : 0;
        /* C muse.c:1775-1783 — a striking beam destroys a drawbridge it
         * crosses, unless it is passing over the raised bridge's moat. */
        const dbx = { value: x }, dby = { value: y };
        if (otyp === WAN_STRIKING && ltyp !== DRAWBRIDGE_UP
            && find_drawbridge(dbx, dby)) {
            await destroy_drawbridge(dbx.value, dby.value);
        } else if (IS_DOOR(ltyp) || ltyp === SDOOR) {
            /* C muse.c:1786-1800 — "monsters don't use opening or locking
             * magic at present, but keep these as placeholders". */
            switch (otyp) {
            case WAN_OPENING:
            case WAN_LOCKING:
            case WAN_STRIKING:
                if (await doorlock(obj, game.bhitpos.x, game.bhitpos.y)) {
                    if (game.zap_oseen)
                        makeknown_muse(otyp);
                    /* C muse.c:1794-1797 — a shop door broken by the beam goes
                     * on the shopkeeper's repair list at NO charge. */
                    if ((game.level.at(game.bhitpos.x, game.bhitpos.y).doormask | 0) === D_BROKEN
                        && in_rooms(game.bhitpos.x, game.bhitpos.y, SHOPBASE).length)
                        add_damage(game.bhitpos.x, game.bhitpos.y, 0);
                }
                break;
            }
        }
        if (!ZAP_POS(ltyp)
            || (IS_DOOR(ltyp) && ((game.level.at(game.bhitpos.x, game.bhitpos.y).doormask | 0) & (D_LOCKED | D_CLOSED)))) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }
    }
}

/* C muse.c:864: defensive wands use the same monster/object hit callbacks. */
export function mbhit_wand(mon, range, obj) {
    return mbhit(mon, range, mbhitm, bhito, obj);
}

/* C muse.c:1826-2032 use_offensive(): act on find_offensive()'s verdict.
 * The fire-scroll arm at 1956-2004 is disabled by C's #if 0. */
export async function use_offensive(mtmp) {
    const otmp = game.offensive;
    let i;

    /* C muse.c:1834-1836 — mwandexp: a monster's FIRST attack-wand shot always
     * misses (buzz_force_miss); mbhitm reads the same flag via game.gb.buzzer. */

    if (otmp.oclass !== POTION_CLASS && (i = await precheck(mtmp, otmp)) !== 0)
        return i;
    const oseen = canseemon(mtmp);

    switch (game.has_offense | 0) {
    case MUSE_WAN_DEATH:
    case MUSE_WAN_SLEEP:
    case MUSE_WAN_FIRE:
    case MUSE_WAN_COLD:
    case MUSE_WAN_LIGHTNING:
    case MUSE_WAN_MAGIC_MISSILE:
        /* C muse.c:1846-1866 — all six offensive ray wands share the
         * BZ_M_WAND path.  The old port fell through to the ordinary attack
         * loop, which made a monster carrying a death wand throw its boulder
         * instead and skipped the hero-side exercise/zap RNG. */
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        if (oseen) makeknown_muse(otmp.otyp | 0);
        game.m_using = true;
        game.gc_current_wand = otmp;
        (game.gb ||= {}).buzzer = mtmp;
        {
            const nd = ((otmp.otyp | 0) === WAN_MAGIC_MISSILE) ? 2 : 6;
            const forceMiss = !mtmp.mwandexp;
            /* C muse.c:1815-1818,1834-1849: both buzz() and
             * buzz_force_miss() pass sayhit=TRUE, saymiss=FALSE. */
            await dobuzz(BZ_M_WAND(BZ_OFS_WAN(otmp.otyp | 0)), nd, mtmp.mx | 0, mtmp.my | 0,
                         sgn_muse((mtmp.mux | 0) - (mtmp.mx | 0)),
                         sgn_muse((mtmp.muy | 0) - (mtmp.my | 0)), true, false, forceMiss);
        }
        game.gb.buzzer = 0;
        game.gc_current_wand = 0;
        game.m_using = false;
        mtmp.mwandexp = true;
        return DEADMONSTER_muse(mtmp) ? 1 : 2;
    case MUSE_FIRE_HORN:
    case MUSE_FROST_HORN:
        /* C muse.c:1867-1880 — a fire/frost horn is blown, then buzzes as an
         * AD_FIRE/AD_COLD ray of rn1(6, 6) dice via BZ_M_WAND(BZ_OFS_AD()). */
        await mplayhorn(mtmp, otmp, false);
        game.m_using = true;
        (game.gb ||= {}).buzzer = mtmp;
        game.gc_current_wand = otmp; /* needed by zhitu() (muse.c:1874) */
        {
            const nd = rn1(6, 6);
            await dobuzz(BZ_M_WAND(BZ_OFS_AD((otmp.otyp | 0) === FROST_HORN ? AD_COLD : AD_FIRE)), nd, mtmp.mx | 0, mtmp.my | 0,
                         sgn_muse((mtmp.mux | 0) - (mtmp.mx | 0)),
                         sgn_muse((mtmp.muy | 0) - (mtmp.my | 0)), true, false, !mtmp.mwandexp);
        }
        game.gb.buzzer = 0;
        game.gc_current_wand = 0;
        game.m_using = false;
        mtmp.mwandexp = true;
        return DEADMONSTER_muse(mtmp) ? 1 : 2;
    case MUSE_WAN_TELEPORTATION:
    case MUSE_WAN_UNDEAD_TURNING:
    case MUSE_WAN_STRIKING:
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        (game.gb ||= {}).buzzer = mtmp;
        /* C muse.c:1884 — rn1(8, 6) is the beam's range and is drawn BEFORE
         * mbhit runs (it is an argument). */
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        game.gb.buzzer = 0;
        game.m_using = false;
        if ((game.has_offense | 0) === MUSE_WAN_STRIKING)
            mtmp.mwandexp = true;
        return 2;
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID:
        if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
            observe_object(otmp);
            set_msg_xy(mtmp.mx, mtmp.my); /* pline_mon muse.c:2017 */
            pline(`${Monnam(mtmp)} hurls ${(await singular(otmp, doname))}!`);
        }
        await m_throw(mtmp, mtmp.mx | 0, mtmp.my | 0,
                sgn_muse((mtmp.mux | 0) - (mtmp.mx | 0)),
                sgn_muse((mtmp.muy | 0) - (mtmp.my | 0)),
                distmin(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0),
                otmp);
        return 2;
    case MUSE_SCR_EARTH: {
        /* C muse.c:1891-1937.  TODO (C): handle steeds. */
        /* don't use monster fields after killing it */
        const confused = !!mtmp.mconf;
        const mmx = mtmp.mx | 0, mmy = mtmp.my | 0;
        const is_cursed = !!otmp.cursed, is_blessed = !!otmp.blessed;

        await mreadmsg(mtmp, otmp);
        /* Identify the scroll */
        if (canspotmon(mtmp)) {
            pline(`The ${ceiling(mmx, mmy)} rumbles ${otmp.blessed ? "around" : "above"} ${mon_nam(mtmp)}!`);
            if (oseen) makeknown_muse(otmp.otyp | 0);
        } else if (cansee(mmx, mmy)) {
            pline(`The ${ceiling(mmx, mmy)} rumbles in the middle of nowhere!`);
            if (mtmp.minvis) map_invisible(mmx, mmy);
            if (oseen) makeknown_muse(otmp.otyp | 0);
        }

        /* could be fatal to monster, so use up the scroll before
           there's a chance that monster's inventory will be dropped */
        await m_useup(mtmp, otmp);

        /* Loop through the surrounding squares */
        for (let x = mmx - 1; x <= mmx + 1; x++) {
            for (let y = mmy - 1; y <= mmy + 1; y++) {
                const lev = isok(x, y) ? game.level?.at(x, y) : null;
                /* Is this a suitable spot? */
                if (lev && !closed_door(x, y)
                    && !IS_OBSTRUCTED(lev.typ | 0) && !IS_AIR(lev.typ | 0)
                    && ((x === mmx && y === mmy) ? !is_blessed : !is_cursed)
                    && (x !== (game.u.ux | 0) || y !== (game.u.uy | 0))) {
                    await drop_boulder_on_monster(x, y, confused, false);
                }
            }
        }
        /* Attack the player */
        if (distmin(mmx, mmy, game.u.ux | 0, game.u.uy | 0) === 1 && !is_cursed) {
            await drop_boulder_on_player(confused, !is_cursed, false, true);
        }

        return DEADMONSTER_muse(mtmp) ? 1 : 2;
    }
    case MUSE_CAMERA: {
        /* C muse.c:1938-1954.  SetVoice is a no-op here. */
        /* C muse.c:1941, youprop.h:115-120: resistance suppresses the timeout. */
        if (game.u?.uprops?.[HALLUC]?.intrinsic && !propOn(HALLUC_RES)) {
            await verbalize("Say cheese!");
        } else if (!Blind()) {
            pline(`${Monnam(mtmp)} takes a picture of you with ${an(xname(otmp))}!`);
        }
        game.m_using = true;
        if (!Blind() && !resists_blnd(game.youmonst)) {
            pline("You are blinded by the flash of light!");
            make_blinded(BlindedTimeout() + rnd(1 + 50), false);
        }
        await lightdamage(otmp, true, 5);
        game.m_using = false;
        otmp.spe = (otmp.spe | 0) - 1;
        return 1;
    }
    case 0:
        return 0; /* C muse.c:2024-2025: an exploded wand. */
    default:
        await impossible('%s wanted to perform action %d?', Monnam(mtmp), game.has_offense);
        return 0;
    }
}

/* --- small local helpers with no shared owner in js/ --- */

/* xname() — C objnam.c:574-578.  Was a private WAND-only shim here that fell
 * back to simple_typename() for every other class; js/objnam.js now carries the
 * full xname_flags() body and this file imports xname from it directly. */

/* C ref: hacklib.h sgn_muse(n). */
function sgn_muse(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

function ZAP_POS(typ) { return (typ | 0) >= POOL; }

/* C ref: hack.h:1477 BZ_OFS_WAN(otyp), hack.h:1490 BZ_M_WAND(bztyp) — the
 * monster-wand buzz type, -39..-30.  BZ_OFS_AD is js/const.js's. */
function BZ_OFS_WAN(otyp) { return Math.abs(otyp - WAN_MAGIC_MISSILE) % 10; }
function BZ_M_WAND(bztyp) { return -30 - bztyp; }

/* C ref: mondata.h:95 is_undead(ptr); monst.h:217 is_vampshifter(mon). */
function is_undead(ptr) { return ((ptr.mflags2 | 0) & M2_UNDEAD) !== 0; }
function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD
           || mon.cham === PM_VLAD_THE_IMPALER;
}

/* C ref: sndprocs.h Soundeffect(seid, vol) — audio only; a no-op in the tty
 * build (no USER_SOUNDS), no state, no RNG.  se_boing is its enum tag. */
const se_boing = 'se_boing';
const se_zap = 'se_zap';
function Soundeffect(seid, vol) { /* sndprocs.h:272 no-op without USER_SOUNDS */ }



/* C muse.c:2797 mon_reflects / muse.c:2836 ureflects — ONE body each
 * (js/zap.js _mon_reflects_zap, js/makemon.js ureflects), re-exported. */
export { mon_reflects_real as mon_reflects };

/* C muse.c:3269 green_mon(): mons[].mcolor is CLR_GREEN or CLR_BRIGHT_GREEN.
 * permonst templates carry no mcolor, so read the MON_MCOLOR table by mndx. */
export function green_mon(mon) {
    if (_display_hallucinating()) return false;
    const mndx = (mon.mndx ?? mon.mnum ?? -1) | 0;
    const c = (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : -1;
    return c === CLR_GREEN || c === CLR_BRIGHT_GREEN;
}

export { MUSE_WAN_DEATH, MUSE_WAN_SLEEP, MUSE_WAN_FIRE, MUSE_WAN_COLD, MUSE_WAN_LIGHTNING, MUSE_WAN_MAGIC_MISSILE, MUSE_WAN_STRIKING, MUSE_POT_PARALYSIS, MUSE_POT_BLINDNESS, MUSE_POT_CONFUSION, MUSE_FROST_HORN, MUSE_FIRE_HORN, MUSE_POT_ACID, MUSE_WAN_TELEPORTATION, MUSE_POT_SLEEPING, MUSE_SCR_EARTH, MUSE_CAMERA, MUSE_WAN_UNDEAD_TURNING };

export { WAN_MAGIC_MISSILE, WAN_STRIKING, WAN_TELEPORTATION, WAN_UNDEAD_TURNING };

/* C muse.c:3031-3100 munslime(), reduced: the fire-breath-on-self arm
 * (muse_unslime's STRANGE_OBJECT branch, muse.c:3140-3150) and the escape-square
 * shuffle's rn1 draws (muse.c:3079-3093) are exact.  Curing by item
 * (cures_sliming: scroll of fire, wand/horn of fire)
 * remains incomplete; fire traps follow muse.c:3118-3140 below. */
export async function munslime(mon, by_you) {
    const mptr = mon.data;
    if (slimeproof(mptr))
        return false;
    if (mon.meating || helpless(mon))
        return false;
    mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITFORU;
    if (!mon.mcan && !mon.mspec_used && attacktype_fordmg_uh(mptr, 12 /* AT_BREA */, 2 /* AD_FIRE */)) {
        const vis = canseemon(mon);
        if (vis)
            pline_mon(mon, '%s starts turning %s.', Monnam(mon),
                      green_mon(mon) ? 'into ooze' : hcolor('green'));
        mon_adjust_speed(mon, -4, null);
        if (vis) {
            // C muse.c:3145 / do_name.c:1221: name once, then choose self pronoun.
            let subject = Monnam(mon);
            const self = mon_nam_too(mon, mon), verb = vtense(self, 'breath');
            if (verb === 'breath') {
                subject = makeplural(subject);
                if (subject.toLowerCase() === 'they')
                    subject = subject[0] === 'T' ? 'Them' : 'them';
            }
            pline_mon(mon, '%s %s fire on %s.', subject, verb, self);
        }
        if (!rn2(3))
            mon.mspec_used = rn1(10, 5);
        const dmg = await _zhitm(mon, by_you ? 21 : -21, 1);
        if (dmg) {
            if (DEADMONSTER(mon)) {
                if (by_you) await xkilled(mon, 1 | 4 /* XKILL_NOMSG | XKILL_NOCONDUCT */);
                else await monkilled(mon, 'fire', 2 /* AD_FIRE */);
            } else if (vis)
                pline_mon(mon, '%s is burned%s', Monnam(mon), exclam(dmg));
        }
        if (vis && !DEADMONSTER(mon))
            pline_mon(mon, '%s slime is burned away!', s_suffix(Monnam(mon)));
        mon.movement = (mon.movement | 0) - 12 /* NORMAL_SPEED */;
        mon.mlstmv = game.moves;
        return true;
    }
    if (!sr_is_animal(mptr) && !sr_mindless(mptr)) {
        /* C muse.c:3064-3066, 3168-3200, 3231-3241, 3254-3256: oil cure.
         * C rolls damage but does not subtract it from HP in this arm. */
        for (let obj = mon.minvent; obj; obj = obj.nobj) {
            if ((obj.otyp === 430 /* WAN_FIRE */
                 || (obj.otyp === 251 /* FIRE_HORN */ && can_blow(mon)))
                && (obj.spe | 0) > 0) {
                /* C muse.c:3246-3256 cures_sliming; muse_unslime wand/horn arm 3226-3234 */
                const vis = canseemon(mon);
                if (vis)
                    pline_mon(mon, '%s starts turning %s.', Monnam(mon),
                              green_mon(mon) ? 'into ooze' : hcolor('green'));
                mon_adjust_speed(mon, -4, null);
                if (obj.otyp === 251)
                    await mplayhorn(mon, obj, true);
                else
                    await mzapwand(mon, obj, true);
                const dmg = await _zhitm(mon, by_you ? 1 : -1, 2);
                if (dmg) {
                    if (DEADMONSTER(mon)) {
                        if (by_you) {
                            if (vis)
                                pline_mon(mon, '%s is %s by the fire!', Monnam(mon),
                                          nonlivingMon(mon.data.pmidx) ? 'destroyed' : 'killed');
                            await xkilled(mon, 1 | 4 /* XKILL_NOMSG | XKILL_NOCONDUCT */);
                        } else await monkilled(mon, 'fire', 2 /* AD_FIRE */);
                    } else if (vis)
                        pline_mon(mon, '%s is burned%s', Monnam(mon), exclam(dmg));
                }
                if (vis) {
                    if (!DEADMONSTER(mon))
                        pline_mon(mon, '%s slime is burned away!', s_suffix(Monnam(mon)));
                    discover_object(obj.otyp, true, true, true);
                }
                mon.movement = (mon.movement | 0) - 12 /* NORMAL_SPEED */;
                mon.mlstmv = game.moves;
                return true;
            }
            if (obj.otyp === 339 /* SCR_FIRE */
                && !((mptr.mflags1 | 0) & 0x00001000 /* M1_NOEYES */) && mon.mcansee
                && !((mptr.mflags1 | 0) & _UH_M1_NOHANDS)) {
                /* C muse.c:3246-3250 cures_sliming, 3098-3100 muse_unslime SCR_FIRE */
                let vis = canseemon(mon);
                let res = true;
                if (vis)
                    pline_mon(mon, '%s starts turning %s.', Monnam(mon), green_mon(mon) ? 'into ooze' : hcolor('green'));
                mon_adjust_speed(mon, -4, null);
                await mreadmsg(mon, obj);
                if (mon.mconf) {
                    if (cansee(mon.mx, mon.my))
                        pline('Oh, what a pretty fire!');
                    if (vis)
                        await trycall(obj);
                    await m_useup(mon, obj); /* after trycall() */
                    vis = false;
                    res = false;
                } else {
                    const dmg = Math.trunc((2 * (rn1(3, 3) + 2 * bcsign(obj)) + 1) / 3);
                    await m_useup(mon, obj); /* before explode() */
                    await explode_uh(mon.mx, mon.my, -11, dmg, 9 /* SCROLL_CLASS */,
                                     by_you ? -EXPL_FIERY : EXPL_FIERY);
                }
                if (vis) {
                    if (res && !DEADMONSTER(mon))
                        pline_mon(mon, '%s slime is burned away!', s_suffix(Monnam(mon)));
                    discover_object(339, true, true, true);
                }
                mon.movement = (mon.movement | 0) - 12 /* NORMAL_SPEED */;
                mon.mlstmv = game.moves;
                return res;
            }
            if (obj.otyp !== 321 /* POT_OIL */ || (mptr.mflags1 & _UH_M1_NOHANDS))
                continue;
            let vis = canseemon(mon);
            const was_lit = !!obj.lamplit;
            let saw_lit = false;
            if (vis)
                pline_mon(mon, '%s starts turning %s.', Monnam(mon), green_mon(mon) ? 'into ooze' : hcolor('green'));
            mon_adjust_speed(mon, -4, null);
            if (obj.quan > 1) obj = await splitobj(obj, 1);
            if (vis && !was_lit) {
                pline_mon(mon, '%s ignites %s.', Monnam(mon), ansimpleoname(obj));
                saw_lit = true;
            }
            begin_burn(obj, was_lit);
            vis ||= canseemon(mon);
            if (vis) {
                if (!Unaware()) observe_object(obj);
                pline('%s quaffs a burning %s', saw_lit ? upstart(mhe(mon)) : Monnam(mon), simpleonames(obj));
                discover_object(321, true, true, true);
            }
            const dmg = d(3, 4);
            await m_useup(mon, obj);
            if (vis) {
                pline_mon(mon, '%s is burned%s', Monnam(mon), exclam(dmg));
                pline_mon(mon, '%s slime is burned away!', s_suffix(Monnam(mon)));
                discover_object(321, true, true, true);
            }
            mon.movement = (mon.movement | 0) - 12;
            mon.mlstmv = game.moves;
            return true;
        }
        let t = t_at(mon.mx, mon.my);
        if ((!t || t.ttyp !== FIRE_TRAP) && (mptr.mmove | 0) && !mon.mtrapped) {
            const xy = [];
            for (let x = mon.mx - 1; x <= mon.mx + 1; ++x)
                for (let y = mon.my - 1; y <= mon.my + 1; ++y)
                    if (isok(x, y) && accessible(x, y) && !m_at(x, y)
                        && (x !== game.u.ux || y !== game.u.uy))
                        xy.push([x, y]);
            for (let idx = 0; idx < xy.length; ++idx) {
                const ridx = rn1(xy.length - idx, idx);
                if (ridx !== idx) { const tmp = xy[idx]; xy[idx] = xy[ridx]; xy[ridx] = tmp; }
                t = t_at(xy[idx][0], xy[idx][1]);
                if (t && t.ttyp === FIRE_TRAP)
                    break;
            }
        }
        if (t && t.ttyp === FIRE_TRAP) {
            const vis = canseemon(mon);
            if (vis) pline_mon(mon, '%s starts turning %s.', Monnam(mon), green_mon(mon) ? 'into ooze' : hcolor('green'));
            mon_adjust_speed(mon, -4, null);
            const Mnam = vis ? Monnam(mon) : null;
            if (mon.mx === t.tx && mon.my === t.ty) {
                if (vis) pline('%s triggers %s fire trap!', Mnam, t.tseen ? 'the' : 'a');
            } else {
                mon._mapRemoved = true;
                newsym(mon.mx, mon.my);
                place_monster(mon, t.tx, t.ty);
                if (mon.wormno) worm_move(mon);
                newsym(mon.mx, mon.my);
                if (vis) pline('%s %s %s %s fire trap!', Mnam, vtense('Someone', locomotion(mptr, 'move')), mptr.mlet === 5 || mptr.mlet === 25 ? 'over' : 'onto', t.tseen ? 'the' : 'a');
            }
            await mintrap(mon, 1 /* FORCETRAP */);
            if (vis && !DEADMONSTER(mon))
                pline_mon(mon, '%s slime is burned away!', s_suffix(Monnam(mon)));
            mon.movement = (mon.movement | 0) - 12 /* NORMAL_SPEED */;
            mon.mlstmv = game.moves;
            return true;
        }
    }
    return false;
}

/* C muse.c:3001-3031: animals cannot open tins; a welded weapon limits
 * the tools available, otherwise any carried opener/dagger/knife works. */
function mcould_eat_tin_uh(mon) {
    if (sr_is_animal(mon.data)) return false;
    const mwep = sr_MON_WEP(mon), welded = mwep && mwelded(mwep);
    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        if (welded && obj !== mwep) continue;
        if (obj.otyp === 239 /* TIN_OPENER */
            || (obj.oclass === WEAPON_CLASS
                && [P_DAGGER, P_KNIFE].includes(sr_oc_skill(obj.otyp)))) return true;
    }
    return false;
}

export async function munstone(mdef, by_you) {
    /* C muse.c:2884-2903,2983-2998: lizard or acidic meat cures stoning,
     * including tinned meat when the monster can open the tin. */
    if (resists_ston_real(mdef) || mdef.meating || helpless(mdef)) return false;
    mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
    const CORPSE = 265, POT_ACID = 320, TIN = 296;
    const tinok = mcould_eat_tin_uh(mdef);
    for (let obj = mdef?.minvent; obj; obj = obj.nobj) {
        const isAcidPotion = (obj.otyp | 0) === POT_ACID;
        const isSlimeCure = obj.otyp === 273 /* GLOB_OF_GREEN_SLIME */ && slimeproof(mdef.data);
        const isTinCure = (obj.otyp | 0) === TIN;
        const food = (obj.otyp | 0) === CORPSE || (isTinCure && tinok);
        const corpsePm = food && (obj.corpsenm | 0) >= 0 ? permonstTemplate(obj.corpsenm | 0) : null;
        const acidic = !!(corpsePm && ((corpsePm.mflags1 >>> 0) & 0x08000000));
        if (!isAcidPotion && !isSlimeCure && !(food && corpsePm && (obj.corpsenm === PM_LIZARD || acidic)))
            continue;
        /* C muse.c:2911-2979 mon_consume_unstone: nutrition sets meating
         * before the speed message; eating also uses the next movement turn. */
        const vis = canseemon(mdef), lizard = obj.corpsenm === PM_LIZARD && !isAcidPotion;
        const nutrit = food ? dog_nutrition(mdef, obj) : 0;
        mon_adjust_speed(mdef, -3, null);
        if (vis) {
            const save_quan = obj.quan;
            obj.quan = 1;
            const name = await distant_name(obj, doname);
            set_msg_xy_uh(mdef.mx, mdef.my);
            await pline('%s %s %s.', Monnam(mdef), isAcidPotion ? 'quaffs' : isTinCure ? 'opens and eats the contents of' : 'eats', name);
            obj.quan = save_quan;
        } else if (!Deaf()) await You_hear(isAcidPotion ? 'drinking.' : 'chewing.');
        await m_useup(mdef, obj);
        /* C muse.c:2941-2955: untinned acid can kill the monster before
         * the petrification cure message or movement cost. */
        if ((isAcidPotion || acidic) && !isTinCure && !Resists_Elem(mdef, ACID_RES)) {
            mdef.mhp -= rnd(15);
            if (vis) {
                set_msg_xy_uh(mdef.mx, mdef.my);
                await pline('%s has a very bad case of stomach acid.', Monnam(mdef));
            }
            if (DEADMONSTER(mdef)) {
                set_msg_xy_uh(mdef.mx, mdef.my);
                await pline('%s dies!', Monnam(mdef));
                if (by_you) await xkilled(mdef, XKILL_NOMSG | XKILL_NOCONDUCT);
                else await mondead(mdef);
                return true;
            }
        }
        if (vis) {
            const halluc = _hero_resists(HALLUC) && !_hero_resists(HALLUC_RES);
            if (!halluc) set_msg_xy_uh(mdef.mx, mdef.my);
            await pline(halluc
                ? 'What a pity - %s just ruined a future piece of art!' : '%s seems limber!',
                halluc ? mon_nam(mdef) : Monnam(mdef));
        }
        if (lizard && (mdef.mconf || mdef.mstun)) {
            mdef.mconf = mdef.mstun = 0;
            if (vis && ![PM_BAT, PM_GIANT_BAT, PM_VAMPIRE_BAT, PM_STALKER].includes(mdef.data.pmidx))
                pline_mon(mdef, '%s seems steadier now.', Monnam(mdef));
        }
        if (mdef.mtame && !mdef.isminion && nutrit > 0) {
            const edog = mdef.mextra.edog;
            edog.hungrytime = Math.max(edog.hungrytime, game.moves) + nutrit;
            mdef.mconf = 0;
        }
        mdef.movement -= NORMAL_SPEED_UH;
        mdef.mlstmv = game.moves;
        return true;
    }
    return false;
}

function _makemon_blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}

const TIN_OPENER_MM = 239, WEAPON_CLASS_MM = 1; /* objects.h, objclass.h */

/* C ref: muse.c:3000-3027 mcould_eat_tin(mon) — the tin opener or dagger
 * need not be wielded; a welded weapon hides the rest of the inventory. */
function mcould_eat_tin(mon) {
    /* monkeys who manage to steal tins can't open and eat them */
    if (isAnimal(monsndx(mon)))
        return false;
    const mwep = MON_WEP(mon);
    const welded_wep = mwep && mwelded(mwep);
    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        if (welded_wep && obj !== mwep)
            continue;
        const skill = MKOBJ_OC_SKILL[obj.otyp | 0] | 0;
        if ((obj.otyp | 0) === TIN_OPENER_MM
            || ((obj.oclass | 0) === WEAPON_CLASS_MM
                && (skill === P_DAGGER || skill === P_KNIFE)))
            return true;
    }
    return false;
}

const PLNMSG_enum_MM = PLNMSG_MON_TAKES_OFF_ITEM + 1;

const M1_WALLWALK = 0x00000008;

const M1_NOEYES = 0x00001000;

const M1_NOHANDS = 0x00002000;

/** C monst.h MZ_SMALL physical size (sliparm). */
const MZ_SMALL = 1;

const M_SEEN_FIRE    = 0x0002; /* monst.h:78  Fire_resistance, AD_FIRE */

const M_SEEN_COLD    = 0x0004; /* monst.h:79  Cold_resistance, AD_COLD */

const M_SEEN_SLEEP   = 0x0008; /* monst.h:80  Sleep_resistance, AD_SLEE */

const M_SEEN_ELEC    = 0x0020; /* monst.h:82  Shock_resistance, AD_ELEC */

const M_SEEN_ACID    = 0x0080; /* monst.h:84  Acid_resistance, AD_ACID */

const M_SEEN_REFL    = 0x0100; /* monst.h:85  reflection, no corresponding AD_foo */

const WAN_DEATH = 433;

const WAN_SLEEP = 432;

const WAN_FIRE = 430;

const FIRE_HORN = 251;

const WAN_COLD = 431;

const WAN_LIGHTNING = 434;

const POT_PARALYSIS = 301;

const POT_BLINDNESS = 300;

const POT_CONFUSION = 299;

const POT_SLEEPING = 314;

const POT_ACID = 320;

const SCR_EARTH = 340;

const EXPENSIVE_CAMERA = 229;

const BUGLE = 256;

/* C monattk.h:69 AD_HEAL 27, monattk.h:25 AT_GAZE 15 (were 1 and 1). */
const AD_HEAL = 27;

const AT_GAZE = 15;

/* C macro wrappers — use mtmp.data (permonst template object) */
function is_animal(data) { return (data.mflags1 & M1_ANIMAL) !== 0; }

function mindless(data) { return (data.mflags1 & M1_MINDLESS) !== 0; }

/* C mondata.h:52 — #define nohands(ptr) (((ptr)->mflags1 & M1_NOHANDS) != 0L) */
function nohands(data) { return (data.mflags1 & M1_NOHANDS) !== 0; }

function amorphous(data) { return (data.mflags1 & M1_AMORPHOUS) !== 0; }

function passes_walls(data) { return (data.mflags1 & M1_WALLWALK) !== 0; }

function unsolid(data) { return (data.mflags1 & M1_UNSOLID) !== 0; }

function noncorporeal(data) { return data.mlet === S_GHOST; }

/* C mondata.h:46 — #define haseyes(ptr) (((ptr)->mflags1 & M1_NOEYES) == 0L) */
function haseyes(data) { return (data.mflags1 & M1_NOEYES) === 0; }

/* m_seenres — C monst.h:88
 *   #define m_seenres(mon, mask) ((mon)->seen_resistance & (mask))
 * This read `mtmp.mextrinsics` (monst.h:117), which is a DIFFERENT field in a
 * DIFFERENT bit space: mextrinsics carries MR_* resistance bits (monst.h:269
 * mon_resistancebits) while the masks passed here are M_SEEN_* (monst.h:75-86).
 * Masking MR_* bits with an M_SEEN_* mask answers an unrelated question. */
function m_seenres(mtmp, mask) {
    return (mtmp.seen_resistance & mask) !== 0 ? 1 : 0;
}

/* C include/mondata.h:215
 *   #define hates_light(ptr) ((ptr) == &mons[PM_GREMLIN])
 * The gremlin, and nothing else -- there is no mlet test and no undead clause.
 * This used to answer `mlet is S_VAMPIRE || S_GHOST || S_ZOMBIE || S_LICH`,
 * which is a different predicate entirely (C's undead-ish set is
 * mondata.h:184 is_undead()); it named none of the four monsters C names and
 * missed the one it does.
 * `mons[PM_X]` identity is spelled here as the permonst's own form index,
 * the same `pmidx` convention this file already uses at :667, :687, :696. */
function hates_light(data) {
    return !!data && (data.pmidx | 0) === PM_GREMLIN;
}

export function find_offensive(mtmp) {
    if (ENV.FF_OFFENSE_TRACE === '1')
        pushRngLogEntry(`^offense_enter[moves=${game.moves|0} id=${mtmp.m_id|0} pos=${mtmp.mx|0},${mtmp.my|0} target=${mtmp.mux|0},${mtmp.muy|0}]`);
    let obj, mtmp_helmet;
    let reflection_skip;

    game.offensive = null;
    game.has_offense = 0;
    if (mtmp.mpeaceful || is_animal(mtmp.data) || mindless(mtmp.data)
        || nohands(mtmp.data))
        return false;
    if (game.u.uswallow)
        return false;
    if (in_your_sanctuary(mtmp, 0, 0))
        return false;
    if (dmgtype(mtmp.data, AD_HEAL)
        && !game.u.uwep && !game.u.uarmu && !game.u.uarm && !game.u.uarmh
        && !game.u.uarms && !game.u.uarmg && !game.u.uarmc && !game.u.uarmf)
        return false;
    /* all offensive items require orthogonal or diagonal targeting */
    if (!lined_up(mtmp))
        return false;

    reflection_skip = (m_seenres(mtmp, M_SEEN_REFL) !== 0
                       || monnear(mtmp, mtmp.mux, mtmp.muy));
    mtmp_helmet = which_armor(mtmp, W_ARMH);
    /* this picks the last viable item rather than prioritizing choices */
    for (obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (!reflection_skip) {
            if (game.has_offense === MUSE_WAN_DEATH) continue;
            if (obj.otyp === WAN_DEATH && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_DEATH;
            }
            if (game.has_offense === MUSE_WAN_SLEEP) continue;
            if (obj.otyp === WAN_SLEEP && obj.spe > 0 && game.multi >= 0
                && !m_seenres(mtmp, M_SEEN_SLEEP)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_SLEEP;
            }
            if (game.has_offense === MUSE_WAN_FIRE) continue;
            if (obj.otyp === WAN_FIRE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_FIRE;
            }
            if (game.has_offense === MUSE_FIRE_HORN) continue;
            if (obj.otyp === FIRE_HORN && obj.spe > 0 && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.offensive = obj;
                game.has_offense = MUSE_FIRE_HORN;
            }
            if (game.has_offense === MUSE_WAN_COLD) continue;
            if (obj.otyp === WAN_COLD && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_COLD;
            }
            if (game.has_offense === MUSE_FROST_HORN) continue;
            if (obj.otyp === FROST_HORN && obj.spe > 0 && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.offensive = obj;
                game.has_offense = MUSE_FROST_HORN;
            }
            if (game.has_offense === MUSE_WAN_LIGHTNING) continue;
            if (obj.otyp === WAN_LIGHTNING && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_ELEC)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_LIGHTNING;
            }
            if (game.has_offense === MUSE_WAN_MAGIC_MISSILE) continue;
            if (obj.otyp === WAN_MAGIC_MISSILE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_MAGIC_MISSILE;
            }
        }
        if (game.has_offense === MUSE_WAN_UNDEAD_TURNING) continue;
        m_use_undead_turning(mtmp, obj);
        if (game.has_offense === MUSE_WAN_STRIKING) continue;
        if (obj.otyp === WAN_STRIKING && obj.spe > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            game.offensive = obj;
            game.has_offense = MUSE_WAN_STRIKING;
        }
        if (game.has_offense === MUSE_WAN_TELEPORTATION) continue;
        if (obj.otyp === WAN_TELEPORTATION && obj.spe > 0
            /* don't give controlled hero a free teleport */
            && !(game.u?.uprops?.[TELEPORT_CONTROL]?.intrinsic
                || game.u?.uprops?.[TELEPORT_CONTROL]?.extrinsic)
            /* same hack as MUSE_WAN_TELEPORTATION_SELF */
            && (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP))
            /* do try to move hero to a more vulnerable spot */
            && (onscary(game.u.ux, game.u.uy, mtmp)
                || (hero_behind_chokepoint(mtmp) && mon_has_friends(mtmp))
                || mon_likes_objpile_at(mtmp, game.u.ux, game.u.uy)
                || stairway_at(game.u.ux, game.u.uy))) {
            game.offensive = obj;
            game.has_offense = MUSE_WAN_TELEPORTATION;
        }
        if (game.has_offense === MUSE_POT_PARALYSIS) continue;
        if (obj.otyp === POT_PARALYSIS && game.multi >= 0) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_PARALYSIS;
        }
        if (game.has_offense === MUSE_POT_BLINDNESS) continue;
        if (obj.otyp === POT_BLINDNESS && !attacktype(mtmp.data, AT_GAZE)) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_BLINDNESS;
        }
        if (game.has_offense === MUSE_POT_CONFUSION) continue;
        if (obj.otyp === POT_CONFUSION) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_CONFUSION;
        }
        if (game.has_offense === MUSE_POT_SLEEPING) continue;
        if (obj.otyp === POT_SLEEPING
            && !m_seenres(mtmp, M_SEEN_SLEEP)) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_SLEEPING;
        }
        if (game.has_offense === MUSE_POT_ACID) continue;
        if (obj.otyp === POT_ACID
            && !m_seenres(mtmp, M_SEEN_ACID)) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_ACID;
        }
        /* we can safely put this scroll here since the locations that
         * are in a 1 square radius are a subset of the locations that
         * are in wand or throwing range (in other words, always lined_up())
         */
        if (game.has_offense === MUSE_SCR_EARTH) continue;
        if (obj.otyp === SCR_EARTH
            && (hard_helmet(mtmp_helmet) || mtmp.mconf
                || amorphous(mtmp.data) || passes_walls(mtmp.data)
                || noncorporeal(mtmp.data) || unsolid(mtmp.data)
                || !rn2(10))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && mtmp.mcansee && haseyes(mtmp.data)
            && !Is_rogue_level(game.u.uz)
            && (!In_endgame(game.u.uz) || Is_earthlevel(game.u.uz))) {
            game.offensive = obj;
            game.has_offense = MUSE_SCR_EARTH;
        }
        if (game.has_offense === MUSE_CAMERA) continue;
        if (obj.otyp === EXPENSIVE_CAMERA
            && ((!_makemon_blind() && !resists_blnd(game.youmonst))
                || hates_light(game.youmonst.data))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && obj.spe > 0 && !rn2(6)) {
            game.offensive = obj;
            game.has_offense = MUSE_CAMERA;
        }
    }
    if (ENV.FF_OFFENSE_TRACE === '1') {
        const inv = [];
        for (let o = mtmp.minvent; o && inv.length < 32; o = o.nobj)
            inv.push(`${o.otyp}:${o.spe}:${o.oclass}`);
        pushRngLogEntry(`^offense[moves=${game.moves|0} id=${mtmp.m_id|0} pos=${mtmp.mx|0},${mtmp.my|0} target=${mtmp.mux|0},${mtmp.muy|0} chosen=${game.has_offense|0} obj=${game.offensive?.otyp ?? -1} inv=${inv.join(',')}]`);
    }
    return !!game.has_offense;
}

/* Defensive MUSE_* constants (C values from muse.c defensive section) */
const MUSE_SCR_TELEPORTATION = 1;

const MUSE_WAN_TELEPORTATION_SELF = 2;

const MUSE_POT_HEALING = 3;

const MUSE_POT_EXTRA_HEALING = 4;

const MUSE_WAN_DIGGING = 5;

const MUSE_TRAPDOOR = 6;

const MUSE_TELEPORT_TRAP = 7;

const MUSE_UPSTAIRS = 8;

const MUSE_DOWNSTAIRS = 9;

const MUSE_WAN_CREATE_MONSTER = 10;

const MUSE_SCR_CREATE_MONSTER = 11;

const MUSE_UP_LADDER = 12;

const MUSE_DN_LADDER = 13;

const MUSE_SSTAIRS = 14;

const MUSE_BUGLE = 16;

const MUSE_UNICORN_HORN = 17;

const MUSE_LIZARD_CORPSE = 19;

/* MUSE_WAN_TELEPORTATION (C=15) and MUSE_WAN_UNDEAD_TURNING (C=20) are
   declared once, above, with C's values; C's defensive and offensive blocks
   agree on both (muse.c:322 == muse.c:1286; muse.c:327 is not redefined by
   the offensive block by design), so the defensive code shares them.
   MUSE_POT_FULL_HEALING (C muse.c:325 = 18) collides in the JS single scope
   with the offensive MUSE_CAMERA (C muse.c:1289 = 18) — C keeps them apart by
   #define shadowing, JS cannot, so the defensive one carries a _DEF suffix.
   The VALUE is C's; only the JS identifier differs. */
const MUSE_POT_FULL_HEALING_DEF = 18;

/* Object type aliases needed by find_defensive */
const UNICORN_HORN = _UNICORN_HORN;

const WAN_DIGGING = WAN_DIGGING_OTYP;

const SCR_TELEPORTATION = SCR_TELEPORTATION_OTYP;

const WAN_CREATE_MONSTER = WAN_CREATE_MONSTER_OTYP;

const SCR_CREATE_MONSTER = SCR_CREATE_MONSTER_OTYP;

const POT_FULL_HEALING = POT_FULL_HEALING_OTYP;

const POT_EXTRA_HEALING = POT_EXTRA_HEALING_OTYP;

const POT_HEALING = POT_HEALING_OTYP;

/* C ref: muse.c m_use_healing(mtmp) — pick the best healing potion the monster
 * carries, in full > extra > plain order.  find_defensive() below called this
 * with NO definition anywhere in js/, so the scored run died with a bare
 * `ReferenceError: m_use_healing is not defined` the first time a monster
 * reached the healing arm.  MUSE_POT_FULL_HEALING is spelled
 * MUSE_POT_FULL_HEALING_DEF here (see the collision note above). */
function m_use_healing(mtmp) {
    let obj;
    if ((obj = m_carrying(mtmp, POT_FULL_HEALING)) != null) {
        game.defensive = obj;
        game.has_defense = MUSE_POT_FULL_HEALING_DEF;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_EXTRA_HEALING)) != null) {
        game.defensive = obj;
        game.has_defense = MUSE_POT_EXTRA_HEALING;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_HEALING)) != null) {
        game.defensive = obj;
        game.has_defense = MUSE_POT_HEALING;
        return true;
    }
    return false;
}

const POT_SICKNESS = POT_SICKNESS_OTYP;

/* C mondata.h:200-201
 *   #define touch_petrifies(ptr) \
 *       ((ptr) == &mons[PM_COCKATRICE] || (ptr) == &mons[PM_CHICKATRICE])
 * Every C caller in muse.c spells the argument `&mons[<some>->corpsenm]`, i.e.
 * it is a mons[] row addressed by a monster index.  Because mons[] rows are
 * unique addresses, the C pointer comparison is exactly an index comparison, so
 * the faithful JS form takes the corpsenm index directly rather than
 * materializing a permonst object only to compare its identity — JS object
 * identity would never match, since permonstTemplate() mints a fresh object per
 * call (see the `.pmidx ===` idiom used throughout js/ for `== &mons[X]`). */
function touch_petrifies_corpsenm(corpsenm) {
    const cn = corpsenm | 0;
    return cn === PM_COCKATRICE || cn === PM_CHICKATRICE;
}

function m_sees_sleepy_soldier(mtmp) {
    const x = mtmp.mx | 0, y = mtmp.my | 0;
    for (let xx = x - 3; xx <= x + 3; xx++) {
        for (let yy = y - 3; yy <= y + 3; yy++) {
            if (!isok(xx, yy) || (xx === x && yy === y))
                continue;
            const mon = m_at(xx, yy);
            if (mon && is_mercenary(mon.data)
                && (mon.data.pmidx | 0) !== PM_GUARD
                && helpless(mon))
                return true;
        }
    }
    return false;
}

function is_Vlad(mtmp) {
    if (!mtmp) return false;
    return (mtmp.data && (mtmp.data.pmidx | 0) === PM_VLAD_THE_IMPALER)
        || mtmp.cham === PM_VLAD_THE_IMPALER;
}

export function find_defensive(mtmp, tryescape) {
    let obj, t, fraction, x, y, stuck, immobile, stway;
    let i, xx, yy;
    let locs;

    x = mtmp.mx;
    y = mtmp.my;
    stuck = (mtmp === game.u.ustuck);
    immobile = (mtmp.data.mmove === 0);

    game.defensive = null;
    game.has_defense = 0;

    if (is_animal(mtmp.data) || mindless(mtmp.data))
        return false;
    if (!tryescape && dist2(x, y, mtmp.mux, mtmp.muy) > 25)
        return false;
    if (tryescape && Is_knox_level(game.u.uz)
        && !m_next2u(mtmp) && m_next2m(mtmp))
        return false;
    if (game.u.uswallow && stuck)
        return false;

    /* Unicorn horn usage */
    if (mtmp.mconf || mtmp.mstun || !mtmp.mcansee) {
        obj = null;
        if (!nohands(mtmp.data)) {
            for (obj = mtmp.minvent; obj; obj = obj.nobj)
                if (obj.otyp === UNICORN_HORN && !obj.cursed)
                    break;
        }
        if (obj || is_unicorn(mtmp.data) || mtmp.data.pmidx === PM_KI_RIN) {
            game.defensive = obj;
            game.has_defense = MUSE_UNICORN_HORN;
            return true;
        }
    }

    if (mtmp.mconf || mtmp.mstun) {
        let liztin = null;

        for (obj = mtmp.minvent; obj; obj = obj.nobj) {
            if (obj.otyp === CORPSE && obj.corpsenm === PM_LIZARD) {
                game.defensive = obj;
                game.has_defense = MUSE_LIZARD_CORPSE;
                return true;
            } else if (obj.otyp === TIN && obj.corpsenm === PM_LIZARD) {
                liztin = obj;
            }
        }
        if (liztin && mcould_eat_tin(mtmp) && rn2(3)) {
            game.defensive = liztin;
            game.has_defense = MUSE_LIZARD_CORPSE;
            return true;
        }
    }

    /* healing when blind */
    if (!mtmp.mcansee && !nohands(mtmp.data)
        && mtmp.data.pmidx !== PM_PESTILENCE) {
        if (m_use_healing(mtmp))
            return true;
    }

    /* undead turning against corpse wielder */
    if (!mtmp.mpeaceful && !nohands(mtmp.data)
        && game.u.uwep && game.u.uwep.otyp === CORPSE
        && touch_petrifies_corpsenm(game.u.uwep.corpsenm)
        && !poly_when_stoned(mtmp.data) && !resists_ston(mtmp)
        && lined_up(mtmp)) {
        for (obj = mtmp.minvent; obj; obj = obj.nobj)
            if (obj.otyp === WAN_UNDEAD_TURNING && obj.spe > 0) {
                game.defensive = obj;
                game.has_defense = MUSE_WAN_UNDEAD_TURNING;
                return true;
            }
    }

    if (!tryescape) {
        fraction = game.u.ulevel < 10 ? 5 : game.u.ulevel < 14 ? 4 : 3;
        if (mtmp.mhp >= mtmp.mhpmax
            || (mtmp.mhp >= 10 && mtmp.mhp * fraction >= mtmp.mhpmax))
            return false;

        if (mtmp.mpeaceful) {
            if (!nohands(mtmp.data)) {
                if (m_use_healing(mtmp))
                    return true;
            }
            return false;
        }
    }

    if (stuck || immobile || mtmp.mtrapped) {
        /* fleeing by stairs or traps is not possible */
    } else if (game.level.locations[x][y].typ === STAIRS) {
        stway = stairway_at(x, y);
        if (stway && !stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.has_defense = MUSE_DOWNSTAIRS;
        } else if (stway && stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            game.has_defense = MUSE_UPSTAIRS;
        } else if (stway && stway.tolev.dnum !== game.u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.has_defense = MUSE_SSTAIRS;
        }
    } else if (game.level.locations[x][y].typ === LADDER) {
        stway = stairway_at(x, y);
        if (stway && stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            game.has_defense = MUSE_UP_LADDER;
        } else if (stway && !stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.has_defense = MUSE_DN_LADDER;
        } else if (stway && stway.tolev.dnum !== game.u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.has_defense = MUSE_SSTAIRS;
        }
    } else {
        let ignore_boulders = (verysmall(mtmp.data)
                               || throws_rocks(mtmp.data)
                               || passes_walls(mtmp.data));
        /* C mondata.h:10 — #define monsndx(ptr) ((ptr)->pmidx).  This file's
         * local monsndx() helper takes a MONSTER (mtmp.mndx ?? mtmp.mnum), not
         * a permonst, so passing mtmp.data through it read an unsourced field
         * and threw off the permonst strict proxy.  find_misc (below) already
         * spells this as mdat.pmidx; match it. */
        let diag_ok = !NODIAG(mtmp.data.pmidx);

        locs = new Array(10);
        for (i = 0; i < 10; ++i)
            locs[i] = [0, 0];
        locs[0][0] = x; locs[0][1] = y;
        i = 1;
        for (xx = x - 1; xx <= x + 1; xx++)
            for (yy = y - 1; yy <= y + 1; yy++)
                if (isok(xx, yy) && (xx !== x || yy !== y)) {
                    locs[i][0] = xx; locs[i][1] = yy;
                    ++i;
                }
        for (i = 0; i < 10; ++i) {
            xx = locs[i][0]; yy = locs[i][1];
            if (!xx)
                break;
            if (u_at(xx, yy)
                || (xx !== x && yy !== y && !diag_ok)
                /* C `svl.level.monsters[xx][yy]` — the monster-presence grid.
                 * game.level has no such grid; find_misc below already spells
                 * this lookup as monster_at() (the fmon walk). Match it. */
                || (monster_at(xx, yy) && !(xx === x && yy === y)))
                continue;
            t = t_at(xx, yy);
            if (!t
                || (!ignore_boulders && sobj_at(BOULDER, xx, yy))
                || onscary(xx, yy, mtmp))
                continue;
            if (is_hole(t.ttyp)
                && !is_floater(mtmp.data)
                && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
                && Can_fall_thru(game.u.uz)) {
                game.trapx = xx;
                game.trapy = yy;
                game.has_defense = MUSE_TRAPDOOR;
                break;
            } else if (t.ttyp === TELEP_TRAP) {
                game.trapx = xx;
                game.trapy = yy;
                game.has_defense = MUSE_TELEPORT_TRAP;
            }
        }
    }

    if (!nohands(mtmp.data)) {
        /* C muse.c:640 `(obj = m_carrying(mtmp, BUGLE)) != 0` is a POINTER
         * non-NULL test.  The port spelled it `!== 0`, which in JS is TRUE for
         * the null m_carrying returns when the monster has no bugle — so the
         * guard collapsed to is_mercenary && m_sees_sleepy_soldier and could
         * set has_defense = MUSE_BUGLE with gm.m.defensive == NULL. */
        if (is_mercenary(mtmp.data) && (obj = m_carrying(mtmp, BUGLE)) != null
            && m_sees_sleepy_soldier(mtmp)) {
            game.defensive = obj;
            game.has_defense = MUSE_BUGLE;
        }

        if (!game.has_defense) {
            t = t_at(x, y);
            if (t && (is_pit(t.ttyp) || t.ttyp === WEB || t.ttyp === BEAR_TRAP))
                t = null;

            for (obj = mtmp.minvent; obj; obj = obj.nobj) {
                if (game.has_defense && !rn2(3))
                    break;

                if (game.has_defense === MUSE_WAN_DIGGING)
                    break;
                if (obj.otyp === WAN_DIGGING && obj.spe > 0 && !stuck && !t
                    && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
                    && !is_floater(mtmp.data)
                    && !sokobanRules()
                    && !(game.level.locations[x][y].wall_info & W_NONDIGGABLE)
                    && !(Is_botlevel(game.u.uz) || In_endgame(game.u.uz))
                    && !(is_ice(x, y) || is_pool(x, y) || is_lava(x, y))
                    && !(is_Vlad(mtmp) && In_V_tower(game.u.uz))) {
                    game.defensive = obj;
                    game.has_defense = MUSE_WAN_DIGGING;
                }
                if (game.has_defense === MUSE_WAN_TELEPORTATION_SELF) continue;
                if (game.has_defense === MUSE_WAN_TELEPORTATION) continue;
                if (obj.otyp === WAN_TELEPORTATION && obj.spe > 0) {
                    if (!noteleport_level(mtmp)
                        || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                        game.defensive = obj;
                        game.has_defense = (mon_has_amulet(mtmp))
                                            ? MUSE_WAN_TELEPORTATION
                                            : MUSE_WAN_TELEPORTATION_SELF;
                    }
                }
                if (game.has_defense === MUSE_SCR_TELEPORTATION) continue;
                if (obj.otyp === SCR_TELEPORTATION && mtmp.mcansee
                    && haseyes(mtmp.data)
                    && (!obj.cursed || (!(mtmp.isshk && inhishop(mtmp))
                                         && !mtmp.isgd && !mtmp.ispriest))) {
                    if (!noteleport_level(mtmp)
                        || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                        game.defensive = obj;
                        game.has_defense = MUSE_SCR_TELEPORTATION;
                    }
                }

                if (mtmp.data.pmidx !== PM_PESTILENCE) {
                    if (game.has_defense === MUSE_POT_FULL_HEALING_DEF) continue;
                    if (obj.otyp === POT_FULL_HEALING) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_FULL_HEALING_DEF;
                    }
                    if (game.has_defense === MUSE_POT_EXTRA_HEALING) continue;
                    if (obj.otyp === POT_EXTRA_HEALING) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_EXTRA_HEALING;
                    }
                    if (game.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
                    if (obj.otyp === WAN_CREATE_MONSTER && obj.spe > 0) {
                        game.defensive = obj;
                        game.has_defense = MUSE_WAN_CREATE_MONSTER;
                    }
                    if (game.has_defense === MUSE_POT_HEALING) continue;
                    if (obj.otyp === POT_HEALING) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_HEALING;
                    }
                } else { /* Pestilence */
                    if (game.has_defense === MUSE_POT_FULL_HEALING_DEF) continue;
                    if (obj.otyp === POT_SICKNESS) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_FULL_HEALING_DEF;
                    }
                    if (game.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
                    if (obj.otyp === WAN_CREATE_MONSTER && obj.spe > 0) {
                        game.defensive = obj;
                        game.has_defense = MUSE_WAN_CREATE_MONSTER;
                    }
                }
                if (game.has_defense === MUSE_SCR_CREATE_MONSTER) continue;
                if (obj.otyp === SCR_CREATE_MONSTER) {
                    game.defensive = obj;
                    game.has_defense = MUSE_SCR_CREATE_MONSTER;
                }
            }
        }
    }

    return !!game.has_defense;
}

/* MUSE_* constants for find_misc (C values from muse.c:2083-2092) */
const MUSE_POT_GAIN_LEVEL = 1;

const MUSE_WAN_MAKE_INVISIBLE = 2;

const MUSE_POT_INVISIBILITY = 3;

const MUSE_POLY_TRAP = 4;

const MUSE_WAN_POLYMORPH = 5;

const MUSE_POT_SPEED = 6;

const MUSE_WAN_SPEED_MONSTER = 7;

const MUSE_BULLWHIP = 8;

const MUSE_POT_POLYMORPH = 9;

const MUSE_BAG = 10;

/* Object type constants for find_misc (real otyp values, objects.h order) */
const BULLWHIP_OTYP = 82;

const LARGE_BOX_OTYP = 214;

const ICE_BOX_OTYP = 216;

const BAG_OF_HOLDING_OTYP = 219;

const BAG_OF_TRICKS_OTYP = 220;

const BOULDER_OTYP = 475;

const MFAST = 2; /* C monst.h: speeded monster */

const PM_GRID_BUG = 116; /* pm.generated.js PM_GRID_BUG */

/* C hack.h:1419 NODIAG(monnum) = ((monnum) == PM_GRID_BUG) */
function NODIAG(monnum) { return (monnum | 0) === PM_GRID_BUG; }

/* C mondata.h verysmall(ptr) = ((ptr)->msize < MZ_SMALL) */
/* C mondata.h:20 — #define is_floater(ptr)
 *     ((ptr)->mlet == S_EYE || (ptr)->mlet == S_LIGHT) */
function is_floater(data) { return data.mlet === S_EYE || data.mlet === S_LIGHT; }

function is_mercenary(data) { return (data.mflags2 & M2_MERC) !== 0; }

function verysmall(data) { return data.msize < MZ_SMALL; }

/* C youprop.h See_invisible = (HSee_invisible || ESee_invisible) */
function See_invisible() {
    const p = game.u.uprops[SEE_INVIS];
    return (p.intrinsic || p.extrinsic) !== 0;
}

/* C you.h:553 m_next2u(m) = (distu((m)->mx,(m)->my) <= 2) */
function m_next2u(mon) { return dist2(mon.mx, mon.my, game.u.ux, game.u.uy) <= 2; }

function m_next2m(mtmp) {
    if ((mtmp.mhp | 0) < 1 || ((mtmp.mstate | 0) !== 0))
        return false;
    for (let x = mtmp.mx - 1; x <= mtmp.mx + 1; x++)
        for (let y = mtmp.my - 1; y <= mtmp.my + 1; y++) {
            if (!isok(x, y))
                continue;
            const m2 = monster_at(x, y);
            if (m2 && m2 !== mtmp)
                return true;
        }
    return false;
}

/* C monst.h:208 MON_WEP(mon) = ((mon)->mw) */
function MON_WEP(mon) { return mon.mw; }

/* C obj.h:337 Is_container(o) = ((o)->otyp >= LARGE_BOX && (o)->otyp <= BAG_OF_TRICKS) */
function Is_container(o) { return o.otyp >= LARGE_BOX_OTYP && o.otyp <= BAG_OF_TRICKS_OTYP; }

/* C obj.h:340 SchroedingersBox(o) = ((o)->otyp == LARGE_BOX && (o)->spe == 1) */
function SchroedingersBox(o) { return o.otyp === LARGE_BOX_OTYP && o.spe === 1; }

/* C obj.h:339 Is_mbag(o) = ((o)->otyp == BAG_OF_HOLDING || (o)->otyp == BAG_OF_TRICKS) */
function Is_mbag(o) { return o.otyp === BAG_OF_HOLDING_OTYP || o.otyp === BAG_OF_TRICKS_OTYP; }

/* C obj.h:334 Has_contents(o) = ((o)->cobj != (struct obj *) 0) */
function Has_contents(o) { return o.cobj != null; }

function monster_at(x, y) {
    for (let m = game.fmon; m; m = m.nmon)
        if (!m._mapRemoved && (m.mhp | 0) > 0 && m.mx === x && m.my === y)
            return m;
    return null;
}

export function find_misc(mtmp) {
    let obj, t, xx, yy;
    const mdat = mtmp.data;
    const x = mtmp.mx, y = mtmp.my;
    const immobile = (mdat.mmove === 0);
    const stuck = (mtmp === game.u.ustuck);

    game.misc = null;
    game.has_misc = 0;
    if (is_animal(mdat) || mindless(mdat))
        return false;
    if (game.u.uswallow && stuck)
        return false;

    /* We arbitrarily limit to times when a player is nearby for the
     * same reason as Junior Pac-Man doesn't have energizers eaten until
     * you can see them... */
    if (dist2(x, y, mtmp.mux, mtmp.muy) > 36)
        return false;

    if (!stuck && !immobile && !mtmp.mtrapped && (mtmp.cham === NON_PM)
        /* C: mons[(pmidx = monsndx(mdat))].difficulty — monsndx(struct
         * permonst *) is pointer arithmetic (mdat - mons); mdat.pmidx is
         * that same index already carried on the permonst template proxy. */
        && monDifficulty(mdat.pmidx) < 6) {
        const pmidx = mdat.pmidx;
        const ignore_boulders = (verysmall(mdat) || throws_rocks(mdat)
                                 || passes_walls(mdat));
        const diag_ok = !NODIAG(pmidx);

        for (xx = x - 1; xx <= x + 1; xx++)
            for (yy = y - 1; yy <= y + 1; yy++)
                if (isok(xx, yy) && !u_at(xx, yy)
                    && (diag_ok || xx === x || yy === y)
                    && ((xx === x && yy === y) || !monster_at(xx, yy)))
                    if ((t = t_at(xx, yy)) !== null
                        && (ignore_boulders || !sobj_at(BOULDER_OTYP, xx, yy))
                        && !onscary(xx, yy, mtmp)) {
                        /* use trap if it's the correct type and will
                         * polymorph the monster (muse.c:2136-2137);
                         * trap.c:1098 wearing_iron_shoes: which_armor(W_ARMF)
                         * material == IRON (objclass.h IRON = 11) */
                        const armf_ws = which_armor(mtmp, W_ARMF);
                        if (t.ttyp === POLY_TRAP
                            && !(armf_ws && (MKOBJ_OC_MATERIAL[armf_ws.otyp | 0] | 0) === 11)) {
                            game.trapx = xx;
                            game.trapy = yy;
                            game.has_misc = MUSE_POLY_TRAP;
                            return true;
                        }
                    }
    }
    if (nohands(mdat))
        return false;

    /* [bug?]  Choice of item is not prioritized; the last viable one
     * in the monster's inventory will be chosen. */
    for (obj = mtmp.minvent; obj; obj = obj.nobj) {
        /* Monsters shouldn't recognize cursed items; this kludge is
           necessary to prevent serious problems though... */
        if (obj.otyp === POT_GAIN_LEVEL_OTYP
            && (!obj.cursed
                || (!mtmp.isgd && !mtmp.isshk && !mtmp.ispriest))) {
            game.misc = obj;
            game.has_misc = MUSE_POT_GAIN_LEVEL;
        }
        if (game.has_misc === MUSE_BULLWHIP) continue;
        if (obj.otyp === BULLWHIP_OTYP && !mtmp.mpeaceful
            /* the random test prevents whip-wielding monster from
               attempting disarm every turn */
            && game.u.uwep && !rn2(5) && obj === MON_WEP(mtmp)
            /* hero's location must be known and adjacent */
            && u_at(mtmp.mux, mtmp.muy)
            && m_next2u(mtmp)
            /* don't bother if it can't work (this doesn't prevent cursed
               weapons from being targeted) */
            && !game.u.uswallow
            && (canletgo(game.u.uwep, '')
                || (game.u.twoweap && canletgo(game.u.uswapwep, '')))) {
            game.misc = obj;
            game.has_misc = MUSE_BULLWHIP;
        }
        /* Note: peaceful/tame monsters won't make themselves invisible
         * unless you can see them.  Not really right, but... */
        if (game.has_misc === MUSE_WAN_MAKE_INVISIBLE) continue;
        if (obj.otyp === WAN_MAKE_INVISIBLE_OTYP && obj.spe > 0 && !mtmp.minvis
            && !mtmp.invis_blkd && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, AT_GAZE) || mtmp.mcan)) {
            game.misc = obj;
            game.has_misc = MUSE_WAN_MAKE_INVISIBLE;
        }
        if (game.has_misc === MUSE_POT_INVISIBILITY) continue;
        if (obj.otyp === POT_INVISIBILITY_OTYP && !mtmp.minvis
            && !mtmp.invis_blkd && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, AT_GAZE) || mtmp.mcan)) {
            game.misc = obj;
            game.has_misc = MUSE_POT_INVISIBILITY;
        }
        if (game.has_misc === MUSE_WAN_SPEED_MONSTER) continue;
        if (obj.otyp === WAN_SPEED_MONSTER_OTYP && obj.spe > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            game.misc = obj;
            game.has_misc = MUSE_WAN_SPEED_MONSTER;
        }
        if (game.has_misc === MUSE_POT_SPEED) continue;
        if (obj.otyp === POT_SPEED_OTYP && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            game.misc = obj;
            game.has_misc = MUSE_POT_SPEED;
        }
        if (game.has_misc === MUSE_WAN_POLYMORPH) continue;
        if (obj.otyp === WAN_POLYMORPH_OTYP && obj.spe > 0
            && (mtmp.cham === NON_PM) && monDifficulty(mdat.pmidx) < 6) {
            game.misc = obj;
            game.has_misc = MUSE_WAN_POLYMORPH;
        }
        if (game.has_misc === MUSE_POT_POLYMORPH) continue;
        if (obj.otyp === POT_POLYMORPH_OTYP && (mtmp.cham === NON_PM)
            && monDifficulty(mdat.pmidx) < 6) {
            game.misc = obj;
            game.has_misc = MUSE_POT_POLYMORPH;
        }
        if (game.has_misc === MUSE_BAG) continue;
        if (Is_container(obj) && obj.otyp !== BAG_OF_TRICKS_OTYP && !rn2(5)
            && !SchroedingersBox(obj)
            && !game.has_misc && Has_contents(obj)
            && !obj.olocked && !obj.otrapped) {
            game.misc = obj;
            game.has_misc = MUSE_BAG;
        }
    }
    return !!game.has_misc;
}

export async function precheck(mtmp, otmp) {
    if (!otmp)
        return 0;
    const descr = game._objDescriptions ? game._objDescriptions[otmp.otyp | 0] : undefined;
    const occupant_chance = (mndx) => 13 + 2 * ((game.mvitals?.[mndx]?.born | 0));
    const gone = (mndx) => (((game.mvitals?.[mndx]?.mvflags | 0) & G_GONE) !== 0);
    const vis = cansee(mtmp.mx | 0, mtmp.my | 0);
    if ((otmp.oclass | 0) === POTION_CLASS_MM) {
        /* C muse.c:1104-1160 — milky ghost / smoky djinni occupants. */
        const empty = 'The potion turns out to be empty.';
        if (descr === 'milky' && !gone(PM_GHOST_MM)
            && !rn2(occupant_chance(PM_GHOST_MM))) {
            const cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, permonstTemplate(PM_GHOST_MM));
            if (!cc)
                return 0;
            await mquaffmsg(mtmp, otmp);
            await m_useup(mtmp, otmp);
            const mon = await makemon(permonstTemplate(PM_GHOST_MM), cc.x | 0, cc.y | 0, MM_NOMSG);
            if (!mon) {
                if (vis)
                    await pline(empty);
            } else {
                if (vis) {
                    await pline(`As ${mon_nam(mtmp)} opens the bottle, an enormous ${Hallucination_mm() ? rndmonnam() : 'ghost'} emerges!`);
                    await pline(`${Monnam(mtmp)} is frightened to death, and unable to move.`);
                }
                paralyze_monst(mtmp, 3);
            }
            return 2;
        }
        if (descr === 'smoky' && !gone(PM_DJINNI_MM)
            && !rn2(occupant_chance(PM_DJINNI_MM))) {
            const cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, permonstTemplate(PM_DJINNI_MM));
            if (!cc)
                return 0;
            await mquaffmsg(mtmp, otmp);
            await m_useup(mtmp, otmp);
            const mon = await makemon(permonstTemplate(PM_DJINNI_MM), cc.x | 0, cc.y | 0, MM_NOMSG);
            if (!mon) {
                if (vis)
                    await pline(empty);
            } else {
                if (vis)
                    await pline_mon(mon, `In a cloud of smoke, ${a_monnam(mon)} emerges!`);
                await pline(`${vis ? Monnam(mon) : 'Something'} speaks.`);
                if (rn2(2)) {
                    await verbalize('You freed me!');
                    mon.mpeaceful = 1;
                    set_malign(mon);
                } else {
                    await verbalize('It is about time.');
                    if (vis)
                        await pline(`${Monnam(mon)} vanishes.`);
                    await mongone(mon);
                }
            }
            return 2;
        }
    }
    if ((otmp.oclass | 0) === WAND_CLASS_MM && (otmp.cursed | 0)
        && !rn2(WAND_BACKFIRE_CHANCE_MM)) {
        /* C muse.c:130-156 — cursed-wand backfire: the wand explodes for
         * d(spe+2,6), is used up, and may kill the zapper. */
        const dam = d((otmp.spe | 0) + 2, 6);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} zaps ${an(xname(otmp))}, which suddenly explodes!`);
        } else {
            const range = couldsee(mtmp.mx, mtmp.my) ? (BOLT_LIM_MM + 1) : (BOLT_LIM_MM - 3);
            await You_hear(`a zap and an explosion ${mdistu(mtmp) <= range * range ? 'nearby' : 'in the distance'}.`);
        }
        await m_useup(mtmp, otmp);
        mtmp.mhp -= dam;
        if (mtmp.mhp < 1) { /* DEADMONSTER */
            await monkilled_trap(mtmp, ''); /* monkilled(mon, "", AD_RBRE) */
            return 1;
        }
        game.has_defense = 0;
        game.has_offense = 0;
        game.has_misc = 0;
        return 0;
    }
    return 0;
}

const POTION_CLASS_MM = 8, WAND_CLASS_MM = 11, WAND_BACKFIRE_CHANCE_MM = 100;

const PM_GHOST_MM = 287, PM_DJINNI_MM = 315;

/* const.js BOLT_LIM = 8 (C: include/hack.h).  Local const: this file already
 * carries several function-local shadows around the muse block. */
const BOLT_LIM_MM = 8;

/* C ref: nethack-c/src/pline.c:440-456 You_hear(line, ...).
 *   if ((Deaf && !Unaware) || !flags.acoustics) return;
 *   prefix is "You barely hear " when Underwater, "You dream that you hear "
 *   when Unaware, else "You hear ".
 * The caller below has already tested !Deaf, so only the prefix choice is
 * live here.  RNG-free. */
function mquaffmsg_You_hear(line) { return You_hear(line); }

/* C ref: nethack-c/src/objnam.c:1116-1127 singular(otmp, func) — call func
 * with the object's quantity temporarily forced to 1. */
async function mquaffmsg_singular_doname(otmp) {
    return await singular(otmp, doname);
}

async function mquaffmsg(mtmp, otmp) {
    if (!mtmp || !otmp)
        return;
    if (canseemon(mtmp)) {
        /* C muse.c:295-297 */
        observe_object(otmp);
        await pline_mon(mtmp, `${Monnam(mtmp)} drinks ${await mquaffmsg_singular_doname(otmp)}!`);
    } else if (!mquaffmsg_Deaf()) {
        /* C muse.c:298-301 — Soundeffect() is audio only. */
        await mquaffmsg_You_hear('a chugging sound.');
    }
}

/* C ref: youprop.h:169 Hallucination = (HHallucination && !Halluc_resistance),
 * HHallucination = u.uprops[HALLUC].intrinsic (there is no EHallucination in
 * 5.0).  Same formula js/dog.js:87 and js/fastforward.js:1087 already carry
 * locally — this file has no shared Hallucination() to import. */
function Hallucination_mm() {
    const up = game.u?.uprops;
    const h = up?.[HALLUC_MM], r = up?.[HALLUC_RES_MM];
    const res = ((r?.intrinsic | 0) !== 0) || ((r?.extrinsic | 0) !== 0);
    return ((h?.intrinsic | 0) !== 0) && !res;
}

/* C ref: objnam.c:1116-1127 singular(otmp, func) — call func with the
 * object's quantity temporarily forced to 1.  Generalises
 * mquaffmsg_singular_doname above to an arbitrary namer, which mreadmsg below
 * needs (doname on the vismon arm, ansimpleoname on the !vismon arm). */
async function mreadmsg_singular(otmp, namer) {
    const savequan = otmp.quan;
    otmp.quan = 1;
    const nam = await namer(otmp);
    otmp.quan = savequan;
    return nam;
}

export async function mreadmsg(mtmp, otmp) {
    /* C pline.c:247-281: only an unsuppressed pline clears last_msg.
     * Keep that decision in pline for the teleport scroll's trycall guard. */
    const vismon = canseemon(mtmp);
    let tpindicator = !vismon && sensemon(mtmp);
    if (!vismon && mquaffmsg_Deaf())
        return; /* no feedback */
    observe_object(otmp);
    const onambuf = await mreadmsg_singular(otmp, vismon ? doname : ansimpleoname);
    if (vismon) {
        /* C muse.c:250-251 */
        await pline_mon(mtmp, `${Monnam(mtmp)} reads ${onambuf}!`);
    } else { /* !Deaf, otherwise we would already have returned above */
        const youdata = game.youmonst ? game.youmonst.data : null;
        const similar = same_race(youdata, mtmp.data);
        const uniqmon = (((mtmp.data?.geno | 0) & G_UNIQ) !== 0) || !!mtmp.isshk;
        let meverseen = false;
        try { meverseen = !!mtmp.meverseen; } catch { }
        const recognize = !Hallucination_mm()
            && (meverseen || (similar && !uniqmon));
        const mflags = SUPPRESS_INVISIBLE_MM | SUPPRESS_SADDLE_MM
            | (recognize ? SUPPRESS_IT_MM : AUGMENT_IT_MM);
        if (sensemon(mtmp)) {
            tpindicator = true;
        } else if (couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 10 * 10) {
            /* monster can't be seen or sensed; remember it if within LOS
               and relatively close */
            map_invisible(mtmp.mx, mtmp.my);
        }
        /* C muse.c:278-280 Snprintf + strsubst("reading a scroll labeled",
         * mconf ? "attempting to incant" : "incant") — a single first-match
         * substring replace, C strsubst's exact behaviour. */
        let blindbuf = `reading ${onambuf}`;
        const needle = 'reading a scroll labeled';
        const idx = blindbuf.indexOf(needle);
        if (idx !== -1) {
            const repl = mtmp.mconf ? 'attempting to incant' : 'incant';
            blindbuf = blindbuf.slice(0, idx) + repl + blindbuf.slice(idx + needle.length);
        }
        await mquaffmsg_You_hear(
            `${x_monnam(mtmp, ARTICLE_A_MM, null, mflags, false)} ${blindbuf}.`);
        /* last_msg is cleared only by an actual pline: You_hear() returns
         * silently under !flags.acoustics/Deaf (pline.c:441), leaving
         * muse.c:887's PLNMSG_enum marker intact so :911 skips trycall(). */
        if (tpindicator)
            flash_mon(mtmp); /* C muse.c:284-285; consumes display RNG. */
    }
    if (mtmp.mconf) {
        /* C muse.c:286-288 */
        await pline(`Being confused, ${vismon ? mon_nam(mtmp) : mhe(mtmp)} mispronounces the magic words...`);
    }
}

const ARTICLE_A_MM = 2, SUPPRESS_IT_MM = 0x01, SUPPRESS_INVISIBLE_MM = 0x02,
      SUPPRESS_SADDLE_MM = 0x08, AUGMENT_IT_MM = 0x40; /* const.js */

function muse_newcham_mon(mtmp) {
    const m_armr = which_armor(mtmp, W_ARM);
    if (m_armr) {
        const otyp = m_armr.otyp | 0;
        if (otyp >= _GRAY_DRAGON_SCALES && otyp <= _YELLOW_DRAGON_SCALES)
            return PM_GRAY_DRAGON + (otyp - _GRAY_DRAGON_SCALES);
        if (otyp >= _GRAY_DRAGON_SCALE_MAIL && otyp <= _YELLOW_DRAGON_SCALE_MAIL)
            return PM_GRAY_DRAGON + (otyp - _GRAY_DRAGON_SCALE_MAIL);
    }
    return rndmonst();
}

/* obj.h Is_dragon_scales/Is_dragon_mail otyp bands; GRAY_DRAGON_SCALE_MAIL(101)/
 * YELLOW_DRAGON_SCALE_MAIL(110) already anchored above (:2863-2864) for a
 * different reader — these two are new. */
const _GRAY_DRAGON_SCALES = 111; /* objects.h; 110 is the last DSM (yellow) */

const _YELLOW_DRAGON_SCALES = 120;

/* C ref: muse.c:2630-2650 you_aggravate(mtmp) — MUSE_POT_INVISIBILITY's
 * cursed-drink arm (use_misc below): the monster's presence becomes known.
 *     pline("For some reason, %s presence is known to you.", ...);
 *     cls();
 *     show_glyph(mtmp->mx, mtmp->my, mon_to_glyph(mtmp, rn2_on_display_rng));
 *     display_self();
 *     You_feel("aggravated at %s.", noit_mon_nam(mtmp));
 *     display_nhwindow(WIN_MAP, TRUE);
 *     docrt();
 *     if (unconscious()) { gm.multi = -1; gn.nomovemsg = "..."; }
 *     newsym(mtmp->mx, mtmp->my);
 *     if (!canspotmon(mtmp)) map_invisible(mtmp->mx, mtmp->my);
 *
 * mon_to_glyph(mon, rng) (display.h:554) is
 * `what_mon(monsndx(mon->data), rng) + (female==0 ? GLYPH_MON_MALE_OFF
 *                                                  : GLYPH_MON_FEM_OFF)`,
 * and what_mon(mon, rng) (display.h:197) is `Hallucination ? rng(NUMMONS)
 * : mon`.  js/display.js keeps GLYPH_MON_MALE_OFF/GLYPH_MON_FEM_OFF (38/37)
 * as PRIVATE module constants (not exported), so the two offsets are
 * reproduced inline here rather than imported; this file already carries its
 * own NUMMONS/monsndx/Hallucination for the same class of muse.c helper.
 * rn2_on_display_rng is the separate DISPLAY isaac64 stream (js/rng.js:239),
 * never the scored one, so this draw cannot perturb rngCalls.
 *
 * cls()/docrt() are `async` in js/display.js; called here without `await`,
 * the same fire-and-forget pattern already used from synchronous callers
 * elsewhere in this port (js/cmd.js:24751/45158, js/display.js:2859's own
 * bare `cls()`), since this function's callers (use_misc below) are
 * themselves synchronous.
 *
 * KNOWN GAP: `display_nhwindow(WIN_MAP, TRUE)` is display-channel only (it
 * "consumes the dismiss keystroke, draws no RNG" — js/cmd.js:22154) and, per
 * win/tty/wintty.c:1884-1889, a blocking NHW_MAP display reduces to "page the
 * pending topline now via more()" when one is outstanding.  No exported hook
 * to force an immediate page exists outside this file's scope, so this port
 * leaves the pending "You feel aggravated..." message to the normal per-turn
 * flush path instead of forcing it early here.  RNG-free either way. */
async function you_aggravate(mtmp) {
    const _agg1 = `For some reason, ${s_suffix(noit_mon_nam(mtmp))} presence is known to you.`;
    /* C topl.c update_topl:268-ish — a pending topline that cannot join the new
     * message (n0 + strlen(toplines) + 3 >= CO - 8) is paged with --More-- first. */
    const _prev = String(game._pending_message || '');
    const _overflow = _prev && (_agg1.length + _prev.length + 3 >= 72);
    if (_overflow) {
        /* vpline's flush_screen()/bot() (pline.c:273-277) runs BEFORE update_topl's
         * more(): the overflowing last page shows the live map/status, earlier
         * pages keep their own pline-time frames (retainFinalFrame=false). */
        await force_more_pages(_prev, false);
    }
    await pline(_agg1);
    /* display.c:2196 cls() -> display_nhwindow(WIN_MESSAGE, FALSE) pages the pending topline.
     * vpline's flush_screen()/bot() (pline.c:273-277) ran at THIS pline, so the page
     * shows the live status, not the movemon first-overflow snapshot still installed
     * from an earlier page of the same turn (HP 115 vs C 78). */
    const _agg_sv = game._paintedSnapshot;
    game._paintedSnapshot = null;
    /* muse.c:2635 cls() acknowledges _agg1; it must not pline it again
     * when WIN_STOP already suppressed the original update_topl(). */
    const _agg1Morc = await force_more(String(game._pending_message || _agg1), undefined, false, false, null, true);
    /* C's cls() is a separate blocking display_nhwindow after _agg1's
     * pline has completed. If its page is dismissed with ESC, WIN_STOP is
     * already live when the later You_feel(_agg2) arrives, so that message is
     * buffered but not painted. force_more's generic armed bit models a page
     * raised inside the same update_topl call and deliberately lets that
     * message paint; promote only this explicit post-pline cls page here. */
    if (_agg1Morc === 27) {
        game._topl_win_stop = true;
        game._topl_win_stop_armed = false;
    }
    if (game._paintedSnapshot == null) game._paintedSnapshot = _agg_sv;
    await cls();
    const mndx = Hallucination() ? rn2_on_display_rng(NUMMONS) : monsndx(mtmp);
    show_monster_glyph_at(mtmp.mx | 0, mtmp.my | 0, mndx);
    display_self();
    const aggravation = `aggravated at ${noit_mon_nam(mtmp)}.`;
    const _agg2 = `${Unaware() ? 'You dream that you feel ' : 'You feel '}${aggravation}`;
    await You_feel(aggravation); /* C muse.c:2640, including Unaware wording. */
    /* wintty.c:1884-1889 display_nhwindow(WIN_MAP, TRUE) pages the pending topline */
    /* display_nhwindow(WIN_MAP, TRUE) is a separate blocking page after _agg2's
     * pline completed: an ESC there leaves WIN_STOP live (topl.c:234) until the
     * next tty_nhgetch (wintty.c:4066), so later plines this turn are swallowed. */
    /* muse.c:2642 acknowledges _agg2 without another update_topl(), too. */
    if (await force_more(String(game._pending_message || _agg2), undefined, false, false, null, true) === 27) {
        game._topl_win_stop = true;
        game._topl_win_stop_armed = false;
    }
    await docrt();
    if (unconscious()) {
        game.multi = -1;
        game.nomovemsg = "Aggravated, you are jolted into full consciousness.";
    }
    newsym(mtmp.mx, mtmp.my);
    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);
}

/* C hack.h:1531-1532 distu(xx,yy)=dist2(xx,yy,u.ux,u.uy), mdistu(mon) =
 * distu(mon->mx, mon->my).  Inlined here (mdistu has no exported js/
 * definition anywhere — every other copy is a file-local helper) using the
 * dist2() already defined below in this file. */
function mdistu(mon) { return dist2(mon.mx, mon.my, game.u.ux, game.u.uy); }

async function mloot_container(mon, container, vismon) {
    let contnr_nam = '', mpronounbuf = '';
    let takeout_count, res = 0;

    if (!container || !Has_contents(container) || container.olocked)
        return res; /* 0 */
    /* FIXME (C's own comment): handle cursed bag of holding */
    if (Is_mbag(container) && container.cursed)
        return res; /* 0 */
    if (SchroedingersBox(container))
        return res;

    switch (rn2(10)) {
    default: /* case 0, 1, 2, 3: */
        takeout_count = 1;
        break;
    case 4: case 5: case 6:
        takeout_count = 2;
        break;
    case 7: case 8:
        takeout_count = 3;
        break;
    case 9:
        takeout_count = 4;
        break;
    }
    const howfar = mdistu(mon);
    const nearby = howfar <= 7 * 7;
    if (vismon) {
        /* do this once so that when hallucinating it won't change from one
           item to the next */
        mpronounbuf = mhe(mon);
    }

    for (let takeout_indx = 0; takeout_indx < takeout_count; ++takeout_indx) {
        if (!Has_contents(container)) /* might have removed all items */
            break;
        let nitems = 0;
        for (let o = container.cobj; o; o = o.nobj)
            ++nitems;
        /* nitems is always greater than 0 due to Has_contents() check;
           throttle item removal as the container becomes less filled */
        if (!rn2(nitems + 1))
            break;
        nitems = rn2(nitems);
        let xobj = container.cobj;
        for (; xobj; xobj = xobj.nobj)
            if (--nitems < 0)
                break;

        container.cknown = 0; /* hero no longer knows container's contents
                                * even if [attempted] removal is observed */
        if (!contnr_nam) {
            contnr_nam = an(nearby ? xname(container)
                                    : (await distant_name(container, xname)));
        }
        /* C muse.c:2340 — obj_extract_self(xobj); "this reduces container's
         * weight".  The real port (js/mklev.js obj_extract_self, forwarded by
         * the js/dokick.js import above; C mkobj.c:2557-2592) has the
         * OBJ_CONTAINED arm: extract_nobj(obj, &container->cobj) (mkobj.c:2596-
         * 2615 — unlinks AND sets obj->where = OBJ_FREE, obj->nobj = 0) plus
         * container_weight() and clearing the stale ocontainer back-link.
         * The old inline copy claimed the import "handles only the
         * OBJ_MIGRATING case"; that stopped being true when the OBJ_CONTAINED
         * arm landed, so call it, as C does. */
        obj_extract_self(xobj);
        if (can_carry(mon, xobj)) {
            if (vismon) {
                if (howfar > 2) /* not adjacent */
                    await Norep(`${Monnam(mon)} rummages through ${contnr_nam}.`);
                else if (takeout_indx === 0) /* adjacent, first item */
                    await pline_mon(mon, `${Monnam(mon)} removes ${(await doname(xobj))} from ${contnr_nam}.`);
                else /* adjacent, additional items */
                    await pline(`${upstart(mpronounbuf)} removes ${(await doname(xobj))}.`);
            }
            if ((container.otyp | 0) === ICE_BOX_OTYP)
                removed_from_icebox(xobj); /* resume rotting for corpse */
            await mpickobj(mon, xobj);
            res = 2;
        } else { /* couldn't carry xobj separately so put back inside */
            /* an achievement prize (castle's wand?) might already be marked
               nomerge (when it hasn't been in invent yet) */
            const already_nomerge = (xobj.nomerge | 0) !== 0;
            const just_xobj = !Has_contents(container);

            xobj.nomerge = 1;
            xobj = (await add_to_container(container, xobj));
            if (!already_nomerge)
                xobj.nomerge = 0;
            container.owt = weight(container);
            if (just_xobj)
                break; /* out of takeout_count loop */
        } /* can_carry */
    } /* takeout_count */
    return res;
}

/* C ref: rm.h:526-534 `#define remove_monster(x, y) svl.level.monsters[x][y]
 * = (struct monst *) 0` — clear the monster-presence GRID cell at <x,y>.
 * (EXTRA_SANITY_CHECKS' impossible()-guarded variant does not apply: this is
 * a Release build — NH_DEVEL_STATUS == NH_STATUS_RELEASED, patchlevel.h:33 —
 * so config.h:634-637 compiles the plain one-statement macro, not the
 * sanity-checked one.)
 *
 * This port keeps no `level.monsters[][]` grid at all — confirmed against
 * js/sp_lev.js:5866 and js/worm.js:70 ("game.level.monsters has no real
 * backing") — so there is no field this call could clear.  js/uhitm.js's
 * m_at(x,y), the one JS reader that stands in for C's grid read, walks the
 * fmon chain comparing `m.mx === x && m.my === y` instead: a monster's
 * position IS its grid membership here.  For every call site in this file
 * (use_defensive / use_misc / muse_unslime below), remove_monster(mtmp.mx,
 * mtmp.my) is immediately followed by place_monster(mtmp, newx, newy), which
 * sets mtmp.mx/mtmp.my to the new square — so m_at() already stops finding
 * mtmp at the old square the moment place_monster runs, with no separate
 * clear needed.  Mutating mtmp.mx/mtmp.my HERE (the way js/teleport.js's
 * differently-scoped, differently-named remove_monster_local(x,y) does for
 * ITS OWN call site) would be WRONG in this file specifically: every call
 * site here re-reads mtmp.mx/mtmp.my in the very next statement
 * (`newsym(mtmp.mx, mtmp.my)` — C's `newsym(oldx, oldy)` using the position
 * BEFORE the move, which C's own remove_monster macro also leaves untouched)
 * and zeroing them first would make that newsym repaint square <0,0> instead
 * of the vacated square.  So the C-faithful body, given this port's fmon-walk
 * grid model and this file's call shape, is the same true no-op js/dogmove.js
 * (:4411) and js/vault.js (:741) already carry for the identical macro.
 *
 * RE-CHECKED after worm_move (below) became real (imported from js/worm.js):
 * that does NOT reopen this no-op. js/worm.js's own grid substitute for a
 * worm's tail, `_seg_occ` (worm.js:57), is keyed ONLY by squares that have
 * already been vacated by the head and folded into the tail by a PRIOR
 * worm_move call — worm_move writes `place_worm_seg(worm, seg.wx, seg.wy)`
 * for `seg = wheads[wnum]`, the head-mirror segment left over from the
 * *previous* call, and only re-points wheads[wnum] at the (unwritten) new
 * head position without touching _seg_occ for it (worm.js:275-284). So the
 * worm's CURRENT head square — the one `remove_monster(mtmp.mx, mtmp.my)`
 * is called on here, before place_monster moves it — is never simultaneously
 * a `_seg_occ` entry: it is tracked by the fmon walk (mtmp is on fmon) until
 * the NEXT worm_move call turns it into a tail segment. So there is still no
 * write remove_monster could make into `_seg_occ` for its own call sites'
 * squares, with or without worm_move wired: verified against
 * nethack-c-v5/upstream/src/worm.c (place_worm_seg / rm.h:533's
 * `level.monsters[x][y] = m` is likewise never applied to the C head's own
 * square by worm_move — only to the segment it is retiring). RNG-free
 * either way. */
function remove_monster(x, y) {
    /* C clears the map-grid cell before the caller's old-square newsym().
     * Keep mx/my intact until place_monster() assigns the destination. */
    const mtmp = m_at(x, y);
    if (mtmp)
        mtmp._mapRemoved = true;
}

/* C ref: worm.c:189-277 worm_move(worm) — grows or shrinks a long worm's tail
 * by one segment; called only when `mtmp.wormno` is set (use_defensive /
 * use_misc / muse_unslime below all guard the call with `if (mtmp.wormno)`).
 * The real body now lives in js/worm.js (imported at the top of this file),
 * ported there rather than here because every C statement in it reads or
 * writes wheads[]/wtails[]/wgrowtime[] or calls shrink_worm()/newseg(),
 * which are module-private to js/worm.js and were not previously exported.
 * This was a true no-op stub before that export landed; the empty local
 * definition below is gone, not left as a fallback — the imported binding is
 * the only `worm_move` this file has. */
/* C obj.h:421 is_plural(o) — quan != 1L, or the Eyes of the Overworld when
 * that artifact has been discovered.  The artifact half needs
 * undiscovered_artifact(), which is not ported (js/cmd.js:7183 is a throw), so
 * this carries the same documented partial as js/cmd.js:1551 is_plural_obj and
 * js/uhitm.js:1782 _ac_is_plural.  The `return false` this replaces was wrong
 * for the quan half as well, so a stack of wielded daggers read "It is welded"
 * where C says "They are welded". */
function is_plural(obj) { return (obj?.quan | 0) !== 1; }

/* mon_adjust_speed — THE ONE BODY lives at js/trap.js (C ref: worn.c:479-556).
 * The empty no-op that used to sit here silently dropped the MUSE_WAN_SPEED_MONSTER
 * and MUSE_POT_SPEED effects in use_misc below; imported at the top of this file. */
/* newcham — THE ONE BODY lives at js/mklev.js:16244 (C ref: mon.c:5277), already
 * exported and already wired for THAT file's own chameleon/vampshift callers
 * (mklev.js:5530/9857/14491/16509, decide_to_shapeshift).  This was a true
 * no-op stub (`return 0`) here, so every MUSE_POLY_TRAP / MUSE_WAN_POLYMORPH /
 * MUSE_POT_POLYMORPH record left its rn2(10) form-selection roll,
 * mgender_from_permonst's rn2(10) and newmonhp's d(N,8) unconsumed
 * (rng_result_tape_residual, use_misc board rec#31/#32) — imported at the top
 * of this file rather than reproduced.  mklev.js's newcham() carried an early
 * `if (mtmp.cham === NON_PM) return 0;` that was CORRECT for every existing
 * caller (all arrive with cham already set to a real shapechanger index) but
 * WRONG for muse.c's callers here (an ordinary monster, cham === NON_PM,
 * polymorphing at random) — it silently no-op'd the whole cast.  Fixed in
 * mklev.js itself (the C mon.c:5292-5306 Rider/birth-limit fall-through),
 * which is provably a no-op for every pre-existing caller: none of them ever
 * entered that branch, so its contents were previously dead code. */
/* C trap.h:98-101 — enum trap_effect { Trap_Effect_Finished = 0,
 * Trap_Caught_Mon = 1, Trap_Killed_Mon = 2 }.  js/trap.js:163 spells the same
 * constant module-privately; this is the value, not a body, so there is no
 * duplicate-body question. */
const TRAP_KILLED_MON_MM = 2;

const fakename = ["someone", "something"];

const HEAVY_IRON_BALL = 477;

const SILVER = 14; /* objclass.h obj_material_types SILVER (1 is LIQUID) */

/* C you.h:323, role.c genders[]: PRONOUN_HALLU also draws rn2(4). */
function mhim(mtmp) {
    return ["him", "her", "it", "them"][pronoun_gender_mm(mtmp, 2)];
}

/* C ref: muse.c:2872 mcureblindness(mon, verbos) — "cure mon's blindness
 * (use_defensive, dog_eat, meatobj)".  RNG-free. */
export function mcureblindness(mon, verbos) {
    if (!mon.mcansee) {
        mon.mcansee = 1;
        mon.mblinded = 0;
        if (verbos && haseyes(mon.data))
            return pline_mon(mon, `${Monnam(mon)} can see again.`);
    }
}

/* C ref: muse.c:756-770 reveal_trap(t, seeit) — "when a monster deliberately
 * enters a trap, make sure the spot becomes accessible".  RNG-free. */
function reveal_trap(t, seeit) {
    const lev = game.level.locations[t.tx][t.ty];
    if (lev.typ === SCORR) {
        lev.typ = CORR;
        lev.flags = 0;
        unblock_point(t.tx, t.ty);
    }
    if (seeit)
        seetrap(t);
}

/* C ref: muse.c:383-418 m_tele(mtmp, vismon, oseen, how).  The rn2(3) at
 * muse.c:398 is the ONLY draw, and only for an amulet carrier or the Wizard's
 * tower level. */
async function m_tele(mtmp, vismon, oseen, how) {
    if (tele_restrict(mtmp)) {          /* mysterious force... */
        if (vismon && how)              /* mentions 'teleport' */
            makeknown(how);
        /* monster learns that teleportation isn't useful here */
        if (noteleport_level(mtmp))
            mon_learns_traps(mtmp, TELEP_TRAP);
    } else if ((mon_has_amulet(mtmp) || On_W_tower_level(game.u.uz)) && !rn2(3)) {
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} seems disoriented for a moment.`);
    } else {
        /* teleport monster 'mtmp' */
        if (how) {
            /* teleportation has been triggered by an object */
            if (oseen)
                makeknown(how);
            await rloc(mtmp, RLOC_MSG);
        } else {
            /* monster is voluntarily entering a teleportation trap; use the
               trap instead of rloc() in case it sends 'victim' to a vault */
            mtmp.mx = game.trapx;
            mtmp.my = game.trapy;
            await mintrap(mtmp, FORCETRAP);
        }
    }
}

/* C ref: muse.c:779-789 mon_escape(mtmp, vismon) — a monster without the
 * Amulet that leaves up the upstairs is gone for good. */
async function mon_escape(mtmp, vismon) {
    if (mon_has_special(mtmp)
        || (mtmp.iswiz && (game.context?.no_of_wizards | 0) < 2))
        return 0;
    if (vismon)
        await pline_mon(mtmp, `${Monnam(mtmp)} escapes the dungeon!`);
    await mongone(mtmp);
    return 2;
}

export async function use_defensive(mtmp) {
    let i, fleetim;
    let otmp = game.defensive;
    let vis, vismon, oseen;
    let t, stway;

    if ((i = await precheck(mtmp, otmp)) !== 0)
        return i;
    vis = cansee(mtmp.mx, mtmp.my);
    vismon = canseemon(mtmp);
    oseen = otmp && vismon;

    /* when using defensive choice to run away, we want monster to avoid
       rushing right straight back; don't override if already scared */
    fleetim = !mtmp.mflee ? (33 - Math.trunc(30 * mtmp.mhp / mtmp.mhpmax)) : 0;
    /* C muse.c:813-816 #define await m_flee(m) */
    const m_flee = async (m) => {
        if (fleetim && !m.iswiz)
            await monflee(m, fleetim, false, false);
    };

    switch (game.has_defense) {
    case MUSE_UNICORN_HORN:
        /* unlike most defensive cases, unicorn horn object is optional */
        if (vismon) {
            if (otmp)
                await pline_mon(mtmp, `${Monnam(mtmp)} uses a unicorn horn!`);
            else
                await pline_The(`tip of ${mon_nam(mtmp)}'s horn glows!`);
        }
        if (!mtmp.mcansee) {
            await mcureblindness(mtmp, vismon);
        } else if (mtmp.mconf || mtmp.mstun) {
            mtmp.mconf = mtmp.mstun = 0;
            if (vismon)
                await pline_mon(mtmp, `${Monnam(mtmp)} seems steadier now.`);
        } else {
            await impossible_steed("No need for unicorn horn?");
        }
        return 2;
    case MUSE_BUGLE:
        /* C muse.c:838-848.  awaken_soldiers lives in js/music.js, which
         * imports this module, so it is loaded at call time. */
        if (!otmp)
            throw new Error("use_defensive: no bugle");
        if (vismon) {
            await pline_mon(mtmp, `${Monnam(mtmp)} plays ${await doname(otmp)}!`);
        } else if (!mquaffmsg_Deaf()) {
            await mquaffmsg_You_hear('a bugle playing reveille!');
        }
        {
            const { awaken_soldiers } = await import('./music.js');
            await awaken_soldiers(mtmp);
        }
        return 2;
    case MUSE_WAN_TELEPORTATION_SELF:
        if (!otmp)
            throw new Error("use_defensive: no wand of teleportation");
        if ((mtmp.isshk && inhishop(mtmp)) || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, true);
        await m_tele(mtmp, vismon, oseen, WAN_TELEPORTATION_OTYP);
        return 2;
    case MUSE_WAN_TELEPORTATION:
        /* C muse.c:858-869: zap at a target rather than teleporting self. */
        if (!otmp)
            throw new Error("use_defensive: no wand of teleportation");
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        await mbhit_wand(mtmp, rn1(8, 6), otmp);
        if (noteleport_level(mtmp))
            mon_learns_traps(mtmp, TELEP_TRAP);
        game.m_using = false;
        return 2;
    case MUSE_WAN_UNDEAD_TURNING:
        /* C muse.c:972-981: use the same beam callbacks as teleportation. */
        if (!otmp)
            throw new Error("use_defensive: no wand of undead turning");
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        await mbhit_wand(mtmp, rn1(8, 6), otmp);
        game.m_using = false;
        return 2;
    case MUSE_SCR_TELEPORTATION: {
        /* C muse.c:870-914.  mreadmsg/obfree are ported above/imported.
         * random_teleport_level()/get_level() are js/cmd.js's real bodies,
         * imported above (get_level_core) — the cursed-or-confused branch
         * below was a documented KNOWN GAP claiming this arm was unreached;
         * FALSIFIED by board use_defensive rec#0/#11
         * (m_defensive_cursed=1, rng_consumed length 2/1 matching
         * random_teleport_level's own rn2(5)+rn2(range) draws exactly). */
        if (!otmp)
            throw new Error("use_defensive: no scroll of teleportation");
        const obj_is_cursed = otmp.cursed;
        if (mtmp.isshk || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        /* C muse.c:882-884: take otmp out of mtmp's inventory in advance so
           it survives even if mtmp lands somewhere destructive. */
        if ((otmp.quan | 0) > 1)
            otmp = (await splitobj(otmp, 1));
        await extract_from_minvent(mtmp, otmp, false, false);
        /* 'last_msg' will be changed to PLNMSG_UNKNOWN if any messages are
           issued by mreadmsg(), 'if (vismon) pline()', or m_tele(). */
        (game.iflags ||= {}).last_msg = PLNMSG_enum_MM;
        await mreadmsg(mtmp, otmp); /* sets otmp.dknown if !Blind or !Deaf */
        if (obj_is_cursed || mtmp.mconf) {
            /* C muse.c:889-905. */
            const nlev = random_teleport_level();
            if (mon_has_amulet(mtmp) || In_endgame(game.u.uz)) {
                if (vismon)
                    await pline_mon(mtmp, `${Monnam(mtmp)} seems very disoriented for a moment.`);
            } else if (nlev === depth_of_level(game.u.uz)) {
                if (vismon)
                    await pline_mon(mtmp, `${Monnam(mtmp)} shudders for a moment.`);
            } else {
                const flev = {};
                get_level(flev, nlev);
                await migrate_to_level(mtmp, ledger_no(flev), MIGR_RANDOM, null);
            }
        } else {
            await m_tele(mtmp, vismon, oseen, SCR_TELEPORTATION_OTYP);
        }
        /* m_tele() handles makeknown(); trycall() is a no-op once otmp.otyp
         * is already discovered or informally named. */
        if (otmp.dknown && (game.iflags?.last_msg) !== PLNMSG_enum_MM) {
            /* C do_name.c:678 trycall(obj) — "if (!oc_name_known &&
             * !oc_uname) docall(obj);".  game._oc_name_known is seeded from
             * this record's obj_discovery side-channel (the same table
             * js/read.js:1889-1892's real trycall() reads); board record #3
             * has otyp 333 ABSENT from obj_discovery, so C's real call DOES
             * enter docall() here. */
            const nameKnown = !!(game._oc_name_known && game._oc_name_known[otmp.otyp | 0]);
            const hasUname = !!(game._oc_uname && game._oc_uname[otmp.otyp | 0]);
            if (!nameKnown && !hasUname) {
                await docall(otmp);
            }
        }
        /* already removed from mtmp.minvent so not m_useup(mtmp, otmp) */
        await obfree(otmp, null);
        /* Bump bridge objs_deleted.count to match C's dealloc_obj counter —
         * the same adjustment js/read.js:1971 and js/potion.js:1784 already
         * apply for their own obfree/delobj call sites (objs_deleted.count is
         * a mapstate bridge slot per js/hold_another_object.js:361, not
         * derived from game.objs_deleted's chain length). */
        {
            const store = game.__bridge__ || (game.__bridge__ = {});
            const key = 'objs_deleted.count';
            const cur = store[key] !== undefined ? Number(store[key]) : 0;
            store[key] = String(cur + 1);
        }
        return 2;
    }
    case MUSE_WAN_DIGGING: {
        /* C muse.c:917-971.  Was a `return 0` KNOWN GAP because maketrap() is
         * async and this function was sync; use_defensive is async now
         * (KEYSTONE B, boundary A).  maketrap() comes from js/trap.js — the
         * copy js/cmd.js already drives; js/mklev.js's second copy is the
         * level-generation one. */
        if (!otmp)
            throw new Error("use_defensive: no wand of digging");
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, false);
        if (oseen)
            makeknown(WAN_DIGGING);
        const dg_typ = game.level?.locations?.[mtmp.mx | 0]?.[mtmp.my | 0]?.typ | 0;
        /* C muse.c:923-931 */
        if (IS_FURNITURE(dg_typ)
            || IS_DRAWBRIDGE(dg_typ)
            || (is_drawbridge_wall(mtmp.mx | 0, mtmp.my | 0) >= 0)
            || stairway_at(mtmp.mx | 0, mtmp.my | 0)) {
            await pline_The("digging ray is ineffective.");
            return 2;
        }
        /* C muse.c:932-951 — the no-dig-down arm: try a PIT instead.
         *     if (!Can_dig_down(&u.uz) && !levl[mx][my].candig) { ... } */
        const dg_lev = game.level?.locations?.[mtmp.mx | 0]?.[mtmp.my | 0];
        if (!Can_dig_down(game.u.uz) && !(dg_lev && dg_lev.candig)) {
            /* "can't dig further if there's already a pit (or other trap)
               here, or if pit creation fails for some reason" */
            if (t_at(mtmp.mx | 0, mtmp.my | 0)
                || !(t = await maketrap(mtmp.mx | 0, mtmp.my | 0, PIT))) {
                if (vismon)
                    await pline_The(`${surface(mtmp.mx | 0, mtmp.my | 0)} here is too hard to dig in.`);
                return 2;
            }
            /* pit creation succeeded */
            if (vis) {
                seetrap(t);
                await pline_mon(mtmp, `${Monnam(mtmp)} has made a pit in the ${surface(mtmp.mx | 0, mtmp.my | 0)}.`);
            }
            await fill_pit(mtmp.mx | 0, mtmp.my | 0);
            recalc_block_point(mtmp.mx | 0, mtmp.my | 0);
            /* C muse.c:950 — mintrap(mtmp, FORCEBUNGLE) == Trap_Killed_Mon.
             * trap.h:98-101 enum: Trap_Effect_Finished 0, Trap_Caught_Mon 1,
             * Trap_Killed_Mon 2 (js/trap.js:163 spells the same constant). */
            return (await mintrap(mtmp, FORCEBUNGLE) === TRAP_KILLED_MON_MM) ? 1 : 2;
        }
        /* C muse.c:952-971 — the dig-through arm.  maketrap(HOLE) runs
         * hole_destination(), whose `while (dlevel < bottom) { dlevel++;
         * if (rn2(4)) break; }` loop is where this arm's recorded draws come
         * from (board records #13 and #21). */
        t = await maketrap(mtmp.mx | 0, mtmp.my | 0, HOLE);
        if (!t)
            return 2;
        recalc_block_point(mtmp.mx | 0, mtmp.my | 0);
        seetrap(t);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} has made a hole in the ${surface(mtmp.mx | 0, mtmp.my | 0)}.`);
            await pline_mon(mtmp, `${Monnam(mtmp)} ${isFlyerMndx((mtmp.data?.pmidx ?? mtmp.data?.mnum) | 0) ? "dives" : "falls"} through...`);
        } else if (!mquaffmsg_Deaf()) {
            /* C muse.c:966-968 — Soundeffect() is a no-op in this tty port. */
            await You_hear(`something crash through the ${surface(mtmp.mx | 0, mtmp.my | 0)}.`);
        }
        await fill_pit(mtmp.mx | 0, mtmp.my | 0);
        /* "we made sure that there is a level for mtmp to go to" */
        await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    }
    case MUSE_WAN_CREATE_MONSTER: {
        /* C muse.c:978-995.  Was a `return 0` KNOWN GAP because makemon() is
         * async and this function was sync; use_defensive is async now
         * (KEYSTONE B, boundary A) and every await below sits exactly where C
         * evaluates the same expression, so the draw order is C's. */
        if (!otmp)
            throw new Error("use_defensive: no wand of create monster");
        /* C muse.c:982-984 — "pm: 0 => random, eel => aquatic, croc =>
         *     amphibious"
         *     struct permonst *pm = !is_pool(mtmp->mx, mtmp->my) ? 0
         *         : &mons[u.uinwater ? PM_GIANT_EEL : PM_CROCODILE];
         * NOTE C's own comment is about `pm`, but `pm` is ONLY used as
         * enexto()'s bias here — the makemon() below passes a literal 0. */
        const cm_pm = !is_pool(mtmp.mx | 0, mtmp.my | 0) ? null
            : permonstTemplate((game.u?.uinwater ? PM_GIANT_EEL : PM_CROCODILE));
        /* C muse.c:988 — `if (!enexto(&cc, mtmp->mx, mtmp->my, pm)) return 0;`
         * enexto CONSUMES RNG (collect_coords ring shuffles), and it runs
         * BEFORE mzapwand, so a failure still costs the draws. */
        const cm_cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, cm_pm);
        if (!cm_cc)
            return 0;
        await mzapwand(mtmp, otmp, false);
        /* C muse.c:991 — makemon((struct permonst *) 0, cc.x, cc.y, NO_MM_FLAGS) */
        const cm_mon = await makemon(null, cm_cc.x | 0, cm_cc.y | 0, NO_MM_FLAGS);
        if (cm_mon && canspotmon(cm_mon) && oseen)
            makeknown(WAN_CREATE_MONSTER);
        return 2;
    }
    case MUSE_SCR_CREATE_MONSTER: {
        /* C muse.c:996-1035.  Same gap, same fix: makemon() is async.
         * Board records #7 (252 recorded draws) and #33 (1,700) are this arm
         * and both were reading `__return__ exp=2 got=0` with the whole tape
         * unconsumed. */
        if (!otmp)
            throw new Error("use_defensive: no scroll of create monster");
        let scm_pm = null, scm_fish = null;
        let cnt = 1;
        let known = false;

        /* C muse.c:1006-1007 — `if (!rn2(73)) cnt += rnd(4);`  The rn2(73) is
         * ALWAYS drawn; rnd(4) only on the 1-in-73. */
        if (!rn2(73))
            cnt += rnd(4);
        /* C muse.c:1008-1009 */
        if (mtmp.mconf || otmp.cursed)
            cnt += 12;
        /* C muse.c:1010-1013 */
        if (mtmp.mconf)
            scm_pm = scm_fish = permonstTemplate(PM_ACID_BLOB);
        else if (is_pool(mtmp.mx | 0, mtmp.my | 0))
            scm_fish = permonstTemplate(game.u?.uinwater ? PM_GIANT_EEL : PM_CROCODILE);
        await mreadmsg(mtmp, otmp);
        /* C muse.c:1015-1023 — `while (cnt--)`, post-decrement, so the body
         * runs `cnt` times.  "`fish' potentially gives bias towards water
         * locations; `pm' is what to actually create (0 => random)". */
        while (cnt-- > 0) {
            const cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, scm_fish);
            if (!cc)
                break;
            const mon = await makemon(scm_pm, cc.x | 0, cc.y | 0, NO_MM_FLAGS);
            if (mon && canspotmon(mon))
                known = true;
        }
        /* C muse.c:1024-1031 — "The only case where we don't use oseen.  For
         * wands, you have to be able to see the monster zap the wand to know
         * what type it is.  For teleport scrolls, you have to see the monster
         * to know it teleported." */
        if (known) {
            makeknown(SCR_CREATE_MONSTER);
        } else {
            /* C do_name.c:678 trycall(obj) — "if (!oc_name_known &&
             * !oc_uname) docall(obj)".  The async port consumes the same
             * getlin-owned keystrokes as C's call prompt. */
            const nameKnown = !!(game._oc_name_known && game._oc_name_known[otmp.otyp | 0]);
            const hasUname = !!(game._oc_uname && game._oc_uname[otmp.otyp | 0]);
            if (!nameKnown && !hasUname) {
                await docall(otmp);
            }
        }
        await m_useup(mtmp, otmp);
        return 2;
    }
    case MUSE_TRAPDOOR:
        if (Is_botlevel(game.u.uz))
            return 0;
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} ${vtense(fakename[0], locomotion(mtmp.data, "jump"))} into a ${trapname(t.ttyp, false)}!`);
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t, vis);

        /*  don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        newsym(game.trapx, game.trapy);

        await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    case MUSE_UPSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (ledger_no(game.u.uz) === 1)
            /* impossible; level 1 upstairs are SSTAIRS */
            return await mon_escape(mtmp, vismon);
        if (Inhell() && mon_has_amulet(mtmp) && !rn2(4)
            && (dunlev(game.u.uz) < dunlevs_in_dungeon(game.u.uz) - 3)) {
            if (vismon)
                await pline(`As ${mon_nam(mtmp)} climbs the stairs, a mysterious force momentarily surrounds ${mhim(mtmp)}...`);
            /* simpler than for the player; this will usually be the Wizard */
            await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        } else {
            if (vismon)
                await pline_mon(mtmp, `${Monnam(mtmp)} escapes upstairs!`);
            await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_DOWN, null);
        }
        return 2;
    case MUSE_DOWNSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes downstairs!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_UP, null);
        return 2;
    case MUSE_UP_LADDER:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes up the ladder!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_DOWN, null);
        return 2;
    case MUSE_DN_LADDER:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes down the ladder!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_UP, null);
        return 2;
    case MUSE_SSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (ledger_no(game.u.uz) === 1) {
            return await mon_escape(mtmp, vismon);
        }
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes ${stway.up ? "up" : "down"}stairs!`);
        /* going from the Valley to Castle (Stronghold) has no sstairs to
           target, but having gs.sstairs.<sx,sy> == <0,0> will work the same as
           specifying MIGR_RANDOM when mon_arrive() eventually places the
           monster, so we can use MIGR_SSTAIRS unconditionally */
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_SSTAIRS, null);
        return 2;
    case MUSE_TELEPORT_TRAP:
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} ${vtense(fakename[0], locomotion(mtmp.data, "jump"))} onto a ${trapname(t.ttyp, false)}!`);
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t, vis);
        /*  don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        maybe_unhide_at(mtmp.mx, mtmp.my);
        newsym(game.trapx, game.trapy);
        /* 0: 'no object' rather than STRANGE_OBJECT; FALSE: obj not seen */
        await m_tele(mtmp, vismon, false, 0);
        return 2;
    case MUSE_POT_HEALING:
        if (!otmp)
            throw new Error("use_defensive: no potioh of healing");
        await mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 4);
        healmon(mtmp, i, 1);
        if (!otmp.cursed && !mtmp.mcansee)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks better.`);
        if (oseen)
            makeknown(POT_HEALING);
        await m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_EXTRA_HEALING:
        if (!otmp)
            throw new Error("use_defensive: no potioh of extra healing");
        await mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 8);
        healmon(mtmp, i, otmp.blessed ? 5 : 2);
        if (!mtmp.mcansee)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks much better.`);
        if (oseen)
            makeknown(POT_EXTRA_HEALING);
        await m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_FULL_HEALING_DEF:
        if (!otmp)
            throw new Error("use_defensive: no potioh of full healing");
        await mquaffmsg(mtmp, otmp);
        if ((otmp.otyp | 0) === POT_SICKNESS)
            await unbless(otmp); /* Pestilence */
        healmon(mtmp, mtmp.mhpmax, otmp.blessed ? 8 : 4);
        if (!mtmp.mcansee && (otmp.otyp | 0) !== POT_SICKNESS)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks completely healed.`);
        if (oseen)
            makeknown(otmp.otyp);
        await m_useup(mtmp, otmp);
        return 2;
    case MUSE_LIZARD_CORPSE: {
        /* C muse.c:1203-1208,2911-2990: mon_consume_unstone(FALSE,FALSE).
         * This choice is always lizard food: no acid or stoning effects. */
        if (!otmp) throw new Error("use_defensive: no lizard corpse");
        const nutrit = dog_nutrition(mtmp, otmp);
        if (vismon) {
            const save_quan = otmp.quan;
            otmp.quan = 1;
            const name = await distant_name(otmp, doname);
            await pline_mon(mtmp, `${Monnam(mtmp)} ${otmp.otyp === TIN ? 'opens and eats the contents of' : 'eats'} ${name}.`);
            otmp.quan = save_quan;
        } else if (!mquaffmsg_Deaf()) {
            await You_hear('chewing.');
        }
        await m_useup(mtmp, otmp);
        if (mtmp.mconf || mtmp.mstun) {
            mtmp.mconf = mtmp.mstun = 0;
            const pm = mtmp.data?.pmidx;
            if (vismon && ![PM_BAT, PM_GIANT_BAT, PM_VAMPIRE_BAT, PM_STALKER].includes(pm))
                await pline_mon(mtmp, `${Monnam(mtmp)} seems steadier now.`);
        }
        if (mtmp.mtame && !mtmp.isminion && nutrit > 0) {
            const edog = mtmp.mextra.edog;
            edog.hungrytime = Math.max(edog.hungrytime, game.moves) + nutrit;
            mtmp.mconf = 0;
        }
        mtmp.movement -= 12; /* NORMAL_SPEED */
        mtmp.mlstmv = game.moves;
        return 2;
    }
    case 0:
        return 0; /* i.e. an exploded wand */
    default:
        await impossible_steed(`${Monnam(mtmp)} wanted to perform action ${game.has_defense}?`);
        break;
    }
    return 0;
}

export async function use_misc(mtmp) {
    let nambuf;
    let vis, vismon, vistrapspot, oseen;
    let i;
    let t;
    let otmp = game.misc;

    if ((i = await precheck(mtmp, otmp)) !== 0)
        return i;
    vis = cansee(mtmp.mx, mtmp.my);
    vismon = canseemon(mtmp);
    oseen = otmp && vismon;

    switch (game.has_misc) {
    case MUSE_POT_GAIN_LEVEL:
        if (!otmp)
            throw new Error("use_misc: no potion of gain level");
        await mquaffmsg(mtmp, otmp);
        if (otmp.cursed) {
            if (Can_rise_up(mtmp.mx, mtmp.my, game.u.uz)) {
                let tolev = depth_of_level(game.u.uz) - 1;
                let tolevel = {};
                get_level(tolevel, tolev);
                if (on_level(tolevel, game.u.uz)) {
                    if (vismon) {
                        await pline_mon(mtmp, `${Monnam(mtmp)} looks uneasy.`);
                        await trycall(otmp);
                    }
                    await m_useup(mtmp, otmp);
                    return 2;
                }
                if (vismon) {
                    await pline_mon(mtmp, `${Monnam(mtmp)} rises up, through the ${ceiling(mtmp.mx, mtmp.my)}!`);
                    await trycall(otmp);
                }
                await m_useup(mtmp, otmp);
                await migrate_to_level(mtmp, ledger_no(tolevel), MIGR_RANDOM, null);
                return 2;
            } else {
                if (vismon) {
                    await pline_mon(mtmp, `${Monnam(mtmp)} looks uneasy.`);
                    await trycall(otmp);
                }
                await m_useup(mtmp, otmp);
                return 2;
            }
        }
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} seems more experienced.`);
        if (oseen)
            makeknown(POT_GAIN_LEVEL_OTYP);
        await m_useup(mtmp, otmp);
        if (!await grow_up(mtmp, null))
            return 1;
        return 2;

    case MUSE_WAN_MAKE_INVISIBLE:
    case MUSE_POT_INVISIBILITY:
        if (!otmp)
            throw new Error("use_misc: no potion of invisibility");
        if (otmp.otyp === WAN_MAKE_INVISIBLE_OTYP) {
            await mzapwand(mtmp, otmp, true);
        } else {
            await mquaffmsg(mtmp, otmp);
        }
        nambuf = mon_nam(mtmp);
        mon_set_minvis(mtmp, !otmp.cursed ? false : true);
        if (vismon && mtmp.minvis) {
            if (canspotmon(mtmp)) {
                await pline(`${upstart(s_suffix(nambuf))} body takes on a ${Hallucination() ? "normal" : "strange"} transparency.`);
            } else {
                await pline(`Suddenly you cannot see ${nambuf}.`);
                if (vis)
                    map_invisible(mtmp.mx, mtmp.my);
            }
            if (oseen)
                makeknown(otmp.otyp);
        } else if (vismon && !mtmp.minvis) {
            await pline(`${Monnam(mtmp)} briefly seems to be transparent.`);
        } else if (!vismon && canseemon(mtmp)) {
            await pline(`${Monnam(mtmp)} suddenly appears!`);
        }
        if (otmp.otyp === POT_INVISIBILITY_OTYP) {
            if (otmp.cursed)
                await you_aggravate(mtmp);
            await m_useup(mtmp, otmp);
        }
        return 2;

    case MUSE_WAN_SPEED_MONSTER:
        if (!otmp)
            throw new Error("use_misc: no wand of speed monster");
        await mzapwand(mtmp, otmp, true);
        mon_adjust_speed(mtmp, 1, otmp);
        return 2;

    case MUSE_POT_SPEED:
        if (!otmp)
            throw new Error("use_misc: no potion of speed");
        await mquaffmsg(mtmp, otmp);
        mon_adjust_speed(mtmp, 1, otmp);
        await m_useup(mtmp, otmp);
        return 2;

    case MUSE_WAN_POLYMORPH:
        if (!otmp)
            throw new Error("use_misc: no wand of polymorph");
        await mzapwand(mtmp, otmp, true);
        await newcham(mtmp, muse_newcham_mon(mtmp), NC_VIA_WAND_OR_SPELL | NC_SHOW_MSG);
        if (oseen)
            makeknown(WAN_POLYMORPH_OTYP);
        return 2;

    case MUSE_POT_POLYMORPH:
        if (!otmp)
            throw new Error("use_misc: no potion of polymorph");
        await mquaffmsg(mtmp, otmp);
        await m_useup(mtmp, otmp);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} suddenly mutates!`);
        await newcham(mtmp, muse_newcham_mon(mtmp), NC_SHOW_MSG);
        if (oseen)
            makeknown(POT_POLYMORPH_OTYP);
        return 2;

    case MUSE_POLY_TRAP:
        t = t_at(game.trapx, game.trapy);
        if (!t)
            return 0;
        vistrapspot = cansee(t.tx, t.ty);
        if (vis || vistrapspot)
            seetrap(t);
        if (vismon || vistrapspot) {
            await pline_mon(mtmp, `${Some_Monnam(mtmp)} deliberately ${vtense(fakename[0], locomotion(mtmp.data, "jump"))} onto a ${t.tseen ? trapname(t.ttyp, false) : "hidden trap"}!`);
        }
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        place_monster(mtmp, game.trapx, game.trapy);
        maybe_unhide_at(game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        newsym(game.trapx, game.trapy);
        await newcham(mtmp, null, NC_SHOW_MSG);
        return 2;

    case MUSE_BAG:
        if (!otmp)
            throw new Error("use_misc: no container");
        return await mloot_container(mtmp, otmp, vismon);

    case MUSE_BULLWHIP:
        {
            const The_whip = vismon ? "The bullwhip" : "A whip";
            let where_to = rn2(4);
            let obj = game.u.uwep;
            let hand;
            let the_weapon, hand_buf;

            if (!obj || !canletgo(obj, "")
                || (game.u.twoweap && canletgo(game.u.uswapwep, "") && rn2(2)))
                obj = game.u.uswapwep;
            if (!obj)
                break;

            the_weapon = the(xname(obj));
            hand = body_part(HAND);
            if (bimanual(obj))
                hand = makeplural(hand);
            hand_buf = hand;

            if (vismon)
                await pline_mon(mtmp, `${Monnam(mtmp)} flicks a bullwhip towards your ${hand_buf}!`);
            if (obj.otyp === HEAVY_IRON_BALL) {
                await pline(`${The_whip} fails to wrap around ${the_weapon}.`);
                return 1;
            }
            await urgent_pline(`${The_whip} wraps around ${the_weapon} you're wielding!`);
            if (welded(obj)) {
                await pline(`${!is_plural(obj) ? "It is" : "They are"} welded to your ${hand_buf}${!obj.bknown ? '!' : '.'}`);
                where_to = 0;
            }
            if (!where_to) {
                await pline_The("whip slips free.");
                return 1;
            } else if (where_to === 3 && mon_hates_silver(mtmp)
                       && (MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) === SILVER) {
                where_to = 2;
            }
            await remove_worn_item(obj, false);
            freeinv(obj);
            switch (where_to) {
            case 1:
                await pline_mon(mtmp, `${Monnam(mtmp)} yanks ${the_weapon} from your ${hand_buf}!`);
                place_object(obj, mtmp.mx, mtmp.my);
                break;
            case 2:
                await pline_mon(mtmp, `${Monnam(mtmp)} yanks ${the_weapon} to the ${surface(game.u.ux, game.u.uy)}!`);
                await dropy(obj);
                break;
            case 3:
                await pline_mon(mtmp, `${Monnam(mtmp)} snatches ${the_weapon}!`);
                await mpickobj(mtmp, obj);
                break;
            }
            return 1;
        }

    case 0:
        return 0;

    default:
        await impossible_steed(`${Monnam(mtmp)} wanted to perform action ${game.has_misc}?`);
        break;
    }
    return 0;
}

/* C mondata.c:53-57
 *   boolean attacktype(struct permonst *ptr, int atyp)
 *   { return attacktype_fordmg(ptr, atyp, AD_ANY) ? TRUE : FALSE; } */
export function hero_behind_chokepoint(mtmp) {
    const N_DIRS_MM = 8; /* C hack.h:655 N_DIRS = N_DIRS_Z - 2 */
    const DIR_CLAMP_MM = (dir) => ((dir + N_DIRS_MM) % N_DIRS_MM);
    const sgn_mm = (n) => (n > 0) ? 1 : (n < 0) ? -1 : 0;
    const dx = sgn_mm((mtmp.mx | 0) - (mtmp.mux | 0));
    const dy = sgn_mm((mtmp.my | 0) - (mtmp.muy | 0));

    const x = (mtmp.mux | 0) + dx;
    const y = (mtmp.muy | 0) + dy;

    const dir = xytodir(dx, dy);
    const dir_l = DIR_CLAMP_MM((dir + 6) % N_DIRS_MM); /* DIR_LEFT2 */
    const dir_r = DIR_CLAMP_MM((dir + 2) % N_DIRS_MM); /* DIR_RIGHT2 */

    const c1 = { x: 0, y: 0 }, c2 = { x: 0, y: 0 };
    dirtocoord(c1, dir_l);
    dirtocoord(c2, dir_r);
    c1.x += x; c2.x += x;
    c1.y += y; c2.y += y;

    if ((!isok(c1.x, c1.y) || !accessible(c1.x, c1.y))
        && (!isok(c2.x, c2.y) || !accessible(c2.x, c2.y)))
        return true;
    return false;
}

/* C ref: muse.c:1299-1360 m_use_undead_turning(mtmp, obj) — consider zapping a
 * wand of undead turning at the corpses the hero is carrying.  C's first
 * statement after the coordinate setup is an unconditional early return for
 * any object that is not a charged WAN_UNDEAD_TURNING, and it draws no RNG on
 * that path; find_offensive() calls this for EVERY object in the monster's
 * inventory, so the guard is on the hot path for every offensive scan.  The
 * body proper (carrying(CORPSE) / linedup_chk_corpse) is the ported function
 * below, m_use_undead_turning(). */
/* C mthrowu.c:1295-1327 linedup_callback with muse.c:1294 linedup_chk_corpse
 * (sobj_at(CORPSE, x, y)) as the callback. */
function _linedup_corpse(ax, ay, bx, by) {
    const gt = game.gt || (game.gt = {});
    gt.tbx = ax - bx;
    gt.tby = ay - by;
    if (!gt.tbx && !gt.tby)
        return false;
    if ((!gt.tbx || !gt.tby || Math.abs(gt.tbx) === Math.abs(gt.tby))
        && Math.max(Math.abs(gt.tbx), Math.abs(gt.tby)) < 8) {
        const dx = sgn_(ax - bx), dy = sgn_(ay - by);
        do {
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return false;
            if (sobj_at(CORPSE, bx, by))
                return true;
        } while (bx !== ax || by !== ay);
    }
    return false;
}

function sgn_(n) { return n < 0 ? -1 : (n > 0 ? 1 : 0); }

export function m_use_undead_turning(mtmp, obj) {
    if (!(obj && (obj.otyp | 0) === WAN_UNDEAD_TURNING && (obj.spe | 0) > 0))
        return;
    const ax = (game.u.ux | 0) + sgn_(mtmp.mux - mtmp.mx) * 3;
    const ay = (game.u.uy | 0) + sgn_(mtmp.muy - mtmp.my) * 3;
    /* C muse.c:1313-1340 — hero carries a corpse, or one lies on the line
     * from the monster to a point 3 steps beyond the hero. */
    let carried = false;
    for (let o = game.invent; o; o = o.nobj)
        if ((o.otyp | 0) === CORPSE) { carried = true; break; }
    if (carried || _linedup_corpse(ax, ay, mtmp.mx | 0, mtmp.my | 0)) {
        game.offensive = obj;
        game.has_offense = MUSE_WAN_UNDEAD_TURNING;
    }
}

/* C ref: muse.c:1369-1391 mon_has_friends(mtmp) — "hostile monster has another
 * hostile next to it".  RNG-free.  m_at() here is the fmon walk (this file's
 * monster_at, C's m_at over svl.level.monsters). */
export function mon_has_friends(mtmp) {
    if ((mtmp.mtame | 0) || (mtmp.mpeaceful | 0))
        return false;

    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            const x = (mtmp.mx | 0) + dx;
            const y = (mtmp.my | 0) + dy;
            let mon2;
            if (isok(x, y) && (mon2 = monster_at(x, y)) != null
                && mon2 !== mtmp
                && !(mon2.mtame | 0) && !(mon2.mpeaceful | 0))
                return true;
        }
    return false;
}

/* C ref: muse.c:1393-1415 mon_likes_objpile_at(mtmp, x, y) — does the monster
 * want any of the top 3 stacks lying at (x,y), or is the pile deeper than 3
 * stacks?  RNG-free.  mon_would_take_item is js/monmove.js's port of
 * monmove.c:1367. */
export function mon_likes_objpile_at(mtmp, x, y) {
    if (!isok(x, y))
        return false;
    let otmp = game.level?.levelObjects?.[x]?.[y] ?? null;
    if (!otmp) /* C OBJ_AT(x,y) */
        return false;

    /* monster likes any of the top 3 items in the pile? */
    let i = 0;
    for (; otmp && i < 3; i++) {
        if (mon_would_take_item(mtmp, otmp))
            return true;
        otmp = otmp.nexthere ?? null;
    }

    /* pile is larger than 3 stacks? */
    if (i >= 3)
        return true;

    return false;
}

const _AMULET_OF_REFLECTION = 208;

// ── ureflects (muse.c:2834) ──
// C ref: muse.c:2834-2866. Outermost-to-innermost check of the hero's
// reflection sources: worn shield, wielded weapon, worn amulet, worn body
// armor (uskin ? "luster" : "armor" — dragon-scale-mail-over-hide wording),
// then the intrinsic silver-dragon-form case.
// EReflecting = u.uprops[REFLECTING].extrinsic; gy.youmonst.data ==
// &mons[PM_SILVER_DRAGON] -> game.youmonst.mndx === PM_SILVER_DRAGON.
// C muse.c:2836-2866: finish message prompts before identification and
// returning to combat; MSGTYPE=stop/more can suspend pline().
export async function ureflects(fmt, str) {
    const u = game.u;
    const EReflecting = (u.uprops[REFLECTING].extrinsic | 0);
    // C muse.c:2840 checks pointers; an empty string still requests a message
    // and identification (notably mcast_lightning's empty prefix).
    const showMessage = fmt != null && str != null;
    if (EReflecting & W_ARMS) {
        if (showMessage) {
            await pline(fmt, str, "shield");
            makeknown(_SHIELD_OF_REFLECTION);
        }
        return true;
    } else if (EReflecting & W_WEP) {
        if (showMessage)
            await pline(fmt, str, "weapon");
        return true;
    } else if (EReflecting & W_AMUL) {
        if (showMessage) {
            await pline(fmt, str, "medallion");
            makeknown(_AMULET_OF_REFLECTION);
        }
        return true;
    } else if (EReflecting & W_ARM) {
        if (showMessage)
            await pline(fmt, str, u.uskin ? "luster" : "armor");
        return true;
    /* C ref: youmonst.data == &mons[PM_SILVER_DRAGON], i.e. u.umonnum.  Was
     * game.youmonst.mndx, which the live path never writes (see poly_gender). */
    } else if (((game.u && game.u.umonnum) | 0) === PM_SILVER_DRAGON) {
        if (showMessage)
            await pline(fmt, str, "scales");
        return true;
    }
    return false;
}
