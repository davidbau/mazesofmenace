/**
 * weapons.js — Weapon initialization and missile combat for Rogue 3.6 JS port.
 * Ported from weapons.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mvwinch, mvwaddch, draw, winat } from './curses.js';
import {
  WEAPON, ARMOR, STICK, FLOOR, PASSAGE, PLAYER, ISMANY, ISMISL,
  DOOR,
} from './const.js';
import { new_item, _attach } from './list.js';
import { roomin } from './rooms.js';

// Weapon constants (indices match w_names in data.js)
const MACE = 0, SWORD = 1, BOW = 2, ARROW = 3, DAGGER = 4, ROCK = 5;
const TWOSWORD = 6, SLING = 7, DART = 8, CROSSBOW = 9, CROSSBOW_BOLT = 10, SPEAR = 11;
const NONE_LAUNCH = 100;

const init_dam = [
  { iw_dam: '2d4',  iw_hrl: '1d3', iw_launch: NONE_LAUNCH, iw_flags: 0 },         // Mace
  { iw_dam: '1d10', iw_hrl: '1d2', iw_launch: NONE_LAUNCH, iw_flags: 0 },         // Long sword
  { iw_dam: '1d1',  iw_hrl: '1d1', iw_launch: NONE_LAUNCH, iw_flags: 0 },         // Bow
  { iw_dam: '1d1',  iw_hrl: '1d6', iw_launch: BOW,         iw_flags: ISMANY|ISMISL }, // Arrow
  { iw_dam: '1d6',  iw_hrl: '1d4', iw_launch: NONE_LAUNCH, iw_flags: ISMISL },    // Dagger
  { iw_dam: '1d2',  iw_hrl: '1d4', iw_launch: SLING,       iw_flags: ISMANY|ISMISL }, // Rock
  { iw_dam: '3d6',  iw_hrl: '1d2', iw_launch: NONE_LAUNCH, iw_flags: 0 },         // 2h sword
  { iw_dam: '0d0',  iw_hrl: '0d0', iw_launch: NONE_LAUNCH, iw_flags: 0 },         // Sling
  { iw_dam: '1d1',  iw_hrl: '1d3', iw_launch: NONE_LAUNCH, iw_flags: ISMANY|ISMISL }, // Dart
  { iw_dam: '1d1',  iw_hrl: '1d1', iw_launch: NONE_LAUNCH, iw_flags: 0 },         // Crossbow
  { iw_dam: '1d2',  iw_hrl: '1d10', iw_launch: CROSSBOW,   iw_flags: ISMANY|ISMISL }, // Crossbow bolt
  { iw_dam: '1d8',  iw_hrl: '1d6', iw_launch: NONE_LAUNCH, iw_flags: ISMISL },    // Spear
];

let _grpnum = 0;

// Injected deps
let _msg = null;
let _get_item = null;
let _dropcheck = null;
let _is_current = null;
let _fight = null;
let _fall = null;
let _light = null;
let _cansee = null;
let _show = null;
let _inv_name = null;
let _addmsg = null;
let _endmsg = null;

export function _setWeaponsDeps(deps) {
  _msg = deps.msg;
  _get_item = deps.get_item;
  _dropcheck = deps.dropcheck;
  _is_current = deps.is_current;
  _fight = deps.fight;
  _fall = deps.fall;
  _light = deps.light;
  _cansee = deps.cansee;
  _show = deps.show;
  _inv_name = deps.inv_name;
  _addmsg = deps.addmsg;
  _endmsg = deps.endmsg;
}

/**
 * missile(ydelta, xdelta): fire a missile.
 */
export async function missile(ydelta, xdelta) {
  const g = game();
  const item = await _get_item('throw', WEAPON);
  if (item === null) return;
  const obj = item.l_data;
  if (!_dropcheck(obj) || (_is_current && _is_current(obj))) return;

  let actual_item = item;
  if (obj.o_count < 2) {
    if (g.pack) detach_from_pack(g, item);
    g.inpack--;
  } else {
    obj.o_count--;
    if (obj.o_group === 0) g.inpack--;
    actual_item = new_item(Object.assign({}, obj, { o_count: 1 }));
  }

  do_motion(actual_item.l_data, ydelta, xdelta);

  const mpos = actual_item.l_data.o_pos;
  if (!isUpperCase(mvwinch(g.mw, mpos.y, mpos.x)) ||
      !await hit_monster(mpos, actual_item.l_data)) {
    if (_fall) await _fall(actual_item, true);
  }
  mvwaddch(g.cw, g.player.t_pos.y, g.player.t_pos.x, PLAYER);
}

function isUpperCase(ch) {
  return ch >= 'A' && ch <= 'Z';
}

function detach_from_pack(g, item) {
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else g.pack = item.l_next;
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_prev = item.l_next = null;
}

/**
 * do_motion(obj, ydelta, xdelta): move an object across the screen.
 */
