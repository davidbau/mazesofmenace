// spoteffects.js — Hero arrival on a map cell (hack.c spoteffects / pooleffects slice).
// C ref: hack.c spoteffects(boolean pick), pooleffects(boolean newspot); trap.c drown(),
//        lava_effects(); pickup.c pickup(); trap.c dotrap(); dungeon.c ceiling(); mon.c mnexto().
//
// Ported: recursion guard (inspoteffects + spotloc + spotterrain + dotrap typ), in_lava_effects
// early-out, pooleffects liquid entry (lava before pool, drown gate vs C), check_special_room stub,
// pickup(1) before/after pit vs non-pit, dotrap with same-trap re-entry suppression,
// youprop.h Warning + timeout.c spot_time_left MELT_ICE_AWAY on is_ice, m_at piercer/surprise + mnexto,
// hack.c switch_terrain + classify_terrain (lev/flight block, iflags.terrain_typ).
// Still TODO: HLevitation timeout/float_down, sink+Levitation, gi.in_steed_dismounting,
// full pooleffects leave-water; ceiling() vault/temple/shop/in_quest nuance; sensemon / x_monnam parity;
// float_vs_flight (polyself.c); trap.c float_up utrap/uinwater/uswallow; C-gated classify when !terrainstatus.

import { game } from './gstate.js';
import { pline, newsym } from './display.js';
import { tAt } from './search.js';
import { dotrap } from './trap.js';
import { pickup } from './pickup.js';
import { maybeHeroPoolEnter } from './drown.js';
import { maybeHeroLavaEffects } from './lava.js';
import {
    IS_LAVA,
    IS_POOL,
    IS_WATERWALL,
    IS_ROOM,
    IS_WALL,
    IS_DOOR,
    IS_SDOOR,
    IS_AIR,
    is_pit,
    NO_TRAP_FLAGS,
    Is_waterlevel,
    Is_firelevel,
    Is_earthlevel,
    In_quest,
    MAX_TYPE,
} from './const.js';
import { raceptr, breathless, swims, amphibious, S_PIERCER } from './mondata.js';
import { isIceAt } from './melt_ice.js';
import { spotTimeLeftMeltIceAway } from './level_timers.js';
import { enextoCoreLikeC, enextoNearMon } from './walkable.js';
import { GP_CHECKSCARY } from './const.js';
import { dealWithOvercrowding } from './mon_limbo.js';
import { d, rnd } from './rng.js';
import { losehp, maybeHalfPhys } from './mthrowu.js';
import { switchTerrainLikeC, levitationEffectiveLikeC, flyingEffectiveLikeC } from './switch_terrain.js';

/** C: hack.c static `inspoteffects` / `spotloc` / `spotterrain` — overwritten each nested entry. */
let spDepth = 0;
let spLocX = 0;
let spLocY = 0;
let spTerr = 0;

/** C: hack.c static during `dotrap` — `spottrap` / `spottraptyp` for nested `spoteffects` guard. */
let activeDotrapTtyp = 0;

function swimmingLike(ptr) {
    return swims(ptr);
}

/** C: youprop.h **`Warning`** — **`HWarning || EWarning`**. */
function heroWarningLikeC(u) {
    return ((u?.HWarning | 0) || (u?.EWarning | 0)) !== 0;
}

/** C: objnam.c **`hard_helmet`** / do_wear.c — same material test as **`trap.js`**. */
function hardHelmetForMsg(obj) {
    if (!obj) return false;
    const m = obj.oc_material;
    if (m === 11 || m === 12 || m === 13) return true; /* IRON, METAL, COPPER */
    if (m === 19) return true; /* GLASS */
    return !!(obj.oc_crackable);
}

/** C: objnam.c **`helm_simple_name`** — helm vs hat from **`hard_helmet`**. */
function helmSimpleNameLikeC(helm) {
    return hardHelmetForMsg(helm) ? 'helm' : 'hat';
}

