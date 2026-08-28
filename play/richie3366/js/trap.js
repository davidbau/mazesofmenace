// trap.js — Trap creation + monster-step subset + hero dotrap dart /
// rolling boulder + b_trapped (doors/tins) + hero pit/hole (D-1076).
// C ref: trap.c — maketrap/choose_trapnote/hole_destination/trapnote,
// t_at, t_missile, thitm, mintrap, dotrap, trapeffect_dart_trap /
// trapeffect_pit / trapeffect_rocktrap / trapeffect_rolling_boulder_trap /
// launch_obj / trapeffect_sqky_board /
// trapeffect_bear_trap / trapeffect_hole / trapeffect_level_telep /
// trapeffect_magic_portal /
// trapeffect_magic_trap /
// trapeffect_fire_trap / trapeffect_slp_gas_trap / trapeffect_rust_trap /
// trapeffect_web / trapeffect_landmine / blow_up_landmine /
// mu_maybe_destroy_web, b_trapped, sokoban_guilt (D-1239),
// uteetering_at_seen_pit / uescaped_shaft (D-1073 sit OBJ_AT gate +
// do.c flooreffects; D-1083 can_reach_floor(check_pit)),
// make_corpse ordinary path via thitm death.
// openholdingtrap (D-0981) / closeholdingtrap (D-1425).

import { game } from './gstate.js';
import { rn2, rnd, rn1, d, rnl } from './rng.js';
import {
    mksobj, place_object, weight, stackobj, relobj_on_death,
    is_flammable, is_rustprone, is_rottable, is_corrodeable, is_crackable,
    erosion_matters, delobj, mkcorpstat, add_to_container, obj_extract_self,
    objects_at, splitobj, nxtobj, add_to_migration,
    obj_ice_effects, spot_stop_timers, stop_timer,
} from './mkobj.js';
import { find_mac, make_corpse, mon_to_stone, vamp_stone, monstone } from './mhitm.js';
import { mon_explodes, scatter } from './explode.js';
import {
    newsym, pline, pline_xy, urgent_pline, mon_visible, see_with_infrared,
    You_feel, unmap_object, glyph_is_invisible, tmp_at, nh_delay_output,
    obj_glyph, flush_topl_more, feel_newsym, canspotmon, map_invisible,
    set_msg_xy,
} from './display.js';
import { doname, an, the, The, xname, yname, cxname, makeplural, vtense } from './objnam.js';
import {
    Monnam, mon_nam, x_monnam, x_monnam_tame, y_monnam, noit_Monnam, pmname,
    christen_monst, rndmonnam, hliquid, rndcolor,
} from './do_name.js';
import { dist2, distmin, m_at, wakeup, seemimic, m_carrying } from './mon.js';
import { cansee, couldsee, m_cansee, recalc_block_point, vision_recalc } from './vision.js';
import { del_engr_at } from './engrave.js';
import {
    G_FREQ, G_UNIQ, verysmall, grounded, passes_walls,
    is_flyer, is_floater, is_clinger,
    mon_knows_traps, mon_learns_traps,
    amorphous, unsolid, is_whirly, breathless, MZ_SMALL, MZ_HUGE,
    likes_gems, mons, webmaker, throws_rocks,
    is_animal, mindless, haseyes,
    bigmonst, is_golem, is_mplayer, is_rider,
    nohands, extra_nasty, acidic, poly_when_stoned, touch_petrifies,
    resists_ston, MALE, FEMALE, NEUTRAL, nonliving, is_vampshifter,
    hides_under,
} from './monsters.js';
import {
    DART_TRAP, ARROW_TRAP, ROCKTRAP, FORCETRAP, NOWEBMSG, FORCEBUNGLE, RECURSIVETRAP,
    SQKY_BOARD, HOLE, TRAPDOOR, TRAPPED_DOOR, TRAPPED_CHEST,
    PIT, SPIKED_PIT, STATUE_TRAP, MAGIC_TRAP, FIRE_TRAP, SLP_GAS_TRAP,
    TELEP_TRAP, ROLLING_BOULDER_TRAP, POLY_TRAP,
    BEAR_TRAP, WEB, RUST_TRAP, VIBRATING_SQUARE, LANDMINE,
    ANTI_MAGIC, HURTLING, TOOKPLUNGE, VIASITTING, FIRE_RES, SLEEP_RES,
    TRAP_NOT_IMMUNE, TRAP_CLEARLY_IMMUNE, TRAP_HIDDEN_IMMUNE,
    In_endgame, In_sokoban, Is_earthlevel,
    STONE_RES, FAILEDUNTRAP,
    NO_TRAP, TRAPNUM, WT_ELF,
    is_hole, is_pit, unhideable_trap, is_xport, In_quest, isok, ZAP_POS, IS_DOOR, IS_LAVA,
    IS_ROOM, IS_WALL, IS_AIR, IS_FURNITURE, IS_FOUNTAIN, IS_SINK,
    STONE, SCORR, CORR, ROOM, DOOR, ICE, MAX_TYPE, SDOOR, STAIRS, LADDER, DRAWBRIDGE_UP,
    DB_UNDER, DB_ICE, DB_FLOOR,
    MELT_ICE_AWAY, ROT_ORGANIC,
    MAGIC_PORTAL, LEVEL_TELEP, Is_waterlevel, Is_airlevel,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, D_BROKEN, D_TRAPPED,
    MAXULEV,
    ER_NOTHING, ER_GREASED, ER_DAMAGED, ER_DESTROYED,
    ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ERODE_CRACK, ERODE_NONE,
    EF_NONE, EF_GREASE, EF_DESTROY, EF_VERBOSE, EF_PAY,
    MAX_ERODE,
    LOW_PM, BOLT_LIM, STRAT_WAITMASK,
    Can_fall_thru, NO_MM_FLAGS, FROMOUTSIDE, TIMEOUT, Upolyd,
    UTOTYPE_NONE, UTOTYPE_FALLING, Is_stronghold,
    KILLED_BY, KILLED_BY_AN, NO_KILLER_PREFIX, NO_PART, STONING,
    ARTICLE_NONE, ARTICLE_THE, SUPPRESS_SADDLE, has_mgivenname,
    DISMOUNT_POLY,
    WATER, BURNING, DROWNING, DISSOLVED, PLNMSG_BACK_ON_GROUND,
    TT_NONE, TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
    LEFT_SIDE, RIGHT_SIDE, BOTH_SIDES, FOOT, LEG,
    HEAD, ARM, FINGER,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_WEP, W_SWAPWEP,
    W_SADDLE, I_SPECIAL,
    CORPSTAT_NONE, CORPSTAT_HISTORIC, CORPSTAT_GENDER, CORPSTAT_MALE,
    CORPSTAT_FEMALE, MM_NOCOUNTBIRTH, MM_NOMSG, MM_ADJACENTOK, MM_MALE,
    MM_FEMALE, NO_MINVENT, M_AP_TYPE, ismnum, ANIMATE_NORMAL,
    ANIMATE_SHATTER, ANIMATE_SPELL, AS_OK, AS_NO_MON, AS_MON_IS_UNIQUE,
    OBJ_INVENT, has_oname, has_omonst, ONAME, OMONST,
    ROLL, LAUNCH_KNOWN, LAUNCH_UNSEEN, u_at, MIGR_RANDOM,
    DISP_FLASH, DISP_END,
    MAY_DESTROY, MAY_HIT, MAY_FRACTURE, VIS_EFFECTS,
    IS_OBSTRUCTED, IS_STWALL, IS_TREE, IRONBARS,
    HVY_ENCUMBER, ECMD_OK, ECMD_TIME, MON_DETACH,
    Is_container, Waterproof_container,
    xytodir, DIR_180, DIR_ERR,
    OBJ_FLOOR, OBJ_FREE, SHOPBASE, ESHK, M_SEEN_ELEC,
    A_LAWFUL, XKILL_NOMSG, SHOP_HOLE_COST,
} from './const.js';
import {
    is_pool, is_lava, waterbody_name, crawl_destination,
    maybe_half_phys, nomul, losehp, finish_maybe_wail, stop_occupation,
    in_rooms, set_uinwater,
} from './hack.js';
import { goodpos, mlevel_tele_trap, mtele_trap, tele_trap, level_tele_trap, domagicportal, rloco, random_teleport_level } from './teleport.js';
import { get_level } from './dungeon.js';
import {
    objectNames, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, ARMOR_CLASS,
    WEAPON_CLASS, TOOL_CLASS,
} from './objects.js';
import { monsterNames, PM_ROGUE } from './generated/monsters_data.js';
import { thitu, ohitmon, hits_bars } from './mthrowu.js';
import { dmgval, MON_WEP, mwepgone, wet_a_towel, dry_a_towel, is_wet_towel } from './weapon.js';
import { observe_object, encumber_msg, near_capacity, makeknown, update_inventory } from './invent.js';
import { makemon, rndmonnum_adj, mpickobj, set_malign, newcham } from './makemon.js';
import {
    A_CHA, A_STR, A_DEX, A_CON, A_WIS, adjattrib, exercise, adjalign,
    poisoned, change_luck, Fumbling,
} from './attrib.js';
import { tamedog, wary_dog } from './dog.js';
import { welded, uwepgone, uswapwepgone } from './wield.js';
import { count_wsegs, worm_known } from './worm.js';
import { level_difficulty, depth } from './hacklib.js';
import { make_stunned, make_hallucinated } from './potion.js';
import { monstseesu, monstunseesu } from './mondata.js';
import { get_obj_location } from './timeout.js';
import { costly_spot, shop_keeper, stolen_value, make_angry_shk, add_damage } from './shk.js';
import { unpunish } from './read.js';
import { create_gas_cloud } from './region.js';
import { polymon, body_part, mbodypart } from './polyself.js';
import { done } from './end.js';
import { mon_adjust_speed } from './muse.js';
import { m_dowear } from './worn.js';

const AD_ELEC = 6;
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_IRON_GOLEM = monsterNames.indexOf('PM_IRON_GOLEM');
const PM_PAPER_GOLEM = monsterNames.indexOf('PM_PAPER_GOLEM');
const PM_STRAW_GOLEM = monsterNames.indexOf('PM_STRAW_GOLEM');
const PM_WOOD_GOLEM = monsterNames.indexOf('PM_WOOD_GOLEM');
const PM_LEATHER_GOLEM = monsterNames.indexOf('PM_LEATHER_GOLEM');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
const PM_BLACK_LIGHT = monsterNames.indexOf('PM_BLACK_LIGHT');
const PM_OWLBEAR = monsterNames.indexOf('PM_OWLBEAR');
const PM_BUGBEAR = monsterNames.indexOf('PM_BUGBEAR');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_GELATINOUS_CUBE = monsterNames.indexOf('PM_GELATINOUS_CUBE');
const PM_FIRE_VORTEX = monsterNames.indexOf('PM_FIRE_VORTEX');
const PM_FLAMING_SPHERE = monsterNames.indexOf('PM_FLAMING_SPHERE');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_SALAMANDER = monsterNames.indexOf('PM_SALAMANDER');
const PM_TITANOTHERE = monsterNames.indexOf('PM_TITANOTHERE');
const PM_BALUCHITHERIUM = monsterNames.indexOf('PM_BALUCHITHERIUM');
const PM_PURPLE_WORM = monsterNames.indexOf('PM_PURPLE_WORM');
const PM_JABBERWOCK = monsterNames.indexOf('PM_JABBERWOCK');
const PM_BALROG = monsterNames.indexOf('PM_BALROG');
const PM_KRAKEN = monsterNames.indexOf('PM_KRAKEN');
const PM_MASTODON = monsterNames.indexOf('PM_MASTODON');
const PM_ORION = monsterNames.indexOf('PM_ORION');
const PM_NORN = monsterNames.indexOf('PM_NORN');
const PM_CYCLOPS = monsterNames.indexOf('PM_CYCLOPS');
const PM_LORD_SURTUR = monsterNames.indexOf('PM_LORD_SURTUR');
const STATUE = objectNames.indexOf('STATUE');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const AD_RUST = 24; /* monattk.h */
const PM_FLESH_GOLEM = monsterNames.indexOf('PM_FLESH_GOLEM');
const PM_DOPPELGANGER = monsterNames.indexOf('PM_DOPPELGANGER');
const PM_ARCHEOLOGIST = monsterNames.indexOf('PM_ARCHEOLOGIST');
const PM_RANGER = monsterNames.indexOf('PM_RANGER');
const PM_PIT_VIPER = monsterNames.indexOf('PM_PIT_VIPER');
const PM_PIT_FIEND = monsterNames.indexOf('PM_PIT_FIEND');
const something = 'something';

/** C ref: hacklib.c upstart — capitalize first letter. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C ref: mondata.h unique_corpstat — G_UNIQ. */
function unique_corpstat(ptr) {
    return !!((ptr?.geno | 0) & G_UNIQ);
}

/** C ref: objnam.c / shk.c shk_your thin — carried → "your ", else "the ". */
function shk_your_statue(statue) {
    const carried = (statue?.where | 0) === OBJ_INVENT
        || (game.invent || []).includes(statue);
    return carried ? 'your ' : 'the ';
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

function a_monnam(mtmp) {
    if (!mtmp) return something;
    const nm = mon_nam(mtmp);
    if (!nm) return something;
    const c0 = nm.charAt(0);
    if (c0 === c0.toUpperCase() && c0 !== c0.toLowerCase()) return nm;
    return `a ${nm}`;
}

function carried_obj(obj) {
    return (obj?.where | 0) === OBJ_INVENT
        || (game.invent || []).includes(obj);
}

/** C ref: mondata.h flaming — fire vortex / sphere / elemental / salamander. */
function flaming(ptr) {
    if (!ptr) return false;
    const n = ptr.mndx ?? -1;
    return n === PM_FIRE_VORTEX || n === PM_FLAMING_SPHERE
        || n === PM_FIRE_ELEMENTAL || n === PM_SALAMANDER;
}

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/** C ref: mondata.h is_unicorn — mlet unicorn + likes_gems */
function is_unicorn(ptr) {
    return ptr?.mlet === 'S_UNICORN' && likes_gems(ptr);
}

/**
 * C ref: trap.c mongone subset — drop from fmon after invent emptied.
 * Full mongone (timers, worm, shop, light) deferred.
 */
function mongone_statue_donor(mtmp) {
    if (!mtmp) return;
    const list = game.fmon;
    if (list) {
        const i = list.indexOf(mtmp);
        if (i >= 0) list.splice(i, 1);
    }
    mtmp.mx = 0;
    mtmp.my = 0;
}

/**
 * C ref: trap.c mk_trap_statue — living statue under STATUE_TRAP.
 * rndmonnum_adj(3,6) + unicorn co-align retry; mkcorpstat CORPSTAT_NONE;
 * temp makemon for invent → add_to_container; mongone.
 */
function mk_trap_statue(x, y) {
    let mptr = null;
    let trycount = 10;
    do {
        mptr = mons(rndmonnum_adj(3, 6));
    } while (--trycount > 0 && is_unicorn(mptr)
        && sgn(game.u?.ualign?.type ?? 0) === sgn(mptr?.maligntyp ?? 0));
    const statue = mkcorpstat(STATUE, null, mptr, x, y, CORPSTAT_NONE);
    if (!statue) return;
    const mtmp = makemon(mons(statue.corpsenm), 0, 0,
        MM_NOCOUNTBIRTH | MM_NOMSG);
    if (!mtmp) return;
    while (mtmp.minvent) {
        const otmp = mtmp.minvent;
        otmp.owornmask = 0;
        obj_extract_self(otmp);
        add_to_container(statue, otmp);
    }
    statue.owt = weight(statue);
    mongone_statue_donor(mtmp);
}

/**
 * C ref: trap.c animate_statue — statue → live monster.
 * Sequencing: create mon; message; shop stolen_value (non-NORMAL);
 * transfer contents; m_dowear; delobj statue.
 * Named omit: set_msg_xy; full shk ownership prefixes; quest MS_GUARDIAN
 * other-role guard remap; remove_worn_item polish beyond owornmask clear.
 * @param {object} statue
 * @param {number} x
 * @param {number} y
 * @param {number} cause ANIMATE_NORMAL|SHATTER|SPELL
 * @param {{ value?: number }|null} [fail_reason]
 * @returns {Promise<object|null>}
 */
export async function animate_statue(statue, x, y, cause, fail_reason = null) {
    if (!statue) {
        if (fail_reason) fail_reason.value = AS_NO_MON;
        return null;
    }
    const historic_gone = 'that the historic statue is now gone';
    let mnum = statue.corpsenm | 0;
    let mptr = mons(mnum);
    let mon = null;
    let golem_xform = false;
    let use_saved_traits = false;

    const { cant_revive, montraits } = await import('./zap.js');
    const box = { mtype: mnum };
    if (cant_revive(box, true, statue)) {
        mnum = box.mtype | 0;
        if (mnum !== PM_DOPPELGANGER) mptr = mons(mnum);
        use_saved_traits = false;
    } else if (is_golem(mptr) && cause === ANIMATE_SPELL) {
        golem_xform = mptr !== mons(PM_FLESH_GOLEM);
        mnum = PM_FLESH_GOLEM;
        mptr = mons(PM_FLESH_GOLEM);
        use_saved_traits = has_omonst(statue) && !golem_xform;
    } else {
        use_saved_traits = has_omonst(statue);
    }

    if (use_saved_traits) {
        mon = await montraits(statue, { x, y }, cause === ANIMATE_SPELL);
        if (mon && mon.mtame && !mon.isminion) {
            await wary_dog(mon, true);
        }
    } else {
        const sgend = (statue.spe | 0) & CORPSTAT_GENDER;
        let mmflags = NO_MINVENT | MM_NOMSG
            | ((sgend === CORPSTAT_MALE) ? MM_MALE : 0)
            | ((sgend === CORPSTAT_FEMALE) ? MM_FEMALE : 0);
        if ((mnum === PM_DOPPELGANGER && mptr !== mons(PM_DOPPELGANGER))) {
            // quest MS_GUARDIAN other-role guard remap deferred
            mmflags |= MM_NOCOUNTBIRTH | MM_ADJACENTOK;
            mon = makemon(mons(PM_DOPPELGANGER), x, y, mmflags);
            if (mon && ismnum(mon.cham)) {
                newcham(mon, mptr, 0);
            }
        } else {
            if (cause === ANIMATE_SPELL) mmflags |= MM_ADJACENTOK;
            mon = makemon(mptr, x, y, mmflags);
        }
    }

    if (!mon) {
        if (fail_reason) {
            fail_reason.value = unique_corpstat(mons(statue.corpsenm | 0))
                ? AS_MON_IS_UNIQUE
                : AS_NO_MON;
        }
        return null;
    }

    if (has_oname(statue) && !unique_corpstat(mon.data)) {
        mon = christen_monst(mon, ONAME(statue));
    }
    if (M_AP_TYPE(mon)) seemimic(mon);
    else mon.mundetected = false;
    mon.msleeping = 0;
    if (cause === ANIMATE_NORMAL || cause === ANIMATE_SHATTER) {
        mon.mtame = 0;
        mon.mpeaceful = 0;
        set_malign(mon);
    }

    const comes_to_life = !canspotmon(mon)
        ? 'disappears'
        : golem_xform
            ? 'turns into flesh'
            : (nonliving(mon.data) || is_vampshifter(mon))
                ? 'moves'
                : 'comes to life';

    if (u_at(x, y) || cause === ANIMATE_SPELL) {
        const shkp = shop_keeper(in_rooms(mon.mx, mon.my, SHOPBASE) || '');
        let statuename;
        if (cause === ANIMATE_SPELL
            && (mon !== shkp || carried_obj(statue))) {
            statuename = `${shk_your_statue(statue)}${xname(statue)}`;
        } else {
            statuename = `${shk_your_statue(statue)}statue`;
        }
        await pline(`${upstart(statuename)} ${comes_to_life}!`);
    } else if (Hallucination()) {
        await pline(
            `The ${rndmonnam(null)} suddenly seems more animated.`,
        );
    } else if (cause === ANIMATE_SHATTER) {
        let statuename;
        if (cansee(x, y)) {
            statuename = `${shk_your_statue(statue)}${xname(statue)}`;
        } else {
            statuename = 'a statue';
        }
        await pline(
            `Instead of shattering, ${statuename} suddenly ${comes_to_life}!`,
        );
    } else {
        // ANIMATE_NORMAL — set_msg_xy deferred
        await pline(
            `You find ${canspotmon(mon) ? a_monnam(mon) : something}`
            + ' posing as a statue.',
        );
        if (!canspotmon(mon) && Blind()) map_invisible(x, y);
        await stop_occupation();
    }

    if (!game.context?.mon_moving) {
        if (cause !== ANIMATE_NORMAL && costly_spot(x, y)
            && (carried_obj(statue) ? statue.unpaid : !statue.no_charge)) {
            const shkp = shop_keeper(in_rooms(x, y, SHOPBASE) || '');
            if (shkp && mon !== shkp) {
                await stolen_value(
                    statue, x, y, !!shkp.mpeaceful, false,
                );
            }
        }
        const historic = Role_if(PM_ARCHEOLOGIST)
            && ((statue.spe | 0) & CORPSTAT_HISTORIC) !== 0;
        if (historic) {
            await You_feel(`guilty ${historic_gone}.`);
            adjalign(-1);
        }
    } else {
        const historic = Role_if(PM_ARCHEOLOGIST)
            && ((statue.spe | 0) & CORPSTAT_HISTORIC) !== 0;
        if (historic && cansee(x, y)) {
            await You_feel(`regret ${historic_gone}.`);
        }
    }

    while (statue.cobj) {
        const item = statue.cobj;
        obj_extract_self(item);
        mpickobj(mon, item);
    }
    m_dowear(mon, true);
    if (statue.owornmask) {
        // remove_worn_item polish deferred — clear mask before delobj
        statue.owornmask = 0;
    }
    delobj(statue);

    const u = game.u || {};
    if (u_at(x, y) && Upolyd(u) && hides_under(game.youmonst?.data)
        && !objects_at(x, y)) {
        u.uundetected = 0;
    }

    if (fail_reason) fail_reason.value = AS_OK;
    return mon;
}

/**
 * C ref: trap.c activate_statue_trap — deltrap then animate first valid
 * floor statue (skip unique fails via AS_MON_IS_UNIQUE loop).
 * @returns {Promise<object|null>}
 */
export async function activate_statue_trap(trap, x, y, shatter) {
    let mtmp = null;
    let otmp = sobj_at(STATUE, x, y);
    const fail_reason = { value: AS_OK };

    if (trap) deltrap(trap);
    while (otmp) {
        mtmp = await animate_statue(
            otmp, x, y,
            shatter ? ANIMATE_SHATTER : ANIMATE_NORMAL,
            fail_reason,
        );
        if (mtmp || fail_reason.value !== AS_MON_IS_UNIQUE) break;
        otmp = nxtobj(otmp, STATUE, true);
    }
    feel_newsym(x, y);
    return mtmp;
}

// C ref: trap.c A_gush_of_water_hits
const A_gush_of_water_hits = 'A gush of water hits';
const DART = objectNames.indexOf('DART');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');
const AD_PHYS = 0;
const AD_FIRE = 2; /* monattk.h */
const TOWER_OF_FLAME = 'tower of flame';
const VISION_CLEARS = 'vision clears.'; /* C c_vision_clears */
// C ref: hack.h xdir/ydir — 8 dirs W,NW,N,NE,E,SE,S,SW
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];
const N_DIRS = 8;

// C ref: trap.h enum trap_result
export const Trap_Effect_Finished = 0;
export const Trap_Is_Gone = 1;
export const Trap_Killed_Mon = 2;
export const Trap_Caught_Mon = 3;
export const Trap_Moved_Mon = 4;

export const NO_TRAP_FLAGS = 0;

/**
 * C ref: mondata.c mons_see_trap — nearby sighted non-mindless monsters
 * remember this trap type (feeds mfndpos mon_knows_traps skips).
 * No RNG. Lit cell radius 7² else 2 (Chebyshev-squared via dist2).
 */
export function mons_see_trap(ttmp) {
    if (!ttmp) return;
    const tx = ttmp.tx | 0;
    const ty = ttmp.ty | 0;
    const loc = game.level?.at(tx, ty);
    const maxdist = loc?.lit ? 7 * 7 : 2;
    for (const mtmp of game.fmon || []) {
        const ptr = mtmp?.data;
        if (!ptr) continue;
        if (is_animal(ptr) || mindless(ptr) || !haseyes(ptr) || !mtmp.mcansee) {
            continue;
        }
        if (dist2(mtmp.mx, mtmp.my, tx, ty) > maxdist) continue;
        if (!m_cansee(mtmp, tx, ty)) continue;
        mon_learns_traps(mtmp, ttmp.ttyp);
    }
}

/**
 * C ref: trap.c m_harmless_trap — whether mfndpos may ignore this trap.
 * Envelope: !Sokoban floor_trigger+check_in_air; STATUE/MAGIC/VIBRATING;
 * BEAR_TRAP/WEB size·amorph·whirly·unsolid·webmaker; SLP_GAS resists_sleep;
 * RUST except iron golem; FIRE resists_fire; PIT/HOLE clinger (!Sokoban).
 * Named omission: defended(AD_SLEE/AD_FIRE); anti-magic resist arm.
 */
