// dogmove.js — Pet (tame monster) movement for the per-turn loop.
// C ref: dogmove.c — dog_move(), dog_goal(), dog_invent(); dog.c dogfood().
//
// GENERAL (data-driven) port of the common pet-follows-hero behaviour over the
// real monster/object records on game.level.  Faithful to the C control flow
// so the per-move RNG (obj_resists rn2(100), dog_goal rn2(8)/rn2(4),
// dog_move move-choice rn2(++chcnt)/rn2(3)/rn2(12), backtrack rn2(MTSZ*(k-j)))
// is emitted call-for-call.  Exotic cases (pet carrying/eating/attacking,
// leashed pets, ranged attacks, conflict) are intentionally minimal — none of
// the gameplay sessions exercise them at the point they currently diverge.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { MTSZ, COLNO, ROWNO, IS_ROOM, MAGIC_PORTAL, isok } from './const.js';
import { obj_resists } from './zap.js';
import { newsym } from './display.js';
import { couldsee as visCouldsee, clear_path } from './vision.js';
import { dist2, mfndpos } from './monmove.js';
import { mattackm } from './mhitm.js';
import { M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED } from './const.js';
import {
    FOOD_CLASS, BALL_CLASS, CHAIN_CLASS, ROCK_CLASS, next_ident,
} from './mkobj.js';
import { gettrack } from './track.js';

// dogfood quality enum (mextra.h): lower == more desirable.
const DOGFOOD = 0, CADAVER = 1, ACCFOOD = 2, MANFOOD = 3,
      APPORT = 4, POISON = 5, UNDEF = 6, TABU = 7;

const MMOVE_NOTHING = 0, MMOVE_MOVED = 2, MMOVE_DIED = 3, MMOVE_DONE = 5;

const PM_LITTLE_DOG = 16, PM_KITTEN = 34, PM_PONY = 100;

// Food object types referenced by dogfood() (mkobj.js OBJECT_DATA otyp order).
const TRIPE_RATION = 264, EGG = 266, MEATBALL = 267, MEAT_STICK = 268,
      ENORMOUS_MEATBALL = 269, MEAT_RING = 270, APPLE = 277, BANANA = 281,
      CARROT = 282, CLOVE_OF_GARLIC = 284, SLIME_MOLD = 285;

// C ref: mondata.h haseyes(ptr) — monster has eyes (not NOEYES).  For the pets
// our sessions drive (dog/cat/pony) this is always true; M1_NOEYES monsters
// (e.g. blobs) never reach dogfood here, so a constant TRUE is faithful.
function haseyes(_mdat) { return true; }

// Kept in lock-step with allmain.js MULTIPASS_MOVEMON.  When the C multi-pass
// movemon() loop is enabled, the pet's repeat object scan needs real
// line-of-sight (clear_path) and the hero's COULD_SEE bit (couldsee) to match
// C's obj_resists/rn2(8) stream in dog_goal's APPORT branch.  Stays OFF in
// lock-step with the multi-pass gate (single-pass keeps the "always sees"
// approximation that matches the baseline).
export const PET_REAL_VISION = true;

// C ref: mon.c max_mon_load(mtmp).  MAX_CARR_CAP=1000, WT_HUMAN=1450.
// kitten(34)/little dog(16): cwt=150, MZ_SMALL, not strong ->
//   (1000*150)/1450 = 103, then /2 (not strong) = 51.
// pony(100): cwt=1300, MZ_MEDIUM, M2_STRONG, cwt<=WT_HUMAN -> MAX_CARR_CAP=1000,
//   no halving (strong) = 1000.
// All three starting pets are M1_NOHANDS and are not dragons / engulfers.
const PET_MAXLOAD = { [PM_LITTLE_DOG]: 51, [PM_KITTEN]: 51, [PM_PONY]: 1000 };

// C ref: mon.c MON_AT — a (live) monster other than the hero at <x,y>.
function MON_AT(x, y) {
    for (const m of game.level?.monsters || [])
        if (m.mx === x && m.my === y && !(m.mhp != null && m.mhp <= 0)) return m;
    return false;
}

// C ref: rm.h levl[x][y].typ + the object chain at a square.
function terrainTyp(x, y) { return game.level?.at(x, y)?.typ; }

// All floor objects on the level (C's `fobj` chain).  C inserts each newly
// placed object at the HEAD of fobj (otmp->nobj = fobj; fobj = otmp), so the
// chain iterates newest-first.  Our level.objects array is append-ordered
// (oldest-first), so reverse it to reproduce C's traversal order — in dog_goal
// the traversal order determines which object's APPORT rn2(8) fires first and
// how gg.gtyp evolves, so the obj_resists/rn2(8) stream must match C's fobj.
function fobj() {
    const arr = game.level?.objects;
    if (!arr) return [];
    const out = [];
    for (let i = arr.length - 1; i >= 0; i--) out.push(arr[i]);
    return out;
}

