// sounds.js — Ambient sounds and #chat.
// C ref: sounds.c — dotalk / dochat / domonnoise (MS_BARK subset).

import { game } from './gstate.js';
import { pline } from './display.js';
import { getdir } from './lock.js';
import { mon_at } from './uhitm.js';
import { Monnam } from './do_name.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, isok,
} from './const.js';

/** C ref: monflag.h MS_BARK — dogs/canines (mlet S_DOG). */
const MS_BARK = 1;

/**
 * Infer msound when generated tables omit it.
 * S_DOG → MS_BARK (little dog / dog / wolf / …).
 */
function mon_msound(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return 0;
    if (ptr.msound != null) return ptr.msound | 0;
    if (ptr.mlet === 'S_DOG') return MS_BARK;
    return 0; // MS_SILENT — other sounds deferred
}

/**
 * C ref: sounds.c domonnoise — MS_BARK tame/peaceful bark path.
 * Other MS_* named omitted in C-JS-MAP; unknown → ECMD_OK (silent).
 * FULL_MOON howl needs night() — deferred; falls through to bark.
 */
export async function domonnoise(mtmp) {
    if (!mtmp) return ECMD_OK;
    if (game.u?.Deaf) return ECMD_OK;
    const msound = mon_msound(mtmp);
    if (msound === 0 && !mtmp.isshk) return ECMD_OK;

    let pline_msg = null;
    const ptr = mtmp.data;
    const moves = game.moves | 0;
    const hungrytime = mtmp.edog?.hungrytime | 0;

    if (msound === MS_BARK) {
        // C: FULL_MOON && night() → "howls." — night() deferred
        if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || moves > hungrytime || (mtmp.mtame | 0) < 5)) {
                pline_msg = 'whines.';
            } else if (mtmp.mtame && hungrytime > moves + 1000) {
                pline_msg = 'yips.';
            } else if (ptr?.name !== 'PM_DINGO') {
                pline_msg = 'barks.';
            }
        } else {
            pline_msg = 'growls.';
        }
    }
    // Other msound cases deferred

    if (pline_msg) {
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
        return ECMD_TIME;
    }
    return ECMD_OK;
}

/**
 * C ref: sounds.c dochat — getdir + empty/no-monster ECMD_OK;
 * adjacent monster → domonnoise. Shop price_quote / steed / wall-
 * hallucination / priest wake / meating deferred.
 */
async function dochat() {
    // is_silent(you) / Strangled / uswallow / Underwater deferred
    if (!(await getdir('Talk to whom? (in what direction)'))) {
        return ECMD_CANCEL;
    }

    const u = game.u || {};
    if (u.dz) {
        await pline(
            `They won't hear you ${u.dz < 0 ? 'up' : 'down'} there.`,
        );
        return ECMD_OK;
    }
    if ((u.dx | 0) === 0 && (u.dy | 0) === 0) {
        await pline('Talking to yourself is a bad habit for a dungeoneer.');
        return ECMD_OK;
    }

    const tx = (u.ux | 0) + (u.dx | 0);
    const ty = (u.uy | 0) + (u.dy | 0);
    if (!isok(tx, ty)) return ECMD_OK;

    const mtmp = mon_at(tx, ty);
    if (!mtmp || mtmp.mundetected) {
        // statue / wall talk deferred — empty floor → ECMD_OK
        return ECMD_OK;
    }
    // M_AP furniture/object deferred
    if (mtmp.m_ap_type === 1 || mtmp.m_ap_type === 2) return ECMD_OK;

    // helpless non-priest → notice pline; deferred body uses canspot
    if ((mtmp.mfrozen || mtmp.msleeping) && !mtmp.ispriest) {
        await pline(`${Monnam(mtmp)} seems not to notice you.`);
        return ECMD_OK;
    }

    // C: mtmp->mstrategy &= ~STRAT_WAITMASK (CLOSE|WAITFORU)
    if (mtmp.mstrategy != null) {
        mtmp.mstrategy &= ~(0x10000000 | 0x20000000);
    }

    if (mtmp.mtame && mtmp.meating) {
        await pline(`${Monnam(mtmp)} is eating noisily.`);
        return ECMD_OK;
    }

    return domonnoise(mtmp);
}

/** C ref: sounds.c dotalk — #chat entry. */
export async function dotalk() {
    return dochat();
}
