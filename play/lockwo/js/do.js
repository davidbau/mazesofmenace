// do.js — level changes (descent / ascent) and the level-teleport command.
//
// C ref: do.c dodown()/doup()/goto_level(); dungeon.c next_level()/u_on_rndspot();
//        teleport.c level_tele()/wiz_level_tele(); mkmaze.c place_lregion().
//
// Scope: this port covers the wizard-mode level-teleport command (^V, the
// "wizlevelport" command) and the shared goto_level() machinery that
// re-invokes mklev() to generate a dlvl >= 2 the first time the hero visits
// it.  The exact C rn2/rnd/rn1 call sequence is reproduced left-to-right:
//
//   goto_level()  →  getbones() [rn2(3), inside mklev()]
//                 →  makelevel() structural generation
//                 →  fill_ordinary_room()/fill_special_room()/mineralize()
//                    (C does this inside makelevel(); the JS port factors the
//                     fill phase into fastforward_fill_mineralize())
//                 →  u_on_rndspot() → place_lregion(LR_UP/DOWNTELE)
//                 →  losedogs() → mon_arrive(With_you): rn2(10) + mnexto()
//
// The structural + fill phases reuse the real mklev.js / fastforward.js code
// paths that already generate the level-1 layout bit-for-bit; the placement
// and pet-follow phases are ported here (teleport.c collect_coords/enexto and
// dog.c mon_arrive are not otherwise available in the JS engine).

import { game } from './gstate.js';
import { rn2, rn1, rnd, rnl } from './rng.js';
import { print_dungeon } from './dungeon.js';
import { mklev, place_lregion, u_on_upstairs } from './mklev.js';
import { fastforward_fill_mineralize } from './fastforward.js';
import { depth as depth_of_level } from './hacklib.js';
import { COLNO, ROWNO, ROOM, CORR, AIR, LR_DOWNTELE, LR_UPTELE } from './const.js';
import { docrt, flush_screen, pline, update_topl, topl_more, y_n, newsym } from './display.js';
import { vision_reset, vision_recalc } from './vision.js';
import { hide_monst } from './mon.js';
import { more_experienced, newexplevel } from './exper.js';

// C ref: dungeon.c level_difficulty() — factor of difficulty from depth.  The
// covered ports' path is the main dungeon with no amulet and outside the
// endgame, where res == depth(&u.uz); the builds-up (Sokoban / Vlad's Tower)
// and ring-of-aggravate-monster adjustments are not exercised.
const PM_TOURIST = 10; // makemon/exper PM index
function level_difficulty() {
    return depth_of_level(game.u.uz);
}
import { mon_catchup_elapsed_time } from './dogmove.js';
import { onquest } from './questpgr.js';
import { initrack } from './track.js';

// ── small geometry / occupancy helpers (C ref: mklev.c occupied,
//    mkmaze.c bad_location, teleport.c goodpos/collect_coords/enexto) ──

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

// C ref: trap.c t_at — is there a trap at <x,y>?
function t_at(x, y) {
    for (const t of game.level?.traps ?? [])
        if (t.tx === x && t.ty === y) return t;
    return null;
}

// C ref: mon.c m_at — is there a (live) monster at <x,y>?
function m_at(x, y) {
    for (const m of game.level?.monsters ?? [])
        if (m.mx === x && m.my === y) return m;
    return null;
}

function within_bounded_area(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

// C ref: mklev.c occupied() — a trap, furniture, lava, pool or invocation
// spot makes a square unusable for hero/monster placement.  Furniture and
// liquids are already excluded by the ROOM/CORR/AIR typ test in
// bad_location(), so the only extra rejection here is t_at().
function occupied(x, y) {
    return !!t_at(x, y);
}

// C ref: mkmaze.c bad_location().  Faithful to the C predicate so that
// place_lregion()'s probabilistic loop consumes exactly the same number of
// rn1() draws as the C engine.  (mklev.js has a simplified bad_location that
// omits the t_at() check; we use this trap-aware version for level-teleport
// arrival to keep the loop length in sync.)
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (occupied(x, y)) return true;
    if (within_bounded_area(x, y, nlx, nly, nhx, nhy)) return true;
    const typ = loc.typ;
    const is_maze = !!game.level?.flags?.is_maze_lev;
    return !((typ === CORR && is_maze) || typ === ROOM || typ === AIR);
}

// C ref: mkmaze.c place_lregion() — place the hero at a random location
// within the region (the whole level when lx==0), retrying on bad squares.
// This is the level-teleport / fall-through arrival placement.  Each retry
// draws rn1((hx-lx)+1, lx) for x and rn1((hy-ly)+1, ly) for y.
function place_hero_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy) {
    if (!lx) { lx = 1; hx = COLNO - 1; ly = 0; hy = ROWNO - 1; }
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    // C ref: put_lregion_here() for LR_*TELE — besides bad_location, a square
    // occupied by a monster is rejected (return FALSE -> try again) unless this
    // is the deterministic one-shot fallback (oneshot, lx==hx&&ly==hy), where
    // the monster is relocated instead.  The Big Room is densely populated, so
    // this monster rejection is what makes the C placement loop iterate.
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (!bad_location(x, y, nlx, nly, nhx, nhy) && !m_at(x, y)) {
            game.u.ux = x; game.u.uy = y;
            return;
        }
    }
    // deterministic fallback (oneshot): bad_location only; a monster here would
    // be relocated by rloc in C.
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
                game.u.ux = x; game.u.uy = y;
                return;
            }
}

