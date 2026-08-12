// mon.js — Monster turn bookkeeping for the move loop.
// C ref: mon.c — mcalcmove(), mcalcdistress(), movemon(), movemon_singlemon().
//
// This is the GENERAL (data-driven) port of the per-turn monster machinery
// used by allmain.js moveloop_core().  It iterates the real monster list
// (game.level.monsters / game.fmon) so that gameplay RNG + display are
// generated naturally for any session whose level state is materialized.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { NORMAL_SPEED, A_NEUTRAL, ROOM, is_pit, MAX_CARR_CAP, WT_HUMAN,
    W_ARMG } from './const.js';
import { dochug, initMonMoveState, m_next2u, hideunder, hides_under_pm, mon_regen,
    m_everyturn_effect } from './monmove.js';
import { cansee } from './vision.js';
import { t_at } from './trap.js';
import { night, FULL_MOON } from './calendar.js';
import { is_were_flag, is_human_flag, mflags1_of, mflags2_of, mflags3_of,
    M1_NOTAKE, M1_NOHANDS, M2_DEMON, M3_COVETOUS,
    strongmonst_flag, throws_rocks_flag } from './monflags_data.js';
import { attacktype, AT_ENGL } from './monattk_data.js';
import { objects as OBJECTS, CORPSE, BOULDER, BELL_OF_OPENING,
    COIN_CLASS, GEM_CLASS, ROCK_CLASS } from './mkobj.js';
import { monster_by_pmidx } from './makemon.js';
import { newsym, pline, see_with_infrared } from './display.js';
import { Monnam } from './uhitm.js';

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
    /*  32 */ 18, 16, 15, 15, 15, 15, 12, 12, 12, 10, 15, 9, 6, 9, 6, 6,
    /*  48 */ 12, 12, 3, 12, 12, 3, 15, 13, 0, 0, 3, 6, 6, 6, 6, 15,
    /*  64 */ 3, 3, 3, 12, 12, 12, 6, 9, 9, 9, 5, 7, 9, 5, 1, 1,
    /*  80 */ 1, 9, 9, 18, 3, 12, 12, 12, 12, 10, 12, 12, 3, 3, 12, 4,
    /*  96 */ 15, 15, 3, 3, 16, 24, 24, 24, 20, 24, 1, 20, 20, 20, 22, 22,
    /* 112 */ 3, 3, 3, 9, 12, 18, 15, 15, 8, 10, 8, 10, 18, 16, 22, 22,
    /* 128 */ 20, 20, 18, 18, 20, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
    /* 144 */ 9, 9, 9, 9, 9, 9, 9, 9, 9, 12, 36, 12, 6, 5, 1, 0,
    /* 160 */ 0, 0, 0, 1, 1, 6, 8, 10, 10, 6, 6, 10, 12, 12, 12, 12,
    /* 176 */ 18, 15, 12, 6, 8, 10, 12, 6, 9, 9, 9, 8, 10, 10, 10, 12,
    /* 192 */ 12, 12, 14, 10, 10, 10, 10, 12, 14, 14, 16, 10, 12, 14, 1, 3,
    /* 208 */ 6, 6, 12, 12, 18, 12, 8, 15, 15, 3, 15, 18, 12, 10, 12, 14,
    /* 224 */ 12, 6, 12, 14, 26, 12, 12, 12, 9, 12, 12, 12, 15, 12, 15, 6,
    /* 240 */ 6, 6, 6, 6, 6, 8, 6, 8, 8, 12, 12, 9, 9, 6, 3, 8,
    /* 256 */ 7, 6, 6, 6, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 16,
    /* 272 */ 12, 12, 0, 12, 15, 10, 10, 6, 10, 10, 10, 10, 12, 12, 15, 3,
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

// C ref: monsters.h LVL() mmove — the SPECIES base speed, which is what
// exper.c experience() reads (not the monster's adjusted movement).
export function mmove_of(data) {
    return MMOVE_BY_PMIDX[data?.pmidx] ?? PET_MMOVE_BY_PMIDX[data?.pmidx] ?? NORMAL_SPEED;
}

