// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: movement, search, inventory / look / spell / discoveries /
// attributes for seed8000. Contestants should add: kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, see_nearby_objects } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, CORR, ROOM, IRONBARS,
         D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN,
         IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_STWALL,
         ACCESSIBLE, isok,
         ECMD_OK, ECMD_TIME, ECMD_CANCEL, DOMOVE_RUSH, DOMOVE_WALK } from './const.js';
import { dist2 } from './mon.js';
import {
    ddoinv, dodiscovered, doattributes, dolook, doprgold, doprwep, doprarm,
    doprring, dopramulet, doprtool,
} from './invent.js';
import { dovspell, docast } from './spell.js';
import { doeat } from './eat.js';
import { dodrink } from './potion.js';
import { dozap } from './zap.js';
import { doread } from './read.js';
import { doengrave, maybe_smudge_engr } from './engrave.js';
import { dothrow, dofire } from './dothrow.js';
import { doapply } from './apply.js';
import { dokick } from './dokick.js';
import { donull, dodown, dodrop } from './do.js';
import { dosave } from './save.js';
import { do_attack, mon_at, is_safemon } from './uhitm.js';
import { doopen_indir } from './lock.js';
import { doextcmd } from './getline.js';
import { dosearch, doterrain } from './detect.js';
import { dotakeoff, dowear, doputon } from './do_wear.js';
import { wiz_wish } from './wizcmds.js';
import { dowield, dowieldquiver } from './wield.js';
import { dowhatis, doquickwhatis, dohelp } from './pager.js';
import { x_monnam_tame } from './do_name.js';
import { spoteffects, dopickup } from './pickup.js';
import { getpos } from './getpos.js';
import { nomul, moverock, boulder_at } from './hack.js';

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
 * Blind / traps / pools / NODIAG / mention_walls deferred.
 * Ported: monster stop rules + run==1/3/8 corridor-follow turn (capital rush).
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
        if (!findtravelpath_travel()) {
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

/**
 * C ref: hack.c findtravelpath(TRAVP_TRAVEL) — adjacent short-circuit +
 * one greedy BFS step toward u.tx/u.ty. Full TEST_TRAV / GUESS / travelmap
 * / boulder-door delay named omitted in C-JS-MAP.
 * Sets u.dx/u.dy when a step is found; returns true if path step ready.
 */
function findtravelpath_travel() {
    const u = game.u;
    const tx = u.tx | 0;
    const ty = u.ty | 0;
    if (!isok(tx, ty)) return false;

    const ctx = game.context;
    // Adjacent reachable → normal one-step move; clear travel destination
    if (ctx?.travel1
        && Math.abs(tx - u.ux) <= 1 && Math.abs(ty - u.uy) <= 1
        && (tx !== u.ux || ty !== u.uy)
        && !blocksMove(tx, ty)) {
        end_running();
        u.dx = tx - u.ux;
        u.dy = ty - u.uy;
        nomul(0);
        if (!game.iflags) game.iflags = {};
        if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
        game.iflags.travelcc.x = 0;
        game.iflags.travelcc.y = 0;
        return true;
    }

    if (tx === u.ux && ty === u.uy) return false;

    // Greedy BFS from hero toward target (seen/walkable cells only).
    // C expands from target; step selection dx/dy from neighbor of hero.
    const visited = new Set();
    const q = [{ x: u.ux, y: u.uy, px: 0, py: 0, first: true }];
    visited.add(`${u.ux},${u.uy}`);
    const dirs = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];
    while (q.length) {
        const cur = q.shift();
        for (const [dx, dy] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (!isok(nx, ny) || blocksMove(nx, ny)) continue;
            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            visited.add(key);
            const stepDx = cur.first ? dx : cur.px;
            const stepDy = cur.first ? dy : cur.py;
            if (nx === tx && ny === ty) {
                u.dx = stepDx;
                u.dy = stepDy;
                return true;
            }
            const loc = game.level?.at(nx, ny);
            // Prefer explored/seen like C seenv|couldsee — seenv gate soft
            if (loc && (loc.seenv || loc.typ === ROOM || loc.typ === CORR
                || loc.typ === DOOR || IS_FURNITURE(loc.typ))) {
                q.push({
                    x: nx, y: ny,
                    px: stepDx, py: stepDy,
                    first: false,
                });
            }
        }
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

    if (findtravelpath_travel()) {
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
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    // Clear prior message when a new command begins (after screen capture).
    game._pending_message = '';

    const ch = String.fromCharCode(key);
    // C ref: reset_commands bind C(dir) → do_rush_*; e.g. C('j')=='\n' south
    const rushDir = rushDirFromCtrl(key);

    // C: non-prefix command after F drops the fight prefix (feedback deferred)
    if (ch !== 'F' && !isMovementKey(ch) && !isRunKey(ch) && !rushDir
        && game.context?.forcefight) {
        game.context.forcefight = 0;
        game.domove_attempting = 0;
    }

    if (isMovementKey(ch)) {
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
            await domove(DIR_DX[low], DIR_DY[low]);
            game.context.forcefight = 0;
            if (game.context.move !== 0) game.context.move = 1;
        } else {
            // C: set_move_cmd(dir, run) — capital run=1, Ctrl-rush=3
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
    } else if (ch >= '0' && ch <= '9') {
        // C ref: cmd.c digit → get_count / command_count (no turn)
        // Echo "Count: N" once the value exceeds 9 (second digit).
        if (!game.context) game.context = {};
        const d = ch.charCodeAt(0) - 48;
        game.context.command_count = (game.context.command_count || 0) * 10 + d;
        if (game.context.command_count > 500) game.context.command_count = 500;
        game.context.move = 0;
        if (game.context.command_count > 9) {
            const qbuf = `Count: ${game.context.command_count}`;
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
    } else if (ch === '>') {
        // C ref: do.c dodown / cmd.c — go down staircase
        const downRes = await dodown();
        game.context.move = (downRes & 0x01) ? 1 : 0;
        if (downRes & 0x01) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 's') {
        // C ref: detect.c dosearch — takes a turn unless safety cancels
        const n = game.context?.command_count || 0;
        if (game.context) game.context.command_count = 0;
        if (n > 1) {
            // C: multi = command_count; first search is this turn, rest via multi
            game.multi = n - 1;
            game.context.mv = 0;
            game._repeat_search = true;
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
    } else if (key === 24) { // ^X
        // C ref: insight.c enlightenment / doattributes
        await doattributes();
        game.context.move = 0;
    } else if (key === 23) { // ^W — C('w') wiz_wish
        // C ref: wizcmds.c wiz_wish / cmd.c wizwish
        await wiz_wish();
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
    const newx = u.ux + dx;
    const newy = u.uy + dy;
    const forcefight = !!game.context?.forcefight;

    // C sets u.dx/u.dy before the blocked-move check (used by lookaround/run)
    u.dx = dx;
    u.dy = dy;
    u.ux0 = u.ux;
    u.uy0 = u.uy;

    // C ref: hack.c — F with no (attackable) monster → fight_empty, waste turn
    // before closed-door / blocksMove early outs.
    if (forcefight) {
        const mtmp = mon_at(newx, newy);
        if (mtmp) {
            if (await do_attack(mtmp)) {
                if (game.context?.run) end_running();
                return;
            }
            // safemon + forcefight: do_attack proceeds to hit; if it returned
            // false without attacking, fall through (rare)
        } else {
            await domove_fight_empty(newx, newy);
            if (game.context?.run) end_running();
            // Took a turn attacking empty/solid
            game.context.move = 1;
            game.kickedloc = { x: 0, y: 0 };
            return;
        }
    }

    // C ref: hack.c test_move — closed_door + flags.autoopen → doopen_indir
    if (closed_door_at(newx, newy)) {
        if (game.context?.run) end_running();
        // C: autoopen default On; skip when run / Confusion / Stunned / Fumbling
        const autoopen = game.flags?.autoopen !== false;
        const impaired = !!(u.Confusion || u.Stunned || u.Fumbling);
        if (autoopen && !game.context?.run && !impaired) {
            await doopen_indir(newx, newy);
            // C: door_opened = !closed_door; move = (pos changed) → usually 0.
            // Both open and resist leave context.move false for autoopen.
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    // C ref: hack.c test_move testdiag — no diagonal into intact doorway
    // (open/closed/locked; only doorless D_NODOOR/D_BROKEN allowed).
    if (dx && dy) {
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

    const oldx = u.ux, oldy = u.uy;

    // C ref: hack.c — monster at destination → do_attack (pets via safemon)
    const mtmp = mon_at(newx, newy);
    if (mtmp) {
        // C: domove_attackmon_at → do_attack
        if (await do_attack(mtmp)) {
            // Move consumed (stopped for pet in the way, or attacked)
            if (game.context?.run) end_running();
            return;
        }
        // do_attack returned false → displace/swap with safemon
        if (is_safemon(mtmp)) {
            mtmp.mx = oldx;
            mtmp.my = oldy;
            // C ref: hack.c domove_swap_with_pet — x_monnam ARTICLE_YOUR
            // (named pet → bare MGIVENNAME, e.g. "Hachi")
            await pline(`You swap places with ${x_monnam_tame(mtmp)}.`);
        }
    }

    // Move the hero (C u_on_newpos also updates usteed mx/my)
    u.ux = newx;
    u.uy = newy;
    if (u.usteed) {
        u.usteed.mx = newx;
        u.usteed.my = newy;
    }

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
    // C ref: hack.c domove — after domove_core (incl. spoteffects), on
    // DOMOVE_RUSH|DOMOVE_WALK success: maybe_smudge_engr(ux0,uy0,ux,uy)
    maybe_smudge_engr(oldx, oldy, newx, newy);
}
