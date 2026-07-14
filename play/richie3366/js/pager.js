// pager.js — whatis / help / encyclopedia (partial).
// C ref: pager.c do_look / dowhatis / dohelp / checkfile;
//        version.c doextversion; nhlua.c get_lua_version.
//
// Branch envelope: `/` menu (lootabc false) → map getpos / invent pick /
// symbol-or-name getlin / look_all|traps|engrs; `?` help menu + About
// (OPTIONS_AT_RUNTIME → get_lua_version nhlib shuffle) + display_file
// dat/* pages + dokeylist/domenucontrols/docontact; data.base lookups for
// checkfile. Full glyph encyclopedia, whatdoes keyhelp body, and PORT_HELP
// deferred.

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, docrt, more,
    mon_glyph, obj_glyph, look_shown_at,
} from './display.js';
import { getlin } from './getline.js';
import {
    paint_corner_nhw_menu, dfeature_at, invent_lines,
} from './invent.js';
import { stairway_at, known_branch_stairs } from './mklev.js';
import { getpos, LOOK_ONCE, LOOK_VERBOSE } from './getpos.js';
import { mon_at } from './uhitm.js';
import { objects_at } from './mkobj.js';
import { doname, an } from './objnam.js';
import { distant_monnam_none } from './do_name.js';
import { engr_at } from './engrave.js';
import { option_help_lines } from './options.js';
import { dokeylist_lines, domenucontrols_lines } from './dokeylist.js';
import {
    BOLT_LIM, COLNO, ROWNO, STAIRS, LA_DOWN, ROOM, CORR, STONE,
    GPCOORDS_NONE, GPCOORDS_MAP, GPCOORDS_COMPASS, GPCOORDS_SCREEN,
    STRAT_WAITMASK,
} from './const.js';
import { IS_WALL } from './const.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';

const DAT_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    '../nethack-c/upstream/dat',
);

const CHK_USR = 1;
const CHK_DONT_ASK = 2;

function datPath(name) {
    // C DATAFILE "data" is built from data.base; use source for lookup text.
    if (name === 'data') return join(DAT_DIR, 'data.base');
    return join(DAT_DIR, name);
}

