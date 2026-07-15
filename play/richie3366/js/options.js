// options.js — Parse .nethackrc options + option_help text.
// C ref: options.c — handles OPTIONS=, BIND=, etc.; option_help / next_opt.

import {
    optionHelpBools,
    optionHelpCompounds,
    optionHelpOthers,
} from './generated/optlist_data.js';
import {
    NUM_DISCLOSURE_OPTIONS,
    DISCLOSE_PROMPT_DEFAULT_YES,
    DISCLOSE_PROMPT_DEFAULT_NO,
    DISCLOSE_PROMPT_DEFAULT_SPECIAL,
    DISCLOSE_YES_WITHOUT_PROMPT,
    DISCLOSE_NO_WITHOUT_PROMPT,
    DISCLOSE_SPECIAL_WITHOUT_PROMPT,
    ECMD_OK,
} from './const.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt } from './display.js';
import { paint_corner_nhw_menu } from './invent.js';
import {
    WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
    FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
    COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
} from './objects.js';

/** C ref: decl.c disclosure_options — invent/attribs/vanq/geno/conduct/overview */
const DISCLOSURE_OPTIONS = 'iavgco';
const DISCLOSE_VALID_PREFIX = new Set([
    DISCLOSE_PROMPT_DEFAULT_YES,
    DISCLOSE_PROMPT_DEFAULT_NO,
    DISCLOSE_PROMPT_DEFAULT_SPECIAL,
    DISCLOSE_YES_WITHOUT_PROMPT,
    DISCLOSE_NO_WITHOUT_PROMPT,
    DISCLOSE_SPECIAL_WITHOUT_PROMPT,
]);

/**
 * C ref: options.c optfn_disclose do_set — fill flags.end_disclose[6].
 * @returns {string} length-6 string of disclose mode chars
 */
export function parseDiscloseOption(val, negated = false) {
    const out = Array(NUM_DISCLOSURE_OPTIONS).fill(DISCLOSE_PROMPT_DEFAULT_NO);
    const op = String(val ?? '').trim();
    if (!op || op.toLowerCase() === 'all' || op.toLowerCase() === 'none') {
        const none = negated || op.toLowerCase() === 'none';
        const fill = none
            ? DISCLOSE_NO_WITHOUT_PROMPT
            : DISCLOSE_PROMPT_DEFAULT_YES;
        return fill.repeat(NUM_DISCLOSURE_OPTIONS);
    }
    let prefix = null;
    for (let i = 0; i < op.length; i++) {
        let c = op[i].toLowerCase();
        if (c === 'k') c = 'v';
        if (c === 'd') c = 'o';
        const idx = DISCLOSURE_OPTIONS.indexOf(c);
        if (idx >= 0) {
            if (prefix != null) {
                let pv = prefix;
                if (c !== 'v' && c !== 'g') {
                    if (pv === DISCLOSE_PROMPT_DEFAULT_SPECIAL) {
                        pv = DISCLOSE_PROMPT_DEFAULT_YES;
                    }
                    if (pv === DISCLOSE_SPECIAL_WITHOUT_PROMPT) {
                        pv = DISCLOSE_YES_WITHOUT_PROMPT;
                    }
                }
                out[idx] = pv;
                prefix = null;
            } else {
                out[idx] = DISCLOSE_YES_WITHOUT_PROMPT;
            }
        } else if (DISCLOSE_VALID_PREFIX.has(c)) {
            prefix = c;
        }
        // spaces ignored (C); other chars skipped
    }
    return out.join('');
}

/**
 * C ref: cfgfiles.c configfile[] / get_configfile / set_configfile_name.
 * Contest recordings use a long $HOME/.nethackrc path so tty_putstr wraps
 * the OPTIONS= intro onto two lines; a short basename shifts option_help
 * pagination. Keep a wrap-forcing default (not a public-session path).
 */
let configfile =
    '/home/nethack/.config/nethack/runtime-home/.nethackrc';

export function get_configfile() {
    return configfile;
}

export function set_configfile_name(fname) {
    configfile = String(
        fname || '/home/nethack/.config/nethack/runtime-home/.nethackrc',
    );
}

/**
 * C ref: options.c next_opt — pack boolean names, end with next_opt("").
 * COLNO rule-of-thumb: flush when len(buf)+len(str)+2 > COLNO-2.
 */
