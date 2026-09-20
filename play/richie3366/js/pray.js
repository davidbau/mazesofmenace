// pray.js — Prayer / altar gods (partial).
// C ref: pray.c — can_pray, dopray, prayer_done, gods_upset, angrygods,
// water_prayer, on_altar / a_align helpers; dosacrifice (#offer); #turn
// (doturn / maybe_turn_mon_iter, D-0912); desecrate_altar / god_zaps_you /
// fry_by_god (D-0963); angrygods cases 4–8 + gods_angry (D-0969);
// offer_corpse / eval_offering / consume_offering (D-1678) /
// offer_different_alignment_altar + uchangealign (attrib.js) caller.
//
// Branch envelope: ParanoidPray → paranoid_query(ParanoidConfirm) (D-1000)
// + wizard Force (D-0517) + #pray ublesscnt-too-soon (p_type 0) →
// angrygods; p_type 3 → pleased You_feel + action rn1 + TROUBLE_HIT
// fix_worst_trouble (D-0920) + TROUBLE_LYCANTHROPE you_unwere (D-1004)
// + majors Stoned…Region (D-1011) + collapsing…cursed_blindfold +
// all minor TROUBLE_* (D-1012) + ublesscnt rnz(350); #offer not-on-altar;
// Knight/Cleric #turn chant + exercise + undead iter + nomul;
// digactualhole altar → desecrate_altar; angrygods 0–8 + default zap
// (punish/attrcurse/rndcurse/summon_minion/god_zaps_you);
// #offer corpse → offer_corpse (D-1678).
// Named omissions: pleased case-5 SetVoice pitch;
// p_type -2 (Moloch laughter + wake_nearby + adjalign + exercise,
// Inhell fall-through) / -1 (undead godvoice + rehumanize + rnd(20)
// losehp + exercise) / pray_revive (tame-corpse/statue scan + revive /
// animate_statue ANIMATE_SPELL); bestow_artifact live + wired in
// offer_corpse (sacrifice gift);
// angry_priest (priest.js, D-2344) from sacrifice_your_race +
// offer_different_alignment_altar; offer_too_soon / offer_fake_amulet /
// offer_real_amulet live + wired in dosacrifice (dosacrifice ECMD_TIME
// after pick is D-1667);
// known_spell SPE_TURN_UNDEAD /
// spelleffects fallback for non-Knight/Cleric; resist TELL pline polish;
// other livelog paths; poly silent/headless can_chant; Fixed_abil/Dunce
// adjattrib; Unaware You_feel dream prefix; music.c do_earthquake altar
// desecrate_altar; SetVoice pitch; ureflects W_AMUL/W_ARM/dragon D-1353;
// mcastu ureflects named; god_zaps_you shieldeff wired, SetVoice C-no-op;
// poly mlet "creature" vs mortal; BlindedTimeout==1 region polish;
// stuck_in_wall blocked_boulder Sokoban diagonal polish; update_inventory
// redraw; Blindfolded cream/itch; attacktype_fordmg swallow Blind gate.

import { game } from './gstate.js';
import { rn2, rn1, rnl, rnz, rnd, d, rn2_on_display_rng } from './rng.js';
import { pline, You, verbalize, You_feel, newsym, impossible, see_monsters, shieldeff } from './display.js';
import { nomul, carrying, losehp, finish_maybe_wail, You_hear } from './hack.js';
import { upstart } from './hacklib.js';
import { weapon_type, unrestrict_weapon_skill, add_weapon_skill, P_RESTRICTED } from './weapon.js';
import {
    ART_EXCALIBUR,
    ART_STORMBRINGER,
    ART_VORPAL_BLADE,
} from './generated/artifacts_data.js';
import { m_at, wake_nearby } from './mon.js';
import { revive } from './zap.js';
import {
    A_WIS, A_STR, A_CON, A_MAX, change_luck, adjattrib, adjalign, exercise,
    ALIGNLIM, uchangealign,
} from './attrib.js';
import { align_gname, align_str, xlev_to_rank, uhim, u_gname, uhis, roles } from './roles.js';
import {
    objects_at, uncurse, peek_at_iced_corpse_age, eaten_stat, get_mtraits,
    mksobj, bless, mkobj, place_object, rnd_class,
} from './mkobj.js';
import { yn_function, y_n, paranoid_query } from './getline.js';
import { livelog_printf } from './pline.js';
import { can_chant, known_spell, spe_Unknown, spe_Fresh, spe_Forgotten, spell_skilltype, force_learn_spell } from './spell.js';
import { couldsee } from './vision.js';
import { monflee } from './monmove.js';
import { set_malign, makemon } from './makemon.js';
import { killed, xkilled } from './uhitm.js';
import { ureflects } from './mhitu.js';
import { aggravate } from './wizard.js';
import { setuhpmax, losexp, pluslvl } from './exper.js';
import { done } from './end.js';
import { monstseesu, monstunseesu } from './mondata.js';
import { mon_nam, Monnam, a_monnam, oname, s_suffix, hcolor } from './do_name.js';
import { disintegrate_arm, setworn, stuck_ring, unchanger, Amulet_off } from './do_wear.js';
import { summon_minion, dlord } from './minion.js';
import {
    near_capacity, encumber_msg, feel_cockatrice, useup, useupf,
    observe_object, update_inventory, makeknown,
} from './invent.js';
import { punish, unpunish } from './read.js';
import { attrcurse, rndcurse } from './sit.js';
import {
    An, an, xname, makeplural, vtense, corpse_xname,
    ansimpleoname, simpleonames, otense, Yobjnam2, yname,
} from './objnam.js';
import {
    objectNames, POT_WATER, POTION_CLASS, WEAPON_CLASS, SPBOOK_CLASS,
} from './objects.js';
import {
    is_human,
    is_undead as mon_is_undead,
    is_demon as mon_is_demon,
    is_vampshifter,
    nohands, throws_rocks, eyecount,
    is_unicorn, your_race, mons,
    MR_ELEC, MR_DISINT,
    monsterNames,
} from './monsters.js';
import {
    PM_KNIGHT,
    PM_CLERIC,
    PM_ACID_BLOB,
    PM_WIZARD,
    PM_MONK,
} from './generated/monsters_data.js';
import { you_unwere } from './were.js';
import {
    make_slimed, make_stoned, make_sick,
    make_confused, make_stunned, make_hallucinated,
    make_glib, make_deaf,
} from './potion.js';
import { init_uhunger, floorfood, carried } from './eat.js';
import { Soundeffect } from './sndprocs.js';
import { se_thunderclap, se_divine_music } from './generated/seffects_data.js';
import { findpriest, temple_occupied, p_coaligned, angry_priest } from './priest.js';
import { rider_corpse_revival } from './pickup.js';
import { region_danger, region_safety } from './region.js';
import { safe_teleds } from './teleport.js';
import { reset_utrap, rescued_from_terrain, heal_legs, animate_statue } from './trap.js';
import { welded, is_weptool } from './wield.js';
import { which_armor } from './worn.js';
import { rehumanize, body_part, mbodypart } from './polyself.js';
import { make_blinded, dropy } from './do.js';
import { buried_ball_to_freedom } from './dig.js';
import {
    confers_luck, u_wield_art, exist_artifact, artiname, is_art,
    discover_artifact, nartifact_exist, mk_artifact, artifact_origin,
    bare_artifactname,
} from './artifact.js';
import {
    IS_ALTAR, Amask2align, Align2amask, AM_MASK, AM_SHRINE, AM_SANCTUM, AM_CHAOTIC,
    A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, A_CG_CONVERT, ECMD_OK, ECMD_TIME,
    PARANOID_PRAY, PARANOID_CONFIRM, LL_CONDUCT, LL_DIVINEGIFT, LL_ARTIFACT,
    LL_SPOILER, CXN_ARTICLE, FROMOUTSIDE, INTRINSIC,
    LUCKMAX, has_omonst, OMONST, NON_PM, ROOM, FOOT, something, Something,
    ANIMATE_SPELL, KILLED_BY_AN,
    STRAT_APPEARMSG, MM_NOMSG,
    M_AP_TYPE, M_AP_FURNITURE, has_mcorpsenm, MCORPSENM,
    LL_MINORAC, BOLT_LIM, MAXULEV, TELL, NOTELL, Upolyd, ismnum,
    DIED, KILLED_BY, Is_astralevel, M_SEEN_REFL, M_SEEN_ELEC, M_SEEN_DISINT,
    W_ARMS, W_ARMC, W_ARM, W_AMUL, OBJ_FREE, SICK_ALL,
    REFLECTING,
    WEAK, HUNGRY, TT_LAVA, TT_BURIEDBALL, TELEDS_NO_FLAGS, DISSOLVED,
    XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
    EXT_ENCUMBER, HVY_ENCUMBER, TIMEOUT, isok, IS_OBSTRUCTED,
    SDOOR, SCORR, W_SADDLE, EYE, STOMACH,
    P_LONG_SWORD, P_BROAD_SWORD, ONAME_GIFT, ONAME_KNOW_ARTI,
    nothing_happens, ACH_TUNE, PLNMSG_OBJ_GLOWS,
} from './const.js';
import { objectNameStrs } from './generated/objects_data.js';
import { record_achievement } from './insight.js';
import { obfree } from './shk.js';

const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const CORPSE = objectNames.indexOf('CORPSE');
const STATUE = objectNames.indexOf('STATUE');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const SILVER_DRAGON_SCALES = objectNames.indexOf('SILVER_DRAGON_SCALES');
const SILVER_DRAGON_SCALE_MAIL = objectNames.indexOf('SILVER_DRAGON_SCALE_MAIL');
const PM_SILVER_DRAGON = monsterNames.indexOf('PM_SILVER_DRAGON');
const AMULET_OF_STRANGULATION = objectNames.indexOf('AMULET_OF_STRANGULATION');
const LEVITATION_BOOTS = objectNames.indexOf('LEVITATION_BOOTS');
const RIN_LEVITATION = objectNames.indexOf('RIN_LEVITATION');
const RIN_SUSTAIN_ABILITY = objectNames.indexOf('RIN_SUSTAIN_ABILITY');
const GAUNTLETS_OF_FUMBLING = objectNames.indexOf('GAUNTLETS_OF_FUMBLING');
const FUMBLE_BOOTS = objectNames.indexOf('FUMBLE_BOOTS');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const HELM_OF_OPPOSITE_ALIGNMENT = objectNames.indexOf('HELM_OF_OPPOSITE_ALIGNMENT');
const SADDLE = objectNames.indexOf('SADDLE');
const BOULDER = objectNames.indexOf('BOULDER');
const LONG_SWORD = objectNames.indexOf('LONG_SWORD');
const RUNESWORD = objectNames.indexOf('RUNESWORD');
const SPE_FINGER_OF_DEATH = objectNames.indexOf('SPE_FINGER_OF_DEATH');
const SPE_RESTORE_ABILITY = objectNames.indexOf('SPE_RESTORE_ABILITY');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const PM_WRAITH = monsterNames.indexOf('PM_WRAITH');

const MOLOCH = 'Moloch';
// C ref: defsym.h PCHAR S_altar — furniture mimic mappearance
const S_altar = 33;

const STRIDENT = 4; // pray.c
const DEVOUT = 14; // pray.c
const PIOUS = 20; // pray.c:64
// C: objclass.h:152 SPBOOK_no_NOVEL = -SPBOOK_CLASS (mkobj excludes novel/BotD)
const SPBOOK_no_NOVEL = 0 - SPBOOK_CLASS;
// C: pray.c TROUBLE_* (priority via in_trouble order, not magnitude)
const TROUBLE_STONED = 14;
const TROUBLE_SLIMED = 13;
const TROUBLE_STRANGLED = 12;
const TROUBLE_LAVA = 11;
const TROUBLE_SICK = 10;
const TROUBLE_STARVING = 9;
const TROUBLE_REGION = 8;
const TROUBLE_HIT = 7;
const TROUBLE_LYCANTHROPE = 6;
const TROUBLE_COLLAPSING = 5;
const TROUBLE_STUCK_IN_WALL = 4;
const TROUBLE_CURSED_LEVITATION = 3;
const TROUBLE_UNUSEABLE_HANDS = 2;
const TROUBLE_CURSED_BLINDFOLD = 1;
const TROUBLE_PUNISHED = -1;
const TROUBLE_FUMBLING = -2;
const TROUBLE_CURSED_ITEMS = -3;
const TROUBLE_SADDLE = -4;
const TROUBLE_BLIND = -5;
const TROUBLE_POISONED = -6;
const TROUBLE_WOUNDED_LEGS = -7;
const TROUBLE_HUNGRY = -8;
const TROUBLE_STUNNED = -9;
const TROUBLE_CONFUSED = -10;
const TROUBLE_HALLUCINATION = -11;
// C: pray.c godvoices[]
const GODVOICES = ['booms out', 'thunders', 'rings out', 'booms'];

function Luck() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

