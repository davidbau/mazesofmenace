// hack.js — multi-turn movement: run (capital HJKL / 'G' prefix), rush ('g'
// prefix) and travel ('_' / #travel).  Mirrors the run/travel machinery that
// is spread across hack.c (domove_core, lookaround, end_running,
// findtravelpath) and the moveloop_core() run continuation in allmain.c.
//
// In the C engine a run command sets svc.context.run and gm.multi, performs
// the first domove() in rhack(), and then allmain.c moveloop_core() keeps
// calling lookaround()+domove() while gm.multi stays positive.  The recorded
// tty session only captures a screen at each tty_nhgetch(); during a run no
// nhgetch() happens, so the whole run renders as a *single* recorded screen
// (the state after the run stops).  We therefore execute the entire run inline
// here — first move plus every continuation move, with the once-per-turn
// machinery (moveloop_turn) run between moves — so that the next nhgetch()
// capture sees the final post-run state with the exact cumulative RNG.

import { game } from './gstate.js';
import { domove, blocksMove } from './cmd.js';
import { moveloop_turn } from './allmain.js';
import { m_at, vobj_at, covers_objects, object_glyph, flush_screen, newsym, pline, update_topl, topl_more, y_n, docrt, show_glyph_cell, terrain_background_glyph, getpos_is_feature_sym, getpos_find_feature } from './display.js';
import { obj_doname, whatis_pick_inventory } from './invent.js';
import { rnd } from './rng.js';
import { vision_recalc } from './vision.js';
import { nhgetch } from './input.js';
import { is_safemon, canspotmon } from './uhitm.js';
import { dist2 } from './hacklib.js';
import { roles, races } from './role.js';
import { DATABASE_ENTRIES } from './data_base_data.js';
import { NO_COLOR, ATR_INVERSE, DEC_TO_UNICODE, CLR_WHITE } from './terminal.js';
import { teleok_hero, teleds_hero, safe_teleds_hero } from './read.js';
import { COLNO, ROWNO, STONE, ROOM, CORR, DOOR, ICE, STAIRS, FOUNTAIN,
         POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
         D_CLOSED, D_LOCKED, D_ISOPEN, D_BROKEN,
         IS_WALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_AIR, IS_POOL, IS_LAVA,
         Is_waterlevel, isok } from './const.js';

// Run direction deltas for the capital-letter run commands (and the
// 'G'/'g' prefix followed by a movement key).  C: xdir[]/ydir[].
//   y u    \ | /
//   h l  =  - . -
//   b n    / | \
const RUN_DX = { H: -1, L: 1, J: 0, K: 0, Y: -1, U: 1, B: -1, N: 1 };
const RUN_DY = { H: 0, L: 0, J: 1, K: -1, Y: -1, U: -1, B: 1, N: 1 };

export function isRunKey(ch) {
    return 'HJKLYUBN'.includes(ch);
}

// C ref: monmove.c closed_door() — a door that is shut or locked.
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED));
}

// C ref: rm.h is_pool_or_lava — water/lava terrain.
function is_pool_or_lava(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return IS_POOL(loc.typ) || IS_LAVA(loc.typ);
}

// C ref: hack.c avoid_moving_on_trap() — true when <x,y> holds a seen trap
// (other than the vibrating square).  The starter levels have no seen traps
// along the recorded run paths, but the check is preserved for faithfulness.
function avoid_moving_on_trap(x, y) {
    const traps = game.level?.traps || [];
    for (const t of traps) {
        if (t.tx === x && t.ty === y && t.tseen && t.ttyp !== /*VIBRATING_SQUARE*/ undefined)
            return true;
    }
    return false;
}

// C ref: hack.c end_running() — stop a run/travel: clear context.run and
// (for travel) context.travel / context.mv; cancel gm.multi.
function end_running(and_travel) {
    const c = game.context;
    if (c.run) c.run = 0;
    if (and_travel) {
        c.travel = c.travel1 = c.mv = 0;
    }
    if (game.multi > 0) game.multi = 0;
}

// C ref: hack.c nomul() — interrupt a multi-turn action, or (nval < 0) make the
// hero helpless/busy for |nval| turns.  C: `if (multi < nval) return; multi =
// nval;`.  The negative-multi path is needed for #jump (nomul(-1)): the hero is
// "busy jumping" for one turn, so the moveloop runs that turn fully WITHOUT the
// hero acting again — which prevents a Fast hero's leftover movement from being
// spent as a free action right after the jump (the seed4500 jump turns).
function nomul(nval = 0) {
    if ((game.multi ?? 0) < nval) return;
    game.multi = nval;
    game.context.travel = game.context.travel1 = game.context.mv = 0;
}

// C ref: hack.c lookaround() — examine the 8 cells around the hero after a
// run/travel step and decide whether to stop (nomul) or keep going, possibly
// turning to follow a corridor.  Only the run==1 / run==3 / travel(run==8)
// corridor-following and stop behaviour exercised by the owned sessions is
// implemented; hostile-monster and trap stops are preserved structurally.
function lookaround() {
    const u = game.u;
    const c = game.context;
    let x0 = 0, y0 = 0, m0 = 1, i0 = 9;
    let corrct = 0, noturn = 0;
    let i;
    let stop = false;

    if (c.run === 0) return;

    // Mirror C's `goto stop` / `goto bcorr` with labelled loops: STOP breaks
    // the whole scan and ends the run; bcorr is the corridor-accounting block
    // entered by several terrain cases.
    outer:
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            const infront = (x === u.ux + u.dx && y === u.uy + u.dy);

            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;

            const loc = game.level?.at(x, y);
            const typ = loc ? loc.typ : STONE;
            const mtmp = m_at(x, y);

            // can we see a monster there?
            if (mtmp && canspotmon(mtmp)) {
                if ((c.run !== 1 && !is_safemon(mtmp))
                    || (infront && !c.travel)) {
                    stop = true; break outer;
                }
            }

            // stone is never interesting
            if (typ === STONE) continue;
            // ignore the square we're moving away from
            if (x === u.ux - u.dx && y === u.uy - u.dy) continue;

            // bcorr flag: whether this cell should be handled as a corridor
            let bcorr = false;

            // stop for seen traps, sometimes
            if (avoid_moving_on_trap(x, y)) {
                if (c.run === 1) {
                    bcorr = true; // "if you must"
                } else if (infront) {
                    stop = true; break outer;
                }
            }

            if (!bcorr) {
                if (IS_OBSTRUCTED(typ) || typ === ROOM || IS_AIR(typ) || typ === ICE) {
                    continue;
                } else if (closed_door(x, y)) {
                    if (x !== u.ux && y !== u.uy) continue; // ignore if diagonal
                    if (c.run !== 1 && !c.travel) { stop = true; break outer; }
                    bcorr = true; // orthogonal to a closed door -> corridor
                } else if (typ === CORR) {
                    bcorr = true;
                } else if (is_pool_or_lava(x, y)) {
                    continue;
                } else {
                    // e.g. objects or trap or stairs
                    if (c.run === 1) {
                        bcorr = true;
                    } else if (c.run === 8) {
                        continue;
                    } else {
                        if (mtmp) continue;
                        if (((x === u.ux - u.dx) && (y !== u.uy + u.dy))
                            || ((y === u.uy - u.dy) && (x !== u.ux + u.dx)))
                            continue;
                        stop = true; break outer;
                    }
                }
            }

            // ---- bcorr: corridor accounting ----
            const here = game.level?.at(u.ux, u.uy);
            if (here && here.typ !== ROOM) {
                if (c.run === 1 || c.run === 3 || c.run === 8) {
                    i = dist2(x, y, u.ux + u.dx, u.uy + u.dy);
                    if (i > 2) continue; // not on/adjacent to where we're going
                    if (corrct === 1 && dist2(x, y, x0, y0) !== 1) noturn = 1;
                    if (i < i0) {
                        i0 = i;
                        x0 = x;
                        y0 = y;
                        m0 = mtmp ? 1 : 0;
                    }
                }
                corrct++;
            }
        }
    }

    if (stop) { nomul(0); return; }

    if (corrct > 1 && c.run === 2) {
        nomul(0); return;
    }
    if ((c.run === 1 || c.run === 3 || c.run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        // make sure that we do not turn too far
        if (i0 === 2) {
            if (u.dx === y0 - u.uy && u.dy === u.ux - x0) i = 2;       // turn right
            else i = -2;                                              // turn left
        } else if (u.dx && u.dy) {
            if ((u.dx === u.dy && y0 === u.uy) || (u.dx !== u.dy && y0 !== u.uy)) i = -1;
            else i = 1;
        } else {
            if ((x0 - u.ux === y0 - u.uy && !u.dy) || (x0 - u.ux !== y0 - u.uy && u.dy)) i = 1;
            else i = -1;
        }

        i += (u.last_str_turn || 0);
        if (i <= 2 && i >= -2) {
            u.last_str_turn = i;
            u.dx = x0 - u.ux;
            u.dy = y0 - u.uy;
        }
    }
}

// C ref: hack.c domove_core() run-stop checks that the shared cmd.js domove()
// does not perform: while running, if the destination holds a non-safe
// monster we can see, stop *without* moving (nomul, context.move = 0).
function senseHostileAtDest() {
    const u = game.u;
    const mtmp = m_at(u.ux + u.dx, u.uy + u.dy);
    if (mtmp && !is_safemon(mtmp) && canspotmon(mtmp)) {
        nomul(0);
        game.context.move = 0;
        return true;
    }
    return false;
}

// C ref: pickup.c pickup() — "if there's anything here, stop running":
//   if (OBJ_AT(u.ux,u.uy) && svc.context.run && svc.context.run != 8
//       && !svc.context.nopick) nomul(0);
// pickup() runs from spoteffects(TRUE) at the tail of domove_core, i.e. right
// after the hero steps onto the new square.  Without this a run sails straight
// over floor objects instead of halting on them, leaving the hero (and every
// downstream monster-move / pet object scan) on the wrong square.  Only floor
// objects count (a picked-up / contained object keeps stale ox/oy but its
// `where` is no longer OBJ_FLOOR).
function floorObjAt(x, y) {
    const objs = game.level?.objects;
    if (!Array.isArray(objs)) return false;
    for (const o of objs) {
        if (o.ox === x && o.oy === y && (o.where === 'floor' || o.where === 1))
            return true;
    }
    return false;
}
function runStopOnObject() {
    const u = game.u;
    const c = game.context;
    if (!c.run || c.run === 8 || c.nopick) return false;
    if (floorObjAt(u.ux, u.uy)) { nomul(0); return true; }
    return false;
}

// C ref: hack.c domove_core() tail — after a run move onto a door /
// obstruction / furniture (when run < 8), nomul(0) so the run ends after this
// step (its once-per-turn work still runs, then the loop stops).
function runOntoStopTerrain() {
    const u = game.u;
    const c = game.context;
    if (!c.run || c.run >= 8) return false;
    const loc = game.level?.at(u.ux, u.uy);
    if (!loc) return false;
    if (IS_DOOR(loc.typ) || IS_OBSTRUCTED(loc.typ) || IS_FURNITURE(loc.typ)) {
        nomul(0);
        return true;
    }
    return false;
}

// Run the per-turn machinery for the step that just elapsed.  C: the top of
// allmain.c moveloop_core() runs this when svc.context.move is set.
async function takeTurn() {
    await moveloop_turn();
}

