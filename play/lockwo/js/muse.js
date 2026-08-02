// muse.js — monster item use.  C ref: src/muse.c.
//
// Scope: find_misc() / use_misc() — the "miscellaneous item" half of muse.  This
// exists because a monster that spends its turn USING an item does not MOVE, and
// omitting that made every monster in the port take a step where C's stood still.
// On seed0399 a human werewolf carrying a potion of speed quaffs it mid-turn; the
// resulting message interrupts monster movement at an input boundary, so C's
// remaining twelve monsters move only AFTER the player dismisses the --More--.
// Our port moved all of them immediately, putting fourteen monsters on the wrong
// squares from that turn onward.
//
// Why it was invisible in the RNG stream: MUSE_POT_SPEED draws NOTHING
// (mquaffmsg + mon_adjust_speed + m_useup are all deterministic), and the
// per-monster rolls around it — distfleeck's rn2(5) and mcalcmove's
// rn2(NORMAL_SPEED) — do not mention the monster, so a different SET of monsters
// acting produces a byte-identical call sequence.  Only the C recorder's monster
// dump (swarm/bin/mondiff.mjs / movepair.mjs) showed it.
//
// NOT IMPLEMENTED, deliberately: find_defensive()/use_defensive(), which C tries
// FIRST and which suppresses find_misc entirely when it succeeds
// (monmove.c:794-799).  A monster holding both a defensive item and a misc item
// therefore picks the misc one here where C picks the defensive one.  That is a
// pre-existing gap — the port used neither before — and it is called out rather
// than papered over.  use_misc() likewise handles only the cases we can render
// exactly; for the others it returns 0, which leaves behaviour identical to
// before this file existed while still emitting find_misc's rolls.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { is_animal, mindless, nohands, mflags1_of, mflags2_of, msound_of,
    M1_NEEDPICK, M1_BREATHLESS, M1_NOHEAD, M1_ACID,
    M2_JEWELS, M2_UNDEAD } from './monflags_data.js';
import { attacktype, AT_GAZE } from './monattk_data.js';
import { POT_SPEED, LARGE_BOX, BAG_OF_TRICKS, objects as OBJECTS } from './mkobj.js';
import { monster_by_pmidx } from './makemon.js';
// onscary() is an `export function` declaration in monmove.js, so the
// monmove -> muse -> monmove import cycle resolves through a hoisted binding
// (unlike a `const` arrow, which would be in its temporal dead zone here).
import { onscary } from './monmove.js';
// base_mmove() is likewise a hoisted `export function`, so the cycle is safe.
import { base_mmove } from './mon.js';
// C ref: pline() -> vpline() -> update_topl(): a new topline message shows
// --More-- for the UNACKNOWLEDGED previous one first (or appends to it when both
// fit).  js/display.js pline() only overwrites the pending text, so monster
// messages that land mid-turn must go through update_topl() to get C's boundary.
import { update_topl } from './display.js';
import { Monnam } from './uhitm.js';
import { cansee } from './vision.js';
import { obj_doname } from './invent.js';

// C ref: muse.c:2083-2092 — the has_misc selector values.
export const MUSE_POT_GAIN_LEVEL = 1;
export const MUSE_WAN_MAKE_INVISIBLE = 2;
export const MUSE_POT_INVISIBILITY = 3;
export const MUSE_POLY_TRAP = 4;
export const MUSE_WAN_POLYMORPH = 5;
export const MUSE_POT_SPEED = 6;
export const MUSE_WAN_SPEED_MONSTER = 7;
export const MUSE_BULLWHIP = 8;
export const MUSE_POT_POLYMORPH = 9;
export const MUSE_BAG = 10;

// C ref: monst.h mspeed values.
const MSLOW = 1, MFAST = 2;

// C's gm.m — the module-global "what did find_* pick" scratch pair.  Keeping the
// same shape means use_misc() reads exactly what find_misc() decided, as in C.
const m = { misc: null, has_misc: 0 };

