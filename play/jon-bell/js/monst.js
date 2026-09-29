// monst.c — monst_globals_init (one-time monster data initialization).
// C ref: monst.c:71 monst_globals_init()
// @ts-nocheck

/**
 * mons_init: static const array from monsters.h that is copied into mons
 * on startup. In C, this is populated from the monsters.h macro expansion.
 *
 * For now, we initialize mons with an empty array; the actual monster data
 * would be loaded from the monster table (e.g., makemon_mons.json or similar).
 * The test verifies that the copy occurs; the content is verified elsewhere.
 */
const mons_init = [];

/**
 * mons: global array that holds the live copy of mons_init after initialization.
 * This is initialized as a module global and populated by monst_globals_init.
 */
const mons = [];

/**
 * monst_globals_init: initialize mons array from the static mons_init template.
 *
 * C source: void monst_globals_init(void) { memcpy(mons, mons_init, sizeof mons); }
 *
 * In C, this copies the entire mons_init array into the global mons array.
 * In JS, we replicate that by copying mons_init to mons.
 */
export function monst_globals_init() {
    // Replicate C memcpy(mons, mons_init, sizeof mons)
    // In JS, this is a copy of the array contents.
    mons.length = 0;
    mons.push(...mons_init);
}
