// makemon_m_initweap_inv_like_c.js — C makemon.c m_initweap / m_initinv RNG order (mklev makemon).
// Side effects (mongets / mksobj) omitted; RNG draws match upstream call sites.

import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import { In_mines, Is_rogue_level, P_POLEARMS } from './const.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';
import {
    findgoldChainLikeC,
    humanoidLikeC,
    isDemonPtr,
    isDwarfPtrLikeC,
    isElfPtrLikeC,
    isGiantPtrLikeC,
    isLordPtrLikeC,
    isMercenaryPtrLikeC,
    isPrincePtrLikeC,
    likesGoldPtrLikeC,
    strongmonstPtrLikeC,
    extraNastyPtrLikeC,
} from './mondata.js';
import { MONS_MLET } from './mons_rndmonst_ini_inv_data.js';
import { rnd, rn1, rn2 } from './rng.js';

/** C `mons[]` indices used in makemon.c weapon/inventory init. */
const PM_KOBOLD = 61;
const PM_HOBBIT = 45;
const PM_GOBLIN = 72;
const PM_MORDOR_ORC = 76;
const PM_URUK_HAI = 77;
const PM_ORC_SHAMAN = 78;
const PM_ORC_CAPTAIN = 79;
const PM_FOREST_CENTAUR = 133;
const PM_ETTIN = 178;
const PM_OGRE_LEADER = 209;
const PM_OGRE_TYRANT = 210;
const PM_GUARD = 278;
const PM_SOLDIER = 283;
const PM_SERGEANT = 284;
const PM_LIEUTENANT = 286;
const PM_CAPTAIN = 287;
const PM_WATCHMAN = 288;
const PM_WATCH_CAPTAIN = 289;
const PM_HORNED_DEVIL = 298;
const PM_ICE_DEVIL = 305;
const PM_BALROG = 309;
const PM_ASMODEUS = 316;
const PM_SALAMANDER = 336;

/** NH5 `otyp` span for C `PARTISAN`..`BEC_DE_CORBIN` polearm walk in mercenary init. */
const OTYP_PARTISAN = 59;
const OTYP_POLEARM_SPAN = 12;

/** C `defsym.h` / `mons[].mlet` — from `MONS_MLET` anchors. */
const S_GIANT = MONS_MLET[PM_ETTIN] | 0;
const S_HUMAN = MONS_MLET[PM_SOLDIER] | 0;
const S_HUMANOID = MONS_MLET[PM_HOBBIT] | 0;
const S_KOP = MONS_MLET[184] | 0;
const S_ORC = MONS_MLET[PM_GOBLIN] | 0;
const S_OGRE = MONS_MLET[PM_OGRE_LEADER] | 0;
const S_TROLL = MONS_MLET[225] | 0;
const S_KOBOLD = MONS_MLET[PM_KOBOLD] | 0;
const S_CENTAUR = MONS_MLET[PM_FOREST_CENTAUR] | 0;
const S_WRAITH = MONS_MLET[235] | 0;
const S_ZOMBIE = MONS_MLET[245] | 0;
const S_LIZARD = MONS_MLET[PM_SALAMANDER] | 0;
const S_DEMON = MONS_MLET[PM_BALROG] | 0;
const S_GNOME = MONS_MLET[169] | 0;
const S_ANGEL = MONS_MLET[123] | 0;
const S_NYMPH = MONS_MLET[69] | 0;
const S_LICH = MONS_MLET[162] | 0;
const S_MUMMY = MONS_MLET[196] | 0;
const S_LEPRECHAUN = MONS_MLET[65] | 0;
const S_QUANTMECH = MONS_MLET[330] | 0;

/** C: dungeon.c level_difficulty. */
function levelDifficultyLikeC() {
    return depth_of_level(game.u?.uz) | 0;
}

/** C: makemon.c m_initthrow — `rn1(oquan, 3)` after mksobj. */
function mInitthrowRngLikeC(oquan) {
    rn1(oquan | 0, 3);
}

/** C: soldier/watchman polearm `rn1(BEC_DE_CORBIN - PARTISAN + 1, PARTISAN)` loop. */
function mercenaryPolearmOtypRngLikeC() {
    let w1;
    do {
        w1 = rn1(OTYP_POLEARM_SPAN, OTYP_PARTISAN);
    } while ((OC_SKILL_ROW_BY_OTYP.get(w1)?.oc_skill ?? 0) !== P_POLEARMS);
    return w1;
}

