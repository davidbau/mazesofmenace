// pager.js — C ref: pager.c.
import { checkfile_keys, dbase_scan } from './data_base.js';
import { singular_xname } from './cmd.js';
import { isok } from './const.js'; // relocate-fns
import { GLYPHCLS_ENGR, GLYPHCLS_INVIS, GLYPHCLS_MON, GLYPHCLS_OBJ, GLYPHCLS_TRAP, glyph_at, map_glyphinfo } from './display.js'; // relocate-fns
import { game } from './gstate.js'; // relocate-fns
import { BEAR_TRAP_TTYP, DEVTEAM_URL, GPCOORDS_COMPASS, GPCOORDS_MAP, GPCOORDS_NONE, GPCOORDS_SCREEN, MOVEMENTCMD, OCLASS_COIN, QBUFSZ_CMD, STATUE_OTYP, S_engrcorr, S_engroom, S_grave, TIP_GETPOS, WEB_TTYP, _GETPOS_VIEW_FILTERS, _LD_CHEST, _LD_LARGE_BOX, _Mgender, _NUM_GLOCS, _QUITCHARS, _Role_if_samurai_cmd, _WHAT_IS_A_LOCATION, _cmd_Hallucination, _digests, _gather_locs, _getpos_menu, _getpos_menu_shown, _getpos_symbol_search, _glyph_at, _glyph_ident, _levlAt, _mhidden_region_tail, _st_Punished, _surface_at_typ, _trap_to_defsym, _uprop_active, _waterbody_surface_typ, cmd_from_func, cmdq_clear, cmdq_peek, cmdq_pop, dbase_display_window, do_look_moreinfo, doextlist, getpos_getvalid, getpos_hilitefunc, inventory_menu_legacy, key2extcmddesc, key2txt, keyhelp_compress_str, monster_seen_description, movecmd, pooleffects_Levitation, pooleffects_ceiling_hider, readchar_poskey, set_cursor, show_direction_keys, spkey_of, thit_is_orc, yn_function } from './cmd.js';
import { handle_tip } from './hack.js';
import { auto_describe, coord_desc, getpos_help, getpos_sethilite, truncate_to_map } from './getpos.js';
import { display_inventory } from './invent.js';
import { surface } from './dungeon.js';
import { trapped_chest_at, trapped_door_at } from './detect.js'; // relocate-fns
import { visctrl as _binds_visctrl, ext_cmd_from_key } from './cmd_binds.js';
import { cmd_from_func as _binding_cmd_from_func, cmdbind_get } from './cmd.js'; // relocate-fns
import { EXTCMDLIST } from './cmd_extcmd_data.js'; // relocate-fns
import { menucolor_row, menucolor_text } from './coloratt.js'; // relocate-fns
import { build_window_screen, display_text_window, menu_search_case } from './com_pager.js'; // relocate-fns
import { BEAR_TRAP, BOLT_LIM, BUFSZ, CMDQ_KEY, COLNO, CORR, CQ_CANNED, DEBUGHELP, DETECT_MONSTERS, ECMD_CANCEL, ECMD_OK, HOLE, ICE, INVIS, IS_GRAVE, IS_TREE, IS_WALL, IS_WATERWALL, Is_airlevel, Is_juiblex_level, Is_waterlevel, LAVAPOOL, LAVAWALL, MCORPSENM, MELT_ICE_AWAY, MOAT, MV_RUN, MV_RUSH, MV_WALK, M_AP_FURNITURE, M_AP_F_DKNOWN, M_AP_MONSTER, M_AP_OBJECT, M_AP_TYPE, NHKF_COUNT, NHKF_ESC, NON_PM, NUM_GFILTER, PICK_ONE, PIT, POOL, ROCKTRAP, ROWNO, SCORR, SDOOR, STONE, STRAT_WAITMASK, TELEPAT, TRAPPED_CHEST, TRAPPED_DOOR, Upolyd, WEB, def_warnsyms, is_hole, is_pit, u_at } from './const.js'; // relocate-fns
import { checkfile_entries, checkfile_lookup, dbase_entry_lines } from './data_base.js'; // relocate-fns
import { is_lava, is_pool } from './dbridge.js'; // relocate-fns
import { DEFSYM_EXPLANATION } from './defsym_data.js'; // relocate-fns
import { HELP, HISTORY, KEYHELP, LICENSE, OPTIONFILE, OPTMENUHELP, SHELP, USAGEHELP, dlb_file_lines } from './dispfile.js'; // relocate-fns
import { GLYPHCLS_CMAP, _threeStatusLines, _topline_more_pending, await_menu_key, await_topl_more_dismiss, canspotself, collectScreenDescriptionClasses, dec_mode, docorner_blank_utf8_captures, docrt, flush_screen, force_more, glyph_is_warning_at, pager_boulder_symbol, pager_glyph_prefix, pager_mixed_text, pager_showsyms, pager_text_glyph } from './display.js'; // relocate-fns
import { sticks } from './dog.js'; // relocate-fns
import { getpos_refresh } from './getpos.js'; // relocate-fns
import { wizard } from './gstate.js'; // relocate-fns
import { dist2, mungspaces, strsubst, upstart, visctrl } from './hacklib.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { trap_predicament } from './insight.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { getdir } from './cmd.js'; // relocate-fns
import { monPmname } from './makemon.js';
import { trapname as makemon_trapname, trapname } from './trap.js'; // relocate-fns
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' }; // relocate-fns
import { is_youmonst } from './mhitm.js';
import { coyotename, distant_monnam, hliquid, y_monnam } from './do_name.js'; // relocate-fns
import { mkobj as _fl_mkobj, dealloc_obj, mksobj } from './mkobj.js';
import { engr_at } from './engrave.js'; // relocate-fns
import { is_treefruit } from './mkobj.js'; // relocate-fns
import { MKOBJ_OC_CLASS } from './mkobj_data.js'; // relocate-fns
import { closed_door } from './monmove.js'; // relocate-fns
import { doextversion } from './version.js'; // relocate-fns
import { observe_object } from './o_init.js'; // relocate-fns
import { doname_with_price as _doname_with_price, distant_name as _fw_distant_name, doname_vague_quan as _fw_doname_vague_quan, simpleonames as _ia_simpleonames, objName as _objName_full, an, ansimpleoname } from './objnam.js'; // relocate-fns
import { get_menu_cmd_key, option_help } from './options.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { PM_COYOTE } from './pm.generated.js'; // relocate-fns
import { visible_region_at } from './region.js'; // relocate-fns
import { costly_spot as shk_costly_spot } from './shk.js'; // relocate-fns
import { obj_stop_timers, spot_time_left } from './timeout.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { menu_heading_text } from './tty_menu.js'; // relocate-fns
import { m_at } from './uhitm.js'; // relocate-fns
import { Blind as _vision_Blind, cansee, couldsee } from './vision.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { show_menu_controls } from './options.js'; // relocate-fns
export { _pad_l, _pad_r }; // relocate-fns

const chkfilUsrTyped = 0x1; /* lookup via user-entered name vs map pointing */
const chkfilDontAsk = 0x2;  /* skip "More info about <thing>?" confirmation */
const chkfilIaCheck = 0x4;  /* just check for info rather than display it */

export function ia_checkfile(otmp, chkflags = (chkfilIaCheck | chkfilDontAsk)) {
    const itemnam = (otmp && typeof otmp === 'object') ? singular_xname(otmp) : otmp;
    const without_asking = (chkflags & chkfilDontAsk) !== 0;
    const ia_checking = (chkflags & chkfilIaCheck) !== 0;
    const keys = checkfile_keys(itemnam);
    if (!keys) return false;
    const { dbase_str, alt } = keys;
    for (let pass = (alt === dbase_str) ? 0 : 1; pass >= 0; --pass) {
        const key = pass === 1 ? alt : dbase_str;
        if (pass === 1 && !alt) continue;
        if (dbase_scan(key) >= 0 && (without_asking || ia_checking))
            return true;                 /* pager.c:1071-1078 */
    }
    return false;
}

/* C pager.c:1247 do_screen_description().  The accessibility call from
 * show_glyph only needs the first description for the glyph just painted;
 * preserve that contract without enumerating pager symbol tables here. */
export function do_screen_description(cc, b1, sym, buf, firstmatch, n) {
    if (!cc || !isok(cc.x, cc.y) || !game.level)
        return 0;
    if (b1) {
        const glyph = glyph_at(cc.x, cc.y);
        const glyphinfo = {};
        map_glyphinfo(cc.x, cc.y, glyph, 0, glyphinfo);
        sym = glyphinfo.ttychar;
    }
    const loc = game.level.at(cc.x, cc.y);
    if (!loc)
        return 0;
    let text;
    switch (loc.disp_cls) {
    case GLYPHCLS_MON: text = 'monster'; break;
    case GLYPHCLS_OBJ: text = 'object'; break;
    case GLYPHCLS_TRAP: text = 'trap'; break;
    case GLYPHCLS_ENGR: text = 'engraving'; break;
    case GLYPHCLS_INVIS: text = 'invisible monster'; break;
    default: text = (loc.disp_ch === ' ') ? 'unexplored area' : 'terrain'; break;
    }
    if (firstmatch && typeof firstmatch === 'object') {
        if (Array.isArray(firstmatch)) firstmatch[0] = text;
        else firstmatch.value = text;
    }
    return 1;
}

// C ref: pager.c:2860 dohelp() — '?' command: "give a help message".
// GENERALCMD | IFBURIED: no turn, no RNG.
//
// dohelp creates a NHW_MENU listing ~16 help items, calls select_menu(PICK_ONE)
// to read a single selection key, then runs the selected help sub-function
// (dispfile_help, dohistory, etc.) which typically shows a text pager consuming
// one or more additional keys.  Returns ECMD_OK (no turn, no RNG at any path).
//
// JS stub: display a minimal help-menu window, read the selection key.
// If a valid letter selection is made (a-z), read one more key (the pager
//
// "Unknown command", desyncing the key stream at that step).
//
/* C ref: pager.c:2827-2854 — the help_menu_items[] table, in table order.
 * `f` is the C function name, kept as a string tag because none of the topic
 * functions are ported yet (see the dispatch note at the end of dohelp);
 * `text` is the literal add_menu text, except index 8 (dispfile_optmenu)
 * whose text is a "%s" format filled by setopt_cmd() at menu-build time.
 * The PORT_HELP entry ({ port_help, "%s-specific help and commands." }) is
 * inside `#ifdef PORT_HELP`, which this build does not define — the recorded
 * C frame has no such row, so it is absent here too. */
const HELP_MENU_ITEMS = [
    { f: 'hmenu_doextversion',  text: 'About NetHack (version information).' },
    { f: 'dispfile_help',       text: 'Long description of the game and commands.' },
    { f: 'dispfile_shelp',      text: 'List of game commands.' },
    { f: 'hmenu_dohistory',     text: 'Concise history of NetHack.' },
    { f: 'hmenu_dowhatis',      text: 'Info on a character in the game display.' },
    { f: 'hmenu_dowhatdoes',    text: 'Info on what a given key does.' },
    { f: 'option_help',         text: 'List of game options.' },
    { f: 'dispfile_optionfile', text: 'Longer explanation of game options.' },
    { f: 'dispfile_optmenu',    text: 'Using the %s command to set options.' },
    { f: 'dokeylist',           text: 'Full list of keyboard commands.' },
    { f: 'hmenu_doextlist',     text: 'List of extended commands.' },
    { f: 'domenucontrols',      text: 'List menu control keys.' },
    { f: 'dispfile_usagehelp',  text: "Description of NetHack's command line." },
    { f: 'dispfile_license',    text: 'The NetHack license.' },
    { f: 'docontact',           text: 'Support information.' },
    { f: 'dispfile_debughelp',  text: 'List of wizard-mode commands.' },
];

function setopt_cmd() {
    let outbuf = "'";
    /* #optionsfull */
    const key_doset = _binding_cmd_from_func('doset'); /* cmd_from_func(doset) */
    if (key_doset) {
        outbuf += visctrl(key_doset);
    } else {
        /* extended command name, with leading "#" */
        const cmdnm = 'optionsfull';  /* cmdname_from_func(doset, buf, TRUE) */
        outbuf += (cmdnm[0] !== '#' ? '#' : '') + cmdnm.slice(0, 31);
        /* since there's no key bound to #optionsfull, include 'm O' */
        outbuf += "' or '";
        /* m prefix plus #options */
        const key_reqmenu = _binding_cmd_from_func('do_reqmenu'); /* cmd_from_func(do_reqmenu) */
        if (key_reqmenu) {
            outbuf += visctrl(key_reqmenu);
        } else {
            const cn = 'reqmenu';
            outbuf += (cn[0] !== '#' ? '#' : '') + cn.slice(0, 31);
        }
        /* "slightly iffy" separating space (pager.c:2940-2941) */
        outbuf += ' ';
        /* now #options, normally 'O' */
        const key_setsimple = _binding_cmd_from_func('doset_simple'); /* cmd_from_func(doset_simple) */
        if (key_setsimple) {
            outbuf += visctrl(key_setsimple);
        } else {
            const cn = 'options';
            outbuf += (cn[0] !== '#' ? '#' : '') + cn.slice(0, 31);
        }
    }
    outbuf += "'";
    return outbuf;
}

/* C ref: pager.c:2421-2444 whatdoes_help() — dump dat/keyhelp into an NHW_TEXT
 * window, skipping '#' comment lines and stripping each surviving line's
 * leading blanks.  Only reached when the queried key is '&' or '?'.
 *
 * C's dlb_fgets leaves the trailing newline on buf and putstr() gets it
 * verbatim; dlb_file_lines() already splits on it, which is the same text the
 * tty renders (the trailing blank a bare "\n" would add is right-trimmed by
 * the screen dump, exactly as build_text_window_screen does). */
async function whatdoes_help() {
    const lines = dlb_file_lines(KEYHELP);
    if (!lines) {
        /* C: pline("Cannot open \"%s\" data file!"); display_nhwindow(WIN_MESSAGE, TRUE) */
        await force_more(`Cannot open "${KEYHELP}" data file!`);
        return;
    }
    const out = [];
    for (const raw of lines) {
        if (raw[0] === '#')
            continue;
        let i = 0;
        while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t'))
            i++;
        out.push(keyhelp_compress_str(raw.slice(i)));
    }
    await display_text_window(out);
}

/* C ref: pager.c:2575-2593 dowhatdoes_core(q, cbuf) — 3.7 answers entirely from
 * key2extcmddesc(); the dat/cmdhelp scanner below it is inside `#if 0`.
 *   Sprintf(buf, "%-8s%s.", key2txt(q, keybuf), ec_desc)
 * Returns null when the key is bound to nothing. */
export function dowhatdoes_core(q) {
    const ec_desc = key2extcmddesc(q);
    if (ec_desc != null)
        return key2txt(q).padEnd(8, ' ') + ec_desc + '.';
    return null;
}