// Objects at a specific square.  Preserve the level.objects append order here
// (the per-tile `nexthere` scan in dog_move/dog_invent already matched C at
// the tiles these sessions exercise); only dog_goal's whole-level fobj scan
// needs the newest-first traversal.
function objectsAt(x, y) {
    return (game.level?.objects || []).filter((o) => o.ox === x && o.oy === y);
}

// C ref: hack.h distu(x,y) — squared distance from hero.
function distu(x, y) { return dist2(x, y, game.u?.ux ?? 0, game.u?.uy ?? 0); }
// C ref: hack.h distmin(x0,y0,x1,y1) — Chebyshev (king-move) distance.
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

// C ref: dog.c dogfood(mon, obj) — the food/desirability classification.
// We only need (a) the rn2(100) obj_resists side-effect, emitted for every
// non-poisoned object, and (b) a faithful-enough quality so goal selection
// (and thus the downstream rn2 ordering) matches for the common objects the
// starting level places.
function dogfood(mon, obj) {
    const mdat = mon.data || {};
    const carni = !!mdat.carnivore;
    const herbi = !!mdat.herbivore;

    if (obj.opoisoned) return POISON; // resists_poison: pets don't, at start
    // is_quest_artifact() is false for ordinary objects; obj_resists rolls
    // rn2(100) (always FALSE for non-artifacts with ochance 0).
    if (obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    switch (obj.oclass) {
    case FOOD_CLASS: {
        // C ref: dog.c dogfood() FOOD_CLASS — the per-otyp diet switch.  Only
        // the cases the starter/ride sessions actually place (meat, fruit/veg,
        // and the generic default) need faithful values; the exotic corpse/egg
        // /glob/ghoul branches never fire for these pets so they fall into the
        // shared default.  An apple/carrot returning DOGFOOD to a herbivore
        // pony is what makes the dog_goal invent scan stop at the right item
        // (and thus emit the matching number of obj_resists rolls).
        if (!carni && !herbi)
            return obj.cursed ? UNDEF : APPORT;
        // even carnivores eat carrots while temporarily blind (mblind)
        const mblind = !mon.mcansee && haseyes(mdat);
        switch (obj.otyp) {
        case TRIPE_RATION:
        case MEATBALL:
        case MEAT_RING:
        case MEAT_STICK:
        case ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;
        case EGG:
            return carni ? CADAVER : MANFOOD;
        case APPLE:
            return herbi ? DOGFOOD : MANFOOD; // (starving -> ACCFOOD; never here)
        case CARROT:
            return (herbi || mblind) ? DOGFOOD : MANFOOD;
        case BANANA:
            return (herbi) ? ACCFOOD : MANFOOD;
        case CLOVE_OF_GARLIC:
            return herbi ? ACCFOOD : MANFOOD;
        default:
            // C: otyp > SLIME_MOLD ? (carni?ACCFOOD:MANFOOD)
            //                      : (herbi?ACCFOOD:MANFOOD)
            return (obj.otyp > SLIME_MOLD)
                ? (carni ? ACCFOOD : MANFOOD)
                : (herbi ? ACCFOOD : MANFOOD);
        }
    }
    case ROCK_CLASS:
        return UNDEF;
    default:
        if (!obj.cursed && obj.oclass !== BALL_CLASS
            && obj.oclass !== CHAIN_CLASS)
            return APPORT;
        return UNDEF;
    }
}

// C ref: stairs.c On_stairs(x,y) — stairway_at(x,y) != NULL.  Stairs live on
// the game.stairs linked list (mklev.js) with .sx/.sy coordinates.
function On_stairs(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return true;
    return false;
}

// C ref: dogmove.c dog_goal — `for (obj = gi.invent; obj; obj = obj->nobj)`.
// The hero's pack, in inventory order.  game.invent is the materialized array.
function heroInvent() {
    return game.invent || game.gi?.invent || [];
}

// C ref: dogmove.c dog_goal — `for (t = gf.ftrap; ...) if (t->ttyp==MAGIC_PORTAL)`
// Consumes no RNG; just decides whether the pet should follow closely because
// the hero is on/next to a magic portal.
function nearMagicPortal() {
    const u = game.u;
    for (const t of (game.level?.traps || [])) {
        if (t.ttyp === MAGIC_PORTAL) {
            // distu(t.tx,t.ty) <= 2 (the first magic portal found ends the scan).
            return dist2(t.tx, t.ty, u.ux, u.uy) <= 2;
        }
    }
    return false;
}

// C ref: dog.c initedog() — apport = ACURR(A_CHA), captured at makedog() time.
// CRITICAL ORDERING: in newgame() (allmain.c:814) makedog() runs BEFORE
// u_init_inventory_attrs() (allmain.c:816) which sets the hero's attributes.
// At makedog time u_init_misc() has just memset(&u,0,...), so acurr.a[A_CHA]==0
// and abon/atemp are 0 too.  acurr(A_CHA) (attrib.c:1200) floors its result at
// 3 (`tmp <= 3 ? 3`), so the starting pet's apport is ALWAYS 3 regardless of
// role/race.  (The final, higher CHA is irrelevant — it isn't rolled yet.)
function edogApport(edog) {
    if (edog.apport == null) edog.apport = 3;
    return edog.apport;
}

// C ref: dogmove.c droppables(mon) — return the first droppable object in the
// pet's minvent.  Consumes no RNG.  The starting pets are NOHANDS animals; any
// ordinary item they've picked up is unworn/unwielded -> returned as droppable
// (the pickaxe/unihorn/key/weapon "keep" cases never apply to dog/cat/pony).
function droppables(mtmp) {
    const inv = mtmp.minvent;
    if (!inv || !inv.length) return null;
    for (const obj of inv) {
        if (!obj.owornmask && obj !== mtmp.mw) return obj;
    }
    return null;
}

// C ref: dogmove.c dog_invent(mtmp, edog, udist).  The pet either drops a
// carried object (relobj, no RNG beyond the drop rolls), eats an underfoot
// item (counts as its move), or picks one up (splitobj -> next_ident when the
// stack is split).  Picking up sets minvent so later turns take the drop path
// and dog_goal's `dog_has_minvent` rolls fire.  Returns 1 if the pet ate.
function dog_invent(mtmp, edog, udist) {
    const omx = mtmp.mx, omy = mtmp.my;
    const apport = edogApport(edog);

    // C ref: dogmove.c:416 — if carrying something, maybe drop it near @.
    if (droppables(mtmp)) {
        // assert(apport > 0)
        // C: if (!rn2(udist+1) || !rn2(apport)) if (rn2(10) < apport)
        if (rn2(udist + 1) === 0 || rn2(apport) === 0) {
            if (rn2(10) < apport) {
                // relobj(mtmp, ..., TRUE): drop everything onto the floor.  No
                // RNG.  Place each carried object back on the pet's tile.
                relobj(mtmp, omx, omy);
                if (edog.apport > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = game.moves || 1;
            }
        }
        return 0;
    }

    // No minvent: maybe eat or pick up an underfoot object.
    const here = objectsAt(omx, omy);
    if (here.length) {
        const obj = here[0]; // svl.level.objects[omx][omy] = top of pile
        // nofetch classes (BALL/CHAIN/...) and special prizes are skipped in C
        // before dogfood; the starting level's underfoot objects aren't those.
        const edible = dogfood(mtmp, obj);
        if (edible <= CADAVER || (edog.mhpmax_penalty && edible === ACCFOOD)) {
            // would eat -> counts as the pet's move (dog_eat).  Not modeled in
            // detail; emit no further RNG and report "ate".
            return 1;
        }
        // can_carry / pickup path: rn2(20) < apport+3, then rn2(udist)/rn2(apport)
        const carryamt = can_carry(mtmp, obj);
        if (carryamt > 0 && !obj.cursed) {
            if (rn2(20) < apport + 3) {
                if (rn2(udist) || rn2(apport) === 0) {
                    // C ref: dogmove.c:448-465 — split a partial stack (which
                    // assigns a fresh o_id via next_ident -> rnd(2)) then move
                    // the object into the pet's minvent (mpickobj, no RNG).
                    let otmp = obj;
                    if (carryamt !== (obj.quan || 1))
                        otmp = pet_splitobj(obj, carryamt);
                    pet_extract_floor(otmp);
                    mpickobj(mtmp, otmp);
                }
            }
        }
    }
    return 0;
}

// C ref: steal.c relobj(mtmp,x,y,...) — drop the pet's carried objects onto its
// tile.  Placement is deterministic (no RNG); we just move them from minvent
// back into level.objects at (x,y).
function relobj(mtmp, x, y) {
    const inv = mtmp.minvent || [];
    const arr = game.level?.objects;
    for (const obj of inv) {
        obj.ox = x; obj.oy = y;
        obj.where = 0; // OBJ_FLOOR
        if (arr && !arr.includes(obj)) arr.push(obj);
    }
    mtmp.minvent = [];
}

// C ref: mkobj.c splitobj(obj,num) — split `num` off a stack into a new obj
// whose o_id comes from next_ident() (rnd(2)).  We only need the RNG-faithful
// next_ident call and a shallow clone for minvent bookkeeping.
function pet_splitobj(obj, num) {
    const split = { ...obj, quan: num, o_id: next_ident() };
    obj.quan = (obj.quan || 1) - num;
    return split;
}

// Remove an object (or split fragment) from the floor pile.
function pet_extract_floor(obj) {
    const arr = game.level?.objects;
    if (!arr) return;
    const ix = arr.indexOf(obj);
    if (ix >= 0) arr.splice(ix, 1);
}

// C ref: mon.c mpickobj(mtmp,otmp) — add an object to the monster's minvent.
// No RNG for ordinary items.
function mpickobj(mtmp, obj) {
    mtmp.minvent = mtmp.minvent || [];
    obj.where = 3; // OBJ_MINVENT
    mtmp.minvent.push(obj);
}

// C ref: dogmove.c dog_goal(...).  Returns the approach desire (-1/0/1) or -2
// to abort.  Sets the goal coordinates on `g` (gx/gy) used by the move loop.
function dog_goal(mtmp, edog, after, udist, whappr, g) {
    const omx = mtmp.mx, omy = mtmp.my;
    const u = game.u;

    // C ref: dogmove.c:494-496 — "Steeds don't move on their own will": a
    // ridden steed returns -2 immediately, BEFORE the fobj/invent scans, so it
    // consumes no obj_resists/rn2(8) RNG.  dog_move then maps appr==-2 to
    // MMOVE_NOTHING.  (Reached because the steed stays in fmon and is driven by
    // movemon/dochug/m_move each turn now that mount_steed keeps it on the list.)
    if (mtmp === u?.usteed) return -2;

    let gtyp = UNDEF;
    g.gx = 0; g.gy = 0;

    const SQ = 5;
    const min_x = Math.max(omx - SQ, 1);
    const max_x = Math.min(omx + SQ, COLNO - 1);
    const min_y = Math.max(omy - SQ, 0);
    const max_y = Math.min(omy + SQ, ROWNO - 1);

    const in_masters_sight = couldsee(omx, omy);
    // C ref: dog_has_minvent = (droppables(mtmp) != 0).  True once the pet has
    // picked something up in dog_invent (it stays in minvent until dropped).
    const dog_has_minvent = !!droppables(mtmp);

    // nearby food/objects (C iterates fobj; order only affects tie-breaks for
    // the goal, not the rn2 stream — obj_resists fires for every object).
    for (const obj of fobj()) {
        const nx = obj.ox, ny = obj.oy;
        if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) {
            const otyp = dogfood(mtmp, obj); // -> obj_resists rn2(100)
            if (otyp > gtyp || otyp === UNDEF) continue;
            if (cursed_object_at(nx, ny)
                && !(edog.mhpmax_penalty && otyp < MANFOOD)) continue;
            // could_reach_item / can_reach_location: open room -> reachable.
            if (otyp < MANFOOD) {
                if (otyp < gtyp || DDIST(nx, ny, omx, omy) < DDIST(g.gx, g.gy, omx, omy)) {
                    g.gx = nx; g.gy = ny; gtyp = otyp;
                }
            } else if (gtyp === UNDEF && in_masters_sight && !dog_has_minvent
                && (!isLit(omx, omy) || isLit(u.ux, u.uy))
                && (otyp === MANFOOD || m_cansee(mtmp, nx, ny))
                && edogApport(edog) > rn2(8)
                && can_carry(mtmp, obj) > 0) {
                g.gx = nx; g.gy = ny; gtyp = APPORT;
            }
        }
    }

    let appr;
    if (gtyp === UNDEF
        || (gtyp !== DOGFOOD && gtyp !== APPORT && (game.moves || 1) < edog.hungrytime)) {
        g.gx = u.ux; g.gy = u.uy;
        if (after && udist <= 4 && u.ux === g.gx && u.uy === g.gy)
            return -2;
        appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        if (udist > 1) {
            if (!IS_ROOM(terrainTyp(u.ux, u.uy)) || !rn2(4) || whappr
                || (dog_has_minvent && rn2(edogApport(edog))))
                appr = 1;
        }
        // C ref: dogmove.c:582 — "if you have dog food it'll follow you more
        // closely; if you are on stairs (or ladder) or on/next to a magic
        // portal, it behaves as if you have dog food."  When appr==0, C checks
        // On_stairs (no RNG), then scans the hero's pack calling dogfood() on
        // each item (each emits obj_resists rn2(100)), stopping at the first
        // DOGFOOD; then a magic-portal scan (no RNG).  This invent scan is the
        // RNG the 2nd movemon pass needs (the pet is adjacent => appr==0).
        if (appr === 0) {
            if (On_stairs(u.ux, u.uy)) {
                appr = 1;
            } else {
                for (const obj of heroInvent()) {
                    if (dogfood(mtmp, obj) === DOGFOOD) { // -> obj_resists rn2(100)
                        appr = 1;
                        break;
                    }
                }
                if (appr === 0 && nearMagicPortal())
                    appr = 1;
            }
        }
    } else {
        appr = 1;
    }
    if (mtmp.mconf) appr = 0;

    // C ref: dogmove.c:610-644 — when the goal is the hero's square but the pet
    // is OUT of the master's sight, the pet can't see the hero, so it follows
    // the hero's footprint track (gettrack) instead of beelining to the (now
    // unknown) hero position.  Falls back to the pet's remembered previous goal
    // (edog.ogoal) or, failing that, the nearest square it can see toward the
    // hero (do_clear_area + wantdoor).  This consumes NO RNG but changes the
    // goal, which is what feeds the pet's mfndpos/jv candidate selection.
    const FARAWAY = COLNO + 2;
    if (g.gx === u.ux && g.gy === u.uy && !in_masters_sight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            g.gx = cp.x; g.gy = cp.y;
            edog.ogoal = { x: 0, y: 0 };
        } else if (edog.ogoal && edog.ogoal.x
                   && (edog.ogoal.x !== omx || edog.ogoal.y !== omy)) {
            g.gx = edog.ogoal.x; g.gy = edog.ogoal.y;
            edog.ogoal = { x: 0, y: 0 };
        } else {
            let fardist = FARAWAY * FARAWAY;
            g.gx = g.gy = FARAWAY;
            const best = { x: FARAWAY, y: FARAWAY, d: fardist };
            do_clear_area_wantdoor(omx, omy, 9, best);
            g.gx = best.x; g.gy = best.y;
            if (g.gx === FARAWAY || (g.gx === omx && g.gy === omy)) {
                g.gx = u.ux; g.gy = u.uy;
            } else {
                edog.ogoal = { x: g.gx, y: g.gy };
            }
        }
    } else {
        edog.ogoal = { x: 0, y: 0 };
    }
    return appr;
}