/** C: mon.c **`mon_nam`** / **`Monnam`** — stub until **`x_monnam`**. */
function monNam(mtmp) {
    const n = mtmp?.data?.mname || mtmp?.monnam;
    if (n) return `the ${n}`;
    return 'the monster';
}

function monNamCap(mtmp) {
    const s = monNam(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** C: dungeon.c **`ceiling(x,y)`** — JS subset (no **`in_rooms`** vault/temple/shop yet). */
export function ceilingStringHeroLikeC(g, x, y) {
    const u = g.u;
    const loc = g.level?.at(x, y);
    const typ = loc ? (loc.typ | 0) : 0;
    const uz = u?.uz;
    if (Is_waterlevel(uz)) return 'water above';
    if (IS_AIR(typ)) return 'sky';
    if (Is_firelevel(uz)) return 'flames above';
    if (In_quest(uz)) return 'expanse above';
    if ((u?.underwater | 0) !== 0) return "water's surface";
    if ((IS_ROOM(typ) && !Is_earthlevel(uz)) || IS_WALL(typ) || IS_DOOR(typ) || IS_SDOOR(typ)) return 'ceiling';
    return 'rock cavern';
}

function mAtOnLevel(g, x, y) {
    return g.level?.monsters?.find((m) => (m.mx | 0) === x && (m.my | 0) === y) ?? null;
}

function heroBlindLikeMthrowu(u) {
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

/** C: mondata.h **`sensemon`** — telepathy stub until full warn-of / **`sensemon`**. */
function senseMonTelepathyStub(u) {
    return ((u?.HTelepat | 0) || (u?.ETelepat | 0)) !== 0;
}

/**
 * C: hack.c **`if (Warning && is_ice(...))`** + **`timeout.c`** **`spot_time_left`**.
 * @param {typeof game} g
 */
async function warningIceMeltPlinesLikeC(g) {
    const u = g.u;
    if (!u) return;
    if (!heroWarningLikeC(u)) return;
    if (!isIceAt(g, u.ux | 0, u.uy | 0)) return;
    const icewarnings = /** @type {const} */ ([
        'The ice seems very soft and slushy.',
        'You feel the ice shift beneath you!',
        "The ice, is gonna BREAK!", /* The Dead Zone */
    ]);
    const timeLeft = spotTimeLeftMeltIceAway(g, u.ux | 0, u.uy | 0) | 0;
    if (timeLeft && timeLeft < 15) {
        const idx = timeLeft < 5 ? 2 : timeLeft < 10 ? 1 : 0;
        await pline('%s', icewarnings[idx]);
    }
}

/**
 * C: hack.c **`m_at` + piercer / surprise** + **`mon.c`** **`mnexto(mtmp, RLOC_NOMSG)`**.
 * @param {typeof game} g
 */
async function spotMonsterOnHeroCeilingLikeC(g) {
    const u = g.u;
    if (!u) return;
    if ((u.uswallow | 0) !== 0) return;
    const mtmp = mAtOnLevel(g, u.ux | 0, u.uy | 0);
    if (!mtmp) return;

    mtmp.mundetected = 0;
    mtmp.msleeping = 0;

    const ptr = raceptr(mtmp);
    const mlet = ptr.mlet | 0;
    const ceil = ceilingStringHeroLikeC(g, u.ux | 0, u.uy | 0);

    if (mlet === S_PIERCER) {
        await pline('%s suddenly drops from the %s!', monNamCap(mtmp), ceil);
        if ((mtmp.mtame | 0) !== 0) {
            /* C: empty — tame jumps to greet */
        } else if (hardHelmetForMsg(u.uarmh)) {
            await pline('Its blow glances off your %s.', helmSimpleNameLikeC(u.uarmh));
        } else if ((u.uac ?? 10) + 3 <= rnd(20)) {
            await pline('You are almost hit by %s!', monNam(mtmp));
        } else {
            let dmg = d(4, 6);
            if (u.Half_physical_damage | 0) dmg = Math.trunc((dmg + 1) / 2);
            await pline('You are hit by %s!', monNam(mtmp));
            losehp(maybeHalfPhys(dmg), 'falling piercer', 0);
        }
    } else {
        /* default: monster surprises you */
        if ((mtmp.mtame | 0) !== 0) {
            await pline('%s jumps near you from the %s.', monNamCap(mtmp), ceil);
        } else if ((mtmp.mpeaceful | 0) !== 0) {
            const blind = heroBlindLikeMthrowu(u);
            const whom = blind && !senseMonTelepathyStub(u)
                ? 'something'
                : monNam(mtmp).replace(/^the /, 'a ');
            await pline(`You surprise ${whom}!`);
            mtmp.mpeaceful = 0;
        } else {
            await pline('%s attacks you by surprise!', monNamCap(mtmp));
        }
    }
    await mnextoLikeC(g, mtmp);
}

/**
 * C: mon.c **`mnexto`** — **`enexto`** near hero (**`enexto_core`**, not ring walk).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {boolean} true when monster moved
 */
export function mnextoNearHeroSyncLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    if (mtmp === u.usteed) {
        mtmp.mx = u.ux | 0;
        mtmp.my = u.uy | 0;
        return true;
    }
    const ptr = mtmp.data;
    if (!ptr) return false;
    const cc = { x: 0, y: 0 };
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    if (
        !enextoCoreLikeC(g, cc, ux, uy, ptr, GP_CHECKSCARY)
        && !enextoCoreLikeC(g, cc, ux, uy, ptr, 0)
    ) {
        return false;
    }
    mtmp.mx = cc.x | 0;
    mtmp.my = cc.y | 0;
    return true;
}

/**
 * C: mon.c **`mnexto`** — **`enexto`** near hero, else **`deal_with_overcrowding`**.
 * @param {typeof game} g
 */
async function mnextoLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return;
    const ox = mtmp.mx | 0;
    const oy = mtmp.my | 0;
    if (!mnextoNearHeroSyncLikeC(g, mtmp)) {
        await dealWithOvercrowding(g, mtmp);
        return;
    }
    newsym(ox, oy);
    newsym(mtmp.mx | 0, mtmp.my | 0);
}

/**
 * C: hack.c **`pooleffects(newspot)`** — liquid entry/leave; JS subset (**`drown`/`lava_effects`** only).
 * @param {typeof game} g
 * @param {boolean} newspot
 * @param {{ fromDx?: number, fromDy?: number }} opts
 * @returns {Promise<boolean>} true ⇒ C **`goto spotdone`** (hero moved by **`drown`** etc.)
 */
async function pooleffectsBooleanNewspot(g, newspot, opts) {
    const u = g.u;
    if (!u) return false;

    /* C: leave-water / plane / lava oops — not ported (no **`set_uinwater`** yet). */

    if ((u.ustuck | 0) !== 0) return false;
    if (levitationEffectiveLikeC(g) || flyingEffectiveLikeC(g)) return false;

    const loc = g.level?.at(u.ux, u.uy);
    if (!loc) return false;
    const typ = loc.typ | 0;

    const poolOrLava = IS_POOL(typ) || IS_LAVA(typ);
    if (!poolOrLava) return false;

    /* C: usteer grounded / dismount / Upolyd ceiling_hider — not ported */
    if (IS_LAVA(typ)) {
        const lavaMoved = await maybeHeroLavaEffects(g);
        return !!lavaMoved;
    }

    const ptr = raceptr(g.youmonst);
    const wwalking = !!(u.Wwalking | 0);
    const waterwall = IS_WATERWALL(typ);
    const wadeGate = !wwalking || waterwall;
    const comfyWater = amphibious(ptr) || breathless(ptr) || swimmingLike(ptr);
    const inwater = !!(u.underwater | 0);
    if (wadeGate && (newspot || !inwater || !comfyWater)) {
        const crawled = await maybeHeroPoolEnter(g, {
            fromDx: opts.fromDx | 0,
            fromDy: opts.fromDy | 0,
        });
        return !!crawled;
    }
    return false;
}

/**
 * C: hack.c **`pooleffects(newspot)`** — exported for **`dig.c`** **`liquid_flow`**.
 * @param {typeof game} g
 * @param {boolean} [newspot]
 * @param {{ fromDx?: number, fromDy?: number }} [opts]
 */
export async function pooleffectsNewspotLikeC(g, newspot = false, opts = {}) {
    return pooleffectsBooleanNewspot(g, newspot, opts);
}

/** C: hack.c **`check_special_room(FALSE)`** — stub until **`mkroom.c`** parity. */
function checkSpecialRoomSpoteffects(_g, _picked) {
    void _g;
    void _picked;
}

/** C: allmain.c newgame — **`check_special_room(FALSE)`** after **`vision_reset`**. */
export function checkSpecialRoomNewgameFalseLikeC(g) {
    checkSpecialRoomSpoteffects(g, false);
}

/**
 * C: hack.c **`spoteffects(boolean pick)`** — post-move arrival (**`domove`** / displace).
 * @param {typeof game} [g]
 * @param {boolean} [pick] — C **`pick`** (**`pickup(1)`** when true)
 * @param {{ fromDx?: number, fromDy?: number }} [opts] — last move for **`drown`** wading gate
 */
export async function spotEffects(g = game, pick = true, opts = {}) {
    g.iflags = g.iflags || {};
    const u = g.u;
    if (!u) return;

    /* C: `if (iflags.in_lava_effects) return;` */
    if (g.iflags.in_lava_effects | 0) return;

    const loc0 = g.level?.at(u.ux, u.uy);
    const curTerr = loc0 ? (loc0.typ | 0) : 0;
    const trap0 = tAt(u.ux, u.uy);
    const trapT0 = trap0 ? (trap0.ttyp | 0) : 0;

    /* C: `if (inspoteffects && u_at(spotloc) && spotterrain == levl[ux][uy].typ && (...)) return` */
    if (
        spDepth > 0
        && (u.ux | 0) === spLocX
        && (u.uy | 0) === spLocY
        && curTerr === spTerr
        && (!activeDotrapTtyp || !trap0 || (trapT0 | 0) === (activeDotrapTtyp | 0))
    ) {
        return;
    }

    spDepth += 1;
    spLocX = u.ux | 0;
    spLocY = u.uy | 0;
    spTerr = curTerr;

    try {
        /* C: `if (spotterrain != levl[u.ux0][u.uy0].typ || iflags.terrain_typ == MAX_TYPE) switch_terrain();` */
        const prevLoc = g.level?.at(u.ux0 | 0, u.uy0 | 0);
        const prevTerr = prevLoc ? (prevLoc.typ | 0) : spTerr;
        const tt = g.iflags.terrain_typ;
        if (spTerr !== prevTerr || tt === undefined || tt === MAX_TYPE) {
            await switchTerrainLikeC(g);
        }

        const moved = await pooleffectsBooleanNewspot(g, true, opts);
        if (moved) return;

        checkSpecialRoomSpoteffects(g, false);

        /* C: `IS_SINK(...) && Levitation` dosinkfall; HLevitation timeout + float_down; in_steed_dismounting — not ported */

        const tr = tAt(u.ux, u.uy);
        const pit = !!(tr && is_pit(tr.ttyp | 0));
        if (pick && !pit) await pickup(1);

        const tr2 = tAt(u.ux, u.uy);
        if (tr2) {
            const tt = tr2.ttyp | 0;
            if (!activeDotrapTtyp || (activeDotrapTtyp | 0) !== tt) {
                activeDotrapTtyp = tt;
                try {
                    await dotrap(tr2, NO_TRAP_FLAGS);
                } finally {
                    activeDotrapTtyp = 0;
                }
            }
        }
        if (pick && pit) await pickup(1);

        await warningIceMeltPlinesLikeC(g);
        await spotMonsterOnHeroCeilingLikeC(g);
    } finally {
        spDepth -= 1;
        if (spDepth <= 0) {
            spLocX = 0;
            spLocY = 0;
            spTerr = 0;
        }
    }
}
