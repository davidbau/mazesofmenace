// polyself.js — the hero's polymorphed form.
// C ref: src/polyself.c
//
// Only poly_gender() so far. It arrived because could_seduce() needs it, not
// because polymorph is ported: the hero is never polymorphed yet, so this
// reads the ordinary starting form and gives the ordinary answer.

import { game } from './gstate.js';
import { is_neuter, humanoid } from './mondata.js';

// src/polyself.c:2149 poly_gender() — the polymorphed hero's gender.
// 0 and 1 mean what flags.female means; 2 is none.
//
// Note the !humanoid() term, which gender() does NOT have: a hero polymorphed
// into a non-humanoid reads as genderless even when the underlying form has a
// gender.
export function poly_gender() {
    const data = game.youmonst?.data;
    if (!data)
        return game.flags?.female ? 1 : 0;
    if (is_neuter(data) || !humanoid(data))
        return 2;
    return game.flags?.female ? 1 : 0;
}