function readDat(name) {
    const p = datPath(name);
    if (!existsSync(p)) return null;
    return readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * C ref: nhlua.c get_lua_version — nhl_init loads nhlib.lua → shuffle(align).
 * First call only (gl.lua_ver empty).
 */
function get_lua_version_shuffle() {
    if (game._lua_ver) return;
    const align = ['law', 'neutral', 'chaos'];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    game._lua_ver = '5.4';
    game._nhl_version_align = align;
}

/**
 * C ref: hacklib.c tabexpand — expand tabs to 8-column stops in place.
 */
function tabexpand(s) {
    let out = '';
    let idx = 0;
    for (const ch of String(s || '')) {
        if (ch === '\t') {
            do {
                out += ' ';
                idx++;
            } while (idx % 8);
        } else {
            out += ch;
            idx++;
        }
        if (idx >= 255) break; // BUFSZ-1ish truncate
    }
    return out;
}

/**
 * C ref: wintty.c tty_display_nhwindow(NHW_TEXT) + process_text_window.
 * NHW_TEXT forces maxcol=cols → offx=0 fullscreen; after lines, H2344
 * cl_eos from cury+1; --More-- on rows-1; dmore offset 1 → cursor [8,23].
 */
/**
 * C ref: wintty.c dmore → getline.c xwaitforspace(quitchars)
 * quitchars = " \\r\\n\\033". Non-matching keys bell and stay on the page
 * (each nhgetch is still a capture boundary). ESC cancels (WIN_CANCELLED).
 * @returns {Promise<boolean>} true if ESC cancelled
 */
async function text_page_wait() {
    for (;;) {
        const c = await nhgetch();
        if (c === 27) return true;
        if (c === 32 || c === 13 || c === 10) return false;
        // tty_nhbell(); ignore
    }
}

/**
 * C ref: wintty.c process_text_window NHW_TEXT + H2344 putstr page-at-a-time.
 * @returns {Promise<boolean>} true if ESC cancelled remaining pages
 */
export async function show_text_pages(lines, { moreAtEnd = true } = {}) {
    const disp = game.nhDisplay;
    if (!disp) {
        await nhgetch();
        return false;
    }
    const cols = disp.cols || 80;
    const rows = 24;
    const pageRows = rows - 1; // leave bottom for --More-- / (end)
    let offset = 0;
    let cancelled = false;
    while (offset < lines.length || (offset === 0 && lines.length === 0)) {
        game._menu_overlay = true;
        game._pending_message = '';
        disp.clearScreen();
        const chunk = lines.slice(offset, offset + pageRows);
        for (let r = 0; r < chunk.length; r++) {
            const text = chunk[r] || '';
            for (let i = 0; i < text.length && i < cols; i++)
                disp.setCell(i, r, text[i], NO_COLOR, 0);
        }
        // C H2344: tty_curs(1, cury+1); cl_eos(); then more on rows-1
        for (let r = chunk.length; r < rows - 1; r++) {
            for (let c = 0; c < cols; c++)
                disp.setCell(c, r, ' ', NO_COLOR, 0);
        }
        const last = offset + pageRows >= lines.length;
        const footer = last && !moreAtEnd ? '(end) ' : '--More--';
        const moreRow = rows - 1;
        for (let c = 0; c < cols; c++)
            disp.setCell(c, moreRow, ' ', NO_COLOR, 0);
        for (let i = 0; i < footer.length && i < cols; i++)
            disp.setCell(i, moreRow, footer[i], NO_COLOR, 0);
        // C dmore NHW_TEXT: cursor after prompt; help_dir uses [8,23] for "--More--"
        disp.setCursor(footer.startsWith('--More--') ? 8 : footer.length, moreRow);
        await flush_screen(1);
        cancelled = await text_page_wait();
        if (cancelled) break;
        offset += pageRows;
        if (last) break;
    }
    game._menu_overlay = false;
    await docrt();
    await flush_screen(1);
    return cancelled;
}

/**
 * C ref: getpos.c coord_desc GPCOORDS_MAP — "<x,y>"; y<10 gets trailing
 * space so %8s columns line up (pager.c look_all).
 */
function coord_desc(x, y, cmode = GPCOORDS_MAP) {
    if (cmode === GPCOORDS_SCREEN) {
        return `[${String(y + 2).padStart(2, '0')},${String(x).padStart(2, '0')}]`;
    }
    if (cmode === GPCOORDS_COMPASS || cmode === 'f') {
        return '(here)'; // full compass deferred; look_all defaults to MAP
    }
    let s = `<${x},${y}>`;
    if (cmode === GPCOORDS_MAP && y < 10) s += ' ';
    return s;
}

function look_coord_prefix(x, y, cmode) {
    const coordbuf = coord_desc(x, y, cmode);
    if (cmode === GPCOORDS_SCREEN) return `${coordbuf}  `;
    if (cmode === GPCOORDS_MAP) return `${coordbuf.padStart(8, ' ')}  `;
    return `${coordbuf.padStart(12, ' ')}  `;
}

function look_getpos_cmode() {
    const gpc = game.iflags?.getpos_coords;
    if (gpc && gpc !== GPCOORDS_NONE) return gpc;
    return GPCOORDS_MAP;
}

/** C ref: pager.c self_lookat — race adj + pmname + called plname. */
function self_lookat() {
    const race = (game.urace?.adj || game.urace?.noun || 'human').toLowerCase();
    const role = (game.urole?.name?.m || game.urole?.name || 'hero')
        .toString()
        .toLowerCase();
    const plname = (game.plname || 'hero').toLowerCase();
    const invis =
        game.u?.Invis && (game.u?.senseself || !game.u?.Blind) ? 'invisible ' : '';
    return `${invis}${race} ${role} called ${plname}`;
}

/**
 * C ref: pager.c look_at_monster — distant_monnam ARTICLE_NONE + tame/peaceful
 * + mfrozen/msleeping/STRAT_WAITMASK. Health / stuck / leashed / trapped /
 * mhidden / hallu deferred.
 */
function look_at_monster_buf(mtmp) {
    if (!mtmp) return 'monster';
    const name = distant_monnam_none(mtmp);
    let buf = '';
    if (mtmp.mtame) buf = 'tame ';
    else if (mtmp.mpeaceful) buf = 'peaceful ';
    buf += name;
    if (mtmp.mfrozen) {
        buf += ", can't move (paralyzed or sleeping or busy)";
    } else if (mtmp.msleeping) {
        buf += ', asleep';
    } else if ((mtmp.mstrategy || 0) & STRAT_WAITMASK) {
        buf += ', meditating';
    }
    return buf;
}

/**
 * C ref: pager.c checkfile → create_nhwindow(NHW_MENU) + putstr +
 *        display_nhwindow → wintty process_text_window (cw->data path).
 * H2344_BROKEN offx; leading pad at offx; text at offx+1; dmore
 * defmorestr "--More--" with MENU offset 2 → prompt at offx+1;
 * cursor past prompt at offx+1+strlen("--More--").
 * Corner path keeps map/status (no term_clear_screen).
 */
/**
 * Exported for insight.c putstr NHW_MENU paths (#conduct, etc.).
 * C ref: wintty.c process_text_window corner/fullscreen for NHW_MENU data.
 */
/**
 * C ref: wintty.c process_text_window + dmore(cw, quitchars) for NHW_MENU
 * putstr windows (look_here, etc.). Corner (offx≠0) paints all rows then
 * one dmore; fullscreen pages at rows-1. Both use xwaitforspace(quitchars)
 * — only space/CR/ESC advance; hjklyubn stay on the page (capture still).
 */
export async function show_nhw_menu_text(lines) {
    const disp = game.nhDisplay;
    if (!disp) {
        await text_page_wait();
        return;
    }
    const cols = disp.cols || 80;
    const rows = 24;
    const morestr = '--More--';
    let maxcol = 0;
    for (const line of lines) {
        const n0 = String(line || '').length + 1; // tty_putstr
        if (n0 > maxcol) maxcol = n0;
    }
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const maxrow = lines.length;
    if (maxrow >= rows || game.flags?.menu_overlay === false) offx = 0;

    game._pending_message = '';
    game._menu_overlay = false;
    await flush_screen(1);

    if (offx === 0) {
        // Fullscreen NHW_MENU / tall entry — clear then paint col-0 text.
        disp.clearScreen();
        const pageRows = rows - 1;
        let offset = 0;
        while (offset < lines.length || (offset === 0 && lines.length === 0)) {
            game._menu_overlay = true;
            const chunk = lines.slice(offset, offset + pageRows);
            disp.clearScreen();
            for (let r = 0; r < chunk.length; r++) {
                const text = chunk[r] || '';
                for (let i = 0; i < text.length && i < cols; i++)
                    disp.setCell(i, r, text[i], NO_COLOR, 0);
            }
            const last = offset + pageRows >= lines.length;
            const fr = Math.min(rows - 1, Math.max(chunk.length, 1));
            for (let i = 0; i < morestr.length && i < cols; i++)
                disp.setCell(i, fr, morestr[i], NO_COLOR, 0);
            disp.setCursor(morestr.length, fr);
            const cancelled = await text_page_wait();
            if (cancelled) break;
            offset += pageRows;
            if (last) break;
        }
    } else {
        // C process_text_window corner: cl_end from offx; putchar(' '); text.
        // No mid-list page break when offx≠0 — all rows then one dmore.
        for (let r = 0; r < lines.length; r++) {
            for (let c = offx; c < cols; c++)
                disp.setCell(c, r, ' ', NO_COLOR, 0);
            disp.setCell(offx, r, ' ', NO_COLOR, 0);
            const text = lines[r] || '';
            for (let i = 0; i < text.length && offx + 1 + i < cols; i++)
                disp.setCell(offx + 1 + i, r, text[i], NO_COLOR, 0);
        }
        const moreRow = lines.length;
        for (let c = offx; c < cols; c++)
            disp.setCell(c, moreRow, ' ', NO_COLOR, 0);
        // dmore NHW_MENU: prompt at offx+1
        for (let i = 0; i < morestr.length && offx + 1 + i < cols; i++)
            disp.setCell(offx + 1 + i, moreRow, morestr[i], NO_COLOR, 0);
        disp.setCursor(offx + 1 + morestr.length, moreRow);
        game._menu_overlay = true;
        await text_page_wait();
    }

    game._menu_overlay = false;
    await docrt();
    await flush_screen(1);
}

/**
 * C ref: files.c / windows.c display_file — page a dat text file.
 */
async function display_file(fname, _warn) {
    const raw = readDat(fname);
    if (!raw) {
        await pline(`Cannot open '${fname}' file!`);
        return;
    }
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    // C keeps intentional trailing blank lines (e.g. usagehlp ends with
    // an empty putstr page). Only drop the split artifact from a final \n.
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    await show_text_pages(lines);
}

/**
 * Parse data.base: keys (non-# non-tab lines) → tab-indented body lines.
 */
function lookup_data_base(query) {
    const raw = readDat('data');
    if (!raw) return null;
    const q = String(query || '').toLowerCase();
    if (!q) return null;
    const lines = raw.split('\n');
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line || line.startsWith('#') || line.startsWith('\t')
            || line.startsWith(' ')) {
            i++;
            continue;
        }
        // Collect key block until body
        const keys = [];
        while (i < lines.length) {
            const k = lines[i];
            if (!k || k.startsWith('#')) { i++; continue; }
            if (k.startsWith('\t') || k.startsWith(' ')) break;
            keys.push(k.trim().toLowerCase());
            i++;
        }
        const body = [];
        while (i < lines.length) {
            const b = lines[i];
            if (!b) { body.push(''); i++; continue; }
            if (b.startsWith('#')) { i++; continue; }
            if (!(b.startsWith('\t') || b.startsWith(' '))) break;
            // C checkfile: strip one leading tab (or up to 8 spaces), then
            // tabexpand if any remaining tab (attribution indents).
            let tp = b;
            if (tp.startsWith('\t')) tp = tp.slice(1);
            else if (tp.startsWith(' ')) {
                let n = 0;
                while (n < 8 && tp[n] === ' ') n++;
                tp = tp.slice(n);
            }
            if (tp.includes('\t')) tp = tabexpand(tp);
            body.push(tp);
            i++;
        }
        let matched = false;
        for (const key of keys) {
            if (key.startsWith('~')) continue;
            if (key.includes('*') || key.includes('?')) {
                const re = new RegExp(
                    `^${key.replace(/[.+^${}()|[\]\\]/g, '\\$&')
                        .replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
                );
                if (re.test(q)) { matched = true; break; }
            } else if (key === q) {
                matched = true;
                break;
            }
        }
        // Leading ~ keys exclude
        if (matched) {
            for (const key of keys) {
                if (!key.startsWith('~')) continue;
                const pat = key.slice(1);
                const re = new RegExp(
                    `^${pat.replace(/[.+^${}()|[\]\\]/g, '\\$&')
                        .replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
                );
                if (re.test(q)) { matched = false; break; }
            }
        }
        if (matched) return body;
    }
    return null;
}

