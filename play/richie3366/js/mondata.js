// mondata.js — Monster name lookup + growth (partial).
// C ref: mondata.c name_to_mon / name_to_monplus / name_to_monclass /
// little_to_big / big_to_little + monstseesu / monstunseesu
// (seen_resistance) + resist_conflict + cantvomit (D-1127).

import { game } from './gstate.js';
import { couldsee } from './vision.js';
import { rnd, rn2 } from './rng.js';
import { acurr, A_CHA } from './attrib.js';
import { objectNames } from './objects.js';
import {
    monsterNames, pmnames, NON_PM, LOW_PM, mons,
    MALE, FEMALE, NEUTRAL, NUM_MGENDERS,
    M1_SEE_INVIS,
    is_human, is_elf, is_dwarf, is_gnome, is_orc, is_giant, is_golem,
    is_mind_flayer, is_minion, is_demon, is_undead, is_rider,
    is_unicorn, is_longworm,
    breathless, verysmall, has_head,
} from './monsters.js';
import {
    M_SEEN_NOTHING, M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP,
    M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_POISON, M_SEEN_ACID, M_SEEN_REFL,
    CONFLICT,
    ANTIMAGIC, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, POISON_RES,
    SHOCK_RES, ACID_RES, REFLECTING,
} from './const.js';
import { mon_msound } from './sounds.js';
import { makesingular } from './objnam.js';

const RIN_CONFLICT = objectNames.indexOf('RIN_CONFLICT');
/** C monflag.h MS_SILENT / MS_BUZZ. */
const MS_SILENT = 0;
const MS_BUZZ = 10;

/* C ref: monattk.h AD_* used by cvt_adtyp_to_mseenres / get_atkdam_type */
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_SLEE = 4;
const AD_DISN = 5;
const AD_ELEC = 6;
const AD_DRST = 7;
const AD_ACID = 8;
const AD_RBRE = 242;

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

/**
 * C ref: mondata.c big_little_match `:1329–1351`. Only caller:
 * mon.c peacefuls_respond same-mlet arm. mons() is a fresh permonst
 * so C `mons[a].mlet != mons[b].mlet` is the string mlet, not identity.
 */
export function big_little_match(montyp1, montyp2) {
    montyp1 |= 0;
    montyp2 |= 0;
    /* simplest case: both are same pm */
    if (montyp1 === montyp2) return true;
    /* assume it isn't possible to grow from one class letter to another */
    const p1 = mons(montyp1);
    const p2 = mons(montyp2);
    if (!p1 || !p2 || p1.mlet !== p2.mlet) return false;
    /* check whether montyp1 can grow up into montyp2 */
    for (let l = montyp1, b = little_to_big(l); b !== l; l = b, b = little_to_big(l)) {
        if (b === montyp2) return true;
    }
    /* check whether montyp2 can grow up into montyp1 */
    for (let l = montyp2, b = little_to_big(l); b !== l; l = b, b = little_to_big(l)) {
        if (b === montyp1) return true;
    }
    return false;
}

const PM_KOBOLD_ZOMBIE = monsterNames.indexOf('PM_KOBOLD_ZOMBIE');
const PM_KOBOLD_MUMMY = monsterNames.indexOf('PM_KOBOLD_MUMMY');
const PM_TENGU = monsterNames.indexOf('PM_TENGU');
const PM_GARGOYLE = monsterNames.indexOf('PM_GARGOYLE');
const PM_WINGED_GARGOYLE = monsterNames.indexOf('PM_WINGED_GARGOYLE');
const PM_KILLER_BEE = monsterNames.indexOf('PM_KILLER_BEE');
const PM_QUEEN_BEE = monsterNames.indexOf('PM_QUEEN_BEE');

/**
 * C ref: mondata.c same_race — species kinship for cannibal / peace checks.
 * Branch envelope: exact; player races; giant/golem/mind flayer; kobold/
 * ogre/nymph/centaur/unicorn/dragon/naga; rider/minion; tengu/imp/demon;
 * undead letter families; little↔big growth; gargoyle; bee; longworm.
 */
