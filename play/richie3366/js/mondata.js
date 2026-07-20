// mondata.js — Monster name lookup + growth (partial).
// C ref: mondata.c name_to_mon / name_to_monplus / little_to_big / big_to_little
// + monstseesu / monstunseesu (seen_resistance) + resist_conflict.

import { game } from './gstate.js';
import { couldsee } from './vision.js';
import { rnd } from './rng.js';
import { acurr, A_CHA } from './attrib.js';
import { objectNames } from './objects.js';
import {
    monsterNames, pmnames, NON_PM, LOW_PM,
    MALE, FEMALE, NEUTRAL, NUM_MGENDERS,
    M1_SEE_INVIS,
} from './monsters.js';
import { M_SEEN_NOTHING, CONFLICT } from './const.js';

const RIN_CONFLICT = objectNames.indexOf('RIN_CONFLICT');

/**
 * C ref: mondata.c set_mon_data — assign data/mnum; when new form is
 * slower, prorate unused movement so leftover from a faster form cannot
 * grant extra moves (hero uses u.umovement; monsters use mon.movement).
 * @param {object} mon
 * @param {object|null|undefined} ptr
 */
export function set_mon_data(mon, ptr) {
    if (!mon) return;
    const old_speed = mon.data?.mmove | 0;
    const isYou = mon === game.youmonst;
    const cur = isYou
        ? ((game.u?.umovement | 0))
        : ((mon.movement | 0));

    mon.data = ptr;
    mon.mnum = ptr?.mndx ?? ptr?.pm ?? NON_PM;

    if (cur) {
        const new_speed = ptr?.mmove | 0;
        // C: if new form slower, movement *= new/old (trunc toward 0)
        if (new_speed < old_speed && old_speed > 0) {
            const next = Math.trunc((cur * new_speed) / old_speed);
            if (isYou) {
                if (!game.u) game.u = {};
                game.u.umovement = next;
            } else {
                mon.movement = next;
            }
        }
    }
}

/**
 * C ref: youprop.h Conflict — HConflict || EConflict.
 * setworn oc_oprop deferred: worn RIN_CONFLICT confers extrinsic.
 */
export function hero_conflict() {
    const u = game.u || {};
    if (u.HConflict || u.EConflict || game.Conflict || game.flags?.Conflict) {
        return true;
    }
    const prop = u.uprops?.[CONFLICT];
    if (prop?.intrinsic || prop?.extrinsic) return true;
    if ((u.uleft && u.uleft.otyp === RIN_CONFLICT)
        || (u.uright && u.uright.otyp === RIN_CONFLICT)) {
        return true;
    }
    return false;
}

/**
 * C ref: mondata.c resist_conflict — always rolls rnd(20).
 * High CHA / low m_lev → harder for mon to resist (fight for hero).
 */
export function resist_conflict(mtmp) {
    const resist_chance = Math.min(
        19,
        (acurr(A_CHA) - (mtmp.m_lev | 0) + (game.u?.ulevel | 0)),
    );
    return rnd(20) > resist_chance;
}

function pm(name) {
    return monsterNames.indexOf(`PM_${name}`);
}

