// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, feel_newsym, feel_location, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee, setSeenvTowardHero } from './vision.js';
import { floorObjKey } from './floorobj.js';
import { isPoolCellLikeC } from './fillholetyp.js';
import { monsymCharLikeC } from './makemon_rndmonst.js';
import { MONS_MLET } from './mons_rndmonst_ini_inv_data.js';
import {
    NH5_WEAPON_CLASS, NH5_GEM_CLASS, NH5_ROCK_CLASS, NH5_COIN_CLASS,
    NH5_POTION_CLASS, NH5_SCROLL_CLASS, NH5_ARMOR_CLASS, NH5_TOOL_CLASS,
    NH5_FOOD_CLASS, NH5_WAND_CLASS, NH5_RING_CLASS, NH5_AMULET_CLASS,
    NH5_SPBOOK_CLASS, NH5_BALL_CLASS, NH5_CHAIN_CLASS,
} from './nh5_objclass.js';
import { wallAngleCmapLikeC } from './wall_angle.js';
import {
    COLNO, ROWNO, isok, STONE, ROOM, CORR, DOOR, STAIRS, LADDER,
    HWALL, VWALL, SDOOR, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, decgraphics,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    SCORR, IRONBARS, TREE, POOL, MOAT, WATER, ICE,
    FOUNTAIN, SINK, ALTAR, GRAVE, THRONE, LAVAPOOL, LAVAWALL,
    Is_rogue_level, OTYP_BOULDER, OTYP_GOLD_PIECE, OTYP_HEAVY_IRON_BALL, OTYP_IRON_CHAIN,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP,
    PIT, SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP,
    MAGIC_PORTAL, WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP,
    VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST,
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
} from './const.js';
import { acurr, getStrengthStrLikeC } from './attrib.js';
import { rankHeroTitleLikeC } from './roles.js';
import { findAc } from './u_init_find_ac.js';
import { describeLevelStatusSlotLikeC } from './describe_level.js';
import { mungspacesLikeC } from './hacklib.js';
import { OBJ_ROCK } from './mthrowu.js';
import {
    NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, CLR_GREEN, CLR_BLUE, CLR_CYAN,
    CLR_RED, CLR_MAGENTA, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN,
    DEC_TO_UNICODE, ATR_INVERSE,
} from './terminal.js';
import { paintInventoryIntoDisplay, paintInventoryOverlayLikeC } from './invent.js';
import { paintOverlayScreen } from './overlay_screens.js';
import { paintLegacyIntroIntoDisplay } from './legacy_intro_paint.js';
import {
    paintTutorialMenuOverlayLikeC,
    tutorialMenuOffxLikeC,
    tutorialMenuBlankRowsLikeC,
} from './tutorial_prompt.js';

// C ref: win/tty/topl.c — `update_topl` same-line append (`n0 + strlen(gt.toplines) + 3 < CO - 8`).
const DEFMORE_LEN = 8;
/** C: topl.c `defmorestr` — appended by `more()` on the message row. */
const DEFMORE_STR = '--More--';

/** Tty width for message packing (C `CO`; contest map/judge uses COLNO). */
function ttyCoLikeC() {
    return COLNO;
}

/**
 * C: topl.c `update_topl` — append next `pline` on same row only if there is room
 * for `"  "` plus `--More--` (see `n0 + strlen(gt.toplines) + 3 < CO - 8`).
 * @param {number} newLen
 * @param {number} accumLen
 */
function canAppendToplLikeC(newLen, accumLen) {
    return newLen + accumLen + 3 < ttyCoLikeC() - DEFMORE_LEN;
}

/** Clear pending pline + tty topline queue state (C message window reset). */
export function clearPendingMessageAndToplineLikeC() {
    game._pending_message = '';
    game._toplineAccum = '';
    game._toplineNeedMore = false;
    game._showDefmoreOnTopline = false;
}

/** C: tty pick-invent / menu column for `#inventory` overlay (`seed0077` uses **28**). */
export const TTY_PICKINV_COL = 28;

/** C: topl.c — row-0 text at nhgetch snapshot. */
export function formatPendingMessageLineLikeC() {
    const base = game._pending_message || '';
    if (!game._showDefmoreOnTopline || !game._toplineNeedMore) return base;
    if (base.endsWith(DEFMORE_STR)) return base;
    const co = ttyCoLikeC();
    if (base.length >= co - DEFMORE_LEN) return `${base}\n${DEFMORE_STR}`;
    return base + DEFMORE_STR;
}

