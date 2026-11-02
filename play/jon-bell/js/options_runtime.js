// @ts-nocheck
// NetHack 5.0 options.c: shared runtime parser and boolean handler.
// Authored JS control flow; options_data.js contains only declarative C data.
// Compound handlers and the explicitly named missing display dependencies are
// NOT silently accepted. They remain failures until their actual ports land.
import { game } from './gstate.js';
import { OPTION_DEFINITIONS } from './options_data.js';
import { ECMD_OK, ECMD_FAIL, PRIMARYSET, STONE, WC_PERM_INVENT } from './const.js';
import { docrt, reglyph_darkroom, reset_glyphmap, force_more, status_reassess, use_last_flush_snapshot } from './display.js';
import { bot, check_gold_symbol } from './botl.js';
import { pline } from './pline.js';
import { vision_recalc } from './vision.js';
import { update_rest_on_space } from './cmd_binds.js';
import { classifyTerrain as classify_terrain } from './terrain-status.js';
import { parsesymbols, switch_symbols } from './symbols.js';
import { reset_customcolors } from './glyphs.js';
import { reassign, update_inventory } from './inventory_refresh.js';
import { determine_ambiguities } from './options.js'; // relocate-fns
export { determine_ambiguities, optfn_boolean, parseoptions, toggle_bool_option } from './options.js'; // relocate-fns

export const optn_silenterr = -1, optn_err = 0, optn_ok = 1;
export const do_nothing = 0, do_init = 1, do_set = 2, do_handler = 3,
    get_val = 4, get_cnf_val = 5;

// C's globals live with the game, not in module statics which survive resetGame.
// Constructing metadata must not reset option values already set at startup.
export function option_state() {
    if (!game.options_runtime) {
        const allopt = OPTION_DEFINITIONS.map((r, idx) => ({...r, idx,
            minmatch: 0, dupdetected: 0, disregarded: false, set_in_config: false}));
        game.options_runtime = {allopt, duplicate: 0, using_alias: false, give_opt_msg: true};
        determine_ambiguities(allopt);
    }
    game.go ||= {};
    return game.options_runtime;
}

export function option_value(row) {
    if (!row.addr) return null;
    let box = game;
    for (const field of row.addr.split('.')) box = box?.[field];
    // Existing startup's partial structs omit defaults. Read the declaration,
    // never overwrite a real live value during lazy metadata construction.
    return box === undefined ? row.initval : !!box;
}

export function set_option_value(row, value) {
    if (!row.addr) throw new Error(`Option '${row.name}' has no storage`);
    const fields = row.addr.split('.');
    let box = game;
    for (const field of fields.slice(0, -1)) box = (box[field] ||= {});
    box[fields.at(-1)] = !!value;
    // flag.h use_color is an alias, not an independent option.
    if (row.addr === 'iflags.wc_color') game.iflags.use_color = !!value;
}















