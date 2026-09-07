// coloratt.js — color/attribute names and the menu coloring list.
// C ref: src/coloratt.c. The palette machinery (customcolors, rgb parsing)
// is not ported yet.

import { game } from './gstate.js';
import {
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, CLR_ORANGE, CLR_BRIGHT_GREEN, CLR_YELLOW,
    CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN, CLR_WHITE,
    NO_COLOR,
} from './terminal.js';
import {
    ATR_NONE, ATR_BOLD, ATR_DIM, ATR_ITALIC, ATR_ULINE, ATR_BLINK,
    ATR_INVERSE, NHW_MENU,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu, tty_add_menu,
    tty_end_menu, tty_select_menu,
} from './tty/wintty.js';
import {
    CLR_MAX, BUFSZ, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
    MENU_ITEMFLAGS_SELECTED, PICK_ONE, PICK_ANY,
    HL_NONE, HL_BOLD, HL_DIM, HL_ITALIC, HL_ULINE, HL_BLINK, HL_INVERSE,
} from './const.js';
import { fuzzymatch, mungspaces } from './hacklib.js';
import {
    regex_id, regex_init, regex_compile, regex_free, regex_error_desc,
} from './posixregex.js';
import { config_error_add } from './options.js';

// src/coloratt.c:12 colornames[] — a null name marks the start of the
// aliases, which are accepted on input but never listed or produced.
const colornames = [
    ['black', CLR_BLACK],
    ['red', CLR_RED],
    ['green', CLR_GREEN],
    ['brown', CLR_BROWN],
    ['blue', CLR_BLUE],
    ['magenta', CLR_MAGENTA],
    ['cyan', CLR_CYAN],
    ['gray', CLR_GRAY],
    ['orange', CLR_ORANGE],
    ['light green', CLR_BRIGHT_GREEN],
    ['yellow', CLR_YELLOW],
    ['light blue', CLR_BRIGHT_BLUE],
    ['light magenta', CLR_BRIGHT_MAGENTA],
    ['light cyan', CLR_BRIGHT_CYAN],
    ['white', CLR_WHITE],
    ['no color', NO_COLOR],
    [null, CLR_BLACK], /* everything after this is an alias */
    ['transparent', NO_COLOR],
    ['purple', CLR_MAGENTA],
    ['light purple', CLR_BRIGHT_MAGENTA],
    ['bright purple', CLR_BRIGHT_MAGENTA],
    ['grey', CLR_GRAY],
    ['bright red', CLR_ORANGE],
    ['bright green', CLR_BRIGHT_GREEN],
    ['bright blue', CLR_BRIGHT_BLUE],
    ['bright magenta', CLR_BRIGHT_MAGENTA],
    ['bright cyan', CLR_BRIGHT_CYAN],
];

// src/coloratt.c:47 attrnames[] — same shape.
const attrnames = [
    ['none', ATR_NONE],
    ['bold', ATR_BOLD],
    ['dim', ATR_DIM],
    ['italic', ATR_ITALIC],
    ['underline', ATR_ULINE],
    ['blink', ATR_BLINK],
    ['inverse', ATR_INVERSE],
    [null, ATR_NONE], /* everything after this is an alias */
    ['normal', ATR_NONE],
    ['uline', ATR_ULINE],
    ['reverse', ATR_INVERSE],
];

/* C: gs.save_menucolors / gs.save_colorings, for basic_menu_colors() */
let save_menucolors = false;
let save_colorings = null;

// src/coloratt.c:338 clr2colorname()
export function clr2colorname(clr) {
    for (const [name, color] of colornames)
        if (name && color === clr)
            return name;
    return null;
}

// src/coloratt.c:320 attr2attrname()
export function attr2attrname(attr) {
    for (const [name, a] of attrnames)
        if (name && a === attr)
            return name;
    return null;
}

// src/coloratt.c:349 match_str2clr()
export function match_str2clr(str, suppress_msg) {
    let i, c = CLR_MAX;

    /* allow "lightblue", "light blue", and "light-blue" to match "light blue"
       (also junk like "_l i-gh_t---b l u e" but we won't worry about that);
       also copes with trailing space; caller has removed any leading space */
    for (i = 0; i < colornames.length; i++)
        if (colornames[i][0]
            && fuzzymatch(str, colornames[i][0], ' -_', true)) {
            c = colornames[i][1];
            break;
        }
    if (i === colornames.length && /^[0-9]/.test(str))
        c = parseInt(str, 10);

    if (c < 0 || c >= CLR_MAX) {
        if (!suppress_msg)
            config_error_add(`Unknown color '${str.slice(0, 60)}'`);
        c = CLR_MAX; /* "none of the above" */
    }
    return c;
}

