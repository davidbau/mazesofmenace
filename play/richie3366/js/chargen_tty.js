// chargen_tty.js — Tty splash + askname + role/race/gender + ynaq confirmation.
// C ref: win/tty/wintty.c tty_init_nhwindows (copyright @ y=4, blank, curs y=11), tty_askname;
// src/version.c copyright_banner_line; include/patchlevel.h COPYRIGHT_BANNER_*;
// role.c genl_player_setup / build_plselection_prompt; role.c setup_rolemenu /
// reset_role_filtering / role_menu_extra(RS_filter, '~').

import { nhgetch, hasQueuedInput, pushKey } from './input.js';
import {
    COPYRIGHT_BANNER_A,
    COPYRIGHT_BANNER_B,
    COPYRIGHT_BANNER_C,
    COPYRIGHT_BANNER_D,
} from './const.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import { roles, races, aligns, genders, roleHasFemaleRoleNameLikeC, coerceChargenIndicesForRoleSelectionPrologLikeC } from './roles.js';
import {
    rigidRoleChecksJs,
    ROLE_NONE,
    ROLE_RANDOM,
    PICK_RANDOM,
    clearChargenRfilterLikeC,
    trySetrolefilterTokenLikeC,
    gotChargenRfilterLikeC,
    resetFilterMenuRoleRowOkLikeC,
    resetFilterMenuRaceRowOkLikeC,
    resetFilterMenuGendRowOkLikeC,
    resetFilterMenuAlignRowOkLikeC,
    okRaceJs,
    okGendJs,
    okAlignJs,
    okAlignJsIgnoreAlignRfilter,
    okRoleJs,
    roleMenuExtraRsRoleGrayLineLikeC,
    roleMenuExtraRsRaceGrayLineLikeC,
    roleMenuExtraRsGenderGrayLineLikeC,
    pickRoleJs,
    pickRaceJs,
    pickGendJs,
    pickAlignJs,
    ROLE_MENU_ORDER_LIKE_C,
} from './chargen_rigid.js';
import { applyIdentityFromNethackrc } from './chargen.js';

const MENU_COL = 41;

const CHARGEN_NAV_ROLE = -200;
const CHARGEN_NAV_GENDER = -201;
const CHARGEN_NAV_ALIGN = -202;
const CHARGEN_NAV_RACE = -203;

/**
 * Apply C `nextpick` / facet clears when a submenu returns an RS_* sentinel from **`readRaceChoice`**.
 * @param {{ initrole: number, initrace: number, initgend: number, initalign: number,
 *   chargenResumePick?: 'race' | 'gender' | 'align' }} f
 * @param {number} t
 * @returns {boolean} whether **`pickManualChargenFacets`** should `continue` without assigning a race index
 */
function chargenHandleSubmenuNavReturnLikeC(f, t) {
    if (t !== CHARGEN_NAV_ROLE && t !== CHARGEN_NAV_GENDER && t !== CHARGEN_NAV_ALIGN && t !== CHARGEN_NAV_RACE) {
        return false;
    }
    if (t === CHARGEN_NAV_ROLE) {
        f.initrole = ROLE_NONE;
        return true;
    }
    if (t === CHARGEN_NAV_GENDER) {
        f.initgend = ROLE_NONE;
        f.chargenResumePick = 'gender';
        return true;
    }
    if (t === CHARGEN_NAV_ALIGN) {
        f.initalign = ROLE_NONE;
        f.chargenResumePick = 'align';
        return true;
    }
    f.initrace = ROLE_NONE;
    f.chargenResumePick = 'race';
    return true;
}

/**
 * C ref: win/tty/wintty.c — after `end_menu`-style text, tty cursor rests past the `(end)` line
 * (C recorder seed0077: left column menus col = len(` (end)`) + 1; right col = MENU_COL + len("(end)") + 1).
 * @param {import('./game_display.js').GameDisplay} disp
 * @param {number} lineStartCol
 * @param {string} lineText — exact string written on the `(end)` row
 * @param {number} endRow
 */
function setChargenEndMenuCursorLikeC(disp, lineStartCol, lineText, endRow) {
    disp.setCursor(lineStartCol + lineText.length + 1, endRow);
}

const NH_TTY_COLS = 80;
/** C tty: `role_menu_extra` “forces …” line is drawn a few columns right of the main menu column. */
const FORCES_EXTRA_COL = 45;

/** C tty: right-justified confirm block shifts left when the widest line needs more than ~COLNO-MENU_COL-2. */
function confirmMenuStartColLikeC(lineTexts) {
    let maxW = 0;
    for (const t of lineTexts) maxW = Math.max(maxW, t.length);
    return Math.min(MENU_COL, Math.max(0, NH_TTY_COLS - maxW - 2));
}

function collectAlignIndicesAcrossRacesLikeC(ri) {
    const set = new Set();
    for (let rai = 0; rai < races.length; rai++) {
        if (!okRaceJs(ri, rai, ROLE_RANDOM, ROLE_RANDOM)) continue;
        for (let ai = 0; ai < aligns.length; ai++) {
            if (okAlignJs(ri, rai, ROLE_RANDOM, ai)) set.add(ai);
        }
    }
    return set;
}

function soleAlignNameAcrossRacesRecapLikeC(ri) {
    const s = collectAlignIndicesAcrossRacesLikeC(ri);
    if (s.size !== 1) return null;
    return aligns[[...s][0]].name;
}

function alignChoicesStillOpenAcrossRacesLikeC(ri) {
    return collectAlignIndicesAcrossRacesLikeC(ri).size > 1;
}

function soleAlignNameForRoleRaceLikeC(ri, rai) {
    if (ri < 0 || rai < 0) return null;
    const set = new Set();
    for (let ai = 0; ai < aligns.length; ai++) {
        if (okAlignJs(ri, rai, ROLE_RANDOM, ai)) set.add(ai);
    }
    if (set.size !== 1) return null;
    return aligns[[...set][0]].name;
}

/** @param {number} ri */
function roleGenderForceTokenLikeC(ri) {
    if (ri < 0) return null;
    const g = roles[ri].allows.gender;
    if (g === 'female') return 'female';
    if (g === 'male') return 'male';
    return null;
}

/** @param {number} ri */
function roleAlignForceNameLikeC(ri) {
    if (ri < 0) return null;
    const a = roles[ri].allows.align;
    if (a.length !== 1) return null;
    const v = a[0];
    const ent = aligns.find((x) => x.value === v);
    return ent ? ent.name : null;
}

/**
 * C genl_player_setup gender menu: `race forces …` when race (e.g. orc) pins alignment but role alone did not.
 * @param {{ initrole: number, initrace: number }} f
 */
function genderMenuForcesLineLikeC(f) {
    const ri = f.initrole;
    const rai = f.initrace;
    if (ri < 0 || rai < 0) return null;
    const fixed = new Set();
    for (let ai = 0; ai < aligns.length; ai++) {
        if (okAlignJs(ri, rai, ROLE_RANDOM, ai)) fixed.add(ai);
    }
    if (fixed.size !== 1) return null;
    const anyR = collectAlignIndicesAcrossRacesLikeC(ri);
    const name = aligns[[...fixed][0]].name;
    return anyR.size > 1 ? `race forces ${name}` : `role forces ${name}`;
}

