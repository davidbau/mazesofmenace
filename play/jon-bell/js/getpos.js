// Cursor targeting helpers from NetHack 5.0 getpos.c.
import { docrt_flags, docrtRefresh } from './display.js';
import { GPCOORDS_COMFULL, GPCOORDS_COMPASS, GPCOORDS_MAP, GPCOORDS_SCREEN, TIP_GETPOS, _GETPOS_VIEW_FILTERS, _GLOC_DESCR, _GLOC_DOOR, _GLOC_EXPLORE, _GLOC_FILTERTXT, _GLOC_INTERESTING, _GLOC_MONS, _GLOC_OBJS, _NUM_GLOCS, _QUITCHARS, _WHAT_IS_A_LOCATION, _autodescribe_firstmatch, _gather_locs, _getpos_menu, _getpos_symbol_search, _glyph_ident, _levlAt, cmd_from_func, cmdq_add_key, cmdq_clear, cmdq_pop, create_nhwindow, destroy_nhwindow, display_nhwindow, do_run, do_rush, movecmd, putstr, readchar_poskey, redraw_cmd, spkey_of, xytodir } from './cmd.js';
import { findtravelpath, handle_tip } from './hack.js'; // relocate-fns
import { visctrl as _binds_visctrl } from './cmd_binds.js'; // relocate-fns
import { CMDQ_DIR, CMDQ_KEY, COLNO, CQ_CANNED, CQ_REPEAT, DIR_ERR, MV_RUN, MV_RUSH, MV_WALK, NHKF_GETPOS_AUTODESC, NHKF_GETPOS_LIMITVIEW, NHKF_GETPOS_MENU, NHKF_GETPOS_MOVESKIP, NHKF_GETPOS_PICK, NHKF_GETPOS_PICK_O, NHKF_GETPOS_PICK_Q, NHKF_GETPOS_PICK_V, NHKF_GETPOS_SELF, NHKF_GETPOS_SHOWVALID, NHKF_GETPOS_VALID_NEXT, NHKF_GETPOS_VALID_PREV, NUM_GFILTER, ROWNO, TRAVP_VALID, isok } from './const.js'; // relocate-fns
import { GLYPHCLS_CMAP, _topl_joins_snapshot, _topl_more_pages, flush_screen, force_more_lone_frame, last_flush_forced_cursor, last_flush_status_end, newsym_force } from './display.js'; // relocate-fns
import { game } from './gstate.js'; // relocate-fns
import { visctrl } from './hacklib.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { set_cursor } from './read.js'; // relocate-fns
import { NO_COLOR } from './terminal.js'; // relocate-fns

// C getpos.c:30-38: HiliteNormalMap, HiliteGoodposSymbol, HiliteBackground.
export const HiliteNormalMap = 0;
export const HiliteGoodposSymbol = 1;
export const HiliteBackground = 2;

// The cursor loops and callback installation currently live in cmd.js.
export const getpos_hilite_state = { current: HiliteNormalMap, default: HiliteNormalMap };

// C getpos.c:752-768. Refresh the existing glyph buffer after help or redraw;
// do not regenerate terrain or vision (which would discard detection maps).
// Callbacks are supplied by the cursor owner, including its existing
// getpos_sethilite implementation. Validity callbacks can be async in JS.
export async function getpos_refresh(hilitefunc, getvalid, sethilite) {
    if (hilitefunc && getpos_hilite_state.current === HiliteGoodposSymbol) {
        await hilitefunc(false);
        getpos_hilite_state.current = getpos_hilite_state.default;
    }

    await docrt_flags(docrtRefresh);

    if (hilitefunc && getpos_hilite_state.current === HiliteBackground)
        await sethilite(hilitefunc, getvalid);
}

export let getpos_hilitefunc = null;
export let getpos_getvalid = null;
/* C getpos.c:30-33 gg.getpos_hilitefunc/getpos_getvalid live in the zeroed `gg`
 * of a fresh process; a segment that ended inside a stinking-cloud getpos
 * would otherwise leak its validity callback into the next segment's getpos
 * autodescribe (" (invalid target)"). */
export function getpos_reset_process_state() {
    getpos_hilitefunc = null;
    getpos_getvalid = null;
}
export function set_getpos_hilitefunc(v) { getpos_hilitefunc = v; }
export function set_getpos_getvalid(v) { getpos_getvalid = v; }

/* C ref: getpos.c:728-748 truncate_to_map(coordxy *cx, coordxy *cy, schar dx,
 * schar dy) — apply (dx,dy) to the getpos cursor, clamping it to the map.  A
 * clipped diagonal is not simply truncated: the amount clipped off one axis is
 * subtracted from the other so the cursor keeps sliding along the map edge.
 * Returns the new {cx, cy} rather than writing through pointers. */
export function truncate_to_map(cx, cy, dx, dy) {
    const sgn = (n) => (n < 0 ? -1 : (n > 0 ? 1 : 0)); /* hack.h sgn() */
    if (cx + dx < 1) {
        dy -= sgn(dy) * (1 - (cx + dx));
        dx = 1 - cx; /* so that (cx+dx == 1) */
    } else if (cx + dx > COLNO - 1) {
        dy += sgn(dy) * ((COLNO - 1) - (cx + dx));
        dx = (COLNO - 1) - cx;
    }
    if (cy + dy < 0) {
        dx -= sgn(dx) * (0 - (cy + dy));
        dy = 0 - cy; /* so that (cy+dy == 0) */
    } else if (cy + dy > ROWNO - 1) {
        dx += sgn(dx) * ((ROWNO - 1) - (cy + dy));
        dy = (ROWNO - 1) - cy;
    }
    return { cx: cx + dx, cy: cy + dy };
}