/** C ref: dungeon.h Inhell — In_hell(&u.uz): dungeon hellish flag (dungeon.c:1941–1945), not dnum. */
function Inhell() {
    return !!(game.dungeons?.[game.u?.uz?.dnum | 0]?.flags?.hellish);
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

function Hallucination() {
    return !!(game.u?.Hallucination);
}

/** C youprop.h Antimagic. */
function Antimagic() {
    const u = game.u || {};
    return !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
}

/** C: Punished ≡ uball != 0. Exported for polyself.c doremove. */
export function Punished() {
    return !!(game.u?.uball);
}

/** C: pray.c on_altar */
function on_altar() {
    const u = game.u;
    const loc = game.level?.at(u?.ux, u?.uy);
    return !!(loc && IS_ALTAR(loc.typ));
}

/** C: pray.c on_shrine — altarmask AM_SHRINE */
function on_shrine() {
    const u = game.u;
    const loc = game.level?.at(u?.ux, u?.uy);
    if (!loc) return false;
    const mask = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
    return (mask & AM_SHRINE) !== 0;
}

/**
 * C ref: pray.c altarmask_at :2489–2504.
 * Furniture-mimic altar uses MCORPSENM; else rm.altarmask.
 * Callers: dungeon.c count_feat_lastseentyp; dig.c / music.c / pager.c named.
 */
export function altarmask_at(x, y) {
    let res = 0;
    if (isok(x, y)) {
        const mon = m_at(x, y);
        if (mon && M_AP_TYPE(mon) === M_AP_FURNITURE
            && (mon.mappearance | 0) === S_altar) {
            res = has_mcorpsenm(mon) ? (MCORPSENM(mon) | 0) : 0;
        } else {
            const loc = game.level?.at(x, y);
            if (loc && IS_ALTAR(loc.typ)) {
                res = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
            }
        }
    }
    return res;
}

/** C: pray.c a_align — altarmask overlays rm.flags in C; JS mkaltar uses flags */
function a_align(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return A_NONE;
    const mask = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
    return Amask2align(mask & AM_MASK);
}

/**
 * C ref: pray.c critically_low_hp — hp ≤ 5 or hp*divisor ≤ maxhp.
 * @param {boolean} only_if_injured
 */
export function critically_low_hp(only_if_injured) {
    const u = game.u || {};
    const polyd = Upolyd(u);
    let curhp = polyd ? (u.mh | 0) : (u.uhp | 0);
    let maxhp = polyd ? (u.mhmax | 0) : (u.uhpmax | 0);
    if (only_if_injured && !(curhp < maxhp)) return false;
    const hplim = 15 * (u.ulevel | 0);
    if (maxhp > hplim) maxhp = hplim;
    let divisor;
    switch (xlev_to_rank(u.ulevel | 0)) {
    case 0:
    case 1:
        divisor = 5;
        break;
    case 2:
    case 3:
        divisor = 6;
        break;
    case 4:
    case 5:
        divisor = 7;
        break;
    case 6:
    case 7:
        divisor = 8;
        break;
    default:
        divisor = 9;
        break;
    }
    return curhp <= 5 || curhp * divisor <= maxhp;
}

/** C: pray.c `#define Cursed_obj(obj, typ)`. */
function Cursed_obj(obj, typ) {
    return !!(obj && (obj.otyp | 0) === (typ | 0) && obj.cursed);
}

/** C youprop.h Blindfolded / BlindedTimeout / Blinded / Passes_walls / Fixed_abil. */
function Blindfolded() {
    return !!(game.u?.EBlinded || game.u?.ublindf);
}
function Blindfolded_only() {
    return Blindfolded() && !BlindedProp();
}
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}
function BlindedProp() {
    const u = game.u || {};
    // C: Blinded ≡ (HBlinded && !BBlinded)
    return !!((u.HBlinded | 0) && !(u.BBlinded | 0));
}
function Passes_walls() {
    const u = game.u || {};
    return !!((u.HPasses_walls | 0) || (u.EPasses_walls | 0) || u.Passes_walls);
}
function Fixed_abil() {
    const u = game.u || {};
    return !!((u.HFixed_abil | 0) || (u.EFixed_abil | 0) || u.Fixed_abil);
}
function Wounded_legs() {
    const u = game.u || {};
    return !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
}
function DeafProp() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C obj.h bimanual — WEAPON/TOOL with oc_big. */
function bimanual(obj) {
    if (!obj) return false;
    return !!(game.objects?.[obj.otyp]?.oc_bimanual
        || game.objects?.[obj.otyp]?.oc_big);
}

/** C engrave.c freehand — welded two-hand / cursed shield gate. */
function freehand() {
    const u = game.u || {};
    const uwep = u.uwep;
    if (!uwep || !welded(uwep)) return true;
    if (!bimanual(uwep) && (!u.uarms || !u.uarms.cursed)) return true;
    return false;
}

/**
 * C ref: pray.c blocked_boulder — boulder stack / pushability gate.
 * Named omit: Sokoban diagonal + pool sink nuance beyond isok/obstruct.
 */
function blocked_boulder(dx, dy) {
    const u = game.u || {};
    let count = 0;
    for (let otmp = objects_at((u.ux | 0) + dx, (u.uy | 0) + dy);
        otmp; otmp = otmp.nexthere) {
        if ((otmp.otyp | 0) === BOULDER) count += otmp.quan | 0;
    }
    const nx = (u.ux | 0) + 2 * dx;
    const ny = (u.uy | 0) + 2 * dy;
    if (count === 0) return false;
    if (count >= 2) {
        // C: pool/lava may still allow push — thin: treat ≥2 as blocked
        return true;
    }
    if (dx && dy && !!(game.level?.flags?.sokoban_rules
        || game.level?.flags?.sokoban || game.Sokoban)) {
        return true;
    }
    if (!isok(nx, ny)) return true;
    const loc = game.level?.at(nx, ny);
    if (loc && IS_OBSTRUCTED(loc.typ | 0)) return true;
    for (let otmp = objects_at(nx, ny); otmp; otmp = otmp.nexthere) {
        if ((otmp.otyp | 0) === BOULDER) return true;
    }
    return false;
}

/**
 * C ref: pray.c stuck_in_wall — all 8 neighbors obstructed / boulder-blocked.
 */
function stuck_in_wall() {
    const u = game.u || {};
    if (Passes_walls()) return false;
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        const x = (u.ux | 0) + i;
        for (let j = -1; j <= 1; j++) {
            if (!i && !j) continue;
            const y = (u.uy | 0) + j;
            const loc = game.level?.at(x, y);
            const typ = loc ? (loc.typ | 0) : -1;
            if (!isok(x, y)
                || (IS_OBSTRUCTED(typ) && typ !== SDOOR && typ !== SCORR)
                || (blocked_boulder(i, j)
                    && !throws_rocks(game.youmonst?.data))) {
                count++;
            }
        }
    }
    return count === 8;
}

/**
 * C ref: pray.c worst_cursed_item — select cursed worn/invent for uncurse.
 * @returns {object|null}
 */
function worst_cursed_item() {
    const u = game.u || {};
    let otmp = null;
    if (near_capacity() >= HVY_ENCUMBER) {
        for (const o of game.invent || []) {
            if (Cursed_obj(o, LOADSTONE)) return o;
        }
    }
    if (u.uwep && welded(u.uwep) && (u.uright || bimanual(u.uwep))) {
        otmp = u.uwep;
    } else if (u.uarmg && u.uarmg.cursed) {
        otmp = u.uarmg;
    } else if (u.uarms && u.uarms.cursed) {
        otmp = u.uarms;
    } else if (u.uarmc && u.uarmc.cursed) {
        otmp = u.uarmc;
    } else if (u.uarm && u.uarm.cursed) {
        otmp = u.uarm;
    } else if (u.uarmh && u.uarmh.cursed
        && (u.uarmh.otyp | 0) !== HELM_OF_OPPOSITE_ALIGNMENT) {
        otmp = u.uarmh;
    } else if (u.uarmf && u.uarmf.cursed) {
        otmp = u.uarmf;
    } else if (u.uarmu && u.uarmu.cursed) {
        otmp = u.uarmu;
    } else if (u.uamul && u.uamul.cursed) {
        otmp = u.uamul;
    } else if (u.uleft && u.uleft.cursed) {
        otmp = u.uleft;
    } else if (u.uright && u.uright.cursed) {
        otmp = u.uright;
    } else if (u.ublindf && u.ublindf.cursed) {
        otmp = u.ublindf;
    } else if (u.uwep && welded(u.uwep)) {
        otmp = u.uwep;
    } else if (u.uswapwep && u.uswapwep.cursed && u.twoweap) {
        otmp = u.uswapwep;
    } else {
        otmp = null;
        for (const o of game.invent || []) {
            if (!o.cursed) continue;
            if ((o.otyp | 0) === LOADSTONE || confers_luck(o)) {
                otmp = o;
                break;
            }
        }
    }
    return otmp || null;
}

/**
 * C ref: pray.c fix_curse_trouble — glow + uncurse (+ Glib gloves clear).
 * Named omit: update_inventory redraw; PLNMSG_OBJ_GLOWS.
 */
async function fix_curse_trouble(otmp, what) {
    const u = game.u || {};
    if (!otmp) return;
    if (otmp === u.uarmg && (u.Glib | 0)) {
        make_glib(0);
        await pline('Your gloves are no longer slippery.');
        if (!otmp.cursed) return;
    }
    if (!Blind() || (otmp === u.ublindf && Blindfolded_only())) {
        const glow = what || `Your ${xname(otmp)} softly glows`;
        await pline(`${glow} ${hcolor('amber')}.`);
        otmp.bknown = !Hallucination();
    }
    await uncurse(otmp);
}

/**
 * C ref: pray.c in_trouble — major/minor trouble ranking.
 * Ported: all TROUBLE_* majors + minors (D-1011/D-1012).
 * Named omit: swallow Blind attacktype_fordmg gate polish.
 */
function in_trouble() {
    const u = game.u || {};
    // C: major troubles in priority order
    if (u.Stoned) return TROUBLE_STONED;
    if (u.Slimed) return TROUBLE_SLIMED;
    if (u.Strangled || (u.HStrangled | 0) || (u.EStrangled | 0)) {
        return TROUBLE_STRANGLED;
    }
    if (u.utrap && (u.utraptype | 0) === TT_LAVA) return TROUBLE_LAVA;
    if (u.Sick) return TROUBLE_SICK;
    if ((u.uhs | 0) >= WEAK) return TROUBLE_STARVING;
    if (region_danger()) return TROUBLE_REGION;
    const unchanging = !!(u.Unchanging || u.HUnchanging);
    if ((!Upolyd(u) || unchanging) && critically_low_hp(false)) {
        return TROUBLE_HIT;
    }
    if (ismnum(u.ulycn)) return TROUBLE_LYCANTHROPE;
    const abaseStr = u.acurr?.a?.[A_STR] | 0;
    const amaxStr = u.amax?.a?.[A_STR] | 0;
    if (near_capacity() >= EXT_ENCUMBER && amaxStr - abaseStr > 3) {
        return TROUBLE_COLLAPSING;
    }
    if (stuck_in_wall()) return TROUBLE_STUCK_IN_WALL;
    if (Cursed_obj(u.uarmf, LEVITATION_BOOTS)
        || stuck_ring(u.uleft, RIN_LEVITATION)
        || stuck_ring(u.uright, RIN_LEVITATION)) {
        return TROUBLE_CURSED_LEVITATION;
    }
    if (nohands(game.youmonst?.data) || !freehand()) {
        if (u.uwep && welded(u.uwep)) return TROUBLE_UNUSEABLE_HANDS;
        if (Upolyd(u) && nohands(game.youmonst?.data)
            && (!unchanging
                || (() => {
                    const ot = unchanger();
                    return ot && ot.cursed;
                })())) {
            return TROUBLE_UNUSEABLE_HANDS;
        }
    }
    if (Blindfolded() && u.ublindf && u.ublindf.cursed) {
        return TROUBLE_CURSED_BLINDFOLD;
    }

    // C: minor troubles
    if (Punished() || (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL)) {
        return TROUBLE_PUNISHED;
    }
    if (Cursed_obj(u.uarmg, GAUNTLETS_OF_FUMBLING)
        || Cursed_obj(u.uarmf, FUMBLE_BOOTS)) {
        return TROUBLE_FUMBLING;
    }
    if (worst_cursed_item()) return TROUBLE_CURSED_ITEMS;
    if (u.usteed) {
        const sad = which_armor(u.usteed, W_SADDLE);
        if (Cursed_obj(sad, SADDLE)) return TROUBLE_SADDLE;
    }
    if (BlindedTimeout() > 1
        && !((u.HBlinded | 0) & ~TIMEOUT)
        && (!u.uswallow
            /* attacktype_fordmg swallow Blind deferred — treat as not blind */)) {
        return TROUBLE_BLIND;
    }
    if (((u.HDeaf | 0) & TIMEOUT) > 1) return TROUBLE_BLIND;

    for (let i = 0; i < A_MAX; i++) {
        const base = u.acurr?.a?.[i] | 0;
        const mx = u.amax?.a?.[i] | 0;
        if (base < mx) return TROUBLE_POISONED;
    }
    if (Wounded_legs() && !u.usteed) return TROUBLE_WOUNDED_LEGS;
    if ((u.uhs | 0) >= HUNGRY) return TROUBLE_HUNGRY;
    if ((u.HStun | 0) & TIMEOUT) return TROUBLE_STUNNED;
    if ((u.HConfusion | 0) & TIMEOUT) return TROUBLE_CONFUSED;
    if ((u.HHallucination | 0) & TIMEOUT) return TROUBLE_HALLUCINATION;
    return 0;
}

