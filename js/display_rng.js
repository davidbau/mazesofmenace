// display_rng.js -- Display-only RNG glyph helpers.
// C ref: display.h random_monster/random_object + what_mon/what_obj macros.

import { rn2_on_display_rng } from './rng.js';
import { mons } from './monsters.js';
import { objectData } from './objects.js';
import { def_monsyms } from './symbols.js';

function randomMonsterGlyph() {
    if (!Array.isArray(mons) || mons.length === 0) {
        return { ch: '?', color: 7 };
    }
    const idx = rn2_on_display_rng(mons.length);
    const mon = mons[idx] || {};
    const symIdx = Number.isInteger(mon.symbol) ? mon.symbol : 0;
    const sym = def_monsyms[symIdx]?.sym || '?';
    const color = Number.isInteger(mon.color) ? mon.color : 7;
    return { ch: sym, color };
}

function randomObjectGlyph() {
    // C random_object() skips the "strange object" slot.
    const firstObject = 1;
    const count = Math.max(0, (objectData?.length || 0) - firstObject);
    if (count <= 0) return { ch: '?', color: 7 };
    const idx = rn2_on_display_rng(count) + firstObject;
    const obj = objectData[idx] || {};
    const ch = obj.symbol || '?';
    const color = Number.isInteger(obj.color) ? obj.color : 7;
    return { ch, color };
}

export function monsterMapGlyph(mon, hallucinating = false) {
    if (hallucinating) return randomMonsterGlyph();
    return {
        ch: mon?.displayChar || '?',
        color: Number.isInteger(mon?.displayColor) ? mon.displayColor : 7,
    };
}

export function objectMapGlyph(obj, hallucinating = false) {
    if (hallucinating) return randomObjectGlyph();
    return {
        ch: obj?.displayChar || '?',
        color: Number.isInteger(obj?.displayColor) ? obj.displayColor : 7,
    };
}

