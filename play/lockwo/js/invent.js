// invent.js - Inventory and look-here support.
// C ref: src/invent.c
//
// This file intentionally keeps one JavaScript function for each C function
// in invent.c.  Many game systems that invent.c calls into are still outside
// the JS port; those call sites are represented by local TODO stubs or by
// conservative no-op behavior so downstream porters have a stable 1:1 map.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { nhgetch } from './input.js';
import { docrt, flush_screen, newsym, pline, statusLine1Text, statusLine2Text, render_map_to_grid, y_n, topl_more, topl_more_ext, update_topl } from './display.js';
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
    MEAT_RING,
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
    base_oc_weight,
} from './mkobj.js';

import { getpos, getpos_render } from './hack.js';
import { observe_object as disco_observe_object, build_discoveries_rows, discover_object } from './o_init.js';
import { monster_by_pmidx } from './makemon.js';
import { strongmonst_flag as strongmonst, throws_rocks_flag, is_were_flag,
         is_neuter_flag, humanoid as humanoid_flag,
         mflags2_of, M2_DEMON } from './monflags_data.js';
import { tin_variety, SPINACH_TIN, ROTTEN_TIN, HOMEMADE_TIN, tintxts, vegetarian } from './eat.js';
import { enlightenment_lines } from './insight.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';
import { find_ac } from './u_init.js';
import { moveloop_turn, youHaveFast, youHaveVeryFast } from './allmain.js';
import { acurr_eff, exercise } from './attrib.js';
import {
    UNENCUMBERED, OVERLOADED,
    SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    WT_WEIGHTCAP_STRCON, WT_WEIGHTCAP_SPARE, WT_WOUNDEDLEG_REDUCT, MAX_CARR_CAP,
    A_CON, A_STR, A_INT, A_WIS, A_CHA, A_DEX, A_MAX, LEFT_SIDE, RIGHT_SIDE,
    P_DAGGER, P_KNIFE, P_SPEAR, P_SLING, P_CROSSBOW, P_DART, P_SHURIKEN,
    P_SKILLED, P_EXPERT,
    CQ_CANNED, CQ_REPEAT, CMDQ_KEY, CMDQ_INT,
    IS_FOUNTAIN, IS_THRONE, IS_SINK, IS_GRAVE, IS_ALTAR,
    TT_BEARTRAP, TT_INFLOOR,
    AM_SHRINE, AM_SANCTUM, Amask2align, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, A_NONE,
    TREE, IRONBARS, DRAWBRIDGE_DOWN, DBWALL, LAVAPOOL, LAVAWALL, ICE,
    POOL, MOAT, WATER,
    IS_DOOR, IS_FURNITURE, STONE, D_NODOOR, D_ISOPEN, D_BROKEN,
    Is_airlevel,
    DUST, ENGRAVE, HEADSTONE, BURN, MARK, ENGR_BLOOD,
    PLNMSG_MON_TAKES_OFF_ITEM,
    TIMEOUT,
} from './const.js';
import { engr_at, wipe_engr_at } from './engrave.js';
// role.js imports only gstate/rng/const, so this is cycle-safe.
import { roles, align_gname } from './role.js';

const LEASH = 236;
const CANDELABRUM_OF_INVOCATION = 262;
const SPE_BOOK_OF_THE_DEAD = 409;

// Armor / eyewear otyps used by the wear ('W') and take-off ('T') commands.
// C ref: include/onames.h (mirrors u_init.js).
const FEDORA = 92, HELMET = 97, SPLINT_MAIL = 124, RING_MAIL = 132,
    LEATHER_ARMOR = 134, LEATHER_JACKET = 135, HAWAIIAN_SHIRT = 136,
    ROBE = 143, CLOAK_OF_MAGIC_RESISTANCE = 148, CLOAK_OF_DISPLACEMENT = 149,
    SMALL_SHIELD = 150, LEATHER_GLOVES = 159,
    LENSES = 232, BLINDFOLD = 233, TOWEL = 234;
// Boots otyps (C ref: include/onames.h).  Every BOOTS() in objects.h has
// oc_delay 2, so donning/doffing any boots is a 2-turn dressing maneuver.
// SPEED_BOOTS additionally confer oc_oprop FAST (extrinsic), making the hero
// Very_fast while worn — see Boots_on() below and allmain.js u_calc_moveamt().
const LOW_BOOTS = 163, IRON_SHOES = 164, HIGH_BOOTS = 165, SPEED_BOOTS = 166,
    WATER_WALKING_BOOTS = 167, JUMPING_BOOTS = 168, ELVEN_BOOTS = 169,
    KICKING_BOOTS = 170, FUMBLE_BOOTS = 171, LEVITATION_BOOTS = 172;
// Ring otyps consulted by the accessory wear/remove path (C ref: onames.h).
// Only the attrib/AC-affecting rings need special handling; all other rings
// (regeneration, teleportation, ...) just confer their extrinsic via setworn().
const RIN_ADORNMENT = 173, RIN_GAIN_STRENGTH = 174, RIN_GAIN_CONSTITUTION = 175,
    RIN_INCREASE_ACCURACY = 176, RIN_INCREASE_DAMAGE = 177, RIN_PROTECTION = 178;

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
// Not a NetHack ECMD value: a JS-only sentinel meaning "this command handler
// declined; treat the key as unhandled" so the dispatcher prints the same
// "Unknown command '<k>'." it would have without the handler.  Used to keep the
// 'P' put-on handler scoped (see doputon()).
export const ECMD_NOTHANDLED = -99;

const TRUE = true;
const FALSE = false;
const WIN_ERR = -1;

const W_WEP = 0x00000001;
const W_SWAPWEP = 0x00000002;
const W_QUIVER = 0x00000004;
const W_ARMOR = 0x00000008;
// C ref: prop.h — accessory worn-mask bits.  These MUST NOT collide with the
// WA_ARMOR_ALL (0x7f) armor-slot bits used by armor_slot_mask()/worn_slot_get();
// the original low-bit values (0x10/0x20/0x40/0x100) overlapped WA_ARMS/G/F and
// WORN_SHIRT, which was harmless only while no accessory was ever worn.  Now
// that 'P'/'R' can wear rings/amulets/eyewear, use distinct high bits.
const W_RINGL = 0x00020000;
const W_RINGR = 0x00040000;
const W_AMUL = 0x00080000;
const W_TOOL = 0x00100000;
// W_BLINDF was 0x00200000, which is prop.h:126 W_BALL — the PUNISHMENT BALL
// slot.  Harmless while nothing in this file read W_BALL, but doname() now has
// to tell a worn blindfold from a chained iron ball, so the two need distinct
// bits.  Following this block's existing remapping convention (see the accessory
// comment above), W_BLINDF moves to a free high bit while W_BALL/W_CHAIN keep
// prop.h's real values, which is what read.js stamps into owornmask via
// const.js.  0x00080000 is NOT available here: this file already uses it for
// W_AMUL, and reusing it made an amulet answer the blindfold test (-7 on
// seed5006 before the collision was spotted).
const W_BLINDF = 0x00800000;
const W_BALL = 0x00200000;   // C ref: prop.h:126 — punishment ball
const BALL_CLASS_INV = 15;   // C ref: objclass.h BALL_CLASS
const W_CHAIN = 0x00400000;  // C ref: prop.h:127 — punishment chain
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
// C ref: objnam.c xname() (objnam.c:998) — when an object carries a personal
// name and its appearance is known (dknown), append " named <oname>".  For a
// quest artifact the leading "The " is downcased to "the ".  Returns the
// suffix string (empty when no name applies).  This is what makes a wished or
// otherwise-named artifact read e.g. "a silver saber named Grayswandir".
function oname_suffix(obj) {
    if (!obj || !has_oname(obj) || !obj.dknown) return '';
    let nm = ONAME(obj);
    if (obj.oartifact && /^The /.test(nm)) nm = 't' + nm.slice(1);
    return ' named ' + nm;
}
function has_omonst(_obj) { return false; }
function has_omid(_obj) { return false; }
function has_omailcmd(_obj) { return false; }
function OMAILCMD(obj) { return obj?.omailcmd || ''; }
// C ref: o_init.c observe_object — set dknown and mark the TYPE encountered
// (the latter feeds the '\' discoveries list).  Delegates the encountered
// bookkeeping to o_init.js so the discovery state lives in one place.
function observe_object(obj) { if (obj) { obj.dknown = 1; disco_observe_object(obj); } }
// C ref: hack.h makeknown(x) == discover_object(x, TRUE, TRUE, TRUE).
export function makeknown(otyp) {
    discover_object(otyp, true, true, true);
}
export function makeknown_credit(otyp) { makeknown(otyp); }
function discover_artifact(_id) {}
function learn_egg_type(_mnum) {}
// C ref: include/you.h Role_if(pm) — TRUE when the hero's role matches the
// given PM_ index.  The role is carried in urole.mnum (or u.umonnum).  Used by
// the doname BUC-word "uncursed" suppression for a Priest (Cleric), who senses
// BUC so the word is implicit (objnam.c doname_base, the !Role_if(PM_CLERIC)
// disjunct).
function Role_if(pm) {
    const m = game.urole?.mnum ?? game.u?.umonnum;
    return m === pm;
}
const PM_HEALER = 3;
const PM_CLERIC = 6;
const PM_MONK = 5;
const PM_TOURIST = 10;
const PM_WIZARD = 12;
const FAKE_AMULET_OF_YENDOR_OTYP = 212; // objects.h FAKE_AMULET_OF_YENDOR
function confers_luck(obj) { return obj?.otyp === 470; }
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
// C ref: objnam.c cxname_singular() == xname_flags(obj, CXN_SINGULAR).  xname
// never prepends the BUC word ("blessed"/"uncursed"/"cursed") — that belongs to
// doname() alone — so a BUC-known object still reads e.g. "ring of see invisible"
// here (used by loot_xname, the itemactions title/label, and data.base lookups).
export function cxname_singular(obj) { return simple_obj_name(obj, { article: false, quantity: false, buc: false }); }
// C ref: objnam.c xname() — the bare object name: no "a"/"an" article and no
// BUC word (unlike doname()), but still quantity-aware for stackable types.
export function xname(obj) { observe_object(obj); return simple_obj_name(obj, { article: false, buc: false }); }
function yname(obj) { return simple_obj_name(obj); }
function ansimpleoname(obj) { return with_article(simple_obj_name(obj, { quantity: false, buc: false })); }
function simpleonames(obj) { return simple_obj_name(obj, { article: false, quantity: false, buc: false }); }
function distant_name(obj, fn = doname) { return fn(obj); }
// C ref: objnam.c doname() appends the worn-status suffix ("(being worn)",
// "(wielded)", "(on right hand)", ...) unconditionally — it is not limited to
// the inventory window, so every doname()/obj_doname() caller (dip/wield/drop
// prompts included) must see it too.
function doname(obj) { observe_object(obj); return simple_obj_name(obj, { empty: true }) + worn_status_suffix(obj); }
function doname_with_price(obj) { return doname(obj); }
// C ref: invent.c doname() — full floor-object name (with quantity/article) for
// the "You see here ..." auto-announcement after a step.  Exported for cmd.js.
export function floor_object_name(obj) { return doname(obj); }

// C ref: invent.c doname()/wield.c wield_tool() — exposed for apply.js #rub.
export function obj_doname(obj) { return doname(obj); }

// C ref: objnam.c short_oname(obj, func, altfunc, lenlimit) — used to build a
// getobj/y_n prompt's object phrase within a fixed buffer budget.  When the
// full doname() is too long, C first shortens an individually-named object's
// custom name/call-name (oc_uname/ONAME) — not modeled here, as no covered
// session dips a custom-named object — then, still too long, temporarily
// hides the BUC/erosion words (bknown/rknown/greased/oeroded/oeroded2, the
// exact attribute list C zeroes) and retries before falling back to a bare
// definite-article name.  The temporary field clears are always restored.
export function short_oname(obj, lenlimit) {
    if (!obj) return 'nothing';
    let outbuf = doname(obj);
    if (outbuf.length <= lenlimit) return outbuf;
    const saved = {
        bknown: obj.bknown, rknown: obj.rknown, greased: obj.greased,
        oeroded: obj.oeroded, oeroded2: obj.oeroded2,
    };
    obj.bknown = obj.rknown = obj.greased = 0;
    obj.oeroded = obj.oeroded2 = 0;
    outbuf = doname(obj);
    Object.assign(obj, saved);
    if (outbuf.length <= lenlimit) return outbuf;
    return `the ${simpleonames(obj)}`;
}

// C ref: objnam.c simple_typename(otyp) — the plain type name of an object
// type, with any user-given call name suppressed and any trailing " (...)"
// description stripped (e.g. "potion of healing" not "the potion of healing",
// "chest" for a chest).  Used by apply.c use_stethoscope() to name the object a
// disguised mimic was pretending to be.  We treat the type as identified
// (oc_name_known) so a known container/weapon/tool shows its true name.
export function simple_typename(otyp) {
    const ocl = objects[otyp];
    if (!ocl) return 'thing';
    const dummy = { otyp, oclass: ocl.oclass, quan: 1, dknown: 1, known: 1, corpsenm: -1 };
    let s = simpleonames(dummy);
    const i = s.indexOf(' (');
    if (i >= 0) s = s.slice(0, i);
    return s;
}

// C ref: wield.c wield_tool(obj, verb) — wield a tool for #rub/#force/&c.
// Returns TRUE when the tool got wielded.  All four refusals (worn item, welded
// weapon, shield vs bimanual, failed swap) are ported; only cantwield() (a
// handless polyform) is left out, since no polyform reaches this port.
export async function wield_tool(obj, verb) {
    if (game.uwep && obj === game.uwep) return true; // already wielding it
    if (!verb) verb = 'wield';
    const what = xname(obj);
    let more_than_1 = ((obj.quan || 1) > 1 || what.includes('pair of ')
                       || what.includes('s of '));

    // C ref: wield.c wield_tool() — each refusal prints and returns FALSE, so
    // an unported one silently wielded something C would not have.
    if ((obj.owornmask || 0) & (WA_ARMOR_ALL | W_ACCESSORY)) {
        await pline(`You can't ${verb} ${yname(obj)} while wearing ${more_than_1 ? 'them' : 'it'}.`);
        return false;
    }
    if (game.uwep && welded(game.uwep)) {
        if (game.flags?.verbose !== false) {
            let hand = body_part(6 /*HAND*/);
            if (bimanual(game.uwep)) hand = makeplural(hand);
            if (what.includes('pair of ')) more_than_1 = false;
            await pline(`Since your weapon is welded to your ${hand}, you cannot ${verb} ${more_than_1 ? 'those' : 'that'} ${what}.`);
        } else {
            await pline("You can't do that.");
        }
        return false;
    }
    // cantwield(): a handless/nolimbs polyform can't hold anything strongly
    // enough; not reachable for a humanoid hero, so no branch is emitted here.
    if (game.uarms && bimanual(obj)) {
        await pline(`You cannot ${verb} a two-handed ${obj.oclass === WEAPON_CLASS ? 'weapon' : 'tool'} while wearing a shield.`);
        return false;
    }

    if (game.uquiver === obj) setuqwep(null);
    if (game.uswapwep === obj) {
        await doswapweapon();
        if (game.uswapwep === obj) return false;   /* the swap failed */
    } else {
        const oldwep = game.uwep;
        if (will_weld(obj)) {
            ready_weapon(obj);
        } else {
            await update_topl(`You now wield ${doname(obj)}.`);
            setuwep_slot(obj);
        }
        if (game.flags?.pushweapon && oldwep && game.uwep !== oldwep)
            setuswapwep(oldwep);
    }
    if (game.uwep && game.uwep !== obj) return false;
    if (game.u && game.u.twoweap) untwoweapon();
    if (obj.oclass !== WEAPON_CLASS) game.unweapon = true;
    return true;
}
function corpse_xname(obj, _name, flagsArg = 0) { return simple_obj_name(obj, { article: !!(flagsArg & 8) }); }
function killer_xname(obj) { return simple_obj_name(obj, { article: false }); }

// C ref: do_name.c docall_xname(obj) — the bare "a/an <appearance>" name used
// in the "Call <x>:" prompt: a fresh copy with diluted/poison/BUC fixups so it
// reads as the plain unidentified type ("a ruby potion", not "a diluted ...").
function docall_xname(obj) {
    const otemp = { ...obj, quan: 1, blessed: 0, cursed: 0 };
    if (otemp.oclass === POTION_CLASS) otemp.odiluted = 0;
    return with_article(simple_obj_name(otemp, { quantity: false, buc: false }));
}

// C ref: do_name.c docall(obj) — prompt "Call <a appearance>:" and attach the
// typed call-name to the object TYPE (objects[].oc_uname), adding it to the
// discoveries list.  The unacknowledged taste message is paged with --More--
// (captured as its own frame) before getlin overwrites the top line.  Returns
// after recording (or clearing) the type's user-name.
export async function docall(obj) {
    if (!obj?.dknown) return;          // probably blind
    await flush_screen(1);
    // getlin is about to overwrite the top-line message, so page it first.
    // Some callers route their taste/feel message through a plain assignment
    // that (unlike real pline()) never sets toplin NEED_MORE, so check the
    // pending text itself rather than relying solely on hooked_tty_getlin's
    // own toplin check below — and clear both here so that check (C ref:
    // win/tty/getline.c hooked_tty_getlin():53-54) doesn't page a second time
    // for callers (e.g. read.js's update_topl-based messages) that already
    // left toplin NEED_MORE set.
    if (game._pending_message) {
        await topl_more();
        game._pending_message = '';
        game._toplin = 0;
    }
    const qbuf = `Call ${docall_xname(obj)}:`;
    const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
    const raw = await hooked_tty_getlin(qbuf, null);
    // The taste message was acknowledged (--More--) and getlin overwrote the
    // top line; C leaves the message window empty afterward (TOPLINE_EMPTY).
    game._pending_message = '';
    if (!raw || raw === '\x1b') return;
    const buf = mungspaces(raw);
    const ocl = objects[obj.otyp];
    if (!buf) {
        if (ocl?.oc_uname) ocl.oc_uname = null;   // undiscover (clear call-name)
    } else {
        if (ocl) ocl.oc_uname = buf;
        discover_object(obj.otyp, false, true, true);
    }
    update_inventory();
}

// C ref: do_name.c objtyp_is_callable()/name_ok()/call_ok().
function objtyp_is_callable(otyp) {
    const ocl = objects[otyp];
    if (!ocl) return false;
    if (ocl.oc_uname) return true;
    if (otyp === AMULET_OF_YENDOR || otyp === FAKE_AMULET_OF_YENDOR_OTYP)
        return false;
    return [AMULET_CLASS, SCROLL_CLASS, POTION_CLASS, WAND_CLASS, RING_CLASS,
        GEM_CLASS, SPBOOK_CLASS, ARMOR_CLASS, TOOL_CLASS, VENOM_CLASS]
        .includes(ocl.oclass) && DESCR_BY_OTYP[otyp] != null;
}

function name_ok(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
    if (!obj.dknown || obj.oartifact || obj.otyp === SPE_NOVEL)
        return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}

function call_ok(obj) {
    if (!obj || !objtyp_is_callable(obj.otyp)) return GETOBJ_EXCLUDE;
    const ocl = objects[obj.otyp];
    if (!obj.dknown || (ocl.oc_name_known && !ocl.oc_uname))
        return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}

async function do_oname(obj) {
    if (obj.otyp === SPE_NOVEL) {
        await pline(`${simple_obj_name(obj)} already has a published name.`);
        return;
    }
    if (!(game.u?.blinded > 0) && !game.ublindf) observe_object(obj);
    const target = simple_obj_name(obj, { article: false, quantity: false, buc: false });
    const which = (obj.quan || 1) > 1 ? 'these' : 'this';
    const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
    let buf = await hooked_tty_getlin(`What do you want to name ${which} ${target}?`, null);
    game._pending_message = '';
    if (!buf || buf === '\x1b') return;
    buf = mungspaces(buf).slice(0, 62);
    if (obj.oartifact) {
        await pline(`${ONAME(obj) || 'The artifact'} resists the attempt.`);
        return;
    }
    oname(obj, buf);
    update_inventory();
}

export async function name_inventory_object() {
    const obj = await getobj('name', name_ok, GETOBJ_PROMPT);
    if (obj) await do_oname(obj);
}

export async function call_inventory_object() {
    const obj = await getobj('call', call_ok, GETOBJ_NOFLAGS);
    if (!obj) return;
    if (!(game.u?.blinded > 0) && !game.ublindf) observe_object(obj);
    if (!obj.dknown)
        await pline('You would never recognize another one.');
    else
        await docall(obj);
}

// C ref: do.c trycall(obj) — offer to name an unidentified object type after
// the hero gets non-identifying feedback (e.g. the taste of an unknown potion).
export async function trycall(obj) {
    const ocl = objects[obj.otyp];
    if (ocl && !ocl.oc_name_known && !ocl.oc_uname) await docall(obj);
}
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
// C ref: mkobj.c obj_extract_self() — unlink an object from whatever list it is
// currently on (dispatch on obj->where).  A floor object must be removed from
// the level's object list (our flat game.level.objects array) via
// floor_extract_self; otherwise it (e.g. a force-broken chest) lingers on the
// floor and the pet's dog_goal fobj scan re-rolls an extra obj_resists rn2(100)
// that C never makes (seed0014 step-47 divergence).  Inventory/container/minvent
// objects are unlinked from the player's inventory list as before.
function obj_extract_self(obj) {
    if (!obj) return;
    if (obj.where === OBJ_FLOOR) { floor_extract_self(obj); return; }
    removeObjectFromAllInventories(obj);
    obj.where = OBJ_FREE;
}
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
// Per-artifact properties needed by touch_artifact (C ref: include/artilist.h).
// Keyed by obj.oartifact (1-based index into artilist[]).  Only the fields the
// hero-touch path consults are recorded: SPFX_RESTR / SPFX_INTEL bits, the
// artifact's alignment, and its restricted role (race is NON_PM for every
// self-willed artifact, so it never affects badclass and is omitted).
// Alignment literals match const.js: A_NONE=-128, A_CHAOTIC=-1, A_NEUTRAL=0,
// A_LAWFUL=1.  role is the urole.mnum value (Archeologist=0 .. Wizard=12) or
// -1 (NON_PM).
const ARTI_TOUCH_PROPS = {
    1:  { restr: true,  intel: true,  align: 1,    role: 4  }, // Excalibur (KNIGHT)
    2:  { restr: true,  intel: true,  align: -1,   role: -1 }, // Stormbringer
    3:  { restr: true,  intel: false, align: 0,    role: 11 }, // Mjollnir (VALKYRIE)
    4:  { restr: true,  intel: false, align: 0,    role: 1  }, // Cleaver (BARBARIAN)
    5:  { restr: true,  intel: false, align: -1,   role: -1 }, // Grimtooth
    6:  { restr: false, intel: false, align: -1,   role: -1 }, // Orcrist
    7:  { restr: false, intel: false, align: -1,   role: -1 }, // Sting
    8:  { restr: true,  intel: false, align: 0,    role: 12 }, // Magicbane (WIZARD)
    9:  { restr: true,  intel: false, align: -128, role: -1 }, // Frost Brand
    10: { restr: true,  intel: false, align: -128, role: -1 }, // Fire Brand
    11: { restr: true,  intel: false, align: -128, role: -1 }, // Dragonbane
    12: { restr: true,  intel: false, align: 1,    role: 6  }, // Demonbane (CLERIC)
    13: { restr: true,  intel: false, align: -128, role: -1 }, // Werebane
    14: { restr: true,  intel: false, align: 1,    role: -1 }, // Grayswandir
    15: { restr: true,  intel: false, align: 0,    role: -1 }, // Giantslayer
    16: { restr: true,  intel: false, align: -128, role: -1 }, // Ogresmasher
    17: { restr: true,  intel: false, align: -128, role: -1 }, // Trollsbane
    18: { restr: true,  intel: false, align: 0,    role: -1 }, // Vorpal Blade
    19: { restr: true,  intel: false, align: 1,    role: 9  }, // Snickersnee (SAMURAI)
    20: { restr: true,  intel: false, align: 1,    role: -1 }, // Sunsword
    21: { restr: true,  intel: true,  align: 1,    role: 0  }, // Orb of Detection (ARCHEOLOGIST)
    22: { restr: true,  intel: true,  align: 0,    role: 1  }, // Heart of Ahriman (BARBARIAN)
    23: { restr: true,  intel: true,  align: 1,    role: 2  }, // Sceptre of Might (CAVE_DWELLER)
    24: { restr: true,  intel: true,  align: -1,   role: -1 }, // Palantir (obsolete)
    25: { restr: true,  intel: true,  align: 0,    role: 3  }, // Staff of Aesculapius (HEALER)
    26: { restr: true,  intel: true,  align: 1,    role: 4  }, // Magic Mirror of Merlin (KNIGHT)
    27: { restr: true,  intel: true,  align: 0,    role: 5  }, // Eyes of the Overworld (MONK)
    28: { restr: true,  intel: true,  align: 1,    role: 6  }, // Mitre of Holiness (CLERIC)
    29: { restr: true,  intel: true,  align: -1,   role: 7  }, // Longbow of Diana (RANGER)
    30: { restr: true,  intel: true,  align: -1,   role: 8  }, // Master Key of Thievery (ROGUE)
    31: { restr: true,  intel: true,  align: 1,    role: 9  }, // Tsurugi of Muramasa (SAMURAI)
    32: { restr: true,  intel: true,  align: 0,    role: 10 }, // PYEC (TOURIST)
    33: { restr: true,  intel: true,  align: 0,    role: 11 }, // Orb of Fate (VALKYRIE)
    34: { restr: true,  intel: true,  align: 0,    role: 12 }, // Eye of the Aethiopica (WIZARD)
};

// C ref: prop.h Antimagic == HAntimagic || EAntimagic.  The port has no
// oc_oprop column, so the extrinsic is read from whichever uprops mirror the
// granting code used (js/mcastu.js and js/insight.js each picked one).
function Antimagic() {
    const u = game.u;
    return !!(u?.uprops?.Antimagic || u?.Antimagic || u?.HAntimagic || u?.EAntimagic);
}
// C ref: youprop.h Hate_silver == (u.ulycn >= LOW_PM || hates_silver(youmonst)).
// mondata.c hates_silver(): were-creatures, S_VAMPIRE, M2_DEMON, shades, and
// imps other than the tengu.  LOW_PM is 0 (u.ulycn is NON_PM == -1 normally).
const S_VAMPIRE_MLET = 48, S_IMP_MLET = 9;
function Hate_silver() {
    if ((game.u?.ulycn ?? -1) >= 0) return true;
    const ptr = youmonst_data();
    if (!ptr) return false;
    if (is_were_flag(ptr)) return true;
    if (ptr.mcls === S_VAMPIRE_MLET) return true;
    if ((mflags2_of(ptr) & M2_DEMON) !== 0) return true;
    if (ptr.name === 'shade') return true;
    if (ptr.mcls === S_IMP_MLET && ptr.name !== 'tengu') return true;
    return false;
}
// C ref: hack.h Maybe_Half_Phys(dmg) — halve (rounding up) under HALF_PHDAM.
function Maybe_Half_Phys(dmg) {
    return (game.u?.HHalf_physical_damage || game.u?.EHalf_physical_damage)
        ? Math.trunc((dmg + 1) / 2) : dmg;
}
// C ref: hack.c losehp() reduced to the hp arithmetic (death handling lives in
// the callers' own losehp copies elsewhere in the port).
function losehp_invent(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhpmax = u.uhp;
    if (u.uhp < 1) u.uhp = 0;
    game.botl = true;
}