// C ref: dungeon.c u_on_rndspot().  Level-teleport / fall arrival uses the
// up/down-teleport destination region (both default to the whole level when
// goto_level memset svu.updest / svd.dndest to zero).
function u_on_rndspot(upflag) {
    const up = (upflag & 1);
    // svd.dndest / svu.updest are cleared by goto_level (no special level
    // override in scope), so the region defaults to the entire level.
    place_hero_lregion(0, 0, 0, 0, 0, 0, 0, 0,
                       up ? LR_UPTELE : LR_DOWNTELE);
}

// ── pet follow (C ref: dog.c keepdogs()/losedogs()/mon_arrive(With_you)) ──

function goodpos_mon(x, y) {
    if (!isok(x, y)) return false;
    if (game.u?.ux === x && game.u?.uy === y) return false;
    if (m_at(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    // ACCESSIBLE(typ): typ >= DOORS (== anything walkable)
    return typ != null && typ >= 13 /* DOOR */;
}

// C ref: teleport.c collect_coords — candidate spots in expanding rings,
// each ring shuffled with rn2 in the same order as the C engine.
function collect_coords(cx, cy, maxradius) {
    const out = [];
    const rowrange = (cy < ROWNO / 2) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < COLNO / 2) ? (COLNO - 1 - cx) : cx;
    const kmax = Math.max(rowrange, colrange);
    maxradius = maxradius ? Math.min(maxradius, kmax) : kmax;

    for (let radius = 1; radius <= maxradius; radius++) {
        const ringStart = out.length;
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                out.push({ x, y });
            }
        }
        let n = out.length - ringStart;
        let base = ringStart;
        while (n > 1) {
            const kk = rn2(n);
            if (kk) {
                const tmp = out[base];
                out[base] = out[base + kk];
                out[base + kk] = tmp;
            }
            base++;
            n--;
        }
    }
    return out;
}

// C ref: teleport.c enexto_core — first goodpos spot, nearest rings first
// (radius 1-3), then the whole map.
function enexto(xx, yy) {
    const near = collect_coords(xx, yy, 3);
    for (const c of near)
        if (goodpos_mon(c.x, c.y)) return c;
    const all = collect_coords(xx, yy, 0);
    for (let i = near.length; i < all.length; i++)
        if (goodpos_mon(all[i].x, all[i].y)) return all[i];
    return null;
}

// C ref: dog.c mon_arrive(mtmp, With_you).  A tame pet either lands on the
// hero's exact spot (1-in-10 when that square is free) or, far more often,
// is relocated next to the hero via mnexto()->enexto().
function mon_arrive_with_you(mtmp) {
    const u = game.u;
    // C ref: dog.c mon_arrive() — before placing the arriving monster, clear its
    // movement track (mon_track_clear) and refresh the apparent-hero position
    // (mtmp->mux = u.ux, mtmp->muy = u.uy) so the pet's dog_move backtrack
    // avoidance and goal logic don't reuse coordinates from the level just left.
    mtmp.mtrack = [];
    mtmp.mux = u.ux; mtmp.muy = u.uy;
    if (!m_at(u.ux, u.uy) && !rn2(mtmp.mtame ? 10 : mtmp.mpeaceful ? 5 : 2)) {
        // rloc_to(mtmp, u.ux, u.uy) — lands on hero's square (no extra rng)
        mtmp.mx = u.ux; mtmp.my = u.uy;
    } else {
        const cc = enexto(u.ux, u.uy); // mnexto -> enexto
        if (cc) { mtmp.mx = cc.x; mtmp.my = cc.y; }
    }
}

// C ref: dog.c keepdogs()/losedogs().  Capture adjacent tame pets before the
// level is torn down by mklev(), then re-place them next to the hero on the
// new level.  The starter sessions carry a single tame pet (kitten / little
// dog / pony); the only RNG it consumes is mon_arrive(With_you)'s rn2(10).
function keepdogs_capture() {
    const lev = game.level;
    if (!lev?.monsters) return [];
    const u = game.u;
    const kept = [];
    const remain = [];
    for (const m of lev.monsters) {
        // C ref: keepdogs() — a tame pet adjacent to the hero (distu <= 2,2)
        // accompanies the hero to the new level.
        const adj = m.mtame
            && Math.abs(m.mx - u.ux) <= 1 && Math.abs(m.my - u.uy) <= 1;
        if (adj) kept.push(m);
        else remain.push(m);
    }
    lev.monsters = remain;
    return kept;
}

function losedogs_place(kept) {
    if (!game.level.monsters) game.level.monsters = [];
    for (const m of kept) {
        mon_arrive_with_you(m);
        game.level.monsters.push(m);
    }
}

// C ref: you.h next2u(px,py) — distu(px,py) <= 2 (within one step of hero).
function next2u(x, y) {
    const u = game.u;
    const dx = x - u.ux, dy = y - u.uy;
    return (dx * dx + dy * dy) <= 2;
}