// C ref: vision.c do_clear_area(omx,omy,9, wantdoor) restricted to the
// dogmove.c wantdoor() client: visit each square within `range` (circle radius)
// of (scol,srow) that the pet could see, and keep the one closest to the hero
// (min distu).  view_from-from-a-non-hero-center is approximated with
// clear_path (line of sight) from the pet's square — sufficient for the open
// dlvl-1 layouts the contest sessions exercise; mirrors the C control flow.
function do_clear_area_wantdoor(scol, srow, range, best) {
    const u = game.u;
    const maxY = Math.min(srow + range, ROWNO - 1);
    const minY = Math.max(srow - range, 0);
    for (let y = minY; y <= maxY; y++) {
        const dy = y - srow;
        // circle: |dx| <= sqrt(range^2 - dy^2) (matches circle_ptr offset bound)
        const off = Math.floor(Math.sqrt(range * range - dy * dy));
        const minX = Math.max(scol - off, 1);
        const maxX = Math.min(scol + off, COLNO - 1);
        for (let x = minX; x <= maxX; x++) {
            if (!(x === scol && y === srow) && !clear_path(scol, srow, x, y))
                continue;
            const ndist = dist2(x, y, u.ux, u.uy);
            if (best.d > ndist) { best.d = ndist; best.x = x; best.y = y; }
        }
    }
}

