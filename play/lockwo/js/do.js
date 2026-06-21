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
import { rn2, rn1 } from './rng.js';
import { print_dungeon } from './dungeon.js';
import { mklev, place_lregion, u_on_upstairs } from './mklev.js';
import { fastforward_fill_mineralize } from './fastforward.js';
import { depth as depth_of_level } from './hacklib.js';
import { COLNO, ROWNO, ROOM, CORR, AIR, LR_DOWNTELE, LR_UPTELE } from './const.js';
import { docrt, flush_screen, pline, update_topl, topl_more } from './display.js';
import { vision_reset, vision_recalc } from './vision.js';

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

    // Move to the destination level.
    g._visited_levels = g._visited_levels || {};
    const ledger = `${newlevel.dnum}:${newlevel.dlevel}`;
    const firstVisit = !g._visited_levels[ledger];

    u.uz0 = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
    u.uz = { dnum: newlevel.dnum, dlevel: newlevel.dlevel };

    if (firstVisit) {
        g._visited_levels[ledger] = true;
        // C: mklev() — getbones() rn2(3) + makelevel() structural generation.
        await mklev();
        // C does the room fill + mineralize inside makelevel(); the JS engine
        // factors it into fastforward_fill_mineralize().
        await fastforward_fill_mineralize();
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
    // The on-foot transit message + its --More-- frame were already delivered
    // above (before the level switch) so that the captured frame shows the OLD
    // level, exactly as the deferred-docrt() tty does.
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
    // C ref: wizcmds.c wiz_level_tele() returns ECMD_OK — no game turn elapses.
    return 0; // ECMD_OK
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
