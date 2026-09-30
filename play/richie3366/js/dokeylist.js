// dokeylist.js — Full key bindings list + menu control help text.
// C ref: cmd.c dokeylist / keylist_putcmds / show_direction_keys / key2txt;
//        options.c show_menu_controls.
//
// Builds NHW_TEXT lines from extracted extcmdlist[] + live special keys
// (game.Cmd.spkeys) + live iflags.num_pad (dokeylist C order; spkey_name
// ported for the keyless-special arm). rhack cmdbind_get of those
// defaults (M('?') → "?" / doextlist) is D-1643. Overlay BIND= on if/else
// keys is D-1657 (`rhack_user_overlay_key` + EXT_CMDS runners). After
// `reset_commands` (D-2861), `cmdbinds_live` uses `_layoutSlots` for
// number_pad, phone, swap_yz, pcHack, and the rest_on_space clone.
// `keylist_putcmds` reads that live table (`cmdbind_get`) and
// `game.Cmd._bindParam` (set by `bind_key`; rc `parsebindings` stores it
// live too via overlay_bind_key, cut from the overlay name like C).
// rhack movement still walks letter keys rather than the slot table.

import {
    EXTCMDLIST,
    GENERALCMD,
    WIZMODECMD,
    INTERNALCMD,
    MOVEMENTCMD,
    CMD_PARAM,
} from './generated/extcmdlist_data.js';
import {
    NHKF_ESC, NHKF_COUNT, NHKF_GETDIR_SELF, NHKF_GETDIR_SELF2,
    NHKF_GETDIR_HELP, NHKF_GETDIR_MOUSE, NHKF_GETPOS_SELF, NHKF_GETPOS_PICK,
    NHKF_GETPOS_PICK_Q, NHKF_GETPOS_PICK_O, NHKF_GETPOS_PICK_V,
    NHKF_GETPOS_SHOWVALID, NHKF_GETPOS_AUTODESC, NHKF_GETPOS_MON_NEXT,
    NHKF_GETPOS_MON_PREV, NHKF_GETPOS_OBJ_NEXT, NHKF_GETPOS_OBJ_PREV,
    NHKF_GETPOS_DOOR_NEXT, NHKF_GETPOS_DOOR_PREV, NHKF_GETPOS_UNEX_NEXT,
    NHKF_GETPOS_UNEX_PREV, NHKF_GETPOS_INTERESTING_NEXT,
    NHKF_GETPOS_INTERESTING_PREV, NHKF_GETPOS_VALID_NEXT,
    NHKF_GETPOS_VALID_PREV, NHKF_GETPOS_HELP, NHKF_GETPOS_LIMITVIEW,
    NHKF_GETPOS_MOVESKIP, NHKF_GETPOS_MENU, MV_ANY, MV_WALK, MV_RUN, MV_RUSH,
    xdir, ydir, zdir, N_DIRS_Z,
    MENU_SELECT_ALL, MENU_UNSELECT_ALL, MENU_INVERT_ALL,
    MENU_SELECT_PAGE, MENU_UNSELECT_PAGE, MENU_INVERT_PAGE,
    MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE, MENU_FIRST_PAGE, MENU_LAST_PAGE,
    MENU_SEARCH, MENU_SHIFT_RIGHT, MENU_SHIFT_LEFT,
    CMD_NOT_AVAILABLE,
} from './const.js';
import { copynchars } from './hacklib.js';
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

/** C ref: cmd.c key2txt `:3225–3240` — short label for one-byte key. */
export function key2txt(c) {
    c = c & 0xff;
    if (c === 32) return '<space>'; // C `:3229` ' '
    if (c === 27) return '<esc>'; // C `:3231` '\033'
    // C `:3233` maps '\n' only; '\r' falls through to visctrl ("^M", C `:3237`).
    if (c === 10) return '<enter>';
    if (c === 127) return '<del>'; // C `:3235` '\177'
    return visctrl(c); // C `:3237` visctrl((char) c)
}

export const MISC_KEYS = [
    { nhkf: NHKF_ESC, desc: 'cancel current prompt or pending prefix', numpad: false },
    {
        nhkf: NHKF_COUNT,
        desc: 'Prefix: for digits when preceding a command with a count',
        numpad: true,
    },
];

