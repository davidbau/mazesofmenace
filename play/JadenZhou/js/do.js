// do.js — level changes.
// C ref: do.c
//
// Ported so far: the #down/#up commands (dodown(), doup()),
// schedule_goto(), deferred_goto(), and goto_level() for a new level
// reached by stairs or by level teleport, through docrt() and the arrival
// messages.  Portal/falling arrival and returning to a saved level are not
// ported yet.

import { sellobj_state } from './pickup.js';
import { SELL_NORMAL, SELL_DELIBERATE } from './const.js';
import { game } from './gstate.js';
import { fix_shop_damage } from './shk.js';
import { livelog_printf, You_hear } from './display.js';
import { LL_ACHIEVE, LL_DEBUG, LL_CONDUCT } from './const.js';
import { describe_level } from './botl.js';
import { container_impact_dmg, obj_delivery, drop_to } from './dokick.js';
import { MIGR_NOWHERE, MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_LADDER_UP, MIGR_SSTAIRS,
         TRAPDOOR, CXN_PFX_THE, OBJ_AT } from './const.js';
import { Tobjnam, otense, corpse_xname, an } from './objnam.js';
import { is_unpaid } from './shk.js';
import { maybe_unhide_at } from './mon.js';
import { remove_worn_item } from './steal.js';
import { breaktest, hitfloor } from './dothrow.js';
import { finesse_ahriman } from './artifact.js';
import { float_down } from './trap.js';
import { W_ART, W_ARTI, I_SPECIAL } from './const.js';
import { change_luck } from './attrib.js';
import { obj_extract_self, add_to_migration } from './mkobj.js';
import { obfree } from './invent.js';
import { discard_minvent } from './steal.js';
import { emits_light, digests } from './mondata.js';
import { del_light_source } from './light.js';
import { monst_to_any } from './timeout.js';
import { LS_MONSTER } from './const.js';
import { LOW_PM as LOW_PM_do, NUMMONS as NUMMONS_do } from './monsters.js';
import {
    pline, pline_The, docrt, flush_screen
} from './display.js';
import { bones_include_name } from './bones.js';
import { sellobj } from './shk.js';
import { stolen_value, costly_spot, picked_container } from './shk.js';
import { in_rooms } from './hack.js';
import { SHOPBASE } from './const.js';
import { olfaction } from './mondata.js';
import { ACH_HELL, ACH_MINE, ACH_SOKO, ACH_BGRM } from './const.js';
import { Is_rogue_level, ROGUESET, PRIMARYSET } from './const.js';
import {
    depth, dunlev, dunlevs_in_dungeon, ledger_no, on_level, assign_level,
    In_hell, builds_up, at_dgn_entrance, level_difficulty,
    In_W_tower, recalc_mapseen, recbranch_mapseen, remdun_mapseen,
    print_level_annotation,
} from './dungeon.js';
import { In_endgame, Is_waterlevel, Is_airlevel, IS_ALTAR, ROOM, CORR, MAGIC_PORTAL, Is_qstart } from './const.js';
import * as O from './objects.js';
import { mpickobj as mpickobj_do } from './steal.js';
import { touch_petrifies as touch_petrifies_do } from './mondata.js';
import { mons as mons_do, PM_WRAITH as PM_WRAITH_do, PM_NURSE as PM_NURSE_do,
         PM_GREEN_SLIME as PM_GREEN_SLIME_do } from './monsters.js';
import { polyfood as polyfood_do, newcham as newcham_do, healmon as healmon_do } from './mon.js';
import { NC_SHOW_MSG as NC_SHOW_MSG_do, NO_NC_FLAGS as NO_NC_FLAGS_do } from './const.js';
import { grow_up as grow_up_do } from './makemon.js';
import { mcureblindness as mcureblindness_do } from './muse.js';
import { delobj as delobj_do } from './invent.js';
import { is_pool, is_lava } from './makemon.js';
import { t_at, is_pit, is_hole, set_utrap, seetrap, lava_damage, climb_pit } from './trap.js';
import { minstapetrify } from './trap.js';
import { cansee } from './vision.js';
import { PM_TOURIST, PM_ROGUE } from './monsters.js';
import { onquest, ok_to_quest } from './quest.js';
import { com_pager, deliver_splev_message } from './questpgr.js';
import { more_experienced, newexplevel } from './exper.js';
import { check_special_room } from './hack.js';
import { pickup } from './pickup.js';
import { keepdogs, losedogs } from './dog.js';
import { kill_genocided_monsters, disturb_buried_zombies } from './mon.js';
import { run_timers } from './timeout.js';
import { savelev } from './save.js';
import { create_levelfile, level_info, open_levelfile } from './files.js';
import { getlev } from './restore.js';
import { oinit } from './o_init.js';
import { in_out_region } from './region.js';
import { close_nhfile } from './sfbase.js';
import { LFILE_EXISTS, VISITED, WRITING, FREEING } from './const.js';
import { m_at } from './makemon.js';
import { mklev, place_lregion } from './mklev.js';
import { tutorial, nhl_done } from './nhlua.js';
import { fumaroles, movebubbles } from './mkmaze.js';
import { resurrect } from './wizard.js';
import { ACH_ENDG } from './const.js';
import { delete_levelfile } from './files.js';
import { maxledgerno, ledger_to_dnum } from './dungeon.js';
import { vision_reset, vision_recalc } from './vision.js';
import { LR_UPTELE, LR_DOWNTELE } from './const.js';
import { getobj, any_obj_ok, freeinv, stackobj } from './invent.js';
import { query_category, query_objlist, add_valid_menu_class, allow_all,
         allow_category, count_justpicked, find_justpicked } from './pickup.js';
import { bypass_objlist, nxt_unbypassed_obj } from './worn.js';
import { splitobj } from './mkobj.js';
import { MENU_FULL, MENU_TRADITIONAL, MENU_COMBINATION, UNPAID_TYPES,
         ALL_TYPES, CHOOSE_ALL, BUC_BLESSED, BUC_CURSED, BUC_UNCURSED,
         BUC_UNKNOWN, JUSTPICKED, INCLUDE_VENOM, PICK_ANY, ALL_TYPES_SELECTED,
         USE_INVLET, INVORDER_SORT } from './const.js';
import { GETOBJ_PROMPT, GETOBJ_ALLOWCNT, ECMD_FAIL, ECMD_TIME, W_ARMOR,
         W_ACCESSORY, W_SADDLE, IS_SINK, LOST_DROPPED } from './const.js';
import { welded, setuwep, setuqwep, setuswapwep, weldmsg } from './wield.js';
import { Norep } from './display.js';
import { makeplural } from './objnam.js';
import { HAND } from './const.js';
import { placebc, unplacebc, drag_down, ballrelease, drop_ball, ballfall } from './ball.js';
import { You, newsym, stairway_at } from './display.js';
import { can_reach_floor } from './engrave.js';
import { doname } from './objnam.js';
import { place_object } from './mkobj.js';
import { encumber_msg } from './pickup.js';
import { rn2, rnd, d } from './rng.js';
import { You_cant, Your } from './display.js';
import { BLINDED, TIMEOUT, FACE } from './const.js';
import { incr_itimeout, set_itimeout, make_blinded } from './potion.js';
import { body_part, record_achievement } from './insight.js';
import { set_occupation } from './allmain.js';
import { ECMD_OK, LADDER, UNENCUMBERED, SLT_ENCUMBER, TOOKPLUNGE, KILLED_BY,
         TT_PIT, Is_stronghold, RLOC_NOMSG, LEVITATION, FLYING,
         FUMBLING } from './const.js';
import { set_move_cmd } from './cmd.js';
import { HOLE, VIBRATING_SQUARE, dotrap, u_locomotion, losehp,
         Maybe_Half_Phys, selftouch } from './trap.js';
import { u_rooted, near_capacity } from './hack.js';
import { stucksteed } from './steed.js';
import { next_to_u, enexto, mnexto, rloc } from './teleport.js';
import { Can_fall_thru, u_on_newpos, stairway_find_from, u_on_sstairs,
         u_on_upstairs, u_on_dnstairs } from './mklev.js';
import { uteetering_at_seen_pit, uescaped_shaft, sticks,
         ceiling_hider } from './engrave.js';
import { mon_nam, hcolor } from './do_name.js';
import { set_ustuck } from './uhitm.js';
import { AT_ENGL, AD_DGST } from './monsters.js';
import { STAIRS } from './const.js';
import {
    Punished, Blind, Hallucination, Deaf, Fumbling, HLevitation, ELevitation, Levitation,
    Flying
} from './youprop.js';
import { Upolyd, u_at } from './const.js';
import { uprop } from './youprop.js';
import { done as done_do } from './end.js';
import { ESCAPED as ESCAPED_DO } from './const.js';
import { impact_drop } from './dokick.js';
import { water_damage as water_damage_do } from './trap.js';
import { weight as weight_do } from './mkobj.js';
import { map_background as map_background_do } from './display.js';
import { use_pick_axe2 } from './dig.js';
import { WT_SPLASH_THRESHOLD as WT_SPLASH_THRESHOLD_DO, ER_DESTROYED as ER_DESTROYED_DO,
         DEAF as DEAF_DO } from './const.js';
import { upstart } from './hacklib.js';
import { is_pool_or_lava, impossible } from './hack.js';
import { waterbody_name } from './pager.js';
import { IS_WATERWALL, DRAWBRIDGE_UP, DB_UNDER, DB_FLOOR, next2u } from './const.js';
import { recalc_block_point } from './vision.js';
import { DEADMONSTER, mondied, wake_nearto } from './mon.js';
import { m_in_air } from './monmove.js';
import { delfloortrap, set_uinwater } from './trap.js';
import { bury_objs } from './dig.js';
import { y_monnam } from './do_name.js';
import { vtense, xname } from './objnam.js';
import { the } from './iactions.js';
import { There } from './display.js';
import { hliquid, burn_away_slime } from './potion.js';
import { Fire_resistance } from './youprop.js';
import { useupf } from './invent.js';
import { dist2 } from './hacklib.js';
import { tty_yn_function } from './wintty.js';
import { is_pick, bimanual } from './objects.js';
import { I_SPECIAL as I_SPECIAL_DO, W_ARTI as W_ARTI_DO } from './const.js';
import { BLevitation as BLevitation_do } from './youprop.js';
import { float_down as float_down_do } from './trap.js';
import { surface as surface_do } from './iactions.js';
import { floating_above as floating_above_do } from './fountain.js';
import { s_suffix } from './hacklib.js';
import { mbodypart } from './insight.js';
import { yobjnam } from './objnam.js';
import { STOMACH as STOMACH_do } from './const.js';
import { Luck } from './const.js';
import { is_plural } from './wield.js';
import { obj_resists } from './dogmove.js';
import { breakobj } from './dothrow.js';
import { gulp_blnd_check } from './mhitu.js';

