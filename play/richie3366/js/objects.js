// objects.js — Object class table and constants.
// C ref: objects.c / objects.h / objclass.h
//
// Data is generated from upstream headers (js/generated/objects_data.js).

import { game } from './gstate.js';
import { P_AXE, P_PICK_AXE, P_DAGGER, P_SHORT_SWORD, P_SABER, P_SHURIKEN, P_BOW, P_SPEAR } from './const.js';
import {
    createObjectsArray,
    NUM_OBJECTS,
    MAXOCLASSES,
    WEAPON_CLASS,
    ARMOR_CLASS,
    TOOL_CLASS,
} from './generated/objects_data.js';
import { ART_GRIMTOOTH } from './generated/artifacts_data.js';

export {
    MAXOCLASSES,
    NUM_OBJECTS,
    FIRST_OBJECT,
    LAST_GENERIC,
    TURQUOISE,
    AQUAMARINE,
    FLUORITE,
    SAPPHIRE,
    DIAMOND,
    EMERALD,
    WAN_NOTHING,
    POT_WATER,
    HELMET,
    HELM_OF_TELEPATHY,
    LEATHER_GLOVES,
    GAUNTLETS_OF_DEXTERITY,
    CLOAK_OF_PROTECTION,
    CLOAK_OF_DISPLACEMENT,
    SPEED_BOOTS,
    LEVITATION_BOOTS,
    FIRST_REAL_GEM,
    LAST_REAL_GEM,
    RANDOM_CLASS,
    ILLOBJ_CLASS,
    WEAPON_CLASS,
    ARMOR_CLASS,
    RING_CLASS,
    AMULET_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    SPBOOK_CLASS,
    WAND_CLASS,
    COIN_CLASS,
    GEM_CLASS,
    ROCK_CLASS,
    BALL_CLASS,
    CHAIN_CLASS,
    VENOM_CLASS,
    NODIR,
    IMMEDIATE,
    RAY,
    objectNames,
    objectNameStrs,
    objectDescrs,
} from './generated/objects_data.js';

/** Install a fresh objects[] on game state (C: objects_globals_init). */
export function objects_globals_init() {
    game.objects = createObjectsArray();
    game.bases = new Array(MAXOCLASSES + 2).fill(0);
    game.oclass_prob_totals = new Array(MAXOCLASSES).fill(0);
}

export function objects() {
    return game.objects;
}

/**
 * C drawing.c `def_oc_syms[MAXOCLASSES]` (`defsym.h` OBJCLASS_DRAWING).
 * Index is `enum objclass_classes` (RANDOM=0 … VENOM=17).
 * BALL_CLASS (15) `sym` is `'0'` — tty group accelerator vs count digit
 * (`wintty.c` `process_menu_window` `!counting && strchr(gacc,'0')`).
 */
export const def_oc_syms = [
    { sym: '\0', name: '', explain: '' },
    { sym: ']', name: 'illegal objects', explain: 'strange object' },
    { sym: ')', name: 'weapons', explain: 'weapon' },
    { sym: '[', name: 'armor', explain: 'suit or piece of armor' },
    { sym: '=', name: 'rings', explain: 'ring' },
    { sym: '"', name: 'amulets', explain: 'amulet' },
    { sym: '(', name: 'tools', explain: 'useful item (pick-axe, key, lamp...)' },
    { sym: '%', name: 'food', explain: 'piece of food' },
    { sym: '!', name: 'potions', explain: 'potion' },
    { sym: '?', name: 'scrolls', explain: 'scroll' },
    { sym: '+', name: 'spellbooks', explain: 'spellbook' },
    { sym: '/', name: 'wands', explain: 'wand' },
    { sym: '$', name: 'coins', explain: 'pile of coins' },
    { sym: '*', name: 'rocks', explain: 'gem or rock' },
    { sym: '`', name: 'large stones', explain: 'boulder or statue' },
    { sym: '0', name: 'iron balls', explain: 'iron ball' },
    { sym: '_', name: 'chains', explain: 'iron chain' },
    { sym: '.', name: 'venoms', explain: 'splash of venom' },
];

