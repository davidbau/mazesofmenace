// u_init.js — Player initialization (inventory + attrs).
// C ref: u_init.c — u_init_role, u_init_race, trquan, ini_inv,
//        ini_inv_obj_substitution, u_init_inventory_attrs
//        (Tourist + Rogue; human/orc race kits; elf/dwarf/gnome partial).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { mksobj, mkobj, weight } from './mkobj.js';
import {
    WEAPON_CLASS,
    ARMOR_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    WAND_CLASS,
    COIN_CLASS,
    objectNames,
} from './objects.js';
import { init_attr, vary_init_attr, A_STR, A_CON, newhp, newpw } from './attrib.js';
import { roles, races, aligns, findRole, findRace, findAlign } from './roles.js';
import { discover_object } from './invent.js';
import { otyp_uses_known } from './objnam.js';
import {
    W_ARMU, W_ARM, W_WEP, W_SWAPWEP, W_QUIVER,
    RIGHT_HANDED, LEFT_HANDED,
    A_NEUTRAL,
    Is_container,
} from './const.js';
import {
    PM_TOURIST, PM_ROGUE, PM_CLERIC, PM_WIZARD,
    PM_HUMAN, PM_ELF, PM_DWARF, PM_ORC, PM_GNOME,
    NON_PM,
} from './generated/monsters_data.js';

const UNDEF_TYP = 0;
const UNDEF_SPE = 127; // '\177'
const UNDEF_BLESS = 2;
const GOLD_SYM = '$';
const invlet_basic = 52;

function otypByName(name) {
    const i = objectNames.indexOf(name);
    return i >= 0 ? i : 0;
}