/** C `role_menu_extra(RS_ALGNMNT)` gray line (align hub + race/gender menus). */
function roleMenuExtraRsAlignGrayLineLikeC(f) {
    const ri = f.initrole;
    if (ri >= 0 && f.initrace < 0) {
        const al = roles[ri].allows.align;
        if (al.length === 1) {
            const ent = aligns.find((x) => x.value === al[0]);
            if (ent) return `role forces ${ent.name}`;
        }
    }
    const fromGr = genderMenuForcesLineLikeC(f);
    if (fromGr) return fromGr;
    const rai = f.initrace;
    const gi = f.initgend >= 0 ? f.initgend : ROLE_RANDOM;
    if (ri < 0 || f.initalign < 0) return null;
    let withF = 0;
    let withoutF = 0;
    for (let ai = 0; ai < aligns.length; ai++) {
        if (okAlignJs(ri, rai >= 0 ? rai : ROLE_RANDOM, gi, ai)) withF++;
        if (okAlignJsIgnoreAlignRfilter(ri, rai >= 0 ? rai : ROLE_RANDOM, gi, ai)) withoutF++;
    }
    if (withF === 1 && withoutF > 1) return 'filter forces alignment';
    return null;
}

/**
 * @param {{ gray?: string, pick?: string }} x
 */
function putChargenMenuExtraPickOrGray(disp, menuCol, forcesCol, row, x) {
    if (x.gray) disp.putstr(forcesCol, row, x.gray, NO_COLOR);
    else if (x.pick) disp.putstr(menuCol, row, x.pick, NO_COLOR);
}

/** C race-picker menu: `role_menu_extra(RS_ROLE)`. */
function raceMenuRsRoleExtraLikeC(f) {
    const gray = roleMenuExtraRsRoleGrayLineLikeC(f);
    if (gray) return { gray };
    return { pick: `? - Pick${f.initrole >= 0 ? ' another' : ''} role first` };
}

/** C race-picker menu: `role_menu_extra(RS_GENDER)`. */
function raceMenuRsGenderExtraLikeC(f) {
    const gray = roleMenuExtraRsGenderGrayLineLikeC(f);
    if (gray) return { gray };
    return { pick: `" - Pick${f.initgend >= 0 ? ' another' : ''} gender first` };
}

/** C race-picker menu: `role_menu_extra(RS_ALGNMNT)`. */
function raceMenuRsAlignExtraLikeC(f) {
    const gray = roleMenuExtraRsAlignGrayLineLikeC(f);
    if (gray) return { gray };
    const ri = f.initrole;
    if (ri >= 0 && alignChoicesStillOpenAcrossRacesLikeC(ri)) {
        return { pick: `[ - Pick${f.initalign >= 0 ? ' another' : ''} alignment first` };
    }
    return {};
}

/** C gender-picker menu: `role_menu_extra(RS_ROLE)`. */
function genderMenuRsRoleExtraLikeC(f) {
    return raceMenuRsRoleExtraLikeC(f);
}

/** C gender-picker menu: `role_menu_extra(RS_RACE)`. */
function genderMenuRsRaceExtraLikeC(f) {
    const gray = roleMenuExtraRsRaceGrayLineLikeC(f);
    if (gray) return { gray };
    return { pick: `/ - Pick${f.initrace >= 0 ? ' another' : ''} race first` };
}

/** C gender-picker menu: `role_menu_extra(RS_ALGNMNT)`. */
function genderMenuRsAlignExtraLikeC(f) {
    const gray = roleMenuExtraRsAlignGrayLineLikeC(f);
    if (gray) return { gray };
    const ri = f.initrole;
    if (ri >= 0 && f.initrace >= 0) {
        const open = [];
        for (let ai = 0; ai < aligns.length; ai++) {
            if (okAlignJs(ri, f.initrace, f.initgend >= 0 ? f.initgend : ROLE_RANDOM, ai)) open.push(ai);
        }
        if (open.length > 1) {
            return { pick: `[ - Pick${f.initalign >= 0 ? ' another' : ''} alignment first` };
        }
    }
    return {};
}

/** @param {{ initrole: number, initrace: number, initgend: number, initalign: number }} f */
function raceMenuRecapLineLikeC(f) {
    const rn = roleNameForDisplay(f.initrole, f.initgend);
    const genderTok = f.initgend >= 0
        ? genders[f.initgend].name
        : (roleGenderForceTokenLikeC(f.initrole) ?? '<gender>');
    let anTok;
    if (f.initalign >= 0) anTok = aligns[f.initalign].name;
    else {
        const sole = soleAlignNameAcrossRacesRecapLikeC(f.initrole);
        anTok = sole ?? '<alignment>';
    }
    return `${rn} <race> ${genderTok} ${anTok}`;
}

/** C wintty.c tty_init_nhwindows: tty_curs(BASE_WINDOW,1,4) then 4×copyright + blank. */
const TTY_COPYRIGHT_START_ROW = 4;
/** One blank line after the four copyright rows (C tty_putstr empty before display). */
const TTY_POST_COPYRIGHT_BLANK_ROW = 8;
/** C tty: first `tty_askname` after cold start — `Who are you?` below copyright block (recorder seed0006). */
const ASKNAME_ROW_FULL = 12;
/** C tty: `Who are you?` after confirm `a` (another name) — no copyright repaint (recorder seed0006 step 13). */
const ASKNAME_ROW_COMPACT = 10;
/** C tty: `Shall I pick … [ynaq]` on row 0 above copyright + recap (recorder seed0006 step 8). */
const YNAQ_AFTER_NAME_ROW = 0;
/** Recap `Who are you? plname` on row 12 under blank lines after copyright (same as first askname row). */
const WHO_ARE_YOU_RECAP_ROW = 12;

/** C clearrolefilter at each chargen top (new name / restart). */
export function resetChargenRfilter() {
    clearChargenRfilterLikeC();
}

function filterMenuExtraLine() {
    return `~ - ${gotChargenRfilterLikeC() ? 'Reset' : 'Set'} role/race/&c filtering`;
}

/**
 * C reset_role_filtering end_menu prompt (role.c ~2754–2755).
 */
function paintResetRoleFilterHelpOverlay(disp) {
    for (let r = 0; r <= 8; r++) disp.clearRow(r);
    const lines = [
        'Pick all facets you want marked UNACCEPTABLE (C PICK_ANY).',
        'Toggled +/- lines are excluded like setrolefilter() after Enter.',
        gotChargenRfilterLikeC()
            ? 'C also allows unpicking entries that no longer apply.'
            :         'Empty selection after Enter clears all filters (C n==0).',
        '',
        'Accelerators match role.c setup_*menu(FALSE): roles a/A, races H…',
        'Keys: < > or , . change page  Enter apply  ESC cancel (no change) — any key…',
    ];
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].length > 80 ? lines[i].slice(0, 80) : lines[i];
        disp.putstr(0, 1 + i, t, NO_COLOR);
    }
}

/** @returns {{ key: string, token: string, label: string, section: string }[]} */
function buildResetFilterMenuEntriesLikeC() {
    /** @type {{ key: string, token: string, label: string, section: string }[]} */
    const entries = [];
    let lastch = '\x00';
    for (const ri of ROLE_MENU_ORDER_LIKE_C) {
        if (ri < 0 || ri >= roles.length) continue;
        const r = roles[ri];
        let thisch = roleMenuAccelLetterLikeC(r.name.m[0], lowc(lastch));
        lastch = lowc(thisch);
        let label = r.name.m;
        if (r.name.f && r.name.f !== r.name.m) label = `${r.name.m}/${r.name.f}`;
        entries.push({ key: thisch, token: r.name.m, label, section: 'roles' });
    }
    for (let rai = 0; rai < races.length; rai++) {
        const rc = races[rai];
        const thisch = highc(rc.name[0]);
        entries.push({ key: thisch, token: rc.name, label: rc.name, section: 'races' });
    }
    for (let gi = 0; gi < genders.length; gi++) {
        const g = genders[gi];
        const thisch = highc(g.name[0]);
        entries.push({ key: thisch, token: g.name, label: g.name, section: 'genders' });
    }
    for (let ai = 0; ai < aligns.length; ai++) {
        const a = aligns[ai];
        const thisch = highc(a.name[0]);
        entries.push({ key: thisch, token: a.name, label: a.name, section: 'aligns' });
    }

    const used = new Set();
    const spare = '0123456789';
    let si = 0;
    for (const e of entries) {
        let k = e.key;
        while (used.has(k)) {
            k = spare[si++] ?? '?';
        }
        used.add(k);
        e.key = k;
    }
    return entries;
}