// C ref: mon.c mnexto(mtmp, rlocflags) — relocate mtmp to a free spot next to
// the hero via enexto(); on failure the monster goes to limbo (off-map).  The
// enexto() near-ring scan consumes the same collect_coords rn2() draws as C.
function mnexto(mtmp) {
    const cc = enexto(game.u.ux, game.u.uy); // enexto(&mm, u.ux, u.uy, mtmp->data)
    if (!cc) {
        // deal_with_overcrowding -> m_into_limbo: remove from the live level.
        const mons = game.level?.monsters;
        if (mons) { const i = mons.indexOf(mtmp); if (i >= 0) mons.splice(i, 1); }
        return;
    }
    mtmp.mx = cc.x; mtmp.my = cc.y; // rloc_to(mtmp, mm.x, mm.y)
}

// C ref: do.c u_collide_m() — on level arrival a monster shares the hero's
// square (typically the pet that accompanied the hero and landed on the hero's
// exact spot in mon_arrive()).  Randomly move the hero to an adjacent spot or,
// far more often, move the monster to any nearby location.
function u_collide_m(mtmp) {
    const u = game.u;
    // C: if (!rn2(2) && enexto(&cc, u.ux, u.uy, youmonst.data) && next2u(cc.x, cc.y))
    //        u_on_newpos(cc.x, cc.y);  else  mnexto(mtmp, RLOC_NOMSG);
    // The && short-circuits: rn2(2) is always drawn; enexto only when !rn2(2).
    let cc;
    if (!rn2(2) && (cc = enexto(u.ux, u.uy)) && next2u(cc.x, cc.y)) {
        u.ux = cc.x; u.uy = cc.y; // u_on_newpos
    } else {
        mnexto(mtmp);
    }
    // C: if still a monster in the hero's way, rloc it; if that fails, limbo it.
    const still = m_at(u.ux, u.uy);
    if (still) {
        const mons = game.level?.monsters;
        if (mons) { const i = mons.indexOf(still); if (i >= 0) mons.splice(i, 1); }
    }
}