function simplify_for_db(inp) {
    let s = String(inp || '').toLowerCase();
    const strips = [
        /^interior of /, /^a /, /^an /, /^the /, /^some /,
        /^pair of /, /^tame /, /^peaceful /, /^invisible /,
        /^saddled /, /^blessed /, /^uncursed /, /^cursed /, /^empty /,
    ];
    for (const re of strips) s = s.replace(re, '');
    s = s.replace(/ named .*$/, '').replace(/ called .*$/, '');
    s = s.replace(/ \(.*$/, '').trim();
    return s;
}

/**
 * C ref: pager.c checkfile — lookup + optional yn + display entry.
 */
async function checkfile(inp, flags = 0) {
    const userTyped = !!(flags & CHK_USR);
    const dontAsk = !!(flags & CHK_DONT_ASK);
    const dbase = simplify_for_db(inp);
    if (!dbase) return false;
    const body = lookup_data_base(dbase);
    if (!body || !body.length) {
        if (userTyped) await pline("I don't recognize that.");
        return false;
    }
    let yes = dontAsk;
    if (!dontAsk) {
        const q = `More info about "${dbase}"? [yn] (n) `;
        game._pending_message = q;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(q.length, 0);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        game._pending_message = '';
        yes = ch === 'y' || ch === 'Y';
    }
    if (!yes) return true;
    // C: NHW_MENU putstr + process_text_window — not NHW_TEXT fullscreen.
    await show_nhw_menu_text(body.map(l => l || ''));
    return true;
}

function look_region(nearby) {
    const u = game.u || {};
    const lo_y = nearby ? Math.max((u.uy || 0) - BOLT_LIM, 0) : 0;
    const lo_x = nearby ? Math.max((u.ux || 1) - BOLT_LIM, 1) : 1;
    const hi_y = nearby ? Math.min((u.uy || 0) + BOLT_LIM, ROWNO - 1) : ROWNO - 1;
    const hi_x = nearby ? Math.min((u.ux || 1) + BOLT_LIM, COLNO - 1) : COLNO - 1;
    return { lo_x, lo_y, hi_x, hi_y };
}

/**
 * C ref: display.c back_to_glyph STAIRS/LADDER + defsym.h explanation.
 * known_branch_stairs → S_brupstair/S_brdnstair ("branch staircase …");
 * else S_upstair/S_dnstair ("staircase …"). lookat copies defsyms[].explanation.
 */
function stair_cmap_explanation(x, y) {
    const sway = stairway_at(x, y);
    const loc = game.level?.at?.(x, y);
    const up = sway
        ? !!sway.up
        : !!(loc && !(loc.ladder & LA_DOWN));
    if (known_branch_stairs(sway)) {
        return up ? 'branch staircase up' : 'branch staircase down';
    }
    return up ? 'staircase up' : 'staircase down';
}

function is_stair_spot(x, y) {
    const sway = stairway_at(x, y);
    if (sway) return true;
    const loc = game.level?.at?.(x, y);
    return !!(loc && loc.typ === STAIRS);
}

/**
 * C ref: getpos.c auto_describe — prints firstmatch after
 * do_screen_description(+lookat), not the full out_str / dfeature_at.
 * Stairs: DECgraphics showsyms keep '<'/'>' for stairs while ladders use
 * ≤/≥, so cmap match is ordinary+branch staircase only; lookat overwrites
 * firstmatch with S_br* / S_*stair explanation.
 *
 * C ref: pager.c lookat cmap default — defsyms[].explanation for walls/
 * floors (not stairs_description / dfeature_at destination text).
 */
function brief_at(x, y) {
    const u = game.u || {};
    if (u.ux === x && u.uy === y) {
        return self_lookat();
    }
    const mtmp = mon_at(x, y);
    if (mtmp) {
        return look_at_monster_buf(mtmp);
    }
    const top = objects_at(x, y);
    if (top) return doname(top);
    if (is_stair_spot(x, y)) return stair_cmap_explanation(x, y);
    const feat = dfeature_at(x, y);
    if (feat) return feat;
    const e = engr_at(x, y);
    if (e?.engr_txt) return 'engraving';
    const loc = game.level?.at?.(x, y);
    if (!loc) return 'dark part of a room';
    // C lookat glyph_is_cmap → defsyms[].explanation
    if (IS_WALL(loc.typ)) return 'wall';
    if (loc.typ === ROOM) return 'floor of a room';
    if (loc.typ === CORR) {
        return loc.lit || game.flags?.lit_corridor ? 'lit corridor' : 'corridor';
    }
    if (loc.typ === STONE) {
        if (!loc.seenv) return 'unexplored';
        return 'stone';
    }
    return '';
}

/**
 * C ref: pager.c do_screen_description + lookat for looked stairs.
 * Ambiguous '<'/'>' → "a staircase … or a branch staircase … (lookat)".
 * Ladder showsyms deferred (ASCII where ladders share '<' would add two more).
 */
function describe_stairs_looked(x, y) {
    const look = stair_cmap_explanation(x, y);
    const up = look.endsWith(' up');
    const ordinary = up ? 'staircase up' : 'staircase down';
    const branch = up ? 'branch staircase up' : 'branch staircase down';
    const ch = up ? '<' : '>';
    const out = `${ch}        ${an(ordinary)} or ${an(branch)} (${look})`;
    return { out, first: look, found: 2 };
}

function describe_looked(x, y) {
    const u = game.u || {};
    const plname = game.plname || 'hero';
    if (u.ux === x && u.uy === y) {
        const role = (game.urole?.name?.m || 'wizard').toString().toLowerCase();
        const race = (game.urace?.noun || 'human').toLowerCase();
        const first = `${race} ${role}`;
        const out = `@        a human or elf (${first} called ${plname.toLowerCase()})`;
        return { out, first, found: 1 };
    }
    const mtmp = mon_at(x, y);
    if (mtmp) {
        const nm = look_at_monster_buf(mtmp).replace(/^(tame|peaceful) /, '');
        const first = nm;
        return { out: `${nm[0] || '?'}        ${an(nm)}`, first, found: 1 };
    }
    const loc = game.level?.at?.(x, y);
    const pile = loc?.objects || [];
    if (pile.length) {
        const nm = doname(pile[0]);
        return { out: `?        ${nm}`, first: simplify_for_db(nm), found: 1 };
    }
    if (is_stair_spot(x, y)) return describe_stairs_looked(x, y);
    // C ref: pager.c do_screen_description — DECgraphics shares showsym
    // \xfe among S_ndoor/S_room/S_darkroom/S_ice; lookat parenthetical.
    // Full showsyms-driven cmap scan deferred (ASCII ladders/rooms differ).
    if (loc?.typ === ROOM) {
        const look = 'floor of a room';
        // C encglyph of DECgraphics S_room is SO+'~'+SI → middle dot ·
        // (frozen serialize has no decgfx; paint Unicode like map glyphs).
        const ch = '\u00b7';
        const out = `${ch}        a doorway or the floor of a room or the dark part of a room or ice (${look})`;
        return { out, first: look, found: 4 };
    }
    if (loc?.typ === CORR) {
        // C: found > 4 under DECgraphics '#' (corr/bars/tree/bridges/…)
        // → "can be many things"; lookat still supplies (corridor).
        const look = 'corridor';
        const out = `#        can be many things (${look})`;
        return { out, first: look, found: 5 };
    }
    const feat = dfeature_at(x, y);
    if (feat) {
        const out = `${feat[0] || '.'}        ${an(feat)}`;
        return { out, first: feat, found: 1 };
    }
    const e = engr_at(x, y);
    if (e?.engr_txt) {
        return {
            out: `        an engraving "${e.engr_txt}"`,
            first: 'engraving',
            found: 1,
        };
    }
    return { out: '        dark part of a room', first: 'dark part of a room', found: 1 };
}

/**
 * C ref: pager.c look_all — NHW_TEXT list of monsters or objects.
 * Filters via newsym-equivalent "currently shown" (glyph_at), not raw
 * mon_at/objects_at. Invis/warning glyphs and object_from_map fakeobj deferred.
 */
async function look_all(nearby, do_mons) {
    const { lo_x, lo_y, hi_x, hi_y } = look_region(nearby);
    const lines = [];
    let count = 0;
    const u = game.u || {};
    const cmode = look_getpos_cmode();
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            const shown = look_shown_at(x, y);
            let lookbuf = '';
            let glyphCh = '';
            if (do_mons) {
                if (shown?.kind === 'hero') {
                    lookbuf = self_lookat();
                    glyphCh = '@';
                } else if (shown?.kind === 'mon') {
                    lookbuf = look_at_monster_buf(shown.mtmp);
                    glyphCh = mon_glyph(shown.mtmp).ch || '?';
                }
            } else if (shown?.kind === 'obj') {
                lookbuf = doname(shown.obj);
                glyphCh = obj_glyph(shown.obj).ch || '?';
            }
            if (lookbuf) {
                count++;
                if (count === 1) {
                    const which = do_mons ? 'monsters' : 'objects';
                    if (nearby) {
                        const where =
                            cmode !== GPCOORDS_COMPASS
                                ? coord_desc(u.ux, u.uy, cmode).replace(/ $/, '')
                                : 'you';
                        lines.push(
                            `${which[0].toUpperCase()}${which.slice(1)} currently shown near ${where}:`,
                        );
                    } else {
                        lines.push(
                            `All ${which} currently shown on the map:`,
                        );
                    }
                    lines.push('    ');
                }
                const prefix = look_coord_prefix(x, y, cmode);
                lines.push(`${prefix}${glyphCh}  ${lookbuf}`);
            }
        }
    }
    if (count) {
        await show_text_pages(lines, { moreAtEnd: true });
    } else {
        await pline(
            `No ${do_mons ? 'monsters' : 'objects'} are currently shown ${
                nearby ? 'nearby' : 'on the map'
            }.`,
        );
    }
}