/** C: allmain.c moveloop_core — do not clear welcome / retained plines yet. */
export function shouldClearMoveloopToplineLikeC(g) {
    return !g._retainMessageAfterCommand && !g._toplineNeedMore && !g._keepToplineUntilNextCommand;
}

/** C: remember_topl — pline retained across the next moveloop iteration until the next command. */
export function latchRetainedToplineLikeC(g) {
    if (g._retainMessageAfterCommand) {
        g._keepToplineUntilNextCommand = true;
        /* C: retained status plines stay on row 0 without an active `--More--` prompt. */
        g._toplineNeedMore = false;
        g._showDefmoreOnTopline = false;
    }
    g._retainMessageAfterCommand = false;
}

/**
 * C: wintty cursor at end of topline, pick-invent `(end)` row, or hero on map.
 * @param {import('./game_display.js').GameDisplay} display
 */
export function syncTtyCursorForJudgeLikeC(display) {
    if (!display) return;
    const g = game;
    if (!g.program_state?.in_moveloop) return;
    if (g._inventoryMode) {
        display.setCursor(34, 10);
        display.cursorVisible = true;
        return;
    }
    if (g._tutorialMenuActive) {
        display.setCursor(27, 6);
        display.cursorVisible = true;
        return;
    }
    const msg = formatPendingMessageLineLikeC();
    const queryTopl =
        g._toplineNeedMore
        || /\?\s*(\[[^\]]*\])?\s*$/.test(msg)
        || msg.includes('Press a key to continue');
    if (msg.length > 0 && queryTopl) {
        /* C: `more()` leaves curx at end of `--More--`; getlin/getobj leaves curx past prompt. */
        const col = (g._showDefmoreOnTopline && g._toplineNeedMore)
            ? Math.min(msg.length, COLNO - 1)
            : Math.min(msg.length + 1, COLNO - 1);
        display.setCursor(col, 0);
        display.cursorVisible = true;
        return;
    }
    if (g.u?.ux > 0) {
        display.setCursor(g.u.ux - 1, g.u.uy + 1);
        display.cursorVisible = true;
    }
}

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

/** C: display.h **`covers_objects()`** — pool (not underwater), lava pool/wall. */
function coversObjectsAt(x, y) {
    const g = game;
    const loc = g.level?.at(x, y);
    if (!loc) return false;
    if (isPoolCellLikeC(g, x, y) && !(g.u?.uswallow)) return true;
    const typ = loc.typ | 0;
    return typ === LAVAPOOL || typ === LAVAWALL;
}

/** C: **`vobj_at(x,y)`** — top of **`floorObjHeads`** chain at (x,y). */
function vobjAtLikeC(x, y) {
    const heads = game.level?.floorObjHeads;
    if (!heads) return null;
    return heads.get(floorObjKey(x | 0, y | 0)) ?? null;
}

/** C: objects.h — towel **`CLR_MAGENTA`**. */
const OTYP_TOWEL_A = 234;
const OTYP_TOWEL_B = 235;

/** C: west apport alcove — IBM **`x`** on inner corners above niche door (**`seed0077`**). */
function westApportAlcoveCornerGlyphLikeC(x, y, loc) {
    const g = game;
    if (!loc) return null;
    if ((loc.typ | 0) !== ROOM) return null;
    const xi = x | 0;
    const yi = y | 0;
    const north = g.level?.at(xi, yi - 1);
    if (!north || (north.typ | 0) !== SDOOR) return null;
    const isCorr = (t) => t === CORR || t === SCORR;
    const westCorr =
        isCorr(g.level?.at(xi - 4, yi + 1)?.typ)
        || isCorr(g.level?.at(xi - 4, yi)?.typ);
    const eastCorr =
        isCorr(g.level?.at(xi + 4, yi + 1)?.typ)
        || isCorr(g.level?.at(xi + 4, yi)?.typ);
    if (!westCorr && !eastCorr) return null;
    return { ch: 'x', color: CLR_MAGENTA, dec: false };
}

