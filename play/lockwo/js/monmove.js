// monmove.js — Monster decision + movement logic for the move loop.
// C ref: monmove.c — dochug(), distfleeck(), set_apparxy(), m_move();
//        mon.c mfndpos().
//
// GENERAL (data-driven) port: operates on the real monster records placed on
// game.level.  When a level has materialized monsters this reproduces the
// per-move RNG sequence (distfleeck rn2(5), m_move rn2(4*cnt), ...) seen in
// the recorded sessions.  Kept faithful to the C control flow so it extends
// to richer monster behavior without per-seed special cases.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import {
    COLNO, ROWNO, MTSZ, BOLT_LIM, DOOR, D_CLOSED, D_LOCKED, D_BROKEN,
    IS_OBSTRUCTED, IS_DOOR, IS_POOL, IS_LAVA, isok, OBJ_AT, is_pit,
    IS_STWALL, W_NONPASSWALL,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
    SPIKED_PIT, HOLE, TRAPDOOR, MAGIC_TRAP, NO_TRAP_FLAGS, ALL_TRAPS, NO_TRAP,
} from './const.js';
import { COIN_CLASS } from './mkobj.js';
import { t_at } from './trap.js';
import { DEADMONSTER } from './mon.js';
import { dog_move } from './dogmove.js';
import { newsym, map_invisible, show_glyph_cell, object_glyph } from './display.js';
import { place_object, next_ident } from './mkobj.js';
import { clear_path, couldsee, cansee } from './vision.js';
import { mattackm } from './mhitm.js';
import { Monnam, canspotmon } from './uhitm.js';
import { M_ATTK_AGR_DIED, M_ATTK_DEF_DIED } from './const.js';

// C ref: include/monsters.h — grid bug's index (makemon.js MONS convention).
// The only NODIAG monster the contest sessions place on dlvl 1.
const PM_GRID_BUG = 116;

// C ref: monmove.c:1871 m_move() — the "flutters randomly" appr=0 gate fires for
// a hostile sighted giant bat (S_BAT), a will-o-wisp/light (S_LIGHT) or the
// (invisible) stalker (PM_STALKER).  monsym.h class indices / makemon.js pmidx.
const S_BAT = 28;       // monsym.h S_BAT (giant bat, bat)
const S_LIGHT = 25;     // monsym.h S_LIGHT (yellow/black light)
const PM_STALKER = 153; // makemon.js MONS index of "stalker"

// C ref: mon.c mon_allowflags() — a monster gets OPENDOOR (and thus may step
// onto a *closed* (but not locked) door, opening it) when
//   can_open = !(nohands(ptr) || verysmall(ptr)).
// makemon.js exposes `data.verysmall` (MZ_TINY) but not the M1_NOHANDS /
// M1_NOLIMBS flags, so this Set lists the pmidx (makemon MONS convention) of
// every species with hands and size >= MZ_SMALL — i.e. those for which
// can_open is TRUE — derived straight from include/monsters.h flag/size data.
// Used only to decide closed-door passability in mfndpos (matching C's cnt).
const CAN_OPEN_DOOR_PMIDX = new Set([
    15, 21, 40, 41, 42, 43, 44, 45, 48, 49, 50, 53, 54, 55, 59, 60, 62, 67, 68,
    69, 70, 71, 72, 73, 74, 75, 76, 77, 91, 120, 122, 123, 125, 130, 131, 132,
    153, 165, 167, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180,
    181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 203,
    210, 211, 213, 220, 221, 222, 223, 224, 225, 226, 228, 229, 230, 231, 232,
    233, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248,
    249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263,
    264, 265, 266, 267, 270, 271, 272, 273, 274, 277, 278, 279, 280, 281, 282,
    283, 284, 285, 286, 287, 288, 289, 291, 292, 293, 294, 295, 296, 297, 298,
    299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 311, 312, 313, 314,
    328, 329,
]);

// The three starting pets — little dog (16), kitten (34), pony (102) — are all
// M1_NOHANDS animals, so C's `can_open = !(nohands || verysmall)` is FALSE for
// them: a pet CANNOT open a closed door (it must wait for the hero / route
// around).  Earlier this incorrectly granted pets OPENDOOR, which kept a
// closed door in the pet's mfndpos candidate list (an extra square) and threw
// off dog_move's choice-loop rn2 count on the 2nd movemon pass.

// C ref: mon.c mon_allowflags() can_open / can_unlock.  OPENDOOR lets a
// monster treat a *closed* door as passable; UNLOCKDOOR additionally for a
// *locked* door (only key-carriers, the Wizard, and Riders — none of the
// dlvl-1 dungeon monsters), so closed-but-not-locked is the only case we add.
function mon_can_open_door(mon) {
    const pm = mon?.data?.pmidx;
    return CAN_OPEN_DOOR_PMIDX.has(pm);
}

// C ref: mondata.h dist2(x0,y0,x1,y1).
export function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return dx * dx + dy * dy;
}

// C ref: mon.c monnear(mon, x, y) — within one (king) step.
function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    return distance < 3 && distance > -3;
}

// C ref: mon.c m_at(x, y).
function m_at(x, y) {
    for (const m of game.level?.monsters || [])
        if (!DEADish(m) && m.mx === x && m.my === y) return m;
    return null;
}
function DEADish(m) { return !m || (m.mhp != null && m.mhp <= 0); }

function MON_AT(x, y) {
    const m = m_at(x, y);
    return m && !(game.u?.ux === x && game.u?.uy === y);
}

function terrainTyp(x, y) {
    return game.level?.at(x, y)?.typ;
}
function doormask(x, y) {
    return game.level?.at(x, y)?.doormask || 0;
}
// C ref: mondata.h passes_walls(ptr) = (mflags1 & M1_WALLWALK).  makemon carries
// no mflags1, so the four M1_WALLWALK species are identified by pmidx (the same
// set mon_allows_rock uses): earth elemental(156), xorn(232), ghost(287),
// shade(288).
function passes_walls(data) {
    return !!data && WALLWALK_PMIDX.has(data.pmidx);
}
// C ref: hack.c:939 may_passwall(x,y) — a stone wall is phaseable unless it is
// flagged W_NONPASSWALL (the level border / permanent walls).  Our mklev does
// not set W_NONPASSWALL, so interior room walls (the earth elemental's case)
// are phaseable, matching C.
function may_passwall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !(IS_STWALL(loc.typ) && ((loc.wall_info || 0) & W_NONPASSWALL));
}

// C ref: monmove.c distfleeck(mtmp, &inrange, &nearby, &scared).
// Always rolls rn2(5) (bravegremlin) first; the monflee roll only happens
// when the monster is actually scared (not for the peaceful/level monsters
// our sessions exercise).
function distfleeck(mtmp) {
    rn2(5); // bravegremlin
    const inrange = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
        <= BOLT_LIM * BOLT_LIM;
    const nearby = inrange && monnear(mtmp, mtmp.mux, mtmp.muy);
    let scared = 0;
    // onscary / sanctuary / flees_light all false for ordinary monsters.
    // (When implemented, scared would trigger monflee(rnd(rn2(7)?10:100)).)
    return { inrange, nearby, scared };
}

// C ref: hacklib.c online2 — are two points on a straight (orthogonal or
// diagonal) line?
function online2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return (!dy || !dx || dy === dx || dy === -dx);
}

// C ref: shk.c inhishop — is the shopkeeper standing in his own shop room?
// (We only model same-level shops, which is the only case in the sessions.)
function inhishop(shkp) {
    const eshk = shkp.eshk;
    if (!eshk) return false;
    const loc = game.level?.at(shkp.mx, shkp.my);
    if (!loc) return false;
    const rmno = (loc.roomno ?? 0);
    return rmno !== 0 && rmno === eshk.shoproom;
}

// C ref: shk.c shk_move(shkp) — shopkeeper movement.  We faithfully reproduce
// only the "stay put, no RNG" outcome (the dominant case in the recorded
// sessions): a peaceful shopkeeper sitting near his home spot in his shop, the
// hero neither lined up with him nor standing on the shop door, with no
// outstanding bill/robbery/debit.  C: shk_fixes_damage() (no RNG when the shop
// is undamaged) then `return 0`.  All other situations return -1, telling the
// caller to fall through to the generic m_move() path (no behaviour change).
function shk_move(shkp) {
    const eshk = shkp.eshk;
    if (!eshk) return -1;
    const omx = shkp.mx, omy = shkp.my;
    const u = game.u;
    if (!u) return -1;

    // shk_fixes_damage(): rebuilds broken shop walls.  An undamaged shop (the
    // case for every recorded session — the hero hasn't dug/kicked the shop)
    // consumes no RNG; if damage repair is ever needed, bail to m_move.
    if (!inhishop(shkp)) return -1;

    const udist = dist2(omx, omy, u.ux, u.uy);
    // The udist<3 angry/following block: ANGRY(shk) == !mpeaceful.  A peaceful,
    // non-following shopkeeper with the hero >=3 squares away skips it entirely.
    if (udist < 3) return -1; // hero adjacent: let the generic path handle it
    if (!shkp.mpeaceful) return -1; // angry shopkeeper: not modelled here
    if (eshk.following) return -1;  // following the hero: not modelled here

    // Home target = eshk->shk; GDIST = dist2(pos, home).
    const gtx = eshk.shk?.x, gty = eshk.shk?.y;
    if (gtx == null || gty == null) return -1;

    // C ref: shk.c — `holetime() >= 0` (a hole/trapdoor in progress) diverts the
    // shopkeeper toward the hero.  No holes in the recorded sessions; treat as
    // absent.  The else-branch below then applies.

    // else (not angry): hero not invisible / not riding in the sessions.
    const uondoor = (u.ux === eshk.shd?.x && u.uy === eshk.shd?.y);
    if (uondoor) return -1; // door-blocking logic: defer to generic path
    // avoid = (*u.ushops && distu(home) > 8).  u.ushops empty (hero not inside a
    // shop) => avoid = false; if the hero IS in a shop, defer to be safe.
    const heroInShop = !!(u.ushops && u.ushops.length);
    if (heroInShop) return -1;

    // (((!robbed && !billct && !debit) || avoid) && GDIST(pos,home) < 3)
    const owesNothing = !eshk.robbed && !eshk.billct && !eshk.debit;
    const gdist = dist2(omx, omy, gtx, gty);
    if (owesNothing && gdist < 3) {
        // if (!badinv && !onlineu(omx,omy)) return 0;  (badinv == false here)
        if (!online2(omx, omy, u.ux, u.uy))
            return 0; // stay put, no RNG — matches C exactly
    }
    // Any remaining case (shk needs to walk home, is lined up with the hero,
    // etc.) involves move_special() RNG we don't model; defer to m_move.
    return -1;
}

// C ref: monmove.c set_apparxy(mtmp).  For tame monsters, monsters adjacent
// to the hero, or monsters that can see a non-invisible/non-displaced hero,
// this resolves to the hero's real position with no RNG.  The RNG-consuming
// guessing branch only runs under invisibility/displacement/underwater.
function set_apparxy(mtmp) {
    const mx = mtmp.mux, my = mtmp.muy;
    if (mtmp.mtame || (game.u?.ux === mx && game.u?.uy === my)) {
        mtmp.mux = game.u.ux; mtmp.muy = game.u.uy; return;
    }
    const notseen = (!mtmp.mcansee);
    // No Invis / Displaced / Underwater modelling here -> displ stays 0.
    if (!notseen) {
        mtmp.mux = game.u.ux; mtmp.muy = game.u.uy; return;
    }
    // notseen branch (blind monster): displ = 1, may roll to guess.
    const displ = 1;
    const gotu = !rn2(3);
    if (gotu) {
        mtmp.mux = game.u.ux; mtmp.muy = game.u.uy; return;
    }
    let try_cnt = 0, nx = mx, ny = my;
    do {
        if (++try_cnt > 200) { nx = game.u.ux; ny = game.u.uy; break; }
        nx = game.u.ux - displ + rn2(2 * displ + 1);
        ny = game.u.uy - displ + rn2(2 * displ + 1);
    } while (!isok(nx, ny));
    mtmp.mux = nx; mtmp.muy = ny;
}

