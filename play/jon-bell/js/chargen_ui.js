// @ts-nocheck
// chargen_ui.js — Render the C chargen UI frames (copyright + askname + role/race/gender/align menus).
//
// C ref:
//   - nethack-c/include/patchlevel.h:39-44 (COPYRIGHT_BANNER_A..D)
//   - nethack-c/src/role.c:1665 plnamesuffix() -> askname()
//   - nethack-c/src/role.c:2204 tty_player_selection / genl_player_setup
//   - nethack-c/src/role.c:2854 setup_rolemenu
//   - nethack-c/src/role.c:2904 setup_racemenu
//   - nethack-c/src/role.c:2942 setup_gendmenu
//   - nethack-c/src/role.c:2978 setup_algnmenu
//   - nethack-c/src/role.c:1816 role_menu_extra
//   - nethack-c/src/role.c:2805 plsel_startmenu (header line)
//   - nethack-c/src/role.c:2776 maybe_skip_seps (separator squeeze when n > rows)
//   - nethack-c/src/role.c:1235 rigid_role_checks (force missing facets when only one valid)
//
// Inputs allowed (per CARDINAL_RULES + scramble-validator):
//   - chargenRng[]:  extracted RNG-call slice ({fn,n,result}) by
//                    extractChargenPreInitRng in js/roles.js — used
//                    here only to resolve '*' random picks to the
//                    same valid[index] C chose.
//
// The C TTY menu library renders each menu as a 24x80 grid with:
//   row 0: prompt label in reverse-video (e.g. "Pick a role or profession")
//   row 1: blank separator
//   row 2: "info" line ("<role> <race> <gender> <alignment>" or "Name the <align> ...")
//   row 3: blank separator (unless squeezed by maybe_skip_seps)
//   row 4+: menu items
//   last:  "(end)" footer
//   - For each row, find first non-blank col; if leading gap > 4 emit \x1b[NC,
//     else emit N literal spaces; then emit the row's content.
//   - Empty rows emit just '\n'.
//
// recorded screens):
//   - Indent (leftmost col of menu content) =
//       if menu_total_lines > 24 (role menu doesn't fit) → 0 (left-align,
//         each line gets a literal leading space prefix)
//       else                                              → max(0, min(41, 78 - max_line_len))
//     (right-align with at most col 41 to leave room for context to the left)
//   - Title row uses ANSI reverse-video: "\x1b[7m<title>\x1b[0m"
//   - "race forces chaotic" / "role forces lawful" style lines have 4 spaces
//     of left-padding; they're emitted as \x1b[(indent+4)C + content.

import { PORT_ID } from './platform_identity.js';

// ──────────────────────────────────────────────────────────────────────────
// Copyright banner / askname constants (R1 — preserved)
// ──────────────────────────────────────────────────────────────────────────

const COPYRIGHT_BANNER_A = 'NetHack, Copyright 1985-2026';
const COPYRIGHT_BANNER_B = 'By Stichting Mathematisch Centrum and M. Stephenson.';
// C ref: include/patchlevel.h:43 — COPYRIGHT_BANNER_C is
// recordings were made from NetHack 5.0.0_Release with a pinned build date;
// this is the exact line every recorded chargen screen carries.
//
// PLATFORM-CONDITIONAL, but NOT SCORED.  mdlib.c:363-368 bannerc_string()
// builds it as "         Version %s %s%s, %s %s." with PORT_ID in the second
// slot, so a *nix build renders "Version 5.0.0 Unix, built ...".  Every one of
// rewrites /Version\s+\d+\.\d+\.\d+[^\n]*/ to <<VERSION_BANNER>> on BOTH
// sides before comparing, so the PORT_ID here costs nothing either way.  It is
// wired to the same constant anyway so the coupling is visible in one place.
//   macOS arm: 'Version 5.0.0 MacOS, built May  2 2026 12:00:00.'
//   Unix  arm: 'Version 5.0.0 Unix, built May  2 2026 12:00:00.'
const COPYRIGHT_BANNER_C = `Version 5.0.0 ${PORT_ID}, built May  2 2026 12:00:00.`;
const COPYRIGHT_BANNER_D = 'See license for details.';

const SHALL_I_PICK_PROMPT = "Shall I pick character's race, role, gender and alignment for you? [ynaq]";

const BANNER_INDENT = 9;
const ASKNAME_ROW = 12;
const ASKNAME_TEXT = 'Who are you?';
const PROMPT_ROW = 0;

// ──────────────────────────────────────────────────────────────────────────
// Role / race / gender / align tables — mirrored from nethack-c/src/role.c
// ──────────────────────────────────────────────────────────────────────────

// Bitmask constants (from include/flag.h / include/monflag.h). We keep these
// local rather than importing from const.js to avoid a circular dep at
// load-time; values match role.c.
const MH_HUMAN  = 0x0008;
const MH_ELF    = 0x0010;
const MH_DWARF  = 0x0020;
const MH_GNOME  = 0x0040;
const MH_ORC    = 0x0080;
const ROLE_RACEMASK  = 0x0ff8;
const ROLE_GENDMASK  = 0xf000;
const ROLE_ALIGNMASK = 0x0007;
const ROLE_MALE   = 0x1000;
const ROLE_FEMALE = 0x2000;
const AM_LAWFUL   = 0x0004;
const AM_NEUTRAL  = 0x0002;
const AM_CHAOTIC  = 0x0001;

// roles[] mirror — name (m/f), letter, allow mask.
// C ref: nethack-c/src/role.c:30-576.  Order MATTERS — drives menu order and
// duplicate-letter handling (Ranger → 'R' because Rogue uses 'r' first).
const ROLES = [
    { m: 'Archeologist',     f: null,         allow: MH_HUMAN|MH_DWARF|MH_GNOME|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL|AM_NEUTRAL },
    { m: 'Barbarian',        f: null,         allow: MH_HUMAN|MH_ORC|ROLE_MALE|ROLE_FEMALE|AM_NEUTRAL|AM_CHAOTIC },
    { m: 'Caveman',          f: 'Cavewoman',  allow: MH_HUMAN|MH_DWARF|MH_GNOME|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL|AM_NEUTRAL },
    { m: 'Healer',           f: null,         allow: MH_HUMAN|MH_GNOME|ROLE_MALE|ROLE_FEMALE|AM_NEUTRAL },
    { m: 'Knight',           f: null,         allow: MH_HUMAN|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL },
    { m: 'Monk',             f: null,         allow: MH_HUMAN|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL|AM_NEUTRAL|AM_CHAOTIC },
    { m: 'Priest',           f: 'Priestess',  allow: MH_HUMAN|MH_ELF|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL|AM_NEUTRAL|AM_CHAOTIC },
    { m: 'Rogue',            f: null,         allow: MH_HUMAN|MH_ORC|ROLE_MALE|ROLE_FEMALE|AM_CHAOTIC },
    { m: 'Ranger',           f: null,         allow: MH_HUMAN|MH_ELF|MH_GNOME|MH_ORC|ROLE_MALE|ROLE_FEMALE|AM_NEUTRAL|AM_CHAOTIC },
    { m: 'Samurai',          f: null,         allow: MH_HUMAN|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL },
    { m: 'Tourist',          f: null,         allow: MH_HUMAN|ROLE_MALE|ROLE_FEMALE|AM_NEUTRAL },
    { m: 'Valkyrie',         f: null,         allow: MH_HUMAN|MH_DWARF|ROLE_FEMALE|AM_LAWFUL|AM_NEUTRAL },
    { m: 'Wizard',           f: null,         allow: MH_HUMAN|MH_ELF|MH_GNOME|MH_ORC|ROLE_MALE|ROLE_FEMALE|AM_NEUTRAL|AM_CHAOTIC },
];

// races[] mirror — noun, adj, selfmask, allow mask.
// C ref: nethack-c/src/role.c:581-685.
const RACES = [
    { noun: 'human', adj: 'human',   selfmask: MH_HUMAN, allow: MH_HUMAN|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL|AM_NEUTRAL|AM_CHAOTIC },
    { noun: 'elf',   adj: 'elven',   selfmask: MH_ELF,   allow: MH_ELF|ROLE_MALE|ROLE_FEMALE|AM_CHAOTIC },
    { noun: 'dwarf', adj: 'dwarven', selfmask: MH_DWARF, allow: MH_DWARF|ROLE_MALE|ROLE_FEMALE|AM_LAWFUL },
    { noun: 'gnome', adj: 'gnomish', selfmask: MH_GNOME, allow: MH_GNOME|ROLE_MALE|ROLE_FEMALE|AM_NEUTRAL },
    { noun: 'orc',   adj: 'orcish',  selfmask: MH_ORC,   allow: MH_ORC|ROLE_MALE|ROLE_FEMALE|AM_CHAOTIC },
];

// genders[] mirror — adj, allow.  C ref: role.c:688-694.
const GENDERS = [
    { adj: 'male',   allow: ROLE_MALE },
    { adj: 'female', allow: ROLE_FEMALE },
];

// aligns[] mirror — adj, allow.  C ref: role.c:697-702.
const ALIGNS = [
    { adj: 'lawful',  allow: AM_LAWFUL },
    { adj: 'neutral', allow: AM_NEUTRAL },
    { adj: 'chaotic', allow: AM_CHAOTIC },
];

const ROLE_NONE = -1;
const ROLE_RANDOM = -2;   // include/you.h:253
const PICK_RANDOM = 0;
const PICK_RIGID  = 1;

// role-selection aspects — C ref: include/winprocs.h:308-313.  (Named RSF_*
// here because playChargen() already binds RS_ROLE &c to its own phase
// strings; these are the clearrolefilter() selectors.)
const RSF_ROLE = 1, RSF_RACE = 2, RSF_GENDER = 3, RSF_ALGNMNT = 4,
      RSF_filter = 5;

// ──────────────────────────────────────────────────────────────────────────
// gr.rfilter — the "unacceptable roles/races/genders/alignments" set the
// player builds with the '~' entry of any chargen menu.  C ref:
// include/hack.h:762 `struct role_filter`; src/role.c:1284 setrolefilter,
// :1303 gotrolefilter, :1358 clearrolefilter.  It is a process global in C
// (gr.rfilter, zeroed at startup), so it is a module singleton here; every
// chargen entry point clears it before it starts (see resetRfilter()).
// ──────────────────────────────────────────────────────────────────────────

const rfilter = { roles: [], mask: 0 };