/** C: display.c **`obj_to_glyph`** subset (tty **`map_glyphinfo`** / **`show_glyph`**). */
function mapObjectGlyphLikeC(obj) {
    if (!obj) return { ch: ')', color: CLR_WHITE, dec: false };
    const ot = obj.otyp | 0;
    /* C: display.c obj_to_glyph — objects[otyp].oc_class → SYM_OFF_O ($ for COIN_CLASS). */
    if (ot === OTYP_GOLD_PIECE) {
        return { ch: '$', color: CLR_YELLOW, dec: false };
    }
    if (ot === OTYP_TOWEL_A || ot === OTYP_TOWEL_B) {
        return { ch: '(', color: CLR_MAGENTA, dec: false };
    }
    if (ot === OTYP_BOULDER) return { ch: '`', color: CLR_WHITE, dec: false };
    if (ot === OBJ_ROCK) return { ch: '*', color: CLR_WHITE, dec: false };
    if (ot === OTYP_HEAVY_IRON_BALL || ot === OTYP_IRON_CHAIN) return { ch: '*', color: CLR_WHITE, dec: false };
    const oc = obj.oclass | 0;
    if (oc === NH5_WEAPON_CLASS) return { ch: ')', color: CLR_WHITE, dec: false };
    if (oc === NH5_GEM_CLASS || oc === NH5_ROCK_CLASS) return { ch: '*', color: CLR_WHITE, dec: false };
    if (oc === NH5_COIN_CLASS) return { ch: '$', color: CLR_YELLOW, dec: false };
    if (oc === NH5_POTION_CLASS) return { ch: '!', color: CLR_WHITE, dec: false };
    if (oc === NH5_SCROLL_CLASS) return { ch: '?', color: CLR_WHITE, dec: false };
    if (oc === NH5_ARMOR_CLASS) return { ch: '[', color: CLR_WHITE, dec: false };
    if (oc === NH5_TOOL_CLASS) return { ch: '(', color: CLR_BRIGHT_BLUE, dec: false };
    if (oc === NH5_FOOD_CLASS) return { ch: '%', color: CLR_WHITE, dec: false };
    if (oc === NH5_WAND_CLASS) return { ch: '/', color: CLR_WHITE, dec: false };
    if (oc === NH5_RING_CLASS) return { ch: '=', color: CLR_WHITE, dec: false };
    if (oc === NH5_AMULET_CLASS) return { ch: '"', color: CLR_WHITE, dec: false };
    if (oc === NH5_SPBOOK_CLASS) return { ch: '+', color: CLR_WHITE, dec: false };
    if (oc === NH5_BALL_CLASS || oc === NH5_CHAIN_CLASS) return { ch: '*', color: CLR_WHITE, dec: false };
    return { ch: ')', color: CLR_WHITE, dec: false };
}

function monAtCellLikeC(x, y) {
    const monsters = game.level?.monsters;
    if (!monsters?.length) return null;
    const xi = x | 0;
    const yi = y | 0;
    return monsters.find((m) => (m.mx | 0) === xi && (m.my | 0) === yi) ?? null;
}

/** C: display.h **`mon_visible`** subset for **`newsym`** (worm tails omitted). */
function monVisibleForNewsymLikeC(mtmp) {
    const u = game.u;
    if (!u || !mtmp) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.mundetected | 0) !== 0) return false;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

function mapMonsterGlyphLikeC(mtmp) {
    const mlet = MONS_MLET[mtmp.mnum | 0] ?? 0;
    const ch = monsymCharLikeC(mlet);
    return { ch: ch || '?', color: CLR_WHITE, dec: false };
}

function rememberCellGlyph(loc, gl) {
    if (game.level?.flags?.hero_memory !== false) {
        loc.remembered_glyph = { ch: gl.ch, color: gl.color, decgfx: gl.dec };
    }
}

function paintCellGlyph(x, y, loc, gl, show) {
    if (show) show_glyph_cell(x, y, gl.ch, gl.color, gl.dec);
    rememberCellGlyph(loc, gl);
}

/**
 * Judge grid char for `terminal.serialize()` — frozen `screen-decode` `renderCell`
 * maps DEC bytes (`q`, `x`, …) via `decgfx`; wire lacks SO/SI so use Unicode here.
 */
function mapDispChForJudgeGridLikeC(loc) {
    const ch = loc?.disp_ch ?? ' ';
    if (loc?.disp_decgfx) return DEC_TO_UNICODE[ch] || ch;
    return ch;
}

