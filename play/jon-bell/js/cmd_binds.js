// @ts-nocheck
// C v5 cmd.c: one command binding list shared by dispatch and direction lookup.
// The generated declaration-order table uses name/desc/func for C's
// ef_txt/ef_desc/ef_funct. Function identities are C symbol names, including
// aliases; these bindings do not substitute for execution of those functions.
import { visctrl } from './hacklib.js'; // C hacklib.c:532 (single definition)
export { visctrl };
import { game } from './gstate.js';
import { EXTCMDLIST } from './cmd_extcmd_data.js';
import { config_error_add } from './cfgfiles.js'; // relocate-fns
export { config_error_handler }; // relocate-fns

import { N_DIRS, N_MOVEMODES, MV_WALK, MV_RUN, MV_RUSH } from './const.js';
import { cmdbind_get, reset_commands } from './cmd.js'; // relocate-fns
export { bind_key, bind_specialkey, cmd_from_ecname, cmd_from_func, cmdbind_get, ext_func_tab_from_func, reset_commands, update_rest_on_space } from './cmd.js'; // relocate-fns
export { command_state, ensureBinds }; // relocate-fns
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
// Preserve the existing configuration-error owner. Its complete UI/lifecycle
// remains outside the qualified binding domain; valid operations need no UI.
let config_error_handler = null;
export function set_binding_config_error_handler(handler) {
    config_error_handler = handler;
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
export function reset_command_binds() {
    delete game.Cmd;
    delete game._command_binding_statics;
}
