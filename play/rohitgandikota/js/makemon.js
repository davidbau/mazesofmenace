// makemon.js — monster selection and creation.
// C ref: src/makemon.c
//
// rndmonst_adj() is the highest-volume function in the recorded corpus:
// 204,394 PRNG calls across the 44 public sessions. It is weighted reservoir
// sampling — one rn2(totalweight) per *eligible* monster — so the draw count
// depends on exactly which monsters pass the filters. Getting a filter wrong
// changes the number of draws, not just their values.

import { game } from './gstate.js';
import { ARM_BONUS } from './do_wear.js';
import { get_wormno, initworm, count_wsegs, place_worm_tail_randomly, worm_wire } from './worm.js';
import { newcham, mon_wire_cham } from './mon.js';
import { weight as weight_fn } from './invent.js';
import { rndghostname } from './do_name.js';
import { m_dowear } from './worn.js';
import { rn2, rnd, rn1, d } from './rng.js';
import {
    mons as MONS_INIT, PMNAMES, NUMMONS, MONSYMS, MSOUND, ATTKS, MFLAGS,
    MMFLAGS, LIMITS, STRAT, GROWNUPS,
} from './monst_data.js';
import { ONAMES, OCLASSES, SKILLS, MATERIALS } from './objects_data.js';
import { depth } from './dungeon.js';
import { next_ident, mksobj, mkobj, place_object, curse, rnd_class } from './mkobj.js';
import { sgn, isok } from './hacklib.js';
import { get_shop_item } from './shknam.js';
import { canspotmon, newsym } from './display.js';
import { attacktype, is_neuter, is_floater } from './mondata.js';
import { is_vampshifter } from './monst.js';
import { t_at } from './mon.js';
import { ACCESSIBLE, POOL, LAVAPOOL,
    BLCORNER, CROSSWALL, DELPHI, FODDERSHOP, HWALL, IS_DOOR, IS_WALL, M_AP_FURNITURE, M_AP_OBJECT, OBJ_AT, OBJ_MINVENT, SCORR, SDOOR, SHOPBASE, TDWALL, TLCORNER, TRWALL, TUWALL, TEMPLE, VAULT, ZOO, ROOMOFFSET, GP_ALLOW_U } from './const.js';
import { enexto_core } from './teleport.js';

// include/hack.h:1174-1175
const GP_CHECKSCARY = 0x00800000, GP_AVOID_MONPOS = 0x01000000;

// include/permonst.h:15,23
const NON_PM = -1;
const LOW_PM = NON_PM + 1;                 /* first monster in mons[] */
const SPECIAL_PM = PMNAMES.PM_LONG_WORM_TAIL;  /* [normal] < ~ < [special] */

// include/monflag.h — taken from the generated table, never written out by
// hand. There are two disjoint G_ families: the `geno` field bits (G_FREQ ..
// G_UNIQ) and the mvitals.mvflags bits (G_GENOD 0x02, G_EXTINCT 0x01). They
// overlap numerically — 0x0080 is G_SGROUP in the first family — so a
// hand-copied constant from the wrong family reads as a real flag and fails
// silently. See CLAUDE.md on hardcoded constants.
const {
    G_FREQ, G_NOGEN, G_HELL, G_NOHELL, G_UNIQ, G_SGROUP, G_LGROUP, G_IGNORE,
    G_GENOD, G_EXTINCT, G_NOCORPSE,
    M2_MALE, M2_FEMALE, M2_NEUTER, M2_HOSTILE, M2_PEACEFUL, M2_MINION,
    M2_GREEDY, M2_DOMESTIC, M2_STRONG,
    M3_WAITFORU, M3_CLOSE, M3_COVETOUS,
} = MFLAGS;
const G_GONE = G_GENOD | G_EXTINCT;

const { S_GOLEM, S_DRAGON, S_MIMIC, S_SPIDER, S_SNAKE, S_LIGHT, S_ELEMENTAL,
        S_EEL, S_LEPRECHAUN, S_JABBERWOCK, S_NYMPH, S_ORC, S_UNICORN, S_BAT,
        S_HUMAN, S_GIANT, S_WRAITH, S_LICH, S_MUMMY, S_QUANTMECH,
        S_DEMON, S_GNOME, S_ANGEL, S_HUMANOID, S_KOP, S_OGRE, S_TROLL,
        S_KOBOLD, S_CENTAUR, S_ZOMBIE, S_LIZARD } = MONSYMS;
const { MS_LEADER, MS_GUARDIAN, MS_NEMESIS, MS_PRIEST } = MSOUND;
const { AT_WEAP, AD_ANY } = ATTKS;

// include/global.h:411, include/align.h:22
const ALIGNWEIGHT = 4;
const A_NEUTRAL = 0;
const AM_NONE = 0, AM_LAWFUL = 4, AM_NEUTRAL = 2, AM_CHAOTIC = 1;

// include/global.h — MAXMONNO, the default per-species birth limit.
const { MAXMONNO, MAXMCLASSES, A_NONE } = LIMITS;

// include/hack.h — mmflags, makemon()'s behaviour switches. Re-exported so
// callers name them instead of writing bit literals.
export const {
    NO_MM_FLAGS, NO_MINVENT, MM_NOWAIT, MM_NOCOUNTBIRTH, MM_IGNOREWATER,
    MM_ADJACENTOK, MM_ANGRY, MM_NONAME, MM_EGD, MM_EPRI, MM_ESHK, MM_EMIN,
    MM_EDOG, MM_ASLEEP, MM_NOGRP, MM_NOTAIL, MM_MALE, MM_FEMALE, MM_NOMSG,
    MM_MINVIS,
} = MMFLAGS;

// include/mondata.h predicates, one line each as in C.
const is_golem = (ptr) => ptr.mlet === S_GOLEM;
export const is_male = (ptr) => (ptr.mflags2 & M2_MALE) !== 0;
export const is_female = (ptr) => (ptr.mflags2 & M2_FEMALE) !== 0;
const always_hostile = (ptr) => (ptr.mflags2 & M2_HOSTILE) !== 0;
const always_peaceful = (ptr) => (ptr.mflags2 & M2_PEACEFUL) !== 0;
const is_minion = (ptr) => (ptr.mflags2 & M2_MINION) !== 0;
const likes_gold = (ptr) => (ptr.mflags2 & M2_GREEDY) !== 0;
const is_domestic = (ptr) => (ptr.mflags2 & M2_DOMESTIC) !== 0;
const race_hostile = (ptr) => (ptr.mflags2 & (game.urace?.hatemask ?? 0)) !== 0;
const race_peaceful = (ptr) => (ptr.mflags2 & (game.urace?.lovemask ?? 0)) !== 0;
export const likes_gems = (ptr) => (ptr.mflags2 & MFLAGS.M2_JEWELS) !== 0;
const is_unicorn = (ptr) => ptr.mlet === S_UNICORN && likes_gems(ptr);
const is_demon = (ptr) => (ptr.mflags2 & MFLAGS.M2_DEMON) !== 0;
const is_ndemon = (ptr) =>
    is_demon(ptr) && (ptr.mflags2 & (MFLAGS.M2_LORD | MFLAGS.M2_PRINCE)) === 0;
const is_shapeshifter = (ptr) => (ptr.mflags2 & MFLAGS.M2_SHAPESHIFTER) !== 0;
const verysmall = (ptr) => ptr.msize < 1;        /* MZ_SMALL */
const nohands = (ptr) => (ptr.mflags1 & MFLAGS.M1_NOHANDS) !== 0;
const is_animal = (ptr) => (ptr.mflags1 & MFLAGS.M1_ANIMAL) !== 0;
const mindless = (ptr) => (ptr.mflags1 & MFLAGS.M1_MINDLESS) !== 0;
const { STRAT_WAITFORU, STRAT_CLOSE, STRAT_APPEARMSG } = STRAT;
const { M3_WAITMASK } = MFLAGS;
export const is_rider = (ptr) => ptr.pmidx === PMNAMES.PM_DEATH
                       || ptr.pmidx === PMNAMES.PM_FAMINE
                       || ptr.pmidx === PMNAMES.PM_PESTILENCE;
// src/mondata.c attacktype_fordmg() — is_armed(ptr) is attacktype(ptr, AT_WEAP)
/* attacktype lives in js/mondata.js, its C home (src/mondata.c:54). */
const is_armed = (ptr) => attacktype(ptr, AT_WEAP);

// include/monst.h:259-265
const monmax_difficulty = (levdif) => Math.trunc((levdif + (game.u?.ulevel ?? 0)) / 2);
const monmin_difficulty = (levdif) => Math.trunc(levdif / 6);
const montoostrong = (mndx, lev) => game.mons[mndx].difficulty > lev;
const montooweak = (mndx, lev) => game.mons[mndx].difficulty < lev;

/* level_difficulty() now lives in js/dungeon.js, where src/dungeon.c has it;
   import for the many uses below and re-export for existing importers. */
import { level_difficulty, Is_special } from './dungeon.js';
export { level_difficulty };

export function Inhell() {
    return game.dungeons?.[game.u?.uz?.dnum]?.flags?.hellish === true;
}

/* src/mon.c MON_AT() — a live monster on the square */
function m_at_mk(x, y) {
    const m = game.level?.monAt?.get(`${x},${y}`);
    return (m && m.mhp > 0) ? m : null;
}