// src/coloratt.c:374 match_str2attr()
export function match_str2attr(str, complain) {
    let a = -1;

    for (let i = 0; i < attrnames.length; i++)
        if (attrnames[i][0]
            && fuzzymatch(str, attrnames[i][0], ' -_', true)) {
            a = attrnames[i][1];
            break;
        }

    if (a === -1 && complain)
        config_error_add(`Unknown text attribute '${str.slice(0, 50)}'`);

    return a;
}

// src/coloratt.c:396 query_attr()
export async function query_attr(prompt, dflt_attr) {
    const allow_many = !!(prompt && prompt.slice(0, 6).toLowerCase() === 'choose');
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < attrnames.length; i++) {
        if (!attrnames[i][0])
            break;
        tty_add_menu(tmpwin, null, i + 1, 0, 0,
                     attrnames[i][1], clr, attrnames[i][0],
                     (attrnames[i][1] === dflt_attr) ? MENU_ITEMFLAGS_SELECTED
                                                     : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, (prompt && prompt.length) ? prompt : 'Pick an attribute');
    const picks = await tty_select_menu(tmpwin, allow_many ? PICK_ANY : PICK_ONE);
    const pick_cnt = picks.cancelled ? -1 : picks.length;
    tty_destroy_nhwindow(tmpwin);
    if (pick_cnt > 0) {
        let j, k = 0;

        if (allow_many) {
            /* PICK_ANY, with one preselected entry (ATR_NONE) which
               should be excluded if any other choices were picked */
            for (let i = 0; i < pick_cnt; ++i) {
                j = picks[i] - 1;
                if (attrnames[j][1] !== ATR_NONE || pick_cnt === 1) {
                    switch (attrnames[j][1]) {
                    case ATR_NONE:
                        k = HL_NONE;
                        break;
                    case ATR_BOLD:
                        k |= HL_BOLD;
                        break;
                    case ATR_DIM:
                        k |= HL_DIM;
                        break;
                    case ATR_ITALIC:
                        k |= HL_ITALIC;
                        break;
                    case ATR_ULINE:
                        k |= HL_ULINE;
                        break;
                    case ATR_BLINK:
                        k |= HL_BLINK;
                        break;
                    case ATR_INVERSE:
                        k |= HL_INVERSE;
                        break;
                    }
                }
            }
        } else {
            /* PICK_ONE, but might get 0 or 2 due to preselected entry */
            j = picks[0] - 1;
            /* pick_cnt==2: explicitly picked something other than the
               preselected entry */
            if (pick_cnt === 2 && attrnames[j][1] === dflt_attr)
                j = picks[1] - 1;
            k = attrnames[j][1];
        }
        return k;
    } else if (pick_cnt === 0 && !allow_many) {
        /* PICK_ONE, preselected entry explicitly chosen */
        return dflt_attr;
    }
    /* either ESC to explicitly cancel (pick_cnt==-1) or
       PICK_ANY with preselected entry toggled off and nothing chosen */
    return -1;
}

// src/coloratt.c:475 query_color()
export async function query_color(prompt, dflt_color) {
    /* replace user patterns with color name ones and force 'menucolors' On */
    basic_menu_colors(true);

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < colornames.length; i++) {
        if (!colornames[i][0])
            break;
        tty_add_menu(tmpwin, null, i + 1, 0, 0,
                     ATR_NONE, NO_COLOR, colornames[i][0],
                     (colornames[i][1] === dflt_color) ? MENU_ITEMFLAGS_SELECTED
                                                       : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, (prompt && prompt.length) ? prompt : 'Pick a color');
    const picks = await tty_select_menu(tmpwin, PICK_ONE);
    const pick_cnt = picks.cancelled ? -1 : picks.length;
    tty_destroy_nhwindow(tmpwin);

    /* remove temporary color name patterns and restore user-specified ones;
       reset 'menucolors' option to its previous value */
    basic_menu_colors(false);

    if (pick_cnt > 0) {
        let i = colornames[picks[0] - 1][1];
        /* pick_cnt==2: explicitly picked something other than the
           preselected entry */
        if (pick_cnt === 2 && i === NO_COLOR)
            i = colornames[picks[1] - 1][1];
        return i;
    } else if (pick_cnt === 0) {
        /* pick_cnt==0: explicitly picking preselected entry toggled it off */
        return dflt_color;
    }
    return -1;
}

