// makemon.js — Monster creation / random selection.
// C ref: makemon.c — rndmonst_adj, makemon, newmonhp, peace_minded,
//   m_initweap / m_initthrow / mongets (ordinary armed-mlet envelope).

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { depth as depth_of_level, level_difficulty as level_difficulty_of } from './hacklib.js';
import { put_saddle_on_mon } from './steed.js';
import {
    LOW_PM,
    SPECIAL_PM,
    NON_PM,
    NUMMONS,
    G_UNIQ,
    G_NOGEN,
    G_HELL,
    G_NOHELL,
    G_FREQ,
    G_SGROUP,
    G_LGROUP,
    G_IGNORE,
    mons,
    always_hostile,
    always_peaceful,
    is_male,
    is_female,
    is_neuter,
    is_domestic,
    is_armed,
    is_lord,
    is_prince,
    is_demon,
    extra_nasty,
    strongmonst,
    is_placeholder,
    mon_difficulty,
    monmin_difficulty,
    monmax_difficulty,
    montooweak,
    montoostrong,
    likes_gold,
    monsterNames,
    is_animal,
    mindless,
    is_floater,
    is_mercenary,
    is_elf,
    is_giant,
    is_ndemon,
    is_shapeshifter,
    is_vampire,
    is_vampshifter,
    vampshifted,
    amorphous,
    unsolid,
    passes_walls,
    noncorporeal,
    is_golem,
    humanoid,
    polyok,
    is_mplayer,
    M3_CLOSE, M3_WAITFORU,
} from './monsters.js';
import { big_to_little } from './mondata.js';
import {
    NO_MINVENT, MM_NOGRP, MM_ASLEEP, MM_NONAME, MM_ESHK, MM_EGD, MM_EMIN,
    MM_EPRI, MM_ADJACENTOK, MM_NOTAIL, MM_NOWAIT,
    GP_CHECKSCARY, GP_AVOID_MONPOS, Is_rogue_level, Is_earthlevel,
    In_mines, In_sokoban, In_endgame,
    OBJ_MINVENT, COLNO, ROWNO, A_NONE, GEHENNOM, G_GONE, G_GENOD,
    M_AP_OBJECT, M_AP_FURNITURE, IS_DOOR, IS_WALL, IS_POOL, IS_LAVA,
    SDOOR, SCORR, ZOO, VAULT, DELPHI, TEMPLE, SHOPBASE, FODDERSHOP,
    ROOMOFFSET, LS_MONSTER,
    AM_NONE, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, ALIGNWEIGHT,
    In_quest, W_ARMH, P_POLEARMS, ROT_CORPSE, Is_waterlevel,
    STRAT_CLOSE, STRAT_WAITFORU,
} from './const.js';
import { enexto_core, enexto_gpflags, goodpos } from './teleport.js';
import {
    mksobj, mkobj, mkobj_at, weight, objects_at, curse, is_crackable,
    set_corpsenm, stop_timer, add_to_container, rnd_class,
} from './mkobj.js';

/** Local t_at — avoid makemon↔trap import cycle; matches trap.js t_at. */
function t_at_local(x, y) {
    const traps = game.level?.traps;
    if (traps) {
        for (const t of traps) {
            if (t && t.tx === x && t.ty === y) return t;
        }
    }
    if (Array.isArray(game.ftrap)) {
        for (const t of game.ftrap) {
            if (t && t.tx === x && t.ty === y) return t;
        }
    } else {
        for (let t = game.ftrap; t; t = t.ntrap) {
            if (t.tx === x && t.ty === y) return t;
        }
    }
    return null;
}
import {
    objectNames, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, WAND_CLASS,
    FOOD_CLASS, COIN_CLASS, SCROLL_CLASS, POTION_CLASS, AMULET_CLASS,
    TOOL_CLASS, ROCK_CLASS, GEM_CLASS, SPBOOK_CLASS, MAXOCLASSES,
    RANDOM_CLASS, objects,
} from './objects.js';
import { cansee } from './vision.js';
import { newsym } from './display.js';
import { emits_light, new_light_source } from './light.js';
import { christen_monst } from './do_name.js';
import { get_shop_item } from './shknam.js';
import {
    get_wormno, initworm, count_wsegs, place_worm_tail_randomly,
    worm_mon_at,
} from './worm.js';

/** C ref: shknam.c neweshk — allocate eshk for MM_ESHK makemon. */
export function neweshk(mtmp) {
    if (!mtmp.mextra) mtmp.mextra = {};
    if (!mtmp.mextra.eshk) {
        mtmp.mextra.eshk = {
            parentmid: mtmp.m_id | 0,
            bill_p: null,
            bill: [],
            shoproom: 0,
            shoptype: 0,
            shoplevel: { dnum: 0, dlevel: 0 },
            shd: { x: 0, y: 0 },
            shk: { x: 0, y: 0 },
            robbed: 0, credit: 0, debit: 0, loan: 0,
            following: false, surcharge: false, dismiss_kops: false,
            billct: 0, invoicect: 0,
            customer: '',
            shknam: '',
        };
    }
    return mtmp.mextra.eshk;
}

/**
 * C ref: vault.c newegd — allocate egd for MM_EGD makemon.
 * Named omission: FCSIZ-sized fakecorr prealloc (grown on demand).
 */
export function newegd(mtmp) {
    if (!mtmp.mextra) mtmp.mextra = {};
    if (!mtmp.mextra.egd) {
        mtmp.mextra.egd = {
            parentmid: mtmp.m_id | 0,
            fcbeg: 0,
            fcend: 0,
            vroom: 0,
            gdx: 0,
            gdy: 0,
            ogx: 0,
            ogy: 0,
            gdlevel: { dnum: 0, dlevel: 0 },
            warncnt: 0,
            dropgoldcnt: 0,
            gddone: 0,
            witness: 0,
            fakecorr: [],
        };
    }
    return mtmp.mextra.egd;
}

/**
 * C ref: minion.c newemin — allocate emin for MM_EMIN makemon.
 * Does not set isminion (angel branch of msummon does).
 */
export function newemin(mtmp) {
    if (!mtmp.mextra) mtmp.mextra = {};
    if (!mtmp.mextra.emin) {
        mtmp.mextra.emin = {
            parentmid: mtmp.m_id | 0,
            min_align: 0,
            renegade: false,
        };
    }
    return mtmp.mextra.emin;
}

/**
 * C ref: priest.c newepri — allocate epri for MM_EPRI makemon.
 * Fields filled by priestini after makemon returns.
 */
export function newepri(mtmp) {
    if (!mtmp.mextra) mtmp.mextra = {};
    if (!mtmp.mextra.epri) {
        mtmp.mextra.epri = {
            parentmid: mtmp.m_id | 0,
            shralign: 0,
            shroom: 0,
            shrpos: { x: 0, y: 0 },
            shrlevel: { dnum: 0, dlevel: 0 },
        };
    }
    return mtmp.mextra.epri;
}

// C ref: makemon.c set_mimic_sym — S_MIMIC_DEF sentinel (MONSYMS_S_ENUM idx 60)
const S_MIMIC_DEF_SYM = 60;
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const STATUE = objectNames.indexOf('STATUE');
const FIGURINE = objectNames.indexOf('FIGURINE');
const CORPSE = objectNames.indexOf('CORPSE');
const EGG = objectNames.indexOf('EGG');
const TIN = objectNames.indexOf('TIN');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const LUMP_OF_ROYAL_JELLY = objectNames.indexOf('LUMP_OF_ROYAL_JELLY');
const BOULDER = objectNames.indexOf('BOULDER');

// C ref: makemon.c syms[] for ordinary-room mimic appearance
const MIMIC_SYMS = [
    MAXOCLASSES, MAXOCLASSES, RING_CLASS, WAND_CLASS, WEAPON_CLASS,
    FOOD_CLASS, COIN_CLASS, SCROLL_CLASS, POTION_CLASS, ARMOR_CLASS,
    AMULET_CLASS, TOOL_CLASS, ROCK_CLASS, GEM_CLASS, SPBOOK_CLASS,
    S_MIMIC_DEF_SYM, S_MIMIC_DEF_SYM,
];
// C ref: furnsyms[] — only need length for ROLL_FROM RNG; appear value unused
// when appear_as overrides (Storeroom). Indices are pchar S_* stubs.
const MIMIC_FURNSYMS = [0, 0, 1, 1, 2, 3, 4, 5];

// C ref: do_name.c ghostnames[] / rndghostname
const GHOSTNAMES = [
    'Adri', 'Andries', 'Andreas', 'Bert', 'David', 'Dirk',
    'Emile', 'Frans', 'Fred', 'Greg', 'Hether', 'Jay',
    'John', 'Jon', 'Karnov', 'Kay', 'Kenny', 'Kevin',
    'Maud', 'Michiel', 'Mike', 'Peter', 'Robert', 'Ron',
    'Tom', 'Wilmar', 'Nick Danger', 'Phoenix', 'Jiro', 'Mizue',
    'Stephan', 'Lance Braccus', 'Shadowhawk', 'Murphy',
];

function rndghostname() {
    // C: rn2(7) ? ROLL_FROM(ghostnames) : plname
    return rn2(7) ? GHOSTNAMES[rn2(GHOSTNAMES.length)] : (game.plname || 'Hero');
}

function otyp(name) {
    const i = objectNames.indexOf(name);
    return i >= 0 ? i : 0;
}
function pm(name) {
    const i = monsterNames.indexOf(`PM_${name}`);
    return i >= 0 ? i : NON_PM;
}

function level_difficulty() {
    return level_difficulty_of(game.u?.uz) || 1;
}

// C ref: mkobj.c next_ident — duplicated here to avoid mkobj↔makemon cycle
function next_ident() {
    if (!game.context) game.context = {};
    const res = game.context.ident || 1;
    game.context.ident = (game.context.ident || 1) + rnd(2);
    if (!game.context.ident) game.context.ident = rnd(2) + 1;
    return res;
}

// C ref: makemon.c uncommon()
function uncommon(mndx) {
    const ptr = mons(mndx);
    if (!ptr) return true;
    if (ptr.geno & (G_NOGEN | G_UNIQ)) return true;
    // mvitals G_GONE not tracked yet
    // Inhell → reject maligntyp > neutral; else reject G_HELL
    if (game.u?.uz?.dnum === 1 /* Gehennom stub */) {
        return ptr.maligntyp > 0; // A_NEUTRAL=0
    }
    return !!(ptr.geno & G_HELL);
}

// C ref: makemon.c align_shift — special-level then dungeon align bias.
// Named omission: static oldmoves cache (recomputes Is_special each call).
function align_shift(ptr) {
    const uz = game.u?.uz;
    const slev = (game.sp_levchn || []).find(s =>
        s?.dlevel
        && (s.dlevel.dnum | 0) === (uz?.dnum | 0)
        && (s.dlevel.dlevel | 0) === (uz?.dlevel | 0));
    const align = slev?.flags?.align
        || game.dungeons?.[uz?.dnum | 0]?.flags?.align
        || AM_NONE;
    const mal = ptr?.maligntyp | 0;
    switch (align) {
    case AM_LAWFUL:
        return Math.trunc((mal + 20) / (2 * ALIGNWEIGHT));
    case AM_NEUTRAL:
        return Math.trunc((20 - Math.abs(mal)) / ALIGNWEIGHT);
    case AM_CHAOTIC:
        return Math.trunc(-(mal - 20) / (2 * ALIGNWEIGHT));
    default:
        return 0;
    }
}

// C ref: makemon.c temperature_shift
function temperature_shift(ptr) {
    const temp = game.level?.flags?.temperature | 0;
    if (!temp) return 0;
    // pm_resistance fire/cold — MR bits deferred; temperature rare on tut-1
    void ptr;
    return 0;
}