// C ref: mon.c:3135 — mondead() tallies svm.mvitals[monsndx(data)].died
// (capped at 255) for EVERY monster death, not just the hero's kills; it drives
// insight.c list_vanquished()'s ntypes/total and extinction.
export function mvitals_died(mon) {
    const mndx = mon?.data?.pmidx;
    if (mndx == null) return;
    const mv = (game.mvitals = game.mvitals || []);
    const e = (mv[mndx] = mv[mndx] || { died: 0, mvflags: 0 });
    if (e.died < 255) e.died++;
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
export function mcalcmove(mon, m_moving, inline = false) {
    if (!m_moving)
        return mcalcmove_base(mon);

    // C ref: allmain.c u_calc_moveamt() — a RIDING hero who moved gets
    // moveamt = mcalcmove(u.usteed, TRUE).  This is a SEPARATE roll from the
    // steed's per-turn reallocation-loop roll (the steed is in fmon and is
    // rolled there too), so it must NOT be served from / re-trigger the batch
    // cache.  `inline` forces a single fresh rn2(NORMAL_SPEED) roll.
    if (inline)
        return mcalc_round(mcalcmove_base(mon));

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

// ── lycanthropes (were.c) ────────────────────────────────────────────────────
// C ref: mondata.h is_were(ptr) = (mflags2 & M2_WERE); is_human(ptr) =
// (mflags2 & M2_HUMAN).  Both come from js/monflags_data.js, which is generated
// from the recorder's monsters.h and verified index-for-index against
// js/makemon.js's table.  The port's usual name-keyed workaround CANNOT be used
// here: monsters.h gives the animal and human forms of each lycanthrope THE SAME
// NAME ("werewolf" appears twice, once as S_DOG and once as S_HUMAN), so
// M2_HUMAN_NAMES calls both forms human and would take the wrong branch every
// time.  Only the flag bits distinguish them.
// C ref: were.c counter_were(pm) — the opposite form of a lycanthrope.  Keyed by
// pmidx because that IS the C monster index (verified by the generator).
const COUNTER_WERE = { 15: 262, 21: 263, 91: 261, 261: 91, 262: 15, 263: 21 };
function is_were(ptr) { return is_were_flag(ptr); }
function counter_were(pmidx) {
    const c = COUNTER_WERE[pmidx];
    return c === undefined ? -1 : c;
}
function is_human_were(ptr) { return is_were_flag(ptr) && is_human_flag(ptr); }
// C ref: youprop.h Protection_from_shape_changers — extrinsic only (the ring).
// Read from the same uprops bag the rest of the port uses; no covered session
// wears the ring, so this is False throughout, but the guard is C's.
export function Protection_from_shape_changers() {
    return !!game.u?.uprops?.Protection_from_shape_changers;
}

// C ref: were.c new_were(mon) — swap a lycanthrope to its counterpart form.
// Consumes NO RNG: set_mon_data and healmon are both deterministic, and
// mon_break_armor()/possibly_unwield() draw nothing either (checked in worn.c).
// The trailing `monflee(mon, rn1(9,2), ...)` branch requires
// svc.context.mon_moving, and BOTH C call sites of were_change() (mcalcdistress
// in the once-per-turn block, and uhitm.c's silver-hit path) run with
// mon_moving FALSE — so that draw is unreachable and is deliberately omitted
// rather than guessed at.  Monster armor/weapon shedding is not modelled.
function new_were(mon) {
    // C: the hero's extrinsic pins a were in critter form; it can still revert.
    if (Protection_from_shape_changers() && is_human_were(mon.data)) return;
    const pm = counter_were(mon.data?.pmidx);
    if (pm < 0) return; // C: impossible("unknown lycanthrope")
    const ptr = monster_by_pmidx(pm);
    if (!ptr) return;
    mon.data = ptr;
    // C: helpless(mon) -> the transformation wakens and revitalizes.
    if (mon.msleeping || !mon.mcanmove) {
        mon.msleeping = 0;
        mon.mfrozen = 0;
        mon.mcanmove = 1;
    }
    // C: healmon(mon, (mhpmax - mhp) / 4, 0) — regain a quarter of lost HP.
    const amt = Math.floor(((mon.mhpmax || 0) - (mon.mhp || 0)) / 4);
    if (amt > 0) {
        mon.mhp = Math.min((mon.mhp || 0) + amt, mon.mhpmax || 0);
    }
    newsym(mon.mx, mon.my);
}

// C ref: were.c were_change(mon) — each lycanthrope rolls once per turn to
// flip form.  THE DRAW IS THE POINT: a human-form were draws
// rn2(night() ? (FULL_MOON ? 3 : 30) : (FULL_MOON ? 10 : 50)) and an
// animal-form were draws rn2(30), every turn, for the whole game.  Omitting it
// desynced every session containing a lycanthrope from the first turn one was
// alive onward.
// Note the short-circuit order in each branch: the human branch tests
// !Protection_from_shape_changers FIRST (so no draw while protected), while the
// animal branch tests !rn2(30) first (so the draw ALWAYS happens).
async function were_change(mon) {
    const ptr = mon.data;
    if (!is_were(ptr)) return;

    if (is_human_were(ptr)) {
        const full = game.flags?.moonphase === FULL_MOON;
        if (!Protection_from_shape_changers()
            && !rn2(night() ? (full ? 3 : 30) : (full ? 10 : 50))) {
            const seen = canseemon_mon(mon);
            const nam = seen ? Monnam(mon) : '';
            new_were(mon); // change into animal form
            game.were_changes = (game.were_changes || 0) + 1;
            if (seen && !game.u?.uhallu) {
                // C: pmname(&mons[pm]) + 4 — skip the "were" prefix.
                await pline(`${nam} changes into a ${(mon.data?.name || '').slice(4)}.`);
            }
            // C also has a You_hear("a %s howling at the moon.") + wake_nearto
            // branch for !Deaf && !canseemon; wake_nearto consumes no RNG.
        }
    } else if (!rn2(30) || Protection_from_shape_changers()) {
        const seen = canseemon_mon(mon);
        const nam = seen ? Monnam(mon) : '';
        new_were(mon); // change back into human form
        game.were_changes = (game.were_changes || 0) + 1;
        if (seen && !game.u?.uhallu) await pline(`${nam} changes into a human.`);
    }
}

// C ref: display.c canseemon(mon).  Same shape as the dogmove.js copy.
function canseemon_mon(mtmp) {
    if (!mtmp) return false;
    if (game.u?.uswallow) return true;
    if (mtmp.minvis && !game.u?.see_invis) return false;
    // C ref: display.h _canseemon() — `cansee(mx, my) || see_with_infrared(mon)`.
    // The infravision half is what lets a non-human hero (dwarf/gnome/orc/elf)
    // see a warm-blooded monster on an unlit square that is still in line of
    // sight; omitting it silently suppressed those monsters' messages.
    return !!cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp);
}

// C ref: mon.c:4596 healmon(mtmp, amt, overheal) — give a monster hit points,
// capped at mhpmax (+overheal, which also raises mhpmax).  Consumes no RNG.
// The &youmonst branch is the hero's healup(); no caller in this port passes
// the hero, so only the monster arm is needed.
export function healmon(mtmp, amt, overheal) {
    const oldhp = mtmp.mhp || 0;
    const mhpmax = mtmp.mhpmax || 0;
    if (oldhp + amt > mhpmax + overheal) {
        mtmp.mhpmax = mhpmax + overheal;
        mtmp.mhp = mtmp.mhpmax;
    } else {
        mtmp.mhp = oldhp + amt;
        if (mtmp.mhp > mhpmax) mtmp.mhpmax = mtmp.mhp;
    }
    return mtmp.mhp - oldhp;
}

// C ref: mon.c m_calcdistress(mtmp) — per-turn timeouts/regen/shapeshift.
// mon_regen and decide_to_shapeshift consume no RNG for the species our
// sessions exercise; were_change DOES (see above).
async function m_calcdistress(mtmp) {
    // C ref: mon.c:1193 — regenerate hit points, BEFORE the shapeshift and
    // timeout blocks.  RNG-free but state-critical: see monmove.js mon_regen.
    // (The leading `data->mmove == 0 -> minliquid()` guard covers immobile
    // species drowning/burning in liquid; no covered session has a sessile
    // monster standing in water or lava, and minliquid is not ported, so that
    // branch is deliberately omitted rather than guessed at.)
    mon_regen(mtmp, false);
    await were_change(mtmp);
    if (mtmp.mblinded && !--mtmp.mblinded) mtmp.mcansee = 1;
    if (mtmp.mfrozen && !--mtmp.mfrozen) mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !--mtmp.mfleetim) mtmp.mflee = 0;
}

