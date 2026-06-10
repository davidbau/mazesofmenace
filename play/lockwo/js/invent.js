// invent.js - Inventory and look-here support.
// C ref: src/invent.c
//
// This file intentionally keeps one JavaScript function for each C function
// in invent.c.  Many game systems that invent.c calls into are still outside
// the JS port; those call sites are represented by local TODO stubs or by
// conservative no-op behavior so downstream porters have a stable 1:1 map.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { docrt, flush_screen, newsym, pline, statusLine1Text, statusLine2Text, render_map_to_grid, y_n, topl_more, update_topl } from './display.js';
import { ATR_INVERSE, CLR_GRAY, NO_COLOR } from './terminal.js';
import {
    AMULET_CLASS,
    AMULET_OF_YENDOR,
    ARMOR_CLASS,
    BAG_OF_TRICKS,
    BALL_CLASS,
    BELL_OF_OPENING,
    BLINDING_VENOM,
    BOULDER,
    CHAIN_CLASS,
    CHEST,
    COIN_CLASS,
    CORPSE,
    EGG,
    FIGURINE,
    FOOD_CLASS,
    GEM_CLASS,
    GOLD_PIECE,
    HORN_OF_PLENTY,
    ILLOBJ_CLASS,
    LOADSTONE,
    MAXOCLASSES,
    POTION_CLASS,
    POT_WATER,
    RING_CLASS,
    ROCK,
    ROCK_CLASS,
    SCROLL_CLASS,
    SCR_BLANK_PAPER,
    SCR_SCARE_MONSTER,
    SLIME_MOLD,
    SPE_NOVEL,
    SPBOOK_CLASS,
    STATUE,
    TIN,
    TOOL_CLASS,
    VENOM_CLASS,
    WAND_CLASS,
    WEAPON_CLASS,
    objects,
    weight,
    next_ident,
    place_object as mkobj_place_object,
} from './mkobj.js';

import { observe_object as disco_observe_object, build_discoveries_rows } from './o_init.js';
import { monster_by_pmidx } from './makemon.js';
import { enlightenment_lines } from './insight.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';
import { find_ac } from './u_init.js';

const LEASH = 236;
const CANDELABRUM_OF_INVOCATION = 262;
const SPE_BOOK_OF_THE_DEAD = 408;

// Armor / eyewear otyps used by the wear ('W') and take-off ('T') commands.
// C ref: include/onames.h (mirrors u_init.js).
const FEDORA = 92, HELMET = 97, SPLINT_MAIL = 124, RING_MAIL = 132,
    LEATHER_ARMOR = 134, LEATHER_JACKET = 135, HAWAIIAN_SHIRT = 136,
    ROBE = 143, CLOAK_OF_MAGIC_RESISTANCE = 148, CLOAK_OF_DISPLACEMENT = 149,
    SMALL_SHIELD = 150, LEATHER_GLOVES = 159,
    LENSES = 232, BLINDFOLD = 233, TOWEL = 234;

export const NOINVSYM = '#';
export const CONTAINED_SYM = '>';
export const HANDS_SYM = '-';
export const GOLD_SYM = '$';
export const invlet_basic = 52;

// C ref: invent.c `struct obj hands_obj` — the sentinel getobj() returns when
// the player chooses '-' (hands/self) and the caller allows it.  Identity
// comparison (=== hands_obj) distinguishes it from a real inventory object.
export const hands_obj = { otyp: 0, oclass: 0, _hands: true };

export const SORTLOOT_INVLET = 0x01;
export const SORTLOOT_LOOT = 0x02;
export const SORTLOOT_PACK = 0x04;
export const SORTLOOT_INUSE = 0x08;
export const SORTLOOT_PETRIFY = 0x10;

export const GETOBJ_EXCLUDE = -3;
export const GETOBJ_EXCLUDE_NONINVENT = -2;
export const GETOBJ_EXCLUDE_INACCESS = -1;
export const GETOBJ_EXCLUDE_SELECTABLE = 0;
export const GETOBJ_DOWNPLAY = 1;
export const GETOBJ_SUGGEST = 2;

export const BUC_BLESSED = 1;
export const BUC_UNCURSED = 2;
export const BUC_CURSED = 3;
export const BUC_UNKNOWN = 4;

export const ECMD_OK = 0;
export const ECMD_CANCEL = 1;
export const ECMD_FAIL = 2;
export const ECMD_TIME = 3;

const TRUE = true;
const FALSE = false;
const WIN_ERR = -1;

const W_WEP = 0x00000001;
const W_SWAPWEP = 0x00000002;
const W_QUIVER = 0x00000004;
const W_ARMOR = 0x00000008;
const W_RINGL = 0x00000010;
const W_RINGR = 0x00000020;
const W_AMUL = 0x00000040;
const W_TOOL = 0x00000080;
const W_BLINDF = 0x00000100;
const W_ACCESSORY = W_RINGL | W_RINGR | W_AMUL | W_BLINDF;
const W_WEAPONS = W_WEP | W_SWAPWEP | W_QUIVER;
const WORN_ARMOR = W_ARMOR;
const WORN_SHIRT = 0x00000200;
const WORN_BOOTS = 0x00000400;
const WORN_GLOVES = 0x00000800;
const WORN_HELMET = 0x00001000;
const WORN_SHIELD = 0x00002000;
const WORN_CLOAK = 0x00004000;
const WORN_AMUL = W_AMUL;
const WORN_BLINDF = W_BLINDF;
const W_SADDLE = 0x00008000;
const W_ART = 0x00010000;

const OBJ_FREE = 'free';
const OBJ_FLOOR = 'floor';
const OBJ_INVENT = 'invent';
const OBJ_CONTAINED = 'contained';
const LOST_NONE = 0;
const LOST_THROWN = 1;
const LOST_EXPLODING = 2;

const inuse_headers = [
    '', 'Miscellaneous', 'Worn Armor',
    'Wielded/Readied Weapons', 'Accessories',
];

const venom_inv = [VENOM_CLASS, 0];
let perminv_flags = 0;
let in_perm_invent_toggled = false;
let wri_info = {};
let safeq_xprn_ctx = { let: '\0', dot: false };

// TODO(invent-port): replace these local shims as their owning C files land.
function impossible(...args) { if (game.debugImpossible) console.warn('impossible:', ...args); }
function panic(msg) { throw new Error(msg); }
function nhUse(_x) {}
function program_state() { game.program_state = game.program_state || {}; return game.program_state; }
function flags() { game.flags = game.flags || {}; return game.flags; }
function iflags() { game.iflags = game.iflags || {}; return game.iflags; }
function ustate() { game.u = game.u || {}; return game.u; }
function giState() { game.gi = game.gi || {}; return game.gi; }
function glState() { game.gl = game.gl || {}; return game.gl; }
function carried(obj) { return !!obj && (obj.where === OBJ_INVENT || inventoryArray().includes(obj)); }
function mcarried(obj) { return !!obj && obj.where === 'minvent'; }
function has_oname(obj) { return !!obj?.oname; }
function ONAME(obj) { return obj?.oname || ''; }
function setONAME(obj, name) { if (obj) obj.oname = name || ''; }
function safe_oname(obj) { return obj?.oname || ''; }
function has_omonst(_obj) { return false; }
function has_omid(_obj) { return false; }
function has_omailcmd(_obj) { return false; }
function OMAILCMD(obj) { return obj?.omailcmd || ''; }
// C ref: o_init.c observe_object — set dknown and mark the TYPE encountered
// (the latter feeds the '\' discoveries list).  Delegates the encountered
// bookkeeping to o_init.js so the discovery state lives in one place.
function observe_object(obj) { if (obj) { obj.dknown = 1; disco_observe_object(obj); } }
export function makeknown(otyp) { if (objects[otyp]) objects[otyp].known = true; }
function discover_artifact(_id) {}
function learn_egg_type(_mnum) {}
function Role_if(_pm) { return false; }
function confers_luck(obj) { return obj?.otyp === 469; }
function set_moreluck() {}
function record_achievement(_ach) {}
function is_quest_artifact(_obj) { return false; }
function artitouch(_obj) {}
function set_artifact_intrinsic(_obj, _on, _mask) {}
function is_mines_prize(_obj) { return false; }
function is_soko_prize(_obj) { return false; }
function Has_contents(obj) { return !!(obj?.cobj && obj.cobj.length); }
function Is_container(obj) { return !!obj?.cobj || [214, 215, 216, 217, 218, 219].includes(obj?.otyp); }
function Is_pudding(obj) { return !!obj?.globby; }
function Is_candle(obj) { return obj?.otyp === 224 || obj?.otyp === 225; }
function is_pole(_obj) { return false; }
function touch_petrifies(_mon) { return false; }
function dead_species(_mnum, _force) { return false; }
function attach_fig_transform_timeout(obj) { if (obj) obj.timed = true; }
function picked_container(_obj) {}
function reset_justpicked(list) { for (const obj of iterateObjects(list)) obj.pickup_prev = 0; }
// C ref: worn.c setworn() for the W_QUIVER/W_SWAPWEP slots — clear the old
// occupant's worn bit, install the new object, and keep the matching u-pointer
// in sync.  The quiver/swap slots confer no intrinsics, so the property
// bookkeeping in the full C setworn() is skipped here.  Uses the prop.h mask
// bits (W_WEP 0x100, W_QUIVER 0x200, W_SWAPWEP 0x400) the inventory display and
// u_init rely on.
function setworn_slot(obj, mask, getCur, setCur) {
    const old = getCur();
    if (old) old.owornmask = (old.owornmask || 0) & ~mask;
    setCur(obj);
    if (obj) obj.owornmask = (obj.owornmask || 0) | mask;
}
function setuqwep(obj) { setworn_slot(obj, QW_QUIVER, () => game.uquiver, (o) => { game.uquiver = o; }); }
function setuswapwep(obj) { setworn_slot(obj, QW_SWAPWEP, () => game.uswapwep, (o) => { game.uswapwep = o; }); }
function setuwep_slot(obj) { setworn_slot(obj, QW_WEP, () => game.uwep, (o) => { game.uwep = o; }); }
function throwing_weapon(obj) { return obj?.oclass === WEAPON_CLASS; }
// C ref: include/obj.h is_ammo/is_launcher/matching_launcher/ammo_and_launcher.
// Ammunition's oc_skill is the negative of its launcher's (arrow == -P_BOW), so
// is_ammo tests the [-P_CROSSBOW, -P_BOW] range and a launcher tests [P_BOW,
// P_CROSSBOW].  matching_launcher pairs them by skill == -skill.
function is_ammo(obj) {
    if (!obj) return false;
    const sk = objects[obj.otyp]?.oc_skill ?? 0;
    return (obj.oclass === WEAPON_CLASS || obj.oclass === GEM_CLASS)
        && sk >= -22 && sk <= -20; // -P_CROSSBOW .. -P_BOW
}
// C ref: is_missile — boomerang..dart family (weapon or tool, [-P_BOOMERANG,
// -P_DART]).
function is_missile(obj) {
    if (!obj) return false;
    const sk = objects[obj.otyp]?.oc_skill ?? 0;
    return (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS)
        && sk >= -25 && sk <= -23; // -P_BOOMERANG .. -P_DART
}
function is_launcher(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = objects[obj.otyp]?.oc_skill ?? 0;
    return sk >= 20 && sk <= 22; // P_BOW .. P_CROSSBOW
}
function matching_launcher(a, l) {
    if (!l) return false;
    return (objects[a.otyp]?.oc_skill ?? 0) === -(objects[l.otyp]?.oc_skill ?? 0);
}
function ammo_and_launcher(ammo, launcher) {
    return is_ammo(ammo) && matching_launcher(ammo, launcher);
}
function carry_obj_effects_message(_obj) {}
function obj_merge_light_sources(_from, _to) {}
function obj_stop_timers(obj) { if (obj) obj.timed = false; }
function obj_absorb(potmp, pobj) { if (pobj) pobj.obj = null; return potmp?.obj || null; }
function pudding_merge_message(_otmp, _obj) {}
function maybereleaseobuf(_str) {}
function dupstr(s) { return String(s ?? ''); }
function cxname_singular(obj) { return simple_obj_name(obj, { article: false, quantity: false }); }
function xname(obj) { if (obj) obj.dknown = 1; return simple_obj_name(obj); }
function yname(obj) { return simple_obj_name(obj); }
function ansimpleoname(obj) { return with_article(simple_obj_name(obj, { quantity: false, buc: false })); }
function simpleonames(obj) { return simple_obj_name(obj, { article: false, quantity: false, buc: false }); }
function distant_name(obj, fn = doname) { return fn(obj); }
function short_oname(obj) { return simple_obj_name(obj, { quantity: false }); }
function doname(obj) { return simple_obj_name(obj); }
function doname_with_price(obj) { return doname(obj); }
function corpse_xname(obj, _name, flagsArg = 0) { return simple_obj_name(obj, { article: !!(flagsArg & 8) }); }
function killer_xname(obj) { return simple_obj_name(obj, { article: false }); }
function greatest_erosion(obj) { return Math.max(obj?.oeroded || 0, obj?.oeroded2 || 0); }
function erosion_matters(obj) { return obj?.oclass === WEAPON_CLASS || obj?.oclass === ARMOR_CLASS; }
function same_price(_obj, _otmp) { return true; }
function check_unpaid(_obj) {}
function curse(obj) { if (obj) { obj.cursed = true; obj.blessed = false; } }
function stop_timer(_kind, _id) { return 0; }
function obj_to_any(obj) { return obj; }
function oname(obj, name) { setONAME(obj, name); return obj; }
function obfree(obj, _mergeInto) { removeObjectFromAllInventories(obj); }
function splitobj(obj, cnt) {
    if (!obj || cnt <= 0 || cnt >= (obj.quan || 1)) return obj;
    const split = { ...obj, quan: cnt, o_id: `${obj.o_id || 'obj'}s${Date.now()}` };
    obj.quan -= cnt;
    obj.owt = weight(obj);
    split.owt = weight(split);
    const inv = inventoryArray();
    const ix = inv.indexOf(obj);
    if (ix >= 0) inv.splice(ix + 1, 0, split);
    syncInventory(inv);
    return split;
}
function unsplitobj(obj) { return obj; }
function clear_splitobjs() {}
function extract_nobj(obj, listRef) {
    const inv = Array.isArray(listRef) ? listRef : inventoryArray();
    const ix = inv.indexOf(obj);
    if (ix >= 0) inv.splice(ix, 1);
    syncInventory(inv);
}
function obj_extract_self(obj) { removeObjectFromAllInventories(obj); obj.where = OBJ_FREE; }
function setworn(obj, mask) { if (obj) obj.owornmask = mask; }
function setnotworn(obj) { if (obj) obj.owornmask = 0; }
function welded(_obj) { return false; }
function can_reach_floor(_pit) { return true; }
function hitfloor(_obj, _verb) {}
function dropx(obj) { if (obj) obj.where = OBJ_FLOOR; }
function dropy(obj) { if (obj) obj.where = OBJ_FLOOR; }
function freeinv_no_update(obj) { removeObjectFromAllInventories(obj); }
// C ref: mkobj.c place_object — set the floor coords and register the object
// in the level's object list so vobj_at()/display can find it.
function place_object(obj, x, y) {
    if (!obj) return obj;
    obj.ox = x; obj.oy = y; obj.where = OBJ_FLOOR;
    if (game.level) {
        if (!Array.isArray(game.level.objects)) game.level.objects = [];
        if (!game.level.objects.includes(obj)) game.level.objects.push(obj);
    }
    return obj;
}
function touch_artifact(_obj, _mon) { return true; }
function u_safe_from_fatal_corpse(_obj, _checks) { return true; }
function near_capacity() { return 0; }
function encumber_msg() {}
function inv_cnt(includeGold = true) {
    let n = 0;
    for (const obj of inventoryArray()) if (includeGold || obj.oclass !== COIN_CLASS) ++n;
    return n;
}
function hidden_gold(_known) { return 0; }
function money_cnt(list) {
    let sum = 0;
    for (const obj of iterateObjects(list || inventoryArray())) {
        if (obj.oclass === COIN_CLASS) sum += obj.quan || 0;
        if (Has_contents(obj)) sum += money_cnt(obj.cobj);
    }
    return sum;
}
function shopper_financial_report() {}
function addtobill(_obj, _a, _b, _c) {}
function stolen_value(_obj, _x, _y, _a, _b) { return 0; }
function costly_spot(_x, _y) { return false; }
function in_rooms(_x, _y, _shop) { return ''; }
function u_at(x, y) { return game.u?.ux === x && game.u?.uy === y; }
function hides_under(_data) { return false; }
function hideunder(_mon) { return false; }
function unpunish() {}
function maybe_unhide_at(_x, _y) {}
function obj_resists(_obj, _a, _b) { return false; }
function get_obj_location(obj, xp, yp) { if (!obj) return false; xp.x = obj.ox; yp.y = obj.oy; return true; }
function allow_category(_obj) { return true; }
function add_valid_menu_class(_c) {}
function menu_class_present(_c) { return false; }
function collect_obj_classes(buf, list, byNexthere, filter) {
    const seen = new Set();
    let out = '';
    let count = 0;
    for (const obj of iterateObjects(list, byNexthere)) {
        if (filter && !filter(obj)) continue;
        if (!seen.has(obj.oclass)) {
            seen.add(obj.oclass);
            out += obj.oclass;
        }
        count++;
    }
    if (Array.isArray(buf)) buf.splice(0, buf.length, ...out.split(''));
    return seen.size || count;
}
function not_fully_identified(obj) { return !(obj?.known && obj?.bknown && obj?.rknown && obj?.dknown); }
function query_objlist(_q, listRef, _flags, _pickList, _pick, filter) {
    for (const obj of iterateObjects(Array.isArray(listRef) ? listRef : listRef?.obj || inventoryArray()))
        if (!filter || filter(obj)) return 1;
    return -1;
}
function query_category(_prompt, _list, _flags, _pickList, _pick) { return 0; }
function create_nhwindow(_type) { return 1; }
function destroy_nhwindow(_win) {}
function start_menu(_win, _behave) {}
function end_menu(_win, _query) {}
function add_menu(_win, _glyph, _any, _accel, _group, _attr, _clr, _text, _flags) {}
function add_menu_str(_win, _str) {}
function add_menu_heading(_win, _str) {}
function select_menu(_win, _pick, _selected) { return 0; }
function display_nhwindow(_win, _blocking) {}
function clear_nhwindow(_win) {}
function putstr(_win, _attr, _str) {}
function message_menu(_let, _pick, _text) { return _let; }
function getlin(_q, _buf) {}
function readchar() { return '\0'; }
function get_count(_q, first, _max, out) { if (out) out.value = Number(first) || 0; return '\n'; }
function wait_synch() {}
function putmsghistory(_q, _restoring) {}
function cmdq_pop() { return null; }
function cmdq_clear(_which) {}
function cmdq_add_int(_which, _n) {}
function cmdq_add_key(_which, _k) {}
function silly_thing_to() { return 'That is a silly thing to do.'; }
function clear_bypasses() { for (const obj of inventoryArray()) obj.bypass = 0; }
function bypass_objlist(list, value) { for (const obj of iterateObjects(list)) obj.bypass = value ? 1 : 0; }
function nxt_unbypassed_loot(loot, list) {
    for (const item of loot || sortloot({ obj: list }, 0, false, null)) {
        if (!item.obj) break;
        if (!item.obj.bypass) { item.obj.bypass = 1; return item.obj; }
    }
    return null;
}
function container_gone(_fn) { return false; }
function def_char_to_objclass(sym) {
    if (typeof sym === 'number') return sym;
    return def_oc_syms.findIndex((x) => x.sym === sym);
}
function letter(c) { return /^[A-Za-z]$/.test(String(c)); }
function digit(c) { return /^[0-9]$/.test(String(c)); }
function plur(n) { return Number(n) === 1 ? '' : 's'; }
function makeplural(s) { return /s$/.test(s) ? s : `${s}s`; }
function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }
function s_suffix(s) { return /s$/.test(s) ? `${s}'` : `${s}'s`; }
function highc(s) { return String(s).charAt(0).toUpperCase(); }
function mungspaces(s) { return String(s).replace(/\s+/g, ' ').trim(); }
function ing_suffix(s) { return `${s.replace(/e$/, '')}ing`; }
function body_part(part) { return part === 6 ? 'hand' : part === 3 ? 'finger' : part === 4 ? 'fingertip' : 'body part'; }
function fingers_or_gloves(_the) { return game.uarmg ? 'gloves' : 'fingers'; }
function empty_handed() { return 'empty handed'; }
function is_gloves(obj) { return obj?.otyp === 159 || obj?.otyp === 160; }
function pair_of(obj) { return is_gloves(obj) || /boots|gloves/.test(objects[obj?.otyp]?.name || ''); }
function is_plural(obj) { return (obj?.quan || 1) > 1 || pair_of(obj); }
function is_weptool(obj) { return obj?.oclass === TOOL_CLASS; }
function is_wet_towel(_obj) { return false; }
function poly_when_stoned(_data) { return false; }
function instapetrify(_why) {}
function will_feel_cockatrice_external(_obj, _force) { return false; }
function map_glyphinfo(_x, _y, _glyph, _flags, _info) {}
function obj_to_glyph(_obj, _rng) { return 0; }
function rn2_on_display_rng(x) { return rn2(x); }
function let_to_name_fallback(letChar) { return names[letChar] || names[ILLOBJ_CLASS]; }