/* C ref: pager.c:2656-2714 dowhatdoes() — the '&' command (and help-menu item
 * 'f' via hmenu_dowhatdoes).  Prints the one-time hint, asks "What command?",
 * then describes the key that answers it.  GENERALCMD: no turn, no RNG. */
export async function dowhatdoes() {
    const g = game;
    /* C: static boolean once = FALSE — process-scoped, i.e. once per game. */
    if (!g._whatdoes_once) {
        await pline("Ask about '&' or '?' to get more info.%s",
                    g.iflags?.altmeta ? '  (For ESC, type it twice.)' : '');
        g._whatdoes_once = true;
    }
    /* C pager.c:2675-2684: NULL responses accept any key; ESC introduces
     * a second prompt for altmeta, with ESC ESC remaining a literal ESC. */
    let q = (await yn_function('What command?', null, '\0', true)).charCodeAt(0) & 0xff;
    if (q === 27 && g.iflags?.altmeta) {
        q = (await yn_function(']', null, '\0', true)).charCodeAt(0) & 0xff;
        if (q !== 27) q |= 0x80;
    }
    const reslt = dowhatdoes_core(q);
    if (reslt) {
        const p = reslt.indexOf('\n'); /* 'm' prefix has two lines of output */

        if (q === 0x26 /* '&' */ || q === 0x3f /* '?' */)
            await whatdoes_help();
        if (p < 0) {
            /* normal usage; 'reslt' starts with key, some indentation, and
               then explanation followed by '.' for sentence punctuation */
            await pline(reslt);
        } else {
            /* for 'm' prefix, where 'reslt' has an embedded newline to
               indicate and separate two lines of output; we add a comma to
               first line so that the combination is a complete sentence */
            await pline(reslt.slice(0, p) + ',');
            /* C cheats by knowing how dowhatdoes_core() handles the key
             * portion: "%8.8s%s" — exactly the 8-column key field. */
            await pline(reslt.slice(0, 8) + reslt.slice(p + 1));
        }
    } else {
        const oct = (q & 0xff).toString(8).padStart(3, '0');
        const hex = (q & 0xff).toString(16).padStart(2, '0');
        await pline(`No such command '${visctrl(q)}', char code ${q & 0xff} (0${oct} or 0x${hex}).`);
    }
    return ECMD_OK;
}




/* C's Sprintf field specifiers, as used by show_menu_controls's two formats. */
const _pad_r = (s, w) => String(s).padStart(w, ' ');   /* "%Ns"  */

const _pad_l = (s, w) => String(s).padEnd(w, ' ');     /* "%-Ns" */


/* C ref: pager.c:2820-2827 domenucontrols() — help menu item 'l'. */
async function domenucontrols() {
    await display_text_window(show_menu_controls(false));
}

/* C ref: hack.h:1561-1562 */
const DEVTEAM_EMAIL = 'devteam@nethack.org';

async function docontact() {
    const cwin = [];
    const sysopt = game.sysopt || {};
    if (sysopt.support) {
        cwin.push(`To contact local support, ${sysopt.support}`);
        cwin.push('');
    } else if (sysopt.fmtd_wizard_list) {
        cwin.push(`To contact local support, contact ${sysopt.fmtd_wizard_list}.`);
        cwin.push('');
    }
    cwin.push('To contact the NetHack development team directly,');
    cwin.push(`see the 'Contact' form on our website or email <${DEVTEAM_EMAIL}>.`);
    cwin.push('');
    cwin.push('For more information on NetHack, or to report a bug,');
    cwin.push(`visit our website "${DEVTEAM_URL}".`);
    await display_text_window(cwin);
}