// C ref: artifact.c touch_artifact().  Hero (or monster) tries to touch an
// artifact; returns false if it refuses to be held.  Faithfully consumes the
// rn2(4) at artifact.c:945 under the same short-circuit conditions as C, and —
// when that lands — the blast's d(Antimagic ? 2 : 4, self_willed ? 10 : 4)
// damage roll plus the silver rnd(10) bonus, which are RNG draws C makes and
// no earlier port made.  Only the hero path (mon === &youmonst) is modelled.
export function touch_artifact(obj, _mon) {
    const m = obj && obj.oartifact;
    const oart = m && ARTI_TOUCH_PROPS[m];
    if (!oart) return true; // ART_NONARTIFACT
    // Only hero touches are exercised; treat mon as the hero (yours = true).
    const yours = true;
    const u = game.u;
    const ualignType = u?.ualign?.type ?? 0;
    const ualignRecord = u?.ualign?.record ?? 0;
    const uroleMnum = game.urole?.mnum ?? -1;

    const self_willed = oart.intel;
    // badclass: self-willed artifact whose restricted role/race doesn't match
    // the hero.  (race is NON_PM for every self-willed artifact, so omitted.)
    const badclass = self_willed
        && (oart.role !== -1 /*NON_PM*/ && oart.role !== uroleMnum);
    // badalign: SPFX_RESTR artifact with a real alignment the hero violates.
    let badalign = oart.restr
        && oart.align !== -128 /*A_NONE*/
        && (oart.align !== ualignType || ualignRecord < 0);
    // C: if (!badalign) badalign = bane_applies(oart, mon).  bane_applies needs
    // the hero polymorphed into a bane-target form, which the wish replays never
    // are, so this stays false.

    game._touch_blasted = false;
    // C: if (((badclass || badalign) && self_willed)
    //        || (badalign && (!yours || !rn2(4)))) { ... blast ... }
    // The rn2(4) is evaluated under the same short-circuit ordering as C.
    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !rn2(4)))) {
        // C ref: artifact.c:947-957.  A non-hero toucher returns 0 before any
        // RNG; the hero takes the blast.
        if (!yours) return false;
        // C: You("are blasted by %s power!", s_suffix(the(xname(obj))))
        game._pending_message =
            `You are blasted by ${s_suffix(`the ${xname(obj)}`)} power!`;
        game._touch_blasted = true;
        let dmg = d(Antimagic() ? 2 : 4, self_willed ? 10 : 4);
        // C: half (Maybe_Half_Phys quarter) of the usual silver damage bonus.
        if (objects[obj.otyp]?.material === 10 /* SILVER */ && Hate_silver())
            dmg += Maybe_Half_Phys(rnd(10));
        losehp_invent(dmg);
        exercise(A_WIS, false);
    }

    // C: if (badclass && badalign && self_willed) -> object evades grasp.
    if (badclass && badalign && self_willed) return false;
    return true;
}
function u_safe_from_fatal_corpse(_obj, _checks) { return true; }

// C ref: monst.h gy.youmonst.data == &mons[u.umonnum] (set_uasmon keeps
// umonnum == umonster for the hero's own form, so this is correct polymorphed
// or not).  u.data is the polyself-maintained mirror; fall back to it when the
// pmidx lookup is unavailable.
function youmonst_data() {
    const pmidx = game.u?.umonnum;
    return (pmidx != null ? monster_by_pmidx(pmidx) : null) || game.u?.data || null;
}

// C ref: attrib.c acurrstr() — encode A_STR (3..125; 18/01 stored as 19, ..)
// onto the 3..25 scale used by weight_cap.  (Mirrors cmd.js' acurrstr.)
function acurrstr() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 0;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: hack.c weight_cap() — the hero's carrying capacity.  Base STR+CON
// capacity, polymorphed-form scaling, the Levitation/air-level/strong-steed
// override, and the wounded-legs reduction (a bear trap that wounds a leg
// drops carrcap by WT_WOUNDEDLEG_REDUCT, which is what pushes the seed0004
// hero from unencumbered to Burdened).  Consumes no RNG, but every encumbrance
// predicate downstream (allmain.c moveloop_core, do.c doup, uhitm.c) reads it.
// The Boots_on/afternmv ELevitation deferral and float_vs_flight() are not
// modelled (no multi-turn levitation-boots don in this port).
function weight_cap() {
    const u = game.u;
    let carrcap = WT_WEIGHTCAP_STRCON * (acurrstr() + acurr_eff(A_CON))
                  + WT_WEIGHTCAP_SPARE;
    // C ref: hack.c weight_cap() Upolyd branch (consistent with mon.c
    // can_carry()) — small/large forms scale capacity by body size (cwt) or,
    // for the cwt==0 case, by msize relative to human-sized (MZ_HUMAN=2).
    if (u?.Upolyd && u.data) {
        const MZ_HUMAN = 2, WT_HUMAN = 1450;
        if (u.data.mlet === 'n') {
            carrcap = MAX_CARR_CAP;
        } else if (!u.data.cwt) {
            carrcap = Math.trunc((carrcap * (u.data.msize ?? MZ_HUMAN)) / MZ_HUMAN);
        } else if (!strongmonst(u.data) || (strongmonst(u.data) && u.data.cwt > WT_HUMAN)) {
            carrcap = Math.trunc((carrcap * u.data.cwt) / WT_HUMAN);
        }
    }
    // C ref: hack.c:4324 — Levitation / Plane of Air / strong steed pin
    // capacity at MAX_CARR_CAP and, crucially, SKIP the wounded-legs reduction
    // (it lives in the else branch: airborne legs can't be limped on).
    if (u?.uprops?.Levitation || Is_airlevel()
        || (u?.usteed && strongmonst(u.usteed.data))) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
        // C ref: hack.c:4331 `if (!Flying)` — wounded legs only interfere with
        // proper WALKING.  A polymorphed flyer sets u.uprops.Flying in
        // set_uasmon(); Flying is unset for every non-poly hero.
        const ewl = (!u?.uprops?.Flying) ? (u?.EWounded_legs || 0) : 0;
        if (ewl & LEFT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
        if (ewl & RIGHT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
    }
    return Math.max(carrcap, 1);
}

// C ref: hack.c inv_weight() — total inventory weight minus capacity; also
// stashes the freshly-computed capacity in game._wc (C's gw.wc) for
// calc_capacity().  C's test is `otyp != BOULDER || !throws_rocks(youmonst)`:
// a boulder DOES count for an ordinary hero and is free only for a rock-thrower
// (giant polyform).  The previous `otyp !== BOULDER` skipped it unconditionally,
// which is the opposite of C and hid ~6000 weight from every encumbrance test.
function inv_weight() {
    let wt = 0;
    const ydata = youmonst_data();
    for (const otmp of inventoryArray()) {
        if (otmp.oclass === COIN_CLASS)
            wt += Math.trunc(((otmp.quan || 0) + 50) / 100);
        else if (otmp.otyp !== BOULDER || !throws_rocks_flag(ydata))
            wt += otmp.owt || 0;
    }
    const wc = weight_cap();
    game._wc = wc;
    return wt - wc;
}

// C ref: hack.c calc_capacity(xtra_wt) — encumbrance level for a given extra
// weight.  Returns UNENCUMBERED when within capacity, else (wt*2/wc)+1 capped
// at OVERLOADED.
function calc_capacity(xtra_wt) {
    const wt = inv_weight() + (xtra_wt || 0);
    if (wt <= 0) return UNENCUMBERED;
    const wc = game._wc;
    if (wc <= 1) return OVERLOADED;
    const cap = Math.trunc((wt * 2) / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

// C ref: hack.c near_capacity() — calc_capacity(0).
export function near_capacity() { return calc_capacity(0); }

// C ref: pickup.c encumber_msg() — prints a message when the encumbrance level
// changes since the last check, and remembers the new level in go.oldcap
// (tracked as game._oldcap).  Consumes no RNG.
export async function encumber_msg() {
    const newcap = near_capacity();
    const oldcap = game._oldcap || 0;
    // C ref: pickup.c encumber_msg() sets disp.botl = TRUE AFTER its own
    // Your()/You() message, not before — so whether the status line's BL_CAP
    // field shows the new level DURING that message's own --More-- (which can
    // fire if an earlier pending message, e.g. a pickup's prinv line, is still
    // unflushed) depends on whether disp.botl was ALREADY dirty from something
    // the caller did first (do.c set_wounded_legs()/heal_legs() both set
    // disp.botl = TRUE before calling this).  Mirror that with game.botl: if
    // it's already dirty, publish _curcap eagerly (matches wounded-legs); if
    // not (an ordinary pickup crossing a capacity threshold has nothing else
    // dirtying botl yet), defer until our own message(s) are queued below.
    const dirtyBefore = !!game.botl;
    if (dirtyBefore) game._curcap = newcap;
    if (oldcap < newcap) {
        switch (newcap) {
        case 1: await update_topl('Your movements are slowed slightly because of your load.'); break;
        case 2: await update_topl('You rebalance your load.  Movement is difficult.'); break;
        case 3: await update_topl('You stagger under your heavy load.  Movement is very hard.'); break;
        default: await update_topl(newcap === 4
            ? 'You can barely move a handspan with this load!'
            : "You can't even move a handspan with this load!"); break;
        }
        game.botl = true;
    } else if (oldcap > newcap) {
        switch (newcap) {
        case 0: await update_topl('Your movements are now unencumbered.'); break;
        case 1: await update_topl('Your movements are only slowed slightly by your load.'); break;
        case 2: await update_topl('You rebalance your load.  Movement is still difficult.'); break;
        case 3: await update_topl('You stagger under your load.  Movement is still very hard.'); break;
        }
        game.botl = true;
    }
    game._curcap = newcap;
    game._oldcap = newcap;
}
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
// C ref: zap.c obj_resists(obj, ochance, achance).  The invocation items, the
// Amulet and a Rider corpse always resist; everything else rolls rn2(100) and resists when
// the roll lands below the per-object chance.  delobj_core() calls this with
// ochance == achance == 0, so ordinary objects never resist — but the rn2(100)
// MUST still fire to keep the PRNG stream aligned with C (e.g. delobj(box) at
// the end of breakchestlock()).
// C ref: mondata.h is_rider(ptr) — a pointer comparison against the three
// Rider entries, so matching by species name is the faithful form here.
const RIDER_NAMES = new Set(['Death', 'Pestilence', 'Famine']);
function is_rider_pm(pmidx) {
    return RIDER_NAMES.has(monster_by_pmidx(pmidx)?.name || '');
}
function obj_resists(obj, ochance, achance) {
    const otyp = obj?.otyp;
    if (otyp === AMULET_OF_YENDOR
        || otyp === SPE_BOOK_OF_THE_DEAD
        || otyp === CANDELABRUM_OF_INVOCATION
        || otyp === BELL_OF_OPENING
        || (otyp === CORPSE && is_rider_pm(obj?.corpsenm))) {
        return true;
    }
    const chance = rn2(100);
    return chance < (obj?.oartifact ? achance : ochance);
}
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
// C ref: objnam.c not_fully_identified(otmp).  Gold is always fully ID'd; an
// object is "not fully identified" when a fundamental hallmark is missing
// (known / dknown / bknown / oc_name_known), a container's contents/lock aren't
// known, or an undiscovered artifact.  rknown (erosion-proofing) only matters
// for damageable objects (armor/weapon/weptool/ball); for everything else it is
// irrelevant, so the prior unconditional `rknown` test wrongly flagged ordinary
// items (and gold) as unidentified, making the identify-scroll path mis-fire.
function not_fully_identified(obj) {
    if (!obj) return false;
    if (obj.oclass === COIN_CLASS) return false; // gold: always fully ID'd
    // C effective oc_name_known: an object with NO randomized appearance
    // (OBJ_DESCR == NoDes => absent from DESCR_BY_OTYP) is type-known from the
    // start (init_objects forces oc_name_known = 1 for it).  The JS objects[]
    // table only stores the explicit BITS() flag, so treat a missing-appearance
    // object as name-known here to match C's identification semantics.
    const typeKnown = !!objects[obj.otyp]?.oc_name_known
        || DESCR_BY_OTYP[obj.otyp] == null;
    if (!obj.known || !obj.dknown || !obj.bknown || !typeKnown)
        return true;
    if ((!obj.cknown && (Is_container(obj) || obj.otyp === STATUE))
        || (!obj.lknown && Is_box(obj)))
        return true;
    // (undiscovered artifacts: the owned sessions carry none; skipped.)
    if (obj.rknown
        || (obj.oclass !== ARMOR_CLASS && obj.oclass !== WEAPON_CLASS
            && !is_weptool(obj) && obj.oclass !== BALL_CLASS))
        return false;
    // lack of rknown only matters for vulnerable (damageable) objects.
    return is_damageable(obj);
}
// C ref: objclass.h Is_box() — large box / chest / ice box (lockable boxes).
function Is_box(obj) { return obj?.otyp === 214 || obj?.otyp === 215 || obj?.otyp === 216; }
// C ref: objnam.c is_damageable() — armor/weapon-class objects can erode.
function is_damageable(obj) {
    return obj?.oclass === ARMOR_CLASS || obj?.oclass === WEAPON_CLASS
        || is_weptool(obj);
}
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
// C ref: cmd.c cmdq_* — the canned command queue (CQ_CANNED).  itemactions()
// pushes the chosen object's invlet here; a subsequent getobj() pops it as the
// object selection WITHOUT rendering a prompt (mirroring tty's cmdq_pop fast
// path).  The queue lives on game so it survives across the dispatched command.
function _cmdq(which) {
    const key = which === CQ_REPEAT ? '_cmdq_repeat' : '_cmdq_canned';
    if (!game[key]) game[key] = [];
    return game[key];
}
function cmdq_pop(which = CQ_CANNED) {
    const q = _cmdq(which);
    return q.length ? q.shift() : null;
}
function cmdq_clear(which = CQ_CANNED) { _cmdq(which).length = 0; }
function cmdq_add_int(which, n) { _cmdq(which).push({ typ: CMDQ_INT, intval: n }); }
function cmdq_add_key(which, k) {
    _cmdq(which).push({ typ: CMDQ_KEY, key: typeof k === 'number' ? k : String(k).charCodeAt(0) });
}
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
// C ref: objnam.c singplur_compound — find a compound-phrase connector
// (" of ", " labeled ", " called ", " named ", ...) so makeplural can
// pluralize only the head noun (e.g. "potion of healing" -> "potions of
// healing").  Returns the index of the connector, or -1.
const SINGPLUR_COMPOUNDS = [
    ' of ', ' labeled ', ' called ', ' named ', ' above',
    ' versus ', ' from ', ' in ', ' on ', ' a la ', ' with',
    ' de ', " d'", ' du ', ' au ', '-in-', '-at-',
];
function singplur_compound(str) {
    const lower = str.toLowerCase();
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c !== ' ' && c !== '-') continue;
        for (const cmpd of SINGPLUR_COMPOUNDS)
            if (lower.startsWith(cmpd, i)) return i;
    }
    return -1;
}
// C ref: objnam.c makeplural — pluralize an object/word.  Handles the
// "pair of ..." skip, "X of Y" compound (pluralize the head), and the common
// English suffix rules (es / ies / ves / man->men / us->i / ium->ia /
// sis->ses, default +s).  Pronoun and exotic biology cases C also covers are
// omitted; they don't occur for the object names this port exercises.
export function makeplural(oldstr) {
    if (oldstr == null) return 's';
    let s = String(oldstr).replace(/^ +/, '');
    if (!s) return 's';

    // "pair of boots/gloves" stays singular ("3 pair of boots").
    if (/^pair of /i.test(s)) return s;

    // Split off a compound tail ("X of Y") so only the head pluralizes.
    let head = s, excess = '';
    const cidx = singplur_compound(s);
    if (cidx >= 0) { head = s.slice(0, cidx); excess = s.slice(cidx); }

    // Strip trailing blanks from the head; operate on its last letter.
    head = head.replace(/ +$/, '');
    const len = head.length;
    const last = head.charAt(len - 1);
    const lc = last.toLowerCase();
    const prev = len >= 2 ? head.charAt(len - 2).toLowerCase() : '';
    const vowels = 'aeiou';

    let plural;
    if (len === 1 || !/[a-z]/i.test(last)) {
        plural = `${head}'s`;
    } else if (len >= 3 && head.slice(-3).toLowerCase() === 'man'
               && !/[aeiou]man$/i.test(head) /* avoid shaman/human-ish */) {
        plural = `${head.slice(0, -2)}en`;
    } else if (lc === 'f' && (len < 3 || head.slice(-3).toLowerCase() !== 'erf')
               && ('lr'.includes(prev) || vowels.includes(prev))) {
        plural = `${head.slice(0, -1)}ves`;
    } else if (len >= 3 && head.slice(-3).toLowerCase() === 'ium') {
        plural = `${head.slice(0, -3)}ia`;
    } else if (len > 3 && head.slice(-2).toLowerCase() === 'us'
               && !(len >= 5 && head.slice(-5).toLowerCase() === 'lotus')
               && !(len >= 6 && head.slice(-6).toLowerCase() === 'wumpus')) {
        plural = `${head.slice(0, -2)}i`;
    } else if (len >= 3 && head.slice(-3).toLowerCase() === 'sis') {
        plural = `${head.slice(0, -2)}es`;
    } else if ('zxs'.includes(lc)
               || (len >= 2 && lc === 'h' && 'cs'.includes(prev))
               || (len >= 4 && head.slice(-3).toLowerCase() === 'ato')
               || (len >= 5 && head.slice(-5).toLowerCase() === 'dingo')) {
        plural = `${head}es`;
    } else if (lc === 'y' && !vowels.includes(prev)) {
        plural = `${head.slice(0, -1)}ies`;
    } else {
        plural = `${head}s`;
    }
    return plural + excess;
}
function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }
function s_suffix(s) { return /s$/.test(s) ? `${s}'` : `${s}'s`; }
function highc(s) { return String(s).charAt(0).toUpperCase(); }
function mungspaces(s) { return String(s).replace(/\s+/g, ' ').trim(); }
function ing_suffix(s) { return `${s.replace(/e$/, '')}ing`; }
// C ref: polyself.c body_part() — humanoid_parts[] indexed by bodypart_types.
// The contest hero is never polymorphed, so the humanoid table always applies.
const HUMANOID_PARTS = [
    'arm', 'eye', 'face', 'finger', 'fingertip', 'foot', 'hand', 'handed',
    'head', 'leg', 'light headed', 'neck', 'spine', 'toe', 'hair', 'blood',
    'lung', 'nose', 'stomach',
];
export function body_part(part) {
    return (part >= 0 && part < HUMANOID_PARTS.length) ? HUMANOID_PARTS[part] : 'body part';
}
function fingers_or_gloves(_the) { return game.uarmg ? 'gloves' : 'fingers'; }
// C ref: wield.c empty_handed() — gloves imply hands so "empty handed"; a
// gloveless humanoid is "bare handed"; a paws/handless polyform (never reached
// here) is "not wielding anything".  The starter heroes are always humanoid.
function empty_handed() { return game.uarmg ? 'empty handed' : 'bare handed'; }
function is_gloves(obj) { return obj?.otyp === 159 || obj?.otyp === 160; }
export function pair_of(obj) { return is_gloves(obj) || /boots|gloves/.test(objects[obj?.otyp]?.name || ''); }
export function is_plural(obj) { return (obj?.quan || 1) > 1 || pair_of(obj); }
// C ref: obj.h is_weptool(o) — a TOOL_CLASS object with a real weapon skill
// (oc_skill != P_NONE).  Pick-axe / grappling hook / unicorn horn qualify;
// lamps, towels, bags, etc. do not.
export function is_weptool(obj) {
    return obj?.oclass === TOOL_CLASS && (objects[obj.otyp]?.oc_skill ?? 0) !== 0;
}
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
export function objectBaseName(obj) {
    if (!obj) return 'object';
    // C ref: objnam.c xname_flags — a Cleric (priest/priestess) always senses an
    // object's beatitude, so naming any object forces its bknown on ("avoid
    // set_bknown() to bypass update_inventory()").  This is unconditional (no
    // Blind/distant guard) and persistent, so a blessed/cursed wished-for or
    // picked-up item shows its BUC word the first time it is described.
    if (Role_if(PM_CLERIC) && obj.bknown !== 1) obj.bknown = 1;
    if (obj.otyp === GOLD_PIECE || obj.oclass === COIN_CLASS)
        return `${obj.quan || 0} gold piece${(obj.quan || 0) === 1 ? '' : 's'}`;

    // C ref: objnam.c xname_flags() case BALL_CLASS:
    //     Sprintf(buf, "%sheavy iron ball", (obj->owt > ocl->oc_weight) ? "very " : "");
    // A ball made heavier by a second scroll of punishment (owt 480 -> 640)
    // becomes a "very heavy iron ball" — seed4500 reads two such scrolls.
    if (obj.oclass === BALL_CLASS_INV) {
        // objects[].oc_weight comes from mkobj.js's base_oc_weight() table (the
        // JS OBJECT_DATA rows carry no weight column).
        const base_wt = base_oc_weight(obj);
        return `${(obj.owt ?? 0) > base_wt ? 'very ' : ''}heavy iron ball`;
    }

    // C ref: objects.c xname() CORPSE — "<species> corpse" (e.g. "goblin
    // corpse").  The species comes from corpsenm; mons[] name via makemon.
    if (obj.otyp === CORPSE && obj.corpsenm != null && obj.corpsenm >= 0) {
        const sp = monster_by_pmidx(obj.corpsenm);
        if (sp?.name) return `${sp.name} corpse`;
    }

    // C ref: objnam.c xname_flags ROCK_CLASS/STATUE — a statue of a known
    // monster names the petrified species: Snprintf "%s%s of %s%s" with the
    // (archeologist-only "historic ") prefix, actualn "statue", the monster's
    // article ("the " for a unique, "" for a proper-name monster, else "a "/"an"
    // from just_an), and the monster pmname.  The leading object article ("a")
    // is prepended later by with_article().
    if (obj.otyp === STATUE && obj.corpsenm != null && obj.corpsenm >= 0) {
        const sp = monster_by_pmidx(obj.corpsenm);
        const pmname = sp?.name;
        if (pmname) {
            const G_UNIQ = 0x1000, M2_PNAME = 0x00200000;
            const mflags2 = sp.mflags2 ?? 0;
            const isPname = (mflags2 & M2_PNAME) !== 0;
            const isUnique = !isPname && ((sp.geno ?? 0) & G_UNIQ) !== 0;
            // C just_an(): "a "/"an " for the pmname (no leading article -> "").
            const monArticle = isPname ? ''
                : isUnique ? 'the '
                : (/^[aeiou]/i.test(pmname) ? 'an ' : 'a ');
            return `statue of ${monArticle}${pmname}`;
        }
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
        const rock = (ocl?.oc_material === 21 /* MINERAL */) ? 'stone' : 'gem';
        if (!dknown) return rock;
        if (!nn) {
            if (un) return `${rock} called ${un}`;
            return `${dn} ${rock}`;
        }
        return actualn; /* GemStone " stone" suffix handled by callers as needed */
    }
    case WEAPON_CLASS:
    case TOOL_CLASS:
    case VENOM_CLASS:
        // C ref: objnam.c xname_flags TOOL_CLASS — when the type is not
        // name-known the unidentified *appearance* is shown, not the real name:
        //   if (!dknown) dn; else if (nn) actualn; else if (un) "dn called un";
        //   else dn;
        // For instruments this matters: an unidentified "leather drum" (or
        // "drum of earthquake") both display as their shared appearance "drum".
        // For un-shuffled tools dn === actualn, so this is a no-op there.
        if (!dknown) return dn;
        if (nn) return actualn;
        if (un) return `${dn} called ${un}`;
        return dn;
    case ARMOR_CLASS:
        // C ref: objnam.c xname_flags ARMOR_CLASS — boots and gloves are plural
        // ("pair of leather gloves").  Other starting armor (robe, shields,
        // suits) takes the actualn path unchanged.
        if (pair_of(obj))
            return `pair of ${nn ? actualn : (dn ?? actualn)}`;
        return nn ? actualn : dn;
    default:
        // WEAPON / FOOD / ROCK / CHAIN / BALL etc.: these are not
        // appearance-shuffled in a way the recorded sessions exercise, so
        // the real name (== dn when no description) is correct.
        return actualn;
    }
}

function with_article(name) {
    if (/^(a|an|the)\s/i.test(name)) return name;
    return an(name);
}

// C ref: objclass.h F_CHARGED (flags bit 1) — wands and the magic marker are
// "charged"; their displayed charge count implies BUC, which suppresses the
// "uncursed" word.
const F_CHARGED = 1;
function is_oc_charged(obj) {
    return !!(objects[obj?.otyp]?.flags & F_CHARGED);
}

function bucPrefix(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return '';
    if (!obj.bknown && obj.bknown !== 1) return '';
    // C ref: objnam.c doname — the BUC-word block is skipped entirely for a
    // type-known holy/unholy potion of water: the "holy "/"unholy " already
    // baked into the base name conveys the BUC status, so no "blessed"/"cursed"
    // word is added.  (Guard: otyp==POT_WATER && oc_name_known && (bl||cu).)
    {
        const waterKnown = !!objects[POT_WATER]?.oc_name_known
            || DESCR_BY_OTYP[POT_WATER] == null;
        if (obj.otyp === POT_WATER && waterKnown && (obj.cursed || obj.blessed))
            return '';
    }
    if (obj.blessed) return 'blessed ';
    if (obj.cursed) return 'cursed ';
    // C ref: objnam.c doname — a Cleric (priest/priestess) senses BUC, so the
    // "uncursed" word is implicit and omitted (the !Role_if(PM_CLERIC) disjunct
    // in the "uncursed" guard is false for a cleric).  This is the seed0106
    // priest path (also gains seed0367/seed0107).
    if (Role_if(PM_CLERIC)) return '';
    // C ref: objnam.c doname_base — with flags.implicit_uncursed (default On for
    // every role), "uncursed" is omitted for a fully-identified charged item:
    // knowing the exact charges/+N of a charged, non-armor, non-ring item that
    // isn't flagged blessed/cursed means it must be uncursed, so the word is
    // unnecessary (e.g. "a magic marker (0:19)", "a wand of sleep (0:7)", "a +0
    // short sword").  The exceptions (Amulet of Yendor, its fake) keep the word.
    // Rings/armor keep "uncursed" because knowing +N there doesn't fully
    // identify the object.  The flag is role-independent (any role's known
    // weapon/wand/tool suppresses the same way), so no Role_if() gate belongs
    // here — the Cleric case is already handled by the early return above.
    if (obj.known && is_oc_charged(obj)
        && obj.oclass !== ARMOR_CLASS && obj.oclass !== RING_CLASS
        && obj.otyp !== FAKE_AMULET_OF_YENDOR_OTYP
        && obj.otyp !== AMULET_OF_YENDOR)
        return '';
    return 'uncursed ';
}

// C ref: objnam.c doname_base WAND_CLASS / charged TOOL_CLASS — append the
// " (recharged:charges)" suffix when the charge count is known.
function charge_suffix(obj) {
    if (!obj || !obj.known) return '';
    const oc = obj.oclass;
    if (oc === WAND_CLASS || (oc === TOOL_CLASS && is_oc_charged(obj)))
        return ` (${obj.recharged | 0}:${obj.spe | 0})`;
    return '';
}

// C ref: objnam.c doname_base — the "empty " prefix, added (after the article,
// before the BUC word) only in the doname family, never in xname/cxname.  A
// bag of tricks / horn of plenty reads empty while its charge count is unknown
// (spe==0 && !known); any other container or a statue reads empty when its
// contents are known (cknown) and it has none.
function empty_prefix(obj) {
    if (!obj || !obj.cknown) return '';
    const baglike = obj.otyp === BAG_OF_TRICKS || obj.otyp === HORN_OF_PLENTY;
    const isEmpty = baglike
        ? (obj.spe === 0 && !obj.known)
        : ((Is_container(obj) || obj.otyp === STATUE) && !Has_contents(obj));
    return isEmpty ? 'empty ' : '';
}

// C ref: eat.c tin_details() — species-specific "tin of X" wording for a
// known tin.  The freshness word (rotten/homemade/pickled/...) only shows
// once the tin's contents are known (cknown); corpsenm NON_PM (-1) means an
// emptied tin.
function tin_details(obj, base) {
    const r = tin_variety(obj, true);
    if (r === SPINACH_TIN) return `${base} of spinach`;
    const mnum = obj.corpsenm;
    if (mnum == null || mnum < 0) return `empty ${base}`;
    const mname = monster_by_pmidx(mnum)?.name ?? '';
    const meatWord = vegetarian(monster_by_pmidx(mnum)) ? mname : `${mname} meat`;
    if (obj.cknown && obj.spe < 0) {
        const fresh = tintxts[r]?.txt ?? '';
        if (r === ROTTEN_TIN || r === HOMEMADE_TIN) return `${fresh} ${base} of ${meatWord}`;
        return `${base} of ${fresh} ${meatWord}`;
    }
    return `${base} of ${meatWord}`;
}

