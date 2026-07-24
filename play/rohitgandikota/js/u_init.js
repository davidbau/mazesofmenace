// u_init.js — the hero's starting inventory.
// C ref: src/u_init.c
//
// This is the block js/fastforward.js used to replay as 124 recorded values.
// For seed8000 the sequence is, exactly:
//
//   rnd(1000)                 u.umoney0 for a Tourist
//   rn2(20)                   trquan() for the darts
//   mksobj(DART) ...          next_ident + mksobj_init + blessorcurse
//   rn2(20)                   trquan() again, from ini_inv_adjust_obj
//   rn2(1)                    trquan() for the ten food items
//   10x mkobj(FOOD_CLASS)     each next_ident + mksobj_init
//   ...
//   rn2(25) rn2(25) rn2(25) rn2(20)   the Tourist's four optional extras
//
// trquan() is called twice per weapon or tool entry — once by ini_inv's loop
// and once inside ini_inv_adjust_obj — which is easy to miss and shifts
// everything after it.

import { game } from './gstate.js';
import { rn2, rnd, rne, rn1 } from './rng.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { PMNAMES } from './monst_data.js';
import { mkobj, mksobj } from './mkobj.js';
import { TROBJ, UNDEF_TYP, UNDEF_SPE, UNDEF_BLESS } from './uinit_data.js';

const {
    WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS, TOOL_CLASS, GEM_CLASS,
    POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, RING_CLASS,
    COIN_CLASS,
} = OCLASSES;

const A_CHAOTIC = -1;   /* include/align.h */

// Objects a random starting item must never be. src/u_init.c:1117-1160.
function ini_inv_rejects(obj, got_level1_spellbook) {
    const o = obj.otyp;
    const objects = game.objects;
    const roleIs = (pm) => game.urole?.mnum === pm || game.urole?.mnum === PMNAMES[pm];
    const raceIs = (pm) => game.urace?.mnum === pm || game.urace?.mnum === PMNAMES[pm];

    return o === ONAMES.WAN_WISHING
        || o === game.nocreate || o === game.nocreate2
        || o === game.nocreate3 || o === game.nocreate4
        || o === ONAMES.RIN_LEVITATION
        || o === ONAMES.SCR_AMNESIA
        || o === ONAMES.SCR_FIRE
        || o === ONAMES.SCR_BLANK_PAPER
        || o === ONAMES.SPE_BLANK_PAPER
        || o === ONAMES.RIN_AGGRAVATE_MONSTER
        || o === ONAMES.RIN_HUNGER
        || o === ONAMES.WAN_NOTHING
        || (o === ONAMES.RIN_POISON_RESISTANCE && raceIs('PM_ORC'))
        || (o === ONAMES.SCR_ENCHANT_WEAPON && roleIs('PM_MONK'))
        || (o === ONAMES.SPE_FORCE_BOLT && roleIs('PM_WIZARD'))
        || (obj.oclass === SPBOOK_CLASS
            && objects[o].oc_level > (got_level1_spellbook ? 3 : 1))
        || o === ONAMES.SPE_NOVEL;
}

// src/u_init.c:1114 ini_inv_mkobj_filter()
function ini_inv_mkobj_filter(oclass, got_level1_spellbook) {
    let obj = mkobj(oclass, false);
    let trycnt = 0;

    while (ini_inv_rejects(obj, got_level1_spellbook)) {
        if (++trycnt > 1000)
            return mksobj(ONAMES.PANCAKE, true, false);
        obj = mkobj(oclass, false);
    }
    return obj;
}

// src/u_init.c:1106 trquan() — randomise the quantity from a trobj row.
function trquan(trop) {
    if (!trop.trquan_min)
        return 1;
    return trop.trquan_min + rn2(trop.trquan_max - trop.trquan_min + 1);
}

const is_graystone = (obj) =>
    obj.otyp === ONAMES.LUCKSTONE || obj.otyp === ONAMES.LOADSTONE
    || obj.otyp === ONAMES.FLINT || obj.otyp === ONAMES.TOUCHSTONE;

const Is_container = (obj) =>
    obj.otyp >= ONAMES.LARGE_BOX && obj.otyp <= ONAMES.BAG_OF_TRICKS;