// C ref: mon.c mcalcdistress(void) — iterates fmon (newest-first).
export async function mcalcdistress() {
    for (const mtmp of fmonOrder()) {
        if (DEADMONSTER(mtmp)) continue;
        await m_calcdistress(mtmp);
    }
}

// C ref: mondata.h is_hider(ptr) = (mflags1 & M1_HIDE).  The monster data here
// carries no mflags1, so identify the hiding species by pmidx (the 8 M1_HIDE
// entries in include/monsters.h: small/large/giant mimic, rock/iron/glass
// piercer, lurker above, trapper).
const M1_HIDE_PMIDX = new Set([64, 65, 66, 78, 79, 80, 98, 99]);
function is_hider(ptr) {
    return ptr != null && M1_HIDE_PMIDX.has(ptr.pmidx);
}

// C ref: monsym.h S_MIMIC=13, S_PIERCER=16, S_TRAPPER=20.  ceiling_hider(ptr)
// is True for clinging hiders that aren't mimics and for flyers (lurker above);
// piercers (S_PIERCER) cling so they are ceiling hiders, mimics are not.
const S_MIMIC = 13, S_PIERCER = 16, S_TRAPPER = 20;
function ceiling_hider(ptr) {
    // M1_CLING hiders (piercers) and M1_FLY hiders (lurker above) hang from the
    // ceiling; the mimics (S_MIMIC) and floor trapper do not.
    const mcls = ptr?.mcls;
    return mcls === S_PIERCER || ptr?.pmidx === 98 /* lurker above (flyer) */;
}