// ── goto_level (C ref: do.c goto_level) ──
//
// Restricted to the level-teleport / first-visit-makelevel path used by the
// wizard ^V command in the recorded sessions: makes the destination level if
// it has not been visited, places the hero at a random spot, and brings the
// adjacent pet along.
export async function goto_level(newlevel, at_stairs, falling, portal) {
    const g = game;
    const u = g.u;

    const up = depth_of_level(newlevel) < depth_of_level(u.uz);
    const newdungeon = u.uz.dnum !== newlevel.dnum;

    if (newlevel.dnum === u.uz.dnum && newlevel.dlevel === u.uz.dlevel)
        return; // on_level(newlevel, &u.uz): nothing to do

    // Capture accompanying pet(s) before the old level is freed by mklev().
    const kept = at_stairs || !at_stairs ? keepdogs_capture() : [];

    // C ref: do.c goto_level() — the ordinary on-foot transit message ("You
    // descend the stairs." / "You climb up the stairs.") is delivered at do.c
    // ~1799, AFTER mklev() but BEFORE the deferred docrt() (do.c:1840) repaints
    // the destination map.  In the tty the display buffer therefore still holds
    // the OLD level (and the OLD Dlvl on the status line) when the message's
    // --More-- is captured: the recorder shows "You descend the stairs.--More--"
    // over the level being LEFT, then the next acked frame shows the new level
    // (seed0030 global-28/231/368).  The JS renderer rebuilds the grid from the
    // live game state on every capture, so to reproduce that old-level frame we
    // emit the message + force its --More-- HERE, while u.uz and game.level still
    // refer to the level being left, before switching below.  This consumes no
    // RNG, so the mklev()/makelevel() PRNG stream that follows is unaffected.
    // C ref: do.c goto_level arrival block — the "You descend/climb the stairs."
    // ordinary-transit message is emitted for any at_stairs move (including a
    // branch crossing into the Gnomish Mines), not just same-dungeon descents.
    if (at_stairs && (game.flags?.verbose !== false)) {
        if (up) await update_topl('You climb up the stairs.');
        else await update_topl('You descend the stairs.');
        await topl_more();          // capture the old-level transit frame
        game._pending_message = '';
        game._toplin = 0;
    }

    // C ref: keepdogs()/mon leaving the level — the accompanying pet is no
    // longer on the departing level, so the tty shows the terrain it stood on.
    // Redraw each captured pet's old cell now: AFTER the on-foot transit frame
    // ("You descend the stairs.--More--") has been captured with the pet still
    // shown (C's gbuf keeps it there), but BEFORE mklev() — so a mid-mklev prompt
    // over the departing level (wizard bones "Get bones?" on a ^V level-teleport,
    // which has no transit frame) is captured with the pet already gone, exactly
    // as C shows it.  u.uz still refers to the departing level here, so the
    // hero's vision (and thus the redrawn terrain) is correct.
    for (const m of kept) newsym(m.mx, m.my);

    // Move to the destination level.
    g._visited_levels = g._visited_levels || {};
    g._level_store = g._level_store || {};
    const ledger = `${newlevel.dnum}:${newlevel.dlevel}`;
    // C ref: do.c goto_level() — "entering this level for first time" is gated on
    // !(level_info[new_ledger].flags & LFILE_EXISTS): a level file exists once the
    // level has been saved by a prior departure.  The per-ledger store is the JS
    // analog of that saved file, so a stored copy means "reload it" (getlev),
    // never "make it" (mklev) — this also covers the game-start level, which was
    // built by chargen (not marked in _visited_levels) but is stored the first
    // time the hero leaves it.
    const firstVisit = !g._visited_levels[ledger] && !g._level_store[ledger];

    // C ref: do.c goto_level() — savelev() writes out (and frees) the level we
    // are leaving before the destination is made or reloaded.  The JS port keeps
    // each visited level's live object graph in a per-ledger store; the
    // reference-swap here plays the role of savelev()/getlev()'s serialize-free /
    // read-back (the object state is identical either way, and no RNG is used).
    // Stash AFTER keepdogs_capture() has pulled any accompanying pet off the
    // level (C likewise runs keepdogs(FALSE) before savelev()) and BEFORE u.uz
    // switches, keyed by the OLD ledger.
    const oldLedger = `${u.uz.dnum}:${u.uz.dlevel}`;
    g._level_store[oldLedger] = {
        level: g.level, stairs: g.stairs, omoves: g.moves ?? 0,
        // C ref: track.c save_track() (called from savelev()) — the hero's
        // footprint ring (utrack) is written into the departing level's save
        // file, then save_track's release_data() branch runs initrack() to clear
        // the live ring.  So each level owns its own footprints; gettrack() on
        // the destination never sees squares the hero walked on a DIFFERENT
        // level.  Mirror that here: stash the ring by reference into the old
        // level's store, then initrack() below installs a fresh empty ring.
        utrack: g._utrack, utcnt: g._utcnt, utpnt: g._utpnt,
    };
    // C ref: save_track() release_data() -> initrack().  Clear the live ring so
    // a freshly-made destination (mklev, no saved track) starts with none, and a
    // reloaded destination gets its own ring back via getlev_restore().
    initrack();

    u.uz0 = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
    u.uz = { dnum: newlevel.dnum, dlevel: newlevel.dlevel };

    if (firstVisit) {
        g._visited_levels[ledger] = true;
        // C: mklev() — getbones() rn2(3) + makelevel() structural generation.
        // When getbones() reloads a bones file it grafts the level and returns
        // early from mklev() (setting g._bones_loaded); makelevel()/the room fill
        // + mineralize pass are then NOT run (C's mklev() returns before
        // makelevel()), so the reloaded legacy level is used verbatim.
        g._bones_loaded = false;
        await mklev();
        if (!g._bones_loaded) {
            // C does the room fill + mineralize inside makelevel(); the JS engine
            // factors it into fastforward_fill_mineralize().
            await fastforward_fill_mineralize();
        }
    } else {
        // C ref: do.c goto_level() "returning to previously visited level;
        // reload it" -> reseed_random() (a no-op in this build:
        // has_strong_rngseed is FALSE) + getlev().  Swap the stored level graph
        // back in and run getlev()'s monster catch-up + re-hide pass, the only
        // RNG the reload consumes.
        await getlev_restore(ledger);
    }

    // Hero placement.  C ref: do.c goto_level() arrival block.
    if (at_stairs) {
        // Prefer the stairway on the new level that leads back to the level we
        // just left (uz0) — for a branch crossing this is the branch staircase.
        const back = stairway_find_to(u.uz0);
        if (back) {
            u.ux = back.sx; u.uy = back.sy;
            back.u_traversed = true;
        } else if (up) {
            u_on_upstairs();
        } else {
            u_on_upstairs(); /* descent lands on the new level's UP stair */
        }
    } else {
        // trap door / level teleport / portal arrival
        u_on_rndspot((up ? 1 : 0));
    }

    // Bring the pet(s) along.  C ref: do.c goto_level() -> losedogs().
    losedogs_place(kept);

    // C ref: do.c goto_level() ~1827 — the hero might be arriving at a spot that
    // now holds a monster (commonly the pet that accompanied the hero and landed
    // on the hero's exact square in mon_arrive()); if so move one or the other.
    {
        const mtmp = m_at(game.u.ux, game.u.uy);
        if (mtmp && mtmp !== game.u.usteed) u_collide_m(mtmp);
    }

    // Reset the screen and draw the new level.  C ref: do.c goto_level()
    // lines ~1837-1841: vision_reset() (clear old level's line-of-sight),
    // reset_glyphmap(gm_levelchange), docrt() (full vision recalc + redraw),
    // flush_screen(-1).  None of these consume RNG, so the call sequence the
    // recorder captured is unaffected; this only paints the destination map
    // that the hero now stands on (otherwise the screen stays blank after a
    // level change).
    game.vision_full_recalc = 0;
    vision_reset();
    vision_recalc(0);
    await docrt();
    await flush_screen(-1);

    // C ref: do.c goto_level() — on first entry to a level ("if (new)"), a
    // Tourist gains reward-experience scaled by the level's difficulty:
    //   if (Role_if(PM_TOURIST)) { more_experienced(level_difficulty(), 0);
    //                              newexplevel(); }
    // No RNG unless the gain crosses an experience-level boundary (newexplevel
    // -> pluslvl), which does not happen on the shallow covered levels.  This
    // feeds u.urexp for the end-of-game score (rip.c / end.c).
    if (firstVisit && game.urole?.mnum === PM_TOURIST) {
        more_experienced(level_difficulty(), 0);
        newexplevel();
    }

    const annotation = game._level_annotations?.[ledger];
    if (annotation) await update_topl(`You remember this level as ${annotation}.`);
    // The on-foot transit message + its --More-- frame were already delivered
    // above (before the level switch) so that the captured frame shows the OLD
    // level, exactly as the deferred-docrt() tty does.
}

