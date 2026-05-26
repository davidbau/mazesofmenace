// chargen_plselection.js — C role.c build_plselection_prompt / root_plselection_prompt.
// C ref: role.c — promptsep, role_gendercount, race_alignmentcount, root_plselection_prompt,
// build_plselection_prompt (genl_player_setup ynaq line).

import { BP_ALIGN, BP_GEND, BP_RACE, BP_ROLE, NUM_BP } from './const.js';
import {
    roles,
    races,
    aligns,
    genders,
    validroleLikeC,
    raceAllowsAlignValueLikeC,
    roleHasFemaleRoleNameLikeC,
} from './roles.js';
import { ROLE_NONE, ROLE_RANDOM, okAlignJs, okRaceJs } from './chargen_rigid.js';

/** C gr.role_pa / gr.role_post_attribs — reset per build_plselection_prompt call. */
const plselRolePa = [0, 0, 0, 0];
let plselRolePostAttribs = 0;

function resetPlselPromptStateLikeC() {
    plselRolePostAttribs = 0;
    for (let k = 0; k < NUM_BP; k++) plselRolePa[k] = 0;
}

/** C role.c promptsep — comma / final "and " using gr.role_post_attribs countdown. */
function promptsepLikeC(buf, numPostAttribs) {
    let b = buf;
    if (numPostAttribs > 1 && plselRolePostAttribs < numPostAttribs && plselRolePostAttribs > 1) {
        b += ',';
    }
    b += ' ';
    plselRolePostAttribs--;
    if (plselRolePostAttribs === 0 && numPostAttribs > 1) {
        b += 'and ';
    }
    return b;
}

function roleGendercountLikeC(rolenum) {
    if (!validroleLikeC(rolenum)) return 0;
    const ag = roles[rolenum].allows.gender;
    if (ag === 'any') return 2;
    if (ag === 'male' || ag === 'female') return 1;
    return 0;
}

function raceAlignmentcountLikeC(racenum) {
    if (racenum === ROLE_NONE || racenum === ROLE_RANDOM) return 0;
    const race = races[racenum];
    if (!race) return 0;
    let n = 0;
    for (const a of aligns) {
        if (raceAllowsAlignValueLikeC(race, a.value)) n++;
    }
    return n;
}

function sSuffixLikeC(s) {
    if (!s) return "character's";
    const t = s.trimEnd();
    if (t.toLowerCase() === 'it') return `${t}s`;
    if (t.toLowerCase() === 'you') return `${t}r`;
    if (t.endsWith('s')) return `${t}'`;
    return `${t}'s`;
}

/**
 * C root_plselection_prompt — possessive middle clause (no leading "Shall I pick").
 * @param {number} rolenum
 * @param {number} racenum
 * @param {number} gendnum
 * @param {number} alignnum
 */
