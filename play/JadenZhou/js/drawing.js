// drawing.js — default object/monster class symbols.
// C ref: drawing.c — def_oc_syms[], def_monsyms[], def_char_to_objclass(),
// def_char_to_monclass(). Only the .sym fields are kept here.

import * as O from './objects.js';
import { MAXOCLASSES } from './objects.js';
import * as M from './monsters.js';
import { MAXMCLASSES } from './monsters.js';

// C ref: drawing.c def_oc_syms[MAXOCLASSES] (.sym only; objclass.h order)
export const def_oc_syms = [
    '\0', O.ILLOBJ_SYM, O.WEAPON_SYM, O.ARMOR_SYM, O.RING_SYM, O.AMULET_SYM,
    O.TOOL_SYM, O.FOOD_SYM, O.POTION_SYM, O.SCROLL_SYM, O.SPBOOK_SYM,
    O.WAND_SYM, O.GOLD_SYM, O.GEM_SYM, O.ROCK_SYM, O.BALL_SYM, O.CHAIN_SYM,
    O.VENOM_SYM,
];

// C ref: drawing.c def_oc_syms[MAXOCLASSES].explain (defsym.h OBJCLASS())
export const def_oc_explain = [
    "", "strange object", "weapon", "suit or piece of armor", "ring",
    "amulet", "useful item (pick-axe, key, lamp...)", "piece of food",
    "potion", "scroll", "spellbook", "wand", "pile of coins",
    "gem or rock", "boulder or statue", "iron ball", "iron chain",
    "splash of venom",
];

// C ref: drawing.c def_monsyms[MAXMCLASSES] (.sym only; defsym.h order)
export const def_monsyms = [
    '\0', M.DEF_ANT, M.DEF_BLOB, M.DEF_COCKATRICE, M.DEF_DOG, M.DEF_EYE,
    M.DEF_FELINE, M.DEF_GREMLIN, M.DEF_HUMANOID, M.DEF_IMP, M.DEF_JELLY,
    M.DEF_KOBOLD, M.DEF_LEPRECHAUN, M.DEF_MIMIC, M.DEF_NYMPH, M.DEF_ORC,
    M.DEF_PIERCER, M.DEF_QUADRUPED, M.DEF_RODENT, M.DEF_SPIDER, M.DEF_TRAPPER,
    M.DEF_UNICORN, M.DEF_VORTEX, M.DEF_WORM, M.DEF_XAN, M.DEF_LIGHT,
    M.DEF_ZRUTY, M.DEF_ANGEL, M.DEF_BAT, M.DEF_CENTAUR, M.DEF_DRAGON,
    M.DEF_ELEMENTAL, M.DEF_FUNGUS, M.DEF_GNOME, M.DEF_GIANT, M.DEF_INVISIBLE,
    M.DEF_JABBERWOCK, M.DEF_KOP, M.DEF_LICH, M.DEF_MUMMY, M.DEF_NAGA,
    M.DEF_OGRE, M.DEF_PUDDING, M.DEF_QUANTMECH, M.DEF_RUSTMONST, M.DEF_SNAKE,
    M.DEF_TROLL, M.DEF_UMBER, M.DEF_VAMPIRE, M.DEF_WRAITH, M.DEF_XORN,
    M.DEF_YETI, M.DEF_ZOMBIE, M.DEF_HUMAN, M.DEF_GHOST, M.DEF_GOLEM,
    M.DEF_DEMON, M.DEF_EEL, M.DEF_LIZARD, M.DEF_WORM_TAIL, M.DEF_MIMIC_DEF,
];

// C ref: drawing.c def_char_to_objclass()
/*
 * Convert the given character to an object class.  If the character is not
 * recognized, then MAXOCLASSES is returned.
 */
export function def_char_to_objclass(ch) {
    let i;

    for (i = 1; i < MAXOCLASSES; i++)
        if (ch === def_oc_syms[i])
            break;
    return i;
}

// C ref: drawing.c def_char_to_monclass()
/*
 * Convert a character into a monster class.  This returns the _first_
 * match made.  If there are no matches, return MAXMCLASSES.
 */
export function def_char_to_monclass(ch) {
    let i;

    for (i = 1; i < MAXMCLASSES; i++)
        if (ch === def_monsyms[i])
            break;
    return i;
}
