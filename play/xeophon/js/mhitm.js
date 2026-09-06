import { currentHeroAttribute } from './attrib.js';
// js/mhitm.js — Port of NetHack 5.0 src/mhitm.c monster-vs-monster combat core.
//
// C references are paths under nethack-c/upstream:
//   src/mhitm.c    — fightm, mdisplacem, mattackm, failed_grab, hitmm,
//                    gazemm, engulf_target, gulpmm, explmm, mdamagem, mon_poly,
//                    paralyze_monst, sleep_monst, slept_monst, rustm,
//                    mswingsm, passivemm, xdrainenergym, attk_protection
//   src/uhitm.c    — mhitm_ad_* family + mhitm_adtyping + mhitm_knockback
//                    (shared with uhitm/mhitu; only the mhitm branches ported)
//   src/mon.c      — monnear, resist_conflict moved to mondata.c in 5.0,
//                    find_mac (src/worn.c), mm_aggression/mm_2way_aggression,
//                    monkilled, healmon, could_seduce (src/mhitu.c)
//   src/monmove.c  — m_move_aggress return-attack gating
//   src/zap.c      — resist() level/mr roll used by sleep_monst
//   src/worn.c     — find_mac()
//
// RNG-parity contract (matches the contest recorder):
//   Every rn2/rnd/d/rn1 call below is in the same order and with the same
//   arity as upstream C on the same code path.  In particular:
//     * melee attack attempt: rnd(20 + i)                 (mhitm.c:450+)
//     * hit resolution:       d(damn,damd)                (mhitm.c:792)
//       followed by knockback preamble rn2(3) + rn2(6)    (uhitm.c:5261-5268)
//     * passive resolution:   d(...) for passive dice,
//       then rn2(3) gate for live-defender passives       (mhitm.c:1267,1285)
//       acid passives also roll rn2(2)/rn2(30)/rn2(6)     (mhitm.c:1269-1281)
//     * return attack gate:   rn2(4) then rn2(NORMAL_SPEED)
//                                                           (monmove.c:2099-2100)
//
// Monster objects passed in are the runtime monsters used by js/allmain.js
// (game.level.monsters).  Permission/attack data comes from js/permonst.js
// (MONS by name) when available, with a legacy fallback to mon.data.attack
// ({dice, sides, verb}) and mon.data.mac/mlevel.
//
// Display, removal, and placement side effects go through injected hooks so
// this module has no import edge into js/allmain.js (which imports us).

import { rn2, rnd, rn1, d, getRngLog } from './rng.js';
import { game } from './gstate.js';
import { ARMOR_AC_BONUS, ARMOR_MAGIC_NEGATION, armorBonus, armorSlot } from './armor.js';
import { IDENTIFIED_AMULET_NAMES } from './o_init.js';
import { objectTypeData } from './object_knowledge.js';
import {
    Is_stronghold, STRAT_WAITMASK, STRAT_WAITFORU,
    NO_WEAPON_WANTED, NEED_WEAPON, NEED_HTH_WEAPON, W_ARMS, M_AP_TYPE, M_AP_OBJECT, M_AP_FURNITURE,
} from './const.js';
import {
    MONS, NATTK, NORMAL_SPEED, G_UNIQ,
    AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_HUGS,
    AT_SPIT, AT_ENGL, AT_BREA, AT_EXPL, AT_BOOM, AT_GAZE, AT_TENT, AT_WEAP, AT_MAGC,
    AD_PHYS, AD_FIRE, AD_COLD, AD_SLEE, AD_ELEC, AD_DRST, AD_DRDX, AD_DRCO, AD_ACID,
    AD_BLND, AD_SLOW, AD_CONF, AD_STUN, AD_PLYS, AD_STCK, AD_WRAP, AD_DGST, AD_WERE, AD_ENCH,
    AD_HEAL, AD_DISE, AD_SSEX, AD_SEDU, AD_SITM, AD_STON, AD_SLIM, AD_POLY,
    MR_FIRE, MR_COLD, MR_SLEEP, MR_POISON, MR_ELEC, MR_ACID, MR_STONE,
    PM_GRID_BUG, PM_PURPLE_WORM, PM_BABY_PURPLE_WORM, PM_SHRIEKER,
    PM_FLOATING_EYE, PM_GELATINOUS_CUBE, PM_MEDUSA, PM_SHADE, PM_GHOUL,
    PM_SKELETON, PM_STONE_GOLEM, PM_AMOROUS_DEMON,
    PM_KOBOLD_ZOMBIE, PM_ORC_ZOMBIE, PM_GIANT_ZOMBIE, PM_ETTIN, PM_ETTIN_ZOMBIE,
    PM_ARCHON, PM_RAVEN, PM_WRAITH, PM_STEAM_VORTEX,
    PM_GRAY_DRAGON, PM_BLUE_DRAGON, PM_YELLOW_DRAGON, PM_HIGH_CLERIC, PM_ALIGNED_CLERIC,
    PM_ELF_ZOMBIE, PM_HUMAN_ZOMBIE, PM_DWARF_ZOMBIE, PM_GNOME_ZOMBIE,
    S_ZOMBIE, S_KOBOLD, S_ORC, S_GIANT, S_HUMAN, S_KOP, S_HUMANOID, S_GNOME, S_NYMPH,
    S_XORN, S_DRAGON, S_JABBERWOCK, S_NAGA, S_MIMIC,
    MZ_HUGE, MZ_LARGE,
    bigmonst, is_elf, is_orc, is_dwarf, unsolid, haseyes, perceives, is_rider, nonliving,
    is_animal, is_golem, is_whirly, touch_petrifies, acidic, is_undead, is_demon, is_were,
    is_giant, is_minion, thick_skinned, PM_WOOD_GOLEM,
} from './permonst.js';
import { W_ARM, W_ARMOR, W_ACCESSORY, W_AMUL, W_WEP, W_ARMC, W_ARMG, W_ARMH, W_ARMF, MSLOW, MFAST, G_GENOD, PROTECTION } from './const.js';

/* include/monattk.h:108-112 combat result bits. */
export const M_ATTK_MISS = 0x0;    /* aggressor missed */
export const M_ATTK_HIT = 0x1;     /* aggressor hit defender */
export const M_ATTK_DEF_DIED = 0x2;/* defender died */
export const M_ATTK_AGR_DIED = 0x4;/* aggressor died */
export const M_ATTK_AGR_DONE = 0x8;/* aggressor is done with their turn */

/* Local info flag (distinct from const.js ALLOW_*): a monster candidate
 * square became attackable via mm_aggression(), not via pet/conflict
 * ALLOW_M.  Used by js/allmain.js to route the strike through the ported
 * mattackm() core instead of the legacy bespoke block. */
export const MM_AGGR = 0x02000000;

/* ------------------------------------------------------------------ */
/* Hooks injected by js/allmain.js (setMhitmHooks in module init).     */
/* ------------------------------------------------------------------ */
let hooks = {
    pline: null,              /* (msg) => void, C pline() */
    vis: null,                /* (magr, mdef) => boolean, C gv.vis computation */
    cansee: null,             /* (x, y) => boolean, hero LOS */
    canseemon: null,          /* (mon) => boolean */
    canspotmon: null,         /* (mon) => boolean */
    Monnam: null,             /* (mon) => subject-case name, C Monnam() */
    mon_nam: null,            /* (mon)  => object-case name, C mon_nam() */
    monkilled: null,          /* (mon, how) => void, C monkilled() sans fltxt */
    monstone: null,           /* (mon) => void, C monstone() */
    newsym: null,             /* (x, y) => void */
    wakeNear: null,           /* (x, y, distsq) => void, C wake_nearto */
};

export function setMhitmHooks(h) { hooks = { ...hooks, ...(h || {}) }; }

const pline = (msg) => hooks.pline && hooks.pline(msg);
const cansee = (x, y) => (hooks.cansee ? !!hooks.cansee(x, y) : true);
const canseemon = (m) => (hooks.canseemon ? !!hooks.canseemon(m) : !m.minvis);
const canspotmon = (m) => (hooks.canspotmon ? !!hooks.canspotmon(m) : canseemon(m));
const MONNAM = (m) => (hooks.Monnam ? hooks.Monnam(m) : `The ${nameOf(m)}`);
const mon_nam = (m) => (hooks.mon_nam ? hooks.mon_nam(m) : theName(m));
const s_suffix = (s) => (/s$/.test(s) ? `${s}'` : `${s}'s`);

/* C gv.vis during mhitm: mhitm.c:327-329. */
function calcVis(magr, mdef) {
    if (hooks.vis) return !!hooks.vis(magr, mdef);
    return (cansee(magr.mx, magr.my) && canspotmon(magr))
        || (cansee(mdef.mx, mdef.my) && canspotmon(mdef));
}
let visNow = false; /* module-local stand-in for C gv.vis during one mattackm */

/* ------------------------------------------------------------------ */
/* permonst resolution + runtime field helpers                         */
/* ------------------------------------------------------------------ */
let MONS_BY_NAME = null;
function monsByName() {
    if (!MONS_BY_NAME) {
        MONS_BY_NAME = new Map();
        for (const m of MONS) if (!MONS_BY_NAME.has(m.name)) MONS_BY_NAME.set(m.name, m);
    }
    return MONS_BY_NAME;
}

/* permonst entry for a runtime monster, or null for hand-made data
 * (were forms, 'guard', 'doppelganger role monster', ...). */
export function pmOf(mon) {
    const data = mon?.data || {};
    if (data.pm != null && MONS[data.pm] && MONS[data.pm].name === data.name)
        return MONS[data.pm];
    if (data.wereBeast || data.wereHuman) return null; /* js/were.js shapes */
    return monsByName().get(data.name || '') || null;
}

/* Runtime level: matches allmain.js convention (allmain.js:4619 et al). */
export function mLevel(mon) {
    const pm = pmOf(mon);
    return mon.m_lev ?? mon.data?.hpLevel ?? pm?.lvl ?? mon.data?.mlevel ?? 1;
}

/* C monsndx()-ish identity comparisons use pm index when resolvable. */
function pmIndex(mon) { return pmOf(mon)?.pm ?? -1; }
function sameSpecies(mon, pm) { return pmIndex(mon) === pm; }

const LEGACY_VERB_TO_AT = { bites: AT_BITE, kicks: AT_KICK, claws: AT_CLAW, hits: AT_CLAW, stings: AT_STNG, butts: AT_BUTT };

/* Attack list of NATTK-shaped {aatyp, adtyp, damn, damd} entries. */
export function attackList(mon) {
    const pm = pmOf(mon);
    const data = mon?.data || {};
    if (pm && !data.wereBeast && !data.wereHuman) return pm.attacks;
    const atk = data.attack;
    if (!atk) return EMPTY_ATTACKS;
    const aatyp = atk.aatyp && typeof atk.aatyp === 'number' ? atk.aatyp
        : (LEGACY_VERB_TO_AT[atk.verb] ?? AT_CLAW);
    return [
        { aatyp, adtyp: atk.adtyp === 'were' ? AD_WERE : AD_PHYS, damn: atk.dice ?? 1, damd: atk.sides ?? 2 },
        NO_ATTK_OBJ, NO_ATTK_OBJ, NO_ATTK_OBJ, NO_ATTK_OBJ, NO_ATTK_OBJ,
    ];
}
const NO_ATTK_OBJ = { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 }; /* src/monst.c NO_ATTK {0,0,0,0} */
const EMPTY_ATTACKS = [NO_ATTK_OBJ, NO_ATTK_OBJ, NO_ATTK_OBJ, NO_ATTK_OBJ, NO_ATTK_OBJ, NO_ATTK_OBJ];

