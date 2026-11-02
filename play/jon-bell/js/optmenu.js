// @ts-nocheck
// optmenu.js — the in-game Options menu (the 'O' command → doset()).
// C ref: src/options.c doset() (~8803) / doset_simple_menu() (8554) builds an
// NHW_MENU listing the set_in_game options grouped by section (General,
// Behavior, Map, Status), each row "name\t[value]"; tty renders the value
// column right-aligned via a cursor-forward escape.  doset is a GENERALCMD:
// it consumes NO turn and NO RNG.  Selecting a boolean option toggles it in
// place and re-renders; pickup_types opens the object-class submenu
// (choose_classes_menu, win/tty path); Enter/ESC exit.
//
// autodig/autopickup boolean toggles, and the pickup_types submenu.  The menu
// content (labels + ordering) is fixed (it is the static set_in_game projection
// of allopt[]); only the [value] fields are state-dependent.  Rendered
import { load_primary_symset_from_file, assign_graphics } from './symbols.js';
import { game } from './gstate.js';
import { dlb_file_lines, OPTMENUHELP } from './dispfile.js';
import { ECMD_OK, gs, PARANOID_BONES, Is_rogue_level } from './const.js';
import { nhgetch } from './input.js';
import { flush_screen, force_more, docrt, dec_mode, status_reassess, new_status_window, newclipping, gather_condition_hilite_lines } from './display.js';
import { reset_status_hilites } from './botl.js';
import { pline } from './pline.js';
import { update_inventory } from './inventory_refresh.js';
/* C options.c:8944 — the generic compound-option path reads its value with
 * getlin(); mungspaces (objnam.c) normalises it before it is stored. */
import { getlin } from './windows.js';
import { mungspaces, strsubst } from './hacklib.js';
import { optfn_fruit_set, optfn_statushilites_set, optfn_hilite_status_set, handler_autopickup_exception, handle_add_list_remove, compound_option_value, status_fieldname, optfn_boulder_set, DISCLOSURE_OPTIONS, END_DISCLOSE_DEFAULT, parse_pickup_types, PARANOIA_OPTS, PARANOID_CONFIRMATION_DEFAULT_BITS, BURDENTYPE } from './options.js';
import { count_status_hilites } from './botl.js';
import { option_state } from './options_runtime.js';
import { reset_needed_visuals, string_for_opt } from './options.js';
import { vision_recalc } from './vision.js';
import { classifyTerrain } from './terrain-status.js';
import { optfn_suppress_alert_set } from './feature_alert.js';
import { number_pad_value } from './cmd_config.js';
import { parseautocomplete } from './cmd.js';
import { reset_commands, update_rest_on_space, cmdbind_get, bind_key, cmd_from_func, visctrl } from './cmd_binds.js';
import { EXTCMDLIST } from './cmd_extcmd_data.js';
import { pgetchar, key2txt, list_vanquished_set_vanq_order } from './cmd.js';
import { display_text_window } from './com_pager.js';
import { TtyMenu, PICK_ANY, PICK_ONE, PICK_NONE, ATR_NONE, menu_heading_text, menu_heading_sgr } from './tty_menu.js';
import { menutype } from './menustyle.js';
import { MENU_TRADITIONAL, MENU_COMBINATION } from './const.js';
import { colornames, attrnames, attr2attrname, clr2colorname, match_str2clr } from './coloratt.js';
import { choose_disco_sort } from './o_init.js';
import { ROLE_RANKS, role_index_by_name } from './rank_data.js';
/* C ref: wintty.c process_menu_window's overlay composition — the shared
 * map-under-window renderer every other overlay in this port uses. */
import { build_window_screen, menu_search_case, menu_search_docorner } from './com_pager.js';
import { DOSET_BOOLS, DOSET_COMPOUNDS, DOSET_OTHERS, LONGEST_OPTION_NAME, term_for_boolean } from './doset_data.js';
import { count_bind_keys } from './cmd.js';
/* C ref: options.c:8060 oc_to_str — see js/drawing.js for why it lives there. */
import { def_char_to_objclass, def_oc_syms_chars } from './drawing.js';
import { oc_to_str } from './options.js';
export { HL_ATTRBITS }; // relocate-fns
export { doset, doset_simple } from './options.js'; // relocate-fns
export { drainTopline, query_attr_one, query_color, set_cursor }; // relocate-fns