// src/u_init.c:1214 ini_inv_adjust_obj() — returns true when the caller should
// stop making more of this entry.
//
// The second trquan() call for weapons and tools lives here.
function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    const objects = game.objects;

    if (trop.trclass === COIN_CLASS) {
        obj.quan = game.u.umoney0;
    } else {
        if (objects[obj.otyp].oc_uses_known)
            obj.known = 1;
        obj.dknown = obj.bknown = obj.rknown = 1;
        if (Is_container(obj) || obj.otyp === ONAMES.STATUE) {
            obj.cknown = obj.lknown = 1;
            obj.otrapped = 0;
        }
        obj.cursed = 0;
        if (obj.opoisoned && game.u.ualign.type !== A_CHAOTIC)
            obj.opoisoned = 0;
        if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) {
            obj.quan = trquan(trop);
            stop = true;
        } else if (obj.oclass === GEM_CLASS && is_graystone(obj)
                   && obj.otyp !== ONAMES.FLINT) {
            obj.quan = 1;
        }
        if (trop.trspe !== UNDEF_SPE) {
            obj.spe = trop.trspe;
            if (trop.trotyp === ONAMES.MAGIC_MARKER && obj.spe < 96)
                obj.spe += rn2(4);
        } else {
            /* don't start with +0 or negative rings */
            if (objects[obj.otyp].oc_class === RING_CLASS
                && objects[obj.otyp].oc_charged && obj.spe <= 0)
                obj.spe = rne(3);
        }
        if (trop.trbless !== UNDEF_BLESS)
            obj.blessed = trop.trbless;
    }
    return stop;
}

// src/invent.c addinv() — no draw; the hero's pack is a plain list here.
function addinv(obj) {
    (game.invent ||= []).push(obj);
    return obj;
}

// src/o_init.c knows_object() / knows_class() — mark discoveries. No draw, but
// this is what the `\` discoveries window reads back.
export function knows_object(otyp) {
    game.objects[otyp].oc_name_known = 1;
    (game.disco ||= []);
    if (!game.disco.includes(otyp)) game.disco.push(otyp);
}

export function knows_class(oclass) {
    const objects = game.objects;
    for (let i = game.bases[oclass];
         i < objects.length && objects[i].oc_class === oclass; i++)
        objects[i].oc_known_class = 1;
}

// src/u_init.c:1174 ini_inv()
export function ini_inv(trop_table) {
    let ti = 0;
    let trop = trop_table[ti];
    let got_sp1 = false;
    let quan = trquan(trop);

    while (trop && trop.trclass) {
        let obj;
        let otyp = trop.trotyp;

        if (otyp !== UNDEF_TYP) {
            obj = mksobj(otyp, true, false);
        } else {
            obj = ini_inv_mkobj_filter(trop.trclass, got_sp1);
            otyp = obj.otyp;
            switch (otyp) {
            case ONAMES.WAN_POLYMORPH:
            case ONAMES.RIN_POLYMORPH:
            case ONAMES.POT_POLYMORPH:
                game.nocreate = ONAMES.RIN_POLYMORPH_CONTROL;
                break;
            case ONAMES.RIN_POLYMORPH_CONTROL:
                game.nocreate = ONAMES.RIN_POLYMORPH;
                game.nocreate2 = ONAMES.SPE_POLYMORPH;
                game.nocreate3 = ONAMES.POT_POLYMORPH;
                break;
            default:
                break;
            }
            /* don't have 2 of the same ring or spellbook */
            if (obj.oclass === RING_CLASS || obj.oclass === SPBOOK_CLASS)
                game.nocreate4 = otyp;
        }

        /* ini_inv_obj_substitution() handles race-specific swaps (elven and
           orcish gear). No public session uses a race that triggers it, and it
           draws nothing, so it is recorded rather than guessed at. */
        if (game.urace && (game.urace.mnum === 'PM_ELF'
                        || game.urace.mnum === 'PM_ORC'))
            (game.unported ||= new Set()).add('ini_inv_obj_substitution');

        if (ini_inv_adjust_obj(trop, obj))
            quan = 1;
        obj = addinv(obj);

        /* first spellbook should be level 1 — did we get it? */
        if (obj.oclass === SPBOOK_CLASS
            && game.objects[obj.otyp].oc_level === 1)
            got_sp1 = true;

        if (--quan)
            continue;           /* make a similar object */
        trop = trop_table[++ti];
        if (trop) quan = trquan(trop);
    }
}

