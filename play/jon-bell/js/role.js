import { ROLE_ALIGNMASK, ROLE_GENDMASK, ROLE_NONE, ROLE_RACEMASK } from './const.js';
// role.js — C ref: role.c.
import { ALIGNS, GENDERS, RACES, ROLES, RSF_ALGNMNT, RSF_GENDER, RSF_RACE, RSF_ROLE, RSF_filter, getRfilter } from './chargen_ui.js';
import './roles.js';
import { game } from './gstate.js';
import { PM_KNIGHT, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_SHOPKEEPER, PM_MAIL_DAEMON } from './pm.generated.js';
import { findword } from './hacklib.js'; // relocate-fns
import { NON_PM, PICK_RIGID, ROLE_ALIGNS, ROLE_CHAOTIC as ROLE_ALIGN_BIT_CHAOS, ROLE_LAWFUL as ROLE_ALIGN_BIT_LAWFUL, ROLE_NEUTRAL as ROLE_ALIGN_BIT_NEUTRAL, ROLE_FEMALE, ROLE_GENDERS, ROLE_MALE, ROLE_RANDOM } from './const.js'; // relocate-fns
import { questStatusStruct } from './gstate.js'; // relocate-fns
import { PM_ARCH_PRIEST, PM_ASHIKAGA_TAKAUJI, PM_CHROMATIC_DRAGON, PM_CYCLOPS, PM_DARK_ONE, PM_DWARF, PM_ELF, PM_GNOME, PM_GRAND_MASTER, PM_HIPPOCRATES, PM_HUMAN, PM_IXOTH, PM_KING_ARTHUR, PM_LORD_CARNARVON, PM_LORD_SATO, PM_LORD_SURTUR, PM_MASTER_ASSASSIN, PM_MASTER_KAEN, PM_MASTER_OF_THIEVES, PM_MINION_OF_HUHETOTL, PM_NALZOK, PM_NEFERET_THE_GREEN, PM_NORN, PM_ORC, PM_ORION, PM_PELIAS, PM_SCORPIUS, PM_SHAMAN_KARNOV, PM_THOTH_AMON, PM_TWOFLOWER } from './pm.generated.js'; // relocate-fns
import { rn2, rn2_on_display_rng } from './rnd.js'; // relocate-fns
import { M2_FEMALE, M2_MALE, M2_NEUTER, MONS_ROWS, NUM_RACES, NUM_ROLES, ROLE_ALLOWS, ROLE_GODS, ROLE_PM_MNUM, aligns, gr, raceSpecs, races, randroleFiltered, roles } from './roles.js'; // relocate-fns

