// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee, vision_recalc } from './vision.js';
import { tty_putstr, tty_display_nhwindow } from './wintty.js';
import { rank } from './botl.js';
import { ACURR } from './attrib.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, LADDER, SDOOR, SCORR,
    IRONBARS, TREE, POOL, MOAT, FOUNTAIN, SINK, ALTAR, GRAVE, THRONE,
    LAVAPOOL, LAVAWALL, ICE, AIR, CLOUD, WATER, DBWALL, DRAWBRIDGE_UP,
    DRAWBRIDGE_DOWN, D_BROKEN, LA_DOWN,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, SEE_INVIS,
} from './const.js';
import { HALLUC } from './const.js';
import {
    objects, BOULDER, STATUE, CORPSE, POTION_CLASS, FIRST_REAL_GEM,
    LAST_GLASS_GEM, FIRST_SPELL, LAST_SPELL,
} from './objects.js';
import { mons } from './monsters.js';
import { def_oc_syms } from './drawing.js';
import { observe_object } from './o_init.js';
import { is_pool } from './makemon.js';
import { NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, CLR_GREEN, CLR_CYAN,
         CLR_BLUE, CLR_BRIGHT_BLUE, CLR_RED, CLR_ORANGE, DEC_TO_UNICODE } from './terminal.js';

// ── ANSI color codes ──
// Maps CLR_* constants (0-15) to ANSI SGR color codes.
// C ref: wintty.c term_start_color
const ANSI_DEFAULT = 39;
const ANSI_COLOR = [
    30,  // CLR_BLACK     0
    31,  // CLR_RED       1
    32,  // CLR_GREEN     2
    33,  // CLR_BROWN     3
    34,  // CLR_BLUE      4
    35,  // CLR_MAGENTA   5
    36,  // CLR_CYAN      6
    37,  // CLR_GRAY      7
    39,  // NO_COLOR      8 → default
    91,  // CLR_ORANGE    9
    92,  // CLR_BRIGHT_GREEN  10
    93,  // CLR_YELLOW    11
    94,  // CLR_BRIGHT_BLUE   12
    95,  // CLR_BRIGHT_MAGENTA 13
    96,  // CLR_BRIGHT_CYAN   14
    97,  // CLR_WHITE     15
];

// C ref: defsym.h PCHAR() default symbols for the DEC line-drawing
// symbols the DECgraphics symset (dat/symbols) substitutes
const DEF_CMAP_FOR_DEC = {
    '~': '.',                               /* S_room, S_ndoor */
    'q': '-', 'x': '|',                     /* S_hwall, S_vwall */
    'l': '-', 'k': '-', 'm': '-', 'j': '-', /* corners */
    'n': '-', 'v': '-', 'w': '-',           /* S_crwall, S_tuwall, S_tdwall */
    'u': '|', 't': '|',                     /* S_tlwall, S_trwall */
};

// ── Terrain to display character + color + DEC flag ──
// With symset:DECgraphics the DEC line-drawing glyphs are used;
// otherwise the default symbols.
function terrain_glyph(loc, x, y) {
    const tg = terrain_glyph_dec(loc, x, y);
    if (tg.dec && !/^decgraphics$/i.test(game.symset_name || ''))
        return { ch: tg.asc ?? DEF_CMAP_FOR_DEC[tg.ch] ?? tg.ch, color: tg.color, dec: false };
    return { ch: tg.ch, color: tg.color, dec: tg.dec };
}

// C ref: stairs.c stairway_at()
function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

// C ref: stairs.c known_branch_stairs() -- hero knows where the stairs go
function known_branch_stairs(sway) {
    return !!(sway && sway.tolev.dnum !== game.u?.uz?.dnum && sway.u_traversed);
}