// Drive an entire run/travel.  `run` is the C svc.context.run value (1 = run
// via capital-letter / shift-dir, 2 = rush 'g', 3 = run 'G', 8 = travel).
// On entry u.dx/u.dy already hold the initial direction.  Returns nothing;
// game.context.move is left at 0 (all elapsed turns were taken inline, so the
// moveloop must NOT schedule another).
async function run_movement(run) {
    const u = game.u;
    const c = game.context;
    c.run = run;
    c.mv = true;
    u.last_str_turn = 0;
    if (!game.multi) game.multi = Math.max(COLNO, ROWNO);

    // First move (C: performed in rhack()).  If we sense a hostile monster at
    // the destination while running, we stop without moving.
    if (senseHostileAtDest()) {
        end_running(true);
        c.move = 0;
        return;
    }
    await domove(u.dx, u.dy);

    // Continuation loop (C: allmain.c moveloop_core while gm.multi > 0).
    for (;;) {
        if (!c.move) break;            // blocked move: no turn, stop running

        // The move happened: run its once-per-turn machinery.
        runOntoStopTerrain();          // may set game.multi = 0 (door etc.)
        runStopOnObject();             // C pickup(): halt the run on a floor object
        await takeTurn();

        if (game.multi <= 0) break;    // nomul triggered -> stop after this turn

        lookaround();                  // may stop (multi=0) or turn the path
        if (game.multi <= 0) break;

        // C: `if (gm.multi < COLNO && !--gm.multi) end_running(TRUE);`
        if (game.multi < COLNO) {
            game.multi -= 1;
            if (game.multi === 0) { end_running(true); break; }
        } else {
            game.multi -= 1;
        }

        if (senseHostileAtDest()) break;
        await domove(u.dx, u.dy);
    }

    end_running(true);
    // Every elapsed turn was processed inline above; tell the moveloop no
    // further per-turn work is owed for this command.
    c.move = 0;
    game.multi = 0;
}

// C ref: cmd.c do_run_*()/set_move_cmd(dir, 1) reached via the capital-letter
// run keys (and via the 'G' run prefix).  Run until something interesting.
export async function do_run(dx, dy) {
    const u = game.u;
    u.dx = dx;
    u.dy = dy;
    u.dz = 0;
    await run_movement(1);
}

// C ref: cmd.c do_rush_*()/set_move_cmd(dir, 3) — the 'G' run prefix uses
// run==3; the 'g' rush prefix uses run==2.
export async function do_run_prefixed(dx, dy, runval) {
    const u = game.u;
    u.dx = dx;
    u.dy = dy;
    u.dz = 0;
    await run_movement(runval);
}

export { RUN_DX, RUN_DY };

// ─────────────────────────────────────────────────────────────────────────
// getpos() — the cursor-positioning loop shared by ';' farlook, travel ('_')
// and any command that selects a map location (e.g. #jump).
// C ref: getpos.c getpos(); the first-use farlook tip is hack.c handle_tip()
// -> dat/nhcore.lua show_getpos_tip() -> a tty NHW_TEXT window.
// ─────────────────────────────────────────────────────────────────────────

// dat/nhcore.lua show_getpos_tip() text, verbatim (the leading/trailing blank
// lines from the [[...]] block are stripped by the tty text-window code).
const GETPOS_TIP = [
    'Tip: Farlooking or selecting a map location',
    '',
    'You are now in a "farlook" mode - the movement keys move the cursor,',
    'not your character.  Game time does not advance.  This mode is used',
    'to look around the map, or to select a location on it.',
    '',
    'When in this mode, you can press ESC to return to normal game mode,',
    'and pressing ? will show the key help.',
];

// Render the farlook tip as an overlay corner window (the map/status drawn by
// the previous flush_screen show through outside the window's column band).
// C ref: nhlua.c nhl_text() builds the tip as a *NHW_MENU* (create_nhwindow
// NHW_MENU + add_menu_str per line + select_menu(PICK_NONE)), NOT a NHW_TEXT
// window.  wintty.c tty_display_nhwindow uses the H2344_BROKEN corner-menu form
//   offx = min(min(82, cols/2), cols - maxcol - 1), maxcol = max(len)+2
// and process_menu_window draws a leading blank at column offx (via the
// "(void) putchar(' ')" corner branch after cl_end) then the item text at
// offx+1.  The "(end)" morestr sits on the row after the content at offx+1 and
// dmore parks the cursor one past it (offx+1 + len("(end)") + 1).  The message
// window (row 0) is cleared full-width first (tty_clear_nhwindow(WIN_MESSAGE)).
function render_getpos_tip() {
    const disp = game.nhDisplay;
    if (!disp?.putstr) return;

    const lines = GETPOS_TIP;
    // add_menu_str reserves 2 columns (H2344_BROKEN menu item width = len+2).
    let maxcol = 0;
    for (const l of lines) if (l.length + 2 > maxcol) maxcol = l.length + 2;

    const cols = 80;
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const textCol = offx + 1; // leading blank at offx, item text at offx+1

    const blankCols = (row) => {
        for (let c = offx; c < cols; c++) disp.setCell(c, row, ' ', NO_COLOR, 0);
    };
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0); // WIN_MESSAGE

    for (let i = 0; i < lines.length; i++) {
        blankCols(i);
        if (lines[i]) disp.putstr(textCol, i, lines[i], NO_COLOR, 0);
    }
    const endRow = lines.length;
    blankCols(endRow);
    disp.putstr(textCol, endRow, '(end)', NO_COLOR, 0);
    disp.setCursor(textCol + '(end)'.length + 1, endRow);
}

// C ref: hack.c handle_tip(TIP_GETPOS): show the farlook tip the first time
// getpos() is used.  A tty NHW_TEXT window blocks until a window-dismiss key
// (space/return/escape); other keys redraw and wait again.  Each redraw is a
// recorded screen because every readchar fires the capture hook.  Returns
// TRUE if the tip was shown (so the caller forces the goal message).
async function getpos_tip() {
    const c = game.context;
    c.tips = c.tips || 0;
    const TIP_GETPOS = 1 << 4;
    if (c.tips & TIP_GETPOS) return false;
    c.tips |= TIP_GETPOS;

    for (;;) {
        render_getpos_tip();
        const k = await nhgetch();
        if (k === 32 || k === 13 || k === 10 || k === 27) break;
    }
    return true;
}

// getpos movement keys: hjkl + diagonals (lower and upper case both move the
// cursor here; rush/run prefixes handled separately).  C: movecmd().
const GP_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const GP_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

// C ref: cmd.c reset_commands() — dirchars "hykulnjb><"; for each direction
// the rush mode binds Ctrl-<dirchar> (C(di)) and the run mode binds the capital
// (highc(di)).  getpos's movecmd(MV_RUSH)/movecmd(MV_RUN) therefore accept the
// control-char rush keys too — notably Ctrl-J ('\n', 0x0A) which rushes south.
// Map the control byte -> lowercase movement letter so getpos() can fast-move.
const GP_CTRL_RUSH = {
    8: 'h',  // ^H west
    25: 'y', // ^Y northwest
    11: 'k', // ^K north
    21: 'u', // ^U northeast
    12: 'l', // ^L east  (note: ^L is doredraw at top level, but in getpos the
             //           rush binding wins via movecmd() before redraw_cmd())
    14: 'n', // ^N southeast
    10: 'j', // ^J south  (Return / '\n')
    // C ref: sys/share/unixtty.c setftty() — cbreak mode only clears ICANON,
    // leaving ICRNL enabled, so the tty driver maps a raw CR (Enter, 0x0D)
    // to NL (0x0A) before NetHack's readchar() ever sees it.  A recorded
    // '\r' keystroke therefore reaches getpos() as Ctrl-J, i.e. rush south,
    // same as literal '\n'.
    13: 'j', // '\r' (Enter) — tty ICRNL maps it to ^J before the app sees it
    2: 'b',  // ^B southwest
};

// C ref: pager.c self_lookat() — "<race-adj> <pmname> called <plname>" for the
// hero's own square (Sprintf "%s%s%s called %s").  Not Upolyd here, so the race
// adjective (gu.urace.adj) prefixes the role player-monster name (pmname of
// mons[u.umonnum]); the player name in wizard mode displays as "wizard".  The
// role player-monster name is the role title lowercased (knight, wizard, ...).
function self_lookat() {
    const u = game.u || {};
    const rolemnum = u.umonnum ?? game.urole?.mnum;
    const roleDef = roles.find((r) => r.mnum === rolemnum) || {};
    const female = !!game.flags?.female;
    const roleName = (female && roleDef.name?.f) ? roleDef.name.f
                     : (roleDef.name?.m || 'adventurer');
    const pm = String(roleName).toLowerCase();

    const raceName = String(game.initrace || 'human').toLowerCase();
    const raceDef = races.find((r) => (r.name || '').toLowerCase() === raceName)
                    || races[0] || {};
    const raceAdj = raceDef.adj || raceDef.noun || 'human';

    const plname = game.flags?.debug ? 'wizard' : (game.plname || 'Player');
    return `${raceAdj} ${pm} called ${plname}`;
}

// C ref: getpos.c getpos() else-branch — terrain symbol matching (see
// display.js getpos_is_feature_sym/getpos_find_feature for the shared table
// and map scan; factored out there so invent.js's dotravel() getpos() can
// use the same logic without an import cycle through hack.js).

// C ref: include/hack.h distu(x,y) = dist2(x,y,u.ux,u.uy).
function distu(x, y) { return dist2(x, y, game.u.ux, game.u.uy); }

// C ref: pager.c lookat() / do_screen_description() — the (firstmatch)
// description of the terrain shown at <x,y>.  C dispatches on the *displayed*
// glyph (glyph_at(x,y) from gbuf), NOT the underlying levl[x][y].typ, so a cell
// whose true terrain is e.g. a wall but which has never been drawn still reads
// as "unexplored area" (glyph_is_unexplored).  Our display model stores the
// drawn glyph in loc.disp_ch: a cell that was never drawn has disp_ch unset,
// which is C's GLYPH_UNEXPLORED.
function terrain_description(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return 'solid stone';
    // C ref: lookat() glyph_is_unexplored -> "unexplored area".  C dispatches on
    // the displayed glyph (glyph_at, from gbuf), not levl[][].typ.  A cell that
    // the hero has never actually revealed still holds GLYPH_UNEXPLORED in gbuf —
    // even if our display model has painted its (blank/stone) background — so it
    // reads as "unexplored area" regardless of the terrain underneath.  In our
    // model "never revealed" is seenv == 0 with no remembered background glyph;
    // such cells are only ever painted as blank S_stone.
    if (!loc.seenv && loc.remembered_glyph == null) return 'unexplored area';
    const typ = loc.typ;
    // unexplored / never-seen rock reads as solid stone
    if (typ === STONE) {
        return (loc.seenv || loc.disp_ch && loc.disp_ch !== ' ')
            ? 'dark part of a room' : 'solid stone';
    }
    if (IS_WALL(typ)) return 'wall';
    if (typ === DOOR) {
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return 'closed door';
        if (loc.doormask & D_ISOPEN) return 'open door';
        return loc.doormask & D_BROKEN ? 'broken door' : 'doorway';
    }
    if (typ === CORR) return loc.lit ? 'lit corridor' : 'corridor';
    if (typ === ROOM) return loc.lit ? 'floor of a room' : 'dark part of a room';
    if (typ === ICE) return 'ice';
    // C ref: pager.c do_screen_description S_pool/S_water/S_lava/S_lavawall
    // glyph branch -> waterbody_name(x, y), which dispatches on SURFACE_AT (==
    // levl[][].typ for a non-drawbridge cell).  Non-hallucinating names below;
    // the special-level moat variants (medusa "shallow sea", juiblex "swamp",
    // samurai-quest-home "pond") and hallucinated liquids are not modelled.
    if (typ === LAVAPOOL) return 'molten lava';
    if (typ === LAVAWALL) return 'wall of lava';
    if (typ === POOL) return 'pool of water';
    if (typ === MOAT) return 'moat';
    if (typ === WATER)
        return Is_waterlevel(game.u?.uz) ? 'limitless water' : 'wall of water';
    if (typ === STAIRS) return stair_descr(x, y);
    if (typ === FOUNTAIN) return 'fountain';
    return 'floor of a room';
}