// C ref: role.c:1358 clearrolefilter().  RSF_filter falls through to RSF_ROLE,
// so it clears the mask AND every role flag — a full reset.
export function clearrolefilter(which) {
    const rfilter = getRfilter();
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


// C ref: role.c:1303 gotrolefilter().
export function gotrolefilter() {
    const rfilter = getRfilter();
    if (rfilter.mask) return true;
    for (let i = 0; i < ROLES.length; i++) if (rfilter.roles[i]) return true;
    return false;
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

const GENDER_TAB = [
    { adj: 'male', filecode: 'Mal', allow: ROLE_MALE },
    { adj: 'female', filecode: 'Fem', allow: ROLE_FEMALE },
];

/** Lawful/neutral/chaotic only — C ROLE_ALIGNS */
const ALIGN_TAB = [
    { adj: 'lawful', allow: ROLE_ALIGN_BIT_LAWFUL },
    { adj: 'neutral', allow: ROLE_ALIGN_BIT_NEUTRAL },
    { adj: 'chaotic', allow: ROLE_ALIGN_BIT_CHAOS },
];

function indexOkRolenum(rolenum) {
    return rolenum >= 0 && rolenum < NUM_ROLES;
}

function indexOkRace(racenum) {
    return racenum >= 0 && racenum < NUM_RACES;
}

export function ok_role(rolenum, racenum, gendnum, alignnum, rfilter = gr.rfilter) {
    let allow;
    if (indexOkRolenum(rolenum)) {
        if (rfilter.roles[rolenum])
            return false;
        allow = ROLE_ALLOWS[rolenum];
        if (indexOkRace(racenum) && !(allow & raceSpecs[racenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    let i;
    for (i = 0; i < NUM_ROLES; i++) {
        if (rfilter.roles[i])
            continue;
        allow = ROLE_ALLOWS[i];
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_race(rolenum, racenum, gendnum, alignnum, rfilter = gr.rfilter) {
    let allow;
    if (indexOkRace(racenum)) {
        if (rfilter.mask & raceSpecs[racenum].selfmask)
            return false;
        allow = raceSpecs[racenum].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    let i;
    for (i = 0; i < NUM_RACES; i++) {
        if (rfilter.mask & raceSpecs[i].selfmask)
            continue;
        allow = raceSpecs[i].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_gend(rolenum, racenum, gendnum, _alignnum, rfilter = gr.rfilter) {
    _alignnum;
    let allow;
    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (rfilter.mask & GENDER_TAB[gendnum].allow)
            return false;
        allow = GENDER_TAB[gendnum].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_GENDMASK))
            return false;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_GENDMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (rfilter.mask & GENDER_TAB[i].allow)
            continue;
        allow = GENDER_TAB[i].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_GENDMASK))
            continue;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_GENDMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_align(rolenum, racenum, _gendnum, alignnum, rfilter = gr.rfilter) {
    _gendnum;
    let allow;
    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        if (rfilter.mask & ALIGN_TAB[alignnum].allow)
            return false;
        allow = ALIGN_TAB[alignnum].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_ALIGNMASK))
            return false;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (rfilter.mask & ALIGN_TAB[i].allow)
            continue;
        allow = ALIGN_TAB[i].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_ALIGNMASK))
            continue;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function pick_role(racenum, gendnum, alignnum, pickhow) {
    const set = [];
    let roles_ok = 0;
    for (let i = 0; i < NUM_ROLES; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, racenum >= 0 ? racenum : ROLE_RANDOM, gendnum, alignnum)
            && ok_gend(i, racenum, gendnum >= 0 ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum, gendnum, alignnum >= 0 ? alignnum : ROLE_RANDOM))
            set[roles_ok++] = i;
    }
    if (roles_ok === 0 || (roles_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(roles_ok)];
}

export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let races_ok = 0;
    for (let i = 0; i < NUM_RACES; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum))
            races_ok++;
    }
    if (races_ok === 0 || (races_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    races_ok = rn2(races_ok);
    for (let i = 0; i < NUM_RACES; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (races_ok === 0)
                return i;
            races_ok--;
        }
    }
    return ROLE_NONE;
}

export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let gends_ok = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum))
            gends_ok++;
    }
    if (gends_ok === 0 || (gends_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    gends_ok = rn2(gends_ok);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (gends_ok === 0)
                return i;
            gends_ok--;
        }
    }
    return ROLE_NONE;
}

export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let aligns_ok = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i))
            aligns_ok++;
    }
    if (aligns_ok === 0 || (aligns_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    aligns_ok = rn2(aligns_ok);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (aligns_ok === 0)
                return i;
            aligns_ok--;
        }
    }
    return ROLE_NONE;
}

export function validrace(rolenum, racenum) {
    return !!(indexOkRolenum(rolenum) && indexOkRace(racenum)
        && (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow & ROLE_RACEMASK));
}

export function validgend(rolenum, racenum, gendnum) {
    return !!(indexOkRolenum(rolenum) && indexOkRace(racenum)
        && gendnum >= 0 && gendnum < ROLE_GENDERS
        && (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & GENDER_TAB[gendnum].allow & ROLE_GENDMASK));
}

export function validalign(rolenum, racenum, alignnum) {
    return !!(indexOkRolenum(rolenum) && indexOkRace(racenum)
        && alignnum >= 0 && alignnum < ROLE_ALIGNS
        && (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK));
}

export function randrole(forDisplay) {
    /* C role.c:719-727 */
    return forDisplay ? rn2_on_display_rng(NUM_ROLES) : rn2(NUM_ROLES);
}

export function randrace(rolenum) {
    let n = 0;
    for (let i = 0; i < NUM_RACES; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[i].allow & ROLE_RACEMASK)
            n++;
    }
    let pick = n;
    if (n)
        pick = Math.trunc(rn2(n * 100) / 100);
    for (let i = 0; i < NUM_RACES; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[i].allow & ROLE_RACEMASK) {
            if (pick === 0)
                return i;
            pick--;
        }
    }
    return rn2(NUM_RACES);
}

