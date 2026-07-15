// makemon.js — Monster creation / random selection.
// C ref: makemon.c — rndmonst_adj, makemon, newmonhp, peace_minded,
//   m_initweap / m_initthrow / mongets (ordinary armed-mlet envelope).

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';
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
} from './monsters.js';
import {
    NO_MINVENT, MM_NOGRP, MM_ASLEEP, MM_NONAME, MM_ESHK, MM_EGD,
    GP_CHECKSCARY, GP_AVOID_MONPOS, Is_rogue_level, In_mines,
    OBJ_MINVENT, COLNO, ROWNO, A_NONE, GEHENNOM, G_GONE,
    M_AP_OBJECT, M_AP_FURNITURE, IS_DOOR, IS_WALL,
    SDOOR, SCORR, ZOO, VAULT, DELPHI, TEMPLE, SHOPBASE, FODDERSHOP,
    ROOMOFFSET,
    AM_NONE, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, ALIGNWEIGHT,
} from './const.js';
import { enexto_core, enexto_gpflags, goodpos } from './teleport.js';
import { mksobj, mkobj, weight, objects_at, curse } from './mkobj.js';
import {
    objectNames, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, WAND_CLASS,
    FOOD_CLASS, COIN_CLASS, SCROLL_CLASS, POTION_CLASS, AMULET_CLASS,
    TOOL_CLASS, ROCK_CLASS, GEM_CLASS, SPBOOK_CLASS, MAXOCLASSES,
    RANDOM_CLASS, objects,
} from './objects.js';
import { cansee } from './vision.js';
import { christen_monst } from './do_name.js';
import { get_shop_item } from './shknam.js';

