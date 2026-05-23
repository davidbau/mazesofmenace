// collect_coords.js — C teleport.c collect_coords() (NEW_ENEXTO ring shuffle).
// C ref: teleport.c collect_coords(); hack.h CC_* flags.

import { COLNO, ROWNO, ZAP_POS } from './const.js';
import { rn2 } from './rng.js';

/** C: hack.h */
export const CC_NO_FLAGS = 0x00;
export const CC_INCL_CENTER = 0x01;
export const CC_UNSHUFFLED = 0x02;
export const CC_RING_PAIRS = 0x04;
export const CC_SKIP_MONS = 0x08;
export const CC_SKIP_INACCS = 0x10;

/**
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 */
function mAtLikeC(g, x, y) {
    const mons = g.level?.monsters;
    if (!mons) return false;
    for (const m of mons) {
        if ((m.mx | 0) === x && (m.my | 0) === y) return true;
    }
    return false;
}

/**
 * C: teleport.c collect_coords — expanding rings from (cx,cy), optional shuffle.
 * @param {{ x: number, y: number }[]} ccc — output buffer (at least ROWNO*(COLNO-1))
 * @param {number} cx
 * @param {number} cy
 * @param {number} maxradius — 0 = whole map
 * @param {number} ccFlags
 * @param {((x: number, y: number) => boolean) | null} filter
 * @param {import('./gstate.js').game} g
 * @returns {number} count written to ccc
 */
export function collectCoordsLikeC(ccc, cx, cy, maxradius, ccFlags, filter, g) {
    const includeCxcy = (ccFlags & CC_INCL_CENTER) !== 0;
    const scramble = (ccFlags & CC_UNSHUFFLED) === 0;
    const ringPairs = scramble && (ccFlags & CC_RING_PAIRS) !== 0;
    const skipMons = (ccFlags & CC_SKIP_MONS) !== 0;
    const skipInaccessible = (ccFlags & CC_SKIP_INACCS) !== 0;

    const rowrange = cy < (ROWNO / 2) ? ROWNO - 1 - cy : cy;
    const colrange = cx < (COLNO / 2) ? COLNO - 1 - cx : cx;
    let k = Math.max(rowrange, colrange);
    let radiusLimit = maxradius | 0;
    if (!radiusLimit) radiusLimit = k;
    else radiusLimit = Math.min(radiusLimit, k);

    let out = 0;
    let passcc = 0;
    let n = 0;

    for (let radius = includeCxcy ? 0 : 1; radius <= radiusLimit; radius++) {
        let newpass;
        let passend;
        if (!ringPairs) {
            newpass = true;
            passend = true;
        } else {
            newpass = (radius % 2) !== 0 || radius === 0;
            passend = (radius % 2) === 0 || radius === radiusLimit;
        }
        if (newpass || passcc === 0) {
            passcc = out;
            n = 0;
        }
        const lox = cx - radius;
        const hix = cx + radius;
        const loy = cy - radius;
        const hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                if (skipMons && mAtLikeC(g, x, y)) continue;
                const loc = g.level?.at(x, y);
                if (skipInaccessible && (!loc || !ZAP_POS(loc.typ | 0))) continue;
                if (filter && !filter(x, y)) continue;
                ccc[out] = { x, y };
                out++;
                n++;
            }
        }
        if (scramble && passend) {
            let pc = passcc;
            while (n > 1) {
                const pick = rn2(n);
                if (pick) {
                    const tmp = ccc[pc];
                    ccc[pc] = ccc[pc + pick];
                    ccc[pc + pick] = tmp;
                }
                pc++;
                n--;
            }
        }
    }
    return out;
}