export function randgend(rolenum, racenum) {
    let n = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & GENDER_TAB[i].allow & ROLE_GENDMASK)
            n++;
    }
    let pick = n;
    if (n)
        pick = rn2(n);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & GENDER_TAB[i].allow & ROLE_GENDMASK) {
            if (pick === 0)
                return i;
            pick--;
        }
    }
    return rn2(ROLE_GENDERS);
}

export function randalign(rolenum, racenum) {
    let n = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & ALIGN_TAB[i].allow & ROLE_ALIGNMASK)
            n++;
    }
    let pick = n;
    if (n)
        pick = rn2(n);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & ALIGN_TAB[i].allow & ROLE_ALIGNMASK) {
            if (pick === 0)
                return i;
            pick--;
        }
    }
    return rn2(ROLE_ALIGNS);
}

/** C validrole(rolenum) — role.c. A bare bounds check; no RNG. */
export function validrole(rolenum) {
    return rolenum >= 0 && rolenum < NUM_ROLES;
}

/** C role.c races[].mnum — the real PM_ index per race, races[] order. */
const RACE_PM_MNUM = [PM_HUMAN, PM_ELF, PM_DWARF, PM_GNOME, PM_ORC];

/** C role.c roles[].ldrnum (quest leader PM_ index), roles[] order. */
const ROLE_LDRNUM = [
    PM_LORD_CARNARVON, PM_PELIAS, PM_SHAMAN_KARNOV, PM_HIPPOCRATES,
    PM_KING_ARTHUR, PM_GRAND_MASTER, PM_ARCH_PRIEST, PM_MASTER_OF_THIEVES,
    PM_ORION, PM_LORD_SATO, PM_TWOFLOWER, PM_NORN, PM_NEFERET_THE_GREEN,
];

/** C role.c roles[].neminum (quest nemesis PM_ index), roles[] order. */
const ROLE_NEMINUM = [
    PM_MINION_OF_HUHETOTL, PM_THOTH_AMON, PM_CHROMATIC_DRAGON, PM_CYCLOPS,
    PM_IXOTH, PM_MASTER_KAEN, PM_NALZOK, PM_MASTER_ASSASSIN, PM_SCORPIUS,
    PM_ASHIKAGA_TAKAUJI, PM_MASTER_OF_THIEVES, PM_LORD_SURTUR, PM_DARK_ONE,
];

/** C role.c roles[].lgod truthiness, roles[] order — derived from ROLE_GODS so
 * the two can never drift apart. */
let roleHasLgod;

function getRoleHasLgod() {
    return roleHasLgod ??= ROLE_GODS.map((g) => g[0] !== null);
}

function questMonsterGender(pmnum) {
    const row = MONS_ROWS[pmnum];
    const mf2 = row ? (row[7] | 0) : 0;
    if (mf2 & M2_NEUTER)
        return 2;
    if (mf2 & M2_FEMALE)
        return 1;
    if (mf2 & M2_MALE)
        return 0;
    return rn2(100) < 50 ? 1 : 0;
}