/** C tty `reset_role_filtering` / plsel: two pages, `Pick all that apply` header (seed0006). */
const FILTER_MENU_PAGE_COUNT = 2;

function resetFilterRoleRecapNounLikeC(ri) {
    const r = roles[ri];
    if (r.name.f && r.name.f !== r.name.m) return `${r.name.m}/${r.name.f}`;
    return r.name.m;
}

/** C indefinite article for first word (`an Archeologist`, `a Priest/Priestess`). */
function indefiniteArticlePickerLikeC(nounPhrase) {
    const firstWord = nounPhrase.trim().split(/[/\s]+/)[0] || 'x';
    return /^[aeiou]/i.test(firstWord[0]) ? 'an' : 'a';
}

/**
 * @param {{ key: string, token: string, label: string, section: string }[]} entries
 * @param {Set<string>} selected
 * @param {number} page — 0 = roles+races, 1 = genders+aligns
 */
function paintResetRoleFilterMenuLikeC(disp, entries, selected, page) {
    disp.clearScreen();
    disp.putstr(0, 0, ' ', NO_COLOR);
    disp.putstr(1, 0, 'Pick all that apply', NO_COLOR, ATR_INVERSE);
    let row = 2;
    if (page === 0) {
        disp.putstr(0, row, ' Unacceptable roles', NO_COLOR);
        row++;
        for (let ri = 0; ri < roles.length; ri++) {
            const e = entries.find((x) => x.section === 'roles' && x.token === roles[ri].name.m);
            if (!e) continue;
            const mark = selected.has(e.token) ? '+' : '-';
            const noun = resetFilterRoleRecapNounLikeC(ri);
            const art = indefiniteArticlePickerLikeC(noun);
            disp.putstr(0, row, ` ${e.key} ${mark} ${art} ${noun}`, NO_COLOR);
            row++;
        }
        row++;
        disp.putstr(0, row, ' Unacceptable races', NO_COLOR);
        row++;
        for (let rai = 0; rai < races.length; rai++) {
            const e = entries.find((x) => x.section === 'races' && x.token === races[rai].name);
            if (!e) continue;
            const mark = selected.has(e.token) ? '+' : '-';
            disp.putstr(0, row, ` ${e.key} ${mark} ${races[rai].name}`, NO_COLOR);
            row++;
        }
    } else {
        disp.putstr(0, row, ' Unacceptable genders', NO_COLOR);
        row++;
        for (let gi = 0; gi < genders.length; gi++) {
            const e = entries.find((x) => x.section === 'genders' && x.token === genders[gi].name);
            if (!e) continue;
            const mark = selected.has(e.token) ? '+' : '-';
            disp.putstr(0, row, ` ${e.key} ${mark} ${genders[gi].name}`, NO_COLOR);
            row++;
        }
        row++;
        disp.putstr(0, row, ' Unacceptable alignments', NO_COLOR);
        row++;
        for (let ai = 0; ai < aligns.length; ai++) {
            const e = entries.find((x) => x.section === 'aligns' && x.token === aligns[ai].name);
            if (!e) continue;
            const mark = selected.has(e.token) ? '+' : '-';
            disp.putstr(0, row, ` ${e.key} ${mark} ${aligns[ai].name}`, NO_COLOR);
            row++;
        }
    }
    const foot = ` (${page + 1} of ${FILTER_MENU_PAGE_COUNT})`;
    disp.putstr(0, 23, foot, NO_COLOR);
    disp.cursorVisible = true;
    disp.setCursor(foot.length, 23);
}

function resetFilterAcceleratorTokenLikeC(entries, inch) {
    const e = entries.find((x) => String(x.key) === inch);
    return e ? e.token : undefined;
}

/**
 * C role.c reset_role_filtering() + select_menu(PICK_ANY): Enter applies
 * (n>=0 → clearrolefilter, setrolefilter per selected, ROLE=RACE=GEND=ALGN=NONE);
 * ESC → n<0 skips that block (filters and facets unchanged). Return (n>0).
 * Accelerators: setup_*menu(FALSE) (plus collision fallback digits).
 * @param {import('./game_display.js').GameDisplay} disp
 * @param {{ initrole: number, initrace: number, initgend: number, initalign: number }} f
 * @returns {Promise<boolean>} C truth value: true iff applied with at least one selection.
 */
async function runResetRoleFilteringMenuLikeC(disp, f) {
    const entries = buildResetFilterMenuEntriesLikeC();

    const selected = new Set();
    for (let ri = 0; ri < roles.length; ri++) {
        if (!resetFilterMenuRoleRowOkLikeC(ri)) selected.add(roles[ri].name.m);
    }
    for (let rai = 0; rai < races.length; rai++) {
        if (!resetFilterMenuRaceRowOkLikeC(rai)) selected.add(races[rai].name);
    }
    for (let gi = 0; gi < genders.length; gi++) {
        if (!resetFilterMenuGendRowOkLikeC(gi)) selected.add(genders[gi].name);
    }
    for (let ai = 0; ai < aligns.length; ai++) {
        if (!resetFilterMenuAlignRowOkLikeC(ai)) selected.add(aligns[ai].name);
    }

    let page = 0;
    let applied = false;
    /** C select_menu count n (selected rows) at apply time. */
    let nApplied = 0;

    for (;;) {
        paintResetRoleFilterMenuLikeC(disp, entries, selected, page);

        const c = await nhgetch();
        if (c === 27) break;
        if (c === 13 || c === 10) {
            applied = true;
            nApplied = selected.size;
            clearChargenRfilterLikeC();
            for (const e of entries) {
                if (selected.has(e.token)) trySetrolefilterTokenLikeC(e.token);
            }
            break;
        }
        if (c === 63) {
            paintResetRoleFilterHelpOverlay(disp);
            await nhgetch();
            continue;
        }
        if (c === 62 || c === 46) {
            page = (page + 1) % FILTER_MENU_PAGE_COUNT;
            continue;
        }
        if (c === 60 || c === 44) {
            page = (page + FILTER_MENU_PAGE_COUNT - 1) % FILTER_MENU_PAGE_COUNT;
            continue;
        }
        const inch = String.fromCodePoint(c);
        const tok = resetFilterAcceleratorTokenLikeC(entries, inch);
        if (tok) {
            if (selected.has(tok)) selected.delete(tok);
            else selected.add(tok);
        }
    }

    if (applied) {
        f.initrole = ROLE_NONE;
        f.initrace = ROLE_NONE;
        f.initgend = ROLE_NONE;
        f.initalign = ROLE_NONE;
        return nApplied > 0;
    }
    return false;
}

function lowc(ch) {
    return ch.toLowerCase();
}
function highc(ch) {
    return ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
}

/** C setup_rolemenu duplicate initials: `r` Rogue then `R` Ranger (do not toggle an already-upper first letter). */
function roleMenuAccelLetterLikeC(rawFirst, lastch) {
    const ch = lowc(rawFirst);
    if (ch !== lastch) return ch;
    return rawFirst === lowc(rawFirst) ? highc(rawFirst) : rawFirst;
}

/** C build_plselection_prompt when all four facets unspecified (strsubst applied). */
export function buildShallPickPrompt() {
    return "Shall I pick character's race, role, gender and alignment for you? [ynaq]";
}

