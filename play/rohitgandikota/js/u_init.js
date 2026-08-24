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
import { mergable, reorder_invent, assigninvlet, addinv, weight } from './invent.js';
import { rn2, rnd, rne, rn1 } from './rng.js';
import { OCLASSES, ONAMES, SKILLS } from './objects_data.js';
import { PMNAMES } from './monst_data.js';
import { skill_tables } from './skills_data.js';
import { ART_SNICKERSNEE } from './artilist_data.js';
import { P_NONE, W_QUIVER, W_WEP , W_SWAPWEP, W_ARMS, W_ARMH, W_ARMG,
         W_ARMU, W_ARMC, W_ARMF, W_ARM } from './const.js';
import { Is_container, bimanual, is_shield, is_helmet, is_gloves, is_shirt,
         is_cloak, is_boots, is_suit } from './obj.js';
import { is_missile, set_twoweap, setuqwep, setuwep,
         setuswapwep } from './wield.js';
import { setworn } from './worn.js';
import { is_weptool } from './mkobj.js';
import { skill_init } from './weapon.js';
import { spell_skilltype, initialspell, num_spells,
         SPELL_LEV_PW } from './spell.js';
import { mkobj, mksobj } from './mkobj.js';
import { TROBJ, UNDEF_TYP, UNDEF_SPE, UNDEF_BLESS } from './uinit_data.js';
import { discover_object } from './o_init.js';
import { OBJ_DESCR } from './objnam.js';

// include/prop.h:101-107 — worn-equipment slot masks.
/* W_QUIVER was 0x0800 here and in js/objnam.js; include/prop.h:111 says
   0x0200. They agreed with each other so the "(at the ready)" suffix still
   showed, but neither agreed with js/const.js. */
/* W_ARM..W_ARMU now come from js/const.js with the rest of the slot masks. */

const {
    WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS, TOOL_CLASS, GEM_CLASS,
    POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, RING_CLASS,
    COIN_CLASS,
} = OCLASSES;

const A_CHAOTIC = -1;   /* include/align.h */

// Objects a random starting item must never be. src/u_init.c:1117-1160.
// src/u_init.c skills_for_role() — the current role's weapon/spell table.
function skills_for_role() {
    const mnum = game.urole?.mnum;
    for (const pm of Object.keys(skill_tables))
        if (mnum === pm || mnum === PMNAMES[pm])
            return skill_tables[pm];
    return null; /* C panics here */
}


// src/u_init.c restricted_spell_discipline() — true when the role may not train
// this spellbook's school at all. ini_inv_mkobj_filter() refuses such books, so
// a table row missing here changes how many times it retries.
function restricted_spell_discipline(otyp) {
    const skills = skills_for_role();
    const this_skill = spell_skilltype(otyp);

    for (const [skill] of skills || []) {
        if (skill === P_NONE)
            break;
        if (skill === this_skill)
            return false;
    }
    return true;
}

function ini_inv_rejects(obj, got_level1_spellbook) {
    const o = obj.otyp;
    const objects = game.objects;
    const roleIs = (pm) => game.urole?.mnum === pm || game.urole?.mnum === PMNAMES[pm];
    const raceIs = (pm) => game.urace?.mnum === pm || game.urace?.mnum === PMNAMES[pm];

    return o === ONAMES.WAN_WISHING
        || o === game.nocreate || o === game.nocreate2
        || o === game.nocreate3 || o === game.nocreate4
        || o === ONAMES.RIN_LEVITATION
        /* the 'useless' items, src/u_init.c:1136 */
        || o === ONAMES.POT_HALLUCINATION
        || o === ONAMES.POT_ACID
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
            && (objects[o].oc_level > (got_level1_spellbook ? 3 : 1)
                || restricted_spell_discipline(o)))
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
    /* src/u_init.c:1248 — "defined after setting otyp+quan + blessedness".
       Outside the `if` on purpose, exactly as in the C. Missing this left
       every starting stack carrying the weight of a single item (8 apples
       weighed 2, 4 potions weighed 20), so inv_weight() ran low and
       near_capacity() reported UNENCUMBERED when the hero was Burdened.
       That silently deleted exerper()'s encumbrance exercise() every tenth
       move, in every session. */
    obj.owt = weight(obj);
    return stop;
}

