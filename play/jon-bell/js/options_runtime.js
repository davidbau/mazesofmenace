// @ts-nocheck
// NetHack 5.0 options.c: shared runtime parser and boolean handler.
// Authored JS control flow; options_data.js contains only declarative C data.
// Compound handlers and the explicitly named missing display dependencies are
// NOT silently accepted. They remain failures until their actual ports land.
import { game } from './gstate.js';
import { OPTION_DEFINITIONS } from './options_data.js';
import { ECMD_OK, ECMD_FAIL, PRIMARYSET, STONE, WC_PERM_INVENT } from './const.js';
import { pline, bot, docrt, reglyph_darkroom, check_gold_symbol } from './display.js';
import { vision_recalc } from './vision.js';
import { update_rest_on_space } from './cmd_binds.js';
import { classifyTerrain as classify_terrain } from './terrain-status.js';
import { parsesymbols, switch_symbols } from './symbols.js';
import { reset_customcolors } from './glyphs.js';
import { reassign, update_inventory } from './inventory_refresh.js';

export const optn_silenterr = -1, optn_err = 0, optn_ok = 1;
export const do_nothing = 0, do_init = 1, do_set = 2, do_handler = 3,
    get_val = 4, get_cnf_val = 5;
const empty_optstr = '';
const ATR_INVERSE = 7; // C wintype.h enum, NOT terminal.js's output bitmask.
const whitespace = c => /[\t\n\v\f\r ]/.test(c);
const prefix = (a, b, n) => a.slice(0, n).toLowerCase() === b.slice(0, n).toLowerCase();

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

// options.c:6703. The sentinel is not stored in the JS array.
export function determine_ambiguities(allopt) {
    const needed = Array(allopt.length).fill(0);
    for (let i = 0; i < allopt.length; ++i) {
        for (let j = 0; j < allopt.length; ++j) {
            if (j === i) continue;
            const p1 = allopt[i].name, p2 = allopt[j].name;
            let tmpneeded = 1, k = 0;
            while (k < p1.length && k < p2.length && prefix(p1[k], p2[k], 1)) {
                ++tmpneeded; ++k;
            }
            needed[i] = Math.max(needed[i], tmpneeded);
            needed[j] = Math.max(needed[j], tmpneeded);
        }
    }
    for (let i = 0; i < allopt.length; ++i)
        allopt[i].minmatch = needed[i] < 3 ? 3 : Math.min(needed[i], allopt[i].name.length);
}

export function length_without_val(user_string, len = user_string.length) {
    let p = user_string.indexOf(':'), q = user_string.indexOf('=');
    if (p < 0 || (q >= 0 && q < p)) p = q;
    if (p >= 0) {
        while (p > 0 && whitespace(user_string[p - 1])) --p;
        len = p;
    }
    return len;
}

export function match_optname(user_string, optn_name, min_length, val_allowed) {
    const len = val_allowed ? length_without_val(user_string) : user_string.length;
    return len >= min_length && prefix(optn_name, user_string, len);
}

export async function string_for_opt(opts, val_optional) {
    let colon = opts.indexOf(':'), equals = opts.indexOf('=');
    if (colon < 0 || (equals >= 0 && equals < colon)) colon = equals;
    if (colon < 0 || colon + 1 === opts.length) {
        if (!val_optional) await option_error(`Missing parameter for '${opts}'`);
        return empty_optstr;
    }
    return opts.slice(colon + 1);
}

// cfgfiles.c:config_erradd's no-frame arm. The complete config-frame/Lua
// lifecycle is still a separate port, not a successful no-op here.
async function option_error(message) {
    if (game.program_state.config_error_ready)
        throw new Error('Unported option dependency: config_erradd with active config frame');
    const punct = /[.!?]$/.test(message) ? '' : '.';
    await pline(`${game.iflags.window_inited ? '' : 'config_error_add: '}${message}${punct}`);
    // tty_wait_synch is fflush(stdout), without a game/input effect.
}

export function reset_duplicate_opt_detection() {
    for (const row of option_state().allopt) row.dupdetected = 0;
}

