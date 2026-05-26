// goto_level_hero.js — do.c goto_level() subset for dig.c digactualhole + trap.c fall_through (hero falls).
// C ref: dig.c digactualhole() HOLE branch; trap.c trapeffect_hole() → fall_through(TRUE,…);
//        do.c goto_level / schedule_goto tail; spoteffects(FALSE) after arrival.
//
// Ported: **`applyGotoAfterHeroHoleFallLikeC(g, dest?)`**, **`impactDropLikeC`**/**`objDeliveryLikeC`** (**`dokick.c`**), **`shopdigLikeC(1)`** / **`payForDamage('dig into')`** before **`You fall through...`** (**`dig.c`** **`digactualhole`** order); **`pickup(1)`** tail (**`do.c`** **`goto_level`**).
// **`applyHeroDescendStairsOneLevelLikeC(g)`** — **`do.c`** **`goto_level`** down-stairs slice after **`mklev`**/**`u_on_upstairs`** (**`near_capacity`/`Punished`/`Fumbling`**, **`drag_down`**, **`losehp`**, **`placebc`**).
// **`scheduleGotoHeroLikeC` / `deferredGotoHeroLikeC`** — **`do.c`** **`schedule_goto`/`deferred_goto`** subset (**`applyGotoLevelDirectHeroLikeC`** for non-falling **`goto_level`**).
// **`keepdogsHeroLikeC`** — C **`dog.c`** **`keepdogs(pets_only)`** (**`mintrap`**, **`stay_behind`**, **`keep_mon_accessible`**, **`gm.mydogs`**).
// **`vision_recalc(2)`** after **`keepdogs`**, before **`u.uz`** assign — C **`goto_level`** (**`vision.c`** “no longer see old level” pass before **`savelev`**).
// **`gotoLevelTutorialBranchHookLikeC`** — C **`do.c`** **`newdungeon`** **`In_tutorial`/`tutorial()`** before **`savelev`** / **`impact_drop`** ( **`tutorial_branch.js`** ).
// **`maybeRecordEnteredNewLevelLivelogLikeC`** after **`mklev()`** when map built (**`livelog.js`**) — C **`new`** after **`mklev`**; **`livelogPrintfLikeC`** ring (**`gd.livelog_recent`**), no **`LIVELOGFILE`**.
// Deferred: **`fill_pit`**, real **`next_to_u`**,
// full **`keepdogs`/`dog.c`** migration (**`migrate_to_level`**, …), bones/save.

import {
    mklev,
    u_on_upstairs,
    u_on_dnstairsLikeC,
    u_on_sstairsLikeC,
    u_on_newpos,
    u_onRndspotLikeC,
} from './mklev.js';
import {
    In_endgame,
    In_hell,
    onWTowerLevelLikeC,
    inWTowerLikeC,
    MAGIC_PORTAL,
    UTOTYPE_ATSTAIRS,
    UTOTYPE_PORTAL,
} from './const.js';
import { spotEffects } from './spoteffects.js';
import { vision_recalc } from './vision.js';
import { pline, pline1 } from './display.js';
import {
    depth,
    onLevelLikeC,
    dunlevLikeC,
    dunlevsInDungeonLikeC,
    assignLevelLikeC,
    assignRndLevelLikeC,
} from './hacklib.js';
import { seetrap } from './search.js';
import { stairwayFindFromLikeC } from './decor.js';
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
import {
    placebcHeroLikeC,
    unplacebcHeroLikeC,
    ballreleaseHeroLikeC,
    ballfallHeroLikeC,
    weldedUballLikeC,
} from './ball_bc_hero.js';
import { safeTeledsHeroLikeC, TELEDS_NO_FLAGS } from './teleport_hero.js';
import { keepdogsHeroLikeC } from './keepdogs_hero.js';
import { losedogsLikeC } from './mon_arrive.js';

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
 * C: **`do.c`** **`goto_level`** — Gehennom amulet “mysterious force” may push **`dest`** deeper when climbing up.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum: number, dlevel: number }} dest — mutated in place
 * @param {{ up: boolean, portal: boolean, newdungeon: boolean, wasInWTower: boolean }} opts
 * @returns {Promise<boolean>} **true** when C returns early (**`safe_teleds`** on same level — teleported subset omitted).
 */
