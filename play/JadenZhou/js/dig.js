// dig.js -- burying objects (C ref: dig.c), plus dbridge.c is_ice().
//
// Only the parts reached during level creation are ported so far.

import { game } from './gstate.js';
import { in_town } from './hack.js';
import { rnd, rn2 } from './rng.js';
import { cvt_sdoor_to_door } from './detect.js';
import { canseemon, newsym, pline, You_hear, You_feel } from './display.js';
import { mksobj_at, place_object, level_objects_at } from './mkobj.js';
import { acurr } from './attrib.js';
import { start_timer, stop_timer, obj_to_any } from './timeout.js';
import { TIMER_OBJECT, ROT_ORGANIC, CXN_NO_PFX, OBJ_AT, u_at } from './const.js';
import { corpse_xname, otense } from './objnam.js';
import { Your } from './display.js';
import { remove_worn_item } from './steal.js';
import { setmnotwielded } from './weapon.js';
import { hideunder_async as hideunder, m_at } from './makemon.js';
import { stop_occupation } from './allmain.js';
import { obfree, stackobj } from './invent.js';
import { M1_CONCEAL } from './monsters.js';
import { Hallucination, Levitation, Unaware, Blind as Blind_dg } from './youprop.js';
import { D_TRAPPED, D_BROKEN, SCORR, A_STR, A_INT, A_WIS, A_DEX, A_CON,
         A_CHA } from './const.js';
import { ICE, DRAWBRIDGE_UP, DB_UNDER, DB_ICE, isok } from './const.js';
import { ROCK, BOULDER, CORPSE, LEASH, POT_OIL, POTION_CLASS, is_organic,
         is_pick, is_axe, bimanual } from './objects.js';
import { obj_resists } from './dogmove.js';
import { DIGTYP_UNDIGGABLE, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_BOULDER,
         DIGTYP_DOOR, DIGTYP_TREE, IS_OBSTRUCTED, IS_WALL, TREE, TT_PIT,
         FLYING, P_AXE, is_pit } from './const.js';
import { objects, STATUE, PICK_AXE, DWARVISH_MATTOCK, WEAPON_CLASS,
         TOOL_CLASS } from './objects.js';
import { closed_door, sobj_at } from './makemon.js';
import { t_at } from './trap.js';
import { rn1 } from './rng.js';
import { SDOOR, DOOR, CORR, ROOM, FOUNTAIN, SHOPBASE, W_NONDIGGABLE, D_NODOOR,
         IS_STWALL, IS_TREE, Is_earthlevel } from './const.js';
import { in_rooms } from './hack.js';
import { cansee, recalc_block_point, unblock_point } from './vision.js';
import { pline_The, tmp_at, DISP_BEAM, DISP_END } from './display.js';
import { COLNO, TT_BURIEDBALL, SHOP_DOOR_COST, SHOP_WALL_COST } from './const.js';
import { add_damage, pay_for_damage } from './shk.js';
import { S_VORTEX as S_VORTEX_ZD, PM_AIR_ELEMENTAL as PM_AIR_ELEMENTAL_ZD,
         AT_ENGL as AT_ENGL_ZD, AD_DGST as AD_DGST_ZD, G_UNIQ as G_UNIQ_ZD,
         mons as mons_zd } from './monsters.js';
import { STOMACH as STOMACH_ZD, HEAD as HEAD_ZD, KILLED_BY_AN as KILLED_BY_AN_ZD,
         Is_airlevel as Is_airlevel_zd, Is_waterlevel as Is_waterlevel_zd } from './const.js';
import { You as You_zd, stairway_at as stairway_at_zd } from './display.js';
import { s_suffix as s_suffix_zd } from './hacklib.js';
import { mon_nam as mon_nam_zd } from './do_name.js';
import { mbodypart as mbodypart_zd, body_part as body_part_zd } from './insight.js';
import { uhis, expels as expels_zd } from './mhitu.js';
import { ceiling as ceiling_zd } from './dungeon.js';
import { xname as xname_zd } from './objnam.js';
import { losehp as losehp_zd, Maybe_Half_Phys as Maybe_Half_Phys_zd } from './trap.js';
import { ROCK as ROCK_ZD } from './objects.js';
import { HEAVY_IRON_BALL } from './objects.js';
import { dist2 } from './hacklib.js';
import { reset_utrap } from './trap.js';
import { del_engr_at } from './engrave.js';
import { shop_keeper, costly_spot, stolen_value } from './shk.js';
import { shkname } from './shknam.js';
import { currency } from './insight.js';
import { maybe_unhide_at } from './mon.js';
import { You } from './display.js';
import { COIN_CLASS } from './objects.js';
import { punish } from './read.js';
import { obj_extract_self as mkobj_obj_extract_self } from './mkobj.js';
import { ROWNO as ROWNO_DG, LAVAPOOL as LAVAPOOL_DG, MOAT as MOAT_DG,
         POOL as POOL_DG } from './const.js';
import { is_moat as is_moat_dg, is_pool as is_pool_dg,
         is_lava as is_lava_dg } from './makemon.js';
import { mb_trapped } from './monmove.js';
import { is_pool_or_lava as is_pool_or_lava_dg,
         pooleffects as pooleffects_dg } from './hack.js';
import { delfloortrap as delfloortrap_dg,
         fire_damage_chain as fire_damage_chain_dg,
         water_damage_chain as water_damage_chain_dg } from './trap.js';
import { obj_ice_effects as obj_ice_effects_dg } from './mkobj.js';
import { hliquid as hliquid_dg } from './potion.js';
import { minliquid as minliquid_dg } from './mon.js';
import { STONE as STONE_DG } from './const.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, N_DIRS_Z, TT_WEB, WEB, IRONBARS,
         IS_WATERWALL, LAVAWALL, KILLED_BY, DIR_ERR, DIR_180, FORCEBUNGLE,
         LANDMINE, BEAR_TRAP, LEVITATION } from './const.js';
import { getdir, cmd_from_dir, movecmd_mode, dxdy_moveok,
         MV_WALK } from './cmd.js';
import { wield_tool } from './wield.js';
import { can_reach_floor, cant_reach_floor, uteetering_at_seen_pit,
         uescaped_shaft, u_wipe_engr } from './engrave.js';
import { confdir, xytodir, nomul } from './hack.js';
import { do_attack } from './uhitm.js';
import { set_occupation } from './allmain.js';
import { fire_damage, seetrap, dotrap, conjoined_pits } from './trap.js';
import { wake_nearby } from './mon.js';
import { Yobjnam2, yobjnam, yname } from './objnam.js';
import { dbon } from './weapon.js';
import { on_level, assign_level } from './dungeon.js';
import { surface } from './iactions.js';
import { You_cant, There } from './display.js';
import { d } from './rng.js';
import { OBJ_NAME } from './objects.js';
import { hides_under, is_whirly, digests } from './mondata.js';
import { hard_helmet as hard_helmet_zd } from './do_wear.js';
import { DIGCHECK_PASSED, DIGCHECK_PASSED_PITONLY, DIGCHECK_PASSED_DESTROY_TRAP,
         DIGCHECK_FAILED, DIGCHECK_FAIL_ONLADDER, DIGCHECK_FAIL_ONSTAIRS,
         DIGCHECK_FAIL_THRONE, DIGCHECK_FAIL_ALTAR, DIGCHECK_FAIL_AIRLEVEL,
         DIGCHECK_FAIL_WATERLEVEL, DIGCHECK_FAIL_TOOHARD,
         DIGCHECK_FAIL_UNDESTROYABLETRAP, DIGCHECK_FAIL_CANTDIG,
         DIGCHECK_FAIL_BOULDER, DIGCHECK_FAIL_OBJ_POOL_OR_TRAP } from './const.js';
import { IS_THRONE, IS_ALTAR, IS_DOOR, IS_FOUNTAIN, IS_SINK, IS_FURNITURE,
         IS_ROOM, IS_GRAVE, AM_SANCTUM, AM_MASK, Amask2align, A_NONE, A_LAWFUL,
         HOLE, PIT, TRAPDOOR, FORCETRAP, NO_TRAP_FLAGS, TT_INFLOOR, FOOT,
         RIGHT_SIDE, F_WARNED, DRAWBRIDGE_DOWN, ALTAR, DBWALL, SHOP_PIT_COST,
         MM_NOMSG, RLOC_NOMSG, IN_SIGHT, COULD_SEE, TAINT_AGE, DB_LAVA, DB_MOAT,
         MIGR_RANDOM, EXPL_MAGICAL, N_DIRS, xdir, ydir, Race_if, Role_if, next2u,
         is_hole, is_magical_trap, Is_stronghold, Is_botlevel } from './const.js';
import { PM_DWARF, PM_ELF, PM_RANGER, PM_EARTH_ELEMENTAL, PM_XORN,
         PM_ARCHEOLOGIST, PM_SAMURAI, S_ZOMBIE, S_MUMMY,
         MZ_HUGE } from './monsters.js';
import { greatest_erosion, TRAP_EXPLODE } from './objects.js';
import { Fumbling, Flying, Deaf } from './youprop.js';
import { rnl } from './rng.js';
import { acurrstr, adjalign, exercise } from './attrib.js';
import { is_flyer, is_floater, is_clinger, passes_walls,
         is_watch } from './mondata.js';
import { has_ceiling, align_str } from './insight.js';
import { rloc, next_to_u, teleport_pet } from './teleport.js';
import { feel_newsym, flush_screen, verbalize } from './display.js';
import { tty_display_nhwindow } from './wintty.js';
import { On_stairs } from './dogmove.js';
import { undestroyable_trap, set_wounded_legs, deltrap, trapname, maketrap,
         feeltrap, set_utrap, mintrap } from './trap.js';
import { Can_dig_down } from './mklev.js';
import { altarmask_at, altar_wrath, desecrate_altar } from './pray.js';
import { angry_priest } from './priest.js';
import { is_db_wall, is_drawbridge_wall, destroy_drawbridge } from './dbridge.js';
import { welded } from './wield.js';
import { dropx, goto_level } from './do.js';
import { the, simpleonames } from './iactions.js';
import { abon, dmgval } from './weapon.js';
import { an, An } from './objnam.js';
import { break_statue, fracture_rock, find_drawbridge } from './zap.js';
import { does_block } from './vision.js';
import { makemon, mkclass } from './makemon.js';
import { dogushforth, dryup, breaksink } from './fountain.js';
import { Monnam } from './do_name.js';
import { switch_terrain, spoteffects, spot_checks } from './hack.js';
import { pickup } from './pickup.js';
import { impact_drop } from './dokick.js';
import { shopdig, make_angry_shk } from './shk.js';
import { count_wsegs } from './worm.js';
import { get_level, ledger_no, depth } from './dungeon.js';
import { migrate_to_level } from './dog.js';
import { explode } from './explode.js';
import { delobj } from './invent.js';
import { mk_tt_object } from './mkobj.js';
import { get_iter_mons } from './sounds.js';
import { m_canseeu } from './monmove.js';
import { angry_guards } from './mon.js';
import { o_unleash } from './apply.js';
import { end_burn } from './timeout.js';
import { rnd_treefruit_at } from './mkobj.js';
import { b_trapped } from './trap.js';
import { NO_PART } from './const.js';
import { cnv_trap_obj } from './trap.js';
import { LAND_MINE, BEARTRAP } from './objects.js';

/* C ref: invent.c update_inventory() -- no perm_invent window */
function update_inventory() { }