export function same_race(pm1, pm2) {
    if (!pm1 || !pm2) return false;
    if (pm1 === pm2 || (pm1.mndx != null && pm1.mndx === pm2.mndx)) return true;

    if (is_human(pm1)) return is_human(pm2);
    if (is_elf(pm1)) return is_elf(pm2);
    if (is_dwarf(pm1)) return is_dwarf(pm2);
    if (is_gnome(pm1)) return is_gnome(pm2);
    if (is_orc(pm1)) return is_orc(pm2);
    if (is_giant(pm1)) return is_giant(pm2);
    if (is_golem(pm1)) return is_golem(pm2);
    if (is_mind_flayer(pm1)) return is_mind_flayer(pm2);

    const let1 = pm1.mlet;
    const let2 = pm2.mlet;
    const m1 = pm1.mndx | 0;
    const m2 = pm2.mndx | 0;

    if (let1 === 'S_KOBOLD' || m1 === PM_KOBOLD_ZOMBIE || m1 === PM_KOBOLD_MUMMY) {
        return let2 === 'S_KOBOLD' || m2 === PM_KOBOLD_ZOMBIE || m2 === PM_KOBOLD_MUMMY;
    }
    if (let1 === 'S_OGRE') return let2 === 'S_OGRE';
    if (let1 === 'S_NYMPH') return let2 === 'S_NYMPH';
    if (let1 === 'S_CENTAUR') return let2 === 'S_CENTAUR';
    if (is_unicorn(pm1)) return is_unicorn(pm2);
    if (let1 === 'S_DRAGON') return let2 === 'S_DRAGON';
    if (let1 === 'S_NAGA') return let2 === 'S_NAGA';
    if (is_rider(pm1)) return is_rider(pm2);
    if (is_minion(pm1)) return is_minion(pm2);
    if (m1 === PM_TENGU || m2 === PM_TENGU) return false;
    if (let1 === 'S_IMP') return let2 === 'S_IMP';
    if (let2 === 'S_IMP') return false;
    if (is_demon(pm1)) return is_demon(pm2);
    if (is_undead(pm1)) {
        if (let1 === 'S_ZOMBIE') return let2 === 'S_ZOMBIE';
        if (let1 === 'S_MUMMY') return let2 === 'S_MUMMY';
        if (let1 === 'S_VAMPIRE') return let2 === 'S_VAMPIRE';
        if (let1 === 'S_LICH') return let2 === 'S_LICH';
        if (let1 === 'S_WRAITH') return let2 === 'S_WRAITH';
        if (let1 === 'S_GHOST') return let2 === 'S_GHOST';
        return false;
    }
    if (is_undead(pm2)) return false;

    if (let1 === let2) {
        for (let prv = m1, nxt = big_to_little(m1); nxt !== prv;
            prv = nxt, nxt = big_to_little(nxt)) {
            if (nxt === m2) return true;
        }
        for (let prv = m1, nxt = little_to_big(m1); nxt !== prv;
            prv = nxt, nxt = little_to_big(nxt)) {
            if (nxt === m2) return true;
        }
    }
    if (m1 === PM_GARGOYLE || m1 === PM_WINGED_GARGOYLE) {
        return m2 === PM_GARGOYLE || m2 === PM_WINGED_GARGOYLE;
    }
    if (m1 === PM_KILLER_BEE || m1 === PM_QUEEN_BEE) {
        return m2 === PM_KILLER_BEE || m2 === PM_QUEEN_BEE;
    }
    if (is_longworm(pm1)) return is_longworm(pm2);
    return false;
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

/** C drawing.c def_char_to_monclass — first def_monsyms[].sym. */
const DEF_CHAR_TO_MLET = {
    a: 'S_ANT', b: 'S_BLOB', c: 'S_COCKATRICE', d: 'S_DOG', e: 'S_EYE',
    f: 'S_FELINE', g: 'S_GREMLIN', h: 'S_HUMANOID', i: 'S_IMP', j: 'S_JELLY',
    k: 'S_KOBOLD', l: 'S_LEPRECHAUN', m: 'S_MIMIC', n: 'S_NYMPH', o: 'S_ORC',
    p: 'S_PIERCER', q: 'S_QUADRUPED', r: 'S_RODENT', s: 'S_SPIDER',
    t: 'S_TRAPPER', u: 'S_UNICORN', v: 'S_VORTEX', w: 'S_WORM', x: 'S_XAN',
    y: 'S_LIGHT', z: 'S_ZRUTY',
    A: 'S_ANGEL', B: 'S_BAT', C: 'S_CENTAUR', D: 'S_DRAGON', E: 'S_ELEMENTAL',
    F: 'S_FUNGUS', G: 'S_GNOME', H: 'S_GIANT', I: 'S_invisible',
    J: 'S_JABBERWOCK', K: 'S_KOP', L: 'S_LICH', M: 'S_MUMMY', N: 'S_NAGA',
    O: 'S_OGRE', P: 'S_PUDDING', Q: 'S_QUANTMECH', R: 'S_RUSTMONST',
    S: 'S_SNAKE', T: 'S_TROLL', U: 'S_UMBER', V: 'S_VAMPIRE', W: 'S_WRAITH',
    X: 'S_XORN', Y: 'S_YETI', Z: 'S_ZOMBIE',
    '@': 'S_HUMAN', ' ': 'S_GHOST', "'": 'S_GOLEM', '&': 'S_DEMON',
    ';': 'S_EEL', ':': 'S_LIZARD', '~': 'S_WORM_TAIL', ']': 'S_MIMIC_DEF',
};

/** C drawing.c def_monsyms[].explain — index 1 = S_ANT … 60 = S_MIMIC_DEF. */
const DEF_MONSYM_EXPLAIN = [
    '',
    'ant or other insect', 'blob', 'cockatrice', 'dog or other canine',
    'eye or sphere', 'cat or other feline', 'gremlin', 'humanoid',
    'imp or minor demon', 'jelly', 'kobold', 'leprechaun', 'mimic', 'nymph',
    'orc', 'piercer', 'quadruped', 'rodent', 'arachnid or centipede',
    'trapper or lurker above', 'unicorn or horse', 'vortex', 'worm',
    'xan or other mythical/fantastic insect', 'light', 'zruty',
    'angelic being', 'bat or bird', 'centaur', 'dragon', 'elemental',
    'fungus or mold', 'gnome', 'giant humanoid', 'invisible monster',
    'jabberwock', 'Keystone Kop', 'lich', 'mummy', 'naga', 'ogre',
    'pudding or ooze', 'quantum mechanic', 'rust monster or disenchanter',
    'snake', 'troll', 'umber hulk', 'vampire', 'wraith', 'xorn',
    'apelike creature', 'zombie', 'human or elf', 'ghost', 'golem',
    'major demon', 'sea monster', 'lizard', 'long worm tail', 'mimic',
];
const DEF_MONSYM_MLET = [
    null,
    'S_ANT', 'S_BLOB', 'S_COCKATRICE', 'S_DOG', 'S_EYE', 'S_FELINE',
    'S_GREMLIN', 'S_HUMANOID', 'S_IMP', 'S_JELLY', 'S_KOBOLD',
    'S_LEPRECHAUN', 'S_MIMIC', 'S_NYMPH', 'S_ORC', 'S_PIERCER',
    'S_QUADRUPED', 'S_RODENT', 'S_SPIDER', 'S_TRAPPER', 'S_UNICORN',
    'S_VORTEX', 'S_WORM', 'S_XAN', 'S_LIGHT', 'S_ZRUTY', 'S_ANGEL',
    'S_BAT', 'S_CENTAUR', 'S_DRAGON', 'S_ELEMENTAL', 'S_FUNGUS', 'S_GNOME',
    'S_GIANT', 'S_invisible', 'S_JABBERWOCK', 'S_KOP', 'S_LICH', 'S_MUMMY',
    'S_NAGA', 'S_OGRE', 'S_PUDDING', 'S_QUANTMECH', 'S_RUSTMONST',
    'S_SNAKE', 'S_TROLL', 'S_UMBER', 'S_VAMPIRE', 'S_WRAITH', 'S_XORN',
    'S_YETI', 'S_ZOMBIE', 'S_HUMAN', 'S_GHOST', 'S_GOLEM', 'S_DEMON',
    'S_EEL', 'S_LIZARD', 'S_WORM_TAIL', 'S_MIMIC_DEF',
];
const NAME_TO_MONCLASS_FALSE = ['an', 'the', 'or', 'other', 'or other'];
const DEF_INVISIBLE = 'I';
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');

function strcmpi_eq(a, b) {
    return String(a).toLowerCase() === String(b).toLowerCase();
}

/**
 * C ref: mondata.c name_to_monclass — class letter, explain, or species.
 * Returns mlet name ('S_ANT') or 0 if no match (C returns 0 not MAXMCLASSES).
 * mndx_p: optional `{ mndx }` out for a specific type (create_particular).
 */
export function name_to_monclass(in_str, mndx_p = null) {
    if (mndx_p) mndx_p.mndx = NON_PM;
    if (!in_str) return 0;
    const s0 = String(in_str);
    if (!s0.length) return 0;
    if (s0.length === 1) {
        let mlet = DEF_CHAR_TO_MLET[s0] || null;
        if (mlet === 'S_MIMIC_DEF') return 'S_MIMIC';
        if (mlet === 'S_WORM_TAIL') {
            if (mndx_p) mndx_p.mndx = PM_LONG_WORM;
            return 'S_WORM';
        }
        if (!mlet) {
            return s0 === DEF_INVISIBLE ? 'S_invisible' : 0;
        }
        return mlet;
    }
    if (strcmpi_eq(s0, 'long')) return 0;
    const in_str_s = makesingular(s0);
    for (const bad of NAME_TO_MONCLASS_FALSE) {
        if (strcmpi_eq(in_str_s, bad)) return 0;
    }
    if (strcmpi_eq(in_str_s, 'long worm')) {
        if (mndx_p) mndx_p.mndx = PM_LONG_WORM;
        return mons(PM_LONG_WORM)?.mlet || 'S_WORM';
    }
    if (strcmpi_eq(in_str_s, 'demon') || strcmpi_eq(in_str_s, 'devil')) {
        return 'S_DEMON';
    }
    if (strcmpi_eq(in_str_s, 'bug')) return 'S_XAN';
    if (strcmpi_eq(in_str_s, 'fish')) return 'S_EEL';
    const needle = in_str_s.toLowerCase();
    const nlen = needle.length;
    for (let i = 1; i < DEF_MONSYM_EXPLAIN.length; i++) {
        const x = DEF_MONSYM_EXPLAIN[i];
        const xl = x.toLowerCase();
        const p = xl.indexOf(needle);
        if (p < 0) continue;
        if (p !== 0 && x[p - 1] !== ' ') continue;
        if (x.length - p < nlen) continue;
        const after = x[p + nlen];
        if (after !== undefined && after !== ' ') continue;
        return DEF_MONSYM_MLET[i];
    }
    const i = name_to_mon(in_str_s);
    if (i !== NON_PM && i >= 0) {
        if (mndx_p) mndx_p.mndx = i;
        return mons(i)?.mlet || 0;
    }
    return 0;
}

/**
 * C ref: mondata.c cvt_adtyp_to_mseenres — AD_foo → M_SEEN_bar.
 * M_SEEN_REFL has no AD_* mapping.
 */
export function cvt_adtyp_to_mseenres(adtyp) {
    switch (adtyp | 0) {
    case AD_MAGM: return M_SEEN_MAGR;
    case AD_FIRE: return M_SEEN_FIRE;
    case AD_COLD: return M_SEEN_COLD;
    case AD_SLEE: return M_SEEN_SLEEP;
    case AD_DISN: return M_SEEN_DISINT;
    case AD_ELEC: return M_SEEN_ELEC;
    case AD_DRST: return M_SEEN_POISON;
    case AD_ACID: return M_SEEN_ACID;
    default: return M_SEEN_NOTHING;
    }
}

/**
 * C ref: mondata.c cvt_prop_to_mseenres — youprop index → M_SEEN_*.
 * Caller worn.c setworn via monstunseesu_prop.
 */
export function cvt_prop_to_mseenres(prop) {
    switch (prop | 0) {
    case ANTIMAGIC: return M_SEEN_MAGR;
    case FIRE_RES: return M_SEEN_FIRE;
    case COLD_RES: return M_SEEN_COLD;
    case SLEEP_RES: return M_SEEN_SLEEP;
    case DISINT_RES: return M_SEEN_DISINT;
    case POISON_RES: return M_SEEN_POISON;
    case SHOCK_RES: return M_SEEN_ELEC;
    case ACID_RES: return M_SEEN_ACID;
    case REFLECTING: return M_SEEN_REFL;
    default: return M_SEEN_NOTHING;
    }
}

/**
 * C monst.h monstunseesu_prop — forget seen-res for this oc_oprop.
 */
export function monstunseesu_prop(prop) {
    monstunseesu(cvt_prop_to_mseenres(prop));
}

/**
 * C ref: mondata.c get_atkdam_type — AD_RBRE → random breath AD_*.
 */
export function get_atkdam_type(adtyp) {
    if ((adtyp | 0) === AD_RBRE) {
        const rnd_breath_typ = [
            AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE,
            AD_DISN, AD_ELEC, AD_DRST, AD_ACID,
        ];
        return rnd_breath_typ[rn2(rnd_breath_typ.length)];
    }
    return adtyp | 0;
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

/**
 * C ref: mondata.c can_blow — whistle/horn mouth check.
 * Silent or MS_BUZZ forms that are breathless/verysmall/headless/eel cannot;
 * hero also fails when Strangled.
 * Named omit: full is_silent table (uses mon_msound inference).
 */
export function can_blow(mtmp) {
    if (!mtmp) return false;
    const ptr = mtmp.data;
    const ms = mon_msound(mtmp);
    if ((ms === MS_SILENT || ms === MS_BUZZ)
        && (breathless(ptr) || verysmall(ptr)
            || !has_head(ptr) || ptr?.mlet === 'S_EEL')) {
        return false;
    }
    if (mtmp === game.youmonst) {
        const u = game.u || {};
        if (u.Strangled || (u.EStrangled | 0)) return false;
    }
    return true;
}

/**
 * C ref: mondata.c cantvomit — rats/mice (S_RODENT except rock mole /
 * woodchuck) and horses cannot vomit. Compare mndx (JS mons() is a
 * fresh object; C uses &mons[PM_*]).
 */
export function cantvomit(ptr) {
    if (!ptr) return false;
    const mndx = ptr.mndx | 0;
    if (ptr.mlet === 'S_RODENT'
        && mndx !== pm('ROCK_MOLE')
        && mndx !== pm('WOODCHUCK')) {
        return true;
    }
    if (mndx === pm('WARHORSE') || mndx === pm('HORSE')
        || mndx === pm('PONY')) {
        return true;
    }
    return false;
}

/** C monattk.h AT_HUGS — on_fire default "being roasted". */
const AT_HUGS = 7;

/**
 * C ref: mondata.c on_fire — phrase for a fire attack on this form.
 * minliquid_core lava maps boiling→boils away, melting→melts away,
 * else burns to a crisp (D-1138).
 */
export function on_fire(mptr, mattk) {
    const mndx = mptr?.mndx | 0;
    switch (mndx) {
    case pm('FLAMING_SPHERE'):
    case pm('FIRE_VORTEX'):
    case pm('FIRE_ELEMENTAL'):
    case pm('SALAMANDER'):
        return 'already on fire';
    case pm('WATER_ELEMENTAL'):
    case pm('FOG_CLOUD'):
    case pm('STEAM_VORTEX'):
        return 'boiling';
    case pm('ICE_VORTEX'):
    case pm('GLASS_GOLEM'):
        return 'melting';
    case pm('STONE_GOLEM'):
    case pm('CLAY_GOLEM'):
    case pm('GOLD_GOLEM'):
    case pm('AIR_ELEMENTAL'):
    case pm('EARTH_ELEMENTAL'):
    case pm('DUST_VORTEX'):
    case pm('ENERGY_VORTEX'):
        return 'heating up';
    default:
        return ((mattk?.aatyp | 0) === AT_HUGS) ? 'being roasted' : 'on fire';
    }
}

export { MALE, FEMALE, NEUTRAL, NUM_MGENDERS };