// C ref: mondata.c grownups[][2] — one growth step (baby→adult, etc.)
const GROWNUPS = [
    ['CHICKATRICE', 'COCKATRICE'],
    ['LITTLE_DOG', 'DOG'],
    ['DOG', 'LARGE_DOG'],
    ['HELL_HOUND_PUP', 'HELL_HOUND'],
    ['WINTER_WOLF_CUB', 'WINTER_WOLF'],
    ['KITTEN', 'HOUSECAT'],
    ['HOUSECAT', 'LARGE_CAT'],
    ['PONY', 'HORSE'],
    ['HORSE', 'WARHORSE'],
    ['KOBOLD', 'LARGE_KOBOLD'],
    ['LARGE_KOBOLD', 'KOBOLD_LEADER'],
    ['GNOME', 'GNOME_LEADER'],
    ['GNOME_LEADER', 'GNOME_RULER'],
    ['DWARF', 'DWARF_LEADER'],
    ['DWARF_LEADER', 'DWARF_RULER'],
    ['MIND_FLAYER', 'MASTER_MIND_FLAYER'],
    ['ORC', 'ORC_CAPTAIN'],
    ['HILL_ORC', 'ORC_CAPTAIN'],
    ['MORDOR_ORC', 'ORC_CAPTAIN'],
    ['URUK_HAI', 'ORC_CAPTAIN'],
    ['SEWER_RAT', 'GIANT_RAT'],
    ['CAVE_SPIDER', 'GIANT_SPIDER'],
    ['OGRE', 'OGRE_LEADER'],
    ['OGRE_LEADER', 'OGRE_TYRANT'],
    ['ELF', 'ELF_NOBLE'],
    ['WOODLAND_ELF', 'ELF_NOBLE'],
    ['GREEN_ELF', 'ELF_NOBLE'],
    ['GREY_ELF', 'ELF_NOBLE'],
    ['ELF_NOBLE', 'ELVEN_MONARCH'],
    ['LICH', 'DEMILICH'],
    ['DEMILICH', 'MASTER_LICH'],
    ['MASTER_LICH', 'ARCH_LICH'],
    ['VAMPIRE', 'VAMPIRE_LEADER'],
    ['BAT', 'GIANT_BAT'],
    ['BABY_GRAY_DRAGON', 'GRAY_DRAGON'],
    ['BABY_GOLD_DRAGON', 'GOLD_DRAGON'],
    ['BABY_SILVER_DRAGON', 'SILVER_DRAGON'],
    ['BABY_RED_DRAGON', 'RED_DRAGON'],
    ['BABY_WHITE_DRAGON', 'WHITE_DRAGON'],
    ['BABY_ORANGE_DRAGON', 'ORANGE_DRAGON'],
    ['BABY_BLACK_DRAGON', 'BLACK_DRAGON'],
    ['BABY_BLUE_DRAGON', 'BLUE_DRAGON'],
    ['BABY_GREEN_DRAGON', 'GREEN_DRAGON'],
    ['BABY_YELLOW_DRAGON', 'YELLOW_DRAGON'],
    ['RED_NAGA_HATCHLING', 'RED_NAGA'],
    ['BLACK_NAGA_HATCHLING', 'BLACK_NAGA'],
    ['GOLDEN_NAGA_HATCHLING', 'GOLDEN_NAGA'],
    ['GUARDIAN_NAGA_HATCHLING', 'GUARDIAN_NAGA'],
    ['SMALL_MIMIC', 'LARGE_MIMIC'],
    ['LARGE_MIMIC', 'GIANT_MIMIC'],
    ['BABY_LONG_WORM', 'LONG_WORM'],
    ['BABY_PURPLE_WORM', 'PURPLE_WORM'],
    ['BABY_CROCODILE', 'CROCODILE'],
    ['SOLDIER', 'SERGEANT'],
    ['SERGEANT', 'LIEUTENANT'],
    ['LIEUTENANT', 'CAPTAIN'],
    ['WATCHMAN', 'WATCH_CAPTAIN'],
    ['ALIGNED_CLERIC', 'HIGH_CLERIC'],
    ['STUDENT', 'ARCHEOLOGIST'],
    ['ATTENDANT', 'HEALER'],
    ['PAGE', 'KNIGHT'],
    ['ACOLYTE', 'CLERIC'],
    ['APPRENTICE', 'WIZARD'],
    ['MANES', 'LEMURE'],
    ['KEYSTONE_KOP', 'KOP_SERGEANT'],
    ['KOP_SERGEANT', 'KOP_LIEUTENANT'],
    ['KOP_LIEUTENANT', 'KOP_KAPTAIN'],
].map(([a, b]) => [pm(a), pm(b)]);

/** C ref: mondata.c little_to_big */
export function little_to_big(montype) {
    for (const [lo, hi] of GROWNUPS) {
        if (lo >= LOW_PM && montype === lo) return hi;
    }
    return montype;
}

/** C ref: mondata.c big_to_little */
export function big_to_little(montype) {
    for (const [lo, hi] of GROWNUPS) {
        if (lo >= LOW_PM && montype === hi) return lo;
    }
    return montype;
}

const ALT_NAMES = [
    // C ref: mondata.c name_to_monplus alt_spl — grey↔gray dragons (+ genderhint)
    { name: 'grey dragon', mndx: () => monsterNames.indexOf('PM_GRAY_DRAGON'), gender: NEUTRAL },
    { name: 'baby grey dragon', mndx: () => monsterNames.indexOf('PM_BABY_GRAY_DRAGON'), gender: NEUTRAL },
];

/**
 * C ref: mondata.c name_to_monplus — longest match on pmnames[MALE..NEUTRAL].
 * remainder_p: { rest: string } optional out for unmatched suffix.
 * gender_name_var: { gender: number } optional in/out (C int*); init to
 *   NEUTRAL or -1. Matching a MALE/FEMALE pmname updates it; a NEUTRAL
 *   match only updates when incoming gender is -1.
 */
