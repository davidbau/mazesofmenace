// moveloop_preamble.js — Once per moveloop() before the core loop.
// C ref: allmain.c moveloop_preamble() + maybe_do_tutorial() (called from moveloop() after preamble).
//
// Ported: calendar, rndencode/seer_turn, set_wear (EProtection ring refresh) / reset_justpicked stubs,
// disp.botlx, restore hooks, encumber_msg, defer see_monsters, uz0/move,
// fuzzerpending, in_moveloop, perm_invent update_inventory, pickup(1),
// queued weapon.c plines (give_may_advance_msg, drain_weapon_skill forget).

import { game } from './gstate.js';
import { pline, docrt_flags, docrtRefresh } from './display.js';
import { rnd } from './rng.js';
import {
    NEW_MOON, FULL_MOON, NORMAL_SPEED, STONE, FUZZER_IMPOSSIBLE_PANIC, UTOTYPE_NONE,
} from './const.js';
import { parseFixedDatetime, phaseOfTheMoonFromDate, isFriday13thFromDate } from './moonphase.js';
import { changeLuck } from './attrib.js';
import { initrack } from './track.js';
import { setWear } from './wear.js';
import { resetJustPicked, encumberMsg, pickup } from './pickup.js';
import { readEngrAt } from './engrave.js';
import { fixShopDamage } from './shop.js';
import { seeMonsters, vision_recalc } from './vision.js';
import { updateInventory } from './invent.js';
import { takePendingGiveMayAdvancePline, takePendingDrainForgetPlines } from './u_init_skills.js';
import { findLevelByProtoLikeC } from './sp_levchn.js';
import { askDoTutorialMenuTTYLikeC } from './tutorial_prompt.js';
import { scheduleGotoHeroLikeC, deferredGotoHeroLikeC } from './goto_level_hero.js';

/**
 * C: allmain.c **`maybe_do_tutorial`** → **`find_level("tut-1")`** (**`dungeon.c`**).
 * Returns **`g.sp_levchn`** node when **`proto`** matches (case-insensitive); **`null`** if absent
 * Absent only if **`initDungeonsLikeC`** did not run or **`tut-1`** missing from **`dungeon_proto`**.
 * @returns {object|null}
 */
export function findLevelTut1LikeC() {
    return findLevelByProtoLikeC(game, 'tut-1');
}

/**
 * C: options.c **`ask_do_tutorial`** — if **`opt_set_in_config[opt_tutorial]`**, obey **`flags.tutorial`**
 * without a menu; else **`select_menu`** (**`Do you want a tutorial?`**) + **`nhgetch`** loop.
 * @returns {Promise<boolean>}
 */
export async function askDoTutorialLikeC() {
    const g = game;
    if (g.tutorial_set_in_config) return !!g.flags?.tutorial;
    /* C: options.c — NHW_MENU + select_menu(PICK_ONE); replay must supply y/n/ESC when tut-1 exists */
    const disp = g.nhDisplay;
    if (disp) return askDoTutorialMenuTTYLikeC(disp);
    return !!g.flags?.tutorial;
}

/**
 * C: allmain.c **`maybe_do_tutorial`** — after **`moveloop_preamble`**, before **`moveloop_core`** loop.
 * **`goto_level`** is still a subset (**`applyGotoLevelDirectHeroLikeC`**) — no Lua **`tutorial()`**, savelev, **`keepdogs`**, …; **`context.leaving_tutorial`** is cleared in **`moveloop_core`** tail, not here (**`runSegment`**).
 * @returns {Promise<void>}
 */