/* C getpos.c:30-38 getpos_hilite_state: 0 NormalMap, 1 GoodposSymbol, 2 Background */
const _getpos_bgcolors = () => (game.iflags || {}).bgcolors !== false; /* options_data.js initval true */

const _getpos_default_hilite = () => (_getpos_bgcolors() ? HiliteBackground : HiliteNormalMap);

/* C getpos.c:72-91 getpos_toggle_hilite_state */
async function getpos_toggle_hilite_state() {
    if (getpos_hilite_state.current === HiliteGoodposSymbol)
        await getpos_hilitefunc(false);
    getpos_hilite_state.current = (getpos_hilite_state.current + 1) % (_getpos_bgcolors() ? 3 : 2);
    await getpos_sethilite(getpos_hilitefunc, getpos_getvalid);
    if (getpos_hilite_state.current === HiliteGoodposSymbol)
        await getpos_hilitefunc(true);
}

export async function getpos_sethilite(gp_hilitef, gp_getvalidf) {
    const old_getvalid = getpos_getvalid;
    getpos_hilite_state.default = _getpos_default_hilite();
    if (gp_getvalidf !== old_getvalid)
        getpos_hilite_state.current = getpos_hilite_state.default;

    /* C: sel is painted with the OLD callback BEFORE the assignment... */
    const sel = new Set();
    await _getpos_getvalids_selection(sel, old_getvalid);
    set_getpos_hilitefunc(gp_hilitef);
    set_getpos_getvalid(gp_getvalidf);
    /* ...and with the NEW one after it. */
    await _getpos_getvalids_selection(sel, getpos_getvalid);

    /* C getpos.c:57-58 — map_frame_color is HI_ZAP while the state is
     * HiliteBackground, and get_bkglyph_and_framecolor (display.c:2565-2568)
     * hands that framecolor to every cell mapxy_valid() accepts.  tty_print_glyph
     * (wintty.c:3923-3926) tests framecolor BEFORE the MG_PET / MG_OBJPILE /
     * MG_DETECT arms, so a valid cell loses its inverse highlight (a hilite_pet
     * kitten under the scroll-of-fire centre prompt prints plain).  show_glyph_cell
     * reads game._getpos_frame_sel. */
    const old_frame = game._getpos_frame_sel || null;
    let frame_sel = null;
    if (gp_getvalidf && _getpos_bgcolors()
        && getpos_hilite_state.current === HiliteBackground) {
        frame_sel = new Set();
        await _getpos_getvalids_selection(frame_sel, gp_getvalidf);
    }
    /* The frame colour only reaches the terminal when a cell is next PRINTED
     * (flush_screen / docorner); until then the physical screen keeps the
     * inverse (the --More-- frame C records before the tip window).  Entering
     * is therefore deferred to flush_screen; leaving takes effect at once. */
    game._getpos_frame_sel = null;
    game._getpos_frame_pending = frame_sel;
    if (getpos_getvalid !== old_getvalid || !!frame_sel !== !!old_frame)
        _selection_force_newsyms(sel);
}

/* C ref: getpos.c:100-113 getpos_getvalids_selection(sel, validf) —
 *     for (x = 1; x < sel->wid; x++)
 *         for (y = 0; y < sel->hei; y++)
 *             if ((*validf)(x, y)) selection_setpoint(x, y, sel, 1);
 * A selectionvar is COLNO x ROWNO (selvar.c selection_new). */
async function _getpos_getvalids_selection(sel, validf) {
    if (!sel || !validf)
        return;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (await validf(x, y))
                sel.add(y * COLNO + x);
}

/* C ref: selvar.c:801-810 selection_force_newsyms(sel) — newsym_force() on
 * every selected point.  C walks it column-major; the repaint order that
 * decides where the cursor lands is flush_screen's, which is row-major, so the
 * iteration order here is immaterial (newsym_force tracks the row-major max). */
function _selection_force_newsyms(sel) {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (sel.has(y * COLNO + x))
                newsym_force(x, y);
}

function _is_valid_travelpt(x, y) {
    const u = game.u || {};
    if ((u.ux | 0) === x && (u.uy | 0) === y)
        return true;
    if (isok(x, y)) {
        const loc = _levlAt(x, y);
        const rg = loc && loc.remembered_glyph;
        /* C reads glyph_at(), not levl[].glyph: a monster or detection overlay
         * can cover remembered stone.  A blank ghost is not a cmap glyph,
         * and S_air is a colored blank, not S_stone.  The renderer represents
         * both unexplored and stone as blank cmap cells; memory distinguishes
         * those two here until the display buffer carries their glyph IDs. */
        if (loc?.disp_cls === GLYPHCLS_CMAP && loc.disp_ch === ' '
            && loc.disp_color === NO_COLOR
            && rg?.cls === GLYPHCLS_CMAP && rg.ch === ' ' && rg.color === NO_COLOR
            && !loc.seenv)
            return false;
    }
    /* C ref: hack.c:1538-1543 — u.tx/u.ty are the travel target findtravelpath
     * reads, so the probe borrows them and puts them back. */
    const tx = u.tx, ty = u.ty;
    u.tx = x;
    u.ty = y;
    let ret;
    try {
        ret = findtravelpath(TRAVP_VALID);
    } finally {
        u.tx = tx;
        u.ty = ty;
    }
    return !!ret;
}