// src/makemon.c:1593 uncommon()
function uncommon(mndx) {
    const m = game.mons[mndx];
    if (m.geno & (G_NOGEN | G_UNIQ))
        return true;
    if ((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GONE)
        return true;
    if (Inhell())
        return m.maligntyp > A_NEUTRAL;
    else
        return (m.geno & G_HELL) !== 0;
}

// src/makemon.c:1611 align_shift()
function align_shift(ptr) {
    /* src/makemon.c:1621 — a special level's own alignment overrides the
       dungeon's (the C caches Is_special() per move; the lookup here is
       cheap enough to do per call) */
    const slev = Is_special(game.u.uz);
    const dgnAlign = (slev ? slev.flags?.align
                           : game.dungeons?.[game.u?.uz?.dnum]?.flags?.align)
                     ?? AM_NONE;
    let alshift;

    switch (dgnAlign) {
    default:
    case AM_NONE:
        alshift = 0;
        break;
    case AM_LAWFUL:
        alshift = Math.trunc((ptr.maligntyp + 20) / (2 * ALIGNWEIGHT));
        break;
    case AM_NEUTRAL:
        alshift = Math.trunc((20 - Math.abs(ptr.maligntyp)) / ALIGNWEIGHT);
        break;
    case AM_CHAOTIC:
        alshift = Math.trunc((-(ptr.maligntyp - 20)) / (2 * ALIGNWEIGHT));
        break;
    }
    return alshift;
}

// src/makemon.c:1640 temperature_shift()
function temperature_shift(ptr) {
    /* level.flags.temperature is 0 on ordinary levels, so this contributes
       nothing there; the branch is kept so hot/cold levels behave as C does
       once pm_resistance lands. */
    if (!game.level?.flags?.temperature)
        return 0;
    return 0;
}

// src/makemon.c:1659 rndmonst_adj()
//
// Weighted reservoir sampling: each eligible monster with weight > 0 adds to
// totalweight and then draws rn2(totalweight). Monsters filtered out draw
// nothing, which is why the filters decide the call count.
export function rndmonst_adj(minadj, maxadj) {
    let ptr;
    let weight, totalweight, selected_mndx, zlevel, minmlev, maxmlev;

    zlevel = level_difficulty();
    minmlev = monmin_difficulty(zlevel) + minadj;
    maxmlev = monmax_difficulty(zlevel) + maxadj;
    const upper = false;      /* Is_rogue_level */
    const elemlevel = false;  /* In_endgame && !Is_astralevel */

    totalweight = 0;
    selected_mndx = NON_PM;

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; ++mndx) {
        ptr = game.mons[mndx];

        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev))
            continue;
        if (upper)      /* !isupper(monsym(ptr)) */
            continue;
        if (elemlevel)  /* wrong_elem_type(ptr) */
            continue;
        if (uncommon(mndx))
            continue;
        if (Inhell() && (ptr.geno & G_NOHELL))
            continue;

        weight = (ptr.geno & G_FREQ) + align_shift(ptr);
        weight += temperature_shift(ptr);
        if (weight < 0 || weight > 127)
            weight = 0;

        /* was unconditional, but if weight==0, rn2() < 0 always fails; also
           avoids rn2(0) while totalweight is still 0 */
        if (weight > 0) {
            totalweight += weight;
            if (rn2(totalweight) < weight)
                selected_mndx = mndx;
        }
    }

    if (selected_mndx === NON_PM || uncommon(selected_mndx))
        return null;
    return game.mons[selected_mndx];
}

// src/makemon.c:1651 rndmonst()
export function rndmonst() {
    return rndmonst_adj(0, 0);
}

// src/makemon.c:1755 mongen_order / mclass_maxf, built once per game.
//
// C sorts mongen_order with qsort() on (difficulty | mlet << 8). mons[] is
// already grouped by class and ascending in difficulty within a class, so the
// sort is very nearly the identity; JS's sort is stable, which keeps ties in
// their mons[] order — the same thing an already-sorted input gives qsort.
let mongen_order = null;
let mclass_maxf = null;

function init_mongen_order() {
    if (mongen_order)
        return;
    mongen_order = [];
    mclass_maxf = new Array(MAXMCLASSES).fill(0);
    for (let i = 0; i < NUMMONS; i++) {
        mongen_order[i] = i;
        const mlet = game.mons[i].mlet;
        const freq = game.mons[i].geno & G_FREQ;
        if (freq > mclass_maxf[mlet])
            mclass_maxf[mlet] = freq;
    }
    /* src/makemon.c:1823 — qsort over the FIRST SPECIAL_PM entries on
       (difficulty | mlet<<8). LOW_PM is 1, so slot 0 is never filled by the
       loop above; slicing from 0 dragged an `undefined` into the sort and
       JS's comparator then left the whole array in place, so mongen_order
       stayed the identity and mkclass walked the wrong species window. */
    const key = (i) => (game.mons[i].difficulty | (game.mons[i].mlet << 8));
    mongen_order[0] = 0;
    const head = mongen_order.slice(0, SPECIAL_PM).sort((a, b) => key(a) - key(b));
    for (let i = 0; i < SPECIAL_PM; i++)
        mongen_order[i] = head[i];
}

export function reset_mongen_order() {
    mongen_order = null;
    mclass_maxf = null;
}

const MONSi = (i) => mongen_order[i];

// src/makemon.c:1839 mk_gen_ok()
function mk_gen_ok(mndx, mvflagsmask, genomask) {
    const ptr = game.mons[mndx];
    if (game.mvitals[mndx].mvflags & mvflagsmask)
        return false;
    if (ptr.geno & genomask)
        return false;
    if (is_placeholder(ptr))
        return false;
    return true;
}

// include/mondata.h:147 — corpses of zombies and mummies use these as stand-ins.
const is_placeholder = (ptr) =>
    ptr.pmidx === PMNAMES.PM_ORC || ptr.pmidx === PMNAMES.PM_GIANT
    || ptr.pmidx === PMNAMES.PM_ELF || ptr.pmidx === PMNAMES.PM_HUMAN;

// src/makemon.c:1879 mkclass_aligned() — one of the several types in a class.
//
// The rn2(9) inside the candidate loop fires once per candidate considered, so
// the draw count depends on how many monsters share the class and pass the
// alignment filter. The rn2(2) early-break and the final rnd(num) are the other
// two draws.
export function mkclass_aligned(klass, spc, atyp) {
    let first, last, num = 0, k;
    const nums = new Array(SPECIAL_PM + 1).fill(0);
    const maxmlev = level_difficulty() >> 1;
    const gehennom = Inhell();
    let mv_mask, gn_mask;

    if (klass < 1 || klass >= MAXMCLASSES)
        return null;

    init_mongen_order();
    const zero_freq_for_entire_class = (mclass_maxf[klass] === 0);

    /* Assumption #1: monsters of a class are contiguous in mons[]. */
    for (first = LOW_PM; first < SPECIAL_PM; first++)
        if (game.mons[MONSi(first)].mlet === klass)
            break;
    if (first === SPECIAL_PM)
        return null;

    mv_mask = G_GONE;
    if ((spc & G_IGNORE) !== 0) {
        mv_mask = 0;
        spc &= ~G_IGNORE;
    }

    /* Assumption #2: they are in ascending order of strength. */
    for (last = first;
         last < SPECIAL_PM && game.mons[MONSi(last)].mlet === klass;
         last++) {
        if (atyp !== A_NONE && sgn(game.mons[MONSi(last)].maligntyp) !== sgn(atyp))
            continue;

        gn_mask = (G_NOGEN | G_UNIQ);
        if (rn2(9) || klass === S_LICH)
            gn_mask |= (gehennom ? G_NOHELL : G_HELL);
        gn_mask &= ~spc;

        if (mk_gen_ok(MONSi(last), mv_mask, gn_mask)) {
            if (num && montoostrong(MONSi(last), maxmlev)
                && game.mons[MONSi(last)].difficulty
                   > game.mons[MONSi(last - 1)].difficulty
                && rn2(2))
                break;
            if ((k = (game.mons[MONSi(last)].geno & G_FREQ)) > 0
                || (k = (zero_freq_for_entire_class ? 1 : 0)) > 0) {
                /* skew towards lower value monsters at lower exp levels */
                nums[MONSi(last)] = k + 1
                    - (adj_lev(game.mons[MONSi(last)]) > (game.u.ulevel * 2) ? 1 : 0);
                num += nums[MONSi(last)];
            }
        }
    }
    if (!num)
        return null;

    for (num = rnd(num); first < last; first++)
        if ((num -= nums[MONSi(first)]) <= 0)
            break;

    return nums[MONSi(first)] ? game.mons[MONSi(first)] : null;
}

// src/makemon.c:1872 mkclass()
export function mkclass(klass, spc) {
    return mkclass_aligned(klass, spc, A_NONE);
}

// src/mkobj.c:395 rndmonnum_adj() — Plan A is a level-appropriate common
// monster; the fallback paths are not ported yet.
export function rndmonnum_adj(minadj, maxadj) {
    const ptr = rndmonst_adj(minadj, maxadj);
    if (ptr)
        return monsndx(ptr);
    return NON_PM;
}

// src/mkobj.c:387 rndmonnum()
export function rndmonnum() {
    return rndmonnum_adj(0, 0);
}

// src/mon.c monsndx() — index of a permonst within mons[].
export function monsndx(ptr) {
    return ptr.pmidx !== undefined && typeof ptr.pmidx === 'number'
        ? ptr.pmidx
        : game.mons.indexOf(ptr);
}

// src/allmain.c:780 — newgame() seeds every mvitals entry from the species'
// permanent G_NOCORPSE bit. mvflags and geno share the 0x0010 bit but nothing
// else, so this does not collide with G_GENOD|G_EXTINCT.
export function reset_mvitals() {
    game.mvitals = Array.from({ length: NUMMONS + 1 }, (_, i) => ({
        mvflags: (MONS_INIT[i]?.geno ?? 0) & G_NOCORPSE,
        born: 0,
        died: 0,
    }));
}

// src/makemon.c:1542 mbirth_limit()
function mbirth_limit(mndx) {
    return mndx === PMNAMES.PM_NAZGUL ? 9
         : mndx === PMNAMES.PM_ERINYS ? 3
         : MAXMONNO;
}

// src/makemon.c:959 propagate() — birth accounting. Draws nothing, but it is
// what eventually sets G_EXTINCT, and G_EXTINCT is what removes a species from
// rndmonst_adj()'s eligible set. Skipping it keeps uniques eligible forever and
// silently changes the draw count of every later rndmonst_adj().
function propagate(mndx, tally, ghostly) {
    const mv = game.mvitals[mndx];
    const lim = mbirth_limit(mndx);
    const gone = (mv.mvflags & G_GONE) !== 0;
    const result = (mv.born < lim && !gone);

    /* if it's unique, don't ever make it again */
    if ((game.mons[mndx].geno & G_UNIQ) !== 0 && mndx !== PMNAMES.PM_HIGH_CLERIC)
        mv.mvflags |= G_EXTINCT;

    if (mv.born < 255 && tally && (!ghostly || result))
        mv.born++;
    if (mv.born >= lim
        && !(game.mons[mndx].geno & G_NOGEN)
        && !(mv.mvflags & G_EXTINCT))
        mv.mvflags |= G_EXTINCT;

    return result;
}

// src/makemon.c:2016 adj_lev() — the monster's effective level.
//
// Depends on u.ulevel, which C sets to 1 inside u_init_misc() *before* mklev()
// runs. Getting that ordering wrong shifts every monster's level and therefore
// newmonhp()'s dice.
export function adj_lev(ptr) {
    let tmp, tmp2;

    if (ptr.pmidx === PMNAMES.PM_WIZARD_OF_YENDOR) {
        tmp = ptr.mlevel + game.mvitals[PMNAMES.PM_WIZARD_OF_YENDOR].died;
        if (tmp > 49)
            tmp = 49;
        return tmp;
    }

    if ((tmp = ptr.mlevel) > 49)
        return 50; /* "special" demons/devils */
    tmp2 = (level_difficulty() - tmp);
    if (tmp2 < 0)
        tmp--; /* if mlevel > u.uz decrement tmp */
    else
        tmp += Math.trunc(tmp2 / 5); /* else increment 1 per five diff */

    tmp2 = (game.u.ulevel - ptr.mlevel); /* adjust vs. the player */
    if (tmp2 > 0)
        tmp += Math.trunc(tmp2 / 4);

    tmp2 = Math.trunc((3 * ptr.mlevel) / 2); /* crude upper limit */
    if (tmp2 > 49)
        tmp2 = 49;
    return (tmp > tmp2) ? tmp2 : (tmp > 0 ? tmp : 0);
}

