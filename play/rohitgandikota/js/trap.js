// trap.js — traps.
// C ref: src/trap.c
//
// Only the level-generation entry points are here so far. maketrap() itself
// still lives in js/mklev.js alongside the rest of the level builder; this file
// holds the pieces of src/trap.c it calls into, so that a grep for a C symbol
// finds it in the file its C twin lives in.

import { t_at } from './mon.js';
import { aobjnam } from './objnam.js';
import { has_omonst } from './const.js';
import { OMONST } from './const.js';
import { FOOT } from './const.js';
import { UTOTYPE_NONE } from './const.js';
import { UTOTYPE_FALLING } from './const.js';
import { ROOM } from './const.js';
import { DRAWBRIDGE_DOWN } from './const.js';
import { VIS_EFFECTS } from './const.js';
import { MAY_FRACTURE } from './const.js';
import { MAY_HIT } from './const.js';
import { MAY_DESTROY } from './const.js';
import { M_SEEN_FIRE } from './const.js';
import { DISMOUNT_FELL } from './const.js';
import { NO_TRAP } from './const.js';
import { TRAPNUM } from './const.js';
import { PLNMSG_BACK_ON_GROUND } from './const.js';
import { IS_WATERWALL } from './const.js';
import { Is_stronghold } from './const.js';
import { sticks } from './mondata.js';
import { hits_bars } from './mthrowu.js';
import { linedup } from './mthrowu.js';
import { tty_clear_nhwindow_message } from './display.js';
import { burn_away_slime } from './timeout.js';
import { welded } from './wield.js';
import { buried_ball } from './dig.js';
import { liquid_flow } from './dig.js';
import { fillholetyp } from './dig.js';
import { is_ice } from './dbridge.js';
import { is_waterwall } from './dbridge.js';
import { destroy_drawbridge } from './dbridge.js';
import { find_drawbridge } from './dbridge.js';
import { is_drawbridge_wall } from './dbridge.js';
import { del_engr_at } from './engrave.js';
import { scatter } from './explode.js';
import { rank_of } from './botl.js';
import { rn2_on_display_rng } from './rng.js';
import { shopdig } from './shk.js';
import { impact_drop } from './dokick.js';
import { setmangry } from './mon.js';
import { set_ustuck } from './mon.js';
import { spot_checks } from './hack.js';
import { movobj } from './hack.js';
import { obfree } from './invent.js';
import { useup } from './invent.js';
import { Boots_off } from './do_wear.js';
import { YMonnam } from './do_name.js';
import { noit_Monnam } from './do_name.js';
import { y_monnam } from './do_name.js';
import { hcolor } from './do_name.js';
import { The } from './objnam.js';
import { ceiling } from './dungeon.js';
import { find_hell } from './dungeon.js';
import { update_lastseentyp } from './dungeon.js';
import { ice_descr } from './pager.js';
import { Passes_walls } from './youprop.js';
import { Wwalking } from './youprop.js';
import { Teleportation } from './youprop.js';
import { split_mon } from './potion.js';
import { reset_faint } from './eat.js';
import { is_fainted } from './eat.js';
import { domagicportal } from './teleport.js';
import { noteleport_level } from './teleport.js';
import { dotele } from './teleport.js';
import { monstunseesu } from './mondata.js';
import { monstseesu } from './mondata.js';
import { ceiling_hider } from './mondata.js';
import { strongmonst } from './mondata.js';
import { digests } from './mondata.js';
import { can_teleport } from './mondata.js';
import { schedule_goto } from './do.js';
import { unplacebc } from './do.js';
import { placebc } from './do.js';
import { maybe_dunk_boulders } from './apply.js';
import { next_to_u } from './apply.js';
import { unleash_all } from './apply.js';
import { COST_BURN, COST_RUST, COST_ROT, COST_CORRODE, COST_CRACK } from './const.js';
import { mcarried } from './obj.js';
import { costly_alteration } from './shk.js';
import { s_suffix } from './hacklib.js';
import { Yobjnam2 } from './objnam.js';
import { plur } from './const.js';
import { ER_GREASED, CONTAINED_TOO, BURIED_TOO } from './const.js';
import { setnotworn } from './worn.js';
import { simpleonames } from './objnam.js';
import { carried, Has_contents, is_plural } from './obj.js';
import { remove_worn_item } from './steal.js';
import { pline_The } from './pline.js';
import { blank_novel, get_obj_location } from './zap.js';
import { wet_a_towel } from './weapon.js';
import { splash_lit } from './apply.js';
import { set_uinwater } from './hack.js';
import { sellobj } from './shk.js';
import { bury_an_obj } from './dig.js';
import { sleep_monst } from './mhitm.js';
import { shieldeff_mon } from './mon.js';
import { mpickobj } from './steal.js';
import { extract_from_minvent, update_mon_extrinsics } from './worn.js';
import { polyself } from './polyself.js';
import { shieldeff } from './display.js';
import { prinv } from './invent.js';
import { poly_obj, resist } from './zap.js';
import { x_monnam } from './do_name.js';
import { Antimagic, Unchanging } from './youprop.js';
import { has_mgivenname, ARTICLE_THE, ARTICLE_NONE, SUPPRESS_SADDLE, NOTELL, NC_SHOW_MSG, DISMOUNT_POLY, POLY_NOFLAGS } from './const.js';
import { wakeup } from './mon.js';
import { uwepgone, uswapwepgone } from './wield.js';
import { obj_pmname } from './do_name.js';
import { m_at, t_at as t_at_mon } from './mon.js';
import { inv_cnt, crawl_destination, unmul, in_rooms,
         u_locomotion } from './hack.js';
import { distu } from './hacklib.js';
import { near_capacity, change_luck } from './attrib.js';
import { UNENCUMBERED, SLT_ENCUMBER, KILLED_BY, DROWNING, BURNING, DISSOLVED,
         STONING, WATER, FIRE_RES, FAST, MFAST, XKILL_NOMSG,
         NO_KILLER_PREFIX, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT } from './const.js';
import { goodpos, makemon, remove_monster, set_malign } from './makemon.js';
import { waterbody_name } from './pager.js';
import { hliquid } from './do_name.js';
import { Teleport_control, Unaware, Sleep_resistance, Fire_resistance,
         Shock_resistance, Halluc_resistance, Swimming, Amphibious, Breathless,
         Stone_resistance } from './youprop.js';
import { teleds, safe_teleds, TELEDS_ALLOW_DRAG,
         TELEDS_TELEPORT } from './teleport.js';
import { done } from './end.js';
import { recalc_block_point, vision_recalc } from './vision.js';
import { useupall } from './invent.js';
import { burn_floor_objects, destroy_items, melt_ice,
         obj_resists } from './zap.js';

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { mksobj, place_object, splitobj } from './mkobj.js';
import { weight } from './invent.js';
import { dmgval } from './weapon.js';
import { makeknown, observe_object } from './o_init.js';
import { canspotmon, display_nhwindow_message, display_object_at, feel_newsym,
         newsym, pline, temporary_object_glyph, under_water,
         urgent_pline } from './display.js';
import { You, You_hear, You_feel, You_see, Your, Norep } from './pline.js';
import { an, the, doname, mshot_xname, otense, xname, yname, Yname2,
         corpse_xname, CXN_PFX_THE } from './objnam.js';
import { a_monnam, rndmonnam, upstart } from './do_name.js';
import { losehp } from './hack.js';
import { delobj, monkilled, monstone, newcham, resists_ston, seemimic,
         vamp_stone, xkilled } from './mon.js';
import { find_mac, m_dowear, which_armor } from './worn.js';
import { canseemon } from './display.js';
import { cansee } from './vision.js';
import { gender, passes_walls, likes_lava, throws_rocks,
         poly_when_stoned, touch_petrifies } from './mondata.js';
import { has_ceiling, Can_fall_thru, depth, level_difficulty } from './dungeon.js';
import { Monnam, pmname, rndcolor } from './do_name.js';
import { MATERIALS } from './objects_data.js';
import { W_ARMF, A_DEX, A_CON, NO_PART } from './const.js';
import { d, rn1 } from './rng.js';
import { ACURR, exercise, poisoned } from './attrib.js';
import { ONAMES } from './objects_data.js';
import { KILLED_BY_AN, A_STR } from './const.js';
import { W_SADDLE, NO_TRAP_FLAGS, HEAD, ARM, W_ARMH, W_ARMS, W_ARMG,
         W_ARMC, W_ARM, W_ARMU, W_WEP, W_SWAPWEP, MAX_ERODE,
         W_ARMOR, W_ACCESSORY, W_ART,
         ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ERODE_CRACK,
         EF_NONE, EF_GREASE, EF_VERBOSE, EF_PAY, EF_DESTROY,
         ER_NOTHING, ER_DAMAGED, ER_DESTROYED } from './const.js';
import { rnl } from './rng.js';
import { spoteffects } from './hack.js';
import { is_animal } from './mondata.js';
import { makeplural } from './objnam.js';
import { flooreffects } from './do.js';
import { dismount_steed } from './steed.js';
import { DISMOUNT_GENERIC, I_SPECIAL, W_ARTI, TT_NONE, LEG } from './const.js';
import { float_vs_flight } from './polyself.js';
import { body_part, mbodypart, polymon } from './polyself.js';
import { mon_nam } from './do_name.js';
import { MON_WEP, DEADMONSTER, helpless, is_vampshifter } from './monst.js';
import { erosion_matters } from './mkobj.js';
import { cxname, vtense, suit_simple_name,
         gloves_simple_name } from './objnam.js';
import { helm_simple_name, cloak_simple_name, hard_helmet } from './do_wear.js';
import { update_inventory } from './invent.js';
import { OCLASSES } from './objects_data.js';
import { is_pool, is_lava } from './mon.js';
import { encumber_msg } from './attrib.js';
import { nomul } from './hack.js';
import { pickup } from './pickup.js';
import { surface, In_sokoban } from './dungeon.js';
import { Is_airlevel, Is_waterlevel, In_endgame } from './const.js';
import { count_wsegs } from './worm.js';
import { defends_when_carried } from './artifact.js';
import { ART_MAGICBANE } from './artilist_data.js';
import { is_quest_artifact } from './questpgr.js';
import { mwepgone } from './weapon.js';

/* src/trap.h — trapeffect_*() return values. */
/* include/trap.h:98-101 — Trap_Is_Gone shares 0 with Finished. */
export const Trap_Effect_Finished = 0, Trap_Is_Gone = 0,
      Trap_Caught_Mon = 1, Trap_Killed_Mon = 2, Trap_Moved_Mon = 3;

function note_unported_trap(what) {
    (game.unported ||= new Set()).add(what);
}

/* include/youprop.h */
const Lifesaved = () => !!game.u.uprops?.LIFESAVED;
const Punished = () => !!game.u.uball;
const Maybe_Half_Phys = (dmg) =>
    (game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
        ? Math.trunc((dmg + 1) / 2) : dmg;
/* include/you.h:464 Luck */
const Luck = () => (game.u.uluck | 0) + (game.u.moreluck | 0);
/* include/mkobj.h is_organic() */
const is_organic = (o) => game.objects[o.otyp].oc_material <= MATERIALS.WOOD;
/* src/trap.c:6788 */
const lava_killer = 'molten lava';
/* include/dungeon.h on_level() */
const on_level = (a, b) => !!a && !!b && a.dnum === b.dnum && a.dlevel === b.dlevel;
/* src/trap.c:2527 trapeffect_landmine()'s static */
let recursive_mine = false;

// src/trap.c:3844 instapetrify()
export async function instapetrify(str) {
    if (Stone_resistance())
        return;
    if (poly_when_stoned(game.youmonst.data)
        && await polymon(PMNAMES.PM_STONE_GOLEM))
        return;
    await urgent_pline('You turn to stone...');
    game.killer = { format: KILLED_BY, name: str || '' };
    await done(STONING);
}

// src/trap.c:3856 minstapetrify(). Monster petrification first converts a
// susceptible golem, otherwise strips intrinsic speed, reports the visible
// countdown, and creates a statue through the player or environmental kill
// path. Shifted vampires and naturally stone-resistant shapechangers revert
// first through src/mon.c vamp_stone().
export async function minstapetrify(mon, byplayer) {
    if (resists_ston(mon))
        return;

    if (poly_when_stoned(mon.data)) {
        if (canseemon(mon))
            await pline(`${Monnam(mon)} solidifies...`);
        if (await newcham(mon, game.mons[PMNAMES.PM_STONE_GOLEM], 0)) {
            if (canseemon(mon))
                await pline(`Now it's ${an(pmname(mon.data, gender(mon)))}.`);
        } else if (canseemon(mon)) {
            await pline('... and returns to normal.');
        }
        return;
    }

    if (!await vamp_stone(mon))
        return;

    if ((mon.permspeed | 0) === MFAST)
        mon.permspeed = 0;
    const speedArmor = (mon.minvent || []).find((obj) =>
        obj.owornmask && game.objects[obj.otyp]?.oc_oprop === FAST);
    mon.mspeed = speedArmor ? MFAST : (mon.permspeed | 0);

    if (mon.data.mmove && !mon.mfrozen && !mon.msleeping && canseemon(mon)
        && game.flags?.verbose !== false)
        await pline(`${Monnam(mon)} is slowing down.`);

    if (cansee(mon.mx, mon.my))
        await pline(`${Monnam(mon)} turns to stone.`);
    if (byplayer) {
        game.stoned = true;
        await xkilled(mon, XKILL_NOMSG);
    } else {
        await monstone(mon);
    }
}

/* src/hacklib.c exclam() — the punctuation a damage amount earns. */
const exclam = (force) => (force < 0 ? '?' : (force <= 4) ? '.' : '!');
import { In_quest, TOOKPLUNGE, VIASITTING, HURTLING,
         ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
         ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
         SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
         WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP,
         VIBRATING_SQUARE, BOLT_LIM, WT_ELF, VAULT, TEMPLE, SHOPBASE,
         Is_firelevel, Is_earthlevel, IS_AIR, IS_ROOM,
         IS_WALL, IS_DOOR, SDOOR, MIGR_RANDOM, MIGR_PORTAL, MON_MIGRATING,
         NO_MM_FLAGS, NO_MINVENT, MM_ADJACENTOK, MM_MALE, MM_FEMALE,
         MM_NOMSG, ANIMATE_NORMAL, ANIMATE_SHATTER, ANIMATE_SPELL,
         CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, TIMEOUT }
    from './const.js';
import { just_an } from './objnam.js';
import { Deaf, Levitation, Flying, Hallucination, Underwater, Blind,
         See_invisible, Invis } from './youprop.js';
import { mindless } from './mondata.js';
import { couldsee } from './vision.js';
import { mdistu } from './monmove.js';
import { wake_nearby, wake_nearto } from './mon.js';
import { MFLAGS, PMNAMES, ATTKS, MONSYMS } from './monst_data.js';
import { is_pit, is_hole, TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA,
         TT_INFLOOR, Upolyd, LEFT_SIDE, RIGHT_SIDE,
         TT_BURIEDBALL } from './const.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { xytodir } from './cmd.js';
import { mons_see_trap } from './mondata.js';
const CM_S_arrow_trap = cmap_names.S_arrow_trap;
import { set_wounded_legs } from './do.js';
import { obj_extract_self, sobj_at } from './invent.js';
import { metallivorous } from './mondata.js';
import { amorphous, is_whirly, unsolid, is_clinger, is_floater, is_flyer,
         webmaker, nohands, defended, resists_fire, resists_sleep, breathless,
         resists_magm, resists_blnd, flaming, acidic, stagger,
         attacktype, nonliving } from './mondata.js';
import { ECMD_OK } from './const.js';

// src/trap.c:6694 b_trapped(), shared by trapped doors and tins.
export async function b_trapped(item, bodypart) {
    const lvl = level_difficulty();
    let dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2)));
    await pline(`KABOOM!!  The ${item} was booby-trapped!`);
    await wake_nearby(false);
    if (game.u.uprops?.HALF_PHYS)
        dmg = Math.trunc((dmg + 1) / 2);
    await losehp(dmg, 'explosion', KILLED_BY_AN);
    exercise(A_STR, false);
    if (bodypart !== NO_PART)
        exercise(A_CON, false);
    const oldStun = game.u.intrinsic?.HStun | 0;
    const { make_stunned } = await import('./potion.js');
    await make_stunned(oldStun + dmg, true);
}

const relative_age_light = (obj) => obj.otyp === ONAMES.BRASS_LANTERN
    || obj.otyp === ONAMES.OIL_LAMP
    || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
    || obj.otyp === ONAMES.TALLOW_CANDLE
    || obj.otyp === ONAMES.WAX_CANDLE
    || obj.otyp === ONAMES.POT_OIL;

function exposed_light_location(obj) {
    if (obj.where === OBJ_INVENT || game.invent.includes(obj))
        return { x: game.u.ux, y: game.u.uy };
    if (obj.where === OBJ_FLOOR)
        return { x: obj.ox, y: obj.oy };
    if (obj.where === OBJ_MINVENT) {
        const carrier = obj.ocarry || (game.level?.monsters || []).find(
            mon => (mon.minvent || []).includes(obj));
        if (carrier)
            return { x: carrier.mx, y: carrier.my };
    }
    return null;
}

// src/apply.c:1577 catch_lit(). External fire can light every exposed fuel
// source except a lantern, a spent source, an empty or cursed Candelabrum,
// and half of cursed oil-lamp attempts.
export async function catch_lit(obj) {
    const ignitable = obj.otyp === ONAMES.BRASS_LANTERN
        || obj.otyp === ONAMES.OIL_LAMP
        || (obj.otyp === ONAMES.MAGIC_LAMP && (obj.spe | 0) > 0)
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.TALLOW_CANDLE
        || obj.otyp === ONAMES.WAX_CANDLE
        || obj.otyp === ONAMES.POT_OIL;
    const location = exposed_light_location(obj);
    if (obj.lamplit || !ignitable || !location)
        return false;
    if (((obj.otyp === ONAMES.MAGIC_LAMP
          || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION)
         && !(obj.spe | 0))
        || (relative_age_light(obj) && !(obj.age | 0))
        || obj.otyp === ONAMES.BRASS_LANTERN
        || (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION && obj.cursed)
        || ((obj.otyp === ONAMES.OIL_LAMP
             || obj.otyp === ONAMES.MAGIC_LAMP)
            && obj.cursed && !rn2(2)))
        return false;

    if (obj.where === OBJ_INVENT || game.invent.includes(obj)
        || cansee(location.x, location.y)) {
        await pline(`${Yname2(obj)} ${otense(obj, Blind() ? 'feel' : 'catch')} ${
            Blind() ? 'warm.' : 'light!'}`);
    }
    if (obj.otyp === ONAMES.POT_OIL)
        makeknown(obj.otyp);
    if ((obj.where === OBJ_INVENT || game.invent.includes(obj)) && obj.unpaid) {
        const { costly_spot, check_unpaid, bill_dummy_object } =
            await import('./shk.js');
        if (costly_spot(game.u.ux, game.u.uy)) {
            await check_unpaid(obj);
            await pline(`"That's in addition to the cost of ${yname(obj)} ${
                obj.quan === 1 ? 'itself' : 'themselves'}, of course."`);
            bill_dummy_object(obj);
        }
    }

    const { begin_burn } = await import('./timeout.js');
    await begin_burn(obj, false);
    return true;
}

// src/trap.c:7161 ignite_items(). Only exposed objects are supplied by
// callers; an item currently being consumed is skipped just as in C.
export async function ignite_items(items) {
    for (const item of items || []) {
        if (!item.lamplit && !item.in_use)
            await catch_lit(item);
    }
}

// src/trap.c:4233 dofiretrap(), hero and chest form.
async function dofiretrap(box) {
    const origDmg = d(2, 4);
    let num = origDmg;
    const source = the(box ? xname(box)
                           : surface(game.u.ux, game.u.uy));

    await pline(`A tower of flame ${box ? 'bursts' : 'erupts'} from ${source}!`);
    if (Fire_resistance()) {
        num = rn2(2);
    } else {
        num = d(2, 4);
        const minHp = Math.max(game.u.ulevel | 0, 1);
        if (game.u.uhpmax > minHp) {
            game.u.uhpmax -= rn2(Math.min(game.u.uhpmax, num + 1));
            (game.disp ||= {}).botl = true;
        }
        if (game.u.uhpmax < minHp)
            game.u.uhpmax = minHp;
        if (game.u.uhp > game.u.uhpmax)
            game.u.uhp = game.u.uhpmax;
    }

    if (!num)
        await You('are uninjured.');
    else
        await losehp(num, 'tower of flame', KILLED_BY_AN);

    if (await burnarmor(game.youmonst) || rn2(3)) {
        await destroy_items(game.youmonst, ATTKS.AD_FIRE, origDmg);
        await ignite_items(game.invent);
    }
    if (await burn_floor_objects(game.u.ux, game.u.uy, !Blind(), true)
        && Blind())
        await You('smell paper burning.');
    const { is_ice } = await import('./dbridge.js');
    if (is_ice(game.u.ux, game.u.uy))
        await melt_ice(game.u.ux, game.u.uy);
}

// src/trap.c:6294 chest_trap(), the full luck and effect outcome tables.
export async function chest_trap(obj, bodypart, disarm) {
    obj.tknown = 0;
    obj.otrapped = 0;
    await You(disarm ? 'set it off!' : 'trigger a trap!');
    await display_nhwindow_message();

    const luck = (game.u.uluck | 0) + (game.u.moreluck | 0);
    if (luck > -13 && rn2(13 + luck) > 7) {
        const outcome = rn2(13);
        const msg = outcome >= 11 ? 'explosive charge is a dud'
                    : outcome >= 9 ? 'electric charge is grounded'
                      : outcome >= 7 ? 'flame fizzles out'
                        : outcome >= 4 ? 'poisoned needle misses'
                          : 'gas cloud blows away';
        await pline(`But luckily the ${msg}!`);
    } else {
        const outcome = rn2(20)
            ? (luck >= 13 ? 0 : rn2(13 - luck))
            : rn2(26);
        let destroyed = false;

        if (outcome >= 21) {
            const ox = obj.ox, oy = obj.oy;
            await pline(`${upstart(the(xname(obj)))} explodes!`);
            obj.cobj = [];
            const { delobj } = await import('./mon.js');
            for (const floorObj of [...(game.level?.objects || [])]) {
                if (floorObj.ox === ox && floorObj.oy === oy) {
                    if (floorObj === obj)
                        destroyed = true;
                    delobj(floorObj);
                }
            }
            await wake_nearby(false);
            let damage = d(6, 6);
            if (game.u.uprops?.HALF_PHYS)
                damage = Math.trunc((damage + 1) / 2);
            await losehp(damage, `exploding ${xname(obj)}`, KILLED_BY_AN);
            exercise(A_STR, false);
            newsym(ox, oy);
        } else if (outcome >= 17) {
            await pline(`A cloud of noxious gas billows from ${the(xname(obj))}.`);
            if (rn2(3)) {
                const { poisoned } = await import('./attrib.js');
                await poisoned('gas cloud', A_STR, 'cloud of poison gas',
                               15, false);
            } else {
                const { create_gas_cloud } = await import('./region.js');
                create_gas_cloud(obj.ox, obj.oy, 1, 8);
            }
            exercise(A_CON, false);
        } else if (outcome >= 13) {
            await You_feel(`a needle prick your ${body_part(bodypart)}.`);
            const { poisoned } = await import('./attrib.js');
            await poisoned('needle', A_CON, 'poisoned needle', 10, false);
            exercise(A_CON, false);
        } else if (outcome >= 9) {
            await dofiretrap(obj);
        } else if (outcome >= 6) {
            let damage = d(4, 4);
            const origDmg = damage;
            await You('are jolted by a surge of electricity!');
            if (Shock_resistance()) {
                await You("don't seem to be affected.");
                damage = 0;
            }
            await destroy_items(game.youmonst, ATTKS.AD_ELEC, origDmg);
            if (damage)
                await losehp(damage, 'electric shock', KILLED_BY_AN);
        } else if (outcome >= 3) {
            if (!game.u.uprops?.FREE_ACTION) {
                await pline('Suddenly you are frozen in place!');
                nomul(-d(5, 6));
                game.multi_reason = 'frozen by a trap';
                game.nomovemsg = 'You can move again.';
                exercise(A_DEX, false);
            } else {
                await You('momentarily stiffen.');
            }
        } else {
            await pline(`A cloud of ${Blind() ? 'pungent' : rndcolor()
                } gas billows from ${the(xname(obj))}.`);
            const oldStun = (game.u.intrinsic?.HStun | 0) & TIMEOUT;
            if (!oldStun) {
                if (Hallucination())
                    await pline('What a groovy feeling!');
                else
                    await You(`${stagger(game.youmonst.data, 'stagger')}${
                        Halluc_resistance() ? ''
                        : Blind() ? ' and get dizzy'
                          : ' and your vision blurs'}...`);
            }
            const { make_stunned, make_hallucinated } =
                await import('./potion.js');
            await make_stunned(oldStun + rn1(7, 16), false);
            const oldHallu = (game.u.intrinsic?.HHallucination | 0) & TIMEOUT;
            await make_hallucinated(oldHallu + rn1(5, 16), false, 0);
        }

        (game.disp ||= {}).botl = true;
        if (destroyed)
            return true;
    }
    obj.tknown = 1;
    return false;
}

