// dig.js — digging.
// C ref: src/dig.c

import { stolen_value } from './shk.js';
import { destroy_drawbridge } from './dbridge.js';
import { del_engr_at, cant_reach_floor, u_wipe_engr } from './engrave.js';
import { reset_utrap, set_utrap, deltrap, dotrap, seetrap, feeltrap,
         mintrap, grounded, uteetering_at_seen_pit, uescaped_shaft,
         conjoined_pits, fire_damage, fire_damage_chain, water_damage_chain,
         delfloortrap, cnv_trap_obj, b_trapped } from './trap.js';
import { stackobj, sobj_at, obj_extract_self, obfree, currency,
         update_inventory } from './invent.js';
import { place_object, mksobj_at, mk_tt_object, obj_ice_effects } from './mkobj.js';
import { dist2, isok, sgn, s_suffix } from './hacklib.js';
import { COLNO, ROWNO, TT_BURIEDBALL, TT_PIT, TT_WEB, TT_INFLOOR,
         IS_OBSTRUCTED, IS_TREE, IS_WALL, IS_STWALL, IS_DOOR, IS_FURNITURE,
         IS_ROOM, IS_GRAVE, IS_SINK, IS_FOUNTAIN, IS_THRONE, IS_ALTAR,
         IS_DRAWBRIDGE, IS_WATERWALL, SDOOR, SCORR, CORR, ROOM, DOOR, STONE,
         ALTAR, ICE, IRONBARS, LAVAWALL, DBWALL, DRAWBRIDGE_UP,
         DRAWBRIDGE_DOWN, POOL, MOAT, LAVAPOOL, D_NODOOR, D_BROKEN,
         D_TRAPPED, D_LOCKED, D_CLOSED, W_NONDIGGABLE, SHOPBASE,
         SHOP_DOOR_COST, SHOP_WALL_COST, SHOP_PIT_COST, A_STR, A_DEX, A_CON,
         A_CHA, A_INT, A_WIS, A_LAWFUL, A_NONE, Is_earthlevel, Is_airlevel,
         Is_waterlevel, Is_stronghold, Is_botlevel, In_endgame,
         DIGTYP_UNDIGGABLE, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_BOULDER,
         DIGTYP_DOOR, DIGTYP_TREE, DIGCHECK_PASSED, DIGCHECK_PASSED_PITONLY,
         DIGCHECK_PASSED_DESTROY_TRAP, DIGCHECK_FAILED,
         DIGCHECK_FAIL_ONLADDER, DIGCHECK_FAIL_ONSTAIRS, DIGCHECK_FAIL_THRONE,
         DIGCHECK_FAIL_ALTAR, DIGCHECK_FAIL_AIRLEVEL,
         DIGCHECK_FAIL_WATERLEVEL, DIGCHECK_FAIL_TOOHARD,
         DIGCHECK_FAIL_UNDESTROYABLETRAP, DIGCHECK_FAIL_CANTDIG,
         DIGCHECK_FAIL_BOULDER, DIGCHECK_FAIL_OBJ_POOL_OR_TRAP,
         KILLED_BY, KILLED_BY_AN, ECMD_OK, ECMD_TIME, ECMD_CANCEL,
         CQ_CANNED, is_pit, is_hole, is_magical_trap, HOLE, TRAPDOOR, PIT,
         LANDMINE, BEAR_TRAP, WEB, FORCETRAP, FORCEBUNGLE, NO_TRAP_FLAGS,
         NO_PART, FOOT, HEAD, STOMACH, RIGHT_SIDE, AM_MASK, AM_SANCTUM,
         Amask2align, TAINT_AGE, MIGR_RANDOM, RLOC_NOMSG, TRAP_EXPLODE,
         EXPL_MAGICAL, DB_UNDER, DB_LAVA, DB_MOAT, IN_SIGHT, COULD_SEE,
         N_DIRS, N_DIRS_Z, MV_WALK, DIR_ERR, DIR_180, xdir, ydir,
         OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, OBJ_MIGRATING, CXN_NO_PFX,
         TIMER_OBJECT, ROT_ORGANIC, F_WARNED, OBJ_AT } from './const.js';
import { game } from './gstate.js';
import { rn1, rn2, rnd, rnl, d } from './rng.js';
import { newsym, canseemon, display_cmap_at, flush_screen, pline,
         feel_newsym, display_nhwindow_message } from './display.js';
import { You, You_cant, You_feel, You_hear, Your, pline_The, There,
         verbalize } from './pline.js';
import { cansee, does_block, unblock_point, recalc_block_point } from './vision.js';
import { cvt_sdoor_to_door, trapname } from './detect.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { ACURR, exercise, adjalign, Role_if, acurrstr } from './attrib.js';
import { abon, dmgval, setmnotwielded } from './weapon.js';
import { greatest_erosion, hard_helmet } from './do_wear.js';
import { in_rooms, in_town, losehp, may_dig, spoteffects, nomul,
         pooleffects, switch_terrain, spot_checks } from './hack.js';
import { Flying, Hallucination, Levitation, Underwater, Fumbling, Blind,
         Deaf, Unaware } from './youprop.js';
import { can_reach_floor, pickup } from './pickup.js';
import { set_occupation, stop_occupation } from './allmain.js';
import { bimanual, Has_contents } from './obj.js';
import { Race_if } from './u_init.js';
import { dbon, do_attack } from './uhitm.js';
import { is_axe, is_lava, is_pick, is_pool, m_at, t_at, wake_nearby,
         delobj, minliquid, get_iter_mons, angry_guards, maybe_unhide_at }
    from './mon.js';
import { ceiling, surface, Can_dig_down, get_level, ledger_no, depth }
    from './dungeon.js';
import { simpleonames, Yobjnam2, yname, yobjnam, xname, otense, the, an, An,
         corpse_xname } from './objnam.js';
import { PMNAMES, MONSYMS, MFLAGS } from './monst_data.js';
import { cmap_names } from './drawing_data.js';
import { CLR_WHITE } from './terminal.js';
import { welded, wield_tool } from './wield.js';
import { dropx, set_wounded_legs, goto_level } from './do.js';
import { body_part, mbodypart } from './polyself.js';
import { uhis, expels } from './mhitu.js';
import { altar_wrath, altarmask_at, desecrate_altar } from './pray.js';
import { angry_priest } from './priest.js';
import { align_str } from './insight.js';
import { break_statue, fracture_rock, obj_resists } from './zap.js';
import { add_damage, pay_for_damage, shop_keeper, costly_spot, shopdig }
    from './shk.js';
import { shkname } from './shknam.js';
import { makemon, mkclass, hideunder, MM_NOMSG } from './makemon.js';
import { dogushforth, dryup, breaksink } from './fountain.js';
import { is_drawbridge_wall, find_drawbridge, is_moat, is_ice, is_db_wall,
         is_pool_or_lava } from './dbridge.js';
import { impact_drop } from './dokick.js';
import { next_to_u, o_unleash, doapply } from './apply.js';
import { teleport_pet, rloc } from './teleport.js';
import { migrate_to_level } from './dog.js';
import { make_angry_shk } from './shk.js';
import { count_wsegs } from './worm.js';
import { maketrap, add_to_buried } from './mklev.js';
import { explode } from './explode.js';
import { m_canseeu } from './monmove.js';
import { mb_trapped } from './monmove.js';
import { getdir, confdir, xytodir, cmdq_add_ec, cmdq_add_key, cmd_from_dir,
         movecmd, dxdy_moveok } from './cmd.js';
import { On_stairs, On_ladder, stairway_at } from './stairs.js';
import { is_flyer, is_floater, is_whirly, digests, hides_under,
         passes_walls } from './mondata.js';
import { hliquid, mon_nam, Monnam } from './do_name.js';
import { MAGIC_PORTAL, VIBRATING_SQUARE, G_UNIQ } from './const.js';
import { end_burn, start_timer, stop_timer } from './timeout.js';
import { unpunish, punish } from './read.js';
import { remove_worn_item } from './steal.js';
import { MON_WEP } from './monst.js';

function note_unported_dig(what) {
    (game.unported ||= new Set()).add(what);
}

/* pray.c STRIDENT */
const STRIDENT = 4;