// C ref: makemon.c rndmonst_adj()
// C: quest_dnum gate → questpgr.c qt_montype() before ordinary weights
export function qt_montype() {
    const urole = game.urole || {};
    if (rn2(5)) {
        const qpm = urole.enemy1num ?? NON_PM;
        if (qpm !== NON_PM && rn2(5)
            && !((game.mvitals?.[qpm]?.mvflags ?? 0) & G_GENOD)) {
            return mons(qpm);
        }
        return mkclass(urole.enemy1sym, 0);
    }
    const qpm = urole.enemy2num ?? NON_PM;
    if (qpm !== NON_PM && rn2(5)
        && !((game.mvitals?.[qpm]?.mvflags ?? 0) & G_GENOD)) {
        return mons(qpm);
    }
    return mkclass(urole.enemy2sym, 0);
}

export function rndmonst_adj(minadj = 0, maxadj = 0) {
    // C: if (u.uz.dnum == quest_dnum && rn2(7) && (ptr = qt_montype()) != 0)
    if (In_quest(game.u?.uz) && rn2(7)) {
        const qptr = qt_montype();
        if (qptr) return qptr;
    }

    const zlevel = level_difficulty();
    const ulevel = game.u?.ulevel ?? 1;
    const minmlev = monmin_difficulty(zlevel) + minadj;
    const maxmlev = monmax_difficulty(zlevel, ulevel) + maxadj;

    let totalweight = 0;
    let selected_mndx = NON_PM;

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; mndx++) {
        const ptr = mons(mndx);
        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev)) continue;
        if (uncommon(mndx)) continue;

        let weight_ = (ptr.geno & G_FREQ) + align_shift(ptr);
        weight_ += temperature_shift(ptr);
        if (weight_ < 0 || weight_ > 127) weight_ = 0;
        if (weight_ > 0) {
            totalweight += weight_;
            if (rn2(totalweight) < weight_) selected_mndx = mndx;
        }
    }

    if (selected_mndx === NON_PM || uncommon(selected_mndx)) return null;
    return mons(selected_mndx);
}

export function rndmonst() {
    return rndmonst_adj(0, 0);
}

// C ref: mkobj.c rndmonnum() / rndmonnum_adj()
export function rndmonnum_adj(minadj = 0, maxadj = 0) {
    const ptr = rndmonst_adj(minadj, maxadj);
    if (ptr) return ptr.mndx;

    // Plan B: any common monster (ignore difficulty)
    const inhell = game.u?.uz?.dnum === 1;
    const excludeflags = G_UNIQ | G_NOGEN | (inhell ? G_NOHELL : G_HELL);
    let i;
    do {
        i = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
    } while ((mons(i).geno & excludeflags) !== 0);
    return i;
}

export function rndmonnum() {
    return rndmonnum_adj(0, 0);
}

// C ref: defsym.h MONSYMS_S_ENUM — mlet ordinal for mongen_order sort key
const MLET_ORD = Object.freeze({
    S_ANT: 1, S_BLOB: 2, S_COCKATRICE: 3, S_DOG: 4, S_EYE: 5, S_FELINE: 6,
    S_GREMLIN: 7, S_HUMANOID: 8, S_IMP: 9, S_JELLY: 10, S_KOBOLD: 11,
    S_LEPRECHAUN: 12, S_MIMIC: 13, S_NYMPH: 14, S_ORC: 15, S_PIERCER: 16,
    S_QUADRUPED: 17, S_RODENT: 18, S_SPIDER: 19, S_TRAPPER: 20, S_UNICORN: 21,
    S_VORTEX: 22, S_WORM: 23, S_XAN: 24, S_LIGHT: 25, S_ZRUTY: 26, S_ANGEL: 27,
    S_BAT: 28, S_CENTAUR: 29, S_DRAGON: 30, S_ELEMENTAL: 31, S_FUNGUS: 32,
    S_GNOME: 33, S_GIANT: 34, S_invisible: 35, S_JABBERWOCK: 36, S_KOP: 37,
    S_LICH: 38, S_MUMMY: 39, S_NAGA: 40, S_OGRE: 41, S_PUDDING: 42,
    S_QUANTMECH: 43, S_RUSTMONST: 44, S_SNAKE: 45, S_TROLL: 46, S_UMBER: 47,
    S_VAMPIRE: 48, S_WRAITH: 49, S_XORN: 50, S_YETI: 51, S_ZOMBIE: 52,
    S_HUMAN: 53, S_GHOST: 54, S_GOLEM: 55, S_DEMON: 56, S_EEL: 57,
    S_LIZARD: 58, S_WORM_TAIL: 59, S_MIMIC_DEF: 60,
});

let mongen_order = null;
const mclass_maxf = Object.create(null);

function sgn(x) {
    return x < 0 ? -1 : x > 0 ? 1 : 0;
}

/**
 * C ref: makemon.c set_malign — kill-alignment weight from type + peaceful.
 * Named omissions: MS_LEADER (msound not extracted); priest/minion EPRI/EMIN
 * individual align ×5 when those mextra fields are absent.
 */
export function set_malign(mtmp) {
    if (!mtmp?.data) return;
    let mal = mtmp.data.maligntyp | 0;
    // C: ispriest EPRI / isminion EMIN → individual align; then mal *= 5
    if (mtmp.ispriest || mtmp.isminion) {
        const epri = mtmp.mextra?.epri;
        const emin = mtmp.mextra?.emin;
        if (mtmp.ispriest && epri && epri.shralign != null) mal = epri.shralign | 0;
        else if (mtmp.isminion && emin && emin.min_align != null) mal = emin.min_align | 0;
        if (mal !== A_NONE) mal *= 5;
    }
    const ual = game.u?.ualign?.type ?? 0;
    const coaligned = sgn(mal) === sgn(ual);
    // MS_LEADER → -20 deferred (msound not on ptr)
    if (mal === A_NONE) {
        mtmp.malign = mtmp.mpeaceful ? 0 : 20;
    } else if (always_peaceful(mtmp.data)) {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful
            ? -3 * Math.max(5, absmal)
            : 3 * Math.max(5, absmal);
    } else if (always_hostile(mtmp.data)) {
        const absmal = Math.abs(mal);
        mtmp.malign = coaligned ? 0 : Math.max(5, absmal);
    } else if (coaligned) {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful
            ? -3 * Math.max(3, absmal)
            : Math.max(3, absmal);
    } else {
        mtmp.malign = Math.abs(mal);
    }
}

// C ref: makemon.c mk_gen_ok
function mk_gen_ok(mndx, mvflagsmask, genomask) {
    const ptr = mons(mndx);
    if (!ptr) return false;
    const mvflags = game.mvitals?.[mndx]?.mvflags ?? 0;
    if (mvflags & mvflagsmask) return false;
    if (ptr.geno & genomask) return false;
    if (is_placeholder(ptr)) return false;
    return true;
}

// C ref: makemon.c init_mongen_order — stable sort by (mlet<<8)|difficulty
function init_mongen_order() {
    if (mongen_order) return;
    mongen_order = new Array(NUMMONS);
    for (let i = LOW_PM; i < NUMMONS; i++) {
        mongen_order[i] = i;
        const ptr = mons(i);
        if (!ptr) continue;
        const mlet = ptr.mlet;
        const freq = ptr.geno & G_FREQ;
        if ((mclass_maxf[mlet] ?? 0) < freq) mclass_maxf[mlet] = freq;
    }
    // Contest uses stable qsort; Array.sort is stable in modern JS engines.
    const prefix = mongen_order.slice(0, SPECIAL_PM);
    prefix.sort((i1, i2) => {
        const p1 = mons(i1);
        const p2 = mons(i2);
        const d1 = ((p1?.difficulty ?? 0) | (((MLET_ORD[p1?.mlet] ?? 0) << 8)));
        const d2 = ((p2?.difficulty ?? 0) | (((MLET_ORD[p2?.mlet] ?? 0) << 8)));
        return d1 - d2 || i1 - i2;
    });
    for (let i = 0; i < SPECIAL_PM; i++) mongen_order[i] = prefix[i];
}

function monSi(i) {
    return mongen_order[i];
}

// C ref: makemon.c mkclass → mkclass_aligned(class, spc, A_NONE)
export function mkclass(mletClass, spc = 0) {
    return mkclass_aligned(mletClass, spc, A_NONE);
}

// C ref: makemon.c mkclass_aligned — pick permonst from class by geno/freq
export function mkclass_aligned(mletClass, spc = 0, atyp = A_NONE) {
    init_mongen_order();
    const nums = new Array(SPECIAL_PM + 1).fill(0);
    const maxmlev = level_difficulty() >> 1;
    const gehennom = (game.u?.uz?.dnum === GEHENNOM);
    const zero_freq_for_entire_class = (mclass_maxf[mletClass] ?? 0) === 0;

    let first;
    for (first = LOW_PM; first < SPECIAL_PM; first++) {
        if (mons(monSi(first))?.mlet === mletClass) break;
    }
    if (first === SPECIAL_PM) return null;

    let mv_mask = G_GONE;
    let spcMask = spc;
    if (spcMask & G_IGNORE) {
        mv_mask = 0;
        spcMask &= ~G_IGNORE;
    }

    let num = 0;
    let last;
    for (last = first;
        last < SPECIAL_PM && mons(monSi(last))?.mlet === mletClass;
        last++) {
        const ptr = mons(monSi(last));
        if (atyp !== A_NONE && sgn(ptr.maligntyp) !== sgn(atyp)) continue;

        let gn_mask = (G_NOGEN | G_UNIQ);
        if (rn2(9) || mletClass === 'S_LICH') {
            gn_mask |= (gehennom ? G_NOHELL : G_HELL);
        }
        gn_mask &= ~spcMask;

        if (mk_gen_ok(monSi(last), mv_mask, gn_mask)) {
            if (num
                && montoostrong(monSi(last), maxmlev)
                && ptr.difficulty > mons(monSi(last - 1)).difficulty
                && rn2(2)) {
                break;
            }
            let k = ptr.geno & G_FREQ;
            if (k > 0 || (k = (zero_freq_for_entire_class ? 1 : 0)) > 0) {
                // C: k + 1 - (adj_lev(...) > (u.ulevel * 2))
                nums[monSi(last)] = k + 1
                    - (adj_lev(ptr) > ((game.u?.ulevel ?? 1) * 2) ? 1 : 0);
                num += nums[monSi(last)];
            }
        }
    }
    if (!num) return null;

    let pick = rnd(num);
    for (first = first; first < last; first++) {
        pick -= nums[monSi(first)];
        if (pick <= 0) break;
    }
    return nums[monSi(first)] ? mons(monSi(first)) : null;
}

// C ref: makemon.c adj_lev() — no RNG
function adj_lev(ptr) {
    // C: Wizard level = base + times killed (capped 49); independent of depth
    if ((ptr?.mndx | 0) === pm('WIZARD_OF_YENDOR')) {
        let tmp = (ptr.mlevel | 0)
            + ((game.mvitals?.[ptr.mndx]?.died | 0));
        if (tmp > 49) tmp = 49;
        return tmp;
    }
    let tmp = ptr.mlevel;
    if (tmp > 49) return 50;
    let tmp2 = level_difficulty() - tmp;
    if (tmp2 < 0) tmp--;
    else tmp += Math.trunc(tmp2 / 5);
    tmp2 = (game.u?.ulevel ?? 1) - ptr.mlevel;
    if (tmp2 > 0) tmp += Math.trunc(tmp2 / 4);
    tmp2 = Math.trunc((3 * ptr.mlevel) / 2);
    if (tmp2 > 49) tmp2 = 49;
    if (tmp > tmp2) return tmp2;
    return tmp > 0 ? tmp : 0;
}

