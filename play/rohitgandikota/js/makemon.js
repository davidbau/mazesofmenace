// makemon.js — monster selection and creation.
// C ref: src/makemon.c
//
// rndmonst_adj() is the highest-volume function in the recorded corpus:
// 204,394 PRNG calls across the 44 public sessions. It is weighted reservoir
// sampling — one rn2(totalweight) per *eligible* monster — so the draw count
// depends on exactly which monsters pass the filters. Getting a filter wrong
// changes the number of draws, not just their values.

import { mon_aligntyp } from './priest.js';
import { newemin } from './minion.js';
import { is_sword } from './wield.js';
import { is_mplayer } from './mondata.js';
import { game } from './gstate.js';
import { def_monsyms } from './drawing_data.js';
import { new_light_source, LS_OBJECT, LS_MONSTER } from './light.js';
import { ARM_BONUS } from './do_wear.js';
import { get_wormno, initworm, count_wsegs, place_worm_tail_randomly, worm_wire } from './worm.js';
import { newcham, mon_wire_cham } from './mon.js';
import { weight as weight_fn, sobj_at } from './invent.js';
import { In_mines, Is_rogue_level, MIGR_TO_SPECIES, OBJ_FREE,
         W_SADDLE, has_mgivenname, A_LAWFUL, ONAME_RANDOM } from './const.js';
import { Levitation, Flying, Protection_from_shape_changers } from './youprop.js';
import { closed_door } from './cmd.js';
import { may_passwall } from './hack.js';
import { sengr_at } from './engrave.js';
import { rndghostname, christen_monst, christen_orc, oname,
         y_monnam, Amonnam, upstart } from './do_name.js';
import { mhidden_description } from './pager.js';
import { Norep, set_msg_xy } from './pline.js';
import { vtense } from './objnam.js';
import { m_dowear, which_armor } from './worn.js';
import { can_saddle, put_saddle_on_mon } from './steed.js';
import { rn2, rnd, rn1, d } from './rng.js';
import {
    mons as MONS_INIT, PMNAMES, NUMMONS, MONSYMS, MSOUND, ATTKS, MFLAGS,
    MMFLAGS, LIMITS, STRAT, GROWNUPS,
} from './monst_data.js';
import { ONAMES, OCLASSES, SKILLS, MATERIALS } from './objects_data.js';
import { depth } from './dungeon.js';
import { next_ident, mksobj, mkobj, place_object, curse, rnd_class, can_be_hatched,
         set_corpsenm, add_to_container } from './mkobj.js';
import { sgn, isok, distu } from './hacklib.js';
import { get_shop_item } from './shknam.js';
import { canseemon, canspotmon, newsym } from './display.js';
import { sensemon } from './display.js';
import { M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, MM_NOEXCLAM,
         MHID_ARTICLE, MHID_ALTMON, BOLT_LIM } from './const.js';
import { create_particular } from './read.js';
import { cansee, does_block, block_point } from './vision.js';
import { COLNO, ROWNO, MFAST } from './const.js';
import { attacktype, is_neuter, is_floater, emits_light, likes_lava,
         amorphous, throws_rocks, haseyes, is_flyer, is_whirly,
         noncorporeal, locomotion } from './mondata.js';
import { is_vampshifter } from './monst.js';
import { t_at, is_pool, is_lava, m_in_air, resists_ston } from './mon.js';
import { touch_petrifies } from './mondata.js';
import { can_hide_under_obj, dochugw, set_apparxy } from './monmove.js';
import { couldsee } from './vision.js';
import { is_pit, OBJ_FLOOR, PLNMSG_HIDE_UNDER } from './const.js';
import { ACCESSIBLE, POOL, LAVAPOOL,
    BLCORNER, CROSSWALL, DELPHI, FODDERSHOP, HWALL, IS_DOOR, IS_WALL, M_AP_FURNITURE, M_AP_OBJECT, OBJ_AT, OBJ_MINVENT, SCORR, SDOOR, SHOPBASE, TDWALL, TLCORNER, TRWALL, TUWALL, TEMPLE, VAULT, ZOO, ROOMOFFSET, GP_ALLOW_U, GP_CHECKSCARY, GP_AVOID_MONPOS, MM_IGNORELAVA,
    IS_WATERWALL, IS_ALTAR, Is_waterlevel, Is_airlevel, Is_firelevel,
    Is_earthlevel, Is_astralevel, In_sokoban,
    In_endgame as In_endgame_uz } from './const.js';
import { enexto_core, enexto, noteleport_level } from './teleport.js';
import { mon_track_clear, onscary } from './monmove.js';
/* questpgr.js has no imports back into makemon.js at module level except
   through the mkclass wire below (set at this module's top level). */
import { qt_montype, questpgr_wire_mkclass } from './questpgr.js';
import { start_timer, TIMER_OBJECT, BURN_OBJECT, stop_timer, ROT_CORPSE } from './timeout.js';


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
        S_KOBOLD, S_CENTAUR, S_ZOMBIE, S_LIZARD, S_TRAPPER } = MONSYMS;
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
export const is_golem = (ptr) => ptr.mlet === S_GOLEM;
export const is_bat = (ptr) => ptr.pmidx === PMNAMES.PM_BAT
                     || ptr.pmidx === PMNAMES.PM_GIANT_BAT
                     || ptr.pmidx === PMNAMES.PM_VAMPIRE_BAT;
export const is_male = (ptr) => (ptr.mflags2 & M2_MALE) !== 0;
export const is_female = (ptr) => (ptr.mflags2 & M2_FEMALE) !== 0;
const always_hostile = (ptr) => (ptr.mflags2 & M2_HOSTILE) !== 0;
const always_peaceful = (ptr) => (ptr.mflags2 & M2_PEACEFUL) !== 0;
const is_minion = (ptr) => (ptr.mflags2 & M2_MINION) !== 0;
// include/monst.h:281 is_lminion()
const is_lminion = (mon) => is_minion(mon.data) && mon_aligntyp(mon) === A_LAWFUL;
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
export const monmax_difficulty = (levdif) => Math.trunc((levdif + (game.u?.ulevel ?? 0)) / 2);
const monmin_difficulty = (levdif) => Math.trunc(levdif / 6);
export const montoostrong = (mndx, lev) => game.mons[mndx].difficulty > lev;
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
    /* src/makemon.c:1613, C caches the special-level pointer for the whole
       move. Debug level teleports do not advance moves, so the cached level
       deliberately survives several level changes in a world-tour turn. */
    const cache = game._align_shift_cache
                  || (game._align_shift_cache = { moves: null, slev: null });
    if (cache.moves !== game.moves) {
        cache.moves = game.moves;
        cache.slev = Is_special(game.u.uz);
    }
    const slev = cache.slev;
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

