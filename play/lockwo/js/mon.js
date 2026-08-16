// mon.js — Monster turn bookkeeping for the move loop.
// C ref: mon.c — mcalcmove(), mcalcdistress(), movemon(), movemon_singlemon().
//
// This is the GENERAL (data-driven) port of the per-turn monster machinery
// used by allmain.js moveloop_core().  It iterates the real monster list
// (game.level.monsters / game.fmon) so that gameplay RNG + display are
// generated naturally for any session whose level state is materialized.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { NORMAL_SPEED, A_NEUTRAL, ROOM, is_pit, MAX_CARR_CAP, WT_HUMAN,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, I_SPECIAL,
    IS_DOOR, IS_POOL, IS_LAVA, WATER, Is_waterlevel,
    D_CLOSED, D_LOCKED } from './const.js';
import { Conflict, resist_conflict, m_canseeu } from './monmove.js';
import { mattackm } from './mhitm.js';
import { M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, MON_MIGRATING } from './const.js';
import { dochugw, initMonMoveState, m_next2u, hideunder, hides_under_pm, mon_regen,
    m_everyturn_effect, monflee, onscary } from './monmove.js';
import { cansee, Blind } from './vision.js';
import { t_at } from './trap.js';
import { night, FULL_MOON } from './calendar.js';
import { is_were_flag, is_human_flag, mflags1_of, mflags2_of, mflags3_of,
    M1_NOTAKE, M1_NOHANDS, M1_AMORPHOUS, M1_HIDE, M1_CLING, M1_FLY, M1_TPORT,
    M1_BREATHLESS, M1_SLITHY, M2_DEMON, M3_COVETOUS, mindless,
    humanoid, is_animal, nohands,
    strongmonst_flag, throws_rocks_flag } from './monflags_data.js';
import { attacktype, AT_ENGL } from './monattk_data.js';
import { objects as OBJECTS, CORPSE, BOULDER, BELL_OF_OPENING,
    COIN_CLASS, GEM_CLASS, ROCK_CLASS, place_object } from './mkobj.js';
import { monster_by_pmidx, newcham, enexto_spawn,
    pickvampshape_pub, set_mimic_sym } from './makemon.js';
import { newsym, pline, update_topl, see_with_infrared, canseemon_shared } from './display.js';
import { dist2 } from './hacklib.js';
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
//
// The mail-daemon splice (mons[] gained PM_MAIL_DAEMON at pmidx 314 under
// MAIL_STRUCTURES) never reached this table, so every species from 314 on read
// its SUCCESSOR's speed — jellyfish got the djinni's 18 against C's 3, piranha
// 12 instead of 18, kraken 6 instead of 3.  A wrong speed does not shift the
// RNG *stream*, but it hands the rn2(NORMAL_SPEED) allotment to the wrong
// monsters, so a different SET of monsters acts and their m_move draws land in
// a different order.  Verified index-for-index with swarm/bin/speedaudit.mjs.
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
    /* 304 */ 18, 9, 3, 15, 9, 12, 15, 12, 12, 12, 24, 12, 3, 18, 12, 9,
    /* 320 */ 10, 3, 6, 6, 6, 6, 6, 5, 9, 12, 0, 12, 12, 12, 12, 12,
    /* 336 */ 12, 12, 12, 12, 12, 12, 12, 12, 15, 15, 15, 15, 15, 15, 15, 15,
    /* 352 */ 15, 15, 15, 15, 15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
    /* 368 */ 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
]);

// Starting pets get a hand-built permonst stand-in from dog.js with no mmove
// field, so they miss the `d.mmove != null` fast path below.  Their pmidx now
// agrees with MONS (little dog 16, kitten 32, pony 100), which makes this table
// redundant with MMOVE_BY_PMIDX — keep it as the explicit statement of the
// three species speeds C gives them (monsters.h LVL(.,18,.) / LVL(.,16,.)).
const PET_MMOVE_BY_PMIDX = Object.freeze({
    16: 18,  // little dog (PM_LITTLE_DOG)
    32: 18,  // kitten (PM_KITTEN)
    100: 16, // pony (PM_PONY)
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

// The live monster list for the current level.  C uses the `fmon` chain; our
// level stores monsters in an array.  This is the RAW list — dead and off-map
// monsters are still in it (C's dmonsfree() unlink is not modelled), so every
// caller applies its own DEADMONSTER() / mon_offmap() filter, exactly as C's
// iter_mons_safe() does.
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

// C ref: mon.c:1126 mcalcmove(mon, m_moving) — the species/speed math BEFORE
// the random rounding.  Draws only for a galloping steed (see below).
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
    // C ref: mon.c:1147 — `if (mon == u.usteed && u.ugallop && svc.context.mv)
    // mmove = ((rn2(2) ? 4 : 5) * mmove) / 3;`.  This DRAWS, and it draws for
    // BOTH values of m_moving (the mounted hero's u_calc_moveamt call and the
    // steed's own reallocation-loop call), one rn2(2) ahead of the rounding
    // roll.  Nothing in this port sets u.ugallop yet (steed.js only clears it
    // on dismount), so it is latent — but the guard is C's, not an assumption.
    if (mon && mon === game.u?.usteed && game.u?.ugallop && game.context?.mv)
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    return mmove;
}

// C ref: mon.c:1155-1166 mcalcmove()'s trailing `if (m_moving)` block — randomly
// round `mmove` up to a multiple of NORMAL_SPEED.  There is no `if (mmove)`
// guard in C, so the rn2(NORMAL_SPEED) is drawn for EVERY monster on every
// reallocation, even a speed-0 sessile one whose mmove_adj is 0 (the draw
// happens, the `< 0` comparison then always fails) — which is why an incorrect
// base speed shifts allotments but never shifts the RNG stream.
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
// Read from the same uprops bag the rest of the port uses.  Nothing sets it
// yet, so it is False throughout; note that when it DOES get set, C also runs
// mon.c:4622 rescham() (every chameleon/mimic snaps back to its natural shape
// and every were reverts to human) on put-on and mon.c:4646 restartcham() on
// take-off.  Neither is ported, and both change monster forms wholesale.
export function Protection_from_shape_changers() {
    return !!game.u?.uprops?.Protection_from_shape_changers;
}

// C ref: mon.c:2476 monnear(mon, x, y) — within one (king) step; a grid bug
// can't reach a diagonal neighbour.  Needed by new_were's flee check.
const PM_GRID_BUG = 116;
function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    if (distance === 2 && mon.data?.pmidx === PM_GRID_BUG) return false;
    return distance < 3;
}

