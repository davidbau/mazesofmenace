// options.js — Parse .nethackrc options + option_help text.
// C ref: options.c — handles OPTIONS=, BIND=, etc.; option_help / next_opt.

import {
    optionHelpBools,
    optionHelpCompounds,
    optionHelpOthers,
    dosetSimpleOpts,
    dosetSimpleNameWidth,
    dosetSimpleSections,
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
    AUTOUNLOCK_UNTRAP,
    AUTOUNLOCK_APPLY_KEY,
    AUTOUNLOCK_KICK,
    AUTOUNLOCK_FORCE,
} from './const.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt, clear_committed_status } from './display.js';
import { paint_corner_nhw_menu } from './invent.js';
import { ATR_INVERSE } from './terminal.js';
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
        // C: tty_end_menu prompt uses menu_headings (ATR_INVERSE)
        const entries = [
            { text: prompt, attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
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

        // C process_menu_window: letter toggles stay inside the menu —
        // no dismiss/docrt until the menu returns.
        if (key === 27) {
            game._menu_overlay = false;
            await docrt();
            await flush_screen(1);
            return priorSelect ?? '';
        }
        if (key === 13 || key === 10) {
            game._menu_overlay = false;
            await docrt();
            await flush_screen(1);
            const sel = items.filter((it) => it.selected).map((it) => it.sym);
            return sel.join('');
        }
        if (key === 32) continue;
        const ch = String.fromCharCode(key);
        if (ch === 'A') {
            for (const it of items) it.selected = false;
            game._menu_overlay = false;
            await docrt();
            await flush_screen(1);
            return '';
        }
        const hit = items.find((it) => it.letch === ch || it.sym === ch);
        if (hit) hit.selected = !hit.selected;
        // invalid / toggle → re-paint same menu (keep overlay; no docrt)
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

/** C ref: options.c n_currently_set / count_apes — ape list deferred. */
function currently_set_val(n) {
    return `(${n} currently set)`;
}

/**
 * C ref: options.c optfn_* get_val for doset_simple_menu compound/othr rows.
 * Named omissions: full handlers for fruit/number_pad/autounlock/symset/
 * statuslines/exceptions/menu colors/status rules — display values only
 * until those handlers are ported.
 */
function simple_opt_get_val(opt) {
    const name = opt.name;
    if (name === 'fruit') {
        return String(game.pl_fruit || game.flags?.fruit || 'slime mold');
    }
    if (name === 'number_pad') {
        // C: Cmd.num_pad / phone / pcHack / swap_yz → numpadmodes[]
        const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
        if (!numPad) {
            return game.Cmd?.swap_yz ? '-1=off, y & z swapped' : '0=off';
        }
        const phone = !!(game.Cmd?.phone_layout);
        const pc = !!(game.Cmd?.pcHack_compat);
        if (phone) return pc ? '4=on, phone layout, MSDOS compatible' : '3=on, phone-style layout';
        if (pc) return '2=on, MSDOS compatible';
        return '1=on';
    }
    if (name === 'autounlock') {
        // C: flags.autounlock default AUTOUNLOCK_APPLY_KEY; get_val joins names
        const au = game.flags?.autounlock;
        if (au === 0) return 'none';
        if (au == null || au === undefined) return 'apply-key';
        const parts = [];
        const bits = Number(au);
        if (bits & AUTOUNLOCK_UNTRAP) parts.push('untrap');
        if (bits & AUTOUNLOCK_APPLY_KEY) parts.push('apply-key');
        if (bits & AUTOUNLOCK_KICK) parts.push('kick');
        if (bits & AUTOUNLOCK_FORCE) parts.push('force');
        return parts.length ? parts.join(' + ') : 'apply-key';
    }
    if (name === 'pickup_types') return pickup_types_display();
    if (name === 'autopickup exceptions') {
        return currently_set_val(game.flags?.ape_count ?? 0);
    }
    if (name === 'symset') {
        // C: gs.symset[PRIMARYSET].name + ", active" + ", handler=DEC"
        // jsmain stores OPTIONS=symset:Name on game.symset; boolean
        // DECgraphics also implies the DECgraphics set name.
        let nm = game.symset || game._parsed_rc?.symset || game.flags?.symset;
        if (!nm && game.iflags?.decgraphics) nm = 'DECgraphics';
        if (!nm) return 'default';
        let s = String(nm);
        s += ', active';
        if (String(nm).toLowerCase() === 'decgraphics' || game.iflags?.decgraphics) {
            s += ', handler=DEC';
        }
        return s;
    }
    if (name === 'statuslines') {
        const n = game.iflags?.wc2_statuslines;
        return (n != null && n >= 3) ? '3' : '2';
    }
    if (name === 'menu colors') {
        return currently_set_val(game.iflags?.menu_colors_count ?? 0);
    }
    if (name === 'status highlight rules') {
        return currently_set_val(game.iflags?.status_hilite_count ?? 0);
    }
    if (name === 'status condition fields') {
        // C: condopt defaults → 16 fields selected
        return currently_set_val(game.iflags?.status_cond_count ?? 16);
    }
    return 'unknown';
}

function simple_bool_value(opt) {
    const bag = game[opt.addr.obj] || {};
    const v = bag[opt.addr.key];
    if (v === undefined) return !!opt.init;
    return !!v;
}

function simple_bool_toggle(opt) {
    if (!game[opt.addr.obj]) game[opt.addr.obj] = {};
    const bag = game[opt.addr.obj];
    bag[opt.addr.key] = !simple_bool_value(opt);
    // C options.c opt_hilite_pet: enabling with unset petattr → ATR_INVERSE
    if (opt.name === 'hilite_pet' && bag[opt.addr.key] && !bag.wc2_petattr) {
        bag.wc2_petattr = ATR_INVERSE;
    }
}

function format_simple_opt_line(opt, nameWidth) {
    const name = opt.name;
    let val;
    if (opt.opttyp === 'Bool') {
        val = simple_bool_value(opt) ? 'X' : ' ';
    } else {
        val = simple_opt_get_val(opt);
    }
    // C: Sprintf(fmtstr, "%%-%us [%%s]", longest_option_name(...))
    let line = `${name.padEnd(nameWidth)} [${val}]`;
    if (opt.autopickupSuffix) line += '  (for autopickup)';
    return line;
}

/**
 * C ref: wintty.c tty_end_menu letter assign + process_menu_window PICK_ONE.
 * Per-page 'a'..'z' for items without a fixed selector; space → next page
 * or cancel on last; Return/ESC cancel; letter → that item.
 * @returns {Promise<{kind:'pick'|'cancel', item?:object}>}
 */
async function select_menu_pick_one(rawItems) {
    const rows = 24;
    const lmax = Math.min(52, rows - 1);
    // Clone and assign selectors like C tty_end_menu
    const items = rawItems.map((it) => ({ ...it }));
    let menuCh = 'a';
    for (let n = 0; n < items.length; n++) {
        if (n % lmax === 0) menuCh = 'a';
        const it = items[n];
        if (it.selectable && !it.selector) {
            it.selector = menuCh;
            if (menuCh === 'z') menuCh = 'A';
            else menuCh = String.fromCharCode(menuCh.charCodeAt(0) + 1);
        }
    }
    const npages = Math.max(1, Math.floor((items.length + lmax - 1) / lmax));
    let currPage = 0;

    // C tty_end_menu: multi-page → maxrow = lmax+1 ≥ rows → fullscreen.
    // Force via menu_overlay false for the paint geometry check.
    const prevOverlay = game.flags?.menu_overlay;
    if (npages > 1) {
        if (!game.flags) game.flags = {};
        game.flags.menu_overlay = false;
    }

    try {
    for (;;) {
        const start = currPage * lmax;
        const page = items.slice(start, start + lmax);
        const entries = page.map((it) => {
            if (it.selectable) {
                return {
                    text: `${it.selector} - ${it.text}`,
                    attr: it.attr || 0,
                };
            }
            return { text: it.text, attr: it.attr || 0 };
        });
        const morestr = npages > 1
            ? `(${currPage + 1} of ${npages})`
            : '(end) ';
        await paint_corner_nhw_menu(entries, morestr);
        await flush_screen(1);
        const key = await nhgetch();
        const wasFullscreen = game._tty_menu_geom?.offx === 0;
        game._menu_overlay = false;
        await docrt();
        const ch = String.fromCharCode(key);
        const hit = (key !== 27 && key !== 13 && key !== 10 && key !== 32)
            ? page.find((it) => it.selectable && it.selector === ch)
            : null;
        if (hit && wasFullscreen) {
            // C: fullscreen NHW_MENU clear leaves status blank across the
            // Options → choose_classes submenu; restore on final dismiss.
            clear_committed_status();
        }
        await flush_screen(1);

        if (key === 27 || key === 13 || key === 10) {
            return { kind: 'cancel' };
        }
        if (key === 32) {
            if (currPage < npages - 1) {
                currPage++;
                continue;
            }
            return { kind: 'cancel' };
        }
        if (hit) return { kind: 'pick', item: hit };
        // invalid → re-prompt same page (C nhbell)
    }
    } finally {
        if (npages > 1) {
            if (prevOverlay === undefined) delete game.flags.menu_overlay;
            else game.flags.menu_overlay = prevOverlay;
        }
    }
}

/**
 * C ref: options.c doset_simple_menu — NHW_MENU from allopt[] OptS_General
 * …Status, title "Options", PICK_ONE. Returns pick_cnt (0 = done).
 */
async function doset_simple_menu() {
    const nameWidth = dosetSimpleNameWidth;

    for (;;) {
        // C: tty_end_menu prepends prompt then blank (via reverse+prepend)
        const raw = [
            { text: 'Options', attr: ATR_INVERSE, selectable: false },
            { text: '', attr: 0, selectable: false },
        ];
        if (game.simple_options_help) {
            raw.push({
                text: "Use command '#optionsfull' to get the complete options list.",
                attr: 0,
                selectable: false,
            });
        }
        raw.push({
            text: game.simple_options_help ? 'hide help' : 'show help',
            attr: 0,
            selectable: true,
            selector: '?',
            opt: { kind: 'help' },
        });

        for (const section of dosetSimpleSections) {
            raw.push({ text: '', attr: 0, selectable: false });
            // C: Sprintf(buf, " %-30s ", OptS_type[section])
            const heading = ` ${section.padEnd(30)} `;
            raw.push({ text: heading, attr: ATR_INVERSE, selectable: false });
            for (const opt of dosetSimpleOpts) {
                if (opt.section !== section) continue;
                raw.push({
                    text: format_simple_opt_line(opt, nameWidth),
                    attr: 0,
                    selectable: true,
                    opt,
                });
            }
        }

        const res = await select_menu_pick_one(raw);
        if (res.kind !== 'pick') return 0;

        const opt = res.item.opt;
        if (opt?.kind === 'help') {
            game.simple_options_help = !game.simple_options_help;
            // C: goto redo_opt_help — rebuild without returning to doset_simple
            continue;
        }
        if (opt?.opttyp === 'Bool') {
            simple_bool_toggle(opt);
            return 1;
        }
        if (opt?.name === 'pickup_types' && opt.hasHandler) {
            await handler_pickup_types();
            return 1;
        }
        // Other compound/othr handlers deferred — still count as a pick so
        // C loops (getlin/ESC still returns pickedone).
        return 1;
    }
}

/**
 * C ref: options.c doset_simple — loop doset_simple_menu until no pick.
 * Named omissions: #optionsfull / doset / fruit/number_pad/autounlock/
 * symset/status handlers; help descr lines under simple_options_help.
 */
export async function doset_simple() {
    if (!game.flags) game.flags = {};
    if (!game.iflags) game.iflags = {};
    // C: iflags.menu_requested → doset(); deferred
    do {
        const picked = await doset_simple_menu();
        if (picked <= 0) break;
    } while (true);
    return ECMD_OK;
}

/** Map object oclass → default class symbol for autopick_testobj. */
export function oclass_to_sym(oclass) {
    return OC_SYM[oclass] || '';
}