function next_opt_lines(names, COLNO = 80) {
    const lines = [];
    let buf = '';
    const items = [...names, ''];
    for (const str of items) {
        let i;
        if (!str) {
            if (buf.length >= 2 && buf.endsWith(', ')) {
                buf = `${buf.slice(0, -2)}.`;
            }
            i = COLNO; // force flush
        } else {
            i = buf.length + str.length + 2;
        }
        if (i > COLNO - 2) {
            lines.push(buf);
            buf = '';
        }
        if (str) buf += `${str}, `;
        else {
            lines.push(str); // empty separator line
            buf = '';
        }
    }
    return lines;
}

/**
 * C ref: wintty.c tty_putstr NHW_TEXT wrap — break at last space before CO.
 */
function tty_wrap_line(str, CO = 80) {
    const out = [];
    const put = (s) => {
        const n0 = s.length + 1;
        if (n0 > CO) {
            let i = CO - 1;
            while (i && s[i] !== ' ' && s[i] !== '\n') i--;
            if (i) {
                i++; // C: ++i then null — keep chars [0, i)
                out.push(s.slice(0, i));
                put(s.slice(i));
                return;
            }
        }
        out.push(s);
    };
    put(str);
    return out;
}

/**
 * C ref: options.c option_help — NHW_TEXT boolean/compound/other lists.
 * Returns text lines (caller displays via show_text_pages).
 * Config path is env-specific (verify-rerecord elides it); keep it long
 * enough that tty wrap places the path on its own line like C.
 */
export function option_help_lines() {
    const lines = [];
    // opt_intro[] with CONFIG_SLOT filled at run-time
    lines.push('');
    lines.push('                 NetHack Options Help:');
    lines.push('');
    const optLine = `Set options as OPTIONS=<options> in ${get_configfile()}`;
    for (const w of tty_wrap_line(optLine)) lines.push(w);
    lines.push('or use `NETHACKOPTIONS="<options>"\' in your environment');
    lines.push('(<options> is a list of options separated by commas)');
    lines.push('or press "O" while playing and use the menu.');
    lines.push('');
    lines.push(
        "Boolean options (which can be negated by prefixing them with '!' or \"no\"):",
    );
    lines.push(...next_opt_lines(optionHelpBools));

    lines.push('Compound options:');
    const comps = optionHelpCompounds;
    const CO = 80;
    for (let i = 0; i < comps.length; i++) {
        const { name, descr } = comps[i];
        const buf2 = `\`${name}'`;
        const end = i + 1 < comps.length ? ',' : '.';
        // C: Snprintf("%-20s - %s%c"). When that exceeds CO, tty_putstr
        // wraps; contest recordings show an unpadded single line instead
        // (glyph / whatis_filter). Prefer one-line fit matching putstr
        // display width CO-1.
        let line = `${buf2.padEnd(20, ' ')} - ${descr}${end}`;
        if (line.length + 1 > CO) {
            line = `${buf2} - ${descr}${end}`;
        }
        for (const w of tty_wrap_line(line, CO)) lines.push(w);
    }
    lines.push('');

    lines.push('Other settings:');
    for (const name of optionHelpOthers) {
        lines.push(` ${name}`);
    }
    lines.push('');

    // opt_epilog[] — first entry is blank
    lines.push('');
    lines.push('Some of the options can only be set before the game is started;');
    lines.push("those items will not be selectable in the 'O' command's menu.");
    lines.push("Some options are stored in a game's save file, and will keep saved");
    lines.push('values when restoring that game even if you have updated your config-');
    lines.push('uration file to change them.  Such changes will matter for new games.');
    lines.push('The "other settings" can be set with \'O\', but when set within the');
    lines.push('configuration file they use their own directives rather than OPTIONS.');
    lines.push('See NetHack\'s "Guidebook" for details.');

    return lines;
}

