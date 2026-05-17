// punish_hero.js — Ball and chain (read.c punish / unpunish subset).
// C ref: read.c punish(sobj) (~3019); unpunish(void) (~3065); you.h Punished-style checks as in goto_level_hero heroPunishedLikeC.

import {
    W_BALL,
    W_CHAIN,
    OTYP_HEAVY_IRON_BALL,
    WT_IRON_BALL_INCR,
} from './const.js';
import {
    obliterateObjectInLevel,
    mksobjIronChainMkobjPunishLikeC,
    mksobjHeavyIronBallMkobjPunishLikeC,
    placeFloorObjectInLevel,
    stackObjOnFloorInLevel,
} from './floorobj.js';
import { removeObjFromHeroInvent } from './water_damage.js';
import { pline, newsym } from './display.js';
import { permonstHuman, amorphous, isWhirly, unsolid } from './mondata.js';

/** @param {import('./gstate.js').game} g */
function heroPermonstPunishLikeC(g) {
    const u = g?.u;
    if (!u) return permonstHuman;
    if (!(u.Upolyd | 0)) return g.urace?.permonst ?? permonstHuman;
    return g.youmonst?.data ?? permonstHuman;
}

/** C: invent **`addinv`**-style prepend (**`nobj`** singly-linked list). */
function prependObjHeroInventLikeC(g, o) {
    if (!o) return;
    o.nobj = g.invent ?? null;
    g.invent = o;
}

/**
 * C: **`Punished`** / carried **`uball`** — same idea as **`goto_level_hero.js`** **`heroPunishedLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function heroPunishedLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    if ((u.Punished | 0) !== 0) return true;
    const b = g.uball;
    if (!b) return false;
    for (let o = g.invent; o; o = o.nobj) {
        if (o === b) return true;
    }
    return false;
}

/**
 * C: read.c **`punish(sobj)`** — scroll / unearthed ball / **`pray.c`** **`angrygods`** null **`sobj`** (**`reuse_ball`**).
 * Omits **`placebc`/`set_bc`** blind detail; non-**`uswallow`** tail uses **`newsym`** only (**`ball.c`** **`placebc_core`** TODO).
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number, cursed?: number } | null} sobj scroll, **`HEAVY_IRON_BALL`**, or **`null`** (gods’ punishment)
 */
export async function punishHeroFromObjLikeC(g, sobj) {
    const u = g?.u;
    if (!u) return;

    const reuseBall =
        sobj && (sobj.otyp | 0) === OTYP_HEAVY_IRON_BALL ? /** @type {object} */ (sobj) : null;
    const cursedLevy = sobj && (sobj.cursed | 0) ? 1 : 0;

    if (!reuseBall) await pline('You are being punished for your misbehavior!');

    if (heroPunishedLikeC(g)) {
        await pline('Your iron ball gets heavier.');
        const b = g.uball;
        if (b) b.owt = (b.owt | 0) + WT_IRON_BALL_INCR * (1 + cursedLevy);
        return;
    }

    const ptr = heroPermonstPunishLikeC(g);
    if (amorphous(ptr) || isWhirly(ptr) || unsolid(ptr)) {
        if (!reuseBall) {
            await pline('A ball and chain appears, then falls away.');
            const ball = mksobjHeavyIronBallMkobjPunishLikeC();
            const ux = u.ux | 0;
            const uy = u.uy | 0;
            placeFloorObjectInLevel(g, ball, ux, uy);
            stackObjOnFloorInLevel(g, ball);
        } else {
            const ux = u.ux | 0;
            const uy = u.uy | 0;
            placeFloorObjectInLevel(g, reuseBall, ux, uy);
            stackObjOnFloorInLevel(g, reuseBall);
        }
        return;
    }

    const chain = mksobjIronChainMkobjPunishLikeC();
    const ball = reuseBall ? reuseBall : mksobjHeavyIronBallMkobjPunishLikeC();

    chain.owornmask = (chain.owornmask | 0) | W_CHAIN;
    ball.owornmask = (ball.owornmask | 0) | W_BALL;

    prependObjHeroInventLikeC(g, chain);
    prependObjHeroInventLikeC(g, ball);

    g.uchain = chain;
    g.uball = ball;
    u.Punished = 1;

    if (!(u.uswallow | 0)) {
        newsym(u.ux | 0, u.uy | 0);
    }
}

/**
 * C: read.c **`unpunish(void)`** — **`delobj`** chain; ball object stays in invent (**`setworn(0,W_BALL)`** clears **`uball`**).
 * @param {import('./gstate.js').game} g
 */
export function unpunishHeroLikeC(g) {
    const u = g?.u;
    if (!u) return;
    const chain = g.uchain;
    const ball = g.uball;
    if (chain) {
        removeObjFromHeroInvent(g, chain);
        obliterateObjectInLevel(g, chain);
        g.uchain = null;
    }
    if (ball) {
        ball.owornmask = (ball.owornmask | 0) & ~W_BALL;
        if (u.uwep === ball) u.uwep = null;
        g.uball = null;
    }
    u.Punished = 0;
}