export function name_to_monplus(in_str, remainder_p = null, gender_name_var = null) {
    if (remainder_p) remainder_p.rest = null;
    if (!in_str) return NON_PM;

    let str = in_str;
    if (str.toLowerCase().startsWith('a ')) str = str.slice(2);
    else if (str.toLowerCase().startsWith('an ')) str = str.slice(3);
    else if (str.toLowerCase().startsWith('the ')) str = str.slice(4);

    const lower = str.toLowerCase();
    const slen = str.length;
    let best = NON_PM;
    let bestLen = 0;
    let bestRest = null;
    let matchgend = -1;
    let exactMatch = false;

    const tryMatch = (cand, mndx, gend) => {
        if (mndx < LOW_PM && mndx !== 0) return;
        if (mndx < 0 || !cand) return;
        const cl = cand.toLowerCase();
        const mLen = cand.length;
        if (mLen <= bestLen) return;
        if (!lower.startsWith(cl)) return;
        const after = str.slice(mLen);
        // C: exact, or space / plural / possessive boundary
        if (after.length === 0) {
            bestLen = mLen;
            best = mndx;
            bestRest = after;
            matchgend = gend;
            exactMatch = true;
            return;
        }
        const al = after.toLowerCase();
        if (after[0] === ' '
            || al === 's' || al.startsWith('s ')
            || al === "'" || al.startsWith("' ")
            || al === "'s" || al.startsWith("'s ")
            || al === 'es' || al.startsWith('es ')) {
            bestLen = mLen;
            best = mndx;
            bestRest = after;
            matchgend = gend;
        }
    };

    // C alt_spl table first (returns immediately on hit)
    for (const alt of ALT_NAMES) {
        const mndx = alt.mndx();
        const cand = alt.name;
        const cl = cand.toLowerCase();
        if (!lower.startsWith(cl)) continue;
        const after = str.slice(cand.length);
        if (after.length === 0 || after[0] === ' ' || after[0] === "'") {
            if (remainder_p) remainder_p.rest = after;
            if (gender_name_var) gender_name_var.gender = alt.gender;
            return mndx;
        }
    }

    for (let i = 0; i < monsterNames.length; i++) {
        const names = pmnames[i];
        if (!names) continue;
        for (let mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
            tryMatch(names[mgend], i, mgend);
            if (exactMatch) break;
        }
        if (exactMatch) break;
    }

    if (best >= LOW_PM || best === 0) {
        if (remainder_p) remainder_p.rest = bestRest ?? '';
        if (gender_name_var && matchgend !== -1) {
            // C: don't override with neuter if caller already has male/female
            if (gender_name_var.gender === -1 || matchgend !== NEUTRAL) {
                gender_name_var.gender = matchgend;
            }
        }
        return best;
    }
    return NON_PM;
}

/** C ref: mondata.c name_to_mon */
export function name_to_mon(in_str, gender_name_var = null) {
    return name_to_monplus(in_str, null, gender_name_var);
}

/** C ref: monst.h m_seenres */
export function m_seenres(mon, mask) {
    return ((mon?.seen_resistance | 0) & (mask | 0)) !== 0;
}

/** C ref: monst.h m_setseenres */
export function m_setseenres(mon, mask) {
    if (!mon) return;
    mon.seen_resistance = (mon.seen_resistance | 0) | (mask | 0);
}

/** C ref: monst.h m_clearseenres */
export function m_clearseenres(mon, mask) {
    if (!mon) return;
    mon.seen_resistance = (mon.seen_resistance | 0) & ~(mask | 0);
}

/** C ref: vision.h m_canseeu — buried arms deferred. */
export function m_canseeu(m) {
    const u = game.u || {};
    const Invis = !!(u.Hinvis || u.Einvis || u.Invis);
    const perceives = ((m?.data?.mflags1 | 0) & M1_SEE_INVIS) !== 0;
    if (Invis && !perceives) return false;
    if (u.Underwater) return false;
    return couldsee(m.mx, m.my);
}

/**
 * C ref: mondata.c monstseesu — monsters that can see the hero remember
 * resistance mask (M_SEEN_*).
 */
export function monstseesu(seenres) {
    if ((seenres | 0) === M_SEEN_NOTHING || game.u?.uswallow) return;
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) < 1) continue;
        if (m_canseeu(mtmp)) m_setseenres(mtmp, seenres);
    }
}

/**
 * C ref: mondata.c monstunseesu — LOS monsters forget resistance mask.
 */
export function monstunseesu(seenres) {
    if ((seenres | 0) === M_SEEN_NOTHING || game.u?.uswallow) return;
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) < 1) continue;
        if (m_canseeu(mtmp)) m_clearseenres(mtmp, seenres);
    }
}

export { MALE, FEMALE, NEUTRAL, NUM_MGENDERS };