export function needsFullInteractiveChargen(opts) {
    return !opts.explicitRoleInRc;
}

/** Role (and usually race/align) fixed in rc but name must be typed — C askname(). */
export function needsAsknameOnly(opts) {
    return opts.explicitRoleInRc && !opts.explicitNameInRc;
}

/** C version.c copyright_banner_line(indx); indx 3 ↔ nomakedefs.copyright_banner_c → const.js. */
function copyrightBannerLineLikeC(indx) {
    switch (indx) {
        case 1:
            return COPYRIGHT_BANNER_A;
        case 2:
            return COPYRIGHT_BANNER_B;
        case 3:
            return COPYRIGHT_BANNER_C;
        case 4:
            return COPYRIGHT_BANNER_D;
        default:
            return '';
    }
}

/** C wintty: tty_putstr(BASE_WINDOW, 0, copyright_banner_line(i)) for i in 1..4. */
function paintCopyrightAt(disp, startRow = TTY_COPYRIGHT_START_ROW) {
    for (let i = 0; i < 4; i++) {
        const line = copyrightBannerLineLikeC(i + 1);
        const t = line.length > 80 ? line.slice(0, 80) : line;
        disp.putstr(0, startRow + i, t, NO_COLOR);
    }
}

function paintChargenCopyrightBlockLikeC(disp) {
    paintCopyrightAt(disp, TTY_COPYRIGHT_START_ROW);
    disp.clearRow(TTY_POST_COPYRIGHT_BLANK_ROW);
}

/**
 * C tty_askname initial + per-char echo.
 * @param {{ compact?: boolean }} [opts] — **`compact`** after confirm **`a`** (another name): C omits copyright and uses a higher prompt row.
 */
export async function ttyAsknameLikeC(disp, g, opts) {
    const compact = opts?.compact === true;
    const askRow = compact ? ASKNAME_ROW_COMPACT : ASKNAME_ROW_FULL;
    disp.clearScreen();
    if (!compact) {
        paintChargenCopyrightBlockLikeC(disp);
        for (let r = 9; r <= 11; r++) disp.clearRow(r);
    }
    /* C: static const char who_are_you[] = "Who are you? "; */
    const prompt = 'Who are you? ';
    disp.putstr(0, askRow, prompt, NO_COLOR);
    disp.cursorVisible = true;
    disp.setCursor(prompt.length, askRow);
    let buf = '';
    for (;;) {
        const c = await nhgetch();
        if (c === 13 || c === 10) break;
        if (c === 27) {
            buf = '';
            disp.clearRow(askRow);
            disp.putstr(0, askRow, prompt, NO_COLOR);
            disp.setCursor(prompt.length, askRow);
            continue;
        }
        if (c === 8 || c === 127) {
            if (buf.length) {
                buf = buf.slice(0, -1);
                disp.putstr(prompt.length, askRow, `${buf} `, NO_COLOR);
                disp.setCursor(prompt.length + buf.length, askRow);
            }
            continue;
        }
        let ch = String.fromCodePoint(c);
        if (ch !== '-' && ch !== '@') {
            if (!/[a-zA-Z]/.test(ch) && !(ch >= '0' && ch <= '9' && buf.length > 0)) ch = '_';
        }
        if (buf.length < 31) buf += ch;
        disp.putstr(prompt.length, askRow, buf, NO_COLOR);
        disp.setCursor(prompt.length + buf.length, askRow);
    }
    g.plname = buf || 'X';
}

export function paintPostNameYnaqScreen(disp, plname) {
    const p0 = buildShallPickPrompt();
    disp.clearScreen();
    disp.putstr(0, YNAQ_AFTER_NAME_ROW, p0, NO_COLOR);
    /* C tty_curs past prompt text — matches recorder column (e.g. seed0006: len+1). */
    disp.setCursor(p0.length + 1, YNAQ_AFTER_NAME_ROW);
    paintChargenCopyrightBlockLikeC(disp);
    disp.putstr(0, WHO_ARE_YOU_RECAP_ROW, `Who are you? ${plname}`, NO_COLOR);
}

/** C role.c genl_player_setup comment on [ynaq] after name (~2248–2254). */
function paintYnaqHelpOverlay(disp) {
    /* C tty: help replaces the top block including row 0 `[ynaq]` line, not only rows 1–8. */
    for (let r = 0; r <= 8; r++) disp.clearRow(r);
    const lines = [
        'y (or space/enter) — game picks role, race, gender, align; then confirm',
        'n — you pick each facet from the role/race/gender/align menus',
        "a (or @ or *) — random all four, skip confirm (C 'a' / randomall)",
        'q (or escape) — quit character creation',
        '',
        'Press any key to return to the prompt...',
    ];
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].length > 80 ? lines[i].slice(0, 80) : lines[i];
        disp.putstr(0, 1 + i, t, NO_COLOR);
    }
}

/** C confirm [ynaq] one-line gloss (role.c confirmation loop ~2675–2677 PICK_ONE). */
/** @param {number} col — same **`confirmMenuStartColLikeC`** as **`paintConfirmMenu`** (not hardcoded **`MENU_COL`**). */
function paintConfirmYnaqHelpOverlay(disp, col) {
    for (let r = 0; r <= 8; r++) disp.clearRow(r);
    const lines = [
        'y (or space/enter) — start game (C preselected y / n==0 default)',
        'n — pick role again from the role menu',
        'a — choose a different name (back to Who are you?)',
        'q / escape — quit',
        '',
        'Press any key...',
    ];
    const maxW = Math.max(1, NH_TTY_COLS - col - 1);
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i];
        const out = t.length > maxW ? t.slice(0, maxW) : t;
        disp.putstr(col, 1 + i, out, NO_COLOR);
    }
}

/**
 * C genl_player_setup [ynaq] loop (role.c ~2260); tty prompt row matches **`paintPostNameYnaqScreen`**.
 * @param {import('./game_display.js').GameDisplay} disp
 * @param {string} plname
 */
export async function readYnaqPick4u(disp, plname) {
    for (;;) {
        const c = await nhgetch();
        let k = lowc(String.fromCodePoint(c));
        if (k === '\x1b' || k === 'q') return 'q';
        if (k === '?') {
            paintYnaqHelpOverlay(disp);
            await nhgetch();
            paintPostNameYnaqScreen(disp, plname);
            continue;
        }
        if (k === ' ' || k === '\n' || k === '\r') k = 'y';
        else if (k === '@' || k === '*') k = 'a';
        if (k === 'y' || k === 'n' || k === 'a') return k;
    }
}

function roleMenuEntries(f) {
    const rai = f.initrace >= 0 ? f.initrace : ROLE_RANDOM;
    const gi = f.initgend >= 0 ? f.initgend : ROLE_RANDOM;
    const ai = f.initalign >= 0 ? f.initalign : ROLE_RANDOM;
    const out = [];
    let lastch = '\x00';
    for (const i of ROLE_MENU_ORDER_LIKE_C) {
        if (i < 0 || i >= roles.length) continue;
        if (!okRoleJs(i, rai, gi, ai) || !okRaceJs(i, rai, gi, ai) || !okGendJs(i, rai, gi, ai) || !okAlignJs(i, rai, gi, ai)) {
            continue;
        }
        let ch = roleMenuAccelLetterLikeC(roles[i].name.m[0], lastch);
        lastch = lowc(ch);
        let label = roles[i].name.m;
        if (roles[i].name.f && roles[i].name.f !== roles[i].name.m) {
            label = `${roles[i].name.m}/${roles[i].name.f}`;
        }
        const art = /^[aeiou]/i.test(label) ? 'an' : 'a';
        out.push({ ri: i, ch, label, art });
    }
    return out;
}

