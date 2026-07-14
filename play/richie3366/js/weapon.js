// weapon.js — Monster weapon selection + damage (partial).
// C ref: weapon.c select_rwep / select_hwep / dmgval / mon_wield_item;
//         enhance_weapon_skill (#enhance); dothrow.c should_mulch_missile /
//         multishot_class_bonus.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { flush_topl_more } from './display.js';
import { select_menu_pick_none } from './invent.js';
import {
    WEAPON_CLASS, GEM_CLASS, TOOL_CLASS, objectNames, objectNameStrs,
} from './objects.js';
import {
    is_ammo, ammo_and_launcher, is_missile,
} from './wield.js';
import { is_lord, is_prince, strongmonst } from './monsters.js';
import {
    P_NONE, P_DAGGER, P_KNIFE, P_AXE, P_PICK_AXE,
    P_SHORT_SWORD, P_BROAD_SWORD, P_LONG_SWORD, P_TWO_HANDED_SWORD,
    P_SPEAR, P_SLING, P_SHURIKEN, P_BOW, P_CROSSBOW,
    P_SABER, P_CLUB, P_MACE, P_MORNING_STAR, P_FLAIL,
    P_HAMMER, P_QUARTERSTAFF, P_POLEARMS, P_TRIDENT, P_LANCE,
    P_DART, P_BOOMERANG, P_WHIP, P_UNICORN_HORN,
    P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL, P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
    P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_RIDING,
    P_FIRST_WEAPON, P_LAST_WEAPON, P_FIRST_SPELL, P_LAST_SPELL,
    P_FIRST_H_TO_H, P_LAST_H_TO_H, P_NUM_SKILLS,
    P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT,
    P_MASTER, P_GRAND_MASTER,
    NEED_WEAPON, NEED_RANGED_WEAPON, NEED_HTH_WEAPON,
    NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE,
    NO_WEAPON_WANTED, W_WEP, W_ARMS, W_ARMG,
    ECMD_OK,
} from './const.js';
import { m_carrying, mon_has_shield } from './mon.js';
import { ATR_INVERSE } from './terminal.js';
import {
    skill_based_spellbook_id, spell_skilltype,
} from './spell.js';
import {
    PM_CAVE_DWELLER, PM_MONK, PM_RANGER, PM_ROGUE, PM_SAMURAI,
    PM_HEALER, PM_CLERIC, PM_WIZARD,
    monsterNames,
} from './generated/monsters_data.js';

const PM_PONY = monsterNames.indexOf('PM_PONY');

export { is_missile };

/** Sentinel — C decl.c hands_obj. Not a real inventory object. */
export const hands_obj = { otyp: -1, _hands: true };

/** C ref: monst.h MON_WEP(mon) → mon->mw */
export function MON_WEP(mon) {
    return mon?.mw || null;
}

/** C ref: obj.h is_weptool */
function is_weptool(otmp) {
    return otmp?.oclass === TOOL_CLASS
        && ((game.objects?.[otmp.otyp]?.oc_skill | 0) !== P_NONE);
}

/** C hack.c rounddiv */
function rounddiv(x, y) {
    if (!y) return 0;
    let divsgn = 1;
    let yy = y;
    let xx = x;
    if (yy < 0) { divsgn = -divsgn; yy = -yy; }
    if (xx < 0) { divsgn = -divsgn; xx = -xx; }
    let r = Math.trunc(xx / yy);
    const m = xx % yy;
    if (2 * m >= yy) r++;
    return divsgn * r;
}

/**
 * C ref: weapon.c dmgval — uses objects[].oc_wsdam / oc_wldam.
 * Large-monster otyp switch, thick-skin/shade/silver/blessed/axe deferred.
 */
