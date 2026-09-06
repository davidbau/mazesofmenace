// muse.js — Monster item use.
// C ref: muse.c find_offensive / use_offensive (ray wands + horns +
// WAN_TELE/UNDEAD mbhit + SCR_EARTH + MUSE_POT_* throw +
// MUSE_WAN_STRIKING mbhit + doorlock D-1484 + MUSE_CAMERA lightdamage
// D-1376 / D-1810); find_defensive / use_defensive D-1809; find_misc / use_misc.

import { game } from './gstate.js';
import { rn2, rn1, rnd, d, rn2_on_display_rng } from './rng.js';
import { cansee, couldsee, unblock_point } from './vision.js';
import {
    pline, mon_visible, see_with_infrared, pline_mon, verbalize,
    map_invisible, newsym, sensemon, flash_glyph_at, mon_to_glyph,
    canspotmon, impossible, cls, docrt, display_self, You_feel, Norep,
    flush_screen, show_glyph_cell,
} from './display.js';
import { worm_known, worm_move } from './worm.js';
import {
    Monnam, mon_nam, monverbself, Hallucination, x_monnam, trycall,
    Some_Monnam, noit_mon_nam, s_suffix, hcolor,
} from './do_name.js';
import {
    doname, singular, an, xname, the, makeplural, ansimpleoname,
    distant_name, vtense, Yname2, simpleonames,
} from './objnam.js';
import {
    dist2, distmin, m_at, m_carrying, mongone, onscary, monnear,
    wakeup, wake_nearto,
} from './mon.js';
import { lined_up, m_throw } from './mthrowu.js';
import {
    is_animal, mindless, nohands, is_floater, needspick, nonliving,
    is_vampshifter, is_mercenary, monsterNames, mons, haseyes, mon_hates_silver,
    verysmall, throws_rocks, passes_walls, is_bat, acidic, resists_acid,
    slimeproof, resists_ston, touch_petrifies,
    G_UNIQ, mon_learns_traps, mon_knows_traps, amorphous, noncorporeal,
    unsolid, is_undead,
} from './monsters.js';
import {
    objectNames, objectDescrs, POTION_CLASS, WAND_CLASS, SPEED_BOOTS,
    SCROLL_CLASS, AMULET_CLASS, TOOL_CLASS, FOOD_CLASS, WEAPON_CLASS,
} from './objects.js';
import { observe_object, makeknown } from './invent.js';
import {
    losehp, nomul, in_rooms, You_hear, is_pool, closed_door, carrying,
    stop_occupation, maybe_half_phys,
} from './hack.js';
import { doorlock } from './lock.js';
import { find_drawbridge } from './dbridge.js';
import { finish_losehp_done } from './end.js';
import {
    m_seenres, monstseesu, monstunseesu, same_race, mhe, mhim, can_blow,
} from './mondata.js';
import { bcsign } from './rumors.js';
import { enexto, migrate_to_level, tele_restrict, rloc,
    random_teleport_level, noteleport_level, tele, unconscious } from './teleport.js';
import { makemon, mpickobj, newcham, rndmonst } from './makemon.js';
import {
    place_object, splitobj, unbless, objects_at, mksobj, weight,
    stackobj, unknow_object, obj_extract_self, add_to_container,
    start_corpse_timeout, get_mtraits, start_glob_timeout,
} from './mkobj.js';
import { dropy, make_blinded, flooreffects } from './do.js';
import {
    learnwand, lightdamage, buzz, dobuzz, unturn_you, unturn_dead, resist,
    zhitm,
} from './zap.js';
import {
    BOLT_LIM, MSLOW, MFAST, isok, u_at, ZAP_POS, IS_DOOR,
    SDOOR, DRAWBRIDGE_UP, D_LOCKED, D_CLOSED, D_BROKEN, SHOPBASE,
    KILLED_BY_AN, ANTIMAGIC, M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD,
    M_SEEN_ELEC, M_SEEN_SLEEP, M_SEEN_ACID, M_SEEN_REFL, TIMEOUT,
    OBJ_FLOOR, G_GONE, MM_NOMSG, NO_MM_FLAGS,
    W_ARMOR, W_ACCESSORY, W_SADDLE, W_ARMH, W_ARM, W_ARMG,
    Has_contents, NON_PM, NC_SHOW_MSG, NC_VIA_WAND_OR_SPELL, POLY_TRAP,
    MIGR_RANDOM, MIGR_STAIRS_DOWN, MIGR_STAIRS_UP,
    MIGR_LADDER_DOWN, MIGR_LADDER_UP, MIGR_SSTAIRS,
    In_endgame, In_sokoban, Is_container, ismnum, Is_rogue_level, Is_earthlevel,
    ARTICLE_A, SUPPRESS_IT, SUPPRESS_INVISIBLE, SUPPRESS_SADDLE, AUGMENT_IT,
    PLNMSG_enum, NORMAL_SPEED, STRAT_WAITFORU, EDOG, STAIRS, LADDER, CORR, SCORR,
    is_hole, Can_fall_thru, Is_botlevel, TELEP_TRAP, FIRE_TRAP, FORCETRAP,
    EXPL_FIERY,
    RLOC_MSG, XKILL_NOMSG, XKILL_NOCONDUCT, COULD_SEE, IN_SIGHT,
    P_DAGGER, P_KNIFE, NOTELL, TEMPLE, IS_OBSTRUCTED, IS_AIR,
    BZ_M_WAND, BZ_OFS_AD, DIR_LEFT2, DIR_RIGHT2, DIR_CLAMP, xytodir,
    dirtocoord, engulfing_u,
} from './const.js';
import { MON_WEP, dmgval, hands_obj } from './weapon.js';
import { welded, setuwep, setuswapwep, mwelded } from './wield.js';
import { depth, strsubst, upstart } from './hacklib.js';
import { get_level, dunlevs_in_dungeon, On_W_tower_level } from './dungeon.js';
import { seetrap, t_at, trapname, mintrap, ceiling, wearing_iron_shoes } from './trap.js';
import { stairway_at } from './mklev.js';
import { place_monster, remove_monster } from './steed.js';
import {
    monflee, maybe_unhide_at, locomotion, accessible, mon_would_take_item,
    can_carry,
} from './monmove.js';
import { SchroedingersBox } from './pickup.js';
import { age_is_relative, begin_burn } from './timeout.js';
import { Inhell } from './minion.js';
import { mon_has_amulet } from './apply.js';
import { extract_from_minvent, which_armor } from './worn.js';
import { hard_helmet } from './do_wear.js';
import { obfree, inhishop } from './shk.js';
import { xkilled, killed, attacktype_fordmg } from './uhitm.js';
import { mondead, mondied, monkilled } from './mhitm.js';
import { dog_nutrition } from './dogmove.js';
import { ART_ORB_OF_DETECTION } from './generated/artifacts_data.js';
import { CLR_GREEN, CLR_BRIGHT_GREEN } from './terminal.js';
import { explode } from './explode.js';

const POT_PARALYSIS = objectNames.indexOf('POT_PARALYSIS');
const POT_BLINDNESS = objectNames.indexOf('POT_BLINDNESS');
const POT_CONFUSION = objectNames.indexOf('POT_CONFUSION');
const POT_SLEEPING = objectNames.indexOf('POT_SLEEPING');
const POT_ACID = objectNames.indexOf('POT_ACID');
const POT_SPEED = objectNames.indexOf('POT_SPEED');
const POT_HEALING = objectNames.indexOf('POT_HEALING');
const POT_EXTRA_HEALING = objectNames.indexOf('POT_EXTRA_HEALING');
const POT_FULL_HEALING = objectNames.indexOf('POT_FULL_HEALING');
const POT_SICKNESS = objectNames.indexOf('POT_SICKNESS');
const POT_POLYMORPH = objectNames.indexOf('POT_POLYMORPH');
const POT_GAIN_LEVEL = objectNames.indexOf('POT_GAIN_LEVEL');
const POT_INVISIBILITY = objectNames.indexOf('POT_INVISIBILITY');
const WAN_SPEED_MONSTER = objectNames.indexOf('WAN_SPEED_MONSTER');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const WAN_OPENING = objectNames.indexOf('WAN_OPENING');
const WAN_LOCKING = objectNames.indexOf('WAN_LOCKING');
const WAN_MAKE_INVISIBLE = objectNames.indexOf('WAN_MAKE_INVISIBLE');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const WAN_POLYMORPH = objectNames.indexOf('WAN_POLYMORPH');
const WAN_UNDEAD_TURNING = objectNames.indexOf('WAN_UNDEAD_TURNING');
const WAN_TELEPORTATION = objectNames.indexOf('WAN_TELEPORTATION');
const WAN_DEATH = objectNames.indexOf('WAN_DEATH');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const WAN_FIRE = objectNames.indexOf('WAN_FIRE');
const WAN_COLD = objectNames.indexOf('WAN_COLD');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_CREATE_MONSTER = objectNames.indexOf('WAN_CREATE_MONSTER');
const SCR_TELEPORTATION = objectNames.indexOf('SCR_TELEPORTATION');
const SCR_CREATE_MONSTER = objectNames.indexOf('SCR_CREATE_MONSTER');
const SCR_EARTH = objectNames.indexOf('SCR_EARTH');
const SCR_FIRE = objectNames.indexOf('SCR_FIRE');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const UNICORN_HORN = objectNames.indexOf('UNICORN_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const CLOAK_OF_MAGIC_RESISTANCE = objectNames.indexOf('CLOAK_OF_MAGIC_RESISTANCE');
const GRAY_DRAGON_SCALE_MAIL = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_DJINNI = monsterNames.indexOf('PM_DJINNI');
const PM_KI_RIN = monsterNames.indexOf('PM_KI_RIN');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
const PM_GUARD = monsterNames.indexOf('PM_GUARD');
const PM_GIANT_EEL = monsterNames.indexOf('PM_GIANT_EEL');
const PM_CROCODILE = monsterNames.indexOf('PM_CROCODILE');
const PM_ACID_BLOB = monsterNames.indexOf('PM_ACID_BLOB');
const PM_GRID_BUG = monsterNames.indexOf('PM_GRID_BUG');
const CORPSE = objectNames.indexOf('CORPSE');
const ROCK = objectNames.indexOf('ROCK');
const TIN = objectNames.indexOf('TIN');
const TIN_OPENER = objectNames.indexOf('TIN_OPENER');
const BOULDER = objectNames.indexOf('BOULDER');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const POT_OIL = objectNames.indexOf('POT_OIL');
const GLOB_OF_GREEN_SLIME = objectNames.indexOf('GLOB_OF_GREEN_SLIME');
const EGG = objectNames.indexOf('EGG');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const CANDELABRUM_OF_INVOCATION =
    objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const AT_GAZE = 15;
const AT_BREA = 12; // monattk.h
const NH_GREEN = 'green'; // c_color_names.c_green (decl.h NH_GREEN)
const RAY = 3; // objclass.h oc_dir
const AD_FIRE = 2; // monattk.h
const AD_COLD = 3;

/** C muse.c defense codes. */
const MUSE_SCR_TELEPORTATION = 1, MUSE_WAN_TELEPORTATION_SELF = 2,
    MUSE_POT_HEALING = 3, MUSE_POT_EXTRA_HEALING = 4, MUSE_WAN_DIGGING = 5,
    MUSE_TRAPDOOR = 6, MUSE_TELEPORT_TRAP = 7, MUSE_UPSTAIRS = 8,
    MUSE_DOWNSTAIRS = 9, MUSE_WAN_CREATE_MONSTER = 10,
    MUSE_SCR_CREATE_MONSTER = 11, MUSE_UP_LADDER = 12, MUSE_DN_LADDER = 13,
    MUSE_SSTAIRS = 14, MUSE_WAN_TELEPORTATION = 15, MUSE_BUGLE = 16,
    MUSE_UNICORN_HORN = 17, MUSE_POT_FULL_HEALING = 18,
    MUSE_LIZARD_CORPSE = 19, MUSE_WAN_UNDEAD_TURNING = 20;

/** C muse.c offense codes (subset). Defense reuses some numbers. */
const MUSE_WAN_DEATH = 1;
const MUSE_WAN_SLEEP = 2;
const MUSE_WAN_FIRE = 3;
const MUSE_WAN_COLD = 4;
const MUSE_WAN_LIGHTNING = 5;
const MUSE_WAN_MAGIC_MISSILE = 6;
const MUSE_WAN_STRIKING = 7;
const MUSE_POT_PARALYSIS = 9;
const MUSE_POT_BLINDNESS = 10;
const MUSE_POT_CONFUSION = 11;
const MUSE_FROST_HORN = 12;
const MUSE_FIRE_HORN = 13;
const MUSE_POT_ACID = 14;
const MUSE_POT_SLEEPING = 16;
const MUSE_SCR_EARTH = 17;
const MUSE_CAMERA = 18; // C muse.c offense; defense FULL_HEALING is also 18

/** C muse.c misc codes used here (muse.c #define MUSE_*). */
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

const BULLWHIP = objectNames.indexOf('BULLWHIP');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const LEASH = objectNames.indexOf('LEASH');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const ICE_BOX = objectNames.indexOf('ICE_BOX');
const YELLOW_DRAGON_SCALES = objectNames.indexOf('YELLOW_DRAGON_SCALES');
const YELLOW_DRAGON_SCALE_MAIL = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');
const PM_GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const PM_ICE_TROLL = monsterNames.indexOf('PM_ICE_TROLL');
const SILVER = 14; // objclass.h

/** C ref: you.h m_next2u — squared dist to hero ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/**
 * C ref: invent.c freeinv subset — unlink from hero invent array.
 */
function freeinv_hero(obj) {
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.nobj = null;
}

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function bimanual(obj) {
    if (!obj) return false;
    const ocl = game.objects?.[obj.otyp];
    return !!(ocl?.oc_bimanual || ocl?.oc_big);
}

/**
 * C ref: worn.c remove_worn_item — weapon slots before freeinv.
 */
function remove_worn_weapon(obj) {
    const u = game.u || {};
    if (obj === u.uwep) setuwep(null);
    else if (obj === u.uswapwep) setuswapwep(null);
}

/**
 * C ref: do.c canletgo with word="" — boolean gates only (no messages).
 * Used from sync find_misc; LEASH/corpsenm count kludge deferred.
 */
function canletgo_silent(obj) {
    if (!obj) return false;
    const mask = obj.owornmask || 0;
    if (mask & (W_ARMOR | W_ACCESSORY)) return false;
    const u = game.u || {};
    if (obj === u.uwep && welded(u.uwep)) return false;
    if (LOADSTONE >= 0 && (obj.otyp | 0) === LOADSTONE && obj.cursed) {
        obj.bknown = 1;
        return false;
    }
    if (LEASH >= 0 && (obj.otyp | 0) === LEASH && (obj.leashmon | 0) !== 0) {
        return false;
    }
    if (mask & W_SADDLE) return false;
    return true;
}

/** C hack.h WAND_BACKFIRE_CHANCE / POTION_OCCUPANT_CHANCE(n) */
const WAND_BACKFIRE_CHANCE = 100;
function POTION_OCCUPANT_CHANCE(n) {
    return 13 + 2 * (n | 0);
}

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function canseemon(mtmp) {
    if (!mtmp) return false;
    const loc_seen = mtmp.wormno
        ? worm_known(mtmp)
        : (cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp));
    return loc_seen && mon_visible(mtmp);
}

