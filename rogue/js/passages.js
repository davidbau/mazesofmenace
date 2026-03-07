/**
 * passages.js — Passage/corridor generation for Rogue 3.6 JS port.
 * Faithfully ported from passages.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mvaddch, winat, _stdscrState } from './curses.js';
import { MAXROOMS, LINES, COLS, ISGONE, DOOR, SECRETDOOR, PASSAGE } from './const.js';
import { rnd_pos, rnd_room, roomin } from './rooms.js';

// Passage adjacency graph (which rooms connect to which)
// rooms 0-8 in 3x3 grid:
//   0 1 2
//   3 4 5
//   6 7 8
const CONN = [
  [0, 1, 0, 1, 0, 0, 0, 0, 0],  // room 0
  [1, 0, 1, 0, 1, 0, 0, 0, 0],  // room 1
  [0, 1, 0, 0, 0, 1, 0, 0, 0],  // room 2
  [1, 0, 0, 0, 1, 0, 1, 0, 0],  // room 3
  [0, 1, 0, 1, 0, 1, 0, 1, 0],  // room 4
  [0, 0, 1, 0, 1, 0, 0, 0, 1],  // room 5
  [0, 0, 0, 1, 0, 0, 0, 1, 0],  // room 6
  [0, 0, 0, 0, 1, 0, 1, 0, 1],  // room 7
  [0, 0, 0, 0, 0, 1, 0, 1, 0],  // room 8
];

/**
 * do_passages: draw all passages on the level.
 */
export function do_passages() {
  // Initialize room graph description
  const rdes = [];
  for (let i = 0; i < MAXROOMS; i++) {
    rdes[i] = {
      conn: [...CONN[i]],
      isconn: new Array(MAXROOMS).fill(false),
      ingraph: false,
    };
  }

  // Start with one random room, connect to adjacent rooms
  let roomcount = 1;
  let r1idx = rnd(MAXROOMS);
  rdes[r1idx].ingraph = true;

  do {
    const r1 = rdes[r1idx];
    // Find a room to connect with
    let j = 0;
    let r2idx = -1;
    for (let i = 0; i < MAXROOMS; i++) {
      if (r1.conn[i] && !rdes[i].ingraph) {
        j++;
        if (rnd(j) === 0) r2idx = i;
      }
    }

    if (j === 0) {
      // No adjacent rooms outside graph; pick new room from graph
      do {
        r1idx = rnd(MAXROOMS);
      } while (!rdes[r1idx].ingraph);
    } else {
      // Connect r2 to graph
      rdes[r2idx].ingraph = true;
      conn(r1idx, r2idx, rdes);
      rdes[r1idx].isconn[r2idx] = true;
      rdes[r2idx].isconn[r1idx] = true;
      roomcount++;
    }
  } while (roomcount < MAXROOMS);

  // Add extra random passages
  const extra = rnd(5);
  for (let ec = extra; ec > 0; ec--) {
    r1idx = rnd(MAXROOMS);
    const r1 = rdes[r1idx];
    let j = 0;
    let r2idx = -1;
    for (let i = 0; i < MAXROOMS; i++) {
      if (r1.conn[i] && !r1.isconn[i]) {
        j++;
        if (rnd(j) === 0) r2idx = i;
      }
    }
    if (j !== 0) {
      conn(r1idx, r2idx, rdes);
      r1.isconn[r2idx] = true;
      rdes[r2idx].isconn[r1idx] = true;
    }
  }
}

/**
 * conn(r1, r2): draw a corridor between rooms r1 and r2.
 */
function conn(r1n, r2n, rdes) {
  const g = game();
  let rm, direc;

  if (r1n < r2n) {
    rm = r1n;
    direc = (r1n + 1 === r2n) ? 'r' : 'd';
  } else {
    rm = r2n;
    direc = (r2n + 1 === r1n) ? 'r' : 'd';
  }

  const rpf = g.rooms[rm];
  let rmt, rpt, delta, spos, epos;
  let distance, turn_delta, turn_distance, turn_spot;

  if (direc === 'd') {
    rmt = rm + 3;
    rpt = g.rooms[rmt];
    delta = { x: 0, y: 1 };
    spos = { x: rpf.r_pos.x, y: rpf.r_pos.y };
    epos = { x: rpt.r_pos.x, y: rpt.r_pos.y };

    if (!(rpf.r_flags & ISGONE)) {
      spos.x += rnd(rpf.r_max.x - 2) + 1;
      spos.y += rpf.r_max.y - 1;
    }
    if (!(rpt.r_flags & ISGONE)) {
      epos.x += rnd(rpt.r_max.x - 2) + 1;
    }

    distance = Math.abs(spos.y - epos.y) - 1;
    turn_delta = { y: 0, x: (spos.x < epos.x ? 1 : -1) };
    turn_distance = Math.abs(spos.x - epos.x);
    turn_spot = rnd(distance - 1) + 1;
  } else {
    rmt = rm + 1;
    rpt = g.rooms[rmt];
    delta = { x: 1, y: 0 };
    spos = { x: rpf.r_pos.x, y: rpf.r_pos.y };
    epos = { x: rpt.r_pos.x, y: rpt.r_pos.y };

    if (!(rpf.r_flags & ISGONE)) {
      spos.x += rpf.r_max.x - 1;
      spos.y += rnd(rpf.r_max.y - 2) + 1;
    }
    if (!(rpt.r_flags & ISGONE)) {
      epos.y += rnd(rpt.r_max.y - 2) + 1;
    }

    distance = Math.abs(spos.x - epos.x) - 1;
    turn_delta = { y: (spos.y < epos.y ? 1 : -1), x: 0 };
    turn_distance = Math.abs(spos.y - epos.y);
    turn_spot = rnd(distance - 1) + 1;
  }

  // Draw doors at source and destination
  if (!(rpf.r_flags & ISGONE)) {
    door(rpf, spos);
  } else {
    mvaddch(spos.y, spos.x, '#');
  }
  if (!(rpt.r_flags & ISGONE)) {
    door(rpt, epos);
  } else {
    mvaddch(epos.y, epos.x, '#');
  }

  // Draw passage
  let curr = { x: spos.x, y: spos.y };
  let dist = distance;
  while (dist) {
    curr.x += delta.x;
    curr.y += delta.y;

    if (dist === turn_spot && turn_distance > 0) {
      let td = turn_distance;
      while (td--) {
        mvaddch(curr.y, curr.x, PASSAGE);
        curr.x += turn_delta.x;
        curr.y += turn_delta.y;
      }
    }

    mvaddch(curr.y, curr.x, PASSAGE);
    dist--;
  }
  curr.x += delta.x;
  curr.y += delta.y;

  // Verify (in C this would warn if they don't match, we just skip)
}

/**
 * door: add a door or secret door to a room exit list
 */
function door(rm, cp) {
  const g = game();
  const ch = (rnd(10) < g.level - 1 && rnd(100) < 20) ? SECRETDOOR : DOOR;
  mvaddch(cp.y, cp.x, ch);
  if (rm.r_nexits < 4) {
    rm.r_exit[rm.r_nexits] = { x: cp.x, y: cp.y };
    rm.r_nexits++;
  }
}