// C ref: hack.c is_valid_travelpt() — the hero's own spot is always valid;
// a cell that has never been seen (same "unexplored area" test as
// terrain_description) has no travel path without a search.  The general
// case — findtravelpath(TRAVP_VALID)'s BFS over explored-but-blocked cells
// (closed doors, unreachable rooms) — is not ported; explored cells are
// treated as reachable.
function is_valid_travelpt(x, y) {
    const u = game.u;
    if (u && x === u.ux && y === u.uy) return true;
    const loc = game.level?.at(x, y);
    if (loc && !loc.seenv && loc.remembered_glyph == null) return false;
    return true;
}

// C ref: pager.c lookat() glyph_is_object branch -> look_at_object().  When the
// displayed glyph at <x,y> is a floor object (e.g. a STATUE drawn as the
// petrified monster's class letter), lookat names that object via
// distant_name(otmp, doname) rather than the terrain underneath — so a statue
// of a plains centaur reads "a statue of a plains centaur", not "floor of a
// room".  We mirror C's _map_location object priority: an object is the drawn
// background glyph only when present and not hidden by deep water/lava
// (covers_objects).  A spotted monster on the cell is drawn on top (handled by
// the caller before this, matching lookat's glyph_is_monster precedence), so
// this is only consulted when no monster occupies the displayed glyph.  Returns
// the object's name, or null when no floor object is shown.  look_at_object's
// terrain suffixes (" in water", " embedded in ...") do not apply to a statue
// on ordinary room floor and are omitted.
function look_at_object_here(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return null;
    // C: object only shown (and thus only named) when the cell has been
    // revealed; an unexplored cell reads as "unexplored area" via terrain.
    if (!loc.seenv && loc.remembered_glyph == null) return null;
    if (covers_objects(loc)) return null;
    const obj = vobj_at(x, y);
    if (!obj) return null;
    return obj_doname(obj);
}

// C ref: stairs.c known_branch_stairs() + defsym.h S_upstair/S_dnstair vs
// S_brupstair/S_brdnstair.  A staircase that leads to a different dungeon
// branch and has been traversed by the hero is reported as a "branch
// staircase up/down"; an ordinary staircase is "staircase up/down".  Mirrors
// display.js terrain_glyph(STAIRS) / known_branch_stairs.
function stairway_at_local(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}
function known_branch_stairs_local(sway) {
    return !!(sway && sway.tolev
        && sway.tolev.dnum !== (game.u?.uz?.dnum ?? 0)
        && sway.u_traversed);
}
function stair_descr(x, y) {
    const up = (game.level?.upstair?.x === x && game.level?.upstair?.y === y);
    const sway = stairway_at_local(x, y);
    const branch = known_branch_stairs_local(sway);
    if (branch) return up ? 'branch staircase up' : 'branch staircase down';
    return up ? 'staircase up' : 'staircase down';
}

// C ref: dothrow.c walk_path() — Bresenham line from src to dest, calling
// check() at each intermediate cell; returns false (blocked) at the first
// cell where check() fails.  Used by the jump validity test.
function walk_path(sx, sy, dx0, dy0, check) {
    let dx = dx0 - sx, dy = dy0 - sy;
    let x = sx, y = sy;
    let xchg = dx < 0 ? -1 : 1; if (dx < 0) dx = -dx;
    let ychg = dy < 0 ? -1 : 1; if (dy < 0) dy = -dy;
    let i = 0, err = 0;
    let keep = true;
    if (dx < dy) {
        while (i++ < dy) {
            y += ychg; err += dx << 1;
            if (err > dy) { x += xchg; err -= dy << 1; }
            if (!(keep = check(x, y))) break;
        }
    } else {
        while (i++ < dx) {
            x += xchg; err += dy << 1;
            if (err > dx) { y += ychg; err -= dx << 1; }
            if (!(keep = check(x, y))) break;
        }
    }
    return keep;
}

