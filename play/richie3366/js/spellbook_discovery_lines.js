// spellbook_discovery_lines.js — #discoveries lines from skill_based_spellbook_id state.
// C ref: invent.c / discover_object appearance text; spell.c skill_based_spellbook_id.

import { SPELLBOOK_SKILL_LEVEL_ROWS } from './spellbook_skill_level_data.js';

/** @type {Map<number, string>} */
export const SPELLBOOK_OTYP_TO_SN = new Map(SPELLBOOK_SKILL_LEVEL_ROWS.map((r) => [r.otyp, r.sn]));

/** @param {number} otyp */
export function isSpellbookOtyp(otyp) {
    return SPELLBOOK_OTYP_TO_SN.has(otyp | 0);
}

/**
 * Noun phrase for a spellbook appearance (no leading article).
 * @param {number} otyp
 * @returns {string|null}
 */
export function spellbookAppearanceNounPhrase(otyp) {
    const sn = SPELLBOOK_OTYP_TO_SN.get(otyp | 0);
    if (!sn) return null;
    if (sn === 'SPE_BLANK_PAPER') return 'plain spellbook';
    const base = sn
        .replace(/^SPE_/, '')
        .toLowerCase()
        .replace(/_/g, ' ');
    return `spellbook of ${base}`;
}

/**
 * @param {string} sn — enum name e.g. SPE_FORCE_BOLT
 * @returns {string|null}
 */
export function formatSpellbookDiscoveryLine(sn) {
    if (!sn || sn === 'SPE_BLANK_PAPER') return null;
    const base = sn
        .replace(/^SPE_/, '')
        .toLowerCase()
        .replace(/_/g, ' ');
    return `  spellbook of ${base}`;
}

/**
 * Sorted discovery strings for otyps in `g.objectDiscovery` (Set<number>).
 * @param {object} g
 * @returns {string[]}
 */
export function spellbookDiscoveryLinesFromObjectDiscovery(g) {
    const disc = g?.objectDiscovery;
    if (!disc || disc.size === 0) return [];
    const pairs = [];
    for (const otyp of disc) {
        const sn = SPELLBOOK_OTYP_TO_SN.get(otyp | 0);
        const ln = sn && formatSpellbookDiscoveryLine(sn);
        if (ln) pairs.push({ otyp: otyp | 0, ln });
    }
    pairs.sort((a, b) => a.otyp - b.otyp);
    return pairs.map((p) => p.ln);
}

/**
 * Merge spellbook appearance lines into static `discoveryGroups` (dedupe by line text).
 * @param {Array<{ title: string, lines: string[] }>} groups
 * @param {object} g
 * @returns {Array<{ title: string, lines: string[] }>}
 */
export function mergeSpellbookObjectDiscoveryIntoGroups(groups, g) {
    const extra = spellbookDiscoveryLinesFromObjectDiscovery(g);
    if (extra.length === 0) return groups;

    const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const seen = new Set();
    const ix = groups.findIndex((x) => x.title === 'Spellbooks');
    if (ix >= 0) {
        const g0 = groups[ix];
        const lines = [...g0.lines];
        for (const s of lines) seen.add(norm(s));
        for (const ln of extra) {
            const k = norm(ln);
            if (!seen.has(k)) {
                seen.add(k);
                lines.push(ln);
            }
        }
        const out = groups.slice();
        out[ix] = { title: g0.title, lines };
        return out;
    }
    return [...groups, { title: 'Spellbooks', lines: extra }];
}