async function look_traps(nearby) {
    const { lo_x, lo_y, hi_x, hi_y } = look_region(nearby);
    let count = 0;
    const lines = [];
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            const t = game.level?.at?.(x, y)?.trap || game.ftrap?.find?.(
                tr => tr.tx === x && tr.ty === y && tr.tseen,
            );
            if (t?.tseen || t?.ttyp != null) {
                count++;
                if (count === 1) {
                    lines.push(
                        `${nearby ? 'nearby ' : ''}seen or remembered traps${
                            nearby ? '' : ' on this level'
                        }:`.replace(/^./, c => c.toUpperCase()),
                    );
                    lines.push('    ');
                }
                lines.push(`    trap at (${x},${y})`);
            }
        }
    }
    // Also scan game.ftrap / level traps list
    const traps = game.level?.traps || game.ftrap || [];
    if (Array.isArray(traps)) {
        for (const t of traps) {
            if (!t?.tseen) continue;
            const x = t.tx ?? t.x;
            const y = t.ty ?? t.y;
            if (x < lo_x || x > hi_x || y < lo_y || y > hi_y) continue;
            count++;
        }
    }
    if (count && lines.length) {
        await show_text_pages(lines);
    } else {
        await pline(
            `No traps seen or remembered${nearby ? ' nearby' : ''}.`,
        );
    }
}

