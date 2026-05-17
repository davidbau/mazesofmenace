// goto_level_hero.js — do.c goto_level() subset for dig.c digactualhole + trap.c fall_through (hero falls).
// C ref: dig.c digactualhole() HOLE branch; trap.c trapeffect_hole() → fall_through(TRUE,…);
//        do.c goto_level / schedule_goto tail; spoteffects(FALSE) after arrival.
//
// Ported: **`applyGotoAfterHeroHoleFallLikeC(g, dest?)`**, **`impactDropLikeC`**/**`objDeliveryLikeC`** (**`dokick.c`**), **`shopdigLikeC(1)`** / **`payForDamage('dig into')`** before **`You fall through...`** (**`dig.c`** **`digactualhole`** order); **`pickup(1)`** tail (**`do.c`** **`goto_level`**).
// **`applyHeroDescendStairsOneLevelLikeC(g)`** — **`do.c`** **`goto_level`** down-stairs slice after **`mklev`**/**`u_on_upstairs`** (**`near_capacity`/`Punished`/`Fumbling`**, **`drag_down`**, **`losehp`**, **`placebc`** omitted).
// **`scheduleGotoHeroLikeC` / `deferredGotoHeroLikeC`** — **`do.c`** **`schedule_goto`/`deferred_goto`** subset (**`applyGotoLevelDirectHeroLikeC`** for non-falling **`goto_level`**).
// **`keepdogsHeroStubLikeC`** — C **`dog.c`** **`keepdogs(pets_only)`** gate (**`if (!iflags.nofollowers) keepdogs(FALSE)`** in **`goto_level`**) before **`u.uz`** moves; stub tallies tame **`level.monsters`** and applies the C **`pets_only==TRUE`** tame-clear subset when that flag is passed (**ascension** / final escape — not wired from **`do.c`** yet).
// **`vision_recalc(2)`** after **`keepdogs`**, before **`u.uz`** assign — C **`goto_level`** (**`vision.c`** “no longer see old level” pass before **`savelev`**).
// **`gotoLevelTutorialBranchHookLikeC`** — C **`do.c`** **`newdungeon`** **`In_tutorial`/`tutorial()`** before **`savelev`** / **`impact_drop`** ( **`tutorial_branch.js`** ).
// **`maybeRecordEnteredNewLevelLivelogLikeC`** after **`mklev()`** when map built (**`livelog.js`**) — C **`new`** after **`mklev`**; **`livelogPrintfLikeC`** ring (**`gd.livelog_recent`**), no **`LIVELOGFILE`**.
// Deferred: **`fill_pit`**, real **`next_to_u`**,
// full **`keepdogs`/`dog.c`** migration (**`migrate_to_level`**, …), bones/save, full **`goto_level`** beyond **`mklev`**.

import { mklev, u_on_upstairs } from './mklev.js';
import { spotEffects } from './spoteffects.js';
import { vision_recalc } from './vision.js';
import { pline, pline1 } from './display.js';
import { onLevelLikeC } from './hacklib.js';
import { shopdigLikeC, payForDamage, heroInShopOccupancyLikeUshops } from './shop.js';
import { impactDropLikeC, objDeliveryLikeC } from './impact_drop.js';
import { pickup } from './pickup.js';
import { stairwayAtInGame } from './decor.js';
import { nearCapacity, syncHeroInvWeightNetLikeC } from './encumbr.js';
import { maybeHalfPhys, losehp } from './mthrowu.js';
import { rnd } from './rng.js';
import { dragDownHeroStairsLikeC } from './hold_another_hero.js';
import {
    UTOTYPE_NONE, UTOTYPE_DEFERRED, UTOTYPE_FALLING, UTOTYPE_RMPORTAL,
} from './const.js';
import { gotoLevelTutorialBranchHookLikeC } from './tutorial_branch.js';
import { maybeRecordEnteredNewLevelLivelogLikeC } from './livelog.js';

/** C: **`Punished`** / carried **`uball`** — macro subset until **`punish()`** sets **`u.Punished`**. */
function heroPunishedLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    if ((u.Punished | 0) !== 0) return true;
    const b = g.uball;
    if (!b) return false;
    for (let o = g.invent; o; o = o.nobj) if (o === b) return true;
    return false;
}

/** C: mon.c **`next_to_u`** — stub **TRUE** until ball&chain / leash parity. */
export function nextToUForHoleFallStub() {
    return true;
}