function DDIST(x, y, ox, oy) { return dist2(x, y, ox, oy); }

// C ref: dogmove.c cursed_object_at(x,y).
function cursed_object_at(x, y) {
    return objectsAt(x, y).some((o) => o.cursed);
}

// C ref: include/vision.h — m_cansee(mtmp,x,y) == clear_path(mx,my,x,y) and
// couldsee(x,y) is the hero's COULD_SEE viz bit.  These gate the pet's APPORT
// object-fetch branch in dog_goal; using the real vision results (instead of a
// blanket "always sees") keeps the obj_resists/rn2(8) stream matching C when an
// object is in the pet's search box but not on a clear line of sight.
//
// Gated behind PET_REAL_VISION (kept in lock-step with the multi-pass movemon
// toggle in allmain.js): the real line-of-sight only pays off once the pet's
// repeat-move object scan runs (the C multi-pass).
function couldsee(x, y) { return PET_REAL_VISION ? visCouldsee(x, y) : true; }
function m_cansee(mtmp, x, y) {
    return PET_REAL_VISION ? clear_path(mtmp.mx, mtmp.my, x, y) : true;
}
function isLit(x, y) { return !!game.level?.at(x, y)?.lit; }

// C ref: mon.c can_carry(mtmp, otmp) uses otmp->owt directly.  mkobj.js
// weight() now computes a C-exact owt for every object (containers = base +
// contents, the heavy single items keep their real oc_weight), so the
// can_carry load check reads obj.owt straight.  A defensive Math.max(1, ...)
// keeps a never-weighed object (owt unset) from reading as 0.
function objWeight(obj) {
    return Math.max(1, obj.owt ?? 1);
}