export async function dohelp() {
    const g = game;
    /* C ref: pager.c:2862-2896 — create_nhwindow(NHW_MENU), one add_menu per
     * help_menu_items[] row that survives the two skips, end_menu("Select one
     * item:"), select_menu(PICK_ONE).
     *
     * The skips: dispfile_debughelp only appears in wizard mode, and
     * dispfile_usagehelp only when sysopt.hideusage is false (its default; no
     * sysconf in this port, so it is never hidden). */
    const wiz = wizard();
    const hideusage = false;              /* sysopt.hideusage — default FALSE */
    /* add_menu is called with ch == 0 for every row, so tty assigns the
     * selector letters sequentially 'a', 'b', 'c', ... over the rows that
     * actually got added — which is why skipping debughelp does not leave a
     * hole in the lettering. */
    const helpLines = [];
    /* The rows that survive the two skips, in table order — select_menu's
     * PICK_ONE letters run 'a', 'b', ... over exactly this list, so it is also
     * the dispatch table for the returned key. */
    const survivors = [];
    const mlist = [];
    helpLines.push(menu_heading_text('Select one item:')); /* wintty.c:2688 tty_menu_promptstyle */
    helpLines.push('');
    let nextLetter = 0x61;                /* 'a' */
    for (const item of HELP_MENU_ITEMS) {
        if (!wiz && item.f === 'dispfile_debughelp')
            continue;
        if (hideusage && item.f === 'dispfile_usagehelp')
            continue;
        /* C: help_menu_items[i].text[0] == '%' → PORT_ID (no such row here);
         * f == dispfile_optmenu → the setopt_cmd() substitution; else verbatim. */
        const helpbuf = (item.f === 'dispfile_optmenu')
            ? item.text.replace('%s', setopt_cmd())
            : item.text;
        const letter = String.fromCharCode(nextLetter++);
        helpLines.push(menucolor_row(`${letter} - ${helpbuf}`)); /* windows.c:1803 add_menu menucolors */
        survivors.push(item);
        /* C ref: wintty.c tty_add_menu stores str as "%c - %s" — the form
         * MENU_SEARCH's pmatchi() matches against (wintty.c:1700-1730). */
        mlist.push({ str: `${letter} - ${helpbuf}`, acc: letter });
    }
    helpLines.push('(end)');
    /* tty PICK_ONE menu geometry: the window is right-justified over the map at
     * offx = COLNO - maxwidth - 2, with its text drawn at offx + 1 — i.e.
     * WIN_COL = 80 - maxwidth - 2, maxwidth taken over the VISIBLE length of
     * every row including the title and the "(end)" footer.  Same formula as
     * the whatis menu (step 82: maxwidth 38 → 40) and the inventory PICK_ONE
     * (step 83: 57 → 21); here maxwidth is 61 (the dispfile_optmenu row) → 17,
     * matching the recorded C frame's erase_menu_or_text[offx=16] plus one. */
    const maxLen = helpLines.reduce((mx, ln) => {
        const vis = ln.replace(/\x1b\[[0-9;]*m/g, '');
        return Math.max(mx, vis.length);
    }, 0);
    /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` drops the menu to offx 0
     * and clears the screen; content is drawn at column 1. */
    const fullScreen = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
    const WIN_COL = fullScreen ? 1 : 80 - maxLen - 2;
    const uac = g.u?.uac ?? 0;
    /* wintty.c:1927 — `!iflags.menu_overlay`: offx 0, cleared screen, content col 1. */
    const helpFull = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
    const helpBuild = (ls) => helpFull
        ? ls.map((ln) => (ln === '' ? '' : ' ' + ln)).join('\n')
        : build_window_screen(ls, WIN_COL, uac);
    const lastSelector = 0x61 + survivors.length - 1;  /* 'a' .. last added row */
    let selKey;
    let counting = false, count = 0, reset_count = true;
    /* C ref: wintty.c:1700-1730 MENU_SEARCH — once the getlin has drawn over
     * row 0, the title stays erased until the page is repainted (a fresh
     * select_menu), so every later frame of THIS loop keeps row 0 blank. */
    let titleErased = false;
    for (;;) {
        if (reset_count) { counting = false; count = 0; }
        else reset_count = true;
        const lines = titleErased ? ['', ...helpLines.slice(1)] : helpLines;
        g._screen_output = helpBuild(lines);
        /* Cursor one past the last character of the "(end)" footer (C tty
         * select_menu convention; same as ask_do_tutorial / dowhatis). */
        set_cursor((helpFull ? 1 : WIN_COL) + '(end)'.length + 1, helpLines.length - 1);
        selKey = await nhgetch();
        /* C wintty.c:1597-1602 — '0'..'9' append to the pending count and the
         * loop re-waits on the same page; every add_menu here passes gselector
         * 0, so the strchr(gacc, morc) redirect to group_accel cannot fire and
         * a digit is always a count digit.  Leading zeros don't start a count. */
        if (selKey >= 48 /* '0' */ && selKey <= 57 /* '9' */) {
            count = count * 10 + (selKey - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            continue;
        }
        if (selKey === 27 /* ESC */)
            g._ttyDismissMore = 1;
        /* C wintty.c:1604-1613 — ESC with a count pending only stops the
         * count; the menu stays up (dismiss_more is still armed by the ESC
         * read itself, getline.c:245-247). */
        if (selKey === 27 /* ESC */ && counting)
            continue;
        if (selKey === 27 /* ESC */ || selKey === 10 /* LF */
            || selKey === 13 /* CR */ || selKey === 32 /* space */)
            break;
        if (selKey >= 0x61 && selKey <= lastSelector)
            break;
        if (selKey === 0x3a /* ':' MENU_SEARCH */) {
            let picked = null;
            const finished = await menu_search_case('ONE', mlist,
                () => helpBuild(['', ...helpLines.slice(1)]).split('\n'),
                (curr) => { picked = curr.acc; });
            titleErased = true;
            if (finished && picked != null) {
                selKey = picked.charCodeAt(0);
                break;
            }
            continue;
        }
        if ('^|><.,\\-@~'.includes(String.fromCharCode(selKey)))
            continue;
        /* Any other key is belled away inside xwaitforspace (getline.c:250-254)
         * and never reaches the switch, so a live count survives it.
         * nhgetch() cleared _pending_message; the loop head re-shows the same
         * window, which is what C's re-wait for a resp key amounts to. */
        reset_count = false;
    }
    /* C pager.c:2892 destroy_nhwindow(tmpwin) -> tty_dismiss_nhwindow ->
     * erase_menu_or_text -> docorner(offx, maxrow + 1) (wintty.c:982): cl_end
     * blanks the covered rows, so a control-byte cell (RogueEpyx S_human \x01)
     * stays blank after row_refresh's g_putch paints nothing. */
    if (!fullScreen) docorner_blank_utf8_captures(WIN_COL - 1, helpLines.length + 1);
    // A selector of a row this menu actually added means the user picked a topic.
    // The selected function displays content and reads a dismiss key.
    const isLetter = selKey >= 0x61 && selKey <= lastSelector;
    if (isLetter) {
        /* C ref: pager.c:2896 — (void) (*help_menu_items[sel].f)().
         * Dispatches hmenu_doextversion, hmenu_dowhatis, hmenu_dowhatdoes,
         * hmenu_doextlist, domenucontrols, docontact, dokeylist, option_help,
         * and all dispfile topics through DISPFILE_TOPICS. */
        const picked = survivors[selKey - 0x61];
        /* pager.c:2745-2787 dispfile_help / dispfile_shelp / dispfile_optionfile
         * / dispfile_optmenu / dispfile_license / dispfile_usagehelp /
         * dispfile_debughelp (wizard mode's 'p' row — global.h:18
         * DEBUGHELP "wizhelp"; the row only enters the menu when wizard(),
         * so this arm is unreachable in normal play), and
         * pager.c:2960-2964 hmenu_dohistory: each is a bare
         * display_file(<FILE>, TRUE). */
        const DISPFILE_TOPICS = {
            dispfile_help: HELP,
            dispfile_shelp: SHELP,
            hmenu_dohistory: HISTORY,
            dispfile_optionfile: OPTIONFILE,
            dispfile_optmenu: OPTMENUHELP,
            dispfile_usagehelp: USAGEHELP,
            dispfile_license: LICENSE,
            dispfile_debughelp: DEBUGHELP,
        };
        const dispfile = picked && DISPFILE_TOPICS[picked.f];
        const filelines = dispfile ? dlb_file_lines(dispfile) : null;
        if (picked && picked.f === 'hmenu_doextversion') {
            g._pending_message = '';
            await display_text_window(doextversion());
            g._pending_message = '';
            await flush_screen(1);
            return ECMD_OK;
        }
        /* pager.c:2795-2805 hmenu_dowhatis() — a bare dowhatis(), the same '/'
         * command the map already reaches. */
        if (picked && picked.f === 'hmenu_dowhatis') {
            /* dowhatis() itself clears or leaves the topline per arm (the map-scan
             * arms end on a standing pline, e.g. look_traps' "No traps seen or
             * remembered."), so no blanket wipe here. */
            await dowhatis();
            await flush_screen(1);
            return ECMD_OK;
        }
        if (picked && picked.f === 'hmenu_dowhatdoes') {
            await dowhatdoes();
            await flush_screen(1);
            return ECMD_OK;
        }
        /* pager.c:2813-2818 hmenu_doextlist() — a bare doextlist(), the same
         * 'A'-less listing '#?' reaches; it is its own NHW_MENU, not a text
         * window, and it returns once the menu is dismissed. */
        if (picked && picked.f === 'hmenu_doextlist') {
            g._pending_message = '';
            await doextlist(false);
            g._pending_message = '';
            await flush_screen(1);
            return ECMD_OK;
        }
        /* pager.c:2820-2827 domenucontrols() and pager.c:2714-2744 docontact():
         * each builds one NHW_TEXT window and display_nhwindow()s it, exactly
         * like the dispfile_* arm below but from generated text rather than a
         * dat file. */
        if (picked && (picked.f === 'domenucontrols' || picked.f === 'docontact'
                       || picked.f === 'dokeylist' || picked.f === 'option_help')) {
            g._pending_message = '';
            await (picked.f === 'domenucontrols' ? domenucontrols()
                   : picked.f === 'docontact' ? docontact()
                   : picked.f === 'option_help' ? option_help()
                   : dokeylist());
            g._pending_message = '';
            await flush_screen(1);
            return ECMD_OK;
        }
        if (filelines) {
            g._pending_message = '';
            await display_text_window(filelines);
            g._pending_message = '';
            await flush_screen(1);
            return ECMD_OK;
        }
        // C: (*help_menu_items[sel].f)() — runs the sub-function which ends with
        // one nhgetch() for the pager dismiss ("--More--" or window close key).
        // JS: consume that one additional dismiss key to keep the stream aligned.
        //
        // Every surviving row is dispatched above: the eight dispfile_*/hmenu_dohistory
        // topics through dlb_file_lines() + display_text_window() (they reach here
        // only if dlb_file_lines() returns null, i.e. C's "Cannot open" arm),
        // and hmenu_doextversion / hmenu_dowhatis / hmenu_dowhatdoes /
        // hmenu_doextlist / option_help / dokeylist / domenucontrols / docontact
        // through their own explicit arms above.
        //
        // The selection test above is BOUNDED to the selectors this menu
        // actually added ('a' .. lastSelector), and that is C-faithful, not a
        // convenience: every add_menu() here passes ch == 0, so `gacc` is
        // empty and tty_end_menu() assigns menu_ch sequentially from 'a' over
        // the added rows — fifteen of them outside wizard mode, i.e. a..o.  A
        // key outside that set hits process_menu_window's `default:` arm
        // (wintty.c:1730-1735): tty_nhbell(), the page is redrawn, and the
        // menu stays up, which is what the retry loop above reproduces.  An
        // earlier note here claimed the deliberately-broader "any letter" test
        // narrowing it "would change their key accounting for no gain".  That
        g._pending_message = '';
        await flush_screen(1);
        await nhgetch();  /* pager dismiss key (space/ESC) */
    }
    g._pending_message = '';
    await flush_screen(1);
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: pager.c:68-76 is_swallow_sym(c) — TRUE when the displayed character is
 * one of gs.showsyms[S_sw_tl..S_sw_br], the eight cells of a swallowing
 * monster's stomach.  do_screen_description (pager.c:1305-1322) opens the class
 * list with "the interior of a monster" for such a character and KEEPS GOING,
 * so a wall whose glyph collides with a stomach cell reads "the interior of a
 * monster or a wall".  The default (ASCII) swallow syms are the eight box
 * characters '/', '-', '\', '|', '|', '\', '-', '/' (defsym.h); `start:
 * DECgraphics` overrides only S_sw_tc (\xef -> 'o'), S_sw_ml and S_sw_mr
 * (\xf8 -> 'x', the SAME vertical rule S_vwall uses) and S_sw_bc (\xf3 -> 's'),
 * so under DECgraphics a vertical wall collides and a horizontal one
 * ('q') does not. */
const S_sw_tl = 88, S_sw_br = 95;

const SWALLOW_DEFAULT_ASCII = ['/', '-', '\\', '|', '|', '\\', '-', '/'];

const SWALLOW_DEFAULT_DEC = [0x2f, 0xef, 0x5c, 0xf8, 0xf8, 0x5c, 0xf3, 0x2f];

export function is_swallow_sym(ch, dec) {
    const showsyms = pager_showsyms();
    const decMode = dec_mode();
    for (let i = S_sw_tl; i <= S_sw_br; i++) {
        const s = showsyms?.[i] ?? (decMode ? SWALLOW_DEFAULT_DEC[i - S_sw_tl] : SWALLOW_DEFAULT_ASCII[i - S_sw_tl]);
        const sc = typeof s === 'number' ? String.fromCharCode(s & 0x7f) : String(s);
        const sd = typeof s === 'number' && s > 0x7f;
        if (sc === ch && sd === !!dec)
            return true;
    }
    return false;
}

/* C ref: getpos.c:781-793 mMoOdDxX_def[] resolved through gc.Cmd.spkeys — the
 * default bindings are cmd.c:3175-3186 getpos.mon/obj/door/unexplored/all/valid
 * .next|.prev.  ORDER IS LOAD-BEARING: getpos.c:1015-1016 derives the gloc as
 * (index >> 1) and the direction as (index & 1), so this reads
 * MONS, OBJS, DOOR, EXPLORE, INTERESTING, VALID — 'a' BEFORE 'z', matching the
 * GLOC_* enum (js/const.js:925-931).  (The old membership-test-only spelling in
 * getpos's key-eater arm had z/Z and a/A the other way round.) */
const _GETPOS_GLOC_KEYS = 'mMoOdDxXaAzZ';

/* the cmode every look_* entry uses (pager.c:2023, 2098, 2200) */
function _getpos_cmode() {
    const gp = game.iflags?.getpos_coords;
    return (gp && gp !== GPCOORDS_NONE) ? gp : GPCOORDS_MAP;
}

/* C ref: Sprintf(outbuf, "%8s  ", coordbuf) / "%s  " / "%12s  " */
function _coord_field(coordbuf, cmode) {
    if (cmode === GPCOORDS_SCREEN)
        return coordbuf;
    const width = (cmode === GPCOORDS_MAP) ? 8 : 12;
    return coordbuf.length >= width ? coordbuf
                                    : ' '.repeat(Math.max(0, width - coordbuf.length)) + coordbuf;
}

/* C ref: hacklib.c strkitten(buf, c) — append one character. */
function strkitten_cmd(s, c) { return s + c; }

/* C ref: pager.c:1964-1973 look_region_nearby.  BOLT_LIM is the /m,/o,/t,/e
 * "nearby" radius; the capitalized commands scan the whole map. */
function look_region_nearby(nearby) {
    const u = game.u || {};
    const ux = u.ux | 0, uy = u.uy | 0;
    return {
        lo_y: nearby ? Math.max(uy - BOLT_LIM, 0) : 0,
        lo_x: nearby ? Math.max(ux - BOLT_LIM, 1) : 1,
        hi_y: nearby ? Math.min(uy + BOLT_LIM, ROWNO - 1) : ROWNO - 1,
        hi_x: nearby ? Math.min(ux + BOLT_LIM, COLNO - 1) : COLNO - 1,
    };
}

const glyph_is_trap = (g) => g?.cls === GLYPHCLS_TRAP;

const glyph_to_trap = (g, x, y) => g?.ttyp ?? t_at(x, y)?.ttyp;

const glyph_is_monster = (g) => g?.cls === GLYPHCLS_MON && !g.isWarning;

const glyph_is_invisible = (g) => g?.cls === GLYPHCLS_INVIS;

const glyph_is_object = (g) => g?.cls === GLYPHCLS_OBJ;

const glyph_to_warning = (g) => {
    if (Number.isInteger(g?.warningLevel)) return g.warningLevel;
    const ch = g?.ch;
    const showsyms = pager_showsyms();
    if (showsyms) {
        for (let i = 0; i < def_warnsyms.length; i++) {
            const s = showsyms[184 /* SYM_OFF_W */ + i];
            if (s != null && (typeof s === 'number' ? String.fromCharCode(s & 0x7f) : String(s)) === ch)
                return i;
        }
    }
    const idx = def_warnsyms.findIndex((w) => w && w.ch === ch);
    return idx >= 0 ? idx : (Number(ch) | 0);
};

/* C ref: display.c encglyph(glyph) + putmixed() — encglyph packs the glyph into
 * an escape the window port decodes back to the glyph's screen symbol, so what
 * actually reaches the text window is the symbol character (uncolored: the
 * recorded C frames carry no SGR on these lines). */
function _encglyph(g0) { return pager_text_glyph(g0); }

const ENCGLYPH_LEN = 10; /* windows.c:1432: "\\G%04X%04X" */

/* C ref: pager.c:107-131 self_lookat(outbuf) — "<race> <pmname> called <plname>".
 * _self_lookat_base() is the part before " called " (do_look's data.base key,
 * pager.c:950-962 strips the suffix). */
function _self_lookat_base() {
    const g = game, u = g.u || {};
    const upolyd = Upolyd(u);
    const female = !!(g.flags && g.flags.female);
    if (!upolyd) {
        const raceAdj = (g.urace && g.urace.adj) || 'human';
        const roleName = ((female && g.urole?.name?.f) || g.urole?.name?.m
                          || 'Adventurer').toLowerCase();
        return `${raceAdj} ${roleName}`;
    }
    const row = monPmnamesPack.pmnames[u.umonnum | 0];
    /* C pager.c:116 pmname(gy.youmonst.data, Ugender); you.h:555 Ugender reads
     * u.mfemale while Upolyd (the saved human sex -- polymon flips
     * flags.female for the new form, polyself.c:765,800). */
    const gender = u.mfemale ? 1 : 0; /* MALE=0 FEMALE=1 NEUTRAL=2 */
    return (row && (row[gender] || row[2])) || 'creature';
}

export async function self_lookat() {
    /* C pager.c:116-118 — "invisible " when Invis (youprop.h:Invis = (HInvis ||
     * EInvis) && !BInvis) and the hero can sense herself or is not Blind
     * (senseself() = Unblind_telepat || Detect_monsters, display.h). */
    const up = game.u?.uprops || [];
    const _p = (i) => up[i] || {};
    const _i = (i) => !!(_p(i).intrinsic | 0), _e = (i) => !!(_p(i).extrinsic | 0);
    const _blind = !!_vision_Blind();
    const _invis = (_i(INVIS) || _e(INVIS)) && !(_p(INVIS).blocked | 0);
    const _senseself = _e(TELEPAT) || (_i(TELEPAT) && !_blind)
        || _i(DETECT_MONSTERS) || _e(DETECT_MONSTERS);
    let buf = `${_invis && (_senseself || !_blind) ? 'invisible ' : ''}`
        + `${_self_lookat_base()} called ${game.plname || ''}`;
    if (game.u?.usteed) buf += `, mounted on ${y_monnam(game.u.usteed)}`;
    /* C pager.c:122-125 — `if (u.uundetected || (Upolyd && U_AP_TYPE) ||
     * visible_region_at(u.ux, u.uy)) mhidden_description(&gy.youmonst,
     * MHID_PREFIX|MHID_ARTICLE|MHID_REGION, eos(outbuf));`. */
    if (game.u?.uundetected || (Upolyd(game.u) && M_AP_TYPE(game.youmonst))
        || visible_region_at(game.u?.ux | 0, game.u?.uy | 0) !== null)
        buf += await mhidden_description(game.youmonst, game.u.ux, game.u.uy);
    if (_st_Punished()) {
        const uball = game.u?.uball || null;
        // C pager.c:129 -> objnam.c:1077: minimal_xname's distant_name
        // suppresses discovery; the local _ansimpleoname copy observes types.
        buf += `, chained to ${uball ? ansimpleoname(uball) : 'nothing?'}`;
    }
    // hero in a pit (steps[809]) reads "..., trapped in a pit" in C; the old
    if (game.u?.utrap) buf += `, ${trap_predicament(0, false)}`;
    return buf;
}

/* C ref: pager.c:137-163 monhealthdescr — the whole body is #if 0'd out in 3.7,
 * so it always yields the empty string.  Ported as the bug it is (Cardinal
 * Rule 1): look_at_monster() and done_in_by() get no health adjective. */
function monhealthdescr(mon, addspace) { void mon; void addspace; return ''; }

/* C ref: pager.c:421-555 look_at_monster(). */
export async function look_at_monster(mtmp, x, y, monbuf = null) {
    const g = game, u = g.u || {};
    const accurate = !_cmd_Hallucination();
    const name = (((mtmp.data?.pmidx) | 0) === PM_COYOTE && accurate)
        ? coyotename(mtmp)
        : distant_monnam(mtmp, 0 /* ARTICLE_NONE */);
    let buf = ((mtmp.mx !== x || mtmp.my !== y)
                 ? ((mtmp.isshk && accurate) ? 'tail of ' : 'tail of a ') : '')
            + (accurate ? monhealthdescr(mtmp, true) : '')
            + ((mtmp.mtame && accurate) ? 'tame '
               : (mtmp.mpeaceful && accurate) ? 'peaceful ' : '')
            + name;
    if (u.ustuck === mtmp) {
        /* C pager.c:444-450 distinguishes the holder and swallowed forms. */
        if (u.uswallow || g.iflags?.save_uswallow)
            buf += _digests(mtmp.data) ? ', swallowing you' : ', engulfing you';
        else
            buf += (Upolyd(u) && sticks(g.youmonst?.data))
                ? ', being held' : ', holding you';
    }
    if (mtmp.mfrozen)
        buf += ", can't move (paralyzed or sleeping or busy)";
    else if (mtmp.msleeping)
        buf += ', asleep';
    else if ((mtmp.mstrategy | 0) & STRAT_WAITMASK)
        buf += ', meditating';
    if (mtmp.mleashed)
        buf += ', leashed to you';
    if (mtmp.mtrapped && cansee(mtmp.mx, mtmp.my)) {
        const t = t_at(mtmp.mx, mtmp.my);
        const tt = t ? (t.ttyp | 0) : 0 /* NO_TRAP */;
        if (tt === BEAR_TRAP_TTYP || is_pit(tt) || tt === WEB_TTYP) {
            buf += `, trapped in ${an(makemon_trapname(tt, false))}`;
            t.tseen = 1; /* C: newsym lets you know of the trap */
        }
    }
    if (mtmp.mundetected || M_AP_TYPE(mtmp) || visible_region_at(x, y) !== null)
        buf += await mhidden_description(mtmp, x, y);
    if (monbuf)
        monbuf.value = monster_seen_description(mtmp);
    return buf;
}

/* C ref: pager.c:186-279 mhidden_description(mon, mhid_flags, outbuf), called
 * with MHID_PREFIX | MHID_ARTICLE | MHID_REGION from look_at_monster.
 * mstatusline additionally requests MHID_ALTMON via showAltmon.
 *
 * The `glyph` it consults is HERO MEMORY (levl[x][y].glyph) when the level has
 * hero_memory and the subject is not the hero — deliberately NOT glyph_at(),
 * which is the monster itself.  That is what makes a DETECTED mimic read
 * ", mimicking something": the hero remembers nothing at that square, so the
 * object arm's `glyph_is_object(glyph)` test fails and C falls to `something`. */
const ceiling_hider = pooleffects_ceiling_hider;

export async function mhidden_description(mon, x, y, showAltmon = false) {
    const apType = M_AP_TYPE(mon);
    const isyou = is_youmonst(mon);
    x = isyou ? (game.u?.ux | 0) : (mon.mx | 0);
    y = isyou ? (game.u?.uy | 0) : (mon.my | 0);
    /* C pager.c:201-202 — remembered glyph, not glyph_at(). */
    const loc = _levlAt(x, y);
    const glyph = (game.level?.flags?.hero_memory && !isyou)
        ? (loc && loc.remembered_glyph) : _glyph_at(x, y);
    let outbuf = '';
    if (apType === M_AP_FURNITURE || apType === M_AP_OBJECT) {
        outbuf = ', mimicking ';          /* MHID_PREFIX */
        if (apType === M_AP_FURNITURE) {
            outbuf += an(DEFSYM_EXPLANATION[mon.mappearance | 0] || 'thing'); /* pager.c:210-213 */
        } else if (apType === M_AP_OBJECT && glyph_is_object(glyph)) {
            /* C pager.c:217-230 objfrommap: name the remembered object glyph. */
            const { obj, fakeobj } = await look_at_object(x, y, glyph, false, true);
            const nm = (obj && (obj.otyp | 0) !== 0) ? _ia_simpleonames(obj)
                                                    : 'strange object';
            const what = (!obj || (obj.quan | 0) === 1) ? an(nm) : nm;
            if (fakeobj && obj) { obj.where = 0; await dealloc_obj(obj); }
            outbuf += what;
        } else {
            /* C pager.c:232 — `Strcat(outbuf, something);` (hack.h: "something") */
            outbuf += 'something';
        }
    } else if (apType === M_AP_MONSTER) {
        /* C pager.c:234-242: probing passes MHID_ALTMON; looking does not. */
        if (showAltmon)
            outbuf = ', masquerading as ' + an(monPmname(mon.mappearance, _Mgender(mon)));
    } else if (isyou ? game.u?.uundetected : mon.mundetected) {
        /* C pager.c:243-259 */
        outbuf = ', hiding';
        const mf1 = (mon.data?.mflags1 | 0) >>> 0;
        if (mf1 & 0x00000080 /* M1_CONCEAL: hides_under */) {
            outbuf += ' under ';
            if (glyph_is_object(glyph)) {
                const { obj, fakeobj } = await look_at_object(x, y, glyph, false, true);
                const nm = (obj && (obj.otyp | 0) !== 0) ? _ia_simpleonames(obj)
                                                        : 'strange object';
                const what = (!obj || (obj.quan | 0) === 1) ? an(nm) : nm;
                if (fakeobj && obj) { obj.where = 0; await dealloc_obj(obj); }
                outbuf += what;
            } else {
                outbuf += 'something';
            }
        } else if (mf1 & 0x00000100 /* M1_HIDE: is_hider */) {
            outbuf += ` on the ${ceiling_hider(mon.data) ? 'ceiling' : surface(x, y)}`;
        } else if ((mon.data?.mlet | 0) === 57 /* S_EEL */ && is_pool(x, y)) {
            outbuf += ' in murky water';
        }
    }
    /* C pager.c:262-279 — the MHID_REGION tail is applied to outbuf after the
     * whole if/else chain when strlen(outbuf) < BUFSZ - 1. */
    let buflen;
    if (visible_region_at(x, y) !== null && (buflen = outbuf.length) < BUFSZ - 1)
        outbuf += _mhidden_region_tail(x, y).slice(0, BUFSZ - 1 - buflen);
    return outbuf;
}

/* C pager.c:2335-2389. Detected chest/door glyphs are not ftrap nodes. */
export async function doidtrap() {
    if (!(await getdir('^')))
        return ECMD_CANCEL;
    const u = game.u;
    const x = u.ux + u.dx, y = u.uy + u.dy;
    const glyph = _glyph_at(x, y);
    let tt;
    if (glyph_is_trap(glyph)
        && ((tt = glyph_to_trap(glyph, x, y)) === BEAR_TRAP
            || tt === TRAPPED_DOOR || tt === TRAPPED_CHEST)) {
        const chesttrap = trapped_chest_at(tt, x, y);
        if (chesttrap || trapped_door_at(tt, x, y)) {
            await pline(`That is a trapped ${chesttrap ? 'chest' : 'door'}.`);
            return ECMD_OK;
        }
    }
    for (let trap = game.ftrap; trap; trap = trap.ntrap) {
        if (trap.tx !== x || trap.ty !== y) continue;
        if (!trap.tseen) break;
        const tt = trap.ttyp;
        if (u.dz && (u.dz < 0 ? is_hole(tt) : tt === ROCKTRAP)) break;
        await pline(`That is ${an(trapname(tt, false))}${!trap.madeby_u ? ''
            : tt === WEB ? ' woven' : (tt === HOLE || tt === PIT) ? ' dug' : ' set'}${
                !trap.madeby_u ? '' : ' by you'}.`);
        return ECMD_OK;
    }
    await pline("I can't see a trap there.");
    return ECMD_OK;
}

/* C pager.c:165-181: detection predicates can draw while hallucinating. */
export function trap_description(tnum, x, y) {
    if (trapped_chest_at(tnum, x, y))
        return 'trapped chest'; /* might actually be a large box */
    if (trapped_door_at(tnum, x, y))
        return 'trapped door'; /* not "trap door"... */
    return trapname(tnum, false);
}

/* C ref: pager.c:379-418 look_at_object(buf, x, y, glyph) → object_from_map()
 * then distant_name(otmp, dknown ? doname_with_price : doname_vague_quan).
 * object_from_map's vobj_at(x,y) is this port's per-tile levelObjects table. */
export async function look_at_object(x, y, painted = _glyph_at(x, y), hidden = false, mapObjectOnly = false) {
    /* C pager.c:292-296:
     *     int glyphotyp = glyph_is_object(glyph) ? glyph_to_obj(glyph)
     *                     : glyph_is_cmap(glyph)
     *                       ? (sobj_at(CHEST, x, y) ? CHEST : LARGE_BOX)
     *                       : STRANGE_OBJECT; */
    const glyphotyp = Number.isInteger(painted?.otyp) ? painted.otyp
        : painted?.cls === GLYPHCLS_CMAP
          ? (sobj_at(_LD_CHEST, x, y) ? _LD_CHEST : _LD_LARGE_BOX)
          : null;
    let obj = game.level?.levelObjects?.[x]?.[y] ?? null;
    let fakeobj = false;
    let mimic = null;
    let mimic_obj = false;
    if (glyphotyp !== null) {
        for (let scan = obj; scan; scan = scan.nexthere) {
            if ((scan.otyp | 0) === glyphotyp) {
                obj = scan;
                break;
            }
            if (!scan.nexthere)
                obj = null;
        }
        if (!obj) {
            for (let b = game.level?.buriedobjlist; b; b = b.nobj)
                if ((b.ox | 0) === x && (b.oy | 0) === y
                    && (b.otyp | 0) === glyphotyp) {
                    obj = b;
                    break;
                }
        }
        mimic = m_at(x, y);
        if (mimic && M_AP_TYPE(mimic) === M_AP_OBJECT
            && (mimic.mappearance | 0) === glyphotyp) {
            obj = null;
            mimic_obj = true;
        } else {
            mimic = null;
        }
        if (!obj) {
            /* C pager.c:318-330 object_from_map: a regular object is made with
             * mksobj(otyp, FALSE, FALSE); a nameless slot (hallucinated glyph
             * of a shuffled-out item) instead gets mkobj(oc_class, FALSE),
             * which first draws rnd(oclass_prob_totals[class]). */
            obj = _objName_full(glyphotyp)
                ? (await mksobj(glyphotyp, false, false))
                : (await _fl_mkobj(MKOBJ_OC_CLASS[glyphotyp] | 0, false));
            if (obj) {
                if (obj.timed) obj_stop_timers(obj); // C pager.c:331-332: temporary map objects must not keep timers.
                fakeobj = true;
                obj.where = 1;
                obj.ox = x;
                obj.oy = y;
                if ((obj.oclass | 0) === OCLASS_COIN)
                    obj.quan = 2; /* C forces pluralisation for a fake coin */
                else if ((obj.otyp | 0) === 285 /* SLIME_MOLD */)
                    /* C pager.c:336-337 — "give it a type": a fake slime mold
                     * takes current_fruit, else xname() finds no fruit (#0). */
                    obj.spe = game.svc?.context?.current_fruit | 0;
                if (mimic && MCORPSENM(mimic) !== NON_PM) {
                    /* C pager.c:338-345 — a mimic posing as corpse/statue
                     * carries its own mcorpsenm into the temporary object,
                     * outranking the glyph's. */
                    if ((obj.otyp | 0) === 285 /* SLIME_MOLD */)
                        obj.spe = MCORPSENM(mimic);
                    else
                        obj.corpsenm = MCORPSENM(mimic);
                } else if ((glyphotyp === 265 /* CORPSE */ || glyphotyp === STATUE_OTYP)
                    && Number.isInteger(painted.corpsenm))
                    obj.corpsenm = painted.corpsenm;
                if ((obj.otyp | 0) === 236 /* LEASH */)
                    /* C pager.c:351-352 — a fake leash is not leashed to
                     * anything (leashmon overloads corpsenm). */
                    obj.leashmon = 0;
                /* C pager.c:356 */
                obj.no_charge = ((obj.otyp | 0) === 0 /* STRANGE_OBJECT */
                                 && shk_costly_spot(x, y)) ? 1 : 0;
            }
        }
    }
    let buf;
    if (obj) {
        const _odx = x - (game.u?.ux | 0), _ody = y - (game.u?.uy | 0);
        if ((_odx * _odx + _ody * _ody) <= 2
            && !_uprop_active('BLINDED') && !_uprop_active('HALLUC')
            && (fakeobj || (obj.where | 0) === 1)
            && !(game.iflags && game.iflags.terrainmode))
            observe_object(obj);
        if (fakeobj && mimic_obj && obj
            && (obj.dknown || ((mimic.m_ap_type | 0) & M_AP_F_DKNOWN))) {
            /* C pager.c:370-374 object_from_map */
            mimic.m_ap_type = (mimic.m_ap_type | 0) | M_AP_F_DKNOWN;
            observe_object(obj);
        }
        if (mapObjectOnly) return { obj, fakeobj }; // do_name.c:701 / pager.c:219: stop before look_at_object's naming.
        if (hidden) {
            const name = obj.otyp ? _ia_simpleonames(obj) : 'strange object';
            if (fakeobj) { obj.where = 0; await dealloc_obj(obj); }
            return name;
        }
        /* C pager.c:389-396:
         *     Strcpy(buf, (otmp->otyp != STRANGE_OBJECT)
         *                  ? distant_name(otmp, otmp->dknown ? doname_with_price
         *                                                    : doname_vague_quan)
         *                  : obj_descr[STRANGE_OBJECT].oc_name); */
        buf = ((obj.otyp | 0) !== 0 /* STRANGE_OBJECT */)
            ? await _fw_distant_name(obj, obj.dknown ? _doname_with_price
                                                     : _fw_doname_vague_quan)
            : 'strange object';
        if (fakeobj) {
            obj.where = 0;
            await dealloc_obj(obj);
            obj = null;
        }
    } else {
        if (mapObjectOnly) return { obj: null, fakeobj: false };
        buf = 'something'; /* C: Strcpy(buf, something) sanity precaution */
    }
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    /* C pager.c:401-417 */
    if (obj && !fakeobj && (obj.where | 0) === 6 /* OBJ_BURIED */)
        buf += ' (buried)';
    else if (IS_TREE(typ))
        buf += ` ${obj && is_treefruit(obj) ? 'dangling' : 'stuck'} in a tree`;
    else if (typ === STONE || typ === SCORR)
        buf += ' embedded in stone';
    else if (IS_WALL(typ) || typ === SDOOR)
        buf += ' embedded in a wall';
    else if (closed_door(x, y))
        buf += ' embedded in a door';
    else if (is_pool(x, y))
        buf += ' in water';
    else if (is_lava(x, y))
        buf += ' in molten lava';
    return buf;
}

/* C ref: pager.c:1977-2073 look_all(nearby, do_mons) — the '/m', '/M', '/o' and
 * '/O' map scans.  Builds an NHW_TEXT window of every currently-shown monster
 * (or object) in the region and displays it, or plines when nothing matched. */
async function look_all(nearby, do_mons) {
    const g = game, u = g.u || {};
    const lines = [];
    let count = 0;
    const { lo_x, lo_y, hi_x, hi_y } = look_region_nearby(nearby);
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf = '';
            const glyph = _glyph_at(x, y);
            if (do_mons) {
                if (glyph_is_monster(glyph)) {
                    let mtmp;
                    if (u_at(x, y) && canspotself()) {
                        lookbuf = await self_lookat();
                        ++count;
                    } else if ((mtmp = m_at(x, y)) != null) {
                        lookbuf = await look_at_monster(mtmp, x, y);
                        ++count;
                    }
                } else if (glyph_is_invisible(glyph)) {
                    /* remembered, unseen, creature (pager.c:63 invisexplain) */
                    lookbuf = 'remembered, unseen, creature';
                    ++count;
                } else if (glyph && glyph_is_warning_at(x, y)) {
                    // C pager.c:2009-2014: describe the warning glyph's level.
                    const warnindx = glyph_to_warning(glyph);
                    lookbuf = def_warnsyms[warnindx]?.desc || '';
                    ++count;
                }
            } else { /* !do_mons */
                if (glyph_is_object(glyph)) {
                    lookbuf = (await look_at_object(x, y));
                    ++count;
                }
            }
            if (lookbuf) {
                const cmode = _getpos_cmode();
                if (count === 1) {
                    const which = do_mons ? 'monsters' : 'objects';
                    lines.push(nearby
                        ? `${upstart(which)} currently shown near ${
                              (cmode !== GPCOORDS_COMPASS)
                                ? coord_desc(u.ux | 0, u.uy | 0, cmode)
                                : (!canspotself() ? 'your position' : 'you')}:`
                        : `All ${which} currently shown on the map:`);
                    /* hack alert! Qt watches a text window for any line with 4
                       consecutive spaces … (pager.c:2040) */
                    lines.push('    '); /* separator */
                }
                let coordbuf = coord_desc(x, y, cmode);
                /* this format wrinkle makes the commas of <x,y> line up
                   (pager.c:2044-2052) */
                if (cmode === GPCOORDS_MAP && y < 10)
                    coordbuf = strkitten_cmd(coordbuf, ' ');
                /* prefix: "coords  C  " where 'C' is the mon or obj symbol */
                const outbuf = `${_coord_field(coordbuf, cmode)}  ${_encglyph(glyph)}  `;
                /* guard against potential overflow (pager.c:2061) */
                lookbuf = pager_mixed_text(lookbuf.slice(0, BUFSZ - outbuf.length - ENCGLYPH_LEN));
                lines.push(outbuf + lookbuf);
            }
        }
    }
    if (count)
        await display_text_window(lines);
    else
        await pline(`No ${do_mons ? 'monsters' : 'objects'} are currently shown ${
                        nearby ? 'nearby' : 'on the map'}.`);
}

/* C ref: pager.c:2076-2139 look_traps(nearby) — '/t' and '/T'. */
async function look_traps(nearby) {
    const lines = [];
    let count = 0;
    const { lo_x, lo_y, hi_x, hi_y } = look_region_nearby(nearby);
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf = '';
            let glyph = _glyph_at(x, y);
            let t;
            if (glyph && glyph.cls === 'trap') {
                /* C: tnum = glyph_to_trap(glyph), including detected boxes. */
                t = t_at(x, y);
                lookbuf = trap_description(glyph.ttyp ?? t?.ttyp ?? 0, x, y);
                ++count;
            } else if ((t = t_at(x, y)) != null && (t.tseen | 0)
                       /* can't use /" to track traps moved by bubbles or clouds
                          except when hero has direct line of sight */
                       && ((!Is_waterlevel(game.u?.uz) && !Is_airlevel(game.u?.uz))
                           || couldsee(x, y))) {
                lookbuf = `${trapname(t.ttyp | 0, false)}, obscured by ${_encglyph(glyph)}`;
                glyph = { cmap: _trap_to_defsym(t.ttyp), cls: GLYPHCLS_TRAP, ttyp: t.ttyp };
                ++count;
            }
            if (lookbuf) {
                const cmode = _getpos_cmode();
                if (count === 1) {
                    lines.push(upstart(`${nearby ? 'nearby ' : ''}seen or remembered traps${
                                            nearby ? '' : ' on this level'}:`));
                    lines.push('    '); /* separator (Qt fixed-width hack) */
                }
                /* prefix: "coords  C  " where 'C' is the trap symbol */
                const outbuf = `${_coord_field(coord_desc(x, y, cmode), cmode)}  ${_encglyph(glyph)}  `;
                /* guard against potential overflow (pager.c:2128) */
                lookbuf = lookbuf.slice(0, BUFSZ - outbuf.length - ENCGLYPH_LEN);
                lines.push(outbuf + pager_mixed_text(lookbuf));
            }
        }
    }
    if (count)
        await display_text_window(lines);
    else
        await pline(`No traps seen or remembered${nearby ? ' nearby' : ''}.`);
}

/* C ref: pager.c:1629-1666 add_quoted_engraving(x, y, buf, force).  force is TRUE
 * from look_engrs, so the engraving text is appended whatever buf holds. */
export function add_quoted_engraving(x, y, buf, force) {
    const ep = engr_at(x, y);
    const floorengr = (buf === ' (engraving'), headstone = (buf === ' (grave');
    if (!ep) return { buf, found: false };
    if (!floorengr && !headstone && !force) return { buf, found: false };
    if (ep.eread)
        buf += ` with ${headstone ? 'headstone reading' : 'remembered text'}: "${ep.remembered ?? ep.text ?? ''}"`;
    else
        buf += ` ${headstone ? 'whose headstone' : 'that'} you haven't read`;
    buf = buf.slice(0, BUFSZ - 1); /* pager.c:1662: strncat's remaining space */
    return { buf, found: true };
}

/* C ref: pager.c:2141-2228 look_engrs(nearby) — '/e' and '/E'. */
async function look_engrs(nearby) {
    const lines = [];
    let count = 0;
    const { lo_x, lo_y, hi_x, hi_y } = look_region_nearby(nearby);
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            const loc = game.level?.at(x, y);
            if (!loc || !loc.seenv)
                continue;
            const e = engr_at(x, y);
            if (!e)
                continue;
            const is_headstone = IS_GRAVE(loc.lastseentyp);
            let lookbuf = ` (${is_headstone ? 'grave' : 'engraving'}`;
            ({ buf: lookbuf } = add_quoted_engraving(x, y, lookbuf, true));
            /* the paren is used by farlook and add_quoted_engraving() expected
               to see it; we don't want it here (pager.c:2172-2183) */
            if (is_headstone) {
                lookbuf = strsubst(lookbuf, '(grave with ', '');
                lookbuf = strsubst(lookbuf, '(grave whose ', '');
            } else {
                lookbuf = strsubst(lookbuf, '(engraving with ', '');
                lookbuf = strsubst(lookbuf, '(engraving ', 'engraving ');
            }
            let glyph = _glyph_at(x, y);
            /* C pager.c:2183-2184 also accepts the S_grave cmap glyph. */
            if (glyph && (glyph.cls === 'engr'
                          || (glyph.cls === GLYPHCLS_CMAP && glyph.cmap === S_grave))) {
                /* engraving or grave+headstone shown on the map */
                ++count;
            } else {
                /* engraving or grave covered by object(s) */
                lookbuf += `, obscured by ${_encglyph(glyph)}`;
                /* C pager.c:2191-2192: retain cmap identity so putmixed
                 * resolves the active symbol, independently of map paint. */
                glyph = { cmap: is_headstone ? S_grave
                                  : loc.typ === CORR ? S_engrcorr : S_engroom,
                          cls: 'engr' };
                ++count;
            }
            if (lookbuf) { /* (redundant) */
                const cmode = _getpos_cmode();
                if (count === 1) {
                    lines.push(upstart(`${nearby ? 'nearby ' : ''}seen or remembered engravings${
                                            nearby ? '' : ' on this level'}:`));
                    lines.push('    '); /* separator (Qt fixed-width hack) */
                }
                /* prefix: "coords  C " where 'C' is the engrvng|grave symbol —
                 * note ONE trailing space here, unlike look_all/look_traps
                 * (pager.c:2219). */
                const outbuf = `${_coord_field(coord_desc(x, y, cmode), cmode)}  ${_encglyph(glyph)} `;
                lines.push(outbuf + pager_mixed_text(lookbuf.slice(0, BUFSZ - outbuf.length - ENCGLYPH_LEN)));
            }
        }
    }
    if (count)
        await display_text_window(lines);
    else
        await pline(`No engravings seen or remembered${nearby ? ' nearby' : ''}.`);
}