// C ref: apply.c check_jump() callback — a non-passable cell (wall / closed
// door / boulder) blocks the jump trajectory.  Open-door trajectory rules are
// omitted (no open doors on the owned jump path).
function check_jump(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;
    if (IS_OBSTRUCTED(typ)) return false; // includes walls / stone
    if (typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return false;
    return true;
}

// C ref: apply.c is_valid_jump_pos(x, y, magic=0, showmsg).  Knight (innate
// Jumping only) may jump exactly distu==5, within range, to a visible cell,
// with a clear Bresenham path.  Emits the failure message when showmsg.
async function is_valid_jump_pos(x, y, showmsg) {
    const u = game.u;
    if (distu(x, y) !== 5) {
        if (showmsg) { game._pending_message = 'Illegal move!'; }
        return false;
    }
    if (distu(x, y) > 9) {
        if (showmsg) { game._pending_message = 'Too far!'; }
        return false;
    }
    if (!isok(x, y)) {
        if (showmsg) { game._pending_message = 'You cannot jump there!'; }
        return false;
    }
    // cansee check omitted (targets on the recorded path are all seen)
    if (!walk_path(u.ux, u.uy, x, y, check_jump)) {
        if (showmsg) { game._pending_message = 'There is an obstacle preventing that jump.'; }
        return false;
    }
    return true;
}

// C ref: apply.c get_valid_jump_position() — used by getpos autodescribe to
// flag "(invalid target)".
function get_valid_jump_position(x, y) {
    const loc = game.level?.at(x, y);
    if (!isok(x, y) || !loc) return false;
    if (!(loc.typ >= DOOR)) return false; // ACCESSIBLE(typ) == typ >= DOOR
    return distu(x, y) === 5 && distu(x, y) <= 9 && walk_path(game.u.ux, game.u.uy, x, y, check_jump);
}

// C ref: getpos.c getpos() — the first targeting frame's terminal cursor.
// jump() calls getpos_sethilite(display_jump_positions, get_valid_jump_position)
// before getpos().  getpos_sethilite -> selection_force_newsyms(sel) calls
// newsym_force(x,y) on every valid jump position, marking those gbuf cells
// gnew.  getpos()'s opening "curs(WIN_MAP, u.ux,u.uy); flush_screen(0)" then
// REDRAWS each gnew cell in flush_screen's row-major order (y ascending, then
// x ascending), and because flush_screen(0) does not re-home the cursor on the
// hero, the tty cursor is left one past the LAST redrawn glyph — i.e. on the
// highest-row, then highest-column valid jump position.  A drawn glyph at map
// (gx,gy) leaves the tty cursor at column gx, row gy+1 (curx is incremented
// past the glyph; map row gy maps to screen row gy+1).  This affects only the
// first frame; once a key is read, the gnew flags are cleared and the cursor
// tracks the logical targeting position normally.
// Returns the recorded terminal cursor [col,row] for that first frame, or null
// when there are no valid jump positions (then the cursor stays on the hero).
function jump_hilite_first_cursor() {
    const u = game.u;
    let gx = -1, gy = -1;
    // display_jump_positions scans dx,dy in -4..4; the valid set is identical
    // to the cells selection_force_newsyms marks gnew.  We want flush_screen's
    // draw order (row-major: greatest y wins, then greatest x).
    for (let y = u.uy - 4; y <= u.uy + 4; y++) {
        for (let x = u.ux - 4; x <= u.ux + 4; x++) {
            if (!isok(x, y)) continue;
            if (x === u.ux && y === u.uy) continue;
            if (!get_valid_jump_position(x, y)) continue;
            // row-major last: y is the dominant key (>=), x the tiebreak (>=)
            if (y > gy || (y === gy && x > gx)) { gx = x; gy = y; }
        }
    }
    if (gx < 0) return null;
    // glyph-drawn cursor convention: column = map x, row = map y + 1.
    return [gx, gy + 1];
}

// C ref: apply.c jump() tail -> dothrow.c walk_path(hurtle_jump) + teleport.c
// teleds(cc, TELEDS_NO_FLAGS) + nomul(-1) + morehungry(rnd(25)).
// For the recorded knight (unpunished, not swallowed/trapped, jumping over open
// floor) hurtle_step / teleds consume no RNG: the only RNG draw is the trailing
// morehungry(rnd(25)).  teleds for this hero reduces to relocating <u.ux,u.uy>,
// redrawing the vacated and new cells, and forcing a full vision recalc so the
// landing room is revealed.  The monster turn (mcalcmove &c.) is driven by the
// move loop after dojump() returns ECMD_TIME.
function jump_landing(nux, nuy) {
    const u = game.u;
    const ux0 = u.ux, uy0 = u.uy;

    // u_on_newpos(nux, nuy): set the hero's new position.
    u.ux = nux;
    u.uy = nuy;
    u.ux0 = ux0;
    u.uy0 = uy0;
    u.umoved = true; // the hero relocated this command

    // teleds: newsym(u.ux0,u.uy0) clears the vacated tile; newsym(new) draws the
    // hero; vision_full_recalc forces the move loop's vision_recalc to reveal
    // the landing room (see_monsters runs as part of the recalc/redraw).
    newsym(ux0, uy0);
    newsym(nux, nuy);
    game.vision_full_recalc = 1;
    vision_recalc(0);

    // C ref: apply.c jump() tail — nomul(-1) makes the hero helpless ("jumping
    // around") for one turn; the moveloop then runs that turn fully without the
    // hero acting, so a Fast hero's leftover movement is not spent as a free
    // action immediately after the jump.
    nomul(-1);

    // morehungry(rnd(25)) — roll first (argument evaluation), then apply.
    // newuhs() is RNG-inert while the hero stays NOT_HUNGRY/SATIATED (uhunger
    // far above the WEAK/FAINTING thresholds), and prints no status message.
    const num = rnd(25);
    u.uhunger = (u.uhunger ?? 900) - num;
}

// Render the farlook/getpos frame: base map + status (already on the grid via
// flush_screen) with the message line set and the cursor on the map at the
// targeting location <cx,cy> (display column cx-1, row cy+1).
async function getpos_render(message, cx, cy) {
    game._pending_message = message || '';
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
}

// C ref: getpos.c getpos(ccp, force, goal) — cursor-positioning loop.  The loop
// structure mirrors C: at the top of each iteration auto_describe() refreshes
// the message line for the current cursor cell whenever a message hasn't just
// been "given"; then a key is read and dispatched.
//   - lowercase hjkl/diagonals move the cursor one step (MV_WALK);
//   - capital HJKL.. / a 'G'/'g' prefix / a Ctrl-<dir> key fast-move (×8);
//   - '.'/','/';'/':' pick the spot and return it;
//   - '@' (NHKF_GETPOS_SELF) snaps the cursor back to the hero;
//   - ESC cancels (returns null);
//   - a key that matches a never-present cmap feature symbol => "Can't find
//     dungeon feature '%c'."; any other key => "Unknown direction: ..." (when
//     `force`) or "Done." + return null (when !force).
// `validfn(x,y)` flags invalid targets with a "(invalid target)" suffix.
// `force` selects the wizard-teleport / #jump behavior (unknown keys keep the
// loop alive) vs the ';' farlook behavior (unknown keys finish).
async function getpos(goalText, startx, starty, validfn, force = false, verbose = false, travelMode = false, detectMode = false) {
    const u = game.u;
    let cx = startx, cy = starty;

    // C getpos.c:838 handle_tip(TIP_GETPOS): in verbose mode a "Please move the
    // cursor to ..." topline is still pending (NEED_MORE) when getpos starts.
    // Raising the first-use tip text window forces that line to be acknowledged
    // with --More-- before the tip is drawn; fire it here so the order is
    // "Please move...--More--" (step) then the tip (step).  When the tip was
    // already shown, the pending line is instead flushed by the following
    // update_topl("(For instructions...)") call.
    const TIP_GETPOS_BIT = 1 << 4;
    const willShowTip = !((game.context.tips || 0) & TIP_GETPOS_BIT);
    if (verbose && willShowTip && game._toplin === 1) {
        await topl_more();
        game._toplin = 0;
        game._pending_message = '';
    }

    const tipShown = await getpos_tip();
    let showGoal = tipShown;
    let mult = 1;
    let msgGiven = true; // C: msg_given defaults TRUE (clear message window)

    // C getpos.c:840 — flags.verbose => pline("(For instructions type a '?')").
    // This message overwrites whatever is on the top line; if the tip was NOT
    // shown (so a verbose "Please move..." is still pending) it fires that
    // line's --More-- first.  When the tip WAS shown, show_goal_msg is set and
    // the loop's "Move cursor to ...:" pline (also routed through update_topl)
    // is what acknowledges this "(For instructions...)" line.
    if (verbose) {
        await update_topl(`(For instructions type a '?')`);
        msgGiven = true;
        if (!showGoal) {
            // No goal message will be drawn; render the verbose line now so the
            // first readchar's capture shows it (cursor parked on the hero).
            await flush_screen(1);
            const disp = game.nhDisplay;
            if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
        }
    }

    // C: auto_describe(cx,cy) — message for the current cell (self or terrain),
    // with the optional "(invalid target)" suffix from getpos_getvalid.
    const describe = (x, y) => {
        let desc;
        if (u && x === u.ux && y === u.uy) {
            desc = self_lookat();
        } else if (detectMode) {
            // C ref: pager.c do_screen_description(), reached via 'need_to_look'
            // once a monster's class symbol matches: falls through to lookat()'s
            // look_at_monster() for the full tame/peaceful-prefixed identity
            // (matches auto_describe's actual observed output — a named/peaceful
            // shopkeeper reads "peaceful Adjama", not a generic class string).
            // A non-monster cell always reads as the freshly-cls()'d blank glyph
            // (GLYPH_UNEXPLORED — monster_detect's repaint doesn't touch the
            // hero's remembered terrain, only the live display buffer), i.e.
            // "unexplored area" regardless of what's actually there.
            const mtmp = m_at(x, y);
            desc = mtmp ? look_at_monster_desc(mtmp) : 'unexplored area';
        } else {
            // C ref: pager.c lookat() dispatch — when the cell's displayed glyph
            // is a floor object (e.g. a STATUE drawn as the petrified monster's
            // class letter) and no spotted monster is drawn on top, lookat names
            // the object via look_at_object() instead of the terrain underneath.
            const mtmp = m_at(x, y);
            const objname = (mtmp && canspotmon(mtmp)) ? null : look_at_object_here(x, y);
            desc = objname || terrain_description(x, y);
        }
        if (validfn && !validfn(x, y)) desc += ' (invalid target)';
        if (travelMode && !is_valid_travelpt(x, y)) desc += ' (no travel path)';
        return desc;
    };

    for (;;) {
        if (showGoal) {
            // C getpos.c:863 pline("Move cursor to %s:", goal).  In verbose mode
            // route through update_topl so the pending "(For instructions...)"
            // line is acknowledged with its --More-- frame first.
            if (verbose) {
                await update_topl(`Move cursor to ${goalText}:`);
                await flush_screen(1);
                const disp = game.nhDisplay;
                if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
            } else {
                await getpos_render(`Move cursor to ${goalText}:`, cx, cy);
            }
            showGoal = false;
        } else if (!msgGiven) {
            // C getpos.c:865 auto_describe(cx, cy) at top of loop.
            await getpos_render(describe(cx, cy), cx, cy);
        }
        const k = await nhgetch();
        const ch = String.fromCharCode(k);
        // C topl.c — reading a key acknowledges any pending NEED_MORE topline,
        // so subsequent autodescribe plines overwrite without a new --More--.
        game._toplin = 0;
        msgGiven = false; // C getpos.c:889 — autodescribe clears msg_given

        if (k === 27) { // ESC: cancel
            // C getpos.c:894 sets msg_given=TRUE on ESC, so exitgetpos clears
            // WIN_MESSAGE (clear_nhwindow).  Blank the top line accordingly.
            game._pending_message = '';
            return null;
        }
        if (ch === 'G' || ch === 'g') { mult = 8; continue; } // rush/run prefix
        const ldir = GP_CTRL_RUSH[k] || ch.toLowerCase();
        const isRush = ('HJKLYUBN'.includes(ch) || GP_CTRL_RUSH[k] !== undefined);
        if (GP_DX[ldir] !== undefined) {
            // capital letters / Ctrl-dir / 'G'/'g' prefix rush (×8)
            const step = (isRush ? 8 : mult);
            mult = 1;
            let nx = cx + GP_DX[ldir] * step, ny = cy + GP_DY[ldir] * step;
            // truncate_to_map: clamp into the playable map bounds
            if (nx < 1) nx = 1; if (nx > COLNO - 1) nx = COLNO - 1;
            if (ny < 0) ny = 0; if (ny > ROWNO - 1) ny = ROWNO - 1;
            cx = nx; cy = ny;
            continue; // C: goto nxtc; auto_describe runs at top of next loop
        }
        if (ch === '.' || ch === ',' || ch === ';' || ch === ':') {
            return { x: cx, y: cy }; // pick_chars
        }
        if (ch === '@') { // NHKF_GETPOS_SELF: snap cursor to hero
            if (u) { cx = u.ux; cy = u.uy; }
            continue; // auto_describe self at top of next loop
        }
        // C getpos.c:1039 else-branch: not move/pick/special.
        const isQuit = (ch === ' ' || ch === '\r' || ch === '\n' || k === 27);
        if (!isQuit) {
            if (getpos_is_feature_sym(ch)) {
                // matched a cmap feature symbol: scan the map for it first.
                const found = getpos_find_feature(ch, cx, cy);
                if (found) {
                    cx = found.x; cy = found.y;
                    continue; // silent jump; auto_describe fires next loop
                }
                await getpos_render(`Can't find dungeon feature '${ch}'.`, cx, cy);
                msgGiven = true;
                continue;
            }
            // k == 0 (no symbol match): "Unknown direction".
            const note = force
                ? "use 'h', 'j', 'k', 'l' or '.'"
                : 'aborted';
            await getpos_render(`Unknown direction: '${visctrl_key(k)}' (${note}).`, cx, cy);
            msgGiven = true;
        }
        if (force) continue; // C: stay in the loop
        if (isQuit) {
            // space / return at top level in !force getpos => "Done.", finish.
            await getpos_render('Done.', cx, cy);
            return null;
        }
        // !force after "Unknown direction": C prints "Done." and returns.
        await getpos_render('Done.', cx, cy);
        return null;
    }
}

// C ref: cmd.c visctrl() — printable rendering of a control character for the
// "Unknown direction: '%s'" message (^X form).  Plain printables pass through.
function visctrl_key(k) {
    if (k < 32) return '^' + String.fromCharCode(k + 64);
    if (k === 127) return '^?';
    return String.fromCharCode(k);
}

// C ref: pager.c do_look(mode=1) reached by the ';' "glance" command.  A quick
// farlook: prompt, getpos() to choose a cell, then describe what is there on
// the top line.  Read-only — no game time passes (context.move stays 0).
export async function do_farlook() {
    const u = game.u;
    // C: flags.verbose is off in our rc-less default, and quick suppresses the
    // verbose form, so the prompt is "Pick <what>." (custompline NHKF path).
    const WHAT = 'a monster, object or location';
    game._pending_message = `Pick ${WHAT}.`;
    await flush_screen(1);

    const cc = await getpos(WHAT, u.ux, u.uy, null);
    if (!cc) { game.context.move = 0; return; }

    // do_screen_description: describe the chosen cell.  Monster/object naming
    // is not modelled here; the terrain description covers the recorded cases.
    const mtmp = m_at(cc.x, cc.y);
    let desc;
    if (mtmp && canspotmon(mtmp)) {
        desc = mtmp.data?.mname || mtmp.data?.pmname || 'a monster';
    } else {
        desc = terrain_description(cc.x, cc.y);
    }
    game._pending_message = desc;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(cc.x - 1, cc.y + 1);
    game.context.move = 0;
}

// ── #terrain command — cmd.c doterrain() / detect.c reveal_terrain() ───────
//
// The #terrain command (default-bound to <del> / '\177') shows the known map
// with monsters, objects and traps stripped so the underlying terrain is
// visible, then lets the player browse it with getpos()'s autodescribe cursor.
// In normal play (not explore/wizard mode) it first offers a three-entry
// "View which?" PICK_ONE menu whose first item (bare terrain) is preselected.

// TER_* subset bits (detect.c / include/hack.h).
const TER_MAP = 0x01, TER_TRP = 0x02, TER_OBJ = 0x04;

// The three normal-play "View which?" entries; 'a' is the preselected default
// (rendered with a '*' marker instead of the '-' of the unselected entries).
const TERRAIN_MENU_ITEMS = [
    { ch: 'a', sel: true,  desc: 'known map without monsters, objects, and traps' },
    { ch: 'b', sel: false, desc: 'known map without monsters and objects' },
    { ch: 'c', sel: false, desc: 'known map without monsters' },
];

// Render the "View which?" PICK_ONE menu as a tty corner overlay (the map
// shows through the columns left of offx).  Mirrors render_whatis_menu /
// process_menu_window: title (inverse) on row 0, a blank separator, the item
// lines, then the "(end)" morestr with the cursor parked after it.  A selected
// PICK_ONE default renders its marker column as '*' (tty tty_print_glyph:
// n==2 && selected => '*').
function render_terrain_menu() {
    const disp = game.nhDisplay;
    if (!disp?.setCell) return;
    const cols = disp.cols || 80;

    const lines = [];
    lines.push({ text: 'View which?', attr: ATR_INVERSE });
    lines.push({ text: '' });
    for (const it of TERRAIN_MENU_ITEMS)
        lines.push({ text: `${it.ch} ${it.sel ? '*' : '-'} ${it.desc}` });

    let maxcols = 0;
    for (const l of lines) maxcols = Math.max(maxcols, l.text.length + 2);

    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcols - 1);
    if (offx < 0) offx = 0;
    const textCol = offx + 1;

    const blankCols = (row) => {
        for (let c = offx; c < cols; c++) disp.setCell(c, row, ' ', NO_COLOR, 0);
    };
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0);

    for (let i = 0; i < lines.length; i++) {
        blankCols(i);
        if (lines[i].text) disp.putstr(textCol, i, lines[i].text, NO_COLOR, lines[i].attr || 0);
    }
    const moreRow = lines.length;
    blankCols(moreRow);
    disp.putstr(textCol, moreRow, '(end)', NO_COLOR, 0);
    disp.setCursor(textCol + 6, moreRow);
}

// Display the "View which?" menu and read a PICK_ONE selection.  Returns the
// chosen a_int (1..3), or -1 if cancelled.  C select_menu(PICK_ONE): a
// <space>/<return> confirms the preselected entry (n==1 => which==1); a direct
// accelerator picks that entry; ESC cancels.
async function terrain_menu() {
    render_terrain_menu();
    for (;;) {
        const k = await nhgetch();
        if (k === 27) return -1;                        // ESC: cancel
        if (k === 32 || k === 13 || k === 10) return 1; // confirm preselected
        const ch = String.fromCharCode(k);
        if (ch === 'a') return 1;
        if (ch === 'b') return 2;
        if (ch === 'c') return 3;
        // invalid key: PICK_ONE stays open (the menu is still on the grid).
    }
}

// C ref: cmd.c doterrain().  recalc_mapseen() has no display effect for our
// model, so it is skipped; the normal-play menu selects a TER_* subset and
// hands off to reveal_terrain().  Returns ECMD_OK (no game time).
export async function doterrain() {
    const which = await terrain_menu();
    if (which < 0) return 0; // ESC-cancelled: no display change
    let subset = TER_MAP;
    if (which === 2) subset = TER_MAP | TER_TRP;
    else if (which === 3) subset = TER_MAP | TER_TRP | TER_OBJ;
    await reveal_terrain(subset);
    return 0;
}