/**
 * C ref: pager.c look_engrs — NHW_TEXT; seenv + eread remembered text;
 * covered by hero/mon/obj → ", obscured by <glyph>" and engraving_to_glyph
 * '`' (S_engroom). Grave/headstone and S_engrcorr deferred.
 */
async function look_engrs(nearby) {
    const { lo_x, lo_y, hi_x, hi_y } = look_region(nearby);
    const lines = [];
    let count = 0;
    const cmode = look_getpos_cmode();
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            const loc = game.level?.at?.(x, y);
            if (!loc?.seenv) continue;
            const e = engr_at(x, y);
            if (!e) continue;
            const txt = e.engr_txt;
            const remembered =
                (typeof txt === 'string'
                    ? txt
                    : txt?.remembered_text || txt?.actual_text || '') || '';
            // After C strsubst("(engraving with " → ""): leading space retained
            let lookbuf = e.eread
                ? ` remembered text: "${remembered}"`
                : ' that you haven\'t read';

            const shown = look_shown_at(x, y);
            // Engraving cmap shown only when nothing covers; else obscured.
            // JS map rarely paints S_engroom; treat cover as hero/mon/obj.
            let glyphCh = '`'; // S_engroom / engraving_to_glyph
            if (shown?.kind === 'hero') {
                lookbuf += ', obscured by @';
            } else if (shown?.kind === 'mon') {
                lookbuf += `, obscured by ${mon_glyph(shown.mtmp).ch || '?'}`;
            } else if (shown?.kind === 'obj') {
                lookbuf += `, obscured by ${obj_glyph(shown.obj).ch || '?'}`;
            }

            count++;
            if (count === 1) {
                lines.push(
                    `${nearby ? 'Nearby seen or remembered engravings' : 'Seen or remembered engravings on this level'}:`,
                );
                lines.push('    ');
            }
            // look_engrs: no y<10 kitten on coord_desc (unlike look_all)
            const raw = `<${x},${y}>`;
            const prefix =
                cmode === GPCOORDS_SCREEN
                    ? `${coord_desc(x, y, cmode)}  `
                    : cmode === GPCOORDS_MAP
                      ? `${raw.padStart(8, ' ')}  `
                      : `${raw.padStart(12, ' ')}  `;
            // C: "%s " after encglyph (one space); lookbuf already has leading space
            lines.push(`${prefix}${glyphCh} ${lookbuf}`);
        }
    }
    if (count) await show_text_pages(lines);
    else {
        await pline(
            `No engravings seen or remembered${nearby ? ' nearby' : ''}.`,
        );
    }
}

