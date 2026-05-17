// tutorial_branch.js — C dungeon.h In_tutorial + do.c goto_level tutorial() stubs.
// C ref: include/dungeon.h In_tutorial(x); dungeon.c tutorial_dnum (dname_to_dnum("The Tutorial"));
//       do.c goto_level() newdungeon block — tutorial(TRUE)/tutorial(FALSE); nhlua.c tutorial(boolean).

import { findLevelByProtoLikeC } from './sp_levchn.js';

/**
 * C: **`tutorial_dnum`** from **`find_level("tut-1")`** once **`sp_levchn`** holds **`tut-1`**.
 * @param {import('./gstate.js').game} g
 * @returns {number} branch **`dnum`**, or **`-1`** if unknown / no **`tut-1`** node.
 */
export function tutorialDnumLikeC(g) {
    const sp = findLevelByProtoLikeC(g, 'tut-1');
    const d = sp?.dlevel?.dnum;
    if (d == null || !Number.isFinite(Number(d))) return -1;
    return d | 0;
}

/**
 * C: **`In_tutorial(x)`** — **`(x)->dnum == tutorial_dnum`** (**`dungeon.h`**).
 * @param {import('./gstate.js').game} g
 * @param {{ dnum?: number, dlevel?: number } | null | undefined} lev
 */
export function inTutorialAtLevelLikeC(g, lev) {
    const td = tutorialDnumLikeC(g);
    if (td < 0 || !lev) return false;
    return (lev.dnum | 0) === td;
}

/**
 * C: **`context.h`** **`leaving_tutorial`** — hero just **`goto_level`**’d off the tutorial **`dnum`** (**`do.c`** **`newdungeon`** hook).
 * JS mirrors on **`g.gd`** until **`moveloop_core`** tail clears both (**`allmain.js`**).
 * @param {import('./gstate.js').game} g
 * @returns {boolean}
 */
export function contextLeavingTutorialActiveLikeC(g) {
    return !!(g?.context?.leaving_tutorial || g?.gd?.leaving_tutorial);
}

/**
 * C: **`nhlua.c`** **`tutorial(boolean entering)`** — **`l_nhcore_call`** only; no JS Lua core yet.
 * **`tutorial(FALSE)`** also clears **`nhcore_call_available`** for re-entry (**`NHCORE_ENTER_TUTORIAL`**).
 * @param {import('./gstate.js').game} g
 * @param {boolean} entering
 */
export function tutorialLuaHookStubLikeC(g, entering) {
    g.program_state = g.program_state || {};
    if (entering) {
        if (g.program_state.tutorial_reentry_blocked) return;
        return;
    }
    g.program_state.tutorial_reentry_blocked = true;
    /* C: free_tutorial() — sequestered invent / gmst_* — deferred until full tutorial port */
}

/**
 * C: **`do.c`** **`goto_level`** — when **`newdungeon`** (**`u.uz.dnum != newlevel->dnum`**), before **`savelev`** / **`impact_drop`**:
 * **`In_tutorial(newlevel)`** → **`tutorial(TRUE)`**; else **`In_tutorial(&u.uz)`** → **`tutorial(FALSE)`** with **`svc.context.leaving_tutorial`** (**C **`context.h`**); JS sets **`g.context.leaving_tutorial`** and **`g.gd.leaving_tutorial`**.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum?: number, dlevel?: number }} oldUz
 * @param {{ dnum?: number, dlevel?: number }} newUz
 */
export function gotoLevelTutorialBranchHookLikeC(g, oldUz, newUz) {
    const oldD = oldUz?.dnum | 0;
    const newD = newUz?.dnum | 0;
    if (oldD === newD) return;

    const td = tutorialDnumLikeC(g);
    if (td < 0) return;

    if ((newUz.dnum | 0) === td) {
        tutorialLuaHookStubLikeC(g, true);
        return;
    }
    if ((oldUz.dnum | 0) === td) {
        tutorialLuaHookStubLikeC(g, false);
        g.context = g.context || {};
        g.context.leaving_tutorial = true;
        g.gd = g.gd || {};
        g.gd.leaving_tutorial = true;
    }
}