// Local copies of two trivial C macros.  Deliberately NOT imported from
// monmove.js: that module imports this one, and an import cycle through a `const`
// arrow function is a temporal-dead-zone crash waiting to happen.
const dist2 = (x0, y0, x1, y1) => (x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1);
const distmin = (x0, y0, x1, y1) => Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));

// C ref: display.c canseemon(mon).
function canseemon(mtmp) {
    if (!mtmp) return false;
    if (game.u?.uswallow) return true;
    if (mtmp.minvis && !game.u?.see_invis) return false;
    return !!cansee(mtmp.mx, mtmp.my);
}

// C ref: objnam.c singular(otmp, doname) — name the stack as if quan were 1.
function singular_doname(obj) {
    const saved = obj.quan;
    obj.quan = 1;
    try { return obj_doname(obj); } finally { obj.quan = saved; }
}

// C ref: muse.c m_useup(mon, obj) — consume one of the stack.
function m_useup(mtmp, obj) {
    if ((obj.quan ?? 1) > 1) { obj.quan -= 1; return; }
    const inv = mtmp.minvent || [];
    const i = inv.indexOf(obj);
    if (i >= 0) inv.splice(i, 1);
}

// C ref: worn.c mon_adjust_speed(mon, adjust, obj).  Consumes no RNG.  The
// message gate is `give_msg = !gi.in_mklev` — NOT !mon_moving — so the
// "suddenly moving faster" line does print during monster movement.
export async function mon_adjust_speed(mon, adjust, _obj) {
    const oldspeed = mon.mspeed | 0;
    let give_msg = !game.in_mklev;
    switch (adjust) {
    case 2: mon.permspeed = MFAST; give_msg = false; break;
    case 1: mon.permspeed = (mon.permspeed === MSLOW) ? 0 : MFAST; break;
    case 0: break;
    case -1: mon.permspeed = (mon.permspeed === MFAST) ? 0 : MSLOW; break;
    case -2: mon.permspeed = MSLOW; give_msg = false; break;
    default: break;
    }
    // C: worn speed boots override permspeed.  Monster worn-armor properties
    // aren't modelled, so mspeed follows permspeed.
    mon.mspeed = mon.permspeed | 0;

    // C ref: worn.c — `mon->data->mmove` gates the message on the species being
    // mobile at all (a mold's speed change is never announced).  makemon.js's
    // permonst records carry no mmove field, so read it through mon.js's
    // base_mmove() table; testing `mon.data.mmove` directly is always undefined
    // and silently swallowed EVERY speed message.
    if (give_msg && mon.mspeed !== oldspeed && base_mmove(mon)
        && !(mon.mfrozen || mon.msleeping) && canseemon(mon)) {
        const howmuch = (mon.mspeed + oldspeed === MFAST + MSLOW) ? 'much ' : '';
        if (adjust > 0 || mon.mspeed === MFAST)
            await update_topl(`${Monnam(mon)} is suddenly moving ${howmuch}faster.`);
        else
            await update_topl(`${Monnam(mon)} seems to be moving ${howmuch}slower.`);
    }
}

// C ref: muse.c mquaffmsg(mtmp, otmp).
async function mquaffmsg(mtmp, otmp) {
    if (canseemon(mtmp)) {
        // C: observe_object(otmp) — obj_doname() already does this for us.
        await update_topl(`${Monnam(mtmp)} drinks ${singular_doname(otmp)}!`);
    } else if (!game.u?.Deaf) {
        await update_topl('You hear a chugging sound.');
    }
}