export function m_harmless_trap(mtmp, ttmp) {
    if (!ttmp) return true;
    const mdat = mtmp?.data;
    // C: Sokoban = level.flags.sokoban_rules
    const Sokoban = !!(game.level?.flags?.sokoban_rules || game.Sokoban);
    // C: flyers/floaters ignore floor-trigger traps outside Sokoban
    if (!Sokoban && floor_trigger(ttmp.ttyp) && check_in_air(mtmp, 0)) {
        return true;
    }
    switch (ttmp.ttyp) {
    case STATUE_TRAP:
    case MAGIC_TRAP:
    case VIBRATING_SQUARE:
        return true;
    case BEAR_TRAP:
        if ((mdat?.msize ?? 2) <= MZ_SMALL
            || amorphous(mdat) || is_whirly(mdat) || unsolid(mdat)) {
            return true;
        }
        return false;
    case WEB:
        if (amorphous(mdat) || is_whirly(mdat) || unsolid(mdat)
            || webmaker(mdat)) {
            return true;
        }
        return false;
    case SLP_GAS_TRAP:
        // defended(AD_SLEE) deferred
        return !!resists_sleep(mtmp);
    case RUST_TRAP:
        // C: only iron golem is harmed
        return (mdat?.mndx ?? -1) !== PM_IRON_GOLEM;
    case FIRE_TRAP:
        // defended(AD_FIRE) deferred
        return !!resists_fire(mtmp);
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat) && !Sokoban) return true;
        return false;
    default:
        return false;
    }
}

// C ref: dungeon.c dunlev / dunlevs_in_dungeon / In_hell
function dunlev(lev) {
    return lev?.dlevel ?? 1;
}
function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 1;
}
function dunlev_reached(lev) {
    return game.dungeons?.[lev?.dnum]?.dunlev_ureached ?? 0;
}
function In_hell(lev) {
    return !!(game.dungeons?.[lev?.dnum]?.flags?.hellish);
}

// C ref: trap.c dng_bottom — quest locate / Gehennom invocation cutoffs
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);
    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level?.dlevel;
        if (qlocate_depth != null && dunlev_reached(lev) < qlocate_depth) {
            bottom = qlocate_depth;
        }
    } else if (In_hell(lev)) {
        if (!game.u?.uevent?.invoked) bottom -= 1;
    }
    return bottom;
}

// C ref: trap.c hole_destination
export function hole_destination(dst) {
    const uz = game.u?.uz ?? { dnum: 0, dlevel: 1 };
    const bottom = dng_bottom(uz);
    dst.dnum = uz.dnum;
    dst.dlevel = dunlev(uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4)) break;
    }
}

// C ref: trap.c choose_trapnote — unused squeaky-board note, else rn2(12)
export function choose_trapnote(ttmp) {
    const tavail = new Array(12).fill(0);
    const tpick = new Array(12).fill(0);
    let tcnt = 0;
    const traps = game.level?.traps;
    if (traps) {
        for (const t of traps) {
            if (t && t.ttyp === SQKY_BOARD && t !== ttmp) {
                tavail[t.tnote | 0] = 1;
            }
        }
    }
    for (let k = 0; k < 12; ++k) {
        if (tavail[k] === 0) tpick[tcnt++] = k;
    }
    return tcnt > 0 ? tpick[rn2(tcnt)] : rn2(12);
}

/**
 * C ref: dbridge.c is_pool_or_lava — is_pool || is_lava (D-1296).
 * DRAWBRIDGE_UP ice/floor are not pool; DB_MOAT/DB_LAVA still reject.
 */
function is_pool_or_lava(x, y) {
    return is_pool(x, y) || is_lava(x, y);
}

/** C ref: trap.h undestroyable_trap — portal / vibrating square. */
function undestroyable_trap(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

/**
 * C ref: rm.h CAN_OVERWRITE_TERRAIN — stairs/ladder unless debug override.
 * Named omission: iflags.debug_overwrite_stairs (always false here).
 */
function CAN_OVERWRITE_TERRAIN(ttyp) {
    return ttyp !== LADDER && ttyp !== STAIRS;
}

// C ref: monmove.c closed_door
function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C ref: trap.c isclearpath — walk distance steps; update cc to end cell.
 * Blocks !ZAP_POS, closed doors, and pit/hole/xport traps along the path.
 */
function isclearpath(cc, distance, dx, dy) {
    let x = cc.x;
    let y = cc.y;
    let dist = distance;
    while (dist-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y)) return false;
        const typ = game.level?.at?.(x, y)?.typ;
        if (typ == null || !ZAP_POS(typ) || closed_door(x, y)) return false;
        const t = t_at(x, y);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp))) {
            return false;
        }
    }
    cc.x = x;
    cc.y = y;
    return true;
}

/**
 * C ref: mthrowu.c linedup geometry only — used for launchplace early path.
 * Full couldsee/clear_path boulderhandling deferred (mklev launchplace is 0,0).
 */
function linedup_geom(ax, ay, bx, by) {
    const tbx = ax - bx;
    const tby = ay - by;
    if (!tbx && !tby) return false;
    return (!tbx || !tby || Math.abs(tbx) === Math.abs(tby))
        && Math.max(Math.abs(tbx), Math.abs(tby)) < BOLT_LIM;
}

/**
 * C ref: trap.c find_random_launch_coord — place boulder/ammo launch cell.
 * Sokoban always fails; launchplace offset tried first; else rn1(5,4)+rn2(8)
 * direction spiral with isclearpath (both ways for ROLLING_BOULDER_TRAP).
 */
function find_random_launch_coord(ttmp, cc) {
    if (!ttmp || !cc) return false;
    const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);
    if (Sokoban) return false;

    const x = ttmp.tx;
    const y = ttmp.ty;
    const lp = game.launchplace || { x: 0, y: 0 };
    const bcc = { x: ttmp.tx + (lp.x | 0), y: ttmp.ty + (lp.y | 0) };
    if (isok(bcc.x, bcc.y) && linedup_geom(ttmp.tx, ttmp.ty, bcc.x, bcc.y)) {
        cc.x = bcc.x;
        cc.y = bcc.y;
        return true;
    }

    let mindist = 4;
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) mindist = 2;
    let distance = rn1(5, 4); // 4..8 away
    let tmp = rn2(N_DIRS);
    let trycount = 0;
    let success = false;
    while (distance >= mindist) {
        const dx = xdir[tmp];
        const dy = ydir[tmp];
        cc.x = x;
        cc.y = y;
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP
            && is_pool_or_lava(x + distance * dx, y + distance * dy)) {
            success = false;
        } else {
            success = isclearpath(cc, distance, dx, dy);
        }
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
            const other = { x, y };
            const success_otherway = isclearpath(other, distance, -dx, -dy);
            if (!success_otherway) success = false;
        }
        if (success) break;
        if (++tmp > 7) tmp = 0;
        if ((++trycount % 8) === 0) --distance;
    }
    return success;
}

/**
 * C ref: trap.c mkroll_launch — set launch coords; place otyp ammo when path ok.
 * Failure leaves launch at trap cell (no ammo). ROLLING_BOULDER sets launch2.
 */
function mkroll_launch(ttmp, x, y, otyp, ocount) {
    const cc = { x: 0, y: 0 };
    let success = find_random_launch_coord(ttmp, cc);
    if (!success) {
        cc.x = x;
        cc.y = y;
    } else {
        const otmp = mksobj(otyp, true, false);
        if (otmp) {
            otmp.quan = ocount;
            otmp.owt = weight(otmp);
            place_object(otmp, cc.x, cc.y);
            stackobj(otmp);
        }
    }
    ttmp.launch = ttmp.launch || { x: -1, y: -1 };
    ttmp.launch.x = cc.x;
    ttmp.launch.y = cc.y;
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
        ttmp.launch2 = ttmp.launch2 || { x: -1, y: -1 };
        ttmp.launch2.x = x - (cc.x - x);
        ttmp.launch2.y = y - (cc.y - y);
    } else {
        ttmp.launch_otyp = otyp;
    }
    newsym(ttmp.launch.x, ttmp.launch.y);
    return 1;
}

/**
 * C ref: mkmaze.c set_levltyp — analog for maketrap PIT/HOLE morph
 * (D-1280). CAN_OVERWRITE, ice melt, incremental fountain/sink counts.
 * Named omit: SDOOR→AIR arboreal; full count_level_features scan;
 * other callers keep their local analogs.
 */
function set_levltyp(x, y, newtyp) {
    if (!isok(x, y) || newtyp < STONE || newtyp >= MAX_TYPE) return false;
    const lev = game.level?.at?.(x, y);
    if (!lev) return false;
    const oldtyp = lev.typ | 0;
    if (!CAN_OVERWRITE_TERRAIN(oldtyp)) return false;
    const was_ice = oldtyp === ICE;
    lev.typ = newtyp;
    if (IS_LAVA(newtyp)) lev.lit = 1;
    if (was_ice && newtyp !== ICE) {
        obj_ice_effects(x, y, true);
        spot_stop_timers(x, y, MELT_ICE_AWAY);
    }
    if ((IS_FOUNTAIN(oldtyp) !== IS_FOUNTAIN(newtyp))
        || (IS_SINK(oldtyp) !== IS_SINK(newtyp))) {
        const lf = game.level?.flags;
        if (lf) {
            if (IS_FOUNTAIN(oldtyp) && !IS_FOUNTAIN(newtyp)
                && (lf.nfountains | 0) > 0) {
                lf.nfountains--;
            }
            if (!IS_FOUNTAIN(oldtyp) && IS_FOUNTAIN(newtyp)) {
                lf.nfountains = (lf.nfountains | 0) + 1;
            }
            if (IS_SINK(oldtyp) && !IS_SINK(newtyp) && (lf.nsinks | 0) > 0) {
                lf.nsinks--;
            }
            if (!IS_SINK(oldtyp) && IS_SINK(newtyp)) {
                lf.nsinks = (lf.nsinks | 0) + 1;
            }
        }
    }
    return true;
}

/**
 * C ref: dig.c unearth_objs — buriedobjlist at <x,y> → floor.
 * Local copy: trap.js cannot import dig.js (cycle). Named omit:
 * buried_ball_to_punishment arm.
 */
function maketrap_unearth_objs(x, y) {
    let otmp = game.level?.buriedobjlist || null;
    while (otmp) {
        const otmp2 = otmp.nobj || null;
        if ((otmp.ox | 0) === (x | 0) && (otmp.oy | 0) === (y | 0)) {
            obj_extract_self(otmp);
            if (otmp.timed) stop_timer(ROT_ORGANIC, otmp);
            place_object(otmp, x, y);
            stackobj(otmp);
        }
        otmp = otmp2;
    }
    del_engr_at(x, y);
    newsym(x, y);
}

// C ref: trap.c maketrap — creation + SQKY_BOARD / HOLE|TRAPDOOR /
// ROLLING_BOULDER_TRAP mkroll_launch / STATUE_TRAP mk_trap_statue +
// PIT/HOLE set_levltyp (D-1280) + DRAWBRIDGE_UP ice→floor (D-1296) +
// shop add_damage (D-1300).
// Named omissions: overwrite reset_utrap / Knox LEVEL_TELEP /
// Sokoban finish; mongone full body.
// TELEP teledest may be set by caller after create (themerms make_a_trap).
export function maketrap(x, y, typ) {
    // C ref: trap.c maketrap — reject door/chest map traps; terrain gates.
    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST) return null;
    if (!isok(x, y)) return null;

    let ttmp = t_at(x, y);
    let oldplace = false;
    if (ttmp) {
        // C: undestroyable existing trap → refuse overwrite
        if (undestroyable_trap(ttmp.ttyp)) return null;
        oldplace = true;
    } else {
        const lev = game.level?.at?.(x, y);
        const ltyp = lev?.typ;
        // C: stairs/ladder, pool/lava, furniture (except PIT/HOLE),
        // drawbridge+portal, air/cloud (except MAGIC_PORTAL).
        // Named omission: LEVEL_TELEP && single_level_branch (Knox).
        if (ltyp == null
            || !CAN_OVERWRITE_TERRAIN(ltyp)
            || is_pool_or_lava(x, y)
            || (IS_FURNITURE(ltyp) && typ !== PIT && typ !== HOLE)
            || (ltyp === DRAWBRIDGE_UP && typ === MAGIC_PORTAL)
            || (IS_AIR(ltyp) && typ !== MAGIC_PORTAL)) {
            return null;
        }
        ttmp = {
            ttyp: typ,
            tx: x,
            ty: y,
            tseen: false,
            once: false,
            madeby_u: 0,
            tnote: 0,
            conjoined: 0,
            launch: { x: -1, y: -1 },
            launch2: { x: -1, y: -1 },
            teledest: { x: -1, y: -1 },
            dst: { dnum: -1, dlevel: -1 },
            ntrap: null,
        };
    }
    ttmp.launch = { x: -1, y: -1 };
    ttmp.launch2 = { x: -1, y: -1 };
    ttmp.teledest = { x: -1, y: -1 };
    ttmp.dst = { dnum: -1, dlevel: -1 };
    ttmp.madeby_u = 0;
    ttmp.once = 0;
    // C: ttmp->tseen = unhideable_trap(typ);  (HOLE always seen)
    ttmp.tseen = unhideable_trap(typ);
    ttmp.ttyp = typ;

    switch (typ) {
    case SQKY_BOARD:
        ttmp.tnote = choose_trapnote(ttmp);
        break;
    case STATUE_TRAP: /* create a "living" statue */
        mk_trap_statue(x, y);
        break;
    case ROLLING_BOULDER_TRAP:
        mkroll_launch(ttmp, x, y, BOULDER, 1);
        break;
    case PIT:
    case SPIKED_PIT:
        ttmp.conjoined = 0;
        /* FALLTHROUGH */
    case HOLE:
    case TRAPDOOR: {
        if (is_hole(typ)) hole_destination(ttmp.dst);
        // C trap.c:523–527 — shop add_damage before terrain morph so
        // IS_DOOR/IS_WALL and the damagelist typ snapshot the original
        // cell (D-1300). Floor holes bill 0; door/wall bill SHOP_HOLE_COST
        // only when the hero is moving.
        const lev = game.level?.at?.(x, y);
        if (in_rooms(x, y, SHOPBASE)
            && (is_hole(typ) || IS_DOOR(lev?.typ) || IS_WALL(lev?.typ))) {
            add_damage(
                x, y,
                ((IS_DOOR(lev?.typ) || IS_WALL(lev?.typ))
                    && !game.context?.mon_moving)
                    ? SHOP_HOLE_COST : 0,
            );
        }
        // C trap.c:529–564 — DRAWBRIDGE_UP keeps drawbridgemask and
        // forces DB_FLOOR (ice melt D-1296); else set_levltyp
        // IS_ROOM→ROOM / STONE|SCORR→CORR / wall|SDOOR→maze ROOM /
        // cavern CORR / DOOR; flags=0; unearth; recalc_block_point.
        if (lev) {
            let clear_flags = true;
            if (lev.typ === DRAWBRIDGE_UP) {
                /* C: closed span keeps drawbridgemask; under-type
                 * becomes floor even if it was moat, lava, or ice. */
                clear_flags = false;
                const was_ice = ((lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
                lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_UNDER;
                lev.drawbridgemask |= DB_FLOOR;
                if (was_ice) {
                    obj_ice_effects(x, y, true);
                    spot_stop_timers(x, y, MELT_ICE_AWAY);
                }
            } else if (IS_ROOM(lev.typ)) {
                set_levltyp(x, y, ROOM);
            } else if (lev.typ === STONE || lev.typ === SCORR) {
                set_levltyp(x, y, CORR);
            } else if (IS_WALL(lev.typ) || lev.typ === SDOOR) {
                const lf = game.level?.flags || {};
                const newt = lf.is_maze_lev ? ROOM
                    : lf.is_cavernous_lev ? CORR
                    : DOOR;
                set_levltyp(x, y, newt);
            }
            if (clear_flags) lev.flags = 0;
            maketrap_unearth_objs(x, y);
            recalc_block_point(x, y);
        }
        break;
    }
    default:
        break;
    }

    if (!oldplace) {
        if (!game.level) return ttmp;
        if (!game.level.traps) game.level.traps = [];
        game.level.traps.push(ttmp);
    }
    return ttmp;
}

// C ref: trap.c t_at()
export function t_at(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && t.tx === x && t.ty === y) return t;
    }
    return null;
}

/** C ref: trap.c count_traps — number of traps of type ttyp on this level. */
export function count_traps(ttyp) {
    let ret = 0;
    const traps = game.level?.traps;
    if (!traps) return 0;
    for (const t of traps) {
        if (t && (t.ttyp | 0) === (ttyp | 0)) ret++;
    }
    return ret;
}

// C ref: trap.c t_missile() — single arrow/dart/rock for a trap
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);
    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx;
    otmp.oy = trap.ty;
    return otmp;
}

// C ref: display.h _canseemon — wormno ? worm_known : cansee||infrared.
function canseemon(mtmp) {
    if (!mtmp) return false;
    const loc_seen = mtmp.wormno
        ? worm_known(mtmp)
        : (cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp));
    return loc_seen && mon_visible(mtmp);
}

// C ref: mon.c m_in_air — flyer/floater; cling+ceiling mundetected deferred
function m_in_air(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return false;
    if (is_flyer(ptr) || is_floater(ptr)) return true;
    return !!(is_clinger(ptr) && mtmp.mundetected);
}

// C ref: trap.c trapnote — "an F note" / "a C note" (+ noprefix bare name)
const TN_NAMES = [
    'C note', 'D flat', 'D note', 'E flat',
    'E note', 'F note', 'F sharp', 'G note',
    'G sharp', 'A note', 'B flat', 'B note',
];
function trapnote(trap, noprefix) {
    const tn = TN_NAMES[trap?.tnote | 0] || 'C note';
    return noprefix ? tn : an(tn);
}

// C ref: pline.c You_hear — acoustics/Deaf gate; Unaware/Underwater deferred
async function You_hear(line) {
    const u = game.u || {};
    const Unaware = (u.multi | 0) < 0 && !!u.usleep;
    if ((u.Deaf && !Unaware) || game.flags?.acoustics === false) return;
    if (u.Underwater) await pline(`You barely hear ${line}`);
    else if (Unaware) await pline(`You dream that you hear ${line}`);
    else await pline(`You hear ${line}`);
}

// C ref: mon.c wake_nearto — clear sleep/wait within dist2; zombies deferred
function wake_nearto(x, y, distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        if (distance === 0 || dist2(mtmp.mx, mtmp.my, x, y) < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
}

// C ref: mon.c corpse_chance — AT_BOOM then always-TRUE arms then !rn2(tmp).
// Named omissions: Vlad/lich dust; swallowed boom; LEVEL_SPECIFIC_NOCORPSE.
async function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
    const slots = mdat.mattk;
    if (slots) {
        for (let i = 0; i < 6; i++) {
            const at = slots[i];
            if (!at || (at.aatyp | 0) !== 14 /* AT_BOOM */) continue;
            if (at.damn) d(at.damn | 0, at.damd | 0);
            else if (at.damd) d((mdat.mlevel | 0) + 1, at.damd | 0);
            await mon_explodes(mon, at);
            return false;
        }
    }
    if ((((bigmonst(mdat) || (mdat.mndx ?? -1) === PM_LIZARD) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)) {
        return true;
    }
    const tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c mondead → m_detach(due_to_death) → relobj
function mondead(mtmp) {
    mtmp.mhp = 0;
    const mx = mtmp.mx, my = mtmp.my;
    const mndx = mtmp.mnum ?? mtmp.data?.mndx;
    if (mndx != null && mndx >= LOW_PM) {
        if (!game.mvitals) game.mvitals = [];
        const slot = game.mvitals[mndx] || (game.mvitals[mndx] = {
            mvflags: 0, born: 0, died: 0,
        });
        if ((slot.died | 0) < 255) slot.died = (slot.died | 0) + 1;
    }
    // C: m_detach — stay on fmon until dmonsfree
    mtmp.mstate = (mtmp.mstate | 0) | MON_DETACH;
    relobj_on_death(mtmp);
    // C mon.c mondead: glyph_is_invisible → unmap_object
    if (mx > 0 && glyph_is_invisible(game.level?.at?.(mx, my))) {
        unmap_object(mx, my);
    }
    if (mx > 0) newsym(mx, my);
}

// C ref: mon.c mondied → mondead + maybe make_corpse
async function mondied(mdef) {
    mondead(mdef);
    if ((mdef.mhp | 0) > 0) return; /* lifesaved */
    if (await corpse_chance(mdef)) make_corpse(mdef);
}

// C ref: mon.c monkilled :3384–3385 — trap fltxt path (D-1550).
// Sight is wormno ? worm_known : cansee(head), not infrared (same as
// mhitm.js). Named omit: nonliving "destroyed"; pet roast; pline_mon;
// disintegested mondead.
async function monkilled(mdef, fltxt, _how) {
    const mptr = mdef.data;
    const txt = fltxt || '';
    if (mdef.wormno ? worm_known(mdef) : cansee(mdef.mx, mdef.my)) {
        const verb = 'killed'; /* nonliving → destroyed deferred */
        void mptr;
        await pline(`${Monnam(mdef)} is ${verb}${txt ? ' by the ' : ''}${txt}!`);
    } else if (mdef.mtame) {
        game.iflags = game.iflags || {};
        game.iflags.sad_feeling = true;
    }
    await mondied(mdef);
}

// C ref: trap.c mselftouch — MON_WEP CORPSE + touch_petrifies → minstapetrify
export async function mselftouch(mon, arg, byplayer) {
    const mwep = MON_WEP(mon);
    const CORPSE = objectNames.indexOf('CORPSE');
    if (mwep && (mwep.otyp | 0) === CORPSE
        && touch_petrifies(mons(mwep.corpsenm))
        && !resists_ston(mon)) {
        if (cansee(mon.mx | 0, mon.my | 0)) {
            const who = arg
                ? `${arg}${mon_nam(mon)}`
                : Monnam(mon);
            const corpse = `the ${pmname(mwep.corpsenm, NEUTRAL)} corpse`;
            await pline(`${who} touches ${corpse}.`);
        }
        await minstapetrify(mon, byplayer);
        if ((mon.mhp | 0) > 0
            && !which_armor(mon, W_ARMG)
            && !resists_ston(mon)) {
            mwepgone(mon);
        }
    }
}

/** C obj.h IRON material index. */
const MAT_IRON = 11;

/**
 * C ref: trap.c wearing_iron_shoes — which_armor(W_ARMF) + oc_material==IRON.
 * Hero uses u.uarmf (C worn.c which_armor(&youmonst)).
 */
function wearing_iron_shoes(mtmp) {
    const armf = is_youmonst(mtmp)
        ? game.u?.uarmf
        : which_armor(mtmp, W_ARMF);
    if (!armf) return false;
    return (game.objects?.[armf.otyp]?.oc_material | 0) === MAT_IRON;
}

// C ref: trap.c thitm() — monster hit by trap missile / pit fall damage
async function thitm(tlev, mon, obj, d_override, nocorpse) {
    // C mon_leaving_level keeps stale mx/my after death for place_object
    const place_x = mon?.mx;
    const place_y = mon?.my;
    let strike;
    if (d_override) {
        strike = 1;
    } else if (obj) {
        strike = (find_mac(mon) + tlev + (obj.spe | 0) <= rnd(20)) ? 1 : 0;
    } else {
        strike = (find_mac(mon) + tlev <= rnd(20)) ? 1 : 0;
    }

    let trapkilled = false;
    if (!strike) {
        // C: pline before place_object — triggers --More-- after prior cursemsg
        if (obj && cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} is almost hit by ${doname(obj)}!`);
        }
    } else {
        // C: stone_missile && passes_rocks → harmless (strike=0, keep missile)
        // Named omission: stone_missile/harmless arm — not dart/arrow path.
        if (obj && cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} is hit by ${doname(obj)}!`);
        }
        let dam = 1;
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            // C ref: trap.c thitm — dam = dmgval(obj, mon); if (dam < 1) dam = 1
            dam = dmgval(obj, mon);
            if (dam < 1) dam = 1;
        }
        mon.mhp = (mon.mhp || 0) - dam;
        if (mon.mhp <= 0) {
            const xx = mon.mx, yy = mon.my;
            await monkilled(mon, '', nocorpse ? -AD_PHYS /* -AD_RBRE */ : AD_PHYS);
            if ((mon.mhp | 0) <= 0) {
                newsym(xx, yy);
                trapkilled = true;
            }
            if (obj) { /* dealloc_obj stub */ }
            // place_object only when !strike || d_override — see below
        } else if (obj) {
            /* dealloc_obj stub — missile used up on hit */
        }
    }

    // C: place missile on miss (or d_override path); uses stale mon mx/my
    if (obj && (!strike || d_override)) {
        place_object(obj, place_x, place_y);
        stackobj(obj);
    }
    return trapkilled;
}

// C ref: trap.c seetrap()
export function seetrap(trap) {
    if (trap && !trap.tseen) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
}

// C ref: trap.c deltrap — remove from ftrap list (shop/region cleanup deferred)
export function deltrap(trap) {
    const traps = game.level?.traps;
    if (!traps || !trap) return;
    const i = traps.indexOf(trap);
    if (i >= 0) traps.splice(i, 1);
}

