// getpos.js -- picking a map location with the cursor.
// C ref: getpos.c
//
// Ported so far: getpos_sethilite(), mapxy_valid(), auto_describe(),
// truncate_to_map() and getpos() with the movement keys (walk, and the
// rush/run keys that move 8 squares), the pick keys [.,;:], ESC and the
// getpos tip. Not ported yet: the help ('?'), ^R, '$' (showing valid
// spots with tmp_at()), '#', '@', 'm'/'M' &c gathering, the menu and
// filter toggles, and the dungeon-feature symbol search.

import { game } from './gstate.js';
import { pline, newsym, flush_screen } from './display.js';
import { tty_putstr, tty_clear_nhwindow } from './wintty.js';
import { nhgetch } from './input.js';
import { handle_tip } from './hack.js';
import { movecmd_mode, MV_WALK, MV_RUSH, MV_RUN, cmd_from_func } from './cmd.js';
import { do_screen_description } from './pager.js';
import { COLNO, ROWNO, TIP_GETPOS, TOPLINE_NEED_MORE, TOPLINE_NON_EMPTY } from './const.js';

/* C ref: getpos.c getpos_hilitefunc, getpos_getvalid (static) */
/* C ref: getpos.c enum getposHiliteState */
const HiliteNormalMap = 0, HiliteGoodposSymbol = 1, HiliteBackground = 2;

/* C ref: lookat.h LOOK_TRADITIONAL &c */
const LOOK_TRADITIONAL = 0, LOOK_QUICK = 1, LOOK_ONCE = 2, LOOK_VERBOSE = 3;

function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }

function gp() {
    if (!game.getpos_state)
        game.getpos_state = { hilitefunc: null, getvalid: null,
                              hilite_state: HiliteNormalMap,
                              defaultHiliteState: HiliteNormalMap,
                              map_frame_color: null };
    return game.getpos_state;
}

// C ref: tty curs(WIN_MAP, x, y) -- map column x is screen column x - 1,
// map row y is screen row y + 1
function curs_map(x, y) {
    const display = game.nhDisplay;
    if (display?.setCursor)
        display.setCursor(x - 1, y + 1);
    if (game.ttyDisplay) {
        game.ttyDisplay.curx = x - 1;
        game.ttyDisplay.cury = y + 1;
    }
}

// C ref: getpos.c getpos_getvalids_selection() -- the spots validf accepts
// (the callbacks are async functions here)
async function getpos_getvalids_selection(sel, validf) {
    if (!validf)
        return;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (await validf(x, y))
                sel.add(x + y * COLNO);
}

// C ref: getpos.c getpos_sethilite()
export async function getpos_sethilite(gp_hilitef, gp_getvalidf) {
    const st = gp();
    const old_getvalid = st.getvalid;
    const old_map_frame_color = st.map_frame_color;
    const sel = new Set(); /* selection_new() */
    /* iflags.bgcolors: On by default */
    const bgcolors = game.iflags?.bgcolors !== false;

    st.defaultHiliteState = bgcolors ? HiliteBackground : HiliteNormalMap;
    if (gp_getvalidf !== old_getvalid)
        st.hilite_state = st.defaultHiliteState;

    await getpos_getvalids_selection(sel, st.getvalid);
    st.hilitefunc = gp_hilitef;
    st.getvalid = gp_getvalidf;
    await getpos_getvalids_selection(sel, st.getvalid);
    /* HI_ZAP framecolor: the tty background color of valid spots isn't
       drawn by the JS map renderer (nor captured in recorded screens) */
    st.map_frame_color = (st.hilite_state === HiliteBackground) ? 'HI_ZAP' : null;

    if (st.getvalid !== old_getvalid || st.map_frame_color !== old_map_frame_color) {
        /* selection_force_newsyms(sel) */
        for (const k of sel)
            newsym(k % COLNO, Math.trunc(k / COLNO));
    }
    /* selection_free(sel, TRUE) */
}

// C ref: getpos.c mapxy_valid()
export async function mapxy_valid(x, y) {
    const st = gp();
    if (st.getvalid)
        return await st.getvalid(x, y);
    return false;
}

// C ref: getpos.c coord_desc() -- iflags.getpos_coords defaults to
// GPCOORDS_NONE, which gives an empty string
function coord_desc(x, y, cmode) {
    if (cmode && cmode !== 'none')
        throw new Error('coord_desc(): getpos_coords not ported yet');
    return "";
}

// C ref: getpos.c auto_describe()
export async function auto_describe(cx, cy) {
    const st = gp();
    const cc = { x: cx, y: cy };
    const { found, firstmatch } = do_screen_description(cc);

    if (found) {
        const tmpbuf = coord_desc(cx, cy, game.iflags?.getpos_coords);
        const autodescribe = game.iflags?.autodescribe !== false;
        const msg = `${firstmatch}${tmpbuf ? " " : ""}${tmpbuf}`
            + `${(autodescribe && st.getvalid && !(await st.getvalid(cx, cy)))
                 ? " (invalid target)" : ""}`;
        /* iflags.getloc_travelmode: " (no travel path)" -- travel isn't
           ported */
        /* custompline(SUPPRESS_HISTORY | OVERRIDE_MSGTYPE | NO_CURS_ON_U) */
        await flush_screen(0);
        await tty_putstr(game.WIN_MESSAGE, 0, msg);
        curs_map(cx, cy);
        await flush_screen(0);
    }
}