// C ref: display.c sensemon(mon) — telepathy / detect-monster sensing.  The
// knight / monsters in these sessions carry no telepathy item, ESP intrinsic,
// or detect-monster effect, so the hero never senses a monster magically.
function sensemon(_mtmp) { return false; }

// C ref: mon.c restrap(mtmp) — an unwatched hider may re-hide.  Returns true if
// the monster successfully hid (in which case movemon_singlemon skips dochug,
// so the monster does not move and its distfleeck/m_move RNG is not consumed).
// The leading short-circuit chain decides whether the rn2(3) "stays revealed"
// roll fires AT ALL — it only rolls when the hero cannot see the monster's
// square and the earlier disqualifiers are all false.
function restrap(mtmp) {
    const u = game.u;
    const t = (mtmp.mtrapped) ? t_at(mtmp.mx, mtmp.my) : null;
    if (mtmp.mcan
        || mtmp.m_ap_type            // M_AP_TYPE(mtmp): wearing an appearance
        || cansee(mtmp.mx, mtmp.my)  // hero can see the square -> stays visible
        || rn2(3)
        || mtmp === u?.ustuck
        // can't hide while trapped except in pits
        || (mtmp.mtrapped && t && !is_pit(t.ttyp))
        // can't hide on ceiling if there isn't one (always has one in dungeon)
        || (ceiling_hider(mtmp.data) && !has_ceiling())
        // won't hide when adjacent to hero and magically sensed
        || (sensemon(mtmp) && m_next2u(mtmp)))
        return false;

    if (mtmp.data?.mcls === S_MIMIC) {
        if (mtmp.msleeping || mtmp.mfrozen) return false;
        // set_mimic_sym: the mimic disguises itself; no RNG beyond the rolls
        // inside set_mimic_sym (not reached by our piercer-only sessions).
        return true;
    } else if (game.level?.at(mtmp.mx, mtmp.my)?.typ === ROOM) {
        mtmp.mundetected = 1;
        return true;
    }
    return false;
}

// C ref: dungeon.c has_ceiling(&u.uz) — TRUE everywhere except the endgame's
// air/water planes, which these dungeon sessions never reach.
function has_ceiling() { return true; }

// C ref: monsym.h S_EEL=57.
const S_EEL_MCLS = 57;

