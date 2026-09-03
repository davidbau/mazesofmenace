// worm.js — long worm tails.
// C ref: src/worm.c
//
// Only the creation path is here: what a long worm spends from the stream
// when makemon builds one (the tail segments and their random placement).
// Worm movement, cutting and hp bookkeeping are recorded when reached.

import { You } from './pline.js';
import { Monnam } from './do_name.js';
import { mon_nam } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { pline } from './display.js';
import { canspotmon } from './display.js';
import { d } from './rng.js';
import { rnd } from './rng.js';
import { clone_mon } from './makemon.js';
import { remove_monster } from './makemon.js';
import { m_at } from './mon.js';
import { NO_COLOR, ATR_INVERSE as TERM_INVERSE } from './terminal.js';
import { def_monsyms } from './drawing_data.js';
import { show_glyph_cell } from './display.js';
import { NUMMONS } from './monst_data.js';
import { rn2_on_display_rng } from './rng.js';
import { Hallucination } from './youprop.js';
import { NON_PM } from './const.js';
import { PMNAMES } from './monst_data.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { newsym } from './display.js';

/* goodpos lives in js/makemon.js, which imports this file; wired to keep
   the import one-way. */
let goodpos_fn = () => false;
export function worm_wire(fn) { goodpos_fn = fn; }

const MAX_NUM_WORMS = 32;

function wstate() {
    return (game.worms ||= { wheads: {}, wtails: {}, wgrowtime: {} });
}

function note_unported_worm(what) {
    (game.unported ||= new Set()).add('worm:' + what);
}

// src/worm.c:96 get_wormno() — first free slot, no draws.
export function get_wormno() {
    const w = wstate();
    for (let n = 1; n < MAX_NUM_WORMS; n++)
        if (!w.wheads[n])
            return n;
    return 0;
}

// src/worm.c:~85 create_worm_tail()
function create_worm_tail(num_segs) {
    if (!num_segs)
        return null;
    const seg = () => ({ nseg: null, wx: 0, wy: 0 });
    const new_tail = seg();
    let curr = new_tail;
    for (let i = 0; i < num_segs; i++) {
        curr.nseg = seg();
        curr = curr.nseg;
    }
    return new_tail;
}

// src/worm.c:120 initworm()
export function initworm(worm, wseg_count) {
    const w = wstate();
    const wnum = worm.wormno;
    const new_tail = create_worm_tail(wseg_count);

    if (new_tail) {
        w.wtails[wnum] = new_tail;
        let seg = new_tail;
        while (seg.nseg)
            seg = seg.nseg;
        w.wheads[wnum] = seg;
    } else {
        const seg = { nseg: null, wx: 0, wy: 0 };
        w.wtails[wnum] = w.wheads[wnum] = seg;
    }
    w.wheads[wnum].wx = worm.mx;
    w.wheads[wnum].wy = worm.my;
    w.wgrowtime[wnum] = 0;
}

// src/worm.c:~50 count_wsegs() — segments excluding the head.
export function count_wsegs(mtmp) {
    const w = wstate();
    let count = 0;
    if (mtmp.wormno) {
        for (let curr = w.wtails[mtmp.wormno];
             curr && curr !== w.wheads[mtmp.wormno]; curr = curr.nseg)
            count++;
    }
    return count;
}

/* src/worm.c place_worm_seg() — tail squares hold the worm for m_at */
function place_worm_seg(worm, x, y) {
    game.level?.monAt?.set(`${x},${y}`, worm);
}

/* src/worm.c:146 toss_wsegs() — discard segments */
function toss_wsegs(curr, display_update) {
    while (curr) {
        if (curr.wx) {
            const w = game.level?.monAt?.get(`${curr.wx},${curr.wy}`);
            if (w && w.wormno)
                game.level.monAt.delete(`${curr.wx},${curr.wy}`);
            if (display_update)
                newsym(curr.wx, curr.wy);
        }
        curr = curr.nseg;
    }
}

