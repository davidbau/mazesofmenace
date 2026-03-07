/**
 * chase.js — Monster chasing logic for Rogue 3.6 JS port.
 * Ported from chase.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mvwinch, mvwaddch, mvinch } from './curses.js';
import {
  DOOR, PASSAGE, FLOOR, SCROLL, ISDARK, ISHELD, ISRUN, ISSLOW, ISHASTE,
  ISHUH, ISINVIS, CANSEE, S_SCARE, LINES, COLS,
} from './const.js';
import { roomin } from './rooms.js';
import { find_mons, DISTANCE, cansee } from './monsters.js';

// Injected deps
let _attack = null;
let _step_ok = null;
let _rndmove = null;

export function _setChaseDeps(deps) {
  _attack = deps.attack;
  _step_ok = deps.step_ok;
  _rndmove = deps.rndmove;
}

let ch_ret = { x: 0, y: 0 };

/**
 * runners(): make all running monsters move.
 */
export async function runners() {
  const g = game();
  for (let item = g.mlist; item !== null; item = item.l_next) {
    const tp = item.l_data;
    if (!(tp.t_flags & ISHELD) && (tp.t_flags & ISRUN)) {
      if (!(tp.t_flags & ISSLOW) || tp.t_turn)
        await do_chase(tp);
      if (tp.t_flags & ISHASTE)
        await do_chase(tp);
      tp.t_turn ^= true;
    }
  }
}

/**
 * do_chase(th): make one thing chase another.
 */
export async function do_chase(th) {
  const g = game();
  let rer = roomin(th.t_pos);
  let ree = roomin(th.t_dest);

  // We don't count doors as inside rooms for this routine
  if (mvwinch(g.stdscr, th.t_pos.y, th.t_pos.x) === DOOR) {
    rer = null;
  }

  let thisPos = { x: th.t_dest.x, y: th.t_dest.y };

  // If in different room, run to nearest door toward goal
  if (rer !== null && rer !== ree) {
    let mindist = 32767;
    for (let i = 0; i < rer.r_nexits; i++) {
      const dist = DISTANCE(th.t_dest.y, th.t_dest.x,
                            rer.r_exit[i].y, rer.r_exit[i].x);
      if (dist < mindist) {
        thisPos = { x: rer.r_exit[i].x, y: rer.r_exit[i].y };
        mindist = dist;
      }
    }
  }

  let stoprun = false;
  if (!chase(th, thisPos)) {
    if (thisPos.y === g.player.t_pos.y && thisPos.x === g.player.t_pos.x) {
      if (_attack) await _attack(th);
      return;
    } else if (th.t_type !== 'F') {
      stoprun = true;
    }
  } else if (th.t_type === 'F') {
    return;
  }

  mvwaddch(g.cw, th.t_pos.y, th.t_pos.x, th.t_oldch);
  const sch = mvwinch(g.cw, ch_ret.y, ch_ret.x);

  if (rer !== null && (rer.r_flags & ISDARK) && sch === FLOOR &&
      DISTANCE(ch_ret.y, ch_ret.x, th.t_pos.y, th.t_pos.x) < 3 &&
      !(g.player.t_flags & 0x40 /* ISBLIND */)) {
    th.t_oldch = ' ';
  } else {
    th.t_oldch = sch;
  }

  if (cansee(ch_ret.y, ch_ret.x) && !(th.t_flags & ISINVIS)) {
    mvwaddch(g.cw, ch_ret.y, ch_ret.x, th.t_type);
  }
  mvwaddch(g.mw, th.t_pos.y, th.t_pos.x, ' ');
  mvwaddch(g.mw, ch_ret.y, ch_ret.x, th.t_type);
  th.t_pos = { x: ch_ret.x, y: ch_ret.y };

  if (stoprun && th.t_pos.y === th.t_dest.y && th.t_pos.x === th.t_dest.x) {
    th.t_flags &= ~ISRUN;
  }
}

/**
 * runto(runner, spot): set a monster running after something.
 */
export function runto(runner, spot) {
  const item = find_mons(runner.y, runner.x);
  if (!item) return;
  const tp = item.l_data;
  tp.t_dest = spot;
  tp.t_flags |= ISRUN;
  tp.t_flags &= ~ISHELD;
}

/**
 * chase(tp, ee): find spot to move closer to ee.
 * Returns true if we want to keep chasing, false if we reached the goal.
 */
export function chase(tp, ee) {
  const g = game();
  const er = tp.t_pos;
  let dist;

  // Confused, bat, or invisible stalker moves randomly
  if ((tp.t_flags & ISHUH && rnd(10) < 8) ||
      (tp.t_type === 'I' && rnd(100) < 20) ||
      (tp.t_type === 'B' && rnd(100) < 50)) {
    const rm = _rndmove(tp);
    ch_ret = { x: rm.x, y: rm.y };
    dist = DISTANCE(ch_ret.y, ch_ret.x, ee.y, ee.x);
    if (rnd(1000) < 50) tp.t_flags &= ~ISHUH;
  } else {
    // Find empty spot closest to target
    dist = DISTANCE(er.y, er.x, ee.y, ee.x);
    ch_ret = { x: er.x, y: er.y };

    for (let x = er.x - 1; x <= er.x + 1; x++) {
      for (let y = er.y - 1; y <= er.y + 1; y++) {
        const tryp = { x, y };
        if (!diag_ok(er, tryp)) continue;
        const ch = winat_safe(g, y, x);
        if (_step_ok(ch)) {
          // Check for scare scroll
          if (ch === SCROLL) {
            let scared = false;
            for (let item = g.lvl_obj; item !== null; item = item.l_next) {
              const obj = item.l_data;
              if (obj.o_pos.y === y && obj.o_pos.x === x &&
                  obj.o_which === S_SCARE) {
                scared = true;
                break;
              }
            }
            if (scared) continue;
          }
          const thisdist = DISTANCE(y, x, ee.y, ee.x);
          if (thisdist < dist) {
            ch_ret = { x, y };
            dist = thisdist;
          }
        }
      }
    }
  }
  return (dist !== 0);
}

function winat_safe(g, y, x) {
  if (y < 0 || y >= 24 || x < 0 || x >= 80) return ' ';
  const mc = g.mw[y][x];
  if (mc !== ' ') return mc;
  return g.stdscr[y][x];
}

/**
 * diag_ok(sp, ep): check if diagonal move is legal.
 */
export function diag_ok(sp, ep) {
  if (ep.x === sp.x || ep.y === sp.y) return true;
  return (_step_ok(mvinch(ep.y, sp.x)) && _step_ok(mvinch(sp.y, ep.x)));
}