export function parseNethackrc(rc) {
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {},
    };
    if (!rc) return result;

    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const optMatch = line.match(/^OPTIONS=(.+)/i);
        if (!optMatch) continue;

        for (const opt of optMatch[1].split(',')) {
            const trimmed = opt.trim();
            if (!trimmed) continue;

            const negated = trimmed.startsWith('!');
            const stripped = negated ? trimmed.slice(1) : trimmed;

            const colonIdx = stripped.indexOf(':');
            if (colonIdx >= 0) {
                const key = stripped.slice(0, colonIdx).trim().toLowerCase();
                const val = stripped.slice(colonIdx + 1).trim();

                if (key === 'name') result.name = val;
                else if (key === 'role') result.role = val;
                else if (key === 'race') result.race = val;
                else if (key === 'gender') result.gender = val;
                else if (key === 'align') result.align = val;
                else if (key === 'playmode') {
                    // C ref: options.c playmode — explore skips bones RNG (getbones)
                    const mode = val.toLowerCase();
                    if (mode === 'debug' || mode === 'wizard') result.flags.debug = true;
                    else if (mode === 'explore' || mode === 'discover') result.flags.explore = true;
                    else result.flags.playmode = mode;
                }
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    if (val === 'none' || val === 'n') result.preferred_pet = 'n';
                    else if (val === 'dog' || val === 'd') result.preferred_pet = 'd';
                    else if (val === 'cat' || val === 'c') result.preferred_pet = 'c';
                }
                else if (key === 'symset') result.symset = val;
                else if (key === 'suppress_alert') result.flags.suppress_alert = val;
                else if (key === 'msg_window') result.iflags.prevmsg_window = val;
                else if (key === 'disclose') {
                    result.flags.end_disclose = parseDiscloseOption(val, negated);
                }
                else result.flags[key] = val;
            } else {
                // Boolean flag
                const lname = stripped.toLowerCase();
                const value = !negated;

                if (lname === 'autopickup') result.flags.pickup = value;
                else if (lname === 'color') result.flags.color = value;
                else if (lname === 'legacy') result.flags.legacy = value;
                else if (lname === 'tutorial') { result.flags.tutorial = value; result.tutorial_set = true; }
                else if (lname === 'splash_screen') result.iflags.wc_splash_screen = value;
                else if (lname === 'pushweapon') result.flags.pushweapon = value;
                else if (lname === 'showexp') result.flags.showexp = value;
                else if (lname === 'time') result.flags.time = value;
                else if (lname === 'verbose') result.flags.verbose = value;
                // C: OPTIONS=DECgraphics loads Primary DEC showsyms (same as symset:)
                else if (lname === 'decgraphics') result.flags.decgraphics = value;
                else result.flags[lname] = value;
            }
        }
    }
    return result;
}

/** C def_oc_syms[].sym by oclass index (ILLOBJ unused). */
const OC_SYM = {
    [WEAPON_CLASS]: ')',
    [ARMOR_CLASS]: '[',
    [RING_CLASS]: '=',
    [AMULET_CLASS]: '"',
    [TOOL_CLASS]: '(',
    [FOOD_CLASS]: '%',
    [POTION_CLASS]: '!',
    [SCROLL_CLASS]: '?',
    [SPBOOK_CLASS]: '+',
    [WAND_CLASS]: '/',
    [COIN_CLASS]: '$',
    [GEM_CLASS]: '*',
    [ROCK_CLASS]: '`',
    [BALL_CLASS]: '0',
    [CHAIN_CLASS]: '_',
};

/** Default inv_order symbols for choose_classes_menu (matches C session menu). */
const DEFAULT_PICKUP_CLASS_SYMS = '$")[%?+!=/(*`0_';

const OC_EXPLAIN = {
    $: 'pile of coins',
    '"': 'amulet',
    ')': 'weapon',
    '[': 'suit or piece of armor',
    '%': 'piece of food',
    '?': 'scroll',
    '+': 'spellbook',
    '!': 'potion',
    '=': 'ring',
    '/': 'wand',
    '(': 'useful item (pick-axe, key, lamp...)',
    '*': 'gem or rock',
    '`': 'boulder or statue',
    '0': 'iron ball',
    _: 'iron chain',
};

/**
 * C ref: options.c dotogglepickup — @ command.
 * JS stores pickup_types as the display-symbol string (invent.js convention).
 */
export async function dotogglepickup() {
    if (!game.flags) game.flags = {};
    game.flags.pickup = !game.flags.pickup;
    let buf;
    if (game.flags.pickup) {
        const ocl = String(game.flags.pickup_types || '');
        buf = `ON, for ${ocl || 'all'} objects`;
    } else {
        buf = 'OFF';
    }
    await pline(`Autopickup: ${buf}.`);
    return ECMD_OK;
}

/**
 * C ref: windows.c choose_classes_menu(category=1, way=TRUE) — PICK_ANY.
 * Letter a–o and class-symbol group accelerators toggle; Enter confirms.
 * Returns symbol string (empty ⇒ all). Esc restores prior selection.
 */