// C ref: detect.c reveal_terrain(which_subset).  Redraw the known map with
// monsters (and, per subset, objects/traps) stripped so the underlying terrain
// shows through, pline the "Showing ... only..." banner, then browse the result
// with getpos()'s autodescribe.  Afterwards map_redisplay() restores the real
// map; docrt()'s internal cls() flushes WIN_MESSAGE (firing --More-- for any
// still-pending topline such as getpos's "Done.").
export async function reveal_terrain(which_subset) {
    const u = game.u;
    // C: (Hallucination || Stunned || Confusion) && !full => "You are too
    // disoriented for this."  None of the recorded uses are impaired, so the
    // normal branch is the only one modelled.
    const keep_traps = (which_subset & TER_TRP) !== 0;
    const keep_objs = (which_subset & TER_OBJ) !== 0;

    // Paint the terrain-only glyph for every cell into the display buffer.
    // C reveal_terrain_getglyph strips monsters/objects from the remembered
    // glyph and normalizes S_darkroom->S_room and S_litcorr->S_corr; for the
    // exercised TER_MAP subset this reduces to the bare remembered terrain
    // background of each seen cell (unseen cells show default_glyph = S_stone).
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            const isHero = u && x === u.ux && y === u.uy;
            if (!loc.remembered_glyph && !isHero) {
                show_glyph_cell(x, y, ' ', NO_COLOR, false); // never-seen: blank
                continue;
            }
            const bg = terrain_background_glyph(loc, x, y);
            let color = bg.color;
            // S_litcorr -> S_corr: a lit corridor ('#', CLR_WHITE) drops to the
            // plain corridor color in the terrain view.
            if (bg.ch === '#' && color === CLR_WHITE) color = NO_COLOR;
            show_glyph_cell(x, y, bg.ch, color, bg.dec);
        }
    }
    await flush_screen(1);

    // C: Strcpy(buf, "known terrain"); + keep_* suffixes.  Only "known terrain"
    // is exercised, but build the suffixes faithfully for generalization.
    let buf = 'known terrain';
    if (keep_traps) buf += keep_objs ? ', traps' : ' and traps';
    if (keep_objs) buf += keep_traps ? ', and objects' : ' and objects';
    // pline("Showing %s only...", buf) — leaves the topline NEED_MORE; getpos's
    // first-use tip flushes it with --More-- before drawing the tip window.
    await getpos_render(`Showing ${buf} only...`, u.ux, u.uy);
    game._toplin = 1;
    game._toplines = `Showing ${buf} only...`;

    // browse_map(which_subset, "anything of interest") = getpos autodescribe,
    // force=FALSE, flags.verbose (default on) => the verbose cursor prompt.
    const verbose = game.flags?.verbose !== false;
    await getpos('anything of interest', u.ux, u.uy, null, /*force=*/false, verbose);

    // map_redisplay(): docrt() redraws the real map.  cls() inside docrt calls
    // display_nhwindow(WIN_MESSAGE,...) which fires more() when the topline is
    // still NEED_MORE (getpos left "Done." pending after a <space> quit).
    if (game._pending_message) {
        await topl_more();
        game._pending_message = '';
        game._toplin = 0;
    }
    await docrt();
    await flush_screen(1);
}

// C ref: detect.c monster_detect(otmp, mclass) — crystal ball / fountain /
// potion "sense the presence of monsters" effect.  Only the otmp==null,
// mclass==0 case (the fountain's "See Monsters" quaff outcome) is reached;
// the crystal-ball class filter and the cursed-item wake-helpless branch are
// not modelled.  cls()+unconstrain_map() reduce, for our display model, to
// blanking every map cell before drawing just the detected monsters (their
// ordinary class glyph/color — mon_to_glyph/pet_to_glyph render identically
// on a plain terminal) plus the hero's own glyph (display_self(), hero is
// never swallowed here).  Since otmp is always null, the blessed "persistent
// detection" branch never applies; browse_map(TER_DETECT|TER_MON, "monster of
// interest") always runs, then map_redisplay() (docrt) restores the real map.
export async function monster_detect(otmp, mclass) {
    const u = game.u;
    const mons = (game.level?.monsters || []).filter(
        (m) => !(m.mhp != null && m.mhp <= 0));
    if (!mons.length) {
        await update_topl('You feel threatened.');
        return true;
    }

    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            show_glyph_cell(x, y, ' ', NO_COLOR, false);
    for (const m of mons) {
        // C ref: mon_to_glyph/pet_to_glyph(mon) = what_mon(monsndx(mon->data)) —
        // detection dispatches on the monster's own species, NOT its display
        // glyph (unlike a normal map draw, which shows a mimic's disguise via
        // monster_glyph()'s m_ap_type check): detecting a mimic reveals its
        // true class letter.
        const d = m.data || {};
        if (mclass && d.mlet !== mclass) continue;
        show_glyph_cell(m.mx, m.my, d.mlet || '?',
            (d.mcolor != null) ? d.mcolor : NO_COLOR, false);
    }
    if (u?.ux > 0) show_glyph_cell(u.ux, u.uy, '@', CLR_WHITE, false);
    await flush_screen(1);

    await update_topl('You sense the presence of monsters.');

    const verbose = game.flags?.verbose !== false;
    await getpos('monster of interest', u.ux, u.uy, null, /*force=*/false,
                 verbose, /*travelMode=*/false, /*detectMode=*/true);

    if (game._pending_message) {
        await topl_more();
        game._pending_message = '';
        game._toplin = 0;
    }
    await docrt();
    await flush_screen(1);
    return false;
}

// ── '/' whatis command — pager.c do_look(mode=0) ──────────────────────────
//
// The full "whatis" command first presents the "What do you want to look at:"
// PICK_ONE menu, then dispatches the chosen sub-mode.  The recorded wizard
// session exercises the '/' (something on the map) branch, which runs the
// verbose-prompt farlook cursor loop (getpos with verbose=true) and, after
// LOOK_TRADITIONAL ('.') picks a square, prints the full screen description
// and offers the data-file "More info about ..." query before looping back.
//
// C ref: pager.c do_look() + win/tty/wintty.c process_menu_window.

// The whatis menu entries in the !lootabc default ordering.  A blank marker
// reproduces the add_menu_str(win, "") separator after the first three items
// (only present when !u.uswallow && !Hallucination, the recorded state).
const WHATIS_ITEMS = [
    { ch: '/', desc: 'something on the map' },
    { ch: 'i', desc: "something you're carrying" },
    { ch: '?', desc: 'something else (by symbol or name)' },
    { blank: true },
    { ch: 'm', desc: 'nearby monsters' },
    { ch: 'M', desc: 'all monsters shown on map' },
    { ch: 'o', desc: 'nearby objects' },
    { ch: 'O', desc: 'all objects shown on map' },
    { ch: 't', desc: 'nearby traps' },
    { ch: 'T', desc: 'all seen or remembered traps' },
    { ch: 'e', desc: 'nearby engravings' },
    { ch: 'E', desc: 'all seen or remembered engravings' },
];

// Render the whatis PICK_ONE menu as a tty corner overlay (the map shows
// through on the left of offx).  Mirrors render_corner_menu in
// extcmd-handlers.js / process_menu_window: title (inverse) on row 0, a blank
// separator, the "<accel> - <text>" item lines (and the mid-list blank), then
// the "(end)" morestr with the cursor parked after it.
function render_whatis_menu() {
    const disp = game.nhDisplay;
    if (!disp?.setCell) return;
    const cols = disp.cols || 80;

    const lines = [];
    lines.push({ text: 'What do you want to look at:', attr: ATR_INVERSE });
    lines.push({ text: '' });
    for (const it of WHATIS_ITEMS) {
        lines.push({ text: it.blank ? '' : `${it.ch} - ${it.desc}` });
    }

    let maxcols = 0;
    for (const l of lines) maxcols = Math.max(maxcols, l.text.length + 2);

    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcols - 1);
    if (offx < 0) offx = 0;
    const textCol = offx + 1;

    const blankCols = (row) => {
        for (let c = offx; c < cols; c++) disp.setCell(c, row, ' ', NO_COLOR, 0);
    };
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0);

    for (let i = 0; i < lines.length; i++) {
        blankCols(i);
        if (lines[i].text) disp.putstr(textCol, i, lines[i].text, NO_COLOR, lines[i].attr || 0);
    }
    const moreRow = lines.length;
    blankCols(moreRow);
    disp.putstr(textCol, moreRow, '(end)', NO_COLOR, 0);
    disp.setCursor(textCol + 6, moreRow);
}

// C ref: pager.c do_screen_description() (the looked==TRUE path).  Build the
// "<glyph><8 spaces><an(explain)>[ or ...] (<lookat firstmatch>)" string that
// the '.'/',' pick reports on the top line, and the count of cmap/monster
// matches (found).  Returns { text, firstmatch, found }.
//   - hero '@'  => found 1, "a human or elf (<self>)"
//   - upstairs  => found 2, "a staircase up or a branch staircase up (...)"
// Other squares reduce to the single terrain_description noun.
// The displayed glyph char at <x,y> (DEC-mapped to the Unicode form the
// recorder/decoder compares against), for the do_screen_description prefix.
function look_prefix_char(loc) {
    if (!loc || !loc.disp_ch) return '.';
    return loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch)
                           : loc.disp_ch;
}

function look_pick_description(x, y) {
    const u = game.u;
    if (u && x === u.ux && y === u.uy) {
        // '@' matches S_HUMAN ("human or elf"); need_to_look => lookat() appends
        // " (<self_lookat>)".  firstmatch becomes the self_lookat string.
        const self = self_lookat();
        return {
            text: `@        a human or elf (${self})`,
            firstmatch: self,
            found: 1,
        };
    }
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    const prefix = `${look_prefix_char(loc)}        `;

    if (typ === STAIRS) {
        // '<'/'>': the cmap loop matches BOTH the ordinary stair and the branch
        // stair (same symbol).  lookat() then appends the actual glyph's
        // description (the branch form when known).  C: do_screen_description.
        const up = (game.level?.upstair?.x === x && game.level?.upstair?.y === y);
        const ordinary = up ? 'staircase up' : 'staircase down';
        const branch = up ? 'branch staircase up' : 'branch staircase down';
        const isBranch = known_branch_stairs_local(stairway_at_local(x, y));
        const look = isBranch ? branch : ordinary;
        return {
            text: `${prefix}${an(ordinary)} or ${an(branch)} (${look})`,
            firstmatch: look,
            found: 1, // 2 cmap matches -> lookat sets found=1
        };
    }

    // C ref: do_screen_description cmap loop — squares whose display symbol is
    // shared by several cmap entries enumerate them all with " or ".  The DEC
    // floor symbol '~' ('.' in ASCII) is shared by S_ndoor/S_room/S_darkroom/
    // S_ice; the corridor '#' is shared by enough entries to read "can be many
    // things" (found>4).  lookat() then appends the actual terrain noun.
    if (typ === ROOM || typ === ICE
        || (typ === DOOR && !(loc.doormask & (D_CLOSED | D_LOCKED | D_ISOPEN)))) {
        // doorway / floor / dark room / ice all share the '.'/'~' symbol.
        const look = terrain_description(x, y);
        return {
            text: `${prefix}a doorway or the floor of a room or the dark part of a room or ice (${look})`,
            firstmatch: look,
            found: 1,
        };
    }
    if (typ === CORR) {
        // '#' matches many cmap entries (>4) -> "can be many things".
        const look = terrain_description(x, y);
        return {
            text: `${prefix}can be many things (${look})`,
            firstmatch: look,
            found: 1,
        };
    }

    // Fallback: single terrain description with the cmap symbol prefix.
    const desc = terrain_description(x, y);
    return { text: `${prefix}${an(desc)}`, firstmatch: desc, found: 1 };
}

// C ref: hacklib.c an() — prepend the indefinite article to a noun.
function an(s) {
    if (!s) return s;
    const c = s[0].toLowerCase();
    // a few words take no/"the" article in NetHack's an(); the recorded cases
    // ("human or elf", terrain nouns) all use simple a/an rules.
    if ('aeiou'.includes(c)) return `an ${s}`;
    return `a ${s}`;
}