/** @param {{ initrole: number, initrace: number, initgend: number, initalign: number }} f */
function roleHubRecapLineLikeC(f) {
    const rn = f.initrole >= 0 ? roleNameForDisplay(f.initrole, f.initgend) : '<role>';
    const raceNoun = f.initrace >= 0 ? races[f.initrace].name : '<race>';
    const gd = f.initgend >= 0 ? (f.initgend === 1 ? 'female' : 'male') : '<gender>';
    let alTok = '<alignment>';
    if (f.initalign >= 0) {
        alTok = aligns[f.initalign].name;
    } else if (f.initrole >= 0) {
        const sole = soleAlignNameAcrossRacesRecapLikeC(f.initrole);
        if (sole) alTok = sole;
    }
    return `${rn} ${raceNoun} ${gd} ${alTok}`;
}

/** C genl_player_setup: role hub uses right column once race/gender/align may be set, or when role filtering is active (seed0006 after reset_role_filtering). */
function roleHubRightColumnLikeC(f) {
    return f.initrace >= 0 || f.initgend >= 0 || f.initalign >= 0
        || gotChargenRfilterLikeC();
}

/**
 * C role.c `role_menu_extra(RS_RACE|RS_GENDER|RS_ALGNMNT)` — `Pick%s %s first`
 * with `" another"` only when that facet index is already set (seed0012: lawful-only
 * hub still says `Pick race first` / `Pick gender first` but `Pick another alignment first`).
 */
function roleHubPickRaceFirstLineLikeC(f) {
    return `/ - Pick${f.initrace >= 0 ? ' another' : ''} race first`;
}
function roleHubPickGenderFirstLineLikeC(f) {
    return `" - Pick${f.initgend >= 0 ? ' another' : ''} gender first`;
}
function roleHubPickAlignFirstLineLikeC(f) {
    return `[ - Pick${f.initalign >= 0 ? ' another' : ''} alignment first`;
}

/** C `role_menu_extra` on align hub — no `[` row; `?`/`/`/`"` use the same `Pick%s … first` rule. */
function alignMenuPickRoleFirstLineLikeC(f) {
    return `? - Pick${f.initrole >= 0 ? ' another' : ''} role first`;
}
function alignMenuPickRaceFirstLineLikeC(f) {
    return `/ - Pick${f.initrace >= 0 ? ' another' : ''} race first`;
}
function alignMenuPickGenderFirstLineLikeC(f) {
    return `" - Pick${f.initgend >= 0 ? ' another' : ''} gender first`;
}

/** C role.c `maybe_skip_seps` — line budget for 24-row tty; returns excess line count. */
function maybeRoleMenuExcessLinesLikeC(f) {
    const ttyrows = 24;
    const rai = f.initrace >= 0 ? f.initrace : ROLE_RANDOM;
    const gi = f.initgend >= 0 ? f.initgend : ROLE_RANDOM;
    const ai = f.initalign >= 0 ? f.initalign : ROLE_RANDOM;
    let n = 4;
    for (let i = 0; i < roles.length; i++) {
        if (
            okRoleJs(i, rai, gi, ai)
            && okRaceJs(i, rai, gi, ai)
            && okGendJs(i, rai, gi, ai)
            && okAlignJs(i, rai, gi, ai)
        ) {
            n++;
        }
    }
    n += 2 + 5 + 1;
    if (ttyrows > 0 && n > ttyrows) return n - ttyrows;
    return 0;
}

export function paintRoleMenu(disp, f) {
    /* C role.c plsel_startmenu — rigid_role_checks before recap/menu paint. */
    rigidRoleChecksJs(f);
    disp.clearScreen();
    const rc = roleHubRightColumnLikeC(f) ? MENU_COL : 0;
    const recap = roleHubRecapLineLikeC(f);
    if (rc === 0) {
        disp.putstr(0, 0, ' ', NO_COLOR);
        disp.putstr(1, 0, 'Pick a role or profession', NO_COLOR, ATR_INVERSE);
        disp.putstr(0, 2, ` ${recap}`, NO_COLOR);
    } else {
        disp.putstr(rc, 0, 'Pick a role or profession', NO_COLOR, ATR_INVERSE);
        disp.putstr(rc, 2, recap, NO_COLOR);
    }
    const excess = maybeRoleMenuExcessLinesLikeC(f);
    /* C plsel_startmenu: if excess==2, omit blank between recap and role list. */
    let row = excess >= 2 ? 3 : 4;
    for (const e of roleMenuEntries(f)) {
        if (rc === 0) disp.putstr(0, row, ` ${e.ch} - ${e.art} ${e.label}`, NO_COLOR);
        else disp.putstr(rc, row, `${e.ch} - ${e.art} ${e.label}`, NO_COLOR);
        row++;
    }
    const extras = [
        '* * Random',
        roleHubPickRaceFirstLineLikeC(f),
        roleHubPickGenderFirstLineLikeC(f),
        roleHubPickAlignFirstLineLikeC(f),
        filterMenuExtraLine(),
        'q - Quit',
        '(end)',
    ];
    for (const line of extras) {
        if (rc === 0) disp.putstr(0, row, ` ${line}`, NO_COLOR);
        else disp.putstr(rc, row, line, NO_COLOR);
        row++;
        /* C tty right-column role hub (`MENU_COL`): blank between `* * Random` and
         * `setup_rolemenu` pick lines — matches `setup_racemenu` spacing (seed0006). */
        if (rc !== 0 && line === '* * Random') {
            disp.putstr(rc, row, '', NO_COLOR);
            row++;
        }
    }
    disp.cursorVisible = true;
    const endStr = rc === 0 ? ' (end)' : '(end)';
    setChargenEndMenuCursorLikeC(disp, rc, endStr, row - 1);
}

function roleNameForDisplay(ri, gi) {
    const r = roles[ri];
    if (!r) return '<role>';
    /* C: role.c role_selection_prolog — `roles[r].name.f`: gend==1 → female title; gend<0 → append "/name.f" */
    if (roleHasFemaleRoleNameLikeC(r) && r.name.f) {
        if (gi === 1) return r.name.f;
        if (gi < 0) return `${r.name.m}/${r.name.f}`;
    }
    return r.name.m;
}

function paintRaceMenu(disp, f) {
    rigidRoleChecksJs(f);
    disp.clearScreen();
    disp.putstr(MENU_COL, 0, 'Pick a race or species', NO_COLOR, ATR_INVERSE);
    disp.putstr(MENU_COL, 2, raceMenuRecapLineLikeC(f), NO_COLOR);
    let row = 4;
    for (let i = 0; i < races.length; i++) {
        if (!okRaceJs(f.initrole, i, f.initgend, f.initalign)) continue;
        const ch = races[i].name[0];
        disp.putstr(MENU_COL, row, `${ch} - ${races[i].name}`, NO_COLOR);
        row++;
    }
    disp.putstr(MENU_COL, row, '* * Random', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, '', NO_COLOR);
    row++;
    const xRole = raceMenuRsRoleExtraLikeC(f);
    putChargenMenuExtraPickOrGray(disp, MENU_COL, FORCES_EXTRA_COL, row, xRole);
    row++;
    const xGend = raceMenuRsGenderExtraLikeC(f);
    putChargenMenuExtraPickOrGray(disp, MENU_COL, FORCES_EXTRA_COL, row, xGend);
    row++;
    const xAl = raceMenuRsAlignExtraLikeC(f);
    if (xAl.gray || xAl.pick) {
        putChargenMenuExtraPickOrGray(disp, MENU_COL, FORCES_EXTRA_COL, row, xAl);
        row++;
    }
    disp.putstr(MENU_COL, row, filterMenuExtraLine(), NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, 'q - Quit', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, '(end)', NO_COLOR);
    disp.cursorVisible = true;
    setChargenEndMenuCursorLikeC(disp, MENU_COL, '(end)', row);
}