// C spkeys_binds defaults used by dokeylist misc section; shared with
// key2extcmddesc's misc_keys loop (js/pager.js) — same C table.
export const SPKEYS_DEFAULT = {
    [NHKF_ESC]: 27,
    [NHKF_COUNT]: 'n'.charCodeAt(0),
};

/**
 * C ref: cmd.c spkeys_binds `:3161–3191` name column, in C row order.
 * `bind_specialkey` matches a BIND name against this column; `spkey_name`
 * reads it back. NHKF_ESC has no binding name (C `(char *) 0`).
 */
const SPKEY_NAMES = [
    [NHKF_ESC, null],
    [NHKF_GETDIR_SELF, 'getdir.self'],
    [NHKF_GETDIR_SELF2, 'getdir.self2'],
    [NHKF_GETDIR_HELP, 'getdir.help'],
    [NHKF_GETDIR_MOUSE, 'getdir.mouse'],
    [NHKF_COUNT, 'count'],
    [NHKF_GETPOS_SELF, 'getpos.self'],
    [NHKF_GETPOS_PICK, 'getpos.pick'],
    [NHKF_GETPOS_PICK_Q, 'getpos.pick.quick'],
    [NHKF_GETPOS_PICK_O, 'getpos.pick.once'],
    [NHKF_GETPOS_PICK_V, 'getpos.pick.verbose'],
    [NHKF_GETPOS_SHOWVALID, 'getpos.valid'],
    [NHKF_GETPOS_AUTODESC, 'getpos.autodescribe'],
    [NHKF_GETPOS_MON_NEXT, 'getpos.mon.next'],
    [NHKF_GETPOS_MON_PREV, 'getpos.mon.prev'],
    [NHKF_GETPOS_OBJ_NEXT, 'getpos.obj.next'],
    [NHKF_GETPOS_OBJ_PREV, 'getpos.obj.prev'],
    [NHKF_GETPOS_DOOR_NEXT, 'getpos.door.next'],
    [NHKF_GETPOS_DOOR_PREV, 'getpos.door.prev'],
    [NHKF_GETPOS_UNEX_NEXT, 'getpos.unexplored.next'],
    [NHKF_GETPOS_UNEX_PREV, 'getpos.unexplored.prev'],
    [NHKF_GETPOS_INTERESTING_NEXT, 'getpos.all.next'],
    [NHKF_GETPOS_INTERESTING_PREV, 'getpos.all.prev'],
    [NHKF_GETPOS_VALID_NEXT, 'getpos.valid.next'],
    [NHKF_GETPOS_VALID_PREV, 'getpos.valid.prev'],
    [NHKF_GETPOS_HELP, 'getpos.help'],
    [NHKF_GETPOS_LIMITVIEW, 'getpos.filter'],
    [NHKF_GETPOS_MOVESKIP, 'getpos.moveskip'],
    [NHKF_GETPOS_MENU, 'getpos.menu'],
];

/**
 * C ref: cmd.c spkey_name `:3208–3220` (staticfn — file-local like C).
 * Name of a special-key id, or null when the id is not bound
 * (C returns `(const char *) 0`). Sole C caller is dokeylist `:2972`
 * with misc_keys ids (NHKF_ESC → "escape", NHKF_COUNT → "count").
 * @param {number} nhkf
 * @returns {string|null}
 */
function spkey_name(nhkf) {
    let name = null; // C `:3210`
    for (let i = 0; i < SPKEY_NAMES.length; i++) { // C `:3213`
        if (SPKEY_NAMES[i][0] === nhkf) { // C `:3214`
            // C `:3215` — ESC prints "escape", never the (null) bind name.
            name = (nhkf === NHKF_ESC) ? 'escape' : SPKEY_NAMES[i][1];
            break; // C `:3216`
        }
    }
    return name; // C `:3219`
}

/**
 * C ref: cmd.c `gc.Cmd.spkeys[nhkf]` — the live special-key table
 * (`reset_commands` `:3365–3366` seeds it from spkeys_binds defaults;
 * `bind_specialkey` `:3194–3205` rebinds by name). Missing table falls
 * back to those defaults so ESC stays `\033` and count stays `n`.
 * @param {number} nhkf
 * @returns {number}
 */
