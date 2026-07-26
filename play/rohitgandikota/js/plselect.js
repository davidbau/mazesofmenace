// plselect.js — interactive character selection.
// C ref: src/role.c genl_player_setup() (:2206) and tty_askname().
//
// Seven public sessions pin nothing in their rc and drive this with their own
// keystrokes, so until it existed they diverged at PRNG call 0.
//
// The draw is not where it looks. Choosing from a menu draws nothing; what
// draws is plsel_startmenu(), which calls rigid_role_checks() EVERY time a menu
// opens (role.c:2814). Once the role is known that fills any facet the role
// forces, and pick_align() with exactly one valid alignment still executes
// `aligns_ok = rn2(aligns_ok)` — an rn2(1).
//
// seed0077 is the clean case: "Shade\rnrhmy" is name, 'n' to pick manually,
// 'r' Rogue, 'h' human, 'm' male, 'y' confirm. A Rogue has one valid alignment
// and two valid races, so the whole pre-o_init stream is the single rn2(1)
// that fires when the RACE menu opens.

import { game } from './gstate.js';
import { tty_clear_nhwindow_message } from './display.js';
import { nhgetch } from './input.js';
import {
    ROLE_NONE, ROLE_RANDOM, rigid_role_checks, ok_role, ok_race, ok_gend,
    ok_align, pick_role, pick_race, pick_gend, pick_align,
    randrole, PICK_RANDOM, rfilter, setrolefilter, clearrolefilter,
    gotrolefilter,
} from './role.js';
import { roles, races, genders, aligns } from './role_data.js';
import { COPYRIGHT_BANNER } from './banner_data.js';
import { an } from './objnam.js';
import {
    ROLE_RACEMASK, ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE, ROLE_ALIGNMASK,
    AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, MH_HUMAN,
    ROLE_GENDERS, ROLE_ALIGNS,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED, MENU_BEHAVE_STANDARD,
} from './const.js';
import {
    tty_curs_base, tty_putstr_base, tty_putch_base, tty_base_cursor,
    tty_base_pos, tty_create_nhwindow, tty_destroy_nhwindow,
    tty_get_nhwindow, tty_start_menu, tty_add_menu, tty_add_menu_str,
    tty_end_menu, tty_display_nhwindow, set_item_state, menu_page_items,
    NHW_MENU, ATR_NONE,
} from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';

const ROWS = 24;

// win/tty/wintty.c:545 tty_init_nhwindows() — the startup banner.
//
//   tty_curs(BASE_WINDOW, 1, 4);
//   for (i = 1; i <= 4; ++i) tty_putstr(BASE_WINDOW, 0, banner_line(i));
//   tty_putstr(BASE_WINDOW, 0, "");
//   ... tty_curs(BASE_WINDOW, 1, 11);
//
// Skipped when the rc turns splash_screen off, which is why seed8000 has no
// banner and the chargen sessions do.
export function tty_init_nhwindows() {
    if (game.flags.splash_screen === false) return;
    tty_curs_base(1, 4);
    for (const line of COPYRIGHT_BANNER)
        tty_putstr_base(line);
    tty_putstr_base('');
    tty_curs_base(1, 11);
}

// win/tty/wintty.c:651 tty_askname()
//
//   tty_putstr(BASE_WINDOW, 0, "");
//   tty_putstr(BASE_WINDOW, 0, "Who are you? ");
//   tty_curs(BASE_WINDOW, sizeof who_are_you, cury - 1);
//
// `sizeof who_are_you` is 14 (13 characters plus the NUL), and tty_curs is
// 1-based, so the cursor starts at column 13 on row 12. That is exactly what
// the recordings show for the first captured frame.
const WHO_ARE_YOU = 'Who are you? ';

async function tty_askname() {
    tty_putstr_base('');
    tty_putstr_base(WHO_ARE_YOU);
    tty_curs_base(WHO_ARE_YOU.length + 1, tty_base_pos().y - 1);

    let name = '';
    for (;;) {
        tty_base_cursor();
        const c = String.fromCharCode(await nhgetch());
        if (c === '\n' || c === '\r') break;
        if (c === '\x1b') { name = ''; break; }
        if (c === '\b' || c === '\x7f') {
            if (name.length) {
                name = name.slice(0, -1);
                tty_curs_base(WHO_ARE_YOU.length + 1 + name.length,
                              tty_base_pos().y);
                tty_putch_base(' ');
                tty_curs_base(WHO_ARE_YOU.length + 1 + name.length,
                              tty_base_pos().y);
            }
            continue;
        }
        name += c;
        tty_putch_base(c);
    }
    tty_base_cursor();
    /* win/tty/wintty.c:754 — since the player picked an arbitrary name here,
       they may pick another one during role selection. That is what puts the
       'a' entry, and the 'a' in the title, on the confirmation menu; a session
       whose rc pins `name:` never runs this and gets "Is this ok? [ynq]". */
    game.renameallowed = true;
    return name;
}