export function do_motion(obj, ydelta, xdelta) {
  const g = game();
  obj.o_pos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
  for (;;) {
    // Erase old pos
    if (!(obj.o_pos.y === g.player.t_pos.y && obj.o_pos.x === g.player.t_pos.x) &&
        _cansee && _cansee(obj.o_pos.y, obj.o_pos.x) &&
        mvwinch(g.cw, obj.o_pos.y, obj.o_pos.x) !== ' ') {
      mvwaddch(g.cw, obj.o_pos.y, obj.o_pos.x,
        _show ? _show(obj.o_pos.y, obj.o_pos.x) : ' ');
    }
    obj.o_pos = { y: obj.o_pos.y + ydelta, x: obj.o_pos.x + xdelta };
    const ch = winat_safe(g, obj.o_pos.y, obj.o_pos.x);
    if (step_ok_obj(ch) && ch !== DOOR) {
      if (_cansee && _cansee(obj.o_pos.y, obj.o_pos.x) &&
          mvwinch(g.cw, obj.o_pos.y, obj.o_pos.x) !== ' ') {
        mvwaddch(g.cw, obj.o_pos.y, obj.o_pos.x, obj.o_type);
        draw(g.cw);
      }
      continue;
    }
    break;
  }
}

function step_ok_obj(ch) {
  return ch !== ' ' && ch !== '|' && ch !== '-' && !(ch >= 'A' && ch <= 'Z');
}

function winat_safe(g, y, x) {
  if (y < 0 || y >= 24 || x < 0 || x >= 80) return ' ';
  const mc = g.mw[y][x];
  if (mc !== ' ') return mc;
  return g.stdscr[y][x];
}

/**
 * fall(item, pr): drop item somewhere around here.
 */
export async function fall(item, pr) {
  const g = game();
  const obj = item.l_data;
  const fpos = { x: 0, y: 0 };
  if (fallpos(obj.o_pos, fpos, true)) {
    mvAddchStdscr(g, fpos.y, fpos.x, obj.o_type);
    obj.o_pos = { x: fpos.x, y: fpos.y };
    const rp = roomin(g.player.t_pos);
    if (rp !== null && !(rp.r_flags & 0o002 /* ISDARK */)) {
      if (_light) _light(g.player.t_pos);
      mvwaddch(g.cw, g.player.t_pos.y, g.player.t_pos.x, PLAYER);
    }
    const listp = { val: g.lvl_obj };
    _attach(listp, item);
    g.lvl_obj = listp.val;
    return;
  }
  if (pr && _msg) await _msg(`Your ${g.w_names ? g.w_names[obj.o_which] : 'weapon'} vanishes as it hits the ground.`);
  // discard
  item.l_next = item.l_prev = null;
}

function mvAddchStdscr(g, y, x, ch) {
  if (y >= 0 && y < 24 && x >= 0 && x < 80) g.stdscr[y][x] = ch;
}

/**
 * fallpos(pos, newpos, passages): find a random position to drop something.
 */
export function fallpos(pos, newpos, passages) {
  const g = game();
  let cnt = 0;
  for (let y = pos.y - 1; y <= pos.y + 1; y++) {
    for (let x = pos.x - 1; x <= pos.x + 1; x++) {
      if (y === g.player.t_pos.y && x === g.player.t_pos.x) continue;
      const ch = winat_safe(g, y, x);
      if (ch === FLOOR || (passages && ch === PASSAGE)) {
        if (rnd(++cnt) === 0) {
          newpos.y = y;
          newpos.x = x;
        }
      }
    }
  }
  return (cnt !== 0);
}

/**
 * init_weapon(weap, type): set up initial goodies for a weapon.
 */
export function init_weapon(weap, type) {
  const iwp = init_dam[type];
  weap.o_damage = iwp.iw_dam;
  weap.o_hurldmg = iwp.iw_hrl;
  weap.o_launch = iwp.iw_launch;
  weap.o_flags = iwp.iw_flags;
  if (weap.o_flags & ISMANY) {
    weap.o_count = rnd(8) + 8;
    weap.o_group = newgrp();
  } else {
    weap.o_count = 1;
  }
}

/**
 * hit_monster(pos, obj): does missile hit monster?
 */
export async function hit_monster(pos, obj) {
  const mp = { y: pos.y, x: pos.x };
  const g = game();
  const ch = winat_safe(g, pos.y, pos.x);
  return _fight ? await _fight(mp, ch, obj, true) : false;
}

/**
 * num(n1, n2): format plus number.
 */
export function num(n1, n2) {
  if (n1 === 0 && n2 === 0) return '+0';
  if (n2 === 0) return `${n1 < 0 ? '' : '+'}${n1}`;
  return `${n1 < 0 ? '' : '+'}${n1},${n2 < 0 ? '' : '+'}${n2}`;
}

/**
 * wield(): pull out a certain weapon.
 */
export async function wield() {
  const g = game();
  const oweapon = g.cur_weapon;
  // dropcheck current weapon
  const { dropcheck } = await import('./things.js');
  if (!dropcheck(g.cur_weapon)) {
    g.cur_weapon = oweapon;
    return;
  }
  g.cur_weapon = oweapon;
  const item = await _get_item('wield', WEAPON);
  if (item === null) { g.after = false; return; }
  const obj = item.l_data;
  if (obj.o_type === ARMOR) {
    await _msg("You can't wield armor");
    g.after = false;
    return;
  }
  if (_is_current && _is_current(obj)) { g.after = false; return; }
  if (g.terse) _addmsg('W');
  else _addmsg('You are now w');
  await _msg(`ielding ${_inv_name ? _inv_name(obj, true) : 'weapon'}`);
  g.cur_weapon = obj;
}

function newgrp() {
  return ++_grpnum;
}

export function resetGrpnum() {
  _grpnum = 0;
}

export { newgrp, MACE, SWORD, BOW, ARROW, DAGGER, ROCK, TWOSWORD, SLING, DART,
         CROSSBOW, CROSSBOW_BOLT, SPEAR, NONE_LAUNCH };