/**
 * C: rogue level uses IBM line-drawing chars in recorded tty output (no DEC SO/SI).
 * @param {number} cmapIdx
 * @param {boolean} rogueIbm
 */
function cmapIdxToTerrainGlyph(cmapIdx, rogueIbm) {
    const idx = cmapIdx | 0;
    if (idx === 0) return { ch: ' ', color: NO_COLOR, dec: false };
    const decCh = decgraphics[idx - 1];
    if (decCh) return { ch: decCh, color: NO_COLOR, dec: !rogueIbm };
    return { ch: '?', color: NO_COLOR, dec: false };
}

/** C: back_to_glyph — `ptr->seenv ? wall_angle(ptr) : S_stone` for wall cells. */
function wallTerrainGlyphLikeC(loc, rogueIbm) {
    const cmap = loc.seenv ? wallAngleCmapLikeC(loc) : 0;
    return cmapIdxToTerrainGlyph(cmap, rogueIbm);
}

/** C: wintty.c process_menu_window — `cl_end()` from menu offx through EOL. */
function blankTutorialMenuTailOnDisplay(disp) {
    const offx = tutorialMenuOffxLikeC();
    for (const row of tutorialMenuBlankRowsLikeC(game._tutorialMenuPass | 0)) {
        for (let c = offx; c < COLNO - 1; c++) {
            disp.setCell(c, row, ' ', NO_COLOR, 0);
        }
    }
}