/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys = (dmg) =>
    (game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
        ? Math.trunc((dmg + 1) / 2) : dmg;
/* include/hack.h:80 SHOP_WALL_DMG */
const SHOP_WALL_DMG = () => 10 * acurrstr();
/* include/mondata.h:159 is_watch() */
const is_watch = (ptr) => ptr.pmidx === PMNAMES.PM_WATCHMAN
    || ptr.pmidx === PMNAMES.PM_WATCH_CAPTAIN;
/* include/obj.h is_organic() */
const is_organic = (o) => game.objects[o.otyp].oc_material <= MATERIALS.WOOD;
/* include/hack.h u_at() */
const u_at = (x, y) => x === game.u.ux && y === game.u.uy;

/* src/mkobj.c:1978 treefruits[] */
const treefruits = [ONAMES.APPLE, ONAMES.ORANGE, ONAMES.PEAR,
                    ONAMES.BANANA, ONAMES.EUCALYPTUS_LEAF];

// src/mkobj.c:1984 rnd_treefruit_at()
export function rnd_treefruit_at(x, y) {
    return mksobj_at(treefruits[rn2(treefruits.length)], x, y, true, false);
}

/* include/rm.h closed_door() */
function closed_door(x, y) {
    const lev = game.level.at(x, y);
    return !!lev && lev.typ === DOOR
        && (lev.doormask & (D_LOCKED | D_CLOSED)) !== 0;
}

/* include/dungeon.h on_level() */
function on_level(a, b) {
    return !!a && !!b && a.dnum === b.dnum && a.dlevel === b.dlevel;
}

/* svc.context.digging (include/context.h dig_info) */
function digging_context() {
    const context = game.context ||= {};
    return context.digging ||= {
        pos: { x: 0, y: 0 },
        level: null,
        down: false,
        chew: false,
        warned: false,
        effort: 0,
        quiet: false,
        lastdigtime: 0,
    };
}

/* memset(&svc.context.digging, 0, sizeof svc.context.digging) */
function clear_digging_context() {
    const ctx = digging_context();
    ctx.pos = { x: 0, y: 0 };
    ctx.level = null;
    ctx.down = ctx.chew = ctx.warned = ctx.quiet = false;
    ctx.effort = 0;
    ctx.lastdigtime = 0;
}

/* stairway_at() lives in js/stairs.js, where src/stairs.c has it;
   re-exported for the existing importers */
export { stairway_at } from './stairs.js';

/* the top object of the pile at <x,y> (svl.level.objects[x][y]) */
function level_objects_top(x, y) {
    return (game.level.objects || []).find((o) => o.ox === x && o.oy === y)
           || null;
}
/* the whole pile at <x,y>, top first */
function level_objects_pile(x, y) {
    return (game.level.objects || []).filter((o) => o.ox === x && o.oy === y);
}

// src/dig.c:30 rm_waslit()
function rm_waslit() {
    const u = game.u;
    let x, y;

    if (game.level.at(u.ux, u.uy).typ === ROOM && game.level.at(u.ux, u.uy).waslit)
        return true;
    for (x = u.ux - 2; x < u.ux + 3; x++)
        for (y = u.uy - 1; y < u.uy + 2; y++)
            if (isok(x, y) && game.level.at(x, y).waslit)
                return true;
    return false;
}

// src/dig.c:48 mkcavepos(); Change level topology.  Messes with vision
// tables and ignores things like vaults and special levels.
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
    (game.viz_array ||= [])[y] ||= [];
    game.viz_array[y][x] = (dist < 3) ? (IN_SIGHT | COULD_SEE) : COULD_SEE;
    lev.typ = (rockit ? STONE : ROOM); /* flags set via doormask above */
    /* if (dist >= 3) impossible("mkcavepos called with dist %d", dist) */
    feel_newsym(x, y);
}

// src/dig.c:88 mkcavearea()
async function mkcavearea(rockit) {
    const u = game.u;
    let dist;
    let xmin = u.ux, xmax = u.ux;
    let ymin = u.uy, ymax = u.uy;
    let i;
    const waslit = rm_waslit();

    if (rockit) {
        /* Soundeffect(se_crashing_rock, 100) */
        await pline('Crash!  The ceiling collapses around you!');
    } else {
        await pline(`A mysterious force ${
            (game.level.at(u.ux, u.uy).typ === CORR) ? 'creates a' : 'extends the'
        } cave around you!`);
    }
    await display_nhwindow_message();

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
        if (game.animationFrame)
            await game.animationFrame(); /* nh_delay_output() */
    }

    if (!rockit && game.level.at(u.ux, u.uy).typ === CORR) {
        game.level.at(u.ux, u.uy).typ = ROOM; /* flags for CORR already 0 */
        if (waslit)
            game.level.at(u.ux, u.uy).waslit = true;
        newsym(u.ux, u.uy); /* in case player is invisible */
    }

    game.vision_full_recalc = 1; /* everything changed */
}

// src/dig.c:141 pick_can_reach(); When digging into location <x,y>, what are
// you actually digging into?
function pick_can_reach(pick, x, y) {
    const u = game.u;
    const t = t_at(x, y);
    const target_in_pit = t && is_pit(t.ttyp) && t.tseen;

    /* if hero is in a pit, can only reach a statue in an adjacent pit if
       the two pits are conjoined or the statue isn't and pick is two-handed;
       this applies to hero in pit trying to reach an adjcacent boulder too */
    if (u.utrap && u.utraptype === TT_PIT) {
        if (target_in_pit)
            return conjoined_pits(t, t_at(u.ux, u.uy), false);
        return bimanual(pick);
    }
    /* if hero is not in a pit, a two-handed pick or flying can reach a statue
       whether or not the statue is in a pit */
    if (bimanual(pick) || Flying())
        return true;
    /* hero isn't in a pit; can reach the statue if it isn't in a pit either */
    if (!target_in_pit)
        return true;
    return false;
}

// src/dig.c:169 dig_typ() -- classify what a pick or axe would strike.
export function dig_typ(otmp, x, y) {
    let ltyp;

    if (!isok(x, y) || !otmp || (!is_pick(otmp) && !is_axe(otmp)))
        return DIGTYP_UNDIGGABLE;

    ltyp = game.level.at(x, y).typ;
    if (is_axe(otmp))
        return closed_door(x, y) ? DIGTYP_DOOR
               : IS_TREE(ltyp) ? DIGTYP_TREE /* axe vs tree */
                 : DIGTYP_UNDIGGABLE;
    return (sobj_at(ONAMES.STATUE, x, y) && pick_can_reach(otmp, x, y))
           ? DIGTYP_STATUE
           : (sobj_at(ONAMES.BOULDER, x, y) && pick_can_reach(otmp, x, y))
             ? DIGTYP_BOULDER
             : closed_door(x, y) ? DIGTYP_DOOR
               : IS_TREE(ltyp) ? DIGTYP_UNDIGGABLE /* pick vs tree */
                 : (IS_OBSTRUCTED(ltyp)
                    && (!game.level.flags?.arboreal || IS_WALL(ltyp)))
                   ? DIGTYP_ROCK
                   : DIGTYP_UNDIGGABLE;
}

// src/dig.c:195 is_digging()
export function is_digging() {
    if (game.occupation === dig) {
        return true;
    }
    return false;
}

const BY_YOU = () => game.youmonst;
const BY_OBJECT = null;

// src/dig.c:207 dig_check(); can the hero dig (or a wand of digging make a
// hole) at <x,y>?
export function dig_check(madeby, x, y) {
    const u = game.u;
    const ttmp = t_at(x, y);
    const lev = game.level.at(x, y);

    if (On_stairs(x, y)) {
        const stway = stairway_at(x, y);

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
    } else if (Is_airlevel(u.uz)) {
        return DIGCHECK_FAIL_AIRLEVEL;
    } else if (Is_waterlevel(u.uz)) {
        return DIGCHECK_FAIL_WATERLEVEL;
    } else if ((IS_OBSTRUCTED(lev.typ) && lev.typ !== SDOOR
                && (lev.wall_info & W_NONDIGGABLE) !== 0)) {
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
    } else if (sobj_at(ONAMES.BOULDER, x, y)) {
        return DIGCHECK_FAIL_BOULDER;
    } else if (madeby === BY_OBJECT
               /* the block against existing traps is mainly to
                  prevent broken wands from turning holes into pits */
               && (ttmp || is_pool_or_lava(x, y))) {
        /* digging by player handles pools separately */
        return DIGCHECK_FAIL_OBJ_POOL_OR_TRAP;
    }
    return DIGCHECK_PASSED;
}

/* include/trap.h:116 undestroyable_trap() */
const undestroyable_trap = (ttyp) => ttyp === MAGIC_PORTAL
    || ttyp === VIBRATING_SQUARE;
/* include/mondata.h unique_corpstat() */
const unique_corpstat = (ptr) => (ptr.geno & G_UNIQ) !== 0;

