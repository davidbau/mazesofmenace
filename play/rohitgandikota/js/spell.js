// spell.js — spellcasting.
// C ref: src/spell.c

import { game } from './gstate.js';
import { pline } from './display.js';
import { ECMD_OK } from './invent.js';

// src/spell.c — NO_SPELL sentinel and the spell list accessor.
const NO_SPELL = 0;

// src/spell.c spellid() — the spell in slot `spidx`, or NO_SPELL.
export function spellid(spidx) {
    const sp = game.spl_book?.[spidx];
    return sp ? sp.sp_id : NO_SPELL;
}

// src/spell.c:2024 dovspell() — '+', list known spells.
// Only the "no spells" path is ported; the menu path lands with the tty menu
// system. A Tourist starts with no spells, which is the case seed8000 hits.
export async function dovspell() {
    if (spellid(0) === NO_SPELL) {
        await pline("You don't know any spells right now.");
    }
    return ECMD_OK;
}