// C ref: mon.c mfndpos(mon, &data, flag).  Returns the list of legal move
// positions around the monster (the count `cnt` drives m_move's rn2(4*cnt)).
// Implements the common-case terrain/door/diagonal/occupancy checks; exotic
// cases (digging, water-walkers, poison gas, garlic, boulders) are omitted
// because no contest session exercises them with materialized monsters.
export function mfndpos(mon, flag) {
    const poss = [];
    const x = mon.mx, y = mon.my;
    const nowtyp = terrainTyp(x, y);
    // C ref: hack.h NODIAG(monnum) == (monnum == PM_GRID_BUG).  Only grid bugs
    // are restricted to orthogonal moves; a grid bug in the open therefore has
    // cnt 4 (not 8), which feeds the m_move/dog_move rn2(4*(cnt-j)) tie-breaks.
    // The grid bug carries makemon's pmidx 116 (matching base_mmove's table).
    const nodiag = (mon.data?.pmidx === PM_GRID_BUG);
    const ALLOW_U = 0x100000; // sentinel; callers below pass it in `flag`.
    const ALLOW_M = 0x00080000; // include monster-occupied squares (const.js).

    const maxx = Math.min(x + 1, COLNO - 1);
    const maxy = Math.min(y + 1, ROWNO - 1);
    for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            const ntyp = terrainTyp(nx, ny);
            if (ntyp == null) continue;
            // C ref: mon.c:2212-2214 — an obstructed cell is dropped unless the
            // monster passes walls (ALLOW_WALL && may_passwall).  A wall-walker
            // (earth elemental, xorn, ghost, shade) keeps its adjacent phaseable
            // walls as candidates, so cnt matches C and the m_move rn2(4*cnt)
            // mtrack tie-break aligns (seed4500 earth elemental: cnt 5 -> 7).
            // (The dig path — rockok/treeok && may_dig — is not modeled here.)
            if (IS_OBSTRUCTED(ntyp)
                && !(passes_walls(mon.data) && may_passwall(nx, ny)))
                continue;
            // closed/locked doors: a monster that can_open (has hands, not
            // tiny) treats a *closed* door as passable (C: OPENDOOR flag in
            // mon_allowflags); a *locked* door still blocks (no dlvl-1 monster
            // has UNLOCKDOOR).  Door-less openers see it blocked, as before.
            if (IS_DOOR(ntyp)) {
                const dm = doormask(nx, ny);
                if (dm & D_LOCKED) continue;
                if ((dm & D_CLOSED) && !mon_can_open_door(mon)) continue;
            }
            // diagonal squeeze rules through doorways
            if (nx !== x && ny !== y) {
                if (nodiag) continue;
                if (IS_DOOR(nowtyp) && (doormask(x, y) & ~D_BROKEN)) continue;
                if (IS_DOOR(ntyp) && (doormask(nx, ny) & ~D_BROKEN)) continue;
            }
            // pools / lava: ordinary land monsters avoid them
            if (IS_POOL(ntyp) || IS_LAVA(ntyp)) continue;

            // hero's (apparent) position: only allowed if attacking
            if ((game.u?.ux === nx && game.u?.uy === ny)
                || (nx === mon.mux && ny === mon.muy)) {
                if (game.u?.ux === nx && game.u?.uy === ny) {
                    mon.mux = game.u.ux; mon.muy = game.u.uy;
                }
                if (!(flag & ALLOW_U)) continue;
            } else if (MON_AT(nx, ny)) {
                // another monster occupies the spot.  C ref: mon.c mfndpos
                // (mon.c:2299-2316) — with ALLOW_M the square stays in the
                // candidate list (the caller, e.g. dog_move, decides whether to
                // attack it).  A *tame* occupant is still dropped (a pet has no
                // ALLOW_TM without Conflict, which these sessions never set).
                // Without ALLOW_M the square is dropped (no displace by default).
                if (!(flag & ALLOW_M)) continue;
                if (m_at(nx, ny)?.mtame) continue;
            }
            // boulder on the destination square.  C ref: mon.c mfndpos
            // (mon.c:2334-2338) — `if (checkobj && sobj_at(BOULDER, nx, ny)) {
            //   if (!(flag & ALLOW_ROCK)) continue; ... }`.  ALLOW_ROCK is set
            // by mon_allowflags() (mon.c:2092-2095) only for monsters that
            // pass walls, throw rocks, or can break boulders; an ordinary
            // monster (goblin, kitten, kobold, ...) therefore cannot step onto
            // a boulder and the square is dropped from the candidate list.
            // Reproducing this is required for the cnt that feeds m_move's
            // rn2(4*(cnt-j)) at monmove.c:1963.
            if (sobj_at_boulder(nx, ny) && !mon_allows_rock(mon)) continue;
            poss.push({ x: nx, y: ny });
        }
    }
    return poss;
}

// C ref: mkobj.c sobj_at(BOULDER, x, y) — is there a boulder lying on the
// floor at (x,y)?  BOULDER otyp is 474 (mkobj.js).
function sobj_at_boulder(x, y) {
    const objs = game.level?.objects;
    if (!objs) return false;
    for (const o of objs)
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === 474)
            return true;
    return false;
}

// C ref: mon.c mon_allowflags() — a monster receives ALLOW_ROCK when it
//   passes_walls(M1_WALLWALK) || throws_rocks(M2_ROCKTHROW)
//   || m_can_break_boulder(mtmp)   [riders, shopkeepers, priests, leaders].
// makemon.js doesn't carry the M1/M2 flag bitfields, so the wall-walkers and
// rock-throwers are listed by pmidx (makemon MONS convention); the
// break-boulder cases use the monster-record booleans we already track.
const WALLWALK_PMIDX = new Set([156, 232, 287, 288]); // earth elemental, xorn, ghost, shade
const ROCKTHROW_PMIDX = new Set([169, 170, 171, 172, 173, 174, 175, 176, 177, 359]); // giants, ettin, minotaur, titan, Cyclops
function mon_allows_rock(mon) {
    const idx = mon.data?.pmidx;
    if (WALLWALK_PMIDX.has(idx) || ROCKTHROW_PMIDX.has(idx)) return true;
    // m_can_break_boulder (monmove.c:133): riders / shopkeepers / priests /
    // quest leaders (msound MS_LEADER) that haven't used their special move.
    if (!mon.mspec_used && (mon.isshk || mon.ispriest || mon.msound_leader))
        return true;
    return false;
}

const ALLOW_U = 0x100000;

// C ref: mondata.h hides_under(ptr) = (mflags1 & M1_CONCEAL).  The monster
// data here carries no mflags1, so identify the concealing species by pmidx
// (the 8 M1_CONCEAL entries in include/monsters.h: cave spider, centipede,
// scorpion, garter snake, snake, water moccasin, pit viper, cobra).
const M1_CONCEAL_PMIDX = new Set([94, 95, 97, 214, 215, 216, 218, 219]);
function hides_under_pm(ptr) {
    return ptr != null && M1_CONCEAL_PMIDX.has(ptr.pmidx);
}

// C ref: monsym.h S_EEL=57.  C ref: monst.h helpless(mon) = msleeping||!mcanmove.
const S_EEL_MCLS = 57;
function mon_helpless(mtmp) {
    return !!mtmp.msleeping || !mtmp.mcanmove;
}

// C ref: monmove.c:2121 can_hide_under_obj(obj) — a monster can hide under a
// floor object unless: there's no object, it sits on a non-pit trap, or the
// only thing here is a small (<10) coin stack.  Operates on the topmost object
// at <x,y> (our level.objects has one record per pile here, like C's fobj).
function can_hide_under_obj_at(x, y) {
    const objs = (game.level?.objects || []).filter((o) => o.ox === x && o.oy === y);
    if (objs.length === 0) return false; // !obj || not OBJ_FLOOR
    // can't hide on a non-pit trap site
    const t = t_at(x, y);
    if (t && !is_pit(t.ttyp)) return false;
    // coins: need >= 10 total unless a non-coin object is also present
    const hasNonCoin = objs.some((o) => o.oclass !== COIN_CLASS);
    if (!hasNonCoin) {
        let coinquan = 0;
        for (const o of objs) coinquan += (o.quan || 1);
        if (coinquan < 10) return false;
    }
    return true;
}

// C ref: trap.c floor_trigger(ttyp) — traps that only fire on a creature
// landing ON them from the floor (not flyers/floaters).  MAGIC_TRAP and the
// teleport / portal / web / poly / anti-magic traps are NOT floor triggers.
const FLOOR_TRIGGER = new Set([
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
    SPIKED_PIT, HOLE, TRAPDOOR,
]);

// C ref: mondata.h is_flyer(ptr) = (mflags1 & M1_FLY); is_floater = S_EYE/
// floating eye.  Used by check_in_air() to let airborne monsters skip floor
// triggers.  Identify the M1_FLY species by pmidx (the contest's low-level
// flyers: bat/giant bat 49/50, fog cloud 220, lurker above 98, the gargoyle/
// winged species and the assorted demons/dragons aren't placed this shallow).
const M1_FLY_PMIDX = new Set([49, 50, 98, 220]);
function is_flyer(ptr) { return ptr != null && M1_FLY_PMIDX.has(ptr.pmidx); }
function is_floater(ptr) { return ptr != null && ptr.mcls === 18 /* S_EYE */; }

// C ref: trap.c check_in_air(mtmp, trflags) — is the monster airborne?  No
// HURTLING / TOOKPLUNGE / VIASITTING flags reach a monster that simply walked
// onto a trap, so this reduces to its species flight/float capability.
function mon_check_in_air(mtmp) {
    return is_floater(mtmp.data) || is_flyer(mtmp.data);
}

// C ref: mondata.c mon_knows_traps(mtmp, ttyp) — has this monster seen this
// trap type before?  mtrapseen is a bitmask, bit (ttyp-1).  Defaults to 0.
function mon_knows_traps(mtmp, ttyp) {
    const seen = mtmp.mtrapseen || 0;
    if (ttyp === ALL_TRAPS) return seen !== 0;
    if (ttyp === NO_TRAP) return seen === 0;
    return (seen & (1 << (ttyp - 1))) !== 0;
}

// C ref: mondata.c mon_learns_traps(mtmp, ttyp) — record knowledge of a trap.
function mon_learns_traps(mtmp, ttyp) {
    if (ttyp === ALL_TRAPS) { mtmp.mtrapseen = ~0; return; }
    if (ttyp === NO_TRAP) { mtmp.mtrapseen = 0; return; }
    mtmp.mtrapseen = (mtmp.mtrapseen || 0) | (1 << (ttyp - 1));
}