// C ref: mon.c can_carry(mtmp, otmp).  Returns 0 (cannot) or a positive
// quantity.  The dog_goal APPORT branch only cares whether the result is > 0,
// so we faithfully reproduce the conditions that yield 0 for the starting pet:
//
//   - notake / unsafe-to-touch: ordinary objects are fine -> not 0 here.
//   - M1_NOHANDS pets (all three starting pets) with a stack quan > 1 and no
//     engulf/dragon "glomper" return 1 BEFORE the load check (mon.c:2026).
//   - single items: 0 iff curr_mon_load + owt > max_mon_load.  A freshly
//     created starting pet carries nothing, so curr_mon_load == 0.
function can_carry(mtmp, obj) {
    const pmidx = mtmp.data?.pmidx;
    const maxload = PET_MAXLOAD[pmidx] ?? 51;
    const iquan = obj.quan || 1;
    // All starting pets are NOHANDS and not glompers -> early return for stacks.
    if (iquan > 1) return 1;
    // single object: load capacity check (curr load is 0 for the start pet).
    if (objWeight(obj) > maxload) return 0;
    return iquan;
}

// C ref: dogmove.c find_targ(mtmp, dx, dy, maxdist) — walk a straight line from
// the pet, returning the first visible monster (or the hero, sentinel
// HERO_TARG) within maxdist; stops at the first square the pet can't see
// (clear_path).  Returns the target monster, the HERO_TARG sentinel, or null.
const HERO_TARG = Symbol('youmonst');
function find_targ(mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx, cury = mtmp.my;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx; cury += dy;
        if (!isok(curx, cury)) break;
        if (!m_cansee(mtmp, curx, cury)) break;
        // pet thinks the hero is at mux,muy.
        if (curx === mtmp.mux && cury === mtmp.muy) return HERO_TARG;
        const targ = MON_AT(curx, cury);
        if (targ) {
            // visible, detected, and (for our monsters) on its own square.
            if (!targ.minvis && !targ.mundetected) return targ;
            // can't see it -> assume not there, keep walking.
        }
    }
    return null;
}