export async function auto_describe(cx, cy) {
    const firstmatch = await _autodescribe_firstmatch(cx, cy);
    if (!firstmatch)
        return false;
    /* C ref: getpos.c:653-655 — the fourth %s of custompline's five: when the
     * getpos caller installed a validity predicate (jump, teleport) and it
     * rejects this spot, " (invalid target)" is appended.  The coord_desc tail
     * stays empty here (see the header note). */
    /* C ref: getpos.c:650 coord_desc(cx, cy, tmpbuf, iflags.getpos_coords);
     * the %s%s%s pair is firstmatch, " " when tmpbuf is non-empty, tmpbuf. */
    const _gpc = game.iflags?.getpos_coords;
    const _coords = coord_desc(cx, cy, _gpc);
    let describe = firstmatch + (_coords ? ' ' + _coords : '');
    if (game.iflags?.autodescribe !== false
        && getpos_getvalid && !(await getpos_getvalid(cx, cy)))
        describe += ' (invalid target)';
    if (game.iflags?.getloc_travelmode && !_is_valid_travelpt(cx, cy))
        describe += ' (no travel path)';
    /* C ref: getpos.c:652 custompline(SUPPRESS_HISTORY | OVERRIDE_MSGTYPE |
     * NO_CURS_ON_U): the autodescribe line never enters the ^P ring.  The ring
     * is fed at the next nhgetch clear, so the flag is one-shot (input.js). */
    /* SUPPRESS_HISTORY routes tty_putstr to show_topl() (wintty.c:2290-2298),
     * not update_topl(): addtopl()/putsyms() hard-wrap at CO-1 with no word
     * wrap and no --More--.  display.js reads this one text. */
    /* wintty.c:2294-2298: SUPPRESS_HISTORY does remember_topl() of whatever
     * is already on the top line and then show_topl() — REPLACING it, never
     * update_topl()'s concatenation (e.g. getpos_menu's "You cannot detect
     * any monsters." is not kept beside the description). */
    if (game._pending_message) {
        (game._msg_history ||= []).push(String(game._pending_message));
        game._pending_message = '';
    }
    game._topl_show_only = describe;
    await pline(describe);
    game._topl_suppress_once = true;
    /* Remembered for exitgetpos: C's topline is PHYSICAL terminal content and
     * survives readchar_poskey (tty_nhgetch, wintty.c:4045, clears no window),
     * whereas js/input.js nhgetch() clears _pending_message on every read.  See
     * the restore at exitgetpos below. */
    game._getpos_last_autodescribe = describe;
    await flush_screen(0);
    /* C ref: getpos.c:658 curs(WIN_MAP, cx, cy) — map column x is screen
     * column x-1, map row y is screen row y+1 (topline is screen row 0). */
    set_cursor(cx - 1, cy + 1);
    return true;
}

/* C ref: getpos.c:136-161 getpos_help_keyxhelp(tmpwin, k1, k2, gloc). */
function _getpos_help_keyxhelp(tmpwin, k1, k2, gloc) {
    k1 = visctrl(game.Cmd?.spkeys?.[13 + 2 * gloc] ?? k1.charCodeAt(0));
    k2 = visctrl(game.Cmd?.spkeys?.[14 + 2 * gloc] ?? k2.charCodeAt(0));
    const iflags = game.iflags || {};
    let move_cursor_to = 'move the cursor to ';
    let filtertxt = _GLOC_FILTERTXT[(iflags.getloc_filter | 0)] ?? '';
    const usemenu = (iflags.getloc_usemenu | 0) ? 1 : 0;
    if (gloc === _GLOC_EXPLORE) {
        /* C getpos.c:146-155 — "default of 'move to unexplored location' is
         * inaccurate because the position will be one spot short of that". */
        move_cursor_to = 'move the cursor next to an ';
        if (usemenu)
            filtertxt = filtertxt.replace('this area', 'area');
    }
    putstr(tmpwin, 0, `Use '${k1}'/'${k2}' to `
        + (usemenu ? 'get a menu of ' : move_cursor_to)
        + _GLOC_DESCR[gloc][2 + usemenu] + filtertxt + '.');
}