/* C ref: cmd.c DIR_DOWN, DIR_UP (after the 8 compass directions) */
const DIR_DOWN = 8, DIR_UP = 9;

// C ref: do.c u_stuck_cannot_go()
async function u_stuck_cannot_go(updn) {
    const u = game.u;
    if (u.ustuck) {
        if (u.uswallow || !sticks(game.youmonst.data)) {
            await You(`are ${!u.uswallow ? "being held"
                             : digests(u.ustuck.data) ? "swallowed"
                               : "engulfed"}, and cannot go ${updn}.`);
            return true;
        } else {
            const mtmp = u.ustuck;

            set_ustuck(null);
            await You(`release ${mon_nam(mtmp)}.`);
        }
    }
    return false;
}

// C ref: do.c dodown()
/* the #down command */
export async function dodown() {
    const g = game;
    const u = g.u;
    let trap = null;
    let stway;
    let stairs_down, ladder_down;

    set_move_cmd(DIR_DOWN, 0);

    if (await u_rooted())
        return ECMD_TIME;

    if (await stucksteed(true)) {
        return ECMD_OK;
    }

    stairs_down = ladder_down = false;
    if ((stway = stairway_at(u.ux, u.uy)) != null && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }

    /* Levitation might be blocked, but player can still use '>' to
       turn off controlled levitation */
    if (HLevitation() || ELevitation()) {
        if ((HLevitation() & I_SPECIAL_DO) || (ELevitation() & W_ARTI_DO)) {
            /* end controlled levitation */
            if (ELevitation() & W_ARTI_DO)
                /* the age of each artifact with invoked levitation
                   (artifact_has_invprop()) gets rnz(100) */
                throw new Error('dodown(): ending artifact levitation not ported yet');
            if (await float_down_do(I_SPECIAL_DO | TIMEOUT, W_ARTI_DO)) {
                return ECMD_TIME; /* came down, so moved */
            } else if (!HLevitation() && !ELevitation()) {
                await Your("latent levitation ceases.");
                return ECMD_TIME; /* did something, effectively moved */
            }
        }
        if (BLevitation_do()) {
            ; /* weren't actually floating after all */
        } else if (Blind()) {
            /* glyph_to_cmap() is a macro which expands its argument many
               times; use this to do part of its work just once */
            const glyph_at_uxuy = g.level.at(u.ux, u.uy).remembered_glyph;

            /* Avoid alerting player to an unknown stair or ladder.
             * Changes the message for a covered, known staircase
             * too; staircase knowledge is not stored anywhere.
             */
            if (stairs_down)
                stairs_down = (glyph_at_uxuy?.cmapidx === 26 /* S_dnstair */);
            else if (ladder_down)
                ladder_down = (glyph_at_uxuy?.cmapidx === 28 /* S_dnladder */);
        }
        if (Is_airlevel(u.uz))
            await You(`are floating in the ${surface_do(u.ux, u.uy)}.`);
        else if (Is_waterlevel(u.uz))
            await You(`are floating in ${
                is_pool(u.ux, u.uy) ? "the water" : "a bubble of air"}.`);
        else
            await floating_above_do(stairs_down ? "stairs"
                                    : ladder_down ? "ladder"
                                      : surface_do(u.ux, u.uy));
        return ECMD_OK; /* didn't move */
    }

    if (Upolyd() && ceiling_hider(g.youmonst.data) && u.uundetected) {
        throw new Error('dodown(): ceiling hider coming out of hiding not ported yet');
    }

    if (await u_stuck_cannot_go("down"))
        return ECMD_TIME;

    if (!stairs_down && !ladder_down) {
        trap = t_at(u.ux, u.uy);
        if (trap && (uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
            await dotrap(trap, TOOKPLUNGE);
            return ECMD_TIME;
        } else if (!trap || !is_hole(trap.ttyp)
                   || !Can_fall_thru(u.uz) || !trap.tseen) {
            if (g.flags.autodig && !g.context.nopick
                && g.uwep && is_pick(g.uwep)) {
                return await use_pick_axe2(g.uwep);
            } else {
                await You_cant(`go down here${
                    (trap && trap.ttyp === VIBRATING_SQUARE) ? " yet" : ""}.`);
                return ECMD_OK;
            }
        }
    }
    const valley = g.dungeon_topology?.d_valley_level;
    if (valley && valley.dlevel && on_level(valley, u.uz)
        && !u.uevent.gehennom_entered) {
        throw new Error('dodown(): the gate to Gehennom not ported yet');
    }

    if (!await next_to_u()) {
        await You("are held back by your pet!");
        return ECMD_OK;
    }

    if (trap) {
        /* "You jump down the hole." / "squeeze through the trap door" */
        throw new Error('dodown(): jumping into a hole or trap door not ported yet');
    }
    if (trap && Is_stronghold(u.uz)) {
        throw new Error('dodown(): goto_hell() not ported yet');
    } else {
        g.at_ladder = (g.level.at(u.ux, u.uy).typ === LADDER);
        await next_level(!trap);
        g.at_ladder = false;
    }
    return ECMD_TIME;
}

// C ref: do.c doup()
/* the #up command - move up a staircase */
export async function doup() {
    const g = game;
    const u = g.u;
    const stway = stairway_at(u.ux, u.uy);

    set_move_cmd(DIR_UP, 0);

    if (await u_rooted())
        return ECMD_TIME;

    /* "up" to get out of a pit... */
    if (u.utrap && u.utraptype === TT_PIT) {
        await climb_pit();
        return ECMD_TIME;
    }

    if (!stway || (stway && !stway.up)) {
        await You_cant("go up here.");
        return ECMD_OK;
    }
    if (await stucksteed(true)) {
        return ECMD_OK;
    }

    if (await u_stuck_cannot_go("up"))
        return ECMD_TIME;

    if (near_capacity() > SLT_ENCUMBER) {
        /* No levitation check; inv_weight() already allows for it */
        await pline(`Your load is too heavy to climb the ${
            g.level.at(u.ux, u.uy).typ === STAIRS ? "stairs" : "ladder"}.`);
        return ECMD_TIME;
    }
    if (ledger_no(u.uz) === 1) {
        /* iflags.debug_fuzzer isn't ported */
        if (await tty_yn_function("Beware, there will be no return!  Still climb?",
                                  "yn", 'n') !== 'y') /* y_n() */
            return ECMD_OK;
    }
    if (!await next_to_u()) {
        await You("are held back by your pet!");
        return ECMD_OK;
    }
    g.at_ladder = (g.level.at(u.ux, u.uy).typ === LADDER);
    await prev_level(true);
    g.at_ladder = false;
    return ECMD_TIME;
}

// C ref: dungeon.c next_level()
/* goto the next level (or appropriate dungeon) */
export async function next_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    const newlevel = { dnum: 0, dlevel: 0 };

    if (at_stairs && stway)
        stway.u_traversed = true;

    if (at_stairs && stway) {
        newlevel.dnum = stway.tolev.dnum;
        newlevel.dlevel = stway.tolev.dlevel;
        await goto_level(newlevel, at_stairs, false, false);
    } else {
        newlevel.dnum = u.uz.dnum;
        newlevel.dlevel = u.uz.dlevel + 1;
        await goto_level(newlevel, at_stairs, !at_stairs, false);
    }
}

// C ref: dungeon.c prev_level()
/* goto the previous level (or appropriate dungeon) */
export async function prev_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    const newlevel = { dnum: 0, dlevel: 0 };

    if (at_stairs && stway)
        stway.u_traversed = true;

    if (at_stairs && stway && stway.tolev.dnum !== u.uz.dnum) {
        /* Taking an up dungeon branch. */
        /* KMH -- Upwards branches are okay if not level 1 */
        /* (Just make sure it doesn't go above depth 1) */
        if (!u.uz.dnum && u.uz.dlevel === 1 && !u.uhave?.amulet)
            throw new Error('prev_level(): done(ESCAPED) not ported yet');
        else {
            newlevel.dnum = stway.tolev.dnum;
            newlevel.dlevel = stway.tolev.dlevel;
            await goto_level(newlevel, at_stairs, false, false);
        }
    } else {
        /* Going up a stairs or rising through the ceiling. */
        newlevel.dnum = u.uz.dnum;
        newlevel.dlevel = u.uz.dlevel - 1;
        await goto_level(newlevel, at_stairs, false, false);
    }
}

// C ref: do.c u_collide_m()
/* when arriving on a level, if hero and a monster are trying to share same
   spot, move one; extracted from goto_level(); also used by wiz_makemap() */
export async function u_collide_m(mtmp) {
    const g = game;
    const u = g.u;
    const cc = { x: 0, y: 0 };

    if (!mtmp || mtmp === u.usteed || mtmp !== m_at(u.ux, u.uy)) {
        /* impossible("level arrival collision: %s?", ...) */
        throw new Error('u_collide_m(): impossible() level arrival collision not ported yet');
    }

    /* There's a monster at your target destination; it might be one
       which accompanied you--see mon_arrive(dogmove.c)--or perhaps
       it was already here.  Randomly move you to an adjacent spot
       or else the monster to any nearby location.  Prior to 3.3.0
       the latter was done unconditionally. */
    if (!rn2(2) && enexto(cc, u.ux, u.uy, g.youmonst.data)
        && Math.abs(cc.x - u.ux) <= 1 && Math.abs(cc.y - u.uy) <= 1) /* next2u() */
        await u_on_newpos(cc.x, cc.y); /*[maybe give message here?]*/
    else
        await mnexto(mtmp, RLOC_NOMSG);

    if ((mtmp = m_at(u.ux, u.uy)) != null) {
        /* there was an unconditional impossible("mnexto failed")
           here, but it's not impossible and we're prepared to cope
           with the situation, so only say something when debugging */
        if (g.flags.debug)
            await pline("(monster in hero's way)");
        if (!await rloc(mtmp, RLOC_NOMSG) || (mtmp = m_at(u.ux, u.uy)) != null)
            /* no room to move it; send it away, to return later */
            throw new Error('u_collide_m(): m_into_limbo() not ported yet');
    }
}