/** C ref: shknam.c neweshk — allocate eshk for MM_ESHK makemon. */
export function neweshk(mtmp) {
    if (!mtmp.mextra) mtmp.mextra = {};
    if (!mtmp.mextra.eshk) {
        mtmp.mextra.eshk = {
            parentmid: mtmp.m_id | 0,
            bill_p: null,
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
    return depth_of_level(game.u?.uz) || 1;
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
export function rndmonst_adj(minadj = 0, maxadj = 0) {
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

// C ref: makemon.c newmonhp()
// After rolling HP, if result equals basehp (all 1s / rnd(4)=1), boost +1 so
// level-0 and level-1 monsters always start with mhpmax >= 2.
function newmonhp(mon, ptr) {
    mon.m_lev = adj_lev(ptr);
    let basehp;
    if (!mon.m_lev) {
        basehp = 1; /* minimum is 1, increased to 2 below when rnd(4)=1 */
        mon.mhpmax = mon.mhp = rnd(4);
    } else {
        basehp = mon.m_lev | 0;
        mon.mhpmax = mon.mhp = d(basehp, 8);
        // Named omission: is_home_elemental mhp*=3; golem/rider/dragon arms
    }
    if (mon.mhpmax === basehp) {
        mon.mhpmax += 1;
        mon.mhp = mon.mhpmax;
    }
}

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

// C ref: muse.c rnd_offensive_item — ordinary non-animal path only
function rnd_offensive_item(mtmp) {
    const pm_ = mtmp.data;
    const difficulty = mon_difficulty(pm_.mndx);
    // animal / expl / mindless / ghost / kop → 0 (no RNG); early armed mlets skip
    if (pm_.mlet === 'S_GHOST' || pm_.mlet === 'S_KOP') return 0;
    if (difficulty > 7 && !rn2(35)) return otyp('WAN_DEATH');
    switch (rn2(9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0))) {
    case 0:
        // hard_helmet / amorphous omitted → C FALLTHROUGH to case 1 when soft helm;
        // for mklev commons without helmet, C returns SCR_EARTH. Match that.
        return otyp('SCR_EARTH');
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
                    // polearm pick — P_POLEARMS skill filter deferred → PARTISAN
                    w1 = otyp('PARTISAN');
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
        }
        // is_elf / MS_PRIEST / ninja / MS_GUARDIAN deferred
        break;
    case 'S_ANGEL':
    case 'S_KOP':
    case 'S_DEMON':
    case 'S_LIZARD':
    case 'S_TROLL':
        // Deferred special cases (C-JS-MAP). C breaks here (except demon→default).
        break;
    default: {
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
        break;
    }
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
    if (game.level?.flags?.noteleport /* && !is_covetous */) return true;
    if ((game.level?.flags?.stasis_until ?? -1) >= (game.moves ?? 0)) return true;
    return false;
}

/**
 * C ref: muse.c rnd_defensive_item
 * Named omissions: hell-court noteleport_level; is_covetous bypass.
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
            const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);
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

// C ref: makemon.c m_initinv — S_GNOME candle, PM_SHOPKEEPER kit, trailing misc
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
        }
        // elf / priest / guardian arms deferred
        break;
    default:
        // Other m_initinv bodies (nymph, giant, …) deferred
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

    // Does monster already exist at the position?
    if (game.fmon) {
        for (const m of game.fmon) {
            if (m.mx === x && m.my === y) return null;
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
    };

    // C: MM_EGD / MM_ESHK → new* before m_id assignment
    if (mmflags & MM_EGD) newegd(mtmp);
    if (mmflags & MM_ESHK) neweshk(mtmp);

    mtmp.m_id = next_ident();
    if (mtmp.mextra?.egd) mtmp.mextra.egd.parentmid = mtmp.m_id;
    if (mtmp.mextra?.eshk) mtmp.mextra.eshk.parentmid = mtmp.m_id;
    newmonhp(mtmp, ptr);

    const femaleok = !is_male(ptr) && !is_neuter(ptr);
    if (is_female(ptr)) mtmp.female = 1;
    else if (is_male(ptr)) mtmp.female = 0;
    else mtmp.female = femaleok ? rn2(2) : 0;

    mtmp.mpeaceful = peace_minded(ptr) ? 1 : 0;

    // C: link onto fmon before group/invent
    if (!game.fmon) game.fmon = [];
    game.fmon.unshift(mtmp);

    // C: PM_GHOST && !(MM_NONAME) → christen_monst(rndghostname())
    if (ptr.mndx === pm('GHOST') && !(mmflags & MM_NONAME)) {
        christen_monst(mtmp, rndghostname());
    }

    // C: set_malign after peaceful changes (orc/unicorn/emin deferred)
    set_malign(mtmp);

    // C: anymon && !(mmflags & MM_NOGRP) → small/large group
    if (anymon && (mmflags & MM_NOGRP) === 0) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3)) m_initlgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
            else m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        }
    }

    // C: switch (ptr->mlet) case S_MIMIC → set_mimic_sym before invent
    if (ptr.mlet === 'S_MIMIC') set_mimic_sym(mtmp);

    // C: allow_minvent → is_armed? m_initweap; m_initinv; domestic saddle
    if (allow_minvent) {
        if (is_armed(ptr)) m_initweap(mtmp);
        m_initinv(mtmp);
        if (!rn2(100) && is_domestic(ptr)) {
            // C: put_saddle_on_mon(NULL) — mksobj(SADDLE) when eligible
            put_saddle_on_mon(null, mtmp);
        }
    }

    return mtmp;
}

/**
 * C ref: makemon.c set_mimic_sym — ordinary + shop (get_shop_item) paths.
 * Named omissions: maze town/sokoban arms, altar Align2amask MCORPSENM,
 * Protection_from_shape_changers early-out when hero wears the amulet
 * (stubbed false at mklev), full t_at for corridor boulder.
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
        && !rn2(2)) {
        // Sokoban gate omitted — not on ordinary themerms path
        ap_type = M_AP_OBJECT;
        appear = STATUE;
    } else if (roomno < 0 && !game.ftrap?.some?.(t => t.tx === mx && t.ty === my)) {
        // t_at stub: no trap → boulder. Named omission: full t_at.
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
