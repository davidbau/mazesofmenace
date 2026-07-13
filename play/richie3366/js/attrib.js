// attrib.js — Hero attributes.
// C ref: attrib.c — rnd_attr, init_attr, vary_init_attr, adjattrib,
//        adjabil / role_abil (partial).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    FROMEXPER,
    FROMRACE,
    FROMOUTSIDE,
    INTRINSIC,
    MAXULEV,
    STR18,
} from './const.js';
import { pline } from './display.js';
import {
    PM_ARCHEOLOGIST,
    PM_BARBARIAN,
    PM_CAVE_DWELLER,
    PM_HEALER,
    PM_KNIGHT,
    PM_MONK,
    PM_CLERIC,
    PM_RANGER,
    PM_ROGUE,
    PM_SAMURAI,
    PM_TOURIST,
    PM_VALKYRIE,
    PM_WIZARD,
    PM_ELF,
    PM_ORC,
} from './generated/monsters_data.js';

export const A_STR = 0;
export const A_INT = 1;
export const A_WIS = 2;
export const A_DEX = 3;
export const A_CON = 4;
export const A_CHA = 5;
export const A_MAX = 6;

function abase(i) {
    return game.u.acurr.a[i];
}
function setAbase(i, v) {
    game.u.acurr.a[i] = v;
}
function amax(i) {
    return game.u.amax.a[i];
}
function setAmax(i, v) {
    game.u.amax.a[i] = v;
}

// C ref: attrib.c acurr() — clamp non-STR to [3,25]; STR min 3 (encoding stub)
export function acurr(i) {
    const u = game.u;
    const tmp = (u.abon?.a?.[i] || 0) + (u.atemp?.a?.[i] || 0) + (u.acurr?.a?.[i] || 0);
    if (i === A_STR) {
        // Full 18/xx encoding omitted; early sessions only need floor of 3
        return Math.max(tmp, 3);
    }
    if (tmp >= 25) return 25;
    if (tmp <= 3) return 3;
    return tmp;
}