// src/makemon.c:1640 temperature_shift() — larger value if the monster
// prefers the level temperature. pm_resistance is mondata.h:14
// ((ptr)->mresists & (typ)).
function temperature_shift(ptr) {
    const temp = game.level?.flags?.temperature | 0;
    if (temp && ((ptr.mresists ?? 0)
                 & (temp > 0 ? MFLAGS.MR_FIRE : MFLAGS.MR_COLD)))
        return 3;
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

    /* makemon.c:1666 — in the quest branch, usually pick one of the
       role's signature enemies instead of the weighted table */
    if (game.u?.uz?.dnum === game.quest_dnum && rn2(7)
        && (ptr = qt_montype()) != null)
        return ptr;

    zlevel = level_difficulty();
    minmlev = monmin_difficulty(zlevel) + minadj;
    maxmlev = monmax_difficulty(zlevel) + maxadj;
    const upper = Is_rogue_level(game.u.uz);
    /* src/makemon.c:1678 — on the elemental planes (astral excepted) only
       monsters at home on the element are generated */
    const elemlevel = In_endgame_uz(game.u.uz) && !Is_astralevel(game.u.uz);

    totalweight = 0;
    selected_mndx = NON_PM;

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; ++mndx) {
        ptr = game.mons[mndx];

        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev))
            continue;
        if (upper && !/[A-Z]/.test(def_monsyms[ptr.mlet] || ''))
            continue;
        if (elemlevel && wrong_elem_type(ptr))
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
export const is_placeholder = (ptr) =>
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

// src/makemon.c:1983 mkclass_poly(); like mkclass(), but excludes several
// monster types from polymorph selection
export function mkclass_poly(klass) {
    let first, last, num = 0;
    let gmask;

    for (first = LOW_PM; first < SPECIAL_PM; first++)
        if (game.mons[first].mlet === klass)
            break;
    if (first === SPECIAL_PM)
        return NON_PM;

    gmask = (G_NOGEN | G_UNIQ);
    /* the "usually" part of "hell and no-hell are usually excluded";
       [it applies to every candidate here instead of to each one because
       that would make the two loops inconsistent with each other for non L] */
    if (rn2(9) || klass === S_LICH)
        gmask |= (Inhell() ? G_NOHELL : G_HELL);

    for (last = first; last < SPECIAL_PM && game.mons[last].mlet === klass; last++)
        if (mk_gen_ok(last, G_GENOD, gmask))
            num += game.mons[last].geno & G_FREQ;
    if (!num)
        return NON_PM;

    for (num = rnd(num); num > 0; first++)
        if (mk_gen_ok(first, G_GENOD, gmask))
            num -= game.mons[first].geno & G_FREQ;
    first--; /* correct an off-by-one error */

    return first;
}

