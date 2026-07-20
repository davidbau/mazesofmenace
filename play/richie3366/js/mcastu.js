// mcastu.js — Monster spellcasting (partial).
// C ref: mcastu.c choose_monster_spell / castmu / is_undirected_spell /
//         spell_would_be_useless.

import { game } from './gstate.js';
import { rn2, d } from './rng.js';
import { couldsee } from './vision.js';
import {
    M_ATTK_MISS, M_ATTK_HIT, MFAST,
    MCF_INDIRECT, MCF_SIGHT, MCF_HOSTILE,
} from './const.js';
import { mon_adjust_speed } from './muse.js';

// C ref: mcastu.h MONSPELL — unified spell ids
export const MCAST_PSI_BOLT = 0;
export const MCAST_OPEN_WOUNDS = 1;
export const MCAST_CURE_SELF = 2;
export const MCAST_HASTE_SELF = 3;
export const MCAST_CONFUSE_YOU = 4;
export const MCAST_STUN_YOU = 5;
export const MCAST_DISAPPEAR = 6;
export const MCAST_PARALYZE = 7;
export const MCAST_BLIND_YOU = 8;
export const MCAST_WEAKEN_YOU = 9;
export const MCAST_DESTRY_ARMR = 10;
export const MCAST_INSECTS = 11;
export const MCAST_CURSE_ITEMS = 12;
export const MCAST_LIGHTNING = 13;
export const MCAST_FIRE_PILLAR = 14;
export const MCAST_GEYSER = 15;
export const MCAST_AGGRAVATION = 16;
export const MCAST_SUMMON_MONS = 17;
export const MCAST_CLONE_WIZ = 18;
export const MCAST_DEATH_TOUCH = 19;