// C ref: muse.c find_misc(mtmp) — muse.c:2095-2242.
//
// The scan is LAST-MATCH-WINS on purpose (C's own comment calls the lack of
// prioritisation a bug): each matching clause overwrites m.misc, and `nomore(x)`
// only skips a clause when the immediately-preceding pick was that same type.
// Two clauses draw RNG and both are gated behind an item test first, so a
// monster carrying neither a bullwhip nor a container draws nothing here:
//   * MUSE_BULLWHIP  rn2(5)  (wielded bullwhip, hero adjacent and armed)
//   * MUSE_BAG       rn2(5)  (any container that isn't a bag of tricks)
export function find_misc(mtmp) {
    const mdat = mtmp.data;
    const x = mtmp.mx, y = mtmp.my;
    const stuck = (mtmp === game.u?.ustuck);

    m.misc = null;
    m.has_misc = 0;
    if (is_animal(mdat) || mindless(mdat)) return false;
    if (game.u?.uswallow && stuck) return false;

    // C ref: muse.c:2117 — "arbitrarily limit to times when a player is nearby".
    // mux/muy is the monster's BELIEF about the hero's square, not u.ux/u.uy.
    const mux = mtmp.mux ?? 0, muy = mtmp.muy ?? 0;
    if (dist2(x, y, mux, muy) > 36) return false;

    // C ref: muse.c:2121-2143 — step onto an adjacent polymorph trap.  Draws no
    // RNG.  POLY_TRAP is not generated by any level our sessions visit, so the
    // scan is kept for shape and use_misc() declines to act on it.

    if (nohands(mdat)) return false;

    for (const obj of (mtmp.minvent || [])) {
        // MUSE_POT_GAIN_LEVEL — C also allows a cursed one for non-shk/gd/priest.
        if (obj.otyp === POT_GAIN_LEVEL_OTYP
            && (!obj.cursed || (!mtmp.isgd && !mtmp.isshk && !mtmp.ispriest))) {
            m.misc = obj; m.has_misc = MUSE_POT_GAIN_LEVEL;
        }
        // MUSE_BULLWHIP — the rn2(5) keeps a whip-wielder from trying to disarm
        // the hero every single turn.  Order matters: otyp and !mpeaceful and a
        // wielded hero weapon are all tested BEFORE the roll.
        if (m.has_misc !== MUSE_BULLWHIP
            && obj.otyp === BULLWHIP_OTYP && !mtmp.mpeaceful
            && game.u?.uwep && !rn2(5) && obj === (mtmp.mw || null)
            && mux === game.u?.ux && muy === game.u?.uy
            && distmin(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) <= 1
            && !game.u?.uswallow) {
            m.misc = obj; m.has_misc = MUSE_BULLWHIP;
        }
        // MUSE_WAN_MAKE_INVISIBLE / MUSE_POT_INVISIBILITY — invisibility isn't
        // modelled for monsters, so these are recognised (so `nomore` and the
        // last-match-wins ordering behave) but use_misc() declines them.
        if (m.has_misc !== MUSE_WAN_MAKE_INVISIBLE
            && obj.otyp === WAN_MAKE_INVISIBLE_OTYP && (obj.spe | 0) > 0
            && !mtmp.minvis && !mtmp.invis_blkd) {
            m.misc = obj; m.has_misc = MUSE_WAN_MAKE_INVISIBLE;
        }
        if (m.has_misc !== MUSE_POT_INVISIBILITY
            && obj.otyp === POT_INVISIBILITY_OTYP
            && !mtmp.minvis && !mtmp.invis_blkd) {
            m.misc = obj; m.has_misc = MUSE_POT_INVISIBILITY;
        }
        if (m.has_misc !== MUSE_WAN_SPEED_MONSTER
            && obj.otyp === WAN_SPEED_MONSTER_OTYP && (obj.spe | 0) > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            m.misc = obj; m.has_misc = MUSE_WAN_SPEED_MONSTER;
        }
        if (m.has_misc !== MUSE_POT_SPEED
            && obj.otyp === POT_SPEED
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            m.misc = obj; m.has_misc = MUSE_POT_SPEED;
        }
        // MUSE_WAN_POLYMORPH / MUSE_POT_POLYMORPH need mons[].difficulty < 6 and
        // a full newcham(); monster polymorph is unported, so they are skipped
        // entirely rather than half-done (skipping matches today's behaviour and
        // costs no RNG, since neither clause rolls).

        // MUSE_BAG — the rn2(5) fires for ANY container that isn't a bag of
        // tricks, before the has_contents/locked/trapped tests.  Container
        // contents aren't tracked for monsters, so Has_contents is FALSE and the
        // pick never lands; the ROLL still has to happen, because C makes it.
        if (m.has_misc !== MUSE_BAG
            && is_container_otyp(obj.otyp) && obj.otyp !== BAG_OF_TRICKS
            && !rn2(5)) {
            const hasContents = !!(obj.cobj && obj.cobj.length);
            if (!m.has_misc && hasContents && !obj.olocked && !obj.otrapped) {
                m.misc = obj; m.has_misc = MUSE_BAG;
            }
        }
    }
    return !!m.has_misc;
}

