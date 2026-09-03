// dokick.js — #kick command + object fall-through (impact_drop / ship_object).
// C ref: dokick.c — dokick, kick_dumb, kick_door, kick_nondoor, maybe_kick_monster,
// kick_monster, kickdmg (partial; poly AT_KICK D-1310; special_dmgval D-1332;
// maybe_mnexto evade D-1336; abuse_dog/monflee D-1349;
// martial knockback D-1350);
// dokick wake_nearby(FALSE) D-1358;
// dokick u_wipe_engr(2) D-1360);
// dokick no_kick poly/steed/lizard/uinwater/utrap/boulder D-1362;
// down_gate / drop_to / impact_drop (D-0961);
// ship_object / otransit_msg (D-0984); obj_delivery (D-1177);
// deliver_obj_to_mon (D-1193);
// kick_nondoor SDOOR/furniture (D-0985);
// throne fall_through + tree scatter/swarm (D-0986);
// kick_object + bhit KICKED_WEAPON (D-0988);
// kick_object/instapetrify killer_xname (D-1335);
// kickstr (D-1343);
// kick_ouch drawbridge find_drawbridge remap (D-1361);
// kick_ouch/kick_dumb airlevel/Levitation hurtle (D-1370);
// Is_box container_impact/lock/lid/chest_trap + ghitm (D-0989);
// ghitm hidden_gold(TRUE) kick (D-1751; vault.c helper, not a dokick clone).

import { game } from './gstate.js';
import { rn2, rnd, rnl, rn1 } from './rng.js';
import {
    acurr, acurrstr, A_DEX, A_STR, A_CON, A_WIS, A_CHA, exercise, Fumbling,
    change_luck, adjalign,
} from './attrib.js';
import {
    pline, newsym, canspotmon, canseemon, map_invisible, unmap_invisible,
    flush_topl_more, verbalize, feel_newsym, feel_location, Norep,
} from './display.js';
import { vision_recalc, recalc_block_point, couldsee, cansee } from './vision.js';
import { getdir, breakchestlock } from './lock.js';
import { yn_function } from './getline.js';
import { kick_steed } from './steed.js';
import { near_capacity, inv_weight, weight_cap, currency } from './invent.js';
import {
    objects_at, obj_extract_self, add_to_migration, mksobj_at, mksobj, mkgold,
    weight, rnd_class, place_object, stackobj, splitobj, delobj,
} from './mkobj.js';
import {
    mon_at, attack_checks, passive, killed, check_caitiff,
    damageum, find_roll_to_hit, missum, mon_maybe_unparalyze,
    attacktype_fordmg,
} from './uhitm.js';
import { AT_KICK } from './mhitm.js';
import {
    overexertion, losehp, maybe_half_phys, in_rooms, in_town, is_pool,
    impact_disturbs_zombies,
} from './hack.js';
import {
    set_wounded_legs, legs_in_no_shape, b_trapped, t_at, water_damage,
    fall_through, chest_trap, instapetrify, activate_statue_trap,
    mintrap, Trap_Killed_Mon, NO_TRAP_FLAGS,
} from './trap.js';
import {
    setmangry, seemimic, angry_guards, wakeup, wake_nearto, wake_nearby,
    maybe_mnexto,
} from './mon.js';
import { abuse_dog } from './dog.js';
import { monflee, set_apparxy } from './monmove.js';
import { m_in_out_region } from './region.js';
import { mon_nam, Monnam, christen_orc, free_oname } from './do_name.js';
import { martial_bonus, use_skill, special_dmgval } from './weapon.js';
import {
    verysmall, bigmonst, thick_skinned, nohands, haseyes, nolimbs, slithy,
    is_flyer, is_floater, can_teleport, is_watch, mons,
    likes_gold, is_mercenary, touch_petrifies, poly_when_stoned,
    M2_UNDEAD, M2_WERE, M2_HUMAN, M2_ELF, M2_DWARF, M2_GNOME, M2_ORC,
    M2_DEMON, M2_GIANT,
} from './monsters.js';
import { objectNames, COIN_CLASS, GEM_CLASS } from './objects.js';
import { monsterNames } from './generated/monsters_data.js';
import { stairway_at, stairway_find_from } from './mklev.js';
import { ok_to_quest } from './quest.js';
import {
    xname, The, cxname, An, doname, singular, distant_name, the, makeplural,
    killer_xname, is_plural, otense,
} from './objnam.js';
import { setuwep, setuqwep, setuswapwep } from './wield.js';
import {
    COLNO, ROWNO,
    SDOOR, SCORR, STAIRS, LADDER, IRONBARS, LAVAWALL, CORR, ROOM, ICE,
    D_ISOPEN, D_BROKEN, D_NODOOR, D_CLOSED, D_LOCKED, D_TRAPPED, D_WARNED,
    LA_DOWN,
    SLT_ENCUMBER,
    IS_DOOR, IS_STWALL, IS_POOL, IS_THRONE, IS_FOUNTAIN, IS_SINK, IS_GRAVE,
    IS_TREE, IS_ALTAR, IS_OBSTRUCTED, IS_DRAWBRIDGE, IS_ROOM, Is_earthlevel,
    KILLED_BY, Upolyd, M_AP_TYPE, M_AP_MONSTER, P_NONE,
    NATTK, M_ATTK_MISS, M_ATTK_DEF_DIED, W_ARMF,
    P_MARTIAL_ARTS, MON_FLOOR, MON_OFFMAP,
    RIGHT_SIDE, TIMEOUT, FOOT, LEG, SHOPBASE, SHOP_DOOR_COST,
    TT_PIT, TT_WEB, TT_BEARTRAP,
    MIGR_NOWHERE, MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_LADDER_UP, MIGR_SSTAIRS,
    MIGR_WITH_HERO, MIGR_NOBREAK, MIGR_NOSCATTER, MIGR_TO_SPECIES,
    DF_RANDOM, DF_ALL, In_mines, NON_PM, has_oname, has_mgivenname,
    ONAME,
    IS_SOFT, TRAPDOOR, is_hole, is_pit, Is_stronghold, Is_botlevel,
    In_endgame, Is_airlevel, Is_waterlevel, ZAP_POS, Is_box, Is_container,
    ESHK, Has_contents, ismnum, ER_NOTHING, A_LAWFUL,
    S_LPUDDING, S_LDWASHER, G_GONE, MM_NOMSG, MM_MALE, MM_FEMALE, MM_ANGRY,
    T_LOOTED, TREE_LOOTED, TREE_SWARM, MAY_HIT, VIS_EFFECTS, WEB,
    STATUE_TRAP,
    OBJ_MIGRATING, OBJ_MINVENT, OBJ_FREE, KICKED_WEAPON,
} from './const.js';
import {
    costly_spot, shop_keeper, stolen_value, picked_container, hot_pursuit,
    is_unpaid, find_objowner, costly_adjacent, addtobill, subfrombill,
    make_angry_shk, make_happy_shk, costly_gold, donate_gold, contained_gold,
} from './shk.js';
import { shkname, Shknam } from './shknam.js';
import { cvt_sdoor_to_door } from './detect.js';
import { find_drawbridge, is_drawbridge_wall } from './dbridge.js';
import { altar_wrath } from './pray.js';
import { del_engr_at, disturb_grave, u_wipe_engr } from './engrave.js';
import { sink_backs_up, mhis } from './fountain.js';
import { hidden_gold } from './vault.js';
import { miss } from './mthrowu.js';
import { SetVoice } from './sndprocs.js';
import { makemon, mpickobj, add_to_minv } from './makemon.js';
import { scatter } from './explode.js';
import { enexto, rloco, noteleport_level, goodpos } from './teleport.js';
import { is_art } from './artifact.js';
import { ART_MJOLLNIR } from './generated/artifacts_data.js';
import { hero_breaks, thitmonst, breaks, breaktest, hurtle } from './dothrow.js';
import { finish_meating, obj_resists } from './dogmove.js';
import { polymon, body_part } from './polyself.js';
const BOULDER = objectNames.indexOf('BOULDER');
const ROCK = objectNames.indexOf('ROCK');
const CORPSE = objectNames.indexOf('CORPSE');
const MIRROR = objectNames.indexOf('MIRROR');
const EGG = objectNames.indexOf('EGG');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const DILITHIUM_CRYSTAL = objectNames.indexOf('DILITHIUM_CRYSTAL');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const PM_SOLDIER = monsterNames.indexOf('PM_SOLDIER');
const PM_SERGEANT = monsterNames.indexOf('PM_SERGEANT');
const PM_LIEUTENANT = monsterNames.indexOf('PM_LIEUTENANT');
const PM_CAPTAIN = monsterNames.indexOf('PM_CAPTAIN');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const GLASS = 19; // C materials.h
/** C ref: obj.h Is_mbag */
function Is_mbag(obj) {
    const t = obj?.otyp | 0;
    return t === BAG_OF_HOLDING || t === BAG_OF_TRICKS;
}
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');

const PM_SASQUATCH = monsterNames.indexOf('PM_SASQUATCH');
const PM_SHADE = monsterNames.indexOf('PM_SHADE');
const PM_BLACK_PUDDING = monsterNames.indexOf('PM_BLACK_PUDDING');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_ARCHEOLOGIST = monsterNames.indexOf('PM_ARCHEOLOGIST');
const PM_SAMURAI = monsterNames.indexOf('PM_SAMURAI');
const PM_KILLER_BEE = monsterNames.indexOf('PM_KILLER_BEE');
const KICKING_BOOTS = objectNames.indexOf('KICKING_BOOTS');
const kick_passes_thru = 'kick passes harmlessly through';
const something = 'something';
const Something = 'Something';

const TREEFRUITS = [
    objectNames.indexOf('APPLE'),
    objectNames.indexOf('ORANGE'),
    objectNames.indexOf('PEAR'),
    objectNames.indexOf('BANANA'),
    objectNames.indexOf('EUCALYPTUS_LEAF'),
].filter((i) => i >= 0);

/** C you.h Luck — u.uluck + u.moreluck */
function Luck() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

/** C dungeon.c dunlev / dunlevs_in_dungeon */
function dunlev(lev) {
    return lev?.dlevel ?? 1;
}
function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 1;
}