// C ref: dig.c pick_can_reach()
function pick_can_reach(pick, x, y) {
    const u = game.u;
    const t = t_at(x, y);
    /* tseen: pit only affects item positioning when it is known */
    const target_in_pit = !!t && is_pit(t.ttyp) && !!t.tseen;

    /* if hero is in a pit, pick can only reach if the statue is too and
       the two pits are conjoined or the statue isn't and pick is two-handed;
       this applies to hero in pit trying to reach an adjcacent boulder too */
    if (u.utrap && u.utraptype === TT_PIT) {
        if (target_in_pit)
            return conjoined_pits(t, t_at(u.ux, u.uy), false);
        return bimanual(pick);
    }

    /* when hero isn't in a pit, a mattock or flying hero w/ pick can reach
       whether or not the statue is in a pit */
    const Flying = !!(u.uprops?.[FLYING]?.intrinsic || u.uprops?.[FLYING]?.extrinsic);
    if (bimanual(pick) || Flying)
        return true;
    /* one-handed pick-axe can reach if statue isn't in a pit */
    if (!target_in_pit)
        return true;

    return false;
}

// C ref: dig.c dig_typ()
/* When digging into location <x,y>, what are you actually digging into? */
export function dig_typ(otmp, x, y) {
    if (!isok(x, y) || !otmp || (!is_pick(otmp) && !is_axe(otmp)))
        return DIGTYP_UNDIGGABLE;

    const ltyp = game.level.at(x, y).typ;
    if (is_axe(otmp))
        return closed_door(x, y) ? DIGTYP_DOOR
               : (ltyp === TREE) ? DIGTYP_TREE /* axe vs tree */
                 : DIGTYP_UNDIGGABLE;
    /*assert(is_pick(otmp));*/
    return (sobj_at(STATUE, x, y) && pick_can_reach(otmp, x, y))
           ? DIGTYP_STATUE
           : (sobj_at(BOULDER, x, y) && pick_can_reach(otmp, x, y))
             ? DIGTYP_BOULDER
             : closed_door(x, y) ? DIGTYP_DOOR
               : (ltyp === TREE) ? DIGTYP_UNDIGGABLE /* pick vs tree */
                 : (IS_OBSTRUCTED(ltyp)
                    && (!game.level.flags?.arboreal || IS_WALL(ltyp)))
                   ? DIGTYP_ROCK
                   : DIGTYP_UNDIGGABLE;
}

// C ref: dbridge.c is_ice()
export function is_ice(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ;
    if (ltyp === ICE || (ltyp === DRAWBRIDGE_UP
                         && ((loc.drawbridgemask || 0) & DB_UNDER) === DB_ICE))
        return true;
    return false;
}

// C ref: dig.c add_to_buried()
export function add_to_buried(obj) {
    if (obj.where !== 'OBJ_FREE')
        throw new Error('add_to_buried: obj not free');
    obj.where = 'OBJ_BURIED';
    /* obj->nobj = svl.level.buriedobjlist; buriedobjlist = obj; */
    if (!game.level.buriedobjlist) game.level.buriedobjlist = [];
    game.level.buriedobjlist.unshift(obj);
}

// C ref: dig.c bury_an_obj()
/* Returns the next object in the pile (otmp->nexthere); the floor pile
   is read from game.level.objects. dealloced (optional) gets .v set. */
export function bury_an_obj(otmp, dealloced) {
    if (dealloced)
        dealloced.v = false;
    if (otmp === game.uball)
        throw new Error('bury_an_obj: burying the iron ball is not ported yet');
    /* after unpunish(), or might get deallocated chain */
    const pile = level_objects_at(otmp.ox, otmp.oy);
    const otmp2 = pile[pile.indexOf(otmp) + 1] || null;
    /*
     * obj_resists(,0,0) prevents Rider corpses from being buried.
     * It also prevents The Amulet and invocation tools from being
     * buried.
     */
    if (otmp === game.uchain || obj_resists(otmp, 0, 0))
        return otmp2;

    if (otmp.otyp === LEASH && otmp.leashmon)
        o_unleash(otmp);

    if (otmp.lamplit && otmp.otyp !== POT_OIL)
        end_burn(otmp, true);

    mkobj_obj_extract_self(otmp);

    const under_ice = is_ice(otmp.ox, otmp.oy);
    if ((otmp.otyp === ROCK && !under_ice) || otmp.otyp === BOULDER) {
        /* merges into burying material; boulder removal is for #wizbury */
        if (dealloced)
            dealloced.v = true;
        /* obfree(otmp, (struct obj *) 0): nothing to free in JS */
        otmp.where = 'OBJ_DELETED';
        return otmp2;
    }
    /*
     * Start a rot on organic material.  Not corpses -- they
     * are already handled.
     */
    if (otmp.otyp === CORPSE) {
        ; /* should cancel timer if under_ice */
    } else if ((under_ice ? (otmp.oclass === POTION_CLASS) : is_organic(otmp))
               && !obj_resists(otmp, 5, 95)) {
        start_timer((under_ice ? 0 : 250) + rnd(250),
                    TIMER_OBJECT, ROT_ORGANIC, obj_to_any(otmp));
    }
    add_to_buried(otmp);
    return otmp2;
}

// C ref: dig.c bury_objs()
export async function bury_objs(x, y) {
    let otmp, otmp2, shkp;
    let loss = 0;
    let costly;

    costly = !!((shkp = shop_keeper(in_rooms(x, y, SHOPBASE).charCodeAt(0) || 0))
                && costly_spot(x, y));

    /* for (otmp = svl.level.objects[x][y]; otmp; otmp = otmp2) */
    for (otmp = level_objects_at(x, y)[0] || null;
         otmp; otmp = otmp2) {
        if (costly && !game.context.mon_moving) {
            loss += await stolen_value(otmp, x, y, !!shkp.mpeaceful, true);
            if (otmp.oclass !== COIN_CLASS)
                otmp.no_charge = 1;
        }
        otmp2 = bury_an_obj(otmp, null);
    }

    /* don't expect any engravings here, but just in case */
    del_engr_at(x, y);
    newsym(x, y);
    maybe_unhide_at(x, y);

    if (costly && loss) {
        await You(`owe ${shkname(shkp)} ${loss} ${currency(loss)} for burying merchandise.`);
    }
}

// C ref: dig.c rot_organic()
/*
 * Called when a buried object has rotted away.
 */
export async function rot_organic(arg, timeout) {
    const obj = arg.a_obj;

    while (obj.cobj && obj.cobj.length) { /* Has_contents(obj) */
        /* We don't need to place contained object on the floor
           first, but we do need to update its map coordinates. */
        obj.cobj[0].ox = obj.ox, obj.cobj[0].oy = obj.oy;
        /* Everything which can be held in a container can also be
           buried, so bury_an_obj's use of obj_extract_self insures
           that Has_contents(obj) will eventually become false. */
        bury_an_obj(obj.cobj[0], null);
    }
    mkobj_obj_extract_self(obj);
    obfree(obj, null);
}

// C ref: dig.c rot_corpse()
/*
 * Called when a corpse has rotted completely away.
 */
export async function rot_corpse(arg, timeout) {
    let x = 0, y = 0;
    const obj = arg.a_obj;
    const on_floor = obj.where === 'OBJ_FLOOR',
        in_invent = obj.where === 'OBJ_INVENT';

    if (on_floor) {
        x = obj.ox;
        y = obj.oy;
    } else if (in_invent) {
        if (game.flags.verbose) {
            const cname = corpse_xname(obj, null, CXN_NO_PFX);

            await Your(`${(obj === game.uwep) ? "wielded " : ""}${cname} ${
                otense(obj, "rot")} away${(obj === game.uwep) ? '!' : '.'}`);
        }
        if (obj.owornmask) {
            await remove_worn_item(obj, true);
            await stop_occupation();
        }
    } else if (obj.where === 'OBJ_MINVENT') {
        if (obj.owornmask && obj === obj.ocarry.mw) /* MON_WEP(obj->ocarry) */
            setmnotwielded(obj.ocarry, obj); /* clears owornmask */
    } else if (obj.where === 'OBJ_MIGRATING') {
        /* clear destination flag so that obfree()'s check for
           freeing a worn object doesn't get a false hit */
        obj.owornmask = 0;
    }
    await rot_organic(arg, timeout);
    if (on_floor) {
        const mtmp = m_at(x, y);

        /* a hiding monster may be exposed */
        if (mtmp && !OBJ_AT(x, y) && mtmp.mundetected
            && hides_under(mtmp.data)) {
            mtmp.mundetected = 0;
        } else if (u_at(x, y)
                   && game.u.uundetected && hides_under(game.youmonst.data))
            await hideunder(game.youmonst);
        newsym(x, y);
    } else if (in_invent)
        update_inventory();
}

/* C ref: hack.c may_dig() */
export function may_dig(x, y) {
    const lev = game.level.at(x, y);
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && ((lev.wall_info ?? 0) & W_NONDIGGABLE));
}


// C ref: dig.c fillholetyp()
/* When digging a hole or exploding a land mine next to liquid, the
   hole may fill in */
export function fillholetyp(x, y,
                            fill_if_any) { /* force filling if it exists at all */
    let x1, y1;
    const lo_x = Math.max(1, x - 1), hi_x = Math.min(x + 1, COLNO - 1),
          lo_y = Math.max(0, y - 1), hi_y = Math.min(y + 1, ROWNO_DG - 1);
    let pool_cnt = 0, moat_cnt = 0, lava_cnt = 0;

    for (x1 = lo_x; x1 <= hi_x; x1++)
        for (y1 = lo_y; y1 <= hi_y; y1++)
            if (is_moat_dg(x1, y1))
                moat_cnt++;
            else if (is_pool_dg(x1, y1))
                /* This must come after is_moat since moats are pools
                 * but not vice-versa. */
                pool_cnt++;
            else if (is_lava_dg(x1, y1))
                lava_cnt++;

    if (!fill_if_any)
        pool_cnt = Math.trunc(pool_cnt / 3); /* not as much liquid as the others */

    if ((lava_cnt > moat_cnt + pool_cnt && rn2(lava_cnt + 1))
        || (lava_cnt && fill_if_any))
        return LAVAPOOL_DG;
    else if ((moat_cnt > 0 && rn2(moat_cnt + 1)) || (moat_cnt && fill_if_any))
        return MOAT_DG;
    else if ((pool_cnt > 0 && rn2(pool_cnt + 1)) || (pool_cnt && fill_if_any))
        return POOL_DG;
    else
        return ROOM;
}

/* C ref: svl.level.objects[x][y] -- the pile at <x,y>, top first (the
   ->nexthere chain) */
function level_objects_at_dg(x, y) {
    return level_objects_at(x, y);
}

// C ref: dig.c liquid_flow()
/*
 * Called from dighole(); also from do_break_wand() in apply.c
 * and do_earthquake() in music.c.
 */
export async function liquid_flow(x, y, typ, ttmp, fillmsg) {
    let objchain;
    let mon;
    const u_spot = u_at(x, y);

    /* caller should have changed levl[x][y].typ to POOL, MOAT, or LAVA */
    if (!is_pool_or_lava_dg(x, y)) {
        /* iflags.sanity_check: impossible("Insane liquid_flow(...)") */
        return;
    }

    if (ttmp)
        await delfloortrap_dg(ttmp); /* will untrap monster if one is here */
    /* if any objects were frozen here, they're released now */
    obj_ice_effects_dg(x, y, true);
    unearth_objs(x, y);

    if (fillmsg)
        await pline(fillmsg.replace('%s',
                                    hliquid_dg(typ === LAVAPOOL_DG ? "lava" : "water")));
    /* handle object damage before hero damage; affects potential bones */
    if ((objchain = level_objects_at_dg(x, y)).length) {
        if (typ === LAVAPOOL_DG)
            await fire_damage_chain_dg(objchain, true, true, x, y);
        else
            await water_damage_chain_dg(objchain, true);
    }
    /* damage to the hero */
    if (u_spot) {
        await pooleffects_dg(false);
    } else if ((mon = m_at(x, y)) !== null && mon) {
        await minliquid_dg(mon);
    }
}

