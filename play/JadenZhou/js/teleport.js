// teleport.js — finding spots for monsters near a location.
// C ref: teleport.c — enexto, enexto_gpflags, enexto_core (NEW_ENEXTO),
// collect_coords; mon.c mnexto (via rloc_to_flag).
//
// Not ported yet: teleds, safe_teleds, tele, rloc and the rest of
// teleport.c.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    COLNO, ROWNO, ZAP_POS, isok, GP_ALLOW_XY, GP_CHECKSCARY, NO_MM_FLAGS,
    CC_NO_FLAGS, CC_INCL_CENTER, CC_UNSHUFFLED, CC_RING_PAIRS, CC_SKIP_MONS,
    CC_SKIP_INACCS,
} from './const.js';
import { mons } from './monsters.js';
import { set_mon_data } from './mondata.js';
import { goodpos, m_at, place_monster } from './makemon.js';

// C ref: teleport.c enexto()
/*
 * Attempt to find a good place for the given monster type in the closest
 * position to (xx,yy).  Do so in successive square rings around (xx,yy).
 * If there is more than one valid position in the ring, choose one randomly.
 * Return TRUE and the position chosen when successful, FALSE otherwise.
 */
export function enexto(cc, xx, yy, mdat) {
    return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY)
            || enexto_core(cc, xx, yy, mdat, NO_MM_FLAGS));
}

// C ref: teleport.c enexto_gpflags()
export function enexto_gpflags(cc, xx, yy, mdat, entflags) {
    return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY | entflags)
            || enexto_core(cc, xx, yy, mdat, entflags));
}

// C ref: teleport.c enexto_core() [NEW_ENEXTO]
export function enexto_core(cc, /* output; <cc.x,cc.y> as close as feasible
                                 * to <xx,yy> */
                            xx, yy, /* input coordinates */
                            mdat,   /* type of monster; affects whether water
                                     * or lava or boulder spots will be
                                     * considered */
                            entflags) /* flags for goodpos() */ {
    const candy = []; /* enough room for every location */
    let i, nearcandyct, allcandyct;
    const allow_xx_yy = ((entflags & GP_ALLOW_XY) !== 0);
    /* note: GP_ALLOW_XY isn't used by goodpos(); old enext_core() used to
       mask it off to hide it from goodpos but that isn't required and we
       want to keep it in case the debugpline4() gets called */

    if (!mdat) {
        /* default to player's original monster type */
        mdat = mons[game.u.umonster];
    }
    const fakemon = { data: null, m_id: 0, wormno: 0 }; /* cg.zeromonst */
    set_mon_data(fakemon, mdat); /* set up for goodpos() */

    /* gather candidate coordinates within 3 steps, those 1 step away in
       random order first, then those 2 steps away in random order, then 3;
       this will usually find a good spot without scanning the whole map */
    nearcandyct = collect_coords(candy, xx, yy, 3, CC_NO_FLAGS, null);
    for (i = 0; i < nearcandyct; ++i) {
        cc.x = candy[i].x, cc.y = candy[i].y;
        if (goodpos(cc.x, cc.y, fakemon, entflags))
            return true;
    }

    /* didn't find a spot; gather coordinates for the whole map except
       for <xx,yy> itself, ordered in expanding distance from <xx,yy>
       (subsets of equal distance grouped together with order randomized) */
    candy.length = 0;
    allcandyct = collect_coords(candy, xx, yy, 0, CC_NO_FLAGS, null);
    /* skip first 'nearcandyct' spots, they have already been rejected;
       they will occur in different random order but same overall total */
    for (i = nearcandyct; i < allcandyct; ++i) {
        cc.x = candy[i].x, cc.y = candy[i].y;
        if (goodpos(cc.x, cc.y, fakemon, entflags))
            return true;
    }

    /* still didn't find a spot; maybe try <xx,yy> itself */
    cc.x = xx, cc.y = yy; /* final value for 'cc' in case we return False */
    if (allow_xx_yy && goodpos(cc.x, cc.y, fakemon, entflags))
        return true;

    /* failed to find any acceptable spot */
    return false;
}

// C ref: teleport.c collect_coords()
/* make a list of coordinates in expanding distance from <cx,cy>;
   return value is number of coordinates inserted into ccc[]  */