// C ref: display.c back_to_glyph() -- the background glyph of a spot,
// as { ch, color, dec } with the DECgraphics symset's line-drawing
// characters (dat/symbols "DECgraphics") where it overrides defsym.h;
// terrain_glyph() maps those back to the defsym.h defaults (asc) otherwise.
// Walls are drawn by typ (wall_angle()'s seenv modes are not ported yet).
function terrain_glyph_dec(loc, x, y) {
    const typ = loc.typ;
    const arboreal = !!game.level?.flags?.arboreal;
    const S_stone = { ch: ' ', color: NO_COLOR, dec: false };
    const S_tree = { ch: 'g', color: CLR_GREEN, dec: true, asc: '#' };
    const S_room = { ch: '~', color: NO_COLOR, dec: true };    /* '.' */
    const S_ndoor = { ch: '~', color: CLR_GRAY, dec: true };   /* '.' */
    const S_hwall = { ch: 'q', color: NO_COLOR, dec: true };   /* '-' */
    const S_vwall = { ch: 'x', color: NO_COLOR, dec: true };   /* '|' */
    switch (typ) {
    case SCORR:
    case STONE:     return arboreal ? S_tree : S_stone;
    case ROOM:      return S_room;
    case CORR:      return { ch: '#', color: CLR_GRAY, dec: false }; /* S_corr/S_litcorr */
    case SDOOR:
        if (loc.arboreal_sdoor) return S_tree;
        /* C ref: display.c wall_angle() case SDOOR: S_hwall or S_vwall */
        return loc.horizontal ? S_hwall : S_vwall;
    case HWALL:     return S_hwall;                                  // ─
    case VWALL:     return S_vwall;                                  // │
    case TLCORNER:  return { ch: 'l', color: NO_COLOR, dec: true };  // ┌
    case TRCORNER:  return { ch: 'k', color: NO_COLOR, dec: true };  // ┐
    case BLCORNER:  return { ch: 'm', color: NO_COLOR, dec: true };  // └
    case BRCORNER:  return { ch: 'j', color: NO_COLOR, dec: true };  // ┘
    case CROSSWALL: return { ch: 'n', color: NO_COLOR, dec: true };  // ┼
    case TUWALL:    return { ch: 'v', color: NO_COLOR, dec: true };  // ┴
    case TDWALL:    return { ch: 'w', color: NO_COLOR, dec: true };  // ┬
    case TLWALL:    return { ch: 'u', color: NO_COLOR, dec: true };  // ┤
    case TRWALL:    return { ch: 't', color: NO_COLOR, dec: true };  // ├
    case DOOR:
        if (loc.doormask) {
            if (loc.doormask & D_BROKEN)
                return S_ndoor;
            else if (loc.doormask & D_ISOPEN) /* S_hodoor '|' / S_vodoor '-' */
                return { ch: 'a', color: CLR_BROWN, dec: true, asc: loc.horizontal ? '|' : '-' };
            else /* else is closed: S_hcdoor / S_vcdoor */
                return { ch: '+', color: CLR_BROWN, dec: false };
        }
        return S_ndoor;
    case IRONBARS:  return { ch: '|', color: CLR_CYAN, dec: true, asc: '#' };  /* S_bars */
    case TREE:      return S_tree;
    case POOL:
    case MOAT:      return { ch: '`', color: CLR_BLUE, dec: true, asc: '}' };  /* S_pool */
    case STAIRS:
    case LADDER: {
        let down;
        if (loc.ladder) down = !!(loc.ladder & LA_DOWN);
        else down = !(game.level?.upstair?.x === x && game.level?.upstair?.y === y);
        /* S_brupstair/S_brdnstair (and ladders) for known branch stairs */
        const br = known_branch_stairs(stairway_at(x, y));
        if (typ === LADDER)
            return { ch: down ? 'z' : 'y', color: br ? CLR_YELLOW : CLR_BROWN,
                     dec: true, asc: down ? '>' : '<' };
        return { ch: down ? '>' : '<', color: br ? CLR_YELLOW : CLR_GRAY, dec: false };
    }
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case ALTAR:     return { ch: '{', color: CLR_GRAY, dec: true, asc: '_' };  /* S_altar */
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE:    return { ch: '\\', color: CLR_YELLOW, dec: false };
    case LAVAPOOL:  return { ch: '`', color: CLR_RED, dec: true, asc: '}' };
    case LAVAWALL:  return { ch: '`', color: CLR_ORANGE, dec: true, asc: '}' };
    case ICE:       return { ch: '~', color: CLR_CYAN, dec: true, asc: '.' };
    case AIR:       return { ch: ' ', color: CLR_CYAN, dec: false };
    case CLOUD:     return { ch: '#', color: CLR_GRAY, dec: false };
    case WATER:     return { ch: '`', color: CLR_BLUE, dec: true, asc: '}' };
    case DBWALL:    return { ch: '#', color: CLR_BROWN, dec: false };
    case DRAWBRIDGE_UP: return S_room;
    case DRAWBRIDGE_DOWN: return { ch: '~', color: CLR_BROWN, dec: true, asc: '#' };
    default:        return S_room;
    }
}