/**
 * C ref: trap.c conjoined_pits — adjacent pits linked via conjoined bits.
 * @param {object|null} trap2
 * @param {object|null} trap1
 * @param {boolean} u_entering_trap2
 */
export function conjoined_pits(trap2, trap1, u_entering_trap2) {
    if (!trap1 || !trap2) return false;
    if (!isok(trap2.tx, trap2.ty) || !isok(trap1.tx, trap1.ty)
        || !is_pit(trap2.ttyp)
        || !is_pit(trap1.ttyp)
        || (u_entering_trap2
            && !(game.u?.utrap && (game.u.utraptype | 0) === TT_PIT))) {
        return false;
    }
    const dx = sgn((trap2.tx | 0) - (trap1.tx | 0));
    const dy = sgn((trap2.ty | 0) - (trap1.ty | 0));
    const diridx = xytodir(dx, dy);
    if (diridx !== DIR_ERR) {
        const adjidx = DIR_180(diridx);
        if (((trap1.conjoined | 0) & (1 << diridx))
            && ((trap2.conjoined | 0) & (1 << adjidx))) {
            return true;
        }
    }
    return false;
}

/**
 * C ref: trap.c adj_nonconjoined_pit — walk from a pit you are trapped
 * in into an adjacent pit that is not conjoined.
 */
function adj_nonconjoined_pit(adjtrap) {
    const u = game.u || {};
    const trap_with_u = t_at(u.ux0, u.uy0);
    if (trap_with_u && adjtrap && u.utrap && (u.utraptype | 0) === TT_PIT
        && is_pit(trap_with_u.ttyp) && is_pit(adjtrap.ttyp)) {
        if (xytodir(u.dx, u.dy) !== DIR_ERR) return true;
    }
    return false;
}

/**
 * C ref: trap.c uteetering_at_seen_pit — seen pit under the hero, not
 * trapped in it (standing on the precipice).
 * @param {object|null} trap
 */
export function uteetering_at_seen_pit(trap) {
    const u = game.u || {};
    return !!(trap && is_pit(trap.ttyp) && trap.tseen
        && u_at(trap.tx, trap.ty)
        && !(u.utrap && (u.utraptype | 0) === TT_PIT));
}

/**
 * C ref: trap.c uescaped_shaft — seen hole/trapdoor under the hero.
 * @param {object|null} trap
 */
export function uescaped_shaft(trap) {
    return !!(trap && is_hole(trap.ttyp) && trap.tseen
        && u_at(trap.tx, trap.ty));
}

/**
 * C ref: trap.c delfloortrap — destroy floor-emanating trap types.
 * Clears hero utrap (unless buried ball) or mon mtrapped, then deltrap.
 */
export function delfloortrap(ttmp) {
    if (!ttmp) return false;
    const ttyp = ttmp.ttyp | 0;
    if (ttyp === SQKY_BOARD || ttyp === BEAR_TRAP || ttyp === LANDMINE
        || ttyp === FIRE_TRAP || is_pit(ttyp) || is_hole(ttyp)
        || ttyp === TELEP_TRAP || ttyp === LEVEL_TELEP
        || ttyp === WEB || ttyp === MAGIC_TRAP || ttyp === ANTI_MAGIC) {
        if (u_at(ttmp.tx, ttmp.ty)) {
            if ((game.u?.utraptype | 0) !== TT_BURIEDBALL) {
                reset_utrap(true);
            }
        } else {
            const mtmp = m_at(ttmp.tx, ttmp.ty);
            if (mtmp) mtmp.mtrapped = 0;
        }
        deltrap(ttmp);
        return true;
    }
    return false;
}

/** Hero sentinel: game.youmonst or explicit _youmonst flag from dotrap. */
function is_youmonst(mtmp) {
    return !!(mtmp && (mtmp === game.youmonst || mtmp._youmonst));
}

/**
 * C ref: trap.c floor_trigger — types that fire when touching the floor.
 * Envelope matches C switch (incl. bear/landmine/gas/rust/fire).
 */
function floor_trigger(ttyp) {
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

/**
 * C ref: trap.c check_in_air — HURTLING / Levitation·floater /
 * Flying·flyer (!plunged). Clinger mundetected is m_in_air only, not here.
 * Hero Levitation/Flying are youprop.h macros, not sticky u.Levitation
 * / u.Flying (D-1070).
 */
function hero_Levitation() {
    const u = game.u || {};
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}
function hero_Flying() {
    const u = game.u || {};
    const steedFlyer = !!(u.usteed && is_flyer(u.usteed.data));
    return !!(((u.HFlying | 0) || (u.EFlying | 0) || steedFlyer)
        && !(u.BFlying | 0));
}
function check_in_air(mtmp, trflags) {
    const is_you = is_youmonst(mtmp);
    const plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;
    return ((trflags & HURTLING) !== 0
        || (is_you ? hero_Levitation() : is_floater(mtmp?.data))
        || ((is_you ? hero_Flying() : is_flyer(mtmp?.data)) && !plunged));
}

/**
 * C ref: trap.c trapname / defsym.h trap PCHAR explanations.
 * Hallucination override deferred (always FALSE path).
 */
const TRAP_EXPLANATIONS = [
    '', // NO_TRAP
    'arrow trap',
    'dart trap',
    'falling rock trap',
    'squeaky board',
    'bear trap',
    'land mine',
    'rolling boulder trap',
    'sleeping gas trap',
    'rust trap',
    'fire trap',
    'pit',
    'spiked pit',
    'hole',
    'trap door',
    'teleportation trap',
    'level teleporter',
    'magic portal',
    'web',
    'statue trap',
    'magic trap',
    'anti-magic field',
    'polymorph trap',
    'vibrating square',
    'trapped door',
    'trapped chest',
];

/**
 * C ref: trap.c sokoban_guilt — Sokoban ≡ level.flags.sokoban_rules.
 * Conduct + luck only; C TODO feedback still unnamed. maybe_finish_sokoban
 * and other callers (zap/read/steed/dig) still named. nopick m-dir D-1262.
 */
export function sokoban_guilt() {
    const Sokoban = !!(game.Sokoban || game.level?.flags?.sokoban_rules);
    if (Sokoban) {
        const u = game.u || (game.u = {});
        if (!u.uconduct) u.uconduct = {};
        u.uconduct.sokocheat = (u.uconduct.sokocheat | 0) + 1;
        change_luck(-1);
    }
}

/** C ref: trap.c trapname(ttyp, override) — non-hallucination only. */
export function trapname(ttyp, _override) {
    const t = ttyp | 0;
    if (t > NO_TRAP && t < TRAPNUM) return TRAP_EXPLANATIONS[t] || 'trap';
    return 'trap';
}

/**
 * C ref: trap.c into_vs_onto — True → "into" that trap, else "onto".
 */
export function into_vs_onto(traptype) {
    switch (traptype | 0) {
    case BEAR_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
    case WEB:
        return true;
    default:
        return false;
    }
}

/** C dungeon.c has_ceiling — endgame non-earth has no ceiling. */
function has_ceiling_trap(lev) {
    if (In_endgame(lev) && !Is_earthlevel(lev)) return false;
    return true;
}

/**
 * C youprop.h Sleep_resistance / Antimagic — H||E; confer writes uprops
 * only (D-1089). Sticky flats kept for poly/eat.
 */
function Sleep_resistance() {
    const u = game.u || {};
    return !!((u.HSleep_resistance | 0) || (u.ESleep_resistance | 0)
        || u.Sleep_resistance);
}
function Antimagic_prop() {
    const u = game.u || {};
    return !!((u.HAntimagic | 0) || (u.EAntimagic | 0) || u.Antimagic);
}

/**
 * C ref: trap.c immune_to_trap. Hero MAGIC_PORTAL is NOT_IMMUNE so
 * ParanoidTrap still asks (hack.c avoid_trap_andor_region). Named
 * omissions: monster ANTI_MAGIC resists_magm/attacktype; FIRE/MAGIC
 * invent-burn walk (hero FIRE is at most HIDDEN — still asks);
 * POLY resists_magm (hero Antimagic is HIDDEN — still asks).
 */
export function immune_to_trap(mon, ttype) {
    if (!mon) return TRAP_NOT_IMMUNE;
    const pm = mon.data;
    const is_you = is_youmonst(mon);
    const u = game.u || {};
    const Sokoban = !!(game.level?.flags?.sokoban_rules || game.Sokoban);
    const t = ttype | 0;

    switch (t) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
        return TRAP_NOT_IMMUNE;
    case BEAR_TRAP:
        if (pm && ((pm.msize | 0) <= MZ_SMALL
            || amorphous(pm) || is_whirly(pm) || unsolid(pm))) {
            return TRAP_CLEARLY_IMMUNE;
        }
        // FALLTHROUGH
    case SQKY_BOARD:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case HOLE:
    case TRAPDOOR:
    case PIT:
    case SPIKED_PIT:
        if (Sokoban && (is_pit(t) || is_hole(t))) return TRAP_NOT_IMMUNE;
        if (In_sokoban(u.uz) && t === ROLLING_BOULDER_TRAP) {
            return TRAP_CLEARLY_IMMUNE;
        }
        if (pm && (is_floater(pm) || is_flyer(pm)
            || (is_clinger(pm) && has_ceiling_trap(u.uz)))) {
            return TRAP_CLEARLY_IMMUNE;
        }
        if (is_you && (hero_Levitation() || hero_Flying())) {
            return TRAP_CLEARLY_IMMUNE;
        }
        return TRAP_NOT_IMMUNE;
    case SLP_GAS_TRAP:
        if (pm && breathless(pm)) return TRAP_CLEARLY_IMMUNE;
        if (!is_you && resists_sleep(mon)) return TRAP_CLEARLY_IMMUNE;
        if (is_you && Sleep_resistance()) return TRAP_HIDDEN_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case LEVEL_TELEP:
    case TELEP_TRAP:
        // C wizard.c mon_has_amulet walks mtmp->minvent (youmonst.minvent
        // is not gi.invent — hero-with-Amulet is not CLEARLY via this).
        if (In_endgame(u.uz)) return TRAP_CLEARLY_IMMUNE;
        for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) {
            if ((otmp.otyp | 0) === AMULET_OF_YENDOR) return TRAP_CLEARLY_IMMUNE;
        }
        return TRAP_NOT_IMMUNE;
    case POLY_TRAP:
        if (is_you && Antimagic_prop()) return TRAP_HIDDEN_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case STATUE_TRAP:
        if (!is_you) return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case WEB:
        if (pm && (webmaker(pm) || amorphous(pm) || is_whirly(pm) || flaming(pm)
            || unsolid(pm) || (pm.mndx ?? -1) === PM_GELATINOUS_CUBE)) {
            return TRAP_CLEARLY_IMMUNE;
        }
        return TRAP_NOT_IMMUNE;
    case ANTI_MAGIC:
        if (is_you) {
            if (Antimagic_prop()) return TRAP_NOT_IMMUNE;
            if ((u.uenmax | 0) === 0) return TRAP_HIDDEN_IMMUNE;
        }
        return TRAP_NOT_IMMUNE;
    case RUST_TRAP:
        if ((pm?.mndx ?? -1) === PM_IRON_GOLEM) return TRAP_NOT_IMMUNE;
        for (let obj = is_you ? game.invent : mon.minvent; obj; obj = obj.nobj) {
            if (is_rustprone(obj) && (obj.owornmask | 0)) {
                if (is_you && (obj === u.uquiver
                    || (obj === u.uswapwep && !u.twoweap))) {
                    continue;
                }
                return TRAP_NOT_IMMUNE;
            }
        }
        return TRAP_CLEARLY_IMMUNE;
    case MAGIC_TRAP:
        if (is_you) return TRAP_NOT_IMMUNE;
        // FALLTHROUGH — monsters: fire-trap replica
    case FIRE_TRAP:
        if (is_you) {
            if (!Fire_resistance()) return TRAP_NOT_IMMUNE;
            return TRAP_HIDDEN_IMMUNE;
        }
        if (!resists_fire(mon)) return TRAP_NOT_IMMUNE;
        return TRAP_CLEARLY_IMMUNE;
    case MAGIC_PORTAL:
        if (!is_you) return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case VIBRATING_SQUARE:
        return TRAP_CLEARLY_IMMUNE;
    default:
        return TRAP_NOT_IMMUNE;
    }
}

/**
 * C ref: trap.c dotrap — hero steps on a trap.
 * Envelope: nomul(0); floor_trigger+in_air skip; already_seen escape rn2(5);
 * mons_see_trap; trapeffect_selector(youmonst). Named omissions: Sokoban
 * air-currents, undestroyable/ANTI_MAGIC/Fumbling force, conj/adj pit
 * escape, steed mon_learns; FORCETRAP morph recursion; hero slp_gas/
 * anti-magic/…  Hero pit/hole via trapeffect_pit / trapeffect_hole.
 */
export async function dotrap(trap, trflags = NO_TRAP_FLAGS) {
    if (!trap) return;
    const u = game.u;
    if (!u) return;
    const ttype = trap.ttyp;
    const already_seen = !!trap.tseen;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const forcebungle = (trflags & FORCEBUNGLE) !== 0;
    const a_your = ['a', 'your'];

    nomul(0);

    if (!forcetrap) {
        if (floor_trigger(ttype)
            && check_in_air(game.youmonst || { _youmonst: true }, trflags)) {
            if (already_seen) {
                const art = (ttype === ARROW_TRAP && !trap.madeby_u)
                    ? 'an' : a_your[trap.madeby_u ? 1 : 0];
                await pline(`You step over ${art} ${trapname(ttype, false)}.`);
            }
            return;
        }
        // plunge / conj_pit / adj_pit still named
        if (already_seen && !u.Fumbling && !undestroyable_trap(ttype)
            && ttype !== ANTI_MAGIC
            && !forcebungle
            && !rn2(5)) {
            const art = (ttype === ARROW_TRAP && !trap.madeby_u)
                ? 'an' : a_your[trap.madeby_u ? 1 : 0];
            await pline(`You escape ${art} ${trapname(ttype, false)}.`);
            return;
        }
    }

    // C: steed mon_learns_traps deferred; mons_see_trap before effect
    mons_see_trap(trap);
    const you = game.youmonst || { _youmonst: true };
    await trapeffect_selector(you, trap, trflags);
}

/**
 * C objnam.c Yname2 — capitalized yname.
 * C quest.h Is_qlocate — on_level vs qlocate_level.
 * C hack.c u_locomotion — Lev/Fly verbs; poly locomotion() deferred.
 */
function Yname2_pit(obj) {
    return upstart(yname(obj));
}
function Is_qlocate_lev(lev) {
    const loc = game.qlocate_level;
    if (!lev || !loc) return false;
    return (lev.dnum | 0) === (loc.dnum | 0)
        && (lev.dlevel | 0) === (loc.dlevel | 0);
}
function u_locomotion_pit(defWord) {
    if (hero_Levitation()) return 'float';
    if (hero_Flying()) return 'fly';
    return defWord;
}

/** C hack.c losehp then maybe_wail / done(DIED). */
async function finish_hero_losehp() {
    await finish_maybe_wail();
    if (game._losehp_needs_done) {
        const { finish_losehp_done } = await import('./end.js');
        await finish_losehp_done();
        return true;
    }
    return !!(game.program_state?.gameover);
}

/**
 * C ref: trap.c steedintrap — PIT/SPIKED_PIT arm only (other types omit).
 * Returns 0 when no steed (hero takes the fall); 1 if steed was hit;
 * Trap_Killed_Mon if the steed died.
 */
async function steedintrap_pit(trap) {
    const u = game.u || {};
    const steed = u.usteed;
    if (!steed || !trap) return Trap_Effect_Finished;
    steed.mx = u.ux;
    steed.my = u.uy;
    const tt = trap.ttyp | 0;
    const trapkilled = (steed.mhp | 0) <= 0
        || await thitm(0, steed, null, rnd(tt === PIT ? 6 : 10), false);
    if (trapkilled) {
        const { dismount_steed } = await import('./steed.js');
        await dismount_steed(DISMOUNT_POLY);
        return Trap_Killed_Mon;
    }
    return 1;
}

/**
 * C ref: trap.c trapeffect_pit — hero + monster branches.
 * Hero: Lev/Fly skip, clinger, fall/plunge/sit verbs, spikes, set_utrap
 * rn1(6,2), losehp, SPIKED poisoned(), selftouch, exercise STR/DEX.
 * Named omissions: Punished ballfall/unplacebc/placebc; poly locomotion.
 */
async function trapeffect_pit(mtmp, trap, trflags) {
    const ttype = trap.ttyp;
    let relevant_spikes = ttype === SPIKED_PIT;
    const a_your = ['a', 'your'];
    const A_Your = ['A', 'Your'];

    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        const plunged = (trflags & TOOKPLUNGE) !== 0;
        const viasitting = (trflags & VIASITTING) !== 0;
        const conj_pit = conjoined_pits(trap, t_at(u.ux0, u.uy0), true);
        const adj_pit = adj_nonconjoined_pit(trap);
        const already_known = !!trap.tseen;
        let deliberate = false;
        let steed_article = ARTICLE_THE;
        const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);

        if (u.usteed && has_mgivenname(u.usteed) && !Hallucination()) {
            steed_article = ARTICLE_NONE;
        }

        // C: !Sokoban && (Levitation || (Flying && !plunged && !viasitting))
        if (!Sokoban && (hero_Levitation()
            || (hero_Flying() && !plunged && !viasitting))) {
            return Trap_Effect_Finished;
        }
        feeltrap(trap);
        if (!Sokoban && is_clinger(game.youmonst?.data) && !plunged) {
            const spiked = ttype === SPIKED_PIT ? 'spiked ' : '';
            if (already_known) {
                await pline(
                    `You see ${a_your[trap.madeby_u ? 1 : 0]} ${spiked}pit below you.`,
                );
            } else {
                const full = ttype === SPIKED_PIT ? 'full of spikes ' : '';
                await pline(
                    `${A_Your[trap.madeby_u ? 1 : 0]} pit ${full}opens up under you!`,
                );
                await pline("You don't fall in!");
            }
            return Trap_Effect_Finished;
        }
        if (!Sokoban) {
            let verbbuf = '';
            if (u.usteed) {
                if ((trflags & RECURSIVETRAP) !== 0) {
                    verbbuf = `and ${x_monnam(u.usteed, steed_article, null, SUPPRESS_SADDLE, false)} fall`;
                } else {
                    verbbuf = `lead ${x_monnam(u.usteed, steed_article, 'poor', SUPPRESS_SADDLE, false)}`;
                }
            } else if (game.iflags?.menu_requested && already_known) {
                await pline(
                    `You carefully ${u_locomotion_pit('lower yourself')} into the pit.`,
                );
                deliberate = true;
            } else if (conj_pit) {
                await pline('You move into an adjacent pit.');
            } else if (adj_pit) {
                await pline(
                    `You stumble over debris${!rn2(5) ? ' between the pits' : ''}.`,
                );
            } else {
                verbbuf = !plunged ? 'fall' : (hero_Flying() ? 'dive' : 'plunge');
            }
            if (verbbuf) {
                await pline(
                    `You ${verbbuf} into ${a_your[trap.madeby_u ? 1 : 0]} pit!`,
                );
            }
        }
        if (Role_if(PM_RANGER) && !trap.madeby_u && !trap.once
            && In_quest(u.uz) && Is_qlocate_lev(u.uz)) {
            await pline('Fortunately it has a bottom after all...');
            trap.once = 1;
        } else if ((u.umonnum | 0) === PM_PIT_VIPER
            || (u.umonnum | 0) === PM_PIT_FIEND) {
            await pline("How pitiful.  Isn't that the pits?");
        }
        if (relevant_spikes && wearing_iron_shoes(mtmp)) {
            await pline(
                `${Yname2_pit(u.uarmf)} protects you from the sharp iron spikes.`,
            );
            relevant_spikes = false;
        } else if (relevant_spikes) {
            const predicament = 'on a set of sharp iron spikes';
            if (u.usteed) {
                await pline(
                    `${upstart(x_monnam(u.usteed, steed_article, 'poor', SUPPRESS_SADDLE, false))} ${conj_pit ? 'steps' : 'lands'} ${predicament}!`,
                );
            } else {
                await pline(
                    `You ${conj_pit ? 'step' : 'land'} ${predicament}!`,
                );
            }
        }
        set_utrap(rn1(6, 2), TT_PIT);
        if (!await steedintrap_pit(trap)) {
            if (relevant_spikes) {
                const oldumort = u.umortality | 0;
                losehp(
                    maybe_half_phys(rnd(conj_pit ? 4 : adj_pit ? 6 : 10)),
                    plunged
                        ? 'deliberately plunged into a pit of iron spikes'
                        : (conj_pit || deliberate)
                            ? 'stepped into a pit of iron spikes'
                            : adj_pit
                                ? 'stumbled into a pit of iron spikes'
                                : 'fell into a pit of iron spikes',
                    NO_KILLER_PREFIX,
                );
                if (await finish_hero_losehp()) return Trap_Effect_Finished;
                if (!rn2(6)) {
                    await poisoned(
                        'spikes', A_STR,
                        (conj_pit || adj_pit || deliberate)
                            ? 'stepping on poison spikes'
                            : 'fall onto poison spikes',
                        ((u.umortality | 0) > oldumort) ? 0 : 8,
                        false,
                    );
                    if (game.program_state?.gameover) {
                        return Trap_Effect_Finished;
                    }
                }
            } else if (!conj_pit && !deliberate
                && !(plunged && (hero_Flying()
                    || is_clinger(game.youmonst?.data)))) {
                losehp(
                    maybe_half_phys(rnd(adj_pit ? 3 : 6)),
                    plunged ? 'deliberately plunged into a pit'
                        : 'fell into a pit',
                    NO_KILLER_PREFIX,
                );
                if (await finish_hero_losehp()) return Trap_Effect_Finished;
            }
            // Punished !carried(uball) unplacebc/ballfall/placebc deferred
            if (!conj_pit) await selftouch('Falling, you');
            game.vision_full_recalc = 1;
            exercise(A_STR, false);
            exercise(A_DEX, false);
        }
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    let trapkilled = false;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);
    const inescapable = forcetrap || (Sokoban && !trap.madeby_u);
    const mptr = mtmp.data;
    let fallverb = 'falls';

    if (!grounded(mptr) || (mtmp.wormno && (mtmp.wormno | 0) > 5)) {
        if (forcetrap && !Sokoban) {
            if (in_sight) {
                seetrap(trap);
                await pline(`${Monnam(mtmp)} doesn't fall into the pit.`);
            }
            return Trap_Effect_Finished;
        }
        if (!inescapable) return Trap_Effect_Finished;
        fallverb = 'is dragged';
    }
    if (!passes_walls(mptr)) mtmp.mtrapped = 1;
    if (in_sight) {
        await pline(
            `${Monnam(mtmp)} ${fallverb} into ${a_your[trap.madeby_u ? 1 : 0]} pit!`,
        );
        seetrap(trap);
    }
    await mselftouch(mtmp, 'Falling, ', false);
    if (wearing_iron_shoes(mtmp)) relevant_spikes = false;
    if ((mtmp.mhp | 0) <= 0
        || await thitm(0, mtmp, null, rnd(relevant_spikes ? 10 : 6), false)) {
        trapkilled = true;
    }
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

// C ref: trap.c trapeffect_dart_trap — hero + monster branches
async function trapeffect_dart_trap(mtmp, trap) {
    if (is_youmonst(mtmp)) {
        const u = game.u;
        if (trap.once && trap.tseen && !rn2(15)) {
            await pline('You hear a soft click.');
            deltrap(trap);
            newsym(u.ux, u.uy);
            return Trap_Is_Gone;
        }
        trap.once = true;
        seetrap(trap);
        await pline('A little dart shoots out at you!');
        let otmp = t_missile(DART, trap);
        if (!rn2(6)) otmp.opoisoned = 1;
        const dam = dmgval(otmp, game.youmonst || mtmp);
        // steedintrap arm deferred (usteed rare at L1 commons)
        const box = { obj: otmp };
        // thitu plines are sync-append-safe after the shoot message
        if (await thitu(7, maybe_half_phys(dam), box, 'little dart')) {
            otmp = box.obj;
            if (otmp) {
                // poisoned() body deferred — still consume dart (obfree)
                // Named omission: poison attrib / HP when opoisoned
                // obfree: no obj_resists (delobj would burn rn2)
            }
            return Trap_Effect_Finished;
        }
        otmp = box.obj;
        if (otmp) {
            place_object(otmp, u.ux, u.uy);
            if (!u.Blind) observe_object(otmp);
            stackobj(otmp);
            newsym(u.ux, u.uy);
        }
        return Trap_Effect_Finished;
    }

    // Monster branch
    if (trap.once && trap.tseen && !rn2(15)) {
        // deltrap omitted visually; remove from list
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }
    trap.once = true;
    const otmp = t_missile(DART, trap);
    if (!rn2(6)) otmp.opoisoned = 1;
    // C: if (in_sight) seetrap(trap);
    seetrap(trap);
    const trapkilled = await thitm(7, mtmp, otmp, 0, false);
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

// C ref: trap.c feeltrap — mark seen + redisplay via newsym → map_trap
export function feeltrap(trap) {
    if (!trap) return;
    trap.tseen = true;
    newsym(trap.tx, trap.ty);
}

/** C ref: mkobj.c sobj_at — first floor object of otyp at (x,y). */
function sobj_at(otyp, x, y) {
    // objects_at returns nexthere chain head, not an array
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === (otyp | 0)) return o;
    }
    return null;
}