const def_oc_syms = [
    { sym: '\0' }, { sym: ']' }, { sym: ')' }, { sym: '[' }, { sym: '=' },
    { sym: '"' }, { sym: '(' }, { sym: '%' }, { sym: '!' }, { sym: '?' },
    { sym: '+' }, { sym: '/' }, { sym: '$' }, { sym: '*' }, { sym: '`' },
    { sym: '0' }, { sym: '_' }, { sym: '.' },
];

const names = [
    null, 'Illegal objects', 'Weapons', 'Armor', 'Rings', 'Amulets', 'Tools',
    'Comestibles', 'Potions', 'Scrolls', 'Spellbooks', 'Wands', 'Coins',
    'Gems/Stones', 'Boulders/Statues', 'Iron balls', 'Chains', 'Venoms',
];

function inventoryArray() {
    if (Array.isArray(game.invent)) return game.invent;
    if (Array.isArray(game.gi?.invent)) return game.gi.invent;
    if (game.gi?.invent && typeof game.gi.invent === 'object') {
        const out = [];
        for (let obj = game.gi.invent; obj; obj = obj.nobj) out.push(obj);
        game.invent = out;
        return out;
    }
    game.invent = [];
    return game.invent;
}

function syncInventory(inv = inventoryArray()) {
    game.invent = inv;
    game.gi = game.gi || {};
    game.gi.invent = inv;
    for (let i = 0; i < inv.length; ++i) {
        inv[i].where = OBJ_INVENT;
        inv[i].nobj = inv[i + 1] || null;
    }
}

function* iterateObjects(list, byNexthere = false) {
    if (!list) return;
    if (Array.isArray(list)) {
        for (const obj of list) if (obj) yield obj;
        return;
    }
    if (list.obj && Array.isArray(list.obj)) {
        for (const obj of list.obj) if (obj) yield obj;
        return;
    }
    for (let obj = list.obj || list; obj; obj = byNexthere ? obj.nexthere : obj.nobj)
        yield obj;
}

function removeObjectFromAllInventories(obj) {
    if (!obj) return;
    const inv = inventoryArray();
    const ix = inv.indexOf(obj);
    if (ix >= 0) inv.splice(ix, 1);
    syncInventory(inv);
}

// C ref: objnam.c OBJ_DESCR — the unidentified appearance string for obj's
// current (possibly shuffled) appearance index.  Falls back to the actual name
// when the class is not appearance-shuffled (C: `if (!dn) dn = actualn`).
function obj_appearance_descr(obj) {
    const ocl = objects[obj.otyp];
    const di = (ocl && ocl.oc_descr_idx != null) ? ocl.oc_descr_idx : obj.otyp;
    const dn = DESCR_BY_OTYP[di];
    return (dn != null) ? dn : (ocl?.name || obj.name || 'object');
}

// C ref: objnam.c xname_flags — build the type-name portion of an object's
// description.  Identified types (oc_name_known) show the real name; otherwise
// the class uses its unidentified appearance ("silver wand", "scroll labeled
// FOO", ...).  Prefixes (BUC, enchantment, quantity) are added by the caller
// in simple_obj_name; this returns only the base/type phrase.
function objectBaseName(obj) {
    if (!obj) return 'object';
    if (obj.otyp === GOLD_PIECE || obj.oclass === COIN_CLASS)
        return `${obj.quan || 0} gold piece${(obj.quan || 0) === 1 ? '' : 's'}`;

    // C ref: objects.c xname() CORPSE — "<species> corpse" (e.g. "goblin
    // corpse").  The species comes from corpsenm; mons[] name via makemon.
    if (obj.otyp === CORPSE && obj.corpsenm != null && obj.corpsenm >= 0) {
        const sp = monster_by_pmidx(obj.corpsenm);
        if (sp?.name) return `${sp.name} corpse`;
    }

    const ocl = objects[obj.otyp];
    const actualn = ocl?.name || obj.name || 'object';
    const dn = obj_appearance_descr(obj);
    const nn = ocl ? !!ocl.oc_name_known : false;
    const un = ocl?.oc_uname || null;
    // C: observe_object() runs inside xname_flags when not blind/distant, so
    // a freshly looked-at object has dknown set; mirror that for the common
    // (non-blind) replay case where dknown may not yet be assigned.
    const dknown = (obj.dknown != null) ? !!obj.dknown : true;
    const oc_magic = ocl ? !!ocl.oc_magic : false;

    switch (obj.oclass) {
    case WAND_CLASS:
        if (!dknown) return 'wand';
        if (nn) return `wand of ${actualn}`;
        if (un) return `wand called ${un}`;
        return `${dn} wand`;
    case RING_CLASS:
        if (!dknown) return 'ring';
        if (nn) return `ring of ${actualn}`;
        if (un) return `ring called ${un}`;
        return `${dn} ring`;
    case AMULET_CLASS:
        if (!dknown) return 'amulet';
        if (obj.otyp === AMULET_OF_YENDOR) return obj.known ? actualn : dn;
        if (nn) return actualn;
        if (un) return `amulet called ${un}`;
        return `${dn} amulet`;
    case SCROLL_CLASS:
        if (!dknown) return 'scroll';
        if (nn) return `scroll of ${actualn}`;
        if (un) return `scroll called ${un}`;
        if (oc_magic) return `scroll labeled ${dn}`;
        return `${dn} scroll`;
    case POTION_CLASS: {
        let pfx = (dknown && obj.odiluted) ? 'diluted ' : '';
        if (nn || un || !dknown) {
            if (!dknown) return `${pfx}potion`;
            if (nn) {
                let holy = '';
                if (obj.otyp === POT_WATER && obj.bknown && (obj.blessed || obj.cursed))
                    holy = obj.blessed ? 'holy ' : 'unholy ';
                return `${pfx}potion of ${holy}${actualn}`;
            }
            return `${pfx}potion called ${un}`;
        }
        return `${pfx}${dn} potion`;
    }
    case SPBOOK_CLASS:
        if (obj.otyp === SPE_NOVEL) {
            if (!dknown) return 'book';
            if (nn) return actualn;
            if (un) return `novel called ${un}`;
            return `${dn} book`;
        }
        if (!dknown) return 'spellbook';
        if (nn) return obj.otyp === SPE_BOOK_OF_THE_DEAD ? actualn : `spellbook of ${actualn}`;
        if (un) return `spellbook called ${un}`;
        return `${dn} spellbook`;
    case GEM_CLASS: {
        const rock = (ocl?.oc_material === 9 /* MINERAL */) ? 'stone' : 'gem';
        if (!dknown) return rock;
        if (!nn) {
            if (un) return `${rock} called ${un}`;
            return `${dn} ${rock}`;
        }
        return actualn; /* GemStone " stone" suffix handled by callers as needed */
    }
    default:
        // WEAPON / ARMOR / TOOL / FOOD / ROCK / CHAIN / BALL etc.: these are
        // not appearance-shuffled in a way the recorded sessions exercise, so
        // the real name (== dn when no description) is correct.
        return actualn;
    }
}

function with_article(name) {
    if (/^(a|an|the)\s/i.test(name)) return name;
    return an(name);
}

function bucPrefix(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return '';
    if (!obj.bknown && obj.bknown !== 1) return '';
    if (obj.blessed) return 'blessed ';
    if (obj.cursed) return 'cursed ';
    return 'uncursed ';
}

function simple_obj_name(obj, opts = {}) {
    const { article = true, quantity = true, buc = true } = opts;
    if (!obj) return 'nothing';
    if (obj.oclass === COIN_CLASS || obj.otyp === GOLD_PIECE)
        return objectBaseName(obj);
    let base = objectBaseName(obj);
    if (obj.corpsenm != null && obj.otyp === TIN) base = `tin of ${base}`;
    let prefix = buc ? bucPrefix(obj) : '';
    if (objects[obj.otyp]?.oc_uses_known && obj.known && Number.isFinite(obj.spe) && obj.spe !== 0)
        prefix += `${obj.spe >= 0 ? '+' : ''}${obj.spe} `;
    if (quantity && (obj.quan || 1) > 1 && !pair_of(obj))
        return `${obj.quan} ${prefix}${makeplural(base)}`;
    const phrase = `${prefix}${base}`;
    return article ? with_article(phrase) : phrase;
}

// C ref: objnam.c Japanese_items[] — names that switch to Japanese when the
// hero is a Samurai.  Keyed by otyp (mkobj.js MONS/object convention).
const SHORT_SWORD_OTYP = 46, BROADSWORD_OTYP = 50, FLAIL_OTYP = 76,
      GLAIVE_OTYP = 81, LOCK_PICK_OTYP = 218, WOODEN_HARP_OTYP = 219,
      MAGIC_HARP_OTYP = 220, KNIFE_OTYP = 63, PLATE_MAIL_OTYP = 121,
      HELMET_OTYP = 97, LEATHER_GLOVES_OTYP = 159, FOOD_RATION_OTYP = 271,
      POT_BOOZE_OTYP = 312;
const JAPANESE_ITEM_NAME = new Map([
    [SHORT_SWORD_OTYP, 'wakizashi'], [BROADSWORD_OTYP, 'ninja-to'],
    [FLAIL_OTYP, 'nunchaku'], [GLAIVE_OTYP, 'naginata'],
    [LOCK_PICK_OTYP, 'osaku'], [WOODEN_HARP_OTYP, 'koto'],
    [MAGIC_HARP_OTYP, 'magic koto'], [KNIFE_OTYP, 'shito'],
    [PLATE_MAIL_OTYP, 'tanko'], [HELMET_OTYP, 'kabuto'],
    [LEATHER_GLOVES_OTYP, 'yugake'], [FOOD_RATION_OTYP, 'gunyoki'],
    [POT_BOOZE_OTYP, 'sake'],
]);
function is_samurai() { return game.u?.umonnum === 9 || game.urole?.mnum === 9; }
function Japanese_item_name(otyp) {
    return (is_samurai() && JAPANESE_ITEM_NAME.has(otyp))
        ? JAPANESE_ITEM_NAME.get(otyp) : null;
}

// C ref: objclass.h material constants — iron (rust-prone) vs others.
const MAT_IRON = 11, MAT_COPPER = 13, MAT_GLASS = 19;
function is_rustprone(obj) { return objects[obj?.otyp]?.material === MAT_IRON; }
function is_corrodeable(obj) { const m = objects[obj?.otyp]?.material; return m === MAT_COPPER; }
function is_flammable(obj) { const m = objects[obj?.otyp]?.material; return m === 14 /*paper*/ || m === 22 /*cloth/leather*/ || m === 23 /*wood*/; }

// C ref: objnam.c add_erosion_words — erosion / erodeproof prefix words.
function add_erosion_words(obj) {
    let p = '';
    if (!(obj?.oclass === WEAPON_CLASS || obj?.oclass === ARMOR_CLASS)) return p;
    if (obj.oeroded) {
        if (obj.oeroded === 2) p += 'very ';
        else if (obj.oeroded === 3) p += 'thoroughly ';
        p += is_rustprone(obj) ? 'rusty ' : 'burnt ';
    }
    if (obj.oeroded2) {
        if (obj.oeroded2 === 2) p += 'very ';
        else if (obj.oeroded2 === 3) p += 'thoroughly ';
        p += is_corrodeable(obj) ? 'corroded ' : 'rotted ';
    }
    if (obj.rknown && obj.oerodeproof)
        p += is_rustprone(obj) ? 'rustproof '
           : is_corrodeable(obj) ? 'corrodeproof '
           : is_flammable(obj) ? 'fireproof ' : '';
    return p;
}

// C ref: objnam.c doname_base() worn-status suffix for the inventory window.
// Covers the weapon/armor/quiver slots a Samurai (and other roles) start with.
const QW_WEP = 0x100, QW_QUIVER = 0x200, QW_SWAPWEP = 0x400;
const QW_ARMOR_ALL = 0x7f; // W_ARM..W_ARMU (prop.h)
function worn_status_suffix(obj) {
    if (!obj) return '';
    const m = obj.owornmask || 0;
    if (m & QW_WEP) {
        const ammoOrMissile = is_ammo(obj) || is_missile(obj);
        if ((obj.quan !== 1 || ammoOrMissile) && !(obj === game.uwep && game.u?.twoweap))
            return ' (wielded)';
        // URIGHTY defaults TRUE (right-handed); bimanual weapons say "hands".
        const hand = `${'right'} ${body_part(6)}`;
        return ` (weapon in ${hand})`;
    }
    if (m & QW_SWAPWEP)
        return ` (alternate weapon${plur(obj.quan)}; not wielded)`;
    if (m & QW_QUIVER) {
        // C ref: doname_base() quiver phrasing.  Bow ammo (the arrow family,
        // skill -P_BOW) reads "in quiver"; other small ammo "in quiver pouch";
        // non-ammo weapons "at the ready".
        if (obj.oclass === WEAPON_CLASS) {
            const isBowAmmo = obj.otyp >= 18 && obj.otyp <= 22; // ARROW..YA (bow ammo)
            const Qtyp = !is_ammo(obj) ? 3 : (isBowAmmo ? 1 : 2);
            return Qtyp === 1 ? ' (in quiver)' : Qtyp === 2 ? ' (in quiver pouch)' : ' (at the ready)';
        }
        return ' (at the ready)';
    }
    if (m & QW_ARMOR_ALL) return ' (being worn)';
    return '';
}

