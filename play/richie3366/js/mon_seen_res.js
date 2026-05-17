// mon_seen_res.js — Monsters notice hero resistances (mondata.c monstseesu / monstunseesu).
// C ref: mondata.c monstseesu(), monstunseesu(), vision.h m_canseeu().

import { game } from './gstate.js';
import { couldsee } from './vision.js';

/** C: monflag.h M1_SEE_INVIS */
const M1_SEE_INVIS = 0x01000000;

/**
 * C: vision.h m_canseeu(m) — !Underwater, invis vs perceives, couldsee(m->mx,m->my).
 * @param {object} mtmp
 */
export function mCanSeeHeroMonsterLikeC(mtmp) {
    const u = game.u;
    if (!u || !mtmp) return false;
    if ((u.underwater | 0) !== 0) return false;
    if ((u.uswallow | 0) !== 0) return false;
    const inv = !!((u.HInvis | 0) || (u.EInvis | 0) || (u.BInvis | 0));
    const perceives = ((mtmp.data?.mflags1 ?? 0) & M1_SEE_INVIS) !== 0;
    if (inv && !perceives) return false;
    return couldsee(mtmp.mx | 0, mtmp.my | 0);
}

/**
 * C: mondata.c monstseesu(seenres)
 * @param {number} seenres
 */
export function monstseesuLikeC(seenres) {
    const g = game;
    const u = g.u;
    if (!u) return;
    if ((seenres | 0) === 0) return;
    if ((u.uswallow | 0) !== 0) return;
    const mons = g.level?.monsters;
    if (!mons) return;
    for (const mtmp of mons) {
        if ((mtmp.mhp | 0) <= 0) continue;
        if (!mCanSeeHeroMonsterLikeC(mtmp)) continue;
        mtmp.mseenres = (mtmp.mseenres | 0) | (seenres | 0);
    }
}

/**
 * C: mondata.c monstunseesu(seenres)
 * @param {number} seenres
 */
export function monstunseesuLikeC(seenres) {
    const g = game;
    const u = g.u;
    if (!u) return;
    if ((seenres | 0) === 0) return;
    if ((u.uswallow | 0) !== 0) return;
    const mons = g.level?.monsters;
    if (!mons) return;
    const mask = ~(seenres | 0);
    for (const mtmp of mons) {
        if ((mtmp.mhp | 0) <= 0) continue;
        if (!mCanSeeHeroMonsterLikeC(mtmp)) continue;
        mtmp.mseenres = (mtmp.mseenres | 0) & mask;
    }
}