/**
 * C ref: trap.c launch_obj — roll/fly ammo from (x1,y1) toward (x2,y2).
 * Envelope: find otyp (BOULDER also tries otherside); extract/split;
 * DISP_FLASH tmp_at + nh_delay_output while cansee (D-0890); ROLL path
 * with hero dmgval+thitu and mon ohitmon/throws_rocks snatch; stop on
 * obstructed/tree/door; IRONBARS hits_bars (D-0990); place at rest.
 * Mid-roll TELEP_TRAP / LEVEL_TELEP: cansee pline_xy else !Deaf You_hear,
 * then rloco or add_to_migration (D-1237). Mid-roll LANDMINE rn2(10)>2
 * KAABLAMM / fracture_rock / scatter + PIT/SPIKED_PIT/HOLE/TRAPDOOR
 * flooreffects + dist=-1 (D-1256). Named omissions: LAUNCH_UNSEEN
 * bowling msgs; dig context clear; launch_drop_spot bones; down_gate /
 * ship_object; post-switch flooreffects; boulder-on-boulder chain;
 * scatter MAY_FRACTURE/MAY_DESTROY/VIS_EFFECTS (explode.js); curs_on_u.
 * @returns {Promise<number>} 0 none, 1 placed, 2 used up
 */
async function launch_obj(otyp, x1, y1, x2, y2, style) {
    let otmp = sobj_at(otyp, x1, y1);
    let otherside = false;
    if (!otmp && otyp === BOULDER) {
        otherside = true;
        otmp = sobj_at(otyp, x2, y2);
    }
    if (!otmp) return 0;
    if (otherside) {
        const tx = x1, ty = y1;
        x1 = x2; y1 = y2;
        x2 = tx; y2 = ty;
    }

    let singleobj;
    if ((otmp.quan | 0) === 1) {
        obj_extract_self(otmp);
        singleobj = otmp;
        otmp = null;
    } else {
        singleobj = splitobj(otmp, 1);
        obj_extract_self(singleobj);
    }
    newsym(x1, y1);

    // C: ROLL|LAUNCH_KNOWN → otrapped; ROLL|LAUNCH_UNSEEN rumble deferred
    let delaycnt = 1;
    if ((style & (ROLL | LAUNCH_KNOWN)) === (ROLL | LAUNCH_KNOWN)) {
        singleobj.otrapped = 1;
        style &= ~LAUNCH_KNOWN;
    }
    if ((style & LAUNCH_UNSEEN) !== 0) {
        // rumble / bowling msgs deferred
        style &= ~LAUNCH_UNSEEN;
    }
    if ((style & ROLL) !== 0) delaycnt = 2;

    let dist = distmin(x1, y1, x2, y2);
    let x = x1;
    let y = y1;
    if (!game.bhitpos) game.bhitpos = {};
    game.bhitpos.x = x1;
    game.bhitpos.y = y1;
    const dx = sgn(x2 - x1);
    const dy = sgn(y2 - y1);
    let used_up = false;
    let xRest = x2;
    let yRest = y2;

    // C: tmp_at(DISP_FLASH, obj_to_glyph(...)); tmp_at(x,y) then roll loop
    // with delay when cansee — flash still visible if ohitmon pline → more().
    tmp_at(DISP_FLASH, obj_glyph(singleobj));
    tmp_at(x, y);

    try {
        while (dist-- > 0 && !used_up) {
            // C: tmp_at at current, delay, then advance, then hit checks
            tmp_at(x, y);
            if (cansee(x, y)) {
                let tmp = delaycnt;
                while (tmp-- > 0) await nh_delay_output();
            }

            if (!isok(game.bhitpos.x + dx, game.bhitpos.y + dy)) {
                xRest = x;
                yRest = y;
                break;
            }
            x = (game.bhitpos.x += dx);
            y = (game.bhitpos.y += dy);

            const mtmp = m_at(x, y);
            if (mtmp) {
                if (otyp === BOULDER && throws_rocks(mtmp.data) && rn2(3)) {
                    if (cansee(x, y)) {
                        await pline(`${Monnam(mtmp)} snatches the boulder.`);
                    }
                    singleobj.otrapped = 0;
                    mpickobj(mtmp, singleobj);
                    used_up = true;
                    break;
                }
                if (await ohitmon(
                    mtmp, singleobj, (style & ROLL) !== 0 ? -1 : dist, false,
                )) {
                    used_up = true;
                    break;
                }
            } else if (u_at(x, y)) {
                const dam = dmgval(singleobj, game.youmonst || null);
                if (game.multi) nomul(0);
                const box = { obj: singleobj };
                if (await thitu(
                    9 + (singleobj.spe | 0), maybe_half_phys(dam), box, null,
                )) {
                    await stop_occupation();
                }
                if (box.obj) singleobj = box.obj;
                else {
                    used_up = true;
                    break;
                }
            }

            /* C trap.c launch_obj 3423–3508 — ROLL mid-cell traps.
             * TELEP_TRAP / LEVEL_TELEP pline_xy then rloco or migrate
             * (D-1237). LANDMINE rn2(10)>2 KAABLAMM/fracture_rock/scatter
             * + PIT/SPIKED_PIT/HOLE/TRAPDOOR flooreffects+dist=-1 (D-1256).
             * down_gate / ship_object / post-switch flooreffects /
             * boulder-on-boulder / launch_drop_spot still named. */
            if (style === ROLL) {
                const t = t_at(x, y);
                if (t && otyp === BOULDER) {
                    let newlev = 0;
                    const ttyp = t.ttyp | 0;
                    if (ttyp === LANDMINE) {
                        if (rn2(10) > 2) {
                            if (cansee(x, y)) set_msg_xy(x, y);
                            await pline(`KAABLAMM!!!${
                                cansee(x, y)
                                    ? '  The rolling boulder triggers a land mine.'
                                    : ''
                            }`);
                            deltrap(t);
                            del_engr_at(x, y);
                            place_object(singleobj, x, y);
                            singleobj.otrapped = 0;
                            const { fracture_rock } = await import('./dig.js');
                            fracture_rock(singleobj);
                            await scatter(
                                x, y, 4,
                                MAY_DESTROY | MAY_HIT | MAY_FRACTURE
                                    | VIS_EFFECTS,
                                null,
                            );
                            if (cansee(x, y)) newsym(x, y);
                            used_up = true;
                        }
                    } else {
                        let telep = ttyp === TELEP_TRAP;
                        if (ttyp === LEVEL_TELEP) {
                            /* 20% stay (and 100% in Knox/endgame) skips
                             * the disappears message; FALLTHROUGH otherwise. */
                            newlev = random_teleport_level();
                            telep = newlev !== (depth(game.u?.uz) | 0);
                        }
                        if (telep) {
                            if (cansee(x, y)) {
                                await pline_xy(
                                    x, y,
                                    'Suddenly the rolling boulder disappears!',
                                );
                            } else if (!Deaf()) {
                                await You_hear('a rumbling stop abruptly.');
                            }
                            singleobj.otrapped = 0;
                            if (ttyp === TELEP_TRAP) {
                                rloco(singleobj);
                            } else {
                                add_to_migration(singleobj);
                                const dest = { dnum: 0, dlevel: 0 };
                                get_level(dest, newlev);
                                singleobj.ox = dest.dnum | 0;
                                singleobj.oy = dest.dlevel | 0;
                                singleobj.owornmask = MIGR_RANDOM;
                            }
                            seetrap(t);
                            used_up = true;
                        } else if (ttyp === PIT || ttyp === SPIKED_PIT
                            || ttyp === HOLE || ttyp === TRAPDOOR) {
                            /* boulder may survive a trapped monster
                             * (flooreffects hmon named); stop rolling. */
                            xRest = x;
                            yRest = y;
                            const { flooreffects } = await import('./do.js');
                            if (await flooreffects(
                                singleobj, xRest, yRest, 'fall',
                            )) {
                                used_up = true;
                            }
                            dist = -1;
                        }
                    }
                    if (used_up || dist === -1) break;
                }
            }

            if (dist > 0 && isok(x + dx, y + dy)) {
                const typ = game.level?.at?.(x + dx, y + dy)?.typ ?? 0;
                if (typ === IRONBARS) {
                    // C: object stops here; hits_bars may destroy (whodidit=0)
                    xRest = x;
                    yRest = y;
                    const box = { obj: singleobj };
                    if (await hits_bars(box, x, y, x + dx, y + dy, !rn2(20), 0)) {
                        if (!box.obj) {
                            used_up = true;
                        } else {
                            singleobj = box.obj;
                        }
                        break;
                    }
                } else if (IS_STWALL(typ) || IS_TREE(typ) || IS_OBSTRUCTED(typ)) {
                    xRest = x;
                    yRest = y;
                    break;
                }
                if (IS_DOOR(typ)) {
                    const loc = game.level.at(x + dx, y + dy);
                    const dm = loc?.doormask ?? loc?.flags ?? 0;
                    if ((dm & (D_CLOSED | D_LOCKED)) !== 0) {
                        // C: boulder crashes through closed door — continue
                        if (loc) loc.doormask = D_BROKEN;
                    }
                }
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
    }

    if (!used_up) {
        singleobj.otrapped = 0;
        place_object(singleobj, xRest, yRest);
        stackobj(singleobj);
        newsym(xRest, yRest);
        return 1;
    }
    return 2;
}

/**
 * C ref: trap.c trapeffect_rolling_boulder_trap — hero + monster.
 * Envelope: hero feeltrap + Click pline + launch_obj(BOULDER, ROLL);
 * monster grounded in_sight pline + launch. Named omissions: steed;
 * Deaf-only silent click already gated; full LAUNCH_UNSEEN style for far mon.
 */
async function trapeffect_rolling_boulder_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        const style = ROLL | (trap.tseen ? LAUNCH_KNOWN : 0);
        feeltrap(trap);
        const click = Deaf() ? '' : 'Click!  ';
        await pline(`${click}You trigger a rolling boulder trap!`);
        const lx = trap.launch?.x ?? trap.tx;
        const ly = trap.launch?.y ?? trap.ty;
        const l2x = trap.launch2?.x ?? trap.tx;
        const l2y = trap.launch2?.y ?? trap.ty;
        if (!(await launch_obj(BOULDER, lx, ly, l2x, l2y, style))) {
            if (style & LAUNCH_KNOWN) {
                await pline('No boulder was released.');
            } else {
                await pline('Fortunately for you, no boulder was released.');
            }
        }
    } else if (!m_in_air(mtmp)) {
        const in_sight = (mtmp === game.u?.usteed)
            || (cansee(mtmp.mx, mtmp.my) && canseemon(mtmp));
        const style = ROLL | (in_sight ? 0 : LAUNCH_UNSEEN);
        newsym(mtmp.mx, mtmp.my);
        if (in_sight) {
            const click = Deaf() ? '' : 'Click!  ';
            await pline(
                `${click}${Monnam(mtmp)} triggers ${
                    trap.tseen ? 'a rolling boulder trap' : 'something'
                }.`,
            );
        }
        if (await launch_obj(
            BOULDER,
            trap.launch?.x ?? trap.tx, trap.launch?.y ?? trap.ty,
            trap.launch2?.x ?? trap.tx, trap.launch2?.y ?? trap.ty,
            style,
        )) {
            if (in_sight) trap.tseen = true;
            if ((mtmp.mhp | 0) < 1) {
                return Trap_Killed_Mon;
            }
        }
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
    return Trap_Effect_Finished;
}

/** C hacklib.c s_suffix — steed foot msg in trapeffect_bear_trap. */
function s_suffix(s) {
    if (!s) return 'the';
    if (s === 'it') return 'its';
    if (s === 'you') return 'your';
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('sh') || s.endsWith('ch')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/**
 * C ref: trap.c set_utrap — set hero trap timer/type; botl when armed↔clear.
 * Named omission: float_vs_flight Lev/Fly block.
 */
export function set_utrap(tim, typ) {
    const u = game.u || (game.u = {});
    const was = !!(u.utrap | 0);
    const now = !!(tim | 0);
    if (was !== now) {
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    u.utrap = tim | 0;
    u.utraptype = now ? (typ | 0) : TT_NONE;
}

/**
 * C ref: trap.c reset_utrap — clear utrap; optional Lev/Fly restore msgs deferred.
 */
export function reset_utrap(_msg) {
    set_utrap(0, 0);
}

/**
 * C ref: trap.c back_on_ground — simplified surface wording.
 * Named omissions: ice_descr / surface / Levitation-Flying preposition
 * matrix beyond solid-ground default.
 */
async function back_on_ground(rescued) {
    const prefix = rescued ? 'You find yourself' : 'You are back';
    await pline(`${prefix} on solid ground.`);
    if (!game.iflags) game.iflags = {};
    game.iflags.last_msg = PLNMSG_BACK_ON_GROUND;
}

/**
 * C ref: trap.c rescued_from_terrain — post-tele/lifesave terrain feedback.
 * Envelope: DROWNING pool/air; BURNING/DISSOLVED pool/lava; else
 * back_on_ground(TRUE). Named omissions: waterlevel air bubble;
 * IS_WATERWALL "midst"; update_lastseentyp / prev_decor.
 */
export async function rescued_from_terrain(how) {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    let mesggiven = false;
    if (how === DROWNING) {
        if (is_pool(ux, uy)) {
            await pline(`You find yourself on top of ${hliquid('water')}.`);
            mesggiven = true;
        }
    } else if (how === BURNING || how === DISSOLVED) {
        if (is_pool(ux, uy)) {
            await pline(
                `You find yourself ${u.uinwater ? 'in' : 'on'} ${hliquid('water')}.`,
            );
            mesggiven = true;
        } else if (is_lava(ux, uy)) {
            await pline(
                `You find yourself on top of ${hliquid('molten lava')}.`,
            );
            mesggiven = true;
        }
    }
    if (!mesggiven) await back_on_ground(true);
}

/** C youprop.h Flying subset for float_up. */
function Flying_fu() {
    const u = game.u || {};
    if (u.Flying) return true;
    const blocked = (u.BFlying | 0);
    return !!(((u.HFlying | 0) || (u.EFlying | 0)) && !blocked);
}

/**
 * C ref: trap.c float_up — gain levitation messages + float_vs_flight +
 * encumber_msg.
 * Branch envelope: utrap PIT/lava/infloor/buriedball/web/bear; uinwater
 * spoteffects; uswallow animal/spiral; Hallucination; airlevel; default;
 * steed flyer/floater gate + dismount; Flying lose-control; float_vs_flight;
 * encumber_msg.
 * Named omissions: buried_ball exact coord; Lev_at_will steed float;
 * surface() wording (floor/ground stand-in).
 */
export async function float_up() {
    const u = game.u || (game.u = {});
    if (game.disp) game.disp.botl = true;
    if (game.flags) game.flags.botl = true;

    if (u.utrap) {
        const typ = u.utraptype | 0;
        if (typ === TT_PIT) {
            reset_utrap(false);
            await pline(`You float up, out of the ${trapname(PIT, false)}!`);
            game.vision_full_recalc = 1;
            const { fill_pit } = await import('./dig.js');
            fill_pit(u.ux | 0, u.uy | 0);
        } else if (typ === TT_LAVA || typ === TT_INFLOOR) {
            await pline(
                `Your body pulls upward, but your ${makeplural(body_part(LEG))} are still stuck.`,
            );
        } else if (typ === TT_BURIEDBALL) {
            // buried_ball(&cc) deferred — room vs ground via hero cell
            const loc = game.level?.at(u.ux | 0, u.uy | 0);
            const ground = loc && IS_ROOM(loc.typ) ? 'floor' : 'ground';
            await pline(
                `You feel lighter, but your ${body_part(LEG)} is still chained to the ${ground}.`,
            );
        } else if (typ === TT_WEB) {
            await pline(
                `You float up slightly, but you are still stuck in the ${trapname(WEB, false)}.`,
            );
        } else {
            await pline(
                `You float up slightly, but your ${body_part(LEG)} is still stuck.`,
            );
        }
    } else if (u.uinwater) {
        const { spoteffects } = await import('./pickup.js');
        await spoteffects(true);
    } else if (u.uswallow) {
        const stuck = u.ustuck;
        if (stuck && is_animal(stuck.data)) {
            await pline('You float away from the floor.');
        } else if (stuck) {
            await pline(`You spiral up into ${mon_nam(stuck)}.`);
        }
    } else if (Hallucination()) {
        await pline("Up, up, and awaaaay!  You're walking on air!");
    } else if (Is_airlevel(u.uz)) {
        await pline('You gain control over your movements.');
    } else {
        await pline('You start to float in the air!');
    }

    if (u.usteed && !is_floater(u.usteed.data) && !is_flyer(u.usteed.data)) {
        // Lev_at_will steed float deferred — always dismount path
        await pline(`You cannot stay on ${mon_nam(u.usteed)}.`);
        const { dismount_steed } = await import('./steed.js');
        const { DISMOUNT_GENERIC } = await import('./const.js');
        await dismount_steed(DISMOUNT_GENERIC);
    }
    if (Flying_fu()) {
        await pline('You are no longer able to control your flight.');
    }
    const { float_vs_flight } = await import('./polyself.js');
    float_vs_flight();
    await encumber_msg();
}

/**
 * C ref: trap.c float_down — stop levitating; land / pool / trap / pickup.
 * Branch envelope: H/E mask clear; still-Levitation early out; BLevitation
 * trapped feedback + float_vs_flight; Flying regain; uswallow; pool drown /
 * lava_effects; come-down msgs (incl. W_SADDLE skip); encumber_msg; dotrap;
 * pickup when still on level.
 * Named omissions: Punished ball drag to pit/pool; ustuck release wording
 * (sticks/digests); selftouch/dismount Sokoban fell; surface() exact;
 * Underwater vision; assign_level trapdoor skip via dnum/dlevel compare.
 * @param {number} hmask clear from HLevitation
 * @param {number} emask clear from ELevitation (W_SADDLE skips come-down msgs)
 * @returns {Promise<number>} 0 still levitating/blocked; 1 came down
 */
export async function float_down(hmask, emask) {
    const u = game.u || (game.u = {});
    let trap = null;
    let no_msg = false;

    u.HLevitation = (u.HLevitation | 0) & ~(hmask | 0);
    u.ELevitation = (u.ELevitation | 0) & ~(emask | 0);
    if (Levitation_fd()) return 0;

    if (u.BLevitation | 0) {
        const trapped = (u.BLevitation | 0) === I_SPECIAL;
        const { float_vs_flight } = await import('./polyself.js');
        float_vs_flight();
        if (trapped && (u.utrap | 0)) {
            const typ = u.utraptype | 0;
            const where = typ === TT_BEARTRAP ? "trap's jaws"
                : typ === TT_WEB ? 'web'
                    : typ === TT_BURIEDBALL ? 'chain'
                        : typ === TT_LAVA ? 'lava'
                            : 'ground';
            await pline(`You are no longer trying to float up from the ${where}.`);
        }
        await encumber_msg();
        return 0;
    }

    if (game.disp) game.disp.botl = true;
    if (game.flags) game.flags.botl = true;
    nomul(0);

    if (u.BFlying | 0) {
        const { float_vs_flight } = await import('./polyself.js');
        float_vs_flight();
        if (Flying_fu()) {
            await pline('You have stopped levitating and are now flying.');
            await encumber_msg();
            return 1;
        }
    }
    if (u.uswallow) {
        // digests() deferred — "swallowed" vs "engulfed" via is_animal
        const stuck = u.ustuck;
        const how = (stuck && is_animal(stuck.data)) ? 'swallowed' : 'engulfed';
        await pline(`You float down, but you are still ${how}.`);
        await encumber_msg();
        return 1;
    }

    // Punished ball→pit/pool relocate deferred

    if (!Flying_fu()) {
        if (!u.uswallow && u.ustuck) {
            // sticks()/mon_nam release msgs deferred — clear hold
            u.ustuck = null;
        }
        if (is_pool(u.ux | 0, u.uy | 0) && !Wwalking_fd()
            && !Swimming_fd() && !u.uinwater) {
            no_msg = !!(await drown());
        }
        if (is_lava(u.ux | 0, u.uy | 0) && !game.iflags?.in_lava_effects) {
            await lava_effects();
            no_msg = true;
        }
    }

    if (!trap) {
        trap = t_at(u.ux | 0, u.uy | 0);
        if (Is_airlevel(u.uz)) {
            await pline('You begin to tumble in place.');
        } else if (Is_waterlevel(u.uz) && !no_msg) {
            await You_feel('heavier.');
        } else if (!u.uinwater && !no_msg) {
            if (!((emask | 0) & W_SADDLE)) {
                const Sokoban = !!(game.level?.flags?.sokoban_rules
                    || game.level?.flags?.sokoban || game.Sokoban);
                if (Sokoban && trap) {
                    if (Hallucination()) {
                        await pline("Bummer!  You've crashed.");
                    } else {
                        await pline('You fall over.');
                    }
                    await losehp(rnd(2), 'dangerous winds', KILLED_BY);
                    if (u.usteed) {
                        const { dismount_steed } = await import('./steed.js');
                        const { DISMOUNT_FELL } = await import('./const.js');
                        await dismount_steed(DISMOUNT_FELL);
                    }
                    // C: selftouch("Falling, you")
                    await selftouch('Falling, you');
                } else if (u.usteed && (is_floater(u.usteed.data)
                    || is_flyer(u.usteed.data))) {
                    await pline('You settle more firmly in the saddle.');
                } else if (Hallucination()) {
                    await pline(
                        `Bummer!  You've ${is_pool(u.ux | 0, u.uy | 0) ? 'splashed down' : 'hit the ground'}.`,
                    );
                } else {
                    const surf = surface_fd(u.ux | 0, u.uy | 0);
                    await pline(`You float gently to the ${surf}.`);
                }
            }
        }
    }

    await encumber_msg();

    const cur_dnum = u.uz?.dnum;
    const cur_dlevel = u.uz?.dlevel;
    if (trap) {
        const ttyp = trap.ttyp | 0;
        let run_dotrap = false;
        if (ttyp === STATUE_TRAP) {
            run_dotrap = false;
        } else if (ttyp === HOLE || ttyp === TRAPDOOR) {
            if (Can_fall_thru(u.uz) && !u.ustuck) run_dotrap = true;
        } else {
            run_dotrap = true;
        }
        if (run_dotrap && !(u.utrap | 0)) {
            await dotrap(trap, NO_TRAP_FLAGS);
        }
    }
    if (!Is_airlevel(u.uz) && !Is_waterlevel(u.uz) && !u.uswallow
        && u.uz?.dnum === cur_dnum && u.uz?.dlevel === cur_dlevel) {
        const { pickup } = await import('./pickup.js');
        await pickup(1);
    }
    return 1;
}

/** Levitation for float_down (youprop.h). */
function Levitation_fd() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}
function Wwalking_fd() {
    const u = game.u || {};
    if (Is_waterlevel(u.uz)) return false;
    return !!(u.Wwalking || (u.HWwalking | 0) || (u.EWwalking | 0));
}
function Swimming_fd() {
    const u = game.u || {};
    return !!(u.Swimming || (u.HSwimming | 0) || (u.ESwimming | 0));
}
function surface_fd(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_ROOM(typ) && !Is_airlevel(game.u?.uz)) return 'floor';
    return 'ground';
}

/**
 * C ref: mon.c wake_nearby / wake_nearto_core — clear sleep/wait within
 * ulevel*20. G_UNIQ keep STRAT_WAITMASK.
 * Named omissions: wake_msg; disturb_buried_zombies; petcall whistletime.
 */
function wake_nearby(_petcall) {
    const u = game.u || {};
    const x = u.ux | 0;
    const y = u.uy | 0;
    const distance = ((u.ulevel | 0) * 20) | 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - x;
        const dy = (mtmp.my | 0) - y;
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
    void _petcall;
}

/**
 * C ref: trap.c b_trapped — booby-trap explosion (doors, tins, …).
 * Branch envelope: level_difficulty dmg; KABOOM pline; wake_nearby;
 * losehp(Maybe_Half_Phys); exercise STR (+ CON when bodypart != NO_PART);
 * make_stunned(HStun+dmg). Named omission: Soundeffect.
 */
export async function b_trapped(item, bodypart = NO_PART) {
    const lvl = level_difficulty(game.u?.uz) || 1;
    const dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2)));
    await pline(`KABOOM!!  ${The(item)} was booby-trapped!`);
    wake_nearby(false);
    await losehp(maybe_half_phys(dmg), 'explosion', KILLED_BY_AN);
    exercise(A_STR, false);
    if ((bodypart | 0) !== NO_PART) exercise(A_CON, false);
    const u = game.u || (game.u = {});
    await make_stunned(((u.HStun | 0) & TIMEOUT) + dmg, true);
}

/**
 * C ref: do.c set_wounded_legs — timeout + side bits + ATEMP(DEX)--
 * then encumber_msg (carrcap drops via WT_WOUNDEDLEG_REDUCT).
 * Named omission: steed-leg messaging is caller's job.
 */
