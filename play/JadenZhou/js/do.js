// do.js — level changes.
// C ref: do.c
//
// Ported so far: schedule_goto(), deferred_goto(), and goto_level() up to
// making the new level (mklev()).  The arrival half of goto_level()
// (u_on_rndspot()/u_on_newpos()/stairs placement, losedogs(), docrt(),
// the arrival messages) and returning to a saved level are not ported yet.

import { game } from './gstate.js';
import { pline } from './display.js';
import {
    depth, dunlev, dunlevs_in_dungeon, ledger_no, on_level, assign_level,
    In_hell, builds_up,
} from './dungeon.js';
import { In_endgame, Is_waterlevel, Is_airlevel } from './const.js';
import { keepdogs, losedogs } from './dog.js';
import { kill_genocided_monsters } from './mon.js';
import { m_at } from './makemon.js';
import { mklev, place_lregion } from './mklev.js';
import { vision_reset } from './vision.js';
import { LR_UPTELE, LR_DOWNTELE } from './const.js';

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

// C ref: do.c goto_level()
export async function goto_level(newlevel, at_stairs, falling, portal) {
    const g = game;
    const u = g.u;
    let up = (depth(newlevel) < depth(u.uz));
    const newdungeon = (u.uz.dnum !== newlevel.dnum);
    let leaving_tutorial = false;
    /* familiar, new, dist, do_fall_dmg, prev_temperature: used by the
       rest of the arrival half, not ported yet */
    /* was_in_W_tower = In_W_tower(u.ux, u.uy, &u.uz): the Wizard's Tower
       levels are only in Gehennom, which isn't ported yet */
    if (In_hell(u.uz))
        throw new Error('goto_level(): In_W_tower() not ported yet');
    const was_in_W_tower = false;

    if (dunlev(newlevel) > dunlevs_in_dungeon(newlevel))
        newlevel.dlevel = dunlevs_in_dungeon(newlevel);
    if (newdungeon) {
        /* In_endgame(newlevel), In_tutorial(newlevel), In_tutorial(&u.uz):
           tutorial() and the endgame entry are not ported yet */
        if (In_endgame(newlevel) || g.tutorial_dnum !== undefined
            && (newlevel.dnum === g.tutorial_dnum
                || u.uz.dnum === g.tutorial_dnum))
            throw new Error('goto_level(): endgame/tutorial entry not ported yet');
    }
    let new_ledger = ledger_no(newlevel);
    if (new_ledger <= 0)
        throw new Error('goto_level(): done(ESCAPED) not ported yet');

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
        && !newdungeon)
        throw new Error('goto_level(): ok_to_quest() not ported yet');

    if (on_level(newlevel, u.uz))
        return; /* this can happen */

    /* nh_callback_run(NHCB_LVL_LEAVE): no level-leave callbacks are
       registered by the ported nhcore.lua */

    /* tethered movement makes level change while trapped feasible */
    /* u.utrap && u.utraptype == TT_BURIEDBALL: punishment not ported */

    /* nhfp = currentlevel_rewrite(): the level "file" is kept in memory
       (game.level_files), since js/ can't do file I/O */

    /* maybe_reset_pick(), reset_trapset(): no lock-picking or trap-setting
       context is ported yet */
    if (g.iflags?.travelcc) g.iflags.travelcc.x = g.iflags.travelcc.y = 0;
    if (g.context?.polearm) g.context.polearm.hitmon = null;

    if (falling) /* assuming this is only trap door or hole */
        throw new Error('goto_level(): impact_drop() not ported yet');

    /* check_special_room(TRUE) */
    if (u.ushops && u.ushops.length)
        throw new Error('goto_level(): check_special_room() not ported yet');
    /* if (Punished) unplacebc(): punishment not ported */
    /* reset_utrap(FALSE) */
    u.utrap = 0;
    u.utraptype = 0;
    /* fill_pit(u.ux, u.uy): pits aren't ported yet */
    /* set_ustuck((struct monst *) 0) */
    u.ustuck = null;
    u.uswallow = 0;
    /* set_uinwater(0) */
    u.uinwater = 0;
    u.uundetected = 0; /* not hidden, even if means are available */
    if (!g.iflags?.nofollowers)
        keepdogs(false);
    /* recalc_mapseen(): #overview isn't ported yet */
    /* vision_recalc(2): we no longer see anything on the level; the
       vision state is rebuilt by vision_reset() on arrival */

    /*
     * Save the level we're leaving.  C does savelev() into a level file;
     * js/ can't do file I/O, so the level is kept in memory instead
     * (game.level_files[ledger]).
     */
    const cant_go_back = ((newdungeon && In_endgame(newlevel))
                          || leaving_tutorial);
    if (!cant_go_back) {
        /* update_mlstmv(): current monsters are becoming inactive */
        for (let m = g.fmon; m; m = m.nmon)
            if (!(m.mhp <= 0))
                m.mlstmv = g.moves;
    }
    /* savelev(nhfp, ledger_no(&u.uz)) -- in-memory stand-in */
    if (!g.level_files) g.level_files = {};
    g.level_files[ledger_no(u.uz)] = {
        level: g.level, fmon: g.fmon, stairs: g.stairs,
        rooms: g.level?.rooms,
    };

    /* Is_rogue_level(newlevel) || Is_rogue_level(&u.uz): assign_graphics():
       the rogue level isn't ported yet */
    /* check_gold_symbol(): display only */
    /* recbranch_mapseen(): #overview isn't ported yet */
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

    if (!g.level_files[new_ledger]) {
        /* entering this level for first time; make it now */
        await mklev();
        /* new = TRUE; familiar = bones_include_name(svp.plname) */
    } else {
        /* returning to previously visited level; reload it */
        throw new Error('goto_level(): returning to a saved level not ported yet');
    }
    /* reglyph_darkroom(): display only */
    /* set_uinwater(0) */
    u.uinwater = 0;
    /* do this prior to level-change pline messages */
    vision_reset();             /* clear old level's line-of-sight */
    g.vision_full_recalc = 0;   /* don't let that reenable vision yet */
    /* flush_screen(-1): ensure all map flushes are postponed */

    if (portal && !In_endgame(u.uz)) {
        /* find the portal on the new level */
        throw new Error('goto_level(): portal arrival not ported yet');
    } else if (at_stairs && !In_endgame(u.uz)) {
        throw new Error('goto_level(): stairs arrival not ported yet');
    } else { /* trap door or level_tele or In_endgame */
        u_on_rndspot((up ? 1 : 0) | (was_in_W_tower ? 2 : 0));
        if (falling)
            throw new Error('goto_level(): falling arrival not ported yet');
    }

    /* if (Punished) placebc(): punishment not ported */
    /* obj_delivery(FALSE) */
    if (g.migrating_objs)
        throw new Error('goto_level(): obj_delivery() not ported yet');
    losedogs();
    kill_genocided_monsters(); /* for those wiped out while in limbo */
    /*
     * Expire all timers that have gone off while away.  Must be
     * after migrating monsters and objects are delivered
     * (losedogs and obj_delivery).
     */
    /* run_timers(): the timer queue isn't ported yet (see timeout.js) */

    /* hero might be arriving at a spot containing a monster;
       if so, move one or the other to another location */
    if (m_at(u.ux, u.uy))
        throw new Error('goto_level(): u_collide_m() not ported yet');

    /* initial movement of bubbles just before vision_recalc */
    if (Is_waterlevel(u.uz) || Is_airlevel(u.uz))
        throw new Error('goto_level(): movebubbles() not ported yet');
    else if (g.level.flags?.fumaroles)
        throw new Error('goto_level(): fumaroles() not ported yet');

    /* Reset the screen. */
    vision_reset(); /* reset the blockages */
    /* reset_glyphmap(gm_levelchange); notice_mon_off() */
    throw new Error('goto_level(): docrt() not ported yet');
}

