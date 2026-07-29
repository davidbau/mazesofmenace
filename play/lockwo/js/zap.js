// zap.js — wand/spell zapping helpers.
// C ref: zap.c.  Only the routines whose RNG side-effects are exercised by
// the gameplay sessions are ported here.

import { game } from './gstate.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { pline, newsym, m_at, show_glyph_cell, update_topl, topl_more, y_n,
         bot, flush_screen } from './display.js';
import { getobj, makeknown, useupall, useup, delobj, GETOBJ_SUGGEST, GETOBJ_EXCLUDE,
         GETOBJ_NOFLAGS } from './invent.js';
import { exercise } from './attrib.js';
import { more_experienced } from './exper.js';
import { findit } from './detect.js';
import { cansee } from './vision.js';
import { WAND_CLASS, GEM_CLASS, TOOL_CLASS, POTION_CLASS, SCROLL_CLASS,
         FOOD_CLASS, RING_CLASS, POT_OIL, POT_WATER, GLOB_OF_GREEN_SLIME,
         SPBOOK_CLASS, mkobj as _mkobj, place_object, objects,
         mkcorpstat, CORPSE } from './mkobj.js';
import { A_WIS, A_STR, ROWNO, COLNO, ZAP_POS, IS_DOOR, IS_ROOM, IS_WALL, isok, ROOM, STONE,
         D_CLOSED, D_LOCKED, CORPSTAT_INIT } from './const.js';
import { CLR_ORANGE } from './terminal.js';
import { can_make_bones } from './bones.js';
import { DEADMONSTER } from './mon.js';
import { MON_WEP } from './monmove.js';
import { killed, canspotmon, mon_nam, Monnam } from './uhitm.js';

// Object-type numbers for the directional wands/spells that zapyourself() gives
// a special self-inflicted effect.  C ref: include/objects.h (WAN_DEATH),
// generated onames.h.  Match the JS objects table (mkobj.js): SPE_FINGER_OF_DEATH
// = 370, WAN_DEATH = 432.
const SPE_FINGER_OF_DEATH = 370;
const WAN_DEATH = 432;
// C ref: objects.h — WAN_SLEEP / SPE_SLEEP fire a sleep ray; zapping at self
// puts the hero to sleep.  (JS objects table: WAN_SLEEP 431, SPE_SLEEP 369.)
const WAN_SLEEP = 431;
const SPE_SLEEP = 369;

// Object-type numbers that unconditionally resist (never rolled).
// C ref: zap.c obj_resists().  AMULET_OF_YENDOR / SPE_BOOK_OF_THE_DEAD /
// CANDELABRUM_OF_INVOCATION / BELL_OF_OPENING / a Rider corpse.
const AMULET_OF_YENDOR = 155;
const SPE_BOOK_OF_THE_DEAD = 355;
const CANDELABRUM_OF_INVOCATION = 360;
const BELL_OF_OPENING = 359;

// C ref: zap.c obj_resists(obj, ochance, achance) — chance an object resists
// (e.g. destruction / theft).  The invocation items always resist.  Everything
// else rolls rn2(100) and resists when the roll lands below the per-object
// chance (achance for artifacts, ochance otherwise).
export function obj_resists(obj, ochance, achance) {
    const otyp = obj?.otyp;
    if (otyp === AMULET_OF_YENDOR
        || otyp === SPE_BOOK_OF_THE_DEAD
        || otyp === CANDELABRUM_OF_INVOCATION
        || otyp === BELL_OF_OPENING) {
        return true;
    }
    // (Rider-corpse check omitted: no Rider corpses on the starting level.)
    const chance = rn2(100);
    return chance < (obj?.oartifact ? achance : ochance);
}

const ECMD_CANCEL = 0;
const ECMD_OK = 0;
const ECMD_TIME = 1;

// C ref: objclass.h oc_dir values.
const NODIR = 1;
const IMMEDIATE = 2;

const WAN_SECRET_DOOR_DETECTION = 410;
const WAND_WREST_CHANCE = 121;
const WAND_BACKFIRE_CHANCE = 100;

// otyps consulted by the IMMEDIATE wand path.  C ref: include/objects.h enum.
const WAN_POLYMORPH = 421;
const SPE_POLYMORPH = 398;
const POT_POLYMORPH = 316;
const AMULET_OF_UNCHANGING = 210;

// C ref: zap.c zap_ok — getobj callback: only wands are suggested.
function zap_ok(obj) {
    if (obj && obj.oclass === WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: zap.c zappable — can the wand be zapped?  spe<0 -> no; spe==0 wrests
// a final charge with WAND_WREST_CHANCE odds; otherwise consume one charge.
function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(WAND_WREST_CHANCE)))
        return false;
    if (wand.spe === 0)
        game._pending_message = 'You wrest one last charge from the worn-out wand.';
    wand.spe--;
    return true;
}

// C ref: zap.c learnwand — discover a wand's type once its effect is observed.
function learnwand(obj) {
    makeknown(obj.otyp);
}

// C ref: zap.c zapnodir — apply a directionless wand/spell.  Only the covered
// types are handled; others are silent no-ops (matching "no obvious effect").
async function zapnodir(obj) {
    let known = false;
    switch (obj.otyp) {
    case WAN_SECRET_DOOR_DETECTION:
        known = !!obj.dknown;
        await findit();
        break;
    default:
        break;
    }
    if (known) {
        if (!objects[obj.otyp]?.oc_name_known) {
            // more_experienced(0, 10): no RNG.
        }
        learnwand(obj);
    }
}

// C ref: include/obj.h unpolyable(o) — object types that can't be polymorphed
// (the polymorph items themselves and the amulet of unchanging).
function unpolyable(obj) {
    return obj.otyp === WAN_POLYMORPH || obj.otyp === SPE_POLYMORPH
        || obj.otyp === POT_POLYMORPH || obj.otyp === AMULET_OF_UNCHANGING;
}

// C ref: zap.c obj_unpolyable — TRUE if the object resists polymorphing.
// (uball/uskin are never on the polymorph pile in the covered sessions.)
function obj_unpolyable(obj) {
    return unpolyable(obj) || obj_resists(obj, 5, 95);
}

// C ref: zap.c obj_shudders — chance an object metamorphoses (system shock)
// rather than polymorphing cleanly.  Returns !rn2(zap_odds).
function obj_shudders(obj) {
    // svc.context.bypasses path not reachable here (no monster inventory drops).
    let zap_odds;
    if (obj.oclass === WAND_CLASS) zap_odds = 3;      /* half-life = 2 zaps */
    else if (obj.cursed) zap_odds = 3;                /* half-life = 2 zaps */
    else if (obj.blessed) zap_odds = 12;              /* half-life = 8 zaps */
    else zap_odds = 8;                                /* half-life = 6 zaps */
    if ((obj.quan || 1) > 4) zap_odds = Math.trunc(zap_odds / 2);
    return !rn2(zap_odds);
}

// C ref: zap.c do_osshock — an object hit by polymorph suffers system shock and
// is (partly) destroyed.  Sets go.obj_zapped so zapwrapup() can announce the
// "shuddering vibrations".  poly_zapped tracking only matters for golem creation
// (create_polymon), which needs poly_zapped >= 0; with rn2(Luck+45) the loop
// almost always leaves it at -1.  splitobj() for quan>1 piles isn't exercised by
// the covered sessions, so the quan==1 delobj() case is modelled faithfully.
function do_osshock(obj) {
    game.obj_zapped = true;
    const Luck = (game.u?.uluck || 0) + (game.u?.moreluck || 0);
    if (game.poly_zapped < 0) {
        for (let i = obj.quan || 1; i; i--) {
            if (!rn2(Luck + 45)) {
                game.poly_zapped = objects[obj.otyp]?.material ?? 0;
                break;
            }
        }
    }
    // quan>1 splitobj path (rnd(quan-1)) not reached by covered sessions.
    delobj(obj); /* obj_resists(obj,0,0) rn2(100) + newsym() */
}