function attacktype(ptr, aatyp) {
    const mattk = ptr?.mattk || [];
    for (let i = 0; i < mattk.length; i++) {
        if (mattk[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/**
 * C ref: muse.c searches_for_item — intelligent non-animals seek useful loot.
 * Named omissions: onscary underfoot floor gate; FOOD_CLASS corpse/tin/egg
 * Named omissions: floor onscary protect; FOOD corpse/tin/egg
 * bodies; can_blow polish on horns; touch_petrifies paths.
 */
export function searches_for_item(mon, obj) {
    if (!mon || !obj) return false;
    const typ = obj.otyp;
    const ptr = mon.data;

    // C: protected floor item onscary — deferred (onscary stub elsewhere)
    if (obj.where === OBJ_FLOOR
        && obj.ox === mon.mx && obj.oy === mon.my) {
        // onscary(obj.ox, obj.oy, mon) deferred → treat as not scary
    }

    if (is_animal(ptr) || mindless(ptr)
        || (ptr?.mndx ?? -1) === PM_GHOST) {
        return false;
    }

    if (typ === WAN_MAKE_INVISIBLE || typ === POT_INVISIBILITY) {
        return !mon.minvis && !mon.invis_blkd && !attacktype(ptr, AT_GAZE);
    }
    if (typ === WAN_SPEED_MONSTER || typ === POT_SPEED) {
        return (mon.mspeed | 0) !== MFAST;
    }

    switch (obj.oclass) {
    case WAND_CLASS: {
        if ((obj.spe | 0) <= 0) return false;
        if (typ === WAN_DIGGING) return !is_floater(ptr);
        if (typ === WAN_POLYMORPH) {
            return (ptr?.difficulty | 0) < 6;
        }
        const oc = game.objects?.[typ];
        if ((oc?.oc_dir | 0) === RAY
            || typ === WAN_STRIKING
            || typ === WAN_UNDEAD_TURNING
            || typ === WAN_TELEPORTATION
            || typ === WAN_CREATE_MONSTER) {
            return true;
        }
        break;
    }
    case POTION_CLASS:
        if (typ === POT_HEALING || typ === POT_EXTRA_HEALING
            || typ === POT_FULL_HEALING || typ === POT_POLYMORPH
            || typ === POT_GAIN_LEVEL || typ === POT_PARALYSIS
            || typ === POT_SLEEPING || typ === POT_ACID || typ === POT_CONFUSION) {
            return true;
        }
        if (typ === POT_BLINDNESS && !attacktype(ptr, AT_GAZE)) return true;
        break;
    case SCROLL_CLASS:
        if (typ === SCR_TELEPORTATION || typ === SCR_CREATE_MONSTER
            || typ === SCR_EARTH || typ === SCR_FIRE) {
            return true;
        }
        break;
    case AMULET_CLASS:
        if (typ === AMULET_OF_LIFE_SAVING) {
            return !(nonliving(ptr) || is_vampshifter(mon));
        }
        if (typ === AMULET_OF_REFLECTION || typ === AMULET_OF_GUARDING) {
            return true;
        }
        break;
    case TOOL_CLASS:
        if (typ === PICK_AXE) return needspick(ptr);
        if (typ === UNICORN_HORN) {
            return !obj.cursed && ptr?.mlet !== 'S_UNICORN'
                && (ptr?.mndx ?? -1) !== PM_KI_RIN;
        }
        if (typ === FROST_HORN || typ === FIRE_HORN) {
            // can_blow deferred → allow when charged
            return (obj.spe | 0) > 0;
        }
        // C ref: muse.c searches_for_item TOOL — Is_container && !cursed-mbag && !olocked
        {
            const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
            const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
            const is_mbag = typ === BAG_OF_HOLDING || typ === BAG_OF_TRICKS;
            if (Is_container(obj) && !(is_mbag && obj.cursed) && !obj.olocked) {
                return true;
            }
        }
        if (typ === EXPENSIVE_CAMERA) return (obj.spe | 0) > 0;
        break;
    case FOOD_CLASS: {
        // C ref: muse.c searches_for_item — petrify-cure corpse/tin/egg arms
        if (typ === CORPSE) {
            return ((((mon.misc_worn_check | 0) & W_ARMG) !== 0)
                    && !!touch_petrifies(mons(obj.corpsenm)))
                || (!resists_ston(mon) && cures_stoning(mon, obj, false));
        }
        if (typ === TIN) {
            return mcould_eat_tin(mon)
                && !resists_ston(mon) && cures_stoning(mon, obj, true);
        }
        if (typ === EGG && ismnum(obj.corpsenm)) {
            return !!touch_petrifies(mons(obj.corpsenm));
        }
        break;
    }
    default:
        break;
    }
    return false;
}

function mdistu(mtmp) {
    const u = game.u;
    if (!u || mtmp.mx == null) return 0;
    return dist2(mtmp.mx, mtmp.my, u.ux, u.uy);
}

/**
 * C ref: youprop.h Antimagic — HAntimagic || EAntimagic.
 * oc_oprop via setworn deferred; match worn MR cloak / gray dragon armor
 * like Displaced cloak special-case.
 */
function Antimagic() {
    const u = game.u || {};
    if (u.Antimagic || u.HAntimagic || u.EAntimagic) return true;
    if (u.uprops?.[ANTIMAGIC]?.intrinsic || u.uprops?.[ANTIMAGIC]?.extrinsic) {
        return true;
    }
    const cloak = u.uarmc;
    if (cloak && cloak.otyp === CLOAK_OF_MAGIC_RESISTANCE) return true;
    const body = u.uarm;
    if (body && (body.otyp === GRAY_DRAGON_SCALE_MAIL
        || body.otyp === GRAY_DRAGON_SCALES)) return true;
    return false;
}

/** C youprop.h Blind — (HBlinded || EBlinded) && !BBlinded. */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/** C youprop.h Unaware — multi < 0 && (unconscious || fainted). */
function Unaware() {
    if ((game.multi | 0) >= 0) return false;
    const u = game.u || {};
    return !!(u.usleep || u.Unaware);
}

/**
 * C ref: mondata.c resists_blnd youmonst :248–272 — Blind / Unaware.
 * Named omit: expl/gaze AD_BLND (yellow light / Archon);
 * resists_blnd_by_arti (Sunsword).
 */
function resists_blnd_you() {
    return Blind() || Unaware();
}

/**
 * C ref: mondata.h hates_light — youmonst.data == gremlin.
 * Used so a gremlin hero still gets flashed when already Blind.
 */
function hates_light_you() {
    return (game.youmonst?.data?.mndx | 0) === PM_GREMLIN
        || (game.u?.umonnum | 0) === PM_GREMLIN;
}

function museState() {
    if (!game._muse) {
        game._muse = {
            offensive: null, has_offense: 0,
            defensive: null, has_defense: 0,
            misc: null, has_misc: 0,
            trapx: 0, trapy: 0,
        };
    }
    return game._muse;
}

/**
 * C ref: muse.c find_offensive — potion throw + WAN_STRIKING + MUSE_CAMERA.
 * Other wand/horn/scroll offense deferred (C-JS-MAP).
 *
 * C `#define nomore(x) if (has_offense == x) continue` — once a type is
 * selected, later invent objects hit that nomore and skip the rest of their
 * checks. Plain overwrite (JS old) let a later POT_* beat an earlier
 * WAN_STRIKING; C keeps the wand (D-0258).
 */

/** C ref: hack.h BZ_OFS_WAN — abs(otyp - WAN_MAGIC_MISSILE) % 10. */
function BZ_OFS_WAN(otyp) {
    return Math.abs((otyp | 0) - WAN_MAGIC_MISSILE) % 10;
}

/** C ref: muse.c buzz_force_miss `:1814` — first unused wand always misses. */
async function buzz_force_miss(type, nd, sx, sy, dx, dy) {
    return dobuzz(type, nd, sx, sy, dx, dy, true, false, true);
}

/** C ref: muse.c hero_behind_chokepoint `:1343`. */
function hero_behind_chokepoint(mtmp) {
    const dx = sgn(mtmp.mx - mtmp.mux);
    const dy = sgn(mtmp.my - mtmp.muy);
    const x = (mtmp.mux | 0) + dx;
    const y = (mtmp.muy | 0) + dy;
    const dir = xytodir(dx, dy);
    const dir_l = DIR_CLAMP(DIR_LEFT2(dir));
    const dir_r = DIR_CLAMP(DIR_RIGHT2(dir));
    const c1 = { x: 0, y: 0 };
    const c2 = { x: 0, y: 0 };
    dirtocoord(c1, dir_l);
    dirtocoord(c2, dir_r);
    c1.x += x;
    c2.x += x;
    c1.y += y;
    c2.y += y;
    if ((!isok(c1.x, c1.y) || !accessible(c1.x, c1.y))
        && (!isok(c2.x, c2.y) || !accessible(c2.x, c2.y))) {
        return true;
    }
    return false;
}

/** C ref: muse.c mon_has_friends `:1370`. */
function mon_has_friends(mtmp) {
    if (mtmp.mtame || mtmp.mpeaceful) return false;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const x = mtmp.mx + dx;
            const y = mtmp.my + dy;
            if (!isok(x, y)) continue;
            const mon2 = m_at(x, y);
            if (mon2 && mon2 !== mtmp && !mon2.mtame && !mon2.mpeaceful) {
                return true;
            }
        }
    }
    return false;
}

/** C ref: muse.c mon_likes_objpile_at `:1394`. */
function mon_likes_objpile_at(mtmp, x, y) {
    if (!isok(x, y)) return false;
    let otmp = objects_at(x, y);
    if (!otmp) return false;
    let i = 0;
    for (; otmp && i < 3; i++, otmp = otmp.nexthere) {
        if (mon_would_take_item(mtmp, otmp)) return true;
    }
    return i >= 3;
}

/**
 * C ref: muse.c m_use_undead_turning `:1299`.
 * Named omit: linedup_callback / linedup_chk_corpse floor-corpse ray.
 */
function m_use_undead_turning(mtmp, obj) {
    const m = museState();
    if ((obj.otyp | 0) !== WAN_UNDEAD_TURNING || (obj.spe | 0) <= 0) return;
    if (carrying(CORPSE)) {
        m.offensive = obj;
        m.has_offense = MUSE_WAN_UNDEAD_TURNING;
    }
}

export function find_offensive(mtmp) {
    const m = museState();
    m.offensive = null;
    m.has_offense = 0;

    if (!mtmp || mtmp.mpeaceful) return false;
    const data = mtmp.data;
    if (!data || is_animal(data) || mindless(data) || nohands(data)) {
        return false;
    }
    const u = game.u || {};
    if (u.uswallow) return false;
    // in_your_sanctuary / AD_HEAL naked-heal deferred → treat as open
    if (!lined_up(mtmp)) return false;

    /* C: m_seenres returns the masked bits; JS helper is already boolean. */
    const reflection_skip = m_seenres(mtmp, M_SEEN_REFL)
        || monnear(mtmp, mtmp.mux, mtmp.muy);
    const mtmp_helmet = which_armor(mtmp, W_ARMH);
    const mux = mtmp.mux ?? u.ux;
    const muy = mtmp.muy ?? u.uy;
    const tc = !!((u.HTeleport_control | 0) || (u.ETeleport_control | 0)
        || u.Teleport_control);

    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (!reflection_skip) {
            if (m.has_offense === MUSE_WAN_DEATH) continue;
            if (obj.otyp === WAN_DEATH && (obj.spe | 0) > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                m.offensive = obj;
                m.has_offense = MUSE_WAN_DEATH;
            }
            if (m.has_offense === MUSE_WAN_SLEEP) continue;
            if (obj.otyp === WAN_SLEEP && (obj.spe | 0) > 0
                && (game.multi | 0) >= 0
                && !m_seenres(mtmp, M_SEEN_SLEEP)) {
                m.offensive = obj;
                m.has_offense = MUSE_WAN_SLEEP;
            }
            if (m.has_offense === MUSE_WAN_FIRE) continue;
            if (obj.otyp === WAN_FIRE && (obj.spe | 0) > 0
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                m.offensive = obj;
                m.has_offense = MUSE_WAN_FIRE;
            }
            if (m.has_offense === MUSE_FIRE_HORN) continue;
            if (obj.otyp === FIRE_HORN && (obj.spe | 0) > 0
                && can_blow(mtmp) && !m_seenres(mtmp, M_SEEN_FIRE)) {
                m.offensive = obj;
                m.has_offense = MUSE_FIRE_HORN;
            }
            if (m.has_offense === MUSE_WAN_COLD) continue;
            if (obj.otyp === WAN_COLD && (obj.spe | 0) > 0
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                m.offensive = obj;
                m.has_offense = MUSE_WAN_COLD;
            }
            if (m.has_offense === MUSE_FROST_HORN) continue;
            if (obj.otyp === FROST_HORN && (obj.spe | 0) > 0
                && can_blow(mtmp) && !m_seenres(mtmp, M_SEEN_COLD)) {
                m.offensive = obj;
                m.has_offense = MUSE_FROST_HORN;
            }
            if (m.has_offense === MUSE_WAN_LIGHTNING) continue;
            if (obj.otyp === WAN_LIGHTNING && (obj.spe | 0) > 0
                && !m_seenres(mtmp, M_SEEN_ELEC)) {
                m.offensive = obj;
                m.has_offense = MUSE_WAN_LIGHTNING;
            }
            if (m.has_offense === MUSE_WAN_MAGIC_MISSILE) continue;
            if (obj.otyp === WAN_MAGIC_MISSILE && (obj.spe | 0) > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                m.offensive = obj;
                m.has_offense = MUSE_WAN_MAGIC_MISSILE;
            }
        }
        if (m.has_offense === MUSE_WAN_UNDEAD_TURNING) continue;
        m_use_undead_turning(mtmp, obj);
        if (m.has_offense === MUSE_WAN_STRIKING) continue;
        if (obj.otyp === WAN_STRIKING && (obj.spe | 0) > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            m.offensive = obj;
            m.has_offense = MUSE_WAN_STRIKING;
        }
        if (m.has_offense === MUSE_WAN_TELEPORTATION) continue;
        if (obj.otyp === WAN_TELEPORTATION && (obj.spe | 0) > 0
            && !tc
            && (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP))
            && (onscary(u.ux, u.uy, mtmp)
                || (hero_behind_chokepoint(mtmp) && mon_has_friends(mtmp))
                || mon_likes_objpile_at(mtmp, u.ux, u.uy)
                || stairway_at(u.ux, u.uy))) {
            m.offensive = obj;
            m.has_offense = MUSE_WAN_TELEPORTATION;
        }
        if (m.has_offense === MUSE_POT_PARALYSIS) continue;
        if (obj.otyp === POT_PARALYSIS && (game.multi | 0) >= 0) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_PARALYSIS;
        }
        if (m.has_offense === MUSE_POT_BLINDNESS) continue;
        if (obj.otyp === POT_BLINDNESS && !attacktype(data, AT_GAZE)) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_BLINDNESS;
        }
        if (m.has_offense === MUSE_POT_CONFUSION) continue;
        if (obj.otyp === POT_CONFUSION) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_CONFUSION;
        }
        if (m.has_offense === MUSE_POT_SLEEPING) continue;
        if (obj.otyp === POT_SLEEPING && !m_seenres(mtmp, M_SEEN_SLEEP)) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_SLEEPING;
        }
        if (m.has_offense === MUSE_POT_ACID) continue;
        if (obj.otyp === POT_ACID && !m_seenres(mtmp, M_SEEN_ACID)) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_ACID;
        }
        if (m.has_offense === MUSE_SCR_EARTH) continue;
        if (obj.otyp === SCR_EARTH
            && (hard_helmet(mtmp_helmet) || mtmp.mconf
                || amorphous(data) || passes_walls(data)
                || noncorporeal(data) || unsolid(data)
                || !rn2(10))
            && dist2(mtmp.mx, mtmp.my, mux, muy) <= 2
            && mtmp.mcansee && haseyes(data)
            && !Is_rogue_level(u.uz)
            && (!In_endgame(u.uz) || Is_earthlevel(u.uz))) {
            m.offensive = obj;
            m.has_offense = MUSE_SCR_EARTH;
        }
        if (m.has_offense === MUSE_CAMERA) continue;
        if (obj.otyp === EXPENSIVE_CAMERA
            && ((!Blind() && !resists_blnd_you()) || hates_light_you())
            && dist2(mtmp.mx, mtmp.my, mux, muy) <= 2
            && (obj.spe | 0) > 0 && !rn2(6)) {
            m.offensive = obj;
            m.has_offense = MUSE_CAMERA;
        }
    }
    return m.has_offense !== 0;
}