export function collect_coords(
    ccc,       /* array to fill (C: at least size ROWNO*(COLNO-1)) */
    cx, cy,    /* center point, not necessarily <u.ux,u.uy> */
    maxradius, /* how far from center to go collecting spots;
                * 0 means collect entire map */
    cc_flags,  /* incl_center: put <cx,cy> in output list
                * (provided that it passes filter, if any);
                * unshuffled: keep output in collection order;
                * ring_pairs: shuffle pairs of rings together
                * instead of keeping each ring distinct;
                * skip_mons: reject occupied spots;
                * skip_inaccs: reject !ZAP_POS() spots */
    filter)    /* if Null, no filtering */ {
    let x, y, lox, hix, loy, hiy;
    let radius, rowrange, colrange, k, n = 0;
    let cc, passcc = -1; /* index into ccc[] (C: pointer) */
    let newpass, passend;
    const /* is <cx,cy> a candidate? */
          include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0,
          /* flag is negative; turn local variable into positive */
          scramble = (cc_flags & CC_UNSHUFFLED) === 0,
          /* if scrambling, shuffle rings 1+2, 3+4, &c together */
          ring_pairs = (scramble && (cc_flags & CC_RING_PAIRS) !== 0),
          /* exclude locations containing monsters from output */
          skip_mons = (cc_flags & CC_SKIP_MONS) !== 0,
          /* exclude !ZAP_POS() locations from output; allows pools+lava */
          skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;
    let result = 0;

    rowrange = (cy < Math.trunc(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    colrange = (cx < Math.trunc(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    k = Math.max(rowrange, colrange);
    /* if no radius limit has been specified, cover the whole map */
    if (!maxradius)
        maxradius = k;
    else
        maxradius = Math.min(maxradius, k);

    for (radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            /* 0 (if include_cxcy) and maxradius override odd/even */
            newpass = ((radius % 2) !== 0 || radius === 0); /* odd */
            passend = ((radius % 2) === 0 || radius === maxradius); /* even */
        }
        if (newpass || passcc < 0) {
            passcc = ccc.length; /* start of output entries for current
                                  * radius (or first half of radius pair
                                  * depending on flags) */
            n = 0; /* number of entries for passcc; used for shuffling */
        }
        lox = cx - radius, hix = cx + radius;
        loy = cy - radius, hiy = cy + radius;
        for (y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1)
                break; /* done with collection for current radius */
            for (x = Math.max(lox, 1); x <= hix; ++x) { /* column 0 is not
                                                         * used */
                if (x > COLNO - 1)
                    break; /* advance to next 'y' */
                if (x !== lox && x !== hix && y !== loy && y !== hiy)
                    continue; /* not any edge of ring/square */
                if ((skip_mons && m_at(x, y))
                    /* note: !ACCESSIBLE() would reject water and lava;
                       !ZAP_POS() accepts them; caller needs to handle such */
                    || (skip_inaccessible && !ZAP_POS(game.level.at(x, y).typ)))
                    continue; /* quick filters */
                if (filter && !filter(x, y))
                    continue;
                ccc.push({ x, y });
                ++n;
                ++result;
            }
        }
        if (scramble && passend) {
            /* shuffle entries gathered for current radius (or pair) */
            while (n > 1) {
                k = rn2(n); /* 0..n-1 */
                if (k) { /* swap [k] with [0] when k is 1..n-1 */
                    cc = ccc[passcc];
                    ccc[passcc] = ccc[passcc + k];
                    ccc[passcc + k] = cc;
                }
                ++passcc; /* passcc[0] has reached its final place    */
                --n;      /* and become exempt from further shuffling */
            }
        }
    } /* radius loop */
    return result;
}

// C ref: mon.c mnexto()
/* make monster mtmp next to you (if possible);
   might place monst on far side of a wall or boulder */
export function mnexto(mtmp, rlocflags) {
    const mm = { x: 0, y: 0 };
    const u = game.u;

    if (mtmp === u.usteed) {
        /* Keep your steed in sync with you instead */
        mtmp.mx = u.ux;
        mtmp.my = u.uy;
        return;
    }

    if (!enexto(mm, u.ux, u.uy, mtmp.data) || !isok(mm.x, mm.y)) {
        /* deal_with_overcrowding(mtmp): not ported yet */
        return;
    }
    /* iflags.mon_telecontrol: wizard mode only, not ported */

    rloc_to_flag(mtmp, mm.x, mm.y, rlocflags);
    return;
}

// C ref: teleport.c rloc_to_flag()
// Only the map bookkeeping is ported; display updates, steed/ustuck
// handling and the relocation messages are not ported yet.
function rloc_to_flag(mtmp, x, y, rlocflags) {
    mtmp.mx = x;
    mtmp.my = y;
    place_monster(mtmp, x, y); /* put monster down */
}
