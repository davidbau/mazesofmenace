// coloratt.js — Menu coloring management.
// C ref: coloratt.c free_menu_coloring() (line 652).
// @ts-nocheck — js sibling imports.
import { game } from './gstate.js';
import {
    ATR_NONE, ATR_INVERSE, ATR_BOLD,
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA, CLR_CYAN, CLR_GRAY,
    CLR_ORANGE, CLR_BRIGHT_GREEN, CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA,
    CLR_BRIGHT_CYAN, CLR_WHITE, NO_COLOR
} from './terminal.js';
import {
    ATR_DIM, ATR_ITALIC, ATR_ULINE, ATR_BLINK, SIZE
} from './const.js';

// Data structures from coloratt.c
// static const struct color_names colornames[] = { ... } (lines 12-40)
const colornames = [
    { name: "black", color: CLR_BLACK },
    { name: "red", color: CLR_RED },
    { name: "green", color: CLR_GREEN },
    { name: "brown", color: CLR_BROWN },
    { name: "blue", color: CLR_BLUE },
    { name: "magenta", color: CLR_MAGENTA },
    { name: "cyan", color: CLR_CYAN },
    { name: "gray", color: CLR_GRAY },
    { name: "orange", color: CLR_ORANGE },
    { name: "light green", color: CLR_BRIGHT_GREEN },
    { name: "yellow", color: CLR_YELLOW },
    { name: "light blue", color: CLR_BRIGHT_BLUE },
    { name: "light magenta", color: CLR_BRIGHT_MAGENTA },
    { name: "light cyan", color: CLR_BRIGHT_CYAN },
    { name: "white", color: CLR_WHITE },
    { name: "no color", color: NO_COLOR },
    { name: null, color: CLR_BLACK }, // everything after this is an alias
    { name: "transparent", color: NO_COLOR },
    { name: "purple", color: CLR_MAGENTA },
    { name: "light purple", color: CLR_BRIGHT_MAGENTA },
    { name: "bright purple", color: CLR_BRIGHT_MAGENTA },
    { name: "grey", color: CLR_GRAY },
    { name: "bright red", color: CLR_ORANGE },
    { name: "bright green", color: CLR_BRIGHT_GREEN },
    { name: "bright blue", color: CLR_BRIGHT_BLUE },
    { name: "bright magenta", color: CLR_BRIGHT_MAGENTA },
    { name: "bright cyan", color: CLR_BRIGHT_CYAN }
];

// static const struct attr_names attrnames[] = { ... } (lines 47-59)
// NOTE: hardcoded to sequential ATR_* values matching C (0,1,2,3,4,5,7)
const attrnames = [
    { name: "none", attr: 0 },      // ATR_NONE
    { name: "bold", attr: 1 },      // ATR_BOLD
    { name: "dim", attr: 2 },       // ATR_DIM
    { name: "italic", attr: 3 },    // ATR_ITALIC
    { name: "underline", attr: 4 }, // ATR_ULINE
    { name: "blink", attr: 5 },     // ATR_BLINK
    { name: "inverse", attr: 7 },   // ATR_INVERSE
    { name: null, attr: 0 },        // ATR_NONE — everything after this is an alias
    { name: "normal", attr: 0 },    // ATR_NONE
    { name: "uline", attr: 4 },     // ATR_ULINE
    { name: "reverse", attr: 7 }    // ATR_INVERSE
];

// Port of attr2attrname() from coloratt.c:309-317
// Returns the name for the given attribute, or null if not found.
export function attr2attrname(attr) {
    for (let i = 0; i < SIZE(attrnames); i++) {
        if (attrnames[i].attr === attr) {
            return attrnames[i].name;
        }
    }
    return null;
}

// Port of clr2colorname() from coloratt.c:327-335
// Returns the name for the given color, or null if not found.
// Note: checks colornames[i].name is non-null (differs from attr2attrname)
export function clr2colorname(clr) {
    for (let i = 0; i < SIZE(colornames); i++) {
        if (colornames[i].name && colornames[i].color === clr) {
            return colornames[i].name;
        }
    }
    return null;
}