export function dmgval(otmp, mon) {
    if (!otmp) return 0;
    const otyp = otmp.otyp | 0;
    const od = game.objects?.[otyp];
    const n = objectNames[otyp];
    if (n === 'CREAM_PIE') return 0;

    let tmp = 0;
    // C: bigmonst(mon->data); callers that pass null treat as small (hero).
    const big = !!(mon?.data && ((mon.data.msize | 0) >= 3 /* MZ_LARGE */));
    if (big) {
        const wld = od?.oc_wldam | 0;
        if (wld) tmp = rnd(wld);
        // large-monster otyp switch bonuses deferred
    } else {
        const wsd = od?.oc_wsdam | 0;
        if (wsd) tmp = rnd(wsd);
        switch (n) {
        case 'IRON_CHAIN':
        case 'CROSSBOW_BOLT':
        case 'MACE':
        case 'SILVER_MACE':
        case 'WAR_HAMMER':
        case 'FLAIL':
        case 'SPETUM':
        case 'TRIDENT':
            tmp++;
            break;
        case 'BATTLE_AXE':
        case 'BARDICHE':
        case 'BILL_GUISARME':
        case 'GUISARME':
        case 'LUCERN_HAMMER':
        case 'MORNING_STAR':
        case 'RANSEUR':
        case 'BROADSWORD':
        case 'ELVEN_BROADSWORD':
        case 'RUNESWORD':
        case 'VOULGE':
            tmp += rnd(4);
            break;
        case 'ACID_VENOM':
            tmp += rnd(6);
            break;
        }
    }

    const Is_weapon = otmp.oclass === WEAPON_CLASS || is_weptool(otmp);
    if (Is_weapon) {
        tmp += otmp.spe | 0;
        if (tmp < 0) tmp = 0;
    }
    return tmp;
}

/** C ref: dothrow.c greatest_erosion */
function greatest_erosion(obj) {
    const a = obj.oeroded | 0;
    const b = obj.oeroded2 | 0;
    return a > b ? a : b;
}

/** C ref: dothrow.c should_mulch_missile */
export function should_mulch_missile(obj) {
    if (!obj || !(is_ammo(obj) || is_missile(obj))) return false;
    if (objectNames[obj.otyp] === 'BOOMERANG') return false;
    if (game.objects?.[obj.otyp]?.oc_magic) return false;

    const chance = 3 + greatest_erosion(obj) - (obj.spe | 0);
    let broken = chance > 1 ? !!rn2(chance) : !rn2(4);
    if (obj.blessed) {
        const mon_moving = !!(game.context?.mon_moving);
        if (mon_moving ? !rn2(3) : !rn2(4)) broken = false;
    }
    const n = objectNames[obj.otyp];
    if (((obj.oclass === GEM_CLASS && game.objects?.[obj.otyp]?.oc_tough)
            || n === 'FLINT')
        && !rn2(2)) {
        broken = false;
    }
    return broken;
}

/** C ref: dothrow.c multishot_class_bonus */
export function multishot_class_bonus(pm, ammo, launcher) {
    let multishot = 0;
    const skill = game.objects?.[ammo.otyp]?.oc_skill ?? 0;
    switch (pm) {
    case PM_CAVE_DWELLER:
        if (skill === -P_SLING || skill === P_SPEAR) multishot++;
        break;
    case PM_MONK:
        if (skill === -P_SHURIKEN) multishot++;
        break;
    case PM_RANGER:
        if (skill !== P_DAGGER) multishot++;
        break;
    case PM_ROGUE:
        if (skill === P_DAGGER) multishot++;
        break;
    case PM_SAMURAI:
        if (ammo.otyp != null
            && objectNames[ammo.otyp] === 'YA'
            && launcher && objectNames[launcher.otyp] === 'YUMI') {
            multishot++;
        }
        break;
    default:
        break;
    }
    return multishot;
}

function otyp(name) {
    return objectNames.indexOf(name);
}

/** C ref: weapon.c oselect */
function oselect(mtmp, type) {
    if (type < 0) return null;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otmp.otyp === type) return otmp;
    }
    return null;
}

function mwelded_mon(obj) {
    return !!(obj && obj.cursed);
}

/** C rwep[] — weapon.c */
const RWEP_NAMES = [
    'DWARVISH_SPEAR', 'SILVER_SPEAR', 'ELVEN_SPEAR', 'SPEAR', 'ORCISH_SPEAR',
    'JAVELIN', 'SHURIKEN', 'YA', 'SILVER_ARROW', 'ELVEN_ARROW', 'ARROW',
    'ORCISH_ARROW', 'CROSSBOW_BOLT', 'SILVER_DAGGER', 'ELVEN_DAGGER',
    'DAGGER', 'ORCISH_DAGGER', 'KNIFE', 'FLINT', 'ROCK', 'LOADSTONE',
    'LUCKSTONE', 'DART', 'CREAM_PIE',
];