// src/role.c:2776 maybe_skip_seps() — the role menu needs 25 lines on a 24-line
// terminal, so C squeezes out separator rows rather than paginate. An excess of
// 1 drops the blank between "Random" and "Pick race first"; an excess of 2 also
// drops the one under the "<role> <race> ..." summary.
function maybe_skip_seps(rows, aspect) {
    if (aspect !== RS_ROLE) return 0;
    const f = game.flags;
    let n = 4;                  /* title+sep, role-so-far+sep */
    for (let i = 0; i < roles.length; ++i)
        if (ok_role(i, f.initrace, f.initgend, f.initalign)
            && ok_race(i, f.initrace, f.initgend, f.initalign)
            && ok_gend(i, f.initrace, f.initgend, f.initalign)
            && ok_align(i, f.initrace, f.initgend, f.initalign))
            ++n;
    n += 2;                     /* 'random' and separator */
    n += 5;                     /* race/gender/alignment 1st, filter, quit */
    n += 1;                     /* footer/prompt */
    if (rows > 0 && n > rows) return n - rows;
    return 0;
}

// src/role.c:2805 plsel_startmenu() — every menu opening re-runs the rigid
// checks first. This is the only thing in character selection that draws from
// the PRNG; the rest of this file only draws on the screen.
function plsel_startmenu(ttyrows, aspect) {
    rigid_role_checks();

    const f = game.flags;
    const ROLE = f.initrole, RACE = f.initrace,
          GEND = f.initgend, ALGN = f.initalign;
    const c20 = (s) => String(s).slice(0, 20);      /* C's "%.20s" */

    const rolename = (ROLE < 0) ? '<role>'
                   : (GEND === 1 && roles[ROLE].name.f) ? roles[ROLE].name.f
                     : roles[ROLE].name.m;
    let qbuf;
    if (!game.plname || ROLE < 0 || RACE < 0 || GEND < 0 || ALGN < 0)
        qbuf = `${c20(rolename)} ${c20(RACE < 0 ? '<race>' : races[RACE].noun)}`
             + ` ${c20(GEND < 0 ? '<gender>' : genders[GEND].adj)}`
             + ` ${c20(ALGN < 0 ? '<alignment>' : aligns[ALGN].adj)}`;
    else
        qbuf = `${c20(game.plname)} the ${c20(aligns[ALGN].adj)}`
             + ` ${c20(genders[GEND].adj)} ${c20(races[RACE].adj)}`
             + ` ${c20(rolename)}`;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    tty_add_menu_str(win, qbuf);
    if (maybe_skip_seps(ttyrows, aspect) !== 2)
        tty_add_menu_str(win, '');
    return win;
}

// src/role.c:2854 setup_rolemenu() — the selector letter is the role name's
// initial lowercased, and a collision with the PREVIOUS entry's letter takes
// the uppercase form. roles[] has Rogue before Ranger, so Rogue keeps 'r' and
// Ranger gets 'R'. It is a comparison against `lastch`, not a used-letter set:
// a third role starting with 'r' would silently reuse 'R'.
function setup_rolemenu(win, filtering, race, gend, algn) {
    let lastch = '';
    for (let i = 0; i < roles.length; i++) {
        const role_ok = ok_role(i, race, gend, algn)
                     && ok_race(i, race, gend, algn)
                     && ok_gend(i, race, gend, algn)
                     && ok_align(i, race, gend, algn);
        if (filtering && !role_ok) continue;
        /* a_int when picking, a_string when resetting the filter — the
           filter menu returns names, which setrolefilter() parses back. */
        const any = filtering ? i + 1 : roles[i].name.m;
        let thisch = roles[i].name.m[0].toLowerCase();
        if (thisch === lastch) thisch = thisch.toUpperCase();

        let rolenamebuf = roles[i].name.m;
        if (roles[i].name.f) {
            if (gend === 1) rolenamebuf = roles[i].name.f;
            else if (gend < 0) rolenamebuf += '/' + roles[i].name.f;
        }
        tty_add_menu(win, null, any, thisch, 0, ATR_NONE, NO_COLOR,
                     an(rolenamebuf),
                     (!filtering && !role_ok) ? MENU_ITEMFLAGS_SELECTED
                                              : MENU_ITEMFLAGS_NONE);
        lastch = thisch;
    }
}