/** C invent.c useup for worn strangulation amulet (setworn + freeinv). */
function useup_strangle_amulet(otmp) {
    if (!otmp) return;
    const u = game.u || {};
    if (u.uamul === otmp) setworn(null, W_AMUL);
    else if ((otmp.owornmask | 0) & W_AMUL) {
        otmp.owornmask = (otmp.owornmask | 0) & ~W_AMUL;
    }
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: pray.c fix_worst_trouble — divine repair of one trouble code.
 * Ported: Stoned…Hallucination + saddle (D-1011/D-1012).
 */
async function fix_worst_trouble(trouble) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    let otmp = null;
    let what = null;
    const leftglow = 'Your left ring softly glows';
    const rightglow = 'Your right ring softly glows';

    switch (trouble) {
    case TROUBLE_STONED:
        await make_stoned(0, 'You feel more limber.', 0, '');
        break;
    case TROUBLE_SLIMED:
        await make_slimed(0, 'The slime disappears.');
        break;
    case TROUBLE_STRANGLED: {
        if (u.uamul && (u.uamul.otyp | 0) === AMULET_OF_STRANGULATION) {
            await pline('Your amulet vanishes!');
            useup_strangle_amulet(u.uamul);
        }
        await pline('You can breathe again.');
        u.Strangled = 0;
        u.HStrangled = 0;
        u.EStrangled = 0;
        game.flags.botl = true;
        break;
    }
    case TROUBLE_LAVA:
        if (!(await safe_teleds(TELEDS_NO_FLAGS))) {
            reset_utrap(true);
        }
        await rescued_from_terrain(DISSOLVED);
        break;
    case TROUBLE_STARVING:
        // C: FALLTHROUGH into TROUBLE_HUNGRY
        await pline(`Your ${body_part(STOMACH)} feels content.`);
        await init_uhunger();
        game.flags.botl = true;
        break;
    case TROUBLE_HUNGRY:
        await pline(`Your ${body_part(STOMACH)} feels content.`);
        await init_uhunger();
        game.flags.botl = true;
        break;
    case TROUBLE_SICK:
        await You_feel('better.');
        await make_sick(0, '', false, SICK_ALL);
        break;
    case TROUBLE_REGION:
        await region_safety();
        break;
    case TROUBLE_HIT: {
        await You_feel('much better.');
        let maxhp;
        if (Upolyd(u)) {
            maxhp = (u.mhmax | 0) + rnd(5);
            setuhpmax(Math.max(maxhp, 5 + 1), false);
            u.mh = u.mhmax;
        }
        maxhp = u.uhpmax | 0;
        if (maxhp < (u.ulevel | 0) * 5 + 11) {
            maxhp += rnd(5);
        }
        setuhpmax(Math.max(maxhp, 5 + 1), true);
        u.uhp = u.uhpmax;
        game.flags.botl = true;
        break;
    }
    case TROUBLE_COLLAPSING: {
        const abaseStr = u.acurr?.a?.[A_STR] | 0;
        const amaxStr = u.amax?.a?.[A_STR] | 0;
        await You_feel(`${amaxStr - abaseStr > 6 ? 'much ' : ''}stronger.`);
        if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
        if (!u.amax) u.amax = { a: [...(u.acurr.a || [10, 10, 10, 10, 10, 10])] };
        u.acurr.a[A_STR] = u.amax.a[A_STR] | 0;
        game.flags.botl = true;
        if (Fixed_abil()) {
            otmp = stuck_ring(u.uleft, RIN_SUSTAIN_ABILITY);
            if (otmp) {
                if (otmp === u.uleft) what = leftglow;
            } else {
                otmp = stuck_ring(u.uright, RIN_SUSTAIN_ABILITY);
                if (otmp === u.uright) what = rightglow;
            }
            if (otmp) {
                await fix_curse_trouble(otmp, what);
                break;
            }
        }
        break;
    }
    case TROUBLE_STUCK_IN_WALL:
        if (await safe_teleds(TELEDS_NO_FLAGS)) {
            await pline('Your surroundings change.');
        } else {
            // C: set_itimeout(&HPasses_walls, d(4,4)+4)
            const xt = d(4, 4) + 4;
            u.HPasses_walls = ((u.HPasses_walls | 0) & ~TIMEOUT) | (xt & TIMEOUT);
            await You_feel('much slimmer.');
        }
        break;
    case TROUBLE_CURSED_LEVITATION:
        if (Cursed_obj(u.uarmf, LEVITATION_BOOTS)) {
            otmp = u.uarmf;
        } else if ((otmp = stuck_ring(u.uleft, RIN_LEVITATION))) {
            if (otmp === u.uleft) what = leftglow;
        } else if ((otmp = stuck_ring(u.uright, RIN_LEVITATION))) {
            if (otmp === u.uright) what = rightglow;
        }
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_UNUSEABLE_HANDS:
        if (u.uwep && welded(u.uwep)) {
            await fix_curse_trouble(u.uwep, what);
            break;
        }
        if (Upolyd(u) && nohands(game.youmonst?.data)) {
            if (!(u.Unchanging || u.HUnchanging)) {
                await pline('Your shape becomes uncertain.');
                await rehumanize();
            } else {
                otmp = unchanger();
                if (otmp && otmp.cursed) {
                    await fix_curse_trouble(otmp, what);
                    break;
                }
            }
        }
        // C: impossible if still nohands/!freehand — omit
        break;
    case TROUBLE_CURSED_BLINDFOLD:
        await fix_curse_trouble(u.ublindf, what);
        break;
    case TROUBLE_LYCANTHROPE:
        await you_unwere(true);
        break;
    case TROUBLE_PUNISHED:
        await pline('Your chain disappears.');
        if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL) {
            buried_ball_to_freedom();
        } else {
            unpunish();
        }
        break;
    case TROUBLE_FUMBLING:
        if (Cursed_obj(u.uarmg, GAUNTLETS_OF_FUMBLING)) otmp = u.uarmg;
        else if (Cursed_obj(u.uarmf, FUMBLE_BOOTS)) otmp = u.uarmf;
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_CURSED_ITEMS:
        otmp = worst_cursed_item();
        if (otmp === u.uright) what = rightglow;
        else if (otmp === u.uleft) what = leftglow;
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_POISONED: {
        if (Hallucination()) {
            await pline("There's a tiger in your tank.");
        } else {
            await You_feel('in good health again.');
        }
        if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
        if (!u.amax) u.amax = { a: [...u.acurr.a] };
        for (let i = 0; i < A_MAX; i++) {
            if ((u.acurr.a[i] | 0) < (u.amax.a[i] | 0)) {
                u.acurr.a[i] = u.amax.a[i] | 0;
                game.flags.botl = true;
            }
        }
        await encumber_msg();
        break;
    }
    case TROUBLE_BLIND: {
        let msgbuf = '';
        let eyes = body_part(EYE);
        const cure_deaf = !!((u.HDeaf | 0) & TIMEOUT);
        if (BlindedProp() || BlindedTimeout()) {
            /* C pray.c:562 mondata.h eyecount != 1 → plural EYE */
            if (eyecount(game.youmonst?.data) !== 1) eyes = makeplural(eyes);
            msgbuf = `Your ${eyes} ${vtense(eyes, 'feel')} better`;
            u.ucreamed = 0;
            await make_blinded(0, false);
        }
        if (cure_deaf) {
            await make_deaf(0, false);
            if (!DeafProp()) {
                msgbuf += msgbuf ? ' and you can hear again' : 'You can hear again';
            }
        }
        if (msgbuf) await pline(`${msgbuf}.`);
        break;
    }
    case TROUBLE_WOUNDED_LEGS:
        await heal_legs(0);
        break;
    case TROUBLE_STUNNED:
        await make_stunned(0, true);
        break;
    case TROUBLE_CONFUSED:
        await make_confused(0, true);
        break;
    case TROUBLE_HALLUCINATION:
        await pline('Looks like you are back in Kansas.');
        await make_hallucinated(0, false, 0);
        break;
    case TROUBLE_SADDLE: {
        otmp = which_armor(u.usteed, W_SADDLE);
        if (otmp && !Blind()) {
            await pline(`Your ${xname(otmp)} softly glows ${hcolor('amber')}.`);
            otmp.bknown = 1;
        }
        if (otmp) uncurse(otmp);
        break;
    }
    default:
        break;
    }
}

/** Local stubs — full mondata predicates deferred (C-JS-MAP). */
function is_demon(_data) {
    return false;
}
function is_undead(_data) {
    return false;
}

function pray_state() {
    if (!game.pray) game.pray = { p_aligntyp: 0, p_trouble: 0, p_type: 0 };
    return game.pray;
}

/**
 * C ref: pray.c water_prayer — bless/curse POT_WATER on altar; no RNG.
 * @returns {boolean} true if any water changed
 */
function water_prayer(bless_water) {
    const u = game.u;
    let changed = 0;
    let other = false;
    const bc_known = !(Blind() || Hallucination());
    for (let otmp = objects_at(u.ux, u.uy); otmp; otmp = otmp.nexthere) {
        if (
            otmp.otyp === POT_WATER
            && (bless_water ? !otmp.blessed : !otmp.cursed)
        ) {
            otmp.blessed = !!bless_water;
            otmp.cursed = !bless_water;
            otmp.bknown = bc_known;
            changed += otmp.quan | 0;
        } else if (otmp.oclass === POTION_CLASS) {
            other = true;
        }
    }
    // Glow pline deferred unless screens need it
    void other;
    return changed > 0;
}

/**
 * C ref: pray.c can_pray — set p_aligntyp / p_trouble / p_type.
 * @param {boolean} praying
 */
export async function can_pray(praying) {
    const u = game.u || (game.u = {});
    const gp = pray_state();
    const data = game.youmonst?.data;

    gp.p_aligntyp = on_altar() ? a_align(u.ux, u.uy) : (u.ualign?.type ?? 0);
    gp.p_trouble = in_trouble();

    if (
        is_demon(data)
        && (gp.p_aligntyp === A_LAWFUL || gp.p_aligntyp !== A_NEUTRAL)
    ) {
        if (praying) {
            await pline(
                `The very idea of praying to a ${
                    gp.p_aligntyp ? 'lawful' : 'neutral'
                } god is repugnant to you.`,
            );
        }
        return false;
    }

    if (praying) {
        await pline(
            `You begin praying to ${align_gname(game.urole, gp.p_aligntyp)}.`,
        );
    }

    const utype = u.ualign?.type ?? 0;
    const record = u.ualign?.record | 0;
    let alignment;
    if (utype && utype === -gp.p_aligntyp) {
        alignment = -record;
    } else if (utype !== gp.p_aligntyp) {
        alignment = Math.trunc(record / 2);
    } else {
        alignment = record;
    }

    const bless = u.ublesscnt | 0;
    if (gp.p_aligntyp === A_NONE) {
        gp.p_type = -2;
    } else if (
        (gp.p_trouble > 0)
            ? (bless > 200)
            : (gp.p_trouble < 0)
                ? (bless > 100)
                : (bless > 0)
    ) {
        gp.p_type = 0; // too soon
    } else if (Luck() < 0 || (u.ugangr | 0) || alignment < 0) {
        gp.p_type = 1;
    } else if (on_altar() && utype !== gp.p_aligntyp) {
        gp.p_type = 2;
    } else {
        gp.p_type = 3;
    }

    if (
        is_undead(data)
        && !Inhell()
        && (
            gp.p_aligntyp === A_LAWFUL
            || (gp.p_aligntyp === A_NEUTRAL && !rn2(10))
        )
    ) {
        gp.p_type = -1;
    }

    return !praying ? (gp.p_type === 3 && !Inhell()) : true;
}

/**
 * C ref: pray.c godvoice — ROLL_FROM(godvoices) → rn2(4).
 * @param {number} g_align
 * @param {string|null} words
 */
async function godvoice(g_align, words) {
    let quot = '';
    let w = words;
    if (w) quot = '"';
    else w = '';
    const how = GODVOICES[rn2(GODVOICES.length)];
    await pline(
        `The voice of ${align_gname(game.urole, g_align)} ${how}: ${quot}${w}${quot}`,
    );
}

/**
 * C ref: pray.c altar_wrath — kick/engrave/dig desecration voice.
 * Branch envelope: own-altar record > -rn2(4) → godvoice + adjattrib WIS
 * + record--; else Deaf-aware whisper + verbalize + Luck>−5 rn2 luck loss.
 * Named omit: SetVoice pitch.
 */
export async function altar_wrath(x, y) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    const altaralign = a_align(x, y);
    const Deaf = !!(u.Deaf || u.HDeaf || u.EDeaf || u.uroleplay?.deaf);

    if ((u.ualign.type | 0) === (altaralign | 0)
        && (u.ualign.record | 0) > -rn2(4)) {
        await godvoice(altaralign, 'How darest thou desecrate my altar!');
        await adjattrib(A_WIS, -1, false);
        u.ualign.record = (u.ualign.record | 0) - 1;
    } else {
        await pline(
            `${!Deaf ? 'A voice (could it be' : 'Despite your deafness, you seem to hear'} ${
                align_gname(game.urole, altaralign)
            }${!Deaf ? '?) whispers' : ' say'}:`,
        );
        // SetVoice deferred
        await verbalize('Thou shalt pay, infidel!');
        if (Luck() > -5 && rn2(Luck() + 6)) {
            change_luck(rn2(20) ? -1 : -2);
        }
    }
}

/** C ref: youprop.h Reflecting — H/E + worn SoR/AoR/silver DSM / form. */
function Reflecting() {
    const u = game.u || {};
    if ((u.HReflecting | 0) || (u.EReflecting | 0) || u.Reflecting) return true;
    const e = u.uprops?.[REFLECTING];
    if ((e?.intrinsic | 0) || (e?.extrinsic | 0)) return true;
    if (u.uarms?.otyp === SHIELD_OF_REFLECTION) return true;
    if (u.uamul?.otyp === AMULET_OF_REFLECTION) return true;
    const arm = u.uarm?.otyp | 0;
    if (arm === SILVER_DRAGON_SCALES || arm === SILVER_DRAGON_SCALE_MAIL) {
        return true;
    }
    return (game.youmonst?.data?.mndx | 0) === PM_SILVER_DRAGON;
}

/** C ref: youprop.h Shock_resistance */
function Shock_resistance() {
    const u = game.u || {};
    return !!(u.Shock_resistance || (u.HShock_resistance | 0)
        || (u.EShock_resistance | 0));
}

/** C ref: youprop.h Disint_resistance */
function Disint_resistance() {
    const u = game.u || {};
    return !!(u.Disint_resistance || (u.HDisint_resistance | 0)
        || (u.EDisint_resistance | 0));
}

/** C: monst.h resists_elec / resists_disint via mresists|mextrinsics|mintrinsics. */
function mon_resists_bit(mon, mrBit) {
    if (!mon) return false;
    const bits = (mon.data?.mresists | 0)
        | (mon.mextrinsics | 0)
        | (mon.mintrinsics | 0);
    return !!(bits & mrBit);
}
function resists_elec(mon) { return mon_resists_bit(mon, MR_ELEC); }
function resists_disint(mon) { return mon_resists_bit(mon, MR_DISINT); }

/** C: dungeon.h Is_sanctum — on_level(&u.uz, &sanctum_level). */
function Is_sanctum(uz) {
    const s = game.sanctum_level;
    const lev = uz ?? game.u?.uz;
    return !!(s && lev
        && (s.dnum | 0) === (lev.dnum | 0)
        && (s.dlevel | 0) === (lev.dlevel | 0));
}

/**
 * C ref: pray.c fry_by_god — lightning or disintegration death.
 * @param {number} resp_god
 * @param {boolean} via_disintegration
 */
async function fry_by_god(resp_god, via_disintegration) {
    await pline(
        `You ${!via_disintegration
            ? 'fry to a crisp'
            : 'disintegrate into a pile of dust'}!`,
    );
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.format = KILLED_BY;
    game.killer.name = `the wrath of ${align_gname(game.urole, resp_god)}`;
    await done(DIED);
}

/**
 * C ref: pray.c god_zaps_you — lightning then disintegration wrath.
 * Branch envelope: swallow elec/disint on ustuck; Reflecting / Shock /
 * fry; armor strip via disintegrate_arm; Disint bask + godvoice; astral/
 * sanctum 3× summon_minion.
 * C pray.c:609-644 has no return after either fry_by_god: done(DIED)
 * returns on lifesave/wizard-decline and C falls through into the beam.
 * JS really_done returns after setting program_state.gameover, so each
 * fry arm gates continuation on that flag (mattacku `:938-950` idiom).
 * Named omissions: SetVoice (C sndprocs.h no-op without SND_LIB);
 * mcastu ureflects;
 * @param {number} resp_god
 */