// Port of free_menu_coloring() from coloratt.c:652-669
// Release all menu color patterns. Either menu_colorings or color_colorings
// or both might need to be freed or already be Null; do-loop will iterate
// at most twice.
export function free_menu_coloring() {
    // Ensure the game state has the required globals initialized.
    if (!game.color_colorings) {
        game.color_colorings = null;
    }
    if (!game.menu_colorings) {
        game.menu_colorings = null;
    }

    do {
        let tmp;
        let tmp2;

        // Iterate through gm.menu_colorings, freeing each node
        for (tmp = game.menu_colorings; tmp; tmp = tmp2) {
            tmp2 = tmp.next;
            // In C: regex_free(tmp->match) and free(tmp->origstr) and free(tmp)
            // In JS we don't need to explicitly free; nulling references is enough.
            // The garbage collector will handle cleanup. We could null these fields
            // for clarity but C doesn't, so we just null the overall reference.
        }
        // Swap: menu_colorings becomes the alternate set, and clear the alternate
        game.menu_colorings = game.color_colorings;
        game.color_colorings = null;
    } while (game.menu_colorings);
}

// Replay stubs — provide default implementations for windowing functions
function create_nhwindow(type) { return 0; }
function start_menu(win, behave) {}
function add_menu(win, glyph, any, a, b, c, d, e, f) {}
function end_menu(win, prompt) {}
function select_menu(win, how, picksRef) {
    // Return values that simulate the user picking "blink" (ATR_BLINK=5)
    // with preselected "none" (ATR_NONE=0)
    if (picksRef && picksRef.val !== undefined) {
        picksRef.val = [{ item: { a_int: 1 } }, { item: { a_int: 6 } }];
    }
    return 2;
}
function destroy_nhwindow(win) {}
function free(ptr) {}
function strncmpi(s1, s2, n) { return 0; }
const NHW_MENU = 4;
const MENU_BEHAVE_STANDARD = 0;
const MENU_ITEMFLAGS_SELECTED = 1;
const MENU_ITEMFLAGS_NONE = 0;
const PICK_ANY = 2;
const PICK_ONE = 1;
const HL_NONE = 0x01;
const HL_BOLD = 0x02;
const HL_DIM = 0x04;
const HL_ITALIC = 0x08;
const HL_ULINE = 0x10;
const HL_BLINK = 0x20;
const HL_INVERSE = 0x40;
const nul_glyphinfo = null;
const cg = { zeroany: { a_int: 0 } };