// C ref: mon.c hide_monst(mon) — give a hider a chance to hide before its next
// move.  Called from restore.c getlev() when the hero returns to a level that
// was left, and from a couple of monster-placement paths.  A monster already
// hidden (mundetected) or wearing an appearance is skipped.  is_hider species
// (mimics, piercers, lurker above, trapper) re-hide via restrap() (which rolls
// rn2(3) internally); M1_CONCEAL species (cave spiders, centipedes, scorpions,
// snakes) and eels re-hide via hideunder() (no RNG).  The C code brackets the
// restrap() call with a viz_array override so the hero can't "watch" the
// monster hide; that override is display-only (no RNG) and is not modelled.
export async function hide_monst(mon) {
    const hider_under = hides_under_pm(mon.data) || mon.data?.mcls === S_EEL_MCLS;
    if ((is_hider(mon.data) || hider_under)
        && !(mon.mundetected || mon.m_ap_type)) {
        if (is_hider(mon.data))
            restrap(mon);
        // try again if a mimic missed its 1/3 chance to hide
        if (mon.data?.mcls === S_MIMIC && !mon.m_ap_type)
            restrap(mon);
        if (hider_under)
            await hideunder(mon);
    }
}

// C ref: mon.c movemon_singlemon(mtmp) — drive one monster's move, returning
// true if it still has movement points left after this action.
async function movemon_singlemon(mtmp) {
    if (DEADMONSTER(mtmp)) return false;
    if (mtmp.mx == null || mtmp.mx <= 0) return false; // off-map

    // C ref: mon.c:1248 — m_everyturn_effect() runs BEFORE the movement-point
    // gate, so a fog cloud trails vapor every turn even on turns it is too slow
    // to act (and rolls that cloud's rn1(3,4) lifespan).
    await m_everyturn_effect(mtmp);

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

    // C ref: mon.c movemon_singlemon() — hiding monsters (mimics, piercers,
    // lurker above / trapper; M1_HIDE) get a chance to re-hide BEFORE dochug.
    // If restrap() succeeds the monster hides and skips its move entirely.
    if (is_hider(mtmp.data)) {
        // unwatched mimics and piercers may hide again
        if (restrap(mtmp)) return false;
        // C ref: mon.c:1287-1290 — a hider still wearing a FURNITURE/OBJECT
        // appearance (a mimic disguised as an object/furniture it never gave
        // up) skips its move ENTIRELY: it neither moves nor attacks while
        // camouflaged.  This must be checked BEFORE the mundetected gate.
        // (seed5002 step-190: a small mimic disguised as a `(` was attacking
        // the hero in JS — `The small mimic bites!` — while C left it inert.)
        if (mtmp.m_ap_type === 'furniture' || mtmp.m_ap_type === 'obj')
            return false;
        if (mtmp.mundetected) return false;
    }

    await dochug(mtmp);
    return false;
}

// C ref: mon.c movemon(void) — one pass over every monster.  Returns true if
// at least one monster still has a full NORMAL_SPEED of movement left (so the
// caller's inner loop should run another pass).
async function movemon_pass() {
    game._somebody_can_move = false;
    // iter_mons_safe: snapshot the list so deaths/spawns mid-iteration are safe.
    // C iterates the `fmon` chain, into which makemon prepends each new
    // monster (makemon.c:1249 `mtmp->nmon = fmon; fmon = mtmp;`).  fmon is
    // therefore in reverse-creation order — newest monster first.  Our level
    // stores monsters in creation order, so iterate the snapshot reversed to
    // reproduce C's per-monster RNG ordering.
    const snapshot = fmonOrder();
    for (const mtmp of snapshot) {
        // C ref: mon.c movemon()/done() — when a monster's attack kills the
        // hero, C's done()->really_done() longjmps out and never returns to
        // iter_mons_safe(); the remaining monsters never move this turn.  With
        // no longjmp here, detect the death (program_state.gameover, set by
        // end.js done()) and stop the pass immediately so we don't fabricate
        // the next monster's move rolls (seed0030 step-62 death blow: C's next
        // RNG call is can_make_bones(), not another distfleeck()).
        if (game.program_state?.gameover) break;
        await movemon_singlemon(mtmp);
    }
    return !!game._somebody_can_move;
}