function live_spkey(nhkf) {
    const v = game.Cmd?.spkeys?.[nhkf];
    if (typeof v === 'number') return v & 0xff; // C `(uchar)` cast
    return SPKEYS_DEFAULT[nhkf] || 0;
}

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
 * null overlay value is bind_key "nothing" (unbind). When
 * `game.Cmd._layoutSlots` is set (`reset_commands`), that array is the
 * base instead of the !num_pad default: a null slot is unbound, and a
 * `_nullBind` sentinel is C's null-cmd node (lookup still unbound).
 * Named omissions: until `reset_commands` runs, number_pad/phone/swap_yz/
 * pcHack layouts and the rest_on_space clone are not in this default;
 * a BIND= parsed before `number_pad` is installed onto the overlay
 * after `reset_commands` returns (jsmain), so it can mask a restored key.
 */
function cmdbinds_live() {
    const slots = game.Cmd?._layoutSlots;
    /** @type {(typeof EXTCMDLIST[number] | null)[]} */
    const binds = slots
        ? slots.map((s) => (s && !s._nullBind ? s : null))
        : build_default_cmdbinds();
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
 * C `struct Cmd_bind.param` (`func_tab.h:37`). The JS node is the extcmd
 * object itself (`cmdbind_get`), so the string lives beside it, indexed
 * by key. `bind_key` stores at most 30 characters (`cmd.c:2701–2707`).
 * `cmdbind_add` / `cmdbind_remove` clear the slot; `cmdbind_swapkeys`
 * swaps the two slots with the nodes.
 * @param {number} key
 * @returns {string|null}
 */
export function bind_param_get(key) {
    const arr = game.Cmd?._bindParam;
    if (!arr) return null;
    const p = arr[key & 0xff];
    return p ? p : null;
}

/** @param {number} key @param {string|null} param */
export function bind_param_set(key, param) {
    const k = key & 0xff;
    if (!k) return;
    if (!game.Cmd) game.Cmd = {};
    if (!game.Cmd._bindParam) game.Cmd._bindParam = new Array(256).fill(null);
    game.Cmd._bindParam[k] = param ? String(param) : null;
}

/** @param {number} key */
export function bind_param_clear(key) {
    const arr = game.Cmd?._bindParam;
    if (arr) arr[key & 0xff] = null;
}

/** @param {number} key1 @param {number} key2 */
export function bind_param_swap(key1, key2) {
    const arr = game.Cmd?._bindParam;
    if (!arr) return;
    const a = key1 & 0xff;
    const b = key2 & 0xff;
    const t = arr[a];
    arr[a] = arr[b];
    arr[b] = t;
}

/**
 * C ref: cmd.c movecmd `:3868–3898` — is `sym` bound to a move-mode
 * command? C compares the bind's `ef_funct` against `move_funcs[d][mode]`
 * (`cmd.c:2070–2083`); JS matches the bind's extcmd `txt` against the
 * hoisted per-mode name tables (`MOVE_WALK/RUN/RUSH_ECNAMES`, rows 0–7)
 * plus `down`/`up` (rows 8–9: dodown/doup). High-to-low dir scan,
 * `u.dx/dy/dz` set from the C `xdir/ydir/zdir` tables (`decl.c:77–79`),
 * `!u.dz` returned — C order kept.
 * C callers: `cmd.c:2573/2575/2577` key2extcmddesc (wired at
 * `js/pager.js` key2extcmddesc) and `:4095` getdir MV_ANY (getdir keeps
 * its inline dir-key handling, D-1038/D-2434 — not re-wired here).
 * @param {number} sym
 * @param {number} mode MV_ANY/MV_WALK/MV_RUN/MV_RUSH (`hack.h:630–637`)
 * @returns {number} 1/0
 */
export function movecmd(sym, mode) {
    let d = -1; // DIR_ERR (`hack.h:640`)
    const bind = cmdbind_get(sym);
    if (bind && bind.txt) { // C `bind && bind->cmd` (txt is ef_txt)
        const txt = bind.txt;
        if (mode === MV_ANY) { // C `:3877–3882`
            for (d = N_DIRS_Z - 1; d > -1; d--) {
                if (d < 8
                    ? (txt === MOVE_WALK_ECNAMES[d]
                        || txt === MOVE_RUN_ECNAMES[d]
                        || txt === MOVE_RUSH_ECNAMES[d])
                    : txt === (d === 8 ? 'down' : 'up')) break;
            }
        } else { // C `:3883–3887`
            const col = mode === MV_WALK ? MOVE_WALK_ECNAMES
                : mode === MV_RUN ? MOVE_RUN_ECNAMES
                : mode === MV_RUSH ? MOVE_RUSH_ECNAMES
                : null;
            if (col) {
                for (d = N_DIRS_Z - 1; d > -1; d--) {
                    if (d < 8 ? txt === col[d] : txt === (d === 8 ? 'down' : 'up')) break;
                }
            }
        }
    }
    const u = game.u || (game.u = {});
    if (d !== -1) { // C `:3890–3894`
        u.dx = xdir[d];
        u.dy = ydir[d];
        u.dz = zdir[d];
        return u.dz ? 0 : 1; // C `!u.dz`
    }
    u.dz = 0; // C `:3896–3897`
    return 0;
}

/**
 * C `ef_funct` is 1:1 with `ef_txt` on extcmdlist. Binds store the row,
 * so the JS argument is that txt (or the row). A function object has no
 * pointer identity here.
 * @param {string|{txt?: string}|null|undefined} fn
 * @returns {string}
 */
function efTxt(fn) {
    if (typeof fn === 'string') return fn;
    if (fn && typeof fn.txt === 'string') return fn.txt;
    return '';
}

/**
 * libc strncmp for the first `n` chars. A short string's NUL loses
 * to a longer one before `n` (C `strncmp`).
 * @param {string} a
 * @param {string} b
 * @param {number} n
 * @returns {number}
 */
function strncmpN(a, b, n) {
    const lim = n | 0;
    for (let i = 0; i < lim; i++) {
        const ca = i < a.length ? a.charCodeAt(i) : 0;
        const cb = i < b.length ? b.charCodeAt(i) : 0;
        if (ca !== cb) return ca < cb ? -1 : 1;
        if (ca === 0) return 0;
    }
    return 0;
}

/**
 * Newest-first key list. `game.Cmd._cmdbindOrder` is `gc.Cmd.cmdbinds`
 * (index 0 = head). BIND= rows that never went through `cmdbind_add`
 * are still prepended: Map insertion order, last key newest, matching
 * `cmdbind_add`'s prepend. No list yet → null, and the caller scans
 * 0..255 (the table before `reset_commands`).
 * @returns {number[]|null}
 */
function cmdbind_walk_keys() {
    const order = game.Cmd?._cmdbindOrder;
    const overlay = game.Cmd?.binds;
    const known = new Set(Array.isArray(order) ? order : []);
    const extra = [];
    if (overlay instanceof Map) {
        for (const [rawKey, name] of overlay) {
            const k = Number(rawKey) & 0xff;
            if (!k || !name || known.has(k)) continue;
            extra.push(k);
        }
    }
    extra.reverse(); // last BIND= is the head
    if (Array.isArray(order) && order.length) return extra.concat(order);
    if (extra.length) return extra;
    return null;
}

/**
 * C ref: cmd.c cmd_from_func `:3035–3066`.
 * Walk `gc.Cmd.cmdbinds` from the head. Skip space until the last-resort
 * `cmdbind_get(' ')` check. Skip digits, and '-' when `fn` is `do_fight`,
 * while `!Cmd.num_pad`. A printable match returns immediately. A
 * non-printable match is kept, so the oldest one wins. `do_fight` is
 * the extcmd txt `"fight"`.
 * @param {string|{txt?: string}|null|undefined} fn
 * @returns {number} key 0..255, or 0 when unbound
 */
export function cmd_from_func(fn) {
    const ecname = efTxt(fn);
    const binds = cmdbinds_live();
    const numPad = !!(game.Cmd?.num_pad); // C `gc.Cmd.num_pad`
    let ret = 0; // C `ret = '\0'`
    const order = cmdbind_walk_keys();
    const n = order ? order.length : 256;
    for (let n_i = 0; n_i < n; n_i++) {
        const i = order ? (order[n_i] & 0xff) : n_i; // C `bind = bind->next`
        if (i === 32) continue; // C `i == ' '`
        if (((i >= 48 && i <= 57) || (i === 45 && ecname === 'fight'))
            && !numPad) {
            continue;
        }
        if (binds[i]?.txt === ecname) { // C `bind->cmd->ef_funct == fn`
            if (i >= 32 && i <= 126) return i; // C `' '` .. `'~'`
            ret = i;
        }
    }
    if (binds[32]?.txt === ecname) return 32; // C `cmdbind_get(' ')`
    return ret;
}

/** Same walk; callers that already pass an extcmd txt. */
function cmd_from_func_ecname(ecname) {
    return cmd_from_func(ecname);
}

/**
 * C ref: cmd.c cmdname_from_func `:3105–3155`.
 * `fullname` copies the whole `ef_txt`. Otherwise the shortest leading
 * substring that no other available command shares. `outbuf` is the
 * returned string (C writes the caller buffer and returns it). Not
 * found returns null and would have cleared `outbuf[0]`.
 * `wizard` is `flags.debug` (`flag.h:30`). `Strlen`'s huge-string panic
 * is not needed for extcmd names.
 * `debugpline2` (`lint.h` `ifdebug(pline)`) runs only on the short-name
 * arm when `debugcore` (`files.c:3126`) is true. That function is not
 * in JS; empty `sysopt.debugfiles` makes it a no-op, so this does not
 * pline.
 * @param {string|{txt?: string}|null|undefined} fn
 * @param {boolean} fullname
 * @returns {string|null}
 */
export function cmdname_from_func(fn, fullname) {
    const want = efTxt(fn);
    let cmdIdx = -1;
    let res = null;
    for (let i = 0; i < EXTCMDLIST.length; i++) { // C `extcmd->ef_txt`
        const extcmd = EXTCMDLIST[i];
        if (!extcmd.txt) break;
        if (extcmd.txt === want) { // C `ef_funct == fn`
            cmdIdx = i;
            res = extcmd.txt;
            break;
        }
    }
    if (res == null) return null; // C `outbuf[0] = '\0'; return Null`
    if (fullname) return res; // C `strcpy(outbuf, res)`

    const wizard = !!(game.flags && game.flags.debug);
    let matchIdx = 0;
    let len = 0;
    const maxlen = res.length; // C `Strlen(res)`
    let extIdx = 0;
    do {
        if (++len >= maxlen) break;
        for (extIdx = matchIdx; extIdx < EXTCMDLIST.length; extIdx++) {
            const extcmd = EXTCMDLIST[extIdx];
            if (!extcmd.txt) break;
            if (extIdx === cmdIdx) continue;
            if ((extcmd.flags & CMD_NOT_AVAILABLE) !== 0) continue;
            if ((extcmd.flags & WIZMODECMD) !== 0 && !wizard) continue;
            if (strncmpN(res, extcmd.txt, len) === 0) {
                matchIdx = extIdx;
                break;
            }
        }
    } while (extIdx < EXTCMDLIST.length && EXTCMDLIST[extIdx].txt);
    return copynchars(res, len);
}

/**
 * C ref: cmd.c unavailcmd `:157` — "Unavailable command '%s'." format for
 * wizard-only commands run by a non-wizard (wizcmds.c else arms).
 */
export const UNAVAILCMD = "Unavailable command '%s'.";

/**
 * C ref: cmd.c ecname_from_fn `:3091–3102` — scan extcmdlist[] for
 * ef_funct == fn, return ef_txt (null ≡ (char *) 0 when absent). The
 * generated table carries key/txt/desc/flags only (no funct pointers),
 * so the match is on the extcmd txt (efTxt idiom — cmdname_from_func
 * above maps `ef_funct == fn` the same way).
 * @param {string|{txt?: string}|null|undefined} fn
 * @returns {string|null}
 */
export function ecname_from_fn(fn) {
    const want = efTxt(fn);
    for (let i = 0; i < EXTCMDLIST.length; i++) { // C `extcmd->ef_txt`
        const extcmd = EXTCMDLIST[i];
        if (!extcmd.txt) break;
        if (extcmd.txt === want) return extcmd.txt; // C `ef_funct == fn`
    }
    return null;
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

/**
 * C ref: cmd.c keylist_func_has_key `:2784–2799`.
 * Skip keys already claimed, then `cmdbind_get(i)->cmd == extcmd`.
 * JS `cmdbind_get` returns that cmd (null when unbound or cmd is null).
 * @param {typeof EXTCMDLIST[number]} extcmd
 * @param {boolean[]} skipKeysUsed snapshot from before this listing
 * @returns {boolean}
 */
function keylist_func_has_key(extcmd, skipKeysUsed) {
    for (let i = 0; i < 256; i++) { // C `:2791`
        if (skipKeysUsed[i]) continue; // C `:2792–2793`
        const cmd = cmdbind_get(i); // C `:2795` bind = cmdbind_get(i)
        if (cmd && cmd === extcmd) return true; // C `:2795` bind->cmd == extcmd
    }
    return false; // C `:2797`
}

/**
 * C ref: cmd.c keylist_putcmds `:2802–2863`.
 * `lines` is the NHW_TEXT sink (`putstr(datawin, 0, buf)` — dokeylist
 * collects lines for `show_text_pages`). Live binds via `cmdbind_get`,
 * not a caller-supplied default table. Space is skipped only when
 * `!flags.rest_on_space` (`:2818`). `CMD_PARAM` prints `bind->param`
 * (`:2830–2833`); an unset param is an empty string (C would pass NULL
 * to `%s` only when `bind_key` never stored one).
 * @param {string[]} lines
 * @param {boolean} docount
 * @param {number} inclFlags
 * @param {number} exclFlags
 * @param {boolean[]} keysUsed mutated when listing (not when counting)
 * @returns {number}
 */
function keylist_putcmds(lines, docount, inclFlags, exclFlags, keysUsed) {
    const keysAlreadyUsed = new Array(256); // C `:2810` copy before updates
    let count = 0; // C `:2811`
    for (let i = 0; i < 256; i++) { // C `:2814`
        const key = i & 0xff; // C `:2815` uchar key
        keysAlreadyUsed[i] = !!keysUsed[i]; // C `:2817`
        if (keysUsed[i]) continue; // C `:2818–2819`
        if (key === 32 && !game.flags?.rest_on_space) continue; // C `:2820–2821`
        const cmd = cmdbind_get(key); // C `:2822` bind = cmdbind_get; JS returns bind->cmd
        if (cmd) { // C `:2823` bind && bind->cmd
            const flags = cmd.flags | 0;
            if ((inclFlags && !(flags & inclFlags))
                || (exclFlags && (flags & exclFlags))) {
                continue; // C `:2824–2826`
            }
            if (docount) { // C `:2827`
                count++;
                continue;
            }
            const keyTxt = key2txt(key); // C key2txt(key, buf2)
            if ((flags & CMD_PARAM) !== 0) { // C `:2830`
                const param = bind_param_get(key) ?? ''; // C `:2833` bind->param
                lines.push(
                    `${fmtLeft(keyTxt, 7)} ${fmtLeft(cmd.txt, 13)} ${cmd.desc} "${param}"`,
                ); // C `:2831–2833` putstr
            } else {
                lines.push(
                    `${fmtLeft(keyTxt, 7)} ${fmtLeft(cmd.txt, 13)} ${cmd.desc}`,
                ); // C `:2835–2836`
            }
            keysUsed[i] = true; // C `:2838`
        }
    }
    // C `:2840` commands that lack a key assignment
    for (const extcmd of EXTCMDLIST) { // C `:2841` extcmd->ef_txt
        if (!extcmd.txt) break;
        const flags = extcmd.flags | 0;
        if ((inclFlags && !(flags & inclFlags))
            || (exclFlags && (flags & exclFlags))) {
            continue; // C `:2842–2844`
        }
        if (keylist_func_has_key(extcmd, keysAlreadyUsed)) continue; // C `:2850`
        if (docount) { // C `:2853`
            count++;
            continue;
        }
        // C `:2858` "#%-20s %s"
        lines.push(`#${fmtLeft(extcmd.txt, 20)} ${extcmd.desc}`);
    }
    return count; // C `:2862`
}

/**
 * C ref: cmd.c show_direction_keys `:4122–4165` (staticfn).
 * `lines` is the NHW_TEXT window: each push is `putstr(win, 0, buf)`.
 * `centerchar` 0 becomes ' ' (`:4129–4130`). `nodiag` is the cardinal
 * grid (`NODIAG` / grid bug); otherwise the eight-way grid.
 * Each label is `visctrl(cmd_from_func(do_move_*))` (`:4134–4161`).
 * The extcmd txt is that function's `ef_txt` (move_funcs column 0).
 * @param {string[]} lines
 * @param {string|number} centerchar
 * @param {boolean} nodiag
 */
export function show_direction_keys(lines, centerchar, nodiag) {
    // C `:4129–4130` — '\0' is the only falsy char; ' ' stays.
    if (!centerchar) centerchar = ' ';
    else if (typeof centerchar === 'number') {
        centerchar = String.fromCharCode(centerchar & 0xff);
    }
    // C `:4134` / `:4138` / … visctrl(cmd_from_func(do_move_*)).
    const vk = (ecname) => visctrl(cmd_from_func(ecname));
    if (nodiag) {
        // C `:4132–4145` cardinal-only.
        lines.push(`             ${vk('movenorth')}   `); // do_move_north
        lines.push('             |   ');
        lines.push(`          ${vk('movewest')}- ${centerchar} -${vk('moveeast')}`);
        lines.push('             |   ');
        lines.push(`             ${vk('movesouth')}   `); // do_move_south
    } else {
        // C `:4146–4164` eight-way. Sprintf arg order is the putstr order.
        lines.push(`          ${vk('movenorthwest')}  ${vk('movenorth')}  ${vk('movenortheast')}`);
        lines.push('           \\ | / ');
        lines.push(`          ${vk('movewest')}- ${centerchar} -${vk('moveeast')}`);
        lines.push('           / | \\ ');
        lines.push(`          ${vk('movesouthwest')}  ${vk('movesouth')}  ${vk('movesoutheast')}`);
    }
}

/**
 * C ref: cmd.c dokeylist `:2867–3013` — Full Current Key Bindings List lines.
 * `lines` replaces the NHW_TEXT window (each push is `putstr(datawin, 0,
 * buf)`); the ?j help-menu caller (pager.js) displays via show_text_pages,
 * which is C `:3010–3011` display_nhwindow(datawin, FALSE) + destroy.
 * Special keys read live `gc.Cmd.spkeys` via live_spkey; the num_pad arms
 * follow live `iflags.num_pad`. Unix build: NO_SIGNAL is not defined, so
 * ^C is pre-marked used (`:2884`) and prints as a bound key (`:2955`).
 */
export function dokeylist_lines() {
    // C `:2876–2877` memsets.
    const keysUsed = new Array(256).fill(false);
    const pfxSeen = new Array(256).fill(0);
    const numPad = !!(game.iflags && game.iflags.num_pad); // C `iflags.num_pad`

    // C `:2884` (#ifndef NO_SIGNAL) — tty raw mode owns SIGINT.
    keysUsed[C('c')] = true;
    // C `:2888` — movement keys have been flagged in keys_used[]; clone them.
    const movSeen = keysUsed.slice();

    // C `:2891–2902` misc_keys prefix scan.
    let spkeyGap = false; // C `:2891`
    for (const mk of MISC_KEYS) {
        if (mk.numpad && !numPad) continue; // C `:2892`
        const key = live_spkey(mk.nhkf); // C `:2894` gc.Cmd.spkeys[j]
        if (key && !movSeen[key] && !pfxSeen[key]) { // C `:2895`
            keysUsed[key] = true; // C `:2896`
            // +1: C stores nhkf `j` (`:2897`) where 0 means unset; JS
            // NHKF_ESC is 0, so the sentinel must not collide with it.
            pfxSeen[key] = mk.nhkf + 1;
        } else {
            spkeyGap = true; // C `:2900`
        }
    }

    const lines = [];
    // C `:2904` create_nhwindow(NHW_TEXT) is the `lines` sink itself.
    lines.push(''); // C `:2905`
    // C `:2906` Sprintf "%7s %s".
    lines.push(`${' '.repeat(7)} ${'    Full Current Key Bindings List'}`);
    // C `:2908–2914` — any keyless command forces the "(also ...)" header.
    for (const extcmd of EXTCMDLIST) { // C `:2908` extcmd->ef_txt
        if (!extcmd.txt) break;
        if (spkeyGap || !keylist_func_has_key(extcmd, keysUsed)) { // C `:2909`
            // C `:2910–2911` Sprintf "%7s %s".
            lines.push(`${' '.repeat(7)} ${'(also commands with no key assignment)'}`);
            break; // C `:2912`
        }
    }

    /* directional keys */ // C `:2916`
    lines.push(''); // C `:2917`
    lines.push('Directional keys:'); // C `:2918`
    // C `:2919` show_direction_keys(datawin, '.', FALSE); '.'==self.
    show_direction_keys(lines, '.', false);

    let runPrefix; // C `:2927/:2932` Strcpy(buf, "Shift"/"Meta")
    if (!numPad) { // C `:2921`
        lines.push(''); // C `:2922`
        lines.push( // C `:2923–2924`
            'Ctrl+<direction> will run in specified direction until something very',
        );
        // C `:2925` Sprintf "%7s %s".
        lines.push(`${' '.repeat(7)} ${'interesting is seen.'}`);
        runPrefix = 'Shift'; // C `:2926` — append the rest below
    } else {
        /* num_pad */ // C `:2928`
        lines.push(''); // C `:2929`
        runPrefix = 'Meta'; // C `:2930` — append the rest next
    }
    // C `:2931–2932` Strcat "+<direction> will run ... until you encounter".
    lines.push(
        `${runPrefix}+<direction> will run in specified direction until you encounter`,
    );
    // C `:2933` Sprintf "%7s %s".
    lines.push(`${' '.repeat(7)} ${'an obstacle.'}`);

    lines.push(''); // C `:2935`
    lines.push('Miscellaneous keys:'); // C `:2936`
    // C `:2937–2948` bound special keys.
    for (const mk of MISC_KEYS) {
        if (mk.numpad && !numPad) continue; // C `:2938`
        const key = live_spkey(mk.nhkf); // C `:2940–2941`
        if (key && !movSeen[key] && pfxSeen[key] === mk.nhkf + 1) { // C `:2942–2943`
            // C `:2944` Sprintf "%-7s %s".
            lines.push(`${fmtLeft(key2txt(key), 7)} ${mk.desc}`);
        }
    }
    /* (see above) */ // C `:2950`
    { // C `:2951` key = C('c')
        // C `:2955` (#ifndef NO_SIGNAL) — last of the special keys.
        // (#else `:2957–2958` would print "[key]" 21-wide as the first of
        // the keyless commands; not compiled — see fn doc.)
        const key = C('c');
        // C `:2955` Sprintf "%-7s", then `:2960` Strcat " interrupt: ...".
        lines.push(`${fmtLeft(key2txt(key), 7)} interrupt: break out of NetHack (SIGINT)`);
    }
    /* keyless special key commands, if any */ // C `:2962`
    if (spkeyGap) { // C `:2963`
        for (const mk of MISC_KEYS) { // C `:2964`
            if (mk.numpad && !numPad) continue; // C `:2965`
            const key = live_spkey(mk.nhkf); // C `:2967`
            if (!key || pfxSeen[key] !== mk.nhkf + 1) { // C `:2968`
                // C `:2969` Sprintf "[%s]", spkey_name(j).
                const label = `[${spkey_name(mk.nhkf) ?? ''}]`;
                /* lines up with the other unassigned commands which use
                   "#%-20s ", but not with the other special keys */ // C `:2970–2971`
                // C `:2972` Snprintf "%-21s %s".
                lines.push(`${fmtLeft(label, 21)} ${mk.desc}`);
            }
        }
    }

    const IGNORECMD = WIZMODECMD | INTERNALCMD | MOVEMENTCMD; // C `:2982`

    lines.push(''); // C `:2984`
    show_menu_controls(lines, true); // C `:2985` show_menu_controls(datawin, TRUE)

    // C `:2987–3011` — same keys_used array; docount does not write it.
    if (keylist_putcmds(lines, true, GENERALCMD, IGNORECMD, keysUsed)) { // C `:2987`
        lines.push(''); // C `:2988`
        lines.push('General commands:'); // C `:2989`
        keylist_putcmds(lines, false, GENERALCMD, IGNORECMD, keysUsed); // C `:2990–2991`
    }

    if (keylist_putcmds(lines, true, 0, GENERALCMD | IGNORECMD, keysUsed)) { // C `:2994`
        lines.push(''); // C `:2995`
        lines.push('Game commands:'); // C `:2996`
        keylist_putcmds(lines, false, 0, GENERALCMD | IGNORECMD, keysUsed); // C `:2997–2998`
    }

    const wizard = !!(game.wizard || game.flags?.debug); // C `:3002` wizard
    if (wizard
        && keylist_putcmds(lines, true, WIZMODECMD, INTERNALCMD, keysUsed)) {
        lines.push(''); // C `:3003`
        lines.push('Debug mode commands:'); // C `:3004`
        keylist_putcmds(lines, false, WIZMODECMD, INTERNALCMD, keysUsed); // C `:3005–3006`
    }

    // C `:3010–3011` display_nhwindow(datawin, FALSE) + destroy_nhwindow —
    // the pager.js ?j caller shows these lines via show_text_pages.
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