// C ref: u_init.c Tourist[]
const Tourist = [
    { trotyp: () => otypByName('DART'), trspe: 2, trclass: WEAPON_CLASS, trquan_min: 21, trquan_max: 40, trbless: UNDEF_BLESS },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: FOOD_CLASS, trquan_min: 10, trquan_max: 10, trbless: 0 },
    { trotyp: () => otypByName('POT_EXTRA_HEALING'), trspe: 0, trclass: POTION_CLASS, trquan_min: 2, trquan_max: 2, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SCR_MAGIC_MAPPING'), trspe: 0, trclass: SCROLL_CLASS, trquan_min: 4, trquan_max: 4, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('HAWAIIAN_SHIRT'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('EXPENSIVE_CAMERA'), trspe: UNDEF_SPE, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('CREDIT_CARD'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Rogue[]
const Rogue = [
    { trotyp: () => otypByName('SHORT_SWORD'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('DAGGER'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 6, trquan_max: 15, trbless: 0 },
    { trotyp: () => otypByName('LEATHER_ARMOR'), trspe: 1, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('POT_SICKNESS'), trspe: 0, trclass: POTION_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('LOCK_PICK'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('SACK'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

const Tinopener = [
    { trotyp: () => otypByName('TIN_OPENER'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Leash = [
    { trotyp: () => otypByName('LEASH'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Towel = [
    { trotyp: () => otypByName('TOWEL'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Magicmarker = [
    { trotyp: () => otypByName('MAGIC_MARKER'), trspe: 19, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Blindfold = [
    { trotyp: () => otypByName('BLINDFOLD'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Wishing = [
    { trotyp: () => otypByName('WAN_WISHING'), trspe: 3, trclass: WAND_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Money = [
    { trotyp: () => otypByName('GOLD_PIECE'), trspe: 0, trclass: COIN_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
// C ref: u_init.c Xtra_food[] — orc race compensation (2 random foods)
const Xtra_food = [
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: FOOD_CLASS, trquan_min: 2, trquan_max: 2, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: objects.h — weapons with oc_skill == P_DAGGER (extractor lacks oc_skill).
const DAGGER_SKILL_OTYPS = [
    'DAGGER', 'ELVEN_DAGGER', 'ORCISH_DAGGER', 'SILVER_DAGGER', 'ATHAME',
].map(otypByName).filter(i => i > 0);

// C ref: u_init.c inv_subs[] — race-based starting-inventory substitutions
const inv_subs = [
    { race_pm: PM_ELF, item_otyp: () => otypByName('DAGGER'), subs_otyp: () => otypByName('ELVEN_DAGGER') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('SPEAR'), subs_otyp: () => otypByName('ELVEN_SPEAR') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('SHORT_SWORD'), subs_otyp: () => otypByName('ELVEN_SHORT_SWORD') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('BOW'), subs_otyp: () => otypByName('ELVEN_BOW') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('ARROW'), subs_otyp: () => otypByName('ELVEN_ARROW') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('HELMET'), subs_otyp: () => otypByName('ELVEN_LEATHER_HELM') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('CLOAK_OF_DISPLACEMENT'), subs_otyp: () => otypByName('ELVEN_CLOAK') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('CRAM_RATION'), subs_otyp: () => otypByName('LEMBAS_WAFER') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('DAGGER'), subs_otyp: () => otypByName('ORCISH_DAGGER') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('SPEAR'), subs_otyp: () => otypByName('ORCISH_SPEAR') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('SHORT_SWORD'), subs_otyp: () => otypByName('ORCISH_SHORT_SWORD') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('BOW'), subs_otyp: () => otypByName('ORCISH_BOW') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('ARROW'), subs_otyp: () => otypByName('ORCISH_ARROW') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('HELMET'), subs_otyp: () => otypByName('ORCISH_HELM') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('SMALL_SHIELD'), subs_otyp: () => otypByName('ORCISH_SHIELD') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('RING_MAIL'), subs_otyp: () => otypByName('ORCISH_RING_MAIL') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('CHAIN_MAIL'), subs_otyp: () => otypByName('ORCISH_CHAIN_MAIL') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('CRAM_RATION'), subs_otyp: () => otypByName('TRIPE_RATION') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('LEMBAS_WAFER'), subs_otyp: () => otypByName('TRIPE_RATION') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('SPEAR'), subs_otyp: () => otypByName('DWARVISH_SPEAR') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('SHORT_SWORD'), subs_otyp: () => otypByName('DWARVISH_SHORT_SWORD') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('HELMET'), subs_otyp: () => otypByName('DWARVISH_IRON_HELM') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('LEMBAS_WAFER'), subs_otyp: () => otypByName('CRAM_RATION') },
    { race_pm: PM_GNOME, item_otyp: () => otypByName('BOW'), subs_otyp: () => otypByName('CROSSBOW') },
    { race_pm: PM_GNOME, item_otyp: () => otypByName('ARROW'), subs_otyp: () => otypByName('CROSSBOW_BOLT') },
];

// C ref: u_init.c trquan()
function trquan(trop) {
    if (!trop.trquan_min) return 1;
    return trop.trquan_min + rn2(trop.trquan_max - trop.trquan_min + 1);
}

// C ref: u_init.c ini_inv_mkobj_filter() — Tourist/orc race food rolls;
// full reject list deferred (retries rare on current kits).
function ini_inv_mkobj_filter(oclass) {
    return mkobj(oclass, false);
}

// C ref: u_init.c ini_inv_obj_substitution()
function ini_inv_obj_substitution(_trop, obj) {
    const racePm = game.urace?.mnum;
    if (racePm == null || racePm === PM_HUMAN) return obj.otyp;
    for (const sub of inv_subs) {
        if (sub.race_pm === racePm && obj.otyp === sub.item_otyp()) {
            obj.otyp = sub.subs_otyp();
            break;
        }
    }
    return obj.otyp;
}

// C ref: u_init.c ini_inv_adjust_obj()
function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    if (trop.trclass === COIN_CLASS) {
        obj.quan = game.u.umoney0;
    } else {
        if (otyp_uses_known(obj.otyp)) obj.known = 1;
        obj.dknown = obj.bknown = obj.rknown = 1;
        // C: Is_container || STATUE → cknown/lknown; otrapped = 0
        if (Is_container(obj) || objectNames[obj.otyp] === 'STATUE') {
            obj.cknown = obj.lknown = 1;
            obj.otrapped = 0;
        }
        obj.cursed = false;
        if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) {
            obj.quan = trquan(trop);
            stop = true;
        }
        if (trop.trspe !== UNDEF_SPE) {
            obj.spe = trop.trspe;
            if (objectNames[obj.otyp] === 'MAGIC_MARKER' && obj.spe < 96) {
                obj.spe += rn2(4);
            }
        }
        if (trop.trbless !== UNDEF_BLESS) obj.blessed = !!trop.trbless;
    }
    obj.owt = weight(obj);
    return stop;
}

// C ref: invent.c mergable() — sufficient for Tourist starting kit merges.
function mergable(a, b) {
    if (!a || !b || a.otyp !== b.otyp) return false;
    if ((a.spe | 0) !== (b.spe | 0)) return false;
    if (!!a.blessed !== !!b.blessed || !!a.cursed !== !!b.cursed) return false;
    if ((a.corpsenm ?? -1) !== (b.corpsenm ?? -1)) return false;
    if (!!a.known !== !!b.known) return false;
    if ((a.owornmask | 0) || (b.owornmask | 0)) return false;
    return true;
}

// C ref: invent.c assigninvlet()
function assigninvlet(otmp) {
    if (otmp.oclass === COIN_CLASS) {
        otmp.invlet = GOLD_SYM;
        return;
    }
    const inuse = new Array(invlet_basic).fill(false);
    for (const obj of game.invent || []) {
        if (obj === otmp) continue;
        const i = obj.invlet;
        if (typeof i === 'string' && i.length === 1) {
            const c = i.charCodeAt(0);
            if (c >= 97 && c <= 122) inuse[c - 97] = true;
            else if (c >= 65 && c <= 90) inuse[c - 65 + 26] = true;
        }
    }
    let last = game._lastinvnr ?? 51;
    for (let n = 0; n < invlet_basic; n++) {
        last++;
        if (last >= invlet_basic) last = 0;
        if (!inuse[last]) {
            otmp.invlet = last < 26
                ? String.fromCharCode(97 + last)
                : String.fromCharCode(65 + last - 26);
            game._lastinvnr = last;
            return;
        }
    }
    otmp.invlet = '#';
}

function inv_rank(o) {
    const ilet = o.invlet;
    if (ilet === GOLD_SYM) return -1;
    if (typeof ilet === 'string' && ilet.length === 1)
        return ilet.charCodeAt(0) ^ 0x20; // C: invlet ^ 040
    return 999;
}

// C ref: invent.c reorder_invent()
function reorder_invent() {
    const inv = game.invent;
    if (!inv || inv.length < 2) return;
    let need = true;
    while (need) {
        need = false;
        for (let i = 0; i < inv.length - 1; i++) {
            if (inv_rank(inv[i + 1]) < inv_rank(inv[i])) {
                const t = inv[i];
                inv[i] = inv[i + 1];
                inv[i + 1] = t;
                need = true;
            }
        }
    }
}

// C ref: invent.c addinv()
function addinv(obj) {
    if (!game.invent) game.invent = [];
    for (const otmp of game.invent) {
        if (mergable(otmp, obj)) {
            otmp.quan = (otmp.quan || 1) + (obj.quan || 1);
            otmp.owt = weight(otmp);
            if (otmp.oclass === COIN_CLASS || objectNames[otmp.otyp] === 'GOLD_PIECE') {
                game._goldCount = (game._goldCount || 0) + (obj.quan || 0);
            }
            return otmp;
        }
    }
    assigninvlet(obj);
    if (obj.oclass === COIN_CLASS) {
        game.invent.unshift(obj);
    } else {
        game.invent.push(obj);
    }
    reorder_invent();
    if (obj.oclass === COIN_CLASS || objectNames[obj.otyp] === 'GOLD_PIECE') {
        game._goldCount = (game._goldCount || 0) + (obj.quan || 0);
    }
    return obj;
}

function is_shirt(obj) {
    const n = objectNames[obj.otyp];
    return n === 'HAWAIIAN_SHIRT' || n === 'T_SHIRT';
}

function is_suit(obj) {
    // C ref: obj.h is_suit() — ARM_SUIT; named body armor until oc_armcat extracted.
    const n = objectNames[obj.otyp] || '';
    return n === 'LEATHER_ARMOR' || n === 'LEATHER_JACKET'
        || n === 'PLATE_MAIL' || n === 'CRYSTAL_PLATE_MAIL'
        || n === 'BRONZE_PLATE_MAIL' || n === 'SPLINT_MAIL'
        || n === 'BANDED_MAIL' || n === 'DWARVISH_MITHRIL_COAT'
        || n === 'ELVEN_MITHRIL_COAT' || n === 'CHAIN_MAIL'
        || n === 'ORCISH_CHAIN_MAIL' || n === 'SCALE_MAIL'
        || n === 'STUDDED_LEATHER_ARMOR' || n === 'RING_MAIL'
        || n === 'ORCISH_RING_MAIL'
        || n.endsWith('_SCALE_MAIL') || n.endsWith('_SCALES');
}

function is_missile(obj) {
    const n = objectNames[obj.otyp];
    return n === 'DART' || n === 'SHURIKEN' || n === 'BOOMERANG';
}

function has_descr(otyp) {
    // C: OBJ_DESCR(objects[otyp]) != NULL
    const n = objectNames[otyp] || '';
    if (n.startsWith('SCR_') || n.startsWith('POT_')
        || n.startsWith('RIN_') || n.startsWith('WAN_') || n.startsWith('SPE_'))
        return true;
    return n === 'ELVEN_DAGGER' || n === 'ORCISH_DAGGER'
        || n === 'SACK' || n === 'OILSKIN_SACK'
        || n === 'BAG_OF_HOLDING' || n === 'BAG_OF_TRICKS';
}

// C ref: u_init.c knows_object()
function knows_object(otyp, _override_pauper) {
    // discover_object(otyp, TRUE, FALSE, FALSE) — known but not encountered
    discover_object(otyp, true, false);
}

// C ref: u_init.c knows_class() — Rogue WEAPON_CLASS (daggers only).
// Full class walk needs oc_skill in objects_data; Rogue uses P_DAGGER names.
function knows_class(sym) {
    if (sym !== WEAPON_CLASS) return;
    const roleMnum = game.urole?.mnum;
    if (roleMnum === PM_ROGUE) {
        for (const ct of DAGGER_SKILL_OTYPS) {
            const obj = game.objects?.[ct];
            if (obj && obj.oc_class === WEAPON_CLASS && !obj.oc_magic)
                knows_object(ct, false);
        }
        return;
    }
}

// C ref: u_init.c ini_inv_use_obj()
function ini_inv_use_obj(obj) {
    if (has_descr(obj.otyp) && obj.known)
        discover_object(obj.otyp, true, true);

    if (obj.oclass === ARMOR_CLASS) {
        if (is_shirt(obj) && !game.u.uarmu) {
            obj.owornmask = (obj.owornmask || 0) | W_ARMU;
            game.u.uarmu = obj;
        } else if (is_suit(obj) && !game.u.uarm) {
            obj.owornmask = (obj.owornmask || 0) | W_ARM;
            game.u.uarm = obj;
        }
    }
    if (obj.oclass === WEAPON_CLASS || is_missile(obj)) {
        if (is_missile(obj)) {
            if (!game.u.uquiver) {
                obj.owornmask = (obj.owornmask || 0) | W_QUIVER;
                game.u.uquiver = obj;
            }
        } else if (!game.u.uwep) {
            obj.owornmask = (obj.owornmask || 0) | W_WEP;
            game.u.uwep = obj;
        } else if (!game.u.uswapwep) {
            obj.owornmask = (obj.owornmask || 0) | W_SWAPWEP;
            game.u.uswapwep = obj;
        }
    }
}

// C ref: do_wear.c find_ac() — base human AC 10; armor bonuses via a_ac (= 10 - listed ac)
export function find_ac() {
    let uac = 10; // mons[PM_HUMAN].ac
    const pieces = [game.u?.uarm, game.u?.uarmc, game.u?.uarmh, game.u?.uarmf,
        game.u?.uarms, game.u?.uarmg, game.u?.uarmu];
    for (const obj of pieces) {
        if (!obj) continue;
        const n = objectNames[obj.otyp] || '';
        let a_ac = 0;
        // C: objects[].a_ac = 10 - listed_ac in objects.h ARMOR()
        if (n === 'LEATHER_ARMOR') a_ac = 2; // listed ac 8
        else if (n === 'LEATHER_JACKET') a_ac = 1; // listed ac 9
        else if (n === 'FEDORA') a_ac = 0;
        else if (n === 'HAWAIIAN_SHIRT' || n === 'T_SHIRT') a_ac = 0;
        uac -= a_ac + (obj.spe || 0);
    }
    if (Math.abs(uac) > 99) uac = Math.sign(uac) * 99;
    if (uac !== game.u.uac) {
        game.u.uac = uac;
    }
}

// C ref: u_init.c ini_inv()
function ini_inv(tropArr) {
    let ti = 0;
    let trop = tropArr[ti];
    let quan = trquan(trop);
    while (trop.trclass) {
        const otyp = typeof trop.trotyp === 'function' ? trop.trotyp() : trop.trotyp;
        let obj;
        if (otyp !== UNDEF_TYP) {
            obj = mksobj(otyp, true, false);
        } else {
            obj = ini_inv_mkobj_filter(trop.trclass);
        }
        ini_inv_obj_substitution(trop, obj);
        if (ini_inv_adjust_obj(trop, obj)) quan = 1;
        addinv(obj);
        if (--quan) continue;
        ti++;
        trop = tropArr[ti];
        quan = trquan(trop);
    }
}

// C ref: u_init.c u_init_role() — Tourist + Rogue cases
function u_init_role() {
    const role = game.urole;
    const mnum = role?.mnum;

    if (mnum === PM_TOURIST) {
        game.u.umoney0 = rnd(1000);
        ini_inv(Tourist);
        if (!rn2(25)) ini_inv(Tinopener);
        else if (!rn2(25)) ini_inv(Leash);
        else if (!rn2(25)) ini_inv(Towel);
        else if (!rn2(20)) ini_inv(Magicmarker);
        return;
    }
    if (mnum === PM_ROGUE) {
        // C: u.umoney0 = 0; (already cleared in u_init_inventory_attrs)
        game.u.umoney0 = 0;
        ini_inv(Rogue);
        if (!rn2(5)) ini_inv(Blindfold);
        knows_object(otypByName('SACK'), false);
        knows_class(WEAPON_CLASS); // daggers only
        return;
    }
    throw new Error(`u_init_role: role not ported (${role?.name?.m})`);
}

// C ref: u_init.c u_init_race()
function u_init_race() {
    const racePm = game.urace?.mnum;
    const rolePm = game.urole?.mnum;

    switch (racePm) {
    case PM_HUMAN:
        break;

    case PM_ELF: {
        // Elves: non-warrior roles get a non-magic instrument (ROLL_FROM).
        if (rolePm === PM_CLERIC || rolePm === PM_WIZARD) {
            const trotyp = [
                'WOODEN_FLUTE', 'TOOLED_HORN', 'WOODEN_HARP',
                'BELL', 'BUGLE', 'LEATHER_DRUM',
            ].map(otypByName);
            const Instrument = [
                {
                    trotyp: () => trotyp[rn2(trotyp.length)],
                    trspe: 0,
                    trclass: TOOL_CLASS,
                    trquan_min: 1,
                    trquan_max: 1,
                    trbless: 0,
                },
                { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
            ];
            ini_inv(Instrument);
        }
        knows_object(otypByName('ELVEN_SHORT_SWORD'), false);
        knows_object(otypByName('ELVEN_ARROW'), false);
        knows_object(otypByName('ELVEN_BOW'), false);
        knows_object(otypByName('ELVEN_SPEAR'), false);
        knows_object(otypByName('ELVEN_DAGGER'), false);
        knows_object(otypByName('ELVEN_BROADSWORD'), false);
        knows_object(otypByName('ELVEN_MITHRIL_COAT'), false);
        knows_object(otypByName('ELVEN_LEATHER_HELM'), false);
        knows_object(otypByName('ELVEN_SHIELD'), false);
        knows_object(otypByName('ELVEN_BOOTS'), false);
        knows_object(otypByName('ELVEN_CLOAK'), false);
        break;
    }

    case PM_DWARF:
        knows_object(otypByName('DWARVISH_SPEAR'), false);
        knows_object(otypByName('DWARVISH_SHORT_SWORD'), false);
        knows_object(otypByName('DWARVISH_MATTOCK'), false);
        knows_object(otypByName('DWARVISH_IRON_HELM'), false);
        knows_object(otypByName('DWARVISH_MITHRIL_COAT'), false);
        knows_object(otypByName('DWARVISH_CLOAK'), false);
        knows_object(otypByName('DWARVISH_ROUNDSHIELD'), false);
        break;

    case PM_GNOME:
        break;

    case PM_ORC:
        // Compensate for generally inferior equipment
        if (rolePm !== PM_WIZARD) ini_inv(Xtra_food);
        knows_object(otypByName('ORCISH_SHORT_SWORD'), false);
        knows_object(otypByName('ORCISH_ARROW'), false);
        knows_object(otypByName('ORCISH_BOW'), false);
        knows_object(otypByName('ORCISH_SPEAR'), false);
        knows_object(otypByName('ORCISH_DAGGER'), false);
        knows_object(otypByName('ORCISH_CHAIN_MAIL'), false);
        knows_object(otypByName('ORCISH_RING_MAIL'), false);
        knows_object(otypByName('ORCISH_HELM'), false);
        knows_object(otypByName('ORCISH_SHIELD'), false);
        knows_object(otypByName('URUK_HAI_SHIELD'), false);
        knows_object(otypByName('ORCISH_CLOAK'), false);
        break;

    default:
        break;
    }
}

// C ref: u_init.c u_init_carry_attr_boost() — no RNG on increase path
function u_init_carry_attr_boost() {
    // Stub inv_weight: attrs often match without boost on early starters.
    // When invent weight is ported, loop adjattrib(A_STR/A_CON) like C.
    void A_STR;
    void A_CON;
}

/** Role filecode for quest proto rename (role.c / dungeon.c fixup). */
const ROLE_FILECODE = {
    Archeologist: 'Arc', Barbarian: 'Bar', Caveman: 'Cav', Healer: 'Hea',
    Knight: 'Kni', Monk: 'Mon', Priest: 'Pri', Ranger: 'Ran', Rogue: 'Rog',
    Samurai: 'Sam', Tourist: 'Tou', Valkyrie: 'Val', Wizard: 'Wiz',
};

/**
 * Install role/race tables on game from nethackrc / defaults.
 * Call before init_dungeons (quest filecode) and u_init_inventory_attrs.
 */
export function setup_role_race_from_rc(opts = {}) {
    const roleName = typeof opts.role === 'string' ? opts.role : 'Tourist';
    const raceName = typeof opts.race === 'string' ? opts.race : 'human';
    const alignName = typeof opts.align === 'string' ? opts.align : 'neutral';
    const role = findRole(roleName) || roles.find(r => r.name.m === 'Tourist');
    const race = findRace(raceName) || races.find(r => r.name === 'human');
    const align = findAlign(alignName) || aligns.find(a => a.name === 'neutral');
    game.urole = {
        name: role.name,
        rank: role.title?.[0] || { m: role.name.m, f: role.name.f },
        mnum: role.mnum,
        petnum: role.petnum ?? NON_PM,
        filecode: ROLE_FILECODE[role.name.m] || 'Tou',
        attrbase: role.attrbase,
        attrdist: role.attrdist,
        initrecord: role.initrecord ?? 0,
        lgod: role.lgod || 'Blind Io',
        ngod: role.ngod || 'The Lady',
        cgod: role.cgod || 'Offler',
        hpadv: role.hpadv || { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 },
        enadv: role.enadv || { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    };
    game.urace = {
        name: race.name,
        adj: race.adj,
        noun: race.noun || race.name,
        mnum: race.mnum,
        attrmin: race.attrmin,
        attrmax: race.attrmax,
        hpadv: race.hpadv || { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
        enadv: race.enadv || { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    };
    game.flags = game.flags || {};
    if (opts.gender === 'female' || opts.gender === 1) game.flags.female = true;
    else if (opts.gender === 'male' || opts.gender === 0) game.flags.female = false;
    // C: flags.initalign indexes aligns[]
    const alignIdx = aligns.indexOf(align);
    game.flags.initalign = alignIdx >= 0 ? alignIdx : 1;
    if (opts.name) game.plname = opts.name;
}

// C ref: u_init.c u_init_misc() — pre-mklev; newhp/newpw at ulevel==0.
export function u_init_misc() {
    const g = game;
    g.u = g.u || {};
    g.flags = g.flags || {};
    g.flags.beginner = true;

    g.u.uz = { dnum: 0, dlevel: 1 };
    g.u.uz0 = { dnum: 0, dlevel: 0 };
    g.u.utolev = { dnum: 0, dlevel: 1 };

    // C: u.ulevel = 0; then newhp()/newpw(); then u.ulevel = u.ulevelmax = 1;
    g.u.ulevel = 0;
    const hp = newhp();
    const pw = newpw();
    g.u.uhp = g.u.uhpmax = g.u.uhppeak = hp;
    g.u.uen = g.u.uenmax = g.u.uenpeak = pw;
    g.u.ulevel = g.u.ulevelmax = 1;

    // C: u.ualignbase[...] = u.ualign.type = aligns[flags.initalign].value
    const alignEnt = aligns[g.flags.initalign] || aligns[1];
    const atype = alignEnt?.value ?? A_NEUTRAL;
    g.u.ualign = { type: atype, record: g.urole?.initrecord ?? 0 };
    g.u.ualignbase = { current: atype, original: atype };

    g.u.uhunger = 900;
    g.u.ublesscnt = 300;
    g.u.nv_range = 1;
    g.u.xray_range = -1;

    // C: u.uhandedness = rn2(10) ? RIGHT_HANDED : LEFT_HANDED;
    g.u.uhandedness = rn2(10) ? RIGHT_HANDED : LEFT_HANDED;
}

// C ref: u_init.c u_init_inventory_attrs()
export function u_init_inventory_attrs() {
    game.invent = [];
    game._goldCount = 0;
    game._lastinvnr = 51; // C: gl.lastinvnr = 51
    game.disco = new Array((game.objects?.length) || 480).fill(0);
    game.u = game.u || {};
    game.u.umoney0 = 0;
    game.u.uarmu = null;
    game.u.uarm = null;
    game.u.uquiver = null;
    game.u.uwep = null;
    game.u.uswapwep = null;

    u_init_role();
    u_init_race();

    // C ref: u_init.c — if (discover) ini_inv(Wishing)
    if (game.flags?.explore || game.flags?.discover) ini_inv(Wishing);

    if (game.u.umoney0) ini_inv(Money);

    init_attr(75);
    vary_init_attr();
    u_init_carry_attr_boost();
}

// C ref: u_init.c u_init_skills_discoveries() — wear/wield/discover; skills stubbed.
export function u_init_skills_discoveries() {
    for (const otmp of game.invent || [])
        ini_inv_use_obj(otmp);
    find_ac();
}
