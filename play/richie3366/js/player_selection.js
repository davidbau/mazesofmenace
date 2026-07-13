// player_selection.js — tty/genl character creation menus.
// C ref: role.c genl_player_setup / rigid_role_checks / ok_* / pick_* /
//        plsel_startmenu / setup_*menu / role_menu_extra;
//        wintty.c tty_player_selection → genl_player_setup(rows).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import { paint_corner_nhw_menu } from './invent.js';
import { an } from './objnam.js';
import { roles, races, aligns, genders, findRole, findRace, findAlign } from './roles.js';
import {
    ROLE_NONE,
    ROLE_RANDOM,
    ROLE_RACEMASK,
    ROLE_GENDMASK,
    ROLE_ALIGNMASK,
    ROLE_GENDERS,
    ROLE_ALIGNS,
    RS_ROLE,
    RS_RACE,
    RS_GENDER,
    RS_ALGNMNT,
    RS_filter,
    RS_menu_arg,
    PICK_RANDOM,
    PICK_RIGID,
} from './const.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';

/** C: gr.rfilter — empty until filter menu is ported. */
const rfilter = { roles: [], mask: 0 };

function f() {
    return game.flags || (game.flags = {});
}

function init_role_flags_from_rc() {
    const flags = f();
    const rc = game._parsed_rc || {};
    // C: options already copied into flags.init* before player_selection.
    if (typeof rc.role === 'string') {
        const r = findRole(rc.role);
        flags.initrole = r ? roles.indexOf(r) : ROLE_NONE;
    } else {
        flags.initrole = ROLE_NONE;
    }
    if (typeof rc.race === 'string') {
        const r = findRace(rc.race);
        flags.initrace = r ? races.indexOf(r) : ROLE_NONE;
    } else {
        flags.initrace = ROLE_NONE;
    }
    if (typeof rc.gender === 'string') {
        const g = rc.gender.toLowerCase();
        flags.initgend = (g === 'female' || g === 'f') ? 1
            : (g === 'male' || g === 'm') ? 0 : ROLE_NONE;
    } else {
        flags.initgend = ROLE_NONE;
    }
    if (typeof rc.align === 'string') {
        const a = findAlign(rc.align);
        flags.initalign = a ? aligns.indexOf(a) : ROLE_NONE;
    } else {
        flags.initalign = ROLE_NONE;
    }
}

export function ok_role(rolenum, racenum, gendnum, alignnum) {
    if (rolenum >= 0 && rolenum < roles.length) {
        if (rfilter.roles[rolenum]) return false;
        const allow = roles[rolenum].allow || 0;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < roles.length; i++) {
        if (rfilter.roles[i]) continue;
        const allow = roles[i].allow || 0;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_race(rolenum, racenum, gendnum, alignnum) {
    if (racenum >= 0 && racenum < races.length) {
        if (rfilter.mask & races[racenum].selfmask) return false;
        const allow = races[racenum].allow || 0;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < races.length; i++) {
        if (rfilter.mask & races[i].selfmask) continue;
        const allow = races[i].allow || 0;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_gend(rolenum, racenum, gendnum, _alignnum) {
    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (rfilter.mask & genders[gendnum].allow) return false;
        const allow = genders[gendnum].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            return false;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (rfilter.mask & genders[i].allow) continue;
        const allow = genders[i].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            continue;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_align(rolenum, racenum, _gendnum, alignnum) {
    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        if (rfilter.mask & aligns[alignnum].allow) return false;
        const allow = aligns[alignnum].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            return false;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (rfilter.mask & aligns[i].allow) continue;
        const allow = aligns[i].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            continue;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function validrace(rolenum, racenum) {
    return racenum >= 0 && racenum < races.length
        && !!(roles[rolenum].allow & races[racenum].allow & ROLE_RACEMASK);
}

export function validgend(rolenum, racenum, gendnum) {
    return gendnum >= 0 && gendnum < ROLE_GENDERS
        && !!(roles[rolenum].allow & races[racenum].allow
            & genders[gendnum].allow & ROLE_GENDMASK);
}

export function validalign(rolenum, racenum, alignnum) {
    return alignnum >= 0 && alignnum < ROLE_ALIGNS
        && !!(roles[rolenum].allow & races[racenum].allow
            & aligns[alignnum].allow & ROLE_ALIGNMASK);
}

export function pick_role(racenum, gendnum, alignnum, pickhow) {
    const set = [];
    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, racenum >= 0 ? racenum : ROLE_RANDOM, gendnum, alignnum)
            && ok_gend(i, racenum, gendnum >= 0 ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum, gendnum, alignnum >= 0 ? alignnum : ROLE_RANDOM))
            set.push(i);
    }
    if (set.length === 0 || (set.length > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(set.length)];
}

export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let n = 0;
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) n++;
    }
    if (n === 0 || (n > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    n = rn2(n);
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (n === 0) return i;
            n--;
        }
    }
    return ROLE_NONE;
}

export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let n = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) n++;
    }
    if (n === 0 || (n > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    n = rn2(n);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (n === 0) return i;
            n--;
        }
    }
    return ROLE_NONE;
}

