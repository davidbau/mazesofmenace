// @ts-nocheck
// C options.c: key-text parsing, RC bindings and number_pad's do_set/get_val
// arms. Mutable bindings remain owned by cmd_binds.js, not by an RC overlay.
import { game } from './gstate.js';
import { bind_key, bind_mousebtn, bind_specialkey, reset_commands,
    config_error_add, visctrl } from './cmd_binds.js';
import { def_char_to_objclass } from './drawing.js';

// global.h's NHSTDC M(c) subtracts 128, then txt2key returns uchar.
// Unlike escapes()'s explicit OR, applying M to a high byte clears its bit.
const C = c => c & 0x1f, M = c => (c - 128) & 0xff;
const highc = c => c >= 97 && c <= 122 ? c - 32 : c;
const trimspaces = s => s.replace(/^[ \t]+|[ \t]+$/g, '');
const at = (s, i) => i < s.length ? s.charCodeAt(i) & 0xff : 0;

// options.c:6896. Result bytes include embedded NULs; txt2key consumes only
// the first byte, just as C does after escape expansion into its local buffer.
export function escapes(cp) {
    const oct = '01234567', dec = '0123456789', hexdd = '00112233445566778899aAbBcCdDeEfF';
    let tp = '', i = 0;
    while (at(cp, i)) {
        const meta = cp[i] === '\\' && (cp[i + 1] === 'm' || cp[i + 1] === 'M') && at(cp, i + 2);
        if (meta) i += 2;
        let cval = 0, dcount = 0;
        if ((cp[i] !== '\\' && cp[i] !== '^') || !at(cp, i + 1)) {
            cval = at(cp, i++);
        } else if (cp[i] === '^') {
            cval = C(at(cp, ++i));
            ++i;
        } else if (dec.includes(cp[i + 1])) {
            ++i;
            do { cval = cval * 10 + at(cp, i) - 48; }
            while (at(cp, ++i) && dec.includes(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'o' || cp[i + 1] === 'O') && at(cp, i + 2) && oct.includes(cp[i + 2])) {
            i += 2;
            do { cval = cval * 8 + at(cp, i) - 48; }
            while (at(cp, ++i) && oct.includes(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'x' || cp[i + 1] === 'X') && at(cp, i + 2) && hexdd.includes(cp[i + 2])) {
            i += 2;
            do { cval = cval * 16 + Math.trunc(hexdd.indexOf(cp[i]) / 2); }
            while (at(cp, ++i) && hexdd.includes(cp[i]) && ++dcount < 2);
        } else {
            ++i;
            switch (cp[i]) {
            case '\\': cval = 92; break;
            case 'n': cval = 10; break;
            case 't': cval = 9; break;
            case 'b': cval = 8; break;
            case 'r': cval = 13; break;
            default: cval = at(cp, i); break;
            }
            ++i;
        }
        if (meta) cval |= 0x80;
        tp += String.fromCharCode(cval & 0xff);
    }
    return tp;
}

export function txt2key(txt) {
    let makemeta = false;
    txt = trimspaces(txt.split('\0', 1)[0]);
    if (!txt) return 0;
    if (!txt[1]) return at(txt, 0);
    if (txt === '<enter>') return 10;
    if (txt === '<space>') return 32;
    if (txt === '<esc>') return 27;
    if (txt[0] === '\\') return at(escapes(txt.slice(0, 127)), 0); // QBUFSZ - 1
    if (highc(at(txt, 0)) === 77) {
        txt = txt.slice(1);
        if (txt[0] === '-' && txt[1]) txt = txt.slice(1);
        if (!txt[1]) return M(at(txt, 0));
        makemeta = true;
    }
    if (txt[0] === '^' || highc(at(txt, 0)) === 67) {
        let uc = at(txt, 0);
        if (!txt[1]) return makemeta ? M(uc) : uc;
        txt = txt.slice(1);
        if (txt[0] === '-' && txt[1]) txt = txt.slice(1);
        if (txt[0] === '?') return makemeta ? 255 : 127;
        uc = C(at(txt, 0));
        return makemeta ? M(uc) : uc;
    }
    if (makemeta && txt[0]) return M(at(txt, 0));
    if (txt[0] >= '0' && txt[0] <= '9') {
        let key = 0;
        for (let i = 0; i < 3; i++) {
            const c = at(txt, i);
            if (c < 48 || c > 57) return 0;
            key = (10 * key + c - 48) & 0xff;
        }
        return key;
    }
    return 0;
}

const default_menu_cmd_info = [
    ['menu_next_page', '>'], ['menu_previous_page', '<'], ['menu_first_page', '^'],
    ['menu_last_page', '|'], ['menu_select_all', '.'], ['menu_invert_all', '@'],
    ['menu_deselect_all', '-'], ['menu_select_page', ','], ['menu_invert_page', '~'],
    ['menu_deselect_page', '\\'], ['menu_search', ':'], ['menu_shift_right', '}'], ['menu_shift_left', '{'],
];
function illegal_menu_cmd_key(c) {
    if (!c || [13, 10, 27, 32].includes(c) || (c >= 48 && c <= 57)
        || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
        config_error_add("Reserved menu command key '%s'", visctrl(c));
        return true;
    }
    if (def_char_to_objclass(c) !== 18) {
        config_error_add("Menu command key '%s' is an object class", visctrl(c));
        return true;
    }
    return false;
}
export function add_menu_cmd_alias(from_ch, to_ch) {
    game.n_menu_mapped ??= 0;
    game.mapped_menu_cmds ??= '';
    game.mapped_menu_op ??= '';
    if (game.n_menu_mapped >= 32) {
        // C pline() can block here. This synchronous startup bridge cannot
        // yet represent that window lifecycle; do not silently drop the effect.
        throw new Error('menu-map overflow requires the startup message lifecycle');
    }
    game.mapped_menu_cmds += String.fromCharCode(from_ch & 0xff);
    game.mapped_menu_op += String.fromCharCode(to_ch & 0xff);
    ++game.n_menu_mapped;
}
export function get_menu_cmd_key(ch) {
    const index = (game.mapped_menu_op || '').indexOf(String.fromCharCode(ch & 0xff));
    return index < 0 ? ch : at(game.mapped_menu_cmds, index);
}
export function map_menu_cmd(ch) {
    const index = (game.mapped_menu_cmds || '').indexOf(String.fromCharCode(ch & 0xff));
    return index < 0 ? ch : at(game.mapped_menu_op, index);
}

// options.c:7596. Keep right-to-left recursion and C's special handling of
// a literal/escaped/quoted comma. Quoted keys still go through txt2key, whose
// C implementation does not generally accept quotes.
export function parsebindings(bindings) {
    let bind = bindings.indexOf(','), ret = true;
    if (bind >= 0) {
        if (bind === 0) bind = bindings.indexOf(',', bind + 1);
        else if (bindings[bind - 1] === '\\'
            || (bindings[bind - 1] === "'" && bindings[bind + 1] === "'"))
            bind = bindings.indexOf(',', bind + 2);
    }
    if (bind >= 0) {
        if (!parsebindings(bindings.slice(bind + 1))) ret = false;
        bindings = bindings.slice(0, bind);
    }
    bind = bindings.indexOf(':');
    if (bind < 0) return false;
    const command = trimspaces(bindings.slice(bind + 1));
    bindings = bindings.slice(0, bind);
    const mousebtn_names = ['mouse1', 'mouse2'];
    for (let i = 0; i < mousebtn_names.length; i++) {
        if (bindings !== mousebtn_names[i]) continue;
        if (!bind_mousebtn(i + 1, command)) config_error_add('Error binding mouse button %i', i + 1);
        else return ret;
    }
    const key = txt2key(bindings);
    if (!key) {
        config_error_add("Unknown key binding key '%s'", bindings);
        return false;
    }
    if (bind_specialkey(key, command)) return ret;
    for (const [name, menu_command] of default_menu_cmd_info) {
        if (command !== name) continue;
        if (illegal_menu_cmd_key(key)) {
            config_error_add('Bad menu key %s:%s', visctrl(key), command);
            return false;
        }
        add_menu_cmd_alias(key, menu_command.charCodeAt(0));
        return ret;
    }
    if (!bind_key(key, command, true)) {
        config_error_add("Unknown key binding command '%s'", command);
        return false;
    }
    return ret;
}

// The pinned LP64 libc implements atoi by saturating strtol, then narrowing
// to int. Its 64-bit intermediate needs BigInt; option storage remains Number.
function option_atoi(str) {
    const match = str.match(/^[\t\n\v\f\r ]*([+-]?[0-9]+)/);
    if (!match) return 0;
    let value = BigInt(match[1]);
    const max = (1n << 63n) - 1n, min = -(1n << 63n);
    if (value > max) value = max;
    if (value < min) value = min;
    return Number(BigInt.asIntN(32, value));
}
export function optfn_number_pad_set(opts, negated = false, initial = true) {
    const compat = opts.length <= 10, sep = opts.search(/[:=]/);
    const op = sep < 0 ? '' : opts.slice(sep + 1);
    const iflags = (game.iflags ||= {});
    if (!op) {
        if (!compat && initial) config_error_add("Missing parameter for '%s'", opts);
        if (compat || negated || initial) {
            iflags.num_pad = !negated;
            iflags.num_pad_mode = 0;
        }
    } else if (negated) {
        config_error_add('The %s option may not both have a value and be negated.', 'number_pad');
        return false;
    } else {
        const mode = option_atoi(op);
        if (mode < -1 || mode > 4 || (mode === 0 && op[0] !== '0')) {
            config_error_add("Illegal %s parameter '%s'", 'number_pad', op);
            return false;
        } else if (mode <= 0) {
            iflags.num_pad = false;
            iflags.num_pad_mode = mode < 0 ? 1 : 0;
        } else {
            iflags.num_pad = true;
            iflags.num_pad_mode = 0;
            if (mode === 2 || mode === 4) iflags.num_pad_mode |= 1;
            if (mode === 3 || mode === 4) iflags.num_pad_mode |= 2;
        }
    }
    reset_commands(false);
    // tty_number_pad(0/1) changes host keypad input encoding, not the game
    // screen. This host supplies decoded bytes; no terminal escape is needed.
    return true;
}
export function number_pad_value(config = false) {
    const cmd = game.Cmd || {};
    const index = cmd.num_pad ? (cmd.phone_layout ? (cmd.pcHack_compat ? 4 : 3)
        : (cmd.pcHack_compat ? 2 : 1)) : cmd.swap_yz ? 5 : 0;
    if (config) return String(index === 5 ? -1 : index);
    return ['0=off', '1=on', '2=on, MSDOS compatible', '3=on, phone-style layout',
        '4=on, phone layout, MSDOS compatible', '-1=off, y & z swapped'][index];
}
