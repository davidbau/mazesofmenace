// switch_terrain.js — Terrain change effects on hero (levitation / flight / status terrain).
// C ref: hack.c switch_terrain(), classify_terrain(); polyself.c float_vs_flight(), steed_vs_stealth();
//        steed.c mount/dismount also calls steed_vs_stealth (not wired in JS yet — import steedVsStealthLikeC there);
//        trap.c float_up() (expanded: utrap / uinwater / uswallow / encumber_msg / fill_pit; steed+dismount TODO).

import { pline } from './display.js';
import { encumberMsg } from './pickup.js';
import { fillPitInLevel } from './trap.js';
import {
    FROMOUTSIDE,
    I_SPECIAL,
    IS_ROOM,
    STONE,
    TREE,
    CORR,
    ROOM,
    DOOR,
    DRAWBRIDGE_UP,
    MOAT,
    WATER,
    X_FLOOR,
    X_GROUND,
    X_OPENDOOR,
    X_SHUTDOOR,
    X_SWAMP,
    X_SUBMERGED,
    X_WATERWALL,
    IS_OBSTRUCTED,
    IS_WATERWALL,
    LAVAWALL,
    Is_earthlevel,
    Is_waterlevel,
    Is_juiblex_level,
    Is_airlevel,
    D_ISOPEN,
    D_CLOSED,
    D_LOCKED,
    D_TRAPPED,
    TT_PIT,
    TT_WEB,
    TT_LAVA,
    TT_INFLOOR,
    TT_BURIEDBALL,
} from './const.js';
import { isClosedDoorLoc } from './walkable.js';
import { raceptr, dmgtypeFromattack } from './mondata.js';

/** C: monattk.h — **`digests`/`enfolds`** vs **`surface()`** inside animal engulfer. */
const AT_ENGL = 11;
const AD_DGST = 26;
const AD_WRAP = 28;
/** C: monflag.h **`M1_ANIMAL`**. */
const M1_ANIMAL = 0x00040000;

/** C: youprop.h raw **`HLevitation||ELevitation`** (not **`Levitation`** macro). */
function rawLevitationSources(u) {
    return ((u?.HLevitation | 0) || (u?.ELevitation | 0) || (u?.Levitation | 0)) !== 0;
}

/** C: youprop.h raw **`HFlying||EFlying`** (no steed). */
function rawFlyingSources(u) {
    return ((u?.HFlying | 0) || (u?.EFlying | 0) || (u?.Flying | 0)) !== 0;
}

/**
 * C: youprop.h **`Levitation`** — **`(H||E) && !BLevitation`** (any blocked bits).
 * @param {import('./gstate.js').game} g
 */
export function levitationEffectiveLikeC(g) {
    const u = g.u;
    if (!u) return false;
    return rawLevitationSources(u) && !(u.BLevitation | 0);
}

/**
 * C: youprop.h **`Flying`** — **`(HF||EF)&&!BFlying`** (**`steed`** not wired).
 * @param {import('./gstate.js').game} g
 */
export function flyingEffectiveLikeC(g) {
    const u = g.u;
    if (!u) return false;
    return rawFlyingSources(u) && !(u.BFlying | 0);
}

/**
 * C: polyself.c **`steed_vs_stealth`** — mounted on non-flying steed blocks stealth (**`BStealth`** **`FROMOUTSIDE`**).
 * Uses **`Flying`/`Levitation`** macros (**`flyingEffectiveLikeC`/`levitationEffectiveLikeC`**).
 * @param {import('./gstate.js').game} g
 */
export function steedVsStealthLikeC(g) {
    const u = g.u;
    if (!u) return;
    if (u.usteed && !flyingEffectiveLikeC(g) && !levitationEffectiveLikeC(g)) {
        u.BStealth = (u.BStealth | 0) | FROMOUTSIDE;
    } else {
        u.BStealth = (u.BStealth | 0) & ~FROMOUTSIDE;
    }
}

/**
 * C: polyself.c **`float_vs_flight`** — **`BFlying`/`BLevitation`** **`I_SPECIAL`** vs lev / floor trap;
 * then **`steed_vs_stealth`** (riding vs **`Flying`/`Levitation`**).
 * @param {import('./gstate.js').game} g
 */