/**
 * C ref: weapon.c select_rwep — throwable preference walk.
 * Polearms / throw-and-return / egg / Kop pie / boulder deferred.
 */
export function select_rwep(mtmp) {
    game._propellor = hands_obj;
    const mwep = MON_WEP(mtmp);
    const mweponly = !!(mwelded_mon(mwep) && mtmp.weapon_check === NO_WEAPON_WANTED);
    const loadstone = otyp('LOADSTONE');

    for (const name of RWEP_NAMES) {
        const i = otyp(name);
        if (i < 0) continue;
        const propSkill = game.objects?.[i]?.oc_skill ?? 0;
        game._propellor = hands_obj;

        if (propSkill < 0) {
            const abs = -propSkill;
            if (abs === P_BOW) {
                game._propellor = oselect(mtmp, otyp('YUMI'))
                    || oselect(mtmp, otyp('ELVEN_BOW'))
                    || oselect(mtmp, otyp('BOW'))
                    || oselect(mtmp, otyp('ORCISH_BOW'));
            } else if (abs === P_SLING) {
                game._propellor = oselect(mtmp, otyp('SLING'));
            } else if (abs === P_CROSSBOW) {
                game._propellor = oselect(mtmp, otyp('CROSSBOW'));
            } else {
                game._propellor = hands_obj; // dart / shuriken
            }
            const monw = MON_WEP(mtmp);
            if (monw && mwelded_mon(monw) && monw !== game._propellor
                && mtmp.weapon_check === NO_WEAPON_WANTED) {
                game._propellor = null;
            }
        }

        if (game._propellor != null) {
            if (i !== loadstone) {
                const otmp = oselect(mtmp, i);
                if (otmp && !otmp.oartifact
                    && !(otmp === MON_WEP(mtmp) && mwelded_mon(otmp))
                    && (otmp === mwep || !mweponly)) {
                    return otmp;
                }
            } else {
                for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
                    if (otmp.otyp === loadstone && !otmp.cursed) return otmp;
                }
            }
        }
    }
    return null;
}

const PICK_AXE = objectNames.indexOf('PICK_AXE');
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
const AXE = objectNames.indexOf('AXE');
const BATTLE_AXE = objectNames.indexOf('BATTLE_AXE');
const CORPSE = objectNames.indexOf('CORPSE');
const CLUB = objectNames.indexOf('CLUB');
const SILVER = 14; // objclass.h
const M2_GIANT = 0x00002000; // monflag.h
const M2_WERE = 0x00000004;
const M2_DEMON = 0x00000100;

/** C hwep[] — weapon.c preference order */
const HWEP_NAMES = [
    'CORPSE',
    'TSURUGI', 'RUNESWORD', 'DWARVISH_MATTOCK', 'TWO_HANDED_SWORD', 'BATTLE_AXE',
    'KATANA', 'UNICORN_HORN', 'CRYSKNIFE', 'TRIDENT', 'LONG_SWORD', 'ELVEN_BROADSWORD',
    'BROADSWORD', 'SCIMITAR', 'SILVER_SABER', 'MORNING_STAR', 'ELVEN_SHORT_SWORD',
    'DWARVISH_SHORT_SWORD', 'SHORT_SWORD', 'ORCISH_SHORT_SWORD', 'SILVER_MACE', 'MACE',
    'AXE', 'DWARVISH_SPEAR', 'SILVER_SPEAR', 'ELVEN_SPEAR', 'SPEAR', 'ORCISH_SPEAR', 'FLAIL',
    'BULLWHIP', 'QUARTERSTAFF', 'JAVELIN', 'AKLYS', 'CLUB', 'PICK_AXE', 'RUBBER_HOSE',
    'WAR_HAMMER', 'SILVER_DAGGER', 'ELVEN_DAGGER', 'DAGGER', 'ORCISH_DAGGER', 'ATHAME',
    'SCALPEL', 'KNIFE', 'WORM_TOOTH',
];

/** C ref: mondata.h is_giant */
function is_giant(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_GIANT);
}

/**
 * C ref: mondata.h hates_silver / mon_hates_silver — were/demon arms.
 * Named omission: is_vampshifter + full hates_silver(ptr) body.
 */