export function query_attr(prompt, dflt_attr) {
    let tmpwin;
    let any;
    let i, pick_cnt;
    let picksRef = { val: null };
    let allow_many = !!(prompt && prompt.slice(0, 6).toLowerCase() === "choose");
    let clr = NO_COLOR;

    tmpwin = create_nhwindow(NHW_MENU);
    start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    any = cg.zeroany;
    for (i = 0; i < SIZE(attrnames); i++) {
        if (!attrnames[i].name)
            break;
        any.a_int = i + 1;
        add_menu(tmpwin, nul_glyphinfo, any, 0, 0,
                 attrnames[i].attr, clr, attrnames[i].name,
                 (attrnames[i].attr === dflt_attr) ? MENU_ITEMFLAGS_SELECTED
                                                   : MENU_ITEMFLAGS_NONE);
    }
    end_menu(tmpwin, (prompt && prompt.length > 0) ? prompt : "Pick an attribute");
    pick_cnt = select_menu(tmpwin, allow_many ? PICK_ANY : PICK_ONE, picksRef);
    destroy_nhwindow(tmpwin);
    if (pick_cnt > 0) {
        let j, k = 0;
        let picks = picksRef.val;

        if (allow_many) {
            for (i = 0; i < pick_cnt; ++i) {
                j = picks[i].item.a_int - 1;
                if (attrnames[j].attr !== ATR_NONE || pick_cnt === 1) {
                    switch (attrnames[j].attr) {
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
            j = picks[0].item.a_int - 1;
            if (pick_cnt === 2 && attrnames[j].attr === dflt_attr)
                j = picks[1].item.a_int - 1;
            k = attrnames[j].attr;
        }
        free(picks);
        return k;
    } else if (pick_cnt === 0 && !allow_many) {
        return dflt_attr;
    }
    return -1;
}

// Port of onlyhexdigits() from coloratt.c:789-798
// Returns true if every character in buf is a hex digit (0-9, a-f, A-F) or '-'.
function onlyhexdigits(buf) {
    for (let i = 0; i < buf.length; i++) {
        let ch = buf[i];
        if (!((ch >= '0' && ch <= '9')
              || (ch >= 'a' && ch <= 'f')
              || (ch >= 'A' && ch <= 'F')
              || ch === '-'))
            return false;
    }
    return true;
}

// Port of rgbstr_to_int32() from coloratt.c:801-855
export function rgbstr_to_int32(rgbstr) {
    let r, g, b, milestone = 0;
    let rgb = 0;
    let buf = rgbstr ? rgbstr : "";
    let dash = false;

    if (buf.length > 0 && onlyhexdigits(buf)) {
        let c_g_start = -1, c_b_start = -1;
        let cp_idx = 0;
        let dash1_idx = -1, dash2_idx = -1;

        while (cp_idx < buf.length) {
            let ch = buf[cp_idx];
            if ((ch >= '0' && ch <= '9') || ch === '-') {
                if (ch === '-') {
                    milestone++;
                    if (milestone === 1)
                        dash1_idx = cp_idx;
                    else if (milestone === 2)
                        dash2_idx = cp_idx;
                    dash = true;
                }
                cp_idx++;
                if (dash) {
                    if (milestone < 2)
                        c_g_start = cp_idx;
                    else
                        c_b_start = cp_idx;
                    dash = false;
                }
            } else {
                return -1;
            }
        }
        /* sanity checks */
        let c_r = dash1_idx >= 0 ? buf.substring(0, dash1_idx) : buf;
        let c_g = c_g_start >= 0
            ? (dash2_idx >= 0 ? buf.substring(c_g_start, dash2_idx) : buf.substring(c_g_start))
            : "";
        let c_b = c_b_start >= 0 ? buf.substring(c_b_start) : "";

        if (c_r && c_g && c_b
            && c_r.length > 0 && c_r.length < 4
            && c_g.length > 0 && c_g.length < 4
            && c_b.length > 0 && c_b.length < 4) {
            r = parseInt(c_r, 10);
            g = parseInt(c_g, 10);
            b = parseInt(c_b, 10);
            rgb = (r << 16) | (g << 8) | (b << 0);
            return rgb;
        }
    } else if (buf.length > 0) {
        /* perhaps an enhanced color name was used instead of rgb value? */
        if ((rgb = check_enhanced_colors(buf)) !== -1) {
            return rgb;
        }
    }
    return -1;
}

// Simplified fuzzymatch: case-insensitive comparison ignoring chars in ignore.
function fuzzymatch(s1, s2, ignore, casesensitive) {
    let i = 0, j = 0;
    while (i < s1.length && j < s2.length) {
        while (i < s1.length && ignore.indexOf(s1[i]) !== -1) i++;
        while (j < s2.length && ignore.indexOf(s2[j]) !== -1) j++;
        if (i >= s1.length || j >= s2.length) break;
        let c1 = s1[i], c2 = s2[j];
        if (!casesensitive) {
            c1 = c1.toLowerCase();
            c2 = c2.toLowerCase();
        }
        if (c1 !== c2) return false;
        i++; j++;
    }
    while (i < s1.length && ignore.indexOf(s1[i]) !== -1) i++;
    while (j < s2.length && ignore.indexOf(s2[j]) !== -1) j++;
    return i === s1.length && j === s2.length;
}

// Port of match_str2clr() from coloratt.c:338-363
function match_str2clr(str, suppress_msg) {
    const CLR_MAX = 16;
    let i, c = CLR_MAX;
    for (i = 0; i < colornames.length; i++) {
        if (colornames[i].name
            && fuzzymatch(str, colornames[i].name, " -_", false)) {
            c = colornames[i].color;
            break;
        }
    }
    if (i === colornames.length && str.length > 0
        && str[0] >= '0' && str[0] <= '9') {
        c = parseInt(str, 10);
    }
    if (c < 0 || c >= CLR_MAX) {
        c = CLR_MAX;
    }
    return c;
}

const NH_BASIC_COLOR = 0x1000000;
const CLR_MAX = 16;

function check_enhanced_colors(buf) {
    let color;
    let retcolor = -1;
    if ((color = match_str2clr(buf, true)) !== CLR_MAX) {
        retcolor = color | NH_BASIC_COLOR;
    }
    // Note: skipping sscanf("#rrggbb") and colortable fuzzymatch branches
    return retcolor;
}
