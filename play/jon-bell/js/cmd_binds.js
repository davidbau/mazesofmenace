// @ts-nocheck
// C v5 cmd.c: one command binding list shared by dispatch and direction lookup.
// The generated declaration-order table uses name/desc/func for C's
// ef_txt/ef_desc/ef_funct. Function identities are C symbol names, including
// aliases; these bindings do not substitute for execution of those functions.
import { game } from './gstate.js';
import { EXTCMDLIST } from './cmd_extcmd_data.js';

const C = c => (typeof c === 'string' ? c.charCodeAt(0) : c) & 0x1f;
const M = c => (typeof c === 'string' ? c.charCodeAt(0) : c) | 0x80;
const highc = c => c >= 97 && c <= 122 ? c - 32 : c;
// C strcmpi folds ASCII letters, not Unicode compatibility characters.
const lowcase = s => s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32));
const INTERNALCMD = 0x0040, CMD_PARAM = 0x4000, MOUSECMD = 0x0800;
const N_DIRS = 8, N_MOVEMODES = 3, MV_WALK = 0, MV_RUN = 1, MV_RUSH = 2;
const MOVE_FUNCS = [
    ['do_move_west', 'do_run_west', 'do_rush_west'],
    ['do_move_northwest', 'do_run_northwest', 'do_rush_northwest'],
    ['do_move_north', 'do_run_north', 'do_rush_north'],
    ['do_move_northeast', 'do_run_northeast', 'do_rush_northeast'],
    ['do_move_east', 'do_run_east', 'do_rush_east'],
    ['do_move_southeast', 'do_run_southeast', 'do_rush_southeast'],
    ['do_move_south', 'do_run_south', 'do_rush_south'],
    ['do_move_southwest', 'do_run_southwest', 'do_rush_southwest'],
];
// Pinned v5 hack.h indices; the frozen JS enum has a different tail order.
const spkeys_binds = [
    { nhkf: 0, key: 27, name: null },
    { nhkf: 1, key: 46, name: 'getdir.self' },
    { nhkf: 2, key: 115, name: 'getdir.self2' },
    { nhkf: 3, key: 63, name: 'getdir.help' },
    { nhkf: 4, key: 95, name: 'getdir.mouse' },
    { nhkf: 5, key: 110, name: 'count' },
    { nhkf: 6, key: 64, name: 'getpos.self' },
    { nhkf: 7, key: 46, name: 'getpos.pick' },
    { nhkf: 8, key: 44, name: 'getpos.pick.quick' },
    { nhkf: 9, key: 59, name: 'getpos.pick.once' },
    { nhkf: 10, key: 58, name: 'getpos.pick.verbose' },
    { nhkf: 11, key: 36, name: 'getpos.valid' },
    { nhkf: 12, key: 35, name: 'getpos.autodescribe' },
    { nhkf: 13, key: 109, name: 'getpos.mon.next' },
    { nhkf: 14, key: 77, name: 'getpos.mon.prev' },
    { nhkf: 15, key: 111, name: 'getpos.obj.next' },
    { nhkf: 16, key: 79, name: 'getpos.obj.prev' },
    { nhkf: 17, key: 100, name: 'getpos.door.next' },
    { nhkf: 18, key: 68, name: 'getpos.door.prev' },
    { nhkf: 19, key: 120, name: 'getpos.unexplored.next' },
    { nhkf: 20, key: 88, name: 'getpos.unexplored.prev' },
    { nhkf: 23, key: 122, name: 'getpos.valid.next' },
    { nhkf: 24, key: 90, name: 'getpos.valid.prev' },
    { nhkf: 21, key: 97, name: 'getpos.all.next' },
    { nhkf: 22, key: 65, name: 'getpos.all.prev' },
    { nhkf: 25, key: 63, name: 'getpos.help' },
    { nhkf: 27, key: 34, name: 'getpos.filter' },
    { nhkf: 28, key: 42, name: 'getpos.moveskip' },
    { nhkf: 26, key: 33, name: 'getpos.menu' },
];
function command_state() {
    // C's command struct is zero-initialized, not an absent pointer. Keeping
    // it and the static backups game-owned also isolates resetGame instances.
    const cmd = (game.Cmd ||= {});
    cmd.serialno ??= 0;
    cmd.num_pad ??= false;
    cmd.pcHack_compat ??= false;
    cmd.phone_layout ??= false;
    cmd.swap_yz ??= false;
    cmd.dirchars ??= null;
    cmd.alphadirchars ??= null;
    cmd.extcmd_char ??= 0;
    cmd.cmdbinds ??= null;
    cmd.mousebtn ??= [null, null];
    cmd.spkeys ??= Array(29).fill(0);
    return cmd;
}
function binding_statics() {
    return (game._command_binding_statics ||= {
        back_dir_cmd: Array.from({ length: N_DIRS }, () => Array(N_MOVEMODES).fill(null)),
        back_dir_key: Array.from({ length: N_DIRS }, () => Array(N_MOVEMODES).fill(0)),
        backed_dir_cmd: false,
        unrestonspace: null,
    });
}
// Preserve the existing configuration-error owner. Its complete UI/lifecycle
// remains outside the qualified binding domain; valid operations need no UI.
let config_error_handler = null;
export function set_binding_config_error_handler(handler) {
    config_error_handler = handler;
}
export function config_error_add(...args) {
    if (!config_error_handler)
        throw new Error('configuration-error reporting is not initialized');
    config_error_handler(...args);
}