// src/invent.c:1268 mergable() — can `obj` be folded into `otmp`?
//
// The BUC and enchantment tests matter for the inventory frame: five separate
// FOOD_RATION objects merge into one "6 uncursed food rations" line, but a
// blessed and an uncursed stack of the same otyp would not.
/* The real mergable() now lives in js/invent.js, its C home (src/invent.c).
   The abbreviated copy that stood here checked nine of its twenty conditions
   and, being the more permissive of the two, would fold starting-inventory
   stacks that C keeps apart. */

/* assigninvlet() and addinv() now live in js/invent.js, their C home
   (src/invent.c:230, :600). */

// include/you.h:247,297 Role_if() / Race_if(). The role tables store mnum as a
// number, so accept either the PM_ name or the number a caller already resolved.
function Role_if(pm) {
    const m = game.urole?.mnum;
    return m === pm || m === PMNAMES[pm];
}

export function Race_if(pm) {
    const m = game.urace?.mnum;
    return m === pm || m === PMNAMES[pm];
}

/* src/u_init.c:222 inv_subs[] — race-based substitutions for initial
   inventory; the weaker cloak for elven rangers is intentional, they shoot
   better. The two commented-out rows are commented out in the C too. */
const inv_subs = [
    ['PM_ELF', 'DAGGER', 'ELVEN_DAGGER'],
    ['PM_ELF', 'SPEAR', 'ELVEN_SPEAR'],
    ['PM_ELF', 'SHORT_SWORD', 'ELVEN_SHORT_SWORD'],
    ['PM_ELF', 'BOW', 'ELVEN_BOW'],
    ['PM_ELF', 'ARROW', 'ELVEN_ARROW'],
    ['PM_ELF', 'HELMET', 'ELVEN_LEATHER_HELM'],
    /* ['PM_ELF', 'SMALL_SHIELD', 'ELVEN_SHIELD'], */
    ['PM_ELF', 'CLOAK_OF_DISPLACEMENT', 'ELVEN_CLOAK'],
    ['PM_ELF', 'CRAM_RATION', 'LEMBAS_WAFER'],
    ['PM_ORC', 'DAGGER', 'ORCISH_DAGGER'],
    ['PM_ORC', 'SPEAR', 'ORCISH_SPEAR'],
    ['PM_ORC', 'SHORT_SWORD', 'ORCISH_SHORT_SWORD'],
    ['PM_ORC', 'BOW', 'ORCISH_BOW'],
    ['PM_ORC', 'ARROW', 'ORCISH_ARROW'],
    ['PM_ORC', 'HELMET', 'ORCISH_HELM'],
    ['PM_ORC', 'SMALL_SHIELD', 'ORCISH_SHIELD'],
    ['PM_ORC', 'RING_MAIL', 'ORCISH_RING_MAIL'],
    ['PM_ORC', 'CHAIN_MAIL', 'ORCISH_CHAIN_MAIL'],
    ['PM_ORC', 'CRAM_RATION', 'TRIPE_RATION'],
    ['PM_ORC', 'LEMBAS_WAFER', 'TRIPE_RATION'],
    ['PM_DWARF', 'SPEAR', 'DWARVISH_SPEAR'],
    ['PM_DWARF', 'SHORT_SWORD', 'DWARVISH_SHORT_SWORD'],
    ['PM_DWARF', 'HELMET', 'DWARVISH_IRON_HELM'],
    /* ['PM_DWARF', 'SMALL_SHIELD', 'DWARVISH_ROUNDSHIELD'], */
    /* ['PM_DWARF', 'PICK_AXE', 'DWARVISH_MATTOCK'], */
    ['PM_DWARF', 'LEMBAS_WAFER', 'CRAM_RATION'],
    ['PM_GNOME', 'BOW', 'CROSSBOW'],
    ['PM_GNOME', 'ARROW', 'CROSSBOW_BOLT'],
];