// C ref: makemon.c golemhp() — fixed HP by golem type; no RNG.
function golemhp(type) {
    switch (type) {
    case pm('STRAW_GOLEM'):
        return 20;
    case pm('PAPER_GOLEM'):
        return 20;
    case pm('ROPE_GOLEM'):
        return 30;
    case pm('LEATHER_GOLEM'):
        return 40;
    case pm('GOLD_GOLEM'):
        return 60;
    case pm('WOOD_GOLEM'):
        return 50;
    case pm('FLESH_GOLEM'):
        return 40;
    case pm('CLAY_GOLEM'):
        return 70;
    case pm('STONE_GOLEM'):
        return 100;
    case pm('GLASS_GOLEM'):
        return 80;
    case pm('IRON_GOLEM'):
        return 120;
    default:
        return 0;
    }
}

// C ref: makemon.c newmonhp()
// After rolling HP, if result equals basehp (all 1s / rnd(4)=1), boost +1 so
// level-0 and level-1 monsters always start with mhpmax >= 2.
function newmonhp(mon, ptr) {
    mon.m_lev = adj_lev(ptr);
    let basehp = 0;
    const mndx = ptr.mndx | 0;
    // Named omission: is_rider d(10,8); mlevel>49 fixed HP; is_home_elemental
    if (is_golem(ptr)) {
        // C: golems have fixed HP via golemhp(mndx) — no d(m_lev,8)
        mon.mhpmax = mon.mhp = golemhp(mndx);
    } else if (ptr.mlet === 'S_DRAGON' && mndx >= pm('GRAY_DRAGON')) {
        // C: adult dragons — N*(4+rnd(4)) before endgame, N*8 once there
        basehp = mon.m_lev | 0;
        mon.mhpmax = mon.mhp = In_endgame(game.u?.uz)
            ? (8 * basehp)
            : (4 * basehp + d(basehp, 4));
    } else if (!mon.m_lev) {
        basehp = 1; /* minimum is 1, increased to 2 below when rnd(4)=1 */
        mon.mhpmax = mon.mhp = rnd(4);
    } else {
        basehp = mon.m_lev | 0;
        mon.mhpmax = mon.mhp = d(basehp, 8);
    }
    if (mon.mhpmax === basehp) {
        mon.mhpmax += 1;
        mon.mhp = mon.mhpmax;
    }
}

/** C ref: mon.c pm_to_cham — shapeshifter species index else NON_PM */
function pm_to_cham(mndx) {
    if (mndx < LOW_PM || mndx >= NUMMONS) return NON_PM;
    return is_shapeshifter(mons(mndx)) ? mndx : NON_PM;
}

/** C ref: mon.c is_pool_or_lava — terrain under mon for vamp wolf gate */
function is_pool_or_lava_at(x, y) {
    const typ = game.level?.at(x, y)?.typ ?? 0;
    return IS_POOL(typ) || IS_LAVA(typ);
}

/**
 * C ref: mon.c pickvampshape — Vlad/leader/vampire alternate forms.
 * Named omissions: mon_has_special Vlad stay-form (makemon skips newcham
 * for Vlad); already covered geno / already-alt rn2(4) return-to-cham.
 */
function pickvampshape(mon) {
    let mndx = mon.cham | 0;
    let wolfchance = 10;
    const uppercase_only = Is_rogue_level(game.u?.uz);
    const PM_VLAD = pm('VLAD_THE_IMPALER');
    const PM_VLED = pm('VAMPIRE_LEADER');
    const PM_VAMP = pm('VAMPIRE');
    const PM_WOLF = pm('WOLF');
    const PM_FOG = pm('FOG_CLOUD');
    const PM_VBAT = pm('VAMPIRE_BAT');

    if (mndx === PM_VLAD) wolfchance = 3;
    if (mndx === PM_VLAD || mndx === PM_VLED) {
        if (!rn2(wolfchance) && !uppercase_only
            && !is_pool_or_lava_at(mon.mx, mon.my)) {
            mndx = PM_WOLF;
        } else {
            mndx = (!rn2(4) && !uppercase_only) ? PM_FOG : PM_VBAT;
        }
    } else if (mndx === PM_VAMP) {
        mndx = (!rn2(4) && !uppercase_only) ? PM_FOG : PM_VBAT;
    }

    if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GENOD) !== 0
        || ((mon.data?.mndx | 0) !== (mon.cham | 0) && !rn2(4))) {
        return mon.cham;
    }
    return mndx;
}

/**
 * C ref: wizard.c nasties[] — pick_nasty ROLL_FROM pool.
 */
const NASTIES = [
    pm('COCKATRICE'), pm('ETTIN'), pm('STALKER'), pm('MINOTAUR'),
    pm('OWLBEAR'), pm('PURPLE_WORM'), pm('XAN'), pm('UMBER_HULK'),
    pm('XORN'), pm('ZRUTY'), pm('LEOCROTTA'), pm('BALUCHITHERIUM'),
    pm('CARNIVOROUS_APE'), pm('FIRE_ELEMENTAL'), pm('JABBERWOCK'),
    pm('IRON_GOLEM'), pm('OCHRE_JELLY'), pm('GREEN_SLIME'),
    pm('DISPLACER_BEAST'), pm('GENETIC_ENGINEER'),
    pm('BLACK_DRAGON'), pm('RED_DRAGON'), pm('ARCH_LICH'),
    pm('VAMPIRE_LEADER'), pm('MASTER_MIND_FLAYER'), pm('DISENCHANTER'),
    pm('WINGED_GARGOYLE'), pm('STORM_GIANT'), pm('OLOG_HAI'),
    pm('ELF_NOBLE'), pm('ELVEN_MONARCH'), pm('OGRE_TYRANT'),
    pm('CAPTAIN'), pm('GREMLIN'),
    pm('SILVER_DRAGON'), pm('ORANGE_DRAGON'), pm('GREEN_DRAGON'),
    pm('YELLOW_DRAGON'), pm('GUARDIAN_NAGA'), pm('FIRE_GIANT'),
    pm('ALEAX'), pm('COUATL'), pm('HORNED_DEVIL'), pm('BARBED_DEVIL'),
];

/**
 * C ref: wizard.c pick_nasty — ROLL_FROM(nasties) + geno/difcap/hell alt.
 * Named omissions: rogue monsym uppercase retry; juvenile name-string gate
 * on big_to_little alt (always accept non-geno alt).
 */
function pick_nasty(difcap) {
    let res = NASTIES[rn2(NASTIES.length)];
    // Rogue uppercase re-ROLL deferred (monsym table not wired here)
    let alt = res;
    const inHell = (game.u?.uz?.dnum | 0) === GEHENNOM;
    if (((game.mvitals?.[res]?.mvflags ?? 0) & G_GENOD) !== 0
        || (difcap > 0 && (mons(res)?.difficulty ?? 0) >= difcap)
        || ((mons(res)?.geno ?? 0) & (inHell ? G_NOHELL : G_HELL)) !== 0) {
        alt = big_to_little(res);
    }
    if (alt !== res && ((game.mvitals?.[alt]?.mvflags ?? 0) & G_GENOD) === 0) {
        res = alt;
    }
    return res;
}

/**
 * C ref: topten.c get_rnd_toptenentry — no RECORD VFS; consume rnd(10) then
 * null (empty-scorefile footprint after successful open).
 */
function get_rnd_toptenentry() {
    rnd(10); // sysopt.tt_oname_maxrank default
    return null;
}

/**
 * C ref: topten.c tt_doppel — role form from topten or rn1 Archeologist..Wizard.
 * Named omissions: plgend/classmon/christen when RECORD has entries.
 */
function tt_doppel(_mon) {
    const tt = rn2(13) ? get_rnd_toptenentry() : null;
    if (!tt) {
        return rn1(pm('WIZARD') - pm('ARCHEOLOGIST') + 1, pm('ARCHEOLOGIST'));
    }
    return pm('ARCHEOLOGIST'); // unreachable until RECORD stub returns entries
}

/** Lazy animal_list for pick_animal — C mon.c mon_animal_list. */
let animal_list = null;

function ensure_animal_list() {
    if (animal_list) return;
    const tmp = [];
    for (let i = LOW_PM; i < SPECIAL_PM; i++) {
        if (is_animal(mons(i))) tmp.push(i);
    }
    animal_list = tmp;
}

/**
 * C ref: mon.c pick_animal — animal_list[rn2(count)]; rogue retry deferred.
 */
function pick_animal() {
    ensure_animal_list();
    return animal_list[rn2(animal_list.length)] ?? NON_PM;
}

/**
 * C ref: mon.c accept_newcham_form — geno/placeholder/mplayer/shapeshifter/polyok.
 */
function accept_newcham_form(mon, mndx) {
    if (mndx === NON_PM) return null;
    const mdat = mons(mndx);
    if (!mdat) return null;
    if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GENOD) !== 0) return null;
    if (is_placeholder(mdat)) return null;
    if (is_mplayer(mdat)) return mdat;
    if (is_shapeshifter(mdat)
        && (mon.cham | 0) >= LOW_PM
        && mdat.mndx === (mon.cham | 0)) {
        return mdat;
    }
    return polyok(mdat) ? mdat : null;
}

/**
 * C ref: mon.c validspecmon — accept_newcham_form; isspecmon notake/nohead
 * named omission (ordinary doppel at mklev is never isspecmon).
 */
function validspecmon(mon, mndx) {
    if (mndx === NON_PM) return true;
    return !!accept_newcham_form(mon, mndx);
}

/**
 * C ref: mon.c select_newcham_form — sandestin/doppel/cham/vamp + random.
 * Named omissions: dragon-armor ordinary arm (which_armor); wizard
 * mon_polycontrol; rogue uppercase bias in random loop.
 */
function select_newcham_form(mon) {
    let mndx = NON_PM;
    const cham = mon.cham | 0;

    if (cham === pm('SANDESTIN')) {
        if (rn2(7)) {
            mndx = pick_nasty((mons(pm('ARCHON'))?.difficulty ?? 0) - 1);
        }
    } else if (cham === pm('DOPPELGANGER')) {
        if (!rn2(7)) {
            mndx = pick_nasty((mons(pm('JABBERWOCK'))?.difficulty ?? 0) - 1);
        } else if (rn2(3)) {
            mndx = tt_doppel(mon);
        } else if (!rn2(3)) {
            mndx = rn1(pm('APPRENTICE') - pm('STUDENT') + 1, pm('STUDENT'));
            const guard = game.urole?.guardnum ?? NON_PM;
            if (mndx === guard) mndx = NON_PM;
        } else {
            let tryct = 5;
            do {
                mndx = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
                const md = mons(mndx);
                if (md && humanoid(md) && polyok(md)) break;
            } while (--tryct > 0);
            if (!tryct) mndx = NON_PM;
        }
    } else if (cham === pm('CHAMELEON')) {
        if (!rn2(3)) mndx = pick_animal();
    } else if (cham === pm('VLAD_THE_IMPALER')
        || cham === pm('VAMPIRE_LEADER')
        || cham === pm('VAMPIRE')) {
        mndx = pickvampshape(mon);
    }
    // NON_PM ordinary / dragon armor — deferred (which_armor)

    if (mndx === NON_PM) {
        let tryct = 50;
        do {
            mndx = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
        } while (--tryct > 0 && !validspecmon(mon, mndx));
    }
    return mndx;
}

/**
 * C ref: mon.c mgender_from_permonst — sex from new form.
 */
function mgender_from_permonst(mtmp, mdat) {
    if (is_male(mdat)) mtmp.female = 0;
    else if (is_female(mdat)) mtmp.female = 1;
    else if (!is_neuter(mdat)) {
        if (!rn2(10) && !(is_vampire(mdat) || is_vampshifter(mtmp)))
            mtmp.female = mtmp.female ? 0 : 1;
    }
}

