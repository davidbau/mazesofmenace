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
import { pline, newsym, flush_screen, glyph_at, glyph_kind,
         back_to_glyph } from './display.js';
import { invocation_pos } from './mklev.js';
import { t_at } from './trap.js';
import { VIBRATING_SQUARE } from './const.js';
import { tty_putstr, tty_clear_nhwindow } from './wintty.js';
import { visctrl } from './hacklib.js';
import { handle_tip, is_valid_travelpt } from './hack.js';
import { movecmd_mode, MV_WALK, MV_RUSH, MV_RUN, cmd_from_func,
         readchar_poskey as cmd_readchar_poskey } from './cmd.js';
import { do_screen_description } from './pager.js';
import { COLNO, ROWNO, TIP_GETPOS, TOPLINE_NEED_MORE, TOPLINE_NON_EMPTY } from './const.js';

/* C ref: getpos.c getpos_hilitefunc, getpos_getvalid (static) */
/* C ref: getpos.c enum getposHiliteState */
const HiliteNormalMap = 0, HiliteGoodposSymbol = 1, HiliteBackground = 2;

/* C ref: lookat.h LOOK_TRADITIONAL &c */
const LOOK_TRADITIONAL = 0, LOOK_QUICK = 1, LOOK_ONCE = 2, LOOK_VERBOSE = 3;

function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }

/* C ref: defsym.h PCHAR()/PCHAR2() -- defsyms[].sym, S_stone .. S_expl_br */
const DEFSYM_CHARS = [
    ' ', '|', '-', '-', '-', '-', '-', '-', '-', '-', '|', '|', /* S_stone..S_trwall */
    '.', '-', '|', '+', '+', '#', '#', '.', '.', '`', '#', '#', '#', /* ..S_engrcorr */
    '<', '>', '<', '>', '<', '>', '<', '>',                       /* stairs, ladders */
    '_', '|', '\\', '{', '{', '}', '.', '}', '}', '.', '.', '#', '#', ' ', '#', '}',
    '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^',
    '^', '^', '"', '^', '^', '^', '^', '~', '^', '^',             /* traps */
    '|', '-', '\\', '/', '*', '!', ')', '(', '0', '#', '@', '*', '#', '$',
    '/', '-', '\\', '|', '|', '\\', '-', '/',                      /* swallow */
    '/', '-', '\\', '|', ' ', '|', '\\', '-', '/',                 /* explosion */
];
const S_trwall = 11, S_ndoor = 12, S_vodoor = 13, S_hcdoor = 16,
    S_room = 19, S_darkroom = 20, S_engroom = 21, S_corr = 22, S_litcorr = 23,
    S_engrcorr = 24, S_arrow_trap = 49, S_trapped_chest = 73;

/* C ref: display.h glyph_is_cmap() + glyph_to_cmap() -- for a glyph_at(),
   remembered (lev->glyph) or back_to_glyph() glyph: its defsym.h S_* index,
   or null when it isn't a cmap glyph (or is the unexplored glyph) */
function glyph_cmapidx(glyph) {
    if (!glyph || glyph_kind_gp(glyph) !== 'cmap' || glyph.cmapidx === undefined)
        return null;
    return glyph.cmapidx;
}
function glyph_kind_gp(glyph) { return glyph.kind ?? glyph_kind(glyph); }

