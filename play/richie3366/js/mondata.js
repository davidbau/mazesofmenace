// mondata.js — Monster name lookup + growth (partial).
// C ref: mondata.c name_to_mon / name_to_monplus / name_to_monclass /
// little_to_big / big_to_little + monstseesu / monstunseesu
// (seen_resistance) + resist_conflict + cantvomit (D-1127).

import { game } from './gstate.js';
import { couldsee } from './vision.js';
import { rnd, rn2 } from './rng.js';
import { acurr, A_CHA } from './attrib.js';
import { objectNames, ARMOR_CLASS, WEAPON_CLASS } from './objects.js';
import {
    monsterNames, pmnames, NON_PM, LOW_PM, NUMMONS, mons,
    MALE, FEMALE, NEUTRAL, NUM_MGENDERS,
    M1_SEE_INVIS,
    is_human, is_elf, is_dwarf, is_gnome, is_orc, is_giant, is_golem,
    is_mind_flayer, is_minion, is_demon, is_undead, is_rider,
    is_unicorn, is_longworm,
    breathless, dmgtype, verysmall, has_head, haseyes,
    is_neuter, humanoid, G_UNIQ,
} from './monsters.js';
import {
    M_SEEN_NOTHING, M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP,
    M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_POISON, M_SEEN_ACID, M_SEEN_REFL,
    CONFLICT,
    ANTIMAGIC, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, POISON_RES,
    SHOCK_RES, ACID_RES, REFLECTING,
    W_ARM, W_ARMOR, W_ACCESSORY, W_WEP, W_SWAPWEP,
    BLND_RES,
    Upolyd,
} from './const.js';
import { defends, defends_when_carried, Is_dragon_armor } from './artifact.js';
import { MON_WEP } from './weapon.js';
import { is_weptool } from './wield.js';
import { which_armor } from './worn.js';
import { mon_msound } from './sounds.js';
import { makesingular } from './objnam.js';
import { genders } from './roles.js';
import { type_is_pname } from './do_name.js';
import { canspotmon, Hallucination, impossible } from './display.js';
import { Blind } from './invent.js';
import { Unaware } from './eat.js';
import { dmgtype_fromattack, AT_EXPL, AT_GAZE, AD_BLND } from './mhitm.js';
import { title_to_mon } from './botl.js';

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
 * C ref: mondata.c raceptr `:1359-1365` — race pointer of a monster: the
 * hero while not polymorphed reads the race table (`&mons[urace]`),
 * otherwise the current form (`mtmp->data`). Fresh `mons()` objects
 * carry `mndx`, so callers compare that (C compares the pointer).
 * @param {object} mtmp
 */
export function raceptr(mtmp) {
    if ((mtmp === game.youmonst || !!mtmp?._youmonst) && !Upolyd(game.u)) {
        return mons(game.urace?.mnum);
    }
    return mtmp?.data;
}

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

const PM_GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const PM_YELLOW_DRAGON = monsterNames.indexOf('PM_YELLOW_DRAGON');
const PM_BABY_GRAY_DRAGON = monsterNames.indexOf('PM_BABY_GRAY_DRAGON');
const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');

/** C ref: mondata.c monsndx — mons[] index of a permonst pointer. */
export function monsndx(ptr) {
    return ((ptr?.mndx ?? ptr?.mnum ?? NON_PM) | 0);
}

/**
 * C ref: mondata.c defended :89–124 — wielded artifact defends(adtyp);
 * an adult dragon is its own suit (scales otyp derived from the
 * monsndx range, since defends/Is_dragon_armor only read otyp);
 * otherwise the worn W_ARM suit; dragon armor defends(adtyp).
 * Caller: trap.c m_harmless_trap (ANTI_MAGIC/SLP_GAS/FIRE arms).
 */