// C ref: dig.c is_digging()
/* the hero's occupation is the dig() occupation */
export function is_digging() {
    if (game.occupation === dig) {
        return true;
    }
    return false;
}

// C ref: dig.c watchman_canseeu()
function watchman_canseeu(mtmp) {
    if (is_watch(mtmp.data) && mtmp.mcansee && m_canseeu(mtmp)
        && mtmp.mpeaceful)
        return true;
    return false;
}

// C ref: dig.c watch_dig()
/*
 * Town Watchmen frown on damage to the town walls, trees or fountains.
 * It's OK to dig holes in the ground, however.
 * If mtmp is assumed to be a watchman, a watchman is found if mtmp == 0
 * zap == TRUE if wand/spell of digging, FALSE otherwise (chewing)
 */
export async function watch_dig(mtmp, x, y, zap) {
    const lev = game.level.at(x, y);

    if (in_town(x, y)
        && (closed_door(x, y) || lev.typ === SDOOR || IS_WALL(lev.typ)
            || IS_FOUNTAIN(lev.typ) || IS_TREE(lev.typ))) {
        if (!mtmp)
            mtmp = await get_iter_mons(watchman_canseeu);

        if (mtmp) {
            const digging = digging_ctx();

            /* SetVoice(mtmp, 0, 80, 0); */
            if (zap || digging.warned) {
                await verbalize("Halt, vandal!  You're under arrest!");
                await angry_guards(!!Deaf());
            } else {
                let str;

                if (IS_DOOR(lev.typ))
                    str = "door";
                else if (IS_TREE(lev.typ))
                    str = "tree";
                else if (IS_OBSTRUCTED(lev.typ))
                    str = "wall";
                else
                    str = "fountain";
                await verbalize(`Hey, stop damaging that ${str}!`);
                digging.warned = true;
            }
            if (is_digging())
                await stop_occupation();
        }
    }
}

// C ref: dig.c mdig_tunnel()
/* digging by monster.  No digging into hero's location.
   Returns TRUE if monster died, FALSE otherwise. */
export async function mdig_tunnel(mtmp) {
    const g = game;
    let sawit, seeit, trapped;
    const pile = rnd(12);

    const here = g.level.at(mtmp.mx, mtmp.my);
    if (here.typ === SDOOR)
        cvt_sdoor_to_door(here); /* ->typ = DOOR */

    /* Eats away door if present & closed or locked */
    if (closed_door(mtmp.mx, mtmp.my)) {
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE).length)
            add_damage(mtmp.mx, mtmp.my, 0);
        /* sawit: closed door location is more visible than an open one */
        sawit = canseemon(mtmp); /* before door state change and unblock_pt */
        trapped = ((here.doormask ?? 0) & D_TRAPPED) ? true : false;
        here.doormask = trapped ? D_NODOOR : D_BROKEN;
        recalc_block_point(mtmp.mx, mtmp.my); /* vision */
        newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            seeit = canseemon(mtmp);
            if (await mb_trapped(mtmp, sawit || seeit)) { /* mtmp is killed */
                newsym(mtmp.mx, mtmp.my);
                return true;
            }
        } else {
            if (g.flags.verbose) {
                if (!Unaware() && !rn2(3)) /* not too often.. */
                    await draft_message(true); /* "You feel an unexpected draft." */
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        here.typ = CORR; here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false); /* "You feel a draft." */
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) { /* no dig */
        return false;
    }

    /* Only rock, trees, and walls fall through to this point. */
    if (((here.wall_info ?? 0) & W_NONDIGGABLE) !== 0) {
        /* impossible("mdig_tunnel:  %s at (%d,%d) is undiggable", ...) */
        return false; /* still alive */
    }

    if (IS_WALL(here.typ)) {
        /* KMH -- Okay on arboreal levels (room walls are still stone) */
        if (g.flags.verbose && !rn2(5)) {
            /* Soundeffect(se_crashing_rock, 75) */
            await You_hear("crashing rock.");
        }
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE).length)
            add_damage(mtmp.mx, mtmp.my, 0);
        if (g.level.flags.is_maze_lev) {
            here.typ = ROOM; here.flags = 0;
        } else if (g.level.flags.is_cavernous_lev
                   && !in_town(mtmp.mx, mtmp.my)) {
            here.typ = CORR; here.flags = 0;
        } else {
            here.typ = DOOR; here.doormask = D_NODOOR;
        }
    } else if (IS_TREE(here.typ)) {
        here.typ = ROOM; here.flags = 0;
        if (pile && pile < 5)
            rnd_treefruit_at(mtmp.mx, mtmp.my);
    } else {
        here.typ = CORR; here.flags = 0;
        if (pile && pile < 5)
            mksobj_at((pile === 1) ? BOULDER : ROCK, mtmp.mx, mtmp.my,
                      true, false);
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(BOULDER, mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my); /* vision */

    return false;
}

const STRIDENT = 4; /* from pray.c */

// C ref: dig.c draft_message()
/* draft refers to air currents, but can be a pun on "draft" as conscription
   for military service (probably not a good pun if it has to be explained) */
export async function draft_message(unexpected) {
    const u = game.u;
    /*
     * [Bug or TODO?  Have caller pass coordinates and use the travel
     * mechanism to determine whether there is a path between
     * destroyed door (or exposed secret corridor) and hero's location.
     * When there is no such path, no draft should be felt.]
     */

    if (unexpected) {
        if (!Hallucination())
            await You_feel("an unexpected draft.");
        else
            /* U.S. classification system uses 1-A for eligible to serve
               and 4-F for ineligible due to physical or mental defect;
               some intermediate values exist but are rarely seen */
            await You_feel("like you are "
                        + ((acurr(A_STR) < 6 || acurr(A_DEX) < 6
                            || acurr(A_CON) < 6 || acurr(A_CHA) < 6
                            || acurr(A_INT) < 6 || acurr(A_WIS) < 6) ? "4-F"
                                                                     : "1-A")
                        + ".");
    } else {
        if (!Hallucination()) {
            await You_feel("a draft.");
        } else {
            /* "marching" is deliberately ambiguous; it might mean drills
                after entering military service or mean engaging in protests */
            const draft_reaction = [
                "enlisting", "marching", "protesting", "fleeing",
            ];
            const sgn = (n) => (n > 0) - (n < 0);

            /* Lawful: 0..1, Neutral: 1..2, Chaotic: 2..3 */
            let dridx = rn1(2, 1 - sgn(u.ualign.type));
            if (u.ualign.record < STRIDENT)
                /* L: +(0..2), N: +(-1..1), C: +(-2..0); all: 0..3 */
                dridx += rn1(3, sgn(u.ualign.type) - 1);
            await You_feel("like " + draft_reaction[dridx] + ".");
        }
    }
}

// C ref: dig.c zap_dig() -- digging via wand zap or spell cast
export async function zap_dig() {
    const g = game;
    const u = g.u;
    let room;
    let trap_with_u = null;
    let zx, zy, flow_x = -1, flow_y = -1;
    let diridx = 8, digdepth;
    let shopdoor, shopwall, pitdig = false, pitflow = false;

    /*
     * Original effect (approximately):
     * from CORR: dig until we pierce a wall
     * from ROOM: pierce wall and dig until we reach
     * an ACCESSIBLE place.
     * Currently: dig for digdepth positions;
     * also down on request of Lennart Augustsson.
     * 3.6.0: from a PIT: dig one adjacent pit.
     */

    if (u.uswallow) {
        const mtmp = u.ustuck;

        if (!is_whirly(mtmp.data)) {
            if (digests(mtmp.data))
                await You_zd(`pierce ${s_suffix_zd(mon_nam_zd(mtmp))} ${
                    mbodypart_zd(mtmp, STOMACH_ZD)} wall!`);
            if (mtmp.data.geno & G_UNIQ_ZD) /* unique_corpstat() */
                mtmp.mhp = Math.trunc((mtmp.mhp + 1) / 2);
            else
                mtmp.mhp = 1; /* almost dead */
            await expels_zd(mtmp, mtmp.data, !digests(mtmp.data));
        }
        return;
    } /* swallowed */

    if (u.dz) {
        if (!Is_airlevel_zd(u.uz) && !Is_waterlevel_zd(u.uz) && !u.uinwater) {
            if (u.dz < 0 || stairway_at_zd(u.ux, u.uy)) { /* On_stairs() */
                let dmg;
                if (stairway_at_zd(u.ux, u.uy)) {
                    const stway = stairway_at_zd(u.ux, u.uy);
                    await pline_The(`beam bounces off the ${
                        stway.isladder ? "ladder" : "stairs"} and hits the ${
                        ceiling_zd(u.ux, u.uy)}.`);
                }
                await You_zd(`loosen a rock from the ${ceiling_zd(u.ux, u.uy)}.`);
                await pline(`It falls on your ${body_part_zd(HEAD_ZD)}!`);
                dmg = rnd(hard_helmet_zd(g.uarmh) ? 2 : 6);
                await losehp_zd(Maybe_Half_Phys_zd(dmg), "falling rock", KILLED_BY_AN_ZD);
                const otmp = mksobj_at(ROCK_ZD, u.ux, u.uy, false, false);
                if (otmp) {
                    xname_zd(otmp); /* set dknown, maybe bknown */
                    stackobj(otmp);
                }
                newsym(u.ux, u.uy);
            } else {
                await watch_dig(null, u.ux, u.uy, true);
                await dighole(false, true, null);
            }
        }
        return;
    } /* up or down */

    /* normal case: digging across the level */
    shopdoor = shopwall = false;
    const maze_dig = g.level.flags.is_maze_lev && !Is_earthlevel(u.uz);
    zx = u.ux + u.dx;
    zy = u.uy + u.dy;
    if (u.utrap && u.utraptype === TT_PIT
        && (trap_with_u = t_at(u.ux, u.uy))) {
        pitdig = true;
        diridx = xytodir(u.dx, u.dy);
    }
    digdepth = rn1(18, 8);
    await tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_digbeam) */
    while (--digdepth >= 0) {
        if (!isok(zx, zy))
            break;
        room = g.level.at(zx, zy);
        await tmp_at(zx, zy);
        /* nh_delay_output(): wait a little bit */

        if (pitdig) { /* we are already in a pit if this is true */
            const cc = { x: 0, y: 0 };
            let adjpit = t_at(zx, zy);

            if (diridx !== DIR_ERR
                && !conjoined_pits(adjpit, trap_with_u, false)) {
                digdepth = 0; /* limited to the adjacent location only */
                if (!(adjpit && is_pit(adjpit.ttyp))) {
                    const buf = { v: '' };

                    cc.x = zx;
                    cc.y = zy;
                    if (!adj_pit_checks(cc, buf)) {
                        if (buf.v)
                            await pline(buf.v);
                    } else {
                        /* this can also result in a pool at zx,zy */
                        await dighole(true, true, cc);
                        adjpit = t_at(zx, zy);
                    }
                }
                if (adjpit && is_pit(adjpit.ttyp)) {
                    const adjidx = DIR_180(diridx);

                    trap_with_u.conjoined |= (1 << diridx);
                    adjpit.conjoined |= (1 << adjidx);
                    flow_x = zx;
                    flow_y = zy;
                    pitflow = true;
                }
                if (is_pool_dg(zx, zy) || is_lava_dg(zx, zy)) {
                    flow_x = zx - u.dx;
                    flow_y = zy - u.dy;
                    pitflow = true;
                }
                break;
            }
        } else if (closed_door(zx, zy) || room.typ === SDOOR) {
            if (in_rooms(zx, zy, SHOPBASE).length) {
                add_damage(zx, zy, SHOP_DOOR_COST);
                shopdoor = true;
            }
            if (room.typ === SDOOR)
                room.typ = DOOR; /* doormask set below */
            else if (cansee(zx, zy))
                await pline_The("door is razed!");
            await watch_dig(null, zx, zy, true);
            room.doormask = D_NODOOR;
            recalc_block_point(zx, zy); /* vision */
            digdepth -= 2;
            if (maze_dig)
                break;
        } else if (maze_dig) {
            if (IS_WALL(room.typ)) {
                if (!((room.wall_info || 0) & W_NONDIGGABLE)) {
                    if (in_rooms(zx, zy, SHOPBASE).length) {
                        add_damage(zx, zy, SHOP_WALL_COST);
                        shopwall = true;
                    }
                    room.typ = ROOM, room.flags = 0;
                    unblock_point(zx, zy); /* vision */
                } else if (!Blind_dg())
                    await pline_The("wall glows then fades.");
                break;
            } else if (IS_TREE(room.typ)) { /* check trees before stone */
                if (!((room.wall_info || 0) & W_NONDIGGABLE)) {
                    room.typ = ROOM, room.flags = 0;
                    unblock_point(zx, zy); /* vision */
                } else if (!Blind_dg())
                    await pline_The("tree shudders but is unharmed.");
                break;
            } else if (room.typ === STONE_DG || room.typ === SCORR) {
                if (!((room.wall_info || 0) & W_NONDIGGABLE)) {
                    room.typ = CORR, room.flags = 0;
                    unblock_point(zx, zy); /* vision */
                } else if (!Blind_dg())
                    await pline_The("rock glows then fades.");
                break;
            }
        } else if (IS_OBSTRUCTED(room.typ)) {
            if (!may_dig(zx, zy))
                break;
            if (IS_WALL(room.typ) || room.typ === SDOOR) {
                if (in_rooms(zx, zy, SHOPBASE).length) {
                    add_damage(zx, zy, SHOP_WALL_COST);
                    shopwall = true;
                }
                await watch_dig(null, zx, zy, true);
                if (g.level.flags.is_cavernous_lev && !in_town(zx, zy)) {
                    room.typ = CORR, room.flags = 0;
                } else {
                    room.typ = DOOR, room.doormask = D_NODOOR;
                }
                digdepth -= 2;
            } else if (IS_TREE(room.typ)) {
                room.typ = ROOM, room.flags = 0;
                digdepth -= 2;
            } else { /* IS_OBSTRUCTED but not IS_WALL or SDOOR */
                room.typ = CORR, room.flags = 0;
                digdepth--;
            }
            unblock_point(zx, zy); /* vision */
        }
        zx += u.dx;
        zy += u.dy;
    } /* while */
    await tmp_at(DISP_END, 0); /* closing call */

    if (pitflow && isok(flow_x, flow_y)) {
        const ttmp = t_at(flow_x, flow_y);

        if (ttmp && is_pit(ttmp.ttyp)) {
            const filltyp = fillholetyp(ttmp.tx, ttmp.ty, true);

            if (filltyp !== ROOM)
                await pit_flow(ttmp, filltyp);
        }
    }

    if (shopdoor || shopwall)
        await pay_for_damage(shopdoor ? "destroy" : "dig into", false);
}