export async function set_wounded_legs(side, timex) {
    const u = game.u || (game.u = {});
    if (game.flags) game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    const wounded = !!(u.Wounded_legs || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
    if (!wounded) {
        if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
        u.atemp.a[A_DEX] = (u.atemp.a[A_DEX] | 0) - 1;
    }
    const hw = u.HWounded_legs | 0;
    if (!wounded || (hw & TIMEOUT) < (timex | 0)) {
        set_itimeout_prop('HWounded_legs', timex | 0);
    }
    u.EWounded_legs = (u.EWounded_legs | 0) | (side | 0);
    u.Wounded_legs = true;
    // C: encumber_msg() after EWounded_legs |= side
    await encumber_msg();
}

/**
 * C ref: do.c heal_legs(how) — clear wounded-leg timeout/side bits,
 * restore ATEMP(DEX), feel-better pline, encumber_msg when how==0.
 * how: 0 ordinary (nh_timeout), 1 dismount, 2 petrify limbs.
 * Named omissions: steed-leg suppress path polish beyond usteed check.
 */
/**
 * C ref: do.c legs_in_no_shape — refuse kick/jump/ride with wounded legs.
 * Steed-by_steed Monnam path deferred (kick uses by_steed=false).
 */
export async function legs_in_no_shape(for_what, by_steed) {
    const u = game.u || {};
    if (by_steed && u.usteed) {
        await pline(`${Monnam(u.usteed)} is in no shape for ${for_what}.`);
        return;
    }
    const wl = (u.EWounded_legs | 0) & BOTH_SIDES;
    let bp = body_part(LEG);
    if (wl === BOTH_SIDES) bp = makeplural(bp);
    const side = (wl === LEFT_SIDE) ? 'left '
        : (wl === RIGHT_SIDE) ? 'right ' : '';
    const verb = (wl === BOTH_SIDES) ? 'are' : 'is';
    await pline(`Your ${side}${bp} ${verb} in no shape for ${for_what}.`);
}

export async function heal_legs(how) {
    const u = game.u || (game.u = {});
    const wounded = !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
    if (!wounded) return;
    if (game.flags) game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if ((u.atemp.a[A_DEX] | 0) < 0) {
        u.atemp.a[A_DEX] = (u.atemp.a[A_DEX] | 0) + 1;
    }
    // C: when mounted / petrify how==2, suppress feel-better message
    if (!u.usteed && (how | 0) !== 2) {
        let legs = body_part(LEG);
        if (((u.EWounded_legs | 0) & BOTH_SIDES) === BOTH_SIDES) {
            legs = makeplural(legs);
        }
        await pline(`Your ${legs} ${vtense(legs, 'feel')} better.`);
    }
    u.HWounded_legs = 0;
    u.EWounded_legs = 0;
    u.Wounded_legs = false;
    // C: encumber_msg only for ordinary heal (how==0), not dismount
    if ((how | 0) === 0) await encumber_msg();
}

/**
 * C ref: trap.c instapetrify — Stone_resistance / poly_when_stoned stone
 * golem short-circuit, else urgent "You turn to stone..." + done(STONING).
 * @param {string} str killer text (KILLED_BY)
 */
export async function instapetrify(str) {
    const u = game.u || (game.u = {});
    const Stone_resistance = !!(u.Stone_resistance || u.HStone_resistance
        || u.EStone_resistance);
    if (Stone_resistance) return;
    const youData = game.youmonst?.data
        || mons(u.umonnum ?? game.urole?.mnum);
    if (poly_when_stoned(youData, game.mvitals)
        && (await polymon(PM_STONE_GOLEM))) {
        return;
    }
    await urgent_pline('You turn to stone...');
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.format = KILLED_BY;
    game.killer.name = str != null ? String(str) : '';
    await done(STONING);
}

/**
 * C ref: do_name.c obj_pmname — CORPSE/STATUE/FIGURINE pmnames subset.
 * Named omission: aligned-cleric → cleric remap; omonst traits.
 */
function obj_pmname(obj) {
    const CORPSE = objectNames.indexOf('CORPSE');
    const STATUE = objectNames.indexOf('STATUE');
    const FIGURINE = objectNames.indexOf('FIGURINE');
    const otyp = obj?.otyp | 0;
    const cnm = obj?.corpsenm;
    if ((otyp === CORPSE || otyp === STATUE || otyp === FIGURINE)
        && cnm != null && cnm >= 0) {
        const cgend = (obj.spe | 0) & 0x03; // CORPSTAT_GENDER
        const mgend = cgend === 1 ? MALE : cgend === 2 ? FEMALE : NEUTRAL;
        return pmname(cnm, mgend);
    }
    return 'thing';
}

/**
 * C ref: trap.c minstapetrify — resists_ston / poly golem / vamp_stone /
 * mon_adjust_speed(-3) / turn-to-stone msg / xkilled(stoned) or monstone.
 * Named omissions: SetVoice; lifesaved polish beyond xkilled/monstone.
 */
export async function minstapetrify(mon, byplayer) {
    if (resists_ston(mon)) return;
    if (poly_when_stoned(mon.data, game.mvitals)) {
        await mon_to_stone(mon);
        return;
    }
    if (!(await vamp_stone(mon))) return;

    await mon_adjust_speed(mon, -3, null);

    if (cansee(mon.mx | 0, mon.my | 0)) {
        await pline(`${Monnam(mon)} turns to stone.`);
    }
    if (byplayer) {
        if (!game.context) game.context = {};
        game.context.stoned = true;
        const { xkilled } = await import('./uhitm.js');
        await xkilled(mon, XKILL_NOMSG);
    } else {
        await monstone(mon);
    }
}

/**
 * C ref: trap.c selftouch — wielded / twoweapon cockatrice corpse.
 * Named omissions: twoweapon hypothetical polish beyond uswapwepgone.
 * @param {string} arg pline subject prefix ("Falling, you" / "You")
 */
export async function selftouch(arg) {
    const u = game.u || {};
    const CORPSE = objectNames.indexOf('CORPSE');
    const Stone_resistance = !!(u.Stone_resistance || u.HStone_resistance
        || u.EStone_resistance);

    if (u.uwep && (u.uwep.otyp | 0) === CORPSE
        && touch_petrifies(mons(u.uwep.corpsenm))
        && !Stone_resistance) {
        const corpse_pm = obj_pmname(u.uwep);
        await pline(`${arg} touch the ${corpse_pm} corpse.`);
        await instapetrify(`${an(corpse_pm)} corpse`);
        if (!u.uarmg && !Stone_resistance) await uwepgone();
    }
    if (u.twoweap && u.uswapwep && (u.uswapwep.otyp | 0) === CORPSE
        && touch_petrifies(mons(u.uswapwep.corpsenm))
        && !Stone_resistance) {
        const corpse_pm = obj_pmname(u.uswapwep);
        await pline(`${arg} touch the ${corpse_pm} corpse.`);
        await instapetrify(`${an(corpse_pm)} corpse`);
        if (!u.uarmg && !Stone_resistance) uswapwepgone();
    }
}

/**
 * C ref: trap.c trapeffect_bear_trap — hero + monster branches.
 * Envelope: hero d(2,4) then Lev/Fly skip; feeltrap; amorph/whirly/unsolid
 * /small harmlessly; set_utrap(rn1(4,4)); steed thitm or wounded-legs+losehp;
 * exercise DEX. Monster: size/amorph/air catch + thitm(d(2,4)).
 * Named omissions: float_vs_flight; Yname2 iron-shoe msg;
 * Soundeffect roar; which_armor wearing_iron_shoes body.
 */
async function trapeffect_bear_trap(mtmp, trap, trflags) {
    const A_Your = ['A', 'Your'];
    const a_your = ['a', 'your'];
    const forcetrap = ((trflags & FORCETRAP) !== 0
        || (trflags & FAILEDUNTRAP) !== 0
        || (is_youmonst(mtmp) && (trflags & VIASITTING) !== 0));

    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        const dmg = d(2, 4);
        if ((u.Levitation || u.Flying) && !forcetrap) {
            return Trap_Effect_Finished;
        }
        feeltrap(trap);
        const youdata = game.youmonst?.data;
        if (amorphous(youdata) || is_whirly(youdata) || unsolid(youdata)) {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes harmlessly through you.`,
            );
            return Trap_Effect_Finished;
        }
        if (!u.usteed && (youdata?.msize ?? 2) <= MZ_SMALL) {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes harmlessly over you.`,
            );
            return Trap_Effect_Finished;
        }
        set_utrap(rn1(4, 4), TT_BEARTRAP);
        if (u.usteed) {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes on ${s_suffix(mon_nam(u.usteed))} ${mbodypart(u.usteed, FOOT)}!`,
            );
            if (await thitm(0, u.usteed, null, dmg, false)) {
                reset_utrap(true);
            }
        } else {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes on your ${body_part(FOOT)}!`,
            );
            const umonnum = u.umonnum | 0;
            if (umonnum === PM_OWLBEAR || umonnum === PM_BUGBEAR) {
                await pline('You howl in anger!');
            }
            if (wearing_iron_shoes(mtmp)) {
                // C: Yname2(uarmf) — iron shoes protect; which_armor deferred
                await pline('Your boots protect your leg.');
            } else {
                await set_wounded_legs(
                    rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10),
                );
                losehp(maybe_half_phys(dmg), 'bear trap', KILLED_BY_AN);
            }
        }
        exercise(A_DEX, false);
        return Trap_Effect_Finished;
    }

    // Monster branch
    const mptr = mtmp.data;
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    let trapkilled = false;

    if ((mptr?.msize ?? 0) > MZ_SMALL && !amorphous(mptr) && !m_in_air(mtmp)
        && !is_whirly(mptr) && !unsolid(mptr)) {
        mtmp.mtrapped = 1;
        if (in_sight) {
            await pline(
                `${Monnam(mtmp)} is caught in ${a_your[trap.madeby_u ? 1 : 0]} bear trap!`,
            );
            seetrap(trap);
        } else if ((mptr?.mndx ?? -1) === PM_OWLBEAR
            || (mptr?.mndx ?? -1) === PM_BUGBEAR) {
            await You_hear('the roaring of an angry bear!');
        }
    } else if (forcetrap) {
        if (in_sight) {
            await pline(
                `${Monnam(mtmp)} evades ${a_your[trap.madeby_u ? 1 : 0]} bear trap!`,
            );
            seetrap(trap);
        }
    }
    if (mtmp.mtrapped && !wearing_iron_shoes(mtmp)) {
        trapkilled = await thitm(0, mtmp, null, d(2, 4), false);
    }
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/**
 * C ref: dungeon.c ceiling — room/air/cavern labels for trap plines.
 * Named omissions: vault/temple/shop in_rooms; water/fire/quest/Underwater.
 */
function ceiling(x, y) {
    const typ = game.level?.at(x, y)?.typ ?? 0;
    if (IS_AIR(typ)) return 'sky';
    if (IS_ROOM(typ) || IS_WALL(typ) || IS_DOOR(typ) || typ === SDOOR)
        return 'ceiling';
    return 'rock cavern';
}

/** C ref: mondata.h passes_rocks */
function passes_rocks(ptr) {
    return !!(passes_walls(ptr) && !unsolid(ptr));
}

/**
 * C ref: do_wear.c hard_helmet — metallic or glass armor helm.
 * is_helmet gate approximated by worn uarmh (caller only passes helm).
 */
function hard_helmet(obj) {
    if (!obj) return false;
    const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
    const IRON = 11, MITHRIL = 15, GLASS = 19;
    if (mat >= IRON && mat <= MITHRIL) return true;
    if (mat === GLASS && (obj.oclass === ARMOR_CLASS
        || game.objects?.[obj.otyp]?.oc_class === ARMOR_CLASS)) return true;
    return false;
}

/** C ref: objnam.c helm_simple_name — "helmet" / "hat" polish deferred */
function helm_simple_name(_obj) {
    return 'helmet';
}

/** C ref: objnam.c cloak_simple_name — robe/smock polish deferred */
function cloak_simple_name(_obj) {
    return 'cloak';
}

/** C ref: objnam.c gloves_simple_name */
function gloves_simple_name(_obj) {
    return 'gloves';
}

/** C ref: objnam.c suit_simple_name — mail/jacket polish deferred */
function suit_simple_name(_obj) {
    return 'suit';
}

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
}

/**
 * C ref: worn.c which_armor — first minvent obj with owornmask bit.
 */
function which_armor(mtmp, mask) {
    if (!mtmp) return null;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.owornmask || 0) & mask) return otmp;
    }
    return null;
}

/**
 * C ref: apply.c splash_lit — live apply.js (D-1337). Dynamic import:
 * apply.js already static-imports trap.js.
 */
async function splash_lit(obj) {
    const { splash_lit: splash } = await import('./apply.js');
    return splash(obj);
}

/**
 * C ref: trap.c trapeffect_rust_trap — hero + monster branches.
 * Envelope: seetrap; rn2(5) aim switch; water_damage / splash_lit on
 * targeted slots; iron-golem rust death; gremlin rn2(3)→split_mon
 * (D-1095; potion.c split_mon via sit.js). splash_lit is D-1337
 * (brass dunk/crackle live). Named omissions: update_inventory;
 * mlifesaver "starts to fall"; poly body_part table.
 */
async function trapeffect_rust_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        seetrap(trap);
        switch (rn2(5)) {
        case 0:
            await pline(
                `${A_gush_of_water_hits} you on the ${body_part(HEAD)}!`,
            );
            await water_damage(u.uarmh, helm_simple_name(u.uarmh), true);
            break;
        case 1:
            await pline(
                `${A_gush_of_water_hits} your left ${body_part(ARM)}!`,
            );
            if ((await water_damage(u.uarms, 'shield', true)) !== ER_NOTHING) {
                break;
            }
            if (u.twoweap || (u.uwep && bimanual(u.uwep))) {
                await water_damage(
                    u.twoweap ? u.uswapwep : u.uwep, null, true,
                );
            }
            await water_damage(u.uarmg, gloves_simple_name(u.uarmg), true);
            break;
        case 2:
            await pline(
                `${A_gush_of_water_hits} your right ${body_part(ARM)}!`,
            );
            await water_damage(u.uwep, null, true);
            await water_damage(u.uarmg, gloves_simple_name(u.uarmg), true);
            break;
        default:
            await pline(`${A_gush_of_water_hits} you!`);
            for (const otmp of game.invent || []) {
                if (otmp.lamplit && otmp !== u.uwep
                    && (otmp !== u.uswapwep || !u.twoweap)) {
                    await splash_lit(otmp);
                }
            }
            if (u.uarmc) {
                await water_damage(u.uarmc, cloak_simple_name(u.uarmc), true);
            } else if (u.uarm) {
                await water_damage(u.uarm, suit_simple_name(u.uarm), true);
            } else if (u.uarmu) {
                await water_damage(u.uarmu, 'shirt', true);
            }
            break;
        }
        // update_inventory deferred
        if ((u.umonnum | 0) === PM_IRON_GOLEM) {
            const dam = u.mhmax | 0;
            await pline('You are covered with rust!');
            losehp(maybe_half_phys(dam), 'rusting away', KILLED_BY);
        } else if ((u.umonnum | 0) === PM_GREMLIN && rn2(3)) {
            // C trap.c:1652–1653 split_mon(&youmonst, NULL)
            const { split_mon } = await import('./sit.js');
            await split_mon(game.youmonst, null);
        }
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    let trapkilled = false;
    const mptr = mtmp.data;

    if (in_sight) seetrap(trap);
    switch (rn2(5)) {
    case 0:
        if (in_sight) {
            await pline(
                `${A_gush_of_water_hits} ${mon_nam(mtmp)} on the ${mbodypart(mtmp, HEAD)}!`,
            );
        }
        {
            const target = which_armor(mtmp, W_ARMH);
            await water_damage(target, helm_simple_name(target), true);
        }
        break;
    case 1:
        if (in_sight) {
            await pline(
                `${A_gush_of_water_hits} ${mon_nam(mtmp)}'s left ${mbodypart(mtmp, ARM)}!`,
            );
        }
        {
            let target = which_armor(mtmp, W_ARMS);
            if ((await water_damage(target, 'shield', true)) !== ER_NOTHING) {
                break;
            }
            target = MON_WEP(mtmp);
            if (target && bimanual(target)) {
                await water_damage(target, null, true);
            }
            target = which_armor(mtmp, W_ARMG);
            await water_damage(target, gloves_simple_name(target), true);
        }
        break;
    case 2:
        if (in_sight) {
            await pline(
                `${A_gush_of_water_hits} ${mon_nam(mtmp)}'s right ${mbodypart(mtmp, ARM)}!`,
            );
        }
        await water_damage(MON_WEP(mtmp), null, true);
        await water_damage(
            which_armor(mtmp, W_ARMG),
            gloves_simple_name(which_armor(mtmp, W_ARMG)),
            true,
        );
        break;
    default:
        if (in_sight) {
            await pline(`${A_gush_of_water_hits} ${mon_nam(mtmp)}!`);
        }
        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
            if (otmp.lamplit
                && ((otmp.owornmask || 0) & (W_WEP | W_SWAPWEP)) === 0) {
                await splash_lit(otmp);
            }
        }
        {
            let target = which_armor(mtmp, W_ARMC);
            if (target) {
                await water_damage(target, cloak_simple_name(target), true);
            } else if ((target = which_armor(mtmp, W_ARM))) {
                await water_damage(target, suit_simple_name(target), true);
            } else if ((target = which_armor(mtmp, W_ARMU))) {
                await water_damage(target, 'shirt', true);
            }
        }
        break;
    }

    // C: completelyrusts(ptr) ≡ iron golem
    if ((mptr?.mndx ?? -1) === PM_IRON_GOLEM) {
        if (in_sight) {
            await pline(`${Monnam(mtmp)} falls to pieces!`);
        }
        await monkilled(mtmp, null, AD_RUST);
        if (!(mtmp.mhp | 0) || !mtmp.mx) trapkilled = true;
    } else if ((mptr?.mndx ?? -1) === PM_GREMLIN && rn2(3)) {
        // C trap.c:1719–1720 split_mon(mtmp, NULL)
        const { split_mon } = await import('./sit.js');
        await split_mon(mtmp, null);
    }

    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/**
 * C ref: trap.c trapeffect_rocktrap — hero + monster branches.
 * Envelope: hero feeltrap + place ROCK at u.ux/uy + losehp; monster
 * once+tseen empty rn2(15)/deltrap else t_missile+thitm(d(2,6)).
 * Named omissions: vault/shop ceiling labels; helm_simple_name "hat";
 * Yname2 soft-helm verbose; empty-door pline_mon text; stone_missile
 * harmless arm in thitm; full body_part poly table (HEAD→"head").
 */
async function trapeffect_rocktrap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        if (trap.once && trap.tseen && !rn2(15)) {
            await pline(
                `A trap door in ${the(ceiling(u.ux, u.uy))} opens, but nothing falls out!`,
            );
            deltrap(trap);
            newsym(u.ux, u.uy);
            return Trap_Is_Gone;
        }
        let dmg = d(2, 6);
        let harmless = false;
        trap.once = true;
        feeltrap(trap);
        const otmp = t_missile(ROCK, trap);
        place_object(otmp, u.ux, u.uy);
        await pline(
            `A trap door in ${the(ceiling(u.ux, u.uy))} opens and ${an(xname(otmp))} falls on your head!`,
        );
        const uarmh = u.uarmh;
        const youdata = game.youmonst?.data;
        if (uarmh) {
            if (passes_rocks(youdata)) {
                await pline(`Unfortunately, you are wearing ${an(helm_simple_name(uarmh))}.`);
                dmg = 2;
            } else if (hard_helmet(uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                dmg = 2;
            } else if (game.flags?.verbose !== false) {
                // C: Yname2(uarmh) — soft helm does not protect
                await pline('Your helmet does not protect you.');
            }
        } else if (passes_rocks(youdata)) {
            await pline('It passes harmlessly through you.');
            harmless = true;
        }
        if (!(u.Blind || u.ublind)) observe_object(otmp);
        stackobj(otmp);
        newsym(u.ux, u.uy);
        if (!harmless) {
            losehp(maybe_half_phys(dmg), 'falling rock', KILLED_BY_AN);
            exercise(A_STR, false);
        }
        return Trap_Effect_Finished;
    }

    // Monster branch
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    if (trap.once && trap.tseen && !rn2(15)) {
        // C: pline_mon when in_sight && cansee — display only; omit body
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }
    trap.once = true;
    const otmp = t_missile(ROCK, trap);
    if (in_sight) seetrap(trap);
    const trapkilled = await thitm(0, mtmp, otmp, d(2, 6), false);
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/**
 * C ref: trap.c trapeffect_sqky_board — monster branch (hero dotrap deferred).
 * Envelope: in-sight pline+seetrap; out-of-sight You_hear nearby|distance;
 * m_in_air skip; wake_nearto(40). Soundeffect no-op (no RNG).
 * Deaf+mindless silent cringe and hero Levitation/Flying named omissions.
 */
async function trapeffect_sqky_board(mtmp, trap, _trflags) {
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    if (m_in_air(mtmp)) return Trap_Effect_Finished;

    if (in_sight) {
        if (!game.u?.Deaf) {
            await pline(
                `A board beneath ${x_monnam_tame(mtmp)} squeaks ${trapnote(trap, false)} loudly.`,
            );
            seetrap(trap);
        } else {
            await pline(
                `${Monnam(mtmp)} stops momentarily and appears to cringe.`,
            );
        }
    } else {
        // same near/far threshold as mzapmsg()
        const range = couldsee(mtmp.mx, mtmp.my)
            ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy)
            <= range * range;
        await You_hear(
            `${trapnote(trap, false)} squeak ${near ? 'nearby' : 'in the distance'}.`,
        );
    }
    wake_nearto(mtmp.mx, mtmp.my, 40);
    return Trap_Effect_Finished;
}

/**
 * C ref: trap.c trapeffect_level_telep — hero seetrap+level_tele_trap
 * (D-1224); monster mlevel_tele_trap.
 */
async function trapeffect_level_telep(mtmp, trap, trflags) {
    if (is_youmonst(mtmp)) {
        seetrap(trap);
        await level_tele_trap(trap, trflags);
        return Trap_Effect_Finished;
    }
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const forcetrap = (trflags & FORCETRAP) !== 0;
    return await mlevel_tele_trap(mtmp, trap, forcetrap, in_sight ? 1 : 0);
}

/**
 * C ref: trap.c trapeffect_magic_portal — hero feeltrap+domagicportal;
 * monster trapeffect_level_telep (D-0782).
 */
async function trapeffect_magic_portal(mtmp, trap, trflags) {
    if (is_youmonst(mtmp)) {
        feeltrap(trap);
        await domagicportal(trap);
        return Trap_Effect_Finished;
    }
    return trapeffect_level_telep(mtmp, trap, trflags);
}

/**
 * C ref: trap.c fall_through — hero drops through hole/trapdoor or throne
 * shaft (td=false). schedule_goto FALLING; impact_drop when don't fall.
 * Named omissions: feeltrap side-effects beyond tseen; display_nhwindow exact.
 */
export async function fall_through(td, ftflags = 0) {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const Sokoban = !!(game.level?.flags?.sokoban_rules
        || game.level?.flags?.sokoban || game.Sokoban);
    const Blind = !!(u.Blind || u.ublind);
    const Levitation = !!u.Levitation;
    const flying = !!(u.Flying
        || (((u.HFlying | 0) || (u.EFlying | 0)) && !(u.BFlying | 0)));
    const ptr = game.youmonst?.data;
    const ft = ftflags | 0;
    // C mondata.h ceiling_hider — clinger (not mimic) or flyer
    const ceilHide = !!((is_clinger(ptr) && ptr?.mlet !== 'S_MIMIC')
        || is_flyer(ptr));

    // C: Blind && Levitation && !Sokoban → return early
    if (Blind && Levitation && !Sokoban) return;

    const newlevel = dunlev(u.uz) + 1;
    const loc = game.level?.at(ux, uy);

    let t = null;
    if (td) {
        t = t_at(ux, uy);
        if (t) feeltrap(t);
        if (!Sokoban && !(ft & TOOKPLUNGE)) {
            if (t?.ttyp === TRAPDOOR) {
                await pline('A trap door opens up under you!');
            } else {
                await pline("There's a gaping hole under you!");
            }
        }
    } else {
        await pline(`The ${surface_fd(ux, uy)} opens up under you!`);
    }

    let dont_fall = null;
    if (Sokoban && Can_fall_thru(u.uz)) {
        // KMH — can't escape Sokoban level traps
    } else if (Levitation || u.ustuck
        || (!Can_fall_thru(u.uz) && !loc?.candig)
        || ((flying || is_clinger(ptr) || (ceilHide && u.uundetected))
            && !(ft & TOOKPLUNGE))) {
        dont_fall = "don't fall in.";
    } else if ((ptr?.msize | 0) >= MZ_HUGE) {
        dont_fall = "don't fit through.";
    } else {
        const { next_to_u } = await import('./apply.js');
        if (!(await next_to_u())) {
            dont_fall = 'are jerked back by your pet!';
        }
    }

    if (dont_fall) {
        await pline(`You ${dont_fall}`);
        const { impact_drop } = await import('./dokick.js');
        await impact_drop(null, ux, uy, 0);
        if (!td) {
            await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, FALSE)
            await pline('The opening under you closes up.');
        }
        return;
    }

    let controlled_flight = false;
    if ((flying || is_clinger(ptr)) && (ft & TOOKPLUNGE) && td && t) {
        if (flying) controlled_flight = true;
        await pline(
            `You ${flying ? 'swoop' : 'deliberately drop'} down ${
                t.ttyp === TRAPDOOR
                    ? 'through the trap door'
                    : 'into the gaping hole'
            }!`,
        );
    }

    if (u.ushops) {
        const { shopdig } = await import('./shk.js');
        await shopdig(1);
    }

    const dtmp = { dnum: 0, dlevel: 0 };
    if (Is_stronghold(u.uz)) {
        const { find_hell } = await import('./dungeon.js');
        find_hell(dtmp);
    } else {
        if (t) {
            dtmp.dnum = t.dst?.dnum | 0;
            dtmp.dlevel = t.dst?.dlevel | 0;
            const bottom = dng_bottom(u.uz);
            if ((dtmp.dlevel | 0) > bottom) dtmp.dlevel = bottom;
        } else {
            dtmp.dnum = u.uz?.dnum | 0;
            dtmp.dlevel = newlevel;
        }
        const dist = depth(dtmp) - depth(u.uz);
        if (dist > 1) {
            await pline(
                `You ${controlled_flight ? 'fly' : 'fall'} down a ${
                    dist > 3 ? 'very ' : ''
                }${dist > 2 ? 'deep ' : ''}shaft!`,
            );
        }
    }

    const msgbuf = !td
        ? `The hole in the ${ceiling(ux, uy)} above you closes up.`
        : null;

    const { schedule_goto } = await import('./do.js');
    schedule_goto(
        dtmp,
        !flying ? UTOTYPE_FALLING : UTOTYPE_NONE,
        null,
        msgbuf,
    );
}

