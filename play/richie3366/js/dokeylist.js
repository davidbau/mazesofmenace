// dokeylist.js — Full key bindings list + menu control help text.
// C ref: cmd.c dokeylist / keylist_putcmds / show_direction_keys / key2txt;
//        options.c show_menu_controls.
//
// Builds NHW_TEXT lines from extracted extcmdlist[] + default !num_pad
// bindings (commands_init + reset_commands). rhack cmdbind_get of those
// defaults (M('?') → "?" / doextlist) is D-1643. Overlay BIND= on if/else
// keys is D-1657 (`rhack_user_overlay_key` + EXT_CMDS runners). Named
// omissions: number_pad layouts, swap_yz, rest_on_space wait binding,
// CMD_PARAM bound-key param display, overlay on walk keys.

import {
    EXTCMDLIST,
    GENERALCMD,
    WIZMODECMD,
    INTERNALCMD,
    MOVEMENTCMD,
    CMD_PARAM,
} from './generated/extcmdlist_data.js';
import {
    NHKF_ESC, NHKF_COUNT, MV_WALK, MV_RUN, MV_RUSH,
    MENU_SELECT_ALL, MENU_UNSELECT_ALL, MENU_INVERT_ALL,
    MENU_SELECT_PAGE, MENU_UNSELECT_PAGE, MENU_INVERT_PAGE,
    MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE, MENU_FIRST_PAGE, MENU_LAST_PAGE,
    MENU_SEARCH, MENU_SHIFT_RIGHT, MENU_SHIFT_LEFT,
} from './const.js';
import { game } from './gstate.js';
import {
    default_menu_cmd_info, get_menu_cmd_key, wc2_supported,
} from './options.js';

const C = (ch) => 0x1f & (typeof ch === 'string' ? ch.charCodeAt(0) : ch);
const M = (ch) => 0x80 | (typeof ch === 'string' ? ch.charCodeAt(0) : ch);
const highc = (ch) => {
    const c = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    if (c >= 0x61 && c <= 0x7a) return c - 0x20;
    return c & 0xff;
};