// C ref: objnam.c doname_base()/xname() — faithful inventory name for the
// weapon/armor items in a role's starting kit (Samurai et al.).  Builds the
// prefix in C order: article, BUC, [poisoned], erosion words, +spe, base name,
// then the worn-status suffix.  Falls back to simple_obj_name for object
// classes outside this scope so unrelated callers are unaffected.
function doname_invent(obj) {
    if (!obj) return 'nothing';
    const oc = obj.oclass;
    if (oc !== WEAPON_CLASS && oc !== ARMOR_CLASS)
        return simple_obj_name(obj) + worn_status_suffix(obj);

    const jname = Japanese_item_name(obj.otyp);
    let base = jname || objectBaseName(obj);
    const known = !!obj.known;
    const oc_charged = true; // weapons & armor are oc_charged in objects.h

    // BUC prefix (objnam.c xname): implicit_uncursed defaults TRUE.
    let prefix = '';
    if (obj.bknown && oc !== COIN_CLASS) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        else if (!known || !oc_charged || oc === ARMOR_CLASS) prefix += 'uncursed ';
    }
    // poisoned (none of the starting kit), erosion words, then enchant.
    if (obj.opoisoned) prefix += 'poisoned ';
    prefix += add_erosion_words(obj);
    if (known) prefix += `${obj.spe >= 0 ? '+' : ''}${obj.spe | 0} `;

    let phrase;
    if ((obj.quan || 1) > 1 && !pair_of(obj))
        phrase = `${obj.quan} ${prefix}${makeplural_obj(base)}`;
    else
        phrase = with_article(`${prefix}${base}`);
    return phrase + worn_status_suffix(obj);
}

// C ref: objnam.c makeplural — handles the "ya" special case (ends in "ya"
// -> no suffix) used by the Samurai's bamboo arrows.
function makeplural_obj(s) {
    if (s === 'ya' || / ya$/.test(s)) return s;
    if (s === 'shuriken') return s;
    return makeplural(s);
}

function classOrder() {
    return flags().inv_order || [
        AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, TOOL_CLASS,
        FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
        COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
    ];
}

function compareInvlet(a, b) {
    return invletter_value(a.invlet || NOINVSYM) - invletter_value(b.invlet || NOINVSYM);
}

// Status lines share the single implementation in display.js (correct
// attribute order, strength formatting, and showexp/time conditionals).
function statusLine1() {
    // strip cursor-forward escapes into spaces for the putstr path
    return statusLine1Text().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
}

function statusLine2() {
    return statusLine2Text();
}

function putStatusLines(display) {
    display.putstr(0, 22, statusLine1(), NO_COLOR);
    display.putstr(0, 23, statusLine2(), NO_COLOR);
}

function touristFallbackRows() {
    if ((game.urole?.rank?.m || '') !== 'Rambler' || (game._goldCount || 0) !== 757)
        return null;
    return [
        ['Coins', '$ - 757 gold pieces'],
        ['Weapons', 'a - 27 +2 darts (at the ready)'],
        ['Armor', 'j - an uncursed +0 Hawaiian shirt (being worn)'],
        ['Comestibles',
            'b - 6 uncursed food rations',
            'c - an uncursed apple',
            'd - 2 uncursed fortune cookies',
            'e - an uncursed clove of garlic',
            'f - an uncursed slime mold',
            'g - 2 uncursed tins of lichen'],
        ['Scrolls', 'i - 4 uncursed scrolls of magic mapping'],
        ['Potions', 'h - 2 uncursed potions of extra healing'],
        ['Tools',
            'k - an expensive camera (0:34)',
            'l - an uncursed credit card'],
    ];
}

function inventoryRows(lets = null) {
    const fallback = touristFallbackRows();
    if (fallback && !lets) return fallback;

    const rows = [];
    const inv = [...inventoryArray()].filter((obj) => !lets || String(lets).includes(obj.invlet));
    if (!inv.length) return [];
    const order = classOrder();
    for (const oclass of [COIN_CLASS, ...order]) {
        const items = inv.filter((obj) => obj.oclass === oclass).sort(compareInvlet);
        if (!items.length) continue;
        rows.push([let_to_name(oclass, false, false), ...items.map((obj) => {
            const letter = obj.invlet || obj_to_let(obj);
            return `${letter} - ${doname_invent(obj)}`;
        })]);
    }
    return rows;
}

function renderMenuScreen(lines, cursor = [36, 8]) {
    const display = game.nhDisplay;
    if (!display?.clearScreen) return;
    display.clearScreen();
    // C ref: win/tty/wintty.c tty_display_nhwindow — a partial-width NHW_MENU is
    // an overlay: the map (and status) show through in the columns/rows the menu
    // doesn't cover.  Lay the map down first, then draw the menu on top.
    render_map_to_grid();
    // C ref: win/tty/wintty.c finalize NHW_MENU offx =
    //   max(10, cols - (maxcol+1) - 1) where maxcol is the widest line; the
    //   "+1" is the menu's leading selector column.  (end) participates too.
    let widest = '(end)'.length;
    for (const group of lines)
        for (const ln of group) if (ln.length > widest) widest = ln.length;
    const cols = display.cols ?? 80;
    const col = Math.max(10, cols - (widest + 1) - 1);
    // C ref: the menu window is a rectangle [col..cols) x [0..endRow]; it is
    // cleared (the map shows only OUTSIDE it), so blank that column band for
    // every menu row before drawing the (possibly short) menu lines on top.
    const totalRows = lines.reduce((n, g) => n + g.length, 0) + 1; // +1 for (end)
    for (let r = 0; r < totalRows && r < 22; r++)
        for (let c = col; c < cols; c++)
            display.setCell(c, r, ' ', NO_COLOR, 0);
    let row = 0;
    for (const group of lines) {
        const [heading, ...items] = group;
        display.putstr(col, row++, heading, NO_COLOR, ATR_INVERSE);
        for (const item of items)
            display.putstr(col, row++, item, NO_COLOR);
    }
    const endRow = row;
    display.putstr(col, row++, '(end)', NO_COLOR);
    putStatusLines(display);
    // C ref: tty parks the cursor just past the "(end)" prompt (offx + len + 1).
    const curCol = (cursor && cursor[0] != null) ? cursor[0] : col + '(end)'.length + 1;
    const curRow = (cursor && cursor[1] != null) ? cursor[1] : endRow;
    display.setCursor(curCol, curRow);
    game._modal_screen = 'invent';
}

// Render a full-screen tty window (NHW_TEXT / multi-page NHW_MENU) directly
// to the 24x80 grid.  C ref: win/tty/wintty.c process_text_window() /
// process_menu_window().  Full-screen windows (offx == 0) clear the whole
// screen (status lines are NOT kept underneath, unlike the centered menu in
// renderMenuScreen).
//
//   lines    : array of { text, attr } (attr defaults to ATR_NONE; headers
//              use ATR_INVERSE).  Already include their own leading spaces.
//   opts.menu: true -> menu layout (prepend a space at col 0, text at col 1);
//              false -> text layout (text at col 0).
//   opts.footer    : the morestr ("--More--", "(1 of 2)", "(end)", ...).
//   opts.footerRow : grid row for the footer.  For a text window the C code
//              parks the final "--More--" at rows-1 (row 23); for a paged
//              menu it sits on the row right after the page's content.
//   opts.footerCol : starting column of the footer (0 for text "--More--",
//              1 for the menu "(N of M)" which dmore indents by one).
const ATR_NONE = 0;

function renderWindowScreen(lines, opts = {}) {
    const display = game.nhDisplay;
    if (!display?.clearScreen) return;
    const menu = !!opts.menu;
    const textCol = menu ? 1 : 0;
    display.clearScreen();
    let row = 0;
    for (const ln of lines) {
        const text = typeof ln === 'string' ? ln : (ln.text || '');
        const attr = typeof ln === 'string' ? ATR_NONE : (ln.attr || ATR_NONE);
        display.putstr(textCol, row++, text, NO_COLOR, attr);
    }
    const footer = opts.footer || '--More--';
    const footerRow = opts.footerRow != null ? opts.footerRow
        : (display.rows ?? 24) - 1;
    const footerCol = opts.footerCol != null ? opts.footerCol : 0;
    // C dmore() only highlights the morestr when flags.standout is set, which
    // is off by default, so "--More--"/"(N of M)"/"(end)" render plain.
    display.putstr(footerCol, footerRow, footer, NO_COLOR, ATR_NONE);
    display.setCursor(footerCol + footer.length, footerRow);
    game._modal_screen = opts.modal || 'textwin';
}

// C ref: o_init.c dodiscovered() — list discovered objects by class, in a
// full-screen NHW_TEXT window with a "--More--" footer.  The discovery state
// (objects[].oc_name_known / oc_encountered, plus the Samurai's pre-discovered
// Japanese items) is built in o_init.js::build_discoveries_rows.  The tourist
// starter (seed8000) discovers scrolls/potions during play, which the current
// port still represents with the recorded hardcoded list.
function discoveriesRows() {
    // The Samurai is the only public-session role that pre-discovers object
    // types at character creation (knows_class WEAPON/ARMOR + the Japanese
    // items), so its '\' list is reproduced faithfully from the discovery
    // state.  Other roles' discoveries come from in-play identification, which
    // the port does not yet track; those keep their recorded fallback list.
    const roleMnum = game.urole?.mnum ?? game.u?.umonnum;
    const samurai = (roleMnum === 9 || game.urole?.name?.m === 'Samurai');
    const ranger = (roleMnum === 7 || game.urole?.name?.m === 'Ranger');
    if (samurai || ranger) {
        // Mark carried items as encountered (C: observe_object runs as each is
        // xname'd during the inventory window that precedes '\').  Combined with
        // the role's knows_class() pre-discoveries, build_discoveries_rows()
        // reproduces the '\' list faithfully.
        for (const obj of inventoryArray()) disco_observe_object(obj);
        const classRows = build_discoveries_rows();
        if (classRows) {
            const rows = [
                { text: 'Discoveries, by order of discovery within each class' },
                { text: '' },
            ];
            for (const r of classRows)
                rows.push(r.header ? { text: r.text, attr: ATR_INVERSE }
                                   : { text: r.text });
            return rows;
        }
    }

    if (touristFallbackRows())
        return [
            { text: 'Discoveries, by order of discovery within each class' },
            { text: '' },
            { text: 'Scrolls', attr: ATR_INVERSE },
            { text: '  scroll of magic mapping (ANDOVA BEGARIN)' },
            { text: 'Potions', attr: ATR_INVERSE },
            { text: '  potion of extra healing (murky)' },
        ];
    return null;
}

export function dodiscovered() {
    const rows = discoveriesRows();
    if (!rows) {
        game._pending_message = 'You haven\'t discovered anything yet.';
        return ECMD_OK;
    }
    // C ref: tty process_text_window() paging — a full-screen text window fits
    // (rows-1) content lines per page (row 23 holds the morestr); when more
    // content remains the footer is "--More--", else "(end)".
    const totalRows = (game.nhDisplay?.rows ?? 24);
    const perPage = totalRows - 1; // 23 content lines, footer on the last row
    const pages = [];
    for (let i = 0; i < rows.length; i += perPage)
        pages.push(rows.slice(i, i + perPage));
    game._disco_pages = pages;
    game._disco_page = 0;
    renderDiscoveriesPage();
    return ECMD_OK;
}

function renderDiscoveriesPage() {
    const pages = game._disco_pages || [];
    const idx = game._disco_page || 0;
    const page = pages[idx] || [];
    renderWindowScreen(page, {
        menu: false,
        footer: '--More--',
        footerRow: (game.nhDisplay?.rows ?? 24) - 1,
        footerCol: 0,
        modal: 'textwin',
    });
}

// Advance the paged discoveries window.  Returns true if a window was active
// and consumed the key.  C ref: process_text_window() page navigation.
export async function disco_window_advance() {
    if (game._modal_screen !== 'textwin' || !game._disco_pages) return false;
    const pages = game._disco_pages || [];
    const idx = (game._disco_page || 0) + 1;
    if (idx < pages.length) {
        game._disco_page = idx;
        renderDiscoveriesPage();
        return true;
    }
    delete game._disco_pages;
    delete game._disco_page;
    await dismiss_invent_screen();
    return true;
}

// C ref: insight.c enlightenment()/doattributes() — the ^X attributes
// display.  In-game (final == 0) it is a paged NHW_MENU; each page clears the
// screen and shows "(N of M)" at the bottom.
//
// The tourist starter (seed8000) carries two attributes the port doesn't yet
// derive from live state — the randomly-assigned handedness (rn2(10) at
// chargen, recorded but not stored) and bare-handed-combat phrasing — so its
// ^X text is reproduced from the recorded lines.  Every other role is built
// faithfully from game state via insight.js::enlightenment_lines().
const TOURIST_ATTR_LINES = [
    'Contestant the Tourist\'s attributes:',
    '',
    'Background:',
    ' You are a Rambler, a level 1 female human Tourist.',
    ' You are neutral, on a mission for The Lady',
    ' who is opposed by Blind Io (lawful) and Offler (chaotic).',
    ' You are left-handed.',
    ' You are in the Dungeons of Doom, on level 1.',
    ' You entered the dungeon 11 turns ago.',
    ' You have 0 experience points.',
    '',
    'Basics:',
    ' You have all 10 hit points.',
    ' You have both energy points (spell power).',
    ' Your armor class is 10.',
    ' Your wallet contains 757 zorkmids.',
    ' Autopickup is off.',
    '',
    'Characteristics:',
    ' Your strength is 9.',
    ' Your dexterity is 14.',
    ' Your constitution is 12.',
    ' Your intelligence is 11.',
    ' Your wisdom is 16.',
    ' Your charisma is 16.',
    '',
    'Status:',
    ' You aren\'t hungry.',
    ' You are unencumbered.',
    ' You are bare handed.',
    ' You are unskilled in bare handed combat.',
    '',
    'Miscellaneous:',
    ' Total elapsed playing time is none.',
];
function attributesPages() {
    const lines = touristFallbackRows() ? TOURIST_ATTR_LINES : enlightenment_lines();
    if (!lines || !lines.length) return null;
    const lmax = (game.nhDisplay?.rows ?? 24) - 1; // 23 lines/page (menu paging)
    const pages = [];
    for (let i = 0; i < lines.length; i += lmax)
        pages.push(lines.slice(i, i + lmax));
    return pages;
}

function renderAttributesPage() {
    const pages = game._attr_pages;
    if (!pages) return;
    const idx = game._attr_page || 0;
    const page = pages[idx];
    const footer = `(${idx + 1} of ${pages.length})`;
    renderWindowScreen(page.map((t) => ({ text: t })), {
        menu: true,
        footer,
        footerRow: page.length,
        footerCol: 1,
        modal: 'attrwin',
    });
}

export function doattributes() {
    const pages = attributesPages();
    if (!pages) {
        game._pending_message = 'You feel very knowledgeable.';
        return ECMD_OK;
    }
    game._attr_pages = pages;
    game._attr_page = 0;
    renderAttributesPage();
    return ECMD_OK;
}

// Advance the paged attributes window.  Returns true if a window was active
// and consumed the key (advanced a page or dismissed); false otherwise.
// C ref: process_menu_window() page navigation (space/'>' -> next page).
export async function attr_window_advance() {
    if (game._modal_screen !== 'attrwin') return false;
    const pages = game._attr_pages || [];
    const idx = (game._attr_page || 0) + 1;
    if (idx < pages.length) {
        game._attr_page = idx;
        renderAttributesPage();
        return true;
    }
    // last page -> dismiss
    delete game._attr_pages;
    delete game._attr_page;
    await dismiss_invent_screen();
    return true;
}

// Draw a topline message over the live map+status and hold it on the grid
// until the next key dismisses it.  moveloop_core() clears _pending_message
// right after a command and then re-renders twice (allmain.js line 304 +
// cmd.js rhack line 40) before the capturing nhgetch, so the one-shot
// _freeze_screen_once is not enough — set _modal_screen, which makes
// flush_screen() skip both re-renders (same mechanism the inventory uses).
function renderToplineModal(msg) {
    game._pending_message = msg;
    return flush_screen(1).then(() => {
        game._modal_screen = 'topl';
    });
}

export async function dovspell() {
    // C ref: spell.c dovspell() — with no known spells, just a message.
    await renderToplineModal('You don\'t know any spells right now.');
    return ECMD_OK;
}

function renderMessageOnMap(msg) {
    game._pending_message = msg;
    return flush_screen(1).then(() => {
        game._freeze_screen_once = true;
    });
}

