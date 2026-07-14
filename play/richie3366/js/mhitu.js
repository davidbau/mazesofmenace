// mhitu.js — Monster attacks hero (partial).
// C ref: mhitu.c mattacku / hitmu / hitmsg / missmu / mdamageu;
//         uhitm.c mhitm_ad_phys (mhitu bare / weapon subset).

import { game } from './gstate.js';
import { monnear } from './mon.js';
import {
    Is_rogue_level, NEED_WEAPON, NEED_HTH_WEAPON, NATTK,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE,
    M_ATTK_DEF_DIED,
    Upolyd, DIED,
} from './const.js';
import { thrwmu } from './mthrowu.js';
import { find_offensive, use_offensive } from './muse.js';
import { nomul } from './hack.js';
import { rnd, d, rn2 } from './rng.js';
import { pline } from './display.js';
import { Monnam } from './do_name.js';
import { MON_WEP, mon_wield_item, dmgval } from './weapon.js';
import {
    get_mattk, mhitm_knockback, mhitm_mgc_atk_negated, mattackm,
    AT_NONE, AT_CLAW, AT_KICK, AT_BITE, AT_STNG, AT_TUCH, AT_BUTT, AT_WEAP,
    AD_PHYS, AD_ELEC,
} from './mhitm.js';
import { is_orc } from './monsters.js';
import { done_in_by } from './end.js';

/** C ref: you.h m_next2u — squared dist to hero ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/**
 * C ref: hack.h AC_VALUE — positive AC as-is; negative rolls -rnd(-AC).
 */
function AC_VALUE(ac) {
    const a = ac | 0;
    if (a >= 0) return a;
    return -rnd(-a);
}

/**
 * C ref: mhitu.c calc_mattacku_vars — range2 = !monnear(mux,muy).
 */
function calc_mattacku_vars(mtmp) {
    const u = game.u || {};
    const mux = mtmp.mux ?? u.ux;
    const muy = mtmp.muy ?? u.uy;
    const ranged = dist2u(mtmp) > 3;
    const range2 = !monnear(mtmp, mux, muy);
    const foundyou = (u.ux === mux && u.uy === muy);
    return { ranged, range2, foundyou };
}

function dist2u(mtmp) {
    const u = game.u || {};
    const dx = mtmp.mx - u.ux;
    const dy = mtmp.my - u.uy;
    return dx * dx + dy * dy;
}

/**
 * C ref: mhitu.c hitmsg — aatyp verb; seduce / again deferred.
 */
async function hitmsg(mtmp, mattk) {
    let verb = 'hits';
    switch (mattk.aatyp) {
    case AT_BITE: verb = 'bites'; break;
    case AT_KICK: verb = 'kicks'; break;
    case AT_STNG: verb = 'stings'; break;
    case AT_BUTT: verb = 'butts'; break;
    case AT_TUCH: verb = 'touches you'; break;
    default: verb = 'hits'; break;
    }
    await pline(`${Monnam(mtmp)} ${verb}!`);
}

/**
 * C ref: mhitu.c missmu — verbose near-miss / seduce deferred.
 */
async function missmu(mtmp, _nearmiss, _mattk) {
    await pline(`${Monnam(mtmp)} misses!`);
}

/**
 * C ref: mhitu.c mdamageu — subtract HP; fatal → done_in_by (not losehp).
 * showdamage / rehumanize deferred.
 */
async function mdamageu(mtmp, n) {
    let dmg = n | 0;
    if (dmg < 0) dmg = 0;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    const u = game.u || (game.u = {});
    if (Upolyd(u)) {
        u.mh = (u.mh || 0) - dmg;
        if ((u.mh || 0) > (u.mhmax || 0)) u.mh = u.mhmax;
        if ((u.mh || 0) < 1) {
            // rehumanize deferred
            u.mh = 0;
            if (game.program_state) game.program_state.gameover = true;
        }
        return;
    }
    u.uhp = (u.uhp || 0) - dmg;
    if ((u.uhp || 0) > (u.uhpmax || 0)) u.uhp = u.uhpmax;
    if ((u.uhp || 0) < 1) {
        await done_in_by(mtmp, DIED);
    }
}/**
 * C ref: uhitm.c mhitm_ad_phys mhitu branch — bare hitmsg or weapon+dmgval.
 * Hugs / corpse / silver / poison / pudding clone deferred.
 */