/** C mkobj.c rnd_treefruit_at */
function rnd_treefruit_at(x, y) {
    if (!TREEFRUITS.length) return null;
    return mksobj_at(TREEFRUITS[rn2(TREEFRUITS.length)], x, y, true, false);
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

/**
 * C youprop.h Levitation — (HLevitation || ELevitation) && !BLevitation.
 * Sticky u.Levitation is not a C field (D-1070).
 */
function Levitation() {
    const u = game.u || {};
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

/** C hacklib.c sgn */
function sgn(n) {
    return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/** C ref: polyself.c poly_gender — 0/1 ≡ flags.female; neuter→2 deferred. */
function poly_gender() {
    return game.flags?.female ? 1 : 0;
}

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

/** C ref: dbridge.c is_ice — ICE typ only (drawbridge-under deferred). */
function is_ice(x, y) {
    return isok(x, y) && (game.level?.at?.(x, y)?.typ | 0) === ICE;
}

/** C youprop.h Passes_walls. */
function Passes_walls() {
    const u = game.u || {};
    return !!(u.Passes_walls || u.HPasses_walls || u.EPasses_walls);
}

/** C hack.c / mkobj.c sobj_at — first floor object of otyp at x,y. */
function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/** C ref: hack.c closed_door. */
function closed_door(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    const dm = loc.doormask | 0;
    return !!(dm & (D_LOCKED | D_CLOSED));
}

/** C ref: dungeon.c surface — kick slide wording. */
function surface(x, y) {
    if (is_ice(x, y)) return 'ice';
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_FOUNTAIN(typ)) return 'fountain';
    if (IS_ALTAR(typ)) return 'altar';
    if (IS_ROOM(typ) && !Is_earthlevel(game.u?.uz)) return 'floor';
    return 'ground';
}

/** C ref: objnam.c Doname2 — doname with leading capital. */
function Doname2(obj) {
    const s = doname(obj) || 'it';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * C ref: dokick.c martial() macro — martial_bonus / Sasquatch / kicking boots.
 */
function martial() {
    const ym = game.youmonst?.data;
    const uarmf = game.u?.uarmf;
    return martial_bonus()
        || (ym && (ym.mndx ?? -1) === PM_SASQUATCH)
        || !!(uarmf && (uarmf.otyp | 0) === KICKING_BOOTS);
}

/**
 * C ref: dokick.c kick_dumb — empty space / open doorway.
 * RNG: exercise(A_DEX, FALSE) always; low-DEX strain path adds rn2(3),
 * exercise(A_STR, FALSE), and set_wounded_legs(RIGHT_SIDE, 5+rnd(5)).
 * Air/Lev recoil: (Is_airlevel || Levitation) && rn2(2) then
 * hurtle(-dx,-dy,1,TRUE) (D-1370).
 */
async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || acurr(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
        if (Blind()) feel_location(x, y);
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        // C: set_wounded_legs(RIGHT_SIDE, 5 + rnd(5)) — ATEMP(DEX)-- (D-0785)
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    /* C dokick.c:876–877 — short-circuit: airlevel first, then
     * Levitation macro, then rn2(2); range 1 (light). */
    if ((Is_airlevel(game.u?.uz) || Levitation()) && rn2(2)) {
        const u = game.u || {};
        await hurtle(-(u.dx || 0), -(u.dy || 0), 1, true);
    }
}

/**
 * C ref: dokick.c kickstr `:794–830` — cause of death if kicking kills
 * the kicker. Prefix `"kicking "` onto kickobjnam, else terrain from
 * gm.maploc (nowhere sentinel → `"nothing"`). Caller kick_ouch `:903`.
 * Drawbridge walls: kick_ouch remaps maploc via find_drawbridge first
 * (D-1361) so this reports `"a drawbridge"` not IS_STWALL `"a wall"`.
 */
export function kickstr(kickobjnam) {
    let what;
    if (kickobjnam) {
        what = kickobjnam;
    } else if (!game.maploc) {
        // C: gm.maploc == &gn.nowhere (dokick !isok)
        what = 'nothing';
    } else {
        const typ = game.maploc.typ | 0;
        if (IS_DOOR(typ)) what = 'a door';
        else if (IS_TREE(typ)) what = 'a tree';
        else if (IS_STWALL(typ)) what = 'a wall';
        else if (IS_OBSTRUCTED(typ)) what = 'a rock';
        else if (IS_THRONE(typ)) what = 'a throne';
        else if (IS_FOUNTAIN(typ)) what = 'a fountain';
        else if (IS_GRAVE(typ)) what = 'a headstone';
        else if (IS_SINK(typ)) what = 'a sink';
        else if (IS_ALTAR(typ)) what = 'an altar';
        else if (IS_DRAWBRIDGE(typ)) what = 'a drawbridge';
        else if (typ === STAIRS) what = 'the stairs';
        else if (typ === LADDER) what = 'a ladder';
        else if (typ === IRONBARS) what = 'an iron bar';
        else what = 'something weird';
    }
    return `kicking ${what}`;
}

/**
 * C ref: dokick.c kick_ouch — solid terrain / failed impact (partial).
 * wake_nearto wired; drawbridge wall remap D-1361; air/Lev hurtle D-1370.
 * losehp applies the damage roll (regen_hp needs uhp < uhpmax).
 * set_wounded_legs on !rn2(3) → ATEMP(DEX)-- (D-0785).
 * killer string via kickstr (D-1343) after maploc remap.
 */
export async function kick_ouch(x, y, kickobjnam = '') {
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (isok(x, y)) {
        if (Blind()) feel_location(x, y); /* we know we hit it */
        /* C dokick.c:892–897 — portcullis: pline_The + find_drawbridge
         * remaps gm.maploc (and x,y for wake_nearto) to the span. */
        if (is_drawbridge_wall(x, y) >= 0) {
            await pline('The drawbridge is unaffected.');
            const xy = { x, y };
            find_drawbridge(xy);
            x = xy.x;
            y = xy.y;
            game.maploc = game.level?.at(x, y) || null;
        }
        await wake_nearto(x, y, 5 * 5);
    }
    if (!rn2(3)) {
        // C: set_wounded_legs(RIGHT_SIDE, 5 + rnd(5))
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    // C: dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    //     losehp(Maybe_Half_Phys(dmg), kickstr(buf, kickobjnam), KILLED_BY);
    const dmg = rnd(acurr(A_CON) > 15 ? 3 : 5);
    await losehp(maybe_half_phys(dmg), kickstr(kickobjnam), KILLED_BY);
    /* C dokick.c:903–905 — losehp is noreturn on death. Else
     * if (Is_airlevel || Levitation) hurtle(-dx,-dy,rn1(2,4),TRUE).
     * rn1 is an argument so it burns only when the if is true. */
    if (game._losehp_needs_done || game.program_state?.gameover) return;
    if (Is_airlevel(game.u?.uz) || Levitation()) {
        const u = game.u || {};
        await hurtle(-(u.dx || 0), -(u.dy || 0), rn1(2, 4), true);
    }
}

/**
 * C ref: mon.c get_iter_mons — first living on-map mon where bfunc is true.
 */
async function get_iter_mons(bfunc) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if ((mtmp.mx | 0) <= 0) continue;
        if (await bfunc(mtmp)) return mtmp;
    }
    return null;
}

/**
 * C ref: mon.c get_iter_mons_xy — first living mon where bfunc(mtmp,x,y).
 */
async function get_iter_mons_xy(bfunc, x, y) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if ((mtmp.mx | 0) <= 0) continue;
        if (await bfunc(mtmp, x, y)) return mtmp;
    }
    return null;
}

/**
 * C ref: dokick.c watchman_thief_arrest — peaceful watch who can see hero
 * yells and angry_guards. mon_yells is D-1248 (SetVoice empty without
 * SND_LIB_INTEGRATED). Dynamic import: dokick←makemon←monmove cycle.
 */
async function watchman_thief_arrest(mtmp) {
    if (is_watch(mtmp?.data) && couldsee(mtmp.mx, mtmp.my) && mtmp.mpeaceful) {
        const { mon_yells } = await import('./monmove.js');
        await mon_yells(mtmp, "Halt, thief!  You're under arrest!");
        await angry_guards(false);
        return true;
    }
    return false;
}

/**
 * C ref: dokick.c watchman_door_damage — warn once (D_WARNED) then arrest.
 * mon_yells is D-1248. Dynamic import: dokick←makemon←monmove cycle.
 */
async function watchman_door_damage(mtmp, x, y) {
    if (!(is_watch(mtmp?.data) && mtmp.mpeaceful
        && couldsee(mtmp.mx, mtmp.my))) {
        return false;
    }
    const loc = game.level?.at(x, y);
    const { mon_yells } = await import('./monmove.js');
    if ((loc?.looted | 0) & D_WARNED) {
        await mon_yells(mtmp, "Halt, vandal!  You're under arrest!");
        await angry_guards(false);
    } else {
        await mon_yells(mtmp, 'Hey, stop damaging that door!');
        if (loc) loc.looted = (loc.looted | 0) | D_WARNED;
    }
    return true;
}

/**
 * C ref: dokick.c kick_door — open/broken/nodoor → kick_dumb; else
 * CLOSED/LOCKED bust attempt (exercise DEX, rnl(35) vs avrg_attrib).
 * Shop in_rooms + add_damage/pay_for_damage + town watch wired (D-0947).
 * Blind feel_location / feel_newsym wired (D-0997).
 * Named omit: giant doorbuster poly completeness. mon_yells is D-1248.
 */
async function kick_door(x, y, avrg_attrib) {
    const loc = game.level?.at(x, y);
    if (!loc) {
        await kick_dumb(x, y);
        return;
    }
    const mask = loc.doormask ?? D_NODOOR;
    if (mask === D_ISOPEN || mask === D_BROKEN || mask === D_NODOOR) {
        await kick_dumb(x, y);
        return;
    }

    // C: not enough leverage while levitating
    if (game.u?.Levitation) {
        await kick_ouch(x, y);
        return;
    }

    exercise(A_DEX, true);
    // C: doorbuster = Upolyd && is_giant(youmonst.data) — giant poly deferred
    const doorbuster = Upolyd(game.u) && !!game.youmonst?.data?.is_giant;
    // C: rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX))
    const chance = avrg_attrib + (!martial() ? 0 : acurr(A_DEX));
    if (doorbuster || rnl(35) < chance) {
        // C: shopdoor = *in_rooms(x, y, SHOPBASE)
        const shopdoor = !!in_rooms(x, y, SHOPBASE);
        if (mask & D_TRAPPED) {
            if (game.flags?.verbose !== false) {
                await pline('You kick the door.');
            }
            exercise(A_STR, false);
            loc.doormask = D_NODOOR;
            if (loc.flags !== undefined) loc.flags = loc.doormask;
            await b_trapped('door', FOOT);
            feel_newsym(x, y); /* we know we broke it */
            recalc_block_point(x, y);
            vision_recalc(1);
        } else if (acurr(A_STR) > 18 && !rn2(5) && !shopdoor) {
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            loc.doormask = D_NODOOR;
            if (loc.flags !== undefined) loc.flags = loc.doormask;
            feel_newsym(x, y);
            recalc_block_point(x, y);
            vision_recalc(1);
        } else {
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true);
            loc.doormask = D_BROKEN;
            if (loc.flags !== undefined) loc.flags = loc.doormask;
            feel_newsym(x, y);
            recalc_block_point(x, y);
            vision_recalc(1);
        }
        if (shopdoor) {
            const { add_damage, pay_for_damage } = await import('./shk.js');
            add_damage(x, y, SHOP_DOOR_COST);
            await pay_for_damage('break', false);
        }
        if (in_town(x, y)) await get_iter_mons(watchman_thief_arrest);
    } else {
        if (Blind()) feel_location(x, y); /* we know we hit it */
        exercise(A_STR, true);
        // C: (Deaf || !rn2(3)) ? "Thwack" : "Whammm"
        const thud = (game.u?.Deaf || !rn2(3)) ? 'Thwack' : 'Whammm';
        await pline(`${thud}!!`);
        if (in_town(x, y)) {
            await get_iter_mons_xy(watchman_door_damage, x, y);
        }
    }
}