function fmtLeft(s, width) {
    s = String(s);
    return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function fmtRight(s, width) {
    s = String(s);
    return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

/** C ref: hacklib.c visctrl */
export function visctrl(c) {
    c = c & 0xff;
    let out = '';
    if (c & 0x80) {
        out += 'M-';
        c &= 0x7f;
    }
    if (c < 0x20) {
        out += `^${String.fromCharCode(c | 0x40)}`;
    } else if (c === 0x7f) {
        out += `^${String.fromCharCode(c & ~0x40)}`; // '?'
    } else {
        out += String.fromCharCode(c);
    }
    return out;
}

/** C ref: cmd.c key2txt */
export function key2txt(c) {
    c = c & 0xff;
    if (c === 32) return '<space>';
    if (c === 27) return '<esc>';
    if (c === 10 || c === 13) return '<enter>';
    if (c === 127) return '<del>';
    return visctrl(c);
}

const MISC_KEYS = [
    { nhkf: NHKF_ESC, desc: 'cancel current prompt or pending prefix', numpad: false },
    {
        nhkf: NHKF_COUNT,
        desc: 'Prefix: for digits when preceding a command with a count',
        numpad: true,
    },
];

// C spkeys_binds defaults used by dokeylist misc section
const SPKEYS_DEFAULT = {
    [NHKF_ESC]: 27,
    [NHKF_COUNT]: 'n'.charCodeAt(0),
};

/**
 * C ref: options.c show_menu_controls `:9080–9086` static hardcoded[].
 * Verbatim key/desc pairs; the `{ 0, 0 }` sentinel is the array end in JS.
 */
const HARDCODED_MENU = [
    { key: 'Return', desc: 'Accept current choice(s) and dismiss menu' },
    { key: 'Enter', desc: 'Same as Return' },
    { key: 'Space', desc: 'If not on last page, advance one page;' },
    { key: '     ', desc: 'when on last page, treat like Return' },
    { key: 'Escape', desc: 'Cancel menu without making any choice(s)' },
];

/** C menu key through the rebound map, printable for Sprintf. */
function menuKeyShown(ch) {
    return visctrl(get_menu_cmd_key(ch).charCodeAt(0));
}

/**
 * C ref: options.c show_menu_controls `:9070–9174` — menu control help text.
 * `lines` is the JS analogue of C `winid win` + `putstr` (consumed by
 * show_text_pages via dokeylist_lines / domenucontrols_lines); each shape
 * below mirrors the cited C Sprintf format.
 * C callers: cmd.c:2985 (dokeylist `?j`, dolist TRUE) and pager.c:2824
 * (domenucontrols `?l` via domenucontrols(), dolist FALSE).
 * @param {string[]} lines
 * @param {boolean} dolist  true = key bindings help; false = menu controls help
 */
export function show_menu_controls(lines, dolist) {
    const hasMenuShift = wc2_supported('menu_shift'); // C :9088
    lines.push('Menu control keys:'); // C :9094 putstr
    /** C `fmt`/`arg` for the trailing hardcoded loop, set per arm. */
    let fmtHard;
    let arg;
    if (dolist) { // C :9095 key bindings help ('?i')
        for (const mi of default_menu_cmd_info) { // C :9101 desc-terminated
            const ch = mi.cmd;
            if ((ch === MENU_SHIFT_RIGHT // C :9102-9104
                 || ch === MENU_SHIFT_LEFT) && !hasMenuShift)
                continue;
            lines.push( // C :9105-9108 Sprintf(buf, "%-7s %s", ...)
                `${fmtLeft(menuKeyShown(ch), 7)} ${mi.desc}`);
        }
        // C :9110-9111 no separator before hardcoded; "%s%-7s %s", arg=""
        fmtHard = (a, key, desc) => `${a}${fmtLeft(key, 7)} ${desc}`;
        arg = '';
    } else { // C :9112 menu controls help ('?k')
        lines.push(''); // C :9113
        // C :9114-9115 mc_altfmt[] "%9s  %-6s %s"
        lines.push(`${fmtRight('', 9)}  ${fmtLeft('Whole', 6)} Current`);
        lines.push(`${fmtRight('', 9)}  ${fmtLeft(' Menu', 6)}  Page`);
        // C mc_fmt[] "%8s     %-6s %s"
        const mc = (label, whole, page) =>
            `${fmtRight(label, 8)}     ${fmtLeft(whole, 6)} ${page}`;
        lines.push(mc('Select', // C :9116-9118
            menuKeyShown(MENU_SELECT_ALL), menuKeyShown(MENU_SELECT_PAGE)));
        lines.push(mc('Invert', // C :9119-9121
            menuKeyShown(MENU_INVERT_ALL), menuKeyShown(MENU_INVERT_PAGE)));
        lines.push(mc('Deselect', // C :9122-9124
            menuKeyShown(MENU_UNSELECT_ALL), menuKeyShown(MENU_UNSELECT_PAGE)));
        lines.push(''); // C :9125
        lines.push(mc('Go to', // C :9126-9128
            menuKeyShown(MENU_NEXT_PAGE), 'Next page'));
        lines.push(mc('', // C :9129-9131
            menuKeyShown(MENU_PREVIOUS_PAGE), 'Previous page'));
        lines.push(mc('', // C :9132-9134
            menuKeyShown(MENU_FIRST_PAGE), 'First page'));
        lines.push(mc('', // C :9135-9137
            menuKeyShown(MENU_LAST_PAGE), 'Last page'));
        if (hasMenuShift) { // C :9138
            lines.push(mc('Pan view', // C :9139-9141
                menuKeyShown(MENU_SHIFT_RIGHT), 'Right (perm_invent only)'));
            lines.push(mc('', // C :9142-9144
                menuKeyShown(MENU_SHIFT_LEFT), 'Left'));
        }
        lines.push(''); // C :9146
        // C typo "Exter" is intentional (upstream :9147-9149)
        lines.push(mc('Search',
            menuKeyShown(MENU_SEARCH),
            'Exter a target string and invert all matching entries'));
        lines.push(''); // C :9150-9151 separator before hardcoded
        // C :9152-9153 "%9s  %-8s %s", arg="Other "
        fmtHard = (a, key, desc) => `${fmtRight(a, 9)}  ${fmtLeft(key, 8)} ${desc}`;
        arg = 'Other ';
    }
    for (const xcp of HARDCODED_MENU) { // C :9155-9159 xcp->key sentinel
        lines.push(fmtHard(arg, xcp.key, xcp.desc));
        arg = '';
    }
}

/**
 * C ref: options.c show_menu_controls — append lines for dokeylist (?j)
 * or domenucontrols (?l). Kept name for existing callers; C-order body
 * lives in show_menu_controls above.
 * @param {string[]} lines
 * @param {boolean} dolist  true = key bindings help; false = menu controls help
 */
export function show_menu_controls_lines(lines, dolist) {
    show_menu_controls(lines, dolist);
}

/**
 * C ref: cmd.c reset_commands `:3440–3472` !num_pad — sdir `hykulnjb`
 * rebound per move mode over move_funcs rows 0..7 (cmd.c:2070–2083).
 * Index by MV_WALK/MV_RUN/MV_RUSH (hack.h movemodes: 0/1/2).
 */
const MOVE_WALK_ECNAMES = [
    'movewest', 'movenorthwest', 'movenorth', 'movenortheast',
    'moveeast', 'movesoutheast', 'movesouth', 'movesouthwest',
];
const MOVE_RUN_ECNAMES = [
    'runwest', 'runnorthwest', 'runnorth', 'runnortheast',
    'runeast', 'runsoutheast', 'runsouth', 'runsouthwest',
];
const MOVE_RUSH_ECNAMES = [
    'rushwest', 'rushnorthwest', 'rushnorth', 'rushnortheast',
    'rusheast', 'rushsoutheast', 'rushsouth', 'rushsouthwest',
];

/** Build default cmdbinds map: key → EXTCMDLIST index (!num_pad). */
function build_default_cmdbinds() {
    /** @type {(typeof EXTCMDLIST[number] | null)[]} */
    const binds = new Array(256).fill(null);
    const byTxt = new Map(EXTCMDLIST.map((e) => [e.txt, e]));

    const set = (key, entry) => {
        if (!key || !entry) return;
        binds[key & 0xff] = entry;
    };

    // commands_init: bind every extcmd default key
    for (const e of EXTCMDLIST) {
        if (e.key) set(e.key, e);
    }

    // number_pad alternate binds (always installed; movement may overwrite)
    set(C('l'), byTxt.get('redraw'));
    set('h'.charCodeAt(0), byTxt.get('help'));
    set('j'.charCodeAt(0), byTxt.get('jump'));
    set('k'.charCodeAt(0), byTxt.get('kick'));
    set('l'.charCodeAt(0), byTxt.get('loot'));
    set(C('n'), byTxt.get('annotate'));
    set('N'.charCodeAt(0), byTxt.get('name'));
    set('u'.charCodeAt(0), byTxt.get('untrap'));
    set('5'.charCodeAt(0), byTxt.get('run'));
    set(M('5'), byTxt.get('rush'));
    set('-'.charCodeAt(0), byTxt.get('fight'));
    set(M('O'), byTxt.get('overview'));
    set(M('2'), byTxt.get('twoweapon'));
    set(M('N'), byTxt.get('name'));

    // reset_commands !num_pad: sdir = "hykulnjb><" but N_DIRS=8
    // (up/down stay as extcmdlist '<' / '>' binds; not rebound here)
    const sdir = 'hykulnjb';
    for (let dir = 0; dir < 8; dir++) {
        const di = sdir.charCodeAt(dir);
        set(di, byTxt.get(MOVE_WALK_ECNAMES[dir]));
        set(highc(di), byTxt.get(MOVE_RUN_ECNAMES[dir]));
        set(C(di), byTxt.get(MOVE_RUSH_ECNAMES[dir]));
    }
    return binds;
}

/**
 * Default cmdbinds plus BIND=/BINDINGS= overlays from parsebindings.
 * C ref: cmd.c commands_init + reset_commands(!num_pad) + bind_key.
 * null overlay value is bind_key "nothing" (unbind). Named omissions:
 * number_pad/phone/swap_yz/pcHack dir layouts; rest_on_space;
 * initoptions_finish rebinding dirchars after RC (C overwrites hjkl
 * BIND=; this overlay can stick on walk keys).
 */
function cmdbinds_live() {
    const binds = build_default_cmdbinds();
    const overlay = game.Cmd?.binds;
    if (overlay instanceof Map) {
        const byTxt = new Map(EXTCMDLIST.map((e) => [e.txt.toLowerCase(), e]));
        for (const [key, name] of overlay) {
            const k = Number(key) & 0xff;
            if (!k) continue;
            if (!name) {
                binds[k] = null;
                continue;
            }
            const entry = byTxt.get(String(name).toLowerCase());
            if (entry) binds[k] = entry;
        }
    }
    return binds;
}

/**
 * C ref: cmd.c cmdbind_get `:2109–2123` — first Cmd.cmdbinds node whose
 * key matches. JS walks the default commands_init + reset_commands table
 * plus BIND= overlay (cmdbinds_live), not a linked list. key 0 is unbound.
 * @param {number} key
 * @returns {typeof EXTCMDLIST[number] | null}
 */
export function cmdbind_get(key) {
    const k = key & 0xff;
    if (!k) return null;
    return cmdbinds_live()[k] || null;
}

/**
 * C ref: cmd.c cmd_from_func — first printable bind for fn, else last
 * non-printable; skip space until last resort; skip digits and fight
 * '-' when !Cmd.num_pad. Matched here by extcmd name (tut-1 eckey),
 * not ef_funct pointer. Walks keys 0..255; list-order vs index-order
 * can differ when two non-printable keys share a command (overview).
 */
function cmd_from_func_ecname(ecname) {
    const binds = cmdbinds_live();
    const numPad = !!(game.Cmd?.num_pad);
    let ret = 0;
    for (let i = 0; i < 256; i++) {
        if (i === 32) continue;
        if (((i >= 48 && i <= 57) || (i === 45 && ecname === 'fight'))
            && !numPad) {
            continue;
        }
        if (binds[i]?.txt === ecname) {
            if (i >= 32 && i <= 126) return i;
            ret = i;
        }
    }
    if (binds[32]?.txt === ecname) return 32;
    return ret;
}

/**
 * C ref: cmd.c cmd_from_dir `:3029–3032` — key bound to the movement
 * command for DIR_ dir + MV_ mode, i.e. cmd_from_func of
 * move_funcs[dir][mode] (cmd.c:2070–2083), whose columns are
 * { do_move_*, do_run_*, do_rush_* } = { MV_WALK, MV_RUN, MV_RUSH }.
 * Out-of-range dir/mode returns 0 (C would index off the table;
 * callers only pass rn2(N_DIRS) dirs). Only live caller is the
 * debug-fuzzer randomkey (cmd.c:3563).
 * @param {number} dir
 * @param {number} mode
 * @returns {number}
 */
export function cmd_from_dir(dir, mode) {
    if (dir < 0 || dir >= 8) return 0;
    const names =
        mode === MV_WALK ? MOVE_WALK_ECNAMES
        : mode === MV_RUN ? MOVE_RUN_ECNAMES
        : mode === MV_RUSH ? MOVE_RUSH_ECNAMES
        : null;
    if (!names) return 0;
    return cmd_from_func_ecname(names[dir]);
}

/**
 * C ref: cmd.c cmd_from_ecname / nhlua.c nhl_get_cmd_key (`nh.eckey`).
 * visctrl(bound key), or `#name` if unbound, or empty if unknown.
 */
export function cmd_from_ecname(ecname) {
    if (ecname == null || ecname === '') return '';
    let found = false;
    for (const e of EXTCMDLIST) {
        if (e.txt === ecname) {
            found = true;
            break;
        }
    }
    if (!found) return '';
    const key = cmd_from_func_ecname(ecname);
    if (key) return visctrl(key);
    return `#${ecname}`;
}

function keylist_func_has_key(extcmd, skipKeys, binds) {
    for (let i = 0; i < 256; i++) {
        if (skipKeys[i]) continue;
        if (binds[i] === extcmd) return true;
    }
    return false;
}

function keylist_putcmds(lines, docount, inclFlags, exclFlags, keysUsed, binds) {
    const already = keysUsed.slice();
    let count = 0;
    for (let i = 0; i < 256; i++) {
        if (keysUsed[i]) continue;
        // rest_on_space false: skip space
        if (i === 32) continue;
        const bind = binds[i];
        if (!bind) continue;
        if ((inclFlags && !(bind.flags & inclFlags))
            || (exclFlags && (bind.flags & exclFlags))) {
            continue;
        }
        if (docount) {
            count++;
            continue;
        }
        if (bind.flags & CMD_PARAM) {
            // no bound params in default binds
            lines.push(
                `${fmtLeft(key2txt(i), 7)} ${fmtLeft(bind.txt, 13)} ${bind.desc} ""`,
            );
        } else {
            lines.push(
                `${fmtLeft(key2txt(i), 7)} ${fmtLeft(bind.txt, 13)} ${bind.desc}`,
            );
        }
        keysUsed[i] = true;
    }
    for (const extcmd of EXTCMDLIST) {
        if ((inclFlags && !(extcmd.flags & inclFlags))
            || (exclFlags && (extcmd.flags & exclFlags))) {
            continue;
        }
        if (keylist_func_has_key(extcmd, already, binds)) continue;
        if (docount) {
            count++;
            continue;
        }
        lines.push(`#${fmtLeft(extcmd.txt, 20)} ${extcmd.desc}`);
    }
    return count;
}

function show_direction_keys(lines) {
    const binds = build_default_cmdbinds();
    const find = (txt) => {
        for (let i = 0; i < 256; i++) {
            if (binds[i]?.txt === txt) {
                const t = visctrl(i);
                // prefer printable single-byte like cmd_from_func
                if (i >= 32 && i <= 126) return t;
            }
        }
        for (let i = 0; i < 256; i++) {
            if (binds[i]?.txt === txt) return visctrl(i);
        }
        return '?';
    };
    // Prefer letter keys from sdir for the grid
    const k = (name, prefer) => {
        if (prefer != null && binds[prefer]?.txt === name) return visctrl(prefer);
        return find(name);
    };
    const y = k('movenorthwest', 'y'.charCodeAt(0));
    const kk = k('movenorth', 'k'.charCodeAt(0));
    const u = k('movenortheast', 'u'.charCodeAt(0));
    const h = k('movewest', 'h'.charCodeAt(0));
    const l = k('moveeast', 'l'.charCodeAt(0));
    const b = k('movesouthwest', 'b'.charCodeAt(0));
    const j = k('movesouth', 'j'.charCodeAt(0));
    const n = k('movesoutheast', 'n'.charCodeAt(0));
    lines.push(`          ${y}  ${kk}  ${u}`);
    lines.push('           \\ | / ');
    lines.push(`          ${h}- . -${l}`);
    lines.push('           / | \\ ');
    lines.push(`          ${b}  ${j}  ${n}`);
}

/**
 * C ref: cmd.c dokeylist — Full Current Key Bindings List lines.
 */
export function dokeylist_lines() {
    const binds = build_default_cmdbinds();
    const keysUsed = new Array(256).fill(false);
    const numPad = false;

    // NO_SIGNAL: mark ^C used
    keysUsed[C('c')] = true;
    const movSeen = keysUsed.slice();

    let spkeyGap = false;
    const pfxSeen = new Array(256).fill(0);
    for (const mk of MISC_KEYS) {
        if (mk.numpad && !numPad) continue;
        const key = SPKEYS_DEFAULT[mk.nhkf] || 0;
        if (key && !movSeen[key] && !pfxSeen[key]) {
            keysUsed[key] = true;
            pfxSeen[key] = mk.nhkf + 1; // distinguish unset(0)
        } else {
            spkeyGap = true;
        }
    }

    const lines = [];
    lines.push('');
    lines.push(`${' '.repeat(7)} ${'    Full Current Key Bindings List'}`);
    for (const extcmd of EXTCMDLIST) {
        if (spkeyGap || !keylist_func_has_key(extcmd, keysUsed, binds)) {
            lines.push(`${' '.repeat(7)} ${'(also commands with no key assignment)'}`);
            break;
        }
    }

    lines.push('');
    lines.push('Directional keys:');
    show_direction_keys(lines);

    lines.push('');
    lines.push(
        'Ctrl+<direction> will run in specified direction until something very',
    );
    lines.push(`${' '.repeat(7)} ${'interesting is seen.'}`);
    lines.push(
        'Shift+<direction> will run in specified direction until you encounter',
    );
    lines.push(`${' '.repeat(7)} ${'an obstacle.'}`);

    lines.push('');
    lines.push('Miscellaneous keys:');
    for (const mk of MISC_KEYS) {
        if (mk.numpad && !numPad) continue;
        const key = SPKEYS_DEFAULT[mk.nhkf] || 0;
        if (key && !movSeen[key] && pfxSeen[key] === mk.nhkf + 1) {
            lines.push(`${fmtLeft(key2txt(key), 7)} ${mk.desc}`);
        }
    }
    // ^C interrupt (NO_SIGNAL)
    {
        const key = C('c');
        lines.push(`${fmtLeft(key2txt(key), 7)} interrupt: break out of NetHack (SIGINT)`);
    }
    if (spkeyGap) {
        for (const mk of MISC_KEYS) {
            if (mk.numpad && !numPad) continue;
            const key = SPKEYS_DEFAULT[mk.nhkf] || 0;
            if (!key || pfxSeen[key] !== mk.nhkf + 1) {
                const name = mk.nhkf === NHKF_ESC ? 'escape' : 'count';
                const label = `[${name}]`;
                lines.push(`${fmtLeft(label, 21)} ${mk.desc}`);
            }
        }
    }

    const IGNORECMD = WIZMODECMD | INTERNALCMD | MOVEMENTCMD;

    lines.push('');
    show_menu_controls_lines(lines, true);

    if (keylist_putcmds(lines, true, GENERALCMD, IGNORECMD, keysUsed.slice(), binds)) {
        lines.push('');
        lines.push('General commands:');
        keylist_putcmds(lines, false, GENERALCMD, IGNORECMD, keysUsed, binds);
    }

    if (keylist_putcmds(lines, true, 0, GENERALCMD | IGNORECMD, keysUsed.slice(), binds)) {
        lines.push('');
        lines.push('Game commands:');
        keylist_putcmds(lines, false, 0, GENERALCMD | IGNORECMD, keysUsed, binds);
    }

    const wizard = !!(game.wizard || game.flags?.debug);
    if (wizard
        && keylist_putcmds(lines, true, WIZMODECMD, INTERNALCMD, keysUsed.slice(), binds)) {
        lines.push('');
        lines.push('Debug mode commands:');
        keylist_putcmds(lines, false, WIZMODECMD, INTERNALCMD, keysUsed, binds);
    }

    return lines;
}

/**
 * C ref: pager.c domenucontrols — List menu control keys.
 */
export function domenucontrols_lines() {
    const lines = [];
    show_menu_controls_lines(lines, false);
    return lines;
}