// C ref: pager.c checkfile() — derive the data-file lookup key from the lookat
// firstmatch: strip a leading article and truncate at " called "/" named "/", "
// (the " (...)" charge/quantity stripping is not needed for these keys).
function dbase_key(firstmatch) {
    let key = String(firstmatch || '').toLowerCase();
    key = key.replace(/^(a |an |the |some )/, '');
    const cut = key.search(/ called | named |, /);
    if (cut >= 0) key = key.slice(0, cut);
    return key;
}

// C ref: pager.c checkfile() data.base scan — the "More info about ..." query
// is only offered when the lookup key matches an entry in dat/data.base.  The
// data file is not shipped with the port, so the terrain/feature/self keys the
// whatis ('/') picks can produce are matched against the relevant data.base
// entry patterns here (globs taken verbatim from dat/data.base):
//   "* wizard"/"wizard" (human wizard), "branch stair*", "stair*",
//   "doorway", "fountain", "ice" — present;
//   "floor of a room", "dark part of a room", "corridor", "wall",
//   "staircase"-without-direction — absent.
function dbase_has_entry(key) {
    if (!key) return false;
    if (/ wizard$/.test(key) || key === 'wizard') return true;
    if (key.startsWith('branch stair')) return true;
    if (key.startsWith('stair')) return true;       // "stair*"
    if (key === 'doorway') return true;
    if (key === 'fountain') return true;
    if (key === 'ice') return true;
    return false;
}

// C ref: pager.c checkfile() — offer "More info about \"<key>\"?" (y_n) when the
// key exists in data.base.  The recorded session always answers 'n', so no data
// is displayed.  Returns true if the prompt was shown (a key was read).
async function checkfile_moreinfo(firstmatch) {
    const key = dbase_key(firstmatch);
    if (!key || !dbase_has_entry(key)) return false;
    // y_n shows the description's --More-- first (set before this call).
    await y_n(`More info about "${key}"?`, 'yn\x1b', 'n');
    return true;
}

// ── data.base lookup (pager.c checkfile) ──────────────────────────────────
//
// The typed ('?') and carried-item ('i') whatis picks look their target up in
// dat/data.base and, when found, display the entry in a window.  Both pass
// chkfilUsrTyped|chkfilDontAsk, so checkfile shows the entry directly (no
// "More info about ...?" y/n gate).  The compiled 'data' index/text is bundled
// in data_base_data.js.  (The '/' map-pick path keeps its own light-weight
// checkfile_moreinfo above, which only offers the y/n query.)

// C ref: strutil.c pmatch() — case-sensitive wildcard match: '*' matches zero
// or more characters, '?' matches exactly one (non-empty) character.  data.base
// keys are lowercase and checkfile lowercases the lookup string, so the
// case-sensitive form suffices.
function db_pmatch(patrn, strng) {
    let pi = 0, si = 0, star = -1, ss = 0;
    const pl = patrn.length, sl = strng.length;
    while (si < sl) {
        if (pi < pl && (patrn[pi] === '?' || patrn[pi] === strng[si])) {
            pi++; si++;
        } else if (pi < pl && patrn[pi] === '*') {
            star = pi++; ss = si;
        } else if (star !== -1) {
            pi = star + 1; si = ++ss;
        } else {
            return false;
        }
    }
    while (pi < pl && patrn[pi] === '*') pi++;
    return pi === pl;
}

// C ref: hacklib.c tabexpand() — expand tabs to spaces on 8-column stops.
function db_tabexpand(sbuf) {
    let out = '', idx = 0;
    for (let k = 0; k < sbuf.length; k++) {
        const c = sbuf[k];
        if (c === '\t') {
            do { out += ' '; } while (++idx % 8);
        } else {
            out += c; ++idx;
        }
    }
    return out;
}

// C ref: objnam.c makesingular() — de-pluralize a noun for the data.base
// lookup's alternate key.  Partial faithful port: handles compound phrases
// ("<foo> of <bar>" -> singularize <foo>), the -s/-es/-ies/-ves trailing rules
// and -men -> -man; other words (incl. anything that isn't a recognizable
// plural) are returned unchanged.  Used only by the new checkfile path.
const DB_VOWELS = 'aeiou';
function db_makesingular(oldstr) {
    let s = String(oldstr || '');
    s = s.replace(/^ +/, '');
    if (!s) return '';
    // compound "foo of bar": operate on the head, restore the tail afterwards.
    const compounds = [' of ', ' labeled ', ' called ', ' named ', ' above',
        ' versus ', ' from ', ' in ', ' on ', ' a la ', ' with', ' de ',
        " d'", ' du ', ' au ', '-in-', '-at-'];
    let head = s, excess = '';
    {
        const low = s.toLowerCase();
        let cut = -1;
        for (let p = 0; p < s.length; p++) {
            if (s[p] !== ' ' && s[p] !== '-') continue;
            for (const cmpd of compounds) {
                if (low.startsWith(cmpd, p)) { cut = p; break; }
            }
            if (cut >= 0) break;
        }
        if (cut >= 0) { head = s.slice(0, cut); excess = s.slice(cut); }
    }
    const bp = head;
    const low = bp.toLowerCase();
    const n = bp.length;
    const ends = (suf) => low.endsWith(suf);
    let res = bp;
    if (n >= 1 && low[n - 1] === 's') {
        if (n >= 2 && low[n - 2] === 'e') {
            if (n >= 3 && low[n - 3] === 'i') { /* "ies" */
                if (ends('cookies') || (ends('pies') && (n === 4 || low[n - 5] === ' '))
                    || (ends('genies') && (n === 6 || low[n - 7] === ' '))
                    || ends('mbies') || ends('yries')) {
                    res = bp.slice(0, n - 1); /* drop s */
                } else {
                    res = bp.slice(0, n - 3) + 'y'; /* ies -> y */
                }
            } else if (n >= 4 && (('lr'.includes(low[n - 4]) || DB_VOWELS.includes(low[n - 4]))
                       && ends('ves'))) {
                if (ends('cloves') || ends('nerves')) res = bp.slice(0, n - 1);
                else res = bp.slice(0, n - 3) + 'f'; /* ves -> f */
            } else if (ends('eses') || ends('oxes') || ends('nxes') || ends('ches')
                       || ends('uses') || ends('shes') || ends('sses')
                       || ends('atoes') || ends('dingoes') || ends('aleaxes')) {
                res = bp.slice(0, n - 2); /* drop es */
            } else {
                res = bp.slice(0, n - 1); /* drop s */
            }
        } else if (ends('us')) { /* lotus, fungus... */
            if (!ends('tengus') && !ends('hezrous')) res = bp.slice(0, n - 1);
            /* else keep (tengus/hezrous) */
            else res = bp;
        } else if (ends('ss') || ends(' lens') || low === 'lens') {
            res = bp; /* keep */
        } else {
            res = bp.slice(0, n - 1); /* drop s */
        }
    } else { /* doesn't end in 's' */
        if (ends('men')) res = bp.slice(0, n - 2) + 'an';
        else res = bp;
    }
    return res + excess;
}

// C ref: pager.c checkfile() index scan — walk the data.base entries in file
// order.  Within an entry's key group a positive pmatch wins immediately; a
// '~'-prefixed key that matches excludes the whole entry (skip to the next).
// Returns { off, lines } of the first matching entry, or null.
function db_find_entry(target) {
    for (const [keys, off, lines] of DATABASE_ENTRIES) {
        let matched = false, skip = false;
        for (const key of keys) {
            const chkSkip = key[0] === '~';
            const k = chkSkip ? key.slice(1) : key;
            if (db_pmatch(k, target)) {
                if (chkSkip) { skip = true; break; }
                matched = true; break;
            }
        }
        if (skip) continue;
        if (matched) return { off, lines };
    }
    return null;
}

// C ref: pager.c checkfile() — process an entry's raw lines for display: strip
// one leading tab (or up to 8 leading spaces), then tabexpand any remaining
// tabs (e.g. the "\t\t[ ... ]" attribution).
function db_process_lines(rawLines) {
    const out = [];
    for (const raw of rawLines) {
        let tp = raw;
        if (tp[0] === '\t') {
            tp = tp.slice(1);
        } else if (tp[0] === ' ') {
            let j = 0;
            while (j < 8 && j < tp.length && tp[j] === ' ') j++;
            tp = tp.slice(j);
        }
        if (tp.indexOf('\t') >= 0) tp = db_tabexpand(tp);
        out.push(tp);
    }
    return out;
}

// C ref: win/tty/wintty.c tty_display_nhwindow + process_text_window for the
// NHW_MENU data window (recorder build: H2344_BROKEN).  A menu window whose
// line count fits (< rows) is an overlay: offx = min(min(82, cols/2),
// cols - maxcol - 1) with maxcol = max(len)+1, each line drawn at offx+1 (a
// leading space occupies offx), and a single "--More--" at offx+1 on the row
// after the content.  A window with >= rows lines is forced full-screen
// (offx 0) and paged every rows-1 lines.  Reads the dismiss key(s) via nhgetch
// (each drawn state is a recorded frame), then redraws the map underneath.
async function display_dbase_window(lines, forceFull = false) {
    const disp = game.nhDisplay;
    const cols = disp?.cols || 80;
    const rows = disp?.rows || 24;

    let maxcol = 0;
    for (const l of lines) maxcol = Math.max(maxcol, l.length + 1);

    const fullscreen = forceFull || lines.length >= rows;
    let offx = fullscreen ? 0
        : Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const textCol = offx === 0 ? 0 : offx + 1;

    const perPage = rows - 1; // content rows; the morestr sits on the last row
    // Split into pages (only ever >1 in the forced full-screen case).
    const pages = [];
    for (let p = 0; p < lines.length; p += perPage) pages.push(lines.slice(p, p + perPage));

    for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi];
        if (offx === 0) {
            // Full-screen: clear the whole grid, then the content at col 0.
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols; c++) disp.setCell(c, r, ' ', NO_COLOR, 0);
        } else {
            // Overlay: only blank the window's column band on the content rows
            // and the morestr row (the map shows through to the left of offx).
            for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0); // topl
        }
        for (let r = 0; r < page.length; r++) {
            if (offx !== 0) for (let c = offx; c < cols; c++) disp.setCell(c, r, ' ', NO_COLOR, 0);
            if (page[r]) disp.putstr(textCol, r, page[r], NO_COLOR, 0);
        }
        const moreRow = offx === 0 ? rows - 1 : page.length;
        if (offx !== 0) for (let c = offx; c < cols; c++) disp.setCell(c, moreRow, ' ', NO_COLOR, 0);
        disp.putstr(textCol, moreRow, '--More--', NO_COLOR, 0);
        disp.setCursor(textCol + '--More--'.length, moreRow);
        // xwaitforspace(quitchars): any of space/return/ESC dismisses the page;
        // ESC cancels the rest (breaks out).  Each redraw is a recorded frame.
        let dismissed = false;
        while (!dismissed) {
            const k = await nhgetch();
            if (k === 27) { pi = pages.length; dismissed = true; } // ESC: cancel all
            else if (k === 32 || k === 13 || k === 10) dismissed = true;
            // other keys ring the bell in C; reloop without redraw.
        }
    }
    // Restore the map/status underneath the dismissed window.
    game._pending_message = '';
    game._toplin = 0;
    await flush_screen(1);
}