// ── getlev_restore (C ref: restore.c getlev(), goto_level() reload path) ──
//
// Runs when goto_level() returns to a previously-visited level: swap the stored
// level graph (map / stairs / monster list) back into place, then walk the
// monster chain applying each monster's elapsed-time catch-up
// (dog.c mon_catchup_elapsed_time) and giving hiders a chance to re-hide.  The
// only RNG the reload consumes is the per-monster re-hide guard (rnd(10) when
// elapsed > 0) plus mon_catchup's conditional recovery rolls
// (trapped/confused/stunned/going-wild), matching restore.c:1200-1220.
async function getlev_restore(ledger) {
    const g = game;
    const store = g._level_store?.[ledger];
    if (!store) return; // level was never actually left (shouldn't happen)
    g.level = store.level;
    g.stairs = store.stairs;
    g.fmon = g.level.monsters;

    // C ref: track.c rest_track() (called from getlev()) — restore this level's
    // saved footprint ring.  goto_level() cleared the live ring (initrack) when
    // it left the previous level, so a level we never departed keeps its empty
    // ring; one we saved gets its own footprints back (utrack was stashed by
    // reference so it is exactly the ring as of our last departure).
    if (store.utrack) {
        g._utrack = store.utrack;
        g._utcnt = store.utcnt ?? 0;
        g._utpnt = store.utpnt ?? 0;
    }

    // C ref: restore.c getlev() — elapsed = svm.moves - svo.omoves (turns spent
    // away from this level).
    const elapsed = (g.moves ?? 0) - (store.omoves ?? 0);

    // C ref: restore.c:1181-1220 monster loop.  program_state.restoring is not
    // REST_LEVELS (an ordinary in-game level change) and u.uz.dlevel != 0, so no
    // monster is skipped by the "regenerate monsters while on another level"
    // continue; ghostly is FALSE (this is not a bones file).
    for (const mtmp of [...(g.level.monsters || [])]) {
        if (mtmp === g.u?.usteed) continue; // steed kept on list but off map
        if (elapsed > 0)
            mon_catchup_elapsed_time(mtmp, elapsed);
        // restore_cham(mtmp): shape-changer fixup — no RNG, not modelled.
        // "give hiders a chance to hide before their next move"
        if (elapsed > 0 && elapsed > rnd(10))
            await hide_monst(mtmp);
    }
}

// ── prev_level (C ref: dungeon.c prev_level) — climb toward the level above ──
// When ascending an up staircase whose destination is a different dungeon
// branch we cross that branch; otherwise we simply decrement dlevel within the
// current branch.  goto_level() then reloads/makes the destination.
export async function prev_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) stway.u_traversed = true;
    if (at_stairs && stway && stway.tolev.dnum !== u.uz.dnum) {
        // Taking an up dungeon branch (KMH: okay if not depth 1).
        // C: if (!u.uz.dnum && u.uz.dlevel == 1 && !u.uhave.amulet) done(ESCAPED)
        const newlevel = { dnum: stway.tolev.dnum, dlevel: stway.tolev.dlevel };
        await goto_level(newlevel, at_stairs, false, false);
    } else {
        // Going up a staircase (or rising through the ceiling).
        const newlevel = { dnum: u.uz.dnum, dlevel: u.uz.dlevel - 1 };
        await goto_level(newlevel, at_stairs, false, false);
    }
}

// ── doup (C ref: do.c doup) — climb an up staircase (the '<' command).
// Models the on-foot ascent: the hero must be standing on a (non-ladder or
// ladder) up staircase.  Pit-climb, being rooted, stuck-steed / held-in-place,
// and over-encumbrance branches are not exercised by the recorded sessions.
export async function doup() {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    // C ref: do.c doup -> set_move_cmd(DIR_UP, 0): u.dz = -1 (up), u.dx=u.dy=0.
    u.dz = -1; u.dx = 0; u.dy = 0;

    // C ref: do.c doup — must be standing on an up staircase.
    if (!stway || !stway.up) {
        await pline("You can't go up here.");
        return 0; // ECMD_OK
    }

    // C ref: do.c doup — near_capacity() > SLT_ENCUMBER "load too heavy to climb"
    // check; the light contest heroes never trigger it (not modelled).

    // C ref: do.c doup — climbing up from ledger 1 (dnum 0, dlevel 1: the top of
    // the Dungeons of Doom) leaves the dungeon, so confirm first.
    if (u.uz.dnum === 0 && u.uz.dlevel === 1) {
        const ans = await y_n('Beware, there will be no return!  Still climb?',
                              'yn\x1b', 'n');
        if (ans !== 'y') return 0; // ECMD_OK
    }

    // C ref: do.c doup — pet leash check before transit.
    if (!next_to_u()) {
        await pline('You are held back by your pet!');
        return 0; // ECMD_OK
    }

    // C: ga.at_ladder = (levl[u.ux][u.uy].typ == LADDER); prev_level(TRUE).
    await prev_level(true);
    return 1; // ECMD_TIME
}