// src/coloratt.c:530 basic_menu_colors() — True: temporarily replace menu
// color entries with a fake set of menu colors which match their names;
// False: restore user-specified colorings. iflags.use_menu_color is
// game.iflags.menucolors here.
export function basic_menu_colors(load_colors) {
    if (load_colors) {
        /* replace normal menu colors with a set specifically for colors */
        save_menucolors = !!game.iflags?.menucolors;
        save_colorings = game.menu_colorings || null;

        (game.iflags ||= {}).menucolors = true;
        if (game.color_colorings) {
            /* use the alternate colorings which were set up previously */
            game.menu_colorings = game.color_colorings;
        } else {
            /* create the alternate colorings once */
            const pmatchregex = regex_id.toLowerCase() === 'pmatchregex';
            const patternfmt = pmatchregex ? '*' : '';

            /* menu_colorings pointer has been saved; clear it in order
               to add the alternate entries as if from scratch */
            game.menu_colorings = null;

            /* this orders the patterns last-in/first-out; that means
               that the "light <foo>" variations come before the basic
               "<foo>" ones, which is exactly what we want (so that the
               shorter basic names won't get false matches as substrings
               of the longer ones) */
            for (let i = 0; i < colornames.length; ++i) {
                if (!colornames[i][0]) /* first alias entry has no name */
                    break;
                const c = colornames[i][1];
                if (c === CLR_BLACK || c === CLR_WHITE || c === NO_COLOR)
                    continue; /* skip these */
                add_menu_coloring_parsed(patternfmt + colornames[i][0], c, ATR_NONE);
            }

            /* right now, menu_colorings contains the alternate color list;
               remember that list for future pick-a-color instances and
               also keep it as is for this instance */
            game.color_colorings = game.menu_colorings;
        }
    } else {
        /* restore normal user-specified menu colors */
        game.iflags.menucolors = save_menucolors;
        game.menu_colorings = save_colorings;
    }
}

// src/coloratt.c:585 add_menu_coloring_parsed() — gm.menu_colorings is a
// list with the newest entry at its head; game.menu_colorings[0] here.
export function add_menu_coloring_parsed(str, c, a) {
    const re_error = 'Menucolor regex error';

    if (str == null)
        return false;
    const tmp = { match: regex_init(), origstr: null, color: 0, attr: 0 };
    /* test_regex_pattern() has already validated this regexp but parsing
       it again could conceivably run out of memory */
    if (!regex_compile(str, tmp.match)) {
        const re_error_desc = regex_error_desc(tmp.match);

        regex_free(tmp.match);
        config_error_add(`${re_error}: ${re_error_desc}`);
        return false;
    }
    tmp.origstr = str;
    tmp.color = c;
    tmp.attr = a;
    (game.menu_colorings ||= []).unshift(tmp);
    (game.iflags ||= {}).menucolors = true; /* iflags.use_menu_color */
    return true;
}

// src/coloratt.c:617 add_menu_coloring() — parse '"regex_string"=color&attr'
// and add it to menucoloring
export function add_menu_coloring(tmpstr) {
    let c = NO_COLOR, a = ATR_NONE;
    const str = String(tmpstr ?? '').slice(0, BUFSZ - 1);

    const cs = str.indexOf('=');
    if (cs < 0) {
        config_error_add('Malformed MENUCOLOR');
        return false;
    }

    let tmps = mungspaces(str.slice(cs + 1)); /* advance past '=' */
    const amp = tmps.indexOf('&');

    c = match_str2clr(amp >= 0 ? tmps.slice(0, amp) : tmps, false);
    if (c >= CLR_MAX)
        return false;

    if (amp >= 0) {
        a = match_str2attr(tmps.slice(amp + 1), true); /* advance past '&' */
        if (a === -1)
            return false;
    }

    /* the regexp portion here has not been condensed by mungspaces() */
    let pattern = str.slice(0, cs);
    if (pattern[0] === '"' || pattern[0] === "'") {
        let end = pattern.length - 1;
        while (end > 0 && /\s/.test(pattern[end]))
            end--;
        if (pattern[end] === pattern[0])
            pattern = pattern.slice(1, end);
    }
    return add_menu_coloring_parsed(pattern, c, a);
}

// src/coloratt.c:664 free_menu_coloring() — release all menu color patterns
export function free_menu_coloring() {
    /* either menu_colorings or color_colorings or both might need to
       be freed or already be Null; do-loop will iterate at most twice */
    do {
        for (const tmp of game.menu_colorings || [])
            regex_free(tmp.match);
        game.menu_colorings = game.color_colorings || null;
        game.color_colorings = null;
    } while (game.menu_colorings);
}

// src/coloratt.c:684 free_one_menu_coloring() — release a specific menu
// color pattern (0 ..); not used for color_colorings
export function free_one_menu_coloring(idx) {
    const list = game.menu_colorings || [];

    if (idx >= 0 && idx < list.length) {
        regex_free(list[idx].match);
        list.splice(idx, 1);
    }
}

// src/coloratt.c:709 count_menucolors()
export function count_menucolors() {
    return (game.menu_colorings || []).length;
}

// src/coloratt.c:249 color_attr_to_str() — "color&attr".
export function color_attr_to_str(ca) {
    return `${clr2colorname(ca.color)}&${attr2attrname(ca.attr)}`;
}