// src/trap.c:5250 dountrap() and the preliminary could_untrap() checks.
export async function dountrap() {
    const mdat = game.youmonst.data;
    if ((nohands(mdat) && !webmaker(mdat)) || !mdat.mmove) {
        await pline('And just how do you expect to do that?');
        return ECMD_OK;
    }
    const { getdir } = await import('./cmd.js');
    if (!(await getdir(null)))
        return ECMD_OK;
    (game.unported ||= new Set()).add('trap:dountrap');
    return ECMD_OK;
}

// include/rm.h:538 Sokoban — the level flag, not the dungeon branch.
// (lspo_level_flags stores 1, not true, so no strict-equality test here.)
const Sokoban = () => !!game.level?.flags?.sokoban_rules;

// src/dungeon.c dunlevs_in_dungeon()
function dunlevs_in_dungeon(lev) {
    return game.dungeons[lev.dnum].num_dunlevs;
}

// src/dungeon.c dunlev()
function dunlev(lev) {
    return lev.dlevel;
}

// include/dungeon.h In_hell() — the Gehennom branch.
function In_hell(lev) {
    return game.dungeons?.[lev.dnum]?.flags?.hellish === true;
}

// src/trap.c:418 dng_bottom() — how far down a hole can reach, stopping at the
// quest's locate level and, before the invocation, one short of Gehennom's.
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level?.dlevel ?? bottom;
        if ((game.dungeons[lev.dnum].dunlev_ureached ?? 0) < qlocate_depth)
            bottom = qlocate_depth;
    } else if (In_hell(lev)) {
        if (!game.u?.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// src/trap.c:442 hole_destination() — where a hole or trapdoor drops you.
//
// One rn2(4) per level of descent, so it usually stops after a single draw but
// occasionally tunnels several levels down. maketrap() calls this at CREATION
// time for every HOLE and TRAPDOOR, which is why a level with a trapdoor on it
// costs draws the rest of the stream depends on.
export function hole_destination(dst) {
    const bottom = dng_bottom(game.u.uz);

    dst.dnum = game.u.uz.dnum;
    dst.dlevel = dunlev(game.u.uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}

// src/trap.c:1061 floor_trigger() — is this trap one that fires by being
// stepped ON, as opposed to one that catches anything passing through?
// src/trap.c:1035 set_utrap() — trap the hero for tim turns (0 frees).
export function set_utrap(tim, typ) {
    /* if we get here through reset_utrap(), the caller of that might
       have already set u.utrap to 0 so this check won't be sufficient
       in that situation; caller will need to set context.botl itself */
    if ((!game.u.utrap) !== (!tim))
        (game.disp ||= {}).botl = true;
    game.u.utrap = tim;
    game.u.utraptype = tim ? typ : TT_NONE;
    float_vs_flight(); /* maybe block Lev and/or Fly */
}

// src/trap.c:1046 reset_utrap() — free the hero; with msg, a suppressed
// levitation or flight resumes with its message.
export async function reset_utrap(msg) {
    const was_Lev = Levitation(), was_Fly = Flying();
    set_utrap(0, 0);
    if (msg) {
        if (!was_Lev && Levitation())
            await float_up();
        if (!was_Fly && Flying())
            await You('can fly.');
    }
}

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

// src/trap.c:1085 check_in_air() — is this monster off the ground, allowing
// for the trap flags? A flyer that was pushed or sat down is NOT in the air.
function check_in_air(mtmp, trflags) {
    const plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;

    return ((trflags & HURTLING) !== 0
            || is_floater(mtmp.data)
            || (is_flyer(mtmp.data) && !plunged));
}

// src/trap.c:1106 m_harmless_trap() — would this trap actually hurt `mtmp`?
//
// mfndpos() calls it to decide whether a square holding a trap is worth
// refusing. Nothing here draws; every arm is a species or resistance test.
//
// The opening line covers most of it: anything that triggers by being stepped
// on does nothing to a monster that is in the air. Sokoban suppresses that,
// because its pits and holes are the puzzle.
export function m_harmless_trap(mtmp, ttmp) {
    const mdat = mtmp.data;

    if (!Sokoban() && floor_trigger(ttmp.ttyp) && check_in_air(mtmp, 0))
        return true;

    switch (ttmp.ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
        break;
    case BEAR_TRAP:
        if (mdat.msize <= MFLAGS.MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mtmp) || defended(mtmp, ATTKS.AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mdat.pmidx !== PMNAMES.PM_IRON_GOLEM)
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mtmp) || defended(mtmp, ATTKS.AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat) && !Sokoban())
            return true;
        break;
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
        break;
    case WEB:
        if (amorphous(mdat) || webmaker(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case STATUE_TRAP:
        return true;
    case MAGIC_TRAP:
        return true;                    /* usually */
    case ANTI_MAGIC:
        if (resists_magm(mtmp) || defended(mtmp, ATTKS.AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        break;                          /* impossible() */
    }

    return false;
}

// src/trap.c:6776 unconscious()
export function unconscious() {
    if ((game.multi ?? 0) >= 0)
        return false;

    return !!(game.u.usleep
              || (game.nomovemsg
                  && (game.nomovemsg.startsWith("You awake")
                      || game.nomovemsg.startsWith("You regain con")
                      || game.nomovemsg.startsWith("You are consci"))));
}


// src/trap.c:3578 seetrap() — the hero notices a trap.
export function seetrap(trap) {
    if (!trap.tseen) {
        trap.tseen = 1;
        newsym(trap.tx, trap.ty);
    }
}

// src/trap.c:6531 deltrap() — take a trap off the level.
export function deltrap(trap) {
    const list = game.level?.traps;
    if (!list) return;
    const i = list.indexOf(trap);
    if (i >= 0) list.splice(i, 1);
}

// src/trap.c:726 animate_statue(). The common path creates the depicted
// monster without a fresh inventory, transfers the statue's stored gear, and
// consumes the statue only after the monster and its message exist.
export async function animate_statue(statue, x, y, cause) {
    const mptr = game.mons?.[statue?.corpsenm];
    if (!mptr)
        return null;

    const saved = statue.omonst || statue.oextra?.omonst;
    if (saved)
        note_unported_trap('animate_statue:saved_traits');

    let mmflags = NO_MINVENT | MM_NOMSG;
    const statueGender = (statue.spe | 0) & CORPSTAT_GENDER;
    if (statueGender === CORPSTAT_MALE)
        mmflags |= MM_MALE;
    else if (statueGender === CORPSTAT_FEMALE)
        mmflags |= MM_FEMALE;
    if (cause === ANIMATE_SPELL)
        mmflags |= MM_ADJACENTOK;

    const mon = makemon(mptr, x, y, mmflags);
    if (!mon)
        return null;

    const statueName = statue.oname || statue.oextra?.oname;
    if (statueName) {
        const { christen_monst } = await import('./do_name.js');
        christen_monst(mon, statueName);
    }
    if (mon.m_ap_type)
        seemimic(mon);
    else
        mon.mundetected = 0;
    mon.msleeping = 0;

    if (cause === ANIMATE_NORMAL || cause === ANIMATE_SHATTER) {
        mon.mtame = 0;
        mon.mpeaceful = 0;
        set_malign(mon);
    }

    const comesToLife = !canspotmon(mon) ? 'disappears'
        : (nonliving(mon.data) || is_vampshifter(mon)) ? 'moves'
        : 'comes to life';
    if ((game.u.ux === x && game.u.uy === y) || cause === ANIMATE_SPELL) {
        const subject = cause === ANIMATE_SPELL
            ? upstart(the(xname(statue))) : 'The statue';
        await pline(`${subject} ${comesToLife}!`);
    } else if (Hallucination()) {
        await pline(`The ${rndmonnam()} suddenly seems more animated.`);
    } else if (cause === ANIMATE_SHATTER) {
        const subject = cansee(x, y) ? the(xname(statue)) : 'a statue';
        await pline(`Instead of shattering, ${subject} suddenly ${comesToLife}!`);
    } else {
        const { stop_occupation } = await import('./allmain.js');
        await stop_occupation();
        await You(`find ${canspotmon(mon) ? a_monnam(mon) : 'something'} posing as a statue.`);
    }

    const { mpickobj } = await import('./steal.js');
    for (const item of [...(statue.cobj || [])]) {
        obj_extract_self(item);
        mpickobj(mon, item);
    }
    m_dowear(mon, true);
    delobj(statue);
    return mon;
}

// src/trap.c:908 activate_statue_trap(). Removing the trap first is
// observable when monster placement or statue animation fails.
export async function activate_statue_trap(trap, x, y, shatter) {
    deltrap(trap);
    const statue = sobj_at(ONAMES.STATUE, x, y);
    const mon = statue
        ? await animate_statue(statue, x, y,
                               shatter ? ANIMATE_SHATTER : ANIMATE_NORMAL)
        : null;
    feel_newsym(x, y);
    return mon;
}

// src/trap.c:1018 t_missile() — the projectile a trap fires.
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);

    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx;
    otmp.oy = trap.ty;
    return otmp;
}

// src/trap.c:1250 trapeffect_dart_trap() — the hero's arm.
//
// Draw order: the once/tseen rn2(15) disarm check, then t_missile's mksobj,
// then the rn2(6) poison roll, then dmgval, then thitu's rnd(20).
// src/trap.c trapeffect_arrow_trap()
async function trapeffect_arrow_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        if (trap.once && trap.tseen && !rn2(15)) {
            await You_hear('a loud click!');
            deltrap(trap);
            newsym(game.u.ux, game.u.uy);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        seetrap(trap);
        await pline('An arrow shoots out at you!');
        const otmp = t_missile(ONAMES.ARROW, trap);
        const dam = dmgval(otmp, game.youmonst);
        if (game.u.usteed && !rn2(2) && await steedintrap(trap, otmp)) {
            ; /* nothing */
        } else if (await thitu(8, dam, { obj: otmp }, 'arrow')) {
            /* obfree(otmp) — the arrow is destroyed */
        } else {
            place_object(otmp, game.u.ux, game.u.uy);
            if (!game.u.ublind)
                observe_object(otmp);
            const { stackobj } = await import('./invent.js');
            stackobj(otmp);
            newsym(game.u.ux, game.u.uy);
        }
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    const see_it = cansee(mtmp.mx, mtmp.my);
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        if (in_sight && see_it)
            await pline(`${Monnam(mtmp)} triggers a trap but nothing happens.`);
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }
    trap.once = 1;
    const otmp = t_missile(ONAMES.ARROW, trap);
    if (in_sight)
        seetrap(trap);
    if (await thitm(8, mtmp, otmp, 0, false))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}

async function trapeffect_dart_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        /* src/trap.c dart monster arm */
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline(`${Monnam(mtmp)} triggers a trap but nothing happens.`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        const otmp = t_missile(ONAMES.DART, trap);
        if (!rn2(6))
            otmp.opoisoned = 1;
        if (in_sight)
            seetrap(trap);
        if (await thitm(7, mtmp, otmp, 0, false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }

    if (trap.once && trap.tseen && !rn2(15)) {
        await You_hear('a soft click.');
        deltrap(trap);
        newsym(game.u.ux, game.u.uy);
        return Trap_Is_Gone;
    }
    const oldumort = game.u.umortality | 0;
    trap.once = 1;
    seetrap(trap);
    await pline('A little dart shoots out at you!');
    let otmp = t_missile(ONAMES.DART, trap);
    if (!rn2(6))
        otmp.opoisoned = 1;
    const dam = dmgval(otmp, game.youmonst);
    if (game.u.usteed && !rn2(2) && await steedintrap(trap, otmp)) {
        ; /* nothing */
    } else if (await thitu(7, dam, { obj: otmp }, 'little dart')) {
        if (otmp.opoisoned)
            await poisoned('dart', A_CON, 'little dart',
                           /* if damage triggered life-saving,
                              poison is limited to attrib loss */
                           ((game.u.umortality | 0) > oldumort) ? 0 : 10, true);
        obfree(otmp, null);
    } else {
        place_object(otmp, game.u.ux, game.u.uy);
        if (!game.u.ublind)
            observe_object(otmp);
        /* js/invent.js is reached through a cycle from here (trap -> invent
           -> pickup -> hack -> trap), so stackobj is bound at call time. */
        const { stackobj } = await import('./invent.js');
        stackobj(otmp);
        newsym(game.u.ux, game.u.uy);
    }
    return Trap_Effect_Finished;
}

// src/dungeon.c:1714 ceiling(), used by the falling-rock message.
function trap_ceiling(x, y) {
    const lev = game.level?.at(x, y);

    if (in_rooms(x, y, VAULT))
        return "vault's ceiling";
    if (in_rooms(x, y, TEMPLE))
        return "temple's ceiling";
    if (in_rooms(x, y, SHOPBASE))
        return "shop's ceiling";
    if (Is_waterlevel(game.u.uz))
        return 'water above';
    if (lev && IS_AIR(lev.typ))
        return 'sky';
    if (Is_firelevel(game.u.uz))
        return 'flames above';
    if (In_quest(game.u.uz))
        return 'expanse above';
    if (Underwater())
        return "water's surface";
    if (lev && ((IS_ROOM(lev.typ) && !Is_earthlevel(game.u.uz))
                || IS_WALL(lev.typ) || IS_DOOR(lev.typ)
                || lev.typ === SDOOR))
        return 'ceiling';
    return 'rock cavern';
}

// src/trap.c:1324 trapeffect_rocktrap(). The missile is always created before
// the 2d6 damage roll for monsters, and it lands on the monster's square.
async function trapeffect_rocktrap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        if (trap.once && trap.tseen && !rn2(15)) {
            await pline(`A trap door in ${the(trap_ceiling(game.u.ux, game.u.uy))} opens, but nothing falls out!`);
            deltrap(trap);
            newsym(game.u.ux, game.u.uy);
            return Trap_Effect_Finished;
        }

        let dmg = d(2, 6);
        let harmless = false;
        trap.once = 1;
        feeltrap(trap);
        const otmp = t_missile(ONAMES.ROCK, trap);
        place_object(otmp, game.u.ux, game.u.uy);

        await pline(`A trap door in ${the(trap_ceiling(game.u.ux, game.u.uy))} opens and ${an(xname(otmp))} falls on your ${body_part(HEAD)}!`);
        const uarmh = game.u.uarmh;
        const passes_rocks = passes_walls(game.youmonst.data)
                              && !unsolid(game.youmonst.data);
        if (uarmh) {
            if (passes_rocks) {
                await pline(`Unfortunately, you are wearing ${an(helm_simple_name(uarmh))}.`);
                dmg = 2;
            } else if (hard_helmet(uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                dmg = 2;
            } else if (game.flags?.verbose !== false) {
                await pline(`${Yname2(uarmh)} does not protect you.`);
            }
        } else if (passes_rocks) {
            await pline('It passes harmlessly through you.');
            harmless = true;
        }
        if (!game.u.ublind)
            observe_object(otmp);
        const { stackobj } = await import('./invent.js');
        stackobj(otmp);
        newsym(game.u.ux, game.u.uy);

        if (!harmless) {
            if (game.u.uprops?.HALF_PHDAM)
                dmg = Math.trunc((dmg + 1) / 2);
            await losehp(dmg, 'falling rock', KILLED_BY_AN);
            exercise(A_STR, false);
        }
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    const see_it = cansee(mtmp.mx, mtmp.my);
    if (trap.once && trap.tseen && !rn2(15)) {
        if (in_sight && see_it)
            await pline(`A trap door above ${mon_nam(mtmp)} opens, but nothing falls out!`);
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }

    trap.once = 1;
    const otmp = t_missile(ONAMES.ROCK, trap);
    if (in_sight)
        seetrap(trap);
    const trapkilled = await thitm(0, mtmp, otmp, d(2, 6), false);
    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}

// src/mthrowu.c:96 thitu() — does a trap's or monster's missile hit the hero?
//
// The rnd(20) is spent whatever the outcome; everything after it is message
// and damage. Returns 1 on a hit.
export async function thitu(tlev, dam, objp, name) {
    const obj = objp ? objp.obj : null;

    /* src/mthrowu.c:87 — a null name comes from m_throw; format the missile
       itself, "the Nth arrow" during a volley. C panics when both are null. */
    if (!name)
        name = (obj && obj.quan > 1) ? doname(obj) : mshot_xname(obj);
    const onm = (obj && obj.oartifact) ? the(name)
                : (obj && obj.quan > 1) ? name
                  : an(name);
    const dieroll = rnd(20);

    if (game.u.uac + tlev <= dieroll) {
        game.mesg_given = (game.mesg_given | 0) + 1;
        if (game.u.ublind || game.flags?.verbose === false)
            await pline('It misses.');
        else if (game.u.uac + tlev <= dieroll - 2)
            await pline(`${upstart(onm)} misses you.`);
        else
            await You(`are almost hit by ${onm}.`);
        return 0;
    }

    if (game.u.ublind || game.flags?.verbose === false)
        await You(`are hit${exclam(dam)}`);
    else
        await You(`are hit by ${onm}${exclam(dam)}`);

    await losehp(dam, name, KILLED_BY_AN);
    exercise(A_STR, false);
    return 1;
}

// src/trap.c:7100 trapname()
export function trapname(ttyp, override) { /* if True, ignore Hallucination */
    const halu_trapnames = [
        /* riffs on actual nethack traps */
        'bottomless pit', 'polymorphism trap', 'devil teleporter',
        'falling boulder trap', 'anti-anti-magic field', 'weeping gas trap',
        'queasy board', 'electrified web', 'owlbear trap', 'sand mine',
        'vacillating triangle',
        /* some traps found in nethack variants */
        'death trap', 'disintegration trap', 'ice trap', 'monochrome trap',
        /* plausible real-life traps */
        'axeblade trap', 'pool of boiling oil', 'pool of quicksand',
        'field of caltrops', 'buzzsaw trap', 'spiked floor', 'revolving wall',
        'uneven floor', 'finger trap', 'jack-in-a-box', 'yellow snow',
        'booby trap', 'rat trap', 'poisoned nail', 'snare', 'whirlpool',
        'trip wire', 'roach motel (tm)',
        /* sci-fi */
        'negative space', 'tensor field', 'singularity', 'imperial fleet',
        'black hole', 'thermal detonator', 'event horizon',
        'entoptic phenomenon',
        /* miscellaneous suggestions */
        'sweet-smelling gas vent', 'phone booth', 'exploding runes',
        'never-ending elevator', 'slime pit', 'warp zone', 'illusory floor',
        'pile of poo', 'honey trap', 'tourist trap',
        'banana peel', 'garden rake', 'whoopie cushion', 'box and stick trap',
        'fly trap', 'legal trap', 'pit of snakes', 'pollywog trap',
        'slippery slope', 'thirst trap', 'suntrap',
    ];

    if (Hallucination() && !override) {
        const total_names = TRAPNUM + halu_trapnames.length;
        let nameidx = rn2_on_display_rng(total_names + 1);

        if (nameidx === total_names) {
            const fem = Upolyd(game.u) ? !!game.u.mfemale : !!game.flags.female;
            let roletrap;

            /* inspired by "tourist trap" */
            roletrap = (rn2(3) ? ((fem && game.urole.name.f) ? game.urole.name.f
                                                             : game.urole.name.m)
                               : rank_of(game.u.ulevel, game.urole, fem))
                       .slice(0, 33 - ' trap'.length - 1); /* copynchars */
            roletrap += ' trap';
            return roletrap.toLowerCase(); /* lcase */
        } else if (nameidx >= TRAPNUM) {
            nameidx -= TRAPNUM;
            return halu_trapnames[nameidx];
        } /* else use an actual trap type */
        if (nameidx !== NO_TRAP)
            ttyp = nameidx;
    }
    return defsyms[CM_S_arrow_trap + ttyp - 1].explain;
}

// src/trap.c:6552 conjoined_pits() — did the hero step between two pits dug
// into each other? False-fast unless currently in a pit.
export function conjoined_pits(trap2, trap1, u_entering_trap2) {
    if (!trap1 || !trap2)
        return false;
    if (!isok(trap2.tx, trap2.ty) || !isok(trap1.tx, trap1.ty)
        || !is_pit(trap2.ttyp) || !is_pit(trap1.ttyp)
        || (u_entering_trap2
            && !(game.u.utrap && game.u.utraptype === TT_PIT)))
        return false;
    const dx = Math.sign(trap2.tx - trap1.tx);
    const dy = Math.sign(trap2.ty - trap1.ty);
    const diridx = xytodir(dx, dy);
    if (diridx !== -1 /* DIR_ERR */) {
        const adjidx = (diridx + 4) % 8;    /* DIR_180 */
        if (((trap1.conjoined | 0) & (1 << diridx))
            && ((trap2.conjoined | 0) & (1 << adjidx)))
            return true;
    }
    return false;
}

// src/trap.c:6604 adj_nonconjoined_pit()
function adj_nonconjoined_pit(adjtrap) {
    const trap_with_u = t_at_mon(game.u.ux0 ?? 0, game.u.uy0 ?? 0);
    if (trap_with_u && adjtrap && game.u.utrap
        && game.u.utraptype === TT_PIT
        && is_pit(trap_with_u.ttyp) && is_pit(adjtrap.ttyp)) {
        if (xytodir(game.u.dx, game.u.dy) !== -1)
            return true;
    }
    return false;
}

// src/trap.c:1188 dotrap() — the hero steps on a trap.
//
// Only the arms whose effects are ported dispatch; every other trap type is
// recorded, so a session that walks onto one is visibly incomplete rather
// than silently wrong.
export async function dotrap(trap, trflags) {
    const ttype = trap.ttyp;
    const already_seen = !!trap.tseen;
    let forcetrap = ((trflags & FORCETRAP) !== 0
                     || (trflags & FAILEDUNTRAP) !== 0);
    const forcebungle = (trflags & FORCEBUNGLE) !== 0;
    const plunged = (trflags & TOOKPLUNGE) !== 0;
    const conj_pit = conjoined_pits(trap,
                                    t_at_mon(game.u.ux0 ?? 0,
                                             game.u.uy0 ?? 0),
                                    true);
    const adj_pit = adj_nonconjoined_pit(trap);
    /* a_your[trap->madeby_u] */
    const a_your = trap.madeby_u ? 'your' : 'a';

    nomul(0);

    if (fixed_tele_trap(trap)) {
        trflags |= FORCETRAP;
        forcetrap = true;
    }

    /* KMH -- You can't escape the Sokoban level traps */
    if (Sokoban() && (is_pit(ttype) || is_hole(ttype))) {
        await pline(`Air currents pull you down into ${a_your} ${
            trapname(ttype, true)}!`);
        /* then proceed to normal trap effect */
    } else if (!forcetrap) {
        if (floor_trigger(ttype) && check_in_air(game.youmonst, trflags)) {
            if (already_seen) {
                const { u_locomotion } = await import('./hack.js');
                await You(`${u_locomotion('step')} over ${
                    (ttype === ARROW_TRAP && !trap.madeby_u)
                        ? 'an' : a_your} ${trapname(ttype, false)}.`);
            }
            return Trap_Effect_Finished;
        }
        if (already_seen && !game.u.uprops?.FUMBLING
            && !(ttype === MAGIC_PORTAL || ttype === VIBRATING_SQUARE)
            && ttype !== ANTI_MAGIC && !forcebungle && !plunged
            && !conj_pit && !adj_pit
            && (!rn2(5)
                || (is_pit(ttype)
                    && is_clinger(game.youmonst?.data
                                  ?? { mflags1: 0 })))) {
            await You(`escape ${(ttype === ARROW_TRAP && !trap.madeby_u)
                                    ? 'an' : a_your} ${
                trapname(ttype, false)}.`);
            return Trap_Effect_Finished;
        }
    }

    if (game.u.usteed)
        mon_learns_traps(game.u.usteed, ttype);
    mons_see_trap(trap);

    game.u.utrap = 0;                   /* reset_utrap() */
    game.u.utraptype = 0;
    if (ttype === ARROW_TRAP)
        return await trapeffect_arrow_trap(game.youmonst, trap, trflags);
    if (ttype === DART_TRAP)
        return await trapeffect_dart_trap(game.youmonst, trap, trflags);
    if (ttype === ROCKTRAP)
        return await trapeffect_rocktrap(game.youmonst, trap, trflags);
    if (ttype === SQKY_BOARD)
        return await trapeffect_sqky_board(game.youmonst, trap, trflags);
    if (ttype === MAGIC_TRAP)
        return await trapeffect_magic_trap(game.youmonst, trap, trflags);
    if (ttype === BEAR_TRAP)
        return await trapeffect_bear_trap(game.youmonst, trap, trflags);
    if (ttype === SLP_GAS_TRAP)
        return await trapeffect_slp_gas_trap(game.youmonst, trap, trflags);
    if (ttype === RUST_TRAP)
        return await trapeffect_rust_trap(game.youmonst, trap, trflags);
    if (ttype === FIRE_TRAP)
        return await trapeffect_fire_trap(game.youmonst, trap, trflags);
    if (ttype === ROLLING_BOULDER_TRAP)
        return await trapeffect_rolling_boulder_trap(game.youmonst, trap, trflags);
    if (ttype === PIT || ttype === SPIKED_PIT)
        return await trapeffect_pit(game.youmonst, trap, trflags);
    if (ttype === HOLE || ttype === TRAPDOOR)
        return await trapeffect_hole(game.youmonst, trap, trflags);
    if (ttype === ANTI_MAGIC)
        return await trapeffect_anti_magic(game.youmonst, trap, trflags);
    if (ttype === LEVEL_TELEP)
        return await trapeffect_level_telep(game.youmonst, trap, trflags);
    if (ttype === TELEP_TRAP)
        return await trapeffect_telep_trap(game.youmonst, trap, trflags);
    if (ttype === MAGIC_PORTAL)
        return await trapeffect_magic_portal(game.youmonst, trap, trflags);
    if (ttype === WEB)
        return await trapeffect_web(game.youmonst, trap, trflags);
    if (ttype === STATUE_TRAP) {
        await activate_statue_trap(trap, game.u.ux, game.u.uy, false);
        return Trap_Effect_Finished;
    }
    if (ttype === VIBRATING_SQUARE) {
        trap.tseen = 1;                 /* feeltrap() */
        newsym(trap.tx, trap.ty);
        return Trap_Effect_Finished;
    }

    note_unported_trap(`dotrap:ttyp=${ttype}`);
    return Trap_Effect_Finished;
}

// src/trap.c:6101 openholdingtrap(), hero arm. Magic opening releases every
// hero holding state, even when the floor trap is absent or unrelated.
export async function openholdingtrap(mon, noticed) {
    const ishero = mon === game.youmonst || mon === game.u.usteed;
    if (!ishero || !game.u.utrap)
        return false;

    const trap = t_at_mon(game.u.ux, game.u.uy);
    let which = trap?.tseen && trap?.madeby_u ? 'your' : 'the';
    let trapdescr;
    switch (game.u.utraptype) {
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
        trapdescr = 'bear trap';
        break;
    case TT_PIT:
        trapdescr = 'pit';
        break;
    case TT_WEB:
        trapdescr = 'web';
        break;
    default:
        trapdescr = 'trap';
        break;
    }

    noticed.v = true;
    let buf;
    if (!game.u.usteed)
        buf = 'You are';
    else if (game.u.utraptype === TT_BURIEDBALL)
        buf = `You and ${y_monnam(game.u.usteed)} are`;
    else
        buf = `${noit_Monnam(game.u.usteed)} is`;
    /* give release message before untrap in case it triggers a message */
    await pline(`${buf} released from ${which ? which + ' ' : ''}${trapdescr}.`);
    /* might float up if Levitation is being unblocked */
    game.vision_full_recalc = 1; /* vision limits can change (pit escape) */
    await reset_utrap(true);
    if (game.vision_full_recalc)
        vision_recalc(0);
    return true;
}

// src/trap.c:6194 closeholdingtrap(), hero arm. Magic locking forces an
// idle bear trap or web to act on the hero.
export async function closeholdingtrap(mon, noticed) {
    const ishero = mon === game.youmonst || mon === game.u.usteed;
    if (!ishero)
        return false;
    const trap = t_at_mon(game.u.ux, game.u.uy);
    if (!trap || (trap.ttyp !== BEAR_TRAP && trap.ttyp !== WEB)
        || game.u.utrap)
        return false;

    noticed.v = true;
    await dotrap(trap, FORCETRAP);
    return !!game.u.utrap;
}

// src/trap.c:3063 trapnote() — the name of the note a squeaky board plays,
// optionally with "a"/"an" prefixed.
function trapnote(trap, noprefix) {
    const tnnames = [
        'C note',  'D flat', 'D note',  'E flat',
        'E note',  'F note', 'F sharp', 'G note',
        'G sharp', 'A note', 'B flat',  'B note',
    ];
    const tn = tnnames[trap.tnote];
    return noprefix ? tn : just_an(tn) + tn;
}

// src/trap.c:1403 trapeffect_sqky_board() — a squeaky board plays its note.
// No draws in either arm; Soundeffect() is audio-only.
async function trapeffect_sqky_board(mtmp, trap, trflags) {
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & FAILEDUNTRAP) !== 0
                       || (Flying() && (trflags & VIASITTING) !== 0));

    if (mtmp === game.youmonst) {
        if ((Levitation() || Flying()) && !forcetrap) {
            if (!game.u.ublind) {
                seetrap(trap);
                if (Hallucination())
                    await You('notice a crease in the linoleum.');
                else
                    await You('notice a loose board below you.');
            }
        } else {
            seetrap(trap);
            await pline(`A board beneath you ${
                Deaf() ? 'vibrates' : 'squeaks '}${
                Deaf() ? '' : trapnote(trap, false)}${
                Deaf() ? '' : ' loudly'}.`);
            await wake_nearby(false);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        if (m_in_air(mtmp))
            return Trap_Effect_Finished;
        /* stepped on a squeaky board */
        if (in_sight) {
            if (!Deaf()) {
                await pline(`A board beneath ${mon_nam(mtmp)} squeaks ${
                    trapnote(trap, false)} loudly.`);
                seetrap(trap);
            } else if (!mindless(mtmp.data)) {
                await pline(
                    `${Monnam(mtmp)} stops momentarily and appears to cringe.`);
            }
        } else {
            /* same near/far threshold as mzapmsg() */
            const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

            await You_hear(`${trapnote(trap, false)} squeak ${
                (mdistu(mtmp) <= range * range)
                    ? 'nearby' : 'in the distance'}.`);
        }
        /* wake up nearby monsters */
        await wake_nearto(mtmp.mx, mtmp.my, 40);
    }
    return Trap_Effect_Finished;
}

// src/trap.c:2323 trapeffect_anti_magic(): the hero's arm. Magic
// resistance causes an implosion, then the field drains 2d6 Pw with half
// (rounded down) coming from max when max exceeds the drain. The iron-shoes
// arm still records.
async function trapeffect_anti_magic(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const u = game.u;
        let exclaim_it = false;

        seetrap(trap);
        if (u.uprops?.ANTIMAGIC || u.uprops?.MAGIC_RES) {
            let dmgval2 = rnd(4);
            const hp = Upolyd(u) ? u.mh : u.uhp;

            if (u.uprops?.HALF_PHDAM || u.uprops?.HALF_SPDAM)
                dmgval2 += rnd(4);
            if (u.uwep?.oartifact === ART_MAGICBANE)
                dmgval2 += rnd(4);
            const carriedDefense = (game.invent || []).some((obj) =>
                obj.oartifact && !is_quest_artifact(obj)
                    && defends_when_carried(ATTKS.AD_MAGM, obj));
            if (carriedDefense)
                dmgval2 += rnd(4);
            if (u.uprops?.PASSES_WALLS)
                dmgval2 = Math.trunc((dmgval2 + 3) / 4);

            await You_feel(dmgval2 >= hp ? 'unbearably torpid!'
                : dmgval2 >= Math.trunc(hp / 4) ? 'very lethargic.'
                    : 'sluggish.');
            await losehp(dmgval2, 'anti-magic implosion', KILLED_BY_AN);
        }

        let drain = d(2, 6); /* 2d6 => 2..12 */
        const halfd = rnd(Math.trunc(drain / 2)); /* 1..drain/2 */
        if (u.uenmax > drain) {
            u.uenmax -= halfd; /* drain_en() will set context.botl */
            drain -= halfd;
            exclaim_it = true;
        }
        await drain_en(drain, exclaim_it);
    } else {
        let trapkilled = false;
        const in_sight = canseemon(mtmp) || mtmp === game.u.usteed;
        const see_it = cansee(mtmp.mx, mtmp.my);
        const mptr = mtmp.data;

        if (!resists_magm(mtmp)) {
            if (!mtmp.mcan && (attacktype(mptr, ATTKS.AT_MAGC)
                               || attacktype(mptr, ATTKS.AT_BREA))) {
                mtmp.mspec_used = (mtmp.mspec_used || 0) + d(2, 6);
                if (in_sight) {
                    seetrap(trap);
                    await pline(`${Monnam(mtmp)} seems lethargic.`);
                }
            }
        } else {
            let dmgval2 = rnd(4);
            if (MON_WEP(mtmp)?.oartifact === ART_MAGICBANE)
                dmgval2 += rnd(4);
            const carriedDefense = (mtmp.minvent || []).some((obj) =>
                obj.oartifact && defends_when_carried(ATTKS.AD_MAGM, obj));
            if (carriedDefense)
                dmgval2 += rnd(4);
            if (passes_walls(mptr))
                dmgval2 = Math.trunc((dmgval2 + 3) / 4);

            if (in_sight)
                seetrap(trap);
            mtmp.mhp -= dmgval2;
            if (DEADMONSTER(mtmp)) {
                await monkilled(mtmp,
                    in_sight ? 'compression from an anti-magic field' : null,
                    -ATTKS.AD_MAGM);
                trapkilled = true;
            }
            if (see_it)
                newsym(trap.tx, trap.ty);
        }
        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
    return Trap_Effect_Finished;
}

// src/trap.c:5202 drain_en() — reduce current magical energy.
export async function drain_en(n, max_already_drained) {
    const u = game.u;
    let mesg;
    let punct = max_already_drained ? '!' : '.';

    if (u.uenmax < 1) {
        /* energy is completely gone */
        if (u.uen || u.uenmax) { /* paranoia */
            u.uen = u.uenmax = 0;
            (game.disp ||= {}).botl = true;
        }
        mesg = 'momentarily lethargic';
    } else {
        /* throttle further loss a bit when there's not much left to lose */
        if (n > Math.trunc((u.uen + u.uenmax) / 3))
            n = rnd(n);

        mesg = 'your magical energy drain away';
        if (n > u.uen)
            punct = '!';

        u.uen -= n;
        if (u.uen < 0) {
            u.uenmax -= rnd(-u.uen);
            if (u.uenmax < 0)
                u.uenmax = 0;
            u.uen = 0;
        } else if (u.uen > u.uenmax) {
            u.uen = u.uenmax;
        }
        (game.disp ||= {}).botl = true;
    }
    await You_feel(`${mesg}${punct}`);
}

// src/trap.c:2464 trapeffect_poly_trap()
async function trapeffect_poly_trap(mtmp, trap, trflags) {
    const u = game.u;
    if (mtmp === game.youmonst) {
        const viasitting = (trflags & VIASITTING) !== 0;
        let steed_article = ARTICLE_THE;
        let verbbuf;

        /* suppress article for the steed's name when it has a personal
           name (which won't occur when hallucinating) */
        if (u.usteed && has_mgivenname(u.usteed) && !Hallucination())
            steed_article = ARTICLE_NONE;

        seetrap(trap);
        if (viasitting)
            verbbuf = 'trigger'; /* follows "You sit down." */
        else if (u.usteed)
            verbbuf = `lead ${x_monnam(u.usteed, steed_article, null,
                                       SUPPRESS_SADDLE, false)} onto`;
        else
            verbbuf = `${u_locomotion('step')} onto`;
        await You(`${verbbuf} a polymorph trap!`);
        if (wearing_iron_shoes(mtmp)) {
            deltrap(trap);
            await pline(`${Yname2(u.uarmf)} warps strangely.`);
            await poly_obj(
                u.uarmf, u.uarmf.otyp === ONAMES.IRON_SHOES ? ONAMES.KICKING_BOOTS
                                                            : ONAMES.IRON_SHOES);
            update_inventory();
            if (u.uarmf)
                await prinv(null, u.uarmf, 0);
        } else if (Antimagic() || Unchanging()) {
            await shieldeff(u.ux, u.uy);
            await You_feel('momentarily different.');
            /* Trap did nothing; don't remove it --KAA */
        } else {
            await steedintrap(trap, null);
            deltrap(trap);      /* delete trap before polymorph */
            newsym(u.ux, u.uy); /* get rid of trap symbol */
            await You_feel('a change coming over you.');
            await polyself(POLY_NOFLAGS);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === u.usteed);

        if (wearing_iron_shoes(mtmp)) {
            let shoes = which_armor(mtmp, W_ARMF);

            extract_from_minvent(mtmp, shoes, true, true);
            if (mpickobj(mtmp, shoes)) {
                /* impossible("re-equipping iron shoes destroyed them?") */
                return Trap_Effect_Finished;
            }
            shoes = await poly_obj(
                shoes, shoes.otyp === ONAMES.IRON_SHOES ? ONAMES.KICKING_BOOTS
                                                        : ONAMES.IRON_SHOES);
            if (shoes) {
                mtmp.misc_worn_check |= W_ARMF;
                shoes.owornmask = W_ARMF;
                await update_mon_extrinsics(mtmp, shoes, true, true);
            }
        } else if (resists_magm(mtmp)) {
            await shieldeff_mon(mtmp);
        } else if (!await resist(mtmp, OCLASSES.WAND_CLASS, 0, NOTELL)) {
            newcham(mtmp, null, NC_SHOW_MSG);
            if (in_sight)
                seetrap(trap);
        }
    }
    return Trap_Effect_Finished;
}

// src/trap.c:1730 trapeffect_fire_trap(), monster path. Magic traps use
// this when their one-in-21 monster trigger fires.
async function trapeffect_fire_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        await dofiretrap(null);
        return Trap_Effect_Finished;
    }

    const tx = trap.tx, ty = trap.ty;
    const in_sight = canseemon(mtmp) || mtmp === game.u.usteed;
    const see_it = cansee(tx, ty);
    const orig_dmg = d(2, 4);
    let trapkilled = false;

    if (in_sight) {
        await pline(`A tower of flame erupts from the ${
            surface(mtmp.mx, mtmp.my)} under ${mon_nam(mtmp)}!`);
    } else if (see_it) {
        await You_see(`a tower of flame erupt from the ${
            surface(mtmp.mx, mtmp.my)}!`);
    }

    if (resists_fire(mtmp)) {
        if (in_sight)
            await pline(`${Monnam(mtmp)} is uninjured.`);
    } else {
        let num = orig_dmg;
        let alt = 0;
        let immolate = false;
        switch (mtmp.mnum) {
        case PMNAMES.PM_PAPER_GOLEM:
            immolate = true;
            alt = mtmp.mhpmax;
            break;
        case PMNAMES.PM_STRAW_GOLEM:
            alt = Math.trunc(mtmp.mhpmax / 2);
            break;
        case PMNAMES.PM_WOOD_GOLEM:
            alt = Math.trunc(mtmp.mhpmax / 4);
            break;
        case PMNAMES.PM_LEATHER_GOLEM:
            alt = Math.trunc(mtmp.mhpmax / 8);
            break;
        }
        if (alt > num)
            num = alt;

        if (await thitm(0, mtmp, null, num, immolate)) {
            trapkilled = true;
        } else {
            mtmp.mhpmax -= rn2(num + 1);
            if (mtmp.mhp > mtmp.mhpmax)
                mtmp.mhp = mtmp.mhpmax;
        }
    }

    if (await burnarmor(mtmp) || rn2(3)) {
        const xtradmg = await destroy_items(mtmp, ATTKS.AD_FIRE, orig_dmg);
        await ignite_items(mtmp.minvent || []);
        if (mtmp.mhp > 0) {
            mtmp.mhp -= xtradmg;
            if (mtmp.mhp <= 0) {
                await monkilled(mtmp, '', ATTKS.AD_FIRE);
                trapkilled = true;
            }
        }
    }

    if (await burn_floor_objects(tx, ty, see_it, false)
        && !see_it && distu(tx, ty) <= 9)
        await You('smell smoke.');

    const { is_ice } = await import('./dbridge.js');
    if (is_ice(tx, ty))
        await melt_ice(tx, ty);

    if (mtmp.mhp <= 0)
        trapkilled = true;
    if (see_it && t_at_mon(tx, ty))
        seetrap(t_at_mon(tx, ty));
    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}