export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let n = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) n++;
    }
    if (n === 0 || (n > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    // C: even n==1 still rolls rn2(1)=0
    n = rn2(n);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (n === 0) return i;
            n--;
        }
    }
    return ROLE_NONE;
}

export function rigid_role_checks() {
    const flags = f();
    let tmp;
    if (flags.initrole === ROLE_RANDOM) {
        flags.initrole = pick_role(flags.initrace, flags.initgend,
            flags.initalign, PICK_RANDOM);
        if (flags.initrole < 0) flags.initrole = rn2(roles.length);
    }
    if (flags.initrace === ROLE_RANDOM
        && (tmp = pick_race(flags.initrole, flags.initgend,
            flags.initalign, PICK_RANDOM)) !== ROLE_NONE)
        flags.initrace = tmp;
    if (flags.initalign === ROLE_RANDOM
        && (tmp = pick_align(flags.initrole, flags.initrace,
            flags.initgend, PICK_RANDOM)) !== ROLE_NONE)
        flags.initalign = tmp;
    if (flags.initgend === ROLE_RANDOM
        && (tmp = pick_gend(flags.initrole, flags.initrace,
            flags.initalign, PICK_RANDOM)) !== ROLE_NONE)
        flags.initgend = tmp;

    if (flags.initrole !== ROLE_NONE) {
        if (flags.initrace === ROLE_NONE)
            flags.initrace = pick_race(flags.initrole, flags.initgend,
                flags.initalign, PICK_RIGID);
        if (flags.initalign === ROLE_NONE)
            flags.initalign = pick_align(flags.initrole, flags.initrace,
                flags.initgend, PICK_RIGID);
        if (flags.initgend === ROLE_NONE)
            flags.initgend = pick_gend(flags.initrole, flags.initrace,
                flags.initalign, PICK_RIGID);
    }
}

function role_display_name(roleIdx, gend) {
    const r = roles[roleIdx];
    if (!r) return '<role>';
    if (gend === 1 && r.name.f) return r.name.f;
    if (gend < 0 && r.name.f && r.name.f !== r.name.m)
        return `${r.name.m}/${r.name.f}`;
    return r.name.m;
}

function aspect_header() {
    const flags = f();
    const ROLE = flags.initrole;
    const RACE = flags.initrace;
    const GEND = flags.initgend;
    const ALGN = flags.initalign;
    const rolename = ROLE < 0 ? '<role>' : role_display_name(ROLE, GEND);
    if (!game.plname || ROLE < 0 || RACE < 0 || GEND < 0 || ALGN < 0) {
        return [
            rolename,
            RACE < 0 ? '<race>' : races[RACE].noun,
            GEND < 0 ? '<gender>' : genders[GEND].adj,
            ALGN < 0 ? '<alignment>' : aligns[ALGN].adj,
        ].join(' ');
    }
    return `${game.plname} the ${aligns[ALGN].adj} ${genders[GEND].adj} ${races[RACE].adj} ${rolename}`;
}

