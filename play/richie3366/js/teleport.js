// teleport.js — Placement helpers for makemon/makedog.
// C ref: teleport.c — collect_coords, enexto_core (NEW_ENEXTO), goodpos (partial).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    COLNO, ROWNO,
    CC_NO_FLAGS, CC_INCL_CENTER, CC_UNSHUFFLED, CC_RING_PAIRS,
    CC_SKIP_MONS, CC_SKIP_INACCS,
    GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, GP_ALLOW_XY,
    MM_IGNOREWATER, MM_IGNORELAVA,
    ACCESSIBLE, IS_POOL, IS_LAVA, ZAP_POS,
} from './const.js';

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

function u_at(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

function m_at(x, y) {
    const list = game.fmon || [];
    for (const m of list) {
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

// C ref: teleport.c goodpos() — enough for little_dog / kitten on room floor
export function goodpos(x, y, mtmp, gpflags = 0) {
    if (!isok(x, y)) return false;
    const allow_u = (gpflags & GP_ALLOW_U) !== 0;
    const avoid_monpos = (gpflags & GP_AVOID_MONPOS) !== 0;
    const ignorewater = (gpflags & MM_IGNOREWATER) !== 0;
    const ignorelava = (gpflags & MM_IGNORELAVA) !== 0;

    if (!allow_u && u_at(x, y)) return false;
    if (avoid_monpos && m_at(x, y)) return false;

    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;

    if (IS_POOL(typ) && !ignorewater) return false;
    if (IS_LAVA(typ) && !ignorelava) return false;
    if (!ACCESSIBLE(typ)) return false;
    return true;
}

// C ref: teleport.c collect_coords()
export function collect_coords(ccc, cx, cy, maxradius, cc_flags, filter) {
    let n = 0;
    let result = 0;
    let passcc = null;

    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = scramble && (cc_flags & CC_RING_PAIRS) !== 0;
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;

    const rowrange = (cy < ROWNO / 2) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < COLNO / 2) ? (COLNO - 1 - cx) : cx;
    let k = Math.max(rowrange, colrange);
    if (!maxradius) maxradius = k;
    else maxradius = Math.min(maxradius, k);

    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            newpass = ((radius % 2) !== 0 || radius === 0);
            passend = ((radius % 2) === 0 || radius === maxradius);
        }
        if (newpass || !passcc) {
            passcc = { base: result, n: 0 }; // track slice start in ccc
            n = 0;
        }
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; ++x) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                if (skip_mons && m_at(x, y)) continue;
                const loc = game.level?.at(x, y);
                if (skip_inaccessible && loc && !ZAP_POS(loc.typ)) continue;
                if (filter && !filter(x, y)) continue;
                ccc.push({ x, y });
                ++n;
                ++result;
                if (passcc) passcc.n = n;
            }
        }
        if (scramble && passend) {
            // Shuffle entries gathered for current radius (or pair)
            // C: passcc points at start of this pass's entries
            const start = result - n;
            let nn = n;
            let off = start;
            while (nn > 1) {
                const kk = rn2(nn);
                if (kk) {
                    const tmp = ccc[off];
                    ccc[off] = ccc[off + kk];
                    ccc[off + kk] = tmp;
                }
                ++off;
                --nn;
            }
        }
    }
    return result;
}

// C ref: teleport.c enexto_core (NEW_ENEXTO)
export function enexto_core(cc, xx, yy, mdat, entflags) {
    const candy = [];
    const allow_xx_yy = (entflags & GP_ALLOW_XY) !== 0;
    const fakemon = { data: mdat, mx: 0, my: 0, wormno: 0 };

    const nearcandyct = collect_coords(candy, xx, yy, 3, CC_NO_FLAGS, null);
    for (let i = 0; i < nearcandyct; ++i) {
        cc.x = candy[i].x;
        cc.y = candy[i].y;
        if (goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    }

    const allStart = candy.length;
    const allcandyct = collect_coords(candy, xx, yy, 0, CC_NO_FLAGS, null);
    // nearcandyct spots already rejected (different order, same total)
    for (let i = nearcandyct; i < allcandyct; ++i) {
        // allcandyct is count from second collect which appended; indices from allStart
        const spot = candy[allStart + (i - nearcandyct)];
        if (!spot) continue;
        cc.x = spot.x;
        cc.y = spot.y;
        if (goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    }

    cc.x = xx;
    cc.y = yy;
    if (allow_xx_yy && goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    return false;
}

export function enexto(cc, xx, yy, mdat) {
    return enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY)
        || enexto_core(cc, xx, yy, mdat, 0);
}

// C ref: teleport.c enexto_gpflags()
export function enexto_gpflags(cc, xx, yy, mdat, entflags) {
    return enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY | entflags)
        || enexto_core(cc, xx, yy, mdat, entflags);
}
