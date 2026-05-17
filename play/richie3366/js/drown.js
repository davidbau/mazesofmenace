// drown.js — Hero entering water (trap.c drown() subset).
// C ref: trap.c drown() — feel_newsym; wading rn2(5); fall/sink plines; water_damage_chain
// (water_damage.js); gremlin split_mon / iron golem rust; leash/teleport/emergency_disrobe/done(DROWNING) TODO.

import { game } from './gstate.js';
import { IS_POOL, PM_GREMLIN, PM_IRON_GOLEM, KILLED_BY } from './const.js';
import { raceptr, breathless, swims, amphibious } from './mondata.js';
import { rndNexttoGoodposHero } from './walkable.js';
import { pline, feelNewsym } from './display.js';
import { rn2, d } from './rng.js';
import { waterDamageChainHeroInventory } from './water_damage.js';
import { maybeHalfPhys, losehp } from './mthrowu.js';
import { splitGremlinHeroPoly } from './split_mon.js';
import { snapshotUshops0FromHeroTileLikeC } from './shop.js';

/**
 * C: trap.c waterbody_name() subset — hero on **`IS_POOL`**.
 * @param {typeof game} g
 */
function waterbodyNamePool(g) {
    const u = g.u;
    const loc = u ? g.level?.at(u.ux, u.uy) : null;
    if (loc && IS_POOL(loc.typ)) return 'pool of water';
    return 'water';
}

/**
 * C: **`Swimming`** macro (innate **`swims`** only until **`HSwimming`** / **`FROMFORM`** port).
 * @param {ReturnType<typeof raceptr>} ptr
 */
function swimmingMacro(ptr) {
    return swims(ptr);
}

/**
 * After the hero steps onto an **`IS_POOL`** square (**`trap.c`** **`drown()`**).
 * @param {typeof game} [g]
 * @param {{ fromDx?: number, fromDy?: number }} [opts] — last move (**`u.dx`/`u.dy`**); needed for wading **`rn2(5)`** gate.
 * @returns {Promise<boolean>} true if hero **crawled** to a different square (caller should **`newsym`** pool + new cell). **`feelNewsym`** on the pool square runs inside this function (**`trap.c`** **`drown`**).
 */
export async function maybeHeroPoolEnter(g = game, opts = {}) {
    const u = g.u;
    if (!u) return false;
    const loc = g.level?.at(u.ux, u.uy);
    if (!loc || !IS_POOL(loc.typ)) return false;

    /* C: trap.c drown() — feel_newsym(u.ux, u.uy); in case Blind, map the water here */
    feelNewsym(u.ux, u.uy);

    const ptr = raceptr(g.youmonst);
    const dx = opts.fromDx | 0;
    const dy = opts.fromDy | 0;
    const prevX = u.ux - dx;
    const prevY = u.uy - dy;
    const prevLoc = g.level?.at(prevX, prevY);

    /** C: `inpool_ok` — wading branch may still run **`water_damage_chain`** then exit before drowning setup. */
    let inpoolOk = false;
    if (
        (u.underwater | 0) &&
        prevLoc &&
        IS_POOL(prevLoc.typ) &&
        (breathless(ptr) || swims(ptr) || amphibious(ptr))
    ) {
        if (rn2(5) === 0) inpoolOk = true;
        else return false;
    }

    const comfyInWater = amphibious(ptr) || breathless(ptr) || swims(ptr);
    const swimM = swimmingMacro(ptr);
    const isWaterwall = false; /* C: is_waterwall(u.ux,u.uy) */

    if (!u.underwater) {
        const verb = isWaterwall ? 'plunge' : 'fall';
        const body = waterbodyNamePool(g);
        const punct = comfyInWater ? '.' : '!';
        await pline(`You ${verb} into the ${body}${punct}`);
        if (!swimM && !isWaterwall) {
            const sink = (u.Hallucination | 0) ? 'the Titanic' : 'a rock';
            await pline(`You sink like ${sink}.`);
        }
    }

    await waterDamageChainHeroInventory(g);

    /* C: trap.c drown — after water_damage_chain: split_mon gremlin else iron golem rust */
    if ((u.umonnum | 0) === PM_GREMLIN && rn2(3)) {
        await splitGremlinHeroPoly(g);
    } else if ((u.umonnum | 0) === PM_IRON_GOLEM) {
        await pline('You rust!');
        const i = maybeHalfPhys(d(2, 6));
        const mhmax = (u.mhmax ?? u.uhpmax ?? 0) | 0;
        if (mhmax > i) u.mhmax = mhmax - i;
        if ((u.mh | 0) > (u.mhmax | 0)) u.mh = u.mhmax;
        losehp(i, 'rusting away', KILLED_BY);
    }

    if (inpoolOk) return false;

    /* C: leash / teleport / steed / faint — not ported */

    if (comfyInWater) {
        if (amphibious(ptr) || breathless(ptr)) {
            if (g.flags?.verbose) await pline("But you aren't drowning.");
            /* C: !Is_waterlevel(&u.uz) */
            if (u.Hallucination | 0) await pline('Your keel hits the bottom.');
            else await pline('You touch bottom.');
        }
        /* C: Punished unplacebc / placebc — not ported */
        u.underwater = 1;
        return false;
    }

    const dest = rndNexttoGoodposHero(u.ux, u.uy, g);
    if (!dest) {
        u.underwater = 1;
        return false;
    }

    const ox = u.ux;
    const oy = u.uy;
    u.ux0 = ox;
    u.uy0 = oy;
    snapshotUshops0FromHeroTileLikeC(g);
    u.ux = dest.x;
    u.uy = dest.y;
    u.underwater = 0;

    await pline('You try to crawl out of the water.');
    await pline('Pheew!  That was close.');
    return true;
}