// C ref: were.c:96 new_were(mon) — swap a lycanthrope to its counterpart form.
// The order matters: C plines BEFORE set_mon_data (so the message and the
// newsym() that erases/redraws the monster land on either side of a --More--
// boundary the way C renders them), and the trailing
// `monflee(mon, rn1(9,2), TRUE, TRUE)` DRAWS whenever this runs during monster
// movement (svc.context.mon_moving) next to something scary.  That branch is
// unreachable from were_change() — mcalcdistress runs in the once-per-turn
// block with mon_moving FALSE (allmain.c:216 clears it before allmain.c:228) —
// but new_were has three other C call sites (mhitu.c:980/983 when a were bites
// the hero, potion.c's water-prayer revert) that DO run with mon_moving set, so
// the guard is ported rather than assumed away.
// Still not modelled: mon_break_armor()/possibly_unwield() (worn.c) shed armor
// and weapons that no longer fit the new form.  Neither draws RNG, but both
// change the monster's AC / wielded weapon, which later attack rolls read.
async function new_were(mon) {
    // C: the hero's extrinsic pins a were in critter form; it can still revert.
    if (Protection_from_shape_changers() && is_human_were(mon.data)) return;
    const pm = counter_were(mon.data?.pmidx);
    if (pm < 0) return; // C: impossible("unknown lycanthrope")
    const ptr = monster_by_pmidx(pm);
    if (!ptr) return;
    // C ref: were.c:110 — pline() runs with the monster still in its OLD form.
    if (canseemon_mon(mon) && !game.u?.uhallu) {
        // C: pmname(&mons[pm]) + 4 — skip past the "were" prefix.
        const into = is_human_flag(ptr) ? 'human' : (ptr.name || '').slice(4);
        await pline(`${Monnam(mon)} changes into a ${into}.`);
    }
    mon.data = ptr;
    // C: helpless(mon) -> the transformation wakens and revitalizes.
    if (mon.msleeping || !mon.mcanmove) {
        mon.msleeping = 0;
        mon.mfrozen = 0;
        mon.mcanmove = 1;
    }
    // C: healmon(mon, (mhpmax - mhp) / 4, 0) — regain a quarter of lost HP.
    healmon(mon, Math.floor(((mon.mhpmax || 0) - (mon.mhp || 0)) / 4), 0);
    newsym(mon.mx, mon.my);
    // C ref: were.c:132 — mon_break_armor(mon, FALSE).  possibly_unwield() is
    // still unported: it only re-checks the WIELDED weapon, which this port
    // does not give were-forms.
    await mon_break_armor(mon, false);
    if (game.context?.mon_moving && !mon.mpeaceful
        && onscary(mon.mux, mon.muy, mon) && monnear(mon, mon.mux, mon.muy))
        await monflee(mon, rn1(9, 2), true, true); /* 2..10 turns */
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
// C ref: youprop.h Deaf — HDeaf (a timed intrinsic) or EDeaf (worn).  Same
// shape as sounds.js Deaf_hero(); only the timed intrinsic is reachable.
function Deaf() {
    const u = game.u;
    return ((u?.uprops?.HDeaf ?? 0) > 0) || !!u?.Deaf;
}

// C ref: makemon MONS-table indices of the ANIMAL lycanthrope forms (the human
// forms are 261/262/263).  were.c's howl switch names only PM_WEREWOLF and
// PM_WEREJACKAL — a wererat makes no noise.
const PM_WEREJACKAL = 15, PM_WEREWOLF = 21;

async function were_change(mon) {
    const ptr = mon.data;
    if (!is_were(ptr)) return;

    if (is_human_were(ptr)) {
        const full = game.flags?.moonphase === FULL_MOON;
        if (!Protection_from_shape_changers()
            && !rn2(night() ? (full ? 3 : 30) : (full ? 10 : 50))) {
            await new_were(mon); // change into animal form
            game.were_changes = (game.were_changes || 0) + 1;
            // C ref: were.c:20-38 — an UNSEEN were that just took animal form
            // howls.  This is not cosmetic: wake_nearto() clears msleeping on
            // every monster within 16 squared units, and a monster C woke but
            // this port left asleep skips its entire dochug() (every m_move
            // rn2, every attack roll) from the next monster phase onward.
            if (!Deaf() && !canseemon_mon(mon)) {
                const mndx = mon.data?.pmidx;
                const howler = mndx === PM_WEREWOLF ? 'wolf'
                             : mndx === PM_WEREJACKAL ? 'jackal' : null;
                if (howler) {
                    // C ref: were.c:37 You_hear() -> pline -> vpline ->
                    // update_topl, which APPENDS to an unacknowledged top line.
                    // mon_break_armor's "You hear a thud." fires first (were.c
                    // :129 runs before this), and C renders both on one line.
                    await update_topl(`You hear a ${howler} howling at the moon.`);
                    const { wake_nearto } = await import('./cmd.js');
                    await wake_nearto(mon.mx, mon.my, 4 * 4);
                }
            }
        }
    } else if (!rn2(30) || Protection_from_shape_changers()) {
        await new_were(mon); // change back into human form
        game.were_changes = (game.were_changes || 0) + 1;
    }
}

// C ref: display.h:118 _canseemon(mon) ==
//     (cansee(mx, my) || see_with_infrared(mon)) && mon_visible(mon)
// with display.h:91 _mon_visible(mon) ==
//     (!mon->minvis || See_invisible) && !mon->mundetected
// The infravision half is what lets a non-human hero (dwarf/gnome/orc/elf) see
// a warm-blooded monster on an unlit square that is still in line of sight;
// omitting it silently suppressed those monsters' messages.  The mundetected
// half was ALSO missing, which made a hidden monster (a piercer on the ceiling,
// a snake under a boulder) read as visible to every mon.js caller — the hide
// message would print and the eel re-hide roll below would be skipped.
// (There is no uswallow special case in C: a swallowed hero sees mon_visible
// monsters only where cansee() says so, which inside a swallower is the
// swallower's own square.)
function canseemon_mon(mtmp) {
    if (!mtmp) return false;
    if (!(cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp))) return false;
    if (mtmp.minvis && !game.u?.see_invis) return false;
    return !mtmp.mundetected;
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

// C ref: mon.c:1180 m_calcdistress(mtmp) — per-turn liquid check / regen /
// shapeshift / timeouts.  mon_regen consumes no RNG; decide_to_shapeshift and
// were_change BOTH do, every turn, for every monster with a cham form or the
// M2_WERE bit (an earlier comment here claimed decide_to_shapeshift was
// RNG-free "for the species our sessions exercise" — it is not, and the draw
// order note immediately below always contradicted it).
// C ref: mon.c:4871-4936 decide_to_shapeshift(mon) — the per-turn shapeshift
// check run from m_calcdistress for every monster with a cham form.
//
// Draw order: a plain shapeshifter costs one rn2(6) per turn (plus rn2(10) when
// it fires); a vampshifter in a shifted form costs the fog-cloud rn2(4)
// (mon.c:4899), and a vampire in its own form the rn2(6) at mon.c:4921 — the
// canseemon/mdistu guards sit AFTER those draws, so they never suppress them.
const STRAT_WAITFORU = 0x20000000;
const PM_FOG_CLOUD_IDX = 106;
const BOLT_LIM_SQ = 8 * 8;
function decide_to_shapeshift(mon) {
    let ptr = null;
    const was_female = mon.female;
    let dochng = false;

    if (!is_vampshifter(mon)) {
        if (!mon.mspec_used && !rn2(6)) {          // mon.c:4879
            dochng = true;
            mon.mspec_used = 3 + rn2(10);          // mon.c:4881
        }
    } else if (!((mon.mstrategy || 0) & STRAT_WAITFORU)) {
        const far_or_unseen = () => (!canseemon_shared(mon)
                                     || mdistu(mon) > BOLT_LIM_SQ);
        if (mon.data?.mcls !== S_VAMPIRE) {
            if ((mon.mhp <= Math.floor((mon.mhpmax + 5) / 6)) && rn2(4)  // mon.c:4894
                && (mon.cham ?? -1) >= 0) {
                ptr = monster_by_pmidx(mon.cham);
                dochng = true;
            } else if (mon.data?.pmidx === PM_FOG_CLOUD_IDX
                       && mon.mhp === mon.mhpmax && !rn2(4)              // mon.c:4899
                       && far_or_unseen()) {
                const mndx = pickvampshape_pub(mon);
                if (mndx >= 0) {
                    ptr = monster_by_pmidx(mndx);
                    dochng = (ptr !== mon.data);
                }
            }
            // C: an amorphous form standing in a closed doorway steps aside
            // first, because its new shape would not fit.  enexto() draws.
            if (dochng && (mflags1_of(mon.data) & M1_AMORPHOUS)
                && closed_door_at(mon.mx, mon.my)) {
                const cc = enexto_spawn(mon.mx, mon.my, ptr);
                if (cc) { mon.mx = cc.x; mon.my = cc.y; newsym(cc.x, cc.y); }
            }
        } else if (mon.mhp >= Math.floor(9 * mon.mhpmax / 10) && !rn2(6)  // mon.c:4921
                   && far_or_unseen()) {
            dochng = true;                         /* 'ptr' stays Null */
        }
    }
    if (dochng && newcham(mon, ptr)) {
        // vampshift overrides newcham's 10% sex change by restoring the
        // original gender when the new form allows either.  No RNG.
        if (is_vampshifter(mon)) {
            const np = mon.data;
            if (np && np.gcode === 0) mon.female = was_female;
        }
    }
}

// C ref: rm.h closed_door(x, y).
function closed_door_at(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return IS_DOOR(loc.typ) && ((loc.doormask & (D_CLOSED | D_LOCKED)) !== 0);
}

// C ref: mondata.h mdistu(mon) — squared distance from the hero.
function mdistu(mon) {
    return dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0);
}

