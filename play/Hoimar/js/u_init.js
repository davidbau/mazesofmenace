// u_init.js -- partial hero initialization RNG/state.
// C ref: u_init.c:u_init_misc(), exper.c:newpw().

import { game } from './gstate.js';
import { rnd, rn2, rn1 } from './rng.js';
import { findRole } from './roles.js';
import { mkobj, mksobj } from './mklev.js';

const ROLE_INIT = new Map([
    ['Healer', {
        attrbase: [7, 7, 13, 7, 11, 16],
        attrmax: [15, 20, 20, 15, 25, 5],
        attrdist: [15, 10, 20, 15, 25, 15],
        hp: 13, pwBase: 1, pwRnd: 4, ac: 8, gold: 1218,
    }],
    ['Rogue', {
        attrbase: [7, 7, 7, 10, 7, 6],
        attrmax: [20, 10, 10, 30, 20, 10],
        attrdist: [20, 10, 10, 30, 20, 10],
        hp: 12, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Tourist', {
        attrbase: [7, 10, 6, 7, 7, 10],
        attrmax: [15, 10, 10, 15, 30, 20],
        attrdist: [15, 10, 10, 15, 30, 20],
        hp: 10, pwBase: 2, pwRnd: 0, ac: 10, gold: 757,
    }],
    ['Wizard', {
        attrbase: [7, 10, 7, 7, 7, 7],
        attrmax: [10, 30, 10, 20, 20, 10],
        attrdist: [10, 30, 10, 20, 20, 10],
        hp: 12, pwBase: 5, pwRnd: 3, ac: 0, gold: 0,
    }],
]);

const HUMAN_ATTRMAX = [118, 18, 18, 18, 18, 18];

const LEVEL_ADV = new Map([
    ['Wizard', {
        xlev: 12,
        hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 },
        energyMod: 'wizard',
    }],
]);