function rootPlselectionPromptLikeC(rolenum, racenum, gendnum, alignnum) {
    resetPlselPromptStateLikeC();
    const chunks = [];
    let donefirst = false;

    const aligncount = racenum !== ROLE_NONE && racenum !== ROLE_RANDOM
        ? raceAlignmentcountLikeC(racenum)
        : 0;

    if (alignnum !== ROLE_NONE && alignnum !== ROLE_RANDOM
        && okAlignJs(rolenum, racenum, gendnum, alignnum)) {
        if (donefirst) chunks.push(' ');
        chunks.push(aligns[alignnum].adj);
        donefirst = true;
    } else {
        const ai = alignnum !== ROLE_RANDOM ? alignnum : ROLE_NONE;
        if ((((racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
            && okRaceJs(rolenum, racenum, gendnum, ai))
            && aligncount > 1)
            || racenum === ROLE_NONE || racenum === ROLE_RANDOM) {
            plselRolePa[BP_ALIGN] = 1;
            plselRolePostAttribs++;
        }
    }

    const gendercount = validroleLikeC(rolenum) ? roleGendercountLikeC(rolenum) : 0;

    if (gendnum !== ROLE_NONE && gendnum !== ROLE_RANDOM) {
        if (validroleLikeC(rolenum)) {
            if (rolenum !== ROLE_NONE && gendercount > 1 && !roleHasFemaleRoleNameLikeC(roles[rolenum])) {
                if (donefirst) chunks.push(' ');
                chunks.push(genders[gendnum].adj);
                donefirst = true;
            }
        } else {
            if (donefirst) chunks.push(' ');
            chunks.push(genders[gendnum].adj);
            donefirst = true;
        }
    } else if ((validroleLikeC(rolenum) && gendercount > 1) || !validroleLikeC(rolenum)) {
        plselRolePa[BP_GEND] = 1;
        plselRolePostAttribs++;
    }

    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
        if (validroleLikeC(rolenum) && okRaceJs(rolenum, racenum, gendnum, alignnum)) {
            if (donefirst) chunks.push(' ');
            chunks.push(rolenum === ROLE_NONE ? races[racenum].name : races[racenum].adj);
            donefirst = true;
        } else if (!validroleLikeC(rolenum)) {
            if (donefirst) chunks.push(' ');
            chunks.push(races[racenum].name);
            donefirst = true;
        } else {
            plselRolePa[BP_RACE] = 1;
            plselRolePostAttribs++;
        }
    } else {
        plselRolePa[BP_RACE] = 1;
        plselRolePostAttribs++;
    }

    if (validroleLikeC(rolenum)) {
        if (donefirst) chunks.push(' ');
        const r = roles[rolenum];
        if (gendnum !== ROLE_NONE && gendnum !== ROLE_RANDOM) {
            if (gendnum === 1 && roleHasFemaleRoleNameLikeC(r)) {
                chunks.push(r.name.f);
            } else {
                chunks.push(r.name.m);
            }
        } else if (roleHasFemaleRoleNameLikeC(r)) {
            chunks.push(`${r.name.m}/${r.name.f}`);
        } else {
            chunks.push(r.name.m);
        }
        donefirst = true;
    } else if (rolenum === ROLE_NONE) {
        plselRolePa[BP_ROLE] = 1;
        plselRolePostAttribs++;
    }

    if ((racenum === ROLE_NONE || racenum === ROLE_RANDOM) && !validroleLikeC(rolenum)) {
        if (donefirst) chunks.push(' ');
        chunks.push('character');
    }

    return chunks.join('');
}

/**
 * C build_plselection_prompt — full tty line before yn_function (trailing space).
 * @param {number} rolenum
 * @param {number} racenum
 * @param {number} gendnum
 * @param {number} alignnum
 */
export function buildPlselectionPromptLikeC(rolenum, racenum, gendnum, alignnum) {
    let tmp = 'Shall I pick ';
    if (racenum !== ROLE_NONE || validroleLikeC(rolenum)) tmp += 'your ';
    else tmp += 'a ';

    tmp += rootPlselectionPromptLikeC(rolenum, racenum, gendnum, alignnum);
    tmp = tmp.replace(/pick a character/g, 'pick character');

    let out = sSuffixLikeC(tmp);
    if (/priest\/priestess'$/i.test(out)) {
        out += 's';
    }

    let numPostAttribs = plselRolePostAttribs;
    if (!numPostAttribs) {
        if (rolenum === ROLE_NONE && !plselRolePa[BP_ROLE]) {
            plselRolePa[BP_ROLE] = 1;
            plselRolePostAttribs++;
        }
        if (racenum === ROLE_NONE && !plselRolePa[BP_RACE]) {
            plselRolePa[BP_RACE] = 1;
            plselRolePostAttribs++;
        }
        if (alignnum === ROLE_NONE && !plselRolePa[BP_ALIGN]) {
            plselRolePa[BP_ALIGN] = 1;
            plselRolePostAttribs++;
        }
        if (gendnum === ROLE_NONE && !plselRolePa[BP_GEND]) {
            plselRolePa[BP_GEND] = 1;
            plselRolePostAttribs++;
        }
        numPostAttribs = plselRolePostAttribs;
    }

    if (numPostAttribs) {
        if (plselRolePa[BP_RACE]) {
            out = promptsepLikeC(out, numPostAttribs);
            out += 'race';
        }
        if (plselRolePa[BP_ROLE]) {
            out = promptsepLikeC(out, numPostAttribs);
            out += 'role';
        }
        if (plselRolePa[BP_GEND]) {
            out = promptsepLikeC(out, numPostAttribs);
            out += 'gender';
        }
        if (plselRolePa[BP_ALIGN]) {
            out = promptsepLikeC(out, numPostAttribs);
            out += 'alignment';
        }
    }

    /* C Strcat trailing space before yn_function; tty cursor uses len+1 on visible line (no extra space). */
    out += ' for you? [ynaq]';
    return out;
}

/** C genl_player_setup picksomething — any facet still ROLE_NONE. */
export function chargenPickSomethingLikeC(f) {
    return f.initrole === ROLE_NONE || f.initrace === ROLE_NONE
        || f.initgend === ROLE_NONE || f.initalign === ROLE_NONE;
}