/**
 * C ref: muse.c mbhitm `:1596`.
 * Named omit: WAN_CANCELLATION/SPE_CANCELLATION; seemimic; shieldeff;
 * mon-target resists_magm / find_mac / hit/miss/resist plines (dice still
 * burn on striking); stop_occupation on hero striking.
 */
async function mbhitm(mtmp, otmp, hits_you) {
    let reveal_invis = false;
    let learnit = false;
    if (!hits_you && mtmp && (otmp.otyp | 0) !== WAN_UNDEAD_TURNING) {
        mtmp.msleeping = 0;
        // seemimic named
    }
    switch (otmp.otyp) {
    case WAN_STRIKING:
        reveal_invis = true;
        if (hits_you) {
            const u = game.u || {};
            if (Antimagic()) {
                monstseesu(M_SEEN_MAGR);
                await pline('Boing!');
                learnit = true;
            } else if (
                rnd(20) < 10 + (u.uac ?? 10)
                && !(game._buzzer && !game._buzzer.mwandexp)
            ) {
                monstunseesu(M_SEEN_MAGR);
                await pline('The wand hits you!');
                let tmp = d(2, 12);
                if (u.HHalf_spell_damage || u.EHalf_spell_damage
                    || u.Half_spell_damage) {
                    tmp = Math.trunc((tmp + 1) / 2);
                }
                losehp(tmp, 'wand', KILLED_BY_AN);
                if (game.program_state?.gameover) {
                    await finish_losehp_done();
                    return 0;
                }
                learnit = true;
            } else {
                await pline('The wand misses you.');
            }
            nomul(0);
        } else if (mtmp) {
            if (rnd(20) < 10 + 10) {
                d(2, 12);
                learnit = true;
            }
        }
        if (learnit && game._zap_oseen && (hits_you
            || (mtmp && cansee(mtmp.mx, mtmp.my)))) {
            makeknown(WAN_STRIKING);
        }
        break;
    case WAN_TELEPORTATION:
        if (hits_you) {
            await tele();
            if (game._zap_oseen) makeknown(WAN_TELEPORTATION);
        } else if (mtmp) {
            if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE)) {
                if (cansee(mtmp.mx, mtmp.my)) {
                    await pline_mon(mtmp, `${Monnam(mtmp)} resists the magic!`);
                }
            } else if (!(await tele_restrict(mtmp))) {
                await rloc(mtmp, RLOC_MSG);
            }
        }
        break;
    case WAN_UNDEAD_TURNING:
        if (hits_you) {
            await unturn_you();
            learnit = !!game._zap_oseen;
        } else if (mtmp) {
            let wake = false;
            if (await unturn_dead(mtmp)) wake = true;
            if (is_undead(mtmp.data) || is_vampshifter(mtmp)) {
                wake = true;
                reveal_invis = true;
                if (!game.context) game.context = {};
                game.context.bypasses = true;
                await resist(mtmp, WAND_CLASS, rnd(8), NOTELL);
            }
            if (wake) {
                if ((mtmp.mhp | 0) >= 1) await wakeup(mtmp, false);
                learnit = !!game._zap_oseen;
            }
        }
        if (learnit) makeknown(WAN_UNDEAD_TURNING);
        break;
    default:
        break;
    }
    if (reveal_invis && mtmp && (mtmp.mhp | 0) >= 1) {
        const bp = game._bhitpos;
        if (bp && cansee(bp.x, bp.y) && !canspotmon(mtmp)) {
            map_invisible(bp.x, bp.y);
        }
    }
    return 0;
}

/**
 * C ref: muse.c mbhit — mon wand beam toward mux/muy.
 * Doorlock WAN_OPENING/WAN_LOCKING/WAN_STRIKING (D-1484; C `:1785–1802`;
 * callee lock.c doorlock already live D-1462/D-1475/D-1482). zap_oseen
 * makeknown (not hero bhit learnwand / !Deaf). Shop D_BROKEN
 * add_damage(0) (not SHOP_DOOR_COST / pay_for_damage).
 * Named omissions: fhito_loc / destroy_drawbridge; map_invisible.
 */
async function mbhit(mon, range, obj) {
    const bhitpos = game._bhitpos || (game._bhitpos = { x: 0, y: 0 });
    bhitpos.x = mon.mx;
    bhitpos.y = mon.my;
    const ddx = sgn((mon.mux ?? game.u?.ux) - mon.mx);
    const ddy = sgn((mon.muy ?? game.u?.uy) - mon.my);
    const otyp = obj?.otyp | 0;
    let r = range;

    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x;
        const y = bhitpos.y;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
        if (u_at(x, y)) {
            await mbhitm(null, obj, true);
            // C: fatal losehp never returns — stop beam after hero death
            if (game.program_state?.gameover) return;
            r -= 3;
        } else {
            const mtmp = m_at(x, y);
            if (mtmp) {
                await mbhitm(mtmp, obj, false);
                r -= 3;
            }
        }
        /* C muse.c mbhit :1772 — fhito_loc deferred. */
        const loc = game.level?.at?.(x, y);
        const ltyp = loc?.typ;
        /* C muse.c mbhit :1776–1803 — STRIKING find_drawbridge then
         * else-if IS_DOOR||SDOOR doorlock. destroy_drawbridge named. */
        const dbxy = { x, y };
        if (otyp === WAN_STRIKING
            && ltyp !== DRAWBRIDGE_UP
            && find_drawbridge(dbxy)) {
            /* destroy_drawbridge(dbxy.x, dbxy.y) deferred. */
        } else if (IS_DOOR(ltyp) || ltyp === SDOOR) {
            switch (otyp) {
            /* C :1787–1788 — monsters don't use opening/locking magic
             * at present; keep the placeholders. */
            case WAN_OPENING:
            case WAN_LOCKING:
            case WAN_STRIKING:
                if (await doorlock(obj, x, y)) {
                    if (game._zap_oseen) makeknown(otyp);
                    if ((loc?.doormask | 0) === D_BROKEN
                        && in_rooms(x, y, SHOPBASE)) {
                        const { add_damage } = await import('./shk.js');
                        add_damage(x, y, 0);
                    }
                }
                break;
            }
        }
        if (!ZAP_POS(ltyp)
            || (IS_DOOR(ltyp) && loc
                && ((loc.doormask || 0) & (D_LOCKED | D_CLOSED)))) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
}

/**
 * C ref: muse.c use_offensive `:1823`.
 * Named omit: MUSE_SCR_FIRE (#if 0); steed in SCR_EARTH; fhito_loc/bhito
 * on tele/undead beams; destroy_drawbridge; SetVoice on camera.
 */
export async function use_offensive(mtmp) {
    const m = museState();
    const otmp = m.offensive;
    if (!otmp) return 0;

    /* C: first unused attack wand always misses. */
    const buzzfn = mtmp.mwandexp ? buzz : buzz_force_miss;

    if (otmp.oclass !== POTION_CLASS) {
        const i = await precheck(mtmp, otmp);
        if (i !== 0) return i;
    }

    const oseen = canseemon(mtmp);
    const dx = sgn((mtmp.mux ?? game.u?.ux) - mtmp.mx);
    const dy = sgn((mtmp.muy ?? game.u?.uy) - mtmp.my);

    switch (m.has_offense) {
    case MUSE_WAN_DEATH:
    case MUSE_WAN_SLEEP:
    case MUSE_WAN_FIRE:
    case MUSE_WAN_COLD:
    case MUSE_WAN_LIGHTNING:
    case MUSE_WAN_MAGIC_MISSILE:
        await mzapwand(mtmp, otmp, false);
        if (oseen) makeknown(otmp.otyp);
        game.m_using = true;
        game.current_wand = otmp;
        game._buzzer = mtmp;
        await buzzfn(
            BZ_M_WAND(BZ_OFS_WAN(otmp.otyp)),
            (otmp.otyp === WAN_MAGIC_MISSILE) ? 2 : 6,
            mtmp.mx, mtmp.my, dx, dy,
        );
        game._buzzer = null;
        game.current_wand = null;
        game.m_using = false;
        mtmp.mwandexp = true;
        return (mtmp.mhp | 0) < 1 ? 1 : 2;
    case MUSE_FIRE_HORN:
    case MUSE_FROST_HORN:
        await mplayhorn(mtmp, otmp, false);
        game.m_using = true;
        game._buzzer = mtmp;
        game.current_wand = otmp;
        await buzzfn(
            BZ_M_WAND(BZ_OFS_AD(
                (otmp.otyp === FROST_HORN) ? AD_COLD : AD_FIRE,
            )),
            rn1(6, 6), mtmp.mx, mtmp.my, dx, dy,
        );
        game._buzzer = null;
        game.current_wand = null;
        game.m_using = false;
        mtmp.mwandexp = true;
        return (mtmp.mhp | 0) < 1 ? 1 : 2;
    case MUSE_WAN_TELEPORTATION:
    case MUSE_WAN_UNDEAD_TURNING:
    case MUSE_WAN_STRIKING:
        game._zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        game._buzzer = mtmp;
        await mbhit(mtmp, rn1(8, 6), otmp);
        game._buzzer = null;
        game.m_using = false;
        if (game.program_state?.gameover) return 1;
        if (m.has_offense === MUSE_WAN_STRIKING) mtmp.mwandexp = true;
        return 2;
    case MUSE_SCR_EARTH: {
        const confused = !!mtmp.mconf;
        const mmx = mtmp.mx | 0;
        const mmy = mtmp.my | 0;
        const is_cursed = !!otmp.cursed;
        const is_blessed = !!otmp.blessed;

        await mreadmsg(mtmp, otmp);
        if (canspotmon(mtmp)) {
            await pline(
                `The ${ceiling(mtmp.mx, mtmp.my)} rumbles ${
                    otmp.blessed ? 'around' : 'above'} ${mon_nam(mtmp)}!`,
            );
            if (oseen) makeknown(otmp.otyp);
        } else if (cansee(mtmp.mx, mtmp.my)) {
            await pline(
                `The ${ceiling(mtmp.mx, mtmp.my)} rumbles in the middle of nowhere!`,
            );
            if (mtmp.minvis) map_invisible(mtmp.mx, mtmp.my);
            if (oseen) makeknown(otmp.otyp);
        }
        m_useup(mtmp, otmp);

        for (let x = mmx - 1; x <= mmx + 1; x++) {
            for (let y = mmy - 1; y <= mmy + 1; y++) {
                const loc = game.level?.at?.(x, y);
                const typ = loc?.typ;
                if (isok(x, y) && !closed_door(x, y)
                    && !IS_OBSTRUCTED(typ) && !IS_AIR(typ)
                    && (((x === mmx) && (y === mmy)) ? !is_blessed : !is_cursed)
                    && (x !== game.u?.ux || y !== game.u?.uy)) {
                    await drop_boulder_on_monster(x, y, confused, false);
                }
            }
        }
        if (distmin(mmx, mmy, game.u?.ux, game.u?.uy) === 1 && !is_cursed) {
            await drop_boulder_on_player(confused, !is_cursed, false, true);
        }
        if (game.program_state?.gameover) return 1;
        return (mtmp.mhp | 0) < 1 ? 1 : 2;
    }
    case MUSE_CAMERA: {
        if (Hallucination()) {
            await verbalize('Say cheese!');
        } else if (!Blind()) {
            await pline(
                `${Monnam(mtmp)} takes a picture of you with ${an(xname(otmp))}!`,
            );
        }
        game.m_using = true;
        if (!Blind() && !resists_blnd_you()) {
            await pline('You are blinded by the flash of light!');
            await make_blinded(BlindedTimeout() + rnd(1 + 50), false);
        }
        await lightdamage(otmp, true, 5);
        game.m_using = false;
        otmp.spe = (otmp.spe | 0) - 1;
        return 1;
    }
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID:
        if (cansee(mtmp.mx, mtmp.my)) {
            observe_object(otmp);
            await pline(`${Monnam(mtmp)} hurls ${singular(otmp, doname)}!`);
        }
        await m_throw(
            mtmp, mtmp.mx, mtmp.my, dx, dy,
            distmin(mtmp.mx, mtmp.my, mtmp.mux ?? game.u?.ux, mtmp.muy ?? game.u?.uy),
            otmp,
        );
        return 2;
    case 0:
        return 0;
    default:
        await impossible(
            `${Monnam(mtmp)} wanted to perform action ${m.has_offense}?`,
        );
        break;
    }
    return 0;
}