// C ref: cmd.c set_cursor — record the tty cursor position after a window draw.
function set_cursor(col, row) {
    const disp = game?.nhDisplay;
    if (disp) { disp.cursorCol = col; disp.cursorRow = row; }
}


// ── option-menu model ────────────────────────────────────────────────────
// Each non-boolean ("comp"/"othr") option carries a value() producing the
// bracketed string; booleans carry a flag key read from game.flags.
// `name` is the displayed label, `kind` is 'bool' | 'comp' | 'othr' | 'sub'.
// The accelerator letters (a, b, c, ...) are assigned per-page in render order
// (C: add_menu cycles a-zA-Z), so they are NOT stored — they fall out of the
// row index within a page.




/* C optlist.h NHOPTB(name, box, ...) — which struct the option lives in.
 * js/doset_data.js carries it as the generated `box` column. */
let _OPT_BOX = null;   // built on first use: a module-evaluation-time read of DOSET_BOOLS hits the TDZ under some load orders (import cycle via cmd.js)
function _optBox(flag) { if (!_OPT_BOX) _OPT_BOX = new Map(DOSET_BOOLS.map((r) => [r.fld || r.name, r.box])); return _OPT_BOX.get(flag) || 'flags'; }





















// ── doset() — the '#optionsfull' command, reached in play as 'm O' ────────
// C ref: options.c:8758 doset().  Unlike doset_simple() this lists ALL of
// allopt[] projected to [set_gameview .. set_in_game], in three sections
// (Booleans / Compounds / Other settings), titled "Set what options?", and it
// is a PICK_ANY menu: selections accumulate across pages and are all applied
// when the menu commits.  The row list lives in js/doset_data.js, generated
// from the C headers (see that file's provenance header).
//
// C ref: cmd.c:1779-1784 — 'O' is #options -> doset_simple, and #optionsfull
// -> doset is bound to NO key; the only way to reach doset in play is the 'm'
// prefix, which doset_simple() turns into a doset() call (options.c:8712).



async function drainTopline() {
    /* C wintty.c:1921-1922 only drains a standing topline when opening a
     * menu. With no message, no flush_screen()/bot() repaints the status
     * rows cleared by the preceding menu's docrt(). */
    if (game._pending_message) {
        if (!game._statusBlankAfterDocrt) await flush_screen(1); // windows.c:1861: bot disabled during menu opening.
        if (game._pending_message) await force_more(game._pending_message);
    }
    game._pending_message = '';
}





/* C coloratt.c:530 basic_menu_colors(TRUE): temporary menucolor patterns that
 * match the colour names (built last-in/first-out; black, white and no color
 * are skipped), with 'menucolors' forced on.  Returns the restorer. */
function basic_menu_colors() {
    const save_use = game.iflags.use_menu_color;
    const save_colorings = game.menu_colorings;
    const cols = [];
    for (const { name, color } of colornames) {
        if (!name) break;
        if (color === 0 || color === 15 || color === 8) continue;
        cols.unshift({ match: new RegExp(name), color, attr: 0 });
    }
    game.iflags.use_menu_color = true;
    game.menu_colorings = cols;
    return () => {
        game.iflags.use_menu_color = save_use;
        game.menu_colorings = save_colorings;
    };
}

/* C coloratt.c:475 query_color; returns -1 on ESC. */
async function query_color(prompt, dflt_color, preserveStatus) {
    const restore = basic_menu_colors();
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < colornames.length; i++) {
        if (!colornames[i].name) break;
        m.add_menu(i + 1, 0, ATR_NONE, colornames[i].name, false,
                   colornames[i].color === dflt_color);
    }
    m.end_menu(prompt || 'Pick a color');
    const { count, picks } = await m.select_menu(PICK_ONE);
    restore();
    if (count > 0) {
        let i = colornames[picks[0] - 1].color;
        if (count === 2 && i === 8) i = colornames[picks[1] - 1].color;
        return i;
    } else if (count === 0) {
        return dflt_color;
    }
    return -1;
}

