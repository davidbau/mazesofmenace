// weapon.js — Monster ranged weapon selection + damage (partial).
// C ref: weapon.c select_rwep / dmgval / mon_wield_item (ranged subset);
//         enhance_weapon_skill (#enhance); dothrow.c should_mulch_missile /
//         multishot_class_bonus.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, docrt } from './display.js';
import { paint_corner_nhw_menu } from './invent.js';
import { WEAPON_CLASS, GEM_CLASS, objectNames } from './objects.js';
import {
    is_ammo, ammo_and_launcher, is_missile,
} from './wield.js';
import { is_lord, is_prince } from './monsters.js';
import {
    P_DAGGER, P_SPEAR, P_SLING, P_SHURIKEN, P_BOW, P_CROSSBOW,
    NEED_WEAPON, NEED_RANGED_WEAPON, NO_WEAPON_WANTED, W_WEP,
    ECMD_OK,
} from './const.js';
import { ATR_INVERSE } from './terminal.js';
import {
    PM_CAVE_DWELLER, PM_MONK, PM_RANGER, PM_ROGUE, PM_SAMURAI,
} from './generated/monsters_data.js';

export { is_missile };

/** Sentinel — C decl.c hands_obj. Not a real inventory object. */
export const hands_obj = { otyp: -1, _hands: true };

/** C ref: monst.h MON_WEP(mon) → mon->mw */
export function MON_WEP(mon) {
    return mon?.mw || null;
}

/**
 * C objects.h WEAPON(…, sdam, …) — extractor omits oc_wsdam for now.
 * Values from upstream objects.h small-monster damage column.
 */
const OC_WSDAM = Object.freeze({
    ARROW: 6, ELVEN_ARROW: 7, ORCISH_ARROW: 5, SILVER_ARROW: 6, YA: 7,
    CROSSBOW_BOLT: 4, DART: 3, SHURIKEN: 8, BOOMERANG: 9,
    SPEAR: 6, ELVEN_SPEAR: 7, ORCISH_SPEAR: 5, DWARVISH_SPEAR: 8,
    SILVER_SPEAR: 6, JAVELIN: 6, TRIDENT: 6,
    DAGGER: 4, ELVEN_DAGGER: 5, ORCISH_DAGGER: 3, SILVER_DAGGER: 4,
    KNIFE: 3, FLINT: 6, ROCK: 3, LOADSTONE: 6, LUCKSTONE: 6,
    // melee (objects.h small-monster column) — hero hitum / dmgval
    MACE: 6, SILVER_MACE: 6, WAR_HAMMER: 4, FLAIL: 6, CLUB: 6,
    AKLYS: 6, MORNING_STAR: 4, QUARTERSTAFF: 6,
    SHORT_SWORD: 6, ELVEN_SHORT_SWORD: 8, ORCISH_SHORT_SWORD: 5,
    DWARVISH_SHORT_SWORD: 7, SCIMITAR: 8, SILVER_SABER: 8,
    LONG_SWORD: 8, ELVEN_BROADSWORD: 6, BROADSWORD: 4,
    RUNESWORD: 4, TWO_HANDED_SWORD: 12, KATANA: 10,
    TSURUGI: 8, CRYSKNIFE: 10, AXE: 6, BATTLE_AXE: 6,
    PICK_AXE: 6, DWARVISH_MATTOCK: 12,
});

function oc_wsdam(obj) {
    const o = game.objects?.[obj.otyp];
    if (o?.oc_wsdam != null) return o.oc_wsdam | 0;
    const n = objectNames[obj.otyp];
    return OC_WSDAM[n] ?? 1;
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
 * C ref: weapon.c dmgval — small-monster / thrown path (oc_wsdam + spe).
 * Large-monster table, silver/blessed/axe bonuses deferred.
 */
export function dmgval(otmp, _mon) {
    if (!otmp) return 0;
    let tmp = 0;
    const wsd = oc_wsdam(otmp);
    if (wsd) tmp = rnd(wsd);
    const n = objectNames[otmp.otyp];
    if (n === 'CROSSBOW_BOLT' || n === 'IRON_CHAIN' || n === 'MACE'
        || n === 'SILVER_MACE' || n === 'WAR_HAMMER' || n === 'FLAIL'
        || n === 'SPETUM' || n === 'TRIDENT') {
        tmp++;
    }
    if (otmp.oclass === WEAPON_CLASS || otmp.oclass === GEM_CLASS) {
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

/**
 * C ref: weapon.c mon_wield_item — NEED_RANGED_WEAPON → propellor only.
 */
export function mon_wield_item(mon) {
    if (mon.weapon_check === NO_WEAPON_WANTED) return 0;
    let obj = null;
    if (mon.weapon_check === NEED_RANGED_WEAPON) {
        select_rwep(mon);
        obj = game._propellor;
    } else {
        mon.weapon_check = NEED_WEAPON;
        return 0;
    }
    if (obj && obj !== hands_obj) {
        const mw_tmp = MON_WEP(mon);
        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            mon.weapon_check = NEED_WEAPON;
            return 0;
        }
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
 * C ref: weapon.c enhance_weapon_skill (#enhance).
 * Branch envelope: non-wizard path with no advanceable skills → PICK_NONE
 * menu dismissed by ESC/space/return (0 RNG). Wizard speedy y_n,
 * skill_advance, can_advance / add_skills_to_menu body deferred.
 */
export async function enhance_weapon_skill() {
    await flush_topl_more();
    // C: svc.context.tips |= (1 << TIP_ENHANCE); TIP_ENHANCE=0
    if (game.context) game.context.tips = (game.context.tips | 0) | (1 << 0);
    // wizard y_n("Advance skills without practice?") deferred
    const entries = [
        { text: 'Current skills:', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        { text: '(no skills ready to advance)', attr: 0 },
    ];
    // C select_menu PICK_NONE: ESC / space / return dismiss
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        if (key === 27 || key === 32 || key === 13 || key === 10) break;
    }
    return ECMD_OK;
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