export function floatVsFlightLikeC(g) {
    const u = g.u;
    if (!u) return;
    const stuckInFloor = (u.utrap | 0) !== 0 && (u.utraptype | 0) !== TT_PIT;

    if (rawLevitationSources(u) || (rawFlyingSources(u) && stuckInFloor)) {
        u.BFlying = (u.BFlying | 0) | I_SPECIAL;
    } else {
        u.BFlying = (u.BFlying | 0) & ~I_SPECIAL;
    }

    if (rawLevitationSources(u) && stuckInFloor) {
        u.BLevitation = (u.BLevitation | 0) | I_SPECIAL;
    } else {
        u.BLevitation = (u.BLevitation | 0) & ~I_SPECIAL;
    }

    steedVsStealthLikeC(g);

    g.disp = g.disp || {};
    g.disp.botl = true;
}

/**
 * C: trap.c **`reset_utrap(msg)`** — **`float_up`** / **`You("can fly.")`** after **`set_utrap(0,0)`** (**`u.utrap`** already clear).
 * @param {import('./gstate.js').game} g
 * @param {boolean} msg
 * @param {boolean} wasLevitation C **`Levitation != 0`** before **`set_utrap`**
 * @param {boolean} wasFlying C **`Flying != 0`** before **`set_utrap`**
 */
export async function resetUtrapMsgAfterClearHeroLikeC(g, msg, wasLevitation, wasFlying) {
    if (!msg) return;
    if (!wasLevitation && levitationEffectiveLikeC(g)) {
        await floatUpAfterTerrainUnblockLikeC(g);
    }
    if (!wasFlying && flyingEffectiveLikeC(g)) {
        await pline('You can fly.');
    }
}

/** C: monmove.c **`closed_door(x,y)`** — hero cell. */
function closedDoorAt(g, x, y) {
    const loc = g.level?.at(x | 0, y | 0);
    return !!(loc && isClosedDoorLoc(loc));
}

/**
 * C: **`hack.c`** **`switch_terrain`** — **`blocklev`** from **`IS_OBSTRUCTED`**, **`closed_door`**,
 * **`IS_WATERWALL`**, **`LAVAWALL`**.
 * @param {import('./gstate.js').game} g
 */
function blockLevOrFlyLikeC(g) {
    const u = g.u;
    if (!u) return false;
    const x = u.ux | 0;
    const y = u.uy | 0;
    const loc = g.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ | 0;
    return IS_OBSTRUCTED(typ)
        || closedDoorAt(g, x, y)
        || IS_WATERWALL(typ)
        || typ === LAVAWALL;
}

/**
 * C: **`trap.c`** **`float_up`** — **`utrap`**, **`uinwater`**, **`uswallow`** branches, default float plines,
 * pre-**`float_vs_flight`** **`Flying`** pline, **`encumber_msg`**.
 * Still TODO: steed + **`Lev_at_will`** / **`dismount_steed`**, **`vision_recalc`** body.
 * **`uinwater`** uses dynamic **`import('./spoteffects.js')`** to avoid static **`spoteffects`↔`switch_terrain`** cycle.
 * @param {import('./gstate.js').game} g
 */
async function floatUpAfterTerrainUnblockLikeC(g) {
    const u = g.u;
    if (!u) return;
    g.disp = g.disp || {};
    g.disp.botl = true;

    if ((u.utrap | 0) !== 0) {
        const tt = u.utraptype | 0;
        if (tt === TT_PIT) {
            u.utrap = 0;
            u.utraptype = 0;
            await pline('You float up, out of the pit!');
            g.vision_full_recalc = 1;
            await fillPitInLevel(g, u.ux | 0, u.uy | 0);
        } else if (tt === TT_LAVA || tt === TT_INFLOOR) {
            await pline('Your body pulls upward, but your legs are still stuck.');
        } else if (tt === TT_BURIEDBALL) {
            const loc = g.level?.at(u.ux | 0, u.uy | 0);
            const floorWord = loc && IS_ROOM(loc.typ | 0) ? 'floor' : 'ground';
            await pline(`You feel lighter, but your leg is still chained to the ${floorWord}.`);
        } else if (tt === TT_WEB) {
            await pline('You float up slightly, but you are still stuck in the web.');
        } else {
            /* C: bear trap and any other **`utrap`** */
            await pline('You float up slightly, but your legs are still stuck.');
        }
    } else if ((u.uinwater | 0) !== 0) {
        const { spotEffects } = await import('./spoteffects.js');
        await spotEffects(g, true);
    } else if ((u.uswallow | 0) !== 0) {
        const stuck = u.ustuck;
        const ptr = stuck ? raceptr(stuck) : null;
        if (ptr && (ptr.mflags1 & M1_ANIMAL) !== 0) {
            const inner = dmgtypeFromattack(ptr, AD_DGST, AT_ENGL)
                ? 'maw'
                : dmgtypeFromattack(ptr, AD_WRAP, AT_ENGL)
                    ? 'husk'
                    : 'maw';
            await pline(`You float away from the ${inner}.`);
        } else {
            const raw = stuck?.data?.mname || 'monster';
            await pline(`You spiral up into ${raw}.`);
        }
    } else if (u.Hallucination | 0) {
        await pline('Up, up, and awaaaay!  You\'re walking on air!');
    } else if (Is_airlevel(u.uz)) {
        await pline('You gain control over your movements.');
    } else {
        await pline('You start to float in the air!');
    }

    /* C: **`u.usteed`** non-floater/flyer + **`Lev_at_will`** / **`dismount_steed`** — not wired */

    if (flyingEffectiveLikeC(g)) {
        await pline('You are no longer able to control your flight.');
    }
    floatVsFlightLikeC(g);
    await encumberMsg();
}