/**
 * C drawing.c def_char_to_objclass — first def_oc_syms[].sym; else MAXOCLASSES.
 */
export function def_char_to_objclass(ch) {
    const c = typeof ch === 'string' ? ch.charAt(0) : String.fromCharCode(ch);
    let i;
    for (i = 1; i < MAXOCLASSES; i++) {
        if (def_oc_syms[i].sym === c) break;
    }
    return i;
}

/** C objclass.h enum obj_material_types — dmgval leather/silver gates. */
export const LEATHER = 7;
export const SILVER = 14;

/**
 * C obj.h is_axe — WEAPON/TOOL with P_AXE skill. Canonical home; the
 * apply/dig/dothrow/monmove locals import this instead of cloning.
 */
export function is_axe(otmp) {
    if (!otmp) return false;
    if (otmp.oclass !== WEAPON_CLASS && otmp.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[otmp.otyp]?.oc_skill | 0) === P_AXE;
}

/**
 * C obj.h is_pick — WEAPON/TOOL with P_PICK_AXE skill. Canonical home;
 * mfndpos ALLOW_DIG uses this (monmove/dig/apply keep file-local clones).
 */
export function is_pick(otmp) {
    if (!otmp) return false;
    if (otmp.oclass !== WEAPON_CLASS && otmp.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[otmp.otyp]?.oc_skill | 0) === P_PICK_AXE;
}

/**
 * C obj.h is_spear — WEAPON_CLASS with P_SPEAR skill. Canonical home;
 * dothrow/u_init keep file-local clones (named debt).
 */
export function is_spear(otmp) {
    if (!otmp || otmp.oclass !== WEAPON_CLASS) return false;
    return (game.objects?.[otmp.otyp]?.oc_skill | 0) === P_SPEAR;
}

/**
 * C ref: obj.h is_sword — WEAPON_CLASS && oc_skill in
 * P_SHORT_SWORD..P_SABER (short / broad / long / two-handed / saber).
 */
export function is_sword(otmp) {
    if (!otmp || otmp.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[otmp.otyp]?.oc_skill | 0;
    return sk >= P_SHORT_SWORD && sk <= P_SABER;
}

/**
 * C obj.h is_blade — WEAPON_CLASS && P_DAGGER..P_SABER oc_skill.
 */
export function is_blade(otmp) {
    if (!otmp || otmp.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[otmp.otyp]?.oc_skill | 0;
    return sk >= P_DAGGER && sk <= P_SABER;
}

/**
 * C obj.h is_multigen — WEAPON_CLASS && oc_skill in -P_SHURIKEN..-P_BOW
 * (arrows, bolts, darts, shuriken). Not a name list (D-0012).
 */
export function is_multigen(otmp) {
    if (!otmp || otmp.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[otmp.otyp]?.oc_skill | 0;
    return sk >= -P_SHURIKEN && sk <= -P_BOW;
}

/**
 * C obj.h is_poisonable — same missile skill window as is_multigen, or
 * permapoisoned (artifact.c :2836–2840, currently Grimtooth). Direct
 * oartifact compare so this module does not import artifact.js (cycle).
 */
export function is_poisonable(otmp) {
    return is_multigen(otmp)
        || !!(otmp && (otmp.oartifact | 0) === ART_GRIMTOOTH);
}

/** C objclass.h ARM_BOOTS; objects[] stores oc_armcat in oc_skill. */
const ARM_BOOTS = 4;

/** C obj.h is_boots — ARMOR_CLASS && oc_armcat == ARM_BOOTS. */
export function is_boots(otmp) {
    if (!otmp || otmp.oclass !== ARMOR_CLASS) return false;
    return (game.objects?.[otmp.otyp]?.oc_skill | 0) === ARM_BOOTS;
}
