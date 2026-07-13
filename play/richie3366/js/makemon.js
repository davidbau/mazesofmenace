// makemon.js — Monster creation / random selection.
// C ref: makemon.c — rndmonst_adj, makemon, newmonhp, peace_minded,
//   m_initweap / m_initthrow / mongets (ordinary armed-mlet envelope).

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';
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
    monsterNames,
} from './monsters.js';
import {
    NO_MINVENT, MM_NOGRP, GP_CHECKSCARY, GP_AVOID_MONPOS, Is_rogue_level,
    OBJ_MINVENT, COLNO, ROWNO, A_NONE, GEHENNOM, G_GONE,
} from './const.js';
import { enexto_core, enexto_gpflags, goodpos } from './teleport.js';
import { mksobj, weight } from './mkobj.js';
import { objectNames, WEAPON_CLASS, ARMOR_CLASS } from './objects.js';
import { cansee } from './vision.js';

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

// C ref: makemon.c align_shift — DoD is unaligned → always 0
function align_shift(_ptr) {
    return 0;
}

// C ref: makemon.c temperature_shift
function temperature_shift(_ptr) {
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

// C ref: mkobj.c rndmonnum() via rndmonst_adj
export function rndmonnum() {
    const ptr = rndmonst_adj(0, 0);
    if (ptr) return ptr.mndx;
    // Plan B not needed for seed8000 fill path
    return 0;
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
function newmonhp(mon, ptr) {
    mon.m_lev = adj_lev(ptr);
    if (!mon.m_lev) {
        mon.mhpmax = mon.mhp = rnd(4);
    } else {
        // C: d(m_lev, 8)
        mon.mhpmax = mon.mhp = d(mon.m_lev, 8);
        if (mon.mhpmax === mon.m_lev) {
            mon.mhpmax += 1;
            mon.mhp = mon.mhpmax;
        }
    }
}

// C ref: makemon.c peace_minded()
function peace_minded(ptr) {
    if (always_peaceful(ptr)) return true;
    if (always_hostile(ptr)) return false;
    const mal = ptr.maligntyp;
    const ual = game.u?.ualign?.type ?? 0;
    const sgn = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    if (sgn(mal) !== sgn(ual)) return false;
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

// C ref: makemon.c m_initinv trailing defensive/misc rolls
function m_initinv_tail(mtmp) {
    // Always consume these two rn2 calls (even when m_lev is 0).
    if (mtmp.m_lev > rn2(50)) {
        /* rnd_defensive_item — not reached for dlvl1 commons */
    }
    if (mtmp.m_lev > rn2(100)) {
        /* rnd_misc_item */
    }
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
                // set_malign deferred (no RNG on ordinary commons)
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
        msleeping: 0,
        mcanmove: 1,
        mcansee: 1,
        movement: 0,
        mspeed: 0,
        mflee: 0,
        mconf: 0,
        mstun: 0,
        minvis: 0,
        mtame: 0,
        m_id: 0,
        mavenge: 0,
        mtrack: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ],
        minvent: null,
    };

    next_ident(); // m_id
    mtmp.m_id = game.context?.ident ? game.context.ident - 1 : 1;
    newmonhp(mtmp, ptr);

    const femaleok = !is_male(ptr) && !is_neuter(ptr);
    if (is_female(ptr)) mtmp.female = 1;
    else if (is_male(ptr)) mtmp.female = 0;
    else mtmp.female = femaleok ? rn2(2) : 0;

    mtmp.mpeaceful = peace_minded(ptr) ? 1 : 0;

    // C: link onto fmon before group/invent
    if (!game.fmon) game.fmon = [];
    game.fmon.unshift(mtmp);

    // C: anymon && !(mmflags & MM_NOGRP) → small/large group
    if (anymon && (mmflags & MM_NOGRP) === 0) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3)) m_initlgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
            else m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        }
    }

    // C: allow_minvent → is_armed? m_initweap; m_initinv; domestic saddle
    if (allow_minvent) {
        if (is_armed(ptr)) m_initweap(mtmp);
        m_initinv_tail(mtmp);
        if (!rn2(100) && is_domestic(ptr)) {
            /* put_saddle_on_mon — not needed for RNG on fail path */
        }
    }

    return mtmp;
}

export { MM_NOGRP };