/** C: role_menu_extra constrained line or pick-X / random / quit. */
function menu_extra_lines(which, preselectRandom = false) {
    const flags = f();
    const lines = [];
    const r = flags.initrole;
    const c = flags.initrace;

    if (which === ROLE_RANDOM) {
        lines.push({
            text: preselectRandom ? '* * Random' : '* - Random',
            attr: 0,
            key: '*',
            value: ROLE_RANDOM,
        });
        return lines;
    }
    if (which === ROLE_NONE) {
        lines.push({ text: 'q - Quit', attr: 0, key: 'q', value: ROLE_NONE });
        return lines;
    }
    if (which === RS_filter) {
        lines.push({
            text: '~ - Set role/race/&c filtering',
            attr: 0,
            key: '~',
            value: RS_menu_arg(RS_filter),
        });
        return lines;
    }

    let constrainer = null;
    let forcedvalue = null;
    let what = null;
    let letter = null;
    if (which === RS_ROLE) {
        what = 'role';
        letter = '?';
    } else if (which === RS_RACE) {
        what = 'race';
        letter = '/';
        if (r >= 0) {
            const allowmask = roles[r].allow & ROLE_RACEMASK;
            if (allowmask === races[0].selfmask) {
                constrainer = 'role';
                forcedvalue = races[0].noun;
            }
        }
    } else if (which === RS_GENDER) {
        what = 'gender';
        letter = '"';
        if (r >= 0) {
            const allowmask = roles[r].allow & ROLE_GENDMASK;
            if (allowmask === genders[0].allow) {
                constrainer = 'role';
                forcedvalue = genders[0].adj;
            } else if (allowmask === genders[1].allow) {
                constrainer = 'role';
                forcedvalue = genders[1].adj;
            }
        }
    } else if (which === RS_ALGNMNT) {
        what = 'alignment';
        letter = '[';
        if (r >= 0) {
            const allowmask = roles[r].allow & ROLE_ALIGNMASK;
            if (allowmask === aligns[0].allow) {
                constrainer = 'role';
                forcedvalue = aligns[0].adj;
            } else if (allowmask === aligns[1].allow) {
                constrainer = 'role';
                forcedvalue = aligns[1].adj;
            } else if (allowmask === aligns[2].allow) {
                constrainer = 'role';
                forcedvalue = aligns[2].adj;
            }
        }
        if (c >= 0 && !constrainer) {
            const allowmask = races[c].allow & ROLE_ALIGNMASK;
            if (allowmask === aligns[0].allow) {
                constrainer = 'race';
                forcedvalue = aligns[0].adj;
            } else if (allowmask === aligns[1].allow) {
                constrainer = 'race';
                forcedvalue = aligns[1].adj;
            } else if (allowmask === aligns[2].allow) {
                constrainer = 'race';
                forcedvalue = aligns[2].adj;
            }
        }
    }

    if (constrainer) {
        lines.push({
            text: `    ${constrainer} forces ${forcedvalue}`,
            attr: 0,
            key: null,
            value: 0,
        });
    } else if (what) {
        const fset = which === RS_ROLE ? flags.initrole
            : which === RS_RACE ? flags.initrace
                : which === RS_GENDER ? flags.initgend
                    : flags.initalign;
        const label = `Pick${fset >= 0 ? ' another' : ''} ${what} first`;
        lines.push({
            text: `${letter} - ${label}`,
            attr: 0,
            key: letter,
            value: RS_menu_arg(which),
        });
    }
    return lines;
}

async function menu_pick(title, bodyLines, choices) {
    const entries = [
        { text: title, attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...bodyLines,
    ];
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        const ch = String.fromCharCode(key);
        if (key === 27) return ROLE_NONE;
        // C: space/return with no explicit pick → n==0; for role menus
        // without a preselected item that means ROLE_RANDOM.
        if (ch === ' ' || key === 13 || key === 10) {
            const pre = choices.find(c => c.preselected);
            return pre ? pre.value : ROLE_RANDOM;
        }
        const hit = choices.find(c => c.key === ch || c.key === ch.toLowerCase()
            || (c.altkey && (c.altkey === ch || c.altkey === ch.toLowerCase())));
        if (hit) return hit.value;
        // invalid → re-prompt (C select_menu stays open)
    }
}