function mon_hates_silver(mtmp) {
    const f2 = mtmp?.data?.mflags2 ?? 0;
    return !!(f2 & (M2_WERE | M2_DEMON));
}

/**
 * C ref: weapon.c select_hwep — melee preference walk.
 * Named omissions: cockatrice corpse/egg touch_petrifies gate beyond
 * W_ARMG skip; can_touch_safely inside oselect; touch_artifact deny;
 * Balrog bullwhip when hero wields.
 */
export function select_hwep(mtmp) {
    const strong = strongmonst(mtmp.data);
    const wearing_shield = ((mtmp.misc_worn_check | 0) & W_ARMS) !== 0;

    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === WEAPON_CLASS && otmp.oartifact
            && ((strong && !wearing_shield)
                || !game.objects?.[otmp.otyp]?.oc_big)) {
            return otmp;
        }
    }

    if (is_giant(mtmp.data)) {
        const club = oselect(mtmp, CLUB);
        if (club) return club;
    }

    for (const name of HWEP_NAMES) {
        const i = otyp(name);
        if (i < 0) continue;
        if (i === CORPSE
            && !((mtmp.misc_worn_check | 0) & W_ARMG)) {
            // resists_ston / touch_petrifies body deferred — skip bare-hand corpse
            continue;
        }
        const ocl = game.objects?.[i];
        if (((strong && !wearing_shield) || !ocl?.oc_big)
            && (ocl?.oc_material !== SILVER || !mon_hates_silver(mtmp))) {
            const otmp = oselect(mtmp, i);
            if (otmp) return otmp;
        }
    }
    return null;
}

/**
 * C ref: weapon.c mon_wield_item — HTH + ranged + dig-tool pick/axe.
 * Named omissions: weld plines, artifact_light, mwelded refuse-wield body.
 */
export function mon_wield_item(mon) {
    if (mon.weapon_check === NO_WEAPON_WANTED) return 0;
    let obj = null;
    switch (mon.weapon_check) {
    case NEED_HTH_WEAPON:
        obj = select_hwep(mon);
        break;
    case NEED_RANGED_WEAPON:
        select_rwep(mon);
        obj = game._propellor;
        break;
    case NEED_PICK_AXE:
        obj = m_carrying(mon, PICK_AXE);
        if (!obj && !mon_has_shield(mon)) {
            obj = m_carrying(mon, DWARVISH_MATTOCK);
        }
        break;
    case NEED_AXE:
        obj = m_carrying(mon, BATTLE_AXE);
        if (!obj || mon_has_shield(mon)) obj = m_carrying(mon, AXE);
        break;
    case NEED_PICK_OR_AXE:
        obj = m_carrying(mon, DWARVISH_MATTOCK);
        if (!obj) obj = m_carrying(mon, BATTLE_AXE);
        if (!obj || mon_has_shield(mon)) {
            obj = m_carrying(mon, PICK_AXE);
            if (!obj) obj = m_carrying(mon, AXE);
        }
        break;
    default:
        mon.weapon_check = NEED_WEAPON;
        return 0;
    }
    if (obj && obj !== hands_obj) {
        const mw_tmp = MON_WEP(mon);
        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            mon.weapon_check = NEED_WEAPON;
            return 0;
        }
        // mwelded refuse-wield deferred — treat as free switch
        mon.mw = obj;
        if (mw_tmp) mw_tmp.owornmask = (mw_tmp.owornmask || 0) & ~W_WEP;
        obj.owornmask = (obj.owornmask || 0) | W_WEP;
        mon.weapon_check = NEED_WEAPON;
        return 1;
    }
    mon.weapon_check = NEED_WEAPON;
    return 0;
}

/**
 * C ref: weapon.c enhance_weapon_skill (#enhance) + add_skills_to_menu.
 * Branch envelope: non-wizard, no advanceable/annotated skills → PICK_NONE
 * fullscreen paged menu. Wizard speedy y_n, skill_advance, can_advance /
 * could_advance / peaked_skill annotations deferred.
 */