// C ref: role.c:1358 clearrolefilter().  RSF_filter falls through to RSF_ROLE,
// so it clears the mask AND every role flag — a full reset.
function clearrolefilter(which) {
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

function resetRfilter() { clearrolefilter(RSF_filter); }
resetRfilter();

// C ref: role.c:1284 setrolefilter().  The menu hands back the item's
// a_string, which reset_role_filtering() sourced from roles[i].name.m /
// races[i].noun / genders[i].adj / aligns[i].adj; C then runs it back through
// str2role/str2race/str2gend/str2align in that order.  Those four namespaces
// are disjoint over exactly these strings, so an exact-name match per table
// reproduces C's dispatch.
function setrolefilter(bufp) {
    for (let i = 0; i < ROLES.length; i++)
        if (ROLES[i].m === bufp) { rfilter.roles[i] = true; return true; }
    for (let i = 0; i < RACES.length; i++)
        if (RACES[i].noun === bufp) { rfilter.mask |= RACES[i].selfmask; return true; }
    for (let i = 0; i < GENDERS.length; i++)
        if (GENDERS[i].adj === bufp) { rfilter.mask |= GENDERS[i].allow; return true; }
    for (let i = 0; i < ALIGNS.length; i++)
        if (ALIGNS[i].adj === bufp) { rfilter.mask |= ALIGNS[i].allow; return true; }
    return false;
}

// C ref: role.c:1303 gotrolefilter().
function gotrolefilter() {
    if (rfilter.mask) return true;
    for (let i = 0; i < ROLES.length; i++) if (rfilter.roles[i]) return true;
    return false;
}

// ──────────────────────────────────────────────────────────────────────────
// ok_role/ok_race/ok_gend/ok_align — direct mirrors of role.c logic.
// C ref: role.c:971-1232, INCLUDING the gr.rfilter rejection that opens each
// branch (role.c:977/993, 1043/1059, 1113/1126, 1178/1191).
// ──────────────────────────────────────────────────────────────────────────

function ok_role(rolenum, racenum, gendnum, alignnum) {
    if (rolenum >= 0 && rolenum < ROLES.length) {
        if (rfilter.roles[rolenum]) return false;
        const allow = ROLES[rolenum].allow;
        if (racenum >= 0 && racenum < RACES.length
            && !(allow & RACES[racenum].allow & ROLE_RACEMASK)) return false;
        if (gendnum >= 0 && gendnum < GENDERS.length
            && !(allow & GENDERS[gendnum].allow & ROLE_GENDMASK)) return false;
        if (alignnum >= 0 && alignnum < ALIGNS.length
            && !(allow & ALIGNS[alignnum].allow & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < ROLES.length; i++) {
        if (rfilter.roles[i]) continue;
        const allow = ROLES[i].allow;
        if (racenum >= 0 && racenum < RACES.length
            && !(allow & RACES[racenum].allow & ROLE_RACEMASK)) continue;
        if (gendnum >= 0 && gendnum < GENDERS.length
            && !(allow & GENDERS[gendnum].allow & ROLE_GENDMASK)) continue;
        if (alignnum >= 0 && alignnum < ALIGNS.length
            && !(allow & ALIGNS[alignnum].allow & ROLE_ALIGNMASK)) continue;
        return true;
    }
    return false;
}

function ok_race(rolenum, racenum, gendnum, alignnum) {
    if (racenum >= 0 && racenum < RACES.length) {
        if (rfilter.mask & RACES[racenum].selfmask) return false;
        const allow = RACES[racenum].allow;
        if (rolenum >= 0 && rolenum < ROLES.length
            && !(allow & ROLES[rolenum].allow & ROLE_RACEMASK)) return false;
        if (gendnum >= 0 && gendnum < GENDERS.length
            && !(allow & GENDERS[gendnum].allow & ROLE_GENDMASK)) return false;
        if (alignnum >= 0 && alignnum < ALIGNS.length
            && !(allow & ALIGNS[alignnum].allow & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < RACES.length; i++) {
        if (rfilter.mask & RACES[i].selfmask) continue;
        const allow = RACES[i].allow;
        if (rolenum >= 0 && rolenum < ROLES.length
            && !(allow & ROLES[rolenum].allow & ROLE_RACEMASK)) continue;
        if (gendnum >= 0 && gendnum < GENDERS.length
            && !(allow & GENDERS[gendnum].allow & ROLE_GENDMASK)) continue;
        if (alignnum >= 0 && alignnum < ALIGNS.length
            && !(allow & ALIGNS[alignnum].allow & ROLE_ALIGNMASK)) continue;
        return true;
    }
    return false;
}

function ok_gend(rolenum, racenum, gendnum, _alignnum) {
    if (gendnum >= 0 && gendnum < GENDERS.length) {
        if (rfilter.mask & GENDERS[gendnum].allow) return false;
        const allow = GENDERS[gendnum].allow;
        if (rolenum >= 0 && rolenum < ROLES.length
            && !(allow & ROLES[rolenum].allow & ROLE_GENDMASK)) return false;
        if (racenum >= 0 && racenum < RACES.length
            && !(allow & RACES[racenum].allow & ROLE_GENDMASK)) return false;
        return true;
    }
    for (let i = 0; i < GENDERS.length; i++) {
        if (rfilter.mask & GENDERS[i].allow) continue;
        const allow = GENDERS[i].allow;
        if (rolenum >= 0 && rolenum < ROLES.length
            && !(allow & ROLES[rolenum].allow & ROLE_GENDMASK)) continue;
        if (racenum >= 0 && racenum < RACES.length
            && !(allow & RACES[racenum].allow & ROLE_GENDMASK)) continue;
        return true;
    }
    return false;
}

function ok_align(rolenum, racenum, _gendnum, alignnum) {
    if (alignnum >= 0 && alignnum < ALIGNS.length) {
        if (rfilter.mask & ALIGNS[alignnum].allow) return false;
        const allow = ALIGNS[alignnum].allow;
        if (rolenum >= 0 && rolenum < ROLES.length
            && !(allow & ROLES[rolenum].allow & ROLE_ALIGNMASK)) return false;
        if (racenum >= 0 && racenum < RACES.length
            && !(allow & RACES[racenum].allow & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < ALIGNS.length; i++) {
        if (rfilter.mask & ALIGNS[i].allow) continue;
        const allow = ALIGNS[i].allow;
        if (rolenum >= 0 && rolenum < ROLES.length
            && !(allow & ROLES[rolenum].allow & ROLE_ALIGNMASK)) continue;
        if (racenum >= 0 && racenum < RACES.length
            && !(allow & RACES[racenum].allow & ROLE_ALIGNMASK)) continue;
        return true;
    }
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
function rigid_role_checks(state, tracker) {
    if (state.role !== ROLE_NONE) {
        if (state.race === ROLE_NONE)
            state.race = pick_race_rigid(state.role, state.gender, state.align, tracker);
        if (state.align === ROLE_NONE)
            state.align = pick_align_rigid(state.role, state.race, state.gender, tracker);
        if (state.gender === ROLE_NONE)
            state.gender = pick_gend_rigid(state.role, state.race, state.align, tracker);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// an(): English article for a noun, mirrors nethack-c/src/objnam.c an().
// Used for menu role labels ("an Archeologist" vs "a Wizard").
// ──────────────────────────────────────────────────────────────────────────

function isVowel(c) {
    return c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u'
        || c === 'A' || c === 'E' || c === 'I' || c === 'O' || c === 'U';
}
function an(word) {
    if (!word) return word;
    return (isVowel(word[0]) ? 'an ' : 'a ') + word;
}

// roleLabel: role name with optional female substitute, gender-aware
// (mirrors setup_rolemenu's rolenamebuf handling, role.c:2882-2893).
function roleLabel(rolenum, gendnum) {
    const role = ROLES[rolenum];
    if (role.f) {
        if (gendnum === 1) return role.f;             // female chosen → female name only
        if (gendnum === ROLE_NONE) return role.m + '/' + role.f;  // both names
        return role.m;                                 // male chosen → male name only
    }
    return role.m;
}

// roleMenuLetter: assigns letters per role.c setup_rolemenu (line 2879-2882).
// First lowercase letter of role name; if duplicates the previous, use uppercase.
//
// `shown(i)` mirrors C's `if (filtering && !role_ok) continue;` (role.c:2874),
// which sits BEFORE thisch/lastch are computed — so a role the menu does not
// display does not claim its letter, and does not push the next same-initial
// role to uppercase.  (Rogue absent => Ranger is 'r', not 'R'.)  Callers that
// display every role — reset_role_filtering's `filtering == FALSE` menu — pass
// nothing and get the unfiltered assignment.
function roleMenuLetters(gendnum, shown) {
    const letters = [];
    let lastch = '';
    for (let i = 0; i < ROLES.length; i++) {
        if (shown && !shown(i)) { letters.push(null); continue; }
        const nm = (gendnum === 1 && ROLES[i].f) ? ROLES[i].f : ROLES[i].m;
        let ch = nm[0].toLowerCase();
        if (ch === lastch) ch = ch.toUpperCase();
        letters.push(ch);
        lastch = ch;
    }
    return letters;
}

// The role-menu display predicate — C ref: role.c:2871-2875 setup_rolemenu's
// `role_ok`.  Shared by the menu builder, its letter assignment and the key
// parser so all three agree on which roles the menu is showing.
function roleMenuShown(state) {
    return (i) => ok_role(i, state.race, state.gender, state.align)
               && ok_race(i, state.race, state.gender, state.align)
               && ok_gend(i, state.race, state.gender, state.align)
               && ok_align(i, state.race, state.gender, state.align);
}

// ──────────────────────────────────────────────────────────────────────────
// Frame builders — copyright + askname (R1 — preserved verbatim)
// ──────────────────────────────────────────────────────────────────────────

function buildCopyrightAskname(namePrefix) {
    let out = '';
    out += '\n\n\n\n';                          // rows 0..3 blank
    out += COPYRIGHT_BANNER_A + '\n';           // row 4
    out += `\x1b[${BANNER_INDENT}C` + COPYRIGHT_BANNER_B + '\n';  // row 5
    out += `\x1b[${BANNER_INDENT}C` + COPYRIGHT_BANNER_C + '\n';  // row 6
    out += `\x1b[${BANNER_INDENT}C` + COPYRIGHT_BANNER_D + '\n';  // row 7
    out += '\n\n\n\n';                          // rows 8..11 blank
    out += ASKNAME_TEXT;                        // row 12 start
    if (namePrefix && namePrefix.length > 0)
        out += ' ' + namePrefix;
    return out;
}

function cursorForAskname(namePrefix) {
    const baseCol = ASKNAME_TEXT.length;        // 12
    const col = baseCol + (namePrefix ? namePrefix.length + 1 : 1);
    return [col, ASKNAME_ROW, 1];
}

function buildShallIPickFrame(finalName) {
    let out = '';
    out += SHALL_I_PICK_PROMPT + '\n';
    out += '\n\n\n';
    out += COPYRIGHT_BANNER_A + '\n';
    out += `\x1b[${BANNER_INDENT}C` + COPYRIGHT_BANNER_B + '\n';
    out += `\x1b[${BANNER_INDENT}C` + COPYRIGHT_BANNER_C + '\n';
    out += `\x1b[${BANNER_INDENT}C` + COPYRIGHT_BANNER_D + '\n';
    out += '\n\n\n\n';
    out += ASKNAME_TEXT;
    if (finalName && finalName.length > 0)
        out += ' ' + finalName;
    return out;
}

function cursorForShallIPick() {
    return [SHALL_I_PICK_PROMPT.length + 1, PROMPT_ROW, 1];
}

// Askname frame at row R (used for askname re-prompt after 'a' in confirm
// menu — recorded data shows the second askname uses row 10 not row 12).
function buildAsknameAtRow(row, namePrefix) {
    let out = '';
    for (let i = 0; i < row; i++) out += '\n';
    out += ASKNAME_TEXT;
    if (namePrefix && namePrefix.length > 0) out += ' ' + namePrefix;
    return out;
}
function cursorForAsknameAtRow(row, namePrefix) {
    const baseCol = ASKNAME_TEXT.length;
    const col = baseCol + (namePrefix ? namePrefix.length + 1 : 1);
    return [col, row, 1];
}

// ──────────────────────────────────────────────────────────────────────────
// Menu line builder.  Each menu (role/race/gender/align/confirm) is a list
// of lines; we then render them with right-justified or left-justified
// indentation per the empirical formula.
// ──────────────────────────────────────────────────────────────────────────

// renderMenu: given an array of lines (each {prefix, content} or {sep:true}),
// emit the ANSI screen string and the cursor [col, row, vis].
// indent_extra (per line) lets a "forces" line have +4 cols of leading pad.
//
// lines[i] = { content: string, padLeft: int }  (padLeft default 0; "forces"
//             lines have padLeft=4).  Empty content → blank row.
// title    = string in reverse-video at row 0
// fitsIn24 = if false, force indent=0 left-align
function renderMenu(title, lines, fitsIn24) {
    // Compute max effective line length (content + padLeft).  Empty lines
    // contribute 0.
    let maxLen = title.length;
    for (const ln of lines) {
        const eff = (ln.content?.length || 0) + (ln.padLeft || 0);
        if (eff > maxLen) maxLen = eff;
    }
    let indent;
    if (!fitsIn24) {
        // Left-aligned full role menu: content starts at col 1 (col 0 is a
        // recorded ` (end)` puts "(end)" at cols 1..5 and cursor at col 7
        // (1-indexed) = 6 (0-indexed), i.e. col-after-")" + 1.
        indent = 1;
    } else {
        indent = Math.max(0, Math.min(41, 78 - maxLen));
    }
    return renderMenuAt(title, lines, indent);
}

// renderMenuAt: emit the menu at a specific indent column.
function renderMenuAt(title, lines, indent) {
    let out = '';
    // Row 0: title (reverse-video)
    out += emitLeading(indent, 0) + '\x1b[7m' + title + '\x1b[0m';
    // Row 1+: lines (each followed by '\n' before the next row).  Empty
    // content → blank row.  Last line has no trailing newline.
    let cursorCol = 0, cursorRow = 0;
    for (let i = 0; i < lines.length; i++) {
        out += '\n';
        const ln = lines[i];
        const content = ln.content || '';
        const pad = ln.padLeft || 0;
        if (content.length === 0) {
            // blank row: nothing emitted
            cursorCol = 0;
        } else {
            const colStart = indent + pad;
            out += emitLeading(colStart, 0) + content;
            cursorCol = colStart + content.length;
        }
        cursorRow = i + 1;  // 0-indexed
    }
    // Cursor is 1-indexed column, 0-indexed row.
    // After emitting the last line's content, cursor sits at colEnd + 1 (1-indexed).
    // For the renderer: rows in `lines` are after the title at row 0, so the
    // last lines[lines.length-1] is at row=lines.length.
    return {
        screen: out,
        cursor: [cursorCol + 1, cursorRow, 1],
    };
}

// emitLeading: produce the run-length-encoded leading whitespace per the
// (firstCol is the col to position cursor at; current is the col cursor is
// already at, which is always 0 at start of a row.)
function emitLeading(firstCol, currentCol) {
    const gap = firstCol - currentCol;
    if (gap <= 0) return '';
    if (gap > 4) return `\x1b[${gap}C`;
    return ' '.repeat(Math.max(0, gap));
}

// ──────────────────────────────────────────────────────────────────────────
// Menu builders for each menu type
// ──────────────────────────────────────────────────────────────────────────

// Build "<role> <race> <gender> <alignment>" info line.
// C ref: role.c plsel_startmenu:2820-2825.
function buildInfoLine(state) {
    const rolenameForInfo =
        state.role === ROLE_NONE ? '<role>'
        : (state.gender === 1 && ROLES[state.role].f) ? ROLES[state.role].f
        : ROLES[state.role].m;
    const racename  = state.race  === ROLE_NONE ? '<race>'      : RACES[state.race].noun;
    const gendname  = state.gender=== ROLE_NONE ? '<gender>'    : GENDERS[state.gender].adj;
    const alignname = state.align === ROLE_NONE ? '<alignment>' : ALIGNS[state.align].adj;
    return `${rolenameForInfo} ${racename} ${gendname} ${alignname}`;
}

// Build the "Name the alignment gender race role" confirm-screen line.
// C ref: role.c plsel_startmenu:2828-2833.
function buildConfirmInfoLine(state, name) {
    const rolenameForInfo =
        state.role === ROLE_NONE ? '<role>'
        : (state.gender === 1 && ROLES[state.role].f) ? ROLES[state.role].f
        : ROLES[state.role].m;
    const raceadj   = RACES[state.race].adj;
    const gendadj   = GENDERS[state.gender].adj;
    const alignadj  = ALIGNS[state.align].adj;
    return `${name} the ${alignadj} ${gendadj} ${raceadj} ${rolenameForInfo}`;
}

// Role-menu "extras" appended after the role list — Random + race/gender/
// align-first + filter + quit.  Each "<what>-first" may be replaced by a
// "<constrainer> forces <value>" line.  C ref: role.c role_menu_extra:1816.
//
// For a ROLE menu, 'what' values inserted (in order): RS_RACE, RS_GENDER,
// RS_ALGNMNT, RS_filter, RS_NONE(quit).
// For a RACE menu: RS_ROLE, RS_GENDER, RS_ALGNMNT, RS_filter, RS_NONE.
// For a GENDER menu: RS_ROLE, RS_RACE, RS_ALGNMNT, RS_filter, RS_NONE.
// For an ALIGN menu: RS_ROLE, RS_RACE, RS_GENDER, RS_filter, RS_NONE.
//
// The "<what>-first" entry uses different verbiage depending on whether
// 'what' is already pinned ("another" prefix) or not.
// C ref: role.c:1936 — `Pick%s %s first`, " another" if already set.
//
// Returns array of {content, padLeft} entries.
function buildExtras(state, menuKind) {
    const out = [];
    // The set of "switch to ..." entries to consider, in role.c order.
    // Each kind has its own selector char ('/' for race, '"' for gender,
    // '[' for align, '?' for role, '~' for filter, 'q' for quit).
    const KINDS = [
        { key: 'role',   sel: '?', label: 'role',      forcedFn: forcedRole },
        { key: 'race',   sel: '/', label: 'race',      forcedFn: forcedRace },
        { key: 'gender', sel: '"', label: 'gender',    forcedFn: forcedGender },
        { key: 'align',  sel: '[', label: 'alignment', forcedFn: forcedAlign },
    ];
    for (const k of KINDS) {
        if (k.key === menuKind) continue;  // skip the kind we're currently picking
        const forced = k.forcedFn(state);
        if (forced) {
            // "    constrainer forces value"
            out.push({ content: `${forced.constrainer} forces ${forced.value}`, padLeft: 4 });
        } else {
            const already = state[k.key] !== ROLE_NONE;
            const verb = already ? 'Pick another ' : 'Pick ';
            out.push({ content: `${k.sel} - ${verb}${k.label} first`, padLeft: 0 });
        }
    }
    // C ref: role.c:1943 — "Reset" once anything has been filtered, else "Set".
    out.push({ content: `~ - ${gotrolefilter() ? 'Reset' : 'Set'} role/race/&c filtering`,
               padLeft: 0 });
    // "q - Quit"
    out.push({ content: 'q - Quit', padLeft: 0 });
    return out;
}

// forced* helpers — detect when role/race forces a facet to a single value.
// C ref: role.c role_menu_extra (1837-1925).
// Return {constrainer, value} or null.
// C ref: role.c:1841-1848 — the role entry is disabled when every OTHER role
// has been filtered out, so the filter has forced this one.
function forcedRole(state) {
    const f = state.role;
    let i = 0;
    for (; i < ROLES.length; i++)
        if (i !== f && !rfilter.roles[i]) break;
    if (i === ROLES.length) return { constrainer: 'filter', value: 'role' };
    return null;
}
function forcedRace(state) {
    if (state.role !== ROLE_NONE) {
        const mask = ROLES[state.role].allow & ROLE_RACEMASK;
        if (mask === MH_HUMAN) return { constrainer: 'role', value: 'human' };
        // C ref: role.c:1859 — the filter has narrowed the role's races to
        // exactly the already-chosen one.
        const f = state.race;
        if (f !== ROLE_NONE && (mask & ~rfilter.mask) === RACES[f].selfmask)
            return { constrainer: 'filter', value: 'race' };
    }
    return null;
}
function forcedGender(state) {
    if (state.role !== ROLE_NONE) {
        const mask = ROLES[state.role].allow & ROLE_GENDMASK;
        if (mask === ROLE_MALE)   return { constrainer: 'role', value: 'male' };
        if (mask === ROLE_FEMALE) return { constrainer: 'role', value: 'female' };
        // C ref: role.c:1881.
        const f = state.gender;
        if (f !== ROLE_NONE && (mask & ~rfilter.mask) === GENDERS[f].allow)
            return { constrainer: 'filter', value: 'gender' };
    }
    return null;
}
function forcedAlign(state) {
    if (state.role !== ROLE_NONE) {
        const mask = ROLES[state.role].allow & ROLE_ALIGNMASK;
        if (mask === AM_LAWFUL)  return { constrainer: 'role', value: 'lawful'  };
        if (mask === AM_NEUTRAL) return { constrainer: 'role', value: 'neutral' };
        if (mask === AM_CHAOTIC) return { constrainer: 'role', value: 'chaotic' };
    }
    if (state.race !== ROLE_NONE) {
        const mask = RACES[state.race].allow & ROLE_ALIGNMASK;
        if (mask === AM_LAWFUL)  return { constrainer: 'race', value: 'lawful'  };
        if (mask === AM_NEUTRAL) return { constrainer: 'race', value: 'neutral' };
        if (mask === AM_CHAOTIC) return { constrainer: 'race', value: 'chaotic' };
    }
    // C ref: role.c:1916-1922 — no role/race constrainer, but the filter has
    // left exactly the already-chosen alignment standing.
    const f = state.align;
    if (f !== ROLE_NONE && (ROLE_ALIGNMASK & ~rfilter.mask) === ALIGNS[f].allow)
        return { constrainer: 'filter', value: 'alignment' };
    return null;
}

// Build the role menu (lines without title; title is "Pick a role or
// profession").  Returns {title, lines, fitsIn24}.
function buildRoleMenu(state) {
    const lines = [];
    // Row 1: blank separator
    lines.push({ content: '' });
    // Row 2: info line
    lines.push({ content: buildInfoLine(state) });

    // Compute valid role count to determine fitsIn24 via maybe_skip_seps.
    // C ref: role.c maybe_skip_seps:2776 — n = 4 + n_valid_roles + 2 + 5 + 1.
    const shown = roleMenuShown(state);
    let nValid = 0;
    for (let i = 0; i < ROLES.length; i++) if (shown(i)) nValid++;
    const n = 4 + nValid + 2 + 5 + 1;
    const excess = n > 24 ? n - 24 : 0;
    const fitsIn24 = excess === 0;

    // Row 3: blank separator (unless excess >= 2 — squeezed)
    if (excess !== 2) lines.push({ content: '' });

    // Role list — only roles that pass ALL ok_* checks.
    const letters = roleMenuLetters(state.gender, shown);
    for (let i = 0; i < ROLES.length; i++) {
        if (!shown(i)) continue;
        const label = roleLabel(i, state.gender);
        lines.push({ content: `${letters[i]} - ${an(label)}` });
    }
    // "* * Random"
    lines.push({ content: '* * Random' });
    // separator (unless excess >= 1)
    if (excess < 1) lines.push({ content: '' });
    // Extras (race-1st, gender-1st, align-1st, filter, quit)
    for (const ex of buildExtras(state, 'role')) lines.push(ex);
    // "(end)"
    lines.push({ content: '(end)' });

    return { title: 'Pick a role or profession', lines, fitsIn24 };
}

// Race menu — C ref: role.c setup_racemenu:2904, plus role_menu_extra
// inserts RS_ROLE/RS_GENDER/RS_ALGNMNT/RS_filter/RS_NONE.
function buildRaceMenu(state) {
    const lines = [];
    lines.push({ content: '' });
    lines.push({ content: buildInfoLine(state) });
    lines.push({ content: '' });

    for (let i = 0; i < RACES.length; i++) {
        if (!ok_race(state.role, i, state.gender, state.align)) continue;
        if (!ok_role(state.role, i, state.gender, state.align)) continue;
        if (!ok_align(state.role, i, state.gender, state.align)) continue;
        const letter = RACES[i].noun[0];
        lines.push({ content: `${letter} - ${RACES[i].noun}` });
    }
    lines.push({ content: '* * Random' });
    lines.push({ content: '' });
    for (const ex of buildExtras(state, 'race')) lines.push(ex);
    lines.push({ content: '(end)' });

    return { title: 'Pick a race or species', lines, fitsIn24: true };
}

// Gender menu — C ref: role.c setup_gendmenu:2942.
function buildGenderMenu(state) {
    const lines = [];
    lines.push({ content: '' });
    lines.push({ content: buildInfoLine(state) });
    lines.push({ content: '' });

    for (let i = 0; i < GENDERS.length; i++) {
        if (!ok_gend(state.role, state.race, i, state.align)) continue;
        if (!ok_role(state.role, state.race, i, state.align)) continue;
        if (!ok_race(state.role, state.race, i, state.align)) continue;
        const letter = GENDERS[i].adj[0];
        lines.push({ content: `${letter} - ${GENDERS[i].adj}` });
    }
    lines.push({ content: '* * Random' });
    lines.push({ content: '' });
    for (const ex of buildExtras(state, 'gender')) lines.push(ex);
    lines.push({ content: '(end)' });

    return { title: 'Pick a gender or sex', lines, fitsIn24: true };
}

// Align menu — C ref: role.c setup_algnmenu:2978.
function buildAlignMenu(state) {
    const lines = [];
    lines.push({ content: '' });
    lines.push({ content: buildInfoLine(state) });
    lines.push({ content: '' });

    for (let i = 0; i < ALIGNS.length; i++) {
        if (!ok_align(state.role, state.race, state.gender, i)) continue;
        if (!ok_role(state.role, state.race, state.gender, i)) continue;
        if (!ok_race(state.role, state.race, state.gender, i)) continue;
        const letter = ALIGNS[i].adj[0];
        lines.push({ content: `${letter} - ${ALIGNS[i].adj}` });
    }
    lines.push({ content: '* * Random' });
    lines.push({ content: '' });
    for (const ex of buildExtras(state, 'align')) lines.push(ex);
    lines.push({ content: '(end)' });

    return { title: 'Pick an alignment or creed', lines, fitsIn24: true };
}

// "Is this ok?" confirm menu.
// C ref: role.c:2643-2680.  Layout:
//   Is this ok? [ynaq]   <-- title (reverse-video)
//   <blank>
//   <name> the <align> <gender> <race> <role>
//   <blank>
//   y * Yes; start game
//   n - No; choose role again
//   a - Not yet; choose another name   (only if iflags.renameallowed)
//   q - Quit
//   (end)
// `mark` is the selection indicator column of the preselected "Yes" entry:
// '*' while it is still selected (wintty.c:1470, a fresh page draw of a
// MENU_ITEMFLAGS_SELECTED entry) and '-' once MENU_UNSELECT_ALL/_PAGE has
// cleared it (wintty.c:1182 set_item_state).
function buildConfirmMenu(state, name, mark = '*') {
    const lines = [];
    lines.push({ content: '' });
    lines.push({ content: buildConfirmInfoLine(state, name) });
    lines.push({ content: '' });
    lines.push({ content: `y ${mark} Yes; start game` });
    lines.push({ content: 'n - No; choose role again' });
    lines.push({ content: 'a - Not yet; choose another name' });
    lines.push({ content: 'q - Quit' });
    lines.push({ content: '(end)' });
    return { title: 'Is this ok? [ynaq]', lines, fitsIn24: true };
}

// ──────────────────────────────────────────────────────────────────────────
// reset_role_filtering() — the '~' entry of every chargen menu.
// C ref: role.c:2727.
// ──────────────────────────────────────────────────────────────────────────

// The filter menu's items, in add order.  C ref: role.c:2734-2752 —
//   "Unacceptable roles"      + setup_rolemenu(win, FALSE, NONE, NONE, NONE)
//   "" "Unacceptable races"   + setup_racemenu(win, FALSE, NONE, NONE, NONE)
//   "" "Unacceptable genders" + setup_gendmenu(win, FALSE, NONE, NONE, NONE)
//   "" "Unacceptable aligns"  + setup_algnmenu(win, FALSE, NONE, NONE, NONE)
// Every setup_*menu runs with filtering==FALSE, so (a) nothing is skipped,
// (b) the accelerators use the reset-filter spelling — roles keep their
// lowercase menu letter, races/genders/alignments take the CAPITAL of their
// first letter so they cannot collide with the lowercase role letters
// (role.c:2925-2929) — and (c) an entry the CURRENT filter already excludes
// comes up preselected (role.c:2894-2898), which is how "unpick any that no
// longer apply" works on a re-open.
function buildFilterMenuItems() {
    const items = [];
    const str = (text) => items.push({ text, selectable: false });
    const entry = (selector, text, aString, ok) =>
        items.push({ selector, text, aString, selectable: true,
                     selected: !ok, mark: !ok ? '*' : '-' });

    str('Unacceptable roles');
    const letters = roleMenuLetters(ROLE_NONE);
    for (let i = 0; i < ROLES.length; i++) {
        const role_ok = ok_role(i, ROLE_NONE, ROLE_NONE, ROLE_NONE)
                     && ok_race(i, ROLE_NONE, ROLE_NONE, ROLE_NONE)
                     && ok_gend(i, ROLE_NONE, ROLE_NONE, ROLE_NONE)
                     && ok_align(i, ROLE_NONE, ROLE_NONE, ROLE_NONE);
        entry(letters[i], an(roleLabel(i, ROLE_NONE)), ROLES[i].m, role_ok);
    }

    str('');
    str('Unacceptable races');
    for (let i = 0; i < RACES.length; i++) {
        // no ok_gend(): race isn't constrained by gender (role.c:2917)
        const race_ok = ok_race(ROLE_NONE, i, ROLE_NONE, ROLE_NONE)
                     && ok_role(ROLE_NONE, i, ROLE_NONE, ROLE_NONE)
                     && ok_align(ROLE_NONE, i, ROLE_NONE, ROLE_NONE);
        entry(RACES[i].noun[0].toUpperCase(), RACES[i].noun, RACES[i].noun, race_ok);
    }

    str('');
    str('Unacceptable genders');
    for (let i = 0; i < GENDERS.length; i++) {
        // no ok_align(): gender isn't constrained by alignment (role.c:2955)
        const gend_ok = ok_gend(ROLE_NONE, ROLE_NONE, i, ROLE_NONE)
                     && ok_role(ROLE_NONE, ROLE_NONE, i, ROLE_NONE)
                     && ok_race(ROLE_NONE, ROLE_NONE, i, ROLE_NONE);
        entry(GENDERS[i].adj[0].toUpperCase(), GENDERS[i].adj, GENDERS[i].adj, gend_ok);
    }

    str('');
    str('Unacceptable alignments');
    for (let i = 0; i < ALIGNS.length; i++) {
        // no ok_gend(): alignment isn't constrained by gender (role.c:2991)
        const algn_ok = ok_align(ROLE_NONE, ROLE_NONE, ROLE_NONE, i)
                     && ok_role(ROLE_NONE, ROLE_NONE, ROLE_NONE, i)
                     && ok_race(ROLE_NONE, ROLE_NONE, ROLE_NONE, i);
        entry(ALIGNS[i].adj[0].toUpperCase(), ALIGNS[i].adj, ALIGNS[i].adj, algn_ok);
    }
    return items;
}

// C ref: role.c:2754.
function filterPrompt() {
    return 'Pick all that apply'
         + (gotrolefilter() ? ' and/or unpick any that no longer apply' : '');
}

// Render one page of the filter menu.
//
// The filter menu is 32 tty menu items tall (30 above + the prompt pair
// end_menu prepends, wintty.c:2680-2689), so tty_end_menu's
// `maxrow = lmax + 1 = 24` is >= ttyDisplay->rows and tty_display_nhwindow
// forces `cw->offx = 0` (wintty.c:1927) — a full-screen, cleared, paginated
// menu rather than the right-hand overlay the role/race/&c menus get.  Each
// item row is `tty_curs(window, 1, row)` followed by a literal ' ' and then
// the item string (wintty.c:1484-1487), i.e. content at column 1.
//
// The footer is morestr: "(N of M)" when paginated, "(end) " when not
// (wintty.c:1537-1543 / :2741-2751).  dmore() positions at curx+2 == column 1
// and then advances by strlen(morestr) — so the cursor lands at
// 1 + strlen(morestr), which is why a paged "(1 of 2)" (no trailing space)
// leaves the cursor one column left of where an "(end) " of the same visible
// width would.
function renderFilterPage(pageItems, morestr) {
    const INDENT = 1;
    const rows = [];
    for (const it of pageItems) {
        const content = it.selectable ? `${it.selector} ${it.mark} ${it.text}`
                                      : it.text;
        if (!content) { rows.push(''); continue; }
        rows.push(emitLeading(INDENT, 0)
                  + (it.prompt ? '\x1b[7m' + content + '\x1b[0m' : content));
    }
    rows.push(emitLeading(INDENT, 0) + morestr.replace(/\s+$/, ''));
    return {
        screen: rows.join('\n'),
        cursor: [INDENT + morestr.length, pageItems.length, 1],
    };
}

// buildIsThisOkFrame(name, infoLine): the "Is this ok? [ynaq]" confirmation
// frame for the GAME-PICKS (pick4u=='y') path.  Unlike the 'n' (manual-menu)
// path — where the role/race/gender/align menus have already replaced the
// copyright banner, so the confirm menu renders on a blank background — the
// 'y' path never showed any menu, so the confirm menu overlays the still-
// visible copyright banner + "Who are you? <name>" askname line.
//
// C ref: role.c:2643-2680 confirm menu (tty select_menu) drawn over the
// startup screen.  The menu window is positioned at offx = COLNO - maxwidth
// - 2 (capped by renderMenu to indent 41 here); it clears cols offx..79 on
// its rows, so the banner shows through cols 0..offx-1 (truncated where the
// banner text would run under the window).  The `infoLine` is the confirm
// description "<name> the <align> <gender> <race> <role>" (built by the
// caller from the pinned role/race/gender/align, identical to
// buildConfirmInfoLine's output).
// `opts`:
//   mark        the preselected "Yes" indicator — see buildConfirmMenu.
//   bannerClip  the column from which rows 0..maxrow of the BASE_WINDOW have
//               already been erased by a previous dismissal of this same
//               window (wintty.c:1310 erase_menu_or_text -> docorner(cw->offx)
//               with cw->offx != 0, which does tty_curs(BASE_WINDOW, offx, y)
//               + cl_end() and so clears from column offx-1 rightwards).  The
//               copyright banner underneath is never repainted, so the clip is
//               permanent and cumulative.  Infinity = nothing erased yet.
//   row10       the rename re-prompt line "Who are you? <newname>" that
//               askname() left at row 10 (role.c:2691 case 'a'), or null.
//   row12Name   the name on the ORIGINAL askname line at row 12.  A rename
//               does not rewrite that line — it is screen residue — so this
//               stays the first name typed even after plname changes.
function buildIsThisOkFrame(name, infoLine, opts = {}) {
    const { mark = '*', bannerClip = Infinity, row10 = null } = opts;
    const row12Name = ('row12Name' in opts) ? opts.row12Name : name;
    const COLNO = 80, ROWNO = 24;
    const title = 'Is this ok? [ynaq]';
    // Menu body lines (rows 1..8), in role.c:2654-2679 order.  `mark` is the
    // preselected "Yes" entry's indicator — see buildConfirmMenu.
    const menuLines = [
        '',                                     // blank
        infoLine,                               // <name> the <align> <gender> <race> <role>
        '',                                     // blank
        `y ${mark} Yes; start game`,
        'n - No; choose role again',
        'a - Not yet; choose another name',
        'q - Quit',
        '(end)',
    ];
    // indent = renderMenu's formula: min(41, 78 - maxContentWidth).
    let maxLen = title.length;
    for (const l of menuLines) if (l.length > maxLen) maxLen = l.length;
    const indent = Math.max(0, Math.min(41, 78 - maxLen));
    const offx = indent - 1;                    // window left margin (blanked)

    // 24x80 grid of spaces.
    const grid = [];
    for (let r = 0; r < ROWNO; r++) grid.push(new Array(COLNO).fill(' '));
    const paint = (row, col, text) => {
        for (let i = 0; i < text.length; i++) grid[row][col + i] = text[i];
    };

    // Copyright banner background (rows 4..7) — same as buildShallIPickFrame.
    paint(4, 0, COPYRIGHT_BANNER_A);
    paint(5, BANNER_INDENT, COPYRIGHT_BANNER_B);
    paint(6, BANNER_INDENT, COPYRIGHT_BANNER_C);
    paint(7, BANNER_INDENT, COPYRIGHT_BANNER_D);

    // A previous dismissal of this window erased the banner from bannerClip
    // rightwards on the window's own rows, and nothing ever repainted it.
    const winRows = 1 + menuLines.length;
    if (bannerClip < COLNO)
        for (let r = 0; r < winRows; r++)
            for (let c = bannerClip; c < COLNO; c++) grid[r][c] = ' ';

    // Menu window clears cols offx..79 on its rows (title + body), then paints
    // content at `indent`.
    for (let r = 0; r < winRows; r++)
        for (let c = offx; c < COLNO; c++) grid[r][c] = ' ';
    paint(0, indent, title);                    // reverse-video applied at serialize
    for (let i = 0; i < menuLines.length; i++)
        if (menuLines[i].length) paint(i + 1, indent, menuLines[i]);

    // The rename re-prompt askname() left at row 10, still visible below the
    // window (the window spans rows 0..winRows-1 only).
    if (row10) paint(10, 0, row10);
    // Askname line at row 12 (still visible below the window).
    paint(12, 0, ASKNAME_TEXT + (row12Name ? ' ' + row12Name : ''));

    // else literal spaces; trailing blanks trimmed; rows joined by '\n'.
    const rowStrs = [];
    for (let r = 0; r < ROWNO; r++) {
        let last = -1;
        for (let i = 0; i < COLNO; i++) if (grid[r][i] !== ' ') last = i;
        let s = '';
        let col = 0;
        while (col <= last) {
            if (grid[r][col] === ' ') {
                let g = 0;
                while (col + g <= last && grid[r][col + g] === ' ') g++;
                s += g > 4 ? `\x1b[${g}C` : ' '.repeat(Math.max(0, g));
                col += g;
            } else {
                let run = '';
                while (col <= last && grid[r][col] !== ' ') { run += grid[r][col]; col++; }
                s += run;
            }
        }
        if (r === 0) s = s.replace(title, '\x1b[7m' + title + '\x1b[0m');
        rowStrs.push(s);
    }
    let lastRow = rowStrs.length - 1;
    while (lastRow >= 0 && rowStrs[lastRow] === '') lastRow--;
    const screen = rowStrs.slice(0, lastRow + 1).join('\n');
    // Cursor after "(end)" (row 8), one past its last char (matches tty
    // select_menu PICK_ONE footer cursor).
    const cursor = [indent + '(end)'.length + 1, winRows - 1, 1];
    return { screen, cursor, indent };
}

// The rename askname() re-prompt on the GAME-PICKS (pick4u=='y') path.
// role.c:2691 case 'a' runs destroy_nhwindow(win) BEFORE plnamesuffix(), and
// with program_state.in_role_selection set that dismissal is
// docorner(cw->offx, cw->maxrow + 1, 0) (wintty.c:1298/1310): rows 0..maxrow
// are cleared from column offx-1 rightwards and the map is refreshed, which
// paints nothing because no level exists yet.  What survives is the copyright
// banner (rows 4..7, now truncated at `bannerClip`) and the original
// "Who are you? <name>" line at row 12; askname() then re-prompts at row 10,
// where the BASE_WINDOW cursor sits.
function buildAsknameOverBanner(typed, row12Name, bannerClip) {
    const COLNO = 80, ROWNO = 24;
    const grid = [];
    for (let r = 0; r < ROWNO; r++) grid.push(new Array(COLNO).fill(' '));
    const paint = (row, col, text) => {
        for (let i = 0; i < text.length; i++)
            if (col + i < COLNO) grid[row][col + i] = text[i];
    };
    paint(4, 0, COPYRIGHT_BANNER_A);
    paint(5, BANNER_INDENT, COPYRIGHT_BANNER_B);
    paint(6, BANNER_INDENT, COPYRIGHT_BANNER_C);
    paint(7, BANNER_INDENT, COPYRIGHT_BANNER_D);
    // The dismissal cleared rows 0..maxrow from bannerClip rightwards.  The
    // confirm window is 9 rows tall (title + 8), so maxrow + 1 == 9.
    if (bannerClip < COLNO)
        for (let r = 0; r < 9; r++)
            for (let c = bannerClip; c < COLNO; c++) grid[r][c] = ' ';
    paint(10, 0, ASKNAME_TEXT + (typed ? ' ' + typed : ''));
    paint(12, 0, ASKNAME_TEXT + (row12Name ? ' ' + row12Name : ''));

    const rowStrs = [];
    for (let r = 0; r < ROWNO; r++) {
        let last = -1;
        for (let i = 0; i < COLNO; i++) if (grid[r][i] !== ' ') last = i;
        let str = '';
        let col = 0;
        while (col <= last) {
            if (grid[r][col] === ' ') {
                let g = 0;
                while (col + g <= last && grid[r][col + g] === ' ') g++;
                str += g > 4 ? `\x1b[${g}C` : ' '.repeat(Math.max(0, g));
                col += g;
            } else {
                let run = '';
                while (col <= last && grid[r][col] !== ' ') { run += grid[r][col]; col++; }
                str += run;
            }
        }
        rowStrs.push(str);
    }
    let lastRow = rowStrs.length - 1;
    while (lastRow >= 0 && rowStrs[lastRow] === '') lastRow--;
    return {
        screen: rowStrs.slice(0, lastRow + 1).join('\n'),
        cursor: cursorForAsknameAtRow(10, typed),
    };
}

// Normalize the "Shall I pick ...?" answer the way C does
// (role.c:2263-2268): <space>/<return> → 'y' (default), '@'/'*' → 'a'
// (auto-pick, no confirmation).  Returns 'y' | 'n' | 'a' | null.
// Used by both generateChargenFrames (to decide whether the game-picks
// confirm frame is shown) and jsmain.js (to decide whether the newgame
// step's key is the leaked confirm key or a live com_pager dismiss).
export function chargenShallAnswer(chargenKeys) {
    const { shallIPickAnswer } = parseChargenKeys(chargenKeys);
    let sip = shallIPickAnswer;
    if (sip === ' ' || sip === '\r' || sip === '\n' || sip === 'Y') sip = 'y';
    else if (sip === '@' || sip === '*' || sip === 'A') sip = 'a';
    else if (sip === 'N') sip = 'n';
    return sip;
}

// ──────────────────────────────────────────────────────────────────────────
// State machine — process chargen keys
// ──────────────────────────────────────────────────────────────────────────

// nextPhase: after a successful role/race/gender/align pick, decide what
// menu (if any) to show next.  C ref: role.c:2289 — the do/while loop in
// genl_player_setup, with the nextpick variable.
//
// nextPhaseAfter encodes the C state machine:
//   after RS_ROLE      → next = RS_RACE
//   after RS_RACE      → next = (ROLE<0)? RS_ROLE : RS_GENDER
//   after RS_GENDER    → next = (ROLE<0)? RS_ROLE : (RACE<0)? RS_RACE : RS_ALGNMNT
//   after RS_ALGNMNT   → next = (ROLE<0)? RS_ROLE : (RACE<0)? RS_RACE : RS_GENDER
// Then the loop skips phases whose facet is already set (via the
// `if (FACET<0)` guards in each block).
//
// Additionally each block has an inline `n==1` shortcut: if exactly one
// option is valid for that facet, set it inline (no menu, no rn2).
// We apply that here so the renderer advances past forced facets.
// C ref: role.c:2386-2454 (race block n=1 fall-through), 2474-2542 (gender),
// 2562-2627 (align).
function nValid(phase, state) {
    let n = 0, last = -1;
    if (phase === 'race') {
        for (let i = 0; i < RACES.length; i++) {
            if (ok_race(state.role, i, state.gender, state.align)) { n++; last = i; }
        }
    } else if (phase === 'gender') {
        for (let i = 0; i < GENDERS.length; i++) {
            if (ok_gend(state.role, state.race, i, state.align)) { n++; last = i; }
        }
    } else if (phase === 'align') {
        for (let i = 0; i < ALIGNS.length; i++) {
            if (ok_align(state.role, state.race, state.gender, i)) { n++; last = i; }
        }
    } else if (phase === 'role') {
        for (let i = 0; i < ROLES.length; i++) {
            if (ok_role(i, state.race, state.gender, state.align)
                && ok_race(i, state.race, state.gender, state.align)
                && ok_gend(i, state.race, state.gender, state.align)
                && ok_align(i, state.race, state.gender, state.align)) { n++; last = i; }
        }
    }
    return { n, last };
}

function nextPhaseAfter(picked, state) {
    let candidate;
    if      (picked === 'role')   candidate = 'race';
    else if (picked === 'race')   candidate = state.role  === ROLE_NONE ? 'role' : 'gender';
    else if (picked === 'gender') candidate = state.role  === ROLE_NONE ? 'role'
                                              : state.race === ROLE_NONE ? 'race'
                                              : 'align';
    else if (picked === 'align')  candidate = state.role  === ROLE_NONE ? 'role'
                                              : state.race === ROLE_NONE ? 'race'
                                              : 'gender';
    else candidate = 'role';

    // Walk forward through phases in role.c priority order, inline-forcing
    // facets that have n==1 (the manual-pick n==1 shortcut in each block).
    // NO rn2 is consumed for these inline forces — C's `n = 0; k = 0; for
    // ... if (ok_*) { n++; k = i; } ... if (n > 1) menu; FACET = k;` path
    // skips pick_*_rigid entirely.  We stop at the first phase that:
    //   (a) has n > 1 → menu to open
    //   (b) has n == 0 → ROLE_NONE retained, but caller (C) falls through to
    //       next phase or loops back to ROLE.  We treat as "stay here";
    //       practically n==0 only happens after a backtrack which would have
    //       been chosen by the player explicitly.
    const order = ['role', 'race', 'gender', 'align'];
    let idx = order.indexOf(candidate);
    for (let step = 0; step < order.length; step++) {
        const p = order[(idx + step) % order.length];
        if (state[p] !== ROLE_NONE) continue;
        const { n, last } = nValid(p, state);
        if (n === 1 && p !== 'role') {
            // Inline-force this facet (no rn2). 'role' is never inline-
            // forced — the role menu always opens because the player needs
            // a role-character choice.
            state[p] = last;
            continue;
        }
        return p;  // open menu here
    }
    return 'confirm';
}

// Initial state: nothing picked.
function freshState() {
    return { role: ROLE_NONE, race: ROLE_NONE, gender: ROLE_NONE, align: ROLE_NONE };
}

// Parse a chargen key for the current phase.  Returns:
//   { action: 'select', kind: 'role'|'race'|'gender'|'align', value: int }
//   { action: 'switch', target: 'role'|'race'|'gender'|'align' }
//   { action: 'random' }    // '*' — caller must consume RNG via chargenRng
//   { action: 'quit' }
//   { action: 'filter' }   // '~' — not handled; treat as no-op
//   null                    // key didn't match anything in this menu
function parseMenuKey(phase, key, state) {
    if (key === 'q' || key === '\x1b') return { action: 'quit' };
    if (key === '*') return { action: 'random' };
    if (key === '~') return { action: 'filter' };

    if (phase === 'role') {
        if (key === '/') return { action: 'switch', target: 'race' };
        if (key === '"') return { action: 'switch', target: 'gender' };
        if (key === '[') return { action: 'switch', target: 'align' };
        // Match against role letters
        const shown = roleMenuShown(state);
        const letters = roleMenuLetters(state.gender, shown);
        for (let i = 0; i < ROLES.length; i++) {
            if (!shown(i)) continue;
            if (letters[i] === key) return { action: 'select', kind: 'role', value: i };
        }
        return null;
    }

    if (phase === 'race') {
        if (key === '?') return { action: 'switch', target: 'role' };
        if (key === '"') return { action: 'switch', target: 'gender' };
        if (key === '[') return { action: 'switch', target: 'align' };
        for (let i = 0; i < RACES.length; i++) {
            if (!ok_race(state.role, i, state.gender, state.align)) continue;
            if (RACES[i].noun[0] === key) return { action: 'select', kind: 'race', value: i };
        }
        return null;
    }

    if (phase === 'gender') {
        if (key === '?') return { action: 'switch', target: 'role' };
        if (key === '/') return { action: 'switch', target: 'race' };
        if (key === '[') return { action: 'switch', target: 'align' };
        for (let i = 0; i < GENDERS.length; i++) {
            if (!ok_gend(state.role, state.race, i, state.align)) continue;
            if (GENDERS[i].adj[0] === key) return { action: 'select', kind: 'gender', value: i };
        }
        return null;
    }

    if (phase === 'align') {
        if (key === '?') return { action: 'switch', target: 'role' };
        if (key === '/') return { action: 'switch', target: 'race' };
        if (key === '"') return { action: 'switch', target: 'gender' };
        for (let i = 0; i < ALIGNS.length; i++) {
            if (!ok_align(state.role, state.race, state.gender, i)) continue;
            if (ALIGNS[i].adj[0] === key) return { action: 'select', kind: 'align', value: i };
        }
        return null;
    }
    return null;
}

// Apply '*' random pick at current phase.  Consumes one rn2(n) value from
// chargenRng.  Returns true if pick succeeded.
function applyRandomPick(phase, state, chargenRng, rngIdx) {
    let valid = [];
    if (phase === 'role') {
        for (let i = 0; i < ROLES.length; i++)
            if (ok_role(i, state.race, state.gender, state.align)
                && ok_race(i, state.race, state.gender, state.align)
                && ok_gend(i, state.race, state.gender, state.align)
                && ok_align(i, state.race, state.gender, state.align))
                valid.push(i);
    } else if (phase === 'race') {
        for (let i = 0; i < RACES.length; i++)
            if (ok_race(state.role, i, state.gender, state.align))
                valid.push(i);
    } else if (phase === 'gender') {
        for (let i = 0; i < GENDERS.length; i++)
            if (ok_gend(state.role, state.race, i, state.align))
                valid.push(i);
    } else if (phase === 'align') {
        for (let i = 0; i < ALIGNS.length; i++)
            if (ok_align(state.role, state.race, state.gender, i))
                valid.push(i);
    }
    if (valid.length === 0) return { picked: ROLE_NONE, nextRngIdx: rngIdx };

    // Consume one rn2(valid.length) entry from chargenRng.  The recorded
    // valid[result] so the rendered frame matches C's choice.  The JS
    // RNG itself advances via replayChargenPreInitRng on the same call,
    // keeping the post-chargen RNG stream in sync.
    const slot = chargenRng[rngIdx];
    let picked;
    if (slot && typeof slot.result === 'number') {
        picked = valid[slot.result];
    } else {
        // Fallback: pick first valid (won't match recorded screens, but
        // ensures we don't crash).
        picked = valid[0];
    }
    if (picked === undefined) picked = valid[0];
    return { picked, nextRngIdx: rngIdx + 1 };
}

// ──────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────

// parseChargenKeys: split the chargen key stream into name + terminator +
// shall-I-pick answer + remaining menu keys.
function parseChargenKeys(chargenKeys) {
    let name = '';
    let nameTerminator = null;
    let shallIPickAnswer = null;
    let i = 0;
    while (i < chargenKeys.length) {
        const ch = chargenKeys[i];
        if (ch === '\r' || ch === '\n') { nameTerminator = ch; i++; break; }
        name += ch;
        i++;
    }
    if (i < chargenKeys.length) { shallIPickAnswer = chargenKeys[i]; i++; }
    return { name, nameTerminator, shallIPickAnswer, menuKeys: chargenKeys.slice(i) };
}

// generateChargenFrames(chargenKeys, chargenRng?)
//
// chargenRng: optional array of {fn:'rn2', n:number, result:number} for
// pre-init pick calls.  If absent, '*' random picks default to first valid.
//
// Returns { screens, cursors } sized to chargenKeys.length.
export function generateChargenFrames(chargenKeys, chargenRng, confirmDesc) {
    chargenRng = chargenRng || [];
    resetRfilter();   // see playChargen: gr.rfilter is per-game, not per-module
    const screens = [];
    const cursors = [];

    if (chargenKeys.length === 0) return { screens, cursors };

    const parsed = parseChargenKeys(chargenKeys);
    const { name, nameTerminator, shallIPickAnswer, menuKeys } = parsed;

    // Step 0: initial askname frame at row 12.
    screens.push(buildCopyrightAskname(''));
    cursors.push(cursorForAskname(''));

    // Steps 1..N: one frame per name char typed.
    let typed = '';
    for (let i = 0; i < name.length; i++) {
        typed += name[i];
        screens.push(buildCopyrightAskname(typed));
        cursors.push(cursorForAskname(typed));
    }

    // Step N+1: "Shall I pick" prompt frame (terminator key consumed).
    if (nameTerminator !== null) {
        screens.push(buildShallIPickFrame(name));
        cursors.push(cursorForShallIPick());
    }

    // If shall-I-pick answer wasn't 'n', the game auto-picks role/race/gender/
    // align (pick4u 'y' or 'a') and the manual menu loop is bypassed.
    // C ref: role.c:2654 getconfirmation = picksomething && pick4u != 'a' —
    // for pick4u=='y' (also the <space>/<return> default) C then shows the
    // "Is this ok? [ynaq]" confirmation menu overlaid on the copyright banner;
    // for pick4u=='a' it skips confirmation and starts the game immediately.
    const sip = chargenShallAnswer(chargenKeys);
    if (sip !== 'n') {
        if (sip === 'y' && confirmDesc) {
            // Confirm description is "<name> the <align> <gender> <race> <role>"
            // (buildConfirmInfoLine format).  The caller supplies the fixed
            // "<align> <gender> <race> <role>" tail from the welcome screen; the
            // typed name (parsed above) prefixes it — the same svp.plname C uses.
            const infoLine = `${name} the ${confirmDesc}`;
            const { screen, cursor } = buildIsThisOkFrame(name, infoLine);
            screens.push(screen);
            cursors.push(cursor);
            // Process the y/n/a/q keys that follow the confirm frame,
            // including the 'a' (rename) redo sub-loop — role.c:2654-2717
            // getconfirmation loop.
            runGamePicksConfirmLoop(screens, cursors, menuKeys, name, confirmDesc);
        }
        fillRest(screens, cursors, chargenKeys.length);
        return { screens, cursors };
    }

    // Step N+2: first role menu after 'n'.
    // C ref: role.c:2289 `nextpick = RS_ROLE` initialises the makepicks loop.
    let state = freshState();
    let phase = 'role';
    let currentName = name;
    let asknameRow = ASKNAME_ROW;  // 12 initially
    let rngIdx = 0;

    // emitCurrentMenu: render the menu for the current `phase` variable.
    // After rigid_role_checks may force some facets; if all 4 facets are now
    // set, transition to 'confirm'.  Otherwise honour the explicit phase
    // (set by switch / select / random handlers) — DON'T re-derive from
    // state, because the C semantics let the user switch to e.g. 'race' even
    // when role is also unset (player chose order, not greedy first-unset).
    // RNG tracker: tracks how many entries of chargenRng have been consumed
    // by rigid_role_checks calls.  Each '*' user-pick also consumes one
    // entry (applied separately in the 'random' action handler).
    // C ref: role.c:2814 plsel_startmenu → rigid_role_checks; role.c:1247-1279
    // rigid_role_checks → pick_*_rigid → rn2(1) per forced facet.
    const rngTracker = { consume(_n) { rngIdx++; } };

    // emitCurrentMenu: render the menu for the current `phase` variable.
    // C ref: role.c:2634 `while (ROLE<0 || RACE<0 || GEND<0 || ALGN<0)`
    // exits when all are set → confirm prompt at 2654.
    function emitCurrentMenu() {
        rigid_role_checks(state, rngTracker);
        if (state.role !== ROLE_NONE && state.race !== ROLE_NONE
            && state.gender !== ROLE_NONE && state.align !== ROLE_NONE) {
            phase = 'confirm';
        }
        let menu;
        if (phase === 'role')   menu = buildRoleMenu(state);
        else if (phase === 'race')  menu = buildRaceMenu(state);
        else if (phase === 'gender')menu = buildGenderMenu(state);
        else if (phase === 'align') menu = buildAlignMenu(state);
        else if (phase === 'confirm') menu = buildConfirmMenu(state, currentName);
        else return null;
        const rendered = renderMenu(menu.title, menu.lines, menu.fitsIn24);
        return rendered;
    }

    // The first menu is emitted AFTER consuming 'n' (the shall-I-pick answer).
    // C: after the prompt-loop break, control falls to the makepicks: loop
    // which renders the first role menu.
    {
        const r = emitCurrentMenu();
        screens.push(r.screen);
        cursors.push(r.cursor);
    }

    // Process each subsequent menu key.  Each key transitions state and
    // emits the next frame.
    let phaseMode = 'menu';  // 'menu' | 'askname' (re-prompt during rename)
    let nameInProgress = '';
    for (let k = 0; k < menuKeys.length; k++) {
        const key = menuKeys[k];

        if (phaseMode === 'askname') {
            // We're re-prompting for a name (after 'a' in confirm menu).
            if (key === '\r' || key === '\n') {
                // Submit new name → emit confirm menu again with new name.
                currentName = nameInProgress;
                nameInProgress = '';
                phaseMode = 'menu';
                // The new confirm screen also leaves the old askname prompt
                // show: confirm menu at top + "\n\nWho are you? Luna" at
                // bottom (askname prompt + name at row 10).  Render that.
                const menu = buildConfirmMenu(state, currentName);
                const rendered = renderMenu(menu.title, menu.lines, true);
                // Append askname prompt+name at rows past the menu.
                // Menu has 9 lines (rows 0..8); recorded screen shows
                // 2 blank rows (rows 9..10 — actually one blank then prompt),
                // then "Who are you? Luna" at row 10.
                const screen = rendered.screen + '\n\n' + ASKNAME_TEXT
                    + (currentName ? ' ' + currentName : '');
                // Cursor stays at the confirm menu's "(end)" position; the
                // recorded cursor for step 25 is [45,8] = same as confirm.
                screens.push(screen);
                cursors.push(rendered.cursor);
                continue;
            }
            // Typed name char.
            nameInProgress += key;
            // Emit askname frame at row 10 with name-so-far.
            const screen = buildAsknameAtRow(asknameRow, nameInProgress);
            const cur = cursorForAsknameAtRow(asknameRow, nameInProgress);
            screens.push(screen);
            cursors.push(cur);
            continue;
        }

        // We're in a menu (role/race/gender/align/confirm).
        if (phase === 'confirm') {
            // Y/N/A/Q
            if (key === 'y' || key === '\r' || key === '\n' || key === ' ') {
                // accept; no more chargen frames expected (newgame fires next)
                // but we still need to fill placeholder for this key.
                // step has the confirm-menu still on screen with a final
                // updated cursor.  For our purposes, repeat last screen.
                screens.push(screens[screens.length - 1]);
                cursors.push(cursors[cursors.length - 1]);
                // After this point, no further chargen keys are expected.
                continue;
            }
            if (key === 'n') {
                // Restart from role-pick: clear all picks, emit role menu.
                // C ref: role.c:2682 confirm switch — case (default fallthrough
                // to 'n') case 2: goto makepicks; with ROLE/RACE/GEND/ALGN reset.
                state = freshState();
                phase = 'role';
                asknameRow = ASKNAME_ROW;
                const r = emitCurrentMenu();
                screens.push(r.screen);
                cursors.push(r.cursor);
                continue;
            }
            if (key === 'a') {
                // Rename: clear name, prompt askname again at row 10.
                // C: role.c:2686 case 'a' — sets svp.plname[0]='\0' and
                // calls plnamesuffix() which calls askname() again.  The
                phaseMode = 'askname';
                nameInProgress = '';
                asknameRow = 10;
                const screen = buildAsknameAtRow(asknameRow, '');
                const cur = cursorForAsknameAtRow(asknameRow, '');
                screens.push(screen);
                cursors.push(cur);
                continue;
            }
            if (key === 'q' || key === '\x1b') {
                // Quit from confirm — C goto setup_done; the menu is erased
                // (tty_dismiss / erase_menu_or_text emit blank rows and home
                // the cursor).  Recorded final frame is empty + cursor [0,1].
                // C ref: role.c:2683-2684 default case → setup_done.
                screens.push('');
                cursors.push([0, 1, 1]);
                continue;
            }
            // Unknown key in confirm menu — repeat last frame.
            screens.push(screens[screens.length - 1]);
            cursors.push(cursors[cursors.length - 1]);
            continue;
        }

        // Menu (role/race/gender/align)
        const parsed = parseMenuKey(phase, key, state);
        if (!parsed) {
            // Unknown key — repeat last frame.
            screens.push(screens[screens.length - 1]);
            cursors.push(cursors[cursors.length - 1]);
            continue;
        }
        if (parsed.action === 'quit') {
            // No more frames; fill placeholder.
            screens.push('');
            cursors.push([0, 1, 1]);  // recorded cursor for step 33 = [0,1,1]
            continue;
        }
        if (parsed.action === 'filter') {
            // Filter dialog — not implemented; treat as no-op (repeat).
            screens.push(screens[screens.length - 1]);
            cursors.push(cursors[cursors.length - 1]);
            continue;
        }
        if (parsed.action === 'switch') {
            // Backtrack: clear the current phase's pick and switch to target.
            // C does this by setting current facet=ROLE_NONE and nextpick=target.
            state[phase] = ROLE_NONE;
            phase = parsed.target;
            const r = emitCurrentMenu();
            screens.push(r.screen);
            cursors.push(r.cursor);
            continue;
        }
        if (parsed.action === 'select') {
            state[parsed.kind] = parsed.value;
            phase = nextPhaseAfter(phase, state);
            const r = emitCurrentMenu();
            screens.push(r.screen);
            cursors.push(r.cursor);
            continue;
        }
        if (parsed.action === 'random') {
            // '*' — consume rn2(n_valid), set state[phase].
            const { picked, nextRngIdx } = applyRandomPick(phase, state, chargenRng, rngIdx);
            rngIdx = nextRngIdx;
            state[phase] = picked;
            phase = nextPhaseAfter(phase, state);
            const r = emitCurrentMenu();
            screens.push(r.screen);
            cursors.push(r.cursor);
            continue;
        }
    }

    return { screens, cursors };
}

// runGamePicksConfirmLoop: processes the keys following the game-picks
// (pick4u=='y') "Is this ok? [ynaq]" confirm frame.
//
// C ref: role.c:2654-2717 `while (getconfirmation)` — 'y'/space/return
// accepts (drops out; no more chargen frames), 'q'/ESC quits (setup_done),
// and 'a' (case 3) sets svp.plname[0]='\0' then calls plnamesuffix(), which
// calls askname() again while leaving ROLE/RACE/GEND/ALGN untouched — the
// confirm loop then re-shows with the new name.  Unlike the manual-menu
// ('n' at shall-I-pick) path's confirm menu — which paints over a blank
// menu background — this confirm menu overlays the still-visible copyright
// banner + original "Who are you? <name>" line (row 12), so destroying the
// menu window (tty_dismiss/erase_menu_or_text, which blanks columns
// offx..79 on the window's rows) reveals the (possibly truncated) banner
// underneath rather than a blank screen; askname() then redraws "Who are
// you?" at row 10, leaving the row-12 line from the original name entry
// untouched.  We track this with a persistent 24x80 grid rather than
// string concatenation so those left-behind rows fall out naturally.
function runGamePicksConfirmLoop(screens, cursors, menuKeys, originalName, confirmDesc) {
    const COLNO = 80, ROWNO = 24;
    const grid = [];
    for (let r = 0; r < ROWNO; r++) grid.push(new Array(COLNO).fill(' '));
    const paint = (row, col, text) => {
        for (let i = 0; i < text.length; i++) grid[row][col + i] = text[i];
    };
    const clearRow = (row) => { grid[row] = new Array(COLNO).fill(' '); };

    paint(4, 0, COPYRIGHT_BANNER_A);
    paint(5, BANNER_INDENT, COPYRIGHT_BANNER_B);
    paint(6, BANNER_INDENT, COPYRIGHT_BANNER_C);
    paint(7, BANNER_INDENT, COPYRIGHT_BANNER_D);
    paint(12, 0, ASKNAME_TEXT + (originalName ? ' ' + originalName : ''));

    // winRows/offx describe the currently-painted confirm window; updated
    // by renderConfirmMenu and read back when the window is dismissed.
    let winRows = 0, offx = 0;
    const renderConfirmMenu = (name) => {
        const infoLine = `${name} the ${confirmDesc}`;
        const title = 'Is this ok? [ynaq]';
        const menuLines = [
            '', infoLine, '',
            'y * Yes; start game',
            'n - No; choose role again',
            'a - Not yet; choose another name',
            'q - Quit',
            '(end)',
        ];
        let maxLen = title.length;
        for (const l of menuLines) if (l.length > maxLen) maxLen = l.length;
        const indent = Math.max(0, Math.min(41, 78 - maxLen));
        offx = indent - 1;
        winRows = 1 + menuLines.length;
        for (let r = 0; r < winRows; r++)
            for (let c = offx; c < COLNO; c++) grid[r][c] = ' ';
        paint(0, indent, title);
        for (let i = 0; i < menuLines.length; i++)
            if (menuLines[i].length) paint(i + 1, indent, menuLines[i]);
        return [indent + '(end)'.length + 1, winRows - 1, 1];
    };
    // Prime the grid/offx/winRows to match the confirm frame the caller
    // already pushed (built via buildIsThisOkFrame) — not re-pushed here.
    renderConfirmMenu(originalName);

    const serialize = () => {
        const rowStrs = [];
        for (let r = 0; r < ROWNO; r++) {
            let last = -1;
            for (let i = 0; i < COLNO; i++) if (grid[r][i] !== ' ') last = i;
            let s = '';
            let col = 0;
            while (col <= last) {
                if (grid[r][col] === ' ') {
                    let g = 0;
                    while (col + g <= last && grid[r][col + g] === ' ') g++;
                    s += g > 4 ? `\x1b[${g}C` : ' '.repeat(Math.max(0, g));
                    col += g;
                } else {
                    let run = '';
                    while (col <= last && grid[r][col] !== ' ') { run += grid[r][col]; col++; }
                    s += run;
                }
            }
            if (r === 0) s = s.replace('Is this ok? [ynaq]', '\x1b[7mIs this ok? [ynaq]\x1b[0m');
            rowStrs.push(s);
        }
        let lastRow = rowStrs.length - 1;
        while (lastRow >= 0 && rowStrs[lastRow] === '') lastRow--;
        return rowStrs.slice(0, lastRow + 1).join('\n');
    };

    let currentName = originalName;
    let mode = 'confirm';  // 'confirm' | 'askname'
    let nameInProgress = '';

    for (let k = 0; k < menuKeys.length; k++) {
        const key = menuKeys[k];

        if (mode === 'askname') {
            if (key === '\r' || key === '\n') {
                currentName = nameInProgress;
                nameInProgress = '';
                mode = 'confirm';
                const cursor = renderConfirmMenu(currentName);
                screens.push(serialize());
                cursors.push(cursor);
                continue;
            }
            nameInProgress += key;
            clearRow(10);
            paint(10, 0, ASKNAME_TEXT + ' ' + nameInProgress);
            screens.push(serialize());
            cursors.push(cursorForAsknameAtRow(10, nameInProgress));
            continue;
        }

        // mode === 'confirm'
        if (key === 'y' || key === '\r' || key === '\n' || key === ' ') {
            // Accept; getconfirmation drops out — no more chargen frames.
            screens.push(screens[screens.length - 1]);
            cursors.push(cursors[cursors.length - 1]);
            continue;
        }
        if (key === 'a') {
            // role.c:2686 case 3 — dismiss the menu, re-ask the name.
            mode = 'askname';
            nameInProgress = '';
            for (let r = 0; r < winRows; r++)
                for (let c = offx; c < COLNO; c++) grid[r][c] = ' ';
            clearRow(10);
            paint(10, 0, ASKNAME_TEXT);
            screens.push(serialize());
            cursors.push(cursorForAsknameAtRow(10, ''));
            continue;
        }
        if (key === 'q' || key === '\x1b') {
            // role.c:2683-2684 default → setup_done.
            screens.push('');
            cursors.push([0, 1, 1]);
            continue;
        }
        // 'n' (role.c:2705 case 2 — reset ROLE/RACE/GEND/ALGN, goto
        // makepicks) and any other key: not implemented for this path;
        // repeat the last frame (same fallback idiom used elsewhere in
        // this file for un-implemented menu actions).
        screens.push(screens[screens.length - 1]);
        cursors.push(cursors[cursors.length - 1]);
    }
}

// fillRest: when the chargen-after-shall-I-pick path isn't fully rendered,
// pad placeholders so the chargen-step count aligns.  (Preserves R1's
// fallback for 'y' answers etc.)
function fillRest(screens, cursors, total) {
    const remaining = total - screens.length;
    if (remaining > 0 && screens.length > 0) {
        const lastScreen = screens[screens.length - 1];
        const lastCursor = cursors[cursors.length - 1];
        for (let i = 0; i < remaining; i++) {
            screens.push(lastScreen);
            cursors.push([lastCursor[0], lastCursor[1], 1]);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// PLAYED chargen (v5).
//
// nethackrc, moves, storage} — no recorded trace.  Everything the v0
// keystrokes belonged to chargen, which role C rolled, what the confirm line
// said) is unavailable by construction, so chargen has to be PLAYED: the same
// keystroke stream the player typed, driving the same menus, consuming the
// same rn2() calls in the same order.
//
// C ref: sys/unix/unixmain.c:198 plnamesuffix() -> tty_askname()
//        (win/tty/wintty.c:651), then :289 player_selection() ->
//        tty_player_selection() -> role.c:2206 genl_player_setup(),
//        then :315 newgame().
//
// Frames are emitted BEFORE each key read and never after the accepting key,
// which is exactly the alignment the recorded steps[] use.
// ══════════════════════════════════════════════════════════════════════════

// Live pick_* — the PICK_RANDOM/PICK_RIGID selectors, with a real rn2.
// C ref: role.c:1015 pick_role, :1081 pick_race, :1146 pick_gend,
// :1211 pick_align.  Note that PICK_RIGID with exactly one valid option
// still falls through to rn2(1): the guard only rejects `ok > 1`, so a
// forced facet consumes an RNG call.  That call is observable in the
function pick_role_live(racenum, gendnum, alignnum, pickhow, rn2) {
    const set = [];
    for (let i = 0; i < ROLES.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, (racenum >= 0) ? racenum : ROLE_RANDOM, gendnum, alignnum)
            && ok_gend(i, racenum, (gendnum >= 0) ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum, gendnum, (alignnum >= 0) ? alignnum : ROLE_RANDOM))
            set.push(i);
    }
    if (set.length === 0 || (set.length > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(set.length)];
}

function pick_race_live(rolenum, gendnum, alignnum, pickhow, rn2) {
    let races_ok = 0;
    for (let i = 0; i < RACES.length; i++)
        if (ok_race(rolenum, i, gendnum, alignnum)) races_ok++;
    if (races_ok === 0 || (races_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    races_ok = rn2(races_ok);
    for (let i = 0; i < RACES.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (races_ok === 0) return i;
            races_ok--;
        }
    }
    return ROLE_NONE;
}

function pick_gend_live(rolenum, racenum, alignnum, pickhow, rn2) {
    let gends_ok = 0;
    for (let i = 0; i < GENDERS.length; i++)
        if (ok_gend(rolenum, racenum, i, alignnum)) gends_ok++;
    if (gends_ok === 0 || (gends_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    gends_ok = rn2(gends_ok);
    for (let i = 0; i < GENDERS.length; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (gends_ok === 0) return i;
            gends_ok--;
        }
    }
    return ROLE_NONE;
}

function pick_align_live(rolenum, racenum, gendnum, pickhow, rn2) {
    let aligns_ok = 0;
    for (let i = 0; i < ALIGNS.length; i++)
        if (ok_align(rolenum, racenum, gendnum, i)) aligns_ok++;
    if (aligns_ok === 0 || (aligns_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    aligns_ok = rn2(aligns_ok);
    for (let i = 0; i < ALIGNS.length; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (aligns_ok === 0) return i;
            aligns_ok--;
        }
    }
    return ROLE_NONE;
}

// C ref: role.c:719 randrole(FALSE) — rn2(SIZE(roles) - 1).
function randrole_live(rn2) { return rn2(ROLES.length); }

// C ref: role.c:1235 rigid_role_checks().  Called from plsel_startmenu
// (role.c:2814) before EVERY menu is opened, and once up front from
// genl_player_setup (role.c:2243).  Order is race, align, gender.
function rigid_role_checks_live(st, rn2) {
    let tmp;
    if (st.role === ROLE_RANDOM) {
        st.role = pick_role_live(st.race, st.gender, st.align, PICK_RANDOM, rn2);
        if (st.role < 0) st.role = randrole_live(rn2);
    }
    if (st.race === ROLE_RANDOM
        && (tmp = pick_race_live(st.role, st.gender, st.align, PICK_RANDOM, rn2)) !== ROLE_NONE)
        st.race = tmp;
    if (st.align === ROLE_RANDOM
        && (tmp = pick_align_live(st.role, st.race, st.gender, PICK_RANDOM, rn2)) !== ROLE_NONE)
        st.align = tmp;
    if (st.gender === ROLE_RANDOM
        && (tmp = pick_gend_live(st.role, st.race, st.align, PICK_RANDOM, rn2)) !== ROLE_NONE)
        st.gender = tmp;

    if (st.role !== ROLE_NONE) {
        if (st.race === ROLE_NONE)
            st.race = pick_race_live(st.role, st.gender, st.align, PICK_RIGID, rn2);
        if (st.align === ROLE_NONE)
            st.align = pick_align_live(st.role, st.race, st.gender, PICK_RIGID, rn2);
        if (st.gender === ROLE_NONE)
            st.gender = pick_gend_live(st.role, st.race, st.align, PICK_RIGID, rn2);
    }
}

const K_BS = 8, K_LF = 10, K_CR = 13, K_ESC = 27, K_DEL = 127;

// A tty PICK_ONE menu treats <space>/<return> as "take the preselected
// entry".  Every role/race/gender/align menu preselects "Random"
// (role_menu_extra(ROLE_RANDOM, win, TRUE), role.c:2317) and the confirm
// menu preselects 'y' (MENU_ITEMFLAGS_SELECTED, role.c:2659).
function isMenuDefaultKey(code) {
    return code === K_CR || code === K_LF || code === 32;
}

// C ref: win/tty/wintty.c:651 tty_askname() — the character filter.
// UNIX/VMS builds map anything that is not a letter, '-', '@', or a
// non-leading digit to '_'.
function asknameFilter(ch, ct) {
    if (ch === '-' || ch === '@') return ch;
    if (ch >= 'a' && ch <= 'z') return ch;
    if (ch >= 'A' && ch <= 'Z') return ch;
    if (ch >= '0' && ch <= '9' && ct > 0) return ch;
    return '_';
}

export async function playChargen(ctx) {
    const rn2 = ctx.rn2;
    const read = ctx.read;
    // gr.rfilter is a process global that C zeroes once at startup; this
    // module is loaded once but replays many games, so a new game must start
    // from an empty filter.  The 'n'-at-confirm restart is NOT a new game —
    // C's `goto makepicks` keeps whatever the player filtered (role.c:2705) —
    // so the recursive call below passes keepFilter.
    if (!ctx.keepFilter) resetRfilter();
    const st = {
        role:   ctx.flags?.initrole  ?? ROLE_NONE,
        race:   ctx.flags?.initrace  ?? ROLE_NONE,
        gender: ctx.flags?.initgend  ?? ROLE_NONE,
        align:  ctx.flags?.initalign ?? ROLE_NONE,
    };
    let plname = ctx.plname || '';
    let renameallowed = ctx.renameallowed || false;
    const result = () => ({ plname, role: st.role, race: st.race,
                            gender: st.gender, align: st.align, quit: false });
    const quit = () => ({ plname, role: st.role, race: st.race,
                          gender: st.gender, align: st.align, quit: true });

    // ── askname ──────────────────────────────────────────────────────────
    // frameFor(typedSoFar) -> {screen, cursor}; supplied by the caller of
    // doAskname because the first prompt sits at row 12 over the copyright
    // banner while the rename re-prompt sits at row 10 over whatever the
    // dismissed confirm window left behind.
    async function doAskname(frameFor) {
        let ct = '';
        for (;;) {
            const f = frameFor(ct);
            const key = await read(f.screen, f.cursor);
            if (key === K_LF || key === K_CR) {
                // C: `while (ct == 0)` re-prompts on an empty name.
                if (ct.length === 0) continue;
                return ct;
            }
            if (key === K_ESC) { ct = ''; continue; }
            if (key === K_BS || key === K_DEL) {
                if (ct.length) ct = ct.slice(0, -1);
                continue;
            }
            // sizeof svp.plname - 1 == PL_NSIZ - 1 == 32.
            if (ct.length < 32) ct += asknameFilter(String.fromCharCode(key), ct.length);
        }
    }

    if (ctx.needAskname) {
        plname = await doAskname((typed) => ({
            screen: buildCopyrightAskname(typed),
            cursor: cursorForAskname(typed),
        }));
        renameallowed = true;   // wintty.c:747 iflags.renameallowed = TRUE
    }

    // ── genl_player_setup ────────────────────────────────────────────────
    // C ref: role.c:2225 — picksomething is sampled BEFORE rigid_role_checks.
    const picksomething = (st.role === ROLE_NONE || st.race === ROLE_NONE
                           || st.gender === ROLE_NONE || st.align === ROLE_NONE);
    rigid_role_checks_live(st, rn2);

    // `forcePick4u` is the `goto makepicks` re-entry (role.c:2705 case 'n'):
    // pick4u is already 'n' and the "Shall I pick ...?" prompt is skipped.
    let pick4u = ctx.forcePick4u || 'n';
    if (!ctx.forcePick4u
        && (st.role === ROLE_NONE || st.race === ROLE_NONE
            || st.gender === ROLE_NONE || st.align === ROLE_NONE)) {
        // C ref: role.c:2257 — the do/while re-prompts until [yna]; 'q'/ESC bails.
        for (;;) {
            const key = await read(buildShallIPickFrame(plname), cursorForShallIPick());
            let a = String.fromCharCode(key).toLowerCase();
            if (key === K_ESC || a === 'q') return quit();
            if (a === ' ' || a === '\n' || a === '\r') a = 'y';
            else if (a === '@' || a === '*') a = 'a';
            if (a === 'y' || a === 'n' || a === 'a') { pick4u = a; break; }
        }
    }

    // ── makepicks ────────────────────────────────────────────────────────
    // C ref: role.c:2288 — `nextpick = RS_ROLE; do { ... } while (any < 0);`
    // The blocks are sequential inside one iteration, so advancing nextpick
    // cascades into the next block without re-entering the loop.
    const RS_ROLE = 'role', RS_RACE = 'race', RS_GENDER = 'gender', RS_ALGNMNT = 'align';

    // Render the menu for `kind` after the plsel_startmenu rigid checks.
    // C ref: role.c:2805 plsel_startmenu -> :2814 rigid_role_checks.
    function menuFrame(kind) {
        rigid_role_checks_live(st, rn2);
        let menu;
        if (kind === RS_ROLE)        menu = buildRoleMenu(st);
        else if (kind === RS_RACE)   menu = buildRaceMenu(st);
        else if (kind === RS_GENDER) menu = buildGenderMenu(st);
        else                         menu = buildAlignMenu(st);
        return renderMenu(menu.title, menu.lines, menu.fitsIn24);
    }

    // Read one selection from the `kind` menu.  Returns one of
    //   {sel:index} | {switchTo:kind} | {random:true} | {quit:true} | {filter:true}
    async function menuPick(kind) {
        for (;;) {
            const f = menuFrame(kind);
            const key = await read(f.screen, f.cursor);
            if (isMenuDefaultKey(key)) return { random: true };   // preselected "Random"
            const parsed = parseMenuKey(kind, String.fromCharCode(key), st);
            if (!parsed) continue;                                 // no such entry: menu redraws
            if (parsed.action === 'quit')   return { quit: true };
            if (parsed.action === 'random') return { random: true };
            if (parsed.action === 'filter') return { filter: true };
            if (parsed.action === 'switch') return { switchTo: parsed.target };
            return { sel: parsed.value };
        }
    }

    // reset_role_filtering() — C ref: role.c:2727.  Opens the PICK_ANY filter
    // menu, applies the selection to gr.rfilter, and clears every facet so the
    // caller re-picks under the new filter.  Returns TRUE when at least one
    // entry was picked (role.c:2769), which is what tells the race/gender/
    // alignment callers to restart at RS_ROLE.  Draws no RNG.
    async function resetRoleFiltering() {
        const items = buildFilterMenuItems();
        // end_menu() prepends a blank and the prompt, in that order, so the
        // prompt is item 0 and the blank is item 1 (wintty.c:2680-2689 adding
        // onto the head of the already-reversed list).
        const all = [{ text: filterPrompt(), prompt: true, selectable: false },
                     { text: '', selectable: false },
                     ...items];
        // wintty.c:2693 — lmax = min(52, ttyDisplay->rows - 1); npages rounds up.
        const LMAX = Math.min(52, 24 - 1);
        const npages = Math.ceil(all.length / LMAX);
        let page = 0, needDraw = true, cancelled = false;
        for (;;) {
            const pageItems = all.slice(page * LMAX,
                                        Math.min(all.length, page * LMAX + LMAX));
            if (needDraw) {
                // A fresh page draw paints '*' for a selected entry
                // (wintty.c:1470); only set_item_state's incremental update
                // uses '+' (wintty.c:1182).
                for (const it of pageItems)
                    if (it.selectable) it.mark = it.selected ? '*' : '-';
                needDraw = false;
            }
            const morestr = (npages > 1) ? `(${page + 1} of ${npages})` : '(end) ';
            const f = renderFilterPage(pageItems, morestr);
            const code = await read(f.screen, f.cursor);
            const ch = String.fromCharCode(code);
            // wintty.c:1552-1557 — a key that is a selector on the CURRENT page
            // becomes MENU_EXPLICIT_CHOICE and is never re-read as a menu
            // command, so 'a' picks the Archeologist rather than select-all.
            const hit = pageItems.find((it) => it.selectable && it.selector === ch);
            if (hit) {
                hit.selected = !hit.selected;
                hit.mark = hit.selected ? '+' : '-';
                continue;
            }
            if (code === K_ESC) {           // wintty.c:1604 — cancel
                for (const it of all) if (it.selectable) it.selected = false;
                cancelled = true;
                break;
            }
            if (code === K_CR || code === K_LF || code === 0) break;  // commit
            if (ch === ' ' || ch === '>') {                            // next page
                if (page !== npages - 1) { page++; needDraw = true; }
                else if (ch === ' ') break;   // ' ' finishes, '>' does not
                continue;
            }
            if (ch === '<') { if (page !== 0) { page--; needDraw = true; } continue; }
            if (ch === '^') { if (page !== 0) { page = 0; needDraw = true; } continue; }
            if (ch === '|') {
                if (page !== npages - 1) { page = npages - 1; needDraw = true; }
                continue;
            }
            const setPage = (want) => {
                for (const it of pageItems)
                    if (it.selectable && it.selected !== want) {
                        it.selected = want;
                        it.mark = want ? '+' : '-';
                    }
            };
            if (ch === '.') { setPage(true); continue; }               // SELECT_PAGE
            if (ch === '\\') { setPage(false); continue; }             // UNSELECT_PAGE
            if (ch === '~') {                                          // INVERT_PAGE
                for (const it of pageItems)
                    if (it.selectable) {
                        it.selected = !it.selected;
                        it.mark = it.selected ? '+' : '-';
                    }
                continue;
            }
            if (ch === 'a') {                                          // SELECT_ALL
                setPage(true);
                for (const it of all) if (it.selectable) it.selected = true;
                continue;
            }
            if (ch === '-') {                                          // UNSELECT_ALL
                setPage(false);
                for (const it of all) if (it.selectable) it.selected = false;
                continue;
            }
            if (ch === '@') {                                          // INVERT_ALL
                for (const it of all)
                    if (it.selectable) {
                        it.selected = !it.selected;
                        if (pageItems.includes(it)) it.mark = it.selected ? '+' : '-';
                    }
                continue;
            }
            // Anything else rings the bell and changes nothing (wintty.c:1745).
            // NB: counted selection (digits -> '#' marks, wintty.c:1563-1601)
            // into this menu.
        }
        const n = cancelled
            ? -1 : all.filter((it) => it.selectable && it.selected).length;
        if (n >= 0) {   // n == 0: clear current filters and don't set new ones
            clearrolefilter(RSF_filter);
            for (const it of all)
                if (it.selectable && it.selected) setrolefilter(it.aString);
            st.role = st.race = st.gender = st.align = ROLE_NONE;
        }
        return n > 0;
    }

    let nextpick = RS_ROLE;
    for (;;) {
        if (nextpick === RS_ROLE) {
            nextpick = RS_RACE;
            if (st.role < 0) {
                let k;
                if (pick4u === 'y' || pick4u === 'a' || st.role === ROLE_RANDOM) {
                    k = pick_role_live(st.race, st.gender, st.align, PICK_RANDOM, rn2);
                    if (k < 0) k = randrole_live(rn2);
                } else {
                    const c = await menuPick(RS_ROLE);
                    if (c.quit) return quit();
                    if (c.switchTo) { st[c.switchTo] = ROLE_NONE; k = ROLE_NONE; nextpick = c.switchTo; }
                    else if (c.filter) {
                        // C ref: role.c:2357-2361 — the role menu ignores the
                        // return value; it always restarts at RS_ROLE.
                        st.role = k = ROLE_NONE;
                        await resetRoleFiltering();
                        nextpick = RS_ROLE;
                    }
                    else if (c.random) {
                        k = pick_role_live(st.race, st.gender, st.align, PICK_RANDOM, rn2);
                        if (k < 0) k = randrole_live(rn2);
                    } else k = c.sel;
                }
                st.role = k;
            }
        }
        if (nextpick === RS_RACE) {
            nextpick = (st.role < 0) ? RS_ROLE : RS_GENDER;
            if (st.race < 0 || !ok_race(st.role, st.race, ROLE_NONE, ROLE_NONE)) {
                let k;
                if (pick4u === 'y' || pick4u === 'a' || st.race === ROLE_RANDOM) {
                    k = pick_race_live(st.role, st.gender, st.align, PICK_RANDOM, rn2);
                } else {
                    // C ref: role.c:2387 — count valid races; only open the
                    // menu when more than one is possible.
                    let n = 0; k = 0;
                    for (let i = 0; i < RACES.length; i++)
                        if (ok_race(st.role, i, st.gender, st.align)) { n++; k = i; }
                    if (n > 1) {
                        const c = await menuPick(RS_RACE);
                        if (c.quit) return quit();
                        if (c.switchTo) { st[c.switchTo] = ROLE_NONE; k = ROLE_NONE; nextpick = c.switchTo; }
                        else if (c.filter) {
                            // C ref: role.c:2441-2447.
                            st.race = k = ROLE_NONE;
                            nextpick = (await resetRoleFiltering()) ? RS_ROLE : RS_RACE;
                        }
                        else if (c.random) k = pick_race_live(st.role, st.gender, st.align, PICK_RANDOM, rn2);
                        else k = c.sel;
                    }
                }
                st.race = k;
            }
        }
        if (nextpick === RS_GENDER) {
            nextpick = (st.role < 0) ? RS_ROLE : (st.race < 0) ? RS_RACE : RS_ALGNMNT;
            if (st.gender < 0 || !ok_gend(st.role, st.race, st.gender, ROLE_NONE)) {
                let k;
                if (pick4u === 'y' || pick4u === 'a' || st.gender === ROLE_RANDOM) {
                    k = pick_gend_live(st.role, st.race, st.align, PICK_RANDOM, rn2);
                } else {
                    let n = 0; k = 0;
                    for (let i = 0; i < GENDERS.length; i++)
                        if (ok_gend(st.role, st.race, i, st.align)) { n++; k = i; }
                    if (n > 1) {
                        const c = await menuPick(RS_GENDER);
                        if (c.quit) return quit();
                        if (c.switchTo) { st[c.switchTo] = ROLE_NONE; k = ROLE_NONE; nextpick = c.switchTo; }
                        else if (c.filter) {
                            // C ref: role.c:2529-2535.
                            st.gender = k = ROLE_NONE;
                            nextpick = (await resetRoleFiltering()) ? RS_ROLE : RS_GENDER;
                        }
                        else if (c.random) k = pick_gend_live(st.role, st.race, st.align, PICK_RANDOM, rn2);
                        else k = c.sel;
                    }
                }
                st.gender = k;
            }
        }
        if (nextpick === RS_ALGNMNT) {
            nextpick = (st.role < 0) ? RS_ROLE : (st.race < 0) ? RS_RACE : RS_GENDER;
            if (st.align < 0 || !ok_align(st.role, st.race, ROLE_NONE, st.align)) {
                let k;
                if (pick4u === 'y' || pick4u === 'a' || st.align === ROLE_RANDOM) {
                    k = pick_align_live(st.role, st.race, st.gender, PICK_RANDOM, rn2);
                } else {
                    let n = 0; k = 0;
                    for (let i = 0; i < ALIGNS.length; i++)
                        if (ok_align(st.role, st.race, st.gender, i)) { n++; k = i; }
                    if (n > 1) {
                        const c = await menuPick(RS_ALGNMNT);
                        if (c.quit) return quit();
                        if (c.switchTo) { st[c.switchTo] = ROLE_NONE; k = ROLE_NONE; nextpick = c.switchTo; }
                        else if (c.filter) {
                            // C ref: role.c:2615-2621.
                            st.align = k = ROLE_NONE;
                            nextpick = (await resetRoleFiltering()) ? RS_ROLE : RS_ALGNMNT;
                        }
                        else if (c.random) k = pick_align_live(st.role, st.race, st.gender, PICK_RANDOM, rn2);
                        else k = c.sel;
                    }
                }
                st.align = k;
            }
        }
        if (st.role >= 0 && st.race >= 0 && st.gender >= 0 && st.align >= 0) break;
    }

    // ── confirmation ─────────────────────────────────────────────────────
    // C ref: role.c:2654 `getconfirmation = picksomething && pick4u != 'a'`.
    // The 'y' (game-picks) confirm window overlays the still-visible
    // copyright banner and askname line; the 'n' (manual-menu) one paints
    // over the last menu, which the tty erased to blank.
    let getconfirmation = picksomething && pick4u !== 'a';
    const overlayBanner = (pick4u === 'y');
    // The rename re-prompt draws "Who are you? <name>" at row 10 (askname's
    // BASE_WINDOW cursor after the confirm window was dismissed).  The confirm
    // window only spans rows 0..8, so that line is still on screen underneath
    let renameResidual = null;
    // The selection indicator of the preselected "Yes" entry, reset on every
    // fresh select_menu() call (role.c:2656 rebuilds the window each pass).
    let yesMark = '*';
    // The row-12 "Who are you? <name>" line is what the FIRST askname() left
    // on the BASE_WINDOW.  A rename writes its re-prompt at row 10 and never
    // touches row 12, so this is pinned to the name we arrive with.
    const asknameResidual = plname;
    // Rows 0..8 of the base window, from this column rightwards, have been
    // erased by a previous dismissal of the confirm menu — see
    // buildIsThisOkFrame.  Cumulative: nothing repaints the banner.
    let bannerClip = Infinity;
    // The indent of the confirm window as last drawn, so the 'a' dismissal
    // knows which column docorner() cleared from (offx - 1 == indent - 2).
    let lastConfirmIndent = null;
    // The rename re-prompt line left at row 10, once a rename has happened.
    let renameRow10 = null;
    function confirmFrame() {
        rigid_role_checks_live(st, rn2);   // plsel_startmenu, role.c:2814
        const info = buildConfirmInfoLine(st, plname);
        if (overlayBanner) {
            const f = buildIsThisOkFrame(plname, info, {
                mark: yesMark, bannerClip, row10: renameRow10,
                row12Name: asknameResidual,
            });
            lastConfirmIndent = f.indent;
            return f;
        }
        const menu = buildConfirmMenu(st, plname, yesMark);
        const r = renderMenu(menu.title, menu.lines, true);
        if (renameResidual === null) return r;
        return {
            screen: r.screen + '\n\n' + ASKNAME_TEXT
                + (renameResidual ? ' ' + renameResidual : ''),
            cursor: r.cursor,
        };
    }
    // C ref: win/tty/wintty.c:287 default_menu_cmds — every tty menu accepts
    // these on top of its own page selectors.
    const DEFAULT_MENU_CMDS = '^|><.-@,\\~:';
    confirm:
    while (getconfirmation) {
        // One select_menu(win, PICK_ONE) call.  C ref: wintty.c:1329
        // process_menu_window().  The window is one page (four entries at
        // most), gacc is empty (role.c adds every entry with gselector 0), so
        //     resp = "yn[a]q" + " " + "0123456789\033\n\r" + default_menu_cmds
        // (wintty.c:1528-1535) and dmore() -> xwaitforspace(resp)
        // (win/tty/getline.c:230) RINGS THE BELL AND KEEPS READING on anything
        // outside that set — it does not return, so no frame changes and the
        // menu simply asks again.
        //
        // This port used to funnel every unrecognised key into `return quit()`,
        // their 320 keystrokes are map/command keys (L, k, H, j, l, #, p, r)
        // that C ignores outright, plus 30 '.' that C accepts into resp and
        // then discards because MENU_SELECT_ALL is PICK_ANY-only.
        yesMark = '*';
        for (;;) {
            const f = confirmFrame();
            const key = await read(f.screen, f.cursor);
            const ch = String.fromCharCode(key);

            // xwaitforspace() breaks on Return/Newline before it ever consults
            // resp, leaving morc == 0 -> case '\0' "finished" (wintty.c:1617).
            // A commit takes the preselected entry; and when MENU_UNSELECT_ALL
            // has cleared it, role.c:2677 maps the resulting n == 0 back to
            // choice 1 anyway, so either way a commit means "yes".
            if (key === K_CR || key === K_LF) break confirm;
            // wintty.c:1603 — ESC cancels the whole menu; select_menu() returns
            // -1 and role.c:2681's default arm quits.
            if (key === K_ESC) return quit();

            // Page selectors.  role.c:2657-2672; 'a' exists only when
            // iflags.renameallowed, so otherwise it is not in resp at all.
            if (ch === 'y') break confirm;                     // a_int 1
            if (ch === 'q') return quit();                     // a_int -1
            if (ch === 'n') {
                // C ref: role.c:2705 — pick4u becomes 'n' and every facet is
                // discarded; control returns to makepicks.  Recursing keeps
                // the pick4u/overlay state consistent without a second copy
                // of the loop above.
                return await playChargen({
                    flags: { initrole: ROLE_NONE, initrace: ROLE_NONE,
                             initgend: ROLE_NONE, initalign: ROLE_NONE },
                    plname, needAskname: false, rn2, read,
                    forcePick4u: 'n', renameallowed, keepFilter: true,
                });
            }
            if (ch === 'a' && renameallowed) {
                // C ref: role.c:2691 — the name is re-asked, role/race/gender/
                // align are saved and restored around plnamesuffix().
                // destroy_nhwindow() runs first: in role selection that is
                // docorner(cw->offx, ...), clearing rows 0..maxrow from
                // column offx-1 == indent-2 rightwards, permanently.
                if (overlayBanner && lastConfirmIndent !== null)
                    bannerClip = Math.min(bannerClip, lastConfirmIndent - 2);
                plname = await doAskname((typed) => (
                    overlayBanner
                        ? buildAsknameOverBanner(typed, asknameResidual, bannerClip)
                        : {
                            screen: buildAsknameAtRow(10, typed),
                            cursor: cursorForAsknameAtRow(10, typed),
                          }));
                renameResidual = plname;
                renameRow10 = ASKNAME_TEXT + (plname ? ' ' + plname : '');
                continue confirm;   // getconfirmation is still True
            }

            // ' ' on a single-page menu finishes it (wintty.c:1621-1631).
            if (ch === ' ') break confirm;
            // Digits only accumulate a count; nothing is drawn (wintty.c:1564).
            if (ch >= '0' && ch <= '9') continue;
            if (DEFAULT_MENU_CMDS.includes(ch)) {
                // MENU_UNSELECT_ALL / MENU_UNSELECT_PAGE are the only two that
                // and repaint its indicator (wintty.c:1653/1651).
                if (ch === '-' || ch === '\\') yesMark = '-';
                // MENU_SEARCH is NOT PORTED: C opens tty_getlin("Search for:")
                // here and, on a match, finishes the PICK_ONE menu with that
                // path is unreached; treating it as a no-op keeps the menu
                // alive, which is strictly closer to C than the old quit.
                //
                // Everything else here — MENU_SELECT_ALL/_PAGE, INVERT_ALL/
                // _PAGE (PICK_ANY only) and the four paging commands on a
                // one-page menu — is a genuine no-op that redraws nothing.
                continue;
            }
            // Not in resp: tty_nhbell() and read again (getline.c:254).
        }
    }
    return result();
}

// ──────────────────────────────────────────────────────────────────────────
// Test helpers — exposed for unit tests.
// ──────────────────────────────────────────────────────────────────────────

export const _internal = {
    buildCopyrightAskname,
    cursorForAskname,
    buildShallIPickFrame,
    cursorForShallIPick,
    parseChargenKeys,
    buildRoleMenu,
    buildRaceMenu,
    buildGenderMenu,
    buildAlignMenu,
    buildConfirmMenu,
    renderMenu,
    renderMenuAt,
    rigid_role_checks,
    COPYRIGHT_BANNER_A,
    COPYRIGHT_BANNER_B,
    COPYRIGHT_BANNER_C,
    COPYRIGHT_BANNER_D,
    SHALL_I_PICK_PROMPT,
    ROLES,
    RACES,
    GENDERS,
    ALIGNS,
};