// src/dig.c:255 digcheck_fail_message()
export async function digcheck_fail_message(digresult, madeby, x, y) {
    const u = game.u;
    const verb =
        (madeby === BY_YOU() && u.uwep && is_axe(u.uwep)) ? 'chop' : 'dig in';

    if (digresult < DIGCHECK_FAILED)
        return;

    switch (digresult) {
    case DIGCHECK_FAIL_AIRLEVEL:
        await You(`cannot ${verb} thin air.`);
        break;
    case DIGCHECK_FAIL_ALTAR:
        await pline_The('altar is too hard to break apart.');
        break;
    case DIGCHECK_FAIL_BOULDER:
        await There(`isn't enough room to ${verb} here.`);
        break;
    case DIGCHECK_FAIL_ONLADDER:
        await pline_The('ladder resists your effort.');
        break;
    case DIGCHECK_FAIL_ONSTAIRS:
        await pline_The(`stairs are too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_THRONE:
        await pline_The('throne is too hard to break apart.');
        break;
    case DIGCHECK_FAIL_CANTDIG:
    case DIGCHECK_FAIL_TOOHARD:
    case DIGCHECK_FAIL_UNDESTROYABLETRAP:
        await pline_The(`${surface(x, y)} here is too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_WATERLEVEL:
        await pline_The(`${hliquid('water')} splashes and subsides.`);
        break;
    case DIGCHECK_FAIL_OBJ_POOL_OR_TRAP:
    case DIGCHECK_PASSED:
    case DIGCHECK_PASSED_PITONLY:
    case DIGCHECK_PASSED_DESTROY_TRAP:
        /* shouldn't get here */
        break;
    }
}

// src/dig.c:300 dig() -- one turn of the hero's digging occupation.
export async function dig() {
    const u = game.u;
    const ctx = digging_context();
    let lev;
    const dpx = ctx.pos.x, dpy = ctx.pos.y;
    const uwep = u.uwep;
    const ispick = uwep && is_pick(uwep);
    const verb = (!uwep || is_pick(uwep)) ? 'dig into' : 'chop through';
    let dcresult = DIGCHECK_PASSED;

    lev = game.level.at(dpx, dpy);
    /* perhaps a nymph stole your pick-axe while you were busy digging */
    /* or perhaps you teleported away */
    if (u.uswallow || !uwep || (!ispick && !is_axe(uwep))
        || !on_level(ctx.level, u.uz)
        || ((ctx.down ? (dpx !== u.ux || dpy !== u.uy)
                      : !(dist2(dpx, dpy, u.ux, u.uy) <= 2)))) /* !next2u() */
        return 0;

    if (ctx.down) {
        dcresult = dig_check(BY_YOU(), u.ux, u.uy);
        if (dcresult >= DIGCHECK_FAILED) {
            await digcheck_fail_message(dcresult, BY_YOU(), u.ux, u.uy);
            return 0;
        }
    } else { /* !svc.context.digging.down */
        if (IS_TREE(lev.typ) && !may_dig(dpx, dpy)
            && dig_typ(uwep, dpx, dpy) === DIGTYP_TREE) {
            await pline('This tree seems to be petrified.');
            return 0;
        }
        if (IS_OBSTRUCTED(lev.typ) && !may_dig(dpx, dpy)
            && dig_typ(uwep, dpx, dpy) === DIGTYP_ROCK) {
            await pline(`This ${is_db_wall(dpx, dpy) ? 'drawbridge' : 'wall'
                        } is too hard to ${verb}.`);
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
                    await pline(`${Yobjnam2(uwep, 'bounce')} and ${
                        otense(uwep, 'hit')} ${mon_nam(u.usteed)}!`);
                else
                    await pline(`Ouch!  ${Yobjnam2(uwep, 'bounce')} and ${
                        otense(uwep, 'hit')} you!`);
                await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
            }
            break;
        case 1:
            /* Soundeffect(se_bang_weapon_side, 100) */
            await pline(`Bang!  You hit with the broad side of ${the(xname(uwep))}!`);
            await wake_nearby(false);
            break;
        default:
            await Your('swing misses its mark.');
            break;
        }
        return 0;
    }

    ctx.effort +=
        10 + rn2(5) + abon() + uwep.spe - greatest_erosion(uwep) + (u.udaminc | 0);
    if (Race_if(PMNAMES.PM_DWARF))
        ctx.effort *= 2;
    if (ctx.down) {
        const ttmp = t_at(dpx, dpy);

        if (ctx.effort > 250
            || (ttmp && ttmp.ttyp === HOLE)) {
            await dighole(false, false, null);
            clear_digging_context();
            return 0; /* done with digging */
        }

        if (ctx.effort <= 50
            || (ttmp && (ttmp.ttyp === TRAPDOOR || is_pit(ttmp.ttyp)))) {
            return 1;
        } else if (ttmp && (ttmp.ttyp === LANDMINE
                            || (ttmp.ttyp === BEAR_TRAP && !u.utrap))) {
            /* digging onto a set object trap triggers it;
               hero should have used #untrap first */
            await dotrap(ttmp, FORCETRAP);
            /* restart completely from scratch if we resume digging */
            clear_digging_context();
            return 0;
        } else if (ttmp && ttmp.ttyp === BEAR_TRAP && u.utrap) {
            if (rnl(7) > (Fumbling() ? 1 : 4)) {
                let kbuf;
                let dmg = dmgval(uwep, game.youmonst) + dbon();

                if (dmg < 1)
                    dmg = 1;
                else if (u.uarmf)
                    dmg = Math.trunc((dmg + 1) / 2);
                await You(`hit yourself in the ${body_part(FOOT)}.`);
                kbuf = `chopping off ${uhis()} own ${body_part(FOOT)}`;
                await losehp(Maybe_Half_Phys(dmg), kbuf, KILLED_BY);
            } else {
                await You(`destroy the bear trap with ${yobjnam(uwep, null)}.`);
                deltrap(ttmp);
                await reset_utrap(true); /* release from trap, maybe Lev or Fly */
            }
            ctx.effort = 0;
            return 0;
        } else if (ttmp && dcresult === DIGCHECK_PASSED_DESTROY_TRAP) {
            const ttmpname = trapname(ttmp.ttyp);

            if (ispick)
                await You(`destroy ${ttmp.tseen ? the(ttmpname) : an(ttmpname)
                          } with ${yobjnam(uwep, null)}.`);
            deltrap(ttmp);
            ctx.effort = 0;
            return 0;
        }

        if (IS_ALTAR(lev.typ)) {
            await altar_wrath(dpx, dpy);
            await angry_priest();
        }

        /* make pit at <u.ux,u.uy> */
        if (await dighole(true, false, null)) {
            ctx.level = null; /* dnum = 0, dlevel = -1 */
        }
        return 0;
    }

    if (ctx.effort > 100) {
        let digbuf;
        let digtxt, dmgtxt = null;
        let obj, bobj;
        const shopedge = !!in_rooms(dpx, dpy, SHOPBASE);
        const digtyp = dig_typ(uwep, dpx, dpy);
        let cleanup = false;

        if (digtyp === DIGTYP_STATUE
            && (obj = sobj_at(ONAMES.STATUE, dpx, dpy)) != null) {
            if (await break_statue(obj))
                digtxt = 'The statue shatters.';
            else
                /* it was a statue trap; break_statue()
                 * printed a message and updated the screen
                 */
                digtxt = null;
        } else if (digtyp === DIGTYP_BOULDER
                   && (obj = sobj_at(ONAMES.BOULDER, dpx, dpy)) != null) {
            await fracture_rock(obj);
            if ((bobj = sobj_at(ONAMES.BOULDER, dpx, dpy)) != null) {
                /* another boulder here, restack it to the top */
                obj_extract_self(bobj);
                place_object(bobj, dpx, dpy);
            }
            digtxt = 'The boulder falls apart.';
        } else if (lev.typ === STONE || lev.typ === SCORR
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
                    digtxt = 'You cut down the tree.';
                    lev.typ = ROOM, lev.flags = 0;
                    if (!rn2(5))
                        rnd_treefruit_at(dpx, dpy);
                    if (Race_if(PMNAMES.PM_ELF) || Role_if(PMNAMES.PM_RANGER))
                        adjalign(-1);
                } else {
                    digtxt = 'You succeed in cutting away some rock.';
                    lev.typ = CORR, lev.flags = 0;
                }
            }
        } else if (IS_WALL(lev.typ)) {
            if (shopedge) {
                add_damage(dpx, dpy, SHOP_WALL_DMG());
                dmgtxt = 'damage';
            }
            if (game.level.flags?.is_maze_lev) {
                lev.typ = ROOM, lev.flags = 0;
            } else if (game.level.flags?.is_cavernous_lev
                       && !in_town(dpx, dpy)) {
                lev.typ = CORR, lev.flags = 0;
            } else {
                lev.typ = DOOR, lev.doormask = D_NODOOR;
            }
            digtxt = 'You make an opening in the wall.';
        } else if (lev.typ === SDOOR) {
            cvt_sdoor_to_door(lev); /* ->typ = DOOR */
            digtxt = 'You break through a secret door!';
            if (!(lev.doormask & D_TRAPPED))
                lev.doormask = D_BROKEN;
        } else if (closed_door(dpx, dpy)) {
            digbuf = `You break through the door with your ${simpleonames(uwep)}.`;
            digtxt = digbuf;
            if (shopedge) {
                add_damage(dpx, dpy, SHOP_DOOR_COST);
                dmgtxt = 'break';
            }
            if (!(lev.doormask & D_TRAPPED))
                lev.doormask = D_BROKEN;
        } else
            return 0; /* statue or boulder got taken */

        if (!cleanup) {
            if (!does_block(dpx, dpy, game.level.at(dpx, dpy)))
                unblock_point(dpx, dpy); /* vision:  can see through */
            feel_newsym(dpx, dpy);
            if (digtxt && !ctx.quiet)
                await pline(digtxt); /* after newsym */
            if (dmgtxt)
                await pay_for_damage(dmgtxt, false);

            if (Is_earthlevel(u.uz) && !rn2(3)) {
                const mndx = rn2(2) ? PMNAMES.PM_EARTH_ELEMENTAL : PMNAMES.PM_XORN;

                if (makemon(game.mons[mndx], dpx, dpy, MM_NOMSG))
                    await pline_The('debris from your digging comes to life!');
            }
            if (IS_DOOR(lev.typ) && (lev.doormask & D_TRAPPED)) {
                lev.doormask = D_NODOOR;
                await b_trapped('door', NO_PART);
                recalc_block_point(dpx, dpy);
                newsym(dpx, dpy);
            }
        }
        /* cleanup: */
        ctx.lastdigtime = game.moves;
        ctx.quiet = false;
        ctx.level = null; /* dnum = 0, dlevel = -1 */
        return 0;
    } else { /* not enough effort has been spent yet */
        const d_target = [ '',        'rock', 'statue',
                           'boulder', 'door', 'tree' ];
        const dig_target = dig_typ(uwep, dpx, dpy);

        if (IS_WALL(lev.typ) || dig_target === DIGTYP_DOOR) {
            if (in_rooms(dpx, dpy, SHOPBASE)) {
                await pline(`This ${IS_DOOR(lev.typ) ? 'door' : 'wall'
                            } seems too hard to ${verb}.`);
                return 0;
            }
        } else if (dig_target === DIGTYP_UNDIGGABLE
                   || (dig_target === DIGTYP_ROCK && !IS_OBSTRUCTED(lev.typ)))
            return 0; /* statue or boulder got taken */

        if (!game.did_dig_msg) {
            await You(`hit the ${d_target[dig_target]} with all your might.`);
            await wake_nearby(false);
            game.did_dig_msg = true;
        }
    }
    return 1;
}