export async function god_zaps_you(resp_god) {
    const u = game.u || (game.u = {});

    if (u.uswallow && u.ustuck) {
        await pline(
            'Suddenly a bolt of lightning comes down at you from the heavens!',
        );
        await pline(`It strikes ${mon_nam(u.ustuck)}!`);
        if (!resists_elec(u.ustuck)) {
            await pline(`${Monnam(u.ustuck)} fries to a crisp!`);
            await xkilled(u.ustuck, XKILL_NOMSG | XKILL_NOCONDUCT);
        } else {
            await pline(`${Monnam(u.ustuck)} seems unaffected.`);
        }
    } else {
        await pline('Suddenly, a bolt of lightning strikes you!');
        if (Reflecting()) {
            await shieldeff(u.ux, u.uy);
            if (Blind()) {
                await pline("For some reason you're unaffected.");
            } else {
                await ureflects('%s reflects from your %s.', 'It');
            }
            monstseesu(M_SEEN_REFL);
        } else if (Shock_resistance()) {
            await shieldeff(u.ux, u.uy);
            await pline('It seems not to affect you.');
            monstseesu(M_SEEN_ELEC);
            monstunseesu(M_SEEN_REFL);
        } else {
            await fry_by_god(resp_god, false);
            monstunseesu(M_SEEN_REFL | M_SEEN_ELEC);
            if (game.program_state?.gameover) return;
        }
    }

    await pline(`${align_gname(game.urole, resp_god)} is not deterred...`);
    if (u.uswallow && u.ustuck) {
        await pline(
            `A wide-angle disintegration beam aimed at you hits ${mon_nam(u.ustuck)}!`,
        );
        if (!resists_disint(u.ustuck)) {
            await pline(
                `${Monnam(u.ustuck)} disintegrates into a pile of dust!`,
            );
            await xkilled(
                u.ustuck,
                XKILL_NOMSG | XKILL_NOCORPSE | XKILL_NOCONDUCT,
            );
        } else {
            await pline(`${Monnam(u.ustuck)} seems unaffected.`);
        }
    } else {
        await pline('A wide-angle disintegration beam hits you!');

        const EReflecting = u.EReflecting | 0;
        const EDisint = u.EDisint_resistance | 0;
        if (u.uarms && !(EReflecting & W_ARMS) && !(EDisint & W_ARMS)) {
            await disintegrate_arm(u.uarms);
        }
        if (u.uarmc && !(EReflecting & W_ARMC) && !(EDisint & W_ARMC)) {
            await disintegrate_arm(u.uarmc);
        }
        if (u.uarm && !(EReflecting & W_ARM) && !(EDisint & W_ARM)
            && !u.uarmc) {
            await disintegrate_arm(u.uarm);
        }
        if (u.uarmu && !u.uarm && !u.uarmc) {
            await disintegrate_arm(u.uarmu);
        }
        if (!Disint_resistance()) {
            await fry_by_god(resp_god, true);
            monstunseesu(M_SEEN_DISINT);
        } else {
            await pline('You bask in its black glow for a minute...');
            await godvoice(resp_god, 'I believe it not!');
            monstseesu(M_SEEN_DISINT);
        }
        if (Is_astralevel(u.uz) || Is_sanctum(u.uz)) {
            // SetVoice deferred (C sndprocs.h no-op without SND_LIB)
            await verbalize('Thou cannot escape my wrath, mortal!');
            await summon_minion(resp_god, false);
            await summon_minion(resp_god, false);
            await summon_minion(resp_god, false);
            // SetVoice deferred (ditto)
            await verbalize(`Destroy ${uhim()}, my servants!`);
        }
    }
}

/**
 * C ref: pray.c desecrate_altar — dig/convert high-altar wrath.
 * Branch envelope: own-altar adjalign/ugangr; charged air + notice pline;
 * godvoice; god_zaps_you.
 * @param {boolean} highaltar
 * @param {number} altaralign
 */
export async function desecrate_altar(highaltar, altaralign) {
    const u = game.u || (game.u = {});
    if (altaralign === (u.ualign?.type ?? 0)) {
        adjalign(-20);
        u.ugangr = (u.ugangr | 0) + 5;
    }
    await You_feel('the air around you grow charged...');
    await pline(
        `Suddenly, you realize that ${align_gname(game.urole, altaralign)} has noticed you...`,
    );
    await godvoice(
        altaralign,
        `So, mortal!  You dare desecrate my ${highaltar ? 'High Temple' : 'altar'}!`,
    );
    await god_zaps_you(altaralign);
}

/**
 * C ref: pray.c gods_angry — deity voice before curse/punish/zap arms.
 * @param {number} g_align
 */
async function gods_angry(g_align) {
    await godvoice(g_align, 'Thou hast angered me.');
}

/**
 * C ref: pray.c angrygods — cases 0–8 + default god_zaps_you + ublesscnt
 * rnz(300) tail (D-0969).
 * Named omissions: SetVoice pitch (audio only, no screen/RNG surface).
 */
async function angrygods(resp_god) {
    const u = game.u || (game.u = {});
    if (Inhell()) resp_god = A_NONE;
    u.ublessed = 0;

    let maxanger;
    if (resp_god !== (u.ualign?.type ?? 0)) {
        maxanger = Math.trunc((u.ualign?.record | 0) / 2)
            + (Luck() > 0 ? -Math.trunc(Luck() / 3) : -Luck());
    } else {
        maxanger = 3 * (u.ugangr | 0)
            + ((Luck() > 0 || ((u.ualign?.record | 0) >= STRIDENT))
                ? -Math.trunc(Luck() / 3)
                : -Luck());
    }
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    // C: gy.youmonst.data->mlet == S_HUMAN ? "mortal" : "creature". C
    // youmonst.data is never NULL in play; an unset JS slot reads as human.
    const mortal = ((game.youmonst?.data?.mlet || 'S_HUMAN') === 'S_HUMAN') ? 'mortal' : 'creature';
    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await pline(
            `You feel that ${align_gname(game.urole, resp_god)} is ${
                Hallucination() ? 'bummed' : 'displeased'
            }.`,
        );
        break;
    case 2:
    case 3: {
        await godvoice(resp_god, null);
        const strayed = ((u.ualign?.record | 0) < 0)
            && resp_god === (u.ualign?.type ?? 0);
        // C: ugod_is_angry() — (u.ualign.record < 0)
        await pline(
            `"Thou ${strayed ? 'hast strayed from the path' : 'art arrogant'}, ${mortal}."`,
        );
        // C: SetVoice + verbalize("Thou must relearn thy lessons!")
        await verbalize('Thou must relearn thy lessons!');
        // C: adjattrib(A_WIS, -1, FALSE) → You_feel("foolish!") → more()
        await adjattrib(A_WIS, -1, false);
        // C: losexp((char *)0) — divine drain, drainer NULL: resists_drli
        // gate, "Goodbye level N." pline, adjabil, uexp reset (exper.c).
        await losexp(null);
        break;
    }
    case 6:
        if (!Punished()) {
            await gods_angry(resp_god);
            await punish(null);
            break;
        }
        // FALLTHROUGH — already punished → curse path
    case 4:
    case 5:
        await gods_angry(resp_god);
        if (!Blind() && !Antimagic()) {
            await pline(`${An(hcolor('black'))} glow surrounds you.`);
        }
        // C: if (rn2(2) || !attrcurse()) rndcurse();
        if (rn2(2) || !(await attrcurse())) {
            await rndcurse();
        }
        break;
    case 7:
    case 8: {
        await godvoice(resp_god, null);
        // SetVoice deferred
        const scorn = on_altar()
            && a_align(u.ux | 0, u.uy | 0) !== resp_god;
        await verbalize(`Thou durst ${scorn ? 'scorn' : 'call upon'} me?`);
        await pline(`"Then die, ${mortal}!"`);
        await summon_minion(resp_god, false);
        break;
    }
    default:
        await gods_angry(resp_god);
        await god_zaps_you(resp_god);
        break;
    }

    const new_ublesscnt = rnz(300);
    if (new_ublesscnt > (u.ublesscnt | 0)) u.ublesscnt = new_ublesscnt;
}

/** C ref: pray.c gods_upset */
async function gods_upset(g_align) {
    const u = game.u || (game.u = {});
    if (g_align === (u.ualign?.type ?? 0)) u.ugangr = (u.ugangr | 0) + 1;
    else if (u.ugangr) u.ugangr = (u.ugangr | 0) - 1;
    await angrygods(g_align);
}

/**
 * C ref: pray.c give_spell `:999–1068` — pat_on_head case-6 divine spellbook:
 * mkobj(SPBOOK_no_NOVEL) with ulevel+1 re-rolls toward unknown/unrestricted
 * (blank paper acceptable undiscovered-or-marker); 25% direct divine learning
 * via force_learn_spell unless Fresh, book discarded; else observe + makeknown
 * (blank or 1%) + bless + at_your_feet + place + newsym.
 */
async function give_spell() {
    const u = game.u || (game.u = {});
    // C: not yet known + forgotten preferred over usable; trycnt = ulevel + 1
    let trycnt = (u.ulevel | 0) + 1;
    const otmp = mkobj(SPBOOK_no_NOVEL, true);
    while (--trycnt > 0) {
        if (otmp.otyp !== SPE_BLANK_PAPER) {
            if (known_spell(otmp.otyp) <= spe_Unknown
                && !P_RESTRICTED(spell_skilltype(otmp.otyp)))
                break; // forgotten or not yet known
        } else {
            // blank paper acceptable undiscovered, or with a marker to write on
            if (!game.objects?.[SPE_BLANK_PAPER]?.oc_name_known
                || carrying(MAGIC_MARKER))
                break;
        }
        otmp.otyp = rnd_class(game.bases[SPBOOK_CLASS], SPE_BLANK_PAPER);
    }
    // C: 25% direct learning unless already well known (spe_Fresh)
    let spe_knowledge;
    if (otmp.otyp !== SPE_BLANK_PAPER && !rn2(4)
        && (spe_knowledge = known_spell(otmp.otyp)) !== spe_Fresh) {
        let spe_let;
        if ((spe_let = await force_learn_spell(otmp.otyp)) !== '\0') {
            // C OBJ_NAME(objects[otyp]): spell name, not "spellbook of <name>"
            const spe_name = objectNameStrs[otmp.otyp] || 'spell';
            if (spe_knowledge === spe_Unknown)
                await pline(`Divine knowledge of ${spe_name} fills your mind!  Spell '${spe_let}'.`);
            else
                await Your(`knowledge of spell '${spe_let}' - ${spe_name} is ${
                    spe_knowledge === spe_Forgotten ? 'restored' : 'refreshed'}.`);
        }
        obfree(otmp, null); // discard the book
    } else {
        observe_object(otmp);
        // don't set bknown
        if (otmp.otyp === SPE_BLANK_PAPER || !rn2(100))
            makeknown(otmp.otyp);
        await bless(otmp);
        await at_your_feet(upstart(ansimpleoname(otmp)));
        place_object(otmp, u.ux, u.uy);
        newsym(u.ux, u.uy);
    }
}

/**
 * C ref: pray.c pleased — successful prayer favor.
 * Branch envelope: You_feel align msg; off-altar/low-record adjalign;
 * action rn1 + STRIDENT clamp; fix_worst_trouble switch (HIT D-0920);
 * pat_on_head rn2 dispatch in C source order (cases 1, 3, 2, 4) + case-5
 * intrinsic gift-grant (D-2219) + cases 7/8 gcrownu / 6 give_spell;
 * ublesscnt rnz(350) (+udemigod kick).
 * Named omissions: moves>100000 ublesscnt incr; on_altar wrong-god early
 * return polish; SetVoice pitch on the gift verbalize (file convention).
 */