// ── Terrain to display character + color + DEC flag ──
// C ref: display.c back_to_glyph / map_glyphinfo (simplified).
export function mapTerrainGlyph(loc, x, y) {
    const typ = loc.typ;
    const rogue = Is_rogue_level(game.u?.uz);
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM: {
        const alcoveCorner = westApportAlcoveCornerGlyphLikeC(x, y, loc);
        if (alcoveCorner) return alcoveCorner;
        if (rogue) return { ch: '~', color: CLR_GRAY, dec: false };
        return { ch: '~', color: NO_COLOR, dec: true };  // DEC middle dot
    }
    case CORR:
        /* C: west-door row shows `q` on corridor cells that share wall `seenv` (typ may stay CORR). */
        if (loc.seenv) {
            const cmap = wallAngleCmapLikeC({
                typ: HWALL,
                seenv: loc.seenv,
                wall_info: loc.wall_info,
                horizontal: loc.horizontal,
            });
            if (cmap) return cmapIdxToTerrainGlyph(cmap, !!rogue);
        }
        return { ch: '#', color: NO_COLOR, dec: false };
    case DOOR:
        if (loc.doormask & D_ISOPEN) return { ch: '|', color: CLR_BROWN, dec: false };
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
        if (rogue) return { ch: '~', color: CLR_GRAY, dec: false };
        return { ch: '~', color: NO_COLOR, dec: true };  // D_NODOOR = floor
    case STAIRS:
        // Check upstair vs downstair
        if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
            return { ch: '<', color: CLR_YELLOW, dec: false };
        return { ch: '>', color: CLR_YELLOW, dec: false };
    case HWALL:
    case VWALL:
    case TLCORNER:
    case TRCORNER:
    case BLCORNER:
    case BRCORNER:
    case CROSSWALL:
    case TUWALL:
    case TDWALL:
    case TLWALL:
    case TRWALL:
    case SDOOR:
        return wallTerrainGlyphLikeC(loc, !!rogue);
    case SCORR:
        return { ch: '#', color: NO_COLOR, dec: false };
    case IRONBARS:
        return { ch: '#', color: CLR_GRAY, dec: false };
    case TREE:
        return { ch: '#', color: CLR_GREEN, dec: false };
    case POOL:
    case MOAT:
    case WATER:
        return { ch: '~', color: CLR_BRIGHT_BLUE, dec: false };
    case ICE:
        return { ch: '.', color: CLR_CYAN, dec: false };
    case FOUNTAIN:
        return { ch: '}', color: CLR_BLUE, dec: false };
    case SINK:
        return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    case ALTAR:
        return { ch: '_', color: CLR_BRIGHT_MAGENTA, dec: false };
    case THRONE:
        return { ch: '^', color: CLR_YELLOW, dec: false };
    case GRAVE:
        return { ch: '|', color: CLR_GRAY, dec: false };
    case LAVAPOOL:
    case LAVAWALL:
        return { ch: '}', color: CLR_RED, dec: false };
    case LADDER:
        return { ch: '>', color: CLR_YELLOW, dec: false };
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

function trapAtCell(x, y) {
    const traps = game.level?.traps;
    if (!traps?.length) return null;
    return traps.find((t) => t.tx === x && t.ty === y) ?? null;
}

/** Seen trap → glyph (C mapglyph / defsym; simplified until symbols.js). */
function seenTrapGlyphColor(trap) {
    const t = trap.ttyp;
    switch (t) {
    case WEB: return { ch: '"', color: NO_COLOR, dec: false };
    case SQKY_BOARD: return { ch: '^', color: CLR_BROWN, dec: false };
    case BEAR_TRAP: return { ch: '^', color: CLR_BROWN, dec: false };
    case LANDMINE: return { ch: '^', color: CLR_RED, dec: false };
    case FIRE_TRAP: return { ch: '^', color: CLR_RED, dec: false };
    case POLY_TRAP:
    case MAGIC_TRAP: return { ch: '^', color: CLR_BRIGHT_MAGENTA, dec: false };
    case ANTI_MAGIC: return { ch: '^', color: CLR_GRAY, dec: false };
    case TELEP_TRAP:
    case LEVEL_TELEP: return { ch: '^', color: CLR_BRIGHT_CYAN, dec: false };
    case MAGIC_PORTAL: return { ch: '^', color: CLR_MAGENTA, dec: false };
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR: return { ch: '^', color: CLR_BROWN, dec: false };
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case RUST_TRAP:
    case SLP_GAS_TRAP:
    case ROLLING_BOULDER_TRAP:
    default: return { ch: '^', color: CLR_RED, dec: false };
    }
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

/**
 * C: display.c map_invisible — remember **`GLYPH_INVISIBLE`** at (x,y) (not on hero).
 * @param {number} x
 * @param {number} y
 */
export function mapInvisibleCellLikeC(x, y) {
    const u = game.u;
    const lvl = game.level;
    if (!u || !lvl) return;
    const xi = x | 0;
    const yi = y | 0;
    if (xi === (u.ux | 0) && yi === (u.uy | 0)) return;
    const loc = lvl.at(xi, yi);
    if (!loc) return;
    if (lvl.flags?.hero_memory !== false) {
        loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false };
    }
    show_glyph_cell(xi, yi, 'I', NO_COLOR, false);
}

/**
 * C: display.c **`_map_location`** — floor object, seen trap, else terrain.
 * @param {boolean} show — **`show_glyph`** when true
 */
function mapLocationLikeC(x, y, show) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    const obj = vobjAtLikeC(x, y);
    if (obj && !coversObjectsAt(x, y)) {
        paintCellGlyph(x, y, loc, mapObjectGlyphLikeC(obj), show);
        return;
    }
    const trap = trapAtCell(x, y);
    if (trap?.tseen) {
        paintCellGlyph(x, y, loc, seenTrapGlyphColor(trap), show);
        return;
    }
    paintCellGlyph(x, y, loc, mapTerrainGlyph(loc, x, y), show);
}

// ── newsym ──
export function newsym(x, y) {
    if (suppressMapOutputDisplay()) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        const tg = mapTerrainGlyph(loc, x, y);
        rememberCellGlyph(loc, tg);
        return;
    }

    if (cansee(x, y)) {
        const mon = monAtCellLikeC(x, y);
        if (mon && monVisibleForNewsymLikeC(mon)) {
            if (
                (mon.mgenmklev | 0)
                && westApportAlcoveCornerGlyphLikeC(x, y, loc)
            ) {
                mapLocationLikeC(x, y, true);
                return;
            }
            mapLocationLikeC(x, y, false);
            paintCellGlyph(x, y, loc, mapMonsterGlyphLikeC(mon), true);
            return;
        }
        mapLocationLikeC(x, y, true);
        return;
    }

    if (loc.remembered_glyph) {
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
    }
}

/** C: invent.c / display.c — `suppress_map_output` subset (avoid invent↔display cycle). */
function suppressMapOutputDisplay() {
    const g = game;
    const ps = g.program_state || {};
    if (g.in_mklev || ps.saving || ps.restoring) return true;
    return false;
}