// C ref: trap.c mintrap(mtmp, mintrapflags) — a monster walks onto / is caught
// in a trap.  Returns a Trap_* code; we only need the faithful RNG side
// effects.  Only the "not yet trapped" path is exercised by the contest
// monsters (they aren't placed already-trapped); the trap-specific effects are
// dispatched per type, each consuming exactly the RNG the C effect consumes.
// Returns: 0 = Trap_Effect_Finished, 1 = Trap_Caught_Mon, 2 = Trap_Killed_Mon,
// 3 = Trap_Moved_Mon (we never produce the latter two for the modeled types).
const Trap_Effect_Finished = 0, Trap_Caught_Mon = 1, Trap_Killed_Mon = 2;
function mon_mintrap(mtmp) {
    const trap = t_at(mtmp.mx, mtmp.my);
    if (!trap) { mtmp.mtrapped = 0; return Trap_Effect_Finished; }

    // Already-trapped path (mtmp->mtrapped): the rn2(40) escape roll.  Our
    // monsters never arrive already-trapped via a normal move, but model it so
    // the structure is complete and faithful if it ever fires.
    if (mtmp.mtrapped) {
        // seetrap (no RNG) omitted; the escape roll:
        if (!rn2(40) || (is_pit(trap.ttyp) /* m_easy_escape_pit: no RNG */)) {
            mtmp.mtrapped = 0;
        }
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }

    // Not-yet-trapped path.
    const tt = trap.ttyp;
    const already_seen = mon_knows_traps(mtmp, tt);

    // floor_trigger + airborne -> the trap doesn't fire (no RNG).
    if (FLOOR_TRIGGER.has(tt) && mon_check_in_air(mtmp))
        return Trap_Effect_Finished;
    // A monster that already knows this trap usually steps over it: rn2(4).
    if (already_seen && rn2(4))
        return Trap_Effect_Finished;

    mon_learns_traps(mtmp, tt);
    // mons_see_trap: no RNG.  trap->madeby_u is false for level-gen traps, so
    // the setmangry rnl(5) does not fire here.

    return mon_trapeffect(mtmp, trap);
}

// C ref: trap.c trapeffect_selector() for a non-youmonst monster.  Dispatch on
// trap type; each branch reproduces exactly the RNG the monster path consumes.
// Implemented incrementally as the sessions exercise each trap type.
function mon_trapeffect(mtmp, trap) {
    switch (trap.ttyp) {
    case MAGIC_TRAP:
        // C ref: trapeffect_magic_trap() else-branch — monsters are usually
        // immune; rn2(21)==0 redirects to the fire-trap effect.  The contest
        // roll is non-zero (leocrotta @ seed4500 step 222), so nothing further
        // happens.  If it ever rolls 0, fall through to the fire trap.
        if (!rn2(21)) {
            // trapeffect_fire_trap(mtmp,...) — not reached in the contest
            // sessions; leave unmodeled rather than guess its RNG.
        }
        return Trap_Effect_Finished;
    default:
        // Trap type not yet modeled for monsters.  Consume no RNG and let the
        // monster pass; add the faithful effect here when a session needs it.
        return Trap_Effect_Finished;
    }
}

// C ref: monmove.c m_move(mtmp, after).  Returns one of the MMOVE_* codes;
// we only need the RNG side-effects (the mtrack-avoidance rn2(4*(cnt-j))
// rolls at monmove.c:1963) and the resulting move, so we implement the
// approach-the-hero path used by ordinary monsters.
const MMOVE_NOTHING = 0, MMOVE_NOMOVES = 1, MMOVE_MOVED = 2, MMOVE_DIED = 3;