// src/trap.c:4356 domagictrap() — the magic trap's effect roll.
//
// fate = rnd(20) drives everything. Under 10 is the blinding flash, which
// wakes nearby monsters; 10..19 are the individual arms.
async function domagictrap() {
    const fate = rnd(20);

    if (fate < 10) {
        let cnt = rnd(4);

        if (!resists_blnd(null)) {
            await You('are momentarily blinded by a flash of light!');
            const { make_blinded } = await import('./potion.js');
            await make_blinded(rn1(5, 10), false);
            if (!game.u.ublind)
                await Your('vision clears.');
        } else if (!game.u.ublind) {
            await You_see('a flash of light!');
        }

        const intr = (game.u.intrinsic ||= {});
        if (!Deaf()) {
            await You_hear('a deafening roar!');
            intr.HDeaf = Math.min(TIMEOUT,
                (intr.HDeaf | 0) + rn1(20, 30));
        } else {
            await You_feel('rankled.');
            intr.HDeaf = Math.min(TIMEOUT,
                (intr.HDeaf | 0) + rn1(5, 15));
        }
        (game.disp ||= {}).botl = true;

        while (cnt--)
            makemon(null, game.u.ux, game.u.uy, NO_MM_FLAGS);
        await wake_nearto(game.u.ux, game.u.uy, 7 * 7);
        return;
    }

    switch (fate) {
    case 11: { /* toggle intrinsic invisibility */
        await You_hear('a low hum.');
        const was_invisible = Invis();
        if (!was_invisible && !game.u.ublind) {
            await pline(`${Hallucination() ? 'Far out, man!  You'
                                           : 'Gee!  All of a sudden, you'} ${
                See_invisible() ? 'can see right through yourself'
                                : "can't see yourself"}.`);
        }
        (game.u.uprops ||= {}).INVIS = !was_invisible;
        newsym(game.u.ux, game.u.uy);
        break;
    }
    case 13:  /* odd feelings */
        await pline('A shiver runs up and down your spine!');
        break;
    case 14:
        await You_hear('distant howling.');
        break;
    case 16:
        await Your('pack shakes violently!');
        break;
    case 17:
        await You('smell charred flesh.');
        break;
    case 18:
        await You_feel('tired.');
        break;
    default:
        note_unported_trap(`domagictrap:fate=${fate}`);
        break;
    }
}

// src/trap.c:2565 trapeffect_magic_trap() — the hero's arm.
async function trapeffect_magic_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        if (!rn2(21))
            return await trapeffect_fire_trap(mtmp, trap, trflags);
        return Trap_Effect_Finished;
    }

    seetrap(trap);
    if (!rn2(30)) {
        deltrap(trap);
        newsym(game.u.ux, game.u.uy); /* update position */
        await You('are caught in a magical explosion!');
        await losehp(rnd(10), 'magical explosion', KILLED_BY_AN);
        await Your('body absorbs some of the magical energy!');
        game.u.uen = (game.u.uenmax += 2);
        if (game.u.uenmax > (game.u.uenpeak | 0))
            game.u.uenpeak = game.u.uenmax;
        return Trap_Effect_Finished;
    } else {
        await domagictrap();
    }
    await steedintrap(trap, null);
    return Trap_Effect_Finished;
}

/* include/hack.h:1306 */
/* include/hack.h:1306 — trap-activation flags. FORCEBUNGLE is 0x04
   (0x08 is RECURSIVETRAP). */
const FORCETRAP = 0x01, NOWEBMSG = 0x02, FORCEBUNGLE = 0x04,
      FAILEDUNTRAP = 0x40;

// src/mondata.c:1617 mon_knows_traps() — mtrapseen is a bitmask of trap types
// this monster has already walked into.
function mon_knows_traps(mtmp, ttyp) {
    return ((mtmp.mtrapseen | 0) & (1 << (ttyp - 1))) !== 0;
}

// src/mondata.c:1629 mon_learns_traps()
export function mon_learns_traps(mtmp, ttyp) {
    mtmp.mtrapseen = (mtmp.mtrapseen | 0) | (1 << (ttyp - 1));
}

// src/mon.c:2130 m_in_air()
function m_in_air(mtmp) {
    return (is_flyer(mtmp.data) || is_floater(mtmp.data)
            || (is_clinger(mtmp.data)
                && has_ceiling(game.u.uz) && mtmp.mundetected));
}

// include/mondata.h:23 grounded()
export function grounded(ptr) {
    return !is_flyer(ptr) && !is_floater(ptr)
           && (!is_clinger(ptr) || !has_ceiling(game.u.uz));
}

// src/trap.c:1098 wearing_iron_shoes() — hero or monster wearing iron boots.
function wearing_iron_shoes(mtmp) {
    const armf = (mtmp === game.youmonst) ? (game.u.uarmf || null)
                                          : which_armor(mtmp, W_ARMF);
    return !!(armf && game.objects[armf.otyp].oc_material === MATERIALS.IRON);
}

// src/trap.c:939 keep_saddle_with_steedcorpse()
function keep_saddle_with_steedcorpse(steed_mid, objchn, saddle) {
    if (!saddle)
        return false;
    for (const obj of objchn || []) {
        if (obj.otyp === ONAMES.CORPSE && has_omonst(obj)) {
            const mtmp = OMONST(obj);

            if (mtmp.m_id === steed_mid) {
                /* move saddle */
                const cc = { x: 0, y: 0 };
                if (get_obj_location(obj, cc, 0)) {
                    obj_extract_self(saddle);
                    place_object(saddle, cc.x, cc.y);
                    stackobj(saddle);
                }
                return true;
            }
        }
        if (Has_contents(obj)
            && keep_saddle_with_steedcorpse(steed_mid, obj.cobj, saddle))
            return true;
    }
    return false;
}

// src/trap.c:3172 blow_up_landmine()
export async function blow_up_landmine(trap) {
    const x = trap.tx, y = trap.ty;
    const lev = game.level.at(x, y);
    let old_typ, typ;

    old_typ = lev.typ;
    await scatter(x, y, 4,
                  MAY_DESTROY | MAY_HIT | MAY_FRACTURE | VIS_EFFECTS,
                  null);
    del_engr_at(x, y);
    await wake_nearto(x, y, 400);
    if (IS_DOOR(lev.typ))
        lev.doormask = D_BROKEN;
    /* destroy drawbridge if present */
    if (lev.typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(x, y) >= 0) {
        const db = { x, y };
        /* if under the portcullis, the bridge is adjacent */
        if (find_drawbridge(db))
            await destroy_drawbridge(db.x, db.y);
    }
    trap = t_at_mon(x, y); /* expected to be null after destruction */
    /* or could be null if scatter blew up oil which melted ice */
    /* convert landmine into pit */
    if (trap) {
        if (Is_waterlevel(game.u.uz) || Is_airlevel(game.u.uz)) {
            /* no pits here */
            deltrap(trap);
        } else {
            /* fill pit with water, if applicable */
            typ = fillholetyp(x, y, false);
            if (typ !== ROOM) {
                lev.typ = typ;
                await liquid_flow(x, y, typ, trap,
                                  cansee(x, y) ? 'The hole fills with %s!'
                                               : null);
            } else {
                trap.ttyp = PIT;       /* explosion creates a pit */
                trap.madeby_u = 0;     /* resulting pit isn't yours */
                seetrap(trap);         /* and it isn't concealed */
            }
        }
    }
    await fill_pit(x, y);
    await maybe_dunk_boulders(x, y);
    recalc_block_point(x, y);
    await spot_checks(x, y, old_typ);
}

// src/trap.c:3222 launch_drop_spot()
function launch_drop_spot(obj, x, y) {
    if (!obj) {
        game.launchplace = { obj: null, x: 0, y: 0 };
    } else {
        game.launchplace = { obj, x, y };
    }
}