async function mhitm_ad_phys_u(mtmp, mattk, mhm) {
    const otmp = MON_WEP(mtmp);
    if (mattk.aatyp === AT_WEAP && otmp) {
        mhm.damage += dmgval(otmp, null);
        if (mhm.damage <= 0) mhm.damage = 1;
        // artifact_hit deferred
        await hitmsg(mtmp, mattk);
        mhm.hitflags |= M_ATTK_HIT;
    } else if (mattk.aatyp !== AT_TUCH || mhm.damage !== 0) {
        await hitmsg(mtmp, mattk);
        mhm.hitflags |= M_ATTK_HIT;
    }
}

/**
 * C ref: uhitm.c mhitm_ad_elec mhitu branch (mdef == youmonst).
 * destroy_items body deferred when m_lev > rn2(20); gate always burns.
 * monstseesu / monstunseesu deferred.
 */
async function mhitm_ad_elec_u(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    await hitmsg(mtmp, mattk);
    if (!(await mhitm_mgc_atk_negated(mtmp, null, true))) {
        await pline('You get zapped!');
        const u = game.u || {};
        const Shock_resistance = !!(u.Shock_resistance || u.HShock_resistance
            || u.EShock_resistance);
        if (Shock_resistance) {
            await pline("The zap doesn't shock you!");
            mhm.damage = 0;
        }
        // C: if ((int) magr->m_lev > rn2(20)) destroy_items(...)
        if ((mtmp.m_lev | 0) > rn2(20)) {
            // destroy_items(&youmonst, AD_ELEC, orig_dmg) body deferred
            void orig_dmg;
        }
    } else {
        mhm.damage = 0;
    }
}

/**
 * C ref: uhitm.c mhitm_adtyping — mhitu (monster→you) subset.
 * PHYS + ELEC ported; other adtyps zero damage until peeled.
 */
async function mhitm_adtyping_u(mtmp, mattk, mhm) {
    switch (mattk.adtyp | 0) {
    case AD_PHYS:
        await mhitm_ad_phys_u(mtmp, mattk, mhm);
        break;
    case AD_ELEC:
        await mhitm_ad_elec_u(mtmp, mattk, mhm);
        break;
    default:
        mhm.damage = 0;
        break;
    }
}

/**
 * C ref: mhitu.c hitmu — base d() + adtyping + knockback + AC/Half + mdamageu.
 * Undead midnight extra, passiveum, permdmg, map_invisible deferred.
 */
async function hitmu(mtmp, mattk) {
    const mhm = {
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        done: false,
        damage: 0,
    };

    mhm.damage = d(mattk.damn | 0, mattk.damd | 0);
    // midnight undead extra d() deferred

    await mhitm_adtyping_u(mtmp, mattk, mhm);
    mhitm_knockback(mtmp, null, mattk, mhm.hitflags, MON_WEP(mtmp) != null);

    if (mhm.done) return mhm.hitflags;

    const u = game.u || {};
    if ((u.uhp | 0) < 1) {
        await mdamageu(mtmp, 1);
        mhm.damage = 0;
    }

    if (mhm.damage && (u.uac | 0) < 0) {
        mhm.damage -= rnd(-(u.uac | 0));
        if (mhm.damage < 1) mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        // Half_physical_damage / Mitre deferred (maybe_half_phys when wired)
        await mdamageu(mtmp, mhm.damage);
    }

    // passiveum deferred — human L1 has no passive
    return M_ATTK_HIT;
}

/**
 * C ref: mhitu.c mattacku — AT_WEAP ranged thrwmu + melee HTH / weapon hit.
 * Breath/spit/gulp/gaze/expl/hugs/magic/swallow/undetected deferred.
 * Returns 1 if monster died, else 0.
 */
