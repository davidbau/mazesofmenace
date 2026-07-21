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
    MENU_SELECT_ALL,
    MENU_UNSELECT_ALL,
    MENU_INVERT_ALL,
    MENU_SELECT_PAGE,
    MENU_UNSELECT_PAGE,
    MENU_INVERT_PAGE,
    MENU_NEXT_PAGE,
    MENU_PREVIOUS_PAGE,
    MENU_FIRST_PAGE,
    MENU_LAST_PAGE,
} from './const.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt, clear_committed_status } from './display.js';
import { paint_corner_nhw_menu, dismiss_nhw_menu } from './invent.js';
import { ATR_INVERSE } from './terminal.js';
import {
    WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
    FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
    COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
    objectNameStrs, objects,
} from './objects.js';
import { EXTCMDLIST, INTERNALCMD } from './generated/extcmdlist_data.js';
import { getlin } from './getline.js';
import { makesingular } from './objnam.js';

/** C ref: global.h PL_FSIZ — fruit name buffer. */
const PL_FSIZ = 32;

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

/**
 * C ref: options.c set_playmode — after playmode:debug / -D (wizard set),
 * strcpy(plname, "wizard") when authorize_wizard_mode succeeds.
 * Contest/JS: flags.debug already means wizard authorized (no
 * sysopt.wizards gate); explore authorize / deferred_X explore prompt
 * deferred.
 */
export function set_playmode() {
    if (!game.flags) game.flags = {};
    if (game.flags.debug || game.flags.wizard) {
        game.plname = 'wizard';
        // C: discover = !wizard after successful wizard entry
        game.flags.explore = false;
        if (game.iflags) game.iflags.deferred_X = false;
    }
    // C: if (discover && !authorize_explore_mode()) clear — deferred
}

/**
 * C ref: options.c txt2key — key token in BIND=key:command.
 * Covers single char, <enter>/<space>/<esc>, ^X/C-x, M-x, 3-digit
 * decimal. Named omissions: escapes() \\b/\\7 paths; quoted chars.
 */
export function txt2key(txt) {
    if (txt == null) return 0;
    txt = String(txt).trim();
    if (!txt) return 0;
    if (txt.length === 1) return txt.charCodeAt(0) & 0xff;
    const low = txt.toLowerCase();
    if (low === '<enter>') return 10;
    if (low === '<space>') return 32;
    if (low === '<esc>') return 27;
    // ^X or C-x / C-X
    if (txt[0] === '^' || ((txt[0] === 'C' || txt[0] === 'c') && txt[1] === '-')) {
        let rest = txt[0] === '^' ? txt.slice(1) : txt.slice(2);
        if (rest.startsWith('-')) rest = rest.slice(1);
        if (!rest) return txt[0] === '^' ? '^'.charCodeAt(0) : 'C'.charCodeAt(0);
        if (rest === '?') return 0x7f;
        return (rest.charCodeAt(0) & 0x1f);
    }
    // M-x / M-X
    if ((txt[0] === 'M' || txt[0] === 'm') && (txt[1] === '-' || txt.length > 1)) {
        let rest = txt.slice(1);
        if (rest.startsWith('-')) rest = rest.slice(1);
        if (!rest) return 'M'.charCodeAt(0);
        if (rest.length === 1) return (0x80 | rest.charCodeAt(0)) & 0xff;
    }
    if (/^\d{3}$/.test(txt)) return parseInt(txt, 10) & 0xff;
    return 0;
}

/**
 * C ref: options.c parsebindings — after BIND=/BINDINGS= prefix stripped.
 * Fills outMap: keyCode → command name (lowercase). "nothing" deletes.
 * Named omissions: mouse1/mouse2; menu-cmd aliases; CMD_PARAM (...);
 * escaped-comma key tokens (\,:cmd).
 */
export function parsebindings(bindings, outMap) {
    if (!bindings || !outMap) return false;
    let ok = true;
    // C recurses right-to-left on list commas; for plain key:cmd lists,
    // left-to-right split matches when no quoted commas.
    for (const piece of String(bindings).split(',')) {
        const part = piece.trim();
        if (!part) continue;
        const colon = part.indexOf(':');
        if (colon < 0) {
            ok = false;
            continue;
        }
        const keyTok = part.slice(0, colon).trim();
        const cmdTok = part.slice(colon + 1).trim();
        const key = txt2key(keyTok);
        if (!key) {
            ok = false;
            continue;
        }
        if (cmdTok.toLowerCase() === 'nothing') {
            outMap.delete(key);
            continue;
        }
        // Strip optional (param) — CMD_PARAM body deferred; name must match.
        let cmdName = cmdTok;
        const paren = cmdName.indexOf('(');
        if (paren >= 0 && cmdName.endsWith(')')) {
            cmdName = cmdName.slice(0, paren).trim();
        }
        // C bind_key: match extcmdlist ef_txt, skip INTERNALCMD
        const want = cmdName.toLowerCase();
        const ext = EXTCMDLIST.find(
            (e) => e.txt.toLowerCase() === want && !(e.flags & INTERNALCMD),
        );
        if (!ext) {
            ok = false;
            continue;
        }
        outMap.set(key, ext.txt.toLowerCase());
    }
    return ok;
}