export function defended(mon, adtyp) {
    const u = game.u || {};
    const isYou = mon === game.youmonst || !!mon?._youmonst;
    // C: wielded artifact protecting against adtyp
    let o = isYou ? (u.uwep || null) : MON_WEP(mon);
    if (o?.oartifact && defends(adtyp, o)) return true;
    // C: adult dragon treated as wearing its own scales
    const mndx = monsndx(mon?.data);
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON) {
        o = {
            oclass: ARMOR_CLASS,
            otyp: GRAY_DRAGON_SCALES + (mndx - PM_GRAY_DRAGON),
        };
    } else {
        o = isYou ? (u.uarm || null) : which_armor(mon, W_ARM);
    }
    if (o && Is_dragon_armor(o) && defends(adtyp, o)) return true;
    return false;
}

/**
 * C ref: mondata.c resists_magm :214–244 — dmgtype AD_MAGM / baby gray /
 * AD_RBRE; wielded-weapon artifact; worn-or-carried ANTIMAGIC oc_oprop or
 * carried-artifact scan (hero: invent array; monster: minvent chain).
 * Canonical port; the species-only file-local clones in explode.js /
 * mhitm.js and the zap.js stub predate it (drift, named).
 * Caller: trap.c m_harmless_trap (ANTI_MAGIC arm).
 */
export function resists_magm(mon) {
    if (!mon) return false;
    const ptr = mon.data;
    if (!ptr) return false;
    const u = game.u || {};
    const isYou = mon === game.youmonst || !!mon._youmonst;
    // C: gray dragons, Angels, Oracle, Yeenoghu; Chromatic Dragon (AD_RBRE)
    if (dmgtype(ptr, AD_MAGM)) return true;
    if (monsndx(ptr) === PM_BABY_GRAY_DRAGON) return true;
    if (dmgtype(ptr, AD_RBRE)) return true;
    // C: magic resistance granted by wielded weapon
    let o = isYou ? (u.uwep || null) : MON_WEP(mon);
    if (o?.oartifact && defends(AD_MAGM, o)) return true;
    // C: worn or carried items; monsters don't wield non-weapons so
    // their wielded slot always counts, heroes only with weapon/weptool
    let slotmask = (W_ARMOR | W_ACCESSORY) | 0;
    const uwep = u.uwep || null;
    if (!isYou
        || (uwep && (((uwep.oclass | 0) === WEAPON_CLASS) || is_weptool(uwep)))) {
        slotmask |= W_WEP;
    }
    if (isYou && u.twoweap) slotmask |= W_SWAPWEP;
    const grants = (it) => (((it?.owornmask | 0) & slotmask) !== 0
        && ((game.objects?.[it.otyp | 0]?.oc_oprop | 0) === ANTIMAGIC))
        || (it?.oartifact && defends_when_carried(AD_MAGM, it));
    if (isYou) {
        for (const it of game.invent || []) {
            if (grants(it)) return true;
        }
    } else {
        for (let it = mon.minvent; it; it = it.nobj) {
            if (grants(it)) return true;
        }
    }
    return false;
}

/**
 * C ref: mondata.c resists_blnd_by_arti :275–298 — wielded artifact with
 * defends(AD_BLND) (Sunsword); then the whole invent/minvent chain for
 * defends_when_carried(AD_BLND). C :293–298 `#if 0` Eyes of the Overworld
 * arm is omitted upstream (no carry property; worn blocks without
 * resisting) — no JS.
 * Caller: resists_blnd below.
 */
export function resists_blnd_by_arti(mon) {
    const u = game.u || {};
    const isYou = mon === game.youmonst;
    // C :281–283 — wielded magical equipment (uwep hero / MON_WEP monster)
    let o = isYou ? (u.uwep || null) : MON_WEP(mon);
    if (o && o.oartifact && defends(AD_BLND, o)) return true;
    // C :284–286 — worn-or-carried scan (hero: invent array; monster chain)
    if (isYou) {
        for (const it of game.invent || []) {
            if (defends_when_carried(AD_BLND, it)) return true;
        }
    } else {
        for (let it = mon?.minvent; it; it = it.nobj) {
            if (defends_when_carried(AD_BLND, it)) return true;
        }
    }
    return false;
}