/**
 * C ref: mon.c newcham — random form via select_newcham_form/accept.
 * Named omissions: message/polyspot/worm/mimic/leash/light/inventory arms;
 * Protection_from_shape_changers cancel path; endgame mplayer rank strip.
 * @returns {boolean} true if form changed
 */
export function newcham(mtmp, mdat, _ncflags = 0) {
    if (!mtmp) return false;
    const olddata = mtmp.data;
    if (mtmp.cham === NON_PM || mtmp.cham == null) {
        // cancelled→uncancel shapeshifter path deferred
        return false;
    }
    let target = mdat;
    if (!target) {
        let tryct = 20;
        do {
            const mndx = select_newcham_form(mtmp);
            target = accept_newcham_form(mtmp, mndx);
            // Rogue uppercase bias on first tries — deferred (monsym)
            if (target) break;
        } while (--tryct > 0);
        if (!target) return false;
    } else {
        const mndx = target.mndx ?? NON_PM;
        if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GENOD) !== 0)
            return false;
    }
    if (target === olddata) return false;

    mgender_from_permonst(mtmp, target);
    const hpn = mtmp.mhp | 0;
    const hpd = mtmp.mhpmax | 0;
    newmonhp(mtmp, target);
    mtmp.mhp = Math.trunc((hpn * mtmp.mhp) / hpd);
    if (mtmp.mhp < 0 || mtmp.mhp > mtmp.mhpmax) mtmp.mhp = mtmp.mhpmax;
    if (!mtmp.mhp) mtmp.mhp = 1;
    mtmp.data = target;
    mtmp.mnum = target.mndx;
    return true;
}

export { vampshifted, is_vampshifter };

// C ref: mondata.h race_peaceful / race_hostile
function race_peaceful(ptr) {
    const mask = game.urace?.lovemask ?? 0;
    return !!(mask && (ptr.mflags2 & mask));
}
function race_hostile(ptr) {
    const mask = game.urace?.hatemask ?? 0;
    return !!(mask && (ptr.mflags2 & mask));
}

// C ref: makemon.c peace_minded()
export function peace_minded(ptr) {
    if (always_peaceful(ptr)) return true;
    if (always_hostile(ptr)) return false;
    // MS_LEADER/GUARDIAN/NEMESIS, ERINYS, is_minion, amulet arms — deferred
    if (race_peaceful(ptr)) return true;
    if (race_hostile(ptr)) return false;
    const mal = ptr.maligntyp;
    const ual = game.u?.ualign?.type ?? 0;
    const sgn = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    if (sgn(mal) !== sgn(ual)) return false;
    if (mal < 0 && game.u?.uhave?.amulet) return false;
    const record = game.u?.ualign?.record ?? 0;
    const recClamp = record < -15 ? -15 : record;
    return !!rn2(16 + recClamp) && !!rn2(2 + Math.abs(mal));
}

// C ref: mkobj.c add_to_minv — prepend; merge omitted (first stack only)
export function add_to_minv(mtmp, obj) {
    if (!obj) return 1;
    // C: obj->where = OBJ_MINVENT
    obj.where = OBJ_MINVENT;
    obj.ocarry = mtmp;
    obj.nobj = mtmp.minvent;
    mtmp.minvent = obj;
    return 0;
}

// C ref: steal.c mpickobj — carrying-effects stubs omitted for mklev invent
export function mpickobj(mtmp, otmp) {
    if (!otmp) return 1;
    return add_to_minv(mtmp, otmp);
}

// C ref: makemon.c m_initthrow
function m_initthrow(mtmp, otyp_, oquan) {
    const otmp = mksobj(otyp_, true, false);
    otmp.quan = rn1(oquan, 3);
    otmp.owt = weight(otmp);
    if (otyp_ === otyp('ORCISH_ARROW')) otmp.opoisoned = true;
    mpickobj(mtmp, otmp);
}

// C ref: worn.c which_armor — avoid makemon↔trap cycle
function which_armor_local(mtmp, mask) {
    if (!mtmp) return null;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.owornmask || 0) & mask) return otmp;
    }
    return null;
}

// C ref: do_wear.c hard_helmet — metallic or glass helmet
function hard_helmet_local(obj) {
    if (!obj) return false;
    const oc = objects[obj.otyp] ?? game.objects?.[obj.otyp];
    if (!oc || (obj.oclass ?? oc.oc_class) !== ARMOR_CLASS) return false;
    // ARM_HELM = 2 (objclass.h oc_armcat / oc_skill for helms)
    if ((oc.oc_skill ?? oc.oc_armcat ?? -1) !== 2) return false;
    const mat = oc.oc_material ?? 0;
    const IRON = 11, MITHRIL = 15;
    if (mat >= IRON && mat <= MITHRIL) return true;
    return is_crackable(obj);
}

// C ref: muse.c rnd_offensive_item — ordinary non-animal path only
function rnd_offensive_item(mtmp) {
    const pm_ = mtmp.data;
    const difficulty = mon_difficulty(pm_.mndx);
    const AT_EXPL = 13;
    // animal / expl / mindless / ghost / kop → 0 (no RNG)
    if (is_animal(pm_) || attacktype(pm_, AT_EXPL) || mindless(pm_)
        || pm_.mlet === 'S_GHOST' || pm_.mlet === 'S_KOP') {
        return 0;
    }
    if (difficulty > 7 && !rn2(35)) return otyp('WAN_DEATH');
    switch (rn2(9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0))) {
    case 0: {
        // C: SCR_EARTH only if hard helm / amorphous / walls / noncorporeal / unsolid;
        // else FALLTHROUGH → WAN_STRIKING (D-0535)
        const helmet = which_armor_local(mtmp, W_ARMH);
        if (hard_helmet_local(helmet) || amorphous(pm_)
            || passes_walls(pm_) || noncorporeal(pm_) || unsolid(pm_)) {
            return otyp('SCR_EARTH');
        }
    }
    // FALLTHROUGH
    case 1: return otyp('WAN_STRIKING');
    case 2: return otyp('POT_ACID');
    case 3: return otyp('POT_CONFUSION');
    case 4: return otyp('POT_BLINDNESS');
    case 5: return otyp('POT_SLEEPING');
    case 6: return otyp('POT_PARALYSIS');
    case 7:
    case 8: return otyp('WAN_MAGIC_MISSILE');
    case 9: return otyp('WAN_SLEEP');
    case 10: return otyp('WAN_FIRE');
    case 11: return otyp('WAN_COLD');
    case 12: return otyp('WAN_LIGHTNING');
    default: return 0;
    }
}

// C ref: makemon.c mongets — ordinary weapon/armor path
export function mongets(mtmp, otyp_) {
    if (!otyp_) return null;
    const otmp = mksobj(otyp_, true, false);
    if (!otmp) return null;
    // demon / lawful-minion / mplayer / special artifacts omitted (C-JS-MAP)
    if (is_prince(mtmp.data)) {
        if (otmp.oclass === WEAPON_CLASS && (otmp.spe ?? 0) < 1) otmp.spe = 1;
        else if (otmp.oclass === ARMOR_CLASS && (otmp.spe ?? 0) < 0) otmp.spe = 0;
    }
    if (mpickobj(mtmp, otmp)) return null;
    return otmp;
}

// C ref: makemon.c m_initweap default arm — bias then rnd(14-2*bias)
function m_initweap_default(mtmp, ptr) {
    const bias = (is_lord(ptr) ? 1 : 0) + (is_prince(ptr) ? 2 : 0)
        + (extra_nasty(ptr) ? 1 : 0);
    switch (rnd(14 - (2 * bias))) {
    case 1:
        if (strongmonst(ptr)) mongets(mtmp, otyp('BATTLE_AXE'));
        else m_initthrow(mtmp, otyp('DART'), 12);
        break;
    case 2:
        if (strongmonst(ptr)) mongets(mtmp, otyp('TWO_HANDED_SWORD'));
        else {
            mongets(mtmp, otyp('CROSSBOW'));
            m_initthrow(mtmp, otyp('CROSSBOW_BOLT'), 12);
        }
        break;
    case 3:
        mongets(mtmp, otyp('BOW'));
        m_initthrow(mtmp, otyp('ARROW'), 12);
        break;
    case 4:
        if (strongmonst(ptr)) mongets(mtmp, otyp('LONG_SWORD'));
        else m_initthrow(mtmp, otyp('DAGGER'), 3);
        break;
    case 5:
        if (strongmonst(ptr)) mongets(mtmp, otyp('LUCERN_HAMMER'));
        else mongets(mtmp, otyp('AKLYS'));
        break;
    default:
        break;
    }
}

