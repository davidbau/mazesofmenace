// bones.js — bones-file handling (death legacy levels) for the C->JS port.
//
// C ref: nethack-c/upstream/src/bones.c (NetHack 5.0).
//
// In the deterministic session-replay harness there is never a bones file on
// disk: open_bonesfile() always fails, so savebones()/getbones() can never
// actually read or write one.  What still matters for RNG parity is the
// *single* rn2(3) draw that getbones() makes every time mklev() generates a
// new level (getbones is called first thing inside mklev()).  Reproducing that
// draw — at exactly the right point, with exactly the right argument and
// short-circuit semantics — is what keeps the call stream aligned for every
// session that descends to dlvl >= 2 (seed0009/0116/0373/0383/0399/5002 and
// any other second-mklev run).
//
// This module is the canonical home for getbones(); mklev() should call into
// it (see the dispatch note at the bottom of this file).  The functions below
// are faithful ports of the public, RNG-bearing entry points of bones.c:
//
//   getbones()            bones.c:629  — the rn2(3) "find bones?" gate
//   can_make_bones()      bones.c:355  — the rn2(1 + depth>>2) "make bones?" gate
//   no_bones_level()      bones.c:17   — level eligibility predicate (no RNG)
//   give_to_nearby_mon()  bones.c:225  — rn2(nmon) reservoir pick
//   drop_upon_death()     bones.c:258  — rn2(5) curse + rn2(8) give-to-mon

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';

// ── small accessors that mirror the C globals/macros bones.c relies on ──

function FLAGS() { return game.flags || {}; }

// C: `discover` is the same macro as flags.explore.  Our options parser stores
// the explore play-mode as flags.playmode === 'explore' (and never sets
// flags.explore), so accept either spelling.  In discover mode getbones()
// returns 0 *before* the rn2(3), i.e. with NO rng draw at all.
function is_discover() {
    const f = FLAGS();
    return !!(f.explore || f.discover || f.playmode === 'explore');
}

// C: `wizard` is the same macro as flags.debug.
function is_wizard() {
    return !!FLAGS().debug;
}

// C: flags.bones defaults to TRUE; the option is only ever turned *off*.  Our
// flags object leaves it undefined unless a !bones rc line set it to false.
function bones_enabled() {
    return FLAGS().bones !== false;
}