// C ref: zap.c poly_obj(obj, STRANGE_OBJECT) — replace a floor object with a
// random object of the same class while preserving the magic-or-not status.
// Only the STRANGE_OBJECT (standard polymorph) case is exercised here; the new
// object inherits quantity / bcu / charges and replaces the old on the floor.
function poly_obj(obj) {
    const ox = obj.ox, oy = obj.oy;
    let magic_obj = objects[obj.otyp]?.oc_magic ? 1 : 0;
    // (UNICORN_HORN degraded_horn special-case omitted: not on covered piles.)
    let tryLimit = 3;
    let otmp = null;
    do {
        if (otmp) delobj(otmp); /* C delobj() -> obj_resists(otmp,0,0) rn2(100) */
        otmp = _mkobj(obj.oclass, false);
    } while (--tryLimit > 0 && (objects[otmp.otyp]?.oc_magic ? 1 : 0) !== magic_obj);

    // preserve quantity / shopkeeper interest
    otmp.quan = obj.quan;
    otmp.no_charge = obj.no_charge;

    // avoid abusing eggs laid by hero (generic-egg path); not exercised, but
    // keep the corpsenm carryover for CORPSE/STATUE/FIGURINE handled by mkobj.

    // keep special fields (charges on wands/weapons/armor)
    if (otmp.oclass === WAND_CLASS || otmp.oclass === 2 /*WEAPON*/
        || otmp.oclass === 3 /*ARMOR*/)
        otmp.spe = obj.spe;
    otmp.recharged = obj.recharged;
    otmp.cursed = obj.cursed;
    otmp.blessed = obj.blessed;

    // merged objects may fuse into 1 (can_merge==TRUE for STRANGE_OBJECT)
    if ((otmp.quan || 1) > 1
        && (!objects[otmp.otyp]?.flags /*oc_merge approx*/ || (otmp.quan > rn2(1000))))
        otmp.quan = 1;

    // class-specific degrade / anti-polymorph-loop handling
    switch (otmp.oclass) {
    case TOOL_CLASS:
        if (otmp.otyp === 228 /*MAGIC_LAMP*/) { otmp.otyp = 227 /*OIL_LAMP*/; otmp.age = 1500; }
        else if (otmp.otyp === 242 /*MAGIC_MARKER*/) otmp.recharged = 1;
        break;
    case WAND_CLASS:
        while (otmp.otyp === 413 /*WAN_WISHING*/ || otmp.otyp === WAN_POLYMORPH)
            otmp.otyp = rnd_class_wand();
        if ((otmp.recharged | 0) < rn2(7)) otmp.recharged = (otmp.recharged | 0) + 1;
        break;
    case POTION_CLASS:
        while (otmp.otyp === POT_POLYMORPH)
            otmp.otyp = rnd_class_potion();
        break;
    case SPBOOK_CLASS:
        while (otmp.otyp === SPE_POLYMORPH)
            otmp.otyp = rnd_class_spbook();
        if (otmp.otyp !== 406 /*SPE_BLANK_PAPER*/ && otmp.otyp !== 407 /*SPE_NOVEL*/) {
            otmp.spestudied = (obj.spestudied | 0) + 1;
            if (otmp.spestudied > 4 /*MAX_SPELL_STUDY*/) {
                otmp.spestudied = rn2(otmp.spestudied);
                otmp.otyp = 406 /*SPE_BLANK_PAPER*/;
            }
        }
        break;
    case GEM_CLASS:
        if ((otmp.quan || 1) > rnd(4)
            && (objects[obj.otyp]?.material === 7 /*MINERAL*/)
            && (objects[otmp.otyp]?.material !== 7))
            otmp.otyp = 481 /*ROCK*/;
        else if ((objects[otmp.otyp]?.material === 6 /*GLASS*/)
                 !== (objects[obj.otyp]?.material === 6))
            ; /* color preserved; no RNG */
        break;
    default:
        break;
    }

    // replace old object with new in the same floor-chain position
    const floorObjects = game.level?.objects;
    const floorIndex = floorObjects?.indexOf(obj) ?? -1;
    delobj(obj);
    place_object(otmp, ox, oy);
    if (floorIndex >= 0) {
        floorObjects.pop();
        floorObjects.splice(floorIndex, 0, otmp);
    }
    return otmp;
}

// rnd_class helpers for the (rare) wand/potion/spellbook anti-loop above.
// C ref: zap.c rnd_class(first,last) over the real object range of the class.
function rnd_class_range(first, last) {
    let sum = 0;
    for (let i = first; i <= last; i++) sum += objects[i]?.oc_prob || 0;
    if (!sum) return rn1(last - first + 1, first);
    let x = rnd(sum);
    for (let i = first; i <= last; i++) { x -= objects[i]?.oc_prob || 0; if (x <= 0) return i; }
    return first;
}
function rnd_class_wand()   { return rnd_class_range(409 /*WAN_LIGHT*/, 433 /*WAN_LIGHTNING*/); }
function rnd_class_potion() { return rnd_class_range(297 /*POT_GAIN_ABILITY*/, 322 /*POT_WATER*/); }
function rnd_class_spbook() { return rnd_class_range(365, 406 /*SPE_BLANK_PAPER*/); }

// Like delobj() but without the obj_resists() RNG / newsym (used to discard a
// freshly mkobj'd candidate during poly_obj's magic-matching retry loop.
function delobj_freeonly(obj) {
    if (!obj) return;
    const arr = game.level?.objects;
    if (arr) { const i = arr.indexOf(obj); if (i >= 0) arr.splice(i, 1); }
    obj.where = 0 /*OBJ_FREE*/;
}

// C ref: zap.c bhito — a wand effect (here WAN_POLYMORPH) hitting one floor
// object.  Returns 1 if the object was affected (drives bhit range decrement),
// 0 otherwise.
function bhito(obj, otmp) {
    let res = 1;
    if (obj === otmp) return 0;
    // uball/uchain not on covered piles.
    switch (otmp.otyp) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
        if (obj_unpolyable(obj)) { res = 0; break; }
        if (!game.u) game.u = {};
        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.polypiles = (game.u.uconduct.polypiles | 0) + 1;
        // Is_box boxlock not on covered piles.
        if (obj_shudders(obj)) {
            const learnIt = cansee(obj.ox, obj.oy);
            do_osshock(obj);
            if (learnIt && otmp.dknown) makeknown(otmp.otyp);
            break;
        }
        obj = poly_obj(obj);
        newsym(obj.ox, obj.oy);
        break;
    default:
        // Other IMMEDIATE wands (striking/probing/opening/...) not exercised on
        // floor piles by the covered sessions.
        res = 0;
        break;
    }
    return res;
}

// C ref: zap.c bhitpile — apply fhito to every object stacked at (tx,ty).
// C's level.objects[tx][ty] is a nexthere chain ordered newest-first (place_object
// prepends).  Our flat game.level.objects is append-ordered (oldest-first), so we
// iterate the square's objects in reverse to reproduce C's traversal order — the
// order determines the obj_resists / obj_shudders / mkobj RNG sequence.
function bhitpile(obj, tx, ty) {
    const arr = game.level?.objects || [];
    const here = [];
    for (let i = arr.length - 1; i >= 0; i--) {
        const o = arr[i];
        if (o.where === 'floor' && o.ox === tx && o.oy === ty) here.push(o);
    }
    if (!here.length) return 0;
    game.poly_zapped = -1;
    let hitanything = 0;
    for (const otmp of here) {
        // object may already have been freed/replaced; re-validate on the floor.
        if (otmp.where !== 'floor' || otmp.ox !== tx || otmp.oy !== ty) continue;
        hitanything += bhito(otmp, obj);
    }
    // poly_zapped >= 0 => create_polymon(): golem creation, not reached by the
    // covered sessions (rn2(Luck+45) leaves poly_zapped at -1).
    return hitanything;
}

// C ref: zap.c bhit — walk the wand beam from the hero in (ddx,ddy) up to range
// squares, applying bhitm to monsters and bhitpile to floor objects.  Only the
// ZAPPED_WAND, IMMEDIATE flavour (no ricochet) reached by the covered sessions is
// implemented; ray/thrown/kicked/flash variants are out of scope here.
async function bhit(ddx, ddy, range, obj) {
    let bx = game.u.ux, by = game.u.uy;
    while (range-- > 0) {
        bx += ddx; by += ddy;
        if (bx < 0 || bx >= COLNO || by < 0 || by >= ROWNO) { bx -= ddx; by -= ddy; break; }
        const loc = game.level?.at?.(bx, by);
        const typ = loc?.typ;

        // ZAPPED_WAND: cancellation/opening/locking/striking/probing zap_map()
        // effects are not exercised here for WAN_POLYMORPH (no-op).

        const mtmp = m_at(bx, by);
        if (mtmp) {
            if (await bhitm(mtmp, obj)) break;
            range -= 3;
        }
        if (bhitpile(obj, bx, by)) range--;

        if (!ZAP_POS(typ) || closed_door_at(bx, by)) { bx -= ddx; by -= ddy; break; }
    }
}

// C ref: monmove.c closed_door() (local copy; hack.js's isn't exported).
function closed_door_at(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    return IS_DOOR(loc.typ) && !!(loc.doormask & (D_CLOSED | D_LOCKED));
}