// src/trap.c:4946 rnd_nextto_goodpos() — Fisher-Yates over the 8 directions,
// then the first direction whose square is good.
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];
function rnd_nextto_goodpos(c, mtmp) {
    const dirs = [0, 1, 2, 3, 4, 5, 6, 7];
    for (let i = 8; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (let i = 0; i < 8; ++i) {
        const nx = c.x + xdir[dirs[i]];
        const ny = c.y + ydir[dirs[i]];
        if (goodpos_fn(nx, ny, mtmp, 0)) {
            c.x = nx;
            c.y = ny;
            return true;
        }
    }
    return false;
}

// src/worm.c:738 place_worm_tail_randomly()
export function place_worm_tail_randomly(worm, x, y) {
    const w = wstate();
    const wnum = worm.wormno;
    let curr = w.wtails[wnum];

    if (wnum && (!w.wtails[wnum] || !w.wheads[wnum]))
        return;
    if (w.wtails[wnum] === w.wheads[wnum]) {
        curr.wx = worm.mx;
        curr.wy = worm.my;
        return;
    }
    w.wheads[wnum].wx = w.wheads[wnum].wy = 0;

    let new_tail = curr;
    w.wheads[wnum] = new_tail;
    curr = curr.nseg;
    new_tail.nseg = null;
    new_tail.wx = x;
    new_tail.wy = y;

    let ox = x, oy = y;
    while (curr) {
        const c = { x: ox, y: oy };
        if (rnd_nextto_goodpos(c, worm)) {
            place_worm_seg(worm, c.x, c.y);
            curr.wx = ox = c.x;
            curr.wy = oy = c.y;
            w.wtails[wnum] = curr;
            curr = curr.nseg;
            w.wtails[wnum].nseg = new_tail;
            new_tail = w.wtails[wnum];
            newsym(c.x, c.y);
        } else {
            toss_wsegs(curr, false);
            curr = null;
        }
    }
}

// src/worm.c:898 worm_cross() — would a diagonal step pass BETWEEN two
// consecutive segments of the same long worm? Adjacent monsters may be
// attacked that way but not moved through.
export function worm_cross(x1, y1, x2, y2) {
    /* only diagonals can pass between segments */
    if (x1 === x2 || y1 === y2)
        return false;

    const at = (x, y) => game.level?.monAt?.get(`${x},${y}`) ?? null;
    const worm = at(x1, y2);
    if (!worm || at(x2, y1) !== worm)
        return false;

    const w = wstate();
    for (let curr = w.wtails[worm.wormno]; curr; ) {
        const wnxt = curr.nseg;
        if (!wnxt)
            break;
        if (curr.wx === x1 && curr.wy === y2)
            return wnxt.wx === x2 && wnxt.wy === y1;
        if (curr.wx === x2 && curr.wy === y1)
            return wnxt.wx === x1 && wnxt.wy === y2;
        curr = wnxt;
    }
    return false;
}

/* src/worm.c:968 flip_worm_segs_vertical() and :979 horizontal().
   C flips level.monsters[][] after changing the segment coordinates.  Our
   positional grid is a Map, so move each segment's key explicitly too. */
function flip_worm_segs(worm, axis, min, max) {
    const w = wstate();
    const segments = [];
    for (let curr = w.wtails[worm.wormno]; curr; curr = curr.nseg) {
        if (game.level?.monAt?.get(`${curr.wx},${curr.wy}`) === worm)
            game.level.monAt.delete(`${curr.wx},${curr.wy}`);
        if (axis === 'y')
            curr.wy = max - curr.wy + min;
        else
            curr.wx = max - curr.wx + min;
        segments.push(curr);
    }
    for (const curr of segments)
        game.level?.monAt?.set(`${curr.wx},${curr.wy}`, worm);
}

export function flip_worm_segs_vertical(worm, miny, maxy) {
    flip_worm_segs(worm, 'y', miny, maxy);
}

export function flip_worm_segs_horizontal(worm, minx, maxx) {
    flip_worm_segs(worm, 'x', minx, maxx);
}

// src/worm.c:487 see_wsegs(), redisplay a worm's tail segments.
export function see_wsegs(worm) {
    const w = wstate();
    let curr = w.wtails[worm.wormno];

    while (curr !== w.wheads[worm.wormno]) {
        newsym(curr.wx, curr.wy);
        curr = curr.nseg;
    }
}

// src/worm.c:308 wormgone(), the tail goes away when the worm leaves the
// level (or dies); the worm itself is still a long worm.
export function wormgone(worm) {
    const w = wstate();
    const wnum = worm.wormno;

    /* if (!wnum) impossible("wormgone: wormno is 0"); [runs to completion] */
    worm.wormno = 0; /* still a long worm but doesn't grow/shrink anymore */
    toss_wsegs(w.wtails[wnum], true);
    w.wheads[wnum] = w.wtails[wnum] = null;
    w.wgrowtime[wnum] = 0;
    /* when a long worm gets created by a polymorph zap, it gets flagged
       with MCORPSENM()==PM_LONG_WORM so that the same zap won't trigger
       another polymorph if it hits the new tail */
    if (worm.data?.pmidx === PMNAMES.PM_LONG_WORM && worm.mcorpsenm != null)
        worm.mcorpsenm = NON_PM; /* no longer polymorph-proof */
}

// src/worm.c:714 remove_worm(), take a worm's tail segments off the map.
export async function remove_worm(worm) {
    const { remove_monster } = await import('./makemon.js');
    const w = wstate();
    let curr = w.wtails[worm.wormno];

    while (curr) {
        if (curr.wx) {
            remove_monster(curr.wx, curr.wy);
            newsym(curr.wx, curr.wy);
            curr.wx = 0;
        }
        curr = curr.nseg;
    }
}

// src/worm.c:503 detect_wsegs(), show a long worm's tail segments, with the
// detection glyph when asked for.
export function detect_wsegs(worm, use_detection_glyph) {
    const w = wstate();
    let curr = w.wtails[worm.wormno];
    /* what_mon(PM_LONG_WORM_TAIL, newsym_rn2) */
    const what_tail = Hallucination() ? rn2_on_display_rng(NUMMONS)
                                      : PMNAMES.PM_LONG_WORM_TAIL;
    const shown = game.mons[what_tail];
    const attr = (use_detection_glyph && game.flags?.use_inverse !== false)
                 ? TERM_INVERSE : 0;

    while (curr !== w.wheads[worm.wormno]) {
        show_glyph_cell(curr.wx, curr.wy, def_monsyms[shown.mlet] || '?',
                        shown.mcolor ?? NO_COLOR, false, attr,
                        { kind: 'mon', mon: worm });
        curr = curr.nseg;
    }
}

// src/worm.c shrink_worm()
export function shrink_worm(wnum) { /* worm number */
    const w = wstate();
    let seg;

    if (w.wtails[wnum] === w.wheads[wnum])
        return; /* no tail */

    seg = w.wtails[wnum];
    w.wtails[wnum] = seg.nseg;
    seg.nseg = null;
    toss_wsegs(seg, true);
}

// src/worm.c place_wsegs()
export function place_wsegs(worm, oldworm) {
    const w = wstate();
    let curr = w.wtails[worm.wormno];

    while (curr !== w.wheads[worm.wormno]) {
        const x = curr.wx, y = curr.wy;
        const mtmp = m_at(x, y);

        if (oldworm && mtmp === oldworm)
            remove_monster(x, y);
        /* else if (mtmp) impossible("placing worm seg <%d,%d> over another mon");
           else if (oldworm) impossible("replacing worm seg <%d,%d> on empty spot"); */

        place_worm_seg(worm, x, y);
        curr = curr.nseg;
    }
    /* head segment is co-located with worm itself so not placed on the map */
    curr.wx = worm.mx, curr.wy = worm.my;
}

// src/worm.c cutworm(); cuttier: hit is by wielded blade or axe or by
// thrown axe
export async function cutworm(worm, x, y, cuttier) {
    const w = wstate();
    let curr, new_tail;
    let new_worm;
    const wnum = worm.wormno;
    let cut_chance, new_wnum;

    if (!wnum)
        return; /* bullet-proofing */

    if (x === worm.mx && y === worm.my)
        return; /* hit on head */

    /* cutting goes best with a cuttier weapon */
    cut_chance = rnd(20); /* Normally     1-16 does not cut, 17-20 does, */
    if (cuttier)
        cut_chance += 10; /* with a blade 1- 6 does not cut,  7-20 does. */

    if (cut_chance < 17)
        return; /* not good enough */

    /* Find the segment that was attacked. */
    curr = w.wtails[wnum];

    while ((curr.wx !== x) || (curr.wy !== y)) {
        curr = curr.nseg;
        if (!curr) {
            /* impossible("cutworm: no segment at (%d,%d)") */
            return;
        }
    }

    /* If this is the tail segment, then the worm just loses it. */
    if (curr === w.wtails[wnum]) {
        shrink_worm(wnum);
        return;
    }

    /*
     *  Split the worm.  The tail for the new worm is the old worm's tail.
     *  The tail for the old worm is the segment that follows "curr",
     *  and "curr" becomes the dummy segment under the new head.
     */
    new_tail = w.wtails[wnum];
    w.wtails[wnum] = curr.nseg;
    curr.nseg = null; /* split the worm */

    /*
     *  At this point, the old worm is correct.  Any new worm will have
     *  its head at "curr" and its tail at "new_tail".  The old worm
     *  must be at least level 3 in order to produce a new worm.
     */
    new_worm = null;
    new_wnum = (worm.m_lev >= 3 && !rn2(3)) ? get_wormno() : 0;
    if (new_wnum) {
        remove_monster(x, y); /* clone_mon puts new head here */
        /* clone_mon() will fail if enough long worms have been
           created to have them be marked as extinct or if the hit
           that cut the current one has dropped it down to 1 HP */
        new_worm = clone_mon(worm, x, y);
    }

    /* Sometimes the tail end dies. */
    if (!new_worm) {
        place_worm_seg(worm, x, y); /* place the "head" segment back */
        if (game.context?.mon_moving) {
            if (canspotmon(worm))
                await pline(`Part of ${s_suffix(mon_nam(worm))} tail has been cut off.`);
        } else
            await You(`cut part of the tail off of ${mon_nam(worm)}.`);
        toss_wsegs(new_tail, true);
        if (worm.mhp > 1)
            worm.mhp = Math.trunc(worm.mhp / 2);
        return;
    }

    new_worm.wormno = new_wnum; /* affix new worm number */
    new_worm.mcloned = 0;       /* treat second worm as a normal monster */

    /* Devalue the monster level of both halves of the worm.
       Note: m_lev is always at least 3 in order to get this far. */
    worm.m_lev = Math.max(worm.m_lev - 2, 3);
    new_worm.m_lev = worm.m_lev;

    /* Calculate the lower-level mhp; use <N>d8 for long worms.
       Can't use newmonhp() here because it would reset m_lev. */
    new_worm.mhpmax = new_worm.mhp = d(new_worm.m_lev, 8);
    worm.mhpmax = d(worm.m_lev, 8); /* new maxHP for old worm */
    if (worm.mhpmax < worm.mhp)
        worm.mhp = worm.mhpmax;

    w.wtails[new_wnum] = new_tail; /* We've got all the info right now */
    w.wheads[new_wnum] = curr;     /* so we can do this faster than    */
    w.wgrowtime[new_wnum] = 0;     /* trying to call initworm().       */

    /* Place the new monster at all the segment locations. */
    place_wsegs(new_worm, worm);

    if (game.context?.mon_moving)
        await pline(`${Monnam(worm)} is cut in half.`);
    else
        await You(`cut ${mon_nam(worm)} in half.`);
}