// C ref: attrib.c acurrstr() — map encoded STR to 3..25 for formulas
export function acurrstr() {
    const str = acurr(A_STR);
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: botl.c get_strength_str — 18/xx and 18/** for encoded STR
export function get_strength_str() {
    const st = acurr(A_STR);
    if (st > 18) {
        if (st > STR18(100)) {
            // C: Sprintf(buf, "%2d", st - 100)
            return String(st - 100).padStart(2, ' ');
        }
        if (st < STR18(100)) {
            return `18/${String(st - 18).padStart(2, '0')}`;
        }
        return '18/**';
    }
    // C: Sprintf(buf, "%-1d", st)
    return String(st);
}

// C ref: attrib.c exercise()
export function exercise(i, inc_or_dec) {
    if (i === A_INT || i === A_CHA) return;
    const u = game.u;
    if (!u.aexe) u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    const ax = u.aexe.a[i] || 0;
    const AVAL = 50; // attrib.h
    if (Math.abs(ax) < AVAL) {
        // C: AEXE(i) += (inc_or_dec) ? (rn2(19) > ACURR(i)) : -rn2(2);
        if (inc_or_dec) {
            u.aexe.a[i] = ax + (rn2(19) > acurr(i) ? 1 : 0);
        } else {
            u.aexe.a[i] = ax - rn2(2);
        }
    }
}

function attrMax(i) {
    return game.urace?.attrmax?.[i] ?? 18;
}
function attrMin(i) {
    return game.urace?.attrmin?.[i] ?? 3;
}

// C ref: attrib.c rnd_attr()
function rnd_attr() {
    let x = rn2(100);
    let i;
    for (i = 0; i < A_MAX; ++i) {
        if ((x -= game.urole.attrdist[i]) < 0) break;
    }
    return i;
}

// C ref: attrib.c init_attr_role_redist()
function init_attr_role_redist(np, addition) {
    let tryct = 0;
    const adj = addition ? 1 : -1;
    while ((addition ? np > 0 : np < 0) && tryct < 100) {
        const i = rnd_attr();
        if (
            i >= A_MAX
            || (addition ? abase(i) >= attrMax(i) : abase(i) <= attrMin(i))
        ) {
            tryct++;
            continue;
        }
        tryct = 0;
        setAbase(i, abase(i) + adj);
        setAmax(i, amax(i) + adj);
        np -= adj;
    }
    return np;
}

// C ref: attrib.c init_attr()
export function init_attr(np) {
    const u = game.u;
    if (!u.acurr) u.acurr = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.amax) u.amax = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atime) u.atime = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };

    for (let i = 0; i < A_MAX; i++) {
        u.acurr.a[i] = u.amax.a[i] = game.urole.attrbase[i];
        u.atemp.a[i] = u.atime.a[i] = 0;
        np -= game.urole.attrbase[i];
    }
    np = init_attr_role_redist(np, true);
    np = init_attr_role_redist(np, false);
    return np;
}

// C ref: attrib.c plusattr[] / minusattr[]
const PLUSATTR = ['strong', 'smart', 'wise', 'agile', 'tough', 'charismatic'];
const MINUSATTR = ['weak', 'stupid', 'foolish', 'clumsy', 'fragile', 'repulsive'];

/**
 * C ref: attrib.c adjattrib() — mutate ABASE/AMAX; You_feel when msgflg <= 0.
 * Fixed_abil / Dunce cap / verbose "already" messages / encumber deferred.
 * @param {number} ndx
 * @param {number} incr
 * @param {number|boolean} [msgflg=1] positive => silent; <=0 => You_feel
 */
export async function adjattrib(ndx, incr, msgflg = 1) {
    if (!incr) return false;
    const old_acurr = acurr(ndx);
    const old = abase(ndx);
    setAbase(ndx, old + incr);
    let attrstr;
    if (incr > 0) {
        if (abase(ndx) > amax(ndx)) {
            setAmax(ndx, abase(ndx));
            if (amax(ndx) > attrMax(ndx)) {
                setAbase(ndx, attrMax(ndx));
                setAmax(ndx, attrMax(ndx));
            }
        }
        attrstr = PLUSATTR[ndx];
    } else {
        if (abase(ndx) < attrMin(ndx)) {
            // decrease-below-min path uses rn2; not hit by vary_init_attr on seed8000
            const decr = rn2(attrMin(ndx) - abase(ndx) + 1);
            setAbase(ndx, attrMin(ndx));
            setAmax(ndx, amax(ndx) - decr);
            if (amax(ndx) < attrMin(ndx)) setAmax(ndx, attrMin(ndx));
        }
        attrstr = MINUSATTR[ndx];
    }
    // C: if (ACURR(ndx) == old_acurr) return FALSE (verbose msgs deferred)
    if (acurr(ndx) === old_acurr) return false;
    if (game.u.aexe?.a) game.u.aexe.a[ndx] = 0;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if ((msgflg | 0) <= 0) {
        const { You_feel } = await import('./display.js');
        const very = (incr > 1 || incr < -1) ? 'very ' : '';
        await You_feel(`${very}${attrstr}!`);
    }
    return true;
}

// C ref: attrib.c vary_init_attr()
export async function vary_init_attr() {
    for (let i = 0; i < A_MAX; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2; // biased variation
            await adjattrib(i, xd, true); // msgflg true → silent
            if (abase(i) < amax(i)) setAmax(i, abase(i));
        }
    }
}

// C ref: attrib.c newhp() — init + level-up (Con / MAXULEV throttle)
export function newhp() {
    const u = game.u;
    const roleAdv = game.urole?.hpadv || { infix: 8, inrnd: 0 };
    const raceAdv = game.urace?.hpadv || { infix: 2, inrnd: 0 };
    const xlev = game.urole?.xlev ?? 14;
    let hp;
    if ((u.ulevel | 0) === 0) {
        hp = (roleAdv.infix | 0) + (raceAdv.infix | 0);
        if ((roleAdv.inrnd | 0) > 0) hp += rnd(roleAdv.inrnd);
        if ((raceAdv.inrnd | 0) > 0) hp += rnd(raceAdv.inrnd);
        // Alignment init when moves==0 is done in u_init_misc (C newhp + u_init_misc).
    } else {
        let conplus;
        if ((u.ulevel | 0) < xlev) {
            hp = (roleAdv.lofix | 0) + (raceAdv.lofix | 0);
            if ((roleAdv.lornd | 0) > 0) hp += rnd(roleAdv.lornd);
            if ((raceAdv.lornd | 0) > 0) hp += rnd(raceAdv.lornd);
        } else {
            hp = (roleAdv.hifix | 0) + (raceAdv.hifix | 0);
            if ((roleAdv.hirnd | 0) > 0) hp += rnd(roleAdv.hirnd);
            if ((raceAdv.hirnd | 0) > 0) hp += rnd(raceAdv.hirnd);
        }
        const con = acurr(A_CON);
        if (con <= 3) conplus = -2;
        else if (con <= 6) conplus = -1;
        else if (con <= 14) conplus = 0;
        else if (con <= 16) conplus = 1;
        else if (con === 17) conplus = 2;
        else if (con === 18) conplus = 3;
        else conplus = 4;
        hp += conplus;
    }
    if (hp <= 0) hp = 1;
    if ((u.ulevel | 0) < MAXULEV) {
        if (!u.uhpinc) u.uhpinc = [];
        u.uhpinc[u.ulevel | 0] = hp;
    } else {
        let lim = 5 - Math.trunc((u.uhpmax || 0) / 300);
        if (lim < 1) lim = 1;
        if (hp > lim) hp = lim;
    }
    return hp;
}