async function pleased(g_align) {
    const u = game.u || (game.u = {});
    let trouble = in_trouble();
    let pat_on_head = 0;

    const record = u.ualign?.record | 0;
    const feel = record >= DEVOUT
        ? (Hallucination() ? 'pleased as punch' : 'well-pleased')
        : record >= STRIDENT
            ? (Hallucination() ? 'ticklish' : 'pleased')
            : (Hallucination() ? 'full' : 'satisfied');
    await You_feel(`that ${align_gname(game.urole, g_align)} is ${feel}.`);

    // C: on_altar && p_aligntyp != ualign → adjalign(-1); return
    if (on_altar() && (pray_state().p_aligntyp | 0) !== (u.ualign?.type ?? 0)) {
        adjalign(-1);
        return;
    } else if (record < 2 && trouble <= 0) {
        adjalign(1);
    }

    if (!trouble && record >= DEVOUT) {
        if ((pray_state().p_trouble | 0) === 0) pat_on_head = 1;
    } else {
        // C: prayer_luck = max(Luck, -1); action = rn1(luck + altar?3+shrine:2, 1)
        const prayer_luck = Math.max(Luck(), -1);
        let action = rn1(
            prayer_luck + (on_altar() ? 3 + (on_shrine() ? 1 : 0) : 2),
            1,
        );
        if (!on_altar()) action = Math.min(action, 3);
        if (record < STRIDENT) {
            // use post-adjalign record
            const rec = u.ualign?.record | 0;
            action = (rec > 0 || !rnl(2)) ? 1 : 0;
        }

        // C: switch (min(action, 5)) — fix_worst_trouble / in_trouble loops
        let tryct = 0;
        switch (Math.min(action, 5)) {
        case 5:
            pat_on_head = 1;
            // FALLTHROUGH
        case 4:
            do {
                await fix_worst_trouble(trouble);
            } while ((trouble = in_trouble()) !== 0);
            break;
        case 3:
            await fix_worst_trouble(trouble);
            // FALLTHROUGH
        case 2:
            while ((trouble = in_trouble()) > 0 && (++tryct < 10)) {
                await fix_worst_trouble(trouble);
            }
            break;
        case 1:
            if (trouble > 0) await fix_worst_trouble(trouble);
            break;
        case 0:
            break;
        }
    }

    // C ref: pray.c:1167-1354 — pat_on_head gift switch in C source order
    // (cases 1, 3, 2, 4, 5, 7/8, 6); every arm live, no stub in a live arm.
    if (pat_on_head) {
        switch (rn2((Luck() + 6) >> 1)) {
        case 0:
            break;
        case 1: {
            // C :1170-1217 — wielded-weapon repair: erosion note + uncurse or
            // bless glow, then erosion clear; repair_buf gates the trailing msg.
            const uwep = u.uwep;
            if (uwep && (welded(uwep) || uwep.oclass === WEAPON_CLASS
                || is_weptool(uwep))) {
                let repair_buf = '';
                if ((uwep.oeroded | 0) || (uwep.oeroded2 | 0))
                    repair_buf = ` and ${otense(uwep, 'are')} now as good as new`;

                if (uwep.cursed) {
                    if (!Blind()) {
                        await pline(`${Yobjnam2(uwep, 'softly glow')} ${hcolor('amber')}${repair_buf}.`);
                        if (!game.iflags) game.iflags = {};
                        game.iflags.last_msg = PLNMSG_OBJ_GLOWS;
                    } else
                        await You_feel(`the power of ${u_gname(game.urole, u.ualign?.type)} over ${yname(uwep)}.`);
                    await uncurse(uwep);
                    uwep.bknown = 1; // ok to bypass set_bknown()
                    repair_buf = '';
                } else if (!uwep.blessed) {
                    if (!Blind()) {
                        await pline(`${Yobjnam2(uwep, 'softly glow')} with ${an(hcolor('light blue'))} aura${repair_buf}.`);
                        if (!game.iflags) game.iflags = {};
                        game.iflags.last_msg = PLNMSG_OBJ_GLOWS;
                    } else
                        await You_feel(`the blessing of ${u_gname(game.urole, u.ualign?.type)} over ${yname(uwep)}.`);
                    await bless(uwep);
                    uwep.bknown = 1; // ok to bypass set_bknown()
                    repair_buf = '';
                }

                // fix rust/burn/rot, but don't protect against future damage
                if ((uwep.oeroded | 0) || (uwep.oeroded2 | 0)) {
                    uwep.oeroded = uwep.oeroded2 = 0;
                    // only when no bless/uncurse message already given
                    if (repair_buf)
                        await pline(`${Yobjnam2(uwep, Blind() ? 'feel' : 'look')} as good as new!`);
                }
                update_inventory();
            }
            break;
        }
        case 3:
            // C :1218-1245 — Castle tune hints (skipped once past the Valley
            // or with the drawbridge solved); else FALLTHROUGH to the heal.
            if (!u.uevent?.uopened_dbridge && !u.uevent?.gehennom_entered) {
                if (!u.uevent) u.uevent = {};
                if ((u.uevent.uheard_tune | 0) < 1) {
                    await godvoice(g_align, null);
                    // C SetVoice(0, 0, 80, voice_deity) — pitch deferred
                    await verbalize(`Hark, ${is_human(game.youmonst?.data) ? 'mortal' : 'creature'}!`);
                    // C SetVoice — pitch deferred
                    await verbalize('To enter the castle, thou must play the right tune!');
                    u.uevent.uheard_tune = (u.uevent.uheard_tune | 0) + 1;
                    break;
                } else if ((u.uevent.uheard_tune | 0) < 2) {
                    Soundeffect(se_divine_music, 50);
                    await You_hear('a divine music...');
                    await pline(`It sounds like:  "${game.tune || ''}".`);
                    u.uevent.uheard_tune = (u.uevent.uheard_tune | 0) + 1;
                    record_achievement(ACH_TUNE);
                    break;
                }
            }
            // FALLTHROUGH
            /*FALLTHRU*/
        case 2:
            // C :1246-1282 — golden-glow heal: lost levels treated like
            // blessed full healing, else +5 max HP; STR restored; hunger,
            // luck, cream and blindness reset.
            if (!Blind())
                await You(`are surrounded by ${an(hcolor('golden'))} glow.`);
            if ((u.ulevel | 0) < (u.ulevelmax | 0)) {
                u.ulevelmax = (u.ulevelmax | 0) - 1; // see potion.c
                await pluslvl(false);
            } else {
                u.uhpmax = (u.uhpmax | 0) + 5;
                if (u.uhpmax > (u.uhppeak | 0))
                    u.uhppeak = u.uhpmax;
                if (Upolyd(u))
                    u.mhmax = (u.mhmax | 0) + 5;
            }
            u.uhp = u.uhpmax;
            if (Upolyd(u))
                u.mh = u.mhmax;
            if (((u.acurr?.a?.[A_STR]) | 0) < ((u.amax?.a?.[A_STR]) | 0)) {
                if (!u.acurr) u.acurr = { a: [] };
                if (!u.acurr.a) u.acurr.a = [];
                u.acurr.a[A_STR] = u.amax.a[A_STR] | 0;
                game.flags.botl = true; // before potential message
                await encumber_msg();
            }
            if ((u.uhunger | 0) < 900)
                await init_uhunger();
            if ((u.uluck | 0) < 0)
                u.uluck = 0;
            // superfluous when blinded (that is trouble, not pat_on_head)
            u.ucreamed = 0;
            await make_blinded(0, true);
            game.flags.botl = true;
            break;
        case 4: {
            // C :1283-1309 — uncurse carried invent (Helm of Opposite
            // Alignment excepted, as in worst_cursed_item).
            let any = 0;
            if (Blind())
                await You_feel(`the power of ${u_gname(game.urole, u.ualign?.type)}.`);
            else
                await You(`are surrounded by ${an(hcolor('light blue'))} aura.`);
            for (const otmp of [...(game.invent || [])]) {
                if (otmp.cursed
                    && (otmp !== u.uarmh
                        || (u.uarmh?.otyp | 0) !== HELM_OF_OPPOSITE_ALIGNMENT)) {
                    if (!Blind()) {
                        await pline(`${Yobjnam2(otmp, 'softly glow')} ${hcolor('amber')}.`);
                        if (!game.iflags) game.iflags = {};
                        game.iflags.last_msg = PLNMSG_OBJ_GLOWS;
                        otmp.bknown = 1; // ok to bypass set_bknown()
                        ++any;
                    }
                    await uncurse(otmp);
                }
            }
            if (any)
                update_inventory();
            break;
        }
        case 5: {
            // C: static msg[] = "\"and thus I grant thee the gift of %s!\""
            await godvoice(u.ualign?.type | 0, 'Thou hast pleased me with thy progress,');
            if (!((u.HTelepat | 0) & INTRINSIC)) {
                u.HTelepat = (u.HTelepat | 0) | FROMOUTSIDE;
                await pline('"and thus I grant thee the gift of Telepathy!"');
                if (Blind()) see_monsters();
            } else if (!((u.HFast | 0) & INTRINSIC)) {
                u.HFast = (u.HFast | 0) | FROMOUTSIDE;
                await pline('"and thus I grant thee the gift of Speed!"');
            } else if (!((u.HStealth | 0) & INTRINSIC)) {
                u.HStealth = (u.HStealth | 0) | FROMOUTSIDE;
                await pline('"and thus I grant thee the gift of Stealth!"');
            } else {
                if (!((u.HProtection | 0) & INTRINSIC)) {
                    u.HProtection = (u.HProtection | 0) | FROMOUTSIDE;
                    if (!(u.ublessed | 0)) u.ublessed = rn1(3, 2);
                } else u.ublessed = (u.ublessed | 0) + 1;
                await pline('"and thus I grant thee the gift of my protection!"');
            }
            // SetVoice pitch deferred (file convention)
            await verbalize('Use it wisely in my name!');
            break;
        }
        case 7:
        case 8:
            // C :1340-1347 — crowning when PIOUS and not yet crowned; else
            // FALLTHROUGH to the spell gift.
            if ((u.ualign?.record | 0) >= PIOUS && !u.uevent?.uhand_of_elbereth) {
                await gcrownu();
                break;
            }
            // FALLTHROUGH
            /*FALLTHRU*/
        case 6:
            // C :1348-1350 — divine spellbook / direct spell learning.
            await give_spell();
            break;
        default:
            await impossible('Confused deity!');
            break;
        }
    }
    u.ublesscnt = rnz(350);
    let kick_on_butt = u.uevent?.udemigod ? 1 : 0;
    if (u.uevent?.uhand_of_elbereth) kick_on_butt++;
    if (kick_on_butt) u.ublesscnt += kick_on_butt * rnz(1000);
}

/** C ref: pline.c Your — prefix "Your " (file-local like artifact.js/zap.js). */
async function Your(rest) {
    await pline(`Your ${rest}`);
}

/**
 * C ref: pray.c at_your_feet `:788–802` — helper printing "str appears at
 * your feet": Blind sees Something; swallowed drops into the swallower's
 * stomach; else beneath/at + feet.
 * @param {string} str
 */
export async function at_your_feet(str) {
    const u = game.u || {};
    if (Blind()) str = Something;
    if (u.uswallow) {
        // barrier between you and the floor
        await pline(
            `${str} ${vtense(str, 'drop')} into ${s_suffix(mon_nam(u.ustuck))} ${mbodypart(u.ustuck, STOMACH)}.`,
        );
    } else {
        await pline(
            `${str} ${vtense(str, Blind() ? 'land' : 'appear')} ${u.Levitation ? 'beneath' : 'at'} your ${makeplural(body_part(FOOT))}!`,
        );
    }
}

/**
 * C ref: pray.c gcrownu `:805–996` — crowning for high-devotion prayer:
 * outside intrinsics + godvoice; wizard/monk class-gift spellbook;
 * lawful Hand of Elbereth / neutral Vorpal Blade / chaotic Stormbringer
 * (wielded bless, Excalibur transform, or floor gift); weapon enhance;
 * extra skill slot via add_weapon_skill(1).
 * Wired in pleased pat_on_head cases 7/8 (record >= PIOUS, uncrowned).
 * Named omissions: SetVoice pitch; objnam.c actualoname (override_ID +
 * xname inline; minimal_xname has no JS export).
 */
export async function gcrownu() {
    const u = game.u || (game.u = {});
    if (!u.uevent) u.uevent = {};
    // C: ok_wep(o) ((o) && ((o)->oclass == WEAPON_CLASS || is_weptool(o)))
    const ok_wep = (o) => !!(o && (o.oclass === WEAPON_CLASS || is_weptool(o)));

    u.HSee_invisible = (u.HSee_invisible | 0) | FROMOUTSIDE;
    u.HFire_resistance = (u.HFire_resistance | 0) | FROMOUTSIDE;
    u.HCold_resistance = (u.HCold_resistance | 0) | FROMOUTSIDE;
    u.HShock_resistance = (u.HShock_resistance | 0) | FROMOUTSIDE;
    u.HSleep_resistance = (u.HSleep_resistance | 0) | FROMOUTSIDE;
    u.HPoison_resistance = (u.HPoison_resistance | 0) | FROMOUTSIDE;
    await godvoice(u.ualign?.type | 0, null);

    let class_gift = STRANGE_OBJECT;
    // 3.3.[01] had this in the A_NEUTRAL case,
    // preventing chaotic wizards from receiving a spellbook
    if (Role_if(PM_WIZARD)
        && !u_wield_art(ART_VORPAL_BLADE)
        && !u_wield_art(ART_STORMBRINGER)
        && !carrying(SPE_FINGER_OF_DEATH)) {
        class_gift = SPE_FINGER_OF_DEATH;
    } else if (Role_if(PM_MONK) && (!u.uwep || !u.uwep.oartifact)
        && !carrying(SPE_RESTORE_ABILITY)) {
        // monks rarely wield a weapon
        class_gift = SPE_RESTORE_ABILITY;
    }

    let obj = ok_wep(u.uwep) ? u.uwep : null;
    let already_exists = false;
    let in_hand = false;
    switch (u.ualign?.type | 0) {
    case A_LAWFUL:
        u.uevent.uhand_of_elbereth = 1;
        // C: SetVoice(0, 0, 80, voice_deity) — pitch deferred
        await verbalize('I crown thee...  The Hand of Elbereth!');
        livelog_printf(
            LL_DIVINEGIFT,
            'was crowned "The Hand of Elbereth" by %s',
            u_gname(game.urole, u.ualign?.type),
        );
        break;
    case A_NEUTRAL:
        u.uevent.uhand_of_elbereth = 2;
        in_hand = u_wield_art(ART_VORPAL_BLADE);
        already_exists = exist_artifact(LONG_SWORD, artiname(ART_VORPAL_BLADE));
        // C: SetVoice — pitch deferred
        await verbalize('Thou shalt be my Envoy of Balance!');
        livelog_printf(
            LL_DIVINEGIFT,
            'became %s Envoy of Balance',
            s_suffix(u_gname(game.urole, u.ualign?.type)),
        );
        break;
    case A_CHAOTIC:
        u.uevent.uhand_of_elbereth = 3;
        in_hand = u_wield_art(ART_STORMBRINGER);
        already_exists = exist_artifact(RUNESWORD, artiname(ART_STORMBRINGER));
        {
            const what = (((already_exists && !in_hand) || class_gift !== STRANGE_OBJECT)
                ? 'take lives'
                : 'steal souls');
            // C: SetVoice — pitch deferred
            await verbalize(`Thou art chosen to ${what} for My Glory!`);
            livelog_printf(
                LL_DIVINEGIFT,
                'was chosen to %s for the Glory of %s',
                what,
                u_gname(game.urole, u.ualign?.type),
            );
        }
        break;
    }

    if ((game.objects?.[class_gift]?.oc_class | 0) === SPBOOK_CLASS) {
        let bbuf;
        obj = mksobj(class_gift, true, false);
        // get book type before dropping (don't think that could destroy
        // the book because we need to be on an altar in order to become
        // crowned, but be paranoid about it)
        // C: Strcpy(bbuf, actualoname(obj)) — objnam.c:2490 override_ID +
        // minimal_xname; xname under override_ID is the live equivalent.
        if (!game.iflags) game.iflags = {};
        const savedID = game.iflags.override_ID | 0;
        game.iflags.override_ID = 1;
        try {
            bbuf = xname(obj);
        } finally {
            game.iflags.override_ID = savedID;
        }
        bless(obj);
        obj.bknown = 1; // ok to skip set_bknown()
        observe_object(obj);
        await at_your_feet(upstart(ansimpleoname(obj)));
        await dropy(obj);
        u.ugifts = (u.ugifts | 0) + 1;
        // not an artifact, but treat like one for this situation;
        // classify as a spoiler in case player hasn't IDed the book yet
        livelog_printf(
            LL_DIVINEGIFT | LL_ARTIFACT | LL_SPOILER,
            'was bestowed with %s',
            bbuf,
        );

        // when getting a new book for known spell, enhance
        // currently wielded weapon rather than the book
        if (known_spell(class_gift) !== spe_Unknown && ok_wep(u.uwep)) {
            obj = u.uwep; // to be blessed,&c
        }
    }

    switch (u.ualign?.type | 0) {
    case A_LAWFUL:
        if (class_gift !== STRANGE_OBJECT) {
            // already got bonus above
        } else if (obj && (obj.otyp | 0) === LONG_SWORD && !obj.oartifact) {
            const lbuf = simpleonames(obj); // before transformation
            if (!Blind()) {
                await Your('sword shines brightly for a moment.');
            }
            obj = oname(obj, artiname(ART_EXCALIBUR), ONAME_GIFT | ONAME_KNOW_ARTI);
            if (is_art(obj, ART_EXCALIBUR)) {
                u.ugifts = (u.ugifts | 0) + 1;
                livelog_printf(
                    LL_DIVINEGIFT | LL_ARTIFACT,
                    'had %s wielded %s transformed into %s',
                    uhis(),
                    lbuf,
                    artiname(ART_EXCALIBUR),
                );
            }
        }
        // acquire Excalibur's skill regardless of weapon or gift
        unrestrict_weapon_skill(P_LONG_SWORD);
        if (is_art(obj, ART_EXCALIBUR)) discover_artifact(ART_EXCALIBUR);
        break;
    case A_NEUTRAL:
        if (class_gift !== STRANGE_OBJECT) {
            // already got bonus above
        } else if (obj && in_hand) {
            await Your(`${xname(obj)} goes snicker-snack!`);
            observe_object(obj);
        } else if (!already_exists) {
            obj = mksobj(LONG_SWORD, false, false);
            obj = oname(obj, artiname(ART_VORPAL_BLADE), ONAME_GIFT | ONAME_KNOW_ARTI);
            obj.spe = 1;
            await at_your_feet('A sword');
            await dropy(obj);
            u.ugifts = (u.ugifts | 0) + 1;
            livelog_printf(
                LL_DIVINEGIFT | LL_ARTIFACT,
                'was bestowed with %s',
                artiname(ART_VORPAL_BLADE),
            );
        }
        // acquire Vorpal Blade's skill regardless of weapon or gift
        unrestrict_weapon_skill(P_LONG_SWORD);
        if (is_art(obj, ART_VORPAL_BLADE)) discover_artifact(ART_VORPAL_BLADE);
        break;
    case A_CHAOTIC: {
        const swordbuf = `${hcolor('black')} sword`;
        if (class_gift !== STRANGE_OBJECT) {
            // already got bonus above
        } else if (obj && in_hand) {
            await Your(`${swordbuf} hums ominously!`);
            observe_object(obj);
        } else if (!already_exists) {
            obj = mksobj(RUNESWORD, false, false);
            obj = oname(obj, artiname(ART_STORMBRINGER), ONAME_GIFT | ONAME_KNOW_ARTI);
            obj.spe = 1;
            await at_your_feet(An(swordbuf));
            await dropy(obj);
            u.ugifts = (u.ugifts | 0) + 1;
            livelog_printf(
                LL_DIVINEGIFT | LL_ARTIFACT,
                'was bestowed with %s',
                artiname(ART_STORMBRINGER),
            );
        }
        // acquire Stormbringer's skill regardless of weapon or gift
        unrestrict_weapon_skill(P_BROAD_SWORD);
        if (is_art(obj, ART_STORMBRINGER)) discover_artifact(ART_STORMBRINGER);
        break;
    }
    default:
        obj = null; // lint
        break;
    }

    // enhance weapon regardless of alignment or artifact status
    if (ok_wep(obj)) {
        bless(obj);
        obj.oeroded = 0;
        obj.oeroded2 = 0;
        obj.oerodeproof = 1;
        obj.bknown = 1; // ok to skip set_bknown()
        obj.rknown = 1;
        if ((obj.spe | 0) < 1) obj.spe = 1;
        // acquire skill in this weapon
        unrestrict_weapon_skill(weapon_type(obj));
    } else if (class_gift === STRANGE_OBJECT) {
        // opportunity knocked, but there was nobody home...
        await You_feel('unworthy.');
    }
    update_inventory();

    // lastly, confer an extra skill slot/credit beyond the
    // up-to-29 you can get from gaining experience levels
    await add_weapon_skill(1);
}

