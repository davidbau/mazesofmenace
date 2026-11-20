// spell.js — spellcasting.
// C ref: spell.c
//
// Ported so far: age_spells().

import { game } from './gstate.js';
import { NO_SPELL } from './const.js';
import { MAXSPELL, objects, OBJ_NAME } from './objects.js';

function impossible(msg) { console.error(`impossible: ${msg}`); }

const KEEN = 20000; /* C ref: spell.c */

/* C ref: spell.h spellid(), spellknow(), decrnknow() */
function spellid(spell) { return game.spl_book[spell].sp_id; }
function spellknow(spell) { return game.spl_book[spell].sp_know; }
function decrnknow(spell) { game.spl_book[spell].sp_know--; }
/* C ref: spell.c incrnknow() */
function incrnknow(spell, x) { game.spl_book[spell].sp_know = KEEN + (x); }

// C ref: spell.c age_spells()
export function age_spells() {
    let i;
    /*
     * The time relative to the hero (a pass through move
     * loop) causes all spell knowledge to be decremented.
     * The hero's speed, rest status, conscious status etc.
     * does not alter the loss of memory.
     */
    for (i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++)
        if (spellknow(i))
            decrnknow(i);
    return;
}

// C ref: spell.c initialspell()
/* Learn a spell during creation of the initial inventory */
export function initialspell(obj) {
    let i;
    const otyp = obj.otyp;

    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL || spellid(i) === otyp)
            break;

    if (i === MAXSPELL) {
        impossible("Too many spells memorized!");
    } else if (spellid(i) !== NO_SPELL) {
        /* initial inventory shouldn't contain duplicate spellbooks */
        impossible(`Spell ${OBJ_NAME(objects[otyp])} already known.`);
    } else {
        game.spl_book[i].sp_id = otyp;
        game.spl_book[i].sp_lev = objects[otyp].oc_level;
        incrnknow(i, 0);
    }
    return;
}

// C ref: spell.c num_spells()
export function num_spells() {
    let i;

    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL)
            break;
    return i;
}