// src/dig.c:571 furniture_handled(); When will hole be finished? Very rough
// indication used by shopkeeper.
async function furniture_handled(x, y, madeby_u) {
    const lev = game.level.at(x, y);

    if (IS_FOUNTAIN(lev.typ)) {
        await dogushforth(false);
        lev.looted |= F_WARNED; /* SET_FOUNTAIN_WARNED(x, y): force dryup */
        await dryup(x, y, madeby_u);
    } else if (IS_SINK(lev.typ)) {
        await breaksink(x, y);
    } else if (lev.typ === DRAWBRIDGE_DOWN
               || (is_drawbridge_wall(x, y) >= 0)) {
        const cc = { x, y };
        find_drawbridge(cc);
        await destroy_drawbridge(cc.x, cc.y);
    } else {
        return false;
    }
    return true;
}

// src/dig.c:597 holetime(); When will hole be finished? Very rough
// indication used by shopkeeper.
export function holetime() {
    if (game.occupation !== dig || !(game.u.ushops || '').length)
        return -1;
    return Math.trunc((250 - digging_context().effort) / 20);
}

// src/dig.c:606 fillholetyp(); Return typ of liquid to fill a hole with, or
// ROOM, if no liquid nearby
export function fillholetyp(x, y, fill_if_any) {
    /* fill_if_any: force filling if it exists at all */
    let x1, y1;
    const lo_x = Math.max(1, x - 1), hi_x = Math.min(x + 1, COLNO - 1),
          lo_y = Math.max(0, y - 1), hi_y = Math.min(y + 1, ROWNO - 1);
    let pool_cnt = 0, moat_cnt = 0, lava_cnt = 0;

    for (x1 = lo_x; x1 <= hi_x; x1++)
        for (y1 = lo_y; y1 <= hi_y; y1++)
            if (is_moat(x1, y1))
                moat_cnt++;
            else if (is_pool(x1, y1))
                /* This must come after is_moat since moats are pools
                 * but not vice-versa. */
                pool_cnt++;
            else if (is_lava(x1, y1))
                lava_cnt++;

    if (!fill_if_any)
        pool_cnt = Math.trunc(pool_cnt / 3); /* not as much liquid as the others */

    if ((lava_cnt > moat_cnt + pool_cnt && rn2(lava_cnt + 1))
        || (lava_cnt && fill_if_any))
        return LAVAPOOL;
    else if ((moat_cnt > 0 && rn2(moat_cnt + 1)) || (moat_cnt && fill_if_any))
        return MOAT;
    else if ((pool_cnt > 0 && rn2(pool_cnt + 1)) || (pool_cnt && fill_if_any))
        return POOL;
    else
        return ROOM;
}

