// sounds.js — Ambient sounds and #chat.
// C ref: sounds.c — dotalk / dochat / domonnoise (MS_BARK subset).

import { game } from './gstate.js';
import { pline } from './display.js';
import { getdir } from './lock.js';
import { mon_at } from './uhitm.js';
import { Monnam } from './do_name.js';
import { objects_at } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { rn2 } from './rng.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, isok, IS_WALL, SDOOR, SIZE,
} from './const.js';

const STATUE = objectNames.indexOf('STATUE');

/** C ref: sounds.c dochat Hallucination walltalk[]. */
const WALLTALK = [
    'gripes about its job.',
    'tells you a funny joke!',
    'insults your heritage!',
    'chuckles.',
    'guffaws merrily!',
    'deprecates your exploration efforts.',
    'suggests a stint of rehab...',
    "doesn't seem to be interested.",
];

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
 * C ref: sounds.c dochat — getdir; statue; wall/SDOOR talk;
 * adjacent monster → domonnoise.
 * Named omissions: is_silent/Strangled/uswallow/Underwater;
 * shop price_quote; usteed; priest wake; Deaf response; Hallu
 * statue rndmonnam.
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
        // C: vobj_at STATUE → "The statue seems not to notice you."
        const otmp = objects_at(tx, ty);
        if (otmp && (otmp.otyp | 0) === STATUE) {
            if (!u.Blind && !u.ublind) {
                await pline('The statue seems not to notice you.');
            }
            return ECMD_OK;
        }
        // C: !Deaf && (IS_WALL || SDOOR) — secret door stays wall-like
        const typ = game.level?.locations?.[tx]?.[ty]?.typ | 0;
        if (!u.Deaf && (IS_WALL(typ) || typ === SDOOR)) {
            const blind = !!(u.Blind || u.ublind);
            const seenTyp = game.lastseentyp?.[tx]?.[ty] | 0;
            if (blind && !IS_WALL(seenTyp)) {
                // Blind + unmapped wall: silent
            } else if (!u.Hallucination) {
                await pline("It's like talking to a wall.");
            } else {
                // C: rn2(10); clamp to last walltalk[] entry
                let idx = rn2(10);
                if (idx >= SIZE(WALLTALK)) idx = SIZE(WALLTALK) - 1;
                await pline(`The wall ${WALLTALK[idx]}`);
            }
            return ECMD_OK;
        }
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