export async function enhance_weapon_skill() {
    await flush_topl_more();
    // C: svc.context.tips |= (1 << TIP_ENHANCE); TIP_ENHANCE=0
    if (game.context) game.context.tips = (game.context.tips | 0) | (1 << 0);
    // wizard y_n("Advance skills without practice?") deferred

    const entries = [
        // C tty_end_menu: prompt then blank prepended (reverse+prepend → prompt, blank, items)
        { text: 'Current skills:', attr: ATR_INVERSE },
        { text: '', attr: 0 },
    ];
    add_skills_to_menu(entries, false, false);
    await select_menu_pick_none(entries);
    return ECMD_OK;
}

/** C ref: skills.h martial_bonus */
export function martial_bonus() {
    const m = game.urole?.mnum;
    return m === PM_SAMURAI || m === PM_MONK;
}

/** C ref: weapon.c P_NAME / skill_names_indices / odd_skill_names */
function P_NAME(type) {
    if (type === P_BARE_HANDED_COMBAT) {
        return martial_bonus() ? 'martial arts' : 'bare handed combat';
    }
    const odd = {
        [P_SABER]: 'saber',
        [P_HAMMER]: 'hammer',
        [P_POLEARMS]: 'polearms',
        [P_WHIP]: 'whip',
        [P_ATTACK_SPELL]: 'attack spells',
        [P_HEALING_SPELL]: 'healing spells',
        [P_DIVINATION_SPELL]: 'divination spells',
        [P_ENCHANTMENT_SPELL]: 'enchantment spells',
        [P_CLERIC_SPELL]: 'clerical spells',
        [P_ESCAPE_SPELL]: 'escape spells',
        [P_MATTER_SPELL]: 'matter spells',
        [P_TWO_WEAPON_COMBAT]: 'two weapon combat',
        [P_RIDING]: 'riding',
    };
    if (odd[type] != null) return odd[type];
    // Positive skill_names_indices → OBJ_NAME
    const otypNames = {
        [P_DAGGER]: 'DAGGER', [P_KNIFE]: 'KNIFE', [P_AXE]: 'AXE',
        [P_PICK_AXE]: 'PICK_AXE', [P_SHORT_SWORD]: 'SHORT_SWORD',
        [P_BROAD_SWORD]: 'BROADSWORD', [P_LONG_SWORD]: 'LONG_SWORD',
        [P_TWO_HANDED_SWORD]: 'TWO_HANDED_SWORD', [P_CLUB]: 'CLUB',
        [P_MACE]: 'MACE', [P_MORNING_STAR]: 'MORNING_STAR',
        [P_FLAIL]: 'FLAIL', [P_QUARTERSTAFF]: 'QUARTERSTAFF',
        [P_SPEAR]: 'SPEAR', [P_TRIDENT]: 'TRIDENT', [P_LANCE]: 'LANCE',
        [P_BOW]: 'BOW', [P_SLING]: 'SLING', [P_CROSSBOW]: 'CROSSBOW',
        [P_DART]: 'DART', [P_SHURIKEN]: 'SHURIKEN',
        [P_BOOMERANG]: 'BOOMERANG', [P_UNICORN_HORN]: 'UNICORN_HORN',
    };
    const on = otypNames[type];
    if (on) {
        const otyp = objectNames.indexOf(on);
        if (otyp >= 0 && objectNameStrs[otyp]) return objectNameStrs[otyp];
    }
    return 'no skill';
}

/** C ref: weapon.c skill_level_name */
function skill_level_name(skill) {
    switch (P_SKILL(skill)) {
    case P_UNSKILLED: return 'Unskilled';
    case P_BASIC: return 'Basic';
    case P_SKILLED: return 'Skilled';
    case P_EXPERT: return 'Expert';
    case P_MASTER: return 'Master';
    case P_GRAND_MASTER: return 'Grand Master';
    default: return 'Unknown';
    }
}

/** C ref: skills.h P_SKILL — current skill rank (u.weapon_skills). */
export function P_SKILL(type) {
    return game.u?.weapon_skills?.[type]?.skill ?? P_ISRESTRICTED;
}
function P_MAX_SKILL(type) {
    return game.u?.weapon_skills?.[type]?.max_skill ?? P_ISRESTRICTED;
}
function P_RESTRICTED(type) {
    return P_SKILL(type) === P_ISRESTRICTED;
}
function set_P_SKILL(type, v) {
    if (!game.u.weapon_skills) return;
    game.u.weapon_skills[type].skill = v;
}
function set_P_MAX_SKILL(type, v) {
    if (!game.u.weapon_skills) return;
    game.u.weapon_skills[type].max_skill = v;
}
function set_P_ADVANCE(type, v) {
    if (!game.u.weapon_skills) return;
    game.u.weapon_skills[type].advance = v;
}