// C ref: muse.c use_misc(mtmp) — returns 2 when the monster spent its turn.
// Anything we cannot render exactly returns 0, which is what the port did before
// muse existed: the monster falls through to ordinary movement.
export async function use_misc(mtmp) {
    const otmp = m.misc;
    switch (m.has_misc) {
    case MUSE_POT_SPEED:
        if (!otmp) return 0;
        await mquaffmsg(mtmp, otmp);
        // C's comment: the hero gets temporary "very fast"; a monster goes one
        // stage faster PERMANENTLY.
        await mon_adjust_speed(mtmp, 1, otmp);
        m_useup(mtmp, otmp);
        return 2;
    default:
        return 0;
    }
}

// otyps referenced above, read straight off the js/mkobj.js OBJECTS rows rather
// than restated from memory — every value I first wrote here by inference was
// wrong (BULLWHIP is 82 not 208, POT_GAIN_LEVEL 309 not 297, WAN_MAKE_INVISIBLE
// 418 not 349), which is the exact shadowed-constant failure the port keeps
// getting bitten by.  LARGE_BOX/BAG_OF_TRICKS come from mkobj.js's own exports.
const BULLWHIP_OTYP = 82;              // mkobj.js OBJECTS[82]  "bullwhip"
const POT_INVISIBILITY_OTYP = 305;     // mkobj.js OBJECTS[305] "invisibility"
const POT_GAIN_LEVEL_OTYP = 309;       // mkobj.js OBJECTS[309] "gain level"
const WAN_MAKE_INVISIBLE_OTYP = 418;   // mkobj.js OBJECTS[418] "make invisible"
const WAN_SPEED_MONSTER_OTYP = 420;    // mkobj.js OBJECTS[420] "speed monster"
// C ref: objclass.h Is_container(o) == (otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS).
// mkobj.js has a private copy of this; mirror it off the same two exports so the
// bound can never drift from the table it indexes.
function is_container_otyp(otyp) {
    return otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS;
}

/* ------------------------------------------------------------------------ *
 * muse.c:2706 searches_for_item(mon, obj)
 *
 * "Would this monster walk over and pick this thing up because it could USE
 * it?"  Nothing here draws RNG, but it is the widest branch of monmove.c's
 * mon_would_take_item(): every non-mindless, non-animal monster consults it for
 * every object within five squares, and a TRUE answer re-points that monster's
 * movement goal at the object.  With this missing, a quantum mechanic standing
 * two squares from a potion of healing walks at the hero instead of at the
 * potion — which is exactly the seed0399 boundary-113 divergence.
 * ------------------------------------------------------------------------ */