// C ref: pager.c checkfile() — look 'inp' up in data.base and, for the typed
// ('?')/carried-item ('i') paths (chkfilUsrTyped|chkfilDontAsk), display the
// matching entry directly.  Ports the input normalization (article/prefix
// stripping, "named"/"called"/", " truncation, makesingular alternate key) and
// the two-pass scan with the pass1offset dedup.  Returns TRUE if an entry was
// found.  user_typed_name && no first-pass match -> the "no information"
// message.
async function checkfile(inp, chkflags) {
    const user_typed_name = (chkflags & 1) !== 0;   // chkfilUsrTyped
    // without_asking (chkfilDontAsk, bit 2) is always set on these paths.

    if (inp == null) return false;
    let dbase_str = String(inp).toLowerCase();

    // strip a leading "interior of "
    if (dbase_str.startsWith('interior of ')) dbase_str = dbase_str.slice(12);
    // article / count prefix
    if (dbase_str.startsWith('a ')) dbase_str = dbase_str.slice(2);
    else if (dbase_str.startsWith('an ')) dbase_str = dbase_str.slice(3);
    else if (dbase_str.startsWith('the ')) dbase_str = dbase_str.slice(4);
    else if (dbase_str.startsWith('some ')) dbase_str = dbase_str.slice(5);
    else if (/^\d/.test(dbase_str)) {
        dbase_str = dbase_str.replace(/^\d+/, '');
        if (dbase_str[0] === ' ') dbase_str = dbase_str.slice(1);
    }
    if (dbase_str.startsWith('pair of ')) dbase_str = dbase_str.slice(8);
    if (dbase_str.startsWith('tame ')) dbase_str = dbase_str.slice(5);
    else if (dbase_str.startsWith('peaceful ')) dbase_str = dbase_str.slice(9);
    if (dbase_str.startsWith('invisible ')) dbase_str = dbase_str.slice(10);
    if (dbase_str.startsWith('saddled ')) dbase_str = dbase_str.slice(8);
    if (dbase_str.startsWith('blessed ')) dbase_str = dbase_str.slice(8);
    else if (dbase_str.startsWith('uncursed ')) dbase_str = dbase_str.slice(9);
    else if (dbase_str.startsWith('cursed ')) dbase_str = dbase_str.slice(7);
    if (dbase_str.startsWith('empty ')) dbase_str = dbase_str.slice(6);
    if (dbase_str.startsWith('partly used ')) dbase_str = dbase_str.slice(12);
    else if (dbase_str.startsWith('partly eaten ')) dbase_str = dbase_str.slice(13);
    if (dbase_str.startsWith('statue of ')) dbase_str = dbase_str.slice(0, 6);
    else if (dbase_str.startsWith('figurine of ')) dbase_str = dbase_str.slice(0, 8);
    // enchantment prefix "+0 "/"-1 "
    if (dbase_str && '+-'.includes(dbase_str[0]) && /\d/.test(dbase_str[1] || '')) {
        dbase_str = dbase_str.slice(1).replace(/^\d+/, '');
        if (dbase_str[0] === ' ') dbase_str = dbase_str.slice(1);
    }
    if (dbase_str.startsWith('moist towel')) dbase_str = 'wet' + dbase_str.slice(5);

    if (!dbase_str) return false;

    // "named"/"called"/", " -> truncate to base name; the tail becomes 'alt'.
    let alt = null;
    let ep = dbase_str.indexOf(' named ');
    if (ep >= 0) {
        alt = dbase_str.slice(ep + 7);
        const ap = dbase_str.indexOf(' called ');
        if (ap >= 0 && ap < ep) ep = ap;
        dbase_str = dbase_str.slice(0, ep);
    } else if ((ep = dbase_str.indexOf(' called ')) >= 0) {
        alt = dbase_str.slice(ep + 8);
        dbase_str = dbase_str.slice(0, ep);
    } else if ((ep = dbase_str.indexOf(', ')) >= 0) {
        dbase_str = dbase_str.slice(0, ep);
    }
    // strip article from alt
    if (alt) {
        if (alt.startsWith('a ')) alt = alt.slice(2);
        else if (alt.startsWith('an ')) alt = alt.slice(3);
        else if (alt.startsWith('the ')) alt = alt.slice(4);
    }
    // remove " (...)" charge/quantity from base and alt
    let par = dbase_str.indexOf(' (');
    if (par > 0) dbase_str = dbase_str.slice(0, par);
    if (alt) { par = alt.indexOf(' ('); if (par > 0) alt = alt.slice(0, par); }

    if (!alt) alt = db_makesingular(dbase_str);
    if (!dbase_str) return false;

    let res = false;
    let pass1offset = null;
    let pass1found = false;
    const startPass = (alt === dbase_str) ? 0 : 1;
    for (let pass = startPass; pass >= 0; pass--) {
        const target = (pass === 1) ? alt : dbase_str;
        const hit = target ? db_find_entry(target) : null;
        if (hit) {
            const fseekoffset = hit.off;
            if (pass === 1) { pass1offset = fseekoffset; pass1found = true; }
            else if (fseekoffset === pass1offset) break; // same entry as pass 1
            res = true;
            const shown = db_process_lines(hit.lines);
            await display_dbase_window(shown);
        } else if (user_typed_name && pass === 0 && !pass1found) {
            game._pending_message = 'You don\'t have any information on those things.';
            game._toplin = 1;
        }
    }
    return res;
}

// C ref: pager.c look_region_nearby() + look_traps() — count seen/remembered
// traps inside the look region.  nearby => a BOLT_LIM (8) box clamped to the
// map around the hero; otherwise the whole level.  Only the count is needed to
// decide the "No traps seen or remembered[ nearby]." message.
function count_seen_traps(nearby) {
    const u = game.u;
    const BOLT_LIM = 8;
    const lo_y = nearby ? Math.max(u.uy - BOLT_LIM, 0) : 0;
    const lo_x = nearby ? Math.max(u.ux - BOLT_LIM, 1) : 1;
    const hi_y = nearby ? Math.min(u.uy + BOLT_LIM, ROWNO - 1) : ROWNO - 1;
    const hi_x = nearby ? Math.min(u.ux + BOLT_LIM, COLNO - 1) : COLNO - 1;
    let count = 0;
    for (const t of (game.level?.traps || [])) {
        if (!t.tseen) continue;
        if (t.tx >= lo_x && t.tx <= hi_x && t.ty >= lo_y && t.ty <= hi_y) count++;
    }
    return count;
}

// C ref: pager.c look_engrs() — list seen/remembered engravings in the look
// region as a full-screen NHW_TEXT window (or the "No engravings..." message
// when none).  Each line is: "%8s  <sym> <text>" where <sym> is the engraving
// glyph ('`') and <text> comes from add_quoted_engraving() + the strsubst
// cleanup.  When the engraving cell is covered (hero/monster/object on top) the
// engraving isn't "shown", so ", obscured by <coverglyph>" is appended.
async function do_look_engrs(nearby) {
    const { engr_at } = await import('./engrave.js');
    const u = game.u;
    const BOLT_LIM = 8;
    const lo_y = nearby ? Math.max(u.uy - BOLT_LIM, 0) : 0;
    const lo_x = nearby ? Math.max(u.ux - BOLT_LIM, 1) : 1;
    const hi_y = nearby ? Math.min(u.uy + BOLT_LIM, ROWNO - 1) : ROWNO - 1;
    const hi_x = nearby ? Math.min(u.ux + BOLT_LIM, COLNO - 1) : COLNO - 1;

    const lines = [];
    let count = 0;
    const ENGR_SYM = '`'; // S_engroom cmap symbol
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            const loc = game.level?.at(x, y);
            if (!loc || !loc.seenv) continue;
            const e = engr_at(x, y);
            if (!e) continue;
            // C builds " (engraving" + add_quoted_engraving(), then strsubst.
            // Headstone/grave variants are not distinguished here (starter
            // levels have no graves).
            let full = ' (engraving';
            if (e.eread)
                full += ` with remembered text: "${e.rememberedText}"`;
            else
                full += ' that you haven\'t read';
            full = full.replace('(engraving with ', '');
            full = full.replace('(engraving ', 'engraving ');
            // Determine whether the engraving glyph is what is actually shown,
            // or something covers it.  The hero (drawn as an overlay, not in the
            // map memory) covers when standing on the cell; otherwise the map
            // memory's display char is the top glyph.
            let coverChar;
            if (x === u.ux && y === u.uy) {
                coverChar = '@'; // player-monster symbol (non-polymorphed hero)
            } else {
                const dch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch)
                                            : loc.disp_ch;
                coverChar = dch;
            }
            const shown = (coverChar === ENGR_SYM);
            if (!shown) full += `, obscured by ${coverChar}`;
            count++;
            if (count === 1) {
                lines.push(nearby ? 'Nearby seen or remembered engravings:'
                                  : 'Seen or remembered engravings on this level:');
                lines.push('    '); // Qt fixed-width separator (renders blank)
            }
            const coord = `<${x},${y}>`;
            lines.push(`${coord.padStart(8)}  ${ENGR_SYM} ${full}`);
        }
    }
    if (count)
        await display_dbase_window(lines, /*forceFull=*/true);
    else
        await pline(`No engravings seen or remembered${nearby ? ' nearby' : ''}.`);
}

// C ref: hacklib.c upstart() — capitalize the first letter of a string.
function upstart(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// C ref: defsym.h FURNSYMS explanation text (PCHAR2's 4th/"desc" field) for
// the 6 furniture appearances makemon.js's FURNSYMS table can assign a mimic
// (S_upstair/S_dnstair/S_altar/S_grave/S_throne/S_sink).
const FURNITURE_EXPLANATION = {
    25: 'staircase up',
    26: 'staircase down',
    33: 'altar',
    34: 'grave',
    35: 'opulent throne',
    36: 'sink',
};

// C ref: pager.c mhidden_description() — the ", mimicking X" suffix
// look_at_monster() appends whenever M_AP_TYPE(mtmp) is set (mundetected
// hiders' ", hiding"/etc suffix isn't reached by the sessions modelled here).
// For M_AP_FURNITURE it's always defsyms[mappearance].explanation.  For
// M_AP_OBJECT, C's object_from_map() only names a REAL floor object standing
// under the disguised mimic — _map_location maps what's actually there (the
// mimic's fake appearance is display-only, never written to the remembered
// glyph) — same object look_at_object_here's vobj_at/covers_objects check
// finds; a mimic on otherwise bare/unseen floor falls back to "something".
function mon_hidden_suffix(mtmp) {
    if (mtmp.m_ap_type === 'furniture') {
        const what = FURNITURE_EXPLANATION[mtmp.mappearance] || 'something';
        return `, mimicking ${an(what)}`;
    }
    if (mtmp.m_ap_type === 'obj') {
        const objname = look_at_object_here(mtmp.mx, mtmp.my);
        return `, mimicking ${objname || 'something'}`;
    }
    return '';
}

// C ref: pager.c look_at_monster() — the health/tame/peaceful-prefixed monster
// name.  monhealthdescr is disabled in C (#if 0), so only the tame/peaceful
// adjective + distant_monnam (bare monster type name) matter for the sessions
// modelled here; the ", holding you"/", asleep"/etc. suffixes aren't reached.
function look_at_monster_desc(mtmp) {
    // C: distant_monnam(mtmp, ARTICLE_NONE) — the bare monster type name (or a
    // given name); mgivenname is used when present.  x_monnam's isshk branch
    // (do_hallu/do_mappear false here) replaces the whole name with the
    // shopkeeper's personal name, only appending "the <species>" when the
    // shopkeeper isn't the plain shopkeeper species (e.g. polymorphed) or is
    // invisible.
    let name;
    if (mtmp.isshk) {
        name = mtmp.eshk?.shknam || mtmp.data?.name || 'shopkeeper';
        if ((mtmp.data?.name !== 'shopkeeper') || mtmp.minvis) {
            name += ' the ' + (mtmp.minvis ? 'invisible ' : '')
                + (mtmp.data?.name || mtmp.data?.pmname || 'monster');
        }
    } else {
        const given = mtmp.mgivenname || mtmp.mextra?.mgivenname;
        name = given || mtmp.data?.name || mtmp.data?.pmname || 'monster';
    }
    const adj = mtmp.mtame ? 'tame ' : (mtmp.mpeaceful ? 'peaceful ' : '');
    return `${adj}${name}${mon_hidden_suffix(mtmp)}`;
}

// C ref: pager.c look_all() — list monsters (do_mons) or objects (!do_mons) in
// the look region as a full-screen NHW_TEXT window.  The per-line prefix is
// "%8s  <sym>  " where the coord is the look_all form (a trailing space is
// appended for y<10 so the commas of <x,y> line up) and <sym> is the displayed
// glyph symbol (the hero is '@'; other monsters/objects use the map's shown
// character).  Empty region -> the "No monsters/objects..." message.
async function do_look_all(nearby, do_mons) {
    const u = game.u;
    const BOLT_LIM = 8;
    const lo_y = nearby ? Math.max(u.uy - BOLT_LIM, 0) : 0;
    const lo_x = nearby ? Math.max(u.ux - BOLT_LIM, 1) : 1;
    const hi_y = nearby ? Math.min(u.uy + BOLT_LIM, ROWNO - 1) : ROWNO - 1;
    const hi_x = nearby ? Math.min(u.ux + BOLT_LIM, COLNO - 1) : COLNO - 1;

    const lines = [];
    let count = 0;
    const cellSym = (loc) => (loc && loc.disp_ch)
        ? (loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch)
        : ' ';
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            const loc = game.level?.at(x, y);
            let lookbuf = '', sym = '';
            if (do_mons) {
                if (x === u.ux && y === u.uy) {
                    // canspotself: hero visible on their own square.
                    lookbuf = self_lookat();
                    sym = '@';
                } else {
                    const mtmp = m_at(x, y);
                    if (mtmp && canspotmon(mtmp)) {
                        lookbuf = look_at_monster_desc(mtmp);
                        sym = cellSym(loc);
                    }
                }
            } else {
                // objects: count only cells whose DISPLAYED glyph is an object
                // (C: glyph_is_object(glyph_at)).  vobj_at finds any object on
                // the cell, but an out-of-sight/unremembered one isn't shown, so
                // require the cell's current symbol to equal the object glyph.
                if (!(x === u.ux && y === u.uy) && !m_at(x, y)) {
                    const otmp = vobj_at(x, y);
                    if (otmp && !covers_objects(loc)) {
                        const og = object_glyph(otmp);
                        const ogch = og.dec ? (DEC_TO_UNICODE[og.ch] || og.ch) : og.ch;
                        if (cellSym(loc) === ogch) {
                            lookbuf = obj_doname(otmp);
                            sym = cellSym(loc);
                        }
                    }
                }
            }
            if (lookbuf) {
                count++;
                if (count === 1) {
                    const which = do_mons ? 'monsters' : 'objects';
                    lines.push(nearby
                        ? `${upstart(which)} currently shown near <${u.ux},${u.uy}>:`
                        : `All ${which} currently shown on the map:`);
                    lines.push('    '); // Qt fixed-width separator (renders blank)
                }
                let coordbuf = `<${x},${y}>`;
                if (y < 10) coordbuf += ' '; // look_all coordinate-alignment kitten
                lines.push(`${coordbuf.padStart(8)}  ${sym}  ${lookbuf}`);
            }
        }
    }
    if (count)
        await display_dbase_window(lines, /*forceFull=*/true);
    else
        await pline(`No ${do_mons ? 'monsters' : 'objects'} are currently shown ${nearby ? 'nearby' : 'on the map'}.`);
}