/**
 * C: **`dog.c`** **`keepdogs(boolean pets_only)`** — migrate tame **`fmon`** with hero across **`u.uz`** changes.
 * **`goto_level`** passes **`pets_only == FALSE`**; **`TRUE`** is ascension / final escape (clears mundane pet impediments before follow logic).
 * Stub: record **`pets_only`** and tame headcount; when **`pets_only`**, apply C **`keepdogs`** lines ~798–809 on tame mons (**`mtrapped`**, **`meating`**, **`msleeping`**, **`mfrozen`**, **`mcanmove`**) — no **`finish_meating`** / **`mintrap`** yet.
 * @param {import('./gstate.js').game} g
 * @param {boolean} petsOnly — C **`pets_only`** (**`FALSE`** on all **`goto_level`** paths wired here today).
 */
export function keepdogsHeroStubLikeC(g, petsOnly) {
    g.gd = g.gd || {};
    g.gd.keepdogs_last_pets_only = !!petsOnly;
    const mons = g.level?.monsters;
    let tame = 0;
    if (mons) {
        for (let i = 0; i < mons.length; i++) {
            const m = mons[i];
            if (!m) continue;
            if ((m.mtame | 0) > 0) {
                tame++;
                if (petsOnly) {
                    m.mtrapped = 0;
                    m.meating = 0;
                    m.msleeping = 0;
                    m.mfrozen = 0;
                    m.mcanmove = 1;
                }
            }
        }
    }
    g.gd.keepdogs_last_tame_seen = tame;
}

/** @param {import('./gstate.js').game} g */
function clearDeferredGotoMessagesLikeC(g) {
    const gd = g.gd;
    if (!gd) return;
    delete gd.dfr_pre_msg;
    delete gd.dfr_post_msg;
}

/**
 * C: **`do.c`** **`goto_level`** — plain arrival (**not** falling): **`keepdogs`**, **`vision_recalc(2)`**, set **`u.uz`**, **`mklev`**, **`spoteffects`**, **`vision_recalc(1)`**, **`pickup(1)`**.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum: number, dlevel: number }} dest
 */
export async function applyGotoLevelDirectHeroLikeC(g, dest) {
    const u = g.u;
    if (!u || !g.level) return;

    const uz0 = u.uz || { dnum: 0, dlevel: 1 };
    const dn = dest.dnum | 0;
    let dl = dest.dlevel | 0;
    const mx = g.dungeons?.[dn]?.num_dunlevs;
    if (mx != null) {
        if (dl > (mx | 0)) dl = mx | 0;
        if (dl < 1) dl = 1;
    }
    const newUz = { dnum: dn, dlevel: dl };
    if (onLevelLikeC(uz0, newUz)) return;

    gotoLevelTutorialBranchHookLikeC(g, uz0, newUz);

    if (!g.iflags?.nofollowers) keepdogsHeroStubLikeC(g, false);
    vision_recalc(2);

    u.uz = newUz;
    u.utrap = 0;
    u.utraptype = 0;

    if (await mklev()) maybeRecordEnteredNewLevelLivelogLikeC(g);
    await objDeliveryLikeC(g, false);
    await spotEffects(g, false, {});
    await objDeliveryLikeC(g, true);
    vision_recalc(1);
    await pickup(1);
}

/**
 * C: **`do.c`** **`schedule_goto(tolev, utotype_flags, pre_msg, post_msg)`** — **`u.utotype`** |= **`UTOTYPE_DEFERRED`**, **`assign_level(&u.utolev, tolev)`**, **`gd.dfr_*`**.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum: number, dlevel: number }} tolev
 * @param {number} utotypeFlags — without **`UTOTYPE_DEFERRED`** (e.g. **`UTOTYPE_NONE`** for tutorial).
 * @param {string|null|undefined} preMsg
 * @param {string|null|undefined} postMsg
 */
export function scheduleGotoHeroLikeC(g, tolev, utotypeFlags, preMsg, postMsg) {
    const u = g.u;
    if (!u) return;
    u.utotype = (utotypeFlags | 0) | UTOTYPE_DEFERRED;
    u.utolev = { dnum: tolev.dnum | 0, dlevel: tolev.dlevel | 0 };
    g.gd = g.gd || {};
    if (preMsg != null && preMsg !== '') g.gd.dfr_pre_msg = preMsg;
    else delete g.gd.dfr_pre_msg;
    if (postMsg != null && postMsg !== '') g.gd.dfr_post_msg = postMsg;
    else delete g.gd.dfr_post_msg;
}