// otyps this function switches on, resolved by the C constant NAME recorded in
// each mkobj.js OBJECTS row's `sym` field.  Looking them up by name (rather
// than pasting integers) is what keeps this table from silently rotting the way
// the hand-written constants just above it did.
const SFI_NAMES = [
    'WAN_DIGGING', 'WAN_POLYMORPH', 'WAN_STRIKING', 'WAN_UNDEAD_TURNING',
    'WAN_TELEPORTATION', 'WAN_CREATE_MONSTER',
    'POT_HEALING', 'POT_EXTRA_HEALING', 'POT_FULL_HEALING', 'POT_POLYMORPH',
    'POT_GAIN_LEVEL', 'POT_PARALYSIS', 'POT_SLEEPING', 'POT_ACID',
    'POT_CONFUSION', 'POT_BLINDNESS',
    'SCR_TELEPORTATION', 'SCR_CREATE_MONSTER', 'SCR_EARTH', 'SCR_FIRE',
    'AMULET_OF_LIFE_SAVING', 'AMULET_OF_REFLECTION', 'AMULET_OF_GUARDING',
    'PICK_AXE', 'UNICORN_HORN', 'FROST_HORN', 'FIRE_HORN', 'EXPENSIVE_CAMERA',
    'TIN_OPENER', 'BAG_OF_HOLDING', 'BAG_OF_TRICKS',
    'CORPSE', 'TIN', 'EGG', 'GLOB_OF_GREEN_SLIME',
];
// Resolved on first use, not at module-evaluation time: muse.js sits inside an
// import cycle, so OBJECTS may still be uninitialized while this module's body
// runs.
let SFI_CACHE = null;
function sfi() {
    if (!SFI_CACHE) {
        const out = {};
        for (const n of SFI_NAMES) out[n] = OBJECTS.findIndex((o) => o && o.sym === n);
        SFI_CACHE = Object.freeze(out);
    }
    return SFI_CACHE;
}

// C ref: objclass.h oc_dir values.
const RAY = 3;
// C ref: objclass.h oc_class values / weapon.h skill ids.
const WEAPON_CLASS = 2, AMULET_CLASS = 5, TOOL_CLASS = 6, FOOD_CLASS = 7,
    POTION_CLASS = 8, SCROLL_CLASS = 9, WAND_CLASS = 11;
const P_DAGGER = 1, P_KNIFE = 2;
// C ref: defsym.h MONSYM() indices (permonst.mcls).
const S_EYE = 5, S_NYMPH_MCLS = 14, S_UNICORN = 21, S_LIGHT = 25,
    S_VORTEX = 22, S_EEL = 57, S_GOLEM = 55;
// C ref: monflag.h MS_SILENT / MS_BUZZ.
const MS_SILENT = 0, MS_BUZZ = 10;
// C ref: monflag.h MZ_SMALL, monst.h W_ARMG.
const MZ_SMALL = 1, W_ARMG_BIT = 0x00000010;
// C ref: monst.h MR_STONE.
const MR_STONE_BIT = 0x80;