/**
 * C ref: muse.c mplayhorn `:194`.
 * Named omit: Soundeffect se_horn_being_played.
 */
async function mplayhorn(mtmp, otmp, self) {
    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my)
            ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = mdistu(mtmp) <= range * range;
        await You_hear(
            `a horn being played ${near ? 'nearby' : 'in the distance'}.`,
        );
        unknow_object(otmp);
    } else if (self) {
        observe_object(otmp);
        let objnamp = xname(otmp);
        if ((objnamp?.length | 0) >= 128) objnamp = simpleonames(otmp);
        const objbuf = `a ${objnamp} directed at`;
        await pline(
            `${monverbself(mtmp, Monnam(mtmp), 'play', objbuf)}!`,
        );
        makeknown(otmp.otyp);
    } else {
        observe_object(otmp);
        let objnamp = xname(otmp);
        if ((objnamp?.length | 0) >= 128) objnamp = simpleonames(otmp);
        await pline(
            `${Monnam(mtmp)} plays ${an(objnamp)} directed at you!`,
        );
        makeknown(otmp.otyp);
        await stop_occupation();
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/**
 * C ref: read.c drop_boulder_on_player `:2293`.
 * Named omit: engulfed-hero mbodypart You_hear polish (player path still
 * runs via drop_boulder_on_monster when !skip_uswallow).
 */
async function drop_boulder_on_player(
    confused, helmet_protects, byu, skip_uswallow,
) {
    const u = game.u || {};
    if (u.uswallow && !skip_uswallow) {
        await drop_boulder_on_monster(u.ux, u.uy, confused, byu);
        return;
    }
    const otmp2 = mksobj(confused ? ROCK : BOULDER, false, false);
    if (!otmp2) return;
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);
    let dmg = 0;
    const youdata = game.youmonst?.data;
    const passes = (u.HPasses_walls | 0) || (u.EPasses_walls | 0);
    if (!amorphous(youdata) && !passes
        && !noncorporeal(youdata) && !unsolid(youdata)) {
        await pline(`You are hit by ${doname(otmp2)}!`);
        dmg = (dmgval(otmp2, game.youmonst) * (otmp2.quan | 0)) | 0;
        if (u.uarmh && helmet_protects) {
            if (hard_helmet(u.uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                if (dmg > 2) dmg = 2;
            } else if (game.flags?.verbose !== false) {
                await pline(`${Yname2(u.uarmh)} does not protect you.`);
            }
        }
    }
    await wake_nearto(u.ux, u.uy, 4 * 4);
    if (!(await flooreffects(otmp2, u.ux, u.uy, 'fall'))) {
        place_object(otmp2, u.ux, u.uy);
        stackobj(otmp2);
        newsym(u.ux, u.uy);
    }
    if (dmg) {
        losehp(maybe_half_phys(dmg), 'scroll of earth', KILLED_BY_AN);
    }
}

/**
 * C ref: read.c drop_boulder_on_monster `:2340`.
 * Named omit: engulfing_u You_hear mbodypart/body_part polish.
 */
async function drop_boulder_on_monster(x, y, confused, byu) {
    const otmp2 = mksobj(confused ? ROCK : BOULDER, false, false);
    if (!otmp2) return false;
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);
    const mtmp = m_at(x, y);
    if (mtmp && !amorphous(mtmp.data) && !passes_walls(mtmp.data)
        && !noncorporeal(mtmp.data) && !unsolid(mtmp.data)) {
        const helmet = which_armor(mtmp, W_ARMH);
        if (cansee(mtmp.mx, mtmp.my)) {
            await pline(`${Monnam(mtmp)} is hit by ${doname(otmp2)}!`);
            if (mtmp.minvis && !canspotmon(mtmp)) {
                map_invisible(mtmp.mx, mtmp.my);
            }
        }
        let mdmg = dmgval(otmp2, mtmp) * (otmp2.quan | 0);
        if (helmet) {
            if (hard_helmet(helmet)) {
                if (canspotmon(mtmp)) {
                    await pline(
                        `Fortunately, ${mon_nam(mtmp)} is wearing a hard helmet.`,
                    );
                } else {
                    const u = game.u || {};
                    const deaf = (u.HDeaf | 0) || (u.EDeaf | 0)
                        || u.uroleplay?.deaf || u.Deaf;
                    if (!deaf) await You_hear('a clanging sound.');
                }
                if (mdmg > 2) mdmg = 2;
            } else if (canspotmon(mtmp)) {
                await pline(
                    `${Monnam(mtmp)}'s ${xname(helmet)} does not protect ${mhim(mtmp)}.`,
                );
            }
        }
        mtmp.mhp = (mtmp.mhp | 0) - mdmg;
        if ((mtmp.mhp | 0) < 1) {
            if (byu) {
                await killed(mtmp);
            } else {
                await pline(`${Monnam(mtmp)} is killed.`);
                await mondied(mtmp);
            }
        } else {
            await wakeup(mtmp, byu);
        }
        await wake_nearto(x, y, 4 * 4);
    } else if (engulfing_u(mtmp)) {
        obfree(otmp2, null);
        await drop_boulder_on_player(confused, true, false, true);
        return true;
    }
    if (!(await flooreffects(otmp2, x, y, 'fall'))) {
        place_object(otmp2, x, y);
        stackobj(otmp2);
        newsym(x, y);
    }
    return true;
}

/**
 * C ref: o_init.c objdescr_is — OBJ_DESCR(objects[otyp]) vs descr.
 */
function objdescr_is(obj, descr) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return false;
    const dn = objectDescrs[oc.oc_descr_idx ?? obj.otyp];
    return dn != null && dn === descr;
}

/**
 * C ref: mon.c healmon — monster HP bump (+ optional max overheal).
 */
function healmon(mtmp, amt, overheal) {
    if (!mtmp) return 0;
    const oldhp = mtmp.mhp | 0;
    amt |= 0;
    overheal |= 0;
    if (oldhp + amt > (mtmp.mhpmax | 0) + overheal) {
        mtmp.mhpmax = (mtmp.mhpmax | 0) + overheal;
        mtmp.mhp = mtmp.mhpmax | 0;
    } else {
        mtmp.mhp = oldhp + amt;
        if ((mtmp.mhp | 0) > (mtmp.mhpmax | 0)) mtmp.mhpmax = mtmp.mhp | 0;
    }
    return (mtmp.mhp | 0) - oldhp;
}

/**
 * C ref: mthrowu.c m_useup — consume one from monster invent.
 */
function m_useup(mon, obj) {
    if (!mon || !obj) return;
    if ((obj.quan | 0) > 1) {
        obj.quan = (obj.quan | 0) - 1;
        return;
    }
    if (mon.minvent === obj) mon.minvent = obj.nobj;
    else {
        for (let p = mon.minvent; p; p = p.nobj) {
            if (p.nobj === obj) {
                p.nobj = obj.nobj;
                break;
            }
        }
    }
}

/**
 * C ref: muse.c mquaffmsg.
 */