/* C DEADMONSTER(): hp <= 0 or removed from the live monster list. */
export function deadMonster(mon) {
    if (!mon) return true;
    if ((mon.mhp ?? 1) <= 0) return true;
    return !(game.level?.monsters || []).includes(mon);
}

/* include/monst.h:251 helpless(): asleep or can't move.  JS monsters
 * carry mcanmove=false/0 when frozen (cmd.js:5988 convention); an unset
 * field means movable (C makemon.c:1296 initializes it TRUE). */
export function helpless(mon) {
    return !!(mon.msleeping || mon.mcanmove === false || mon.mcanmove === 0);
}

/* src/hacklib.c distmin()/dist2() ports. */
export function distmin(x0, y0, x1, y1) {
    let dx = x0 - x1, dy = y0 - y1;
    if (dx < 0) dx = -dx;
    if (dy < 0) dy = -dy;
    return dx < dy ? dy : dx;
}
export function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return dx * dx + dy * dy;
}

/* src/mon.c:2473-2480 monnear(): Chebyshev-1 (dist2 < 3); grid bugs
 * cannot reach diagonally.  include/hack.h:1414 NODIAG. */
export function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    if (distance === 2 && pmIndex(mon) === PM_GRID_BUG) return false;
    return distance < 3;
}

/* worn.c find_mac(): only equipped pieces count; erosion cannot remove
 * enchantment, and the amulet of guarding always contributes two points. */
export function findMac(mon) {
    const pm = pmOf(mon);
    let base = pm?.ac ?? mon?.data?.ac ?? mon?.data?.mac ?? 10;
    for (const obj of mon?.minvent || []) {
        const kind = monsterObjectKind(obj);
        const worn = obj.owornmask != null ? (obj.owornmask & (mon.misc_worn_check ?? ~W_WEP))
            : obj.worn && (obj.cls === 'armor' || obj.armor || Object.hasOwn(ARMOR_AC_BONUS, kind) || kind === 'amulet of guarding');
        if (!worn) continue;
        if (kind === 'amulet of guarding') { base -= 2; continue; }
        base -= armorBonus(obj, kind);
    }
    return Math.max(-99, Math.min(99, base));
}

/* include/monst.h:270 mon_resistancebits(): data->mresists | mextrinsics |
 * mintrinsics.  JS: permonst mres + mon.mintrinsics. */
function resBits(mon) {
    const pm = pmOf(mon);
    return ((pm?.mres ?? 0) | (mon?.mintrinsics ?? 0) | (mon?.mextrinsics ?? 0));
}
export const resistsFire = (m) => !!(resBits(m) & MR_FIRE);
export const resistsCold = (m) => !!(resBits(m) & MR_COLD);
export const resistsSleep = (m) => !!(resBits(m) & MR_SLEEP);
export const resistsElec = (m) => !!(resBits(m) & MR_ELEC);
export const resistsAcid = (m) => !!(resBits(m) & MR_ACID);
export const resistsSton = (m) => !!(resBits(m) & MR_STONE);
export const resistsPoison = (m) => !!(resBits(m) & MR_POISON);

/* include/mondata.h:71-76 digests()/enfolds()/slimeproof() via attack scan. */
export function digestsPm(pm) { return pm.attacks.some(a => a.aatyp === AT_ENGL && a.adtyp === AD_DGST); }
export function enfoldsPm(pm) { return pm.attacks.some(a => a.aatyp === AT_ENGL && a.adtyp === AD_WRAP); }
export function digests(mon) { const pm = pmOf(mon); return !!pm && digestsPm(pm); }
export function enfolds(mon) { const pm = pmOf(mon); return !!pm && enfoldsPm(pm); }

/* src/mon.c zombie_form() / zombie_maker() ports (mon.c, used by
 * mm_2way_aggression at mon.c:2390-2420 and by mdamagem corpse-decay
 * hooks). */
export function zombieForm(pmOrMon) {
    const pm = pmOrMon?.attacks ? pmOrMon : pmOf(pmOrMon);
    if (!pm) return -1;
    switch (pm.mlet) {
    case S_ZOMBIE: return -1;
    case S_KOBOLD: return PM_KOBOLD_ZOMBIE;
    case S_ORC: return PM_ORC_ZOMBIE;
    case S_GIANT: return pm.pm === PM_ETTIN ? PM_ETTIN_ZOMBIE : PM_GIANT_ZOMBIE;
    case S_HUMAN:
    case S_KOP: return is_elf(pm) ? PM_ELF_ZOMBIE : PM_HUMAN_ZOMBIE;
    case S_HUMANOID: return is_dwarf(pm) ? PM_DWARF_ZOMBIE : -1;
    case S_GNOME: return PM_GNOME_ZOMBIE;
    default: return -1;
    }
}
export function zombieMaker(mon) {
    const pm = pmOf(mon);
    if (!pm || mon.mcan) return false;
    switch (pm.mlet) {
    case S_ZOMBIE: return pm.pm !== PM_GHOUL && pm.pm !== PM_SKELETON;
    case 38 /* S_LICH */: return true;
    default: return false;
    }
}
/* uhitm.c unique_corpstat analog: G_UNIQ genocidal/unique types. */
function uniqueCorpstat(pm) { return !!pm && !!(pm.geno & G_UNIQ); }

/* src/mon.c:2428-2452 mm_aggression(): monster-adjacent-target specials
 * that grant ALLOW_M (plus ALLOW_TM for tame targets) outside Conflict.  */
export function mmAggression(magr, mdef) {
    /* don't allow pets to fight each other */
    if ((magr.mtame || magr.pet) && (mdef.mtame || mdef.pet)) return 0;
    const andx = pmIndex(magr);
    if ((andx === PM_PURPLE_WORM || andx === PM_BABY_PURPLE_WORM)
        && pmIndex(mdef) === PM_SHRIEKER)
        return ALLOW_M_BIT | ALLOW_TM_BIT;
    return (mm2wayAggression(magr, mdef) | mm2wayAggression(mdef, magr));
}
/* C ALLOW_M/ALLOW_TM values are mirrored locally to keep this module's
 * unit tests independent of const.js flag ordering. */
const ALLOW_M_BIT = 0x00080000;
const ALLOW_TM_BIT = 0x00100000;

/* src/mon.c:2384-2426 mm_2way_aggression(): two-way aggression cases.
 * The Wizard's-tower gate is not modeled in JS (no On_W_tower_level
 * tracking); Castle (Is_stronghold) and genocided-unique gates are kept. */
function mm2wayAggression(magr, mdef) {
    if (zombieMaker(magr) && zombieForm(mdef) !== -1) {
        if (magr.mgenmklev && mdef.mgenmklev) return 0;
        const pa = pmOf(magr), pd = pmOf(mdef);
        if (!Is_stronghold() && !uniqueCorpstat(pa) && !uniqueCorpstat(pd))
            return ALLOW_M_BIT | ALLOW_TM_BIT;
    }
    return 0;
}

/* src/mondata.c:1607-1613 resist_conflict(). */
export function resistConflict(mon) {
    const cha = currentHeroAttribute(5);
    const resistChance = Math.min(19, cha - mLevel(mon) + (game.u?.ulevel || 1));
    return rnd(20) > resistChance;
}

/* include/youprop-ish gender sanity for could_seduce(). */
function monGender(mon) { return mon.female ? 1 : 0; }

/* src/mhitu.c could_seduce(): 2 = nymph vs same/humanoid preference,
 * 1 = cross-gender succubus/incubus/nymph seduction. */
export function couldSeduce(magr, mdef, mattk) {
    const pagr = pmOf(magr);
    if (!pagr || is_animal(pagr)) return 0;
    const agrinvis = !!magr.minvis;
    const defpm = pmOf(mdef);
    const defperc = !!defpm && perceives(defpm);
    let adtyp = mattk ? mattk.adtyp
        : (pagr.attacks.some(a => a.adtyp === AD_SSEX) ? AD_SSEX
            : pagr.attacks.some(a => a.adtyp === AD_SEDU) ? AD_SEDU : AD_PHYS);
    if (adtyp === AD_SSEX) adtyp = AD_SEDU; /* SYSOPT_SEDUCE always on */
    if (agrinvis && !defperc && adtyp === AD_SEDU) return 0;
    if ((pagr.mlet !== S_NYMPH && pagr.pm !== PM_AMOROUS_DEMON)
        || (adtyp !== AD_SEDU && adtyp !== AD_SSEX && adtyp !== AD_SITM))
        return 0;
    return (monGender(magr) === 1 - monGender(mdef)) ? 1
        : (pagr.mlet === S_NYMPH ? 2 : 0);
}

/* src/mhitm.c:1303-1334 attk_protection(): armor slot that would shield a
 * petrifying touch.  Returned as the C W_* mask; ~0L becomes -1. */
export function attkProtection(aatyp) {
    switch (aatyp) {
    case AT_NONE: case AT_SPIT: case AT_EXPL: case AT_BOOM:
    case AT_GAZE: case AT_BREA: case AT_MAGC:
        return -1; /* ~0L — no defense needed */
    case AT_CLAW: case AT_TUCH: case AT_WEAP:
        return 0x10; /* W_ARMG */
    case AT_KICK:
        return 0x20; /* W_ARMF */
    case AT_BUTT:
        return 0x04; /* W_ARMH */
    case AT_HUGS:
        return 0x10 | 0x02; /* W_ARMG | W_ARMC */
    default: /* AT_BITE, AT_STNG, AT_ENGL, AT_TENT */
        return 0;
    }
}

/* src/mon.c:82-84 poly_when_stoned(): non-stone golems become stone golems. */
function polyWhenStoned(mon) {
    const pm = pmOf(mon);
    return !!pm && is_golem(pm) && pm.pm !== PM_STONE_GOLEM
        && !(game.mvitals?.[PM_STONE_GOLEM]?.mvflags & G_GENOD);
}

/* src/mon.c healmon() port (hp and maxhp deltas). */
export function healmon(mon, amt, overheal) {
    const oldhp = mon.mhp;
    const maxhp = mon.mhpmax ?? mon.mhp ?? 1;
    if ((mon.mhp ?? 1) + amt > maxhp + overheal) {
        mon.mhpmax = maxhp + overheal;
        mon.mhp = mon.mhpmax;
    } else {
        mon.mhp = (mon.mhp ?? 1) + amt;
        if (mon.mhp > maxhp) mon.mhpmax = mon.mhp;
    }
    return mon.mhp - oldhp;
}

/* src/mhitm.c:1156-1169 paralyze_monst(). */
export function paralyzeMonst(mon, amt) {
    if (amt > 127) amt = 127;
    mon.mcanmove = 0;
    mon.mfrozen = amt;
    mon.meating = 0;
    if (mon.mstrategy != null) mon.mstrategy &= ~STRAT_WAITFORU;
}

/* mhitm.c:sleep_monst. how is the existing JS class tag (wand=10),
 * zero for a spell, or -1 to bypass the magic-resistance roll. */
