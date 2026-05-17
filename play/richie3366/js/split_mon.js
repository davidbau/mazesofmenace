// split_mon.js — Gremlin/mold split and fountain dry-up (minliquid, traps, etc.).
// C ref: potion.c split_mon(); makemon.c clone_mon(); fountain.c dryup().

import { pline, newsym } from './display.js';
import { cansee } from './vision.js';
import { rn2, rnd } from './rng.js';
import {
    ROOM,
    IS_FOUNTAIN,
    isok,
    F_WARNED,
    G_EXTINCT,
    PM_GREMLIN,
} from './const.js';
import { enextoNearMon } from './walkable.js';
import { monTrackClear } from './monflee.js';
import { updateInventory } from './invent.js';

/** @param {import('./gstate.js').game} g */
function monAt(g, x, y) {
    return !!(g.level?.monsters?.some((m) => (m.mx | 0) === x && (m.my | 0) === y));
}

/**
 * C: makemon.c **`clone_mon(mon, x, y)`** with **`x==0,y==0`** → near **`mon`** (**`enexto`**).
 * Omits **`mextra`**, **`place_monster`** light, **`christen_monst`**, **`isminion`/`tamedog`**, **`set_malign`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mon
 * @param {number} px — **0** means use **`mon`** position then **`enextoNearMon`**
 * @param {number} py
 * @returns {Record<string, unknown>|null}
 */
export function cloneMon(g, mon, px, py) {
    if (!g.level) return null;
    let nx = px | 0;
    let ny = py | 0;
    if (nx === 0 && ny === 0) {
        nx = mon.mx | 0;
        ny = mon.my | 0;
    }
    if (!isok(nx, ny)) return null;

    let mhp = mon.mhp | 0;
    const cap = mon.mhpmax | 0;
    if (mhp > cap) mhp = cap;
    if (mhp <= 1) return null;

    const mndx = mon.mnum | 0;
    const slot = g.mvitals?.[mndx];
    if (slot && ((slot.mvflags | 0) & G_EXTINCT) !== 0) return null;

    if (monAt(g, nx, ny)) {
        const dest = enextoNearMon(g, nx, ny, mon);
        if (!dest || monAt(g, dest.x | 0, dest.y | 0)) return null;
        nx = dest.x | 0;
        ny = dest.y | 0;
    }

    rnd(2); /* C: next_ident() for m_id */

    const half = Math.trunc(mhp / 2);
    const m2mhp = half;
    mon.mhp = mhp - half;

    const m2 = {
        mx: nx,
        my: ny,
        mnum: mndx,
        data: mon.data,
        mhp: m2mhp,
        mhpmax: cap,
        msleeping: mon.msleeping | 0,
        mpeaceful: mon.mpeaceful | 0,
        mtame: mon.mtame | 0,
        mcanmove: (mon.mcanmove ?? 1) | 0,
        mfrozen: mon.mfrozen | 0,
        mflee: mon.mflee | 0,
        mfleetim: mon.mfleetim | 0,
        mtrapped: 0,
        mundetected: 0,
        mcloned: 1,
        minvis: mon.minvis | 0,
    };
    if (mon.monnam) m2.monnam = mon.monnam;
    monTrackClear(m2);

    if (!g.svc?.context?.mon_moving && (mon.mpeaceful | 0)) {
        const luck = g.u?.uluck | 0;
        const denom = Math.max(2 + luck, 2);
        if ((mon.mtame | 0) !== 0) {
            if (!rn2(denom)) m2.mtame = 0;
        } else if (!rn2(denom)) {
            m2.mpeaceful = 0;
        }
    }

    if (!g.level.monsters) g.level.monsters = [];
    g.level.monsters.push(m2);
    newsym(nx, ny);
    return m2;
}

/**
 * C: potion.c **`split_mon(&gy.youmonst, NULL)`** — hero branch (**`cloneu`** + max split only; no **`makemon`** pet yet).
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} true if split applied
 */
export async function splitGremlinHeroPoly(g) {
    const u = g.u;
    if (!u) return false;
    if ((u.umonnum | 0) !== PM_GREMLIN) return false;

    let mh = u.mh | 0;
    let mhmax = (u.mhmax ?? u.uhpmax ?? 0) | 0;
    if (mh > mhmax) mh = mhmax;
    if (mh <= 1) return false;

    const mndx = u.umonnum | 0;
    const slot = g.mvitals?.[mndx];
    if (slot && ((slot.mvflags | 0) & G_EXTINCT) !== 0) return false;

    const cloneHp = Math.trunc(mh / 2);
    u.mh = mh - cloneHp;
    const halfMax = Math.trunc(mhmax / 2);
    u.mhmax = mhmax - halfMax;
    if ((u.mh | 0) > (u.mhmax | 0)) u.mh = u.mhmax;

    await pline('You multiply!');
    g.disp = g.disp || {};
    g.disp.botl = true;
    if (g.iflags?.perm_invent) updateInventory();
    return true;
}

/**
 * C: potion.c **`split_mon(mon, mtmp)`** — monster branch only (**`heatMtmp`** optional).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mon
 * @param {Record<string, unknown>|null|undefined} heatMtmp
 */
export async function splitMon(g, mon, heatMtmp) {
    void heatMtmp;
    const m2 = cloneMon(g, mon, 0, 0);
    if (!m2) return null;
    const halfMax = Math.trunc((mon.mhpmax | 0) / 2);
    m2.mhpmax = halfMax;
    mon.mhpmax = (mon.mhpmax | 0) - halfMax;
    const vis = cansee(mon.mx | 0, mon.my | 0);
    if (vis) {
        const raw = mon.monnam || mon.data?.mname || 'The monster';
        const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
        await pline(`${cap} multiplies!`);
    }
    return m2;
}

/**
 * C: fountain.c **`dryup(x, y, isyou)`** — fountain → **`ROOM`** subset.
 * Omits C **`in_town`** watchman warn, **`angry_guards`**, wizard **`y_n`** when **`isyou`**.
 * @param {import('./gstate.js').game} g
 */
export async function dryupAt(g, x, y, isyou) {
    const loc = g.level?.at(x, y);
    if (!loc || !IS_FOUNTAIN(loc.typ | 0)) return;

    const warned = ((loc.looted | 0) & F_WARNED) !== 0;
    if (rn2(3) && !warned) return;

    if (isyou) {
        /* C: in_town + SET_FOUNTAIN_WARNED + watchman — not ported */
        if (g.u?.uwizard) {
            /* C: y_n("Dry up fountain?") — skip without tty */
        }
    }

    if (cansee(x, y)) await pline('The fountain dries up!');

    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessedftn = 0;
    const lf = g.level?.flags;
    if (lf && (lf.nfountains | 0) > 0) lf.nfountains = (lf.nfountains | 0) - 1;

    newsym(x, y);
}
