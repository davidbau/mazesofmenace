// mon.js — Monster turn bookkeeping for the move loop.
// C ref: mon.c — mcalcmove(), mcalcdistress(), movemon(), movemon_singlemon().
//
// This is the GENERAL (data-driven) port of the per-turn monster machinery
// used by allmain.js moveloop_core().  It iterates the real monster list
// (game.level.monsters / game.fmon) so that gameplay RNG + display are
// generated naturally for any session whose level state is materialized.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { NORMAL_SPEED, A_NEUTRAL } from './const.js';
import { dochug, initMonMoveState } from './monmove.js';

// Speed-modifier flags (permonst.mspeed); C ref: monst.h.
const MSLOW = 1;
const MFAST = 2;

// Base movement rate (permonst.mmove) for every species, indexed by pmidx in
// the makemon.js MONS-table order (the same `MONS_NAMES` convention mklev /
// makemon use to place dungeon monsters).  C ref: include/monsters.h
// LVL(mlevel, MMOVE, ac, mr, align) — this is the full MMOVE column, mapped
// from each makemon.js monster name to its NetHack-5.0 base speed.  The
// RNDMONST data table in makemon.js does not carry mmove, so mcalcmove looks
// it up here.  A monster whose pmidx falls outside this table falls back to
// NORMAL_SPEED (which still emits the rn2(NORMAL_SPEED) rounding roll).
//
// NOTE: the rounding roll mcalc_round() always uses rn2(NORMAL_SPEED), so an
// incorrect base speed does NOT change the *RNG draw*; it changes the
// per-turn movement-point allotment (mmove_adj = mmove % NORMAL_SPEED), which
// governs whether/when a monster reaches NORMAL_SPEED and acts.  Getting the
// base speeds right therefore keeps downstream monster-move RNG (distfleeck /
// dog_move / m_move) and the rendered monster positions in sync with C.
//
// Built by mapping each makemon.js MONS_NAMES[pmidx] species to its base speed
// in the RECORDER's include/monsters.h (nethack-c/recorder), the C build that
// produced the recorded sessions.  The previous version of this table was
// indexed against a *different* monster enumeration (one that included extra
// 5.0.0 species such as Cerberus/beholder that the recorder's MONS_NAMES does
// not), so every entry from pmidx 153 (stalker) onward was shifted by the
// accumulated offset and read out the wrong species' speed — e.g. gnome
// (pmidx 165) was 1 instead of 6, the elementals (153-157) were rotated, and
// the giants / golems / demons were all off by one or more.  Looking each
// MONS_NAMES entry up by NAME in the recorder fixes the alignment.
const MMOVE_BY_PMIDX = Object.freeze([
    /*   0 */ 18, 18, 18, 18, 6, 24, 3, 1, 6, 4, 6, 6, 12, 15, 12, 12,
    /*  16 */ 18, 16, 16, 15, 12, 12, 12, 12, 12, 12, 14, 3, 1, 13, 13, 13,
    /*  32 */ 18, 16, 15, 15, 15, 15, 12, 12, 12, 10, 15, 9, 6, 9, 12, 12,
    /*  48 */ 12, 12, 3, 12, 12, 3, 15, 13, 0, 0, 3, 6, 6, 12, 6, 15,
    /*  64 */ 3, 3, 3, 12, 12, 12, 6, 9, 9, 9, 5, 7, 9, 5, 1, 1,
    /*  80 */ 1, 9, 9, 18, 3, 12, 12, 12, 12, 10, 12, 12, 3, 3, 12, 4,
    /*  96 */ 15, 15, 3, 3, 16, 24, 24, 24, 20, 24, 1, 20, 20, 20, 22, 22,
    /* 112 */ 3, 3, 3, 9, 12, 18, 15, 15, 8, 10, 8, 10, 18, 16, 22, 22,
    /* 128 */ 20, 20, 18, 18, 20, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
    /* 144 */ 9, 9, 9, 9, 9, 9, 9, 9, 9, 12, 36, 12, 6, 5, 1, 0,
    /* 160 */ 0, 0, 0, 1, 1, 6, 12, 10, 12, 6, 6, 10, 12, 12, 12, 12,
    /* 176 */ 18, 15, 12, 6, 8, 10, 12, 6, 9, 9, 9, 8, 10, 10, 10, 12,
    /* 192 */ 12, 12, 14, 10, 10, 10, 10, 12, 14, 14, 16, 10, 12, 12, 1, 3,
    /* 208 */ 6, 6, 12, 12, 18, 12, 8, 15, 15, 3, 15, 18, 12, 10, 12, 14,
    /* 224 */ 12, 6, 12, 12, 26, 12, 12, 12, 9, 12, 12, 12, 15, 12, 15, 6,
    /* 240 */ 6, 6, 6, 6, 6, 8, 6, 8, 8, 12, 12, 9, 9, 6, 3, 8,
    /* 256 */ 7, 6, 6, 6, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 16,
    /* 272 */ 12, 12, 0, 12, 12, 10, 10, 6, 10, 10, 10, 10, 12, 12, 15, 3,
    /* 288 */ 10, 12, 12, 9, 12, 12, 12, 12, 6, 15, 6, 9, 6, 12, 5, 3,
    /* 304 */ 18, 9, 3, 15, 9, 12, 15, 12, 12, 12, 12, 3, 18, 12, 9, 10,
    /* 320 */ 3, 6, 6, 6, 6, 6, 5, 9, 12, 0, 12, 12, 12, 12, 12, 12,
    /* 336 */ 12, 12, 12, 12, 12, 12, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15,
    /* 352 */ 15, 15, 15, 15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
    /* 368 */ 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
]);