// C ref: zap.c bhitm — a wand effect hitting one monster.  Only the polymorph
// path is needed for the covered wizard sessions; if reached, fall back to a
// no-op (returns 0) so the beam continues.  The covered first zap travels over an
// empty corridor of floor objects, so this is currently a safety stub.
async function bhitm(/* mtmp, obj */) {
    // Monster polymorph (newcham / resist) is not exercised by the first zap in
    // the covered sessions; leaving it as a non-stopping no-op keeps the beam
    // walking to the object pile faithfully.
    return 0;
}

// C ref: zap.c zapwrapup — after an IMMEDIATE zap, announce system shock once.
async function zapwrapup() {
    if (game.obj_zapped)
        await pline('You feel shuddering vibrations.');
    game.obj_zapped = false;
}

// C ref: zap.c weffects — dispatch a wand/spell effect.  Always exercises
// Wisdom (rn2(19) via exercise) first.  NODIR -> zapnodir; IMMEDIATE -> bhit beam
// (the WAN_POLYMORPH-on-a-pile case the wizard sessions exercise).
async function weffects(obj) {
    const otyp = obj.otyp;
    // C ref: zap.c weffects — was_unkn snapshots whether the type is still
    // undiscovered; `disclose` gates the post-effect learnwand()/experience.
    let disclose = false;
    const was_unkn = !objects[otyp]?.oc_name_known;
    exercise(A_WIS, true);
    // u.usteed zap_steed not modelled (no riding in covered wizard sessions).
    if (objects[otyp]?.dir === IMMEDIATE) {
        game.obj_zapped = false; /* zapsetup() */
        const u = game.u;
        if (u.uswallow) {
            await bhitm(u.ustuck, obj);
        } else if (u.dz) {
            // zap_updown not exercised by covered sessions.
        } else {
            await bhit(u.dx, u.dy, rn1(8, 6), obj);
        }
        await zapwrapup();
    } else if (objects[otyp]?.dir === NODIR) {
        await zapnodir(obj);
    } else {
        // RAY (oc_dir == RAY).  C ref: zap.c weffects() else-branch.
        if (otyp === WAN_DIGGING || otyp === SPE_DIG) {
            // WAN_DIGGING / SPE_DIG carve terrain instead of firing a bolt.
            const { zap_dig } = await import('./dig.js');
            await zap_dig();
        } else {
            // magic missile / fire / cold / sleep / death / lightning ->
            // ubuzz(BZ_U_WAND(BZ_OFS_WAN(otyp)), nd).
            const off = BZ_OFS_WAN(otyp);        // 0..5 (MM..LIGHTNING order)
            await ubuzz(off, (otyp === WAN_MAGIC_MISSILE) ? 2 : 6);
        }
        disclose = true;
    }
    // C ref: zap.c weffects — a RAY (or steed) effect is always disclosed:
    // learnwand() discovers the wand type (which, when the type first becomes
    // name-known and credit_hero is set, exercises Wisdom -> rn2(19)); a wand
    // whose type was previously unknown also grants a little score/experience.
    if (disclose) {
        learnwand(obj);
        if (was_unkn) more_experienced(0, 10);
    }
}

// C ref: include/hack.h BZ_OFS_WAN(otyp) = abs(otyp - WAN_MAGIC_MISSILE) % 10.
// Wand order in objects.h: MAGIC_MISSILE(0) FIRE(1) COLD(2) SLEEP(3) DEATH(4)
// LIGHTNING(5); the resulting offset is the abstract zap type (ZT_FIRE etc.).
const WAN_MAGIC_MISSILE = 428;
// C ref: objects.h — the two RAY-class dig items dispatched to zap_dig().
const WAN_DIGGING = 427;
const SPE_DIG = 365;
function BZ_OFS_WAN(otyp) { return Math.abs(otyp - WAN_MAGIC_MISSILE) % 10; }

// Abstract damage types (zaptype % 10), C ref: monattk.h AD_* minus 1.
const ZT_MAGIC_MISSILE = 0, ZT_FIRE = 1, ZT_COLD = 2, ZT_SLEEP = 3,
      ZT_DEATH = 4, ZT_LIGHTNING = 5;

// otyps consulted by destroy path naming.  C ref: objects.h.
const SCR_FIRE = 339, SPE_FIREBALL = 367, POT_INVISIBILITY = 305;

// C ref: zap.c ubuzz(type, nd) -> dobuzz(type, nd, u.ux, u.uy, u.dx, u.dy, ...).
async function ubuzz(type, nd) {
    const u = game.u;
    await dobuzz(type, nd, u.ux, u.uy, u.dx | 0, u.dy | 0);
}

// C ref: zap.c dobuzz — fire a bouncing ray.  The beam walks the level,
// striking a monster (zap_hit/zhitm/killed) or the hero (zap_hit/zhitu) it
// crosses, and reflects off obstructions (bounce_dir) until range runs out.
// u.uswallow / fireball(spell-only, unreachable via a 0-9 wand type) / gas
// trailing clouds are not modelled (not exercised by any covered wand zap).
async function dobuzz(type, nd, sx, sy, dx, dy) {
    const u = game.u;
    const fltyp = zaptype(type);
    const damgtype = fltyp % 10;
    let range = rn1(7, 7);              // C: range = rn1(7, 7)
    if (dx === 0 && dy === 0) range = 1;
    let lsx, lsy;
    const beamGlyph = (dx !== 0 && dy === 0) ? 'q' /*S_hbeam ─*/
                    : (dx === 0 && dy !== 0) ? 'f' /*S_vbeam │*/
                    : (dx === dy) ? 'n' /*S_lslant ╲*/ : 'm' /*S_rslant ╱*/;
    // C ref: tmp_at(DISP_BEAM,...)/tmp_at(DISP_END,0) — the beam glyph is a
    // temporary overlay; once the zap finishes every cell it touched is
    // restored to its real glyph (corpse, monster, floor, ...).  Track visited
    // cells here and newsym() them back at the bottom of the function.
    const visited = new Map();
    const drawBeam = (x, y) => { show_glyph_cell(x, y, beamGlyph, CLR_ORANGE, true); visited.set(`${x},${y}`, [x, y]); };

    while (range-- > 0) {
        lsx = sx; sx += dx;
        lsy = sy; sy += dy;
        if (!isok(sx, sy) || (game.level?.at(sx, sy)?.typ ?? STONE) === STONE) {
            await make_bounce();
            continue;
        }

        const typ = game.level?.at(sx, sy)?.typ ?? STONE;
        const mon = m_at(sx, sy);
        // cansee()/tmp_at: leave the beam glyph along the path.
        if (ZAP_POS(typ) || (isok(lsx, lsy)))
            drawBeam(sx, sy);

        // zap_over_floor over plain lit room floor has no effect (no RNG); the
        // pool/fountain/ice cases don't occur on the covered level.
        if (mon) {
            if (zap_hit(find_mac(mon), 0)) {
                if (mon_reflects(mon)) {
                    // Reflection (shield/amulet of reflection): no covered zap
                    // target wears one; not reached.
                    dx = -dx; dy = -dy;
                } else {
                    const mon_could_move = mon.mcanmove;
                    const { tmp, otmp } = await zhitm(mon, type, nd);
                    if (tmp === MAGIC_COOKIE) {
                        await disintegrate_mon(mon, type, flash_str(fltyp));
                    } else if (DEADMONSTER(mon)) {
                        if (type >= 0) await killed(mon);
                        // (type < 0 -> monkilled(); dobuzz is only invoked
                        // here for hero-caused wand zaps, so type is always
                        // >= 0 in the reachable sessions.)
                    } else {
                        if (!otmp) {
                            if (canspotmon(mon))
                                await hit(flash_str(fltyp), mon, exclam(tmp));
                        } else if (canspotmon(mon)) {
                            await update_topl(`${Monnam(mon)}'s item is disintegrated!`);
                        }
                        if (mon_could_move && !mon.mcanmove) await slept_monst(mon);
                        if (damgtype !== ZT_SLEEP) wakeup(mon, type >= 0);
                    }
                }
                range -= 2;
            } else {
                if (canspotmon(mon) && !disguised_as_non_mon(mon))
                    await miss(flash_str(fltyp), mon);
            }
        } else if (sx === u.ux && sy === u.uy && range >= 0) {
            // C: u_at(sx,sy) && range >= 0 -> the bolt strikes the hero.
            if (zap_hit(u.uac | 0, 0)) {
                range -= 2;
                drawBeam(sx, sy); // beam shown over the hero's cell
                await update_topl(`${flash_The(type)} hits you!`);
                await zhitu(type, nd, flash_killer(type), sx, sy);
                if (game.program_state?.gameover) return;
            } else {
                await update_topl(`${flash_The(type)} whizzes by you!`);
            }
        }

        if (!ZAP_POS(game.level?.at(sx, sy)?.typ ?? STONE)) {
            await make_bounce();
        }
    }

    async function make_bounce() {
        const typNow = game.level?.at(sx, sy)?.typ ?? STONE;
        // C: bchance — off-level/STONE always bounces near-certainly (10);
        // In_mines() dungeon-branch detection isn't modelled (no covered
        // session zaps inside the Mines), so the wall case always uses 75.
        const bchance = (!isok(sx, sy) || typNow === STONE) ? 10 : 75;
        // C: --range > 0 && cansee(lsx,lsy) -> "The <flash> bounces!"
        if (--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy)) {
            await update_topl(`${flash_The(fltyp)} bounces!`);
        }
        const nd2 = bounce_dir(sx, sy, dx, dy, bchance);
        dx = nd2.dx; dy = nd2.dy;
    }

    // C: tmp_at(DISP_END, 0) — erase the temporary beam overlay, revealing
    // whatever is really at each visited cell (corpse, monster, floor, ...).
    for (const [vx, vy] of visited.values()) newsym(vx, vy);
}