/**
 * C ref: pray.c pray_revive :2177-2195 — scan the hero's square for the
 * first CORPSE/STATUE with a tame non-minion omonst; CORPSE →
 * revive(otmp, TRUE), STATUE → animate_statue(ANIMATE_SPELL).
 * @returns {Promise<boolean>}
 */
async function pray_revive() {
    const u = game.u || (game.u = {});
    let found = null;
    for (let otmp = objects_at(u.ux, u.uy); otmp; otmp = otmp.nexthere) {
        if ((otmp.otyp === CORPSE || otmp.otyp === STATUE)
            && has_omonst(otmp)
            && OMONST(otmp)?.mtame && !OMONST(otmp)?.isminion) {
            found = otmp;
            break;
        }
    }
    if (!found) return false;
    if (found.otyp === CORPSE) return (await revive(found, true)) !== null;
    return (await animate_statue(found, u.ux, u.uy, ANIMATE_SPELL, null)) !== null;
}

/**
 * C ref: pray.c prayer_done — afternmv after nomul(-3).
 * Ported: p_type -2 (diabolical laughter + wake_nearby + adjalign(-2) +
 * exercise WIS; Inhell falls through to the Gehennom gate) + p_type -1
 * (undead godvoice + You_feel + rehumanize + rnd(20) losehp + exercise
 * CON) (pray.c:2283-2305); p_type 0 (too soon) full path; p_type 1/2
 * water_prayer/angrygods/pleased arms; p_type 3 coaligned pray_revive +
 * water_prayer(TRUE) + pleased; Inhell Gehennom gate + rnl(record)
 * angrygods (pray.c:2307-2313).
 */
export async function prayer_done() {
    const u = game.u || (game.u = {});
    const gp = pray_state();
    const alignment = gp.p_aligntyp;
    u.uinvulnerable = false;

    if (gp.p_type === -2) {
        // C pray.c:2283-2295 — praying at an unaligned altar; Inhell
        // falls through to the regular Gehennom result below.
        const Deaf = !!(u.Deaf || u.HDeaf || u.EDeaf || u.uroleplay?.deaf);
        await pline(`You ${!Deaf ? 'hear' : 'intuit'} diabolical laughter all around you...`);
        await wake_nearby(false);
        adjalign(-2);
        exercise(A_WIS, false);
        if (!Inhell()) {
            await pline('Nothing else happens.');
            return 1;
        }
    } else if (gp.p_type === -1) {
        // C pray.c:2296-2305 — poly'd undead praying to a non-chaotic god.
        await godvoice(alignment, alignment === A_LAWFUL
            ? 'Vile creature, thou durst call upon me?'
            : 'Walk no more, perversion of nature!');
        await You_feel('like you are falling apart.');
        await rehumanize();
        losehp(rnd(20), 'residual undead turning effect', KILLED_BY_AN);
        await finish_maybe_wail();
        exercise(A_CON, false);
        return 1;
    }
    if (Inhell()) {
        await pline(
            `Since you are in Gehennom, ${align_gname(game.urole, alignment)} can't help you.`,
        );
        // C pray.c:2310-2312 haltingly aligned least likely to anger
        if (((u.ualign?.record | 0) <= 0) || rnl(u.ualign?.record | 0))
            await angrygods(u.ualign?.type ?? 0);
        return 0;
    }

    if (gp.p_type === 0) {
        if (on_altar() && (u.ualign?.type ?? 0) !== alignment) {
            water_prayer(false);
        }
        u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
        change_luck(-3);
        await gods_upset(u.ualign?.type ?? 0);
    } else if (gp.p_type === 1) {
        if (on_altar() && (u.ualign?.type ?? 0) !== alignment) {
            water_prayer(false);
        }
        await angrygods(u.ualign?.type ?? 0);
    } else if (gp.p_type === 2) {
        if (water_prayer(false)) {
            u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
            change_luck(-3);
            await gods_upset(u.ualign?.type ?? 0);
        } else {
            await pleased(alignment);
        }
    } else {
        // C pray.c:2336-2340 — coaligned: revive a tame corpse/statue,
        // bless water, then please the god.
        if (on_altar()) {
            await pray_revive();
            water_prayer(true);
        }
        await pleased(alignment);
    }
    return 1;
}

/**
 * C ref: pray.c dopray — #pray
 * ParanoidPray (default) → paranoid_query(ParanoidConfirm, …);
 * Confirm bit → getlin "yes"; else yn (D-1000).
 * wizard Force-the-gods (D-0517) → may raise p_type to 3 + clear
 * ublesscnt so uinvulnerable gates gethungry during nomul(-3).
 */
export async function dopray() {
    const u = game.u || (game.u = {});
    // C: flags.paranoia_bits defaults include PARANOID_PRAY
    const bits = game.flags?.paranoia_bits;
    const paranoidPray = bits == null
        ? true
        : (bits & PARANOID_PRAY) !== 0;
    if (paranoidPray) {
        // C: paranoid_query(ParanoidConfirm, "Are you sure…")
        const ParanoidConfirm = bits == null
            ? false
            : (bits & PARANOID_CONFIRM) !== 0;
        const ok = await paranoid_query(
            ParanoidConfirm,
            'Are you sure you want to pray?',
        );
        if (!ok) return ECMD_OK;
    }

    if (!u.uconduct) u.uconduct = {};
    // C: if (!u.uconduct.gnostic++) livelog_printf(...)
    if (!(u.uconduct.gnostic | 0)) {
        u.uconduct.gnostic = 1;
        livelog_printf(LL_CONDUCT, 'rejected atheism with a prayer');
    } else {
        u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;
    }

    if (!(await can_pray(true))) return ECMD_OK;

    const gp = pray_state();
    // C: if (wizard && gp.p_type >= 0) Force the gods to be pleased?
    const wizard = !!(game.flags?.debug || game.flags?.wizard);
    if (wizard && (gp.p_type | 0) >= 0) {
        // C: YN() when ParanoidPray (no do-again); else y_n() — both yn/'n'
        const forceOk = (await yn_function(
            'Force the gods to be pleased?', 'yn', 'n',
        )) === 'y';
        if (forceOk) {
            u.ublesscnt = 0;
            if ((u.uluck | 0) < 0) u.uluck = 0;
            if (!u.ualign) u.ualign = { type: 0, record: 0 };
            if ((u.ualign.record | 0) <= 0) u.ualign.record = 1;
            u.ugangr = 0;
            if ((gp.p_type | 0) < 2) gp.p_type = 3;
        }
    }

    nomul(-3);
    game.multi_reason = 'praying';
    game.nomovemsg = 'You finish your prayer.';
    game.afternmv = prayer_done;

    if (gp.p_type === 3 && !Inhell()) {
        if (!Blind()) {
            await pline('You are surrounded by a shimmering light.');
        }
        u.uinvulnerable = true;
    }

    return ECMD_TIME;
}

/** C: pray.c ugod_is_angry — (u.ualign.record < 0). */
function ugod_is_angry() {
    return ((game.u?.ualign?.record | 0) < 0);
}

/**
 * C ref: pray.c a_gname_at `:2513–2520` (extern.h:2570 — shared, not static;
 * priest.c ghod_hitsu calls it; this export is the canonical home, D-2474).
 * @param {number} x
 * @param {number} y
 */
export function a_gname_at(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_ALTAR(loc.typ)) return '';
    return align_gname(game.urole, a_align(x, y));
}

/** C ref: pray.c a_gname `:2506–2510`. */
function a_gname() {
    const u = game.u || {};
    return a_gname_at(u.ux | 0, u.uy | 0);
}

/**
 * C ref: pray.c sacrifice_value `:1838–1850`.
 * Acid blob or corpse age ≤ 50 (iced peek) → difficulty+1, maybe eaten_stat.
 */
function sacrifice_value(otmp) {
    let value = 0;
    const corpsenm = otmp.corpsenm | 0;
    if (corpsenm === PM_ACID_BLOB
        || ((game.moves | 0) <= (peek_at_iced_corpse_age(otmp) + 50))) {
        value = (mons(corpsenm)?.difficulty | 0) + 1;
        if (otmp.oeaten) value = eaten_stat(value, otmp);
    }
    return value;
}

/**
 * C ref: pray.c eval_offering `:1898–1956`.
 * Undead / unicorn bonuses; same-align unicorn is an insult (−1).
 */
async function eval_offering(otmp, altaralign) {
    let value = sacrifice_value(otmp);
    if (!value) return 0;

    const ptr = mons(otmp.corpsenm);
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };

    if (mon_is_undead(ptr)) {
        if ((u.ualign.type | 0) !== A_CHAOTIC
            || ((ptr?.mndx | 0) === PM_WRAITH
                && (u.uconduct?.unvegetarian | 0))) {
            value += 1;
        }
    } else if (is_unicorn(ptr)) {
        const mal = ptr.maligntyp | 0;
        const unicalign = mal > 0 ? 1 : mal < 0 ? -1 : 0;
        if (unicalign === altaralign) {
            await pline(
                `Such an action is an insult to ${
                    unicalign === A_CHAOTIC ? 'chaos'
                        : unicalign ? 'law' : 'balance'
                }!`,
            );
            await adjattrib(A_WIS, -1, true);
            return -1;
        } else if ((u.ualign.type | 0) === altaralign) {
            if ((u.ualign.record | 0) < ALIGNLIM()) {
                await You_feel(`appropriately ${align_str(u.ualign.type)}.`);
            } else {
                await You_feel('you are thoroughly on the right path.');
            }
            adjalign(5);
            value += 3;
        } else if (unicalign === (u.ualign.type | 0)) {
            u.ualign.record = -1;
            value = 1;
        } else {
            value += 3;
        }
    }
    return value;
}

/**
 * C ref: pray.c consume_offering `:1445–1475`.
 * Hallu rn2(3); Blind lawful disappear; else flash/plume/flame.
 */
async function consume_offering(otmp) {
    const u = game.u || {};
    const atype = u.ualign?.type ?? 0;
    if (Hallucination()) {
        switch (rn2(3)) {
        case 0:
            await pline(
                'Your sacrifice sprouts wings and a propeller and roars away!',
            );
            break;
        case 1:
            await pline(
                'Your sacrifice puffs up, swelling bigger and bigger, and pops!',
            );
            break;
        default:
            await pline(
                'Your sacrifice collapses into a cloud of dancing particles and fades away!',
            );
            break;
        }
    } else if (Blind() && atype === A_LAWFUL) {
        await pline('Your sacrifice disappears!');
    } else {
        const how = atype === A_LAWFUL
            ? 'flash of light'
            : atype === A_NEUTRAL
                ? 'plume of smoke'
                : 'burst of flame';
        await pline(`Your sacrifice is consumed in a ${how}!`);
    }
    if (carried(otmp)) useup(otmp);
    else useupf(otmp, 1);
    exercise(A_WIS, true);
}

/**
 * C ref: pray.c offer_negative_valued `:1591–1599`.
 */
async function offer_negative_valued(highaltar, altaralign) {
    const u = game.u || {};
    if (altaralign !== (u.ualign?.type ?? 0) && highaltar) {
        await desecrate_altar(highaltar, altaralign);
    } else {
        await gods_upset(altaralign);
    }
}

/**
 * C ref: pray.c sacrifice_your_race `:1697–1778`.
 * Same-race corpse: demon satisfaction / infamous offense; high-altar
 * desecrate; stain or vanish altar (either angers the priest); dlord summon.
 */