// src/trap.c:2527 trapeffect_landmine()
async function trapeffect_landmine(mtmp, trap, trflags) {
    let damage = rnd(16);
    /* iron shoes protect against much of the damage from the
       explosion, but you still take some damage (and wound legs)
       because they can't fully block the blast */
    if (wearing_iron_shoes(mtmp))
        damage = Math.trunc((damage + 3) / 4);

    if (mtmp === game.youmonst) {
        const u = game.u;
        const already_seen = !!trap.tseen;
        const forcetrap = ((trflags & FORCETRAP) !== 0
                           || (trflags & FAILEDUNTRAP) !== 0);
        const forcebungle = (trflags & FORCEBUNGLE) !== 0;
        let steed_mid = 0;
        let saddle = null;

        if ((Levitation() || Flying()) && !forcetrap) {
            if (!already_seen && rn2(3))
                return Trap_Effect_Finished;
            feeltrap(trap);
            await pline(`${already_seen ? 'There is' : 'You discover'} ${
                trap.madeby_u ? 'the trigger of your mine' : 'a trigger'} in a pile of soil below you.`);
            if (already_seen && rn2(3))
                return Trap_Effect_Finished;
            /* Soundeffect(se_kaablamm_of_mine, 80) */
            await pline(`KAABLAMM!!!  ${forcebungle ? 'Your inept attempt sets'
                                                    : 'The air currents set'} ${
                already_seen ? (trap.madeby_u ? 'your' : 'a') : ''}${
                already_seen ? ' land mine' : 'it'} off!`);
        } else {
            /* prevent landmine from killing steed, throwing you to
             * the ground, and then that same landmine affecting you
             * again because it hasn't been deleted yet
             */
            if (recursive_mine)
                return Trap_Effect_Finished;
            feeltrap(trap);
            await pline(`KAABLAMM!!!  You triggered ${trap.madeby_u ? 'your' : 'a'} land mine!`);
            if (u.usteed)
                steed_mid = u.usteed.m_id;
            recursive_mine = true;
            await steedintrap(trap, null);
            recursive_mine = false;
            saddle = sobj_at(ONAMES.SADDLE, u.ux, u.uy);
            await set_wounded_legs(LEFT_SIDE, rn1(35, 41));
            await set_wounded_legs(RIGHT_SIDE, rn1(35, 41));
            exercise(A_DEX, false);
        }
        /* add a pit before calling losehp so bones won't keep the landmine;
           blow_up_landmine() will remove pit afterwards if inappropriate */
        trap.ttyp = PIT;
        trap.madeby_u = 0;
        await losehp(Maybe_Half_Phys(damage), 'land mine', KILLED_BY_AN);
        await blow_up_landmine(trap);
        if (steed_mid && saddle && !u.usteed)
            keep_saddle_with_steedcorpse(steed_mid, game.level.objects, saddle);
        newsym(u.ux, u.uy); /* update trap symbol */
        /* fall recursively into the pit... */
        if ((trap = t_at_mon(u.ux, u.uy)) != null)
            await dotrap(trap, RECURSIVETRAP);
        await fill_pit(u.ux, u.uy);
    } else {
        let trapkilled = false;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const tx = trap.tx, ty = trap.ty;

        /* heavier monsters are more likely to set off a land mine; on the
           other hand, any mon lighter than the trigger weight is immune */
        if (rn2(mtmp.data.cwt + 1) < Math.trunc(WT_ELF / 2)) /* MINE_TRIGGER_WT */
            return Trap_Effect_Finished;
        if (m_in_air(mtmp)) {
            const already_seen = !!trap.tseen;

            if (in_sight && !already_seen) {
                await pline(`A trigger appears in a pile of soil below ${mon_nam(mtmp)}.`);
                seetrap(trap);
            }
            if (rn2(3))
                return Trap_Effect_Finished;
            if (in_sight) {
                newsym(mtmp.mx, mtmp.my);
                await pline_The(`air currents set ${already_seen ? 'a land mine' : 'it'} off!`);
            }
        } else if (in_sight) {
            newsym(mtmp.mx, mtmp.my);
            await pline(`${!Deaf() ? 'KAABLAMM!!!  ' : ''}${Monnam(mtmp)} triggers ${
                trap.madeby_u ? 'your' : 'a'} land mine!`);
        }
        if (!in_sight && !Deaf())
            await pline('Kaablamm!  You hear an explosion in the distance!');
        await blow_up_landmine(trap);
        /* explosion might have destroyed a drawbridge; don't
           dish out more damage if monster is already dead */
        if (DEADMONSTER(mtmp)
            || await thitm(0, mtmp, null, damage, false)) {
            trapkilled = true;
        } else {
            /* monsters recursively fall into new pit */
            if ((await mintrap(mtmp, trflags | FORCETRAP)) === Trap_Killed_Mon)
                trapkilled = true;
        }
        /* a boulder may fill the new pit, crushing monster */
        await fill_pit(tx, ty); /* thitm may have already destroyed the trap */
        if (DEADMONSTER(mtmp))
            trapkilled = true;
        if (unconscious()) {
            game.multi = -1;
            game.nomovemsg = 'The explosion awakens you!';
        }
        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
    return Trap_Effect_Finished;
}

// src/trap.c:3570 feeltrap() — like seetrap() but works when blind.
export function feeltrap(trap) {
    trap.tseen = 1;
    newsym(trap.tx, trap.ty);
}

// src/trap.c:3898 thitm() — a trap (or trap missile) hits a monster. Only
// the d_override arm is live here: pits and bear traps force the hit and
// pass no missile, so the to-hit rnd(20) and the missile bookkeeping never
// run for them.
async function thitm(tlev, mon, obj, d_override, nocorpse) {
    let strike;
    let trapkilled = false;

    if (d_override)
        strike = 1;
    else if (obj)
        strike = (find_mac(mon) + tlev + obj.spe <= rnd(20)) ? 1 : 0;
    else
        strike = (find_mac(mon) + tlev <= rnd(20)) ? 1 : 0;

    if (!strike) {
        if (obj && cansee(mon.mx, mon.my))
            await pline(`${Monnam(mon)} is almost hit by ${doname(obj)}!`);
    } else {
        let dam = 1;

        if (obj && cansee(mon.mx, mon.my))
            await pline(`${Monnam(mon)} is hit by ${doname(obj)}!`);
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            dam = dmgval(obj, mon);
            if (dam < 1)
                dam = 1;
        }
        mon.mhp -= dam;
        if (mon.mhp <= 0) {
            const xx = mon.mx, yy = mon.my;

            await monkilled(mon, '', 0 /* AD_PHYS; nocorpse callers absent */);
            if (mon.mhp <= 0) {
                newsym(xx, yy);
                trapkilled = true;
            }
        }
    }
    /* src/trap.c:3955 — an unfired or force-hit missile lands on the
       monster's square; a normally-striking one is used up. */
    if (obj && (!strike || d_override)) {
        place_object(obj, mon.mx, mon.my);
        const { stackobj } = await import('./invent.js');
        stackobj(obj);
    } /* else dealloc_obj(obj): dropped reference is the JS equivalent */

    return trapkilled;
}

// src/trap.c:1478 trapeffect_bear_trap() — monster arm only; the hero arm
// is reached via dotrap and stays recorded until a session steps in one.
async function trapeffect_bear_trap(mtmp, trap, trflags) {
    const is_you = (mtmp === game.youmonst);
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & FAILEDUNTRAP) !== 0
                       || (is_you && (trflags & VIASITTING) !== 0));

    if (is_you) {
        const dmg = d(2, 4);

        if ((Levitation() || Flying()) && !forcetrap)
            return Trap_Effect_Finished;
        feeltrap(trap);
        if (amorphous(game.youmonst.data) || is_whirly(game.youmonst.data)
            || unsolid(game.youmonst.data)) {
            await pline(`${trap.madeby_u ? 'Your' : 'A'} bear trap closes harmlessly through you.`);
            return Trap_Effect_Finished;
        }
        if (!game.u.usteed && game.youmonst.data.msize <= MFLAGS.MZ_SMALL) {
            await pline(`${trap.madeby_u ? 'Your' : 'A'} bear trap closes harmlessly over you.`);
            return Trap_Effect_Finished;
        }
        set_utrap(rn1(4, 4), TT_BEARTRAP);
        if (game.u.usteed) {
            await pline(`${trap.madeby_u ? 'Your' : 'A'} bear trap closes on ${
                s_suffix(mon_nam(game.u.usteed))} ${mbodypart(game.u.usteed, FOOT)}!`);
            if (await thitm(0, game.u.usteed, null, dmg, false))
                await reset_utrap(true); /* steed died, hero not trapped */
        } else {
            await pline(`${trap.madeby_u ? 'Your' : 'A'} bear trap closes on your ${body_part(FOOT)}!`);
            if (game.u.umonnum === PMNAMES.PM_OWLBEAR || game.u.umonnum === PMNAMES.PM_BUGBEAR)
                await You('howl in anger!');
            if (wearing_iron_shoes(mtmp))
                await pline(`${Yname2(game.u.uarmf)} protects your leg.`);
            else {
                await set_wounded_legs(rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10));
                await losehp(Maybe_Half_Phys(dmg), 'bear trap', KILLED_BY_AN);
            }
        }
        exercise(A_DEX, false);
        return Trap_Effect_Finished;
    }

    const mptr = mtmp.data;
    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    let trapkilled = false;

    if (mptr.msize > MFLAGS.MZ_SMALL && !amorphous(mptr) && !m_in_air(mtmp)
        && !is_whirly(mptr) && !unsolid(mptr)) {
        mtmp.mtrapped = 1;
        if (in_sight) {
            await pline(`${Monnam(mtmp)} is caught in ${trap.madeby_u ? 'your' : 'a'} bear trap!`);
            seetrap(trap);
        } else {
            if (mtmp.mnum === PMNAMES.PM_OWLBEAR
                || mtmp.mnum === PMNAMES.PM_BUGBEAR)
                await You_hear('the roaring of an angry bear!');
        }
    } else if (forcetrap) {
        if (in_sight) {
            await pline(`${Monnam(mtmp)} evades ${trap.madeby_u ? 'your' : 'a'} bear trap!`);
            seetrap(trap);
        }
    }
    if (mtmp.mtrapped && !wearing_iron_shoes(mtmp))
        trapkilled = await thitm(0, mtmp, null, d(2, 4), false);

    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}

// src/trap.c:1560 trapeffect_slp_gas_trap() — sleep gas affects a breathing,
// non-resistant creature for rnd(25) turns.
async function trapeffect_slp_gas_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        if (Sleep_resistance() || breathless(game.youmonst.data)) {
            await You('are enveloped in a cloud of gas!');
        } else {
            await pline('A cloud of gas puts you to sleep!');
            const { fall_asleep } = await import('./timeout.js');
            await fall_asleep(-rnd(25), true);
        }
        await steedintrap(trap, null);
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    if (!resists_sleep(mtmp) && !breathless(mtmp.data) && !helpless(mtmp)) {
        let amount = rnd(25);
        if (!defended(mtmp, ATTKS.AD_SLEE) && mtmp.mcanmove) {
            mtmp.meating = 0;
            amount += mtmp.mfrozen | 0;
            mtmp.mcanmove = 0;
            mtmp.mfrozen = Math.min(amount, 127);
            if (in_sight) {
                await pline(`${Monnam(mtmp)} suddenly falls asleep!`);
                seetrap(trap);
            }
        }
    }
    return Trap_Effect_Finished;
}

// src/trap.c:1826 trapeffect_pit().
async function trapeffect_pit(mtmp, trap, trflags) {
    const ttype = trap.ttyp;
    let relevant_spikes = (ttype === SPIKED_PIT);

    if (mtmp === game.youmonst) {
        const plunged = (trflags & TOOKPLUNGE) !== 0;
        const viasitting = (trflags & VIASITTING) !== 0;
        const conj_pit = conjoined_pits(
            trap, t_at_mon(game.u.ux0 ?? 0, game.u.uy0 ?? 0), true);
        const adj_pit = adj_nonconjoined_pit(trap);
        const already_known = !!trap.tseen;
        const article = trap.madeby_u ? 'your' : 'a';
        let deliberate = false;

        if (!Sokoban()
            && (Levitation() || (Flying() && !plunged && !viasitting)))
            return Trap_Effect_Finished;
        feeltrap(trap);
        if (!Sokoban() && is_clinger(mtmp.data) && !plunged) {
            if (already_known) {
                await You_see(`${article} ${relevant_spikes ? 'spiked ' : ''}pit below you.`);
            } else {
                await pline(`${upstart(article)} pit ${
                    relevant_spikes ? 'full of spikes ' : ''}opens up under you!`);
                await You("don't fall in!");
            }
            return Trap_Effect_Finished;
        }
        if (!Sokoban()) {
            if (game.u.usteed) {
                let steed_article = ARTICLE_THE;

                /* suppress article in various steed messages when using its
                   name (which won't occur when hallucinating) */
                if (has_mgivenname(game.u.usteed) && !Hallucination())
                    steed_article = ARTICLE_NONE;
                const verbbuf = ((trflags & RECURSIVETRAP) !== 0)
                    ? `and ${x_monnam(game.u.usteed, steed_article, null,
                                       SUPPRESS_SADDLE, false)} fall`
                    : `lead ${x_monnam(game.u.usteed, steed_article, 'poor',
                                        SUPPRESS_SADDLE, false)}`;
                await You(`${verbbuf} into ${article} pit!`);
            } else if (game.iflags?.menu_requested && already_known) {
                await You(`carefully ${u_locomotion('lower yourself')} into the pit.`);
                deliberate = true;
            } else if (conj_pit) {
                await You('move into an adjacent pit.');
            } else if (adj_pit) {
                await You(`stumble over debris${
                    !rn2(5) ? ' between the pits' : ''}.`);
            } else {
                const verb = !plunged ? 'fall' : Flying() ? 'dive' : 'plunge';
                await You(`${verb} into ${article} pit!`);
            }
        }
        if (game.u.umonnum === PMNAMES.PM_PIT_VIPER
            || game.u.umonnum === PMNAMES.PM_PIT_FIEND)
            await pline("How pitiful.  Isn't that the pits?");

        if (relevant_spikes && wearing_iron_shoes(mtmp)) {
            await pline(`${Yname2(game.u.uarmf)} protects you from the sharp iron spikes.`);
            relevant_spikes = false;
        } else if (relevant_spikes) {
            await You(`${conj_pit ? 'step' : 'land'} on a set of sharp iron spikes!`);
        }

        game.u.utrap = rn1(6, 2);
        game.u.utraptype = TT_PIT;
        if (!(await steedintrap(trap, null))) {
            if (relevant_spikes) {
                let damage = rnd(conj_pit ? 4 : adj_pit ? 6 : 10);
                if (game.u.uprops?.HALF_PHDAM)
                    damage = Math.trunc((damage + 1) / 2);
                await losehp(damage,
                             plunged ? 'deliberately plunged into a pit of iron spikes'
                             : (conj_pit || deliberate)
                               ? 'stepped into a pit of iron spikes'
                               : adj_pit ? 'stumbled into a pit of iron spikes'
                               : 'fell into a pit of iron spikes',
                             NO_KILLER_PREFIX);
                if (!rn2(6)) {
                    await poisoned('spikes', A_STR,
                                   (conj_pit || adj_pit || deliberate)
                                     ? 'stepping on poison spikes'
                                     : 'fall onto poison spikes',
                                   8, false);
                }
            } else if (!conj_pit && !deliberate
                       && !(plunged && (Flying() || is_clinger(mtmp.data)))) {
                let damage = rnd(adj_pit ? 3 : 6);
                if (game.u.uprops?.HALF_PHDAM)
                    damage = Math.trunc((damage + 1) / 2);
                await losehp(damage,
                             plunged ? 'deliberately plunged into a pit'
                                     : 'fell into a pit',
                             NO_KILLER_PREFIX);
            }
            game.vision_full_recalc = 1;
            vision_recalc(0);
            exercise(A_STR, false);
            exercise(A_DEX, false);
        }
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    let trapkilled = false;
    const forcetrap = ((trflags & FORCETRAP) !== 0);
    const inescapable = (forcetrap || (Sokoban() && !trap.madeby_u));
    const mptr = mtmp.data;
    let fallverb = 'falls';

    if (!grounded(mptr)
        || (mtmp.wormno && count_wsegs(mtmp) > 5)) {
        if (forcetrap && !Sokoban()) {
            /* openfallingtrap; not inescapable here */
            if (in_sight) {
                seetrap(trap);
                await pline(`${Monnam(mtmp)} doesn't fall into the pit.`);
            }
            return Trap_Effect_Finished;
        }
        if (!inescapable)
            return Trap_Effect_Finished; /* avoids trap */
        fallverb = 'is dragged'; /* sokoban pit */
    }
    if (!passes_walls(mptr))
        mtmp.mtrapped = 1;
    if (in_sight) {
        await pline(`${Monnam(mtmp)} ${fallverb} into ${trap.madeby_u ? 'your' : 'a'} pit!`);
        if (mtmp.mnum === PMNAMES.PM_PIT_VIPER
            || mtmp.mnum === PMNAMES.PM_PIT_FIEND)
            await pline("How pitiful.  Isn't that the pits?");
        seetrap(trap);
    }
    await mselftouch(mtmp, 'Falling, ', false);
    if (wearing_iron_shoes(mtmp))
        relevant_spikes = false;
    if (mtmp.mhp <= 0
        || await thitm(0, mtmp, null, rnd(relevant_spikes ? 10 : 6), false))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}

// src/trap.c:972 mu_maybe_destroy_web().
async function mu_maybe_destroy_web(mtmp, domsg, trap) {
    const mptr = mtmp.data;
    const is_you = mtmp === game.youmonst;
    if (!(amorphous(mptr) || is_whirly(mptr) || flaming(mptr)
          || unsolid(mptr) || mtmp.mnum === PMNAMES.PM_GELATINOUS_CUBE))
        return false;

    const article = trap.madeby_u ? 'your' : 'a';
    if (flaming(mptr) || acidic(mptr)) {
        if (domsg) {
            const verb = flaming(mptr) ? 'burn' : 'dissolve';
            if (is_you)
                await You(`${verb} ${article} spider web!`);
            else
                await pline(`${Monnam(mtmp)} ${verb}s ${article} spider web!`);
        }
        deltrap(trap);
        newsym(trap.tx, trap.ty);
    } else if (domsg) {
        if (is_you) {
            await You(`flow through ${article} spider web.`);
        } else {
            await pline(`${Monnam(mtmp)} flows through ${article} spider web.`);
            seetrap(trap);
        }
    }
    return true;
}

// src/trap.c:2106 trapeffect_web().
async function trapeffect_web(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        let webmsgok = (trflags & NOWEBMSG) === 0;
        const forcetrap = ((trflags & FORCETRAP) !== 0
                           || (trflags & FAILEDUNTRAP) !== 0);
        const viasitting = (trflags & VIASITTING) !== 0;
        const article = trap.madeby_u ? 'your' : 'a';
        let steed_article = ARTICLE_THE;

        /* suppress article in various steed messages when using its
           name (which won't occur when hallucinating) */
        if (game.u.usteed && has_mgivenname(game.u.usteed) && !Hallucination())
            steed_article = ARTICLE_NONE;

        feeltrap(trap);
        if (await mu_maybe_destroy_web(mtmp, webmsgok, trap))
            return Trap_Effect_Finished;
        if (webmaker(mtmp.data)) {
            if (webmsgok)
                await pline(trap.madeby_u
                    ? 'You take a walk on your web.'
                    : 'There is a spider web here.');
            return Trap_Effect_Finished;
        }
        if (webmsgok) {
            let verbbuf;

            if (forcetrap || viasitting) {
                verbbuf = 'are caught by';
            } else if (game.u.usteed) {
                verbbuf = `lead ${x_monnam(game.u.usteed, steed_article, 'poor',
                                           SUPPRESS_SADDLE, false)} into`;
            } else {
                verbbuf = `${u_locomotion('stumble')} into`;
            }
            await You(`${verbbuf} ${article} spider web!`);
        }

        game.u.utrap = 1;
        game.u.utraptype = TT_WEB;
        let str = ACURR(A_STR), tim;
        /* If mounted, the steed gets trapped.  Use mintrap
         * to do all the work.  If mtrapped is set as a result,
         * unset it and set utrap instead.  In the case of a
         * strongmonst and mintrap said it's trapped, use a
         * short but non-zero trap time.  Otherwise, monsters
         * have no specific strength, so use player strength.
         * This gets skipped for webmsgok, which implies that
         * the steed isn't a factor.
         */
        if (game.u.usteed && webmsgok) {
            /* mtmp location might not be up to date */
            game.u.usteed.mx = game.u.ux;
            game.u.usteed.my = game.u.uy;

            /* mintrap currently does not return Trap_Killed_Mon
               (mon died) for webs */
            if ((await mintrap(game.u.usteed, trflags)) !== Trap_Effect_Finished) {
                game.u.usteed.mtrapped = 0;
                if (strongmonst(game.u.usteed.data))
                    str = 17;
            } else {
                await reset_utrap(false);
                return Trap_Effect_Finished;
            }

            webmsgok = false; /* mintrap printed the messages */
        }
        if (str <= 3)
            tim = rn1(6, 6);
        else if (str < 6)
            tim = rn1(6, 4);
        else if (str < 9)
            tim = rn1(4, 4);
        else if (str < 12)
            tim = rn1(4, 2);
        else if (str < 15)
            tim = rn1(2, 2);
        else if (str < 18)
            tim = rnd(2);
        else if (str < 69)
            tim = 1;
        else {
            tim = 0;
            if (webmsgok)
                await You(`tear through ${article} web!`);
            deltrap(trap);
            newsym(game.u.ux, game.u.uy);
        }
        game.u.utrap = tim;
        if (!tim)
            game.u.utraptype = 0;
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || mtmp === game.u.usteed;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const mptr = mtmp.data;
    const article = trap.madeby_u ? 'your' : 'a';
    if (webmaker(mptr))
        return Trap_Effect_Finished;
    if (await mu_maybe_destroy_web(mtmp, in_sight, trap))
        return Trap_Effect_Finished;

    let tear_web = false;
    const alwaysTears = [
        PMNAMES.PM_TITANOTHERE, PMNAMES.PM_BALUCHITHERIUM,
        PMNAMES.PM_PURPLE_WORM, PMNAMES.PM_JABBERWOCK,
        PMNAMES.PM_IRON_GOLEM, PMNAMES.PM_BALROG, PMNAMES.PM_KRAKEN,
        PMNAMES.PM_MASTODON, PMNAMES.PM_ORION, PMNAMES.PM_NORN,
        PMNAMES.PM_CYCLOPS, PMNAMES.PM_LORD_SURTUR,
    ];
    const bear = mtmp.mnum === PMNAMES.PM_OWLBEAR
        || mtmp.mnum === PMNAMES.PM_BUGBEAR;
    if (bear && !in_sight) {
        await You_hear('the roaring of a confused bear!');
        mtmp.mtrapped = 1;
    } else if (alwaysTears.includes(mtmp.mnum)) {
        tear_web = true;
    } else if (mptr.mlet === MONSYMS.S_GIANT
               || (mptr.mlet === MONSYMS.S_DRAGON
                   && (mptr.mflags2 & MFLAGS.M2_NASTY))
               || (mtmp.wormno && count_wsegs(mtmp) > 5)) {
        tear_web = true;
    } else {
        if (in_sight) {
            await pline(`${Monnam(mtmp)} is caught in ${article} spider web.`);
            seetrap(trap);
        }
        mtmp.mtrapped = 1;
    }

    if (tear_web) {
        if (in_sight)
            await pline(`${Monnam(mtmp)} tears through ${article} spider web!`);
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
    } else if (forcetrap && !mtmp.mtrapped && in_sight) {
        await pline(`${Monnam(mtmp)} avoids ${article} spider web!`);
        seetrap(trap);
    }
    return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

// src/trap.c:1817 m_easy_escape_pit()
function m_easy_escape_pit(mtmp) {
    return (mtmp.mnum === PMNAMES.PM_PIT_FIEND
            || mtmp.data.msize >= MFLAGS.MZ_HUGE);
}


// src/trap.c:3913 mselftouch(), used after a fall or after worn inventory is
// stolen. A life-saved monster which is still unprotected drops the corpse.
export async function mselftouch(mon, arg, byplayer) {
    const mwep = MON_WEP(mon);

    if (!mwep || mwep.otyp !== ONAMES.CORPSE
        || !touch_petrifies(game.mons[mwep.corpsenm])
        || resists_ston(mon)) {
        return;
    }
    if (cansee(mon.mx, mon.my)) {
        const subject = arg ? mon_nam(mon) : Monnam(mon);
        await pline(`${arg || ''}${subject} touches ${
            corpse_xname(mwep, null, CXN_PFX_THE)}.`);
    }
    await minstapetrify(mon, byplayer);
    if (!DEADMONSTER(mon) && !which_armor(mon, W_ARMG)
        && !resists_ston(mon)) {
        mwepgone(mon);
    }
}

// src/trap.c trapeffect_selector() — dispatch one trap's effect for whoever
// stepped on it. Only the arms this port has are wired; the rest record so a
// session that lands on one is visibly incomplete rather than silently wrong.
async function trapeffect_selector(mtmp, trap, trflags) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
        return await trapeffect_arrow_trap(mtmp, trap, trflags);
    case DART_TRAP:
        return await trapeffect_dart_trap(mtmp, trap, trflags);
    case ROCKTRAP:
        return await trapeffect_rocktrap(mtmp, trap, trflags);
    case SQKY_BOARD:
        return await trapeffect_sqky_board(mtmp, trap, trflags);
    case MAGIC_TRAP:
        return await trapeffect_magic_trap(mtmp, trap, trflags);
    case BEAR_TRAP:
        return await trapeffect_bear_trap(mtmp, trap, trflags);
    case SLP_GAS_TRAP:
        return await trapeffect_slp_gas_trap(mtmp, trap, trflags);
    case LANDMINE:
        return await trapeffect_landmine(mtmp, trap, trflags);
    case PIT:
    case SPIKED_PIT:
        return await trapeffect_pit(mtmp, trap, trflags);
    case HOLE:
    case TRAPDOOR:
        return await trapeffect_hole(mtmp, trap, trflags);
    case RUST_TRAP:
        return await trapeffect_rust_trap(mtmp, trap, trflags);
    case FIRE_TRAP:
        return await trapeffect_fire_trap(mtmp, trap, trflags);
    case ROLLING_BOULDER_TRAP:
        return await trapeffect_rolling_boulder_trap(mtmp, trap, trflags);
    case TELEP_TRAP:
        return await trapeffect_telep_trap(mtmp, trap, trflags);
    case LEVEL_TELEP:
        return await trapeffect_level_telep(mtmp, trap, trflags);
    case MAGIC_PORTAL:
        return await trapeffect_magic_portal(mtmp, trap, trflags);
    case WEB:
        return await trapeffect_web(mtmp, trap, trflags);
    case STATUE_TRAP:
        if (mtmp === game.youmonst)
            await activate_statue_trap(trap, game.u.ux, game.u.uy, false);
        return Trap_Effect_Finished;
    case ANTI_MAGIC:
        return await trapeffect_anti_magic(mtmp, trap, trflags);
    case POLY_TRAP:
        return await trapeffect_poly_trap(mtmp, trap, trflags);
    default:
        note_unported_trap(`trapeffect_selector:ttyp=${trap.ttyp}`);
        return Trap_Effect_Finished;
    }
}

