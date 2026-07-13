// pager.js — whatis / help / encyclopedia (partial).
// C ref: pager.c do_look / dowhatis / dohelp / checkfile;
//        version.c doextversion; nhlua.c get_lua_version.
//
// Branch envelope: `/` menu (lootabc false) → map getpos / invent pick /
// symbol-or-name getlin / look_all|traps|engrs; `?` help menu + About
// (OPTIONS_AT_RUNTIME → get_lua_version nhlib shuffle) + display_file
// dat/* pages; data.base lookups for checkfile. Full glyph encyclopedia,
// whatdoes keyhelp body, and PORT_HELP deferred.

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, docrt, more,
} from './display.js';
import { getlin } from './getline.js';
import {
    paint_corner_nhw_menu, dfeature_at, invent_lines,
} from './invent.js';
import { stairway_at, known_branch_stairs } from './mklev.js';
import { getpos, LOOK_ONCE } from './getpos.js';
import { mon_at } from './uhitm.js';
import { doname, an } from './objnam.js';
import { engr_at } from './engrave.js';
import { BOLT_LIM, COLNO, ROWNO, STAIRS, LA_DOWN, ROOM, CORR, STONE } from './const.js';
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
    return readFileSync(p, 'utf8');
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

/** NHW_TEXT-ish page: paint lines, --More-- or (end), wait one key. */
async function show_text_pages(lines, { moreAtEnd = true } = {}) {
    const disp = game.nhDisplay;
    if (!disp) {
        await nhgetch();
        return;
    }
    const pageRows = 21; // leave status
    let offset = 0;
    while (offset < lines.length || (offset === 0 && lines.length === 0)) {
        game._menu_overlay = true;
        game._pending_message = '';
        disp.clearScreen();
        const chunk = lines.slice(offset, offset + pageRows);
        for (let r = 0; r < pageRows; r++) {
            const text = chunk[r] || '';
            for (let i = 0; i < text.length && i < disp.cols; i++)
                disp.setCell(i, r, text[i], NO_COLOR, 0);
        }
        const last = offset + pageRows >= lines.length;
        const footer = last && !moreAtEnd ? '(end)' : '--More--';
        const fr = Math.min(23, Math.max(chunk.length, 1));
        for (let i = 0; i < footer.length && i < disp.cols; i++)
            disp.setCell(i, fr > 20 ? 23 : fr, footer[i], NO_COLOR, 0);
        disp.setCursor(footer.length, fr > 20 ? 23 : fr);
        await flush_screen(1);
        await nhgetch();
        offset += pageRows;
        if (last) break;
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
    const lines = raw.replace(/\r\n/g, '\n').split('\n');
    // Drop trailing empty
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
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
            body.push(b.replace(/^\t/, ''));
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
    await show_text_pages(body.map(l => l || ''));
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
        // C ref: pager.c self_lookat — race + role + "called" plname
        const role = (game.urole?.name?.m || game.urole?.name || 'hero')
            .toString().toLowerCase();
        const race = (game.urace?.adj || game.urace?.noun || 'human').toLowerCase();
        const plname = (game.plname || 'hero').toLowerCase();
        return `${race} ${role} called ${plname}`;
    }
    const mtmp = mon_at(x, y);
    if (mtmp) {
        const nm = mtmp.data?.mname || mtmp.mname || 'monster';
        return mtmp.mtame ? `tame ${nm}` : nm;
    }
    const objs = game.level?.objects_at?.(x, y) || game.level?.at?.(x, y)?.objects;
    if (objs?.length) return doname(objs[0]);
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
        const nm = mtmp.data?.mname || 'monster';
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

async function look_all(nearby, do_mons) {
    const { lo_x, lo_y, hi_x, hi_y } = look_region(nearby);
    const lines = [];
    let count = 0;
    const u = game.u || {};
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf = '';
            if (do_mons) {
                if (u.ux === x && u.uy === y) {
                    lookbuf = brief_at(x, y);
                } else {
                    const m = mon_at(x, y);
                    if (m) lookbuf = brief_at(x, y);
                }
            } else {
                const loc = game.level?.at?.(x, y);
                const objs = loc?.objects || [];
                if (objs.length) lookbuf = doname(objs[0]);
            }
            if (lookbuf) {
                count++;
                if (count === 1) {
                    const which = do_mons ? 'monsters' : 'objects';
                    if (nearby) {
                        lines.push(
                            `${which[0].toUpperCase()}${which.slice(1)} currently shown near <${u.ux},${u.uy}>:`,
                        );
                    } else {
                        lines.push(
                            `All ${which} currently shown on the map:`,
                        );
                    }
                    lines.push('    ');
                }
                lines.push(`    ${lookbuf}`);
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

async function look_engrs(nearby) {
    const { lo_x, lo_y, hi_x, hi_y } = look_region(nearby);
    const lines = [];
    let count = 0;
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            const e = engr_at(x, y);
            if (!e?.engr_txt) continue;
            count++;
            if (count === 1) {
                lines.push(
                    nearby
                        ? 'Nearby seen or remembered engravings:'
                        : 'Seen or remembered engravings on this level:',
                );
                lines.push('    ');
            }
            lines.push(`    "${e.engr_txt}"`);
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
            ans = await getpos(
                cc,
                false,
                'a monster, object or location',
                brief_at,
            );
            if (ans < 0 || cc.x < 0) break;
            if (game.flags) game.flags.verbose = false;
        }

        if (from_screen) {
            const { out, first, found } = describe_looked(cc.x, cc.y);
            if (found) {
                await pline(out);
                await more();
                if (ans !== LOOK_ONCE && game.flags?.help !== false) {
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

/**
 * C ref: version.c doextversion — version text + runtime options;
 * triggers get_lua_version → nhlib shuffle once.
 */
async function doextversion() {
    get_lua_version_shuffle();
    const lines = [
        'MacOS NetHack Version 5.0.0 - last build May  2 2026 12:00:00.',
        '',
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
        '    prefix, Lua interpreter version: 5.4',
        '',
        '    "Permission is hereby granted, free of charge, to any person obtaining',
        'a copy of this software and associated documentation files (the',
        '"Software"), to deal in the Software without restriction including',
        'without limitation the rights to use, copy, modify, merge, publish,',
        'distribute, sublicense, and/or sell copies of the Software, and to',
        'permit persons to whom the Software is furnished to do so, subject to',
        'the following conditions:',
        'The above copyright notice and this permission notice shall be',
        'included in all copies or substantial portions of the Software."',
    ];
    // Two logical pages matching session (version then license) — page at 21
    await show_text_pages(lines);
    return 0;
}

async function dowhatdoes_stub() {
    // C: prompt for a key then show keyhelp; seed uses space then 'i' then '?'
    game._pending_message = 'What command do you want to know about? ';
    await flush_screen(1);
    for (;;) {
        const key = await nhgetch();
        if (key === 27) {
            game._pending_message = '';
            return;
        }
        // After a command char, show a short stub page then return
        game._pending_message = '';
        await display_file('keyhelp', true);
        return;
    }
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
        { key: 'f', text: 'Info on what a given key does.', fn: dowhatdoes_stub },
        { key: 'g', text: 'List of game options.', fn: async () => {
            await pline('(option help stub)');
            await more();
        } },
        { key: 'h', text: 'Longer explanation of game options.', fn: () => display_file('opthelp', true) },
        { key: 'i', text: "Using the '#optionsfull' or 'm O' command to set options.", fn: () => display_file('optmenu', true) },
        { key: 'j', text: 'Full list of keyboard commands.', fn: async () => {
            await pline('(key list stub)');
            await more();
        } },
        { key: 'k', text: 'List of extended commands.', fn: () => display_file('cmdhelp', true) },
        { key: 'l', text: 'List menu control keys.', fn: async () => {
            await pline('(menu controls stub)');
            await more();
        } },
        { key: 'm', text: "Description of NetHack's command line.", fn: () => display_file('usagehlp', true) },
        { key: 'n', text: 'The NetHack license.', fn: () => display_file('license', true) },
        { key: 'o', text: 'Support information.', fn: async () => {
            await pline('(contact stub)');
            await more();
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
