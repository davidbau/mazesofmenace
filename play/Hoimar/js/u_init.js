// u_init.js -- partial hero initialization RNG/state.
// C ref: u_init.c:u_init_misc(), exper.c:newpw().

import { game } from './gstate.js';
import { rnd, rn2, rn1, rne } from './rng.js';
import { findRole } from './roles.js';
import { mkobj, mksobj } from './mklev.js';
import { OBJECT_CHARGED } from './object_data.js';

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
        hp: 10, pwBase: 2, pwRnd: 0, ac: 0, gold: 757,
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

const GOLD_PIECE = 438;
const DART = 23;
const QUARTERSTAFF = 79;
const HAWAIIAN_SHIRT = 136;
const CLOAK_OF_MAGIC_RESISTANCE = 139;
const SCALPEL = 39;
const LEATHER_GLOVES = 159;
const BLINDFOLD = 233;
const CREDIT_CARD = 223;
const EXPENSIVE_CAMERA = 229;
const TOWEL = 234;
const LEASH = 236;
const STETHOSCOPE = 237;
const TIN_OPENER = 239;
const MAGIC_MARKER = 242;
const SPE_FORCE_BOLT = 383;
const APPLE = 277;
const RIN_LEVITATION = 183;
const RIN_HUNGER = 184;
const RIN_AGGRAVATE_MONSTER = 185;
const RIN_POLYMORPH = 196;
const RIN_POLYMORPH_CONTROL = 197;
const POT_HALLUCINATION = 304;
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_POLYMORPH = 316;
const POT_ACID = 320;
const SCR_ENCHANT_WEAPON = 328;
const SCR_MAGIC_MAPPING = 337;
const SCR_AMNESIA = 338;
const SCR_FIRE = 339;
const SCR_BLANK_PAPER = 365;
const SPE_POLYMORPH = 399;
const SPE_BLANK_PAPER = 407;
const SPE_HEALING = 374;
const SPE_EXTRA_HEALING = 391;
const SPE_STONE_TO_FLESH = 405;
const SPE_NOVEL = 408;
const WAN_WISHING = 414;
const WAN_NOTHING = 416;
const WAN_POLYMORPH = 422;
const WAN_SLEEP = 432;

const SPELLBOOK_LEVEL = new Map([
    [366, 5], [367, 2], [368, 4], [369, 4], [370, 3], [371, 7],
    [372, 1], [373, 1], [374, 1], [375, 1], [376, 1], [377, 1],
    [378, 2], [379, 2], [380, 2], [381, 2], [382, 2], [383, 2],
    [384, 3], [385, 3], [386, 3], [387, 5], [388, 3], [389, 3],
    [390, 4], [391, 3], [392, 4], [393, 4], [394, 4], [395, 3],
    [396, 5], [397, 3], [398, 6], [399, 6], [400, 6], [401, 6],
    [402, 7], [403, 1], [404, 1], [405, 3], [406, 2], [407, 0],
]);