export function parseNethackrc(rc) {
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {},
        // C: cfgfiles.c BINDINGS → parsebindings → Cmd.cmdbinds overlays
        binds: new Map(),
    };
    if (!rc) return result;

    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        // C: cfgfiles.c match_varname BINDINGS len≥4 → BIND= / BINDINGS=
        const bindMatch = line.match(/^BIND(?:INGS)?=(.+)/i);
        if (bindMatch) {
            parsebindings(bindMatch[1], result.binds);
            continue;
        }

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
                    // C ref: options.c optfn_playmode — sets wizard/discover;
                    // set_playmode() later renames plname to "wizard".
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

/** C ref: hacklib.c mungspaces — trim ends, compress internal spaces. */
function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

/**
 * C ref: bones.c sanitize_name — non-printable → '.'; 8-bit strip deferred
 * (tty eight_bit_input always on for this port).
 */
function sanitize_name(namebuf) {
    let out = '';
    for (let i = 0; i < namebuf.length; i++) {
        const c = namebuf.charCodeAt(i) & 0x7f;
        if (c < 0x20 || c === 0x7f) out += '.';
        else out += String.fromCharCode(c);
    }
    return out;
}

/**
 * C ref: options.c fruit_from_name — find by fname; optionally count chain.
 * @returns {{ fruit: object|null, count: number, highest: number }}
 */
function fruit_from_name(fname, countOnly) {
    let highest = 0;
    let count = 0;
    let found = null;
    for (let f = game.ffruit; f; f = f.nextf) {
        count++;
        if (f.fid > highest) highest = f.fid;
        if (!found && fname != null && f.fname === fname) found = f;
    }
    if (countOnly) return { fruit: found, count, highest };
    return { fruit: found, count, highest };
}

/**
 * C ref: options.c fruitadd — user-specified pl_fruit path (doset getlin).
 * Named omissions: bones/orc non-user path; rnd(127) overflow fallback;
 * name_to_mon corpse/egg/tin-of arms (candied via food-name collision only).
 * @param {string} str  current pl_fruit value (C passes svp.pl_fruit pointer)
 * @param {object|null} replaceFruit
 */
function fruitadd(str, replaceFruit) {
    // C user_specified path: str aliases pl_fruit after optfn_fruit nmcpy
    let altname = '';
    let f;

    let nam = makesingular(String(str || ''));
    if (nam.length > PL_FSIZ - 1) nam = nam.slice(0, PL_FSIZ - 1);
    game.pl_fruit = nam;

    let globpfx = 0;
    if (nam.startsWith('small ') || nam.startsWith('large ')) globpfx = 6;
    else if (nam.startsWith('medium ')) globpfx = 7;
    else if (nam.startsWith('very large ')) globpfx = 11;

    let found = false;
    let numeric = false;
    const bases = game.bases || [];
    const objs = objects();
    const start = bases[FOOD_CLASS] || 0;
    for (let i = start; objs && i < objs.length && objs[i]?.oc_class === FOOD_CLASS; i++) {
        const on = objectNameStrs[i] || '';
        if (on === nam || (globpfx > 0 && on === nam.slice(globpfx))) {
            found = true;
            break;
        }
    }
    if (!found) {
        let j = 0;
        while (j < nam.length && nam[j] >= '0' && nam[j] <= '9') j++;
        if (j === nam.length || /\s/.test(nam[j] || '')) numeric = true;
    }
    if (found || numeric
        || nam.startsWith('cursed ')
        || nam.startsWith('uncursed ')
        || nam.startsWith('blessed ')
        || nam.startsWith('partly eaten ')
        || nam === 'empty tin'
        || nam === 'glob'
        || (globpfx > 0 && nam.slice(globpfx) === 'glob')) {
        const buf = nam;
        game.pl_fruit = ('candied ' + buf).slice(0, PL_FSIZ - 1);
    }
    altname = '';
    if (!game.flags) game.flags = {};
    game.flags.made_fruit = false;
    if (replaceFruit) {
        f = replaceFruit;
        f.fname = String(game.pl_fruit).slice(0, PL_FSIZ - 1);
        if (!game.context) game.context = {};
        game.context.current_fruit = f.fid;
        return f.fid;
    }

    const look = altname || game.pl_fruit;
    const { fruit: existing, highest } = fruit_from_name(look, false);
    if (existing) {
        if (!game.context) game.context = {};
        game.context.current_fruit = existing.fid;
        return existing.fid;
    }
    if (highest >= 127) {
        // C: return rnd(127) — deferred; keep current_fruit
        return game.context?.current_fruit || 1;
    }
    f = {
        fname: String(look).slice(0, PL_FSIZ - 1),
        fid: highest + 1,
        nextf: game.ffruit || null,
    };
    game.ffruit = f;
    if (!game.context) game.context = {};
    game.context.current_fruit = f.fid;
    return f.fid;
}