// C ref: mondata.h is_floater(ptr) — eyes/spheres and lights hover, so a wand
// of digging is useless to them.
function is_floater(ptr) { return ptr?.mcls === S_EYE || ptr?.mcls === S_LIGHT; }
// C ref: mondata.h needspick(ptr) == (mflags1 & M1_NEEDPICK).
function needspick(ptr) { return (mflags1_of(ptr) & M1_NEEDPICK) !== 0; }
// C ref: mondata.h is_unicorn(ptr) == (mlet == S_UNICORN && likes_gems(ptr)).
function is_unicorn(ptr) {
    return ptr?.mcls === S_UNICORN && (mflags2_of(ptr) & M2_JEWELS) !== 0;
}
// C ref: mondata.h is_golem/is_whirly/nonliving.  PM_MANES and the vortices are
// spelled by name/class exactly as monsters.h groups them.
function nonliving(ptr) {
    if (!ptr) return false;
    if ((mflags2_of(ptr) & M2_UNDEAD) !== 0) return true;
    if (ptr.name === 'manes') return true;
    return ptr.mcls === S_GOLEM || ptr.mcls === S_VORTEX; /* weirdnonliving */
}
// C ref: monst.h is_vampshifter(mon).
const PM_VAMPIRE_M = 226, PM_VAMPIRE_LEADER_M = 227, PM_VLAD_M = 228;
function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE_M || mon.cham === PM_VAMPIRE_LEADER_M
        || mon.cham === PM_VLAD_M;
}
// C ref: monst.h resists_ston(mon) — species bit only (see js/mon.js for why
// the acquired sources are not modeled).
function resists_ston(mon) {
    return ((mon?.data?.mresists ?? 0) & MR_STONE_BIT) !== 0;
}
// C ref: mondata.h touch_petrifies(ptr) / acidic(ptr) / slimeproof(ptr).
function touch_petrifies_pm(corpsenm) {
    const nm = monster_by_pmidx(corpsenm)?.name;
    return nm === 'cockatrice' || nm === 'chickatrice';
}
function acidic_pm(corpsenm) {
    return (mflags1_of(monster_by_pmidx(corpsenm)) & M1_ACID) !== 0;
}
function is_lizard_pm(corpsenm) {
    return monster_by_pmidx(corpsenm)?.name === 'lizard';
}
function slimeproof(ptr) {
    // flaming(ptr) / noncorporeal(ptr) reduce to the fire species and the
    // ghost/shade pair; green slime itself is the third disjunct.
    if (!ptr) return false;
    if (ptr.name === 'green slime') return true;
    if (ptr.name === 'ghost' || ptr.name === 'shade') return true;
    return ptr.name === 'fire elemental' || ptr.name === 'fire vortex'
        || ptr.name === 'flaming sphere' || ptr.name === 'salamander';
}
// C ref: mon.c can_blow(mtmp) — can it blow a horn?
function can_blow(mtmp) {
    const ptr = mtmp.data;
    const silent = (msound_of(ptr) === MS_SILENT) || (msound_of(ptr) === MS_BUZZ);
    const verysmall = (ptr?.msize | 0) < MZ_SMALL;
    const breathless = (mflags1_of(ptr) & M1_BREATHLESS) !== 0;
    const headless = (mflags1_of(ptr) & M1_NOHEAD) !== 0;
    if (silent && (breathless || verysmall || headless || ptr?.mcls === S_EEL))
        return false;
    return true;
}
// C ref: mon.c mwelded(otmp).
function mwelded_obj(o) {
    const W_WEP = 0x1;
    return !!o && ((o.owornmask || 0) & W_WEP) !== 0 && !!o.cursed;
}
// C ref: muse.c:2797 mcould_eat_tin(mon).
function mcould_eat_tin(mon) {
    if (is_animal(mon.data)) return false;
    const mwep = (mon.minvent || []).find((o) => ((o.owornmask || 0) & 0x1) !== 0) || null;
    const welded_wep = !!mwep && mwelded_obj(mwep);
    for (const obj of (mon.minvent || [])) {
        if (welded_wep && obj !== mwep) continue;
        if (obj.otyp === sfi().TIN_OPENER
            || (obj.oclass === WEAPON_CLASS
                && (OBJECTS[obj.otyp]?.oc_skill === P_DAGGER
                    || OBJECTS[obj.otyp]?.oc_skill === P_KNIFE)))
            return true;
    }
    return false;
}
// C ref: muse.c cures_stoning(mon, obj, tinok).
function cures_stoning(mon, obj, tinok) {
    if (obj.otyp === sfi().POT_ACID) return true;
    if (obj.otyp === sfi().GLOB_OF_GREEN_SLIME) return slimeproof(mon.data);
    if (obj.otyp !== sfi().CORPSE && (obj.otyp !== sfi().TIN || !tinok)) return false;
    if (obj.corpsenm == null || obj.corpsenm < 0) return false; /* NON_PM */
    return is_lizard_pm(obj.corpsenm) || acidic_pm(obj.corpsenm);
}
// C ref: objclass.h Is_mbag(o).
function is_mbag(obj) {
    return obj.otyp === sfi().BAG_OF_HOLDING || obj.otyp === sfi().BAG_OF_TRICKS;
}