// src/role.c:2905 setup_racemenu() — the raw first letter of the noun, with the
// capital as an unseen group accelerator.
function setup_racemenu(win, filtering, role, gend, algn) {
    for (let i = 0; i < races.length; i++) {
        const race_ok = ok_race(role, i, gend, algn)
                     && ok_role(role, i, gend, algn)
                     && ok_align(role, i, gend, algn);
        if (filtering && !race_ok) continue;
        const any = filtering ? i + 1 : races[i].noun;
        const this_ch = races[i].noun[0];
        tty_add_menu(win, null, any,
                     filtering ? this_ch : this_ch.toUpperCase(),
                     filtering ? this_ch.toUpperCase() : 0,
                     ATR_NONE, NO_COLOR, races[i].noun,
                     (!filtering && !race_ok) ? MENU_ITEMFLAGS_SELECTED
                                              : MENU_ITEMFLAGS_NONE);
    }
}

// src/role.c:2943 setup_gendmenu()
function setup_gendmenu(win, filtering, role, race, algn) {
    for (let i = 0; i < ROLE_GENDERS; i++) {
        const gend_ok = ok_gend(role, race, i, algn)
                     && ok_role(role, race, i, algn)
                     && ok_race(role, race, i, algn);
        if (filtering && !gend_ok) continue;
        const any = filtering ? i + 1 : genders[i].adj;
        const this_ch = genders[i].adj[0];
        tty_add_menu(win, null, any,
                     filtering ? this_ch : this_ch.toUpperCase(),
                     filtering ? this_ch.toUpperCase() : 0,
                     ATR_NONE, NO_COLOR, genders[i].adj,
                     (!filtering && !gend_ok) ? MENU_ITEMFLAGS_SELECTED
                                              : MENU_ITEMFLAGS_NONE);
    }
}

// src/role.c:2979 setup_algnmenu()
function setup_algnmenu(win, filtering, role, race, gend) {
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        const algn_ok = ok_align(role, race, gend, i)
                     && ok_role(role, race, gend, i)
                     && ok_race(role, race, gend, i);
        if (filtering && !algn_ok) continue;
        const any = filtering ? i + 1 : aligns[i].adj;
        const this_ch = aligns[i].adj[0];
        tty_add_menu(win, null, any,
                     filtering ? this_ch : this_ch.toUpperCase(),
                     filtering ? this_ch.toUpperCase() : 0,
                     ATR_NONE, NO_COLOR, aligns[i].adj,
                     (!filtering && !algn_ok) ? MENU_ITEMFLAGS_SELECTED
                                              : MENU_ITEMFLAGS_NONE);
    }
}

// src/role.c:1816 role_menu_extra() — the "Pick X first" jumps, plus the
// filter and quit entries.
//
// When the already-chosen facets force this one, the entry is replaced by a
// non-selectable "    role forces chaotic" line: four spaces of padding stand
// in for a greyed-out choice. Picking Rogue is exactly that case, which is why
// its race and gender menus carry an alignment line nobody can select.
const RS_filter = 5;
const RS_MENU_LET_OF = ['=', '?', '/', '"', '['];

