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

const TARGET_FILTERS = ['all', 'monster', 'object', 'valid'];

function targetFilterLabel(filter) {
    switch (filter) {
    case 'monster': return 'monsters';
    case 'object': return 'objects';
    case 'valid': return 'valid squares';
    default: return 'all map squares';
    }
}

function collectTargets(map, filter) {
    if (!map) return [];
    const targets = [];
    const seen = new Set();
    const add = (x, y) => {
        if (!isok(x, y)) return;
        const k = `${x},${y}`;
        if (seen.has(k)) return;
        seen.add(k);
        targets.push({ x, y });
    };

    if (filter === 'monster' || filter === 'all') {
        const mons = Array.isArray(map.monsters) ? map.monsters : [];
        for (const mon of mons) {
            if (!mon || mon.dead) continue;
            add(mon.mx, mon.my);
        }
        if (filter === 'monster') {
            targets.sort((a, b) => (a.y - b.y) || (a.x - b.x));
            return targets;
        }
    }

    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (filter === 'object') {
                const objs = map.objectsAt ? map.objectsAt(x, y) : [];
                if (Array.isArray(objs) && objs.length > 0) add(x, y);
            } else if (filter === 'valid') {
                if (mapxy_valid(x, y)) add(x, y);
            } else if (filter === 'all') {
                add(x, y);
            }
        }
    }
    targets.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return targets;
}

function findTargetIndex(targets, cx, cy) {
    if (!targets.length) return -1;
    let idx = targets.findIndex(t => t.x === cx && t.y === cy);
    if (idx >= 0) return idx;
    idx = targets.findIndex(t => (t.y > cy) || (t.y === cy && t.x > cx));
    return idx >= 0 ? idx : 0;
}

function selectTargetFromMenu(display, targets, filter) {
    if (!targets.length) return null;
    if (typeof display?.putstr_message === 'function') {
        const count = Math.min(targets.length, 9);
        const opts = [];
        for (let i = 0; i < count; i++) {
            opts.push(`${i + 1}:${targets[i].x},${targets[i].y}`);
        }
        display.putstr_message(`Targets (${targetFilterLabel(filter)}): ${opts.join(' ')} (1-9)`);
    }
    return 'pending';
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
    const homeX = cx;
    const homeY = cy;
    let targetFilter = 'all';
    let menuTargets = null;
    try {
        for (;;) {
            const ch = await nhgetch();
            const c = String.fromCharCode(ch);

            if (menuTargets && ch >= 49 && ch <= 57) { // '1'..'9'
                const idx = ch - 49;
                if (idx >= 0 && idx < menuTargets.length) {
                    const t = menuTargets[idx];
                    restoreCursor(display, cursorState);
                    cx = t.x;
                    cy = t.y;
                    cursorState = putCursor(display, cx, cy);
                }
                menuTargets = null;
                continue;
            }
            menuTargets = null;

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
            if (c === '@') {
                restoreCursor(display, cursorState);
                cx = homeX;
                cy = homeY;
                cursorState = putCursor(display, cx, cy);
                continue;
            }
            if (c === 'f') {
                const cur = TARGET_FILTERS.indexOf(targetFilter);
                targetFilter = TARGET_FILTERS[(cur + 1) % TARGET_FILTERS.length];
                if (typeof display?.putstr_message === 'function') {
                    display.putstr_message(`Target filter: ${targetFilterLabel(targetFilter)}.`);
                }
                continue;
            }
            if (c === '[' || c === ']') {
                const targets = collectTargets(getposContext.map, targetFilter);
                if (!targets.length) {
                    if (typeof display?.putstr_message === 'function') {
                        display.putstr_message(`No ${targetFilterLabel(targetFilter)} targets.`);
                    }
                    continue;
                }
                const idx = findTargetIndex(targets, cx, cy);
                const delta = c === ']' ? 1 : -1;
                const next = targets[(idx + delta + targets.length) % targets.length];
                restoreCursor(display, cursorState);
                cx = next.x;
                cy = next.y;
                cursorState = putCursor(display, cx, cy);
                continue;
            }
            if (c === '=') {
                const targets = collectTargets(getposContext.map, targetFilter);
                const pick = selectTargetFromMenu(display, targets, targetFilter);
                if (pick === 'pending') {
                    menuTargets = targets.slice(0, 9);
                }
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
