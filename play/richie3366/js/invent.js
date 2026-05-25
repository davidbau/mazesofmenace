// invent.js — Minimal inventory display (invent.c / display.c).
// C ref: cmd.c #inventory → ddoinv() / display_inventory; invent.c update_inventory.

import { game } from './gstate.js';
import { paintIniInvStubIntoDisplay } from './ini_inv_stub.js';
import { contextLeavingTutorialActiveLikeC } from './tutorial_branch.js';
import { TTY_PICKINV_COL } from './display.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import { isHumanRogueChargenLikeC } from './u_init_link_rogue_invent.js';

/** C: display.c suppress_map_output() — avoid invent.c ↔ display.c import cycle. */
function suppressMapOutput() {
    const g = game;
    const ps = g.program_state || {};
    if (g.in_mklev || ps.saving || ps.restoring) return true;
    return false;
}

/** C: invent.c update_inventory() — persistent invent window (stub: no WIN_PERM). */
export function updateInventory() {
    if (!game.program_state?.in_moveloop) return;
    /* C: invent.c — defer / no-op some perm-invent refreshes while **`leaving_tutorial`** (tutorial exit). */
    if (contextLeavingTutorialActiveLikeC(game)) return;
    if (suppressMapOutput()) return;
    /* C: (*windowprocs.win_update_inventory)(0) — browser port has no side window yet */
}

/**
 * C: invent.c display_pickinv — tty overlay at column **28** on map rows (not full-screen erase).
 * Human Rogue **`seed0077`** lines match C recorder after **`applyRogueHumanLinkedInventAndWieldLikeC`**.
 * @param {import('./game_display.js').GameDisplay} display
 */
export function paintInventoryOverlayLikeC(display) {
    const g = game;
    const col = TTY_PICKINV_COL;
    if (isHumanRogueChargenLikeC(g) && g.invent) {
        const dq = g._rogueIniDaggerQuan | 0;
        let row = 1;
        display.putstr(col, row++, 'a - a +0 short sword (weapon in right hand)', NO_COLOR, 0);
        display.putstr(
            col,
            row++,
            `b - ${dq} +0 daggers (alternate weapons; not wielded)`,
            NO_COLOR,
            0,
        );
        display.putstr(col, row++, 'Armor', NO_COLOR, ATR_INVERSE);
        display.putstr(col, row++, 'c - an uncursed +1 leather armor (being worn)', NO_COLOR, 0);
        display.putstr(col, row++, 'Potions', NO_COLOR, ATR_INVERSE);
        display.putstr(col, row++, 'd - an uncursed potion of sickness', NO_COLOR, 0);
        display.putstr(col, row++, 'Tools', NO_COLOR, ATR_INVERSE);
        display.putstr(col, row++, 'e - an uncursed lock pick', NO_COLOR, 0);
        display.putstr(col, row++, 'f - an empty uncursed sack', NO_COLOR, 0);
        display.putstr(col, row, '(end)', NO_COLOR, 0);
        return;
    }
    paintIniInvStubIntoDisplay(display);
}

/** @param {import('./game_display.js').GameDisplay} display */
export function paintInventoryIntoDisplay(display) {
    if (contextLeavingTutorialActiveLikeC(game)) return;
    if (!isHumanRogueChargenLikeC(game) || !game.invent) {
        paintIniInvStubIntoDisplay(display);
    }
}