// C ref: makemon.c m_initweap — ordinary-level armed-mlet envelope
function m_initweap(mtmp) {
    const ptr = mtmp.data;
    const mm = ptr.mndx;
    if (Is_rogue_level(game.u?.uz)) return;

    switch (ptr.mlet) {
    case 'S_GIANT':
        if (rn2(2)) mongets(mtmp, mm !== pm('ETTIN') ? otyp('BOULDER') : otyp('CLUB'));
        if (mm !== pm('ETTIN') && !rn2(5)) {
            mongets(mtmp, rn2(2) ? otyp('TWO_HANDED_SWORD') : otyp('BATTLE_AXE'));
        }
        break;
    case 'S_ORC':
        if (rn2(2)) mongets(mtmp, otyp('ORCISH_HELM'));
        {
            let kind = mm;
            if (mm === pm('ORC_CAPTAIN')) {
                kind = rn2(2) ? pm('MORDOR_ORC') : pm('URUK_HAI');
            }
            if (kind === pm('MORDOR_ORC')) {
                if (!rn2(3)) mongets(mtmp, otyp('SCIMITAR'));
                if (!rn2(3)) mongets(mtmp, otyp('ORCISH_SHIELD'));
                if (!rn2(3)) mongets(mtmp, otyp('KNIFE'));
                if (!rn2(3)) mongets(mtmp, otyp('ORCISH_CHAIN_MAIL'));
            } else if (kind === pm('URUK_HAI')) {
                if (!rn2(3)) mongets(mtmp, otyp('ORCISH_CLOAK'));
                if (!rn2(3)) mongets(mtmp, otyp('ORCISH_SHORT_SWORD'));
                if (!rn2(3)) mongets(mtmp, otyp('IRON_SHOES'));
                if (!rn2(3)) {
                    mongets(mtmp, otyp('ORCISH_BOW'));
                    m_initthrow(mtmp, otyp('ORCISH_ARROW'), 12);
                }
                if (!rn2(3)) mongets(mtmp, otyp('URUK_HAI_SHIELD'));
            } else if (mm !== pm('ORC_SHAMAN') && rn2(2)) {
                mongets(mtmp, (mm === pm('GOBLIN') || rn2(2) === 0)
                    ? otyp('ORCISH_DAGGER')
                    : otyp('SCIMITAR'));
            }
        }
        break;
    case 'S_OGRE':
        if (!rn2(mm === pm('OGRE_TYRANT') ? 3 : mm === pm('OGRE_LEADER') ? 6 : 12)) {
            mongets(mtmp, otyp('BATTLE_AXE'));
        } else {
            mongets(mtmp, otyp('CLUB'));
        }
        break;
    case 'S_KOBOLD':
        if (!rn2(4)) m_initthrow(mtmp, otyp('DART'), 12);
        break;
    case 'S_CENTAUR':
        if (rn2(2)) {
            if (mm === pm('FOREST_CENTAUR')) {
                mongets(mtmp, otyp('BOW'));
                m_initthrow(mtmp, otyp('ARROW'), 12);
            } else {
                mongets(mtmp, otyp('CROSSBOW'));
                m_initthrow(mtmp, otyp('CROSSBOW_BOLT'), 12);
            }
        }
        break;
    case 'S_WRAITH':
        mongets(mtmp, otyp('KNIFE'));
        mongets(mtmp, otyp('LONG_SWORD'));
        break;
    case 'S_ZOMBIE':
        if (!rn2(4)) mongets(mtmp, otyp('LEATHER_ARMOR'));
        if (!rn2(4)) mongets(mtmp, rn2(3) ? otyp('KNIFE') : otyp('SHORT_SWORD'));
        break;
    case 'S_HUMANOID':
        if (mm === pm('HOBBIT')) {
            switch (rn2(3)) {
            case 0: mongets(mtmp, otyp('DAGGER')); break;
            case 1: mongets(mtmp, otyp('ELVEN_DAGGER')); break;
            case 2:
                mongets(mtmp, otyp('SLING'));
                m_initthrow(mtmp, !rn2(4) ? otyp('FLINT') : otyp('ROCK'), 6);
                break;
            }
            if (!rn2(10)) mongets(mtmp, otyp('ELVEN_MITHRIL_COAT'));
            if (!rn2(10)) mongets(mtmp, otyp('DWARVISH_CLOAK'));
        } else if (monsterNames[mm]?.includes('DWARF')) {
            // C: is_dwarf(ptr) — race bit not extracted; name stand-in
            if (rn2(7)) mongets(mtmp, otyp('DWARVISH_CLOAK'));
            if (rn2(7)) mongets(mtmp, otyp('IRON_SHOES'));
            if (!rn2(4)) {
                mongets(mtmp, otyp('DWARVISH_SHORT_SWORD'));
                if (rn2(2)) {
                    mongets(mtmp, otyp('DWARVISH_MATTOCK'));
                } else {
                    mongets(mtmp, rn2(2) ? otyp('AXE') : otyp('DWARVISH_SPEAR'));
                    mongets(mtmp, otyp('DWARVISH_ROUNDSHIELD'));
                }
                mongets(mtmp, otyp('DWARVISH_IRON_HELM'));
                if (!rn2(3)) mongets(mtmp, otyp('DWARVISH_MITHRIL_COAT'));
            } else {
                mongets(mtmp, !rn2(3) ? otyp('PICK_AXE') : otyp('DAGGER'));
            }
        }
        break;
    case 'S_HUMAN':
        // C: is_mercenary / is_elf / priest / ninja / guardian arms.
        // Envelope: mercenary weapon kit (guard default path exercised).
        if (is_mercenary(ptr)) {
            let w1 = 0;
            let w2 = 0;
            switch (mm) {
            case pm('WATCHMAN'):
            case pm('SOLDIER'):
                if (!rn2(3)) {
                    // C: makemon.c m_initweap — rn1(BEC_DE_CORBIN-PARTISAN+1,
                    // PARTISAN) until objects[w1].oc_skill == P_POLEARMS
                    // (lance/mattock historically mid-range; excluded by skill)
                    const partisan = otyp('PARTISAN');
                    const bec = otyp('BEC_DE_CORBIN');
                    do {
                        w1 = rn1(bec - partisan + 1, partisan);
                    } while ((game.objects[w1]?.oc_skill ?? 0) !== P_POLEARMS);
                    w2 = rn2(2) ? otyp('DAGGER') : otyp('KNIFE');
                } else {
                    w1 = rn2(2) ? otyp('SPEAR') : otyp('SHORT_SWORD');
                }
                break;
            case pm('SERGEANT'):
                w1 = rn2(2) ? otyp('FLAIL') : otyp('MACE');
                break;
            case pm('LIEUTENANT'):
                w1 = rn2(2) ? otyp('BROADSWORD') : otyp('LONG_SWORD');
                break;
            case pm('CAPTAIN'):
            case pm('WATCH_CAPTAIN'):
                w1 = rn2(2) ? otyp('LONG_SWORD') : otyp('SILVER_SABER');
                break;
            default:
                // PM_GUARD and other mercs
                if (!rn2(4)) w1 = otyp('DAGGER');
                if (!rn2(7)) w2 = otyp('SPEAR');
                break;
            }
            if (w1) mongets(mtmp, w1);
            if (!w2 && w1 !== otyp('DAGGER') && !rn2(4)) w2 = otyp('KNIFE');
            if (w2) mongets(mtmp, w2);
        } else if (is_elf(ptr)) {
            // C: makemon.c m_initweap S_HUMAN is_elf kit
            if (rn2(2)) {
                mongets(mtmp, rn2(2)
                    ? otyp('ELVEN_MITHRIL_COAT')
                    : otyp('ELVEN_CLOAK'));
            }
            if (rn2(2)) {
                mongets(mtmp, otyp('ELVEN_LEATHER_HELM'));
            } else if (!rn2(4)) {
                mongets(mtmp, otyp('ELVEN_BOOTS'));
            }
            if (rn2(2)) mongets(mtmp, otyp('ELVEN_DAGGER'));
            switch (rn2(3)) {
            case 0:
                if (!rn2(4)) mongets(mtmp, otyp('ELVEN_SHIELD'));
                if (rn2(3)) mongets(mtmp, otyp('ELVEN_SHORT_SWORD'));
                mongets(mtmp, otyp('ELVEN_BOW'));
                m_initthrow(mtmp, otyp('ELVEN_ARROW'), 12);
                break;
            case 1:
                mongets(mtmp, otyp('ELVEN_BROADSWORD'));
                if (rn2(2)) mongets(mtmp, otyp('ELVEN_SHIELD'));
                break;
            case 2:
                if (rn2(2)) {
                    mongets(mtmp, otyp('ELVEN_SPEAR'));
                    mongets(mtmp, otyp('ELVEN_SHIELD'));
                }
                break;
            }
            if (mm === pm('ELVEN_MONARCH')) {
                if (rn2(3) || (game.in_mklev && Is_earthlevel(game.u?.uz))) {
                    mongets(mtmp, otyp('PICK_AXE'));
                }
                if (!rn2(50)) mongets(mtmp, otyp('CRYSTAL_BALL'));
            }
        } else if (
            // C: ptr->msound == MS_PRIEST || quest_mon_represents_role(ptr, PM_CLERIC)
            // tables omit msound; only ALIGNED/HIGH_CLERIC carry MS_PRIEST
            mm === pm('ALIGNED_CLERIC') || mm === pm('HIGH_CLERIC')
        ) {
            // C: makemon.c m_initweap MS_PRIEST — mksobj(MACE,FALSE,FALSE)
            const otmp = mksobj(otyp('MACE'), false, false);
            otmp.spe = rnd(3);
            if (!rn2(2)) curse(otmp);
            mpickobj(mtmp, otmp);
        } else if (
            // C: ptr->msound == MS_GUARDIAN — tables omit msound; gate by mndx
            mm === pm('STUDENT') || mm === pm('ATTENDANT')
            || mm === pm('ABBOT') || mm === pm('ACOLYTE')
            || mm === pm('GUIDE') || mm === pm('APPRENTICE')
            || mm === pm('CHIEFTAIN') || mm === pm('PAGE')
            || mm === pm('ROSHI') || mm === pm('WARRIOR')
            || mm === pm('HUNTER') || mm === pm('THUG')
            || mm === pm('NEANDERTHAL')
        ) {
            // C: makemon.c m_initweap MS_GUARDIAN switch
            switch (mm) {
            case pm('STUDENT'):
            case pm('ATTENDANT'):
            case pm('ABBOT'):
            case pm('ACOLYTE'):
            case pm('GUIDE'):
            case pm('APPRENTICE'):
                if (rn2(2)) mongets(mtmp, rn2(3) ? otyp('DAGGER') : otyp('KNIFE'));
                if (rn2(5)) {
                    mongets(mtmp, rn2(3)
                        ? otyp('LEATHER_JACKET')
                        : otyp('LEATHER_CLOAK'));
                }
                if (rn2(3)) {
                    mongets(mtmp, rn2(3) ? otyp('LOW_BOOTS') : otyp('HIGH_BOOTS'));
                }
                if (rn2(3)) mongets(mtmp, otyp('POT_HEALING'));
                break;
            case pm('CHIEFTAIN'):
            case pm('PAGE'):
            case pm('ROSHI'):
            case pm('WARRIOR'):
                mongets(mtmp, rn2(3) ? otyp('LONG_SWORD') : otyp('SHORT_SWORD'));
                mongets(mtmp, rn2(3) ? otyp('CHAIN_MAIL') : otyp('LEATHER_ARMOR'));
                if (rn2(2)) {
                    mongets(mtmp, rn2(2) ? otyp('LOW_BOOTS') : otyp('HIGH_BOOTS'));
                }
                if (!rn2(3)) mongets(mtmp, otyp('LEATHER_CLOAK'));
                if (!rn2(3)) {
                    mongets(mtmp, otyp('BOW'));
                    m_initthrow(mtmp, otyp('ARROW'), 12);
                }
                break;
            case pm('HUNTER'):
                mongets(mtmp, rn2(3) ? otyp('SHORT_SWORD') : otyp('DAGGER'));
                if (rn2(2)) {
                    mongets(mtmp, rn2(2)
                        ? otyp('LEATHER_JACKET')
                        : otyp('LEATHER_ARMOR'));
                }
                mongets(mtmp, otyp('BOW'));
                m_initthrow(mtmp, otyp('ARROW'), 12);
                break;
            case pm('THUG'):
                mongets(mtmp, otyp('CLUB'));
                mongets(mtmp, rn2(3) ? otyp('DAGGER') : otyp('KNIFE'));
                if (rn2(2)) mongets(mtmp, otyp('LEATHER_GLOVES'));
                mongets(mtmp, rn2(2)
                    ? otyp('LEATHER_JACKET')
                    : otyp('LEATHER_ARMOR'));
                break;
            case pm('NEANDERTHAL'):
                mongets(mtmp, otyp('CLUB'));
                mongets(mtmp, otyp('LEATHER_ARMOR'));
                break;
            default:
                break;
            }
        }
        // quest_mon_represents_role(PM_CLERIC) + PM_NINJA deferred (C-JS-MAP)
        break;
    case 'S_DEMON':
        // C: named demon specials then is_demon → FALLTHROUGH default
        switch (mm) {
        case pm('BALROG'):
            mongets(mtmp, otyp('BULLWHIP'));
            mongets(mtmp, otyp('BROADSWORD'));
            break;
        case pm('ORCUS'):
            mongets(mtmp, otyp('WAN_DEATH'));
            break;
        case pm('HORNED_DEVIL'):
            mongets(mtmp, rn2(4) ? otyp('TRIDENT') : otyp('BULLWHIP'));
            break;
        case pm('DISPATER'):
            mongets(mtmp, otyp('WAN_STRIKING'));
            break;
        case pm('YEENOGHU'):
            mongets(mtmp, otyp('FLAIL'));
            break;
        default:
            break;
        }
        if (!is_demon(ptr)) break;
        m_initweap_default(mtmp, ptr);
        break;
    case 'S_TROLL':
        // C: makemon.c m_initweap S_TROLL — 50% polearm kit
        if (!rn2(2)) {
            switch (rn2(4)) {
            case 0: mongets(mtmp, otyp('RANSEUR')); break;
            case 1: mongets(mtmp, otyp('PARTISAN')); break;
            case 2: mongets(mtmp, otyp('GLAIVE')); break;
            case 3: mongets(mtmp, otyp('SPETUM')); break;
            }
        }
        break;
    case 'S_ANGEL':
    case 'S_KOP':
        // Deferred special cases (C-JS-MAP).
        break;
    case 'S_LIZARD':
        // C: makemon.c m_initweap S_LIZARD — salamander weapon kit
        if (mm === pm('SALAMANDER')) {
            mongets(mtmp, rn2(7) ? otyp('SPEAR')
                : rn2(3) ? otyp('TRIDENT') : otyp('STILETTO'));
        }
        break;
    default:
        m_initweap_default(mtmp, ptr);
        break;
    }

    if (mtmp.m_lev > rn2(75)) mongets(mtmp, rnd_offensive_item(mtmp));
}