export function role_init() {
    game.flags = game.flags || {};
    const flags = game.flags;

    // role.c:1987 plnamesuffix() strips the role-letter suffix from the
    // state (no plname field) and consumes no RNG; no-op here.

    // role.c:1991-1996 — str2role(svp.pl_character) before falling back to
    // str2role always returns ROLE_NONE/ROLE_RANDOM here, matching every
    if (!validrole(flags.initrole)) {
        flags.initrole = str2role(game.plname);
        if (flags.initrole < 0) {
            flags.initrole = randroleFiltered();
        }
    }
    const ROLE = flags.initrole;

    // role.c:1999-2002 — Strcpy(svp.pl_character, ...) player-name buffer;

    // role.c:2004-2005
    if (!validrace(ROLE, flags.initrace)) {
        flags.initrace = randrace(ROLE);
    }
    const RACE = flags.initrace;

    // role.c:2009-2015 — only new games validate the current gender.
    // Restores retain flags.female, including a sex change during play.
    // C's flags.female is a zero-init bitfield: unset reads FALSE (male).
    flags.female = flags.female ? 1 : 0;
    if ((flags.pantheon == null || flags.pantheon === -1)
        && !validgend(ROLE, RACE, flags.female)) {
        flags.female = flags.female ? 0 : 1;
    }
    if (!validgend(ROLE, RACE, flags.initgend)) {
        flags.initgend = flags.female;
    }

    // role.c:2017-2020
    if (!validalign(ROLE, RACE, flags.initalign)) {
        flags.initalign = randalign(ROLE, RACE);
    }

    // role.c:2023-2024 — gu.urole / gu.urace.
    game.urole = { ...roles[ROLE], mnum: ROLE_PM_MNUM[ROLE] };
    game.urace = { ...races[RACE], mnum: RACE_PM_MNUM[RACE] };

    // role.c:2028-2041 / 2050-2062 — quest leader/nemesis gender fixup.
    // The rn2(100) roll for an ambiguously-gendered unique is real RNG
    // consumption that must happen in the same order as C.  Across all 13
    // roles, only the Archeologist nemesis (Minion of Huhetotl) and Wizard
    // nemesis (Dark One) lack a fixed gender flag.
    //
    // The ROLL RESULT used to be discarded, under a comment claiming
    // They are: makemon.c:1270-1273 reads BOTH, and that read is the whole
    // point of rolling here ("if gender is random, we choose it now instead
    // of waiting until the ... monster is created").  With nemgend unset,
    // js/makemon.js assignMakemonFemale() fell through to its final
    // Minion of Huhetotl on Arc-goal and goes straight from newmonhp() to
    // mongets(BELL_OF_OPENING)'s next_ident().
    //
    // The mons[] mutations (msound = MS_LEADER/MS_NEMESIS, the mflags2/3
    // fixups) are still not applied; js/makemon.js reaches the same two arms
    // through ROLE_LDRNUM/ROLE_NEMNUM, which is C's own quest_info() test.
    const qstat = questStatusStruct();
    const ldrnum = ROLE_LDRNUM[ROLE];
    if (ldrnum !== NON_PM) {
        qstat.ldrgend = questMonsterGender(ldrnum);
    }
    const neminum = ROLE_NEMINUM[ROLE];
    if (neminum !== NON_PM) {
        qstat.nemgend = questMonsterGender(neminum);
    }

    // role.c:2063-2077 — pantheon resolution, `if (flags.pantheon == -1)  /* new game */`.
    // A restore (restore.c:596 role_init) keeps the saved pantheon and draws nothing.
    if (flags.pantheon == null || flags.pantheon === -1) {
        let trycnt = 0;
        flags.pantheon = ROLE;
        while (!getRoleHasLgod()[flags.pantheon] && ++trycnt < 100) {
            flags.pantheon = randrole(false);
        }
        if (!getRoleHasLgod()[flags.pantheon]) {
            for (let i = 0; i < NUM_ROLES; i++) {
                if (getRoleHasLgod()[i]) {
                    flags.pantheon = i;
                    break;
                }
            }
        }
    }
    // role.c:2078-2083 — gu.urole.lgod/ngod/cgod.  The role struct copied at
    // role.c:2023 already carries the hero's OWN deities; the
    // `if (!gu.urole.lgod)` borrow only fires for Priest (roles[].lgod == 0),
    // which then takes the pantheon role's three.  No RNG.
    //
    // The port's readers (js/look.js align_gname, js/com_pager.js, js/cmd.js)
    // look the names up on game.u rather than game.urole, so publish both:
    // urole is the C-shaped field, u.{l,n,c}god the port-wide accessor.
    {
        const own = ROLE_GODS[ROLE];
        const gods = (own && own[0] !== null) ? own : ROLE_GODS[flags.pantheon];
        game.urole.lgod = gods[0];
        game.urole.ngod = gods[1];
        game.urole.cgod = gods[2];
        game.u = game.u || {};
        game.u.lgod = gods[0];
        game.u.ngod = gods[1];
        game.u.cgod = gods[2];
        qstat.godgend = gods[flags.initalign].startsWith('_') ? 1 : 0;
    }
    // role.c:2088-2089
    // Role_if(PM_CLERIC) -> objects[SPE_LIGHT].oc_skill = P_CLERIC_SPELL:
}

/** C character_race(pmindex) — role.c:2162-2171
 * Given a player monster index (mnum), return the corresponding Race object
 * or null if not found.
 */
export function character_race(pmindex) {
    for (const r of races) {
        if (r.mnum === pmindex) {
            return r;
        }
    }
    return null;
}