// Starting pets are created by dog.c/dog.js, which tag the pet's permonst
// stand-in with a DIFFERENT pmidx convention than the makemon MONS table
// (dog.js: little dog 16, kitten 34, pony 102).  Their real species speeds
// (include/monsters.h) are little dog/kitten 18, pony 16.  Keyed by the
// dog.js pet pmidx so a tame monster gets its true mmove instead of the
// NORMAL_SPEED fallback.  C ref: monsters.h little dog/kitten LVL(.,18,.) and
// pony LVL(.,16,.).
const PET_MMOVE_BY_PMIDX = Object.freeze({
    16: 18,  // little dog (PM_LITTLE_DOG)
    34: 18,  // kitten (dog.js PM_KITTEN)
    102: 16, // pony (dog.js PM_PONY)
});

// C ref: permonst.mmove — base speed for a monster's species.
export function base_mmove(mon) {
    const d = mon?.data;
    if (d?.mmove != null) return d.mmove;
    if (mon?.mtame) {
        const petMove = PET_MMOVE_BY_PMIDX[d?.pmidx];
        if (petMove != null) return petMove;
    }
    const byIdx = MMOVE_BY_PMIDX[d?.pmidx];
    return byIdx != null ? byIdx : NORMAL_SPEED;
}

// C ref: mon.c DEADMONSTER(mon) — hp <= 0.
export function DEADMONSTER(mon) {
    return !mon || (mon.mhp != null && mon.mhp <= 0);
}

// The live monster list for the current level.  C uses the `fmon` chain;
// our level stores monsters in an array.  Filter out dead / off-map.
export function monsterList() {
    const list = game.level?.monsters || [];
    return list;
}

// C ref: the `fmon` chain.  makemon prepends each new monster
// (makemon.c:1249-1250), so C visits monsters newest-first.  Our level array
// holds monsters in creation order; return a reversed snapshot so per-monster
// RNG (distfleeck / m_move) is emitted in the same order as C.
function fmonOrder() {
    const list = monsterList();
    const out = new Array(list.length);
    for (let i = 0; i < list.length; i++) out[i] = list[list.length - 1 - i];
    return out;
}

// C ref: mon.c mcalcmove(mon, m_moving) — the species/speed math BEFORE the
// random rounding.  Consumes no RNG.
function mcalcmove_base(mon) {
    let mmove = base_mmove(mon);
    if (mon?.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon?.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }
    // (steed/gallop branch omitted — never applies to non-steed monsters)
    return mmove;
}

// C ref: mon.c mcalcmove() trailing block — randomly round `mmove` up to a
// multiple of NORMAL_SPEED.  Always rolls rn2(NORMAL_SPEED) (the comparison
// against mmove_adj==0 just always fails), so this is emitted for every
// monster regardless of speed — matching the recorded mcalcmove stream.
function mcalc_round(mmove) {
    const mmove_adj = mmove % NORMAL_SPEED;
    mmove -= mmove_adj;
    if (rn2(NORMAL_SPEED) < mmove_adj)
        mmove += NORMAL_SPEED;
    return mmove;
}

// Per-turn movement-reallocation batch (C ref: allmain.c moveloop_core —
// `for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) mtmp->movement += mcalcmove(...)`).
// The C engine iterates the fmon chain (newest monster first), so the N
// rn2(NORMAL_SPEED) rounding rolls are assigned to monsters in that order.
// The JS moveloop caller (allmain.js) instead iterates game.level.monsters in
// creation order — the exact reverse — which would hand each roll to the wrong
// monster whenever monsters have different base speeds.  To stay faithful
// without touching the (frozen-for-this-wave) caller, the very first
// mcalcmove(mon, TRUE) of a reallocation batch rolls for ALL live level
// monsters up front in fmon order and caches each result; subsequent calls in
// the same batch just return the cached value (no extra RNG).  A batch is
// recognised by the requesting monster already being live in level.monsters
// and not yet served this batch.
let _reallocServed = null; // Set of monsters served in the active batch
let _reallocAmt = null;    // Map monster -> precomputed allotment
let _reallocMoves = -1;    // game.moves when the active batch was rolled

