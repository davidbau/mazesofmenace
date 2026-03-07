/**
 * daemon.js — Daemon/fuse system for Rogue 3.6 JS port.
 *
 * Rogue uses a fixed array of 20 "delayed_action" slots:
 *   d_type: EMPTY(0), BEFORE(1), AFTER(2)
 *   d_func: function reference
 *   d_arg: argument
 *   d_time: -1 = daemon (runs every turn), >0 = fuse countdown
 *
 * In JS we pass actual function references.
 */

import { game } from './gstate.js';
import { BEFORE, AFTER } from './const.js';

const EMPTY = 0;
const DAEMON_TIME = -1;
const MAXDAEMONS = 20;

/**
 * d_slot(): find an empty slot
 */
function d_slot() {
  const g = game();
  for (let i = 0; i < MAXDAEMONS; i++) {
    if (g.d_list[i].d_type === EMPTY) return g.d_list[i];
  }
  console.error("Ran out of fuse slots");
  return null;
}

/**
 * find_slot(func): find the slot with matching function
 */
function find_slot(func) {
  const g = game();
  for (let i = 0; i < MAXDAEMONS; i++) {
    if (g.d_list[i].d_type !== EMPTY && g.d_list[i].d_func === func) {
      return g.d_list[i];
    }
  }
  return null;
}

/**
 * daemon(func, arg, type): start a daemon
 */
export function daemon(func, arg, type) {
  const dev = d_slot();
  if (!dev) return;
  dev.d_type = type;
  dev.d_func = func;
  dev.d_arg = arg;
  dev.d_time = DAEMON_TIME;
}

/**
 * kill_daemon(func): remove a daemon
 */
export function kill_daemon(func) {
  const dev = find_slot(func);
  if (dev) dev.d_type = EMPTY;
}

/**
 * do_daemons(flag): run all daemons with given flag
 */
export async function do_daemons(flag) {
  const g = game();
  for (let i = 0; i < MAXDAEMONS; i++) {
    const dev = g.d_list[i];
    if (dev.d_type === flag && dev.d_time === DAEMON_TIME) {
      await dev.d_func(dev.d_arg);
    }
  }
}

/**
 * fuse(func, arg, time, type): start a fuse
 */
export function fuse(func, arg, time, type) {
  const wire = d_slot();
  if (!wire) return;
  wire.d_type = type;
  wire.d_func = func;
  wire.d_arg = arg;
  wire.d_time = time;
}

/**
 * lengthen(func, xtime): increase fuse time
 */
export function lengthen(func, xtime) {
  const wire = find_slot(func);
  if (wire) wire.d_time += xtime;
}

/**
 * extinguish(func): put out a fuse
 */
export function extinguish(func) {
  const wire = find_slot(func);
  if (wire) wire.d_type = EMPTY;
}

/**
 * do_fuses(flag): decrement fuses and fire if they reach 0
 */
export async function do_fuses(flag) {
  const g = game();
  for (let i = 0; i < MAXDAEMONS; i++) {
    const wire = g.d_list[i];
    if (wire.d_type === flag && wire.d_time > 0) {
      wire.d_time--;
      if (wire.d_time === 0) {
        wire.d_type = EMPTY;
        await wire.d_func(wire.d_arg);
      }
    }
  }
}