// src/makemon.c:2233 golemhp()
function golemhp(type) {
    const P = PMNAMES;
    switch (type) {
    case P.PM_STRAW_GOLEM:   return 20;
    case P.PM_PAPER_GOLEM:   return 20;
    case P.PM_ROPE_GOLEM:    return 30;
    case P.PM_LEATHER_GOLEM: return 40;
    case P.PM_GOLD_GOLEM:    return 60;
    case P.PM_WOOD_GOLEM:    return 50;
    case P.PM_FLESH_GOLEM:   return 40;
    case P.PM_CLAY_GOLEM:    return 70;
    case P.PM_STONE_GOLEM:   return 100;
    case P.PM_GLASS_GOLEM:   return 80;
    case P.PM_IRON_GOLEM:    return 120;
    default:                 return 0;
    }
}

function In_endgame() {
    return game.dungeons?.[game.u?.uz?.dnum]?.dname === 'The Elemental Planes';
}

function is_home_elemental(/* ptr */) {
    /* only true in the endgame planes, which no public session reaches */
    return false;
}

// src/makemon.c:1012 newmonhp() — the monster's level and hit points.
export function newmonhp(mon, mndx) {
    const ptr = game.mons[mndx];
    let basehp = 0;

    mon.m_lev = adj_lev(ptr);
    if (is_golem(ptr)) {
        mon.mhpmax = mon.mhp = golemhp(mndx);
    } else if (is_rider(ptr)) {
        basehp = 10;
        mon.mhpmax = mon.mhp = d(basehp, 8);
    } else if (ptr.mlevel > 49) {
        mon.mhpmax = mon.mhp = 2 * (ptr.mlevel - 6);
        mon.m_lev = Math.trunc(mon.mhp / 4);
    } else if (ptr.mlet === S_DRAGON && mndx >= PMNAMES.PM_GRAY_DRAGON) {
        basehp = mon.m_lev;
        mon.mhpmax = mon.mhp = In_endgame() ? (8 * basehp)
                             : (4 * basehp + d(basehp, 4));
    } else if (!mon.m_lev) {
        basehp = 1;
        mon.mhpmax = mon.mhp = rnd(4);
    } else {
        basehp = mon.m_lev;
        mon.mhpmax = mon.mhp = d(basehp, 8);
        if (is_home_elemental(ptr))
            mon.mhpmax = (mon.mhp *= 3);
    }

    /* if d(X,8) rolled a 1 all X times, give a boost */
    if (mon.mhpmax === basehp) {
        mon.mhpmax += 1;
        mon.mhp = mon.mhpmax;
    }
}

// src/makemon.c:1573 peace_minded()
//
// Most monsters return before drawing anything; the two rn2() calls at the end
// only fire for co-aligned non-minions, which is why a level's worth of
// monsters usually shows no peace_minded entries in the log at all.
export function peace_minded(ptr) {
    const mal = ptr.maligntyp, ual = game.u.ualign.type;

    if (always_peaceful(ptr))
        return true;
    if (always_hostile(ptr))
        return false;
    if (ptr.msound === MS_LEADER || ptr.msound === MS_GUARDIAN)
        return true;
    if (ptr.msound === MS_NEMESIS)
        return false;
    if (ptr.pmidx === PMNAMES.PM_ERINYS)
        return !game.u.ualign.abuse;

    if (race_peaceful(ptr))
        return true;
    if (race_hostile(ptr))
        return false;

    /* hostile if its alignment differs from the player's */
    if (sgn(mal) !== sgn(ual))
        return false;

    /* negative monster hostile to player with Amulet */
    if (mal < A_NEUTRAL && game.u.uhave?.amulet)
        return false;

    /* minions are hostile to players that have strayed at all */
    if (is_minion(ptr))
        return game.u.ualign.record >= 0;

    const rec = game.u.ualign.record;
    return !!rn2(16 + (rec < -15 ? -15 : rec)) && !!rn2(2 + Math.abs(mal));
}

// src/makemon.c:900 mongets() — create otyp and hand it to the monster.
// The blessing/curse fixups below need object subsystems that are not ported;
// none of them draw, so the RNG stream is unaffected by their absence.
export function mongets(mtmp, otyp) {
    if (!otyp)
        return null;
    const otmp = mksobj(otyp, true, false);
    if (otmp)
        mpickobj(mtmp, otmp);
    return otmp;
}

// src/mon.c mpickobj() — returns true when otmp was freed by merging.
export function mpickobj(mtmp, otmp) {
    if (!mtmp.minvent) mtmp.minvent = [];
    mtmp.minvent.push(otmp);
    /* src/steal.c add_to_minv() — the object's where/ocarry move with it;
       obj_extract_self's OBJ_MINVENT arm depends on both. Stack merging
       (merged()) is not ported; each pickup keeps its own object. */
    otmp.where = OBJ_MINVENT;
    otmp.ocarry = mtmp;
    return false;
}

// src/makemon.c:589 m_initinv() — species-specific starting inventory.
//
// PORTED: the generic tail (the three draws every monster makes) and the
// branches that need nothing beyond mksobj(). The mlet switch's remaining arms
// are noted where they belong; each is reached only by a species that cannot
// yet be generated, and reaching one is recorded rather than approximated.
function m_initinv(mtmp) {
    const ptr = mtmp.data;

    switch (ptr.mlet) {
    case S_NYMPH:
        if (!rn2(2))
            mongets(mtmp, ONAMES.MIRROR);
        if (!rn2(2))
            mongets(mtmp, ONAMES.POT_OBJECT_DETECTION);
        break;
    case S_MUMMY:
        if (rn2(7))
            mongets(mtmp, ONAMES.MUMMY_WRAPPING);
        break;
    case S_LEPRECHAUN:
        mkmonmoney(mtmp, d(level_difficulty(), 30));
        break;
    case S_HUMAN:
        if (is_mercenary(ptr)) {
            /* src/makemon.c:603 — the mercenary armor kit */
            const mndx = monsndx(ptr);
            let mac = mndx === PMNAMES.PM_GUARD ? -1
                    : mndx === PMNAMES.PM_SOLDIER ? 3
                    : mndx === PMNAMES.PM_SERGEANT ? 0
                    : mndx === PMNAMES.PM_LIEUTENANT ? -2
                    : mndx === PMNAMES.PM_CAPTAIN ? -3
                    : mndx === PMNAMES.PM_WATCHMAN ? 3
                    : mndx === PMNAMES.PM_WATCH_CAPTAIN ? -2 : 0;
            let otmp = null;
            const add_ac = () => {
                if (otmp) mac += ARM_BONUS(otmp);
                otmp = null;
            };

            /* round 1: body armor */
            if (mac < -1 && rn2(5))
                otmp = mongets(mtmp, rn2(5) ? ONAMES.PLATE_MAIL
                                            : ONAMES.CRYSTAL_PLATE_MAIL);
            else if (mac < 3 && rn2(5))
                otmp = mongets(mtmp, rn2(3) ? ONAMES.SPLINT_MAIL
                                            : ONAMES.BANDED_MAIL);
            else if (rn2(5))
                otmp = mongets(mtmp, rn2(3) ? ONAMES.RING_MAIL
                                            : ONAMES.STUDDED_LEATHER_ARMOR);
            else
                otmp = mongets(mtmp, ONAMES.LEATHER_ARMOR);
            add_ac();
            /* round 2: helmets */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, ONAMES.HELMET);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, ONAMES.DENTED_POT);
            add_ac();
            /* round 3: shields */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, ONAMES.SMALL_SHIELD);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, ONAMES.LARGE_SHIELD);
            add_ac();
            /* round 4: boots */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, ONAMES.LOW_BOOTS);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, ONAMES.HIGH_BOOTS);
            add_ac();
            /* round 5: gloves + cloak */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, ONAMES.LEATHER_GLOVES);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, ONAMES.LEATHER_CLOAK);
            add_ac();

            if (mndx === PMNAMES.PM_WATCH_CAPTAIN) {
                ; /* better weapon rather than extra gear here */
            } else if (mndx === PMNAMES.PM_WATCHMAN) {
                if (rn2(3)) /* most watchmen carry a whistle */
                    mongets(mtmp, ONAMES.TIN_WHISTLE);
            } else if (mndx === PMNAMES.PM_GUARD) {
                const wh = mksobj(ONAMES.TIN_WHISTLE, true, false);
                curse(wh);
                mpickobj(mtmp, wh);
            } else { /* soldiers and their officers */
                if (!rn2(3))
                    mongets(mtmp, ONAMES.K_RATION);
                if (!rn2(2))
                    mongets(mtmp, ONAMES.C_RATION);
                if (mndx !== PMNAMES.PM_SOLDIER && !rn2(3))
                    mongets(mtmp, ONAMES.BUGLE);
            }
        } else if (ptr.msound === MSOUND.MS_PRIEST) {
            /* src/makemon.c:721 — the priest's robe, shield and purse */
            mongets(mtmp, rn2(7) ? ONAMES.ROBE
                                 : rn2(3) ? ONAMES.CLOAK_OF_PROTECTION
                                          : ONAMES.CLOAK_OF_MAGIC_RESISTANCE);
            mongets(mtmp, ONAMES.SMALL_SHIELD);
            mkmonmoney(mtmp, rn1(10, 20));
        } else {
            /* shopkeepers, monks, prisoners, Croesus: recorded */
            note_unported(`m_initinv mlet=${ptr.mlet}`);
        }
        break;
    case S_GIANT:
        if (monsndx(ptr) === PMNAMES.PM_MINOTAUR) {
            if (!rn2(8) || (game.in_mklev && false /* Is_earthlevel */))
                mongets(mtmp, ONAMES.WAN_DIGGING);
        } else if ((ptr.mflags2 & MFLAGS.M2_GIANT) !== 0) {
            /* src/makemon.c:743 — giants carry a handful of random gems */
            for (let cnt = rn2((mtmp.m_lev / 2) | 0); cnt; cnt--) {
                const gem = mksobj(rnd_class(ONAMES.DILITHIUM_CRYSTAL,
                                             ONAMES.LUCKSTONE - 1),
                                   false, false);
                gem.quan = rn1(2, 3);
                gem.owt = weight_fn(gem);
                mpickobj(mtmp, gem);
            }
        }
        break;
    case S_WRAITH:
        if (monsndx(ptr) === PMNAMES.PM_NAZGUL) {
            const ring = mksobj(ONAMES.RIN_INVISIBILITY, false, false);
            curse(ring);
            mpickobj(mtmp, ring);
        }
        break;
    case S_LICH:
        if (monsndx(ptr) === PMNAMES.PM_MASTER_LICH && !rn2(13)) {
            mongets(mtmp, rn2(7) ? ONAMES.ATHAME : ONAMES.WAN_NOTHING);
        } else if (monsndx(ptr) === PMNAMES.PM_ARCH_LICH && !rn2(3)) {
            const w = mksobj(rn2(3) ? ONAMES.ATHAME : ONAMES.QUARTERSTAFF,
                             true, rn2(13) ? false : true);
            if (w.spe < 2) w.spe = rnd(3);
            if (!rn2(4)) w.oerodeproof = 1;
            mpickobj(mtmp, w);
        }
        break;
    case S_QUANTMECH:
    case S_DEMON:
    case S_GNOME:
        /* Schroedinger's box, devil weapons, mine candles: recorded */
        note_unported(`m_initinv mlet=${ptr.mlet}`);
        break;
    default:
        break;
    }

    /* ordinary soldiers rarely have access to magic (or gold :-) */
    if (ptr.pmidx === PMNAMES.PM_SOLDIER && rn2(13))
        return;

    /* src/makemon.c:826-831 — the generic tail. These two draws happen for
       every monster regardless of species, and are the only RNG most
       level-generated monsters spend here. */
    if (mtmp.m_lev > rn2(50))
        mongets(mtmp, rnd_defensive_item(mtmp));
    if (mtmp.m_lev > rn2(100))
        mongets(mtmp, rnd_misc_item(mtmp));
    if (likes_gold(ptr) && !findgold(mtmp.minvent) && !rn2(5))
        mkmonmoney(mtmp, d(level_difficulty(), mtmp.minvent?.length ? 5 : 10));
}