// C ref: termcap.c init_hilite() -- hilites[CLR_GRAY] = hilites[NO_COLOR]
// = 0, so term_start_color() emits nothing for gray: it shows as default
function tty_color(color) {
    return (color === undefined || color === CLR_GRAY) ? NO_COLOR : color;
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

// C ref: defsym.h MONSYMS -- def_monsyms[].sym, indexed by mlet (S_ANT = 1)
const def_monsyms = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ '&;:~]";

// C ref: display.h m_at() via level.monsters[][]
function mon_at_loc(x, y) {
    for (const m of game.level?.monsters || [])
        if (m.mx === x && m.my === y && !m.dead) return m;
    return null;
}

// C ref: display.h mon_visible(): not invisible (or hero sees invisible)
// and not hiding
export function mon_visible(mon) {
    const See_invisible = !!(game.u?.uprops?.[SEE_INVIS]?.intrinsic
                             || game.u?.uprops?.[SEE_INVIS]?.extrinsic);
    return (!mon.minvis || See_invisible) && !mon.mundetected;
}

// C ref: display.h canseemon(), canspotmon() -- seen at a spot in sight;
// infravision, telepathy, detection and warning (sensemon()) are not
// ported yet
function canseemon(mon) {
    return cansee(mon.mx, mon.my) && mon_visible(mon);
}
export function canspotmon(mon) {
    if (canseemon(mon))
        return true;
    throw new Error('canspotmon(): see_with_infrared()/sensemon() not ported yet');
}

// C ref: display.c display_monster() -- the plain case: the monster's own
// glyph (mon_to_glyph()), in its mons[] color; mimic appearances,
// hilite_pet/ridden-steed flags and warnings are not ported yet
function display_monster(x, y, mon) {
    const ptr = mon.data;
    const ch = def_monsyms[ptr.mlet] ?? '?';
    show_glyph_cell(x, y, ch, ptr.mcolor ?? NO_COLOR, false);
}

// C ref: you.h Hallucination
function Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    return !!(p?.intrinsic || p?.extrinsic);
}

// C ref: display.h newsym_rn2 (rn2_on_display_rng) -- the display RNG is
// separate from the core one; only hallucination draws from it here
function newsym_rn2(x) {
    throw new Error('newsym_rn2(): rn2_on_display_rng not ported yet');
}

// C ref: display.h covers_objects()
function covers_objects(x, y) {
    const typ = game.level.at(x, y).typ;
    return (is_pool(x, y) && !game.u?.uinwater) || typ === LAVAPOOL
           || typ === LAVAWALL;
}

// C ref: display.h vobj_at() -> level.objects[x][y], the top of the pile.
// game.level.objects is fobj (newest first); place_object() puts a
// non-boulder under any boulders, so a boulder is on top when there is one.
function vobj_at(x, y) {
    let top = null;
    for (const o of game.level?.objects || []) {
        if (o.ox !== x || o.oy !== y || o.where !== 'OBJ_FLOOR') continue;
        if (o.otyp === BOULDER) return o;
        if (!top) top = o;
    }
    return top;
}

// C ref: display.h obj_is_generic()
function obj_is_generic(obj) {
    return !obj.dknown
        && (obj.oclass === POTION_CLASS
            || (obj.otyp >= FIRST_REAL_GEM && obj.otyp <= LAST_GLASS_GEM)
            || (obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL));
}