/**
 * C: **`do.c`** **`deferred_goto`** — **`pline1(dfr_pre_msg)`**, **`goto_level`** ( **`applyGotoLevelDirectHeroLikeC`** / fall ), **`dfr_post_msg`** if **`!on_level(u.uz, oldlev)`**.
 * @param {import('./gstate.js').game} g
 */
export async function deferredGotoHeroLikeC(g) {
    g.gd = g.gd || {};
    const u = g.u;
    if (!u) return;
    if (!u.utolev) {
        u.utotype = UTOTYPE_NONE;
        clearDeferredGotoMessagesLikeC(g);
        return;
    }

    const cur = u.uz || { dnum: 0, dlevel: 1 };
    const tol = u.utolev;
    if (!onLevelLikeC(cur, tol)) {
        const typmask = u.utotype | 0;
        const oldlev = { dnum: cur.dnum | 0, dlevel: cur.dlevel | 0 };
        const dest = { dnum: tol.dnum | 0, dlevel: tol.dlevel | 0 };

        if (g.gd.dfr_pre_msg) await pline1(g.gd.dfr_pre_msg);

        if (typmask & UTOTYPE_FALLING) await applyGotoAfterHeroHoleFallLikeC(g, dest);
        else await applyGotoLevelDirectHeroLikeC(g, dest);

        if (typmask & UTOTYPE_RMPORTAL) {
            /* C: **`deltrap`/`newsym`** after **`goto_level`** — not ported */
        }

        const post = g.gd.dfr_post_msg;
        if (post && !onLevelLikeC(u.uz, oldlev)) await pline1(post);
    }

    u.utotype = UTOTYPE_NONE;
    clearDeferredGotoMessagesLikeC(g);
}

/**
 * C: **`goto_level`** after a hole fall — **`impact_drop`**, **`keepdogs`**, **`vision_recalc(2)`**, set **`u.uz`**, new map, **`spoteffects(FALSE)`**.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum: number, dlevel: number } | null | undefined} [dest] — C **`fall_through`** **`dtmp`** (**`trap->dst`**, **`find_hell`**, …). Omit for dig **`dlevel+1`** only.
 */
export async function applyGotoAfterHeroHoleFallLikeC(g, dest) {
    const u = g.u;
    if (!u || !g.level) return;

    const uz0 = u.uz || { dnum: 0, dlevel: 1 };
    /** @type {{ dnum: number, dlevel: number }} */
    let newUz;

    if (dest != null && Number.isInteger(dest.dlevel)) {
        const dn = dest.dnum | 0;
        let dl = dest.dlevel | 0;
        const mx = g.dungeons?.[dn]?.num_dunlevs;
        if (mx != null) {
            if (dl > (mx | 0)) dl = mx | 0;
            if (dl < 1) dl = 1;
        }
        newUz = { dnum: dn, dlevel: dl };
        if (onLevelLikeC(uz0, newUz)) return;
    } else {
        const dnum = uz0.dnum | 0;
        const prev = uz0.dlevel | 0;
        const maxLev = g.dungeons?.[dnum]?.num_dunlevs;
        if (maxLev != null && prev >= (maxLev | 0)) return;
        let dlevel = prev + 1;
        if (maxLev != null && dlevel > (maxLev | 0)) dlevel = maxLev | 0;
        newUz = { dnum, dlevel };
    }

    gotoLevelTutorialBranchHookLikeC(g, uz0, newUz);

    /* C: do.c **`goto_level`** **`falling`** → **`impact_drop(..., newlevel->dlevel)`** before **`u.uz`** assign. */
    await impactDropLikeC(g, null, u.ux | 0, u.uy | 0, newUz.dlevel | 0);

    if (!g.iflags?.nofollowers) keepdogsHeroStubLikeC(g, false);
    vision_recalc(2);

    u.uz = newUz;
    u.utrap = 0;
    u.utraptype = 0;

    if (await mklev()) maybeRecordEnteredNewLevelLivelogLikeC(g);
    await objDeliveryLikeC(g, false);
    await spotEffects(g, false, {});
    await objDeliveryLikeC(g, true);
    vision_recalc(1);
    /* C: do.c goto_level() — **`(void) pickup(1);`** before return (after fall dmg / deliveries). */
    await pickup(1);
}