/* C ref: pager.c:1009 / pager.c:1853 — checkfile(str, NULL,
 * chkfilUsrTyped | chkfilDontAsk, NULL): look the string up in dat/data.base and
 * display each matching entry, with no "More info about ...?" confirmation.
 * Returns TRUE when at least one entry was displayed (checkfile's `res`). */
async function checkfile_usrtyped(str, statusClipCol) {
    const { windows, noInfo } = checkfile_lookup(str);
    for (const lines of windows)
        await dbase_display_window(lines, statusClipCol);
    if (noInfo) {
        /* C ref: pager.c:1114-1116 */
        await pline("You don't have any information on those things.");
    }
    return windows.length > 0;
}

/* C pager.c:2231-2314.  Preserve the without_asking bug: that path never
 * sets yes_to_moreinfo, so a verbose lookup does not show supplemental lore. */
async function do_supplemental_info(name, pm, without_asking) {
    if (!thit_is_orc(pm) || name.length >= (BUFSZ - 1))
        return;
    const bp = name.toLowerCase().indexOf(' of ');
    const bp2 = name.toLowerCase().indexOf(' the fence');
    if (bp === -1 && bp2 === -1)
        return;
    const fullname = name;
    let yes_to_moreinfo = false;
    if (!without_asking) {
        const prefix = 'More info about "';
        const question = prefix + name.slice(0, QBUFSZ_CMD - 1 - prefix.length - 2) + '"?';
        yes_to_moreinfo = (await yn_function(question, 'yn', 'n', true)) === 'y';
    }
    if (yes_to_moreinfo) {
        const text = bp !== -1 ? [
            `${fullname} is a member of a marauding horde of orcs`,
            'rumored to have brutally attacked and plundered',
            'the ordinarily sheltered town that is located ',
            'deep within The Gnomish Mines.',
            '',
            'The members of that vicious horde proudly and ',
            'defiantly acclaim their allegiance to their',
            `leader ${name.slice(bp + 4)} in their names.`,
        ] : [
            `"${fullname}" is the common dungeon name of`,
            'a nefarious orc who is known to acquire property',
            'from thieves and sell it off for profit.',
            '',
            'The perpetrator was last seen hanging around the',
            'stairs leading to the Gnomish Mines.',
        ];
        await dbase_display_window(text);
    }
}