// C cmd.c:2109 cmdbind_get(uchar key).
export function cmdbind_get(key) {
    key &= 0xff;
    let bind = command_state().cmdbinds;
    if (!key)
        return null;
    while (bind) {
        if (bind.key === key)
            return bind;
        bind = bind.next;
    }
    return bind;
}
export function cmdbind_add(key, extcmd, user) {
    key &= 0xff;
    let bind = cmdbind_get(key);
    if (!key)
        return;
    if (!extcmd && bind) {
        cmdbind_remove(key);
        return;
    }
    if (bind) {
        bind.cmd = extcmd;
        bind.userbind = !!user;
        if (bind.param)
            bind.param = null;
        return;
    } else {
        // C allocates a NULL-command node too, if the key was absent.
        bind = { key, userbind: !!user, param: null, cmd: extcmd,
            next: command_state().cmdbinds };
        command_state().cmdbinds = bind;
    }
}
export function cmdbind_remove(key) {
    key &= 0xff;
    let bind = command_state().cmdbinds;
    let prev = null;
    while (bind) {
        if (bind.key === key) {
            if (prev)
                prev.next = bind.next;
            else
                command_state().cmdbinds = bind.next;
            // JS GC reclaims the unlinked C node and its parameter.
            return;
        }
        prev = bind;
        bind = bind.next;
    }
}
export function cmdbind_freeall() {
    const cmd = command_state();
    while (cmd.cmdbinds) {
        const next = cmd.cmdbinds.next;
        cmd.cmdbinds = next;
    }
}
export function cmdbind_swapkeys(key1, key2) {
    key1 &= 0xff;
    key2 &= 0xff;
    const bind1 = cmdbind_get(key1);
    const bind2 = cmdbind_get(key2);
    if (bind1 && bind2) {
        bind1.key = key2;
        bind2.key = key1;
    }
}
export function bind_mousebtn(btn, command) {
    const cmd = command_state();
    if (btn < 1 || btn > 2) {
        config_error_add('Wrong mouse button, valid are 1-%i', 2);
        return false;
    }
    --btn;
    if (lowcase(command) === 'nothing') {
        cmd.mousebtn[btn] = null;
        return true;
    }
    for (const extcmd of EXTCMDLIST) {
        if (lowcase(command) !== lowcase(extcmd.name))
            continue;
        if (!(extcmd.flags & MOUSECMD))
            continue;
        cmd.mousebtn[btn] = extcmd;
        return true;
    }
    return false;
}
export function bind_key(key, command, user) {
    key &= 0xff;
    if (lowcase(command) === 'nothing') {
        cmdbind_remove(key);
        return true;
    }
    let buf = command, p = null;
    const left = buf.indexOf('('), last = buf.lastIndexOf(')');
    if (left !== -1 && last !== -1 && last > left) {
        p = buf.substring(left + 1, last);
        buf = buf.substring(0, left);
    }
    for (const extcmd of EXTCMDLIST) {
        if (lowcase(buf) !== lowcase(extcmd.name))
            continue;
        if (extcmd.flags & INTERNALCMD)
            continue;
        cmdbind_add(key, extcmd, user);
        if (extcmd.flags & CMD_PARAM) {
            if (p === null) {
                config_error_add("'%s' requires a parameter", buf);
            } else {
                const bind = cmdbind_get(key);
                const maxlen = Math.min(30, p.length) + 1;
                if (maxlen <= 1)
                    config_error_add('Required parameter cannot be empty');
                else
                    bind.param = p.substring(0, maxlen - 1);
            }
        } else if (p !== null && p.length > 0) {
            config_error_add("'%s' does not take a parameter", buf);
        }
        return true;
    }
    return false;
}
export function bind_key_fn(key, fn) {
    for (const extcmd of EXTCMDLIST) {
        if (extcmd.func !== fn)
            continue;
        if (extcmd.flags & INTERNALCMD)
            continue;
        cmdbind_add(key, extcmd, false);
        return true;
    }
    return false;
}
export function commands_init() {
    for (const extcmd of EXTCMDLIST)
        if (extcmd.key)
            cmdbind_add(extcmd.key, extcmd, false);
    bind_mousebtn(1, 'therecmdmenu');
    bind_mousebtn(2, 'clicklook');
    bind_key(C('l'), 'redraw', false);
    bind_key(104, 'help', false);
    bind_key(106, 'jump', false);
    bind_key(107, 'kick', false);
    bind_key(108, 'loot', false);
    bind_key(C('n'), 'annotate', false);
    bind_key(78, 'name', false);
    bind_key(117, 'untrap', false);
    bind_key(53, 'run', false);
    bind_key(M('5'), 'rush', false);
    bind_key(45, 'fight', false);
    bind_key(M('O'), 'overview', false);
    bind_key(M('2'), 'twoweapon', false);
    bind_key(M('N'), 'name', false);
}
export function ext_func_tab_from_func(fn) {
    for (const extcmd of EXTCMDLIST)
        if (extcmd.func === fn)
            return extcmd;
    return null;
}
export function cmd_from_func(fn) {
    let ret = 0;
    const cmd = command_state();
    for (let bind = cmd.cmdbinds; bind; bind = bind.next) {
        const i = bind.key;
        if (i === 32)
            continue;
        if (((i >= 48 && i <= 57) || (i === 45 && fn === 'do_fight'))
            && !cmd.num_pad)
            continue;
        if (bind.cmd && bind.cmd.func === fn) {
            if (i >= 32 && i <= 126)
                return i;
            else
                ret = i;
        }
    }
    const bind = cmdbind_get(32);
    if (bind && bind.cmd && bind.cmd.func === fn)
        return 32;
    return ret;
}
export function bind_specialkey(key, command) {
    for (const b of spkeys_binds) {
        if (!b.name || command !== b.name)
            continue;
        command_state().spkeys[b.nhkf] = key & 0xff;
        return true;
    }
    return false;
}

