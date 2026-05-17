// mon_limbo.js — mon.c overcrowding / endgame elemental clog (subset).
// C ref: mon.c deal_with_overcrowding(), m_into_limbo(), migrate_mon(), elemental_clog(), ok_to_obliterate()

import { pline, newsym } from './display.js';
import { rn2 } from './rng.js';
import {
    In_endgame,
    Is_astralevel,
    has_emin,
    has_epri,
    has_eshk,
    MON_LIMBO,
    MON_ENDGAME_MIGR,
    MON_OBLITERATE,
    MIGR_APPROX_XY,
    MIGR_RANDOM,
} from './const.js';
import { raceptr, monHasAmulet, isHomeElemental, isRiderMnum, S_ELEMENTAL } from './mondata.js';

/**
 * C: mon.c **`ok_to_obliterate`** — **`mons[PM_WIZARD_OF_YENDOR]`** via **`mname`** when **`mnum`** not wired.
 * @param {import('./gstate.js').game} g
 */
function okToObliterateLikeC(g, mtmp, mon) {
    if (!mtmp || mtmp === mon) return false;
    if ((mtmp.mhp | 0) <= 0) return false;
    if (!(mtmp.mx | 0) && !(mtmp.my | 0)) return false;
    if (monHasAmulet(mtmp)) return false;
    if (has_emin(mtmp) || has_epri(mtmp) || has_eshk(mtmp)) return false;
    const ptr = raceptr(mtmp);
    if (isRiderMnum(ptr.mnum | 0)) return false;
    const name = (mtmp.data?.mname || mtmp.monnam || '').toLowerCase();
    if (name.includes('wizard of yendor')) return false;
    if (mtmp === g.u?.ustuck || mtmp === g.u?.usteed) return false;
    return true;
}

/**
 * C: dog.c **`migrate_to_level`** / trap.c **`migrateToLevelMon`** — remove from **`fmon`**, queue **`migrating_mons`**.
 * @param {import('./gstate.js').game} g
 * @param {{ mleashed?: number, mtame?: number, mx?: number, my?: number, mstate?: number }} mtmp
 * @param {{ dnum: number, dlevel: number }} toLev
 * @param {number} migrateTyp
 */
function migrateMonToLevel(g, mtmp, toLev, migrateTyp) {
    if ((mtmp.mleashed | 0)) {
        mtmp.mtame = Math.max(0, (mtmp.mtame | 0) - 1);
        mtmp.mleashed = 0;
    }
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const mons = g.level?.monsters;
    const i = mons ? mons.indexOf(mtmp) : -1;
    if (i >= 0) mons.splice(i, 1);
    if (!g.migratingMons) g.migratingMons = [];
    const u = g.u;
    g.migratingMons.push({
        mtmp,
        mux: toLev.dnum | 0,
        muy: toLev.dlevel | 0,
        migrateTyp,
        fromDnum: u?.uz?.dnum,
        fromDlevel: u?.uz?.dlevel,
        xWas: mx,
        yWas: my,
    });
    mtmp.mx = 0;
    mtmp.my = 0;
    newsym(mx, my);
}

/**
 * C: mon.c **`m_into_limbo`** — **`MON_LIMBO`**, **`migrate_mon(..., ledger_no(&u.uz), MIGR_APPROX_XY)`**.
 * @param {import('./gstate.js').game} g
 */
export function mIntoLimbo(g, mtmp) {
    if (!mtmp || !g.u?.uz) return;
    const u = g.u;
    if ((mtmp.mx | 0) || (mtmp.my | 0)) {
        if (mtmp === u.ustuck) u.ustuck = null;
    }
    mtmp.mstate = (mtmp.mstate | 0) | MON_LIMBO;
    migrateMonToLevel(g, mtmp, { dnum: u.uz.dnum | 0, dlevel: u.uz.dlevel | 0 }, MIGR_APPROX_XY);
}

function obliterateMonGone(g, victim) {
    const mx = victim.mx | 0;
    const my = victim.my | 0;
    victim.mstate = (victim.mstate | 0) | MON_OBLITERATE;
    victim.mhp = 0;
    const arr = g.level?.monsters;
    const i = arr ? arr.indexOf(victim) : -1;
    if (i >= 0) arr.splice(i, 1);
    newsym(mx, my);
}

/**
 * C: mon.c **`elemental_clog`** — endgame only (**subset**: same selection order, no **`mongone`** side effects beyond removal).
 * @param {import('./gstate.js').game} g
 * @param {object} mon — overcrowded monster (**`rloc`** failed)
 */
async function elementalClog(g, mon) {
    const u = g.u;
    if (!u || !In_endgame(u.uz)) return;

    let msgmv = g.elementalClogMsgmv | 0;
    const moves = g.moves | 0;
    if (!msgmv || moves - msgmv > 200) {
        if (!msgmv || rn2(2)) await pline('You feel besieged.');
        g.elementalClogMsgmv = moves;
    }

    /** @type {object|null} */
    let m1 = null;
    let m2 = null;
    /** @type {object|null} */
    let m3 = null;
    let m4 = null;
    let m5 = null;
    let mLev = 0;

    const list = g.level?.monsters ?? [];
    for (let i = 0; i < list.length; i++) {
        const mtmp = list[i];
        if ((mtmp.mhp | 0) <= 0 || mtmp === mon) continue;
        if ((mtmp.mx ?? 0) === 0 && (mtmp.my ?? 0) === 0) continue;
        if (!okToObliterateLikeC(g, mtmp, mon)) continue;
        const ptr = raceptr(mtmp);
        if ((ptr.mlet | 0) === S_ELEMENTAL) {
            if (!isHomeElemental(mtmp, u.uz)) {
                if (!m1) m1 = mtmp;
            } else if (!m2) {
                m2 = mtmp;
            }
        } else if (!(mtmp.mtame | 0)) {
            const lev = (mtmp.m_lev | 0) || (ptr.mlevel | 0);
            if (!mLev || lev < mLev) {
                mLev = lev;
                m3 = mtmp;
            } else if (!m4) {
                m4 = mtmp;
            }
        } else if (!m5) {
            m5 = mtmp;
            break;
        }
    }

    const victim = m1 || m2 || m3 || m4 || m5;
    if (victim) {
        const mx = victim.mx | 0;
        const my = victim.my | 0;
        obliterateMonGone(g, victim);
        const ox = mon.mx | 0;
        const oy = mon.my | 0;
        mon.mx = mx;
        mon.my = my;
        newsym(ox, oy);
        newsym(mx, my);
    } else if (!Is_astralevel(u.uz)) {
        mon.mstate = (mon.mstate | 0) | MON_ENDGAME_MIGR;
        migrateMonToLevel(g, mon, { dnum: u.uz.dnum | 0, dlevel: (u.uz.dlevel | 0) - 1 }, MIGR_RANDOM);
    }
}

/**
 * C: mon.c **`deal_with_overcrowding(mtmp)`**.
 * @param {import('./gstate.js').game} g
 */
export async function dealWithOvercrowding(g, mtmp) {
    if (!mtmp) return;
    const u = g.u;
    if (!u) return;
    if (In_endgame(u.uz)) await elementalClog(g, mtmp);
    else mIntoLimbo(g, mtmp);
}