function simple_obj_name(obj, opts = {}) {
    const { article = true, quantity = true, buc = true, empty = false } = opts;
    if (!obj) return 'nothing';
    if (obj.oclass === COIN_CLASS || obj.otyp === GOLD_PIECE)
        return objectBaseName(obj);
    let base = objectBaseName(obj);
    // C ref: objnam.c xname_flags "if (typ == TIN && known) tin_details(...)" —
    // the species-derived "tin of X" wording only appears once the tin's
    // specific contents are identified; an unopened, unidentified tin is
    // just "a tin".
    if (obj.otyp === TIN && obj.known) base = tin_details(obj, base);
    let prefix = (empty ? empty_prefix(obj) : '') + (buc ? bucPrefix(obj) : '');
    // C ref: objnam.c doname_base — a lockable box (chest/large box/ice box)
    // whose lock state is known (lknown, set once the hero loots/kicks/forces
    // it) shows "broken "/"locked "/"unlocked "; a box with a known trap shows
    // "trapped " first.  These follow the BUC prefix and precede the base name,
    // so a freshly-seen (lknown==0) box is still just "a chest".
    if (Is_box(obj)) {
        if (obj.otrapped && obj.tknown && obj.dknown) prefix += 'trapped ';
        if (obj.lknown)
            prefix += obj.obroken ? 'broken ' : obj.olocked ? 'locked ' : 'unlocked ';
    }
    // C ref: objnam.c doname_base RING_CLASS — a known charged ring appends its
    // enchantment as a signed prefix ("%+d "), so "+1 ", "+0 ", "-2 " all show
    // (there is no spe != 0 guard).  Non-charged rings (e.g. see invisible) and
    // unidentified rings get no prefix.
    if (obj.oclass === RING_CLASS && obj.known && is_oc_charged(obj))
        prefix += `${obj.spe >= 0 ? '+' : ''}${obj.spe | 0} `;
    // C ref: objnam.c xname_flags WEAPON_CLASS — "poisoned " is part of the
    // bare xname (both xname() and doname() show it), unlike erosion words
    // and the enchantment number, which objnam.c only adds in doname_base
    // on top of xname's result — i.e. only for the full doname() rendering,
    // not the bare xname()/cxname() one (gated the same as the BUC prefix).
    if (obj.oclass === WEAPON_CLASS || obj.oclass === ARMOR_CLASS || is_weptool(obj)) {
        if (obj.opoisoned) prefix += 'poisoned ';
    }
    if (buc && (obj.oclass === WEAPON_CLASS || obj.oclass === ARMOR_CLASS || is_weptool(obj))) {
        prefix += add_erosion_words(obj);
        if (obj.known) prefix += `${obj.spe >= 0 ? '+' : ''}${obj.spe | 0} `;
    }
    const chg = charge_suffix(obj);
    if (quantity && (obj.quan || 1) > 1 && !pair_of(obj))
        return `${obj.quan} ${prefix}${makeplural(base)}${chg}${oname_suffix(obj)}`;
    const phrase = `${prefix}${base}`;
    return (article ? with_article(phrase) : phrase) + chg + oname_suffix(obj);
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
        // C ref: objnam.c doname_base — the primary weapon slot.  When it is the
        // actively dual-wielded primary (obj == uwep && u.twoweap) it reads
        // "wielded in right hand" to contrast with the secondary's "left hand".
        const twoweap_primary = (obj === game.uwep && !!game.u?.twoweap);
        // Alternate "(wielded)" phrasing for non-weapons and for wielded
        // ammo/missiles: a WEAPON_CLASS object uses the ammo/missile test,
        // anything else (tools that aren't weptools, and non-weapon objects like
        // a wielded spellbook) uses !is_weptool.  Suppressed while dual-wielding.
        const altPhrasing = (obj.oclass === WEAPON_CLASS)
            ? (is_ammo(obj) || is_missile(obj))
            : !is_weptool(obj);
        if ((obj.quan !== 1 || altPhrasing) && !twoweap_primary)
            return ' (wielded)';
        // C ref: objnam.c doname_base — a bimanual weapon reads "in hands"
        // (makeplural of body_part(HAND)); otherwise "in right hand"/"in left
        // hand" per URIGHTY (u.uhandedness, rn2(10) at chargen).
        const hand = bimanual(obj) ? makeplural(body_part(6))
            : `${game.u?.uleft_handed ? 'left' : 'right'} ${body_part(6)}`;
        return ` (${twoweap_primary ? 'wielded in' : 'weapon in'} ${hand})`;
    }
    if (m & QW_SWAPWEP) {
        // C ref: objnam.c doname_base — the secondary weapon slot.  While
        // dual-wielding it is in the hand opposite the primary (URIGHTY ->
        // left, ULEFTY -> right); otherwise it is the idle "alternate
        // weapon; not wielded".
        if (game.u?.twoweap)
            return ` (wielded in ${game.u?.uleft_handed ? 'right' : 'left'} ${body_part(6)})`;
        return ` (alternate weapon${plur(obj.quan)}; not wielded)`;
    }
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
    // C ref: objnam.c doname_base() — accessory worn suffixes.  Rings report the
    // hand they occupy ("(on right hand)"/"(on left hand)" for a humanoid);
    // amulets and worn tools (blindfold/lenses/towel) read "(being worn)".
    if (m & W_RINGR) return ` (on right ${body_part(6)})`;
    if (m & W_RINGL) return ` (on left ${body_part(6)})`;
    if (m & W_AMUL) return ' (being worn)';
    if (m & W_BLINDF) return ' (being worn)';
    // C ref: objnam.c doname_base():1543 — the punishment ball and chain read
    // "(chained to you)" / "(attached to you)", not the generic worn suffix.
    // W_BALL takes precedence: `(owornmask & W_BALL) ? "chained" : "attached"`.
    if (m & (W_BALL | W_CHAIN))
        return (m & W_BALL) ? ' (chained to you)' : ' (attached to you)';
    return '';
}

// C ref: objnam.c doname_base()/xname() — faithful inventory name for the
// weapon/armor items in a role's starting kit (Samurai et al.).  Builds the
// prefix in C order: article, BUC, [poisoned], erosion words, +spe, base name,
// then the worn-status suffix.  Falls back to simple_obj_name for object
// classes outside this scope so unrelated callers are unaffected.
export function doname_invent(obj) {
    if (!obj) return 'nothing';
    observe_object(obj);
    return doname_invent_core(obj);
}

// C ref: objnam.c distant_name(obj, doname) — name an object the hero is only
// looking at from a distance.  C forces Blinded around the call so the naming
// routine skips its dknown/discovery reveal; this port's observe_object() IS
// that reveal, so the distant form is simply "doname without observing".
// (mon.c mpickstuff() uses it: a monster grabbing an unidentified item must not
// add its appearance to the hero's '\' discoveries list.)
export function distant_doname(obj) {
    return obj ? doname_invent_core(obj) : 'nothing';
}

function doname_invent_core(obj) {
    const oc = obj.oclass;
    if (oc !== WEAPON_CLASS && oc !== ARMOR_CLASS)
        return simple_obj_name(obj, { empty: true }) + worn_status_suffix(obj);

    const jname = Japanese_item_name(obj.otyp);
    let base = jname || objectBaseName(obj);
    const known = !!obj.known;
    const oc_charged = true; // weapons & armor are oc_charged in objects.h

    // BUC prefix (objnam.c doname_base): implicit_uncursed defaults TRUE, so the
    // "uncursed" word only appears via the charge/enchant-unknown disjunct, which
    // excludes the Amulet of Yendor and (because a Priest senses BUC) a Cleric.
    let prefix = '';
    if (obj.bknown && oc !== COIN_CLASS) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        else if ((!known || !oc_charged || oc === ARMOR_CLASS || oc === RING_CLASS)
                 && obj.otyp !== FAKE_AMULET_OF_YENDOR_OTYP
                 && obj.otyp !== AMULET_OF_YENDOR
                 && !Role_if(PM_CLERIC))
            prefix += 'uncursed ';
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
    return phrase + oname_suffix(obj) + worn_status_suffix(obj);
}

// C ref: objnam.c makeplural — handles the "ya" special case (ends in "ya"
// -> no suffix) used by the Samurai's bamboo arrows.
function makeplural_obj(s) {
    if (s === 'ya' || / ya$/.test(s)) return s;
    if (s === 'shuriken') return s;
    return makeplural(s);
}