// src/dig.c:640 digactualhole()
export async function digactualhole(x, y, madeby, ttyp) {
    const u = game.u;
    let oldobjs, newobjs;
    let ttmp;
    let surface_type, tname, in_thru;
    let furniture = '';
    const lev = game.level.at(x, y);
    const mtmp = m_at(x, y); /* may be madeby */
    const madeby_u = (madeby === BY_YOU()), madeby_obj = (madeby === BY_OBJECT),
          heros_fault = (madeby_u || madeby_obj);
    let shopdoor;
    const at_u = u_at(x, y);
    let wont_fall = Levitation() || Flying();
    let old_typ, old_aligntyp = A_NONE;

    /* these furniture checks were in dighole(), but wand
       breaking bypasses that routine and calls us directly */
    if (at_u && u.utrap) {
        if (u.utraptype === TT_BURIEDBALL)
            await buried_ball_to_punishment();
        else if (u.utraptype === TT_INFLOOR)
            await reset_utrap(false);
    }

    if (await furniture_handled(x, y, madeby_u))
        return;

    if (ttyp !== PIT && (!Can_dig_down(u.uz) && !lev.candig)) {
        /* impossible("digactualhole: can't dig %s on this level.", ...) */
        ttyp = PIT;
    }

    /* maketrap() might change it, also, in this situation,
       surface() returns an inappropriate string for a grave */
    old_typ = lev.typ;
    if (IS_FURNITURE(lev.typ)) {
        surface_type = (IS_ROOM(lev.typ) && !Is_earthlevel(u.uz)
                         ? 'floor' : 'ground');
        if (IS_ALTAR(lev.typ)) {
            old_aligntyp = Amask2align(lev.altarmask & AM_MASK);
            furniture = align_str(old_aligntyp);
            furniture += ' ';
        }
        furniture += surface(x, y);
    } else {
        surface_type = surface(x, y);
    }
    shopdoor = IS_DOOR(lev.typ) && !!in_rooms(x, y, SHOPBASE);
    oldobjs = level_objects_top(x, y);
    ttmp = maketrap(x, y, ttyp);
    if (!ttmp)
        return;
    newobjs = level_objects_top(x, y);
    ttmp.madeby_u = heros_fault ? 1 : 0;
    ttmp.tseen = 0;
    if (cansee(x, y))
        seetrap(ttmp);
    else if (madeby_u)
        feeltrap(ttmp);
    tname = trapname(ttyp);
    in_thru = (ttyp === HOLE ? 'through' : 'in');

    if (madeby_u) {
        if (x !== u.ux || y !== u.uy)
            await You(`dig an adjacent ${tname}.`);
        else
            await You(`dig ${an(tname)} ${in_thru} the ${surface_type}.`);
    } else if (!madeby_obj && canseemon(madeby)) {
        await pline(`${Monnam(madeby)} digs ${an(tname)} ${in_thru} the ${surface_type}.`);
    } else if (cansee(x, y) && game.flags.verbose) {
        if (IS_STWALL(old_typ))
            await pline_The(`${surface_type} crumbles into ${an(tname)}.`);
        else
            await pline(`${An(tname)} appears in the ${surface_type}.`);
    }
    if (IS_FURNITURE(old_typ) && cansee(x, y))
        await pline_The(`${furniture} falls into the ${tname}!`);
    if (heros_fault && old_typ === ALTAR)
        await desecrate_altar(false, old_aligntyp);

    if (ttyp === PIT) {
        if (shopdoor && heros_fault)
            await pay_for_damage('ruin', false);
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
                game.vision_full_recalc = 1; /* vision limits change */
            } else
                await reset_utrap(true);

            if (oldobjs !== newobjs) /* something unearthed */
                await pickup(1);   /* detects pit */
        } else if (mtmp) {
            if (is_flyer(mtmp.data) || is_floater(mtmp.data)) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} ${
                        (is_flyer(mtmp.data)) ? 'flies' : 'floats'} over the pit.`);
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

            if (!u.ustuck && !wont_fall && !(await next_to_u())) {
                await You('are jerked back by your pet!');
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
                    await pay_for_damage('ruin', false);

            } else {
                let newlevel;

                if ((u.ushops || '').length && heros_fault)
                    await shopdig(1); /* shk might snatch pack */
                else /* handle any earlier hero-caused damage */
                    await pay_for_damage('dig into', true);

                await You('fall through...');
                /* Earlier checks must ensure that the destination
                 * level exists and is in the present dungeon. */
                newlevel = { dnum: u.uz.dnum, dlevel: u.uz.dlevel + 1 };
                await goto_level(newlevel, false, true, false);
                /* messages for arriving in special rooms */
                await spoteffects(false);
            }
        } else {
            if (shopdoor && heros_fault)
                await pay_for_damage('ruin', false);
            if (newobjs)
                await impact_drop(null, x, y, 0);
            if (mtmp) {
                /*[don't we need special sokoban handling here?]*/
                if (!grounded(mtmp.data)
                    || (mtmp.wormno && count_wsegs(mtmp) > 5)
                    || mtmp.data.msize >= MFLAGS.MZ_HUGE)
                    return;
                if (mtmp === u.ustuck) /* probably a vortex */
                    return;           /* temporary? kludge */

                if (await teleport_pet(mtmp, false)) {
                    const tolevel = {};

                    if (Is_stronghold(u.uz)) {
                        Object.assign(tolevel, game.valley_level); /* assign_level */
                    } else if (Is_botlevel(u.uz)) {
                        if (canseemon(mtmp))
                            await pline(`${Monnam(mtmp)} avoids the trap.`);
                        return;
                    } else {
                        get_level(tolevel, depth(u.uz) + 1);
                    }
                    if (mtmp.isshk)
                        await make_angry_shk(mtmp);
                    await migrate_to_level(mtmp, ledger_no(tolevel),
                                           MIGR_RANDOM, null);
                }
            }
        }
    }
}

// src/dig.c:838 liquid_flow(); called when a hole gets filled with liquid
export async function liquid_flow(x, y, typ, ttmp, fillmsg) {
    const u_spot = u_at(x, y);

    if (!is_pool_or_lava(x, y)) {
        /* impossible("Insane liquid_flow(...)") under iflags.sanity_check */
        return;
    }

    if (ttmp)
        await delfloortrap(ttmp); /* will untrap monster if one is here */
    /* if any objects were frozen here, they're released now */
    obj_ice_effects(x, y, true);
    await unearth_objs(x, y);

    if (fillmsg)
        await pline(fillmsg.replace('%s', hliquid(typ === LAVAPOOL ? 'lava' : 'water')));
    /* handle object damage before hero damage; affects potential bones */
    const objchain = level_objects_pile(x, y);
    if (objchain.length) {
        if (typ === LAVAPOOL)
            await fire_damage_chain(objchain, true, true, x, y);
        else
            await water_damage_chain(objchain, true);
    }
    /* hero is in the way */
    if (u_spot) {
        await pooleffects(false);
    } else {
        const mon = m_at(x, y);
        if (mon)
            await minliquid(mon);
    }
}

// src/dig.c:885 dighole(); return TRUE if digging succeeded, FALSE otherwise
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
    nohole = (dig_check_result === DIGCHECK_FAIL_CANTDIG
                  || dig_check_result === DIGCHECK_FAIL_TOOHARD);
    old_typ = lev.typ;

    if ((ttmp && (undestroyable_trap(ttmp.ttyp) || nohole))
        || (IS_OBSTRUCTED(old_typ) && old_typ !== SDOOR
            && (lev.wall_info & W_NONDIGGABLE) !== 0)) {
        await pline_The(`${surface(dig_x, dig_y)} ${
            (dig_x !== u.ux || dig_y !== u.uy) ? 't' : ''}here is too hard to dig in.`);

    } else if (ttmp && is_magical_trap(ttmp.ttyp)) {
        await explode(dig_x, dig_y, 0, 20 + d(3, 6), TRAP_EXPLODE, EXPL_MAGICAL);
        deltrap(ttmp);
        newsym(dig_x, dig_y);
    } else if (is_pool_or_lava(dig_x, dig_y)) {
        await pline_The(`${hliquid(is_lava(dig_x, dig_y) ? 'lava' : 'water')
                        } sloshes furiously for a moment, then subsides.`);
        await wake_nearby(false); /* splashing */

    } else if (old_typ === DRAWBRIDGE_DOWN
               || (is_drawbridge_wall(dig_x, dig_y) >= 0)) {
        /* drawbridge_down is the platform crossing the moat when the
           bridge is extended; drawbridge_wall is the open "doorway" or
           closed "door" where the portcullis/mechanism is located */
        if (pit_only) {
            await pline_The('drawbridge seems too hard to dig through.');
        } else {
            const c = { x: dig_x, y: dig_y };
            find_drawbridge(c);
            await destroy_drawbridge(c.x, c.y);
            retval = true;
        }

    } else if ((boulder_here = sobj_at(ONAMES.BOULDER, dig_x, dig_y)) != null) {
        if (ttmp && is_pit(ttmp.ttyp)
            && rn2(2)) {
            await pline_The(`boulder settles into the ${
                (dig_x !== u.ux || dig_y !== u.uy) ? 'adjacent ' : ''}pit.`);
            ttmp.ttyp = PIT; /* crush spikes */
        } else {
            /*
             * digging makes a hole, but the boulder immediately
             * fills it.  Final outcome:  no hole, no boulder.
             */
            /* Soundeffect(se_kadoom_boulder_falls_in, 60) */
            await pline('KADOOM!  The boulder falls in!');
            await wake_nearby(false);
            await delfloortrap(ttmp);
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
                (dig_x !== u.ux || dig_y !== u.uy) ? 't' : ''}here is too hard to dig in.`);
        } else {
            lev.drawbridgemask &= ~DB_UNDER;
            lev.drawbridgemask |= (typ === LAVAPOOL) ? DB_LAVA : DB_MOAT;
            await liquid_flow(dig_x, dig_y, typ, ttmp,
                              'As you dig, the hole fills with %s!');
            retval = true;
        }

    /* the following two are here for the wand of digging */
    } else if (IS_THRONE(old_typ)) {
        await pline_The('throne is too hard to break apart.');

    } else if (IS_ALTAR(old_typ)) {
        await pline_The('altar is too hard to break apart.');

    } else {
        typ = fillholetyp(dig_x, dig_y, false);

        lev.flags = 0;
        if (typ !== ROOM) {
            if (!(await furniture_handled(dig_x, dig_y, true))) {
                lev.typ = typ;
                await liquid_flow(dig_x, dig_y, typ, ttmp,
                                  'As you dig, the hole fills with %s!');
            }
            retval = true;
        } else {
            /* magical digging disarms settable traps */
            if (by_magic && ttmp
                && (ttmp.ttyp === LANDMINE || ttmp.ttyp === BEAR_TRAP)) {
                const otyp = (ttmp.ttyp === LANDMINE) ? ONAMES.LAND_MINE
                                                      : ONAMES.BEARTRAP;

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

// src/dig.c:1027 dig_up_grave(); dig_x, dig_y: hero's spot or adjacent spot
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
    exercise(A_WIS, false);
    if (Role_if(PMNAMES.PM_ARCHEOLOGIST)) {
        adjalign(-sgn(u.ualign.type) * 3);
        await You_feel('like a despicable grave-robber!');
    } else if (Role_if(PMNAMES.PM_SAMURAI)) {
        adjalign(-sgn(u.ualign.type));
        await You('disturb the honorable dead!');
    } else if (u.ualign.type === A_LAWFUL) {
        if (u.ualign.record > -10)
            adjalign(-1);
        await You('have violated the sanctity of this grave!');
    }

    what_happens = game.level.at(dig_x, dig_y).emptygrave ? -1 : rn2(5);
    switch (what_happens) {
    case 0:
    case 1:
        await You('unearth a corpse.');
        if ((otmp = mk_tt_object(ONAMES.CORPSE, dig_x, dig_y)) != null)
            otmp.age -= (TAINT_AGE + 1); /* this is an *OLD* corpse */
        break;
    case 2:
        if (!Blind())
            await pline(`${Hallucination() ? 'Dude!  The living dead'
                                           : "The grave's owner is very upset"}!`);
        makemon(mkclass(MONSYMS.S_ZOMBIE, 0), dig_x, dig_y, MM_NOMSG);
        break;
    case 3:
        if (!Blind())
            await pline(`${Hallucination() ? 'I want my mummy'
                                           : "You've disturbed a tomb"}!`);
        makemon(mkclass(MONSYMS.S_MUMMY, 0), dig_x, dig_y, MM_NOMSG);
        break;
    default:
        /* No corpse */
        await pline_The('grave is unoccupied.  Strange...');
        break;
    }
    game.level.at(dig_x, dig_y).typ = ROOM;
    game.level.at(dig_x, dig_y).emptygrave = 0; /* clear 'flags' */
    game.level.at(dig_x, dig_y).disturbed = 0; /* clear 'horizontal' */
    del_engr_at(dig_x, dig_y);
    newsym(dig_x, dig_y);
    return;
}

// src/dig.c:1092 use_pick_axe()
export async function use_pick_axe(obj) {
    const u = game.u;
    let verb;
    let dsp = '', qbuf;
    let ispick;
    let rx, ry, downok;
    const res = ECMD_OK;
    let dir;

    /* Check tool */
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'swing')) {
            cmdq_add_ec(CQ_CANNED, doapply);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    ispick = is_pick(obj);
    verb = ispick ? 'dig' : 'chop';

    if (u.utrap && u.utraptype === TT_WEB) {
        await pline(`${
            /* res==0 => no prior message;
               res==1 => just got "You now wield a pick-axe." message */
            !res ? 'Unfortunately,' : 'But'} you can't ${verb} while entangled in a web.`);
        /* might return ECMD_TIME if we just wielded pick or axe */
        return res;
    }

    /* construct list of directions to show player for likely choices */
    downok = !!can_reach_floor(false);
    for (dir = 0; dir < N_DIRS_Z; dir++) {
        const dirch = cmd_from_dir(dir, MV_WALK);

        if (u.uswallow) {
            ; /* all directions are viable when swallowed */
        } else if (movecmd(dirch, MV_WALK)) {
            /* normal direction, within plane of the level map;
               movecmd() sets u.dx, u.dy, u.dz and returns !u.dz */
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
            if (((u.dz > 0) ? 1 : 0) ^ (downok ? 1 : 0))
                continue;
        }
        /* include this direction */
        dsp += dirch;
    }
    qbuf = `In what direction do you want to ${verb}? [${dsp}]`;
    if (!(await getdir(qbuf)))
        return (res | ECMD_CANCEL);

    return await use_pick_axe2(obj);
}

// src/dig.c:1162 use_pick_axe2() -- execute the direction already in u.d*.
// MRKR: use_pick_axe() is split in two to allow autodig to bypass
//       the "In what direction do you want to dig?" query.
export async function use_pick_axe2(obj) {
    const u = game.u;
    let rx, ry;
    let lev;
    let trap, trap_with_u;
    let dig_target;
    const ispick = is_pick(obj);
    const verbing = ispick ? 'digging' : 'chopping';

    if (u.uswallow && await do_attack(u.ustuck)) {
        ; /* return 1 */
    } else if (Underwater()) {
        await pline(`Turbulence torpedoes your ${verbing} attempts.`);
    } else if (u.dz < 0) {
        if (Levitation())
            await You("don't have enough leverage.");
        else
            await You_cant(`reach the ${ceiling(u.ux, u.uy)}.`);
    } else if (!u.dx && !u.dy && !u.dz) {
        let buf;
        let dam;

        dam = rnd(2) + dbon() + obj.spe;
        if (dam <= 0)
            dam = 1;
        await You(`hit yourself with ${yname(u.uwep)}.`);
        buf = `${uhis()} own ${game.objects[obj.otyp].oc_name}`;
        await losehp(Maybe_Half_Phys(dam), buf, KILLED_BY);
        (game.disp ||= {}).botl = true;
        return ECMD_TIME;
    } else if (u.dz === 0) {
        confdir(false);
        rx = u.ux + u.dx;
        ry = u.uy + u.dy;
        if (!isok(rx, ry)) {
            /* Soundeffect(se_clash, 40) */
            await pline('Clash!');
            return ECMD_TIME;
        }
        lev = game.level.at(rx, ry);
        if (m_at(rx, ry) && await do_attack(m_at(rx, ry)))
            return ECMD_TIME;
        dig_target = dig_typ(obj, rx, ry);
        if (dig_target === DIGTYP_UNDIGGABLE) {
            /* ACCESSIBLE or POOL */
            let boulder;

            trap = t_at(rx, ry);
            if (trap && trap.ttyp === WEB) {
                if (!trap.tseen) {
                    seetrap(trap);
                    await There('is a spider web there!');
                }
                await pline(`${Yobjnam2(obj, 'become')} entangled in the web.`);
                /* you ought to be able to let go; tough luck */
                /* (maybe `move_into_trap()' would be better) */
                nomul(-d(2, 2));
                game.multi_reason = 'stuck in a spider web';
                game.nomovemsg = 'You pull free.';
            } else if (lev.typ === IRONBARS) {
                await pline('Clang!');
                await wake_nearby(false);
            } else if (IS_WATERWALL(lev.typ)) {
                await pline('Splash!');
            } else if (lev.typ === LAVAWALL) {
                await pline('Splash!');
                await fire_damage(u.uwep, false, rx, ry);
            } else if (IS_TREE(lev.typ)) {
                await You('need an axe to cut down a tree.');
            } else if (IS_OBSTRUCTED(lev.typ)) {
                await You('need a pick to dig rock.');
            } else if ((boulder = sobj_at(ONAMES.BOULDER, rx, ry)) != null
                       || sobj_at(ONAMES.STATUE, rx, ry)) {
                /* if both boulder and statue are present, the
                   boulder will be shown on the map so treat it as target */
                const what = boulder ? 'boulder' : 'statue';

                if (!ispick) {
                    const vibrate = !rn2(3);

                    await pline(`Sparks fly as you whack the ${what}.${
                        vibrate ? '  The axe-handle vibrates violently!' : ''}`);
                    if (vibrate)
                        await losehp(Maybe_Half_Phys(2), 'axing a hard object',
                                     KILLED_BY);
                    await wake_nearby(false);
                } else {
                    /* dig_typ() picked DIGTYP_UNDIGGABLE, which means hero
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
                    await You('clear some debris from between the pits.');
                }
            } else if (u.utrap && u.utraptype === TT_PIT
                       && (trap_with_u = t_at(u.ux, u.uy)) != null) {
                await You(`swing ${yobjnam(obj, null)}, but the rubble has no place to go.`);
            } else {
                await You(`swing ${yobjnam(obj, null)} through thin air.`);
            }
        } else {
            const d_action = [ 'swinging', 'digging',
                               'chipping the statue',
                               'hitting the boulder',
                               'chopping at the door',
                               'cutting the tree' ];
            const ctx = digging_context();

            game.did_dig_msg = false;
            ctx.quiet = false;
            if (ctx.pos.x !== rx
                || ctx.pos.y !== ry
                || !on_level(ctx.level, u.uz)
                || ctx.down) {
                if (game.flags.autodig && dig_target === DIGTYP_ROCK
                    && !ctx.down
                    && u_at(ctx.pos.x, ctx.pos.y)
                    && (game.moves <= ctx.lastdigtime + 2
                        && game.moves >= ctx.lastdigtime)) {
                    /* avoid messages if repeated autodigging */
                    game.did_dig_msg = true;
                    ctx.quiet = true;
                }
                ctx.down = ctx.chew = false;
                ctx.warned = false;
                ctx.pos.x = rx;
                ctx.pos.y = ry;
                ctx.level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
                ctx.effort = 0;
                if (!ctx.quiet)
                    await You(`start ${d_action[dig_target]}.`);
            } else {
                await You(`${ctx.chew ? 'begin' : 'continue'} ${d_action[dig_target]}.`);
                ctx.chew = false;
            }
            set_occupation(dig, verbing, 0);
        }
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        /* it must be air -- water checked above */
        await You(`swing ${yobjnam(obj, null)} through thin air.`);
    } else if (!can_reach_floor(false)) {
        await cant_reach_floor(u.ux, u.uy, false, false, false);
    } else if (is_pool_or_lava(u.ux, u.uy)) {
        /* Monsters which swim also happen not to be able to dig */
        await You(`cannot stay under${is_pool(u.ux, u.uy) ? 'water' : ' the lava'
                  } long enough.`);
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
        await pline(`${Yobjnam2(obj, null)} merely scratches the ${surface(u.ux, u.uy)}.`);
        u_wipe_engr(3);
    } else {
        const ctx = digging_context();

        if (ctx.pos.x !== u.ux
            || ctx.pos.y !== u.uy
            || !on_level(ctx.level, u.uz)
            || !ctx.down) {
            ctx.chew = false;
            ctx.down = true;
            ctx.warned = false;
            ctx.pos.x = u.ux;
            ctx.pos.y = u.uy;
            ctx.level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
            ctx.effort = 0;
            await You(`start ${verbing} downward.`);
            if ((u.ushops || '').length) {
                await shopdig(0);
                add_damage(u.ux, u.uy, SHOP_PIT_COST);
            }
        } else
            await You(`continue ${verbing} downward.`);
        game.did_dig_msg = false;
        set_occupation(dig, verbing, 0);
    }
    return ECMD_TIME;
}

// src/dig.c:1362 watchman_canseeu()
function watchman_canseeu(mtmp) {
    if (is_watch(mtmp.data) && mtmp.mcansee && m_canseeu(mtmp)
        && mtmp.mpeaceful)
        return true;
    return false;
}

// src/dig.c:1377 watch_dig(); Return TRUE if any watchman sees you digging
// in a town; the watch complains and, on a repeat, arrests you.
export async function watch_dig(mtmp, x, y, zap) {
    const lev = game.level.at(x, y);
    const ctx = digging_context();

    if (in_town(x, y)
        && (closed_door(x, y) || lev.typ === SDOOR || IS_WALL(lev.typ)
            || IS_FOUNTAIN(lev.typ) || IS_TREE(lev.typ))) {
        if (!mtmp)
            mtmp = await get_iter_mons(watchman_canseeu);

        if (mtmp) {
            /* SetVoice(mtmp, 0, 80, 0) */
            if (zap || ctx.warned) {
                await verbalize("Halt, vandal!  You're under arrest!");
                await angry_guards(!!Deaf());
            } else {
                let str;

                if (IS_DOOR(lev.typ))
                    str = 'door';
                else if (IS_TREE(lev.typ))
                    str = 'tree';
                else if (IS_OBSTRUCTED(lev.typ))
                    str = 'wall';
                else
                    str = 'fountain';
                await verbalize(`Hey, stop damaging that ${str}!`);
                ctx.warned = true;
            }
            if (is_digging())
                await stop_occupation();
        }
    }
}

// src/dig.c:1414 mdig_tunnel(); Return TRUE if monster died, FALSE otherwise.
// Called from m_move().
export async function mdig_tunnel(mtmp) {
    let here;
    let sawit, seeit, trapped;
    const pile = rnd(12);

    here = game.level.at(mtmp.mx, mtmp.my);
    if (here.typ === SDOOR)
        cvt_sdoor_to_door(here); /* ->typ = DOOR */

    /* Eats away door if present & closed or locked */
    if (closed_door(mtmp.mx, mtmp.my)) {
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE))
            add_damage(mtmp.mx, mtmp.my, 0);
        sawit = canseemon(mtmp); /* before door state change and unblock_pt */
        trapped = (here.doormask & D_TRAPPED) ? true : false;
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
            if (game.flags.verbose) {
                if (!Unaware() && !rn2(3)) /* not too often.. */
                    await draft_message(true); /* "You feel an unexpected draft." */
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        here.typ = CORR, here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false); /* "You feel a draft." */
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) { /* no dig */
        return false;
    }

    /* Only rock, trees, and walls fall through to this point. */
    if ((here.wall_info & W_NONDIGGABLE) !== 0) {
        /* impossible("mdig_tunnel:  %s at (%d,%d) is undiggable", ...) */
        return false; /* still alive */
    }

    if (IS_WALL(here.typ)) {
        /* KMH -- Okay on arboreal levels (room walls are still stone) */
        if (game.flags.verbose && !rn2(5)) {
            /* Soundeffect(se_crashing_rock, 75) */
            await You_hear('crashing rock.');
        }
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE))
            add_damage(mtmp.mx, mtmp.my, 0);
        if (game.level.flags?.is_maze_lev) {
            here.typ = ROOM, here.flags = 0;
        } else if (game.level.flags?.is_cavernous_lev
                   && !in_town(mtmp.mx, mtmp.my)) {
            here.typ = CORR, here.flags = 0;
        } else {
            here.typ = DOOR, here.doormask = D_NODOOR;
        }
    } else if (IS_TREE(here.typ)) {
        here.typ = ROOM, here.flags = 0;
        if (pile && pile < 5)
            rnd_treefruit_at(mtmp.mx, mtmp.my);
    } else {
        here.typ = CORR, here.flags = 0;
        if (pile && pile < 5)
            mksobj_at((pile === 1) ? ONAMES.BOULDER : ONAMES.ROCK,
                      mtmp.mx, mtmp.my, true, false);
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(ONAMES.BOULDER, mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my); /* vision */

    return false;
}

