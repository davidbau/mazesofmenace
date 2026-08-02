// worm.js — long worm tails.
// C ref: src/worm.c
//
// Only the creation path is here: what a long worm spends from the stream
// when makemon builds one (the tail segments and their random placement).
// Worm movement, cutting and hp bookkeeping are recorded when reached.

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