// C ref: display.h obj_to_glyph() + display.c reset_glyphmap() -- the
// glyph is kept as the { ch, color, decgfx } it maps to: statues show the
// monster's class symbol in the statue's color, corpses '%' in the
// monster's color, generic objects the class's generic object (objects[]
// index oclass), the rest their own objects[] entry; the boulder uses
// SYM_BOULDER, which defaults to the rock class symbol. Pile-top glyphs
// differ only in MG_OBJPILE, which tty shows only with hilite_pile.
function obj_to_glyph(obj, rng) {
    if (obj.otyp === STATUE) {
        if (Hallucination()) rng(2);
        return { ch: def_monsyms[mons[obj.corpsenm].mlet] ?? '?',
                 color: objects[STATUE].oc_color, decgfx: false };
    }
    if (Hallucination()) rng(2);
    if (obj.otyp === CORPSE)
        return { ch: def_oc_syms[objects[CORPSE].oc_class],
                 color: mons[obj.corpsenm].mcolor ?? NO_COLOR, decgfx: false };
    const offset = obj_is_generic(obj) ? obj.oclass : obj.otyp;
    return { ch: def_oc_syms[objects[offset].oc_class],
             color: objects[offset].oc_color, decgfx: false };
}

// C ref: display.c map_object()
function map_object(obj, show) {
    const x = obj.ox, y = obj.oy;
    const loc = game.level.at(x, y);
    let glyph = obj_to_glyph(obj, newsym_rn2);

    /* if this object is already displayed as a generic object, it might
       become a specific one now */
    if (obj_is_generic(obj) && cansee(x, y) && !Hallucination()) {
        const u = game.u;
        const r = (u.xray_range > 2) ? u.xray_range : 2,
            /* neardist produces a small square with rounded corners */
            neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */
        const dx = x - u.ux, dy = y - u.uy;

        if (dx * dx + dy * dy <= neardist) {
            observe_object(obj, Hallucination());
            glyph = obj_to_glyph(obj, newsym_rn2);
        }
    }

    if (game.level.flags?.hero_memory) {
        /* MRKR: While hallucinating, statues are seen as random monsters */
        /*       but remembered as random objects.                        */
        loc.remembered_glyph = glyph;
    }
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx);
}

// C ref: display.c map_background()
function map_background(x, y, show) {
    const loc = game.level.at(x, y);
    const tg = terrain_glyph(loc, x, y);
    if (game.level.flags?.hero_memory)
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
    if (show)
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
}

// C ref: display.c _map_location() -- traps and engravings are not
// ported yet
function _map_location(x, y, show) {
    let obj;
    if ((obj = vobj_at(x, y)) && !covers_objects(x, y))
        map_object(obj, show);
    else
        map_background(x, y, show);
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero: update the remembered spot under the hero, then show self
        if (cansee(x, y)) {
            _map_location(x, y, false);
        } else {
            const tg = terrain_glyph(loc, x, y);
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        }
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        return;
    }

    // Only update display/memory if cell is IN_SIGHT (lit and visible)
    if (cansee(x, y)) {
        /* C ref: display.c newsym(): a monster seen at the spot is shown
           over the mapped location (display_monster()) */
        const mon = mon_at_loc(x, y);
        if (mon && mon_visible(mon) && !mon.m_ap_type) {
            _map_location(x, y, false); /* map under the monster */
            display_monster(x, y, mon);
        } else {
            _map_location(x, y, true);
        }
    } else if (loc.remembered_glyph) {
        // Out of sight but remembered — show remembered glyph
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
    }
}

// ── docrt ──
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc?.remembered_glyph) {
                show_glyph_cell(x, y, loc.remembered_glyph.ch,
                    loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
            }
        }
    if (game.u?.ux > 0) show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false);
    /* overlay with monsters */
    see_monsters();
}

// C ref: display.c see_monsters() -- the newsym() of each monster's spot;
// warning and sensing updates are not ported yet
export function see_monsters() {
    for (const mon of game.level?.monsters || []) {
        if (mon.dead) continue;
        newsym(mon.mx, mon.my);
    }
}

// C ref: display.c row_refresh()
// Redraw map row y, columns start..stop, from the glyph buffer (here the
// per-location disp_* fields) onto the map window (offy 1, offx 0).
export function row_refresh(start, stop, y) {
    const display = game?.nhDisplay;
    if (!display || !game.level) return;
    for (let x = Math.max(start, 1); x <= stop && x < COLNO; x++) {
        const loc = game.level.at(x, y);
        if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
        const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
        display.setCell(x - 1, y + 1, ch, tty_color(loc.disp_color), loc.disp_attr ?? 0);
    }
}

// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y) {
    if (!game.level) return '';
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x < COLNO; x++) {
        const loc = game.level.at(x, y);
        if (loc?.disp_ch && loc.disp_ch !== ' ') {
            if (firstCol < 0) firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0) return '';

    let output = '';
    let activeColor = ANSI_DEFAULT;  // default
    let activeDec = false;

    // Leading gap
    const gap = firstCol - 1;
    if (gap > 4) output += `\x1b[${gap}C`;
    else if (gap > 0) output += ' '.repeat(gap);

    for (let x = firstCol; x <= lastCol; x++) {
        const loc = game.level.at(x, y);
        const ch = loc?.disp_ch ?? ' ';
        const color = loc?.disp_color ?? NO_COLOR;
        const dec = !!loc?.disp_decgfx;

        if (ch === ' ') {
            // Space runs
            let run = 1;
            while (x + run <= lastCol && (game.level.at(x + run, y)?.disp_ch ?? ' ') === ' ') run++;
            if (activeDec) { output += '\x0f'; activeDec = false; }
            if (run > 4) output += `\x1b[${run}C`;
            else output += ' '.repeat(run);
            x += run - 1;
            continue;
        }

        let wantAnsi = ANSI_COLOR[color] ?? ANSI_DEFAULT;
        if (wantAnsi !== activeColor) {
            output += `\x1b[${wantAnsi}m`;
            activeColor = wantAnsi;
        }

        // DEC mode switching
        if (dec && !activeDec) { output += '\x0e'; activeDec = true; }
        else if (!dec && activeDec) { output += '\x0f'; activeDec = false; }

        output += ch;
    }

    // Reset state at end of row (C does per-row SO/SI)
    if (activeColor !== ANSI_DEFAULT) output += `\x1b[${ANSI_DEFAULT}m`;
    if (activeDec) output += '\x0f';

    return output;
}

// ── Status lines ──
// C ref: attrib.h A_STR .. A_CHA
const A_STR = 0, A_INT = 1, A_WIS = 2, A_DEX = 3, A_CON = 4, A_CHA = 5;

// C ref: botl.c get_strength_str()
function get_strength_str() {
    const st = ACURR(A_STR);

    if (st > 18) {
        if (st > 18 + 100) /* STR18(100) */
            return String(st - 100).padStart(2);
        else if (st < 18 + 100)
            return `18/${String(st - 18).padStart(2, '0')}`;
        else
            return "18/**";
    }
    return String(st);
}