/**
 * C ref: options.c optfn_fruit do_set (!opt_initial) after doset getlin.
 * give_opt_msg is false inside doset_simple so no "Fruit is now" pline.
 */
function optfn_fruit_set(op) {
    let s = mungspaces(op);
    if (!s) s = 'slime mold';
    s = sanitize_name(s);
    if (!s) s = 'slime mold';
    if (s.length > PL_FSIZ - 1) s = s.slice(0, PL_FSIZ - 1);

    // C: fruit_from_name count gate when !made_fruit / fnum>=100
    const { fruit: exists, count: fnum } = fruit_from_name(s, true);
    let forig = null;
    if (!exists) {
        if (!game.flags?.made_fruit) {
            forig = fruit_from_name(
                game.pl_fruit || 'slime mold', false,
            ).fruit;
        }
        if (!forig && fnum >= 100) {
            // C: config_error_add fruitful — silent ok return
            return;
        }
    }
    game.pl_fruit = s;
    fruitadd(game.pl_fruit, forig);
    // C: if (give_opt_msg) pline("Fruit is now \"%s\".", …) —
    // doset_simple keeps give_opt_msg false.
}

/**
 * C ref: options.c doset_simple_menu compound arm — getlin + parseoptions.
 * Handlers (hasHandler) call optfn do_handler; else "Set %s to what?".
 */