export function sleepMonst(mon, amt, how = -1) {
    const pm = pmOf(mon) || mon.data || {};
    if (how >= 0 && !mon.msleeping && !mon.mfrozen && pm.mlet === S_MIMIC
        && [M_AP_FURNITURE, M_AP_OBJECT].includes(M_AP_TYPE(mon))) {
        mon.m_ap_type = 0;
        mon.mappearance = 0;
        mon.appearObj = null; mon.appearGlyph = null; mon.appearColor = null;
        hooks.newsym?.(mon.mx, mon.my);
    }
    const armor = (mon.minvent || []).find(item => item.owornmask != null
        ? item.owornmask & W_ARM : item.worn && armorSlot(item) === 'body');
    const armorName = armor && (objectTypeData(armor)?.name || monsterObjectKind(armor));
    if (resistsSleep(mon) || mon.sleepResistance || mon.resistsSleep || mon.data?.sleepResistance
        || mon.data?.resistsSleep || mon.data?.defendsSleep
        || armorName === 'orange dragon scale mail' || armorName === 'orange dragon scales'
        || (how >= 0 && resistMon(mon, how, 0)))
        return 0; /* shieldeff is a visual-only effect */
    if (mon.mcanmove !== 0 && mon.mcanmove !== false) {
        mon.meating = 0;
        if (M_AP_TYPE(mon) && pm.mlet !== S_MIMIC) {
            mon.m_ap_type = 0; mon.mappearance = 0;
            mon.appearObj = null; mon.appearGlyph = null; mon.appearColor = null;
            hooks.newsym?.(mon.mx, mon.my);
        }
        amt += (mon.mfrozen || 0);
        if (amt > 0) {
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

/* zap.c:6100-6158 resist(): the source class chooses attack level;
 * callers apply the resulting damage and death effects. */
export function resistMon(mon, oclass, _damage) {
    let alev;
    switch (oclass) {
    case 10: alev = 12; break;  /* WAND_CLASS */
    case 12: alev = 10; break;  /* TOOL_CLASS */
    case 1: alev = 10; break;   /* WEAPON_CLASS */
    case 8: alev = 9; break;    /* SCROLL_CLASS */
    case 9: alev = 6; break;    /* POTION_CLASS */
    case 3: alev = 5; break;    /* RING_CLASS */
    default: alev = game.u?.ulevel || 1; break;
    }
    let dlev = mLevel(mon);
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const pm = pmOf(mon);
    return rn2(100 + alev - dlev) < (pm?.mr ?? mon.data?.mr ?? 0);
}

/* src/mhitm.c failed_grab() port: unsolid targets can't be held.
 * notonhead (long-worm tails) is not modeled in JS: always false. */
export function failedGrab(magr, mdef, mattk) {
    const pd = pmOf(mdef);
    if (unsolid(pd || {}) && (mattk.aatyp === AT_HUGS || mattk.adtyp === AD_WRAP
        || mattk.adtyp === AD_STCK || mattk.adtyp === AD_DGST)) {
        const verb = mattk.adtyp === AD_DGST ? 'gulp' : mattk.adtyp === AD_STCK ? 'adhere' : 'grab';
        if ((visNow && canspotmon(mdef)))
            pline(`${s_suffix(MONNAM(magr))} ${verb} attempt passes right through ${mon_nam(mdef)}!`);
        return true;
    }
    return false;
}

/* src/mhitm.c:24-37 noises(): off-screen attack feedback. */
function noises(magr, mattk) {
    if (game.u?.deaf) return;
    const farq = dist2(magr.mx, magr.my, game.u?.ux ?? magr.mx, game.u?.uy ?? magr.my) > 15;
    if (farq !== !!game._farNoise || ((game.moves || 0) - (game._noiseTime || 0)) > 10) {
        game._farNoise = farq ? 1 : 0;
        game._noiseTime = game.moves || 0;
        pline(`You hear ${mattk.aatyp === AT_EXPL ? 'an explosion' : 'some noises'}${farq ? ' in the distance' : ''}.`);
    }
}

/* src/mhitm.c:41-71 pre_mm_attack(): unhide/unmimic both combatants. */
function preMmAttack(magr, mdef) {
    if (mdef.mundetected) { mdef.mundetected = 0; hooks.newsym?.(mdef.mx, mdef.my); }
    if (magr.mundetected) { magr.mundetected = 0; hooks.newsym?.(magr.mx, magr.my); }
    /* M_AP_TYPE()/seemimic() display handling lives in js/allmain.js; the
     * attack itself always proceeds here, matching C insofar as JS mimics
     * attacking exposes them via allmain's own paths. */
}

/* src/mhitm.c:75-92 missmm(). */
export function missmm(magr, mdef, mattk) {
    preMmAttack(magr, mdef);
    if (visNow) {
        const verb = (magr.mcan || !couldSeduce(magr, mdef, mattk)) ? 'misses'
            : 'pretends to be friendly to';
        pline(`${MONNAM(magr)} ${verb} ${mon_nam(mdef)}.`);
    } else {
        noises(magr, mattk);
    }
}

function nameOf(mon) { return mon.data?.name || 'creature'; }
function theName(mon) { return mon.givenName || `the ${nameOf(mon)}`; }
function mhis(mon) { return mon.female ? 'her' : 'its'; }

/* ------------------------------------------------------------------ */
/* Monster weaponry (src/weapon.c): select_hwep (weapon.c:705-744),   */
/* mon_wield_item (weapon.c:801-955), hitval (weapon.c:1267-1300),    */
/* dmgval (weapon.c:216-355).  JS monster items are plain             */
/* { otyp, kind, cls, quan, spe?... } records from mklev mongets();   */
/* identity is matched by real kind name.                             */
/* ------------------------------------------------------------------ */

/* Monster equipment stores identity as an amulet index, a real name,
 * or actualKind when kind contains only its unidentified appearance. */
function monsterObjectKind(obj) {
    return String(IDENTIFIED_AMULET_NAMES[obj?.amuletIndex] || obj?.actualKind || obj?.kind || obj?.name || '').toLowerCase();
}

/* include/objects.h WEAPON(name, descr, known, mkprob, bimanual, prob,
 * wt, cost, wsdam, wldam, hitbon, dir, skill, material, color), reduced
 * to what monster weapon combat needs:
 *   realKind -> [oc_wsdam, oc_wldam, oc_bimanual, oc_hitbon, isSilver] */
const MONWPN = {
    'tsurugi':             [16,  8, 1,  2, false],
    'runesword':           [ 4,  6, 0,  0, false],
    'dwarvish mattock':    [12,  8, 1, -1, false],
    'two-handed sword':    [12,  6, 1,  0, false],
    'battle-axe':          [ 8,  6, 1,  0, false],
    'katana':              [10, 12, 0,  1, false],
    'unicorn horn':        [12, 12, 0,  0, false],
    'crysknife':           [10, 10, 0,  3, false],
    'trident':             [ 6,  4, 0,  0, false],
    'long sword':          [ 8, 12, 0,  0, false],
    'elven broadsword':    [ 6,  6, 0,  0, false],
    'broadsword':          [ 4,  6, 0,  0, false],
    'scimitar':            [ 8,  8, 0,  0, false],
    'silver saber':        [ 8,  8, 0,  0, true ],
    'morning star':        [ 4,  6, 0,  0, false],
    'elven short sword':   [ 8,  8, 0,  0, false],
    'dwarvish short sword':[ 7,  8, 0,  0, false],
    'short sword':         [ 6,  8, 0,  0, false],
    'orcish short sword':  [ 5,  8, 0,  0, false],
    'silver mace':         [ 6,  6, 0,  0, true ],
    'mace':                [ 6,  6, 0,  0, false],
    'axe':                 [ 6,  4, 0,  0, false],
    'dwarvish spear':      [ 8,  8, 0,  0, false],
    'silver spear':        [ 6,  8, 0,  0, true ],
    'elven spear':         [ 7,  8, 0,  0, false],
    'spear':               [ 6,  8, 0,  0, false],
    'orcish spear':        [ 5,  8, 0,  0, false],
    'flail':               [ 6,  4, 0,  0, false],
    'bullwhip':            [ 2,  1, 0,  0, false],
    'quarterstaff':        [ 6,  6, 1,  0, false],
    'javelin':             [ 6,  6, 0,  0, false],
    'aklys':               [ 6,  3, 0,  0, false],
    'club':                [ 6,  3, 0,  0, false],
    'pick-axe':            [ 6,  3, 0,  0, false],
    'rubber hose':         [ 4,  3, 0,  0, false],
    'war hammer':          [ 4,  4, 0,  0, false],
    'silver dagger':       [ 4,  3, 0,  2, true ],
    'elven dagger':        [ 5,  3, 0,  2, false],
    'dagger':              [ 4,  3, 0,  2, false],
    'orcish dagger':       [ 3,  3, 0,  2, false],
    'athame':              [ 4,  3, 0,  0, false],
    'scalpel':             [ 3,  3, 0,  0, false],
    'knife':               [ 3,  2, 0,  0, false],
    'worm tooth':          [ 2,  2, 0,  0, false],
    /* BOW() rows: sdam 2 / ldam 2 (include/objects.h:126-130) */
    'bow':                 [ 2,  2, 0,  0, false],
    'elven bow':           [ 2,  2, 0,  0, false],
    'orcish bow':          [ 2,  2, 0,  0, false],
    'yumi':                [ 2,  2, 0,  0, false],
    'long bow':            [ 2,  2, 0,  0, false],
    'sling':               [ 2,  2, 0,  0, false],
    'crossbow':            [ 2,  2, 0,  0, false],
};

/* weapon.c:691-703 hwep[] — melee weapon preference order for
 * select_hwep().  CORPSE leads the C list (cockatrice corpse pseudo-
 * weapon); JS monsters never carry corpse weapons though (documented
 * gap), so the entry is intentionally absent here. */
const HWEP_ORDER = [
    'tsurugi', 'runesword', 'dwarvish mattock', 'two-handed sword',
    'battle-axe', 'katana', 'unicorn horn', 'crysknife', 'trident',
    'long sword', 'elven broadsword', 'broadsword', 'scimitar',
    'silver saber', 'morning star', 'elven short sword',
    'dwarvish short sword', 'short sword', 'orcish short sword',
    'silver mace', 'mace', 'axe', 'dwarvish spear', 'silver spear',
    'elven spear', 'spear', 'orcish spear', 'flail', 'bullwhip',
    'quarterstaff', 'javelin', 'aklys', 'club', 'pick-axe',
    'rubber hose', 'war hammer', 'silver dagger', 'elven dagger',
    'dagger', 'orcish dagger', 'athame', 'scalpel', 'knife', 'worm tooth',
];

/* mondata.h:121 strongmonst() — M2_STRONG 0x04000000 (monflag.h:148). */
function strongMonst(mon) {
    const pm = pmOf(mon);
    return !!pm && ((pm.m2 || 0) & 0x04000000) !== 0;
}

/* weapon.c:517-541 mon_hates_silver()/mon_hates_blessings(): same
 * family — vampshifters, demons, undead, were, shade. */
function monHatesSilver(mon) {
    if (mon?.vampBase || mon?.data?.vampshifter) return true;
    const pm = pmOf(mon);
    if (!pm) return false;
    return pm.pm === PM_SHADE || is_demon(pm) || is_undead(pm) || is_were(pm);
}
const monHatesBlessings = monHatesSilver;

/* weapon.c:705-744 select_hwep(): best melee weapon from inventory.
 * No RNG. */
export function selectHwep(magr) {
    const strong = strongMonst(magr);
    const wearingShield = ((magr.misc_worn_check || 0) & W_ARMS) !== 0;
    const minvent = magr.minvent || [];
    if (is_giant(pmOf(magr) || {})) {
        /* giants love clubs (weapon.c:720-721) */
        const club = minvent.find(o => monsterObjectKind(o) === 'club');
        if (club) return club;
    }
    /* balrog bullwhip-greed (weapon.c:722-723) needs the hero's wielded
     * weapon; not modeled (documented gap). */
    for (const kind of HWEP_ORDER) {
        const bimanual = !!MONWPN[kind]?.[2];
        if (!((strong && !wearingShield) || !bimanual)) continue;
        if (MONWPN[kind]?.[4] && monHatesSilver(magr)) continue;
        const otmp = minvent.find(o => monsterObjectKind(o) === kind);
        if (otmp) return otmp;
    }
    return null;
}

/* weapon.c:801-955 mon_wield_item(), NEED_HTH_WEAPON slice (the
 * pick-axe/dig branches live in allmain's dig code).  No RNG.
 * Returns 1 when wielding took time (the pending attack is aborted). */
export function monWieldItem(magr) {
    if (magr.weapon_check === NO_WEAPON_WANTED) return 0; /* weapon.c:807-808 */
    const obj = selectHwep(magr);
    if (obj) {
        const cur = magr.mw || null;
        if (cur && monsterObjectKind(cur) === monsterObjectKind(obj)) {
            /* already wielding it (weapon.c:845-849) */
            magr.weapon_check = NEED_WEAPON;
            return 0;
        }
        // wield.c:mwelded requires both the weapon slot and a cursed
        // weapon, weapon-tool, punishment item, or tin opener.
        const currentKind = monsterObjectKind(cur);
        if (cur?.cursed && ((cur.owornmask & W_WEP) || cur.wielded)
            && (cur.cls === 'weapon' || MONWPN[currentKind]
                || ['heavy iron ball', 'iron chain', 'tin opener'].includes(currentKind))) {
            if (canseemon(magr)) {
                const name = hooks.donameMonsterWeapon ? hooks.donameMonsterWeapon(obj)
                    : `a ${monsterObjectKind(obj)}`;
                pline(`${MONNAM(magr)} tries to wield ${name}.`);
                pline(`The ${currentKind} is welded to ${magr.female ? 'her' : 'his'} ${MONWPN[currentKind]?.[2] ? 'hands' : 'hand'}!`);
                cur.bknown = true;
            }
            magr.weapon_check = NO_WEAPON_WANTED;
            return 1;
        }
        magr.mw = obj;
        if (cur) {
            cur.owornmask = (cur.owornmask || 0) & ~W_WEP;
            cur.wielded = false;
        }
        magr.weapon_check = NEED_WEAPON;
        if (canseemon(magr)) {
            /* weapon.c:870-896: "The FOO wields BAR!" (exclaim variant) */
            const name = hooks.donameMonsterWeapon ? hooks.donameMonsterWeapon(obj)
                : `a ${monsterObjectKind(obj)}`;
            pline(`${MONNAM(magr)} wields ${name}!`);
            if (obj.cursed) {
                pline(`The ${monsterObjectKind(obj)} welds itself to ${s_suffix(mon_nam(magr))} ${MONWPN[monsterObjectKind(obj)]?.[2] ? 'hands' : 'hand'}!`);
                obj.bknown = true;
            }
        }
        obj.owornmask = W_WEP;
        return 1;
    }
    magr.weapon_check = NEED_WEAPON;
    return 0;
}

/* weapon.c:747-799 possibly_unwield(): monsters never unwield on their
 * own; JS minvent entries are never removed while wielded except by the
 * steal pipeline (which clears mon.mw itself).  No RNG — no-op port. */

/* weapon.c:1267-1300 hitval(): weapon to-hit bonus — deterministic,
 * consumes no RNG. */
export function hitvalMonsterWeapon(otmp, mdef) {
    const kind = monsterObjectKind(otmp);
    const info = MONWPN[kind];
    let tmp = 0;
    if (info) tmp += (otmp.spe || 0) + (info[3] || 0);
    if (otmp.blessed && monHatesBlessings(mdef)) tmp += 2;
    /* spear vs kebabable targets (weapon.c:71-73, 1339?) */
    if (['spear', 'elven spear', 'orcish spear', 'dwarvish spear',
         'silver spear'].includes(kind)) {
        const mlet = pmOf(mdef)?.mlet;
        if (mlet === S_XORN || mlet === S_DRAGON || mlet === S_JABBERWOCK
            || mlet === S_NAGA || mlet === S_GIANT) tmp += 2;
    }
    /* trident-vs-swimmer / pick-vs-xorn bonuses (weapon.c:171-177): rare
     * and target-class-scoped; documented gap. */
    return tmp;
}

/* weapon.c:216-355 dmgval(): weapon damage roll vs a target. */
export function dmgvalMonsterWeapon(otmp, mdef) {
    const kind = monsterObjectKind(otmp);
    const info = MONWPN[kind];
    if (!info) return 0; /* not a weapon: no weapon-dice portion */
    const [ws, wl] = info;
    const pd = pmOf(mdef);
    const big = mdef && mdef.data && pd ? bigmonst(pd) : false;
    let tmp = 0;
    if (big) {
        /* weapon.c:221-267 big-target branch */
        if (wl) tmp = rnd(wl);
        if (['morning star', 'partisan', 'runesword', 'elven broadsword',
             'broadsword'].includes(kind)) tmp += 1;
        else if (['flail', 'ranseur', 'voulge'].includes(kind)) tmp += rnd(4);
        else if (['halberd', 'spetum'].includes(kind)) tmp += rnd(6);
        else if (['battle-axe', 'bardiche', 'trident'].includes(kind)) tmp += d(2, 4);
        else if (['tsurugi', 'dwarvish mattock', 'two-handed sword'].includes(kind)) tmp += d(2, 6);
    } else {
        /* weapon.c:269-296 small/medium-target branch */
        if (ws) tmp = rnd(ws);
        if (['mace', 'silver mace', 'war hammer', 'flail', 'spetum',
             'trident'].includes(kind)) tmp += 1;
        else if (['battle-axe', 'bardiche', 'bill-guisarme', 'guisarme',
                  'lucern hammer', 'morning star', 'ranseur', 'broadsword',
                  'elven broadsword', 'runesword', 'voulge'].includes(kind)) tmp += rnd(4);
    }
    /* weapon.c:297-301: enchantment */
    tmp += (otmp.spe || 0);
    if (tmp < 0) tmp = 0;
    /* weapon.c:306-308: soft (<=LEATHER) material vs thick hide — among
     * wieldables only bullwhip qualifies. */
    if (kind === 'bullwhip' && pd && thick_skinned(pd)) tmp = 0;
    /* weapon.c:328-341 weapon-vs-type bonuses */
    if (otmp.blessed && monHatesBlessings(mdef)) tmp += rnd(4);
    if (kind === 'axe' && pd && pd.pm === PM_WOOD_GOLEM) tmp += rnd(4);
    if (info[4] && monHatesSilver(mdef)) tmp += rnd(20);
    /* artifact_light/double-damage adjustments unported: JS monsters
     * never wield artifacts (documented gap). */
    if (tmp > 0) {
        tmp -= (otmp.oeroded || 0); /* greatest_erosion() */
        if (tmp < 1) tmp = 1;
    }
    return tmp;
}

/* Default kill handler mirroring monkilled() (mon.c) minus corpse/mdrop
 * richness; js/allmain.js supplies hook overrides with the full drop
 * pipeline for live game-state kills.  mhitm.c calls monkilled(mdef, "",
 * adtyp) which prints "S is killed!" (or "is destroyed!" for nonliving). */
function defaultMonKilled(mon) {
    const pm = pmOf(mon);
    placeMonsterCorpseDrop(mon);
    game.level.monsters = (game.level?.monsters || []).filter(m => m !== mon);
    mon.mhp = 0;
    mon.dead = true;
    hooks.newsym?.(mon.mx, mon.my);
    return pm;
}
function placeMonsterCorpseDrop(mon) {
    /* C mondead() -> m_detach inventory drop + possible corpse.  The
     * effect hook is supplied by allmain; the no-hook fallback keeps the
     * monster's inventory on the floor stack so scavenging still works. */
    if (hooks.dropInventory) hooks.dropInventory(mon);
}

/* ------------------------------------------------------------------ */
/* Per-attack-type damage resolution (uhitm.c mhitm branches)          */
/* ------------------------------------------------------------------ */
export function monsterMagicNegation(mon, kindOf = monsterObjectKind) {
    // mhitu.c:1089-1145. Protection augments the best worn armor once;
    // innate priest/minion protection only supplies a minimum of MC1.
    const pm = pmOf(mon);
    const hero = !!mon.isHero, u = game.u || {};
    let mc = 0, viaAmulet = false, protection = hero
        ? !!(u.EProtection || u.uprops?.[PROTECTION]?.extrinsic) : pm?.pm === PM_HIGH_CLERIC;
    for (const obj of (hero ? game.inventory : mon.minvent) || []) {
        const kind = kindOf(obj);
        const wornArmor = (obj.owornmask & W_ARMOR) || (obj.worn && obj.cls === 'armor');
        const wornAmulet = (obj.owornmask & W_AMUL) || (obj.worn && obj.cls === 'amulet');
        if (wornArmor) mc = Math.max(mc, ARMOR_MAGIC_NEGATION[kind] || 0);
        else if (wornAmulet) viaAmulet = kind === 'amulet of guarding';
        if (protection) continue;
        const wearmask = W_ARMOR | W_ACCESSORY
            | (obj.cls === 'weapon' || MONWPN[kind] ? W_WEP : 0);
        const worn = !!((obj.owornmask & wearmask) || obj.worn || (mon.mw === obj && (wearmask & W_WEP)));
        const artifact = String(obj.artifact || obj.oartifact || '').toLowerCase().replace(/^the /, '');
        if (worn && (['cloak of protection', 'ring of protection', 'amulet of guarding'].includes(kind)
            || ['mitre of holiness', 'tsurugi of muramasa'].includes(artifact))) protection = true;
    }
    if (protection) return Math.min(3, mc + (viaAmulet ? 2 : 1));
    if (mc < 1 && (hero ? ((u.HProtection || u.uprops?.[PROTECTION]?.intrinsic) && u.ublessed > 0) || u.uspellprot
        : pm?.pm === PM_ALIGNED_CLERIC || is_minion(pm || {}))) mc = 1;
    return mc;
}

function mhitmMgcAtkNegated(magr, mdef, verbosely) {
    // uhitm.c:73-90 cancellation skips armor and its random draw.
    if (magr.mcan) return true;
    const negated = rn2(10) < 3 * monsterMagicNegation(mdef);
    if (negated) {
        if (verbosely && visNow && canseemon(mdef))
            pline(`${MONNAM(mdef)} avoids harm.`);
        return true;
    }
    return false;
}

/* uhitm.c mhitm_ad_* monster-vs-monster branches.  Returns true when the
 * handler set mhm.done (caller must skip hp application). */
function mhitmAdtyping(magr, mattk, mdef, mhm) {
    const pa = pmOf(magr), pd = pmOf(mdef);
    switch (mattk.adtyp) {
    case AD_BLND: {
        /* mondata.c:can_blnd, with no projectile object on the melee path. */
        const blind = mdef.mcansee === false || mdef.mcansee === 0;
        let canBlind = haseyes(pd || {}) && !(blind && !mdef.mblinded)
            && !(pa?.pm === PM_RAVEN && pd?.pm === PM_RAVEN);
        switch (mattk.aatyp) {
        case AT_EXPL: case AT_BOOM: case AT_GAZE: case AT_MAGC: case AT_BREA:
            /* resists_blnd(): light emitters and temporarily blinded or
             * sleeping targets resist light; physical attacks can extend it.
             * Artifact light resistance remains part of the artifact gap. */
            canBlind &&= !magr.mcan && !blind && !mdef.mblinded && !mdef.msleeping
                && !attackList(mdef).some(a => a.adtyp === AD_BLND
                    && (a.aatyp === AT_EXPL || a.aatyp === AT_GAZE));
            break;
        case AT_WEAP: case AT_SPIT: case AT_NONE:
            canBlind = false;
            break;
        case AT_ENGL:
            canBlind &&= !mdef.msleeping;
            break;
        case AT_CLAW:
            canBlind &&= !(mdef.minvent || []).some(obj => {
                if (!(obj.owornmask & W_ARMH) && !obj.worn) return false;
                const index = ['helmet', 'helm of caution', 'helm of opposite alignment',
                    'helm of telepathy'].indexOf(monsterObjectKind(obj));
                const description = game._object_descriptions?.helms?.[index]
                    ?? obj.appearance;
                return description === 'visored helmet';
            });
            break;
        case AT_TUCH: case AT_STNG:
            canBlind &&= !magr.mcan;
            break;
        }
        if (canBlind) {
            if (visNow && !blind && canspotmon(mdef))
                pline(`${MONNAM(mdef)} is blinded.`);
            /* uhitm.c:mhitm_ad_blnd rolls again instead of using HP damage. */
            mdef.mblinded = Math.min(127, (mdef.mblinded || 0) + d(mattk.damn, mattk.damd));
            mdef.mcansee = false;
            mdef.mstrategy = (mdef.mstrategy || 0) & ~STRAT_WAITFORU;
        }
        mhm.damage = 0;
        return false;
    }
    case AD_SLOW: {
        /* uhitm.c:mhitm_ad_slow retains ordinary attack damage. */
        const negated = mhitmMgcAtkNegated(magr, mdef, false);
        /* mondata.c:defended treats adult dragons as their own scales;
         * artifact.c:defends gives blue scales protection from slowing. */
        const adultDragon = pd?.pm >= PM_GRAY_DRAGON && pd?.pm <= PM_YELLOW_DRAGON;
        const defended = adultDragon ? pd.pm === PM_BLUE_DRAGON
            : (mdef.minvent || []).some(obj => ((obj.owornmask & W_ARM) || obj.worn)
                && ['blue dragon scales', 'blue dragon scale mail'].includes(monsterObjectKind(obj)));
        if (defended) return false;
        if (!negated && !['slow', MSLOW, -1].includes(mdef.mspeed)) {
            const oldSpeed = mdef.mspeed || 0;
            const permanent = mdef.permspeed ?? oldSpeed;
            /* worn.c:mon_adjust_speed(-1) removes intrinsic haste first;
             * worn speed boots still determine the effective speed. */
            mdef.permspeed = permanent === 'fast' || permanent === MFAST ? 0 : 'slow';
            const boots = (mdef.minvent || []).some(obj => (obj.owornmask || obj.worn)
                && monsterObjectKind(obj) === 'speed boots');
            mdef.mspeed = boots ? 'fast' : mdef.permspeed;
            const changed = mdef.mspeed !== oldSpeed && !(oldSpeed === MFAST && mdef.mspeed === 'fast');
            if (changed && !game.in_mklev && (pd?.mmove ?? mdef.data?.mmove) && !mdef.mfrozen
                && !mdef.msleeping && canseemon(mdef))
                pline(`${MONNAM(mdef)} seems to be moving slower.`);
            mdef.mstrategy = (mdef.mstrategy || 0) & ~STRAT_WAITFORU;
            if (changed && visNow && canspotmon(mdef))
                pline(`${MONNAM(mdef)} slows down.`);
        }
        return false;
    }
    case AD_CONF:
        /* uhitm.c:mhitm_ad_conf checks, but never sets, attacker cooldown. */
        if (!magr.mcan && !mdef.mconf && !magr.mspec_used) {
            if (visNow && canseemon(mdef)) pline(`${MONNAM(mdef)} looks confused.`);
            mdef.mconf = 1;
            mdef.mstrategy = (mdef.mstrategy || 0) & ~STRAT_WAITFORU;
        }
        return false;
    case AD_STCK:
        /* uhitm.c:mhitm_ad_stck only attaches to the hero, never another monster. */
        if (mhitmMgcAtkNegated(magr, mdef, false)) mhm.damage = 0;
        return false;
    case AD_WRAP:
        /* uhitm.c:mhitm_ad_wrap uses cancellation without an armor MC roll. */
        if (magr.mcan) mhm.damage = 0;
        if (!mhm.damage && (canseemon(magr) || canseemon(mdef)))
            pline(`${MONNAM(magr)} brushes against ${mon_nam(mdef)}.`);
        return false;
    case AD_STUN: {
        /* uhitm.c:4374-4396 mhitm branch */
        if (magr.mcan) return false;
        if (visNow && canseemon(mdef)) {
            const stag = staggers(pd);
            pline(`${MONNAM(mdef)} ${stag} for a moment.`);
        }
        mdef.mstun = 1;
        return mhitmAdPhys(magr, mattk, mdef, mhm);
    }
    case AD_WERE: /* uhitm.c:4284-4288: m-mon were hits are plain damage */
    case AD_HEAL:
        return mhitmAdPhys(magr, mattk, mdef, mhm);
    case AD_PHYS:
        return mhitmAdPhys(magr, mattk, mdef, mhm);
    case AD_FIRE: case AD_COLD: case AD_ELEC: {
        /* uhitm.c mhitm_ad_{fire,cold,elec} mhitm branches: negation roll,
         * resistance zeroes damage; destroy_items() item loss unported. */
        if (mhitmMgcAtkNegated(magr, mdef, true)) { mhm.damage = 0; return false; }
        const kindMsgs = {
            [AD_FIRE]: ['is on fire!', "doesn't heat"],
            [AD_COLD]: ['is covered in frost!', "doesn't seem to chill"],
            [AD_ELEC]: ['gets jolted!', "doesn't shock"],
        };
        const [[onMsg, offMsg], resistFn, label] = {
            [AD_FIRE]: [kindMsgs[AD_FIRE], resistsFire, 'fire'],
            [AD_COLD]: [kindMsgs[AD_COLD], resistsCold, 'frost'],
            [AD_ELEC]: [kindMsgs[AD_ELEC], resistsElec, 'zap'],
        }[mattk.adtyp];
        if (visNow && canseemon(mdef)) pline(`${MONNAM(mdef)} ${onMsg}`);
        if (resistFn(mdef)) {
            if (visNow && canseemon(mdef))
                pline(`The ${label} ${offMsg} ${mon_nam(mdef)}!`);
            mhm.damage = 0;
        }
        return false;
    }
    case AD_ACID: {
        /* uhitm.c:2768-2784 mhitm branch */
        if (magr.mcan) { mhm.damage = 0; return false; }
        if (resistsAcid(mdef)) {
            if (visNow && canseemon(mdef))
                pline(`${MONNAM(mdef)} is covered in acid, but it seems harmless.`);
            mhm.damage = 0;
        } else if (visNow && canseemon(mdef)) {
            pline(`${MONNAM(mdef)} is covered in acid!`);
            pline(`It burns ${mon_nam(mdef)}!`);
        }
        if (!rn2(30)) hooks.erodeCorrode?.(mdef);   /* erode_armor(ERODE_CORRODE) */
        if (!rn2(6)) hooks.acidDamageWep?.(mdef);   /* acid_damage(MON_WEP(mdef)) */
        return false;
    }
    case AD_DRST: case AD_DRCO: case AD_DRDX: {
        /* uhitm.c:3170-3177 mhitm branch: negation, 1/8 poison application,
         * +rn1(10,6) poison damage (no stat loss for monsters in 5.0 here:
         * mhitm_really_poison only adds damage). */
        if (!magr.mcan) {
            if (!mhitmMgcAtkNegated(magr, mdef, false) && !rn2(8)) {
                if (visNow && canspotmon(magr))
                    pline(`${s_suffix(MONNAM(magr))} sting was poisoned!`);
                if (resistsPoison(mdef)) {
                    if (visNow && canspotmon(mdef) && canspotmon(magr))
                        pline(`The poison doesn't seem to affect ${mon_nam(mdef)}.`);
                } else {
                    mhm.damage += rn1(10, 6);
                    if (mhm.damage >= (mdef.mhp ?? 1) && visNow && canspotmon(mdef))
                        pline(`The poison was deadly...`);
                }
            }
        }
        return false;
    }
    case AD_SLEE: {
        /* uhitm.c:3524-3541 mhitm branch — note the double sleep_monst
         * call (and its double rnd(10)) is upstream behavior. */
        if (!mdef.msleeping && sleepMonst(mdef, rnd(10), -1) && sleepMonst(mdef, rnd(10), -1)) {
            if (visNow && canspotmon(mdef))
                pline(`${MONNAM(mdef)} is put to sleep by ${mon_nam(magr)}.`);
            mdef.mstrategy = (mdef.mstrategy ?? 0) & ~STRAT_WAITFORU;
        }
        return false;
    }
    case AD_DGST: {
        /* uhitm.c:4575-4640 mhitm_ad_dgst mhitm branch: swallow-digest
         * deals full remaining hp; rider bellies/verbose burp/wake_nearto
         * are message-only.  corpse_chance()/pet nutrition bookkeeping is
         * not wired (see audit). */
        if (pd && is_rider(pd)) {
            if (visNow && canseemon(magr)) pline(`${MONNAM(magr)} vomits violently and drops dead`);
            if (hooks.monkilled) hooks.monkilled(magr, mattk.adtyp); else defaultMonKilled(magr);
            if (deadMonster(magr)) { mhm.hitflags = M_ATTK_AGR_DIED; mhm.done = true; return true; }
            mhm.hitflags = M_ATTK_MISS; mhm.done = true; return true;
        }
        mhm.damage = mdef.mhp ?? 1;
        return false;
    }
    case AD_PLYS: {
        /* uhitm.c:3468-3479 mhitm branch: floating eye-style active paralysis. */
        if (mdef.mcanmove !== 0 && !magr.mcan) {
            if (!rn2(3) && !mhitmMgcAtkNegated(magr, mdef, false)) {
                if (visNow && canspotmon(mdef))
                    pline(`${MONNAM(mdef)} is frozen by ${mon_nam(magr)}.`);
                paralyzeMonst(mdef, rnd(10));
            }
        }
        return false;
    }
    default:
        /* uhitm.c:4845 default: unported damage types deal no extra damage. */
        mhm.damage = 0;
        return false;
    }
}
function staggers(pd) {
    /* C stagger(mondata "stagger"): quadrupeds "stagger", others generic;
     * keep the simple pluralized verb used by mhitu feedback. */
    return 'reels';
}

/* uhitm.c:4033-4140 mhitm_ad_phys mhitm branch. */
function mhitmAdPhys(magr, mattk, mdef, mhm) {
    const pa = pmOf(magr), pd = pmOf(mdef);
    let mwep = monWep(magr);
    if (mattk.aatyp !== AT_WEAP && mattk.aatyp !== AT_CLAW) mwep = null;

    /* shade_miss() unported (needs silver/blessed weapon object rules). */
    if (mattk.aatyp === AT_KICK && pd && thick_skinned(pd)) {
        /* uhitm.c:4143-4146: kick cannot hurt thick-skinned monsters */
        mhm.damage = 0;
    } else if (mwep) { /* non-Null 'mwep' implies AT_WEAP || AT_CLAW */
        /* corpse pseudo-weapon petrification (uhitm.c:4151-4156): JS
         * monsters never wield corpses; documented gap. */
        mhm.damage += dmgvalMonsterWeapon(mwep, mdef);
        /* gauntlets of power check (uhitm.c:4159-4161): monsters' worn-armor
         * pipeline is not wired into mvm; documented gap. */
        if (mhm.damage < 1) /* uhitm.c:4162-4163 */
            mhm.damage = 1;
        /* artifact_hit() on oartifact does not occur in JS (monster items
         * carry no oartifact); the non-artifact hit message was already
         * delivered by hitmm()'s default branch (mhitm.c:690-692). */
        if (mhm.damage) rustm(mdef, mwep); /* uhitm.c:4172 */
        if ((mwep.opoisoned || mwep.permapoisoned) && !rn2(4)) {
            /* uhitm.c:4173-4179 poison application; JS monster weapons are
             * never poisoned by mkmon init, so this gate never fires. */
            hooks.poisonMonster?.(magr, mattk, mdef, mhm);
        }
    } else if (pa?.pm === PM_PURPLE_WORM && pd?.pm === PM_SHRIEKER) {
        /* uhitm.c:4181-4188: bite leaves the shrieker alive so the engulf
         * attack can swallow it whole */
        if (mhm.damage >= (mdef.mhp ?? 1) && (mdef.mhp ?? 1) > 1)
            mhm.damage = (mdef.mhp ?? 1) - 1;
    }
    return false;
}
function monWep(mon) { return mon?.mw || null; }

/* uhitm.c:5247+ mhitm_knockback(): the rn2(3)/rn2(6) preamble ALWAYS
 * consumes draws; only the physical displacement (needs enexto/move
 * placement) is JS-unported.  Returns false: no reposition applied. */
export function mhitmKnockback(magr, _mdef, mattk) {
    const knockdistance = !rn2(3) ? 2 : 1; /* rn2(3) ? 1 : 2 */
    let chance = 6;
    void knockdistance;
    if (rn2(chance)) return false;
    if (!((mattk.adtyp === AD_PHYS)
        && (mattk.aatyp === AT_CLAW || mattk.aatyp === AT_KICK
            || mattk.aatyp === AT_BUTT || mattk.aatyp === AT_WEAP)))
        return false;
    const attacks = attackList(magr);
    if (attacks.some(a => a.aatyp === AT_ENGL) || attacks.some(a => a.aatyp === AT_HUGS))
        return false;
    /* C then computes defx/defy, runs test_move/hurtle, and places mdef at
     * the knocked-to square.  That placement (enexto/boulder collision)
     * requires allmain-level map mutation and is deliberately not wired;
     * only the draws above are parity-critical. */
    return false;
}

/* ------------------------------------------------------------------ */
/* mdamagem() — mhitm.c:780-909                                        */
/* ------------------------------------------------------------------ */
export function mdamagem(magr, mdef, mattk, mwep = null, dieroll = 0) {
    const pa = pmOf(magr), pd = pmOf(mdef);
    const mhm = { damage: d(mattk.damn || 0, mattk.damd || 0), hitflags: M_ATTK_MISS,
        permdmg: 0, specialdmg: 0, dieroll, done: false }; /* d(0, x) == 0 draws */

    /* Petrification on touching the defender's skin (mhitm.c:799-833). */
    if ((touch_petrifies(pd || {}) || (mattk.adtyp === AD_DGST && pmIndex(mdef) === PM_MEDUSA))
        && !resistsSton(magr)) {
        const protector = attkProtection(mattk.aatyp);
        let wornitems = magr.misc_worn_check || 0;
        if (mwep) wornitems |= W_ARMG;
        if (protector === 0 || (protector !== -1 && (wornitems & protector) !== protector)) {
            if (polyWhenStoned(magr)) {
                /* mon_to_stone(): becomes a stone golem, no damage dealt */
                if (hooks.polyToStone) hooks.polyToStone(magr); else transformToStoneGolem(magr);
                return M_ATTK_HIT;
            }
            if (visNow && canspotmon(magr))
                pline(`${MONNAM(magr)} turns to stone!`);
            if (hooks.monstone) hooks.monstone(magr); else defaultMonKilled(magr);
            if (!deadMonster(magr)) return M_ATTK_HIT; /* lifesaved */
            if ((magr.mtame || magr.pet) && !visNow)
                pline('You have a peculiarly sad feeling for a moment, then it passes.');
            return M_ATTK_AGR_DIED;
        }
    }

    mhitmAdtyping(magr, mattk, mdef, mhm);

    /* uhitm.c:5296-5297 ordering: knockback (rolls) runs even when the
     * handler zeroed damage.  JS never applies the displacement (see
     * mhitmKnockback), so the early-return branch can't trigger. */
    mhitmKnockback(magr, mdef, mattk);

    if (mhm.done) return mhm.hitflags;
    if (!mhm.damage) return mhm.hitflags;

    mdef.mhp = (mdef.mhp ?? 1) - mhm.damage;
    if (mdef.mhp < 1) {
        /* monkilled(mdef, "", adtyp) -> mondead() (mhitm.c:866-878) */
        const killMsg = hooks.monkilled ? null
            : (cansee(mdef.mx, mdef.my)
                ? `${MONNAM(mdef)} is ${nonliving(pd || {}) ? 'destroyed' : 'killed'}!` : null);
        if (killMsg) pline(killMsg);
        if (hooks.monkilled) hooks.monkilled(mdef, mattk.adtyp); else defaultMonKilled(mdef);
        if (!deadMonster(mdef)) return deriveHitflags(mhm.hitflags); /* lifesaved */
        if (mhm.hitflags === M_ATTK_AGR_DIED)
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);

        /* Post-digest side effects (mhitm.c:880-897): cham/newcham,
         * slime conversion, wraith growth, nurse heal, corpse hunger.
         * Not wired: newcham/grow_up live in allmain. */
        if (mattk.adtyp === AD_DGST && pd?.pm != null) {
            if (pd.pm === PM_WRAITH) hooks.growUp?.(magr, mdef);
        }
        const growUpResult = hooks.growUp ? !!hooks.growUp(magr, mdef) : true;
        return (M_ATTK_DEF_DIED | (growUpResult ? 0 : M_ATTK_AGR_DIED));
    }
    return deriveHitflags(mhm.hitflags);
}
function deriveHitflags(hf) { return (hf === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT; }

function transformToStoneGolem(magr) {
    const pm = monsByName().get('stone golem');
    if (!pm) { defaultMonKilled(magr); return; }
    magr.data = { ...(magr.data || {}), name: pm.name, mac: pm.ac, mlevel: pm.lvl, mmove: pm.mmove };
    magr.m_lev = pm.lvl;
    hooks.newsym?.(magr.mx, magr.my);
}

/* ------------------------------------------------------------------ */
/* hitmm()/gazemm()/gulpmm()/explmm()/mon_poly()/rustm()               */
/* ------------------------------------------------------------------ */
export function hitmm(magr, mdef, mattk, mwep = null, dieroll = 0) {
    /* mhitm.c:650-789 */
    preMmAttack(magr, mdef);
    const compat = !magr.mcan ? couldSeduce(magr, mdef, mattk) : 0;
    /* shade_miss() unported (needs silver/blessed weapon object rules). */

    if (visNow) {
        if (compat) {
            pline(`${MONNAM(magr)} ${mdef.mcansee !== false ? 'smiles at' : 'talks to'} ${mon_nam(mdef)} ${
                compat === 2 ? 'engagingly' : 'seductively'}.`);
        } else {
            let buf = null;
            switch (mattk.aatyp) {
            case AT_BITE: buf = `${MONNAM(magr)} bites`; break;
            case AT_STNG: buf = `${MONNAM(magr)} stings`; break;
            case AT_BUTT: buf = `${MONNAM(magr)} butts`; break;
            case AT_TUCH: buf = `${MONNAM(magr)} touches`; break;
            case AT_TENT: buf = `${s_suffix(MONNAM(magr))} tentacles suck`; break;
            case AT_HUGS:
                if (game.u?.ustuck !== magr) buf = `${MONNAM(magr)} squeezes`;
                break;
            default:
                /* mhitm.c:688-692: weapon (AT_WEAP/AT_CLAW+mwep) and generic
                 * hits print "Foo hits Bar." unless an artifact message is
                 * due (JS monsters never wield artifacts). */
                if (!mwep || !mwep.oartifact) buf = `${MONNAM(magr)} hits`;
                break;
            }
            if (buf) pline(`${buf} ${mon_nam(mdef)}.`);
            /* silver-sears message (mhitm.c:694-716): silver weapons vs
             * silver-hating defenders — JS monster items are not silver
             * flagged on this path; documented gap. */
        }
    } else {
        noises(magr, mattk);
    }
    return mdamagem(magr, mdef, mattk, mwep, dieroll);
}

/* mhitm.c:445+ gazemm (non-Medusa subset; mon_reflects/artifact mirrors
 * are not wired — documented in the audit). */
export function gazemm(magr, mdef, mattk) {
    const archon = pmIndex(magr) === PM_ARCHON && mattk.adtyp === AD_BLND;
    if (mdef.mundetected) mdef.mundetected = 0;
    if (visNow) {
        const alt = archon && magr.mcansee === false;
        pline(`${MONNAM(magr)} gazes at ${canspotmon(mdef) ? mon_nam(mdef) : 'something'}...`);
        void alt;
    }
    if (magr.mcan || mdef.mcansee === false || mdef.mcansee === 0
        || (!archon && (magr.mcansee === false || magr.mcansee === 0))
        || (magr.minvis && !(pmOf(mdef) && perceives(pmOf(mdef))))
        || mdef.msleeping) {
        if (visNow && canspotmon(mdef)) pline('but nothing happens.');
        return M_ATTK_MISS;
    }
    if (archon) {
        /* mhitm.c:gazemm blinds before the stun and ordinary damage rolls.
         * Light resistance prevents both effects without consuming RNG. */
        mhitmAdtyping(magr, mattk, mdef, { damage: 0 });
        if (mdef.mcansee !== false) {
            if (visNow && canspotmon(mdef)) pline('but nothing happens.');
            return M_ATTK_MISS;
        }
        if (rn2(2)) mdef.mstun = 1;
    }
    return mdamagem(magr, mdef, mattk, null, 0);
}

/* mhitm.c engulf_target()/gulpmm() core (trap/liquid relocation hooks
 * omitted; see audit). */
export function engulfTarget(magr, mdef) {
    const pa = pmOf(magr), pd = pmOf(mdef);
    if (!pa || !pd) return false;
    if (pd.size >= MZ_HUGE || (pa.size < pd.size && !is_whirly(pa))) return false;
    if (magr.mtrapped || mdef.mtrapped) return false;
    return true;
}

export function gulpmm(magr, mdef, mattk) {
    if (!engulfTarget(magr, mdef)) return M_ATTK_MISS;
    if (visNow) {
        pline(`${MONNAM(magr)} ${
            digests(magr) ? 'swallows' : enfolds(magr) ? 'encloses' : 'engulfs'} ${mon_nam(mdef)}.`);
    }
    /* vampshifter expel path unported (newcham lives in allmain). */
    const ax = magr.mx, ay = magr.my;
    const dx = mdef.mx, dy = mdef.my;
    magr.mx = dx; magr.my = dy;
    hooks.newsym?.(ax, ay);
    hooks.newsym?.(dx, dy);
    const status = mdamagem(magr, mdef, mattk, null, 0);
    if ((status & (M_ATTK_AGR_DIED | M_ATTK_DEF_DIED)) === (M_ATTK_AGR_DIED | M_ATTK_DEF_DIED)) {
        /* both died */
    } else if (status & M_ATTK_DEF_DIED) {
        /* aggressor stays on defender's square; minliquid/mintrap hook
         * optional */
        if (hooks.minTrapKills && hooks.minTrapKills(magr)) return status | M_ATTK_AGR_DIED;
    } else if (status & M_ATTK_AGR_DIED) {
        mdef.mx = dx; mdef.my = dy;
        hooks.newsym?.(mdef.mx, mdef.my);
    } else {
        if (cansee(dx, dy)) {
            pline(`${MONNAM(mdef)} is ${
                digests(magr) ? 'regurgitated' : enfolds(magr) ? 'released' : 'expelled'}!`);
        }
        magr.mx = ax; magr.my = ay;
        hooks.newsym?.(ax, ay);
        hooks.newsym?.(dx, dy);
    }
    return status;
}

/* mhitm.c explmm() (region-explosion splashes handled via mon_explodes
 * hook when provided; otherwise plain damage + self-destruct). */
export function explmm(magr, mdef, mattk) {
    if (magr.mcan) return M_ATTK_MISS;
    if (cansee(magr.mx, magr.my)) pline(`${MONNAM(magr)} explodes!`);
    else noises(magr, mattk);

    let result;
    if (mattk.adtyp === AD_FIRE || mattk.adtyp === AD_COLD || mattk.adtyp === AD_ELEC) {
        /* mon_explodes(): region effect; JS has region.js but explosion
         * routing into it is documented as unwired in the audit. */
        result = hooks.monExplodes ? hooks.monExplodes(magr, mattk) : M_ATTK_MISS;
        result = M_ATTK_AGR_DIED | (deadMonster(mdef) ? M_ATTK_DEF_DIED : 0);
    } else {
        result = mdamagem(magr, mdef, mattk, null, 0);
    }
    if (!(result & M_ATTK_AGR_DIED)) {
        if (hooks.monkilled) hooks.monkilled(magr, mattk.adtyp); else defaultMonKilled(magr);
        if (!deadMonster(magr)) return result; /* life saved */
        result |= M_ATTK_AGR_DIED;
        /* harness message for leash-cut unported (mdetach messaging). */
    }
    if (magr.mtame || magr.pet)
        pline('You have a melancholy feeling for a moment, then it passes.');
    return result;
}

/* ------------------------------------------------------------------ */
/* passivemm() — mhitm.c:1245-1378                                     */
/* ------------------------------------------------------------------ */
export function passivemm(magr, mdef, mhitb, mdead, mwep = null) {
    const mdatks = attackList(mdef);
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    let i;
    for (i = 0;; i++) {
        if (i >= NATTK) return (mdead | mhit); /* no passive attacks */
        if (mdatks[i].aatyp === AT_NONE) break;
    }
    const pattk = mdatks[i];
    let tmp;
    if (pattk.damn) tmp = d(pattk.damn, pattk.damd);
    /* mhitm.c:1264-1265: uses the *permonst* level (pd->mlevel), not the
     * grown runtime m_lev. */
    else if (pattk.damd) tmp = d((pmOf(mdef)?.lvl ?? mLevel(mdef)) + 1, pattk.damd);
    else tmp = 0;

    /* These affect the enemy even if the defender was killed. */
    switch (pattk.adtyp) {
    case AD_ACID: {
        if (mhitb && !rn2(2)) {
            if (canseemon(magr))
                pline(`${MONNAM(magr)} is splashed by ${s_suffix(mon_nam(mdef))} acid!`);
            if (resistsAcid(magr)) {
                if (canseemon(magr)) pline(`${MONNAM(magr)} is not affected.`);
                tmp = 0;
            }
        } else tmp = 0;
        if (!rn2(30)) hooks.erodeCorrode?.(magr);   /* erode_armor(ERODE_CORRODE) */
        if (!rn2(6)) hooks.acidDamageWep?.(magr);   /* acid_damage(MON_WEP(magr)) */
        /* goto assess_dmg */
        return passiveAssess(magr, mdef, tmp, mdead | mhit, pattk.adtyp);
    }
    case AD_ENCH: /* disenchanter: drain weapon enchant (no draws) */
        if (mhitb && !mdef.mcan && mwep) hooks.drainItem?.(mwep);
        break;
    default:
        break;
    }
    if (mdead || mdef.mcan) return (mdead | mhit);

    /* These affect the enemy only if the defender is still alive. */
    if (rn2(3)) {
        const pa = pmOf(magr);
        switch (pattk.adtyp) {
        case AD_PLYS: { /* floating eye / gelatinous cube */
            if (tmp > 127) tmp = 127;
            if (pmIndex(mdef) === PM_FLOATING_EYE) {
                if (!rn2(4)) tmp = 127;
                if (magr.mcansee !== false && haseyes(pa || {})
                    && mdef.mcansee !== false
                    && ((pa && perceives(pa)) || !mdef.minvis)) {
                    /* mon_reflects() unported: no reflection for monsters. */
                    if (canseemon(magr))
                        pline(`${MONNAM(magr)} is frozen by ${s_suffix(mon_nam(mdef))} gaze!`);
                    paralyzeMonst(magr, tmp);
                    return (mdead | mhit);
                }
            } else { /* gelatinous cube &c */
                if (canseemon(magr))
                    pline(`${MONNAM(magr)} is frozen by ${mon_nam(mdef)}.`);
                paralyzeMonst(magr, tmp);
                return (mdead | mhit);
            }
            return (mdead | mhit);
        }
        case AD_COLD:
            if (resistsCold(magr)) { tmp = 0; break; }
            if (canseemon(magr)) pline(`${MONNAM(magr)} is suddenly very cold!`);
            healmon(mdef, tmp / 2 | 0, tmp / 2 | 0);
            /* split_mon(self-dividing molds) not wired. */
            break;
        case AD_STUN:
            if (!magr.mstun) {
                magr.mstun = 1;
                if (canseemon(magr)) pline(`${MONNAM(magr)} staggers...`);
            }
            tmp = 0;
            break;
        case AD_FIRE:
            if (resistsFire(magr)) { tmp = 0; break; }
            if (canseemon(magr)) pline(`${MONNAM(magr)} is suddenly very hot!`);
            break;
        case AD_ELEC:
            if (resistsElec(magr)) { tmp = 0; break; }
            if (canseemon(magr)) pline(`${MONNAM(magr)} is jolted with electricity!`);
            break;
        default:
            tmp = 0;
            break;
        }
    } else {
        tmp = 0;
    }
    return passiveAssess(magr, mdef, tmp, mdead | mhit, pattk.adtyp);
}
function passiveAssess(magr, _mdef, tmp, base, adtyp) {
    if ((magr.mhp = (magr.mhp ?? 1) - tmp) <= 0) {
        if (hooks.monkilled) hooks.monkilled(magr, adtyp); else defaultMonKilled(magr);
        return (base | M_ATTK_AGR_DIED);
    }
    return base;
}

/* ------------------------------------------------------------------ */
/* getmattk() — mhitu.c data-level substitutions (no draws)            */
/* ------------------------------------------------------------------ */
function getmattkLike(magr, _mdef, indx, prevResult, attcks) {
    let attk = attcks[indx];
    if (!attk) attk = NO_ATTK_OBJ;
    /* consecutive disease/hunger attacks downgrade when the previous one
     * hit (mhitu.c getmattk) */
    if (indx > 0 && prevResult[indx - 1] > M_ATTK_MISS
        && (attk.adtyp === AD_DISE || attk.adtyp === 38 /* AD_PEST */ || attk.adtyp === 39 /* AD_FAMN */)
        && attk.adtyp === attcks[indx - 1].adtyp) {
        attk = { ...attk, adtyp: AD_STUN };
    } else if (magr.mspec_used && (attk.aatyp === AT_ENGL || attk.aatyp === AT_HUGS
        || attk.adtyp === AD_STCK || attk.adtyp === AD_POLY)) {
        const wimpy = (attk.damd === 0);
        const swapped = { ...attk };
        if (attk.adtyp === AD_ACID || attk.adtyp === AD_ELEC
            || attk.adtyp === AD_COLD || attk.adtyp === AD_FIRE) {
            swapped.aatyp = AT_TUCH;
        } else {
            swapped.aatyp = AT_CLAW;
            swapped.adtyp = AD_PHYS;
        }
        swapped.damn = 1;
        swapped.damd = 6;
        if (wimpy && swapped.aatyp === AT_CLAW) swapped.damd = 2; /* lichen 1d2 */
        attk = swapped;
    }
    return attk;
}

/* ------------------------------------------------------------------ */
/* mattackm() — mhitm.c:194-571                                        */
/* ------------------------------------------------------------------ */
export function mattackm(magr, mdef) {
    let strike = 0, attk, struck = 0;
    const res = new Array(NATTK).fill(M_ATTK_MISS);
    let dieroll = 0;
    let mwep = null;

    if (!magr || !mdef) return M_ATTK_MISS;
    if (helpless(magr)) return M_ATTK_MISS;
    const pa = pmOf(magr), pd = pmOf(mdef);
    const conflictFlag = !!hooks.isConflict?.();

    /* Grid bugs cannot attack at an angle. */
    if (pmIndex(magr) === PM_GRID_BUG && magr.mx !== mdef.mx && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* Armor-class differential (mhitm.c:321). */
    let tmp = findMac(mdef) + mLevel(magr);
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }
    if (mdef.mundetected) { mdef.mundetected = 0; hooks.newsym?.(mdef.mx, mdef.my); }
    /* Elves hate orcs (mhitm.c). */
    if (pa && pd && is_elf(pa) && is_orc(pd)) tmp++;

    visNow = calcVis(magr, mdef);
    magr.mlstmv = game.moves || 1;

    const attcks = attackList(magr);
    for (let i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;
        /* Target might no longer be there. */
        if (i > 0 && (deadMonster(magr) || deadMonster(mdef))) continue;

        const mattk = getmattkLike(magr, mdef, i, res, attcks);
        mwep = null;
        attk = 1;
        const dist = distmin(magr.mx, magr.my, mdef.mx, mdef.my);

        switch (mattk.aatyp) {
        case AT_WEAP: /* "hand to hand" attacks */
            if (dist > 1) { strike = 0; break; } /* thrwmm ranged not wired */
            /* mhitm.c:406-418: weapon upkeep and to-hit augmentation. */
            if (magr.weapon_check === NEED_WEAPON || !monWep(magr)) {
                magr.weapon_check = NEED_HTH_WEAPON;
                if (monWieldItem(magr) !== 0)
                    return M_ATTK_MISS; /* mhitm.c:409 */
            }
            /* possibly_unwield(magr, FALSE) — weapon.c:747-799 port is a
             * no-op (see above); MW stays in minvent. */
            mwep = monWep(magr);
            if (mwep) {
                /* mswingsm (mhitm.c:1283-1299): message only under
                 * flags.verbose, and only then does mswings_verb's
                 * thrust/swing cadence consume rn2(2). */
                if (hooks.swingsMessage) {
                    const msg = hooks.swingsMessage(magr, mdef, mwep, visNow);
                    if (msg) pline(msg);
                }
                tmp += hitvalMonsterWeapon(mwep, mdef);
            }
            /* FALLTHROUGH */
        case AT_CLAW: case AT_KICK: case AT_BITE: case AT_STNG:
        case AT_TUCH: case AT_BUTT: case AT_TENT: {
            if (mattk.aatyp === AT_KICK && magr.mtrapped) continue;
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            /* Monsters won't attack cockatrices barehanded when armed. */
            if (!magr.mconf && !conflictFlag && mwep && mattk.aatyp !== AT_WEAP
                && touch_petrifies(pd || {})) { strike = 0; break; }
            dieroll = rnd(20 + i);
            strike = (tmp > dieroll);
            if (mwep) tmp -= hitvalMonsterWeapon(mwep, mdef); /* mhitm.c:451-452 */
            if (strike) {
                if (pd && unsolid(pd) && failedGrab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = hitmm(magr, mdef, mattk, mwep, dieroll);
                /* pudding-division on iron weapon strikes not wired. */
            } else {
                missmm(magr, mdef, mattk);
            }
            break;
        }
        case AT_HUGS: /* automatic if prev two attacks succeed */
            strike = (i >= 2 && res[i - 1] === M_ATTK_HIT && res[i - 2] === M_ATTK_HIT);
            if (strike) {
                if (failedGrab(magr, mdef, mattk)) strike = 0;
                else res[i] = hitmm(magr, mdef, mattk, null, 0);
            }
            break;
        case AT_GAZE:
            strike = 0;
            res[i] = gazemm(magr, mdef, mattk);
            break;
        case AT_EXPL: {
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            res[i] = explmm(magr, mdef, mattk);
            if (res[i] === M_ATTK_MISS) { strike = 0; attk = 0; }
            else strike = 1;
            break;
        }
        case AT_ENGL: {
            if (pmIndex(mdef) === PM_SHADE) { strike = 0; break; }
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            if (engulfingHero(magr)) { strike = 0; break; }
            strike = (tmp > rnd(20 + i));
            if (strike) {
                if (failedGrab(magr, mdef, mattk)) strike = 0;
                else res[i] = gulpmm(magr, mdef, mattk);
            } else {
                missmm(magr, mdef, mattk);
            }
            break;
        }
        case AT_BREA: case AT_SPIT:
            /* Ranged m-mon attacks (breamm/spitmm) are not wired; the
             * attack is treated as not attempted on this path. */
            strike = 0;
            attk = 0;
            break;
        default: /* no attack */
            strike = 0;
            attk = 0;
            break;
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1)
            res[i] = passivemm(magr, mdef, strike, (res[i] & M_ATTK_DEF_DIED), mwep);

        if (res[i] & M_ATTK_DEF_DIED) return res[i];
        if (res[i] & M_ATTK_AGR_DIED) return res[i];
        if ((res[i] & M_ATTK_AGR_DONE) || helpless(magr)) return res[i];
        if (res[i] & M_ATTK_HIT) struck = 1;
    }
    return (struck ? M_ATTK_HIT : M_ATTK_MISS);
}

function engulfingHero(magr) {
    return !!(game.u?.swallowedBy === magr || (game.u?.uswallow && game.u.ustuck === magr));
}

/* ------------------------------------------------------------------ */
/* fightm() — mhitm.c:93-166.  Iterates the level monster list in
 * creation order (C fmon is newest-first; JS level.monsters appends). */
/* ------------------------------------------------------------------ */
export function fightm(mtmp) {
    let result;
    /* perhaps the monster will resist Conflict (mhitm.c:112-115) */
    if (resistConflict(mtmp)) return 0;
    const mons = [...(game.level?.monsters || [])].reverse();
    for (const mon of mons) {
        if (mon === mtmp || deadMonster(mon)) continue;
        if (!monnear(mtmp, mon.mx, mon.my)) continue;
        /* u.ustuck release handling: JS hero-swallow model lives in
         * allmain (game.u.uswallow); treated as absent here. */
        result = mattackm(mtmp, mon);
        if (result & M_ATTK_AGR_DIED) return 1;
        if ((result & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
            && rn2(4) && (mon.movement || 0) > rn2(NORMAL_SPEED)) {
            if (mon.movement > NORMAL_SPEED) mon.movement -= NORMAL_SPEED;
            else mon.movement = 0;
            mattackm(mon, mtmp); /* return attack */
        }
        return (result & M_ATTK_HIT) ? 1 : 0;
    }
    return 0;
}

/* ------------------------------------------------------------------ */
/* mdisplacem() — mhitm.c:170-290 core.  Not currently wired into the
 * scheduler (displacement candidates need ALLOW_MDISP plumbing); kept
 * for callers that already determine eligibility. */
/* ------------------------------------------------------------------ */
export function mdisplacem(magr, mdef, quietly = false) {
    if (!magr || !mdef || magr === mdef) return M_ATTK_MISS;
    const pa = pmOf(magr), pd = pmOf(mdef);
    const tx = mdef.mx, ty = mdef.my;
    const fx = magr.mx, fy = magr.my;
    const atA = (game.level?.monsters || []).find(m => m.mx === fx && m.my === fy);
    const atD = (game.level?.monsters || []).find(m => m.mx === tx && m.my === ty);
    if (atA !== magr || atD !== mdef) return M_ATTK_MISS;
    if (!rn2(7)) return M_ATTK_MISS;
    if (pmIndex(magr) === PM_GRID_BUG && magr.mx !== mdef.mx && magr.my !== mdef.my)
        return M_ATTK_MISS;
    if (mdef.mundetected) mdef.mundetected = 0;
    mdef.msleeping = 0;
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITMASK;
    mdef.meating = 0;
    visNow = (canspotmon(magr) && canspotmon(mdef));

    if (touch_petrifies(pd || {}) && !resistsSton(magr)
        && !(magr.misc_worn_check & W_ARMG)) {
        if (polyWhenStoned(magr)) {
            if (hooks.polyToStone) hooks.polyToStone(magr); else transformToStoneGolem(magr);
            return M_ATTK_HIT;
        }
        if (!quietly && canspotmon(magr)) {
            pline(`${MONNAM(magr)} tries to move ${mon_nam(mdef)} out of ${
                is_rider(pa || {}) ? 'the' : mhis(magr)} way.`);
            pline(`${MONNAM(magr)} turns to stone!`);
        }
        if (hooks.monstone) hooks.monstone(magr); else defaultMonKilled(magr);
        if (!deadMonster(magr)) return M_ATTK_HIT;
        if ((magr.mtame || magr.pet) && !visNow)
            pline('You have a peculiarly sad feeling for a moment, then it passes.');
        return M_ATTK_AGR_DIED;
    }
    magr.mx = tx; magr.my = ty;
    mdef.mx = fx; mdef.my = fy;
    if (visNow && !quietly)
        pline(`${MONNAM(magr)} moves ${mon_nam(mdef)} out of ${
            is_rider(pa || {}) ? 'the' : mhis(magr)} way!`);
    hooks.newsym?.(fx, fy);
    hooks.newsym?.(tx, ty);
    return M_ATTK_HIT;
}

/* ------------------------------------------------------------------ */
/* Utility ports used outside the combat loop                          */
/* ------------------------------------------------------------------ */

/* mhitm.c xdrainenergym(): hero/monster drained energy reduces spell use. */
export function xdrainenergym(mon, givemsg = true) {
    if ((mon.mspec_used || 0) < 20
        && (attackList(mon).some(a => a.aatyp === AT_MAGC) || attackList(mon).some(a => a.aatyp === AT_BREA))) {
        mon.mspec_used = (mon.mspec_used || 0) + d(2, 2);
        if (givemsg) pline(`${MONNAM(mon)} seems lethargic.`);
    }
}

/* mhitm.c:1412-1460 rustm(): attacker armor-erosion on contact with
 * rusty/corrosive/burning defenders; erosion effect via hook only. */
export function rustm(mdef, obj) {
    const pd = pmOf(mdef);
    if (!mdef || !obj || !pd) return;
    let dmgtyp = 0, chance = 1;
    const attks = pd.attacks;
    if (attks.some(a => a.adtyp === 42 /* AD_CORR */)) dmgtyp = 2; /* ERODE_CORRODE */
    else if (attks.some(a => a.adtyp === 24 /* AD_RUST */)) dmgtyp = 1; /* ERODE_RUST */
    else if (attks.some(a => a.adtyp === AD_FIRE) && pd.pm !== PM_STEAM_VORTEX) {
        dmgtyp = 3; chance = 6; /* ERODE_BURN */
    }
    if (dmgtyp !== 0 && !rn2(chance)) hooks.erodeObj?.(obj, dmgtyp);
}

/* mhitm.c:1170-1197 slept_monst(): sleeping grabber releases the hero. */
export function sleptMonst(mon) {
    if (helpless(mon) && game.u?.ustuck === mon && !game.u?.uswallow) {
        pline(`${s_suffix(MONNAM(mon))} grip relaxes.`);
        game.u.ustuck = null;
    }
}

/* ------------------------------------------------------------------ */
/* monmove.c:2086-2126 m_move_aggress() — monster attacks a monster on
 * its chosen mfndpos square, with the C return-attack gating. */
/* ------------------------------------------------------------------ */
export function mMoveAggress(mtmp, mtmp2) {
    /* 0 = miss, 4 = aggressor (mover) died, 8 = made its move */
    let mstatus = mtmp2 ? mattackm(mtmp, mtmp2) : M_ATTK_MISS;
    if ((mstatus & M_ATTK_AGR_DIED) || deadMonster(mtmp))
        return { result: 4, mstatus }; /* MMOVE_DIED */
    if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
        && rn2(4) && (mtmp2.movement || 0) > rn2(NORMAL_SPEED)) {
        if (mtmp2.movement > NORMAL_SPEED) mtmp2.movement -= NORMAL_SPEED;
        else mtmp2.movement = 0;
        mstatus = mattackm(mtmp2, mtmp); /* return attack */
        if (mstatus & M_ATTK_DEF_DIED) return { result: 4, mstatus };
    }
    return { result: 8, mstatus }; /* MMOVE_DONE */
}