// C ref: getpos.c known_vibrating_square_at()
function known_vibrating_square_at(x, y) {
    /* note: this only acknowledges the genuine vibrating square, not
       fake ones produced by wizard mode wishing for traps which could
       possibly be transfered to normal play via bones file */
    if (invocation_pos(x, y)) {
        const ttmp = t_at(x, y);

        return !!(ttmp && ttmp.ttyp === VIBRATING_SQUARE && ttmp.tseen);
    }
    return false;
}


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
                 ? " (invalid target)" : ""}`
            + `${(game.iflags?.getloc_travelmode && !(await is_valid_travelpt(cx, cy)))
                 ? " (no travel path)" : ""}`;
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
    const c = await cmd_readchar_poskey();
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
                await pline("Done.");
                msg_given = false; /* suppress clear */
                cx = -1;
                cy = 0;
                result = 0; /* not -1 */
                break;
            }
            /* force: goto nxtc */
        } else if (c === 0x40) { /* gc.Cmd.spkeys[NHKF_GETPOS_SELF] '@' */
            /* reset 'm&M', 'o&O', &c: the gathering isn't ported */
            cx = u.ux;
            cy = u.uy;
        } else if (c === 0x23) { /* gc.Cmd.spkeys[NHKF_GETPOS_AUTODESC] '#' */
            if (!game.iflags) game.iflags = {};
            game.iflags.autodescribe = !autodescribe();
            await pline(`Automatic description ${
                game.flags.verbose !== false ? "of features under cursor " : ""}is ${
                autodescribe() ? "on" : "off"}.`);
            if (!autodescribe())
                show_goal_msg = true;
            msg_given = true;
            /* goto nxtc */
        } else if (c === 0x24) { /* gc.Cmd.spkeys[NHKF_GETPOS_SHOWVALID] '$' */
            if (gp().hilitefunc)
                throw new Error('getpos(): getpos_toggle_hilite_state() not ported yet');
            show_goal_msg = true; /* we're still targeting */
            /* goto nxtc */
        } else if ("?\x12\"!*mMoOdDxXaAzZ".includes(ch)) {
            throw new Error(`getpos(): key '${ch}' not ported yet`);
        } else {
            /* !strchr(quitchars, c): the quitchars were handled above */
            let k = 0;
            const matching = new Array(DEFSYM_CHARS.length).fill(0);

            for (let sidx = 0; sidx < DEFSYM_CHARS.length; sidx++) {
                /* don't even try to match some terrain: walls, room... */
                if (sidx <= S_trwall /* is_cmap_wall() */
                    || (sidx >= S_room && sidx <= S_darkroom) /* is_cmap_room() */
                    || (sidx >= S_corr && sidx <= S_litcorr) /* is_cmap_corr() */
                    || (sidx >= S_vodoor && sidx <= S_hcdoor) /* is_cmap_door() */
                    || sidx === S_ndoor)
                    continue;
                /* c == gs.showsyms[sidx]: the DECgraphics symbols all have
                   the high bit set, so only the defaults can match a key */
                if (ch === DEFSYM_CHARS[sidx]
                    /* have '^' match webs and vibrating square or any
                       other trap that uses something other than '^' */
                    || (ch === '^' && sidx >= S_arrow_trap
                        && sidx <= S_trapped_chest) /* is_cmap_trap() */
                    /* have room engraving character (default '`')
                       match corridor engravings (default '#') too */
                    || (ch === DEFSYM_CHARS[S_engroom]
                        && (sidx === S_engroom || sidx === S_engrcorr)))
                    matching[sidx] = ++k;
            }
            if (k) {
                let foundc = false;
                for (let pass = 0; pass <= 1 && !foundc; pass++) {
                    /* pass 0: just past current pos to lower right;
                       pass 1: upper left corner to current pos */
                    const lo_y = (pass === 0) ? cy : 0;
                    const hi_y = (pass === 0) ? ROWNO - 1 : cy;
                    for (let ty = lo_y; ty <= hi_y && !foundc; ty++) {
                        const lo_x = (pass === 0 && ty === lo_y) ? cx + 1 : 1;
                        const hi_x = (pass === 1 && ty === hi_y) ? cx : COLNO - 1;
                        for (let tx = lo_x; tx <= hi_x; tx++) {
                            /* first, look at what is currently visible
                               (might be monster) */
                            let kg = glyph_at(tx, ty);
                            if (glyph_cmapidx(kg) !== null
                                && matching[glyph_cmapidx(kg)]) {
                                foundc = true;
                            /* next, try glyph that's remembered here
                               (might be trap or object) */
                            } else if (game.level.flags?.hero_memory
                                /* !terrainmode: don't move to remembered
                                   trap or object if not currently shown */
                                       && !game.iflags.terrainmode
                                       && glyph_cmapidx(kg = game.level.at(tx, ty).remembered_glyph) !== null
                                       && matching[glyph_cmapidx(kg)]) {
                                foundc = true;
                            /* FIXME: check player-specified vib.sq trap
                               symbol rather than or in addition to '~' */
                            } else if (ch === '~'
                                       && known_vibrating_square_at(tx, ty)) {
                                foundc = true;
                            /* last, try actual terrain here (shouldn't
                               we be using svl.lastseentyp[][] instead?) */
                            } else if (game.level.at(tx, ty).seenv
                                       && glyph_cmapidx(kg = back_to_glyph(tx, ty)) !== null
                                       && matching[glyph_cmapidx(kg)]) {
                                foundc = true;
                            }
                            if (foundc) {
                                /* foundc: */
                                cx = tx, cy = ty;
                                if (msg_given) {
                                    tty_clear_nhwindow(game.WIN_MESSAGE);
                                    msg_given = false;
                                }
                                break;
                            }
                        } /* column */
                    }     /* row */
                }         /* pass */
                if (foundc) {
                    /* goto nxtc */
                    game.getposx = cx;
                    game.getposy = cy;
                    curs_map(cx, cy);
                    await flush_screen(0);
                    continue;
                }
                await pline(`Can't find dungeon feature '${ch}'.`);
                msg_given = true;
                /* goto nxtc */
                game.getposx = cx;
                game.getposy = cy;
                curs_map(cx, cy);
                await flush_screen(0);
                continue;
            } else {
                let note;

                if (!force)
                    note = "aborted";
                else /* hjkl */
                    note = `use '${visctrl(cmd_from_func("do_move_west"))}', `
                           + `'${visctrl(cmd_from_func("do_move_south"))}', `
                           + `'${visctrl(cmd_from_func("do_move_north"))}', `
                           + `'${visctrl(cmd_from_func("do_move_east"))}' or `
                           + `'${pick_chars[0]}'`; /* NHKF_GETPOS_PICK */
                await pline(`Unknown direction: '${visctrl(c)}' (${note}).`);
                msg_given = true;
            } /* k => matching */
            if (!force) {
                await pline("Done.");
                msg_given = false; /* suppress clear */
                cx = -1;
                cy = 0;
                result = 0; /* not -1 */
                break;
            }
            /* force: goto nxtc */
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
