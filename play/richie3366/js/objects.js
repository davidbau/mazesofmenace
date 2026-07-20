// objects.js — Object class table and constants.
// C ref: objects.c / objects.h / objclass.h
//
// Data is generated from upstream headers (js/generated/objects_data.js).

import { game } from './gstate.js';
import {
    createObjectsArray,
    NUM_OBJECTS,
    MAXOCLASSES,
} from './generated/objects_data.js';

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