/* C coloratt.c:380 query_attr (PICK_ONE case); returns -1 on ESC. */
async function query_attr_one(prompt, dflt_attr, preserveStatus) {
    const allow_many = /^Choose/i.test(prompt || ''); // C coloratt.c:387
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < attrnames.length; i++) {
        if (!attrnames[i].name) break;
        m.add_menu(i + 1, 0, ATR_NONE, attrnames[i].name, false,
                   attrnames[i].attr === dflt_attr);
        /* tty term_start_attr: C ATR_BOLD/ULINE/INVERSE only (this port's
         * ATR_* numbering differs from C's, so carry the SGR code itself). */
        const sgr = { 1: 1, 4: 4, 7: 7 }[attrnames[i].attr];
        if (sgr) m.mlist[m.mlist.length - 1].sgr = [sgr];
    }
    m.end_menu(prompt || 'Pick an attribute');
    const { count, picks } = await m.select_menu(allow_many ? PICK_ANY : PICK_ONE);
    if (allow_many) {
        if (count <= 0) return -1;
        return picks.reduce((bits, pick) => bits | (attrnames[pick - 1].attr === 0
            ? (count === 1 ? 1 : 0)
            : HL_ATTRBITS.find(b => b[0] === attrnames[pick - 1].attr)[1]), 0);
    }
    if (count > 0) {
        let j = picks[0] - 1;
        if (count === 2 && attrnames[j].attr === dflt_attr) j = picks[1] - 1;
        return attrnames[j].attr;
    } else if (count === 0) {
        return dflt_attr;
    }
    return -1;
}








/* C botl.c:3570 status_hilite_linestr_gather over the raw rules options.js
 * keeps: one line per threshold, by field index (blstats[0][i].thresholds,
 * appended in rule order, botl.c status_hilite_add_threshold), each rendered
 * by status_hilite2str (botl.c:3590) from parse_status_hl2's classification
 * (botl.c:2814-2990).  Rules split on spaces as parse_status_hl1 does
 * (botl.c:2606-2640, lowercased).  Condition rules are not modelled per
 * cond_maps (botl.c:3488): each distinct rule is one 'condition' line. */
const HL_ATTRBITS = [[1, 2, 'bold'], [2, 4, 'dim'], [3, 8, 'italic'], [4, 16, 'underline'],
    [5, 32, 'blink'], [7, 64, 'inverse']];



























/* C cmd.c:2243 get_changed_key_binds(NULL) — text window form. */
async function get_changed_key_binds() {
    const lines = [];
    const keys = new Uint8Array(256);
    for (let bind = game.Cmd?.cmdbinds; bind; bind = bind.next) {
        keys[bind.key] = 1;
        if (bind.userbind && bind.cmd && bind.cmd.key !== bind.key) {
            if (bind.cmd.flags & 0x4000 /* CMD_PARAM */)
                lines.push(`BIND=${key2txt(bind.key)}:${bind.cmd.name}(${bind.param})`);
            else
                lines.push(`BIND=${key2txt(bind.key)}:${bind.cmd.name}`);
        }
    }
    for (const ec of EXTCMDLIST)
        if (ec.key && !keys[ec.key])
            lines.push(`BIND=${key2txt(ec.key)}:nothing`);
    await display_text_window(lines);
}