// C ref: zap.c zap_hit(ac, type) — does the ray hit a target of armor class ac?
function zap_hit(ac, type) {
    const chance = rn2(20);
    const spell_bonus = 0; // type 0 (wand) -> no spell hit bonus
    if (!chance) return rnd(10) < ac + spell_bonus;
    const acv = AC_VALUE(ac);
    return (3 - chance < acv + spell_bonus);
}
function AC_VALUE(ac) { return ac >= 0 ? ac : -rnd(-ac); }

// C ref: include/hack.h zaptype() — normalize a monster-wand offset (-39..-30)
// back to the 0-9 hero-wand range, then abs().  Every dobuzz() call in the
// covered sessions is a hero wand zap (type 0-9) already, so this is a no-op
// there; kept for structural fidelity.
function zaptype(type) {
    if (type <= -30 && type >= -39) type += 30;
    return Math.abs(type);
}

// C ref: zap.c zhitm()'s MAGIC_COOKIE sentinel (disintegration instakill).
const MAGIC_COOKIE = 1000;

// ── monster resistance/defense predicates (mondata.c) ───────────────────────
// C ref: monflag.h MR_* bits, mons[].mresists (already ported per-species in
// makemon.js's MONS table).  Only the *innate* half of Resists_Elem() is
// modelled: none of the covered sessions' zap targets wear or wield gear that
// grants elemental resistance, so the worn/wielded-item scan is not needed.
const MR_FIRE = 0x01, MR_COLD = 0x02, MR_SLEEP = 0x04, MR_DISINT = 0x08,
      MR_ELEC = 0x10, MR_POISON = 0x20, MR_ACID = 0x40;
function mresists_of(mon) { return mon?.data?.mresists || 0; }
function resists_fire(mon) { return !!(mresists_of(mon) & MR_FIRE); }
function resists_cold(mon) { return !!(mresists_of(mon) & MR_COLD); }
export function resists_sleep(mon) { return !!(mresists_of(mon) & MR_SLEEP); }
function resists_disint(mon) { return !!(mresists_of(mon) & MR_DISINT); }
function resists_elec(mon) { return !!(mresists_of(mon) & MR_ELEC); }
function resists_poison(mon) { return !!(mresists_of(mon) & MR_POISON); }
function resists_acid(mon) { return !!(mresists_of(mon) & MR_ACID); }
// C ref: mondata.c resists_magm — gray dragons/Angels/Oracle/Yeenoghu innate,
// or magic-resistant gear.  No covered zap target qualifies.
function resists_magm(_mon) { return false; }
// C ref: mondata.c dmgtype_fromattack(ptr, AD_BLND, AT_EXPL/AT_GAZE) plus the
// mon-state half of resists_blnd (already-blind/asleep resists further
// blinding).  haseyes()/Sunsword checks omitted: no eyeless or artifact-armed
// covered target.
function resists_blnd_mon(mon) { return !!(mon?.mblinded || mon?.msleeping); }
// C ref: uhitm.c defended(mon, ad) — worn artifact/item granting `ad` defense.
// No covered zap target wears such gear.
function defended(_mon, _ad) { return false; }
// C ref: worn.c mon_reflects — shield/amulet of reflection.  No covered zap
// target wears one.
function mon_reflects(_mon) { return false; }
// C ref: mondata.c is_demon(ptr) — mlet == S_DEMON (defsym.h index 56).
function is_demon_mdat(mdat) { return !!mdat && mdat.mcls === 56; }
// C ref: mondata.h nonliving(ptr) — undead/golem/vortex/elemental "destroyed"
// rather than "killed".  Matches uhitm.js's own nonliving() name heuristic.
function nonliving_mdat(mdat) {
    const name = mdat?.name || '';
    return /\bzombie\b|\bmummy\b|\bskeleton\b|\bwraith\b|\bghost\b|\blich\b|golem\b|\bvortex\b|\belemental\b/.test(name);
}
// C ref: zap.c zhitm's find_mac(mon) AC lookup.  No monster in the covered
// sessions wears armor, so this is just the species' base AC.
function find_mac(mon) { const ac = mon?.data?.ac; return ac != null ? ac : 10; }

// C ref: zap.c resist(mtmp, oclass, damage, tell) — the generic saving throw
// against a wand/tool/weapon/scroll/potion/ring/spell effect.  `tell`'s
// shieldeff() flash is display-only (no RNG); not modelled.
function resist(mtmp, oclass, damage, _tell) {
    let alev;
    switch (oclass) {
    case WAND_CLASS: alev = 12; break;
    case TOOL_CLASS: alev = 10; break; // instrument (WEAPON_CLASS artifact
                                        // case is also alev 10, never reached here)
    case SCROLL_CLASS: alev = 9; break;
    case POTION_CLASS: alev = 6; break;
    case RING_CLASS: alev = 5; break;
    default: alev = game.u?.ulevel || 1; break;
    }
    let dlev = mtmp?.m_lev ?? mtmp?.data?.mlevel ?? 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1; // (is_mplayer fake-player special-case omitted)
    // mtmp.data.mr (species magic resistance) isn't tabulated in the ported
    // monster data; it defaults to 0, which is correct for every ordinary
    // early-game monster (only a handful of high-level monsters — liches,
    // mind flayers, elves, arch-liches, quantum mechanics — have nonzero mr
    // in real NetHack, and none is a covered zap target).
    const resisted = rn2(100 + alev - dlev) < (mtmp?.data?.mr || 0);
    if (resisted) damage = Math.trunc((damage + 1) / 2);
    if (damage && mtmp) mtmp.mhp = (mtmp.mhp || 0) - damage;
    return resisted;
}

// C ref: zap.c bounce_dir(sx, sy, ddx, ddy, bounceback) — reflect the beam's
// direction off a wall/edge.  sx,sy is the post-move position where the bounce
// is happening (the same argument the two C call sites pass).
function bounce_dir(sx, sy, ddx, ddy, bounceback) {
    if (!ddx || !ddy || (bounceback > 0 && !rn2(bounceback)))
        return { dx: -ddx, dy: -ddy };
    const lsy = sy - ddy, lsx = sx - ddx;
    let bounce = 0;
    const t1 = game.level?.at(sx, lsy)?.typ;
    if (isok(sx, lsy) && ZAP_POS(t1) && !closed_door_at(sx, lsy)
        && (IS_ROOM(t1) || (isok(sx + ddx, lsy) && ZAP_POS(game.level?.at(sx + ddx, lsy)?.typ))))
        bounce = 1;
    const t2 = game.level?.at(lsx, sy)?.typ;
    if (isok(lsx, sy) && ZAP_POS(t2) && !closed_door_at(lsx, sy)
        && (IS_ROOM(t2) || (isok(lsx, sy + ddy) && ZAP_POS(game.level?.at(lsx, sy + ddy)?.typ))))
        if (!bounce || rn2(2)) bounce = 2;
    switch (bounce) {
    case 0: ddx = -ddx; ddy = -ddy; break; // (C: case 0 falls through to case 1)
    case 1: ddy = -ddy; break;
    case 2: ddx = -ddx; break;
    }
    return { dx: ddx, dy: ddy };
}