// src/u_init.c:1181 ini_inv_obj_substitution() — substitute an object with
// something else based on race. Only changes otyp, and returns it.
//
// C applies this to EVERY starting object, including randomly generated ones,
// which is why it lives here rather than inside the UNDEF_TYP branch.
function ini_inv_obj_substitution(trop, obj) {
    if (!Race_if('PM_HUMAN')) {
        for (const [race_pm, item_otyp, subs_otyp] of inv_subs)
            if (Race_if(race_pm) && obj.otyp === ONAMES[item_otyp]) {
                obj.otyp = ONAMES[subs_otyp];
                break;
            }
    }
    return obj.otyp;
}

// src/artifact.c:2808 is_art()
function is_art(obj, art) {
    return !!(obj && obj.oartifact === art);
}

/* include/obj.h:228-241 — the weapon-shape predicates knows_class() filters
   with. oc_skill is negated for thrown weapons, which is what makes is_ammo a
   range test against -P_CROSSBOW..-P_BOW rather than a list. */
export const is_pole = (otmp) =>
    (otmp.oclass === OCLASSES.WEAPON_CLASS || otmp.oclass === OCLASSES.TOOL_CLASS)
    && (game.objects[otmp.otyp].oc_skill === SKILLS.P_POLEARMS
        || game.objects[otmp.otyp].oc_skill === SKILLS.P_LANCE
        || is_art(otmp, ART_SNICKERSNEE));

export const is_spear = (otmp) =>
    otmp.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[otmp.otyp].oc_skill === SKILLS.P_SPEAR;

export const is_launcher = (otmp) =>
    otmp.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[otmp.otyp].oc_skill >= SKILLS.P_BOW
    && game.objects[otmp.otyp].oc_skill <= SKILLS.P_CROSSBOW;

const is_ammo = (otmp) =>
    (otmp.oclass === OCLASSES.WEAPON_CLASS || otmp.oclass === OCLASSES.GEM_CLASS)
    && game.objects[otmp.otyp].oc_skill >= -SKILLS.P_CROSSBOW
    && game.objects[otmp.otyp].oc_skill <= -SKILLS.P_BOW;

// src/u_init.c knows_object()
export function knows_object(obj, override_pauper) {
    if (game.u.uroleplay?.pauper && !override_pauper)
        return;
    /* mark as known, but not yet encountered */
    discover_object(obj, true, false, false);
}