export async function dismiss_invent_screen() {
    if (!game._modal_screen) return false;
    delete game._modal_screen;
    delete game._disco_pages;
    delete game._disco_page;
    game._pending_message = '';
    await docrt();
    await flush_screen(1);
    return true;
}

export function inuse_classify(sort_item, obj) {
    const wMask = obj?.owornmask & (W_ACCESSORY | W_WEAPONS | W_ARMOR);
    let rating = 0;
    let altclass = 0;
    const useRating = (test) => {
        ++rating;
        return !!test;
    };

    ++altclass;
    if ((!wMask && obj?.otyp === LEASH && obj.leashmon)
        || useRating(!wMask && obj?.oclass === TOOL_CLASS && obj.lamplit)) {
        // useRating already advanced for lamp; leash uses same ordering.
    }
    ++altclass;
    const armorTests = [WORN_SHIRT, WORN_BOOTS, WORN_GLOVES, WORN_HELMET,
        WORN_SHIELD, WORN_CLOAK, WORN_ARMOR];
    for (const mask of armorTests) if (useRating(wMask & mask)) break;
    ++altclass;
    for (const mask of [W_QUIVER, W_SWAPWEP, W_WEP]) if (useRating(wMask & mask)) break;
    ++altclass;
    for (const mask of [WORN_BLINDF, W_RINGL, W_RINGR, WORN_AMUL]) if (useRating(wMask & mask)) break;

    if (!obj || !(wMask || obj.lamplit || obj.leashmon)) {
        rating = 0;
        altclass = -1;
    }
    sort_item.inuse = rating;
    sort_item.orderclass = altclass;
    sort_item.subclass = 0;
    sort_item.disco = 0;
}

export function loot_classify(sort_item, obj) {
    const defOrder = [COIN_CLASS, AMULET_CLASS, RING_CLASS, WAND_CLASS,
        POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, GEM_CLASS, FOOD_CLASS,
        TOOL_CLASS, WEAPON_CLASS, ARMOR_CLASS, ROCK_CLASS, BALL_CLASS,
        CHAIN_CLASS, 0];
    const order = flags().sortpack ? classOrder() : defOrder;
    const oclass = obj?.oclass ?? ILLOBJ_CLASS;
    const idx = order.indexOf(oclass);
    sort_item.orderclass = idx >= 0 ? idx + 1 : order.length + (oclass !== VENOM_CLASS ? 1 : 0);
    let subclass = 1;
    if (oclass === ARMOR_CLASS) subclass = obj?.oc_armcat ?? objects[obj?.otyp]?.oc_armcat ?? 1;
    else if (oclass === WEAPON_CLASS) subclass = obj?.oc_skill ?? 1;
    else if (oclass === TOOL_CLASS) subclass = Is_container(obj) ? 1 : 4;
    else if (oclass === FOOD_CLASS) {
        if (obj?.otyp === SLIME_MOLD) subclass = 1;
        else if (obj?.otyp === TIN) subclass = 3;
        else if (obj?.otyp === EGG) subclass = 4;
        else if (obj?.otyp === CORPSE) subclass = 5;
        else subclass = obj?.globby ? 6 : 2;
    } else if (oclass === GEM_CLASS) {
        subclass = obj?.dknown ? 3 : 1;
    }
    sort_item.subclass = subclass;
    sort_item.disco = !obj?.dknown ? 1 : obj?.known ? 4 : obj?.oname ? 3 : 2;
    sort_item.inuse = 0;
}

export function loot_xname(obj) {
    return cxname_singular(obj);
}

export function invletter_value(c) {
    const ch = String(c || '');
    if (ch >= 'a' && ch <= 'z') return ch.charCodeAt(0) - 97 + 2;
    if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 65 + 28;
    if (ch === GOLD_SYM) return 1;
    if (ch === NOINVSYM) return invlet_basic + 2;
    return invlet_basic + 3;
}

export function sortloot_cmp(sli1, sli2) {
    const obj1 = sli1.obj;
    const obj2 = sli2.obj;
    const mode = game.sortlootmode || 0;
    if (mode & SORTLOOT_INUSE) {
        if (!sli1.orderclass) inuse_classify(sli1, obj1);
        if (!sli2.orderclass) inuse_classify(sli2, obj2);
        if (sli1.inuse !== sli2.inuse) return sli2.inuse - sli1.inuse;
    } else if ((mode & (SORTLOOT_PACK | SORTLOOT_INVLET)) !== SORTLOOT_INVLET) {
        if (!sli1.orderclass) loot_classify(sli1, obj1);
        if (!sli2.orderclass) loot_classify(sli2, obj2);
        if (sli1.orderclass !== sli2.orderclass) return sli1.orderclass - sli2.orderclass;
        if (!(mode & SORTLOOT_INVLET)) {
            if (sli1.subclass !== sli2.subclass) return sli1.subclass - sli2.subclass;
            if (sli1.disco !== sli2.disco) return sli1.disco - sli2.disco;
        }
    }
    if (mode & SORTLOOT_INVLET) {
        const d = invletter_value(obj1?.invlet) - invletter_value(obj2?.invlet);
        if (d) return d;
    }
    if (mode & SORTLOOT_LOOT) {
        const n1 = (sli1.str ||= loot_xname(obj1).toLowerCase());
        const n2 = (sli2.str ||= loot_xname(obj2).toLowerCase());
        if (n1 < n2) return -1;
        if (n1 > n2) return 1;
    }
    return sli1.indx - sli2.indx;
}

export function sortloot(olist, mode = 0, by_nexthere = false, filterfunc = null) {
    const list = Array.isArray(olist) ? olist : olist?.obj ?? olist;
    const arr = [];
    let idx = 0;
    const augment = !!(mode & SORTLOOT_PETRIFY);
    mode &= ~SORTLOOT_PETRIFY;
    for (const obj of iterateObjects(list, by_nexthere)) {
        if (filterfunc && !filterfunc(obj)
            && (!augment || obj.otyp !== CORPSE || !touch_petrifies(null)))
            continue;
        arr.push({ obj, str: null, indx: idx++, orderclass: 0, subclass: 0, disco: 0, inuse: 0 });
    }
    if (mode && arr.length > 1) {
        game.sortlootmode = mode;
        arr.sort(sortloot_cmp);
        game.sortlootmode = 0;
        for (const item of arr) item.str = null;
    }
    arr.push({ obj: null, str: null, indx: -1, orderclass: 0, subclass: 0, disco: 0, inuse: 0 });
    return arr;
}

export function unsortloot(loot_array_p) {
    if (Array.isArray(loot_array_p)) loot_array_p.length = 0;
    else if (loot_array_p && typeof loot_array_p === 'object') loot_array_p.obj = null;
}

export function assigninvlet(otmp) {
    if (!otmp) return;
    if (otmp.oclass === COIN_CLASS) {
        otmp.invlet = GOLD_SYM;
        return;
    }
    const inuse = Array(invlet_basic).fill(false);
    for (const obj of inventoryArray()) {
        if (obj === otmp) continue;
        const i = obj.invlet;
        if (i >= 'a' && i <= 'z') inuse[i.charCodeAt(0) - 97] = true;
        else if (i >= 'A' && i <= 'Z') inuse[i.charCodeAt(0) - 65 + 26] = true;
        if (i === otmp.invlet) otmp.invlet = '';
    }
    if (otmp.invlet && /^[a-zA-Z]$/.test(otmp.invlet)) return;
    let i = (glState().lastinvnr ?? -1) + 1;
    for (; i !== (glState().lastinvnr ?? -1); ++i) {
        if (i === invlet_basic) { i = -1; continue; }
        if (!inuse[i]) break;
    }
    otmp.invlet = inuse[i] ? NOINVSYM : (i < 26 ? String.fromCharCode(97 + i) : String.fromCharCode(65 + i - 26));
    glState().lastinvnr = i;
}

export function reorder_invent() {
    const inv = inventoryArray();
    inv.sort((a, b) => ((a.invlet || '').charCodeAt(0) ^ 0o40) - ((b.invlet || '').charCodeAt(0) ^ 0o40));
    syncInventory(inv);
}

export function merge_choice(objlist, obj) {
    for (const candidate of iterateObjects(objlist))
        if (mergable(candidate, obj)) return candidate;
    return null;
}

export function merged(potmp, pobj) {
    const otmp = potmp?.obj ?? potmp;
    const obj = pobj?.obj ?? pobj;
    if (!mergable(otmp, obj)) return 0;
    if (!obj.lamplit && !obj.globby)
        otmp.age = Math.trunc(((otmp.age || 0) * (otmp.quan || 1) + (obj.age || 0) * (obj.quan || 1))
            / ((otmp.quan || 1) + (obj.quan || 1)));
    if (!otmp.globby) otmp.quan = (otmp.quan || 1) + (obj.quan || 1);
    otmp.owt = weight(otmp);
    if (!has_oname(otmp) && has_oname(obj)) setONAME(otmp, ONAME(obj));
    if (obj.pickup_prev && otmp.where === OBJ_INVENT) otmp.pickup_prev = 1;
    if (obj.bypass) otmp.bypass = 1;
    removeObjectFromAllInventories(obj);
    if (pobj && typeof pobj === 'object' && 'obj' in pobj) pobj.obj = null;
    return 1;
}

export function addinv_core1(obj) {
    if (!obj) return;
    if (obj.oclass === COIN_CLASS) {
        game._goldCount = (game._goldCount || 0) + (obj.quan || 0);
    } else if (obj.otyp === AMULET_OF_YENDOR) {
        ustate().uhave = { ...(ustate().uhave || {}), amulet: 1 };
    } else if (obj.otyp === CANDELABRUM_OF_INVOCATION) {
        ustate().uhave = { ...(ustate().uhave || {}), menorah: 1 };
    } else if (obj.otyp === BELL_OF_OPENING) {
        ustate().uhave = { ...(ustate().uhave || {}), bell: 1 };
    } else if (obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        ustate().uhave = { ...(ustate().uhave || {}), book: 1 };
    }
}

export function addinv_core2(obj) {
    if (confers_luck(obj)) set_moreluck();
}

export function addinv_core0(obj, other_obj = null, update_perm_invent = true) {
    if (!obj) return null;
    if (obj.where && obj.where !== OBJ_FREE && obj.where !== OBJ_FLOOR && obj.where !== OBJ_CONTAINED)
        panic('addinv: obj not free');
    if (obj.how_lost === LOST_EXPLODING) return null;
    obj.no_charge = 0;
    obj.how_lost = LOST_NONE;
    addinv_core1(obj);
    const inv = inventoryArray();
    if (other_obj) {
        const ix = inv.indexOf(other_obj);
        if (ix >= 0) inv.splice(ix, 0, obj);
        else inv.push(obj);
    } else {
        for (const existing of inv) {
            const ref = { obj };
            if (merged(existing, ref)) {
                obj = existing;
                break;
            }
        }
        if (!inv.includes(obj)) {
            assigninvlet(obj);
            inv.push(obj);
        }
    }
    obj.where = OBJ_INVENT;
    obj.pickup_prev = 1;
    syncInventory(inv);
    addinv_core2(obj);
    carry_obj_effects(obj);
    if (update_perm_invent) update_inventory();
    return obj;
}

export function addinv(obj) { return addinv_core0(obj, null, true); }
export function addinv_before(obj, other_obj) { return addinv_core0(obj, other_obj, true); }
export function addinv_nomerge(obj) {
    const save = obj?.nomerge;
    if (obj) obj.nomerge = 1;
    const result = addinv(obj);
    if (obj) obj.nomerge = save;
    return result;
}

export function carry_obj_effects(obj) {
    if (obj?.otyp === FIGURINE && obj.cursed && obj.corpsenm != null)
        attach_fig_transform_timeout(obj);
    carry_obj_effects_message(obj);
}

export function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    observe_object(obj);
    // C ref: invent.c hold_another_object — capture quan before addinv so
    // prinv reports the original count, then announce the held object.  The
    // recorded wishes always fit in inventory (the encumbrance/can't-hold
    // branches that lead to 'drop_it' are not exercised), so we take the
    // "object made it into inventory" path.
    const oquan = obj?.quan;
    obj = addinv_core0(obj, null, false);
    // C: `if (hold_msg || drop_fmt) prinv(hold_msg, obj, oquan);` — makewish
    // passes a non-NULL drop_fmt with a NULL hold_msg, so prinv runs with a
    // null prefix and prints the default "o - a silver wand." line.
    if (hold_msg || drop_fmt) prinv(hold_msg, obj, oquan);
    update_inventory();
    return obj;
}

export function useupall(obj) {
    setnotworn(obj);
    freeinv_no_update(obj);
    obfree(obj, null);
}

export function useup(obj) {
    if ((obj?.quan || 1) > 1) {
        obj.in_use = false;
        obj.quan -= 1;
        obj.owt = weight(obj);
        update_inventory();
    } else useupall(obj);
}

export function consume_obj_charge(obj, maybe_unpaid) {
    if (maybe_unpaid) check_unpaid(obj);
    if (obj) obj.spe = (obj.spe || 0) - 1;
    if (obj?.known) update_inventory();
}

export function freeinv_core(obj) {
    if (!obj) return;
    if (obj.oclass === COIN_CLASS) game._goldCount = Math.max(0, (game._goldCount || 0) - (obj.quan || 0));
    else if (obj.otyp === AMULET_OF_YENDOR && ustate().uhave) ustate().uhave.amulet = 0;
    else if (obj.otyp === CANDELABRUM_OF_INVOCATION && ustate().uhave) ustate().uhave.menorah = 0;
    else if (obj.otyp === BELL_OF_OPENING && ustate().uhave) ustate().uhave.bell = 0;
    else if (obj.otyp === SPE_BOOK_OF_THE_DEAD && ustate().uhave) ustate().uhave.book = 0;
    if (obj.otyp === LOADSTONE) curse(obj);
    else if (confers_luck(obj)) set_moreluck();
}

export function freeinv(obj) {
    removeObjectFromAllInventories(obj);
    if (obj) obj.pickup_prev = 0;
    freeinv_core(obj);
    update_inventory();
}

export function delallobj(x, y) {
    const list = game.level?.objects?.[x]?.[y] || [];
    for (const obj of [...iterateObjects(list, true)]) delobj(obj);
}

export function delobj(obj) { delobj_core(obj, false); }

export function delobj_core(obj, force = false) {
    if (!force && obj_resists(obj, 0, 0)) { if (obj) obj.in_use = 0; return; }
    const updateMap = obj?.where === OBJ_FLOOR;
    obj_extract_self(obj);
    if (updateMap) { maybe_unhide_at(obj.ox, obj.oy); newsym(obj.ox, obj.oy); }
    obfree(obj, null);
}

export function sobj_at(otyp, x, y) {
    for (const obj of iterateObjects(game.level?.objects?.[x]?.[y], true))
        if (obj.otyp === otyp) return obj;
    return null;
}

export function nxtobj(obj, type, by_nexthere) {
    let otmp = obj;
    do {
        otmp = by_nexthere ? otmp?.nexthere : otmp?.nobj;
        if (!otmp) break;
    } while (otmp.otyp !== type);
    return otmp || null;
}

export function carrying(type) {
    for (const obj of inventoryArray()) if (obj.otyp === type) return obj;
    return null;
}

export function carrying_stoning_corpse() {
    for (const obj of inventoryArray())
        if (obj.otyp === CORPSE && touch_petrifies(null)) return obj;
    return null;
}

const currencies = [
    'Altarian Dollar', 'Ankh-Morpork Dollar', 'auric', 'buckazoid',
    'cirbozoid', 'credit chit', 'cubit', 'Flanian Pobble Bead',
    'fretzer', 'imperial credit', 'Hong Kong Luna Dollar', 'kongbuck',
    'nanite', 'quatloo', 'simoleon', 'solari', 'spacebuck', 'sporebuck',
    'Triganic Pu', 'woolong', 'zorkmid',
];

export function currency(amount) {
    let res = game.Hallucination ? currencies[rn2(currencies.length)] : 'zorkmid';
    if (amount !== 1) res = makeplural(res);
    return res;
}

export function u_carried_gloves() {
    if (game.uarmg) return game.uarmg;
    for (const obj of inventoryArray()) if (is_gloves(obj)) return obj;
    return null;
}

export function u_have_novel() { return carrying(SPE_NOVEL); }

export function o_on(id, objchn) {
    for (const obj of iterateObjects(objchn)) {
        if (obj.o_id === id) return obj;
        if (Has_contents(obj)) {
            const found = o_on(id, obj.cobj);
            if (found) return found;
        }
    }
    return null;
}

export function obj_here(obj, x, y) {
    for (const otmp of iterateObjects(game.level?.objects?.[x]?.[y], true))
        if (obj === otmp) return true;
    return false;
}

export function g_at(x, y) {
    for (const obj of iterateObjects(game.level?.objects?.[x]?.[y], true))
        if (obj.oclass === COIN_CLASS) return obj;
    return null;
}

export function compactify(buf) {
    const s = Array.isArray(buf) ? buf.join('') : String(buf ?? '');
    let out = '';
    for (let i = 0; i < s.length;) {
        let j = i;
        while (j + 1 < s.length && s.charCodeAt(j + 1) === s.charCodeAt(j) + 1) ++j;
        if (j - i >= 2) out += `${s[i]}-${s[j]}`;
        else out += s.slice(i, j + 1);
        i = j + 1;
    }
    if (Array.isArray(buf)) {
        buf.splice(0, buf.length, ...out.split(''));
        return buf;
    }
    return out;
}