export async function mattacku(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) < 1) return 1;

    let { ranged, range2, foundyou } = calc_mattacku_vars(mtmp);
    if (!ranged) nomul(0);
    if ((mtmp.mhp | 0) < 1) return 1;

    const u = game.u || {};

    // C: mhitu.c — while mounted, orcs (1/2) / others (1/4) may hit the steed
    // instead; steed never attacks the rider.
    if (u.usteed) {
        if (mtmp === u.usteed) return 0;
        if (!rn2(is_orc(mtmp.data) ? 2 : 4) && m_next2u(mtmp)) {
            let i = await mattackm(mtmp, u.usteed);
            if ((i & M_ATTK_AGR_DIED) !== 0) return 1;
            if ((i & M_ATTK_DEF_DIED) !== 0 || !u.usteed || !m_next2u(mtmp)) {
                return 0;
            }
            // Steed retaliation — bhitpos/notonhead omitted (no worm steed)
            i = await mattackm(u.usteed, mtmp);
            return (i & M_ATTK_DEF_DIED) !== 0 ? 1 : 0;
        }
    }

    // C: find_offensive / use_offensive before attack loop — potion throw
    // spends the turn (return 2) without melee/ranged AT_WEAP.
    if (find_offensive(mtmp)) {
        const offended = await use_offensive(mtmp);
        if (offended !== 0) return offended === 1 ? 1 : 0;
    }
    // AC_VALUE(u.uac) + 10 + m_lev (+ helpless / invis / trap deferred deltas)
    let tmp = AC_VALUE(u.uac ?? 10) + 10;
    tmp += mtmp.m_lev | 0;
    if ((game.multi | 0) < 0) tmp += 4;
    if (!mtmp.mcansee) tmp -= 2;
    if (mtmp.mtrapped) tmp -= 2;
    if (tmp <= 0) tmp = 1;

    const sum = new Array(NATTK).fill(M_ATTK_MISS);
    const firstfoundyou = foundyou;

    for (let i = 0; i < NATTK; i++) {
        sum[i] = M_ATTK_MISS;
        if ((mtmp.mhp | 0) < 1) return 1;
        if (i > 0) {
            ({ ranged, range2, foundyou } = calc_mattacku_vars(mtmp));
            if (firstfoundyou && !foundyou) continue;
        }

        const mattk = get_mattk(mtmp, i);
        if (mattk.aatyp === AT_NONE) continue;

        switch (mattk.aatyp) {
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
            if (!range2) {
                if (foundyou) {
                    const j = rnd(20 + i);
                    if (tmp > j) sum[i] = await hitmu(mtmp, mattk);
                    else await missmu(mtmp, tmp === j, mattk);
                }
                // wildmiss deferred
            }
            break;

        case AT_WEAP:
            if (range2) {
                if (!Is_rogue_level(u.uz)) await thrwmu(mtmp);
            } else {
                if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
                    mtmp.weapon_check = NEED_HTH_WEAPON;
                    // mon_wield_item HTH body still stub — returns 0
                    if (mon_wield_item(mtmp) !== 0) break;
                }
                if (foundyou) {
                    const mon_currwep = MON_WEP(mtmp);
                    let hittmp = 0;
                    if (mon_currwep) {
                        // hitval / mswings (incl. mixed-dir rn2) deferred
                        hittmp = mon_currwep.spe | 0;
                        tmp += hittmp;
                    }
                    const j = rnd(20 + i);
                    game._mhitu_dieroll = j;
                    if (tmp > j) sum[i] = await hitmu(mtmp, mattk);
                    else await missmu(mtmp, tmp === j, mattk);
                    if (mon_currwep) tmp -= hittmp;
                }
                // wildmiss deferred
            }
            break;

        default:
            break;
        }

        if (sum[i] & M_ATTK_AGR_DIED) return 1;
        if (sum[i] & M_ATTK_AGR_DONE) break;
        if (game.program_state?.gameover) return 1;
    }
    return (mtmp.mhp | 0) < 1 ? 1 : 0;
}