async function applyGehennomMysteryForceGotoDestLikeC(g, dest, opts) {
    const u = g.u;
    const uz0 = u?.uz;
    if (!uz0) return false;
    if (!In_hell(uz0) || !opts.up || !u.uhave?.amulet || opts.newdungeon || opts.portal) return false;
    if (dunlevLikeC(uz0) >= dunlevsInDungeonLikeC(uz0) - 3) return false;

    g.context = g.context || {};
    const mf = g.context.mysteryforce | 0;
    if (rn2(4 + mf)) return false;

    const odds = 3 + (u.ualign?.type | 0);
    let diff = odds <= 1 ? 0 : rn2(odds);
    if (diff !== 0) {
        assignRndLevelLikeC(dest, uz0, diff);
        diff = (dest.dlevel | 0) - (uz0.dlevel | 0);
        if (opts.wasInWTower && !onWTowerLevelLikeC(dest)) diff = 0;
    }
    if (diff === 0) assignLevelLikeC(dest, uz0);

    await pline('A mysterious force momentarily surrounds you...');
    g.context.mysteryforce = mf + rn2(diff + 2);

    if (onLevelLikeC(dest, uz0)) {
        await safeTeledsHeroLikeC(g, TELEDS_NO_FLAGS);
        return true;
    }
    return false;
}

/**
 * C: **`do.c`** **`goto_level`** post-**`mklev`** placement — portal, **`at_stairs`**, else **`u_on_rndspot`**.
 * @param {import('./gstate.js').game} g
 * @param {{ portal?: boolean, atStairs?: boolean, up?: boolean, uz0: { dnum: number, dlevel: number }, atLadder?: boolean, wasInWTower?: boolean, newdungeon?: boolean }} opts
 */