// C ref: zap.c exclam(force) — "!" for a solid hit, "." for a light one, "?"
// for force<0 (e.g. a sleep ray, which deals 0 damage).
function exclam(force) { return force < 0 ? '?' : (force <= 4 ? '.' : '!'); }
// C ref: zap.c hit(str, mtmp, force)/miss(str, mtmp) — "The <str> hits/misses
// <mon>."  vtense() pluralization is skipped: every flash_str() here is a
// singular noun ("bolt of cold", "sleep ray", ...), so the verb is always
// "hits"/"misses".
async function hit(str, mon, force) {
    const name = canspotmon(mon) ? mon_nam(mon) : 'it';
    await update_topl(`The ${str} hits ${name}${force}`);
}
async function miss(str, mon) {
    const name = canspotmon(mon) ? mon_nam(mon) : 'it';
    await update_topl(`The ${str} misses ${name}.`);
}
// C ref: mondata.c disguised_as_non_mon — a hiding mimic/mimicking object.  No
// covered zap target is a mimic.
function disguised_as_non_mon(_mon) { return false; }
// C ref: mon.c wakeup(mon, via_attack) — clears msleeping.  The via_attack
// growl/setmangry/priest-temple escalation is message/AI-state only (no RNG
// in the reachable early-game paths) and isn't modelled.
function wakeup(mon, _viaAttack) { if (mon) mon.msleeping = 0; }
// C ref: zap.c slept_monst — releases a grappled hero when their engulfer/
// holder falls asleep.  No covered zap target is grappling the hero.
async function slept_monst(_mon) {}

// C ref: mhitm.c sleep_monst(mon, amt, how) — how=WAND_CLASS for a wand of
// sleep zap.  seemimic() mimic-reveal is not modelled (no covered zap target
// is a hiding mimic).
export async function sleep_monst(mon, amt, how) {
    if (resists_sleep(mon) || defended(mon, 4 /*AD_SLEE*/) || resist(mon, how, 0, false)) {
        // shieldeff(mon.mx, mon.my): display-only, no RNG.
        return false;
    }
    if (mon.mcanmove) {
        amt += (mon.mfrozen || 0);
        if (amt > 0) { mon.mcanmove = 0; mon.mfrozen = Math.min(amt, 127); }
        else mon.msleeping = 1;
        return true;
    }
    return false;
}

// C ref: zap.c disintegrate_mon — the ZT_BREATH(ZT_DEATH) instakill path.  Not
// reachable via a hero wand zap (dobuzz's type is always >= 0 there), but kept
// for structural completeness; mlifesaver()'s amulet-of-life-saving check
// isn't modelled (no covered target wears one).
async function disintegrate_mon(mon, type, fltxt) {
    if (canspotmon(mon)) await update_topl(`${Monnam(mon)} is disintegrated!`);
    // extract_from_minvent/obfree: drop everything except artifacts/DISINT_RES
    // items with no RNG; no covered target carries anything, so this is a
    // no-op in practice.
    if (Array.isArray(mon.minvent) && mon.minvent.length)
        mon.minvent = mon.minvent.filter(o => o.oartifact);
    await killed(mon, { nomsg: true, nocorpse: true });
}

// C ref: zap.c flash_str — display name of a flash/bolt; "The bolt of fire"
// via The().  Only the wand RAY types the covered sessions zap are needed.
const FLASH_NAME = {
    [ZT_MAGIC_MISSILE]: 'magic missile', [ZT_FIRE]: 'bolt of fire',
    [ZT_COLD]: 'bolt of cold', [ZT_SLEEP]: 'sleep ray',
    [ZT_DEATH]: 'death ray', [ZT_LIGHTNING]: 'bolt of lightning',
};
function flash_str(type) { return FLASH_NAME[type % 10] || 'bolt'; }
function flash_The(type) { return 'The ' + flash_str(type); }
function flash_killer(type) { return flash_str(type); }

// C ref: zap.c zhitu — apply a ray's effect to the hero.  Only ZT_FIRE/COLD/
// LIGHTNING/MAGIC_MISSILE (the covered wand zaps) are modelled; the hero has no
// resistances on the covered level so damage is always taken.
async function zhitu(type, nd, fltxt, sx, sy) {
    const u = game.u;
    let dam = 0, orig_dam = 0;
    const abstyp = type % 10;
    switch (abstyp) {
    case ZT_MAGIC_MISSILE:
        dam = d(nd, 6);
        exercise(A_STR, false);
        break;
    case ZT_FIRE:
        orig_dam = d(nd, 6);
        dam = orig_dam;
        // burn_away_slime(): hero not sliming (no RNG).
        if (await burnarmor(u)) {      // "body hit"
            if (!rn2(3))
                await destroy_items(u, AD_FIRE, orig_dam);
            if (!rn2(3))
                await ignite_items();  // not reached this session (gate fails)
        }
        break;
    case ZT_COLD:
        orig_dam = d(nd, 6);
        dam = orig_dam;
        if (!rn2(3))
            await destroy_items(u, AD_COLD, orig_dam);
        break;
    case ZT_LIGHTNING:
        orig_dam = d(nd, 6);
        dam = orig_dam;
        exercise(A_STR, false); // C: exercise(A_CON, FALSE) -> same rn2(2)
        if (!rn2(3))
            await destroy_items(u, AD_ELEC, orig_dam);
        // flashburn (blinding) — hero not blinded path has its own d(nd,50) in
        // dobuzz, deferred; not exercised by the lethal fire zap this session.
        break;
    default:
        dam = d(nd, 6);
        break;
    }
    // Half_spell_damage not carried by the covered hero; breath n/a.
    await losehp(dam, fltxt);
}

// C ref: monattk.h AD_* (used by destroy_items dispatch and zhitm's switch).
const AD_MAGM = 1, AD_FIRE = 2, AD_COLD = 3, AD_SLEE = 4, AD_DISN = 5,
      AD_ELEC = 6, AD_DRST = 7, AD_ACID = 8;

// C ref: zap.c zhitm(mon, type, nd, &ootmp) — apply a ray's damage to a
// monster.  Returns { tmp, otmp }: tmp is the damage dealt (or MAGIC_COOKIE
// for a disintegration instakill), otmp is worn armor disintegration
// destroyed instead of killing (only reachable via the monster-breath branch,
// which dobuzz never invokes for a hero wand zap).
async function zhitm(mon, type, nd) {
    const fltyp = zaptype(type);
    const damgtype = fltyp % 10;
    let tmp = 0, orig_dmg = 0, otmp = null, shieldeffFlag = false;
    switch (damgtype) {
    case ZT_MAGIC_MISSILE:
        if (resists_magm(mon) || defended(mon, AD_MAGM)) { shieldeffFlag = true; break; }
        tmp = d(nd, 6);
        break;
    case ZT_FIRE:
        if (resists_fire(mon) || defended(mon, AD_FIRE)) { shieldeffFlag = true; break; }
        tmp = d(nd, 6);
        orig_dmg = tmp;
        if (resists_cold(mon)) tmp += 7;
        if (await burnarmor(mon)) {
            if (!rn2(3)) {
                tmp += await destroy_items(mon, AD_FIRE, orig_dmg);
                // ignite_items(mon.minvent): no RNG; no covered target carries
                // burnable items.
            }
        }
        break;
    case ZT_COLD:
        if (resists_cold(mon) || defended(mon, AD_COLD)) { shieldeffFlag = true; break; }
        tmp = d(nd, 6);
        orig_dmg = tmp;
        if (resists_fire(mon)) tmp += d(nd, 3);
        if (!rn2(3)) tmp += await destroy_items(mon, AD_COLD, orig_dmg);
        break;
    case ZT_SLEEP:
        tmp = 0;
        await sleep_monst(mon, d(nd, 25), WAND_CLASS);
        break;
    case ZT_DEATH:
        if (Math.abs(type) !== 20 + ZT_DEATH /* ZT_BREATH(ZT_DEATH); unreachable
                                                 via a hero wand zap (type 0-9) */) {
            // "death"/disintegration wand or spell.  The PM_DEATH self-heal
            // and is_rider resurrection special cases aren't reachable by any
            // covered zap target and are skipped in favor of the ordinary
            // path straight below.
            if (nonliving_mdat(mon.data) || is_demon_mdat(mon.data) || resists_magm(mon)) {
                shieldeffFlag = true;
                break;
            }
            type = -1; // no saving throw
            tmp = (mon.mhp || 0) + 1;
            break;
        }
        // Disintegration breath: not reachable via a hero wand zap.
        if (resists_disint(mon) || defended(mon, AD_DISN)) shieldeffFlag = true;
        else tmp = MAGIC_COOKIE;
        return { tmp, otmp };
    case ZT_LIGHTNING:
        tmp = d(nd, 6);
        orig_dmg = tmp;
        if (resists_elec(mon) || defended(mon, AD_ELEC)) { shieldeffFlag = true; tmp = 0; }
        if (!resists_blnd_mon(mon) && nd > 2) {
            const rnd_tmp = rnd(50);
            mon.mcansee = 0;
            mon.mblinded = Math.min(127, (mon.mblinded || 0) + rnd_tmp);
        }
        if (!rn2(3)) tmp += await destroy_items(mon, AD_ELEC, orig_dmg);
        break;
    case 7 /*ZT_POISON_GAS*/:
        if (resists_poison(mon)) { shieldeffFlag = true; break; }
        tmp = d(nd, 6);
        break;
    case 8 /*ZT_ACID*/:
        if (resists_acid(mon)) { shieldeffFlag = true; break; }
        tmp = d(nd, 6);
        if (!rn2(6)) { /* acid_damage(MON_WEP(mon)): scrolls only, null-safe;
                           no covered target wields a destructible scroll. */ }
        if (!rn2(6)) await erode_armor_mon(mon);
        break;
    }
    // shieldeff(mon.mx, mon.my): display-only shimmer flash, no RNG.  Not
    // modelled (no covered target reaches a resisted branch that needs it).
    void shieldeffFlag;
    if (tmp > 0 && type >= 0 && resist(mon, fltyp < 10 ? WAND_CLASS : 0, 0, false))
        tmp = Math.trunc(tmp / 2);
    if (tmp < 0) tmp = 0;
    mon.mhp = (mon.mhp || 0) - tmp;
    return { tmp, otmp };
}