export function searches_for_item(mon, obj) {
    const typ = obj.otyp;

    /* don't let monsters interact with protected items on the floor */
    if (obj.where === 'floor' && obj.ox === mon.mx && obj.oy === mon.my
        && onscary(obj.ox, obj.oy, mon))
        return false;

    if (is_animal(mon.data) || mindless(mon.data)
        || mon.data?.name === 'ghost') /* don't loot bones piles */
        return false;

    if (typ === WAN_MAKE_INVISIBLE_OTYP || typ === POT_INVISIBILITY_OTYP)
        return !mon.minvis && !mon.invis_blkd && !attacktype(mon.data, AT_GAZE);
    if (typ === WAN_SPEED_MONSTER_OTYP || typ === POT_SPEED)
        return (mon.mspeed | 0) !== MFAST;

    switch (obj.oclass) {
    case WAND_CLASS:
        if ((obj.spe | 0) <= 0) return false;
        if (typ === sfi().WAN_DIGGING) return !is_floater(mon.data);
        if (typ === sfi().WAN_POLYMORPH) return (mon.data?.difficulty | 0) < 6;
        if (OBJECTS[typ]?.dir === RAY || typ === sfi().WAN_STRIKING
            || typ === sfi().WAN_UNDEAD_TURNING
            || typ === sfi().WAN_TELEPORTATION || typ === sfi().WAN_CREATE_MONSTER)
            return true;
        break;
    case POTION_CLASS:
        if (typ === sfi().POT_HEALING || typ === sfi().POT_EXTRA_HEALING
            || typ === sfi().POT_FULL_HEALING || typ === sfi().POT_POLYMORPH
            || typ === sfi().POT_GAIN_LEVEL || typ === sfi().POT_PARALYSIS
            || typ === sfi().POT_SLEEPING || typ === sfi().POT_ACID
            || typ === sfi().POT_CONFUSION)
            return true;
        if (typ === sfi().POT_BLINDNESS && !attacktype(mon.data, AT_GAZE))
            return true;
        break;
    case SCROLL_CLASS:
        if (typ === sfi().SCR_TELEPORTATION || typ === sfi().SCR_CREATE_MONSTER
            || typ === sfi().SCR_EARTH || typ === sfi().SCR_FIRE)
            return true;
        break;
    case AMULET_CLASS:
        if (typ === sfi().AMULET_OF_LIFE_SAVING)
            return !(nonliving(mon.data) || is_vampshifter(mon));
        if (typ === sfi().AMULET_OF_REFLECTION || typ === sfi().AMULET_OF_GUARDING)
            return true;
        break;
    case TOOL_CLASS:
        if (typ === sfi().PICK_AXE) return needspick(mon.data);
        if (typ === sfi().UNICORN_HORN)
            return !obj.cursed && !is_unicorn(mon.data)
                && mon.data?.name !== 'ki-rin';
        if (typ === sfi().FROST_HORN || typ === sfi().FIRE_HORN)
            return (obj.spe | 0) > 0 && can_blow(mon);
        if (is_container_otyp(typ) && !(is_mbag(obj) && obj.cursed)
            && !obj.olocked)
            return true;
        if (typ === sfi().EXPENSIVE_CAMERA) return (obj.spe | 0) > 0;
        break;
    case FOOD_CLASS:
        if (typ === sfi().CORPSE)
            return (((mon.misc_worn_check ?? 0) & W_ARMG_BIT) !== 0
                    && obj.corpsenm != null && obj.corpsenm >= 0
                    && touch_petrifies_pm(obj.corpsenm))
                || (!resists_ston(mon) && cures_stoning(mon, obj, false));
        if (typ === sfi().TIN)
            return mcould_eat_tin(mon)
                && !resists_ston(mon) && cures_stoning(mon, obj, true);
        if (typ === sfi().EGG && obj.corpsenm != null && obj.corpsenm >= 0)
            return touch_petrifies_pm(obj.corpsenm);
        break;
    default:
        break;
    }

    return false;
}