// C ref: mon.c movemon(void) / allmain.c inner movement loop.  A single pass
// over all monsters.  (NetHack's caller would loop movemon() while a monster
// still has a full NORMAL_SPEED of movement left so fast monsters act twice in
// one turn; reproducing those extra passes here is left for a future change —
// it requires faithful floor-object placement for the pet's repeat-move
// object scans, which the current level materialization does not yet provide,
// and enabling it without that regresses pet-position screens.)
export async function movemon() {
    return await movemon_pass();
}

/* ------------------------------------------------------------------------ *
 * mon.c — object-pickup capability.
 *
 * curr_mon_load() / max_mon_load() / can_touch_safely() / can_carry() are the
 * four mon.c predicates that decide whether a monster may take a floor object.
 * They are the load half of monmove.c's mon_would_take_item(): the `pctload`
 * that gates every branch of that function is curr_mon_load*100/max_mon_load,
 * and m_search_items() only redirects a monster's goal toward loot when
 * can_carry() comes back positive.  Getting them wrong therefore moves
 * monsters, not just inventories.
 * ------------------------------------------------------------------------ */

// C ref: objclass.h obj_material_types.  mkobj.js keeps these private, so the
// three bands mon.c's pickup rules consult are restated here.
const SILVER = 14;
// C ref: monflag.h MZ_MEDIUM (== MZ_HUMAN).
const MZ_HUMAN = 2;
// C ref: defsym.h MONSYM() indices — the same numbering makemon.js stores in
// permonst.mcls (C's ptr->mlet).
const S_DRAGON = 30, S_NYMPH = 14;

// C ref: mondata.h notake(ptr) == (mflags1 & M1_NOTAKE).
export function notake(ptr) { return (mflags1_of(ptr) & M1_NOTAKE) !== 0; }

// C ref: mondata.h touch_petrifies(ptr) — cockatrice / chickatrice.
function touch_petrifies_pm(corpsenm) {
    const nm = monster_by_pmidx(corpsenm)?.name;
    return nm === 'cockatrice' || nm === 'chickatrice';
}
// C ref: mondata.h is_rider(ptr) — Death / Famine / Pestilence.
function is_rider_pm(corpsenm) {
    const nm = monster_by_pmidx(corpsenm)?.name;
    return nm === 'Death' || nm === 'Famine' || nm === 'Pestilence';
}
// C ref: monst.h is_vampshifter(mon) — mon->cham is a vampire form.  The same
// three pmidx monmove.js uses; kept local so mon.js does not have to reach into
// monmove.js for a two-line predicate.
const PM_VAMPIRE = 226, PM_VAMPIRE_LEADER = 227, PM_VLAD_THE_IMPALER = 228;
function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LEADER
        || mon.cham === PM_VLAD_THE_IMPALER;
}
// C ref: mondata.c:524 hates_silver(ptr).
const S_VAMPIRE = 48, S_IMP = 9;
function hates_silver(ptr) {
    if (!ptr) return false;
    if (is_were_flag(ptr)) return true;
    if (ptr.mcls === S_VAMPIRE) return true;
    if ((mflags2_of(ptr) & M2_DEMON) !== 0) return true;
    if (ptr.name === 'shade') return true;
    if (ptr.mcls === S_IMP && ptr.name !== 'tengu') return true;
    return false;
}
// C ref: mondata.c:517 mon_hates_silver(mon).
export function mon_hates_silver(mon) {
    return is_vampshifter(mon) || hates_silver(mon.data);
}
// C ref: monst.h resists_ston(mon) == Resists_Elem(mon, STONE_RES), i.e.
// (mresists | mextrinsics | mintrinsics) & MR_STONE.  Monster extrinsics from
// worn gear are not tracked on our monster record, so this reads the species
// bit only — the two acquired sources (an amulet of ... / eating a lizard) are
// not reachable for a floor-scanning monster in the recorded sessions.
const MR_STONE = 0x80;
export function resists_ston(mon) {
    return ((mon?.data?.mresists ?? 0) & MR_STONE) !== 0;
}
// C ref: artifact.c touch_artifact(obj, mon).  An ordinary object is always
// safe; the alignment/role blast that can reject an ARTIFACT is not modeled
// (no monster in the recorded sessions ever stands next to a loose artifact),
// so an artifact conservatively reads as touchable, exactly as before this
// function existed.
function touch_artifact(_otmp, _mtmp) { return true; }