// C ref: getpos.c truncate_to_map() -- add dx,dy to cx,cy, truncating at
// map edges; returns the new [cx, cy]
function truncate_to_map(cx, cy, dx, dy) {
    /* diagonal moves complicate this... */
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
    return [cx + dx, cy + dy];
}

// C ref: cmd.c readchar_poskey() -> tty_nh_poskey()/tty_nhgetch(); the
// tty marks a --More--able top line as seen once a key is read
async function readchar_poskey() {
    const c = await nhgetch();
    const t = game.ttyDisplay;
    if (t && t.toplin === TOPLINE_NEED_MORE)
        t.toplin = TOPLINE_NON_EMPTY;
    return c;
}

// C ref: getpos.c getpos() -- have the player use movement keystrokes to
// position the cursor at a particular map location, then use one of
// [.,:;] to pick the spot
export async function getpos(ccp, force, goal) {
    /* gc.Cmd.spkeys[NHKF_GETPOS_PICK..PICK_V] with default bindings */
    const pick_chars = ".,;:";
    const pick_chars_ret = [LOOK_TRADITIONAL, LOOK_QUICK, LOOK_ONCE, LOOK_VERBOSE];
    const u = game.u;
    let result = 0;
    let c;
    let cx, cy;
    let msg_given = true; /* clear message window by default */
    let show_goal_msg = false;
    const udx = u.dx, udy = u.dy, udz = u.dz;
    let dx, dy;
    let rushrun = false;
    const autodescribe = () => game.iflags?.autodescribe !== false;

    /* if we have a queued direction, return the adjacent spot in that
       direction: the command queue isn't ported */

    if (await handle_tip(TIP_GETPOS))
        show_goal_msg = true; /* tip has overwritten prompt in mesg window */

    if (!goal)
        goal = "desired location";
    if (game.flags.verbose !== false) {
        await pline("(For instructions type a '?')"); /* visctrl(NHKF_GETPOS_HELP) */
        msg_given = true;
    }
    cx = game.getposx = ccp.x;
    cy = game.getposy = ccp.y;
    curs_map(cx, cy);
    await flush_screen(0);
    for (;;) {
        if (show_goal_msg) {
            await pline(`Move cursor to ${goal}:`);
            curs_map(cx, cy);
            await flush_screen(0);
            show_goal_msg = false;
        } else if (autodescribe() && !msg_given) {
            await auto_describe(cx, cy);
        }

        rushrun = false;

        /* cmdq_pop(): the command queue isn't ported */
        c = await readchar_poskey();

        if (autodescribe())
            msg_given = false;

        if (c === 0x1b) { /* gc.Cmd.spkeys[NHKF_ESC] */
            cx = cy = -10;
            msg_given = true; /* force clear */
            result = -1;
            break;
        }
        if (c === cmd_from_func("do_run") || c === cmd_from_func("do_rush")) {
            c = await readchar_poskey();
            rushrun = true;
        }
        const ch = String.fromCharCode(c);
        let cp;
        if ((cp = pick_chars.indexOf(ch)) >= 0 && c !== 0) {
            /* '.' => 0, ',' => 1, ';' => 2, ':' => 3 */
            result = pick_chars_ret[cp];
            break;
        } else if (!rushrun && movecmd_mode(c, MV_WALK)) {
            dx = u.dx;
            dy = u.dy;
            [cx, cy] = truncate_to_map(cx, cy, dx, dy);
        } else if (rushrun || movecmd_mode(c, MV_RUSH) || movecmd_mode(c, MV_RUN)) {
            if (rushrun && !movecmd_mode(c, MV_WALK))
                throw new Error('getpos(): rush/run prefix with a non-move key not ported yet');
            if (game.iflags?.getloc_moveskip)
                throw new Error('getpos(): getloc_moveskip not ported yet');
            dx = 8 * u.dx;
            dy = 8 * u.dy;
            [cx, cy] = truncate_to_map(cx, cy, dx, dy);
        } else if (" \r\n".includes(ch) && c !== 0) { /* quitchars */
            if (!force) {
                /* pline("Done.") ... */
                throw new Error('getpos(): non-forced quit not ported yet');
            }
            /* force: goto nxtc */
        } else {
            throw new Error(`getpos(): key '${ch}' not ported yet`);
        }
        /* nxtc: */
        game.getposx = cx;
        game.getposy = cy;
        curs_map(cx, cy);
        await flush_screen(0);
    }
    /* exitgetpos: */
    if (msg_given)
        tty_clear_nhwindow(game.WIN_MESSAGE);
    ccp.x = cx;
    ccp.y = cy;
    game.getposx = game.getposy = 0;
    await getpos_sethilite(null, null);
    u.dx = udx; u.dy = udy; u.dz = udz;
    return result;
}
