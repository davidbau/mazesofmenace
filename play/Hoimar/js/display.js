// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee } from './vision.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, SDOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    FOUNTAIN, SINK, ALTAR, GRAVE, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    HOLE, TRAPDOOR, M_AP_OBJECT, IS_POOL,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, WM_MASK,
    WARNCOUNT, def_warnsyms,
} from './const.js';
import { depth, distmin, dist2 } from './hacklib.js';
import {
    NO_COLOR, CLR_BLACK, CLR_BLUE, CLR_GREEN, CLR_GRAY, CLR_BROWN, CLR_RED,
    CLR_WHITE, CLR_ORANGE, CLR_YELLOW, CLR_BRIGHT_BLUE,
    ATR_INVERSE, ATR_BOLD, ATR_UNDERLINE, DEC_TO_UNICODE,
} from './terminal.js';
import { roleRankForLevel } from './roles.js';

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
const COLOR_BY_ANSI = new Map(ANSI_COLOR.map((ansi, color) => [ansi, color]));

const POTION_CLASS = 8;
const SPBOOK_CLASS = 10;
const GEM_CLASS = 13;
const FIRST_REAL_GEM = 439;
const LAST_GLASS_GEM = 469;
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const BOULDER = 475;

const GENERIC_OBJECT_GLYPH = {
    [POTION_CLASS]: { ch: '!', color: CLR_GRAY },
    [SPBOOK_CLASS]: { ch: '+', color: CLR_GRAY },
    [GEM_CLASS]: { ch: '*', color: CLR_GRAY },
};

function tty_color(color) {
    return color === CLR_GRAY || color === CLR_BLACK ? NO_COLOR : color;
}

function obj_is_generic(obj) {
    if (!obj || obj.dknown) return false;
    const otyp = obj.otyp ?? -1;
    return obj.oclass === POTION_CLASS
        || (otyp >= FIRST_REAL_GEM && otyp <= LAST_GLASS_GEM)
        || (otyp >= FIRST_SPELL && otyp <= LAST_SPELL);
}

function observe_object(obj) {
    if (obj) obj.dknown = true;
}

function object_glyph_for_display(obj, x, y, visible) {
    let generic = obj_is_generic(obj);
    if (generic && visible && !game.u?.uhallucination) {
        const r = Math.max(game.u?.xray_range || 0, 2);
        const neardist = (r * r) * 2 - r;
        if (dist2(x, y, game.u?.ux ?? 0, game.u?.uy ?? 0) <= neardist) {
            observe_object(obj);
            generic = false;
        }
    }

    if (generic) {
        return GENERIC_OBJECT_GLYPH[obj.oclass] || { ch: obj.ch || '?', color: obj.color ?? NO_COLOR };
    }
    return { ch: obj.ch || '?', color: obj.color ?? NO_COLOR };
}

function is_branch_stair(x, y) {
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y && st.isbranch) return true;
    return false;
}

