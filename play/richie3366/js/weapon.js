// weapon.js — Monster weapon selection + damage (partial).
// C ref: weapon.c select_rwep / select_hwep / dmgval / special_dmgval /
//         silver_sears / mon_wield_item / possibly_unwield /
//         setmnotwielded / mwepgone; enhance_weapon_skill (#enhance);
//         dothrow.c should_mulch_missile / multishot_class_bonus.

import { game } from './gstate.js';
import { rn2, rnd, rnl, d } from './rng.js';
import {
    flush_topl_more, pline, You_feel, canseemon, bot, pline_mon, newsym,
} from './display.js';
import { cansee } from './vision.js';
import { select_menu_pick_none } from './invent.js';
import { select_menu_pick_one } from './options.js';
import { yn_function } from './getline.js';
import { Monnam, mon_nam, s_suffix } from './do_name.js';
import { doname, xname, vtense, The, distant_name, otense } from './objnam.js';
import {
    WEAPON_CLASS, GEM_CLASS, TOOL_CLASS, BALL_CLASS, CHAIN_CLASS,
    objectNames, objectNameStrs, is_axe, LEATHER, SILVER,
} from './objects.js';
import {
    is_ammo, ammo_and_launcher, is_missile, mwelded, is_weptool,
} from './wield.js';
import {
    is_lord, is_prince, strongmonst, mon_hates_blessings, mon_hates_silver,
    bigmonst, thick_skinned, is_wooden, hates_light,
} from './monsters.js';
import { which_armor, bypass_obj } from './worn.js';
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
    P_FIRST_H_TO_H, P_LAST_H_TO_H, P_NUM_SKILLS, P_SKILL_LIMIT,
    P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT,
    P_MASTER, P_GRAND_MASTER,
    NEED_WEAPON, NEED_RANGED_WEAPON, NEED_HTH_WEAPON,
    NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE,
    NO_WEAPON_WANTED, W_WEP, W_ARMS, W_ARMG,
    W_ARM, W_ARMC, W_ARMH, W_ARMF, W_ARMU, W_RINGL, W_RINGR,
    ECMD_OK, STR18, Upolyd, MAXULEV, HAND, WT_IRON_BALL_INCR,
} from './const.js';
import { obj_extract_self, place_object, stackobj } from './mkobj.js';
import { flooreffects } from './do.js';
import { artifact_light, end_burn } from './timeout.js';
import { mbodypart } from './polyself.js';
import { attacktype_fordmg } from './uhitm.js';
import { acurr, A_STR } from './attrib.js';
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
import { spec_abon, shade_glare, spec_dbon } from './artifact.js';

const PM_PONY = monsterNames.indexOf('PM_PONY');
const PM_SHADE = monsterNames.indexOf('PM_SHADE');

export { is_missile };

/** Sentinel — C decl.c hands_obj. Not a real inventory object. */
export const hands_obj = { otyp: -1, _hands: true };

/** C ref: monst.h MON_WEP(mon) → mon->mw */
export function MON_WEP(mon) {
    return mon?.mw || null;
}

/** C ref: monst.h MON_NOWEP(mon) → mon->mw = 0 */
export function MON_NOWEP(mon) {
    mon.mw = null;
}

/** C ref: monattk.h AT_WEAP — uses weapon. */
const AT_WEAP = 254;

/**
 * C ref: weapon.c setmnotwielded `:1813–1828`.
 * Returns a Promise when the artifact_light stop-shining pline runs;
 * otherwise void so sync callers (mwepgone / stolen-wep) stay boolean.
 */
export function setmnotwielded(mon, obj) {
    if (!obj) return;
    let lightP = null;
    if (artifact_light(obj) && obj.lamplit) {
        end_burn(obj, false);
        if (canseemon(mon)) {
            lightP = pline(
                `${The(xname(obj))} in ${s_suffix(mon_nam(mon))} ${mbodypart(mon, HAND)} ${otense(obj, 'stop')} shining.`,
            );
        }
    }
    if (MON_WEP(mon) === obj) MON_NOWEP(mon);
    obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
    return lightP;
}

/**
 * C ref: weapon.c mwepgone `:937–946` — setmnotwielded then NEED_WEAPON.
 */