// src/u_init.c knows_class() — pre-identify a whole class, minus the pieces a
// role has no business recognising. The exceptions are not cosmetic: each one
// leaves an object undiscovered, and discover_object() writes the discovery
// list that the C prints and prices from.
export function knows_class(sym) {
    const objects = game.objects;

    if (game.u.uroleplay?.pauper)
        return;

    /* C builds a dummy obj so the obj.h macros can be used on it */
    const odummy = { oclass: sym, otyp: 0 };
    const o = odummy;

    for (let ct = game.bases[sym]; ct < game.bases[sym + 1]; ct++) {
        /* not flagged as magic but shouldn't be pre-discovered
           (small shields look the same as two types of magical shield;
           cornuthaum / dunce cap look the same as each other) */
        if (ct === ONAMES.CORNUTHAUM || ct === ONAMES.DUNCE_CAP
            || ct === ONAMES.SMALL_SHIELD)
            continue;
        if (sym === OCLASSES.WEAPON_CLASS) {
            odummy.otyp = ct; /* update 'o' */
            /* arbitrary: only knights and samurai recognize polearms */
            if ((!Role_if('PM_KNIGHT') && !Role_if('PM_SAMURAI')) && is_pole(o))
                continue;
            /* rangers know all launchers (bows, &c), ammo (arrows, &c),
               and spears regardless of race/species, but not other weapons */
            if (Role_if('PM_RANGER')
                && (!is_launcher(o) && !is_ammo(o) && !is_spear(o)))
                continue;
            /* rogues know daggers, regardless of racial variations */
            if (Role_if('PM_ROGUE') && (objects[ct].oc_skill !== SKILLS.P_DAGGER))
                continue;
        }

        if (objects[ct].oc_class === sym && !objects[ct].oc_magic)
            knows_object(ct, false);
    }
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

        ini_inv_obj_substitution(trop, obj);

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
    if (race === PMNAMES.PM_ELF) {
        /*
         * Elves are people of music and song, or they are warriors.
         * Non-warriors get an instrument.  We use a kludge to
         * get only non-magic instruments.
         */
        if (roleMnum() === PMNAMES.PM_CLERIC
            || roleMnum() === PMNAMES.PM_WIZARD) {
            /* src/u_init.c:806 — ROLL_FROM(trotyp) is trotyp[rn2(SIZE)], so
               this costs one rn2(6) BEFORE ini_inv's own draws. Omitting the
               whole arm started an elven wizard's attribute rolls four draws
               early and gave it different characteristics. */
            const trotyp = [ONAMES.WOODEN_FLUTE, ONAMES.TOOLED_HORN,
                            ONAMES.WOODEN_HARP, ONAMES.BELL,
                            ONAMES.BUGLE, ONAMES.LEATHER_DRUM];
            const Instrument = [
                { trotyp: trotyp[rn2(trotyp.length)], trspe: 0,
                  trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1,
                  trbless: 0 },
                { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0,
                  trquan_max: 0, trbless: 0 },
            ];
            ini_inv(Instrument);
        }

        /* Elves can recognize all elvish objects */
        knows_object(ONAMES.ELVEN_SHORT_SWORD);
        knows_object(ONAMES.ELVEN_ARROW);
        knows_object(ONAMES.ELVEN_BOW);
        knows_object(ONAMES.ELVEN_SPEAR);
        knows_object(ONAMES.ELVEN_DAGGER);
        knows_object(ONAMES.ELVEN_BROADSWORD);
        knows_object(ONAMES.ELVEN_MITHRIL_COAT);
        knows_object(ONAMES.ELVEN_LEATHER_HELM);
        knows_object(ONAMES.ELVEN_SHIELD);
        knows_object(ONAMES.ELVEN_BOOTS);
        knows_object(ONAMES.ELVEN_CLOAK);
    }
    if (race === PMNAMES.PM_ORC) {
        if (roleMnum() !== PMNAMES.PM_WIZARD)
            ini_inv(TROBJ.Xtra_food);
        /* src/u_init.c:847 — Orcs can recognize ALL orcish objects; the
           first three alone left the discoveries list short */
        knows_object(ONAMES.ORCISH_SHORT_SWORD);
        knows_object(ONAMES.ORCISH_ARROW);
        knows_object(ONAMES.ORCISH_BOW);
        knows_object(ONAMES.ORCISH_SPEAR);
        knows_object(ONAMES.ORCISH_DAGGER);
        knows_object(ONAMES.ORCISH_CHAIN_MAIL);
        knows_object(ONAMES.ORCISH_RING_MAIL);
        knows_object(ONAMES.ORCISH_HELM);
        knows_object(ONAMES.ORCISH_SHIELD);
        knows_object(ONAMES.URUK_HAI_SHIELD);
        knows_object(ONAMES.ORCISH_CLOAK);
    }
}

