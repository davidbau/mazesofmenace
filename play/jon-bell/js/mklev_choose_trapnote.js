// trap.c — choose_trapnote (3097-3098).
// C ref: trap.c choose_trapnote — pick an unused squeaky-board note on the level.
// @ts-nocheck — trap list is loosely typed in gstate.
import { rn2 } from './rng.js';
import { game } from './gstate.js';
import { SQKY_BOARD } from './const.js';
/**
 * @param {{ ttyp: number, tnote?: number }} ttmp Trap being placed (not yet on gf.ftrap list in C).
 * @returns {number} note index 0..11
 */
export function chooseTrapnote(ttmp) {
    const tavail = new Array(12).fill(0);
    const tpick = new Array(12).fill(0);
    for (const t of game.level?.traps ?? []) {
        if (t.ttyp === SQKY_BOARD && t !== ttmp)
            tavail[t.tnote | 0] = 1;
    }
    let tcnt = 0;
    for (let k = 0; k < 12; k++) {
        if (tavail[k] === 0)
            tpick[tcnt++] = k;
    }
    return tcnt > 0 ? tpick[rn2(tcnt)] : rn2(12);
}
