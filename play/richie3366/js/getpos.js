// getpos.js — Cursor-position selection (partial).
// C ref: getpos.c getpos / hack.c handle_tip(TIP_GETPOS).
//
// Branch envelope: verbose instruction pline, first-use getpos tip
// (nhcore show_getpos_tip), hjklyubn walk + HJKLYUBN/Ctrl-dir rush
// (8× step via truncate_to_map) + autodescribe topline,
// '.' → LOOK_TRADITIONAL, ESC → -1. Menu/jump/hilite/valids/
// getloc_moveskip glyph-skip deferred.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt } from './display.js';
import { COLNO, ROWNO, isok } from './const.js';
import { paint_corner_nhw_menu } from './invent.js';

export const LOOK_TRADITIONAL = 0;
export const LOOK_QUICK = 1;
export const LOOK_ONCE = 2;
export const LOOK_VERBOSE = 3;

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/** C('h')..C('n') → walk dir letter (num_pad off bind). */
const CTRL_DIR = {
    8: 'h', // C('h')
    10: 'j', // C('j')
    11: 'k', // C('k')
    12: 'l', // C('l')
    25: 'y', // C('y')
    21: 'u', // C('u')
    2: 'b', // C('b')
    14: 'n', // C('n')
};

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * C ref: getpos.c truncate_to_map — add dx,dy truncating at map edges.
 * Returns {x,y} after apply (mutates conceptually like C *cx/*cy).
 */
function truncate_to_map(cx, cy, dx, dy) {
    let x = cx;
    let y = cy;
    if (x + dx < 1) {
        dy -= sgn(dy) * (1 - (x + dx));
        dx = 1 - x;
    } else if (x + dx > COLNO - 1) {
        dy += sgn(dy) * ((COLNO - 1) - (x + dx));
        dx = (COLNO - 1) - x;
    }
    if (y + dy < 0) {
        dx -= sgn(dx) * (0 - (y + dy));
        dy = 0 - y;
    } else if (y + dy > ROWNO - 1) {
        dx += sgn(dx) * ((ROWNO - 1) - (y + dy));
        dy = (ROWNO - 1) - y;
    }
    return { x: x + dx, y: y + dy };
}

/**
 * C ref: nhcore.lua show_getpos_tip → nhlua.c nhl_text (NHW_MENU +
 * select_menu PICK_NONE) → wintty H2344 corner offx. Not NHW_TEXT
 * fullscreen; map under/left of the panel stays.
 */
async function show_getpos_tip() {
    // Exact nhcore.lua [[...]] lines (nhl_text splits on \n; wrap at 76).
    const lines = [
        'Tip: Farlooking or selecting a map location',
        '',
        'You are now in a "farlook" mode - the movement keys move the cursor,',
        'not your character.  Game time does not advance.  This mode is used',
        'to look around the map, or to select a location on it.',
        '',
        'When in this mode, you can press ESC to return to normal game mode,',
        'and pressing ? will show the key help.',
    ];
    await paint_corner_nhw_menu(lines, '(end) ');
    await flush_screen(1);
    await nhgetch();
    game._menu_overlay = false;
    await docrt();
    await flush_screen(1);
}

/**
 * C ref: getpos.c getpos — force unused for whatis (!quick).
 * Returns LOOK_* (>=0) or -1 on cancel. Updates ccp.x/ccp.y.
 */
export async function getpos(ccp, _force, goal, describeAt) {
    const g = game;
    if (!g.flags) g.flags = {};
    let cx = ccp.x | 0;
    let cy = ccp.y | 0;
    if (!isok(cx, cy)) {
        cx = g.u?.ux || 1;
        cy = g.u?.uy || 0;
    }

    let showGoalAfterTip = false;
    if (!g.context) g.context = {};
    if (!g.context.tips_given) g.context.tips_given = {};
    if (!g.context.tips_given.TIP_GETPOS) {
        g.context.tips_given.TIP_GETPOS = true;
        await show_getpos_tip();
        showGoalAfterTip = true;
    }

    if (g.flags.verbose !== false) {
        await pline("(For instructions type a '?')");
        // C: msg_given forces clear; whatis already may have pending --More--
    }

    if (showGoalAfterTip) {
        await pline(`Move cursor to ${goal || 'desired location'}:`);
    }

    const disp = g.nhDisplay;
    for (;;) {
        // C getpos: auto_describe / goal pline then curs(WIN_MAP) then readchar.
        // flush_screen/_buildScreenOutput resets cursor to hero for ordinary
        // topline messages — set getpos cursor *after* flush, like C curs().
        if (disp?.setCursor) {
            await flush_screen(1);
            disp.setCursor(cx - 1, cy + 1);
        } else {
            await flush_screen(1);
        }
        const key = await nhgetch();
        const ch = String.fromCharCode(key);

        if (key === 27) {
            ccp.x = -1;
            ccp.y = -1;
            g._pending_message = '';
            return -1;
        }

        if (ch === '.' || ch === ',' || ch === ':' || ch === ';') {
            ccp.x = cx;
            ccp.y = cy;
            // '.' → LOOK_TRADITIONAL (continue whatis loop); ',' often LOOK_ONCE
            return ch === ',' ? LOOK_ONCE : LOOK_TRADITIONAL;
        }

        // C ref: getpos.c movecmd(c, MV_WALK) → one step; MV_RUN (highc)
        // / MV_RUSH (C(dir)) → dx=8*u.dx (getloc_moveskip Off path).
        let walk = null;
        let rush = false;
        if (ch in DIR_DX) {
            walk = ch;
        } else if (ch.toLowerCase() in DIR_DX && ch !== ch.toLowerCase()) {
            // highc(dirchars) → MV_RUN
            walk = ch.toLowerCase();
            rush = true;
        } else if (key in CTRL_DIR) {
            // C(dirchars) → MV_RUSH (same 8-step path)
            walk = CTRL_DIR[key];
            rush = true;
        }

        if (walk) {
            let dx = DIR_DX[walk];
            let dy = DIR_DY[walk];
            if (rush) {
                // C: iflags.getloc_moveskip Off → 8*u.dx (glyph-skip omitted)
                dx *= 8;
                dy *= 8;
            }
            const next = truncate_to_map(cx, cy, dx, dy);
            cx = next.x;
            cy = next.y;
            if (typeof describeAt === 'function') {
                const brief = describeAt(cx, cy);
                if (brief) g._pending_message = brief;
            }
            continue;
        }

        // Space / other: ignore for this subset (no menu jump)
        if (ch === ' ' || ch === '\n' || ch === '\r') continue;
        if (ch === '?') {
            await pline('Move the cursor with hjklyubn; . selects; ESC cancels.');
            continue;
        }
    }
}