/**
 * C: makemon.c m_initweap — weapon RNG only.
 * @param {{ m_lev?: number, mnum?: number, data?: import('./mondata.js').Permonst }} mtmp
 */
export function mInitweapMklevLikeC(mtmp) {
    const ptr = mtmp.data;
    if (!ptr || Is_rogue_level(game.u?.uz)) return;

    const mm = mtmp.mnum | 0;
    const mlet = ptr.mlet | 0;
    let bias;
    let w1 = 0;
    let w2 = 0;

    switch (mlet) {
    case S_GIANT:
        if (rn2(2)) {
            void (mm !== PM_ETTIN);
        }
        if (mm !== PM_ETTIN && !rn2(5)) {
            rn2(2);
        }
        break;
    case S_HUMAN:
        if (isMercenaryPtrLikeC(ptr)) {
            w1 = 0;
            w2 = 0;
            switch (mm) {
            case PM_WATCHMAN:
            case PM_SOLDIER:
                if (!rn2(3)) {
                    mercenaryPolearmOtypRngLikeC();
                    w2 = rn2(2) ? 1 : 0;
                } else {
                    w1 = rn2(2) ? 1 : 0;
                }
                break;
            case PM_SERGEANT:
                rn2(2);
                break;
            case PM_LIEUTENANT:
                rn2(2);
                break;
            case PM_CAPTAIN:
            case PM_WATCH_CAPTAIN:
                rn2(2);
                break;
            default:
                if (!rn2(4)) w1 = 1;
                if (!rn2(7)) w2 = 1;
                break;
            }
            if (w1) { /* mongets(w1) */ }
            if (!w2 && w1 !== 1 && !rn2(4)) w2 = 1;
            if (w2) { /* mongets(w2) */ }
        } else if (isElfPtrLikeC(ptr)) {
            if (rn2(2)) rn2(2);
            if (rn2(2)) { /* helm */ } else if (!rn2(4)) { /* boots */ }
            if (rn2(2)) { /* dagger */ }
            switch (rn2(3)) {
            case 0:
                if (!rn2(4)) { /* shield */ }
                if (rn2(3)) { /* short sword */ }
                mInitthrowRngLikeC(12);
                break;
            case 1:
                if (rn2(2)) { /* shield */ }
                break;
            case 2:
                if (rn2(2)) { /* spear + shield */ }
                break;
            }
            if (mm === 165) { /* PM_ELVEN_MONARCH */
                if (rn2(3) || (game.in_mklev && false)) { /* pick-axe */ }
                if (!rn2(50)) { /* crystal ball */ }
            }
        } else if (ptr.msound === 2 || false) { /* MS_PRIEST / cleric quest */
            rnd(3);
            if (!rn2(2)) { /* curse */ }
        } else if (mm === 167) { /* PM_NINJA */
            rn2(4);
            rn2(4);
        } else if (ptr.msound === 3) { /* MS_GUARDIAN — quest guardians */
            switch (mm) {
            case 152: case 153: case 154: case 155: case 156: case 157:
                if (rn2(2)) rn2(3);
                if (rn2(5)) rn2(3);
                if (rn2(3)) rn2(3);
                if (rn2(3)) { /* potion */ }
                break;
            case 158: case 159: case 160: case 161:
                rn2(3);
                rn2(3);
                if (rn2(2)) rn2(2);
                if (!rn2(3)) { /* cloak */ }
                if (!rn2(3)) {
                    mInitthrowRngLikeC(12);
                }
                break;
            case 162:
                rn2(3);
                if (rn2(2)) rn2(2);
                mInitthrowRngLikeC(12);
                break;
            case 163:
                rn2(3);
                if (rn2(2)) { /* gloves */ }
                rn2(2);
                break;
            case 164:
                break;
            }
        }
        break;
    case S_ANGEL:
        if (humanoidLikeC(ptr)) {
            rn2(3);
            if (!rn2(20) || isLordPtrLikeC(ptr)) { /* artifact gate */ }
            rn2(4);
            if (!rn2(4) || isLordPtrLikeC(ptr)) { /* shield */ }
        }
        break;
    case S_HUMANOID:
        if (mm === PM_HOBBIT) {
            switch (rn2(3)) {
            case 0: break;
            case 1: break;
            case 2:
                void !rn2(4);
                mInitthrowRngLikeC(6);
                break;
            }
            if (!rn2(10)) { /* coat */ }
            if (!rn2(10)) { /* cloak */ }
        } else if (isDwarfPtrLikeC(ptr)) {
            if (rn2(7)) { /* cloak */ }
            if (rn2(7)) { /* shoes */ }
            if (!rn2(4)) {
                if (rn2(2)) { /* mattock */ } else {
                    rn2(2);
                }
                if (!rn2(3)) { /* mithril */ }
            } else {
                !rn2(3);
            }
        }
        break;
    case S_KOP:
        if (!rn2(4)) mInitthrowRngLikeC(2);
        if (!rn2(3)) rn2(2);
        break;
    case S_ORC:
        if (rn2(2)) { /* helm */ }
        switch ((mm !== PM_ORC_CAPTAIN) ? mm : (rn2(2) ? PM_MORDOR_ORC : PM_URUK_HAI)) {
        case PM_MORDOR_ORC:
            if (!rn2(3)) { /* scimitar */ }
            if (!rn2(3)) { /* shield */ }
            if (!rn2(3)) { /* knife */ }
            if (!rn2(3)) { /* chain */ }
            break;
        case PM_URUK_HAI:
            if (!rn2(3)) { /* cloak */ }
            if (!rn2(3)) { /* sword */ }
            if (!rn2(3)) { /* shoes */ }
            if (!rn2(3)) {
                mInitthrowRngLikeC(12);
            }
            if (!rn2(3)) { /* shield */ }
            break;
        default:
            if (mm !== PM_ORC_SHAMAN && rn2(2)) {
                mm === PM_GOBLIN || rn2(2) === 0;
            }
            break;
        }
        break;
    case S_OGRE:
        if (!rn2(mm === PM_OGRE_TYRANT ? 3 : mm === PM_OGRE_LEADER ? 6 : 12)) {
            /* battle-axe */
        } else {
            /* club */
        }
        break;
    case S_TROLL:
        if (!rn2(2)) {
            switch (rn2(4)) {
            case 0: case 1: case 2: case 3: break;
            }
        }
        break;
    case S_KOBOLD:
        if (!rn2(4)) mInitthrowRngLikeC(12);
        break;
    case S_CENTAUR:
        if (rn2(2)) {
            if (mm === PM_FOREST_CENTAUR) {
                mInitthrowRngLikeC(12);
            } else {
                mInitthrowRngLikeC(12);
            }
        }
        break;
    case S_WRAITH:
        break;
    case S_ZOMBIE:
        if (!rn2(4)) { /* leather */ }
        if (!rn2(4)) rn2(3);
        break;
    case S_LIZARD:
        if (mm === PM_SALAMANDER) {
            if (rn2(7)) { /* spear */ } else rn2(3);
        }
        break;
    case S_DEMON:
        switch (mm) {
        case PM_BALROG:
            break;
        case 297: /* PM_ORCUS */
            break;
        case PM_HORNED_DEVIL:
            rn2(4);
            break;
        case 299: /* PM_DISPATER */
            break;
        case 300: /* PM_YEENOGHU */
            break;
        }
        if (!isDemonPtr(ptr)) break;
        /* FALLTHRU */
    default: {
        bias = (isLordPtrLikeC(ptr) ? 1 : 0)
            + (isPrincePtrLikeC(ptr) ? 2 : 0)
            + (extraNastyPtrLikeC(ptr) ? 1 : 0);
        switch (rnd(14 - (2 * bias))) {
        case 1:
            if (strongmonstPtrLikeC(ptr)) { /* battle-axe */ }
            else mInitthrowRngLikeC(12);
            break;
        case 2:
            if (strongmonstPtrLikeC(ptr)) { /* two-handed */ }
            else mInitthrowRngLikeC(12);
            break;
        case 3:
            mInitthrowRngLikeC(12);
            break;
        case 4:
            if (strongmonstPtrLikeC(ptr)) { /* long sword */ }
            else mInitthrowRngLikeC(3);
            break;
        case 5:
            if (strongmonstPtrLikeC(ptr)) { /* lucern */ }
            else { /* aklys */ }
            break;
        default:
            break;
        }
        break;
    }
    }

    if ((mtmp.m_lev | 0) > rn2(75)) {
        /* rnd_offensive_item */
    }
}