/** Pick invent letter (C display_inventory(NULL, TRUE)). */
async function pick_inventory_letter() {
    const lines = invent_lines();
    const menuItems = lines.slice(0, -1);
    await paint_corner_nhw_menu(menuItems, '(end) ');
    const key = await nhgetch();
    game._menu_overlay = false;
    await docrt();
    await flush_screen(1);
    if (key === 27) return null;
    return String.fromCharCode(key);
}

async function whatis_menu_choice() {
    await flush_topl_more();
    const entries = [
        { text: 'What do you want to look at:', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        { text: '/ - something on the map', attr: 0 },
        { text: "i - something you're carrying", attr: 0 },
        { text: '? - something else (by symbol or name)', attr: 0 },
        { text: '', attr: 0 },
        { text: 'm - nearby monsters', attr: 0 },
        { text: 'M - all monsters shown on map', attr: 0 },
        { text: 'o - nearby objects', attr: 0 },
        { text: 'O - all objects shown on map', attr: 0 },
        { text: 't - nearby traps', attr: 0 },
        { text: 'T - all seen or remembered traps', attr: 0 },
        { text: 'e - nearby engravings', attr: 0 },
        { text: 'E - all seen or remembered engravings', attr: 0 },
    ];
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === 'q') return 'q';
        if (ch === '\r' || ch === '\n' || ch === ' ') continue;
        // lootabc false: y ≡ /, n ≡ ?
        if (ch === 'y') return '/';
        if (ch === 'n') return '?';
        if ('/i?mMoOtTeE'.includes(ch)) return ch;
    }
}

/**
 * C ref: pager.c do_look(mode=0) / dowhatis.
 * Returns ECMD_OK (0) — never takes time.
 */
export async function do_look(mode = 0) {
    const quick = mode === 1;
    let i = 0;
    let from_screen = false;
    let sym = 0;
    const cc = { x: game.u?.ux || 1, y: game.u?.uy || 0 };

    if (!quick) {
        i = (await whatis_menu_choice()).charCodeAt(0);
    } else {
        i = 'y'.charCodeAt(0);
    }

    const ch = String.fromCharCode(i);
    switch (ch) {
    default:
    case 'q':
        return 0;
    case 'y':
    case '/':
        from_screen = true;
        sym = 0;
        cc.x = game.u.ux;
        cc.y = game.u.uy;
        break;
    case 'i': {
        const invlet = await pick_inventory_letter();
        if (!invlet || invlet === '\u001b') return 0;
        let name = '';
        for (const obj of game.invent || []) {
            if (obj.invlet === invlet) {
                name = doname(obj);
                break;
            }
        }
        if (name) await checkfile(name, CHK_USR | CHK_DONT_ASK);
        return 0;
    }
    case '?': {
        from_screen = false;
        let out_str = await getlin('Specify what? (type the word)');
        if (out_str === ' ') {
            /* keep */
        } else {
            out_str = String(out_str || '').trim().replace(/\s+/g, ' ');
        }
        if (!out_str || out_str.charCodeAt(0) === 27) return 0;
        if (out_str.length > 1) {
            await checkfile(out_str, CHK_USR | CHK_DONT_ASK);
            return 0;
        }
        sym = out_str.charCodeAt(0);
        break;
    }
    case 'm':
        await look_all(true, true);
        return 0;
    case 'M':
        await look_all(false, true);
        return 0;
    case 'o':
        await look_all(true, false);
        return 0;
    case 'O':
        await look_all(false, false);
        return 0;
    case 't':
        await look_traps(true);
        return 0;
    case 'T':
        await look_traps(false);
        return 0;
    case 'e':
        await look_engrs(true);
        return 0;
    case 'E':
        await look_engrs(false);
        return 0;
    }

    const save_verbose = game.flags?.verbose !== false;
    if (game.flags) game.flags.verbose = save_verbose && !quick;

    let ans = 0;
    do {
        if (from_screen) {
            if (game.flags?.verbose !== false) {
                await pline(
                    'Please move the cursor to a monster, object or location.',
                );
            } else {
                await pline('Pick a monster, object or location.');
            }
            // Force --More-- before getpos when message is long
            if ((game._pending_message || '').length > 40) await more();
            // C: getpos(&cc, quick, …) — quick glance uses force=TRUE
            ans = await getpos(
                cc,
                quick,
                'a monster, object or location',
                brief_at,
            );
            if (ans < 0 || cc.x < 0) break;
            if (game.flags) game.flags.verbose = false;
        }

        if (from_screen) {
            const { out, first, found } = describe_looked(cc.x, cc.y);
            if (found) {
                // C: putmixed(WIN_MESSAGE) — no forced more(); pline wrap
                // already more()'s when out_str spans lines.
                await pline(out);
                // C: checkfile only when !LOOK_QUICK/ONCE && (VERBOSE || (help && !quick))
                if (
                    found === 1
                    && ans !== LOOK_ONCE
                    && (ans === LOOK_VERBOSE || (game.flags?.help !== false && !quick))
                ) {
                    await checkfile(first, 0);
                }
            } else {
                await pline("I've never heard of such things.");
            }
        } else if (sym) {
            await pline(`${String.fromCharCode(sym)}        (symbol lookup stub)`);
            await more();
        }
    } while (from_screen && !quick && ans !== LOOK_ONCE);

    if (game.flags) game.flags.verbose = save_verbose;
    return 0;
}

