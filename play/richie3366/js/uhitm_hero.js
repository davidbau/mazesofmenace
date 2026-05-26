// uhitm_hero.js — Hero melee bump subset (uhitm.c do_attack / hitum / xkilled tail).
// C ref: uhitm.c do_attack(), hitum(), known_hitum(), hmon(); mon.c xkilled(), corpse_chance()

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { pline } from './display.js';
import {
    A_STR, A_DEX, XKILL_GIVEMSG,
    P_NONE, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT, P_ISRESTRICTED,
    P_TWO_WEAPON_COMBAT, P_LAST_WEAPON,
} from './const.js';
import { weaponType } from './weapon_kind.js';
import { exercise, acurr } from './attrib.js';
import { nearCapacity } from './encumbr.js';
import { useSkill } from './u_init_skills.js';
import { P_BARE_HANDED_COMBAT } from './const.js';
import { monsterLeavesCorpse, verysmall } from './mondata.js';
import { placeCorpseForMonster } from './mkobj_corpse.js';
import { adisturb } from './shop.js';
import { isok } from './const.js';
import { overexertion, overexertHpIfEncumberedPlines } from './eat_hunger.js';
import { collectNewuhsPlines } from './hunger.js';
import { dmgval } from './mthrowu.js';
import { findDistantMklevMonLikeC } from './mfndpos_mon.js';
import { clearSearchMovemonHarnessLikeC } from './monmove_search.js';

/** @param {{ monnam?: string, data?: { mname?: string } }} mtmp */
function monsterName(mtmp) {
    if (mtmp?.monnam) return mtmp.monnam;
    const n = mtmp?.data?.mname;
    return n || 'monster';
}

/**
 * C: trap.c find_mac(mtmp) — mtmp.mac or permonst.ac.
 * @param {Record<string, unknown>} mtmp
 */
function findMacMonLikeC(mtmp) {
    return (mtmp.mac ?? mtmp.data?.ac ?? 10) | 0;
}

/**
 * C: uhitm.c find_roll_to_hit — melee bare-handed / uwep subset for bump attacks.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/** C: weapon.c dbon(void) — strength damage bonus (no poly). */
function dbonLikeC() {
    const str = acurr(A_STR);
    if (str < 6) return -1;
    if (str < 16) return 0;
    if (str < 18) return 1;
    if (str === 18) return 2;
    if (str <= 18) return 3; /* STR18(75) stub band */
    return 4;
}

/** @param {import('./gstate.js').game['u']} u @param {number} type */
function pSkillLikeC(u, type) {
    const ws = u?.weapon_skills;
    if (!ws || type === P_NONE) return P_UNSKILLED;
    const row = ws[type | 0];
    return (row?.skill ?? P_UNSKILLED) | 0;
}

/**
 * C: weapon.c weapon_dam_bonus — bare hands (**`weapon == null`**) → 0.
 * @param {Record<string, unknown>|null|undefined} weapon
 */
function weaponDamBonusLikeC(weapon) {
    if (!weapon) return 0;
    const u = game.u;
    if (!u) return 0;
    let type = weaponType(weapon);
    if ((u.twoweap | 0) && (weapon === u.uwep || weapon === u.uswapwep)) {
        type = P_TWO_WEAPON_COMBAT;
    }
    if (type === P_NONE || type > P_LAST_WEAPON) return 0;
    switch (pSkillLikeC(u, type)) {
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            return -2;
        case P_BASIC:
            return 0;
        case P_SKILLED:
            return 1;
        case P_EXPERT:
            return 2;
        default:
            return -2;
    }
}

/**
 * C: uhitm.c hmon_hitmon_dmg_recalc — apply **`udaminc`**, **`dbon`**, **`weapon_dam_bonus`**; min 1.
 * @param {number} baseDmg
 * @param {Record<string, unknown>|null|undefined} weapon
 */
function hmonHitmonDmgRecalcLikeC(baseDmg, weapon) {
    const u = game.u;
    let dmg = baseDmg | 0;
    let dmgbonus = u?.udaminc | 0;
    dmgbonus += dbonLikeC();
    dmgbonus += weaponDamBonusLikeC(weapon);
    dmg += dmgbonus;
    return dmg < 1 ? 1 : dmg;
}

