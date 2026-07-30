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
import { is_animal, mindless, nohands } from './monflags_data.js';
import { POT_SPEED, LARGE_BOX, BAG_OF_TRICKS } from './mkobj.js';
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

    if (give_msg && mon.mspeed !== oldspeed && mon.data?.mmove
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
            && is_container_otyp(obj.otyp) && obj.otyp !== BAG_OF_TRICKS_OTYP
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
// 417 not 349), which is the exact shadowed-constant failure the port keeps
// getting bitten by.  LARGE_BOX/BAG_OF_TRICKS come from mkobj.js's own exports.
const BULLWHIP_OTYP = 82;              // mkobj.js OBJECTS[82]  "bullwhip"
const POT_INVISIBILITY_OTYP = 305;     // mkobj.js OBJECTS[305] "invisibility"
const POT_GAIN_LEVEL_OTYP = 309;       // mkobj.js OBJECTS[309] "gain level"
const WAN_MAKE_INVISIBLE_OTYP = 417;   // mkobj.js OBJECTS[417] "make invisible"
const WAN_SPEED_MONSTER_OTYP = 419;    // mkobj.js OBJECTS[419] "speed monster"
// C ref: objclass.h Is_container(o) == (otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS).
// mkobj.js has a private copy of this; mirror it off the same two exports so the
// bound can never drift from the table it indexes.
function is_container_otyp(otyp) {
    return otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS;
}