export async function getpos_help(force, goal) {
    const key = (n) => visctrl(spkey_of(n)); // C v5 hack.h enum nh_keyfunc.
    const iflags = game.iflags || {};
    const flags = game.flags || {};
    /* C getpos.c:168-169 */
    const fastmovemode = ['8 units at a time', 'skipping same glyphs'];
    const moveskip = (iflags.getloc_moveskip | 0) ? 1 : 0;
    const terrainmode = (iflags.terrainmode | 0);
    const TER_MON = 0x08, TER_OBJ = 0x04, TER_MAP = 0x01, TER_DETECT = 0x20;
    const tmpwin = create_nhwindow(1 /* NHW_MENU */);

    putstr(tmpwin, 0, `Use '${visctrl(cmd_from_func('do_move_west'))}', '${visctrl(cmd_from_func('do_move_south'))}', '${visctrl(cmd_from_func('do_move_north'))}', '${visctrl(cmd_from_func('do_move_east'))}' to move the cursor to ${goal}.`);
    /* C getpos.c:182-189 */
    putstr(tmpwin, 0, `Use '${visctrl(cmd_from_func('do_run_west'))}', '${visctrl(cmd_from_func('do_run_south'))}', '${visctrl(cmd_from_func('do_run_north'))}', '${visctrl(cmd_from_func('do_run_east'))}' to fast-move the cursor, `
        + `${fastmovemode[moveskip]}.`);
    /* C getpos.c:190-193 */
    putstr(tmpwin, 0, `(or prefix normal move with '${_binds_visctrl(cmd_from_func('do_run'))}' or '${_binds_visctrl(cmd_from_func('do_rush'))}' to fast-move)`);
    /* C getpos.c:194 */
    putstr(tmpwin, 0, `Or enter a background symbol (ex. '<').`);
    /* C getpos.c:195-197 NHKF_GETPOS_SELF */
    putstr(tmpwin, 0, `Use '${key(NHKF_GETPOS_SELF)}' to move the cursor on yourself.`);
    /* C getpos.c:198-203 */
    if (!terrainmode || (terrainmode & TER_MON) !== 0)
        _getpos_help_keyxhelp(tmpwin, 'm', 'M', _GLOC_MONS);
    /* C getpos.c:204-205 — `if (goal && !strcmp(goal, "a monster")) goto
     * skip_non_mons;`, the ';' farlook-a-monster form. */
    if (!(goal && goal === 'a monster')) {
        /* C getpos.c:206-211 */
        if (!terrainmode || (terrainmode & TER_OBJ) !== 0)
            _getpos_help_keyxhelp(tmpwin, 'o', 'O', _GLOC_OBJS);
        /* C getpos.c:212-226 — "primarily useful when choosing a travel
         * destination for the '_' command". */
        if (!terrainmode || (terrainmode & TER_MAP) !== 0) {
            _getpos_help_keyxhelp(tmpwin, 'd', 'D', _GLOC_DOOR);
            _getpos_help_keyxhelp(tmpwin, 'x', 'X', _GLOC_EXPLORE);
            _getpos_help_keyxhelp(tmpwin, 'a', 'A', _GLOC_INTERESTING);
        }
        /* C getpos.c:227-230 NHKF_GETPOS_MOVESKIP */
        putstr(tmpwin, 0, `Use '${key(NHKF_GETPOS_MOVESKIP)}' to change fast-move mode to `
            + `${fastmovemode[1 - moveskip]}.`);
        /* C getpos.c:231-240 */
        if (!terrainmode || (terrainmode & TER_DETECT) === 0) {
            putstr(tmpwin, 0, `Use '${key(NHKF_GETPOS_MENU)}' to toggle menu listing for possible targets.`);
            putstr(tmpwin, 0, `Use '${key(NHKF_GETPOS_LIMITVIEW)}' to change the mode of limiting possible targets.`);
        }
    }
    if (!terrainmode && goal !== 'a monster') {
        /* C getpos.c:244-254 — NHKF_GETPOS_VALID_NEXT/PREV ('z'/'Z') and
         * NHKF_GETPOS_SHOWVALID ('$'); set by getpos_sethilite() callers
         * (jump, grapple, polearm applying). */
        if (getpos_getvalid)
            putstr(tmpwin, 0, `Use '${key(NHKF_GETPOS_VALID_NEXT)}' or '${key(NHKF_GETPOS_VALID_PREV)}' to move to valid locations.`);
        if (getpos_hilitefunc)
            putstr(tmpwin, 0, `Use '${key(NHKF_GETPOS_SHOWVALID)}' to toggle marking of valid locations.`);
        /* C getpos.c:255-257 NHKF_GETPOS_AUTODESC */
        putstr(tmpwin, 0, `Use '${key(NHKF_GETPOS_AUTODESC)}' to toggle automatic description.`);
    }
    if (!terrainmode || goal === 'a monster') { // C getpos.c:265 skip_non_mons.
        /* C getpos.c:266-269 — `doing_what_is = (goal == what_is_a_location)`,
         * a POINTER comparison against dowhatis()'s own static string, so it is
         * true only for the ';'/'/' farlook forms. */
        const doing_what_is = (goal === _WHAT_IS_A_LOCATION);
        const kbuf = doing_what_is
            ? `'${key(NHKF_GETPOS_PICK)}' or '${key(NHKF_GETPOS_PICK_Q)}' or '${key(NHKF_GETPOS_PICK_O)}' or '${key(NHKF_GETPOS_PICK_V)}'`
            : `'${key(NHKF_GETPOS_PICK)}'`;
        /* C getpos.c:279-281 */
        putstr(tmpwin, 0, `Type a ${kbuf} when you are at the right place.`);
        if (doing_what_is) {
            /* C getpos.c:282-300 */
            putstr(tmpwin, 0, `  '${key(NHKF_GETPOS_PICK_V)}' describe current spot, show 'more info', move to another spot.`);
            putstr(tmpwin, 0, `  '${key(NHKF_GETPOS_PICK)}' describe current spot,`
                + `${(flags.help !== false && !force) ? " prompt if 'more info'," : ''}`
                + ` move to another spot;`);
            putstr(tmpwin, 0, `  '${key(NHKF_GETPOS_PICK_Q)}' describe current spot, move to another spot;`);
            putstr(tmpwin, 0, `  '${key(NHKF_GETPOS_PICK_O)}' describe current spot, stop looking at things;`);
        }
    }
    /* C getpos.c:303-304 */
    if (!force)
        putstr(tmpwin, 0, `Type Space or Escape when you're done.`);
    /* C getpos.c:305 — the trailing blank line is a real putstr; it is the row
     * the overlay blanks before the "--More--" below it. */
    putstr(tmpwin, 0, '');
    /* C getpos.c:306-307 */
    await display_nhwindow(tmpwin, true);
    destroy_nhwindow(tmpwin);
}