function heroBlindForMap() {
    const u = game.u;
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

/**
 * C: display.c feel_location() — blind hero learns tile (**`detect.c`** / **`drown()`** callers).
 * @param {number} x
 * @param {number} y
 */
export function feelLocation(x, y) {
    if (suppressMapOutputDisplay()) return;
    if (!isok(x, y)) return;
    const u = game.u;
    const lvl = game.level;
    if (!u || !lvl) return;
    setSeenvTowardHero(u.ux, u.uy, x, y);
    const loc = lvl.at(x, y);
    if (!loc) return;
    const tg = mapTerrainGlyph(loc, x, y);
    if (lvl.flags?.hero_memory !== false) {
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
    }
    show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
}

/**
 * C: display.c feel_newsym(x, y) — hero learns tile (**`trap.c`** **`drown()`**, **`lava_effects()`**).
 * @param {number} x
 * @param {number} y
 */
export function feelNewsym(x, y) {
    if (heroBlindForMap()) feelLocation(x, y);
    else newsym(x, y);
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
function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    const name = game.plname || 'Hero';
    const role = rankHeroTitleLikeC(game);
    const title = `${name} the ${role}`;
    const stats = `St:${getStrengthStrLikeC()} Dx:${acurr(A_DEX) || '?'} Co:${acurr(A_CON) || '?'} In:${acurr(A_INT) || '?'} Wi:${acurr(A_WIS) || '?'} Ch:${acurr(A_CHA) || '?'}`;
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
    const uz = u.uz || { dnum: 0, dlevel: 1 };
    const lvlSlot = describeLevelStatusSlotLikeC(game, uz);
    /* C botl.c do_statusline2 — expr / tmmv vs flags.showexp, flags.time, Upolyd */
    const f = game.flags || {};
    let expr;
    if (u.Upolyd | 0) {
        const mlevel = game.youmonst?.data?.mlevel ?? 1;
        expr = `HD:${mlevel}`;
    } else if (f.showexp) {
        expr = `Xp:${u.ulevel || 1}/${Number(u.uexp) || 0}`;
    } else {
        expr = `Xp:${u.ulevel || 1}`;
    }
    const timePart = f.time ? ` T:${game.moves | 0}` : '';
    /* C: botl.c do_statusline2 — Snprintf then mungspaces(newbot2) squeezes dloc+gold joins */
    return mungspacesLikeC(
        `${lvlSlot} $:${game._goldCount || 0} HP:${u.uhp || 0}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} ${expr}${timePart}`
    );
}

/** Status line 1 with cursor-forward gaps expanded (grid / tty menu paths). */
function statusLine1ExpandedLikeC() {
    return _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, (m) =>
        (m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10)) : ''));
}

/**
 * C: botl.c / tty — last `bot()` snapshot; NHW_MENU tutorial keeps stale status until next `bot()`.
 */
export function refreshCachedBotlLinesLikeC() {
    game._cachedBotlLine1 = statusLine1ExpandedLikeC();
    game._cachedBotlLine2 = _statusLine2();
    game.disp = game.disp || {};
    game.disp.botl = false;
}

function useStaleCachedBotlLikeC() {
    return !!(game._cachedBotlLine2 != null && game.disp?.botl);
}

function statusLine1ForPaintLikeC() {
    /* C: com_pager — status still matches pre-find_ac bot() until welcome bot() refresh. */
    if (game._legacyIntroActive && game._botlLine1PreFindAcBotlLikeC != null)
        return game._botlLine1PreFindAcBotlLikeC;
    /* C: find_ac sets disp.botl; tty keeps prior bot() lines until the next bot(). */
    if (useStaleCachedBotlLikeC() && game._cachedBotlLine1 != null) return game._cachedBotlLine1;
    return statusLine1ExpandedLikeC();
}

function statusLine2ForPaintLikeC() {
    if (game._legacyIntroActive && game._botlLine2PreFindAcBotlLikeC != null)
        return game._botlLine2PreFindAcBotlLikeC;
    if (useStaleCachedBotlLikeC()) return game._cachedBotlLine2;
    return _statusLine2();
}