// C ref: pager.c:2322 dowhatis() → do_look(0, (coord *) 0) — the '/' whatis command.
// Shows a menu "What do you want to look at:" and processes the selection.
// See doc comment on doquickwhatis (below) for the full C do_look flow.
// RNG: zero.  Turn: no (GENERALCMD, returns ECMD_OK).
export async function dowhatis() {
    const g = game;
    const u = g.u || {};
    /* ── Build the whatis menu (C ref: pager.c:1700-1803 add_menu calls) ──
     * add_menu's 4th arg (ch) is the DISPLAYED selector letter; since
     * flags.lootabc is false (default, no lootabc JS support), ch ==
     * any.a_char (the raw identifier) for every entry, so the SHOWN letter
     * is the identifier itself — '/' and '?', not 'y'/'n'. The 5th arg
     * (gch) is an UNSHOWN alternate accelerator kept only for backward
     * compatibility (pager.c:1712-1725 comment); pressing it selects the
     * same entry without appearing in the menu text:
     *   / - something on the map          (identifier '/', hidden alt 'y')
     *   i - something you're carrying     (identifier 'i', no alt)
     *   ? - something else (by symbol or name) (identifier '?', hidden alt 'n')
     *   m - nearby monsters               (identifier 'm')
     *   M - all monsters shown on map     (identifier 'M')
     *   o - nearby objects                (identifier 'o')
     *   O - all objects shown on map      (identifier 'O')
     *   t - nearby traps                  (identifier 't', hidden alt '^')
     *   T - all seen or remembered traps  (identifier 'T', hidden alt '"')
     *   e - nearby engravings             (identifier 'e', hidden alt '`')
     *   E - all seen or remembered engravings (identifier 'E', hidden alt '|')
     * The swallowed/hallucination guards suppress m/M/o/O/t/T/e/E. */
    const showMapLists = !u.uswallow && !_cmd_Hallucination();
    /* pager.c:1733-1800 — with flags.lootabc the rows carry selector 0
     * (auto-lettered a,b,c... in order, the blank separator takes none) and
     * the group accelerators become '/', '?', m M o O t T E (never i or e). */
    const abc = !!(g.flags && g.flags.lootabc);
    const lookRows = [['/', 'something on the map'],
        ['i', 'something you\'re carrying'],
        ['?', 'something else (by symbol or name)']];
    if (showMapLists) {
        lookRows.push(['', ''],
            ['m', 'nearby monsters'], ['M', 'all monsters shown on map'],
            ['o', 'nearby objects'], ['O', 'all objects shown on map'],
            ['t', 'nearby traps'], ['T', 'all seen or remembered traps'],
            ['e', 'nearby engravings'], ['E', 'all seen or remembered engravings']);
    }
    let abcN = 0;
    const abcShown = {};
    const menuLines = [
        menu_heading_text('What do you want to look at:'),
        '',
        ...lookRows.map(([id, txt]) => {
            if (id === '') return '';
            const sh = abc ? String.fromCharCode(97 + abcN++) : id;
            abcShown[sh] = id;
            return sh + ' - ' + menucolor_text(txt); // windows.c:1803 add_menu menucolors raw text
        }),
    ];
    menuLines.push('(end)');
    const maxLen = menuLines.reduce((mx, ln) => {
        const vis = ln.replace(/\x1b\[[0-9;]*m/g, '');
        return Math.max(mx, vis.length);
    }, 0);
    /* wintty.c:1925-1928 — `!iflags.menu_overlay`: offx 0, cleared screen, content col 1. */
    const noOverlay = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
    const WIN_COL = noOverlay ? 1 : 80 - maxLen - 2;
    const uac = u.uac ?? 0;
    const endRow = menuLines.length - 1;
    const endCursorCol = WIN_COL + '(end)'.length + 1;
    /* ── Display the menu and read a selection ── */
    const paintWhatis = (lines) => (noOverlay
        ? lines.map((ln) => (ln === '' ? '' : ' ' + ln)).join('\n')
        : build_window_screen(lines, WIN_COL, uac));
    const whatisScreen = paintWhatis(menuLines);
    /* C wintty.c:1700-1730 MENU_SEARCH — the whatis menu is a tty PICK_ONE
     * menu, so ':' opens tty_getlin("Search for:") over it; getline.c:213
     * blanks row 0 (the title) and process_menu_window does not repaint it. */
    let titleErased = false;
    let searchPick = null;
    const erasedScreen = () => paintWhatis(['', ...menuLines.slice(1)]);
    const whatisSearch = async () => {
        const mlist = [];
        for (let i = 2; i < menuLines.length - 1; i++) {
            const m = /^(.) - /.exec(menuLines[i]);
            if (m) mlist.push({ str: menuLines[i], ch: m[1] });
        }
        const finished = await menu_search_case('ONE', mlist,
            () => erasedScreen().split('\n'), (curr) => { searchPick = curr.ch; });
        titleErased = true;
        return finished;
    };
    const showWhatisMenu = async () => {
        g._screen_output = titleErased ? erasedScreen() : whatisScreen;
        g._pending_message = '';
        set_cursor(endCursorCol, endRow);
    };
    /* C ref: pager.c:1692-1700 — do_look() pops the command queue BEFORE any
     * menu: a CMDQ_KEY entry is the answer (i = cq.key, itemactions' queued
     * 'i'), anything else clears CANNED; both goto dowhatiscmd.  A non-key
     * entry leaves i == 0, which is the switch's default: return ECMD_OK. */
    let queuedSel = null;
    const cmdqEnt = cmdq_pop();
    if (cmdqEnt) {
        if (cmdqEnt.typ === CMDQ_KEY) queuedSel = cmdqEnt.key | 0;
        else { cmdq_clear(CQ_CANNED); return ECMD_OK; }
    }
    if (queuedSel === null) await showWhatisMenu();
    /* C ref: pager.c:1804 select_menu(win, PICK_ONE, &pick_list) -> win/tty/
     * wintty.c process_menu_window.  This was a BARE nhgetch(): ANY key closed
     * the menu, and 'q' was even given its own return arm.  C rings the bell and
     * redraws the same page for every key outside the response set
     * (wintty.c:1738), and 'q' is not in it — the `case 'q'` at pager.c:1813 is
     * only reachable through the command queue or a click, never through this
     * menu.  The rows are added at pager.c:1730-1800 with selectors
     * "/i?mMoOtTeE" and, when lootabc is off, the hidden group accelerators
     * 'y' (for '/'), 'n' (for '?'), '^' (t), '"' (T), '`' (e), '|' (E); the 'i',
     * 'm', 'M', 'o' and 'O' rows pass gselector 0.  Each surviving gselector is
     * unique, so wintty.c:1366-1377 admits all six, and for a PICK_ONE both
     * halves are inside resp_len, so either spelling finishes the menu.
     * Note '^' and '|' are ALSO MENU_FIRST_PAGE / MENU_LAST_PAGE, but gacc
     * precedes the default commands in `resp` (:1528 vs :1531), so the explicit
     * choice wins — which is why the key ladder below maps them to 't'/'E'.
     * C omits the m/M/o/O/t/T/e/E block entirely while swallowed or
     * hallucinating (pager.c:1745-1801).  Its selectors and hidden group
     * accelerators are absent from the response set too, so those keys ring
     * and leave the short menu displayed. */
    const selectors = abc ? Object.keys(abcShown).join('')
        : (showMapLists ? '/i?mMoOtTeE' : '/i?');
    const groupSelectors = abc ? (showMapLists ? '/?mMoOtTE' : '/?')
        : (showMapLists ? 'yn^"`|' : 'yn');
    let k = queuedSel !== null ? queuedSel
        : await await_menu_key(showWhatisMenu, selectors, groupSelectors, PICK_ONE,
                               undefined, whatisSearch);
    if (k === 0x3a && searchPick !== null) k = searchPick.charCodeAt(0);
    /* pager.c:1806 destroy_nhwindow -> wintty.c:982 erase_menu_or_text:
     * docorner(offx, maxrow + 1, 0); maxrow = nitems + 1 (wintty.c:2771). */
    if (queuedSel === null && !noOverlay)
        docorner_blank_utf8_captures(WIN_COL - 1, menuLines.length + 1);
    /* C wintty.c:976-979: an offx 0 menu closes with docrt()+flush_screen(1).
     * The vision shutdown/recalculation resets mspotted and announces monsters
     * again (vision.c:856). select_menu holds bot_disabled (windows.c:1859-1863). */
    if (queuedSel === null && noOverlay) {
        const savedBotDisabled = g._bot_disabled;
        g._bot_disabled = true;
        try { await docrt(false, g._screen_output); await flush_screen(1); }
        finally { g._bot_disabled = savedBotDisabled; }
    }
    const ch_sel = String.fromCharCode(k);
    /* ── Process the menu selection (C ref: pager.c:1804-1878 switch after menu) ──
     * The menu identifier for each entry:
     *   'y' accelerator → identifier '/'  → case '/': cursor mode
     *   'i' accelerator → identifier 'i'  → case 'i': display_inventory
     *   'n' accelerator → identifier '?'  → case '?': getlin word lookup
     *   'm'             → identifier 'm'  → case 'm': look_all(nearby monsters)
     *   'M'             → identifier 'M'  → case 'M': look_all(all monsters)
     *   'o'             → identifier 'o'  → case 'o': look_all(nearby objects)
     *   'O'             → identifier 'O'  → case 'O': look_all(all objects)
     *   't'             → identifier 't'  → case 't': look_traps(nearby)
     *   'T'             → identifier 'T'  → case 'T': look_traps(all)
     *   'e'             → identifier 'e'  → case 'e': look_engrs(nearby)
     *   'E'             → identifier 'E'  → case 'E': look_engrs(all)
     * ESC / q → return (ECMD_OK).
     */
    /* C ref: select_menu PICK_ONE returns the identifier (any.a_char).
     * For the default (non-lootabc) layout:
     *   pressing 'y' selects the '/' entry → identifier '/'
     *   pressing 'i' selects the 'i' entry → identifier 'i'
     *   pressing 'n' selects the '?' entry → identifier '?'
     *   pressing 'm'/'M'/'o'/'O'/'t'/'T'/'e'/'E' → same char.
     * Map the pressed key to the C identifier. */
    let ident;
    /* Set by the arms whose C body leaves its last pline standing on the
     * topline (see the '/' arm below); the tail of this function otherwise
     * wipes it. */
    let keepTopline = false;
    if (k === 27) return ECMD_OK; /* pager.c:1812-1814 leaves redraw notices standing. */
    /* The `case 'q'` arm that stood here is gone: pager.c:1812-1814's 'q' is
     * reachable only from the command queue or a clicklook, never from this
     * menu, and select_menu can no longer hand a 'q' back now that the read
     * above implements the menu's response set (C bells at it and reads again). */
    /* C ref: pager.c:1692-1700 — a CMDQ_KEY popped from the command queue IS
     * the identifier, never a keystroke into the menu: C assigns i = cq.key
     * and jumps straight to the dowhatiscmd: switch (pager.c:1811), which
     * shares `case 'y': case '/'` and switches on the any.a_char identifiers,
     * bypassing the shown-letter/auto-letter/group-accelerator layout of the
     * menu above.  itemactions' IA_WHATIS_OBJ (iactions.c:268-271) queues 'i'
     * for "something you're carrying"; running the queued key through the
     * lootabc map instead resolved 'i' — the auto-letter of the 'T' row — to
     * look_traps() and plined "No traps seen or remembered."
     * (df-xd639a5d31b step 20.) */
    if (queuedSel !== null)
        ident = (ch_sel === 'y') ? '/' : ch_sel; /* dowhatiscmd's own switch */
    else if (abc && abcShown[ch_sel] !== undefined) ident = abcShown[ch_sel];
    else if (abc) ident = ch_sel;          /* lootabc group accelerators */
    else if (ch_sel === 'y') ident = '/';       /* hidden alt (pager.c:1725) */
    else if (ch_sel === 'i') ident = 'i';  /* "something you're carrying" */
    else if (ch_sel === 'n') ident = '?';  /* hidden alt (pager.c:1738) */
    else if (ch_sel === '^') ident = 't';  /* hidden alt (pager.c:1774) */
    else if (ch_sel === '"') ident = 'T';  /* hidden alt (pager.c:1779) */
    else if (ch_sel === '`') ident = 'e';  /* hidden alt (pager.c:1786) */
    else if (ch_sel === '|') ident = 'E';  /* hidden alt (pager.c:1791) */
    else ident = ch_sel;                   /* the displayed selector letter */
    /* ── dispatch the selected identifier ── */
    switch (ident) {
    case '/': {
        /* C ref: pager.c:1897-1961 do_look()'s from_screen loop — extracted so
         * doquickwhatis() (';', C do_look(1,NULL)) runs the SAME body with
         * quick=TRUE instead of its own degenerate stand-in.  See below. */
        keepTopline = !(await _do_look_from_screen(false));
        break;
    }
    case 'i': {
        let selectedObj, winRows, invWinCol;
        if (cmdq_peek(CQ_CANNED)) {
            /* invent.c:3428 display_inventory() answers from the command queue
             * (itemactions' queued invlet) with no menu and no window. */
            const invlet = await display_inventory(null, true);
            if (!invlet) break;
            for (let o = g.invent; o; o = o.nobj)
                if (o.invlet === invlet) { selectedObj = o; break; }
        } else {
            let picked;
            ({ selectedObj: picked, winRows, WIN_COL: invWinCol } = await inventory_menu_legacy({ displayPickinv: true, statusStaysBlank: true }));
            /* pager.c:1832-1836: the menu answers an invlet, which C maps back
             * through gi.invent.  force_invmenu's "Special ? - (list likely
             * candidates)" (invent.c:3357-3359) answers '?', which no object
             * carries, so out_str stays empty and C returns with no message. */
            if (picked)
                for (let o = g.invent; o; o = o.nobj)
                    if (o.invlet === picked.invlet) { selectedObj = o; break; }
        }
        g._status_blanked = false;
        if (!selectedObj) {
            /* pager.c:1827-1828 `return ECMD_OK` leaves do_look before its tail
             * wipe, so display_pickinv's n==0 "Not carrying anything."
             * (invent.c:3140-3143) stays on the topline. */
            if (winRows === undefined) keepTopline = true;
            break;                               /* no selection / ESC */
        }
        const out_str = singular_xname(selectedObj);
        if (out_str) {
            g._statusClipFirstRowOnly = _threeStatusLines() && winRows === 21 && invWinCol > 0;
            try {
            await checkfile_usrtyped(out_str,
                invWinCol === 0 ? undefined
                    : winRows >= 23 ? invWinCol - 2 : (winRows >= 22 ? -1
                        : g._statusClipFirstRowOnly ? invWinCol - 2 : undefined));
            } finally { g._statusClipFirstRowOnly = false; }
            keepTopline = true; // C pager.c:1839 returns with checkfile's message.
        }
        break;
    }
    case '?': {
        const typed = await getlin('Specify what? (type the word)');
        const out_str = (typed === ' ') ? typed /* keep single space as-is */
                                        : mungspaces(typed);
        if (out_str === '' || out_str.charCodeAt(0) === 27 /* '\033' */) break;
        if (out_str.length > 1) {
            await checkfile_usrtyped(out_str);
            /* checkfile() leaves its final pline (including the no-info
             * response) on the message window until the next command. */
            keepTopline = true;
            break;
        }
        /* C ref: pager.c:1857 sym = out_str[0]; break; — a single typed
         * character falls through to do_screen_description()'s symbol-lookup
         * path (from_screen FALSE).  do_screen_description(cc, FALSE, sym, ...)
         * (pager.c:1247-1607) builds "<sym>        <class> or <class>..." from the
         * symbol-class scan, and do_look putmixed()s it (pager.c:1922) or, with
         * found == 0, says "I've never heard of such things." (pager.c:1951),
         * followed by the found == 1 data.base checkfile() lookup below. */
        {
            const classes = collectScreenDescriptionClasses({
                ch: out_str[0], dec: false, looked: false, /* !looked: def_* symbols, not gs.showsyms */
                waterLevel: !!Is_waterlevel(u.uz),
                terrainmode: g.iflags?.terrainmode,
                boulderSymbol: pager_boulder_symbol(),
                blind: _vision_Blind(),
            });
            if (classes.matchCount) {
                /* C pager.c:1273 builds the typed symbol's prefix with
                 * Sprintf("%c        ", sym) and pager.c:1922-1923 sends the
                 * whole string through putmixed(WIN_MESSAGE, 0, out_str);
                 * decode_mixed (windows.c:1475-1510) consumes a lone '\'
                 * ahead of an ordinary character, so a typed throne symbol
                 * contributes only the eight-space pad (rd353 step 171: C
                 * paints "\x1b[8Can opulent throne--More--", no glyph).  A
                 * literal leading blank run would be dropped as a whitespace
                 * token by _topl_wordwrap (same hazard as the blank-glyph
                 * looked case below), so encode it as the cursor-forward run
                 * the tty emits for it (pager_glyph_prefix convention). */
                const putmixedDesc = pager_mixed_text(
                    `${out_str[0]}        ${classes.classes.join(' or ')}`);
                g._pending_message = putmixedDesc.startsWith(' ')
                    ? putmixedDesc.replace(/^ +/, (m) => `\x1b[${m.length}C`)
                    : putmixedDesc;
                await flush_screen(1);
                /* C ref: pager.c:1936-1950 — found == 1, ans == 0, flags.help
                 * and !quick: checkfile(firstmatch, chkfilNone) asks "More info
                 * about ...?" for each data.base entry; the y_n pline pages the
                 * description still on the topline. */
                const g_help = !!(g.flags && (g.flags.help ?? true));
                if (classes.matchCount === 1 && g_help && classes.firstmatch) {
                    const desc = g._pending_message;
                    let standing = null;
                    for (const entry of checkfile_entries(classes.firstmatch)) {
                        const question = `More info about "${entry.key}"?`;
                        /* tty_yn_function pages the standing description
                         * (topline NON_EMPTY) before the question goes up. */
                        await force_more(desc, true);
                        standing = null;
                        if ((await yn_function(question, 'yn', 'n', true)) === 'y') {
                            const dbLines = entry.lines ?? dbase_entry_lines(entry.key);
                            if (dbLines) await dbase_display_window(dbLines);
                        } else if (!(g.iflags?.query_menu
                                     && g.iflags?.window_inited)) {
                            /* topl.c:534-538: the answer only rewrites
                             * gt.toplines; the prompt stays on the terminal.
                             * Under query_menu y_n never reaches the tty
                             * reader: yn_function_menu (cmd.c:5445-5446)
                             * plines the answered query and clears
                             * WIN_MESSAGE, so the topline ends blank. */
                            standing = `${question} [yn] (n)`;
                        }
                    }
                    if (standing) g._pending_message = standing;
                }
            } else {
                await pline("I've never heard of such things.");
            }
            keepTopline = true;
        }
        break;
    }
    /* C ref: pager.c:1888-1908 — the eight map-scan arms, each of which builds
     * its NHW_TEXT window and returns ECMD_OK. */
    case 'm': await look_all(true, true); break;   /* list nearby monsters */
    case 'M': await look_all(false, true); break;  /* list all monsters */
    case 'o': await look_all(true, false); break;  /* list nearby objects */
    case 'O': await look_all(false, false); break; /* list all objects */
    case 't': await look_traps(true); break;       /* list nearby traps */
    case 'T': await look_traps(false); break;      /* all traps (visible|remembered) */
    case 'e': await look_engrs(true); break;       /* list nearby engravings */
    case 'E': await look_engrs(false); break;      /* all engravings */
    default:
        keepTopline = true; /* pager.c:1812-1814: no selection returns immediately. */
        break;
    }
    /* The eight map-scan arms end in either a dismissed text window (topline
     * already blank) or a pline() that C leaves standing on the topline until
     * the next keystroke ("No traps seen or remembered nearby."), so this
     * arm must NOT wipe the message the way the cursor/getlin arms do. */
    if (!_LOOK_ALL_IDENTS.includes(ident) && !keepTopline)
        g._pending_message = '';
    /* C pager.c:2322: returns do_look(0, NULL)'s result (ECMD_OK); rhack() maps it. */
    return ECMD_OK;
}

const _LOOK_ALL_IDENTS = ['m', 'M', 'o', 'O', 't', 'T', 'e', 'E'];

// C ref: pager.c:2329 doquickwhatis() -> do_look(1, (coord *) 0) — ';' quick
// farlook.  quick==TRUE, so pager.c:1704 sets i='y' and jumps to dowhatiscmd's
// case 'y' (from_screen=TRUE, cc=(u.ux,u.uy)) without ever showing the whatis
// menu.  That is EXACTLY dowhatis's '/' arm with quick set, so both go through
// _do_look_from_screen() and this is the whole command.
//
// RNG: do_look(1)/getpos consume no RNG and no turn (GENERALCMD, ECMD_OK).
export async function doquickwhatis() {
    const g = game;
    const esc = await _do_look_from_screen(true);
    if (esc)
        g._pending_message = '';
    /* C pager.c:2331: returns do_look(1, NULL)'s result (ECMD_OK); rhack() maps it. */
    return ECMD_OK;
}

async function _do_look_from_screen(quick) {
    const g = game, u = g.u || {};
    /* "something on the map": cursor selection via getpos (pager.c:1902-1913,
     * getpos.c:771-914).  do_look's do-while loop (from_screen=TRUE,
     * quick=FALSE, clicklook=FALSE) re-prompts after every pick until ESC
     * breaks out (getpos.c:1911 ans<0 -> break) or ans==LOOK_ONCE.
     * pager.c:1891-1892/1961 — save_verbose = flags.verbose, restored on
     * exit; flags.verbose itself is mutated to FALSE below (pager.c:1913)
     * once the first pick completes ("only print long question once"). */
    const save_verbose = !!g.flags.verbose;
    /* C ref: pager.c:1892 `flags.verbose = flags.verbose && !quick;` — a quick
     * farlook (';') is terse throughout: it picks pager.c:1908's "Pick %s."
     * over "Please move the cursor to %s.", and getpos.c:842-847's
     * "(For instructions type a '?')" never fires. */
    g.flags.verbose = save_verbose && !quick;
    let cx = u.ux | 0, cy = u.uy | 0; /* getpos.c:848 cx=cy=ccp->x/y (hero) */
    let esc = false;
    let lookDescriptionPending = false;
    let lookDescriptionWrapped = false;
    // C do_look initializes this once and only replaces it on a non-null pm.
    let supplemental_pm = null;
    for (;;) {
        /* C ref: pager.c:1904-1908 — the pre-getpos pline, chosen by the
         * CURRENT flags.verbose. */
        const verbose = !!g.flags.verbose;
        const preMsg = verbose
            ? 'Please move the cursor to a monster, object or location.'
            : 'Pick a monster, object or location.';
        const tipWillShow = g.flags.tips !== false
            && !(game.context.tips && game.context.tips[TIP_GETPOS]);
        if ((tipWillShow || verbose) && !g.iflags?.debug_fuzzer) {
            // pager.c:1905-1908 uses pline; vpline (pline.c:282) records
            // the prompt even when its display is paged separately below.
            g._prevmsg = preMsg;
            const _showPreMore = async () => {
                g._pending_message = preMsg + '--More--';
                await flush_screen(1);
                set_cursor((preMsg + '--More--').length, 0);
            };
            await _showPreMore();
            await await_topl_more_dismiss(_showPreMore);
        } else {
            /* C pager.c:1922 putmixed() leaves the picked description in the
             * message window; the next pline("Pick ...") appends to it and
             * only pages if that combined topline does not fit. */
            /* pager.c:1908 always uses pline, even before the first pick.
             * Its prevmsg update (pline.c:282) also ends Norep suppression. */
            await pline(preMsg);
            lookDescriptionPending = false;
            await flush_screen(1);
        }

        const tipShown = await handle_tip(TIP_GETPOS);

        /* C ref: getpos.c:843-847 verbose instructions line. */
        const instrMsg = g.flags.verbose ? "(For instructions type a '?')" : '';
        /* C ref: getpos.c:838-839,860-864 — show_goal_msg only if the tip
         * was shown just now. */
        const goalMsg = tipShown ? 'Move cursor to a monster, object or location:' : '';
        if (instrMsg && goalMsg && g.iflags?.debug_fuzzer) {
            await pline(instrMsg);
            await pline(goalMsg);
            await flush_screen(1);
        } else if (instrMsg && goalMsg) {
            /* getpos.c:845 pline, then curs()+flush_screen(0) (848-854)
             * commits it to the real screen, forcing getpos.c:861's pline
             * to more() the already-shown instructions line first. */
            const _showInstrMore = async () => {
                // getpos.c:845 pline -> pline.c:282, before more() reads.
                g._prevmsg = instrMsg;
                g._pending_message = instrMsg + '--More--';
                await flush_screen(1);
                set_cursor((instrMsg + '--More--').length, 0);
            };
            await _showInstrMore();
            /* getline.c:230 xwaitforspace("\033 ") — see the preMsg more() above. */
            await await_topl_more_dismiss(_showInstrMore);
            g._prevmsg = goalMsg; // getpos.c:861 pline -> pline.c:282.
            g._pending_message = goalMsg;
            await flush_screen(1);
        } else if (instrMsg) {
            g._prevmsg = instrMsg; // getpos.c:845 pline -> pline.c:282.
            g._pending_message = instrMsg;
            await flush_screen(1);
        } else if (goalMsg) {
            /* getpos.c:861 pline() appends to a standing topline (update_topl),
             * e.g. the "You see your kitten." docrt() noticed when the tip
             * window closed. */
            await pline(goalMsg);
            await flush_screen(1);
        }
        /* else: no further pline followed preMsg this round (tip already
         * shown, flags.verbose already false) — preMsg (or '' after the
         * tipWillShow dismiss above) stays as the pending topline for
         * the cursor loop's first nhgetch, matching pager.c/getpos.c
         * issuing no additional pline here. */

        /* C ref: getpos.c:848-852 — cx=cy=ccp->x/y (carried over from the
         * PREVIOUS getpos() round's pick, or hero position on this
         * dowhatis() call's first round); curs(WIN_MAP, cx, cy);
         * flush_screen(0) — UNCONDITIONALLY repositions the cursor to the
         * map here, every round, regardless of which pline(s) fired above
         * (any goalMsg curs() inside the loop below lands on this same
         * cx,cy so this single set covers both cases). */
        set_cursor(cx - 1, cy + 1);

        let picked = false, ans = 0;
        /* C ref: getpos.c:1136 — the !force quitchar exit sets cx = -1, which
         * pager.c:1911 (`if (ans < 0 || cc.x < 0) break;`) reads as "no pick"
         * and uses to leave do_look's do-while.  Tracked separately from `esc`
         * because that arm exits with msg_given FALSE (the "Done." pline must
         * survive) while the ESC arm forces msg_given TRUE and wipes it. */
        let doneQuit = false;
    esc = false;
        /* C ref: getpos.c:804 boolean msg_given = TRUE — unconditionally true
         * entering the loop (independent of the preMsg/instrMsg/goalMsg shown
         * above), so the FIRST key read below never triggers auto_describe. */
        let msgGiven = true;
        let showGoalMsg = false;
        /* C getpos.c:37-38 `static coord *garr[NUM_GLOCS]` / `gidx[NUM_GLOCS]`
         * — freed at exitgetpos (getpos.c:1170-1176), so the cycle restarts at
         * the hero's square on every getpos() CALL.  do_look re-enters getpos
         * per cursor round, so these live here, not outside the round. */
        const garr = new Array(_NUM_GLOCS).fill(null);
        const gidx = new Array(_NUM_GLOCS).fill(0);
        /* C ref: flag.h iflags.autodescribe.  This loop used to assume the
         * option was on — harmless while nothing in the port could turn it off,
         * but getpos()'s NHKF_GETPOS_AUTODESC arm now can and the option is
         * GLOBAL, so a hero who switched it off at a travel cursor must not get
         * it back at the next farlook. */
        g.iflags = g.iflags || {};
        const _autodescribe = () => g.iflags.autodescribe !== false;
        /* C ref: getpos.c:809 `schar udx = u.dx, udy = u.dy, udz = u.dz;`
         * / getpos.c:1165 `u.dx = udx, u.dy = udy, u.dz = udz;` — getpos()
         * saves and restores the hero's direction because movecmd() below
         * writes u.dx/u.dy/u.dz as a side effect of decoding each key. */
        const udx = u.dx, udy = u.dy, udz = u.dz;
        for (;;) {
            /* C ref: getpos.c:864-865 — `else if (iflags.autodescribe &&
             * !msg_given) auto_describe(cx, cy);` fires on every loop entry
             * AFTER a cursor move (movement keys never set msg_given). */
            if (showGoalMsg) {          /* getpos.c:860-865 */
                await pline('Move cursor to a monster, object or location:');
                await flush_screen(0);
                set_cursor(cx - 1, cy + 1);
                showGoalMsg = false;
            } else if (_autodescribe() && !msgGiven) {
                /* C getpos.c:865 calls auto_describe(), including the
                 * travel-mode validity tail and its sticky/cursor bookkeeping.
                 * Keep this second getpos loop on the same helper as _getpos(). */
                await auto_describe(cx, cy);
            }
            let rushrun = false;
            let c = await readchar_poskey({ x: cx, y: cy, mod: 0 });
            if (_autodescribe())
                msgGiven = false;
            if (c === 27) { esc = true; break; }
            /* C getpos.c:898-920 — the command-bound `g`/`G` keys are
             * prefixes inside getpos.  Read the direction immediately, then
             * route an ordinary walk direction through do_rushrun below. */
            if (c === cmd_from_func('do_run') || c === cmd_from_func('do_rush')) {
                c = await readchar_poskey({ x: cx, y: cy, mod: 0 });
                rushrun = true;
            }
            if (c === 46 /* '.' */) { ans = 0; picked = true; break; }
            if (c === 44 /* ',' */) { ans = 1; picked = true; break; }
            if (c === 59 /* ';' */) { ans = 2; picked = true; break; }
            if (c === 58 /* ':' */) { ans = 3; picked = true; break; }
            let moved = false;
            const isWalk = movecmd(c, MV_WALK);
            if (isWalk && !rushrun) {
                ({ cx, cy } = truncate_to_map(cx, cy, u.dx | 0, u.dy | 0));
                moved = true;
            } else if (isWalk || movecmd(c, MV_RUSH) || movecmd(c, MV_RUN)) {
                /* C ref: getpos.c:922-941 — with iflags.getloc_moveskip off
                 * (the default) a fast-move is a flat eight cells; with it on
                 * the cursor runs while the glyph under it stays the same.
                 * NHKF_GETPOS_MOVESKIP really toggles the flag now, in both
                 * copies of this loop, so both need both arms. */
                let dxr, dyr;
                if (g.iflags.getloc_moveskip) {
                    const gid = _glyph_ident(cx, cy);
                    dxr = u.dx | 0; dyr = u.dy | 0;
                    while (isok(cx + dxr, cy + dyr)
                           && gid === _glyph_ident(cx + dxr, cy + dyr)
                           && isok(cx + dxr + (u.dx | 0), cy + dyr + (u.dy | 0))
                           && gid === _glyph_ident(cx + dxr + (u.dx | 0),
                                                   cy + dyr + (u.dy | 0))) {
                        dxr += u.dx | 0; dyr += u.dy | 0;
                    }
                } else {
                    dxr = 8 * (u.dx | 0); dyr = 8 * (u.dy | 0);
                }
                ({ cx, cy } = truncate_to_map(cx, cy, dxr, dyr));
                moved = true;
            }
            let eaten = false;
            const gtmp = moved ? -1
                : _GETPOS_GLOC_KEYS.indexOf(String.fromCharCode(c));
            if (gtmp >= 0) {
                eaten = true;
                const gloc = gtmp >> 1;
                if (g.iflags.getloc_usemenu) {
                    /* C getpos.c:1021-1027 — gather_locs menu (PICK_ONE). */
                    const pk = await _getpos_menu(gloc);
                    if (pk) { cx = pk.x; cy = pk.y; }
                    moved = true;   /* `goto nxtc` either way (getpos.c:1019-1025) */
                    /* destroy_nhwindow only happens when a menu was created; the
                     * gcount < 2 "You cannot see any monsters." (getpos.c:679-683)
                     * returns first and its topline must survive. */
                    if (_getpos_menu_shown) {
                        g._pending_message = '';   /* menu window destroyed */
                        await flush_screen(1);
                    } else {
                        await flush_screen(0);  /* nxtc: paint the topline */
                    }
                } else {
                if (!garr[gloc]) { garr[gloc] = await _gather_locs(gloc); gidx[gloc] = 0; }
                if (garr[gloc].length) {
                    if (!(gtmp & 1))
                        gidx[gloc] = (gidx[gloc] + 1) % garr[gloc].length;
                    else if (--gidx[gloc] < 0)
                        gidx[gloc] = garr[gloc].length - 1;
                    cx = garr[gloc][gidx[gloc]].x;
                    cy = garr[gloc][gidx[gloc]].y;
                    moved = true;
                }
                }
            }
            if (!moved && !eaten && c === 0x23 /* '#' NHKF_GETPOS_AUTODESC */) {
                /* C getpos.c:961-970.  Without this arm '#' fell into the
                 * symbol search, where it MATCHES (S_bars, S_tree, S_cloud and
                 * both closed-drawbridge syms all draw as '#'), so the farlook
                 * cursor jumped to a tree where C toggles the option. */
                g.iflags.autodescribe = !_autodescribe();
                await pline(`Automatic description ${g.flags.verbose ? 'of features under cursor ' : ''}is ${_autodescribe() ? 'on' : 'off'}.`);
                if (!_autodescribe())
                    showGoalMsg = true;
                msgGiven = true;
                await flush_screen(1);
                set_cursor(cx - 1, cy + 1);
                eaten = true;
            }
            if (!moved && !eaten && c === 0x22 /* '"' NHKF_GETPOS_LIMITVIEW */) {
                /* C getpos.c:971-989 — cycle the filter and DISCARD every
                 * cached list, since they were gathered under the old one. */
                g.iflags.getloc_filter = ((g.iflags.getloc_filter | 0) + 1) % NUM_GFILTER;
                for (let i = 0; i < _NUM_GLOCS; i++) { garr[i] = null; gidx[i] = 0; }
                await pline(`${_GETPOS_VIEW_FILTERS[g.iflags.getloc_filter | 0]}.`);
                msgGiven = true;
                await flush_screen(1);
                set_cursor(cx - 1, cy + 1);
                eaten = true;
            }
            if (!moved && !eaten && c === 0x2a /* '*' NHKF_GETPOS_MOVESKIP */) {
                /* C getpos.c:1007-1013. */
                g.iflags.getloc_moveskip = !(g.iflags.getloc_moveskip);
                await pline(`${g.iflags.getloc_moveskip ? 'S' : 'Not s'}kipping`
                    + ' over similar terrain when fastmoving the cursor.');
                msgGiven = true;
                await flush_screen(1);
                set_cursor(cx - 1, cy + 1);
                eaten = true;
            }
            if (!moved && !eaten && c === 0x40 /* '@' NHKF_GETPOS_SELF */) {
                /* C getpos.c:998-1006 — home the cursor and reset every cycle. */
                for (let i = 0; i < _NUM_GLOCS; i++) gidx[i] = 0;
                cx = u.ux | 0; cy = u.uy | 0;
                moved = true;
            }
            if (!moved && !eaten && c === 0x21 /* '!' NHKF_GETPOS_MENU */) {
                /* C getpos.c:989-996 — toggles iflags.getloc_usemenu. */
                g.iflags.getloc_usemenu = !g.iflags.getloc_usemenu;
                await pline(`${g.iflags.getloc_usemenu ? 'Using' : 'Not using'} a menu to show possible targets`
                    + (g.iflags.getloc_usemenu ? " for 'm|M', 'o|O', 'd|D', and 'x|X'" : '') + '.');
                msgGiven = true;
                await flush_screen(1);
                set_cursor(cx - 1, cy + 1);
                eaten = true;
            }
            if (!moved && !eaten && c === 0x3f /* '?' NHKF_GETPOS_HELP */) {
                /* C getpos.c:945-953.  This is the farlook-local copy of the
                 * getpos loop, so it needs the same blocking help window as
                 * _getpos() above; otherwise '?' reaches symbol search and
                 * prints "Unknown direction".  The window consumes its own
                 * page acknowledgement, then the next loop iteration redraws
                 * the cursor and reprints the goal prompt. */
                await getpos_help(quick, _WHAT_IS_A_LOCATION);
                await getpos_refresh(getpos_hilitefunc, getpos_getvalid, getpos_sethilite);
                set_cursor(cx - 1, cy + 1);
                showGoalMsg = true;
                eaten = true;
            }
            if (!moved && !eaten
                && (c === 0x12 /* ^R */ || c === 0x0c /* ^L, redraw_cmd */
                    || c === 0x24 /* '$' NHKF_GETPOS_SHOWVALID */)) {
                /* C getpos.c:944-960 — the redraw and showvalid arms consume
                 * the key and set show_goal_msg; getpos_refresh()/the hilite
                 * toggle are display-only and RNG-free (and getpos_hilitefunc
                 * is NULL for this caller, so SHOWVALID does nothing else). */
                if (c !== 0x24) {
                    await getpos_refresh(getpos_hilitefunc, getpos_getvalid, getpos_sethilite);
                    set_cursor(cx - 1, cy + 1);
                }
                showGoalMsg = true;
                eaten = true;
            }
            if (!moved && !eaten && !_QUITCHARS.includes(c)) {
                const found = _getpos_symbol_search(c, cx, cy);
                if (found) {                    /* getpos.c:1104-1109 foundc */
                    cx = found.x; cy = found.y;
                    if (msgGiven) {
                        g._pending_message = '';   /* clear_nhwindow(WIN_MESSAGE) */
                        await flush_screen(1);
                        msgGiven = false;
                    }
                    moved = true;
                } else if (found === null) {    /* getpos.c:1113-1115 */
                    await pline(`Can't find dungeon feature '${String.fromCharCode(c)}'.`);
                    await flush_screen(1);
                    /* getpos.c:1143-1148 `nxtc:` — curs(WIN_MAP, cx, cy) runs
                     * after EVERY handled key, so the failure message leaves
                     * the cursor on the map spot, not parked at the topline. */
                    set_cursor(cx - 1, cy + 1);
                    msgGiven = true;
                } else {                        /* getpos.c:1116-1129 */
                    await pline(`Unknown direction: '${visctrl(c)}'`
                        + (quick ? ` (use '${_binds_visctrl(cmd_from_func('do_move_west'))}', '${_binds_visctrl(cmd_from_func('do_move_south'))}', '${_binds_visctrl(cmd_from_func('do_move_north'))}', '${_binds_visctrl(cmd_from_func('do_move_east'))}' or '.').`
                                 : ' (aborted).'));   /* getpos.c:1119-1128 */
                    await flush_screen(1);
                    set_cursor(cx - 1, cy + 1);
                    msgGiven = true;
                    if (!quick) {   /* getpos.c:1134-1137: !force -> Done. */
                        await pline('Done.');
                        g._topl_sticky = g._pending_message;
                        msgGiven = false;
                        cx = -1; cy = 0;
                        doneQuit = true;
                        break;
                    }
                }
            }
            if (!moved && !eaten && _QUITCHARS.includes(c)) {
                if (!quick) {
                    await pline('Done.');
                    // C leaves the emitted topline intact on this exit.
                    g._topl_sticky = g._pending_message;
                    msgGiven = false;   /* suppress clear */
                    cx = -1; cy = 0;
                    doneQuit = true;
                    break;
                }
            }
            if (moved) {
                /* C ref: getpos.c:1143-1149 `nxtc:` — curs(WIN_MAP, cx, cy);
                 * flush_screen(0) runs after every handled key, so the
                 * cursor tracks the new spot even when this port's partial
                 * do_look_moreinfo() has no description text for it (the
                 * auto_describe() call at the loop top only repositions the
                 * cursor when it prints something). */
                set_cursor(cx - 1, cy + 1);
            }
        }
        /* C ref: getpos.c:1165 (exitgetpos) — restore the hero's direction
         * clobbered by movecmd() above, before returning to do_look(). */
        u.dx = udx; u.dy = udy; u.dz = udz;
        if (esc) break;
        /* C ref: pager.c:1911 `if (ans < 0 || cc.x < 0) break;` — the
         * getpos.c:1136 "Done." exit hands back cc.x == -1, which ends
         * do_look WITHOUT the ESC arm's clear_nhwindow(WIN_MESSAGE). */
        if (doneQuit) break;

        /* C ref: pager.c:1913 — only the first "Please move..." message
         * this do_look call is verbose. */
        g.flags.verbose = false;

        if (picked) {
            /* C ref: pager.c:1917-1938 — do_screen_description() finds
             * what's at (cx,cy); when found, its text is put with an
             * implicit --More-- (the checkfile pline that may follow
             * forces the pending message to page, topl.c single-line
             * pipeline). */
            const target = await do_look_moreinfo(cx, cy);
            if (target?.supplemental_pm && (target.needsLook || target.classCount > 1))
                supplemental_pm = target.supplemental_pm;
            /* Some target classes still lack their class-list collector.
             * A selected monster carries the full symbol-class list and the
             * independent needsLook flag from do_screen_description. */
            if (target && target.classText) {
                /* C pager.c:1271 supplies a blank glyph plus eight spaces.
                 * _topl_wordwrap() drops a leading whitespace token when it
                 * starts a row (display.js:4535), so encode that nine-column
                 * blank prefix as one cursor-forward run. */
                const glyphPrefix = pager_glyph_prefix(target.glyphChar, target.glyphDec, cx, cy);
                // pager.c do_screen_description only calls lookat for multiple
                // descriptions (or a separately requested detailed lookup).
                const detail = target.needsLook || target.classCount !== 1
                    ? ` (${target.lookedFirstmatch ?? target.firstmatch})` : '';
                const seen = target.seenVia ? ` [seen: ${target.seenVia}]` : '';
                const out_str = `${glyphPrefix}${target.classText}${detail}${seen}`;
                if (quick) {
                    g._pending_message = out_str;
                    lookDescriptionWrapped = _topline_more_pending();
                    await flush_screen(1);
                } else {
                    /* C pager.c:1922 putmixed(WIN_MESSAGE, 0, out_str) does
                     * not call more().  Keep it pending so the next loop's
                     * prompt is joined by ordinary pline() semantics; the
                     * normal flush path still adds --More-- if wrapping
                     * requires it. */
                    g._pending_message = out_str;
                    lookDescriptionPending = true;
                    /* A description too wide for one row pages by itself
                     * (topl.c:139 redotoplin more()); that --More-- is the one
                     * tty_display_nhwindow(NHW_TEXT) would have raised
                     * (wintty.c:1920), so a checkfile window must not raise a
                     * second one over it. */
                    lookDescriptionWrapped = _topline_more_pending();
                    await flush_screen(1);
                }

                /* C pager.c checkfile(): offer each resolved encyclopedia
                 * entry, alternate name first, unless this is a quick look. */
                const LOOK_QUICK = 1, LOOK_ONCE = 2, LOOK_VERBOSE = 3;
                const flagsHelp = !!(g.flags && (g.flags.help ?? true));
                if (ans !== LOOK_QUICK && ans !== LOOK_ONCE
                    && (ans === LOOK_VERBOSE || (flagsHelp && !quick))) {
                  const supplemental = { name: '' };
                  // Reuse checkfile's name normalization, including the
                  // precedence of "named" over "called" (pager.c:950-962).
                  const entries = supplemental_pm
                      ? checkfile_entries(target.firstmatch, supplemental)
                      : target.dbaseEntries ?? (target.dbaseEntry
                          ? [{ key: target.dbaseEntry, lines: null }] : []);
                  let entryShown = false;
                  for (const entry of entries) {
                    if (ans === LOOK_VERBOSE) {
                        /* C pager.c:1949 passes chkfilDontAsk for LOOK_VERBOSE
                         * (the ':' pick), so checkfile() (pager.c:1056) skips
                         * the "More info about ...?" y_n and displays the
                         * entry straight away; the picked description is
                         * still on the topline and pages with --More-- when
                         * the text window opens. */
                        const dbLines = entry.lines ?? dbase_entry_lines(entry.key);
                        if (dbLines) {
                            /* tty_display_nhwindow(NHW_TEXT) with the topline
                             * NEED_MORE pages it first (wintty.c:1920). */
                            if (lookDescriptionWrapped) {
                                /* flush_screen() above already blocked on that
                                 * --More-- and consumed its dismiss key. */
                            } else if (entryShown) {
                                /* C pager.c checkfile(): the second pass runs
                                 * after the first text window was dismissed, so
                                 * the topline is already clear and no second
                                 * "<look text>--More--" is raised. */
                            } else {
                                await force_more(out_str, true);
                            }
                            await dbase_display_window(dbLines);
                            entryShown = true;
                        }
                        lookDescriptionPending = false;
                        continue;
                    }
                    const question = `More info about "${entry.key}"?`;
                    if (lookDescriptionPending && !lookDescriptionWrapped)
                        await force_more(out_str, true); // topl.c:390-392: page putmixed first.
                    // pager.c:1067 y_n(): topl.c:475-477 retries invalid replies.
                    if ((await yn_function(question, 'yn', 'n', true)) === 'y') {
                        /* Entry resolution preserves checkfile's normalization
                         * and duplicate suppression across alternate names. */
                        const dbLines = entry.lines ?? dbase_entry_lines(entry.key);
                        if (dbLines)
                            await dbase_display_window(dbLines);
                    }
                    lookDescriptionPending = false;
                  }
                  if (supplemental_pm) {
                      const pending = g._pending_message;
                      await do_supplemental_info(supplemental.name, supplemental_pm,
                                                ans === LOOK_VERBOSE);
                      if (g._pending_message !== pending)
                          lookDescriptionPending = false;
                  }
                }
            }
        }

        /* C ref: pager.c:1960 `} while (from_screen && !quick
         * && ans != LOOK_ONCE && !clicklook);` */
        if (quick) break;
        if (ans === 2 /* LOOK_ONCE */) break;
    }
    g.flags.verbose = save_verbose; /* pager.c:1961 */
    return esc;
}

// ── Extended command list for bind_key (mirrors C extcmdlist) ───────────────
// Flags from const.js: IFBURIED=0x0001, AUTOCOMPLETE=0x0002, WIZMODECMD=0x0004,
// GENERALCMD=0x0008, CMD_NOT_AVAILABLE=0x0010, NOFUZZERCMD=0x0020,
// INTERNALCMD=0x0040, CMD_M_PREFIX=0x0080, PREFIXCMD=0x0200,
// MOVEMENTCMD=0x0400, MOUSECMD=0x0800, CMD_INSANE=0x1000, AUTOCOMP_ADJ=0x2000,
// CMD_PARAM=0x4000
import { INTERNALCMD } from './const.js';

import { CMD_PARAM } from './const.js';
import { dokeylist } from './cmd.js'; // relocate-fns


// ── Small helpers used by dfeature_at ───────────────────────────────────────
/* C ref: dbridge.c:61-73 is_lava(x,y) —
 *   ltyp == LAVAPOOL || ltyp == LAVAWALL
 *   || (ltyp == DRAWBRIDGE_UP && (drawbridgemask & DB_UNDER) == DB_LAVA)
 * This was `return false`, a CONSTANT, so dfeature_at() could never answer
 * "molten lava" and describe_decor()/pooleffects() could never route a hero on
 * lava anywhere.  Shares one body with pooleffects_is_lava (defined with the
 * pooleffects block above) so the two spellings cannot drift. */
/* C ref: dbridge.c:45-59 is_pool(x,y) —
 *   ltyp == POOL || ltyp == MOAT || ltyp == WATER || is_moat(x, y)
 * is_moat (dbridge.c:24-36) is the DRAWBRIDGE_UP-with-DB_MOAT-underneath case
 * (and NOT on the Juiblex level).  Also a `return false` constant until now,
 * which is why look_here()/dolook() on a pool tile never said "There is a pool
 * of water here." */
/* C pager.c:614-650 ice_descr().  Besides its text result this records the
 * ice-strength bucket in iflags.ice_rating for mention_decor. */
export function ice_descr(x, y) {
    const icetyp = ['solid', 'sturdy', 'steady', 'unsteady', 'thin', 'slushy'];
    const u = game.u || {};
    const r = Math.max(u.xray_range | 0, 2);
    const neardist = (r * r) * 2 - r;
    if (!game.iflags) game.iflags = {};
    game.iflags.ice_rating = -1;

    const ltyp = _surface_at_typ(x, y);
    if (ltyp !== ICE)
        return `[ice:${game.level?.at?.(x, y)?.typ | 0}?]`;

    const far = dist2(x, y, u.ux | 0, u.uy | 0) > neardist;
    const blindOrUnseen = !cansee(x, y)
        && (!u_at(x, y) || pooleffects_Levitation());
    if ((far || blindOrUnseen) && !game.gd?.decor_levitate_override)
        return waterbody_name(x, y);

    const time_left = spot_time_left(x, y, MELT_ICE_AWAY);
    const rating = !time_left ? 0
        : time_left > 1000 ? 1
            : time_left > 100 ? 2
                : time_left > 50 ? 3
                    : time_left > 14 ? 4 : 5;
    game.iflags.ice_rating = rating;
    return `${icetyp[rating]} ${waterbody_name(x, y)}`;
}

/* C ref: pager.c:558-611 waterbody_name(x, y) — "describe a pool location's
 * contents" (5.0 moved it here from mkmaze.c).  Reads SURFACE_AT(x,y), i.e. the
 * tile's typ except on a raised drawbridge, where it is the terrain underneath.
 *
 * The MOAT arm's "shallow sea" / "swamp" / "pond" special cases key off level
 * identity: Is_medusa_level and Is_qstart resolve through the same
 * game.medusa_level / game.qstart_level records js/dungeon_rng.js fills in and
 * js/cmd.js already reads at :5357; Is_juiblex_level is js/const.js's
 * documented `return false` TODO, so a Juiblex moat reads "moat" here — stated
 * rather than faked, and the arm is unreachable until that predicate lands. */
export function waterbody_name(x, y) {
    const u = game.u || {};
    /* C: Hallucination && !program_state.gameover */
    const hallucinate = _cmd_Hallucination() && !(game.program_state?.gameover);

    if (!isok(x, y))
        return "drink"; /* should never happen */
    const ltyp = _waterbody_surface_typ(x, y);

    if (ltyp === LAVAPOOL)
        return `molten ${hliquid("lava")}`;
    if (ltyp === ICE)
        return hallucinate ? `frozen ${hliquid("water")}` : "ice";
    if (ltyp === POOL)
        return `pool of ${hliquid("water")}`;
    if (ltyp === MOAT) {
        /* a bit of extra flavor over general moat */
        if (hallucinate)
            return `deep ${hliquid("water")}`;
        if (game.medusa_level && u.uz
            && u.uz.dnum === game.medusa_level.dnum
            && u.uz.dlevel === game.medusa_level.dlevel)
            return "shallow sea";
        if (Is_juiblex_level(u.uz))
            return "swamp";
        if (_Role_if_samurai_cmd() && game.qstart_level && u.uz
            && u.uz.dnum === game.qstart_level.dnum
            && u.uz.dlevel === game.qstart_level.dlevel)
            return "pond";
        return "moat";
    }
    if (IS_WATERWALL(ltyp)) {
        if (Is_waterlevel(u.uz))
            return "limitless water"; /* even if hallucinating */
        return `wall of ${hliquid("water")}`;
    }
    if (ltyp === LAVAWALL)
        return `wall of ${hliquid("lava")}`;
    /* default; should be unreachable */
    return "water"; /* don't hallucinate this as some other liquid */
}