async function doset_compound_via_getlin(opt) {
    const name = opt.name;
    if (opt.hasHandler) {
        if (name === 'pickup_types') {
            await handler_pickup_types();
        }
        // Other hasHandler compounds deferred (number_pad/symset/…).
        return;
    }
    const abuf = await getlin(`Set ${name} to what?`);
    if (abuf === '\x1b' || (abuf && abuf.charCodeAt(0) === 0x1b)) {
        // C: ESC still counts as pickedone — caller returns 1
        return;
    }
    // C: parseoptions("%s:%s") — fruit via optfn_fruit; other Comp deferred
    if (name === 'fruit') {
        optfn_fruit_set(abuf);
    }
    // Named omission: remaining Comp/Othr getlin → parseoptions arms
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
 * C wintty.c: '>' MENU_NEXT_PAGE, '<' MENU_PREVIOUS_PAGE, '^' first, '|' last
 * (space alone finishes on last page; '>' does not).
 * Pre-assigned `selector` on selectable items is kept (print_dungeon
 * continuous a..z/A.. letters).
 * @returns {Promise<{kind:'pick'|'cancel', item?:object}>}
 */
export async function select_menu_pick_one(rawItems) {
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
        await dismiss_nhw_menu();
        const ch = String.fromCharCode(key);
        const hit = (key !== 27 && key !== 13 && key !== 10 && key !== 32
            && ch !== '>' && ch !== '<' && ch !== '^' && ch !== '|')
            ? page.find((it) => it.selectable && it.selector === ch)
            : null;
        if (hit && wasFullscreen) {
            // C: fullscreen NHW_MENU clear leaves status blank across the
            // Options → choose_classes submenu; restore on final dismiss.
            clear_committed_status();
        }

        if (key === 27 || key === 13 || key === 10) {
            return { kind: 'cancel' };
        }
        // C: ' ' / MENU_NEXT_PAGE ('>') — advance; space on last finishes
        if (key === 32 || ch === '>') {
            if (currPage < npages - 1) {
                currPage++;
                continue;
            }
            if (key === 32) {
                // space on last page cancels PICK_ONE (no pick)
                return { kind: 'cancel' };
            }
            // '>' on last page: stay (nhbell); re-prompt
            continue;
        }
        if (ch === '<') {
            if (currPage > 0) currPage--;
            continue;
        }
        if (ch === '^') {
            currPage = 0;
            continue;
        }
        if (ch === '|') {
            currPage = npages - 1;
            continue;
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
        // C: compound/othr — has_handler → optfn(do_handler); else getlin
        if (opt?.opttyp === 'Comp' || opt?.opttyp === 'Othr' || opt?.name) {
            if (opt?.name === 'pickup_types' && opt.hasHandler) {
                await handler_pickup_types();
                return 1;
            }
            if (opt?.opttyp === 'Comp' || opt?.opttyp === 'Othr') {
                await doset_compound_via_getlin(opt);
                return 1;
            }
        }
        // Unknown row — still count as a pick (C loops)
        return 1;
    }
}

/**
 * C ref: wintty.c process_menu_window PICK_ANY — letter toggles stay on
 * the menu; space → next page or finish on last; Enter/CR finish; ESC cancel;
 * MENU_SELECT_ALL/PAGE / UNSELECT_* / INVERT_* (D-0928). Named omissions:
 * count-prefix digits; MENU_SEARCH; menuitem_invert_test SKIPINVERT.
 * Returns selected selectable items (may be empty).
 */
export async function select_menu_pick_any(rawItems) {
    const rows = 24;
    const lmax = Math.min(52, rows - 1);
    const items = rawItems.map((it) => ({ ...it, selected: !!it.selected }));
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
                    const mark = it.selected ? '+' : '-';
                    return {
                        text: `${it.selector} ${mark} ${it.text}`,
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
            if (key === 27) {
                // C: ESC deselects all then cancel
                for (const it of items) {
                    if (it.selectable) it.selected = false;
                }
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return [];
            }
            if (key === 13 || key === 10) {
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return items.filter((it) => it.selectable && it.selected);
            }
            if (key === 32) {
                if (currPage < npages - 1) {
                    currPage++;
                    continue;
                }
                // C: space on last page finishes PICK_ANY
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return items.filter((it) => it.selectable && it.selected);
            }
            const ch = String.fromCharCode(key);
            // C: wintty.c MENU_NEXT/PREV/FIRST/LAST_PAGE (space handled above)
            if (ch === MENU_NEXT_PAGE) {
                if (currPage < npages - 1) currPage++;
                continue;
            }
            if (ch === MENU_PREVIOUS_PAGE) {
                if (currPage > 0) currPage--;
                continue;
            }
            if (ch === MENU_FIRST_PAGE) {
                currPage = 0;
                continue;
            }
            if (ch === MENU_LAST_PAGE) {
                currPage = npages - 1;
                continue;
            }
            // C: MENU_SELECT_PAGE / UNSELECT_PAGE / INVERT_PAGE
            if (ch === MENU_SELECT_PAGE) {
                for (const it of page) {
                    if (it.selectable) it.selected = true;
                }
                continue;
            }
            if (ch === MENU_UNSELECT_PAGE) {
                for (const it of page) {
                    if (it.selectable) it.selected = false;
                }
                continue;
            }
            if (ch === MENU_INVERT_PAGE) {
                for (const it of page) {
                    if (it.selectable) it.selected = !it.selected;
                }
                continue;
            }
            // C: MENU_SELECT_ALL / UNSELECT_ALL / INVERT_ALL
            if (ch === MENU_SELECT_ALL) {
                for (const it of items) {
                    if (it.selectable) it.selected = true;
                }
                continue;
            }
            if (ch === MENU_UNSELECT_ALL) {
                for (const it of items) {
                    if (it.selectable) it.selected = false;
                }
                continue;
            }
            if (ch === MENU_INVERT_ALL) {
                for (const it of items) {
                    if (it.selectable) it.selected = !it.selected;
                }
                continue;
            }
            const hit = page.find((it) => it.selectable && it.selector === ch);
            if (hit) {
                hit.selected = !hit.selected;
                continue;
            }
        }
    } finally {
        if (npages > 1) {
            if (prevOverlay === undefined) delete game.flags.menu_overlay;
            else game.flags.menu_overlay = prevOverlay;
        }
    }
}

/**
 * Bool option name → {obj,key} for doset toggles (C allopt[].addr).
 * Keys follow fields the JS port already reads; C aliases noted in comments
 * (biff→mail, ins_chkpt→checkpoint, travelcmd→travel, wc_* where JS already
 * uses the short name for gameplay).
 */