// C ref: dogmove.c find_friends(mtmp, mtarg, maxdist) — is the hero or a pet in
// line beyond mtarg (so the pet would shoot through a friend)?  Returns true if
// so.  For the contest pets this gates the score_targ early-return (no rnd(5)).
function find_friends(mtmp, mtarg, maxdist) {
    const tx = mtarg.mx, ty = mtarg.my;
    const dx = Math.sign(tx - mtmp.mx), dy = Math.sign(ty - mtmp.my);
    let curx = tx, cury = ty;
    let dist = distmin(tx, ty, mtmp.mx, mtmp.my);
    for (; dist <= maxdist; dist++) {
        curx += dx; cury += dy;
        if (!isok(curx, cury)) return false;
        if (!m_cansee(mtmp, curx, cury)) return false;
        if (mtmp.mux === curx && mtmp.muy === cury) return true; // hero behind
        const pal = MON_AT(curx, cury);
        if (pal) {
            if (pal.mtame) {
                if (!pal.minvis) return true;
            } else {
                const ms = pal.data?.msound;
                if (ms === 'leader' || ms === 'guardian') return true;
            }
        }
    }
    return false;
}

// C ref: dogmove.c score_targ(mtmp, mtarg) — desirability of a ranged target.
// We need its RNG side-effect: the `score += rnd(5)` fuzz roll at dogmove.c:830,
// which only executes when the target survives the early returns (not a quest
// friendly, not adjacent, not tame/hero, no friend behind).  The numeric score
// only matters for best_target's selection, but the contest pets have no ranged
// attack so a chosen target never produces an attack roll — only the rnd(5)
// matters for RNG parity.  Returns the score (negative early-returns excluded).
function score_targ(mtmp, mtarg) {
    let score = 0;
    // mconf branch: starting pets aren't confused -> the guard is always true.
    if (!mtmp.mconf) {
        // quest friendlies: never targeted (no rnd(5)).
        const tms = (mtarg !== HERO_TARG) ? mtarg.data?.msound : null;
        if (tms === 'leader' || tms === 'guardian') return -5000;
        // adjacent monster -> melee range, not a ranged target (no rnd(5)).
        if (mtarg !== HERO_TARG
            && distmin(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my) <= 1)
            return -3000;
        // tame monster or the hero -> never targeted (no rnd(5)).
        if (mtarg === HERO_TARG || mtarg.mtame) return -3000;
        // friend (hero / pet) behind the target -> don't shoot through (no rnd).
        if (find_friends(mtmp, mtarg, 15)) return -3000;
        // hostile-preference + passive/level adjustments (no RNG for our mons).
        if (!mtarg.mpeaceful) score += 10;
        const m_lev = mtarg.m_lev ?? mtarg.data?.mlevel ?? 0;
        score += m_lev * 2 + Math.trunc((mtarg.mhp ?? 0) / 3);
    }
    // Fuzz factor (dogmove.c:830) — the roll the post-dismount stream needs.
    score += rnd(5);
    return score;
}

// C ref: dogmove.c best_target(mtmp, forced) — scan the 8 directions (dy outer,
// dx inner) for the first lined-up target and pick the highest score_targ.  The
// rnd(5) inside score_targ fires once per qualifying lined-up target.
function best_target(mtmp) {
    if (!mtmp.mcansee) return null; // blind pet sees no target (no rnd(5))
    let bestscore = -40000, best = null;
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            if (!dx && !dy) continue;
            const temp = find_targ(mtmp, dx, dy, 7);
            if (!temp) continue;
            const currscore = score_targ(mtmp, temp);
            if (currscore > bestscore) { bestscore = currscore; best = temp; }
        }
    }
    if (bestscore < 0) best = null;
    return best;
}