// C ref: mcastu.c mcast_data[] from mcastu.h
const mcast_data = [
    { level: 0, flags: MCF_HOSTILE | MCF_SIGHT }, // PSI_BOLT
    { level: 0, flags: MCF_HOSTILE | MCF_SIGHT }, // OPEN_WOUNDS
    { level: 1, flags: MCF_INDIRECT }, // CURE_SELF
    { level: 2, flags: MCF_INDIRECT }, // HASTE_SELF
    { level: 2, flags: MCF_HOSTILE | MCF_SIGHT }, // CONFUSE_YOU
    { level: 3, flags: MCF_HOSTILE | MCF_SIGHT }, // STUN_YOU
    { level: 4, flags: MCF_INDIRECT }, // DISAPPEAR
    { level: 4, flags: MCF_HOSTILE | MCF_SIGHT }, // PARALYZE
    { level: 6, flags: MCF_HOSTILE | MCF_SIGHT }, // BLIND_YOU
    { level: 6, flags: MCF_HOSTILE | MCF_SIGHT }, // WEAKEN_YOU
    { level: 8, flags: MCF_HOSTILE | MCF_SIGHT }, // DESTRY_ARMR
    { level: 8, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, // INSECTS
    { level: 10, flags: MCF_HOSTILE | MCF_SIGHT }, // CURSE_ITEMS
    { level: 11, flags: MCF_HOSTILE | MCF_SIGHT }, // LIGHTNING
    { level: 12, flags: MCF_HOSTILE | MCF_SIGHT }, // FIRE_PILLAR
    { level: 13, flags: MCF_HOSTILE | MCF_SIGHT }, // GEYSER
    { level: 13, flags: MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT }, // AGGRAVATION
    { level: 15, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, // SUMMON_MONS
    { level: 18, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, // CLONE_WIZ
    { level: 20, flags: MCF_HOSTILE | MCF_SIGHT }, // DEATH_TOUCH
];

// C ref: mcastu.c mon_cleric_spells / mon_wizard_spells
const mon_cleric_spells = [
    MCAST_OPEN_WOUNDS, MCAST_CURE_SELF, MCAST_CONFUSE_YOU, MCAST_PARALYZE,
    MCAST_BLIND_YOU, MCAST_INSECTS, MCAST_CURSE_ITEMS, MCAST_LIGHTNING,
    MCAST_FIRE_PILLAR, MCAST_GEYSER,
];
const mon_wizard_spells = [
    MCAST_PSI_BOLT, MCAST_CURE_SELF, MCAST_HASTE_SELF, MCAST_STUN_YOU,
    MCAST_DISAPPEAR, MCAST_WEAKEN_YOU, MCAST_DESTRY_ARMR, MCAST_CURSE_ITEMS,
    MCAST_AGGRAVATION, MCAST_SUMMON_MONS, MCAST_CLONE_WIZ, MCAST_DEATH_TOUCH,
];

// C ref: monattk.h
const AD_SPEL = 241;
const AD_CLRC = 240;

/** C ref: mcastu.c is_undirected_spell */
function is_undirected_spell(spellnum) {
    return ((mcast_data[spellnum]?.flags | 0) & MCF_INDIRECT) !== 0;
}

/**
 * C ref: mcastu.c spell_would_be_useless — RNG arms for DEATH_TOUCH /
 * GEYSER / AGGRAVATION preserved. has_aggravatables deferred → treat as
 * none (AGGRAVATION almost always useless via rn2(100)).
 */
function spell_would_be_useless(mtmp, spellnum) {
    const flags = mcast_data[spellnum]?.flags | 0;
    if ((flags & MCF_HOSTILE) !== 0 && mtmp.mpeaceful) return true;
    if ((flags & MCF_SIGHT) !== 0 && !couldsee(mtmp.mx, mtmp.my)) return true;

    const u = game.u || {};
    switch (spellnum) {
    case MCAST_DEATH_TOUCH: {
        const Antimagic = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
        const Hallucination = !!(u.Hallucination
            || ((u.HHallucination | 0) && !(u.Halluc_resistance | 0)));
        if ((Antimagic || Hallucination) && !rn2(2)) return true;
        break;
    }
    case MCAST_GEYSER:
        if (!rn2(5)) return true;
        break;
    case MCAST_CLONE_WIZ:
        if (!mtmp.iswiz || ((game.context?.no_of_wizards | 0) > 1)) return true;
        break;
    case MCAST_AGGRAVATION:
        // has_aggravatables deferred → always the "nothing to wake" arm
        return rn2(100) ? true : false;
    case MCAST_HASTE_SELF:
        if ((mtmp.permspeed | 0) === MFAST) return true;
        break;
    case MCAST_DISAPPEAR: {
        if (mtmp.minvis || mtmp.invis_blkd) return true;
        const See_invisible = !!((u.HSee_invisible | 0)
            || (u.ESee_invisible | 0) || u.See_invisible);
        if (mtmp.mpeaceful && !See_invisible) return true;
        break;
    }
    case MCAST_CURE_SELF:
        if ((mtmp.mhp | 0) === (mtmp.mhpmax | 0)) return true;
        break;
    case MCAST_BLIND_YOU: {
        const Blinded = !!((u.HBlinded | 0) || (u.EBlinded | 0)
            || u.uroleplay?.blind);
        if (Blinded) return true;
        break;
    }
    default:
        break;
    }
    return false;
}

/**
 * C ref: mcastu.c choose_monster_spell — rn2(m_lev) then optional
 * rn2(maxlev)/rn2(maxlev) clamp; highest non-useless ≤ spellval.
 */
function choose_monster_spell(mtmp, adtyp) {
    let list = null;
    if (adtyp === AD_SPEL) list = mon_wizard_spells;
    else if (adtyp === AD_CLRC) list = mon_cleric_spells;
    if (!list || list.length < 1) return MCAST_PSI_BOLT;

    const maxlev = mcast_data[list[list.length - 1]].level;
    let spellval = rn2(mtmp.m_lev | 0);
    if (spellval > maxlev && rn2(maxlev)) spellval = rn2(maxlev);

    for (let i = list.length - 1; i >= 0; i--) {
        const sp = list[i];
        if (mcast_data[sp].level <= spellval
            && !spell_would_be_useless(mtmp, sp)) {
            return sp;
        }
    }
    return list[0];
}

/**
 * C ref: mcastu.c castmu — spell selection + undirected early-out for
 * dochug non-attack cast. Burns mspec_used + fumble rn2; applies
 * HASTE_SELF / CURE_SELF (D-0796). Other mcast_spell bodies deferred.
 *
 * @param {object} mtmp
 * @param {{ adtyp: number }} mattk
 * @param {boolean} thinks_it_foundyou
 * @param {boolean} foundyou
 */
export function castmu(mtmp, mattk, thinks_it_foundyou, foundyou) {
    const ml = mtmp.m_lev | 0;
    let spellnum = 0;
    const adtyp = mattk?.adtyp | 0;

    if ((adtyp === AD_SPEL || adtyp === AD_CLRC) && ml) {
        let cnt = 40;
        do {
            spellnum = choose_monster_spell(mtmp, adtyp);
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum)) {
                    return M_ATTK_MISS;
                }
                break;
            }
        } while (--cnt > 0 && spell_would_be_useless(mtmp, spellnum));
        if (cnt === 0) return M_ATTK_MISS;
    }

    // Unable to cast — cursetxt deferred (may burn rn2(4) when !canseemon)
    if (mtmp.mcan || mtmp.mspec_used || !ml) {
        return M_ATTK_MISS;
    }
    // m_seenres(cvt_adtyp…) — AD_SPEL/CLRC map to M_SEEN_NOTHING in C

    if (adtyp === AD_SPEL || adtyp === AD_CLRC) {
        mtmp.mspec_used = (ml < 8) ? (10 - ml) : 2;
    }

    if (!foundyou && thinks_it_foundyou && !is_undirected_spell(spellnum)) {
        return M_ATTK_MISS;
    }

    // Fumble — must burn rn2(ml*10) when continuing to cast
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) {
        return M_ATTK_MISS;
    }

    // C ref: mcastu.c mcast_spell — undirected bodies used by peaceful
    // quest guardians (dochug cast-before-move). Directed attack spells
    // and remaining undirected (DISAPPEAR / INSECTS / AGGRAVATION / …)
    // still deferred.
    if (adtyp === AD_SPEL || adtyp === AD_CLRC) {
        switch (spellnum) {
        case MCAST_HASTE_SELF:
            // C: mon_adjust_speed(mtmp, 1, NULL) — permspeed/mspeed MFAST
            mon_adjust_speed(mtmp, 1, null);
            break;
        case MCAST_CURE_SELF:
            // C: m_cure_self — healmon(mtmp, d(3,6), 0) when wounded
            if ((mtmp.mhp | 0) < (mtmp.mhpmax | 0)) {
                mtmp.mhp = Math.min(
                    (mtmp.mhpmax | 0),
                    (mtmp.mhp | 0) + d(3, 6),
                );
            }
            break;
        default:
            // Named omission: other mcast_spell cases
            break;
        }
    }

    return M_ATTK_HIT;
}

export { AD_SPEL, AD_CLRC, is_undirected_spell, choose_monster_spell };