export const UTOTYPE_NONE = 0x00;
export const UTOTYPE_ATSTAIRS = 0x01;
export const UTOTYPE_FALLING = 0x02;
export const UTOTYPE_PORTAL = 0x04;
export const UTOTYPE_RMPORTAL = 0x10; /* remove portal */
export const UTOTYPE_DEFERRED = 0x20; /* deferred_goto */

// C ref: do.c schedule_goto()
export function schedule_goto(tolev, utotype_flags, pre_msg, post_msg) {
    const u = game.u;
    /* UTOTYPE_DEFERRED is used, so UTOTYPE_NONE can trigger deferred_goto() */
    u.utotype = utotype_flags | UTOTYPE_DEFERRED;
    /* destination level */
    assign_level(u.utolev, tolev);

    if (pre_msg)
        game.dfr_pre_msg = pre_msg;
    if (post_msg)
        game.dfr_post_msg = post_msg;
}

// C ref: do.c deferred_goto()
/* handle something like portal ejection */
export async function deferred_goto() {
    const u = game.u;
    if (!on_level(u.uz, u.utolev)) {
        const dest = { dnum: 0, dlevel: 0 }, oldlev = { dnum: 0, dlevel: 0 };
        const typmask = u.utotype; /* save it; goto_level zeroes u.utotype */

        assign_level(dest, u.utolev);
        assign_level(oldlev, u.uz);
        if (game.dfr_pre_msg)
            await pline(game.dfr_pre_msg);
        await goto_level(dest, !!(typmask & UTOTYPE_ATSTAIRS),
                         !!(typmask & UTOTYPE_FALLING),
                         !!(typmask & UTOTYPE_PORTAL));
        if (typmask & UTOTYPE_RMPORTAL) /* remove portal */
            throw new Error('deferred_goto(): removing a portal not ported yet');
        if (game.dfr_post_msg && !on_level(u.uz, oldlev))
            await pline(game.dfr_post_msg);
    }
    u.utotype = UTOTYPE_NONE; /* our caller keys off of this */
    game.dfr_pre_msg = null;
    game.dfr_post_msg = null;
}

// C ref: do.c currentlevel_rewrite()
async function currentlevel_rewrite() {
    /* since level change might be a bit slow, flush any buffered screen
     *  output (like "you fall through a trap door") */
    /* mark_synch(): the tty port writes output as it goes */

    const whynot = { v: '' };
    const nhfp = create_levelfile(ledger_no(game.u.uz), whynot);
    if (!nhfp) {
        /*
         * This is not quite impossible: e.g., we may have
         * exceeded our quota. If that is the case then we
         * cannot leave this level, and cannot save either.
         * Another possibility is that the directory was not
         * writable.
         */
        await pline(whynot.v);
        return null;
    }

    return nhfp;
}

// C ref: do.c familiar_level_msg()
async function familiar_level_msg() {
    const fam_msgs = [
        "You have a sense of deja vu.",
        "You feel like you've been here before.",
        "This place %s familiar...", null /* no message */
    ];
    const halu_fam_msgs = [
        "Whoa!  Everything %s different.",
        "You are surrounded by twisty little passages, all alike.",
        "Gee, this %s like uncle Conan's place...", null /* no message */
    ];
    let mesg;
    const which = rn2(4);

    if (Hallucination())
        mesg = halu_fam_msgs[which];
    else
        mesg = fam_msgs[which];
    if (mesg && mesg.includes('%')) {
        mesg = mesg.replace('%s', !Blind() ? "looks" : "seems");
    }
    if (mesg)
        await pline(mesg);
}

// C ref: mklev.c free_luathemes()
function free_luathemes(theme_group) {
    const g = game;
    let i;

    /*
     * Release which group(s)?
     *  tut_themes  => leaving tutorial, free tutorial themes only;
     *  most_themes => entering endgame, free non-endgame themes;
     *  all_themes  => end of game, free all themes.
     */
    for (i = 0; i < g.n_dgns; ++i) {
        if ((theme_group === 'tut_themes' && i !== g.dungeon_topology.d_tutorial_dnum)
            || (theme_group === 'most_themes'
                && i === g.dungeon_topology.d_astral_level.dnum))
            continue;
        if (g.luathemes?.[i]) {
            nhl_done(g.luathemes[i]);
            g.luathemes[i] = null;
        }
    }
}

// C ref: dog.c discard_migrations()
function discard_migrations() {
    let mtmp, mprev;
    let otmp, oprev;
    const dest = { dnum: 0, dlevel: 0 };

    /* mprev is null for &gm.migrating_mons, else the monster whose nmon
       links to the current one */
    for (mprev = null; (mtmp = (mprev ? mprev.nmon : game.migrating_mons)) != null; ) {
        dest.dnum = mtmp.mux;
        dest.dlevel = mtmp.muy;
        /* the Wizard is kept regardless of location so that he is
           ready to be brought back; nothing should be scheduled to
           migrate to the endgame but if we find such, we'll keep it */
        if (mtmp.iswiz || In_endgame(dest)) {
            mprev = mtmp; /* keep mtmp on migrating_mons */
        } else {
            /* remove mtmp from migrating_mons */
            if (mprev)
                mprev.nmon = mtmp.nmon || null;
            else
                game.migrating_mons = mtmp.nmon || null;
            mtmp.nmon = null;
            discard_minvent(mtmp, false);
            /* bypass mongone() and its call to m_detach() plus dmonsfree() */
            if (emits_light(mtmp.data))
                del_light_source(LS_MONSTER, monst_to_any(mtmp));
            /* dealloc_monst(mtmp): garbage collected */
        }
    }

    /* objects get similar treatment */
    for (oprev = null; (otmp = (oprev ? oprev.nobj : game.migrating_objs)) != null; ) {
        dest.dnum = otmp.ox;
        dest.dlevel = otmp.oy;
        /* there is no special case like the Wizard (certainly not the
           Amulet; the hero has to be carrying it to enter the endgame
           which triggers the call to this routine); again we don't
           expect any objects to be migrating to the endgame but will
           keep any we find so that they could be delivered */
        if (In_endgame(dest)) {
            oprev = otmp; /* keep otmp on migrating_objs */
        } else {
            /* bypass obj_extract_self() */
            /* remove otmp from migrating_objs */
            if (oprev)
                oprev.nobj = otmp.nobj || null;
            else
                game.migrating_objs = otmp.nobj || null;
            otmp.nobj = null;
            otmp.where = 'OBJ_FREE';
            otmp.owornmask = 0; /* overloaded for destination usage;
                                 * obfree() will complain if nonzero */
            /*
             * obfree(otmp,)
             *  -> dealloc_obj(otmp)
             *      -> obj_stop_timers(otmp)
             *      -> del_light_source(LS_OBJECT, obj_to_any(otmp))
             */
            obfree(otmp, null); /* releases any contents too */
        }
    }
}

