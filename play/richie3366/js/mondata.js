// mondata.js — Monster name lookup + growth (partial).
// C ref: mondata.c name_to_mon / name_to_monplus / little_to_big / big_to_little

import { monsterNames, NON_PM, LOW_PM } from './monsters.js';

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

/** PM_SILVER_DRAGON → "silver dragon" */
function pm_to_name(pmName) {
    if (!pmName || !pmName.startsWith('PM_')) return '';
    return pmName.slice(3).toLowerCase().replace(/_/g, ' ');
}

const ALT_NAMES = [
    // C ref: mondata.c name_to_monplus alt_spl — grey↔gray dragons
    { name: 'grey dragon', mndx: () => monsterNames.indexOf('PM_GRAY_DRAGON') },
    { name: 'baby grey dragon', mndx: () => monsterNames.indexOf('PM_BABY_GRAY_DRAGON') },
];

/**
 * C ref: mondata.c name_to_monplus — longest prefix match; returns mndx.
 * remainder_p: { rest: string } optional out for unmatched suffix.
 */
export function name_to_monplus(in_str, remainder_p = null) {
    if (remainder_p) remainder_p.rest = null;
    if (!in_str) return NON_PM;

    let str = in_str;
    if (str.toLowerCase().startsWith('a ')) str = str.slice(2);
    else if (str.toLowerCase().startsWith('an ')) str = str.slice(3);
    else if (str.toLowerCase().startsWith('the ')) str = str.slice(4);

    const lower = str.toLowerCase();
    let best = NON_PM;
    let bestLen = 0;
    let bestRest = null;

    const tryMatch = (cand, mndx) => {
        if (mndx < LOW_PM && mndx !== 0) return;
        if (mndx < 0) return;
        const cl = cand.toLowerCase();
        if (!lower.startsWith(cl)) return;
        const after = str.slice(cand.length);
        // Must be end, or space / plural suffix boundary (C subset)
        if (after.length === 0
            || after[0] === ' '
            || after.toLowerCase().startsWith('s ')
            || after.toLowerCase().startsWith('es ')
            || after.toLowerCase().startsWith("'s ")) {
            if (cand.length > bestLen) {
                bestLen = cand.length;
                best = mndx;
                bestRest = after;
            }
        }
    };

    for (let i = 0; i < monsterNames.length; i++) {
        const nm = pm_to_name(monsterNames[i]);
        if (nm) tryMatch(nm, i);
    }
    for (const alt of ALT_NAMES) {
        tryMatch(alt.name, alt.mndx());
    }

    if (best >= LOW_PM || best === 0) {
        if (remainder_p) remainder_p.rest = bestRest ?? '';
        return best;
    }
    return NON_PM;
}

/** C ref: mondata.c name_to_mon */
export function name_to_mon(in_str) {
    return name_to_monplus(in_str, null);
}