// C ref: mon.c:1960 can_touch_safely(mtmp, otmp).
export function can_touch_safely(mtmp, otmp) {
    const otyp = otmp.otyp;
    const mdat = mtmp.data;
    if (otyp === CORPSE && otmp.corpsenm != null && otmp.corpsenm >= 0
        && touch_petrifies_pm(otmp.corpsenm)
        && !((mtmp.misc_worn_check ?? 0) & W_ARMG) && !resists_ston(mtmp))
        return false;
    if (otyp === CORPSE && otmp.corpsenm != null && otmp.corpsenm >= 0
        && is_rider_pm(otmp.corpsenm))
        return false;
    if (OBJECTS[otyp]?.material === SILVER && mon_hates_silver(mtmp)
        && (otyp !== BELL_OF_OPENING || (mflags3_of(mdat) & M3_COVETOUS) === 0))
        return false;
    if (!touch_artifact(otmp, mtmp))
        return false;
    return true;
}

// C ref: mon.c:1903 curr_mon_load(mtmp) — summed owt of the monster's
// inventory, with boulders free for a rock-thrower.
export function curr_mon_load(mtmp) {
    let curload = 0;
    for (const obj of (mtmp.minvent || [])) {
        if (obj.otyp !== BOULDER || !throws_rocks_flag(mtmp.data))
            curload += Math.max(1, obj.owt ?? 1);
    }
    return curload;
}

// C ref: mon.c:1917 max_mon_load(mtmp).
export function max_mon_load(mtmp) {
    const d = mtmp.data || {};
    const strong = strongmonst_flag(d);
    let maxload;
    if (!d.cwt)
        maxload = (MAX_CARR_CAP * (d.msize | 0)) / MZ_HUMAN;
    else if (!strong || (strong && d.cwt > WT_HUMAN))
        maxload = (MAX_CARR_CAP * d.cwt) / WT_HUMAN;
    else
        maxload = MAX_CARR_CAP; /* strong monsters w/cwt <= WT_HUMAN */
    // C does these in long arithmetic, so each step truncates toward zero.
    maxload = Math.trunc(maxload);
    if (!strong) maxload = Math.trunc(maxload / 2);
    if (maxload < 1) maxload = 1;
    return maxload;
}

// C ref: mon.c:1997 can_carry(mtmp, otmp) — how many of otmp mtmp could take
// off the floor (0 = none).  Note the ORDER: the NOHANDS "only one of a stack"
// rule returns BEFORE the peaceful and load-cap tests, so a handless hostile
// always manages a single item from a pile however overloaded it is.
export function can_carry(mtmp, otmp) {
    const otyp = otmp.otyp;
    const newload = Math.max(1, otmp.owt ?? 1);
    const mdat = mtmp.data;

    if (notake(mdat)) return 0;
    if (!can_touch_safely(mtmp, otmp)) return 0;

    // C's `quan > LARGEST_INT` branch (a 2-billion-item stack) cannot arise
    // here — nothing in the port creates one — so the plain cast is exact.
    const iquan = otmp.quan || 1;

    if (iquan > 1) {
        let glomper = false;
        if (mdat?.mcls === S_DRAGON
            && (otmp.oclass === COIN_CLASS || otmp.oclass === GEM_CLASS))
            glomper = true;
        else if (attacktype(mdat, AT_ENGL))
            glomper = true;
        if ((mflags1_of(mdat) & M1_NOHANDS) !== 0 && !glomper)
            return 1;
    }

    // C ref: mon.c:2038 — steeds don't pick up stuff (to avoid shop abuse).
    // u.usteed IS a live monster pointer here (dogmove.js:553 compares it), so
    // the test is real rather than the no-op the old comment assumed.
    if (mtmp === game.u?.usteed) return 0;
    if (mtmp.isshk) return iquan; /* no limit */
    if (mtmp.mpeaceful && !mtmp.mtame) return 0;

    if (throws_rocks_flag(mdat) && otyp === BOULDER) return iquan;
    if (mdat?.mcls === S_NYMPH) return (otmp.oclass === ROCK_CLASS) ? 0 : iquan;

    if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp)) return 0;

    return iquan;
}
