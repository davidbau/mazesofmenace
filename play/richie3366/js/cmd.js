// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: movement, search, inventory / look / spell / discoveries /
// attributes for seed8000. Contestants should add: kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    newsym, flush_screen, pline, see_nearby_objects, clear_nhwindow_message,
    mon_visible, sensemon,
} from './display.js';
import { COLNO, ROWNO, STONE, DOOR, CORR, ROOM, IRONBARS, TREE, SDOOR,
         D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN,
         IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_STWALL, IS_WALL, IS_TREE,
         ACCESSIBLE, isok,
         ECMD_OK, ECMD_TIME, ECMD_CANCEL, DOMOVE_RUSH, DOMOVE_WALK,
         xdir, ydir, N_DIRS, DIR_W, DIR_N, DIR_E, DIR_S,
         DIR_NW, DIR_NE, DIR_SE, DIR_SW,
         M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { dist2 } from './mon.js';
import { vision_recalc, couldsee } from './vision.js';
import {
    ddoinv, dodiscovered, doattributes, dolook, doprgold, doprwep, doprarm,
    doprring, dopramulet, doprtool,
} from './invent.js';
import { dovspell, docast } from './spell.js';
import { doeat } from './eat.js';
import { dodrink } from './potion.js';
import { dozap } from './zap.js';
import { doread } from './read.js';
import { doengrave, maybe_smudge_engr, set_occupation } from './engrave.js';
import { dothrow, dofire } from './dothrow.js';
import { doapply } from './apply.js';
import { dokick } from './dokick.js';
import { donull, dodown, doup, dodrop } from './do.js';
import { dosave } from './save.js';
import { doset_simple, dotogglepickup } from './options.js';
import { do_attack, mon_at, is_safemon } from './uhitm.js';
import { doopen_indir } from './lock.js';
import { doextcmd } from './getline.js';
import { dosearch, doterrain } from './detect.js';
import { dotakeoff, dowear, doputon } from './do_wear.js';
import { wiz_wish, wiz_genesis, wiz_level_tele } from './wizcmds.js';
import { dotelecmd } from './teleport.js';
import { dowield, dowieldquiver } from './wield.js';
import { dowhatis, doquickwhatis, dohelp } from './pager.js';
import { x_monnam_tame } from './do_name.js';
import { an } from './objnam.js';
import { spoteffects, dopickup } from './pickup.js';
import { dopay } from './shk.js';
import { getpos } from './getpos.js';
import {
    nomul, moverock, boulder_at, swim_move_danger, trapmove,
    impaired_movement,
} from './hack.js';
import { acurr, exercise, A_DEX, Fumbling } from './attrib.js';

/** C ref: cmd.c cmdq_clear(CQ_CANNED) */
function cmdq_clear() {
    game._cmdq_canned = [];
}

/** C ref: cmd.c cmdq_pop(CQ_CANNED) — next canned async command or null */
function cmdq_pop() {
    const q = game._cmdq_canned;
    if (!q || !q.length) return null;
    return q.shift();
}


// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function isRunKey(ch) {
    return 'HJKLYUBN'.includes(ch);
}

/** C ref: cmd.c reset_commands — C(dirchars[i]) → do_rush_* (!number_pad). */
function rushDirFromCtrl(key) {
    // Only real Ctrl-A..Ctrl-Z codes (1..26). Plain 'j' (106) must not match:
    // (106 & 0x1f)+96 === 'j'. C('j')==10=='\n' is rush-south.
    if (key < 1 || key > 26) return null;
    const letter = String.fromCharCode(key + 96); // 1..26 → a..z
    if (!isMovementKey(letter)) return null;
    return letter;
}

// C ref: hack.c — check if a cell blocks movement
// C test_move: IS_OBSTRUCTED(typ) || typ == IRONBARS (plus closed doors).
// IS_OBSTRUCTED covers STONE..SCORR including TREE/SDOOR/SCORR (typ < POOL).
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function closed_door_at(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && loc.typ === DOOR
        && (loc.doormask & (D_CLOSED | D_LOCKED)));
}

// C ref: hack.c doorless_door — only D_NODOOR / D_BROKEN (no intact door)
function doorless_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    // Rogue-level override deferred (all rogue doors treated as present)
    return !((loc.doormask || 0) & ~(D_NODOOR | D_BROKEN));
}

// C ref: shk.c block_door — shopkeeper blocks diagonal shop exit.
// Stub false until shop ushops / ESHK wired for this path.
function block_door(_x, _y) {
    return false;
}

// C ref: hack.c end_running(and_travel) — JS always clears travel (TRUE path)
function end_running() {
    if (!game.context) game.context = {};
    game.context.run = 0;
    game.context.mv = 0;
    game.context.travel = 0;
    game.context.travel1 = 0;
    if (game.context.nopick) game.context.nopick = 0;
    game.multi = 0;
}

/**
 * C ref: hack.c test_move DO_MOVE + flags.mention_walls on IS_OBSTRUCTED.
 * Uses defsyms[].explanation via an(); S_stone → "solid stone".
 * Deferred: Blind feel_location, Passes_walls/may_passwall, Underwater,
 * IRONBARS chew, tunnels/still_chewing, autodig, is_db_wall, Sokoban
 * resist, full back_to_glyph/wall_angle→S_stone edge cases, pline_dir a11y.
 */
async function mention_walls_obstructed(x, y) {
    if (!game.flags?.mention_walls) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (loc.typ === IRONBARS) {
        await pline('You cannot pass through the bars.');
        return;
    }
    let buf;
    // C: glyph = back_to_glyph; sym==S_stone → "solid stone"; else an(explanation)
    if (loc.typ === TREE || (IS_TREE(loc.typ) && loc.typ !== STONE)) {
        buf = an('tree');
    } else if ((IS_WALL(loc.typ) || loc.typ === SDOOR) && loc.seenv) {
        buf = an('wall');
    } else {
        // STONE / SCORR / unseen wall (wall_angle→S_stone) / other rock
        buf = 'solid stone';
    }
    await pline(`It's ${buf}.`);
}