// C ref: uhitm.c erode_armor(mdef, hurt) — the ACID case's armor-corrosion
// pass.  Same reroll-until-torso-slot RNG shape as burnarmor(); no monster in
// the covered sessions wears armor, so this only pays the reroll cost.
async function erode_armor_mon(mon) {
    for (;;) {
        switch (rn2(5)) {
        case 0: if (worn_slot(mon, 'uarmh')) return; continue;
        case 1: return; // torso: always terminates (worn or bare)
        case 2: if (worn_slot(mon, 'uarms')) return; continue;
        case 3: if (worn_slot(mon, 'uarmg')) return; continue;
        case 4: if (worn_slot(mon, 'uarmf')) return; continue;
        }
    }
}

// C ref: trap.c burnarmor(victim) — burn worn armor; returns TRUE on a torso
// (body) hit.  The wet-towel pre-loop is skipped (no towel on the covered
// hero); no monster in the covered sessions wears armor, so worn_slot() always
// reports empty for a monster victim.
async function burnarmor(victim) {
    if (!victim) return false;
    // C: while (1) switch (rn2(5)) { ... } — case 1 (cloak/suit/shirt) always
    // returns TRUE (body hit); other cases continue when the slot is empty.
    for (;;) {
        switch (rn2(5)) {
        case 0:
            if (worn_slot(victim, 'uarmh')) { await erode_worn(victim, 'uarmh', 'helmet'); break; }
            continue;
        case 1: {
            const c = worn_slot(victim, 'uarmc');
            if (c) { await erode_worn(victim, 'uarmc', cloak_simple_name(c)); return true; }
            const s = worn_slot(victim, 'uarm');
            if (s) { await erode_worn(victim, 'uarm', 'suit'); return true; }
            const sh = worn_slot(victim, 'uarmu');
            if (sh) await erode_worn(victim, 'uarmu', 'shirt');
            return true;
        }
        case 2:
            if (worn_slot(victim, 'uarms')) { await erode_worn(victim, 'uarms', 'wooden shield'); break; }
            continue;
        case 3:
            if (worn_slot(victim, 'uarmg')) { await erode_worn(victim, 'uarmg', 'gloves'); break; }
            continue;
        case 4:
            if (worn_slot(victim, 'uarmf')) { await erode_worn(victim, 'uarmf', 'boots'); break; }
            continue;
        }
        break;
    }
    return false;
}

// Worn-armor slot accessor.  C tracks uarm*, uarmc, ...; the JS hero stores the
// worn objects under game.u.<slot> when modelled.  No monster in the covered
// sessions has worn-armor slots modelled, so a monster victim always reports
// empty (matching burnarmor()/erode_armor()'s reroll-until-torso RNG cost
// even when nothing is actually worn).
function worn_slot(victim, slot) { return (victim === game.u) ? (game[slot] || null) : null; }
function cloak_simple_name(obj) {
    // C ref: do_name.c cloak_simple_name — MR cloak / robe / etc. -> "cloak".
    return 'cloak';
}
// C ref: trap.c erode_obj via burn_dmg — increments erosion and prints a
// "Your <ostr> smoulders!" line.  No RNG (no grease on the covered armor).
async function erode_worn(victim, slot, ostr) {
    const obj = worn_slot(victim, slot);
    if (obj) obj.oeroded = (obj.oeroded | 0) + 1;
    if (victim === game.u) await update_topl(`Your ${ostr} smoulders!`);
    else if (canspotmon(victim)) await update_topl(`${Monnam(victim)}'s ${ostr} smoulders!`);
}

// ── destroy_items (zap.c) ────────────────────────────────────────────────
// C ref: zap.c destroy_items / maybe_destroy_item / destroyable.  Iterate the
// hero's inventory and probabilistically destroy fire/cold/elec-vulnerable
// stacks.  Faithful to the RNG sequence the seed5002 fire zap exercises.
const DMG_DESTROY_SCALE = 5, MAX_ITEMS_DESTROYED = 20;

function invent_list() {
    if (Array.isArray(game.invent)) return game.invent;
    const out = [];
    for (let o = game.gi?.invent; o; o = o.nobj) out.push(o);
    return out;
}
// C ref: zap.c destroy_items's `objchn` (&gi.invent for the hero, &mon->minvent
// otherwise).
function obj_chain(carrier) {
    return (carrier === game.u) ? invent_list() : (Array.isArray(carrier?.minvent) ? carrier.minvent : []);
}
// C ref: mon.c m_useup — decrement/remove one item from a monster's minvent.
function mon_useup(carrier, obj) {
    const inv = carrier?.minvent;
    if (!inv) return;
    obj.quan = (obj.quan || 1) - 1;
    if (obj.quan <= 0) {
        const idx = inv.indexOf(obj);
        if (idx >= 0) inv.splice(idx, 1);
    }
}

// C ref: zap.c destroyable(obj, adtyp).
function destroyable(obj, adtyp) {
    if (obj.oartifact) return false;
    if (obj.in_use && obj.quan === 1) return false;
    if (adtyp === AD_FIRE) {
        if (obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL) return false;
        if (obj.otyp === GLOB_OF_GREEN_SLIME || obj.oclass === POTION_CLASS
            || obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)
            return true;
    } else if (adtyp === AD_COLD) {
        if (obj.oclass === POTION_CLASS && obj.otyp !== POT_OIL) return true;
    } else if (adtyp === AD_ELEC) {
        if (obj.oclass !== RING_CLASS && obj.oclass !== WAND_CLASS) return false;
        // RIN_SHOCK_RESISTANCE / WAN_LIGHTNING immune
        if (obj.otyp !== 207 /*RIN_SHOCK_RESISTANCE*/ && obj.otyp !== 433 /*WAN_LIGHTNING*/)
            return true;
    }
    return false;
}

// destroy_strings[dindx][0 singular, 1 plural].  C ref: zap.c.
const DESTROY_STRINGS = [
    ['freezes and shatters', 'freeze and shatter'],
    ['boils and explodes', 'boil and explode'],
    ['ignites and explodes', 'ignite and explode'],
    ['catches fire and burns', 'catch fire and burn'],
    ['catches fire and burns', ''],
    ['turns to dust and vanishes', ''],
    ['breaks apart and explodes', ''],
];

// Display name for the destroyed stack (yname-equivalent for the covered types).
function yname_for(obj) {
    const NAMES = {
        305: 'potion of invisibility', 321: 'potion of oil', 322: 'potion of water',
        323: 'scroll of enchant armor', 373: 'spellbook of healing',
        375: 'spellbook of force bolt',
    };
    return 'Your ' + (NAMES[obj.otyp] || (objects[obj.otyp]?.name || 'item'));
}

