// enlight_misc.js — Small enlightenment fragments not yet tied to a full port.
// C ref: cmd.c (miscellaneous / playtime strings).

/**
 * @param {object} g — game
 * @returns {string} e.g. "  Total elapsed playing time is none."
 */
export function enlightPlaytimeLine(g) {
    const t = g._enlightPlaytime;
    const v = t == null || t === '' ? 'none' : String(t);
    return `  Total elapsed playing time is ${v}.`;
}