/** C ref: skills.h practice_needed_to_advance */
function practice_needed_to_advance(level) {
    return level * level * 20;
}

/** C ref: weapon.c weapon_type — abs(objects[].oc_skill). */
function weapon_type(obj) {
    if (!obj) return P_BARE_HANDED_COMBAT;
    const o = game.objects?.[obj.otyp];
    if (!o) return P_NONE;
    if (o.oc_class !== WEAPON_CLASS && o.oc_class !== TOOL_CLASS
        && o.oc_class !== GEM_CLASS) {
        return P_NONE;
    }
    const type = o.oc_skill | 0;
    return type < 0 ? -type : type;
}

/**
 * C ref: weapon.c weapon_hit_bonus — skill to-hit for find_roll_to_hit.
 * weapon null → bare-handed / martial arts table (unskilled b.h. = +1).
 */
export function weapon_hit_bonus(weapon) {
    const wep_type = weapon_type(weapon);
    const type = (game.u?.twoweap
        && (weapon === game.u?.uwep || weapon === game.u?.uswapwep))
        ? P_TWO_WEAPON_COMBAT
        : wep_type;
    let bonus = 0;
    if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -4;
            break;
        case P_BASIC:
            bonus = 0;
            break;
        case P_SKILLED:
            bonus = 2;
            break;
        case P_EXPERT:
            bonus = 3;
            break;
        default:
            bonus = -4;
            break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        const wskill = P_SKILL(wep_type);
        if (wskill < skill) skill = wskill;
        switch (skill) {
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -9;
            break;
        case P_BASIC:
            bonus = -7;
            break;
        case P_SKILLED:
            bonus = -5;
            break;
        case P_EXPERT:
            bonus = -3;
            break;
        default:
            bonus = -9;
            break;
        }
    } else if (type === P_BARE_HANDED_COMBAT) {
        // C: bonus = max(P_SKILL, P_UNSKILLED) - 1; then
        // ((bonus + 2) * (martial ? 2 : 1)) / 2
        bonus = P_SKILL(type);
        if (bonus < P_UNSKILLED) bonus = P_UNSKILLED;
        bonus -= 1; // unskilled => 0
        bonus = ((bonus + 2) * (martial_bonus() ? 2 : 1)) / 2 | 0;
    }
    // Riding penalty when mounted
    if (game.u?.usteed) {
        switch (P_SKILL(P_RIDING)) {
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus -= 2;
            break;
        case P_BASIC:
            bonus -= 1;
            break;
        default:
            break;
        }
        if (game.u?.twoweap) bonus -= 2;
    }
    return bonus;
}

const skill_ranges = [
    { first: P_FIRST_H_TO_H, last: P_LAST_H_TO_H, name: 'Fighting Skills' },
    { first: P_FIRST_WEAPON, last: P_LAST_WEAPON, name: 'Weapon Skills' },
    { first: P_FIRST_SPELL, last: P_LAST_SPELL, name: 'Spellcasting Skills' },
];

/**
 * C ref: weapon.c add_skills_to_menu — append skill lines into entries[].
 * selectable/speedy annotations (* # / letters) deferred when unused.
 */
function add_skills_to_menu(entries, selectable, _speedy) {
    let longest = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (P_RESTRICTED(i)) continue;
        const len = P_NAME(i).length;
        if (len > longest) longest = len;
    }
    for (const range of skill_ranges) {
        for (let i = range.first; i <= range.last; i++) {
            if (i === range.first) {
                entries.push({ text: range.name, attr: ATR_INVERSE });
            }
            if (P_RESTRICTED(i)) continue;
            const prefix = selectable ? '    ' : '';
            const name = P_NAME(i).padEnd(longest);
            const lvl = skill_level_name(i);
            // C non-wizard: " %s %-*s [%s]" then paint putchar(' ')
            entries.push({
                text: ` ${prefix} ${name} [${lvl}]`,
                attr: 0,
            });
        }
    }
}

/**
 * C ref: weapon.c unrestrict_weapon_skill — restricted → Unskilled/Basic max.
 */