// C ref: monsym.h S_EYE=5, S_LIGHT=25 — mondata.h is_floater(ptr) is exactly
// `mlet == S_EYE || mlet == S_LIGHT`.
const S_EYE_MCLS = 5, S_LIGHT_MCLS = 25;
function is_floater(ptr) {
    return ptr?.mcls === S_EYE_MCLS || ptr?.mcls === S_LIGHT_MCLS;
}
function is_flyer_m(ptr) { return (mflags1_of(ptr) & M1_FLY) !== 0; }
// C ref: mondata.h breathless(ptr) = (mflags1 & M1_BREATHLESS).
function breathless(ptr) { return (mflags1_of(ptr) & M1_BREATHLESS) !== 0; }

// C ref: mon.c:947 minliquid(mtmp) / mon.c:961 minliquid_core(mtmp) — reconcile
// a monster with the water or lava it is standing in.  C runs this from TWO
// places this port had left out entirely: m_calcdistress()'s leading
// `mtmp->data->mmove == 0` guard (mon.c:1185) and movemon_singlemon() right
// after the movement-point deduction (mon.c:1254), i.e. for EVERY monster on
// EVERY move.
//
// Ported completely: the trailing "but eels have a difficult time outside" arm,
// the only one whose RNG is self-contained —
//     if (mtmp->mhp > 1 && rn2(mtmp->mhp) > rn2(8)) mtmp->mhp--;
//     monflee(mtmp, 2, FALSE, FALSE);
// two draws every turn an eel spends out of water, plus a flee timer that
// steers its m_move for the next two turns.
//
// DEFERRED, and drawing NOTHING rather than half of C's stream (a partial guard
// would trade one wrong stream for another):
//   * gremlin in a pool/fountain (mon.c:987): rn2(3), then split_mon() clones
//     it — makemon-level RNG with no entry point in this port — plus dryup().
//   * iron golem in a pool (mon.c:994): rn2(5), then d(2,6) rust damage and
//     possibly mondied().
//   * the inpool arm (mon.c:1064): mondied() leaves a cadaver, so it needs
//     make_corpse's corpse_chance rolls in the right order.
// The INLAVA arm (mon.c:1010) IS ported below: a non-clinging, non-lava-liking
// monster standing in lava is destroyed the next time movemon hands it a move,
// and for the ordinary case (no M1_TPORT, no MR_FIRE) that costs ZERO RNG —
// which is exactly why it was invisible here.  Leaving it out kept a monster
// alive that C deletes, and that monster then runs a whole dochug() the C
// stream does not have (seed0360 wizard2: a mumak on the lava at <55,9>).
// Returns 1 if the monster died.
// C ref: mondata.h:190 likes_lava(ptr) — fire elemental and salamander only.
const LAVA_LIKER_NAMES = new Set(['fire elemental', 'salamander']);
function mon_likes_lava(ptr) { return LAVA_LIKER_NAMES.has(ptr?.name); }
// C ref: permonst.h MR_FIRE.
const MR_FIRE_BIT = 0x01;
async function minliquid(mtmp) {
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    const typ = loc?.typ;
    if (typ == null) return 0;
    const ptr = mtmp.data;
    const airborne = is_flyer_m(ptr) || is_floater(ptr);
    // C ref: dbridge.c is_pool(x,y)/is_lava(x,y) are the POSITION forms, which
    // read a raised drawbridge's DB_UNDER mask.  rm.h's IS_POOL(typ) counts
    // every DRAWBRIDGE_UP as water, so it is a strict SUPERSET: using it here
    // can only SUPPRESS the eel arm on a dry drawbridge, never fire it on a
    // square C considers dry.
    const waterwall = (typ === WATER);
    const inpool = IS_POOL(typ) && (!airborne || Is_waterlevel(game.u?.uz));
    const inlava = IS_LAVA(typ) && !airborne;

    if (inlava) {
        // C ref: mon.c:1010 — a ceiling clinger hangs above the lava and a
        // lava-liker is at home in it; everything else burns.
        if (((mflags1_of(ptr) & M1_CLING) === 0) && !mon_likes_lava(ptr)) {
            // C ref: mon.c:1015 — a teleporter escapes instead (rloc's RNG).
            if ((mflags1_of(ptr) & M1_TPORT) !== 0) {
                const { rloc, tele_restrict, RLOC_MSG } = await import('./teleport.js');
                if (!(await tele_restrict(mtmp)) && await rloc(mtmp, RLOC_MSG))
                    return 0;
            }
            const { mon_kill_leaving } = await import('./monmove.js');
            if (((ptr?.mresists ?? 0) & MR_FIRE_BIT) === 0) {
                if (cansee(mtmp.mx, mtmp.my))
                    await pline(`${Monnam(mtmp)} burns to a crisp.`);
                // C: svc.context.mon_moving is set for every minliquid() call
                // reached from movemon, so this is mondead() — no corpse, and
                // no corpse_chance roll.
                mon_kill_leaving(mtmp, true);
                return 1;
            }
            // Fire-resistant but not a lava-liker: 1 point of damage, then it
            // is teleported clear of the lava (rloc draws).
            mtmp.mhp -= 1;
            if (mtmp.mhp <= 0) {
                if (cansee(mtmp.mx, mtmp.my))
                    await pline(`${Monnam(mtmp)} surrenders to the fire.`);
                mon_kill_leaving(mtmp, true);
                return 1;
            }
            if (cansee(mtmp.mx, mtmp.my))
                await pline(`${Monnam(mtmp)} burns slightly.`);
            if (!(is_flyer_m(ptr) || mtmp.mlevitating)) {
                // fire_damage_chain(minvent) is deferred (no monster here
                // carries burnable gear at a lava square); the rloc is not.
                const { rloc, RLOC_MSG } = await import('./teleport.js');
                await rloc(mtmp, RLOC_MSG);
            }
            return 0;
        }
    }
    if (inpool || waterwall)
        return 0; /* deferred: see the drown arm above */

    // C ref: mon.c:1108 — out of liquid entirely; only eels care.
    if (ptr?.mcls === S_EEL_MCLS && !Is_waterlevel(game.u?.uz)
        && !breathless(ptr)) {
        // C: "as mhp gets lower, the rate of further loss slows down".
        if (mtmp.mhp > 1 && rn2(mtmp.mhp) > rn2(8))
            mtmp.mhp--;
        await monflee(mtmp, 2, false, false);
    }
    return 0;
}