/**
 * C ref: trap.c trapeffect_hole — HOLE/TRAPDOOR hero + monster.
 * Hero: Can_fall_thru else seetrap and skip; else fall_through (D-0986).
 * Named omissions: Sokoban yank detail; impossible() on bad level.
 */
async function trapeffect_hole(mtmp, trap, trflags) {
    if (is_youmonst(mtmp)) {
        if (!Can_fall_thru(game.u?.uz)) {
            seetrap(trap);
            return Trap_Effect_Finished;
        }
        await fall_through(true, (trflags | 0) & TOOKPLUNGE);
        return Trap_Effect_Finished;
    }
    const mptr = mtmp.data;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);
    const inescapable = forcetrap || (Sokoban && !trap.madeby_u);
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);

    if (!Can_fall_thru(game.u?.uz)) {
        return Trap_Effect_Finished;
    }
    if (!grounded(mptr)
        || (mtmp.wormno && (mtmp.wormno | 0) > 5)
        || (mptr?.msize | 0) >= MZ_HUGE) {
        if (forcetrap && !Sokoban) {
            if (in_sight) seetrap(trap);
            return Trap_Effect_Finished;
        }
        if (!inescapable) return Trap_Effect_Finished;
        // Sokoban yank still falls through
    }
    return await mlevel_tele_trap(mtmp, trap, forcetrap, in_sight ? 1 : 0);
}

/**
 * C ref: prop.h mr_bit — prop index → mresists bit (FIRE_RES…STONE_RES).
 */
function mr_bit(prop) {
    return (prop >= FIRE_RES && prop <= STONE_RES) ? (1 << (prop - 1)) : 0;
}

/**
 * C ref: monst.h resists_fire / resists_sleep — Resists_Elem(prop).
 * Named omission: data->mresists not in extracted mons(); only
 * mintrinsics/mextrinsics bits when set.
 */
function resists_elem(mtmp, prop) {
    const bits = (mtmp?.mintrinsics | 0) | (mtmp?.mextrinsics | 0);
    return !!(bits & mr_bit(prop));
}
function resists_fire(mtmp) {
    return resists_elem(mtmp, FIRE_RES);
}
function resists_sleep(mtmp) {
    return resists_elem(mtmp, SLEEP_RES);
}

/** C ref: monst.h helpless — msleeping || !mcanmove */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || !mtmp?.mcanmove);
}

/**
 * C ref: mhitm.c sleep_monst — how < 0 skips mimic reveal / resist().
 * Envelope: resists_sleep shield; else if mcanmove freeze via mfrozen.
 * Named omissions: defended(AD_SLEE); how>=0 seemimic/resist; shieldeff;
 * full finish_meating mimic AP reset (inline meating=0 only).
 */
function sleep_monst(mon, amt, how) {
    if (!mon) return 0;
    // how >= 0 mimic reveal / resist(how) deferred
    if (resists_sleep(mon) /* || defended(mon, AD_SLEE) */) {
        // shieldeff deferred
        return 0;
    }
    if (mon.mcanmove) {
        mon.meating = 0; // finish_meating subset
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

/**
 * C ref: trap.c erode_obj — generic erode / destroy worn or free objects.
 * Envelope for destroy_arm / burn paths: grease short-circuit, erosion_matters,
 * vulnerable by type, oerodeproof/blessed rnl(4), oeroded++ to MAX_ERODE, then
 * EF_DESTROY delobj. Named omissions: inventory_resistance_check AD_FIRE/ACID;
 * grease_protect body; costly_alteration EF_PAY; monster/floor visobj arms;
 * remove_worn_item before delobj (caller destroy_arm stops on ER_DESTROYED);
 * Blind feel-completely messages.
 *
 * @returns {Promise<number>} ER_* 
 */
export async function erode_obj(otmp, ostr, type, ef_flags) {
    const action = ['smoulder', 'rust', 'rot', 'corrode', 'crack'];
    if (!otmp) return ER_NOTHING;

    const carried = Array.isArray(game.invent) && game.invent.includes(otmp);
    const uvictim = carried; // hero invent only for this envelope
    const check_grease = !!(ef_flags & EF_GREASE);
    const print = !!(ef_flags & EF_VERBOSE);

    let vulnerable = false;
    let is_primary = true;
    let checkGrease = check_grease;
    switch (type) {
    case ERODE_BURN:
        // inventory_resistance_check(AD_FIRE) deferred
        vulnerable = is_flammable(otmp);
        checkGrease = false;
        break;
    case ERODE_RUST:
        vulnerable = is_rustprone(otmp);
        break;
    case ERODE_ROT:
        vulnerable = is_rottable(otmp);
        checkGrease = false;
        is_primary = false;
        break;
    case ERODE_CORRODE:
        // inventory_resistance_check(AD_ACID) deferred
        vulnerable = is_corrodeable(otmp);
        is_primary = false;
        break;
    case ERODE_CRACK:
        vulnerable = is_crackable(otmp);
        is_primary = true;
        break;
    default:
        return ER_NOTHING;
    }

    const erosion = is_primary ? (otmp.oeroded | 0) : (otmp.oeroded2 | 0);
    if (!ostr) ostr = xname(otmp);

    if (checkGrease && otmp.greased) {
        // grease_protect deferred — treat as greased resist without wear-off RNG
        return ER_GREASED;
    }
    if (!erosion_matters(otmp)) return ER_NOTHING;
    if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        void print;
        return ER_NOTHING;
    }
    // C: oerodeproof || (blessed && !rnl(4))
    if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        if (otmp.oerodeproof) otmp.rknown = true;
        return ER_NOTHING;
    }
    if (erosion < MAX_ERODE) {
        const adverb = (erosion + 1 === MAX_ERODE) ? ' completely'
            : erosion ? ' further' : '';
        if (uvictim) {
            await pline(
                `Your ${ostr} ${vtense(ostr, action[type])}${adverb}!`,
            );
        }
        // costly_alteration EF_PAY deferred
        void (ef_flags & EF_PAY);
        if (is_primary) otmp.oeroded = (otmp.oeroded | 0) + 1;
        else otmp.oeroded2 = (otmp.oeroded2 | 0) + 1;
        return ER_DAMAGED;
    }
    if (ef_flags & EF_DESTROY) {
        otmp.in_use = 1;
        if (uvictim) {
            await pline(
                `Your ${ostr} ${vtense(ostr, action[type])} away!`,
            );
        }
        // remove_worn_item deferred — delobj clears worn slot via owornmask
        if (otmp.owornmask) {
            const u = game.u || {};
            for (const slot of [
                'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
            ]) {
                if (u[slot] === otmp) u[slot] = null;
            }
            otmp.owornmask = 0;
        }
        delobj(otmp);
        return ER_DESTROYED;
    }
    return ER_NOTHING;
}

/**
 * C ref: trap.c burnarmor — armor-slot burn picker.
 * Envelope: wet-towel dry (D-1009); rn2(5) slot loop; case 1 cloak/suit/
 * shirt always returns TRUE after erode attempt; other cases erode then
 * continue on ER_NOTHING. Named: grease_protect polish; materialnm helm.
 */
export async function burnarmor(victim) {
    if (!victim) return false;
    const hitting_u = is_youmonst(victim) || !!victim._youmonst;
    const u = game.u || {};
    // C: burning may dry one wet towel (carrying / m_carrying TOWEL walk)
    if (hitting_u) {
        const inv = game.invent || [];
        let i = inv.findIndex((o) => o && o.otyp === TOWEL);
        for (; i >= 0 && i < inv.length; i++) {
            const item = inv[i];
            if (is_wet_towel(item)) {
                const oldspe = item.spe | 0;
                await dry_a_towel(item, rn2(oldspe + 1), true);
                if ((item.spe | 0) !== oldspe) break;
            }
        }
    } else {
        for (let item = m_carrying(victim, TOWEL); item; item = item.nobj) {
            if (is_wet_towel(item)) {
                const oldspe = item.spe | 0;
                await dry_a_towel(item, rn2(oldspe + 1), true);
                if ((item.spe | 0) !== oldspe) break;
            }
        }
    }
    for (;;) {
        switch (rn2(5)) {
        case 0: {
            const item = hitting_u ? u.uarmh : which_armor(victim, W_ARMH);
            if ((await erode_obj(
                item, item ? helm_simple_name(item) : 'helmet',
                ERODE_BURN, EF_GREASE,
            )) === ER_NOTHING) continue;
            break;
        }
        case 1: {
            let item = hitting_u ? u.uarmc : which_armor(victim, W_ARMC);
            if (item) {
                await erode_obj(
                    item, cloak_simple_name(item), ERODE_BURN, EF_GREASE,
                );
                return true;
            }
            item = hitting_u ? u.uarm : which_armor(victim, W_ARM);
            if (item) {
                await erode_obj(item, xname(item), ERODE_BURN, EF_GREASE);
                return true;
            }
            item = hitting_u ? u.uarmu : which_armor(victim, W_ARMU);
            if (item) {
                await erode_obj(item, 'shirt', ERODE_BURN, EF_GREASE);
            }
            return true;
        }
        case 2: {
            const item = hitting_u ? u.uarms : which_armor(victim, W_ARMS);
            if ((await erode_obj(
                item, 'wooden shield', ERODE_BURN, EF_GREASE,
            )) === ER_NOTHING) continue;
            break;
        }
        case 3: {
            const item = hitting_u ? u.uarmg : which_armor(victim, W_ARMG);
            if ((await erode_obj(
                item, gloves_simple_name(item), ERODE_BURN, EF_GREASE,
            )) === ER_NOTHING) continue;
            break;
        }
        case 4: {
            const item = hitting_u ? u.uarmf : which_armor(victim, W_ARMF);
            if ((await erode_obj(
                item, 'boots', ERODE_BURN, EF_GREASE,
            )) === ER_NOTHING) continue;
            break;
        }
        default:
            break;
        }
        break;
    }
    return false;
}

/**
 * C ref: trap.c ignite_items — catch_lit on exposed invent/floor/minvent.
 * Hero invent may be an array; floor uses nexthere; minvent uses nobj.
 */
export async function ignite_items(objchn) {
    if (!objchn) return;
    const { catch_lit } = await import('./apply.js');
    if (Array.isArray(objchn)) {
        for (const obj of [...objchn]) {
            if (obj && !obj.lamplit && !obj.in_use) await catch_lit(obj);
        }
        return;
    }
    const bynexthere = objchn.where === OBJ_FLOOR;
    let obj = objchn;
    while (obj) {
        const nextobj = obj.nobj;
        const next = bynexthere ? obj.nexthere : nextobj;
        if (!obj.lamplit && !obj.in_use) await catch_lit(obj);
        obj = next;
    }
}

/**
 * C ref: trap.c trapeffect_fire_trap — monster branch (hero → dofiretrap).
 * Envelope: d(2,4); resists_fire shield; else thitm / rn2(num+1) mhpmax;
 * golem alt HP; burnarmor || rn2(3) → destroy_items(AD_FIRE) + ignite + HP.
 * Named omissions: surface(); shieldeff.
 */
async function trapeffect_fire_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        await dofiretrap(null);
        return Trap_Effect_Finished;
    }
    const tx = trap.tx;
    const ty = trap.ty;
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const see_it = cansee(tx, ty);
    let trapkilled = false;
    const mptr = mtmp.data;
    const orig_dmg = d(2, 4);
    const surf = 'floor'; // surface() deferred

    if (in_sight) {
        await pline(
            `A ${TOWER_OF_FLAME} erupts from the ${surf} under ${mon_nam(mtmp)}!`,
        );
    } else if (see_it) {
        await pline(`You see a ${TOWER_OF_FLAME} erupt from the ${surf}!`);
    }

    if (resists_fire(mtmp)) {
        if (in_sight) {
            await pline(`${Monnam(mtmp)} is uninjured.`);
        }
    } else {
        let num = orig_dmg;
        let immolate = false;
        const mndx = mptr?.mndx ?? -1;
        let alt = 0;
        if (mndx === PM_PAPER_GOLEM) {
            immolate = true;
            alt = mtmp.mhpmax | 0;
        } else if (mndx === PM_STRAW_GOLEM) {
            alt = (mtmp.mhpmax | 0) >> 1;
        } else if (mndx === PM_WOOD_GOLEM) {
            alt = (mtmp.mhpmax | 0) >> 2;
        } else if (mndx === PM_LEATHER_GOLEM) {
            alt = (mtmp.mhpmax | 0) >> 3;
        }
        if (alt > num) num = alt;

        if (await thitm(0, mtmp, null, num, immolate)) {
            trapkilled = true;
        } else {
            mtmp.mhpmax = (mtmp.mhpmax | 0) - rn2(num + 1);
            if ((mtmp.mhp | 0) > (mtmp.mhpmax | 0)) mtmp.mhp = mtmp.mhpmax;
        }
    }

    // C: if (burnarmor(mtmp) || rn2(3)) { destroy_items; ignite; HP }
    // Naked burnarmor returns TRUE → short-circuit (no rn2(3)).
    // Dynamic import avoids trap↔zap cycle (zap imports burnarmor).
    if ((await burnarmor(mtmp)) || rn2(3)) {
        const { destroy_items } = await import('./zap.js');
        const xtradmg = await destroy_items(mtmp, AD_FIRE, orig_dmg);
        await ignite_items(mtmp.minvent);
        if ((mtmp.mhp | 0) > 0) {
            mtmp.mhp = (mtmp.mhp | 0) - (xtradmg | 0);
        }
        if ((mtmp.mhp | 0) <= 0) {
            await monkilled(mtmp, '', AD_FIRE);
            trapkilled = true;
        }
    }
    // C: burn_floor_objects(tx,ty,see_it,FALSE); smell if !see_it && near
    {
        const { burn_floor_objects, melt_ice, is_ice } = await import('./zap.js');
        if (await burn_floor_objects(tx, ty, see_it, false)
            && !see_it
            && dist2(game.u?.ux | 0, game.u?.uy | 0, tx, ty) <= 3 * 3) {
            await pline('You smell smoke.');
        }
        if (is_ice(tx, ty)) await melt_ice(tx, ty, null);
    }
    if ((mtmp.mhp | 0) <= 0) trapkilled = true;
    if (see_it && t_at(tx, ty)) seetrap(t_at(tx, ty));

    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/** C youprop.h Blind / Deaf / Hallucination / Invis / See_invisible subset. */
function Blind() {
    const u = game.u || {};
    if (u.Blind || u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}
function Hallucination() {
    const u = game.u || {};
    if (u.Hallucination) return true;
    return !!((u.HHallucination | 0) && !(u.Halluc_resistance | 0));
}
/** C youprop.h Confusion — HConfusion (booleanized). */
function Confusion() {
    return !!((game.u?.HConfusion | 0));
}
function HInvis_val() { return (game.u?.HInvis | 0); }
function EInvis_val() { return (game.u?.EInvis | 0); }
function Invis() {
    const u = game.u || {};
    if (u.Invis && !((u.HInvis | 0) || (u.EInvis | 0))) return true;
    return !!(((u.HInvis | 0) || (u.EInvis | 0)) && !(u.BInvis | 0));
}
function See_invisible() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0) || u.See_invisible);
}
function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}
function Unaware() {
    const u = game.u || {};
    return (u.multi | 0) < 0 && !!u.usleep;
}
/** C mondata.h pm_invisible */
function pm_invisible(ptr) {
    const mndx = ptr?.mndx ?? -1;
    return mndx === PM_STALKER || mndx === PM_BLACK_LIGHT;
}
/** C potion.c itimeout / set_itimeout / incr_itimeout — TIMEOUT field only. */
function itimeout(val) { return (val | 0) & TIMEOUT; }
function set_itimeout_prop(key, val) {
    const u = game.u || (game.u = {});
    u[key] = ((u[key] | 0) & ~TIMEOUT) | itimeout(val);
}
function incr_itimeout_prop(key, incr) {
    const u = game.u || (game.u = {});
    const cur = u[key] | 0;
    set_itimeout_prop(key, (cur & TIMEOUT) + (incr | 0));
}
/**
 * C ref: potion.c make_blinded — talk=FALSE envelope for domagictrap.
 * Named omission: Eyes override probe detail; toggle_blindness vision recalc;
 * Punished set_bc; talk messages (always FALSE here).
 */
function make_blinded(xtime, _talk) {
    const u = game.u || (game.u = {});
    const old = (u.HBlinded | 0) & TIMEOUT;
    const u_could_see = !Blind();
    set_itimeout_prop('HBlinded', xtime ? 1 : 0);
    const can_see_now = !Blind();
    set_itimeout_prop('HBlinded', old);
    set_itimeout_prop('HBlinded', xtime);
    if (u_could_see !== can_see_now) {
        u.Blind = !can_see_now;
        if (game.flags) game.flags.botl = true;
    }
}
/** C mondata.c resists_blnd — hero Blind/Unaware gate; arti/expl deferred. */
function resists_blnd(mon) {
    if (is_youmonst(mon)) return Blind() || Unaware();
    return !!(mon?.mblinded || !mon?.mcansee || mon?.msleeping);
}
/** C ref: potion.c self_invis_message — stalker corpse / invis potion. */
export async function self_invis_message() {
    const prefix = Hallucination()
        ? 'Far out, man!  You'
        : 'Gee!  All of a sudden, you';
    const suffix = See_invisible()
        ? 'can see right through yourself'
        : "can't see yourself";
    await pline(`${prefix} ${suffix}.`);
}

/**
 * C ref: trap.c dofiretrap — null-box floor path.
 * Envelope: d(2,4); Underwater boil; tower pline; Fire_resistance rn2(2);
 * ordinary second d(2,4)+uhpmax rn2; losehp; burnarmor||rn2(3) →
 * destroy_items + ignite_items; burn_away_slime; burn_floor.
 * Named omissions: box/carried; shieldeff/monstseesu; Upolyd golem alts;
 * minuhpmax/setuhpmax/losexp; surface().
 */
async function dofiretrap(box) {
    const u = game.u || (game.u = {});
    const see_it = !Blind();
    const orig_dmg = d(2, 4);
    let num = orig_dmg;

    if (!box && u.Underwater) {
        await pline('A cascade of steamy bubbles erupts from the floor!');
        if (Fire_resistance()) await pline('You are uninjured.');
        else losehp(rnd(3), 'boiling water', KILLED_BY);
        return;
    }
    await pline(
        `A ${TOWER_OF_FLAME} ${box ? 'bursts' : 'erupts'} from the floor!`,
    );
    if (Fire_resistance()) {
        num = rn2(2);
    } else if (Upolyd(u)) {
        num = orig_dmg;
    } else {
        num = d(2, 4);
        const uhpmin = 1;
        if ((u.uhpmax | 0) > uhpmin) {
            u.uhpmax = (u.uhpmax | 0) - rn2(Math.min(u.uhpmax | 0, num + 1));
            if (game.flags) game.flags.botl = true;
        }
        if ((u.uhp | 0) > (u.uhpmax | 0)) {
            u.uhp = u.uhpmax;
            if (game.flags) game.flags.botl = true;
        }
    }
    if (!num) await pline('You are uninjured.');
    else losehp(num, TOWER_OF_FLAME, KILLED_BY_AN);
    {
        const { burn_away_slime } = await import('./timeout.js');
        await burn_away_slime();
    }
    const you = game.youmonst || { _youmonst: true };
    if ((await burnarmor(you)) || rn2(3)) {
        // Dynamic import avoids trap↔zap cycle.
        const { destroy_items } = await import('./zap.js');
        await destroy_items(you, AD_FIRE, orig_dmg);
        await ignite_items(game.invent);
    }
    // C: !box && burn_floor_objects(ux,uy,see_it,TRUE); smell if !see_it
    if (!box) {
        const { burn_floor_objects, melt_ice, is_ice } = await import('./zap.js');
        if (await burn_floor_objects(u.ux, u.uy, see_it, true) && !see_it) {
            await pline('You smell paper burning.');
        }
        if (is_ice(u.ux, u.uy)) await melt_ice(u.ux, u.uy, null);
    }
}

/**
 * C ref: trap.c domagictrap
 * Envelope: rnd(20) fate; <10 flash+deaf+makemon+wake; 10 noop; 11 HInvis
 * toggle; 12 dofiretrap; 13–18 feel/hear; 19 adjattrib+tamedog; 20 seffects
 * SPE_REMOVE_CURSE deferred.
 */
async function domagictrap() {
    const u = game.u || (game.u = {});
    const fate = rnd(20);

    if (fate < 10) {
        let cnt = rnd(4);
        if (!resists_blnd(game.youmonst || { _youmonst: true })) {
            await pline('You are momentarily blinded by a flash of light!');
            make_blinded(rn1(5, 10), false);
            if (!Blind()) await pline(`Your ${VISION_CLEARS}`);
        } else if (!Blind()) {
            await pline('You see a flash of light!');
        }
        if (!Deaf()) {
            await You_hear('a deafening roar!');
            incr_itimeout_prop('HDeaf', rn1(20, 30));
            if (game.flags) game.flags.botl = true;
        } else {
            await You_feel('rankled.');
            incr_itimeout_prop('HDeaf', rn1(5, 15));
            if (game.flags) game.flags.botl = true;
        }
        while (cnt--) {
            makemon(null, u.ux, u.uy, NO_MM_FLAGS);
        }
        wake_nearto(u.ux, u.uy, 7 * 7);
    } else {
        switch (fate) {
        case 10:
            break;
        case 11: {
            await You_hear('a low hum.');
            if (!Invis()) {
                if (!Blind()) await self_invis_message();
            } else if (!EInvis_val() && !pm_invisible(game.youmonst?.data)) {
                if (!Blind()) {
                    if (!See_invisible()) {
                        await pline('You can see yourself again!');
                    } else {
                        await pline("You can't see through yourself anymore.");
                    }
                }
            } else {
                await You_feel(
                    `a little more ${HInvis_val() ? 'obvious' : 'hidden'} now.`,
                );
            }
            u.HInvis = HInvis_val() ? 0 : (HInvis_val() | FROMOUTSIDE);
            u.Invis = Invis();
            newsym(u.ux, u.uy);
            break;
        }
        case 12:
            await dofiretrap(null);
            break;
        case 13:
            await pline('A shiver runs up and down your spine!');
            break;
        case 14:
            await You_hear(
                Hallucination() ? 'the moon howling at you.' : 'distant howling.',
            );
            break;
        case 15:
            if (Hallucination()) {
                await pline('You suddenly yearn for Cleveland.');
            } else if (In_quest(u.uz)) {
                await pline('You suddenly yearn for your nearby homeland.');
            } else {
                await pline('You suddenly yearn for your distant homeland.');
            }
            break;
        case 16:
            await pline('Your pack shakes violently!');
            break;
        case 17:
            await pline(
                Hallucination() ? 'You smell hamburgers.' : 'You smell charred flesh.',
            );
            break;
        case 18:
            await You_feel('tired.');
            break;
        case 19: {
            await adjattrib(A_CHA, 1, false);
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (!isok(u.ux + i, u.uy + j)) continue;
                    const mtmp = m_at(u.ux + i, u.uy + j);
                    if (mtmp) await tamedog(mtmp, null, true);
                }
            }
            break;
        }
        case 20:
            // seffects(SPE_REMOVE_CURSE) deferred
            break;
        default:
            break;
        }
    }
}

/**
 * C ref: trap.c trapeffect_magic_trap
 * Envelope: hero — seetrap; rn2(30) explosion else domagictrap. Monsters —
 * rn2(21)→fire. steedintrap MAGIC_TRAP is default no-op without usteed.
 */