async function sacrifice_your_race(otmp, highaltar, altaralign) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    const youData = game.youmonst?.data;

    if (mon_is_demon(youData)) {
        await pline('You find the idea very satisfying.');
        exercise(A_WIS, true);
    } else if ((u.ualign.type | 0) !== A_CHAOTIC) {
        await pline("You'll regret this infamous offense!");
        exercise(A_WIS, false);
    }

    if (highaltar
        && (altaralign !== A_CHAOTIC || (u.ualign.type | 0) !== A_CHAOTIC)) {
        await desecrate_altar(highaltar, altaralign);
        return;
    } else if (altaralign !== A_CHAOTIC && altaralign !== A_NONE) {
        await pline(
            `The altar is stained with ${game.urace?.adj || 'your'} blood.`,
        );
        const loc = game.level?.at(u.ux, u.uy);
        if (loc) {
            loc.altarmask = AM_CHAOTIC;
            loc.flags = AM_CHAOTIC;
        }
        newsym(u.ux | 0, u.uy | 0);
        await angry_priest();
    } else {
        let demonless_msg;
        if (altaralign === A_CHAOTIC && (u.ualign.type | 0) !== A_CHAOTIC) {
            await pline(
                `The blood floods the altar, which vanishes in ${an(hcolor('black'))} cloud!`,
            );
            const loc = game.level?.at(u.ux, u.uy);
            if (loc) {
                loc.typ = ROOM;
                loc.altarmask = 0;
                loc.flags = 0;
            }
            newsym(u.ux | 0, u.uy | 0);
            await angry_priest();
            demonless_msg = 'cloud dissipates';
        } else {
            await pline('The blood covers the altar!');
            change_luck(altaralign === A_NONE ? -2 : 2);
            demonless_msg = 'blood coagulates';
        }
        const pm = dlord(altaralign);
        const dmon = (pm !== NON_PM)
            ? makemon(mons(pm), u.ux | 0, u.uy | 0, MM_NOMSG)
            : null;
        if (dmon) {
            let dbuf = a_monnam(dmon);
            if (!dbuf || dbuf.toLowerCase() === 'it') {
                dbuf = 'something dreadful';
            } else {
                dmon.mstrategy = (dmon.mstrategy | 0) & ~STRAT_APPEARMSG;
            }
            await pline(`You have summoned ${dbuf}!`);
            const ua = u.ualign.type | 0;
            const mal = dmon.data?.maligntyp | 0;
            const sgnU = ua > 0 ? 1 : ua < 0 ? -1 : 0;
            const sgnM = mal > 0 ? 1 : mal < 0 ? -1 : 0;
            if (sgnU === sgnM) dmon.mpeaceful = true;
            await pline('You are terrified, and unable to move.');
            nomul(-3);
            game.multi_reason = 'being terrified of a demon';
            game.nomovemsg = null;
        } else {
            await pline(`The ${demonless_msg}.`);
        }
    }

    if ((u.ualign.type | 0) !== A_CHAOTIC) {
        adjalign(-5);
        u.ugangr = (u.ugangr | 0) + 3;
        await adjattrib(A_WIS, -1, true);
        if (!Inhell()) await angrygods(u.ualign.type);
        change_luck(-5);
    } else {
        adjalign(5);
    }
    if (carried(otmp)) useup(otmp);
    else useupf(otmp, 1);
}

/**
 * C ref: pray.c offer_different_alignment_altar `:1630–1695`.
 * Cross-align sacrifice: angry-god conversion (uchangealign) or
 * rejection (ugangr/adjalign/godvoice/luck/adjattrib/angrygods);
 * else consume + conflict sense, rn2-gated altar conversion glow
 * (altarmask + shrine bit + newsym + summon + priest anger) or
 * power-decrease (conversion glow angers a non-coaligned priest).
 */
async function offer_different_alignment_altar(otmp, altaralign) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    const atype = u.ualign.type | 0;
    /* Is this a conversion ? */
    /* An unaligned altar in Gehennom will always elicit rejection. */
    if (ugod_is_angry() || (altaralign === A_NONE && Inhell())) {
        const baseCur = u.ualignbase?.current ?? atype;
        const baseOrig = u.ualignbase?.original ?? atype;
        if (baseCur === baseOrig && altaralign !== A_NONE) {
            await pline(
                `You have a strong feeling that ${
                    u_gname(game.urole, atype)
                } is angry...`,
            );
            await consume_offering(otmp);
            await pline(`${a_gname()} accepts your allegiance.`);

            await uchangealign(altaralign, A_CG_CONVERT);
            /* Beware, Conversion is costly */
            change_luck(-3);
            u.ublesscnt = (u.ublesscnt | 0) + 300;
        } else {
            u.ugangr = (u.ugangr | 0) + 3;
            adjalign(-5);
            await pline(`${a_gname()} rejects your sacrifice!`);
            await godvoice(altaralign, 'Suffer, infidel!');
            change_luck(-5);
            await adjattrib(A_WIS, -2, true);
            if (!Inhell()) await angrygods(u.ualign.type);
        }
    } else {
        await consume_offering(otmp);
        await pline(
            `You sense a conflict between ${
                u_gname(game.urole, u.ualign.type)
            } and ${a_gname()}.`,
        );
        if (rn2(8 + (u.ulevel | 0)) > 5) {
            await You_feel(
                `the power of ${u_gname(game.urole, u.ualign.type)} increase.`,
            );
            exercise(A_WIS, true);
            change_luck(1);
            const shrine = on_shrine();
            const loc = game.level?.at(u.ux, u.uy);
            if (loc) {
                loc.altarmask = Align2amask(u.ualign.type);
                if (shrine) loc.altarmask |= AM_SHRINE;
            }
            newsym(u.ux | 0, u.uy | 0); /* in case Invisible to self */
            if (!Blind()) {
                await pline(
                    `The altar glows ${
                        hcolor(
                            atype === A_LAWFUL
                                ? 'white'
                                : atype
                                    ? 'black'
                                    : 'gray',
                        )
                    }.`,
                );
            }

            if (rnl(u.ulevel | 0) > 6 && (u.ualign.record | 0) > 0
                && rnd(u.ualign.record | 0) > Math.trunc((3 * ALIGNLIM()) / 4)) {
                await summon_minion(altaralign, true);
            }
            /* anger priest; test handles bones files */
            const pri = findpriest(temple_occupied(u.urooms));
            if (pri && !p_coaligned(pri)) {
                await angry_priest();
            }
        } else {
            await pline(
                `Unluckily, you feel the power of ${
                    u_gname(game.urole, u.ualign.type)
                } decrease.`,
            );
            change_luck(-1);
            exercise(A_WIS, false);
            if (rnl(u.ulevel | 0) > 6 && (u.ualign.record | 0) > 0
                && rnd(u.ualign.record | 0) > Math.trunc((7 * ALIGNLIM()) / 8)) {
                await summon_minion(altaralign, true);
            }
        }
    }
}

/**
 * C ref: pray.c bestow_artifact `:1781–1836` — sacrifice artifact gift:
 * ulevel>2 && raw uluck>=0 gate, wizard y_n vs !rn2(6+2*ugifts*nartifacts),
 * mk_artifact(NULL, a_align, max_giftvalue, TRUE) NULL-able, artifact_origin
 * GIFT|KNOW_ARTI, spe<0 clamp, uncurse, oerodeproof, Hallu/Blind buf +
 * " named <bare>" when seen, at_your_feet(upstart) + dropy + godvoice,
 * ugifts++, ublesscnt rnz(300+50*nartifacts), exercise WIS, livelog gift
 * by god, unrestrict weapon skill, seen observe + makeknown + discover.
 * @param {number} max_giftvalue
 * @returns {Promise<boolean>}
 */
async function bestow_artifact(max_giftvalue) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    const nartifacts = nartifact_exist();
    let do_bestow = (u.ulevel | 0) > 2 && (u.uluck | 0) >= 0;
    if (do_bestow) {
        const wizard = !!(game.flags?.debug || game.flags?.wizard);
        if (wizard)
            do_bestow = (await y_n('Gift an artifact?')) === 'y';
        else
            do_bestow = !rn2(6 + (2 * (u.ugifts | 0) * nartifacts));
    }

    if (do_bestow) {
        // C: mk_artifact() with NULL obj and a_align() arg can return NULL
        const otmp = mk_artifact(
            null, a_align(u.ux | 0, u.uy | 0), max_giftvalue | 0, true,
        );
        if (otmp) {
            artifact_origin(otmp, ONAME_GIFT | ONAME_KNOW_ARTI);
            if ((otmp.spe | 0) < 0) otmp.spe = 0;
            if (otmp.cursed) await uncurse(otmp);
            otmp.oerodeproof = 1;
            let buf = Hallucination() ? 'a doodad'
                : Blind() ? 'an object'
                    : ansimpleoname(otmp);
            if (!Blind()) buf += ` named ${bare_artifactname(otmp)}`;
            await at_your_feet(upstart(buf));
            await dropy(otmp);
            await godvoice(u.ualign?.type | 0, 'Use my gift wisely!');
            u.ugifts = (u.ugifts | 0) + 1;
            u.ublesscnt = rnz(300 + (50 * nartifacts));
            exercise(A_WIS, true);
            livelog_printf(
                LL_DIVINEGIFT | LL_ARTIFACT,
                'was bestowed with %s by %s',
                artiname(otmp.oartifact | 0),
                align_gname(game.urole, u.ualign?.type | 0),
            );
            // C: make sure we can use this weapon
            unrestrict_weapon_skill(weapon_type(otmp));
            if (!Hallucination() && !Blind()) {
                observe_object(otmp);
                makeknown(otmp.otyp | 0);
                discover_artifact(otmp.oartifact | 0);
            }
            return true;
        }
    }
    return false;
}

/**
 * C ref: pray.c offer_corpse `:1958–2120`.
 * Gnostic livelog; feel_cockatrice; rider revival; same-race / former
 * pet; eval_offering; cross-align offer_different_alignment_altar;
 * consume + mollify / absolve / blesscnt / bestow_artifact gift + luck.
 */
async function offer_corpse(otmp, highaltar, altaralign) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    if (!u.uconduct) u.uconduct = {};
    const MAXVALUE = 24;

    if (!(u.uconduct.gnostic | 0)) {
        u.uconduct.gnostic = 1;
        livelog_printf(
            LL_CONDUCT,
            `rejected atheism by offering ${
                corpse_xname(otmp, null, CXN_ARTICLE)
            } on an altar of ${a_gname()}`,
        );
    } else {
        u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;
    }

    await feel_cockatrice(otmp, true);
    if (await rider_corpse_revival(otmp, false)) return;

    const ptr = mons(otmp.corpsenm);
    if (your_race(ptr)) {
        await sacrifice_your_race(otmp, highaltar, altaralign);
        return;
    }
    if (has_omonst(otmp)) {
        const mtmp = get_mtraits(otmp, false);
        if (mtmp && mtmp.mtame) {
            await pline('So this is how you repay loyalty?');
            adjalign(-3);
            u.HAggravate_monster = (u.HAggravate_monster | 0) | FROMOUTSIDE;
            await offer_negative_valued(highaltar, altaralign);
            return;
        }
    }

    const value = await eval_offering(otmp, altaralign);
    if (value === 0) {
        await pline(nothing_happens);
        return;
    }
    if (value < 0) {
        await offer_negative_valued(highaltar, altaralign);
        return;
    }

    if (altaralign !== (u.ualign.type | 0) && highaltar) {
        await desecrate_altar(highaltar, altaralign);
        return;
    }
    if ((u.ualign.type | 0) !== altaralign) {
        await offer_different_alignment_altar(otmp, altaralign);
        return;
    }
    await consume_offering(otmp);
    if (u.ugangr) {
        const saved_anger = u.ugangr | 0;
        u.ugangr = saved_anger - Math.trunc(
            (value * ((u.ualign.type | 0) === A_CHAOTIC ? 2 : 3)) / MAXVALUE,
        );
        if ((u.ugangr | 0) < 0) u.ugangr = 0;
        if ((u.ugangr | 0) !== saved_anger) {
            const gnam = u_gname(game.urole, u.ualign.type);
            if (u.ugangr) {
                await pline(
                    `${gnam} seems ${Hallucination() ? 'groovy' : 'slightly mollified'}.`,
                );
                if ((u.uluck | 0) < 0) change_luck(1);
            } else {
                await pline(
                    `${gnam} seems ${
                        Hallucination()
                            ? 'cosmic (not a new fact)'
                            : 'mollified'
                    }.`,
                );
                if ((u.uluck | 0) < 0) u.uluck = 0;
            }
        } else if (Hallucination()) {
            await pline('The gods seem tall.');
        } else {
            await pline('You have a feeling of inadequacy.');
        }
    } else if (ugod_is_angry()) {
        let v = value;
        if (v > MAXVALUE) v = MAXVALUE;
        if (v > -(u.ualign.record | 0)) v = -(u.ualign.record | 0);
        adjalign(v);
        await You_feel('partially absolved.');
    } else if ((u.ublesscnt | 0) > 0) {
        const saved_cnt = u.ublesscnt | 0;
        u.ublesscnt = saved_cnt - Math.trunc(
            (value * ((u.ualign.type | 0) === A_CHAOTIC ? 500 : 300))
                / MAXVALUE,
        );
        if ((u.ublesscnt | 0) < 0) u.ublesscnt = 0;
        if ((u.ublesscnt | 0) !== saved_cnt) {
            if (u.ublesscnt) {
                if (Hallucination()) {
                    await pline(
                        'You realize that the gods are not like you and I.',
                    );
                } else {
                    await pline('You have a hopeful feeling.');
                }
                if ((u.uluck | 0) < 0) change_luck(1);
            } else {
                if (Hallucination()) {
                    await pline('Overall, there is a smell of fried onions.');
                } else {
                    await pline('You have a feeling of reconciliation.');
                }
                if ((u.uluck | 0) < 0) u.uluck = 0;
            }
        }
    } else {
        // C :2091 — sacrifice gift attempt before the luck increase.
        if (await bestow_artifact(value)) return;
        const orig_luck = u.uluck | 0;
        let luck_increase = Math.trunc((value * LUCKMAX) / (MAXVALUE * 2));
        if (orig_luck > value) luck_increase = 0;
        else if (orig_luck + luck_increase > value) {
            luck_increase = value - orig_luck;
        }
        change_luck(luck_increase);
        if ((u.uluck | 0) < 0) u.uluck = 0;
        if ((u.uluck | 0) !== orig_luck) {
            if (Blind()) {
                await pline(
                    `You think ${something} brushed your ${body_part(FOOT)}.`,
                );
            } else {
                await pline(
                    Hallucination()
                        ? `You see crabgrass at your ${makeplural(body_part(FOOT))}.  A funny thing in a dungeon.`
                        : `You glimpse a four-leaf clover at your ${makeplural(body_part(FOOT))}.`,
                );
            }
        }
    }
}

