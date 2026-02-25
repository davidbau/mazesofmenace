// getpos.js -- Position selection UI and highlight plumbing
// cf. getpos.c -- getpos_sethilite(), getpos_toggle_hilite_state(),
// getpos_refresh(), getpos() lifecycle.

import { MAP_ROW_START, COLNO, ROWNO, isok } from './config.js';
import { nhgetch } from './input.js';

const HiliteNormalMap = 0;
const HiliteGoodposSymbol = 1;
const HiliteBackground = 2;
const HiliteStateCount = 3;

let getpos_hilitefunc = null;
let getpos_getvalid = null;
let getpos_hilite_state = HiliteGoodposSymbol;
let defaultHiliteState = HiliteGoodposSymbol;
let hiliteOn = false;
let getposContext = {
    map: null,
    display: null,
    flags: null,
    goalPrompt: null,
};

function callHilite(on) {
    if (typeof getpos_hilitefunc !== 'function') return;
    getpos_hilitefunc(!!on);
    hiliteOn = !!on;
}

function clearHiliteIfNeeded() {
    if (!hiliteOn) return;
    callHilite(false);
}

function applyHiliteForCurrentState() {
    if (!getpos_hilitefunc) return;
    if (getpos_hilite_state === HiliteGoodposSymbol) {
        callHilite(true);
    }
}

// cf. getpos.c:41
export function getpos_sethilite(gp_hilitef, gp_getvalidf) {
    clearHiliteIfNeeded();
    getpos_hilitefunc = (typeof gp_hilitef === 'function') ? gp_hilitef : null;
    getpos_getvalid = (typeof gp_getvalidf === 'function') ? gp_getvalidf : null;
    getpos_hilite_state = defaultHiliteState;
    applyHiliteForCurrentState();
}

// cf. getpos.c:72
export function getpos_toggle_hilite_state() {
    if (!getpos_hilitefunc) return;
    clearHiliteIfNeeded();
    getpos_hilite_state = (getpos_hilite_state + 1) % HiliteStateCount;
    applyHiliteForCurrentState();
}

// cf. getpos.c:94
export function mapxy_valid(x, y) {
    if (typeof getpos_getvalid !== 'function') return true;
    return !!getpos_getvalid(x, y);
}

// cf. getpos.c:753
export function getpos_refresh() {
    clearHiliteIfNeeded();
    getpos_hilite_state = defaultHiliteState;
    applyHiliteForCurrentState();
}

function screenPosForMap(display, x, y) {
    const mapOffset = display?.flags?.msg_window ? 3 : MAP_ROW_START;
    return { col: x - 1, row: y + mapOffset };
}

function getCell(display, col, row) {
    const cell = display?.grid?.[row]?.[col];
    if (!cell) return { ch: ' ', color: 7, attr: 0 };
    return { ch: cell.ch, color: cell.color, attr: cell.attr || 0 };
}

function putCursor(display, x, y) {
    const { col, row } = screenPosForMap(display, x, y);
    const prev = getCell(display, col, row);
    if (typeof display?.setCell === 'function') display.setCell(col, row, 'X', 14, 0);
    if (typeof display?.flush === 'function') display.flush();
    return { col, row, prev };
}

function restoreCursor(display, cursorState) {
    if (!cursorState) return;
    if (typeof display?.setCell === 'function') {
        display.setCell(
            cursorState.col,
            cursorState.row,
            cursorState.prev.ch,
            cursorState.prev.color,
            cursorState.prev.attr || 0
        );
    }
    if (typeof display?.flush === 'function') display.flush();
}

function moveDeltaForChar(c) {
    switch (c) {
    case 'h': return [-1, 0];
    case 'j': return [0, 1];
    case 'k': return [0, -1];
    case 'l': return [1, 0];
    case 'y': return [-1, -1];
    case 'u': return [1, -1];
    case 'b': return [-1, 1];
    case 'n': return [1, 1];
    default: return null;
    }
}

function clampMove(cx, cy, dx, dy) {
    const nx = Math.min(COLNO - 1, Math.max(1, cx + dx));
    const ny = Math.min(ROWNO - 1, Math.max(0, cy + dy));
    return [nx, ny];
}

function cursorDesc(display, x, y) {
    const { col, row } = screenPosForMap(display, x, y);
    const info = display?.cellInfo?.[row]?.[col];
    return info?.name || '';
}

export function set_getpos_context(ctx = {}) {
    getposContext = {
        ...getposContext,
        ...ctx,
    };
}

// cf. getpos.c:771
export async function getpos_async(ccp, force = true, goal = '') {
    const display = getposContext.display;
    if (!ccp || typeof ccp !== 'object') return -1;

    let cx = Number.isInteger(ccp.x) ? ccp.x : 1;
    let cy = Number.isInteger(ccp.y) ? ccp.y : 0;
    if (!isok(cx, cy)) {
        cx = 1;
        cy = 0;
    }

    if (typeof display?.putstr_message === 'function') {
        const promptGoal = goal || getposContext.goalPrompt || 'desired location';
        display.putstr_message(`Move cursor to ${promptGoal}:`);
    }
    if (getpos_hilitefunc && getpos_hilite_state === HiliteGoodposSymbol && !hiliteOn) {
        callHilite(true);
    }

    let cursorState = putCursor(display, cx, cy);
    try {
        for (;;) {
            const ch = await nhgetch();
            const c = String.fromCharCode(ch);

            if (ch === 27) {
                ccp.x = -10;
                ccp.y = -10;
                return -1;
            }
            if (c === '.' || c === ',' || c === ';' || c === ':' || ch === 13 || ch === 10) {
                ccp.x = cx;
                ccp.y = cy;
                if (c === ',') return 1;
                if (c === ';') return 2;
                if (c === ':') return 3;
                return 0;
            }
            if (c === '?') {
                if (typeof display?.putstr_message === 'function') {
                    display.putstr_message("Use hjklyubn/arrow keys to move, . to pick, ESC to cancel.");
                }
                continue;
            }
            if (c === '^' || c === 'm') {
                restoreCursor(display, cursorState);
                getpos_toggle_hilite_state();
                cursorState = putCursor(display, cx, cy);
                continue;
            }
            if (ch === 18) { // ^R
                restoreCursor(display, cursorState);
                getpos_refresh();
                cursorState = putCursor(display, cx, cy);
                continue;
            }

            const lower = c.toLowerCase();
            const delta = moveDeltaForChar(lower);
            if (delta) {
                const steps = (c !== lower) ? 8 : 1;
                let nx = cx;
                let ny = cy;
                for (let i = 0; i < steps; i++) {
                    const moved = clampMove(nx, ny, delta[0], delta[1]);
                    nx = moved[0];
                    ny = moved[1];
                }
                if (nx !== cx || ny !== cy) {
                    restoreCursor(display, cursorState);
                    cx = nx;
                    cy = ny;
                    cursorState = putCursor(display, cx, cy);
                    const desc = cursorDesc(display, cx, cy);
                    if (desc && typeof display?.putstr_message === 'function') {
                        display.putstr_message(desc);
                    }
                }
                continue;
            }

            if (!force) {
                ccp.x = cx;
                ccp.y = cy;
                return 0;
            }
        }
    } finally {
        restoreCursor(display, cursorState);
        clearHiliteIfNeeded();
        getpos_hilitefunc = null;
        getpos_getvalid = null;
    }
}

export function getpos_clear_hilite() {
    clearHiliteIfNeeded();
    getpos_sethilite(null, null);
}

export {
    HiliteNormalMap,
    HiliteGoodposSymbol,
    HiliteBackground,
};