/**
 * C ref: mondata.c resists_blnd :247–272, in C order — hero arm
 * `:251` Blind||Unaware; monster arm `:252–256` mblinded||!mcansee||
 * !haseyes||msleeping (temporary sleep sets mfrozen, uncheckable — C
 * comment); `:258–260` yellow light / Archon / dust-vortex-cobra-raven
 * exclusions via dmgtype AD_BLND AT_EXPL/AT_GAZE; `:262–263` Sunsword
 * via resists_blnd_by_arti; `:265–269` hero Blnd_resist catchall with
 * the upstream impossible() (data inconsistency, kept: it is C output).
 * Canonical port; the species-only file-local subsets in mhitm.js
 * (resists_blnd_mm), mhitu.js (resists_blnd_you), detect.js and trap.js
 * predate it (drift, named in the map).
 * Caller: can_blnd light-attack arm (uhitm.js).
 */
export function resists_blnd(mon) {
    const ptr = mon?.data;
    const isYou = mon === game.youmonst;
    // C :251–256
    if (isYou
        ? (Blind() || Unaware())
        : ((mon.mblinded | 0) || !(mon.mcansee | 0) || !haseyes(ptr)
            || (mon.msleeping | 0))) {
        return true;
    }
    // C :258–260
    if (dmgtype_fromattack(ptr, AD_BLND, AT_EXPL)
        || dmgtype_fromattack(ptr, AD_BLND, AT_GAZE)) {
        return true;
    }
    // C :262–263
    if (resists_blnd_by_arti(mon)) return true;
    // C :265–269 — catchall
    const u = game.u || {};
    if (isYou
        && (((u.HBlnd_resist | 0) || (u.uprops?.[BLND_RES]?.intrinsic | 0)
            || (u.EBlnd_resist | 0)
            || (u.uprops?.[BLND_RES]?.extrinsic | 0)))) {
        impossible("'Blnd_resist' but not resists_blnd()?");
        return true;
    }
    return false;
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
 * C ref: mondata.c same_race `:771-871` — species kinship for the cannibal
 * and peace checks. C callers: dog.c:1080 (dogfood), eat.c:776
 * (maybe_cannibal), muse.c:255, sounds.c:706-707 (domonnoise remap).
 * Branch envelope: exact `:775-776`; player races `:778-787`;
 * giant/golem/mind flayer `:789-794`; kobold+zombie+mummy `:795-798`;
 * ogre/nymph/centaur/unicorn/dragon/naga `:799-810`; rider/minion
 * `:812-815`; tengu `:817-818`; imp `:819-823`; demon `:824-825`; undead
 * letters `:826-840` (no terminal return — a miss falls through);
 * little/big growth `:843-857`; gargoyle/bee `:859-863`; longworm
 * `:865-866`; miss `:870`.
 */
export function same_race(pm1, pm2) {
    /* C `:773` reads the letters first; the null guard is JS-only (C takes
       NONNULLARG12, extern.h:1892) and pre-existing — kept. */
    if (!pm1 || !pm2) return false;
    const let1 = pm1.mlet;
    const let2 = pm2.mlet;

    /* C `:775-776` — exact match. C compares table pointers; mons() may
       hand out fresh wrappers for one index, so equal mndx counts too. */
    if (pm1 === pm2 || (pm1.mndx != null && pm1.mndx === pm2.mndx)) return true;

    /* C compares `pm == &mons[PM_X]` table pointers (`:795-798`, `:817`,
       `:859-863`); JS compares live monsndx() against monsterNames indices
       (same table order — pm()/monsterNames convention). */
    const m1 = monsndx(pm1);
    const m2 = monsndx(pm2);

    /* C `:777-787` — player races have their own predicates */
    if (is_human(pm1)) return is_human(pm2); // `:778-779`
    if (is_elf(pm1)) return is_elf(pm2); // `:780-781`
    if (is_dwarf(pm1)) return is_dwarf(pm2); // `:782-783`
    if (is_gnome(pm1)) return is_gnome(pm2); // `:784-785`
    if (is_orc(pm1)) return is_orc(pm2); // `:786-787`
    /* C `:788-794` — other creatures are less precise */
    if (is_giant(pm1)) return is_giant(pm2); // `:789-790`
    if (is_golem(pm1)) return is_golem(pm2); // `:791-792`
    if (is_mind_flayer(pm1)) return is_mind_flayer(pm2); // `:793-794`
    if (let1 === 'S_KOBOLD' || m1 === PM_KOBOLD_ZOMBIE || m1 === PM_KOBOLD_MUMMY) { // `:795-796`
        return let2 === 'S_KOBOLD' || m2 === PM_KOBOLD_ZOMBIE || m2 === PM_KOBOLD_MUMMY; // `:797-798`
    }
    if (let1 === 'S_OGRE') return let2 === 'S_OGRE'; // `:799-800`
    if (let1 === 'S_NYMPH') return let2 === 'S_NYMPH'; // `:801-802`
    if (let1 === 'S_CENTAUR') return let2 === 'S_CENTAUR'; // `:803-804`
    if (is_unicorn(pm1)) return is_unicorn(pm2); // `:805-806`
    if (let1 === 'S_DRAGON') return let2 === 'S_DRAGON'; // `:807-808`
    if (let1 === 'S_NAGA') return let2 === 'S_NAGA'; // `:809-810`
    /* C `:811-815` — other critters get steadily messier */
    if (is_rider(pm1)) return is_rider(pm2); // `:812-813`
    if (is_minion(pm1)) return is_minion(pm2); // `:814-815`
    /* C `:816-818` — tengu don't match imps (both-tengu handled by exact) */
    if (m1 === PM_TENGU || m2 === PM_TENGU) return false;
    if (let1 === 'S_IMP') return let2 === 'S_IMP'; // `:819-820`
    /* C `:821-823` — minor demons (imps) don't match major demons */
    else if (let2 === 'S_IMP') return false;
    if (is_demon(pm1)) return is_demon(pm2); // `:824-825`
    /* C `:826-840` — no terminal return inside the pm1 arm: a letter miss
       falls through to the growth / gargoyle / bee / longworm checks. */
    if (is_undead(pm1)) {
        if (let1 === 'S_ZOMBIE') return let2 === 'S_ZOMBIE'; // `:827-828`
        if (let1 === 'S_MUMMY') return let2 === 'S_MUMMY'; // `:829-830`
        if (let1 === 'S_VAMPIRE') return let2 === 'S_VAMPIRE'; // `:831-832`
        if (let1 === 'S_LICH') return let2 === 'S_LICH'; // `:833-834`
        if (let1 === 'S_WRAITH') return let2 === 'S_WRAITH'; // `:835-836`
        if (let1 === 'S_GHOST') return let2 === 'S_GHOST'; // `:837-838`
    } else if (is_undead(pm2)) {
        return false; // `:839-840`
    }

    /* C `:842-857` — monsters which grow into more mature forms; m1 != m2
       is known from the exact check, so only m1's chain is walked. */
    if (let1 === let2) {
        /* C `:846-852` — all smaller forms of m1, then `:853-856` larger */
        for (let prv = m1, nxt = big_to_little(m1); nxt !== prv;
            prv = nxt, nxt = big_to_little(nxt)) {
            if (nxt === m2) return true;
        }
        for (let prv = m1, nxt = little_to_big(m1); nxt !== prv;
            prv = nxt, nxt = little_to_big(nxt)) {
            if (nxt === m2) return true;
        }
    }
    /* C `:858-863` — not caught by little/big handling */
    if (m1 === PM_GARGOYLE || m1 === PM_WINGED_GARGOYLE) { // `:859`
        return m2 === PM_GARGOYLE || m2 === PM_WINGED_GARGOYLE; // `:860-861`
    }
    if (m1 === PM_KILLER_BEE || m1 === PM_QUEEN_BEE) { // `:862`
        return m2 === PM_KILLER_BEE || m2 === PM_QUEEN_BEE; // `:863`
    }
    if (is_longworm(pm1)) return is_longworm(pm2); // `:865-866`
    /* C `:867-870` — didn't match */
    return false;
}

/**
 * C ref: mondata.c name_to_monplus `:937–999` alt_spl table — alternate
 * spellings scanned before pmnames (grey/gray, mindflayer, aligned/high
 * priest(ess), master-*, outdated names, hyphenates, irregular plurals).
 * `pm` is the monsterNames label (index resolved at scan time);
 * `gender` is the C genderhint (MALE / FEMALE / NEUTRAL).
 */
const ALT_NAMES = [
    // C `:937–943` alternate spellings
    { name: 'grey dragon', pm: 'PM_GRAY_DRAGON', gender: NEUTRAL },
    { name: 'baby grey dragon', pm: 'PM_BABY_GRAY_DRAGON', gender: NEUTRAL },
    { name: 'grey unicorn', pm: 'PM_GRAY_UNICORN', gender: NEUTRAL },
    { name: 'grey ooze', pm: 'PM_GRAY_OOZE', gender: NEUTRAL },
    { name: 'gray-elf', pm: 'PM_GREY_ELF', gender: NEUTRAL },
    { name: 'mindflayer', pm: 'PM_MIND_FLAYER', gender: NEUTRAL },
    { name: 'master mindflayer', pm: 'PM_MASTER_MIND_FLAYER', gender: NEUTRAL },
    // C `:944–950` aligned/high priests (separate genders, one type)
    { name: 'aligned priest', pm: 'PM_ALIGNED_CLERIC', gender: MALE },
    { name: 'aligned priestess', pm: 'PM_ALIGNED_CLERIC', gender: FEMALE },
    { name: 'high priest', pm: 'PM_HIGH_CLERIC', gender: MALE },
    { name: 'high priestess', pm: 'PM_HIGH_CLERIC', gender: FEMALE },
    // C `:951–952` inappropriate singularization by the -ves fix above
    { name: 'master of thief', pm: 'PM_MASTER_OF_THIEVES', gender: NEUTRAL },
    // C `:953–958` misspellings (avoid falling back to rank-title prefix)
    { name: 'master thief', pm: 'PM_MASTER_OF_THIEVES', gender: NEUTRAL },
    { name: 'master of assassin', pm: 'PM_MASTER_ASSASSIN', gender: NEUTRAL },
    { name: 'master-lich', pm: 'PM_MASTER_LICH', gender: NEUTRAL },
    { name: 'masterlich', pm: 'PM_MASTER_LICH', gender: NEUTRAL },
    // C `:959–962` outdated names
    { name: 'invisible stalker', pm: 'PM_STALKER', gender: NEUTRAL },
    { name: 'high-elf', pm: 'PM_ELVEN_MONARCH', gender: NEUTRAL },
    // C `:963–970` other misspellings or incorrect words
    { name: 'wood-elf', pm: 'PM_WOODLAND_ELF', gender: NEUTRAL },
    { name: 'wood elf', pm: 'PM_WOODLAND_ELF', gender: NEUTRAL },
    { name: 'woodland nymph', pm: 'PM_WOOD_NYMPH', gender: NEUTRAL },
    { name: 'halfling', pm: 'PM_HOBBIT', gender: NEUTRAL },
    { name: 'genie', pm: 'PM_DJINNI', gender: NEUTRAL },
    // C `:971–976` duplicate-name workaround prefixes
    { name: 'human wererat', pm: 'PM_HUMAN_WERERAT', gender: NEUTRAL },
    { name: 'human werejackal', pm: 'PM_HUMAN_WEREJACKAL', gender: NEUTRAL },
    { name: 'human werewolf', pm: 'PM_HUMAN_WEREWOLF', gender: NEUTRAL },
    // C `:977–979` for completeness
    { name: 'rat wererat', pm: 'PM_WERERAT', gender: NEUTRAL },
    { name: 'jackal werejackal', pm: 'PM_WEREJACKAL', gender: NEUTRAL },
    { name: 'wolf werewolf', pm: 'PM_WEREWOLF', gender: NEUTRAL },
    // C `:980–993` hyphenated names
    { name: 'ki rin', pm: 'PM_KI_RIN', gender: NEUTRAL },
    { name: 'kirin', pm: 'PM_KI_RIN', gender: NEUTRAL },
    { name: 'uruk hai', pm: 'PM_URUK_HAI', gender: NEUTRAL },
    { name: 'orc captain', pm: 'PM_ORC_CAPTAIN', gender: NEUTRAL },
    { name: 'woodland elf', pm: 'PM_WOODLAND_ELF', gender: NEUTRAL },
    { name: 'green elf', pm: 'PM_GREEN_ELF', gender: NEUTRAL },
    { name: 'grey elf', pm: 'PM_GREY_ELF', gender: NEUTRAL },
    { name: 'gray elf', pm: 'PM_GREY_ELF', gender: NEUTRAL },
    { name: 'elf lady', pm: 'PM_ELF_NOBLE', gender: FEMALE },
    { name: 'elf lord', pm: 'PM_ELF_NOBLE', gender: MALE },
    { name: 'elf noble', pm: 'PM_ELF_NOBLE', gender: NEUTRAL },
    { name: 'olog hai', pm: 'PM_OLOG_HAI', gender: NEUTRAL },
    { name: 'arch lich', pm: 'PM_ARCH_LICH', gender: NEUTRAL },
    { name: 'archlich', pm: 'PM_ARCH_LICH', gender: NEUTRAL },
    // C `:994–999` irregular plurals
    { name: 'incubi', pm: 'PM_AMOROUS_DEMON', gender: MALE },
    { name: 'succubi', pm: 'PM_AMOROUS_DEMON', gender: FEMALE },
    { name: 'violet fungi', pm: 'PM_VIOLET_FUNGUS', gender: NEUTRAL },
    { name: 'homunculi', pm: 'PM_HOMUNCULUS', gender: NEUTRAL },
    { name: 'baluchitheria', pm: 'PM_BALUCHITHERIUM', gender: NEUTRAL },
    { name: 'lurkers above', pm: 'PM_LURKER_ABOVE', gender: NEUTRAL },
    { name: 'cavemen', pm: 'PM_CAVE_DWELLER', gender: MALE },
    { name: 'cavewomen', pm: 'PM_CAVE_DWELLER', gender: FEMALE },
    { name: 'watchmen', pm: 'PM_WATCHMAN', gender: NEUTRAL },
    { name: 'djinn', pm: 'PM_DJINNI', gender: NEUTRAL },
    { name: 'mumakil', pm: 'PM_MUMAK', gender: NEUTRAL },
    { name: 'erinyes', pm: 'PM_ERINYS', gender: NEUTRAL },
];

/**
 * C ref: mondata.c name_to_monplus `:893–1085` — longest monster-name
 * match on the input front, tolerating trailing text ("ettin zombie
 * corpse"), longest-name-wins ("ettin zombie" over "ettin"), and
 * s/es/'s/plural suffixes. remainder_p ({ rest }) takes the unmatched
 * tail as an in_str offset (C `:1009`, `:1077`); gender_name_var
 * ({ gender }, init -1 per objnam.c:3947) takes the match gender, with
 * the neuter no-override rule (C `:1078–1083`).
 */
export function name_to_monplus(in_str, remainder_p = null, gender_name_var = null) {
    if (remainder_p) remainder_p.rest = null; // C `:915–916`
    if (!in_str) return NON_PM; // house guard (C NONNULLARG1)

    // C `:918–925` buf copy + article strip (case-SENSITIVE strncmp)
    const inStr = String(in_str);
    let skip = 0;
    if (inStr.startsWith('a ')) skip = 2;
    else if (inStr.startsWith('an ')) skip = 3;
    else if (inStr.startsWith('the ')) skip = 4;
    let str = inStr.slice(skip);
    let slow = str.toLowerCase();

    // C `:930–940` plural pre-fixes (mutate + truncate, then recompute slen)
    const vort = slow.indexOf('vortices'); // C strstri
    if (vort >= 0) {
        str = str.slice(0, vort + 4) + 'ex'; // C Strcpy(s + 4, "ex")
        slow = str.toLowerCase();
    } else if (str.length > 3 && slow.endsWith('ies') // beware "priest"/"zombies"
               && !(str.length >= 7 && slow.endsWith('zombies'))) {
        str = str.slice(0, str.length - 3) + 'y'; // C Strcpy(term - 3, "y")
        slow = str.toLowerCase();
    } else if (str.length > 3 && slow.endsWith('ves')) {
        str = str.slice(0, str.length - 3) + 'f'; // C Strcpy(term - 3, "f")
        slow = str.toLowerCase();
    }
    const slen = str.length; // C `:942` length recomputed

    // C `:1001–1017` alt_spl scan — first prefix hit with a word boundary
    // (end, space, possessive) wins and returns immediately
    for (const alt of ALT_NAMES) {
        const mndx = monsterNames.indexOf(alt.pm);
        if (mndx < LOW_PM) continue;
        const len = alt.name.length;
        if (!slow.startsWith(alt.name)) continue;
        const after = str[len];
        if (after === undefined || after === ' ' || after === "'") { // C `:1007`
            if (remainder_p) remainder_p.rest = inStr.slice(skip + len); // C `:1009–1010`
            if (gender_name_var) gender_name_var.gender = alt.gender; // C `:1011–1012`
            return mndx;
        }
    }

    // C `:1019–1069` pmnames scan — strictly-longer match replaces
    // (ties keep the lowest index/gender); exact match breaks both loops
    let mntmp = NON_PM; // C `:906`
    let len = 0;
    let matchgend = -1; // C `:911`
    let exact_match = false; // C `:913`
    for (let i = LOW_PM; i < NUMMONS && !exact_match; i++) { // C `:1019` + `:1067–1068`
        const entry = pmnames[i];
        if (!entry) continue;
        for (let mgend = MALE; mgend < NUM_MGENDERS; mgend++) { // C `:1020`
            const cand = entry[mgend];
            if (!cand) continue; // C `:1022–1023`
            const mLen = cand.length;
            if (mLen <= len) continue; // C `:1027` m_i_len > len
            if (!slow.startsWith(cand.toLowerCase())) continue; // C `:1028` strncmpi
            if (mLen === slen) { // C `:1029–1035` exact match
                mntmp = i;
                len = mLen;
                matchgend = mgend;
                exact_match = true;
                break;
            }
            // C `:1036–1054` prefix with space/plural/possessive boundary
            const tail = slow.slice(mLen);
            if (slen > mLen
                && (tail[0] === ' '
                    || tail === 's' || tail.startsWith('s ')
                    || tail === "'" || tail.startsWith("' ")
                    || tail === "'s" || tail.startsWith("'s ")
                    || tail === 'es' || tail.startsWith('es '))) {
                mntmp = i;
                len = mLen;
                matchgend = mgend;
            }
        }
    }
    // C `:1073–1075` rank-title fallback (FIXME: propagates no gender)
    if (mntmp === NON_PM) {
        const lenBox = { value: 0 };
        mntmp = title_to_mon(str, null, lenBox);
        len = lenBox.value;
    }
    if (len && remainder_p) // C `:1076–1077`
        remainder_p.rest = inStr.slice(skip + len);
    if (gender_name_var && matchgend !== -1) { // C `:1078–1083`
        // don't override with neuter if caller already specified male/female
        if (gender_name_var.gender === -1 || matchgend !== NEUTRAL)
            gender_name_var.gender = matchgend;
    }
    return mntmp;
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
export const DEF_MONSYM_MLET = [
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
/**
 * C ref: drawing.c def_monsyms[].explain by mlet name ('S_FELINE' →
 * 'cat or other feline'). pager.c do_screen_description check_monsters
 * prints an(explain) for the shown symbol's class. Returns null when the
 * mlet has no explain row (mirrors C's `explain && *explain` guard).
 */
export function mlet_class_explain(mlet) {
    const i = DEF_MONSYM_MLET.indexOf(mlet);
    return i > 0 ? (DEF_MONSYM_EXPLAIN[i] || null) : null;
}
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

/* C you.h `:317–320` — pronoun_gender() flag masks. */
export const PRONOUN_NORMAL = 0; /* none of the below */
export const PRONOUN_NO_IT = 1;
export const PRONOUN_HALLU = 2;

/**
 * C ref: mondata.c pronoun_gender `:1188–1207` — index into
 * `role.c` genders[]. Lower animals and such are "it" even when seen;
 * hallucination yields a random one of the four (including "they").
 * PRONOUN_NO_IT overrides only the **visibility** test — a neuter or
 * non-humanoid monster still reports 2 ("it").
 * Note the Hallucination arm is checked first and burns `rn2(4)`
 * before either gate, so it is an RNG-visible call, not just wording.
 * @param {object} mtmp
 * @param {number} pg_flags PRONOUN_NO_IT | PRONOUN_HALLU
 * @returns {number} 0 male, 1 female, 2 neuter, 3 group
 */
export function pronoun_gender(mtmp, pg_flags) {
    const override_vis = ((pg_flags | 0) & PRONOUN_NO_IT) ? true : false;
    const hallu_rand = ((pg_flags | 0) & PRONOUN_HALLU) ? true : false;

    if (hallu_rand && Hallucination()) return rn2(4); /* 0..3 */
    if (!override_vis && !canspotmon(mtmp)) return 2;
    const ptr = mtmp?.data;
    if (!ptr || is_neuter(ptr)) return 2;
    return (humanoid(ptr) || ((ptr.geno | 0) & G_UNIQ)
            || type_is_pname(ptr)) ? (mtmp.female ? 1 : 0) : 2;
}

/** C you.h mhe `:322` — genders[pronoun_gender(mtmp, PRONOUN_HALLU)].he */
export function mhe(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_HALLU)].he;
}

/** C you.h mhim `:323`. */
export function mhim(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_HALLU)].him;
}

/** C you.h mhis `:324`. */
export function mhis(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his;
}

/**
 * C you.h noit_mhe `:326–327` — override "it" if the reason is lack of
 * visibility rather than neuter species. Still "it" for neuters and
 * non-humanoids, and still burns rn2(4) when hallucinating.
 */
export function noit_mhe(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_NO_IT | PRONOUN_HALLU)].he;
}

/** C you.h noit_mhim `:328–329`. */
export function noit_mhim(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_NO_IT | PRONOUN_HALLU)].him;
}

/** C you.h noit_mhis `:330–331`. */
export function noit_mhis(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_NO_IT | PRONOUN_HALLU)].his;
}

export { MALE, FEMALE, NEUTRAL, NUM_MGENDERS };