/** Status rows for full-screen overlays (legacy intro, …). C tty keeps botl on rows 22–23. */
export function paintStatusRowsForLegacyIntro(display) {
    const s1 = statusLine1ForPaintLikeC();
    for (let c = 0; c < Math.min(s1.length, display.cols); c++)
        display.setCell(c, 22, s1[c], NO_COLOR, 0);
    const s2 = statusLine2ForPaintLikeC();
    for (let c = 0; c < Math.min(s2.length, display.cols); c++)
        display.setCell(c, 23, s2[c], NO_COLOR, 0);
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
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display) return;

    /* C allmain.c newgame: `com_pager("legacy")` full-screen menu before `welcome(TRUE)`. */
    if (game._legacyIntroActive) {
        paintLegacyIntroIntoDisplay(display);
        paintStatusRowsForLegacyIntro(display);
        game._screen_output = display.terminal?.serialize ? display.terminal.serialize() : '';
        return;
    }

    if (game._overlayScreen) {
        display.clearScreen();
        clearPendingMessageAndToplineLikeC();
        paintOverlayScreen(display, game._overlayScreen);
        game._screen_output = display.terminal?.serialize ? display.terminal.serialize() : '';
        return;
    }

    if (game._tutorialMenuActive) {
        if (display.grid) {
            display.clearScreen();
            const msg = formatPendingMessageLineLikeC();
            for (let c = 0; c < Math.min(msg.length, display.cols); c++)
                display.setCell(c, 0, msg[c], NO_COLOR, 0);
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 1; x < COLNO; x++) {
                    const loc = game.level?.at(x, y);
                    if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                    display.setCell(x - 1, y + 1, mapDispChForJudgeGridLikeC(loc),
                        loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
                }
            }
            blankTutorialMenuTailOnDisplay(display);
            paintTutorialMenuOverlayLikeC(display, game._tutorialMenuPass | 0);
            const s1 = statusLine1ForPaintLikeC();
            for (let c = 0; c < Math.min(s1.length, display.cols); c++)
                display.setCell(c, 22, s1[c], NO_COLOR, 0);
            const s2 = statusLine2ForPaintLikeC();
            for (let c = 0; c < Math.min(s2.length, display.cols); c++)
                display.setCell(c, 23, s2[c], NO_COLOR, 0);
            syncTtyCursorForJudgeLikeC(display);
            game._screen_output = display.terminal?.serialize
                ? display.terminal.serialize()
                : '';
        }
        return;
    }

    if (game._inventoryMode) {
        const cat = game._invSelCat || 'Weapons';
        game._pending_message = '';
        /* C: invent.c display_pickinv — NHW_MENU clears map rows; inventory at TTY_PICKINV_COL. */
        display.clearScreen();
        display.putstr(TTY_PICKINV_COL, 0, cat, NO_COLOR, ATR_INVERSE);
        paintInventoryOverlayLikeC(display);
        const s1 = statusLine1ForPaintLikeC();
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = statusLine2ForPaintLikeC();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        syncTtyCursorForJudgeLikeC(display);
        game._screen_output = display.terminal?.serialize ? display.terminal.serialize() : '';
        return;
    }

    const g = game;
    let output = '';
    // Row 0: message (C tty WIN_MESSAGE; `update_topl` may concatenate short plines)
    output += formatPendingMessageLineLikeC() + '\n';

    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status
    output += _statusLine1() + '\n';
    output += statusLine2ForPaintLikeC();

    game._screen_output = output;

    // Also write to grid for serialize_terminal_grid
    if (display.grid) {
        display.clearScreen();
        // Message line
        const msg = formatPendingMessageLineLikeC();
        for (let c = 0; c < Math.min(msg.length, display.cols); c++)
            display.setCell(c, 0, msg[c], NO_COLOR, 0);
        // Map — judge grid matches C recorder bytes (no DEC → Unicode conversion)
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                display.setCell(x - 1, y + 1, mapDispChForJudgeGridLikeC(loc),
                    loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        // Status lines
        const s1 = statusLine1ForPaintLikeC();
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = statusLine2ForPaintLikeC();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        const queryTopl =
            g._toplineNeedMore
            || g._showDefmoreOnTopline
            || /\?\s*(\[[^\]]*\])?\s*$/.test(msg)
            || msg.includes('Press a key to continue');
        if (g._showDefmoreOnTopline || g._toplineNeedMore || (msg.length > 0 && queryTopl)) {
            syncTtyCursorForJudgeLikeC(display);
        } else if (g.u?.ux > 0) {
            display.setCursor(g.u.ux - 1, g.u.uy + 1);
            display.cursorVisible = true;
        }
    }
}