async function m_calcdistress(mtmp) {
    // C ref: mon.c:1183-1189 — a sessile species (data->mmove == 0) is checked
    // against water/lava once per turn even though it never moves, because it
    // can be carried/teleported into liquid.  The `if (gv.vision_full_recalc)
    // vision_recalc(0);` that precedes it is display bookkeeping and draws
    // nothing.
    if (mmove_of(mtmp.data) === 0 && await minliquid(mtmp))
        return;
    // C ref: mon.c:1193 — regenerate hit points, BEFORE the shapeshift and
    // timeout blocks.  RNG-free but state-critical: see monmove.js mon_regen.
    mon_regen(mtmp, false);
    // C ref: mon.c:1196 `if (ismnum(mtmp->cham)) decide_to_shapeshift(mtmp);`
    // — BEFORE were_change().
    if ((mtmp.cham ?? -1) >= 0) decide_to_shapeshift(mtmp);
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

// C ref: mondata.h:38 is_hider(ptr) = (mflags1 & M1_HIDE).  monflags_data.js
// carries the real mflags1 column, so read the bit instead of the hand-listed
// pmidx set this replaces — that list named exactly today's eight M1_HIDE
// species, so it happened to be right, but it answers FALSE for any hider the
// tables gain and it is keyed on an index convention only makemon.js owns.
function is_hider(ptr) {
    return ptr != null && (mflags1_of(ptr) & M1_HIDE) !== 0;
}

// C ref: monsym.h S_MIMIC=13 (S_PIERCER=16 / S_TRAPPER=20 are reached through
// the mflags1 bits now, not by class number).
const S_MIMIC = 13;
// C ref: mondata.h:43
//   #define ceiling_hider(ptr) \
//       (is_hider(ptr) && ((is_clinger(ptr) && (ptr)->mlet != S_MIMIC) \
//                          || is_flyer(ptr)))
// Mimics are flagged M1_CLING but have nothing to do with ceilings, hence the
// mlet exclusion; the lurker above qualifies through M1_FLY.  The previous
// `mcls === S_PIERCER || pmidx === 98` shortcut agreed with this on the current
// table but was a hardcode of the answer rather than the test.
function ceiling_hider(ptr) {
    if (!is_hider(ptr)) return false;
    const f1 = mflags1_of(ptr);
    return (((f1 & M1_CLING) !== 0) && ptr?.mcls !== S_MIMIC)
        || ((f1 & M1_FLY) !== 0);
}

// C ref: display.h:41/55 _tp_sensemon(mon) / _sensemon(mon).  Nothing in this
// port grants telepathy, monster detection or warn-of-monster yet, so this is
// still False throughout — but it now reads the hero's state instead of being
// hardcoded, so the day an ESP source lands (eating a floating eye corpse, an
// amulet of ESP, a blessed potion of object detection) restrap()'s
// "won't hide when adjacent to hero" test starts answering correctly.
// MATCH_WARN_OF_MON needs svc.warntype (worn warn-of-monster gear), which this
// port does not track at all; it is the one term left out.
function tp_sensemon(mtmp) {
    const u = game.u, p = u?.uprops || {};
    if (mindless(mtmp.data)) return false;
    // C: Blind_telepat is the INTRINSIC half (HTelepat); it only works blind.
    if (Blind() && ((p.Telepat ?? 0) || (p.HTelepat ?? 0))) return true;
    // C: Unblind_telepat is the EXTRINSIC (worn/wielded) half only.
    return !!(p.ETelepat) && mdistu(mtmp) <= (u?.unblind_telepat_range ?? -1);
}
function sensemon(mtmp) {
    if (!mtmp) return false;
    const u = game.u, p = u?.uprops || {};
    if (u?.uswallow && mtmp !== u.ustuck) return false;
    if (u?.uunderwater
        && !(mdistu(mtmp) <= 2 && IS_POOL(game.level?.at(mtmp.mx, mtmp.my)?.typ)))
        return false;
    return !!((p.Detect_monsters ?? 0) || (p.HDetect_monsters ?? 0))
        || tp_sensemon(mtmp);
}

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
        // C ref: mon.c:4682 set_mimic_sym(mtmp) — the mimic picks a disguise.
        // This was skipped with "not reached by our piercer-only sessions", but
        // it is the single biggest RNG call in restrap(): makemon.js's port of
        // it draws ROLL_FROM(syms) rn2(17), a whole mkobj() for the chosen
        // class, rn2(2)/rn2(10)/get_shop_item in a maze or a shop, and
        // rndmonnum() for a statue/corpse/egg/tin appearance.  It also SETS
        // m_ap_type, which movemon_singlemon() reads on the very next line to
        // decide whether the mimic skips its move, and which hide_monst()'s
        // second restrap() call keys off.
        set_mimic_sym(mtmp);
        return true;
    } else if (game.level?.at(mtmp.mx, mtmp.my)?.typ === ROOM) {
        mtmp.mundetected = 1;
        return true;
    }
    return false;
}

// C ref: dungeon.c:1690 has_ceiling(lev) —
//   `if (In_endgame(lev) && !Is_earthlevel(lev)) return FALSE; return TRUE;`
// i.e. false on the Plane of Air/Fire/Water/Astral, true on the Plane of Earth
// and everywhere in the dungeon.  dungeon.js does not model the endgame branch
// (dungeon.js:815) so dnum can't identify those levels yet; the C test is
// spelled out here so the day it can, this is a one-line change instead of a
// rediscovery.  (Reached only through ceiling_hider(), i.e. a piercer or lurker
// above on an endgame plane.)
function has_ceiling() {
    return true;
}

// C ref: monsym.h S_EEL=57.
const S_EEL_MCLS = 57;

// C ref: mon.c:4806 hide_monst(mon) — give a hider a chance to hide before its
// next move.  Called from restore.c getlev() when the hero returns to a level
// that was left, and from a couple of monster-placement paths.  A monster
// already hidden (mundetected) or wearing an appearance is skipped.  is_hider
// species (mimics, piercers, lurker above, trapper) re-hide via restrap()
// (which rolls rn2(3) internally); M1_CONCEAL species and eels re-hide via
// hideunder() (no RNG).
//
// The viz_array bracket is NOT display-only, which is why it is modelled now:
//
//     char save_viz = gv.viz_array[y][x];
//     gv.viz_array[y][x] &= ~(IN_SIGHT | COULD_SEE);
//     ... restrap(mon) ...
//     gv.viz_array[y][x] = save_viz;
//
// restrap()'s short-circuit chain tests `cansee(mtmp->mx, mtmp->my)` BEFORE its
// rn2(3), and cansee() is exactly `viz_array[y][x] & IN_SIGHT`.  Clearing the
// bit forces that test false, so C ALWAYS reaches the rn2(3) here (twice for a
// mimic).  Leaving the override out made a hider standing on a lit, in-sight
// square bail out of restrap() with no draw at all — a silently missing rn2 in
// the level-arrival stream, and one that also decides whether the monster is
// hidden when the hero first sees the level.
const VIZ_IN_SIGHT = 0x2, VIZ_COULD_SEE = 0x1;
export async function hide_monst(mon) {
    const hider_under = hides_under_pm(mon.data) || mon.data?.mcls === S_EEL_MCLS;
    if ((is_hider(mon.data) || hider_under)
        && !(mon.mundetected || mon.m_ap_type)) {
        const x = mon.mx, y = mon.my;
        const row = game.viz_array?.[y];
        const save_viz = row ? row[x] : undefined;
        if (row) row[x] &= ~(VIZ_IN_SIGHT | VIZ_COULD_SEE);
        if (is_hider(mon.data))
            restrap(mon);
        // try again if a mimic missed its 1/3 chance to hide
        if (mon.data?.mcls === S_MIMIC && !mon.m_ap_type)
            restrap(mon);
        if (row) row[x] = save_viz;
        if (hider_under)
            await hideunder(mon);
    }
}

// ---------------------------------------------------------------------------
// C ref: worn.c:756 m_dowear() / worn.c:799 m_dowear_type() — monster armour.
// Was entirely unported, which is not cosmetic: worn.c:956 charges a monster
// `mfrozen = m_delay` turns for putting a piece on, and movemon_singlemon()
// returns before dochug() while that runs, so C spends whole monster turns
// with ZERO RNG draws that this port used to spend moving and attacking.
//
// Deliberately NOT ported here, with the reason each is safe to omit:
//   worn.c:964 update_mon_extrinsics() — needs objects[].oc_oprop, a column
//     js/mkobj.js's OBJECT_DATA does not carry.  It draws no RNG; what it
//     would change is mon->minvis (cloak of invisibility), mon_adjust_speed
//     (speed boots) and mon->mextrinsics (resistances).
//   worn.c:975 artifact_light()/begin_burn() — no monster in these corpora
//     wears a light-emitting artifact suit (gold dragon scale mail).
// find_mac() is likewise still base-AC-only in this port (js/uhitm.js:922 and
// its four siblings ignore misc_worn_check); making it worn-aware is a
// SEPARATE change and was measured at seed0014 -378 / proxy -47 on its own,
// i.e. it exposes a second bug rather than fixing one.  See the deferred note.

