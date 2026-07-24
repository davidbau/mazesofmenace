// teleport.js — position finding.
// C ref: src/teleport.c
//
// Only the pieces level generation and pet placement need are here:
// collect_coords() and enexto()/enexto_core().
//
// collect_coords() is a bigger PRNG consumer than it looks. It walks expanding
// square "rings" around a centre and shuffles each ring, drawing rn2(n) once
// per remaining entry — so a full ring of radius 1 costs 7 draws, radius 2
// costs 15, radius 3 costs 23. With CC_NO_FLAGS there is no filtering at all,
// so the counts are pure geometry clamped to the map edges: that is exactly the
// rn2(8) rn2(7) … rn2(2) rn2(16) rn2(15) … run the recordings show when a pet
// is placed.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { COLNO, ROWNO } from './const.js';

// include/hack.h:1204-1210
export const CC_NO_FLAGS = 0x00;
export const CC_INCL_CENTER = 0x01;
export const CC_UNSHUFFLED = 0x02;
export const CC_RING_PAIRS = 0x04;
export const CC_SKIP_MONS = 0x08;
export const CC_SKIP_INACCS = 0x10;

// include/hack.h:1170
export const GP_ALLOW_XY = 0x00200000;

// src/teleport.c:578 collect_coords()
//
// Returns an array of {x, y}. `maxradius` of 0 means "cover the whole map".
export function collect_coords(cx, cy, maxradius, cc_flags, filter) {
    const out = [];
    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = (scramble && (cc_flags & CC_RING_PAIRS) !== 0);
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;

    const rowrange = (cy < Math.trunc(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.trunc(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    let k = Math.max(rowrange, colrange);
    maxradius = !maxradius ? k : Math.min(maxradius, k);

    /* index in `out` where the current ring (or ring pair) starts, and how
       many entries it has — C tracks these as passcc and n */
    let passStart = 0, n = 0;
    let havePass = false;

    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            newpass = ((radius % 2) !== 0 || radius === 0);
            passend = ((radius % 2) === 0 || radius === maxradius);
        }
        if (newpass || !havePass) {
            passStart = out.length;
            n = 0;
            havePass = true;
        }

        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1)
                break;                       /* done with this radius */
            for (let x = Math.max(lox, 1); x <= hix; ++x) {
                if (x > COLNO - 1)
                    break;                   /* advance to next y */
                if (x !== lox && x !== hix && y !== loy && y !== hiy)
                    continue;                /* not on the ring's edge */
                if ((skip_mons && m_at(x, y))
                    || (skip_inaccessible && !ZAP_POS(x, y)))
                    continue;
                if (filter && !filter(x, y))
                    continue;
                out.push({ x, y });
                ++n;
            }
        }

        if (scramble && passend) {
            /* selection shuffle over the ring's entries: one rn2 per entry
               still in play, counting down */
            let p = passStart;
            while (n > 1) {
                k = rn2(n);                  /* 0..n-1 */
                if (k) {
                    const tmp = out[p];
                    out[p] = out[p + k];
                    out[p + k] = tmp;
                }
                ++p;
                --n;
            }
        }
    }
    return out;
}

function m_at(x, y) {
    return game.level?.monAt?.get(`${x},${y}`) ?? null;
}

// include/rm.h ZAP_POS() — accepts pools and lava, rejects rock and walls.
function ZAP_POS(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && loc.typ >= 16 /* POOL */;
}

// src/teleport.c:735 enexto_core() — a spot as close to <xx,yy> as feasible.
//
// Two collect_coords() passes: radius 3 first, then the whole map. The second
// pass re-collects and therefore re-shuffles the near rings, so its draw count
// includes them again even though the caller skips those entries.
export function enexto_core(cc, xx, yy, mdat, entflags, goodpos) {
    const allow_xx_yy = (entflags & GP_ALLOW_XY) !== 0;

    const near = collect_coords(xx, yy, 3, CC_NO_FLAGS, null);
    for (const c of near) {
        if (goodpos(c.x, c.y, mdat, entflags)) {
            cc.x = c.x; cc.y = c.y;
            return true;
        }
    }

    const all = collect_coords(xx, yy, 0, CC_NO_FLAGS, null);
    for (let i = near.length; i < all.length; ++i) {
        if (goodpos(all[i].x, all[i].y, mdat, entflags)) {
            cc.x = all[i].x; cc.y = all[i].y;
            return true;
        }
    }

    cc.x = xx; cc.y = yy;
    return allow_xx_yy && goodpos(xx, yy, mdat, entflags);
}