// ── next_level (C ref: dungeon.c next_level) ──
// When descending an actual staircase, the destination comes from the
// stairway's tolev (which, for branch stairs, points into another dungeon
// branch such as the Gnomish Mines).  Only when not on a staircase (e.g.
// falling through a hole) do we increment dlevel within the same branch.
export async function next_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) {
        stway.u_traversed = true;
        const newlevel = { dnum: stway.tolev.dnum, dlevel: stway.tolev.dlevel };
        await goto_level(newlevel, at_stairs, false, false);
    } else {
        const newlevel = { dnum: u.uz.dnum, dlevel: u.uz.dlevel + 1 };
        await goto_level(newlevel, at_stairs, !at_stairs, false);
    }
}

// ── wiz_level_tele (C ref: teleport.c level_tele + cmd.c wiz_level_tele) ──
//
// The ^V wizard command.  Prompts "To what level do you want to teleport?",
// reads a level number, and (for a valid positive in-dungeon level) schedules
// goto_level() to that dlvl.  The prompt itself consumes no RNG.
//
// `readLevel` is injected by the dispatcher (cmd.js) so this module stays free
// of the input/getlin plumbing; it must return the typed string (or null/ESC
// to cancel).
export async function wiz_level_tele(readLevel) {
    const u = game.u;
    const buf = await readLevel('To what level do you want to teleport?');
    if (buf == null || buf === '\x1b') return 0; // cancelled (ESC)

    // C ref: teleport.c level_tele() — wizard "?" opens the print_dungeon level
    // menu.  The menu consumes no RNG and force_dest bypasses the usual range
    // checks: the chosen (dnum, dlevel) is taken verbatim.
    let newlevel;
    if (String(buf) === '?') {
        const choice = await print_dungeon(true);
        if (!choice) return 0; // print_dungeon returned 0 (cancel)
        newlevel = { dnum: choice.destdnum, dlevel: choice.destlev };
        // force_dest: no further validation; teleport straight to the target.
        if (newlevel.dnum === u.uz.dnum && newlevel.dlevel === u.uz.dlevel)
            return 0;
        await goto_level(newlevel, false, false, false);
        if (game.flags?.verbose !== false)
            await pline('You materialize on a different level!');
        // C ref: do.c goto_level() arrival block — In_quest(&u.uz) -> onquest():
        // the quest home level's first-time arrival message.  Delivered after
        // the "You materialize..." topline so its window flushes that topline
        // with --More-- first.
        await onquest();
        // C ref: wizcmds.c wiz_level_tele() returns ECMD_OK — the wizard-mode
        // level teleport does NOT cost a game turn (no movemon / gethungry /
        // monster-spawn pass).  Returning ECMD_TIME here advanced moves by one
        // and let the pet take an extra dog_move, landing it off-position.
        return 0; // ECMD_OK
    }

    if (buf === '') return 0; // empty line: cancelled

    const m = String(buf).match(/^(-?\d+)/);
    if (!m) return 0;
    let newlev = parseInt(m[1], 10);
    if (newlev === 0) return 0; // "Go to Nowhere" path not modelled

    // Translate the logical depth the player typed into a (dnum, dlevel).
    // For the main Dungeons of Doom (dnum 0, depth_start 1) the logical depth
    // equals the dlevel.  Negative levels (heaven/clouds) are not modelled.
    if (newlev < 0) return 0;

    const dng = game.dungeons?.[u.uz.dnum];
    const numlevs = dng?.num_dunlevs ?? 1;
    let dlevel = newlev - (dng?.depth_start ?? 1) + 1;
    if (dlevel > numlevs) dlevel = numlevs;
    if (dlevel < 1) dlevel = 1;

    newlevel = { dnum: u.uz.dnum, dlevel };
    if (newlevel.dnum === u.uz.dnum && newlevel.dlevel === u.uz.dlevel)
        return 0; // can't get there from here

    await goto_level(newlevel, false, false, false);

    // C ref: teleport.c level_tele() -> schedule_goto(..., "You materialize on
    // a different level!"); the deferred top-line message is delivered after
    // goto_level()'s docrt() (via maybe_lvltport_feedback).  Only shown when
    // flags.verbose (the default).
    if (game.flags?.verbose !== false)
        await pline('You materialize on a different level!');
    await onquest();
    // C ref: wizcmds.c wiz_level_tele() returns ECMD_OK — no game turn elapses.
    return 0; // ECMD_OK
}

