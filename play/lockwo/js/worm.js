// worm.js — long worm tail segments.
// C ref: src/worm.c.  A long worm occupies more than one square: the monster
// itself is the head, and `wormno` indexes a per-level chain of tail segments
// held in wtails[]/wheads[].  Only the creation side is ported here (that is
// what makemon() needs at level-generation time); movement/growth are not.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { isok } from './const.js';

// C ref: include/decl.h MAX_NUM_WORMS.
const MAX_NUM_WORMS = 32;

// C ref: worm.c xdir/ydir come from decl.c — the 8 compass directions in the
// canonical order used by every dirs[] shuffle.
const XDIR = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR = [0, -1, -1, -1, 0, 1, 1, 1];
const N_DIRS = 8;

function worm_state() {
    const lev = game.level;
    if (!lev) return null;
    if (!lev.wtails) {
        lev.wtails = new Array(MAX_NUM_WORMS).fill(null);
        lev.wheads = new Array(MAX_NUM_WORMS).fill(null);
        lev.wgrowtime = new Array(MAX_NUM_WORMS).fill(0);
    }
    return lev;
}

// C ref: worm.c get_wormno() — the lowest free wtails[] slot, or 0 when the
// level is already full of worms.
export function get_wormno() {
    const lev = worm_state();
    if (!lev) return 0;
    for (let n = 1; n < MAX_NUM_WORMS; n++)
        if (!lev.wheads[n]) return n;
    return 0;
}

function newseg() { return { nseg: null, wx: 0, wy: 0 }; }

// C ref: worm.c create_worm_tail() — a chain of (num_segs + 1) segments, or
// NULL when num_segs is 0.  No RNG.
function create_worm_tail(num_segs) {
    if (!num_segs) return null;
    const new_tail = newseg();
    let curr = new_tail;
    for (let i = 0; i < num_segs; i++) {
        curr.nseg = newseg();
        curr = curr.nseg;
    }
    return new_tail;
}

// C ref: worm.c initworm() — hand the worm its tail chain and put the head
// segment on the worm's own square.  No RNG.
export function initworm(worm, wseg_count) {
    const lev = worm_state();
    if (!lev) return;
    const wnum = worm.wormno;
    const new_tail = create_worm_tail(wseg_count);
    let seg;
    if (new_tail) {
        lev.wtails[wnum] = new_tail;
        for (seg = new_tail; seg.nseg; seg = seg.nseg) continue;
        lev.wheads[wnum] = seg;
    } else {
        seg = newseg();
        lev.wtails[wnum] = lev.wheads[wnum] = seg;
    }
    seg.wx = worm.mx;
    seg.wy = worm.my;
    lev.wgrowtime[wnum] = 0;
}

// C ref: worm.c count_wsegs() — segments BEHIND the tail's first one.
export function count_wsegs(mtmp) {
    const lev = worm_state();
    if (!lev || !mtmp.wormno || !lev.wtails[mtmp.wormno]) return 0;
    let i = 0;
    for (let curr = lev.wtails[mtmp.wormno].nseg; curr; curr = curr.nseg) i++;
    return i;
}

// C ref: trap.c rnd_nextto_goodpos() — shuffle the 8 compass directions
// (one rn2(i) per i from N_DIRS down to 1) and take the first goodpos()
// neighbour.  The shuffle draws happen up front, unconditionally.
export function rnd_nextto_goodpos(pos, mtmp, goodposfn) {
    const dirs = [];
    for (let i = 0; i < N_DIRS; i++) dirs.push(i);
    for (let i = N_DIRS; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (let i = 0; i < N_DIRS; i++) {
        const nx = pos.x + XDIR[dirs[i]];
        const ny = pos.y + YDIR[dirs[i]];
        if (isok(nx, ny) && goodposfn(nx, ny, mtmp)) {
            pos.x = nx; pos.y = ny;
            return true;
        }
    }
    return false;
}

// C ref: worm.c place_worm_seg() — a tail segment occupies its square just
// like a monster does, so m_at() finds the worm there.  No RNG.
function place_worm_seg(worm, x, y) {
    const lev = game.level;
    if (!lev) return;
    if (!lev.wormsegs) lev.wormsegs = [];
    lev.wormsegs.push({ worm, x, y });
}

// C ref: worm.c place_worm_tail_randomly() — lay the tail out on squares
// adjacent to the head, walking backwards; truncate when there is no room.
export function place_worm_tail_randomly(worm, x, y, goodposfn) {
    const lev = worm_state();
    if (!lev) return;
    const wnum = worm.wormno;
    let curr = lev.wtails[wnum];
    if (!wnum || !lev.wtails[wnum] || !lev.wheads[wnum]) return;

    if (lev.wtails[wnum] === lev.wheads[wnum]) {
        curr.wx = worm.mx; curr.wy = worm.my;
        return;
    }
    // The old head segment leaves the map; it becomes the new final tail.
    lev.wheads[wnum].wx = lev.wheads[wnum].wy = 0;

    let new_tail = curr;
    lev.wheads[wnum] = new_tail;
    curr = curr.nseg;
    new_tail.nseg = null;
    new_tail.wx = x;
    new_tail.wy = y;

    const o = { x, y };
    while (curr) {
        const pos = { x: o.x, y: o.y };
        if (rnd_nextto_goodpos(pos, worm, goodposfn)) {
            place_worm_seg(worm, pos.x, pos.y);
            curr.wx = (o.x = pos.x);
            curr.wy = (o.y = pos.y);
            lev.wtails[wnum] = curr;
            curr = curr.nseg;
            lev.wtails[wnum].nseg = new_tail;
            new_tail = lev.wtails[wnum];
        } else {
            // No room for the rest of the tail — truncate it.
            curr = null;
        }
    }
}

// The worm-tail segment standing on (x,y), if any.  Used by the display: a
// tail square renders as S_wormtail ('~'), not as the worm's own letter.
export function worm_seg_at(x, y) {
    for (const s of game.level?.wormsegs || [])
        if (s.x === x && s.y === y) return s.worm;
    return null;
}