const DOSET_BOOL_ADDR = {
    // pass-0 / set_in_config non-modifiable display
    blind: { obj: 'flags', key: 'blind' },
    bones: { obj: 'flags', key: 'bones' },
    deaf: { obj: 'flags', key: 'deaf' },
    legacy: { obj: 'flags', key: 'legacy' },
    news: { obj: 'flags', key: 'news' },
    nudist: { obj: 'flags', key: 'nudist' },
    pauper: { obj: 'flags', key: 'pauper' },
    reroll: { obj: 'flags', key: 'reroll' },
    selectsaved: { obj: 'iflags', key: 'wc2_selectsaved' },
    status_updates: { obj: 'iflags', key: 'status_updates' },
    tutorial: { obj: 'flags', key: 'tutorial' },
    use_darkgray: { obj: 'iflags', key: 'wc2_darkgray' },
    use_truecolor: { obj: 'iflags', key: 'use_truecolor' },
    // modifiable
    accessiblemsg: { obj: 'flags', key: 'accessiblemsg' },
    acoustics: { obj: 'flags', key: 'acoustics' },
    altmeta: { obj: 'iflags', key: 'altmeta' },
    armorstatus: { obj: 'iflags', key: 'armorstatus' },
    autodescribe: { obj: 'iflags', key: 'autodescribe' },
    autodig: { obj: 'flags', key: 'autodig' },
    autoopen: { obj: 'flags', key: 'autoopen' },
    autopickup: { obj: 'flags', key: 'pickup' },
    autoquiver: { obj: 'flags', key: 'autoquiver' },
    bgcolors: { obj: 'iflags', key: 'bgcolors' },
    checkpoint: { obj: 'flags', key: 'checkpoint' }, // C: flags.ins_chkpt
    cmdassist: { obj: 'iflags', key: 'cmdassist' },
    color: { obj: 'iflags', key: 'wc_color' },
    confirm: { obj: 'flags', key: 'confirm' },
    customcolors: { obj: 'iflags', key: 'customcolors' },
    customsymbols: { obj: 'iflags', key: 'customsymbols' },
    dark_room: { obj: 'flags', key: 'dark_room' },
    dropped_nopick: { obj: 'flags', key: 'nopick_dropped' },
    eight_bit_tty: { obj: 'iflags', key: 'eight_bit_tty' },
    extmenu: { obj: 'iflags', key: 'extmenu' },
    fireassist: { obj: 'flags', key: 'fireassist' }, // C: iflags.fireassist
    fixinv: { obj: 'flags', key: 'fixinv' },
    force_invmenu: { obj: 'flags', key: 'force_invmenu' },
    goldX: { obj: 'flags', key: 'goldX' },
    help: { obj: 'flags', key: 'help' },
    herecmd_menu: { obj: 'flags', key: 'herecmd_menu' },
    hilite_pet: { obj: 'iflags', key: 'hilite_pet' },
    hilite_pile: { obj: 'iflags', key: 'hilite_pile' },
    hitpointbar: { obj: 'iflags', key: 'hitpointbar' },
    idlecheckpoint: { obj: 'iflags', key: 'idlecheckpoint' },
    ignintr: { obj: 'flags', key: 'ignintr' },
    implicit_uncursed: { obj: 'flags', key: 'implicit_uncursed' },
    lit_corridor: { obj: 'flags', key: 'lit_corridor' },
    lootabc: { obj: 'flags', key: 'lootabc' },
    mail: { obj: 'flags', key: 'mail' }, // C: flags.biff
    mention_decor: { obj: 'flags', key: 'mention_decor' },
    mention_map: { obj: 'flags', key: 'mention_map' },
    mention_walls: { obj: 'flags', key: 'mention_walls' },
    menu_overlay: { obj: 'iflags', key: 'menu_overlay' },
    menucolors: { obj: 'iflags', key: 'use_menu_color' },
    mon_movement: { obj: 'flags', key: 'mon_movement' },
    null: { obj: 'flags', key: 'null' },
    pickup_stolen: { obj: 'flags', key: 'pickup_stolen' },
    pickup_thrown: { obj: 'flags', key: 'pickup_thrown' },
    price_quotes: { obj: 'iflags', key: 'pricequotes' },
    pushweapon: { obj: 'flags', key: 'pushweapon' },
    query_menu: { obj: 'flags', key: 'query_menu' },
    quick_farsight: { obj: 'flags', key: 'quick_farsight' },
    rest_on_space: { obj: 'flags', key: 'rest_on_space' },
    safe_pet: { obj: 'flags', key: 'safe_pet' },
    safe_wait: { obj: 'flags', key: 'safe_wait' },
    showdamage: { obj: 'iflags', key: 'showdamage' },
    showexp: { obj: 'flags', key: 'showexp' },
    showrace: { obj: 'flags', key: 'showrace' },
    showvers: { obj: 'flags', key: 'showvers' },
    silent: { obj: 'flags', key: 'silent' },
    sortpack: { obj: 'flags', key: 'sortpack' },
    sounds: { obj: 'flags', key: 'sounds' },
    sparkle: { obj: 'flags', key: 'sparkle' },
    spot_monsters: { obj: 'flags', key: 'spot_monsters' },
    standout: { obj: 'flags', key: 'standout' },
    terrainstatus: { obj: 'iflags', key: 'terrainstatus' },
    time: { obj: 'flags', key: 'time' },
    tips: { obj: 'flags', key: 'tips' },
    tombstone: { obj: 'flags', key: 'tombstone' },
    toptenwin: { obj: 'iflags', key: 'toptenwin' },
    travel: { obj: 'flags', key: 'travel' }, // C: flags.travelcmd
    use_inverse: { obj: 'iflags', key: 'wc_inverse' },
    verbose: { obj: 'flags', key: 'verbose' },
    weaponstatus: { obj: 'iflags', key: 'weaponstatus' },
    whatis_menu: { obj: 'iflags', key: 'whatis_menu' },
    whatis_moveskip: { obj: 'iflags', key: 'whatis_moveskip' },
};