// C ref: dungeon.c u_on_rndspot()
/* place you on a random location when arriving on a level */
export function u_on_rndspot(upflag) {
    const g = game;
    const up = (upflag & 1), was_in_W_tower = (upflag & 2);

    /*
     * Place the hero at a random location within the relevant region.
     * place_lregion(xTELE) -> put_lregion_here(xTELE) -> u_on_newpos()
     * Unspecified region (.lx == 0) defaults to entire level.
     */
    if (was_in_W_tower /* && On_W_tower_level(&u.uz) */)
        throw new Error('u_on_rndspot(): the Wizard Tower not ported yet');
    else if (up)
        place_lregion(g.updest.lx, g.updest.ly,
                      g.updest.hx, g.updest.hy,
                      g.updest.nlx, g.updest.nly,
                      g.updest.nhx, g.updest.nhy,
                      LR_UPTELE, null);
    else
        place_lregion(g.dndest.lx, g.dndest.ly,
                      g.dndest.hx, g.dndest.hy,
                      g.dndest.nlx, g.dndest.nly,
                      g.dndest.nhx, g.dndest.nhy,
                      LR_DOWNTELE, null);

    /* might have just left solid rock and unblocked levitation */
    /* switch_terrain(): no rolls; Levitation/Flying blocking by terrain
       isn't ported yet */
}