function duplicate_opt_detection(optidx) {
    const row = option_state().allopt[optidx];
    if (game.go.opt_initial && game.go.opt_from_file) {
        const previous = row.dupdetected;
        row.dupdetected = ((previous + 1) << 24) >> 24; // C schar counter.
        return previous;
    }
    return 0;
}

async function complain_about_duplicate(optidx) {
    const state = option_state(), row = state.allopt[optidx];
    await option_error(`${row.type === 'C' ? 'compound' : 'boolean'} option specified multiple times: ${row.name}`
        + (state.using_alias ? ` (via alias: ${row.alias})` : ''));
}

// options.c:489. Keep the recursive order and even C's early-return
// in_parseoptions leak on bad negation: caller-visible state is part of parity.
export async function parseoptions(opts, tinitial, tfrom_file) {
    const state = option_state(), allopt = state.allopt, go = game.go;
    let got_match = false, pfx_match = false, matchidx = -1, optresult = optn_err;
    let retval = true;
    state.duplicate = 0;
    state.using_alias = false;
    go.opt_initial = !!tinitial;
    go.opt_from_file = !!tfrom_file;
    const comma = opts.indexOf(',');
    if (tinitial && comma >= 0) {
        const rest = opts.slice(comma + 1);
        opts = opts.slice(0, comma);
        if (!await parseoptions(rest, go.opt_initial, go.opt_from_file)) retval = false;
    }
    if (opts.length > 128) {
        await option_error('Option too long, max length is 128 characters');
        return false;
    }
    opts = opts.replace(/^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g, '');
    if (!opts) {
        await option_error('Empty statement');
        return false;
    }
    let negated = false;
    while (opts[0] === '!' || prefix(opts, 'no', 2)) {
        opts = opts.slice(opts[0] === '!' ? 1 : opts[2] !== '-' ? 2 : 3);
        negated = !negated;
    }
    const optlen = length_without_val(opts);
    for (let i = 0; i < allopt.length; ++i) {
        got_match = false;
        if (allopt[i].pfx && prefix(opts, allopt[i].name, allopt[i].name.length)) {
            matchidx = i;
            got_match = pfx_match = true;
        }
        if (!got_match && allopt[i].name)
            got_match = match_optname(opts, allopt[i].name, allopt[i].minmatch, true);
        if (got_match) {
            if (!allopt[i].pfx && optlen < allopt[i].minmatch) {
                await option_error(`Ambiguous option ${opts}, ${allopt[i].minmatch} characters are needed to differentiate`);
                break;
            }
            matchidx = i;
            break;
        }
    }
    if (!got_match) {
        for (let i = 0; i < allopt.length; ++i) {
            if (!allopt[i].alias) continue;
            got_match = match_optname(opts, allopt[i].alias, allopt[i].alias.length, true);
            if (got_match) { matchidx = i; state.using_alias = true; break; }
        }
    }
    ++game.program_state.in_parseoptions;
    if (got_match && matchidx >= 0 && matchidx < allopt.length && !allopt[matchidx].disregarded) {
        const row = allopt[matchidx];
        state.duplicate = duplicate_opt_detection(matchidx);
        if (state.duplicate && !row.dupeok) await complain_about_duplicate(matchidx);
        if (negated && !row.negateok) {
            await option_error(`The ${row.name} option may not both have a value and be negated.`);
            return optn_err;
        }
        const op = await string_for_opt(opts, true);
        if (row.handler !== 'optfn_boolean')
            throw new Error(`Unported shared option handler: ${row.handler}`);
        optresult = await optfn_boolean(row.idx, do_set, negated, opts, op);
        if (optresult === optn_ok) row.set_in_config = true;
    }
    if (game.program_state.in_parseoptions > 0) --game.program_state.in_parseoptions;
    if (!got_match && opts.startsWith('S_') && parsesymbols(opts, PRIMARYSET)) {
        switch_symbols(true);
        check_gold_symbol();
        optresult = optn_ok;
    }
    if (optresult === optn_silenterr || (got_match && allopt[matchidx].disregarded)
        || (!got_match && game.ignore_errors_on_unmatched)) return false;
    if (pfx_match && optresult === optn_err) {
        await option_error(`bad option suffix variation '${opts.split(':')[0]}'`);
        return false;
    }
    if (got_match && optresult === optn_err) return false;
    if (optresult === optn_ok) return retval;
    await option_error(`Unknown option '${opts}'`);
    return false;
}

