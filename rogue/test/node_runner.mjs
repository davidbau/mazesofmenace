/**
 * node_runner.mjs — Runs one Rogue 3.6 game session in Node.js using mocks.
 *
 * Usage:
 *   import { runSession } from './node_runner.mjs';
 *   const steps = await runSession(seed, "hhhljjjkQy");
 *   // steps[i] = { key, rng: [...], screen: [...24 strings] }
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JS_DIR = join(__dirname, '..', 'js');

// Import game modules from rogue/js/
import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { srand, rnd } from '../js/rng.js';
import { wclear, clear, draw, mvwaddch, wclrtoeol, wmove, resetCursorState } from '../js/curses.js';
import { BEFORE, AFTER, WANDERTIME, MACE, BOW, ARROW, RING_MAIL, PLAYER } from '../js/const.js';

import { new_item, _attach, _free_list } from '../js/list.js';
import { init_player, init_things, init_names, init_colors, init_stones, init_materials } from '../js/init.js';
import { do_rooms, rnd_pos, rnd_room, _setRoomsDeps } from '../js/rooms.js';
import { do_passages } from '../js/passages.js';
import { new_monster, randmonster, wanderer, wake_monster, cansee, find_mons, removeM,
         _setMonsterDeps } from '../js/monsters.js';
import { new_level, put_things, _setNewlevelDeps } from '../js/newlevel.js';
import { light, do_move, do_run, be_trapped, trap_at, rndmove, diag_ok, show,
         _setMoveDeps } from '../js/move.js';
import { runners, do_chase, runto, chase, _setChaseDeps } from '../js/chase.js';
import { fight, attack, swing, check_level, roll_em, killed, is_magic, save, save_throw,
         str_plus, add_dam, raise_level, hit, miss_msg, thunk, bounce, prname,
         _setFightDeps } from '../js/fight.js';
import { inv_name, new_thing, pick_one, money, drop, dropcheck, _setThingsDeps } from '../js/things.js';
import { add_pack, inventory, pick_up, picky_inven, get_item, pack_char,
         _setPackDeps } from '../js/pack.js';
import { init_weapon, fall, fallpos, missile, do_motion, hit_monster, num, wield,
         resetGrpnum, _setWeaponsDeps } from '../js/weapons.js';
import { daemon, kill_daemon, do_daemons, fuse, lengthen, extinguish, do_fuses } from '../js/daemon.js';
import { doctor, swander, rollwand, unconfuse, unsee, sight, nohaste, stomach,
         _setDaemonsDeps } from '../js/daemons.js';
import { command, quit, d_level, u_level, help, identify, _setCommandDeps } from '../js/command.js';
import { msg, addmsg, endmsg, status, readchar, step_ok, wait_for, resetStatus } from '../js/io.js';
import { look, search, secretdoor, find_obj, eat, chg_str, vowelstr, is_current, get_dir,
         _setMiscDeps } from '../js/misc.js';
import { roomin } from '../js/rooms.js';
import { winat } from '../js/curses.js';
import { FLOOR } from '../js/const.js';

import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

// Sentinel error to terminate game after keys run out
class SessionDone extends Error {
  constructor() { super('session complete'); }
}

// Wire up cross-module dependencies
function wireDeps(g) {
  const step_ok_fn = (ch) => step_ok(ch);

  function ISWEARING(type) {
    return (g.cur_ring[0] && g.cur_ring[0].o_which === type) ||
           (g.cur_ring[1] && g.cur_ring[1].o_which === type);
  }

  function ISRING(side, type) {
    return g.cur_ring[side] && g.cur_ring[side].o_which === type;
  }

  function teleport_fn() {
    let pos = { x: 0, y: 0 };
    let rm;
    do {
      rm = rnd_room();
      rnd_pos(g.rooms[rm], pos);
    } while (winat(pos.y, pos.x) !== FLOOR);
    const oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    mvwaddch(g.cw, oldpos.y, oldpos.x, g.cw[oldpos.y][oldpos.x]);
    g.player.t_pos.x = pos.x; g.player.t_pos.y = pos.y;
    light(g.player.t_pos);
    mvwaddch(g.cw, pos.y, pos.x, PLAYER);
    g.running = false;
  }

  function death_fn(who) {
    g.playing = false;
    throw new SessionDone();
  }

  function discard_fn(item) {
    item.l_next = item.l_prev = null;
  }

  function detach_pack_fn(item) {
    if (item.l_prev) item.l_prev.l_next = item.l_next;
    else g.pack = item.l_next;
    if (item.l_next) item.l_next.l_prev = item.l_prev;
    item.l_prev = item.l_next = null;
  }

  function detach_lvl_fn(item) {
    if (item.l_prev) item.l_prev.l_next = item.l_next;
    else g.lvl_obj = item.l_next;
    if (item.l_next) item.l_next.l_prev = item.l_prev;
    item.l_prev = item.l_next = null;
  }

  function find_obj_fn(y, x) {
    for (let obj = g.lvl_obj; obj !== null; obj = obj.l_next) {
      const op = obj.l_data;
      if (op.o_pos.y === y && op.o_pos.x === x) return obj;
    }
    return null;
  }

  function waste_time_fn() {}
  function fix_stick_fn(cur) { cur.o_charges = rnd(5) + 3; }

  let _grpnum = 0;
  function newgrp_fn() { return ++_grpnum; }

  _setRoomsDeps(new_monster, randmonster, new_thing);

  _setMonsterDeps({
    msg, runto, save,
    unconfuse, fuse, lengthen, attack,
    ISWEARING, step_ok: step_ok_fn, cansee,
  });

  _setNewlevelDeps({
    status, do_rooms, do_passages, light, new_thing,
  });

  _setChaseDeps({
    attack, step_ok: step_ok_fn, rndmove,
  });

  _setFightDeps({
    msg, addmsg, endmsg, status, runto, save, ISWEARING, ISRING,
    chg_str, death: death_fn,
    check_level, fall, light, fallpos, new_item,
    inv_name, discard: discard_fn, detach: detach_pack_fn, init_weapon,
  });

  _setMoveDeps({
    msg, fight, pick_up, be_trapped, step_ok: step_ok_fn,
    diag_ok, rndmove, light, new_level, status, save, swing, death: death_fn,
    ISWEARING, chg_str, fall, teleport: teleport_fn, new_item, init_weapon, wake_monster,
  });

  _setThingsDeps({
    msg, addmsg, endmsg, init_weapon, fix_stick: fix_stick_fn, newgrp: newgrp_fn,
    ISRING, extinguish, unsee, light, get_item, dropcheck,
    inv_name, detach_pack: detach_pack_fn, discard: discard_fn, chg_str, waste_time: waste_time_fn,
  });

  _setPackDeps({
    msg, addmsg, inv_name, money, find_obj: find_obj_fn, detach: detach_lvl_fn,
    discard: discard_fn, readchar, draw, wait_for, inventory,
  });

  _setWeaponsDeps({
    msg, get_item, dropcheck, is_current, fight, fall, light, cansee, show, inv_name,
    addmsg, endmsg,
  });

  _setDaemonsDeps({
    msg, addmsg, ISRING, daemon, kill_daemon, fuse, extinguish, wanderer, light,
  });

  _setMiscDeps({
    msg, addmsg, wake_monster, readchar, wait_for, ISWEARING, ISRING,
    teleport: teleport_fn,
  });

  _setCommandDeps({
    msg, addmsg, readchar, status, look, do_move, do_run, fight, pick_up,
    inventory, picky_inven, drop, quaff: async () => {}, read_scroll: async () => {},
    eat, wield, wear: async () => {}, take_off: async () => {},
    ring_on: async () => {}, ring_off: async () => {},
    option: async () => {}, call: async () => {},
    d_level, u_level, help, identify, search, do_zap: async () => {},
    get_dir, missile, teleport: teleport_fn, new_level, draw, ISRING, quit,
    save_game: async () => false,
  });
}

async function giveStartingEquipment(g) {
  function mk_obj() {
    return {
      o_type: ' ', o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 0,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100, o_charges: 0,
    };
  }

  // Mace +1,+1
  const mace_item = new_item(mk_obj());
  const mace = mace_item.l_data;
  mace.o_type = ')';
  mace.o_which = MACE;
  init_weapon(mace, MACE);
  mace.o_hplus = 1;
  mace.o_dplus = 1;
  mace.o_flags |= 0o002; // ISKNOW
  await add_pack(mace_item, true);
  g.cur_weapon = mace;

  // Bow +1,+0
  const bow_item = new_item(mk_obj());
  const bow = bow_item.l_data;
  bow.o_type = ')';
  bow.o_which = BOW;
  init_weapon(bow, BOW);
  bow.o_hplus = 1;
  bow.o_dplus = 0;
  bow.o_flags |= 0o002;
  await add_pack(bow_item, true);

  // Arrows (25 + rnd(15))
  const arr_item = new_item(mk_obj());
  const arr = arr_item.l_data;
  arr.o_type = ')';
  arr.o_which = ARROW;
  init_weapon(arr, ARROW);
  arr.o_count = 25 + rnd(15);
  arr.o_hplus = 0;
  arr.o_dplus = 0;
  arr.o_flags |= 0o002;
  await add_pack(arr_item, true);

  // Ring mail armor (ac = a_class[RING_MAIL] - 1)
  const arm_item = new_item(mk_obj());
  const arm = arm_item.l_data;
  arm.o_type = ']';
  arm.o_which = RING_MAIL;
  arm.o_ac = g.a_class[RING_MAIL] - 1;
  arm.o_flags |= 0o002;
  g.cur_armor = arm;
  await add_pack(arm_item, true);

  // Food
  const food_item = new_item(mk_obj());
  const food = food_item.l_data;
  food.o_type = ':';
  food.o_count = 1;
  food.o_which = 0;
  await add_pack(food_item, true);
}

/**
 * Run one game session and return steps array.
 */