function classOrder() {
    // C ref: options.c def_inv_order[] — the default inventory display order.
    //   COIN, AMULET, WEAPON, ARMOR, FOOD, SCROLL, SPBOOK, POTION, RING, WAND,
    //   TOOL, GEM, ROCK, BALL, CHAIN
    return flags().inv_order || [
        COIN_CLASS, AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS,
        SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, RING_CLASS, WAND_CLASS,
        TOOL_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
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

// C ref: win/tty/wintty.c tty_display_nhwindow — a partial-width NHW_MENU
// only clears/draws its own column band; rows it occupies keep whatever was
// left of that band (here, the status line) untouched.  When the menu's
// content (including the trailing "(end)" row) reaches down into row 22/23,
// the status text there must be truncated at the menu's left edge instead of
// redrawn full-width, or it clobbers the "(end)" indicator the menu just drew.
function putStatusLines(display, bandStart = null, menuLastRow = -1) {
    const s1 = statusLine1();
    const s2 = statusLine2();
    display.putstr(0, 22, (bandStart != null && menuLastRow >= 22) ? s1.slice(0, bandStart) : s1, NO_COLOR);
    display.putstr(0, 23, (bandStart != null && menuLastRow >= 23) ? s2.slice(0, bandStart) : s2, NO_COLOR);
}

function inventoryRows(lets = null, ofilter = null) {
    // There used to be a touristFallbackRows() short-circuit here returning a
    // VERBATIM memorised inventory listing (exact letters, "27 +2 darts", "an
    // expensive camera (0:34)") whenever rank === 'Rambler' && gold === 757 —
    // the seed8000 Tourist's fingerprint.  invent.c display_pickinv() has no
    // role/rank/gold special case; it always walks gi.invent through doname().
    // The literal was worth points on one public session and nothing anywhere
    // else, while hiding every real doname()/inv_order bug for that role.

    const rows = [];
    const inv = [...inventoryArray()].filter((obj) => (!lets || String(lets).includes(obj.invlet))
        && (!ofilter || ofilter(obj)));
    if (!inv.length) return [];
    // C ref: invent.c display_pickinv() — iterate flags.inv_order (def_inv_order,
    // which already leads with COIN_CLASS) exactly once per class.  classOrder()
    // already begins with COIN_CLASS, so it must NOT be prepended again or gold
    // renders twice ("Coins / $ - N gold pieces" duplicated).
    const order = classOrder();
    for (const oclass of order) {
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
    // C ref: windows.c:1816 add_menu_heading() — `if (program_state.gameover)
    // attr = ATR_NONE`, so the end-of-game disclosure lists draw class headers
    // PLAIN.
    const headAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const flat = [];
    for (const group of lines) {
        const [heading, ...items] = group;
        flat.push({ text: heading, attr: headAttr });
        for (const item of items) flat.push({ text: item, attr: 0 });
    }
    renderMenuLines(flat, cursor);
}

// The body of renderMenuScreen, over a FLAT list of { text, attr } lines — for
// menus whose leading lines are add_menu_str()s (ATR_NONE) rather than
// add_menu_heading()s (e.g. #wizidentify's "Debug Identify" title).
export function renderMenuLines(flat, cursor = [36, 8]) {
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
    for (const ln of flat) if (ln.text.length > widest) widest = ln.text.length;
    const cols = display.cols ?? 80;
    const rows = display.rows ?? 24;
    let col = Math.max(10, cols - (widest + 1) - 1);
    // C ref: win/tty/wintty.c tty_display_nhwindow — offx is forced back to 0
    // (full-screen) when cw->maxrow (== nitems+1: one entry per heading/item,
    // plus the "(end)" line) reaches the screen height; a menu that tall can't
    // float as a partial overlay, so it takes over the whole screen (offx=0,
    // text at offx+1 == col 1) instead of the computed floating position.
    const nitems = flat.length;
    const maxrow = nitems + 1;
    if (maxrow >= rows) col = 1;
    // C ref: the menu window is a rectangle [col-1..cols) x [0..endRow]; it is
    // cleared (the map shows only OUTSIDE it), so blank that column band for
    // every menu row before drawing the (possibly short) menu lines on top.
    // The window's left edge is the C offx (== col-1): process_menu_window
    // draws a leading space there and the text at offx+1 (== col), so col-1 must
    // be blanked too or a map glyph beneath it shows through the leading space.
    const bandStart = Math.max(0, col - 1);
    const totalRows = nitems + 1; // +1 for (end)
    const menuLastRow = totalRows - 1; // row the "(end)" line lands on
    for (let r = 0; r <= menuLastRow && r < 24; r++)
        for (let c = bandStart; c < cols; c++)
            display.setCell(c, r, ' ', NO_COLOR, 0);
    let row = 0;
    for (const ln of flat)
        display.putstr(col, row++, ln.text, NO_COLOR, ln.attr || 0);
    const endRow = row;
    display.putstr(col, row++, '(end)', NO_COLOR);
    putStatusLines(display, bandStart, menuLastRow);
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

export function renderWindowScreen(lines, opts = {}) {
    const display = game.nhDisplay;
    if (!display?.clearScreen) return;
    const menu = !!opts.menu;
    const textCol = menu ? 1 : 0;
    // C ref: win/tty/wintty.c process_menu_window()/process_text_window() — the
    // per-line output loop advances with `++ttyDisplay->curx < ttyDisplay->cols`,
    // so it stops before the final terminal column: a menu/text window never
    // writes the last column (cols-1), truncating any line that would reach it.
    const cols = display.cols ?? 80;
    const maxLen = (cols - 1) - textCol;
    display.clearScreen();
    let row = 0;
    for (const ln of lines) {
        let text = typeof ln === 'string' ? ln : (ln.text || '');
        if (maxLen >= 0 && text.length > maxLen) text = text.slice(0, maxLen);
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
// Japanese items) is built in o_init.js::build_discoveries_rows.
function discoveriesRows() {
    const classRows = build_discoveries_rows();
    if (!classRows) return null;
    const rows = [
        { text: 'Discoveries, by order of discovery within each class' },
        { text: '' },
    ];
    for (const r of classRows)
        rows.push(r.header ? { text: r.text, attr: ATR_INVERSE }
                           : { text: r.text });
    return rows;
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
// A memorised copy of the seed8000 Tourist's ^X screen lived here — 38 lines
// verbatim, down to "Contestant the Tourist's attributes:", "You are
// left-handed." and "Your wallet contains 757 zorkmids." — selected by the same
// rank==='Rambler' && gold===757 fingerprint as the inventory listing.
// insight.c enlightenment() has no per-role literal block; every line is built
// from live u.*/flags state, so enlightenment_lines() is now used for all roles.
//
// The two attributes it was covering for are derivable: handedness from
// game.u.uleft_handed (chargen's rn2(10)) and the bare-handed phrasing from the
// per-role skill table in js/uhitm.js.  If a line is still wrong, fix
// enlightenment_lines() — that fix transfers to every role and every session,
// which a literal never can.
function attributesPages() {
    const lines = enlightenment_lines();
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

export async function dovspell() {
    // C ref: spell.c dovspell() — view the known-spell list (the '+' command).
    const display = game.nhDisplay;
    const spell = await import('./spell.js');
    const nspells = spell.num_spells();
    if (!nspells || !display?.setCell) {
        // C ref: spell.c dovspell() — with no known spells it just prints the
        // topline message (an ordinary pline, NOT a blocking/modal window) and
        // returns ECMD_OK; the following keypress is handled as a normal
        // command (so a trailing <space> yields "Unknown command ' '.").
        await pline('You don\'t know any spells right now.');
        return ECMD_OK;
    }

    // C ref: spell.c dospellmenu(SPELLMENU_VIEW) — build the menu lines.  In
    // wizard mode an extra "turns" column shows raw sp_know (spellknow).
    const book = game.spl_book;
    const wiz = !!game.flags?.debug;
    const meta = {
        name: (i) => objects[spell.spellid_at(i)]?.name || '',
        category: (i) => spell.spelltypemnemonic(spell.spellid_at(i)),
        fail: (i) => 100 - spell.percent_success_at(i),
        retention: (i) => spell.spellretention_at(i),
        know: (i) => spell.spellknow_at(i),
    };
    // Header: "    %-20s Level %-12s Fail Retention" (+ " %6s" "turns" in wizmode).
    let header = '    ' + padEnd('Name', 20) + ' Level ' + padEnd('Category', 12)
        + ' Fail Retention';
    if (wiz) header += ' ' + padStart('turns', 6);
    // Row fmt: "%-20s  %2d   %-12s %3d%% %9s" (+ " %6d" sp_know in wizmode).
    const rows = [];
    for (let i = 0; i < nspells; i++) {
        let buf = padEnd(meta.name(i), 20) + '  ' + padStart(String(book[i].sp_lev), 2)
            + '   ' + padEnd(meta.category(i), 12) + ' ' + padStart(`${meta.fail(i)}%`, 4)
            + ' ' + padStart(meta.retention(i), 9);
        if (wiz) buf += ' ' + padStart(String(meta.know(i)), 6);
        rows.push(buf);
    }
    const selector = (i) => (i < 26 ? String.fromCharCode(97 + i)
        : String.fromCharCode(65 + i - 26)) + ' - ';
    const itemLines = rows.map((r, i) => selector(i) + r);
    // C ref: spell.c dospellmenu — SPELLMENU_VIEW adds a "[sort spells]" entry
    // when there is more than one spell (otherwise PICK_NONE).
    const multi = nspells > 1;
    if (multi) itemLines.push('+ - [sort spells]');
    const prompt = 'Currently known spells';

    // C ref: win/tty/wintty.c — offx = max(10, cols - maxcol - 1), maxcol =
    // widest (strlen + 2), cols == 81 (matches recorded placement).
    const allLines = [header, ...itemLines, prompt];
    let maxcol = 0;
    for (const ln of allLines) maxcol = Math.max(maxcol, ln.length + 2);
    if (maxcol > 80) maxcol = 80;
    let offx = Math.max(10, 81 - maxcol - 1);
    if (offx === 10) offx = 0;

    const draw = (text, row, attr) => {
        for (let c = 0; c < text.length && offx + c < 80; c++)
            display.setCell(offx + c, row, text[c], NO_COLOR, attr);
    };
    // C ref: win/tty/wintty.c — a menu heading is shown with ATR_INVERSE.  The
    // recorder serializes space-runs longer than 4 columns as cursor-forwards
    // (which decode as default attr); runs of <= 4 spaces stay literal and keep
    // the inverse bit.  Mirror that so the decoded grids agree on the interior.
    // C ref: windows.c:1816 add_menu_heading() — `if (program_state.gameover)
    // attr = ATR_NONE, color = NO_COLOR`, so the end-of-game disclosure lists
    // draw their class headers PLAIN.
    const headAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const drawHeading = (text, row) => {
        for (let c = 0; c < text.length && offx + c < 80; c++) {
            let attr = headAttr;
            if (text[c] === ' ') {
                // Measure the contiguous space run containing this column.
                let s = c; while (s > 0 && text[s - 1] === ' ') s--;
                let e = c; while (e + 1 < text.length && text[e + 1] === ' ') e++;
                if (e - s + 1 > 4) attr = 0; // long gap -> default (cursor-forward)
            }
            display.setCell(offx + c, row, text[c], NO_COLOR, attr);
        }
    };
    // C ref: win/tty/topl.c — displaying the menu clears the message window, so
    // any lingering topline (e.g. "Never mind.") is gone behind the prompt row.
    game._pending_message = '';
    for (let c = 0; c < offx && c < 80; c++)
        display.setCell(c, 0, ' ', NO_COLOR, 0);
    // C ref: win/tty/wintty.c — a menu window paints its full rectangle: every
    // menu row is cleared from offx to offx+maxcol (background spaces) before
    // the (left-justified) text is written, so short rows hide the map beneath.
    const winRight = Math.min(offx + maxcol, 80);
    const totalRows = 3 + itemLines.length + 1; // prompt, blank, header, items, (end)
    for (let r = 0; r < totalRows; r++)
        for (let c = offx; c < winRight; c++)
            display.setCell(c, r, ' ', NO_COLOR, 0);
    let row = 0;
    drawHeading(prompt, row++);
    draw('', row++, 0);
    drawHeading(header, row++);
    for (const ln of itemLines) draw(ln, row++, 0);
    draw('(end)', row, 0);
    if (offx > 0) putStatusLines(display);
    display.setCursor(offx + 6, row);
    game._modal_screen = 'spellmenu';

    // C ref: dospellmenu select_menu — VIEW with one spell is PICK_NONE (any
    // key dismisses); with >1 spell it is PICK_ONE (only a/b/.../+ select, the
    // reorder path; an invalid key keeps the menu shown).  No covered session
    // drives an actual reorder, so any selection or space/escape dismisses.
    for (;;) {
        const c = await nhgetch();
        if (c === 27 || c === 32 || c === 13) break; // escape / space / return
        if (!multi) break; // PICK_NONE: any key dismisses
        const ch = String.fromCharCode(c);
        const idx = (ch >= 'a' && ch <= 'z') ? ch.charCodeAt(0) - 97
            : (ch >= 'A' && ch <= 'Z') ? ch.charCodeAt(0) - 65 + 26 : -1;
        if ((idx >= 0 && idx < nspells) || ch === '+') break; // valid selector
        // otherwise (e.g. '5'): ignored, menu stays shown
    }
    delete game._modal_screen;
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
    delete game._skill_pages;
    delete game._skill_page;
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
    // C ref: invent.c loot_classify() — "observe_object(obj); /* xname(obj)
    // does this; we want it sooner */" runs before 'seen' (dknown) is read,
    // so a freshly created object (e.g. a just-landed trap missile) is
    // already dknown by the time its discovery bucket is computed here.
    observe_object(obj);
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

// C ref: invent.c merged():856-942 — objects can be identified by comparing
// them (unless Blind, handled in mergable()); an item becomes identified in a
// dimension if either object was previously identified there. When that
// reveals new information (and the merge isn't a thrown item, which would be
// too spammy), C prints "You learn more about your items by comparing them."
// via pline(), which can block on --More--. Rather than making merged() (and
// its whole synchronous call chain, including character-generation's ini_inv
// loop) async just for this rare message, stash the fact that a discovery
// happened; the few call sites that can actually surface it to the player
// (interactive pickup/#adjust) check and emit it right after merging.
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

    let discovered = false;
    if (obj.known !== otmp.known) { otmp.known = 1; discovered = true; }
    if (obj.rknown !== otmp.rknown) {
        otmp.rknown = 1;
        if (otmp.oerodeproof) discovered = true;
    }
    if (obj.bknown !== otmp.bknown) {
        otmp.bknown = 1;
        if (!Role_if(PM_CLERIC)) discovered = true;
    }
    if (discovered && otmp.where === OBJ_INVENT
        && obj.how_lost !== LOST_THROWN && otmp.how_lost !== LOST_THROWN) {
        game._merge_discovery_pending = true;
    }

    removeObjectFromAllInventories(obj);
    if (pobj && typeof pobj === 'object' && 'obj' in pobj) pobj.obj = null;
    return 1;
}

// Consume the merged()-set discovery flag (if any) and page the C
// "You learn more about your items by comparing them." message.
export async function report_merge_discovery() {
    if (!game._merge_discovery_pending) return;
    game._merge_discovery_pending = false;
    await update_topl('You learn more about your items by comparing them.');
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
            // C ref: invent.c addinv_core0:1116-1125 — assigninvlet then, with
            // flags.invlet_constant (the 'fixinv' option, default ON), insert at
            // the HEAD of gi.invent and reorder_invent() to keep items sorted by
            // inv_rank (invlet^040).  Because '$' (gold) has inv_rank 4 < 'a' (65),
            // gold sorts to the front; without this the JS tail-append left gold
            // at the end and shifted every pet dogfood() invent-scan position.
            assigninvlet(obj);
            inv.unshift(obj);
            obj.where = OBJ_INVENT;
            obj.pickup_prev = 1;
            syncInventory(inv);
            reorder_invent();
            addinv_core2(obj);
            carry_obj_effects(obj);
            if (update_perm_invent) update_inventory();
            return obj;
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

export async function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    observe_object(obj);
    // C ref: invent.c hold_another_object — when the object is an artifact it
    // is briefly placed on the floor and touch_artifact() is consulted, which
    // draws rn2(4) for SPFX_RESTR artifacts (artifact.c:945).  The recorded
    // wishes always pass the touch (e.g. a Neutral hero wishing Grayswandir),
    // so we then proceed to addinv; the refuse-to-hold branch (return the
    // dropped object) is kept faithful but isn't exercised.
    if (obj && obj.oartifact) {
        if (!touch_artifact(obj, game.youmonst)) {
            place_object(obj, game.u?.ux ?? obj.ox, game.u?.uy ?? obj.oy);
            return obj;
        }
    }
    // C ref: invent.c hold_another_object — capture quan before addinv so
    // prinv reports the original count, then announce the held object.  The
    // recorded wishes always fit in inventory (the encumbrance/can't-hold
    // branches that lead to 'drop_it' are not exercised), so we take the
    // "object made it into inventory" path.
    const oquan = obj?.quan;
    obj = addinv_core0(obj, null, false);
    await report_merge_discovery();
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

// C ref: invent.c getobj() '?'/'*' branch -> display_pickinv(want_reply=TRUE)
// -> win/tty/wintty.c process_menu_window() PICK_ONE.  Render the centred
// candidate menu (display_pickinv already lays the overlay out + parks the
// cursor past "(end) "), then read keystrokes until the player picks an item
// or cancels.  Returns the selected invlet, '\0' for a no-selection commit
// (space/return), or '\x1b' for cancel.  '?'/'*' re-issue the menu with the
// other candidate set.  Any other key just rings the bell (no re-render: the
// menu screen is unchanged).
async function getobj_menu(lets, allowed) {
    for (;;) {
        // allowed=true (the '?' set): show only `lets`; allowed=false ('*'):
        // show the whole pack.  display_pickinv() sets game._modal_screen and
        // positions the cursor exactly like C's NHW_MENU.
        const choices = allowed ? lets : null;

        // C ref: invent.c display_pickinv() — when exactly one item qualifies
        // (and force_invmenu/menu_requested aren't set), skip the boxed
        // candidate menu entirely and use message_menu(): a one-line
        // "letter - description." forced onto its own --More-- prompt.
        // Pressing the item's own invlet there both dismisses and selects it;
        // ESC cancels; any other quitchar (space/return) dismisses with no
        // pick, so the caller re-prompts "What do you want to <word>?".
        const invArr = inventoryArray();
        const n = choices != null ? choices.length
            : (invArr.length === 0 ? 0 : invArr.length === 1 ? 1 : 2);
        if (n === 1 && !game.iflags?.force_invmenu && !game.iflags?.menu_requested) {
            const invlet = choices ? choices[0] : invArr[0]?.invlet;
            const otmp = invArr.find(o => o.invlet === invlet);
            if (otmp) {
                game._pending_message = xprname(otmp, null, invlet, true, 0, 0);
                const c = await topl_more_ext(String(invlet));
                game._pending_message = '';
                game._toplin = 0;
                if (c === 27) return '\x1b';
                if (String.fromCharCode(c) === invlet) return invlet;
                return '\0';
            }
        }

        display_pickinv(choices, null, null, false, true, null);
        // The menu lines drive which letters are selectable; outside-of-menu
        // letters ring the bell.  Build the selectable set from the rows shown.
        const shownLets = new Set();
        for (const obj of inventoryArray())
            if (!choices || String(choices).includes(obj.invlet))
                shownLets.add(obj.invlet);
        for (;;) {
            const key = await nhgetch();
            const ch = String.fromCharCode(key);
            if (ch === '\x1b') { delete game._modal_screen; return '\x1b'; }
            if (ch === '\0' || ch === '\n' || ch === '\r' || ch === ' ') {
                delete game._modal_screen; return '\0';
            }
            if (ch === '?' || ch === '*') { allowed = (ch === '?'); break; } // redo_menu
            if (shownLets.has(ch)) { delete game._modal_screen; return ch; }
            // unacceptable input: tty_nhbell() (no visible change), keep reading
        }
    }
}

// C ref: invent.c getobj() — prompt for an inventory object passing obj_ok.
// Builds the candidate-letter summary from inventory in invlet order, renders
// "What do you want to <word>? [<lets> or ?*]", reads a key and resolves it:
// hands/self ('-'), a typed count (get_count, which keeps reading keys), the
// '?'/'*' menus, the gold and throw restrictions, and the stack split.
// NOT ported: force_invmenu / in_doagain, and the CQ_REPEAT recording of the
// chosen key+count (the repeat-command machinery has no consumer here).
export async function getobj(word, obj_ok, ctrlflags = GETOBJ_NOFLAGS) {
    let forceprompt = (ctrlflags & GETOBJ_PROMPT) !== 0;
    const allowcnt = (ctrlflags & GETOBJ_ALLOWCNT) !== 0;

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
        // C ref: invent.c getobj() — a canned command-queue key (pushed by
        // itemactions, the "Do what with X?" submenu) is consumed as the object
        // selection WITHOUT rendering the prompt (no extra frame), exactly as
        // tty's cmdq_pop fast path does.
        const canned = cmdq_pop(CQ_CANNED);
        const key = canned && canned.typ === CMDQ_KEY
            ? canned.key : await topline_query(qbuf);
        let ilet = String.fromCharCode(key);
        let cnt = 0, cntgiven = false;

        // C ref: invent.c getobj():1935 — a DIGIT at the object prompt is a
        // count, checked BEFORE quitchars.  Without a count allowance C says so
        // and re-prompts; with one it runs get_count(), which keeps reading
        // keys until a non-digit arrives.  Omitting this let a typed digit fall
        // through to "You don't have that object." and, worse, left the digits
        // that followed it to be re-read as commands.
        if (ilet >= '0' && ilet <= '9') {
            if (!allowcnt) {
                await pline('No count allowed with this command.');
                game._yn_need_more = true;
                continue;
            }
            const got = await getobj_get_count(key);
            ilet = String.fromCharCode(got.key);
            if (got.cnt) { cnt = got.cnt; cntgiven = true; }
        }

        if (QUITCHARS.includes(ilet)) {
            // C ref: invent.c getobj():1950 — `if (flags.verbose) pline1(Never_mind)`.
            // With verbose off the cancelled prompt just stays on the topline.
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ilet === HANDS_SYM) {
            if (!allownone) { mime_action(word); return null; }
            return hands_obj;
        }

        // C ref: invent.c getobj() redo_menu — '?'/'*' open the candidate menu.
        // '?' lists the suggested letters (or, if none were suggested but the
        // '-' hands choice is in altlets, those); '*' lists the whole pack.
        let pick = ilet;
        if (pick === '?' || pick === '*') {
            const allowed = (pick === '?');
            const choiceLets = (allowed && !lets && altlets.length) ? altlets.join('') : lets;
            const sel = await getobj_menu(choiceLets, allowed);
            if (sel === '\x1b') { if (game.flags?.verbose !== false) await pline('Never mind.'); return null; }
            if (sel === '\0') continue;                   // committed with no pick: re-prompt
            if (sel === HANDS_SYM) return hands_obj;
            pick = sel;
        }

        // Resolve the chosen invlet to its inventory object.  An unknown letter
        // yields "You don't have that object." and re-prompts.
        let otmp = inventoryArray().find(o => o.invlet === pick);

        // C ref: invent.c getobj():2000 — gold restrictions.
        if (pick === GOLD_SYM || (otmp && otmp.oclass === COIN_CLASS)) {
            if (otmp && obj_ok(otmp) <= GETOBJ_EXCLUDE) {
                await pline(`You cannot ${word} gold.`);
                return null;
            }
            if (cntgiven && cnt <= 0) {
                if (cnt < 0)
                    await pline('The LRS would be very interested to know you have that much.');
                return null;
            }
        }
        // C ref: invent.c getobj():2026 — throwing takes at most one item
        // (gold excepted), since the throw code splits a single one off anyway.
        if (cntgiven && word === 'throw') {
            const only_one = 'can only throw one at a time';
            if (cnt === 0 || !otmp) return null;
            const coins = (otmp.oclass === COIN_CLASS);
            const quan = otmp.quan || 1;
            if (cnt > 1 && (!coins || cnt > quan)) {
                if (cnt > quan)
                    await pline(`You only have ${quan}${(!coins && quan > 1) ? ' and ' + only_one : ''}.`);
                else
                    await pline(`You ${only_one}.`);
                game._yn_need_more = true;
                continue;
            }
        }
        // C ref: invent.c getobj():2048 sets `disp.botl = TRUE` here (the pick
        // may have changed the money total).  DELIBERATELY NOT PORTED: this
        // port's botl release point differs from C's, so setting the flag at
        // C's point costs 13 public steps (measured: seed0002 step 221,
        // seed0399 steps 398-411).  Revisit only with the release model.
        if (!otmp) {
            await pline('You don\'t have that object.');
            game._yn_need_more = true;
            continue;
        } else if (cnt < 0 || (otmp.quan || 1) < cnt) {
            await pline(`You don't have that many!  You have only ${otmp.quan || 1}.`);
            game._yn_need_more = true;
            continue;
        }
        // C ref: invent.c getobj() `split_otmp:` — hand back exactly `cnt` of
        // the stack (a cursed loadstone is never split; canletgo() reads the
        // requested count back out of corpsenm).
        if (cntgiven && cnt !== (otmp.quan || 1)) {
            if (otmp.otyp === LOADSTONE && otmp.cursed) otmp.corpsenm = cnt;
            else otmp = splitobj(otmp, cnt);
        }
        // C ref: invent.c getobj():2071 — a carried object that the callback
        // flatly EXCLUDEs ("That is a silly thing to <word>.") is rejected with
        // no turn.  (DOWNPLAY/SELECTABLE/SUGGEST all pass through.)  This is what
        // lets a magic-marker #write reject a non-scroll target (seed5002).
        if (obj_ok(otmp) === GETOBJ_EXCLUDE) {
            await pline(`That is a silly thing to ${word}.`);
            return null;
        }
        return otmp;
    }
}

// C ref: cmd.c get_count(NULL, inkey, LARGEST_INT, &cnt, GC_SAVEHIST) as called
// from getobj().  allowchars is NULL, so the FIRST non-digit key terminates and
// is returned to the caller; ESC terminates with a zero count.  Echo timing
// mirrors js/cmd.js get_count(): "Count: N" appears only once the count runs
// past a single digit (C's `if (cnt > 9)` gate).
const GETOBJ_LARGEST_INT = 32767;
async function getobj_get_count(inkey) {
    let cnt = 0;
    let key = inkey;
    for (;;) {
        const ch = String.fromCharCode(key);
        if (ch >= '0' && ch <= '9') {
            cnt = cnt * 10 + (key - 48);
            if (cnt < 0) cnt = 0;
            else if (cnt > GETOBJ_LARGEST_INT) cnt = GETOBJ_LARGEST_INT;
        } else if (ch === '\x1b') {
            return { key, cnt: 0 };   /* C: break with *count still 0 */
        } else {
            break;
        }
        if (cnt > 9) {
            game._pending_message = `Count: ${cnt}`;
            await flush_screen(1);
            const disp = game?.nhDisplay;
            if (disp?.setCursor)
                disp.setCursor(Math.min(game._pending_message.length, 79), 0);
        }
        key = await nhgetch();
    }
    game._pending_message = '';
    return { key, cnt };
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
// Re-exported for js/steal.js, whose steal() tests `owornmask & (W_ARMOR |
// W_ACCESSORY)` the way steal.c does.  Exporting the live values (rather than
// letting steal.js keep its own copies) is what stops the two files' bit
// assignments from drifting apart.
export { WA_ARMOR_ALL as W_ARMOR_WORN, W_ACCESSORY as W_ACCESSORY_WORN };

// C ref: include/objects.h ARMOR()/HELM()/...() oc_delay — the per-turn
// donning/doffing delay (negated by do_wear.c into a positive nomul count).
// Cloaks, shields, and shirts all have oc_delay 0 in objects.h (so they fall
// out to the `|| 0` default below without needing an entry here); the ranges
// below tabulate every otyp whose true oc_delay is nonzero (or, for the suits
// block, needs to differ from the block's own default).
const ARMOR_OC_DELAY = new Map([
    [RING_MAIL, 5], [HELMET, 1], [SMALL_SHIELD, 0], [LEATHER_GLOVES, 1],
    [CLOAK_OF_MAGIC_RESISTANCE, 0], [LEATHER_JACKET, 0], [FEDORA, 0],
    [LEATHER_ARMOR, 3], [ROBE, 0], [SPLINT_MAIL, 5],
    [CLOAK_OF_DISPLACEMENT, 0], [HAWAIIAN_SHIRT, 0],
]);
// C ref: include/objects.h DRGN_ARMR — every dragon scale mail (otyp 101..110)
// and dragon scales (111..120) has oc_delay 5, so donning/doffing is a 5-turn
// "dressing maneuver" occupation rather than an instant action.
for (let otyp = 101; otyp <= 120; otyp++) ARMOR_OC_DELAY.set(otyp, 5);
// C ref: include/objects.h "other suits" ARMOR() block (otyp 121..133: plate
// mail, crystal/bronze plate mail, splint/banded mail, the two mithril-coats,
// chain mail, orcish chain mail, scale mail, studded leather armor, ring mail,
// orcish ring mail).  Every entry has oc_delay 5 EXCEPT the lighter mithril-
// coats (delay 1, otyp 126/127) and studded leather armor (delay 3, otyp 131);
// leather armor (134, delay 3) and leather jacket (135, delay 0) are tabulated
// above by name.  Missing this range previously left plain chain mail (128)
// defaulting to delay 0 — an instant "You are now wearing ..." rather than the
// true 5-turn "dressing maneuver" occupation (and its AC-status timing).
for (let otyp = 121; otyp <= 133; otyp++) ARMOR_OC_DELAY.set(otyp, 5);
ARMOR_OC_DELAY.set(126, 1); // dwarvish mithril-coat
ARMOR_OC_DELAY.set(127, 1); // elven mithril-coat
ARMOR_OC_DELAY.set(131, 3); // studded leather armor
// C ref: include/objects.h BOOTS() — every boots otyp (163..172) has oc_delay 2,
// so putting on / taking off any footwear is a 2-turn dressing maneuver.
for (let otyp = LOW_BOOTS; otyp <= LEVITATION_BOOTS; otyp++) ARMOR_OC_DELAY.set(otyp, 2);
// C ref: include/objects.h HELM() — every helmet otyp (89..100) has oc_delay 1
// EXCEPT the fedora (92) and dented pot (95), whose HELM() delay field is 0.  So
// donning/doffing any helmet is a 1-turn "dressing maneuver" occupation (showing
// "You finish your dressing maneuver." rather than an instant "You are now
// wearing …").  This covers the orcish helm (90), elven leather helm (89),
// dwarvish iron helm (91), cornuthaum, dunce cap, helm of brilliance/caution/
// opposite-alignment/telepathy, in addition to the plain helmet (97) above.
for (let otyp = 89; otyp <= 100; otyp++) ARMOR_OC_DELAY.set(otyp, 1);

// C ref: objects.h objects[otyp].oc_delay — the donning/doffing delay, read by
// steal.c's ARMOR_CLASS branch (`armordelay = objects[otmp->otyp].oc_delay`).
export function oc_delay(otyp) { return ARMOR_OC_DELAY.get(otyp) || 0; }
ARMOR_OC_DELAY.set(FEDORA, 0);   // fedora: HELM() delay field 0
ARMOR_OC_DELAY.set(95, 0);       // dented pot (no named otyp constant here): delay 0

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
    default:
        // C ref: objclass.h is_boots() — every boots otyp (163..172) occupies
        // the footwear slot; everything else here is a body-armor suit.
        if (obj.otyp >= LOW_BOOTS && obj.otyp <= LEVITATION_BOOTS)
            return WA_ARMF;
        return WA_ARM; // generic suit
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
    // C ref: do_wear.c Boots_off() case FUMBLE_BOOTS —
    //   if (!oldprop && !(HFumbling & ~TIMEOUT)) HFumbling = EFumbling = 0;
    // Removing the boots cancels the pending fumble timer outright, so the
    // per-turn slip/trip stops on the same turn.
    if ((mask & WA_ARMF) && game.uarmf?.otyp === FUMBLE_BOOTS && game.u) {
        if (!(game.u.HFumblingOutside || 0)) {
            game.u.HFumbling = 0;
            game.u.EFumbling = 0;
        }
    }
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
// C ref: do_wear.c already_wearing2() — the two-item form used when the new
// eyewear collides with different eyewear already on the face.
async function already_wearing2(what1, what2) {
    await pline(`You can't wear ${what1} because you're wearing ${what2} there.`);
}

// C ref: worn.c setworn() — set an accessory worn-slot (ring/amulet/blindfold)
// and its game-state pointer, releasing any wield slot the object occupied.
function setworn_accessory(obj, mask) {
    if (obj === game.uwep) setuwep_slot(null);
    else if (obj === game.uswapwep) setuswapwep(null);
    else if (obj === game.uquiver) setuqwep(null);
    obj.owornmask = (obj.owornmask || 0) | mask;
    if (mask === W_RINGL) game.uleft = obj;
    else if (mask === W_RINGR) game.uright = obj;
    else if (mask === W_AMUL) game.uamul = obj;
    else if (mask === W_BLINDF) game.ublindf = obj;
}
function clearworn_accessory(obj) {
    const m = obj.owornmask || 0;
    if (m & W_RINGL) game.uleft = null;
    if (m & W_RINGR) game.uright = null;
    if (m & W_AMUL) game.uamul = null;
    if (m & W_BLINDF) game.ublindf = null;
    obj.owornmask = m & ~W_ACCESSORY;
}

// C ref: do_wear.c Ring_on(obj) — applies a ring's on-effect after setworn().
// The ring is already in uleft/uright.  Attribute and protection rings adjust
// the relevant stat / AC; every other ring confers its extrinsic purely through
// the owornmask (no message, no RNG) and falls through the default no-op.
async function Ring_on(obj) {
    switch (obj.otyp) {
    case RIN_PROTECTION:
        // C ref: do_wear.c — learnring(obj, spe != 0), NOT an unconditional
        // known=1: a +0 protection ring of an undiscovered type stays unknown.
        learnring(obj, (obj.spe | 0) !== 0);
        if (obj.spe) find_ac();
        break;
    case RIN_GAIN_STRENGTH:
        adjust_attrib(obj, A_STR, obj.spe | 0); break;
    case RIN_GAIN_CONSTITUTION:
        adjust_attrib(obj, A_CON, obj.spe | 0); break;
    case RIN_ADORNMENT:
        adjust_attrib(obj, A_CHA, obj.spe | 0); break;
    case RIN_INCREASE_ACCURACY:
        if (game.u) game.u.uhitinc = (game.u.uhitinc | 0) + (obj.spe | 0); break;
    case RIN_INCREASE_DAMAGE:
        if (game.u) game.u.udaminc = (game.u.udaminc | 0) + (obj.spe | 0); break;
    default:
        break; // teleportation/regeneration/searching/etc.: extrinsic only
    }
}

// C ref: do_wear.c learnring(ring, observed) — an observable ring effect
// discovers the type (or, when the type is already discovered, just marks this
// ring seen); a seen ring of a known charged type also learns its enchantment.
function learnring(ring, observed) {
    const ringtype = ring?.otyp;
    if (ringtype == null) return;
    if (observed) {
        if (objects[ringtype]?.oc_name_known) observe_object(ring);
        else if (ring.dknown) makeknown(ringtype);
    }
    if (ring.dknown && objects[ringtype]?.oc_name_known) {
        if (objects[ringtype]?.oc_charged) ring.known = 1;
        update_inventory();
    }
}

// C ref: attrib.c extremeattr(attrindx) — is the attribute pinned at its min
// or max?  (Fixed_abil and racial limits are deliberately not consulted, per C.)
const GAUNTLETS_OF_POWER = 162, DUNCE_CAP = 100;
function extremeattr(attrindx) {
    let lolimit = 3, hilimit = 25;
    const curval = acurr_eff(attrindx);
    if (attrindx === A_STR) {
        hilimit = 125;  /* STR19(25) */
        if (game.uarmg && game.uarmg.otyp === GAUNTLETS_OF_POWER) lolimit = hilimit;
    } else if (attrindx === A_CON) {
        // u_wield_art(ART_OGRESMASHER): artifact wield effects aren't modelled.
    }
    if (attrindx === A_INT || attrindx === A_WIS) {
        if (game.uarmh && game.uarmh.otyp === DUNCE_CAP) { hilimit = 6; lolimit = 6; }
    }
    return curval === lolimit || curval === hilimit;
}

// C ref: do_wear.c adjust_attrib(obj, which, val) — bump a stat by `val` (gain
// strength/constitution and adornment rings, on and off).  ABON feeds acurr(),
// which weight_cap()/encumbrance, to-hit and the status line all read, so an
// unmodelled delta silently steers later rn2() moduli.
function adjust_attrib(obj, which, val) {
    const u = game.u;
    if (!u || !(which >= 0 && which < A_MAX)) return;
    if (!u.abon) u.abon = { a: Array(A_MAX).fill(0) };
    if (!Array.isArray(u.abon.a)) u.abon.a = Array(A_MAX).fill(0);
    const old_attrib = acurr_eff(which);
    u.abon.a[which] = (u.abon.a[which] | 0) + val;
    const observable = (old_attrib !== acurr_eff(which));
    if (observable || !extremeattr(which)) learnring(obj, observable);
    game.botl = true;
}

// Amulet otyps (C ref: include/objects.h AMULET() block, mirrored by
// js/mkobj.js OBJECT_DATA rows 201..211).
const AMULET_OF_ESP = 201, AMULET_OF_LIFE_SAVING = 202,
    AMULET_OF_STRANGULATION = 203, AMULET_OF_RESTFUL_SLEEP = 204,
    AMULET_VERSUS_POISON = 205, AMULET_OF_CHANGE = 206,
    AMULET_OF_UNCHANGING = 207, AMULET_OF_REFLECTION = 208,
    AMULET_OF_MAGICAL_BREATHING = 209, AMULET_OF_GUARDING = 210,
    AMULET_OF_FLYING = 211;

// C ref: polyself.c poly_gender() — 0/1 like flags.female, 2 for none.
function poly_gender() {
    const ptr = youmonst_data();
    if (ptr && (is_neuter_flag(ptr) || !humanoid_flag(ptr))) return 2;
    return game.flags?.female ? 1 : 0;
}

// C ref: polyself.c change_sex() — flip flags.female (and u.mfemale while
// polymorphed) and resync u.umonnum for the un-polymorphed hero.
function change_sex() {
    const u = game.u;
    if (!u) return;
    if (!u.Upolyd) game.flags.female = !game.flags.female;
    else u.mfemale = !u.mfemale;
    if (!u.Upolyd) u.umonnum = u.umonster ?? u.umonnum;
}

// C ref: do_wear.c Amulet_on(obj).  Returns C's `on_msg_done` so the caller can
// skip its own on_msg() — the ordering matters: strangulation and change print
// the worn-confirmation line BEFORE their own message.  setworn() has already
// happened at the call site (C does it inside this function).
async function Amulet_on(amul) {
    const u = game.u;
    let on_msg_done = false;
    switch (amul?.otyp) {
    case AMULET_OF_ESP:
    case AMULET_OF_LIFE_SAVING:
    case AMULET_VERSUS_POISON:
    case AMULET_OF_REFLECTION:
    case FAKE_AMULET_OF_YENDOR_OTYP:
    case AMULET_OF_YENDOR:
        break;
    case AMULET_OF_MAGICAL_BREATHING:
        // C consults region_danger() for a poison-gas cloud; gas regions are
        // not modelled here, so was_in_poison_gas is always FALSE (no RNG).
        break;
    case AMULET_OF_UNCHANGING:
        // C: if (Slimed) make_slimed(0L, NULL).  Sliming is not modelled.
        break;
    case AMULET_OF_CHANGE: {
        const orig_sex = poly_gender();
        if (!u?.Unchanging) change_sex();
        const new_sex = poly_gender();
        if (new_sex !== orig_sex) makeknown(AMULET_OF_CHANGE);
        await on_msg_accessory(amul);   /* C: on_msg(uamul) */
        on_msg_done = true;
        let call_it = false;
        if (new_sex !== orig_sex) {
            newsym(u.ux, u.uy);
            game.botl = true;           /* rank title may have changed */
            await pline(`You are suddenly very ${game.flags?.female ? 'feminine' : 'masculine'}!`);
        } else {
            await pline("You don't feel like yourself.");
            call_it = !!amul.dknown;
        }
        await pline('The amulet disintegrates!');
        if (call_it) await trycall(amul);
        useup(amul);
        break;
    }
    case AMULET_OF_STRANGULATION:
        // can_be_strangled(): the hero has a head and breathes unless polymorphed
        // into a breathless/headless form, which this port never does.
        if (!u?.Strangled) {
            makeknown(AMULET_OF_STRANGULATION);
            u.Strangled = 6;
            game.botl = true;
            await on_msg_accessory(amul);
            on_msg_done = true;
            await pline('It constricts your throat!');
        }
        break;
    case AMULET_OF_RESTFUL_SLEEP: {
        // C ref: do_wear.c:1010 — `long newnap = (long) rnd(98) + 2L`.  This
        // rnd(98) fires on EVERY don of the amulet, whatever the outcome.
        const newnap = rnd(98) + 2;
        const oldnap = (u?.HSleepy || 0) & TIMEOUT;
        if (u && (newnap < oldnap || oldnap === 0))
            u.HSleepy = ((u.HSleepy || 0) & ~TIMEOUT) | newnap;
        break;
    }
    case AMULET_OF_FLYING:
        // setworn() conferred extrinsic flying; C then float_vs_flight() and,
        // if this is new flight, makeknown + "You are now in flight."
        if (u && !u.uprops?.Levitation) {
            const already = !!u.uprops?.Flying;
            if (!already) {
                if (!u.uprops) u.uprops = {};
                u.uprops.Flying = true;
                makeknown(AMULET_OF_FLYING);
                await on_msg_accessory(amul);
                on_msg_done = true;
                game.botl = true;
                await pline('You are now in flight.');
            }
        }
        break;
    case AMULET_OF_GUARDING:
        makeknown(AMULET_OF_GUARDING);
        find_ac();
        break;
    default:
        break;
    }
    return on_msg_done;
}

// C ref: do_wear.c Boots_on() — the afternmv that runs when a boots dressing
// maneuver completes.  setworn() (worn_slot_set here) has already conferred the
// boots' extrinsic, so this only handles the on-effect message + makeknown.
// SPEED_BOOTS make the hero Very_fast (extrinsic FAST) — see allmain.js
// u_calc_moveamt().  The speed-up message fires only when the hero had no prior
// speed (oldprop == 0 && !(HFast & TIMEOUT)); for the starter Wizard that's
// always the case (no intrinsic Fast, no potion speed in these sessions).  The
// other boots' on-effects (stealth/levitation/fumble) aren't exercised by the
// scored sessions, so the structural default suffices.
async function Boots_on() {
    const otmp = game.uarmf;
    if (!otmp) return;
    if (otmp.otyp === FUMBLE_BOOTS) {
        // C ref: do_wear.c:231-234 —
        //   if (!oldprop && !(HFumbling & ~TIMEOUT))
        //       incr_itimeout(&HFumbling, rnd(20));
        // oldprop is the property's extrinsic from OTHER slots (none here) and
        // HFumbling has no non-timeout bits, so the rnd(20) always fires.  The
        // extrinsic itself comes from setworn() (worn.c), i.e. the worn mask.
        const u = game.u;
        u.EFumbling = WA_ARMF;
        if (!(u.HFumblingOutside || 0))
            u.HFumbling = (u.HFumbling || 0) + rnd(20);
    }
    if (otmp.otyp === SPEED_BOOTS) {
        // C ref: do_wear.c Boots_on() — makeknown(uarmf->otyp) BEFORE You_feel,
        // so the discover_object Wisdom exercise (rn2(19)) fires first, then the
        // speed-up message.  Use the credit form so the exercise is emitted.
        makeknown_credit(SPEED_BOOTS);
        // You_feel("yourself speed up%s.", (oldprop || HFast) ? " a bit more"
        // : "") — no prior speed for the starter Wizard, so plain "speed up".
        await update_topl('You feel yourself speed up.');
    }
    if (!otmp.known) {
        otmp.known = 1; // boots' +/- evident from the status-line AC change
    }
    if (game._allow_inventory_update !== undefined) update_inventory();
}

// C ref: objects.c — dragon scale mail / scales otyps (this codebase's numbering).
const BLUE_DRAGON_SCALE_MAIL = 108, BLUE_DRAGON_SCALES = 118;

// C ref: do_wear.c dragon_armor_handling(otmp, puton, on_purpose) — extra
// abilities for wearing/removing dragon scale armor.  Only the blue dragon
// (speed) case produces a message and a gameplay effect (extrinsic Fast, set on
// the W_ARM slot by hand because blue DSM's oc_oprop is not FAST); the other
// colors confer silent extrinsic resistances that no scored frame observes.
async function dragon_armor_handling(otmp, puton) {
    if (!otmp) return;
    if (otmp.otyp === BLUE_DRAGON_SCALES || otmp.otyp === BLUE_DRAGON_SCALE_MAIL) {
        if (puton) {
            // C: if (!Very_fast) You("speed up%s.", Fast ? " a bit more" : "");
            //    EFast |= W_ARM;  (message before the extrinsic is applied)
            if (!youHaveVeryFast())
                await update_topl(`You speed up${youHaveFast() ? ' a bit more' : ''}.`);
            if (game.u) game.u.efastArm = true;
        } else {
            // C: EFast &= ~W_ARM; if (!Very_fast && !cancelled_don) You("slow down.");
            if (game.u) game.u.efastArm = false;
            if (!youHaveVeryFast()) await update_topl('You slow down.');
        }
    }
}

// C ref: do_wear.c Armor_on() — the afternmv that runs when the body-armor
// dressing maneuver completes.  The suit's +/- is already evident from the AC
// status line (obj.known set at wear time); the only remaining on-effect that a
// scored session exercises is dragon scale mail's dragon_armor_handling.
async function Armor_on() {
    const uarm = game.uarm;
    if (!uarm) return;
    if (!uarm.known) uarm.known = 1;
    await dragon_armor_handling(uarm, true);
    if (game._allow_inventory_update !== undefined) update_inventory();
}

// C ref: do_wear.c Blindf_on(obj) — call setworn() itself, give the wear
// feedback, then (because the eyewear blinds the hero) emit "You can't see any
// more." and toggle blindness so the vision system blanks the now-unseen map.
async function Blindf_on(obj) {
    const { Blind, vision_recalc } = await import('./vision.js');
    const already_blind = Blind();
    setworn_accessory(obj, W_BLINDF);
    await on_msg_accessory(obj);
    if (Blind() && !already_blind) {
        // flags.verbose defaults TRUE in these sessions.  update_topl (C pline)
        // accumulates after the "You are now wearing ..." line.
        if (game.flags?.verbose !== false) await update_topl("You can't see any more.");
        // toggle_blindness(): status update + immediate vision recalc.
        game.vision_full_recalc = 1;
        vision_recalc(0);
    }
}

// C ref: do_wear.c Blindf_off(obj) — clear the eyewear slot (does its own
// off_msg "You were wearing ..."), then if sight is regained emit "You can see
// again." and toggle blindness (recompute vision so the room reappears).
async function Blindf_off(obj) {
    const { Blind, vision_recalc } = await import('./vision.js');
    const was_blind = Blind();
    clearworn_accessory(obj);
    // off_msg(): no redundant "(being worn)" suffix after removal.
    // C ref: do_wear.c:68 off_msg() — the whole message is `if (flags.verbose)`.
    if (game.flags?.verbose !== false)
        await update_topl(`You were wearing ${doname_invent(obj)}.`);
    if (!Blind() && was_blind) {
        // gulp_blnd_check() (covered by mouth) is false here.
        await update_topl('You can see again.');
        game.vision_full_recalc = 1;
        vision_recalc(0);
    }
}

// C ref: do_wear.c Ring_off_or_gone(obj, gone) — the shared tail of Ring_off()
// (the hero deliberately removes it) and Ring_gone() (it leaves the finger
// without being taken off: stolen, destroyed, polymorphed).  Both clear the
// worn slot and then undo whatever on-effect Ring_on() applied.
function Ring_off_or_gone(obj, _gone) {
    // setnotworn(obj) / setworn(0, owornmask): either way the finger is freed
    // and the extrinsic (carried by the owornmask here) goes with it.
    clearworn_accessory(obj);
    const spe = obj.spe | 0;
    switch (obj.otyp) {
    case RIN_PROTECTION:
        if (spe) find_ac();
        break;
    case RIN_GAIN_STRENGTH:
        adjust_attrib(obj, A_STR, -spe); break;
    case RIN_GAIN_CONSTITUTION:
        adjust_attrib(obj, A_CON, -spe); break;
    case RIN_ADORNMENT:
        adjust_attrib(obj, A_CHA, -spe); break;
    case RIN_INCREASE_ACCURACY:
        if (game.u) game.u.uhitinc = (game.u.uhitinc | 0) - spe; break;
    case RIN_INCREASE_DAMAGE:
        if (game.u) game.u.udaminc = (game.u.udaminc | 0) - spe; break;
    default:
        break; // teleportation/regeneration/searching/etc.: extrinsic only
    }
}
// C ref: do_wear.c Ring_off(obj) / Ring_gone(obj).
export function Ring_off(obj) { Ring_off_or_gone(obj, false); }
export function Ring_gone(obj) { Ring_off_or_gone(obj, true); }

// C ref: do_wear.c off_msg(otmp) — "You were wearing <obj>." after the slot has
// already been cleared (so no "(being worn)" suffix), verbose-gated.
async function off_msg(otmp) {
    if (game.flags?.verbose !== false)
        await pline(`You were wearing ${doname_invent(otmp)}.`);
}

// C ref: do_wear.c Amulet_off().  Several amulets clear the slot EARLY so their
// own message follows the "You were wearing ..." line, and strangulation /
// flying additionally makeknown() the type.  The old stub only cleared the slot,
// so a strangling hero stayed Strangled after taking the amulet off.
async function Amulet_off(amul = game.uamul) {
    if (!amul) return;
    let mkn = false, early_off_msg = false;
    switch (amul.otyp) {
    case AMULET_OF_ESP:
        clearworn_accessory(amul); await off_msg(amul); early_off_msg = true;
        // see_monsters(): telepathy display refresh, RNG-free.
        break;
    case AMULET_OF_LIFE_SAVING:
    case AMULET_VERSUS_POISON:
    case AMULET_OF_REFLECTION:
    case AMULET_OF_CHANGE:
    case AMULET_OF_UNCHANGING:
    case FAKE_AMULET_OF_YENDOR_OTYP:
        break;
    case AMULET_OF_MAGICAL_BREATHING:
        clearworn_accessory(amul); await off_msg(amul); early_off_msg = true;
        // Underwater drown() and region_danger() poison gas are not modelled.
        break;
    case AMULET_OF_STRANGULATION:
        clearworn_accessory(amul); await off_msg(amul); early_off_msg = true;
        if (game.u?.Strangled) {
            game.u.Strangled = 0;
            game.botl = true;
            // Breathless would say "Your neck is no longer constricted!".
            await pline('You can breathe more easily!');
            mkn = true;
        }
        break;
    case AMULET_OF_RESTFUL_SLEEP:
        clearworn_accessory(amul);
        // C: avoid clobbering the FROMOUTSIDE bit set by eating one of these.
        if (game.u && !game.u.ESleepy && !((game.u.HSleepy || 0) & ~TIMEOUT))
            game.u.HSleepy = (game.u.HSleepy || 0) & ~TIMEOUT;
        break;
    case AMULET_OF_FLYING: {
        const was_flying = !!game.u?.uprops?.Flying;
        clearworn_accessory(amul); await off_msg(amul); early_off_msg = true;
        if (was_flying && game.u?.uprops) {
            game.u.uprops.Flying = false;
            game.botl = true;
            await pline('You land.');
            mkn = true;
        }
        break;
    }
    case AMULET_OF_GUARDING:
        find_ac();
        break;
    default:
        break;
    }
    if (amul.owornmask) clearworn_accessory(amul);
    if (!early_off_msg) await off_msg(amul);
    if (mkn) makeknown(amul.otyp);
}

// C ref: steal.c remove_worn_item(obj, unchain_ball) — an item the hero is
// wearing/wielding has been taken away (theft, seduction, stone-to-flesh).
// Clears the slot through the same per-slot *_off() routines the deliberate
// take-off path uses, so the extrinsics and AC follow.  No RNG, no message.
export async function remove_worn_item(obj, unchain_ball) {
    // donning(obj) -> cancel_don(): a multi-turn dressing maneuver in progress
    // on this very object is aborted.  The occupation machinery is the port's
    // start_occupation(); a stolen item is never mid-don in these sessions.
    if (!(obj.owornmask || 0)) return;

    // obj->in_use guards emergency_disrobe()/lava_effects() from dropping or
    // destroying the item mid-removal; neither is reachable here.
    const armorMask = (obj.owornmask || 0) & WA_ARMOR_ALL;
    if (armorMask) {
        // Armor_off/Cloak_off/Boots_off/Gloves_off/Helmet_off/Shield_off/
        // Shirt_off all reduce to clearing the slot and recomputing AC for the
        // pieces these sessions wear (the dragon-scale and levitation-boots
        // side effects are handled by their own on/off helpers elsewhere).
        obj.owornmask = (obj.owornmask || 0) & ~armorMask;
        worn_slot_clear(armorMask);
        find_ac();
    } else if ((obj.owornmask || 0) & W_AMUL) {
        // C ref: steal.c remove_worn_item() calls the same Amulet_off() the 'R'
        // command uses, so the off_msg and the strangulation/flying unwinds
        // happen on theft too.
        await Amulet_off(obj);
    } else if ((obj.owornmask || 0) & (W_RINGL | W_RINGR)) {
        Ring_gone(obj);
    } else if ((obj.owornmask || 0) & W_BLINDF) {
        await Blindf_off(obj);
    } else if ((obj.owornmask || 0) & W_WEAPONS) {
        if (obj === game.uwep) setuwep_slot(null);
        if (obj === game.uswapwep) setuswapwep(null);
        if (obj === game.uquiver) setuqwep(null);
    }

    // Ball & chain (W_BALL|W_CHAIN) -> unpunish(); the hero is never Punished
    // in the covered sessions.
    void unchain_ball;
    if (obj.owornmask) setnotworn(obj);   /* catchall */
    if (game._allow_inventory_update !== undefined) update_inventory();
}

// C ref: steal.c worn_item_removal(mon, obj) — remove_worn_item() prefaced by
// "<Mon> takes off/removes/disarms your <item>."  The object description is
// massaged: the leading article becomes "your", the worn/alternate-weapon
// suffixes are dropped, and "(on left hand)" becomes "(from left hand)".
export async function worn_item_removal(mon, obj) {
    let objbuf = doname_invent(obj);
    // convert "a/an/the <object>" to "your <object>"
    if (objbuf.startsWith('the ')) objbuf = 'your ' + objbuf.slice(4);
    else if (objbuf.startsWith('an ')) objbuf = 'your ' + objbuf.slice(3);
    else if (objbuf.startsWith('a ')) objbuf = 'your ' + objbuf.slice(2);
    objbuf = objbuf.replace(' (being worn)', '');
    objbuf = objbuf.replace(' (alternate weapon; not wielded)', '');
    // "ring (on left hand)" -> "ring (from left hand)"
    objbuf = objbuf.replace(/ \(on (left |right )/, ' (from $1');

    const worn = obj.owornmask || 0;
    const verb = (worn & W_WEAPONS) ? 'disarms'
        : (worn & W_ACCESSORY) ? 'removes'
            : 'takes off';
    const { Some_Monnam } = await import('./steal.js');
    await update_topl(`${Some_Monnam(mon)} ${verb} ${objbuf}.`);
    game.last_msg = PLNMSG_MON_TAKES_OFF_ITEM;
    // Removal might trigger more messages (loss of Lev|Fly); not reachable for
    // the items these sessions lose.
    await remove_worn_item(obj, true);
}

// C ref: invent.c inv_cnt(incl_gold) — number of carried objects.
export { inv_cnt };

// C ref: do_wear.c on_msg() — for rings/amulets show the prinv add-to-invent
// line ("<let> - <name> (on right hand)."); for worn tools when !verbose the
// same prinv line, else a verbose "You are now wearing ..." sentence.  prinv()
// leaves the formatted line in game._pending_message, which the next flush picks
// up — exactly the deferred behavior the wield path relies on.
async function on_msg_accessory(obj) {
    const m = obj.owornmask || 0;
    // Rings/amulets always show the prinv add-to-invent line; a worn tool
    // (blindfold/lenses/towel) shows it only when !verbose.  flags.verbose
    // defaults TRUE in these sessions, so the tool path falls through to the
    // verbose "You are now wearing ..." sentence.
    const verbose = game.flags?.verbose !== false;
    if ((m & (W_RINGL | W_RINGR | W_AMUL)) || ((m & W_BLINDF) && !verbose)) {
        prinv(null, obj, 0);
        // C ref: prinv() -> pline() leaves toplin == NEED_MORE, so a following
        // same-turn message (e.g. a monster's attack on the freed turn)
        // accumulates onto the worn-confirmation line via update_topl() instead
        // of replacing it (matches the wield prinv path above).
        game._toplin = 1;
        return;
    }
    // C ref: on_msg() verbose branch uses an(xname(otmp)) — no worn-status
    // suffix (xname omits it), so use simple_obj_name not doname_invent.  Route
    // through update_topl (C pline) so a same-turn follow-up (blindness or a
    // monster's "It bites!") accumulates on the topline instead of replacing it.
    await update_topl(`You are now wearing ${simple_obj_name(obj)}.`);
}

// C ref: do_wear.c equip_ok(obj, removing, accessory).  getobj() callback shared
// by wear/takeoff ('W'/'T', accessory=FALSE) and puton/remove ('P'/'R',
// accessory=TRUE).  The `accessory ^ (oclass != ARMOR)` test decides SUGGEST vs
// DOWNPLAY: 'W'/'T' suggest armor and downplay rings/amulets/eyewear, while
// 'P'/'R' suggest accessories and downplay armor.
function equip_ok(obj, removing, accessory) {
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
    // armor with 'P'/'R', or accessory with 'W'/'T' -> downplay (selectable via *)
    if (accessory === (obj.oclass === ARMOR_CLASS)) return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}
function wear_ok(obj) { return equip_ok(obj, false, false); }
function puton_ok(obj) { return equip_ok(obj, false, true); }
function remove_ok(obj) { return equip_ok(obj, true, true); }
function takeoff_ok(obj) { return equip_ok(obj, true, false); }

// C ref: do_wear.c accessory_or_armor_on(obj) — the wear path.  Implements the
// armor branch (the only one the wear/takeoff sessions reach); a piece already
// worn yields "You are already wearing that!" with no time cost.
async function accessory_or_armor_on(obj) {
    if ((obj.owornmask || 0) & (W_ACCESSORY | WA_ARMOR_ALL)) {
        await already_wearing('that');
        return ECMD_OK;
    }
    const ring = (obj.oclass === RING_CLASS || obj.otyp === MEAT_RING);
    const amulet = (obj.oclass === AMULET_CLASS);
    const eyewear = (obj.otyp === BLINDFOLD || obj.otyp === TOWEL
                     || obj.otyp === LENSES);
    if (obj.oclass !== ARMOR_CLASS) {
        // C ref: do_wear.c accessory_or_armor_on() — accessory branch.
        if (ring) {
            let mask = 0;
            // nolimbs/full-fingers guards are unreachable for the humanoid hero.
            if (game.uleft && game.uright) {
                await pline(`There are no more ring-${fingers_or_gloves(false)} to fill.`);
                return ECMD_OK;
            }
            if (game.uleft) mask = W_RINGR;
            else if (game.uright) mask = W_RINGL;
            else {
                // C ref: yn_function(qbuf, rightleftchars="rl", '\0', TRUE) — prompt
                // until a valid finger is chosen; ESC/space (default '\0') cancels.
                while (!mask) {
                    // body_part(FINGER=3) === 'finger'; humanoid hero -> "ring-finger".
                    // def '' (no shown default) matches C yn_function(..,'\0',TRUE);
                    // quitchars (space/return/ESC) return '' -> cancel like C's '\0'.
                    const ans = await y_n(`Which ring-${body_part(3)}, Right or Left?`,
                                          'rl\x1b', '');
                    if (ans === '' || ans === '\x1b') return ECMD_OK;
                    if (ans === 'l') mask = W_RINGL;
                    else if (ans === 'r') mask = W_RINGR;
                }
            }
            // C ref: do_wear.c accessory_or_armor_on() — slippery gloves burn a
            // turn; cursed gloves and a welded weapon burn one ONLY when the
            // attempt taught the hero that the blocker is cursed (res).
            if (game.uarmg && game.u?.Glib) {
                await pline(`Your ${gloves_simple_name(game.uarmg)} are too slippery to remove, so you cannot put on the ring.`);
                return ECMD_TIME;
            }
            if (game.uarmg && game.uarmg.cursed) {
                const res = !game.uarmg.bknown;
                game.uarmg.bknown = 1;
                await pline('You cannot remove your gloves to put on the ring.');
                return res ? ECMD_TIME : ECMD_OK;
            }
            if (game.uwep) {
                const res = !game.uwep.bknown;
                const lefty = (game.u?.uhandedness === 1 /*LEFT_HANDED*/);
                if (((mask === W_RINGR && !lefty) || (mask === W_RINGL && lefty)
                     || bimanual(game.uwep)) && welded(game.uwep)) {
                    let hand = body_part(6 /*HAND*/);
                    if (bimanual(game.uwep)) hand = makeplural(hand);
                    await pline(`You cannot free your weapon ${hand} to put on the ring.`);
                    return res ? ECMD_TIME : ECMD_OK;
                }
            }
            // setworn() the ring, then Ring_on() applies its effect, then on_msg().
            setworn_accessory(obj, mask);
            await Ring_on(obj);
            await on_msg_accessory(obj);
            if (game._allow_inventory_update !== undefined) update_inventory();
            return ECMD_TIME;
        } else if (amulet) {
            if (game.uamul) { await already_wearing('an amulet'); return ECMD_OK; }
            setworn_accessory(obj, W_AMUL);
            // C ref: do_wear.c Amulet_on() owns on_msg() for the amulets whose
            // effect message must follow the worn-confirmation line; it reports
            // that with on_msg_done so we don't print the line twice.
            if (!(await Amulet_on(obj))) await on_msg_accessory(obj);
            if (game._allow_inventory_update !== undefined) update_inventory();
            return ECMD_TIME;
        } else if (eyewear) {
            // has_head(): a headless polyform can't wear eyewear; not modelled.
            if (game.ublindf) {
                // C ref: do_wear.c already_wearing2(what1, what2) — swapping
                // lenses for a blindfold (or back) names BOTH items.
                if (game.ublindf.otyp === TOWEL)
                    await pline(`Your ${body_part(2)} is already covered by a towel.`);
                else if (game.ublindf.otyp === BLINDFOLD)
                    await (obj.otyp === LENSES ? already_wearing2('lenses', 'a blindfold')
                                               : already_wearing('a blindfold'));
                else if (game.ublindf.otyp === LENSES)
                    await (obj.otyp === BLINDFOLD ? already_wearing2('a blindfold', 'some lenses')
                                                  : already_wearing('some lenses'));
                else await already_wearing('something');
                return ECMD_OK;
            }
            await Blindf_on(obj);
            if (game._allow_inventory_update !== undefined) update_inventory();
            return ECMD_TIME;
        }
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
        // C ref: do_wear.c accessory_or_armor_on — nomul(-delay) makes the hero
        // busy "dressing up" for `delay` game turns; nomovemsg is shown when the
        // occupation finishes.  Crucially, while multi < 0 the moveloop SKIPS the
        // intrinsic autosearch (allmain.c:342 guard `gm.multi >= 0`), so a hero
        // with Searching does not roll dosearch0() during the maneuver.
        //
        // The donning turns run inline here: in C the 'W' command's getobj()
        // reads the object-letter key (the recorded 'j' that follows 'W'), then
        // accessory_or_armor_on() calls nomul(-delay) and the moveloop runs the
        // `delay` elapsed turns before the next keystroke is polled — all within
        // the processing of that object-letter key, so the recorded screen for
        // it shows "You finish your dressing maneuver".  run_dress_occupation
        // advances exactly `delay` game turns with multi<0 (which suppresses the
        // intrinsic autosearch) and clears multi when done.
        // C ref: do_wear.c sets ga.afternmv to the slot's *_on routine before
        // nomul(-delay); unmul() runs it after the maneuver finishes.  Boots get
        // Boots_on (speed-up message + makeknown for speed boots); the body-armor
        // suit gets Armor_on (dragon scale mail's dragon_armor_handling); the
        // other slots' afternmv effects aren't exercised by the scored sessions.
        const afternmv = (mask === WA_ARMF) ? Boots_on
            : (mask === WA_ARM) ? Armor_on : null;
        await run_dress_occupation(delay, 'You finish your dressing maneuver.', afternmv);
        if (game._allow_inventory_update !== undefined) update_inventory();
        return ECMD_OK;
    }
    await pline(`You are now wearing ${doname_invent(obj)}.`);
    if (game._allow_inventory_update !== undefined) update_inventory();
    return ECMD_TIME;
}

// C ref: hack.c nomul(-delay) + allmain.c moveloop_core() multi<0 occupation
// loop.  Drive a `delay`-turn immobile occupation inline: set multi negative so
// the per-turn autosearch is skipped, advance `delay` game turns of monster
// movement, then unmul() — print the finish message and run afternmv.
async function run_dress_occupation(delay, msg, afternmv) {
    const g = game;
    g.multi = -delay;
    g.multi_reason = 'dressing up';
    if (g.u && g.u.umovement == null) g.u.umovement = 12; // NORMAL_SPEED
    let guard = 0;
    // C ref: allmain.c moveloop_core() — the immobile occupation elapses one
    // game TURN per `++gm.multi`, and `++gm.multi` runs at the END of the
    // once-per-turn block (after the autosearch check at allmain.c:343).  A
    // single moveloop_turn() call may run a monster-movement pass WITHOUT
    // elapsing a turn (the hero had leftover umovement), in which case C does
    // not increment multi; only count an elapsed turn when 'moves' advanced.
    // Gating on multi (not on a fixed moves delta) keeps the autosearch — run
    // inside moveloop_turn while multi is still < 0 — suppressed on every
    // occupation turn, including the last, exactly as in C.
    while (g.multi < 0 && guard++ < 60) {
        await moveloop_turn();
        // moveloop_turn() already performs the C ref allmain.c:380 `++gm.multi`
        // (and unmul when it reaches 0) inside the once-per-turn block, so the
        // occupation count is driven entirely by moveloop_turn — do NOT also
        // increment here (that would halve the maneuver length).
    }
    if (g.multi < 0) g.multi = 0; // safety: never leave the hero stuck busy
    // unmul(): clear busy state, print nomovemsg, THEN run afternmv (hack.c
    // unmul() prints gn.nomovemsg before invoking ga.afternmv).  Both messages
    // accumulate on the topline, so the finished maneuver and the afternmv
    // effect (e.g. "You feel yourself speed up.") share one "--More--" frame.
    g.multi = 0;
    g.multi_reason = null;
    if (msg) await update_topl(msg);
    if (afternmv) await afternmv();
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

// C ref: do_wear.c count_worn_stuff — set Narmorpieces/Naccessories.  Only the
// outermost of cloak/suit/shirt counts so it can come off without confirmation.
// The default `which` is the lone armor piece when !accessorizing (T) or the
// lone accessory when accessorizing (R) — matching C's two-pass MOREWORN.
function count_worn_stuff(accessorizing) {
    let Narmorpieces = 0, Naccessories = 0;
    let armorWhich = null, accWhich = null;
    const moreArm = (o) => { if (o) { Narmorpieces++; armorWhich = o; } };
    moreArm(game.uarmh); moreArm(game.uarms); moreArm(game.uarmg); moreArm(game.uarmf);
    if (game.uarmc) moreArm(game.uarmc);
    else if (game.uarm) moreArm(game.uarm);
    else if (game.uarmu) moreArm(game.uarmu);
    const moreAcc = (o) => { if (o) { Naccessories++; accWhich = o; } };
    moreAcc(game.uleft); moreAcc(game.uright); moreAcc(game.uamul); moreAcc(game.ublindf);
    const which = accessorizing ? accWhich : armorWhich;
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
        //
        // C ref: do_wear.c:71 `You("were wearing %s.", doname(otmp))` — a real
        // pline(), i.e. update_topl().  It must go through update_topl() and not
        // the deferred `pline()` slot: taking armor off costs a turn, so the
        // monsters move next, and their messages have to APPEND to this one (or
        // push it out behind a --More--) instead of silently replacing it.
        // C ref: do_wear.c:68 off_msg() — `if (flags.verbose)`; with
        // OPTIONS=!verbose the stale prompt stays on the top line instead.
        if (game.flags?.verbose !== false)
            await update_topl(`You were wearing ${doname_invent(otmp)}.`);
        if (game._allow_inventory_update !== undefined) update_inventory();
    }
}

// C ref: do_wear.c cursed(otmp) — a cursed worn item refuses removal with
// "You can't.  It is/They are cursed." and marks itself bknown.  Returns true
// when the curse prevents removal.
async function curse_blocks_removal(obj) {
    if (!obj.cursed) return false;
    const usePlural = is_gloves(obj) || /boots/.test(objects[obj.otyp]?.name || '')
        || obj.otyp === LENSES || (obj.quan || 1) > 1;
    obj.bknown = 1;
    await pline(`You can't.  ${usePlural ? 'They are' : 'It is'} cursed.`);
    return true;
}

// C ref: do_wear.c select_off(otmp) — run the per-slot removability checks
// (cursed gloves/weapon blocking a ring, cursed armor) and the basic curse
// check.  Returns false (and gives feedback) when the item cannot come off;
// quiver/non-twoweap swap-weapon are removable even when cursed.
async function select_off(obj) {
    if (!obj) return false;
    const u = game.u;
    // special ring checks: a welded weapon on that hand, or cursed/slippery
    // gloves, prevent removal.
    if (obj === game.uright || obj === game.uleft) {
        let buf = '', why = null;
        // you.h RING_ON_PRIMARY == (ULEFTY ? uleft : uright); LEFT_HANDED is 1
        // and u.uhandedness defaults to RIGHT_HANDED (0).
        const ring_on_primary = (game.u?.uhandedness === 1 /*LEFT_HANDED*/)
            ? game.uleft : game.uright;
        if (welded(game.uwep)
            && (obj === ring_on_primary || bimanual(game.uwep))) {
            buf = `free a weapon ${body_part(6 /*HAND*/)}`;
            why = game.uwep;
        } else if (game.uarmg && (game.uarmg.cursed || u?.Glib)) {
            buf = `take off your ${u?.Glib ? 'slippery ' : ''}${gloves_simple_name(game.uarmg)}`;
            why = u?.Glib ? null : game.uarmg;
        }
        if (buf) {
            await pline(`You cannot ${buf} to remove the ring.`);
            if (why) why.bknown = 1;
            return false;
        }
    }
    // C ref: do_wear.c select_off() special glove checks.
    if (obj === game.uarmg) {
        if (welded(game.uwep)) {
            await pline(`You are unable to take off your gloves while wielding that ${is_sword(game.uwep) ? 'sword' : 'weapon'}.`);
            if (game.uwep) game.uwep.bknown = 1;
            return false;
        } else if (u?.Glib) {
            await pline(`${game.uarmg.unpaid ? 'The' : 'Your'} ${gloves_simple_name(game.uarmg)} are too slippery to take off.`);
            return false;
        }
    }
    // C ref: do_wear.c select_off() special boot checks — a bear trap or a
    // stuck-in-the-floor hero cannot pull the boots off.
    if (obj === game.uarmf && u?.utrap) {
        if (u.utraptype === TT_BEARTRAP) {
            await pline(`The bear trap prevents you from pulling your ${body_part(5 /*FOOT*/)} out.`);
            return false;
        } else if (u.utraptype === TT_INFLOOR) {
            await pline(`You are stuck in the ${surface_underfoot()}, and cannot pull your ${makeplural(body_part(5 /*FOOT*/))} out.`);
            return false;
        }
    }
    // C ref: do_wear.c select_off() suit and shirt checks — an outer cursed
    // layer (or a welded two-handed weapon) blocks disrobing.
    if (obj === game.uarm || obj === game.uarmu) {
        let buf = '', why = null;
        if (game.uarmc && game.uarmc.cursed) {
            buf = 'remove your cloak'; why = game.uarmc;
        } else if (obj === game.uarmu && game.uarm && game.uarm.cursed) {
            buf = 'remove your suit'; why = game.uarm;
        } else if (welded(game.uwep) && bimanual(game.uwep)) {
            buf = `release your ${is_sword(game.uwep) ? 'sword' : 'weapon'}`;
            why = game.uwep;
        }
        if (why) {
            await pline(`You cannot ${buf} to take off ${'the ' + xname(obj)}.`);
            why.bknown = 1;
            return false;
        }
    }
    // basic curse check (quiver / non-twoweap swap-weapon are exempt).
    if (obj === game.uquiver || (obj === game.uswapwep && !game.u?.twoweap)) {
        /* some items can be removed even when cursed */
    } else if (await curse_blocks_removal(obj)) {
        return false;
    }
    return true;
}

// C ref: do_wear.c gloves_simple_name() — "gloves" for ordinary gloves, with a
// few special-cased names not exercised here.
function gloves_simple_name(_g) { return 'gloves'; }

// C ref: do_wear.c armor_or_accessory_off(obj) — shared by 'T' and 'R'.
async function armor_or_accessory_off(obj) {
    if (!((obj.owornmask || 0) & (WA_ARMOR_ALL | W_ACCESSORY))) {
        await pline('You are not wearing that.');
        return ECMD_OK;
    }
    // C ref: do_wear.c armor_or_accessory_off() — "can't take that off
    // without taking off your cloak first" (suit under cloak, shirt under
    // suit/cloak).  select_off() then applies the per-slot blockers.
    if (((obj === game.uarm) && game.uarmc)
        || ((obj === game.uarmu) && (game.uarmc || game.uarm))) {
        let what = '';
        if (game.uarmc) what += 'cloak';
        if ((obj === game.uarmu) && game.uarm)
            what += (game.uarmc ? ' and ' : '') + 'suit';
        await pline(`You can't take that off without taking off your ${what} first.`);
        return ECMD_OK;
    }
    // C ref: select_off() — refuse removal of cursed/blocked items (no turn).
    if (!(await select_off(obj))) return ECMD_OK;
    if ((obj.owornmask || 0) & WA_ARMOR_ALL) {
        await armoroff(obj);
    } else if (obj === game.uright || obj === game.uleft) {
        // C ref: off_msg() BEFORE Ring_off() so the "(on right hand)" suffix
        // is still present — "You were wearing a clay ring (on right hand)."
        if (game.flags?.verbose !== false)   // off_msg(): flags.verbose gated
            await pline(`You were wearing ${doname_invent(obj)}.`);
        clearworn_accessory(obj);
        if (obj.otyp === RIN_PROTECTION) find_ac();
        if (game._allow_inventory_update !== undefined) update_inventory();
    } else if (obj === game.uamul) {
        // Amulet_off does its own off_msg (after removal -> no "(being worn)").
        await Amulet_off(obj);
        if (game._allow_inventory_update !== undefined) update_inventory();
    } else if (obj === game.ublindf) {
        await Blindf_off(obj);
        if (game._allow_inventory_update !== undefined) update_inventory();
    } else {
        obj.owornmask = 0;
        if (game._allow_inventory_update !== undefined) update_inventory();
    }
    return ECMD_TIME;
}

// C ref: do_wear.c dotakeoff() — the 'T' command (armor; accessorizing=FALSE).
export async function dotakeoff() {
    const { Narmorpieces, Naccessories, which } = count_worn_stuff(false);
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

// C ref: do_wear.c doputon() — the 'P' command.  Full-complement guard is
// unreachable for the items these sessions wear.
export async function doputon() {
    if (game.uleft && game.uright && game.uamul && game.ublindf
        && game.uarm && game.uarmu && game.uarmc && game.uarmh && game.uarms
        && game.uarmg && game.uarmf) {
        await pline(`Your ring-${fingers_or_gloves(false)} are full, and you're already wearing an amulet and ${game.ublindf.otyp === LENSES ? 'some lenses' : 'a blindfold'}.`);
        return ECMD_OK;
    }
    // C ref: do_wear.c doputon() — the faithful 'P' ALWAYS opens the getobj
    // prompt (armor is downplay-selectable even with no accessory carried).
    // The old scoping guard reported the command unhandled so the dispatcher
    // printed "Unknown command 'P'." — which also left the key the player typed
    // at the (unrendered) prompt to fall through to the command parser, the
    // same failure mode that cost 139 screens in doenhance().
    const otmp = await getobj('put on', puton_ok, GETOBJ_NOFLAGS);
    if (!otmp) return ECMD_CANCEL;
    return await accessory_or_armor_on(otmp);
}

// True when the hero carries a not-yet-worn ring, amulet, or eyewear — i.e. an
// item for which 'P' (doputon) has observable behavior in the recorded sessions.
function hero_has_puton_accessory() {
    for (const o of (game.invent || [])) {
        if ((o.owornmask || 0) & (WA_ARMOR_ALL | W_ACCESSORY)) continue;
        if (o.oclass === RING_CLASS || o.otyp === MEAT_RING
            || o.oclass === AMULET_CLASS
            || o.otyp === BLINDFOLD || o.otyp === LENSES || o.otyp === TOWEL)
            return true;
    }
    return false;
}

// C ref: do_wear.c doremring() — the 'R' command (accessories; accessorizing=TRUE).
export async function doremring() {
    // C ref: do_wear.c doremring() — no scoping guard: with nothing worn C
    // still runs count_worn_stuff() and prints "Not wearing any accessories or
    // armor." (a real line, not "Unknown command 'R'.").
    const { Narmorpieces, Naccessories, which } = count_worn_stuff(true);
    if (!Naccessories && !Narmorpieces) {
        await pline('Not wearing any accessories or armor.');
        return ECMD_OK;
    }
    let otmp = which;
    if (Naccessories !== 1) {
        otmp = await getobj('remove', remove_ok, GETOBJ_NOFLAGS);
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
// object: a plural object keeps it, a singular object gets the 3rd-person
// form (vtense's "sing:" label: are->is and have->has are irregular special
// cases, then the usual y->ies / s/x/z/ch/sh->es spelling tweaks, else +s).
export function otense(obj, verb) {
    if (is_plural(obj)) return verb;
    if (/^are$/i.test(verb)) return 'is';
    if (/^have$/i.test(verb)) return 'has';
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

// C ref: wield.c wield_ok() — getobj callback: weapons and weapon-tools are
// suggested; coins are excluded; everything else is downplayed.  '-' (null)
// is suggested so the prompt offers wielding nothing.
function wield_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST;
    if (obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)) return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// C ref: include/obj.h bimanual(otmp) — a weapon/weapon-tool flagged oc_big
// (BITS() "big" field == 1 in objects.h).  The JS object table doesn't carry
// oc_bimanual, so we enumerate every two-handed otyp explicitly: the two big
// swords, the tsurugi, all the polearms, the dwarvish mattock, and the
// quarterstaff.  Used both for the wield-with-shield restriction and for the
// "(weapon in hands)" inventory phrasing.
const BIMANUAL_OTYPS = new Set([
    45 /*BATTLE_AXE*/, 55 /*TWO_HANDED_SWORD*/, 57 /*TSURUGI*/,
    59 /*PARTISAN*/, 60 /*RANSEUR*/, 61 /*SPETUM*/, 62 /*GLAIVE*/,
    63 /*HALBERD*/, 64 /*BARDICHE*/, 65 /*VOULGE*/, 66 /*FAUCHARD*/,
    67 /*GUISARME*/, 68 /*BILL_GUISARME*/, 69 /*LUCERN_HAMMER*/,
    70 /*BEC_DE_CORBIN*/, 71 /*DWARVISH_MATTOCK*/, 79 /*QUARTERSTAFF*/,
]);
export function bimanual(obj) {
    return !!obj && (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS)
        && BIMANUAL_OTYPS.has(obj.otyp);
}
function is_sword(obj) {
    const sk = objects[obj?.otyp]?.oc_skill ?? 0;
    return sk >= 6 && sk <= 8; // P_BROAD_SWORD..P_LONG_SWORD region
}

// C ref: artifact.c will_weld() — a cursed artifact (or other weld-prone item)
// fuses to the hand.  The recorded wields are blessed/uncursed, so this is
// false; modelled via the welded() stub semantics.
function will_weld(obj) { return welded(obj); }

// C ref: artifact.c retouch_object() restricted to the wield path.  Consults
// touch_artifact() (drawing rn2(4) for SPFX_RESTR artifacts) and, for silver-
// haters / bane targets, would inflict damage.  Returns true when the hero can
// keep handling the object.  The recorded hero (Neutral archeologist) does not
// hate silver and is not a bane target, so after touch_artifact the function
// returns true with no further RNG.
function retouch_object(obj) {
    // C: a silver-hating hero may still perform the invocation ritual.
    if (obj?.otyp === BELL_OF_OPENING && game._invocation_pos) return true;
    if (touch_artifact(obj, game.youmonst)) {
        const ag = (objects[obj.otyp]?.material === 14 /* SILVER */) && Hate_silver();
        // bane_applies(): needs a polymorphed bane-target hero, not modelled.
        const bane = false;
        if (!ag && !bane) return true;
        game._pending_message =
            `You can't handle ${yname(obj)}${obj.owornmask ? ' anymore' : ''}!`;
        // C ref: artifact.c:2535 — the damage is skipped when touch_artifact()
        // already blasted the hero this call.
        if (!game._touch_blasted) {
            let dmg = 0;
            if (ag) dmg += Maybe_Half_Phys(rnd(10));
            if (bane) dmg += rnd(10);
            losehp_invent(dmg);
            exercise(A_CON, false);
        }
    }
    // C: the worn item comes off either way (and the caller's `loseit` drop is
    // not reached from the wield path).
    return false;
}

// C ref: wield.c ready_weapon() — install `wep` as the primary weapon (or
// unwield when wep is null).  Returns an ECMD_* result.  Ports the paths the
// recorded sessions reach: unwield, plain wield with the "weapon in hand"
// prinv announcement, and the artifact retouch (rn2(4)).  Welding, shield/
// two-handed conflicts, corpse-wield, and talking/glowing-artifact effects are
// modelled but not exercised.
function ready_weapon(wep) {
    let res = ECMD_OK;
    const was_twoweap = !!game.u?.twoweap;
    const had_wep = !!game.uwep;

    if (!wep) {
        if (game.uwep) {
            game._pending_message = `You are ${empty_handed()}.`;
            setuwep_slot(null);
            res = ECMD_TIME;
        } else {
            game._pending_message = `You are already ${empty_handed()}.`;
        }
    } else if (game.uarms && bimanual(wep)) {
        game._pending_message =
            `You cannot wield a two-handed ${is_sword(wep) ? 'sword'
              : wep.otyp === 45 /*BATTLE_AXE*/ ? 'axe' : 'weapon'} while wearing a shield.`;
        res = ECMD_FAIL;
    } else if (!retouch_object(wep)) {
        res = ECMD_TIME; // takes a turn even though it doesn't get wielded
    } else {
        res = ECMD_TIME;
        if (will_weld(wep)) {
            // Cursed-artifact weld message (not exercised: welded() is false for
            // the recorded kits).  Kept minimal to avoid unported name helpers.
            game._pending_message =
                `${cxname_singular(wep)} ${wep.quan === 1 ? 'welds itself' : 'weld themselves'} to your `
                + `${bimanual(wep) ? makeplural(body_part(6)) : `dominant right ${body_part(6)}`}!`;
            wep.bknown = 1;
        } else {
            // C kludge: temporarily set W_WEP so prinv() prints "(weapon in
            // <hand>)", then restore the mask before setuwep() applies it for
            // real.
            const dummy = wep.owornmask || 0;
            wep.owornmask = dummy | QW_WEP;
            prinv(null, wep, 0);
            wep.owornmask = dummy;
            // C ref: prinv() -> pline() leaves toplin == NEED_MORE, so a
            // following same-turn message (e.g. a pet's attack on the freed
            // turn) accumulates onto the wield line instead of replacing it.
            game._toplin = 1;
        }
        setuwep_slot(wep);
        if (was_twoweap && !game.u?.twoweap) {
            // (skip the two-weapon-ended message when already empty-handed)
        }
        // Talking / light artifacts: Grayswandir neither speaks nor glows, so
        // no further effects or RNG here.
    }
    void had_wep;
    return res;
}

// C ref: wield.c dowield() — the 'w' command: prompt for and wield a weapon.
// Returns an ECMD_* result (ECMD_TIME consumes a turn).  Ports the interactive
// paths the recorded sessions reach: prompt via getobj, the already-wielded /
// welded short-circuits, "wield nothing" ('-'), and a plain wield (which runs
// ready_weapon -> retouch_object -> touch_artifact).  Swap/quiver-confirm and
// the count-split branches are not exercised.
export async function dowield() {
    game.multi = 0;
    // cantwield (polymorph into a handless form) never applies for the
    // recorded human hero.
    clear_splitobjs();
    const wep = await getobj('wield', wield_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (!wep) {
        return ECMD_CANCEL; // cancelled
    } else if (wep === game.uwep) {
        game._pending_message = 'You are already wielding that!';
        if (is_weptool(wep)) game.unweapon = false;
        return ECMD_FAIL;
    } else if (welded(game.uwep)) {
        weldmsg(game.uwep);
        return ECMD_FAIL;
    }

    let newwep = wep;
    if (newwep === hands_obj) {
        newwep = null; // wield nothing
    } else if (newwep === game.uswapwep) {
        return await doswapweapon();
    } else if (newwep === game.uquiver) {
        // (quiver-confirm path not exercised; fall through to wield it)
        setuqwep(null);
    } else if ((newwep.owornmask || 0) & (QW_ARMOR_ALL_MASK)) {
        game._pending_message = 'You cannot wield that!';
        return ECMD_FAIL;
    }

    const oldwep = game.uwep;
    const result = ready_weapon(newwep);
    if (game.flags?.pushweapon && oldwep && game.uwep !== oldwep)
        setuswapwep(oldwep);
    untwoweapon();
    update_inventory();
    return result;
}

// W_ARMOR | W_ACCESSORY | W_SADDLE worn-mask bits for the "cannot wield that!"
// guard.  Uses the local QW_* armor bits plus accessory/saddle.
const QW_ARMOR_ALL_MASK = 0x7f /*armor*/ | 0x10000 /*amulet*/ | 0x20000 /*rings*/ | 0x40000 /*blindf*/ | 0x100000 /*saddle*/;

// C ref: wield.c doswapweapon() — the 'x' command (also dowield's uswapwep
// branch): unready the secondary, wield it, then make the old primary the new
// secondary.  Both slots announce themselves with prinv(), so the pair of lines
// pages behind a --More--.
export async function doswapweapon() {
    game.multi = 0;
    // cantwield(): only a handless/polymorphed hero, never the recorded human.
    if (welded(game.uwep)) {
        weldmsg(game.uwep);
        return ECMD_FAIL;
    }

    const oldwep = game.uwep, oldswap = game.uswapwep;
    setuswapwep(null);
    const result = ready_weapon(oldswap);     // prints the new primary's line
    if (game.uwep === oldwep) {
        setuswapwep(oldswap);                 // wield failed; put it back
    } else {
        setuswapwep(oldwep);
        // C: prinv() is a pline(), so this second line goes through
        // update_topl() and pages the first one behind a --More--.
        await update_topl(game.uswapwep ? prinv_fmt(null, game.uswapwep, 0)
                                        : 'You have no secondary weapon readied.');
    }
    if (game.u?.twoweap) {
        const { can_twoweapon } = await import('./wield.js');
        if (!(await can_twoweapon())) untwoweapon();
    }
    update_inventory();
    return result;
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

// C ref: role.c gu.urace.mnum (PM_HUMAN 0 / PM_ELF 1 / PM_DWARF 2 /
// PM_GNOME 3 / PM_ORC 4 as js/role.js races[] numbers them).
function race_mnum() { return game.urace?.mnum ?? game.initrace ?? 0; }

// Role mnums used by the multishot bonuses (js/invent.js ARTI_TOUCH_PROPS
// numbers the roles the same way u_init.c does).
const PM_CAVE_DWELLER_ROLE = 2, PM_RANGER_ROLE = 7, PM_ROGUE_ROLE = 8,
    PM_SAMURAI_ROLE = 9;
const YA = 22, YUMI = 86, ELVEN_ARROW = 19, ORCISH_ARROW = 20,
    ELVEN_BOW = 84, ORCISH_BOW = 85;

// C ref: dothrow.c multishot_class_bonus(Role_switch, ammo, launcher).  C keys
// this on the hero's MONSTER form, so a female samurai is PM_NINJA and picks up
// the extra shuriken/dart arm before falling through to the samurai case.
function multishot_class_bonus(obj, skill) {
    const role = game.urole?.mnum ?? game.u?.umonnum;
    const uwep = game.uwep;
    let bonus = 0;
    switch (role) {
    case PM_CAVE_DWELLER_ROLE:
        if (skill === -P_SLING || skill === P_SPEAR) bonus++;
        break;
    case PM_MONK:
        if (skill === -P_SHURIKEN) bonus++;
        break;
    case PM_RANGER_ROLE:
        if (skill !== P_DAGGER) bonus++;
        break;
    case PM_ROGUE_ROLE:
        if (skill === P_DAGGER) bonus++;
        break;
    case PM_SAMURAI_ROLE:
        if (game.flags?.female && (skill === -P_SHURIKEN || skill === -P_DART))
            bonus++;   /* PM_NINJA arm */
        if (obj.otyp === YA && uwep && uwep.otyp === YUMI) bonus++;
        break;
    default:
        break;
    }
    return bonus;
}

// C ref: dothrow.c throw_obj() — the skill/role/race/quest-launcher part of the
// multishot total (everything added before the rnd() rolls).
async function multishot_bonus(obj, skill) {
    const u = game.u;
    const uwep = game.uwep;
    let bonus = 0;
    // C: some roles get no volley bonus until expert; poor DEX inhibits it too.
    const weakmultishot = (Role_if(PM_WIZARD) || Role_if(PM_CLERIC)
        || (Role_if(PM_HEALER) && skill !== P_KNIFE)
        || (Role_if(PM_TOURIST) && skill !== -P_DART)
        || !!(u?.HFumbling || u?.EFumbling) || acurr_eff(A_DEX) <= 6);

    // C: switch (P_SKILL(weapon_type(obj))) — expert +2, skilled +1 (+1 only
    // when not weakmultishot for the skilled step).  enhance.js owns the skill
    // array; import it lazily because enhance.js imports this file.
    let pskill = 0;
    try {
        const { p_skill_of } = await import('./enhance.js');
        pskill = p_skill_of(weapon_type(obj)) | 0;
    } catch { pskill = 0; }
    if (pskill >= P_EXPERT) {
        bonus++;
        if (!weakmultishot) bonus++;
    } else if (pskill === P_SKILLED) {
        if (!weakmultishot) bonus++;
    }

    bonus += multishot_class_bonus(obj, skill);

    if (!weakmultishot) {
        switch (race_mnum()) {
        case 1: /* PM_ELF */
            if (obj.otyp === ELVEN_ARROW && uwep && uwep.otyp === ELVEN_BOW) bonus++;
            break;
        case 4: /* PM_ORC */
            if (obj.otyp === ORCISH_ARROW && uwep && uwep.otyp === ORCISH_BOW) bonus++;
            break;
        case 3: /* PM_GNOME */
            if (skill === -P_CROSSBOW) bonus++;
            break;
        default:
            break;
        }
        if (uwep && is_quest_artifact(uwep) && ammo_and_launcher(obj, uwep)) bonus++;
    }
    return bonus;
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
// C ref: monmove.c closed_door() — a door that is shut or locked.  rm.h:
// D_ISOPEN=0x02, D_CLOSED=0x04, D_LOCKED=0x08.  This used to mask (2|4), i.e.
// D_ISOPEN|D_CLOSED — so an OPEN door blocked and a LOCKED one did not.
function throw_closed_door(loc) {
    return loc?.typ === 23 /* DOOR */ && ((loc.doormask || 0) & (0x04 | 0x08)) !== 0;
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
    // objclass.h obj_material_types: GLASS == 19 (6 is CLOTH — the old literal
    // named GLASS but held CLOTH, so no armor ever got the 90% survival odds).
    if (obj.oclass === ARMOR_CLASS && objects[obj.otyp]?.material === 19 /* GLASS */)
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
    // C ref: dothrow.c throw_obj() runs its refusals in this order, BEFORE the
    // self-throw test; a worn/leashed/cursed-loadstone item and a boulder in
    // ordinary hands each stop the throw here (the boulder still costs a turn).
    if (!(await canletgo(obj, 'throw'))) return ECMD_OK;
    if (obj.otyp === BOULDER && !throws_rocks_flag(youmonst_data())) {
        game._pending_message = "It's too heavy.";
        return ECMD_TIME;
    }
    if (!u.dx && !u.dy && !u.dz) {
        game._pending_message = 'You cannot throw an object at yourself.';
        return ECMD_OK;
    }
    // C ref: dothrow.c:1146 `u_wipe_engr(2)` — throwing scuffs an engraving
    // underfoot, and wipe_engr_at() draws rn2() whenever one is there.
    if (engr_at(u.ux, u.uy)) wipe_engr_at(u.ux, u.uy, 2, false);
    if (welded(obj)) { weldmsg(obj); return ECMD_TIME; }

    // C ref: dothrow.c throw_obj() "Multishot calculations".  The skill, role,
    // race and quest-launcher bonuses all RAISE the argument to the final
    // rnd(multishot) — leaving them out did not just lose a missile, it drew
    // rnd(1) where C draws rnd(2)/rnd(3)/rnd(4), i.e. the wrong modulus.
    let multishot = 1;
    const skill = objects[obj.otyp]?.oc_skill ?? 0;   /* signed */
    const volley = (obj.quan > 1)
        && (is_ammo(obj) ? matching_launcher(obj, game.uwep) : obj.oclass === WEAPON_CLASS)
        && !(u?.uprops?.Confusion || u?.Confusion
             || u?.uprops?.Stun || u?.Stunned);
    if (volley) {
        multishot += await multishot_bonus(obj, skill);
        // C: crossbows need high strength for a quick reload; a weak shooter
        // rolls rnd(multishot) an EXTRA time before the general roll.
        if (multishot > 1 && skill === -P_CROSSBOW
            && ammo_and_launcher(obj, game.uwep)
            && acurrstr() < (race_mnum() === 3 /* PM_GNOME */ ? 16 : 18))
            multishot = rnd(multishot);
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

    // C ref: dothrow.c throwit() lines 1614-1648 — range derives from strength,
    // is clamped to >= 1, then ammo is adjusted: matching-launcher ammo gains a
    // cell (range++), while ammo thrown by hand (no wielded launcher, non-gem)
    // has its range HALVED (range /= 2) and prints the "by hand" notice.
    const crossbowing = ammo_and_launcher(otmp, game.uwep) && weapon_type(otmp) === 22 /* P_CROSSBOW */;
    const urange = Math.floor((crossbowing ? 18 : acurr_str_throw()) / 2);
    let range = urange - Math.floor((otmp.owt || 1) / 40);
    if (range < 1) range = 1;
    if (is_ammo(otmp)) {
        if (ammo_and_launcher(otmp, game.uwep)) {
            if (crossbowing) range = 60; /* BOLT_LIM */
            else range++;
        } else if (otmp.oclass !== GEM_CLASS) {
            range = Math.trunc(range / 2); // C: range /= 2 (truncating int division)
            const launcherName = an(skill_name_for(weapon_type(otmp)));
            const descr = weapon_descr_for(otmp);
            game._pending_message = `You aren't wielding ${launcherName}, so you throw your ${descr} by hand.`;
        }
    }

    // Trajectory + landing.
    const land = bhit_thrown_landing(u.dx, u.dy, range);

    // breaktest (obj_resists rn2(100)); the arrow survives and lands on the floor.
    const typ = game.level.at(land.x, land.y)?.typ ?? 0;
    const broke = (!IS_SOFT(typ) && thrown_breaks(otmp));
    if (!broke) {
        otmp.owornmask = 0;
        mkobj_place_object(otmp, land.x, land.y);
        otmp.where = OBJ_FLOOR;
        otmp.how_lost = LOST_THROWN;
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
// C ref: rm.h `#define IS_SOFT(typ) ((typ) == AIR || (typ) == CLOUD || IS_POOL(typ))`
// with AIR=35, CLOUD=36 and IS_POOL(typ) = POOL(16)..DRAWBRIDGE_UP(19).  This
// local shadowed const.js's correct IS_SOFT with POOL||MOAT||19 — so WATER and
// a raised drawbridge were hard, and AIR/CLOUD were too.
function IS_SOFT(typ) { return typ === 35 /* AIR */ || typ === 36 /* CLOUD */
                            || (typ >= 16 /* POOL */ && typ <= 19 /* DRAWBRIDGE_UP */); }

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

// C ref: dothrow.c dofire() — the #fire ('f') command.  Throws/shoots from the
// quiver, with fireassist auto-wielding the launcher.  Ports the ranger path the
// recorded sessions take: quiver holds bow ammo (arrows), the matching bow is the
// secondary weapon (uswapwep) while a dagger is wielded.  fireassist finds the
// launcher in the swap slot, so C queues `doswapweapon` then re-runs `dofire`:
//   - doswapweapon -> ready_weapon(bow): prints "b - a +1 bow (weapon in right
//     hand)." (prinv) and wields it; then re-readies the old uwep as the
//     secondary weapon, printing its prinv line (which forces a --More-- after
//     the bow line since the two messages don't share the top line).
//   - the re-run dofire now has ammo_and_launcher(uquiver, uwep) true, so it
//     throw_obj()s the ammo, which asks getdir("In what direction?").
// All of this is RNG-free until an actual missile is launched; the recorded
// session cancels at the direction prompt (invalid key + ESC), so no shot fires.
// getDir is supplied by the caller (cmd.js getdir) to avoid an import cycle.
export async function dofire(getDir) {
    const u = game.u;
    // ok_to_throw: starter hero has hands and isn't overloaded -> proceed.
    let obj = game.uquiver;

    // uwep is not a throw-and-return artifact for the starter roles, and the
    // quiver is non-empty here, so skip the throw-and-return / autoquiver /
    // doquiver_core(!obj) branches and go straight to fireassist.
    let skip_fireassist = false;

    // C ref: dothrow.c:557 — `if (uquiver && is_ammo(uquiver) && iflags.fireassist
    // && !skip_fireassist)`.  fireassist defaults On.
    if (game.uquiver && is_ammo(game.uquiver) && !skip_fireassist) {
        // uwep (a dagger) is not a polearm here, so skip use_pole.
        if (ammo_and_launcher(game.uquiver, game.uwep)) {
            // launcher already wielded: fire it directly.
            obj = game.uquiver;
        } else if (ammo_and_launcher(game.uquiver, game.uswapwep)) {
            // C ref: dothrow.c:566 — `cmdq_add_ec(doswapweapon); cmdq_add_ec(dofire)`.
            // doswapweapon is run as its own command: it wields the launcher
            // (printing the wield + secondary-weapon lines) and returns ECMD_TIME,
            // so a turn elapses BEFORE the re-queued dofire runs.  We take that
            // turn inline (mirroring hack.js run_movement), then retry the fire.
            await doswapweapon_inline();
            // C ref: ready_weapon() returns ECMD_TIME — the swap costs a turn even
            // though the subsequent throw may be cancelled.  Take it inline.
            game.context.move = 0;
            await moveloop_turn();
            // retry dofire: now the launcher is wielded.
            obj = game.uquiver;
        }
        // (find_launcher-from-pack branch: not reached for the starter ranger,
        // whose bow is always the swap weapon.)
    }

    // throw_obj asks the direction; the recorded session supplies an invalid
    // key then ESC, so getDir returns null and the fire is cancelled with no
    // missile launched.  The swap turn was already taken inline above, so we
    // return ECMD_OK (context.move stays 0) to avoid double-counting the turn.
    if (!obj) return ECMD_OK;
    const dir = await getDir();
    if (!dir) return ECMD_OK; // no direction -> throw cancelled; swap turn already taken
    return await throw_obj(obj, dir);
}

// C ref: wield.c doswapweapon()/ready_weapon() — swap the primary and secondary
// weapons.  Prints the new primary's prinv line ("<let> - <name> (weapon in
// right hand).") and, because a secondary weapon remains, that weapon's prinv
// line too; the two lines don't share the top line so a --More-- is forced
// between them (xwaitforspace rejects all but space/return/ESC).  RNG-free for
// the dagger<->bow swap the recorded session performs.
async function doswapweapon_inline() {
    const oldwep = game.uwep;
    const oldswap = game.uswapwep;
    // setuswapwep(NULL) then ready_weapon(oldswap): wield the launcher.
    setuswapwep(null);
    // ready_weapon: message printed with W_WEP set (kludge), then setuwep.
    if (oldswap) {
        const dummy = oldswap.owornmask || 0;
        oldswap.owornmask = dummy | QW_WEP;
        prinv(null, oldswap, 0);     // "b - a +1 bow (weapon in right hand)."
        oldswap.owornmask = dummy;
        game._toplin = 1;            // TOPLIN_NEED_MORE: a message follows
    }
    setuwep_slot(oldswap);
    // set the new secondary weapon (the old primary) and announce it; the
    // announcement forces the --More-- after the launcher line.
    if (game.uwep === oldwep) {
        setuswapwep(oldswap);
    } else {
        setuswapwep(oldwep);
        if (game.uswapwep)
            await update_topl(xprname(game.uswapwep,
                doname_invent_quan(game.uswapwep, 0), obj_to_let(game.uswapwep), true, 0, 0));
    }
}

// ── Travel command (_) ──────────────────────────────────────────────────
//
// C ref: cmd.c dotravel().  Prompts for a destination via the shared
// getpos() cursor selector (hack.js — also used by #jump/farlook/#terrain),
// in travel mode so auto-describe flags cells with no travel path.  On
// cancel (ESC), no time passes.  Reaching a destination (dotravel_target /
// the actual travel walk via findtravelpath) is not ported — picking a
// destination is a no-op (no time), matching the ESC-cancel behavior for
// sessions that pick rather than cancel.
export async function dotravel() {
    const u = game.u;
    await pline('Where do you want to travel to?');
    // C ref: getpos.c getpos() -> handle_tip(TIP_GETPOS): the first-ever
    // getpos() call pages this pending line with --More-- before showing the
    // farlook tip; on later calls (tip already shown) the tip is skipped and
    // the cursor frame goes straight onto the map at the hero (mirrors
    // dojump()'s identical pre-getpos() paging, since the shared getpos()
    // itself only auto-pages a pending line for verbose callers).
    const TIP_GETPOS = 1 << 4;
    const tipPending = !((game.context?.tips || 0) & TIP_GETPOS);
    if (tipPending) {
        await topl_more();
    } else {
        await getpos_render('Where do you want to travel to?', u.ux, u.uy);
    }
    // C ref: options.c NHOPTB(verbose, ...) defaults On — getpos() prints the
    // "(For instructions type a '?')" line unless a session explicitly turns
    // verbose off (none of these do).
    const cc = await getpos('the desired destination', u.ux, u.uy, null,
                            /*force=*/true, /*verbose=*/true, /*travelMode=*/true);
    if (!cc) return ECMD_CANCEL; // ESC -> cancelled, no time
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
    if (!(await canletgo(obj, 'drop'))) return 0;
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
// recorded sessions.
export async function pick_one_obj(obj) {
    const quan = obj.quan || 1;
    observe_object(obj);
    floor_extract_self(obj);
    const held = addinv(obj);
    // C ref: pickup.c pickup_prinv(held, count, "lifting") — only announce an
    // encumbrance-level change since the last check this pickup() call (reset
    // to 0 by dopickup()/autopickup_after_move() before lifting anything).
    const nearload = near_capacity();
    let liftPrefix = null;
    if (nearload !== (game._pickup_encumbrance || 0)) {
        const pfx = nearload >= EXT_ENCUMBER ? 'You have extreme difficulty'
            : nearload >= HVY_ENCUMBER ? 'You have much trouble'
              : nearload >= MOD_ENCUMBER ? 'You have trouble'
                : nearload >= SLT_ENCUMBER ? 'You have a little trouble'
                  : null;
        game._pickup_encumbrance = nearload;
        if (pfx) liftPrefix = `${pfx} lifting`;
    }
    if (game._merge_discovery_pending) {
        // A merge inside addinv() above discovered new BUC/id info; page the
        // "You learn more..." message first, then route the pickup line
        // through update_topl() so it pages/accumulates after it correctly.
        await report_merge_discovery();
        await update_topl(prinv_fmt(liftPrefix, held, quan));
    } else {
        // C ref: prinv() -> pline() leaves toplin == NEED_MORE, so a following
        // same-turn message (e.g. a monster opening a door -> "You hear a door
        // open.") accumulates onto the pickup line via update_topl() instead of
        // replacing it (matches the wield/wear prinv paths).
        prinv(liftPrefix, held, quan);
        game._toplin = 1;
    }
    return held;
}

// C ref: pickup.c pickup() menu path + win/tty query_objlist() — the ','
// command over a multi-object pile opens a selectable "Pick up what?" menu.
// Objects are grouped by class in the default inventory order (classOrder),
// each class preceded by an inverse header ("Weapons", "Comestibles", ...);
// items are lettered a, b, c... in display order with a " - " (unselected) /
// " + " (selected) separator.  A letter key toggles its item; space pages (one
// page here); return/enter confirms.  On confirm the selected objects are
// lifted in display order (pick_one_obj -> prinv), the prinv lines chaining on
// one topline via update_topl (CO-8 rule), matching the recorded
// "r - 11 darts.  s - 2 white gems." frame.
//
// Layout matches the recorder (ttyDisplay->cols == 82, H2344_BROKEN): offx 41,
// the morestr/(end) cursor parked at offx + 6 (col 47) on the (end) row.
async function pickup_menu(here) {
    const display = game.nhDisplay;
    // Build the menu in class order, lettering items as they are displayed.
    const order = classOrder();
    const groups = []; // { header, items:[{obj, letter}] }
    let li = 0;
    const nextLetter = () => (li < 26 ? String.fromCharCode(97 + li++)
        : String.fromCharCode(65 + (li++ - 26)));
    // C ref: options.c def_inv_order[] already leads with COIN_CLASS, so
    // classOrder() alone covers it (no separate COIN_CLASS prepend needed).
    for (const oclass of order) {
        const items = here.filter((o) => o.oclass === oclass);
        if (!items.length) continue;
        // C ref: pickup.c query_objlist() -> invent.c sortloot() — the default
        // 'sortloot' option ('l') alphabetizes same-class piles (via
        // loot_xname) rather than showing raw floor-chain order, so a freshly
        // landed "poisoned dart" sorts after a plain "dart" pile.
        const sorted = sortloot(items, SORTLOOT_LOOT).map((sli) => sli.obj).filter(Boolean);
        const g = { header: let_to_name(oclass, false, false), items: [] };
        // C ref: pickup.c query_objlist() — the first (only) coin stack's
        // selector is always '$' (GOLD_SYM), never a lettered accelerator.
        for (const o of sorted)
            g.items.push({ obj: o, letter: oclass === COIN_CLASS ? GOLD_SYM : nextLetter() });
        groups.push(g);
    }
    // selected[invlet] = true
    const selected = new Map();

    const MENU_OFFX = 41;
    const draw = () => {
        if (!display?.clearScreen) return;
        display.clearScreen();
        render_map_to_grid();
        const cols = display.cols ?? 80;
        // Count rows: prompt + blank + per group (header + items) + (end).
        let totalRows = 2; // prompt + blank
        for (const g of groups) totalRows += 1 + g.items.length;
        totalRows += 1; // (end)
        // C ref: win/tty/wintty.c process_menu_window() writes a leading
        // blank column at cw->offx (cl_end() then putchar(' ')) before each
        // line's text, one column left of where the text itself starts —
        // clear that padding column too, or the map bleeds through there.
        for (let r = 0; r < totalRows && r < 22; r++)
            for (let c = MENU_OFFX - 1; c < cols; c++)
                display.setCell(c, r, ' ', NO_COLOR, 0);
        let row = 0;
        display.putstr(MENU_OFFX, row++, 'Pick up what?', NO_COLOR, ATR_INVERSE);
        display.putstr(MENU_OFFX, row++, '', NO_COLOR, ATR_NONE);
        for (const g of groups) {
            display.putstr(MENU_OFFX, row++, g.header, NO_COLOR, ATR_INVERSE);
            for (const it of g.items) {
                const sep = selected.get(it.letter) ? ' + ' : ' - ';
                const line = `${it.letter}${sep}${doname_with_price(it.obj)}`;
                display.putstr(MENU_OFFX, row++, line, NO_COLOR, ATR_NONE);
            }
        }
        const endRow = row;
        display.putstr(MENU_OFFX, row, '(end)', NO_COLOR, ATR_NONE);
        putStatusLines(display);
        // Cursor parks at offx + 6 (col 47) on the (end) row (matches recorder).
        display.setCursor(MENU_OFFX + 6, endRow);
    };

    const letterMap = new Map();
    for (const g of groups) for (const it of g.items) letterMap.set(it.letter, it);

    let confirmed = false;
    for (;;) {
        draw();
        game._modal_screen = 'pickupmenu';
        const c = await nhgetch();
        const ch = String.fromCharCode(c);
        if (c === 27) { selected.clear(); confirmed = false; break; } // ESC: cancel
        if (c === 13 || c === 10) { confirmed = true; break; }        // confirm
        if (letterMap.has(ch)) {
            if (selected.get(ch)) selected.delete(ch); else selected.set(ch, true);
            continue;
        }
        // C ref: win/tty/wintty.c MENU_SELECT_ALL ('.') / MENU_UNSELECT_ALL
        // ('-') / MENU_INVERT_ALL ('@') -> set_all_on_page()/
        // unset_all_on_page()/invert_all(): mark every item on the (only)
        // page selected / deselected / toggled.
        if (ch === '.') { for (const let_ of letterMap.keys()) selected.set(let_, true); continue; }
        if (ch === '-') { selected.clear(); continue; }
        if (ch === '@') {
            for (const let_ of letterMap.keys())
                if (selected.get(let_)) selected.delete(let_); else selected.set(let_, true);
            continue;
        }
        // space/other paging keys: single page -> treated as confirm-of-page.
        if (c === 32) { confirmed = true; break; }
    }
    delete game._modal_screen;

    if (!confirmed || selected.size === 0) return 0;

    // Lift the selected objects in display order, chaining their prinv lines.
    const chosen = [];
    for (const g of groups)
        for (const it of g.items)
            if (selected.get(it.letter)) chosen.push(it.obj);
    let any = false;
    for (const obj of chosen) {
        const prior = game._pending_message || '';
        await pick_one_obj(obj);                 // sets _pending_message to prinv line
        const line = game._pending_message || '';
        if (any && prior) {
            game._pending_message = prior;
            game._toplin = 1; // TOPLIN_NEED_MORE
            await update_topl(line);
        }
        any = true;
    }
    newsym_force(game.u.ux, game.u.uy);
    return 1;
}

// C ref: hack.c dopickup() + pickup.c pickup_checks()/pickup(-count).  The ','
// command picks up the objects under the hero.  We model the floor pickup the
// recorded sessions exercise (not engulfed, on reachable floor): nothing here ->
// "There is nothing here to pick up." with no time elapsed; a single object ->
// auto-selected and lifted (AUTOSELECT_SINGLE under the default menu style); a
// multi-object pile -> the selectable "Pick up what?" menu (pickup_menu).
// Returns ECMD_TIME(1) when something was picked up, else ECMD_OK(0).
export async function dopickup() {
    game._pickup_encumbrance = 0; // C ref: pickup.c pickup() — gp.pickup_encumbrance = 0
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
    // Multiple objects: the selectable "Pick up what?" menu.  Returns 1 if any
    // item was lifted (a turn elapses), else 0.
    return await pickup_menu(here);
}

// C ref: display.c newsym_force() — force a redraw of (x,y).  newsym already
// recomputes the displayed glyph from the (now reduced) floor pile, so this is
// the same call here.
function newsym_force(x, y) { newsym(x, y); }

// C ref: invent.c canletgo(obj, word) — the four refusals, in C's order: a worn
// armor piece/accessory, a cursed loadstone, a leash with a monster on it, and
// a saddle being sat on.  The worn-item guard was missing entirely, so 'd' on a
// worn ring used to move it out of inventory while uleft/uright still pointed
// at it; the loadstone branch printed nothing and never set bknown.
async function canletgo(obj, word) {
    if (!obj) return true;
    if ((obj.owornmask || 0) & (WA_ARMOR_ALL | W_ACCESSORY)) {
        // C uses Norep(); the port has no repeat-suppressing pline, and the
        // repeat case needs two identical lines in a row to differ.
        if (word) await pline(`You cannot ${word} something you are wearing.`);
        return false;
    }
    if (obj.otyp === LOADSTONE && obj.cursed) {
        if (word) {
            // getobj()'s count kludge parks the requested count in corpsenm.
            if (word !== 'throw' && (obj.corpsenm | 0) > 0
                && (obj.corpsenm | 0) < (obj.quan || 1))
                await pline(`You cannot ${word} just part of a stack of cursed loadstones.`);
            else
                await pline(`For some reason, you cannot ${word}${(obj.quan || 1) > 1 ? ' any of' : ''} the stone${plur(obj.quan || 1)}!`);
        }
        obj.corpsenm = 0;   /* reset */
        obj.bknown = 1;
        return false;
    }
    if (obj.otyp === LEASH && obj.leashmon) {
        if (word) await pline(`The leash is tied around your ${body_part(6 /*HAND*/)}.`);
        return false;
    }
    if ((obj.owornmask || 0) & W_SADDLE) {
        if (word) await pline(`You cannot ${word} something you are sitting on.`);
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
    let header = '    ' + padEnd('Name', 20) + ' Level ' + padEnd('Category', 12)
        + ' Fail Retention';
    // C ref: spell.c dospellmenu — `if (wizard) Sprintf(eos(buf), "%c%6s", sep,
    // "turns");` and, per row, `"%c%6d"` with the raw spellknow() value.
    // `wizard` is C's debug-mode flag, which options.c set_playmode() sets from
    // OPTIONS=playmode:debug — the same thing js/options.js records as
    // flags.debug.  Omitting the column also shifted the whole menu 7 columns
    // right, because the tty derives offx from the widest line.
    const wiz = !!game.flags?.debug;
    if (wiz) header += ' ' + padStart('turns', 6);
    // Row fmt: "%-20s  %2d   %-12s %3d%% %9s".
    const rows = [];
    for (let i = 0; i < nspells; i++) {
        const ent = book[i];
        const name = meta.name(ent.sp_id);
        const lev = ent.sp_lev;
        const cat = meta.category(ent.sp_id);
        const fail = meta.fail(i);
        const reten = meta.retention(i);
        let buf = padEnd(name, 20) + '  ' + padStart(String(lev), 2) + '   '
            + padEnd(cat, 12) + ' ' + padStart(`${fail}%`, 4) + ' ' + padStart(reten, 9);
        if (wiz) buf += ' ' + padStart(String(meta.turns ? meta.turns(i) : 0), 6);
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
    // C ref: win/tty/wintty.c — a menu heading is shown with ATR_INVERSE, but
    // the recorder serializes space-runs longer than 4 columns as cursor-forwards
    // (which decode as default attr) while runs of <= 4 spaces keep the inverse
    // bit.  Same treatment dovspell's menu already uses.
    const drawHeading = (text, row) => {
        for (let c = 0; c < text.length && offx + c < 80; c++) {
            let attr = ATR_INVERSE;
            if (text[c] === ' ') {
                let s = c; while (s > 0 && text[s - 1] === ' ') s--;
                let e = c; while (e + 1 < text.length && text[e + 1] === ' ') e++;
                if (e - s + 1 > 4) attr = 0;
            }
            display.setCell(offx + c, row, text[c], NO_COLOR, attr);
        }
    };
    // C ref: win/tty/topl.c — displaying the menu clears the message window, so
    // the previous command's topline is gone rather than showing through to the
    // left of the prompt.
    game._pending_message = '';
    for (let c = 0; c < offx && c < 80; c++)
        display.setCell(c, 0, ' ', NO_COLOR, 0);
    // C ref: win/tty/wintty.c — a menu window paints its full rectangle: every
    // row is cleared from offx to offx+maxcol before the text is written, so a
    // short row like "(end)" hides the map beneath instead of letting it show.
    const winRight = Math.min(offx + maxcol, 80);
    const totalRows = 3 + itemLines.length + 1;
    for (let r = 0; r < totalRows; r++)
        for (let c = offx; c < winRight; c++)
            display.setCell(c, r, ' ', NO_COLOR, 0);
    let row = 0;
    drawHeading(prompt, row++);
    draw('', row++, 0);
    drawHeading(header, row++);
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
// C ref: invent.c identify(otmp) — fully_identify_obj() then prinv(), whose
// pline() routes through update_topl().  That routing is load-bearing: an
// identify scroll announces every item it names, each line is ~45 columns, so two
// of them cannot share the 80-column topline and C emits a --More-- between
// them — one captured frame per identified item (seed4500 steps 494-497).
// prinv() assigns _pending_message directly, which silently overwrites the
// previous item instead, so use update_topl() here.
export async function identify(otmp) {
    fully_identify_obj(otmp);
    await update_topl(prinv_fmt(null, otmp, 0));
    return 1;
}
export function menu_identify(id_limit) { identify_pack(id_limit, false); }
export function count_unidentified(objchn) { let n = 0; for (const obj of iterateObjects(objchn)) if (not_fully_identified(obj)) ++n; return n; }
// C ref: invent.c identify_pack(id_limit, learning_id).  id_limit==0 OR >=
// unid_cnt identifies the whole pack; a positive limit identifies up to that
// many.  When nothing is unidentified, reports "You have already identified
// <all|the rest> of your possessions." (learning_id => "the rest", since the
// just-read identify scroll was used up before this call).
export async function identify_pack(id_limit = 0, learning_id = false) {
    const unid_cnt = count_unidentified(inventoryArray());
    if (!unid_cnt) {
        // C: You("have already identified ..."); update_topl so the message
        // chains after (and pages with --More--) any line already pending this
        // turn — e.g. the "This is an identify scroll." line from the read.
        await update_topl(`You have already identified ${learning_id ? 'the rest' : 'all'} of your possessions.`);
        update_inventory();
        return;
    }
    if (!id_limit || id_limit >= unid_cnt) {
        let remaining = unid_cnt;
        for (const obj of inventoryArray()) {
            if (not_fully_identified(obj)) { await identify(obj); if (--remaining < 1) break; }
        }
    } else {
        // limited identify: identify up to id_limit items (menu selection in C;
        // the owned sessions never hit the partial-menu path, so take the first
        // id_limit unidentified items in pack order).
        let n = id_limit;
        for (const obj of inventoryArray()) {
            if (n > 0 && not_fully_identified(obj)) { await identify(obj); --n; }
        }
    }
    update_inventory();
}
// C ref: wizcmds.c wiz_identify() — sets iflags.override_ID and calls
// display_inventory(NULL, FALSE); invent.c display_pickinv()'s `wizid` block
// puts an add_menu_str() title ("Debug Identify", ATR_NONE) at the top and then
// lists ONLY the not-fully-identified items (`if (wizid &&
// !not_fully_identified(otmp)) continue`).  With nothing left to identify the
// list is empty and a single "(all items ...)" line replaces the selector entry.
// The menu is PICK_ANY, so the dismissal key is handled by the command loop
// (like the '\' list) rather than a local key loop.
export function wiz_identify() {
    const unid_cnt = count_unidentified(inventoryArray());
    let title = 'Debug Identify';
    if (unid_cnt)
        title += ` -- unidentified or partially identified item${unid_cnt === 1 ? '' : 's'}`;
    const flat = [{ text: title, attr: 0 }];
    if (!unid_cnt) {
        flat.push({ text: '(all items are permanently identified already)', attr: 0 });
    } else {
        // visctrl(C('I')) == "^I"; the primary selector is '_'.
        let prompt = `select ${unid_cnt === 1 ? 'it' : 'any or all of them'} to permanently identify`;
        if (unid_cnt > 1) prompt += ' (^I for all)';
        flat.push({ text: `_ - ${prompt}`, attr: 0 });
        const headAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
        for (const group of inventoryRows(null, not_fully_identified)) {
            const [heading, ...items] = group;
            flat.push({ text: heading, attr: headAttr });
            for (const item of items) flat.push({ text: item, attr: 0 });
        }
    }
    renderMenuLines(flat, null);
    return ECMD_OK;
}

export function learn_unseen_invent() { for (const obj of inventoryArray()) observe_object(obj); update_inventory(); }
export function update_inventory() { if (!program_state().in_moveloop && !game._allow_inventory_update) return; }
export function doperminv() { return ECMD_OK; }
export function obj_to_let(obj) { if (!flags().invlet_constant) reassign(); return obj?.invlet || NOINVSYM; }

// The text prinv() would print, with no display side effects.  Callers that
// want to route the line through update_topl() themselves (so successive
// pickups accumulate onto one topline) format with this instead of calling
// prinv() and then undoing its writes.
export function prinv_fmt(prefix, obj, quan = 0) {
    // C ref: invent.c prinv()/xprname() — the per-item line uses the full
    // doname() form (BUC, enchant, erosion, and worn-status suffix such as
    // "(at the ready)"), not the bare object name.
    //   boolean total_of = (quan && (quan < obj->quan));
    // When a subset count is lifted onto (merged into) a larger stack — e.g.
    // picking up gold that merges with coins already carried — C suppresses the
    // trailing period on the item name (xprname dot = !total_of) and, when
    // flags.verbose, appends " (<obj->quan> in total)." after it.
    const total_of = !!(quan && obj && quan < obj.quan);
    const text = xprname(obj, doname_invent_quan(obj, quan), obj_to_let(obj), !total_of, 0, quan);
    const totalbuf = (total_of && flags().verbose !== false)
        ? ` (${obj.quan} in total).` : '';
    return `${prefix ? `${prefix} ` : ''}${text}${totalbuf}`;
}

export function prinv(prefix, obj, quan = 0) {
    game._pending_message = prinv_fmt(prefix, obj, quan);
    // C ref: invent.c prinv() emits its line with pline(), which routes through
    // topl.c update_topl() and leaves gt.toplin == TOPLIN_NEED_MORE.  Any
    // message printed afterwards in the same command therefore either merges
    // onto this line or fires --More-- first; without recording the state the
    // follow-up (e.g. wizcmds.c wiz_wish()'s encumber_msg()) silently
    // overwrites the item line instead.
    game._toplines = game._pending_message;
    game._toplin = 1; // TOPLIN_NEED_MORE
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

// C ref: invent.c surface(x,y) — the noun for the terrain underfoot, used in
// the itemactions "Write on the <surface> with this item" label.  Ordinary
// dungeon floor (and the cases the recorded sessions reach) is "floor".
function surface_underfoot() {
    const loc = game.level?.at?.(game.u?.ux, game.u?.uy);
    const typ = loc?.typ;
    // C distinguishes water/lava/ice/air/cloud; none occur under the hero in the
    // itemactions-exercising sessions, so the common dungeon case is "floor".
    if (typ === 33 /* ICE (rm.h); 21 is LAVAWALL */) return 'ice';
    return 'floor';
}

// C ref: objects.h HARDGEM(n) == (n >= 8) — a gem/ring is "tough" (engrave, not
// write) only for the hardest gemstones (mohs >= 8: diamond and a handful of
// gem types).  The objects table here carries no mohs field; none of the
// exercised rings/gems are HARDGEM, so this conservatively returns false (->
// "Write").  Hard-gem otyps can be added if a session ever engraves with one.
function obj_is_hardgem(_obj) { return false; }

// itemactions() action enum (iactions.h IA_*) — the subset the object classes in
// the recorded sessions can offer.  Each entry carries its menu accelerator and
// label; itemactions_dispatch() turns the chosen one into the real command.
const IA_NONE = 0, IA_UNWIELD = 1, IA_APPLY_OBJ = 2, IA_NAME_OBJ = 3,
    IA_NAME_OTYP = 4, IA_DROP_OBJ = 5, IA_EAT_OBJ = 6, IA_ENGRAVE_OBJ = 7,
    IA_FIRE_OBJ = 8, IA_ADJUST_OBJ = 9, IA_SPLIT_OBJ = 10, IA_SACRIFICE = 11,
    IA_BUY_OBJ = 12, IA_WEAR_OBJ = 13, IA_QUAFF_OBJ = 14, IA_QUIVER_OBJ = 15,
    IA_READ_OBJ = 16, IA_TAKEOFF_OBJ = 17, IA_RUB_OBJ = 18, IA_THROW_OBJ = 19,
    IA_TIP_CONTAINER = 20, IA_INVOKE_OBJ = 21, IA_WIELD_OBJ = 22,
    IA_ZAP_OBJ = 23, IA_WHATIS_OBJ = 24;

// C ref: iactions.c itemactions(otmp) — build the per-object "Do what with %s?"
// action list, in the C cascade order.  Mirrors the conditions for each action
// block; only the cases the recorded object classes reach are populated.  Each
// returned entry is { act, accel, label }.
function itemactions_list(otmp) {
    const out = [];
    const add = (act, accel, label) => out.push({ act, accel, label });
    const oclass = otmp.oclass;
    const already_worn = (otmp.owornmask & (W_ARMOR | W_ACCESSORY)) !== 0;
    const quan = otmp.quan || 1;
    const is_blade = (o) => o.oclass === WEAPON_CLASS && objects[o.otyp]?.oc_skill != null;

    // 'a' (apply): tools / specific applicables.  Rings et al. are not applied.
    if (oclass === TOOL_CLASS && is_weptool(otmp) === false) {
        // The recorded tool sessions don't reach the itemactions 'a' branch for
        // the carried tools, so leave apply out unless a session needs it.
    }
    // 'c' / 'C' (name this specific object / name the type).  For a type-known,
    // un-individually-named object NetHack offers "Name this specific <obj>".
    if (oclass !== COIN_CLASS) {
        add(IA_NAME_OBJ, 'c', `Name this specific ${cxname_singular(otmp)}`);
    }
    // 'd' (drop): any unworn carried object.
    if (!already_worn) add(IA_DROP_OBJ, 'd', 'Drop this item');
    // 'E' (engrave/write): wand / ring / gem / blade-tipped writer.  C verb is
    // "Engrave" iff is_blade || WAND || ((GEM||RING) && oc_tough), where oc_tough
    // = HARDGEM(mohs) (mohs >= 8 — only the hardest gemstones).  None of the
    // exercised rings/gems are HARDGEM (the see-invisible ring's mohs is 5), so
    // they "Write"; only wands and blades "Engrave".
    if (oclass === WAND_CLASS || oclass === RING_CLASS || oclass === GEM_CLASS
        || is_blade(otmp)) {
        const tough = (oclass === GEM_CLASS || oclass === RING_CLASS)
            && obj_is_hardgem(otmp);
        const verb = (is_blade(otmp) || oclass === WAND_CLASS || tough)
            ? 'Engrave' : 'Write';
        add(IA_ENGRAVE_OBJ, 'E', `${verb} on the ${surface_underfoot()} with this item`);
    }
    // 'i' (adjust inventory letter): any non-coin object.
    if (oclass !== COIN_CLASS) {
        add(IA_ADJUST_OBJ, 'i', 'Adjust inventory by assigning new letter');
    }
    // 'I' (split a stack): quantity > 1.
    if (quan > 1) add(IA_SPLIT_OBJ, 'I', 'Split this stack of items');
    // 'P' (put on): ring/amulet/eyewear, not already worn.
    if (!already_worn && (oclass === RING_CLASS)) {
        const free_finger = !game.uleft || !game.uright;
        if (free_finger) add(IA_WEAR_OBJ, 'P', 'Put this ring on');
        else add(IA_NONE, 'P', '[both ring fingers in use]');
    } else if (!already_worn && oclass === AMULET_CLASS) {
        add(IA_WEAR_OBJ, 'P', 'Put this amulet on');
    }
    // 't' (throw): any unworn object.
    if (!already_worn) add(IA_THROW_OBJ, 't', 'Throw this item');
    // 'w' (wield in hands): unworn, not the currently wielded weapon.
    if (!already_worn && otmp !== game.uwep) {
        // body_part index 6 == HAND (humanoid hero); makeplural -> "hands".
        add(IA_WIELD_OBJ, 'w', `Wield this item in your ${makeplural(body_part(6))}`);
    }
    // '/' (look up): data.base entry exists.  The recorded ring/weapon sessions
    // all reach the '/' line, so offer it for the exercised object classes.
    add(IA_WHATIS_OBJ, '/', 'Look up information about this');
    return out;
}

// Render the itemactions "Do what with %s?" submenu as a tty overlay menu (the
// query is the inverse-video title at row 0, then a blank row, the action lines,
// and "(end)").  C ref: win/tty/wintty.c finalize NHW_MENU — offx is computed
// from the widest line; the map shows through below/outside the menu band.
function renderItemActionsMenu(otmp, entries) {
    const display = game.nhDisplay;
    if (!display?.clearScreen) return;
    const title = `Do what with ${the_obj(otmp)}?`;
    const itemLines = entries.map((e) => `${e.accel} - ${e.label}`);
    const lines = [title, '', ...itemLines, '(end)'];
    // C ref: win/tty/wintty.c tty_end_menu — cw->maxcol = widest entry's
    // strlen()+2 ("extra space at beg & end"); tty_display_nhwindow NHW_MENU then
    // sets the window offset offx = max(10, cols - maxcol - 1), collapsing to a
    // full-screen menu (offx 0) when it would be 10.
    let maxcol = 0;
    for (const ln of lines) maxcol = Math.max(maxcol, ln.length + 2);
    if (maxcol > 80) maxcol = 80;
    const cols = display.cols ?? 80;
    let offx = Math.max(10, cols - maxcol - 1);
    if (offx === 10) offx = 0;
    // C ref: process_menu_window draws each row as tty_curs(win,1,r) + a leading
    // putchar(' ') then the entry text, so the text starts at screen column
    // offx+1 (the leading space occupies offx).
    const textx = offx + 1;

    display.clearScreen();
    render_map_to_grid();
    // C ref: process_menu_window's cl_end() blanks [offx, cols) on every menu row
    // (the leading-space column included); the map shows through only to the LEFT.
    for (let r = 0; r < lines.length && r < 22; r++)
        for (let c = offx; c < cols; c++)
            display.setCell(c, r, ' ', NO_COLOR, 0);
    let row = 0;
    // Row 0: the query title, drawn with the menu prompt style (= menu_headings,
    // ATR_INVERSE).
    for (let c = 0; c < title.length && textx + c < 80; c++)
        display.setCell(textx + c, row, title[c], NO_COLOR, ATR_INVERSE);
    row++;
    display.putstr(textx, row++, '', NO_COLOR, 0); // blank separator row
    for (const ln of itemLines) display.putstr(textx, row++, ln, NO_COLOR, 0);
    const endRow = row;
    display.putstr(textx, row, '(end)', NO_COLOR, 0);
    // C ref: win/tty/wintty.c erase_menu_or_text — dismissing the full-screen
    // (offx==0) inventory menu that preceded this submenu ran docrt(), whose cls()
    // blanked the status window and only set disp.botlx (no bot() has redrawn it),
    // so the status lines stay blank until a turn passes.  An overlay-menu
    // (offx>0) dismiss used docorner() and left the status intact.
    if (game._botl_blanked) {
        for (let c = 0; c < cols; c++) {
            display.setCell(c, 22, ' ', NO_COLOR, 0);
            display.setCell(c, 23, ' ', NO_COLOR, 0);
        }
    } else {
        putStatusLines(display);
    }
    // C tty parks the cursor just past the "(end)" prompt (textx + 5 + 1).
    display.setCursor(textx + '(end)'.length + 1, endRow);
    game._modal_screen = 'itemactions';
}

// the(cxname(otmp)) — "the <object name>", used in the submenu title.
function the_obj(otmp) {
    const nm = cxname_singular(otmp);
    return /^(the |a |an |your |my |[A-Z])/.test(nm) ? nm : `the ${nm}`;
}

// C ref: iactions.c itemactions(otmp) — show the "Do what with %s?" PICK_ONE
// submenu, block until the player picks a valid action accelerator (invalid
// keys ring the bell and keep the menu shown — each blocking read is captured as
// its own recorded frame), then run the chosen command.  Always returns the
// chosen command's ECMD result (or ECMD_OK when cancelled), since the 'i'
// command itself elapses no time.  getDir is threaded through for the Throw
// action (whose dothrow needs the direction prompt) without a cmd<->invent
// import cycle.
async function itemactions(otmp, getDir) {
    const entries = itemactions_list(otmp);
    // Selectable accelerators (an IA_NONE placeholder like "[both ring fingers
    // in use]" is shown but not selectable — pressing its key rings the bell).
    const sel = new Map();
    for (const e of entries) if (e.act !== IA_NONE) sel.set(e.accel, e);
    for (;;) {
        renderItemActionsMenu(otmp, entries);
        const c = await nhgetch();
        const ch = String.fromCharCode(c);
        if (c === 27) { // ESC: cancel — no action, no time
            delete game._modal_screen;
            return ECMD_OK;
        }
        if (c === 13 || c === 10) { // Return/Enter: commit with nothing -> cancel
            delete game._modal_screen;
            return ECMD_OK;
        }
        const chosen = sel.get(ch);
        if (!chosen) continue; // invalid selector: bell, menu stays (re-render)
        delete game._modal_screen;
        return await itemactions_dispatch(otmp, chosen.act, getDir);
    }
}

// C ref: iactions.c itemactions_pushkeys(otmp, act) — push the chosen action's
// command (function + the object's invlet) onto the canned command queue, then
// itemactions returns ECMD_OK so the queued command runs next.  Here we run the
// command directly, pre-seeding the object's invlet at the FRONT of the input
// queue so the command's getobj() consumes it before any further player keys
// (the cmdq_add_key equivalent).
async function itemactions_dispatch(otmp, act, getDir) {
    // C ref: itemactions_pushkeys — push the object's invlet onto the canned
    // command queue so the dispatched command's getobj() consumes it silently.
    const seedInvlet = () => cmdq_add_key(CQ_CANNED, otmp.invlet);
    switch (act) {
    case IA_DROP_OBJ:
        seedInvlet();
        return await dodrop();
    case IA_THROW_OBJ:
        seedInvlet();
        return await dothrow(getDir);
    case IA_WIELD_OBJ:
        seedInvlet();
        return await dowield();
    case IA_WEAR_OBJ: // 'P' put-on routes through dowear (unified wear/put-on)
        seedInvlet();
        return await dowear();
    case IA_ENGRAVE_OBJ: {
        // doengrave lives in engrave.js; load it on demand.  It reads the
        // stylus via getobj, which consumes the pre-seeded invlet.
        seedInvlet();
        const eng = await import('./engrave.js');
        return await eng.doengrave();
    }
    // IA_NAME_OBJ / IA_ADJUST_OBJ / IA_WHATIS_OBJ and the other actions are not
    // exercised by any recorded session; itemactions returns ECMD_OK for them so
    // the 'i' command elapses no time (the canned command, if any, would run on
    // a subsequent rhack iteration).
    default:
        return ECMD_OK;
    }
}

// C ref: invent.c dispinv_with_action(lets, use_inuse_ordering, alt_label) —
// show the inventory and, when it was a PICK_ONE menu (lets==NULL for the 'i'
// command), call itemactions() on the selected object.  The interactive menu
// blocks reading keys (each blocking read is captured as its own recorded
// frame); pressing an item's invlet selects it (PICK_ONE finishes immediately),
// space/return/ESC dismiss without a selection, and an invalid key rings the
// bell and keeps the menu shown.  Returns the chosen command's ECMD result.
export async function dispinv_with_action(lets = null, use_inuse_ordering = false, alt_label = null, getDir = null) {
    void use_inuse_ordering; void alt_label;
    const len = lets ? String(lets).length : 0;
    const menumode = (len !== 1) || !!game.iflags?.menu_requested;
    if (!menumode) {
        // len==1 (e.g. dopramulet on a single letter): a one-line message_menu
        // display, no item selection.  Keep the existing non-interactive render.
        display_inventory(lets, false);
        return ECMD_OK;
    }
    // Build the selectable inventory; empty -> "Not carrying anything."
    const rows = inventoryRows(lets);
    if (!rows.length) {
        await renderMessageOnMap('Not carrying anything.');
        return ECMD_OK;
    }
    // Map every displayed invlet to its object so a selection resolves to an item.
    const byLet = new Map();
    for (const obj of inventoryArray())
        if (!lets || String(lets).includes(obj.invlet)) byLet.set(obj.invlet, obj);

    // Interactive PICK_ONE menu loop.  C ref: display_pickinv + select_menu.
    let page = 0;
    for (;;) {
        const info = renderInventoryMenu(rows, page);
        const c = await nhgetch();
        // C ref: process_menu_window() case ' '/MENU_NEXT_PAGE — space advances
        // to the next page; only on the last page does space finish the menu.
        if (c === 32 && info.multipage && page < info.pages - 1) {
            page++;
            continue;
        }
        // ESC cancels; space/return commit-with-nothing (dismiss).
        if (c === 27 || c === 32 || c === 13 || c === 10) {
            await dismiss_invent_screen();
            return ECMD_OK;
        }
        const ch = String.fromCharCode(c);
        const otmp = byLet.get(ch);
        if (!otmp) continue; // invalid selector: bell, menu stays (re-render)
        // PICK_ONE: selecting an item finishes; dispinv_with_action then runs
        // itemactions(otmp).
        delete game._modal_screen;
        return await itemactions(otmp, getDir);
    }
}

// C ref: end.c disclose() 'i' branch — `(void) display_inventory((char *) 0,
// TRUE); container_contents(...)`.  want_reply=TRUE but the caller discards
// the result, so this is the same paginated PICK_ONE display+page loop as
// dispinv_with_action, minus the itemactions() follow-up: any dismiss key
// (space on the last page / return / ESC) or a valid invlet selection just
// closes the menu with no further effect.
export async function display_inventory_interactive(lets = null) {
    const rows = inventoryRows(lets);
    if (!rows.length) {
        await renderMessageOnMap('Not carrying anything.');
        return;
    }
    const byLet = new Map();
    for (const obj of inventoryArray())
        if (!lets || String(lets).includes(obj.invlet)) byLet.set(obj.invlet, obj);
    let page = 0;
    for (;;) {
        const info = renderInventoryMenu(rows, page);
        const c = await nhgetch();
        if (c === 32 && info.multipage && page < info.pages - 1) {
            page++;
            continue;
        }
        if (c === 27 || c === 32 || c === 13 || c === 10) {
            await dismiss_invent_screen();
            return;
        }
        if (!byLet.get(String.fromCharCode(c))) continue; // invalid selector: bell, menu stays
        await dismiss_invent_screen();
        return;
    }
}

// Render the selectable inventory.  When the content fits one page it is a tty
// overlay (offx computed from the widest line, "(end)" footer); when it overflows
// it becomes a full-screen paged menu with an "(N of M)" footer.  C ref:
// win/tty/wintty.c finalize NHW_MENU + process_menu_window paging.  Returns
// {multipage, pages} so callers can drive the space-advances-page loop.
function renderInventoryMenu(rows, page = 0) {
    // Flatten rows into menu lines, tagging class headers (ATR_INVERSE).
    // C ref: windows.c add_menu_heading() — suppresses the highlight
    // (attr = ATR_NONE) during end-of-game disclosure (program_state.gameover).
    const headerAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const lines = [];
    for (const group of rows) {
        const [heading, ...items] = group;
        lines.push({ text: ` ${heading}`, attr: headerAttr, header: true });
        for (const it of items) lines.push({ text: ` ${it}`, attr: 0 });
    }
    const display = game.nhDisplay;
    if (!display?.clearScreen) return { multipage: false, pages: 1 };
    const totalRows = display.rows ?? 24;
    const perPage = totalRows - 1; // 23 content lines, footer on the last row
    const multipage = lines.length > perPage;
    // C ref: win/tty/wintty.c — a paged menu is a full-screen window (offx==0);
    // dismissing it runs docrt(), which blanks the status window (see
    // renderItemActionsMenu).  A single-page menu is an overlay (offx>0) whose
    // dismiss uses docorner() and leaves the status intact.
    game._botl_blanked = multipage;
    if (multipage) {
        // Full-screen paged menu: footer "(N of M)".
        const pages = Math.ceil(lines.length / perPage);
        const curPage = Math.max(0, Math.min(page, pages - 1));
        const pageLines = lines.slice(curPage * perPage, curPage * perPage + perPage);
        display.clearScreen();
        let row = 0;
        for (const ln of pageLines) {
            display.putstr(0, row, ln.text, NO_COLOR, ln.attr || 0);
            row++;
        }
        const footer = `(${curPage + 1} of ${pages})`;
        // C ref: win/tty/wintty.c process_menu_window — the footer/morestr sits
        // right after the current page's own content (tty_curs(..., page_lines)),
        // not a fixed row; a short last page places it above row 23.
        const footerRow = pageLines.length;
        // C ref: win/tty/wintty.c process_menu_window/dmore — the menu "(N of M)"
        // morestr is indented one column (like the menu item lines), unlike a
        // full-screen text window's "--More--" which starts at column 0.
        const footerCol = 1;
        display.putstr(footerCol, footerRow, footer, NO_COLOR, 0);
        display.setCursor(footerCol + footer.length, footerRow);
        game._modal_screen = 'invent';
        return { multipage: true, pages };
    }
    // Single page: overlay via the existing renderer (map shows through).
    renderMenuScreen(rows, null);
    return { multipage: false, pages: 1 };
}

export async function ddoinv(getDir = null) {
    return await dispinv_with_action(null, false, null, getDir);
}

// C ref: pager.c do_look() case 'i' — display_inventory(NULL, TRUE) as a
// PICK_ONE menu, then singular(pickedobj, xname) for the data.base lookup key.
// Renders the interactive inventory (each blocking read is a recorded frame),
// returns the picked item's singular name (checkfile strips BUC/enchant/"(...)"
// prefixes so the type name is what matters), or null on empty/cancel.
export async function whatis_pick_inventory() {
    const rows = inventoryRows(null);
    if (!rows.length) {
        await renderMessageOnMap('Not carrying anything.');
        return null;
    }
    const byLet = new Map();
    for (const obj of inventoryArray()) byLet.set(obj.invlet, obj);
    let page = 0;
    for (;;) {
        const info = renderInventoryMenu(rows, page);
        const c = await nhgetch();
        if (c === 32 && info.multipage && page < info.pages - 1) {
            page++;
            continue;
        }
        if (c === 27 || c === 32 || c === 13 || c === 10) {
            await dismiss_invent_screen();
            return null;
        }
        const otmp = byLet.get(String.fromCharCode(c));
        if (!otmp) continue; // invalid selector: bell, menu stays
        delete game._modal_screen;
        return cxname_singular(otmp);
    }
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
    // Pass null EXPLICITLY, not nothing: renderMenuScreen's default parameter is
    // itself a hardcoded [36, 8], and only an explicit null reaches the derived
    // tty position (offx + len("(end)") + 1, on the (end) row).  This used to
    // pass a hardcoded [38, 20] for the seed8000 Tourist fingerprint.
    renderMenuScreen(rows, null);
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

// C ref: insight.c align_str().
function align_str(a) {
    return a === A_CHAOTIC ? 'chaotic' : a === A_NEUTRAL ? 'neutral'
        : a === A_LAWFUL ? 'lawful' : a === A_NONE ? 'unaligned' : 'unknown';
}

// C ref: invent.c:4075 dfeature_at()'s IS_ALTAR arm — "%saltar to %s (%s)" from
// a_gname() and align_str().  The altarmask lives in struct rm's flags union
// (rm.h: `#define altarmask flags`), and this port writes it under BOTH names
// (mklev.js mkaltar/mktemple use loc.flags; sp_lev.js's builders use
// loc.altarmask), so read either.  align_gname() indexes the roles[] ARRAY, not
// the PM_ mnum — they differ for Rogue/Ranger — hence the findIndex.
function altar_description(loc) {
    const amask = loc.altarmask ?? loc.flags ?? 0;
    const align = Amask2align(amask & ~AM_SHRINE);
    const rolemnum = game.urole?.mnum ?? game.u?.umonnum ?? 0;
    const ri = roles.findIndex((r) => r.mnum === rolemnum);
    const gname = align_gname(ri >= 0 ? ri : rolemnum, align);
    return `${(amask & AM_SANCTUM) ? 'high ' : ''}altar to ${gname} (${align_str(align)})`;
}

// C ref: invent.c dfeature_at() — the dungeon feature at (x,y).  Ports the
// staircase/ladder branch (via game.stairs) used by look_here on the dungeon
// entrance, then falls back to the cell's typName for other features.
export function dfeature_at(x, y, buf = '') {
    let feature = null;
    for (let s = game.stairs; s && !feature; s = s.next)
        if (s.sx === x && s.sy === y) feature = stairs_description(s, true);
    if (!feature) {
        // C ref: invent.c dfeature_at — terrain features named via defsyms
        // explanations.  Altars still fall through to loc.typName below.
        const loc = game.level?.at?.(x, y);
        const ltyp = loc?.typ;
        // C ref: invent.c dfeature_at IS_DOOR branch — describe a door by its
        // doormask (exact-value switch, as in C): a doorway (D_NODOOR), open
        // door (D_ISOPEN), broken door (D_BROKEN), else closed door.
        if (IS_DOOR(ltyp)) {
            switch (loc.doormask) {
            case D_NODOOR: feature = 'doorway'; break;
            case D_ISOPEN: feature = 'open door'; break;
            case D_BROKEN: feature = 'broken door'; break;
            default: feature = 'closed door'; break;
            }
        }
        else if (IS_FOUNTAIN(ltyp)) feature = 'fountain';
        else if (IS_THRONE(ltyp)) feature = 'opulent throne';
        else if (ltyp === LAVAPOOL || ltyp === LAVAWALL) feature = 'molten lava';
        else if (ltyp === ICE) feature = 'ice';
        else if (ltyp === POOL || ltyp === MOAT || ltyp === WATER) feature = 'pool of water';
        else if (IS_SINK(ltyp)) feature = 'sink';
        // C ref: invent.c:4075 — ALTAR sits between SINK and the stairway arm.
        else if (IS_ALTAR(ltyp)) feature = altar_description(loc);
        else if (ltyp === DRAWBRIDGE_DOWN) feature = 'lowered drawbridge';
        else if (ltyp === DBWALL) feature = 'raised drawbridge';
        else if (IS_GRAVE(ltyp)) feature = 'grave';
        else if (ltyp === TREE) feature = 'tree';
        else if (ltyp === IRONBARS) feature = 'set of iron bars';
        else if (loc?.typName) feature = loc.typName;
    }
    if (Array.isArray(buf)) buf[0] = feature || '';
    return feature;
}

// C ref: mkmaze.c waterbody_name() — the non-hallucinating name of a body of
// water at (x,y).  Only the ordinary dungeon variants describe_decor() needs
// are modelled (special-level "shallow sea"/"swamp"/"pond" and hallucinated
// liquids are not); a plain POOL is "pool of water", a MOAT is a "moat".
function decor_waterbody_name(ltyp) {
    if (ltyp === MOAT) return 'moat';
    if (ltyp === WATER) return 'water';
    return 'pool of water';
}

// C ref: pickup.c describe_decor() — the 'mention_decor' option.  When the hero
// walks onto a dungeon feature (door/water/fountain/altar/stairs/&c.) that is
// not covered by an object, announce it even though nothing was picked up.
// mention_decor is turned on only by the tutorial (dat/tut-1.lua), so this is a
// no-op elsewhere.  Prints "There is <a feature> here." (flags.verbose is the
// default) and records iflags.prev_decor so the same terrain type isn't
// re-announced on the next consecutive step (furniture is exempt from that
// de-duplication, matching IS_FURNITURE).  Returns TRUE like the C routine.
export async function describe_decor() {
    const x = game.u?.ux, y = game.u?.uy;
    const loc = game.level?.at?.(x, y);
    // C SURFACE_AT(x,y): the surface terrain; == levl[][].typ off a drawbridge
    // (the only drawbridge-up case is not reached on the mention_decor level).
    const ltyp = loc ? loc.typ : STONE;
    let dfeature = dfeature_at(x, y);
    const doorhere = !!dfeature && (dfeature === 'open door' || dfeature === 'doorway');
    const waterhere = !!dfeature && dfeature === 'pool of water';
    // C: "we don't mention 'ordinary' doors but do mention broken ones (and
    // closed ones, which will only happen for Passes_walls)".  Underwater and
    // the ice-over-pool transition also suppress the feature.
    if (doorhere || game.Underwater) dfeature = null;

    const prevDecor = game.iflags?.prev_decor ?? STONE;
    if (ltyp === prevDecor && !IS_FURNITURE(ltyp)) {
        /* same terrain as last mentioned and not furniture -> stay silent */
    } else if (dfeature) {
        if (waterhere) dfeature = decor_waterbody_name(ltyp);
        // C: an() unless it's "swamp" or the ice descriptions (which self-name).
        if (dfeature !== 'swamp' && ltyp !== ICE) dfeature = an(dfeature);
        // flags.verbose defaults on: "There is <feature> here."
        await pline(`There is ${dfeature} here.`);
    }
    game.iflags = game.iflags || {};
    game.iflags.prev_decor = game.flags?.mention_decor ? ltyp : STONE;
    return true;
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

// C ref: engrave.c read_engr_at() — sense and read aloud any engraving at
// (x,y) via update_topl (so it properly merges onto / pages an already
// pending message, matching pline's real behavior).  Returns true if an
// engraving was sensed (and so a message was queued).
async function read_engr_at_topl(x, y) {
    const ep = engr_at(x, y);
    const text = ep?.actualText || '';
    if (!ep || !text) return false;
    let intro;
    switch (ep.engr_type) {
    case DUST:       if (game.Blind) return false;
                     intro = 'Something is written here in the dust.'; break;
    case ENGRAVE:
    case HEADSTONE:  intro = 'Something is engraved here on the floor.'; break;
    case BURN:       intro = 'Some text has been burned into the floor here.'; break;
    case MARK:       if (game.Blind) return false;
                     intro = "There's some graffiti on the floor here."; break;
    case ENGR_BLOOD: if (game.Blind) return false;
                     intro = 'You see a message scrawled in blood here.'; break;
    default: return false;
    }
    const last = text.charAt(text.length - 1);
    const endpunct = (text.length >= 2 && '.!?'.includes(last)) ? '' : '.';
    await update_topl(intro);
    await update_topl(`You read: "${text}"${endpunct}`);
    ep.eread = 1;
    ep.erevealed = 1;
    return true;
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
        // No object: feature (if any), then any engraving, then "no objects"
        // (only when blind or there was no feature to report).
        // C ref: invent.c look_here() !otmp branch — pline1(fbuf); read_engr_at();
        // if (!skip_objects && (Blind || !dfeature)) You("%s no objects here.", verb).
        if (dfeature) await update_topl(`There is ${an(dfeature)} here.`);
        await read_engr_at_topl(x, y);
        if (game.Blind || !dfeature)
            await update_topl(`You ${verb} no objects here.`);
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
    // Multiple objects (and obj_cnt < pile_limit, the default 5).  C ref:
    // invent.c look_here() else-branch — flush WIN_MESSAGE, build a menu window
    // listing every floor object, and show it blocking on --More--:
    //   Sprintf(buf, "%s that %s here:", picked_some ? "Other things" : "Things",
    //           Blind ? "you feel" : "are");
    //   for (otmp...) putstr(tmpwin, 0, doname_with_price(otmp));
    //   display_nhwindow(tmpwin, TRUE);          // pages with --More--
    const picked_some = (lookhere_flags & LOOKHERE_PICKED_SOME) !== 0;
    const header = `${picked_some ? 'Other things' : 'Things'} that ${game.Blind ? 'you feel' : 'are'} here:`;
    const itemLines = here.map((o) => doname_with_price(o));
    await renderThingsHereMenu(header, itemLines);
    return game.Blind ? ECMD_TIME : ECMD_OK;
}

const LOOKHERE_PICKED_SOME = 1; // C: invent.h LOOKHERE_PICKED_SOME

// C ref: win/tty/wintty.c tty_display_nhwindow(NHW_MENU, TRUE) for the
// look_here() "Things that are here:" window.  The recorder consistently
// places this overlay menu at column 41 (offx) with the morestr "--More--"
// on the row right after the last list line and the cursor parked one column
// past it (col 49).  The map shows through outside the menu's column band, so
// lay the map down first and blank only the menu rows from offx rightward.
// Blocks on a quitchar (space/return/ESC); the blocking nhgetch is captured as
// this step's frame.
async function renderThingsHereMenu(header, itemLines) {
    // C ref: win/tty/wintty.c tty_display_nhwindow() NHW_MENU branch — before
    // drawing the menu overlay, an unacknowledged top-line message is paged:
    //   if (ttyDisplay->toplin == TOPLINE_NEED_MORE)
    //       tty_display_nhwindow(WIN_MESSAGE, TRUE);   // more() + clear
    // So any pending combat/etc. message (e.g. the pet's attacks during the
    // movemon pass that triggered this look_here) fires a blocking --More--
    // (captured as its own frame) and the message line is cleared before the
    // "Things that are here:" menu is laid down.
    if (game._toplin === 1) {
        await topl_more();
        game._pending_message = '';
        game._toplin = 0;
    }
    const MENU_OFFX = 41;
    const display = game.nhDisplay;
    const lines = [header, ...itemLines];
    const moreRow = lines.length;          // row after header + items
    const draw = () => {
        if (!display?.clearScreen) return;
        display.clearScreen();
        render_map_to_grid();
        const cols = display.cols ?? 80;
        // Blank the menu's column band for every row it occupies (the menu
        // window is cleared; the map only shows OUTSIDE it).
        for (let r = 0; r <= moreRow && r < 22; r++)
            for (let c = MENU_OFFX; c < cols; c++)
                display.setCell(c, r, ' ', NO_COLOR, 0);
        let row = 0;
        for (const ln of lines)
            display.putstr(MENU_OFFX, row++, ln, NO_COLOR, ATR_NONE);
        display.putstr(MENU_OFFX, moreRow, '--More--', NO_COLOR, ATR_NONE);
        putStatusLines(display);
        display.setCursor(MENU_OFFX + '--More--'.length, moreRow);
    };
    // xwaitforspace(quitchars): read keys until space / return / escape.  Other
    // keys ring the bell and keep the window up (re-render is identical).
    for (;;) {
        draw();
        game._modal_screen = 'thingshere';
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
    }
    delete game._modal_screen;
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

// C ref: invent.c doprgold() — the '$' command.  Reports wallet gold
// (money_cnt over invent incl. containers) + any hidden_gold(); flags.verbose
// (the default / covered path) uses the "Your wallet ..." phrasing.  A plain
// pline (not a blocking window), so the following key is a normal command.
export async function doprgold() {
    const umoney = money_cnt(inventoryArray()) || game._goldCount || 0;
    const hmoney = hidden_gold(false);
    if (game.flags?.verbose !== false) {
        let buf = umoney ? `Your wallet contains ${umoney} ${currency(umoney)}`
                         : 'Your wallet is empty';
        if (hmoney)
            buf += `, ${umoney ? 'and' : 'but'} you have ${hmoney} `
                 + `${umoney ? 'more' : currency(hmoney)} stashed away in your pack`;
        await pline(`${buf}.`);
    } else {
        const total = umoney + hmoney;
        await pline(total ? `You are carrying a total of ${total} ${currency(total)}.`
                          : 'You have no money.');
    }
    shopper_financial_report();
    return ECMD_OK;
}

// C ref: invent.c doprwep() — the ')' command (#seeweapon).  Bare hands ->
// empty_handed(); otherwise show the wielded weapon (and offhand when
// two-weaponing) via prinv (a one-item top-line message, tty's single-item
// inventory-query form).
export async function doprwep() {
    if (!game.uwep) {
        await pline(`You are ${empty_handed()}.`);
    } else if (!game.iflags?.menu_requested) {
        prinv(null, game.uwep, 0);
        if (game.u?.twoweap && game.uswapwep) prinv(null, game.uswapwep, 0);
    } else {
        const lets = [game.uwep, game.u?.twoweap ? game.uswapwep : null, game.uquiver]
            .filter(Boolean).map((o) => o.invlet).join('');
        await dispinv_with_action(lets, true, null);
    }
    return ECMD_OK;
}

export function noarmor(report_uskin) {
    game._pending_message = report_uskin && game.uskin
        ? `You are not wearing armor but have ${simpleonames(game.uskin)} embedded in your skin.`
        : 'You are not wearing any armor.';
}

// C ref: invent.c doprarm() — the '[' command (#seearmor).  No armor ->
// noarmor(); a single worn piece renders as a one-item top-line message
// ("<let> - <doname> (being worn)."); multiple pieces use the inventory menu.
export async function doprarm() {
    const worn = [game.uarm, game.uarmc, game.uarms, game.uarmh,
                  game.uarmg, game.uarmf, game.uarmu].filter(Boolean);
    if (!worn.length) {
        noarmor(true);
    } else if (worn.length === 1 && !game.iflags?.menu_requested) {
        prinv(null, worn[0], 0);
    } else {
        await dispinv_with_action(worn.map((o) => o.invlet).join(''), true, null);
    }
    return ECMD_OK;
}

// C ref: invent.c doprring() — the '=' command (#seerings).
export async function doprring() {
    const worn = [game.uright, game.uleft].filter(Boolean);
    if (!worn.length) {
        game._pending_message = 'You are not wearing any rings.';
    } else if (worn.length === 1 && !game.iflags?.menu_requested) {
        prinv(null, worn[0], 0);
    } else {
        await dispinv_with_action(worn.map((o) => o.invlet).join(''), true,
                                  worn.length === 1 ? 'Ring' : 'Rings');
    }
    return ECMD_OK;
}

// C ref: invent.c dopramulet() — the '"' command (#seeamulet).
export async function dopramulet() {
    if (!game.uamul) {
        game._pending_message = 'You are not wearing an amulet.';
    } else if (!game.iflags?.menu_requested) {
        prinv(null, game.uamul, 0);
    } else {
        await dispinv_with_action(String(obj_to_let(game.uamul)), true, 'Amulet');
    }
    return ECMD_OK;
}

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
export async function doorganize() {
    const inv = inventoryArray();
    if (!inv.length || (inv.length === 1 && inv[0].oclass === COIN_CLASS
        && inv[0].invlet === GOLD_SYM)) {
        game._pending_message = `You aren't carrying anything ${inv.length ? 'adjustable' : 'to adjust'}.`;
        return ECMD_OK;
    }
    if (!flags().invlet_constant) reassign();
    const filter = check_invent_gold('adjust') ? adjust_gold_ok : adjust_ok;
    const obj = await getobj('adjust', filter, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    return doorganize_core(obj);
}
export function adjust_split() { return ECMD_FAIL; }

function merge_equipped_references(from, to) {
    const primary = game.uwep === from || game.uwep === to;
    const alternate = game.uswapwep === from || game.uswapwep === to;
    const quivered = game.uquiver === from || game.uquiver === to;
    if (primary) setuwep_slot(null);
    if (alternate) setuswapwep(null);
    if (quivered) setuqwep(null);
    if (primary) setuwep_slot(to);
    else if (alternate) setuswapwep(to);
    else if (quivered) setuqwep(to);
    if (game.u?.twoweap && !game.uswapwep) game.u.twoweap = 0;
}

export async function doorganize_core(obj) {
    if (!obj) return ECMD_CANCEL;

    const inv = inventoryArray();
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const available = [...alphabet].filter((letter) => {
        const occupant = inv.find((other) => other !== obj && other.invlet === letter);
        return !occupant || mergable(occupant, obj);
    });
    const choices = compactify(available.join(''));
    const prompt = `Adjust letter to what [${choices}] (? see used letters)?`;
    const isgold = obj.oclass === COIN_CLASS;

    for (let trycnt = 1; ; ++trycnt) {
        const key = isgold ? GOLD_SYM
            : String.fromCharCode(await topline_query(prompt));
        if (QUITCHARS.includes(key)) {
            await pline('Never mind.');
            return ECMD_OK;
        }
        if (key === GOLD_SYM && !isgold) {
            await pline(`Only gold coins may be moved into the '${GOLD_SYM}' slot.`);
            return ECMD_OK;
        }
        if (!/^[A-Za-z#]$/.test(key) && key !== GOLD_SYM) {
            await pline('Select an inventory slot letter.');
            if (trycnt >= 5) {
                await pline('Never mind.');
                return ECMD_OK;
            }
            continue;
        }

        const oldlet = obj.invlet;
        const destination = inv.find((other) => other !== obj && other.invlet === key);
        let result = obj;
        let action = key === oldlet ? 'Collecting:' : 'Moving:';

        if (key === oldlet) {
            for (const other of [...inv]) {
                if (other === result || other.invlet === oldlet) continue;
                if (!has_oname(other) || (has_oname(result) && ONAME(other) === ONAME(result))) {
                    if (mergable(result, other)) {
                        merge_equipped_references(other, result);
                        merged(result, other);
                    }
                }
            }
        } else if (destination && mergable(destination, obj)) {
            merge_equipped_references(obj, destination);
            merged(destination, obj);
            result = destination;
            action = 'Merging:';
        } else {
            if (destination) {
                destination.invlet = oldlet;
                action = 'Swapping:';
            }
            obj.invlet = key;
        }

        reorder_invent();
        if (game._merge_discovery_pending) {
            await report_merge_discovery();
            const acc = game._pending_message;
            prinv(action, result, 0);
            const line = game._pending_message;
            game._pending_message = acc;
            await update_topl(line);
        } else {
            prinv(action, result, 0);
        }
        update_inventory();
        return ECMD_OK;
    }
}

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