export function unrestrict_weapon_skill(skill) {
    if (skill < P_NUM_SKILLS && P_RESTRICTED(skill)) {
        set_P_SKILL(skill, P_UNSKILLED);
        set_P_MAX_SKILL(skill, P_BASIC);
        set_P_ADVANCE(skill, 0);
    }
}

/**
 * C ref: weapon.c skill_init.
 * Branch envelope: invent→Basic (skip ammo), role magic Basics, class_skill
 * maxes, bare-hands Expert+, pony riding, advance fill, spelspec
 * unrestrict, non-pauper skill_based_spellbook_id.
 */
export function skill_init(class_skill) {
    if (!game.u) return;
    game.u.weapon_skills = Array.from({ length: P_NUM_SKILLS }, () => ({
        skill: P_ISRESTRICTED,
        max_skill: P_ISRESTRICTED,
        advance: 0,
    }));

    for (const obj of game.invent || []) {
        if (is_ammo(obj)) continue;
        const skill = weapon_type(obj);
        if (skill !== P_NONE) set_P_SKILL(skill, P_BASIC);
    }

    const role = game.urole?.mnum;
    if (role === PM_HEALER || role === PM_MONK) {
        set_P_SKILL(P_HEALING_SPELL, P_BASIC);
    } else if (role === PM_CLERIC) {
        set_P_SKILL(P_CLERIC_SPELL, P_BASIC);
    } else if (role === PM_WIZARD) {
        set_P_SKILL(P_ATTACK_SPELL, P_BASIC);
        set_P_SKILL(P_ENCHANTMENT_SPELL, P_BASIC);
    }

    if (class_skill) {
        for (const entry of class_skill) {
            if (entry.skill === P_NONE) break;
            const skill = entry.skill;
            const skmax = entry.max;
            set_P_MAX_SKILL(skill, skmax);
            if (P_SKILL(skill) === P_ISRESTRICTED) set_P_SKILL(skill, P_UNSKILLED);
        }
    }

    if (P_MAX_SKILL(P_BARE_HANDED_COMBAT) > P_EXPERT) {
        set_P_SKILL(P_BARE_HANDED_COMBAT, P_BASIC);
    }
    if (game.urole?.petnum === PM_PONY) {
        set_P_SKILL(P_RIDING, P_BASIC);
    }

    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (P_RESTRICTED(skill)) continue;
        if (P_MAX_SKILL(skill) < P_SKILL(skill)) {
            set_P_MAX_SKILL(skill, P_SKILL(skill));
        }
        set_P_ADVANCE(skill, practice_needed_to_advance(P_SKILL(skill) - 1));
    }

    // C: each role has a special spell; allow at least Unskilled for its school
    const spelspec = game.urole?.spelspec | 0;
    if (spelspec) unrestrict_weapon_skill(spell_skilltype(spelspec));

    // C: paupers lack advanced access to books
    if (!game.u.uroleplay?.pauper) skill_based_spellbook_id();
}

/** C ref: mthrowu.c monmulti */
export function monmulti(mtmp, otmp, mwep) {
    let multishot = 1;
    const quan = otmp.quan || 1;
    if (quan > 1
        && (is_ammo(otmp)
            ? ammo_and_launcher(otmp, mwep)
            : otmp.oclass === WEAPON_CLASS)
        && !mtmp.mconf) {
        const ptr = mtmp.data;
        if (is_prince(ptr)) multishot += 2;
        else if (is_lord(ptr)) multishot++;

        if (objectNames[otmp.otyp] === 'ELVEN_ARROW' && !otmp.cursed) multishot++;
        if (mwep && objectNames[mwep.otyp] === 'ELVEN_BOW'
            && ammo_and_launcher(otmp, mwep) && !mwep.cursed) {
            multishot++;
        }
        if (ammo_and_launcher(otmp, mwep) && (mwep.spe | 0) > 1) {
            multishot += rounddiv(mwep.spe | 0, 3);
        }
        multishot = rnd(multishot);
        multishot += multishot_class_bonus(mtmp.mnum ?? ptr?.mndx, otmp, mwep);
        // Racial elf/orc/gnome bow bonuses deferred (no race-bit helpers yet)
    }
    if (quan < multishot) multishot = quan;
    if (multishot < 1) multishot = 1;
    return multishot;
}