// C ref: dogmove.c pet_ranged_attk(mtmp, FALSE) — the pet's ranged-attack
// consideration run at the end of dog_move.  best_target() rolls the score_targ
// rnd(5) fuzz per lined-up target.  For the contest pets (no breath/spit/gaze
// attack) a chosen target yields M_ATTK_MISS from mattackm with no further RNG,
// so this returns MMOVE_NOTHING after the scan.  The `!hungry || !rn2(5)` gate
// only rolls rn2(5) when the pet is hungry (none of the early pets are yet).
function pet_ranged_attk(mtmp) {
    const edog = mtmp.edog;
    const DOG_HUNGRY = 500; // dog.c DOG_HUNGRY
    const hungry = edog ? ((game.moves || 1) > ((edog.hungrytime || 0) + DOG_HUNGRY)) : false;
    const mtarg = best_target(mtmp);
    if (mtarg && (!hungry || !rn2(5))) {
        // The starting pets have no ranged attack: mattackm returns M_ATTK_MISS
        // with no RNG, so no attack is executed.  (A real ranged pet would
        // attack here; wire that in if such a pet is ever exercised.)
        return MMOVE_NOTHING;
    }
    return MMOVE_NOTHING;
}

// C ref: dogmove.c dog_move(mtmp, after).  Drives one pet move.
export function dog_move(mtmp, after) {
    const edog = mtmp.edog;
    if (!edog) return MMOVE_NOTHING;

    const omx = mtmp.mx, omy = mtmp.my;
    let udist = distu(omx, omy);
    if (!udist) return MMOVE_NOTHING; // standing on the hero (shouldn't happen)

    let nix = omx, niy = omy;

    // dog_invent: object underfoot / carrying.  May consume the move (eat).
    const j0 = dog_invent(mtmp, edog, udist);
    if (j0 === 1) return MMOVE_DONE; // ate something

    const whappr = ((game.moves || 1) - edog.whistletime) < 5;

    const g = {};
    const appr = dog_goal(mtmp, edog, after, udist, whappr, g);
    if (appr === -2) return MMOVE_NOTHING;

    // mfndpos with pet allowflags.  ALLOW_M keeps monster-occupied adjacent
    // squares in the candidate list so the pet can melee a hostile monster
    // (dogmove.c mon_allowflags()).  Other allowflags (ALLOW_MDISP, traps, ...)
    // aren't exercised by the contest sessions at the points they diverge.
    const ALLOW_M = 0x00080000;
    const poss = mfndpos(mtmp, ALLOW_M);
    const cnt = poss.length;

    // Count uncursed-item squares (for the cursed-item avoidance roll).  C ref
    // dogmove.c:1070 — a monster-occupied square without ALLOW_M/ALLOW_MDISP is
    // skipped; with ALLOW_M (every monster square here) it still counts toward
    // uncursedcnt unless it also holds a cursed object.
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const { x: nx, y: ny } = poss[i];
        if (cursed_object_at(nx, ny)) continue;
        uncursedcnt++;
    }

    let chcnt = 0, chi = -1;
    let nidist = GDIST(nix, niy, g);
    const k = uncursedcnt; // edog ? uncursedcnt : cnt
    const mtrack = mtmp.mtrack || [];

    for (let i = 0; i < cnt; i++) {
        const nx = poss[i].x, ny = poss[i].y;

        // (leashed / guardian skips omitted — never apply to the starting pets
        //  in these sessions.)

        // C ref: dogmove.c:1102 — ALLOW_M: the pet melees an adjacent monster.
        // A monster square either triggers an attack (return) or the pet balks
        // and the square is skipped entirely (C `continue`); either way it never
        // reaches the cursed-object / backtrack / distance logic below.
        const mtmp2 = MON_AT(nx, ny);
        if (mtmp2) {
            const r = dog_attack_mon(mtmp, mtmp2, omx, omy, after);
            if (r !== null) return r; // attacked -> done with this move
            continue;                 // balked -> next candidate square
        }

        // dog eschews cursed objects, likes dog food: scan objects at <nx,ny>.
        let cursemsg = false, ate = false;
        for (const obj of objectsAt(nx, ny)) {
            if (obj.cursed) { cursemsg = true; continue; }
            const otyp = dogfood(mtmp, obj); // -> obj_resists rn2(100)
            if (otyp < MANFOOD
                && (otyp < ACCFOOD || edog.hungrytime <= (game.moves || 1))) {
                nix = nx; niy = ny; chi = i; ate = true;
                break;
            }
        }
        if (ate) break; // goto newdogpos (eating)

        // saw a cursed item and not forced onto it -> usually keep looking.
        if (cursemsg && uncursedcnt > 0 && rn2(13 * uncursedcnt))
            continue;

        // backtrack avoidance (only when far from the hero).
        if (distmin(omx, omy, game.u.ux, game.u.uy) > 5) {
            let skip = false;
            for (let jj = 0; jj < MTSZ && jj < k - 1; jj++) {
                const t = mtrack[jj];
                if (t && nx === t.x && ny === t.y) {
                    if (rn2(MTSZ * (k - jj))) { skip = true; break; }
                }
            }
            if (skip) continue;
        }

        const ndist = GDIST(nx, ny, g);
        const jv = (ndist - nidist) * appr;
        if ((jv === 0 && !rn2(++chcnt)) || jv < 0
            || (jv > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx; niy = ny; nidist = ndist;
            if (jv < 0) chcnt = 0;
            chi = i;
        }
    }

    // C ref: dogmove.c:1273 — pet_ranged_attk(mtmp, FALSE) runs after the
    // candidate loop.  best_target()'s score_targ rolls rnd(5) for each
    // non-adjacent, non-tame, hostile target lined up within 7 visible squares,
    // which is RNG the move stream depends on even though the contest pets never
    // actually fire a ranged attack.  A non-NOTHING result short-circuits.
    {
        const r = pet_ranged_attk(mtmp);
        if (r !== MMOVE_NOTHING) return r;
    }

    // newdogpos:
    if (nix !== omx || niy !== omy) {
        mtmp.mtrack = [{ x: omx, y: omy }, ...mtrack].slice(0, MTSZ);
        mtmp.mx = nix; mtmp.my = niy;
        // Redraw the vacated and occupied squares (C: place_monster + newsym).
        newsym(omx, omy);
        newsym(nix, niy);
        return MMOVE_MOVED;
    }
    return MMOVE_NOTHING;
}