// C ref: include/objects.h ARMOR()/HELM()/CLOAK()/SHIELD()/GLOVES()/BOOTS() —
// [otyp, a_ac, oc_delay] for the whole armour otyp range 89..172 in
// js/mkobj.js order.  a_ac is the macro's `10 - ac` field (so plate mail's
// `ac 3` is a_ac 7); ARM_BONUS (hack.h:1526) and worn.c's m_delay read exactly
// these two columns and OBJECT_DATA carries neither.  js/invent.js's
// ARMOR_OC_DELAY is the hero-side delay subset (it has no entry for the
// dragon-scale suits 101..120), so it is not reused.
const ARMOR_AC_DELAY = new Map([
    [89,1,1], [90,1,1], [91,2,1], [92,0,0], [93,0,1], [94,0,1], [95,1,0], [96,1,1],
    [97,1,1], [98,1,1], [99,1,1], [100,1,1], [101,9,5], [102,9,5], [103,9,5], [104,9,5],
    [105,9,5], [106,9,5], [107,9,5], [108,9,5], [109,9,5], [110,9,5], [111,3,5], [112,3,5],
    [113,3,5], [114,3,5], [115,3,5], [116,3,5], [117,3,5], [118,3,5], [119,3,5], [120,3,5],
    [121,7,5], [122,7,5], [123,6,5], [124,6,5], [125,6,5], [126,6,1], [127,5,1], [128,5,5],
    [129,4,5], [130,4,5], [131,3,3], [132,3,5], [133,2,5], [134,2,3], [135,1,0], [136,0,0],
    [137,0,0], [138,0,0], [139,1,0], [140,0,0], [141,0,0], [142,1,0], [143,2,0], [144,1,0],
    [145,1,0], [146,3,0], [147,1,0], [148,1,0], [149,1,0], [150,1,0], [151,1,0], [152,1,0],
    [153,2,0], [154,1,0], [155,1,0], [156,2,0], [157,2,0], [158,2,0], [159,1,1], [160,1,1],
    [161,1,1], [162,1,1], [163,1,2], [164,2,2], [165,2,2], [166,1,2], [167,1,2], [168,1,2],
    [169,1,2], [170,1,2], [171,1,2], [172,1,2],
].map((r) => [r[0], r]));

// C ref: objects.h oc_armcat — the ARM_* slot of an armour otyp.  Each slot is
// one contiguous otyp run in objects.h, so the ranges ARE the column.  (Do NOT
// route this through js/invent.js:3206 armor_slot_mask(): that one is a subset
// table whose `default:` sends every cloak but three, and every shield but
// one, to the body-suit slot.)
//
// prop.h W_AMUL and the js/mkobj.js otyps / js/makemon.js pmidx values the
// worn.c predicates name.  (js/invent.js remaps its own W_* block, so the
// monster masks all come from js/const.js — see the imports above.)
const W_AMUL_MON = 0x00010000;
// C stores a monster's worn mask on the OBJECT (obj->owornmask) and clears it
// in extract_from_minvent() (worn.c:1374) whenever the object leaves minvent.
// This port has no such choke point — js/uhitm.js:1710 relobj() (monster death
// drop) and js/dogmove.js:914 relobj() (pet drop) place the object straight on
// the floor — so an object-side mask LEAKS: a dropped helm keeps its mask, and
// dogmove.js:626 droppables() (`!obj->owornmask`) then refuses to let a pet
// that later picks it up drop it again.  Measured: seed0014 -378 screens.
// Until those two relobj sites clear owornmask, the monster-side mask lives in
// its own field; every reader below goes through WORNF, so restoring C's
// spelling is a one-line change.  (js/muse.js:371 which_armor reads owornmask
// and therefore still answers NULL for monsters — exactly as it did before
// this port, so nothing regresses through it.)
const WORNF = 'mwornmask';
const AMULET_CLASS_M = 5;
const SPEED_BOOTS_OTYP = 166, MUMMY_WRAPPING_OTYP = 138, DUNCE_CAP_OTYP = 94,
    HELM_OF_OPPOSITE_ALIGNMENT_OTYP = 99, RUBBER_HOSE_OTYP = 78,
    AMULET_OF_LIFE_SAVING_OTYP = 202, AMULET_OF_REFLECTION_OTYP = 208,
    AMULET_OF_GUARDING_OTYP = 210,
    ELVEN_LEATHER_HELM = 89, ELVEN_MITHRIL_COAT = 127, ELVEN_CLOAK = 139,
    ELVEN_SHIELD = 153, ELVEN_BOOTS = 169;
// C ref: permonst.h MZ_* / monsym.h S_* / objclass.h material enum.
const MZ_SMALL_M = 1, MZ_HUMAN_M = 2, MZ_LARGE_M = 3, MZ_HUGE_M = 4;
const S_VORTEX_M = 22, S_CENTAUR_M = 29, S_MUMMY_M = 39, S_GHOST_M = 54;
const LEATHER_MATERIAL = 7;
const PM_WINGED_GARGOYLE = 42, PM_HOBBIT = 43, PM_WHITE_UNICORN = 101,
    PM_GRAY_UNICORN = 102, PM_BLACK_UNICORN = 103, PM_KI_RIN = 124,
    PM_AIR_ELEMENTAL = 154, PM_MINOTAUR = 177, PM_SKELETON = 248,
    PM_HORNED_DEVIL = 291, PM_MARILITH = 294, PM_BALROG = 302, PM_ASMODEUS = 309;
function armor_slot_of(otyp) {
    if (otyp >= 89 && otyp <= 100) return W_ARMH;
    if (otyp >= 101 && otyp <= 135) return W_ARM;
    if (otyp >= 136 && otyp <= 137) return W_ARMU;
    if (otyp >= 138 && otyp <= 149) return W_ARMC;
    if (otyp >= 150 && otyp <= 158) return W_ARMS;
    if (otyp >= 159 && otyp <= 162) return W_ARMG;
    if (otyp >= 163 && otyp <= 172) return W_ARMF;
    return 0;
}
function oc_delay_arm(otyp) { return ARMOR_AC_DELAY.get(otyp)?.[2] ?? 0; }
// C ref: obj.h:126 greatest_erosion(otmp).
function greatest_erosion(obj) {
    return Math.max(obj?.oeroded | 0, obj?.oeroded2 | 0);
}
// C ref: hack.h:1526 ARM_BONUS(obj).
function ARM_BONUS(obj) {
    const a_ac = ARMOR_AC_DELAY.get(obj?.otyp)?.[1] ?? 0;
    return a_ac + (obj?.spe | 0) - Math.min(greatest_erosion(obj), a_ac);
}
// C ref: worn.c:1339 extra_pref(mon, obj) — the only special-benefit bias.
// mtmp->permspeed is not persisted by this port's makemon; every monster that
// could pick speed boots up off the floor here is a non-MFAST species, which
// is the branch C takes for them too.
function extra_pref(mon, obj) {
    return (obj && obj.otyp === SPEED_BOOTS_OTYP && (mon?.permspeed | 0) !== MFAST) ? 20 : 0;
}
// C ref: worn.c:1360 racial_exception(mon, obj) — hobbits may wear elven armour.
function racial_exception(mon, obj) {
    return (monsndx_mon(mon) === PM_HOBBIT && is_elven_armor(obj)) ? 1 : 0;
}
function is_elven_armor(obj) {
    const o = obj?.otyp;
    return o === ELVEN_LEATHER_HELM || o === ELVEN_MITHRIL_COAT || o === ELVEN_CLOAK
        || o === ELVEN_SHIELD || o === ELVEN_BOOTS;
}
// C ref: worn.c which_armor(mon, slot).
function which_armor_mon(mon, slot) {
    for (const o of (mon?.minvent || []))
        if (((o[WORNF] || 0) & slot) !== 0) return o;
    return null;
}
// C ref: mondata.c:632 sliparm / :640 breakarm / mondata.h:133 cantweararm.
function sliparm_mon(ptr) {
    return is_whirly_mon(ptr) || (ptr?.msize ?? 0) <= MZ_SMALL_M || noncorporeal_mon(ptr);
}
function cantweararm_mon(ptr) {
    if (sliparm_mon(ptr)) return true;                       // breakarm's guard
    return (ptr?.msize ?? 0) >= MZ_LARGE_M
        || ((ptr?.msize ?? 0) > MZ_SMALL_M && !humanoid(ptr))
        || ptr?.pmidx === PM_MARILITH || ptr?.pmidx === PM_WINGED_GARGOYLE;
}
function is_whirly_mon(ptr) {
    return ptr?.mcls === S_VORTEX_M || ptr?.pmidx === PM_AIR_ELEMENTAL;
}
function noncorporeal_mon(ptr) { return ptr?.mcls === S_GHOST_M; }
// C ref: obj.h:444 WrappingAllowed(mptr).
function WrappingAllowed(ptr) {
    const sz = ptr?.msize ?? 0;
    return humanoid(ptr) && sz >= MZ_SMALL_M && sz <= MZ_HUGE_M
        && !noncorporeal_mon(ptr) && ptr?.mcls !== S_CENTAUR_M
        && ptr?.pmidx !== PM_WINGED_GARGOYLE && ptr?.pmidx !== PM_MARILITH;
}
// C ref: mondata.c:678 num_horns(ptr) / mondata.h:56 has_horns(ptr).
const HORNED_PMIDX = new Set([PM_HORNED_DEVIL, PM_MINOTAUR, PM_ASMODEUS, PM_BALROG,
    PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_KI_RIN]);