export function mwepgone(mon) {
    const mwep = MON_WEP(mon);
    if (mwep) {
        const sm = setmnotwielded(mon, mwep);
        mon.weapon_check = NEED_WEAPON;
        return sm;
    }
}

/**
 * C ref: weapon.c possibly_unwield `:746–795`.
 * Drop path awaits pline_mon / flooreffects (nhgetch). Stolen/destroyed
 * mw and still-AT_WEAP NEED_WEAPON stay synchronous so newcham NO_NC_FLAGS
 * can remain a boolean. Named: steal_it / mhitm_ad_sitm callers; m_throw
 * uses setmnotwielded not this (C `:604–607`).
 * @returns {void|Promise<void>}
 */
export function possibly_unwield(mon, polyspot) {
    const mw_tmp = MON_WEP(mon);
    if (!mw_tmp) return;
    let obj = mon.minvent;
    for (; obj; obj = obj.nobj) {
        if (obj === mw_tmp) break;
    }
    if (!obj) {
        /* The weapon was stolen or destroyed */
        MON_NOWEP(mon);
        mon.weapon_check = NEED_WEAPON;
        return;
    }
    if (!attacktype_fordmg(mon.data, AT_WEAP, -1)) {
        return possibly_unwield_drop(mon, obj, mw_tmp, polyspot);
    }
    /* Stronger/weaker poly still wields until mon_wield_item. */
    if (!(mwelded(mw_tmp) && mon.weapon_check === NO_WEAPON_WANTED)) {
        mon.weapon_check = NEED_WEAPON;
    }
}