// C ref: dig.c buried_ball()
/* cc is {x, y}; updated to the ball's spot when found nearby */
export function buried_ball(cc) {
    const u = game.u;
    let odist, bdist = COLNO;
    let ball = null;

    /* u.utrap might have already been cleared, in which case the value
       of u.utraptype is no longer meaningful; if u.utrap is still set
       then u.utraptype needs to be for buried ball */
    if (!u.utrap || u.utraptype === TT_BURIEDBALL) {
        for (const otmp of game.level.buriedobjlist || []) {
            if (otmp.otyp !== HEAVY_IRON_BALL)
                continue;
            /* if found at the target spot, we're done */
            if (otmp.ox === cc.x && otmp.oy === cc.y)
                return otmp;
            /* find nearest within allowable vicinity: +/-2
             *  4 5 8
             *  1 2 5
             *  0 1 4
             */
            odist = dist2(otmp.ox, otmp.oy, cc.x, cc.y);
            if (odist <= 8 && (!ball || odist < bdist)) {
                /* remember nearest buried ball but keep checking others */
                ball = otmp;
                bdist = odist;
            }
        }
    }
    if (ball) {
        /* found, but not at < cc->x, cc->y > */
        cc.x = ball.ox;
        cc.y = ball.oy;
    }
    return ball;
}

// C ref: dig.c unearth_objs()
export function unearth_objs(x, y) {
    const u = game.u;
    const cc = { x, y };

    const bball = buried_ball(cc);
    /* for (otmp = svl.level.buriedobjlist; otmp; otmp = otmp2) */
    for (const otmp of (game.level.buriedobjlist || []).slice()) {
        if (otmp.ox === x && otmp.oy === y) {
            if (bball && otmp === bball
                && u.utrap && u.utraptype === TT_BURIEDBALL) {
                throw new Error('unearth_objs(): buried_ball_to_punishment() from maketrap() not ported yet');
            } else {
                mkobj_obj_extract_self(otmp);
                if (otmp.timed)
                    stop_timer(ROT_ORGANIC, obj_to_any(otmp));
                place_object(otmp, x, y);
                stackobj(otmp);
            }
        }
    }
    del_engr_at(x, y);
    newsym(x, y);
}

// C ref: dig.c buried_ball_to_punishment()
export async function buried_ball_to_punishment() {
    const u = game.u;
    const cc = { x: u.ux, y: u.uy };
    const ball = buried_ball(cc);

    if (ball) {
        mkobj_obj_extract_self(ball);
        await punish(ball); /* use ball as flag for unearthed buried ball */
        await reset_utrap(false);
        del_engr_at(cc.x, cc.y);
        newsym(cc.x, cc.y);
    }
}

// C ref: dig.c buried_ball_to_freedom()
export async function buried_ball_to_freedom() {
    const u = game.u;
    const cc = { x: u.ux, y: u.uy };
    const ball = buried_ball(cc);

    if (ball) {
        mkobj_obj_extract_self(ball);
        /* rusting buried metallic objects is not implemented yet (#if 0) */
        place_object(ball, cc.x, cc.y);
        stackobj(ball);
        await reset_utrap(true);
        del_engr_at(cc.x, cc.y);
        newsym(cc.x, cc.y);
    }
}


/* C ref: context.h struct dig_info (svc.context.digging); C's context
   starts zeroed */
export function digging_ctx() {
    const g = game;
    if (!g.context) g.context = {};
    if (!g.context.digging)
        g.context.digging = { pos: { x: 0, y: 0 },
                              level: { dnum: 0, dlevel: 0 },
                              lastdigtime: 0, down: false, chew: false,
                              warned: false, quiet: false, effort: 0 };
    return g.context.digging;
}

/* C ref: (void) memset(&svc.context.digging, 0, sizeof svc.context.digging) */
export function clear_digging() {
    const digging = digging_ctx();
    digging.pos.x = 0, digging.pos.y = 0;
    digging.level.dnum = 0, digging.level.dlevel = 0;
    digging.lastdigtime = 0;
    digging.down = false, digging.chew = false;
    digging.warned = false, digging.quiet = false;
    digging.effort = 0;
}

/* C ref: dig.c #define BY_YOU (&gy.youmonst), BY_OBJECT ((struct monst *) 0) */
function BY_YOU() { return game.youmonst; }
const BY_OBJECT = null;

/* C ref: hack.h SHOP_WALL_DMG (10L * ACURRSTR) -- damaging a wall */
function SHOP_WALL_DMG() { return 10 * acurrstr(); }

/* C ref: mondata.h grounded() */
export function grounded(ptr) {
    return (!is_flyer(ptr) && !is_floater(ptr)
            && (!is_clinger(ptr) || !has_ceiling(game.u.uz)));
}

// C ref: dig.c rm_waslit()
function rm_waslit() {
    const u = game.u;
    let x, y;

    if (game.level.at(u.ux, u.uy).typ === ROOM
        && game.level.at(u.ux, u.uy).waslit)
        return true;
    for (x = u.ux - 2; x < u.ux + 3; x++)
        for (y = u.uy - 1; y < u.uy + 2; y++)
            if (isok(x, y) && game.level.at(x, y).waslit)
                return true;
    return false;
}

// C ref: dig.c mkcavepos()
/* Change level topology.  Messes with vision tables and ignores things like
 * boulders in the name of a nice effect.  Vision will get fixed up again
 * immediately after the effect is complete.
 */
async function mkcavepos(x, y, dist, waslit, rockit) {
    let lev;

    if (!isok(x, y))
        return;
    lev = game.level.at(x, y);

    if (rockit) {
        let mtmp;

        if (IS_OBSTRUCTED(lev.typ))
            return;
        if (t_at(x, y))
            return;                   /* don't cover the portal */
        if ((mtmp = m_at(x, y)) != null) /* make sure crucial monsters survive */
            if (!passes_walls(mtmp.data))
                await rloc(mtmp, RLOC_NOMSG);
    } else if (lev.typ === ROOM)
        return;

    unblock_point(x, y); /* make sure vision knows this location is open */

    /* fake out saved state */
    lev.seenv = 0;
    lev.doormask = 0;
    if (dist < 3)
        lev.lit = (rockit ? false : true);
    if (waslit)
        lev.waslit = (rockit ? false : true);
    lev.horizontal = false;
    /* short-circuit vision recalc */
    if (game.viz_array && game.viz_array[y])
        game.viz_array[y][x] = (dist < 3) ? (IN_SIGHT | COULD_SEE) : COULD_SEE;
    lev.typ = (rockit ? STONE_DG : ROOM); /* flags set via doormask above */
    /* dist >= 3: impossible("mkcavepos called with dist %d", dist) */
    feel_newsym(x, y);
}

// C ref: dig.c mkcavearea()
async function mkcavearea(rockit) {
    const u = game.u;
    let dist;
    let xmin = u.ux, xmax = u.ux;
    let ymin = u.uy, ymax = u.uy;
    let i;
    const waslit = rm_waslit();

    if (rockit) {
        /* Soundeffect(se_crashing_rock, 100); */
        await pline("Crash!  The ceiling collapses around you!");
    } else {
        await pline(`A mysterious force ${
            (game.level.at(u.ux, u.uy).typ === CORR) ? "creates a"
                                                     : "extends the"} cave around you!`);
    }
    await tty_display_nhwindow(game.WIN_MESSAGE, true);

    for (dist = 1; dist <= 2; dist++) {
        xmin--;
        xmax++;

        /* top and bottom */
        if (dist < 2) { /* the area is wider that it is high */
            ymin--;
            ymax++;
            for (i = xmin + 1; i < xmax; i++) {
                await mkcavepos(i, ymin, dist, waslit, rockit);
                await mkcavepos(i, ymax, dist, waslit, rockit);
            }
        }

        /* left and right */
        for (i = ymin; i <= ymax; i++) {
            await mkcavepos(xmin, i, dist, waslit, rockit);
            await mkcavepos(xmax, i, dist, waslit, rockit);
        }

        await flush_screen(1); /* make sure the new glyphs shows up */
        /* nh_delay_output(); */
    }

    if (!rockit && game.level.at(u.ux, u.uy).typ === CORR) {
        game.level.at(u.ux, u.uy).typ = ROOM; /* flags for CORR already 0 */
        if (waslit)
            game.level.at(u.ux, u.uy).waslit = true;
        newsym(u.ux, u.uy); /* in case player is invisible */
    }

    game.vision_full_recalc = 1; /* everything changed */
}