export async function maybeDoTutorialLikeC() {
    const sp = findLevelTut1LikeC();
    if (!sp) return;
    if (!(await askDoTutorialLikeC())) return;

    const g = game;
    const u = g.u;
    /* C: assign_level(&u.ucamefrom, &u.uz); */
    if (u?.uz) u.ucamefrom = { dnum: u.uz.dnum | 0, dlevel: u.uz.dlevel | 0 };

    g.iflags = g.iflags || {};
    /* C: iflags.nofollowers = TRUE — tutorial level change ignores pets */
    g.iflags.nofollowers = true;

    /* C: schedule_goto(&sp->dlevel, UTOTYPE_NONE, "Entering the tutorial.", 0); deferred_goto(); */
    scheduleGotoHeroLikeC(g, sp.dlevel, UTOTYPE_NONE, 'Entering the tutorial.', null);
    await deferredGotoHeroLikeC(g);

    vision_recalc(0);
    await docrt_flags(docrtRefresh);

    g.iflags.nofollowers = false;
}

/**
 * @param {boolean} resuming — C `moveloop_preamble(resuming)` (restore vs new).
 */
export async function moveloopPreamble(resuming) {
    const g = game;
    g.flags = g.flags || {};
    g.program_state = g.program_state || {};
    g.context = g.context || {};
    g.gd = g.gd || {};
    g.iflags = g.iflags || {};
    if (g.iflags.prev_decor === undefined) g.iflags.prev_decor = STONE;
    if (resuming && g.iflags?.deferred_X) {
        /* C: enter_explore_mode() — not ported */
    }

    const clock = g.fixed_datetime ? parseFixedDatetime(g.fixed_datetime) : null;
    if (clock) {
        g.flags.moonphase = phaseOfTheMoonFromDate(clock);
        g.flags.friday13 = isFriday13thFromDate(clock);
    } else {
        g.flags.moonphase = NEW_MOON;
        g.flags.friday13 = false;
    }

    if (g.flags.moonphase === FULL_MOON) {
        await pline('You are lucky!  Full moon tonight.');
        changeLuck(1);
    } else if (g.flags.moonphase === NEW_MOON) {
        await pline('Be careful!  New moon tonight.');
    }
    if (g.flags.friday13) {
        await pline('Watch out!  Bad things can happen on Friday the 13th.');
        changeLuck(-1);
    }

    if (!resuming) {
        /* C: program_state.beyond_savefile_load = 1 */
        g.program_state.beyond_savefile_load = 1;
        /* C: svc.context.rndencode = rnd(9000); */
        g.context.rndencode = rnd(9000);
        /* C: set_wear((struct obj *) 0); reset_justpicked(gi.invent); */
        setWear(null);
        resetJustPicked(g.invent);
        /* C: (void) pickup(1); — autopickup at initial location (pickup.c) */
        await pickup(1);
        /* C: svc.context.seer_turn = (long) rnd(30); */
        g.context.seer_turn = rnd(30);
        /* C: u.umovement = NORMAL_SPEED; initrack(); */
        g.u.umovement = NORMAL_SPEED;
        initrack();
    }

    /* C: disp.botlx = TRUE */
    g.disp = g.disp || {};
    g.disp.botlx = true;

    if (resuming) {
        await readEngrAt(g.u.ux, g.u.uy);
        fixShopDamage();
    }

    await encumberMsg();

    const mayAdv = takePendingGiveMayAdvancePline(g);
    if (mayAdv) await pline(mayAdv);
    for (const line of takePendingDrainForgetPlines(g)) await pline(line);

    if (g.gd.defer_see_monsters) {
        g.gd.defer_see_monsters = false;
        seeMonsters();
    }

    /* C: u.uz0.dlevel = u.uz.dlevel; svc.context.move = 0; */
    if (g.u?.uz) g.u.uz0 = { ...g.u.uz };
    g.context.move = 0;

    /* C: iflags.fuzzerpending — debug fuzzer */
    if (g.iflags?.fuzzerpending) {
        g.iflags.debug_fuzzer = FUZZER_IMPOSSIBLE_PANIC;
        g.iflags.fuzzerpending = false;
    }

    /* C: program_state.in_moveloop = 1 */
    g.program_state.in_moveloop = 1;
    /* C: if (iflags.perm_invent) update_inventory(); */
    if (g.iflags?.perm_invent) updateInventory();
}