// src/dig.c:1504 draft_message() — feeling the air change when a door or
// passage is breached somewhere.
export async function draft_message(unexpected) {
    /*
     * [Bug or TODO?  Have caller pass coordinates and use the travel
     * distance from hero to there to hide the message when far away.
     * That would need a modified version of dist2() that calculates
     * travel distance rather than straight-line distance, and would be
     * more of a nuisance for #terrain and possibly other things.]
     */
    if (unexpected) {
        if (!Hallucination())
            await You_feel('an unexpected draft.');
        else
            /* U.S. classification for troops with insufficient training
               or conditioning to be sent to the front is (or was) "1-A";
               it appears to be a pop culture reference from the 1960s
               and won't be understood by most players */
            await You_feel(`like you are ${
                (ACURR(A_STR) < 6 || ACURR(A_DEX) < 6 || ACURR(A_CON) < 6
                 || ACURR(A_CHA) < 6 || ACURR(A_INT) < 6 || ACURR(A_WIS) < 6)
                ? '4-F' : '1-A'}.`);
    } else {
        if (!Hallucination()) {
            await You_feel('a draft.');
        } else {
            /* from Discworld, according to a couple of citations found via
               Google; there's no source to attribute it to */
            const draft_reaction = ['enlisting', 'marching', 'protesting',
                                    'fleeing'];
            let dridx = rn1(2, 1 - sgn(game.u.ualign?.type ?? 0));
            if ((game.u.ualign?.record ?? 0) < STRIDENT)
                dridx += rn1(3, sgn(game.u.ualign?.type ?? 0) - 1);
            await You_feel(`like ${draft_reaction[dridx]}.`);
        }
    }
}

