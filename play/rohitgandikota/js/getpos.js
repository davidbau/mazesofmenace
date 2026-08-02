// getpos.js — the map position picker.
// C ref: src/getpos.c
//
// Every command that targets a location routes through getpos(): jump,
// teleport, polearm, the travel command, and farlook's cursor loop. It runs
// its OWN key loop, so the keys a session feeds it are cursor movements and a
// pick, not commands.
//
// Nothing here draws RNG. What it does drive is the message window: the goal
// prompt, the autodescribe line repainted on every cursor move, and the tip
// window the first time the picker is entered.

import { game } from './gstate.js';
import { COLNO, ROWNO } from './const.js';
import { sgn, isok } from './hacklib.js';
import { nhgetch } from './input.js';
import { pline, flush_screen, glyph_at, tty_clear_nhwindow_message,
         TOPLINE_EMPTY } from './display.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { do_screen_description, is_cmap_wall, is_cmap_room, is_cmap_corr,
         is_cmap_door, is_cmap_engraving } from './pager.js';
import { handle_tip, TIP_GETPOS } from './hack.js';

const CM = cmap_names;

// include/hack.h:543-546 — which pick key was used.
export const LOOK_TRADITIONAL = 0; /* '.' -- ask about "more info?" */
export const LOOK_QUICK = 1;       /* ',' -- skip "more info?" */
export const LOOK_ONCE = 2;        /* ';' -- skip and stop looping */
export const LOOK_VERBOSE = 3;     /* ':' -- show more info w/o asking */

// src/cmd.c:3169-3172 — the pick keys, in the order their return values run.
const pick_chars = '.,;:';
const pick_chars_ret = [LOOK_TRADITIONAL, LOOK_QUICK, LOOK_ONCE, LOOK_VERBOSE];

// src/cmd.c dirchars — the same eight keys rhack() uses to move the hero move
// the cursor here; their shifted forms are the run variants (8 squares).
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function note_unported_getpos(what) {
    (game.unported ||= new Set()).add('getpos:' + what);
}

// C curs(WIN_MAP, cx, cy) — park the terminal cursor on the map square.
// _buildScreenOutput() honors game._map_cursor over the hero's position.
function curs_map(x, y) {
    game._map_cursor = { col: x - 1, row: y + 1 };
    const display = game?.nhDisplay;
    if (display) display.setCursor(x - 1, y + 1);
}

// src/getpos.c:640 auto_describe() — describe what the cursor sits on, on
// the top line, with no --More-- (the key that moved the cursor has already
// acknowledged the previous line).
async function auto_describe(cx, cy) {
    const cc = { x: cx, y: cy };
    const res = do_screen_description(cc, true, 0);
    if (res.found) {
        /* coord_desc() with the default whatis_coord ('none') is empty */
        if (game.iflags?.getloc_travelmode)
            /* " (no travel path)" needs is_valid_travelpt(); absent */
            note_unported_getpos('auto_describe:travelmode');
        /* src/getpos.c:655 — a command that set a validator through
           getpos_sethilite() marks squares it cannot use. */
        const invalid = (game.iflags?.autodescribe !== false
                         && getpos_getvalid && !getpos_getvalid(cx, cy))
                        ? ' (invalid target)' : '';
        await pline(`${res.firstmatch}${invalid}`);
        curs_map(cx, cy);
        flush_screen(0);
    }
}

/* src/getpos.c gp_getvalid — the validator the current command installed. */
let getpos_getvalid = null;

// src/getpos.c:1560 getpos_sethilite()
export function getpos_sethilite(gp_hilitefunc, gp_getvalidfunc) {
    getpos_getvalid = gp_getvalidfunc || null;
}

// src/getpos.c:729 truncate_to_map() — clamp a step to the map, adjusting the
// other axis so a diagonal that hits an edge slides along it rather than
// stopping.
function truncate_to_map(c, dx, dy) {
    if (c.x + dx < 1) {
        dy -= sgn(dy) * (1 - (c.x + dx));
        dx = 1 - c.x;                       /* so that (cx+dx == 1) */
    } else if (c.x + dx > COLNO - 1) {
        dy += sgn(dy) * ((COLNO - 1) - (c.x + dx));
        dx = (COLNO - 1) - c.x;
    }
    if (c.y + dy < 0) {
        dx -= sgn(dx) * (0 - (c.y + dy));
        dy = 0 - c.y;                       /* so that (cy+dy == 0) */
    } else if (c.y + dy > ROWNO - 1) {
        dx += sgn(dx) * ((ROWNO - 1) - (c.y + dy));
        dy = (ROWNO - 1) - c.y;
    }
    c.x += dx;
    c.y += dy;
}