/* src/muse.c:1216 rnd_item_gate — both pickers exit before drawing for a
   monster that cannot use items. */
function rnd_item_ineligible(mtmp) {
    const pm = mtmp.data;
    return is_animal(pm) || attacktype(pm, ATTKS.AT_EXPL)
        || (pm.mflags1 & MFLAGS.M1_MINDLESS) !== 0
        || pm.mlet === MONSYMS.S_GHOST || pm.mlet === MONSYMS.S_KOP;
}

// src/muse.c:1222 rnd_defensive_item() — the escape/heal item a monster is
// born carrying.
function rnd_defensive_item(mtmp) {
    const O = ONAMES;
    const difficulty = game.mons[monsndx(mtmp.data)].difficulty;
    let trycnt = 0;

    if (rnd_item_ineligible(mtmp))
        return 0;
    for (;;) {
        switch (rn2(8 + (difficulty > 3 ? 1 : 0) + (difficulty > 6 ? 1 : 0)
                    + (difficulty > 8 ? 1 : 0))) {
        case 6:
        case 9:
            if (game.level?.flags?.noteleport && ++trycnt < 2)
                continue; /* try_again */
            if (!rn2(3))
                return O.WAN_TELEPORTATION;
            /*FALLTHRU*/
        case 0:
        case 1:
            return O.SCR_TELEPORTATION;
        case 8:
        case 10:
            if (!rn2(3))
                return O.WAN_CREATE_MONSTER;
            /*FALLTHRU*/
        case 2:
            return O.SCR_CREATE_MONSTER;
        case 3:
            return O.POT_HEALING;
        case 4:
            return O.POT_EXTRA_HEALING;
        case 5:
            return (mtmp.mnum !== PMNAMES.PM_PESTILENCE) ? O.POT_FULL_HEALING
                                                         : O.POT_SICKNESS;
        case 7: /* wand of digging */
            /* usually avoid digging in Sokoban */
            if (game.level?.flags?.sokoban_rules && rn2(4))
                continue; /* try_again */
            /* some creatures shouldn't dig down when hurt */
            if (is_floater(mtmp.data) || mtmp.isshk || mtmp.isgd
                || mtmp.ispriest)
                return 0;
            return O.WAN_DIGGING;
        }
    }
}

// src/muse.c:2654 rnd_misc_item()
function rnd_misc_item(mtmp) {
    const O = ONAMES;
    const difficulty = game.mons[monsndx(mtmp.data)].difficulty;

    if (rnd_item_ineligible(mtmp))
        return 0;
    /* only weak monsters carry the strengthening items */
    if (difficulty < 6 && !rn2(30))
        return rn2(6) ? O.POT_POLYMORPH : O.WAN_POLYMORPH;

    if (!rn2(40) && !nonliving_mm(mtmp.data) && !is_vampshifter(mtmp))
        return O.AMULET_OF_LIFE_SAVING;

    switch (rn2(3)) {
    case 0:
        if (mtmp.isgd)
            return 0;
        return rn2(6) ? O.POT_SPEED : O.WAN_SPEED_MONSTER;
    case 1:
        if (mtmp.mpeaceful && !game.u.uprops?.SEE_INVIS)
            return 0;
        return rn2(6) ? O.POT_INVISIBILITY : O.WAN_MAKE_INVISIBLE;
    case 2:
        return O.POT_GAIN_LEVEL;
    }
    return 0;
}

/* include/mondata.h:220 nonliving() — undead, Manes, golems, vortices. */
const nonliving_mm = (ptr) =>
    (ptr.mflags2 & MFLAGS.M2_UNDEAD) !== 0
    || ptr === game.mons[PMNAMES.PM_MANES]
    || ptr.mlet === MONSYMS.S_GOLEM
    || ptr.mlet === MONSYMS.S_VORTEX;

function findgold(minvent) {
    return (minvent || []).some(o => o.oclass === OCLASSES.COIN_CLASS);
}

// src/mon.c mkmonmoney()
// src/makemon.c:576 mkmonmoney() — a REAL gold object goes into minvent
// (mksobj draws its next_ident), not just a counter.
export function mkmonmoney(mtmp, amount) {
    if (amount > 0) {
        const gold = mksobj(ONAMES.GOLD_PIECE, false, false);
        gold.quan = amount;
        mpickobj(mtmp, gold);
        mtmp.mgold = (mtmp.mgold || 0) + amount;
    }
}

// Reached-but-unported sites, surfaced by tooling rather than papered over
// with an invented draw. See docs/plan/STATUS.md.
function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/mon.c m_at() / MON_AT(). C keeps svl.level.monsters[x][y] for the
// positional lookup and the fmon chain for iteration; js/game.js already owns
// `level.monsters` as the chain, so the grid lives alongside it as `monAt`.
function m_at(x, y) {
    return game.level?.monAt?.get(`${x},${y}`) ?? null;
}

// src/steed.c:898 place_monster() — position plus the positional grid. The
// impossible() diagnostics are omitted; they report corruption and draw nothing.
export function place_monster(mtmp, x, y) {
    mtmp.mx = x;
    mtmp.my = y;
    (game.level.monAt ||= new Map()).set(`${x},${y}`, mtmp);
}

// include/rm.h:534 remove_monster() — clears the grid slot only. A mover that
// writes mx/my directly instead of pairing these two leaves the grid pointing
// at the monster's old square, and since m_at() is what mfndpos() counts with,
// the monster then sees the wrong number of free squares and draws rn2 on a
// different modulus.
export function remove_monster(x, y) {
    game.level.monAt?.delete(`${x},${y}`);
}

// src/teleport.c goodpos() — can this monster stand here?
//
// The only draw is the S_EEL rn2(13). Everything else is terrain and occupancy,
// so a wrong answer costs a whole extra rndmonst() block (9 draws) rather than
// a single call — which is exactly how a mis-ported goodpos announces itself.
export function goodpos(x, y, mtmp, gpflags = 0) {
    /* src/teleport.c:86 — C's third argument is a struct monst *, and it does
       `mdat = mtmp->data` inside the `if (mtmp)` block. This took a permonst
       directly, which made two of C's tests inexpressible: the identity test
       that lets a monster be placed back at its OWN square, and the wormno
       test that overrides it for long worms, whose every segment answers
       m_at(). Callers now pass a monster (enexto_core builds the fakemon C
       builds); mdat is derived here. */
    const ptr = mtmp?.data || null;
    const ignorewater = (gpflags & MM_IGNOREWATER) !== 0;

    if (!isok(x, y))
        return false;

    /* src/teleport.c:107 — the hero's own square is rejected only when
       GP_ALLOW_U is absent, and even then not for the hero, the engulfer
       holding you, or your steed. C's comment says why the guard exists: the
       same function relocates engravings and objects, which CAN be
       co-located with you. This rejected u.ux/u.uy unconditionally. */
    if (!(gpflags & GP_ALLOW_U)) {
        if (game.u.ux === x && game.u.uy === y
            && ptr !== game.youmonst
            && (ptr !== game.u.ustuck || !game.u.uswallow)
            && (!game.u.usteed || ptr !== game.u.usteed))
            return false;
    }
    /* src/teleport.c:114 — `if (MON_AT(x, y) && avoid_monpos) return FALSE;`
       The monster test is CONDITIONAL on GP_AVOID_MONPOS. Rejecting an
       occupied square unconditionally, as this did, makes every caller that
       does NOT pass that flag reject squares C accepts. */
    if (m_at(x, y) && (gpflags & GP_AVOID_MONPOS))
        return false;

    const loc = game.level?.at(x, y);
    if (!loc)
        return false;

    if (mtmp) {
        /* src/teleport.c:130 — a monster may be placed back in its own
           location. m_at() returning the SAME monster is fine, except for a
           long worm, where every segment answers m_at() and the head may be
           elsewhere. */
        const mtmp2 = m_at(x, y);
        if (mtmp2 && (mtmp2 !== mtmp || mtmp.wormno))
            return false;

        if (loc.typ === POOL && !ignorewater) {
            return is_swimmer(ptr);
        } else if (ptr.mlet === S_EEL && rn2(13) && !ignorewater) {
            return false;
        } else if (loc.typ === LAVAPOOL) {
            return false;
        }
        if (passes_walls(ptr) && may_passwall(x, y))
            return true;
    }
    if (!ACCESSIBLE(loc.typ))
        return false;
    /* src/teleport.c also rejects boulder squares for non-rock-throwers;
       sobj_at() is not ported, so that rejection cannot be evaluated yet. */
    return true;
}

const is_swimmer = (ptr) => (ptr.mflags1 & MFLAGS.M1_SWIM) !== 0;
const passes_walls = (ptr) => (ptr.mflags1 & MFLAGS.M1_WALLWALK) !== 0;
const may_passwall = () => false;   /* needs level.flags.noteleport wall data */

// src/quest.c quest_info() — the quest leader/nemesis for the hero's role.
// Both are G_NOGEN, so neither can appear from rndmonst(); the lookups exist so
// the gender branches read as C does.
const quest_info_leader = () => pmIndexOf(game.urole?.ldrnum);
const quest_info_nemesis = () => pmIndexOf(game.urole?.neminum);
function pmIndexOf(name) {
    if (typeof name === 'number') return name;
    return (name && PMNAMES[name] !== undefined) ? PMNAMES[name] : NON_PM;
}

