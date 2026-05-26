// nhl_montype.js — `find_montype`-style string → **`mndx`** for des / NHL (minetn subset + grow).
// C ref: sp_lev.c `find_montype` / `monsters.h` MON order (same as **`mons_rndmonst_ini_inv_data.js`** index).

/** @type {Record<string, number>} */
export const SPLEVMON_NAME_TO_MNUM = Object.freeze({
    goblin: 69,
    orc: 71,
    'hill orc': 72,
    'Mordor orc': 73,
    'Uruk-hai': 74,
    'orc shaman': 75,
    'orc-captain': 76,
    shopkeeper: 267,
    watchman: 276,
    'watch captain': 277,
    'aligned cleric': 281,
});

/**
 * @param {string} s
 * @returns {number} mndx or **`-1`**
 */
export function splevMontypeNameToMnumLikeC(s) {
    const k = String(s ?? '').trim().toLowerCase();
    for (const [name, mnum] of Object.entries(SPLEVMON_NAME_TO_MNUM)) {
        if (name.toLowerCase() === k) return mnum | 0;
    }
    return -1;
}