function role_menu_extra(which, where, preselect) {
    const f = game.flags;
    let what = null, constrainer = null, forcedvalue = null;
    let fv = 0, allowmask;
    const r = f.initrole;
    let c = f.initrace;

    switch (which) {
    case RS_NAME:
        what = 'name';
        break;
    case RS_ROLE: {
        what = 'role';
        fv = r;
        /* if the filter leaves exactly one role, the role entry is disabled */
        let i;
        for (i = 0; i < roles.length; ++i)
            if (i !== fv && !rfilter.roles[i]) break;
        if (i === roles.length) {
            constrainer = 'filter';
            forcedvalue = 'role';
        }
        break;
    }
    case RS_RACE:
        what = 'race';
        fv = f.initrace;
        c = ROLE_NONE;                  /* override player's setting */
        if (r >= 0) {
            allowmask = roles[r].allow & ROLE_RACEMASK;
            if (allowmask === MH_HUMAN) c = 0;
            if (c >= 0) {
                constrainer = 'role';
                forcedvalue = races[c].noun;
            } else if (fv >= 0
                       && (allowmask & ~rfilter.mask) === races[fv].selfmask) {
                constrainer = 'filter';
                forcedvalue = 'race';
            }
        }
        break;
    case RS_GENDER: {
        what = 'gender';
        fv = f.initgend;
        let gend = ROLE_NONE;
        if (r >= 0) {
            allowmask = roles[r].allow & ROLE_GENDMASK;
            if (allowmask === ROLE_MALE) gend = 0;
            else if (allowmask === ROLE_FEMALE) gend = 1;
            if (gend >= 0) {
                constrainer = 'role';
                forcedvalue = genders[gend].adj;
            } else if (fv >= 0
                       && (allowmask & ~rfilter.mask) === genders[fv].allow) {
                constrainer = 'filter';
                forcedvalue = 'gender';
            }
        }
        break;
    }
    case RS_ALGNMNT: {
        what = 'alignment';
        fv = f.initalign;
        let a = ROLE_NONE;
        if (r >= 0) {
            allowmask = roles[r].allow & ROLE_ALIGNMASK;
            if (allowmask === AM_LAWFUL) a = 0;
            else if (allowmask === AM_NEUTRAL) a = 1;
            else if (allowmask === AM_CHAOTIC) a = 2;
            if (a >= 0) constrainer = 'role';
        }
        if (c >= 0 && !constrainer) {
            allowmask = races[c].allow & ROLE_ALIGNMASK;
            if (allowmask === AM_LAWFUL) a = 0;
            else if (allowmask === AM_NEUTRAL) a = 1;
            else if (allowmask === AM_CHAOTIC) a = 2;
            if (a >= 0) constrainer = 'race';
        }
        if (fv >= 0 && !constrainer
            && (ROLE_ALIGNMASK & ~rfilter.mask) === aligns[fv].allow) {
            constrainer = 'filter';
            forcedvalue = 'alignment';
        }
        if (a >= 0) forcedvalue = aligns[a].adj;
        break;
    }
    default:
        break;
    }

    if (constrainer) {
        /* four spaces of padding to fake a greyed-out menu choice */
        tty_add_menu_str(where, `    ${constrainer} forces ${forcedvalue}`);
    } else if (what) {
        tty_add_menu(where, null, RS_menu_arg(which), RS_MENU_LET_OF[which], 0,
                     ATR_NONE, NO_COLOR,
                     `Pick${fv >= 0 ? ' another' : ''} ${what} first`,
                     MENU_ITEMFLAGS_NONE);
    } else if (which === RS_filter) {
        tty_add_menu(where, null, RS_menu_arg(RS_filter), '~', 0,
                     ATR_NONE, NO_COLOR,
                     `${gotrolefilter() ? 'Reset' : 'Set'} role/race/&c filtering`,
                     MENU_ITEMFLAGS_NONE);
    } else if (which === ROLE_RANDOM) {
        tty_add_menu(where, null, ROLE_RANDOM, '*', 0, ATR_NONE, NO_COLOR,
                     'Random',
                     preselect ? MENU_ITEMFLAGS_SELECTED
                               : MENU_ITEMFLAGS_NONE);
    } else if (which === ROLE_NONE) {
        tty_add_menu(where, null, ROLE_NONE, 'q', 0, ATR_NONE, NO_COLOR,
                     'Quit',
                     preselect ? MENU_ITEMFLAGS_SELECTED
                               : MENU_ITEMFLAGS_NONE);
    }
}

// include/winprocs.h:314 #define RS_menu_arg(x) (ROLE_RANDOM - ((x) + 1))
function RS_menu_arg(x) { return ROLE_RANDOM - (x + 1); }

// src/role.c:1729 role_menu_extra() — every selection menu also carries these
// entries, which JUMP to another category rather than choosing anything:
//
//     '='  name      '?'  role      '/'  race      '\"' gender      '['  alignment
//
// seed0012 uses three of them: its keys are `n [ l " m / h m y`, which is
// "pick manually, jump to ALIGNMENT, lawful, jump to GENDER, male, jump to
// RACE, human", and only then the role menu it started on, Monk.
const RS_NAME = 0, RS_ROLE = 1, RS_RACE = 2, RS_GENDER = 3, RS_ALGNMNT = 4;

