// @ts-nocheck
// C options.c: key-text parsing, RC bindings and number_pad's do_set/get_val
// arms. Mutable bindings remain owned by cmd_binds.js, not by an RC overlay.
import { game } from './gstate.js';
import { bind_key, bind_mousebtn, bind_specialkey, reset_commands, visctrl } from './cmd_binds.js';
import { config_error_add } from './cfgfiles.js';
import { EXTCMDLIST } from './cmd_extcmd_data.js';
import { def_char_to_objclass } from './drawing.js';
import { add_menu_cmd_alias, check_misc_menu_command, illegal_menu_cmd_key, txt2key } from './options.js'; // relocate-fns
export { default_menu_cmd_info, trimspaces }; // relocate-fns

const trimspaces = s => s.replace(/^[ \t]+|[ \t]+$/g, '');



const default_menu_cmd_info = [
    ['menu_next_page', '>'], ['menu_previous_page', '<'], ['menu_first_page', '^'],
    ['menu_last_page', '|'], ['menu_select_all', '.'], ['menu_invert_all', '@'],
    ['menu_deselect_all', '-'], ['menu_select_page', ','], ['menu_invert_page', '~'],
    ['menu_deselect_page', '\\'], ['menu_search', ':'], ['menu_shift_right', '}'], ['menu_shift_left', '{'],
];
export function set_misc_menu_command(opts, negated) {
    const i = check_misc_menu_command(opts);
    if (i < 0) return false;
    if (negated) {
        config_error_add('The %s option may not both have a value and be negated.', default_menu_cmd_info[i][0]);
    } else {
        const sep = opts.search(/[:=]/), op = sep < 0 ? '' : opts.slice(sep + 1);
        if (!op) config_error_add("Missing parameter for '%s'", opts);
        else {
            const key = txt2key(op);
            if (!illegal_menu_cmd_key(key))
                add_menu_cmd_alias(key, default_menu_cmd_info[i][1].charCodeAt(0));
        }
    }
    return true;
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