/** C: possibly_unwield !AT_WEAP drop — distant_name before extract_self. */
async function possibly_unwield_drop(mon, obj, mw_tmp, polyspot) {
    const sm = setmnotwielded(mon, mw_tmp);
    if (sm) await sm;
    mon.weapon_check = NO_WEAPON_WANTED;
    if (cansee(mon.mx, mon.my)) {
        await pline_mon(
            mon,
            `${Monnam(mon)} drops ${distant_name(obj, doname)}.`,
        );
        newsym(mon.mx, mon.my);
    }
    obj_extract_self(obj);
    if (!(await flooreffects(obj, mon.mx, mon.my, 'drop'))) {
        if (polyspot) bypass_obj(obj);
        place_object(obj, mon.mx, mon.my);
        stackobj(obj);
    }
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
 * C ref: weapon.c hitval — spe (weapon/weptool) + oc_hitbon + oartifact
 * spec_abon (D-0611). Blessed/spear/trident/pick/silver vs-mon deferred.
 * objects[].oc_hitbon is the oc_oc1 union exported as a_ac.
 */
export function hitval(otmp, mon) {
    if (!otmp) return 0;
    const o = game.objects?.[otmp.otyp];
    let tmp = 0;
    const Is_weapon = otmp.oclass === WEAPON_CLASS
        || (otmp.oclass === TOOL_CLASS && ((o?.oc_skill | 0) !== P_NONE));
    if (Is_weapon) tmp += otmp.spe | 0;
    tmp += o?.a_ac | 0;
    // C: if (otmp->oartifact) tmp += spec_abon(otmp, mon);
    if (otmp.oartifact) tmp += spec_abon(otmp, mon);
    return tmp;
}

/**
 * C ref: weapon.c dmgval `:215–356` — oc_wsdam/oc_wldam + otyp switch,
 * spe, thick_skinned/leather, shade_glare (D-1354), heavy iron ball,
 * blessed/axe/silver/artifact_light bonus rnd(), spec_dbon double-damage
 * half, greatest_erosion. hitval spec_abon is D-0611, not here.
 */
export function dmgval(otmp, mon) {
    if (!otmp) return 0;
    const otyp = otmp.otyp | 0;
    const od = game.objects?.[otyp];
    const n = objectNames[otyp];
    if (n === 'CREAM_PIE') return 0;

    let tmp = 0;
    const ptr = mon?.data;
    if (bigmonst(ptr)) {
        const wld = od?.oc_wldam | 0;
        if (wld) tmp = rnd(wld);
        switch (n) {
        case 'IRON_CHAIN':
        case 'CROSSBOW_BOLT':
        case 'MORNING_STAR':
        case 'PARTISAN':
        case 'RUNESWORD':
        case 'ELVEN_BROADSWORD':
        case 'BROADSWORD':
            tmp++;
            break;
        case 'FLAIL':
        case 'RANSEUR':
        case 'VOULGE':
            tmp += rnd(4);
            break;
        case 'ACID_VENOM':
        case 'HALBERD':
        case 'SPETUM':
            tmp += rnd(6);
            break;
        case 'BATTLE_AXE':
        case 'BARDICHE':
        case 'TRIDENT':
            tmp += d(2, 4);
            break;
        case 'TSURUGI':
        case 'DWARVISH_MATTOCK':
        case 'TWO_HANDED_SWORD':
            tmp += d(2, 6);
            break;
        }
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

    if ((od?.oc_material | 0) <= LEATHER && thick_skinned(ptr)) tmp = 0;
    if ((ptr?.mndx | 0) === PM_SHADE && !shade_glare(otmp)) tmp = 0;

    if (n === 'HEAVY_IRON_BALL' && tmp > 0) {
        let wt = od?.oc_weight | 0;
        if ((otmp.owt | 0) > wt) {
            wt = Math.trunc(((otmp.owt | 0) - wt) / WT_IRON_BALL_INCR);
            tmp += rnd(4 * wt);
            if (tmp > 25) tmp = 25;
        }
    }

    if (Is_weapon || otmp.oclass === GEM_CLASS || otmp.oclass === BALL_CLASS
            || otmp.oclass === CHAIN_CLASS) {
        let bonus = 0;
        if (otmp.blessed && mon_hates_blessings(mon)) bonus += rnd(4);
        if (is_axe(otmp) && is_wooden(ptr)) bonus += rnd(4);
        if ((od?.oc_material | 0) === SILVER && mon_hates_silver(mon)) {
            bonus += rnd(20);
        }
        if (artifact_light(otmp) && otmp.lamplit && hates_light(ptr)) {
            bonus += rnd(8);
        }
        if (bonus > 1 && otmp.oartifact && spec_dbon(otmp, mon, 25) >= 25) {
            bonus = Math.trunc((bonus + 1) / 2);
        }
        tmp += bonus;
    }

    if (tmp > 0) {
        tmp -= greatest_erosion(otmp);
        if (tmp < 1) tmp = 1;
    }
    return tmp;
}

/** C ref: obj.h greatest_erosion — max(oeroded, oeroded2). */
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
    // C: obj->blessed && (svc.context.mon_moving ? !rn2(3) : !rnl(4))
    if (obj.blessed && (game.context?.mon_moving ? !rn2(3) : !rnl(4))) {
        broken = false;
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

/** C ref: weapon.c monmightthrowwep — otyp in rwep[]. */
export function monmightthrowwep(obj) {
    if (!obj) return false;
    for (const name of RWEP_NAMES) {
        if (obj.otyp === otyp(name)) return true;
    }
    return false;
}

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
const M2_GIANT = 0x00002000; // monflag.h

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

const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');

/**
 * C ref: worn.c which_armor youmonst switch — hero uses u.uarm* slots.
 * Monster path is worn.js which_armor (minvent owornmask).
 */
function which_armor_magr(magr, flag) {
    if (magr === game.youmonst) {
        const u = game.u || {};
        if (flag === W_ARM) return u.uarm || null;
        if (flag === W_ARMC) return u.uarmc || null;
        if (flag === W_ARMH) return u.uarmh || null;
        if (flag === W_ARMS) return u.uarms || null;
        if (flag === W_ARMG) return u.uarmg || null;
        if (flag === W_ARMF) return u.uarmf || null;
        if (flag === W_ARMU) return u.uarmu || null;
        return null;
    }
    return which_armor(magr, flag);
}

/**
 * C ref: weapon.c special_dmgval — blessed and/or silver bonus for
 * non-weapon hits (hug cloak/suit/shirt or gloves+rings).
 * silverhit_p is `{ v }` out-param like C long*.
 * mon_hates_silver is C mondata.c (D-1254), not M2_WERE|M2_DEMON.
 */
export function special_dmgval(magr, mdef, armask, silverhit_p) {
    const left_ring = !!(armask & W_RINGL);
    const right_ring = !!(armask & W_RINGR);
    let silverhit = 0;
    let bonus = 0;
    let obj = null;
    if (armask & (W_ARMC | W_ARM | W_ARMU)) {
        if ((armask & W_ARMC) && (obj = which_armor_magr(magr, W_ARMC))) {
            armask = W_ARMC;
        } else if ((armask & W_ARM) && (obj = which_armor_magr(magr, W_ARM))) {
            armask = W_ARM;
        } else if ((armask & W_ARMU) && (obj = which_armor_magr(magr, W_ARMU))) {
            armask = W_ARMU;
        } else {
            armask = 0;
            obj = null;
        }
    } else if (armask & (W_ARMG | W_RINGL | W_RINGR)) {
        obj = which_armor_magr(magr, W_ARMG);
        armask = obj ? W_ARMG : 0;
    } else {
        obj = which_armor_magr(magr, armask);
    }

    if (obj) {
        if (obj.blessed && mon_hates_blessings(mdef)) bonus += rnd(4);
        if ((game.objects?.[obj.otyp]?.oc_material | 0) === SILVER
            && mon_hates_silver(mdef)) {
            bonus += rnd(20);
            silverhit |= armask;
        }
    } else if ((left_ring || right_ring) && magr === game.youmonst) {
        const u = game.u || {};
        if (left_ring && u.uleft) {
            if ((game.objects?.[u.uleft.otyp]?.oc_material | 0) === SILVER
                && mon_hates_silver(mdef)) {
                bonus += rnd(20);
                silverhit |= W_RINGL;
            }
        }
        if (right_ring && u.uright) {
            if ((game.objects?.[u.uright.otyp]?.oc_material | 0) === SILVER
                && mon_hates_silver(mdef)) {
                if (!(silverhit & W_RINGL)) bonus += rnd(20);
                silverhit |= W_RINGR;
            }
        }
    }

    if (silverhit_p) silverhit_p.v = silverhit;
    return bonus;
}

/**
 * C ref: weapon.c silver_sears — "silver <item> sears <target>"; rings only.
 */
export async function silver_sears(_magr, mdef, silverhit) {
    const u = game.u || {};
    const ltyp = (u.uleft && (silverhit & W_RINGL))
        ? (u.uleft.otyp | 0) : STRANGE_OBJECT;
    const rtyp = (u.uright && (silverhit & W_RINGR))
        ? (u.uright.otyp | 0) : STRANGE_OBJECT;
    const l_dknown = !!(u.uleft && u.uleft.dknown);
    const r_dknown = !!(u.uright && u.uright.dknown);
    const l_ag = (game.objects?.[ltyp]?.oc_material | 0) === SILVER && l_dknown;
    const r_ag = (game.objects?.[rtyp]?.oc_material | 0) === SILVER && r_dknown;

    if (silverhit & (W_RINGL | W_RINGR)) {
        const both = ((ltyp === rtyp && l_dknown === r_dknown) || (l_ag && r_ag));
        const rings = `ring${both ? 's' : ''}`;
        const prefix = (l_ag || r_ag) ? 'silver '
            : both ? ''
            : (silverhit & W_RINGL) ? 'left ' : 'right ';
        await pline(
            `Your ${prefix}${rings} ${vtense(rings, 'sear')} ${mon_nam(mdef)}!`,
        );
    }
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
 * Named omissions: mwelded refuse-wield plines, weld-on-wield, artifact_light,
 * autoreturn tether pline.
 */
export async function mon_wield_item(mon) {
    if (mon.weapon_check === NO_WEAPON_WANTED) return 0;
    let obj = null;
    // C: dig tools use '.' (exclaim FALSE); HTH/ranged use '!'
    let exclaim = true;
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
        exclaim = false;
        break;
    case NEED_AXE:
        obj = m_carrying(mon, BATTLE_AXE);
        if (!obj || mon_has_shield(mon)) obj = m_carrying(mon, AXE);
        exclaim = false;
        break;
    case NEED_PICK_OR_AXE:
        obj = m_carrying(mon, DWARVISH_MATTOCK);
        if (!obj) obj = m_carrying(mon, BATTLE_AXE);
        if (!obj || mon_has_shield(mon)) {
            obj = m_carrying(mon, PICK_AXE);
            if (!obj) obj = m_carrying(mon, AXE);
        }
        exclaim = false;
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
        mon.weapon_check = NEED_WEAPON;
        // C: canseemon → pline_mon("%s wields %s%c", Monnam, doname, !|.)
        // before final owornmask (weld/artifact_light arms deferred)
        if (canseemon(mon)) {
            await pline_mon(
                mon,
                `${Monnam(mon)} wields ${doname(obj)}${exclaim ? '!' : '.'}`,
            );
        }
        obj.owornmask = (obj.owornmask || 0) | W_WEP;
        return 1;
    }
    mon.weapon_check = NEED_WEAPON;
    return 0;
}

/** C ref: flag.h `#define wizard flags.debug` */
function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

/** C ref: weapon.c slots_required */
function slots_required(skill) {
    const tmp = P_SKILL(skill);
    if (skill <= P_LAST_WEAPON || skill === P_TWO_WEAPON_COMBAT) return tmp;
    return Math.trunc((tmp + 1) / 2);
}

/**
 * C ref: weapon.c can_advance.
 * Exported for insight enhance tips (callers may still defer messaging).
 */
export function can_advance(skill, speedy) {
    if (P_RESTRICTED(skill)
        || P_SKILL(skill) >= P_MAX_SKILL(skill)
        || (game.u?.skills_advanced | 0) >= P_SKILL_LIMIT) {
        return false;
    }
    if (wizardMode() && speedy) return true;
    return (P_ADVANCE(skill) | 0) >= practice_needed_to_advance(P_SKILL(skill))
        && (game.u?.weapon_slots | 0) >= slots_required(skill);
}

/** C ref: weapon.c could_advance */
function could_advance(skill) {
    if (P_RESTRICTED(skill)
        || P_SKILL(skill) >= P_MAX_SKILL(skill)
        || (game.u?.skills_advanced | 0) >= P_SKILL_LIMIT) {
        return false;
    }
    return (P_ADVANCE(skill) | 0) >= practice_needed_to_advance(P_SKILL(skill));
}

/** C ref: weapon.c peaked_skill */
function peaked_skill(skill) {
    if (P_RESTRICTED(skill)) return false;
    return P_SKILL(skill) >= P_MAX_SKILL(skill)
        && (P_ADVANCE(skill) | 0) >= practice_needed_to_advance(P_SKILL(skill));
}

/** C plur — singular empty / plural "s" */
function plur(n) {
    return (n | 0) === 1 ? '' : 's';
}

/**
 * C ref: weapon.c skill_advance — spend slots, bump rank, You message,
 * spell-school discover.
 */
async function skill_advance(skill) {
    const u = game.u;
    if (!u) return;
    u.weapon_slots = (u.weapon_slots | 0) - slots_required(skill);
    set_P_SKILL(skill, P_SKILL(skill) + 1);
    if (!u.skill_record) u.skill_record = new Array(P_SKILL_LIMIT).fill(0);
    u.skill_record[u.skills_advanced | 0] = skill;
    u.skills_advanced = (u.skills_advanced | 0) + 1;
    const most = P_SKILL(skill) >= P_MAX_SKILL(skill) ? 'most' : 'more';
    await pline(`You are now ${most} skilled in ${P_NAME(skill)}.`);
    if (skill >= P_FIRST_SPELL && skill <= P_LAST_SPELL) {
        skill_based_spellbook_id();
    }
}

/**
 * C ref: weapon.c drain_weapon_skill `:1476–1514` — drop n advanced
 * skills (mhitu AD_DRIN D-1329). Each pick `rn2(skills_advanced)` then
 * shift skill_record, P_SKILL--, refund slots_required at the new
 * rank, maybe rn2-clip P_ADVANCE. C panics if rank was already
 * Unskilled; JS skips the decrement.
 */
export async function drain_weapon_skill(n) {
    const u = game.u || {};
    const tmpskills = new Array(P_NUM_SKILLS).fill(0);
    n = n | 0;
    while (--n >= 0) {
        if (u.skills_advanced) {
            const i = rn2(u.skills_advanced);
            const skill = u.skill_record[i];
            tmpskills[skill] = 1;
            for (let j = i; j < (u.skills_advanced | 0) - 1; j++) {
                u.skill_record[j] = u.skill_record[j + 1];
            }
            u.skills_advanced--;
            if (P_SKILL(skill) <= P_UNSKILLED) continue;
            set_P_SKILL(skill, P_SKILL(skill) - 1);
            u.weapon_slots = (u.weapon_slots | 0) + slots_required(skill);
            const curradv = practice_needed_to_advance(P_SKILL(skill));
            const prevadv = practice_needed_to_advance(P_SKILL(skill) - 1);
            if ((P_ADVANCE(skill) | 0) >= curradv) {
                set_P_ADVANCE(skill, prevadv + rn2(curradv - prevadv));
            }
        }
    }
    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (tmpskills[skill]) {
            const some = P_SKILL(skill) >= P_BASIC ? 'some of ' : '';
            await pline(
                `You forget ${some}your training in ${P_NAME(skill)}.`,
            );
        }
    }
}

/**
 * C ref: weapon.c enhance_weapon_skill (#enhance) + add_skills_to_menu.
 * Branch envelope: wizard y_n + speedy PICK_ONE loop + skill_advance;
 * non-wizard / no-advance PICK_NONE; * / # legend. add_weapon_skill /
 * lose_weapon_skill / use_skill may-advance msg still deferred.
 */
export async function enhance_weapon_skill() {
    await flush_topl_more();
    // C: svc.context.tips |= (1 << TIP_ENHANCE); TIP_ENHANCE=0
    if (game.context) game.context.tips = (game.context.tips | 0) | (1 << 0);

    let speedy = false;
    // C: y_n(query) → yn_function(query, ynchars, 'n', TRUE)
    if (wizardMode()
        && (await yn_function('Advance skills without practice?', 'yn', 'n')) === 'y') {
        speedy = true;
    }

    let n = 0;
    do {
        let to_advance = 0;
        let eventually_advance = 0;
        let maxxed_cnt = 0;
        for (let i = 0; i < P_NUM_SKILLS; i++) {
            if (P_RESTRICTED(i)) continue;
            if (can_advance(i, speedy)) to_advance++;
            else if (could_advance(i)) eventually_advance++;
            else if (peaked_skill(i)) maxxed_cnt++;
        }

        const raw = [];
        if (eventually_advance > 0 || maxxed_cnt > 0) {
            if (eventually_advance > 0) {
                const when = (game.u?.ulevel | 0) < MAXULEV
                    ? "when you're more experienced"
                    : 'if skill slots become available';
                raw.push({
                    text: `(Skill${plur(eventually_advance)} flagged by "*" may be enhanced ${when}.)`,
                    attr: 0,
                    selectable: false,
                });
            }
            if (maxxed_cnt > 0) {
                raw.push({
                    text: `(Skill${plur(maxxed_cnt)} flagged by "#" cannot be enhanced any further.)`,
                    attr: 0,
                    selectable: false,
                });
            }
            raw.push({ text: '', attr: 0, selectable: false });
        }

        const selectable = to_advance + eventually_advance + maxxed_cnt > 0;
        add_skills_to_menu(raw, selectable, speedy);

        let prompt = to_advance > 0
            ? 'Pick a skill to advance:'
            : 'Current skills:';
        if (wizardMode() && !speedy) {
            const slots = game.u?.weapon_slots | 0;
            prompt += `  (${slots} slot${plur(slots)} available)`;
        }
        // C tty_end_menu: prepend prompt then blank
        raw.unshift(
            { text: prompt, attr: ATR_INVERSE, selectable: false },
            { text: '', attr: 0, selectable: false },
        );

        n = 0;
        if (to_advance > 0) {
            const res = await select_menu_pick_one(raw);
            // C fullscreen NHW_MENU dismiss → botlx/bot before You/--More--
            // (select_menu_pick_one clear_committed_status for Options path)
            await bot();
            if (res.kind === 'pick' && res.item?.skill != null) {
                await skill_advance(res.item.skill);
                for (let i = 0; i < P_NUM_SKILLS; i++) {
                    if (can_advance(i, speedy)) {
                        if (!speedy) {
                            await You_feel('you could be more dangerous!');
                        }
                        n = 1;
                        break;
                    }
                }
            }
        } else {
            await select_menu_pick_none(raw.map((it) => ({
                text: it.text,
                attr: it.attr || 0,
            })));
        }
    } while (speedy && n > 0);

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
function P_ADVANCE(type) {
    return game.u?.weapon_skills?.[type]?.advance ?? 0;
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
export function weapon_type(obj) {
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
 * C ref: weapon.c dbon — strength damage bonus (0 when Upolyd).
 * Named omission: none for ordinary STR bands.
 */
export function dbon() {
    if (Upolyd(game.u)) return 0;
    const str = acurr(A_STR);
    if (str < 6) return -1;
    if (str < 16) return 0;
    if (str < 18) return 1;
    if (str === 18) return 2;
    if (str <= STR18(75)) return 3;
    if (str <= STR18(90)) return 4;
    if (str < STR18(100)) return 5;
    return 6;
}

/**
 * C ref: weapon.c weapon_dam_bonus — skill damage for hmon_hitmon_dmg_recalc.
 * weapon null → bare-handed / martial arts (Basic m.a. = +3).
 * Named omission: none for ordinary skill ranks; steed riding bonus included.
 */
export function weapon_dam_bonus(weapon) {
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
        default:
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -2;
            break;
        case P_BASIC:
            bonus = 0;
            break;
        case P_SKILLED:
            bonus = 1;
            break;
        case P_EXPERT:
            bonus = 2;
            break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        const wskill = P_SKILL(wep_type);
        if (wskill < skill) skill = wskill;
        switch (skill) {
        default:
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -3;
            break;
        case P_BASIC:
            bonus = -1;
            break;
        case P_SKILLED:
            bonus = 0;
            break;
        case P_EXPERT:
            bonus = 1;
            break;
        }
    } else if (type === P_BARE_HANDED_COMBAT) {
        // C: unskl 0; basic +1/+3; skild +1/+4; exprt +2/+6; …
        bonus = P_SKILL(type);
        if (bonus < P_UNSKILLED) bonus = P_UNSKILLED;
        bonus -= 1; // unskilled => 0
        bonus = Math.trunc(((bonus + 1) * (martial_bonus() ? 3 : 1)) / 2);
    }
    if (game.u?.usteed && type !== P_TWO_WEAPON_COMBAT) {
        switch (P_SKILL(P_RIDING)) {
        case P_SKILLED:
            bonus += 1;
            break;
        case P_EXPERT:
            bonus += 2;
            break;
        default:
            break;
        }
    }
    return bonus;
}

/**
 * C ref: weapon.c use_skill — advance practice; may-advance msg deferred.
 */
export function use_skill(skill, degree) {
    if (skill === P_NONE) return;
    const ws = game.u?.weapon_skills?.[skill];
    if (!ws || ws.skill === P_ISRESTRICTED) return;
    ws.advance = (ws.advance || 0) + (degree | 0);
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
 * selectable → lettered can_advance rows (+ * / # annotations); wizard
 * shows practice counts.
 */
function add_skills_to_menu(entries, selectable, speedy) {
    let longest = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (P_RESTRICTED(i)) continue;
        const len = P_NAME(i).length;
        if (len > longest) longest = len;
    }
    const wiz = wizardMode();
    for (const range of skill_ranges) {
        for (let i = range.first; i <= range.last; i++) {
            if (i === range.first) {
                entries.push({
                    text: range.name,
                    attr: ATR_INVERSE,
                    selectable: false,
                });
            }
            if (P_RESTRICTED(i)) continue;
            let prefix;
            if (!selectable) prefix = '';
            else if (can_advance(i, speedy)) prefix = '';
            else if (could_advance(i)) prefix = '  * ';
            else if (peaked_skill(i)) prefix = '  # ';
            else prefix = '    ';
            const name = P_NAME(i).padEnd(longest);
            const sklnam = skill_level_name(i).padEnd(12);
            let text;
            if (wiz) {
                const adv = P_ADVANCE(i) | 0;
                const need = practice_needed_to_advance(P_SKILL(i));
                // C: " %s%-*s %-12s %5d(%4d)" — space before and after level field
                text = ` ${prefix}${name} ${sklnam} ${String(adv).padStart(5)}(${String(need).padStart(4)})`;
            } else {
                // C non-wizard: " %s %-*s [%s]"
                text = ` ${prefix} ${name} [${skill_level_name(i)}]`;
            }
            const canSel = selectable && can_advance(i, speedy);
            entries.push({
                text,
                attr: 0,
                selectable: canSel,
                skill: i,
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
    // C you.h zero-init; pauper_reinit may set weapon_slots = 2 later
    if (game.u.weapon_slots == null) game.u.weapon_slots = 0;
    game.u.skills_advanced = 0;
    game.u.skill_record = new Array(P_SKILL_LIMIT).fill(0);

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

const TOWEL = objectNames.indexOf('TOWEL');

/** C obj.h is_wet_towel — TOWEL with spe > 0. */
export function is_wet_towel(o) {
    return !!(o && o.otyp === TOWEL && (o.spe | 0) > 0);
}

/** C invent.c carried — invent membership. */
function towel_carried(obj) {
    return !!(obj && (game.invent || []).includes(obj));
}

/** C invent.c mcarried — minvent membership. */
function towel_mcarried(obj) {
    return !!(obj?.ocarry);
}

/** C hacklib.c s_suffix — possessive for mon towel dry pline. */
function s_suffix_towel(s) {
    if (!s) return s;
    const last = s.charAt(s.length - 1).toLowerCase();
    if (last === 's' || last === 'x' || last === 'z'
        || s.toLowerCase().endsWith('sh') || s.toLowerCase().endsWith('ch')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/** C objnam.c Yobjnam2 thin — "Your <xname>" [+ verb]. */
function Yobjnam2_towel(obj, verb) {
    const nam = xname(obj);
    if (!verb) return `Your ${nam}`;
    return `Your ${nam} ${vtense(nam, verb)}`;
}

/**
 * C ref: weapon.c finish_towel_change — clamp spe 0..7; uwep unweapon;
 * invent update deferred.
 */
function finish_towel_change(obj, newspe) {
    newspe = Math.min(newspe | 0, 7);
    obj.spe = Math.max(newspe, 0);
    if (obj === game.u?.uwep) {
        if (!game.gu) game.gu = {};
        game.gu.unweapon = !is_wet_towel(obj);
    }
    // update_inventory deferred
}

/**
 * C ref: weapon.c wet_a_towel
 * amt ≤ 0: increment by -amt; amt > 0: set; amt == 0: no-op.
 * Verbose invent/mcarried plines when wetness increases.
 */
export async function wet_a_towel(obj, amt, verbose) {
    if (!obj) return;
    const cur = obj.spe | 0;
    const newspe = (amt <= 0) ? cur - amt : amt;
    if (newspe > cur && verbose) {
        const wetness = (newspe < 3)
            ? (!cur ? 'damp' : 'damper')
            : (!cur ? 'wet' : 'wetter');
        if (towel_carried(obj)) {
            await pline(`${Yobjnam2_towel(obj, null)} gets ${wetness}.`);
        } else if (towel_mcarried(obj) && canseemon(obj.ocarry)) {
            await pline(
                `${s_suffix_towel(Monnam(obj.ocarry))} ${xname(obj)} gets ${wetness}.`,
            );
        }
    }
    if (newspe !== cur) finish_towel_change(obj, newspe);
}

/**
 * C ref: weapon.c dry_a_towel
 * amt < 0: decrement by abs(amt); amt ≥ 0: set (0 is not a no-op).
 * Verbose invent/mcarried plines when wetness decreases.
 */
export async function dry_a_towel(obj, amt, verbose) {
    if (!obj) return;
    const cur = obj.spe | 0;
    const newspe = (amt < 0) ? cur + amt : amt;
    if (newspe < cur && verbose) {
        const out = !newspe ? ' out' : '';
        if (towel_carried(obj)) {
            await pline(`${Yobjnam2_towel(obj, null)} dries${out}.`);
        } else if (towel_mcarried(obj) && canseemon(obj.ocarry)) {
            await pline(
                `${s_suffix_towel(Monnam(obj.ocarry))} ${xname(obj)} dries${out}.`,
            );
        }
    }
    if (newspe !== cur) finish_towel_change(obj, newspe);
}