const WIZARD_INVENTORY = [
    { typ: QUARTERSTAFF, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: 1, wielded: true },
    { typ: CLOAK_OF_MAGIC_RESISTANCE, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: WAND_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: RING_CLASS, min: 2, max: 2, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: POTION_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SCROLL_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
    { typ: SPE_FORCE_BOLT, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SPBOOK_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: MAGIC_MARKER, spe: 19, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const HEALER_INVENTORY = [
    { typ: SCALPEL, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: LEATHER_GLOVES, spe: 1, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: STETHOSCOPE, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
    { typ: POT_HEALING, spe: 0, cls: POTION_CLASS, min: 4, max: 4, bless: UNDEF_BLESS },
    { typ: POT_EXTRA_HEALING, spe: 0, cls: POTION_CLASS, min: 4, max: 4, bless: UNDEF_BLESS },
    { typ: WAN_SLEEP, spe: UNDEF_SPE, cls: WAND_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: SPE_HEALING, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: SPE_EXTRA_HEALING, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: SPE_STONE_TO_FLESH, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: APPLE, spe: 0, cls: FOOD_CLASS, min: 5, max: 5, bless: 0 },
];

const TOURIST_INVENTORY = [
    { typ: DART, spe: 2, cls: WEAPON_CLASS, min: 21, max: 40, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: FOOD_CLASS, min: 10, max: 10, bless: 0 },
    { typ: POT_EXTRA_HEALING, spe: 0, cls: POTION_CLASS, min: 2, max: 2, bless: UNDEF_BLESS },
    { typ: SCR_MAGIC_MAPPING, spe: 0, cls: SCROLL_CLASS, min: 4, max: 4, bless: UNDEF_BLESS },
    { typ: HAWAIIAN_SHIRT, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: EXPENSIVE_CAMERA, spe: UNDEF_SPE, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
    { typ: CREDIT_CARD, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const MONEY_INVENTORY = [
    { typ: GOLD_PIECE, spe: 0, cls: COIN_CLASS, min: 1, max: 1, bless: 0 },
];

const BLINDFOLD_INVENTORY = [
    { typ: BLINDFOLD, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const TIN_OPENER_INVENTORY = [
    { typ: TIN_OPENER, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const LEASH_INVENTORY = [
    { typ: LEASH, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const TOWEL_INVENTORY = [
    { typ: TOWEL, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const MAGIC_MARKER_INVENTORY = [
    { typ: MAGIC_MARKER, spe: 19, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

function trquan(trop) {
    if (!trop.min) return 1;
    return trop.min + rn2(trop.max - trop.min + 1);
}

function starting_spell_level(otyp) {
    if (otyp === SPE_FORCE_BOLT) return 1;
    return SPELLBOOK_LEVEL.get(otyp) ?? 0;
}

function rejected_starting_object(obj, noCreate, gotLevel1Spellbook, roleName) {
    const otyp = obj?.otyp;
    if (otyp == null) return false;
    if (otyp === WAN_WISHING || otyp === noCreate.nocreate
        || otyp === noCreate.nocreate2 || otyp === noCreate.nocreate3
        || otyp === noCreate.nocreate4 || otyp === RIN_LEVITATION
        || otyp === POT_HALLUCINATION || otyp === POT_ACID
        || otyp === SCR_AMNESIA || otyp === SCR_FIRE
        || otyp === SCR_BLANK_PAPER || otyp === SPE_BLANK_PAPER
        || otyp === RIN_AGGRAVATE_MONSTER || otyp === RIN_HUNGER
        || otyp === WAN_NOTHING || otyp === SPE_NOVEL) {
        return true;
    }
    if (roleName === 'Wizard' && otyp === SPE_FORCE_BOLT) return true;
    if (obj.oclass === SPBOOK_CLASS) {
        const maxLevel = gotLevel1Spellbook ? 3 : 1;
        return starting_spell_level(otyp) > maxLevel;
    }
    return false;
}

function ini_inv_mkobj_filter(oclass, gotLevel1Spellbook, noCreate, roleName) {
    // C ref: u_init.c:ini_inv_mkobj_filter().
    let obj = mkobj(oclass, false);
    let trycnt = 0;
    while (rejected_starting_object(obj, noCreate, gotLevel1Spellbook, roleName)) {
        if (++trycnt > 1000) return obj;
        obj = mkobj(oclass, false);
    }
    return obj;
}

function learn_initial_spell(obj) {
    // C ref: u_init.c:ini_inv_use_obj() -> spell.c:initialspell().
    if (obj?.oclass !== SPBOOK_CLASS || obj.otyp === SPE_BLANK_PAPER) return;
    const known = game.knownSpells || (game.knownSpells = []);
    if (!known.some((spell) => spell.otyp === obj.otyp)) known.push({ otyp: obj.otyp });
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

function discover_starting_object(obj) {
    if (!obj?.knownName || typeof obj.otyp !== 'number') return;
    game.discoveredObjects = game.discoveredObjects || new Set();
    if (typeof game.discoveredObjects.add === 'function') game.discoveredObjects.add(obj.otyp);
}

function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    if (trop.cls === COIN_CLASS) {
        obj.quan = game._goldCount || 0;
        obj.invlet = '$';
        return false;
    }
    obj.cursed = false;
    // C ref: u_init.c:ini_inv_adjust_obj(). Starting inventory is known to
    // the hero; later wished/floor objects keep their own unknown flags.
    obj.known = true;
    obj.knownName = true;
    obj.dknown = true;
    obj.bknown = true;
    obj.rknown = true;
    discover_starting_object(obj);
    if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) {
        obj.quan = trquan(trop);
        stop = true;
    }
    if (trop.spe !== UNDEF_SPE) {
        obj.spe = trop.spe;
        if (trop.typ === MAGIC_MARKER && obj.spe < 96) obj.spe += rn2(4);
    } else if (obj.oclass === RING_CLASS && OBJECT_CHARGED[obj.otyp] && (obj.spe || 0) <= 0) {
        obj.spe = rne(3);
    }
    if (trop.bless !== UNDEF_BLESS) obj.blessed = !!trop.bless;
    return stop;
}

function ini_inv(trobs, noCreate, roleName) {
    if (!trobs.length) return;
    game.inventory = game.inventory || [];
    let idx = 0;
    let quan = trquan(trobs[idx]);
    let gotLevel1Spellbook = false;
    while (idx < trobs.length) {
        const trop = trobs[idx];
        let obj;
        if (trop.typ !== UNDEF_TYP) {
            obj = mksobj(trop.typ, true, false);
        } else {
            obj = ini_inv_mkobj_filter(trop.cls, gotLevel1Spellbook, noCreate, roleName);
            switch (obj.otyp) {
            case WAN_POLYMORPH:
            case RIN_POLYMORPH:
            case POT_POLYMORPH:
                noCreate.nocreate = RIN_POLYMORPH_CONTROL;
                break;
            case RIN_POLYMORPH_CONTROL:
                noCreate.nocreate = RIN_POLYMORPH;
                noCreate.nocreate2 = SPE_POLYMORPH;
                noCreate.nocreate3 = POT_POLYMORPH;
                break;
            }
            if (obj.oclass === RING_CLASS || obj.oclass === SPBOOK_CLASS) {
                noCreate.nocreate4 = obj.otyp;
            }
        }
        if (ini_inv_adjust_obj(trop, obj)) quan = 1;
        const invObj = add_inventory_object(obj);
        if (trop.wielded) invObj.wielded = true;
        if (trop.worn) invObj.worn = true;
        learn_initial_spell(invObj);
        if (invObj.oclass === SPBOOK_CLASS && starting_spell_level(invObj.otyp) === 1) {
            gotLevel1Spellbook = true;
        }
        if (--quan) continue;
        idx++;
        if (idx < trobs.length) quan = trquan(trobs[idx]);
    }
}

export function u_init_role_inventory() {
    const role = findRole(game._nhopts?.role) || game.urole;
    let roleStartingGold = 0;
    const noCreate = {
        nocreate: UNDEF_TYP,
        nocreate2: UNDEF_TYP,
        nocreate3: UNDEF_TYP,
        nocreate4: UNDEF_TYP,
    };
    if (role?.name?.m === 'Healer') {
        game._goldCount = rn1(1000, 1001);
        game._startupRoleGoldInitialized = true;
        roleStartingGold = game._goldCount;
        ini_inv(HEALER_INVENTORY, noCreate, role.name.m);
        if (!rn2(25)) {
            // C may add an oil lamp here; object creation is still unported.
        }
    } else if (role?.name?.m === 'Tourist') {
        game._goldCount = rnd(1000);
        game._startupRoleGoldInitialized = true;
        roleStartingGold = game._goldCount;
        ini_inv(TOURIST_INVENTORY, noCreate, role.name.m);
        if (!rn2(25)) {
            ini_inv(TIN_OPENER_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(25)) {
            ini_inv(LEASH_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(25)) {
            ini_inv(TOWEL_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(20)) {
            ini_inv(MAGIC_MARKER_INVENTORY, noCreate, role.name.m);
        }
    } else if (role?.name?.m === 'Wizard') {
        ini_inv(WIZARD_INVENTORY, noCreate, role.name.m);
        if (!rn2(5)) {
            ini_inv(BLINDFOLD_INVENTORY, noCreate, role.name.m);
        }
    }
    if (roleStartingGold > 0) {
        ini_inv(MONEY_INVENTORY, noCreate, role?.name?.m);
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
            attrs[i] += xd;
            if (xd > 0 && attrs[i] > maxes[i]) {
                maxes[i] = Math.min(HUMAN_ATTRMAX[i], attrs[i]);
                attrs[i] = maxes[i];
            } else if (xd < 0) {
                attrs[i] = Math.max(3, attrs[i]);
                if (attrs[i] < maxes[i]) maxes[i] = attrs[i];
            }
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
    if (!game._startupRoleGoldInitialized) game._goldCount = init.gold;
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
