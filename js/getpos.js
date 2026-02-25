// getpos.js -- Position selection UI highlight plumbing
// cf. getpos.c -- getpos_sethilite(), getpos_toggle_hilite_state(),
// getpos_refresh(), getpos() highlight lifecycle.

const HiliteNormalMap = 0;
const HiliteGoodposSymbol = 1;
const HiliteBackground = 2;
const HiliteStateCount = 3;

let getpos_hilitefunc = null;
let getpos_getvalid = null;
let getpos_hilite_state = HiliteGoodposSymbol;
let defaultHiliteState = HiliteGoodposSymbol;
let hiliteOn = false;

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

// cf. getpos.c:771
// Minimal JS stub: we do not have full interactive cursor UI yet.
// It still drives highlight on/off lifecycle exactly once per call.
export function getpos(ccp, _force = true, _goal = '') {
    if (getpos_hilitefunc && getpos_hilite_state === HiliteGoodposSymbol && !hiliteOn) {
        callHilite(true);
    }
    clearHiliteIfNeeded();
    if (ccp && typeof ccp === 'object') {
        const x = Number.isInteger(ccp.x) ? ccp.x : 0;
        const y = Number.isInteger(ccp.y) ? ccp.y : 0;
        if (mapxy_valid(x, y)) return 0;
    }
    return 0;
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