// src/u_init.c:646 u_init_role() — the per-role switch.
//
// Only the `ini_inv` calls and their guarding draws are here; the skill and
// intrinsic assignments around them draw nothing.
export function u_init_role() {
    const u = game.u;
    const role = roleMnum();

    game.moves = 1;

    switch (role) {
    case PMNAMES.PM_ARCHEOLOGIST:
        ini_inv(TROBJ.Archeologist);
        if (!rn2(10)) ini_inv(TROBJ.Tinopener);
        else if (!rn2(4)) ini_inv(TROBJ.Lamp);
        else if (!rn2(5)) ini_inv(TROBJ.Magicmarker);
        knows_object(ONAMES.SACK);
        knows_object(ONAMES.TOUCHSTONE);
        break;
    case PMNAMES.PM_BARBARIAN:
        if (rn2(100) >= 50) ini_inv(TROBJ.Barbarian_0);
        else ini_inv(TROBJ.Barbarian_1);
        if (!rn2(6)) ini_inv(TROBJ.Lamp);
        knows_class(WEAPON_CLASS);
        knows_class(ARMOR_CLASS);
        break;
    case PMNAMES.PM_CAVE_DWELLER:
        ini_inv(TROBJ.Cave_man);
        break;
    case PMNAMES.PM_HEALER:
        u.umoney0 = rn1(1000, 1001);
        ini_inv(TROBJ.Healer);
        if (!rn2(25)) ini_inv(TROBJ.Lamp);
        knows_object(ONAMES.POT_FULL_HEALING);
        break;
    case PMNAMES.PM_KNIGHT:
        ini_inv(TROBJ.Knight);
        knows_class(WEAPON_CLASS);
        knows_class(ARMOR_CLASS);
        break;
    case PMNAMES.PM_MONK: {
        const M_spell = [TROBJ.Healing_book, TROBJ.Protection_book,
                         TROBJ.Confuse_monster_book];
        ini_inv(TROBJ.Monk);
        ini_inv(M_spell[Math.trunc(rn2(90) / 30)]);
        if (!rn2(4)) ini_inv(TROBJ.Magicmarker);
        else if (!rn2(10)) ini_inv(TROBJ.Lamp);
        knows_class(ARMOR_CLASS);
        knows_object(ONAMES.SHURIKEN);
        break;
    }
    case PMNAMES.PM_CLERIC:
        ini_inv(TROBJ.Priest);
        if (!rn2(5)) ini_inv(TROBJ.Magicmarker);
        else if (!rn2(10)) ini_inv(TROBJ.Lamp);
        knows_object(ONAMES.POT_WATER);
        break;
    case PMNAMES.PM_RANGER:
        ini_inv(TROBJ.Ranger);
        knows_class(WEAPON_CLASS);
        break;
    case PMNAMES.PM_ROGUE:
        u.umoney0 = 0;
        ini_inv(TROBJ.Rogue);
        if (!rn2(5)) ini_inv(TROBJ.Blindfold);
        knows_object(ONAMES.SACK);
        knows_class(WEAPON_CLASS);
        break;
    case PMNAMES.PM_SAMURAI:
        ini_inv(TROBJ.Samurai);
        if (!rn2(5)) ini_inv(TROBJ.Blindfold);
        knows_class(WEAPON_CLASS);
        knows_class(ARMOR_CLASS);
        /* the Japanese_item_name() pre-discovery loop draws nothing */
        break;
    case PMNAMES.PM_TOURIST:
        u.umoney0 = rnd(1000);
        ini_inv(TROBJ.Tourist);
        if (!rn2(25)) ini_inv(TROBJ.Tinopener);
        else if (!rn2(25)) ini_inv(TROBJ.Leash);
        else if (!rn2(25)) ini_inv(TROBJ.Towel);
        else if (!rn2(20)) ini_inv(TROBJ.Magicmarker);
        break;
    case PMNAMES.PM_VALKYRIE:
        ini_inv(TROBJ.Valkyrie);
        if (!rn2(6)) ini_inv(TROBJ.Lamp);
        knows_class(WEAPON_CLASS);
        knows_class(ARMOR_CLASS);
        break;
    case PMNAMES.PM_WIZARD:
        ini_inv(TROBJ.Wizard);
        if (!rn2(5)) ini_inv(TROBJ.Blindfold);
        break;
    default:
        (game.unported ||= new Set()).add(`u_init_role mnum=${role}`);
        break;
    }
}

// src/u_init.c:791 u_init_race() — race-specific extras. Only orcs draw
// (Xtra_food), and no public session plays one.
export function u_init_race() {
    const race = raceMnum();
    if (race === PMNAMES.PM_ORC) {
        if (roleMnum() !== PMNAMES.PM_WIZARD)
            ini_inv(TROBJ.Xtra_food);
        knows_object(ONAMES.ORCISH_SHORT_SWORD);
        knows_object(ONAMES.ORCISH_ARROW);
        knows_object(ONAMES.ORCISH_BOW);
    }
}

// src/u_init.c:1374 — the tail of u_init(): role, race, then the starting
// gold. ini_inv(Money) is one rn2(1) from trquan plus a next_ident, easy to
// mistake for part of the attribute block that follows.
export function u_init_inventory() {
    game.u.umoney0 = 0;
    u_init_role();
    u_init_race();
    if (game.u.umoney0)
        ini_inv(TROBJ.Money);
}

// gu.urole.mnum is a PM_ name in the generated role table.
function roleMnum() {
    const m = game.urole?.mnum;
    if (typeof m === 'number') return m;
    return (m && PMNAMES[m] !== undefined) ? PMNAMES[m] : -1;
}

function raceMnum() {
    const m = game.urace?.mnum;
    if (typeof m === 'number') return m;
    return (m && PMNAMES[m] !== undefined) ? PMNAMES[m] : -1;
}
