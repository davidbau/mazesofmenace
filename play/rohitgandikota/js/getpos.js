// getpos.js — the map position picker.
// C ref: src/getpos.c
//
// Every command that targets a location routes through getpos(): jump, teleport,
// polearm, #terrain, the travel command. It runs its OWN key loop, so the keys a
// session feeds it are cursor movements and a pick, not commands. A port without
// it executes those letters as commands instead and every keystroke afterwards
// lands on the wrong one — seed4500's "#jump\n j.jjl." moves the hero three
// times and then runs the rest of the session out of step.
//
// Nothing here draws.

import { game } from './gstate.js';
import { COLNO, ROWNO } from './const.js';
import { sgn, isok } from './hacklib.js';
import { nhgetch } from './input.js';

// include/hack.h:543-546 — which pick key was used.
export const LOOK_TRADITIONAL = 0; /* '.' -- ask about "more info?" */
export const LOOK_QUICK = 1;       /* ',' -- skip "more info?" */
export const LOOK_ONCE = 2;        /* ';' -- skip and stop looping */
export const LOOK_VERBOSE = 3;     /* ':' -- show more info w/o asking */

// src/cmd.c:3169-3172 — the pick keys, in the order their return values run.
const pick_chars = '.,;:';
const pick_chars_ret = [LOOK_TRADITIONAL, LOOK_QUICK, LOOK_ONCE, LOOK_VERBOSE];

// src/cmd.c dirchars — the same eight keys rhack() uses to move the hero move
// the cursor here.
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

// src/getpos.c truncate_to_map() — clamp a step to the map, adjusting the other
// axis so a diagonal that hits an edge slides along it rather than stopping.
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
// The arms that need subsystems this port does not have — the m/M/o/O/d/D/x/X
// glyph-cycling keys, ^A autodescribe, the menu, help — all consume their key
// and continue the loop, which is what matters for keeping a session in step,
// so they are folded into the default arm rather than guessed at.
export async function getpos(ccp, force, goal) {
    let result = 0;
    const c = { x: ccp.x, y: ccp.y };

    game.getposx = c.x;
    game.getposy = c.y;

    for (;;) {
        const ch = String.fromCharCode(await nhgetch());

        if (ch === '\x1b') {
            c.x = c.y = -10;
            result = -1;
            break;
        }

        const pick = pick_chars.indexOf(ch);
        if (pick >= 0) {
            result = pick_chars_ret[pick];
            break;
        } else if (DIR_DX[ch] !== undefined) {
            truncate_to_map(c, DIR_DX[ch], DIR_DY[ch]);
        } else if (ch === '@') {
            c.x = game.u.ux;
            c.y = game.u.uy;
        }
        /* every other key is consumed and the loop continues, as C does for
           the keys it does not recognise */
    }

    ccp.x = c.x;
    ccp.y = c.y;
    game.getposx = game.getposy = 0;
    return result;
}