export async function getpos(ccp, force, goal) {
    const g = game, u = g.u || {};
    let result = 0;                     /* getpos.c:800 */
    /* C ref: getpos.c:804 boolean msg_given = TRUE — "clear message window by
     * default"; unconditionally true on entry, so the FIRST key read never
     * triggers auto_describe. */
    let msg_given = true;
    let show_goal_msg = false;          /* getpos.c:805 */
    /* C ref: getpos.c:809/1165 — getpos saves and restores the hero's
     * direction because movecmd() writes u.dx/u.dy/u.dz decoding each key. */
    const udx = u.dx, udy = u.dy, udz = u.dz;
    /* C ref: flag.h iflags.autodescribe — on by default (options.c's Term_True
     * init, mirrored at js/doset_data.js:86) and the only in-game toggle is
     * NHKF_GETPOS_AUTODESC ('#', getpos.c:961-970), which IS modelled below.
     * It has to be read LIVE rather than latched into a const: '#' flips it in
     * the middle of this very loop, and it is an option, so the flip outlives
     * this getpos() call.  `undefined` means "never toggled", i.e. the default. */
    g.iflags = g.iflags || {};
    const _autodescribe = () => g.iflags.autodescribe !== false;
    /* C ref: getpos.c:806-808 coord *garr[NUM_GLOCS]; int gcount[], gidx[] —
     * the gather_locs cursor-cycle caches.  One set per getpos() call: C
     * declares them as locals and frees them at exitgetpos (getpos.c:1152-1154),
     * so every new getpos starts each cycle at the hero again. */
    const garr = new Array(_NUM_GLOCS).fill(null);
    const gidx = new Array(_NUM_GLOCS).fill(0);

    /* C getpos.c:815-832 — a queued direction selects an adjacent square
     * before tips, prompts, or interactive cursor input. */
    if (!g.gi?.in_doagain) {
        const cq = cmdq_pop();
        if (cq) {
            if (cq.typ === CMDQ_DIR && !cq.dirz) {
                ccp.x = u.ux + cq.dirx;
                ccp.y = u.uy + cq.diry;
            } else {
                cmdq_clear(CQ_CANNED);
                result = -1;
            }
            return result;
        }
    }

    const key = n => ((typeof n === 'number' ? spkey_of(n) : cmd_from_func(n)) << 24) >> 24;
    const pick_chars = [7, 8, 9, 10].map(key);
    const gloc_chars = Array.from({ length: 12 }, (_, i) => key(13 + i));
    /* C ref: getpos.c:838-839 — `if (handle_tip(TIP_GETPOS)) show_goal_msg =
     * TRUE;` ("tip has overwritten prompt in mesg window").
     * The tip is an NHW_TEXT window; tty pages an unacknowledged topline with
     * more() before painting any overlay window, so a pending pline (here
     * scrolltele's "Where do you want to be teleported?", teleport.c:882)
     * gets its own --More-- and its own dismiss keystroke.  Modelled the same
     * way dowhatis()/doquickwhatis() already model it: predict whether the tip
     * will open, and force_more() the pending topline first. */
    const tipWillShow = g.flags.tips !== false
        && !(g.context.tips && g.context.tips[TIP_GETPOS]);
    if (tipWillShow && g._pending_message)
        await force_more_lone_frame(g._pending_message);
    if (await handle_tip(TIP_GETPOS))
        show_goal_msg = true;

    if (!goal)
        goal = 'desired location';      /* getpos.c:840-841 */
    if (g.flags.verbose) {              /* getpos.c:842-847 */
        await pline(`(For instructions type a '${visctrl(key(25))}')`);
        msg_given = true;
    }
    if (g._pending_message) {
        const _p = String(g._pending_message);
        const _pages = _topl_more_pages(_p, _topl_joins_snapshot(_p));
        g._getpos_last_autodescribe = _pages[_pages.length - 1];
    }
    let cx = ccp.x | 0, cy = ccp.y | 0; /* getpos.c:848-849 */
    /* C ref: getpos.c:853-854 curs(WIN_MAP, cx, cy); flush_screen(0) — in that
     * order.  It matters: flush_screen(0) repaints the cells getpos_sethilite
     * just forced and leaves the cursor past the LAST of them rather than back
     * on cx,cy (see js/display.js newsym_force).  Nothing was forced when the
     * caller installed no validity callback, and then the flush leaves the
     * cursor alone and this is the old order's result. */
    set_cursor(cx - 1, cy + 1);
    await flush_screen(0);
    /* flush_screen(0) pages an over-long joined topline (topl.c:268-301), so
     * the line now standing is the last page, not the joined text seeded above
     * (scrolltele after "You hit it.  The quantum mechanic hits!" overflows). */
    if (g._pending_message)
        g._getpos_last_autodescribe = String(g._pending_message);
    if (!last_flush_forced_cursor()) {
        /* flush_screen(0)'s bot() left the tty cursor at the end of the status */
        const _se = last_flush_status_end();
        if (_se) set_cursor(_se[0], _se[1]);
        else set_cursor(cx - 1, cy + 1);
    }

    for (;;) {
        if (show_goal_msg) {            /* getpos.c:860-865 */
            const _goalLine = `Move cursor to ${goal}:`;
            await pline(_goalLine);
            await flush_screen(0);
            set_cursor(cx - 1, cy + 1);
            show_goal_msg = false;
            g._getpos_last_autodescribe = _goalLine;
        } else if (_autodescribe() && !msg_given) {
            await auto_describe(cx, cy);
        }

        let rushrun = false;            /* getpos.c:868 */
        const queued = cmdq_pop(); // C getpos.c:870-886: canned/repeat input.
        if (queued && queued.typ !== CMDQ_KEY) {
            cmdq_clear(CQ_CANNED);
            result = -1;
            break;
        }
        let c = queued ? queued.key : await readchar_poskey({ x: cx, y: cy, mod: 0 });
        if (!queued && g.iflags.remember_getpos && !g.gi?.in_doagain)
            cmdq_add_key(CQ_REPEAT, c);
        if (_autodescribe())            /* getpos.c:889-890 */
            msg_given = false;

        if (c === 27) {                 /* getpos.c:892-897 NHKF_ESC */
            cx = cy = -10;
            msg_given = true;           /* force clear */
            result = -1;
            break;
        }
        /* C ref: getpos.c:898-901 — `g`/`G` (cmd_from_func(do_rush)/do_run,
         * cmd.c extcmdlist) are a PREFIX inside getpos: they read a second key
         * and make it a fast move. */
        if (c === key(do_run) || c === key(do_rush)) {
            c = await readchar_poskey({ x: cx, y: cy, mod: 0 });
            rushrun = true;
        }
        if (pick_chars.includes(c)) { /* getpos.c:910-913 */
            result = pick_chars.indexOf(c);
            break;
        }
        let handled = false;
        let menuStatusEnd = null;
        /* C ref: getpos.c:914-920 — `else if (movecmd(c, MV_WALK)) { if
         * (rushrun) goto do_rushrun; ... }`: movecmd() runs FIRST (it is what
         * sets u.dx/u.dy from the key), and only then does rushrun redirect
         * the same decoded direction into the fast-move arm. */
        const isWalk = movecmd(c, MV_WALK);
        if (isWalk && !rushrun) {
            ({ cx, cy } = truncate_to_map(cx, cy, u.dx | 0, u.dy | 0));
            handled = true;
        } else if (isWalk || movecmd(c, MV_RUSH) || movecmd(c, MV_RUN)) {
            /* getpos.c:921-942 do_rushrun.  With iflags.getloc_moveskip off
             * (the default) a fast-move is a flat eight cells; with it on —
             * NHKF_GETPOS_MOVESKIP '*' now really toggles it — the cursor runs
             * as far as the glyph under it stays the same:
             *     int glyph = glyph_at(cx, cy);
             *     dx = u.dx; dy = u.dy;
             *     while (isok(cx+dx, cy+dy) && glyph == glyph_at(cx+dx, cy+dy)
             *            && isok(cx+dx+u.dx, cy+dy+u.dy)
             *            && glyph == glyph_at(cx+dx+u.dx, cy+dy+u.dy)) {
             *         dx += u.dx; dy += u.dy;
             *     }
             * C compares GLYPH NUMBERS; this port's display cell is a rendered
             * {ch,color,cls}, so _glyph_ident() is the identity key — see its
             * note for the one place the two can disagree. */
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
            handled = true;

        } else if (c === key(25) /* NHKF_GETPOS_HELP */) {
            /* C getpos.c:945-953 —
             *     if (c == spkeys[NHKF_GETPOS_HELP] || redraw_cmd(c)) {
             *         if (c == spkeys[NHKF_GETPOS_HELP]) getpos_help(force, goal);
             *         else docrt();
             *         getpos_refresh(); curs(WIN_MAP, cx, cy);
             *         show_goal_msg = TRUE;
             *         goto nxtc;
             *     }
             * getpos_help() opens a putstr window and BLOCKS on its own
             * --More--, so this arm consumes TWO keystrokes: the '?' read above
             * and the page-ack inside the window.  The `show_goal_msg = TRUE`
             * that follows is what reprints "Move cursor to <goal>:" on the
             * next iteration, over the map getpos_refresh() has just redrawn.
             * The old code folded '?' in with the pure key-eaters below and
             * deliberately withheld show_goal_msg because claiming it without
             * the window's keystroke would desync the input stream — correct
             * for a stub, wrong once the window is real. */
            await getpos_help(force, goal);
            await getpos_refresh(getpos_hilitefunc, getpos_getvalid, getpos_sethilite);
            show_goal_msg = true;
            handled = true;
        } else if (redraw_cmd(c) || c === key(11) /* NHKF_GETPOS_SHOWVALID */) {
            if (!redraw_cmd(c)) {
                /* getpos.c:955-959 */
                if (getpos_hilitefunc)
                    await getpos_toggle_hilite_state();
            } else {
                await getpos_refresh(getpos_hilitefunc, getpos_getvalid, getpos_sethilite);
            }
            show_goal_msg = true;
            handled = true;
        } else if (c === key(12) /* NHKF_GETPOS_AUTODESC */) {
            g.iflags.autodescribe = !_autodescribe();
            await pline(`Automatic description ${g.flags.verbose ? 'of features under cursor ' : ''}is ${_autodescribe() ? 'on' : 'off'}.`);
            g._getpos_last_autodescribe = g._pending_message; /* line now physically on the topline */
            if (!_autodescribe())
                show_goal_msg = true;
            msg_given = true;
            await flush_screen(0);
            handled = true;
        } else if (c === key(27) /* NHKF_GETPOS_LIMITVIEW */) {
            /* C getpos.c:971-989 — cycle iflags.getloc_filter through
             * GFILTER_NONE / _VIEW / _AREA, DISCARD every cached gather_locs
             * list (they were built under the old filter), and say so. */
            g.iflags.getloc_filter = ((g.iflags.getloc_filter | 0) + 1) % NUM_GFILTER;
            for (let i = 0; i < _NUM_GLOCS; i++) { garr[i] = null; gidx[i] = 0; }
            await pline(`${_GETPOS_VIEW_FILTERS[g.iflags.getloc_filter | 0]}.`);
            g._getpos_last_autodescribe = g._pending_message;
            msg_given = true;
            await flush_screen(0);
            handled = true;
        } else if (c !== key(26) && c === key(6) /* MENU precedes SELF in C */) {
            /* C getpos.c:998-1006 — reset every cycle index so the player can
             * get back to the hero's spot without walking a whole cycle. */
            for (let i = 0; i < _NUM_GLOCS; i++) gidx[i] = 0;
            cx = u.ux | 0; cy = u.uy | 0;
            handled = true;
        } else if (c !== key(26) && c === key(28) /* NHKF_GETPOS_MOVESKIP */) {
            /* C getpos.c:1007-1013 —
             *     iflags.getloc_moveskip = !iflags.getloc_moveskip;
             *     pline("%skipping over similar terrain when fastmoving the cursor.",
             *           iflags.getloc_moveskip ? "S" : "Not s");   */
            g.iflags.getloc_moveskip = !(g.iflags.getloc_moveskip);
            await pline(`${g.iflags.getloc_moveskip ? 'S' : 'Not s'}kipping`
                + ' over similar terrain when fastmoving the cursor.');
            /* the next key read drops msg_given (getpos.c:889-890), so a pick
             * leaves this line standing on the topline */
            g._getpos_last_autodescribe = g._pending_message;
            msg_given = true;
            await flush_screen(0);
            handled = true;
        } else if (c !== key(26) && gloc_chars.indexOf(c) >= 0) {
            /* C getpos.c:1014-1038 — 'm|M', 'o|O', 'd|D', 'x|X', 'a|A', 'z|Z':
             * step the cursor to the nearest/farthest monster, object, door,
             * unexplored edge, interesting thing or valid location.  The key's
             * position in mMoOdDxXaAzZ picks the gloc (index >> 1) and its
             * parity picks the direction; index 0 of each list is always the
             * hero, so a cycle that runs out visibly comes home.
             *
             * iflags.getloc_usemenu (the '!' toggle) routes this to the
             * C-faithful PICK_ONE getpos_menu() overlay below. */
            const gtmp = gloc_chars.indexOf(c);
            const gloc = gtmp >> 1;
            if (g.iflags.getloc_usemenu) {
                const picked = await _getpos_menu(gloc);
                if (picked) { cx = picked.x; cy = picked.y; }
                /* getpos.c:1148 nxtc: flush_screen(0) — paints the "You cannot
                 * see any monsters." topline raised by an empty list.  The
                 * menu's docrt ran under bot_disabled (windows.c select_menu),
                 * so botlx is still set and bot()'s BL_RESET leaves the tty
                 * cursor past the last status field (display.c:2236-2237). */
                set_cursor(cx - 1, cy + 1);
                await flush_screen(0);
                menuStatusEnd = last_flush_forced_cursor() ? null : last_flush_status_end();
                handled = true;
            } else if (!garr[gloc]) {
                garr[gloc] = await _gather_locs(gloc);
                gidx[gloc] = 0;         /* garr[][0] is the hero's spot */
            }
            if (!g.iflags.getloc_usemenu && garr[gloc].length) {
                if (!(gtmp & 1))
                    gidx[gloc] = (gidx[gloc] + 1) % garr[gloc].length;
                else if (--gidx[gloc] < 0)
                    gidx[gloc] = garr[gloc].length - 1;
                cx = garr[gloc][gidx[gloc]].x;
                cy = garr[gloc][gidx[gloc]].y;
            }
            handled = true;
        } else if (c === key(26) /* NHKF_GETPOS_MENU */) {
            /* C getpos.c:990-997 toggles iflags.getloc_usemenu and plines
             * "%s a menu to show possible targets%s." */
            g.iflags.getloc_usemenu = !g.iflags.getloc_usemenu;
            await pline(`${g.iflags.getloc_usemenu ? 'Using' : 'Not using'} a menu to show possible targets`
                + (g.iflags.getloc_usemenu ? " for 'm|M', 'o|O', 'd|D', and 'x|X'" : '') + '.');
            msg_given = true;
            await flush_screen(0);
            handled = true;
        } else if (!_QUITCHARS.includes(c)) {
            /* getpos.c:1040-1130 — symbol search: treat the key as a dungeon
             * feature symbol and jump the cursor to the next map spot showing
             * it.  All three outcomes consume exactly this one keystroke and
             * `goto nxtc`; the two failure outcomes each print a topline, and a
             * missing topline desyncs every later screen. */
            const found = _getpos_symbol_search(c, cx, cy);
            if (found) {                    /* getpos.c:1104-1109 foundc */
                cx = found.x; cy = found.y;
                if (msg_given) {
                    g._pending_message = ''; /* clear_nhwindow(WIN_MESSAGE) */
                    g._getpos_last_autodescribe = null;
                    msg_given = false;
                }
            } else if (found === null) {    /* getpos.c:1113-1115: k, not found */
                const failure = `Can't find dungeon feature '${String.fromCharCode(c)}'.`;
                await pline(failure);
                /* C leaves this newly emitted topline physically visible when
                 * the following pick exits getpos; make the exit fallback
                 * retain the failure rather than the prior auto-description. */
                g._getpos_last_autodescribe = failure;
                msg_given = true;
            } else {                        /* getpos.c:1116-1129: no k */
                /* C getpos.c:1116-1141 prints the force-dependent note.  A
                 * non-forced getpos then prints Done. and exits immediately;
                 * it does not retry the key as a movement direction. */
                const failure = `Unknown direction: '${visctrl(c)}'`
                    + (force
                        ? ` (use '${_binds_visctrl(cmd_from_func('do_move_west'))}', '${_binds_visctrl(cmd_from_func('do_move_south'))}', '${_binds_visctrl(cmd_from_func('do_move_north'))}', '${_binds_visctrl(cmd_from_func('do_move_east'))}' or '${visctrl(key(7))}').`
                        : ' (aborted).');
                await pline(failure);
                if (!force) {
                    await pline('Done.');
                    g._topl_sticky = g._pending_message;
                    g._getpos_last_autodescribe = null;
                    msg_given = false;
                    cx = -1; cy = 0;
                    result = 0;
                    break;
                }
                g._getpos_last_autodescribe = failure;
                msg_given = true;
            }
            /* C ref: getpos.c:1148 `nxtc:` ends with flush_screen(0).  The
             * shared `handled` tail below only re-cursors, so a pline raised in
             * THIS arm would never reach _screen_output; auto_describe already
             * flushes for the same reason. */
            await flush_screen(0);
            handled = true;
        } else {
            /* getpos.c:1131-1140 — a quitchar.  With force set (every caller
             * in this port passes TRUE) it is simply ignored: `if (force) goto
             * nxtc;`.  Without force it would pline("Done.") and abort. */
            if (force) {
                handled = true;
            } else {
                await pline('Done.');
                msg_given = false;      /* suppress clear */
                cx = -1; cy = 0;
                result = 0;             /* not -1 */
                break;
            }
        }
        if (handled) {
            /* C ref: getpos.c:1143-1149 `nxtc:` — gg.getposx/y = cx/cy;
             * curs(WIN_MAP, cx, cy); flush_screen(0). */
            if (menuStatusEnd) set_cursor(menuStatusEnd[0], menuStatusEnd[1]);
            else set_cursor(cx - 1, cy + 1);
            menuStatusEnd = null;
        }
    }
    /* C ref: getpos.c:1151-1168 exitgetpos. */
    if (msg_given) {
        /* clear_nhwindow(WIN_MESSAGE) */
        g._pending_message = '';
    } else if (g._getpos_last_autodescribe) {
        g._topl_sticky = g._getpos_last_autodescribe;
    }
    g._getpos_last_autodescribe = null;
    g._topl_show_only = null;
    ccp.x = cx;
    ccp.y = cy;
    await getpos_sethilite(null, null);
    u.dx = udx; u.dy = udy; u.dz = udz;
    return result;
}