/* C cmd.c:2291 handler_rebind_keys_add(keyfirst). */
/* Returns true when something flushed the topline/status (pline). */
async function handler_rebind_keys_add(keyfirst) {
    let key = 0, flushed = false;
    if (keyfirst) {
        await pline('Bind which key? ');
        await flush_screen(0);
        /* tty_putstr leaves the cursor just past the topline text (cw->curx = 16) */
        set_cursor('Bind which key? '.length, 0);
        key = (await pgetchar()) & 0xff;
        if (!key || key === 27) return true;
    }
    /* ~170 items span several pages, so tty_display_nhwindow() uses the
     * whole screen (offx 0), unlike the two-line "Do what?" overlay. */
    await drainTopline();
    const m = new TtyMenu();
    if (key) {
        const bind = cmdbind_get(key);
        if (bind && bind.cmd)
            m.add_menu_str(`Key '${key2txt(key)}' is currently bound to "${bind.cmd.name}".`);
        else
            m.add_menu_str(`Key '${key2txt(key)}' is not bound to anything.`);
        m.add_menu_str('');
    }
    m.add_menu(-1, 0, ATR_NONE, 'nothing: unbind the key', false, false);
    m.add_menu_str('');
    EXTCMDLIST.forEach((ec, i) => {
        if (ec.flags & (0x0400 | 0x0040 | 0x0010)) return; /* MOVEMENTCMD|INTERNALCMD|CMD_NOT_AVAILABLE */
        m.add_menu(i + 1, 0, ATR_NONE, `${ec.name}: ${ec.desc}`, false, false);
    });
    m.end_menu(key ? `Bind '${key2txt(key)}' to what command?` : 'Bind what command?');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        const i = picks[0];
        let ec = null, cmdstr;
        if (i === -1) {
            cmdstr = 'nothing';
        } else {
            ec = EXTCMDLIST[i - 1];
            if (ec.flags & 0x4000 /* CMD_PARAM */) {
                const parambuf = mungspaces(await getlin(`Command ${ec.name} requires a parameter:`));
                cmdstr = `${ec.name}(${parambuf})`;
            } else {
                cmdstr = ec.name;
            }
        }
        if (!key) {
            await pline('Bind which key? ');
            await flush_screen(1);
            flushed = true; /* painted AFTER the full-screen command menu */
            key = (await pgetchar()) & 0xff;
            if (!key || key === 27) return true;
        }
        const prevcmd = cmdbind_get(key);
        if (bind_key(key, cmdstr, true)) {
            if (prevcmd && prevcmd.cmd !== ec)
                flushed = true, await pline(`Changed key '${key2txt(key)}' from "${prevcmd.cmd.name}" to "${cmdstr}".`);
            else if (!prevcmd)
                flushed = true, await pline(`Bound key '${key2txt(key)}' to "${cmdstr}".`);
        } else {
            await pline('Key binding failed?!');
            flushed = true;
        }
    }
    return flushed;
}

/* C cmd.c:2449 handler_change_autocompletions. */
export async function handler_change_autocompletions(preserveStatus = false) {
    const AUTOCOMPLETE = 0x0002, AUTOCOMP_ADJ = 0x2000;
    const CMD_NOT_AVAILABLE = 0x0010, INTERNALCMD = 0x0040;
    const m = new TtyMenu();
    EXTCMDLIST.forEach((ec, i) => {
        if ((ec.flags & (INTERNALCMD | CMD_NOT_AVAILABLE)) !== 0) return;
        if (ec.name.length < 2) return;
        const buf = `${(ec.flags & AUTOCOMP_ADJ) ? '*' : ' '} ${ec.name}: ${ec.desc}`;
        m.add_menu(i + 1, 0, ATR_NONE, buf, false, !!(ec.flags & AUTOCOMPLETE));
    });
    m.end_menu('Which commands autocomplete?');
    const { count, picks } = await m.select_menu(PICK_ANY);
    if (count >= 0) {
        const chosen = new Set(picks.slice(0, count));
        EXTCMDLIST.forEach((ec, i) => {
            if ((ec.flags & (INTERNALCMD | CMD_NOT_AVAILABLE)) !== 0) return;
            if (ec.name.length < 2) return;
            parseautocomplete(ec.name, chosen.has(i + 1));
        });
    }
}

/* C cmd.c:2408 handler_rebind_keys. */
export async function handler_rebind_keys() {
    /* C cmd.c:2408-2435 overlays the existing terminal.  A preceding
     * option's pline (options.c:4514, pline.c:273-274) may already have
     * repainted the status after the Options window was dismissed. */
    let statusPainted = !game._statusBlankAfterDocrt;
    for (;;) {
        /* C: opening the window over a pending topline message more()s it. */
        await drainTopline();
        const m = new TtyMenu({ overlay: true, statusClipCol: statusPainted ? undefined : 0 });
        m.add_menu(1, 0, ATR_NONE, 'bind key to a command', false, false);
        m.add_menu(2, 0, ATR_NONE, 'bind command to a key', false, false);
        if (count_bind_keys())
            m.add_menu(3, 0, ATR_NONE, 'view changed key binds', false, false);
        m.end_menu('Do what?');
        const { count, picks } = await m.select_menu(PICK_ONE);
        if (count <= 0) return statusPainted;
        const i = picks[0];
        if (i === 1 || i === 2) { if (await handler_rebind_keys_add(i === 1)) statusPainted = true; }
        else if (i === 3) { await get_changed_key_binds(); statusPainted = true; }
    }
}