function _startReallocBatch() {
    _reallocServed = new Set();
    _reallocAmt = new Map();
    _reallocMoves = game.moves;
    // Roll in fmon order (newest-first) exactly as the C engine does.
    for (const m of fmonOrder()) {
        if (DEADMONSTER(m)) continue;
        _reallocAmt.set(m, mcalc_round(mcalcmove_base(m)));
    }
}

// C ref: mon.c mcalcmove(mon, m_moving)
// Computes the monster's movement-point allotment for this turn.  When
// `m_moving` is true it randomly rounds the per-turn speed to a multiple of
// NORMAL_SPEED (the rn2(NORMAL_SPEED) call seen in seed8000's trace).
export function mcalcmove(mon, m_moving) {
    if (!m_moving)
        return mcalcmove_base(mon);

    // Is this part of the per-turn reallocation over level monsters?  If the
    // monster is a live member of the level list, serve from the fmon-ordered
    // batch so the rounding rolls line up with the C engine's fmon traversal.
    const list = monsterList();
    if (mon && list.includes(mon) && !DEADMONSTER(mon)) {
        if (!_reallocServed || _reallocServed.has(mon)
            || _reallocMoves !== game.moves || !_reallocAmt.has(mon)) {
            // New batch: first request ever, this monster already served once
            // (caller wrapped to a fresh reallocation), the turn counter
            // advanced since the last batch was rolled, or this monster wasn't
            // part of the last batch (new monster / new session).
            _startReallocBatch();
        }
        _reallocServed.add(mon);
        return _reallocAmt.has(mon) ? _reallocAmt.get(mon)
                                    : mcalc_round(mcalcmove_base(mon));
    }

    // Steed / off-list monster: roll inline (current behaviour preserved).
    return mcalc_round(mcalcmove_base(mon));
}

// C ref: mon.c m_calcdistress(mtmp) — per-turn timeouts/regen.  For the
// monsters our sessions exercise (no liquids, no shapeshifters) this is a
// no-op as far as RNG is concerned, but we keep the structure so the loop
// is faithful and extensible.
function m_calcdistress(mtmp) {
    // mon_regen / decide_to_shapeshift / were_change consume no RNG here.
    if (mtmp.mblinded && !--mtmp.mblinded) mtmp.mcansee = 1;
    if (mtmp.mfrozen && !--mtmp.mfrozen) mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !--mtmp.mfleetim) mtmp.mflee = 0;
}

// C ref: mon.c mcalcdistress(void) — iterates fmon (newest-first).
export function mcalcdistress() {
    for (const mtmp of fmonOrder()) {
        if (DEADMONSTER(mtmp)) continue;
        m_calcdistress(mtmp);
    }
}

// C ref: mon.c movemon_singlemon(mtmp) — drive one monster's move, returning
// true if it still has movement points left after this action.
function movemon_singlemon(mtmp) {
    if (DEADMONSTER(mtmp)) return false;
    if (mtmp.mx == null || mtmp.mx <= 0) return false; // off-map

    // C: monster only acts once its accumulated movement reaches NORMAL_SPEED.
    if ((mtmp.movement || 0) < NORMAL_SPEED) return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED)
        game._somebody_can_move = true;

    // makemon.c sets mcansee=mcanmove=TRUE and mpeaceful=peace_minded() on
    // every monster.  The JS makemon doesn't store those move-loop fields, so
    // materialize the C defaults the first time a monster is driven.  No RNG
    // is consumed here: peace_minded only rolls for co-aligned monsters and
    // those rolls already happened in the makemon RNG stream at create time.
    initMonMoveState(mtmp);

    dochug(mtmp);
    return false;
}

// C ref: mon.c movemon(void) — one pass over every monster.  Returns true if
// at least one monster still has a full NORMAL_SPEED of movement left (so the
// caller's inner loop should run another pass).
function movemon_pass() {
    game._somebody_can_move = false;
    // iter_mons_safe: snapshot the list so deaths/spawns mid-iteration are safe.
    // C iterates the `fmon` chain, into which makemon prepends each new
    // monster (makemon.c:1249 `mtmp->nmon = fmon; fmon = mtmp;`).  fmon is
    // therefore in reverse-creation order — newest monster first.  Our level
    // stores monsters in creation order, so iterate the snapshot reversed to
    // reproduce C's per-monster RNG ordering.
    const snapshot = fmonOrder();
    for (const mtmp of snapshot)
        movemon_singlemon(mtmp);
    return !!game._somebody_can_move;
}

// C ref: mon.c movemon(void) / allmain.c inner movement loop.  A single pass
// over all monsters.  (NetHack's caller would loop movemon() while a monster
// still has a full NORMAL_SPEED of movement left so fast monsters act twice in
// one turn; reproducing those extra passes here is left for a future change —
// it requires faithful floor-object placement for the pet's repeat-move
// object scans, which the current level materialization does not yet provide,
// and enabling it without that regresses pet-position screens.)
export function movemon() {
    return movemon_pass();
}