// C cmd.c:3344. Backups are genuine command references, not rebuilt defaults.
export function reset_commands(initial) {
    const cmd = command_state(), saved = binding_statics();
    const { back_dir_cmd, back_dir_key } = saved;
    const sdir = 'hykulnjb><', sdir_swap_yz = 'hzkulnjb><';
    const ndir = '47896321><', ndir_phone_layout = '41236987><';
    const ylist = [121, 89, C('y'), M('y'), M('Y'), M(C('y'))];
    let flagtemp, c, updated = 0;
    if (initial) {
        updated = 1;
        cmd.num_pad = false;
        cmd.pcHack_compat = cmd.phone_layout = cmd.swap_yz = false;
        for (const b of spkeys_binds)
            cmd.spkeys[b.nhkf] = b.key;
        commands_init();
    } else {
        if (saved.backed_dir_cmd) {
            for (let dir = 0; dir < N_DIRS; dir++)
                for (let mode = 0; mode < N_MOVEMODES; mode++)
                    cmdbind_add(back_dir_key[dir][mode], back_dir_cmd[dir][mode], false);
        }
        flagtemp = !!game.iflags?.num_pad;
        if (flagtemp !== cmd.num_pad) {
            cmd.num_pad = flagtemp;
            ++updated;
        }
        flagtemp = (game.iflags?.num_pad_mode & 1) ? !cmd.num_pad : false;
        if (flagtemp !== cmd.swap_yz) {
            cmd.swap_yz = flagtemp;
            ++updated;
            for (const y of ylist) {
                c = y & 0xff;
                cmdbind_swapkeys(c, c + 1);
            }
        }
        flagtemp = (game.iflags?.num_pad_mode & 1) ? cmd.num_pad : false;
        if (flagtemp !== cmd.pcHack_compat) {
            cmd.pcHack_compat = flagtemp;
            ++updated;
            c = M('0') & 0xff;
            if (cmd.pcHack_compat)
                cmdbind_add(c, ext_func_tab_from_func('dotypeinv'), false);
            else
                cmdbind_remove(c);
        }
        flagtemp = (game.iflags?.num_pad_mode & 2) ? cmd.num_pad : false;
        if (flagtemp !== cmd.phone_layout) {
            cmd.phone_layout = flagtemp;
            ++updated;
            for (let i = 0; i < 3; i++) {
                c = 49 + i;
                cmdbind_swapkeys(c, c + 6);
                c = (M('1') & 0xff) + i;
                cmdbind_swapkeys(c, c + 6);
            }
        }
    }
    if (updated)
        cmd.serialno = (cmd.serialno + 1) >>> 0;
    cmd.dirchars = !cmd.num_pad ? (!cmd.swap_yz ? sdir : sdir_swap_yz)
        : (!cmd.phone_layout ? ndir : ndir_phone_layout);
    cmd.alphadirchars = !cmd.num_pad ? cmd.dirchars : sdir;
    for (let dir = 0; dir < N_DIRS; dir++) {
        for (let mode = MV_WALK; mode < N_MOVEMODES; mode++) {
            let di = cmd.dirchars.charCodeAt(dir);
            if (!cmd.num_pad) {
                if (mode === MV_RUN) di = highc(di);
                else if (mode === MV_RUSH) di = C(di);
            } else {
                if (mode === MV_RUN) di = M(di);
                else if (mode === MV_RUSH) di = M(di);
            }
            back_dir_key[dir][mode] = di;
            const bind = cmdbind_get(di);
            back_dir_cmd[dir][mode] = bind ? bind.cmd : null;
            cmdbind_remove(di);
        }
    }
    saved.backed_dir_cmd = true;
    for (let i = 0; i < N_DIRS; i++) {
        bind_key_fn(cmd.dirchars.charCodeAt(i), MOVE_FUNCS[i][MV_WALK]);
        if (!cmd.num_pad) {
            bind_key_fn(highc(cmd.dirchars.charCodeAt(i)), MOVE_FUNCS[i][MV_RUN]);
            bind_key_fn(C(cmd.dirchars.charCodeAt(i)), MOVE_FUNCS[i][MV_RUSH]);
        } else {
            bind_key_fn(M(cmd.dirchars.charCodeAt(i)), MOVE_FUNCS[i][MV_RUN]);
        }
    }
    update_rest_on_space();
    cmd.extcmd_char = cmd_from_func('doextcmd');
}
const restonspace = { key: 32, name: 'wait',
    desc: "rest one move via 'rest_on_space' option", func: 'donull', flags: 0x0081 };