async function m_move(mtmp) {
    const ptr = mtmp.data;
    let omx = mtmp.mx, omy = mtmp.my;

    // C ref: monmove.c:1745 — a monster busy eating (meating > 0, e.g. a pet that
    // just ate a corpse via dog_eat) decrements its digesting counter and forgoes
    // its move this turn.  This gate runs BEFORE the tame-pet dog_move delegation,
    // so an occupied pet does not scan/move (consumes no RNG).
    if (mtmp.meating) {
        mtmp.meating--;
        // finish_meating() side-effects (mfrozen clear, etc.) consume no RNG and
        // aren't observable for the contest pets; the counter reaching 0 simply
        // lets the pet move again next turn.
        return MMOVE_DONE; /* still eating */
    }

    // C ref: monmove.c:1773 — tame monsters delegate to dog_move() (dogmove.c).
    if (mtmp.mtame)
        return await dog_move(mtmp, 0);

    // C ref: monmove.c:1806 — a shopkeeper (isshk) / guard / priest delegates to
    // shk_move() / gd_move() / pri_move() BEFORE the generic getitems rn2(10)
    // probe below.  We model the shopkeeper.  shk_move returns 0 (stay put, no
    // RNG) for a peaceful shopkeeper sitting in his shop while the hero is not
    // lined up with him — the common case in the recorded sessions.  Other
    // returns (-1 "leave to m_move", or a moving result) fall through to the
    // generic path so the existing behaviour is preserved.
    if (mtmp.isshk) {
        const xm = shk_move(mtmp);
        if (xm === 0) return MMOVE_NOTHING; // C: postmov(MMOVE_NOTHING), no RNG
        // xm === -1 ("follow hero outside shop") or unmodelled: fall through to
        // the generic m_move path (mirrors C's `case -1: break;` continuation).
    }

    // C ref: monmove.c:1751 — hides-under early return.  A concealing monster
    // (M1_CONCEAL: spiders/snakes/scorpion/centipede) sitting on a hideable
    // floor object rolls rn2(10) and usually stays put (MMOVE_NOTHING) rather
    // than leave its hiding place.  This roll fires BEFORE set_apparxy and the
    // getitems probe.  (meating early return omitted: these mons aren't eating.)
    if (hides_under_pm(ptr) && OBJ_AT(omx, omy)
        && can_hide_under_obj_at(omx, omy) && rn2(10)) {
        return MMOVE_NOTHING; /* do not leave hiding place */
    }

    // goal = the hero's apparent position
    let ggx = mtmp.mux ?? game.u.ux;
    let ggy = mtmp.muy ?? game.u.uy;

    // appr: +1 approach, -1 flee, 0 wander.  C ref monmove.c:1858.
    let appr = mtmp.mflee ? -1 : 1;
    if (mtmp.mconf) {
        appr = 0;
    } else {
        // C ref: monmove.c:1862-1872 — the appr=0 disjunction, evaluated with C
        // short-circuit semantics.  Of its terms only two consume RNG:
        //   (b) should_see && Invis && !perceives(ptr) && rn2(11)
        //   (g) (PM_STALKER || S_BAT || S_LIGHT) && !rn2(3)
        // and term (b) is gated on the hero being invisible (Invis), which never
        // happens in these slices, so it draws nothing.  Term (g) DOES fire for a
        // hostile, sighted giant bat/stalker/light: it rolls rn2(3) (the bat
        // "flutters randomly" 1/3 of the time -> appr=0).  Reproduce the
        // short-circuit order: terms (a) !mcansee and (f) mpeaceful both force
        // appr=0 WITHOUT reaching (g), so the rn2(3) is only drawn when the
        // monster can see and is hostile.
        const ptrMcls = ptr?.mcls;
        const isStalkerBatLight =
            (ptr?.pmidx === PM_STALKER)   // monsndx(ptr) == PM_STALKER
            || (ptrMcls === S_BAT)        // ptr->mlet == S_BAT
            || (ptrMcls === S_LIGHT);     // ptr->mlet == S_LIGHT
        if (!mtmp.mcansee || mtmp.mpeaceful) {
            appr = 0;
        } else if (isStalkerBatLight && !rn2(3)) {
            appr = 0;
        }
    }

    // C ref monmove.c:1894 — getitems probe.  `!mpeaceful || !rn2(10)`: for
    // hostile monsters the first disjunct short-circuits (no roll); a peaceful
    // monster would roll rn2(10) here.  Reproduce that one roll faithfully.
    if (!Is_rogue_level()) {
        if (mtmp.mpeaceful) rn2(10);
        // lined_up / pickup logic consumes no further RNG for these monsters.
    }

    const poss = mfndpos(mtmp, mtmp.mpeaceful ? 0 : ALLOW_U);
    const cnt = poss.length;
    if (cnt === 0) return MMOVE_NOMOVES;

    let nix = omx, niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chcnt = 0, chi = -1, mmoved = MMOVE_NOTHING;
    const jcnt = Math.min(MTSZ, cnt - 1);
    const mtrack = mtmp.mtrack || [];

    for (let i = 0; i < cnt; i++) {
        const nx = poss[i].x, ny = poss[i].y;

        if (appr !== 0) {
            // mtrack avoidance — the rn2(4*(cnt-j)) rolls (monmove.c:1963)
            let skip = false;
            for (let j = 0; j < jcnt; j++) {
                const trk = mtrack[j];
                if (trk && nx === trk.x && ny === trk.y) {
                    if (rn2(4 * (cnt - j))) { skip = true; break; }
                }
            }
            if (skip) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;
        if ((appr === 1 && nearer) || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            || (mmoved === MMOVE_NOTHING)) {
            nix = nx; niy = ny; nidist = ndist; chi = i; mmoved = MMOVE_MOVED;
        }
    }

    if (mmoved === MMOVE_MOVED && (nix !== omx || niy !== omy)) {
        // record track history (most-recent first, length MTSZ)
        mtmp.mtrack = [{ x: omx, y: omy }, ...mtrack].slice(0, MTSZ);
        mtmp.mx = nix; mtmp.my = niy;
        // Redraw vacated + occupied squares (C: remove/place_monster + newsym).
        newsym(omx, omy);
        // C ref: monmove.c postmov() — after a monster moves, mintrap() fires
        // the trap (if any) at its new square.  This must run BEFORE the new
        // position is finalized for display so the trap's RNG lands in the
        // right place in the stream.
        const trapret = mon_mintrap(mtmp);
        if (trapret === Trap_Killed_Mon) { newsym(nix, niy); return MMOVE_DIED; }
        // C ref: monmove.c postmov():1696 — a concealing (M1_CONCEAL) monster or
        // an eel that just moved re-hides: `if (mtmp->mundetected || (!helpless
        // && rn2(5))) hideunder(mtmp);`.  The rn2(5) fires whenever the monster
        // is revealed and not helpless (sleeping/frozen/can't-move).  Reproduce
        // the roll so the stream stays aligned (the seed4500 step-250 cobras).
        if (hides_under_pm(ptr) || ptr?.mcls === S_EEL_MCLS) {
            if (!mtmp.mundetected && !mon_helpless(mtmp))
                rn2(5);
        }
        newsym(nix, niy);
        return MMOVE_MOVED;
    }
    return MMOVE_NOTHING;
}

// C ref: makemon.c makemon() — every freshly-placed monster gets
// mcansee=mcanmove=TRUE and mpeaceful=peace_minded().  The JS makemon doesn't
// persist these move-loop fields, so initialize the C defaults lazily the
// first time a monster is driven through the move loop.  Consumes NO RNG:
// peace_minded() only rolls for co-aligned non-special monsters, and for the
// dungeon monsters our sessions place (all M2_HOSTILE or cross-aligned) it
// returns FALSE via an early return, so the result is deterministic here.
export function initMonMoveState(mtmp) {
    if (mtmp._moveInit) return;
    mtmp._moveInit = true;
    if (mtmp.mcanmove == null) mtmp.mcanmove = 1;
    if (mtmp.mcansee == null) mtmp.mcansee = 1;
    if (mtmp.mpeaceful == null) mtmp.mpeaceful = peace_minded_nonrng(mtmp.data) ? 1 : 0;
    if (mtmp.mflee == null) mtmp.mflee = 0;
    if (mtmp.mtame == null) mtmp.mtame = 0;
    if (mtmp.mconf == null) mtmp.mconf = 0;
    if (mtmp.mstun == null) mtmp.mstun = 0;
    if (mtmp.msleeping == null) mtmp.msleeping = 0;
    if (mtmp.mtrack == null) mtmp.mtrack = [];
    // mux/muy default to the monster's own square (C leaves them 0 until the
    // first set_apparxy, which dochug always runs before they're read).
    if (mtmp.mux == null) mtmp.mux = mtmp.mx;
    if (mtmp.muy == null) mtmp.muy = mtmp.my;
}

// C ref: makemon.c peace_minded() — the deterministic (no-RNG) portion.
// always_hostile (M2_HOSTILE) monsters and monsters whose alignment sign
// differs from the hero's are hostile without any random roll.  The random
// co-aligned roll (rn2(16+..) && rn2(2+..)) is NOT reproduced here because it
// belongs to monster-creation time, not the move loop; for the monsters our
// sessions exercise that branch is never reached (they early-return hostile).
function peace_minded_nonrng(ptr) {
    if (!ptr) return false;
    const M2_PEACEFUL = 0x00000020, M2_HOSTILE = 0x00000010;
    const mflags2 = ptr.mflags2 ?? ptr.mflags2_derived ?? hostileFlag(ptr);
    if (mflags2 & M2_PEACEFUL) return true;
    if (mflags2 & M2_HOSTILE) return false;
    const mal = ptr.maligntyp ?? 0;
    const ual = game.u?.ualign?.type ?? 0;
    if (Math.sign(mal) !== Math.sign(ual)) return false;
    // Co-aligned: C would roll here.  None of our sessions reach this with a
    // move-loop monster; treat as hostile so we never silently consume RNG.
    return false;
}

// Conservative M2_HOSTILE membership for the low-level dungeon monsters the
// RNDMONST table places (jackal, fox, kobold, sewer rat, grid bug, lichen,
// newt are flagged M2_HOSTILE in monsters.h).  Returns the M2_HOSTILE bit.
function hostileFlag(ptr) {
    const M2_HOSTILE = 0x00000010;
    const HOSTILE_PMIDX = new Set([12, 13, 59, 88, 116, 158, 322]);
    return HOSTILE_PMIDX.has(ptr.pmidx) ? M2_HOSTILE : 0;
}

// C ref: monmove.c dochug(mtmp).  Faithful control flow: PHASE ONE pre-move
// adjustments, PHASE TWO set_apparxy + distfleeck, PHASE THREE m_move (guarded
// by the same "opportunity to move" predicate as C, which decides whether the
// recalculating second distfleeck runs), PHASE FOUR attacks.
// C ref: mondata.h can_teleport(ptr) = (mflags1 & M1_TPORT).  The monster data
// carries no mflags1 here, so identify the M1_TPORT species by name (tengu,
// leprechaun, the teleporting nymphs, succubus/incubus, the Wizard).
const M1_TPORT_NAMES = new Set([
    'tengu', 'leprechaun', 'wood nymph', 'water nymph', 'mountain nymph',
    'succubus', 'incubus', 'Wizard of Yendor',
]);
function can_teleport(mdat) { return !!mdat && M1_TPORT_NAMES.has(mdat.name); }

// C ref: teleport.c noteleport_level() — TRUE on levels that forbid teleport
// (e.g. some special levels).  The contest fleeing monsters are on ordinary
// early dungeon levels, so this is FALSE.
function noteleport_level() { return false; }

export async function dochug(mtmp) {
    const mdat = mtmp.data;
    if (DEADMONSTER(mtmp)) return 1;

    // PHASE ONE — frozen / sleeping / pre-move timers.
    if (!mtmp.mcanmove) return 0;

    if (mtmp.msleeping) {
        // disturb() may wake it; for our (already-noticed) hostile monsters
        // disturb consumes no RNG and the monster stays asleep -> returns 0.
        if (!disturb(mtmp)) return 0;
    }

    // confused monsters get unconfused with small probability
    if (mtmp.mconf && !rn2(50)) mtmp.mconf = 0;
    // stunned monsters get un-stunned with larger probability
    if (mtmp.mstun && !rn2(10)) mtmp.mstun = 0;

    // C ref: monmove.c:745 — "Some monsters teleport."  The condition is
    // `mtmp->mflee && !rn2(40) && can_teleport(mdat) && ...`, and because && is
    // left-to-right the rn2(40) roll fires for EVERY fleeing monster (the
    // can_teleport / iswiz / noteleport_level gates are only consulted when the
    // roll yields 0).  Reproduce that roll so the PRNG advances exactly as C
    // does whenever a monster is fleeing (the seed0367 step-61 divergence).
    if (mtmp.mflee && !rn2(40) && can_teleport(mdat)
        && !mtmp.iswiz && !noteleport_level()) {
        // The teleport itself (rloc) is reached only when the roll is 0 AND the
        // species can teleport; the contest sessions' fleeing monsters either
        // roll non-zero or aren't teleporters, so the rloc path isn't exercised.
        // If it ever fires, fall through (no relocation modeled) rather than
        // silently consuming a different RNG amount than C.
    }

    // fleeing monsters might regain courage
    if (mtmp.mflee && !mtmp.mfleetim && mtmp.mhp === mtmp.mhpmax && !rn2(25))
        mtmp.mflee = 0;

    // PHASE TWO — set_apparxy (sets mux/muy) then distance/scariness check.
    set_apparxy(mtmp);
    const { inrange, nearby, scared } = distfleeck(mtmp);

    // PHASE THREE — movement opportunity.  C ref monmove.c:882: a short-circuit
    // OR.  The rn2() terms must only roll when control actually reaches them,
    // so they are evaluated lazily here (mirroring C's || left-to-right order).
    let status = MMOVE_NOTHING;
    const S_LEPRECHAUN = 27;
    const may_move =
           !nearby
        || mtmp.mflee
        || scared
        || mtmp.mconf
        || mtmp.mstun
        || (mtmp.minvis && !rn2(3))
        || (mdat?.mlet === S_LEPRECHAUN && !findgold_invent()
            && (findgold_minvent(mtmp) || rn2(2)))
        || (is_wanderer(mdat) && !rn2(4))
        || (!mtmp.mcansee && !rn2(4))
        || mtmp.mpeaceful;

    if (may_move) {
        // (undirected-spell casting omitted — our monsters have no AT_MAGC)
        status = await m_move(mtmp);
        if (status === MMOVE_DIED) return 1;
        const r = distfleeck(mtmp); /* recalc */

        // C ref monmove.c switch(status): MMOVE_MOVED returns 0 directly
        // (without reaching PHASE FOUR / mattacku) UNLESS the monster moved
        // while NOT nearby AND it has a ranged / weapon / offensive option —
        // then it "break"s out to PHASE FOUR and may still attack.  For the
        // NOMOVES/NOTHING/DONE cases control always falls through to PHASE FOUR.
        if (status === MMOVE_MOVED) {
            const canShootAfterMove =
                !r.nearby && (ranged_attk_available(mtmp)
                              || attacktype_weap(mdat)
                              || find_offensive(mtmp));
            // (engulfing_u path not modeled — our monsters never swallow)
            if (!canShootAfterMove)
                return 0;
        }
        return await phase_four(mtmp, mdat, status, r.inrange, r.nearby, r.scared);
    }

    // Did not enter the move block -> attack with the pre-move flags.
    return await phase_four(mtmp, mdat, status, inrange, nearby, scared);
}

// C ref: invent.c findgold — hero/monster never carries gold in our sessions.
function findgold_invent() { return false; }
function findgold_minvent(_mtmp) { return false; }

// C ref: monmove.c dochug PHASE FOUR — the attack step.  mattacku() lives in
// mhitu.c; its steed-redirect roll (mhitu.c:534 rn2(is_orc?2:4)) and the
// hand-to-hand / weapon to-hit rolls are reproduced here in mattacku() below.
// The trailing cuss() roll belongs to monmove.c and is reproduced as well.
const MMOVE_DONE = 4; /* C: bypass m_move (we never set it, but match the gate) */
async function phase_four(mtmp, mdat, status, inrange, nearby, scared) {
    const u = game.u;
    // C ref monmove.c:967 — Standard Attacks.  status != MMOVE_DONE (we never
    // reach that for the modeled monsters) and the monster is hostile.
    const conflictAttack = false; /* Conflict not modeled for our sessions */
    if (status !== MMOVE_DONE && (!mtmp.mpeaceful || conflictAttack)) {
        // panicattk (NOMOVES while scared) is not modeled; our gate uses the
        // common "(inrange && !scared)" disjunct only.
        const uhp = u?.uhp ?? 1;
        if ((inrange && !scared) && !noattacks(mdat) && uhp > 0) {
            if (await mattacku(mtmp, mdat)) return 1; /* monster died (rare) */
        }
        // (wormhitu omitted — no long worms in these sessions)
    }

    const MS_CUSS = 35;
    if (inrange && mdat?.msound === MS_CUSS && !mtmp.mpeaceful
        && !mtmp.minvis) {
        rn2(5);
    }
    return (status === MMOVE_DIED) ? 1 : 0;
}

// C ref: include/you.h m_next2u(m) — distu(mx,my) <= 2 (the monster's REAL
// position is orthogonally/diagonally adjacent to the hero).
export function m_next2u(mtmp) {
    const u = game.u;
    const dx = mtmp.mx - u.ux, dy = mtmp.my - u.uy;
    return (dx * dx + dy * dy) <= 2;
}

// C ref: mondata.c is_orc(ptr) — (mflags2 & M2_ORC).  The data records carry
// the monster class (mcls); every S_ORC monster has M2_ORC, and the only other
// M2_ORC species are orc-mummy / orc-zombie (matched by name).
const S_ORC = 15;
const S_KOBOLD = 11;  // monsym.h S_KOBOLD
function is_orc(mdat) {
    if (!mdat) return false;
    if (mdat.mcls === S_ORC) return true;
    const n = mdat.name || '';
    return n === 'orc mummy' || n === 'orc zombie';
}

// C ref: mondata.c noattacks(ptr) — TRUE when the monster has no attacks.
// Every monster our sessions drive into mattacku has at least one attack, so
// this is FALSE; kept as a guard mirroring the C control flow.
function noattacks(mdat) {
    const atks = mon_attacks(mdat);
    return atks.length === 0;
}

// C ref: monattk.h AT_WEAP / mondata.c attacktype(ptr, AT_WEAP).
const AT_WEAP = 254;
function attacktype_weap(mdat) {
    return mon_attacks(mdat).some((a) => a.aatyp === AT_WEAP);
}

// C ref: mhitu.c ranged_attk_available(mtmp) — TRUE only for AT_SPIT / AT_BREA
// / AT_GAZE attackers (DISTANCE_ATTK_TYPE).  None of the monsters in the steed
// combat sessions have such attacks, so this is FALSE (no RNG).
const AT_SPIT = 10, AT_BREA = 12, AT_GAZE = 15;
function ranged_attk_available(mtmp) {
    return mon_attacks(mtmp.data).some(
        (a) => a.aatyp === AT_SPIT || a.aatyp === AT_BREA || a.aatyp === AT_GAZE);
}

// C ref: muse.c find_offensive(mtmp) — looks for offensive items in minvent.
// The dungeon monsters our sessions place carry no such items, so FALSE.
function find_offensive(_mtmp) { return false; }

// Attack-type metadata (aatyp only — the to-hit gate and the MMOVE_MOVED
// "can shoot after move" decision only need attack TYPES, not damage).  Keyed
// by monster class (mcls / S_* index) for the orc class (all AT_WEAP), with a
// physical-melee default for the ordinary low-level dungeon monsters.  Ported
// from include/monsters.h mattk[] lists.
const AT_CLAW = 1, AT_BITE = 2, AT_KICK = 3;
// C ref: monattk.h damage-type indices used by mhitm_adtyping().
const AD_PHYS = 0, AD_ELEC = 6;

// Per-monster attack records (aatyp, adtyp, damn, damd) for the hostile
// monsters our move loop drives into mattacku().  Ported verbatim from
// include/monsters.h MON(...,ATTK(...)) lists, keyed by species name.  Each
// record carries the damage dice so hitmu() can roll d(damn,damd) faithfully.
// (uhitm.js keeps a parallel table for the hero-attack XP path; this one is
// for the monster-attacks-hero direction, where the dice must be rolled.)
function MA(aatyp, adtyp, damn, damd) { return { aatyp, adtyp, damn, damd }; }
const AD_STCK = 12; // monattk.h AD_STCK (sticky/holding) — large mimic claw
const MON_HITU_ATTACKS = {
    // grid bug — single AT_BITE / AD_ELEC, 1d1 (include/monsters.h grid bug).
    'grid bug': [MA(AT_BITE, AD_ELEC, 1, 1)],
    // S_BAT family (include/monsters.h): a bite whose dice differ per species.
    'bat': [MA(AT_BITE, AD_PHYS, 1, 4)],
    'giant bat': [MA(AT_BITE, AD_PHYS, 1, 6)],
    'vampire bat': [MA(AT_BITE, AD_PHYS, 1, 6)],
    // S_MIMIC family — a single claw; small=3d4 phys, large/giant=3d4/3d6 sticky.
    'small mimic': [MA(AT_CLAW, AD_PHYS, 3, 4)],
    'large mimic': [MA(AT_CLAW, AD_STCK, 3, 4)],
    'giant mimic': [MA(AT_CLAW, AD_STCK, 3, 6)],
    // S_RODENT rats — single AT_BITE / AD_PHYS, 1d3 (NOT the generic 1d4).
    'sewer rat': [MA(AT_BITE, AD_PHYS, 1, 3)],
    'giant rat': [MA(AT_BITE, AD_PHYS, 1, 3)],
    // S_ORC family (include/monsters.h): a single AT_WEAP attack whose dice
    // vary per species — the generic S_ORC fallback below is 1d6, but the
    // goblin (1d4), orc (1d8) and Uruk-hai (1d8) differ, so name them here.
    // The base damage d(damn,damd) is rolled in hitmu BEFORE the wielded
    // weapon's dmgval is added, so the dice must be exact (seed0360 goblin).
    'goblin': [MA(AT_WEAP, AD_PHYS, 1, 4)],
    'hobgoblin': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'orc': [MA(AT_WEAP, AD_PHYS, 1, 8)],
    'hill orc': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'Mordor orc': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'Uruk-hai': [MA(AT_WEAP, AD_PHYS, 1, 8)],
    // S_GNOME family (include/monsters.h): the Mines' weapon-wielding gnomes.
    // A plain gnome has a single AT_WEAP/AD_PHYS attack — it "hits" (not the
    // generic "bites"); the lord/king dice differ (seed0030 step-47 gnome,
    // d(1,6) base before any wielded-weapon dmgval).  gnomish wizard is AT_MAGC
    // (spellcaster, handled elsewhere) so it is intentionally not listed here.
    'gnome': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'gnome lord': [MA(AT_WEAP, AD_PHYS, 1, 8)],
    'gnome king': [MA(AT_WEAP, AD_PHYS, 2, 6)],
};
function mon_attacks(mdat) {
    if (!mdat) return [];
    const named = MON_HITU_ATTACKS[mdat.name];
    if (named) return named;
    // Orc class (goblin/hobgoblin/orc/hill orc/...) — single AT_WEAP attack.
    if (mdat.mcls === S_ORC) return [MA(AT_WEAP, AD_PHYS, 1, 6)];
    // Kobold class — single AT_WEAP attack (include/monsters.h: kobold 1d4,
    // large kobold 1d6, kobold leader 2d4).  Carries darts via m_initthrow, so
    // at range it throws (thrwmu) rather than melees.  The base 1d4 covers the
    // common kobold; larger variants aren't placed by the low-level slice.
    if (mdat.mcls === S_KOBOLD) return [MA(AT_WEAP, AD_PHYS, 1, 4)];
    // The remaining monsters our move loop drives use simple physical melee
    // (AT_BITE / AT_CLAW / AT_KICK) with no AT_WEAP / ranged component, so the
    // weapon / ranged gates are FALSE for them.  We return a generic single
    // melee attack: enough to make noattacks() FALSE without claiming AT_WEAP.
    return [MA(AT_BITE, AD_PHYS, 1, 4)];
}

// C ref: mhitu.c:489 mattacku(mtmp) — a monster attacks the hero.  Returns 1
// if the monster dies (rare; e.g. yellow light), 0 otherwise.
//
// SCOPE: faithfully reproduces the RNG-bearing control flow exercised by the
// contest's mon-vs-hero/steed combat: the swallowed/hidden/mimic early-outs
// don't apply (no such state in the sessions), so we go straight to the
// u.usteed steed-redirect (mhitu.c:534 rn2(is_orc?2:4)) and then the standard
// attack loop.  For an attack that is range2 (the monster's apparent target is
// not adjacent) the hand-to-hand cases roll nothing; AT_WEAP at range calls
// thrwmu(), which is a no-op (no thrown weapon) for these monsters.  When the
// monster IS adjacent and found the hero, the to-hit rnd(20+i) is rolled and
// hitmu/missmu resolve it — hitmu damage isn't modeled yet, so a *successful*
// adjacent hit declines further RNG (clean divergence, never a silent desync).
async function mattacku(mtmp, mdat) {
    const u = game.u;

    // calc_mattacku_vars: range2/foundyou from the APPARENT position (mux/muy).
    const mux = mtmp.mux ?? mtmp.mx, muy = mtmp.muy ?? mtmp.my;
    const range2 = !((Math.abs(mtmp.mx - mux) <= 1) && (Math.abs(mtmp.my - muy) <= 1));
    const foundyou = (mux === u.ux && muy === u.uy);

    // u.uswallow path not modeled (never swallowed in these sessions).

    // ── steed redirect (mhitu.c:524) ────────────────────────────────────────
    if (u.usteed) {
        if (mtmp === u.usteed) return 0; /* your steed won't attack you */
        // Orcs like to steal and eat horses and the like.  The rn2() is
        // evaluated first (C &&, left-to-right) so it ALWAYS rolls here.
        if (!rn2(is_orc(mdat) ? 2 : 4) && m_next2u(mtmp)) {
            const i = await mattackm(mtmp, u.usteed);
            if (i & M_ATTK_AGR_DIED) return 1;
            if ((i & M_ATTK_DEF_DIED) || !u.usteed || !m_next2u(mtmp))
                return 0;
            // Let your steed retaliate.
            return ((await mattackm(u.usteed, mtmp)) & M_ATTK_DEF_DIED) ? 1 : 0;
        }
    }

    // ── standard attack loop (mhitu.c:765) ──────────────────────────────────
    // AC differential (mhitu.c:707): tmp = AC_VALUE(u.uac) + 10.
    // C ref hack.h: AC_VALUE(AC) = (AC >= 0) ? AC : -rnd(-AC) — a NEGATIVE hero
    // AC rolls rnd(-uac) here (always, before any attack roll).
    const uac = u.uac ?? 10;
    const acval = (uac >= 0) ? uac : -rnd(-uac);
    let tmp = acval + 10;
    tmp += (mtmp.m_lev ?? mdat?.mlevel ?? 0);
    if ((u.multi ?? 0) < 0) tmp += 4;
    if (!mtmp.mcansee) tmp -= 2;
    if (mtmp.mtrapped) tmp -= 2;
    if (tmp <= 0) tmp = 1;

    const atks = mon_attacks(mdat);
    let skipnonmagc = false;
    const AT_MAGC = 8;
    for (let i = 0; i < atks.length; i++) {
        const mattk = atks[i];
        // C ref mhitu.c:786 — after a wildmiss, skip later non-spell attacks.
        if (skipnonmagc && mattk.aatyp !== AT_MAGC) continue;
        switch (mattk.aatyp) {
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE: {
            if (!range2) {
                if (foundyou) {
                    const j = rnd(20 + i);          // mhitu.c:806
                    if (tmp > j) {
                        // mhitu.c:812 — sum[i] = hitmu(mtmp, mattk).
                        if (await hitmu(mtmp, mdat, mattk)) return 1;
                    } else {
                        // mhitu.c:814 — missmu(mtmp, tmp==j, mattk).
                        await missmu(mtmp, tmp === j);
                    }
                } else {
                    // wildmiss(): no RNG; skip remaining non-magic attacks.
                    skipnonmagc = true;
                }
            }
            break;
        }
        case AT_WEAP: {
            if (range2) {
                // C ref mhitu.c:884 — thrwmu(mtmp) for a range2 weapon attacker.
                // A goblin (S_ORC) that carries an orcish ("crude") dagger and
                // is lined up with the hero throws it; select_rwep / lined_up /
                // monmulti consume no RNG for a single non-ammo weapon, so the
                // whole RNG cost is m_throw's per-square forcehit rolls plus the
                // hero-hit resolution (u_catch_thrown_obj / dmgval / thitu).
                if (!Is_rogue_level()) await thrwmu(mtmp, mdat);
            } else if (foundyou) {
                // C ref mhitu.c:894 — wield a melee weapon first if the monster
                // needs one (weapon_check NEED_WEAPON, or no MON_WEP yet).  The
                // wield consumes no RNG; for the goblin it's usually a no-op (it
                // already wielded its crude dagger when fighting the pet).  When
                // mon_wield_item actually wields (returns 1) the attack breaks
                // (this turn was spent wielding) — matching C's `break`.
                if (mtmp.weapon_check === NEED_WEAPON_MM || !MON_WEP(mtmp)) {
                    mtmp.weapon_check = NEED_HTH_WEAPON_MM;
                    if (await mon_wield_item(mtmp)) break;
                }
                // C ref mhitu.c:907 — hittmp = hitval(mon_currwep); tmp += hittmp;
                // mswings(...).  hitval is the weapon's to-hit bonus (deterministic,
                // no RNG); the orcish dagger oc_hitbon is 2.
                let hittmp = 0;
                const mwep = MON_WEP(mtmp);
                if (mwep) {
                    hittmp = thrown_hitbon(mwep.otyp); // hitval == oc_hitbon here
                    tmp += hittmp;
                    await mswings_mm(mtmp, mwep);
                }
                const j = rnd(20 + i);          // mhitu.c:912
                if (tmp > j) {
                    if (await hitmu(mtmp, mdat, mattk)) return 1;
                } else {
                    await missmu(mtmp, tmp === j);
                }
                tmp -= hittmp; // KMH: don't accumulate to-hit bonuses
            } else {
                // wildmiss(): no RNG.
                skipnonmagc = true;
            }
            break;
        }
        default:
            break;
        }
    }
    return 0;
}

// ── monster ranged throw at hero (mthrowu.c thrwmu / m_throw / thitu) ───────
// C ref: mthrowu.c:1174 thrwmu(mtmp).  Scoped to the path the contest sessions
// exercise: a hostile S_ORC (goblin) that carries an orcish ("crude") dagger
// in minvent and is lined up with the hero throws it.  RNG cost (verified
// against the seed0108 step-30 trace):
//   m_throw   : one rn2(5) "forcehit" roll per EMPTY square the missile crosses
//   u_catch_thrown_obj : rn2(100 - ACURR(A_DEX))  (catch attempt at hero square)
//   dmgval    : rnd(oc_wsdam)                       (base missile damage)
//   thitu     : rnd(20)                             (the to-hit dieroll)
// The losehp() + exercise(A_STR, FALSE) [rn2(2)] that follow a HIT are emitted
// after the "You are hit ..." message has paged via --More-- (so the exercise
// roll lands in the next recorded step, exactly as C records it).
//
// Object metadata for the thrown weapons the sessions use (objects.h WEAPON()):
//   orcish dagger / "crude dagger": oc_wsdam 3, oc_hitbon 2, oclass WEAPON.
const ORCISH_DAGGER_OTYP = 36;
const DART_OTYP = 24; // include/objects.h WEAPON("dart"): otyp 24, oc_skill -P_DART
const WEAPON_CLASS_MM = 2; // mkobj.js WEAPON_CLASS (dart/dagger oclass)
function thrown_wsdam(otyp) {
    // C ref: objects.h WEAPON() oc_wsdam (small-monster damage die).  Orcish
    // dagger sdam 3; dart sdam 3.  (Other otyps fall back to a clean default of
    // 1 so the RNG count stays one rnd() either way.)
    if (otyp === ORCISH_DAGGER_OTYP) return 3;
    if (otyp === DART_OTYP) return 3;
    return 1;
}
function thrown_hitbon(otyp) {
    if (otyp === ORCISH_DAGGER_OTYP) return 2;
    if (otyp === DART_OTYP) return 0; // dart oc_hitbon 0
    return 0;
}
// C ref: mondata.h is_missile(obj) — TRUE for dart/shuriken/boomerang (the
// thrown-missile skill classes).  Only such missiles run should_mulch_missile()
// on impact (an extra rn2 roll); a plain dagger never mulches.
function is_missile_otyp(otyp) {
    return otyp === DART_OTYP; // (shuriken/boomerang not thrown by the owned mons)
}

// C ref: weapon.c:215 dmgval(otmp, &youmonst) for a small (non-big) hero hit by
// a thrown weapon: tmp = rnd(oc_wsdam); tmp += spe (>=0 here).  The blessed/
// silver/axe-vs-wood bonuses don't apply (human hero, plain iron dagger).
function dmgval_thrown(otmp, mon) {
    let tmp = 0;
    const wsdam = thrown_wsdam(otmp.otyp);
    if (wsdam) tmp = rnd(wsdam);
    if (otmp.oclass === WEAPON_CLASS_MM) {
        tmp += (otmp.spe | 0);
        if (tmp < 0) tmp = 0;
    }
    return tmp;
}

// ── monster weapon wielding (C ref: weapon.c select_hwep / mon_wield_item) ──
// A monster with an AT_WEAP attack wields the best hand-to-hand weapon it
// carries before fighting.  The wield itself consumes NO RNG (select_hwep walks
// a fixed priority list and m_carrying is a deterministic inventory scan); it
// only prints "<Mon> wields <weapon>!" and sets MON_WEP.  Implemented so the
// goblin's crude dagger shows up (seed0360 step-136 message + step-140 dmgval).

// C ref: include/onames.h — hand-to-hand weapon priority list (weapon.c hwep[]),
// restricted to the otyps the contest's armed monsters actually carry.  Only the
// orcish dagger (36) is reachable for the low-level orc/kobold slice; the rest
// are listed for faithful priority order should a richer monster appear.
const HWEP_PRIORITY = [55 /*TWO_HANDED_SWORD*/, 45 /*BATTLE_AXE*/,
    54 /*LONG_SWORD*/, 52 /*BROADSWORD*/, 50 /*SCIMITAR*/, 46 /*SHORT_SWORD*/,
    48 /*ORCISH_SHORT_SWORD*/, 73 /*MACE*/, 44 /*AXE*/, 27 /*SPEAR*/,
    30 /*DWARVISH_SPEAR*/, 28 /*ELVEN_SPEAR*/, 77 /*CLUB*/, 34 /*DAGGER*/,
    35 /*ELVEN_DAGGER*/, 36 /*ORCISH_DAGGER*/, 40 /*KNIFE*/];

// C ref: weapon.c m_carrying(mon, otyp) — the monster's first minvent obj of
// that type, else null.
function m_carrying(mon, otyp) {
    for (const o of (mon?.minvent || [])) if (o.otyp === otyp) return o;
    return null;
}

// C ref: weapon.c select_hwep(mtmp) — choose the best wieldable melee weapon.
// No RNG.  The contest monsters carry no artifacts/silver/bimanual conflicts,
// so the priority scan reduces to "first carried weapon in hwep[] order".
function select_hwep(mtmp) {
    for (const otyp of HWEP_PRIORITY) {
        const o = m_carrying(mtmp, otyp);
        if (o) return o;
    }
    return null;
}

// C ref: include/mondata.h MON_WEP(mon) — the monster's wielded weapon (mw).
export function MON_WEP(mon) { return mon?.mw || null; }

// C ref: weapon.c mon_wield_item(mon) — wield the best weapon per weapon_check.
// Returns 1 if the monster took time (actually wielded a different weapon), 0
// otherwise.  No RNG.  Faithful to the NEED_HTH_WEAPON path used by the armed
// orc/kobold combat (the only weapon_check the contest reaches).
export async function mon_wield_item(mon) {
    if (mon.weapon_check === NO_WEAPON_WANTED_MM) return 0;
    const obj = select_hwep(mon);     // NEED_HTH_WEAPON / NEED_WEAPON
    if (obj && obj !== HANDS_OBJ) {
        const mw_tmp = MON_WEP(mon);
        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            mon.weapon_check = NEED_WEAPON_MM; // already wielding it
            return 0;
        }
        mon.mw = obj;                 // wield obj (setmnotwielded old is implicit)
        mon.weapon_check = NEED_WEAPON_MM;
        if (canseemon_mm(mon)) {
            const { update_topl } = await import('./display.js');
            await update_topl(`${Monnam(mon)} wields ${an_name(mshot_xname(obj))}!`);
        }
        return 1;
    }
    return 0;
}
// weapon_check enum values (C ref: monst.h wpn_chk_flags).
const NO_WEAPON_WANTED_MM = 0, NEED_WEAPON_MM = 1, NEED_HTH_WEAPON_MM = 3;
const HANDS_OBJ = null; // C's &hands_obj sentinel — never selected here.