// C ref: pager.c do_look(mode=0) — the '/' whatis command.
export async function do_look_full() {
    const u = game.u;
    const WHAT = 'a monster, object or location';

    // 1. Present the whatis menu and read the PICK_ONE selection.
    render_whatis_menu();
    const k0 = await nhgetch();
    const sel = String.fromCharCode(k0);

    // Map the key to a selection; ESC/space/return/'q' cancel.
    let i = 'q';
    if (k0 !== 27 && k0 !== 32 && k0 !== 13 && k0 !== 10
        && WHATIS_ITEMS.some((it) => it.ch === sel)) {
        i = sel;
    }
    // Redraw the map under the dismissed menu before any prompt is shown.
    game._pending_message = '';
    game._toplin = 0;
    await flush_screen(1);

    if (i === '?') {
        // C do_look case '?': getlin("Specify what? (type the word)"), then
        // mungspaces; an empty/ESC reply cancels.  A multi-character reply is a
        // "complete string" -> checkfile(out_str, chkfilUsrTyped|chkfilDontAsk)
        // which shows the data.base entry directly (no y/n gate).  A single
        // character would fall through to the by-symbol farlook, which the
        // recorded session never does; treat it as a cancel for now.
        const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
        let out_str = await hooked_tty_getlin('Specify what? (type the word)', null);
        if (out_str !== ' ') out_str = out_str.replace(/\s+/g, ' ').replace(/^ | $/g, '');
        if (out_str === '' || out_str[0] === '\x1b') { game.context.move = 0; return; }
        if (out_str.length > 1) {
            await checkfile(out_str, 1 | 2 /* chkfilUsrTyped|chkfilDontAsk */);
            game.context.move = 0;
            return;
        }
        // single-char symbol path not modelled; cancel.
        game.context.move = 0;
        return;
    }

    if (i === 'i') {
        // C do_look case 'i': invlet = display_inventory(NULL, TRUE); if a real
        // item was picked, checkfile(singular(obj, xname), UsrTyped|DontAsk).
        const nm = await whatis_pick_inventory();
        if (nm) {
            // The picked-item menu is dismissed; redraw the map before the
            // data.base overlay so it shows through to the left of the window.
            await flush_screen(1);
            await checkfile(nm, 1 | 2);
        }
        game.context.move = 0;
        return;
    }

    if (i === 't' || i === 'T') {
        // C do_look case 't'/'T' -> look_traps(nearby).  Scan the look region
        // (nearby => BOLT_LIM=8 box around the hero, else the whole map) for
        // seen/remembered traps.  When none are found the command just prints
        // "No traps seen or remembered[ nearby]." (no window).  The trap-listing
        // window for count>0 is not modelled; that case falls through to the
        // same no-time-passing cancel as before (no message), which is what the
        // unimplemented sub-modes already did.
        const nearby = (i === 't');
        if (count_seen_traps(nearby) === 0)
            await pline(`No traps seen or remembered${nearby ? ' nearby' : ''}.`);
        game.context.move = 0;
        return;
    }

    if (i === 'm' || i === 'M') {
        // C do_look case 'm'/'M' -> look_all(nearby, do_mons=TRUE).
        await do_look_all(i === 'm', true);
        game.context.move = 0;
        return;
    }

    if (i === 'o' || i === 'O') {
        // C do_look case 'o'/'O' -> look_all(nearby, do_mons=FALSE).
        await do_look_all(i === 'o', false);
        game.context.move = 0;
        return;
    }

    if (i === 'e' || i === 'E') {
        // C do_look case 'e'/'E' -> look_engrs(nearby).
        await do_look_engrs(i === 'e');
        game.context.move = 0;
        return;
    }

    if (i !== '/') {
        // Other sub-modes (inventory/symbol/monster/object listings) are not
        // modelled yet; cancel cleanly with no time passing.
        game.context.move = 0;
        return;
    }

    // 2. '/' => from_screen; cc starts on the hero and persists across the
    //    do-while loop (C passes &cc to getpos by reference, so each pass
    //    resumes where the previous one left off).  flags.verbose (default on)
    //    => "Please move the cursor to <what>." then the verbose getpos loop.
    //    The do-while loops for LOOK_TRADITIONAL ('.') until ESC.
    let firstIter = true;
    let cx = u.ux, cy = u.uy;
    for (;;) {
        if (firstIter) {
            // C do_look:1903 pline("Please move the cursor to %s.") — NEED_MORE;
            // getpos's tip/verbose handling fires its --More-- frame.
            await update_topl(`Please move the cursor to ${WHAT}.`);
        } else {
            // Subsequent loop passes: flags.verbose was cleared, so the prompt
            // is the short "Pick %s." form.  Route through update_topl so any
            // pending description (NEED_MORE from a found>1 pick) gets its
            // --More-- frame before this prompt replaces it.
            await update_topl(`Pick ${WHAT}.`);
            await flush_screen(1);
            const disp = game.nhDisplay;
            if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
        }

        const cc = await getpos(WHAT, cx, cy, null, /*force=*/false,
                                /*verbose=*/firstIter);
        firstIter = false;
        if (!cc) break; // ESC -> exit the do-while loop
        cx = cc.x; cy = cc.y;

        // do_screen_description on the picked square.  putmixed leaves the
        // top line NEED_MORE; the data-file query (when the key exists in
        // data.base) fires its own --More-- via y_n.  Otherwise the NEED_MORE
        // line is flushed with --More-- by the next loop's "Pick..." or exit.
        const { text, firstmatch } = look_pick_description(cc.x, cc.y);
        game._pending_message = text;
        game._toplin = 1;        // NEED_MORE
        game._yn_need_more = true;
        const prompted = await checkfile_moreinfo(firstmatch);
        game._yn_need_more = false;
        if (prompted) {
            game._pending_message = '';
            game._toplin = 0;
        }
        // found>1: leave NEED_MORE pending for the next "Pick..."/exit to flush.
        // C do-while continues for LOOK_TRADITIONAL; the loop top reprompts.
    }

    game._pending_message = '';
    game._toplin = 0;
    game.context.move = 0;
}

// C ref: teleport.c dotelecmd() -> dotele(break_the_rules=TRUE) -> tele().  In
// wizard mode (playmode:debug) the ^T command with no 'm' prefix sets
// ignore_restrictions and calls dotele(TRUE); with no trap under the hero it
// skips the spell/energy block, and because wizard is set tele() shows
// "Where do %s want to be teleported?" ("you") and enters getpos(&cc, TRUE,
// "the desired position").  When getpos is cancelled (ESC -> result < 0) tele()
// returns without teleporting, but dotele() still returns 1 (ECMD_TIME): the
// command consumes a game turn (the moveloop then runs the monster moves).
// When a spot IS picked, C's tele()/scrolltele(0) does:
//   if (teleok(cc.x, cc.y, FALSE)) { teleds(cc.x, cc.y, TELEDS_TELEPORT); return; }
//   pline("Sorry...");
//   (void) safe_teleds(TELEDS_TELEPORT);   /* scroll==NULL, so no learnscroll() */
// teleok_hero/teleds_hero/safe_teleds_hero (read.js) already port these
// hero-only subsets faithfully for the scroll-of-teleportation controlled/
// uncontrolled cases, and this is the exact same underlying C code path, so
// they're reused here rather than reimplemented.
export async function dotele_wizard() {
    const u = game.u;
    // tele() -> scrolltele(0): with the wizard override taken, C prints
    //   pline("Where do %s want to be teleported?", "you")   [no steed]
    // then getpos(&cc, force=TRUE, "the desired position").  The pline leaves the
    // message line pending (NEED_MORE); getpos()'s first-use farlook tip window
    // (handle_tip -> l_nhcore_call) then forces that pending line to be
    // acknowledged with --More-- before the tip is drawn.  So the recorded frames
    // are: "Where do you want to be teleported?--More--" (topl_more), then the
    // tip text window, then flags.verbose's "(For instructions type a '?')"
    // appended ahead of "Move cursor to the desired position:".  Model the pline
    // as a NEED_MORE topline and let getpos(verbose) fire the topl_more() frame.
    await getpos_render('Where do you want to be teleported?', u.ux, u.uy);
    game._toplin = 1; // TOPLIN_NEED_MORE — pending "Where..." pline
    game._toplines = 'Where do you want to be teleported?';
    const verbose = game.flags?.verbose !== false;
    const cc = await getpos('the desired position', u.ux, u.uy, null, /*force=*/true, verbose);
    if (!cc) {
        // ESC: getpos() returned < 0 -> tele() returns; dotele() still ECMD_TIME.
        return 1;
    }
    if (teleok_hero(cc.x, cc.y, false)) {
        await teleds_hero(cc.x, cc.y);
    } else {
        await pline('Sorry...');
        await safe_teleds_hero();
    }
    return 1;
}

export { getpos_tip, getpos, getpos_render, jump_landing, is_valid_jump_pos, get_valid_jump_position, jump_hilite_first_cursor, distu };