/**
 * C: makemon.c m_initinv — inventory RNG only (mklev path).
 * @param {{ m_lev?: number, mnum?: number, mx?: number, my?: number, minvent?: unknown, data?: import('./mondata.js').Permonst }} mtmp
 */
export function mInitinvMklevLikeC(mtmp) {
    const ptr = mtmp.data;
    if (!ptr || Is_rogue_level(game.u?.uz)) return;

    const mm = mtmp.mnum | 0;
    const mlet = ptr.mlet | 0;

    switch (mlet) {
    case S_HUMAN:
        if (isMercenaryPtrLikeC(ptr)) {
            let mac;
            switch (mm) {
            case PM_GUARD: mac = -1; break;
            case PM_SOLDIER: mac = 3; break;
            case PM_SERGEANT: mac = 0; break;
            case PM_LIEUTENANT: mac = -2; break;
            case PM_CAPTAIN: mac = -3; break;
            case PM_WATCHMAN: mac = 3; break;
            case PM_WATCH_CAPTAIN: mac = -2; break;
            default: mac = 0; break;
            }
            void mac;
            if (mac < -1 && rn2(5)) rn2(5);
            else if (mac < 3 && rn2(5)) rn2(3);
            else if (rn2(5)) rn2(3);
            else { /* leather */ }
            if (mac < 10 && rn2(3)) { /* helmet */ }
            else if (mac < 10 && rn2(2)) { /* pot */ }
            if (mac < 10 && rn2(3)) { /* small shield */ }
            else if (mac < 10 && rn2(2)) { /* large shield */ }
            if (mac < 10 && rn2(3)) { /* low boots */ }
            else if (mac < 10 && rn2(2)) { /* high boots */ }
            if (mac < 10 && rn2(3)) { /* gloves */ }
            else if (mac < 10 && rn2(2)) { /* cloak */ }
            if (mm === PM_WATCH_CAPTAIN) {
                ;
            } else if (mm === PM_WATCHMAN) {
                if (rn2(3)) { /* whistle */ }
            } else if (mm === PM_GUARD) {
                /* cursed whistle mksobj */
            } else {
                if (!rn2(3)) { /* K ration */ }
                if (!rn2(2)) { /* C ration */ }
                if (mm !== PM_SOLDIER && !rn2(3)) { /* bugle */ }
            }
        } else if (mm === 279) { /* PM_SHOPKEEPER */
            switch (rn2(4)) {
            case 0: case 1: case 2: case 3: break;
            }
        } else if (ptr.msound === 2 || false) {
            rn2(7);
            rn1(10, 20);
        } else if (false) { /* monk quest */
            rn2(11);
        }
        break;
    case S_NYMPH:
        if (!rn2(2)) { /* mirror */ }
        if (!rn2(2)) { /* potion */ }
        break;
    case S_GIANT:
        if (mm === 184) { /* PM_MINOTAUR */
            if (!rn2(8) || (game.in_mklev && false)) { /* digging wand */ }
        } else if (isGiantPtrLikeC(ptr)) {
            let cnt = rn2(Math.trunc((mtmp.m_lev | 0) / 2));
            while (cnt-- > 0) {
                rn1(2, 3);
            }
        }
        break;
    case S_WRAITH:
        if (mm === 227) { /* PM_NAZGUL */ }
        break;
    case S_LICH:
        if (mm === 228 && !rn2(13)) rn2(7);
        else if (mm === 229 && !rn2(3)) {
            rn2(3);
            rn2(13);
            rnd(3);
            if (!rn2(4)) { /* oerodeproof */ }
        }
        break;
    case S_MUMMY:
        if (rn2(7)) { /* wrapping */ }
        break;
    case S_QUANTMECH:
        if (!rn2(20) && mm === 330) { /* PM_QUANTUM_MECHANIC */ }
        break;
    case S_LEPRECHAUN:
        void levelDifficultyLikeC();
        break;
    case S_DEMON:
        if (mm === PM_ICE_DEVIL && !rn2(4)) { /* spear */ }
        else if (mm === PM_ASMODEUS) { /* wands */ }
        break;
    case S_GNOME:
        if (!rn2((In_mines(game.u?.uz) && game.in_mklev) ? 20 : 60)) {
            rn2(4);
        }
        break;
    default:
        break;
    }

    if (mm === PM_SOLDIER && rn2(13)) return;

    if ((mtmp.m_lev | 0) > rn2(50)) {
        /* rnd_defensive_item */
    }
    if ((mtmp.m_lev | 0) > rn2(100)) {
        /* rnd_misc_item */
    }
    if (likesGoldPtrLikeC(ptr) && !findgoldChainLikeC(mtmp.minvent) && !rn2(5)) {
        void levelDifficultyLikeC();
    }
}