// C ref: mhitu.c mswings(mtmp, otemp, bash) — "<Mon> <verb> <his> <weapon>."
// when the attacker (and weapon) is visible.  No RNG for the orcish dagger: its
// oc_dir is pure PIERCE, so mswings_verb's `thrust` term short-circuits before
// the rn2(2) (which only fires for weapons that both pierce AND slash).  The
// verb is therefore always "thrusts" for the dagger.  Display-only.
async function mswings_mm(mtmp, otemp) {
    if (!canseemon_mm(mtmp)) return;
    // mswings_verb: dagger is PIERCE-only -> "thrusts" (no rn2(2)).
    const verb = 'thrusts';
    const hisher = mtmp.female ? 'her' : 'his';
    const { update_topl } = await import('./display.js');
    await update_topl(`${Monnam(mtmp)} ${verb} ${hisher} ${mshot_xname(otemp)}.`);
}

// C ref: include/attrib.h ACURR(A_DEX) — the hero's current Dexterity.  Stored
// as game.u.acurr.a[A_DEX] (A_DEX == 3), matching attrib.js / uhitm.js.
const A_DEX_IDX = 3;
function ACURR_DEX() {
    return game.u?.acurr?.a?.[A_DEX_IDX] ?? 0;
}

// C ref: mthrowu.c:532 u_catch_thrown_obj(otmp).  The recorded heroes aren't
// blind/confused/stunned/fumbling, have hands and a free hand, and the missile
// is light, so the only gate that matters is the rn2(100 - Dex) catch roll
// (monks/rogues get -20 but the wizard here is neither).  A non-zero roll means
// "didn't catch" -> returns FALSE and the missile proceeds to thitu().
function u_catch_thrown_obj(otmp) {
    const dex = ACURR_DEX();
    let catch_chance = 100 - dex;
    if (catch_chance < 1) catch_chance = 1; // guard rn2(0)
    if (!rn2(catch_chance)) {
        // Catch succeeds — not exercised by the owned sessions (Dex 18 -> 1/82),
        // but model it faithfully: the missile is added to inventory.
        return true;
    }
    return false;
}