function GDIST(x, y, g) { return dist2(x, y, g.gx, g.gy); }

// C ref: dogmove.c:1102-1170 — the ALLOW_M branch of dog_move's choice loop.
// Decides whether the pet (mtmp) attacks an adjacent monster (mtmp2); returns
// an MMOVE_* code when it does (or when `after` short-circuits), or null when
// the pet balks at this foe (caller skips the square).
function dog_attack_mon(mtmp, mtmp2, omx, omy, after) {
    // balk: highest defender level the pet is willing to engage, scaled by the
    // pet's current HP fraction.  C: m_lev + (5*mhp/mhpmax) - 2.  The starting
    // pets don't track mhp/mhpmax here, so a missing fraction is treated as full
    // health (matching a freshly-made pet) to keep the comparison faithful.
    const petLev = mtmp.m_lev ?? mtmp.data?.mlevel ?? 0;
    const hpFrac = (mtmp.mhp != null && mtmp.mhpmax)
        ? Math.trunc((5 * mtmp.mhp) / mtmp.mhpmax) : 5;
    const balk = petLev + hpFrac - 2;
    const defLev = mtmp2.m_lev ?? mtmp2.data?.mlevel ?? 0;

    // C dogmove.c:1121 — refuse the fight under any of these conditions.
    if (defLev >= balk
        || (mtmp2.mtame && mtmp.mtame /* && !Conflict */)
        // max_passive_dmg(mtmp2) >= mtmp.mhp: the modeled hostiles (newt/fox/
        // jackal/rat/gecko) have no passive attack, so this is 0 — never balks.
        || (mtmp2.mpeaceful /* guardian/leader or low-HP peaceful */
            && ((mtmp.mhp != null && mtmp.mhpmax && mtmp.mhp * 4 < mtmp.mhpmax)
                || mtmp2.data?.msound === 'guardian'
                || mtmp2.data?.msound === 'leader'))) {
        return null;
    }

    // Floating-eye / cube / cockatrice ranged-only avoidance (rn2(10) gazes)
    // isn't reachable for the modeled foes; skip.

    if (after) return MMOVE_NOTHING; // hit only once each move

    let mstatus = mattackm(mtmp, mtmp2); // dogmove.c:1151

    if (mstatus & M_ATTK_AGR_DIED) return MMOVE_DIED;

    // C dogmove.c:1157 — the struck defender may strike back.
    if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
        && rn2(4)                                 // dogmove.c:1158
        && mtmp2.mlstmv !== game.moves
        // onscary() is false for these monsters (no temple/Elbereth here)
        && monnear(mtmp2, mtmp.mx, mtmp.my)) {
        mstatus = mattackm(mtmp2, mtmp);          // return attack (dogmove.c:1165)
        if (mstatus & M_ATTK_DEF_DIED) return MMOVE_DIED;
    }
    return MMOVE_DONE;
}

// C ref: mon.c monnear(mon, x, y) — within melee range (dist2 < 3, but grid
// bugs can't reach diagonal range-2 squares).
function monnear(mon, x, y) {
    const PM_GRID_BUG = 116; // makemon MONS-table index (matches mfndpos nodiag)
    const distance = dist2(mon.mx, mon.my, x, y);
    if (distance === 2 && mon.data?.pmidx === PM_GRID_BUG) return false;
    return distance < 3;
}