async function trapeffect_magic_trap(mtmp, trap, trflags) {
    if (is_youmonst(mtmp)) {
        const u = game.u || (game.u = {});
        seetrap(trap);
        if (!rn2(30)) {
            deltrap(trap);
            newsym(u.ux, u.uy);
            await pline('You are caught in a magical explosion!');
            losehp(rnd(10), 'magical explosion', KILLED_BY_AN);
            await pline('Your body absorbs some of the magical energy!');
            u.uenmax = (u.uenmax | 0) + 2;
            u.uen = u.uenmax;
            if ((u.uenmax | 0) > (u.uenpeak | 0)) u.uenpeak = u.uenmax;
            return Trap_Effect_Finished;
        }
        await domagictrap();
        void trflags;
        return Trap_Effect_Finished;
    }
    /* A magic trap.  Monsters usually immune. */
    if (!rn2(21)) {
        return trapeffect_fire_trap(mtmp, trap, trflags);
    }
    return Trap_Effect_Finished;
}

/**
 * C ref: trap.c trapeffect_slp_gas_trap
 * Envelope: monsters — !resists_sleep && !breathless && !helpless →
 * sleep_monst(rnd(25), -1); pline+seetrap when in sight. Hero —
 * Sleep_resistance/fall_asleep/steedintrap deferred.
 */
async function trapeffect_slp_gas_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        // Hero cloud / fall_asleep deferred
        return Trap_Effect_Finished;
    }
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    if (!resists_sleep(mtmp) && !breathless(mtmp.data) && !helpless(mtmp)) {
        if (sleep_monst(mtmp, rnd(25), -1) && in_sight) {
            await pline(`${Monnam(mtmp)} suddenly falls asleep!`);
            seetrap(trap);
        }
    }
    return Trap_Effect_Finished;
}

/**
 * C ref: trap.c trapeffect_telep_trap — hero seetrap then tele_trap;
 * monster mtele_trap.
 * Envelope: tele_trap wrenching (D-1120) / once vault; teledest
 * displace+teleds else tele() (D-1133); vault_tele no-vault/space
 * → tele() (D-1153); mon in_sight pline+seetrap.
 * dotele trap-at-feet teledest D-1208 (teleds, no displace).
 * Named omission: mtele_trap dest-occupied skip (C: no displace).
 */
async function trapeffect_telep_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        seetrap(trap);
        await tele_trap(trap);
        return Trap_Effect_Finished;
    }
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const monname = Monnam(mtmp);
    if (await mtele_trap(mtmp, trap)) {
        if (in_sight) {
            if (canseemon(mtmp)) {
                await pline(`${monname} seems disoriented.`);
            } else {
                await pline(`${monname} suddenly disappears!`);
            }
            seetrap(trap);
        }
    }
    return Trap_Moved_Mon;
}

/**
 * C ref: trap.c mu_maybe_destroy_web — amorphous/whirly/flaming/unsolid/cube
 * destroy (flaming/acidic) or flow through; returns true if web does not catch.
 */
async function mu_maybe_destroy_web(mtmp, domsg, trap) {
    const isyou = is_youmonst(mtmp);
    const mptr = mtmp.data;
    if (!(amorphous(mptr) || is_whirly(mptr) || flaming(mptr)
        || unsolid(mptr) || (mptr?.mndx ?? -1) === PM_GELATINOUS_CUBE)) {
        return false;
    }
    const a_your = ['a', 'your'];
    if (flaming(mptr) || acidic(mptr)) {
        if (domsg) {
            if (isyou) {
                await pline(
                    `You ${flaming(mptr) ? 'burn' : 'dissolve'} ${a_your[trap.madeby_u ? 1 : 0]} spider web!`,
                );
            } else {
                await pline(
                    `${Monnam(mtmp)} ${flaming(mptr) ? 'burns' : 'dissolves'} ${a_your[trap.madeby_u ? 1 : 0]} spider web!`,
                );
            }
        }
        const x = trap.tx;
        const y = trap.ty;
        deltrap(trap);
        newsym(x, y);
        return true;
    }
    if (domsg) {
        if (isyou) {
            await pline(`You flow through ${a_your[trap.madeby_u ? 1 : 0]} spider web.`);
        } else {
            await pline(
                `${Monnam(mtmp)} flows through ${a_your[trap.madeby_u ? 1 : 0]} spider web.`,
            );
            seetrap(trap);
        }
    }
    return true;
}

/**
 * C ref: trap.c trapeffect_web — monster branch; hero/steed/strength-tim deferred.
 * Sets mtrapped for ordinary monsters; giants/extra_nasty dragons/long worms
 * and listed huge species tear the web.
 */
async function trapeffect_web(mtmp, trap, trflags) {
    if (is_youmonst(mtmp)) {
        // Hero web / steed / ACURR(A_STR) stuck-time deferred
        return Trap_Effect_Finished;
    }
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const mptr = mtmp.data;
    const mndx = mptr?.mndx ?? -1;
    const a_your = ['a', 'your'];

    if (webmaker(mptr)) return Trap_Effect_Finished;
    if (await mu_maybe_destroy_web(mtmp, in_sight, trap)) {
        return Trap_Effect_Finished;
    }

    let tear_web = false;
    // C: owlbear/bugbear out of sight → hear roar + trap; else fall through
    if ((mndx === PM_OWLBEAR || mndx === PM_BUGBEAR) && !in_sight) {
        await You_hear('the roaring of a confused bear!');
        mtmp.mtrapped = 1;
        return Trap_Caught_Mon;
    }

    // C: arbitrary huge tear list (excludes wumpus / giant zombies)
    if (mndx === PM_TITANOTHERE || mndx === PM_BALUCHITHERIUM
        || mndx === PM_PURPLE_WORM || mndx === PM_JABBERWOCK
        || mndx === PM_IRON_GOLEM || mndx === PM_BALROG
        || mndx === PM_KRAKEN || mndx === PM_MASTODON
        || mndx === PM_ORION || mndx === PM_NORN
        || mndx === PM_CYCLOPS || mndx === PM_LORD_SURTUR) {
        tear_web = true;
    } else {
        // C default (+ owlbear/bugbear in sight fallthrough)
        if (mptr?.mlet === 'S_GIANT'
            || (mptr?.mlet === 'S_DRAGON' && extra_nasty(mptr))
            || (mtmp.wormno && count_wsegs(mtmp) > 5)) {
            tear_web = true;
        } else if (in_sight) {
            await pline(
                `${Monnam(mtmp)} is caught in ${a_your[trap.madeby_u ? 1 : 0]} spider web.`,
            );
            seetrap(trap);
        }
        mtmp.mtrapped = tear_web ? 0 : 1;
    }

    if (tear_web) {
        if (in_sight) {
            await pline(
                `${Monnam(mtmp)} tears through ${a_your[trap.madeby_u ? 1 : 0]} spider web!`,
            );
        }
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
    } else if (forcetrap && !mtmp.mtrapped) {
        if (in_sight) {
            await pline(
                `${Monnam(mtmp)} avoids ${a_your[trap.madeby_u ? 1 : 0]} spider web!`,
            );
            seetrap(trap);
        }
    }
    return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

/**
 * C ref: trap.c blow_up_landmine — shared hero/mon landmine detonation.
 * Named omissions: scatter(MAY_DESTROY|MAY_HIT|MAY_FRACTURE|VIS_EFFECTS);
 * drawbridge destroy; fillholetyp/liquid_flow; fill_pit; maybe_dunk_boulders;
 * spot_checks.
 */
function blow_up_landmine(trap) {
    if (!trap) return;
    const x = trap.tx | 0;
    const y = trap.ty | 0;
    const lev = game.level?.locations?.[x]?.[y];
    // scatter deferred — object blast RNG named omission
    del_engr_at(x, y);
    wake_nearto(x, y, 400);
    if (lev && IS_DOOR(lev.typ)) lev.doormask = D_BROKEN;
    // drawbridge destroy deferred
    let t = t_at(x, y);
    if (t) {
        if (Is_waterlevel(game.u?.uz) || Is_airlevel(game.u?.uz)) {
            deltrap(t);
        } else {
            // fillholetyp → liquid_flow deferred; ordinary → PIT
            t.ttyp = PIT;
            t.madeby_u = false;
            seetrap(t);
        }
    }
    // fill_pit / maybe_dunk_boulders / spot_checks deferred
    recalc_block_point(x, y);
}

/**
 * C ref: trap.c trapeffect_landmine — hero + monster.
 * Monster: rnd(16) damage, iron-shoes quarter, weight gate rn2(cwt+1)
 * vs WT_ELF/2, m_in_air rn2(3), blow_up, thitm, recursive mintrap.
 * Hero: Lev/Fly discovery arms + wounded legs + losehp + recursive dotrap.
 * Named omissions: which_armor iron shoes; steedintrap / keep_saddle;
 * scatter via blow_up; fill_pit; unconscious awaken polish.
 */
async function trapeffect_landmine(mtmp, trap, trflags) {
    let damage = rnd(16);
    /* iron shoes protect against much of the damage from the explosion */
    if (wearing_iron_shoes(mtmp)) {
        damage = ((damage + 3) / 4) | 0;
    }

    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        const already_seen = !!trap.tseen;
        const forcetrap = ((trflags & FORCETRAP) !== 0
            || (trflags & FAILEDUNTRAP) !== 0);
        const forcebungle = (trflags & FORCEBUNGLE) !== 0;
        const a_your = ['a', 'your'];

        if ((u.Levitation || u.Flying) && !forcetrap) {
            if (!already_seen && rn2(3)) return Trap_Effect_Finished;
            feeltrap(trap);
            await pline(
                `${already_seen ? 'There is' : 'You discover'} `
                + `${trap.madeby_u ? 'the trigger of your mine' : 'a trigger'}`
                + ` in a pile of soil below you.`,
            );
            if (already_seen && rn2(3)) return Trap_Effect_Finished;
            await pline(
                `KAABLAMM!!!  ${forcebungle
                    ? 'Your inept attempt sets'
                    : 'The air currents set'} `
                + `${already_seen
                    ? `${a_your[trap.madeby_u ? 1 : 0]} land mine`
                    : 'it'} off!`,
            );
        } else {
            // recursive_mine / steedintrap deferred
            feeltrap(trap);
            await pline(
                `KAABLAMM!!!  You triggered ${a_your[trap.madeby_u ? 1 : 0]}`
                + ` land mine!`,
            );
            await set_wounded_legs(LEFT_SIDE, rn1(35, 41));
            await set_wounded_legs(RIGHT_SIDE, rn1(35, 41));
            exercise(A_DEX, false);
        }
        trap.ttyp = PIT;
        trap.madeby_u = false;
        await losehp(maybe_half_phys(damage), 'land mine', KILLED_BY_AN);
        blow_up_landmine(trap);
        newsym(u.ux, u.uy);
        const pit = t_at(u.ux, u.uy);
        if (pit) await dotrap(pit, RECURSIVETRAP);
        // fill_pit deferred
        return Trap_Effect_Finished;
    }

    // Monster branch
    let trapkilled = false;
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const a_your = ['a', 'your'];
    /* heavier monsters are more likely to set off a land mine */
    const MINE_TRIGGER_WT = (WT_ELF / 2) | 0;
    if (rn2((mtmp.data?.cwt | 0) + 1) < MINE_TRIGGER_WT) {
        return Trap_Effect_Finished;
    }
    if (m_in_air(mtmp)) {
        const already_seen = !!trap.tseen;
        if (in_sight && !already_seen) {
            await pline(
                `A trigger appears in a pile of soil below ${mon_nam(mtmp)}.`,
            );
            seetrap(trap);
        }
        if (rn2(3)) return Trap_Effect_Finished;
        if (in_sight) {
            newsym(mtmp.mx, mtmp.my);
            await pline(
                `The air currents set ${already_seen ? 'a land mine' : 'it'} off!`,
            );
        }
    } else if (in_sight) {
        newsym(mtmp.mx, mtmp.my);
        const boom = Deaf() ? '' : 'KAABLAMM!!!  ';
        await pline(
            `${boom}${Monnam(mtmp)} triggers ${a_your[trap.madeby_u ? 1 : 0]}`
            + ` land mine!`,
        );
    }
    if (!in_sight && !Deaf()) {
        await pline('Kaablamm!  You hear an explosion in the distance!');
    }
    // C captures tx/ty before blow_up for fill_pit (deferred)
    blow_up_landmine(trap);
    /* explosion might have destroyed a drawbridge; don't dish out more
       damage if monster is already dead */
    if ((mtmp.mhp | 0) <= 0
        || await thitm(0, mtmp, null, damage, false)) {
        trapkilled = true;
    } else {
        if (await mintrap(mtmp, trflags | FORCETRAP) === Trap_Killed_Mon) {
            trapkilled = true;
        }
    }
    // fill_pit deferred — thitm may have already destroyed the trap
    if ((mtmp.mhp | 0) <= 0) trapkilled = true;
    // unconscious awaken deferred
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

// C ref: trap.c trapeffect_selector — dart/rock/pit/sqky/hole/magic/fire/slp/telep/bear/rust/web/landmine
async function trapeffect_selector(mtmp, trap, trflags) {
    switch (trap.ttyp) {
    case DART_TRAP:
        return trapeffect_dart_trap(mtmp, trap);
    case ROCKTRAP:
        return trapeffect_rocktrap(mtmp, trap, trflags);
    case ROLLING_BOULDER_TRAP:
        return trapeffect_rolling_boulder_trap(mtmp, trap, trflags);
    case PIT:
    case SPIKED_PIT:
        return trapeffect_pit(mtmp, trap, trflags);
    case SQKY_BOARD:
        return trapeffect_sqky_board(mtmp, trap, trflags);
    case BEAR_TRAP:
        return trapeffect_bear_trap(mtmp, trap, trflags);
    case LANDMINE:
        return trapeffect_landmine(mtmp, trap, trflags);
    case HOLE:
    case TRAPDOOR:
        return trapeffect_hole(mtmp, trap, trflags);
    case LEVEL_TELEP:
        return trapeffect_level_telep(mtmp, trap, trflags);
    case MAGIC_PORTAL:
        return trapeffect_magic_portal(mtmp, trap, trflags);
    case FIRE_TRAP:
        return trapeffect_fire_trap(mtmp, trap, trflags);
    case MAGIC_TRAP:
        return trapeffect_magic_trap(mtmp, trap, trflags);
    case SLP_GAS_TRAP:
        return trapeffect_slp_gas_trap(mtmp, trap, trflags);
    case TELEP_TRAP:
        return trapeffect_telep_trap(mtmp, trap, trflags);
    case RUST_TRAP:
        return trapeffect_rust_trap(mtmp, trap, trflags);
    case WEB:
        return trapeffect_web(mtmp, trap, trflags);
    case STATUE_TRAP:
        return trapeffect_statue_trap(mtmp, trap, trflags);
    default:
        // Named omission: arrow/anti-magic/… trap effects
        return Trap_Effect_Finished;
    }
}

/**
 * C ref: trap.c trapeffect_statue_trap — hero activates; monsters immune.
 */
async function trapeffect_statue_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        await activate_statue_trap(trap, u.ux | 0, u.uy | 0, false);
    }
    return Trap_Effect_Finished;
}

/**
 * C ref: trap.c mintrap() — monster steps on a trap.
 * Early-session envelope: dart / rock / pit / sqky / hole|trapdoor /
 * magic|fire learn+effect; already_seen rn2(4) skip when mon_knows_traps
 * or HOLE && !mindless (D-0703). Other types and escape paths partial.
 */
export async function mintrap(mtmp, mintrapflags = NO_TRAP_FLAGS) {
    const trap = t_at(mtmp.mx, mtmp.my);
    if (!trap) {
        mtmp.mtrapped = 0;
        return Trap_Effect_Finished;
    }
    if (mtmp.mtrapped) {
        // C trap.c mintrap — already in trap: maybe reveal, then rn2(40)
        // escape (or easy pit). Boulder-in-pit / metallivorous chew deferred.
        if (!trap.tseen && cansee(mtmp.mx, mtmp.my) && canseemon(mtmp)
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE || trap.ttyp === WEB)) {
            seetrap(trap);
        }
        // m_easy_escape_pit arm deferred — only rn2(40) gate for now
        if (!rn2(40)) {
            if (canseemon(mtmp)) {
                if (is_pit(trap.ttyp)) {
                    await pline(`${Monnam(mtmp)} climbs out of the pit.`);
                } else if (trap.ttyp === BEAR_TRAP || trap.ttyp === WEB) {
                    await pline(
                        `${Monnam(mtmp)} pulls free of the ${trapname(trap.ttyp, false)}.`,
                    );
                }
            }
            mtmp.mtrapped = 0;
        }
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }

    const forcetrap = (mintrapflags & FORCETRAP) !== 0;
    const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
    const tt = trap.ttyp;
    const mptr = mtmp.data;
    // C: mon_knows_traps || (HOLE && !mindless) — holes are obvious
    const already_seen = mon_knows_traps(mtmp, tt)
        || (tt === HOLE && !mindless(mptr));

    if (!forcetrap) {
        // C: Sokoban pit/hole messaging deferred; floor_trigger+in_air skip
        if (floor_trigger(tt) && check_in_air(mtmp, mintrapflags)) {
            return Trap_Effect_Finished;
        }
        if (already_seen && rn2(4) && !forcebungle) {
            return Trap_Effect_Finished;
        }
    }

    // C: mon_learns_traps then mons_see_trap then trapeffect_selector
    mon_learns_traps(mtmp, tt);
    mons_see_trap(trap);
    // madeby_u rnl setmangry deferred (RNG on that arm only)
    return await trapeffect_selector(mtmp, trap, mintrapflags);
}

const POT_WATER = objectNames.indexOf('POT_WATER');
const POT_ACID = objectNames.indexOf('POT_ACID');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const CAN_OF_GREASE = objectNames.indexOf('CAN_OF_GREASE');
const TOWEL = objectNames.indexOf('TOWEL');

/**
 * C ref: trap.c water_damage
 * Branch envelope: null → ER_NOTHING; splash_lit (D-1337); CAN_OF_GREASE;
 * TOWEL wet; greased wash rn2(2); Is_container / Waterproof_container
 * before luck rn2(20); potion dilute / scroll fade / spellbook fade;
 * else `erode_obj(..., ERODE_RUST, EF_NONE)` (D-0683 / D-0928 #1101).
 * Named omit: pot_acid_damage boom; SPE_NOVEL blank_novel.
 */
export async function water_damage(obj, ostr, force) {
    if (!obj) return ER_NOTHING;
    const in_invent = carried_obj(obj);

    // C: splash_lit before ostr / luck — extinguish skips further damage RNG
    if (await splash_lit(obj)) return ER_DAMAGED;

    if (!ostr) ostr = cxname(obj);

    if (obj.otyp === CAN_OF_GREASE && (obj.spe | 0) > 0) {
        return ER_NOTHING;
    }
    if (obj.otyp === TOWEL && (obj.spe | 0) < 7) {
        await wet_a_towel(obj, -rnd(7 - (obj.spe | 0)), true);
        return ER_NOTHING;
    }
    if (obj.greased) {
        if (!rn2(2)) {
            obj.greased = 0;
            if (in_invent) {
                await pline(`The grease on ${yname(obj)} washes off.`);
                update_inventory();
            }
            if (obj.otyp === POT_ACID) {
                // pot_acid_damage deferred
                return ER_DESTROYED;
            }
        }
        return ER_GREASED;
    }
    if (Is_container(obj)
        && (!Waterproof_container(obj) || (obj.cursed && !rn2(3)))) {
        if (in_invent) {
            await pline(`Some ${hliquid('water')} gets into your ${ostr}!`);
            game.mentioned_water = !Hallucination();
        }
        await water_damage_chain(obj.cobj, false);
        return ER_DAMAGED;
    }
    if (Waterproof_container(obj)) {
        if (in_invent && !Blind() && !(game.u?.uinwater)) {
            await pline(`The ${hliquid('water')} cannot get into your ${ostr}.`);
            game.mentioned_water = !Hallucination();
            makeknown(obj.otyp);
        }
        return ER_DAMAGED;
    }

    if (!force && ((game.u?.Luck | 0) + 5) > rn2(20)) {
        return ER_NOTHING;
    }

    if (obj.oclass === SCROLL_CLASS) {
        if (obj.otyp === SCR_BLANK_PAPER) return ER_NOTHING;
        obj.otyp = SCR_BLANK_PAPER;
        obj.dknown = 0;
        obj.spe = 0;
        return ER_DAMAGED;
    }
    if (obj.oclass === SPBOOK_CLASS) {
        if (obj.otyp === SPE_BOOK_OF_THE_DEAD) return ER_NOTHING;
        if (obj.otyp === SPE_BLANK_PAPER) return ER_NOTHING;
        const otyp = obj.otyp;
        obj.otyp = SPE_BLANK_PAPER;
        if (obj.spestudied) obj.spestudied = rn2(obj.spestudied);
        obj.dknown = 0;
        void otyp; // SPE_NOVEL blank_novel deferred
        void SPE_NOVEL;
        return ER_DAMAGED;
    }
    if (obj.oclass === POTION_CLASS) {
        if (obj.otyp === POT_ACID) {
            // pot_acid_damage deferred
            return ER_DESTROYED;
        }
        if (obj.odiluted) {
            obj.otyp = POT_WATER;
            obj.dknown = 0;
            obj.blessed = obj.cursed = false;
            obj.odiluted = 0;
            return ER_DAMAGED;
        }
        if (obj.otyp !== POT_WATER) {
            obj.odiluted = (obj.odiluted | 0) + 1;
            return ER_DAMAGED;
        }
        return ER_NOTHING;
    }
    // C: return erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
    return await erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
}

/**
 * C ref: trap.c fire_damage_chain — walk invent (nobj) or floor (nexthere).
 * Snapshot next before fire_damage may delobj. Sets bhitpos for erode_obj.
 * Blind && !couldsee → "You smell smoke." when any object burned (D-1138).
 * @returns {Promise<number>} destroyed count
 */
export async function fire_damage_chain(chain, force, here, x, y) {
    if (!chain) return 0;
    const { fire_damage } = await import('./do.js');
    if (!game.bhitpos) game.bhitpos = {};
    game.bhitpos.x = x | 0;
    game.bhitpos.y = y | 0;

    let num = 0;
    for (let obj = chain; obj; ) {
        const nobj = here ? obj.nexthere : obj.nobj;
        if (await fire_damage(obj, force, x, y)) num++;
        obj = nobj;
    }
    if (num && Blind() && !couldsee(x, y)) {
        await pline('You smell smoke.');
    }
    return num;
}

/**
 * C ref: trap.c water_damage_chain — walk invent / floor chain.
 * acid_ctx / bhitpos save deferred.
 */
export async function water_damage_chain(objOrList, here) {
    if (!objOrList) return;
    if (Array.isArray(objOrList)) {
        for (const obj of [...objOrList]) {
            await water_damage(obj, null, false);
        }
        return;
    }
    for (let obj = objOrList; obj; obj = here ? obj.nexthere : obj.nobj) {
        await water_damage(obj, null, false);
    }
}

/**
 * C ref: trap.c emergency_disrobe — drop until near_capacity ok.
 * Named omissions: full undroppable set / remove_worn_item / dropx body;
 * when already light enough, returns TRUE with no RNG (session path).
 */
function emergency_disrobe(lostRef) {
    lostRef.lost = false;
    return true;
}

/**
 * C ref: trap.c rnd_nextto_goodpos — shuffle N_DIRS, first crawl_destination
 * / goodpos wins. Hero path uses crawl_destination.
 */