function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    /* C ref: botl.c do_statusline1(): plname with its first letter capitalized */
    const pn = game.plname || 'Hero';
    const name = ('a' <= pn[0] && pn[0] <= 'z') ? pn[0].toUpperCase() + pn.slice(1) : pn;
    const role = game.urole?.rank ? rank() : 'Adventurer'; // C ref: botl.c rank()
    const title = `${name} the ${role}`;
    /* C ref: botl.c do_statusline1(): ACURR() of each attribute, in
       A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA display order */
    const stats = `St:${get_strength_str()} Dx:${ACURR(A_DEX)} Co:${ACURR(A_CON)} In:${ACURR(A_INT)} Wi:${ACURR(A_WIS)} Ch:${ACURR(A_CHA)}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    /* C ref: botl.c do_statusline2(): experience is "Xp:N/pts" only with
       the showexp option, and the turn counter is shown only with time */
    const expr = game.flags?.showexp ? `Xp:${u.ulevel || 1}/${u.uexp || 0}`
                                     : `Xp:${u.ulevel || 1}`;
    const tmmv = game.flags?.time ? ` T:${game.moves}` : '';
    return `Dlvl:${u.uz?.dlevel || 1} $:${game._goldCount || 0} HP:${u.uhp || 0}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} ${expr}${tmmv}`;
}

// ── Serialize terminal grid for screen comparison ──
export function serialize_terminal_grid(display) {
    let output = '';
    let lastRow = 0;
    for (let r = 0; r < display.rows; r++) {
        for (let c = 0; c < display.cols; c++) {
            if (display.grid[r][c].ch !== ' ') { lastRow = r; break; }
        }
    }
    for (let r = 0; r <= lastRow; r++) {
        let lastCol = -1;
        for (let c = display.cols - 1; c >= 0; c--) {
            if (display.grid[r][c].ch !== ' ') { lastCol = c; break; }
        }
        if (lastCol < 0) { if (r < lastRow) output += '\n'; continue; }
        let firstCol = 0;
        for (let c = 0; c <= lastCol; c++) {
            if (display.grid[r][c].ch !== ' ') { firstCol = c; break; }
        }
        if (firstCol > 4) output += `\x1b[${firstCol}C`;
        else if (firstCol > 0) output += ' '.repeat(firstCol);
        for (let c = firstCol; c <= lastCol; c++) output += display.grid[r][c].ch;
        if (r < lastRow) output += '\n';
    }
    return output;
}

// ── Build screen output ──
// The map window (rows 1-21) and the status window (rows 22-23) are
// redrawn from the glyph buffer; row 0 and whatever rows a multi-line
// message is using belong to the tty message window (wintty.js topl).
function _buildScreenOutput(cursor_on_u) {
    const display = game?.nhDisplay;
    if (!display) return;

    let output = '';
    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    output += '\n';
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status
    const [st1, st2] = game._status_lines || ['', ''];
    output += st1 + '\n';
    output += st2;

    game._screen_output = output;

    if (display.grid) {
        const msgw = game.tty_wins?.[game.WIN_MESSAGE];
        const msgrows = (game.ttyDisplay?.toplin && msgw) ? msgw.cury + 1 : 1;
        // Map — write characters to grid (DEC → Unicode for browser display)
        for (let y = 0; y < ROWNO; y++) {
            if (y + 1 < msgrows) continue;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') {
                    display.setCell(x - 1, y + 1, ' ', NO_COLOR, 0);
                    continue;
                }
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, tty_color(loc.disp_color), loc.disp_attr ?? 0);
            }
        }
        // Status lines
        const s1 = st1.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
            m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
        for (let c = 0; c < display.cols; c++)
            display.setCell(c, 22, c < s1.length ? s1[c] : ' ', NO_COLOR, 0);
        const s2 = st2;
        for (let c = 0; c < display.cols; c++)
            display.setCell(c, 23, c < s2.length ? s2[c] : ' ', NO_COLOR, 0);
        // C ref: display.c flush_screen(): if (cursor_on_u) curs(WIN_MAP, u.ux, u.uy)
        if (cursor_on_u && game.u?.ux > 0) {
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
            if (game.ttyDisplay) {
                game.ttyDisplay.curx = game.u.ux - 1;
                game.ttyDisplay.cury = game.u.uy + 1;
            }
        }
    }
}

// ── flush_screen ──
// C ref: display.c flush_screen()
export async function flush_screen(cursor_on_u) {
    if (game.disp_botl || game.disp_botlx)
        bot();
    _buildScreenOutput(cursor_on_u);
}

// ── cls ──
// C ref: display.c cls()
export async function cls() {
    const display = game?.nhDisplay;
    if (game.WIN_MESSAGE !== undefined && game.tty_wins?.[game.WIN_MESSAGE])
        await tty_display_nhwindow(game.WIN_MESSAGE, false); /* flush messages */
    game.disp_botlx = true;                   /* force update of botl window */
    if (display?.clearScreen) display.clearScreen();  /* clear_nhwindow(WIN_MAP) */
}

// ── bot ──
// C ref: botl.c bot() -- the status lines are composed now (the tty status
// window keeps them until the next bot()); they are drawn on rows 22-23
// and again by each flush_screen() redraw.
export function bot() {
    const display = game?.nhDisplay;
    if (game.u && game.u.uhp !== -1) {
        const st1 = _statusLine1(), st2 = _statusLine2();
        game._status_lines = [st1, st2];
        if (display?.grid) {
            const s1 = st1.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
                m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
            const rows = [s1, st2];
            for (let r = 0; r < 2; r++) {
                for (let c = 0; c < display.cols; c++)
                    display.setCell(c, 22 + r, c < rows[r].length ? rows[r][c] : ' ',
                                    NO_COLOR, 0);
            }
        }
    }
    game.disp_botl = game.disp_botlx = false;
}

// ── pline ──
// C ref: pline.c vpline() -- the plain message path: bring the map up to
// date (vision, flush_screen(1)) and put the line in the message window
// (tty update_topl(), which handles concatenation and --More--)
export async function pline(msg) {
    if (game.vision_full_recalc)
        vision_recalc(0);
    if (game.u?.ux)
        await flush_screen(1); /* %% */
    await tty_putstr(game.WIN_MESSAGE, 0, msg);
}
