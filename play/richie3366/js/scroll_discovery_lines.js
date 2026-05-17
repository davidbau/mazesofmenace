// scroll_discovery_lines.js — #discoveries lines from `g.scrollDiscovery` (Set<otyp>).
// C ref: invent.c list patterns; cmd.c #discoveries (parallel to spellbook_discovery_lines.js).

import { scrollAppearanceFromOtyp } from './objnam.js';

/**
 * Sorted discovery strings for otyps in **`g.scrollDiscovery`**.
 * @param {object} g
 * @returns {string[]}
 */
export function scrollDiscoveryLinesFromScrollDiscovery(g) {
    const disc = g?.scrollDiscovery;
    if (!(disc instanceof Set) || disc.size === 0) return [];
    const otyps = [...disc].map((x) => x | 0).sort((a, b) => a - b);
    return otyps.map((otyp) => `  scroll of ${scrollAppearanceFromOtyp(otyp)}`);
}

/**
 * Merge scroll appearance lines into static **`discoveryGroups`** (dedupe by line text).
 * @param {Array<{ title: string, lines: string[] }>} groups
 * @param {object} g
 * @returns {Array<{ title: string, lines: string[] }>}
 */
export function mergeScrollDiscoveryIntoGroups(groups, g) {
    const extra = scrollDiscoveryLinesFromScrollDiscovery(g);
    if (extra.length === 0) return groups;

    const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const seen = new Set();
    const ix = groups.findIndex((x) => x.title === 'Scrolls');
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
    return [...groups, { title: 'Scrolls', lines: extra }];
}