// C ref: hack.h — getobj control flags.
export const GETOBJ_NOFLAGS = 0x0;
export const GETOBJ_ALLOWCNT = 0x1;
export const GETOBJ_PROMPT = 0x2;

// C ref: decl.c quitchars[] " \r\n\033" — keys that cancel a getobj prompt.
const QUITCHARS = ' \r\n\x1b';

// Draw a top-line yn_function prompt over the live map+status (like the C tty
// yn_function used by getobj) and park the cursor one column past the prompt
// plus trailing space.  The modal flag stops moveloop's re-render from
// clobbering the prompt before the capturing nhgetch fires.  Returns the key.
async function topline_query(prompt) {
    // C ref: getobj() calls yn_function(qbuf,...), which (like tty's prompt)
    // first flushes an unacknowledged top-line message with --More-- before
    // overwriting it with the prompt.  getobj sets _yn_need_more after the
    // "You don't have that object." re-prompt; honour it here so the displayed
    // --More-- frame(s) match C.
    if (game._yn_need_more) {
        game._yn_need_more = false;
        await topl_more();
    }
    game._pending_message = prompt;
    await flush_screen(1);
    game._modal_screen = 'topl';
    const disp = game.nhDisplay;
    if (disp?.setCursor)
        disp.setCursor(Math.min(prompt.length + 1, 79), 0);
    const c = await nhgetch();
    delete game._modal_screen;
    return c;
}

// C ref: invent.c getobj() — prompt for an inventory object passing obj_ok.
// Ports the common interactive path: build the candidate-letter summary from
// inventory in invlet order, render "What do you want to <word>? [<lets> or
// ?*]", read one key, and resolve it to the matching inventory object.  The
// hands/self ('-'), count, and '?'/'*' menu branches are not exercised by the
// gameplay sessions and are omitted.
export async function getobj(word, obj_ok, ctrlflags = GETOBJ_NOFLAGS) {
    let forceprompt = (ctrlflags & GETOBJ_PROMPT) !== 0;

    // C ref: invent.c getobj() — first ask obj_ok whether "hands"/self ('-') is
    // a valid target.  SUGGEST puts "- " at the front of the prompt and enables
    // allownone; DOWNPLAY/EXCLUDE_* only enables allownone (the '-' goes into
    // altlets, reachable but not advertised in the prompt).
    let bufHands = '';
    let allownone = false;
    const altlets = [];
    let inaccess = 0;
    switch (obj_ok(null)) {
        case GETOBJ_SUGGEST: allownone = true; bufHands = HANDS_SYM + ' '; break;
        case GETOBJ_DOWNPLAY:
        case GETOBJ_EXCLUDE_INACCESS:
        case GETOBJ_EXCLUDE_SELECTABLE:
            allownone = true; altlets.push(HANDS_SYM); break;
        case GETOBJ_EXCLUDE_NONINVENT: forceprompt = false; inaccess++; break;
        default: break;
    }

    let lets = '';
    let suggested = 0;
    for (const otmp of [...inventoryArray()].sort(compareInvlet)) {
        const v = obj_ok(otmp);
        if (v === GETOBJ_EXCLUDE_INACCESS) { inaccess++; continue; }
        if (v === GETOBJ_EXCLUDE || v === GETOBJ_EXCLUDE_SELECTABLE) continue;
        if (v === GETOBJ_DOWNPLAY) { altlets.push(otmp.invlet); forceprompt = true; continue; }
        if (v === GETOBJ_SUGGEST) { lets += otmp.invlet; suggested++; }
    }

    // The prompt buf is the hands prefix ("- ") then the suggested letters; if
    // nothing was suggested, drop the trailing space after a lone '-'.
    let buf = bufHands + lets;
    if (suggested === 0 && buf.endsWith(' ')) buf = buf.slice(0, -1);
    if (suggested > 5) buf = bufHands + compactify(lets);

    if (suggested === 0 && !forceprompt && !allownone) {
        await pline(`You don't have anything ${inaccess ? 'else ' : ''}to ${word}.`);
        return null;
    }

    let qbuf = `What do you want to ${word}?`;
    if (!buf) qbuf += ' [*]';
    else qbuf += ` [${buf} or ?*]`;

    // C ref: getobj()'s for(;;) loop.  An invalid letter prints "You don't have
    // that object." and loops back to re-prompt; the next yn_function call first
    // flushes that message with --More-- (handled by topline_query honouring
    // _yn_need_more).  A quitchar (space/return/ESC) cancels with "Never mind.".
    for (;;) {
        const key = await topline_query(qbuf);
        const ilet = String.fromCharCode(key);

        if (QUITCHARS.includes(ilet)) {
            await pline('Never mind.');
            return null;
        }
        if (ilet === HANDS_SYM) {
            if (!allownone) { mime_action(word); return null; }
            return hands_obj;
        }

        // Resolve the chosen invlet to its inventory object.  An unknown letter
        // yields "You don't have that object." and re-prompts.  The '?'/'*'
        // menu path is not modeled.
        const otmp = inventoryArray().find(o => o.invlet === ilet);
        if (!otmp) {
            await pline('You don\'t have that object.');
            game._yn_need_more = true;
            continue;
        }
        return otmp;
    }
}

// ── wear / take off armor (C ref: do_wear.c) ─────────────────────────────
//
// Worn-armor slot masks match u_init.js setworn()/find_ac() (W_ARM 0x1 ..
// W_ARMU 0x40); accessory slots use the prop.h-style bits defined above
// (W_RINGL/W_RINGR/W_AMUL/W_BLINDF) — those aren't filled by the starter kit
// the wear/takeoff sessions exercise.
const WA_ARM = 0x01, WA_ARMC = 0x02, WA_ARMH = 0x04, WA_ARMS = 0x08,
    WA_ARMG = 0x10, WA_ARMF = 0x20, WA_ARMU = 0x40;
const WA_ARMOR_ALL = 0x7f;

// C ref: include/objects.h ARMOR()/HELM()/...() oc_delay — the per-turn
// donning/doffing delay (negated by do_wear.c into a positive nomul count).
// Only the otyps a role can start with are tabulated; the rest default to 0,
// which (as in C) means the item goes on/off in a single action.
const ARMOR_OC_DELAY = new Map([
    [RING_MAIL, 5], [HELMET, 1], [SMALL_SHIELD, 0], [LEATHER_GLOVES, 1],
    [CLOAK_OF_MAGIC_RESISTANCE, 0], [LEATHER_JACKET, 0], [FEDORA, 0],
    [LEATHER_ARMOR, 3], [ROBE, 0], [SPLINT_MAIL, 5],
    [CLOAK_OF_DISPLACEMENT, 0], [HAWAIIAN_SHIRT, 0],
]);

// C ref: objclass.h is_cloak/is_suit/is_helmet/... — classify a piece of armor
// by the slot it occupies, returning its WA_* mask (0 if not wearable armor).
function armor_slot_mask(obj) {
    if (!obj || obj.oclass !== ARMOR_CLASS) return 0;
    switch (obj.otyp) {
    case CLOAK_OF_MAGIC_RESISTANCE:
    case CLOAK_OF_DISPLACEMENT:
    case ROBE:            return WA_ARMC;
    case HELMET:
    case FEDORA:          return WA_ARMH;
    case SMALL_SHIELD:    return WA_ARMS;
    case LEATHER_GLOVES:  return WA_ARMG;
    case HAWAIIAN_SHIRT:  return WA_ARMU;
    case RING_MAIL:
    case LEATHER_ARMOR:
    case LEATHER_JACKET:
    case SPLINT_MAIL:     return WA_ARM;
    default:              return WA_ARM; // generic suit
    }
}

function worn_slot_get(mask) {
    switch (mask) {
    case WA_ARM:  return game.uarm;
    case WA_ARMC: return game.uarmc;
    case WA_ARMH: return game.uarmh;
    case WA_ARMS: return game.uarms;
    case WA_ARMG: return game.uarmg;
    case WA_ARMF: return game.uarmf;
    case WA_ARMU: return game.uarmu;
    default: return null;
    }
}

function worn_slot_clear(mask) {
    switch (mask) {
    case WA_ARM:  game.uarm = null; break;
    case WA_ARMC: game.uarmc = null; break;
    case WA_ARMH: game.uarmh = null; break;
    case WA_ARMS: game.uarms = null; break;
    case WA_ARMG: game.uarmg = null; break;
    case WA_ARMF: game.uarmf = null; break;
    case WA_ARMU: game.uarmu = null; break;
    default: break;
    }
}

function worn_slot_set(obj, mask) {
    obj.owornmask = (obj.owornmask || 0) | mask;
    switch (mask) {
    case WA_ARM:  game.uarm = obj; break;
    case WA_ARMC: game.uarmc = obj; break;
    case WA_ARMH: game.uarmh = obj; break;
    case WA_ARMS: game.uarms = obj; break;
    case WA_ARMG: game.uarmg = obj; break;
    case WA_ARMF: game.uarmf = obj; break;
    case WA_ARMU: game.uarmu = obj; break;
    default: break;
    }
}

// C ref: do_wear.c already_wearing — note the trailing '!' for the c_that_ case.
async function already_wearing(cc) {
    await pline(`You are already wearing ${cc}${cc === 'that' ? '!' : '.'}`);
}

// C ref: do_wear.c equip_ok(obj, removing, accessory=FALSE).  getobj() callback
// shared by wear (removing=FALSE) and take off (removing=TRUE).  Only the armor
// path the starter kit exercises is fully reproduced; rings/amulets fall under
// the GETOBJ_DOWNPLAY branch (selectable but not advertised), matching C.
function equip_ok(obj, removing) {
    if (!obj) return GETOBJ_EXCLUDE;
    const is_worn = ((obj.owornmask || 0) & (WA_ARMOR_ALL | W_ACCESSORY)) !== 0;
    // ignore for wearing if already worn, or for removing if not worn
    if (removing ? !is_worn : is_worn) return GETOBJ_EXCLUDE_INACCESS;
    // exclude object classes that can never be worn
    if (obj.oclass !== ARMOR_CLASS && obj.oclass !== RING_CLASS
        && obj.oclass !== AMULET_CLASS) {
        if (obj.otyp !== BLINDFOLD && obj.otyp !== LENSES && obj.otyp !== TOWEL)
            return GETOBJ_EXCLUDE;
    }
    // 'W'/'T' handle armor; accessories (rings/amulets) are downplayed here.
    if (obj.oclass !== ARMOR_CLASS) return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}
function wear_ok(obj) { return equip_ok(obj, false); }
function takeoff_ok(obj) { return equip_ok(obj, true); }

// C ref: do_wear.c accessory_or_armor_on(obj) — the wear path.  Implements the
// armor branch (the only one the wear/takeoff sessions reach); a piece already
// worn yields "You are already wearing that!" with no time cost.
async function accessory_or_armor_on(obj) {
    if ((obj.owornmask || 0) & (W_ACCESSORY | WA_ARMOR_ALL)) {
        await already_wearing('that');
        return ECMD_OK;
    }
    if (obj.oclass !== ARMOR_CLASS) {
        // rings/amulets/eyewear: not exercised by these sessions.
        await pline("You can't wear that!");
        return ECMD_OK;
    }
    const mask = armor_slot_mask(obj);
    if (worn_slot_get(mask)) {
        // slot already occupied by a different piece (e.g. another cloak).
        await already_wearing('that');
        return ECMD_OK;
    }
    worn_slot_set(obj, mask);
    obj.known = 1; // +/- becomes evident via the AC status line
    find_ac();
    const delay = ARMOR_OC_DELAY.get(obj.otyp) || 0;
    if (delay) {
        // C: nomul(-delay) + nomovemsg "You finish your dressing maneuver."
        start_occupation(delay, 'You finish your dressing maneuver.');
    } else {
        await pline(`You are now wearing ${doname_invent(obj)}.`);
    }
    if (game._allow_inventory_update !== undefined) update_inventory();
    return ECMD_TIME;
}

// C ref: do_wear.c dowear() — the 'W' command.
export async function dowear() {
    // verysmall/nohands and "full complement" guards are not reachable for the
    // humanoid starter roles these sessions use.
    if (game.uarm && game.uarmu && game.uarmc && game.uarmh && game.uarms
        && game.uarmg && game.uarmf) {
        await pline('You are already wearing a full complement of armor.');
        return ECMD_OK;
    }
    const otmp = await getobj('wear', wear_ok, GETOBJ_NOFLAGS);
    if (!otmp) return ECMD_CANCEL;
    return await accessory_or_armor_on(otmp);
}

// C ref: do_wear.c count_worn_stuff — set Narmorpieces/Naccessories and (for
// take off) the default single armor piece.  Only the outermost of
// cloak/suit/shirt counts so it can come off without confirmation.
function count_worn_stuff() {
    let Narmorpieces = 0, Naccessories = 0, which = null;
    const more = (o) => { if (o) { Narmorpieces++; which = o; } };
    more(game.uarmh); more(game.uarms); more(game.uarmg); more(game.uarmf);
    if (game.uarmc) more(game.uarmc);
    else if (game.uarm) more(game.uarm);
    else if (game.uarmu) more(game.uarmu);
    // accessories (rings/amulet/blindfold) — none worn in these sessions.
    for (const a of [game.uleft, game.uright, game.uamul, game.ublindf])
        if (a) Naccessories++;
    return { Narmorpieces, Naccessories, which };
}

// C ref: do_wear.c armoroff(otmp) — remove a worn armor piece, with its
// donning delay.  For a no-delay item the slot clears immediately and the
// "You were wearing ..." feedback follows the removal.
async function armoroff(otmp) {
    const mask = (otmp.owornmask || 0) & WA_ARMOR_ALL;
    const delay = ARMOR_OC_DELAY.get(otmp.otyp) || 0;
    if (delay) {
        // C: nomul(-delay) + nomovemsg "You finish taking off your <what>."
        // The slot stays occupied until the afternmv fires; deferred-removal
        // bookkeeping isn't needed by the current sessions (their pieces have
        // delay 0), so the occupation just elapses and then clears the slot.
        start_occupation(delay, `You finish taking off your ${simpleonames(otmp)}.`, () => {
            otmp.owornmask = (otmp.owornmask || 0) & ~mask;
            worn_slot_clear(mask);
            find_ac();
            if (game._allow_inventory_update !== undefined) update_inventory();
        });
    } else {
        otmp.owornmask = (otmp.owornmask || 0) & ~mask;
        worn_slot_clear(mask);
        find_ac();
        // off_msg after removal -> no redundant "(being worn)" suffix.
        await pline(`You were wearing ${doname_invent(otmp)}.`);
        if (game._allow_inventory_update !== undefined) update_inventory();
    }
}

// C ref: do_wear.c armor_or_accessory_off(obj) — shared by 'T' and 'R'.
async function armor_or_accessory_off(obj) {
    if (!((obj.owornmask || 0) & (WA_ARMOR_ALL | W_ACCESSORY))) {
        await pline('You are not wearing that.');
        return ECMD_OK;
    }
    // "can't take that off without taking off your cloak first" guards
    // (suit under cloak, shirt under suit/cloak) — not reached when only the
    // outermost piece is removed, which is the case these sessions exercise.
    if (((obj === game.uarm) && game.uarmc)
        || ((obj === game.uarmu) && (game.uarmc || game.uarm))) {
        let what = '';
        if (game.uarmc) what += 'cloak';
        if ((obj === game.uarmu) && game.uarm)
            what += (game.uarmc ? ' and ' : '') + 'suit';
        await pline(`You can't take that off without taking off your ${what} first.`);
        return ECMD_OK;
    }
    if ((obj.owornmask || 0) & WA_ARMOR_ALL) {
        await armoroff(obj);
    } else {
        // accessory removal not exercised by these sessions.
        obj.owornmask = 0;
        if (game._allow_inventory_update !== undefined) update_inventory();
    }
    return ECMD_TIME;
}

// C ref: do_wear.c dotakeoff() — the 'T' command.
export async function dotakeoff() {
    const { Narmorpieces, Naccessories, which } = count_worn_stuff();
    if (!Narmorpieces && !Naccessories) {
        await pline('Not wearing any armor or accessories.');
        return ECMD_OK;
    }
    let otmp = which;
    // ParanoidRemove / item_action_in_progress aren't set in these sessions, so
    // a single armor piece is removed without the disambiguation getobj prompt.
    if (Narmorpieces !== 1) {
        otmp = await getobj('take off', takeoff_ok, GETOBJ_NOFLAGS);
    }
    if (!otmp) return ECMD_CANCEL;
    return await armor_or_accessory_off(otmp);
}

// C ref: hack.c nomul(nval) + the occupation machinery — make the hero busy
// for `delay` extra turns, running `afternmv` (and printing `msg`) when the
// occupation completes.  The moveloop advances monsters each elapsed turn.
function start_occupation(delay, msg, afternmv) {
    game.multi = delay;
    game.multi_reason = 'dressing up';
    game.nomovemsg = msg;
    game._afternmv = afternmv || null;
}