// C ref: attrib.c change_luck() — clamp u.uluck; no RNG
export function change_luck(n) {
    const u = game.u || (game.u = {});
    let luck = (u.uluck || 0) + (n | 0);
    if (luck > 10) luck = 10;
    if (luck < -10) luck = -10;
    u.uluck = luck;
}

/*
 * C ref: attrib.c innate tables + role_abil() / adjabil().
 * Prop names match the H* macros that C stores via long* ability.
 * Level-up add_weapon_skill / lose_weapon_skill deferred (oldlevel>0).
 * postadjabil see_monsters deferred (init path has u.ulevel==0 → no-op).
 */
const arc_abil = [
    { ulevel: 1, prop: 'HSearching', gainstr: '', losestr: '' },
    { ulevel: 5, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 10, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
];
const bar_abil = [
    { ulevel: 1, prop: 'HPoison_resistance', gainstr: '', losestr: '' },
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
    { ulevel: 15, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
];
const cav_abil = [
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
];
const hea_abil = [
    { ulevel: 1, prop: 'HPoison_resistance', gainstr: '', losestr: '' },
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
];
const kni_abil = [
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
];
const mon_abil = [
    { ulevel: 1, prop: 'HFast', gainstr: '', losestr: '' },
    { ulevel: 1, prop: 'HSleep_resistance', gainstr: '', losestr: '' },
    { ulevel: 1, prop: 'HSee_invisible', gainstr: '', losestr: '' },
    { ulevel: 3, prop: 'HPoison_resistance', gainstr: 'healthy', losestr: '' },
    { ulevel: 5, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 7, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
    { ulevel: 9, prop: 'HSearching', gainstr: 'perceptive', losestr: 'unaware' },
    { ulevel: 11, prop: 'HFire_resistance', gainstr: 'cool', losestr: 'warmer' },
    { ulevel: 13, prop: 'HCold_resistance', gainstr: 'warm', losestr: 'cooler' },
    { ulevel: 15, prop: 'HShock_resistance', gainstr: 'insulated', losestr: 'conductive' },
    { ulevel: 17, prop: 'HTeleport_control', gainstr: 'controlled', losestr: 'uncontrolled' },
];
const pri_abil = [
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
    { ulevel: 20, prop: 'HFire_resistance', gainstr: 'cool', losestr: 'warmer' },
];
const ran_abil = [
    { ulevel: 1, prop: 'HSearching', gainstr: '', losestr: '' },
    { ulevel: 7, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 15, prop: 'HSee_invisible', gainstr: '', losestr: '' },
];
const rog_abil = [
    { ulevel: 1, prop: 'HStealth', gainstr: '', losestr: '' },
    { ulevel: 10, prop: 'HSearching', gainstr: 'perceptive', losestr: '' },
];
const sam_abil = [
    { ulevel: 1, prop: 'HFast', gainstr: '', losestr: '' },
    { ulevel: 15, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
];
const tou_abil = [
    { ulevel: 10, prop: 'HSearching', gainstr: 'perceptive', losestr: '' },
    { ulevel: 20, prop: 'HPoison_resistance', gainstr: 'hardy', losestr: '' },
];
const val_abil = [
    { ulevel: 1, prop: 'HCold_resistance', gainstr: '', losestr: '' },
    { ulevel: 3, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
];
const wiz_abil = [
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
    { ulevel: 17, prop: 'HTeleport_control', gainstr: 'controlled', losestr: 'uncontrolled' },
];
const elf_abil = [
    { ulevel: 1, prop: 'HInfravision', gainstr: '', losestr: '' },
    { ulevel: 4, prop: 'HSleep_resistance', gainstr: 'awake', losestr: 'tired' },
];
const orc_abil = [
    { ulevel: 1, prop: 'HInfravision', gainstr: '', losestr: '' },
    { ulevel: 1, prop: 'HPoison_resistance', gainstr: '', losestr: '' },
];

// C ref: attrib.c role_abil()
function role_abil(rolePm) {
    switch (rolePm) {
        case PM_ARCHEOLOGIST: return arc_abil;
        case PM_BARBARIAN: return bar_abil;
        case PM_CAVE_DWELLER: return cav_abil;
        case PM_HEALER: return hea_abil;
        case PM_KNIGHT: return kni_abil;
        case PM_MONK: return mon_abil;
        case PM_CLERIC: return pri_abil;
        case PM_RANGER: return ran_abil;
        case PM_ROGUE: return rog_abil;
        case PM_SAMURAI: return sam_abil;
        case PM_TOURIST: return tou_abil;
        case PM_VALKYRIE: return val_abil;
        case PM_WIZARD: return wiz_abil;
        default: return null;
    }
}

/**
 * C ref: attrib.c adjabil(oldlevel, newlevel)
 * Grants/revokes role and (elf/orc) race intrinsics by level thresholds.
 * Gain You_feel for nonempty gainstr; lose/postadjabil/weapon-skill deferred.
 */
export async function adjabil(oldlevel, newlevel) {
    const u = game.u || (game.u = {});
    let abil = role_abil(game.urole?.mnum);
    let rabil = null;
    let mask = FROMEXPER;
    const racePm = game.urace?.mnum;
    // C: only ELF and ORC use rabil here; dwarf/gnome infra via set_uasmon.
    if (racePm === PM_ELF) rabil = elf_abil;
    else if (racePm === PM_ORC) rabil = orc_abil;

    let abilIdx = 0;
    let rabilIdx = 0;
    let usingRace = false;

    while (true) {
        let entry = null;
        if (!usingRace) {
            if (abil && abilIdx < abil.length) {
                entry = abil[abilIdx++];
            } else if (rabil && rabilIdx < rabil.length) {
                usingRace = true;
                mask = FROMRACE;
                entry = rabil[rabilIdx++];
            } else {
                break;
            }
        } else if (rabil && rabilIdx < rabil.length) {
            entry = rabil[rabilIdx++];
        } else {
            break;
        }

        const prop = entry.prop;
        const prev = u[prop] || 0;
        if (oldlevel < entry.ulevel && newlevel >= entry.ulevel) {
            // Level-1 abilities also set FROMOUTSIDE so outside sources
            // cannot "gain" a meaningless duplicate (C adjabil).
            if (entry.ulevel === 1) u[prop] = prev | (mask | FROMOUTSIDE);
            else u[prop] = prev | mask;
            // C: if (!(*(abil->ability) & INTRINSIC & ~mask)) You_feel(gainstr)
            if (!((u[prop] || 0) & INTRINSIC & ~mask) && entry.gainstr) {
                await pline(`You feel ${entry.gainstr}!`);
            }
        } else if (oldlevel >= entry.ulevel && newlevel < entry.ulevel) {
            u[prop] = prev & ~mask;
            // losestr pline deferred
        }
        // postadjabil deferred
    }
    // C: if (oldlevel > 0) add/lose_weapon_skill — deferred
}

/** C ref: youprop.h Fast */
export function Fast() {
    const u = game.u || {};
    return !!(u.HFast || u.EFast);
}

/** C ref: youprop.h Searching */
export function Searching() {
    const u = game.u || {};
    return !!(u.HSearching || u.ESearching);
}

/** C ref: youprop.h Very_fast — timeout bits or extrinsic */
export function Very_fast() {
    const u = game.u || {};
    return !!(((u.HFast || 0) & ~INTRINSIC) || u.EFast);
}