// C ref: do.c goto_level()
export async function goto_level(newlevel, at_stairs, falling, portal) {
    const g = game;
    const u = g.u;
    let up = (depth(newlevel) < depth(u.uz));
    const newdungeon = (u.uz.dnum !== newlevel.dnum);
    let leaving_tutorial = false;
    let new_ = false, familiar = false;
    const dist = depth(newlevel) - depth(u.uz);
    let do_fall_dmg = false;
    const prev_temperature = g.level.flags?.temperature || 0;
    const was_in_W_tower = In_W_tower(u.ux, u.uy, u.uz);

    if (dunlev(newlevel) > dunlevs_in_dungeon(newlevel))
        newlevel.dlevel = dunlevs_in_dungeon(newlevel);
    if (newdungeon) {
        const tutorial_dnum = g.dungeon_topology.d_tutorial_dnum;
        if (In_endgame(newlevel)) { /* 1st Endgame Level !!! */
            if (!u.uhave?.amulet)
                return;  /* must have the Amulet */
            if (!g.flags.debug) /* wizard ^V can bypass Earth level */
                assign_level(newlevel, g.dungeon_topology.d_earth_level); /* (redundant) */
        } else if (newlevel.dnum === tutorial_dnum) { /* In_tutorial(newlevel) */
            await tutorial(true); /* entering tutorial */
        } else if (u.uz.dnum === tutorial_dnum) { /* In_tutorial(&u.uz) */
            await tutorial(false); /* leaving tutorial */
            up = false; /* re-enter level 1 as if starting new game */
            leaving_tutorial = true;
        }
    }
    let new_ledger = ledger_no(newlevel);
    if (new_ledger <= 0)
        await done_do(ESCAPED_DO); /* in fact < 0 is impossible */

    /* the "mysterious force" when climbing out of Gehennom with the
       Amulet */
    if (In_hell(u.uz) && up && u.uhave?.amulet && !newdungeon && !portal
        && (dunlev(u.uz) < dunlevs_in_dungeon(u.uz) - 3))
        throw new Error('goto_level(): mysterious force not ported yet');

    /* Prevent the player from going past the first quest level unless
     * (s)he has been given the go-ahead by the leader.
     */
    const qstart_level = g.dungeon_topology?.d_qstart_level;
    if (qstart_level && qstart_level.dlevel && on_level(u.uz, qstart_level)
        && !newdungeon && !ok_to_quest()) {
        await pline("A mysterious force prevents you from descending.");
        return;
    }

    if (on_level(newlevel, u.uz))
        return; /* this can happen */

    /* nh_callback_run(NHCB_LVL_LEAVE): no level-leave callbacks are
       registered by the ported nhcore.lua */

    /* tethered movement makes level change while trapped feasible */
    /* u.utrap && u.utraptype == TT_BURIEDBALL: punishment not ported */

    const nhfp = await currentlevel_rewrite();
    if (!nhfp)
        return;

    /* maybe_reset_pick(), reset_trapset(): no lock-picking or trap-setting
       context is ported yet */
    if (g.iflags?.travelcc) g.iflags.travelcc.x = g.iflags.travelcc.y = 0;
    if (g.context?.polearm) g.context.polearm.hitmon = null;

    if (falling) /* assuming this is only trap door or hole */
        await impact_drop(null, u.ux, u.uy, newlevel.dlevel);

    await check_special_room(true); /* probably was a trap door */
    if (Punished())
        unplacebc();
    /* reset_utrap(FALSE); needed in level_tele */
    set_utrap(0, 0);
    /* fill_pit(u.ux, u.uy): pits aren't ported yet */
    /* set_ustuck((struct monst *) 0) */
    u.ustuck = null;
    u.uswallow = 0;
    /* set_uinwater(0) */
    u.uinwater = 0;
    u.uundetected = 0; /* not hidden, even if means are available */
    if (!g.iflags?.nofollowers)
        await keepdogs(false);
    recalc_mapseen(); /* recalculate map overview before we leave the level */
    /*
     *  We no longer see anything on the level.  Make sure that this
     *  follows u.uswallow set to null since uswallow overrides all
     *  normal vision.
     */
    vision_recalc(2);

    /*
     * Save the level we're leaving.  If we're entering the endgame,
     * we can get rid of all existing levels because they cannot be
     * reached any more.  We still need to use savelev()'s cleanup
     * for the level being left, to recover dynamic memory in use and
     * to avoid dangling timers and light sources.
     * (The level "file" is an in-memory record list; see files.js.)
     */
    const cant_go_back = ((newdungeon && In_endgame(newlevel))
                          || leaving_tutorial);
    if (!cant_go_back) {
        /* update_mlstmv(): current monsters are becoming inactive */
        for (let m = g.fmon; m; m = m.nmon)
            if (!(m.mhp <= 0))
                m.mlstmv = g.moves;
        /* if (nhfp->structlevel) bufon(nhfp->fd): no buffering to do */
    } else {
        free_luathemes(leaving_tutorial ? 'tut_themes' : 'most_themes');
    }
    const save_mode = nhfp.mode;
    nhfp.mode = cant_go_back ? FREEING : (WRITING | FREEING);
    savelev(nhfp, ledger_no(u.uz));
    nhfp.mode = save_mode;
    close_nhfile(nhfp);
    if (cant_go_back) {
        const tutorial_dnum = g.dungeon_topology.d_tutorial_dnum;
        let l_idx;
        /* discard unreachable levels; keep #0 */
        for (l_idx = maxledgerno(); l_idx > 0; --l_idx)
            if (!leaving_tutorial || ledger_to_dnum(l_idx) === tutorial_dnum)
                delete_levelfile(l_idx);
        /* mark #overview data for all dungeon branches as uninteresting */
        for (l_idx = 0; l_idx < g.n_dgns; ++l_idx)
            if (!leaving_tutorial || l_idx === tutorial_dnum)
                remdun_mapseen(l_idx);
        /* get rid of mons & objs scheduled to migrate to discarded levels */
        discard_migrations();
    }

    if (Is_rogue_level(newlevel) || Is_rogue_level(u.uz))
        game.currentgraphics = Is_rogue_level(newlevel) ? ROGUESET : PRIMARYSET; /* assign_graphics() */
    /* check_gold_symbol(): display only */
    /* record this level transition as a potential seen branch unless using
     * some non-standard means of transportation (level teleport).
     */
    if ((at_stairs || falling || portal) && (u.uz.dnum !== newlevel.dnum))
        recbranch_mapseen(u.uz, newlevel);
    assign_level(u.uz0, u.uz);
    assign_level(u.uz, newlevel);
    assign_level(u.utolev, newlevel);
    u.utotype = UTOTYPE_NONE;
    const dptr = g.dungeons[u.uz.dnum];
    if (!builds_up(u.uz)) { /* usual case */
        if (dunlev(u.uz) > dptr.dunlev_ureached)
            dptr.dunlev_ureached = dunlev(u.uz);
    } else {
        if (dptr.dunlev_ureached === 0
            || dunlev(u.uz) < dptr.dunlev_ureached)
            dptr.dunlev_ureached = dunlev(u.uz);
    }

    /* stairway_free_all() */
    g.stairs = null;
    /* set default level change destination areas */
    /* the special level code may override these */
    g.updest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    g.dndest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };

    if (!(level_info(new_ledger).flags & LFILE_EXISTS)) {
        /* entering this level for first time; make it now */
        if (level_info(new_ledger).flags & VISITED) {
            /* impossible("goto_level: returning to discarded level?") */
            level_info(new_ledger).flags &= ~VISITED;
        }
        await mklev();
        new_ = true; /* made the level */
        familiar = bones_include_name(g.plname);
    } else {
        /* returning to previously visited level; reload it */
        const whynot = { v: '' };
        const lnhfp = open_levelfile(new_ledger, whynot);
        if (!lnhfp) { /* tricked_fileremoved(nhfp, whynot) */
            await pline(whynot.v);
            throw new Error('goto_level(): tricked_fileremoved() not ported yet');
        }
        /* reseed_random(rn2); reseed_random(rn2_on_display_rng): no-ops
           unless has_strong_rngseed, which a fixed-seed game doesn't have */
        await getlev(lnhfp, g.hackpid, new_ledger);
        close_nhfile(lnhfp);
        oinit(); /* reassign level dependent obj probabilities */
    }
    /* reglyph_darkroom(): JS remembers no S_darkroom glyphs, and lit
       corridors out of sight are remembered dark by newsym() */
    /* set_uinwater(0) */
    u.uinwater = 0;
    /* do this prior to level-change pline messages */
    vision_reset();             /* clear old level's line-of-sight */
    g.vision_full_recalc = 0;   /* don't let that reenable vision yet */
    await flush_screen(-1);     /* ensure all map flushes are postponed */

    if (portal && !In_endgame(u.uz)) {
        /* find the portal on the new level */
        let ttrap = null;

        for (const t of (g.level.traps || []))
            if (t.ttyp === MAGIC_PORTAL) {
                ttrap = t;
                break;
            }

        if (!ttrap) {
            if (u.uevent.qexpelled
                && (Is_qstart(u.uz0) || Is_qstart(u.uz))) {
                /* we're coming back from or going into the quest home level,
                   after already getting expelled once. The portal back
                   doesn't exist anymore - see expulsion(). */
                await u_on_rndspot(0);
            } else {
                /* !iflags.debug_fuzzer */
                console.error('impossible: goto_level: no corresponding portal!');
                await u_on_rndspot(0);
            }
        } else {
            seetrap(ttrap);
            await u_on_newpos(ttrap.tx, ttrap.ty);
        }
    } else if (at_stairs && !In_endgame(u.uz)) {
        if (up) {
            const stway = stairway_find_from(u.uz0, g.at_ladder);
            if (stway) {
                await u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = true;
            } else if (newdungeon)
                await u_on_sstairs(1);
            else
                await u_on_dnstairs();
            /* you climb up the {stairs|ladder};
               fly up the stairs; fly up along the ladder */
            const great_effort = (Punished() && !Levitation());
            if (g.flags.verbose || great_effort)
                await pline(`${great_effort ? "With great effort, you" : "You"} ${
                    u_locomotion("climb")} up${
                    (Flying() && g.at_ladder) ? " along" : ""} the ${
                    g.at_ladder ? "ladder" : "stairs"}.`);
        } else { /* down */
            const stway = stairway_find_from(u.uz0, g.at_ladder);
            if (stway) {
                await u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = true;
            } else if (newdungeon)
                await u_on_sstairs(0);
            else
                await u_on_upstairs();
            if (!u.dz) {
                ; /* stayed on same level? (no transit effects) */
            } else if (Flying()) {
                if (g.flags.verbose)
                    await You(`fly down ${g.at_ladder ? "along the ladder"
                                                      : "the stairs"}.`);
            } else if (near_capacity() > UNENCUMBERED
                       || Punished() || Fumbling()) {
                await You(`fall down the ${g.at_ladder ? "ladder" : "stairs"}.`);
                if (Punished()) {
                    await drag_down();
                    if (!welded(g.uball))
                        await ballrelease(false);
                }
                /* falling off steed has its own losehp() call */
                if (u.usteed)
                    throw new Error('goto_level(): dismount_steed(DISMOUNT_FELL) not ported yet');
                else
                    await losehp(Maybe_Half_Phys(rnd(3)),
                                 g.at_ladder ? "falling off a ladder"
                                             : "tumbling down a flight of stairs",
                                 KILLED_BY);
                await selftouch("Falling, you");
            } else { /* ordinary descent */
                if (g.flags.verbose)
                    await You(`${g.at_ladder ? "climb down the ladder"
                                             : "descend the stairs"}.`);
            }
        }
    } else { /* trap door or level_tele or In_endgame */
        await u_on_rndspot((up ? 1 : 0) | (was_in_W_tower ? 2 : 0));
        if (falling) {
            if (Punished() && !welded(g.uball))
                await ballfall();
            await selftouch("Falling, you");
            do_fall_dmg = true;
        }
    }

    if (Punished())
        await placebc();
    /* obj_delivery(FALSE) */
    if (g.migrating_objs)
        await obj_delivery(false);
    await losedogs();
    kill_genocided_monsters(); /* for those wiped out while in limbo */
    /*
     * Expire all timers that have gone off while away.  Must be
     * after migrating monsters and objects are delivered
     * (losedogs and obj_delivery).
     */
    await run_timers();

    /* hero might be arriving at a spot containing a monster;
       if so, move one or the other to another location */
    let mtmp;
    if ((mtmp = m_at(u.ux, u.uy)) != null)
        await u_collide_m(mtmp);

    /* initial movement of bubbles just before vision_recalc */
    if (Is_waterlevel(u.uz) || Is_airlevel(u.uz))
        movebubbles();
    else if (g.level.flags?.fumaroles)
        await fumaroles();

    /* Reset the screen. */
    vision_reset(); /* reset the blockages */
    /* reset_glyphmap(gm_levelchange): glyphs are mapped as they are shown */
    /* notice_mon_off(): a11y mon_notices isn't ported (off by default) */
    await docrt(); /* does a full vision recalc */
    await flush_screen(-1);

    /*
     *  Move all plines beyond the screen reset.
     */

    /* deferred arrival message for level teleport looks odd if given
       after the various messages below, so give it before them;
       [it might have already been delivered via docrt() -> see_monsters()
       -> Sting_effects() -> maybe_lvltport_feedback(), in which case
       'dfr_post_msg' has already been reset to Null];
       if 'dfr_post_msg' is "you materialize on a different level" then
       maybe_lvltport_feedback() will deliver it now and then free it */
    if (g.dfr_post_msg)
        await maybe_lvltport_feedback(); /* potentially called by Sting_effects() */

    /* special levels can have a custom arrival message */
    await deliver_splev_message();

    /* Check whether we just entered Gehennom. */
    if (!In_hell(u.uz0) && In_hell(u.uz)) {
        if (on_level(u.uz, g.dungeon_topology.d_valley_level)) { /* Is_valley() */
            await You("arrive at the Valley of the Dead...");
            await pline_The("odor of burnt flesh and decay pervades the air.");
            /* Soundeffect(se_groans_and_moans, 25) */
            await You_hear("groans and moans everywhere.");
        }

        record_achievement(ACH_HELL); /* reached Gehennom */
    }
    /* in case we've managed to bypass the Valley's stairway down */
    if (In_hell(u.uz) && !on_level(u.uz, g.dungeon_topology.d_valley_level))
        u.uevent.gehennom_entered = 1;

    if (familiar)
        await familiar_level_msg();

    /* special location arrival messages/events */
    const topo = g.dungeon_topology;
    if (In_endgame(u.uz)) {
        if (newdungeon)
            record_achievement(ACH_ENDG); /* reached endgame */
        if (new_ && on_level(u.uz, topo.d_astral_level)) {
            /* final_level(); record_achievement(ACH_ASTR) */
            throw new Error('goto_level(): final_level() not ported yet');
        } else if (newdungeon && u.uhave?.amulet) {
            await resurrect(); /* force confrontation with Wizard */
        }
    } else if (u.uz.dnum === topo.d_quest_dnum) { /* In_quest() */
        await onquest(); /* might be reaching locate|goal level */
    } else if (topo.d_knox_level?.dlevel && on_level(u.uz, topo.d_knox_level)) {
        /* Is_knox() */
        throw new Error('goto_level(): Fort Ludios arrival not ported yet');
    } else if (u.uz.dnum === topo.d_mines_dnum) { /* In_mines() */
        if (newdungeon)
            record_achievement(ACH_MINE);
    } else if (u.uz.dnum === topo.d_sokoban_dnum) { /* In_sokoban() */
        if (newdungeon)
            record_achievement(ACH_SOKO);
    } else {
        if (new_ && topo.d_rogue_level?.dlevel
            && on_level(u.uz, topo.d_rogue_level)) { /* Is_rogue_level() */
            await You("enter what seems to be an older, more primitive world.");
        } else if (new_ && topo.d_bigroom_level?.dlevel
                   && on_level(u.uz, topo.d_bigroom_level)) { /* Is_bigroom() */
            record_achievement(ACH_BGRM);
        }
        /* main dungeon message from your quest leader */
        if (u.uz0.dnum !== topo.d_quest_dnum && at_dgn_entrance("The Quest")
            && !(u.uevent.qcompleted || u.uevent.qexpelled
                 || g.quest_status.leader_is_dead)) {
            /* [TODO: copy of same TODO below; if an achievement for
               receiving quest call from leader gets added, that should
               come after logging new level entry] */
            if (!u.uevent.qcalled) {
                u.uevent.qcalled = 1;
                /* main "leader needs help" message */
                await com_pager("quest_portal");
            } else { /* reminder message */
                await com_pager((g.urole.mnum === PM_ROGUE) /* Role_if() */
                                ? "quest_portal_demand"
                                : "quest_portal_again");
            }
        }
    }

    await temperature_change_msg(prev_temperature);

    /* this was originally done earlier; moved here to be logged after
       any achievement related to entering a dungeon branch */
    if (new_) {
        /* Astral is excluded as a major event here because entry to it
           is already one such due to that being an achievement;
           for the quest, listing the start, locate, and goal levels would
           seem reasonable but all quest levels are included for simplicity--
           level 2 (or 3 if hero level teleports after obtaining permission
           to enter) is useful to show since it indicates that hero has
           actually entered the quest rather than just received permission
           to do so, and listing the goal level could be used to figure out
           whether level 5 is the end or there's another level (ESP reveals
           the same thing, but is part of normal game play as opposed to
           #chronicle leaking information that hero hasn't discovered yet) */
        const major = ((In_endgame(g.u.uz)
                        && !on_level(g.u.uz, g.dungeon_topology.d_astral_level))
                       || g.u.uz.dnum === g.dungeon_topology.d_quest_dnum);
        const [, dloc] = describe_level(2);

        livelog_printf(major ? LL_ACHIEVE : LL_DEBUG, `entered ${dloc}`);

        if (g.urole.mnum === PM_TOURIST) {
            more_experienced(level_difficulty(), 0);
            await newexplevel();
        }
    }

    assign_level(u.uz0, u.uz); /* reset u.uz0 */
    /* save_currentstate(): INSURANCE, no files */
    /* notice_mon_on(); notice_all_mons(TRUE): a11y mon_notices is off */

    await print_level_annotation();
    /* give room entrance message, if any */
    await check_special_room(false);
    /* deliver objects traveling with player */
    /* obj_delivery(TRUE) */
    if (g.migrating_objs)
        await obj_delivery(true);

    /* assume this will always return TRUE when changing level */
    /* (void) */ await in_out_region(u.ux, u.uy);
    /* shop repair is normally done when shopkeepers move, but we may
       need to catch up for lost time here; do this before maybe dying
       so bones map will include it */
    if (!new_)
        await fix_shop_damage();

    /* fall damage? */
    if (do_fall_dmg) {
        let dmg = d(Math.max(dist, 1), 6);

        dmg = Maybe_Half_Phys(dmg);
        await losehp(dmg, "falling down a mine shaft", KILLED_BY);
    }

    await pickup(1);
}

