// role.js — C ref: role.c.
import { ALIGNS, GENDERS, RACES, ROLES, ROLE_ALIGNMASK, ROLE_GENDMASK, ROLE_NONE, ROLE_RACEMASK, RSF_ALGNMNT, RSF_GENDER, RSF_RACE, RSF_ROLE, RSF_filter, rfilter } from './chargen_ui.js';
import { ok_align as ok_align_shared, ok_gend as ok_gend_shared, ok_race as ok_race_shared, ok_role as ok_role_shared, setrolefilter as setrolefilter_shared, str2align, str2gend, str2race, str2role } from './roles.js';
import { Hello as shk_Hello } from './shk.js'; // relocate-fns

// C ref: role.c:1358 clearrolefilter().  RSF_filter falls through to RSF_ROLE,
// so it clears the mask AND every role flag — a full reset.
export function clearrolefilter(which) {
    switch (which) {
    case RSF_filter:
        rfilter.mask = 0;   /* clear race, gender, and alignment filters */
        /* FALLTHRU */
    case RSF_ROLE:
        for (let i = 0; i < ROLES.length; i++) rfilter.roles[i] = false;
        break;
    case RSF_RACE:
        rfilter.mask &= ~ROLE_RACEMASK;
        break;
    case RSF_GENDER:
        rfilter.mask &= ~ROLE_GENDMASK;
        break;
    case RSF_ALGNMNT:
        rfilter.mask &= ~ROLE_ALIGNMASK;
        break;
    }
}

// C role.c:1284: use the shared parser with this chargen run's filter state.
export function setrolefilter(bufp) {
    return setrolefilter_shared(bufp, rfilter);
}

// C ref: role.c:1303 gotrolefilter().
export function gotrolefilter() {
    if (rfilter.mask) return true;
    for (let i = 0; i < ROLES.length; i++) if (rfilter.roles[i]) return true;
    return false;
}

export function ok_role(rolenum, racenum, gendnum, alignnum) {
    return ok_role_shared(rolenum, racenum, gendnum, alignnum, rfilter);
}

export function ok_race(rolenum, racenum, gendnum, alignnum) {
    return ok_race_shared(rolenum, racenum, gendnum, alignnum, rfilter);
}

export function ok_gend(rolenum, racenum, gendnum, _alignnum) {
    // C role.c:1107: share both fixed and random checks with this UI's filter.
    return ok_gend_shared(rolenum, racenum, gendnum, _alignnum, rfilter);
}

export function ok_align(rolenum, racenum, _gendnum, alignnum) {
    // C role.c:1172: share the compatibility checks with this UI's filter.
    return ok_align_shared(rolenum, racenum, _gendnum, alignnum, rfilter);
}

// pick_*: rigid (only one option → return it AND consume rn2(1) for parity)
// or random (consume rn2(n_valid) — caller-supplied via chargenRng).
// C ref: role.c:1015/1081/1146/1211.
//
// pickhow PICK_RIGID semantics:
//   gends_ok == 0 → return ROLE_NONE (no rn2)
//   gends_ok == 1 → fall through, rn2(1) consumed, returns the one valid idx
//   gends_ok > 1  → return ROLE_NONE (no rn2)
//
// The renderer reports "consumed rn2" via tracker.consume() so the chargenRng
// iterator stays aligned with C's recorded stream (rigid + user-'*' picks
// both appear in chargenRng).
function pick_race_rigid(rolenum, gendnum, alignnum, tracker) {
    let n = 0, last = -1;
    for (let i = 0; i < RACES.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) { n++; last = i; }
    }
    if (n !== 1) return ROLE_NONE;
    if (tracker) tracker.consume(1);
    return last;
}

function pick_gend_rigid(rolenum, racenum, alignnum, tracker) {
    let n = 0, last = -1;
    for (let i = 0; i < GENDERS.length; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) { n++; last = i; }
    }
    if (n !== 1) return ROLE_NONE;
    if (tracker) tracker.consume(1);
    return last;
}

function pick_align_rigid(rolenum, racenum, gendnum, tracker) {
    let n = 0, last = -1;
    for (let i = 0; i < ALIGNS.length; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) { n++; last = i; }
    }
    if (n !== 1) return ROLE_NONE;
    if (tracker) tracker.consume(1);
    return last;
}

// rigid_role_checks — when role is set, force missing facets that are
// uniquely determined.  C ref: role.c:1235-1281, called from plsel_startmenu
// (role.c:2814) before each menu open.
//
// Order matters: race then align then gender (mirrors C lines 1271-1279).
export function rigid_role_checks(state, tracker) {
    if (state.role !== ROLE_NONE) {
        if (state.race === ROLE_NONE)
            state.race = pick_race_rigid(state.role, state.gender, state.align, tracker);
        if (state.align === ROLE_NONE)
            state.align = pick_align_rigid(state.role, state.race, state.gender, tracker);
        if (state.gender === ROLE_NONE)
            state.gender = pick_gend_rigid(state.role, state.race, state.align, tracker);
    }
}

// C role.c:1698-1720: suffix namespaces are tried in this order, even for '*'.
export function plnamesuffix(name, state) {
    const [base, ...tokens] = name.split('-');
    for (const token of tokens) {
        for (const [key, parse] of [['role', str2role], ['race', str2race], ['gender', str2gend], ['align', str2align]]) {
            const value = parse(token);
            if (value !== ROLE_NONE) { state[key] = value; break; }
        }
    }
    return base.replace(/,/g, ' ');
}

export function Hello(mtmp) { return shk_Hello(mtmp); }