// win/tty/wintty.c tty_select_menu(win, PICK_ONE) — draws the menu, blocks in
// dmore() until a key arrives, and finishes as soon as a selector matches.
//
// The recorder captures the frame at that blocking read, so the window must be
// on screen BEFORE the key is consumed. Returns the chosen entry's identifier,
// which the caller decodes exactly as role.c does:
//
//   n == -1  <escape>            -> ROLE_NONE
//   n ==  1  <space>/<return>    -> the preselected entry
//   otherwise                    -> the entry whose selector was typed
async function select_menu_pick_one(win) {
    /* win/tty/wintty.c tty_display_nhwindow(), NHW_MENU: a menu that OVERLAYS
       clears the message window first; only one that takes the whole screen
       clears the screen instead. Without this the previous prompt stays
       painted on row 0 under the menu -- seed0004 showed "Shall I pick
       character's race, role, gen" still there beneath "Is this ok? [ynaq]".
       Row 0 is scored, so it failed every screen from that step onward. */
    {
        const c0 = tty_get_nhwindow(win);
        if (c0 && !(c0.offx === 10 || c0.maxrow >= 24))
            tty_clear_nhwindow_message(0);
    }
    tty_display_nhwindow(win);
    const cw = tty_get_nhwindow(win);
    for (;;) {
        const c = String.fromCharCode(await nhgetch());
        if (c === '\x1b') return ROLE_NONE;
        if (c === ' ' || c === '\n' || c === '\r') {
            for (let it = cw.mlist; it; it = it.next)
                if (it.identifier && it.selected) return it.identifier;
            return ROLE_NONE;
        }
        for (let it = cw.mlist; it; it = it.next)
            if (it.identifier && it.selector === c) return it.identifier;
        /* anything else is ignored and the menu waits for another key */
    }
}

// win/tty/wintty.c tty_select_menu(win, PICK_ANY) — the player toggles entries
// with their selector letters and commits with <return>/<space>.
//
// Toggling repaints only that one line through set_item_state(), which writes
// '+' where the initial full-page draw writes '*'. Returns the list of selected
// identifiers, or null for <escape>.
async function select_menu_pick_any(win) {
    tty_display_nhwindow(win);
    const cw = tty_get_nhwindow(win);
    for (;;) {
        const c = String.fromCharCode(await nhgetch());
        if (c === '\x1b') return null;
        if (c === '\n' || c === '\r' || c === ' ') {
            const out = [];
            for (let it = cw.mlist; it; it = it.next)
                if (it.identifier && it.selected) out.push(it.identifier);
            return out;
        }
        const page = menu_page_items(win, cw.curr_page || 0);
        const idx = page.findIndex(it => it.identifier && it.selector === c);
        if (idx >= 0) {
            /* wintty.c toggle_menu_curr(): flip, then repaint that line */
            const it = page[idx];
            it.selected = !it.selected;
            it.count = -1;
            set_item_state(win, idx, it);
        }
    }
}

// src/role.c:2728 reset_role_filtering() — the '~' menu.
//
// Everything here is built with the `filtering = FALSE` half of the four
// setup_*menu() functions: entries carry the NAME STRING as their identifier
// rather than an index, races/genders/alignments take their CAPITAL initial as
// the selector (the lowercase ones are already taken by the roles on the same
// page), and anything the current filter already excludes comes preselected.
async function reset_role_filtering() {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* no extra blank line preceding this entry; end_menu supplies one */
    tty_add_menu_str(win, 'Unacceptable roles');
    setup_rolemenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    tty_add_menu_str(win, '');
    tty_add_menu_str(win, 'Unacceptable races');
    setup_racemenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    tty_add_menu_str(win, '');
    tty_add_menu_str(win, 'Unacceptable genders');
    setup_gendmenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    tty_add_menu_str(win, '');
    tty_add_menu_str(win, 'Unacceptable alignments');
    setup_algnmenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    tty_end_menu(win, 'Pick all that apply'
                 + (gotrolefilter()
                    ? ' and/or unpick any that no longer apply' : ''));
    const selected = await select_menu_pick_any(win);
    tty_destroy_nhwindow(win);

    const f = game.flags;
    if (selected) {   /* n >= 0; an empty list clears the filter */
        clearrolefilter(RS_filter);
        for (const name of selected) setrolefilter(name);
        f.initrole = f.initrace = f.initgend = f.initalign = ROLE_NONE;
    }
    return !!(selected && selected.length);
}

// src/role.c:2340 — the identifier a PICK_ONE chargen menu returns.
function decode_choice(choice) {
    if (choice === ROLE_NONE) return { kind: 'quit' };
    if (choice === ROLE_RANDOM) return { kind: 'random' };
    for (let k = RS_NAME; k <= RS_filter; k++)
        if (choice === RS_menu_arg(k)) return { kind: 'jump', to: k };
    return { kind: 'pick', i: choice - 1 };
}

// src/role.c:2206 genl_player_setup()
// win/tty/wintty.c:634 tty_player_selection()
export async function player_selection() {
    try {
        return await genl_player_setup(ROWS);
    } finally {
        /* src/role.c:3006 `setup_done:` — program_state.in_role_selection-- */
        game.in_role_selection = false;
    }
}