// C ref: dig.c dig_check()
export function dig_check(madeby, x, y) {
    const u = game.u;
    const ttmp = t_at(x, y);
    const lev = game.level.at(x, y);

    if (On_stairs(x, y)) {
        const stway = stairway_at_zd(x, y);
        if (stway.isladder) {
            return DIGCHECK_FAIL_ONLADDER;
        } else {
            return DIGCHECK_FAIL_ONSTAIRS;
        }
    } else if (IS_THRONE(lev.typ) && madeby !== BY_OBJECT) {
        return DIGCHECK_FAIL_THRONE;
    } else if (IS_ALTAR(lev.typ)
               && (madeby !== BY_OBJECT
                   || (altarmask_at(x, y) & AM_SANCTUM) !== 0)) {
        return DIGCHECK_FAIL_ALTAR;
    } else if (Is_airlevel_zd(u.uz)) {
        return DIGCHECK_FAIL_AIRLEVEL;
    } else if (Is_waterlevel_zd(u.uz)) {
        return DIGCHECK_FAIL_WATERLEVEL;
    } else if ((IS_OBSTRUCTED(lev.typ) && lev.typ !== SDOOR
                && ((lev.wall_info || 0) & W_NONDIGGABLE) !== 0)) {
        return DIGCHECK_FAIL_TOOHARD;
    } else if (ttmp && undestroyable_trap(ttmp.ttyp)) {
        return DIGCHECK_FAIL_UNDESTROYABLETRAP;
    } else if (!Can_dig_down(u.uz) && !lev.candig) {
        if (ttmp) {
            if (!is_hole(ttmp.ttyp) && !is_pit(ttmp.ttyp))
                return DIGCHECK_PASSED_DESTROY_TRAP;
            else
                return DIGCHECK_FAIL_CANTDIG;
        } else {
            return DIGCHECK_PASSED_PITONLY;
        }
    } else if (sobj_at(BOULDER, x, y)) {
        return DIGCHECK_FAIL_BOULDER;
    } else if (madeby === BY_OBJECT
               /* the block against existing traps is mainly to
                  prevent broken wands from turning holes into pits */
               && (ttmp || is_pool_or_lava_dg(x, y))) {
        /* digging by player handles pools separately */
        return DIGCHECK_FAIL_OBJ_POOL_OR_TRAP;
    }
    return DIGCHECK_PASSED;
}