// src/trap.c:2070 trapeffect_telep_trap(). A one-shot trap is the vault
// teleporter; ordinary traps use the level's normal random teleport. The
// monster branch covers unmounted, unleashed monsters on ordinary traps.
async function trapeffect_telep_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const { mtele_trap } = await import('./teleport.js');

        await mtele_trap(mtmp, trap, in_sight);
        return Trap_Moved_Mon;
    }

    seetrap(trap);
    const { noteleport_level, tele, vault_tele } =
        await import('./teleport.js');
    if (game.u.uprops?.ANTIMAGIC || noteleport_level(game.youmonst)) {
        await You_feel('a wrenching sensation.');
    } else if (trap.once) {
        deltrap(trap);
        newsym(game.u.ux, game.u.uy);
        await vault_tele();
    } else if (isok(trap.teledest?.x ?? 0, trap.teledest?.y ?? 0)) {
        await teleds(trap.teledest.x, trap.teledest.y, TELEDS_TELEPORT);
    } else {
        await tele();
    }
    return Trap_Effect_Finished;
}

// src/trap.c:2088 trapeffect_level_telep() and
// src/teleport.c:1537 level_tele_trap(), hero branch.
async function trapeffect_level_telep(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const forcetrap = ((trflags & FORCETRAP) !== 0);
        const { mlevel_tele_trap } = await import('./teleport.js');

        return await mlevel_tele_trap(mtmp, trap, forcetrap, in_sight);
    }

    seetrap(trap);
    const intentional = (trflags & (VIASITTING | FORCETRAP)) !== 0;
    const verb = intentional ? 'trigger' : `${u_locomotion('step')} onto`;
    await You(`${verb} a level teleport trap!`);

    if ((game.u.uprops?.ANTIMAGIC && !intentional)
        || In_endgame(game.u.uz)) {
        await You_feel('a wrenching sensation.');
        return Trap_Effect_Finished;
    }

    deltrap(trap);
    newsym(game.u.ux, game.u.uy);
    const { level_tele } = await import('./teleport.js');
    await level_tele();

    if (Hallucination() || Teleport_control()) {
        await You(`briefly feel ${Hallucination() ? 'oriented' : 'centered'}.`);
    } else {
        await You_feel(`${game.u.uprops?.CONFUSION ? 'even more ' : ''}disoriented.`);
    }
    if (!Teleport_control()) {
        const { make_confused } = await import('./potion.js');
        const timeout = (game.u.intrinsic?.HConfusion || 0) & TIMEOUT;
        await make_confused(timeout + 3, false);
    }
    return Trap_Effect_Finished;
}

// src/teleport.c:1537 level_tele_trap(), deliberate hero activation.
export async function level_tele_trap(trap, trflags) {
    return await trapeffect_level_telep(game.youmonst, trap, trflags);
}

// src/trap.c:2710 trapeffect_magic_portal(), monster path. Portals send a
// monster to their fixed destination through the migrating-monster list.
async function trapeffect_magic_portal(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        feeltrap(trap);
        await domagicportal(trap);
        return Trap_Effect_Finished;
    }
    if (mtmp === game.u.usteed)
        return Trap_Effect_Finished;

    const in_sight = canseemon(mtmp);
    if (In_endgame(game.u.uz)) {
        const { mon_has_amulet } = await import('./wizard.js');
        const { is_home_elemental } = await import('./makemon.js');
        if (mon_has_amulet(mtmp) || is_home_elemental(mtmp.data) || rn2(7)) {
            if (in_sight && mtmp.data.mlet !== MONSYMS.S_ELEMENTAL) {
                await pline(`${Monnam(mtmp)} seems to shimmer for a moment.`);
                seetrap(trap);
            }
            return Trap_Effect_Finished;
        }
    }

    const dest = trap.dst;
    if (!dest || dest.dnum < 0) {
        note_unported_trap('trapeffect_magic_portal:no_destination');
        return Trap_Effect_Finished;
    }
    if (in_sight) {
        await pline(`Suddenly, ${mon_nam(mtmp)} disappears out of sight.`);
        seetrap(trap);
    }
    if (!(mtmp.data.mflags1 & MFLAGS.M1_TPORT_CNTRL))
        mtmp.mconf = 1;
    migrate_monster(mtmp, dest, MIGR_PORTAL);
    return Trap_Moved_Mon;
}

// src/trap.c:3733 mintrap() — a monster steps onto a trap.
//
// The "already caught in it" half is recorded: escaping draws rn2(40) and
// then branches through boulders, metallivores and eels, none of which any
// session has reached. The fresh-trigger half is live, because that is what
// spends draws on the common path.
export async function mintrap(mtmp, mintrapflags) {
    const trap = t_at_mon(mtmp.mx, mtmp.my);
    let trap_result = Trap_Effect_Finished;

    if (!trap) {
        mtmp.mtrapped = 0;      /* perhaps teleported? */
    } else if (mtmp.mtrapped) { /* is currently in the trap */
        if (!trap.tseen && cansee(mtmp.mx, mtmp.my) && canseemon(mtmp)
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE
                || trap.ttyp === WEB)) {
            /* If you come upon an obviously trapped monster, then
               you must be able to see the trap it's in too. */
            seetrap(trap);
        }

        if (!rn2(40) || (is_pit(trap.ttyp) && m_easy_escape_pit(mtmp))) {
            if (sobj_at(ONAMES.BOULDER, mtmp.mx, mtmp.my)
                && is_pit(trap.ttyp)) {
                if (!rn2(2)) {
                    mtmp.mtrapped = 0;
                    if (canseemon(mtmp))
                        await pline(`${Monnam(mtmp)} pulls free...`);
                    await fill_pit(mtmp.mx, mtmp.my);
                }
            } else {
                if (canseemon(mtmp)) {
                    if (is_pit(trap.ttyp))
                        await pline(`${Monnam(mtmp)} climbs ${
                            m_easy_escape_pit(mtmp) ? 'easily ' : ''}out of the pit.`);
                    else if (trap.ttyp === BEAR_TRAP || trap.ttyp === WEB)
                        await pline(`${Monnam(mtmp)} pulls free of the ${
                            trap.ttyp === BEAR_TRAP ? 'bear trap' : 'web'}.`);
                }
                mtmp.mtrapped = 0;
            }
        } else if (metallivorous(mtmp.data)) {
            if (trap.ttyp === BEAR_TRAP) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} eats a bear trap!`);
                deltrap(trap);
                mtmp.meating = 5;
                mtmp.mtrapped = 0;
            } else if (trap.ttyp === SPIKED_PIT) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} munches on some spikes!`);
                trap.ttyp = PIT;
                mtmp.meating = 5;
            }
        }
        trap_result = mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    } else {
        const tt = trap.ttyp;
        let forcetrap = ((mintrapflags & FORCETRAP) !== 0);
        const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
        /* monster has seen such a trap before */
        const already_seen = (mon_knows_traps(mtmp, tt)
                              || (tt === HOLE && !mindless(mtmp.data)));

        if (fixed_tele_trap(trap)) {
            mintrapflags |= FORCETRAP;
            forcetrap = true;
        }

        if (mtmp === game.u.usteed) {
            /* true when called from dotrap, inescapable is not an option */
        } else if (Sokoban() && (is_pit(tt) || is_hole(tt)) && !trap.madeby_u) {
            /* nothing here, the trap effects will handle messaging */
        } else if (!forcetrap) {
            if (floor_trigger(tt) && check_in_air(mtmp, mintrapflags))
                return Trap_Effect_Finished;
            if (already_seen && rn2(4) && !forcebungle)
                return Trap_Effect_Finished;
        }

        mon_learns_traps(mtmp, tt);
        mons_see_trap(trap);

        /* Monster is aggravated by being trapped by you. Recognizing who made
           the trap isn't completely unreasonable; everybody has their own
           style. */
        if (trap.madeby_u && rnl(5))
            await setmangry(mtmp, false);

        trap_result = await trapeffect_selector(mtmp, trap, mintrapflags);
    }
    return trap_result;
}

/* include/trap.h fixed_tele_trap(), a teleport trap with a fixed target. */
function fixed_tele_trap(trap) {
    return trap.ttyp === TELEP_TRAP
        && isok(trap.teledest?.x ?? 0, trap.teledest?.y ?? 0);
}


/* is_pit by trap type, exported for trapmove's adjacent-pit check. */
export function is_pit_ttyp(ttyp) {
    return is_pit(ttyp);
}
// src/trap.c:6648 uteetering_at_seen_pit() — escaped a pit and standing on
// the precipice.
export function uteetering_at_seen_pit(trap) {
    return !!(trap && is_pit(trap.ttyp) && trap.tseen
              && game.u.ux === trap.tx && game.u.uy === trap.ty
              && !(game.u.utrap && game.u.utraptype === TT_PIT));
}

// src/trap.c:6660 uescaped_shaft() — didn't fall through a hole / didn't
// release a trap door.
export function uescaped_shaft(trap) {
    return !!(trap && is_hole(trap.ttyp) && trap.tseen
              && game.u.ux === trap.tx && game.u.uy === trap.ty);
}

// src/apply.c:1518 splash_lit() — a lit lamp/candle hit by water. Only a
// BRASS_LANTERN survives a rust-trap splash; everything else lamplit goes
// out. No light-source timers exist in the port yet, so a lamplit object
// records; an unlit one returns false without drawing, which is the whole
// path today.
// src/mkobj.c:2270 is_flammable()
export function is_flammable(otmp) {
    const otyp = otmp.otyp;
    const omat = game.objects[otyp].oc_material;
    /* Is_candle */
    if (otyp === ONAMES.TALLOW_CANDLE || otyp === ONAMES.WAX_CANDLE)
        return false;
    if (game.objects[otyp].oc_oprop === 26 /* FIRE_RES */
        || otyp === ONAMES.WAN_FIRE)
        return false;
    return (omat <= MATERIALS.WOOD && omat !== MATERIALS.LIQUID)
           || omat === MATERIALS.PLASTIC;
}

// src/mkobj.c:2289 is_rottable()
export function is_rottable(otmp) {
    const omat = game.objects[otmp.otyp].oc_material;
    return omat <= MATERIALS.WOOD && omat !== MATERIALS.LIQUID;
}

/* include/objclass.h:200 is_rustprone(), :201 is_crackable(),
   :204 is_corrodeable(), :206 is_damageable() */
export const is_rustprone = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.IRON;
export const is_crackable = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.GLASS
    && otmp.oclass === OCLASSES.ARMOR_CLASS;
export const is_corrodeable = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.COPPER
    || game.objects[otmp.otyp].oc_material === MATERIALS.IRON;
export const is_damageable = (otmp) =>
    is_rustprone(otmp) || is_flammable(otmp) || is_rottable(otmp)
    || is_corrodeable(otmp) || is_crackable(otmp);

// src/zap.c:5710 inventory_resistance_check(). Equipped elemental
// resistance protects carried objects 99% of the time. This check belongs
// before erode_obj's material and erosion tests because C still spends the
// roll when the protected object would otherwise be unaffected.
function inventory_resistance_check(dmgtyp) {
    const prop = dmgtyp === ATTKS.AD_COLD ? 'COLD_RES'
               : dmgtyp === ATTKS.AD_FIRE ? 'FIRE_RES'
                 : dmgtyp === ATTKS.AD_ELEC ? 'SHOCK_RES'
                   : dmgtyp === ATTKS.AD_ACID ? 'ACID_RES' : null;
    let probability = prop
        && (((game.u.uprops?.[prop] || 0)
             & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART)) !== 0) ? 99 : 0;

    if (!probability && game.u.uarmc?.otyp === ONAMES.DWARVISH_CLOAK
        && (dmgtyp === ATTKS.AD_COLD || dmgtyp === ATTKS.AD_FIRE))
        probability = 90;
    return probability ? rn2(100) < probability : false;
}

// include/hack.h next2u()
const next2u = (px, py) => distu(px, py) <= 2;

// src/trap.c:171 erode_obj()
export async function erode_obj(otmp, ostr, type, ef_flags) {
    const action = ['smoulder', 'rust', 'rot', 'corrode', 'crack'],
          msg = ['burnt', 'rusted', 'rotten', 'corroded', 'cracked'],
          bythe = ['heat', 'oxidation', 'decay', 'corrosion',
                   'impact']; /* this could use improvement... */
    let vulnerable = false, is_primary = true,
        check_grease = (ef_flags & EF_GREASE) ? true : false,
        print = (ef_flags & EF_VERBOSE) ? true : false,
        crackers = false, /* True: different feedback if otmp destroyed */
        uvictim, vismon, visobj;
    let erosion, cost_type;
    let victim;

    if (!otmp)
        return ER_NOTHING;

    victim = carried(otmp) ? game.youmonst
             : mcarried(otmp) ? otmp.ocarry
               : null;
    uvictim = (victim === game.youmonst);
    vismon = victim && (victim !== game.youmonst) && canseemon(victim);
    /* Is gb.bhitpos correct here? Ugh. */
    visobj = (!victim && cansee(game.bhitpos?.x ?? 0, game.bhitpos?.y ?? 0)
              && (!is_pool(game.bhitpos?.x ?? 0, game.bhitpos?.y ?? 0)
                  || (next2u(game.bhitpos?.x ?? 0, game.bhitpos?.y ?? 0)
                      && Underwater())));

    switch (type) {
    case ERODE_BURN:
        if (uvictim && inventory_resistance_check(ATTKS.AD_FIRE))
            return ER_NOTHING;
        vulnerable = is_flammable(otmp);
        check_grease = false;
        cost_type = COST_BURN;
        break;
    case ERODE_RUST:
        vulnerable = is_rustprone(otmp);
        cost_type = COST_RUST;
        break;
    case ERODE_ROT:
        vulnerable = is_rottable(otmp);
        check_grease = false;
        is_primary = false;
        cost_type = COST_ROT;
        break;
    case ERODE_CORRODE:
        if (uvictim && inventory_resistance_check(ATTKS.AD_ACID))
            return ER_NOTHING;
        vulnerable = is_corrodeable(otmp);
        is_primary = false;
        cost_type = COST_CORRODE;
        break;
    case ERODE_CRACK: /* crystal armor */
        vulnerable = is_crackable(otmp);
        is_primary = true;
        crackers = true;
        cost_type = COST_CRACK;
        break;
    default:
        /* impossible("Invalid erosion type in erode_obj") */
        return ER_NOTHING;
    }
    erosion = is_primary ? (otmp.oeroded | 0) : (otmp.oeroded2 | 0);

    if (!ostr)
        ostr = cxname(otmp);
    /* 'visobj' messages insert "the"; probably ought to switch to the() */
    if (visobj && !(uvictim || vismon) && ostr.slice(0, 4).toLowerCase() === 'the ')
        ostr = ostr.slice(4);

    if (check_grease && otmp.greased) {
        await grease_protect(otmp, ostr, victim);
        return ER_GREASED;
    } else if (!erosion_matters(otmp, game.objects)) {
        return ER_NOTHING;
    } else if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        if (game.flags?.verbose && print && (uvictim || vismon))
            await pline(`${uvictim ? 'Your' : s_suffix(Monnam(victim))} ${ostr} ${vtense(ostr, 'are')} not affected by ${bythe[type]}.`);
        return ER_NOTHING;
    } else if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        if (game.flags?.verbose && (print || otmp.oerodeproof)
            && (uvictim || vismon || visobj))
            await pline(`Somehow, ${uvictim ? 'your' : !vismon ? 'the' /* visobj */ : s_suffix(mon_nam(victim))} ${ostr} ${vtense(ostr, 'are')} not affected by the ${bythe[type]}.`);
        /* We assume here that if the object is protected because it
         * is blessed, it still shows some minor signs of wear, and
         * the hero can distinguish this from an object that is
         * actually proof against damage.
         */
        if (otmp.oerodeproof) {
            otmp.rknown = 1;
            if (victim === game.youmonst)
                update_inventory();
        }

        return ER_NOTHING;
    } else if (erosion < MAX_ERODE) {
        const adverb = (erosion + 1 === MAX_ERODE) ? ' completely'
                       : erosion ? ' further'
                         : '';

        if (uvictim || vismon || visobj)
            await pline(`${uvictim ? 'Your' : !vismon ? 'The' /* visobj */ : s_suffix(Monnam(victim))} ${ostr} ${vtense(ostr, action[type])}${adverb}!`);

        if (ef_flags & EF_PAY)
            await costly_alteration(otmp, cost_type);

        if (is_primary)
            otmp.oeroded = (otmp.oeroded | 0) + 1;
        else
            otmp.oeroded2 = (otmp.oeroded2 | 0) + 1;

        if (victim === game.youmonst)
            update_inventory();

        return ER_DAMAGED;
    } else if (ef_flags & EF_DESTROY) {
        otmp.in_use = 1; /* in case of hangup during message w/ --More-- */
        if (uvictim || vismon || visobj) {
            let actbuf;

            if (!crackers)
                actbuf = `${vtense(ostr, action[type])} away`;
            else
                actbuf = 'shatters';
            await pline(`${uvictim ? 'Your' : !vismon ? 'The' /* visobj */ : s_suffix(Monnam(victim))} ${ostr} ${actbuf}!`);
        }
        if (ef_flags & EF_PAY)
            await costly_alteration(otmp, cost_type);

        if (otmp.owornmask) {
            /* unwear otmp before deleting it */
            if (carried(otmp)) {
                /* otmp remains in hero's invent; if we get here because
                   it is being burned up by lava, we don't need to worry
                   about unwearing levitation boots and having that
                   trigger float_down to then fall in again; if such
                   were being worn, they wouldn't be in the lava now */
                await remove_worn_item(otmp, true); /* calls Cloak_off(),&c */
            } else if (mcarried(otmp)) {
                /* results in otmp->where==OBJ_FREE; delobj() doesn't care */
                extract_from_minvent(otmp.ocarry, otmp, true, false);
            } else { /* worn but not in hero invent or monster minvent ? */
                /* impossible("erode_obj(%d): destroying strangely worn item [%d, 0x%08lx: %s]", ...) */
                otmp.owornmask = 0; /* otherwise a second complaint (about
                                     * deleting a worn item) will ensue */
            }
        }
        delobj(otmp);
        return ER_DESTROYED;
    } else {
        if (game.flags?.verbose && print) {
            if (uvictim)
                await Your(`${ostr} ${vtense(ostr, Blind() ? 'feel' : 'look')} completely ${msg[type]}.`);
            else if (vismon || visobj)
                await pline(`${!vismon ? 'The' : s_suffix(Monnam(victim))} ${ostr} ${vtense(ostr, 'look')} completely ${msg[type]}.`);
        }
        return ER_NOTHING;
    }
}

// src/trap.c:360 grease_protect()
async function grease_protect(otmp, ostr, victim) {
    const txt = 'protected by the layer of grease!';
    const vismon = victim && (victim !== game.youmonst) && canseemon(victim);

    if (ostr) {
        if (victim === game.youmonst)
            await Your(`${ostr} ${vtense(ostr, 'are')} ${txt}`);
        else if (vismon)
            await pline(`${Monnam(victim)}'s ${ostr} ${vtense(ostr, 'are')} ${txt}`);
    } else if (victim === game.youmonst || vismon) {
        await pline(`${Yobjnam2(otmp, 'are')} ${txt}`);
    }
    if (!rn2(2)) {
        otmp.greased = 0;
        if (carried(otmp)) {
            await pline_The('grease dissolves.');
            update_inventory();
        }
        return true;
    }
    return false;
}


// src/trap.c:85 burnarmor(). Fire chooses one armor slot repeatedly until it
// either finds something it can affect or reaches the torso arm, which always
// finishes the search. A torso hit lets the caller burn carried items too.
export async function burnarmor(victim) {
    if (!victim)
        return false;
    const hitting_u = victim === game.youmonst;

    const towels = (hitting_u ? game.invent : victim.minvent || [])
        .filter((obj) => obj.otyp === ONAMES.TOWEL && (obj.spe | 0) > 0);
    for (const item of towels) {
        const oldspe = item.spe | 0;
        const newspe = rn2(oldspe + 1);
        if (newspe < oldspe) {
            item.spe = newspe;
            if (hitting_u)
                await pline(`${Yname2(item)} dries${newspe ? '' : ' out'}.`);
            else if (canseemon(victim))
                await pline(`${Monnam(victim)}'s ${xname(item)} dries${
                    newspe ? '' : ' out'}.`);
            break;
        }
    }

    const armor = (slot) => hitting_u ? game.u[slot]
        : which_armor(victim, {
            uarmh: W_ARMH, uarmc: W_ARMC, uarm: W_ARM, uarmu: W_ARMU,
            uarms: W_ARMS, uarmg: W_ARMG, uarmf: W_ARMF,
        }[slot]);
    const burn = async (obj, descr) =>
        await erode_obj(obj, descr, ERODE_BURN, EF_GREASE);
    const materialNames = [
        'mysterious', 'liquid', 'wax', 'organic', 'flesh', 'paper', 'cloth',
        'leather', 'wooden', 'bone', 'dragonhide', 'iron', 'metal', 'copper',
        'silver', 'gold', 'platinum', 'mithril', 'plastic', 'glass',
        'gemstone', 'stone',
    ];

    for (;;) {
        let item;
        switch (rn2(5)) {
        case 0:
            item = armor('uarmh');
            if (!await burn(item, item
                ? `${materialNames[game.objects[item.otyp].oc_material]} ${
                    helm_simple_name(item)}` : 'helmet'))
                continue;
            break;
        case 1:
            item = armor('uarmc');
            if (item) {
                await burn(item, cloak_simple_name(item));
                return true;
            }
            item = armor('uarm');
            if (item) {
                await burn(item, xname(item));
                return true;
            }
            item = armor('uarmu');
            if (item)
                await burn(item, 'shirt');
            return true;
        case 2:
            if (!await burn(armor('uarms'), 'wooden shield'))
                continue;
            break;
        case 3:
            if (!await burn(armor('uarmg'), 'gloves'))
                continue;
            break;
        case 4:
            if (!await burn(armor('uarmf'), 'boots'))
                continue;
            break;
        }
        break;
    }
    return false;
}

/* include/obj.h carried() — obj is in hero inventory */
function carried_tr(obj) {
    return obj.where === 3 /* OBJ_INVENT */ || game.invent.includes(obj);
}

// src/trap.c:4576 lava_damage()
export async function lava_damage(obj, x, y) {
    const otyp = obj.otyp, ocls = obj.oclass;

    /* the Amulet, invocation items, and Rider corpses are never destroyed
       (let Book of the Dead fall through to fire_damage() to get feedback) */
    if (obj_resists(obj, 0, 0) && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD)
        return false;
    /* destroy liquid (venom), wax, veggy, flesh, paper (except for scrolls
       and books--let fire damage deal with them), cloth, leather, wood, bone
       unless it's inherently or explicitly fireproof or contains something;
       note: potions are glass so fall through to fire_damage() and boil */
    if (game.objects[otyp].oc_material < MATERIALS.DRAGON_HIDE
        && ocls !== OCLASSES.SCROLL_CLASS && ocls !== OCLASSES.SPBOOK_CLASS
        && game.objects[otyp].oc_oprop !== FIRE_RES
        && otyp !== ONAMES.WAN_FIRE && otyp !== ONAMES.FIRE_HORN
        /* assumes oerodeproof isn't overloaded for some other purpose on
           non-eroding items */
        && !obj.oerodeproof
        /* fire_damage() knows how to deal with containers and contents */
        && !Has_contents(obj)) {
        if (cansee(x, y)) {
            /* this feedback is pretty clunky and can become very verbose
               when former contents of a burned container get here via
               flooreffects() */
            if (obj === game.thrownobj || obj === game.kickedobj)
                await pline(`${is_plural(obj) ? 'They' : 'It'} ${otense(obj, 'burn')} up!`);
            else
                await You_see(`${doname(obj)} hit lava and burn up!`);
        }
        if (carried(obj)) { /* shouldn't happen */
            await remove_worn_item(obj, true);
            useupall(obj);
        } else
            delobj(obj);
        return true;
    }
    return await fire_damage(obj, true, x, y);
}

// src/trap.c:4657 pot_acid_damage()
async function pot_acid_damage(obj, in_invent, described) {
    let bufp;
    let one, exploded;

    one = (obj.quan === 1);
    exploded = false;

    if (Blind() && !in_invent)
        obj.dknown = 0;
    if (game.acid_ctx?.ctx_valid)
        exploded = ((obj.dknown ? game.acid_ctx.dkn_boom
                                : game.acid_ctx.unk_boom) > 0);
    if (described) {
        /* just gave "The grease washes off your potion of acid."
            or "...your <color> potion." (or just "...your potion.");
            don't re-describe potion here; if we used "It explodes!"
            then "it" might be misconstrued as applying to "grease" */
        await pline_The(`potion${plur(obj.quan)} ${otense(obj, 'explode')}!`);
    } else {
        /* First message is
            * "a [potion|<color> potion|potion of acid] explodes"
            * depending on obj->dknown (potion has been seen) and
            * objects[POT_ACID].oc_name_known (fully discovered),
            * or "some {plural version} explode" when relevant.
            * Second and subsequent messages for same chain and
            * matching dknown status are
            * "another [potion|<color> &c] explodes" or plural
            * variant.
            */
        bufp = simpleonames(obj);
        await pline(`${!exploded ? (one ? 'A ' : 'Some ') : (one ? 'Another ' : 'More ')}${bufp} ${vtense(bufp, 'explode')}!`); /* "A potion explodes!" */
    }
    if (game.acid_ctx?.ctx_valid) {
        if (obj.dknown)
            game.acid_ctx.dkn_boom++;
        else
            game.acid_ctx.unk_boom++;
    }
    setnotworn(obj);
    delobj(obj);
    if (in_invent)
        update_inventory();
}