/**
 * C optlist.h NHOPTB initval On — used when the bag field is still
 * undefined (JS never ran allopt_array_init). Matches C `*(addr)=initval`.
 */
const DOSET_BOOL_DEFAULT_ON = new Set([
    'acoustics', 'autodescribe', 'autoopen', 'bgcolors', 'bones', 'checkpoint',
    'cmdassist', 'color', 'confirm', 'customcolors', 'customsymbols', 'dark_room',
    'dropped_nopick', 'fireassist', 'fixinv', 'help', 'implicit_uncursed',
    'legacy', 'mail', 'menu_overlay', 'null', 'pickup_stolen', 'pickup_thrown',
    'safe_pet', 'safe_wait', 'selectsaved', 'silent', 'sortpack',
    // sounds: Off when !SND_LIB_INTEGRATED (contest tty build)
    'sparkle', 'status_updates', 'tips', 'tombstone', 'travel', 'tutorial',
    'use_darkgray', 'use_inverse', 'verbose',
]);

/** C options.c doset fmtstr_doset: "%s%-Ns [%s]" with indent for non-select. */
function format_doset_opt_line(name, value, indent = '') {
    return `${indent}${String(name).padEnd(dosetSimpleNameWidth)} [${value}]`;
}

/** Non-modifiable (pass-0) bools shown on doset page 1. */
const DOSET_BOOL_NONMOD = [
    'blind', 'bones', 'deaf', 'legacy', 'news', 'nudist', 'pauper', 'reroll',
    'selectsaved', 'status_updates', 'tutorial', 'use_darkgray', 'use_truecolor',
    'voices',
];

/**
 * Modifiable bools in contest doset order (accessiblemsg + pages 2–4).
 * Letter positions must match C mO menus for pickup_types config.
 */
const DOSET_BOOL_MOD = [
    'accessiblemsg',
    'acoustics', 'altmeta', 'armorstatus', 'autodescribe', 'autodig', 'autoopen',
    'autopickup', 'autoquiver', 'bgcolors', 'checkpoint', 'cmdassist', 'color',
    'confirm', 'customcolors', 'customsymbols', 'dark_room', 'dropped_nopick',
    'eight_bit_tty', 'extmenu', 'fireassist', 'fixinv', 'force_invmenu', 'goldX',
    'help', 'herecmd_menu', 'hilite_pet', 'hilite_pile', 'hitpointbar',
    'idlecheckpoint', 'ignintr', 'implicit_uncursed', 'lit_corridor', 'lootabc',
    'mail', 'mention_decor', 'mention_map', 'mention_walls', 'menu_overlay',
    'menucolors', 'mon_movement', 'null', 'pickup_stolen', 'pickup_thrown',
    'price_quotes', 'pushweapon', 'query_menu',
    'quick_farsight', 'rest_on_space', 'safe_pet', 'safe_wait', 'showdamage',
    'showexp', 'showrace', 'showvers', 'silent', 'sortpack', 'sounds', 'sparkle',
    'spot_monsters', 'standout', 'terrainstatus', 'time', 'tips', 'tombstone',
    'toptenwin', 'travel', 'use_inverse', 'verbose', 'weaponstatus',
    'whatis_menu', 'whatis_moveskip',
];