export function placeHeroAfterGotoLevelLikeC(g, opts) {
    const u = g.u;
    if (!u) return;
    const uz = u.uz;
    const uz0 = opts.uz0;
    const portal = !!opts.portal;
    const atStairs = !!opts.atStairs;
    const up = !!opts.up;
    const atLadder = !!opts.atLadder;
    const wasInWTower = !!opts.wasInWTower;
    const newdungeon = !!opts.newdungeon;

    if (portal && !In_endgame(uz)) {
        const traps = g.level?.traps;
        let ttrap = null;
        if (traps) {
            for (let i = 0; i < traps.length; i++) {
                const t = traps[i];
                if (t && (t.ttyp | 0) === MAGIC_PORTAL) {
                    ttrap = t;
                    break;
                }
            }
        }
        if (!ttrap) {
            u_onRndspotLikeC(g, 0);
        } else {
            seetrap(ttrap);
            u_on_newpos(ttrap.tx | 0, ttrap.ty | 0);
        }
        return;
    }

    if (atStairs && !In_endgame(uz)) {
        if (up) {
            const stway = stairwayFindFromLikeC(g, uz0, atLadder);
            if (stway) {
                u_on_newpos(stway.sx | 0, stway.sy | 0);
                stway.u_traversed = true;
            } else if (newdungeon) u_on_sstairsLikeC(1);
            else u_on_dnstairsLikeC();
        } else {
            const stway = stairwayFindFromLikeC(g, uz0, atLadder);
            if (stway) {
                u_on_newpos(stway.sx | 0, stway.sy | 0);
                stway.u_traversed = true;
            } else if (newdungeon) u_on_sstairsLikeC(0);
            else u_on_upstairs();
        }
        return;
    }

    u_onRndspotLikeC(g, (up ? 1 : 0) | (wasInWTower ? 2 : 0));
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
 * @param {{ atStairs?: boolean, portal?: boolean, up?: boolean, atLadder?: boolean }} [gotoOpts]
 */
export async function applyGotoLevelDirectHeroLikeC(g, dest, gotoOpts = {}) {
    const u = g.u;
    if (!u || !g.level) return;

    const uz0 = u.uz || { dnum: 0, dlevel: 1 };
    const destMut = { dnum: dest.dnum | 0, dlevel: dest.dlevel | 0 };
    if (dunlevLikeC(destMut) > dunlevsInDungeonLikeC(destMut)) {
        destMut.dlevel = dunlevsInDungeonLikeC(destMut);
    }

    const up = gotoOpts.up != null
        ? !!gotoOpts.up
        : depth(uz0) > depth(destMut);
    const newdungeon = (uz0.dnum | 0) !== (destMut.dnum | 0);
    const wasInWTower = inWTowerLikeC(u.ux | 0, u.uy | 0, g);

    if (await applyGehennomMysteryForceGotoDestLikeC(g, destMut, {
        up,
        portal: !!gotoOpts.portal,
        newdungeon,
        wasInWTower,
    })) {
        return;
    }

    const dn = destMut.dnum | 0;
    let dl = destMut.dlevel | 0;
    const mx = g.dungeons?.[dn]?.num_dunlevs;
    if (mx != null) {
        if (dl > (mx | 0)) dl = mx | 0;
        if (dl < 1) dl = 1;
    }
    const newUz = { dnum: dn, dlevel: dl };
    if (onLevelLikeC(uz0, newUz)) return;

    gotoLevelTutorialBranchHookLikeC(g, uz0, newUz);

    if (heroPunishedLikeC(g)) unplacebcHeroLikeC(g);

    if (!g.iflags?.nofollowers) await keepdogsHeroLikeC(g, false);
    vision_recalc(2);

    u.uz = newUz;
    u.utrap = 0;
    u.utraptype = 0;

    if (await mklev()) maybeRecordEnteredNewLevelLivelogLikeC(g);
    await losedogsLikeC(g);
    if (!In_endgame(newUz)) {
        placeHeroAfterGotoLevelLikeC(g, {
            portal: !!gotoOpts.portal,
            atStairs: !!gotoOpts.atStairs,
            up,
            uz0,
            atLadder: !!gotoOpts.atLadder,
            wasInWTower,
            newdungeon,
        });
    }
    if (heroPunishedLikeC(g)) await placebcHeroLikeC(g);
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
        else {
            await applyGotoLevelDirectHeroLikeC(g, dest, {
                atStairs: (typmask & UTOTYPE_ATSTAIRS) !== 0,
                portal: (typmask & UTOTYPE_PORTAL) !== 0,
            });
        }

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

    if (heroPunishedLikeC(g)) unplacebcHeroLikeC(g);

    if (!g.iflags?.nofollowers) await keepdogsHeroLikeC(g, false);
    vision_recalc(2);

    u.uz = newUz;
    u.utrap = 0;
    u.utraptype = 0;

    if (await mklev()) maybeRecordEnteredNewLevelLivelogLikeC(g);
    await losedogsLikeC(g);
    if (!In_endgame(newUz)) u_onRndspotLikeC(g, 0);
    if (heroPunishedLikeC(g) && !weldedUballLikeC(g)) await ballfallHeroLikeC(g);
    if (heroPunishedLikeC(g)) await placebcHeroLikeC(g);
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
 * Omits **`dismount_steed`**, **`selftouch`**, **`obj_delivery`**, branch mapseen.
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

    if (heroPunishedLikeC(g)) unplacebcHeroLikeC(g);

    if (!g.iflags?.nofollowers) await keepdogsHeroLikeC(g, false);
    vision_recalc(2);

    u.uz = newUz;
    u.utrap = 0;
    u.utraptype = 0;

    if (await mklev()) maybeRecordEnteredNewLevelLivelogLikeC(g);
    await losedogsLikeC(g);
    placeHeroAfterGotoLevelLikeC(g, {
        atStairs: true,
        up: false,
        uz0,
        atLadder,
        wasInWTower: false,
        newdungeon: (uz0.dnum | 0) !== (newUz.dnum | 0),
    });
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
        if (heroPunishedLikeC(g) && g.uball) {
            await dragDownHeroStairsLikeC(g);
            await ballreleaseHeroLikeC(g, false);
        }
        if (!(u.usteed | 0)) {
            const knm = atLadder ? 'falling off a ladder' : 'tumbling down a flight of stairs';
            losehp(maybeHalfPhys(rnd(3)), knm, 0);
        }
    } else if (verbose) {
        await pline(atLadder ? 'You climb down the ladder.' : 'You descend the stairs.');
    }

    if (heroPunishedLikeC(g)) await placebcHeroLikeC(g);
    await objDeliveryLikeC(g, false);
    await spotEffects(g, false, {});
    await objDeliveryLikeC(g, true);
    vision_recalc(1);
    await pickup(1);
    return true;
}