/**
 * C: **`hack.c`** **`classify_terrain`** — uses **`levl[u.ux][u.uy]`** (JS: hero cell); omits
 * **`lastseentyp`**, Medusa sea / Juiblex swamp (**`Is_*`** stubs), **`db_under_typ`**.
 * @param {import('./gstate.js').game} g
 */
export function classifyTerrainHeroLikeC(g) {
    g.iflags = g.iflags || {};
    const u = g.u;
    if (!u) return;
    const lev = g.level?.at(u.ux | 0, u.uy | 0);
    if (!lev) return;
    let typ = lev.typ | 0;

    if ((u.underwater | 0) !== 0) {
        typ = X_SUBMERGED;
    } else {
        switch (typ) {
        case STONE:
            if (g.level?.flags?.arboreal) typ = TREE;
            break;
        case CORR:
        case ROOM:
            typ = !Is_earthlevel(u.uz) ? X_FLOOR : X_GROUND;
            break;
        case DOOR: {
            const dm = lev.doormask | 0;
            if ((dm & D_ISOPEN) !== 0) typ = X_OPENDOOR;
            else if ((dm & (D_CLOSED | D_LOCKED | D_TRAPPED)) !== 0) typ = X_SHUTDOOR;
            break;
        }
        case DRAWBRIDGE_UP:
            typ = X_GROUND;
            break;
        case MOAT:
            if (Is_juiblex_level(u.uz)) typ = X_SWAMP;
            break;
        case WATER:
            if (!Is_waterlevel(u.uz)) typ = X_WATERWALL;
            break;
        default:
            break;
        }
    }

    const prev = g.iflags.terrain_typ;
    if (typ !== prev) {
        g.iflags.terrain_typ = typ;
        if (g.flags?.terrainstatus && !(g.context?.run | 0)) {
            g.disp = g.disp || {};
            g.disp.botl = true;
        }
    }
}

/**
 * C: **`hack.c`** **`switch_terrain(void)`** — levitation / flight block vs **`float_up`** /
 * **`float_vs_flight`**; **`classify_terrain`** when **`flags.terrainstatus`**.
 * @param {import('./gstate.js').game} g
 */
export async function switchTerrainLikeC(g) {
    g.flags = g.flags || {};
    const u = g.u;
    if (!u) return;

    const blocklev = blockLevOrFlyLikeC(g);
    const wasLevitating = levitationEffectiveLikeC(g);
    const wasFlying = flyingEffectiveLikeC(g);

    if (blocklev) {
        if (levitationEffectiveLikeC(g)) await pline('You can\'t levitate in here.');
        u.BLevitation = (u.BLevitation | 0) | FROMOUTSIDE;
    } else if ((u.BLevitation | 0) !== 0) {
        u.BLevitation = (u.BLevitation | 0) & ~FROMOUTSIDE;
        if (rawLevitationSources(u) || (u.BLevitation | 0) !== 0) {
            await floatUpAfterTerrainUnblockLikeC(g);
        }
    }

    if (blocklev) {
        if (flyingEffectiveLikeC(g)) await pline('You can\'t fly in here.');
        u.BFlying = (u.BFlying | 0) | FROMOUTSIDE;
    } else if ((u.BFlying | 0) !== 0) {
        u.BFlying = (u.BFlying | 0) & ~FROMOUTSIDE;
        floatVsFlightLikeC(g);
        if (flyingEffectiveLikeC(g)) await pline('You start flying.');
    }

    if ((!!levitationEffectiveLikeC(g) ^ wasLevitating) || (!!flyingEffectiveLikeC(g) ^ wasFlying)) {
        g.disp = g.disp || {};
        g.disp.botl = true;
    }

    if (g.flags.terrainstatus) classifyTerrainHeroLikeC(g);
}