/**
 * C ref: role.c genl_player_setup — PICK_ONE n==2: first ROLE_RANDOM line + second explicit row → use selected[1].
 * @param {string} quitMenuLabel — e.g. `'race menu'` for `Player quit …`
 * @param {(k2: string, kRaw2: string) => number | undefined} tryExplicit
 * @param {() => number} pickRandom
 */
async function chargenStarPickOneN2LikeC(quitMenuLabel, tryExplicit, pickRandom) {
    if (hasQueuedInput()) {
        const c2 = await nhgetch();
        const kRaw2 = String.fromCodePoint(c2);
        const k2 = lowc(kRaw2);
        if (k2 === '\x1b' || k2 === 'q') throw new Error(`Player quit ${quitMenuLabel}`);
        const ex = tryExplicit(k2, kRaw2);
        if (ex !== undefined) return ex;
        if (k2 !== '\r' && k2 !== '\n' && k2 !== ' ' && k2 !== '*') {
            pushKey(c2);
        }
    }
    return pickRandom();
}

async function readRaceChoice(disp, f) {
    const valid = [];
    for (let i = 0; i < races.length; i++) {
        if (okRaceJs(f.initrole, i, f.initgend, f.initalign)) valid.push({ i, ch: races[i].name[0] });
    }
    if (valid.length === 1) return valid[0].i;
    const map = new Map(valid.map((v) => [lowc(String(v.ch)), v.i]));
    for (;;) {
        paintRaceMenu(disp, f);
        const c = await nhgetch();
        const k = lowc(String.fromCodePoint(c));
        if (k === '~') {
            f.initrace = ROLE_NONE;
            const repickRole = await runResetRoleFilteringMenuLikeC(disp, f);
            if (!repickRole) f.chargenResumePick = 'race';
            continue;
        }
        if (k === '\x1b' || k === 'q') throw new Error('Player quit race menu');
        if (k === '*') {
            const t = await chargenStarPickOneN2LikeC(
                'race menu',
                (k2) => (map.has(k2) ? /** @type {number} */ (map.get(k2)) : undefined),
                () => pickRaceJs(f.initrole, f.initgend, f.initalign, PICK_RANDOM),
            );
            if (t !== ROLE_NONE) return t;
            continue;
        }
        /* C role.c race `select_menu`: RS_ROLE / RS_GENDER / RS_ALGNMNT extras on race hub. */
        if (k === '?' && raceMenuRsRoleExtraLikeC(f).pick) return CHARGEN_NAV_ROLE;
        if (k === '"' && raceMenuRsGenderExtraLikeC(f).pick) return CHARGEN_NAV_GENDER;
        if (k === '[') {
            const xAl = raceMenuRsAlignExtraLikeC(f);
            if (xAl.pick) return CHARGEN_NAV_ALIGN;
            continue;
        }
        if (map.has(k)) return /** @type {number} */ (map.get(k));
    }
}

function paintGenderMenu(disp, f) {
    rigidRoleChecksJs(f);
    disp.clearScreen();
    disp.putstr(MENU_COL, 0, 'Pick a gender or sex', NO_COLOR, ATR_INVERSE);
    const rn = roleNameForDisplay(f.initrole, f.initgend);
    const raceNoun = f.initrace >= 0 ? races[f.initrace].name : '<race>';
    const recapAlign = f.initalign >= 0
        ? aligns[f.initalign].name
        : (soleAlignNameForRoleRaceLikeC(f.initrole, f.initrace) ?? '<alignment>');
    disp.putstr(MENU_COL, 2, `${rn} ${raceNoun} <gender> ${recapAlign}`, NO_COLOR);
    let row = 4;
    disp.putstr(MENU_COL, row, 'm - male', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, 'f - female', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, '* * Random', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, '', NO_COLOR);
    row++;
    const gRole = genderMenuRsRoleExtraLikeC(f);
    putChargenMenuExtraPickOrGray(disp, MENU_COL, FORCES_EXTRA_COL, row, gRole);
    row++;
    const gRace = genderMenuRsRaceExtraLikeC(f);
    putChargenMenuExtraPickOrGray(disp, MENU_COL, FORCES_EXTRA_COL, row, gRace);
    row++;
    const gAl = genderMenuRsAlignExtraLikeC(f);
    if (gAl.gray || gAl.pick) {
        putChargenMenuExtraPickOrGray(disp, MENU_COL, FORCES_EXTRA_COL, row, gAl);
        row++;
    }
    disp.putstr(MENU_COL, row, filterMenuExtraLine(), NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, 'q - Quit', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, '(end)', NO_COLOR);
    disp.cursorVisible = true;
    setChargenEndMenuCursorLikeC(disp, MENU_COL, '(end)', row);
}

async function readGenderChoice(disp, f) {
    const valid = [];
    for (let gi = 0; gi < genders.length; gi++) {
        if (okGendJs(f.initrole, f.initrace, gi, f.initalign)) valid.push(gi);
    }
    if (valid.length === 1) return valid[0];
    const map = new Map([
        ['m', 0],
        ['f', 1],
    ]);
    for (;;) {
        paintGenderMenu(disp, f);
        const c = await nhgetch();
        const k = lowc(String.fromCodePoint(c));
        if (k === '~') {
            f.initgend = ROLE_NONE;
            const repickRole = await runResetRoleFilteringMenuLikeC(disp, f);
            if (!repickRole) f.chargenResumePick = 'gender';
            continue;
        }
        if (k === '\x1b' || k === 'q') throw new Error('Player quit gender menu');
        if (k === '*') {
            const t = await chargenStarPickOneN2LikeC(
                'gender menu',
                (k2) => {
                    if (!map.has(k2)) return undefined;
                    const gi = /** @type {number} */ (map.get(k2));
                    return valid.includes(gi) ? gi : undefined;
                },
                () => pickGendJs(f.initrole, f.initrace, f.initalign, PICK_RANDOM),
            );
            if (t !== ROLE_NONE) return t;
            continue;
        }
        /* C `setup_gendmenu` / `select_menu`: RS_ROLE `?` / RS_RACE `/` only when role+race are set — otherwise
         * `role_menu_extra` pick lines still match keys meant for later replay (e.g. gender-first-from-role-hub then `!=/?`). */
        if (f.initrole >= 0 && f.initrace >= 0) {
            if (k === '?' && genderMenuRsRoleExtraLikeC(f).pick) return CHARGEN_NAV_ROLE;
            if (k === '/' && genderMenuRsRaceExtraLikeC(f).pick) return CHARGEN_NAV_RACE;
        }
        if (k === '[') {
            const xAl = genderMenuRsAlignExtraLikeC(f);
            if (xAl.pick) return CHARGEN_NAV_ALIGN;
            continue;
        }
        if (map.has(k) && valid.includes(/** @type {number} */ (map.get(k)))) return /** @type {number} */ (map.get(k));
    }
}

/** First key NetHack tty uses for each alignment row (lawful / neutral / chaotic). */
const ALIGN_MENU_KEYS = ['l', 'n', 'c'];