// src/dig.c:1548 zap_dig(); digging via wand zap or spell cast
export async function zap_dig() {
    const u = game.u;
    let room;
    let mtmp;
    let otmp;
    let trap_with_u = null;
    let zx, zy, flow_x = -1, flow_y = -1;
    let diridx = 8, digdepth;
    let shopdoor, shopwall, maze_dig, pitdig = false, pitflow = false;

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
        mtmp = u.ustuck;

        if (!is_whirly(mtmp.data)) {
            if (digests(mtmp.data))
                await You(`pierce ${s_suffix(mon_nam(mtmp))} ${
                    mbodypart(mtmp, STOMACH)} wall!`);
            if (unique_corpstat(mtmp.data))
                mtmp.mhp = Math.trunc((mtmp.mhp + 1) / 2);
            else
                mtmp.mhp = 1; /* almost dead */
            await expels(mtmp, mtmp.data, !digests(mtmp.data));
        }
        return;
    } /* swallowed */

    if (u.dz) {
        if (!Is_airlevel(u.uz) && !Is_waterlevel(u.uz) && !Underwater()) {
            if (u.dz < 0 || On_stairs(u.ux, u.uy)) {
                let dmg;

                if (On_stairs(u.ux, u.uy)) {
                    const stway = stairway_at(u.ux, u.uy);

                    await pline_The(`beam bounces off the ${
                        stway.isladder ? 'ladder' : 'stairs'} and hits the ${
                        ceiling(u.ux, u.uy)}.`);
                }
                await You(`loosen a rock from the ${ceiling(u.ux, u.uy)}.`);
                await pline(`It falls on your ${body_part(HEAD)}!`);
                dmg = rnd(hard_helmet(u.uarmh) ? 2 : 6);
                await losehp(Maybe_Half_Phys(dmg), 'falling rock', KILLED_BY_AN);
                otmp = mksobj_at(ONAMES.ROCK, u.ux, u.uy, false, false);
                if (otmp) {
                    xname(otmp); /* set dknown, maybe bknown */
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
    maze_dig = !!game.level.flags?.is_maze_lev && !Is_earthlevel(u.uz);
    zx = u.ux + u.dx;
    zy = u.uy + u.dy;
    if (u.utrap && u.utraptype === TT_PIT
        && (trap_with_u = t_at(u.ux, u.uy))) {
        pitdig = true;
        diridx = xytodir(u.dx, u.dy);
    }
    digdepth = rn1(18, 8);
    const beamCells = []; /* tmp_at(DISP_BEAM, cmap_to_glyph(S_digbeam)) */
    await flush_screen(0);
    while (--digdepth >= 0) {
        if (!isok(zx, zy))
            break;
        room = game.level.at(zx, zy);
        if (cansee(zx, zy)) {
            display_cmap_at(cmap_names.S_digbeam, zx, zy, CLR_WHITE,
                            'dig-beam');
            beamCells.push([zx, zy]);
            await flush_screen(0);
        }
        if (game.animationFrame)
            await game.animationFrame(); /* wait a little bit */

        if (pitdig) { /* we are already in a pit if this is true */
            const cc = { x: 0, y: 0 };
            let adjpit = t_at(zx, zy);

            if (diridx !== DIR_ERR
                && !conjoined_pits(adjpit, trap_with_u, false)) {
                digdepth = 0; /* limited to the adjacent location only */
                if (!(adjpit && is_pit(adjpit.ttyp))) {
                    const msg = { s: '' };

                    cc.x = zx;
                    cc.y = zy;
                    if (!adj_pit_checks(cc, msg)) {
                        if (msg.s)
                            await pline(msg.s);
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
                if (is_pool(zx, zy) || is_lava(zx, zy)) {
                    flow_x = zx - u.dx;
                    flow_y = zy - u.dy;
                    pitflow = true;
                }
                break;
            }
        } else if (closed_door(zx, zy) || room.typ === SDOOR) {
            if (in_rooms(zx, zy, SHOPBASE)) {
                add_damage(zx, zy, SHOP_DOOR_COST);
                shopdoor = true;
            }
            if (room.typ === SDOOR)
                room.typ = DOOR; /* doormask set below */
            else if (cansee(zx, zy))
                await pline_The('door is razed!');
            await watch_dig(null, zx, zy, true);
            room.doormask = D_NODOOR;
            recalc_block_point(zx, zy); /* vision */
            digdepth -= 2;
            if (maze_dig)
                break;
        } else if (maze_dig) {
            if (IS_WALL(room.typ)) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    if (in_rooms(zx, zy, SHOPBASE)) {
                        add_damage(zx, zy, SHOP_WALL_COST);
                        shopwall = true;
                    }
                    room.typ = ROOM, room.flags = 0;
                    unblock_point(zx, zy); /* vision */
                } else if (!Blind())
                    await pline_The('wall glows then fades.');
                break;
            } else if (IS_TREE(room.typ)) { /* check trees before stone */
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = ROOM, room.flags = 0;
                    unblock_point(zx, zy); /* vision */
                } else if (!Blind())
                    await pline_The('tree shudders but is unharmed.');
                break;
            } else if (room.typ === STONE || room.typ === SCORR) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = CORR, room.flags = 0;
                    unblock_point(zx, zy); /* vision */
                } else if (!Blind())
                    await pline_The('rock glows then fades.');
                break;
            }
        } else if (IS_OBSTRUCTED(room.typ)) {
            if (!may_dig(zx, zy))
                break;
            if (IS_WALL(room.typ) || room.typ === SDOOR) {
                if (in_rooms(zx, zy, SHOPBASE)) {
                    add_damage(zx, zy, SHOP_WALL_COST);
                    shopwall = true;
                }
                await watch_dig(null, zx, zy, true);
                if (game.level.flags?.is_cavernous_lev && !in_town(zx, zy)) {
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
    }                    /* while */
    for (const [x, y] of beamCells) /* tmp_at(DISP_END, 0): closing call */
        newsym(x, y);

    if (pitflow && isok(flow_x, flow_y)) {
        const ttmp = t_at(flow_x, flow_y);

        if (ttmp && is_pit(ttmp.ttyp)) {
            const filltyp = fillholetyp(ttmp.tx, ttmp.ty, true);

            if (filltyp !== ROOM)
                await pit_flow(ttmp, filltyp);
        }
    }

    if (shopdoor || shopwall)
        await pay_for_damage(shopdoor ? 'destroy' : 'dig into', false);
    return;
}

// src/dig.c:1763 adj_pit_checks(); evaluate whether an adjacent pit can be
// dug from the one the hero is in; msg.s receives any explanation
function adj_pit_checks(cc, msg) {
    let ltyp;
    let room;
    const foundation_msg =
                 'The foundation is too hard to dig through from this angle.';

    if (!cc)
        return false;
    if (!isok(cc.x, cc.y))
        return false;
    room = game.level.at(cc.x, cc.y);
    ltyp = room.typ, room.flags = 0;

    if (is_pool(cc.x, cc.y) || is_lava(cc.x, cc.y)) {
        /* this is handled by the caller after we return FALSE */
        return false;
    } else if (closed_door(cc.x, cc.y) || room.typ === SDOOR) {
        /* We could dig under the door, but that would create a pit
           in a doorway.  The pit code and the door code are not
           prepared to deal with this case */
        msg.s = foundation_msg;
        return false;
    } else if (IS_WALL(ltyp)) {
        /* if (!may_dig(cc->x, cc->y)) */
        msg.s = foundation_msg;
        return false;
    } else if (IS_TREE(ltyp)) { /* check trees before stone */
        /* if (!may_dig(cc->x, cc->y)) */
        msg.s = "The tree's roots glow then fade.";
        return false;
    } else if (ltyp === STONE || ltyp === SCORR) {
        if (room.wall_info & W_NONDIGGABLE) {
            msg.s = 'The rock glows then fades.';
            return false;
        }
    } else if (ltyp === IRONBARS) {
        msg.s = 'The bars go much deeper than your pit.';
        return false;
    } else if (IS_SINK(ltyp)) {
        msg.s = 'A tangled mass of plumbing remains below the sink.';
        return false;
    } else if (On_ladder(cc.x, cc.y)) {
        msg.s = 'The ladder is unaffected.';
        return false;
    } else {
        let supporting = null;

        if (IS_FOUNTAIN(ltyp))
            supporting = 'fountain';
        else if (IS_THRONE(ltyp))
            supporting = 'throne';
        else if (IS_ALTAR(ltyp))
            supporting = 'altar';
        else if (On_stairs(cc.x, cc.y))
            supporting = 'stairs';
        else if (ltyp === DRAWBRIDGE_DOWN   /* "lowered drawbridge" */
                 || ltyp === DBWALL)        /* "raised drawbridge" */
            supporting = 'drawbridge';

        if (supporting) {
            msg.s = `The ${s_suffix(supporting)} supporting structures remain intact.`;
            return false;
        }
    }
    return true;
}

// src/dig.c:1844 pit_flow(); Ensure that all conjoined pits fill up.
async function pit_flow(trap, filltyp) {
    if (trap && filltyp !== ROOM && is_pit(trap.ttyp)) {
        const t = { ...trap };
        let idx;

        game.level.at(t.tx, t.ty).typ = filltyp, game.level.at(t.tx, t.ty).flags = 0;
        await liquid_flow(t.tx, t.ty, filltyp, trap,
                          u_at(t.tx, t.ty)
                              ? 'Suddenly %s flows in from the adjacent pit!'
                              : null);
        for (idx = 0; idx < N_DIRS; ++idx) {
            if (t.conjoined & (1 << idx)) {
                let x, y;
                let t2;

                x = t.tx + xdir[idx];
                y = t.ty + ydir[idx];
                t2 = t_at(x, y);
                await pit_flow(t2, filltyp);
            }
        }
    }
}

// src/dig.c:1885 buried_ball(), the buried iron ball at or near <cc>;
// cc is moved to the ball's spot.
export function buried_ball(cc) {
    let odist, bdist = COLNO;
    let ball = null;

    /* FIXME:
     *  This is just approximate; if multiple balls are buried and we've
     *  picked the wrong one, the chain will be replaced in a different
     *  location than it was originally.
     */
    /* [an untrapped hero can't be the one being freed, so the value
       of u.utraptype is no longer meaningful; if u.utrap is still set
       then u.utraptype needs to be for buried ball] */
    if (!game.u.utrap || game.u.utraptype === TT_BURIEDBALL) {
        for (const otmp of (game.level.buriedobjs || [])) {
            if (otmp.otyp !== ONAMES.HEAVY_IRON_BALL)
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
                ball = otmp;
                bdist = odist;
            }
        }
    }
    if (ball) {
        cc.x = ball.ox;
        cc.y = ball.oy;
    }
    return ball;
}

// src/dig.c:1935 buried_ball_to_punishment()
export async function buried_ball_to_punishment() {
    const cc = { x: game.u.ux, y: game.u.uy };
    let ball;

    ball = buried_ball(cc);
    if (ball) {
        obj_extract_self(ball);
        await punish(ball); /* use ball as flag for unearthed buried ball */
        await reset_utrap(false);
        del_engr_at(cc.x, cc.y);
        newsym(cc.x, cc.y);
    }
}

// src/dig.c:1958 buried_ball_to_freedom(), dig the chained ball back up.
export async function buried_ball_to_freedom() {
    const cc = { x: game.u.ux, y: game.u.uy };
    let ball;

    ball = buried_ball(cc);
    if (ball) {
        obj_extract_self(ball);
        place_object(ball, cc.x, cc.y);
        stackobj(ball);
        await reset_utrap(true);
        del_engr_at(cc.x, cc.y);
        newsym(cc.x, cc.y);
    }
}

// src/dig.c:1984 bury_an_obj(); move objects from fobj/nexthere lists to
// buriedobjlist; the C returns the pile's next object so a caller can keep
// walking a chain it is mutating; this port's callers iterate a snapshot of
// the pile, so nothing is returned
export async function bury_an_obj(otmp, dealloced) {
    const u = game.u;
    let under_ice;

    if (dealloced)
        dealloced.v = false;
    if (otmp === u.uball) {
        unpunish();
        set_utrap(rn1(50, 20), TT_BURIEDBALL);
        await pline_The('iron ball gets buried!');
    }
    /*
     * obj_resists(,0,0) prevents Rider corpses from being buried.
     * It also prevents The Amulet and invocation tools from being
     * buried.  Since they can't be confined to bags and statues,
     * it makes sense that they can't be buried either, even though
     * the real reason there (direct accessibility when carried) is
     * completely different.
     */
    if (otmp === u.uchain || obj_resists(otmp, 0, 0))
        return null;

    if (otmp.otyp === ONAMES.LEASH && otmp.leashmon)
        o_unleash(otmp);

    if (otmp.lamplit && otmp.otyp !== ONAMES.POT_OIL)
        await end_burn(otmp, true);

    obj_extract_self(otmp);

    under_ice = is_ice(otmp.ox, otmp.oy);
    if ((otmp.otyp === ONAMES.ROCK && !under_ice) || otmp.otyp === ONAMES.BOULDER) {
        /* merges into burying material; boulder removal is for #wizbury */
        if (dealloced)
            dealloced.v = true;
        obfree(otmp);
        return null;
    }
    /*
     * Start a rot on organic material.  Not corpses -- they
     * are already handled.
     */
    if (otmp.otyp === ONAMES.CORPSE) {
        ; /* should cancel timer if under_ice */
    } else if ((under_ice ? (otmp.oclass === OCLASSES.POTION_CLASS) : is_organic(otmp))
               && !obj_resists(otmp, 5, 95)) {
        start_timer((under_ice ? 0 : 250) + rnd(250),
                    TIMER_OBJECT, ROT_ORGANIC, otmp);
    /* rusting of buried metal not yet implemented */
    }
    add_to_buried(otmp);
    return null;
}

// src/dig.c:2050 bury_objs()
export async function bury_objs(x, y) {
    let shkp;
    let loss = 0;
    let costly;

    costly = ((shkp = shop_keeper((in_rooms(x, y, SHOPBASE) || '\0').charCodeAt(0)))
              && costly_spot(x, y));

    for (const otmp of level_objects_pile(x, y)) {
        if (costly && !game.context?.mon_moving) {
            loss += await stolen_value(otmp, x, y, !!shkp.mpeaceful, true);
            if (otmp.oclass !== OCLASSES.COIN_CLASS)
                otmp.no_charge = 1;
        }
        await bury_an_obj(otmp, null);
    }

    /* don't expect any engravings here, but just in case */
    del_engr_at(x, y);
    newsym(x, y);
    maybe_unhide_at(x, y);

    if (costly && loss) {
        await You(`owe ${shkname(shkp)} ${loss} ${currency(loss)} for burying merchandise.`);
    }
}

// src/dig.c:2086 unearth_objs(); move objects from buriedobjlist to
// fobj/nexthere lists; if caller converts terrain from ice to something, it
// should call obj_ice_effects()
export async function unearth_objs(x, y) {
    const u = game.u;
    let bball;
    const cc = { x, y };

    bball = buried_ball(cc);
    for (const otmp of [...(game.level.buriedobjs || [])]) {
        if (otmp.ox === x && otmp.oy === y) {
            if (bball && otmp === bball
                && u.utrap && u.utraptype === TT_BURIEDBALL) {
                await buried_ball_to_punishment();
            } else {
                obj_extract_self(otmp);
                if (otmp.timed)
                    stop_timer(ROT_ORGANIC, otmp);
                place_object(otmp, x, y);
                stackobj(otmp);
            }
        }
    }
    del_engr_at(x, y);
    newsym(x, y);
}

// src/dig.c:2125 rot_organic(); The organic material has rotted away
// completely.  Remove it.  Note: this is used by the timers to rot away
// objects, so it must be a static (not "staticfn") routine.
export async function rot_organic(obj) {
    while (Has_contents(obj)) {
        /* We don't need to place contained object on the floor
           first, but we do need to update its map coordinates. */
        obj.cobj[0].ox = obj.ox, obj.cobj[0].oy = obj.oy;
        /* Every item in the container is now buried; if it was buried
           inside another buried item, bury_an_obj's use of
           obj_extract_self insures that Has_contents(obj) will
           eventually become false. */
        await bury_an_obj(obj.cobj[0], null);
    }
    obj_extract_self(obj);
    obfree(obj);
}

// src/dig.c:2146 rot_corpse(); Called when a corpse has rotted completely
// away.
export async function rot_corpse(obj) {
    const u = game.u;
    let x = 0, y = 0;
    const on_floor = obj.where === OBJ_FLOOR,
          in_invent = obj.where === OBJ_INVENT;

    if (on_floor) {
        x = obj.ox;
        y = obj.oy;
    } else if (in_invent) {
        if (game.flags.verbose) {
            const cname = corpse_xname(obj, null, CXN_NO_PFX);

            await Your(`${obj === u.uwep ? 'wielded ' : ''}${cname} ${
                otense(obj, 'rot')} away${obj === u.uwep ? '!' : '.'}`);
        }
        if (obj.owornmask) {
            await remove_worn_item(obj, true);
            await stop_occupation();
        }
    } else if (obj.where === OBJ_MINVENT) {
        if (obj.owornmask && obj === MON_WEP(obj.ocarry))
            await setmnotwielded(obj.ocarry, obj); /* clears owornmask */
    } else if (obj.where === OBJ_MIGRATING) {
        /* clear destination flag so that obfree()'s check for
           freeing a worn object doesn't get a false hit */
        obj.owornmask = 0;
    }
    await rot_organic(obj);
    if (on_floor) {
        const mtmp = m_at(x, y);

        /* a hiding monster may be exposed */
        if (mtmp && !OBJ_AT(x, y) && mtmp.mundetected
            && hides_under(mtmp.data)) {
            mtmp.mundetected = 0;
        } else if (u_at(x, y)
                   && u.uundetected && hides_under(game.youmonst.data))
            hideunder(game.youmonst);
        newsym(x, y);
    } else if (in_invent)
        update_inventory();
}