// ── no_bones_level (C ref: bones.c:17) — pure predicate, consumes no RNG ──
//
// Determines whether the given level is eligible to hold/produce bones.  In
// the replay harness the eligibility result is irrelevant to the call stream
// because it is only consulted *after* getbones() has already drawn its
// rn2(3) (and open_bonesfile() will fail regardless).  It is ported here for
// completeness and guarded so a partial dungeon model can never throw.
export function no_bones_level(lev) {
    try {
        const d = lev || game.u?.uz || {};
        const dnum = d.dnum ?? 0;
        const dlevel = d.dlevel ?? 1;
        const dng = game.dungeons?.[dnum];

        // !svd.dungeons[lev->dnum].boneid — a dungeon flagged no-bones.
        if (dng && dng.boneid === 0) return true;

        // Is_botlevel(lev): bottom level of its dungeon — no bones.
        if (dng && dng.num_dunlevs != null && dlevel >= dng.num_dunlevs)
            return true;

        // Is_branchlev(lev) && lev->dlevel > 1 — multiway branch level.
        if (dng && Array.isArray(dng.branches)) {
            for (const b of dng.branches)
                if (b === dlevel && dlevel > 1) return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ── getbones (C ref: bones.c:629) ──
//
// C body (the part reachable in the replay harness):
//
//     if (discover) return 0;                       // no rng
//     if (!flags.bones) return 0;                   // no rng
//     if (rn2(3)        // <-- ALWAYS evaluated here (bones.c:645)
//         && !wizard)
//         return 0;
//     if (no_bones_level(&u.uz)) return 0;
//     nhfp = open_bonesfile(...);
//     if (!nhfp) return 0;                           // always taken in replay
//     ...
//
// The crucial parity point: rn2(3) is drawn left-of the `&& !wizard`, so it is
// consumed *unconditionally* whenever we are not in discover mode and bones
// are enabled — including in wizard mode, where the `&& !wizard` then makes the
// whole condition false (so the function does NOT return early on its account,
// but the rn2(3) has already advanced the stream).  After that the bones file
// never exists, so getbones() always ultimately returns 0 (false) here.
export function getbones() {
    if (is_discover()) return false;   // C: if (discover) return 0;  (no rng)
    if (!bones_enabled()) return false; // C: if (!flags.bones) return 0; (no rng)

    // C: if (rn2(3) && !wizard) return 0;
    // rn2(3) is always drawn; short-circuit only suppresses the early return
    // in wizard mode (where bones are forced available for testing).
    if (rn2(3) && !is_wizard()) return false;

    // no_bones_level() — consumes no RNG.  In the harness open_bonesfile()
    // always fails, so regardless of the eligibility result getbones() returns
    // 0 (no bones loaded).  Calling it keeps the port honest; its result has no
    // effect on the deterministic outcome.
    if (no_bones_level(game.u?.uz)) return false;

    // open_bonesfile() always fails in the replay harness → no bones.
    return false;
}

// ── can_make_bones (C ref: bones.c:355) ──
//
// Called from done()/savebones() at the moment the hero dies, to decide
// whether to attempt creating a bones file.  Its only RNG is
// rn2(1 + (depth >> 2)) — "fewer ghosts on low levels".  Note the C
// short-circuit: the rn2() is only evaluated when depth > 0, and the trailing
// `&& !wizard` suppresses the early-return in wizard mode (but the rn2 has
// already been drawn).  Ported faithfully for any future session that dies in
// a way that reaches it; the recorded starter sessions die on bones-ineligible
// levels (or are wizard runs that get filtered earlier), so it is currently
// not on the hot path.
export function can_make_bones() {
    if (!bones_enabled()) return false;       // C: if (!flags.bones) return FALSE;
    const uz = game.u?.uz;
    if (no_bones_level(uz)) return false;     // no bones for specific levels
    if (game.u?.uswallow) return false;       // no bones when swallowed

    const dep = depth_of_level(uz);
    // C: if (depth <= 0 || (!rn2(1 + (depth >> 2)) && !wizard)) return FALSE;
    if (dep <= 0) return false;               // endgame bulletproofing (no rng)
    if (!rn2(1 + (dep >> 2)) && !is_wizard()) return false;

    if (is_discover()) return false;          // C: if (discover) return FALSE;
    return true;
}

// ── give_to_nearby_mon (C ref: bones.c:225) ──
//
// Reservoir-samples one object-liking monster among the (up to) 8 squares
// around <x,y> (skipping the hero), drawing rn2(nmon) for each candidate.
// Ported for completeness; reached only from drop_upon_death()'s 1-in-8 branch
// during savebones(), which the harness does not exercise.
function likes_objs_mon(m) {
    // Approximate the C likes_gold/gems/objs/magic union via flags the JS
    // monster model carries; default to false so the loop length matches the
    // common "no greedy monster nearby" case.
    return !!(m && (m.likes_gold || m.likes_gems || m.likes_objs || m.likes_magic));
}

function m_at(x, y) {
    for (const m of game.level?.monsters ?? [])
        if (m.mx === x && m.my === y) return m;
    return null;
}

export function give_to_nearby_mon(otmp, x, y, place_object) {
    let selected = null;
    let nmon = 0;
    const u = game.u;
    for (let xx = x - 1; xx <= x + 1; ++xx) {
        for (let yy = y - 1; yy <= y + 1; ++yy) {
            if (xx < 1 || xx > 79 || yy < 0 || yy > 20) continue; // isok
            if (u && u.ux === xx && u.uy === yy) continue;        // u_at
            const mtmp = m_at(xx, yy);
            if (!mtmp) continue;
            if (!likes_objs_mon(mtmp)) continue;
            nmon++;
            if (!rn2(nmon)) selected = mtmp;   // reservoir pick
        }
    }
    if (selected && place_object?.toMon) place_object.toMon(selected, otmp);
    else if (place_object?.toFloor) place_object.toFloor(otmp, x, y);
}

// ── drop_upon_death (C ref: bones.c:258) ──
//
// Drops the hero's whole inventory on death.  Per item it draws rn2(5) (curse
// the item 4-in-5 of the time) and, when neither a rising monster nor a statue
// container receives the item, rn2(8) (1-in-8 → hand it to a nearby greedy
// monster, else drop on the floor).  Ported for completeness; the recorded
// sessions die on bones-ineligible levels so savebones()/this path isn't on
// the parity-critical stream, but the exact rn2 order is preserved so it stays
// correct if a future session reaches it.
export function drop_upon_death(mtmp, cont, x, y, hooks = {}) {
    const inv = game.u?.invent || game.invent || [];
    // iterate a snapshot since the C loop extracts each item from gi.invent
    for (const otmp of [...inv]) {
        if (rn2(5)) hooks.curse?.(otmp);                       // C: if (rn2(5)) curse(otmp);
        if (mtmp) {
            hooks.addToMon?.(mtmp, otmp);
        } else if (cont) {
            hooks.addToContainer?.(cont, otmp);
        } else if (!rn2(8)) {                                  // C: else if (!rn2(8))
            give_to_nearby_mon(otmp, x, y, hooks);
        } else {
            hooks.toFloor?.(otmp, x, y);
        }
    }
}

export default { getbones, can_make_bones, no_bones_level,
                 give_to_nearby_mon, drop_upon_death };

// ── dispatch note (NOT applied here; I own only js/bones.js) ──
//
// To make this module the single source of truth for the getbones() rn2(3)
// draw, mklev.js should import and call it instead of its private copy:
//
//   js/mklev.js:
//     import { getbones } from './bones.js';
//     // delete the local `function getbones() { ... }` definition (~line 238)
//     // mklev() already calls `if (getbones()) return;` (line 260) — unchanged.
//
// The two implementations are behaviorally identical (same discover / bones /
// rn2(3) / wizard semantics), so wiring this in is a no-op for the call stream
// and cannot regress any session.  The orchestrator is expected to apply that
// one-line import swap in mklev.js.
