// chargen.js — Map parsed nethackrc identity into live game fields.
// C ref: u_init.c, role.c (roles[], races[], aligns, plnamesuffix, str2role/race/gend/align), options.c role/race parsing.

import {
    findRole,
    findRoleByAbbr,
    findRace,
    findAlign,
    coerceChargenIdentity,
    roles,
    races,
    aligns,
    str2roleIndexLikeC,
    str2raceIndexLikeC,
    str2gendIndexLikeC,
    str2alignIndexLikeC,
    STR2_RANDOM,
    randraceLikeC,
    randgendLikeC,
    randalignLikeC,
} from './roles.js';
import { randroleFilteredLikeC } from './chargen_rigid.js';

/**
 * C **`hacklib.c`** **`findword`** — space-separated **`list`**; match **`word`** prefix of length **`wordlen`**;
 * list token must end at **`wordlen`** (**`strncmp`/`strncmpi`** + boundary like C **`p[wordlen]`**).
 * @param {string} list
 * @param {string} word
 * @param {number} wordlen
 * @param {boolean} ignorecase
 * @returns {boolean}
 */
function findwordNhLikeC(list, word, wordlen, ignorecase) {
    const n = Math.min(wordlen, word.length);
    if (n < 0) return false;
    const w = word.slice(0, n);
    let p = 0;
    while (p < list.length) {
        while (p < list.length && list[p] === ' ') p++;
        if (p >= list.length) break;
        const start = p;
        while (p < list.length && list[p] !== ' ') p++;
        const tokenEnd = p;
        const tok = list.slice(start, tokenEnd);
        if (tok.length < n) continue;
        const head = ignorecase ? tok.slice(0, n).toLowerCase() === w.toLowerCase() : tok.slice(0, n) === w;
        const boundary = start + n >= tokenEnd || list[start + n] === ' ';
        if (head && boundary) return true;
    }
    return false;
}

/**
 * C **`role.c`** **`plnamesuffix`** — **`sysopt.genericusers`** before dash-token parsing.
 * **`OPTIONS=genericusers:foo bar`** → **`opts.flags.genericusers`**; list match or **`*`** clears **`opts.name`**.
 * **`plnamelen`** mirrors C **`gp.plnamelen`** (usually **`0`**); first **`-`** after that bounds the name prefix for **`findword`**.
 * @param {ReturnType<typeof import('./options.js').parseNethackrc>} opts
 */
function applyGenericusersPlnameClearLikeC(opts) {
    const g = opts.flags && typeof opts.flags.genericusers === 'string' ? opts.flags.genericusers.trim() : '';
    if (!g) return;
    if (g === '*') {
        opts.name = '';
        opts.plnamelen = 0;
        return;
    }
    const raw = typeof opts.name === 'string' ? opts.name : '';
    if (!raw) return;
    const plnamelen = typeof opts.plnamelen === 'number' && opts.plnamelen >= 0 ? opts.plnamelen : 0;
    const sub = raw.slice(plnamelen);
    const dashInSub = sub.indexOf('-');
    const i = dashInSub >= 0 ? plnamelen + dashInSub : raw.length;
    const prefix = raw.slice(0, i);
    if (findwordNhLikeC(g, prefix, prefix.length, false)) {
        opts.name = '';
        opts.plnamelen = 0;
    }
}

/**
 * C **`role.c`** **`plnamesuffix`** — strip **`name-role-race-gender-align`** tokens after first **`-`**;
 * commas in the base name → spaces (**`strNsubst`**). **`genericusers`** via **`applyGenericusersPlnameClearLikeC`**.
 * Mutates **`opts.name`**, **`opts.role`**, **`opts.race`**, **`opts.gender`**, **`opts.align`** like C **`flags.init*`** overwrites.
 * Call only after **`initRng`** when tokens may be **`random`** (**`randrole_filtered`** / **`randrace`** / …).
 * @param {ReturnType<typeof import('./options.js').parseNethackrc>} opts
 */