// src/getpos.c:771 getpos() — move a cursor around the map and pick a square.
//
// Returns the LOOK_* value of the pick key, or -1 for ESC. ccp is updated in
// place, as C updates *ccp at exitgetpos.
//
// Not ported (each consumes its key and re-loops, so a session stays in
// step): the m/M/o/O/d/D/x/X/a/A/z/Z gather_locs cycling, the '!' menu, '$'
// hilite, '"' view filter, and the '?' help window (which in C also consumes
// its own dismiss keys — a session that presses it will desync until it is
// ported; recorded so the gap is visible).
export async function getpos(ccp, force, goal) {
    let result = 0;
    const c = { x: ccp.x, y: ccp.y };
    /* boolean msg_given = TRUE: clear message window by default */
    let msg_given = true;
    let show_goal_msg = false;
    let rushrun = false;

    if (await handle_tip(TIP_GETPOS))
        show_goal_msg = true; /* tip has overwritten prompt in mesg window */

    if (!goal)
        goal = 'desired location';
    if (game.flags?.verbose !== false) {
        await pline("(For instructions type a '?')");
        msg_given = true;
    }
    c.x = ccp.x;
    c.y = ccp.y;
    game.getposx = c.x;
    game.getposy = c.y;
    curs_map(c.x, c.y);
    flush_screen(0);

    for (;;) {
        if (show_goal_msg) {
            await pline(`Move cursor to ${goal}:`);
            curs_map(c.x, c.y);
            flush_screen(0);
            show_goal_msg = false;
        } else if (game.iflags?.autodescribe !== false && !msg_given) {
            await auto_describe(c.x, c.y);
        }

        rushrun = false;

        let ch = String.fromCharCode(await nhgetch());

        if (game.iflags?.autodescribe !== false)
            msg_given = false;

        if (ch === '\x1b') {
            c.x = c.y = -10;
            msg_given = true; /* force clear */
            result = -1;
            break;
        }
        /* c == cmd_from_func(do_run) 'G' or do_rush 'g' */
        if (ch === 'G' || ch === 'g') {
            ch = String.fromCharCode(await nhgetch());
            rushrun = true;
        }

        const pick = pick_chars.indexOf(ch);
        if (pick >= 0) {
            result = pick_chars_ret[pick];
            break;
        } else if (DIR_DX[ch] !== undefined && !rushrun) {
            /* movecmd(c, MV_WALK) */
            truncate_to_map(c, DIR_DX[ch], DIR_DY[ch]);
        } else if (DIR_DX[ch.toLowerCase()] !== undefined) {
            /* movecmd(c, MV_RUSH | MV_RUN): shifted letter, or a walk
               letter behind the 'g'/'G' prefix. iflags.getloc_moveskip
               defaults off, so the cursor jumps 8 squares. */
            const lc = ch.toLowerCase();
            truncate_to_map(c, 8 * DIR_DX[lc], 8 * DIR_DY[lc]);
        } else if (ch === '?') {
            /* getpos_help() puts up its own window and consumes its own
               dismiss keys; unported, and recorded loudly because a session
               that reaches it will desync */
            note_unported_getpos('help');
            show_goal_msg = true;
        } else if (ch === '#') {
            /* NHKF_GETPOS_AUTODESC — toggle */
            game.iflags = game.iflags || {};
            game.iflags.autodescribe = !(game.iflags.autodescribe !== false);
            await pline(`Automatic description ${
                game.flags?.verbose !== false
                    ? 'of features under cursor ' : ''}is ${
                game.iflags.autodescribe ? 'on' : 'off'}.`);
            if (!game.iflags.autodescribe)
                show_goal_msg = true;
            msg_given = true;
        } else if (ch === '@') {
            /* NHKF_GETPOS_SELF */
            c.x = game.u.ux;
            c.y = game.u.uy;
        } else if (ch === '*') {
            /* NHKF_GETPOS_MOVESKIP — toggle */
            game.iflags = game.iflags || {};
            game.iflags.getloc_moveskip = !game.iflags.getloc_moveskip;
            await pline(`${game.iflags.getloc_moveskip ? 'S' : 'Not s'}`
                + 'kipping over similar terrain when fastmoving the cursor.');
            msg_given = true;
        } else if ('mMoOdDxXaAzZ'.includes(ch) || ch === '!'
                   || ch === '$' || ch === '"') {
            /* gather_locs cycling, the menu, hilite and the view filter —
               each consumes only its own key */
            note_unported_getpos(`key:${ch}`);
        } else {
            if (!' \r\n\x1b'.includes(ch)) {
                /* look for a dungeon feature the typed symbol matches, and
                   jump the cursor to the next one (getpos.c:1046) */
                const matching = new Array(defsyms.length).fill(0);
                let k = 0;
                for (let sidx = 0; sidx < defsyms.length; sidx++) {
                    if (is_cmap_wall(sidx) || is_cmap_room(sidx)
                        || is_cmap_corr(sidx) || is_cmap_door(sidx)
                        || sidx === CM.S_ndoor)
                        continue;
                    const ds = defsyms[sidx];
                    if (!ds.explain) continue;
                    if (ch === ds.sym
                        || (ch === ds.ch && !ds.dec)
                        || (ch === '^' && sidx >= CM.S_arrow_trap
                            && sidx <= CM.S_trapped_chest)
                        || (ch === defsyms[CM.S_engroom].ch
                            && is_cmap_engraving(sidx)))
                        matching[sidx] = ++k;
                }
                if (k) {
                    let foundc = false;
                    for (let pass = 0; pass <= 1 && !foundc; pass++) {
                        const lo_y = (pass === 0) ? c.y : 0;
                        const hi_y = (pass === 0) ? ROWNO - 1 : c.y;
                        for (let ty = lo_y; ty <= hi_y && !foundc; ty++) {
                            const lo_x = (pass === 0 && ty === lo_y) ? c.x + 1 : 1;
                            const hi_x = (pass === 1 && ty === hi_y) ? c.x
                                                                     : COLNO - 1;
                            for (let tx = lo_x; tx <= hi_x; tx++) {
                                /* first, what is currently displayed */
                                const g = glyph_at(tx, ty);
                                if (g.kind === 'cmap' && matching[g.cmap]) {
                                    foundc = true;
                                } else if (game.level?.flags?.hero_memory) {
                                    /* then the remembered glyph */
                                    const rg = game.level.at(tx, ty)
                                        ?.remembered_glyph?.glyph;
                                    if (rg && rg.kind === 'cmap'
                                        && matching[rg.cmap])
                                        foundc = true;
                                }
                                /* last, actual terrain when seen — the
                                   back_to_glyph probe only matters for
                                   memory the display doesn't carry */
                                if (foundc) {
                                    c.x = tx;
                                    c.y = ty;
                                    if (msg_given) {
                                        tty_clear_nhwindow_message(
                                            game._topl_cury || 0);
                                        game._pending_message = '';
                                        game._toplin = TOPLINE_EMPTY;
                                        msg_given = false;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    if (!foundc) {
                        await pline(`Can't find dungeon feature '${ch}'.`);
                        msg_given = true;
                    }
                } else {
                    const note = !force
                        ? 'aborted'
                        : "use 'h', 'j', 'k', 'l' or '.'";
                    await pline(`Unknown direction: '${ch}' (${note}).`);
                    msg_given = true;
                }
                curs_map(c.x, c.y);
                flush_screen(0);
                continue;
            }
            /* quitchars: space/enter dismiss the picker */
            if (force) {
                curs_map(c.x, c.y);
                flush_screen(0);
                continue;
            }
            await pline('Done.');
            msg_given = false; /* suppress clear */
            c.x = -1;
            c.y = 0;
            result = 0; /* not -1 */
            break;
        }
        /* nxtc: */
        game.getposx = c.x;
        game.getposy = c.y;
        curs_map(c.x, c.y);
        flush_screen(0);
    }

    if (msg_given) {
        tty_clear_nhwindow_message(game._topl_cury || 0);
        game._pending_message = '';
        game._toplin = TOPLINE_EMPTY;
    }
    ccp.x = c.x;
    ccp.y = c.y;
    game.getposx = game.getposy = 0;
    game._map_cursor = null;
    return result;
}
