// vault_hero.js — vault.c findgd / vault_occupied / uleftvault subset for hero.
// C ref: vault.c; steal.c mdrop_special_objs().

import { VAULT, EGD, OTYP_AMULET_OF_YENDOR, ROOMOFFSET } from './const.js';
import { onLevelLikeC } from './hacklib.js';
import { pline } from './display.js';
import { inRoomsTypewantedRoomnos } from './shop.js';
import { objResists } from './obj_resists.js';
import { placeFloorObjectInLevel, stackObjOnFloorInLevel } from './floorobj.js';
import { distmin } from './hacklib.js';
import { moneyCntInventLikeC } from './shop.js';
import { hiddenGold } from './u_init_hidden_gold.js';
import { cansee } from './vision.js';

/** C: vault.c **`vault_occupied(char *array)`** — first **`u.urooms`** letter in a **`VAULT`** room. */
export function vaultOccupiedFromUroomsLikeC(g) {
    const u = g.u;
    if (!u) return 0;
    const roomsStr = u.urooms;
    if (typeof roomsStr === 'string' && roomsStr.length) {
        for (let i = 0; i < roomsStr.length; i++) {
            const c = roomsStr.charCodeAt(i);
            const idx = (c | 0) - ROOMOFFSET;
            const room = g.level?.rooms?.[idx];
            if (room && (room.rtype | 0) === VAULT) return c;
        }
    }
    const rnos = inRoomsTypewantedRoomnos(g, u.ux | 0, u.uy | 0, VAULT);
    return rnos.length ? rnos[0] : 0;
}

/** C: vault.c **`findgd()`** — active vault guard on **`u.uz`**. */
export function findGdHeroLikeC(g) {
    const uz = g.u?.uz;
    if (!uz) return null;
    const mons = g.level?.monsters;
    if (mons) {
        for (const m of mons) {
            if (!m?.isgd) continue;
            const egd = EGD(m);
            if (egd && onLevelLikeC(egd.gdlevel, uz)) {
                if (!(m.mx | 0) && !(egd.gddone | 0)) {
                    m.mhp = m.mhpmax | 0;
                }
                return m;
            }
        }
    }
    const mig = g.migratingMons;
    if (mig) {
        for (const entry of mig) {
            const m = entry.mtmp;
            if (!m?.isgd) continue;
            const egd = EGD(m);
            if (egd && onLevelLikeC(egd.gdlevel, uz)) return m;
        }
    }
    return null;
}

/** C: mon.c **`Monnam`** stub. */
function monnamVaultLikeC(mtmp) {
    const n = mtmp?.data?.mname || mtmp?.monnam;
    return n ? `the ${n}` : 'the guard';
}

/** C: vault.c **`in_fcorridor(grd, x, y)`** — guard fake-corridor segment list. */
function inFcorridorHeroLikeC(grd, x, y) {
    const egrd = EGD(grd);
    if (!egrd) return false;
    const fcbeg = egrd.fcbeg | 0;
    const fcend = egrd.fcend | 0;
    const fc = egrd.fakecorr;
    if (!fc || fcend <= fcbeg) return false;
    const xi = x | 0;
    const yi = y | 0;
    for (let fci = fcbeg; fci < fcend; fci++) {
        const seg = fc[fci];
        if (seg && (seg.fx | 0) === xi && (seg.fy | 0) === yi) return true;
    }
    return false;
}

/** C: **`display.h`** **`canspotmon`** subset — see or sense (telepathy stub). */
function canspotMonVaultLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    if (cansee(mtmp.mx | 0, mtmp.my | 0)) return true;
    if (u.Telepat || u.HTelepat) return true;
    return false;
}

/**
 * C: vault.c **`gd_move(grd)`** — guard corridor cleanup / teleport.
 * Full AI deferred; no-op stub until fakecorr + guard path are ported.
 * @returns {boolean}
 */
export function gdMoveHeroLikeC(g, grd) {
    void g;
    void grd;
    return false;
}

/**
 * C: vault.c **`uleftvault(grd)`** — hero left vault; guard may turn hostile.
 * @param {import('./gstate.js').game} g
 */
export async function uleftvaultHeroLikeC(g, grd) {
    if (!grd || !(grd.isgd | 0) || (grd.mhp | 0) <= 0) return;
    const ux = g.u?.ux | 0;
    const uy = g.u?.uy | 0;
    const hasGold =
        (moneyCntInventLikeC(g) | 0) > 0
        || (hiddenGold(g, true) | 0) > 0;
    if (hasGold && distmin(ux, uy, grd.mx | 0, grd.my | 0) > 1) {
        if (grd.mpeaceful) {
            if (canspotMonVaultLikeC(g, grd)) {
                await pline(`${monnamVaultLikeC(grd)} becomes irate.`);
            }
            grd.mpeaceful = 0;
        }
        if (!inFcorridorHeroLikeC(grd, ux, uy)) {
            gdMoveHeroLikeC(g, grd);
        }
    }
}

function unlinkObjFromMinvent(mtmp, obj) {
    let prev = null;
    for (let o = mtmp.minvent; o; o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = obj.nobj;
            else mtmp.minvent = obj.nobj;
            obj.nobj = null;
            return;
        }
        prev = o;
    }
}

/**
 * C: steal.c **`mdrop_special_objs(mon)`** — amulet / resist objects stay off migrating mons.
 * @param {import('./gstate.js').game} g
 */
export function mdropSpecialObjsHeroLikeC(g, mtmp) {
    if (!mtmp) return;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    for (let obj = mtmp.minvent; obj; ) {
        const next = obj.nobj;
        const special =
            (obj.otyp | 0) === OTYP_AMULET_OF_YENDOR
            || objResists(obj, 0, 0);
        if (special) {
            unlinkObjFromMinvent(mtmp, obj);
            if (mx) {
                placeFloorObjectInLevel(g, obj, mx, my);
                stackObjOnFloorInLevel(g, obj);
            } else {
                obj.ox = -1;
                obj.oy = -1;
            }
        }
        obj = next;
    }
}