async function mquaffmsg(mtmp, otmp) {
    if (canseemon(mtmp)) {
        observe_object(otmp);
        await pline(`${Monnam(mtmp)} drinks ${singular(otmp, doname)}!`);
    } else {
        const u = game.u || {};
        const deaf = (u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf;
        if (!deaf) await pline('You hear a chugging sound.');
    }
}

/** C ref: mon.c flash_mon `:6066` — viz pulse + flash_glyph_at. */
async function flash_mon(mtmp) {
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    let count = couldsee(mx, my) ? 8 : 4;
    if (!game.flags?.sparkle) count = (count / 2) | 0;
    const row = game.viz_array?.[my];
    const saveviz = row ? row[mx] : 0;
    if (row) row[mx] = (saveviz | 0) | IN_SIGHT | COULD_SEE;
    await flash_glyph_at(mx, my, mon_to_glyph(mtmp), count);
    if (row) row[mx] = saveviz;
    newsym(mx, my);
}

/** C ref: muse.c mreadmsg `:238`. Unseen+Deaf returns before observe_object. */
async function mreadmsg(mtmp, otmp) {
    const vismon = canseemon(mtmp);
    let tpindicator = !vismon && sensemon(mtmp);
    const u = game.u || {};
    const deaf = (u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf;
    if (!vismon && deaf) return;

    observe_object(otmp);
    const onambuf = singular(otmp, vismon ? doname : ansimpleoname);
    if (vismon) {
        await pline_mon(mtmp, `${Monnam(mtmp)} reads ${onambuf}!`);
    } else {
        const similar = same_race(game.youmonst?.data, mtmp.data);
        const uniqmon = !!(((mtmp.data?.geno | 0) & G_UNIQ) || mtmp.isshk);
        const recognize = !Hallucination()
            && (mtmp.meverseen || (similar && !uniqmon));
        const mflags = SUPPRESS_INVISIBLE | SUPPRESS_SADDLE
            | (recognize ? SUPPRESS_IT : AUGMENT_IT);
        if (sensemon(mtmp)) tpindicator = true;
        else if (couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 10 * 10) {
            map_invisible(mtmp.mx, mtmp.my);
        }
        let blindbuf = `reading ${onambuf}`;
        blindbuf = strsubst(blindbuf, 'reading a scroll labeled',
            mtmp.mconf ? 'attempting to incant' : 'incant');
        await You_hear(
            `${x_monnam(mtmp, ARTICLE_A, null, mflags, false)} ${blindbuf}.`,
        );
        if (tpindicator) await flash_mon(mtmp);
    }
    if (mtmp.mconf) {
        await pline(
            `Being confused, ${vismon ? mon_nam(mtmp) : mhe(mtmp)} mispronounces the magic words...`,
        );
    }
}

/** C ref: muse.c reveal_trap `:753` — SCORR niche becomes CORR. */
function reveal_trap(t, seeit) {
    if (!t) return;
    const lev = game.level?.at?.(t.tx, t.ty);
    if (lev && (lev.typ | 0) === SCORR) {
        lev.typ = CORR;
        lev.flags = 0;
        unblock_point(t.tx, t.ty);
    }
    if (seeit) seetrap(t);
}

/** C ref: wizard.c mon_has_special `:116` — oartifact >= ART_ORB_OF_DETECTION. */
function mon_has_special(mtmp) {
    for (let otmp = mtmp?.minvent; otmp; otmp = otmp.nobj) {
        const otyp = otmp.otyp | 0;
        if (otyp === AMULET_OF_YENDOR
            || (otmp.oartifact | 0) >= ART_ORB_OF_DETECTION
            || otyp === BELL_OF_OPENING
            || otyp === CANDELABRUM_OF_INVOCATION
            || otyp === SPE_BOOK_OF_THE_DEAD) {
            return 1;
        }
    }
    return 0;
}

/** C ref: muse.c mon_escape `:779` — dungeon exit; specials stay. */
async function mon_escape(mtmp, vismon) {
    if (mon_has_special(mtmp)
        || (mtmp.iswiz && ((game.context?.no_of_wizards | 0) < 2))) {
        return 0;
    }
    if (vismon) {
        await pline_mon(mtmp, `${Monnam(mtmp)} escapes the dungeon!`);
    }
    await mongone(mtmp);
    return 2;
}

/** C ref: muse.c m_tele `:383` — tele_restrict / amulet rn2(3) / rloc or trap. */
async function m_tele(mtmp, vismon, oseen, how) {
    if (await tele_restrict(mtmp)) {
        if (vismon && how) makeknown(how);
        if (noteleport_level(mtmp)) mon_learns_traps(mtmp, TELEP_TRAP);
    } else if ((mon_has_amulet(mtmp) || On_W_tower_level(game.u?.uz))
        && !rn2(3)) {
        if (vismon) {
            await pline_mon(
                mtmp, `${Monnam(mtmp)} seems disoriented for a moment.`,
            );
        }
    } else if (how) {
        if (oseen) makeknown(how);
        await rloc(mtmp, RLOC_MSG);
    } else {
        const m = museState();
        mtmp.mx = m.trapx | 0;
        mtmp.my = m.trapy | 0;
        await mintrap(mtmp, FORCETRAP);
    }
}

/** C ref: muse.c mcould_eat_tin `:3000` — opener / dagger / knife; welded mwep. */
function mcould_eat_tin(mon) {
    if (is_animal(mon?.data)) return false;
    const mwep = MON_WEP(mon);
    const welded_wep = !!(mwep && mwelded(mwep));
    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        if (welded_wep && obj !== mwep) continue;
        if ((obj.otyp | 0) === TIN_OPENER) return true;
        if ((obj.oclass | 0) === WEAPON_CLASS) {
            const sk = game.objects?.[obj.otyp]?.oc_skill | 0;
            if (sk === P_DAGGER || sk === P_KNIFE) return true;
        }
    }
    return false;
}

/** C ref: muse.c mon_consume_unstone `:2905`. Lizard from use_defensive is stoning=FALSE. */
async function mon_consume_unstone(mon, obj, by_you, stoning) {
    const vis = canseemon(mon);
    const tinned = (obj.otyp | 0) === TIN;
    const food = (obj.otyp | 0) === CORPSE || tinned;
    const acid = (obj.otyp | 0) === POT_ACID
        || (food && acidic(mons(obj.corpsenm)));
    const lizard = food && (obj.corpsenm | 0) === PM_LIZARD;
    const nutrit = food ? dog_nutrition(mon, obj) : 0;

    if (stoning) await mon_adjust_speed(mon, -3, null);

    if (vis) {
        const save_quan = obj.quan;
        obj.quan = 1;
        const verb = (obj.oclass === POTION_CLASS) ? 'quaffs'
            : ((obj.otyp | 0) === TIN) ? 'opens and eats the contents of'
            : 'eats';
        await pline_mon(mon, `${Monnam(mon)} ${verb} ${distant_name(obj, doname)}.`);
        obj.quan = save_quan;
    } else {
        const u = game.u || {};
        const deaf = (u.HDeaf | 0) || (u.EDeaf | 0)
            || u.uroleplay?.deaf || u.Deaf;
        if (!deaf) {
            await You_hear(
                `${obj.oclass === POTION_CLASS ? 'drinking' : 'chewing'}.`);
        }
    }
    m_useup(mon, obj);
    if (acid && !tinned && !resists_acid(mon)) {
        mon.mhp = (mon.mhp | 0) - rnd(15);
        if (vis) {
            await pline_mon(mon,
                `${Monnam(mon)} has a very bad case of stomach acid.`);
        }
        if ((mon.mhp | 0) < 1) {
            await pline_mon(mon, `${Monnam(mon)} dies!`);
            if (by_you) await xkilled(mon, XKILL_NOMSG | XKILL_NOCONDUCT);
            else mondead(mon);
            return;
        }
    }
    if (stoning && vis) {
        if (Hallucination()) {
            await pline(`What a pity - ${mon_nam(mon)} just ruined a future piece of art!`);
        } else {
            await pline_mon(mon, `${Monnam(mon)} seems limber!`);
        }
    }
    if (lizard && (mon.mconf || mon.mstun)) {
        mon.mconf = 0;
        mon.mstun = 0;
        if (vis && !is_bat(mon.data) && (mon.data?.mndx | 0) !== PM_STALKER) {
            await pline_mon(mon, `${Monnam(mon)} seems steadier now.`);
        }
    }
    if (mon.mtame && !mon.isminion && nutrit > 0) {
        const edog = EDOG(mon);
        if (edog) {
            const moves = game.moves | 0;
            if ((edog.hungrytime | 0) < moves) edog.hungrytime = moves;
            edog.hungrytime = (edog.hungrytime | 0) + nutrit;
        }
        mon.mconf = 0;
    }
    mon.movement = (mon.movement | 0) - NORMAL_SPEED;
    mon.mlstmv = game.moves | 0;
}

/**
 * C ref: muse.c cures_stoning `:2985` — potion of acid, slime glob (for the
 * slimeproof), lizard or acidic corpse, or openable lizard/acidic tin.
 * Also used when picking up (searches_for_item FOOD_CLASS arms).
 */
function cures_stoning(mon, obj, tinok) {
    if ((obj.otyp | 0) === POT_ACID) return true;
    if ((obj.otyp | 0) === GLOB_OF_GREEN_SLIME) {
        return !!slimeproof(mon.data);
    }
    if ((obj.otyp | 0) !== CORPSE && ((obj.otyp | 0) !== TIN || !tinok)) {
        return false;
    }
    /* corpse, or tin that mon can open */
    if ((obj.corpsenm | 0) === NON_PM) return false; /* empty/special tin */
    return (obj.corpsenm | 0) === PM_LIZARD
        || !!acidic(mons(obj.corpsenm));
}

/**
 * C ref: muse.c cures_sliming `:3246` — scroll of fire (needs eyes + hands),
 * potion of oil (needs hands; lit later), or charged wand / blowable horn
 * of fire. Called from munslime's inventory scan.
 */
function cures_sliming(mon, obj) {
    /* scroll of fire */
    if ((obj.otyp | 0) === SCR_FIRE) {
        return !!(haseyes(mon.data) && mon.mcansee && !nohands(mon.data));
    }

    /* potion of oil; will be set burning if not already */
    if ((obj.otyp | 0) === POT_OIL) return !nohands(mon.data);

    /* non-empty wand or horn of fire;
       hero doesn't need hands or even limbs to zap, so mon doesn't either */
    return (((obj.otyp | 0) === WAN_FIRE
        || ((obj.otyp | 0) === FIRE_HORN && can_blow(mon)))
        && (obj.spe | 0) > 0);
}

/**
 * C ref: muse.c green_mon `:3269` — TRUE if the monster appears green, by
 * display color. The `#if 0` name approximation is compiled out in C.
 */
function green_mon(mon) {
    if (Hallucination()) return false;
    const mc = mon.data?.mcolor;
    return mc === CLR_GREEN || mc === CLR_BRIGHT_GREEN;
}

/**
 * C ref: muse.c munslime `:3031` — monster avoids turning into green slime:
 * fire breath on self, an inventory cure, or a step onto a fire trap.
 * Async: the cure path (muse_unslime) can zap, explode, or trap-kill.
 * No live JS caller yet; the uhitm.c mhitm_ad_slim arms own the calls.
 */
export async function munslime(mon, by_you) {
    const mptr = mon.data;

    /*
     * muse_unslime() gives "mon starts turning green", "mon zaps
     * itself with a wand of fire", and "mon's slime burns away"
     * messages.  Monsters who don't get any chance at that just have
     * (via our caller) newcham()'s "mon turns into slime" feedback.
     */
    if (slimeproof(mptr)) return false;
    /* C monst.h helpless() macro: msleeping || !mcanmove */
    if (mon.meating || mon.msleeping || !mon.mcanmove) return false;
    mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITFORU;

    /* if monster can breathe fire, do so upon self */
    if (!mon.mcan && !mon.mspec_used
        && attacktype_fordmg(mptr, AT_BREA, AD_FIRE)) {
        const odummy = { otyp: STRANGE_OBJECT }; /* C: cg.zeroobj */
        return await muse_unslime(mon, odummy, null, by_you);
    }

    /* same MUSE criteria as use_defensive() */
    if (!is_animal(mptr) && !mindless(mptr)) {
        let t = t_at(mon.mx, mon.my);

        for (let obj = mon.minvent; obj; obj = obj.nobj) {
            if (cures_sliming(mon, obj)) {
                return await muse_unslime(mon, obj, null, by_you);
            }
        }

        if ((!t || (t.ttyp | 0) !== FIRE_TRAP)
            && (mptr?.mmove | 0) && !mon.mtrapped) {
            const ux = game.u?.ux | 0, uy = game.u?.uy | 0;
            const xs = [], ys = [];
            for (let x = (mon.mx | 0) - 1; x <= (mon.mx | 0) + 1; ++x) {
                for (let y = (mon.my | 0) - 1; y <= (mon.my | 0) + 1; ++y) {
                    if (isok(x, y) && accessible(x, y)
                        && !m_at(x, y) && (x !== ux || y !== uy)) {
                        xs.push(x);
                        ys.push(y);
                    }
                }
            }
            /* C: partial Fisher-Yates via rn1(nxy - idx, idx) */
            for (let idx = 0; idx < xs.length; ++idx) {
                const ridx = rn1(xs.length - idx, idx);
                if (ridx !== idx) {
                    const sx = xs[idx];
                    xs[idx] = xs[ridx];
                    xs[ridx] = sx;
                    const sy = ys[idx];
                    ys[idx] = ys[ridx];
                    ys[ridx] = sy;
                }
                t = t_at(xs[idx], ys[idx]);
                if (t && (t.ttyp | 0) === FIRE_TRAP) break;
            }
        }
        if (t && (t.ttyp | 0) === FIRE_TRAP) {
            return await muse_unslime(mon, hands_obj, t, by_you);
        }
    }

    return false;
}

/**
 * C ref: muse.c muse_unslime `:3104` — burn off slime via fire trap, fire
 * breath, fire scroll, burning oil, or wand/horn of fire. A fatal burn
 * credits by_you via xkilled. Async: mintrap/zhitm/explode/xkilled/monkilled.
 */
async function muse_unslime(mon, obj, trap, by_you) {
    /* [by_you not honored if 'mon' triggers fire trap]. */
    const otyp = obj.otyp | 0;
    let dmg = 0;
    let vis = canseemon(mon);
    let res = true;

    if (vis) {
        await pline_mon(mon, `${Monnam(mon)} starts turning ${
            green_mon(mon) ? 'into ooze' : hcolor(NH_GREEN)}.`);
    }
    /* -4 => sliming, causes quiet loss of enhanced speed */
    await mon_adjust_speed(mon, -4, null);

    if (trap) {
        const Mnam = vis ? Monnam(mon) : null;

        if ((mon.mx | 0) === (trap.tx | 0)
            && (mon.my | 0) === (trap.ty | 0)) {
            if (vis) {
                await pline(
                    `${Mnam} triggers ${trap.tseen ? 'the' : 'a'} fire trap!`);
            }
        } else {
            remove_monster(mon.mx, mon.my);
            newsym(mon.mx, mon.my);
            place_monster(mon, trap.tx, trap.ty);
            if (mon.wormno) worm_move(mon); /* won't happen; worms don't MUSE */
            newsym(mon.mx, mon.my);
            if (vis) {
                await pline(`${Mnam} ${
                    vtense(null, locomotion(mon.data, 'move'))
                } ${is_floater(mon.data) ? 'over' : 'onto'} ${
                    trap.tseen ? 'the' : 'a'} fire trap!`);
            }
        }
        await mintrap(mon, FORCETRAP);
    } else if (otyp === STRANGE_OBJECT) {
        /* monster is using fire breath on self */
        if (vis) {
            await pline_mon(mon,
                `${monverbself(mon, Monnam(mon), 'breath', 'fire on')}.`);
        }
        if (!rn2(3)) mon.mspec_used = rn1(10, 5);
        /* -21 => monster's fire breath; 1 => # of damage dice */
        dmg = await zhitm(mon, by_you ? 21 : -21, 1, { otmp: null });
    } else if (otyp === SCR_FIRE) {
        await mreadmsg(mon, obj);
        if (mon.mconf) {
            if (cansee(mon.mx, mon.my)) {
                await pline('Oh, what a pretty fire!');
            }
            if (vis) await trycall(obj);
            m_useup(mon, obj); /* after trycall() */
            vis = false; /* skip makeknown() below */
            res = false; /* failed to cure sliming */
        } else {
            dmg = Math.trunc((2 * (rn1(3, 3) + 2 * bcsign(obj)) + 1) / 3);
            m_useup(mon, obj); /* before explode() */
            /* -11 => monster's fireball */
            await explode(mon.mx, mon.my, -11, dmg, SCROLL_CLASS,
                by_you ? -EXPL_FIERY : EXPL_FIERY);
            dmg = 0; /* damage has been applied by explode() */
        }
    } else if (otyp === POT_OIL) {
        const was_lit = obj.lamplit ? true : false;
        let saw_lit = false;
        /*
         * If not already lit, requires two actions.  We cheat and let
         * monster do both rather than render the potion unusable.
         */
        if ((obj.quan | 0) > 1) {
            const split = splitobj(obj, 1);
            if (split) obj = split;
        }
        if (vis && !was_lit) {
            await pline_mon(mon,
                `${Monnam(mon)} ignites ${ansimpleoname(obj)}.`);
            saw_lit = true;
        }
        begin_burn(obj, was_lit);
        vis = vis || canseemon(mon); /* burning potion may improve visibility */
        if (vis) {
            if (!Unaware()) observe_object(obj);
            await pline(
                `${saw_lit ? upstart(mhe(mon)) : Monnam(mon)} quaffs a burning ${
                    simpleonames(obj)}`);
            makeknown(POT_OIL);
        }
        dmg = d(3, 4); /* [**TEMP** (different from hero)] */
        m_useup(mon, obj);
    } else { /* wand/horn of fire w/ positive charge count */
        if ((obj.otyp | 0) === FIRE_HORN) await mplayhorn(mon, obj, true);
        else await mzapwand(mon, obj, true);
        /* -1 => monster's wand of fire; 2 => # of damage dice */
        dmg = await zhitm(mon, by_you ? 1 : -1, 2, { otmp: null });
    }

    if (dmg) {
        /* zhitm() applies damage but doesn't kill creature off */
        if ((mon.mhp | 0) < 1) { /* DEADMONSTER(mon) */
            if (by_you) {
                /* mon killed self but hero gets credit and blame (except
                   for pacifist conduct) */
                if (vis) {
                    await pline_mon(mon, `${Monnam(mon)} is ${
                        nonliving(mon.data) ? 'destroyed' : 'killed'
                    } by the fire!`);
                }
                await xkilled(mon, XKILL_NOMSG | XKILL_NOCONDUCT);
            } else {
                await monkilled(mon, 'fire', AD_FIRE);
            }
        } else if (vis) {
            /* non-fatal damage occurred; C zap.c exclam(): <0 "?", <=4 ".", else "!" */
            const bang = dmg < 0 ? '?' : dmg <= 4 ? '.' : '!';
            await pline_mon(mon, `${Monnam(mon)} is burned${bang}`);
        }
    }
    if (vis) {
        if (res && (mon.mhp | 0) >= 1) {
            await pline_mon(mon,
                `${s_suffix(Monnam(mon))} slime is burned away!`);
        }
        if (otyp !== STRANGE_OBJECT) makeknown(otyp);
    }
    /* use up monster's next move */
    mon.movement = (mon.movement | 0) - NORMAL_SPEED;
    mon.mlstmv = game.moves | 0;
    return res;
}

/** C muse.c m_flee macro — fleetim && !iswiz then monflee. */
async function m_flee(m, fleetim) {
    if (fleetim && !m.iswiz) await monflee(m, fleetim, false, false);
}

/**
 * C ref: muse.c mcureblindness.
 * Caller: zap.c bhitm SPE_HEALING/SPE_EXTRA_HEALING (D-1469).
 */
export async function mcureblindness(mon, verbos) {
    if (!mon?.mcansee) {
        mon.mcansee = 1;
        mon.mblinded = 0;
        if (verbos && haseyes(mon.data)) {
            await pline(`${Monnam(mon)} can see again.`);
        }
    }
}

/**
 * C ref: muse.c m_use_healing — full/extra/healing potion select.
 */
function m_use_healing(mtmp) {
    const m = museState();
    let obj = m_carrying(mtmp, POT_FULL_HEALING);
    if (obj) {
        m.defensive = obj;
        m.has_defense = MUSE_POT_FULL_HEALING;
        return true;
    }
    obj = m_carrying(mtmp, POT_EXTRA_HEALING);
    if (obj) {
        m.defensive = obj;
        m.has_defense = MUSE_POT_EXTRA_HEALING;
        return true;
    }
    obj = m_carrying(mtmp, POT_HEALING);
    if (obj) {
        m.defensive = obj;
        m.has_defense = MUSE_POT_HEALING;
        return true;
    }
    return false;
}

/**
 * C ref: muse.c find_defensive `:439`.
 * Named omit: unicorn horn; tryescape Is_knox m_next2m; undead-turning;
 * bugle; wand dig/tele/create/undead (later scroll may win vs C wand).
 */
/**
 * C ref: muse.c m_sees_sleepy_soldier `:361` — a mercenary bugler wakes when
 * a non-guard mercenary nearby is helpless. Ported for the find_defensive
 * MUSE_BUGLE selection arm; selection stays omitted until the MUSE_BUGLE
 * use arm lands (needs the monster-bugler awaken_soldiers envelope).
 */
function m_sees_sleepy_soldier(mtmp) {
    const x = mtmp.mx | 0, y = mtmp.my | 0;

    /* Distance is arbitrary.  What we really want to do is
     * have the soldier play the bugle when it sees or
     * remembers soldiers nearby...
     */
    for (let xx = x - 3; xx <= x + 3; xx++) {
        for (let yy = y - 3; yy <= y + 3; yy++) {
            if (!isok(xx, yy) || (xx === x && yy === y)) continue;
            const mon = m_at(xx, yy);
            /* C monst.h helpless() macro: msleeping || !mcanmove */
            if (mon && is_mercenary(mon.data)
                && (mon.data?.mndx ?? -1) !== PM_GUARD
                && (mon.msleeping || !mon.mcanmove)) {
                return true;
            }
        }
    }
    return false;
}

export function find_defensive(mtmp, tryescape) {
    const m = museState();
    m.defensive = null;
    m.has_defense = 0;

    if (!mtmp?.data) return false;
    if (is_animal(mtmp.data) || mindless(mtmp.data)) return false;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    if (!tryescape && dist2(x, y, mtmp.mux, mtmp.muy) > 25) {
        return false;
    }
    // C tryescape && Is_knox && !m_next2u && m_next2m — m_next2m named omit
    if (game.u?.uswallow && mtmp === game.u?.ustuck) return false;

    // Unicorn horn (mconf/mstun/blind) named omit
    if (mtmp.mconf || mtmp.mstun) {
        let liztin = null;
        for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
            if ((obj.otyp | 0) === CORPSE && (obj.corpsenm | 0) === PM_LIZARD) {
                m.defensive = obj;
                m.has_defense = MUSE_LIZARD_CORPSE;
                return true;
            }
            if ((obj.otyp | 0) === TIN && (obj.corpsenm | 0) === PM_LIZARD) {
                liztin = obj;
            }
        }
        if (liztin && mcould_eat_tin(mtmp) && rn2(3)) {
            m.defensive = liztin;
            m.has_defense = MUSE_LIZARD_CORPSE;
            return true;
        }
    }

    if (!mtmp.mcansee && !nohands(mtmp.data)
        && (mtmp.data?.mndx ?? mtmp.mnum) !== PM_PESTILENCE) {
        if (m_use_healing(mtmp)) return true;
    }
    // WAN_UNDEAD_TURNING named omit

    if (!tryescape) {
        const ulevel = game.u?.ulevel | 0;
        const fraction = ulevel < 10 ? 5 : ulevel < 14 ? 4 : 3;
        const mhp = mtmp.mhp | 0;
        const mhpmax = mtmp.mhpmax | 0;
        if (mhp >= mhpmax
            || (mhp >= 10 && mhp * fraction >= mhpmax)) {
            return false;
        }
        if (mtmp.mpeaceful) {
            if (!nohands(mtmp.data)) return m_use_healing(mtmp);
            return false;
        }
    }

    const stuck = mtmp === game.u?.ustuck;
    const immobile = (mtmp.data?.mmove | 0) === 0;
    if (!(stuck || immobile || mtmp.mtrapped)) {
        const loc = game.level?.at?.(x, y);
        const typ = loc?.typ | 0;
        const stway = (typ === STAIRS || typ === LADDER)
            ? stairway_at(x, y) : null;
        const uz = game.u?.uz;
        if (typ === STAIRS) {
            if (stway && !stway.up && (stway.tolev?.dnum | 0) === (uz?.dnum | 0)) {
                if (!is_floater(mtmp.data)) m.has_defense = MUSE_DOWNSTAIRS;
            } else if (stway && stway.up
                && (stway.tolev?.dnum | 0) === (uz?.dnum | 0)) {
                m.has_defense = MUSE_UPSTAIRS;
            } else if (stway && (stway.tolev?.dnum | 0) !== (uz?.dnum | 0)) {
                if (stway.up || !is_floater(mtmp.data)) {
                    m.has_defense = MUSE_SSTAIRS;
                }
            }
        } else if (typ === LADDER) {
            if (stway && stway.up && (stway.tolev?.dnum | 0) === (uz?.dnum | 0)) {
                m.has_defense = MUSE_UP_LADDER;
            } else if (stway && !stway.up
                && (stway.tolev?.dnum | 0) === (uz?.dnum | 0)) {
                if (!is_floater(mtmp.data)) m.has_defense = MUSE_DN_LADDER;
            } else if (stway && (stway.tolev?.dnum | 0) !== (uz?.dnum | 0)) {
                if (stway.up || !is_floater(mtmp.data)) {
                    m.has_defense = MUSE_SSTAIRS;
                }
            }
        } else {
            const ignore_boulders = verysmall(mtmp.data)
                || throws_rocks(mtmp.data)
                || passes_walls(mtmp.data);
            const diag_ok = (mtmp.data?.mndx | 0) !== PM_GRID_BUG;
            const locs = [[x, y]];
            for (let xx = x - 1; xx <= x + 1; xx++) {
                for (let yy = y - 1; yy <= y + 1; yy++) {
                    if (isok(xx, yy) && (xx !== x || yy !== y)) {
                        locs.push([xx, yy]);
                    }
                }
            }
            for (let i = 0; i < locs.length; i++) {
                const xx = locs[i][0], yy = locs[i][1];
                if (u_at(xx, yy)
                    || (xx !== x && yy !== y && !diag_ok)
                    || (m_at(xx, yy) && !(xx === x && yy === y))) {
                    continue;
                }
                const t = t_at(xx, yy);
                if (!t) continue;
                let boulder = null;
                for (let o = objects_at(xx, yy); o; o = o.nexthere) {
                    if ((o.otyp | 0) === BOULDER) { boulder = o; break; }
                }
                if ((!ignore_boulders && boulder) || onscary(xx, yy, mtmp)) {
                    continue;
                }
                if (is_hole(t.ttyp)
                    && !is_floater(mtmp.data)
                    && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
                    && Can_fall_thru(game.u?.uz)) {
                    m.trapx = xx;
                    m.trapy = yy;
                    m.has_defense = MUSE_TRAPDOOR;
                    break;
                } else if ((t.ttyp | 0) === TELEP_TRAP) {
                    m.trapx = xx;
                    m.trapy = yy;
                    m.has_defense = MUSE_TELEPORT_TRAP;
                }
            }
        }
    }

    if (nohands(mtmp.data)) return m.has_defense !== 0;
    // bugle named omit (m_sees_sleepy_soldier live; MUSE_BUGLE select+use
    // needs monster-bugler awaken_soldiers)
    if (m.has_defense) return true;

    const isPest = (mtmp.mnum ?? mtmp.data?.mndx) === PM_PESTILENCE;
    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (m.has_defense && !rn2(3)) break;
        // WAN_DIGGING / WAN_TELEPORTATION named omit
        if (m.has_defense === MUSE_SCR_TELEPORTATION) continue;
        if ((obj.otyp | 0) === SCR_TELEPORTATION && mtmp.mcansee
            && haseyes(mtmp.data)
            && (!obj.cursed
                || (!(mtmp.isshk && inhishop(mtmp))
                    && !mtmp.isgd && !mtmp.ispriest))) {
            if (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                m.defensive = obj;
                m.has_defense = MUSE_SCR_TELEPORTATION;
            }
        }
        if (!isPest) {
            if (m.has_defense === MUSE_POT_FULL_HEALING) continue;
            if (obj.otyp === POT_FULL_HEALING) {
                m.defensive = obj;
                m.has_defense = MUSE_POT_FULL_HEALING;
            }
            if (m.has_defense === MUSE_POT_EXTRA_HEALING) continue;
            if (obj.otyp === POT_EXTRA_HEALING) {
                m.defensive = obj;
                m.has_defense = MUSE_POT_EXTRA_HEALING;
            }
            // WAN_CREATE_MONSTER named omit
            if (m.has_defense === MUSE_POT_HEALING) continue;
            if (obj.otyp === POT_HEALING) {
                m.defensive = obj;
                m.has_defense = MUSE_POT_HEALING;
            }
        } else if (obj.otyp === POT_SICKNESS) {
            if (m.has_defense === MUSE_POT_FULL_HEALING) continue;
            m.defensive = obj;
            m.has_defense = MUSE_POT_FULL_HEALING;
        }
        if (m.has_defense === MUSE_SCR_CREATE_MONSTER) continue;
        if ((obj.otyp | 0) === SCR_CREATE_MONSTER) {
            m.defensive = obj;
            m.has_defense = MUSE_SCR_CREATE_MONSTER;
        }
    }
    return m.has_defense !== 0;
}