export function rnd_nextto_goodpos(pos, mtmp) {
    const dirs = [];
    for (let i = 0; i < N_DIRS; i++) dirs.push(i);
    for (let i = N_DIRS; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    const isU = !mtmp || mtmp === game.youmonst || mtmp?.isYou;
    for (let i = 0; i < N_DIRS; i++) {
        const nx = (pos.x | 0) + xdir[dirs[i]];
        const ny = (pos.y | 0) + ydir[dirs[i]];
        let ok = false;
        if (isU) {
            ok = crawl_destination(nx, ny);
        } else {
            ok = goodpos(nx, ny, mtmp, 0);
        }
        if (ok) {
            pos.x = nx;
            pos.y = ny;
            return true;
        }
    }
    return false;
}

/**
 * Minimal teleds for drown crawl-out — u_on_newpos + vision/newsym.
 * Ball/chain, swallow, drag_ball, spoteffects re-entry deferred.
 */
async function teleds_drown(nux, nuy) {
    const u = game.u;
    if (!u) return;
    const ox = u.ux, oy = u.uy;
    u.ux0 = ox;
    u.uy0 = oy;
    u.ux = nux;
    u.uy = nuy;
    if (u.usteed) {
        u.usteed.mx = nux;
        u.usteed.my = nuy;
    }
    newsym(ox, oy);
    const { vision_recalc } = await import('./vision.js');
    vision_recalc(1);
    newsym(nux, nuy);
}

/**
 * C ref: trap.c drown — fall/plunge into pool/waterwall; crawl out.
 * Branch envelope: first-entry fall/plunge + sink; empty water_damage_chain;
 * rnd_nextto_goodpos + emergency_disrobe stub + crawl/Pheew + teleds.
 * Fail-crawl set_uinwater(1) is D-1267. Named omissions: Amphibious/
 * Breathless/Swimming wade set_uinwater; post-rescue set_uinwater(0);
 * gremlin/iron golem; leash; Teleportation escape; steed; sleep/faint;
 * waterlevel disrobe; drowning done() loop; Hallucination Titanic.
 * @returns {Promise<boolean>} true if hero relocated
 */
export async function drown() {
    const u = game.u;
    if (!u) return false;
    const isSolid = isok(u.ux, u.uy)
        && game.level?.at(u.ux, u.uy)?.typ === WATER;

    if (!u.uinwater) {
        const body = waterbody_name(u.ux, u.uy);
        await pline(`You ${isSolid ? 'plunge' : 'fall'} into the ${body}!`);
        if (!isSolid) {
            await pline('You sink like a rock.');
        }
    }

    await water_damage_chain(game.invent, false);

    const pos = { x: u.ux, y: u.uy };
    if ((game.multi | 0) >= 0 && rnd_nextto_goodpos(pos, game.youmonst)) {
        const lostRef = { lost: false };
        const succ = emergency_disrobe(lostRef);
        await pline('You try to crawl out of the water.');
        if (lostRef.lost) {
            await pline('You dump some of your gear to lose weight...');
        }
        if (succ) {
            await pline('Pheew!  That was close.');
            await teleds_drown(pos.x, pos.y);
            return true;
        }
        await pline('But in vain.');
    }

    await set_uinwater(1); /* C trap.c:5170 — u.uinwater = 1 */
    await pline('You drown.');
    return true;
}

/**
 * C ref: trap.c lava_effects — enter lava/lavawall.
 * Branch envelope: d(6,6) always; non-resistant fall + burn-to-crisp done(BURNING).
 * Named omissions: Fire_resistance/Wwalking survive; invent burn flags;
 * boots burst; life-save/teleds loop; boil-away poly; sink_into_lava.
 * @returns {Promise<boolean>} true if relocated (life-save); noreturn on death
 */
export async function lava_effects() {
    const u = game.u;
    if (!u) return false;
    if (game.iflags?.in_lava_effects) return false;

    // C: const int dmg = d(6, 6); /* only applicable for water walking */
    const dmg = d(6, 6);
    void dmg;

    // likes_lava / Fire_resistance / Wwalking survive arms deferred
    await pline(`You fall into the ${waterbody_name(u.ux, u.uy)}!`);

    // invent burn / Boots_off deferred (empty invent on this path)
    u.uhp = -1;
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.format = KILLED_BY;
    game.killer.name = 'molten lava';
    await pline('You burn to a crisp...');
    const { done } = await import('./end.js');
    await done(BURNING);
    return false;
}

/**
 * C ref: trap.c reward_untrap — pacify adjacent monster freed from trap.
 * Named omit: unique_corpstat polish beyond G_UNIQ (long-worm-tail).
 */
async function reward_untrap(ttmp, mtmp) {
    if (!ttmp || !mtmp || ttmp.madeby_u) return;
    const ptr = mtmp.data;
    if (rnl(10) < 8 && !mtmp.mpeaceful && !helpless(mtmp)
        && !(mtmp.mfrozen | 0) && !mindless(ptr)
        && !((ptr?.geno | 0) & G_UNIQ)
        && ptr?.mlet !== 'S_HUMAN') {
        mtmp.mpeaceful = 1;
        set_malign(mtmp);
        await pline(`${Monnam(mtmp)} is grateful.`);
    }
    // Helping someone out of a trap is a nice thing to do.
    if (!rn2(3) && !rnl(8) && (game.u?.ualign?.type | 0) === A_LAWFUL) {
        adjalign(1);
        await You_feel('that you did the right thing.');
    }
}

/** C: you.h m_next2u — squared dist ≤ 2 (local; mon.js keeps private). */
function m_next2u_trap(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/** C hacklib vowels — article "an" vs "a". */
function vowel_start(s) {
    const c = (s || '')[0];
    return !!c && 'aeiouAEIOU'.includes(c);
}

/**
 * C ref: trap.c openholdingtrap — magic unlock frees hero/mon from
 * holding trap (utrap / BEAR_TRAP / WEB).
 * @param {object|null} mon  target (youmonst or steed → hero path)
 * @returns {Promise<{happened:boolean,noticed:boolean}>}
 */
export async function openholdingtrap(mon) {
    if (!mon) return { happened: false, noticed: false };
    const u = game.u || {};
    let ishero = mon === game.youmonst || !!mon._youmonst;
    if (mon === u.usteed) ishero = true;

    let t = t_at(ishero ? (u.ux | 0) : (mon.mx | 0),
        ishero ? (u.uy | 0) : (mon.my | 0));
    let trapdescr = null;
    let which = null;
    const the_your = ['the', 'your'];
    let noticed = false;

    if (ishero && (u.utrap | 0)) {
        // all u.utraptype values are holding traps
        if (!t) {
            t = { tseen: 0, madeby_u: 0, ttyp: 0, tx: u.ux | 0, ty: u.uy | 0 };
        }
        which = the_your[(!t.tseen || !t.madeby_u) ? 0 : 1];
        switch (u.utraptype | 0) {
        case TT_LAVA:
            trapdescr = 'molten lava';
            break;
        case TT_INFLOOR:
            trapdescr = 'ground';
            break;
        case TT_BURIEDBALL:
            trapdescr = 'your anchor';
            which = '';
            break;
        case TT_BEARTRAP:
        case TT_PIT:
        case TT_WEB:
            trapdescr = trapname(
                (u.utraptype | 0) === TT_WEB ? WEB
                    : (u.utraptype | 0) === TT_PIT ? PIT
                        : BEAR_TRAP,
                false,
            );
            break;
        default:
            trapdescr = 'trap';
            break;
        }
    } else {
        if (!t || ((t.ttyp | 0) !== BEAR_TRAP && (t.ttyp | 0) !== WEB)) {
            return { happened: false, noticed: false };
        }
        trapdescr = trapname(t.ttyp, false);
    }

    if (which == null) {
        which = t.tseen
            ? the_your[t.madeby_u ? 1 : 0]
            : (vowel_start(trapdescr) ? 'an' : 'a');
    }
    let whichSpaced = which;
    if (whichSpaced) whichSpaced = `${whichSpaced} `;

    if (ishero) {
        if (!(u.utrap | 0)) return { happened: false, noticed: false };
        noticed = true;
        let buf;
        if (!u.usteed) buf = 'You are';
        else if ((u.utraptype | 0) === TT_BURIEDBALL) {
            buf = `You and ${y_monnam(u.usteed)} are`;
        } else {
            buf = `${noit_Monnam(u.usteed)} is`;
        }
        await pline(`${buf} released from ${whichSpaced}${trapdescr}.`);
        game.vision_full_recalc = 1;
        reset_utrap(true);
        if (game.vision_full_recalc) vision_recalc(0);
    } else {
        if (!(mon.mtrapped | 0)) return { happened: false, noticed: false };
        mon.mtrapped = 0;
        if (canseemon(mon)) {
            noticed = true;
            await pline(
                `${Monnam(mon)} is released from ${whichSpaced}${trapdescr}.`,
            );
        } else if (cansee(t.tx | 0, t.ty | 0) && t.tseen) {
            noticed = true;
            if ((t.ttyp | 0) === WEB) {
                await pline(
                    `Something is released from ${whichSpaced}${trapdescr}.`,
                );
            } else {
                const openSubj = whichSpaced
                    ? `${whichSpaced.charAt(0).toUpperCase()}${whichSpaced.slice(1)}`
                    : '';
                await pline(`${openSubj}${trapdescr} opens.`);
            }
        }
        if (rn2(2) && m_next2u_trap(mon)) {
            await reward_untrap(t, mon);
        }
    }
    return { happened: true, noticed };
}

/**
 * C ref: trap.c closeholdingtrap :6210–6247 — magic lock snaps a
 * BEAR_TRAP/WEB on hero or monster. Returns whether the target was
 * hit (might avoid actually becoming trapped). *noticed is set only
 * when the attempt runs; otherwise the previous value is left intact
 * (JS: noticed stays false on early return).
 * Callers: zap.c bhitm WAN_LOCKING (D-1425); zapyourself WAN_LOCKING
 * (D-1434); zap_updown WAN_LOCKING (D-1465).
 * @param {object|null} mon  target (youmonst or steed → hero path)
 * @returns {Promise<{happened:boolean,noticed:boolean}>}
 */
export async function closeholdingtrap(mon) {
    if (!mon) return { happened: false, noticed: false };
    const u = game.u || {};
    let ishero = mon === game.youmonst || !!mon._youmonst;
    if (mon === u.usteed) ishero = true;

    const t = t_at(ishero ? (u.ux | 0) : (mon.mx | 0),
        ishero ? (u.uy | 0) : (mon.my | 0));
    if (!t || ((t.ttyp | 0) !== BEAR_TRAP && (t.ttyp | 0) !== WEB)) {
        return { happened: false, noticed: false };
    }

    if (ishero) {
        if (u.utrap | 0) return { happened: false, noticed: false };
        let dotrapflags = FORCETRAP;
        // C: dotrap calls mintrap when mounted hero encounters a web
        if (u.usteed) dotrapflags |= NOWEBMSG;
        await dotrap(t, dotrapflags | FORCETRAP);
        return { happened: !!(u.utrap | 0), noticed: true };
    }
    if (mon.mtrapped | 0) return { happened: false, noticed: false };
    const noticed = cansee(t.tx | 0, t.ty | 0) || canspotmon(mon);
    const res = await mintrap(mon, FORCETRAP);
    return {
        happened: res !== Trap_Effect_Finished,
        noticed,
    };
}

/**
 * C ref: trap.c openfallingtrap — magic unlock triggers trapdoor/hole/pit.
 * @param {object|null} mon
 * @param {boolean} trapdoor_only  TRUE → only TRAPDOOR/ROCKTRAP
 * @returns {Promise<{happened:boolean,noticed:boolean}>}
 */
export async function openfallingtrap(mon, trapdoor_only) {
    if (!mon) return { happened: false, noticed: false };
    const u = game.u || {};
    let ishero = mon === game.youmonst || !!mon._youmonst;
    if (mon === u.usteed) ishero = true;

    const t = t_at(ishero ? (u.ux | 0) : (mon.mx | 0),
        ishero ? (u.uy | 0) : (mon.my | 0));
    if (!t) return { happened: false, noticed: false };
    const tt = t.ttyp | 0;
    if ((tt !== TRAPDOOR && tt !== ROCKTRAP)
        && (trapdoor_only || (tt !== HOLE && !is_pit(tt)))) {
        return { happened: false, noticed: false };
    }

    if (ishero) {
        if (u.utrap | 0) return { happened: false, noticed: false };
        await dotrap(t, FORCETRAP);
        return { happened: !!(u.utrap | 0), noticed: true };
    }
    if (mon.mtrapped | 0) return { happened: false, noticed: false };
    const noticed = cansee(t.tx | 0, t.ty | 0) || canseemon(mon);
    await wakeup(mon, true);
    const res = await mintrap(mon, FORCETRAP);
    return {
        happened: res !== Trap_Effect_Finished,
        noticed,
    };
}

/**
 * C ref: trap.c could_untrap — preliminary #untrap / autounlock gates.
 * Named omissions: sticks/ustuck busy-hands wording; check_floor reach
 * surface; untrap floor/box arms (door force is D-1495).
 * @param {boolean} verbosely
 * @param {boolean} [check_floor=false]
 * @returns {Promise<boolean>} true when allowed (C returns 1)
 */
export async function could_untrap(verbosely, check_floor = false) {
    let buf = '';
    if (near_capacity() >= HVY_ENCUMBER) {
        buf = "You're too strained to do that.";
    } else if (
        (nohands(game.youmonst?.data) && !webmaker(game.youmonst?.data))
        || !(game.youmonst?.data?.mmove | 0)
    ) {
        buf = 'And just how do you expect to do that?';
    } else if (game.u?.ustuck) {
        // sticks() / mon_nam wording deferred — block with busy-hands stub
        buf = 'Your hands seem to be too busy for that.';
    } else {
        const uwep = game.u?.uwep;
        const bimanual = !!(uwep && game.objects?.[uwep.otyp]?.oc_big);
        if (uwep && welded(uwep) && bimanual) {
            buf = 'Your hands seem to be too busy for that.';
        } else if (check_floor) {
            const { can_reach_floor } = await import('./engrave.js');
            if (!can_reach_floor(false)) {
                buf = "You can't reach the floor.";
            }
        }
    }
    if (buf) {
        if (verbosely) await pline(buf);
        return false;
    }
    return true;
}

/**
 * C ref: trap.c untrap — hero able to attempt disarm, so do so.
 * Branch envelope: usual #untrap `getdir(NULL)`; cancel → 0; !isok;
 * non-door with no tseen trap → "You know of no traps there.";
 * has_magic_key → force; door D_NODOOR/ISOPEN/BROKEN; D_TRAPPED
 * find/disarm with force luck-skip (`:5865–5868` / `:6051–6095`).
 * Named omissions: floor-trap disarm_* switch; boxcnt/ynq/untrap_box;
 * autounlock_box; can_reach "can't reach" pline; mimic stumble.
 * @param {boolean} [force=false]
 * @param {number} [rx=0]
 * @param {number} [ry=0]
 * @param {object|null} [container=null]
 * @returns {Promise<number>} 1 spent time, 0 otherwise (C boolean)
 */
export async function untrap(force = false, rx = 0, ry = 0, container = null) {
    const confused = !!(Confusion() || Hallucination());
    let autounlock_door = false;
    let trap_skipped = false;
    let x;
    let y;
    // C: force is true for #invoke; carrying MKoT makes #untrap force
    if (!force) {
        const { has_magic_key } = await import('./artifact.js');
        if (has_magic_key(game.youmonst)) force = true;
    }
    if (!rx && !container) {
        // C: usual case — getdir((char *)0) → "In what direction?"
        const { getdir } = await import('./lock.js');
        if (!(await getdir(null))) return 0;
        x = (game.u.ux | 0) + (game.u.dx | 0);
        y = (game.u.uy | 0) + (game.u.dy | 0);
    } else if (container) {
        // Named omission: untrap_box(container, force, confused)
        return 1;
    } else {
        x = rx | 0;
        y = ry | 0;
        autounlock_door = true;
    }
    if (!isok(x, y)) {
        await pline('The perils lurking there are beyond your grasp.');
        return 0;
    }
    const ttmp0 = t_at(x, y);
    const ttmp = ttmp0 && ttmp0.tseen ? ttmp0 : null;
    const loc = game.level?.at?.(x, y);
    if (!autounlock_door && ttmp) {
        const { can_reach_floor } = await import('./engrave.js');
        if (can_reach_floor(false)) {
            // Floor-trap disarm_* named — C returns from the ttyp switch.
            return 0;
        }
        trap_skipped = true;
    }
    if (!loc || !IS_DOOR(loc.typ | 0)) {
        if (!trap_skipped) await pline('You know of no traps there.');
        return 0;
    }
    const mask = loc.doormask | 0;
    switch (mask) {
    case D_NODOOR:
        await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
        return 0;
    case D_ISOPEN:
        await pline('This door is safely open.');
        return 0;
    case D_BROKEN:
        await pline('This door is broken.');
        return 0;
    }
    const u = game.u || {};
    const trapped = (mask & D_TRAPPED) !== 0;
    if ((trapped && (force || (!confused
            && rn2(MAXULEV - (u.ulevel | 0) + 11) < 10)))
        || (!force && confused && !rn2(3))) {
        await pline('You find a trap on the door!');
        exercise(A_WIS, true);
        const { yn_function } = await import('./getline.js');
        if ((await yn_function('Disarm it?', 'ynq', 'n')) !== 'y') return 1;
        if (trapped) {
            const ch = 15 + (Role_if(PM_ROGUE)
                ? (u.ulevel | 0) * 3
                : (u.ulevel | 0));
            exercise(A_DEX, true);
            if (!force && (confused || Fumbling()
                || rnd(75 + Math.trunc(level_difficulty() / 2)) > ch)) {
                await pline('You set it off!');
                await b_trapped('door', FINGER);
                loc.doormask = D_NODOOR;
                recalc_block_point(x, y);
                newsym(x, y);
                if (in_rooms(x, y, SHOPBASE)) add_damage(x, y, 0);
            } else {
                await pline('You disarm it!');
                loc.doormask = mask & ~D_TRAPPED;
                const { more_experienced, newexplevel } =
                    await import('./exper.js');
                more_experienced(8, 0);
                await newexplevel();
            }
        } else {
            await pline('This door was not trapped.');
        }
        return 1;
    }
    await pline('You find no traps on the door.');
    return 1;
}

/**
 * C ref: trap.c dountrap — #untrap disarm.
 * Branch envelope: could_untrap then untrap(FALSE,0,0,NULL).
 * @returns {Promise<number>} ECMD_*
 */
export async function dountrap() {
    if (!(await could_untrap(true, false))) return ECMD_OK;
    return (await untrap(false, 0, 0, null)) ? ECMD_TIME : ECMD_OK;
}

/** C you.h Luck — u.uluck + u.moreluck */
function Luck_chest() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

/** C ref: objnam.c Tobjnam — The(xname) + otense verb. */
function Tobjnam_chest(obj, verb) {
    const nam = The(xname(obj));
    if (!verb) return nam;
    const plural = (obj?.quan | 0) !== 1;
    // thin otense: add s / es
    let v = verb;
    if (!plural) {
        if (v.endsWith('s') || v.endsWith('x') || v.endsWith('ch') || v.endsWith('sh')) {
            v += 'es';
        } else if (v.endsWith('y') && !/[aeiou]y$/i.test(v)) {
            v = `${v.slice(0, -1)}ies`;
        } else {
            v += 's';
        }
    }
    return `${nam} ${v}`;
}

function currency_chest(amt) {
    return (amt | 0) === 1 ? 'zorkmid' : 'zorkmids';
}

/**
 * C ref: invent.c / shk.c delete_contents — obfree chain (no obj_resists).
 */
function delete_contents_chest(obj) {
    while (obj?.cobj) {
        const curr = obj.cobj;
        obj_extract_self(curr);
        if (curr.cobj) delete_contents_chest(curr);
        curr.quan = 0;
        curr.where = OBJ_FREE;
        curr.nobj = null;
        curr.nexthere = null;
    }
}

// C ref: trap.c blindgas[] — ROLL_FROM when Blind in chest_trap gas.
const BLINDGAS = [
    'humid', 'odorless', 'pungent', 'chilling', 'acrid', 'biting',
];

/**
 * C ref: trap.c chest_trap — hero triggers box trap (kick/open/force).
 * Returns true if chest destroyed.
 * Named omit: Soundeffect; bot() redraw polish; Halluc_resistance
 * stagger suffix polish; shieldeff. Gas adjective is D-1147
 * (Blind ? ROLL_FROM(blindgas) : rndcolor()).
 */
export async function chest_trap(obj, bodypart, disarm) {
    if (!obj) return false;
    const u = game.u || (game.u = {});
    const loc = get_obj_location(obj, 0);
    if (loc) {
        obj.ox = loc.x | 0;
        obj.oy = loc.y | 0;
    }

    obj.tknown = 0;
    obj.otrapped = 0;
    await pline(disarm ? 'You set it off!' : 'You trigger a trap!');
    await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, FALSE)

    const luck = Luck_chest();
    if (luck > -13 && rn2(13 + luck) > 7) {
        let msg = null;
        switch (rn2(13)) {
        case 12: case 11: msg = 'explosive charge is a dud'; break;
        case 10: case 9: msg = 'electric charge is grounded'; break;
        case 8: case 7: msg = 'flame fizzles out'; break;
        case 6: case 5: case 4: msg = 'poisoned needle misses'; break;
        case 3: case 2: case 1: case 0: msg = 'gas cloud blows away'; break;
        default: break;
        }
        if (msg) await pline(`But luckily the ${msg}!`);
    } else {
        const roll = rn2(20)
            ? ((luck >= 13) ? 0 : rn2(13 - luck))
            : rn2(26);
        switch (roll) {
        case 25: case 24: case 23: case 22: case 21: {
            const ox = obj.ox | 0;
            const oy = obj.oy | 0;
            let shkp = null;
            let loss = 0;
            const rooms = in_rooms(ox, oy, SHOPBASE) || '';
            const costly = costly_spot(ox, oy)
                && !!(shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : 0));
            const insider = !!(u.ushops
                && (u.ushops || '')[0]
                && rooms[0]
                && (u.ushops || '')[0] === rooms[0]
                && (u.ushops || '').length > 0);

            await pline(`${Tobjnam_chest(obj, 'explode')}!`);
            const buf = `exploding ${xname(obj)}`;

            if (costly) {
                loss += await stolen_value(
                    obj, ox, oy, !!(shkp?.mpeaceful), true,
                );
            }
            delete_contents_chest(obj);

            if (u.uball) {
                const chain = u.uchain;
                const ball = u.uball;
                if ((chain && (chain.ox | 0) === ox && (chain.oy | 0) === oy)
                    || (ball?.where === OBJ_FLOOR
                        && (ball.ox | 0) === ox && (ball.oy | 0) === oy)) {
                    unpunish();
                }
            }

            let chestgone = false;
            for (let otmp = objects_at(ox, oy); otmp; ) {
                const otmp2 = otmp.nexthere;
                if (costly) {
                    loss += await stolen_value(
                        otmp, otmp.ox | 0, otmp.oy | 0,
                        !!(shkp?.mpeaceful), true,
                    );
                }
                if (otmp === obj) chestgone = true;
                delobj(otmp);
                otmp = otmp2;
            }
            wake_nearby(false);
            losehp(maybe_half_phys(d(6, 6)), buf, KILLED_BY_AN);
            exercise(A_STR, false);
            if (costly && loss) {
                if (insider) {
                    await pline(
                        `You owe ${loss} ${currency_chest(loss)} for objects destroyed.`,
                    );
                } else {
                    await pline(
                        `You caused ${loss} ${currency_chest(loss)} worth of damage!`,
                    );
                    await make_angry_shk(shkp, ox, oy);
                }
            }
            if (chestgone) return true;
            break;
        }
        case 20: case 19: case 18: case 17:
            await pline(
                `A cloud of noxious gas billows from ${the(xname(obj))}.`,
            );
            if (rn2(3)) {
                await poisoned('gas cloud', A_STR, 'cloud of poison gas', 15, false);
            } else {
                await create_gas_cloud(obj.ox | 0, obj.oy | 0, 1, 8);
            }
            exercise(A_CON, false);
            break;
        case 16: case 15: case 14: case 13:
            await pline(
                `You feel a needle prick your ${body_part(bodypart)}.`,
            );
            await poisoned('needle', A_CON, 'poisoned needle', 10, false);
            exercise(A_CON, false);
            break;
        case 12: case 11: case 10: case 9:
            await dofiretrap(obj);
            break;
        case 8: case 7: case 6: {
            let dmg = d(4, 4);
            const orig_dmg = dmg;
            await pline('You are jolted by a surge of electricity!');
            const Shock_resistance = !!(u.Shock_resistance
                || u.HShock_resistance || u.EShock_resistance);
            if (Shock_resistance) {
                // shieldeff deferred
                await pline("You don't seem to be affected.");
                monstseesu(M_SEEN_ELEC);
                dmg = 0;
            } else {
                monstunseesu(M_SEEN_ELEC);
            }
            {
                const { destroy_items } = await import('./zap.js');
                await destroy_items(
                    game.youmonst || { _youmonst: true }, AD_ELEC, orig_dmg,
                );
            }
            if (dmg) losehp(dmg, 'electric shock', KILLED_BY_AN);
            break;
        }
        case 5: case 4: case 3: {
            const Free_action = !!(u.Free_action || u.HFree_action
                || u.EFree_action);
            if (!Free_action) {
                await pline('Suddenly you are frozen in place!');
                nomul(-d(5, 6));
                game.multi_reason = 'frozen by a trap';
                exercise(A_DEX, false);
                game.nomovemsg = 'You can move again.';
            } else {
                await pline('You momentarily stiffen.');
            }
            break;
        }
        case 2: case 1: case 0: {
            // C trap.c:6474–6476 Blind ? ROLL_FROM(blindgas) : rndcolor()
            const gas = Blind()
                ? BLINDGAS[rn2(BLINDGAS.length)]
                : rndcolor();
            await pline(
                `A cloud of ${gas} gas billows from ${the(xname(obj))}.`,
            );
            const Stunned = !!(u.HStun || u.Stunned);
            if (!Stunned) {
                if (Hallucination()) {
                    await pline('What a groovy feeling!');
                } else {
                    const Halluc_resistance = !!(u.Halluc_resistance
                        || u.HHalluc_resistance || u.EHalluc_resistance);
                    await pline(
                        `You stagger${Halluc_resistance ? ''
                            : Blind() ? ' and get dizzy'
                                : ' and your vision blurs'}...`,
                    );
                }
            }
            await make_stunned(
                ((u.HStun | 0) & TIMEOUT) + rn1(7, 16), false,
            );
            await make_hallucinated(
                ((u.HHallucination | 0) & TIMEOUT) + rn1(5, 16), false, 0,
            );
            break;
        }
        default:
            break;
        }
        if (game.flags) game.flags.botl = true;
    }

    obj.tknown = 1;
    return false;
}
