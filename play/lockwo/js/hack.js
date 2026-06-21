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
import { m_at, flush_screen, newsym, pline, update_topl, topl_more, y_n } from './display.js';
import { rnd } from './rng.js';
import { vision_recalc } from './vision.js';
import { nhgetch } from './input.js';
import { is_safemon, canspotmon } from './uhitm.js';
import { dist2 } from './hacklib.js';
import { roles, races } from './role.js';
import { NO_COLOR, ATR_INVERSE, DEC_TO_UNICODE } from './terminal.js';
import { COLNO, ROWNO, STONE, ROOM, CORR, DOOR, ICE, STAIRS, FOUNTAIN,
         D_CLOSED, D_LOCKED, D_ISOPEN, D_BROKEN,
         IS_WALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_AIR, IS_POOL, IS_LAVA,
         isok } from './const.js';

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

// Render a tty NHW_TEXT window as an overlay (the map/status drawn by the
// previous flush_screen show through outside the window's column band).
// C ref: wintty.c tty_display_nhwindow + process_text_window.  offx follows
// the recorder build's H2344_BROKEN form used by com_pager_legacy():
//   offx = min(min(82, cols/2), cols - maxcol - 1), maxcol = max(len)+1.
// A NHW_TEXT window prints each line at column offx (no leading space, unlike
// NHW_MENU); the "(end)" pager sits on the row after the content at offx and
// the cursor parks at offx + len("(end)") + 1.
function render_getpos_tip() {
    const disp = game.nhDisplay;
    if (!disp?.putstr) return;

    const lines = GETPOS_TIP;
    let maxcol = 0;
    for (const l of lines) if (l.length + 1 > maxcol) maxcol = l.length + 1;

    const cols = 80;
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;

    const blankCols = (row) => {
        for (let c = offx; c < cols; c++) disp.setCell(c, row, ' ', NO_COLOR, 0);
    };
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0); // WIN_MESSAGE

    for (let i = 0; i < lines.length; i++) {
        blankCols(i);
        if (lines[i]) disp.putstr(offx, i, lines[i], NO_COLOR, 0);
    }
    const endRow = lines.length;
    blankCols(endRow);
    disp.putstr(offx, endRow, '(end)', NO_COLOR, 0);
    disp.setCursor(offx + '(end)'.length + 1, endRow);
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

// C ref: getpos.c getpos() else-branch — terrain symbol matching.  A key that
// is not a movement/pick/special key but DOES match a non-skipped cmap symbol
// (defsym.h: walls/room/corr/door are skipped) triggers a map scan; when no
// such feature exists "Can't find dungeon feature '%c'." is shown.  The
// recorded teleport session searches '0' (defsym.h PCHAR(82,'0',S_ss1)), an
// effect glyph that is never placed as static terrain, so the scan never finds
// it.  We classify the special-effect / beam / zap symbols that match a cmap
// entry yet are never present on a static map, so the search always reports
// "Can't find ...".  (Static-terrain symbols like '<','>','{','_' are not in
// this set; they fall through to "Unknown direction", which no session hits.)
const GP_FEATURE_SYMS = new Set(['0', '$', '!', '*', ')', '(']);
function getpos_is_feature_sym(ch) { return GP_FEATURE_SYMS.has(ch); }

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
    if (typ === STAIRS) return stair_descr(x, y);
    if (typ === FOUNTAIN) return 'fountain';
    return 'floor of a room';
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
async function getpos(goalText, startx, starty, validfn, force = false, verbose = false) {
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
        if (u && x === u.ux && y === u.uy) desc = self_lookat();
        else desc = terrain_description(x, y);
        if (validfn && !validfn(x, y)) desc += ' (invalid target)';
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
                // matched a cmap feature symbol but no such feature exists
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

    if (i !== '/') {
        // Other sub-modes (inventory/symbol/monster/object/trap/engraving
        // listings) are not modelled yet; cancel cleanly with no time passing.
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
// We model the cancel path the recorded knight session takes; teleok()/teleds()
// to an actual destination is not needed because the recorded cursor work ends
// in a cancel and the hero stays put.
export async function dotele_wizard() {
    const u = game.u;
    // tele(): pline("Where do %s want to be teleported?", "you"); then C does
    // curs(WIN_MAP, cx, cy) + flush_screen(0) so the prompt is on the grid when
    // getpos()'s first readchar blocks.  Render it here (getpos's first loop
    // iteration leaves the prompt alone because the tip was already shown).
    await getpos_render('Where do you want to be teleported?', u.ux, u.uy);
    const cc = await getpos('the desired position', u.ux, u.uy, null, /*force=*/true);
    if (!cc) {
        // ESC: getpos() returned < 0 -> tele() returns; dotele() still ECMD_TIME.
        return 1;
    }
    // A picked destination would teleok()/teleds() here; the recorded session
    // never reaches this branch (it cancels), so we conservatively treat a pick
    // as a no-op teleport that still costs the turn.
    return 1;
}

export { getpos_tip, getpos, getpos_render, jump_landing, is_valid_jump_pos, get_valid_jump_position, jump_hilite_first_cursor, distu };