export function update_rest_on_space() {
    const saved = binding_statics(), bind = cmdbind_get(32);
    if (bind && bind.cmd !== restonspace)
        saved.unrestonspace = bind.cmd;
    cmdbind_add(32, game.flags?.rest_on_space ? restonspace : saved.unrestonspace, false);
}

// Legacy callers can query during tutorial construction before the current
// bootstrap initializes commands. Use the real initializer and shared state.
// This adapter is not a certificate of production startup/RC ordering.
function ensureBinds() {
    if (!command_state().serialno)
        reset_commands(true);
}
export function ext_cmd_from_key(key) {
    ensureBinds();
    const bind = cmdbind_get(key);
    return bind ? bind.cmd : null;
}
export function visctrl(code) {
    let out = '', c = code & 0xff;
    if (c & 0o200) out += 'M-';
    c &= 0o177;
    if (c < 0o40) out += '^' + String.fromCharCode(c | 0o100);
    else if (c === 0o177) out += '^' + String.fromCharCode(c & ~0o100);
    else out += String.fromCharCode(c);
    return out;
}
export function cmd_from_ecname(ecname) {
    ensureBinds();
    for (const extcmd of EXTCMDLIST) {
        if (extcmd.name !== ecname) continue;
        const key = cmd_from_func(extcmd.func);
        return key ? visctrl(key) : `#${ecname}`;
    }
    return '';
}
export function reset_command_binds() {
    delete game.Cmd;
    delete game._command_binding_statics;
}