// ── Terrain to display character + color + DEC flag ──
function terrain_glyph(loc, x, y) {
    const typ = display_wall_type(loc);
    const wallColor = game.level?.flags?.sokoban_rules ? CLR_BLUE : NO_COLOR;
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM:      return { ch: '~', color: NO_COLOR, dec: true };  // DEC middle dot
    case CORR:      return { ch: '#', color: NO_COLOR, dec: false };
    case DOOR:
        if (loc.doormask & D_ISOPEN) return { ch: '|', color: CLR_BROWN, dec: false };
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
        return { ch: '~', color: NO_COLOR, dec: true };  // D_NODOOR = floor
    case SDOOR:
        // C ref: display.c:wall_angle().  Undiscovered secret doors render
        // as their underlying wall orientation until they are revealed.
        return loc.horizontal
            ? { ch: 'q', color: wallColor, dec: true }
            : { ch: 'x', color: wallColor, dec: true };
    case STAIRS:
        {
            const color = is_branch_stair(x, y) ? CLR_YELLOW : CLR_GRAY;
            if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
                return { ch: '<', color, dec: false };
            return { ch: '>', color, dec: false };
        }
    // Wall types → DEC line-drawing characters
    case HWALL:     return { ch: 'q', color: wallColor, dec: true };  // ─
    case VWALL:     return { ch: 'x', color: wallColor, dec: true };  // │
    case TLCORNER:  return { ch: 'l', color: wallColor, dec: true };  // ┌
    case TRCORNER:  return { ch: 'k', color: wallColor, dec: true };  // ┐
    case BLCORNER:  return { ch: 'm', color: wallColor, dec: true };  // └
    case BRCORNER:  return { ch: 'j', color: wallColor, dec: true };  // ┘
    case CROSSWALL: return { ch: 'n', color: wallColor, dec: true };  // ┼
    case TUWALL:    return { ch: 'v', color: wallColor, dec: true };  // ┴
    case TDWALL:    return { ch: 'w', color: wallColor, dec: true };  // ┬
    case TLWALL:    return { ch: 'u', color: wallColor, dec: true };  // ┤
    case TRWALL:    return { ch: 't', color: wallColor, dec: true };  // ├
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    case SINK:      return { ch: '#', color: CLR_GRAY, dec: false };
    case ALTAR:     return { ch: '_', color: CLR_GRAY, dec: false };
    case GRAVE:     return { ch: '|', color: CLR_GRAY, dec: false };
    case POOL:
    case MOAT:
        // C ref: display.c:back_to_glyph() S_pool.  The tty DECgraphics wire
        // glyph for liquid surfaces is the backtick diamond byte.
        return { ch: '`', color: CLR_BLUE, dec: false };
    case WATER:
        return { ch: '`', color: CLR_BRIGHT_BLUE, dec: false };
    case LAVAPOOL:
        return { ch: '`', color: CLR_RED, dec: false };
    case LAVAWALL:
        return { ch: '`', color: CLR_ORANGE, dec: false };
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

function display_wall_type(loc) {
    // C ref: display.c:wall_angle(). For wallification glyphs, NetHack
    // derives the visible wall character from terrain type plus seenv.
    const seenv = (loc.seenv || 0) & 0xff;
    if (!seenv || ((loc.wall_info || 0) & WM_MASK)) return loc.typ;
    let rotated = seenv;
    let row = null;
    switch (loc.typ) {
    case TDWALL:
        row = [STONE, TLCORNER, TRCORNER, HWALL, TDWALL];
        break;
    case TLWALL:
        rotated = ((seenv >> 2) | (seenv << 6)) & 0xff;
        row = [STONE, TRCORNER, BRCORNER, VWALL, TLWALL];
        break;
    case TUWALL:
        rotated = ((seenv >> 4) | (seenv << 4)) & 0xff;
        row = [STONE, BRCORNER, BLCORNER, HWALL, TUWALL];
        break;
    case TRWALL:
        rotated = ((seenv >> 6) | (seenv << 2)) & 0xff;
        row = [STONE, BLCORNER, TLCORNER, VWALL, TRWALL];
        break;
    default:
        return loc.typ;
    }

    let col = 0;
    if (rotated === SV4) col = 1;
    else if (rotated === SV6) col = 2;
    else if ((rotated & (SV3 | SV5 | SV7)) || ((rotated & SV4) && (rotated & SV6))) col = 4;
    else if (rotated & (SV0 | SV1 | SV2)) col = (rotated & (SV4 | SV6)) ? 4 : 3;
    return row[col];
}

function trap_glyph(trap) {
    if (!trap) return null;
    const color = (trap.ttyp === HOLE || trap.ttyp === TRAPDOOR) ? CLR_BROWN : CLR_GRAY;
    return { ch: '^', color, dec: false };
}

function monster_glyph(mon) {
    if (mon?.m_ap_type === M_AP_OBJECT && mon.mappearance === BOULDER) {
        return { ch: '`', color: CLR_GRAY, dec: false };
    }
    return { ch: mon.ch, color: mon.color, dec: false };
}

function warning_glyph(mon) {
    // C ref: display.h:_mon_warning(), display.c:warning_of() and
    // display_warning(). Warning floats over unseen hostile monsters.
    if (!game.u?.uprops?.warning || mon?.mpeaceful) return null;
    if (dist2(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) >= 100) return null;
    const level = Math.trunc((mon.m_lev ?? mon.data?.mlevel ?? 0) / 4);
    if (level < (game.context?.warnlevel ?? 1)) return null;
    return def_warnsyms[Math.min(WARNCOUNT - 1, Math.max(0, level))] || null;
}

export function refresh_warning_monsters() {
    if (!game.u?.uprops?.warning) return;
    for (const mon of game.level?.monsters || []) newsym(mon.mx, mon.my);
}

function show_premapped_mimics() {
    if (!game.level?.flags?.premapped) return;
    for (const mon of game.level.monsters || []) {
        if (mon.m_ap_type !== M_AP_OBJECT) continue;
        const loc = game.level.at(mon.mx, mon.my);
        if (!loc?.lit || distmin(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) > 2) continue;
        const mg = monster_glyph(mon);
        loc.remembered_glyph = { ch: mg.ch, color: mg.color, decgfx: mg.dec };
        show_glyph_cell(mon.mx, mon.my, mg.ch, mg.color, mg.dec);
    }
}

function terrain_covers_objects(loc) {
    // C ref: display.h:covers_objects(). Pools cover objects unless the hero
    // is underwater; lava always covers objects and traps.
    const underwater = !!(game.u?.uprops?.underwater || game.u?.underwater || game.Underwater);
    return ((IS_POOL(loc.typ) && !underwater) || loc.typ === LAVAPOOL || loc.typ === LAVAWALL);
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = tty_color(color);
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

const SWALLOW_CHARS = [
    ['/', 'o', '\\'],
    ['│', '@', '│'],
    ['\\', 's', '/'],
];

function swallowed_glyph_at(x, y) {
    if (!game._swallowed_map_active || !game.u?.ustuck) return null;
    const ux = game.u.ux;
    const uy = game.u.uy;
    const dx = x - ux;
    const dy = y - uy;
    if (dx < -1 || dx > 1 || dy < -1 || dy > 1) return null;
    const ch = SWALLOW_CHARS[dy + 1][dx + 1];
    return {
        ch,
        color: ch === '@' ? CLR_WHITE : (game.u.ustuck.data?.color ?? CLR_GREEN),
    };
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    // Contestants: add monster, object, and trap display here.
    let tg = terrain_glyph(loc, x, y);

    const trap = game.level?.traps?.find(t => t.tx === x && t.ty === y);
    const obj = game.level?.objects?.find(o => o.ox === x && o.oy === y);
    const mon = game.level?.monsters?.find(m => m.mx === x && m.my === y);
    const visible = cansee(x, y);
    const covered = terrain_covers_objects(loc);

    let draw_ch = tg.ch;
    let draw_color = tg.color;
    let draw_dec = tg.dec;

    if (trap?.tseen && !covered) {
        const tr = trap_glyph(trap);
        draw_ch = tr.ch; draw_color = tr.color; draw_dec = tr.dec;
    }
    if (mon) {
        const mg = monster_glyph(mon);
        draw_ch = mg.ch; draw_color = mg.color; draw_dec = mg.dec;
    } else if (obj && !covered) {
        const og = object_glyph_for_display(obj, x, y, visible);
        draw_ch = og.ch; draw_color = og.color; draw_dec = false;
    }

    // Only update display/memory if cell is IN_SIGHT (lit and visible)
    if (visible) {
        show_glyph_cell(x, y, draw_ch, draw_color, draw_dec);
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: draw_ch, color: draw_color, decgfx: draw_dec };
        }
    } else if (mon) {
        const wg = warning_glyph(mon);
        if (wg) show_glyph_cell(x, y, wg.ch, wg.color, false);
    } else if (loc.remembered_glyph) {
        // Out of sight but remembered — show remembered glyph
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
    } else {
        show_glyph_cell(x, y, ' ', NO_COLOR, false);
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
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            if (cansee(x, y)) newsym(x, y);
    show_premapped_mimics();
    if (game.u?.ux > 0) show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false);
}

// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y) {
    if (!game.level) return '';
    if (game._swallowed_map_active) {
        const ux = game.u?.ux ?? 0;
        const uy = game.u?.uy ?? 0;
        if (y < uy - 1 || y > uy + 1) return '';
        const firstCol = Math.max(1, ux - 1);
        const lastCol = Math.min(COLNO - 1, ux + 1);
        let output = '';
        const gap = firstCol - 1;
        if (gap > 4) output += `\x1b[${gap}C`;
        else if (gap > 0) output += ' '.repeat(gap);
        let activeColor = ANSI_DEFAULT;
        for (let x = firstCol; x <= lastCol; x++) {
            const sg = swallowed_glyph_at(x, y) || { ch: ' ', color: NO_COLOR };
            const wantAnsi = ANSI_COLOR[sg.color] ?? ANSI_DEFAULT;
            if (wantAnsi !== activeColor) {
                output += `\x1b[${wantAnsi}m`;
                activeColor = wantAnsi;
            }
            output += sg.ch;
        }
        if (activeColor !== ANSI_DEFAULT) output += `\x1b[${ANSI_DEFAULT}m`;
        return output;
    }
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
function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    const name = game.plname || 'Hero';
    const role = roleRankForLevel(game.urole, u.ulevel || 1, !!game.flags?.female)
        || (game.flags?.female
            ? (game.urole?.rank?.f || game.urole?.name?.f || game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer')
            : (game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer'));
    const title = `${name} the ${role}`;
    const attrs = u.acurr?.a || [];
    const stats = `St:${attrs[0] || '?'} Dx:${attrs[3] || '?'} Co:${attrs[4] || '?'} In:${attrs[1] || '?'} Wi:${attrs[2] || '?'} Ch:${attrs[5] || '?'}`;
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
    const xp = game.flags?.showexp
        ? `Xp:${u.ulevel || 1}/${u.uexp || 0}`
        : `Xp:${u.ulevel || 1}`;
    const turn = game.flags?.time ? ` T:${game.moves || 1}` : '';
    return `Dlvl:${depth(u.uz)} $:${game._goldCount || 0} HP:${u.uhp || 0}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} ${xp}${turn}`;
}

// ── Serialize terminal grid for screen comparison ──
export function serialize_terminal_grid(display) {
    const term = display?.terminal || display;
    if (term?.serialize) return term.serialize();
    return '';
}

function applySgr(params, state) {
    const values = params.length ? params : [0];
    for (const value of values) {
        if (value === 0) {
            state.color = NO_COLOR;
            state.attr = 0;
        } else if (value === 1) {
            state.attr |= ATR_BOLD;
        } else if (value === 22) {
            state.attr &= ~ATR_BOLD;
        } else if (value === 4) {
            state.attr |= ATR_UNDERLINE;
        } else if (value === 24) {
            state.attr &= ~ATR_UNDERLINE;
        } else if (value === 7) {
            state.attr |= ATR_INVERSE;
        } else if (value === 27) {
            state.attr &= ~ATR_INVERSE;
        } else if (value === 39) {
            state.color = NO_COLOR;
        } else if (COLOR_BY_ANSI.has(value)) {
            state.color = COLOR_BY_ANSI.get(value);
        }
    }
}

function renderOverrideScreen(display, screen) {
    if (display.clearScreen) display.clearScreen();
    const state = { row: 0, col: 0, color: NO_COLOR, attr: 0, dec: false };
    const text = String(screen || '');

    for (let i = 0; i < text.length && state.row < 24; i++) {
        const ch = text[i];
        if (ch === '\n') {
            state.row++;
            state.col = 0;
            continue;
        }
        if (ch === '\x0e') {
            state.dec = true;
            continue;
        }
        if (ch === '\x0f') {
            state.dec = false;
            continue;
        }
        if (ch === '\x1b' && text[i + 1] === '[') {
            let j = i + 2;
            while (j < text.length) {
                const code = text.charCodeAt(j);
                if (code >= 0x40 && code <= 0x7e) break;
                j++;
            }
            const final = text[j];
            const body = text.slice(i + 2, j);
            if (final === 'C') {
                state.col += Number.parseInt(body || '1', 10) || 1;
            } else if (final === 'm') {
                applySgr(body.split(';').filter(Boolean).map((v) => Number.parseInt(v, 10)), state);
            }
            i = j;
            continue;
        }

        if (state.col < 80) {
            display.setCell(
                state.col,
                state.row,
                state.dec ? (DEC_TO_UNICODE[ch] || ch) : ch,
                state.color,
                state.attr,
            );
        }
        state.col++;
    }

    if (game._override_cursor && display.setCursor) {
        display.setCursor(game._override_cursor[0], game._override_cursor[1]);
    }
}

// ── Build screen output ──
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display) return;

    if (game._override_screen) {
        renderOverrideScreen(display, game._override_screen);
        return;
    }

    let output = '';
    // Row 0: message
    output += (game._pending_message || '') + (game._more ? '--More--' : '') + '\n';

    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status
    output += _statusLine1() + '\n';
    output += _statusLine2();

    game._screen_output = output;

    // Also write to grid for serialize_terminal_grid
    if (display.grid) {
        display.clearScreen();
        // Message line
        const msg = (game._pending_message || '') + (game._more ? '--More--' : '');
        for (let c = 0; c < Math.min(msg.length, display.cols); c++)
            display.setCell(c, 0, msg[c], NO_COLOR, 0);
        // Map — write characters to grid (DEC → Unicode for browser display)
        if (!game._swallowed_map_active) {
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 1; x < COLNO; x++) {
                    const loc = game.level?.at(x, y);
                    if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                    const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                    display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
                }
            }
        } else {
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 1; x < COLNO; x++) {
                    const sg = swallowed_glyph_at(x, y);
                    if (!sg) continue;
                    display.setCell(x - 1, y + 1, sg.ch, sg.color, 0);
                }
            }
        }
        // Status lines
        const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
            m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = _statusLine2();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        // Cursor at hero
        if (game._prompt_cursor) display.setCursor(game._prompt_cursor[0], game._prompt_cursor[1]);
        else if (msg && game._more) display.setCursor(Math.min(msg.length, display.cols - 1), 0);
        else if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}

// ── flush_screen ──
export async function flush_screen(mode) {
    _buildScreenOutput();
}

// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    game._pending_message = '';
}

// ── bot ──
export async function bot() {
    // Status line updates happen in _buildScreenOutput
}

// ── pline ──
export async function pline(msg) {
    game._pending_message = msg;
}

export function queue_more_prompt(count = 1) {
    game._more_dismissals_remaining = (game._more_dismissals_remaining || 0) + Math.max(1, count);
    game._more = true;
}

export function clear_pending_message() {
    game._pending_message = '';
    game._more = false;
    game._more_dismissals_remaining = 0;
    game._hero_melee_message_pending = false;
    game._prompt_cursor = null;
}