// C ref: do.c maybe_lvltport_feedback()
/* usually called from goto_level(); might be called from Sting_effects() */
export async function maybe_lvltport_feedback() {
    const g = game;
    if (g.dfr_post_msg
        && g.dfr_post_msg.slice(0, 15).toLowerCase() === "you materialize") {
        /* "You materialize on a different level." */
        await pline(g.dfr_post_msg);
        g.dfr_post_msg = null;
    }
}

// C ref: do.c hellish_smoke_mesg()
export async function hellish_smoke_mesg() {
    const temperature = game.level.flags.temperature || 0;
    if (temperature)
        await pline(`It is ${temperature > 0 ? "hot" : "cold"} here.`);

    if (In_hell(game.u.uz) && temperature > 0)
        await You(`${olfaction(game.youmonst.data) ? "smell" : "sense"} smoke...`);
}

// C ref: do.c temperature_change_msg()
/* give a message when the level temperature is different from previous */
async function temperature_change_msg(prev_temperature) {
    const temperature = game.level.flags.temperature || 0;
    if (prev_temperature !== temperature) {
        if (temperature)
            await hellish_smoke_mesg();
        else if (prev_temperature > 0)
            await pline_The(`heat ${In_hell(game.u.uz0) ? "and smoke are" : "is"} gone.`);
        else if (prev_temperature < 0)
            await You("are out of the cold.");
    }
}

// C ref: insight.c record_achievement() (ported in insight.js)
export { record_achievement };

// C ref: do.c boulder_hits_pool()
/* Called when a boulder is dropped, thrown, or pushed.  If it ends up
 * in a pool, it either fills the pool up or sinks away.  In either case,
 * it's gone for good...  If the destination is not a pool, returns FALSE.
 */
export async function boulder_hits_pool(
    otmp, /* the object falling into a pool or water or lava */
    rx, ry, /* coordinates of the pool */
    pushing) { /* for a boulder, whether or not it is being pushed */
    const u = game.u;

    if (!otmp || otmp.otyp !== O.BOULDER) {
        impossible("Not a boulder?");
    } else if (is_pool_or_lava(rx, ry)) {
        const lava = is_lava(rx, ry);
        let fills_up;
        const what = waterbody_name(rx, ry);
        const lev = game.level.at(rx, ry);
        const ltyp = lev.typ;
        const chance = rn2(10); /* water: 90%; lava: 10% */
        let mtmp;

        /* chance for boulder to fill pool:  Plane of Water==0%,
           lava 10%, wall of water==50%, other water==90% */
        fills_up = Is_waterlevel(u.uz) ? false
                   : IS_WATERWALL(ltyp) ? (chance < 5)
                     : lava ? (chance === 0) : (chance !== 0);

        if (fills_up) {
            const ttmp = t_at(rx, ry);

            if (ltyp === DRAWBRIDGE_UP) {
                lev.drawbridgemask &= ~DB_UNDER; /* clear lava */
                lev.drawbridgemask |= DB_FLOOR;
            } else {
                lev.typ = ROOM, lev.flags = 0;
                recalc_block_point(rx, ry);
            }
            /* 5.0: normally DEADMONSTER() is used when traversing the fmon
               list--dead monsters usually aren't still at specific map
               locations; however, if ice melts causing a giant to drown,
               that giant would still be on the map when it drops inventory;
               if it was carrying a boulder which now fills the pool, 'mtmp'
               will be dead here; killing it again would yield impossible
               "dmonsfree: N removed doesn't match N+1 pending" when other
               monsters have finished their current turn */
            if ((mtmp = m_at(rx, ry)) && !DEADMONSTER(mtmp)
                && !m_in_air(mtmp))
                await mondied(mtmp);

            if (ttmp)
                await delfloortrap(ttmp);
            await bury_objs(rx, ry);

            newsym(rx, ry);
            if (pushing) {
                let whobuf = "you";
                if (u.usteed)
                    whobuf = y_monnam(u.usteed);
                await pline(`${upstart(whobuf)} ${vtense(whobuf, "push")}`
                            + ` ${the(xname(otmp))} into the ${what}.`);
                if (game.flags.verbose && !Blind())
                    await pline("Now you can cross it!");
                /* no splashing in this case */
            }
        }
        if (!fills_up || !pushing) { /* splashing occurs */
            if (!u.uinwater) {
                if (pushing ? !Blind() : cansee(rx, ry)) {
                    await There(`is a large splash as ${the(xname(otmp))}`
                                + ` ${fills_up ? "fills" : "falls into"} the ${what}.`);
                } else if (!Deaf()) {
                    /* Soundeffect(lava ? se_sizzling : se_splash, 100) */
                    await You_hear(`a${lava ? " sizzling" : ""} splash.`);
                }
                await wake_nearto(rx, ry, 40);
            }

            if (fills_up && u.uinwater && dist2(rx, ry, u.ux, u.uy) === 0) {
                /* distu(rx, ry) == 0 */
                await set_uinwater(0); /* u.uinwater = 0 */
                await docrt();
                game.vision_full_recalc = 1;
                await You("find yourself on dry land again!");
            } else if (lava && next2u(rx, ry)) {
                let dmg;

                await You(`are hit by molten ${hliquid("lava")}${Fire_resistance() ? '.' : '!'}`);
                await burn_away_slime();
                dmg = d((Fire_resistance() ? 1 : 3), 6);
                await losehp(Maybe_Half_Phys(dmg), /* lava damage */
                             "molten lava", KILLED_BY);
            } else if (!fills_up && game.flags.verbose
                       && (pushing ? !Blind() : cansee(rx, ry))) {
                await pline("It sinks without a trace!");
            }
        }

        /* boulder is now gone */
        if (pushing)
            await useupf(otmp, otmp.quan);
        else
            obfree(otmp, null);
        return true;
    }
    return false;
}