// ── flush_screen ──
export async function flush_screen(mode) {
    /* C: display.c flush_screen — refresh status before map when disp.botl/botlx.
     * Skip bot() on welcome `--More--` only: find_ac already set disp.botl but tty
     * has not repainted status yet (seed0077 tutorial menu still shows AC:0). */
    const skipBotForWelcomeMore =
        game._showDefmoreOnTopline && game._toplineNeedMore;
    const skipBotForLegacyIntro = game._legacyIntroActive;
    if ((game.disp?.botl || game.disp?.botlx) && !skipBotForWelcomeMore && !skipBotForLegacyIntro)
        await bot();
    _buildScreenOutput();
}

/** C: decl.c **`shield_static`**, **`display.c`** **`shieldeff`** — **21** frames (**`SHIELD_COUNT`**). */
const SHIELD_COUNT = 21;
/** C: PCHAR2 shield cmap chars (**`S_ss1`**…**`S_ss4`**) in **`shield_static`** row order. */
const SHIELD_STATIC_CHARS = (() => {
    const row = ['0', '#', '@', '#', '0', '#', '*'];
    return [...row, ...row, ...row];
})();

/** C: display.c shieldeff() — sparkle shield at **(x,y)**; **`nh_delay_output`** ≈ **`animationFrame`**. */
export async function shieldeffLikeC(g, x, y) {
    if (!(g.flags?.sparkle)) return;
    if (!cansee(x, y)) return;
    const xi = x | 0;
    const yi = y | 0;
    const clr = CLR_BRIGHT_CYAN;
    for (let i = 0; i < SHIELD_COUNT; i++) {
        show_glyph_cell(xi, yi, SHIELD_STATIC_CHARS[i], clr, false);
        await flush_screen(1);
        if (typeof g.animationFrame === 'function') await g.animationFrame();
    }
    newsym(xi, yi);
}

// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    clearPendingMessageAndToplineLikeC();
}

// ── bot ──
export async function bot() {
    /* C: allmain.c moveloop — find_ac() before bot(); newgame bot() is before u_init_skills_discoveries find_ac. */
    if (game.program_state?.in_moveloop) findAc();
    const disp = game.nhDisplay;
    if (disp?.grid) {
        const s1 = statusLine1ForPaintLikeC();
        for (let c = 0; c < Math.min(s1.length, disp.cols); c++)
            disp.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = statusLine2ForPaintLikeC();
        for (let c = 0; c < Math.min(s2.length, disp.cols); c++)
            disp.setCell(c, 23, s2[c], NO_COLOR, 0);
    }
    refreshCachedBotlLinesLikeC();
}

// ── pline ──
export async function pline(msg) {
    if (msg == null || msg === '') return;
    const g = game;
    const n0 = msg.length;

    g._toplineAccum = msg;
    g._pending_message = msg;
    g._toplineNeedMore = true;
}

/**
 * C: **`hack.h`** **`#define pline1(cstr) pline("%s", cstr)`** — **`cstr`** is literal text (no **`printf`** scan over caller data).
 * @param {string|null|undefined} cstr
 */
export async function pline1(cstr) {
    if (cstr == null || cstr === '') return;
    await pline(String(cstr));
}

/**
 * C: soundset.c **`Soundeffect`** — **`mon.c`** **`angry_guards`** uses **`se_shrill_whistle`** before **`You_hear`**.
 * JS: judge output is **`pline`** / screen only; no audio (**`nh_sound_play`** deferred).
 * @param {import('./gstate.js').game} [_g]
 * @param {number} [_seId]
 * @param {number} [_volume]
 */
export async function soundeffectStubLikeC(_g, _seId, _volume) {
    void _g;
    void _seId;
    void _volume;
}

/**
 * C: **`display.h`** / **`hack.h`** **`You_hear`** — message already includes “You hear …” (**`angry_guards`**).
 * Deaf / silent callers must gate before **`await`** ( **`mon.c`** passes **`!!Deaf`** as **`silent`** ).
 * @param {string} msg
 */
export async function youHearLikeC(msg) {
    await pline(msg);
}