function paintAlignMenu(disp, f) {
    rigidRoleChecksJs(f);
    disp.clearScreen();
    disp.putstr(MENU_COL, 0, 'Pick an alignment or creed', NO_COLOR, ATR_INVERSE);
    const rn = f.initrole >= 0 ? roleNameForDisplay(f.initrole, f.initgend) : '<role>';
    const raceNoun = f.initrace >= 0 ? races[f.initrace].name : '<race>';
    const gd = f.initgend >= 0 ? (f.initgend === 1 ? 'female' : 'male') : '<gender>';
    const alTok = f.initalign >= 0 ? aligns[f.initalign].name : '<alignment>';
    disp.putstr(MENU_COL, 2, `${rn} ${raceNoun} ${gd} ${alTok}`, NO_COLOR);
    let row = 4;
    for (let ai = 0; ai < aligns.length; ai++) {
        if (!okAlignJs(f.initrole, f.initrace, f.initgend, ai)) continue;
        const ch = ALIGN_MENU_KEYS[ai];
        disp.putstr(MENU_COL, row, `${ch} - ${aligns[ai].name}`, NO_COLOR);
        row++;
    }
    disp.putstr(MENU_COL, row, '* * Random', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, '', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, alignMenuPickRoleFirstLineLikeC(f), NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, alignMenuPickRaceFirstLineLikeC(f), NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, alignMenuPickGenderFirstLineLikeC(f), NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, filterMenuExtraLine(), NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, 'q - Quit', NO_COLOR);
    row++;
    disp.putstr(MENU_COL, row, '(end)', NO_COLOR);
    disp.cursorVisible = true;
    setChargenEndMenuCursorLikeC(disp, MENU_COL, '(end)', row);
}

async function readAlignChoice(disp, f) {
    const valid = [];
    for (let ai = 0; ai < aligns.length; ai++) {
        if (okAlignJs(f.initrole, f.initrace, f.initgend, ai)) valid.push(ai);
    }
    if (valid.length === 1) return valid[0];
    const map = new Map(valid.map((ai) => [ALIGN_MENU_KEYS[ai], ai]));
    for (;;) {
        paintAlignMenu(disp, f);
        const c = await nhgetch();
        const k = lowc(String.fromCodePoint(c));
        if (k === '~') {
            f.initalign = ROLE_NONE;
            const repickRole = await runResetRoleFilteringMenuLikeC(disp, f);
            if (!repickRole) f.chargenResumePick = 'align';
            continue;
        }
        if (k === '\x1b' || k === 'q') throw new Error('Player quit align menu');
        if (k === '*') {
            const t = await chargenStarPickOneN2LikeC(
                'align menu',
                (k2) => (map.has(k2) ? /** @type {number} */ (map.get(k2)) : undefined),
                () => pickAlignJs(f.initrole, f.initrace, f.initgend, PICK_RANDOM),
            );
            if (t !== ROLE_NONE) return t;
            continue;
        }
        /* C `setup_algnmenu` extras — align hub is short-lived in tty chargen; l/n/c do not overlap these accelerators. */
        if (k === '?' && raceMenuRsRoleExtraLikeC(f).pick) return CHARGEN_NAV_ROLE;
        if (k === '/' && genderMenuRsRaceExtraLikeC(f).pick) return CHARGEN_NAV_RACE;
        if (k === '"' && !roleMenuExtraRsGenderGrayLineLikeC(f)) return CHARGEN_NAV_GENDER;
        if (map.has(k)) return /** @type {number} */ (map.get(k));
    }
}

/**
 * C **`role.c`** **`role_selection_prolog`** display tightening — **`rigidRoleChecksJs`** on live **`f`**, then
 * **`coerceChargenIndicesForRoleSelectionPrologLikeC`** on a **copy** for recap only (role + race **`ROLE_ALIGNMASK`**
 * tightening; mutating **`f`** here shifts **`rigidRoleChecksJs`** / **`pick_*`** RNG for harness sessions that never
 * paint this menu).
 * @returns {number} menu column **`col`** for **`readConfirmAnswer`** **`?`** overlay
 */
function paintConfirmMenu(disp, f, plname) {
    rigidRoleChecksJs(f);
    const d = {
        initrole: f.initrole,
        initrace: f.initrace,
        initgend: f.initgend,
        initalign: f.initalign,
    };
    coerceChargenIndicesForRoleSelectionPrologLikeC(d);
    disp.clearScreen();
    const rn = roleNameForDisplay(d.initrole, d.initgend);
    /* C role.c root_plselection_prompt ~1519–1525: with a valid role, racial word is races[].adj
     * ("… lawful female gnomish cavewoman"); noun only when rolenum == ROLE_NONE. Separate
     * role_selection_prolog race *line* still uses races[c].noun — different UI. */
    const rc = d.initrace >= 0 ? races[d.initrace] : null;
    const raceRecapTok = !rc
        ? '???'
        : (d.initrole >= 0 && d.initrole < roles.length ? rc.adj : rc.name);
    const gd = d.initgend >= 0 && d.initgend < genders.length ? genders[d.initgend].adj : '???';
    const an = d.initalign >= 0 ? aligns[d.initalign].adj : '???';
    const title = 'Is this ok? [ynaq]';
    const recap = `${plname} the ${an} ${gd} ${raceRecapTok} ${rn}`;
    const col = confirmMenuStartColLikeC([
        title,
        recap,
        'y * Yes; start game',
        'n - No; choose role again',
        'a - Not yet; choose another name',
        'q - Quit',
        '(end)',
    ]);
    disp.putstr(col, 0, title, NO_COLOR, ATR_INVERSE);
    disp.putstr(col, 2, recap, NO_COLOR);
    let row = 4;
    disp.putstr(col, row, 'y * Yes; start game', NO_COLOR);
    row++;
    disp.putstr(col, row, 'n - No; choose role again', NO_COLOR);
    row++;
    disp.putstr(col, row, 'a - Not yet; choose another name', NO_COLOR);
    row++;
    disp.putstr(col, row, 'q - Quit', NO_COLOR);
    row++;
    disp.putstr(col, row, '(end)', NO_COLOR);
    disp.cursorVisible = true;
    setChargenEndMenuCursorLikeC(disp, col, '(end)', row);
    return col;
}

async function readConfirmAnswer(disp, f, plname) {
    for (;;) {
        const col = paintConfirmMenu(disp, f, plname);
        const c = await nhgetch();
        let k = lowc(String.fromCodePoint(c));
        if (k === '?') {
            paintConfirmYnaqHelpOverlay(disp, col);
            await nhgetch();
            continue;
        }
        /* C: choice = (n>0) ? selected[n-1].a_int : (n==0) ? 1 : -1; space/return = implicit y */
        if (k === '\x1b') return 'q';
        if (k === ' ' || k === '\n' || k === '\r') return 'y';
        if (k === 'y' || k === 'a' || k === 'n' || k === 'q') return k;
    }
}

/**
 * C tty role hub: pick role, or `[` / `"` / `/` to pick alignment / gender / race first
 * (setup_rolemenu) before the role letter.
 * @param {import('./game_display.js').GameDisplay} disp
 * @param {{ initrole: number, initrace: number, initgend: number, initalign: number,
 *   chargenResumePick?: 'race' | 'gender' | 'align' }} f
 */