// C ref: do.c flooreffects() -- boulders filling pits, objects tumbling
// into the hero's pit, globs and altars stop with a not-ported error
/* returns TRUE if obj is gone (or out of play), FALSE if the caller
   should place it on the floor */
export async function flooreffects(obj, /* the object landing on the floor */
                                   x, y, /* map coordinates for spot where it is landing */
                                   verb) { /* "fall", "drop", "land", &c */
    const g = game;
    let t;
    let res = false;

    void verb;
    if (obj.where !== 'OBJ_FREE')
        throw new Error('flooreffects: obj not free');

    /* make sure things like water_damage() have no pointers to follow:
       obj->nobj = obj->nexthere = 0 -- JS floor objects aren't chained */
    /* erode_obj() (called from water_damage() or lava_damage()) needs
       bhitpos, but that was screwing up wand zapping that called us from
       rloco(), so we now restore bhitpos before we return */
    const save_bhitpos = g.bhitpos;
    g.bhitpos = { x, y };

    if (obj.otyp === O.BOULDER && await boulder_hits_pool(obj, x, y, false)) {
        res = true;
    } else if (obj.otyp === O.BOULDER && (t = t_at(x, y)) !== null && t
               && (is_pit(t.ttyp) || is_hole(t.ttyp))) {
        throw new Error('flooreffects(): boulder filling a pit not ported yet');
    } else if (is_lava(x, y)) {
        res = await lava_damage(obj, x, y);
    } else if (is_pool(x, y)) {
        /* Reasonably bulky objects (arbitrary) splash when dropped.
         * If you're floating above the water even small things make
         * noise.  Stuff dropped near fountains always misses */
        if ((Blind() || (Levitation() || Flying())) && !Deaf() && u_at(x, y)) {
            if (!game.u.uinwater) { /* !Underwater */
                if (weight_do(obj) > WT_SPLASH_THRESHOLD_DO) {
                    await pline("Splash!");
                } else if (Levitation() || Flying()) {
                    await pline("Plop!");
                }
            }
            map_background_do(x, y, 0);
            newsym(x, y);
        }
        res = (await water_damage_do(obj, null, false)) === ER_DESTROYED_DO;
    } else if (u_at(x, y) && (t = t_at(x, y))
               && (is_pit(t.ttyp) || is_hole(t.ttyp))) {
        /* uteetering_at_seen_pit(t) || uescaped_shaft(t) */
        throw new Error('flooreffects(): objects tumbling into a pit not ported yet');
    } else if (obj.globby) {
        throw new Error('flooreffects(): obj_meld() not ported yet');
    } else if (g.context?.mon_moving && IS_ALTAR(g.level.at(x, y).typ)
               && cansee(x, y)) {
        await doaltarobj(obj);
    } else if (obj.oclass === O.POTION_CLASS && (g.level.flags?.temperature || 0) > 0
               && (g.level.at(x, y).typ === ROOM || g.level.at(x, y).typ === CORR)) {
        /* Potions are sometimes destroyed when landing on very hot
           ground. The basic odds are 50% for nonblessed potions and
           30% for blessed potions; if you have handled the object
           (i.e. it is or was yours), these odds are adjusted by Luck
           (each Luck point affects them by 2%). Artifact potions
           would not be affected, if any existed.

           Oil is not affected because its boiling point (and flash
           point) are higher than that of water. */
        if (cansee(x, y)) {
            /* unconditional "ground" is safe as this only runs for
               room and corridor tiles */
            await pline(`${Tobjnam(obj, "heat")} up as ${
                is_plural(obj) ? "they hit" : "it hits"} the hot ground.`);
        }

        let survival_chance = obj.blessed ? 70 : 50;
        if (obj.invlet)
            survival_chance += Luck() * 2;
        if (obj.otyp === O.POT_OIL)
            survival_chance = 100;

        if (!obj_resists(obj, survival_chance, 100)) {
            if (cansee(x, y)) {
                await pline(`${is_plural(obj) ? "They shatter" : "It shatters"
                    } from the heat!`);
            } else {
                await You_hear("a shattering noise.");
            }
            await breakobj(obj, x, y, false, false);
            res = true;
        }
    }

    g.bhitpos = save_bhitpos;
    return res;
}

// C ref: do.c dodrop() -- the #drop command: drop one inventory item
export async function dodrop() {
    let result;

    if (game.u.ushops)
        sellobj_state(SELL_DELIBERATE);
    result = await drop(await getobj("drop", any_obj_ok,
                                     GETOBJ_PROMPT | GETOBJ_ALLOWCNT));
    if (game.u.ushops)
        sellobj_state(SELL_NORMAL);
    if (result)
        reset_occupations();

    return result;
}

// C ref: do.c doddrop() -- the #droptype command: drop several things
export async function doddrop() {
    let result = ECMD_OK;

    if (!game.invent) {
        await You("have nothing to drop.");
        return ECMD_OK;
    }
    add_valid_menu_class(0); /* clear any classes already there */
    if (game.u.ushops)
        sellobj_state(SELL_DELIBERATE);
    if ((game.flags.menu_style ?? MENU_FULL) !== MENU_TRADITIONAL)
        result = await menu_drop(result);
    else
        throw new Error('doddrop(): ggetobj() (menustyle:traditional) not ported yet');
    if (game.u.ushops)
        sellobj_state(SELL_NORMAL);
    if (result)
        reset_occupations();

    return result;
}

// C ref: do.c menudrop_split()
async function menudrop_split(otmp, cnt) {
    if (cnt && cnt < otmp.quan) {
        if (welded(otmp)) {
            ; /* don't split */
        } else if (otmp.otyp === O.LOADSTONE && otmp.cursed) {
            /* same kludge as getobj(), for canletgo()'s use */
            otmp.corpsenm = cnt; /* don't split */
        } else {
            otmp = splitobj(otmp, cnt);
        }
    }
    return await drop(otmp);
}

// C ref: do.c menu_drop() -- drop things from the hero's inventory, using
// a menu
async function menu_drop(retry) {
    let n, n_dropped = 0;
    let otmp, otmp2;
    const pick_list = [];
    let all_categories = true, drop_everything = false, autopick = false;
    let drop_justpicked = false;
    let justpicked_quan = 0;
    const menu_style = game.flags.menu_style ?? MENU_FULL;

    drop_done: {
        if (retry) {
            all_categories = (retry === -2);
        } else if (menu_style === MENU_FULL) {
            all_categories = false;
            n = await query_category("Drop what type of items?", game.invent,
                                     (UNPAID_TYPES | ALL_TYPES | CHOOSE_ALL
                                      | BUC_BLESSED | BUC_CURSED | BUC_UNCURSED
                                      | BUC_UNKNOWN | JUSTPICKED | INCLUDE_VENOM),
                                     pick_list, PICK_ANY);
            /* when paranoid_confirm:A is set, 'A' by itself implies
               'A'+'a' which will be followed by a confirmation prompt;
               when that option isn't set, 'A' by itself is rejected
               by query_categorry() and result here will be n==0 */
            if (!n)
                break drop_done; /* no non-autopick category filters specified */

            for (let i = 0; i < n; i++) {
                if (pick_list[i].item === ALL_TYPES_SELECTED) {
                    all_categories = true;
                } else if (pick_list[i].item === 0x41 /* 'A' */) {
                    drop_everything = autopick = true;
                } else if (pick_list[i].item === 0x50 /* 'P' */) {
                    justpicked_quan = Math.max(0, pick_list[i].count);
                    drop_justpicked = true;
                    drop_everything = false;
                    add_valid_menu_class(pick_list[i].item);
                } else {
                    add_valid_menu_class(pick_list[i].item);
                    drop_everything = false;
                }
            }
        } else if (menu_style === MENU_COMBINATION) {
            throw new Error('menu_drop(): ggetobj() (menustyle:combination) not ported yet');
        }

        if (autopick) {
            /*
             * Use the bypass bit to mark items already processed (hence
             * not droppable) and rescan inventory until no unbypassed
             * items remain.
             */
            bypass_objlist(game.invent, false); /* clear bypass bit for invent */
            while ((otmp = nxt_unbypassed_obj(game.invent)) !== null) {
                if (drop_everything || all_categories || allow_category(otmp))
                    n_dropped += (((await drop(otmp)) & ECMD_TIME) !== 0) ? 1 : 0;
            }
            /* we might not have dropped everything (worn armor, welded weapon,
               cursed loadstones), so reset any remaining inventory to normal */
            bypass_objlist(game.invent, false);
        } else if (drop_justpicked && count_justpicked(game.invent) === 1) {
            /* drop the just picked item automatically, if only one stack */
            otmp = find_justpicked(game.invent);
            if (otmp)
                n_dropped += (((await menudrop_split(otmp, justpicked_quan))
                               & ECMD_TIME) !== 0) ? 1 : 0;
        } else {
            /* should coordinate with perm invent, maybe not show worn items */
            const invlist = [];
            for (let o = game.invent; o; o = o.nobj)
                invlist.push(o);
            n = await query_objlist("What would you like to drop?", invlist,
                                    (USE_INVLET | INVORDER_SORT | INCLUDE_VENOM),
                                    pick_list, PICK_ANY,
                                    all_categories ? allow_all : allow_category);
            if (n > 0) {
                /*
                 * picklist[] contains a set of pointers into inventory, but
                 * as soon as something gets dropped, they might become stale
                 * (see the autopick code above for an explanation).
                 * So we start by setting bypass on all of gi.invent, then
                 * check each pointer to verify that it is in gi.invent and
                 * has that bit set.
                 */
                bypass_objlist(game.invent, true);
                for (let i = 0; i < n; i++) {
                    otmp = pick_list[i].obj;
                    for (otmp2 = game.invent; otmp2; otmp2 = otmp2.nobj)
                        if (otmp2 === otmp)
                            break;
                    if (!otmp2 || !otmp2.bypass)
                        continue;
                    /* found next selected invent item */
                    n_dropped += (((await menudrop_split(otmp, pick_list[i].count))
                                   & ECMD_TIME) !== 0) ? 1 : 0;
                }
                bypass_objlist(game.invent, false); /* reset gi.invent to normal */
            }
        }
    }

    /* drop_done: */
    return (n_dropped ? ECMD_TIME : ECMD_OK);
}