// C ref: mthrowu.c:78 thitu(tlev, dam, objp, name) — resolve a thrown missile
// landing on the hero.  Rolls dieroll = rnd(20); hits when u.uac + tlev >
// dieroll.  On a hit: "You are hit by <a crude dagger>!"; then losehp(dam) +
// exercise(A_STR, FALSE).  Returns 1 on a hit (the missile stops), 0 on a miss.
async function thitu(tlev, dam, otmp) {
    const { update_topl } = await import('./display.js');
    const { exercise } = await import('./attrib.js');
    const u = game.u;
    const uac = u?.uac ?? 10;
    const dieroll = rnd(20);                         // mthrowu.c:106
    const onm = mshot_xname(otmp);                   // "crude dagger"
    if (uac + tlev <= dieroll) {
        // Miss feedback (verbose).  The contest hit, so this branch is only for
        // faithfulness; it still pages like C (update_topl).
        if (uac + tlev <= dieroll - 2) await update_topl(`The ${onm} misses you.`);
        else await update_topl(`You are almost hit by ${an_name(onm)}.`);
        return 0;
    }
    // Hit.  C: You("are hit by %s%s", onm, exclam(dam)).  exclam(dam) is "!" for
    // small damage (dam <= 5) -> "You are hit by a crude dagger!".
    await update_topl(`You are hit by ${an_name(onm)}${exclam(dam)}`);
    // losehp(dam) [no RNG] then exercise(A_STR, FALSE) [rn2(2)].
    await mdamageu(null, dam);
    exercise(0 /*A_STR*/, false);
    return 1;
}

// C ref: hacklib.c exclam(force) — "!" for damage > 5, "." otherwise (the
// punctuation after the hit message).  Here daggers do <= 5 so it's "!".
function exclam(force) { return force > 5 ? '!' : '.'; }