// C ref: steal.c findgold — first GOLD_PIECE on chain (no container walk)
function findgold(argchain) {
    let chain = argchain;
    const gold = otyp('GOLD_PIECE');
    while (chain && chain.otyp !== gold) chain = chain.nobj;
    return chain || null;
}

// C ref: makemon.c mkmonmoney
export function mkmonmoney(mtmp, amount) {
    if (amount > 0) {
        const gold = mksobj(otyp('GOLD_PIECE'), false, false);
        gold.quan = amount;
        gold.owt = weight(gold);
        add_to_minv(mtmp, gold);
    }
}

// C ref: mondata.h attacktype — true if any mattk slot has aatyp
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

// C ref: teleport.c noteleport_level — ordinary flags; hell court deferred
function noteleport_level(mon) {
    // In_hell demon-court m_blocks_teleporting deferred (ordinary mklev rare)
    // C: noteleport && !is_covetous(mon->data) — covetous bypass tower flags
    const M3_COVETOUS = 0x001f;
    const covetous = !!((mon?.data?.mflags3 ?? 0) & M3_COVETOUS);
    if (game.level?.flags?.noteleport && !covetous) return true;
    if ((game.level?.flags?.stasis_until ?? -1) >= (game.moves ?? 0)) return true;
    return false;
}

/**
 * C ref: muse.c rnd_defensive_item
 * Named omissions: hell-court noteleport_level body.
 */
function rnd_defensive_item(mtmp) {
    const pm_ = mtmp.data;
    const difficulty = mon_difficulty(pm_?.mndx);
    const AT_EXPL = 13;
    if (is_animal(pm_) || attacktype(pm_, AT_EXPL) || mindless(pm_)
        || pm_?.mlet === 'S_GHOST' || pm_?.mlet === 'S_KOP') {
        return 0;
    }
    let trycnt = 0;
    for (;;) {
        switch (rn2(8 + (difficulty > 3 ? 1 : 0) + (difficulty > 6 ? 1 : 0)
            + (difficulty > 8 ? 1 : 0))) {
        case 6:
        case 9:
            if (noteleport_level(mtmp) && ++trycnt < 2) continue;
            if (!rn2(3)) return otyp('WAN_TELEPORTATION');
            // FALLTHROUGH
        case 0:
        case 1:
            return otyp('SCR_TELEPORTATION');
        case 8:
        case 10:
            if (!rn2(3)) return otyp('WAN_CREATE_MONSTER');
            // FALLTHROUGH
        case 2:
            return otyp('SCR_CREATE_MONSTER');
        case 3:
            return otyp('POT_HEALING');
        case 4:
            return otyp('POT_EXTRA_HEALING');
        case 5:
            return pm_?.mndx !== pm('PESTILENCE')
                ? otyp('POT_FULL_HEALING')
                : otyp('POT_SICKNESS');
        case 7: {
            // C: #define Sokoban svl.level.flags.sokoban_rules
            const Sokoban = !!(game.level?.flags?.sokoban_rules
                || game.level?.flags?.sokoban);
            if (Sokoban && rn2(4)) continue;
            if (is_floater(pm_) || mtmp.isshk || mtmp.isgd || mtmp.ispriest) {
                return 0;
            }
            return otyp('WAN_DIGGING');
        }
        default:
            return 0;
        }
    }
}

/**
 * C ref: muse.c rnd_misc_item — weak-monster misc inventory.
 * Named omissions: See_invisible gate detail; vampshifter; nonliving table.
 */
function rnd_misc_item(mtmp) {
    const pm_ = mtmp.data;
    const difficulty = pm_?.difficulty ?? 0;
    const AT_EXPL = 13;
    if (is_animal(pm_) || attacktype(pm_, AT_EXPL) || mindless(pm_)
        || pm_?.mlet === 'S_GHOST' || pm_?.mlet === 'S_KOP') {
        return 0;
    }
    if (difficulty < 6 && !rn2(30)) {
        return rn2(6) ? otyp('POT_POLYMORPH') : otyp('WAN_POLYMORPH');
    }
    if (!rn2(40) /* && !nonliving && !vampshifter */) {
        return otyp('AMULET_OF_LIFE_SAVING');
    }
    switch (rn2(3)) {
    case 0:
        if (mtmp.isgd) return 0;
        return rn2(6) ? otyp('POT_SPEED') : otyp('WAN_SPEED_MONSTER');
    case 1:
        // C: mpeaceful && !See_invisible → 0; See_invisible deferred → treat false
        if (mtmp.mpeaceful) return 0;
        return rn2(6) ? otyp('POT_INVISIBILITY') : otyp('WAN_MAKE_INVISIBLE');
    case 2:
        return otyp('POT_GAIN_LEVEL');
    default:
        return 0;
    }
}

// C ref: makemon.c m_initinv — S_GNOME candle, S_MUMMY wrap, S_QUANTMECH box,
//   S_GIANT gems, PM_SHOPKEEPER, trailing misc
function m_initinv(mtmp) {
    const ptr = mtmp.data;
    if (Is_rogue_level(game.u?.uz)) return;

    switch (ptr.mlet) {
    case 'S_GNOME':
        // C: In_mines && in_mklev → rn2(20), else rn2(60)
        if (!rn2((In_mines(game.u?.uz) && game.in_mklev) ? 20 : 60)) {
            const otmp = mksobj(
                rn2(4) ? otyp('TALLOW_CANDLE') : otyp('WAX_CANDLE'),
                true,
                false,
            );
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            // begin_burn when mpickobj fails and tile unlit — deferred (no RNG)
            mpickobj(mtmp, otmp);
        }
        break;
    case 'S_NYMPH':
        // C ref: makemon.c m_initinv S_NYMPH — mirror + potion of object detection
        if (!rn2(2)) mongets(mtmp, otyp('MIRROR'));
        if (!rn2(2)) mongets(mtmp, otyp('POT_OBJECT_DETECTION'));
        break;
    case 'S_GIANT':
        // C ref: makemon.c m_initinv S_GIANT — minotaur wand / giant gem stack
        if (ptr.mndx === pm('MINOTAUR')) {
            if (!rn2(8) || (game.in_mklev && Is_earthlevel(game.u?.uz))) {
                mongets(mtmp, otyp('WAN_DIGGING'));
            }
        } else if (is_giant(ptr)) {
            for (let cnt = rn2((mtmp.m_lev / 2) | 0); cnt; cnt--) {
                const otmp = mksobj(
                    rnd_class(otyp('DILITHIUM_CRYSTAL'), otyp('LUCKSTONE') - 1),
                    false,
                    false,
                );
                otmp.quan = rn1(2, 3);
                otmp.owt = weight(otmp);
                mpickobj(mtmp, otmp);
            }
        }
        break;
    case 'S_LEPRECHAUN':
        // C ref: makemon.c m_initinv S_LEPRECHAUN — mkmonmoney(d(level_difficulty(),30))
        mkmonmoney(mtmp, d(level_difficulty(), 30));
        break;
    case 'S_MUMMY':
        // C ref: makemon.c m_initinv S_MUMMY — rn2(7) → MUMMY_WRAPPING
        if (rn2(7)) mongets(mtmp, otyp('MUMMY_WRAPPING'));
        break;
    case 'S_QUANTMECH':
        // C ref: makemon.c m_initinv S_QUANTMECH — rare SchroedingersBox
        if (!rn2(20) && ptr.mndx === pm('QUANTUM_MECHANIC')) {
            const otmp = mksobj(otyp('LARGE_BOX'), false, false);
            const catcorpse = mksobj(otyp('CORPSE'), true, false);
            if (catcorpse) {
                otmp.spe = 1; // flag for special SchroedingersBox
                set_corpsenm(catcorpse, pm('HOUSECAT'));
                stop_timer(ROT_CORPSE, catcorpse);
                add_to_container(otmp, catcorpse);
                otmp.owt = weight(otmp);
            }
            mpickobj(mtmp, otmp);
        }
        break;
    case 'S_HUMAN':
        if (is_mercenary(ptr)) {
            // C ref: makemon.c m_initinv mercenary armor rounds
            let mac = 0;
            switch (ptr.mndx) {
            case pm('GUARD'): mac = -1; break;
            case pm('SOLDIER'): mac = 3; break;
            case pm('SERGEANT'): mac = 0; break;
            case pm('LIEUTENANT'): mac = -2; break;
            case pm('CAPTAIN'): mac = -3; break;
            case pm('WATCHMAN'): mac = 3; break;
            case pm('WATCH_CAPTAIN'): mac = -2; break;
            default: mac = 0; break;
            }
            const armBonus = (otmp) => {
                if (!otmp) return 0;
                const a_ac = objects()?.[otmp.otyp]?.a_ac
                    ?? game.objects?.[otmp.otyp]?.a_ac
                    ?? 0;
                return (a_ac | 0) + (otmp.spe | 0);
            };
            let otmp = null;
            // round 1: body armor
            if (mac < -1 && rn2(5)) {
                otmp = mongets(mtmp, rn2(5)
                    ? otyp('PLATE_MAIL') : otyp('CRYSTAL_PLATE_MAIL'));
            } else if (mac < 3 && rn2(5)) {
                otmp = mongets(mtmp, rn2(3)
                    ? otyp('SPLINT_MAIL') : otyp('BANDED_MAIL'));
            } else if (rn2(5)) {
                otmp = mongets(mtmp, rn2(3)
                    ? otyp('RING_MAIL') : otyp('STUDDED_LEATHER_ARMOR'));
            } else {
                otmp = mongets(mtmp, otyp('LEATHER_ARMOR'));
            }
            mac += armBonus(otmp);

            // round 2: helmets
            otmp = null;
            if (mac < 10 && rn2(3)) otmp = mongets(mtmp, otyp('HELMET'));
            else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, otyp('DENTED_POT'));
            mac += armBonus(otmp);

            // round 3: shields
            otmp = null;
            if (mac < 10 && rn2(3)) otmp = mongets(mtmp, otyp('SMALL_SHIELD'));
            else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, otyp('LARGE_SHIELD'));
            mac += armBonus(otmp);

            // round 4: boots
            otmp = null;
            if (mac < 10 && rn2(3)) otmp = mongets(mtmp, otyp('LOW_BOOTS'));
            else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, otyp('HIGH_BOOTS'));
            mac += armBonus(otmp);

            // round 5: gloves + cloak
            otmp = null;
            if (mac < 10 && rn2(3)) otmp = mongets(mtmp, otyp('LEATHER_GLOVES'));
            else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, otyp('LEATHER_CLOAK'));
            // add_ac(otmp) — mac unused after

            if (ptr.mndx === pm('WATCH_CAPTAIN')) {
                // better weapon rather than extra gear
            } else if (ptr.mndx === pm('WATCHMAN')) {
                if (rn2(3)) mongets(mtmp, otyp('TIN_WHISTLE'));
            } else if (ptr.mndx === pm('GUARD')) {
                // C: cursed tin whistle (TRUE,FALSE mksobj → next_ident + erosions)
                otmp = mksobj(otyp('TIN_WHISTLE'), true, false);
                curse(otmp);
                mpickobj(mtmp, otmp);
            } else {
                // soldiers and officers
                if (!rn2(3)) mongets(mtmp, otyp('K_RATION'));
                if (!rn2(2)) mongets(mtmp, otyp('C_RATION'));
                if (ptr.mndx !== pm('SOLDIER') && !rn2(3)) {
                    mongets(mtmp, otyp('BUGLE'));
                }
            }
        } else if (ptr.mndx === pm('SHOPKEEPER')) {
            mongets(mtmp, otyp('SKELETON_KEY'));
            switch (rn2(4)) {
            case 0:
                mongets(mtmp, otyp('WAN_MAGIC_MISSILE'));
                // FALLTHROUGH
            case 1:
                mongets(mtmp, otyp('POT_EXTRA_HEALING'));
                // FALLTHROUGH
            case 2:
                mongets(mtmp, otyp('POT_HEALING'));
                // FALLTHROUGH
            case 3:
                mongets(mtmp, otyp('WAN_STRIKING'));
                break;
            }
        } else if (
            // C: ptr->msound == MS_PRIEST || quest_mon_represents_role(ptr, PM_CLERIC)
            ptr.mndx === pm('ALIGNED_CLERIC') || ptr.mndx === pm('HIGH_CLERIC')
        ) {
            // C: makemon.c m_initinv MS_PRIEST — robe/cloak, shield, gold
            mongets(mtmp, rn2(7) ? otyp('ROBE')
                : rn2(3) ? otyp('CLOAK_OF_PROTECTION')
                         : otyp('CLOAK_OF_MAGIC_RESISTANCE'));
            mongets(mtmp, otyp('SMALL_SHIELD'));
            mkmonmoney(mtmp, rn1(10, 20));
        }
        // elf / quest_mon_represents_role / guardian invent arms deferred
        break;
    default:
        // Other m_initinv bodies (S_DEMON, S_WRAITH, S_LICH, …) deferred
        break;
    }

    // C: ordinary soldiers rarely have access to magic (or gold)
    if (ptr.mndx === pm('SOLDIER') && rn2(13)) return;

    if (mtmp.m_lev > rn2(50)) {
        mongets(mtmp, rnd_defensive_item(mtmp));
    }
    if (mtmp.m_lev > rn2(100)) {
        mongets(mtmp, rnd_misc_item(mtmp));
    }
    // C: likes_gold && !findgold(minvent) && !rn2(5) → mkmonmoney
    if (likes_gold(ptr) && !findgold(mtmp.minvent) && !rn2(5)) {
        mkmonmoney(mtmp, d(level_difficulty(), mtmp.minvent ? 5 : 10));
    }
}