/* C ref: getpos.c:594-635 coord_desc(x, y, outbuf, cmode).  The two compass
 * modes need dxdy_to_dist_descr(), which is unported; they are unreachable here
 * because iflags.getpos_coords is never assigned, and C's own `default:` arm
 * likewise leaves outbuf empty. */
export function coord_desc(x, y, cmode) {
    const u = game.u || {};
    switch (cmode) {
    case GPCOORDS_COMFULL:
    case GPCOORDS_COMPASS: /* "east", "3s", "2n,4w" */
        return `(${dxdy_to_dist_descr(x - (u.ux | 0), y - (u.uy | 0),
                                      cmode === GPCOORDS_COMFULL)})`;
    case GPCOORDS_MAP: /* x,y — upper left corner of the map is <1,0> */
        return `<${x},${y}>`;
    case GPCOORDS_SCREEN: /* y+2,x, fixed-width so /m /M /o /O line up */
        return `[${String(y + 2).padStart(2, '0')},${String(x).padStart(2, '0')}]`;
    default:
        return '';
    }
}

/* C getpos.c:557: nearby directions omit distance; longer offsets list the
 * vertical component first. Clamp invalid large offsets as C does. */
export function dxdy_to_dist_descr(dx, dy, fulldir) {
    if (!dx && !dy) return 'here';
    const direction = xytodir(dx, dy);
    if (direction !== DIR_ERR)
        return ['west', 'northwest', 'north', 'northeast', 'east', 'southeast',
                'south', 'southwest'][direction];
    const components = [];
    if (dy) components.push(`${Math.min(Math.abs(dy), 9999)}${dy > 0
        ? (fulldir ? 'south' : 's') : (fulldir ? 'north' : 'n')}`);
    if (dx) components.push(`${Math.min(Math.abs(dx), 9999)}${dx > 0
        ? (fulldir ? 'east' : 'e') : (fulldir ? 'west' : 'w')}`);
    return components.join(',');
}