function missing(name) { throw new Error(`Unported option dependency: ${name}`); }

// options.c:5192, with tty build conditionals resolved as in options_data.js.
export async function optfn_boolean(optidx, req, negated, opts, op) {
    const state = option_state(), row = state.allopt[optidx], go = game.go;
    const flags = game.flags, iflags = game.iflags;
    if (req === do_init) return optn_ok;
    if (req === do_set) {
        let nosexchange = false, ln = 0;
        if (!row.addr) return optn_ok;
        if (!go.opt_initial && row.setwhere === 'set_in_config') return optn_err;
        if (go.opt_initial && row.setwhere === 'set_wiznofuz') return optn_err;
        op = await string_for_opt(opts, true);
        if (op !== empty_optstr) {
            if (negated) {
                await option_error(`Negated boolean '${row.name}' should not have a parameter`);
                return optn_silenterr;
            }
            ln = op.length;
            const digit = /^[0-9]/.test(op), number = Number.parseInt(op, 10);
            if (prefix(op, 'true', ln) || prefix(op, 'yes', ln) || op.toLowerCase() === 'on' || (digit && number === 1))
                negated = false;
            else if (prefix(op, 'false', ln) || prefix(op, 'no', ln) || op.toLowerCase() === 'off' || (digit && number === 0))
                negated = true;
            else if (!row.valok) {
                await option_error(`'${opts}' is not valid for a boolean`);
                return optn_silenterr;
            }
        }
        if (iflags.debug_fuzzer && !go.opt_initial && ['silent', 'perm_invent'].includes(row.name)) return optn_ok;
        switch (row.name) {
        case 'female':
            if (prefix(opts, 'female', Math.max(ln, 3))) {
                if (!go.opt_initial && !!flags.female === !!negated) nosexchange = true;
                else { flags.initgend = Number(flags.female = !negated); return optn_ok; }
            }
            if (prefix(opts, 'male', Math.max(ln, 3))) {
                if (!go.opt_initial && !!flags.female !== !!negated) nosexchange = true;
                else { flags.initgend = Number(flags.female = !!negated); return optn_ok; }
            }
            break;
        case 'perm_invent':
            if (!negated && !go.opt_initial && !can_set_perm_invent()) return optn_silenterr;
            break;
        }
        if (nosexchange) {
            await option_error(`'${opts}' is not anatomically possible.`);
            return optn_silenterr;
        }
        set_option_value(row, !negated);
        switch (row.name) {
        case 'pauper': game.u.uroleplay.nudist = game.u.uroleplay.pauper; break;
        case 'ascii_map': iflags.wc_tiled_map = !!negated; break;
        case 'tiled_map': iflags.wc_ascii_map = !!negated; break;
        case 'hilite_pet':
            if ((!game.windowprocs || ['tty', 'curses'].includes(game.windowprocs.name))
                && iflags.wc_hilite_pet && !iflags.wc2_petattr) iflags.wc2_petattr = ATR_INVERSE;
            go.opt_need_redraw = true;
            break;
        case 'idlecheckpoint':
            await pline("There is no underlying support for 'idlecheckpoint' compiled in.");
            iflags.idlecheckpoint = false;
            state.give_opt_msg = false;
            break;
        }
        if (go.opt_initial) return optn_ok;
        switch (row.name) {
        case 'terrainstatus':
            classify_terrain();
            // fall through
        case 'weaponstatus': case 'armorstatus':
            // WC2_EXTRASTATUS in the normal tty window port.
            if (game.windowprocs && !(game.windowprocs.wincap2 & 0x080000)) {
                await option_error(`'${row.name}' is not supported.`);
                return optn_ok;
            }
            // fall through
        case 'showscore': case 'showvers': case 'showexp': case 'time':
            if (!game.windowprocs || (game.windowprocs.wincap2 & (0x8 | 0x80))) missing('status_initialize');
            game.disp.botl = true;
            break;
        case 'fixinv': case 'price_quotes': case 'sortpack': case 'implicit_uncursed': case 'wizweight':
            if (!option_value(state.allopt.find(r => r.name === 'fixinv'))) reassign();
            update_inventory();
            break;
        case 'lit_corridor': case 'dark_room':
            vision_recalc(2);
            game.vision_full_recalc = 1;
            if (iflags.use_color) go.opt_need_redraw = true;
            break;
        case 'wizmgender': case 'showrace': case 'use_inverse': case 'hilite_pile':
        case 'perm_invent': case 'ascii_map': case 'tiled_map':
            go.opt_need_redraw = go.opt_need_glyph_reset = true;
            break;
        case 'hitpointbar':
            if (!game.windowprocs || (game.windowprocs.wincap2 & (0x8 | 0x80))) {
                missing('status_initialize');
                go.opt_need_redraw = true;
            }
            break;
        case 'color': go.opt_need_redraw = go.opt_need_glyph_reset = true; break;
        case 'customcolors': go.opt_reset_customcolors = true; break;
        case 'customsymbols': go.opt_reset_customsymbols = true; break;
        case 'menucolors': case 'guicolor':
            update_inventory();
            go.opt_need_promptstyle = true;
            break;
        case 'mention_decor': iflags.prev_decor = STONE; break;
        case 'rest_on_space': update_rest_on_space(); break;
        case 'accessiblemsg': game.a11y.msg_loc = {x: 0, y: 0}; break;
        }
        if (state.give_opt_msg) await pline("'%s' option toggled %s.", row.name, !negated ? 'on' : 'off');
        return optn_ok;
    }
    if (req === get_val || req === get_cnf_val) {
        // C's caller supplies a mutable buffer for these requests.
        if (typeof opts !== 'object' || opts === null) throw new TypeError('Option get_val requires a text buffer');
        opts.text = '';
        return optn_ok;
    }
    return optn_ok;
}