function has_horns(ptr) { return HORNED_PMIDX.has(ptr?.pmidx); }
// C ref: obj.h:418 is_flimsy(otmp) — oc_material <= LEATHER (objclass.h:20)
// or a rubber hose.
function is_flimsy(obj) {
    return (OBJECTS[obj?.otyp]?.material ?? 99) <= LEATHER_MATERIAL
        || obj?.otyp === RUBBER_HOSE_OTYP;
}
function monsndx_mon(mon) { return mon?.data?.pmidx ?? -1; }
function slithy_mon(ptr) { return (mflags1_of(ptr) & M1_SLITHY) !== 0; }
// C ref: youprop.h See_invisible.  js/display.js:335 has the shared reader but
// does not export it; this port spells the hero's copy several ways.
function See_invisible_mon() {
    const u = game.u || {}, p = u.uprops || {};
    return !!(u.see_invis || p.HSee_invisible || u.HSee_invisible
        || p.ESee_invisible || u.ESee_invisible || p.See_invisible || u.See_invisible);
}

// C ref: worn.c:799 m_dowear_type(mon, flag, creation, racialexception).
// Draws no RNG anywhere along this path (nor does curse()).
async function m_dowear_type(mon, flag, creation, racialexception) {
    if (mon.mfrozen)
        return;                            /* probably putting previous item on */
    const sawmon = canseemon_shared(mon);
    let old = which_armor_mon(mon, flag);
    if (old && old.cursed) return;
    if (old && flag === W_AMUL_MON && old.otyp !== AMULET_OF_GUARDING_OTYP) return;
    let best = old;

    for (const obj of (mon.minvent || [])) {
        if (flag === W_AMUL_MON) {
            if (obj.oclass !== AMULET_CLASS_M
                || (obj.otyp !== AMULET_OF_LIFE_SAVING_OTYP
                    && obj.otyp !== AMULET_OF_REFLECTION_OTYP
                    && obj.otyp !== AMULET_OF_GUARDING_OTYP))
                continue;
            if (!best || obj.otyp !== AMULET_OF_GUARDING_OTYP) {
                best = obj;
                if (best.otyp !== AMULET_OF_GUARDING_OTYP) break;  // C goto outer_break
            }
            continue;                      /* skip post-switch armor handling */
        }
        if (armor_slot_of(obj.otyp) !== flag) continue;
        if (flag === W_ARMC) {
            // mummy wrapping is the only cloak allowed above human size, and a
            // monster that is already invisible won't put one on (it blocks
            // invisibility and would reveal it).
            if ((mon.data?.msize ?? 0) > MZ_HUMAN_M && obj.otyp !== MUMMY_WRAPPING_OTYP)
                continue;
            if (mon.minvis && obj.otyp === MUMMY_WRAPPING_OTYP
                && !See_invisible_mon() && !creation)
                continue;
        } else if (flag === W_ARMH) {
            if (obj.otyp === HELM_OF_OPPOSITE_ALIGNMENT_OTYP
                && (mon.ispriest || mon.isminion)) continue;
            if (has_horns(mon.data) && !is_flimsy(obj)) continue;
        } else if (flag === W_ARM) {
            if (racialexception && racial_exception(mon, obj) < 1) continue;
        }
        if (obj[WORNF]) continue;
        if (best && (ARM_BONUS(best) + extra_pref(mon, best)
                     >= ARM_BONUS(obj) + extra_pref(mon, obj)))
            continue;
        best = obj;
    }
    if (!best || best === old) return;

    // C ref: worn.c:906 — same auto-cursing behaviour as for the hero.
    const autocurse = ((best.otyp === HELM_OF_OPPOSITE_ALIGNMENT_OTYP
                        || best.otyp === DUNCE_CAP_OTYP) && !best.cursed);
    let m_delay = 0;
    // wearing a cloak costs 2 extra turns to get a suit or shirt on under it
    if ((flag === W_ARM || flag === W_ARMU) && ((mon.misc_worn_check | 0) & W_ARMC))
        m_delay += 2;
    if (old) {
        m_delay += oc_delay_arm(old.otyp);
        old[WORNF] = 0;                 /* avoid doname() "(being worn)" */
    }
    if (!creation) {
        if (sawmon) {
            // C ref: worn.c:924-947 — "<Mon> [removes <old> and ]puts on <new>."
            const { distant_doname, distant_far } = await import('./invent.js');
            let newarm = distant_doname(best, distant_far(best, mon.mx, mon.my)), buf = '';
            if (old) {
                const oldarm = distant_doname(old, distant_far(old, mon.mx, mon.my));
                buf = ` removes ${oldarm} and`;
                // identical descriptions read "another <armour>", not "a <armour>"
                if (newarm.toLowerCase() === oldarm.toLowerCase())
                    newarm = newarm.replace(/^an? /i, 'another ');
            }
            await update_topl(`${Monnam(mon)}${buf} puts on ${newarm}.`);
            if (autocurse)
                await pline(`${Monnam(mon)}'s ${OBJECTS[best.otyp]?.name
                             || 'armor'} glows black for a moment.`);
        }
        m_delay += oc_delay_arm(best.otyp);
        mon.mfrozen = m_delay;
        if (mon.mfrozen) mon.mcanmove = 0;
    }
    if (old) old[WORNF] = 0;
    mon.misc_worn_check = (mon.misc_worn_check | 0) | flag;
    best[WORNF] = (best[WORNF] | 0) | flag;
    if (autocurse) { best.cursed = 1; best.blessed = 0; }  // C ref: mkobj.c curse()
    // C ref: worn.c:964/977 update_mon_extrinsics(mon, old|best, ..) `case FAST`.
    await mon_adjust_speed_worn(mon, creation);
}

// C ref: worn.c:488 mon_adjust_speed(mon, 0, obj) — adjust==0 does nothing but
// recompute mspeed from the monster's WORN items, and speed boots are the only
// armour whose oc_oprop is FAST.  This is the one arm of update_mon_extrinsics
// that changes the RNG stream rather than just the monster's resistances:
// mspeed == MFAST turns mcalcmove_base()'s allotment from mmove into
// (4*mmove+2)/3, so a booted monster reaches NORMAL_SPEED — and draws its
// distfleeck/m_move rolls — on turns a barefoot one does not.
// mon->permspeed is not persisted by this port's makemon (no monster here is
// intrinsically fast or slow), so the else arm reproduces `mspeed = permspeed`.
async function mon_adjust_speed_worn(mon, creation) {
    const oldspeed = mon.mspeed | 0;
    let boots = null;
    for (const o of (mon.minvent || []))
        if ((o[WORNF] | 0) !== 0 && o.otyp === SPEED_BOOTS_OTYP) { boots = o; break; }
    mon.mspeed = boots ? MFAST : (mon.permspeed | 0);
    // give_msg = !gi.in_mklev: the creation-time pass is C's in_mklev one.
    if (creation || (mon.mspeed | 0) === oldspeed) return;
    if (!mmove_of(mon.data) || mon.mfrozen || mon.msleeping) return;
    if (!canseemon_shared(mon)) return;
    const howmuch = ((mon.mspeed | 0) + oldspeed === MFAST + MSLOW) ? 'much ' : '';
    await pline((mon.mspeed | 0) === MFAST
        ? `${Monnam(mon)} is suddenly moving ${howmuch}faster.`
        : `${Monnam(mon)} seems to be moving ${howmuch}slower.`);
}