async function pickManualChargenFacets(disp, f) {
    const entries = roleMenuEntries(f);
    const roleByMenuKey = new Map(entries.map((e) => [String(e.ch), e.ri]));
    for (;;) {
        rigidRoleChecksJs(f);
        if (f.initrole !== ROLE_NONE && f.initrace !== ROLE_NONE && f.initgend !== ROLE_NONE && f.initalign !== ROLE_NONE) {
            delete f.chargenResumePick;
            return;
        }

        /* C genl_player_setup: after ~ on race/gender/align, reset() false → nextpick RS_RACE/RS_GENDER/RS_ALGNMNT
         * (skip RS_ROLE block next iteration); true → RS_ROLE (normal hub order). */
        if (f.chargenResumePick === 'race') {
            delete f.chargenResumePick;
            if (f.initrace === ROLE_NONE) {
                const t = await readRaceChoice(disp, f);
                if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
                f.initrace = t;
                continue;
            }
        }
        if (f.chargenResumePick === 'gender') {
            delete f.chargenResumePick;
            if (f.initgend === ROLE_NONE) {
                const t = await readGenderChoice(disp, f);
                if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
                f.initgend = t;
                continue;
            }
        }
        if (f.chargenResumePick === 'align') {
            delete f.chargenResumePick;
            if (f.initalign === ROLE_NONE) {
                const t = await readAlignChoice(disp, f);
                if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
                f.initalign = t;
                continue;
            }
        }

        if (f.initrole === ROLE_NONE) {
            paintRoleMenu(disp, f);
            const c = await nhgetch();
            const kRaw = String.fromCodePoint(c);
            const k = lowc(kRaw);
            if (k === '\x1b' || k === 'q') throw new Error('Player quit role menu');
            if (k === '~') {
                f.initrole = ROLE_NONE;
                await runResetRoleFilteringMenuLikeC(disp, f);
                continue;
            }
            /* C ref: role.c genl_player_setup — PICK_ONE n==2: first ROLE_RANDOM, second real role → choice = selected[1]. */
            if (k === '*') {
                if (hasQueuedInput()) {
                    const c2 = await nhgetch();
                    const kRaw2 = String.fromCodePoint(c2);
                    const k2 = lowc(kRaw2);
                    if (k2 === '\x1b' || k2 === 'q') throw new Error('Player quit role menu');
                    let ri2 = roleByMenuKey.get(kRaw2);
                    if (ri2 === undefined) ri2 = roleByMenuKey.get(k2);
                    if (ri2 === undefined) ri2 = roleByMenuKey.get(highc(kRaw2));
                    if (ri2 !== undefined) {
                        f.initrole = ri2;
                        continue;
                    }
                    if (
                        k2 !== '\r'
                        && k2 !== '\n'
                        && k2 !== ' '
                        && k2 !== '*'
                    ) {
                        pushKey(c2);
                    }
                }
                const t = pickRoleJs(
                    f.initrace >= 0 ? f.initrace : ROLE_RANDOM,
                    f.initgend >= 0 ? f.initgend : ROLE_RANDOM,
                    f.initalign >= 0 ? f.initalign : ROLE_RANDOM,
                    PICK_RANDOM,
                );
                if (t !== ROLE_NONE) f.initrole = t;
                continue;
            }
            if (k === '[') {
                if (f.initalign === ROLE_NONE) {
                    const t = await readAlignChoice(disp, f);
                    if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
                    f.initalign = t;
                }
                continue;
            }
            if (k === '"') {
                if (f.initgend === ROLE_NONE) {
                    const t = await readGenderChoice(disp, f);
                    if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
                    f.initgend = t;
                }
                continue;
            }
            if (k === '/') {
                if (f.initrace === ROLE_NONE) {
                    const t = await readRaceChoice(disp, f);
                    if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
                    f.initrace = t;
                }
                continue;
            }
            let ri = roleByMenuKey.get(kRaw);
            if (ri === undefined) ri = roleByMenuKey.get(k);
            if (ri === undefined) ri = roleByMenuKey.get(highc(kRaw));
            if (ri !== undefined) {
                f.initrole = ri;
                continue;
            }
            continue;
        }

        if (f.initrace === ROLE_NONE) {
            const t = await readRaceChoice(disp, f);
            if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
            f.initrace = t;
            continue;
        }
        if (f.initgend === ROLE_NONE) {
            const t = await readGenderChoice(disp, f);
            if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
            f.initgend = t;
            continue;
        }
        if (f.initalign === ROLE_NONE) {
            const t = await readAlignChoice(disp, f);
            if (chargenHandleSubmenuNavReturnLikeC(f, t)) continue;
            f.initalign = t;
            continue;
        }
    }
}

/**
 * Full tty chargen when OPTIONS omits name and/or role.
 * @param {import('./game_display.js').GameDisplay} disp
 * @param {import('./gstate.js').game} g
 * @param {ReturnType<typeof import('./options.js').parseNethackrc>} opts
 */
export async function runInteractiveTtyChargen(disp, g, opts) {
    let asknameAnotherNameCompact = false;
    top: for (;;) {
        resetChargenRfilter();
        await ttyAsknameLikeC(disp, g, { compact: asknameAnotherNameCompact });
        asknameAnotherNameCompact = false;
        paintPostNameYnaqScreen(disp, g.plname);
        const pick4u = await readYnaqPick4u(disp, g.plname);
        if (pick4u === 'q') throw new Error('Player quit during chargen');
        if (pick4u === 'y' || pick4u === 'a') {
            const f = { initrole: ROLE_NONE, initrace: ROLE_NONE, initgend: ROLE_NONE, initalign: ROLE_NONE };
            f.initrole = pickRoleJs(ROLE_RANDOM, ROLE_RANDOM, ROLE_RANDOM, PICK_RANDOM);
            if (f.initrole === ROLE_NONE) throw new Error('pick_role failed');
            rigidRoleChecksJs(f);
            if (f.initrace === ROLE_NONE) f.initrace = pickRaceJs(f.initrole, f.initgend, f.initalign, PICK_RANDOM);
            if (f.initgend === ROLE_NONE) f.initgend = pickGendJs(f.initrole, f.initrace, f.initalign, PICK_RANDOM);
            if (f.initalign === ROLE_NONE) {
                const t = pickAlignJs(f.initrole, f.initrace, f.initgend, PICK_RANDOM);
                if (t !== ROLE_NONE) f.initalign = t;
            }
            if (pick4u === 'a') {
                /* C: skip confirmation for "a" (all random, no confirm). */
                applyChargenFlagsToGame(g, opts, f);
                return;
            }
            const ok = await readConfirmAnswer(disp, f, g.plname);
            if (ok === 'y') {
                applyChargenFlagsToGame(g, opts, f);
                return;
            }
            if (ok === 'q' || ok === '\x1b') throw new Error('Player quit confirm');
            if (ok === 'a') {
                asknameAnotherNameCompact = true;
                continue top;
            }
            /* 'n': repick random (C: treat as restart ynaq from name). */
            continue top;
        }

        outer: for (;;) {
            const f = { initrole: ROLE_NONE, initrace: ROLE_NONE, initgend: ROLE_NONE, initalign: ROLE_NONE };
            await pickManualChargenFacets(disp, f);
            rigidRoleChecksJs(f);
            const ok = await readConfirmAnswer(disp, f, g.plname);
            if (ok === 'y') {
                applyChargenFlagsToGame(g, opts, f);
                return;
            }
            if (ok === 'q' || ok === '\x1b') throw new Error('Player quit confirm');
            if (ok === 'a') {
                asknameAnotherNameCompact = true;
                continue top;
            }
            if (ok === 'n') continue outer;
        }
    }
}

function applyChargenFlagsToGame(g, opts, f) {
    if (f.initrole < 0 || f.initrole >= roles.length) throw new Error(`chargen: bad initrole ${f.initrole}`);
    if (f.initrace < 0 || f.initrace >= races.length) throw new Error(`chargen: bad initrace ${f.initrace}`);
    if (f.initalign < 0 || f.initalign >= aligns.length) throw new Error(`chargen: bad initalign ${f.initalign}`);
    const role = roles[f.initrole];
    const race = races[f.initrace];
    const female = f.initgend === 1;
    const align = aligns[f.initalign];
    opts.role = role.abbr;
    opts.race = race.name;
    opts.gender = female ? 'female' : 'male';
    opts.align = align.name;
    opts.name = g.plname;
    opts.explicitNameInRc = true;
    opts.explicitRoleInRc = true;
    applyIdentityFromNethackrc(g, opts);
}
