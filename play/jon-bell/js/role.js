// role.js — C ref: role.c.
import { ALIGNS, GENDERS, RACES, ROLES, ROLE_ALIGNMASK, ROLE_GENDMASK, ROLE_NONE, ROLE_RACEMASK, RSF_ALGNMNT, RSF_GENDER, RSF_RACE, RSF_ROLE, RSF_filter, rfilter } from './chargen_ui.js';
import { ok_align, ok_gend, ok_race, ok_role, str2align, str2gend, str2race, str2role } from './roles.js';
import { game } from './gstate.js';
import { PM_KNIGHT, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_SHOPKEEPER, PM_MAIL_DAEMON } from './pm.generated.js';

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

// C role.c:1284 setrolefilter(): single port lives in roles.js (its default
// filter is gr.rfilter, the same object as chargen_ui's rfilter).
export { setrolefilter } from './roles.js';

// C ref: role.c:1303 gotrolefilter().
export function gotrolefilter() {
    if (rfilter.mask) return true;
    for (let i = 0; i < ROLES.length; i++) if (rfilter.roles[i]) return true;
    return false;
}

// C role.c:1005/1072/1107/1172 ok_role/ok_race/ok_gend/ok_align(): single
// port lives in roles.js, filtering on gr.rfilter (shared with chargen_ui).
export { ok_role, ok_race, ok_gend, ok_align };

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

// C hacklib.c:601 findword(): word of wordlen chars in a space-separated list.
function findword(list, word, wordlen, ignorecase) {
    const w = word.slice(0, wordlen);
    for (const p of list.split(' ')) {
        if (!p) continue;
        if (ignorecase ? p.toLowerCase() === w.toLowerCase() : p === w) return p;
    }
    return null;
}

// C role.c:1665-1720 plnamesuffix().  opts.genericusers is sysopt.genericusers
// (null in this build's sysopt) and opts.plnamelen is gp.plnamelen (usually 0).
// A "" result means plname was cleared so the caller must prompt (askname()).
// Suffix namespaces are tried in this order, even for '*'.
export function plnamesuffix(name, state, opts = {}) {
    const genericusers = opts.genericusers || null;
    let plnamelen = opts.plnamelen || 0;
    if (genericusers) {
        if (genericusers[0] === '*') {
            name = '';
        } else {
            const e = name.indexOf('-', plnamelen);
            const i = e >= 0 ? e : name.length;
            if (findword(genericusers, name, i, false)) name = '';
        }
        if (!name) plnamelen = 0;
    }
    if (!name) return '';
    const head = name.slice(0, plnamelen);
    const [rest, ...tokens] = name.slice(plnamelen).split('-');
    for (const token of tokens) {
        for (const [key, parse] of [['role', str2role], ['race', str2race], ['gender', str2gend], ['align', str2align]]) {
            const value = parse(token);
            if (value !== ROLE_NONE) { state[key] = value; break; }
        }
    }
    return (head + rest).replace(/,/g, ' ');
}

/* C role.c:2119-2140  Hello(mtmp) — the greeting word, by role.  Role_switch is
 * gu.urole.mnum, which js/roles.js:595 stores on game.urole.mnum from the same
 * PM_* monster indices. */
export function Hello(mtmp) {
    switch ((game.urole?.mnum) | 0) {
    case PM_KNIGHT:
        return 'Salutations'; /* Olde English */
    case PM_SAMURAI:
        return (mtmp && (mtmp.mnum | 0) === PM_SHOPKEEPER)
            ? 'Irasshaimase' : 'Konnichi wa'; /* Japanese */
    case PM_TOURIST:
        return 'Aloha'; /* Hawaiian */
    case PM_VALKYRIE:
        // C role.c:2135: MAIL_STRUCTURES is defined in include/global.h:430.
        return (mtmp && (mtmp.mnum | 0) === PM_MAIL_DAEMON) ? 'Hallo' : 'Velkommen'; /* Norse */
    default:
        return 'Hello';
    }
}