export function can_set_perm_invent() {
    // expose their actual capabilities, not an assumed successful operation.
    if (!game.windowprocs || !(game.windowprocs.wincap & WC_PERM_INVENT)) return false;
    if (!game.iflags.perminv_mode) game.iflags.perminv_mode = 1;
    return true;
}

export async function reset_needed_visuals() {
    const go = game.go;
    if (go.opt_need_glyph_reset) missing('reset_glyphmap');
    if (go.opt_reset_customcolors || go.opt_update_basic_palette || go.opt_reset_customsymbols || go.opt_need_redraw) {
        if (go.opt_update_basic_palette) { missing('change_palette'); go.opt_update_basic_palette = false; }
        if (go.opt_reset_customcolors) reset_customcolors();
        if (go.opt_reset_customsymbols) missing('reset_customsymbols');
        if (go.opt_need_redraw) { check_gold_symbol(); reglyph_darkroom(); }
        await docrt();
    }
    if (go.opt_need_promptstyle) missing('adjust_menu_promptstyle');
    if (game.disp.botl || game.disp.botlx) await bot();
    go.opt_need_redraw = go.opt_need_glyph_reset = false;
    go.opt_reset_customcolors = go.opt_reset_customsymbols = go.opt_update_basic_palette = false;
}

export async function toggle_bool_option(p) {
    const allopt = option_state().allopt;
    let ret = ECMD_FAIL;
    for (let i = 0; i < allopt.length; ++i) {
        if (prefix(p, allopt[i].name, p.length) && allopt[i].type === 'B'
            && allopt[i].setwhere === 'set_in_game' && allopt[i].addr) {
            const buf = `${option_value(allopt[i]) ? '!' : ''}${allopt[i].name}`;
            if (await parseoptions(buf, false, false)) ret = ECMD_OK;
            await reset_needed_visuals();
        }
    }
    return ret;
}