/* C ref: cmd.c reset_occupations() -- reset_remarm(), reset_pick(),
   reset_trapset(): none of their occupations is ported yet */
export function reset_occupations() {
}

// C ref: do.c canletgo() -- some common tests when trying to drop or
// throw items
export async function canletgo(obj, word) {
    if (obj.owornmask & (W_ARMOR | W_ACCESSORY)) {
        if (word)
            await Norep(`You cannot ${word} something you are wearing.`);
        return false;
    }
    if (obj === game.uwep && welded(game.uwep)) {
        /* no weldmsg(), so uwep->bknown might become set silently
           if word is "" */
        if (word) {
            let hand = body_part(HAND);

            if (bimanual(game.uwep))
                hand = makeplural(hand);
            await Norep(`You cannot ${word} something welded to your ${hand}.`);
        }
        return false;
    }
    if (obj.otyp === O.LOADSTONE && obj.cursed) {
        throw new Error('canletgo(): cursed loadstone not ported yet');
    }
    if (obj.otyp === O.LEASH && obj.leashmon) {
        if (word)
            throw new Error('canletgo(): leash message not ported yet');
        return false;
    }
    if (obj.owornmask & W_SADDLE) {
        if (word)
            await You(`cannot ${word} something you are sitting on.`);
        return false;
    }
    return true;
}

// C ref: do.c drop()
async function drop(obj) {
    if (!obj)
        return ECMD_FAIL;
    if (!(await canletgo(obj, "drop")))
        return ECMD_FAIL;
    if (obj.otyp === O.CORPSE)
        throw new Error('drop(): better_not_try_to_drop_that() not ported yet');
    if (obj === game.uwep) {
        if (welded(game.uwep)) {
            await weldmsg(obj);
            return ECMD_FAIL;
        }
        setuwep(null);
    }
    if (obj === game.uquiver) {
        setuqwep(null);
    }
    if (obj === game.uswapwep) {
        setuswapwep(null);
    }

    if (game.u.uswallow) {
        /* barrier between you and the floor */
        if (game.flags?.verbose ?? true) {
            let onam_p, mnam_p;

            mnam_p = mon_nam(game.u.ustuck);
            /* doname can call s_suffix, reusing its buffer */
            if (digests(game.u.ustuck.data)) {
                mnam_p = `${s_suffix(mnam_p)} ${mbodypart(game.u.ustuck, STOMACH_do)}`;
            }
            onam_p = is_unpaid(obj) ? yobjnam(obj, null) : doname(obj);

            await You(`drop ${onam_p} into ${mnam_p}.`);
        }
    } else {
        if ((obj.oclass === O.RING_CLASS || obj.otyp === O.MEAT_RING)
            && IS_SINK(game.level.at(game.u.ux, game.u.uy).typ))
            throw new Error('drop(): dosinkring() not ported yet');
        if (!can_reach_floor(true)) {
            /* we might be levitating due to #invoke Heart of Ahriman;
               if so, levitation would end during call to freeinv()
               and we want hitfloor() to happen before float_down() */
            const levhack = finesse_ahriman(obj);

            if (levhack)
                game.u.uprops[LEVITATION].extrinsic = W_ART; /* other than W_ARTI */
            if (game.flags?.verbose ?? true)
                await You(`drop ${doname(obj)}.`);
            freeinv(obj);
            await hitfloor(obj, true);
            if (levhack)
                await float_down(I_SPECIAL | TIMEOUT, W_ARTI | W_ART);
            return ECMD_TIME;
        }
        if (!IS_ALTAR(game.level.at(game.u.ux, game.u.uy).typ)
            && (game.flags?.verbose ?? true))
            await You(`drop ${doname(obj)}.`);
    }
    obj.how_lost = LOST_DROPPED;
    await dropx(obj);
    return ECMD_TIME;
}

/* C ref: color.h NH_AMBER, NH_BLACK */
const NH_AMBER = "amber", NH_BLACK = "black";

// C ref: do.c doaltarobj()
/* obj is an object dropped on an altar */
export async function doaltarobj(obj) {
    const u = game.u;

    if (Blind())
        return;

    if (obj.oclass !== O.COIN_CLASS) {
        /* KMH, conduct */
        if (!game.context.mon_moving && !u.uconduct.gnostic++)
            livelog_printf(LL_CONDUCT,
                           `eschewed atheism, by dropping ${doname(obj)} on an altar`);
    } else {
        /* coins don't have bless/curse status */
        obj.blessed = obj.cursed = 0;
    }

    if (obj.blessed || obj.cursed) {
        await There(`is ${an(hcolor(obj.blessed ? NH_AMBER : NH_BLACK))} flash as ${
            doname(obj)} ${otense(obj, "hit")} the altar.`);
        if (!Hallucination())
            obj.bknown = 1; /* ok to bypass set_bknown() */
    } else {
        await pline(`${upstart(doname(obj)) /* Doname2() */} ${
            otense(obj, "land")} on the altar.`);
        if (obj.oclass !== O.COIN_CLASS)
            obj.bknown = 1; /* ok to bypass set_bknown() */
    }
}

// C ref: do.c dropx() -- take dropped item out of inventory; called in
// several places - may produce output
export async function dropx(obj) {
    freeinv(obj);
    if (!game.u.uswallow) {
        if (await ship_object(obj, game.u.ux, game.u.uy, false))
            return;
        if (IS_ALTAR(game.level.at(game.u.ux, game.u.uy).typ))
            await doaltarobj(obj); /* set bknown */
    }
    await dropy(obj);
}

// C ref: do.c dropy() -- put dropped object at destination; called from
// lots of places
export async function dropy(obj) {
    await dropz(obj, false);
}

// C ref: do.c dropz() -- really put dropped object at its destination...
export async function dropz(obj, with_impact) {
    if (obj === game.uwep)
        setuwep(null);
    if (obj === game.uquiver)
        setuqwep(null);
    if (obj === game.uswapwep)
        setuswapwep(null);

    if (game.u.uswallow) {
        /* hero has dropped an item while inside an engulfer */
        if (obj !== game.uball) { /* mon doesn't pick up ball */
            /* moving shop item into engulfer's inventory treated as theft */
            if (is_unpaid(obj))
                await stolen_value(obj, game.u.ux, game.u.uy, true, false);
            /* add to engulfer's inventory if not immediately eaten */
            if (!(await engulfer_digests_food(obj)))
                mpickobj_do(game.u.ustuck, obj);
        }
    } else {
        if (await flooreffects(obj, game.u.ux, game.u.uy, "drop"))
            return;
        place_object(obj, game.u.ux, game.u.uy);
        if (with_impact)
            await container_impact_dmg(obj, game.u.ux, game.u.uy);
        impact_disturbs_zombies(obj, with_impact);
        if (obj === game.uball)
            await drop_ball(game.u.ux, game.u.uy);
        else if (game.level.flags?.has_shop)
            await sellobj(obj, game.u.ux, game.u.uy);
        stackobj(obj);
        /* Blind && Levitation: map_object() */
        newsym(game.u.ux, game.u.uy); /* remap location under self */
    }
    await encumber_msg();
}

// C ref: do.c engulfer_digests_food()
/* when swallowed, move dropped object from OBJ_FREE to u.ustuck's inventory;
   for purple worm, immediately eat any corpse, glob, or special meat item
   from object polymorph; return True if object is used up, False otherwise */
async function engulfer_digests_food(obj) {
    const u = game.u;
    /* animal swallower (purple worn) eats any
       corpse, glob, or meat <item> but not other types of food */
    if (digests(u.ustuck.data)
        && (obj.otyp === O.CORPSE || obj.globby
            || obj.otyp === O.MEATBALL || obj.otyp === O.ENORMOUS_MEATBALL
            || obj.otyp === O.MEAT_RING || obj.otyp === O.MEAT_STICK)) {
        let could_petrify = false,
            could_poly = false, could_slime = false,
            could_grow = false, could_heal = false;

        if (obj.otyp === O.CORPSE) {
            could_petrify = touch_petrifies_do(mons_do[obj.corpsenm]);
            could_poly = polyfood_do(obj);
            could_grow = (obj.corpsenm === PM_WRAITH_do);
            could_heal = (obj.corpsenm === PM_NURSE_do);
        } else if (obj.otyp === O.GLOB_OF_GREEN_SLIME) {
            could_slime = true;
        }
        /* see or feel the effect */
        await pline(`${Tobjnam(obj, "are")} instantly digested!`);

        if (could_poly || could_slime) {
            await newcham_do(u.ustuck, could_slime ? mons_do[PM_GREEN_SLIME_do] : null,
                             could_slime ? NC_SHOW_MSG_do : NO_NC_FLAGS_do);
        } else if (could_petrify) {
            await minstapetrify(u.ustuck, true);
        } else if (could_grow) {
            await grow_up_do(u.ustuck, null);
        } else if (could_heal) {
            healmon_do(u.ustuck, u.ustuck.mhpmax, 0);
            /* False: don't realize that sight is cured from inside */
            await mcureblindness_do(u.ustuck, false);
        }
        delobj_do(obj); /* always used up */
        return true;
    }
    return false;
}

// C ref: hack.c impact_disturbs_zombies()
export function impact_disturbs_zombies(obj, violent) {
    /* if object won't make a noticeable impact, let buried zombies rest */
    if ((obj.owt || 0) < (violent ? 10 : 100)
        || O.objects[obj.otyp].oc_material <= O.LEATHER /* is_flimsy(obj) */
        || obj.otyp === O.RUBBER_HOSE)
        return;

    disturb_buried_zombies(obj.ox, obj.oy);
}