// src/align.c set_malign() — recomputes malign from peacefulness. No draw.
export function set_malign(mtmp) {
    const mal = mtmp.data.maligntyp;
    const coaligned = (sgn(mal) === sgn(game.u.ualign.type));

    if (mtmp.data.msound === MS_LEADER) {
        mtmp.malign = -20;
    } else if (mal === A_NONE_VALUE) {
        mtmp.malign = mtmp.mpeaceful ? 0 : 20;
    } else if (coaligned) {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful ? -3 * Math.max(5 - absmal, 1)
                                     : Math.max(5 - absmal, 1);
    } else {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful ? 0 : Math.max(20 - absmal, 6);
    }
}
const A_NONE_VALUE = -128;   /* include/align.h A_NONE */

// src/mkobj.c mkobj_at() — used by the S_SPIDER/S_SNAKE arm of makemon().
function mkobj_at(oclass, x, y, artif) {
    const otmp = mkobj(oclass, artif);
    place_object(otmp, x, y);
    return otmp;
}

// src/mon.c hideunder() — positional only during mklev (seeit is 0), no draw.
export function hideunder(mtmp) {
    mtmp.mundetected = 0;
}

// The remaining makemon() callees all draw, and none can be reached by a
// monster that rndmonst() can currently produce. Each records itself rather
// than inventing a draw, so `game.unported` names the exact next thing to port.
/* src/makemon.c:2385 syms[] — the classes a mimic can imitate. The two
   leading MAXOCLASSES and two trailing S_MIMIC_DEF entries are weighting, and
   the shop arm's `rn2(SIZE(syms) - 2) + 2` deliberately skips the leading
   pair, so the table's exact length is part of two different moduli. */
const mimic_syms = [
    OCLASSES.MAXOCLASSES,      OCLASSES.MAXOCLASSES,
    OCLASSES.RING_CLASS,       OCLASSES.WAND_CLASS,   OCLASSES.WEAPON_CLASS,
    OCLASSES.FOOD_CLASS,       OCLASSES.COIN_CLASS,   OCLASSES.SCROLL_CLASS,
    OCLASSES.POTION_CLASS,     OCLASSES.ARMOR_CLASS,  OCLASSES.AMULET_CLASS,
    OCLASSES.TOOL_CLASS,       OCLASSES.ROCK_CLASS,   OCLASSES.GEM_CLASS,
    OCLASSES.SPBOOK_CLASS,     MONSYMS.S_MIMIC_DEF,   MONSYMS.S_MIMIC_DEF,
];

// src/makemon.c:2393 set_mimic_sym() — decide what a new mimic looks like.
//
// This was a note_unported stub, and it is reached by every mimic mkshobj_at
// places on a shop square, which is where the 36-position shop-stocking
// residual came from. The draws are heavily branch-dependent, so the order of
// the tests matters as much as the tests themselves.
//
// Only the arms reachable from ordinary level generation are ported; the maze,
// Delphi and rogue-level arms are recorded rather than faked.
export function set_mimic_sym(mtmp) {
    if (!mtmp)
        return;

    const mx = mtmp.mx, my = mtmp.my;
    const lev = game.level.at(mx, my);
    const typ = lev?.typ;
    const roomno = (lev?.roomno ?? 0) - ROOMOFFSET;
    const rt = (roomno >= 0) ? (game.level.rooms[roomno]?.rtype ?? 0) : 0;
    let ap_type, appear, s_sym = null;

    if (OBJ_AT(mx, my)) {
        ap_type = M_AP_OBJECT;
        appear = game.level.objects.find((o) => o.ox === mx && o.oy === my).otyp;
    } else if (IS_DOOR(typ) || IS_WALL(typ) || typ === SDOOR || typ === SCORR) {
        ap_type = M_AP_FURNITURE;
        const w = mx !== 0 ? game.level.at(mx - 1, my)?.typ : undefined;
        const connects = w === HWALL || w === TLCORNER || w === TRWALL
                      || w === BLCORNER || w === TDWALL || w === CROSSWALL
                      || w === TUWALL;
        appear = connects ? MONSYMS.S_hcdoor : MONSYMS.S_vcdoor;
    } else if (game.level.flags.is_maze_lev) {
        note_unported('set_mimic_sym:maze');
        return;
    } else if (roomno < 0 && !t_at(mx, my)) {
        ap_type = M_AP_OBJECT;
        appear = ONAMES.BOULDER;
    } else if (rt === ZOO || rt === VAULT) {
        ap_type = M_AP_OBJECT;
        appear = ONAMES.GOLD_PIECE;
    } else if (rt === DELPHI) {
        note_unported('set_mimic_sym:delphi');
        return;
    } else if (rt === TEMPLE) {
        ap_type = M_AP_FURNITURE;
        appear = MONSYMS.S_altar;
    } else if (rt >= SHOPBASE) {
        if (rn2(10) >= depth(game.u.uz)) {
            s_sym = MONSYMS.S_MIMIC_DEF;        /* -> STRANGE_OBJECT */
        } else {
            s_sym = get_shop_item(rt - SHOPBASE);
            if (s_sym < 0) {
                ap_type = M_AP_OBJECT;
                appear = -s_sym;
                s_sym = null;
            } else if (rt === FODDERSHOP && s_sym > OCLASSES.MAXOCLASSES) {
                ap_type = M_AP_OBJECT;
                appear = rn2(2) ? ONAMES.LUMP_OF_ROYAL_JELLY
                                : ONAMES.SLIME_MOLD;
                s_sym = null;
            } else if (s_sym === OCLASSES.RANDOM_CLASS
                       || s_sym >= OCLASSES.MAXOCLASSES) {
                s_sym = mimic_syms[rn2(mimic_syms.length - 2) + 2];
            }
        }
    } else {
        s_sym = mimic_syms[rn2(mimic_syms.length)];     /* ROLL_FROM */
    }

    if (s_sym !== null) {           /* the `assign_sym` label in the C */
        if (s_sym === OCLASSES.MAXOCLASSES) {
            const furnsyms = [
                MONSYMS.S_upstair, MONSYMS.S_upstair,
                MONSYMS.S_dnstair, MONSYMS.S_dnstair,
                MONSYMS.S_altar, MONSYMS.S_grave,
                MONSYMS.S_throne, MONSYMS.S_sink,
            ];
            ap_type = M_AP_FURNITURE;
            appear = furnsyms[rn2(furnsyms.length)];    /* ROLL_FROM */
        } else {
            ap_type = M_AP_OBJECT;
            if (s_sym === MONSYMS.S_MIMIC_DEF) {
                appear = ONAMES.STRANGE_OBJECT;
            } else if (s_sym === OCLASSES.COIN_CLASS) {
                appear = ONAMES.GOLD_PIECE;
            } else {
                /* C frees this object again; only its otyp is kept */
                appear = mkobj(s_sym, false).otyp;
            }
        }
    }

    mtmp.m_ap_type = ap_type;
    mtmp.mappearance = appear;

    /* an object based on a monster type needs a shape picked for it */
    if (ap_type === M_AP_OBJECT
        && (appear === ONAMES.STATUE || appear === ONAMES.FIGURINE
            || appear === ONAMES.CORPSE || appear === ONAMES.EGG
            || appear === ONAMES.TIN)) {
        let mndx = rndmonnum();
        const nocorpse = (game.mvitals?.[mndx]?.mvflags & G_NOCORPSE) !== 0;

        if (appear === ONAMES.CORPSE && nocorpse)
            mndx = rn1(PMNAMES.PM_WIZARD - PMNAMES.PM_ARCHEOLOGIST + 1,
                       PMNAMES.PM_ARCHEOLOGIST);
        else if (appear === ONAMES.EGG || (appear === ONAMES.TIN && nocorpse))
            note_unported('set_mimic_sym:can_be_hatched');
        mtmp.mcorpsenm = mndx;
    } else if (ap_type === M_AP_OBJECT && appear === ONAMES.SLIME_MOLD) {
        mtmp.mcorpsenm = game.context.current_fruit;
    } else if (ap_type === M_AP_FURNITURE && appear === MONSYMS.S_altar) {
        note_unported('set_mimic_sym:altar_align');
        rn2(3);                 /* algn = rn2(3) - 1; the draw is spent */
    }
}
// src/makemon.c:79 m_initgrp() — populate a monster's birth group. rnd(n)
// first, the low-level swarm reduction, then one enexto_gpflags (which
// draws collect_coords shuffles) + makemon per member. peace_minded()
// members are simply skipped.
function m_initgrp(mtmp, x, y, n, mmflags) {
    let cnt = rnd(n);

    /* Tuning: cut down on swarming at low character levels [mrs] */
    cnt = Math.trunc(cnt / ((game.u.ulevel < 3) ? 4
                            : (game.u.ulevel < 5) ? 2 : 1));
    if (!cnt)
        cnt++;

    const mm = { x, y };
    while (cnt--) {
        if (peace_minded(mtmp.data))
            continue;
        /* Don't create groups of peaceful monsters since they'll get
         * in our way.  If the monster has a percentage chance so some
         * are peaceful and some are not, the result will just be a
         * smaller group.
         */
        if (enexto_core(mm, mm.x, mm.y, mtmp.data,
                        GP_CHECKSCARY | mmflags, goodpos)
            || enexto_core(mm, mm.x, mm.y, mtmp.data, mmflags, goodpos)) {
            const mon = makemon(mtmp.data, mm.x, mm.y, (mmflags | MM_NOGRP));
            if (mon) {
                mon.mpeaceful = false;
                mon.mavenge = 0;
                set_malign(mon);
            }
        }
    }
}

/* include/makemon.h m_initsgrp()/m_initlgrp() */
function m_initsgrp(mtmp, x, y, mmf) { m_initgrp(mtmp, x, y, 3, mmf); }
function m_initlgrp(mtmp, x, y, mmf) { m_initgrp(mtmp, x, y, 10, mmf); }
function can_saddle(mtmp) { return mtmp.data.msize >= 2; /* MZ_MEDIUM */ }

/* m_dowear() now lives in js/worn.js, its C home (src/worn.c:757). The copy
   that stood here short-circuited on an empty minvent and recorded otherwise;
   the real one does the slot walk. */

// include/mondata.h — the predicates m_initweap() branches on.
const humanoid = (ptr) => (ptr.mflags1 & MFLAGS.M1_HUMANOID) !== 0;
const is_elf = (ptr) => (ptr.mflags2 & MFLAGS.M2_ELF) !== 0;
const is_dwarf = (ptr) => (ptr.mflags2 & MFLAGS.M2_DWARF) !== 0;
const is_mercenary = (ptr) => (ptr.mflags2 & MFLAGS.M2_MERC) !== 0;
const extra_nasty = (ptr) => (ptr.mflags2 & MFLAGS.M2_NASTY) !== 0;
const strongmonst = (ptr) => (ptr.mflags2 & M2_STRONG) !== 0;
const is_lord = (ptr) => (ptr.mflags2 & MFLAGS.M2_LORD) !== 0;
const is_prince = (ptr) => (ptr.mflags2 & MFLAGS.M2_PRINCE) !== 0;