// src/trap.c:4712 water_damage()
export async function water_damage(obj, ostr, force) {
    const in_invent = obj && carried(obj);
    let described = false;

    if (!obj)
        return ER_NOTHING;

    if (await splash_lit(obj))
        return ER_DAMAGED;

    if (!ostr)
        ostr = cxname(obj);

    if (obj.otyp === ONAMES.CAN_OF_GREASE && obj.spe > 0) {
        return ER_NOTHING;
    } else if (obj.otyp === ONAMES.TOWEL && obj.spe < 7) {
        /* a negative change induces a reverse increment, adding abs(change);
           spe starts 0..6, arg passed to rnd() is 1..7, change is -7..-1,
           final spe is 1..7 and always greater than its starting value */
        await wet_a_towel(obj, -rnd(7 - obj.spe), true);
        return ER_NOTHING;
    } else if (obj.greased) {
        if (!rn2(2)) {
            obj.greased = 0;
            if (in_invent) {
                await pline_The(`grease on ${yname(obj)} washes off.`);
                described = true; /* used to modify potion feedback */
                update_inventory();
            }
            /* ungreased potions of acid will always be destroyed by water */
            if (obj.otyp === ONAMES.POT_ACID) {
                await pot_acid_damage(obj, in_invent, described);
                return ER_DESTROYED;
            }
        }
        return ER_GREASED;
    } else if (Is_container_tr(obj)
               && (!Waterproof_container_tr(obj) || (obj.cursed && !rn2(3)))) {
        if (in_invent) {
            await pline(`Some ${hliquid('water')} gets into your ${ostr}!`);
            game.mentioned_water = !Hallucination();
        }
        await water_damage_chain(obj.cobj, false);
        return ER_DAMAGED; /* contents were damaged */
    } else if (Waterproof_container_tr(obj)) {
        if (in_invent && !Blind() && !Underwater()) {
            await pline_The(`${hliquid('water')} cannot get into your ${ostr}.`);
            game.mentioned_water = !Hallucination();
            makeknown(obj.otyp); /* if an oilskin sack, discover it; doesn't
                                  * matter for chest, large box, ice box */
        }
        /* not actually damaged, but because we /didn't/ get the "water
           gets into!" message, the player now has more information and
           thus we need to waste any potion they may have used (also,
           flavourwise the water is now on the floor) */
        return ER_DAMAGED;
    } else if (!force && (((game.u.uluck | 0) + (game.u.moreluck | 0)) + 5) > rn2(20)) {
        /*  chance per item of sustaining damage:
            *   max luck:               10%
            *   avg luck (Luck==0):     75%
            *   awful luck (Luck<-4):  100%
            */
        return ER_NOTHING;
    } else if (obj.oclass === OCLASSES.SCROLL_CLASS) {
        if (obj.otyp === ONAMES.SCR_BLANK_PAPER
            || obj.otyp === ONAMES.SCR_MAIL /* MAIL_STRUCTURES */
           ) return 0;
        if (in_invent)
            await Your(`${ostr} ${vtense(ostr, 'fade')}.`);

        obj.otyp = ONAMES.SCR_BLANK_PAPER;
        obj.dknown = 0;
        obj.spe = 0;
        if (in_invent)
            update_inventory();
        return ER_DAMAGED;
    } else if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
        const otyp = obj.otyp;

        if (otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            const cc = { x: 0, y: 0 };

            /* note: The Book of the Dead can't be contained or buried */
            if (get_obj_location(obj, cc, CONTAINED_TOO | BURIED_TOO))
                obj.ox = cc.x, obj.oy = cc.y;
            if (isok(cc.x, cc.y) && cansee(cc.x, cc.y))
                await pline(`Steam rises from ${the(xname(obj))}.`);
            return 0;
        } else if (otyp === ONAMES.SPE_BLANK_PAPER) {
            return 0;
        }
        if (in_invent)
            await Your(`${ostr} ${vtense(ostr, 'fade')}.`);

        obj.otyp = ONAMES.SPE_BLANK_PAPER;
        /* same re-init as over-reading or polymorph; matters if it gets
           polymorphed into non-blank; doesn't matter if eventually written
           on since that replaces it with new book and studied count of 0 */
        if (obj.spestudied)
            obj.spestudied = rn2(obj.spestudied);
        obj.dknown = 0;
        /* blanking a novel is more involved than blanking a spellbook */
        if (otyp === ONAMES.SPE_NOVEL) /* old type */
            blank_novel(obj);
        if (in_invent)
            update_inventory();
        return ER_DAMAGED;
    } else if (obj.oclass === OCLASSES.POTION_CLASS) {
        if (obj.otyp === ONAMES.POT_ACID) {
            await pot_acid_damage(obj, in_invent, described);
            return ER_DESTROYED;
        } else if (obj.odiluted) {
            if (in_invent)
                await Your(`${ostr} ${vtense(ostr, 'dilute')} further.`);

            obj.otyp = ONAMES.POT_WATER;
            obj.dknown = 0;
            obj.blessed = obj.cursed = 0;
            obj.odiluted = 0;
            if (in_invent)
                update_inventory();
            return ER_DAMAGED;
        } else if (obj.otyp !== ONAMES.POT_WATER) {
            if (in_invent)
                await Your(`${ostr} ${vtense(ostr, 'dilute')}.`);

            obj.odiluted = (obj.odiluted | 0) + 1;
            if (in_invent)
                update_inventory();
            return ER_DAMAGED;
        }
    } else {
        return await erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
    }
    return ER_NOTHING;
}

/* include/obj.h Is_container() / Waterproof_container() */
function Is_container_tr(obj) {
    return obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.CHEST
        || obj.otyp === ONAMES.ICE_BOX || obj.otyp === ONAMES.SACK
        || obj.otyp === ONAMES.OILSKIN_SACK || obj.otyp === ONAMES.BAG_OF_HOLDING
        || obj.otyp === ONAMES.BAG_OF_TRICKS;
}
function Waterproof_container_tr(obj) {
    return obj.otyp === ONAMES.OILSKIN_SACK || obj.otyp === ONAMES.CHEST
        || obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.ICE_BOX;
}
function Underwater_tr() {
    return !!game.u?.uinwater;
}

// src/trap.c:4855 water_damage_chain()
export async function water_damage_chain(obj, here) {
    const cc = { x: 0, y: 0 };

    if (!obj || !obj.length)
        return;

    /* initialize acid context: so far, neither seen (dknown) potions of
       acid nor unseen have exploded during this water damage sequence */
    game.acid_ctx = { dkn_boom: 0, unk_boom: 0, ctx_valid: true };
    /* we don't want to permanently overwrite bhitpos below, since we can get
       here from scenarios where it was in use up the call stack (e.g. thrown
       item hurtling the levitating hero into a wall of water) */
    const save_bhitpos = game.bhitpos;
    /* erode_obj() relies on bhitpos if target objects aren't carried by
       the hero or a monster, to check visibility controlling feedback */
    if (get_obj_location(obj[0], cc, CONTAINED_TOO))
        game.bhitpos = { x: cc.x, y: cc.y };

    /* C walks the chain fetching each next link before damaging the current
       object; the snapshot copy gives the same sequence when an object is
       deleted from the list part way through */
    for (const otmp of [...obj])
        await water_damage(otmp, null, false);

    /* reset acid context and bhitpos */
    game.acid_ctx = { dkn_boom: 0, unk_boom: 0, ctx_valid: false };
    game.bhitpos = save_bhitpos;
}

// src/trap.c:4455 fire_damage() and :4550 fire_damage_chain().
export async function fire_damage(obj, force, x, y) {
    const inSight = !Blind() && couldsee(x, y);

    /* The container-content branch is separate because burning a container
       spills its contents back onto the same square. */
    if (Is_container_tr(obj)) {
        if (obj.otyp === ONAMES.ICE_BOX)
            return false;
        const chance = obj.otyp === ONAMES.CHEST ? 40
                     : obj.otyp === ONAMES.LARGE_BOX ? 30 : 20;
        if (!force && (game.u.uluck | 0) + 5 > rn2(chance))
            return false;
        if (inSight)
            await pline(`${Yname2(obj)} catches fire and burns.`);
        if (obj.cobj?.length) {
            if (inSight)
                await pline('Its contents fall out.');
            for (const item of [...obj.cobj]) {
                obj.cobj.splice(obj.cobj.indexOf(item), 1);
                item.ocontainer = null;
                place_object(item, x, y);
            }
        }
        delobj(obj);
        return true;
    }

    if (!force && (game.u.uluck | 0) + 5 > rn2(20))
        return false;

    if (obj.oclass === OCLASSES.SCROLL_CLASS
        || obj.oclass === OCLASSES.SPBOOK_CLASS) {
        if (obj.otyp === ONAMES.SCR_FIRE || obj.otyp === ONAMES.SPE_FIREBALL)
            return false;
        if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            if (inSight)
                await pline(`Smoke rises from the ${xname(obj)}.`);
            return false;
        }
        if (inSight)
            await pline(`${Yname2(obj)} catches fire and burns.`);
        delobj(obj);
        return true;
    }

    if (obj.oclass === OCLASSES.POTION_CLASS) {
        if (inSight)
            await pline(`${Yname2(obj)} ${obj.otyp === ONAMES.POT_OIL
                ? 'ignites and explodes' : 'boils and explodes'}.`);
        delobj(obj);
        return true;
    }

    return await erode_obj(obj, null, ERODE_BURN, EF_DESTROY)
        === ER_DESTROYED;
}

export async function fire_damage_chain(objs, force, here, x, y) {
    game.bhitpos = { x, y };
    let destroyed = 0;
    for (const obj of [...(objs || [])])
        if (await fire_damage(obj, force, x, y))
            destroyed++;
    if (destroyed && Blind() && !couldsee(x, y))
        await You('smell smoke.');
    return destroyed;
}

// src/apply.c:698 number_leashed()
function number_leashed() {
    let i = 0;
    for (const obj of (game.invent || []))
        if (obj.otyp === ONAMES.LEASH && obj.leashmon)
            i++;
    return i;
}

// src/trap.c:4900 emergency_disrobe() — drop random items until light
// enough to crawl out; true if now unencumbered enough.
async function emergency_disrobe(state) {
    let invc = inv_cnt(true);

    while (near_capacity() > (Punished() ? UNENCUMBERED : SLT_ENCUMBER)) {
        let otmp = null;

        /* Pick a random object */
        if (invc > 0) {
            let i = rn2(invc);
            for (const obj of (game.invent || [])) {
                /* undroppables: body armor, boots, gloves, amulets, rings,
                   cursed loadstones, items mid-removal */
                const u = game.u;
                if (!((obj.otyp === ONAMES.LOADSTONE && obj.cursed)
                      || obj === u.uamul || obj === u.uleft
                      || obj === u.uright || obj === u.ublindf
                      || obj === u.uarm || obj === u.uarmc
                      || obj === u.uarmg || obj === u.uarmf
                      || obj === u.uarmu
                      || (obj.cursed && (obj === u.uarmh || obj === u.uarms))
                      || welded(obj)
                      || obj.o_id === game.stealoid || obj.in_use))
                    otmp = obj;
                /* reached the mark and found some stuff to drop? */
                if (--i < 0 && otmp)
                    break;
            }
        }
        if (!otmp)
            return false; /* nothing to drop! */
        if (otmp.owornmask)
            await remove_worn_item(otmp, false);
        state.lostsome = true;
        const { dropx } = await import('./do.js');
        await dropx(otmp);
        invc--;
    }
    return true;
}

// src/trap.c:4946 rnd_nextto_goodpos() — pick a random goodpos() next to
// x,y; for the hero it uses crawl_destination(). Mutates and returns the
// coord, null when none works. The Fisher-Yates over N_DIRS draws all
// eight rn2()s before any direction is tested.
export async function rnd_nextto_goodpos(cc, mtmp) {
    const is_u = (mtmp === game.youmonst || mtmp === null);
    const dirs = [];
    for (let i = 0; i < N_DIRS; ++i)
        dirs[i] = i;
    for (let i = N_DIRS; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (let i = 0; i < N_DIRS; ++i) {
        const nx = cc.x + xdir[dirs[i]];
        const ny = cc.y + ydir[dirs[i]];
        /* crawl_destination and goodpos both include an isok() check */
        if (is_u ? await crawl_destination(nx, ny)
                 : goodpos(nx, ny, mtmp, 0)) {
            cc.x = nx;
            cc.y = ny;
            return true;
        }
    }
    return false;
}

// src/trap.c:4976 back_on_ground()
async function back_on_ground(rescued) {
    let preposit = (Levitation() || Flying()) ? 'over' : 'on',
        surf = surface(game.u.ux, game.u.uy), you_are_back;

    if (is_ice(game.u.ux, game.u.uy)) {
        /* "on ice" */
        surf = ice_descr(game.u.ux, game.u.uy);
    } else if (surf.toLowerCase() === 'floor' || surf.toLowerCase() === 'ground') {
        /* "on solid ground" */
        surf = 'solid ground';
    } else if (surf.toLowerCase() === 'bridge' || surf.toLowerCase() === 'altar'
               || surf.toLowerCase() === 'headstone') {
        /* "on a bridge" */
        surf = an(surf);
    } else if (surf.toLowerCase() === 'stairs' || surf.toLowerCase() === 'lava'
               || surf.toLowerCase() === 'bottom') {
        /* "on the stairs" */
        surf = the(surf);
    } else { /* "cloud", "air", "air bubble", "wall", "fountain", "doorway" */
        /* "in a cloud", "in the air" */
        surf = surf === 'air' ? the(surf) : an(surf);
        preposit = 'in';
    }
    if (rescued) {
        you_are_back = 'You find yourself';
    } else {
        you_are_back = game.flags?.verbose !== false ? 'You are back' : 'Back';
    }
    await pline(`${you_are_back} ${preposit} ${surf}.`);
    (game.iflags ||= {}).last_msg = PLNMSG_BACK_ON_GROUND;
}

// src/trap.c:5014 rescued_from_terrain()
async function rescued_from_terrain(how) {
    const find_yourself = 'find yourself';
    const lev = game.level.at(game.u.ux, game.u.uy);
    let mesggiven = false;

    switch (how) {
    case DROWNING:
        if (is_pool(game.u.ux, game.u.uy)) {
            await You(`${find_yourself} ${
                (Is_waterlevel(game.u.uz) || IS_WATERWALL(lev.typ))
                  ? 'in the midst' : 'on top'} of ${hliquid('water')}.`);
            mesggiven = true;
        } else if (IS_AIR(lev.typ)) {
            await You(`${find_yourself} in ${
                Is_waterlevel(game.u.uz) ? 'an air bubble' : 'mid air'}.`);
            mesggiven = true;
        }
        break;
    case BURNING: /* moved onto lava without fire resistance */
    case DISSOLVED: /* sunk into lava while fire resistant */
        if (is_pool(game.u.ux, game.u.uy)) {
            await You(`${find_yourself} ${game.u.uinwater ? 'in' : 'on'} ${hliquid('water')}.`);
            mesggiven = true;
        } else if (is_lava(game.u.ux, game.u.uy)) {
            await You(`${find_yourself} on top of ${hliquid('molten lava')}.`);
            mesggiven = true;
        }
        break;
    default:
        break;
    }
    if (!mesggiven)
        await back_on_ground(true);

    (game.iflags ||= {}).last_msg = PLNMSG_BACK_ON_GROUND; /* for describe_decor() */
    /* feedback just disclosed this */
    update_lastseentyp(game.u.ux, game.u.uy);
    game.iflags.prev_decor = game.level.at(game.u.ux, game.u.uy).lastseentyp;
}

// src/trap.c:5059 drown(); the hero is in water. Returns true if the
// hero changed location while surviving.
export async function drown() {
    const u = game.u;
    let pool_of_water;
    let inpool_ok = false;
    let i;
    const is_solid = is_waterwall(u.ux, u.uy);

    feel_newsym(u.ux, u.uy); /* in case Blind, map the water here */
    /* happily wading in the same contiguous pool */
    if (u.uinwater && is_pool(u.ux - u.dx, u.uy - u.dy)
        && (Swimming() || Amphibious() || Breathless())) {
        /* water effects on objects every now and then */
        if (!rn2(5))
            inpool_ok = true;
        else
            return false;
    }

    if (!u.uinwater) {
        await You(`${is_solid ? 'plunge' : 'fall'} into the ${
            waterbody_name(u.ux, u.uy)}${
            (Amphibious() || Swimming() || Breathless()) ? '.' : '!'}`);
        if (!Swimming() && !is_solid)
            await You(`sink like ${Hallucination() ? 'the Titanic' : 'a rock'}.`);
    }

    await water_damage_chain(game.invent, false);

    if (u.umonnum === PMNAMES.PM_GREMLIN && rn2(3)) {
        await split_mon(game.youmonst, null);
    } else if (u.umonnum === PMNAMES.PM_IRON_GOLEM) {
        await You('rust!');
        i = Maybe_Half_Phys(d(2, 6));
        if (u.mhmax > i)
            u.mhmax -= i;
        await losehp(i, 'rusting away', KILLED_BY);
    }
    if (inpool_ok)
        return false;

    if ((i = number_leashed()) > 0) {
        await pline_The(`leash${(i > 1) ? 'es' : ''} slip${(i > 1) ? '' : 's'} loose.`);
        unleash_all();
    }

    if (Amphibious() || Breathless() || Swimming()) {
        if (Amphibious() || Breathless()) {
            if (game.flags?.verbose !== false)
                await pline("But you aren't drowning.");
            if (!Is_waterlevel(u.uz)) {
                if (Hallucination())
                    await Your('keel hits the bottom.');
                else
                    await You('touch bottom.');
            }
        }
        if (Punished()) {
            unplacebc();
            await placebc();
        }
        vision_recalc(2); /* unsee old position */
        await set_uinwater(1); /* u.uinwater = 1 */
        await under_water(1);
        game.vision_full_recalc = 1;
        return false;
    }
    if ((Teleportation() || can_teleport(game.youmonst.data)) && !Unaware()
        && (Teleport_control() || rn2(3) < Luck() + 2)) {
        await You('attempt a teleport spell.'); /* utcsri!carroll */
        if (!noteleport_level(game.youmonst)) {
            await dotele(false);
            if (!is_pool(u.ux, u.uy))
                return true;
        } else
            await pline_The('attempted teleport spell fails.');
    }
    if (u.usteed) {
        await dismount_steed(DISMOUNT_GENERIC);
        if (!is_pool(u.ux, u.uy))
            return true;
    }
    /* if sleeping, wake up now so that we don't crawl out of water
       while still asleep; we can't do that the same way that waking
       due to combat is handled; note unmul() clears u.usleep */
    if (u.usleep)
        await unmul('Suddenly you wake up!');
    /* being doused will revive from fainting */
    if (is_fainted())
        await reset_faint();

    const cc = { x: u.ux, y: u.uy };
    /* have to be able to move in order to crawl */
    if (game.multi >= 0 && game.youmonst.data.mmove
        && await rnd_nextto_goodpos(cc, game.youmonst)) {
        const lost = { lostsome: false };
        /* time to do some strip-tease... */
        const succ = Is_waterlevel(u.uz) ? true : await emergency_disrobe(lost);

        await You(`try to crawl out of the ${hliquid('water')}.`);
        if (lost.lostsome)
            await You('dump some of your gear to lose weight...');
        if (succ) {
            await pline('Pheew!  That was close.');
            await teleds(cc.x, cc.y, TELEDS_ALLOW_DRAG);
            return true;
        }
        /* still too much weight */
        await pline('But in vain.');
    }
    await set_uinwater(1); /* u.uinwater = 1 */
    await urgent_pline('You drown.');
    /* first pass is survivable by using up an amulet of life-saving or by
       answering no to "Die?" in explore|wizard mode; second pass can only
       be survivable via the latter */
    for (i = 0; i < 2; i++) {
        /* killer format and name are reconstructed every iteration
           because lifesaving resets them */
        pool_of_water = waterbody_name(u.ux, u.uy);
        let kfmt = KILLED_BY_AN;
        /* avoid "drowned in [a] water" */
        if (pool_of_water === 'water')
            pool_of_water = 'deep water', kfmt = KILLED_BY;
        /* avoid "drowned in _a_ limitless water" on Plane of Water */
        else if (pool_of_water === 'limitless water')
            kfmt = KILLED_BY;
        game.killer = { format: kfmt, name: pool_of_water };
        await done(DROWNING);
        /* oops, we're still alive.  better get out of the water. */
        if (await safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT))
            break; /* successful life-save */
        /* nowhere safe to land; repeat drowning loop... */
        await pline("You're still drowning.");
    }

    if (u.uinwater)
        await set_uinwater(0); /* u.uinwater = 0 */
    await rescued_from_terrain(DROWNING);
    return true;
}

// src/trap.c:6790 lava_effects(); the hero is in lava. Returns true if
// the hero changed location while surviving.
export async function lava_effects() {
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    let obj;
    let usurvive, boil_away;
    let protect_oid = 0;
    let burncount = 0, burnmesgcount = 0;
    const dmg = d(6, 6); /* only applicable for water walking */
    let burn_stuff = false; /* goto burn_stuff */

    if (game.iflags?.in_lava_effects) {
        return false;
    }
    feel_newsym(u.ux, u.uy); /* in case Blind, map the lava here */
    await burn_away_slime();
    if (likes_lava(game.youmonst.data))
        return false;

    usurvive = Fire_resistance() || (Wwalking() && dmg < u.uhp);
    /*
     * A timely interrupt might manage to salvage your life
     * but not your gear.  For scrolls and potions this
     * will destroy whole stacks, where fire resistant hero
     * survivor only loses partial stacks via destroy_items().
     *
     * Flag items to be destroyed before any messages so
     * that player causing hangup at --More-- won't get an
     * emergency save file created before item destruction.
     */
    if (!usurvive) {
        for (obj of [...(game.invent || [])]) {
            if (obj.in_use) { /* remove_worn_item() sets in_use */
                /* one item can be protected from burning up [accommodates
                   steal(AMULET_OF_FLYING) -> remove_worn_item() -> fall
                   into lava (which happens before item is transferred
                   from invent to thief->minvent)]; item will still be in
                   inventory when we return to caller or save bones (or
                   perform hangup save if that occurs) */
                if (!protect_oid) {
                    protect_oid = obj.o_id;
                    obj.in_use = 0;
                } else {
                    /* impossible("lava_effects: '%s' (#%u) is already in use; so is #%u.") */
                }
                continue;
            }
            /* set obj->in_use for items which will be destroyed below */
            if ((is_organic(obj) || obj.oclass === OCLASSES.POTION_CLASS)
                && !obj.oerodeproof
                && game.objects[obj.otyp].oc_oprop !== FIRE_RES
                && obj.otyp !== ONAMES.SCR_FIRE && obj.otyp !== ONAMES.SPE_FIREBALL
                && !obj_resists(obj, 0, 0)) /* for invocation items */
                obj.in_use = 1;
        }
    }

    /* Check whether we should burn away boots *first* so we know whether to
     * make the player sink into the lava. Assumption: water walking only
     * comes from boots.
     * (5.0: that assumption is no longer true, but having boots be the first
     * thing to come into contact with lava makes sense.)
     */
    if (u.uarmf && (u.uarmf.in_use
                    || (is_organic(u.uarmf) && !u.uarmf.oerodeproof))) {
        obj = u.uarmf;
        await pline(`${Yobjnam2(obj, 'burst')} into flame!`);
        ++burnmesgcount;
        (game.iflags ||= {}).in_lava_effects = (game.iflags.in_lava_effects | 0) + 1; /* (see above) */
        await Boots_off();
        if (obj.o_id !== protect_oid)
            useup(obj);
        game.iflags.in_lava_effects--;
        ++burncount;
    }

    if (!Fire_resistance()) {
        if (Wwalking()) {
            await pline_The(`${hliquid('lava')} here burns you!`);
            if (usurvive) {
                await losehp(dmg, lava_killer, KILLED_BY); /* lava damage */
                burn_stuff = true;
            }
        } else
            await You(`fall into the ${waterbody_name(u.ux, u.uy)}!`);

        if (!burn_stuff) {
            usurvive = Lifesaved() || !!game.discover;
            if (game.wizard)
                usurvive = true;

            /* prevent remove_worn_item() -> Boots_off(WATER_WALKING_BOOTS) ->
               spoteffects() -> lava_effects() recursion which would
               successfully delete (via useupall) the no-longer-worn boots;
               once recursive call returned, we would try to delete them again
               here in the outer call (and access stale memory, probably panic) */
            (game.iflags ||= {}).in_lava_effects = (game.iflags.in_lava_effects | 0) + 1;

            for (obj of [...(game.invent || [])]) {
                if (obj.o_id === protect_oid) {
                    /* skip protected item; caller expects to retain access */
                    obj.in_use = 1; /* was cleared when setting protect_oid */
                } else if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
                    if (usurvive && !Blind())
                        await pline(`${The(xname(obj))} glows a strange ${hcolor('dark red')}, but remains intact.`);
                } else if (obj.in_use) {
                    if (obj.owornmask) {
                        if (usurvive) {
                            await pline(`${Yobjnam2(obj, 'burst')} into flame!`);
                            ++burnmesgcount;
                        }
                        await remove_worn_item(obj, true);
                    }
                    useupall(obj);
                    ++burncount;
                }
            }
            if (usurvive && burncount > burnmesgcount)
                await pline(`${(burnmesgcount > 0)
                                ? ((burncount - burnmesgcount === 1) ? 'Another' : 'Other')
                                : ((burncount === 1) ? 'An' : 'Some')} item${
                              plur(burncount - burnmesgcount)} in your inventory ${
                              (burncount - burnmesgcount === 1) ? 'has' : 'have'} been destroyed.`);

            /* s/he died... */
            boil_away = (u.umonnum === PMNAMES.PM_WATER_ELEMENTAL
                         || u.umonnum === PMNAMES.PM_STEAM_VORTEX
                         || u.umonnum === PMNAMES.PM_FOG_CLOUD);
            /* burn to death; if hero is life-saved on the first pass, try
               to teleport to safety; if that fails, burn all over again */
            for (burncount = 0; burncount < 2; ++burncount) {
                const shownHp = u.uhp; /* the port's status line is refreshed
                                          only after the --More-- */
                u.uhp = -1;
                /* killer format and name are reconstructed every iteration
                   because lifesaving resets them */
                game.killer = { format: KILLED_BY, name: lava_killer };
                game._deferred_status_hp_until_more = shownHp;
                await urgent_pline(`You ${boil_away ? 'boil away' : 'burn to a crisp'}...`);
                await done(BURNING);
                if (await safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT))
                    break; /* successful life-save */
                /* nowhere safe to land; repeat burning loop */
                await pline("You're still burning.");
            }

            game.iflags.in_lava_effects--;

            if (burncount === 2) {
                /* life-saved twice (second time must have been due to declining
                   to die in wizard|explore mode) and failed to be teleported
                   to safety both times; moveloop() will just drop the hero into
                   the lava again on next move so take countermeasures to give
                   the player--or the debug fuzzer--a chance to try something
                   else instead of just immediately burning up all over again */
                if (!Fire_resistance()) /* set_itimeout(&HFire_resistance, 5L) */
                    intr.HFire_resistance = ((intr.HFire_resistance | 0) & ~TIMEOUT) | 5;
                if (!Wwalking()) /* set_itimeout(&HWwalking, 5L) */
                    intr.HWwalking = ((intr.HWwalking | 0) & ~TIMEOUT) | 5;
                burn_stuff = true;
            } else {
                await rescued_from_terrain(BURNING);

                /* normally done via safe_teleds() -> teleds() -> spoteffects() but
                   spoteffects() was no-op when called with nonzero in_lava_effects */
                await spoteffects(false); /* suppress auto-pickup for this landing... */

                return true;
            }
        }
    } else if (!Wwalking() && (!u.utrap || u.utraptype !== TT_LAVA)) {
        boil_away = !Fire_resistance();
        /* if not fire resistant, sink_into_lava() will quickly be fatal;
           hero needs to escape immediately */
        set_utrap((rn1(4, 4) + ((boil_away ? 2 : rn1(4, 12)) << 8)), TT_LAVA);
        await You(`sink into the ${waterbody_name(u.ux, u.uy)}${
            !boil_away ? ', but it only burns slightly'
                       : ' and are about to be immolated'}!`);
        if (Fire_resistance())
            monstseesu(M_SEEN_FIRE);
        else
            monstunseesu(M_SEEN_FIRE);
        if (u.uhp > 1)
            await losehp(!boil_away ? 1 : Math.trunc(u.uhp / 2), lava_killer,
                         KILLED_BY); /* lava damage */
    }

 /* burn_stuff: */
    await destroy_items(game.youmonst, ATTKS.AD_FIRE, dmg);
    await ignite_items(game.invent);
    return false;
}