/**
 * C ref: dungeon.c Can_rise_up — cursed gain-level escape upward.
 * Named omission: Is_wiz1_level && In_W_tower; entry_lev special stair.
 */
function Can_rise_up(_x, _y, lev) {
    if (In_endgame(lev) || In_sokoban(lev)) return false;
    return (lev?.dlevel | 0) > 1;
}

function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

function on_level(a, b) {
    return (a?.dnum | 0) === (b?.dnum | 0) && (a?.dlevel | 0) === (b?.dlevel | 0);
}

/**
 * C ref: makemon.c grow_up(mtmp, NULL) — potion/wraith envelope.
 * Named omission: little_to_big form change / geno death.
 */
function grow_up_potion(mtmp) {
    const gain = rnd(8);
    mtmp.mhpmax = (mtmp.mhpmax | 0) + gain;
    mtmp.mhp = (mtmp.mhp | 0) + gain;
    mtmp.m_lev = (mtmp.m_lev | 0) + 1;
    return true;
}

/**
 * C ref: worn.c mon_set_minvis — permanent invis from potion/wand.
 * Worm segments / newsym polish deferred.
 */
function mon_set_minvis(mon, cursed_potion) {
    mon.perminvis = cursed_potion ? 0 : 1;
    if (!mon.invis_blkd) {
        mon.minvis = mon.perminvis;
    }
}

/** C youprop.h See_invisible */
function See_invisible() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0) || u.See_invisible);
}

/**
 * C ref: muse.c find_misc — gain-level, bullwhip rn2(5), invis, speed,
 * poly trap/wand/potion, bag rn2(5).
 * Named omission: C nomore() skip-rest-of-this-obj on already-ported
 * whip/invis/speed still uses per-check `!==` rather than continue.
 */
export function find_misc(mtmp) {
    const m = museState();
    m.misc = null;
    m.has_misc = 0;

    if (!mtmp?.data) return false;
    if (is_animal(mtmp.data) || mindless(mtmp.data)) return false;
    if (game.u?.uswallow && mtmp === game.u?.ustuck) return false;
    if (dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > 36) return false;

    const stuck = mtmp === game.u?.ustuck;
    const immobile = (mtmp.data?.mmove | 0) === 0;
    const pmidx = mtmp.data?.mndx ?? mtmp.mnum ?? NON_PM;
    if (!stuck && !immobile && !mtmp.mtrapped
        && (mtmp.cham ?? NON_PM) === NON_PM
        && ((mons(pmidx)?.difficulty ?? mtmp.data?.difficulty) | 0) < 6) {
        const ignore_boulders = verysmall(mtmp.data)
            || throws_rocks(mtmp.data)
            || passes_walls(mtmp.data);
        const diag_ok = pmidx !== PM_GRID_BUG;
        const x = mtmp.mx | 0, y = mtmp.my | 0;
        for (let xx = x - 1; xx <= x + 1; xx++) {
            for (let yy = y - 1; yy <= y + 1; yy++) {
                if (!isok(xx, yy) || u_at(xx, yy)) continue;
                if (!diag_ok && xx !== x && yy !== y) continue;
                if (!(xx === x && yy === y) && m_at(xx, yy)) continue;
                const t = t_at(xx, yy);
                if (!t) continue;
                let boulder = null;
                for (let o = objects_at(xx, yy); o; o = o.nexthere) {
                    if ((o.otyp | 0) === BOULDER) { boulder = o; break; }
                }
                if ((!ignore_boulders && boulder) || onscary(xx, yy, mtmp)) {
                    continue;
                }
                if ((t.ttyp | 0) === POLY_TRAP && !wearing_iron_shoes(mtmp)) {
                    m.trapx = xx;
                    m.trapy = yy;
                    m.has_misc = MUSE_POLY_TRAP;
                    return true;
                }
            }
        }
    }
    if (nohands(mtmp.data)) return false;

    const u = game.u || {};
    const uwep = u.uwep;

    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        /* Monsters shouldn't recognize cursed items; this kludge is
           necessary to prevent serious problems though... */
        if (obj.otyp === POT_GAIN_LEVEL
            && (!obj.cursed
                || (!mtmp.isgd && !mtmp.isshk && !mtmp.ispriest))) {
            m.misc = obj;
            m.has_misc = MUSE_POT_GAIN_LEVEL;
        }
        // C: nomore(MUSE_BULLWHIP)
        if (m.has_misc !== MUSE_BULLWHIP
            && obj.otyp === BULLWHIP && !mtmp.mpeaceful
            /* C short-circuit: uwep && !rn2(5) before MON_WEP / adjacency */
            && uwep && !rn2(5) && obj === MON_WEP(mtmp)
            && u_at(mtmp.mux, mtmp.muy)
            && m_next2u(mtmp)
            && !u.uswallow
            && (canletgo_silent(uwep)
                || (u.twoweap && canletgo_silent(u.uswapwep)))) {
            m.misc = obj;
            m.has_misc = MUSE_BULLWHIP;
        }
        /* Note: peaceful/tame monsters won't make themselves
         * invisible unless you can see them.  Not really right, but... */
        if (m.has_misc !== MUSE_WAN_MAKE_INVISIBLE
            && obj.otyp === WAN_MAKE_INVISIBLE && (obj.spe | 0) > 0
            && !mtmp.minvis && !mtmp.invis_blkd
            && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, AT_GAZE) || mtmp.mcan)) {
            m.misc = obj;
            m.has_misc = MUSE_WAN_MAKE_INVISIBLE;
        }
        if (m.has_misc !== MUSE_POT_INVISIBILITY
            && obj.otyp === POT_INVISIBILITY
            && !mtmp.minvis && !mtmp.invis_blkd
            && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, AT_GAZE) || mtmp.mcan)) {
            m.misc = obj;
            m.has_misc = MUSE_POT_INVISIBILITY;
        }
        if (obj.otyp === WAN_SPEED_MONSTER && (obj.spe | 0) > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            m.misc = obj;
            m.has_misc = MUSE_WAN_SPEED_MONSTER;
        }
        if (obj.otyp === POT_SPEED
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            m.misc = obj;
            m.has_misc = MUSE_POT_SPEED;
        }
        // C: nomore(MUSE_WAN_POLYMORPH)
        if (m.has_misc === MUSE_WAN_POLYMORPH) continue;
        if (obj.otyp === WAN_POLYMORPH && (obj.spe | 0) > 0
            && (mtmp.cham ?? NON_PM) === NON_PM
            && ((mons(pmidx)?.difficulty ?? mtmp.data?.difficulty) | 0) < 6) {
            m.misc = obj;
            m.has_misc = MUSE_WAN_POLYMORPH;
        }
        if (m.has_misc === MUSE_POT_POLYMORPH) continue;
        if (obj.otyp === POT_POLYMORPH
            && (mtmp.cham ?? NON_PM) === NON_PM
            && ((mons(pmidx)?.difficulty ?? mtmp.data?.difficulty) | 0) < 6) {
            m.misc = obj;
            m.has_misc = MUSE_POT_POLYMORPH;
        }
        if (m.has_misc === MUSE_BAG) continue;
        if (Is_container(obj) && (obj.otyp | 0) !== BAG_OF_TRICKS && !rn2(5)
            && !SchroedingersBox(obj)
            && !m.has_misc && Has_contents(obj)
            && !obj.olocked && !obj.otrapped) {
            m.misc = obj;
            m.has_misc = MUSE_BAG;
        }
    }
    return m.has_misc !== 0;
}