/** C ref: pager.c dowhatis */
export async function dowhatis() {
    return do_look(0);
}

/** C ref: pager.c doquickwhatis — ';' glance */
export async function doquickwhatis() {
    return do_look(1);
}

/**
 * C ref: mdlib.c build_options + version.c doextversion OPTIONS_AT_RUNTIME
 * path (do_runtime_info). Contest MacOS tty/nosound feature set; :PATMATCH:
 * / :LUACOPYRIGHT: already substituted (posixregex / Lua copyright).
 * Outdented headers get a blank separator; blank/prolog lines are skipped.
 */
function doextversion_runtime_lines() {
    // C putstr order after getversionstring; prolog "    NetHack version…"
    // from build_options is skipped by doextversion's prolog flag.
    const runtime = [
        'Options compiled into this edition:',
        '    I32LP64 data model, color, data file compression, deferred handling of',
        '    hangup signal, insurance files for recovering from crashes, live logging',
        '    support, log file, extended log file, errors and warnings log file, mail',
        '    daemon, news file, internal pager used for viewing help files, pattern',
        '    matching via posixregex, pseudo random numbers generated by ISAAC64,',
        '    strong PRNG seed from /dev/random, restore saved games via menu, screen',
        '    clipping, shell command, traditional status display, status via',
        '    windowport with highlighting, suspend command, terminal info library,',
        '    system configuration at run-time, show stack trace on error, launch',
        '    browser to report issues, save and bones files accepted from version',
        '    5.0.0 only, and basic NetHack features.',
        'Supported windowing system:',
        '    "tty" (traditional text with optional line-drawing).',
        'Supported soundlib:',
        '    "nosound".',
        "NetHack 5.0.* uses the 'Lua' interpreter to process some data:",
        '    Lua 5.4.8  Copyright (C) 1994-2025 Lua.org, PUC-Rio',
        // mdlib.lua_info Permission block (5-space continuation indent)
        '    "Permission is hereby granted, free of charge, to any person obtaining',
        '     a copy of this software and associated documentation files (the',
        '     "Software"), to deal in the Software without restriction including',
        '     without limitation the rights to use, copy, modify, merge, publish,',
        '     distribute, sublicense, and/or sell copies of the Software, and to',
        '     permit persons to whom the Software is furnished to do so, subject to',
        '     the following conditions:',
        '     The above copyright notice and this permission notice shall be',
        '     included in all copies or substantial portions of the Software."',
    ];
    const out = [];
    for (const buf of runtime) {
        if (buf && buf[0] !== ' ') out.push(''); // outdented header separator
        if (!buf) continue;
        out.push(buf);
    }
    return out;
}

/**
 * C ref: version.c doextversion — version text + runtime options;
 * triggers get_lua_version → nhlib shuffle once.
 * Also `#version` via extcmdlist (cmd.c).
 */
export async function doextversion() {
    get_lua_version_shuffle();
    // C getversionstring → nomakedefs.version_id (runner normalizes date).
    const lines = [
        'MacOS NetHack Version 5.0.0 - last build May  2 2026 12:00:00.',
        ...doextversion_runtime_lines(),
    ];
    await show_text_pages(lines);
    return 0;
}

/**
 * C ref: cmd.c key2txt — short label for one-byte key.
 */
function key2txt(c) {
    if (c === 32) return '<space>';
    if (c === 27) return '<esc>';
    if (c === 10 || c === 13) return '<enter>';
    if (c === 127) return '<del>';
    if (c >= 1 && c <= 26) return `^${String.fromCharCode(c + 64)}`;
    return String.fromCharCode(c);
}

/**
 * C ref: cmd.c key2extcmddesc — description for a command key.
 * Branch envelope: letters bound in rhack/cmd.js + common meta; full
 * misc_keys / number_pad / rush-run prefixes deferred.
 */
function key2extcmddesc(key) {
    const ch = typeof key === 'number' ? String.fromCharCode(key) : String(key);
    /** @type {Record<string, [string, string]>} ef_desc, ef_txt */
    const binds = {
        i: ['show your inventory', 'inventory'],
        ':': ['look here', 'look'],
        ',': ['pick up things', 'pickup'],
        '.': ['rest one move', 'wait'],
        s: ['search for traps and secret doors', 'search'],
        o: ['open a door', 'open'],
        c: ['close a door', 'close'],
        a: ['apply (use) something', 'apply'],
        e: ['eat something', 'eat'],
        q: ['quaff (drink) something', 'quaff'],
        r: ['read a scroll or spellbook', 'read'],
        z: ['zap a wand', 'zap'],
        t: ['throw something', 'throw'],
        f: ['fire ammunition', 'fire'],
        w: ['wield a weapon', 'wield'],
        W: ['wear armor', 'wear'],
        T: ['take off armor', 'takeoff'],
        P: ['put on an accessory', 'puton'],
        R: ['remove an accessory', 'remove'],
        E: ['engrave into the floor', 'engrave'],
        d: ['drop an item', 'drop'],
        '/': ['identify a glyph or creature', 'whatis'],
        '?': ['get this help menu', 'help'],
        '<': ['go up a staircase', 'up'],
        '>': ['go down a staircase', 'down'],
        '_': ['travel to a map location', 'travel'],
        ' ': ['rest one move', 'wait'],
    };
    const b = binds[ch];
    if (!b) return null;
    return `${b[0]} (#${b[1]})`;
}