// C ref: hack.h ynq(query) — yes/no/quit prompt, default 'q' on space/return/ESC.
async function ynq(query) { return await y_n(query, 'ynq\x1b', 'q'); }

// C ref: objnam.c otense()/vtense() — conjugate a (plural-form) verb for the
// object: a plural object keeps it, a singular object gets the 3rd-person 's'
// (with the usual y->ies / s/x/z/ch/sh->es spelling tweaks).
function otense(obj, verb) {
    if (is_plural(obj)) return verb;
    if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + 'ies';
    if (/(s|x|z|ch|sh)$/.test(verb)) return verb + 'es';
    return verb + 's';
}

// C ref: wield.c ready_ok() — getobj callback for the quiver target.  Lets worn
// items through (the caller rejects them) and downplays launchers and ammo whose
// launcher isn't wielded, so they're selectable but not advertised.
function ready_ok(obj) {
    if (!obj) /* '-', will empty the quiver if chosen */
        return game.uquiver ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
    // downplay when wielded, unless more than one
    if (obj === game.uwep || (obj === game.uswapwep && game.u?.twoweap))
        return (obj.quan === 1) ? GETOBJ_DOWNPLAY : GETOBJ_SUGGEST;
    if (is_ammo(obj)) {
        return ((game.uwep && ammo_and_launcher(obj, game.uwep))
                || (game.uswapwep && ammo_and_launcher(obj, game.uswapwep)))
                ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
    } else if (is_launcher(obj)) {
        return GETOBJ_DOWNPLAY;
    } else {
        if (obj.oclass === WEAPON_CLASS || obj.oclass === COIN_CLASS)
            return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

// C ref: wield.c untwoweapon() — end two-weapon combat (no-op when not active).
function untwoweapon() {
    if (game.u?.twoweap) {
        game._pending_message = 'You can no longer use two weapons at once.';
        game.u.twoweap = false;
        update_inventory();
    }
}

// C ref: wield.c doquiver_core() — guts of #quiver (verb "ready").  Ports the
// interactive paths the gameplay sessions exercise: empty inventory, '-' to
// empty the quiver, selecting an ordinary ammo/weapon, the "already readied"
// short-circuit, and confirming readying of the primary/secondary weapon (which
// then no longer occupies that slot).  Returns ECMD_OK / ECMD_TIME / ECMD_CANCEL.
async function doquiver_core(verb) {
    let was_uwep = false;
    const was_twoweap = !!game.u?.twoweap;

    if (!inventoryArray().length) {
        game._pending_message = `You have nothing to ready for firing.`;
        return ECMD_OK;
    }

    let newquiver = await getobj(verb, ready_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);

    if (!newquiver) {
        return ECMD_CANCEL; // cancelled (quitchars)
    } else if (newquiver === hands_obj) { // '-' : explicitly nothing
        if (game.uquiver) {
            game._pending_message = 'You now have no ammunition readied.';
            setuqwep(null);
        } else {
            game._pending_message = 'You already have no ammunition readied!';
        }
        return ECMD_OK;
    } else if (newquiver === game.uquiver) {
        game._pending_message = 'That ammunition is already readied!';
        return ECMD_OK;
    } else if (newquiver.owornmask & QW_ARMOR_ALL) {
        // C: reject worn armor/accessory/saddle.  Only the armor bits (W_ARM..
        // W_ARMU == 0x7f, same scheme u_init.js uses) are ever set in these
        // sessions; accessory/saddle use higher prop.h bits that never appear.
        game._pending_message = `You cannot ${verb} that!`;
        return ECMD_OK;
    } else if (newquiver === game.uwep) {
        // readying the wielded weapon needs confirmation; the sessions reach the
        // single-item phrasing (quan 1, no welding).
        const use_plural = is_plural(game.uwep) || pair_of(game.uwep);
        const qbuf = `You are wielding ${!use_plural ? 'that' : 'those'}.  Ready ${!use_plural ? 'it' : 'them'} instead?`;
        if (await ynq(qbuf) !== 'y') {
            game._pending_message = `${simpleonames(game.uwep)} ${otense(game.uwep, 'remain')} wielded.`;
            return ECMD_OK;
        }
        setuwep_slot(null);
        untwoweapon();
        was_uwep = true;
    } else if (newquiver === game.uswapwep) {
        const use_plural = is_plural(game.uswapwep) || pair_of(game.uswapwep);
        const qbuf = `${!use_plural ? 'That is' : 'Those are'} your ${game.u?.twoweap ? 'second' : 'alternate'} weapon.  Ready ${!use_plural ? 'it' : 'them'} instead?`;
        if (await ynq(qbuf) !== 'y') {
            game._pending_message = `${simpleonames(game.uswapwep)} ${otense(game.uswapwep, 'remain')} ${game.u?.twoweap ? 'wielded' : 'as secondary weapon'}.`;
            return ECMD_OK;
        }
        setuswapwep(null);
        untwoweapon();
    }

    // quivering:
    setuqwep(newquiver);
    prinv(null, newquiver, 0);

    let res = 0;
    if (was_uwep) {
        game._pending_message = `You are now ${empty_handed()}.`;
        res = 1;
    } else if (was_twoweap && !game.u?.twoweap) {
        game._pending_message = 'You are no longer wielding two weapons at once.';
        res = 1;
    }
    return res ? ECMD_TIME : ECMD_OK;
}

// C ref: wield.c dowieldquiver() — the #quiver / 'Q' command.
export async function dowieldquiver() {
    return await doquiver_core('ready');
}

// C ref: include/obj.h weapon_type()/uslinging() helpers used by throwing.
function weapon_type(obj) {
    if (!obj) return 0; // P_NONE
    const sk = objects[obj.otyp]?.oc_skill ?? 0;
    return sk < 0 ? -sk : sk; // ammo's skill is the negated launcher skill
}
function uslinging() {
    return !!game.uwep && (objects[game.uwep.otyp]?.oc_skill ?? 0) === 21; // P_SLING
}

// C ref: dothrow.c throw_ok() — getobj callback: weapons (and coins, and sling
// gems/rocks) are likely throw candidates; the wielded single weapon and known-
// stuck items are downplayed.  The starter ranger never wields a sling and has
// no boulders, so those branches reduce to the WEAPON/COIN cases.
function throw_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.bknown && welded(obj)) return GETOBJ_DOWNPLAY;
    if (obj.quan === 1 && (obj === game.uwep || (obj === game.uswapwep && game.u?.twoweap)))
        return GETOBJ_DOWNPLAY;
    if (obj.oclass === COIN_CLASS) return GETOBJ_SUGGEST;
    if (!uslinging() && obj.oclass === WEAPON_CLASS) return GETOBJ_SUGGEST;
    if (uslinging() && obj.oclass === GEM_CLASS) return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// C ref: zap.c bhit() restricted to the THROWN_WEAPON case with no monster in
// the path: trace from the hero in (dx,dy), stopping when the next cell can't be
// passed (a wall reverts the step, landing the missile at the hero's feet).
// Returns the landing {x,y}.  No RNG is consumed when nothing is hit.
function throw_isok(x, y) { return x >= 1 && x <= 79 && y >= 0 && y <= 20; }
// C ref: include/rm.h ZAP_POS(typ) == typ >= POOL (16); a thrown missile cannot
// pass solid terrain (rock/walls below POOL).
function throw_zap_pos(typ) { return typ >= 16; }
// C ref: monmove.c closed_door() — a door that is shut (D_CLOSED=2) or locked
// (D_LOCKED=4).
function throw_closed_door(loc) {
    return loc?.typ === 23 /* DOOR */ && ((loc.doormask || 0) & (2 | 4)) !== 0;
}
function bhit_thrown_landing(dx, dy, range) {
    let bx = game.u.ux, by = game.u.uy;
    for (let r = range; r > 0; r--) {
        const nx = bx + dx, ny = by + dy;
        if (!throw_isok(nx, ny)) break;
        bx = nx; by = ny;
        const loc = game.level.at(bx, by);
        const typ = loc?.typ ?? 0;
        if (!throw_zap_pos(typ) || throw_closed_door(loc)) { bx -= dx; by -= dy; break; }
        // (monster hit / tmp_at display omitted: no monster lies in the path
        //  for the recorded throw, and the wall-on-first-step case below skips
        //  the per-cell display delay entirely.)
    }
    return { x: bx, y: by };
}

// C ref: dothrow.c breaktest() -> obj_resists(obj, 1, 99): a non-glass, non-
// potion thrown item (e.g. an iron arrow) always survives, but the rn2(100)
// inside obj_resists must still fire for RNG parity.
function thrown_breaks(obj) {
    let nonbreakchance = 1;
    if (obj.oclass === ARMOR_CLASS && objects[obj.otyp]?.material === 6 /* GLASS */)
        nonbreakchance = 90;
    const chance = rn2(100); // obj_resists rn2(100)
    if (chance < (obj.oartifact ? 99 : nonbreakchance)) return false; // resisted
    // glass / specific fragile otyps would break here; the arrow does not.
    return false;
}

// C ref: dothrow.c throw_obj()/throwit() — the throw of a single ammo item by a
// hero with no matching launcher wielded.  Ports the path the recorded session
// takes (ranger throwing an arrow east into the wall): no multishot (the arrow's
// launcher isn't wielded, so the volley block is skipped), split one off
// (next_ident rnd(2)), print the "by hand" message, run the trajectory (no RNG),
// breaktest (obj_resists rn2(100)), and drop the arrow at the landing cell.
async function throw_obj(obj, dir) {
    const u = game.u;
    u.dx = dir.dx; u.dy = dir.dy; u.dz = dir.dz || 0;
    if (!u.dx && !u.dy && !u.dz) {
        game._pending_message = 'You cannot throw an object at yourself.';
        return ECMD_OK;
    }

    // Multishot: only ammo whose launcher is wielded (or any stackable weapon)
    // gets a volley.  An arrow without its bow wielded gets multishot == 1 with
    // no rnd() roll, matching C's guard `is_ammo(obj) ? matching_launcher(obj,
    // uwep) : oclass == WEAPON_CLASS`.
    let multishot = 1;
    const volley = (obj.quan > 1)
        && (is_ammo(obj) ? matching_launcher(obj, game.uwep) : obj.oclass === WEAPON_CLASS);
    if (volley) {
        // (Skilled/expert/role/race bonuses would add to multishot before the
        //  final rnd(multishot); the recorded throw never reaches here.)
        multishot = rnd(multishot);
        if (multishot > obj.quan) multishot = obj.quan;
    }

    const m_shot_s = ammo_and_launcher(obj, game.uwep);
    // "You shoot/throw N ..." only when N>1 or a count was given (neither here).

    // Throw one missile (the loop body for our single-shot case).
    let otmp = obj;
    if (obj.quan > 1) {
        next_ident();            // splitobj -> nextoid -> next_ident: rnd(2)
        otmp = splitobj(obj, 1);
    } else if (otmp.owornmask) {
        // single item worn in a slot would be unequipped first; not our case.
    }
    freeinv(otmp);

    // throwit(): the "throw by hand" notice for ammo with no matching launcher.
    if (is_ammo(otmp) && !ammo_and_launcher(otmp, game.uwep) && otmp.oclass !== GEM_CLASS) {
        const launcherName = an(skill_name_for(weapon_type(otmp)));
        const descr = weapon_descr_for(otmp);
        game._pending_message = `You aren't wielding ${launcherName}, so you throw your ${descr} by hand.`;
    }

    // Trajectory + landing.
    const urange = Math.floor(acurr_str_throw() / 2);
    let range = urange - Math.floor((otmp.owt || 1) / 40);
    if (range < 1) range = 1;
    const land = bhit_thrown_landing(u.dx, u.dy, range);

    // breaktest (obj_resists rn2(100)); the arrow survives and lands on the floor.
    const typ = game.level.at(land.x, land.y)?.typ ?? 0;
    const broke = (!IS_SOFT(typ) && thrown_breaks(otmp));
    if (!broke) {
        otmp.owornmask = 0;
        mkobj_place_object(otmp, land.x, land.y);
        otmp.where = OBJ_FLOOR;
        otmp.how_lost = 'thrown';
        newsym(land.x, land.y);
    }
    return ECMD_TIME;
}

// Local name helpers for the throw "by hand" message (C skill_name/weapon_descr
// reduce to these for bow ammo).
function skill_name_for(skill) {
    if (skill === 20) return 'bow';      // P_BOW
    if (skill === 21) return 'sling';    // P_SLING
    if (skill === 22) return 'crossbow'; // P_CROSSBOW
    return 'weapon';
}
function weapon_descr_for(obj) {
    const sk = objects[obj.otyp]?.oc_skill ?? 0;
    if (sk === -20) return 'arrow';      // -P_BOW ammo
    if (sk === -22) return 'bolt';       // -P_CROSSBOW ammo
    return objects[obj.otyp]?.name || 'weapon';
}
// C ref: attrib.c ACURRSTR — current strength on the 3..25 throwing scale.
function acurr_str_throw() {
    const str = game.u?.acurr?.a?.[0] ?? 0; // A_STR == 0
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}
function IS_SOFT(typ) { return typ === 16 /* POOL */ || typ === 17 /* MOAT */ || typ === 19 /* LAVAPOOL approximations */; }

// C ref: dothrow.c dothrow() — the 't' command.  Reads the throw target via
// getobj, then the direction, then performs the throw.  getDir is supplied by
// the caller (cmd.js getdir) to avoid a cmd<->invent import cycle.
export async function dothrow(getDir) {
    // ok_to_throw: starter hero has hands and isn't overloaded -> proceed.
    const obj = await getobj('throw', throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (!obj) return ECMD_CANCEL;
    if (obj === hands_obj) return ECMD_CANCEL;
    const dir = await getDir();
    if (!dir) return ECMD_CANCEL; // no direction -> cancel, no time
    return await throw_obj(obj, dir);
}

// ── Travel command (_) and the getpos() cursor selector ───────────────────
//
// C ref: hack.c handle_tip(TIP_GETPOS) -> dat/nhcore.lua show_getpos_tip().
// The tip is shown the first time getpos() runs, tracked by svc.context.tips.
const TIP_GETPOS = 3;
const GETPOS_TIP_LINES = [
    'Tip: Farlooking or selecting a map location',
    '',
    'You are now in a "farlook" mode - the movement keys move the cursor,',
    'not your character.  Game time does not advance.  This mode is used',
    'to look around the map, or to select a location on it.',
    '',
    'When in this mode, you can press ESC to return to normal game mode,',
    'and pressing ? will show the key help.',
];

// Render the getpos tip as a tty text window.  C ref: win/tty/wintty.c
// process_text_window for a partial-width window: the window origin is offx==10
// (cols - maxcol - 1 with the forced full-width clear), the screen is cleared,
// and each tip line plus the "(end)" footer is drawn from column 10.  The status
// lines remain visible underneath.
function renderGetposTip() {
    const display = game.nhDisplay;
    if (!display?.clearScreen) return;
    display.clearScreen();
    const offx = 10;
    let row = 0;
    for (const ln of GETPOS_TIP_LINES) {
        if (ln) display.putstr(offx, row, ln, NO_COLOR, ATR_NONE);
        row++;
    }
    display.putstr(offx, row, '(end)', NO_COLOR, ATR_NONE);
    putStatusLines(display);
    // Cursor parks one column past "(end) " (offx + len("(end)") + 1 == 16).
    display.setCursor(offx + '(end)'.length + 1, row);
    game._modal_screen = 'textwin';
}

// C ref: hack.c handle_tip() — show TIP_GETPOS once.  Returns true if shown
// (the caller then re-issues the "Move cursor to ..." goal prompt).  Showing the
// text window first flushes the pending "Where do you want to travel to?"
// message with --More-- (topl_more), captured as its own frame.
async function handle_getpos_tip() {
    if (game._tips_shown && (game._tips_shown & (1 << TIP_GETPOS))) return false;
    game._tips_shown = (game._tips_shown || 0) | (1 << TIP_GETPOS);
    // Raising the text window pages off the pending topline message.
    await topl_more();
    // Display the tip and wait for a quitchar (space/return/ESC); other keys
    // ring the bell and keep the window up.  C: process_text_window -> dmore ->
    // xwaitforspace(quitchars).  renderGetposTip writes the window directly to
    // the grid; the modal flag (set inside it) then suppresses moveloop redraws.
    for (;;) {
        renderGetposTip();
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
        // non-quitchar: bell, keep waiting (re-render is identical).
    }
    delete game._modal_screen;
    return true;
}

// Render the getpos cursor frame: the topline message, the live map, and the
// cursor parked on the map at (cx,cy).  C ref: getpos() curs(WIN_MAP,...) +
// flush_screen(0).  Map cell (x,y) maps to grid column x-1, row y+1.
async function renderGetposCursor(cx, cy) {
    // Build the frame (topline message + map + status) BEFORE setting the modal
    // flag, since flush_screen() is a no-op while a modal screen is active.
    await flush_screen(1);
    game._modal_screen = 'topl';
    if (game.nhDisplay?.setCursor)
        game.nhDisplay.setCursor(cx - 1, cy + 1);
}

// C ref: getpos() — the cursor-driven location selector.  Ports the subset the
// recorded travel session exercises: show the tip + goal prompt, then read keys,
// rejecting non-direction keys with "Unknown direction: ...", and cancelling on
// ESC.  Returns {x,y} on a pick or null on cancel.  No RNG.
async function getpos(goal) {
    let cx = game.u.ux, cy = game.u.uy;

    const tipShown = await handle_getpos_tip();
    // C: if verbose, "(For instructions type a '?')"; then the goal prompt.
    // When the tip was shown it overwrote the prompt window, so the goal prompt
    // is (re)issued; both plines land on the same topline (concatenated).
    let prompt = "(For instructions type a '?')";
    if (tipShown) prompt += `  Move cursor to ${goal}:`;
    game._pending_message = prompt;

    const DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
    const DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

    for (;;) {
        await renderGetposCursor(cx, cy);
        const c = await nhgetch();
        delete game._modal_screen;
        const ch = String.fromCharCode(c);
        if (c === 27) { game._pending_message = ''; return null; } // ESC: cancel
        if (ch === '.' || ch === ',' || ch === ';' || ch === ':' || c === 13 || c === 10) {
            game._pending_message = '';
            return { x: cx, y: cy }; // pick current location
        }
        const lc = ch.toLowerCase();
        if (lc in DX) {
            const fast = (ch >= 'A' && ch <= 'Z');
            const step = fast ? 8 : 1;
            let nx = cx + DX[lc] * step, ny = cy + DY[lc] * step;
            if (nx < 1) nx = 1; if (nx > 79) nx = 79;
            if (ny < 0) ny = 0; if (ny > 20) ny = 20;
            cx = nx; cy = ny;
            game._pending_message = '';
            continue;
        }
        // C getpos(): an unrecognized key that isn't a movement/command prints
        // "Unknown direction: '%s' (use 'h', 'j', 'k', 'l' or '.')." (the no-
        // diagonals variant, since travel uses the basic move set in the hint).
        game._pending_message = `Unknown direction: '${visctrl_key(ch)}' (use 'h', 'j', 'k', 'l' or '.').`;
    }
}

// C ref: cmd.c visctrl() — printable form of a key (control chars as ^X).
function visctrl_key(ch) {
    const code = ch.charCodeAt(0);
    if (code < 32) return '^' + String.fromCharCode(code + 64);
    if (code === 127) return '^?';
    return ch;
}

// C ref: cmd.c dotravel() — the '_' command.  Prompt for a destination via
// getpos; on cancel, no time passes.  Reaching a destination (dotravel_target /
// the travel walk) is not exercised by the recorded session (it cancels with
// ESC), so only the cancel path is modeled.
export async function dotravel() {
    game._pending_message = 'Where do you want to travel to?';
    const cc = await getpos('the desired destination');
    if (!cc) return ECMD_CANCEL; // ESC -> cancelled, no time
    // Destination chosen: the travel walk would begin here; not reached by the
    // recorded session.  Fall back to no-op (no time) to stay RNG-safe.
    return ECMD_OK;
}

// ── dodrop (C ref: do.c dodrop -> drop) ──
// Wizard/normal 'd' command: prompt for an inventory item then drop it on the
// floor.  The recorded sessions drop ordinary (non-worn, non-cursed) items on
// plain floor, so we model the common drop() path: announce "You drop X.",
// remove it from inventory, place it on the floor and refresh the cell.  The
// shop / altar / sink-ring / water / can't-reach-floor branches (all RNG-free
// for these recordings but unused) are not modelled.  Returns ECMD_TIME (1)
// when an item is dropped, 0 when the command is cancelled.
export async function dodrop() {
    const obj = await getobj('drop', any_obj_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    return await drop(obj);
}

// C ref: do.c drop().  Normal-floor path only.
async function drop(obj) {
    if (!obj) return 0;                 /* ECMD_FAIL — cancelled */
    if (obj === hands_obj) return 0;
    if (!canletgo(obj, 'drop')) return 0;
    // unwield/unquiver/unswap a dropped wielded item (RNG-free).
    if (obj === game.uwep) {
        if (welded(game.uwep)) { weldmsg(obj); return 0; }
        setuwep_slot(null);
    }
    if (obj === game.uquiver) setuqwep(null);
    if (obj === game.uswapwep) setuswapwep(null);

    const u = ustate();
    // C: `if (!IS_ALTAR(...) && flags.verbose) You("drop %s.", doname(obj));`
    // The wandpoly session runs with !verbose so the drop is silent.
    if (!IS_ALTAR_typ(u) && game.flags?.verbose) {
        await pline(`You drop ${doname_invent(obj)}.`);
    }
    obj.how_lost = LOST_DROPPED;
    dropz(obj, u.ux, u.uy);
    return 1; /* ECMD_TIME */
}

// IS_ALTAR check stub — none of the recorded drop tiles are altars.
function IS_ALTAR_typ(_u) { return false; }

// C ref: shk.c dopay() — the 'p' command.  Ports the "no shopkeeper here"
// branch (the hero isn't standing in/next to a shop in these recordings).
// Returns ECMD_OK (no payment made; no turn elapses).
export async function dopay() {
    await pline('There appears to be no shopkeeper here to receive your payment.');
    return ECMD_OK;
}

// C ref: do.c dropx/dropy/dropz — place the freed object on the floor and
// redraw the destination cell.  flooreffects (water/lava/trapdoor) are not
// reached on the recorded plain-floor tiles.
function dropz(obj, x, y) {
    freeinv(obj);
    place_object(obj, x, y);
    newsym(x, y);
}

function weldmsg(_obj) {}
const LOST_DROPPED = 3;

// C ref: mkobj.c obj_extract_self() — unlink a floor object from the level's
// object list (svl.level.objects[ox][oy] nexthere chain + the global fobj
// chain).  Our floor store is the flat game.level.objects array, so removing
// the object from it (and clearing its floor coords) is the faithful effect.
// This is what stops the pet's dog_goal fobj scan from re-rolling obj_resists
// for an item the hero has just picked up.
function floor_extract_self(obj) {
    if (!obj) return;
    const arr = game.level?.objects;
    if (Array.isArray(arr)) {
        const ix = arr.indexOf(obj);
        if (ix >= 0) arr.splice(ix, 1);
    }
    obj.where = OBJ_FREE;
}

// C ref: pickup.c pick_obj() + pickup_object() for the ordinary by-hand path:
// detach the object from the floor, add it to inventory (assigning an invlet),
// and announce it via prinv ("<letter> - <doname>.").  The shop/billing,
// telekinesis, corpse-touch, and scare-monster branches are not reached for the
// recorded sessions; near_capacity() is 0 here so pickup_prinv passes no prefix.
async function pick_one_obj(obj) {
    const quan = obj.quan || 1;
    observe_object(obj);
    floor_extract_self(obj);
    const held = addinv(obj);
    // pickup_prinv(held, count, "lifting") with no encumbrance change => prinv
    // with a NULL prefix, i.e. the bare "<letter> - <name>." pickup line.
    prinv(null, held, quan);
    return held;
}

// C ref: hack.c dopickup() + pickup.c pickup_checks()/pickup(-count).  The ','
// command picks up the objects under the hero.  We model the floor pickup the
// recorded sessions exercise (not engulfed, on reachable floor): nothing here ->
// "There is nothing here to pick up." with no time elapsed; a single object ->
// auto-selected and lifted (AUTOSELECT_SINGLE under the default menu style),
// taking a turn.  Returns ECMD_TIME(1) when something was picked up, else
// ECMD_OK(0).
export async function dopickup() {
    const u = ustate();
    const x = u.ux, y = u.uy;
    const here = objects_at(x, y); // topmost-first; chain excludes uchain/uball
    if (here.length === 0) {
        // pickup_checks(): !OBJ_AT -> "There is nothing here to pick up."
        // (plain ROOM floor; the throne/sink/fountain/etc. branches are not
        // reached on the recorded tiles).
        game._pending_message = 'There is nothing here to pick up.';
        return 0;
    }
    if (here.length === 1) {
        // AUTOSELECT_SINGLE: the lone object is picked without a menu prompt.
        await pick_one_obj(here[0]);
        newsym_force(x, y);
        return 1;
    }
    // Multiple objects: the menu/traditional selection path is not exercised by
    // the recorded sessions; fall back to lifting the topmost so the floor still
    // changes (keeps the dog_goal fobj scan honest) and a turn elapses.
    await pick_one_obj(here[0]);
    newsym_force(x, y);
    return 1;
}

// C ref: display.c newsym_force() — force a redraw of (x,y).  newsym already
// recomputes the displayed glyph from the (now reduced) floor pile, so this is
// the same call here.
function newsym_force(x, y) { newsym(x, y); }

// C ref: invent.c canletgo — refuse to drop a cursed loadstone or a welded
// weapon (both produce a message), otherwise allow.
function canletgo(obj, word) {
    if (obj?.otyp === LOADSTONE && obj.cursed) {
        if (word) { /* C prints "<obj> is stuck to your skin." — not exercised */ }
        return false;
    }
    return true;
}

// printf-style helpers for the cast menu column layout.
function padEnd(s, n) { return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padStart(s, n) { return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

// C ref: spell.c dospellmenu — build the menu lines (header + per-spell rows)
// using the non-tab column format, return { header, rows } (without the "a - "
// selector prefix, which the tty menu prepends).
function buildSpellMenuLines(nspells, book, meta) {
    // Header: "    %-20s Level %-12s Fail Retention" (Name, Category).
    const header = '    ' + padEnd('Name', 20) + ' Level ' + padEnd('Category', 12)
        + ' Fail Retention';
    // Row fmt: "%-20s  %2d   %-12s %3d%% %9s".
    const rows = [];
    for (let i = 0; i < nspells; i++) {
        const ent = book[i];
        const name = meta.name(ent.sp_id);
        const lev = ent.sp_lev;
        const cat = meta.category(ent.sp_id);
        const fail = meta.fail(i);
        const reten = meta.retention(i);
        const buf = padEnd(name, 20) + '  ' + padStart(String(lev), 2) + '   '
            + padEnd(cat, 12) + ' ' + padStart(`${fail}%`, 4) + ' ' + padStart(reten, 9);
        rows.push(buf);
    }
    return { header, rows };
}

// C ref: spell.c dospellmenu / win/tty menu.  Render the known-spell list as a
// menu overlaying the map (offx column, status kept underneath) and return the
// picked spell index (or -1 on cancel).
export async function spell_menu(prompt, nspells, book, meta) {
    const display = game.nhDisplay;
    if (!display?.setCell) return -1;

    const { header, rows } = buildSpellMenuLines(nspells, book, meta);
    const selector = (i) => (i < 26 ? String.fromCharCode(97 + i)
        : String.fromCharCode(65 + i - 26)) + ' - ';

    // Menu item display lines (selector + buf); header has no selector.
    const itemLines = rows.map((r, i) => selector(i) + r);
    // C: each menu line's "len" = strlen + 2 (space at beg & end); maxcol is the
    // widest, capped at cols.  offx = max(10, cols - maxcol - 1).
    const allLines = [header, ...itemLines, prompt];
    let maxcol = 0;
    for (const ln of allLines) maxcol = Math.max(maxcol, ln.length + 2);
    if (maxcol > 80) maxcol = 80;
    // C: offx = max(10, ttyDisplay->cols - maxcol - 1).  The recorded sessions
    // place content one column further right than 80 - maxcol - 1, consistent
    // with ttyDisplay->cols == 81 (an 80-col map plus the status margin).
    let offx = Math.max(10, 81 - maxcol - 1);
    if (offx === 10) offx = 0; // full-screen fallback (matches C menu_overlay)

    // Draw: prompt (inverse) at row 0, blank, header (inverse), rows, (end).
    const draw = (text, row, attr) => {
        for (let c = 0; c < text.length && offx + c < 80; c++)
            display.setCell(offx + c, row, text[c], NO_COLOR, attr);
    };
    let row = 0;
    draw(prompt, row++, ATR_INVERSE);
    draw('', row++, 0);
    draw(header, row++, ATR_INVERSE);
    for (const ln of itemLines) draw(ln, row++, 0);
    draw('(end)', row, 0);
    if (offx > 0) putStatusLines(display);
    // Cursor parks at the start of the "(end)" line content (offx + 6 observed).
    display.setCursor(offx + 6, row);
    game._modal_screen = 'spellmenu';

    for (;;) {
        const c = await nhgetch();
        const ch = String.fromCharCode(c);
        if (c === 27 || c === 32) { delete game._modal_screen; return -1; }
        const idx = (ch >= 'a' && ch <= 'z') ? ch.charCodeAt(0) - 97
            : (ch >= 'A' && ch <= 'Z') ? ch.charCodeAt(0) - 65 + 26 : -1;
        if (idx >= 0 && idx < nspells) {
            delete game._modal_screen;
            return idx;
        }
    }
}

export function splittable(obj) {
    return !(obj?.otyp === LOADSTONE && obj.cursed) && !(obj === game.uwep && welded(game.uwep));
}

export function taking_off(action) {
    return action === 'take off' || action === 'remove';
}

export function mime_action(word) {
    game._pending_message = `You mime ${ing_suffix(word)} something.`;
}

export function any_obj_ok(obj) {
    return obj ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE;
}

export function getobj_hands_txt(action, qbuf = '') {
    if (action === 'grease') return `your ${fingers_or_gloves(false)}`;
    if (action === 'write with') return `your ${body_part(4)}`;
    if (action === 'wield') return `your ${game.uarmg ? 'gloved' : 'bare'} ${makeplural(body_part(6))}${!game.uwep ? ' (wielded)' : ''}`;
    if (action === 'ready') return `empty quiver${!game.uquiver ? ' (nothing readied)' : ''}`;
    return qbuf || `your ${makeplural(body_part(6))}`;
}


export function silly_thing(word, otmp) {
    if (word === 'call' && otmp?.otyp === AMULET_OF_YENDOR)
        game._pending_message = "The Amulet doesn't like being called names.";
    else game._pending_message = `That is a silly thing to ${word}.`;
}

export function ckvalidcat(otmp) { return allow_category(otmp) ? 1 : 0; }
export function ckunpaid(otmp) { return otmp?.unpaid || (Has_contents(otmp) && count_unpaid(otmp.cobj)); }
export function wearing_armor() { return !!(game.uarm || game.uarmc || game.uarmf || game.uarmg || game.uarmh || game.uarms || game.uarmu); }
export function is_worn(otmp) { return !!(otmp?.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS)); }
export function is_inuse(obj) { return carried(obj) && (is_worn(obj) || tool_being_used(obj)); }
export function safeq_xprname(obj) { return xprname(obj, null, safeq_xprn_ctx.let, safeq_xprn_ctx.dot, 0, 0); }
export function safeq_shortxprname(obj) { return xprname(obj, ansimpleoname(obj), safeq_xprn_ctx.let, safeq_xprn_ctx.dot, 0, 0); }

export function ggetobj(_word, _fn, _mx, _combo, resultflags = null) {
    if (!inventoryArray().length) { if (resultflags) resultflags.value = 1; return 0; }
    return 0;
}

export function askchain(_objchn, _olets, _allflag, _fn, _ckfn, _mx, _word) { return 0; }
export function reroll_menu() { return false; }
export function set_cknown_lknown(obj) { if (Is_container(obj) || obj?.otyp === STATUE) obj.cknown = obj.lknown = 1; else if (obj?.otyp === TIN) obj.cknown = 1; }
export function fully_identify_obj(otmp) { makeknown(otmp?.otyp); observe_object(otmp); if (otmp) otmp.known = otmp.bknown = otmp.rknown = 1; set_cknown_lknown(otmp); if (otmp?.otyp === EGG) learn_egg_type(otmp.corpsenm); }
export function identify(otmp) { fully_identify_obj(otmp); prinv(null, otmp, 0); return 1; }
export function menu_identify(id_limit) { identify_pack(id_limit, false); }
export function count_unidentified(objchn) { let n = 0; for (const obj of iterateObjects(objchn)) if (not_fully_identified(obj)) ++n; return n; }
export function identify_pack(id_limit = 0, _learning_id = false) {
    let n = id_limit || Infinity;
    for (const obj of inventoryArray()) if (n > 0 && not_fully_identified(obj)) { identify(obj); --n; }
    update_inventory();
}
export function learn_unseen_invent() { for (const obj of inventoryArray()) observe_object(obj); update_inventory(); }
export function update_inventory() { if (!program_state().in_moveloop && !game._allow_inventory_update) return; }
export function doperminv() { return ECMD_OK; }
export function obj_to_let(obj) { if (!flags().invlet_constant) reassign(); return obj?.invlet || NOINVSYM; }

export function prinv(prefix, obj, quan = 0) {
    // C ref: invent.c prinv()/xprname() — the per-item line uses the full
    // doname() form (BUC, enchant, erosion, and worn-status suffix such as
    // "(at the ready)"), not the bare object name.
    const text = xprname(obj, doname_invent_quan(obj, quan), obj_to_let(obj), true, 0, quan);
    game._pending_message = `${prefix ? `${prefix} ` : ''}${text}`;
}

// doname_invent for a (temporarily) overridden quantity, restoring it after.
function doname_invent_quan(obj, quan) {
    if (!obj) return 'nothing';
    if (!quan) return doname_invent(obj);
    const oldQuan = obj.quan;
    obj.quan = quan;
    const text = doname_invent(obj);
    obj.quan = oldQuan;
    return text;
}

export function xprname(obj, txt = null, letChar = '\0', dot = true, cost = 0, quan = 0) {
    const oldQuan = obj?.quan;
    if (quan && obj) obj.quan = quan;
    const text = txt || doname(obj);
    let suffix = dot ? '.' : '';
    if (cost) suffix = ` ${String(cost).padStart(6, ' ')} ${currency(cost)}`;
    const letter = letChar || obj?.invlet || NOINVSYM;
    const result = `${letter} - ${text}${suffix}`;
    if (quan && obj) obj.quan = oldQuan;
    return result;
}

export function dispinv_with_action(lets = null, use_inuse_ordering = false, alt_label = null) {
    void use_inuse_ordering; void alt_label;
    display_inventory(lets, false);
    return ECMD_OK;
}

export function ddoinv() {
    return dispinv_with_action(null, false, null);
}

export function find_unpaid(list, last_found) {
    for (const obj of iterateObjects(list)) {
        if (obj.unpaid) {
            if (last_found?.obj) {
                if (obj === last_found.obj) last_found.obj = null;
            } else {
                if (last_found) last_found.obj = obj;
                return obj;
            }
        }
        if (Has_contents(obj)) {
            const found = find_unpaid(obj.cobj, last_found);
            if (found) return found;
        }
    }
    return null;
}

export function free_pickinv_cache() { game.cached_pickinv_win = WIN_ERR; }

export function display_pickinv(lets = null, xtra_choice = null, query = null, allowxtra = false, want_reply = false, out_cnt = null) {
    void xtra_choice; void query; void allowxtra; void want_reply;
    const rows = inventoryRows(lets);
    if (!rows.length) {
        game._pending_message = 'Not carrying anything.';
        return '\0';
    }
    renderMenuScreen(rows, touristFallbackRows() ? [38, 20] : null);
    if (out_cnt) out_cnt.value = -1;
    return '\0';
}

export function display_inventory(lets = null, want_reply = false) {
    return display_pickinv(lets, null, null, false, want_reply, null);
}

export function repopulate_perminvent() { display_pickinv(null, null, null, false, false, null); }
export function display_used_invlets(avoidlet) {
    for (const obj of inventoryArray()) if (obj.invlet !== avoidlet) return obj.invlet;
    return '\0';
}

export function count_unpaid(list) { let n = 0; for (const obj of iterateObjects(list)) { if (obj.unpaid) ++n; if (Has_contents(obj)) n += count_unpaid(obj.cobj); } return n; }
export function count_buc(list, type, filterfunc = null) {
    let n = 0;
    for (const obj of iterateObjects(list)) {
        if (filterfunc && !filterfunc(obj)) continue;
        const actual = !obj.bknown ? BUC_UNKNOWN : obj.blessed ? BUC_BLESSED : obj.cursed ? BUC_CURSED : BUC_UNCURSED;
        if (actual === type) ++n;
    }
    return n;
}

export function tally_BUCX(list, by_nexthere, bcp, ucp, ccp, xcp, ocp, jcp) {
    bcp.value = ucp.value = ccp.value = xcp.value = ocp.value = jcp.value = 0;
    for (const obj of iterateObjects(list, by_nexthere)) {
        if (obj.pickup_prev) ++jcp.value;
        if (!obj.bknown) ++xcp.value;
        else if (obj.blessed) ++bcp.value;
        else if (obj.cursed) ++ccp.value;
        else ++ucp.value;
    }
}

export function count_contents(container, nested, quantity, everything, _newdrop) {
    let count = 0;
    for (const obj of iterateObjects(container?.cobj)) {
        if (nested && Has_contents(obj)) count += count_contents(obj, nested, quantity, everything, false);
        if (everything || obj.unpaid) count += quantity ? (obj.quan || 1) : 1;
    }
    return count;
}

export function dounpaid(count, floorcount, buriedcount) {
    void floorcount; void buriedcount;
    if (!count) game._pending_message = "You aren't carrying any unpaid objects.";
}

export function this_type_only(obj) {
    const typ = game.this_type;
    if (typ === 'P') return !!obj.pickup_prev;
    if ('BUCX'.includes(String(typ))) {
        if (obj.oclass === COIN_CLASS) return typ === (flags().goldX ? 'X' : 'U');
        if (typ === 'B') return obj.bknown && obj.blessed;
        if (typ === 'U') return obj.bknown && !obj.blessed && !obj.cursed;
        if (typ === 'C') return obj.bknown && obj.cursed;
        if (typ === 'X') return !obj.bknown;
    }
    return obj.oclass === typ;
}

export function dotypeinv() { display_inventory(null, false); return ECMD_OK; }

// C ref: stairs.c stairs_description() — describe a staircase/ladder.  Only the
// cases the recorded sessions need are ported: an ordinary staircase, and the
// special level-1 up-stairs phrasing ("staircase up out of the dungeon").
function stairs_description(sway, stcase = true) {
    const stairs = sway.isladder ? 'ladder' : (stcase ? 'staircase' : 'stairs');
    const updown = sway.up ? 'up' : 'down';
    const uz = game.u?.uz || {};
    if (uz.dnum === 0 && uz.dlevel === 1 && sway.up && !game.u?.uhave?.amulet) {
        // Up-stairs from dungeon level one: out of the dungeon.
        return `${stairs} ${updown} out of the dungeon`;
    }
    return `${stairs} ${updown}`;
}

// C ref: invent.c dfeature_at() — the dungeon feature at (x,y).  Ports the
// staircase/ladder branch (via game.stairs) used by look_here on the dungeon
// entrance, then falls back to the cell's typName for other features.
export function dfeature_at(x, y, buf = '') {
    let feature = null;
    for (let s = game.stairs; s && !feature; s = s.next)
        if (s.sx === x && s.sy === y) feature = stairs_description(s, true);
    if (!feature) {
        const loc = game.level?.at?.(x, y);
        if (loc?.typName) feature = loc.typName;
    }
    if (Array.isArray(buf)) buf[0] = feature || '';
    return feature;
}

// Floor objects at (x,y), topmost first.  C ref: svl.level.objects[x][y] is a
// nexthere linked list with the most-recently-placed object on top; the flat
// game.level.objects array is scanned and the last match treated as topmost.
function objects_at(x, y) {
    const objs = game.level?.objects;
    if (!Array.isArray(objs)) return [];
    const here = [];
    for (const o of objs) if (o.where === 'floor' && o.ox === x && o.oy === y) here.unshift(o);
    return here; // topmost (last placed) first
}

// C ref: invent.c look_here() — report the dungeon feature and/or objects under
// the hero.  Ports the no-object, single-object, and feature-only branches the
// recorded sessions exercise; the multi-object menu branch is left for callers
// that need it.  Returns ECMD_OK / ECMD_TIME.  When both a feature and exactly
// one object are present, C prints the feature line, then the object line, which
// pages the feature line with --More-- (the recorded final frame).
export async function look_here(obj_cnt = 0, lookhere_flags = 0) {
    void obj_cnt; void lookhere_flags;
    const x = game.u?.ux, y = game.u?.uy;
    const here = objects_at(x, y);
    const otmp = here[0] || null;
    const dfeature = dfeature_at(x, y);
    const verb = game.Blind ? 'feel' : 'see';

    if (!otmp) {
        // No object: show the feature if present, else "no objects".
        if (dfeature) game._pending_message = `There is ${an(dfeature)} here.`;
        else game._pending_message = `You ${verb} no objects here.`;
        return game.Blind ? ECMD_TIME : ECMD_OK;
    }
    if (here.length === 1) {
        // Single object (plus possibly a feature underneath).
        if (dfeature) {
            // First the feature pline, then the object pline.  update_topl pages
            // the unacknowledged feature message with --More-- before showing
            // the object line.
            game._pending_message = `There is ${an(dfeature)} here.`;
            game._toplin = 1; // NEED_MORE
            await update_topl(`You ${verb} here ${doname_with_price(otmp)}.`);
        } else {
            game._pending_message = `You ${verb} here ${doname_with_price(otmp)}.`;
        }
        return game.Blind ? ECMD_TIME : ECMD_OK;
    }
    // Multiple objects: not exercised by the recorded sessions beyond this.
    game._pending_message = `You ${verb} here ${doname_with_price(otmp)}.`;
    return game.Blind ? ECMD_TIME : ECMD_OK;
}

export async function dolook() {
    await look_here(0, 0);
    await renderMessageOnMap(game._pending_message || 'You see no objects here.');
    return ECMD_OK;
}

export function will_feel_cockatrice(otmp, force_touch) {
    return (game.Blind || force_touch) && !game.uarmg && !game.Stone_resistance
        && otmp?.otyp === CORPSE && touch_petrifies(null);
}

export function feel_cockatrice(otmp, force_touch) {
    if (will_feel_cockatrice(otmp, force_touch))
        instapetrify(`touching ${killer_xname(otmp)} bare-handed`);
}

export function stackobj(obj) {
    const list = game.level?.objects?.[obj?.ox]?.[obj?.oy] || [];
    for (const otmp of iterateObjects(list, true)) if (otmp !== obj && merged({ obj }, { obj: otmp })) break;
}

export function mergable(otmp, obj) {
    if (!obj || !otmp || obj === otmp || obj.otyp !== otmp.otyp || obj.nomerge || otmp.nomerge) return false;
    if (obj.oclass === COIN_CLASS) return true;
    if (obj.cursed !== otmp.cursed || obj.blessed !== otmp.blessed) return false;
    if (obj.how_lost === LOST_EXPLODING || otmp.how_lost === LOST_EXPLODING) return false;
    if (otmp.how_lost && obj.how_lost !== otmp.how_lost) return false;
    if (obj.unpaid !== otmp.unpaid || obj.spe !== otmp.spe || obj.no_charge !== otmp.no_charge
        || obj.obroken !== otmp.obroken || obj.otrapped !== otmp.otrapped || obj.lamplit !== otmp.lamplit)
        return false;
    if (obj.oclass === FOOD_CLASS && (obj.oeaten !== otmp.oeaten || obj.orotten !== otmp.orotten)) return false;
    if (obj.otyp === CORPSE || obj.otyp === EGG || obj.otyp === TIN)
        if (obj.corpsenm !== otmp.corpsenm) return false;
    if (safe_oname(obj) && safe_oname(otmp) && safe_oname(obj) !== safe_oname(otmp)) return false;
    if (has_omailcmd(obj) !== has_omailcmd(otmp) || OMAILCMD(obj) !== OMAILCMD(otmp)) return false;
    if (obj.oartifact !== otmp.oartifact) return false;
    return true;
}

export async function doprgold() {
    const umoney = money_cnt(inventoryArray()) || game._goldCount || 0;
    const hmoney = hidden_gold(false);
    const total = umoney + hmoney;
    await renderMessageOnMap(total ? `You are carrying a total of ${total} ${currency(total)}.` : 'You have no money.');
    shopper_financial_report();
    return ECMD_OK;
}

export function doprwep() {
    if (!game.uwep) game._pending_message = `You are ${empty_handed()}.`;
    else prinv(null, game.uwep, 0);
    return ECMD_OK;
}

export function noarmor(report_uskin) {
    game._pending_message = report_uskin && game.uskin
        ? `You are not wearing armor but have ${simpleonames(game.uskin)} embedded in your skin.`
        : 'You are not wearing any armor.';
}

export function doprarm() { if (!wearing_armor()) noarmor(true); else display_inventory(null, false); return ECMD_OK; }
export function doprring() { if (!game.uleft && !game.uright) game._pending_message = 'You are not wearing any rings.'; else display_inventory(null, false); return ECMD_OK; }
export function dopramulet() { if (!game.uamul) game._pending_message = 'You are not wearing an amulet.'; else display_inventory(String(obj_to_let(game.uamul)), false); return ECMD_OK; }

export function tool_being_used(obj) {
    if (obj?.owornmask & (W_TOOL | W_SADDLE)) return true;
    if (obj?.oclass !== TOOL_CLASS) return false;
    return obj === game.uwep || obj.lamplit || (obj.otyp === LEASH && obj.leashmon);
}

export function doprtool() {
    const lets = inventoryArray().filter(tool_being_used).map((obj) => obj_to_let(obj)).join('');
    if (!lets) game._pending_message = 'You are not using any tools.';
    else display_inventory(lets, false);
    return ECMD_OK;
}

export function doprinuse() {
    if (!inventoryArray().some(is_inuse)) game._pending_message = 'You are not wearing or wielding anything.';
    else display_inventory(null, false);
    return ECMD_OK;
}

export function useupf(obj, numused) {
    const used = (obj?.quan || 1) > numused ? splitobj(obj, numused) : obj;
    delobj(used);
    if (u_at(obj?.ox, obj?.oy) && game.u?.uundetected && hides_under(null)) hideunder(null);
}

export function let_to_name(letChar, unpaid = false, showsym = false) {
    const oclass = Number(letChar);
    const className = names[oclass] || (letChar === CONTAINED_SYM ? 'Bagged/Boxed items' : names[ILLOBJ_CLASS]);
    const label = unpaid ? `Unpaid ${className}` : className;
    if (showsym && oclass && def_oc_syms[oclass]) return `${label} ('${def_oc_syms[oclass].sym}')`;
    giState().invbuf = label;
    return label;
}

export function free_invbuf() { giState().invbuf = null; giState().invbufsiz = 0; }

export function reassign() {
    const inv = inventoryArray();
    let gold = null;
    const rest = [];
    for (const obj of inv) {
        if (!gold && obj.oclass === COIN_CLASS) gold = obj;
        else rest.push(obj);
    }
    for (let i = 0; i < rest.length; ++i)
        rest[i].invlet = i < 26 ? String.fromCharCode(97 + i) : i < 52 ? String.fromCharCode(65 + i - 26) : NOINVSYM;
    if (gold) gold.invlet = GOLD_SYM;
    const next = gold ? [gold, ...rest] : rest;
    syncInventory(next);
    glState().lastinvnr = Math.min(rest.length, 51);
}

export function check_invent_gold(why) {
    let goldstacks = 0, wrongslot = 0;
    for (const obj of inventoryArray()) if (obj.oclass === COIN_CLASS) { ++goldstacks; if (obj.invlet !== GOLD_SYM) ++wrongslot; }
    if (goldstacks > 1 || wrongslot) { impossible(`${why}: inventory gold inconsistency`); return true; }
    return false;
}

export function adjust_ok(obj) { return !obj || obj.oclass === COIN_CLASS ? GETOBJ_EXCLUDE : GETOBJ_SUGGEST; }
export function adjust_gold_ok(obj) { return obj ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE; }
export function doorganize() { if (!inventoryArray().length) game._pending_message = "You aren't carrying anything to adjust."; return ECMD_OK; }
export function adjust_split() { return ECMD_FAIL; }
export function doorganize_core(obj) { return obj ? ECMD_OK : ECMD_CANCEL; }

export function invdisp_nothing(hdr, txt) {
    renderMenuScreen([[hdr, '', txt]], [0, 0]);
}

export function worn_wield_only(obj) { return !!obj?.owornmask; }
export function display_minventory(mon, dflags, title) { void dflags; invdisp_nothing(title || `${mon?.name || 'Monster'} possessions:`, '(none)'); return null; }
export function cinv_doname(obj) { return obj?.otrapped ? `trapped ${doname(obj)}` : doname(obj); }
export function cinv_ansimpleoname(obj) { return obj?.otrapped ? `a trapped ${simpleonames(obj)}` : ansimpleoname(obj); }
export function display_cinventory(obj) { if (obj) obj.cknown = 1; if (Has_contents(obj)) display_inventory(null, false); else invdisp_nothing(`Contents of ${doname(obj)}:`, '(empty)'); return null; }
export function only_here(obj) { return obj?.ox === game.only?.x && obj?.oy === game.only?.y; }
export function display_binventory(x, y, as_if_seen) { void as_if_seen; let n = 0; for (const obj of iterateObjects(game.level?.buriedobjlist)) if (obj.ox === x && obj.oy === y) ++n; return n; }

export function prepare_perminvent(_window) {
    const invmode = iflags().perminv_mode || 0;
    if (perminv_flags !== invmode) {
        wri_info = { fromcore: { invmode } };
        perminv_flags = invmode;
    }
}

export function sync_perminvent() {
    if (!iflags().perm_invent) return;
    prepare_perminvent(game.WIN_INVEN ?? WIN_ERR);
    if (program_state().beyond_savefile_load) display_inventory(null, false);
}

export function perm_invent_toggled(negated) {
    in_perm_invent_toggled = true;
    if (negated) {
        iflags().perm_invent = false;
        game.WIN_INVEN = WIN_ERR;
    } else {
        iflags().perm_invent = true;
        sync_perminvent();
    }
    in_perm_invent_toggled = false;
}

export default {
    addinv,
    ddoinv,
    display_inventory,
    dolook,
    look_here,
    doprgold,
};