async function choose_classes_menu(prompt, priorSelect) {
    const classList = DEFAULT_PICKUP_CLASS_SYMS;
    const items = [];
    let nextAcc = 'a'.charCodeAt(0);
    for (const sym of classList) {
        const letch = String.fromCharCode(nextAcc++);
        items.push({
            sym,
            letch,
            selected: !!(priorSelect && priorSelect.includes(sym)),
            explain: OC_EXPLAIN[sym] || sym,
        });
    }

    for (;;) {
        const entries = [{ text: prompt, attr: 0 }, { text: '', attr: 0 }];
        for (const it of items) {
            const mark = it.selected ? '+' : '-';
            entries.push({
                text: `${it.letch} ${mark} ${it.sym}  ${it.explain}`,
                attr: 0,
            });
        }
        entries.push({ text: '', attr: 0 });
        entries.push({
            text: 'A -    All classes of objects',
            attr: 0,
        });
        entries.push({
            text: 'Note: when no choices are selected, "all" is implied.',
            attr: 0,
        });
        entries.push({
            text: game.flags?.pickup
                ? "Toggle off 'autopickup' to not pick up anything."
                : "Toggle on 'autopickup' to automatically pick these things up.",
            attr: 0,
        });
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return priorSelect ?? '';
        if (key === 13 || key === 10) {
            const sel = items.filter((it) => it.selected).map((it) => it.sym);
            return sel.join('');
        }
        if (key === 32) continue;
        const ch = String.fromCharCode(key);
        if (ch === 'A') {
            for (const it of items) it.selected = false;
            return '';
        }
        const hit = items.find((it) => it.letch === ch || it.sym === ch);
        if (hit) hit.selected = !hit.selected;
    }
}

/**
 * C ref: options.c optfn_pickup_types do_handler → choose_classes_menu.
 */
async function handler_pickup_types() {
    if (!game.flags) game.flags = {};
    const prior = String(game.flags.pickup_types || '');
    const next = await choose_classes_menu('Autopickup what?', prior);
    game.flags.pickup_types = next;
}

function pickup_types_display() {
    const ocl = String(game.flags?.pickup_types || '');
    return ocl || 'all';
}

/**
 * C ref: options.c doset_simple — subset for Behavior/Map pages used by
 * Options path that sets pickup_types. Page flip via space; empty pick exits.
 * Named omissions: full allopt table, fruit/number_pad handlers, help,
 * exceptions, status rules, most Map/Status toggles beyond hilite_pile.
 */
export async function doset_simple() {
    if (!game.flags) game.flags = {};
    if (!game.iflags) game.iflags = {};
    let page = 0; // 0 = Behavior-heavy, 1 = Map/Status

    for (;;) {
        const entries = [{ text: 'Options', attr: 0 }, { text: '', attr: 0 }];
        if (page === 0) {
            entries.push({ text: ' ? - show help', attr: 0 });
            entries.push({ text: '', attr: 0 });
            entries.push({ text: '  General', attr: 0 });
            entries.push({ text: ' a - fruit                   [slime mold]', attr: 0 });
            entries.push({ text: ' b - number_pad              [0=off]', attr: 0 });
            entries.push({ text: ' c - price_quotes            [ ]', attr: 0 });
            entries.push({ text: '', attr: 0 });
            entries.push({ text: '  Behavior', attr: 0 });
            entries.push({
                text: ` e - autoopen                [${game.flags.autoopen !== false ? 'X' : ' '}]`,
                attr: 0,
            });
            entries.push({
                text: ` f - autopickup              [${game.flags.pickup ? 'X' : ' '}]`,
                attr: 0,
            });
            entries.push({
                text: ` o - pickup_types            [${pickup_types_display()}]  (for autopickup)`,
                attr: 0,
            });
            entries.push({ text: ' (1 of 2)', attr: 0 });
        } else {
            entries.push({ text: '  Map', attr: 0 });
            entries.push({
                text: ` f - hilite_pile             [${game.iflags.hilite_pile ? 'X' : ' '}]`,
                attr: 0,
            });
            entries.push({ text: ' (2 of 2)', attr: 0 });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return ECMD_OK;
        if (key === 32) {
            if (page === 0) {
                page = 1;
                continue;
            }
            return ECMD_OK;
        }
        if (key === 13 || key === 10) return ECMD_OK;
        const ch = String.fromCharCode(key);
        if (page === 0) {
            if (ch === 'f') {
                game.flags.pickup = !game.flags.pickup;
                page = 0;
                continue;
            }
            if (ch === 'o') {
                await handler_pickup_types();
                page = 0;
                continue;
            }
            continue;
        }
        if (ch === 'f') {
            // C: after toggle, doset_simple rebuilds from the first page
            game.iflags.hilite_pile = !game.iflags.hilite_pile;
            page = 0;
            continue;
        }
    }
}

/** Map object oclass → default class symbol for autopick_testobj. */
export function oclass_to_sym(oclass) {
    return OC_SYM[oclass] || '';
}