async function genl_player_setup(screenheight) {
    const f = game.flags;
    f.initrole ??= ROLE_NONE;
    f.initrace ??= ROLE_NONE;
    f.initgend ??= ROLE_NONE;
    f.initalign ??= ROLE_NONE;

    if (!game.plname) game.plname = await tty_askname();

    /* src/role.c:2218 — affects tty menu cleanup: a chargen menu is drawn over
       the base window, which nothing tracks, so dismissing one clears the
       whole screen instead of trying to repaint what was under it. */
    game.in_role_selection = true;

    /* src/role.c:2225 — "Is this ok?" is skipped when the player pinned all
       four facets, because then nothing was picked for them. */
    const picksomething = (f.initrole === ROLE_NONE || f.initrace === ROLE_NONE
                           || f.initgend === ROLE_NONE
                           || f.initalign === ROLE_NONE);

    rigid_role_checks();

    let pick4u = 'n';
    if (f.initrole === ROLE_NONE || f.initrace === ROLE_NONE
        || f.initgend === ROLE_NONE || f.initalign === ROLE_NONE) {
        yn_prompt(build_plselection_prompt(f));
        for (;;) {
            const c = String.fromCharCode(await nhgetch()).toLowerCase();
            if (c === '\x1b' || c === 'q') return false;
            if (c === ' ' || c === '\n' || c === '\r') { pick4u = 'y'; break; }
            if (c === '@' || c === '*') { pick4u = 'a'; break; }
            if (c === 'y' || c === 'n' || c === 'a') { pick4u = c; break; }
        }
    }

    let auto = () => (pick4u === 'y' || pick4u === 'a');

    /* One category. Returns false to abort, otherwise sets the facet and
       possibly redirects `nextpick`. */
    const doCategory = async (which) => {
        if (which === RS_ROLE) {
            if (auto()) {
                let k = pick_role(f.initrace, f.initgend, f.initalign,
                                  PICK_RANDOM);
                if (k < 0) k = randrole();
                f.initrole = k;
                return RS_RACE;
            }
            if (f.initrole >= 0) return RS_RACE;
            /* 'excess' is used to try to avoid tty pagination. C computes it
               BEFORE plsel_startmenu(), i.e. against the facets as they stand
               before that call's rigid_role_checks() can change them. */
            const excess = maybe_skip_seps(screenheight, RS_ROLE);
            const win = plsel_startmenu(screenheight, RS_ROLE);
            setup_rolemenu(win, true, f.initrace, f.initgend, f.initalign);
            role_menu_extra(ROLE_RANDOM, win, true);
            if (excess < 1 || excess > 2) tty_add_menu_str(win, '');
            role_menu_extra(RS_RACE, win, false);
            role_menu_extra(RS_GENDER, win, false);
            role_menu_extra(RS_ALGNMNT, win, false);
            role_menu_extra(RS_filter, win, false);
            role_menu_extra(ROLE_NONE, win, false);   /* quit */
            tty_end_menu(win, 'Pick a role or profession');
            const r = decode_choice(await select_menu_pick_one(win));
            tty_destroy_nhwindow(win);
            if (r.kind === 'quit') return -1;
            if (r.kind === 'jump' && r.to === RS_filter) {
                /* src/role.c:2357 — the role is dropped, the filter menu runs,
                   and the role menu is re-entered whatever it returned. */
                f.initrole = ROLE_NONE;
                await reset_role_filtering();
                return RS_ROLE;
            }
            if (r.kind === 'jump') { clearFacet(r.to); return r.to; }
            f.initrole = (r.kind === 'random')
                ? pickOr(pick_role(f.initrace, f.initgend, f.initalign,
                                   PICK_RANDOM), randrole())
                : r.i;
            return RS_RACE;
        }
        if (which === RS_RACE) {
            const after = (f.initrole < 0) ? RS_ROLE : RS_GENDER;
            if (auto()) {
                let k = pick_race(f.initrole, f.initgend, f.initalign,
                                  PICK_RANDOM);
                f.initrace = (k < 0) ? 0 : k;
                return after;
            }
            if (f.initrace >= 0) return after;
            /* src/role.c:2388 — count first; the menu only opens when more
               than one race is valid, and with it the plsel_startmenu() draw. */
            let n = 0, k = 0;
            for (let i = 0; i < races.length; i++)
                if (ok_race(f.initrole, i, f.initgend, f.initalign)) { n++; k = i; }
            if (n > 1) {
                const win = plsel_startmenu(screenheight, RS_RACE);
                setup_racemenu(win, true, f.initrole, f.initgend, f.initalign);
                role_menu_extra(ROLE_RANDOM, win, true);
                tty_add_menu_str(win, '');
                role_menu_extra(RS_ROLE, win, false);
                role_menu_extra(RS_GENDER, win, false);
                role_menu_extra(RS_ALGNMNT, win, false);
                role_menu_extra(RS_filter, win, false);
                role_menu_extra(ROLE_NONE, win, false);   /* quit */
                tty_end_menu(win, 'Pick a race or species');
                const r = decode_choice(await select_menu_pick_one(win));
                tty_destroy_nhwindow(win);
                if (r.kind === 'quit') return -1;
                if (r.kind === 'jump' && r.to === RS_filter) {
                    /* src/role.c:2441 — go back to the role menu only if the
                       filter actually changed something. */
                    f.initrace = ROLE_NONE;
                    return (await reset_role_filtering()) ? RS_ROLE : RS_RACE;
                }
                if (r.kind === 'jump') { clearFacet(r.to); return r.to; }
                k = (r.kind === 'random')
                    ? pickOr(pick_race(f.initrole, f.initgend, f.initalign,
                                       PICK_RANDOM), k)
                    : r.i;
            }
            f.initrace = k;
            return after;
        }
        if (which === RS_GENDER) {
            const after = (f.initrole < 0) ? RS_ROLE
                        : (f.initrace < 0) ? RS_RACE : RS_ALGNMNT;
            if (auto()) {
                let k = pick_gend(f.initrole, f.initrace, f.initalign,
                                  PICK_RANDOM);
                f.initgend = (k < 0) ? 0 : k;
                return after;
            }
            if (f.initgend >= 0) return after;
            let n = 0, k = 0;
            for (let i = 0; i < ROLE_GENDERS; i++)
                if (ok_gend(f.initrole, f.initrace, i, f.initalign)) { n++; k = i; }
            if (n > 1) {
                const win = plsel_startmenu(screenheight, RS_GENDER);
                setup_gendmenu(win, true, f.initrole, f.initrace, f.initalign);
                role_menu_extra(ROLE_RANDOM, win, true);
                tty_add_menu_str(win, '');
                role_menu_extra(RS_ROLE, win, false);
                role_menu_extra(RS_RACE, win, false);
                role_menu_extra(RS_ALGNMNT, win, false);
                role_menu_extra(RS_filter, win, false);
                role_menu_extra(ROLE_NONE, win, false);   /* quit */
                tty_end_menu(win, 'Pick a gender or sex');
                const r = decode_choice(await select_menu_pick_one(win));
                tty_destroy_nhwindow(win);
                if (r.kind === 'quit') return -1;
                if (r.kind === 'jump' && r.to === RS_filter) {
                    f.initgend = ROLE_NONE;
                    return (await reset_role_filtering()) ? RS_ROLE : RS_GENDER;
                }
                if (r.kind === 'jump') { clearFacet(r.to); return r.to; }
                k = (r.kind === 'random')
                    ? pickOr(pick_gend(f.initrole, f.initrace, f.initalign,
                                       PICK_RANDOM), k)
                    : r.i;
            }
            f.initgend = k;
            return after;
        }
        /* RS_ALGNMNT */
        const after = (f.initrole < 0) ? RS_ROLE
                    : (f.initrace < 0) ? RS_RACE : RS_GENDER;
        if (auto()) {
            let k = pick_align(f.initrole, f.initrace, f.initgend,
                               PICK_RANDOM);
            f.initalign = (k < 0) ? 1 : k;
            return after;
        }
        if (f.initalign >= 0) return after;
        /* src/role.c:2564 — count first. The menu, and therefore
           plsel_startmenu()'s rigid_role_checks(), only happens when more than
           one alignment is valid. Calling it unconditionally makes a facet that
           C fills silently draw an extra rn2(1). */
        let n = 0, k = 0;
        for (let i = 0; i < ROLE_ALIGNS; i++)
            if (ok_align(f.initrole, f.initrace, f.initgend, i)) { n++; k = i; }
        if (n > 1) {
            const win = plsel_startmenu(screenheight, RS_ALGNMNT);
            setup_algnmenu(win, true, f.initrole, f.initrace, f.initgend);
            role_menu_extra(ROLE_RANDOM, win, true);
            tty_add_menu_str(win, '');
            role_menu_extra(RS_ROLE, win, false);
            role_menu_extra(RS_RACE, win, false);
            role_menu_extra(RS_GENDER, win, false);
            role_menu_extra(RS_filter, win, false);
            role_menu_extra(ROLE_NONE, win, false);   /* quit */
            tty_end_menu(win, 'Pick an alignment or creed');
            const r = decode_choice(await select_menu_pick_one(win));
            tty_destroy_nhwindow(win);
            if (r.kind === 'quit') return -1;
            if (r.kind === 'jump' && r.to === RS_filter) {
                f.initalign = ROLE_NONE;
                return (await reset_role_filtering()) ? RS_ROLE : RS_ALGNMNT;
            }
            if (r.kind === 'jump') { clearFacet(r.to); return r.to; }
            k = (r.kind === 'random')
                ? pickOr(pick_align(f.initrole, f.initrace, f.initgend,
                                    PICK_RANDOM), k)
                : r.i;
        }
        f.initalign = k;
        return after;
    };

    const clearFacet = (which) => {
        if (which === RS_ROLE) f.initrole = ROLE_NONE;
        else if (which === RS_RACE) f.initrace = ROLE_NONE;
        else if (which === RS_GENDER) f.initgend = ROLE_NONE;
        else if (which === RS_ALGNMNT) f.initalign = ROLE_NONE;
    };
    const pickOr = (v, fallback) => (v < 0 ? fallback : v);

    /* src/role.c:2288 `makepicks:` — the confirmation's 'n' jumps BACK HERE,
       not to the start: the name is kept and the "[ynaq]" prompt is not asked
       again, but pick4u becomes 'n' so the rest is chosen by menu. Restarting
       the whole function instead re-ran the random picks. */
    /* makepicks */
    for (;;) {
        let nextpick = RS_ROLE;
        do {
            const r = await doCategory(nextpick);
            if (r === -1) return false;
            nextpick = r;
        } while (f.initrole < 0 || f.initrace < 0
                 || f.initgend < 0 || f.initalign < 0);

        /* src/role.c:2654 — "Is this ok?" is itself a menu, and it is only
           asked when something was actually picked for the player. */
        let getconfirmation = picksomething && pick4u !== 'a';
        let again = false;
        while (getconfirmation) {
            const win = plsel_startmenu(screenheight, RS_filter); /* filter: not ROLE */
            tty_add_menu(win, null, 1, 'y', 0, ATR_NONE, NO_COLOR,
                         'Yes; start game', MENU_ITEMFLAGS_SELECTED);
            tty_add_menu(win, null, 2, 'n', 0, ATR_NONE, NO_COLOR,
                         'No; choose role again', MENU_ITEMFLAGS_NONE);
            if (game.renameallowed)
                tty_add_menu(win, null, 3, 'a', 0, ATR_NONE, NO_COLOR,
                             'Not yet; choose another name',
                             MENU_ITEMFLAGS_NONE);
            tty_add_menu(win, null, -1, 'q', 0, ATR_NONE, NO_COLOR, 'Quit',
                         MENU_ITEMFLAGS_NONE);
            tty_end_menu(win,
                         `Is this ok? [yn${game.renameallowed ? 'a' : ''}q]`);
            const choice = await select_menu_pick_one(win);
            tty_destroy_nhwindow(win);

            if (choice === 3) {
                /* src/role.c:2694 "choose another name": the four facets are
                   saved, plname cleared, askname() run, then restored, and the
                   confirmation menu shown again. */
                const save = [f.initrole, f.initrace, f.initgend, f.initalign];
                game.plname = await tty_askname();
                [f.initrole, f.initrace, f.initgend, f.initalign] = save;
            } else if (choice === 2) {
                pick4u = 'n';
                f.initrole = f.initrace = f.initgend = f.initalign = ROLE_NONE;
                again = true;
                break;                  /* goto makepicks */
            } else if (choice === 1) {
                getconfirmation = false;
            } else {
                return false;           /* 'q' or ESC */
            }
        }
        if (!again) return true;
    }
}


// src/role.c:1590 build_plselection_prompt()
//
// Only the nothing-is-pinned case is ported, which is what all eight
// interactive sessions use and which produces the same sentence in every one:
//
//   Shall I pick character's race, role, gender and alignment for you? [ynaq]
//
// C builds it as "Shall I pick " + "a " + root_plselection_prompt(...), applies
// the possessive suffix, then substitutes "pick a character" -> "pick character"
// because the full form runs past 80 columns. The trailing attribute list is
// role_post_attribs in BP_RACE, BP_ROLE, BP_GEND, BP_ALIGN order.
function build_plselection_prompt(f) {
    if (f.initrole !== ROLE_NONE || f.initrace !== ROLE_NONE
        || f.initgend !== ROLE_NONE || f.initalign !== ROLE_NONE) {
        (game.unported ||= new Set()).add('build_plselection_prompt partial');
    }
    return "Shall I pick character's race, role, gender and alignment"
         + ' for you? [ynaq]';
}

// win/tty/topl.c — a yn_function prompt sits on the message line and parks the
// cursor just past it.
function yn_prompt(prompt) {
    tty_curs_base(1, 0);
    tty_putstr_base(prompt);
    tty_curs_base(prompt.length + 2, 0);
    tty_base_cursor();
}
