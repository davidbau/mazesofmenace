// skill_based_spellbook.js — wizard starting spellbook appearance knowledge.
// C ref: spell.c skill_based_spellbook_id() (called from weapon.c skill_init).

import {
    P_NONE,
    P_UNSKILLED,
    P_BASIC,
    P_SKILLED,
    P_EXPERT,
    P_MASTER,
    P_GRAND_MASTER,
    P_ISRESTRICTED,
} from './const.js';
import { SPELLBOOK_SKILL_LEVEL_ROWS } from './spellbook_skill_level_data.js';

/**
 * C: spell.c skill_based_spellbook_id — discover_object(book, TRUE, FALSE, FALSE)
 * for spellbooks whose difficulty is at or below the hero's nominal knowledge
 * for that spell school. Paupers (`u.uroleplay.pauper`) not modeled → non-pauper.
 *
 * Records discovered spellbook otyps on `g.objectDiscovery` (Set<number>) for
 * future invent / #discoveries wiring; does not exercise Wisdom.
 * @param {object} g — game bag
 */
export function applySkillBasedSpellbookId(g) {
    if (g.urole?.abbr !== 'Wiz') return;
    const u = g.u;
    if (!u?.weapon_skills) return;

    if (!g.objectDiscovery) g.objectDiscovery = new Set();

    for (const row of SPELLBOOK_SKILL_LEVEL_ROWS) {
        const { otyp, skill, oc_level } = row;
        if (skill === P_NONE) continue;

        const ps = u.weapon_skills[skill]?.skill ?? P_ISRESTRICTED;
        let knownUpTo;
        switch (ps) {
            case P_BASIC:
                knownUpTo = 3;
                break;
            case P_SKILLED:
                knownUpTo = 5;
                break;
            case P_EXPERT:
            case P_MASTER:
            case P_GRAND_MASTER:
                knownUpTo = 7;
                break;
            case P_UNSKILLED:
            case P_ISRESTRICTED:
            default:
                knownUpTo = 1; /* C: !pauper */
                break;
        }

        if (oc_level <= knownUpTo) g.objectDiscovery.add(otyp);
    }
}