// src/mkobj.c:395 rndmonnum_adj()
export function rndmonnum_adj(minadj, maxadj) {
    let ptr;
    let i;
    let excludeflags;

    /* Plan A: get a level-appropriate common monster */
    ptr = rndmonst_adj(minadj, maxadj);
    if (ptr)
        return monsndx(ptr);

    /* Plan B: get any common monster */
    excludeflags = MFLAGS.G_UNIQ | MFLAGS.G_NOGEN | (Inhell() ? MFLAGS.G_NOHELL : MFLAGS.G_HELL);
    do {
        i = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
        ptr = game.mons[i];
    } while ((ptr.geno & excludeflags) !== 0);

    return i;
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
export function propagate(mndx, tally, ghostly) {
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
export function golemhp(type) {
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

// src/makemon.c:33 is_home_elemental() — an elemental on its own plane.
export function is_home_elemental(ptr) {
    if (ptr?.mlet === S_ELEMENTAL) {
        switch (monsndx(ptr)) {
        case PMNAMES.PM_AIR_ELEMENTAL:
            return Is_airlevel(game.u.uz);
        case PMNAMES.PM_FIRE_ELEMENTAL:
            return Is_firelevel(game.u.uz);
        case PMNAMES.PM_EARTH_ELEMENTAL:
            return Is_earthlevel(game.u.uz);
        case PMNAMES.PM_WATER_ELEMENTAL:
            return Is_waterlevel(game.u.uz);
        default:
            break;
        }
    }
    return false;
}

// src/makemon.c:56 wrong_elem_type() — true if the given monster cannot
// exist on this elemental level.
function wrong_elem_type(ptr) {
    if (ptr.mlet === S_ELEMENTAL) {
        return !is_home_elemental(ptr);
    } else if (Is_earthlevel(game.u.uz)) {
        /* no restrictions? */
    } else if (Is_waterlevel(game.u.uz)) {
        /* just monsters that can swim */
        if (!is_swimmer(ptr))
            return true;
    } else if (Is_firelevel(game.u.uz)) {
        if (!((ptr.mresists ?? 0) & MFLAGS.MR_FIRE))
            return true;
    } else if (Is_airlevel(game.u.uz)) {
        if (!(is_flyer(ptr) && ptr.mlet !== S_TRAPPER) && !is_floater(ptr)
            && !amorphous(ptr) && !noncorporeal(ptr) && !is_whirly(ptr))
            return true;
    }
    return false;
}

// src/makemon.c:986 monhp_per_lvl() -- hit points gained per restored level.
export function monhp_per_lvl(mon) {
    const ptr = mon.data;
    let hp = rnd(8);

    if (is_golem(ptr))
        hp = Math.trunc(golemhp(mon.mnum) / ptr.mlevel);
    else if (ptr.mlevel > 49)
        hp = 4 + rnd(4);
    else if (ptr.mlet === S_DRAGON && mon.mnum >= PMNAMES.PM_GRAY_DRAGON)
        hp = 4 + rn2(5);
    else if (!mon.m_lev)
        hp = rnd(4);
    return hp;
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
// src/makemon.c:2181 mongets()
export function mongets(mtmp, otyp) {
    let otmp;

    if (!otyp)
        return null;
    otmp = mksobj(otyp, true, false);
    if (otmp) {
        if (mtmp.data.mlet === MONSYMS.S_DEMON) {
            /* demons never get blessed objects */
            if (otmp.blessed)
                curse(otmp);
        } else if (is_lminion(mtmp)) {
            /* lawful minions don't get cursed, bad, or rusting objects */
            otmp.cursed = 0;
            if (otmp.spe < 0)
                otmp.spe = 0;
            otmp.oerodeproof = 1;
            otmp.oeroded = otmp.oeroded2 = 0;
        } else if (is_mplayer(mtmp.data) && is_sword(otmp)) {
            otmp.spe = (3 + rn2(4));
        }

        if (otmp.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
            otmp.spe = 0;
            otmp.age = 0;
            otmp.lamplit = 0;
            otmp.blessed = otmp.cursed = 0;
        } else if (otmp.otyp === ONAMES.BELL_OF_OPENING) {
            otmp.blessed = otmp.cursed = 0;
        } else if (otmp.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            otmp.blessed = 0;
            otmp.cursed = 1;
        }

        /* leaders don't tolerate inferior quality battle gear */
        if (is_prince(mtmp.data)) {
            if (otmp.oclass === OCLASSES.WEAPON_CLASS && otmp.spe < 1)
                otmp.spe = 1;
            else if (otmp.oclass === OCLASSES.ARMOR_CLASS && otmp.spe < 0)
                otmp.spe = 0;
        }

        if (mpickobj(mtmp, otmp)) {
            /* otmp was freed via merging with something else */
            otmp = null;
        }
    }
    return otmp;
}

// src/mon.c mpickobj() — returns true when otmp was freed by merging.
/* mpickobj() moved to js/steal.js, its src/steal.c home, with add_to_minv
   merging; this file re-imports it for mongets. */
import { mpickobj } from './steal.js';
import { in_town } from './hack.js';
export { mpickobj };

export const DF_NONE = 0, DF_RANDOM = 1, DF_ALL = 2;
const DELIVER_PM = MFLAGS.M2_UNDEAD | MFLAGS.M2_WERE | MFLAGS.M2_HUMAN
                 | MFLAGS.M2_ELF | MFLAGS.M2_DWARF | MFLAGS.M2_GNOME
                 | MFLAGS.M2_ORC | MFLAGS.M2_DEMON | MFLAGS.M2_GIANT;

// src/dokick.c:1860 deliver_obj_to_mon(). Species-targeted migrating items
// are handed to newly made monsters before makemon() returns.
export function deliver_obj_to_mon(mtmp, requested, deliverflags = DF_NONE) {
    const migrating = game.migrating_objs || [];
    let maxobj = 1;
    if ((deliverflags & DF_RANDOM) && requested > 1)
        maxobj = rnd(requested);
    else if (deliverflags & DF_ALL)
        maxobj = 0;

    const atCrimeScene = In_mines(game.u.uz);
    let delivered = 0;
    for (let i = 0; i < migrating.length; ) {
        const otmp = migrating[i];
        const where = (otmp.owornmask || 0) & 0x7fff;
        const species = otmp.migr_species ?? NON_PM;
        if (!(where & MIGR_TO_SPECIES)
            || species === NON_PM
            || (mtmp.data.mflags2 & DELIVER_PM) !== species) {
            i++;
            continue;
        }

        migrating.splice(i, 1);
        otmp.where = OBJ_FREE;
        otmp.owornmask = 0;
        otmp.ox = otmp.oy = 0;

        if ((species & MFLAGS.M2_ORC) && otmp.oname) {
            if (!has_mgivenname(mtmp) && (atCrimeScene || !rn2(2)))
                christen_orc(mtmp, atCrimeScene ? otmp.oname : null,
                             ' the Fence');
            delete otmp.oname;
        }
        otmp.migr_species = NON_PM;
        otmp.omigr_from_dnum = otmp.omigr_from_dlevel = 0;
        mpickobj(mtmp, otmp);
        delivered++;
        if (maxobj && delivered >= maxobj)
            break;
    }
}

// src/makemon.c:589 m_initinv() — species-specific starting inventory.
//
// PORTED: the generic tail (the three draws every monster makes) and the
// branches that need nothing beyond mksobj(). The mlet switch's remaining arms
// are noted where they belong; each is reached only by a species that cannot
// yet be generated, and reaching one is recorded rather than approximated.
function m_initinv(mtmp) {
    const ptr = mtmp.data;

    if (Is_rogue_level(game.u.uz))
        return;

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
        } else if (ptr.pmidx === PMNAMES.PM_SHOPKEEPER) {
            /* src/makemon.c:702 — key plus the healing/wand fall-through */
            mongets(mtmp, ONAMES.SKELETON_KEY);
            switch (rn2(4)) {
            /* MAJOR fall through ... */
            case 0:
                mongets(mtmp, ONAMES.WAN_MAGIC_MISSILE);
                /* FALLTHRU */
            case 1:
                mongets(mtmp, ONAMES.POT_EXTRA_HEALING);
                /* FALLTHRU */
            case 2:
                mongets(mtmp, ONAMES.POT_HEALING);
                /* FALLTHRU */
            case 3:
                mongets(mtmp, ONAMES.WAN_STRIKING);
            }
        } else if (ptr.msound === MSOUND.MS_PRIEST
                   || quest_mon_represents_role(ptr, 'Priest')) {
            /* src/makemon.c:721 — the priest's robe, shield and purse */
            mongets(mtmp, rn2(7) ? ONAMES.ROBE
                                 : rn2(3) ? ONAMES.CLOAK_OF_PROTECTION
                                          : ONAMES.CLOAK_OF_MAGIC_RESISTANCE);
            mongets(mtmp, ONAMES.SMALL_SHIELD);
            mkmonmoney(mtmp, rn1(10, 20));
        } else if (quest_mon_represents_role(ptr, 'Monk')) {
            mongets(mtmp, rn2(11) ? ONAMES.ROBE
                                  : ONAMES.CLOAK_OF_MAGIC_RESISTANCE);
        }
        break;
    case S_GIANT:
        if (monsndx(ptr) === PMNAMES.PM_MINOTAUR) {
            /* makemon.c:740 — a minotaur born on the Plane of Earth always
               carries a wand of digging */
            if (!rn2(8) || (game.in_mklev && Is_earthlevel(game.u.uz)))
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
        // src/makemon.c:777, the unobserved cat corpse has no rot timer.
        if (!rn2(20) && ptr.pmidx === PMNAMES.PM_QUANTUM_MECHANIC) {
            const otmp = mksobj(ONAMES.LARGE_BOX, false, false);
            const catcorpse = mksobj(ONAMES.CORPSE, true, false);
            if (catcorpse) {
                otmp.spe = 1;
                set_corpsenm(catcorpse, PMNAMES.PM_HOUSECAT);
                stop_timer(ROT_CORPSE, catcorpse);
                add_to_container(otmp, catcorpse);
                otmp.owt = weight_fn(otmp);
            }
            mpickobj(mtmp, otmp);
        }
        break;
    case S_DEMON:
        /* src/makemon.c:800 — moved here from m_initweap() because these
           don't have AT_WEAP so m_initweap() is not called for them */
        if (ptr.pmidx === PMNAMES.PM_ICE_DEVIL && !rn2(4)) {
            mongets(mtmp, ONAMES.SPEAR);
        } else if (ptr.pmidx === PMNAMES.PM_ASMODEUS) {
            mongets(mtmp, ONAMES.WAN_COLD);
            mongets(mtmp, ONAMES.WAN_FIRE);
        }
        break;
    case S_GNOME:
        /* src/makemon.c:809 — a gnome sometimes carries a lit candle; in the
           Mines during level creation it is far more likely. */
        if (!rn2((In_mines(game.u.uz) && game.in_mklev) ? 20 : 60)) {
            const otmp = mksobj(rn2(4) ? ONAMES.TALLOW_CANDLE
                                       : ONAMES.WAX_CANDLE, true, false);
            otmp.quan = 1;
            otmp.owt = weight_fn(otmp);
            if (!mpickobj(mtmp, otmp)
                && !game.level.at(mtmp.mx, mtmp.my)?.lit) {
                /* src/timeout.c:1712 begin_burn(). A single candle has
                   radius 2 and stops first at 75 turns of fuel. */
                const turns = otmp.age > 75 ? otmp.age - 75
                            : otmp.age > 15 ? otmp.age - 15 : otmp.age;
                if (start_timer(turns, TIMER_OBJECT, BURN_OBJECT, otmp)) {
                    otmp.lamplit = 1;
                    otmp.age -= turns;
                    new_light_source(mtmp.mx, mtmp.my, 2,
                                     LS_OBJECT, otmp.o_id);
                    game.vision_full_recalc = 1;
                }
            }
        }
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
export function rnd_defensive_item(mtmp) {
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
            /* muse.c:1236 noteleport_level(mtmp) — covetous monsters
               (Vlad) bypass a natural noteleport level */
            if (noteleport_level(mtmp) && ++trycnt < 2)
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
export function rnd_misc_item(mtmp) {
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

export function findgold(minvent) {
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
    mtmp.mstate = 0;    /* steed.c:931 — back on the floor: MON_FLOOR */
}

// include/rm.h:534 remove_monster() — clears the grid slot only. A mover that
// writes mx/my directly instead of pairing these two leaves the grid pointing
// at the monster's old square, and since m_at() is what mfndpos() counts with,
// the monster then sees the wrong number of free squares and draws rn2 on a
// different modulus.
export function remove_monster(x, y) {
    game.level.monAt?.delete(`${x},${y}`);
}
// src/teleport.c:53 goodpos_onscary() — onscary() without monst fields,
// for fake monsters during creation and teleport destination checks.
function goodpos_onscary(x, y, mptr) {
    /* onscary() checks Angels and lawful minions; this oversimplifies */
    if (mptr.mlet === MONSYMS.S_HUMAN || mptr.mlet === MONSYMS.S_ANGEL
        || is_rider(mptr) || (mptr.geno & G_UNIQ) !== 0 /* unique_corpstat */)
        return false;
    /* onscary() checks for vampshifted vampire bats/fog clouds/wolves too */
    const loc = game.level?.at(x, y);
    if (loc && IS_ALTAR(loc.typ) && mptr.mlet === MONSYMS.S_VAMPIRE)
        return true;
    /* scare monster scroll doesn't have any of the below restrictions,
       being its own source of power */
    if (sobj_at(ONAMES.SCR_SCARE_MONSTER, x, y))
        return true;
    /* engraved Elbereth doesn't work in Gehennom or the end-game */
    /* include/dungeon.h:139 In_hell — the dungeon's hellish flag */
    if (game.dungeons?.[game.u.uz?.dnum]?.flags?.hellish
        || In_endgame(game.u.uz))
        return false;
    /* creatures who don't (or can't) fear a written Elbereth and weren't
       caught by the minions check */
    if (mptr.pmidx === PMNAMES.PM_MINOTAUR || !haseyes(mptr))
        return false;
    return !!sengr_at('Elbereth', x, y, true);
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
            && mtmp !== game.youmonst
            && (mtmp !== game.u.ustuck || !game.u.uswallow)
            && (!game.u.usteed || mtmp !== game.u.usteed))
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

        if (is_pool(x, y) && !ignorewater) {
            /* src/teleport.c:135 — MOAT and WATER count, not just POOL, and
               a flyer/floater over ordinary water is a good position. */
            if (mtmp === game.youmonst)
                return !!(game.u.uprops?.SWIMMING || game.u.uprops?.AMPHIBIOUS
                          || (!Is_waterlevel(game.u.uz)
                              && !(IS_WATERWALL(loc.typ))
                              && (Levitation() || Flying()
                                  || game.u.uprops?.WWALKING)));
            else
                return (is_swimmer(ptr)
                        || (!Is_waterlevel(game.u.uz)
                            && !(IS_WATERWALL(loc.typ))
                            && m_in_air(mtmp)));
        } else if (ptr.mlet === S_EEL && rn2(13) && !ignorewater) {
            return false;
        } else if (is_lava(x, y) && !(gpflags & MM_IGNORELAVA)) {
            /* 3.6.3: floating eye can levitate over lava but it avoids
               that due the effect of the heat causing it to dry out */
            if (ptr.pmidx === PMNAMES.PM_FLOATING_EYE)
                return false;
            else if (mtmp === game.youmonst)
                return !!(Levitation() || Flying()
                          || (game.u.uprops?.FIRE_RES && game.u.uprops?.WWALKING
                              && game.uarmf?.oerodeproof));
            else
                return (m_in_air(mtmp) || likes_lava(ptr));
        }
        if (passes_walls(ptr) && may_passwall(x, y))
            return true;
        if (amorphous(ptr) && closed_door(x, y))
            return true;
        /* avoid onscary() if caller has specified that restriction */
        if ((gpflags & GP_CHECKSCARY) && (mtmp.m_id ? onscary(x, y, mtmp)
                                                    : goodpos_onscary(x, y, ptr)))
            return false;
    }
    /* src/monmove.c accessible(): a closed or locked door is not an
       accessible destination even though DOOR is an accessible map type. */
    if (!ACCESSIBLE(loc.typ) || closed_door(x, y)) {
        if (!(is_pool(x, y) && ignorewater)
            && !(is_lava(x, y) && (gpflags & MM_IGNORELAVA)))
            return false;
    }
    /* skip boulder locations for most creatures */
    if (sobj_at(ONAMES.BOULDER, x, y) && (!ptr || !throws_rocks(ptr)))
        return false;
    return true;
}

const is_swimmer = (ptr) => (ptr.mflags1 & MFLAGS.M1_SWIM) !== 0;
const passes_walls = (ptr) => (ptr.mflags1 & MFLAGS.M1_WALLWALK) !== 0;

// src/quest.c quest_info() — the quest leader/nemesis for the hero's role.
// Both are G_NOGEN, so neither can appear from rndmonst(); the lookups exist so
// the gender branches read as C does.
/* src/makemon.c:11 quest_mon_represents_role() — this game's quest leader
   or nemesis standing in for a role's class monster. C's second argument is
   a PM_ role index for Role_if(); callers here pass either that index or
   the role's name string, so accept both. */
const quest_mon_represents_role = (mptr, role) => {
    const role_ok = (typeof role === 'number')
        ? pmIndexOf(game.urole?.mnum) === role          /* Role_if(role_pm) */
        : game.urole?.name?.m === role;
    return mptr.mlet === MONSYMS.S_HUMAN && role_ok
        && (mptr.msound === MS_LEADER || mptr.msound === MS_NEMESIS);
};

const quest_info_leader = () => pmIndexOf(game.urole?.ldrnum);
const quest_info_nemesis = () => pmIndexOf(game.urole?.neminum);
function pmIndexOf(name) {
    if (typeof name === 'number') return name;
    return (name && PMNAMES[name] !== undefined) ? PMNAMES[name] : NON_PM;
}

// src/align.c set_malign() — recomputes malign from peacefulness. No draw.
export function set_malign(mtmp) {
    let mal = mtmp.data.maligntyp;

    if (mtmp.ispriest || mtmp.isminion) {
        if (mtmp.ispriest)
            mal = mtmp.epri?.shralign ?? mtmp.mextra?.epri?.shralign ?? mal;
        else
            mal = mtmp.emin?.min_align ?? mtmp.mextra?.emin?.min_align ?? mal;
        if (mal !== A_NONE_VALUE)
            mal *= 5;
    }
    const coaligned = (sgn(mal) === sgn(game.u.ualign.type));

    if (mtmp.data.msound === MS_LEADER) {
        mtmp.malign = -20;
    } else if (mal === A_NONE_VALUE) {
        mtmp.malign = mtmp.mpeaceful ? 0 : 20;
    } else if (always_peaceful(mtmp.data)) {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful ? -3 * Math.max(5, absmal)
                                     : 3 * Math.max(5, absmal);
    } else if (always_hostile(mtmp.data)) {
        const absmal = Math.abs(mal);
        mtmp.malign = coaligned ? 0 : Math.max(5, absmal);
    } else if (coaligned) {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful ? -3 * Math.max(3, absmal)
                                     : Math.max(3, absmal);
    } else {
        mtmp.malign = Math.abs(mal);
    }
}
const A_NONE_VALUE = -128;   /* include/align.h A_NONE */

// src/mkobj.c mkobj_at() — used by the S_SPIDER/S_SNAKE arm of makemon().
function mkobj_at(oclass, x, y, artif) {
    const otmp = mkobj(oclass, artif);
    place_object(otmp, x, y);
    return otmp;
}

// src/mon.c:4726 hideunder() — try to hide the monster at its own spot.
// No draws; the messages need seeit, which is 0 during mklev. This was a
// stub that always set mundetected = 0, so a swamp snake created over its
// starter object stood in plain sight where C's is hidden.
export function hideunder(mtmp, defer_newsym = false) {
    const isHero = mtmp === game.youmonst;
    let undetected = false;
    const x = isHero ? game.u.ux : mtmp.mx;
    const y = isHero ? game.u.uy : mtmp.my;
    const ptr = isHero ? game.youmonst.data : game.mons[mtmp.mnum];
    let t2;

    if (mtmp === game.u.ustuck) {
        /* undetected==FALSE; can't hide if holding you or held by you */
    } else if (mtmp.mtrapped
               || ((t2 = t_at(x, y)) != null && !is_pit(t2.ttyp))) {
        /* undetected==FALSE; can't hide while trapped or on/in/under
           any non-pit trap when not trapped */
    } else if (ptr.mlet === MONSYMS.S_EEL) {
        /* aquatic creatures only hide under water, not under objects */
        undetected = (is_pool(x, y) && !Is_waterlevel(game.u.uz)
                      && (!game.u.uprops?.UNDERWATER || !couldsee(x, y)));
    } else if ((ptr.mflags1 & MFLAGS.M1_CONCEAL) !== 0 /* hides_under */) {
        /* hider-underers only hide under objects */
        const chain = (game.level?.objects || []).filter(
            (o) => o.ox === x && o.oy === y
                && (o.where === undefined || o.where === OBJ_FLOOR));
        let oi = 0;
        if (chain.length
            && can_hide_under_obj(chain[0])
            /* pets won't hide under a cursed item or an item of any BUC
               state that shares a pile with one or more cursed items */
            && (!mtmp.mtame || !chain.some((o) => o.cursed))
            /* aquatic creatures don't reach here; other swimmers
               shouldn't hide beneath underwater objects */
            && !(is_pool(x, y) || is_lava(x, y))) {
            /* most monsters won't hide under a cockatrice corpse but they
               can hide under a pile containing more than just such corpses */
            if (!resists_ston(mtmp))
                while (oi < chain.length
                       && chain[oi].otyp === ONAMES.CORPSE
                       && touch_petrifies(game.mons[chain[oi].corpsenm]))
                    oi++;
            if (oi < chain.length)
                undetected = true;
        }
    }

    const oldundetctd = !!(isHero ? game.u.uundetected : mtmp.mundetected);
    mtmp.mundetected = undetected ? 1 : 0;
    if (isHero)
        game.u.uundetected = mtmp.mundetected;
    if (undetected !== oldundetctd && !defer_newsym)
        newsym(x, y);
    return undetected;
}

// src/mon.c:4726 hideunder(), including its runtime visibility message.
// Delaying newsym until after You_see() preserves the tty image beneath a
// --More-- prompt when the new message first has to flush an older one.
export async function hideunder_with_message(mtmp) {
    const x = mtmp.mx, y = mtmp.my;
    const ptr = game.mons[mtmp.mnum];
    const seeit = !game.in_mklev && canseemon(mtmp);
    const seenmon = seeit ? y_monnam(mtmp) : null;
    let seenobj = null, locomo = null;

    if (seeit && ptr.mlet === MONSYMS.S_EEL) {
        seenobj = 'the water';
        locomo = 'dive';
    } else if (seeit && (ptr.mflags1 & MFLAGS.M1_CONCEAL) !== 0) {
        const shelter = (game.level?.objects || []).find(
            (o) => o.ox === x && o.oy === y
                && (o.where === undefined || o.where === OBJ_FLOOR));
        if (shelter) {
            const { ansimpleoname } = await import('./objnam.js');
            seenobj = ansimpleoname(shelter);
        }
    }

    const oldundetctd = !!mtmp.mundetected;
    const undetected = hideunder(mtmp, true);
    if (undetected && seenmon && seenobj) {
        const { You_see, set_msg_xy } = await import('./pline.js');
        set_msg_xy(x, y);
        await You_see(`${seenmon} ${locomo || locomotion(ptr, 'hide')} under ${seenobj}.`);
        (game.iflags ||= {}).last_msg = PLNMSG_HIDE_UNDER;
        (game.gl ||= {}).last_hider = mtmp.m_id;
    }
    if (undetected !== oldundetctd)
        newsym(x, y);
    return undetected;
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
    const mimicRoom = roomno < 0 ? null
        : [...(game.level.rooms || []).slice(0, game.level.nroom),
           ...(game.level.subrooms || [])]
            .find(r => r?.roomnoidx === roomno);
    const rt = mimicRoom?.rtype ?? 0;
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
    } else if (game.level.flags.is_maze_lev
               && !(game.u?.uz?.dnum === game.mines_dnum
                    && in_town(game.u.ux, game.u.uy))
               && game.u?.uz?.dnum !== game.sokoban_dnum
               && rn2(2)) {
        /* src/makemon.c:2441 — maze levels favor statue mimics; a mine-town
           square (in_town is positional, hack.c:3564) is exempt */
        ap_type = M_AP_OBJECT;
        appear = ONAMES.STATUE;
    } else if (roomno < 0 && !t_at(mx, my)) {
        ap_type = M_AP_OBJECT;
        appear = ONAMES.BOULDER;
    } else if (rt === ZOO || rt === VAULT) {
        ap_type = M_AP_OBJECT;
        appear = ONAMES.GOLD_PIECE;
    } else if (rt === DELPHI) {
        if (rn2(2)) {
            ap_type = M_AP_OBJECT;
            appear = ONAMES.STATUE;
        } else {
            ap_type = M_AP_FURNITURE;
            appear = MONSYMS.S_fountain;
        }
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
        else if ((appear === ONAMES.EGG && !can_be_hatched(mndx))
                 || (appear === ONAMES.TIN && nocorpse))
            mndx = NON_PM; /* revert to generic egg or empty tin */
        mtmp.mcorpsenm = mndx;
    } else if (ap_type === M_AP_OBJECT && appear === ONAMES.SLIME_MOLD) {
        mtmp.mcorpsenm = game.context.current_fruit;
        game.flags.made_fruit = true;
    } else if (ap_type === M_AP_FURNITURE && appear === MONSYMS.S_altar) {
        const algn = rn2(3) - 1; /* -1 chaos, 0 neutral, +1 law */
        /* include/align.h:50 Align2amask */
        mtmp.mcorpsenm = (Inhell() && rn2(3)) ? 0 /* AM_NONE */
            : (algn === 1) ? 4 /* AM_LAWFUL */ : algn + 2;
    } else if (mtmp.mcorpsenm !== undefined) {
        /* don't retain stale value from a previously mimicked shape */
        mtmp.mcorpsenm = NON_PM;
    }

    /* src/makemon.c:2548 — a mimic that now looks like a wall, door,
       boulder or tree makes its square opaque. */
    if (does_block(mx, my, game.level.at(mx, my)))
        block_point(mx, my);
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
    const continueGroup = () => {
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
                if (mon instanceof Promise)
                    return mon.then(created => {
                        if (created) {
                            created.mpeaceful = false;
                            created.mavenge = 0;
                            set_malign(created);
                        }
                        return continueGroup();
                    });
                if (mon) {
                    mon.mpeaceful = false;
                    mon.mavenge = 0;
                    set_malign(mon);
                }
            }
        }
    };
    return continueGroup();
}

/* include/makemon.h m_initsgrp()/m_initlgrp() */
function m_initsgrp(mtmp, x, y, mmf) { return m_initgrp(mtmp, x, y, 3, mmf); }
function m_initlgrp(mtmp, x, y, mmf) { return m_initgrp(mtmp, x, y, 10, mmf); }
/* m_dowear() now lives in js/worn.js, its C home (src/worn.c:757). The copy
   that stood here short-circuited on an empty minvent and recorded otherwise;
   the real one does the slot walk. */

// include/mondata.h — the predicates m_initweap() branches on.
const humanoid = (ptr) => (ptr.mflags1 & MFLAGS.M1_HUMANOID) !== 0;
const is_elf = (ptr) => (ptr.mflags2 & MFLAGS.M2_ELF) !== 0;
const is_dwarf = (ptr) => (ptr.mflags2 & MFLAGS.M2_DWARF) !== 0;
export const is_mercenary = (ptr) => (ptr.mflags2 & MFLAGS.M2_MERC) !== 0;
const extra_nasty = (ptr) => (ptr.mflags2 & MFLAGS.M2_NASTY) !== 0;
const strongmonst = (ptr) => (ptr.mflags2 & M2_STRONG) !== 0;
const is_lord = (ptr) => (ptr.mflags2 & MFLAGS.M2_LORD) !== 0;
const is_prince = (ptr) => (ptr.mflags2 & MFLAGS.M2_PRINCE) !== 0;

/* quest_mon_represents_role() now has its real body above (makemon.c:11);
   the old always-false stub assumed quest leaders could never be generated,
   but the quest-tour sessions walk right up to them. */

// src/makemon.c:481 m_initthrow() — a stack of missiles.
function m_initthrow(mtmp, otyp, oquan) {
    const otmp = mksobj(otyp, true, false);
    otmp.quan = rn1(oquan, 3);
    if (otyp === ONAMES.ORCISH_ARROW)
        otmp.opoisoned = true;
    mpickobj(mtmp, otmp);
}

// src/muse.c:2035 rnd_offensive_item()
export function rnd_offensive_item(mtmp) {
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
// src/makemon.c:1556 create_critters() — make cnt monsters next to the hero;
// returns True iff the hero sees a new monster appear.
export async function create_critters(cnt, mptr, neverask) {
    const u = game.u;
    let known = false;
    let ask = (game.wizard && !neverask);

    while (cnt--) {
        if (ask) {
            if (await create_particular()) {
                known = true;
                continue;
            } else
                ask = false; /* ESC will shut off prompting */
        }
        let x = u.ux, y = u.uy;
        /* if in water, try to encourage an aquatic monster
           by finding and then specifying another wet location */
        const c = { x: 0, y: 0 };
        if (!mptr && u.uinwater
            && enexto(c, x, y, game.mons[PMNAMES.PM_GIANT_EEL]))
            x = c.x, y = c.y;

        const mon = await makemon(mptr, x, y, NO_MM_FLAGS);
        if (!mon)
            continue; /* try again [should probably stop instead] */
        if ((canseemon(mon) && (M_AP_TYPE(mon) === M_AP_NOTHING
                                || M_AP_TYPE(mon) === M_AP_MONSTER))
            || sensemon(mon))
            known = true;
    }
    return known;
}

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
                if (rn2(3) || (game.in_mklev && Is_earthlevel(game.u.uz)))
                    mongets(mtmp, O.PICK_AXE);
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
                && sgn(mtmp.isminion
                       ? (mtmp.emin?.min_align
                          ?? mtmp.mextra?.emin?.min_align ?? A_NONE)
                       : ptr.maligntyp) === A_LAWFUL)
                otmp = oname(otmp,
                             typ === O.LONG_SWORD ? 'Sunsword' : 'Demonbane',
                             ONAME_RANDOM);
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
// src/makemon.c:1075 makemon_rnd_goodpos()
//
// Pick a random map square for a monster with no caller-chosen position.
// Fifty tries at rn1(COLNO-3, 2) / rn2(ROWNO); squares the hero can see are
// rejected outright outside level generation. If all fifty fail, sweep the
// whole map twice from the last random square as the offset — first pass
// skipping visible squares and dropping GP_CHECKSCARY, second pass taking
// anything — and between the passes try a random same-dungeon stairway.
function makemon_rnd_goodpos(mon, gpflags, cc) {
    let tryct = 0;
    let nx, ny;
    let good;

    gpflags |= GP_AVOID_MONPOS;
    do {
        nx = rn1(COLNO - 3, 2);
        ny = rn2(ROWNO);
        good = (!game.in_mklev && cansee(nx, ny)) ? false
                                                 : goodpos(nx, ny, mon, gpflags);
    } while ((++tryct < 50) && !good);

    if (!good) {
        const xofs = nx;
        const yofs = ny;
        const bl0 = (game.in_mklev || game.u?.ublind) ? 1 : 0;

        for (let bl = bl0; bl < 2; bl++) {
            if (!bl)
                gpflags &= ~GP_CHECKSCARY; /* perhaps should be a 3rd pass */
            for (let dx = 0; dx < COLNO; dx++)
                for (let dy = 0; dy < ROWNO; dy++) {
                    nx = ((dx + xofs) % (COLNO - 1)) + 1;
                    ny = ((dy + yofs) % (ROWNO - 1)) + 1;
                    if (bl === 0 && cansee(nx, ny))
                        continue;
                    if (goodpos(nx, ny, mon, gpflags)) {
                        cc.x = nx;
                        cc.y = ny;
                        return true;
                    }
                }
            if (bl === 0 && (!mon || mon.data.mmove)) {
                /* all map positions are visible (or not good),
                   try to pick something logical */
                for (let stway = game.stairs; stway; stway = stway.next) {
                    if (stway.tolev.dnum === game.u.uz.dnum && !rn2(2)) {
                        nx = stway.sx;
                        ny = stway.sy;
                        break;
                    }
                }
                if (goodpos(nx, ny, mon, gpflags)) {
                    cc.x = nx;
                    cc.y = ny;
                    return true;
                }
            }
        }
        return false;
    }
    cc.x = nx;
    cc.y = ny;
    return true;
}

// src/makemon.c:1147 makemon()
export function makemon(ptr, x, y, mmflags) {
    let mndx, mitem;
    const anymon = !ptr;
    let allow_minvent = ((mmflags & NO_MINVENT) === 0);
    const countbirth = ((mmflags & MM_NOCOUNTBIRTH) === 0);

    /* newcham lives in mon.js, which imports this module. Wire its creation
       helpers after module evaluation, on the first ordinary makemon call. */
    mon_wire_cham({ newmonhp, rndmonst });

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

    /* src/makemon.c:1176 — if caller wants random location, do it here */
    if (x === 0 && y === 0) {
        if (!makemon_rnd_goodpos(ptr ? { data: ptr, wormno: 0 } : null,
                                 gpflags, cc))
            return null;
        x = cc.x; y = cc.y;
    } else if (byyou && !game.in_mklev) {
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
        } while (++tryct <= 50
                 && ((tryct === 1 && throws_rocks(ptr)
                      && In_sokoban(game.u.uz))
                     || !goodpos(x, y, { data: ptr, wormno: 0 })));
        mndx = monsndx(ptr);
    }
    propagate(mndx, countbirth, false);

    const mtmp = {
        mx: 0, my: 0, m_lev: 0, mhp: 0, mhpmax: 0,
        /* C zeroes the whole struct (cg.zeromonst); movement in particular
           must start at 0, or movemon() lets the monster act on turn 1 when
           C makes it wait for its first allotment. */
        movement: 0, mspeed: 0, permspeed: 0, mblinded: 0, mspec_used: 0,
        seen_resistance: 0,
        /* C zeroes the apparent hero position before set_apparxy(). */
        mux: 0, muy: 0,
        female: 0, msleeping: 0, mpeaceful: 0, mtame: 0,
        minvent: null, mgold: 0, data: ptr, mnum: mndx,
        cham: NON_PM, mstrategy: 0,
    };
    /* src/makemon.c:1237-1246 allocates requested extended records before
       assigning the monster id.  The records themselves consume no RNG. */
    if (mmflags & (MM_EGD | MM_EPRI | MM_ESHK | MM_EMIN | MM_EDOG)) {
        mtmp.mextra = { mcorpsenm: NON_PM };
        if (mmflags & MM_EGD)  mtmp.mextra.egd = {};
        if (mmflags & MM_EPRI) mtmp.mextra.epri = {};
        if (mmflags & MM_ESHK) mtmp.mextra.eshk = {};
        if (mmflags & MM_EMIN) mtmp.mextra.emin = {};
        if (mmflags & MM_EDOG) mtmp.mextra.edog = {};
    }
    if (mmflags & MM_ASLEEP)
        mtmp.msleeping = 1;
    /* src/makemon.c:1249 — C prepends to fmon here, not in place_monster(), so
       the chain is newest-first and every iteration over it (movemon, the
       mcalcmove allotment loop) visits monsters in reverse creation order. */
    (game.level.monsters ||= []).unshift(mtmp);
    mtmp.m_id = next_ident();
    if (ptr.msound === MS_LEADER && quest_info_leader() === mndx)
        (game.quest_status ||= {}).leader_m_id = mtmp.m_id;

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
    if (mmflags & MM_MINVIS) {
        mtmp.perminvis = true;
        if (!mtmp.invis_blkd) {
            mtmp.minvis = true;
            newsym(mtmp.mx, mtmp.my);
        }
    }

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
        /* src/makemon.c:1344: true bats are permanently fast in Gehennom. */
        if (Inhell() && is_bat(ptr))
            mtmp.mspeed = mtmp.permspeed = MFAST;
        break;
    default:
        break;
    }
    /* src/makemon.c:1348 — glowing monsters carry their own light */
    {
        const ct = emits_light(ptr);
        if (ct > 0)
            new_light_source(mtmp.mx, mtmp.my, ct, LS_MONSTER, mtmp.m_id);
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
        christen_monst(mtmp, rndghostname());
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
    if (!Protection_from_shape_changers() && is_shapeshifter(ptr)) {
        const mcham = mndx;    /* pm_to_cham: M2_SHAPESHIFTER means itself */
        mtmp.cham = mcham;
        if (mndx !== PMNAMES.PM_VLAD_THE_IMPALER
            && newcham(mtmp, null, 0))
            allow_minvent = false;
    } else if (mndx === PMNAMES.PM_WIZARD_OF_YENDOR) {
        /* src/makemon.c:1370 */
        mtmp.iswiz = true;
        (game.context ||= {}).no_of_wizards =
            (game.context.no_of_wizards | 0) + 1;
        if (game.context.no_of_wizards === 1
            && Is_earthlevel(game.u.uz))
            mitem = ONAMES.SPE_DIG;
    }

    if (mitem && allow_minvent)
        mongets(mtmp, mitem);

    if (game.in_mklev) {
        if ((is_ndemon(ptr) || mndx === PMNAMES.PM_WUMPUS
             || mndx === PMNAMES.PM_LONG_WORM || mndx === PMNAMES.PM_GIANT_EEL)
            && !game.u.uhave?.amulet && rn2(5))
            mtmp.msleeping = true;
    } else if (byyou) {
        /* src/makemon.c:1391. Creation beside the hero draws the monster
           once here and again in the common arrival block below. */
        newsym(mtmp.mx, mtmp.my);
        set_apparxy(mtmp);
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

    // src/makemon.c:1414: ordinary clerics and some Angels become roamers.
    if ((mndx === PMNAMES.PM_ALIGNED_CLERIC || mndx === PMNAMES.PM_HIGH_CLERIC)
        ? !(mmflags & (MM_EPRI | MM_EMIN))
        : (mndx === PMNAMES.PM_ANGEL && !(mmflags & MM_EMIN) && !rn2(3))) {
        newemin(mtmp);
        mtmp.isminion = 1;
        mtmp.emin.min_align = rn2(3) - 1;
        mtmp.emin.renegade = (mmflags & MM_ANGRY) ? true : !rn2(3);
        mtmp.mpeaceful = mtmp.emin.min_align === game.u.ualign.type
            ? !mtmp.emin.renegade : mtmp.emin.renegade;
    }
    set_malign(mtmp);

    let group;
    if (anymon && !(mmflags & MM_NOGRP)) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            group = m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3))
                group = m_initlgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
            else
                group = m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        }
    }

    /* Creation stays synchronous during mklev. Runtime group messages
       finish before the parent's inventory and appearance are processed. */
    const finishCreation = () => {
        if (allow_minvent) {
            if (is_armed(ptr))
                m_initweap(mtmp);
            m_initinv(mtmp);
            m_dowear(mtmp, true);

            if (!rn2(100) && is_domestic(ptr)
                && can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE))
                put_saddle_on_mon(null, mtmp);
        }

        if (ptr.mflags3 && !(mmflags & MM_NOWAIT)) {
            if (ptr.mflags3 & M3_WAITFORU)
                mtmp.mstrategy |= STRAT_WAITFORU;
            if (ptr.mflags3 & M3_CLOSE)
                mtmp.mstrategy |= STRAT_CLOSE;
            if (ptr.mflags3 & (M3_WAITMASK | M3_COVETOUS))
                mtmp.mstrategy |= STRAT_APPEARMSG;
        }

        if (allow_minvent && (game.migrating_objs || []).length)
            deliver_obj_to_mon(mtmp, 1, DF_NONE);
        if (!game.in_mklev) {
            newsym(mtmp.mx, mtmp.my);
            let what = null, exclaim = !(mmflags & MM_NOEXCLAM);
            if (!(mmflags & MM_NOMSG)) {
                if ((canseemon(mtmp) && (M_AP_TYPE(mtmp) === M_AP_NOTHING
                                         || M_AP_TYPE(mtmp) === M_AP_MONSTER))
                    || sensemon(mtmp)) {
                    what = Amonnam(mtmp);
                    if (M_AP_TYPE(mtmp) === M_AP_MONSTER)
                        exclaim = true;
                } else if (canseemon(mtmp)) {
                    what = upstart(mhidden_description(mtmp,
                        MHID_ARTICLE | MHID_ALTMON));
                }
            }
            if (what || game.occupation)
                return (async () => {
                    if (what) {
                        set_msg_xy(mtmp.mx, mtmp.my);
                        await Norep(`${what}${exclaim ? ' suddenly' : ''} ${
                            vtense(what, 'appear')}${
                            distu(x, y) <= 2 ? ' next to you'
                            : distu(x, y) <= BOLT_LIM * BOLT_LIM ? ' close by'
                                : ''}${exclaim ? '!' : '.'}`);
                    }
                    if (game.occupation)
                        await dochugw(mtmp, false);
                    return mtmp;
                })();
        }
        return mtmp;
    };
    return group instanceof Promise ? group.then(finishCreation)
                                    : finishCreation();
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
        else if (is_home_elemental(ptr))       /* makemon.c:2087 */
            hp_threshold *= 3;
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
            mondied(mtmp);   /* grow_up is sync in C's call chain */
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