// C ref: worn.c:756 m_dowear(mon, creation) — wear the best object of each
// slot.  Slot order is load-bearing: m_dowear_type() returns immediately once
// mon->mfrozen is set, so only the FIRST slot that upgrades charges a delay.
export async function m_dowear(mon, creation) {
    const ptr = mon?.data;
    if (!ptr) return;
    if ((ptr.msize ?? 0) < MZ_SMALL_M || nohands(ptr) || is_animal(ptr)) return;
    // mummies get a chance to wear their wrappings; skeletons their armour
    if (mindless(ptr)
        && (!creation || (ptr.mcls !== S_MUMMY_M && ptr.pmidx !== PM_SKELETON)))
        return;

    await m_dowear_type(mon, W_AMUL_MON, creation, false);
    const can_wear_armor = !cantweararm_mon(ptr);       /* suit, cloak, shirt */
    if (can_wear_armor && !((mon.misc_worn_check | 0) & W_ARM))
        await m_dowear_type(mon, W_ARMU, creation, false);
    if (can_wear_armor || WrappingAllowed(ptr))
        await m_dowear_type(mon, W_ARMC, creation, false);
    await m_dowear_type(mon, W_ARMH, creation, false);
    const wep = mon.mw || null;
    if (!wep || !OBJECTS[wep.otyp]?.bimanual)
        await m_dowear_type(mon, W_ARMS, creation, false);
    await m_dowear_type(mon, W_ARMG, creation, false);
    if (!slithy_mon(ptr) && ptr.mcls !== S_CENTAUR_M)
        await m_dowear_type(mon, W_ARMF, creation, false);
    // C ref: worn.c:793 — RACE_EXCEPTION for monsters that can't wear suits
    await m_dowear_type(mon, W_ARM, creation, !can_wear_armor);
}

// C ref: worn.c:1163 m_lose_armor(mon, obj, polyspot) —
// extract_from_minvent + place_object + newsym.  No RNG.
function m_lose_armor(mon, obj) {
    const inv = mon.minvent || [];
    const ix = inv.indexOf(obj);
    if (ix >= 0) inv.splice(ix, 1);
    mon.misc_worn_check = (mon.misc_worn_check | 0) & ~(obj[WORNF] | 0);
    obj[WORNF] = 0;
    obj.owornmask = 0;
    place_object(obj, mon.mx, mon.my);
    newsym(mon.mx, mon.my);
}
// C ref: mon.c m_useup(mon, obj) — the armour is destroyed outright.
function m_useup_armor(mon, obj) {
    const inv = mon.minvent || [];
    const ix = inv.indexOf(obj);
    if (ix >= 0) inv.splice(ix, 1);
    mon.misc_worn_check = (mon.misc_worn_check | 0) & ~(obj[WORNF] | 0);
    obj[WORNF] = 0;
}
// C ref: objnam.c cloak_simple_name(cloak).
function cloak_simple_name_mon(obj) {
    if (obj?.otyp === MUMMY_WRAPPING_OTYP) return 'wrapping';
    if (obj?.otyp === 143 /* ROBE */) return 'robe';
    if (obj?.otyp === 144 /* ALCHEMY_SMOCK */) return 'apron';
    return 'cloak';
}
function s_suffix_mon(s) { return /s$/.test(s) ? `${s}'` : `${s}'s`; }
function mhis_mon(mon) { return mon?.female ? 'her' : 'his'; }
function mhim_mon(mon) { return mon?.female ? 'her' : 'him'; }