// src/quest.c — true when this monster stands in for the given role's quest
// guardian. Every such species is G_NOGEN, so rndmonst() cannot produce one.
const quest_mon_represents_role = () => false;

// src/makemon.c:481 m_initthrow() — a stack of missiles.
function m_initthrow(mtmp, otyp, oquan) {
    const otmp = mksobj(otyp, true, false);
    otmp.quan = rn1(oquan, 3);
    if (otyp === ONAMES.ORCISH_ARROW)
        otmp.opoisoned = true;
    mpickobj(mtmp, otmp);
}

// src/muse.c:2035 rnd_offensive_item()
function rnd_offensive_item(mtmp) {
    const O = ONAMES;
    const pm = mtmp.data;
    const difficulty = game.mons[monsndx(pm)].difficulty;

    if (rnd_item_ineligible(mtmp))
        return 0;
    if (difficulty > 7 && !rn2(35))
        return O.WAN_DEATH;
    switch (rn2(9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0))) {
    case 0: {
        const helm = which_armor_mm(mtmp);
        if (hard_helmet_mm(helm) || (pm.mflags1 & MFLAGS.M1_AMORPHOUS) !== 0
            || (pm.mflags1 & MFLAGS.M1_WALLWALK) !== 0
            || (pm.mflags1 & MFLAGS.M1_UNSOLID) !== 0)
            return O.SCR_EARTH;
    }
    /* FALLTHRU */
    case 1:
        return O.WAN_STRIKING;
    case 2:
        return O.POT_ACID;
    case 3:
        return O.POT_CONFUSION;
    case 4:
        return O.POT_BLINDNESS;
    case 5:
        return O.POT_SLEEPING;
    case 6:
        return O.POT_PARALYSIS;
    case 7:
    case 8:
        return O.WAN_MAGIC_MISSILE;
    case 9:
        return O.WAN_SLEEP;
    case 10:
        return O.WAN_FIRE;
    case 11:
        return O.WAN_COLD;
    case 12:
        return O.WAN_LIGHTNING;
    }
    return 0;
}

/* worn helm lookup + hard_helmet (do_wear.c:568), local slice for
   rnd_offensive_item; the noncorporeal test is folded into UNSOLID above
   (C checks both, and every noncorporeal permonst is also unsolid). */
function which_armor_mm(mtmp) {
    for (const o of (mtmp.minvent || []))
        if ((o.owornmask ?? 0) & W_ARMH_MM)
            return o;
    return null;
}
const W_ARMH_MM = 0x00000004; /* include/prop.h W_ARMH */
function hard_helmet_mm(obj) {
    if (!obj)
        return false;
    const oc = game.objects[obj.otyp];
    /* is_helmet && (is_metallic || is_crackable) */
    if (obj.oclass !== OCLASSES.ARMOR_CLASS || oc.oc_armcat !== 2 /* ARM_HELM */)
        return false;
    return (oc.oc_material >= MATERIALS.IRON
            && oc.oc_material <= MATERIALS.MITHRIL)
        || oc.oc_material === MATERIALS.GLASS;
}

// src/makemon.c:400 m_initweap() — species-specific weapons and armour.
//
// A long switch, but the RNG matters at every arm: the `default` case draws
// rnd(14 - 2*bias) for ordinary monsters, so `bias` — which is
// is_lord + 2*is_prince + extra_nasty — changes the argument, not just the
// branch taken.
function m_initweap(mtmp) {
    const ptr = mtmp.data;
    const mm = monsndx(ptr);
    const P = PMNAMES, O = ONAMES;
    let otmp, bias, w1, w2;

    if (game.level?.flags?.is_rogue_level)
        return;

    switch (ptr.mlet) {
    case S_GIANT:
        if (rn2(2))
            mongets(mtmp, (mm !== P.PM_ETTIN) ? O.BOULDER : O.CLUB);
        if ((mm !== P.PM_ETTIN) && !rn2(5))
            mongets(mtmp, rn2(2) ? O.TWO_HANDED_SWORD : O.BATTLE_AXE);
        break;

    case S_HUMAN:
        if (is_mercenary(ptr)) {
            w1 = w2 = 0;
            switch (mm) {
            case P.PM_WATCHMAN:
            case P.PM_SOLDIER:
                if (!rn2(3)) {
                    do {
                        w1 = rn1(O.BEC_DE_CORBIN - O.PARTISAN + 1, O.PARTISAN);
                    } while (game.objects[w1].oc_subtyp !== SKILLS.P_POLEARMS);
                    w2 = rn2(2) ? O.DAGGER : O.KNIFE;
                } else {
                    w1 = rn2(2) ? O.SPEAR : O.SHORT_SWORD;
                }
                break;
            case P.PM_SERGEANT:
                w1 = rn2(2) ? O.FLAIL : O.MACE;
                break;
            case P.PM_LIEUTENANT:
                w1 = rn2(2) ? O.BROADSWORD : O.LONG_SWORD;
                break;
            case P.PM_CAPTAIN:
            case P.PM_WATCH_CAPTAIN:
                w1 = rn2(2) ? O.LONG_SWORD : O.SILVER_SABER;
                break;
            default:
                if (!rn2(4)) w1 = O.DAGGER;
                if (!rn2(7)) w2 = O.SPEAR;
                break;
            }
            if (w1) mongets(mtmp, w1);
            if (!w2 && w1 !== O.DAGGER && !rn2(4)) w2 = O.KNIFE;
            if (w2) mongets(mtmp, w2);
        } else if (is_elf(ptr)) {
            if (rn2(2))
                mongets(mtmp, rn2(2) ? O.ELVEN_MITHRIL_COAT : O.ELVEN_CLOAK);
            if (rn2(2)) mongets(mtmp, O.ELVEN_LEATHER_HELM);
            else if (!rn2(4)) mongets(mtmp, O.ELVEN_BOOTS);
            if (rn2(2)) mongets(mtmp, O.ELVEN_DAGGER);
            switch (rn2(3)) {
            case 0:
                if (!rn2(4)) mongets(mtmp, O.ELVEN_SHIELD);
                if (rn2(3)) mongets(mtmp, O.ELVEN_SHORT_SWORD);
                mongets(mtmp, O.ELVEN_BOW);
                m_initthrow(mtmp, O.ELVEN_ARROW, 12);
                break;
            case 1:
                mongets(mtmp, O.ELVEN_BROADSWORD);
                if (rn2(2)) mongets(mtmp, O.ELVEN_SHIELD);
                break;
            case 2:
                if (rn2(2)) {
                    mongets(mtmp, O.ELVEN_SPEAR);
                    mongets(mtmp, O.ELVEN_SHIELD);
                }
                break;
            default:
                break;
            }
            if (mm === P.PM_ELVEN_MONARCH) {
                if (rn2(3)) mongets(mtmp, O.PICK_AXE);
                if (!rn2(50)) mongets(mtmp, O.CRYSTAL_BALL);
            }
        } else if (ptr.msound === MS_PRIEST
                   || quest_mon_represents_role(ptr, P.PM_CLERIC)) {
            otmp = mksobj(O.MACE, false, false);
            otmp.spe = rnd(3);
            if (!rn2(2)) { otmp.cursed = 1; otmp.blessed = 0; }
            mpickobj(mtmp, otmp);
        } else if (mm === P.PM_NINJA) {
            mongets(mtmp, rn2(4) ? O.SHURIKEN : O.DART);
            mongets(mtmp, rn2(4) ? O.SHORT_SWORD : O.AXE);
        } else if (ptr.msound === MS_GUARDIAN) {
            switch (mm) {
            case P.PM_STUDENT: case P.PM_ATTENDANT: case P.PM_ABBOT:
            case P.PM_ACOLYTE: case P.PM_GUIDE: case P.PM_APPRENTICE:
                if (rn2(2)) mongets(mtmp, rn2(3) ? O.DAGGER : O.KNIFE);
                if (rn2(5))
                    mongets(mtmp, rn2(3) ? O.LEATHER_JACKET : O.LEATHER_CLOAK);
                if (rn2(3)) mongets(mtmp, rn2(3) ? O.LOW_BOOTS : O.HIGH_BOOTS);
                if (rn2(3)) mongets(mtmp, O.POT_HEALING);
                break;
            case P.PM_CHIEFTAIN: case P.PM_PAGE: case P.PM_ROSHI:
            case P.PM_WARRIOR:
                mongets(mtmp, rn2(3) ? O.LONG_SWORD : O.SHORT_SWORD);
                mongets(mtmp, rn2(3) ? O.CHAIN_MAIL : O.LEATHER_ARMOR);
                if (rn2(2)) mongets(mtmp, rn2(2) ? O.LOW_BOOTS : O.HIGH_BOOTS);
                if (!rn2(3)) mongets(mtmp, O.LEATHER_CLOAK);
                if (!rn2(3)) {
                    mongets(mtmp, O.BOW);
                    m_initthrow(mtmp, O.ARROW, 12);
                }
                break;
            case P.PM_HUNTER:
                mongets(mtmp, rn2(3) ? O.SHORT_SWORD : O.DAGGER);
                if (rn2(2))
                    mongets(mtmp, rn2(2) ? O.LEATHER_JACKET : O.LEATHER_ARMOR);
                mongets(mtmp, O.BOW);
                m_initthrow(mtmp, O.ARROW, 12);
                break;
            case P.PM_THUG:
                mongets(mtmp, O.CLUB);
                mongets(mtmp, rn2(3) ? O.DAGGER : O.KNIFE);
                if (rn2(2)) mongets(mtmp, O.LEATHER_GLOVES);
                mongets(mtmp, rn2(2) ? O.LEATHER_JACKET : O.LEATHER_ARMOR);
                break;
            case P.PM_NEANDERTHAL:
                mongets(mtmp, O.CLUB);
                mongets(mtmp, O.LEATHER_ARMOR);
                break;
            default:
                break;
            }
        }
        break;

    case S_ANGEL:
        if (humanoid(ptr)) {
            const typ = rn2(3) ? O.LONG_SWORD : O.SILVER_MACE;
            otmp = mksobj(typ, false, false);
            if ((!rn2(20) || is_lord(ptr))
                && sgn(ptr.maligntyp) === 1 /* A_LAWFUL */)
                note_unported('oname (Sunsword/Demonbane)');
            otmp.blessed = 1; otmp.cursed = 0;
            otmp.oerodeproof = true;
            otmp.spe = rn2(4);
            if (typ === O.SILVER_MACE) otmp.spe += 3;
            mpickobj(mtmp, otmp);

            otmp = mksobj(!rn2(4) || is_lord(ptr) ? O.SHIELD_OF_REFLECTION
                                                  : O.LARGE_SHIELD,
                          false, false);
            otmp.oerodeproof = true;
            otmp.spe = 0;
            mpickobj(mtmp, otmp);
        }
        break;

    case S_HUMANOID:
        if (mm === P.PM_HOBBIT) {
            switch (rn2(3)) {
            case 0: mongets(mtmp, O.DAGGER); break;
            case 1: mongets(mtmp, O.ELVEN_DAGGER); break;
            case 2:
                mongets(mtmp, O.SLING);
                m_initthrow(mtmp, !rn2(4) ? O.FLINT : O.ROCK, 6);
                break;
            default: break;
            }
            if (!rn2(10)) mongets(mtmp, O.ELVEN_MITHRIL_COAT);
            if (!rn2(10)) mongets(mtmp, O.DWARVISH_CLOAK);
        } else if (is_dwarf(ptr)) {
            if (rn2(7)) mongets(mtmp, O.DWARVISH_CLOAK);
            if (rn2(7)) mongets(mtmp, O.IRON_SHOES);
            if (!rn2(4)) {
                mongets(mtmp, O.DWARVISH_SHORT_SWORD);
                if (rn2(2)) {
                    mongets(mtmp, O.DWARVISH_MATTOCK);
                } else {
                    mongets(mtmp, rn2(2) ? O.AXE : O.DWARVISH_SPEAR);
                    mongets(mtmp, O.DWARVISH_ROUNDSHIELD);
                }
                mongets(mtmp, O.DWARVISH_IRON_HELM);
                if (!rn2(3)) mongets(mtmp, O.DWARVISH_MITHRIL_COAT);
            } else {
                mongets(mtmp, !rn2(3) ? O.PICK_AXE : O.DAGGER);
            }
        }
        break;

    case S_KOP:
        if (!rn2(4)) m_initthrow(mtmp, O.CREAM_PIE, 2);
        if (!rn2(3)) mongets(mtmp, rn2(2) ? O.CLUB : O.RUBBER_HOSE);
        break;

    case S_ORC: {
        if (rn2(2)) mongets(mtmp, O.ORCISH_HELM);
        const which = (mm !== P.PM_ORC_CAPTAIN) ? mm
                    : rn2(2) ? P.PM_MORDOR_ORC : P.PM_URUK_HAI;
        switch (which) {
        case P.PM_MORDOR_ORC:
            if (!rn2(3)) mongets(mtmp, O.SCIMITAR);
            if (!rn2(3)) mongets(mtmp, O.ORCISH_SHIELD);
            if (!rn2(3)) mongets(mtmp, O.KNIFE);
            if (!rn2(3)) mongets(mtmp, O.ORCISH_CHAIN_MAIL);
            break;
        case P.PM_URUK_HAI:
            if (!rn2(3)) mongets(mtmp, O.ORCISH_CLOAK);
            if (!rn2(3)) mongets(mtmp, O.ORCISH_SHORT_SWORD);
            if (!rn2(3)) mongets(mtmp, O.IRON_SHOES);
            if (!rn2(3)) {
                mongets(mtmp, O.ORCISH_BOW);
                m_initthrow(mtmp, O.ORCISH_ARROW, 12);
            }
            if (!rn2(3)) mongets(mtmp, O.URUK_HAI_SHIELD);
            break;
        default:
            if (mm !== P.PM_ORC_SHAMAN && rn2(2))
                mongets(mtmp, (mm === P.PM_GOBLIN || rn2(2) === 0)
                              ? O.ORCISH_DAGGER : O.SCIMITAR);
            break;
        }
        break;
    }

    case S_OGRE:
        if (!rn2(mm === P.PM_OGRE_TYRANT ? 3
                 : mm === P.PM_OGRE_LEADER ? 6 : 12))
            mongets(mtmp, O.BATTLE_AXE);
        else
            mongets(mtmp, O.CLUB);
        break;

    case S_TROLL:
        if (!rn2(2))
            switch (rn2(4)) {
            case 0: mongets(mtmp, O.RANSEUR); break;
            case 1: mongets(mtmp, O.PARTISAN); break;
            case 2: mongets(mtmp, O.GLAIVE); break;
            case 3: mongets(mtmp, O.SPETUM); break;
            default: break;
            }
        break;

    case S_KOBOLD:
        if (!rn2(4)) m_initthrow(mtmp, O.DART, 12);
        break;

    case S_CENTAUR:
        if (rn2(2)) {
            if (mm === P.PM_FOREST_CENTAUR) {
                mongets(mtmp, O.BOW);
                m_initthrow(mtmp, O.ARROW, 12);
            } else {
                mongets(mtmp, O.CROSSBOW);
                m_initthrow(mtmp, O.CROSSBOW_BOLT, 12);
            }
        }
        break;

    case S_WRAITH:
        mongets(mtmp, O.KNIFE);
        mongets(mtmp, O.LONG_SWORD);
        break;

    case S_ZOMBIE:
        if (!rn2(4)) mongets(mtmp, O.LEATHER_ARMOR);
        if (!rn2(4)) mongets(mtmp, rn2(3) ? O.KNIFE : O.SHORT_SWORD);
        break;

    case S_LIZARD:
        if (mm === P.PM_SALAMANDER)
            mongets(mtmp, rn2(7) ? O.SPEAR : rn2(3) ? O.TRIDENT : O.STILETTO);
        break;

    case S_DEMON:
        switch (mm) {
        case P.PM_BALROG:
            mongets(mtmp, O.BULLWHIP);
            mongets(mtmp, O.BROADSWORD);
            break;
        case P.PM_ORCUS: mongets(mtmp, O.WAN_DEATH); break;
        case P.PM_HORNED_DEVIL:
            mongets(mtmp, rn2(4) ? O.TRIDENT : O.BULLWHIP);
            break;
        case P.PM_DISPATER: mongets(mtmp, O.WAN_STRIKING); break;
        case P.PM_YEENOGHU: mongets(mtmp, O.FLAIL); break;
        default: break;
        }
        /* djinn and mail daemons stop here so they leave nothing behind */
        if (!is_demon(ptr))
            break;
        /* FALLTHRU */
    default:
        /* the general case: `bias` changes rnd()'s argument, not just the
           branch, so getting it wrong changes the value as well as the pick */
        bias = (is_lord(ptr) ? 1 : 0) + (is_prince(ptr) ? 2 : 0)
             + (extra_nasty(ptr) ? 1 : 0);
        switch (rnd(14 - (2 * bias))) {
        case 1:
            if (strongmonst(ptr)) mongets(mtmp, O.BATTLE_AXE);
            else m_initthrow(mtmp, O.DART, 12);
            break;
        case 2:
            if (strongmonst(ptr)) {
                mongets(mtmp, O.TWO_HANDED_SWORD);
            } else {
                mongets(mtmp, O.CROSSBOW);
                m_initthrow(mtmp, O.CROSSBOW_BOLT, 12);
            }
            break;
        case 3:
            mongets(mtmp, O.BOW);
            m_initthrow(mtmp, O.ARROW, 12);
            break;
        case 4:
            if (strongmonst(ptr)) mongets(mtmp, O.LONG_SWORD);
            else m_initthrow(mtmp, O.DAGGER, 3);
            break;
        case 5:
            if (strongmonst(ptr)) mongets(mtmp, O.LUCERN_HAMMER);
            else mongets(mtmp, O.AKLYS);
            break;
        default:
            break;
        }
        break;
    }

    if (mtmp.m_lev > rn2(75))
        mongets(mtmp, rnd_offensive_item(mtmp));
}