/** C Goodbye(void) — role.c:2142-2157
 * Return a role-specific goodbye message.
 * Uses global game.urole.mnum (C's Role_switch macro).
 */
export function Goodbye() {
    const mnum = game.urole && (game.urole.mnum | 0);
    switch (mnum) {
    case PM_KNIGHT:
        return "Fare thee well"; /* Olde English */
    case PM_SAMURAI:
        return "Sayonara"; /* Japanese */
    case PM_TOURIST:
        return "Aloha"; /* Hawaiian */
    case PM_VALKYRIE:
        return "Farvel"; /* Norse */
    default:
        return "Goodbye";
    }
}

/** Helper: case-insensitive n-char comparison (C strncmpi). Returns 0 if match. */
function _strncmpi(s1, s2, n) {
    let i = 0;
    while (i < n) {
        if (!s2[i])
            return (s1[i] !== undefined) ? 1 : 0; /* s1 >= s2 */
        if (!s1[i])
            return -1; /* s1 < s2 */
        const t1 = s1[i].toLowerCase();
        const t2 = s2[i].toLowerCase();
        if (t1 !== t2)
            return (t1 > t2) ? 1 : -1;
        i++;
    }
    return 0; /* s1 == s2 */
}

/** Helper: case-insensitive full string comparison (C strcmpi). Returns 0 if match. */
function _strcmpi(s1, s2) {
    return _strncmpi(s1, s2, Math.max(s1.length, s2.length));
}

/** C str2role(const char *str) — role.c:746-775
 * Parse a role name and return its index (0-12) or ROLE_NONE.
 * Matches male/female name or filecode; handles '*', '@', 'random'.
 */
export function str2role(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; i < roles.length && roles[i].name.m; i++) {
        // Does it match the male name?
        if (!_strncmpi(str, roles[i].name.m, len))
            return i;
        // Or the female name?
        if (roles[i].name.f && !_strncmpi(str, roles[i].name.f, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, roles[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}

/** C str2align(const char *str) — role.c:942-967
 * Parse an alignment name and return its index (0-2) or ROLE_NONE.
 * Matches adjective or filecode; handles '*', '@', 'random'.
 */
export function str2align(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        // Does it match the adjective?
        if (!_strncmpi(str, ALIGN_TAB[i].adj, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, aligns[i].filecode))
            return i;
    }
    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}

/** C str2gend(const char *str) — role.c:879-904
 * Parse a gender name and return its index (0-1) or ROLE_NONE.
 * Matches adjective or filecode; handles '*', '@', 'random'.
 */
export function str2gend(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        // Does it match the adjective?
        if (!_strncmpi(str, GENDER_TAB[i].adj, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, GENDER_TAB[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}

/** C str2race(const char *str) — role.c:812-841
 * Parse a race name and return its index (0-4) or ROLE_NONE.
 * Matches noun, adjective, or filecode; handles '*', '@', 'random'.
 */
export function str2race(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; i < raceSpecs.length && raceSpecs[i].noun; i++) {
        // Does it match the noun?
        if (!_strncmpi(str, raceSpecs[i].noun, len))
            return i;
        // Check adjective too
        if (raceSpecs[i].adj && !_strncmpi(str, raceSpecs[i].adj, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, raceSpecs[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}

/** C setrolefilter(const char *bufp) — role.c:1283-1301
 * Parse a role/race/gender/alignment name and add it to the selection filter.
 * Returns FALSE when the string matches none of the four.
 *
 * NOTE on table names: C's genders[i].allow / aligns[i].allow are the
 * ROLE_MALE/ROLE_LAWFUL-style permission bits, which in this port live on
 * GENDER_TAB/ALIGN_TAB — the exported `genders`/`aligns` arrays here carry
 * name/value/adj/filecode and have NO `allow` field.  (This note used to say
 * they carry "filecode"; `genders` did not, and topten's score line was short
 * its gender code because of it.)  races[i].selfmask is a direct
 * correspondence.
 */
export function setrolefilter(bufp, rfilter = gr.rfilter) {
    let i;
    let reslt = true;

    if ((i = str2role(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.roles[i] = true;
    else if ((i = str2race(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.mask |= races[i].selfmask;
    else if ((i = str2gend(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.mask |= GENDER_TAB[i].allow;
    else if ((i = str2align(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.mask |= ALIGN_TAB[i].allow;
    else
        reslt = false;
    return reslt;
}