// C ref: dokick.c down_gate()
export function down_gate(x, y) {
    const stway = stairway_at(x, y);
    let ttmp;

    game.gate_str = null;
    /* this matches the player restriction in goto_level() */
    const qstart_level = game.dungeon_topology?.d_qstart_level;
    if (qstart_level && qstart_level.dlevel && on_level(game.u.uz, qstart_level)
        && !ok_to_quest())
        return MIGR_NOWHERE;
    if (stway && !stway.up && !stway.isladder) {
        game.gate_str = "down the stairs";
        return (stway.tolev.dnum === game.u.uz.dnum) ? MIGR_STAIRS_UP
                                                     : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        game.gate_str = "down the ladder";
        return MIGR_LADDER_UP;
    }
    /* hole will always be flagged as seen; trap drop might or might not */
    if ((ttmp = t_at(x, y)) && ttmp.tseen && is_hole(ttmp.ttyp)) {
        game.gate_str = (ttmp.ttyp === TRAPDOOR) ? "through the trap door"
                                                 : "through the hole";
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

// C ref: dokick.c otransit_msg()
async function otransit_msg(otmp, nodrop, chainthere, num) {
    let optr, xbuf;

    if (otmp.otyp === O.CORPSE) {
        /* Tobjnam() calls xname() and would yield "The corpse";
           we want more specific "The newt corpse" or "Medusa's corpse" */
        optr = upstart(corpse_xname(otmp, null, CXN_PFX_THE));
    } else {
        optr = Tobjnam(otmp, null);
    }
    const obuf = optr;

    if (num || chainthere) {
        if (num) { /* means: other objects are impacted */
            xbuf = ` ${otense(otmp, "hit")} ${(num === 1) ? "another" : "other"} object${
                (num > 1) ? "s" : ""}`;
        } else { /* chain-only msg */
            xbuf = ` ${otense(otmp, "rattle")} your chain`;
        }
        if (nodrop)
            xbuf += ".";
        else
            xbuf += ` and ${otense(otmp, "fall")} ${game.gate_str}.`;
        await pline(`${obuf}${xbuf}`);
    } else if (!nodrop)
        await pline(`${obuf} ${otense(otmp, "fall")} ${game.gate_str}.`);
}

// C ref: dokick.c ship_object()
/* NOTE: ship_object assumes otmp was FREED from fobj or invent.
 * <x,y> is the point of drop.  otmp is _not_ an <x,y> resident:
 * otmp is either a kicked, dropped, or thrown object.
 */
export async function ship_object(otmp, x, y, shop_floor_obj) {
    let toloc;
    let t;
    let impact = false, chainthere = false;
    let n = 0;

    if (!otmp)
        return false;
    if ((toloc = down_gate(x, y)) === MIGR_NOWHERE)
        return false;
    const cc = drop_to(toloc, x, y);
    if (!cc.y)
        return false;

    /* objects other than attached iron ball always fall down ladder,
       but have a chance of staying otherwise */
    const nodrop = (otmp === game.uball) || (otmp === game.uchain)
                   || (toloc !== MIGR_LADDER_UP && rn2(3));

    const container = !!(otmp.cobj && otmp.cobj.length); /* Has_contents() */
    const unpaid = is_unpaid(otmp);

    if (OBJ_AT(x, y)) {
        /* svl.level.objects[x][y] via ->nexthere */
        for (const obj of game.level.objects) {
            if (obj.ox !== x || obj.oy !== y || obj.where !== 'OBJ_FLOOR')
                continue;
            if (obj === game.uchain)
                chainthere = true;
            else if (obj !== otmp)
                n += obj.quan;
        }
        if (n)
            impact = true;
    }
    /* boulders never fall through trap doors, but they might knock
       other things down before plugging the hole */
    if (otmp.otyp === O.BOULDER && ((t = t_at(x, y)) != null)
        && is_hole(t.ttyp)) {
        if (impact)
            await impact_drop(otmp, x, y, 0);
        return false; /* let caller finish the drop */
    }

    if (cansee(x, y))
        await otransit_msg(otmp, nodrop, chainthere, n);

    if (nodrop) {
        if (impact) {
            await impact_drop(otmp, x, y, 0);
            maybe_unhide_at(x, y);
        }
        return false;
    }

    if (unpaid || shop_floor_obj) {
        const u = game.u;
        if (unpaid) {
            await stolen_value(otmp, u.ux, u.uy, true, false);
        } else {
            const ox = otmp.ox;
            const oy = otmp.oy;
            /* strchr(u.urooms, *in_rooms(...)) also matches the terminator */
            const r0 = in_rooms(ox, oy, SHOPBASE).charAt(0);
            await stolen_value(
                otmp, ox, oy,
                (costly_spot(u.ux, u.uy)
                 && (r0 === '' || (u.urooms || '').includes(r0))),
                false);
        }
        /* set otmp->no_charge to 0 */
        if (container)
            picked_container(otmp); /* happens to do the right thing */
        if (otmp.oclass !== O.COIN_CLASS)
            otmp.no_charge = 0;
    }

    if (otmp.owornmask)
        await remove_worn_item(otmp, true);

    /* some things break rather than ship */
    if (breaktest(otmp)) {
        let result;

        if (O.objects[otmp.otyp].oc_material === O.GLASS
            || otmp.otyp === O.EXPENSIVE_CAMERA) {
            if (otmp.otyp === O.MIRROR)
                change_luck(-2);
            result = "crash";
        } else {
            /* penalty for breaking eggs laid by you */
            if (otmp.otyp === O.EGG && otmp.spe && ismnum_do(otmp.corpsenm))
                change_luck(-Math.min(otmp.quan, 5));
            result = "splat";
        }
        /* Soundeffect(se_egg_splatting / se_glass_crashing, 25) */
        await You_hear(`a muffled ${result}.`);
        obj_extract_self(otmp);
        obfree(otmp, null);
        return true;
    }

    add_to_migration(otmp);
    otmp.ox = cc.x;
    otmp.oy = cc.y;
    otmp.owornmask = toloc;

    /* boulder from rolling boulder trap, no longer part of the trap */
    if (otmp.otyp === O.BOULDER)
        otmp.otrapped = 0;

    if (impact) {
        /* the objs impacted may be in a shop other than
         * the one in which the hero is located.  another
         * check for a shk is made in impact_drop.  it is, e.g.,
         * possible to kick/throw an object belonging to one
         * shop into another shop through a gap in the wall,
         * and cause objects belonging to the other shop to
         * fall down a trap door--thereby getting two shopkeepers
         * angry at the hero in one shot.
         */
        await impact_drop(otmp, x, y, 0);
        newsym(x, y);
    }
    return true;
}

/* C ref: monst.h ismnum() */
function ismnum_do(fx) { return fx >= LOW_PM_do && fx < NUMMONS_do; }

// C ref: do.c obj_no_longer_held()
export function obj_no_longer_held(obj) {
    if (!obj) {
        return;
    } else if (obj.cobj && obj.cobj.length) { /* Has_contents(obj) */
        for (const contents of obj.cobj)
            obj_no_longer_held(contents);
    }
    switch (obj.otyp) {
    case O.CRYSKNIFE:
        /* Normal crysknife reverts to worm tooth when not held by hero
         * or monster; fixed crysknife has only 10% chance of reverting. */
        throw new Error('obj_no_longer_held(): crysknife reverting not ported yet');
    }
}

// C ref: dungeon.c u_on_rndspot()
/* place you on a random location when arriving on a level */
export async function u_on_rndspot(upflag) {
    const g = game;
    const up = (upflag & 1), was_in_W_tower = (upflag & 2);

    /*
     * Place the hero at a random location within the relevant region.
     * place_lregion(xTELE) -> put_lregion_here(xTELE) -> await u_on_newpos()
     * Unspecified region (.lx == 0) defaults to entire level.
     */
    if (was_in_W_tower /* && On_W_tower_level(&u.uz) */)
        throw new Error('u_on_rndspot(): the Wizard Tower not ported yet');
    else if (up)
        await place_lregion(g.updest.lx, g.updest.ly,
                      g.updest.hx, g.updest.hy,
                      g.updest.nlx, g.updest.nly,
                      g.updest.nhx, g.updest.nhy,
                      LR_UPTELE, null);
    else
        await place_lregion(g.dndest.lx, g.dndest.ly,
                      g.dndest.hx, g.dndest.hy,
                      g.dndest.nlx, g.dndest.nly,
                      g.dndest.nhx, g.dndest.nhy,
                      LR_DOWNTELE, null);

    /* might have just left solid rock and unblocked levitation */
    /* switch_terrain(): no rolls; Levitation/Flying blocking by terrain
       isn't ported yet */
}

// C ref: do.c wipeoff() -- occupation callback for #wipe
async function wipeoff() {
    const u = game.u;
    let udelta = u.ucreamed || 0;
    let ldelta = uprop(BLINDED).intrinsic & TIMEOUT; /* BlindedTimeout */

    if (udelta > 4)
        udelta = 4;
    u.ucreamed -= udelta; /*u.ucreamed -= min(u.ucreamed,4);*/
    if (ldelta > 4)
        ldelta = 4;
    incr_itimeout(BLINDED, -ldelta); /*HBlinded -= min(BlindedTimeout,4L);*/

    if (!uprop(BLINDED).intrinsic) { /* !HBlinded */
        await pline("You've got the glop off.");
        u.ucreamed = 0;
        if (!(await gulp_blnd_check())) {
            set_itimeout(BLINDED, 1);
            await make_blinded(0, true);
        }
        return 0;
    } else if (!u.ucreamed) {
        await Your(`${body_part(FACE)} feels clean now.`);
        return 0;
    }
    return 1; /* still busy */
}

// C ref: do.c dowipe() -- the #wipe command - wipe off your face
export async function dowipe() {
    if (game.u.ucreamed) {
        const buf = `wiping off your ${body_part(FACE)}`;
        set_occupation(wipeoff, buf, 0);
        /* Not totally correct; what if they change back after now
         * but before they're finished wiping?
         */
        return ECMD_TIME;
    }
    await Your(`${body_part(FACE)} is already clean.`);
    return ECMD_TIME;
}