/**
 * C ref: dokick.c kick_nondoor — secret door/passage + furniture + walls.
 * Branch envelope (D-0985/D-0986): SDOOR/SCORR open rolls; throne destroy/
 * loot/fall_through; tree fruit scatter + bee swarm; altar_wrath; fountain
 * water_damage; grave disturb/break; IRONBARS ouch; sink pudding/washer/
 * sink_backs_up; stairs/ladder/stwall.
 */
async function kick_nondoor(x, y, avrg_attrib) {
    const loc = game.level?.at(x, y);
    if (!loc) {
        await kick_dumb(x, y);
        return true;
    }
    const typ = loc.typ;
    const u = game.u || {};
    const Levitation = !!(u.Levitation);

    if (typ === SDOOR) {
        if (!Levitation && rn2(30) < avrg_attrib) {
            cvt_sdoor_to_door(loc); /* ->typ = DOOR */
            const mask = loc.doormask | 0;
            const uncover = ((mask & (D_LOCKED | D_TRAPPED)) === D_LOCKED);
            await pline(
                `Crash!  ${uncover ? 'Your kick uncovers' : 'You kick open'} a secret door!`,
            );
            exercise(A_DEX, true);
            if (mask & D_TRAPPED) {
                loc.doormask = D_NODOOR;
                await b_trapped('door', FOOT);
            } else if (loc.doormask !== D_NODOOR && !(loc.doormask & D_LOCKED)) {
                loc.doormask = D_ISOPEN;
            }
            feel_newsym(x, y);
            if (loc.doormask === D_ISOPEN || loc.doormask === D_NODOOR) {
                recalc_block_point(x, y); /* C unblock_point */
            }
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    if (typ === SCORR) {
        if (!Levitation && rn2(30) < avrg_attrib) {
            await pline('Crash!  You kick open a secret passage!');
            exercise(A_DEX, true);
            loc.typ = CORR;
            feel_newsym(x, y);
            recalc_block_point(x, y);
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    if (IS_THRONE(typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
            return true;
        }
        if ((Luck() < 0 || loc.looted) && !rn2(3)) {
            loc.looted = 0;
            loc.typ = ROOM;
            mkgold(rnd(200), x, y);
            if (Blind()) {
                await pline('CRASH!  You destroy it.');
            } else {
                await pline('CRASH!  You destroy the throne.');
                newsym(x, y);
            }
            exercise(A_DEX, true);
            return true;
        }
        if (Luck() > 0 && !rn2(3) && !loc.looted) {
            mkgold(rn1(201, 300), x, y);
            let i = Luck() + 1;
            if (i > 6) i = 6;
            while (i--) {
                mksobj_at(
                    rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
                    x, y, false, true,
                );
            }
            if (Blind()) {
                await pline(`You kick ${something} loose!`);
            } else {
                await pline('You kick loose some ornamental coins and gems!');
                newsym(x, y);
            }
            loc.looted = T_LOOTED;
            return true;
        }
        if (!rn2(4)) {
            if (dunlev(u.uz) < dunlevs_in_dungeon(u.uz)) {
                await fall_through(false, 0);
                return true;
            }
            await kick_ouch(x, y);
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    if (IS_ALTAR(typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
            return true;
        }
        await pline(`You kick ${Blind() ? something : 'the altar'}.`);
        await altar_wrath(x, y);
        if (!rn2(3)) {
            await kick_ouch(x, y);
            return true;
        }
        exercise(A_DEX, true);
        return true;
    }
    if (IS_FOUNTAIN(typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
            return true;
        }
        await pline(`You kick ${Blind() ? something : 'the fountain'}.`);
        if (!rn2(3)) {
            await kick_ouch(x, y);
            return true;
        }
        if (u.uarmf && rn2(3)) {
            if ((await water_damage(u.uarmf, 'metal boots', true)) === ER_NOTHING) {
                await pline('Your boots get wet.');
            }
        }
        exercise(A_DEX, true);
        return true;
    }
    if (IS_GRAVE(typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
        } else if (rn2(4)) {
            await kick_ouch(x, y);
        } else if (!loc.horizontal && !rn2(2)) {
            await disturb_grave(x, y);
        } else {
            exercise(A_WIS, false);
            const alignType = u.ualign?.type | 0;
            if (Role_if(PM_ARCHEOLOGIST) || Role_if(PM_SAMURAI)
                || (alignType === A_LAWFUL && (u.ualign?.record | 0) > -10)) {
                adjalign(-sgn(alignType));
            }
            loc.typ = ROOM;
            loc.flags = 0; // clear emptygrave
            loc.horizontal = 0; // clear disturbed
            mksobj_at(ROCK, x, y, true, false);
            del_engr_at(x, y);
            if (Blind()) {
                await pline(`Crack!  ${Something} broke!`);
            } else {
                await pline('The headstone topples over and breaks!');
                newsym(x, y);
            }
        }
        return true;
    }
    if (typ === IRONBARS) {
        await kick_ouch(x, y);
        return true;
    }
    if (IS_TREE(typ)) {
        // nothing, fruit or trouble? 75:23.5:1.5%
        if (rn2(3)) {
            if (!rn2(6)
                && !((game.mvitals?.[PM_KILLER_BEE]?.mvflags ?? 0) & G_GONE)) {
                await You_hear('a low buzzing.');
            }
            await kick_ouch(x, y);
            return true;
        }
        let treefruit = null;
        if (rn2(15) && !((loc.looted | 0) & TREE_LOOTED)
            && (treefruit = rnd_treefruit_at(x, y))) {
            const nfruit = 8 - rnl(7);
            const frtype = treefruit.otyp;
            treefruit.quan = nfruit;
            treefruit.owt = weight(treefruit);
            if (is_plural(treefruit)) {
                await pline(`Some ${xname(treefruit)} fall from the tree!`);
            } else {
                await pline(`${An(xname(treefruit))} falls from the tree!`);
            }
            const nfall = await scatter(x, y, 2, MAY_HIT, treefruit);
            if (nfall !== nfruit) {
                // leftover caught in branches — message only (dealloc)
                const leftover = mksobj(frtype, true, false);
                if (leftover) {
                    leftover.quan = nfruit - nfall;
                    await pline(
                        `${nfruit - nfall} ${xname(leftover)} got caught in the branches.`,
                    );
                }
            }
            exercise(A_DEX, true);
            exercise(A_WIS, true);
            newsym(x, y);
            loc.looted = (loc.looted | 0) | TREE_LOOTED;
            return true;
        }
        if (!((loc.looted | 0) & TREE_SWARM)) {
            let cnt = rnl(4) + 2;
            let made = 0;
            const mm = { x, y };
            while (cnt--) {
                if (PM_KILLER_BEE >= 0
                    && enexto(mm, mm.x, mm.y, mons(PM_KILLER_BEE))
                    && makemon(
                        mons(PM_KILLER_BEE), mm.x, mm.y, MM_ANGRY | MM_NOMSG,
                    )) {
                    made++;
                }
            }
            if (made) {
                await pline("You've attracted the tree's former occupants!");
            } else {
                await pline('You smell stale honey.');
            }
            loc.looted = (loc.looted | 0) | TREE_SWARM;
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    if (IS_SINK(typ)) {
        const gend = poly_gender();
        if (Levitation) {
            await kick_dumb(x, y);
            return true;
        }
        if (rn2(5)) {
            const Deaf = !!(u.Deaf || u.HDeaf || u.EDeaf || u.uroleplay?.deaf);
            if (!Deaf) await pline('Klunk!  The pipes vibrate noisily.');
            else await pline('Klunk!');
            exercise(A_DEX, true);
            return true;
        }
        if (!((loc.looted | 0) & S_LPUDDING) && !rn2(3)
            && !((game.mvitals?.[PM_BLACK_PUDDING]?.mvflags ?? 0) & G_GONE)) {
            if (Blind()) {
                if (!(u.Deaf || u.HDeaf)) await pline('You hear a gushing sound.');
            } else {
                await pline('A black ooze gushes up from the drain!');
            }
            if (PM_BLACK_PUDDING >= 0) {
                makemon(mons(PM_BLACK_PUDDING), x, y, MM_NOMSG);
            }
            exercise(A_DEX, true);
            newsym(x, y);
            loc.looted = (loc.looted | 0) | S_LPUDDING;
            return true;
        }
        if (!((loc.looted | 0) & S_LDWASHER) && !rn2(3)
            && !((game.mvitals?.[PM_AMOROUS_DEMON]?.mvflags ?? 0) & G_GONE)) {
            await pline(
                `${Blind() ? Something : 'The dish washer'} returns!`,
            );
            if (PM_AMOROUS_DEMON >= 0) {
                const sex = (gend === 1 || (gend === 2 && rn2(2)))
                    ? MM_MALE : MM_FEMALE;
                if (makemon(mons(PM_AMOROUS_DEMON), x, y, MM_NOMSG | sex)) {
                    newsym(x, y);
                }
            }
            loc.looted = (loc.looted | 0) | S_LDWASHER;
            exercise(A_DEX, true);
            return true;
        }
        if (!rn2(3)) {
            await sink_backs_up(x, y);
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    if (typ === STAIRS || typ === LADDER || IS_STWALL(typ)) {
        if (!IS_STWALL(typ) && loc.ladder === LA_DOWN) {
            await kick_dumb(x, y);
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    await kick_dumb(x, y);
    return true;
}

/**
 * C ref: dokick.c maybe_kick_monster — forcefight for hostile/unseen,
 * then attack_checks || overexertion may abort.
 */
async function maybe_kick_monster(mon, x, y) {
    if (!mon) return false;
    const ctx = game.context || (game.context = {});
    const save_forcefight = !!ctx.forcefight;
    if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
    game.bhitpos.x = x;
    game.bhitpos.y = y;
    if (!mon.mpeaceful || !canspotmon(mon)) {
        ctx.forcefight = true; /* attack even if invisible */
    }
    let keep = mon;
    if ((await attack_checks(mon)) || (await overexertion())) {
        keep = null; /* don't kick after all */
    }
    ctx.forcefight = save_forcefight;
    return keep != null;
}

/**
 * C ref: dokick.c kickdmg — non-poly kick damage + passive.
 * special_dmgval(W_ARMF) D-1332 (`:56` before shade return, `:90` add).
 * abuse_dog / monflee D-1349 (`:70–76` after caitiff, before rnd(dmg)).
 * martial knockback D-1350 (`:96–113` after HP subtract, before passive).
 */
async function kickdmg(mon, clumsy) {
    let dmg = Math.trunc((acurrstr() + acurr(A_DEX) + acurr(A_CON)) / 15);
    let kick_skill = P_NONE;
    let trapkilled = false;
    const u = game.u || {};
    const uarmf = u.uarmf;

    if (uarmf && (uarmf.otyp | 0) === KICKING_BOOTS) dmg += 5;
    if (clumsy) dmg = Math.trunc(dmg / 2);
    if (thick_skinned(mon.data)) dmg = 0;
    if ((mon.data?.mndx ?? -1) === PM_SHADE) dmg = 0;

    /* C dokick.c `:56` — blessed (or hypothetically silver) boots */
    const specialdmg = special_dmgval(game.youmonst, mon, W_ARMF, null);
    if ((mon.data?.mndx ?? -1) === PM_SHADE && !specialdmg) {
        await pline(`The ${kick_passes_thru}.`);
        return;
    }

    if (M_AP_TYPE(mon)) seemimic(mon);
    // C: check_caitiff(mon) before tame abuse
    check_caitiff(mon);

    /* C dokick.c `:70–76` — squeeze some guilt feelings… */
    if (mon.mtame) {
        await abuse_dog(mon);
        if (mon.mtame) {
            await monflee(mon, (dmg ? rnd(dmg) : 1), false, false);
        } else {
            mon.mflee = 0;
        }
    }

    if (dmg > 0) {
        dmg = rnd(dmg);
        if (martial()) {
            if (dmg > 1) kick_skill = P_MARTIAL_ARTS;
            dmg += rn2(Math.trunc(acurr(A_DEX) / 2) + 1);
        }
        exercise(A_DEX, true);
    }
    dmg += specialdmg;
    if (uarmf) dmg += uarmf.spe | 0;
    dmg += u.udaminc | 0;
    if (dmg > 0) mon.mhp = (mon.mhp | 0) - dmg;

    /* C dokick.c `:96–113` — martial knockback (not mhurtle; C TODO).
     * Short-circuit: alive, martial, !bigmonst, then !rn2(3), then
     * mcanmove / !ustuck / !mtrapped. goodpos gpflags=0. Region
     * check before remove/place. mintrap Trap_Killed_Mon skips killed. */
    if ((mon.mhp | 0) > 0 && martial() && !bigmonst(mon.data) && !rn2(3)
        && mon.mcanmove && mon !== u.ustuck && !mon.mtrapped) {
        const mdx = (mon.mx | 0) + (u.dx | 0);
        const mdy = (mon.my | 0) + (u.dy | 0);
        if (goodpos(mdx, mdy, mon, 0)) {
            await pline(`${Monnam(mon)} reels from the blow.`);
            if (m_in_out_region(mon, mdx, mdy)) {
                /* C rm.h remove_monster — grid clear; mx/my unchanged.
                 * JS occupancy is mx/my; MON_OFFMAP makes m_at skip. */
                mon.mstate = (mon.mstate | 0) | MON_OFFMAP;
                newsym(mon.mx, mon.my);
                /* C steed.c place_monster — mx/my + MON_FLOOR */
                mon.mx = mdx;
                mon.my = mdy;
                mon.mstate = MON_FLOOR;
                newsym(mon.mx, mon.my);
                set_apparxy(mon);
                if ((await mintrap(mon, NO_TRAP_FLAGS)) === Trap_Killed_Mon) {
                    trapkilled = true;
                }
            }
        }
    }

    await passive(mon, uarmf, true, (mon.mhp | 0) > 0, AT_KICK, false);
    if ((mon.mhp | 0) <= 0 && !trapkilled) await killed(mon);
    if (kick_skill !== P_NONE) use_skill(kick_skill, 1);
}

/**
 * C ref: dokick.c kick_monster — anger, encumbrance clumsiness, evade, kickdmg.
 * Poly AT_KICK loop D-1310 (`Upolyd && attacktype(AT_KICK)` then return).
 * maybe_mnexto evade D-1336 (`:267–285` else of block).
 * kickdmg abuse_dog D-1349. martial knockback D-1350.
 * dokick() wake_nearby(FALSE) D-1358 then u_wipe_engr(2) D-1360 run
 * before this (clears msleeping; smudges hero-cell dust).
 */
export async function kick_monster(mon, x, y) {
    let clumsy = false;
    let goto_doit = false;

    setmangry(mon, true);

    const u = game.u || {};
    if (u.Levitation && !rn2(3) && verysmall(mon.data)
        && !is_flyer(mon.data)) {
        await pline('Floating in the air, you miss wildly!');
        exercise(A_DEX, false);
        await passive(mon, u.uarmf, false, 1, AT_KICK, false);
        return;
    }

    /* reveal hidden target even if kick ends up missing (note: being
       hidden doesn't affect chance to hit so neither does this reveal) */
    if (mon.mundetected
        || (M_AP_TYPE(mon) && M_AP_TYPE(mon) !== M_AP_MONSTER)) {
        if (M_AP_TYPE(mon)) seemimic(mon);
        mon.mundetected = 0;
        if (!canspotmon(mon)) map_invisible(x, y);
        else newsym(x, y);
        const who = canspotmon(mon) ? mon_nam(mon) : 'something hidden';
        await pline(`There is ${who} here.`);
    }

    // C dokick.c kick_monster `:183–223` — Upolyd AT_KICK then return
    if (Upolyd(u) && attacktype_fordmg(game.youmonst?.data, AT_KICK, -1)) {
        const attknum = { v: 0 };
        const armorpenalty = { v: 0 };
        const tmp = find_roll_to_hit(mon, AT_KICK, null, attknum, armorpenalty);
        mon_maybe_unparalyze(mon);
        const slots = game.youmonst?.data?.mattk;
        for (let i = 0; i < NATTK; i++) {
            /* first of two kicks might have provoked counterattack
               that has incapacitated the hero (ie, floating eye) */
            if ((game.multi | 0) < 0) break;
            const uattk = slots?.[i];
            if (!uattk || (uattk.aatyp | 0) !== AT_KICK) continue;

            const kickdieroll = rnd(20);
            const specialdmg = special_dmgval(game.youmonst, mon, W_ARMF, null);
            if ((mon.data?.mndx ?? mon.mnum ?? -1) === PM_SHADE && !specialdmg) {
                await pline(`Your ${kick_passes_thru} ${mon_nam(mon)}.`);
                break; /* skip any additional kicks */
            } else if (tmp > kickdieroll) {
                await pline(`You kick ${mon_nam(mon)}.`);
                const sum = await damageum(mon, uattk, specialdmg);
                await passive(mon, u.uarmf, sum !== M_ATTK_MISS,
                    !(sum & M_ATTK_DEF_DIED), AT_KICK, false);
                if (sum & M_ATTK_DEF_DIED) break; /* Defender died */
            } else {
                await missum(mon, uattk, (tmp + armorpenalty.v > kickdieroll));
                await passive(mon, u.uarmf, false, 1, AT_KICK, false);
            }
        }
        return;
    }

    const i = -inv_weight();
    const j = weight_cap();

    if (i < Math.trunc((j * 3) / 10)) {
        if (!rn2((i < Math.trunc(j / 10)) ? 2 : (i < Math.trunc(j / 5)) ? 3 : 4)) {
            if (martial()) {
                goto_doit = true; /* C: goto doit — skip Fumbling/bulky */
            } else {
                await pline('Your clumsy kick does no damage.');
                await passive(mon, u.uarmf, false, 1, AT_KICK, false);
                return;
            }
        } else if (i < Math.trunc(j / 10)) {
            clumsy = true;
        } else if (!rn2((i < Math.trunc(j / 5)) ? 2 : 3)) {
            clumsy = true;
        }
    }

    if (!goto_doit) {
        if (Fumbling()) {
            clumsy = true;
        } else if (u.uarm) {
            const od = game.objects?.[u.uarm.otyp];
            if (od?.oc_big && acurr(A_DEX) < rnd(25)) clumsy = true;
        }
    }

    // doit:
    await pline(`You kick ${mon_nam(mon)}.`);
    const ptr = mon.data;
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !bigmonst(ptr))
        && mon.mcansee && !mon.mtrapped && !thick_skinned(ptr)
        && ptr?.mlet !== 'S_EEL' && haseyes(ptr) && mon.mcanmove
        && !mon.mstun && !mon.mconf && !mon.msleeping
        && (ptr?.mmove | 0) >= 12) {
        if (!nohands(ptr) && !rn2(martial() ? 5 : 3)) {
            await pline(`${Monnam(mon)} blocks your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, u.uarmf, false, 1, AT_KICK, false);
            return;
        } else {
            /* C dokick.c `:267–285` — maybe_mnexto then evade pline+return */
            await maybe_mnexto(mon);
            if (mon.mx !== x || mon.my !== y) {
                unmap_invisible(x, y);
                const how = (can_teleport(ptr) && !noteleport_level(mon))
                    ? 'teleports'
                    : is_floater(ptr)
                        ? 'floats'
                        : is_flyer(ptr)
                            ? 'swoops'
                            : (nolimbs(ptr) || slithy(ptr))
                                ? 'slides'
                                : 'jumps';
                await pline(
                    `${Monnam(mon)} ${how}, ${clumsy ? 'easily' : 'nimbly'} evading your ${clumsy ? 'clumsy ' : ''}kick.`,
                );
                await passive(mon, u.uarmf, false, 1, AT_KICK, false);
                return;
            }
        }
    }
    await kickdmg(mon, clumsy);
}

/**
 * C ref: dokick.c container_impact_dmg — kick/drop/throw shatter contents.
 * Assumes container on floor. x,y is the pre-impact cell (throw origin
 * u.ux,u.uy; dropz hero feet; kick dest). hitfloor dropz(TRUE) is
 * D-1263. Named omit: Soundeffect.
 */
export async function container_impact_dmg(obj, x, y) {
    if (!Is_container(obj) || !Has_contents(obj) || Is_mbag(obj)) return;

    const rooms = in_rooms(x, y, SHOPBASE) || '';
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : 0);
    const costly = !!(shkp && costly_spot(x, y));
    const u = game.u || {};
    const insider = !!(u.ushops && (u.ushops || '')[0]
        && rooms[0] && (u.ushops || '')[0] === rooms[0]);
    const frominv = obj !== game.kickedobj;
    let loss = 0;
    let wchange = false;

    for (let otmp = obj.cobj; otmp; ) {
        const otmp2 = otmp.nobj;
        const oc = game.objects?.[otmp.otyp | 0];
        let result = null;
        if ((oc?.oc_material | 0) === GLASS
            && (otmp.oclass | 0) !== GEM_CLASS
            && !obj_resists(otmp, 33, 100)) {
            result = 'shatter';
        } else if ((otmp.otyp | 0) === EGG && !rn2(3)) {
            result = 'cracking';
        }
        if (result) {
            if ((otmp.otyp | 0) === MIRROR) change_luck(-2);
            if ((otmp.otyp | 0) === EGG && (otmp.spe | 0)
                && ismnum(otmp.corpsenm)) {
                change_luck(-1);
            }
            await You_hear(`a muffled ${result}.`);
            if (costly) {
                if (frominv && !otmp.unpaid) otmp.no_charge = 1;
                loss += await stolen_value(
                    otmp, x, y, !!(shkp?.mpeaceful), true,
                );
            }
            if ((otmp.quan | 0) > 1) {
                otmp.quan = (otmp.quan | 0) - 1;
                otmp.owt = weight(otmp);
            } else {
                obj_extract_self(otmp);
                otmp.quan = 0;
                otmp.where = OBJ_FREE;
                otmp.nobj = null;
                otmp.nexthere = null;
            }
            obj.cknown = 0;
            wchange = true;
        }
        otmp = otmp2;
    }
    if (wchange) obj.owt = weight(obj);
    if (costly && loss) {
        if (!insider) {
            await pline(
                `You caused ${loss} ${currency(loss)} worth of damage!`,
            );
            await make_angry_shk(shkp, x, y);
        } else {
            await pline(
                `You owe ${shkname(shkp)} ${loss} ${currency(loss)} for objects destroyed.`,
            );
        }
    }
}

/**
 * C ref: dokick.c ghitm `:294–407` — gold hits monster; TRUE if caught.
 * hidden_gold(TRUE) at `:361` (vault.c helper; D-1751). Callers
 * really_kick_object `:747` and throw_gold `:2712`.
 * Named omit: remaining vault/priest SetVoice sites outside ghitm.
 */
export async function ghitm(mtmp, gold) {
    let msg_given = false;
    if (!likes_gold(mtmp.data) && !mtmp.isshk && !mtmp.ispriest
        && !mtmp.isgd && !is_mercenary(mtmp.data)) {
        await wakeup(mtmp, true);
    } else if (!mtmp.mcanmove) {
        if (canseemon(mtmp)) {
            // C pline_The("%s harmlessly %s %s.", xname, otense "hit", mon_nam)
            await pline(
                `${The(xname(gold))} harmlessly ${otense(gold, 'hit')} ${
                    mon_nam(mtmp)
                }.`,
            );
            msg_given = true;
        }
    } else {
        const was_sleeping = mtmp.msleeping | 0;
        const oc = game.objects?.[gold.otyp | 0];
        const value = (gold.quan | 0) * (oc?.oc_cost | 0);
        mtmp.msleeping = 0;
        finish_meating(mtmp);
        if (!mtmp.isgd && !rn2(4)) setmangry(mtmp, true);
        if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
            await pline(
                `${Monnam(mtmp)} ${was_sleeping ? 'awakens and ' : ''}catches the gold.`,
            );
        }
        mpickobj(mtmp, gold);
        gold = null; /* C: obj has been freed into minvent */
        if (mtmp.isshk) {
            const eshk = ESHK(mtmp);
            let robbed = eshk?.robbed | 0;
            if (robbed) {
                robbed -= value;
                if (robbed < 0) robbed = 0;
                await pline(
                    `The amount ${!robbed ? '' : 'partially '}covers ${
                        mhis(mtmp)
                    } recent losses.`,
                );
                if (eshk) eshk.robbed = robbed;
                if (!robbed) await make_happy_shk(mtmp, false);
            } else {
                SetVoice(mtmp, 0, 80, 0);
                if (mtmp.mpeaceful) {
                    if (eshk) eshk.credit = (eshk.credit | 0) + value;
                    const credit = eshk?.credit | 0;
                    await pline(
                        `You have ${credit} ${currency(credit)} in credit.`,
                    );
                } else {
                    await verbalize('Thanks, scum!');
                }
            }
        } else if (mtmp.ispriest) {
            SetVoice(mtmp, 0, 80, 0);
            if (mtmp.mpeaceful) {
                await verbalize('Thank you for your contribution.');
            } else {
                await verbalize('Thanks, scum!');
            }
        } else if (mtmp.isgd) {
            const umoney = money_cnt_kick(game.invent);
            // C dokick.c:361 hidden_gold(TRUE) — nested contained_gold
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(
                umoney ? 'Drop the rest and follow me.'
                    : hidden_gold(true)
                        ? 'You still have hidden gold.  Drop it now.'
                        : mtmp.mpeaceful
                            ? "I'll take care of that; please move along."
                            : "I'll take that; now get moving.",
            );
        } else if (is_mercenary(mtmp.data)) {
            const was_angry = !mtmp.mpeaceful;
            let goldreqd = 0;
            const mndx = mtmp.data?.mndx ?? -1;
            if (mndx === PM_SOLDIER) goldreqd = 100;
            else if (mndx === PM_SERGEANT) goldreqd = 250;
            else if (mndx === PM_LIEUTENANT) goldreqd = 500;
            else if (mndx === PM_CAPTAIN) goldreqd = 750;
            if (goldreqd && rn2(3)) {
                const umoney = money_cnt_kick(game.invent);
                goldreqd += Math.trunc(
                    (umoney + ((game.u?.ulevel | 0) * rn2(5)))
                        / (acurr(A_CHA) || 1),
                );
                if (value > goldreqd) mtmp.mpeaceful = true;
            }
            if (!mtmp.mpeaceful) {
                SetVoice(mtmp, 0, 80, 0);
                if (goldreqd) await verbalize("That's not enough, coward!");
                else await verbalize("I don't take bribes from scum like you!");
            } else if (was_angry) {
                SetVoice(mtmp, 0, 80, 0);
                await verbalize('That should do.  Now beat it!');
            } else {
                SetVoice(mtmp, 0, 80, 0);
                // C flags.female (hero), not the monster
                const female = !!game.flags?.female;
                await verbalize(
                    `Thanks for the tip, ${female ? 'lady' : 'buddy'}.`,
                );
            }
        }
        return true;
    }
    if (!msg_given) {
        // C dokick.c:405 miss(xname(gold), mtmp) — zap.c :3570–3576
        await miss(xname(gold), mtmp);
    }
    return false;
}

/** C ref: hack.c money_cnt — first COIN_CLASS quan (JS invent is an Array). */
function money_cnt_kick(invent) {
    let sum = 0;
    for (const otmp of invent || []) {
        if ((otmp?.oclass | 0) === COIN_CLASS) sum += otmp.quan | 0;
    }
    return sum;
}

/**
 * C ref: dokick.c kick_object — top floor object at kick target.
 * Sets kickobjnam for kick_ouch killer text when res==0.
 * @returns {Promise<number>} 0 = no kick effect (caller may ouch); else time
 */
async function kick_object(x, y, kickobjnam) {
    kickobjnam.value = '';
    game.kickedobj = objects_at(x, y);
    let res = 0;
    if (game.kickedobj) {
        // C dokick.c:498 Strcpy(kickobjnam, killer_xname(gk.kickedobj))
        kickobjnam.value = killer_xname(game.kickedobj) || '';
        res = await really_kick_object(x, y);
        game.kickedobj = null;
    }
    return res;
}

/**
 * C ref: dokick.c really_kick_object — guts of object kick.
 * Branch envelope: trap pit/web; STATUE_TRAP activate; Fumbling; barefoot
 * touch_petrifies corpse → polymon / instapetrify; range/martial/pool/ice/
 * grease/Mjollnir/blocker; Norep; obstructed-loose; Is_box impact/lock/lid;
 * hero_breaks; thump; split; slide; bhit KICKED_WEAPON; mon thitmonst/
 * ghitm; shop stolen_value; flooreffects; place+stack.
 * Named omit: dothrow killer_xname callers still named (eat choke D-1344;
 * dozap self-zap D-1345).
 */
async function really_kick_object(x, y) {
    const u = game.u || {};
    let kicked = game.kickedobj;
    if (!kicked || (kicked.otyp | 0) === BOULDER
        || kicked === u.uball || kicked === u.uchain) {
        return 0;
    }

    const trap = t_at(x, y);
    if (trap) {
        if ((is_pit(trap.ttyp) && !Passes_walls()) || (trap.ttyp | 0) === WEB) {
            // find_trap deferred — still refuse kick
            const where = (trap.ttyp | 0) === WEB ? 'web' : 'pit';
            await pline(`You can't kick something that's in a ${where}!`);
            return 1;
        }
        if ((trap.ttyp | 0) === STATUE_TRAP) {
            await activate_statue_trap(trap, x, y, false);
            return 1;
        }
    }

    if (Fumbling() && !rn2(3)) {
        await pline('Your clumsy kick missed.');
        return 1;
    }

    // C: barefoot cockatrice/chickatrice corpse → poly or instapetrify
    {
        const Stone_resistance = !!(u.Stone_resistance || u.HStone_resistance
            || u.EStone_resistance);
        const ptr = mons(kicked.corpsenm | 0);
        if (!u.uarmf && (kicked.otyp | 0) === CORPSE
            && touch_petrifies(ptr) && !Stone_resistance) {
            await pline(`You kick ${the(cxname(kicked))} with your bare ${
                makeplural(body_part(FOOT))
            }.`);
            const youData = game.youmonst?.data
                || mons(u.umonnum ?? game.urole?.mnum);
            if (poly_when_stoned(youData, game.mvitals)
                && (await polymon(PM_STONE_GOLEM))) {
                // hero transformed; kick continues
            } else {
                // C :551–554 Sprintf(killer, "kicking %s barefoot", killer_xname)
                await instapetrify(
                    `kicking ${killer_xname(kicked)} barefoot`,
                );
            }
        }
    }

    const isgold = (kicked.oclass | 0) === COIN_CLASS;
    let k_owt = weight(kicked) | 0;
    if ((kicked.quan | 0) > 1 && !isgold) {
        const save_quan = kicked.quan;
        kicked.quan = 1;
        k_owt = weight(kicked) | 0;
        kicked.quan = save_quan;
    }

    // C: range = ACURRSTR/2 - k_owt/40
    let range = Math.trunc(acurrstr() / 2) - Math.trunc(k_owt / 40);

    if (martial()) range += rnd(3);

    let slide = false;
    if (is_pool(x, y)) {
        range = Math.trunc(range / 3) + 1;
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        range += rnd(3);
    } else {
        if (is_ice(x, y)) {
            range += rnd(3);
            slide = true;
        }
        if (kicked.greased) {
            range += rnd(3);
            slide = true;
        }
    }

    if (is_art(kicked, ART_MJOLLNIR)) range = 1;

    const nx = (x | 0) + (u.dx | 0);
    const ny = (y | 0) + (u.dy | 0);
    if (!isok(nx, ny)
        || !ZAP_POS(game.level?.at?.(nx, ny)?.typ)
        || closed_door(nx, ny)) {
        range = 1;
    }

    const shkp = find_objowner(kicked, x, y);
    let costly = !!(shkp && (costly_spot(x, y)
        || (costly_adjacent(shkp, x, y) && kicked.unpaid)));

    await Norep(`You kick ${
        !isgold ? singular(kicked, doname) : doname(kicked)
    }.`);

    const loc = game.level?.at?.(x, y);
    if (IS_OBSTRUCTED(loc?.typ) || closed_door(x, y)) {
        if ((!martial() && rn2(20) > acurr(A_DEX))
            || IS_OBSTRUCTED(game.level?.at?.(u.ux | 0, u.uy | 0)?.typ)
            || closed_door(u.ux | 0, u.uy | 0)) {
            if (Blind()) {
                await pline("It doesn't come loose.");
            } else {
                await pline(`${The(distant_name(kicked, xname))} ${
                    otense(kicked, 'do')
                }n't come loose.`);
            }
            return (!rn2(3) || martial()) ? 1 : 0;
        }
        if (Blind()) {
            await pline('It comes loose.');
        } else {
            await pline(`${The(distant_name(kicked, xname))} ${
                otense(kicked, 'come')
            } loose.`);
        }
        obj_extract_self(kicked);
        newsym(x, y);
        if (costly && (!costly_spot(u.ux | 0, u.uy | 0)
            || !(u.urooms || '').includes(
                (in_rooms(x, y, SHOPBASE) || '')[0] || '\0',
            ))) {
            if (!kicked.no_charge) {
                await addtobill(kicked, false, false, false);
            } else {
                kicked.no_charge = 0;
            }
        }
        {
            const { flooreffects: fe } = await import('./do.js');
            if (!(await fe(kicked, u.ux | 0, u.uy | 0, 'fall'))) {
                place_object(kicked, u.ux | 0, u.uy | 0);
                impact_disturbs_zombies(kicked, true);
                stackobj(kicked);
                newsym(u.ux | 0, u.uy | 0);
            }
        }
        return 1;
    }

    // C: Is_box — THUD / container_impact / lock break or lid slam
    if (Is_box(kicked)) {
        const otrp = !!kicked.otrapped;
        if (range < 2) await pline('THUD!');
        await container_impact_dmg(kicked, x, y);
        if (kicked.olocked) {
            if (!rn2(5) || (martial() && !rn2(2))) {
                await pline('You break open the lock!');
                await breakchestlock(kicked, false);
                if (otrp) await chest_trap(kicked, LEG, false);
                return 1;
            }
        } else if (!rn2(3) || (martial() && !rn2(2))) {
            await pline('The lid slams open, then falls shut.');
            kicked.lknown = 1;
            if (otrp) await chest_trap(kicked, LEG, false);
            return 1;
        }
        if (range < 2) return 1;
        // else fall through to move / hero_breaks
    }

    if (await hero_breaks(kicked, kicked.ox | 0, kicked.oy | 0, 0)) {
        return 1;
    }

    if (range < 2) {
        if (!Is_box(kicked)) await pline('Thump!');
        return (!rn2(3) || martial()) ? 1 : 0;
    }

    if ((kicked.quan | 0) > 1) {
        if (!isgold) {
            kicked = splitobj(kicked, 1);
            game.kickedobj = kicked;
        } else {
            if (rn2(20)) {
                const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
                    || u.uroleplay?.deaf || u.Deaf);
                if (!Deaf) await pline('Thwwpingg!');
                const msgs = [
                    'scatter the coins',
                    'knock coins all over the place',
                    'send coins flying in all directions',
                ];
                await pline(`You ${msgs[rn2(msgs.length)]}!`);
                await scatter(x, y, rnd(3), VIS_EFFECTS | MAY_HIT, kicked);
                newsym(x, y);
                return 1;
            }
            if ((kicked.quan | 0) > 300) {
                await pline('Thump!');
                return (!rn2(3) || martial()) ? 1 : 0;
            }
        }
    }

    if (slide && !Blind()) {
        await pline(`Whee!  ${Doname2(kicked)} ${
            otense(kicked, 'slide')
        } across the ${surface(x, y)}.`);
    }

    obj_extract_self(kicked);
    // C dokick.c really_kick_object :734 — candles/candelabrum, not snuff_lit
    {
        const { snuff_candle } = await import('./apply.js');
        await snuff_candle(kicked);
    }
    newsym(x, y);

    const { bhit } = await import('./zap.js');
    const pref = {
        get obj() { return game.kickedobj; },
        set obj(v) { game.kickedobj = v; },
    };
    pref.obj = kicked;
    const mon = await bhit(
        u.dx | 0, u.dy | 0, range, KICKED_WEAPON, null, null, pref,
    );
    kicked = game.kickedobj;
    if (!kicked) return 1; /* object broken */

    if (mon) {
        if (mon.isshk && kicked.where === OBJ_MINVENT
            && kicked.ocarry === mon) {
            return 1; /* alert shk caught it */
        }
        const bp = game._bhitpos || game.bhitpos || {};
        game.notonhead = ((mon.mx | 0) !== (bp.x | 0)
            || (mon.my | 0) !== (bp.y | 0));
        if (isgold) {
            if (await ghitm(mon, kicked)) return 1;
        } else if (await thitmonst(mon, kicked)) {
            return 1;
        }
    }

    if (kicked.where === OBJ_MIGRATING) return 1;

    const bp = game._bhitpos || game.bhitpos || { x, y };
    const bx = bp.x | 0;
    const by = bp.y | 0;
    const bhitroom = (in_rooms(bx, by, SHOPBASE) || '')[0] || '';
    const srcRoom = (in_rooms(x, y, SHOPBASE) || '')[0] || '';
    if (costly && (!costly_spot(bx, by) || srcRoom !== bhitroom)) {
        if (isgold) {
            await costly_gold(x, y, kicked.quan | 0, false);
        } else {
            await stolen_value(kicked, x, y, !!(shkp?.mpeaceful), false);
        }
        costly = false;
    }

    {
        const { flooreffects: fe } = await import('./do.js');
        if (await fe(kicked, bx, by, 'fall')) return 1;
    }
    if (costly) {
        let gtg = 0;
        if (kicked.unpaid) subfrombill(kicked, shkp);
        // if billed for contained gold during kick, refund now
        if (Has_contents(kicked)
            && (gtg = contained_gold(kicked, true)) > 0) {
            await donate_gold(gtg, shkp, false);
        }
    }
    place_object(kicked, bx, by);
    impact_disturbs_zombies(kicked, true);
    stackobj(kicked);
    newsym(kicked.ox | 0, kicked.oy | 0);
    return 1;
}

/**
 * C ref: dokick.c dokick — #kick (Ctrl-D).
 * Returns true if the action consumes a turn (ECMD_TIME).
 */
export async function dokick() {
    const u = game.u || (game.u = {});
    let no_kick = false;
    const youdata = game.youmonst?.data;
    const wounded = !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));

    /* C dokick.c dokick `:1265–1310` — no_kick chain (D-1362).
     * Poly/steed before wounded (D-0786). Encumber before lizard /
     * uinwater / utrap / boulder. Steed yn returns before More.
     * Swallow / pit-brace / Levitation after getdir still named. */
    if (nolimbs(youdata) || slithy(youdata)) {
        await pline('You have no legs to kick with.');
        no_kick = true;
    } else if (verysmall(youdata)) {
        await pline('You are too small to do any kicking.');
        no_kick = true;
    } else if (u.usteed) {
        // C: yn_function("Kick your steed?", ynchars, 'y', TRUE)
        if ((await yn_function('Kick your steed?', 'yn', 'y')) === 'y') {
            await pline(`You kick ${mon_nam(u.usteed)}.`);
            await kick_steed();
            return true;
        }
        return false;
    } else if (wounded) {
        await legs_in_no_shape('kicking', false);
        no_kick = true;
    } else if (near_capacity() > SLT_ENCUMBER) {
        await pline('Your load is too heavy to balance yourself for a kick.');
        no_kick = true;
    } else if (youdata?.mlet === 'S_LIZARD') {
        await pline('Your legs cannot kick effectively.');
        no_kick = true;
    } else if (u.uinwater && !rn2(2)) {
        await pline("Your slow motion kick doesn't hit anything.");
        no_kick = true;
    } else if ((u.utrap | 0) !== 0) {
        no_kick = true;
        switch (u.utraptype | 0) {
        case TT_PIT:
            if (!Passes_walls()) {
                await pline("There's not enough room to kick down here.");
            } else {
                no_kick = false;
            }
            break;
        case TT_WEB:
        case TT_BEARTRAP:
            await pline(`You can't move your ${body_part(LEG)}!`);
            break;
        default:
            break;
        }
    } else if (sobj_at(BOULDER, u.ux | 0, u.uy | 0) && !Passes_walls()) {
        await pline("There's not enough room to kick in here.");
        no_kick = true;
    }

    if (no_kick) {
        // C: display_nhwindow(WIN_MESSAGE, TRUE) — --More-- owns next keys
        await flush_topl_more();
        return false;
    }

    if (!(await getdir(null))) return false;
    if (!u.dx && !u.dy) return false;

    const x = (u.ux || 0) + (u.dx || 0);
    const y = (u.uy || 0) + (u.dy || 0);
    // C ref: dokick.c — gk.kickedloc set before kick resolution; pets avoid it
    game.kickedloc = { x, y };

    const avrg_attrib = Math.trunc(
        (acurr(A_STR) + acurr(A_DEX) + acurr(A_CON)) / 3,
    );

    // Swallow / pit / levitation brace paths deferred

    const mtmp = isok(x, y) ? mon_at(x, y) : null;
    if (mtmp) {
        if (!(await maybe_kick_monster(mtmp, x, y))) {
            // C: return context.move ? ECMD_TIME : ECMD_OK
            return !!(game.context?.move ?? true);
        }
    }

    /* C dokick.c `:1383–1384` — wake_nearby(FALSE) then u_wipe_engr(2)
     * after maybe_kick, before isok / kick_monster. Callees live
     * (mon.js D-1007; engrave.js D-1051). Declined peaceful returns
     * first and skips both. */
    await wake_nearby(false);
    u_wipe_engr(2);

    if (!isok(x, y)) {
        // C dokick.c:1387 gm.maploc = &gn.nowhere then kick_ouch
        game.maploc = null;
        await kick_ouch(x, y);
        return true;
    }

    const loc = game.level?.at(x, y);
    // C dokick.c:1391 gm.maploc = &levl[x][y] before pool/object/door
    game.maploc = loc || null;
    if (!loc) {
        await kick_dumb(x, y);
        return true;
    }

    /*
     * C order after maybe_kick: monsters, pools, objects, non-doors, doors.
     * Monster kick runs here when mtmp survived maybe_kick_monster.
     */
    if (mtmp) {
        await kick_monster(mtmp, x, y);
        // glyph / map_invisible / airlevel recoil deferred
        return true;
    }

    if ((IS_POOL(loc.typ) || loc.typ === LAVAWALL) !== !!(u.uinwater)) {
        await pline(`You splash some ${IS_POOL(loc.typ) ? 'water' : 'lava'} around.`);
        return true;
    }

    // OBJ_AT — kick_object (D-0988)
    if (objects_at(x, y)) {
        const kickobjnam = { value: '' };
        const kicked = await kick_object(x, y, kickobjnam);
        if (kicked) return true;
        await kick_ouch(x, y, kickobjnam.value);
        return true;
    }

    if (IS_DOOR(loc.typ)) {
        await kick_door(x, y, avrg_attrib);
        return true;
    }
    await kick_nondoor(x, y, avrg_attrib);
    return true;
}

function on_level(a, b) {
    return !!(a && b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0));
}

/**
 * C ref: dokick.c down_gate — migration dest for objects falling down.
 * Sets game.gate_str for impact_drop messages.
 */
export function down_gate(x, y) {
    const u = game.u || {};
    game.gate_str = null;
    if (on_level(u.uz, game.qstart_level) && !ok_to_quest()) {
        return MIGR_NOWHERE;
    }
    const stway = stairway_at(x, y);
    if (stway && !stway.up && !stway.isladder) {
        game.gate_str = 'down the stairs';
        return ((stway.tolev?.dnum | 0) === (u.uz?.dnum | 0))
            ? MIGR_STAIRS_UP
            : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        game.gate_str = 'down the ladder';
        return MIGR_LADDER_UP;
    }
    const ttmp = t_at(x, y);
    if (ttmp && ttmp.tseen && is_hole(ttmp.ttyp)) {
        game.gate_str = (ttmp.ttyp === TRAPDOOR)
            ? 'through the trap door'
            : 'through the hole';
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

/**
 * C ref: dokick.c drop_to — fill coord destination for a down_gate loc.
 * cc.y === 0 means nowhere.
 */
export function drop_to(cc, loc, x, y) {
    const u = game.u || {};
    const stway = stairway_at(x, y);
    switch (loc) {
    case MIGR_RANDOM:
        if (Is_stronghold(u.uz)) {
            const v = game.valley_level;
            cc.x = v?.dnum | 0;
            cc.y = v?.dlevel | 0;
            break;
        } else if (In_endgame(u.uz) || Is_botlevel(u.uz)) {
            cc.y = 0;
            cc.x = 0;
            break;
        }
        // FALLTHROUGH — stairs/ladder/sstairs share dest fill
    case MIGR_STAIRS_UP:
    case MIGR_LADDER_UP:
    case MIGR_SSTAIRS:
        if (stway?.tolev) {
            cc.x = stway.tolev.dnum | 0;
            cc.y = stway.tolev.dlevel | 0;
        } else {
            cc.x = u.uz?.dnum | 0;
            cc.y = (u.uz?.dlevel | 0) + 1;
        }
        break;
    default:
    case MIGR_NOWHERE:
        cc.y = 0;
        cc.x = 0;
        break;
    }
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
        || u.uroleplay?.deaf || u.Deaf);
    if (Deaf) return;
    await pline(`You hear ${line}`);
}


/**
 * C ref: dokick.c otransit_msg — visible fall / impact message.
 * Named omit: Soundeffect.
 */
async function otransit_msg(otmp, nodrop, chainthere, num) {
    let obuf;
    if ((otmp.otyp | 0) === CORPSE) {
        obuf = The(cxname(otmp));
    } else {
        obuf = The(xname(otmp));
    }
    const gate = game.gate_str || 'down';
    if (num || chainthere) {
        let xbuf;
        if (num) {
            xbuf = ` ${otense(otmp, 'hit')} ${
                num === 1 ? 'another' : 'other'
            } object${num > 1 ? 's' : ''}`;
        } else {
            xbuf = ` ${otense(otmp, 'rattle')} your chain`;
        }
        if (nodrop) {
            xbuf += '.';
        } else {
            xbuf += ` and ${otense(otmp, 'fall')} ${gate}.`;
        }
        await pline(`${obuf}${xbuf}`);
    } else if (!nodrop) {
        await pline(`${obuf} ${otense(otmp, 'fall')} ${gate}.`);
    }
}

/**
 * C ref: worn.c remove_worn_item thin — clear weapon slots before ship.
 * Full accessory/armor prop polish deferred.
 */
function remove_worn_item_ship(obj) {
    if (!obj || !(obj.owornmask | 0)) return;
    const u = game.u || {};
    if (obj === u.uwep) setuwep(null);
    if (obj === u.uquiver) setuqwep(null);
    if (obj === u.uswapwep) setuswapwep(null);
    obj.owornmask = 0;
}

/**
 * C ref: dokick.c ship_object — single kicked/dropped/thrown obj falls
 * through hole/stairs/ladder; shop unpaid / shop_floor_obj billing.
 * Branch envelope: down_gate/drop_to; uball/uchain/rn2 nodrop;
 * boulder plugs hole after optional impact_drop; otransit_msg;
 * stolen_value + picked_container; breaktest muffled crash/splat;
 * add_to_migration + impact_drop of pile.
 * Named omit: maybe_unhide_at; Soundeffect; shop_floor_obj polish.
 * shop_floor_obj=TRUE via kick_object bhit (D-0988); flooreffects
 * callers beyond dropz/throwit/drop_throw/kick (D-0987 core done).
 * NOTE: assumes otmp already freed from fobj/invent (C comment).
 * @returns {Promise<boolean>} true if shipped/broken (caller must not place)
 */
export async function ship_object(otmp, x, y, shop_floor_obj) {
    if (!otmp) return false;
    const toloc = down_gate(x, y);
    if (toloc === MIGR_NOWHERE) return false;
    const cc = { x: 0, y: 0 };
    drop_to(cc, toloc, x, y);
    if (!cc.y) return false;

    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    // objects other than attached iron ball always fall down ladder,
    // but have a chance of staying otherwise
    let nodrop = (otmp === uball) || (otmp === uchain)
        || (toloc !== MIGR_LADDER_UP && !!rn2(3));

    const container = Has_contents(otmp);
    const unpaid = is_unpaid(otmp);

    let n = 0;
    let impact = false;
    let chainthere = false;
    if (objects_at(x, y)) {
        for (let obj = objects_at(x, y); obj; obj = obj.nexthere) {
            if (obj === uchain) chainthere = true;
            else if (obj !== otmp) n += obj.quan | 0;
        }
        if (n) impact = true;
    }

    // boulders never fall through trap doors, but they might knock
    // other things down before plugging the hole
    if ((otmp.otyp | 0) === BOULDER) {
        const t = t_at(x, y);
        if (t && is_hole(t.ttyp)) {
            if (impact) await impact_drop(otmp, x, y, 0);
            return false; // let caller finish the drop
        }
    }

    if (cansee(x, y)) {
        await otransit_msg(otmp, nodrop, chainthere, n);
    }

    if (nodrop) {
        if (impact) {
            await impact_drop(otmp, x, y, 0);
            // maybe_unhide_at deferred
        }
        return false;
    }

    if (unpaid || shop_floor_obj) {
        if (unpaid) {
            await stolen_value(otmp, u.ux | 0, u.uy | 0, true, false);
        } else {
            const ox = otmp.ox | 0;
            const oy = otmp.oy | 0;
            const roomsHere = in_rooms(ox, oy, SHOPBASE) || '';
            const peaceful = !!(costly_spot(u.ux | 0, u.uy | 0)
                && (u.urooms || '').includes(roomsHere[0] || ''));
            await stolen_value(otmp, ox, oy, peaceful, false);
        }
        if (container) picked_container(otmp);
        if ((otmp.oclass | 0) !== COIN_CLASS) otmp.no_charge = 0;
    }

    if (otmp.owornmask) remove_worn_item_ship(otmp);

    // some things break rather than ship — dothrow.c breaktest
    const { breaktest } = await import('./dothrow.js');
    if (breaktest(otmp)) {
        const oc = game.objects?.[otmp.otyp | 0];
        let result;
        if ((oc?.oc_material | 0) === GLASS
            || (otmp.otyp | 0) === EXPENSIVE_CAMERA) {
            if ((otmp.otyp | 0) === MIRROR) change_luck(-2);
            result = 'crash';
        } else {
            if ((otmp.otyp | 0) === EGG && (otmp.spe | 0)
                && ismnum(otmp.corpsenm)) {
                change_luck(-Math.min(otmp.quan | 0, 5));
            }
            result = 'splat';
        }
        await You_hear(`a muffled ${result}.`);
        // C: obj_extract_self + obfree (not delobj — no obj_resists rn2)
        obj_extract_self(otmp);
        otmp.quan = 0;
        otmp.where = 0; // OBJ_FREE
        otmp.nobj = null;
        otmp.nexthere = null;
        return true;
    }

    add_to_migration(otmp);
    otmp.ox = cc.x | 0;
    otmp.oy = cc.y | 0;
    otmp.owornmask = toloc | 0;

    // boulder from rolling boulder trap, no longer part of the trap
    if ((otmp.otyp | 0) === BOULDER) otmp.otrapped = 0;

    if (impact) {
        await impact_drop(otmp, x, y, 0);
        newsym(x, y);
    }
    return true;
}

/**
 * C ref: dokick.c impact_drop — player/missile impact drops floor objs down.
 * Branch envelope: down_gate/drop_to; boulder/rock rn2 skip; extract +
 * add_to_migration; visible fall messages via gate_str; shop stolen_value
 * + picked_container + debit/robbed chase (D-0983).
 * Named omit: maybe_unhide_at shop_floor polish.
 * @param {object|null} missile  caused impact; won't drop itself
 * @param {number} x
 * @param {number} y
 * @param {number} dlev  if !0 send objs with MIGR_WITH_HERO to dlev
 */
export async function impact_drop(missile, x, y, dlev) {
    if (!objects_at(x, y)) return;

    let toloc = down_gate(x, y);
    const cc = { x: 0, y: 0 };
    drop_to(cc, toloc, x, y);
    if (!cc.y) return;

    if (dlev) {
        toloc = MIGR_WITH_HERO;
        cc.y = dlev | 0;
    }

    const costly = costly_spot(x, y);
    let price = 0;
    let debit = 0;
    let robbed = 0;
    let angry = false;
    let shkp = null;
    if (costly) {
        const rooms = in_rooms(x, y, SHOPBASE) || '';
        shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : 0);
        if (shkp) {
            const eshk = ESHK(shkp);
            debit = eshk?.debit | 0;
            robbed = eshk?.robbed | 0;
            angry = !shkp.mpeaceful;
        }
    }

    const isrock = !!(missile && (missile.otyp | 0) === ROCK);
    let oct = 0;
    let dct = 0;
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;

    for (let obj = objects_at(x, y); obj; ) {
        const obj2 = obj.nexthere;
        if (obj === missile) {
            obj = obj2;
            continue;
        }
        oct += obj.quan | 0;
        if (obj === uball || obj === uchain) {
            obj = obj2;
            continue;
        }
        // boulders can fall too, but rarely & never due to rocks
        if ((isrock && (obj.otyp | 0) === BOULDER)
            || rn2((obj.otyp | 0) === BOULDER ? 30 : 3)) {
            obj = obj2;
            continue;
        }
        obj_extract_self(obj);
        if (costly) {
            const roomsHere = in_rooms(x, y, SHOPBASE) || '';
            const peaceful = !!(costly_spot(u.ux | 0, u.uy | 0)
                && (u.urooms || '').includes(roomsHere[0] || ''));
            price += await stolen_value(obj, x, y, peaceful, true);
            if (Has_contents(obj)) picked_container(obj);
            if ((obj.oclass | 0) !== COIN_CLASS) obj.no_charge = 0;
        }
        add_to_migration(obj);
        obj.ox = cc.x | 0;
        obj.oy = cc.y | 0;
        obj.owornmask = toloc | 0;
        dct += obj.quan | 0;
        obj = obj2;
    }

    if (dct && cansee(x, y)) {
        const what = dct === 1 ? 'object falls' : 'objects fall';
        const gate = game.gate_str || 'down';
        if (missile) {
            await pline(
                `From the impact, ${
                    dct === oct ? 'the ' : dct === 1 ? 'an' : ''
                }other ${what}.`,
            );
        } else if (oct === dct) {
            await pline(
                `${dct === 1 ? 'The' : 'All the'} adjacent ${what} ${gate}.`,
            );
        } else {
            await pline(
                `${dct === 1 ? 'One of the' : 'Some of the'} adjacent ${
                    dct === 1 ? 'objects falls' : what
                } ${gate}.`,
            );
        }
    }

    if (costly && shkp && price) {
        const eshk = ESHK(shkp);
        if ((eshk?.robbed | 0) > robbed) {
            await pline(
                `You removed ${price} ${currency(price)} worth of goods!`,
            );
            if (cansee(shkp.mx | 0, shkp.my | 0)) {
                if (!(eshk.customer || '')[0]) {
                    eshk.customer = String(game.plname || '').slice(0, 32);
                }
                if (angry) {
                    await pline(`${Shknam(shkp)} is infuriated!`);
                } else {
                    await pline(`"${game.plname || ''}, you are a thief!"`);
                }
            } else {
                const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
                    || u.uroleplay?.deaf || u.Deaf);
                if (!Deaf) await pline('You hear a scream, "Thief!"');
            }
            hot_pursuit(shkp);
            await angry_guards(false);
            return;
        }
        if ((eshk?.debit | 0) > debit) {
            const amt = (eshk.debit | 0) - debit;
            await pline(
                `You owe ${shkname(shkp)} ${amt} ${currency(amt)} for goods lost.`,
            );
        }
    }
}

/**
 * C ref: dokick.c obj_delivery — place migrating_objs whose ox/oy dest
 * matches u.uz. Callers: do.c goto_level FALSE after placebc (WITH_HERO
 * trap-door with the hero), TRUE after check_special_room (stairs /
 * random). C XOR: skip when (!near_hero) != (where == MIGR_WITH_HERO).
 * nx/ny persist across the loop like C (only RANDOM/default zeros).
 * Named omit: none for species cargo skip (producer is D-1363).
 * wizkit FALSE is D-1192.
 */
export async function obj_delivery(near_hero) {
    const u = game.u || {};
    const uz = u.uz || {};
    // C: nx, ny declared outside the for-loop
    let nx = 0;
    let ny = 0;

    for (let otmp = game.migrating_objs; otmp; ) {
        const otmp2 = otmp.nobj;
        if ((otmp.ox | 0) !== (uz.dnum | 0)
            || (otmp.oy | 0) !== (uz.dlevel | 0)) {
            otmp = otmp2;
            continue;
        }

        let where = (otmp.owornmask | 0) & 0x7fff;
        if ((where & MIGR_TO_SPECIES) !== 0) {
            otmp = otmp2;
            continue;
        }

        const nobreak = (where & MIGR_NOBREAK) !== 0;
        // C: noscatter = (where & MIGR_WITH_HERO) != 0 — bitmask 9, not
        // the NOSCATTER flag (2048), and not equality with dest 9.
        const noscatter = (where & MIGR_WITH_HERO) !== 0;
        where &= ~(MIGR_NOBREAK | MIGR_NOSCATTER);

        // C: if (!near_hero ^ (where == MIGR_WITH_HERO)) continue;
        if ((!near_hero) !== (where === MIGR_WITH_HERO)) {
            otmp = otmp2;
            continue;
        }

        obj_extract_self(otmp);
        otmp.owornmask = 0;
        const fromdlev = {
            dnum: otmp.omigr_from_dnum | 0,
            dlevel: otmp.omigr_from_dlevel | 0,
        };

        let isladder = false;
        switch (where) {
        case MIGR_LADDER_UP:
            isladder = true;
            // FALLTHROUGH
        case MIGR_STAIRS_UP:
        case MIGR_SSTAIRS: {
            const stway = stairway_find_from(fromdlev, isladder);
            if (stway) {
                nx = stway.sx | 0;
                ny = stway.sy | 0;
            }
            break;
        }
        case MIGR_WITH_HERO:
            nx = u.ux | 0;
            ny = u.uy | 0;
            break;
        default:
        case MIGR_RANDOM:
            nx = 0;
            ny = 0;
            break;
        }
        otmp.omigr_from_dnum = 0;
        otmp.omigr_from_dlevel = 0;
        if (nx > 0) {
            place_object(otmp, nx, ny);
            const typ = game.level?.at(nx, ny)?.typ | 0;
            if (!nobreak && !IS_SOFT(typ)) {
                if (where === MIGR_WITH_HERO) {
                    if (await breaks(otmp, nx, ny)) {
                        otmp = otmp2;
                        continue;
                    }
                } else if (breaktest(otmp)) {
                    // assume it broke before player arrived, no messages
                    delobj(otmp);
                    otmp = otmp2;
                    continue;
                }
            }
            stackobj(otmp);
            if (!noscatter) {
                await scatter(nx, ny, rnd(2), 0, otmp);
            } else {
                newsym(nx, ny);
            }
        } else {
            // dummy coords; rloco has no current position to update
            otmp.ox = 0;
            otmp.oy = 0;
            if (rloco(otmp) && !nobreak && breaktest(otmp)) {
                delobj(otmp);
            }
        }
        otmp = otmp2;
    }
}

/* C dokick.c DELIVER_PM — race/kind bits that migr_species matches */
const DELIVER_PM = M2_UNDEAD | M2_WERE | M2_HUMAN | M2_ELF | M2_DWARF
    | M2_GNOME | M2_ORC | M2_DEMON | M2_GIANT;

/** C obj.h: migr_species overlays corpsenm. */
function migr_species_of(otmp) {
    if (otmp.migr_species != null) return otmp.migr_species | 0;
    return otmp.corpsenm | 0;
}

/**
 * C ref: dokick.c deliver_obj_to_mon — extract MIGR_TO_SPECIES
 * migrating_objs whose migr_species equals
 * (mtmp->data->mflags2 & DELIVER_PM). No dest-level filter (unlike
 * obj_delivery). Callers: makemon.c after allow_minvent (DF_NONE,
 * cnt=1). Producer: mkobj.c mksobj_migr_to_species / mkmaze stolen_booty
 * (D-1363). Caller: dog.c mon_arrive MIGR_LEFTOVERS DF_ALL (D-1505).
 */
export function deliver_obj_to_mon(mtmp, cnt, deliverflags) {
    if (!mtmp) return;
    let maxobj = 1;
    const at_crime_scene = In_mines(game.u?.uz);
    if ((deliverflags & DF_RANDOM) && cnt > 1) maxobj = rnd(cnt);
    else if (deliverflags & DF_ALL) maxobj = 0;
    else maxobj = 1;

    cnt = 0;
    for (let otmp = game.migrating_objs; otmp; ) {
        const otmp2 = otmp.nobj;
        const where = (otmp.owornmask | 0) & 0x7fff;
        if ((where & MIGR_TO_SPECIES) === 0) {
            otmp = otmp2;
            continue;
        }
        const species = migr_species_of(otmp);
        const monmask = ((mtmp.data?.mflags2 | 0) & DELIVER_PM) >>> 0;
        if (species !== NON_PM && monmask === (species >>> 0)) {
            obj_extract_self(otmp);
            otmp.owornmask = 0;
            otmp.ox = 0;
            otmp.oy = 0;

            /* special treatment for orcs and their kind */
            if ((species & M2_ORC) !== 0 && has_oname(otmp)) {
                if (!has_mgivenname(mtmp)) {
                    if (at_crime_scene || !rn2(2)) {
                        mtmp = christen_orc(
                            mtmp,
                            at_crime_scene ? ONAME(otmp) : null,
                            ' the Fence',
                        );
                    }
                }
                free_oname(otmp);
            }
            otmp.migr_species = NON_PM;
            otmp.corpsenm = NON_PM;
            otmp.omigr_from_dnum = 0;
            otmp.omigr_from_dlevel = 0;
            add_to_minv(mtmp, otmp);
            cnt++;
            if (maxobj && cnt >= maxobj) break;
            /* getting here implies DF_ALL */
        }
        otmp = otmp2;
    }
}