/**
 * C ref: hack.c domove_fight_empty — F into empty/solid wastes a turn.
 * Branch envelope: thin air + simple solid; boulder/pick/explode/I-glyph
 * deferred (C-JS-MAP).
 */
async function domove_fight_empty(x, y) {
    const offEdge = !isok(x, y);
    const loc = (!offEdge && game.level?.at(x, y)) || null;
    const solid = offEdge
        || !loc
        || !ACCESSIBLE(loc.typ)
        || IS_FURNITURE(loc.typ);
    let target;
    if (offEdge) {
        target = 'an unknown obstacle';
    } else if (solid) {
        if (loc && (loc.seenv || IS_STWALL(loc.typ))) {
            target = IS_STWALL(loc.typ) || loc.typ === STONE
                ? 'the wall' : 'an unknown obstacle';
        } else {
            target = 'an unknown obstacle';
        }
    } else {
        target = 'thin air';
    }
    const harmlessly = (solid && !offEdge) ? 'harmlessly ' : '';
    await pline(`You ${harmlessly}attack ${target}.`);
    return true;
}

/**
 * C ref: hack.c lookaround()
 * Blind / traps / pools / NODIAG / lookaround mention_walls plines deferred
 * (obstructed bump mention_walls is D-0354).
 */
function lookaround() {
    const ctx = game.context;
    const u = game.u;
    if (!ctx?.run) return;

    let corrct = 0;
    let noturn = 0;
    let x0 = 0;
    let y0 = 0;
    let m0 = 1;
    let i0 = 9;

    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            const infront = (x === u.ux + (u.dx || 0) && y === u.uy + (u.dy || 0));
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;

            const mtmp = mon_at(x, y);
            if (mtmp) {
                // C: skip M_AP furniture/object; mon_visible deferred → assume seen
                if ((ctx.run !== 1 && !is_safemon(mtmp))
                    || (infront && !ctx.travel)) {
                    end_running();
                    return;
                }
            }

            const loc = game.level?.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (typ === STONE) continue;
            if (x === u.ux - (u.dx || 0) && y === u.uy - (u.dy || 0)) continue;

            // traps deferred (avoid_moving_on_trap)

            if (IS_OBSTRUCTED(typ) || typ === ROOM) {
                continue;
            }

            let asCorr = false;
            if (closed_door_at(x, y)) {
                if (x !== u.ux && y !== u.uy) continue;
                if (ctx.run !== 1 && !ctx.travel) {
                    end_running();
                    return;
                }
                asCorr = true; // bcorr
            } else if (typ === CORR) {
                asCorr = true;
            } else {
                // pool/lava/objects/stairs: run==1 → bcorr; run==8 continue; else stop
                if (ctx.run === 1) asCorr = true;
                else if (ctx.run === 8) continue;
                else {
                    end_running();
                    return;
                }
            }

            if (asCorr) {
                const here = game.level?.at(u.ux, u.uy);
                if (here && here.typ !== ROOM) {
                    if (ctx.run === 1 || ctx.run === 3 || ctx.run === 8) {
                        const i = dist2(x, y, u.ux + (u.dx || 0), u.uy + (u.dy || 0));
                        if (i > 2) continue;
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
    }

    if (corrct > 1 && ctx.run === 2) {
        end_running();
        return;
    }

    if ((ctx.run === 1 || ctx.run === 3 || ctx.run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        let turn;
        if (i0 === 2) {
            turn = ((u.dx || 0) === y0 - u.uy && (u.dy || 0) === u.ux - x0) ? 2 : -2;
        } else if ((u.dx || 0) && (u.dy || 0)) {
            turn = (((u.dx || 0) === (u.dy || 0) && y0 === u.uy)
                || ((u.dx || 0) !== (u.dy || 0) && y0 !== u.uy)) ? -1 : 1;
        } else {
            turn = ((x0 - u.ux === y0 - u.uy && !(u.dy || 0))
                || (x0 - u.ux !== y0 - u.uy && (u.dy || 0))) ? 1 : -1;
        }
        turn += (u.last_str_turn || 0);
        if (turn <= 2 && turn >= -2) {
            u.last_str_turn = turn;
            u.dx = x0 - u.ux;
            u.dy = y0 - u.uy;
        }
    }
}

// C ref: cmd.c — continue a DOMOVE_RUSH after the first step (moveloop multi>0)
export async function continue_run() {
    if (!game.context?.run || !(game.multi > 0) || !game.context.mv) {
        end_running();
        return false;
    }
    lookaround();
    if (!(game.multi > 0) || !game.context.run) {
        game.context.move = 0;
        return false;
    }
    // C: if (multi < COLNO && !--multi) end_running
    if (game.multi < COLNO && !--game.multi) {
        end_running();
    }
    // C ref: hack.c domove_core — travel recomputes step each turn
    if (game.context?.travel) {
        // C: if (!findtravelpath(TRAVP_TRAVEL)) findtravelpath(TRAVP_GUESS)
        if (!findtravelpath_travel() && !findtravelpath_guess()) {
            end_running();
            game.context.move = 0;
            return false;
        }
        game.context.travel1 = 0;
    }
    const dx = game.u.dx || 0;
    const dy = game.u.dy || 0;
    await domove(dx, dy);
    if (game.context.move !== 0) game.context.move = 1;
    return true;
}

export function run_active() {
    return !!(game.context?.run && game.multi > 0 && game.context.mv);
}

// Repeat a counted search (20s) without reading a new key
export function search_repeat_active() {
    return !!(game._repeat_search && (game.multi || 0) > 0);
}

/** C ref: decl.c dirs_ord — cardinals first for findtravelpath. */
const DIRS_ORD = [
    DIR_W, DIR_N, DIR_E, DIR_S, DIR_NW, DIR_NE, DIR_SE, DIR_SW,
];

/**
 * C ref: hack.c findtravelpath(TRAVP_TRAVEL) — BFS from destination back to
 * hero; next step is the neighbor that reached u.ux/u.uy.
 * Envelope: boulder delay (skip boulder cells as path nodes for non-giant
 * tourist), seenv|couldsee gate, dirs_ord. travelmap / TEST_TRAP /
 * closed-door delay / could_move_onto_boulder / Passes_walls still deferred.
 * Sets u.dx/u.dy; returns true if a step is ready.
 */
function findtravelpath_travel() {
    const u = game.u;
    const destX = u.tx | 0;
    const destY = u.ty | 0;
    if (!isok(destX, destY)) return false;

    const ctx = game.context;
    // Adjacent reachable → normal one-step move; clear travel destination
    if (ctx?.travel1
        && Math.abs(destX - u.ux) <= 1 && Math.abs(destY - u.uy) <= 1
        && (destX !== u.ux || destY !== u.uy)
        && !blocksMove(destX, destY)
        && !boulder_at(destX, destY)) {
        end_running();
        u.dx = destX - u.ux;
        u.dy = destY - u.uy;
        nomul(0);
        if (!game.iflags) game.iflags = {};
        if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
        game.iflags.travelcc.x = 0;
        game.iflags.travelcc.y = 0;
        return true;
    }

    if (destX === u.ux && destY === u.uy) return false;

    return findtravelpath_bfs(destX, destY, u.ux, u.uy, false);
}

/**
 * C ref: hack.c findtravelpath(TRAVP_GUESS) — pick closest couldsee cell in
 * the travel matrix toward an unreachable target, then TRAVP_TRAVEL to it.
 * Full guess matrix / travelmap cycle-break deferred; one greedy guess step.
 */
function findtravelpath_guess() {
    const u = game.u;
    const destX = u.tx | 0;
    const destY = u.ty | 0;
    if (!isok(destX, destY)) return false;
    if (destX === u.ux && destY === u.uy) return false;

    // If a normal path exists, GUESS is unused — caller already tried TRAVEL.
    // Pick nearest couldsee walkable cell toward the target.
    let bestX = u.ux;
    let bestY = u.uy;
    let bestDist = Math.max(Math.abs(destX - u.ux), Math.abs(destY - u.uy));
    let bestD2 = dist2(u.ux, u.uy, destX, destY);
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (!couldsee(x, y) || blocksMove(x, y) || boulder_at(x, y)) continue;
            const nd = Math.max(Math.abs(destX - x), Math.abs(destY - y));
            const nd2 = dist2(x, y, destX, destY);
            if (nd < bestDist || (nd === bestDist && nd2 < bestD2)) {
                bestX = x;
                bestY = y;
                bestDist = nd;
                bestD2 = nd2;
            }
        }
    }
    if (bestX === u.ux && bestY === u.uy) {
        // C: general direction sgn step if TEST_MOVE ok
        const dx = Math.sign(destX - u.ux);
        const dy = Math.sign(destY - u.uy);
        if (!dx && !dy) return false;
        const nx = u.ux + dx;
        const ny = u.uy + dy;
        if (!isok(nx, ny) || blocksMove(nx, ny) || boulder_at(nx, ny)) return false;
        u.dx = dx;
        u.dy = dy;
        return true;
    }
    return findtravelpath_bfs(bestX, bestY, u.ux, u.uy, true);
}

/**
 * C-style BFS from (fromX,fromY) until (toX,toY)=hero is adjacent.
 * Sets u.dx/u.dy to step from hero onto the connecting neighbor.
 */
function findtravelpath_bfs(fromX, fromY, toX, toY, guessMode) {
    const u = game.u;
    // travel[x][y] = radius when first reached (0 = unseen)
    const travel = new Map();
    let cur = [{ x: fromX, y: fromY }];
    travel.set(`${fromX},${fromY}`, 1);
    let radius = 1;

    while (cur.length) {
        const next = [];
        for (const { x, y } of cur) {
            // C: closed door / boulder on *current* cell → delay (skip expand)
            if (closed_door_at(x, y) || boulder_at(x, y)) continue;

            for (const dir of DIRS_ORD) {
                const nx = x + xdir[dir];
                const ny = y + ydir[dir];
                if (!isok(nx, ny)) continue;
                if (guessMode && !couldsee(nx, ny)) continue;
                if (blocksMove(nx, ny)) continue;
                // C TEST_TRAV: avoid pathing onto boulders when source also
                // has one; for tourists never enter boulder as a node so the
                // next hero step is never a push (C delays boulder cells).
                if (boulder_at(nx, ny)) continue;

                if (nx === toX && ny === toY) {
                    // Path reached hero from neighbor (x,y) → step onto it
                    u.dx = x - toX;
                    u.dy = y - toY;
                    // C: hack.c findtravelpath — when the step cell is the
                    // travel destination, stop after this step and clear
                    // travelcc (visited/travelmap "unsure" arm deferred).
                    if (!guessMode && x === fromX && y === fromY) {
                        nomul(0);
                        if (game.context) game.context.run = 8;
                        if (!game.iflags) game.iflags = {};
                        if (!game.iflags.travelcc) {
                            game.iflags.travelcc = { x: 0, y: 0 };
                        }
                        game.iflags.travelcc.x = 0;
                        game.iflags.travelcc.y = 0;
                    }
                    return true;
                }
                const key = `${nx},${ny}`;
                if (travel.has(key)) continue;
                const loc = game.level?.at(nx, ny);
                if (!loc) continue;
                if (!(loc.seenv || (!u.Blind && couldsee(nx, ny)))) continue;
                travel.set(key, radius);
                next.push({ x: nx, y: ny });
            }
        }
        cur = next;
        radius++;
        if (radius > COLNO * ROWNO) break;
    }
    return false;
}

/**
 * C ref: cmd.c dotravel_target — travel to iflags.travelcc / u.tx,u.ty.
 * @returns {Promise<number>} ECMD_*
 */
async function dotravel_target() {
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
    const tcc = game.iflags.travelcc;
    if (!isok(tcc.x, tcc.y)) {
        await pline('No travel destination set.');
        return ECMD_OK;
    }
    const u = game.u;
    if (u.ux === tcc.x && u.uy === tcc.y) {
        await pline('You are already here.');
        tcc.x = 0;
        tcc.y = 0;
        return ECMD_OK;
    }

    if (game.iflags) game.iflags.getloc_travelmode = false;
    if (!game.context) game.context = {};
    game.context.travel = 1;
    game.context.travel1 = 1;
    game.context.run = 8;
    game.context.nopick = 1;
    game.domove_attempting = (game.domove_attempting || 0) | DOMOVE_RUSH;

    if (!game.multi) game.multi = Math.max(COLNO, ROWNO);
    u.last_str_turn = 0;
    game.context.mv = 1;

    u.tx = tcc.x;
    u.ty = tcc.y;

    if (findtravelpath_travel() || findtravelpath_guess()) {
        await domove(u.dx || 0, u.dy || 0);
        if (game.context) {
            game.context.travel1 = 0;
            if (game.context.move !== 0) game.context.move = 1;
        }
    } else {
        end_running();
        game.context.move = 0;
    }
    return ECMD_TIME;
}

/**
 * C ref: cmd.c dotravel — '_' / #travel getpos then dotravel_target.
 * Branch envelope: cancel, already-here, adjacent step, greedy BFS step.
 * Menu getpos / full TEST_TRAV / GUESS / travelmap deferred.
 * @returns {Promise<number>} ECMD_*
 */
export async function dotravel() {
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
    const cc = {
        x: game.iflags.travelcc.x | 0,
        y: game.iflags.travelcc.y | 0,
    };
    if (cc.x === 0 && cc.y === 0) {
        cc.x = game.u.ux;
        cc.y = game.u.uy;
    }
    game.iflags.getloc_travelmode = true;

    // menu_requested getpos_menu path deferred — always free getpos
    await pline('Where do you want to travel to?');
    if ((await getpos(cc, true, 'the desired destination')) < 0) {
        game.iflags.getloc_travelmode = false;
        return ECMD_CANCEL;
    }

    game.iflags.travelcc.x = game.u.tx = cc.x;
    game.iflags.travelcc.y = game.u.ty = cc.y;
    return dotravel_target();
}

export async function continue_search() {
    if (!search_repeat_active()) {
        game._repeat_search = false;
        game.multi = 0;
        return false;
    }
    game.multi--;
    if (game.multi <= 0) {
        game._repeat_search = false;
        game.multi = 0;
    }
    // C: counted `Ns` re-invokes dosearch each multi tick
    await dosearch();
    game.context.move = 1;
    game.kickedloc = { x: 0, y: 0 };
    return true;
}

/**
 * C ref: cmd.c get_count — accumulate digit prefix; return next non-digit.
 * Does not clear the message window between digits (parse clears once after).
 * Echo "Count: N" when cnt > 9 (second digit), matching C clear+custompline.
 */
async function get_count() {
    if (!game.context) game.context = {};
    let cnt = 0;
    let showzero = false;
    let backspaced = false;
    for (;;) {
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (ch >= '0' && ch <= '9') {
            cnt = cnt * 10 + (key - 48);
            if (cnt > 500) cnt = 500;
            showzero = (ch === '0');
            backspaced = false;
        } else if (key === 8 || key === 127) {
            if (!cnt) {
                game.context.command_count = 0;
                return key;
            }
            showzero = false;
            cnt = Math.trunc(cnt / 10);
            backspaced = true;
        } else if (key === 27) {
            game.context.command_count = 0;
            return key;
        } else {
            game.context.command_count = cnt;
            return key;
        }

        // C: cnt > 9 || backspaced → clear + "Count: N"
        if (cnt > 9 || backspaced) {
            clear_nhwindow_message();
            const qbuf = (backspaced && !cnt && !showzero)
                ? 'Count: '
                : `Count: ${cnt}`;
            game._pending_message = qbuf;
            await flush_screen(1);
            const disp = game.nhDisplay;
            if (disp?.setCursor) disp.setCursor(qbuf.length, 0);
            backspaced = false;
        }
    }
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    // C: cmdq_pop before parse — fireassist swap/retry lives here
    const canned = (key === 0) ? cmdq_pop() : null;
    if (canned) {
        const res = await canned();
        // C: ECMD_TIME keeps remaining CQ_CANNED; cancel clears queue.
        if (res === 1) {
            game.context.move = 1;
            game.kickedloc = { x: 0, y: 0 };
        } else {
            if (res !== 0) cmdq_clear(); // cancel/fail
            game.context.move = 0;
        }
        return;
    }

    if (key === 0) {
        // C ref: cmd.c parse — flush, get_count (digits without clear), then
        // clear_nhwindow(WIN_MESSAGE) once before dispatching the command key.
        await flush_screen(1);
        if (!game.context) game.context = {};
        game.context.command_count = 0;
        key = await get_count();
        clear_nhwindow_message();
        if (key === 27) {
            // C: ESC cancels count
            game.context.command_count = 0;
            game.context.move = 0;
            return;
        }
    }

    // C ref: cmd.c rhack — clear nopick each command; menu_requested kept
    // across PREFIXCMD (m) until the following movement consumes it.
    if (game.context) game.context.nopick = 0;

    const ch = String.fromCharCode(key);
    // C ref: reset_commands bind C(dir) → do_rush_*; e.g. C('j')=='\n' south
    const rushDir = rushDirFromCtrl(key);

    // C: non-prefix command after F drops the fight prefix (feedback deferred)
    if (ch !== 'F' && ch !== 'm' && !isMovementKey(ch) && !isRunKey(ch)
        && !rushDir && game.context?.forcefight) {
        game.context.forcefight = 0;
        game.domove_attempting = 0;
    }
    // C rhack: keep menu_requested for CMD_M_PREFIX commands (O→doset_simple
    // reads it to call doset). Drop only when the next command rejects 'm'.
    // Named omission: full accept_menu_prefix table — O/,/e/q/a/s/p/>/< enough
    // for current sessions; expand when m-prefix + other cmds desync.
    const accepts_m_prefix = ch === 'O' || ch === ',' || ch === 'e'
        || ch === 'q' || ch === 'a' || ch === 's' || ch === 'p'
        || ch === '>' || ch === '<';
    if (ch !== 'm' && !accepts_m_prefix && !isMovementKey(ch) && !isRunKey(ch)
        && !rushDir && game.iflags?.menu_requested) {
        game.iflags.menu_requested = false;
    }

    if (isMovementKey(ch)) {
        // C ref: cmd.c set_move_cmd(dir, 0) — clear stale travel; DOMOVE_WALK
        if (!game.context) game.context = {};
        game.context.travel = 0;
        game.context.travel1 = 0;
        if (!game.domove_attempting) {
            game.domove_attempting = DOMOVE_WALK;
        }
        await domove(DIR_DX[ch], DIR_DY[ch]);
        // C: forcefight cleared after DOMOVE_WALK domove
        if (game.context) game.context.forcefight = 0;
        // domove sets context.move = 0 if blocked; else leave as 1 (allmain preset)
        if (game.context.move !== 0) game.context.move = 1;
    } else if (isRunKey(ch) || rushDir) {
        // C ref: cmd.c do_run_* → run=1; do_rush_* (C(dir)) → run=3
        const low = rushDir || ch.toLowerCase();
        if (!game.context) game.context = {};
        // Pending F + capital/ctrl dir: forcefight one step (not rush)
        if (game.context.forcefight) {
            game.context.travel = 0;
            game.context.travel1 = 0;
            await domove(DIR_DX[low], DIR_DY[low]);
            game.context.forcefight = 0;
            if (game.context.move !== 0) game.context.move = 1;
        } else {
            // C: set_move_cmd(dir, run) — clears travel; capital run=1, Ctrl-rush=3
            // First step carries DOMOVE_RUSH; continue_run clears attempting
            // after each domove so later steps do not maybe_smudge_engr.
            game.context.travel = 0;
            game.context.travel1 = 0;
            if (!game.domove_attempting) {
                game.domove_attempting = DOMOVE_RUSH;
            }
            game.context.run = rushDir ? 3 : 1;
            game.context.mv = 1;
            if (!game.multi) game.multi = Math.max(COLNO, ROWNO);
            game.u.last_str_turn = 0;
            await domove(DIR_DX[low], DIR_DY[low]);
            if (game.context.move !== 0) game.context.move = 1;
        }
    } else if (ch === 'F') {
        // C ref: cmd.c do_fight — PREFIXCMD; no turn
        if (!game.context) game.context = {};
        if (game.context.forcefight) {
            game.context.forcefight = 0;
            game.domove_attempting = 0;
            game.context.move = 0;
            await pline('Double fight prefix, canceled.');
        } else {
            game.context.forcefight = 1;
            game.domove_attempting = (game.domove_attempting || 0) | DOMOVE_WALK;
            game.context.move = 0;
        }
    } else if (ch === 'm') {
        // C ref: cmd.c do_reqmenu — PREFIXCMD; sets iflags.menu_requested
        if (!game.iflags) game.iflags = {};
        if (game.iflags.menu_requested) {
            game.iflags.menu_requested = false;
            game.context.move = 0;
            await pline("Double m prefix, canceled.");
        } else {
            game.iflags.menu_requested = true;
            game.context.move = 0;
        }
    } else if (ch >= '0' && ch <= '9') {
        // Digits are consumed by get_count in parse (rhack(0)); reaching
        // here means rhack(key) with an explicit digit — treat as count
        // bump without a turn (rare multi/canned path).
        if (!game.context) game.context = {};
        const d = ch.charCodeAt(0) - 48;
        game.context.command_count = (game.context.command_count || 0) * 10 + d;
        if (game.context.command_count > 500) game.context.command_count = 500;
        game.context.move = 0;
        if (game.context.command_count > 9) {
            const qbuf = `Count: ${game.context.command_count}`;
            clear_nhwindow_message();
            game._pending_message = qbuf;
            await flush_screen(1);
            const disp = game.nhDisplay;
            if (disp?.setCursor) disp.setCursor(qbuf.length, 0);
        }
    } else if (ch === 'a') {
        // C ref: apply.c doapply
        const tookTime = await doapply();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (key === 4) { // Ctrl-D
        // C ref: dokick.c dokick — #kick
        const tookTime = await dokick();
        game.context.move = tookTime ? 1 : 0;
        // C: do NOT clear kickedloc after dokick — pets avoid it this turn
    } else if (ch === '.') {
        // C ref: do.c donull / cmd.c — wait; timed non-kick clears kickedloc
        const tookTime = await donull();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === ',') {
        // C ref: hack.c dopickup / cmd.c — `,` pickup
        const pickRes = await dopickup();
        game.context.move = (pickRes & ECMD_TIME) ? 1 : 0;
        if (pickRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'p') {
        // C ref: shk.c dopay / cmd.c — `p` pay shopping bill
        const payRes = await dopay();
        game.context.move = (payRes & ECMD_TIME) ? 1 : 0;
        if (payRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '>') {
        // C ref: do.c dodown / cmd.c — go down staircase
        const downRes = await dodown();
        game.context.move = (downRes & 0x01) ? 1 : 0;
        if (downRes & 0x01) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '<') {
        // C ref: do.c doup / cmd.c — go up staircase
        const upRes = await doup();
        game.context.move = (upRes & 0x01) ? 1 : 0;
        if (upRes & 0x01) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 's') {
        // C ref: detect.c dosearch + cmd.c set_occupation(f_text "searching")
        // parse already set multi = count-1; counted Ns → timed occupation.
        const n = game.context?.command_count || 0;
        if (game.context) game.context.command_count = 0;
        if (n > 1) {
            game.multi = n - 1;
            if (game.context) game.context.mv = 0;
            // C: if (f_text && !occupation && multi) set_occupation(dosearch,…)
            if (!game.occupation) set_occupation(dosearch, 'searching', game.multi);
        }
        const tookTime = await dosearch();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'd') {
        // C ref: do.c dodrop — drop an item
        const dropRes = await dodrop();
        game.context.move = (dropRes & ECMD_TIME) ? 1 : 0;
        if (dropRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'T') {
        // C ref: do_wear.c dotakeoff — take off armor/accessory
        const tookTime = await dotakeoff();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'w') {
        // C ref: wield.c dowield — wield a weapon
        const tookTime = await dowield();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'S') {
        // C ref: save.c dosave / cmd.c — #save (GENERALCMD, ECMD_OK)
        await dosave();
        game.context.move = 0;
    } else if (ch === 'O') {
        // C ref: options.c doset_simple / cmd.c — O options menu
        await doset_simple();
        game.context.move = 0;
    } else if (ch === '@') {
        // C ref: options.c dotogglepickup / cmd.c — @ autopickup toggle
        await dotogglepickup();
        game.context.move = 0;
    } else if (ch === '$') {
        // C ref: invent.c doprgold / cmd.c — #showgold (GENERALCMD)
        await doprgold();
        game.context.move = 0;
    } else if (ch === ')') {
        // C ref: invent.c doprwep / cmd.c — #seeweapon (GENERALCMD, WEAPON_SYM)
        await doprwep();
        game.context.move = 0;
    } else if (ch === '[') {
        // C ref: invent.c doprarm / cmd.c — #seearmor (GENERALCMD, ARMOR_SYM)
        await doprarm();
        game.context.move = 0;
    } else if (ch === '=') {
        // C ref: invent.c doprring / cmd.c — #seerings (GENERALCMD, RING_SYM)
        await doprring();
        game.context.move = 0;
    } else if (ch === '"') {
        // C ref: invent.c dopramulet / cmd.c — #seeamulet (GENERALCMD, AMULET_SYM)
        await dopramulet();
        game.context.move = 0;
    } else if (ch === '(') {
        // C ref: invent.c doprtool / cmd.c — #seetools (GENERALCMD, TOOL_SYM)
        await doprtool();
        game.context.move = 0;
    } else if (ch === '\x7f') {
        // C ref: cmd.c doterrain / #terrain — DEL key (\177)
        await doterrain();
        game.context.move = 0;
    } else if (ch === 'Q') {
        // C ref: wield.c dowieldquiver / doquiver_core("ready")
        const tookTime = await dowieldquiver();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '_') {
        // C ref: cmd.c dotravel — #travel / getpos destination
        const travelRes = await dotravel();
        game.context.move = (travelRes & ECMD_TIME) ? 1 : 0;
        if (travelRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'W') {
        // C ref: do_wear.c dowear — wear armor
        const tookTime = await dowear();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'P') {
        // C ref: do_wear.c doputon — put on accessory
        const tookTime = await doputon();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'i') {
        // C ref: invent.c ddoinv / display_inventory
        await ddoinv();
        game.context.move = 0;
    } else if (ch === 'e') {
        // C ref: eat.c doeat
        const tookTime = await doeat();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'q') {
        // C ref: potion.c dodrink / #quaff — ECMD_TIME bit only (CANCEL≠time)
        const drinkRes = await dodrink();
        game.context.move = (drinkRes & ECMD_TIME) ? 1 : 0;
        if (drinkRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'z') {
        // C ref: zap.c dozap / #zap
        const tookTime = await dozap();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'Z') {
        // C ref: spell.c docast / #cast
        const castRes = await docast();
        game.context.move = (castRes & 0x01) ? 1 : 0; // ECMD_TIME
        if (castRes & 0x01) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'r') {
        // C ref: read.c doread / #read
        const tookTime = await doread();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'E') {
        // C ref: engrave.c doengrave / #engrave
        // ECMD_OK setup; occupation consumes the following turn
        const tookTime = await doengrave();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 't') {
        // C ref: dothrow.c dothrow
        const tookTime = await dothrow();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'f') {
        // C ref: dothrow.c dofire — #fire / quiver shoot
        const tookTime = await dofire();
        // C: ECMD_OK after queueing fireassist keeps CQ_CANNED
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '+') {
        // C ref: spell.c dovspell
        await dovspell();
        game.context.move = 0;
    } else if (ch === '\\') {
        // C ref: o_init.c dodiscovered
        await dodiscovered();
        game.context.move = 0;
    } else if (key === 20) { // ^T — C('t') dotelecmd
        // C ref: teleport.c dotelecmd / cmd.c teleport
        const teleRes = await dotelecmd();
        game.context.move = (teleRes & 0x01) ? 1 : 0; // ECMD_TIME
    } else if (key === 24) { // ^X
        // C ref: insight.c enlightenment / doattributes
        await doattributes();
        game.context.move = 0;
    } else if (key === 23) { // ^W — C('w') wiz_wish
        // C ref: wizcmds.c wiz_wish / cmd.c wizwish
        await wiz_wish();
        game.context.move = 0;
    } else if (key === 22) { // ^V — C('v') wiz_level_tele
        // C ref: wizcmds.c wiz_level_tele / cmd.c wizlevelport
        await wiz_level_tele();
        game.context.move = 0;
    } else if (key === 7) { // ^G — C('g') wiz_genesis
        // C ref: wizcmds.c wiz_genesis / cmd.c wizgenesis
        await wiz_genesis();
        game.context.move = 0;
    } else if (ch === ':') {
        // C ref: invent.c dolook / lookat
        await dolook();
        game.context.move = 0;
    } else if (ch === '/') {
        // C ref: pager.c dowhatis / do_look — ECMD_OK, no turn
        await dowhatis();
        game.context.move = 0;
    } else if (ch === ';') {
        // C ref: cmd.c ';' → glance / pager.c doquickwhatis → do_look(1)
        await doquickwhatis();
        game.context.move = 0;
    } else if (ch === '?') {
        // C ref: pager.c dohelp — ECMD_OK, no turn
        await dohelp();
        game.context.move = 0;
    } else if (ch === '#') {
        // C ref: cmd.c doextcmd — returns callee ECMD_*; TIME keeps move
        const extRes = await doextcmd();
        game.context.move = (extRes & 0x01) ? 1 : 0; // ECMD_TIME
    } else if (key === 27) {
        // Esc — cancel run/count; no message
        // C ref: cmd.c / hack.c — ESC ends running and clears multi
        if (game.context?.run || (game.multi || 0) > 0) end_running();
        if (game.context) game.context.command_count = 0;
        game._repeat_search = false;
        game.context.move = 0;
    } else {
        // Unknown command (includes unbound space when !rest_on_space)
        if (game.context?.forcefight) game.context.forcefight = 0;
        if (game.context?.run || (game.multi || 0) > 0) end_running();
        if (game.context) game.context.command_count = 0;
        game._repeat_search = false;
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
async function domove(dx, dy) {
    const u = game.u;
    const forcefight = !!game.context?.forcefight;
    // C ref: hack.c domove — clear succeeded; clear attempting in finally
    game.domove_succeeded = 0;
    let smudgeCoords = null;

    try {
    // C ref: hack.c set_move_cmd — #reqmenu / m-prefix → nopick for this move
    if (game.iflags?.menu_requested) {
        if (!game.context) game.context = {};
        game.context.nopick = 1;
        game.iflags.menu_requested = false;
    }

    // C sets u.dx/u.dy before the blocked-move check (used by lookaround/run)
    u.dx = dx;
    u.dy = dy;
    u.ux0 = u.ux;
    u.uy0 = u.uy;

    // C ref: hack.c domove_core — impaired_movement after ux+dx (Confusion/
    // Stunned may rn2(5) then confdir). Named omissions ahead of this call:
    // carrying_too_much, uswallow, air_turbulence, slippery_ice_fumbling.
    if (impaired_movement()) {
        if (game.context?.run) end_running();
        return;
    }
    let newx = (u.ux | 0) + (u.dx | 0);
    let newy = (u.uy | 0) + (u.dy | 0);

    // C ref: hack.c domove_core — m_at / run-stop / attackmon BEFORE test_move
    // (closed_door / testdiag / rock). Diagonal intact-doorway bans must not
    // suppress attacking a monster on an adjacent cell (seed0012 @12439).
    // Named omissions: displacer swap; domove_bump_mon; mundetected Wait!;
    // full mon_visible Blind_telepat / Protection_from_shape amulet prop.
    let mtmp = mon_at(newx, newy);
    if (forcefight && !mtmp) {
        // C: F with no monster → fight_empty, waste turn
        await domove_fight_empty(newx, newy);
        if (game.context?.run) end_running();
        game.context.move = 1;
        game.kickedloc = { x: 0, y: 0 };
        return;
    }
    // C: don't attack if running and can see the non-safemon (pets ok).
    // forcefight never reaches this arm. Confdir into a visible hostile
    // must stop the run here — else JS burns a hit-roll rn2(20) while C
    // returns for nhgetch (seed0002 @11309).
    if (mtmp && !is_safemon(mtmp) && game.context?.run && !forcefight) {
        const Blind = !!(u.Blind || u.ublind
            || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));
        const ap = M_AP_TYPE(mtmp);
        const seenAsMon = (ap !== M_AP_FURNITURE && ap !== M_AP_OBJECT)
            || !!(u.Protection_from_shape_changers);
        if ((!Blind && mon_visible(mtmp) && seenAsMon) || sensemon(mtmp)) {
            nomul(0);
            game.context.move = 0;
            return;
        }
    }
    if (mtmp) {
        // C: domove_attackmon_at → do_attack (safemon may return false → swap)
        if (await do_attack(mtmp)) {
            if (game.context?.run) end_running();
            return;
        }
        // safemon displace: fall through; swap after test_move succeeds
    }

    // C ref: hack.c domove_core — u.utrap → trapmove before test_move
    // (attack already handled above; displaceu false when trapped).
    // Stuck / same-spot escape: return without context.move=0 (turn spends).
    if (u.utrap) {
        const moved = await trapmove(newx, newy, null);
        if (!(u.utrap | 0)) {
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
            // C: reset_utrap(TRUE) — Lev/Fly restore msgs deferred
            u.utrap = 0;
            u.utraptype = 0;
        }
        if (!moved) return;
    }

    // C ref: hack.c test_move — closed_door autoopen / orthogonal bump
    // Passes_walls / ooze / Underwater / tunnels / Blind feel_location /
    // steed lead-through deferred (named in c-js-map turns).
    // Fumbling ≡ Fumbling() H||E (D-0691/D-0696) — not sticky u.Fumbling.
    if (closed_door_at(newx, newy)) {
        if (!game.context) game.context = {};
        game.context.door_opened = false;
        // C: check !context.run BEFORE clearing run — rush must bump, not autoopen
        const autoopen = game.flags?.autoopen !== false;
        const impaired = !!(u.Confusion || u.Stunned || Fumbling());
        if (autoopen && !game.context.run && !impaired) {
            await doopen_indir(newx, newy);
            // C: door_opened = !closed_door; move = (pos changed) → usually 0.
            game.context.door_opened = !closed_door_at(newx, newy);
            game.context.move = 0;
            return;
        }
        // C: else if (x == ux || y == uy) — orthogonal only
        if (newx === u.ux || newy === u.uy) {
            const Blind = !!(u.Blind || u.ublind
                || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));
            if (Blind || u.Stunned || acurr(A_DEX) < 10 || Fumbling()) {
                await pline('Ouch!  You bump into a door.');
                exercise(A_DEX, false);
                // C: door_opened = move = TRUE; nomul(0) stops running
                game.context.door_opened = true;
                game.context.move = 1;
                nomul(0);
                return;
            }
            await pline('That door is closed.');
        }
        // C domove_core: !door_opened → move=0; nomul(0)
        game.context.move = 0;
        nomul(0);
        return;
    }

    // C ref: hack.c test_move testdiag — no diagonal into intact doorway
    // (open/closed/locked; only doorless D_NODOOR/D_BROKEN allowed).
    if (u.dx && u.dy) {
        const dest = game.level?.at(newx, newy);
        if (dest && IS_DOOR(dest.typ)
            && (!doorless_door(newx, newy) || block_door(newx, newy))) {
            if (game.context?.run) end_running();
            game.context.move = 0;
            return;
        }
        // C: diagonal out of a doorway that still has a door
        const here = game.level?.at(u.ux, u.uy);
        if (here && IS_DOOR(here.typ)
            && (!doorless_door(u.ux, u.uy) || false /* block_entry deferred */)) {
            if (game.context?.run) end_running();
            game.context.move = 0;
            return;
        }
    }

    if (blocksMove(newx, newy)) {
        // Can't move there — end a run so lookaround/continue_run don't
        // keep going in the previous direction with stale multi.
        if (game.context?.run) end_running();
        // C ref: hack.c test_move — DO_MOVE + mention_walls on rock/bars
        const bloc = game.level?.at(newx, newy);
        if (bloc && (IS_OBSTRUCTED(bloc.typ) || bloc.typ === IRONBARS)) {
            await mention_walls_obstructed(newx, newy);
        }
        // out-of-bounds move_out_of_bounds mention_walls deferred
        game.context.move = 0;
        return;
    }

    // C ref: hack.c test_move — sobj_at(BOULDER) → moverock before advance
    if (boulder_at(newx, newy)) {
        const mr = await moverock();
        if (mr < 0) {
            if (game.context?.run) end_running();
            game.context.move = 0;
            return;
        }
        // moverock pushed boulder(s); fall through to occupy vacated cell
    }

    // C ref: hack.c swim_move_danger — after test_move, before occupying cell
    if (await swim_move_danger(newx, newy)) {
        if (game.context?.run) end_running();
        game.context.move = 0;
        nomul(0);
        return;
    }

    const oldx = u.ux, oldy = u.uy;

    // C: after test_move — safemon displace/swap (attack already tried above)
    mtmp = mon_at(newx, newy);
    if (mtmp && is_safemon(mtmp)) {
        mtmp.mx = oldx;
        mtmp.my = oldy;
        // C ref: hack.c domove_swap_with_pet — x_monnam ARTICLE_YOUR
        // (named pet → bare MGIVENNAME, e.g. "Hachi")
        await pline(`You swap places with ${x_monnam_tame(mtmp)}.`);
    }

    // Move the hero (C u_on_newpos also updates usteed mx/my)
    u.ux = newx;
    u.uy = newy;
    if (u.usteed) {
        u.usteed.mx = newx;
        u.usteed.my = newy;
    }

    // C: ux changed → record DOMOVE_RUSH|WALK from attempting (hack.c:2964)
    game.domove_succeeded |= (game.domove_attempting || 0)
        & (DOMOVE_RUSH | DOMOVE_WALK);
    smudgeCoords = { oldx, oldy, newx, newy };

    // C ref: dungeon.c u_on_newpos — same-level → see_nearby_objects
    // (upgrade generic potion/gem/spellbook glyphs when within neardist).
    if (!u.Blind && !u.Hallucination && !u.uswallow) {
        see_nearby_objects();
    }

    // C ref: hack.c domove — clear kickedloc after a successful move
    game.kickedloc = { x: 0, y: 0 };

    // C: running stops on door / obstructed / furniture
    if (game.context?.run && game.context.run < 8) {
        const tmpr = game.level?.at(newx, newy);
        if (tmpr && (tmpr.typ === DOOR || IS_OBSTRUCTED(tmpr.typ)
            || IS_FURNITURE(tmpr.typ))) {
            end_running();
        }
    }

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);

    // C: if (u.umoved) spoteffects(TRUE) — autopickup / check_here look
    u.umoved = true;
    await spoteffects(true);
    } finally {
        // C ref: hack.c domove — smudge only when RUSH|WALK succeeded this step;
        // continue_run steps have attempting cleared → no rnd(5) (D-0359)
        if (smudgeCoords
            && ((game.domove_succeeded || 0) & (DOMOVE_RUSH | DOMOVE_WALK)) !== 0) {
            maybe_smudge_engr(
                smudgeCoords.oldx, smudgeCoords.oldy,
                smudgeCoords.newx, smudgeCoords.newy,
            );
        }
        game.domove_attempting = 0;
    }
}
