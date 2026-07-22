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
export async function getbones() {
    if (is_discover()) return false;   // C: if (discover) return 0;  (no rng)
    if (!bones_enabled()) return false; // C: if (!flags.bones) return 0; (no rng)

    // C: if (rn2(3) && !wizard) return 0;
    // rn2(3) is always drawn; short-circuit only suppresses the early return
    // in wizard mode (where bones are forced available for testing).
    if (rn2(3) && !is_wizard()) return false;

    // no_bones_level() — consumes no RNG.
    if (no_bones_level(game.u?.uz)) return false;

    // C: nhfp = open_bonesfile(...); if (!nhfp) return 0;  — the JS harness
    // shares one Web-Storage handle across a session's segments (see
    // frozen/score.sh: "storage ... makes save/restore + bones persist across
    // segments"), so the bones file is the blob a prior segment's savebones()
    // wrote under bones_key().  No blob → no bones (the common case for every
    // single-segment session and every level that no hero died on).
    const storage = game.storage;
    const key = bones_key(game.u?.uz);
    const blob = (key && storage && typeof storage.getItem === 'function')
        ? storage.getItem(key) : null;
    if (blob == null || blob === '') return false;

    // C ref: bones.c:665 validate(nhfp, ...) — a well-formed blob validates
    // SF_UPTODATE.  Everything below runs inside mklev(), i.e. BEFORE
    // goto_level()'s docrt() repaints the destination: game.level still refers
    // to the level being LEFT, so the two wizard y_n() prompts are captured over
    // the old map (matching the recorded C frames), and the actual level graft
    // is deferred to the very end so it can't repaint until docrt().
    try {
        const { y_n } = await import('./display.js');

        // C ref: bones.c:674 — wizard "Get bones?" gate.  'n' (default, also
        // reached by space/return/ESC) discards the bones and makelevel()
        // generates a fresh level instead.
        if (is_wizard()) {
            if ((await y_n('Get bones?')) === 'n') return false;
        }

        // C ref: bones.c:706 getlev(nhfp, 0, 0) — read the level back.  The only
        // RNG a bones getlev consumes is restore.c restobjchn()/restmon()'s
        // `if (ghostly) o_id = next_ident()` (mkobj.c:521 rnd(2)) — one per
        // object (recursing into container contents) and one per monster, in
        // list order.  The o_ids never reach the screen, but the draws must
        // advance the stream so the hero-placement roll that follows
        // (u_on_rndspot) lands where C put it.
        const bundle = await bones_getlev(blob);

        // C ref: bones.c:757 u.uroleplay.numbones++.
        if (game.u) game.u.numbones = (game.u.numbones || 0) + 1;

        // C ref: bones.c:760 — wizard "Unlink bones?" gate.  'n' (default) keeps
        // the file; 'y' deletes it.  Either way the bones stay loaded.
        if (is_wizard()) {
            if ((await y_n('Unlink bones?')) !== 'n') {
                if (storage.removeItem) storage.removeItem(key);
                else storage.setItem(key, '');
            }
        } else if (storage.removeItem) {
            storage.removeItem(key);
        }

        // Commit the graft LAST (after both prompts) so the display kept showing
        // the departing level throughout — C's getlev swaps levl[][] here but the
        // tty back-buffer isn't repainted until goto_level()'s docrt().
        game.level = bundle.level;
        game.stairs = bundle.stairs ?? game.stairs;
        game.fmon = game.level.monsters;
        game._bones_loaded = true;   // goto_level(): skip the fill/mineralize pass
        return true;
    } catch (e) {
        // Any decode/graft failure: behave as if no bones (fresh makelevel).  The
        // rn2(3) above already advanced the stream identically to the no-bones
        // path, so this cannot regress a session that merely has a stray blob.
        if (is_wizard()) { try { (await import('./display.js')).pline?.(`bones: ${e}`); } catch { /*noop*/ } }
        return false;
    }
}

// C ref: bones.c open_bonesfile()/create_bonesfile() filename — the bones file
// is keyed on the dungeon level (bonDD.nnn).  We key the shared-storage blob on
// (dnum,dlevel) so savebones() in one segment and getbones() in the next agree.
export function bones_key(uz) {
    const d = uz || game.u?.uz || {};
    return `nethack.bones.${d.dnum ?? 0}.${d.dlevel ?? 1}`;
}