// src/trap.c:6991 sink_into_lava(), called once per time-taking action while
// the hero remains trapped in molten lava.
export async function sink_into_lava() {
    const u = game.u;
    if (!u.utrap || u.utraptype !== TT_LAVA)
        return;
    if (!is_lava(u.ux, u.uy)) {
        u.utrap = 0;
        u.utraptype = 0;
        return;
    }
    if (u.uinvulnerable)
        return;

    if (!Fire_resistance())
        u.uhp = Math.trunc((u.uhp + 2) / 3);

    u.utrap -= 1 << 8;
    if (u.utrap < (1 << 8)) {
        game.killer = { format: KILLED_BY, name: 'molten lava' };
        await urgent_pline('You sink below the surface and die.');
        await done(DISSOLVED);
        u.utrap = 0;
        u.utraptype = 0;
        if (!Levitation() && !Flying())
            await safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT);
    } else if (!u.umoved) {
        await Norep('You sink deeper into the lava.');
        u.utrap += rnd(4);
    }
}

// src/trap.c:1602 trapeffect_rust_trap() — a gush of water; one rn2(5)
// picks the target slot, then water_damage on whatever is there.
async function trapeffect_rust_trap(mtmp, trap, trflags) {
    const A_gush = 'A gush of water hits';

    if (mtmp === game.youmonst) {
        seetrap(trap);

        switch (rn2(5)) {
        case 0:
            await pline(`${A_gush} you on the ${body_part(HEAD)}!`);
            await water_damage(game.u.uarmh,
                               helm_simple_name(game.u.uarmh), true);
            break;
        case 1: {
            await pline(`${A_gush} your left ${body_part(ARM)}!`);
            if (await water_damage(game.u.uarms, 'shield', true)
                !== ER_NOTHING)
                break;
            if (game.u.twoweap
                || (game.u.uwep && bimanual_tr(game.u.uwep)))
                await water_damage(game.u.twoweap ? game.u.uswapwep
                                                  : game.u.uwep, null, true);
            await water_damage(game.u.uarmg,
                               gloves_simple_name(game.u.uarmg), true);
            break;
        }
        case 2:
            await pline(`${A_gush} your right ${body_part(ARM)}!`);
            await water_damage(game.u.uwep, null, true);
            await water_damage(game.u.uarmg,
                               gloves_simple_name(game.u.uarmg), true);
            break;
        default:
            await pline(`${A_gush} you!`);
            for (const otmp of [...game.invent]) {
                if (otmp.lamplit && otmp !== game.u.uwep
                    && (otmp !== game.u.uswapwep || !game.u.twoweap))
                    splash_lit(otmp);
            }
            if (game.u.uarmc)
                await water_damage(game.u.uarmc,
                                   cloak_simple_name(game.u.uarmc), true);
            else if (game.u.uarm)
                await water_damage(game.u.uarm,
                                   suit_simple_name(game.u.uarm), true);
            else if (game.u.uarmu)
                await water_damage(game.u.uarmu, 'shirt', true);
        }
        update_inventory();

        if (game.u.umonnum === PMNAMES.PM_IRON_GOLEM) {
            const dam = game.u.mhmax;

            await You('are covered with rust!');
            await losehp(Maybe_Half_Phys(dam), 'rusting away', KILLED_BY);
        } else if (game.u.umonnum === PMNAMES.PM_GREMLIN && rn2(3)) {
            await split_mon(game.youmonst, null);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        let trapkilled = false;
        const mptr = game.mons[mtmp.mnum];

        if (in_sight)
            seetrap(trap);
        switch (rn2(5)) {
        case 0:
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)} on the ${
                    mbodypart(mtmp, HEAD)}!`);
            await water_damage(which_armor(mtmp, W_ARMH), 'helmet', true);
            break;
        case 1: {
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)}'s left ${
                    mbodypart(mtmp, ARM)}!`);
            const shield = which_armor(mtmp, W_ARMS);
            if (await water_damage(shield, 'shield', true) !== ER_NOTHING)
                break;
            const wep = MON_WEP(mtmp);
            if (wep && bimanual_tr(wep))
                await water_damage(wep, null, true);
            await water_damage(which_armor(mtmp, W_ARMG), 'gloves', true);
            break;
        }
        case 2:
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)}'s right ${
                    mbodypart(mtmp, ARM)}!`);
            await water_damage(MON_WEP(mtmp), null, true);
            await water_damage(which_armor(mtmp, W_ARMG), 'gloves', true);
            break;
        default:
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)}!`);
            for (const otmp of (mtmp.minvent || []))
                if (otmp.lamplit && (otmp.owornmask & (W_WEP | W_SWAPWEP)) === 0)
                    splash_lit(otmp);
            {
                let target;
                if ((target = which_armor(mtmp, W_ARMC)) != null)
                    await water_damage(target, cloak_simple_name(target), true);
                else if ((target = which_armor(mtmp, W_ARM)) != null)
                    await water_damage(target, suit_simple_name(target), true);
                else if ((target = which_armor(mtmp, W_ARMU)) != null)
                    await water_damage(target, 'shirt', true);
            }
        }

        if (completelyrusts_tr(mptr)) {
            if (in_sight)
                await pline(`${Monnam(mtmp)} falls to pieces!`);
            monkilled(mtmp, null, ATTKS.AD_RUST);
            if (DEADMONSTER(mtmp))
                trapkilled = true;
        } else if (mptr.pmidx === PMNAMES.PM_GREMLIN && rn2(3)) {
            await split_mon(mtmp, null);
        }

        return trapkilled ? Trap_Killed_Mon
               : mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
    return Trap_Effect_Finished;
}

/* include/monst.h completelyrusts() — iron golems */
function completelyrusts_tr(mptr) {
    return mptr.pmidx === PMNAMES.PM_IRON_GOLEM;
}

/* include/obj.h bimanual() — two-handed weapon or polearm */
function bimanual_tr(obj) {
    return !!game.objects[obj.otyp]?.oc_bimanual;
}

// src/trap.c:602 fall_through(); the hero falls through a trap door or
// hole.  Ends with schedule_goto, so the level change happens at the
// moveloop seam exactly as C defers it.
export async function fall_through(td, ftflags) { /* td == TRUE : trap door or hole */
    const u = game.u;
    let dtmp = { dnum: 0, dlevel: 0 };
    let msgbuf = null;
    let dont_fall = null;
    let newlevel;
    let t = null;
    let controlled_flight = false;

    /* we'll fall even while levitating in Sokoban; otherwise, if we
       won't fall and won't be told that we aren't falling, give up now */
    if (Blind() && Levitation() && !Sokoban())
        return;

    newlevel = dunlev(u.uz); /* current level */
    newlevel++;

    if (td) {
        t = t_at_mon(u.ux, u.uy);
        feeltrap(t);
        if (!Sokoban() && !(ftflags & TOOKPLUNGE)) {
            if (t.ttyp === TRAPDOOR)
                await pline('A trap door opens up under you!');
            else
                await pline("There's a gaping hole under you!");
        }
    } else
        await pline_The(`${surface(u.ux, u.uy)} opens up under you!`);

    if (Sokoban() && Can_fall_thru(u.uz)) {
        ; /* KMH -- You can't escape the Sokoban level traps */
    } else if (Levitation() || u.ustuck
               || (!Can_fall_thru(u.uz) && !game.level.at(u.ux, u.uy).candig)
               || ((Flying() || is_clinger(game.youmonst.data)
                    || (ceiling_hider(game.youmonst.data) && u.uundetected))
                   && !(ftflags & TOOKPLUNGE))) {
        dont_fall = "don't fall in.";
    } else if (game.youmonst.data.msize >= MFLAGS.MZ_HUGE) {
        dont_fall = "don't fit through.";
    } else if (!(await next_to_u())) {
        dont_fall = 'are jerked back by your pet!';
    }
    if (dont_fall) {
        await You(dont_fall);
        /* hero didn't fall through, but any objects here might */
        await impact_drop(null, u.ux, u.uy, 0);
        if (!td) {
            await display_nhwindow_message(); /* display_nhwindow(WIN_MESSAGE, FALSE) */
            await pline_The('opening under you closes up.');
        }
        return;
    }
    if ((Flying() || is_clinger(game.youmonst.data))
        && (ftflags & TOOKPLUNGE) && td && t) {
        if (Flying())
            controlled_flight = true;
        await You(`${Flying() ? 'swoop' : 'deliberately drop'} down ${
            (t.ttyp === TRAPDOOR) ? 'through the trap door' : 'into the gaping hole'}!`);
    }

    if (u.ushops)
        await shopdig(1);
    if (Is_stronghold(u.uz)) {
        find_hell(dtmp);
    } else {
        let dist;

        if (t) {
            dtmp = { dnum: t.dst.dnum, dlevel: t.dst.dlevel }; /* assign_level */
            /* don't fall beyond the bottom, in case this came from a bones
               file with different dungeon size  */
            clamp_hole_destination(dtmp);
        } else {
            dtmp.dnum = u.uz.dnum;
            dtmp.dlevel = newlevel;
        }
        dist = depth(dtmp) - depth(u.uz);
        if (dist > 1)
            await You(`${controlled_flight ? 'fly' : 'fall'} down a ${
                dist > 3 ? 'very ' : ''}${dist > 2 ? 'deep ' : ''}shaft!`);
    }
    if (!td)
        msgbuf = `The hole in the ${ceiling(u.ux, u.uy)} above you closes up.`;

    schedule_goto(dtmp, !Flying() ? UTOTYPE_FALLING : UTOTYPE_NONE, null,
                  !td ? msgbuf : null);
}

// src/dog.c:887 migrate_to_level(), reduced to the shared bookkeeping used
// by trap-driven migration. Destination coordinates live in mux/muy while
// off-level, and mtrack carries the arrival mode, origin, and prior level.
export function migrate_monster(mtmp, dest, xyloc, cc = null) {
    const mx = mtmp.mx, my = mtmp.my;
    remove_monster(mx, my);
    const at = (game.level.monsters || []).indexOf(mtmp);
    if (at >= 0)
        game.level.monsters.splice(at, 1);
    newsym(mx, my);

    mtmp.mstate = (mtmp.mstate || 0) | MON_MIGRATING;
    mtmp.mtrack ||= [];
    mtmp.mtrack[2] = { x: game.u.uz.dnum, y: game.u.uz.dlevel };
    mtmp.mtrack[1] = cc ? { x: cc.x, y: cc.y } : { x: mx, y: my };
    mtmp.mtrack[0] = {
        x: xyloc,
        y: depth(dest) < depth(game.u.uz) ? 1 : 0,
    };
    mtmp.mux = dest.dnum;
    mtmp.muy = dest.dlevel;
    mtmp.mx = mtmp.my = 0;
    mtmp.mlstmv = game.moves;
    (game.migrating_mons ||= []).unshift(mtmp);
}

// src/trap.c:2013 trapeffect_hole().
async function trapeffect_hole(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        await fall_through(true, trflags & TOOKPLUNGE);
        return Trap_Effect_Finished;
    }

    if (!Can_fall_thru(game.u.uz) || mtmp === game.u.ustuck)
        return Trap_Effect_Finished;

    const in_sight = canseemon(mtmp) || mtmp === game.u.usteed;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const inescapable = forcetrap || (Sokoban() && !trap.madeby_u);
    const too_large = mtmp.data.msize >= MFLAGS.MZ_HUGE;
    const long_worm = !!(mtmp.wormno && count_wsegs(mtmp) > 5);

    if (!grounded(mtmp.data) || long_worm || too_large) {
        if (forcetrap && !Sokoban()) {
            if (in_sight) {
                seetrap(trap);
                if (trap.ttyp === TRAPDOOR)
                    await pline(`A trap door opens, but ${mon_nam(mtmp)} doesn't fall through.`);
                else
                    await pline(`${Monnam(mtmp)} doesn't fall through the hole.`);
            }
            return Trap_Effect_Finished;
        }
        if (!inescapable)
            return Trap_Effect_Finished;
        if (in_sight) {
            await pline(`${Monnam(mtmp)} seems to be yanked down!`);
            seetrap(trap);
        }
    }

    if (in_sight) {
        await pline(`Suddenly, ${mon_nam(mtmp)} ${
            trap.ttyp === HOLE ? 'falls into a hole'
                               : 'falls through a trap door'}.`);
        seetrap(trap);
    }

    const dest = (trap.dst?.dnum ?? -1) >= 0
        ? { dnum: trap.dst.dnum, dlevel: trap.dst.dlevel }
        : { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel + 1 };
    migrate_monster(mtmp, dest, MIGR_RANDOM);
    return Trap_Moved_Mon;
}

// src/trap.c:4024 float_down() — return the hero to the surface when
// levitation ends (or, with emask W_SADDLE, when dismounting). The
// levitation-specific arms (BLevitation, BFlying, Punished ball-drag,
// drown/lava) belong to state the port does not carry yet and record
// themselves; the dismount path used today runs the trap check and the
// pickup(1) tail for real.
/* include/youprop.h:242 Lev_at_will — levitation the hero can end on demand:
   only the I_SPECIAL (potion/spell) or artifact source, and nothing else */
const Lev_at_will = () => {
    const h = game.u.intrinsic?.HLevitation | 0,
          e = game.u.uprops?.LEVITATION | 0;
    return ((h & I_SPECIAL) !== 0 || (e & W_ARTI) !== 0)
           && (h & ~(I_SPECIAL | TIMEOUT)) === 0
           && (e & ~W_ARTI) === 0;
};

// src/trap.c:3937 float_up() — the hero starts to levitate.
export async function float_up() {
    const u = game.u;
    (game.disp ||= {}).botl = true;
    if (u.utrap) {
        if (u.utraptype === TT_PIT) {
            await reset_utrap(false);
            await You(`float up, out of the ${trapname(PIT, false)}!`);
            game.vision_full_recalc = 1; /* vision limits change */
            await fill_pit(u.ux, u.uy);
        } else if (u.utraptype === TT_LAVA /* molten lava */
                   || u.utraptype === TT_INFLOOR) { /* solidified lava */
            await Your(`body pulls upward, but your ${
                makeplural(body_part(LEG))} are still stuck.`);
        } else if (u.utraptype === TT_BURIEDBALL) { /* tethered */
            const cc = { x: u.ux, y: u.uy };

            /* caveat: this finds the first buried iron ball within
               one step of the specified location, not necessarily the
               buried [former] uball at the original anchor point */
            buried_ball(cc);
            /* being chained to the floor blocks levitation from floating
               above that floor but not from enhancing carrying capacity */
            await You(`feel lighter, but your ${body_part(LEG)} is still chained to the ${
                IS_ROOM(game.level.at(cc.x, cc.y).typ) ? 'floor' : 'ground'}.`);
        } else if (u.utraptype === TT_WEB) {
            await You(`float up slightly, but you are still stuck in the ${
                trapname(WEB, false)}.`);
        } else { /* bear trap */
            await You(`float up slightly, but your ${body_part(LEG)} is still stuck.`);
        }
    } else if (u.uinwater) {
        await spoteffects(true);
    } else if (u.uswallow) {
        if (is_animal(u.ustuck.data ?? game.mons[u.ustuck.mnum]))
            await You(`float away from the ${surface(u.ux, u.uy)}.`);
        else
            await You(`spiral up into ${mon_nam(u.ustuck)}.`);
    } else if (Hallucination()) {
        await pline("Up, up, and awaaaay!  You're walking on air!");
    } else if (Is_airlevel(u.uz)) {
        await You('gain control over your movements.');
    } else {
        await You('start to float in the air!');
    }
    if (u.usteed) {
        const sdata = u.usteed.data ?? game.mons[u.usteed.mnum];
        if (!is_floater(sdata) && !is_flyer(sdata)) {
            if (Lev_at_will()) {
                await pline(`${Monnam(u.usteed)} magically floats up!`);
            } else {
                await You(`cannot stay on ${mon_nam(u.usteed)}.`);
                await dismount_steed(DISMOUNT_GENERIC);
            }
        }
    }
    if (Flying())
        await You('are no longer able to control your flight.');
    float_vs_flight(); /* set BFlying, also BLevitation if still trapped */
    /* levitation gives maximum carrying capacity, so encumbrance
       state might be reduced */
    await encumber_msg();
}

// src/trap.c:4010 fill_pit() — a boulder sitting on a pit or hole fills it.
export async function fill_pit(x, y) {
    let t, otmp;
    if ((t = t_at_mon(x, y)) != null && (is_pit(t.ttyp) || is_hole(t.ttyp))
        && (otmp = sobj_at(ONAMES.BOULDER, x, y)) != null) {
        obj_extract_self(otmp);
        await flooreffects(otmp, x, y, 'settle');
    }
}

// src/trap.c:4040 float_down()
export async function float_down(hmask, emask) { /* might cancel timeout */
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    let trap = null;
    let current_dungeon_level;
    let no_msg = false;

    intr.HLevitation = (intr.HLevitation | 0) & ~hmask;
    if (u.uprops?.LEVITATION) { /* ELevitation &= ~emask */
        const next = u.uprops.LEVITATION & ~emask;
        if (next)
            u.uprops.LEVITATION = next;
        else
            delete u.uprops.LEVITATION;
    }
    if (Levitation())
        return 0; /* maybe another ring/potion/boots */
    if (u.blocked?.LEVITATION) {
        /* if blocked by terrain, we haven't actually been levitating so
           we don't give any end-of-levitation feedback or side-effects,
           but if blocking is solely due to being trapped in/on floor,
           do give some feedback but skip other float_down() effects */
        const trapped = (u.blocked.LEVITATION === I_SPECIAL);

        float_vs_flight();
        if (trapped && u.utrap) /* u.utrap => paranoia */
            await You(`are no longer trying to float up from the ${
                (u.utraptype === TT_BEARTRAP) ? "trap's jaws"
                  : (u.utraptype === TT_WEB) ? 'web'
                      : (u.utraptype === TT_BURIEDBALL) ? 'chain'
                          : (u.utraptype === TT_LAVA) ? 'lava'
                              : 'ground'}.`); /* TT_INFLOOR */
        await encumber_msg(); /* carrying capacity might have changed */
        return 0;
    }
    (game.disp ||= {}).botl = true;
    nomul(0); /* stop running or resting */
    if (u.blocked?.FLYING) {
        /* controlled flight no longer overridden by levitation */
        float_vs_flight(); /* clears BFlying & I_SPECIAL
                            * unless hero is stuck in floor */
        if (Flying()) {
            await You('have stopped levitating and are now flying.');
            await encumber_msg(); /* carrying capacity might have changed */
            return 1;
        }
    }
    if (u.uswallow) {
        await You(`float down, but you are still ${
            digests(u.ustuck.data) ? 'swallowed' : 'engulfed'}.`);
        await encumber_msg();
        return 1;
    }

    if (Punished() && !carried(u.uball) && !m_at(u.uball.ox, u.uball.oy)
        && (is_pool(u.uball.ox, u.uball.oy)
            || ((trap = t_at_mon(u.uball.ox, u.uball.oy))
                && (is_pit(trap.ttyp) || is_hole(trap.ttyp))))) {
        u.ux0 = u.ux;
        u.uy0 = u.uy;
        u.ux = u.uball.ox;
        u.uy = u.uball.oy;
        movobj(u.uchain, u.uball.ox, u.uball.oy);
        newsym(u.ux0, u.uy0);
        game.vision_full_recalc = 1; /* in case the hero moved. */
    }
    /* check for falling into pool - added by GAN 10/20/86 */
    if (!Flying()) {
        if (!u.uswallow && u.ustuck) {
            if (sticks(game.youmonst.data))
                await You(`aren't able to maintain your hold on ${mon_nam(u.ustuck)}.`);
            else
                await pline(`Startled, ${mon_nam(u.ustuck)} can no longer hold you!`);
            set_ustuck(null);
        }
        /* kludge alert:
         * drown() and lava_effects() print various messages almost
         * every time they're called which conflict with the "fall
         * into" message below.  Thus, we want to avoid printing
         * confusing, duplicate or out-of-order messages.
         * Use knowledge of the two routines as a hack -- this
         * should really be handled differently -dlc
         */
        if (is_pool(u.ux, u.uy) && !Wwalking() && !Swimming() && !u.uinwater)
            no_msg = await drown();

        if (is_lava(u.ux, u.uy) && !game.iflags?.in_lava_effects) {
            await lava_effects();
            no_msg = true;
        }
    }
    if (!trap) {
        trap = t_at_mon(u.ux, u.uy);
        if (Is_airlevel(u.uz)) {
            await You('begin to tumble in place.');
        } else if (Is_waterlevel(u.uz) && !no_msg) {
            await You_feel('heavier.');
        /* u.uinwater msgs already in spoteffects()/drown() */
        } else if (!u.uinwater && !no_msg) {
            if (!(emask & W_SADDLE)) {
                if (Sokoban() && trap) {
                    /* Justification elsewhere for Sokoban traps is based
                     * on air currents.  This is consistent with that.
                     * The unexpected additional force of the air currents
                     * once levitation ceases knocks you off your feet.
                     */
                    if (Hallucination())
                        await pline("Bummer!  You've crashed.");
                    else
                        await You('fall over.');
                    await losehp(rnd(2), 'dangerous winds', KILLED_BY);
                    if (u.usteed)
                        await dismount_steed(DISMOUNT_FELL);
                    await selftouch('As you fall, you');
                } else if (u.usteed && (is_floater(u.usteed.data)
                                        || is_flyer(u.usteed.data))) {
                    await You('settle more firmly in the saddle.');
                } else if (Hallucination()) {
                    await pline(`Bummer!  You've ${
                        is_pool(u.ux, u.uy) ? 'splashed down' : 'hit the ground'}.`);
                } else {
                    await You(`float gently to the ${surface(u.ux, u.uy)}.`);
                }
            }
        }
    }

    /* levitation gives maximum carrying capacity, so having it end
       potentially triggers greater encumbrance; do this after
       'come down' messages, before trap activation or autopickup */
    await encumber_msg();

    /* can't rely on u.uz0 for detecting trap door-induced level change;
       it gets changed to reflect the new level before we can check it */
    current_dungeon_level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
    if (trap) {
        switch (trap.ttyp) {
        case STATUE_TRAP:
            break;
        case HOLE:
        case TRAPDOOR:
            if (!Can_fall_thru(u.uz) || u.ustuck)
                break;
            /*FALLTHRU*/
        default:
            if (!u.utrap) /* not already in the trap */
                await dotrap(trap, NO_TRAP_FLAGS);
        }
    }
    if (!Is_airlevel(u.uz) && !Is_waterlevel(u.uz) && !u.uswallow
        /* falling through trap door calls goto_level,
           and goto_level does its own pickup() call */
        && on_level(u.uz, current_dungeon_level))
        await pickup(1);
    return 1;
}