/**
 * C ref: pager.c whatdoes_help — page KEYHELP with leading WS stripped.
 */
async function whatdoes_help() {
    const raw = readDat('keyhelp');
    if (!raw) {
        await pline('Cannot open "keyhelp" data file!');
        await more();
        return;
    }
    const lines = [];
    for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
        if (line.startsWith('#')) continue;
        let p = 0;
        while (p < line.length && (line[p] === ' ' || line[p] === '\t')) p++;
        lines.push(line.slice(p));
    }
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    await show_text_pages(lines);
}

/**
 * C ref: pager.c dowhatdoes_core — key2extcmddesc → "%-8s%s.".
 */
function dowhatdoes_core(q) {
    const ec = key2extcmddesc(q);
    if (!ec) return null;
    const keybuf = key2txt(q).padEnd(8, ' ');
    return `${keybuf}${ec}.`;
}

/**
 * C ref: pager.c dowhatdoes — tip once, yn_function "What command?", describe.
 */
async function dowhatdoes() {
    if (!game._whatdoes_once) {
        await pline("Ask about '&' or '?' to get more info.");
        // C: previous topline / yn_function path surfaces --More-- before prompt
        await more();
        game._whatdoes_once = true;
    }
    // C: yn_function("What command?", NULL, '\0', TRUE) — prompt + one key
    game._pending_message = 'What command? ';
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(14, 0); // after "What command? "
    const q = await nhgetch();
    game._pending_message = '';
    const reslt = dowhatdoes_core(q);
    if (reslt) {
        if (q === 38 || q === 63) await whatdoes_help(); // '&' or '?'
        const nl = reslt.indexOf('\n');
        if (nl < 0) {
            await pline(reslt);
        } else {
            await pline(`${reslt.slice(0, nl)},`);
            await pline(`${reslt.slice(0, 8)}${reslt.slice(nl + 1)}`);
        }
    } else {
        const label = key2txt(q);
        await pline(
            `No such command '${label}', char code ${q} (0${q.toString(8).padStart(3, '0')} or 0x${q.toString(16).padStart(2, '0')}).`,
        );
    }
    return 0;
}

/**
 * C ref: pager.c dohelp — help menu.
 */
export async function dohelp() {
    await flush_topl_more();
    const items = [
        { key: 'a', text: 'About NetHack (version information).', fn: doextversion },
        { key: 'b', text: 'Long description of the game and commands.', fn: () => display_file('help', true) },
        { key: 'c', text: 'List of game commands.', fn: () => display_file('hh', true) },
        { key: 'd', text: 'Concise history of NetHack.', fn: () => display_file('history', true) },
        { key: 'e', text: 'Info on a character in the game display.', fn: dowhatis },
        { key: 'f', text: 'Info on what a given key does.', fn: dowhatdoes },
        // C ref: options.c option_help via pager.c dohelp help_menu
        { key: 'g', text: 'List of game options.', fn: async () => {
            await show_text_pages(option_help_lines());
        } },
        { key: 'h', text: 'Longer explanation of game options.', fn: () => display_file('opthelp', true) },
        { key: 'i', text: "Using the '#optionsfull' or 'm O' command to set options.", fn: () => display_file('optmenu', true) },
        // C ref: cmd.c dokeylist
        { key: 'j', text: 'Full list of keyboard commands.', fn: async () => {
            await show_text_pages(dokeylist_lines());
        } },
        { key: 'k', text: 'List of extended commands.', fn: () => display_file('cmdhelp', true) },
        // C ref: pager.c domenucontrols → options.c show_menu_controls
        { key: 'l', text: 'List menu control keys.', fn: async () => {
            await show_text_pages(domenucontrols_lines());
        } },
        { key: 'm', text: "Description of NetHack's command line.", fn: () => display_file('usagehlp', true) },
        { key: 'n', text: 'The NetHack license.', fn: () => display_file('license', true) },
        // C ref: pager.c docontact
        { key: 'o', text: 'Support information.', fn: async () => {
            await show_text_pages([
                'To contact the NetHack development team directly,',
                "see the 'Contact' form on our website or email <devteam@nethack.org>.",
                '',
                'For more information on NetHack, or to report a bug,',
                'visit our website "https://www.nethack.org/".',
            ]);
        } },
    ];
    if (game.flags?.debug || game.wizard) {
        items.push({
            key: 'p',
            text: 'List of wizard-mode commands.',
            fn: () => display_file('wizhelp', true),
        });
    }

    const entries = [
        { text: 'Select one item:', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...items.map(it => ({ text: `${it.key} - ${it.text}`, attr: 0 })),
    ];

    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === 'q') return 0;
        if (ch === '\r' || ch === '\n' || ch === ' ') continue;
        const it = items.find(x => x.key === ch);
        if (it) {
            await it.fn();
            return 0;
        }
    }
}