export function applyPlnameSuffixToOptsLikeC(opts) {
    applyGenericusersPlnameClearLikeC(opts);
    const raw = typeof opts.name === 'string' ? opts.name : '';
    if (!raw) return;

    const dash = raw.indexOf('-');
    if (dash < 0) {
        opts.name = raw.replace(/,/g, ' ');
        return;
    }

    const base = raw.slice(0, dash).replace(/,/g, ' ');
    const tail = raw.slice(dash + 1);
    const tokens = tail.split('-').map((x) => x.trim()).filter(Boolean);
    opts.name = base;

    function roleIdxFromOpts() {
        if (typeof opts.role === 'string' && opts.role.trim()) {
            const r = findRole(opts.role) || findRoleByAbbr(opts.role);
            if (r) return roles.indexOf(r);
        }
        return roles.indexOf(/** @type {typeof roles[0]} */ (findRole('Tourist')));
    }

    function raceIdxFromOpts() {
        if (typeof opts.race === 'string' && opts.race.trim()) {
            const r = findRace(opts.race);
            if (r) return races.indexOf(r);
        }
        return races.indexOf(/** @type {typeof races[0]} */ (findRace('human')));
    }

    let ri = roleIdxFromOpts();
    let rai = raceIdxFromOpts();

    for (const tok of tokens) {
        const sr = str2roleIndexLikeC(tok);
        if (sr === STR2_RANDOM) {
            ri = randroleFilteredLikeC();
            opts.role = roles[ri].name.m;
            opts.explicitRoleInRc = true;
            continue;
        }
        if (sr >= 0) {
            ri = sr;
            opts.role = roles[ri].name.m;
            opts.explicitRoleInRc = true;
            continue;
        }

        const sra = str2raceIndexLikeC(tok);
        if (sra === STR2_RANDOM) {
            rai = randraceLikeC(ri);
            opts.race = races[rai].name;
            opts.explicitRaceInRc = true;
            continue;
        }
        if (sra >= 0) {
            rai = sra;
            opts.race = races[rai].name;
            opts.explicitRaceInRc = true;
            continue;
        }

        const sg = str2gendIndexLikeC(tok);
        if (sg === STR2_RANDOM) {
            const gix = randgendLikeC(ri, rai);
            opts.gender = gix === 1 ? 'female' : 'male';
            opts.explicitGenderInRc = true;
            continue;
        }
        if (sg >= 0) {
            opts.gender = sg === 1 ? 'female' : 'male';
            opts.explicitGenderInRc = true;
            continue;
        }

        const sa = str2alignIndexLikeC(tok);
        if (sa === STR2_RANDOM) {
            const ai = randalignLikeC(ri, rai);
            opts.align = aligns[ai].name;
            opts.explicitAlignInRc = true;
            continue;
        }
        if (sa >= 0) {
            opts.align = aligns[sa].name;
            opts.explicitAlignInRc = true;
        }
    }

    opts.name = base.replace(/,/g, ' ');
}

/**
 * Apply role, race, gender, and alignment from `parseNethackrc` output.
 * Defaults match the previous hardcoded seed8000 tourist stub when fields are absent.
 * @param {import('./gstate.js').game} g
 * @param {ReturnType<typeof import('./options.js').parseNethackrc>} opts
 */
export function applyIdentityFromNethackrc(g, opts) {
    applyPlnameSuffixToOptsLikeC(opts);
    g.plname = opts.name && String(opts.name).trim() ? String(opts.name).trim() : (g.plname || 'Hero');

    let role = null;
    if (typeof opts.role === 'string' && opts.role.trim()) {
        role = findRole(opts.role) || findRoleByAbbr(opts.role);
    }
    if (!role) role = findRole('Tourist');

    let race = null;
    if (typeof opts.race === 'string' && opts.race.trim()) {
        race = findRace(opts.race);
    }
    if (!race) race = findRace('human');

    let female = true;
    if (typeof opts.gender === 'string' && opts.gender.trim()) {
        const gnd = opts.gender.toLowerCase().trim();
        /* C: options.c / role.c — rc gender tokens (male/female, m/f, mal/fem abbreviations) */
        if (gnd.startsWith('f') || gnd === 'female' || gnd === 'fem') female = true;
        else if (gnd.startsWith('m') || gnd === 'male' || gnd === 'mal') female = false;
    }

    let alignType = 0;
    if (typeof opts.align === 'string' && opts.align.trim()) {
        const a = findAlign(opts.align);
        if (a) alignType = a.value;
    }

    ({ race, alignType, female } = coerceChargenIdentity(role, race, alignType, female));

    const resolvedRoleIdx = roles.indexOf(role);
    const resolvedRaceIdx = races.indexOf(race);
    const resolvedGendIdx = female ? 1 : 0;
    const resolvedAlignIdx = aligns.findIndex((x) => x.value === alignType);

    /* C: role.c role_init — Strcpy(svp.pl_character, roles[flags.initrole].name.m) (male title). */
    g.pl_character = role.name.m;
    /* C: struct flag (role.c) — init indices after rigid_role_checks / coerce; aligns[] index for initalign. */
    g.initrole = resolvedRoleIdx;
    g.initrace = resolvedRaceIdx;
    g.initgend = resolvedGendIdx;
    g.initalign = resolvedAlignIdx;

    g.flags = g.flags || {};
    g.flags.female = female;
    /* C: allmain.c newgame — flags.pantheon = -1 until role_init(). */
    g.flags.pantheon = -1;
}