// src/makemon.c:1180 makemon()
//
// The RNG order for the common level-generation case — makemon(NULL, x, y,
// MM_NOGRP) from fill_ordinary_room — is exactly:
//   rndmonst()  ->  next_ident()  ->  newmonhp()  ->  [rn2(2) gender]
//   ->  [peace_minded]  ->  m_initinv()  ->  rn2(100) saddle
// Verified against seed8000 calls 1428-1441.
export function makemon(ptr, x, y, mmflags) {
    let mndx, mitem;
    const anymon = !ptr;
    let allow_minvent = ((mmflags & NO_MINVENT) === 0);
    const countbirth = ((mmflags & MM_NOCOUNTBIRTH) === 0);

    if (game.iflags?.debug_mongen || (!game.level?.flags?.rndmongen && !ptr))
        return null;

    /* src/makemon.c:1210 — when the caller asks for the hero's own square
       outside level generation, find a nearby spot instead. enexto_core()
       shuffles collect_coords()' rings, which is a substantial draw. */
    const byyou = (x === game.u.ux && y === game.u.uy);
    /* src/makemon.c:1162 — gpflags carries MM_IGNOREWATER THROUGH from
       the caller's mmflags; it is not just the two GP_ bits. A caller
       that passes MM_IGNOREWATER wants goodpos to accept water, and
       dropping it here makes those placements scan differently. Both this
       and cc are FUNCTION scoped in C; the MON_AT gate below uses them. */
    const gpflags = ((mmflags & MM_IGNOREWATER) ? MM_IGNOREWATER : 0)
                    | GP_CHECKSCARY | GP_AVOID_MONPOS;
    const cc = { x: 0, y: 0 };
    if (byyou && !game.in_mklev) {
        if (!enexto_core(cc, game.u.ux, game.u.uy, ptr, gpflags, goodpos)
            && !enexto_core(cc, game.u.ux, game.u.uy, ptr,
                            gpflags & ~GP_CHECKSCARY, goodpos))
            return null;
        x = cc.x; y = cc.y;
    }

    if (!isok(x, y))
        return null;

    /* src/makemon.c:1194 — a monster already standing there rejects the
       creation outright unless MM_ADJACENTOK lets enexto find a neighbour */
    if (m_at_mk(x, y)) {
        if (!(mmflags & MMFLAGS.MM_ADJACENTOK)
            || !enexto_core(cc, x, y, ptr, gpflags, goodpos))
            return null;
        x = cc.x; y = cc.y;
    }

    if (ptr) {
        mndx = monsndx(ptr);
        if (game.mvitals[mndx].mvflags & G_GENOD)
            return null;
    } else {
        /* make a random (common) monster that can survive here */
        let tryct = 0;
        do {
            if (!(ptr = rndmonst()))
                return null;
        } while (++tryct <= 50 && !goodpos(x, y, { data: ptr, wormno: 0 }));
        mndx = monsndx(ptr);
    }
    propagate(mndx, countbirth, false);

    const mtmp = {
        mx: 0, my: 0, m_lev: 0, mhp: 0, mhpmax: 0,
        /* C zeroes the whole struct (cg.zeromonst); movement in particular
           must start at 0, or movemon() lets the monster act on turn 1 when
           C makes it wait for its first allotment. */
        movement: 0, mspeed: 0,
        /* mux/muy are where the monster THINKS the hero is. set_apparxy()
           assigns them each turn and is not ported; until it is, they have to
           read as C's zeroed 0 rather than undefined, because monlineu() feeds
           them to online2() where undefined makes every delta NaN and `!dy`
           then answers true for EVERY square. */
        mux: 0, muy: 0,
        female: 0, msleeping: 0, mpeaceful: 0, mtame: 0,
        minvent: null, mgold: 0, data: ptr, mnum: mndx,
        cham: NON_PM, mstrategy: 0,
    };
    if (mmflags & MM_ASLEEP)
        mtmp.msleeping = 1;
    /* src/makemon.c:1249 — C prepends to fmon here, not in place_monster(), so
       the chain is newest-first and every iteration over it (movemon, the
       mcalcmove allotment loop) visits monsters in reverse creation order. */
    (game.level.monsters ||= []).unshift(mtmp);
    mtmp.m_id = next_ident();

    /* set up level and hit points */
    newmonhp(mtmp, mndx);

    const femaleok = (!is_male(ptr) && !is_neuter(ptr));
    const maleok = (!is_female(ptr) && !is_neuter(ptr));
    if (is_female(ptr) || ((mmflags & MM_FEMALE) !== 0 && femaleok))
        mtmp.female = 1;
    else if (is_male(ptr) || ((mmflags & MM_MALE) !== 0 && maleok))
        mtmp.female = 0;
    else if (ptr.msound === MS_LEADER && quest_info_leader() === mndx)
        mtmp.female = game.quest_ldrgend;
    else if (ptr.msound === MS_NEMESIS && quest_info_nemesis() === mndx)
        mtmp.female = game.quest_nemgend;
    else
        mtmp.female = femaleok ? rn2(2) : 0;

    place_monster(mtmp, x, y);
    mtmp.mcansee = mtmp.mcanmove = true;
    mtmp.mgenmklev = game.in_mklev;
    mtmp.mpeaceful = (mmflags & MM_ANGRY) ? false : peace_minded(ptr);

    switch (ptr.mlet) {
    case S_MIMIC:
        set_mimic_sym(mtmp);
        break;
    case S_SPIDER:
    case S_SNAKE:
        if (game.in_mklev) {
            if (x && y)
                mkobj_at(OCLASSES.RANDOM_CLASS, x, y, true);
            hideunder(mtmp);
        }
        break;
    case S_LIGHT:
    case S_ELEMENTAL:
        if (mndx === PMNAMES.PM_STALKER || mndx === PMNAMES.PM_BLACK_LIGHT) {
            mtmp.perminvis = true;
            mtmp.minvis = true;
        }
        break;
    case S_EEL:
        if (game.in_mklev)
            hideunder(mtmp);
        break;
    case S_LEPRECHAUN:
        mtmp.msleeping = 1;
        break;
    case S_JABBERWOCK:
    case S_NYMPH:
        if (rn2(5) && !game.u.uhave?.amulet)
            mtmp.msleeping = 1;
        break;
    case S_ORC:
        if (game.urace?.mnum === 'PM_ELF')
            mtmp.mpeaceful = false;
        break;
    case S_UNICORN:
        if (is_unicorn(ptr) && sgn(game.u.ualign.type) === sgn(ptr.maligntyp))
            mtmp.mpeaceful = true;
        break;
    case S_BAT:
        /* Inhell only; mon_adjust_speed draws nothing */
        break;
    default:
        break;
    }

    mitem = 0; /* STRANGE_OBJECT */
    if (mndx === PMNAMES.PM_VLAD_THE_IMPALER)
        mitem = ONAMES.CANDELABRUM_OF_INVOCATION;
    /* src/makemon.c:1374 — a ghost is NAMED at creation, and rndghostname()
       draws: rn2(7) to decide between the table and the hero's own name, then
       rn2(34) to pick from the table. The branch sits in the same else-if
       chain as the mitem assignments, so it is exclusive with them. */
    else if (mndx === PMNAMES.PM_GHOST && !(mmflags & MMFLAGS.MM_NONAME)) {
        /* christen_monst() copies the name onto the monster; no draw */
        mtmp.mname = rndghostname();
    }
    else if (mndx === PMNAMES.PM_CROESUS)
        mitem = ONAMES.TWO_HANDED_SWORD;
    else if (ptr.msound === MS_NEMESIS)
        mitem = ONAMES.BELL_OF_OPENING;
    else if (mndx === PMNAMES.PM_PESTILENCE)
        mitem = ONAMES.POT_SICKNESS;

    /* pm_to_cham()/newcham() and the Wizard-of-Yendor branch sit here in C;
       every species that reaches them is G_NOGEN or G_UNIQ and so cannot be
       produced by rndmonst() during ordinary level generation. */
    /* src/makemon.c:1355 — a shapechanger takes a starting form via
       newcham(); Vlad keeps his own shape for the Candelabrum */
    mtmp.cham = -1;
    if (is_shapeshifter(ptr)) {
        const mcham = mndx;    /* pm_to_cham: M2_SHAPESHIFTER means itself */
        mtmp.cham = mcham;
        mon_wire_cham({ newmonhp, rndmonst });
        if (mndx !== PMNAMES.PM_VLAD_THE_IMPALER
            && newcham(mtmp, null, 0))
            allow_minvent = false;
    } else if (mndx === PMNAMES.PM_WIZARD_OF_YENDOR) {
        note_unported(`makemon shapechanger/wizard mndx=${mndx}`);
    }

    if (mitem && allow_minvent)
        mongets(mtmp, mitem);

    if (game.in_mklev) {
        if ((is_ndemon(ptr) || mndx === PMNAMES.PM_WUMPUS
             || mndx === PMNAMES.PM_LONG_WORM || mndx === PMNAMES.PM_GIANT_EEL)
            && !game.u.uhave?.amulet && rn2(5))
            mtmp.msleeping = true;
    }

    /* src/makemon.c:1404 — a long worm grows a random tail at creation */
    if (mndx === PMNAMES.PM_LONG_WORM) {
        worm_wire(goodpos);
        if ((mtmp.wormno = get_wormno()) !== 0) {
            initworm(mtmp, !(mmflags & (MMFLAGS.MM_NOTAIL ?? 0)) ? rn2(5) : 0);
            if (count_wsegs(mtmp))
                place_worm_tail_randomly(mtmp, x, y);
        }
    }

    set_malign(mtmp);

    if (anymon && !(mmflags & MM_NOGRP)) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3))
                m_initlgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
            else
                m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        }
    }

    if (allow_minvent) {
        if (is_armed(ptr))
            m_initweap(mtmp);
        m_initinv(mtmp);
        m_dowear(mtmp, true);

        if (!rn2(100) && is_domestic(ptr) && can_saddle(mtmp))
            note_unported('put_saddle_on_mon');
    }

    if (ptr.mflags3 && !(mmflags & MM_NOWAIT)) {
        if (ptr.mflags3 & M3_WAITFORU)
            mtmp.mstrategy |= STRAT_WAITFORU;
        if (ptr.mflags3 & M3_CLOSE)
            mtmp.mstrategy |= STRAT_CLOSE;
        if (ptr.mflags3 & (M3_WAITMASK | M3_COVETOUS))
            mtmp.mstrategy |= STRAT_APPEARMSG;
    }

    return mtmp;
}