// C ref: dig.c digcheck_fail_message()
export async function digcheck_fail_message(digresult, madeby, x, y) {
    const verb =
        (madeby === BY_YOU() && game.uwep && is_axe(game.uwep)) ? "chop" : "dig in";

    if (digresult < DIGCHECK_FAILED)
        return;

    switch (digresult) {
    case DIGCHECK_FAIL_AIRLEVEL:
        await You(`cannot ${verb} thin air.`);
        break;
    case DIGCHECK_FAIL_ALTAR:
        await pline_The("altar is too hard to break apart.");
        break;
    case DIGCHECK_FAIL_BOULDER:
        await There(`isn't enough room to ${verb} here.`);
        break;
    case DIGCHECK_FAIL_ONLADDER:
        await pline_The("ladder resists your effort.");
        break;
    case DIGCHECK_FAIL_ONSTAIRS:
        await pline_The(`stairs are too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_THRONE:
        await pline_The("throne is too hard to break apart.");
        break;
    case DIGCHECK_FAIL_CANTDIG:
    case DIGCHECK_FAIL_TOOHARD:
    case DIGCHECK_FAIL_UNDESTROYABLETRAP:
        await pline_The(`${surface(x, y)} here is too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_WATERLEVEL:
        await pline_The(`${hliquid_dg("water")} splashes and subsides.`);
        break;
    case DIGCHECK_FAIL_OBJ_POOL_OR_TRAP:
    case DIGCHECK_PASSED:
    case DIGCHECK_PASSED_PITONLY:
    case DIGCHECK_PASSED_DESTROY_TRAP:
        break;
    }
}

// C ref: dig.c dig()
/* the digging occupation */
async function dig() {
    const g = game, u = g.u;
    const digging = digging_ctx();
    let lev;
    const dpx = digging.pos.x, dpy = digging.pos.y;
    const uwep = g.uwep;
    const ispick = !!uwep && is_pick(uwep);
    const verb = (!uwep || is_pick(uwep)) ? "dig into" : "chop through";
    let dcresult = DIGCHECK_PASSED;

    lev = g.level.at(dpx, dpy);
    /* perhaps a nymph stole your pick-axe while you were busy digging */
    /* or perhaps you teleported away */
    if (u.uswallow || !uwep || (!ispick && !is_axe(uwep))
        || !on_level(digging.level, u.uz)
        || ((digging.down ? (dpx !== u.ux || dpy !== u.uy)
                          : !next2u(dpx, dpy))))
        return 0;

    if (digging.down) {
        dcresult = dig_check(BY_YOU(), u.ux, u.uy);
        if (dcresult >= DIGCHECK_FAILED) {
            await digcheck_fail_message(dcresult, BY_YOU(), u.ux, u.uy);
            return 0;
        }
    } else { /* !digging.down */
        if (IS_TREE(lev.typ) && !may_dig(dpx, dpy)
            && dig_typ(uwep, dpx, dpy) === DIGTYP_TREE) {
            await pline("This tree seems to be petrified.");
            return 0;
        }
        if (IS_OBSTRUCTED(lev.typ) && !may_dig(dpx, dpy)
            && dig_typ(uwep, dpx, dpy) === DIGTYP_ROCK) {
            await pline(`This ${is_db_wall(dpx, dpy) ? "drawbridge" : "wall"} is too hard to ${verb}.`);
            return 0;
        }
    }
    if (Fumbling() && !rn2(3)) {
        switch (rn2(3)) {
        case 0:
            if (!welded(uwep)) {
                await You(`fumble and drop ${yname(uwep)}.`);
                await dropx(uwep);
            } else {
                if (u.usteed)
                    await pline(`${Yobjnam2(uwep, "bounce")} and ${
                        otense(uwep, "hit")} ${mon_nam_zd(u.usteed)}!`);
                else
                    await pline(`Ouch!  ${Yobjnam2(uwep, "bounce")} and ${
                        otense(uwep, "hit")} you!`);
                await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
            }
            break;
        case 1:
            /* Soundeffect(se_bang_weapon_side, 100); */
            await pline(`Bang!  You hit with the broad side of ${
                the(xname_zd(uwep))}!`);
            await wake_nearby(false);
            break;
        default:
            await Your("swing misses its mark.");
            break;
        }
        return 0;
    }

    digging.effort +=
        10 + rn2(5) + abon() + uwep.spe - greatest_erosion(uwep) + (u.udaminc || 0);
    if (Race_if(PM_DWARF))
        digging.effort *= 2;
    if (digging.down) {
        const ttmp = t_at(dpx, dpy);

        if (digging.effort > 250
            || (ttmp && ttmp.ttyp === HOLE)) {
            await dighole(false, false, null);
            clear_digging();
            return 0; /* done with digging */
        }

        if (digging.effort <= 50
            || (ttmp && (ttmp.ttyp === TRAPDOOR || is_pit(ttmp.ttyp)))) {
            return 1;
        } else if (ttmp && (ttmp.ttyp === LANDMINE
                            || (ttmp.ttyp === BEAR_TRAP && !u.utrap))) {
            /* digging onto a set object trap triggers it;
               hero should have used #untrap first */
            await dotrap(ttmp, FORCETRAP);
            /* restart completely from scratch if we resume digging */
            clear_digging();
            return 0;
        } else if (ttmp && ttmp.ttyp === BEAR_TRAP && u.utrap) {
            if (rnl(7) > (Fumbling() ? 1 : 4)) {
                let kbuf;
                let dmg = dmgval(uwep, g.youmonst) + dbon();

                if (dmg < 1)
                    dmg = 1;
                else if (g.uarmf)
                    dmg = Math.trunc((dmg + 1) / 2);
                await You(`hit yourself in the ${body_part_zd(FOOT)}.`);
                kbuf = `chopping off ${uhis()} own ${body_part_zd(FOOT)}`;
                await losehp_zd(Maybe_Half_Phys_zd(dmg), kbuf, KILLED_BY);
            } else {
                await You(`destroy the bear trap with ${yobjnam(uwep, null)}.`);
                deltrap(ttmp);
                await reset_utrap(true); /* release from trap, maybe Lev or Fly */
            }
            /* we haven't made any progress toward a pit yet */
            digging.effort = 0;
            return 0;
        } else if (ttmp && dcresult === DIGCHECK_PASSED_DESTROY_TRAP) {
            const ttmpname = trapname(ttmp.ttyp, false);

            if (ispick)
                await You(`destroy ${ttmp.tseen ? the(ttmpname) : an(ttmpname)} with ${
                    yobjnam(uwep, null)}.`);
            deltrap(ttmp);
            /* we haven't made any progress toward a pit yet */
            digging.effort = 0;
            return 0;
        }

        if (IS_ALTAR(lev.typ)) {
            await altar_wrath(dpx, dpy);
            await angry_priest();
        }

        /* make pit at <u.ux,u.uy> */
        if (await dighole(true, false, null)) {
            digging.level.dnum = 0;
            digging.level.dlevel = -1;
        }
        return 0;
    }

    if (digging.effort > 100) {
        let digtxt, dmgtxt = null;
        let obj, bobj;
        const shopedge = !!in_rooms(dpx, dpy, SHOPBASE).length;
        const digtyp = dig_typ(uwep, dpx, dpy);
        let cleanup = false; /* goto cleanup */

        if (digtyp === DIGTYP_STATUE
            && (obj = sobj_at(STATUE, dpx, dpy)) != null) {
            if (await break_statue(obj))
                digtxt = "The statue shatters.";
            else
                /* it was a statue trap; break_statue()
                   printed a message and updated the screen */
                digtxt = null;
        } else if (digtyp === DIGTYP_BOULDER
                   && (obj = sobj_at(BOULDER, dpx, dpy)) != null) {
            await fracture_rock(obj);
            /*[5.0: this probably isn't necessary anymore]*/
            if ((bobj = sobj_at(BOULDER, dpx, dpy)) != null) {
                /* another boulder here, restack it to the top */
                mkobj_obj_extract_self(bobj);
                place_object(bobj, dpx, dpy);
            }
            digtxt = "The boulder falls apart.";
        } else if (lev.typ === STONE_DG || lev.typ === SCORR
                   || IS_TREE(lev.typ)) {
            if (Is_earthlevel(u.uz)) {
                if (uwep.blessed && !rn2(3)) {
                    await mkcavearea(false);
                    cleanup = true;
                } else if ((uwep.cursed && !rn2(4))
                           || (!uwep.blessed && !rn2(6))) {
                    await mkcavearea(true);
                    cleanup = true;
                }
            }
            if (!cleanup) {
                if (digtyp === DIGTYP_TREE) {
                    digtxt = "You cut down the tree.";
                    lev.typ = ROOM, lev.flags = 0;
                    if (!rn2(5))
                        rnd_treefruit_at(dpx, dpy);
                    if (Race_if(PM_ELF) || Role_if(PM_RANGER))
                        adjalign(-1);
                } else {
                    digtxt = "You succeed in cutting away some rock.";
                    lev.typ = CORR, lev.flags = 0;
                }
            }
        } else if (IS_WALL(lev.typ)) {
            if (shopedge) {
                add_damage(dpx, dpy, SHOP_WALL_DMG());
                dmgtxt = "damage";
            }
            if (g.level.flags.is_maze_lev) {
                lev.typ = ROOM, lev.flags = 0;
            } else if (g.level.flags.is_cavernous_lev
                       && !in_town(dpx, dpy)) {
                lev.typ = CORR, lev.flags = 0;
            } else {
                lev.typ = DOOR, lev.doormask = D_NODOOR;
            }
            digtxt = "You make an opening in the wall.";
        } else if (lev.typ === SDOOR) {
            cvt_sdoor_to_door(lev); /* ->typ = DOOR */
            digtxt = "You break through a secret door!";
            if (!(lev.doormask & D_TRAPPED))
                lev.doormask = D_BROKEN;
        } else if (closed_door(dpx, dpy)) {
            digtxt = `You break through the door with your ${simpleonames(uwep)}.`;
            if (shopedge) {
                add_damage(dpx, dpy, SHOP_DOOR_COST);
                dmgtxt = "break";
            }
            if (!(lev.doormask & D_TRAPPED))
                lev.doormask = D_BROKEN;
        } else
            return 0; /* statue or boulder got taken */

        if (!cleanup) {
            if (!does_block(dpx, dpy, g.level.at(dpx, dpy)))
                unblock_point(dpx, dpy); /* vision:  can see through */
            feel_newsym(dpx, dpy);
            if (digtxt && !digging.quiet)
                await pline(digtxt); /* after newsym */
            if (dmgtxt)
                await pay_for_damage(dmgtxt, false);

            if (Is_earthlevel(u.uz) && !rn2(3)) {
                const mndx = rn2(2) ? PM_EARTH_ELEMENTAL : PM_XORN;

                if (makemon(mons_zd[mndx], dpx, dpy, MM_NOMSG))
                    await pline_The("debris from your digging comes to life!");
            }
            if (IS_DOOR(lev.typ) && (lev.doormask & D_TRAPPED)) {
                lev.doormask = D_NODOOR;
                await b_trapped("door", NO_PART);
                recalc_block_point(dpx, dpy);
                newsym(dpx, dpy);
            }
        }
        /* cleanup: */
        digging.lastdigtime = g.moves;
        digging.quiet = false;
        digging.level.dnum = 0;
        digging.level.dlevel = -1;
        return 0;
    } else { /* not enough effort has been spent yet */
        const d_target = [ "",        "rock", "statue",
                           "boulder", "door", "tree" ];
        const dig_target = dig_typ(uwep, dpx, dpy);

        if (IS_WALL(lev.typ) || dig_target === DIGTYP_DOOR) {
            if (in_rooms(dpx, dpy, SHOPBASE).length) {
                await pline(`This ${IS_DOOR(lev.typ) ? "door" : "wall"} seems too hard to ${verb}.`);
                return 0;
            }
        } else if (dig_target === DIGTYP_UNDIGGABLE
                   || (dig_target === DIGTYP_ROCK && !IS_OBSTRUCTED(lev.typ)))
            return 0; /* statue or boulder got taken */

        if (!g.did_dig_msg) {
            await You(`hit the ${d_target[dig_target]} with all your might.`);
            await wake_nearby(false);
            g.did_dig_msg = true;
        }
    }
    return 1;
}

// C ref: dig.c furniture_handled()
async function furniture_handled(x, y, madeby_u) {
    const lev = game.level.at(x, y);

    if (IS_FOUNTAIN(lev.typ)) {
        await dogushforth(false);
        lev.flags = (lev.flags || 0) | F_WARNED; /* SET_FOUNTAIN_WARNED(x, y): force dryup */
        await dryup(x, y, madeby_u);
    } else if (IS_SINK(lev.typ)) {
        await breaksink(x, y);
    } else if (lev.typ === DRAWBRIDGE_DOWN
               || (is_drawbridge_wall(x, y) >= 0)) {
        let bx = x, by = y;

        /* if under the portcullis, the bridge is adjacent */
        const db = find_drawbridge(bx, by);
        if (db)
            bx = db.x, by = db.y;
        await destroy_drawbridge(bx, by);
    } else {
        return false;
    }
    return true;
}

// C ref: dig.c holetime()
/* When will hole be finished? Very rough indication used by shopkeeper. */
export function holetime() {
    if (game.occupation !== dig || !(game.u.ushops || '').length)
        return -1;
    return Math.trunc((250 - digging_ctx().effort) / 20);
}

// C ref: dig.c digactualhole()
export async function digactualhole(x, y, madeby, ttyp) {
    const g = game, u = g.u;
    let oldobjs, newobjs;
    let ttmp;
    let surface_type, tname, in_thru;
    let furniture = '';
    const lev = g.level.at(x, y);
    const mtmp = m_at(x, y); /* may be madeby */
    const madeby_u = (madeby === BY_YOU()), madeby_obj = (madeby === BY_OBJECT),
        /* BY_OBJECT means the hero broke a wand, so blame her for it */
        heros_fault = (madeby_u || madeby_obj);
    let shopdoor;
    const at_u = u_at(x, y);
    let wont_fall = Levitation() || Flying();
    let old_typ, old_aligntyp = A_NONE;

    if (at_u && u.utrap) {
        if (u.utraptype === TT_BURIEDBALL)
            await buried_ball_to_punishment();
        else if (u.utraptype === TT_INFLOOR)
            await reset_utrap(false);
    }

    if (await furniture_handled(x, y, madeby_u))
        return;

    if (ttyp !== PIT && (!Can_dig_down(u.uz) && !lev.candig)) {
        /* impossible("digactualhole: can't dig %s on this level.") */
        ttyp = PIT;
    }

    /* maketrap() might change terrain type but we deliver messages after
       that, so prepare in advance */
    old_typ = lev.typ;
    if (IS_FURNITURE(lev.typ)) {
        /* should mirror the word used by surface() for normal floor */
        surface_type = (IS_ROOM(lev.typ) && !Is_earthlevel(u.uz)
                        ? "floor" : "ground");
        if (IS_ALTAR(lev.typ)) {
            old_aligntyp = Amask2align(lev.altarmask & AM_MASK);
            furniture = align_str(old_aligntyp);
            furniture += " ";
        }
        furniture += surface(x, y);
    } else {
        surface_type = surface(x, y);
    }
    shopdoor = IS_DOOR(lev.typ) && !!in_rooms(x, y, SHOPBASE).length;
    oldobjs = level_objects_at_dg(x, y)[0] || null;

    ttmp = maketrap(x, y, ttyp);
    if (!ttmp)
        return;
    newobjs = level_objects_at_dg(x, y)[0] || null;
    ttmp.madeby_u = heros_fault;
    ttmp.tseen = 0;
    if (cansee(x, y))
        seetrap(ttmp);
    else if (madeby_u)
        feeltrap(ttmp);

    tname = trapname(ttyp, true);
    in_thru = (ttyp === HOLE ? "through" : "in");
    if (madeby_u) {
        if (x !== u.ux || y !== u.uy)
            await You(`dig an adjacent ${tname}.`);
        else
            await You(`dig ${an(tname)} ${in_thru} the ${surface_type}.`);
    } else if (!madeby_obj && canseemon(madeby)) {
        await pline(`${Monnam(madeby)} digs ${an(tname)} ${in_thru} the ${
            surface_type}.`);
    } else if (cansee(x, y) && g.flags.verbose) {
        if (IS_STWALL(old_typ))
            await pline_The(`${surface_type} crumbles into ${an(tname)}.`);
        else
            await pline(`${An(tname)} appears in the ${surface_type}.`);
    }
    if (IS_FURNITURE(old_typ) && cansee(x, y))
        await pline_The(`${furniture} falls into the ${tname}!`);
    /* wrath should immediately follow altar destruction message */
    if (heros_fault && old_typ === ALTAR)
        await desecrate_altar(false, old_aligntyp);

    /* now deal with actual post-trap creation effects */
    if (ttyp === PIT) {
        if (shopdoor && heros_fault)
            await pay_for_damage("ruin", false);
        else
            add_damage(x, y, heros_fault ? SHOP_PIT_COST : 0);
        if (madeby_u)
            await wake_nearby(false);
        /* in case we're digging down while encased in solid rock
           which is blocking levitation or flight */
        await switch_terrain();
        if (Levitation() || Flying())
            wont_fall = true;

        if (at_u) {
            if (!wont_fall) {
                set_utrap(rn1(4, 2), TT_PIT);
                g.vision_full_recalc = 1; /* vision limits change */
            } else
                await reset_utrap(true);
            if (oldobjs !== newobjs) /* something unearthed */
                await pickup(1);     /* detects pit */
        } else if (mtmp) {
            if (is_flyer(mtmp.data) || is_floater(mtmp.data)) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} ${
                        (is_flyer(mtmp.data)) ? "flies" : "floats"} over the pit.`);
            } else if (mtmp !== madeby)
                await mintrap(mtmp, NO_TRAP_FLAGS);
        }
    } else { /* was TRAPDOOR now a HOLE*/
        if (at_u) {
            /* in case we're digging down while encased in solid rock
               which is blocking levitation or flight */
            await switch_terrain();
            if (Levitation() || Flying())
                wont_fall = true;

            /* check for leashed pet that can't fall right now */
            if (!u.ustuck && !wont_fall && !(await next_to_u())) {
                await You("are jerked back by your pet!");
                wont_fall = true;
            }

            /* Floor objects get a chance of falling down.  The case where
             * the hero does NOT fall down is treated here.  The case
             * where the hero does fall down is treated in goto_level().
             */
            if (u.ustuck || wont_fall) {
                if (newobjs)
                    await impact_drop(null, x, y, 0);
                if (oldobjs !== newobjs)
                    await pickup(1);
                if (shopdoor && heros_fault)
                    await pay_for_damage("ruin", false);
            } else {
                const newlevel = { dnum: 0, dlevel: 0 };

                if ((u.ushops || '').length && heros_fault)
                    await shopdig(1); /* shk might snatch pack */
                else /* handle any earlier hero-caused damage */
                    await pay_for_damage("dig into", true);
                await You("fall through...");
                /* Earlier checks must ensure that the destination
                 * level exists and is in the present dungeon.
                 */
                newlevel.dnum = u.uz.dnum;
                newlevel.dlevel = u.uz.dlevel + 1;
                await goto_level(newlevel, false, true, false);
                /* messages for arriving in special rooms */
                await spoteffects(false);
            }
        } else {
            if (shopdoor && heros_fault)
                await pay_for_damage("ruin", false);
            if (newobjs)
                await impact_drop(null, x, y, 0);
            if (mtmp) {
                /*[don't we need special sokoban handling here?]*/
                if (!grounded(mtmp.data)
                    || (mtmp.wormno && count_wsegs(mtmp) > 5)
                    || mtmp.data.msize >= MZ_HUGE)
                    return;
                if (mtmp === u.ustuck) /* probably a vortex */
                    return;            /* temporary? kludge */

                if (await teleport_pet(mtmp, false)) {
                    const tolevel = { dnum: 0, dlevel: 0 };

                    if (Is_stronghold(u.uz)) {
                        assign_level(tolevel, g.dungeon_topology.d_valley_level);
                    } else if (Is_botlevel(u.uz)) {
                        if (canseemon(mtmp))
                            await pline(`${Monnam(mtmp)} avoids the trap.`);
                        return;
                    } else {
                        get_level(tolevel, depth(u.uz) + 1);
                    }
                    if (mtmp.isshk)
                        await make_angry_shk(mtmp, 0, 0);
                    await migrate_to_level(mtmp, ledger_no(tolevel),
                                     MIGR_RANDOM, null);
                }
            }
        }
    }
}

// C ref: dig.c dighole()
/* return TRUE if digging succeeded, FALSE otherwise */
export async function dighole(pit_only, by_magic, cc) {
    const u = game.u;
    let ttmp;
    let lev;
    let boulder_here;
    let typ, old_typ;
    let dig_x, dig_y;
    let nohole, retval = false;
    let dig_check_result;

    if (!cc) {
        dig_x = u.ux;
        dig_y = u.uy;
    } else {
        dig_x = cc.x;
        dig_y = cc.y;
        if (!isok(dig_x, dig_y))
            return false;
    }

    ttmp = t_at(dig_x, dig_y);
    lev = game.level.at(dig_x, dig_y);
    dig_check_result = dig_check(BY_YOU(), dig_x, dig_y);
    /* nohole = (!Can_dig_down(&u.uz) && !lev->candig); */
    nohole = (dig_check_result === DIGCHECK_FAIL_CANTDIG
              || dig_check_result === DIGCHECK_FAIL_TOOHARD);
    old_typ = lev.typ;

    if ((ttmp && (undestroyable_trap(ttmp.ttyp) || nohole))
        || (IS_OBSTRUCTED(old_typ) && old_typ !== SDOOR
            && ((lev.wall_info || 0) & W_NONDIGGABLE) !== 0)) {
        await pline_The(`${surface(dig_x, dig_y)} ${
            (dig_x !== u.ux || dig_y !== u.uy) ? "t" : ""}here is too hard to dig in.`);
    } else if (ttmp && is_magical_trap(ttmp.ttyp)) {
        await explode(dig_x, dig_y, 0, 20 + d(3, 6), TRAP_EXPLODE, EXPL_MAGICAL);
        deltrap(ttmp);
        newsym(dig_x, dig_y);
    } else if (is_pool_or_lava_dg(dig_x, dig_y)) {
        await pline_The(`${hliquid_dg(is_lava_dg(dig_x, dig_y) ? "lava" : "water")
            } sloshes furiously for a moment, then subsides.`);
        await wake_nearby(false); /* splashing */

    } else if (old_typ === DRAWBRIDGE_DOWN
               || (is_drawbridge_wall(dig_x, dig_y) >= 0)) {
        /* drawbridge_down is the platform crossing the moat when the
           bridge is extended; drawbridge_wall is the open "doorway" or
           closed "door" where the portcullis/mechanism is located */
        if (pit_only) {
            await pline_The("drawbridge seems too hard to dig through.");
        } else {
            let x = dig_x, y = dig_y;
            /* if under the portcullis, the bridge is adjacent */
            const db = find_drawbridge(x, y);
            if (db)
                x = db.x, y = db.y;
            await destroy_drawbridge(x, y);
            retval = true;
        }

    } else if ((boulder_here = sobj_at(BOULDER, dig_x, dig_y)) != null) {
        if (ttmp && is_pit(ttmp.ttyp)
            && rn2(2)) {
            await pline_The(`boulder settles into the ${
                (dig_x !== u.ux || dig_y !== u.uy) ? "adjacent " : ""}pit.`);
            ttmp.ttyp = PIT; /* crush spikes */
        } else {
            /*
             * digging makes a hole, but the boulder immediately
             * fills it.  Final outcome:  no hole, no boulder.
             */
            /* Soundeffect(se_kadoom_boulder_falls_in, 60); */
            await pline("KADOOM!  The boulder falls in!");
            await wake_nearby(false);
            await delfloortrap_dg(ttmp);
        }
        delobj(boulder_here);
    } else if (IS_GRAVE(old_typ)) {
        await digactualhole(dig_x, dig_y, BY_YOU(), PIT);
        await dig_up_grave(cc);
        retval = true;
    } else if (old_typ === DRAWBRIDGE_UP) {
        /* must be floor or ice, other cases handled above */
        /* dig "pit" and let fluid flow in (if possible) */
        typ = fillholetyp(dig_x, dig_y, false);

        if (typ === ROOM) {
            /*
             * We can't dig a hole here since that will destroy
             * the drawbridge.  The following is a cop-out. --dlc
             */
            await pline_The(`${surface(dig_x, dig_y)} ${
                (dig_x !== u.ux || dig_y !== u.uy) ? "t" : ""}here is too hard to dig in.`);
        } else {
            lev.drawbridgemask &= ~DB_UNDER;
            lev.drawbridgemask |= (typ === LAVAPOOL_DG) ? DB_LAVA : DB_MOAT;
            await liquid_flow(dig_x, dig_y, typ, ttmp,
                              "As you dig, the hole fills with %s!");
            retval = true;
        }

    /* the following two are here for the wand of digging */
    } else if (IS_THRONE(old_typ)) {
        await pline_The("throne is too hard to break apart.");

    } else if (IS_ALTAR(old_typ)) {
        await pline_The("altar is too hard to break apart.");

    } else {
        typ = fillholetyp(dig_x, dig_y, false);

        lev.flags = 0;
        if (typ !== ROOM) {
            if (!(await furniture_handled(dig_x, dig_y, true))) {
                lev.typ = typ;
                await liquid_flow(dig_x, dig_y, typ, ttmp,
                                  "As you dig, the hole fills with %s!");
            }
            retval = true;
        } else {
            /* magical digging disarms settable traps */
            if (by_magic && ttmp
                && (ttmp.ttyp === LANDMINE || ttmp.ttyp === BEAR_TRAP)) {
                const otyp = (ttmp.ttyp === LANDMINE) ? LAND_MINE : BEARTRAP;

                /* convert trap into buried object (deletes trap) */
                await cnv_trap_obj(otyp, 1, ttmp, true);
            }

            /* finally we get to make a hole */
            if (nohole || pit_only
                || dig_check_result === DIGCHECK_PASSED_DESTROY_TRAP
                || dig_check_result === DIGCHECK_PASSED_PITONLY)
                await digactualhole(dig_x, dig_y, BY_YOU(), PIT);
            else
                await digactualhole(dig_x, dig_y, BY_YOU(), HOLE);
            retval = true;
        }
    }
    spot_checks(dig_x, dig_y, old_typ);
    return retval;
}

// C ref: dig.c dig_up_grave()
async function dig_up_grave(cc) {
    const u = game.u;
    let otmp;
    let what_happens;
    let dig_x, dig_y;

    if (!cc) {
        dig_x = u.ux;
        dig_y = u.uy;
    } else {
        dig_x = cc.x;
        dig_y = cc.y;
        if (!isok(dig_x, dig_y))
            return;
    }

    /* Grave-robbing is frowned upon... */
    await exercise(A_WIS, false);
    if (Role_if(PM_ARCHEOLOGIST)) {
        adjalign(-Math.sign(u.ualign.type) * 3);
        await You_feel("like a despicable grave-robber!");
    } else if (Role_if(PM_SAMURAI)) {
        adjalign(-Math.sign(u.ualign.type));
        await You("disturb the honorable dead!");
    } else if (u.ualign.type === A_LAWFUL) {
        if (u.ualign.record > -10)
            adjalign(-1);
        await You("have violated the sanctity of this grave!");
    }

    /* -1: force default case for empty grave */
    what_happens = game.level.at(dig_x, dig_y).emptygrave ? -1 : rn2(5);
    switch (what_happens) {
    case 0:
    case 1:
        await You("unearth a corpse.");
        if ((otmp = mk_tt_object(CORPSE, dig_x, dig_y)) != null)
            otmp.age -= (TAINT_AGE + 1); /* this is an *OLD* corpse */
        break;
    case 2:
        if (!Blind_dg())
            await pline(`${Hallucination() ? "Dude!  The living dead"
                                           : "The grave's owner is very upset"}!`);
        makemon(mkclass(S_ZOMBIE, 0), dig_x, dig_y, MM_NOMSG);
        break;
    case 3:
        if (!Blind_dg())
            await pline(`${Hallucination() ? "I want my mummy"
                                           : "You've disturbed a tomb"}!`);
        makemon(mkclass(S_MUMMY, 0), dig_x, dig_y, MM_NOMSG);
        break;
    default:
        /* No corpse */
        await pline_The("grave is unoccupied.  Strange...");
        break;
    }
    game.level.at(dig_x, dig_y).typ = ROOM;
    game.level.at(dig_x, dig_y).emptygrave = 0; /* clear 'flags' */
    game.level.at(dig_x, dig_y).disturbed = 0; /* clear 'horizontal' */
    del_engr_at(dig_x, dig_y);
    newsym(dig_x, dig_y);
    return;
}

// C ref: dig.c adj_pit_checks()
/*
 * This checks what is on the surface above the
 * location where an adjacent pit might be created if
 * you're zapping a wand of digging laterally while
 * down in the pit.  msg is {v: ''}; returns the message in msg.v.
 */
function adj_pit_checks(cc, msg) {
    let ltyp;
    let room;
    const foundation_msg =
        "The foundation is too hard to dig through from this angle.";

    if (!cc)
        return false;
    if (!isok(cc.x, cc.y))
        return false;
    msg.v = '';
    room = game.level.at(cc.x, cc.y);
    ltyp = room.typ, room.flags = 0;

    if (is_pool_dg(cc.x, cc.y) || is_lava_dg(cc.x, cc.y)) {
        /* this is handled by the caller after we return FALSE */
        return false;
    } else if (closed_door(cc.x, cc.y) || room.typ === SDOOR) {
        /* We reject this here because dighole() isn't
           prepared to deal with this case */
        msg.v = foundation_msg;
        return false;
    } else if (IS_WALL(ltyp)) {
        /* if (room->wall_info & W_NONDIGGABLE) */
        msg.v = foundation_msg;
        return false;
    } else if (IS_TREE(ltyp)) { /* check trees before stone */
        /* if (room->wall_info & W_NONDIGGABLE) */
        msg.v = "The tree's roots glow then fade.";
        return false;
    } else if (ltyp === STONE_DG || ltyp === SCORR) {
        if ((room.wall_info || 0) & W_NONDIGGABLE) {
            msg.v = "The rock glows then fades.";
            return false;
        }
    } else if (ltyp === IRONBARS) {
        /* "set of iron bars" */
        msg.v = "The bars go much deeper than your pit.";
        return false;
    } else if (IS_SINK(ltyp)) {
        msg.v = "A tangled mass of plumbing remains below the sink.";
        return false;
    } else if (On_ladder(cc.x, cc.y)) {
        msg.v = "The ladder is unaffected.";
        return false;
    } else {
        let supporting = null;

        if (IS_FOUNTAIN(ltyp))
            supporting = "fountain";
        else if (IS_THRONE(ltyp))
            supporting = "throne";
        else if (IS_ALTAR(ltyp))
            supporting = "altar";
        else if (On_stairs(cc.x, cc.y))
            /* staircase up or down. On_ladder handled above. */
            supporting = "stairs";
        else if (ltyp === DRAWBRIDGE_DOWN   /* "lowered drawbridge" */
                 || ltyp === DBWALL)        /* "raised drawbridge" */
            supporting = "drawbridge";

        if (supporting) {
            msg.v = `The ${s_suffix_zd(supporting)} supporting structures remain intact.`;
            return false;
        }
    }
    return true;
}

/* C ref: stairs.c On_ladder() */
function On_ladder(x, y) {
    const sway = stairway_at_zd(x, y);
    return !!(sway && sway.isladder);
}

// C ref: dig.c pit_flow()
/*
 * Ensure that all conjoined pits fill up.
 */
async function pit_flow(trap, filltyp) {
    /*
     * FIXME?
     *  liquid_flow() -> pooleffects() -> {drown(),lava_effects()}
     *  might kill the hero; the game will end and if that leaves bones,
     *  remaining conjoined pits will be left unprocessed.
     */
    if (trap && filltyp !== ROOM && is_pit(trap.ttyp)) {
        let idx;
        /* t = *trap; */
        const t = { tx: trap.tx, ty: trap.ty, conjoined: trap.conjoined || 0 };

        game.level.at(t.tx, t.ty).typ = filltyp, game.level.at(t.tx, t.ty).flags = 0;
        await liquid_flow(t.tx, t.ty, filltyp, trap,
                          u_at(t.tx, t.ty)
                              ? "Suddenly %s flows in from the adjacent pit!"
                              : null);
        for (idx = 0; idx < N_DIRS; ++idx) {
            if (t.conjoined & (1 << idx)) {
                let x, y;
                let t2;

                x = t.tx + xdir[idx];
                y = t.ty + ydir[idx];
                t2 = t_at(x, y);
                /* recursion */
                await pit_flow(t2, filltyp);
            }
        }
    }
}

// C ref: dig.c use_pick_axe()
export async function use_pick_axe(obj) {
    const u = game.u;
    let verb;
    let dirsyms = '', qbuf;
    let ispick;
    let rx, ry, downok, res = ECMD_OK;
    let dir;

    /* Check tool */
    if (obj !== game.uwep) {
        if (await wield_tool(obj, "swing")) {
            /* we're now wielding it. next turn, apply to dig. */
            /* cmdq_add_ec(CQ_CANNED, doapply);
               cmdq_add_key(CQ_CANNED, obj->invlet); */
            if (!game.cmdq) game.cmdq = [];
            game.cmdq.push({ typ: 'ec', fn: 'doapply' });
            game.cmdq.push({ typ: 'key', key: obj.invlet });
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    ispick = is_pick(obj);
    verb = ispick ? "dig" : "chop";

    if (u.utrap && u.utraptype === TT_WEB) {
        /* res==0 => no prior message;
           res==1 => just got "You now wield a pick-axe." message */
        await pline(`${!res ? "Unfortunately," : "But"} you can't ${verb} while entangled in a web.`);
        return res;
    }

    /* construct list of directions to show player for likely choices */
    downok = !!can_reach_floor(false);
    for (dir = 0; dir < N_DIRS_Z; dir++) {
        const dirch = cmd_from_dir(dir, MV_WALK);

        /* filter out useless directions */
        if (u.uswallow) {
            ; /* all directions are viable when swallowed */
        } else if (movecmd_mode(dirch, MV_WALK)) {
            /* normal direction, within plane of the level map */
            if (!dxdy_moveok())
                continue; /* handle NODIAG */
            rx = u.ux + u.dx;
            ry = u.uy + u.dy;
            if (!isok(rx, ry) || dig_typ(obj, rx, ry) === DIGTYP_UNDIGGABLE)
                continue;
        } else {
            /* up or down; we used to always include down, so that
               there would always be at least one choice shown, but
               it shouldn't be a likely candidate when floating high
               above the floor; include up instead in that situation
               (as a silly candidate rather than a likely one...) */
            if ((u.dz > 0) !== downok)
                continue;
        }
        /* include this direction */
        dirsyms += String.fromCharCode(dirch);
    }
    qbuf = `In what direction do you want to ${verb}? [${dirsyms}]`;
    if (!(await getdir(qbuf)))
        return (res | ECMD_CANCEL);

    return await use_pick_axe2(obj);
}

// C ref: dig.c use_pick_axe2()
/* MRKR: use_pick_axe() is split in two to allow autodig to bypass */
/*       the "In what direction do you want to dig?" query.        */
/*       use_pick_axe2() uses the existing u.dx, u.dy and u.dz    */
export async function use_pick_axe2(obj) {
    const u = game.u;
    let rx, ry;
    let lev;
    let trap, trap_with_u;
    let dig_target;
    const ispick = is_pick(obj);
    const verbing = ispick ? "digging" : "chopping";

    if (u.uswallow && (await do_attack(u.ustuck))) {
        ; /* return 1 */
    } else if (u.uinwater) { /* Underwater */
        await pline(`Turbulence torpedoes your ${verbing} attempts.`);
    } else if (u.dz < 0) {
        if (Levitation())
            await You_zd("don't have enough leverage.");
        else
            await You_cant(`reach the ${ceiling_zd(u.ux, u.uy)}.`);
    } else if (!u.dx && !u.dy && !u.dz) {
        let buf;
        let dam;

        dam = rnd(2) + dbon() + obj.spe;
        if (dam <= 0)
            dam = 1;
        await You_zd(`hit yourself with ${yname(game.uwep)}.`);
        buf = `${uhis()} own ${
            OBJ_NAME(objects[obj.otyp])}`;
        await losehp_zd(Maybe_Half_Phys_zd(dam), buf, KILLED_BY);
        game.disp_botl = true;
        return ECMD_TIME;
    } else if (u.dz === 0) {
        confdir(false);
        rx = u.ux + u.dx;
        ry = u.uy + u.dy;
        if (!isok(rx, ry)) {
            /* Soundeffect(se_clash, 40); */
            await pline("Clash!");
            return ECMD_TIME;
        }
        lev = game.level.at(rx, ry);
        if (m_at(rx, ry) && (await do_attack(m_at(rx, ry))))
            return ECMD_TIME;
        dig_target = dig_typ(obj, rx, ry);
        if (dig_target === DIGTYP_UNDIGGABLE) {
            let boulder;

            /* ACCESSIBLE or POOL */
            trap = t_at(rx, ry);
            if (trap && trap.ttyp === WEB) {
                if (!trap.tseen) {
                    seetrap(trap);
                    await There("is a spider web there!");
                }
                await pline(`${Yobjnam2(obj, "become")} entangled in the web.`);
                /* you ought to be able to let go; tough luck */
                /* (maybe `move_into_trap()' would be better) */
                nomul(-d(2, 2));
                game.multi_reason = "stuck in a spider web";
                game.nomovemsg = "You pull free.";
            } else if (lev.typ === IRONBARS) {
                await pline("Clang!");
                await wake_nearby(false);
            } else if (IS_WATERWALL(lev.typ)) {
                await pline("Splash!");
            } else if (lev.typ === LAVAWALL) {
                await pline("Splash!");
                await fire_damage(game.uwep, false, rx, ry);
            } else if (IS_TREE(lev.typ)) {
                await You_zd("need an axe to cut down a tree.");
            } else if (IS_OBSTRUCTED(lev.typ)) {
                await You_zd("need a pick to dig rock.");
            } else if ((boulder = sobj_at(BOULDER, rx, ry)) != null
                       || sobj_at(STATUE, rx, ry)) {
                /* if both boulders and statues are present, the topmost
                   boulder will be shown on the map so treat it as target */
                const what = boulder ? "boulder" : "statue";

                if (!ispick) {
                    const vibrate = !rn2(3);

                    await pline(`Sparks fly as you whack the ${what}.${
                        vibrate ? "  The axe-handle vibrates violently!" : ""}`);
                    if (vibrate)
                        await losehp_zd(Maybe_Half_Phys_zd(2),
                                        "axing a hard object", KILLED_BY);
                    await wake_nearby(false);
                } else {
                    /* using a pick but dig_target is DIGTYPE_UNDIGGABLE
                       and there is at least one boulder or statue or both
                       present; pick_can_reach() returned false */
                    await You_cant(`reach the ${what}.`);
                }
            } else if (u.utrap && u.utraptype === TT_PIT && trap
                       && (trap_with_u = t_at(u.ux, u.uy))
                       && is_pit(trap.ttyp)
                       && !conjoined_pits(trap, trap_with_u, false)) {
                const idx = xytodir(u.dx, u.dy);

                if (idx !== DIR_ERR) {
                    const adjidx = DIR_180(idx);

                    trap_with_u.conjoined |= (1 << idx);
                    trap.conjoined |= (1 << adjidx);
                    await You_zd("clear some debris from between the pits.");
                }
            } else if (u.utrap && u.utraptype === TT_PIT
                       && (trap_with_u = t_at(u.ux, u.uy)) != null) {
                await You_zd(`swing ${yobjnam(obj, null)}, but the rubble has no place to go.`);
            } else {
                await You_zd(`swing ${yobjnam(obj, null)} through thin air.`);
            }
        } else {
            const d_action = [ "swinging", "digging",
                               "chipping the statue",
                               "hitting the boulder",
                               "chopping at the door",
                               "cutting the tree" ];
            const digging = digging_ctx();

            game.did_dig_msg = false;
            digging.quiet = false;
            if (digging.pos.x !== rx
                || digging.pos.y !== ry
                || !on_level(digging.level, u.uz)
                || digging.down) {
                if (game.flags.autodig && dig_target === DIGTYP_ROCK
                    && !digging.down
                    && u_at(digging.pos.x, digging.pos.y)
                    && (game.moves <= digging.lastdigtime + 2
                        && game.moves >= digging.lastdigtime)) {
                    /* avoid messages if repeated autodigging */
                    game.did_dig_msg = true;
                    digging.quiet = true;
                }
                digging.down = digging.chew = false;
                digging.warned = false;
                digging.pos.x = rx;
                digging.pos.y = ry;
                assign_level(digging.level, u.uz);
                digging.effort = 0;
                if (!digging.quiet)
                    await You_zd(`start ${d_action[dig_target]}.`);
            } else {
                await You_zd(`${digging.chew ? "begin" : "continue"} ${
                    d_action[dig_target]}.`);
                digging.chew = false;
            }
            set_occupation(dig, verbing, 0);
        }
    } else if (Is_airlevel_zd(u.uz) || Is_waterlevel_zd(u.uz)) {
        /* it must be air -- water checked above */
        await You_zd(`swing ${yobjnam(obj, null)} through thin air.`);
    } else if (!can_reach_floor(false)) {
        await cant_reach_floor(u.ux, u.uy, false, false, false);
    } else if (is_pool_or_lava_dg(u.ux, u.uy)) {
        /* Monsters which swim also happen not to be able to dig */
        await You_zd(`cannot stay under${
            is_pool_dg(u.ux, u.uy) ? "water" : " the lava"} long enough.`);
    } else if ((trap = t_at(u.ux, u.uy)) != null
               && (uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
        await dotrap(trap, FORCEBUNGLE);
        /* might escape trap and still be teetering at brink */
        if (!u.utrap)
            await cant_reach_floor(u.ux, u.uy, false, true, false);
    } else if (!ispick
               /* can only dig down with an axe when doing so will
                  trigger or disarm a trap here */
               && (!trap || (trap.ttyp !== LANDMINE
                             && trap.ttyp !== BEAR_TRAP))) {
        await pline(`${Yobjnam2(obj, null)} merely scratches the ${
            surface(u.ux, u.uy)}.`);
        u_wipe_engr(3);
    } else {
        const digging = digging_ctx();

        if (digging.pos.x !== u.ux
            || digging.pos.y !== u.uy
            || !on_level(digging.level, u.uz)
            || !digging.down) {
            digging.chew = false;
            digging.down = true;
            digging.warned = false;
            digging.pos.x = u.ux;
            digging.pos.y = u.uy;
            assign_level(digging.level, u.uz);
            digging.effort = 0;
            await You_zd(`start ${verbing} downward.`);
            if ((u.ushops || '').length) {
                await shopdig(0);
                add_damage(u.ux, u.uy, SHOP_PIT_COST);
            }
        } else
            await You_zd(`continue ${verbing} downward.`);
        game.did_dig_msg = false;
        set_occupation(dig, verbing, 0);
    }
    return ECMD_TIME;
}