/**
 * C ref: pray.c offer_too_soon `:1478–1498` — low-altar Amulet hint.
 * Unaligned Gehennom altar → gods_upset(A_NONE); else Hallu homesick /
 * on-track surface urge / ashamed You_feel.
 */
async function offer_too_soon(altaralign) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    if (altaralign === A_NONE && Inhell()) {
        /* offering on an unaligned altar in Gehennom; hero has left
           Moloch's Sanctum (caller handles that) so is in the process
           of getting away with the Amulet */
        await gods_upset(A_NONE); /* Moloch becomes angry */
        return;
    }
    await You_feel(Hallucination()
        ? 'homesick.'
        /* if on track, give a big hint */
        : (altaralign | 0) === (u.ualign.type | 0)
            ? 'an urge to return to the surface.'
            /* else headed towards celestial disgrace */
            : 'ashamed.');
}

/**
 * C ref: pray.c offer_real_amulet `:1529–1589` — the final Test.
 * Amulet_off when worn; consume; A_NONE → Moloch death (lifesave falls
 * through to fry_by_god then ESCAPED); wrong-align → adjalign(-99) +
 * ESCAPED; own-align → ascended + adjalign(10) + ASCENDED.
 * C is NORETURN but done() can return on lifesave/wizard-decline, so
 * each done/fry arm gates continuation on program_state.gameover
 * (god_zaps_you `:1102–1104` idiom). display_nhwindow(WIN_MESSAGE)
 * is a no-op here (topline paints via pline; cf. allmain
 * init_sound_disp_gamewindows); SetVoice pitch deferred (file convention).
 */
async function offer_real_amulet(otmp, altaralign) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    if (!u.uevent) u.uevent = {};
    /* The final Test.  Did you win? */
    if (u.uamul === otmp) await Amulet_off();
    if (carried(otmp)) useup(otmp); /* well, it's gone now */
    else useupf(otmp, 1);

    await pline(`You offer the Amulet of Yendor to ${a_gname()}...`);

    if (altaralign === A_NONE) {
        /* Moloch's high altar at the bottom of Gehennom. */
        if ((u.ualign.record | 0) > -99) u.ualign.record = -99;
        await pline('An invisible choir chants, and you are bathed in darkness...');
        /*[apparently shrug/snarl can be sensed without being seen]*/
        await pline(`${MOLOCH} shrugs and retains dominion over ${u_gname(game.urole, u.ualign.type)},`);
        await pline('then mercilessly snuffs out your life.');
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = KILLED_BY;
        game.killer.name = `${s_suffix(MOLOCH)} indifference`;
        await done(DIED);
        if (game.program_state?.gameover) return;
        /* life-saved (or declined to die in wizard/explore mode) */
        await pline(`${MOLOCH} snarls and tries again...`);
        await fry_by_god(A_NONE, true); /* wrath of Moloch */
        if (game.program_state?.gameover) return;
        /* declined to die in wizard or explore mode */
        await pline(`A cloud of ${hcolor('black')} smoke surrounds you...`);
        await done(ESCAPED);
        return;
        /*NOTREACHED*/
    } else if ((u.ualign.type | 0) !== altaralign) {
        /* And the opposing team picks you up and carries you off
           on their shoulders. */
        adjalign(-99);
        await pline(`${a_gname()} accepts your gift, and gains dominion over ${u_gname(game.urole, u.ualign.type)}...`);
        await pline(`${u_gname(game.urole, u.ualign.type)} is enraged...`);
        await pline(`Fortunately, ${a_gname()} permits you to live...`);
        await pline(`A cloud of ${hcolor('orange')} smoke surrounds you...`);
        await done(ESCAPED);
        return;
        /*NOTREACHED*/
    } else {
        /* You've won the game!  Feedback-wise, it's a bit of a let down. */
        u.uevent.ascended = 1;
        adjalign(10);
        await pline('An invisible choir sings, and you are bathed in radiance...');
        await godvoice(altaralign, 'Mortal, thou hast done well!');
        // C: display_nhwindow(WIN_MESSAGE, FALSE) — no-op (see doc above).
        // C: SetVoice((struct monst *)0, 0, 80, voice_deity) — pitch deferred.
        await verbalize('In return for thy service, I grant thee the gift of Immortality!');
        await pline(`You ascend to the status of Demigod${game.flags?.female ? 'dess' : ''}...`);
        await done(ASCENDED);
        return;
        /*NOTREACHED*/
    }
    /*NOTREACHED*/
}

/**
 * C ref: pray.c offer_fake_amulet `:1601–1627` — low-altar unknown fake
 * defers to offer_too_soon; else thunderclap + unknown (boo-boo/mistake,
 * known, luck-1) / known fool-the-gods (Deaf "Oh, no.", luck-3,
 * adjalign-1, ugangr+3, offer_negative_valued) arms in C order.
 */
async function offer_fake_amulet(otmp, highaltar, altaralign) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    if (!highaltar && !otmp.known) {
        await offer_too_soon(altaralign);
        return;
    }
    Soundeffect(se_thunderclap, 100);
    await You_hear('a nearby thunderclap.');
    if (!otmp.known) {
        await pline(`You realize you have made a ${Hallucination() ? 'boo-boo' : 'mistake'}.`);
        otmp.known = 1;
        change_luck(-1);
    } else {
        /* don't you dare try to fool the gods */
        const Deaf = !!(u.Deaf || u.HDeaf || u.EDeaf || u.uroleplay?.deaf);
        if (Deaf) await pline('Oh, no.'); /* didn't hear thunderclap */
        change_luck(-3);
        adjalign(-1);
        u.ugangr = (u.ugangr | 0) + 3;
        await offer_negative_valued(highaltar, altaralign);
    }
}

/**
 * C ref: pray.c dosacrifice `#offer` `:1853–1896`.
 * Branch envelope: not-on-altar / impaired / empty floorfood → ECMD_OK;
 * CORPSE → offer_corpse (D-1678); Yendor / fake → offer_too_soon /
 * offer_real_amulet / offer_fake_amulet; TIME.
 */
export async function dosacrifice() {
    const u = game.u || {};
    if (!on_altar() || u.uswallow) {
        const prep = (u.Levitation || u.Flying) ? 'over' : 'on';
        await pline(`You are not ${prep} an altar.`);
        return ECMD_OK;
    }
    if (u.Confusion || u.Stunned) {
        await pline('You are too impaired to perform the rite.');
        return ECMD_OK;
    }
    const loc = game.level?.at(u.ux, u.uy);
    const mask = (loc && (loc.altarmask != null ? loc.altarmask : loc.flags)) | 0;
    const highaltar = !!(mask & AM_SANCTUM);
    const altaralign = a_align(u.ux | 0, u.uy | 0);

    const otmp = await floorfood('sacrifice', 1);
    if (!otmp) return ECMD_OK;
    /* C pray.c `:1874–1889` — each live otyp spends the turn. */
    if ((otmp.otyp | 0) === AMULET_OF_YENDOR) {
        if (!highaltar) {
            await offer_too_soon(altaralign);
            return ECMD_TIME;
        }
        await offer_real_amulet(otmp, altaralign);
        return ECMD_TIME; /* C NOTREACHED — done() can return on lifesave */
    } /* real Amulet */
    if ((otmp.otyp | 0) === FAKE_AMULET_OF_YENDOR) {
        await offer_fake_amulet(otmp, highaltar, altaralign);
        return ECMD_TIME;
    } /* fake Amulet */
    if ((otmp.otyp | 0) === CORPSE) {
        await offer_corpse(otmp, highaltar, altaralign);
        return ECMD_TIME;
    }
    await pline(nothing_happens);
    return ECMD_TIME;
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

/**
 * C ref: pray.c halu_gname `:2577–2619` — non-Hallu → align_gname;
 * Hallu → randrole(TRUE) pantheon pick (roles with null lgod, e.g. Priest,
 * re-rolled) + rn2_on_display_rng(9) god slot. All Hallu draws are on the
 * display stream (randrole(TRUE) ≡ rn2_on_display_rng(SIZE(roles)-1);
 * JS roles[] has no terminator entry so roles.length ≡ SIZE(roles)-1).
 * Live callers: doturn, temple_priest_sound (sounds.js).
 */
export async function halu_gname(alignment) {
    if (!Hallucination()) {
        return align_gname(game.urole, alignment);
    }
    // C: do which = randrole(TRUE); while (!roles[which].lgod);
    let which;
    do {
        which = rn2_on_display_rng(roles.length);
    } while (!roles[which]?.lgod);
    // C: static hallu_gods[] (pray.c:2558–2573).
    const hallu_gods = [
        'the Flying Spaghetti Monster',
        'Eris',
        'the Martians',
        'Xom',
        'AnDoR dRaKoN',
        'the Central Bank of Yendor',
        'Tooth Fairy',
        'Om',
        'Yawgmoth',
        'Morgoth',
        'Cthulhu',
        'the Ori',
        'destiny',
        'your Friend the Computer',
    ];
    let gnam;
    switch (rn2_on_display_rng(9)) {
    case 0:
    case 1:
        gnam = roles[which].lgod;
        break;
    case 2:
    case 3:
        gnam = roles[which].ngod;
        break;
    case 4:
    case 5:
        gnam = roles[which].cgod;
        break;
    case 6:
    case 7:
        gnam = hallu_gods[rn2_on_display_rng(hallu_gods.length)];
        break;
    case 8:
        gnam = 'Moloch'; // C: static Moloch (pray.c:58)
        break;
    default:
        await impossible('rn2 broken in halu_gname?!?');
        break;
    }
    if (!gnam) {
        await impossible('No random god name?');
        gnam = 'your Friend the Computer'; // C: Paranoia fallback
    }
    if (gnam.charAt(0) === '_') gnam = gnam.slice(1);
    return gnam;
}

/** Squared distance hero→mon (monmove.c mdistu). */
function mdistu(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy;
}

/**
 * C ref: zap.c resist — oclass '\0' → alev = ulevel (doturn uses this).
 * Named omission: TELL/NOTELL shield pline polish (RNG-identical).
 */
function resist(mtmp, _oclass, _damage, _tell) {
    const alev = game.u?.ulevel | 0;
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

function Confusion() {
    const u = game.u || {};
    return !!(u.Confusion || (u.HConfusion | 0));
}

/**
 * C ref: pray.c maybe_turn_mon_iter — #turn undead/demon victim.
 * @param {object} mtmp
 * @param {number} turn_undead_range squared bolt range
 * @param {{ cnt: number }} msgCnt shared turn_undead_msg_cnt
 */
async function maybe_turn_mon_iter(mtmp, turn_undead_range, msgCnt) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (!couldsee(mtmp.mx | 0, mtmp.my | 0)
        || mdistu(mtmp) > turn_undead_range) {
        return;
    }
    const u = game.u || {};
    const data = mtmp.data;
    if (mtmp.mpeaceful
        || !(mon_is_undead(data) || is_vampshifter(mtmp)
            || (mon_is_demon(data)
                && ((u.ulevel | 0) > Math.trunc(MAXULEV / 2))))) {
        return;
    }
    mtmp.msleeping = 0;
    if (Confusion()) {
        if (!(msgCnt.cnt++)) {
            await pline('Unfortunately, your voice falters.');
        }
        mtmp.mflee = 0;
        mtmp.mfrozen = 0;
        mtmp.mcanmove = 1;
        return;
    }
    if (resist(mtmp, '\0', 0, TELL)) return;

    let xlev = 6;
    const mlet = data?.mlet;
    // C: intentional fall-through ladder lich→zombie
    switch (mlet) {
    case 'S_LICH':
        xlev += 2;
        // falls through
    case 'S_GHOST':
        xlev += 2;
        // falls through
    case 'S_VAMPIRE':
        xlev += 2;
        // falls through
    case 'S_WRAITH':
        xlev += 2;
        // falls through
    case 'S_MUMMY':
        xlev += 2;
        // falls through
    case 'S_ZOMBIE':
        if ((u.ulevel | 0) >= xlev && !resist(mtmp, '\0', 0, NOTELL)) {
            if ((u.ualign?.type ?? 0) === A_CHAOTIC) {
                mtmp.mpeaceful = 1;
                set_malign(mtmp);
            } else {
                await killed(mtmp);
            }
            return;
        }
        // else flee — fall through
        // falls through
    default:
        await monflee(mtmp, 0, false, true);
        break;
    }
}

/**
 * C ref: pray.c doturn — #turn undead (Knight / Cleric).
 * Named omissions: known_spell(SPE_TURN_UNDEAD)/spelleffects for other
 * roles; resist TELL pline.
 */
export async function doturn() {
    const u = game.u || (game.u = {});

    if (!Role_if(PM_CLERIC) && !Role_if(PM_KNIGHT)) {
        // known_spell / spelleffects deferred
        await pline("You don't know how to turn undead!");
        return ECMD_OK;
    }
    if (!(u.uconduct)) u.uconduct = {};
    if (!(u.uconduct.gnostic++)) {
        livelog_printf(LL_CONDUCT, 'rejected atheism by turning undead');
    }

    const Gname = await halu_gname(u.ualign?.type ?? 0);

    if (!can_chant()) {
        const how = u.Strangled ? 'not able to call' : 'incapable of calling';
        await pline(`You are ${how} upon ${Gname} to turn aside evilness.`);
        return (u.uconduct.gnostic | 0) === 1 ? ECMD_TIME : ECMD_OK;
    }

    const youData = game.youmonst?.data;
    if (((u.ualign?.type ?? 0) !== A_CHAOTIC
            && (mon_is_demon(youData) || mon_is_undead(youData)
                || is_vampshifter(game.youmonst)))
        || (u.ugangr | 0) > 6) {
        await pline(`For some reason, ${Gname} seems to ignore you.`);
        aggravate();
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    if (Inhell()) {
        const wont = Gname === MOLOCH ? "won't" : "can't";
        await pline(`Since you are in Gehennom, ${Gname} ${wont} help you.`);
        aggravate();
        return ECMD_TIME;
    }

    await pline(`Calling upon ${Gname}, you chant an arcane formula.`);
    exercise(A_WIS, true);

    let turn_undead_range = BOLT_LIM + Math.trunc((u.ulevel | 0) / 5);
    turn_undead_range *= turn_undead_range;
    const msgCnt = { cnt: 0 };
    for (const mtmp of game.fmon || []) {
        await maybe_turn_mon_iter(mtmp, turn_undead_range, msgCnt);
    }

    nomul(-(5 - Math.trunc(((u.ulevel | 0) - 1) / 6)));
    game.multi_reason = 'trying to turn the monsters';
    game.nomovemsg = 'You can move again.';
    return ECMD_TIME;
}