// src/makemon.c clone_mon() — split a new monster off `mon`, at (x,y) or
// nearby. The rnd(2) inside next_ident() and the tame/peaceful rn2 draws
// are the RNG shape; keep their order exactly.
export function clone_mon(mon, x, y) {
    const mm = { x: 0, y: 0 };

    /* may be too weak or have been extinguished for population control */
    if (mon.mhp <= 1
        || ((game.mvitals?.[mon.mnum]?.mvflags ?? 0) & MFLAGS.G_EXTINCT) !== 0)
        return null;

    if (x === 0) {
        mm.x = mon.mx;
        mm.y = mon.my;
    } else {
        mm.x = x;
        mm.y = y;
    }
    if (!isok(mm.x, mm.y)) { /* paranoia; C: impossible() */
        return null;
    }
    if (m_at(mm.x, mm.y)) { /* (always True for the x==0 case) */
        if (!enexto(mm, mm.x, mm.y, game.mons[mon.mnum]) || m_at(mm.x, mm.y))
            return null;
    }

    const m2 = { ...mon };      /* newmonst() + *m2 = *mon */
    /* m2->mextra = 0: the clone keeps no name, edog or minion state */
    m2.mgivenname = undefined;
    m2.edog = null;
    m2.emin = null;
    (game.level.monsters ||= []).unshift(m2);   /* m2->nmon = fmon; fmon = m2 */
    m2.m_id = next_ident();
    m2.mx = mm.x;
    m2.my = mm.y;

    m2.mundetected = 0;
    m2.mtrapped = 0;
    m2.mcloned = 1;
    m2.minvent = null;          /* objects don't clone */
    m2.mleashed = 0;
    /* Max HP the same, but current HP halved for both. When current HP is
       odd, the original keeps the extra point. */
    m2.mhpmax = mon.mhpmax;
    m2.mhp = Math.trunc(mon.mhp / 2);
    mon.mhp -= m2.mhp;

    /* clone doesn't have mextra so mustn't retain special monster flags */
    m2.isshk = 0;
    m2.isgd = 0;
    m2.ispriest = 0;

    /* clone shouldn't be reluctant to move on spots 'parent' just moved on */
    mon_track_clear(m2);

    place_monster(m2, m2.mx, m2.my);
    /* src/makemon.c:899 — the clone glows like the original */
    if (emits_light(game.mons[m2.mnum]))
        new_light_source(m2.mx, m2.my, emits_light(game.mons[m2.mnum]),
                         LS_MONSTER, m2.m_id);
    /* if 'parent' is named, give the clone the same name */
    if (mon.mgivenname) {
        christen_monst(m2, mon.mgivenname);
    } else if (mon.isshk) {
        note_unported_makemon('clone_mon:shkname');
    }

    /* not all clones caused by player are tame or peaceful */
    if (!game.context?.mon_moving && mon.mpeaceful) {
        if (mon.mtame)
            m2.mtame = rn2(Math.max(2 + (game.u.uluck || 0), 2)) ? mon.mtame : 0;
        else if (mon.mpeaceful)
            m2.mpeaceful = rn2(Math.max(2 + (game.u.uluck || 0), 2)) ? 1 : 0;
    }
    /* isminion takes precedence over mtame */
    if (m2.isminion) {
        note_unported_makemon('clone_mon:newemin');
    } else if (m2.mtame) {
        /* C zeroes mtame then re-tames through tamedog() and copies EDOG;
           tamedog is not ported, so the clone ends up untame and the gap
           is recorded */
        m2.mtame = 0;
        note_unported_makemon('clone_mon:tamedog');
    }
    set_malign(m2);
    newsym(m2.mx, m2.my); /* display the new monster */

    return m2;
}

/* wire mkclass into questpgr's qt_montype (cycle avoidance) */
questpgr_wire_mkclass(mkclass);

// src/makemon.c newmcorpsenm(); give mtmp an mcorpsenm slot, not yet set
export function newmcorpsenm(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = {};
    mtmp.mextra.mcorpsenm = NON_PM; /* not initialized yet */
}