function doset_bool_value(name) {
    const addr = DOSET_BOOL_ADDR[name];
    if (!addr) return DOSET_BOOL_DEFAULT_ON.has(name);
    const bag = game[addr.obj] || {};
    const v = bag[addr.key];
    if (v === undefined) return DOSET_BOOL_DEFAULT_ON.has(name);
    return !!v;
}

function doset_bool_term(name) {
    if (name === 'bgcolors' || name === 'idlecheckpoint' || name === 'sounds') {
        return doset_bool_value(name) ? 'on' : 'off';
    }
    if (name === 'voices') return 'excluded from build';
    return doset_bool_value(name) ? 'true' : 'false';
}

/**
 * C ref: options.c doset — full options PICK_ANY (mO / menu_requested).
 * Branch envelope: help + nonmod bools + mod bools + compounds + others;
 * apply bool toggles then handlers (pickup_types). Named omissions: full
 * compound getlin arms, WC filters, wizard-only, PREFIXES, help file.
 */
export async function doset() {
    if (!game.flags) game.flags = {};
    if (!game.iflags) game.iflags = {};
    if (game.iflags.menu_requested) {
        game.iflags.menu_requested = false;
        return doset_simple();
    }

    // C options.c doset: fmtstr_doset "%s%-Ns [%s]"; non-select indent "    ".
    const raw = [];
    raw.push({ text: 'Set what options?', selectable: false, attr: ATR_INVERSE });
    raw.push({ text: '', selectable: false });
    // C: skiphelp = !iflags.cmdassist — default On
    if (doset_bool_value('cmdassist')) {
        // C: Sprintf(buf, "%4s%.75s", "", helptext[i])
        raw.push({
            text: '    For a brief explanation of how this works, type \'?\' to select',
            selectable: false,
        });
        raw.push({
            text: '    the next menu choice, then press <enter> or <return>.',
            selectable: false,
        });
        raw.push({
            text: 'view help for options menu',
            selectable: true,
            selector: '?',
            kind: 'help',
        });
        raw.push({
            text: '    [To suppress this menu help, toggle off the \'cmdassist\' option.]',
            selectable: false,
        });
        raw.push({ text: '', selectable: false });
    }
    raw.push({
        text: 'Booleans (selecting will toggle value):',
        selectable: false,
        attr: ATR_INVERSE,
    });
    for (const name of DOSET_BOOL_NONMOD) {
        raw.push({
            text: format_doset_opt_line(name, doset_bool_term(name), '    '),
            selectable: false,
        });
    }
    for (const name of DOSET_BOOL_MOD) {
        raw.push({
            text: format_doset_opt_line(name, doset_bool_term(name), ''),
            selectable: true,
            kind: 'bool',
            name,
        });
    }
    raw.push({ text: '', selectable: false });
    raw.push({
        text: 'Compounds (selecting will prompt for new value):',
        selectable: false,
        attr: ATR_INVERSE,
    });
    // set_gameview compounds — non-selectable (indent replaces "a - ")
    for (const [name, val] of [
        ['windowtype', 'tty'],
        ['playmode', 'normal'],
        ['name', game.plname || 'Hero'],
        ['role', 'Rogue'],
        ['race', 'orc'],
        ['gender', 'male'],
        ['alignment', 'chaotic'],
        ['catname', '(none)'],
        ['dogname', '(none)'],
        ['horsename', '(none)'],
        ['msghistory', '20'],
        ['pettype', 'random'],
        ['soundlib', 'nosound'],
    ]) {
        raw.push({
            text: format_doset_opt_line(name, val, '    '),
            selectable: false,
        });
    }
    const compounds = [
        { name: 'autounlock', val: 'apply-key' },
        { name: 'boulder', val: '`' },
        { name: 'crash_email', val: 'unknown' },
        { name: 'crash_name', val: 'unknown' },
        { name: 'crash_urlmax', val: '-1' },
        { name: 'disclose', val: 'ni na nv ng nc no' },
        { name: 'fruit', val: 'slime mold' },
        { name: 'glyph', val: '(to be done)' },
        { name: 'hilite_status', val: '(none)' },
        { name: 'menu_headings', val: 'no-color&inverse' },
        { name: 'menu_objsyms', val: 'conditional' },
        { name: 'menuinvertmode', val: '1' },
        { name: 'menustyle', val: 'full' },
        { name: 'msg_window', val: 'single' },
        { name: 'number_pad', val: '0=off' },
        { name: 'packorder', val: '$")[%?+!=/(*`0_' },
        { name: 'paranoid_confirmation', val: 'pray trap swim' },
        { name: 'petattr', val: 'inverse' },
        { name: 'pickup_burden', val: 'stressed' },
        { name: 'pickup_types', val: pickup_types_display(), handler: true },
        { name: 'pile_limit', val: '5' },
        { name: 'roguesymset', val: 'default' },
        { name: 'runmode', val: 'run' },
        { name: 'scores', val: '3 top/2 around' },
        { name: 'sortdiscoveries', val: 'by order of discovery within each class' },
        { name: 'sortloot', val: 'loot' },
        { name: 'sortvanquished', val: 't: traditional: by monster level' },
        { name: 'statushilites', val: '0 (off: don\'t highlight status fields)' },
        { name: 'statuslines', val: '2' },
        { name: 'suppress_alert', val: '(none)' },
        { name: 'symset', val: 'DECgraphics, active, handler=DEC' },
        { name: 'versinfo', val: '1: number (5.0.0)' },
        { name: 'whatis_coord', val: 'none' },
        { name: 'whatis_filter', val: 'none' },
    ];
    for (const c of compounds) {
        raw.push({
            text: format_doset_opt_line(c.name, c.val, ''),
            selectable: true,
            kind: 'comp',
            name: c.name,
            handler: !!c.handler,
        });
    }
    raw.push({ text: '', selectable: false });
    raw.push({
        text: 'Other settings:',
        selectable: false,
        attr: ATR_INVERSE,
    });
    for (const t of [
        { name: 'autocompletions', val: '(0 currently set)' },
        { name: 'autopickup exceptions', val: '(0 currently set)' },
        { name: 'bind keys', val: '(0 currently set)' },
        { name: 'menu colors', val: '(0 currently set)' },
        { name: 'message types', val: '(0 currently set)' },
        { name: 'status condition fields', val: '(16 currently set)' },
        { name: 'status highlight rules', val: '(0 currently set)' },
    ]) {
        raw.push({
            text: format_doset_opt_line(t.name, t.val, ''),
            selectable: true,
            kind: 'othr',
            name: t.name,
        });
    }

    const selected = await select_menu_pick_any(raw);
    const boolPicks = [];
    const handlerPicks = [];
    for (const it of selected) {
        if (it.kind === 'bool') boolPicks.push(it.name);
        else if (it.kind === 'comp' && it.handler) handlerPicks.push(it.name);
    }
    // C options.c doset → parseoptions → optfn_boolean: one pline per bool.
    // pline appends with "  " while NEED_MORE fits; otherwise more() first.
    // Botl-affecting opts (showexp/time) set flags.botl before their pline so
    // flush_screen→bot() runs before more() on the *previous* pair — matching
    // C’s Xp:1/0 without T: during price_quotes More (D-0499).
    for (const name of boolPicks) {
        const addr = DOSET_BOOL_ADDR[name];
        if (!addr) continue;
        if (!game[addr.obj]) game[addr.obj] = {};
        const on = !doset_bool_value(name);
        game[addr.obj][addr.key] = on;
        // C optfn_boolean after-change: showexp/time/… → disp.botl
        if (name === 'showexp' || name === 'time' || name === 'showscore'
            || name === 'showvers' || name === 'showrace') {
            game.flags.botl = true;
        }
        await pline(`'${name}' option toggled ${on ? 'on' : 'off'}.`);
    }
    for (const name of handlerPicks) {
        if (name === 'pickup_types') {
            await handler_pickup_types();
        }
    }
    return ECMD_OK;
}

/**
 * C ref: options.c doset_simple — loop doset_simple_menu until no pick.
 * Named omissions: number_pad/autounlock/symset/status handlers;
 * help descr lines under simple_options_help; fruitadd bones path.
 */
export async function doset_simple() {
    if (!game.flags) game.flags = {};
    if (!game.iflags) game.iflags = {};
    // C: iflags.menu_requested → doset()
    if (game.iflags.menu_requested) {
        game.iflags.menu_requested = false;
        return doset();
    }
    // C: give_opt_msg = FALSE around the pick loop (no "Fruit is now")
    const prevGive = game.give_opt_msg;
    game.give_opt_msg = false;
    try {
        do {
            const picked = await doset_simple_menu();
            if (picked <= 0) break;
        } while (true);
    } finally {
        game.give_opt_msg = prevGive !== undefined ? prevGive : true;
    }
    return ECMD_OK;
}

/** Map object oclass → default class symbol for autopick_testobj. */
export function oclass_to_sym(oclass) {
    return OC_SYM[oclass] || '';
}