// src/u_init.c:1374 — the tail of u_init(): role, race, then the starting
// gold. ini_inv(Money) is one rn2(1) from trquan plus a next_ident, easy to
// mistake for part of the attribute block that follows.
export function u_init_inventory() {
    game.u.umoney0 = 0;
    u_init_role();
    u_init_race();
    if (game.discover)
        ini_inv(TROBJ.Wishing);
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

// src/u_init.c:1256 ini_inv_use_obj() — the side effects of starting with an
// item: the hero already knows what it is.
//
// The gate is `OBJ_DESCR(objects[otyp]) && obj->known`. Only object types that
// HAVE a randomised appearance get discovered — a food ration has no
// description to learn, a scroll of magic mapping does. obj->known is set by
// ini_inv_adjust_obj() for types whose oc_uses_known is set.
export function ini_inv_use_obj(obj) {
    if (OBJ_DESCR(game.objects[obj.otyp]) && obj.known)
        discover_object(obj.otyp, true, true, false);
    if (obj.otyp === ONAMES.OIL_LAMP)
        discover_object(ONAMES.POT_OIL, true, true, false);
    /* src/u_init.c:1264 — the hero puts on what they can, through setworn()
       exactly as C does, which is what grants each item's oc_oprop extrinsic
       (a Ranger's starting cloak of displacement) and fills the worn[] slot
       pointers. No draw, but directly visible: ^X reports "You are not
       wearing any armor" when every slot is empty. */
    if (obj.oclass === ARMOR_CLASS) {
        if (is_shield(obj) && !game.u.uarms
            && !(game.u.uwep && bimanual(game.u.uwep))) {
            /* just make sure we aren't two-weaponing (academic; no one
               starts that way) */
            set_twoweap(false); /* u.twoweap = FALSE */
            setworn(obj, W_ARMS);
        } else if (is_helmet(obj) && !game.u.uarmh)
            setworn(obj, W_ARMH);
        else if (is_gloves(obj) && !game.u.uarmg)
            setworn(obj, W_ARMG);
        else if (is_shirt(obj) && !game.u.uarmu)
            setworn(obj, W_ARMU);
        else if (is_cloak(obj) && !game.u.uarmc)
            setworn(obj, W_ARMC);
        else if (is_boots(obj) && !game.u.uarmf)
            setworn(obj, W_ARMF);
        else if (is_suit(obj) && !game.u.uarm)
            setworn(obj, W_ARM);
    }
    obj.owornmask ||= 0;
    ini_inv_wield(obj);

    /* src/u_init.c:1295 — a starting spellbook is memorised. */
    if (obj.oclass === OCLASSES.SPBOOK_CLASS
        && obj.otyp !== ONAMES.SPE_BLANK_PAPER)
        initialspell(obj);
}

// src/u_init.c:1281 — a Tourist's darts go into the quiver, which is what
// makes the inventory line read "(at the ready)". The guard also admits
// weptools, the tin opener, flint, and rocks: a Caveman's flint stones are
// GEM_CLASS yet start "(in quiver pouch)".
function ini_inv_wield(obj) {
    if (!(obj.oclass === WEAPON_CLASS || is_weptool(obj, game.objects)
          || obj.otyp === ONAMES.TIN_OPENER
          || obj.otyp === ONAMES.FLINT || obj.otyp === ONAMES.ROCK))
        return;
    if (is_ammo(obj) || is_missile(obj)) {
        if (!game.u.uquiver)
            setuqwep(obj);
    } else if (!game.u.uwep && (!game.u.uarms || !bimanual(obj))) {
        setuwep(obj);
    } else if (!game.u.uswapwep) {
        /* src/u_init.c:1291 — the SECOND weapon becomes the alternate. A
           Ranger's bow lands here, and ready_ok's ammo_and_launcher test
           reads uswapwep to decide whether the arrows are suggested. */
        setuswapwep(obj);
    }
}

// src/u_init.c:1246 u_init_skills_discoveries()
export function u_init_skills_discoveries() {
    for (const otmp of game.invent || [])
        ini_inv_use_obj(otmp);

    /* src/u_init.c:1404 — skill_init(skills_for_role()). Nothing here draws,
       but u.weapon_skills is what percent_success() reads, and without it the
       rnd(100) comparison in spelleffects_check has no input. */
    skill_init(skills_for_role());

    /* src/u_init.c:1408 — if the hero knows any spell, force starting Pw high
       enough to cast a level 1 one. Without this a Priest's uen sits below
       SPELL_LEV_PW(1) and spelleffects_check rejects the cast on energy
       before ever reaching its rnd(100). */
    if (num_spells() && (game.u.uenmax < SPELL_LEV_PW(1))) {
        game.u.uen = game.u.uenmax = game.u.uenpeak = SPELL_LEV_PW(1);
        (game.u.ueninc ||= [])[game.u.ulevel] = SPELL_LEV_PW(1);
    }
}