// C ref: makemon.c m_initinv trailing defensive/misc rolls (compat alias)
function m_initinv_tail(mtmp) {
    m_initinv(mtmp);
}

// C ref: makemon.c makemon_rnd_goodpos()
function makemon_rnd_goodpos(mon, gpflags, cc) {
    let tryct = 0;
    let nx = 0;
    let ny = 0;
    let good = false;

    gpflags |= GP_AVOID_MONPOS;
    do {
        nx = rn1(COLNO - 3, 2);
        ny = rn2(ROWNO);
        good = (!game.in_mklev && cansee(nx, ny))
            ? false
            : goodpos(nx, ny, mon, gpflags);
    } while ((++tryct < 50) && !good);

    if (!good) {
        // Exhaustive scan: first pass skip cansee (unless Blind/in_mklev)
        const xofs = nx;
        const yofs = ny;
        const Blind = !!(game.u?.ublind || game.u?.Blind);
        let bl = (game.in_mklev || Blind) ? 1 : 0;

        for (; bl < 2; bl++) {
            let gp = gpflags;
            if (!bl) gp &= ~GP_CHECKSCARY;
            for (let dx = 0; dx < COLNO; dx++) {
                for (let dy = 0; dy < ROWNO; dy++) {
                    nx = ((dx + xofs) % (COLNO - 1)) + 1;
                    ny = ((dy + yofs) % (ROWNO - 1)) + 1;
                    if (bl === 0 && cansee(nx, ny)) continue;
                    if (goodpos(nx, ny, mon, gp)) {
                        cc.x = nx;
                        cc.y = ny;
                        return true;
                    }
                }
            }
            if (bl === 0 && (!mon || (mon.data?.mmove ?? 0))) {
                for (let stway = game.stairs; stway; stway = stway.next) {
                    if (stway.tolev?.dnum === game.u?.uz?.dnum && !rn2(2)) {
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

// C ref: makemon.c m_initgrp / m_initsgrp / m_initlgrp
function m_initgrp(mtmp, x, y, n, mmflags) {
    let cnt = rnd(n);
    const ulevel = game.u?.ulevel ?? 1;
    cnt = Math.trunc(cnt / (ulevel < 3 ? 4 : ulevel < 5 ? 2 : 1));
    if (!cnt) cnt = 1;

    const mm = { x, y };
    while (cnt--) {
        if (peace_minded(mtmp.data)) continue;
        if (enexto_gpflags(mm, mm.x, mm.y, mtmp.data, mmflags)) {
            const mon = makemon(mtmp.data, mm.x, mm.y, mmflags | MM_NOGRP);
            if (mon) {
                mon.mpeaceful = 0;
                mon.mavenge = 0;
                set_malign(mon);
            }
        }
    }
}

function m_initsgrp(mtmp, x, y, mmf) {
    m_initgrp(mtmp, x, y, 3, mmf);
}

function m_initlgrp(mtmp, x, y, mmf) {
    m_initgrp(mtmp, x, y, 10, mmf);
}

/**
 * makemon for fill_ordinary_room(makemon(NULL,...,MM_NOGRP)),
 * makedog(MM_EDOG|NO_MINVENT), and maybe_generate_rnd_mon(NULL,0,0).
 * C ref: makemon.c makemon()
 */
export function makemon(mdat, x, y, mmflags = 0) {
    let ptr = mdat;
    const anymon = !ptr;
    const allow_minvent = (mmflags & NO_MINVENT) === 0;
    const allowtail = (mmflags & MM_NOTAIL) === 0;
    const byyou = !!(game.u && x === game.u.ux && y === game.u.uy);
    const gpflags = GP_CHECKSCARY | GP_AVOID_MONPOS;

    if (!game.level?.flags?.rndmongen && !ptr) return null;

    // C: x==0 && y==0 → random location via makemon_rnd_goodpos
    if (x === 0 && y === 0) {
        const fakemon = ptr ? { data: ptr } : null;
        const cc = { x: 0, y: 0 };
        if (!makemon_rnd_goodpos(fakemon, gpflags, cc)) return null;
        x = cc.x;
        y = cc.y;
    } else if (byyou && !game.in_mklev) {
        const cc = { x: 0, y: 0 };
        if (!enexto_core(cc, game.u.ux, game.u.uy, ptr, gpflags)
            && !enexto_core(cc, game.u.ux, game.u.uy, ptr, gpflags & ~GP_CHECKSCARY)) {
            return null;
        }
        x = cc.x;
        y = cc.y;
    }

    // C: MON_AT(x,y) via level.monsters[][] — includes worm body segs
    // (rm.h place_worm_seg). Heads are on fmon; segs on _level_monsters.
    {
        let occupied = false;
        if (game.fmon) {
            for (const m of game.fmon) {
                if (m.mx === x && m.my === y) {
                    occupied = true;
                    break;
                }
            }
        }
        // D-0545: worm tail cells must reject like C MON_AT (no rndmonst burn)
        if (!occupied && worm_mon_at(x, y)) occupied = true;
        if (occupied) {
            if (!(mmflags & MM_ADJACENTOK)) return null;
            const cc = { x: 0, y: 0 };
            if (!enexto_core(cc, x, y, ptr, gpflags)) return null;
            x = cc.x;
            y = cc.y;
        }
    }

    if (!ptr) {
        // random common monster that can survive here
        let tryct = 0;
        do {
            ptr = rndmonst();
            if (!ptr) return null;
        } while (++tryct <= 50
            // throws_rocks(ptr) && In_sokoban deferred — not on ordinary dlvl1
            && !goodpos(x, y, { data: ptr }, gpflags));
    }

    const mtmp = {
        mx: x,
        my: y,
        mux: x,
        muy: y,
        data: ptr,
        mnum: ptr.mndx,
        mhp: 1,
        mhpmax: 1,
        m_lev: 0,
        female: 0,
        mpeaceful: 0,
        msleeping: (mmflags & MM_ASLEEP) ? 1 : 0,
        mcanmove: 1,
        mcansee: 1,
        movement: 0,
        mspeed: 0,
        permspeed: 0,
        seen_resistance: 0, // M_SEEN_* — saw hero resist (monst.h)
        mflee: 0,
        mconf: 0,
        mstun: 0,
        minvis: 0,
        mtame: 0,
        m_id: 0,
        mavenge: 0,
        malign: 0, // set_malign after mpeaceful
        mstrategy: 0,
        mtrapseen: 0,
        mtrack: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ],
        minvent: null,
        wormno: 0,
    };

    // C: MM_EGD / MM_ESHK / MM_EMIN / MM_EPRI → new* before m_id assignment
    if (mmflags & MM_EGD) newegd(mtmp);
    if (mmflags & MM_ESHK) neweshk(mtmp);
    if (mmflags & MM_EMIN) newemin(mtmp);
    if (mmflags & MM_EPRI) newepri(mtmp);

    mtmp.m_id = next_ident();
    if (mtmp.mextra?.egd) mtmp.mextra.egd.parentmid = mtmp.m_id;
    if (mtmp.mextra?.eshk) mtmp.mextra.eshk.parentmid = mtmp.m_id;
    if (mtmp.mextra?.emin) mtmp.mextra.emin.parentmid = mtmp.m_id;
    if (mtmp.mextra?.epri) mtmp.mextra.epri.parentmid = mtmp.m_id;

    // C: ptr->msound == MS_LEADER && quest_info(MS_LEADER) == mndx
    const ldr = game.urole?.ldrnum ?? NON_PM;
    const nem = game.urole?.neminum ?? NON_PM;
    if (ldr !== NON_PM && ldr != null && (ptr.mndx | 0) === (ldr | 0)) {
        if (!game.quest_status) game.quest_status = {};
        game.quest_status.leader_m_id = mtmp.m_id;
    }

    newmonhp(mtmp, ptr);

    const femaleok = !is_male(ptr) && !is_neuter(ptr);
    if (is_female(ptr)) mtmp.female = 1;
    else if (is_male(ptr)) mtmp.female = 0;
    // C: MS_LEADER/MS_NEMESIS gender from role_init (quest_status)
    else if (ldr !== NON_PM && ldr != null && (ptr.mndx | 0) === (ldr | 0))
        mtmp.female = game.quest_status?.ldrgend | 0;
    else if (nem !== NON_PM && nem != null && (ptr.mndx | 0) === (nem | 0))
        mtmp.female = game.quest_status?.nemgend | 0;
    else mtmp.female = femaleok ? rn2(2) : 0;

    mtmp.mpeaceful = peace_minded(ptr) ? 1 : 0;

    // C: ptr->mflags3 && !(mmflags & MM_NOWAIT) → STRAT_WAITFORU / STRAT_CLOSE
    if ((ptr.mflags3 | 0) && !(mmflags & MM_NOWAIT)) {
        if (ptr.mflags3 & M3_WAITFORU) mtmp.mstrategy |= STRAT_WAITFORU;
        if (ptr.mflags3 & M3_CLOSE) mtmp.mstrategy |= STRAT_CLOSE;
        // STRAT_APPEARMSG for WAITMASK|COVETOUS deferred
    }

    // C: link onto fmon before group/invent
    if (!game.fmon) game.fmon = [];
    game.fmon.unshift(mtmp);

    // C: PM_GHOST && !(MM_NONAME) → christen_monst(rndghostname())
    if (ptr.mndx === pm('GHOST') && !(mmflags & MM_NONAME)) {
        christen_monst(mtmp, rndghostname());
    }

    // C: set_malign after peaceful changes (orc/unicorn/emin deferred)
    set_malign(mtmp);

    // C: !in_mklev && byyou → newsym + set_apparxy before invent
    // Named omission: set_apparxy here (circular monmove↔makemon; dochug
    // calls it before combat — mux/muy init to spawn until then).
    if (!game.in_mklev && byyou) {
        newsym(mtmp.mx, mtmp.my);
    }

    // C: anymon && !(mmflags & MM_NOGRP) → small/large group
    if (anymon && (mmflags & MM_NOGRP) === 0) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3)) m_initlgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
            else m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        }
    }

    // C: switch (ptr->mlet) before invent — mimic + sleepers + spider/snake/eel.
    // Named omissions: orc/elf peace; unicorn align peace; bat hell speed.
    if (ptr.mlet === 'S_MIMIC') set_mimic_sym(mtmp);
    else if (ptr.mlet === 'S_SPIDER' || ptr.mlet === 'S_SNAKE') {
        // C: in_mklev → mkobj_at(RANDOM) then hideunder (mon.c hides_under arm)
        if (game.in_mklev) {
            if (mtmp.mx && mtmp.my) mkobj_at(RANDOM_CLASS, mtmp.mx, mtmp.my, true);
            // Inline hideunder hides_under path: seeit=0 in mklev; object just placed.
            const hx = mtmp.mx, hy = mtmp.my;
            const typ = game.level?.at(hx, hy)?.typ ?? 0;
            if (!IS_POOL(typ) && !IS_LAVA(typ) && objects_at(hx, hy)) {
                mtmp.mundetected = 1;
            }
        }
    } else if (ptr.mlet === 'S_EEL') {
        // C: makemon.c case S_EEL → hideunder(mtmp) when in_mklev.
        // Inline eel arm of mon.c hideunder (seeit=0 during mklev; no pline).
        if (game.in_mklev && mtmp.mx) {
            const hx = mtmp.mx, hy = mtmp.my;
            const typ = game.level?.at(hx, hy)?.typ ?? 0;
            if (IS_POOL(typ) && !Is_waterlevel(game.u?.uz)
                && !game.u?.Underwater) {
                mtmp.mundetected = 1;
            }
        }
    } else if (ptr.mlet === 'S_LIGHT' || ptr.mlet === 'S_ELEMENTAL') {
        // C: makemon.c S_LIGHT/S_ELEMENTAL — stalker & black light perminvis
        if (ptr.mndx === pm('STALKER') || ptr.mndx === pm('BLACK_LIGHT')) {
            mtmp.perminvis = 1;
            mtmp.minvis = 1;
        }
    } else if (ptr.mlet === 'S_LEPRECHAUN') mtmp.msleeping = 1;
    else if (ptr.mlet === 'S_JABBERWOCK' || ptr.mlet === 'S_NYMPH') {
        // C: if (rn2(5) && !u.uhave.amulet) msleeping = 1
        if (rn2(5) && !(game.u?.uhave?.amulet || game.u?.uhave_amulet))
            mtmp.msleeping = 1;
    }

    // C ref: makemon.c — cham / Vlad candelabrum / Wizard iswiz / newcham /
    // Croesus / MS_NEMESIS bell / Pestilence. Named omissions: first-Wizard
    // SPE_DIG on earth; Protection_from_shape_changers.
    let allow_minvent_local = allow_minvent;
    let mitem = -1; // STRANGE_OBJECT
    const PM_VLAD = pm('VLAD_THE_IMPALER');
    const PM_WIZ = pm('WIZARD_OF_YENDOR');
    const PM_CROESUS = pm('CROESUS');
    const PM_PESTILENCE = pm('PESTILENCE');
    if (ptr.mndx === PM_VLAD) mitem = otyp('CANDELABRUM_OF_INVOCATION');
    mtmp.cham = NON_PM;
    {
        const mcham = pm_to_cham(ptr.mndx);
        if (mcham !== NON_PM) {
            mtmp.cham = mcham;
            // Vlad stays in normal shape to carry the Candelabrum
            if (ptr.mndx !== PM_VLAD && newcham(mtmp, null, 0))
                allow_minvent_local = false;
        }
    }
    if (ptr.mndx === PM_WIZ) {
        // C: mtmp->iswiz = TRUE; context.no_of_wizards++
        mtmp.iswiz = true;
        if (!game.context) game.context = {};
        game.context.no_of_wizards = (game.context.no_of_wizards | 0) + 1;
        // SPE_DIG when first Wizard on earth — deferred (fire/air/water first)
    } else if (ptr.mndx === PM_CROESUS) {
        mitem = otyp('TWO_HANDED_SWORD');
    } else if (nem !== NON_PM && nem != null && (ptr.mndx | 0) === (nem | 0)) {
        // C: ptr->msound == MS_NEMESIS (tables omit msound → urole.neminum)
        mitem = otyp('BELL_OF_OPENING');
    } else if (ptr.mndx === PM_PESTILENCE) {
        mitem = otyp('POT_SICKNESS');
    }
    if (mitem >= 0 && allow_minvent_local) mongets(mtmp, mitem);

    // C: in_mklev ndemon/wumpus/long worm/giant eel sleep — before invent
    if (game.in_mklev) {
        if ((is_ndemon(ptr) || ptr.mndx === pm('WUMPUS')
            || ptr.mndx === pm('LONG_WORM') || ptr.mndx === pm('GIANT_EEL'))
            && !(game.u?.uhave?.amulet || game.u?.uhave_amulet)
            && rn2(5)) {
            mtmp.msleeping = 1;
        }
    }

    // C: PM_LONG_WORM → get_wormno / initworm / place_worm_tail_randomly
    // Named omissions: dprince bribe peace; raven BEC_DE_CORBIN; emin/angel
    // roaming after worm (still before invent in C — deferred).
    if (ptr.mndx === pm('LONG_WORM')) {
        mtmp.wormno = get_wormno();
        if (mtmp.wormno) {
            initworm(mtmp, allowtail ? rn2(5) : 0);
            if (count_wsegs(mtmp)) {
                place_worm_tail_randomly(mtmp, x, y);
            }
        }
    }

    // C: allow_minvent → is_armed? m_initweap; m_initinv; domestic saddle
    if (allow_minvent_local) {
        if (is_armed(ptr)) m_initweap(mtmp);
        m_initinv(mtmp);
        if (!rn2(100) && is_domestic(ptr)) {
            put_saddle_on_mon(null, mtmp);
        }
    }

    // C: emits_light → new_light_source(LS_MONSTER) (before invent in C;
    // after invent here — same for non-shapechanger fire emitters)
    {
        const ct = emits_light(ptr);
        if (ct > 0) new_light_source(mtmp.mx, mtmp.my, ct, LS_MONSTER, mtmp);
    }

    // C: !in_mklev → newsym so the mon shows up (even with MM_NOMSG)
    if (!game.in_mklev) {
        newsym(mtmp.mx, mtmp.my);
    }

    return mtmp;
}

/**
 * C ref: makemon.c set_mimic_sym — ordinary + shop (get_shop_item) paths.
 * Named omissions: maze town arms, altar Align2amask MCORPSENM,
 * Protection_from_shape_changers early-out when hero wears the amulet
 * (stubbed false at mklev).
 */
export function set_mimic_sym(mtmp) {
    if (!mtmp) return;
    // C: Protection_from_shape_changers → return (not active at mklev)
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const loc = game.level?.at?.(mx, my);
    const typ = loc?.typ ?? 0;
    const roomno = (loc?.roomno ?? 0) - ROOMOFFSET;
    let rt = 0;
    if (roomno >= 0 && game.level?.rooms?.[roomno])
        rt = game.level.rooms[roomno].rtype ?? 0;

    let ap_type = M_AP_OBJECT;
    let appear = STRANGE_OBJECT;
    let s_sym = S_MIMIC_DEF_SYM;
    let assignSym = false;

    const floorObj = objects_at(mx, my);
    if (floorObj) {
        ap_type = M_AP_OBJECT;
        appear = floorObj.otyp;
    } else if (IS_DOOR(typ) || IS_WALL(typ) || typ === SDOOR || typ === SCORR) {
        ap_type = M_AP_FURNITURE;
        // door/wall glyph pick has no RNG
        appear = 0;
    } else if (game.level?.flags?.is_maze_lev
        && !(In_mines(game.u?.uz) /* && in_town */)
        && !In_sokoban(game.u?.uz) && rn2(2)) {
        // C: !In_sokoban before rn2(2) — Sokoban must not burn this roll
        ap_type = M_AP_OBJECT;
        appear = STATUE;
    } else if (roomno < 0 && !t_at_local(mx, my)) {
        // C: roomno < 0 && !t_at → boulder
        ap_type = M_AP_OBJECT;
        appear = BOULDER;
    } else if (rt === ZOO || rt === VAULT) {
        ap_type = M_AP_OBJECT;
        appear = GOLD_PIECE;
    } else if (rt === DELPHI) {
        if (rn2(2)) {
            ap_type = M_AP_OBJECT;
            appear = STATUE;
        } else {
            ap_type = M_AP_FURNITURE;
            appear = 0; // S_fountain stub
        }
    } else if (rt === TEMPLE) {
        ap_type = M_AP_FURNITURE;
        appear = 0; // S_altar stub
    } else if (rt >= SHOPBASE) {
        // C: rn2(10) >= depth(&u.uz) → S_MIMIC_DEF; else get_shop_item
        if (rn2(10) >= depth_of_level(game.u?.uz)) {
            s_sym = S_MIMIC_DEF_SYM;
            assignSym = true;
        } else {
            s_sym = get_shop_item(rt - SHOPBASE);
            if (s_sym < 0) {
                ap_type = M_AP_OBJECT;
                appear = -s_sym;
            } else if (rt === FODDERSHOP && s_sym > MAXOCLASSES) {
                ap_type = M_AP_OBJECT;
                appear = rn2(2) ? LUMP_OF_ROYAL_JELLY : SLIME_MOLD;
            } else {
                if (s_sym === RANDOM_CLASS || s_sym >= MAXOCLASSES) {
                    s_sym = MIMIC_SYMS[rn2(MIMIC_SYMS.length - 2) + 2];
                }
                assignSym = true;
            }
        }
    } else {
        s_sym = MIMIC_SYMS[rn2(MIMIC_SYMS.length)];
        assignSym = true;
    }

    if (assignSym) {
        if (s_sym === MAXOCLASSES) {
            ap_type = M_AP_FURNITURE;
            appear = MIMIC_FURNSYMS[rn2(MIMIC_FURNSYMS.length)];
        } else {
            ap_type = M_AP_OBJECT;
            if (s_sym === S_MIMIC_DEF_SYM) {
                appear = STRANGE_OBJECT;
            } else if (s_sym === COIN_CLASS) {
                appear = GOLD_PIECE;
            } else {
                const otmp = mkobj(s_sym, false);
                appear = otmp?.otyp ?? STRANGE_OBJECT;
                // C: obfree — discard without floor/obj_resists
            }
        }
    }

    mtmp.m_ap_type = ap_type;
    mtmp.mappearance = appear;

    if (ap_type === M_AP_OBJECT
        && (appear === STATUE || appear === FIGURINE
            || appear === CORPSE || appear === EGG || appear === TIN)) {
        let mndx = rndmonnum();
        // nocorpse / hatch / tin Plan-B arms deferred
        if (!mtmp.mextra) mtmp.mextra = {};
        mtmp.mextra.mcorpsenm = mndx;
    } else if (ap_type === M_AP_OBJECT && appear === SLIME_MOLD) {
        if (!mtmp.mextra) mtmp.mextra = {};
        mtmp.mextra.mcorpsenm = game.context?.current_fruit ?? 0;
    }
    // altar Align2amask / block_point deferred
}

export { MM_NOGRP };