// src/makemon.c:2051 grow_up() — a pet levels up from a kill (or a wraith
// corpse/gain-level potion, which is the victim-less arm). Returns the
// monster's (possibly new) permonst, or null if it died growing.
//
// The draws: rnd(victim->m_lev + 1) for the max HP gain, then
// rn2(max_increase) when that is above 1. The genocided-growth death arm and
// the leash bookkeeping record.
export function grow_up(mtmp, victim) {
    if (mtmp.mhp <= 0)
        return null;

    let ptr = game.mons[mtmp.mnum];
    const oldtype = mtmp.mnum;
    let newtype = (oldtype === PMNAMES.PM_KILLER_BEE && !victim)
                  ? PMNAMES.PM_QUEEN_BEE : little_to_big(oldtype);

    let hp_threshold, lev_limit, max_increase, cur_increase;
    if (victim) {                       /* killed a monster */
        hp_threshold = mtmp.m_lev * 8;
        if (!mtmp.m_lev)
            hp_threshold = 4;
        else if (is_golem(ptr))
            hp_threshold = (Math.trunc(mtmp.mhpmax / 10) + 1) * 10 - 1;
        /* is_home_elemental needs the plane levels; not reachable */
        lev_limit = Math.trunc(3 * ptr.mlevel / 2);
        if (oldtype !== newtype && game.mons[newtype].mlevel > lev_limit)
            lev_limit = game.mons[newtype].mlevel;
        max_increase = rnd(victim.m_lev + 1);
        if (mtmp.mhpmax + max_increase > hp_threshold + 1)
            max_increase = Math.max((hp_threshold + 1) - mtmp.mhpmax, 0);
        cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;
    } else {
        max_increase = cur_increase = rnd(8);
        hp_threshold = 0;
        lev_limit = 50;
    }

    mtmp.mhpmax += max_increase;
    mtmp.mhp += cur_increase;
    if (mtmp.mhpmax <= hp_threshold)
        return ptr;                     /* doesn't gain a level */

    if (lev_limit < 5)
        lev_limit = 5;
    else if (lev_limit > 49)
        lev_limit = (ptr.mlevel > 49 ? 50 : 49);

    if (++mtmp.m_lev >= game.mons[newtype].mlevel && newtype !== oldtype) {
        ptr = game.mons[newtype];
        const fem = mtmp.female | 0;   /* gender forcing needs is_male/is_female flags */

        if ((game.mvitals?.[newtype]?.mvflags ?? 0) & G_GENOD) {
            note_unported_makemon('grow_up:genocided_growth');
            mtmp.mnum = newtype;
            mtmp.data = ptr;
            const { mondied } = mondied_ref();
            mondied(mtmp);
            return null;
        } else if (canspotmon(mtmp)) {
            /* pline_mon "%s grows up into %s." */
            note_unported_makemon('grow_up:growth_msg');
        }
        mtmp.mnum = newtype;
        mtmp.data = ptr;
        newsym(mtmp.mx, mtmp.my);      /* color may change */
        lev_limit = mtmp.m_lev;
        mtmp.female = fem;
    }

    /* sanity checks */
    if (mtmp.m_lev > lev_limit) {
        mtmp.m_lev--;
        if (mtmp.mhpmax === hp_threshold + 1)
            mtmp.mhpmax--;
    }
    if (mtmp.mhpmax > 50 * 8)
        mtmp.mhpmax = 50 * 8;
    if (mtmp.mhp > mtmp.mhpmax)
        mtmp.mhp = mtmp.mhpmax;

    return ptr;
}

// src/makemon.c little_to_big() — the GROWNUPS pairs from monst.c.
function little_to_big(montype) {
    for (const [littl, big] of GROWNUPS)
        if (littl === montype)
            return big;
    return montype;
}

/* js/mon.js imports from this file already; a static import back would be an
   eval-time cycle, so mondied is looked up at call time. */
function mondied_ref() {
    return { mondied: game._mondied_ref };
}

function note_unported_makemon(what) {
    (game.unported ||= new Set()).add(what);
}