// ── level_tele (C ref: teleport.c level_tele) ──
//
// The controlled / random level teleport reached by reading a confused or
// cursed scroll of teleportation (read.c seffect_teleportation).  With teleport
// control (or in debug/wizard mode) the hero is prompted for a destination
// level; a confused hero usually mispronounces and is sent to a random level
// ("Oops...").  Without control the teleport is always random.  The exotic
// destinations (heaven/clouds via a negative level, quest/endgame, the wizard
// "?" menu, "Go to Nowhere") are not exercised by the recorded sessions and are
// not modelled; the common in-dungeon random/controlled cases are.
//
// `readLevel(query)` reads the destination line via the top-line getlin; it is
// injected so this module stays free of the input plumbing (read.js supplies
// hooked_tty_getlin).  The confused-scroll caller has a still-pending topline
// ("Being confused, ...") when this runs; getlin's own more() (C getline.c:53)
// pages it before the prompt is drawn.
export async function level_tele(readLevel) {
    const u = game.u;
    const wizard = !!game.flags?.debug;

    // C ref: teleport.c level_tele — carrying the Amulet / being in the endgame
    // or Sokoban blocks a (non-wizard) level teleport.  Not exercised on the
    // covered starts, kept as a faithful guard.
    if ((u.uhave_amulet || false) && !wizard) {
        await pline('You feel very disoriented for a moment.');
        return;
    }

    const confused = (u.uprops?.Confusion || 0) > 0;
    const teleport_control = (u.uprops?.Teleport_control || 0) > 0
        || !!u.Teleport_control;
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    const cur_depth = depth_of_level(u.uz);

    let newlev = 0;
    let gotoRandom = false;

    if ((teleport_control && !stunned) || wizard) {
        // Controlled level teleport: prompt for a destination.
        let trycnt = 0;
        let cancelled = false;
        for (;;) {
            let qbuf = 'To what level do you want to teleport?';
            // C: on the second and later passes the prompt gains a usage hint.
            if (++trycnt === 2)
                qbuf += wizard ? ' [type a number, name, or ? for a menu]'
                               : ' [type a number or name]';
            const buf = await readLevel(qbuf);
            if (buf === '*') { gotoRandom = true; break; }
            // C ref: teleport.c — a confused hero mispronounces the destination
            // and (rnl(5) != 0) is teleported to a random level instead.  The
            // "Oops..." message + its --More-- are shown over the OLD level
            // (before goto_level switches), matching the deferred-docrt tty
            // capture the recorder took (cf. the stair-transit handling below).
            if (confused && rnl(5)) {
                await pline('Oops...');
                game._toplin = 1;
                await topl_more();
                game._pending_message = '';
                game._toplin = 0;
                gotoRandom = true;
                break;
            }
            if (buf === '\x1b' || buf == null) { cancelled = true; break; }
            // wizard "?" opens print_dungeon; not modelled for the scroll path.
            newlev = lev_by_name(buf);
            if (!newlev) newlev = parseInt(String(buf), 10) || 0;
            // C do-while: repeat while newlev==0 and buf isn't a (leading-sign)
            // digit and trycnt < 10.
            const b0 = String(buf).charCodeAt(0);
            const b1 = String(buf).charCodeAt(1);
            const isDigit = (c) => c >= 48 && c <= 57;
            if (newlev || isDigit(b0) || (String(buf)[0] === '-' && isDigit(b1))
                || trycnt >= 10)
                break;
        }
        if (cancelled) return;
    } else {
        // Involuntary level teleport (no control): straight to a random level.
        gotoRandom = true;
    }

    if (gotoRandom) {
        newlev = random_teleport_level();
        if (newlev === cur_depth) { await pline('You shudder for a moment.'); return; }
    }

    // C ref: teleport.c — TT_BURIEDBALL / next_to_u / endgame / negative-level
    // (heaven & clouds) handling is omitted (not exercised); the pet-adjacency
    // check is the only one that applies and it is always TRUE here.
    if (!next_to_u()) { await pline('You shudder for a moment.'); return; }

    // Negative levels (heaven / clouds) and quest/hell adjustments are not
    // modelled; the covered scroll teleport always yields an in-dungeon level.
    if (newlev <= 0) return; // faithful no-op guard (unmodelled destinations)

    const newlevel = get_level(newlev);
    if (newlevel.dnum === u.uz.dnum && newlevel.dlevel === u.uz.dlevel
        && newlev !== cur_depth) {
        await pline("You can't get there from here.");
        return;
    }

    // C ref: read.c seffect_teleportation — a completed level teleport marks the
    // scroll type known (gk.known); doread() then discovers it via makeknown().
    game.known = true;

    // C ref: teleport.c schedule_goto(&newlevel, UTOTYPE_NONE, 0, "You
    // materialize on a different level!").  C DEFERS the level change to
    // deferred_goto(), called right after rhack() — i.e. AFTER doread()'s
    // learnscroll()/makeknown() (which draws rn2(19) via exercise(A_WIS)).  So
    // we must NOT run goto_level() here: mklev() must follow that exercise in
    // the PRNG stream.  Record the pending destination; doread() runs
    // run_deferred_lvltport() after makeknown() to fire it.  The scroll type is
    // already known, so goto_level's mklev() then starts from the right state.
    game._lvltport_dest = {
        newlevel,
        post_msg: (game.flags?.verbose !== false)
            ? 'You materialize on a different level!' : null,
    };
}