// src/trap.c:4183 climb_pit()
export async function climb_pit() {
    const u = game.u;
    let pitname;

    if (!u.utrap || u.utraptype !== TT_PIT)
        return;

    pitname = trapname(PIT, false);
    if (Passes_walls()) {
        /* marked as trapped so they can pick things up */
        await You(`ascend from the ${pitname}.`);
        await reset_utrap(false);
        await fill_pit(u.ux, u.uy);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (!rn2(2) && sobj_at(ONAMES.BOULDER, u.ux, u.uy)) {
        await Your(`${body_part(LEG)} gets stuck in a crevice.`);
        await display_nhwindow_message(); /* display_nhwindow(WIN_MESSAGE, FALSE) */
        tty_clear_nhwindow_message(game._topl_cury || 0); /* clear_nhwindow(WIN_MESSAGE) */
        await You(`free your ${body_part(LEG)}.`);
    } else if ((Flying() || is_clinger(game.youmonst.data)) && !Sokoban()) {
        /* eg fell in pit, then poly'd to a flying monster;
           or used '>' to deliberately enter it */
        await You(`${u_locomotion('climb')} from the ${pitname}.`);
        await reset_utrap(false);
        await fill_pit(u.ux, u.uy);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (!(--u.utrap) || m_easy_escape_pit(game.youmonst)) {
        await reset_utrap(false);
        await You(`${(Sokoban() && Levitation())
                      ? 'struggle against the air currents and float'
                      : u.usteed ? 'ride' : 'crawl'} to the edge of the ${pitname}.`);
        await fill_pit(u.ux, u.uy);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (u.dz || game.flags?.verbose !== false) {
        /* these should use 'pitname' rather than "pit" for hallucination
           but that would nullify Norep (this message can be repeated
           many times without further user intervention by using a run
           attempt to keep retrying to escape from the pit) */
        if (u.usteed)
            await Norep(`${YMonnam(u.usteed)} is still in a pit.`);
        else
            await Norep((Hallucination() && !rn2(5))
                        ? "You've fallen, and you can't get up."
                        : 'You are still in a pit.');
    }
}

/* ==== the rolling-boulder launch machinery (maketrap's last gap) ==== */

import { xdir, ydir, ZAP_POS, is_xport, N_DIRS, ROLL, LAUNCH_UNSEEN,
         LAUNCH_KNOWN, IS_STWALL, IS_TREE, IRONBARS, D_BROKEN } from './const.js';
import { closed_door } from './cmd.js';
import { is_pool_or_lava } from './dbridge.js';
import { stackobj } from './invent.js';
import { isok } from './hacklib.js';

// src/trap.c:3695 isclearpath() — may a boulder roll `distance` squares
// from cc along (dx,dy)? Walks the squares; on success cc is advanced to
// the far end. No draws.
function isclearpath(cc, distance, dx, dy) {
    let x = cc.x, y = cc.y;

    while (distance-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y))
            return false;
        const typ = game.level.at(x, y).typ;
        if (!ZAP_POS(typ) || closed_door(x, y))
            return false;
        const t = t_at_mon(x, y);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp)))
            return false;
    }
    cc.x = x;
    cc.y = y;
    return true;
}

// src/trap.c:3599 find_random_launch_coord() — pick where the boulder
// waits. Exactly two draws when reached: rn1(5,4) for the distance and
// rn2(8) for the first direction tried; the retry loop itself spends
// nothing. A rolling-boulder trap needs the path clear BOTH ways.
function find_random_launch_coord(ttmp, cc) {
    let success = false;
    const bcc = { x: 0, y: 0 };
    let mindist = 4;
    let trycount = 0;

    if (!ttmp || !cc || Sokoban())
        return false;

    const x = ttmp.tx;
    const y = ttmp.ty;

    bcc.x = ttmp.tx + (game.launchplace?.x | 0);
    bcc.y = ttmp.ty + (game.launchplace?.y | 0);
    if (isok(bcc.x, bcc.y) && linedup(ttmp.tx, ttmp.ty, bcc.x, bcc.y, 1)) {
        cc.x = bcc.x;
        cc.y = bcc.y;
        return true;
    }

    if (ttmp.ttyp === ROLLING_BOULDER_TRAP)
        mindist = 2;
    let distance = rn1(5, 4); /* 4..8 away */
    let tmp = rn2(8);         /* randomly pick a direction to try first */
    while (distance >= mindist) {
        const dx = xdir[tmp];
        const dy = ydir[tmp];
        cc.x = x;
        cc.y = y;
        /* Prevent boulder from being placed on water */
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP
            && is_pool_or_lava(x + distance * dx, y + distance * dy))
            success = false;
        else
            success = isclearpath(cc, distance, dx, dy);
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
            bcc.x = x;
            bcc.y = y;
            const success_otherway = isclearpath(bcc, distance, -dx, -dy);
            if (!success_otherway)
                success = false;
        }
        if (success)
            break;
        if (++tmp > 7)
            tmp = 0;
        if ((++trycount % 8) === 0)
            --distance;
    }
    return success;
}

// src/trap.c:3659 mkroll_launch() — set the trap's launch point(s) and, if
// a spot was found, create the waiting boulder there (mksobj draws). On
// failure the launch point IS the trap square, which is also what tells
// mktrap's victim roll to skip this trap.
export function mkroll_launch(ttmp, x, y, otyp, ocount) {
    const cc = { x: 0, y: 0 };

    const success = find_random_launch_coord(ttmp, cc);

    if (!success) {
        /* create the trap without any ammo, launch pt at trap location */
        cc.x = x;
        cc.y = y;
    } else {
        const otmp = mksobj(otyp, true, false);
        otmp.quan = ocount;
        otmp.owt = weight(otmp);
        place_object(otmp, cc.x, cc.y);
        stackobj(otmp);
    }
    ttmp.launch = { x: cc.x, y: cc.y };
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
        ttmp.launch2 = { x: x - (cc.x - x), y: y - (cc.y - y) };
    } else {
        ttmp.launch_otyp = otyp;
    }
    newsym(ttmp.launch.x, ttmp.launch.y);
    return 1;
}

// src/trap.c:3282 launch_obj() moves a trap-launched object along its fixed
// path. Rolling boulders keep moving after a monster hit unless consumed.
export async function launch_obj(otyp, x1, y1, x2, y2, style) {
    let otmp = sobj_at(otyp, x1, y1);
    let otherside = false;

    if (!otmp && otyp === ONAMES.BOULDER) {
        otherside = true;
        otmp = sobj_at(otyp, x2, y2);
    }
    if (!otmp)
        return 0;
    if (otherside) {
        [x1, x2] = [x2, x1];
        [y1, y2] = [y2, y1];
    }

    let singleobj;
    if (otmp.quan === 1) {
        obj_extract_self(otmp);
        singleobj = otmp;
    } else {
        singleobj = splitobj(otmp, 1);
        obj_extract_self(singleobj);
    }
    newsym(x1, y1);
    /* src/trap.c:3321 tmp_at(DISP_FLASH, obj_to_glyph(...)); tmp_at(x,y).
       The temporary boulder is visible while a later hit message pauses on
       --More--, even though it has already been unlinked from the floor.
       Removing a boulder schedules a vision update, so settle that first or
       pline() would repaint the floor over this temporary glyph. */
    if (game.vision_full_recalc)
        vision_recalc(0);
    const launchedGlyph = temporary_object_glyph(singleobj);
    display_object_at(singleobj, x1, y1, launchedGlyph);

    let dist = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    let x = x1, y = y1;
    let tmpx = x1, tmpy = y1;
    let finalx = x2, finaly = y2;
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    const rolling = (style & ROLL) !== 0;
    let used_up = false;
    game.bhitpos = { x, y };

    if ((style & LAUNCH_KNOWN) !== 0)
        singleobj.otrapped = 1;
    /* LAUNCH_UNSEEN only changes sound and animation, neither draws from the
       core RNG. Keep the flag consumed so the remaining style is ROLL. */
    style &= ~(LAUNCH_UNSEEN | LAUNCH_KNOWN);

    while (dist-- > 0 && !used_up) {
        /* C advances tmp_at at the start of each animation iteration. If a
           collision message pauses, the glyph remains one square behind the
           object being tested for impact. */
        if (x !== tmpx || y !== tmpy) {
            newsym(tmpx, tmpy);
            display_object_at(singleobj, x, y, launchedGlyph);
            tmpx = x;
            tmpy = y;
        }
        if (!isok(game.bhitpos.x + dx, game.bhitpos.y + dy)) {
            finalx = x;
            finaly = y;
            break;
        }
        x = game.bhitpos.x += dx;
        y = game.bhitpos.y += dy;

        const mtmp = m_at(x, y);
        if (mtmp) {
            if (otyp === ONAMES.BOULDER && throws_rocks(mtmp.data)
                && rn2(3)) {
                if (cansee(x, y))
                    await pline(`${Monnam(mtmp)} snatches the boulder.`);
                singleobj.otrapped = 0;
                const { mpickobj } = await import('./steal.js');
                mpickobj(mtmp, singleobj);
                used_up = true;
                break;
            }
            const { ohitmon } = await import('./mthrowu.js');
            if (await ohitmon(mtmp, singleobj, rolling ? -1 : dist, false)) {
                used_up = true;
                break;
            }
        } else if (game.u.ux === x && game.u.uy === y) {
            const dam = dmgval(singleobj, game.youmonst);
            if (game.multi)
                nomul(0);
            await thitu(9 + (singleobj.spe || 0), dam,
                        { obj: singleobj }, null);
        }

        if (rolling) {
            const floorfx = await import('./do.js');
            if (await floorfx.flooreffects(singleobj, x, y, 'fall')) {
                used_up = true;
                break;
            }

            const otmp2 = otyp === ONAMES.BOULDER
                ? sobj_at(ONAMES.BOULDER, x, y) : null;
            if (otmp2) {
                await You_hear(`a loud crash${cansee(x, y)
                    ? ' as one boulder sets another in motion' : ''}!`);
                obj_extract_self(otmp2);
                otmp2.otrapped = singleobj.otrapped;
                singleobj.otrapped = 0;
                place_object(singleobj, x, y);
                singleobj = otmp2;
                await wake_nearto(x, y, 100);
            }
        }

        if (otyp === ONAMES.BOULDER && closed_door(x, y)) {
            if (cansee(x, y))
                await pline('The boulder crashes through a door.');
            game.level.at(x, y).doormask = D_BROKEN;
            if (dist)
                recalc_block_point(x, y);
        }

        if (dist > 0 && isok(x + dx, y + dy)) {
            const nexttyp = game.level.at(x + dx, y + dy).typ;
            if (nexttyp === IRONBARS) {
                finalx = x, finaly = y; /* object stops here */
                const box = { obj: singleobj };
                if (await hits_bars(box, finalx, finaly, x + dx, y + dy, !rn2(20) ? 1 : 0, 0)) {
                    singleobj = box.obj;
                    if (!singleobj) {
                        used_up = true;
                        launch_drop_spot(null, 0, 0);
                    }
                    break;
                }
            }
            if (IS_STWALL(nexttyp) || IS_TREE(nexttyp)) {
                finalx = x;
                finaly = y;
                if (!Deaf())
                    await pline('Thump!');
                await wake_nearto(x, y, 16);
                break;
            }
        }
    }

    /* End the tmp_at display; the final placement is redrawn below. */
    newsym(tmpx, tmpy);
    if (!used_up) {
        singleobj.otrapped = 0;
        place_object(singleobj, finalx, finaly);
        newsym(finalx, finaly);
        return 1;
    }
    return 2;
}

// src/trap.c trapeffect_rolling_boulder_trap().
async function trapeffect_rolling_boulder_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const style = ROLL | (trap.tseen ? LAUNCH_KNOWN : 0);
        feeltrap(trap);
        await pline(`${Deaf() ? '' : 'Click!  '}`
                    + 'You trigger a rolling boulder trap!');
        if (!await launch_obj(ONAMES.BOULDER,
                              trap.launch.x, trap.launch.y,
                              trap.launch2.x, trap.launch2.y, style)) {
            await pline((style & LAUNCH_KNOWN)
                ? 'No boulder was released.'
                : 'Fortunately for you, no boulder was released.');
        }
        return Trap_Effect_Finished;
    }
    if (check_in_air(mtmp, trflags))
        return Trap_Effect_Finished;

    const in_sight = mtmp === game.u.usteed
        || (cansee(mtmp.mx, mtmp.my) && canspotmon(mtmp));
    newsym(mtmp.mx, mtmp.my);
    if (in_sight) {
        await pline(`${Deaf() ? '' : 'Click!  '}${Monnam(mtmp)} triggers `
                    + `${trap.tseen ? 'a rolling boulder trap' : 'something'}.`);
    }
    if (await launch_obj(ONAMES.BOULDER,
                         trap.launch.x, trap.launch.y,
                         trap.launch2.x, trap.launch2.y,
                         ROLL | (in_sight ? 0 : LAUNCH_UNSEEN))) {
        if (in_sight)
            trap.tseen = true;
        if (DEADMONSTER(mtmp))
            return Trap_Killed_Mon;
    }
    return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

// src/trap.c:7039 sokoban_guilt() — cheating in Sokoban costs Luck.
export function sokoban_guilt() {
    if (In_sokoban(game.u.uz)) {
        (game.u.uconduct ||= {}).sokocheat = (game.u.uconduct.sokocheat || 0) + 1;
        change_luck(-1);
    }
}

// src/trap.c:593 clamp_hole_destination(), a hole can't drop past the
// bottom of its dungeon.
export function clamp_hole_destination(dlev) {
    const bottom = dng_bottom(dlev);

    dlev.dlevel = Math.min(dlev.dlevel, bottom);
    return dlev;
}

// src/trap.c:3883 selftouch(), losing the gloves while wielding a
// cockatrice corpse.
export async function selftouch(arg) {
    let kbuf;
    let corpse_pmname;

    if (game.u.uwep && game.u.uwep.otyp === ONAMES.CORPSE
        && touch_petrifies(game.mons[game.u.uwep.corpsenm])
        && !Stone_resistance()) {
        corpse_pmname = obj_pmname(game.u.uwep);
        await pline(`${arg} touch the ${corpse_pmname} corpse.`);
        kbuf = `${an(corpse_pmname)} corpse`;
        await instapetrify(kbuf);
        /* life-saved; unwield the corpse if we can't handle it */
        if (!game.u.uarmg && !Stone_resistance())
            await uwepgone();
    }
    /* Or your secondary weapon, if wielded [hero has lost hold of it
       during a life-saved-from-instapetrify(), so no need to
       allow two-weapon combat when either weapon is a corpse] */
    if (game.u.twoweap && game.u.uswapwep
        && game.u.uswapwep.otyp === ONAMES.CORPSE
        && touch_petrifies(game.mons[game.u.uswapwep.corpsenm])
        && !Stone_resistance()) {
        corpse_pmname = obj_pmname(game.u.uswapwep);
        await pline(`${arg} touch the ${corpse_pmname} corpse.`);
        kbuf = `${an(corpse_pmname)} corpse`;
        await instapetrify(kbuf);
        /* life-saved; unwield the corpse */
        if (!game.u.uarmg && !Stone_resistance())
            await uswapwepgone();
    }
}

// src/trap.c:6252 openfallingtrap(), a trap door (or, when not
// trapdoor_only, any hole or pit) at mon's spot is sprung; returns true
// when mon gets caught in it.
export async function openfallingtrap(mon, trapdoor_only, noticed) {
    let t;
    let ishero = (mon === game.youmonst), result;

    if (!mon)
        return false;
    if (mon === game.u.usteed)
        ishero = true;
    t = t_at(ishero ? game.u.ux : mon.mx, ishero ? game.u.uy : mon.my);
    /* if no trap here or it's not a falling trap, we're done
       (note: falling rock traps have a trapdoor in the ceiling) */
    if (!t || ((t.ttyp !== TRAPDOOR && t.ttyp !== ROCKTRAP)
               && (trapdoor_only || (t.ttyp !== HOLE && !is_pit(t.ttyp)))))
        return false;

    if (ishero) {
        if (game.u.utrap)
            return false; /* already trapped */
        noticed.value = true;
        await dotrap(t, FORCETRAP);
        result = (game.u.utrap !== 0);
    } else {
        if (mon.mtrapped)
            return false; /* already trapped */
        /* you notice it if you see the trap close/tremble/whatever
           or if you sense the monster who becomes trapped */
        noticed.value = cansee(t.tx, t.ty) || canspotmon(mon);
        await wakeup(mon, true);
        result = ((await mintrap(mon, FORCETRAP)) !== Trap_Effect_Finished);
    }
    return result;
}

// src/trap.c:3102 steedintrap(); the hero's steed encounters a trap; returns
// 1 if the steed was hit, Trap_Killed_Mon if the trap killed it
export async function steedintrap(trap, otmp) {
    const u = game.u;
    const steed = u.usteed;
    let tt;
    let trapkilled, steedhit;

    if (!steed || !trap)
        return Trap_Effect_Finished;
    tt = trap.ttyp;
    steed.mx = u.ux;
    steed.my = u.uy;
    trapkilled = steedhit = false;

    switch (tt) {
    case ARROW_TRAP:
        if (!otmp) {
            /* impossible("steed hit by non-existent arrow?") */
            return Trap_Effect_Finished;
        }
        trapkilled = await thitm(8, steed, otmp, 0, false);
        steedhit = true;
        break;
    case DART_TRAP:
        if (!otmp) {
            /* impossible("steed hit by non-existent dart?") */
            return Trap_Effect_Finished;
        }
        trapkilled = await thitm(7, steed, otmp, 0, false);
        steedhit = true;
        break;
    case SLP_GAS_TRAP:
        if (!resists_sleep(steed) && !breathless(steed.data)
            && !helpless(steed)) {
            if (await sleep_monst(steed, rnd(25), -1))
                await pline(`${Monnam(steed)} suddenly falls asleep!`);
        }
        steedhit = true;
        break;
    case LANDMINE:
        trapkilled = await thitm(0, steed, null, rnd(16), false);
        steedhit = true;
        break;
    case PIT:
    case SPIKED_PIT:
        trapkilled = (DEADMONSTER(steed)
                      || await thitm(0, steed, null,
                                     rnd((tt === PIT) ? 6 : 10), false));
        steedhit = true;
        break;
    case POLY_TRAP:
        if (!resists_magm(steed) && !await resist(steed, OCLASSES.WAND_CLASS, 0, NOTELL)) {
            newcham(steed, null, NC_SHOW_MSG);
        }
        steedhit = true;
        break;
    default:
        break;
    }

    if (trapkilled) {
        await dismount_steed(DISMOUNT_POLY);
        return Trap_Killed_Mon;
    }
    return steedhit ? 1 : 0;
}

// src/trap.c:5341 cnv_trap_obj(); convert a trap into the object it was
// made from (dart, arrow, rock, land mine, bear trap)
export async function cnv_trap_obj(otyp, cnt, ttmp, bury_it) {
    const otmp = mksobj(otyp, true, false);
    let mtmp;

    otmp.quan = cnt;
    otmp.owt = weight(otmp);
    /* Only dart traps are capable of being poisonous */
    if (otyp !== ONAMES.DART)
        otmp.opoisoned = 0;
    place_object(otmp, ttmp.tx, ttmp.ty);
    if (bury_it) {
        /* magical digging first disarms this trap, then will unearth it */
        await bury_an_obj(otmp, null);
    } else {
        /* Sell your own traps only... */
        if (ttmp.madeby_u)
            await sellobj(otmp, ttmp.tx, ttmp.ty);
        stackobj(otmp);
    }
    newsym(ttmp.tx, ttmp.ty);
    if (game.u.utrap && game.u.ux === ttmp.tx && game.u.uy === ttmp.ty)
        await reset_utrap(true);
    if (((mtmp = m_at(ttmp.tx, ttmp.ty)) != null) && mtmp.mtrapped)
        mtmp.mtrapped = 0;
    deltrap(ttmp);
}

// src/trap.c:6668 delfloortrap(); used for doors and pits: remove a trap
// which would be destroyed by the terrain change, freeing whoever is in it
export async function delfloortrap(ttmp) {
    /* Destroy a trap that emanates from the floor. */
    /* some of these are arbitrary -dlc */
    if (ttmp && ((ttmp.ttyp === SQKY_BOARD) || (ttmp.ttyp === BEAR_TRAP)
                 || (ttmp.ttyp === LANDMINE) || (ttmp.ttyp === FIRE_TRAP)
                 || is_pit(ttmp.ttyp)
                 || is_hole(ttmp.ttyp)
                 || (ttmp.ttyp === TELEP_TRAP) || (ttmp.ttyp === LEVEL_TELEP)
                 || (ttmp.ttyp === WEB) || (ttmp.ttyp === MAGIC_TRAP)
                 || (ttmp.ttyp === ANTI_MAGIC))) {
        let mtmp;

        if (game.u.ux === ttmp.tx && game.u.uy === ttmp.ty) {
            if (game.u.utraptype !== TT_BURIEDBALL)
                await reset_utrap(true);
        } else if ((mtmp = m_at(ttmp.tx, ttmp.ty)) != null) {
            mtmp.mtrapped = 0;
        }
        deltrap(ttmp);
        return true;
    }
    return false;
}

// src/trap.c acid_damage(); scrolls but not spellbooks can be erased by acid
export async function acid_damage(obj) {
    let victim;
    let vismon;

    if (!obj)
        return;

    victim = carried(obj) ? game.youmonst : mcarried(obj) ? obj.ocarry : null;
    vismon = victim && (victim !== game.youmonst) && canseemon(victim);

    if (victim === game.youmonst && inventory_resistance_check(ATTKS.AD_ACID))
        return;

    if (obj.greased) {
        await grease_protect(obj, null, victim);
    } else if (obj.oclass === OCLASSES.SCROLL_CLASS && obj.otyp !== ONAMES.SCR_BLANK_PAPER) {
        if (obj.otyp !== ONAMES.SCR_BLANK_PAPER
            && obj.otyp !== ONAMES.SCR_MAIL) {
            if (!Blind()) {
                if (victim === game.youmonst)
                    await Your(`${aobjnam(obj, 'fade')}.`);
                else if (vismon)
                    await pline(`${s_suffix(Monnam(victim))} ${aobjnam(obj, 'fade')}.`);
            }
        }
        obj.otyp = ONAMES.SCR_BLANK_PAPER;
        obj.spe = 0;
        obj.dknown = 0;
    } else
        await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
}

// src/trap.c:7059 maybe_finish_sokoban(); the last pit or hole is gone, so
// the puzzle is solved and its rules no longer apply
export function maybe_finish_sokoban() {
    let t = null;

    if (Sokoban() && !game.in_mklev) {
        /* scan all remaining traps, ignoring any created by the hero;
           if this level has no more pits or holes, the current sokoban
           puzzle has been solved */
        for (t of (game.level?.traps || [])) {
            if (t.madeby_u) {
                t = null;
                continue;
            }
            if (t.ttyp === PIT || t.ttyp === HOLE)
                break;
            t = null;
        }
        if (!t) {
            /* for livelog to report the sokoban depth in the way that
               players tend to think about it: 1 for entry level, 4 for top */
            /* int sokonum = svd.dungeons[u.uz.dnum].entry_lev - u.uz.dlevel + 1; */

            /* we've passed the last trap without finding a pit or hole;
               clear the sokoban_rules flag so that luck penalties for
               things like breaking boulders or jumping will no longer
               be given, and restrictions on diagonal moves are lifted */
            game.level.flags.sokoban_rules = 0; /* Sokoban = 0 */
            /*
             * TODO: give some feedback about solving the sokoban puzzle
             * (perhaps say "congratulations" in Japanese?).
             */

            /* log the completion event regardless of whether or not
               any normal in-game feedback has just been given */
            /* livelog_printf(LL_MINORAC | LL_DUMP, "completed %d%s Sokoban level", ...) */
        }
    }
}