/**
 * C ref: muse.c precheck — milky/smoky potion occupant + cursed wand backfire.
 * Ghost/djinni spawn body partial (enexto + makemon + messages);
 * non-fatal wand backfire clears muse selection like C.
 */
async function precheck(mon, obj) {
    if (!obj) return 0;
    const vis = cansee(mon.mx, mon.my);

    if (obj.oclass === POTION_CLASS) {
        if (objdescr_is(obj, 'milky')) {
            const mv = game.mvitals?.[PM_GHOST];
            if (!((mv?.mvflags ?? 0) & G_GONE)
                && !rn2(POTION_OCCUPANT_CHANCE(mv?.born ?? 0))) {
                const cc = { x: 0, y: 0 };
                if (!enexto(cc, mon.mx, mon.my, mons(PM_GHOST))) return 0;
                await mquaffmsg(mon, obj);
                m_useup(mon, obj);
                const mtmp = makemon(mons(PM_GHOST), cc.x, cc.y, MM_NOMSG);
                if (!mtmp) {
                    if (vis) await pline('The potion turns out to be empty.');
                } else {
                    if (vis) {
                        await pline(
                            `As ${mon_nam(mon)} opens the bottle, an enormous ghost emerges!`,
                        );
                        await pline(
                            `${Monnam(mon)} is frightened to death, and unable to move.`,
                        );
                    }
                    mon.mfrozen = (mon.mfrozen | 0) + 3;
                    mon.mcanmove = 0;
                }
                return 2;
            }
        }
        if (objdescr_is(obj, 'smoky')
            && !((game.mvitals?.[PM_DJINNI]?.mvflags ?? 0) & G_GONE)
            && !rn2(POTION_OCCUPANT_CHANCE(game.mvitals?.[PM_DJINNI]?.born ?? 0))) {
            // Djinni occupant — enexto/makemon/wish deferred; burn like empty
            const cc = { x: 0, y: 0 };
            if (!enexto(cc, mon.mx, mon.my, mons(PM_DJINNI))) return 0;
            await mquaffmsg(mon, obj);
            m_useup(mon, obj);
            const mtmp = makemon(mons(PM_DJINNI), cc.x, cc.y, MM_NOMSG);
            if (!mtmp) {
                if (vis) await pline('The potion turns out to be empty.');
            } else {
                // verbalize / rn2(2) peaceful — named omission beyond makemon
                if (!rn2(2)) {
                    mtmp.mpeaceful = 1;
                }
            }
            return 2;
        }
    }
    if (obj.oclass === WAND_CLASS && obj.cursed
        && !rn2(WAND_BACKFIRE_CHANCE)) {
        d((obj.spe | 0) + 2, 6);
        const m = museState();
        m.has_defense = 0;
        m.has_offense = 0;
        m.has_misc = 0;
        return 0;
    }
    return 0;
}

/**
 * C ref: muse.c use_defensive `:795`.
 * Named omit: unicorn horn, bugle, wand dig/tele/create/undead.
 */