/**
 * C: digactualhole HOLE + at hero: **`goto_level`** then **`spoteffects(FALSE)`**.
 * Caller must have placed the hole trap; C pre-checks **`!u.ustuck`**, **`!Levitation`**, **`!Flying`** ( **`dighole.js`** ).
 * @param {import('./gstate.js').game} g
 * @param {number} digX
 * @param {number} digY
 */
export async function gotoLevelHeroFallThroughDigHoleLikeC(g, digX, digY) {
    const u = g.u;
    if (!u || !g.level) return;

    const xi = digX | 0;
    const yi = digY | 0;
    if ((u.ux | 0) !== xi || (u.uy | 0) !== yi) return;

    if (u.ustuck) return;

    let wontFall = !!(u.Levitation || u.Flying);
    if (!wontFall && !nextToUForHoleFallStub()) {
        await pline('You are jerked back by your pet!');
        wontFall = true;
    }
    if (wontFall) return;

    if (heroInShopOccupancyLikeUshops(g)) await shopdigLikeC(g, 1);
    else await payForDamage(g, 'dig into', true);

    await pline('You fall through...');

    await applyGotoAfterHeroHoleFallLikeC(g);
}

/**
 * C: **`do.c`** **`goto_level`** — **`at_stairs`** && !**`up`** && !**`In_endgame`** after **`u_on_upstairs`**
 * ( **`stairway_find_from`** / **`u_on_sstairs`** omitted; **`u.dz`** treated as down).
 * **`keepdogs`**, **`vision_recalc(2)`**, then **`u.uz`** / **`mklev`** / **`u_on_upstairs`** …
 * Omits **`ballrelease`**, **`dismount_steed`**, **`selftouch`**, **`placebc`**, **`obj_delivery`**, branch mapseen.
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} true if level changed
 */
export async function applyHeroDescendStairsOneLevelLikeC(g) {
    const u = g.u;
    if (!u || !g.level) return false;

    const st = stairwayAtInGame(g, u.ux | 0, u.uy | 0);
    if (!st || st.up) {
        await pline("You can't go down here.");
        return false;
    }

    const uz0 = u.uz || { dnum: 0, dlevel: 1 };
    const dnum = uz0.dnum | 0;
    const prev = uz0.dlevel | 0;
    const maxLev = g.dungeons?.[dnum]?.num_dunlevs;
    if (maxLev != null && prev >= (maxLev | 0)) {
        await pline("You can't go down here.");
        return false;
    }

    const atLadder = !!st.isladder;
    const newUz = { dnum, dlevel: prev + 1 };

    if (!g.iflags?.nofollowers) keepdogsHeroStubLikeC(g, false);
    vision_recalc(2);

    u.uz = newUz;
    u.utrap = 0;
    u.utraptype = 0;

    if (await mklev()) maybeRecordEnteredNewLevelLivelogLikeC(g);
    u_on_upstairs();
    syncHeroInvWeightNetLikeC(g);

    const flying = !!(u.Levitation || u.Flying);
    const verbose = !!g.flags?.verbose;

    if (flying) {
        if (verbose) {
            await pline(
                atLadder ? 'You fly down along the ladder.' : 'You fly down the stairs.',
            );
        }
    } else if (
        (nearCapacity(g) | 0) > 0
        || heroPunishedLikeC(g)
        || (u.Fumbling | 0) !== 0
    ) {
        await pline(atLadder ? 'You fall down the ladder.' : 'You fall down the stairs.');
        if (heroPunishedLikeC(g) && g.uball) await dragDownHeroStairsLikeC(g);
        if (!(u.usteed | 0)) {
            const knm = atLadder ? 'falling off a ladder' : 'tumbling down a flight of stairs';
            losehp(maybeHalfPhys(rnd(3)), knm, 0);
        }
    } else if (verbose) {
        await pline(atLadder ? 'You climb down the ladder.' : 'You descend the stairs.');
    }

    /* C: **`goto_level`** — **`placebc`** after arrival when **`Punished`** (not ported). */
    await objDeliveryLikeC(g, false);
    await spotEffects(g, false, {});
    await objDeliveryLikeC(g, true);
    vision_recalc(1);
    await pickup(1);
    return true;
}
