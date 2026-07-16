// worm.js — Long worm segment bookkeeping (creation path).
// C ref: worm.c — get_wormno, initworm, create_worm_tail, count_wsegs,
//   place_worm_tail_randomly, place_worm_seg / remove_monster (rm.h).
// Named omissions: worm_move/grow/shrink, cutworm, wormgone save/restore,
//   remove_worm full, worm_known/cross, detect_wsegs display.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { MAX_NUM_WORMS, N_DIRS, xdir, ydir } from './const.js';
import { goodpos } from './teleport.js';
import { newsym } from './display.js';

/** @type {(null|{nseg:object|null,wx:number,wy:number})[]} */
const wheads = new Array(MAX_NUM_WORMS).fill(null);
/** @type {(null|{nseg:object|null,wx:number,wy:number})[]} */
const wtails = new Array(MAX_NUM_WORMS).fill(null);
/** @type {number[]} */
const wgrowtime = new Array(MAX_NUM_WORMS).fill(0);

function newseg() {
    return { nseg: null, wx: 0, wy: 0 };
}

/** C ref: rm.h place_worm_seg — occupy level.monsters[x][y] with worm head. */
function place_worm_seg(worm, x, y) {
    if (!game._level_monsters) game._level_monsters = new Map();
    const key = `${x},${y}`;
    if (game._level_monsters.has(key)) {
        // C: impossible("place_worm_seg over mon") — keep overwrite like soft path
    }
    game._level_monsters.set(key, worm);
}

/** C ref: rm.h remove_monster — clear level.monsters[x][y]. */
function remove_monster_xy(x, y) {
    game._level_monsters?.delete(`${x},${y}`);
}

/**
 * Occupancy for worm body segs (heads stay on fmon via mx/my).
 * C: level.monsters[x][y] holds the worm head pointer at every seg cell.
 */
export function worm_mon_at(x, y) {
    return game._level_monsters?.get(`${x},${y}`) ?? null;
}

/** C ref: worm.c get_wormno */
export function get_wormno() {
    let new_wormno = 1;
    while (new_wormno < MAX_NUM_WORMS) {
        if (!wheads[new_wormno]) return new_wormno;
        new_wormno++;
    }
    return 0;
}

/** C ref: worm.c create_worm_tail — (num_segs+1) chain; null if num_segs==0. */
function create_worm_tail(num_segs) {
    if (!num_segs) return null;
    let i = 0;
    const new_tail = newseg();
    let curr = new_tail;
    while (i < num_segs) {
        curr.nseg = newseg();
        curr = curr.nseg;
        i++;
    }
    return new_tail;
}

/**
 * C ref: worm.c initworm — dummy head seg + optional tail chain.
 * Caller must set worm.wormno = get_wormno() beforehand (non-zero).
 */
export function initworm(worm, wseg_count) {
    const wnum = worm.wormno | 0;
    const new_tail = create_worm_tail(wseg_count);
    let seg;
    if (new_tail) {
        wtails[wnum] = new_tail;
        for (seg = new_tail; seg.nseg; seg = seg.nseg) { /* find head */ }
        wheads[wnum] = seg;
    } else {
        wtails[wnum] = wheads[wnum] = seg = newseg();
    }
    seg.wx = worm.mx | 0;
    seg.wy = worm.my | 0;
    wgrowtime[wnum] = 0;
}

/** C ref: worm.c count_wsegs */
export function count_wsegs(mtmp) {
    let i = 0;
    if (mtmp?.wormno) {
        for (let curr = wtails[mtmp.wormno]?.nseg; curr; curr = curr.nseg) i++;
    }
    return i;
}

/** C ref: worm.c toss_wsegs — free segs; optionally update display. */
function toss_wsegs(curr, display_update) {
    while (curr) {
        const nxtseg = curr.nseg;
        if (curr.wx) {
            remove_monster_xy(curr.wx, curr.wy);
            if (display_update) newsym(curr.wx, curr.wy);
        }
        curr = nxtseg;
    }
}

/**
 * Local mon-path of trap.c rnd_nextto_goodpos — avoid worm↔trap↔makemon cycle.
 * Hero/crawl_destination arm deferred (worms are never &youmonst here).
 */
function rnd_nextto_goodpos_mon(pos, mtmp) {
    const dirs = [];
    for (let i = 0; i < N_DIRS; i++) dirs.push(i);
    for (let i = N_DIRS; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (let i = 0; i < N_DIRS; i++) {
        const nx = (pos.x | 0) + xdir[dirs[i]];
        const ny = (pos.y | 0) + ydir[dirs[i]];
        if (goodpos(nx, ny, mtmp, 0)) {
            pos.x = nx;
            pos.y = ny;
            return true;
        }
    }
    return false;
}

/**
 * C ref: worm.c place_worm_tail_randomly — reverse segs behind head via
 * rnd_nextto_goodpos; truncate with toss_wsegs when stuck.
 */
export function place_worm_tail_randomly(worm, x, y) {
    const wnum = worm.wormno | 0;
    let curr = wtails[wnum];
    let ox = x | 0;
    let oy = y | 0;

    if (wnum && (!wtails[wnum] || !wheads[wnum])) return;
    if (wtails[wnum] === wheads[wnum]) {
        if (curr.wx && (curr.wx !== worm.mx || curr.wy !== worm.my)) {
            if (worm_mon_at(curr.wx, curr.wy) === worm) {
                remove_monster_xy(curr.wx, curr.wy);
            }
        }
        curr.wx = worm.mx | 0;
        curr.wy = worm.my | 0;
        return;
    }

    wheads[wnum].wx = 0;
    wheads[wnum].wy = 0;

    let new_tail = curr;
    wheads[wnum] = new_tail;
    curr = curr.nseg;
    new_tail.nseg = null;
    new_tail.wx = x | 0;
    new_tail.wy = y | 0;

    while (curr) {
        const pos = { x: ox, y: oy };
        if (rnd_nextto_goodpos_mon(pos, worm)) {
            const nx = pos.x | 0;
            const ny = pos.y | 0;
            place_worm_seg(worm, nx, ny);
            curr.wx = ox = nx;
            curr.wy = oy = ny;
            wtails[wnum] = curr;
            curr = curr.nseg;
            wtails[wnum].nseg = new_tail;
            new_tail = wtails[wnum];
            newsym(nx, ny);
        } else {
            toss_wsegs(curr, false);
            curr = null;
        }
    }
}

/** Clear per-level worm tables — call from clear_level_structures. */
export function clear_wormdata() {
    for (let i = 0; i < MAX_NUM_WORMS; i++) {
        wheads[i] = null;
        wtails[i] = null;
        wgrowtime[i] = 0;
    }
    game._level_monsters = new Map();
}