// C ref: do.c deferred_goto() for a level-teleport UTOTYPE_NONE — perform the
// pending goto_level() scheduled by level_tele(), then deliver its arrival
// message over the freshly drawn level (maybe_lvltport_feedback()).  Called
// from doread() after the scroll has been discovered + used up, matching C's
// "deferred_goto() right after rhack()" ordering (no RNG is drawn in between).
export async function run_deferred_lvltport() {
    const pend = game._lvltport_dest;
    if (!pend) return;
    game._lvltport_dest = null;
    await goto_level(pend.newlevel, false, false, false);
    if (pend.post_msg) await pline(pend.post_msg);
}

// C ref: dungeon.c Is_botlevel — is <lev> the bottom level of its dungeon?
function is_botlevel(lev) {
    const dng = game.dungeons?.[lev.dnum];
    return !!dng && lev.dlevel === dng.num_dunlevs;
}

// C ref: dungeon.c get_level(newlevel, levnum) — translate a logical depth into
// a (dnum, dlevel).  Only the same-dungeon and clamp-to-bottom cases are needed
// (the covered teleport stays within the Dungeons of Doom); the branch-walk for
// shallower parent dungeons is not exercised.
function get_level(levnum) {
    const u = game.u;
    const dgn = u.uz.dnum;
    const dng = game.dungeons[dgn];
    if (levnum <= 0) {
        levnum = u.uz.dlevel;
    } else if (levnum > (dng.depth_start + dng.num_dunlevs - 1)) {
        levnum = dng.num_dunlevs;
    } else {
        // within the same dungeon (levnum >= depth_start on the covered starts).
        levnum = levnum - dng.depth_start + 1;
    }
    return { dnum: dgn, dlevel: levnum };
}

// C ref: dungeon.c lev_by_name — resolve a level *name* ("mines end", branch
// names, annotations) to a logical depth.  Named-level lookup isn't exercised
// by the recorded scroll teleports (the destination is a number or the confused
// "Oops..." random path), so this returns 0 (not a name).
function lev_by_name(_nam) {
    return 0;
}

// C ref: teleport.c random_teleport_level() — pick a random destination depth
// for an uncontrolled level teleport.  The Dungeons-of-Doom (non-quest,
// non-endgame, non-hell) case is modelled; the RNG draws (the initial rn2(5),
// the rn2(range) selection, and the rnd(3) botlevel/min-depth adjustments) are
// reproduced left-to-right so the mklev() stream that follows stays in sync.
function random_teleport_level() {
    const u = game.u;
    const cur_depth = depth_of_level(u.uz);
    const dng = game.dungeons[u.uz.dnum];

    // single_level_branch / In_endgame are false for the covered DoD teleport.
    if (!rn2(5)) return cur_depth;

    // In_quest not modelled (no quest teleport on the covered starts).
    const min_depth = 1;
    let max_depth = dng.num_dunlevs + (dng.depth_start - 1);
    // Inhell && !invoked adjustment omitted (not in hell).

    // Range is 1..current+3, current not counting.
    let nlev = rn2(cur_depth + 3 - min_depth) + min_depth;
    if (nlev >= cur_depth) nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        if (is_botlevel(u.uz)) nlev -= rnd(3);
    }
    if (nlev < min_depth) {
        nlev = min_depth;
        if (nlev === cur_depth) {
            nlev += rnd(3);
            if (nlev > max_depth) nlev = max_depth;
        }
    }
    return nlev;
}

// C ref: stairs.c stairway_at — find the stairway node at <x,y>.
function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

// C ref: stairs.c stairway_find_from — find the stairway on the current level
// whose destination is the given level (used to land the hero on the staircase
// that leads back to the level just left, e.g. the mines branch stair).
function stairway_find_to(dlev) {
    if (!dlev) return null;
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev && s.tolev.dnum === dlev.dnum && s.tolev.dlevel === dlev.dlevel)
            return s;
    return null;
}

// C ref: apply.c next_to_u — FALSE only when a leashed pet (or amulet-bearing
// steed) can't follow.  Leashes/steeds are not modelled in the recorded
// sessions, so this is always TRUE (the pet follows down the stairs).
function next_to_u() {
    return true;
}

// ── dodown (C ref: do.c dodown) — descend stairs.
// Models the on-foot "descend the down stairs" case: the hero must be standing
// on a (non-ladder) down staircase, not levitating, and able to bring the pet.
// Trap-door / hole falls, ladders, Gehennom gate, levitation, polymorph-hiders
// and stuck states are not exercised by the recorded sessions.
export async function dodown() {
    const u = game.u;

    // C ref: do.c dodown — stairs_down = stairway present, going down, not a
    // ladder.
    let stairs_down = false;
    const stway = stairway_at(u.ux, u.uy);
    if (stway && !stway.up)
        stairs_down = !stway.isladder;

    if (!stairs_down) {
        // C ref: do.c dodown "You can't go down here." (no trap/hole/autodig
        // modelled).  ECMD_OK: no turn elapses.
        await pline("You can't go down here.");
        return 0; // ECMD_OK
    }

    // C ref: do.c dodown — pet leash check before transit.
    if (!next_to_u()) {
        await pline('You are held back by your pet!');
        return 0; // ECMD_OK
    }

    await next_level(true);
    return 1; // ECMD_TIME
}