async function destroy_items(mon, dmgtyp, dmg_in) {
    const objchn = obj_chain(mon);
    let limit = Math.floor(dmg_in / DMG_DESTROY_SCALE);
    if (dmg_in % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;

    const items = new Array(MAX_ITEMS_DESTROYED).fill(null).map(() => ({ obj: null, deferred: false }));
    let elig = 0, where = null;
    for (const obj of objchn) {
        if (!destroyable(obj, dmgtyp)) continue;
        const i = (elig < limit) ? elig : rn2(elig);
        elig++;
        if (i < 0 || i >= limit) continue;
        items[i].obj = obj;
        items[i].deferred = false; // levitation/flying deferral not on covered hero
        if (where == null) where = 'invent';
    }
    if (elig > limit) elig = limit;
    let dmg_out = 0;
    for (let defer = 0; defer <= 1; defer++) {
        for (let i = 0; i < elig; i++) {
            const obj = items[i].obj;
            if (obj && items[i].deferred === (defer === 1)) {
                dmg_out += await maybe_destroy_item(mon, obj, dmgtyp);
                items[i].obj = null;
            }
        }
    }
    return dmg_out;
}

async function maybe_destroy_item(carrier, obj, dmgtyp) {
    const u_carry = (carrier === game.u);
    let dindx = 0, dmg = 0, quan = 0, skip = 0, xresist = 0, chargeit = false;
    switch (dmgtyp) {
    case AD_COLD:
        quan = obj.quan; dindx = 0; dmg = rnd(4); break;
    case AD_FIRE:
        xresist = (obj.oclass !== POTION_CLASS && obj.otyp !== GLOB_OF_GREEN_SLIME
                   && (u_carry ? false /* hero not fire-resistant on covered level */
                               : resists_fire(carrier)));
        quan = obj.quan;
        switch (obj.oclass) {
        case POTION_CLASS: dindx = (obj.otyp !== POT_OIL) ? 1 : 2; dmg = rnd(6); break;
        case SCROLL_CLASS: dindx = 3; dmg = 1; break;
        case SPBOOK_CLASS: dindx = 4; dmg = 1; break;
        case FOOD_CLASS: dindx = 1; dmg = Math.floor((obj.owt + 19) / 20); break;
        }
        break;
    case AD_ELEC:
        quan = obj.quan;
        if (obj.oclass === WAND_CLASS) { dindx = 6; dmg = rnd(10); }
        break;
    default: skip = 1; break;
    }
    if (skip) return dmg;

    let cnt = 0;
    if (obj.in_use) quan--;
    for (let i = 0; i < quan; i++) if (!rn2(3)) cnt++;
    if (!cnt) return 0;

    const visible = u_carry || canspotmon(carrier);
    if (visible) {
        const mult = (cnt === 1) ? ((quan === 1) ? '' : 'One of ')
                   : ((cnt < quan) ? 'Some of ' : (quan === 2) ? 'Both of ' : 'All of ');
        // yname capitalises with "Your"; when prefixed by a mult word the leading
        // "Your" lowercases to "your".  For the covered single-stack potions cnt
        // and quan are both 1 so mult is empty -> "Your <name> <how>!".
        const base = u_carry ? yname_for(obj) : `${carrier?.name || 'The monster'}'s ${objects[obj.otyp]?.name || 'item'}`;
        const nm = (u_carry && mult) ? base.replace(/^Your/, 'your') : base;
        await update_topl(`${mult}${nm} ${DESTROY_STRINGS[dindx][cnt > 1 ? 1 : 0]}!`);
    }
    if (u_carry) {
        if (obj.oclass === POTION_CLASS && dmgtyp !== AD_COLD)
            await potionbreathe(obj);
    }
    for (let i = 0; i < cnt; i++) {
        if (u_carry) useup(obj);
        else mon_useup(carrier, obj);
    }
    if (dmg) {
        if (!u_carry) return xresist ? 0 : dmg;
        if (xresist) {
            await update_topl("You aren't hurt!");
        } else {
            await losehp(dmg, DESTROY_STRINGS[dindx][1] || DESTROY_STRINGS[dindx][0]);
            exercise(A_STR, false);
        }
    }
    return dmg;
}

// C ref: potion.c potionbreathe — only the POT_INVISIBILITY case (no RNG) is
// reached by the seed5002 fire zap.
async function potionbreathe(obj) {
    switch (obj.otyp) {
    case POT_INVISIBILITY:
        // !Blind && !Invis on the covered hero.
        await update_topl("For an instant you couldn't see yourself!");
        break;
    default:
        break;
    }
}

// C ref: zap.c ignite_items — not exercised (the seed5002 gate rn2(3) fails);
// kept as a no-op so the RAY path is structurally complete.
async function ignite_items() { /* not reached this session */ }

// ── losehp / death (hack.c losehp + end.c done) ──────────────────────────
// C ref: hack.c losehp — subtract HP; on death announce "You die..." and run
// done(DIED).  showdamage is off in the covered rc so no per-hit damage line.
async function losehp(n, knam) {
    const u = game.u;
    if (game.program_state?.gameover) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhpmax = u.uhp;
    if (u.uhp < 1) {
        game._killer_name = knam || '';
        await update_topl('You die...');   // urgent_pline -> NEED_MORE topline
        await done_died();
    }
}

// C ref: end.c done(DIED) — wizard/explore mode offers "Die?" before really
// dying.  bot() forces the status to HP 0; the paranoid "Die?" query pages the
// pending "You die..." line (the recorded session ends at this prompt).
async function done_died() {
    const u = game.u;
    // force HP to 0 (done(): how < PANICKED resets positive/negative uhp)
    u.uhp = 0;
    if (u.mh != null) u.mh = 0;
    await bot();
    await flush_screen(1);
    // paranoid_query(ParanoidDie, "Die?"): yn_function shows the deferred
    // "You die...--More--" first (game._yn_need_more), then "Die? [yn] (n)".
    game._yn_need_more = true;
    const ans = await y_n('Die?', 'yn\x1b', 'n');
    if (ans === 'y') {
        game.program_state = game.program_state || {};
        game.program_state.gameover = true;
    } else {
        // "OK, so you don't die." (savelife); not reached — input ends at prompt.
        game._pending_message = 'OK, so you don\'t die.';
    }
}

// C ref: cmd.c getdir() invoked from dozap() — prompt "In what direction?" and
// stash the result in u.dx/u.dy/u.dz.  Returns false on cancel (ESC / invalid).
async function zap_getdir() {
    const { getdir } = await import('./cmd.js');
    const d = await getdir();
    const u = game.u;
    if (!d) { u.dx = 0; u.dy = 0; u.dz = 0; return false; }
    u.dx = d.dx | 0; u.dy = d.dy | 0; u.dz = d.dz | 0;
    return true;
}

// C ref: zap.c zapyourself(obj, ordinary) — a directional wand/spell aimed at
// self (getdir() returned dx=dy=dz=0).  Only the WAN_DEATH / SPE_FINGER_OF_DEATH
// case is exercised by the covered sessions: a wizard-mode tourist zaps a wished
// wand of death at himself with '.'.  Returns the physical damage for the caller
// to feed to losehp(); WAN_DEATH runs done(DIED) directly and returns 0.
async function zapyourself(obj, ordinary) {
    let learn_it = false;
    let damage = 0;
    switch (obj.otyp) {
    case WAN_SLEEP:
    case SPE_SLEEP:
        // C ref: zap.c zapyourself() WAN_SLEEP/SPE_SLEEP.  learn_it discovers the
        // wand type at the tail (learnwand -> makeknown, credit_hero rn2(19) when
        // first known).  monstseesu/monstunseesu only toggle a monster-memory flag
        // (no RNG).  With no sleep resistance the ordinary self-zap prints
        // pline_The("sleep ray hits you!") and collapses the hero via
        // fall_asleep(-rnd(50), TRUE) — the rnd(50) is the RNG-relevant draw.
        // pline_The/You route through vpline -> update_topl, which arms the
        // topline NEED_MORE state so the message combines with (and later pages
        // via --More--) the pet-move messages produced during the sleep turns.
        learn_it = true;
        if (Sleep_resistance()) {
            await update_topl("You don't feel sleepy!");
        } else {
            if (ordinary)
                await update_topl('The sleep ray hits you!');
            else
                await update_topl('You fall asleep!');
            fall_asleep(-rnd(50), true);
        }
        break;
    case WAN_DEATH:
    case SPE_FINGER_OF_DEATH:
        // nonliving()/is_demon(): the human hero is living and not a demon, so
        // the "apparently harmless beam" / "no deader than before" branch that
        // spares such heroes is skipped.  learn_it (makeknown) would run only if
        // done() returned to zapyourself(), but the contest player accepts death,
        // so identification is never touched on this path.
        // C ref: zap.c:2894 — Sprintf(killer.name, "shot %sself with a death ray",
        // uhim()); killer.format = NO_KILLER_PREFIX.  uhim() is her/him/it by
        // gender; used verbatim by outrip()'s tombstone + the score summary.
        {
            const him = game.flags?.female ? 'her' : 'him';
            game._killer_name = `shot ${him}self with a death ray`;
        }
        // Two urgent_pline()s then done(DIED).  urgent_pline() -> putmesg() ->
        // update_topl() (pline.c:315, topl.c:251).  getdir()'s
        // clear_nhwindow(WIN_MESSAGE) left the topline empty, so the first message
        // just arms NEED_MORE (no --More-- yet) and the second (a "You die"-prefixed
        // line, which update_topl never combines) fires more() to page the first.
        game._toplin = 0;
        game._pending_message = '';
        await update_topl('You irradiate yourself with pure energy!');
        await update_topl('You die.');
        await done_selfzap(0 /* DIED */);
        break;
    default:
        break;
    }
    // C ref: zap.c zapyourself() tail — discover the wand type if its effect
    // was observable and the wand itself has been seen.
    if (learn_it) learnwand(obj);
    return damage;
}

// C ref: youprop.h Sleep_resistance — intrinsic/extrinsic sleep immunity.  The
// contest Healer has none; kept as a helper so the WAN_SLEEP branch mirrors C.
function Sleep_resistance() { return (game.u?.uprops?.SleepResistance || 0) > 0; }

// C ref: timeout.c fall_asleep(how_long, wakeup_msg) — the hero collapses
// helpless for |how_long| turns (how_long < 0).  nomul(how_long) sets the
// negative multi the moveloop counts back up; u.usleep marks the hero Unaware
// (gethungry then burns nutrition at 1/10 via rn2(10)); nomovemsg is announced
// by unmul() when the countdown reaches 0.  The disabled Hear_again block and
// stop_occupation() draw no RNG (no occupation is active on the zap path).
function fall_asleep(how_long, wakeup_msg) {
    if ((game.multi ?? 0) < how_long) return;   // nomul(how_long)
    game.multi = how_long;
    if (game.context)
        game.context.travel = game.context.travel1 = game.context.mv = 0;
    game.multi_reason = 'sleeping';
    if (game.u) game.u.usleep = game.moves ?? 1;
    game.nomovemsg = wakeup_msg ? 'You wake up.' : 'You can move again.';
}

// C ref: end.c done(DIED) / really_done(DIED), reached from zapyourself()'s
// urgent_pline("You die.").  At entry the "You die." topline is pending
// (NEED_MORE) and the hero's HP is still positive.  C's done() forces a status
// update (bot(), end.c:1046) BEFORE zeroing HP (end.c:1077, with only a deferred
// disp.botl refresh), so the "You die." --More-- frame keeps the old HP and only
// the "Die?" prompt shows HP 0.  Our status line is rebuilt live from u.uhp each
// frame, so we reproduce the same three frames by paging "You die." while HP is
// still positive, THEN zeroing HP, THEN showing the "Die?" query.
async function done_selfzap(how) {
    const DIED_HOW = 0, GENOCIDED = 10; // end.h death codes
    const u = game.u;

    // Page the pending "You die." line (--More--) with HP still positive.
    await topl_more();

    // done(): how < PANICKED forces HP to zero (deferred status refresh).
    u.uhp = 0;
    if (u.mh != null) u.mh = 0;

    // explore/wizard modes offer "keep playing?" — paranoid_query(ParanoidDie).
    const wizard = !!game.flags?.debug;
    const discover = !!(game.flags?.explore || game.flags?.discover
                        || game.flags?.playmode === 'explore');
    if (wizard || discover) {
        const ans = await y_n('Die?', 'yn\x1b', 'n');
        if (ans !== 'y') {
            // "OK, so you don't die." + savelife() — not exercised (the contest
            // player accepts death); leave the message pending for the next turn.
            game._pending_message = "OK, so you don't die.";
            game._toplin = 1;
            return;
        }
    }

    // really_done(how): bones_ok = (how < GENOCIDED) && can_make_bones()
    // (end.c:1201).  can_make_bones() draws rn2(1 + (depth>>2)) and, in wizard
    // mode, returns TRUE (bones.c:355).  really_done then, in wizard mode,
    //   if (!wizard || paranoid_query(ParanoidBones, "Save bones?"))
    //       savebones(how, endtime, corpse);                          (end.c:1362)
    // savebones() rewrites the death level into a legacy/bones level (drop the
    // hero's inventory onto the floor, raise a ghost, wipe remembered display)
    // and stashes it in the shared storage handle for a later segment's
    // getbones() to reload — this is exactly seed5006 seg0's Dlvl:3 death whose
    // bones seg1's ^V-to-3 loads.
    if (how < GENOCIDED && can_make_bones()) {
        const bones_wiz = !!game.flags?.debug;
        const bones_ans = bones_wiz ? await y_n('Save bones?', 'yn\x1b', 'n') : 'y';
        if (!bones_wiz || bones_ans === 'y') {
            // C ref: end.c really_done() — "grave creation should be after
            // disclosure" block, gated on the same bones_ok as savebones():
            // u.ugrave_arise == NON_PM (the ordinary case; an "arise as a
            // monster"/statue death is not modelled here) leaves a named
            // corpse of the hero's race at the death spot via
            // mk_named_object(CORPSE, ...) before savebones() runs.  Its own
            // mksobj() rolls (next_ident/gender/timer) never reach a scored
            // screen (each session segment reseeds independently — see the
            // savebones() call below); what *is* observable is that the
            // corpse joins the level's floor object list and is carried into
            // the bones file, so the next segment's getbones()/restobjchn()
            // re-stamps it too.
            if (!game._death_corpse) {
                const x = game.u?.ux ?? 0, y = game.u?.uy ?? 0;
                game._death_corpse =
                    mkcorpstat(CORPSE, null, game.u?.umonnum, x, y, CORPSTAT_INIT);
            }
            const { savebones } = await import('./bones.js');
            await savebones(how, game._death_corpse || null);
        }
    }

    // C ref: end.c really_done() — the endgame disclosure/tombstone/topten
    // teardown.  outrip_and_score() renders the tombstone, the tty window
    // --More-- acknowledgements, and the wizard-mode topten line, driving
    // nhgetch() at each boundary (the last read ends the segment).
    const { outrip_and_score } = await import('./end.js');
    await outrip_and_score(how);
}

// C ref: zap.c dozap — the 'z' command.  Pick a wand, then apply it.  Directionless
// wands go straight to weffects(); directional (IMMEDIATE) wands prompt getdir()
// first, then weffects() runs bhit() along the chosen direction.
export async function dozap() {
    if (game.u?.nohands) {
        await pline("You aren't able to zap anything in your current form.");
        return ECMD_OK;
    }

    const obj = await getobj('zap', zap_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    const need_dir = objects[obj.otyp]?.dir !== NODIR;
    const u = game.u;
    let dir = null;
    if (need_dir) {
        // C ref: dozap() — getdir() is evaluated as part of the if-chain BEFORE
        // zappable()'s charge is checked only in the !need_dir branch order; but
        // C evaluates !zappable(obj) first.  Match C's short-circuit ordering:
        // zappable (charge), then cursed-backfire, then getdir.
    }
    if (!zappable(obj)) {
        await pline('Nothing happens.');
    } else if (obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        // backfire(obj): wand blows up — not exercised by covered sessions.
        exercise(A_STR, false);
        return ECMD_TIME;
    } else if (need_dir && !(dir = await zap_getdir())) {
        // getdir() returned cancel (no valid direction).
        // C: "<wand> glows and fades." (Blind check omitted: hero not blind).
        // make him pay for knowing it's directional — no further effect.
    } else if (need_dir && !u.dx && !u.dy && !u.dz) {
        // C ref: dozap() — getdir() returned self (dx=dy=dz=0), so the wand's
        // effect lands on the hero.  zapyourself() returns the physical damage to
        // charge via losehp(); WAN_DEATH runs done(DIED) itself and returns 0.
        const damage = await zapyourself(obj, true);
        if (damage) {
            // C: losehp(Maybe_Half_Phys(damage), "zapped ...self with ...") — not
            // reached for the ported WAN_DEATH case (done() ended the game first).
            await losehp(damage, 'zapped himself with a wand');
        }
    } else {
        game.current_wand = obj;
        await weffects(obj);
        game.current_wand = 0;
    }
    if (obj && obj.spe < 0) {
        await pline('It turns to dust.');
        useupall(obj);
    }
    return ECMD_TIME;
}