const RACE_LEVEL_ADV = new Map([
    ['human', {
        hpadv: { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    }],
]);

const UNDEF_TYP = 0;
const UNDEF_SPE = 0x7f;
const UNDEF_BLESS = 2;

const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
const GEM_CLASS = 13;

const QUARTERSTAFF = 79;
const CLOAK_OF_MAGIC_RESISTANCE = 139;
const BLINDFOLD = 220;
const MAGIC_MARKER = 229;
const SPE_FORCE_BOLT = 383;

const WIZARD_INVENTORY = [
    { typ: QUARTERSTAFF, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: 1 },
    { typ: CLOAK_OF_MAGIC_RESISTANCE, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: WAND_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: RING_CLASS, min: 2, max: 2, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: POTION_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SCROLL_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
    { typ: SPE_FORCE_BOLT, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SPBOOK_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: MAGIC_MARKER, spe: 19, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const BLINDFOLD_INVENTORY = [
    { typ: BLINDFOLD, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

function trquan(trop) {
    if (!trop.min) return 1;
    return trop.min + rn2(trop.max - trop.min + 1);
}

function sameObjField(a, b, field, fallback = null) {
    return (a?.[field] ?? fallback) === (b?.[field] ?? fallback);
}

function stackableInventoryClass(oclass) {
    return oclass === FOOD_CLASS || oclass === POTION_CLASS || oclass === SCROLL_CLASS
        || oclass === COIN_CLASS || oclass === GEM_CLASS;
}

export function mergeable_inventory_object(into, obj) {
    if (!into || !obj || into === obj) return false;
    if (into.otyp !== obj.otyp || into.oclass !== obj.oclass) return false;
    if (!stackableInventoryClass(obj.oclass)) return false;
    if (!!into.blessed !== !!obj.blessed || !!into.cursed !== !!obj.cursed) return false;
    if (!sameObjField(into, obj, 'spe', 0)) return false;
    if (!sameObjField(into, obj, 'corpsenm', null)) return false;
    if (!sameObjField(into, obj, 'appearanceName', null)) return false;
    if (!sameObjField(into, obj, 'opoisoned', false)) return false;
    if (!sameObjField(into, obj, 'oeroded', 0) || !sameObjField(into, obj, 'oeroded2', 0)) return false;
    if (!sameObjField(into, obj, 'greased', false)) return false;
    if ((into.wornSide || into.owornmask) || (obj.wornSide || obj.owornmask)) return false;
    return true;
}

export function merge_inventory_object(obj) {
    game.inventory = game.inventory || [];
    const target = game.inventory.find((into) => mergeable_inventory_object(into, obj));
    if (!target) return null;
    target.quan = (target.quan || 1) + (obj.quan || 1);
    return target;
}

export function add_inventory_object(obj) {
    const target = merge_inventory_object(obj);
    if (target) return target;
    game.inventory.push(obj);
    return obj;
}

function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    obj.cursed = false;
    if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) {
        obj.quan = trquan(trop);
        stop = true;
    }
    if (trop.spe !== UNDEF_SPE) {
        obj.spe = trop.spe;
        if (trop.typ === MAGIC_MARKER && obj.spe < 96) obj.spe += rn2(4);
    }
    if (trop.bless !== UNDEF_BLESS) obj.blessed = !!trop.bless;
    return stop;
}

function ini_inv(trobs) {
    if (!trobs.length) return;
    game.inventory = game.inventory || [];
    let idx = 0;
    let quan = trquan(trobs[idx]);
    while (idx < trobs.length) {
        const trop = trobs[idx];
        const obj = trop.typ !== UNDEF_TYP
            ? mksobj(trop.typ, true, false)
            : mkobj(trop.cls, false);
        if (ini_inv_adjust_obj(trop, obj)) quan = 1;
        add_inventory_object(obj);
        if (--quan) continue;
        idx++;
        if (idx < trobs.length) quan = trquan(trobs[idx]);
    }
}

export function u_init_role_inventory() {
    const role = findRole(game._nhopts?.role);
    if (role?.name?.m === 'Wizard') {
        ini_inv(WIZARD_INVENTORY);
        if (!rn2(5)) {
            ini_inv(BLINDFOLD_INVENTORY);
        }
    }
}

export function u_init_misc_rng() {
    const role = findRole(game._nhopts?.role);
    const init = ROLE_INIT.get(role?.name?.m);
    let initialPower = init?.pwBase ?? 2;
    if ((init?.pwRnd ?? 0) > 0) initialPower += rnd(init.pwRnd);
    rn2(10); // u.uhandedness, roughly 90% right-handed.
    game._initialPower = initialPower;
}

function rndAttr(init) {
    let x = rn2(100);
    for (let i = 0; i < init.attrdist.length; i++) {
        x -= init.attrdist[i];
        if (x < 0) return i;
    }
    return init.attrdist.length;
}

function redist(attrs, maxes, init, np, addition) {
    let tryct = 0;
    const adj = addition ? 1 : -1;
    while ((addition ? np > 0 : np < 0) && tryct < 100) {
        const i = rndAttr(init);
        if (i >= attrs.length || (addition ? attrs[i] >= init.attrmax[i] : attrs[i] <= 3)) {
            tryct++;
            continue;
        }
        tryct = 0;
        attrs[i] += adj;
        maxes[i] += adj;
        np -= adj;
    }
    return np;
}

function varyInitAttr(attrs, maxes) {
    for (let i = 0; i < attrs.length; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2;
            attrs[i] = Math.max(3, Math.min(maxes[i], attrs[i] + xd));
            if (attrs[i] < maxes[i]) maxes[i] = attrs[i];
        }
    }
}

function initialAttributes(init) {
    const attrs = init.attrbase.slice();
    const maxes = init.attrbase.slice();
    const limits = HUMAN_ATTRMAX;
    let np = 75 - attrs.reduce((a, b) => a + b, 0);
    const redistInit = { ...init, attrmax: limits };
    np = redist(attrs, maxes, redistInit, np, true);
    redist(attrs, maxes, redistInit, np, false);
    varyInitAttr(attrs, maxes);
    return { attrs, maxes };
}

export function apply_startup_role_state() {
    const role = findRole(game._nhopts?.role);
    const init = ROLE_INIT.get(role?.name?.m);
    if (!init) return;
    const { attrs, maxes } = initialAttributes(init);
    game._goldCount = init.gold;
    game.u.uhp = init.hp;
    game.u.uhpmax = init.hp;
    game.u.uen = game._initialPower ?? init.pwBase;
    game.u.uenmax = game.u.uen;
    game.u.uac = init.ac;
    game.u.acurr = { a: attrs };
    game.u.amax = { a: maxes };
}

function roleLevelAdv() {
    const role = findRole(game._nhopts?.role) || game.urole;
    return LEVEL_ADV.get(role?.name?.m) || null;
}

function raceLevelAdv() {
    const raceName = game.urace?.name || game._nhopts?.race || 'human';
    return RACE_LEVEL_ADV.get(String(raceName).toLowerCase()) || RACE_LEVEL_ADV.get('human');
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

function energyMod(en, adv) {
    if (adv?.energyMod === 'wizard') return 2 * en;
    return en;
}

export function newhp() {
    const u = game.u || {};
    const role = roleLevelAdv();
    const race = raceLevelAdv();
    if (!role || !race) return 1;
    const lvl = u.ulevel || 1;
    let hp;
    if (lvl < role.xlev) {
        hp = role.hpadv.lofix + race.hpadv.lofix;
        if (role.hpadv.lornd > 0) hp += rnd(role.hpadv.lornd);
        if (race.hpadv.lornd > 0) hp += rnd(race.hpadv.lornd);
    } else {
        hp = role.hpadv.hifix + race.hpadv.hifix;
        if (role.hpadv.hirnd > 0) hp += rnd(role.hpadv.hirnd);
        if (race.hpadv.hirnd > 0) hp += rnd(race.hpadv.hirnd);
    }

    const con = currentAttr(4);
    let conplus = 0;
    if (con <= 3) conplus = -2;
    else if (con <= 6) conplus = -1;
    else if (con <= 14) conplus = 0;
    else if (con <= 16) conplus = 1;
    else if (con === 17) conplus = 2;
    else if (con === 18) conplus = 3;
    else conplus = 4;
    hp += conplus;

    if (hp <= 0) hp = 1;
    u.uhpinc = u.uhpinc || [];
    if (lvl < 30) u.uhpinc[lvl] = hp;
    return hp;
}

export function newpw() {
    const u = game.u || {};
    const role = roleLevelAdv();
    const race = raceLevelAdv();
    if (!role || !race) return 1;
    const lvl = u.ulevel || 1;
    let enrnd = Math.trunc(currentAttr(2) / 2);
    let enfix;
    if (lvl < role.xlev) {
        enrnd += role.enadv.lornd + race.enadv.lornd;
        enfix = role.enadv.lofix + race.enadv.lofix;
    } else {
        enrnd += role.enadv.hirnd + race.enadv.hirnd;
        enfix = role.enadv.hifix + race.enadv.hifix;
    }
    let en = energyMod(rn1(enrnd, enfix), role);
    if (en <= 0) en = 1;
    u.ueninc = u.ueninc || [];
    if (lvl < 30) u.ueninc[lvl] = en;
    return en;
}

export function newuexp(level) {
    const lev = Number(level) || 0;
    if (lev < 1) return 0;
    if (lev < 10) return 10 * (1 << lev);
    if (lev < 20) return 10000 * (1 << (lev - 10));
    return 10000000 * (lev - 19);
}

export function pluslvl() {
    const u = game.u || {};
    const hpinc = newhp();
    u.uhp = (u.uhp || 0) + hpinc;
    u.uhpmax = (u.uhpmax || 0) + hpinc;
    if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;

    const eninc = newpw();
    u.uen = (u.uen || 0) + eninc;
    u.uenmax = (u.uenmax || 0) + eninc;
    u.uenpeak = Math.max(u.uenpeak || 0, u.uenmax);

    if ((u.ulevel || 1) < 30) {
        u.uexp = newuexp(u.ulevel || 1);
        u.ulevel = (u.ulevel || 1) + 1;
        u.ulevelmax = Math.max(u.ulevelmax || 0, u.ulevel);
        u.ulevelpeak = Math.max(u.ulevelpeak || 0, u.ulevel);
    }
    return u.ulevel;
}