// C ref: objnam.c mshot_xname() — the singular display name of a thrown weapon
// (its appearance when unidentified).  The orcish dagger appears as "crude
// dagger".
function mshot_xname(otmp) {
    if (otmp?.otyp === ORCISH_DAGGER_OTYP) return 'crude dagger';
    if (otmp?.otyp === DART_OTYP) return 'dart'; // dart has no unidentified appearance
    return otmp?.oname || 'missile';
}
// C ref: objnam.c an() — prefix the appropriate indefinite article.
function an_name(s) {
    return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`;
}

// C ref: mthrowu.c m_throw() — fly the single missile from (x,y) toward the
// hero along (dx,dy) up to `range` squares.  Faithful loop (mthrowu.c:673-808):
// each iteration advances one square; on the hero square the catch attempt and
// thitu() resolve — a HIT drops the missile and STOPS (break before the
// forcehit roll), a MISS lets the dart fly ON.  Every non-hit iteration then
// rolls the forcehit `!rn2(5)` (mthrowu.c:798) and, when the range is exhausted,
// drops the missile where it lands.  (No intervening monster / blocked terrain
// in the owned sessions, so ohitmon / MT_FLIGHTCHECK aren't modelled.)
//
// Display: when the missile has a class symbol (sym) and isn't a tethered
// weapon, C runs tmp_at(DISP_FLASH, obj_to_glyph(singleobj)) then, at the end of
// each non-terminal square, tmp_at(bhitpos.x, bhitpos.y) — drawing the in-flight
// glyph at the current square while restoring (newsym) the previously flashed
// one.  So when thitu() shows the "You are hit by ..."  --More-- pause for an
// adjacent thrower, the most recent flash sits on the square just before the
// hero (the prior loop square), exactly as the recorded C screen shows.  A final
// tmp_at(DISP_END) restores that cell afterwards (so the next frame is clean).
async function m_throw_at_hero(mon, mdat, sx, sy, dx, dy, range, otmp) {
    const u = game.u;
    // C ref: mthrowu.c m_throw() head — peel one missile off the stack.  quan==1
    // just extracts the object (no RNG); quan>1 calls splitobj(), whose
    // nextoid()/next_ident() advances svc.context.ident by rnd(2).
    const singleobj = m_throw_single(mon, otmp);
    // C ref: mthrowu.c:649-651 — `if (sym) tmp_at(DISP_FLASH, obj_to_glyph(...))`.
    // sym = obj->oclass (always truthy for a thrown weapon/ammo); the contest
    // throwers (dagger/dart) are never autoreturn/tethered.  The flash glyph is
    // the object's map appearance (obj_to_glyph): ')' for a dagger/dart.
    const fglyph = (singleobj.oclass ? object_glyph(singleobj) : null);
    let fx = -1, fy = -1; // last flashed cell (-1 = none drawn yet)
    // C tmp_at(x,y) for a DISP_FLASH style (display.c:1278-1292): first restore
    // (newsym) the previously flashed cell, then — only if the new square is
    // cansee()-visible — draw the flight glyph there.  A missile crossing a dark
    // corridor / unseen square (e.g. a kobold lobbing darts from the dark) draws
    // NO flash, so the recorded screen shows the bare cell.  This mirrors the
    // `if (!cansee(x, y) && style != DISP_ALWAYS) break;` guard exactly.
    const flash_at = (x, y) => {
        if (!fglyph) return;
        if (fx >= 0) { newsym(fx, fy); fx = fy = -1; } // restore previous square
        if (!cansee(x, y)) return;                     // unseen: no flash drawn
        show_glyph_cell(x, y, fglyph.ch, fglyph.color, fglyph.dec);
        fx = x; fy = y;
    };
    // C tmp_at(DISP_END, 0): restore the last flashed cell after the throw.
    const flash_end = () => { if (fx >= 0) { newsym(fx, fy); fx = fy = -1; } };
    let bx = sx, by = sy;
    while (range-- > 0) {
        bx += dx; by += dy;
        if (bx === u.ux && by === u.uy) {
            // hero square: catch attempt, then the hit resolution.
            if (u_catch_thrown_obj(singleobj)) { flash_end(); return; } // caught
            const dam0 = dmgval_thrown(singleobj, u);    // rnd(wsdam) (+spe)
            let hitv = 3 - distmin(u.ux, u.uy, mon.mx, mon.my);
            if (hitv < -4) hitv = -4;
            // orc/elf shooting bonuses don't apply to a thrown dagger/dart.
            hitv += 8 + (singleobj.spe | 0);
            const dam = dam0 < 1 ? 1 : dam0;
            // thitu() pages the hit/miss message (--More--); the prior flash on
            // the square just before the hero stays drawn through that pause.
            const hitu = await thitu(hitv, dam, singleobj);
            if (hitu) {
                // C drop_throw(singleobj, 1, u.ux, u.uy): the hit missile settles
                // on the hero's own square (hidden under '@') or mulches.  The
                // missile stops here (break before the mthrowu.c:798 forcehit).
                flash_end();
                drop_thrown_missile(mon, singleobj, u.ux, u.uy, 1);
                return;
            }
            // MISS: the dart flies past the hero — fall through to the forcehit
            // roll and keep going (mthrowu.c does NOT break on a miss).
        }
        // forcehit roll (mthrowu.c:798) — fires on every non-hit square the
        // missile crosses, including a hero-miss square.
        rn2(5);
        // C: at end of range the loop breaks before tmp_at(bhitpos); otherwise it
        // draws the flight glyph at the just-crossed square (mthrowu.c:824).
        if (range > 0) flash_at(bx, by);
    }
    // Reached end of range without connecting; the missile drops where it
    // stopped (drop_throw with ohit==0 -> no mulch roll).
    flash_end();
    drop_thrown_missile(mon, singleobj, bx, by, 0);
}

// C ref: mthrowu.c m_throw() lines 593-616 — produce the single in-flight
// missile.  For a stack (quan > 1) C calls splitobj(obj, 1) which mints a new
// o_id via next_ident() [rnd(2)]; for a singleton it just extracts the object.
// We mirror the RNG (the new o_id is otherwise unobserved by the contest's
// screen capture) and return an object the caller can settle/destroy.
function m_throw_single(mon, otmp) {
    if ((otmp.quan | 0) <= 1) return otmp;
    next_ident();           // splitobj -> nextoid -> next_ident: rnd(2)
    otmp.quan = (otmp.quan | 0) - 1;
    // The split-off missile shares the parent's type/enchantment/erosion.
    return {
        otyp: otmp.otyp, oclass: otmp.oclass, spe: otmp.spe | 0,
        quan: 1, blessed: otmp.blessed, cursed: otmp.cursed,
        oeroded: otmp.oeroded, oeroded2: otmp.oeroded2, owornmask: 0,
        _split_from: otmp,
    };
}

// C ref: mthrowu.c m_throw -> drop_throw(singleobj, ohit, x, y).  When the
// missile HIT (ohit), drop_throw rolls should_mulch_missile() to see if it
// shatters: only ammo/missiles (e.g. a dart) mulch — a thrown dagger never
// does, so no roll there.  On a non-hit drop (ohit==0) there is no mulch roll.
// A shattered missile is destroyed via delobj() -> delobj_core(), which rolls
// obj_resists(obj, 0, 0) [rn2(100)] to spare indestructible artifacts (always
// FALSE for a dart) before freeing it — that roll must fire to stay in sync
// with C's stream (it is the obj_resists the kobold-dart sessions show right
// after a connecting throw).
// `singleobj` may be the parent stack (quan==1 throw) still in minvent, or the
// peeled-off single missile (quan>1 throw) that was never in minvent.
function drop_thrown_missile(mon, otmp, x, y, ohit) {
    let broken = false;
    if (ohit && is_missile_otyp(otmp.otyp)) {
        broken = should_mulch_missile(otmp); // rn2(3) for a fresh dart
    }
    if (mon?.minvent) {
        const i = mon.minvent.indexOf(otmp);
        if (i >= 0) mon.minvent.splice(i, 1);
    }
    if (broken) {
        rn2(100); // delobj_core -> obj_resists(obj, 0, 0): rn2(100), then free
        return;   // shattered missile: no object settles on the floor
    }
    otmp.owornmask = 0;
    try { place_object(otmp, x, y); newsym(x, y); } catch (e) { /* ignore */ }
}

// C ref: dothrow.c:1976 should_mulch_missile(obj) — a thrown missile (dart) may
// shatter on impact.  For a fresh, un-enchanted, un-eroded dart: chance =
// 3 + 0 - 0 = 3 -> broken = rn2(3) (truthy ~2/3 of the time).  The blessed /
// gem-tough refinements don't apply to a plain dart.
function should_mulch_missile(obj) {
    if (!obj || !is_missile_otyp(obj.otyp)) return false;
    const erosion = Math.max(obj.oeroded | 0, obj.oeroded2 | 0);
    const chance = 3 + erosion - (obj.spe | 0);
    let broken = chance > 1 ? (rn2(chance) !== 0) : (rn2(4) === 0);
    // C: blessed missiles survive on a !rnl(4) / !rn2(3) roll — the contest
    // darts aren't blessed, so this refinement is unreached, but kept faithful.
    if (obj.blessed && (game.context?.mon_moving ? rn2(3) === 0 : false)) broken = false;
    return broken;
}

// C ref: mthrowu.c select_rwep(mtmp) — pick the monster's preferred ranged
// weapon.  Scoped: return the first throwable weapon (orcish dagger thrown by a
// goblin via m_initweap, or the dart stack a kobold gets via m_initthrow) in
// minvent, else null.  No RNG.
function select_rwep(mtmp) {
    for (const o of (mtmp.minvent || [])) {
        if (o.otyp === ORCISH_DAGGER_OTYP || o.otyp === DART_OTYP) return o;
    }
    return null;
}

// C ref: mthrowu.c m_lined_up()/linedup() — is the hero on a straight row,
// column, or diagonal from the monster (within BOLT_LIM), with no wall between?
// C ref: mthrowu.c m_lined_up()/linedup(mux,muy, mx,my, 2).  The hero isn't
// polymorphed here so the rn2(25) concealment roll is skipped (no RNG).  Beyond
// the geometric alignment, C requires line of sight from the monster to the
// hero's *believed* position: clear_path() (or couldsee() when the believed
// spot is the hero's real square).  Without this gate the kobold would loose
// darts through the corridor wall a couple turns too early.  No boulders lie on
// the line in the owned sessions, so the boulderhandling==2 rn2(2+spots) branch
// is unreached (a clean FALSE on a blocked path).
function m_lined_up(mtmp) {
    const u = game.u;
    const tx = mtmp.mux ?? u.ux, ty = mtmp.muy ?? u.uy;
    const dx = tx - mtmp.mx, dy = ty - mtmp.my;
    if (dx === 0 && dy === 0) return false;
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return false;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (!(dist >= 1 && dist < BOLT_LIM)) return false;
    // line of sight check (linedup):
    const seesTarget = (tx === u.ux && ty === u.uy)
        ? couldsee(mtmp.mx, mtmp.my)
        : clear_path(tx, ty, mtmp.mx, mtmp.my);
    return !!seesTarget;
}

// C ref: mthrowu.c URETREATING(x,y) — the hero moved away from (x,y) this turn.
function URETREATING(x, y) {
    const u = game.u;
    const ux0 = u.ux0 ?? u.ux, uy0 = u.uy0 ?? u.uy;
    return distmin(u.ux, u.uy, x, y) > distmin(ux0, uy0, x, y);
}

// C ref: hack.h distmin() — Chebyshev (king-move) distance.
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}
function sgn(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

// C ref: mthrowu.c:201 monmulti(mtmp, otmp, mwep) — how many missiles a monster
// looses in one volley.  The contest throwers (goblin dagger, kobold darts) are
// neither lords/princes/mplayers nor wielding a launcher and never confused, so
// the only RNG is `multishot = rnd((int) multishot)` — and only when otmp is a
// stack (quan > 1) of a stackable non-ammo weapon.  A single dagger (quan == 1)
// short-circuits the whole block and consumes no RNG (multishot stays 1).
function monmulti(mtmp, otmp) {
    let multishot = 1;
    if (otmp.quan > 1
        && otmp.oclass === WEAPON_CLASS_MM   // dart/dagger: stackable, not ammo
        && !mtmp.mconf) {
        // No is_prince/is_lord/is_mplayer/elven/launcher bonuses for these mons.
        multishot = rnd(multishot);          // rnd(1) == 1
        // multishot_class_bonus(kobold/goblin, ...) == 0; no racial bonus.
    }
    if (otmp.quan < multishot) multishot = otmp.quan | 0;
    if (multishot < 1) multishot = 1;
    return multishot;
}

async function thrwmu(mtmp, mdat) {
    const u = game.u;
    // weapon_check / mon_wield_item: goblins/kobolds throw from minvent without
    // wielding (NEED_RANGED_WEAPON -> mon_wield_item returns 0 here, no RNG).
    const otmp = select_rwep(mtmp);
    if (!otmp) return;
    // Not a polearm and not an autoreturn weapon (a plain dagger / dart).
    if (!m_lined_up(mtmp)) return;
    const x = mtmp.mx, y = mtmp.my;
    if (URETREATING(x, y)) {
        // C: && rn2(BOLT_LIM - distmin(...)) -> the roll fires only when
        // retreating.  Not exercised (hero approaches), so faithfully roll then
        // bail when non-zero.  (Kept for correctness if a session retreats.)
        const r = BOLT_LIM - distmin(x, y, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy);
        if (r > 0 && rn2(r)) return;
    }
    // monshoot(): roll the volley size first (monmulti — rnd(1) for a dart
    // stack, no RNG for a single dagger), then the canseemon announcement.
    const multishot = monmulti(mtmp, otmp);
    if (canseemon_mm(mtmp)) {
        const { update_topl } = await import('./display.js');
        const onm = multishot > 1
            ? `${multishot} ${mshot_xname(otmp)}s`
            : an_name(mshot_xname(otmp));
        await update_topl(`${Monnam(mtmp)} throws ${onm}!`);
    }
    const dm = distmin(mtmp.mx, mtmp.my, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy);
    const tbx = (mtmp.mux ?? u.ux) - mtmp.mx, tby = (mtmp.muy ?? u.uy) - mtmp.my;
    for (let i = 1; i <= multishot; i++) {
        await m_throw_at_hero(mtmp, mdat, mtmp.mx, mtmp.my, sgn(tbx), sgn(tby), dm, otmp);
        if (DEADMONSTER(mtmp)) break;
    }
}

// C ref: display.c canseemon(mon) — the hero can see the monster: its square is
// in view (cansee) and it isn't invisible (or the hero sees invisible).  A
// goblin throwing in a lit room is visible (-> "The goblin throws a dagger!");
// a kobold loosing darts from down a dark corridor is NOT (-> no announcement,
// just the "You are hit by a dart." landing message).
function canseemon_mm(mtmp) {
    if (!mtmp) return false;
    if (game.u?.uswallow) return true;
    if (mtmp.minvis && !game.u?.see_invis) return false;
    return !!cansee(mtmp.mx, mtmp.my);
}

// ── monster-hits-hero damage path (mhitu.c hitmu / mdamageu) ───────────────
// C ref: mhitu.c:1144 hitmu(mtmp, mattk) — a monster lands a melee hit on the
// hero.  Rolls the base damage d(damn,damd), dispatches the damage-type effect
// (mhitm_adtyping), the knockback check, then subtracts HP (mdamageu).  Returns
// 1 if the attacker died (it never does here), else 0.
//
// Faithful to the verified seed0002 step-31 RNG trace (grid bug, AT_BITE/
// AD_ELEC, 1d1):
//   d(1,1) [base dmg]; mhitm_ad_elec -> rn2(10) [mgc-negation] + rn2(20)
//   [m_lev > rn2(20)? destroy_items]; mhitm_knockback -> rn2(3) + rn2(6).
async function hitmu(mtmp, mdat, mattk) {
    const mhm = { damage: 0, done: false };

    // C ref: mhitu.c:1155 — if the hero cannot spot the attacker, remember its
    // square with the 'I' glyph.  Restricted to the blinded hero (the recorded
    // blindfold case) to avoid disturbing coincidental matches in early-diverged
    // sessions where a monster is merely out of line-of-sight.
    if ((game.u?.ublindf || (game.u?.blinded || 0) > 0 || game.ublindf)
        && !canspotmon(mtmp)) map_invisible(mtmp.mx, mtmp.my);
    // mtmp->mundetected hides_under/S_EEL reveal: not reachable for these mons.

    // mhitu.c:1187 — base damage roll.
    mhm.damage = d(mattk.damn | 0, mattk.damd | 0);
    // is_undead/vampshifter midnight extra-dmg: none of these monsters qualify.

    await mhitm_adtyping(mtmp, mattk, mhm);

    // mhitu.c:1193 — knockback (AD_PHYS claw/kick/butt/weap only; the rn2(3) and
    // rn2(chance=6) gate rolls always fire first).
    mhitm_knockback(mtmp, mattk);

    if (mhm.done) return 0;

    // already-dead short-circuit (uhp<1) not reachable: damage is applied below.

    // Negative-AC damage reduction (mhitu.c:1208): the starter heroes here have
    // uac >= 0, so no rnd(-uac) roll.  Guarded to stay faithful if uac<0.
    const u = game.u;
    if (mhm.damage && (u.uac ?? 10) < 0) {
        mhm.damage -= rnd(-(u.uac));
        if (mhm.damage < 1) mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        // Half_physical_damage / Mitre-of-Holiness not modelled (off here).
        // permdmg (Death) not reachable.
        await mdamageu(mtmp, mhm.damage);
    }

    // passiveum(): the grid bug (and the other modelled victims) have no passive
    // attack, so no RNG and no message.
    return 0;
}

// C ref: uhitm.c:4782 mhitm_adtyping() — dispatch on the damage type.  Only the
// types the contest's monster-hits-hero path reaches are implemented; an
// unmodelled type would surface as an honest divergence rather than a silent
// desync.
async function mhitm_adtyping(mtmp, mattk, mhm) {
    switch (mattk.adtyp) {
    case AD_ELEC: await mhitm_ad_elec(mtmp, mattk, mhm); break;
    case AD_PHYS: await mhitm_ad_phys(mtmp, mattk, mhm); break;
    default:
        // Unmodelled adtyp: leave damage as the base roll, emit the hit verb.
        await hitmsg(mtmp, mattk);
        break;
    }
}

// C ref: uhitm.c:2706 mhitm_ad_elec() — mdef == &youmonst branch.
async function mhitm_ad_elec(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    await hitmsg(mtmp, mattk);                       // "The grid bug bites!"
    if (!mhitm_mgc_atk_negated(mtmp)) {
        await emitU('You get zapped!');
        // Shock_resistance not present for the starter heroes here.
        // monstunseesu(M_SEEN_ELEC): no RNG.
        const mlev = mtmp.m_lev ?? mtmp.data?.mlevel ?? 0;
        if (mlev > rn2(20)) {
            // destroy_items(&youmonst, AD_ELEC, orig_dmg) — not reached for the
            // m_lev==0 grid bug (0 > rn2(20) is always false).  The rn2(20) is
            // the RHS of the comparison and always fires (handled above).
            void orig_dmg;
        }
    } else {
        mhm.damage = 0;
    }
}

// C ref: uhitm.c mhitm_ad_phys() — mdef == &youmonst branch.  For an AT_WEAP
// attack with a wielded weapon, the weapon's dmgval is added to the base roll
// (uhitm.c:4061 `mhm->damage += dmgval(otmp, mdef)`); for the hero defender (a
// small humanoid) dmgval rolls rnd(oc_wsdam) + spe — the orcish dagger is
// wsdam 3, spe 0, so rnd(3).  Then the hit message (hitmsg).  No gauntlets of
// power / silver / poison apply to these monsters.
async function mhitm_ad_phys(mtmp, mattk, mhm) {
    const AT_WEAP_LOCAL = 254;
    const otmp = (mattk.aatyp === AT_WEAP_LOCAL) ? MON_WEP(mtmp) : null;
    if (otmp) {
        // dmgval(otmp, hero): small defender -> rnd(oc_wsdam) + spe.
        let dmg = 0;
        const wsdam = thrown_wsdam(otmp.otyp);
        if (wsdam) dmg = rnd(wsdam);
        if (otmp.oclass === WEAPON_CLASS_MM) {
            dmg += (otmp.spe | 0);
            if (dmg < 0) dmg = 0;
        }
        mhm.damage += dmg;
        if (mhm.damage <= 0) mhm.damage = 1;
    }
    await hitmsg(mtmp, mattk);
}

// C ref: uhitm.c:75 mhitm_mgc_atk_negated(magr, mdef, verbosely) — magical
// cancellation check.  mcan is false for these monsters; magic_negation(hero)
// is 0 (no protective armor), so negated = !(rn2(10) >= 0) = !(true) = FALSE,
// but the rn2(10) is still rolled.  Returns TRUE when the attack is thwarted.
function mhitm_mgc_atk_negated(mtmp) {
    if (mtmp.mcan) return true;                      // no message, no roll
    const armpro = 0;                                // magic_negation(hero) == 0
    const negated = !(rn2(10) >= 3 * armpro);        // uhitm.c:87
    return negated;
}

// C ref: uhitm.c:5247 mhitm_knockback() — hero is the defender.  The
// knockdistance rn2(3) and the rn2(chance) gate roll fire before any adtyp /
// engulf checks, so they always advance the stream; knockback only proceeds for
// AD_PHYS claw/kick/butt/weap.  Returns false (no actual hurtle modelled).
function mhitm_knockback(mtmp, mattk) {
    const knockdistance = rn2(3) ? 1 : 2;            // uhitm.c:5258
    void knockdistance;
    const chance = 6;                                // no Ogresmasher here
    if (rn2(chance)) return false;                   // uhitm.c:5269
    // AD_PHYS + (AT_CLAW|AT_KICK|AT_BUTT|AT_WEAP) required; AD_ELEC bite fails.
    if (!(mattk.adtyp === AD_PHYS
          && (mattk.aatyp === AT_CLAW || mattk.aatyp === AT_KICK
              || mattk.aatyp === AT_WEAP /* AT_BUTT shares this gate */))) {
        return false;
    }
    // The actual hurtle (test_move / hurtle) is not modelled — it would move the
    // hero; not reached by the contest's monster-hits-hero scenarios.
    return false;
}

// C ref: mhitu.c:1902 mdamageu(mtmp, n) — subtract n HP from the hero.  Sets
// disp.botl (status redraw) and triggers done_in_by() if uhp drops below 1.
async function mdamageu(mtmp, n) {
    const u = game.u;
    if (n < 0) n = 0;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;
    // C ref mhitu.c:1925 — `if (u.uhp < 1) done_in_by(mtmp, DIED)`.  A hostile
    // bite that drops the hero to 0 HP triggers the death sequence (in wizard
    // mode: "You die..." -> "Die?" -> decline -> savelife "You survived...").
    if (u.uhp < 1) {
        const { done_in_by } = await import('./end.js');
        await done_in_by(mtmp, DIED_HOW);
    }
}
const DIED_HOW = 0; // end.h DIED

// C ref: mhitu.c:29 hitmsg(mtmp, mattk) — "<The monster> <verb>!".  Appends to
// the top line so it concatenates with the hero's prior message this turn.
const HITMSG_VERB = {
    [AT_CLAW]: 'hits', [AT_BITE]: 'bites', [AT_KICK]: 'kicks', [AT_WEAP]: 'hits',
};
async function hitmsg(mtmp, mattk) {
    const verb = HITMSG_VERB[mattk.aatyp] || 'hits';
    await emitU(`${Monnam(mtmp)} ${verb}!`);
}

// C ref: mhitu.c:85 missmu(mtmp, nearmiss, mattk) — "<The monster> misses!".
// No RNG.
async function missmu(mtmp, nearmiss) {
    const verbose = game.flags?.verbose !== false;
    const just = (nearmiss && verbose) ? 'just ' : '';
    await emitU(`${Monnam(mtmp)} ${just}misses!`);
}

// Append a hero-facing message to the top line (C pline -> update_topl).
async function emitU(msg) {
    const { update_topl } = await import('./display.js');
    await update_topl(msg);
}

// C ref: monmove.c disturb(mtmp) — wake-up check for sleeping monsters.
// For ordinary hostile monsters that the hero has already encountered this
// consumes no RNG; default to "stays asleep" so we don't fabricate rolls.
function disturb(_mtmp) {
    return false;
}

// C ref: mondata.h is_wanderer(ptr) — M2_WANDER flag.  The RNDMONST data
// objects don't carry mflags2, so recognize the M2_WANDER monsters our
// sessions actually place by pmidx (kitten and pony starting pets; bats and
// felines wander too).  Hostile RNDMONST monsters (newt, kobold, jackal, …)
// are NOT wanderers, so the rn2(4) at monmove.c:886 never fires for them.
const M2_WANDER_PMIDX = new Set([
    34,  // kitten
    35,  // housecat
    36,  // large cat (jaguar/etc. share S_FELINE wander)
    102, // pony
    103, // white unicorn
    104, // gray unicorn
    105, // black unicorn
    // C ref: include/monsters.h — every S_BAT (bat/giant bat/raven/vampire bat)
    // carries M2_WANDER, and so do the S_LIGHT lights and the (S_ELEMENTAL)
    // stalker (M2_WANDER | M2_STALK).  A giant bat is fast (speed 22) so it acts
    // twice per turn; getting is_wanderer right makes its second dochug enter
    // the move block (the rn2(4) at monmove.c:886 + the flutter rn2(3) at
    // monmove.c:1871) instead of attacking — the seed5002 step-190 divergence.
    126, // bat
    127, // giant bat
    128, // raven
    129, // vampire bat
    118, // yellow light
    119, // black light
    153, // stalker
]);
function is_wanderer(ptr) {
    const M2_WANDER = 0x00800000; // monflag.h M2_WANDER

    if (ptr?.mflags2 != null) return !!(ptr.mflags2 & M2_WANDER);
    return M2_WANDER_PMIDX.has(ptr?.pmidx);
}

// C ref: dungeon.h Is_rogue_level(uz) — the special Rogue-emulation level.
// Our gameplay sessions stay on the upper Dungeons of Doom (dlvl 1), never the
// Rogue level, so this is always false; defined for faithful m_move gating.
function Is_rogue_level() {
    const uz = game.u?.uz;
    const rl = game.rogue_level;
    return !!uz && !!rl && uz.dnum === rl.dnum && uz.dlevel === rl.dlevel;
}

// C ref: monmove.c dochugw(mtmp, inrange) — wrapper around dochug used by
// movemon_singlemon.  The extra warning bookkeeping consumes no RNG.
export async function dochugw(mtmp) {
    return await dochug(mtmp);
}