// C ref: worn.c:1177 mon_break_armor(mon, polyspot) — a monster whose FORM just
// changed (new_were, newcham, polymorph) sheds or bursts the armour that no
// longer fits.  Draws no RNG, but the "You hear a thud." / "a cracking sound."
// lines are top-line output and the dropped object lands on the floor.
// NOT ported: the W_SADDLE / u.usteed arm at worn.c:1312 (this port keeps the
// saddle's mask in obj.owornmask via js/dog.js:304, not in the monster-worn
// field, and the dismount path lives in js/steed.js).
export async function mon_break_armor(mon, polyspot) {
    const mdat = mon?.data;
    if (!mdat) return;
    const vis = cansee(mon.mx, mon.my);
    const handless_or_tiny = nohands(mdat) || (mdat.msize ?? 0) < MZ_SMALL_M;
    const ppronoun = mhis_mon(mon), pronoun = mhim_mon(mon);
    const hear = async (what) => { if (!Deaf()) await update_topl(`You hear ${what}`); };
    let otmp;
    if (!sliparm_mon(mdat) && cantweararm_mon(mdat)) {   /* C: breakarm(mdat) */
        if ((otmp = which_armor_mon(mon, W_ARM)) != null) {
            // (the dragon-scales-merging special case has no message either way)
            if (vis) await update_topl(`${Monnam(mon)} breaks out of ${ppronoun} armor!`);
            else await hear('a cracking sound.');
            m_useup_armor(mon, otmp);
        }
        if ((otmp = which_armor_mon(mon, W_ARMC)) != null
            && (otmp.otyp !== MUMMY_WRAPPING_OTYP || !WrappingAllowed(mdat))) {
            if (vis) await update_topl(`${s_suffix_mon(Monnam(mon))} ${cloak_simple_name_mon(otmp)} tears apart!`);
            else await hear('a ripping sound.');
            m_useup_armor(mon, otmp);
        }
        if ((otmp = which_armor_mon(mon, W_ARMU)) != null) {
            if (vis) await update_topl(`${s_suffix_mon(Monnam(mon))} shirt rips to shreds!`);
            else await hear('a ripping sound.');
            m_useup_armor(mon, otmp);
        }
    } else if (sliparm_mon(mdat)) {
        const passes_thru_clothes = !((mdat.msize ?? 0) <= MZ_SMALL_M);
        if ((otmp = which_armor_mon(mon, W_ARM)) != null) {
            if (vis) await update_topl(`${s_suffix_mon(Monnam(mon))} armor falls around ${pronoun}!`);
            else await hear('a thud.');
            m_lose_armor(mon, otmp, polyspot);
        }
        if ((otmp = which_armor_mon(mon, W_ARMC)) != null
            && (otmp.otyp !== MUMMY_WRAPPING_OTYP || !WrappingAllowed(mdat))) {
            if (vis)
                await update_topl(is_whirly_mon(mdat)
                    ? `${s_suffix_mon(Monnam(mon))} ${cloak_simple_name_mon(otmp)} falls, unsupported!`
                    : `${Monnam(mon)} shrinks out of ${ppronoun} ${cloak_simple_name_mon(otmp)}!`);
            m_lose_armor(mon, otmp, polyspot);
        }
        if ((otmp = which_armor_mon(mon, W_ARMU)) != null) {
            if (vis)
                await update_topl(passes_thru_clothes
                    ? `${Monnam(mon)} seeps right through ${ppronoun} shirt!`
                    : `${Monnam(mon)} becomes much too small for ${ppronoun} shirt!`);
            m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny) {
        if ((otmp = which_armor_mon(mon, W_ARMG)) != null) {
            if (vis) await update_topl(`${Monnam(mon)} drops ${ppronoun} gloves${mon.mw ? ' and weapon' : ''}!`);
            m_lose_armor(mon, otmp, polyspot);
        }
        if ((otmp = which_armor_mon(mon, W_ARMS)) != null) {
            if (vis) await update_topl(`${Monnam(mon)} can no longer hold ${ppronoun} shield!`);
            else await hear('a clank.');
            m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || has_horns(mdat)) {
        if ((otmp = which_armor_mon(mon, W_ARMH)) != null
            && (handless_or_tiny || !is_flimsy(otmp))) {
            if (vis) await update_topl(`${s_suffix_mon(Monnam(mon))} helmet falls to the ${surface_mon(mon)}!`);
            else await hear('a clank.');
            m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || slithy_mon(mdat) || mdat.mcls === S_CENTAUR_M) {
        if ((otmp = which_armor_mon(mon, W_ARMF)) != null) {
            if (vis)
                await update_topl(is_whirly_mon(mdat)
                    ? `${s_suffix_mon(Monnam(mon))} boots fall away!`
                    : `${s_suffix_mon(Monnam(mon))} boots ${(mdat.msize ?? 0) < MZ_SMALL_M
                        ? 'slide' : 'are pushed'} off ${ppronoun} feet!`);
            m_lose_armor(mon, otmp, polyspot);
        }
    }
}
// C ref: hack.c surface(x, y) — only the message-bearing cases a monster can
// stand on while shedding a helmet are reachable here.
function surface_mon(mon) {
    const typ = game.level?.at?.(mon.mx, mon.my)?.typ;
    if (typ === WATER || IS_POOL(typ)) return 'water';
    if (IS_LAVA(typ)) return 'lava';
    return 'floor';
}

// C ref: mon.c movemon_singlemon(mtmp) — drive one monster's move, returning
// true if it still has movement points left after this action.
async function movemon_singlemon(mtmp) {
    // C ref: mon.c:1233 — one DEAD monster still gets a move: a vault guard
    // parked at <0,0> whose temporary corridor is still on the map.  gd_move()
    // is what tears that corridor down and finally clears isgd.  This test
    // precedes both the DEADMONSTER() and the off-map returns below.
    if (mtmp.isgd && !mtmp.mx && !(mtmp.mstate & MON_MIGRATING)) {
        if ((game.moves || 0) > (mtmp.mlstmv || 0)) {
            await (await import('./vault.js')).gd_move(mtmp);
            mtmp.mlstmv = game.moves || 0;
        }
        return false;
    }
    if (DEADMONSTER(mtmp)) return false;
    if (mtmp.mx == null || mtmp.mx <= 0) return false; // off-map

    // C ref: makemon.c:1445 `m_dowear(mtmp, TRUE)` — C equips a monster's
    // STARTING armour at creation, with creation=TRUE so it costs no time.
    // js/makemon.js is a different file's territory, so the equivalent runs
    // here, on the monster's first pass through the move loop and BEFORE the
    // movement-point gate (i.e. on the first movemon() after it appears).
    // Without it the first m_dowear() a monster ever runs would also put its
    // starting suit on and charge oc_delay turns C never charges.
    // m_dowear draws no RNG, so this cannot shift the stream by itself.
    if (!mtmp._geared) {
        mtmp._geared = true;
        await m_dowear(mtmp, true);
    }

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

    // C ref: mon.c:1254 — `if (minliquid(mtmp)) return FALSE;`, run for every
    // monster on every move (see minliquid() above for what is and isn't
    // ported).  The `if (gv.vision_full_recalc) vision_recalc(0);` and the
    // clear_bypasses()/clear_splitobjs() that sit between the movement
    // deduction and this call are obj-flag/display bookkeeping and draw nothing.
    if (await minliquid(mtmp)) return false;

    // C ref: mon.c:1269-1284 — after gaining or losing equipment a monster
    // re-runs m_dowear() and SPENDS THE WHOLE TURN doing so (returns FALSE
    // before dochugw, so it draws nothing at all that turn).  Hostiles that
    // believe the hero is within dist2 <= 9 keep the bit set for later instead.
    if (((mtmp.misc_worn_check | 0) & I_SPECIAL) !== 0) {
        if (mtmp.mpeaceful || mtmp.mtame
            || dist2(mtmp.mx, mtmp.my, mtmp.mux | 0, mtmp.muy | 0) > (3 * 3)) {
            mtmp.misc_worn_check = (mtmp.misc_worn_check | 0) & ~I_SPECIAL;
            const oldworn = mtmp.misc_worn_check | 0;
            await m_dowear(mtmp, false);
            if ((mtmp.misc_worn_check | 0) !== oldworn || !mtmp.mcanmove)
                return false;              /* is spending this turn equipping */
        }
    }

    //
    // C ref: mon.c:1300-1313 — the Conflict branch (fightm()).  Nothing in this
    // port grants Conflict, so m_canseeu/fightm is unreachable; fightm() would
    // draw (it picks a victim and runs a full mattackm).

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
    } else if (mtmp.data?.mcls === S_EEL_MCLS && !mtmp.mundetected
               && (mtmp.mflee || !m_next2u(mtmp))
               && !canseemon_mon(mtmp) && !rn2(4)) {
        // C ref: mon.c:1291-1298 — the `else if` arm of the is_hider test.
        // "some eels end up stuck in isolated pools, where they can't--or at
        // least won't--move, so they never reach their post-move chance to
        // re-hide".  The rn2(4) is unconditional once the three RNG-free guards
        // pass, so every unwatched, non-adjacent eel costs a draw per turn for
        // as long as it is alive — the same shape of omission that desynced
        // every session with a lycanthrope before were_change() was ported.
        if (await hideunder(mtmp))
            return false;
    }

    // C ref: mon.c:1305-1319 — Conflict: the monster may fight another monster.
    if (Conflict() && !mtmp.iswiz && m_canseeu(mtmp)) {
        if (cansee(mtmp.mx, mtmp.my)
            && dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) <= 8 * 8
            && await fightm(mtmp))
            return false;
    }

    await dochugw(mtmp, true);
    return false;
}

// C ref: mhitm.c:106 fightm(mtmp) — conflicted monsters fight each other.
async function fightm(mtmp) {
    if (resist_conflict(mtmp)) return 0;
    // (u.ustuck / engulfing_u cases not modelled)
    for (const mon of fmonOrder()) {
        if (mon !== mtmp && !DEADMONSTER(mon)) {
            if (monnear(mtmp, mon.mx, mon.my)) {
                const result = await mattackm(mtmp, mon);
                if (result & M_ATTK_AGR_DIED) return 1;
                if ((result & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                    && rn2(4) && (mon.movement | 0) > rn2(NORMAL_SPEED)) {
                    if ((mon.movement | 0) > NORMAL_SPEED) mon.movement -= NORMAL_SPEED;
                    else mon.movement = 0;
                    await mattackm(mon, mtmp);
                }
                return (result & M_ATTK_HIT) ? 1 : 0;
            }
        }
    }
    return 0;
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

// C ref: mon.c:1326 movemon(void).  One pass over every monster, returning
// gs.somebody_can_move.  (The repeat passes that let a fast monster act twice
// in a turn ARE modelled — they live in the caller, allmain.js's
// `do { monscanmove = await movemon(); } while (monscanmove)`, exactly as in
// allmain.c:211-215.  An older comment here claimed they were unimplemented.)
//
// Not modelled from C's movemon(): any_light_source()/vision_full_recalc,
// clear_bypasses()/clear_splitobjs() (obj bypass flags aren't tracked),
// dmonsfree() (dead monsters stay in game.level.monsters and are skipped by
// DEADMONSTER instead of being unlinked), and the `u.utotype -> deferred_goto()`
// level-change handoff.  None of them draws; dmonsfree's absence is visible
// only to code that counts list entries.
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
// C ref: artifact.c:912 touch_artifact(obj, mon).  An ordinary object is always
// safe (get_artifact returns ART_NONARTIFACT -> 1).  The MONSTER arm is not
// modelled and always returns "touchable"; C's is:
//     else if (!is_covetous(mon->data) && !is_mplayer(mon->data)) {
//         badclass = self_willed && oart->role != NON_PM
//                    && oart != &artilist[ART_EXCALIBUR];
//         badalign = (oart->spfx & SPFX_RESTR) && oart->alignment != A_NONE
//                    && (oart->alignment != mon_aligntyp(mon));
//     } else badclass = badalign = FALSE;
//     if (!badalign) badalign = bane_applies(oart, mon);
//     if (((badclass || badalign) && self_willed) || badalign) return 0;
// It draws NOTHING for a monster (the rn2(4) at artifact.c:945 is guarded by
// `badalign && (!yours || !rn2(4))`, and !yours short-circuits it), so this is
// a state omission, not an RNG one: an unaligned monster that C leaves standing
// next to Stormbringer picks it up here.  Implementing it needs the artilist
// SPFX/alignment columns (invent.js has them as a private ARTI_TOUCH_PROPS
// table), mon_aligntyp(), and bane_applies() — none reachable from mon.js yet.
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
        // C: `curload += obj->owt;` — the raw weight, no floor.  (mkobj.js
        // weight() already reproduces 5.0's `max(wt, 1)` for coins, so the
        // Math.max(1, ...) this replaces was a second, non-C floor applied to
        // every object.)
        if (obj.otyp !== BOULDER || !throws_rocks_flag(mtmp.data))
            curload += (obj.owt | 0);
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
    const newload = (otmp.owt | 0); // C: `int newload = otmp->owt;` — no floor
    const mdat = mtmp.data;

    if (notake(mdat)) return 0;
    if (!can_touch_safely(mtmp, otmp)) return 0;

    // C ref: mon.c:2002 —
    //   iquan = (otmp->quan > (long) LARGEST_INT)
    //              ? 20000 + rn2(LARGEST_INT - 20000 + 1) : (int) otmp->quan;
    // The overflow arm DRAWS, but it needs a stack of more than 2^31-1 items;
    // nothing in this port (or in C's own object creation) makes one, so the
    // plain cast is exact and the missing rn2 is unreachable, not skipped.
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