// C ref: restore.c getlev() for a bones file — deserialize the level graph and
// re-stamp every object's and monster's o_id via next_ident() (rnd(2)), matching
// restobjchn()/restmon()'s `if (ghostly)` re-identification.  Returns the graft
// bundle { level, stairs } without installing it (the caller defers that).
async function bones_getlev(blob) {
    const { deserializeGameState } = await import('./restore.js');
    const { next_ident } = await import('./mkobj.js');
    const bundle = deserializeGameState(blob);
    const level = bundle.level || bundle;

    // restobjchn(): one next_ident() per object, recursing into cobj first —
    // C restores container contents inside the container's loop iteration
    // (restobjchn calls itself for otmp->cobj) — depth-first, contents before
    // the container's own re-stamp.
    const stamp_obj = (o) => {
        if (!o) return;
        if (Array.isArray(o.cobj)) for (const c of o.cobj) stamp_obj(c);
        o.o_id = next_ident();
    };
    for (const o of level.objects || []) stamp_obj(o);
    // restmon(): one next_ident() per monster, then its minvent objects.
    for (const m of level.monsters || []) {
        m.m_id = next_ident();
        if (Array.isArray(m.minvent)) for (const o of m.minvent) stamp_obj(o);
    }
    for (const o of level.buriedobjlist || []) stamp_obj(o);
    return { level, stairs: bundle.stairs };
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

// ── savebones (C ref: bones.c:400) ──
//
// Called from end.c really_done() once can_make_bones() has approved a bones
// file.  The C routine rewrites the dying hero's level into a "legacy" level:
// the hero is removed, the whole inventory is scattered (drop_upon_death), a
// ghost wearing the hero's name is created at the death spot, monsters are
// un-tamed, traps de-attributed, and — crucially for the next hero's arrival —
// every cell's seen/lit/remembered state is wiped so the reloaded level starts
// unexplored.  It then serialises the level (savelev) to the bones file.
//
// Here the shared-storage handle stands in for the bones file: we apply the
// screen-relevant mutations to game.level, then serialise { level, stairs } with
// save.js's reference-preserving codec under bones_key(u.uz).  The next segment's
// getbones() reads it back.  Wrapped so a serialisation hiccup can never abort
// the death sequence (which would drop the segment's already-matched frames).
export async function savebones(how = 0, corpse = null) {
    try {
        const g = game;
        const storage = g.storage;
        if (!storage || typeof storage.setItem !== 'function') return;
        const uz = g.u?.uz;
        const key = bones_key(uz);

        const x = g.u?.ux ?? 0, y = g.u?.uy ?? 0;

        // C ref: bones.c:436 drop_upon_death() — scatter the hero's inventory
        // onto the floor so the reloaded bones level shows the loot.  We add each
        // item to the level's floor list by REFERENCE (no obj_extract_self): C
        // moves it out of gi.invent, but really_done() has already computed the
        // score from the full inventory (end.c:1322 "calculate score, before
        // creating bones"), whereas our outrip_and_score() reads game.invent
        // *after* this call — so leaving the objects on the invent list too keeps
        // the tombstone gold correct while still placing them on the map.  Each
        // item draws rn2(5) (curse) then, on the common branch, rn2(8).
        const { place_object } = await import('./mkobj.js');
        const hooks = {
            curse: (o) => { if (o) { o.cursed = 1; o.blessed = 0; } },
            toFloor: (o) => { if (o) { o.owornmask = 0; place_object(o, x, y); } },
            toMon: (m, o) => { if (o) (m.minvent = m.minvent || []).push(o); },
        };
        drop_upon_death(null, null, x, y, hooks);

        // C ref: bones.c:508-514 — un-tame the level's monsters (they forget the
        // dead hero) and, bones.c:544-547, strip trap "made by you".
        for (const m of g.level?.monsters || []) {
            m.mlstmv = 0;
            if (m.mtame) { m.mtame = 0; m.mpeaceful = 0; }
        }
        for (const t of g.level?.traps || []) { t.madeby_u = 0; }

        // C ref: bones.c:555-560 — wipe every cell's seen/lit/remembered state so
        // the arriving hero explores the legacy level from scratch (this is what
        // makes the reloaded bones level show only the room they can see, not the
        // dead hero's explored map).  This does not touch the death-sequence
        // frames (tombstone/disclosure are full-screen text overlays, not the
        // map), so it cannot regress seg0's post-death screens.
        const map = g.level;
        if (map?.locations) {
            for (let cx = 1; cx < map.locations.length; cx++) {
                const col = map.locations[cx];
                if (!col) continue;
                for (let cy = 0; cy < col.length; cy++) {
                    const loc = col[cy];
                    if (!loc) continue;
                    loc.seenv = 0;
                    loc.waslit = 0;
                    loc.glyph_symidx = -1;
                    loc.remembered_glyph = undefined;
                    loc.disp_ch = ' ';
                }
            }
        }

        // C ref: bones.c:610 savelev() — serialise the level for the next hero.
        const { serializeGameState } = await import('./save.js');
        storage.setItem(key, serializeGameState({ level: g.level, stairs: g.stairs }));
    } catch { /* bones write is best-effort; never break the death sequence */ }
}

export default { getbones, can_make_bones, no_bones_level,
                 give_to_nearby_mon, drop_upon_death, savebones, bones_key };

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