export async function use_defensive(mtmp) {
    const m = museState();
    let otmp = m.defensive;
    const i = await precheck(mtmp, otmp);
    if (i !== 0) return i;
    const vis = cansee(mtmp.mx, mtmp.my);
    const vismon = canseemon(mtmp);
    const oseen = !!(otmp && vismon);
    const mhpmax = mtmp.mhpmax | 0;
    const fleetim = !mtmp.mflee
        ? (33 - Math.trunc((30 * (mtmp.mhp | 0)) / (mhpmax || 1)))
        : 0;

    switch (m.has_defense) {
    case MUSE_SCR_TELEPORTATION: {
        if (!otmp) return 0;
        const obj_is_cursed = !!otmp.cursed;
        if (mtmp.isshk || mtmp.isgd || mtmp.ispriest) return 2;
        await m_flee(mtmp, fleetim);
        if ((otmp.quan | 0) > 1) {
            const split = splitobj(otmp, 1);
            if (split) otmp = split;
        }
        extract_from_minvent(mtmp, otmp, false, false);
        if (!game.iflags) game.iflags = {};
        game.iflags.last_msg = PLNMSG_enum;
        await mreadmsg(mtmp, otmp);
        if (obj_is_cursed || mtmp.mconf) {
            const nlev = random_teleport_level();
            if (mon_has_amulet(mtmp) || In_endgame(game.u?.uz)) {
                if (vismon) {
                    await pline_mon(mtmp,
                        `${Monnam(mtmp)} seems very disoriented for a moment.`);
                }
            } else if (nlev === depth(game.u?.uz)) {
                if (vismon) {
                    await pline_mon(mtmp,
                        `${Monnam(mtmp)} shudders for a moment.`);
                }
            } else {
                const flev = { dnum: 0, dlevel: 0 };
                get_level(flev, nlev);
                migrate_to_level(mtmp, ledger_no(flev), MIGR_RANDOM, null);
            }
        } else {
            await m_tele(mtmp, vismon, oseen, SCR_TELEPORTATION);
        }
        if (otmp.dknown && (game.iflags.last_msg | 0) !== PLNMSG_enum) {
            await trycall(otmp);
        }
        obfree(otmp, null);
        return 2;
    }
    case MUSE_SCR_CREATE_MONSTER: {
        if (!otmp) return 0;
        let pm = null, fish = null, cnt = 1, known = false;
        if (!rn2(73)) cnt += rnd(4);
        if (mtmp.mconf || otmp.cursed) cnt += 12;
        if (mtmp.mconf) pm = fish = mons(PM_ACID_BLOB);
        else if (is_pool(mtmp.mx, mtmp.my)) {
            fish = mons(game.u?.uinwater ? PM_GIANT_EEL : PM_CROCODILE);
        }
        await mreadmsg(mtmp, otmp);
        while (cnt--) {
            const cc = { x: 0, y: 0 };
            if (!enexto(cc, mtmp.mx, mtmp.my, fish)) break;
            const mon = makemon(pm, cc.x, cc.y, NO_MM_FLAGS);
            if (mon && (canseemon(mon) || sensemon(mon))) known = true;
        }
        if (known) makeknown(SCR_CREATE_MONSTER);
        else await trycall(otmp);
        m_useup(mtmp, otmp);
        return 2;
    }
    case MUSE_TRAPDOOR: {
        if (Is_botlevel(game.u?.uz)) return 0;
        await m_flee(mtmp, fleetim);
        const t = t_at(m.trapx, m.trapy);
        if (vis && t) {
            const jump = vtense(null, locomotion(mtmp.data, 'jump'));
            await pline_mon(mtmp,
                `${Monnam(mtmp)} ${jump} into a ${trapname(t.ttyp, false)}!`);
        }
        reveal_trap(t, vis);
        const ox = mtmp.mx | 0, oy = mtmp.my | 0;
        remove_monster(ox, oy);
        newsym(ox, oy);
        place_monster(mtmp, m.trapx, m.trapy);
        if (mtmp.wormno) worm_move(mtmp);
        newsym(m.trapx, m.trapy);
        migrate_to_level(mtmp, ledger_no(game.u?.uz) + 1, MIGR_RANDOM, null);
        return 2;
    }
    case MUSE_UPSTAIRS: {
        await m_flee(mtmp, fleetim);
        const stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway) return 0;
        if (ledger_no(game.u?.uz) === 1) {
            return await mon_escape(mtmp, vismon);
        }
        if (Inhell() && mon_has_amulet(mtmp) && !rn2(4)
            && ((game.u?.uz?.dlevel | 0)
                < dunlevs_in_dungeon(game.u?.uz) - 3)) {
            if (vismon) {
                await pline(
                    `As ${mon_nam(mtmp)} climbs the stairs, a mysterious force momentarily surrounds ${mhim(mtmp)}...`,
                );
            }
            migrate_to_level(mtmp, ledger_no(game.u?.uz) + 1, MIGR_RANDOM, null);
        } else {
            if (vismon) {
                await pline_mon(mtmp, `${Monnam(mtmp)} escapes upstairs!`);
            }
            migrate_to_level(
                mtmp, ledger_no(stway.tolev), MIGR_STAIRS_DOWN, null);
        }
        return 2;
    }
    case MUSE_DOWNSTAIRS: {
        await m_flee(mtmp, fleetim);
        const stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway) return 0;
        if (vismon) {
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes downstairs!`);
        }
        migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_UP, null);
        return 2;
    }
    case MUSE_UP_LADDER: {
        await m_flee(mtmp, fleetim);
        const stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway) return 0;
        if (vismon) {
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes up the ladder!`);
        }
        migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_DOWN, null);
        return 2;
    }
    case MUSE_DN_LADDER: {
        await m_flee(mtmp, fleetim);
        const stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway) return 0;
        if (vismon) {
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes down the ladder!`);
        }
        migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_UP, null);
        return 2;
    }
    case MUSE_SSTAIRS: {
        await m_flee(mtmp, fleetim);
        const stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway) return 0;
        if (ledger_no(game.u?.uz) === 1) {
            return await mon_escape(mtmp, vismon);
        }
        if (vismon) {
            await pline_mon(mtmp,
                `${Monnam(mtmp)} escapes ${stway.up ? 'up' : 'down'}stairs!`);
        }
        migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_SSTAIRS, null);
        return 2;
    }
    case MUSE_TELEPORT_TRAP: {
        await m_flee(mtmp, fleetim);
        const t = t_at(m.trapx, m.trapy);
        if (vis && t) {
            const jump = vtense(null, locomotion(mtmp.data, 'jump'));
            await pline_mon(mtmp,
                `${Monnam(mtmp)} ${jump} onto a ${trapname(t.ttyp, false)}!`);
        }
        reveal_trap(t, vis);
        const ox = mtmp.mx | 0, oy = mtmp.my | 0;
        remove_monster(ox, oy);
        newsym(ox, oy);
        place_monster(mtmp, m.trapx, m.trapy);
        if (mtmp.wormno) worm_move(mtmp);
        await maybe_unhide_at(mtmp.mx, mtmp.my);
        newsym(m.trapx, m.trapy);
        await m_tele(mtmp, vismon, false, 0);
        return 2;
    }
    case MUSE_POT_HEALING: {
        if (!otmp) return 0;
        await mquaffmsg(mtmp, otmp);
        const heal = d(6 + 2 * bcsign(otmp), 4);
        healmon(mtmp, heal, 1);
        if (!otmp.cursed && !mtmp.mcansee) await mcureblindness(mtmp, vismon);
        if (vismon) await pline(`${Monnam(mtmp)} looks better.`);
        if (oseen) makeknown(POT_HEALING);
        m_useup(mtmp, otmp);
        return 2;
    }
    case MUSE_POT_EXTRA_HEALING: {
        if (!otmp) return 0;
        await mquaffmsg(mtmp, otmp);
        const heal = d(6 + 2 * bcsign(otmp), 8);
        healmon(mtmp, heal, otmp.blessed ? 5 : 2);
        if (!mtmp.mcansee) await mcureblindness(mtmp, vismon);
        if (vismon) await pline(`${Monnam(mtmp)} looks much better.`);
        if (oseen) makeknown(POT_EXTRA_HEALING);
        m_useup(mtmp, otmp);
        return 2;
    }
    case MUSE_POT_FULL_HEALING: {
        if (!otmp) return 0;
        await mquaffmsg(mtmp, otmp);
        if ((otmp.otyp | 0) === POT_SICKNESS) unbless(otmp);
        healmon(mtmp, mtmp.mhpmax | 0, otmp.blessed ? 8 : 4);
        if (!mtmp.mcansee && otmp.otyp !== POT_SICKNESS) {
            await mcureblindness(mtmp, vismon);
        }
        if (vismon) await pline(`${Monnam(mtmp)} looks completely healed.`);
        if (oseen) makeknown(otmp.otyp);
        m_useup(mtmp, otmp);
        return 2;
    }
    case MUSE_LIZARD_CORPSE: {
        if (!otmp) return 0;
        await mon_consume_unstone(mtmp, otmp, false, false);
        return 2;
    }
    case 0:
        return 0;
    default:
        // horn / bugle / remaining wands — named omit
        return 2;
    }
}

/**
 * C ref: muse.c mzapwand — message + charge--; unseen charge forget deferred.
 */
async function mzapwand(mtmp, otmp, self) {
    if ((otmp.spe | 0) < 1) return;
    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my)
            ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = mdistu(mtmp) <= range * range;
        await You_hear(`a ${near ? 'nearby' : 'distant'} zap.`);
        unknow_object(otmp);
    } else if (self) {
        // C muse.c `:183–185` — "%s with %s!" over
        // monverbself(mtmp, Monnam(mtmp), "zap", NULL): the wand-zapper
        // names itself ("<mon> zaps himself with <wand>!").
        await pline(
            `${monverbself(mtmp, Monnam(mtmp), 'zap', null)} with ${
                doname(otmp)}!`,
        );
    } else {
        // C: pline_mon("%s zaps %s!", Monnam, an(xname(otmp)))
        // C xname_flags observe_object sets dknown before WAND descr arm.
        // Full observe (discover_object) deferred — dknown alone for appearance.
        if (!game.u?.Blind) otmp.dknown = 1;
        await pline_mon(mtmp, `${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        await stop_occupation();
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/**
 * C ref: worn.c mon_adjust_speed — adjust/permspeed/mspeed + boots FAST.
 * give_msg pline + learnwand when speed change is seen (D-0871).
 * Named omit: worm see_wsegs polish on unrelated invis path.
 */
export async function mon_adjust_speed(mon, adjust, obj) {
    if (!mon) return;
    // C: give_msg = !gi.in_mklev; petrify = FALSE; oldspeed = mon->mspeed
    let give_msg = !game.in_mklev;
    let petrify = false;
    const oldspeed = mon.mspeed | 0;

    switch (adjust) {
    case 2:
        mon.permspeed = MFAST;
        give_msg = false; // special-case monster creation
        break;
    case 1:
        if (mon.permspeed === MSLOW) mon.permspeed = 0;
        else mon.permspeed = MFAST;
        break;
    case 0:
        break;
    case -1:
        if (mon.permspeed === MFAST) mon.permspeed = 0;
        else mon.permspeed = MSLOW;
        break;
    case -2:
        mon.permspeed = MSLOW;
        give_msg = false;
        break;
    case -3: // petrification
        if (mon.permspeed === MFAST) mon.permspeed = 0;
        petrify = true;
        break;
    case -4: // green slime
        if (mon.permspeed === MFAST) mon.permspeed = 0;
        give_msg = false;
        break;
    default:
        break;
    }

    let boots = null;
    for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) {
        // oc_oprop FAST not extracted; SPEED_BOOTS is the only FAST armor
        if (otmp.owornmask && otmp.otyp === SPEED_BOOTS) {
            boots = otmp;
            break;
        }
    }
    mon.mspeed = boots ? MFAST : (mon.permspeed | 0);

    // C: no message if immobile (temp or perm) or unseen
    if (give_msg && ((mon.mspeed | 0) !== oldspeed || petrify)
        && (mon.data?.mmove | 0)
        && !(mon.mfrozen || mon.msleeping) && canseemon(mon)) {
        const howmuch = ((mon.mspeed | 0) + oldspeed === MFAST + MSLOW)
            ? 'much ' : '';
        if (petrify) {
            if (game.flags?.verbose !== false) {
                await pline(`${Monnam(mon)} is slowing down.`);
            }
        } else if (adjust > 0 || (mon.mspeed | 0) === MFAST) {
            await pline(
                `${Monnam(mon)} is suddenly moving ${howmuch}faster.`,
            );
        } else {
            await pline(
                `${Monnam(mon)} seems to be moving ${howmuch}slower.`,
            );
        }
        if (obj) learnwand(obj);
    }
}

/**
 * C ref: pickup.c removed_from_icebox — thaw age + corpse rot/revive.
 * Named omit: ice-troll get_mtraits data pointer identity vs mndx.
 */
function removed_from_icebox(obj) {
    if (!obj || age_is_relative(obj)) return;
    obj.age = (game.moves | 0) - (obj.age | 0);
    if ((obj.otyp | 0) === CORPSE) {
        const m = get_mtraits(obj, false);
        const iceT = m
            ? ((m.data?.mndx | 0) === PM_ICE_TROLL)
            : ((obj.corpsenm | 0) === PM_ICE_TROLL);
        obj.norevive = iceT ? 0 : 1;
        start_corpse_timeout(obj);
    } else if (obj.globby) {
        start_glob_timeout(obj, 0);
    }
}

/**
 * C ref: muse.c muse_newcham_mon — dragon armor form else rndmonst().
 * obj.h Is_dragon_scales/mail macros inlined (do not clone artifact.js).
 */
function muse_newcham_mon(mon) {
    const m_armr = which_armor(mon, W_ARM);
    if (m_armr) {
        const t = m_armr.otyp | 0;
        if (t >= GRAY_DRAGON_SCALES && t <= YELLOW_DRAGON_SCALES) {
            return mons(PM_GRAY_DRAGON + t - GRAY_DRAGON_SCALES);
        }
        if (t >= GRAY_DRAGON_SCALE_MAIL && t <= YELLOW_DRAGON_SCALE_MAIL) {
            return mons(PM_GRAY_DRAGON + t - GRAY_DRAGON_SCALE_MAIL);
        }
    }
    return rndmonst();
}

/**
 * C ref: muse.c mloot_container `:2263`.
 * Named omit: cursed bag-of-holding FIXME (C returns 0).
 */
async function mloot_container(mon, container, vismon) {
    let res = 0;
    if (!container || !Has_contents(container) || container.olocked) {
        return res;
    }
    // C obj.h Is_mbag — BAG_OF_HOLDING || BAG_OF_TRICKS
    if (((container.otyp | 0) === BAG_OF_HOLDING
            || (container.otyp | 0) === BAG_OF_TRICKS)
        && container.cursed) {
        return res;
    }
    if (SchroedingersBox(container)) return res;

    const roll = rn2(10);
    let takeout_count;
    if (roll <= 3) takeout_count = 1;
    else if (roll <= 6) takeout_count = 2;
    else if (roll <= 8) takeout_count = 3;
    else takeout_count = 4;

    const howfar = mdistu(mon);
    const nearby = howfar <= 7 * 7;
    let contnr_nam = '';
    let mpronounbuf = '';
    if (vismon) {
        mpronounbuf = mhe(mon);
    }

    for (let takeout_indx = 0; takeout_indx < takeout_count; ++takeout_indx) {
        if (!Has_contents(container)) break;
        let nitems = 0;
        for (let x = container.cobj; x; x = x.nobj) ++nitems;
        if (!rn2(nitems + 1)) break;
        nitems = rn2(nitems);
        let xobj = container.cobj;
        for (; xobj; xobj = xobj.nobj) {
            if (--nitems < 0) break;
        }
        if (!xobj) break;

        container.cknown = 0;
        if (!contnr_nam) {
            contnr_nam = an(nearby ? xname(container)
                : distant_name(container, xname));
        }
        obj_extract_self(xobj);
        if (can_carry(mon, xobj)) {
            if (vismon) {
                if (howfar > 2) {
                    await Norep(
                        `${Monnam(mon)} rummages through ${contnr_nam}.`,
                    );
                } else if (takeout_indx === 0) {
                    await pline_mon(mon,
                        `${Monnam(mon)} removes ${doname(xobj)} from ${contnr_nam}.`);
                } else {
                    await pline(
                        `${upstart(mpronounbuf)} removes ${doname(xobj)}.`,
                    );
                }
            }
            if ((container.otyp | 0) === ICE_BOX) {
                removed_from_icebox(xobj);
            }
            mpickobj(mon, xobj);
            res = 2;
        } else {
            const already_nomerge = !!xobj.nomerge;
            const just_xobj = !Has_contents(container);
            xobj.nomerge = 1;
            xobj = add_to_container(container, xobj);
            if (!already_nomerge && xobj) xobj.nomerge = 0;
            container.owt = weight(container);
            if (just_xobj) break;
        }
    }
    return res;
}

/**
 * C ref: muse.c you_aggravate `:2630`.
 * Named omit: CLIPPING cliparound (macosx-minimal has no CLIPPING).
 * WIN_MAP blocking → nhgetch after flush, no --More--.
 */
async function you_aggravate(mtmp) {
    await pline(
        `For some reason, ${s_suffix(noit_mon_nam(mtmp))} presence is known to you.`,
    );
    await cls();
    const mg = mon_to_glyph(mtmp, rn2_on_display_rng);
    await show_glyph_cell(
        mtmp.mx, mtmp.my, mg.ch, mg.color, !!mg.dec, 0, mg.glyph,
    );
    display_self();
    await You_feel(`aggravated at ${noit_mon_nam(mtmp)}.`);
    await flush_screen(1);
    const { nhgetch } = await import('./input.js');
    await nhgetch();
    await docrt();
    if (unconscious()) {
        game.multi = -1;
        game.nomovemsg =
            'Aggravated, you are jolted into full consciousness.';
    }
    newsym(mtmp.mx, mtmp.my);
    if (!canspotmon(mtmp)) map_invisible(mtmp.mx, mtmp.my);
}

/**
 * C ref: muse.c use_misc — gain-level / invis / bullwhip / speed /
 * poly wand/potion/trap / bag / you_aggravate.
 */
export async function use_misc(mtmp) {
    const m = museState();
    const otmp = m.misc;
    const i = await precheck(mtmp, otmp);
    if (i !== 0) return i;
    const vismon = canseemon(mtmp);
    const oseen = !!(otmp && vismon);
    const vis = cansee(mtmp.mx, mtmp.my);

    switch (m.has_misc) {
    case MUSE_POT_GAIN_LEVEL: {
        if (!otmp) return 0;
        await mquaffmsg(mtmp, otmp);
        if (otmp.cursed) {
            const u = game.u || {};
            if (Can_rise_up(mtmp.mx, mtmp.my, u.uz)) {
                const tolev = depth(u.uz) - 1;
                const tolevel = { dnum: 0, dlevel: 0 };
                get_level(tolevel, tolev);
                if (!on_level(tolevel, u.uz)) {
                    if (vismon) {
                        await pline(
                            `${Monnam(mtmp)} rises up, through the ceiling!`,
                        );
                    }
                    m_useup(mtmp, otmp);
                    migrate_to_level(
                        mtmp, ledger_no(tolevel), MIGR_RANDOM, null,
                    );
                    return 2;
                }
            }
            if (vismon) await pline(`${Monnam(mtmp)} looks uneasy.`);
            m_useup(mtmp, otmp);
            return 2;
        }
        if (vismon) {
            await pline(`${Monnam(mtmp)} seems more experienced.`);
        }
        if (oseen) makeknown(POT_GAIN_LEVEL);
        m_useup(mtmp, otmp);
        if (!grow_up_potion(mtmp)) return 1;
        return 2;
    }
    case MUSE_WAN_MAKE_INVISIBLE:
    case MUSE_POT_INVISIBILITY: {
        if (!otmp) return 0;
        if (otmp.otyp === WAN_MAKE_INVISIBLE) {
            await mzapwand(mtmp, otmp, true);
        } else {
            await mquaffmsg(mtmp, otmp);
        }
        const nambuf = mon_nam(mtmp);
        mon_set_minvis(mtmp, !!otmp.cursed);
        if (vismon && mtmp.minvis) {
            if (canseemon(mtmp)) {
                await pline(
                    `${upstart(s_suffix(nambuf))} body takes on a ${Hallucination() ? 'normal' : 'strange'} transparency.`,
                );
            } else {
                await pline(`Suddenly you cannot see ${nambuf}.`);
                if (vis) map_invisible(mtmp.mx, mtmp.my);
            }
            if (oseen) makeknown(otmp.otyp);
        } else if (vismon && !mtmp.minvis) {
            await pline(
                `${Monnam(mtmp)} briefly seems to be transparent.`,
            );
        } else if (!vismon && canseemon(mtmp)) {
            await pline(`${Monnam(mtmp)} suddenly appears!`);
        }
        if (otmp.otyp === POT_INVISIBILITY) {
            if (otmp.cursed) await you_aggravate(mtmp);
            m_useup(mtmp, otmp);
        }
        return 2;
    }
    case MUSE_BULLWHIP: {
        /* attempt to disarm hero — C muse.c use_misc MUSE_BULLWHIP */
        const The_whip = vismon ? 'The bullwhip' : 'A whip';
        let where_to = rn2(4);
        const u = game.u || {};
        let obj = u.uwep;
        if (!obj || !canletgo_silent(obj)
            || (u.twoweap && canletgo_silent(u.uswapwep) && rn2(2))) {
            obj = u.uswapwep;
        }
        if (!obj) break;

        const the_weapon = the(xname(obj));
        let hand = 'hand';
        if (bimanual(obj)) hand = makeplural(hand);

        if (vismon) {
            await pline(
                `${Monnam(mtmp)} flicks a bullwhip towards your ${hand}!`,
            );
        }
        if (obj.otyp === HEAVY_IRON_BALL) {
            await pline(
                `${The_whip} fails to wrap around ${the_weapon}.`,
            );
            return 1;
        }
        await pline(
            `${The_whip} wraps around ${the_weapon} you're wielding!`,
        );
        if (welded(obj)) {
            const plural = (obj.quan | 0) !== 1;
            await pline(
                `${plural ? 'They are' : 'It is'} welded to your ${hand}${!obj.bknown ? '!' : '.'}`,
            );
            where_to = 0;
        }
        if (!where_to) {
            await pline('The whip slips free.');
            return 1;
        }
        if (where_to === 3 && mon_hates_silver(mtmp)
            && (game.objects?.[obj.otyp]?.oc_material | 0) === SILVER) {
            where_to = 2;
        }
        remove_worn_weapon(obj);
        freeinv_hero(obj);
        switch (where_to) {
        case 1:
            await pline(
                `${Monnam(mtmp)} yanks ${the_weapon} from your ${hand}!`,
            );
            place_object(obj, mtmp.mx, mtmp.my);
            break;
        case 2:
            await pline(
                `${Monnam(mtmp)} yanks ${the_weapon} to the floor!`,
            );
            await dropy(obj);
            break;
        case 3:
            await pline(`${Monnam(mtmp)} snatches ${the_weapon}!`);
            mpickobj(mtmp, obj);
            break;
        default:
            break;
        }
        return 1;
    }
    case MUSE_WAN_SPEED_MONSTER:
        await mzapwand(mtmp, m.misc, true);
        await mon_adjust_speed(mtmp, 1, m.misc);
        return 2;
    case MUSE_POT_SPEED:
        // C muse.c use_misc MUSE_POT_SPEED: mquaffmsg → mon_adjust_speed → m_useup
        await mquaffmsg(mtmp, otmp);
        await mon_adjust_speed(mtmp, 1, otmp);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_WAN_POLYMORPH: {
        if (!otmp) return 0;
        await mzapwand(mtmp, otmp, true);
        await newcham(
            mtmp, muse_newcham_mon(mtmp),
            NC_VIA_WAND_OR_SPELL | NC_SHOW_MSG,
        );
        if (oseen) makeknown(WAN_POLYMORPH);
        return 2;
    }
    case MUSE_POT_POLYMORPH: {
        if (!otmp) return 0;
        await mquaffmsg(mtmp, otmp);
        m_useup(mtmp, otmp);
        if (vismon) {
            await pline_mon(mtmp, `${Monnam(mtmp)} suddenly mutates!`);
        }
        await newcham(mtmp, muse_newcham_mon(mtmp), NC_SHOW_MSG);
        if (oseen) makeknown(POT_POLYMORPH);
        return 2;
    }
    case MUSE_POLY_TRAP: {
        const t = t_at(m.trapx, m.trapy);
        if (!t) return 0;
        const vistrapspot = cansee(t.tx, t.ty);
        if (vis || vistrapspot) seetrap(t);
        if (vismon || vistrapspot) {
            const jump = vtense('', locomotion(mtmp.data, 'jump'));
            await pline_mon(mtmp,
                `${Some_Monnam(mtmp)} deliberately ${jump} onto a ${t.tseen ? trapname(t.ttyp, false) : 'hidden trap'}!`);
        }
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        place_monster(mtmp, m.trapx, m.trapy);
        await maybe_unhide_at(m.trapx, m.trapy);
        if (mtmp.wormno) worm_move(mtmp);
        newsym(m.trapx, m.trapy);
        await newcham(mtmp, null, NC_SHOW_MSG);
        return 2;
    }
    case MUSE_BAG:
        if (!otmp) return 0;
        return mloot_container(mtmp, otmp, vismon);
    case 0:
        return 0;
    default:
        await impossible(
            `${Monnam(mtmp)} wanted to perform action ${m.has_misc}?`,
        );
        break;
    }
    return 0;
}
