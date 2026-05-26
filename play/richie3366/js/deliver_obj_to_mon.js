// deliver_obj_to_mon.js — C dokick.c deliver_obj_to_mon (MIGR_TO_SPECIES booty).
// C ref: dokick.c deliver_obj_to_mon(); makemon.c allow_minvent tail; dog.c mon_arrive MIGR_LEFTOVERS.

import {
    MIGR_TO_SPECIES,
    MIGR_LEFTOVERS,
    NON_PM,
    In_mines,
    has_mgivenname,
    has_oname,
} from './const.js';
import { rnd, rn2 } from './rng.js';
import { permonstFromMndxLikeC } from './mondata.js';
import { christenOrcLikeC } from './do_name_orc.js';
import { upstartLikeC } from './objnam.js';

/** C: hack.h DF_NONE / DF_RANDOM / DF_ALL */
export const DF_NONE = 0x00;
export const DF_RANDOM = 0x01;
export const DF_ALL = 0x04;

/** C: dokick.c DELIVER_PM */
const M2_UNDEAD = 0x00000002;
const M2_WERE = 0x00000004;
const M2_HUMAN = 0x00000008;
const M2_ELF = 0x00000010;
const M2_DWARF = 0x00000020;
const M2_GNOME = 0x00000040;
const M2_ORC = 0x00000080;
const M2_DEMON = 0x00000100;
const M2_GIANT = 0x00002000;
const DELIVER_PM = M2_UNDEAD | M2_WERE | M2_HUMAN | M2_ELF | M2_DWARF
    | M2_GNOME | M2_ORC | M2_DEMON | M2_GIANT;

/** C: obj handling — clear named booty gang string. */
function freeOnameLikeC(obj) {
    if (!obj) return;
    delete obj.oname;
    if (obj.oextra) delete obj.oextra.oname;
}

/** @param {object} mtmp @param {object} otmp */
function addToMinvDeliverLikeC(mtmp, otmp) {
    otmp.ox = 0;
    otmp.oy = 0;
    otmp.nobj = mtmp.minvent ?? null;
    mtmp.minvent = otmp;
}

/**
 * C: dokick.c `deliver_obj_to_mon(mtmp, cnt, deliverflags)`.
 * @param {import('./gstate.js').game} g
 * @param {object} mtmp
 * @param {number} cnt
 * @param {number} deliverflags — DF_*
 * @returns {object} mtmp (may be renamed via `christen_orc`)
 */
export function deliverObjToMonLikeC(g, mtmp, cnt, deliverflags) {
    const list = g.migratingObjs;
    if (!list?.length || !mtmp) return mtmp;

    let maxobj = 1;
    const df = deliverflags | 0;
    if ((df & DF_RANDOM) && cnt > 1) maxobj = rnd(cnt);
    else if (df & DF_ALL) maxobj = 0;
    else maxobj = 1;

    const ptr = mtmp.data || permonstFromMndxLikeC(mtmp.mnum | 0);
    const mDeliver = (ptr?.mflags2 ?? 0) & DELIVER_PM;
    const atCrimeScene = In_mines(g.u?.uz);

    let delivered = 0;
    const remain = [];
    let stopDeliver = false;

    for (const e of list) {
        if (stopDeliver) {
            remain.push(e);
            continue;
        }
        const where = e.toloc | 0;
        if ((where & MIGR_TO_SPECIES) === 0) {
            remain.push(e);
            continue;
        }
        const species = (e.migrSpecies ?? e.obj?.corpsenm ?? NON_PM) | 0;
        if (species === NON_PM || mDeliver !== (species & DELIVER_PM)) {
            remain.push(e);
            continue;
        }
        const otmp = e.obj;
        if (!otmp) continue;

        if ((species & M2_ORC) !== 0 && has_oname(otmp)) {
            if (!has_mgivenname(mtmp)) {
                if (atCrimeScene || !rn2(2)) {
                    const gang = atCrimeScene ? upstartLikeC(otmp.oname || '') : null;
                    mtmp = christenOrcLikeC(mtmp, gang, ' the Fence');
                }
            }
            freeOnameLikeC(otmp);
        }
        if (otmp.corpsenm != null) otmp.corpsenm = NON_PM;
        e.migrSpecies = NON_PM;
        otmp.omigr_from_dnum = 0;
        otmp.omigr_from_dlevel = 0;
        addToMinvDeliverLikeC(mtmp, otmp);
        delivered++;
        if (maxobj && delivered >= maxobj) stopDeliver = true;
    }

    g.migratingObjs = remain;
    return mtmp;
}

/**
 * C: dog.c `mon_arrive` — `MIGR_LEFTOVERS` block before placement.
 * @param {import('./gstate.js').game} g
 * @param {object} mtmp
 */
export function monArriveLeftoversDeliverLikeC(g, mtmp) {
    if ((mtmp.migflags | 0) & MIGR_LEFTOVERS) {
        if (g.migratingObjs?.length) deliverObjToMonLikeC(g, mtmp, 0, DF_ALL);
    }
}