export async function runSession(seed, keys) {
  const display = new MockDisplay();
  const input = new MockInput();

  const g = new GameState();
  g.display = display;
  g.input = input;
  g.rawRngLog = [];
  setGame(g);

  // Reset status cache
  resetStatus();

  // Reset module-level state that persists across sessions
  resetGrpnum();
  resetCursorState();

  // Wire deps
  wireDeps(g);

  // Seed RNG
  srand(seed);
  g.seed = seed;
  g.dnum = seed;

  // Initialize game data (matches C main.c order)
  init_player();
  init_things();
  init_names();
  init_colors();
  init_stones();
  init_materials();

  // Clear display
  clear();

  // Draw first level (BEFORE equipment, matching C main.c order)
  await new_level();

  // Start daemons and fuses (AFTER new_level, matching C main.c order)
  daemon(doctor, 0, AFTER);
  fuse(swander, 0, WANDERTIME, AFTER);
  daemon(stomach, 0, AFTER);
  daemon(runners, 0, AFTER);

  // Give starting equipment (AFTER new_level, matching C main.c order)
  await giveStartingEquipment(g);

  // Set up step capture
  const steps = [];
  let keyIndex = 0;

  const origGetKey = input.getKey.bind(input);
  input.getKey = async function () {
    // Capture current state before returning next key
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];

    if (keyIndex >= keys.length) {
      throw new SessionDone();
    }

    const key = keys[keyIndex];
    steps.push({ key, rng, screen });
    return keys[keyIndex++];
  };

  try {
    // Main game loop setup (matches C playit())
    g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    g.oldrp = roomin(g.player.t_pos);

    while (g.playing) {
      await command();
    }
  } catch (e) {
    if (e instanceof SessionDone) {
      // Normal termination
    } else {
      throw e;
    }
  }

  return steps;
}