async function pick_role_menu() {
    const flags = f();
    rigid_role_checks();
    const RACE = flags.initrace;
    const GEND = flags.initgend;
    const ALGN = flags.initalign;
    const choices = [];
    const body = [{ text: aspect_header(), attr: 0 }, { text: '', attr: 0 }];
    let lastch = '';
    for (let i = 0; i < roles.length; i++) {
        if (!(ok_role(i, RACE, GEND, ALGN)
            && ok_race(i, RACE, GEND, ALGN)
            && ok_gend(i, RACE, GEND, ALGN)
            && ok_align(i, RACE, GEND, ALGN)))
            continue;
        let thisch = roles[i].name.m[0].toLowerCase();
        if (thisch === lastch) thisch = thisch.toUpperCase();
        let rolename = roles[i].name.m;
        if (roles[i].name.f && roles[i].name.f !== roles[i].name.m) {
            if (GEND === 1) rolename = roles[i].name.f;
            else if (GEND < 0) rolename = `${roles[i].name.m}/${roles[i].name.f}`;
        }
        body.push({ text: `${thisch} - ${an(rolename)}`, attr: 0 });
        choices.push({ key: thisch, value: i + 1 }); // C: choice-1 later
        lastch = thisch.toLowerCase();
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    // C maybe_skip_seps(RS_ROLE): on 24-row tty excess is usually 1–2 →
    // omit blank between Random and Pick-race-first (seed0077 layout).
    const rows = game.nhDisplay?.rows || 24;
    const roleLines = 4 + roles.length + 2 + 5 + 1;
    const excess = rows > 0 && roleLines > rows ? roleLines - rows : 0;
    if (excess < 1 || excess > 2)
        body.push({ text: '', attr: 0 });
    for (const which of [RS_RACE, RS_GENDER, RS_ALGNMNT, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick a role or profession', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_ALGNMNT)) {
        flags.initalign = ROLE_NONE;
        return { next: RS_ALGNMNT };
    }
    if (choice === RS_menu_arg(RS_GENDER)) {
        flags.initgend = ROLE_NONE;
        return { next: RS_GENDER };
    }
    if (choice === RS_menu_arg(RS_RACE)) {
        flags.initrace = ROLE_NONE;
        return { next: RS_RACE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        // Omit full filter UI — restart role pick (named omission).
        flags.initrole = ROLE_NONE;
        return { next: RS_ROLE };
    }
    let k;
    if (choice === ROLE_RANDOM) {
        k = pick_role(RACE, GEND, ALGN, PICK_RANDOM);
        if (k < 0) k = rn2(roles.length);
    } else {
        k = choice - 1;
    }
    flags.initrole = k;
    return { next: RS_RACE };
}

async function pick_race_menu() {
    const flags = f();
    rigid_role_checks();
    const ROLE = flags.initrole;
    const GEND = flags.initgend;
    const ALGN = flags.initalign;
    let n = 0;
    let k = 0;
    for (let i = 0; i < races.length; i++) {
        if (ok_race(ROLE, i, GEND, ALGN)) {
            n++;
            k = i;
        }
    }
    if (n === 0) {
        for (let i = 0; i < races.length; i++) {
            if (validrace(ROLE, i)) {
                n++;
                k = i;
            }
        }
    }
    if (n <= 1) {
        flags.initrace = k;
        return { next: RS_GENDER };
    }
    const choices = [];
    const body = [{ text: aspect_header(), attr: 0 }, { text: '', attr: 0 }];
    for (let i = 0; i < races.length; i++) {
        if (!(ok_race(ROLE, i, GEND, ALGN)
            && ok_role(ROLE, i, GEND, ALGN)
            && ok_align(ROLE, i, GEND, ALGN)))
            continue;
        const this_ch = races[i].noun[0];
        body.push({ text: `${this_ch} - ${races[i].noun}`, attr: 0 });
        choices.push({
            key: this_ch,
            altkey: this_ch.toUpperCase(),
            value: i + 1,
        });
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    body.push({ text: '', attr: 0 });
    for (const which of [RS_ROLE, RS_GENDER, RS_ALGNMNT, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick a race or species', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_ALGNMNT)) {
        flags.initalign = ROLE_NONE;
        return { next: RS_ALGNMNT };
    }
    if (choice === RS_menu_arg(RS_GENDER)) {
        flags.initgend = ROLE_NONE;
        return { next: RS_GENDER };
    }
    if (choice === RS_menu_arg(RS_ROLE)) {
        flags.initrole = ROLE_NONE;
        return { next: RS_ROLE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        flags.initrace = ROLE_NONE;
        return { next: RS_RACE };
    }
    if (choice === ROLE_RANDOM) {
        k = pick_race(ROLE, GEND, ALGN, PICK_RANDOM);
        if (k < 0) k = 0;
    } else {
        k = choice - 1;
    }
    flags.initrace = k;
    return { next: RS_GENDER };
}

async function pick_gend_menu() {
    const flags = f();
    rigid_role_checks();
    const ROLE = flags.initrole;
    const RACE = flags.initrace;
    const ALGN = flags.initalign;
    let n = 0;
    let k = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(ROLE, RACE, i, ALGN)) {
            n++;
            k = i;
        }
    }
    if (n === 0) {
        for (let i = 0; i < ROLE_GENDERS; i++) {
            if (validgend(ROLE, RACE, i)) {
                n++;
                k = i;
            }
        }
    }
    if (n <= 1) {
        flags.initgend = k;
        return { next: RS_ALGNMNT };
    }
    const choices = [];
    const body = [{ text: aspect_header(), attr: 0 }, { text: '', attr: 0 }];
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (!(ok_gend(ROLE, RACE, i, ALGN)
            && ok_role(ROLE, RACE, i, ALGN)
            && ok_race(ROLE, RACE, i, ALGN)))
            continue;
        const this_ch = genders[i].adj[0];
        body.push({ text: `${this_ch} - ${genders[i].adj}`, attr: 0 });
        choices.push({
            key: this_ch,
            altkey: this_ch.toUpperCase(),
            value: i + 1,
        });
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    body.push({ text: '', attr: 0 });
    for (const which of [RS_ROLE, RS_RACE, RS_ALGNMNT, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick a gender or sex', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_ALGNMNT)) {
        flags.initalign = ROLE_NONE;
        return { next: RS_ALGNMNT };
    }
    if (choice === RS_menu_arg(RS_RACE)) {
        flags.initrace = ROLE_NONE;
        return { next: RS_RACE };
    }
    if (choice === RS_menu_arg(RS_ROLE)) {
        flags.initrole = ROLE_NONE;
        return { next: RS_ROLE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        flags.initgend = ROLE_NONE;
        return { next: RS_GENDER };
    }
    if (choice === ROLE_RANDOM) {
        k = pick_gend(ROLE, RACE, ALGN, PICK_RANDOM);
        if (k < 0) k = 0;
    } else {
        k = choice - 1;
    }
    flags.initgend = k;
    return { next: RS_ALGNMNT };
}

async function pick_align_menu() {
    const flags = f();
    rigid_role_checks();
    const ROLE = flags.initrole;
    const RACE = flags.initrace;
    const GEND = flags.initgend;
    let n = 0;
    let k = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(ROLE, RACE, GEND, i)) {
            n++;
            k = i;
        }
    }
    if (n === 0) {
        for (let i = 0; i < ROLE_ALIGNS; i++) {
            if (validalign(ROLE, RACE, i)) {
                n++;
                k = i;
            }
        }
    }
    if (n <= 1) {
        flags.initalign = k;
        return { next: RS_ROLE };
    }
    const choices = [];
    const body = [{ text: aspect_header(), attr: 0 }, { text: '', attr: 0 }];
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (!(ok_align(ROLE, RACE, GEND, i)
            && ok_role(ROLE, RACE, GEND, i)
            && ok_race(ROLE, RACE, GEND, i)))
            continue;
        const this_ch = aligns[i].adj[0];
        body.push({ text: `${this_ch} - ${aligns[i].adj}`, attr: 0 });
        choices.push({
            key: this_ch,
            altkey: this_ch.toUpperCase(),
            value: i + 1,
        });
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    body.push({ text: '', attr: 0 });
    for (const which of [RS_ROLE, RS_RACE, RS_GENDER, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick an alignment or creed', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_GENDER)) {
        flags.initgend = ROLE_NONE;
        return { next: RS_GENDER };
    }
    if (choice === RS_menu_arg(RS_RACE)) {
        flags.initrace = ROLE_NONE;
        return { next: RS_RACE };
    }
    if (choice === RS_menu_arg(RS_ROLE)) {
        flags.initrole = ROLE_NONE;
        return { next: RS_ROLE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        flags.initalign = ROLE_NONE;
        return { next: RS_ALGNMNT };
    }
    if (choice === ROLE_RANDOM) {
        k = pick_align(ROLE, RACE, GEND, PICK_RANDOM);
        if (k < 0) k = 1;
    } else {
        k = choice - 1;
    }
    flags.initalign = k;
    return { next: RS_ROLE };
}

/**
 * C: Shall I pick … for you? — yn_function with NULL resp on message line
 * while BASE splash (copyright / Who are you?) remains. Do not flush_screen.
 */
async function shall_i_pick_prompt(prompt) {
    const disp = game.nhDisplay;
    const line = prompt.replace(/\s+$/, '') + ' ';
    if (disp?.grid) {
        for (let c = 0; c < (disp.cols || 80); c++) {
            const ch = c < line.length ? line[c] : ' ';
            // C tty topline / yn uses NO_COLOR (not CLR_BLACK=0)
            disp.setCell(c, 0, ch, NO_COLOR, 0);
        }
        disp.setCursor(line.length, 0);
        disp.flush?.();
    }
    for (;;) {
        const c = await nhgetch();
        let ch = String.fromCharCode(c).toLowerCase();
        if (c === 27 || ch === 'q') return 'q';
        if (ch === ' ' || c === 13 || c === 10) return 'y';
        if (ch === '@' || ch === '*') return 'a';
        if (ch === 'y' || ch === 'n' || ch === 'a') return ch;
    }
}

async function confirm_selection() {
    const flags = f();
    const rename = !!(game.iflags?.renameallowed);
    const title = `Is this ok? [yn${rename ? 'a' : ''}q]`;
    const body = [
        { text: aspect_header(), attr: 0 },
        { text: '', attr: 0 },
        { text: 'y * Yes; start game', attr: 0 },
        { text: 'n - No; choose role again', attr: 0 },
    ];
    const choices = [
        { key: 'y', value: 1, preselected: true },
        { key: 'n', value: 2 },
    ];
    if (rename) {
        body.push({ text: 'a - Not yet; choose another name', attr: 0 });
        choices.push({ key: 'a', value: 3 });
    }
    body.push({ text: 'q - Quit', attr: 0 });
    choices.push({ key: 'q', value: -1 });

    for (;;) {
        const entries = [
            { text: title, attr: ATR_INVERSE },
            { text: '', attr: 0 },
            ...body,
        ];
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        const ch = String.fromCharCode(key).toLowerCase();
        if (key === 27 || ch === 'q') return -1;
        if (ch === ' ' || key === 13 || key === 10) return 1;
        const hit = choices.find(c => c.key === ch);
        if (hit) return hit.value;
    }
}

/**
 * C ref: role.c genl_player_setup — interactive role/race/gender/align.
 * Branch envelope: already-specified skip; Shall I pick y/n/a/q; manual
 * menus; random facets; confirmation. Filter UI body deferred.
 */
export async function genl_player_setup() {
    init_role_flags_from_rc();
    const flags = f();
    game.program_state = game.program_state || {};
    game.program_state.in_role_selection =
        (game.program_state.in_role_selection || 0) + 1;

    let picksomething = (flags.initrole === ROLE_NONE
        || flags.initrace === ROLE_NONE
        || flags.initgend === ROLE_NONE
        || flags.initalign === ROLE_NONE);

    if (flags.randomall && picksomething) {
        if (flags.initrole === ROLE_NONE) flags.initrole = ROLE_RANDOM;
        if (flags.initrace === ROLE_NONE) flags.initrace = ROLE_RANDOM;
        if (flags.initgend === ROLE_NONE) flags.initgend = ROLE_RANDOM;
        if (flags.initalign === ROLE_NONE) flags.initalign = ROLE_RANDOM;
    }

    rigid_role_checks();

    let pick4u = 'n';
    if (flags.initrole === ROLE_NONE || flags.initrace === ROLE_NONE
        || flags.initgend === ROLE_NONE || flags.initalign === ROLE_NONE) {
        // C build_plselection_prompt for all-NONE → character's race, role, …
        const prompt =
            "Shall I pick character's race, role, gender and alignment for you? [ynaq]";
        pick4u = await shall_i_pick_prompt(prompt);
        if (pick4u === 'q') {
            game.program_state.in_role_selection--;
            return false;
        }
    }

    // makepicks:
    for (;;) {
        let nextpick = RS_ROLE;
        do {
            if (nextpick === RS_ROLE) {
                nextpick = RS_RACE;
                if (flags.initrole < 0) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initrole === ROLE_RANDOM) {
                        let k = pick_role(flags.initrace, flags.initgend,
                            flags.initalign, PICK_RANDOM);
                        if (k < 0) k = rn2(roles.length);
                        flags.initrole = k;
                    } else {
                        const res = await pick_role_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }

            if (nextpick === RS_RACE) {
                nextpick = flags.initrole < 0 ? RS_ROLE : RS_GENDER;
                if (flags.initrace < 0 || (flags.initrole >= 0
                    && !validrace(flags.initrole, flags.initrace))) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initrace === ROLE_RANDOM) {
                        let k = pick_race(flags.initrole, flags.initgend,
                            flags.initalign, PICK_RANDOM);
                        if (k < 0) k = 0;
                        flags.initrace = k;
                    } else {
                        const res = await pick_race_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }

            if (nextpick === RS_GENDER) {
                nextpick = flags.initrole < 0 ? RS_ROLE
                    : flags.initrace < 0 ? RS_RACE : RS_ALGNMNT;
                if (flags.initgend < 0 || (flags.initrole >= 0
                    && flags.initrace >= 0
                    && !validgend(flags.initrole, flags.initrace, flags.initgend))) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initgend === ROLE_RANDOM) {
                        let k = pick_gend(flags.initrole, flags.initrace,
                            flags.initalign, PICK_RANDOM);
                        if (k < 0) k = 0;
                        flags.initgend = k;
                    } else {
                        const res = await pick_gend_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }

            if (nextpick === RS_ALGNMNT) {
                nextpick = flags.initrole < 0 ? RS_ROLE
                    : flags.initrace < 0 ? RS_RACE : RS_GENDER;
                if (flags.initalign < 0 || (flags.initrole >= 0
                    && flags.initrace >= 0
                    && !validalign(flags.initrole, flags.initrace, flags.initalign))) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initalign === ROLE_RANDOM) {
                        let k = pick_align(flags.initrole, flags.initrace,
                            flags.initgend, PICK_RANDOM);
                        if (k < 0) k = 1;
                        flags.initalign = k;
                    } else {
                        const res = await pick_align_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }
        } while (flags.initrole < 0 || flags.initrace < 0
            || flags.initgend < 0 || flags.initalign < 0);

        const getconfirmation = picksomething && pick4u !== 'a'
            && !flags.randomall;
        if (!getconfirmation) break;

        const choice = await confirm_selection();
        if (choice === -1) {
            game.program_state.in_role_selection--;
            return false;
        }
        if (choice === 1) break;
        if (choice === 2) {
            pick4u = 'n';
            flags.initrole = flags.initrace = flags.initgend =
                flags.initalign = ROLE_NONE;
            continue; // makepicks
        }
        if (choice === 3) {
            // Rename deferred — treat as re-confirm for now.
            continue;
        }
        break;
    }

    flags.female = flags.initgend === 1;
    game.program_state.in_role_selection--;
    return true;
}

/**
 * C ref: unixmain → player_selection() after plnamesuffix/askname.
 */
export async function player_selection() {
    const ok = await genl_player_setup();
    if (!ok) {
        throw new Error('player_selection: quit');
    }
}