function findRollToHitMeleeLikeC(g, mtmp) {
    const u = g.u;
    let tmp = 1 + (u?.uhitinc | 0) + findMacMonLikeC(mtmp);
    const luck = (u?.uluck ?? 0) | 0;
    tmp += Math.sign(luck) * ((Math.abs(luck) + 2) / 3) | 0;
    tmp += (u?.ulevel ?? 1) | 0;

    if (mtmp.mstun | 0) tmp += 2;
    if (mtmp.mflee | 0) tmp += 2;
    if (mtmp.msleeping | 0) tmp += 2;
    if (!(mtmp.mcanmove | 0)) tmp += 4;

    const cap = nearCapacity(g);
    if (cap) tmp -= cap * 2 - 1;

    return tmp | 0;
}

/**
 * C: mon.c corpse_chance — fungus-sized monsters use tmp=2..4 style roll.
 * @param {Record<string, unknown>} mtmp
 */
/** C: monflag.h `G_FREQ` mask (mon.c corpse_chance). */
const G_FREQ = 0x0007;

/** C: mon.c corpse_chance — tmp = 2 + rare geno + verysmall; !rn2(tmp). */
function corpseChanceLikeC(mtmp) {
    const mdat = mtmp.data;
    if (!mdat) return false;
    const geno = mdat.geno | 0;
    let tmp = 2 + ((geno & G_FREQ) < 2 ? 1 : 0) + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

/**
 * C: mon.c xkilled — treasure **`rn2(6)`** + **`corpse_chance`** **`rn2(tmp)`** on accessible tile.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} xkillFlags
 */
async function xkilledHeroBumpLikeC(g, mtmp, xkillFlags) {
    const nomsg = (xkillFlags & 1) !== 0;
    const nocorpse = (xkillFlags & 2) !== 0;

    mtmp.mhp = 0;
    if (!nomsg) {
        const who = monsterName(mtmp);
        await pline(`You kill ${who}.`);
    }

    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;

    /* C: xkilled accessible — `!rn2(6)` extra item (wizard bump omits most drops). */
    if (!nocorpse && isok(x, y)) rn2(6);

    if (!nocorpse && corpseChanceLikeC(mtmp) && monsterLeavesCorpse(mtmp, g, 0)) {
        placeCorpseForMonster(mtmp, x, y);
    }

    const arr = g.level?.monsters;
    if (arr) {
        const i = arr.indexOf(mtmp);
        if (i >= 0) arr.splice(i, 1);
    }
}

/**
 * C: do_attack → exercise(A_STR) → hitum → hmon bare hands → xkilled.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export async function bumpMeleeAttackLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;

    /* C: uhitm.c do_attack → hack.c overexertion() → gethungry() before exercise/hitum. */
    const { plines: oxPlines, multiNegative } = overexertion();
    for (const line of oxPlines) await pline(line);
    for (const line of collectNewuhsPlines(true)) await pline(line);
    if (multiNegative) return;

    exercise(A_STR, true);

    const tmp = findRollToHitMeleeLikeC(g, mtmp);
    const dieroll = rnd(20);
    const mhit = tmp > dieroll;
    if (mhit) exercise(A_DEX, true);

    const who = monsterName(mtmp);
    if (!mhit) {
        await pline(`You miss ${who}.`);
        return;
    }

    await pline(`You hit ${who}.`);

    const uwep = g.u?.uwep ?? null;
    /* C: hmon_hitmon_do_hit — bare hands rnd(2) or wielded weapon **`dmgval`**. */
    const baseDmg = uwep ? dmgval(uwep, mtmp) : rnd(2);
    const dmg = hmonHitmonDmgRecalcLikeC(baseDmg, uwep);
    mtmp.mhp = (mtmp.mhp | 0) - dmg;
    useSkill(g.u, P_BARE_HANDED_COMBAT, 1);
    await adisturb(mtmp);

    if ((mtmp.mhp | 0) <= 0) {
        const ctx = g.context || (g.context = {});
        delete ctx._postBumpInlineDoneLikeC;
        /* C: melee kill is not `#search` — drop stale peel pass id before post-`movemon`. */
        clearSearchMovemonHarnessLikeC(g);
        ctx._postBumpKillDochugGateLikeC = true;
        const distant = findDistantMklevMonLikeC(g);
        if (distant) ctx._postBumpDistantMtmpLikeC = distant;
        /* C: domove_attackmon_at → do_attack — bump kill does not walk onto bhitpos. */
        await xkilledHeroBumpLikeC(g, mtmp, XKILL_GIVEMSG);
    }

    for (const line of overexertHpIfEncumberedPlines()) await pline(line);
}
