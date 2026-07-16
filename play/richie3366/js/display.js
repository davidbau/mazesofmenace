// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee, couldsee, vision_recalc } from './vision.js';
import { objects_at } from './mkobj.js';
import { mcolors, mons, infravision, infravisible } from './monsters.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    SDOOR, SCORR, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE,
    FOUNTAIN, SINK, THRONE, ALTAR, GRAVE,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    LA_DOWN,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
    WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM, WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    HI_GOLD, HI_METAL, HI_ZAP,
    WEB, VIBRATING_SQUARE, TRAPNUM,
    In_mines,
    DISP_BEAM, DISP_ALL, DISP_TETHER, DISP_FLASH, DISP_ALWAYS,
    DISP_CHANGE, DISP_END, DISP_FREEMEM, BACKTRACK,
    M_AP_OBJECT, M_AP_TYPE,
    MCORPSENM,
    isok,
    SVALL,
    TER_TRP, TER_OBJ, TER_MON, TER_FULL,
    OBJ_FLOOR,
    UNENCUMBERED,
} from './const.js';
import {
    ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
    VENOM_CLASS, objectNames,
} from './objects.js';
import {
    NO_COLOR, CLR_GRAY, CLR_BLACK, CLR_BROWN, CLR_WHITE, CLR_YELLOW,
    CLR_BLUE, CLR_BRIGHT_BLUE, CLR_RED, CLR_ORANGE, CLR_CYAN,
    CLR_MAGENTA, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_GREEN,
    DEC_TO_UNICODE, ATR_INVERSE,
} from './terminal.js';
import { update_lastseentyp, In_tutorial } from './dungeon.js';
import { stairway_at, known_branch_stairs } from './mklev.js';
import {
    A_INT, A_WIS, A_DEX, A_CON, A_CHA, acurr, get_strength_str,
} from './attrib.js';
import { depth, dist2 } from './hacklib.js';
import { monsterNames } from './generated/monsters_data.js';
import { observe_object, near_capacity } from './invent.js';

const CORPSE_OTYP = objectNames.indexOf('CORPSE');
const STATUE_OTYP = objectNames.indexOf('STATUE');
const BOULDER_OTYP = objectNames.indexOf('BOULDER');
// C display_monster M_AP_OBJECT default corpsenm when !has_mcorpsenm
const PM_TENGU = monsterNames.indexOf('PM_TENGU');
// C ref: objects.h MARKER — obj_is_generic gem/spell ranges
const FIRST_REAL_GEM_OTYP = objectNames.indexOf('DILITHIUM_CRYSTAL');
const LAST_GLASS_GEM_OTYP = objectNames.indexOf('WORTHLESS_VIOLET_GLASS');
const FIRST_SPELL_OTYP = objectNames.indexOf('SPE_DIG');
const LAST_SPELL_OTYP = objectNames.indexOf('SPE_BLANK_PAPER');

/**
 * C ref: display.h obj_is_piletop — floor top with nexthere (boulder
 * exception: boulder hides pile unless next is also boulder).
 */
function obj_is_piletop(obj) {
    if (!obj || obj.where !== OBJ_FLOOR) return false;
    const next = objects_at(obj.ox, obj.oy)?.nexthere;
    if (!next) return false;
    if (obj.otyp === BOULDER_OTYP && next.otyp !== BOULDER_OTYP) return false;
    return true;
}

/**
 * C ref: flag.h use_inverse ≡ wc_inverse; optlist.h NHOPTB default On.
 */
function use_inverse_opt() {
    const v = game.iflags?.wc_inverse ?? game.iflags?.use_inverse;
    return v === undefined ? true : !!v;
}

/**
 * C ref: wintty.c tty_print_glyph — MG_OBJPILE && hilite_pile && use_inverse
 * → ATR_INVERSE. Named omissions: MG_DETECT / BW_* / MG_FEMALE; hilite_pet
 * petattr (separate branch).
 */
function obj_map_attr(obj, rememberedPile = false) {
    const pile = rememberedPile || obj_is_piletop(obj);
    if (pile && game.iflags?.hilite_pile && use_inverse_opt()) {
        return ATR_INVERSE;
    }
    return 0;
}

// C ref: defsym.h OBJCLASS_DRAWING — default object-class map symbols
const DEF_OC_SYM = {
    [ILLOBJ_CLASS]: ']',
    [WEAPON_CLASS]: ')',
    [ARMOR_CLASS]: '[',
    [RING_CLASS]: '=',
    [AMULET_CLASS]: '"',
    [TOOL_CLASS]: '(',
    [FOOD_CLASS]: '%',
    [POTION_CLASS]: '!',
    [SCROLL_CLASS]: '?',
    [SPBOOK_CLASS]: '+',
    [WAND_CLASS]: '/',
    [COIN_CLASS]: '$',
    [GEM_CLASS]: '*',
    [ROCK_CLASS]: '`',
    [BALL_CLASS]: '0',
    [CHAIN_CLASS]: '_',
    [VENOM_CLASS]: '.',
};

// C ref: defsym.h MONSYM — letter from mlet; color from mons[].mcolor (not mlet).
// pet_color ≡ mon_color (display.c); hilite_pet only sets tty attr, not color.
const MLET_CH = {
    S_ANT: 'a',
    S_BLOB: 'b',
    S_COCKATRICE: 'c',
    S_DOG: 'd',
    S_EYE: 'e',
    S_FELINE: 'f',
    S_GREMLIN: 'g',
    S_HUMANOID: 'h',
    S_IMP: 'i',
    S_JELLY: 'j',
    S_KOBOLD: 'k',
    S_LEPRECHAUN: 'l',
    S_MIMIC: 'm',
    S_NYMPH: 'n',
    S_ORC: 'o',
    S_PIERCER: 'p',
    S_QUADRUPED: 'q',
    S_RODENT: 'r',
    S_SPIDER: 's',
    S_TRAPPER: 't',
    S_UNICORN: 'u',
    S_VORTEX: 'v',
    S_WORM: 'w',
    S_XAN: 'x',
    S_LIGHT: 'y',
    S_ZRUTY: 'z',
    S_ANGEL: 'A',
    S_BAT: 'B',
    S_CENTAUR: 'C',
    S_DRAGON: 'D',
    S_ELEMENTAL: 'E',
    S_FUNGUS: 'F',
    S_GNOME: 'G',
    S_GIANT: 'H',
    S_invisible: 'I',
    S_JABBERWOCK: 'J',
    S_KOP: 'K',
    S_LICH: 'L',
    S_MUMMY: 'M',
    S_NAGA: 'N',
    S_OGRE: 'O',
    S_PUDDING: 'P',
    S_QUANTMECH: 'Q',
    S_RUSTMONST: 'R',
    S_SNAKE: 'S',
    S_TROLL: 'T',
    S_UMBER: 'U',
    S_VAMPIRE: 'V',
    S_WRAITH: 'W',
    S_XORN: 'X',
    S_YETI: 'Y',
    S_ZOMBIE: 'Z',
    S_HUMAN: '@',
    S_GHOST: ' ',
    S_GOLEM: "'",
    S_DEMON: '&',
    S_EEL: ';',
    S_LIZARD: ':',
    S_WORM_TAIL: '~',
    S_MIMIC_DEF: ']',
};

function mon_at_display(x, y) {
    const steed = game.u?.usteed;
    for (const m of game.fmon || []) {
        // C: remove_monster while mounted — steed not on the map grid
        if (steed && m === steed) continue;
        if (m && m.mx === x && m.my === y && (m.mhp == null || m.mhp > 0))
            return m;
    }
    return null;
}

// C ref: display.h _mon_visible — invis/undetected only (caller handles sight)
export function mon_visible(mon) {
    if (!mon) return false;
    if (mon.minvis && !game.u?.See_invisible) return false;
    if (mon.mundetected) return false;
    return true;
}

/**
 * C ref: display.h _canseemon — location sight/infrared + mon_visible.
 * Named omission: worm_known for long worms.
 */
export function canseemon(mon) {
    if (!mon?.mx) return false;
    if (!(cansee(mon.mx, mon.my) || see_with_infrared(mon))) return false;
    return mon_visible(mon);
}

/**
 * C ref: display.h _sensemon — Detect_monsters / telepathy / warn.
 * Named omissions: tp_sensemon Blind_telepat/Unblind_telepat range,
 * MATCH_WARN_OF_MON, Underwater pool adjacency gate.
 */
export function sensemon(mon) {
    if (!mon) return false;
    const u = game.u || {};
    if (u.uswallow && mon !== u.ustuck) return false;
    if (u.Detect_monsters) return true;
    return false;
}

/** C ref: display.h canspotmon — canseemon || sensemon. */
export function canspotmon(mon) {
    return canseemon(mon) || sensemon(mon);
}

/**
 * C ref: display.c map_invisible — remember/show 'I' for unseen monster.
 * Persists in hero_memory until unmap_invisible / visible mon display.
 */
export function map_invisible(x, y) {
    const u = game.u || {};
    if (x === u.ux && y === u.uy) return; // never I under hero
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const g = { ch: 'I', color: NO_COLOR, decgfx: false, invisible: true };
    if (game.level?.flags?.hero_memory) {
        loc.remembered_glyph = g;
    }
    show_glyph_cell(x, y, 'I', NO_COLOR, false);
}

/** C ref: display.h glyph_is_invisible — remembered unseen-monster marker. */
function glyph_is_invisible(loc) {
    return !!loc?.remembered_glyph?.invisible;
}

// C ref: youprop.h Infravision — race intrinsic via set_uasmon/mons[urace]
function hero_has_infravision() {
    if (game.u?.HInfravision || game.u?.EInfravision) return true;
    // Non-polyd race default (C polyself set_uasmon → mons[urace.mnum])
    const racePm = game.urace?.mnum;
    if (racePm == null) return false;
    return infravision(mons(racePm));
}

// C ref: display.h _see_with_infrared
export function see_with_infrared(mon) {
    if (!mon) return false;
    if (game.u?.Blind || game.u?.ublind) return false;
    if (!hero_has_infravision()) return false;
    const ptr = mon.data || mons(mon.mnum);
    if (!infravisible(ptr)) return false;
    return couldsee(mon.mx, mon.my);
}

/**
 * C ref: display.c newsym / glyph_at — what look_all treats as "currently shown".
 * Returns {kind:'hero'|'mon'|'obj', mtmp?, obj?} or null.
 */
export function look_shown_at(x, y) {
    const u = game.u || {};
    if (u.ux === x && u.uy === y) return { kind: 'hero' };

    const mtmp = mon_at_display(x, y);
    if (cansee(x, y)) {
        if (mtmp && mon_visible(mtmp)) return { kind: 'mon', mtmp };
        const obj = objects_at(x, y);
        if (obj && !covers_objects(x, y)) return { kind: 'obj', obj };
        return null;
    }
    if (mtmp && mon_visible(mtmp) && see_with_infrared(mtmp)) {
        return { kind: 'mon', mtmp };
    }
    // Remembered object glyph still on map (hero_memory)
    const loc = game.level?.at?.(x, y);
    const rg = loc?.remembered_glyph;
    const obj = objects_at(x, y);
    if (rg && obj && !covers_objects(x, y)) {
        const og = obj_glyph(obj);
        if (rg.ch === og.ch) return { kind: 'obj', obj };
    }
    return null;
}

// C ref: display.c map_glyph / mon_color / pet_color — per-species mcolor.
// Newt is CLR_YELLOW; gecko/lizard are CLR_GREEN — mlet-only color is wrong.
// Dogs/cats are HI_DOMESTIC (white) in mons[]; ponies are CLR_BROWN.
export function mon_glyph(mtmp) {
    const mlet = mtmp.data?.mlet || mtmp.mlet;
    const ch = MLET_CH[mlet] || '?';
    const mnum = mtmp.mnum ?? mtmp.data?.mndx;
    const color = (mnum != null && mnum >= 0)
        ? (mcolors[mnum] ?? CLR_GRAY)
        : CLR_GRAY;
    return { ch, color };
}

/**
 * C ref: display.c display_monster — M_AP_OBJECT fake obj → map_object.
 * When a mimic is PHYSICALLY_SEEN and not sensed as a monster, show the
 * disguised object glyph (and remember it) instead of the mlet letter.
 * Named omissions: M_AP_FURNITURE cmap_to_glyph + lastseentyp;
 * M_AP_MONSTER what_mon + rn2_on_display_rng; Protection_from_shape_changers
 * sensed overlay; Hallucination statue random_obj.
 */
function mimic_object_appearance_glyph(mtmp) {
    if (M_AP_TYPE(mtmp) !== M_AP_OBJECT) return null;
    // C: sensed = Protection_from_shape_changers || sensemon(mon)
    // Protection stubbed false; when sensed, caller shows real mon_glyph.
    if (sensemon(mtmp)) return null;
    const corpsenm = (mtmp.mextra && mtmp.mextra.mcorpsenm != null)
        ? MCORPSENM(mtmp)
        : PM_TENGU;
    return obj_glyph({
        otyp: mtmp.mappearance | 0,
        corpsenm,
    });
}

/** C ref: display.h maybe_display_usteed / ridden_mon_to_glyph — mlet+mcolor. */
function hero_display_glyph() {
    const steed = game.u?.usteed;
    if (steed && mon_visible(steed)) return mon_glyph(steed);
    return { ch: '@', color: CLR_WHITE };
}

// C ref: display.h covers_objects
function covers_objects(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ;
    return t === POOL || t === MOAT || t === WATER || t === LAVAPOOL || t === LAVAWALL;
}

// C ref: display.h covers_traps — same as covers_objects
function covers_traps(x, y) {
    return covers_objects(x, y);
}

/** C ref: trap.c t_at — local walk (trap.js imports newsym from display). */
function t_at_display(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && t.tx === x && t.ty === y) return t;
    }
    return null;
}

/**
 * C ref: defsym.h trap PCHARs + rm.h trap_to_defsym + display.h trap_to_glyph.
 * Hallucination / random_trap_to_glyph deferred.
 */
function trap_glyph(trap) {
    const ttyp = trap?.ttyp | 0;
    // Indexed by trap_types; NO_TRAP=0 unused. ch '^' except WEB '"' / VS '~'.
    const colors = [
        NO_COLOR,           // NO_TRAP
        HI_METAL,           // ARROW_TRAP
        HI_METAL,           // DART_TRAP
        CLR_GRAY,           // ROCKTRAP
        CLR_BROWN,           // SQKY_BOARD
        HI_METAL,           // BEAR_TRAP
        CLR_RED,            // LANDMINE
        CLR_GRAY,            // ROLLING_BOULDER_TRAP
        HI_ZAP,             // SLP_GAS_TRAP
        CLR_BLUE,           // RUST_TRAP
        CLR_ORANGE,          // FIRE_TRAP
        CLR_BLACK,           // PIT
        CLR_BLACK,           // SPIKED_PIT
        CLR_BROWN,          // HOLE
        CLR_BROWN,          // TRAPDOOR
        CLR_MAGENTA,         // TELEP_TRAP
        CLR_MAGENTA,         // LEVEL_TELEP
        CLR_BRIGHT_MAGENTA,  // MAGIC_PORTAL
        CLR_GRAY,            // WEB
        CLR_GRAY,            // STATUE_TRAP
        HI_ZAP,             // MAGIC_TRAP
        HI_ZAP,             // ANTI_MAGIC
        CLR_BRIGHT_GREEN,   // POLY_TRAP
        CLR_MAGENTA,         // VIBRATING_SQUARE
        CLR_ORANGE,          // TRAPPED_DOOR
        CLR_ORANGE,          // TRAPPED_CHEST
    ];
    let ch = '^';
    if (ttyp === WEB) ch = '"';
    else if (ttyp === VIBRATING_SQUARE) ch = '~';
    const color = (ttyp > 0 && ttyp < TRAPNUM) ? colors[ttyp] : HI_METAL;
    return { ch, color, dec: false };
}

/**
 * C ref: display.c map_trap(trap, show) — remember + optionally paint.
 */
function map_trap(trap, show) {
    if (!trap) return;
    const x = trap.tx | 0;
    const y = trap.ty | 0;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const tg = trap_glyph(trap);
    const g = { ch: tg.ch, color: tg.color, decgfx: !!tg.dec };
    if (game.level?.flags?.hero_memory) {
        loc.remembered_glyph = { ch: g.ch, color: g.color, decgfx: g.decgfx };
    }
    if (show) show_glyph_cell(x, y, g.ch, g.color, g.decgfx);
}

/** C ref: engrave.c engr_at — local walk (engrave.js imports display). */
function engr_at(x, y) {
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        if (ep.engr_x === x && ep.engr_y === y) return ep;
    }
    return null;
}

/** C ref: engrave.h spot_shows_engravings — ROOM / CORR / ICE. */
function spot_shows_engravings(loc) {
    const typ = loc?.typ;
    return typ === ROOM || typ === CORR || typ === ICE;
}

/**
 * C ref: engrave.h engraving_to_defsym + defsym S_engroom / S_engrcorr.
 * Room: ASCII '`' CLR_BRIGHT_BLUE (DECgraphics does not remap).
 * Corridor: '#' CLR_BRIGHT_BLUE.
 */
function engraving_glyph(loc) {
    if (loc?.typ === CORR) {
        return { ch: '#', color: CLR_BRIGHT_BLUE, dec: false };
    }
    return { ch: '`', color: CLR_BRIGHT_BLUE, dec: false };
}

// C ref: display.h obj_is_generic — !dknown potions/gems/spellbooks use
// generic class glyph (objects[oclass]), not per-otyp oc_color.
function obj_is_generic(obj) {
    if (obj.dknown) return false;
    const oclass = obj.oclass ?? game.objects?.[obj.otyp]?.oc_class;
    if (oclass === POTION_CLASS) return true;
    const otyp = obj.otyp;
    if (otyp >= FIRST_REAL_GEM_OTYP && otyp <= LAST_GLASS_GEM_OTYP) return true;
    if (otyp >= FIRST_SPELL_OTYP && otyp <= LAST_SPELL_OTYP) return true;
    return false;
}

/** C ref: display.c map_object / see_nearby_objects — neardist from xray or 2. */
function object_neardist() {
    const xr = game.u?.xray_range | 0;
    const r = xr > 2 ? xr : 2;
    // neardist = (r*r)*2 - r  (rounded-corner square; matches distant_name)
    return { r, neardist: (r * r) * 2 - r };
}

function distu(x, y) {
    const u = game.u;
    return dist2(u?.ux | 0, u?.uy | 0, x, y);
}

/**
 * C ref: display.c map_object — if glyph would be generic and hero cansee
 * within neardist, observe_object then recompute as specific (per-otyp color).
 * Named omissions: Hallucination statue random_obj; pile-top glyph flags.
 */
function map_object_observe_near(obj, x, y) {
    if (!obj || game.u?.Hallucination) return;
    if (!obj_is_generic(obj)) return;
    if (!cansee(x, y)) return;
    const { neardist } = object_neardist();
    if (distu(x, y) <= neardist) observe_object(obj);
}

/**
 * C ref: display.c see_nearby_objects — after same-level u_on_newpos.
 * Mark nearby unseen tops dknown and newsym when the map still showed
 * a generic object. Caller gates Blind / Hallucination / uswallow.
 */
export function see_nearby_objects() {
    const u = game.u;
    if (!u || !game.level) return;
    const { r, neardist } = object_neardist();
    const x0 = u.ux | 0;
    const y0 = u.uy | 0;
    for (let iy = y0 - r; iy <= y0 + r; iy++) {
        for (let ix = x0 - r; ix <= x0 + r; ix++) {
            if (!isok(ix, iy)) continue;
            const obj = objects_at(ix, iy);
            if (!obj || obj.dknown) continue;
            if (!cansee(ix, iy) || distu(ix, iy) > neardist) continue;
            observe_object(obj);
            // C: operate on remembered glyph; if generic → newsym_force
            newsym(ix, iy);
        }
    }
}

// Contest nomux / tty ANSI_DEFAULT: CLR_GRAY hilite is empty → capture
// emits default fg (decoded NO_COLOR). CLR_BLACK fg 0 is coerced the same.
function tty_map_color(color) {
    if (color === CLR_GRAY || color === CLR_BLACK) return NO_COLOR;
    return color;
}

// C ref: display.c map_object / display.h obj_to_glyph + mon_color for corpses
// C ref: display.h statue_to_glyph — statues use mons[corpsenm].mlet + obj_color(STATUE)
export function obj_glyph(obj) {
    const def = game.objects?.[obj.otyp];
    const oclass = obj.oclass ?? def?.oc_class ?? ILLOBJ_CLASS;
    // C: STATUE → monster letter (not ROCK_CLASS '`'); color is statue white
    if (obj.otyp === STATUE_OTYP && obj.corpsenm != null && obj.corpsenm >= 0) {
        const ptr = mons(obj.corpsenm);
        const ch = MLET_CH[ptr?.mlet] || '?';
        const color = def?.oc_color ?? CLR_WHITE;
        return { ch, color, dec: false };
    }
    const ch = DEF_OC_SYM[oclass] || ']';
    // C: body glyphs use mon_color(corpsenm), not objects[CORPSE].oc_color
    if (obj.otyp === CORPSE_OTYP && obj.corpsenm != null && obj.corpsenm >= 0) {
        const color = mcolors[obj.corpsenm] ?? def?.oc_color ?? NO_COLOR;
        return { ch, color, dec: false };
    }
    // C: generic_obj_to_glyph → objects[oclass] (GENERIC_POTION etc.)
    if (obj_is_generic(obj)) {
        const gen = game.objects?.[oclass];
        return { ch, color: gen?.oc_color ?? NO_COLOR, dec: false };
    }
    const color = def?.oc_color ?? NO_COLOR;
    return { ch, color, dec: false };
}

// C ref: wintty.h / topl.c — topline --More-- state
const TOPLINE_EMPTY = 0;
const TOPLINE_NEED_MORE = 1;
const TOPLINE_NON_EMPTY = 2;
let _toplines = '';
let _toplin = TOPLINE_EMPTY;
let _win_stop = false;
// C ref: pline.c gp.prevmsg — last message that actually reached putmesg
let _prevmsg = '';
// C ref: wintty.h ttyDisplay->dismiss_more / getline.c morc — extra key
// accepted at --More-- (message_menu selection letter).
let _dismiss_more = 0;
let _morc = 0;

/** Reset module topline/delay state for a fresh runSegment (not in C game
 *  object; must not leak NEED_MORE across harness sessions). */
export function reset_display_messages() {
    _toplines = '';
    _toplin = TOPLINE_EMPTY;
    _win_stop = false;
    _delay_flushing = false;
    _lastStatus1 = '';
    _lastStatus2 = '';
    _prevmsg = '';
    _dismiss_more = 0;
    _morc = 0;
}

/**
 * C ref: wintty.c tty_clear_nhwindow(WIN_MESSAGE) — blank topline when
 * toplin != EMPTY. Used by cmd.c parse() after get_count returns.
 */
export function clear_nhwindow_message() {
    if (_toplin === TOPLINE_EMPTY) return;
    _toplines = '';
    _toplin = TOPLINE_EMPTY;
    game._pending_message = '';
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

// ── Terrain to display character + color + DEC flag ──
// C cmap indices used by wall_angle (drawing.h / symbols); local to display.
const S_STONE = 0;
const S_VWALL = 1;
const S_HWALL = 2;
const S_TLCORN = 3;
const S_TRCORN = 4;
const S_BLCORN = 5;
const S_BRCORN = 6;
const S_CRWALL = 7;
const S_TUWALL = 8;
const S_TDWALL = 9;
const S_TLWALL = 10;
const S_TRWALL = 11;

/** C ref: defsym.h PCHAR Primary (ASCII) wall glyphs. */
const WALL_GLYPH_ASCII = {
    [S_STONE]:  { ch: ' ', color: NO_COLOR, dec: false },
    [S_VWALL]:  { ch: '|', color: NO_COLOR, dec: false },
    [S_HWALL]:  { ch: '-', color: NO_COLOR, dec: false },
    [S_TLCORN]: { ch: '-', color: NO_COLOR, dec: false },
    [S_TRCORN]: { ch: '-', color: NO_COLOR, dec: false },
    [S_BLCORN]: { ch: '-', color: NO_COLOR, dec: false },
    [S_BRCORN]: { ch: '-', color: NO_COLOR, dec: false },
    [S_CRWALL]: { ch: '-', color: NO_COLOR, dec: false },
    [S_TUWALL]: { ch: '-', color: NO_COLOR, dec: false },
    [S_TDWALL]: { ch: '-', color: NO_COLOR, dec: false },
    [S_TLWALL]: { ch: '|', color: NO_COLOR, dec: false },
    [S_TRWALL]: { ch: '|', color: NO_COLOR, dec: false },
};

/** C ref: dat/symbols DECgraphics — VT100 alternate charset bytes + SO/SI. */
const WALL_GLYPH_DEC = {
    [S_STONE]:  { ch: ' ', color: NO_COLOR, dec: false },
    [S_VWALL]:  { ch: 'x', color: NO_COLOR, dec: true },
    [S_HWALL]:  { ch: 'q', color: NO_COLOR, dec: true },
    [S_TLCORN]: { ch: 'l', color: NO_COLOR, dec: true },
    [S_TRCORN]: { ch: 'k', color: NO_COLOR, dec: true },
    [S_BLCORN]: { ch: 'm', color: NO_COLOR, dec: true },
    [S_BRCORN]: { ch: 'j', color: NO_COLOR, dec: true },
    [S_CRWALL]: { ch: 'n', color: NO_COLOR, dec: true },
    [S_TUWALL]: { ch: 'v', color: NO_COLOR, dec: true },
    [S_TDWALL]: { ch: 'w', color: NO_COLOR, dec: true },
    [S_TLWALL]: { ch: 'u', color: NO_COLOR, dec: true },
    [S_TRWALL]: { ch: 't', color: NO_COLOR, dec: true },
};

/** C: gs.symset[].handling == H_DEC after OPTIONS=symset:DECgraphics. */
function use_decgraphics() {
    return !!game.iflags?.decgraphics;
}

function wall_glyph_table() {
    return use_decgraphics() ? WALL_GLYPH_DEC : WALL_GLYPH_ASCII;
}

// C ref: display.c wall_matrix / cross_matrix
const T_STONE = 0, T_TLCORN = 1, T_TRCORN = 2, T_HWALL = 3, T_TDWALL = 4;
const WALL_MATRIX = [
    [S_STONE, S_TLCORN, S_TRCORN, S_HWALL, S_TDWALL], // tdwall
    [S_STONE, S_TRCORN, S_BRCORN, S_VWALL, S_TLWALL], // tlwall
    [S_STONE, S_BRCORN, S_BLCORN, S_HWALL, S_TUWALL], // tuwall
    [S_STONE, S_BLCORN, S_TLCORN, S_VWALL, S_TRWALL], // trwall
];
const C_TRCORN = 0, C_BRCORN = 1, C_BLCORN = 2, C_TLWALL = 3, C_TUWALL = 4, C_CRWALL = 5;
const CROSS_MATRIX = [
    [S_BRCORN, S_BLCORN, S_TLCORN, S_TUWALL, S_TRWALL, S_CRWALL],
    [S_BLCORN, S_TLCORN, S_TRCORN, S_TRWALL, S_TDWALL, S_CRWALL],
    [S_TLCORN, S_TRCORN, S_BRCORN, S_TDWALL, S_TLWALL, S_CRWALL],
    [S_TRCORN, S_BRCORN, S_BLCORN, S_TLWALL, S_TUWALL, S_CRWALL],
];

function only_sv(sv, bits) {
    return !!(sv & bits) && !(sv & ~bits);
}

// C ref: display.c wall_angle — seenv + wall_info → cmap index
function wall_angle(lev) {
    let seenv = (lev.seenv || 0) & 0xff;
    const mode = (lev.wall_info || 0) & WM_MASK;

    switch (lev.typ) {
    case TUWALL:
        seenv = ((seenv >> 4) | (seenv << 4)) & 0xff;
        return do_twall(seenv, mode, WALL_MATRIX[2]);
    case TLWALL:
        seenv = ((seenv >> 2) | (seenv << 6)) & 0xff;
        return do_twall(seenv, mode, WALL_MATRIX[1]);
    case TRWALL:
        seenv = ((seenv >> 6) | (seenv << 2)) & 0xff;
        return do_twall(seenv, mode, WALL_MATRIX[3]);
    case TDWALL:
        return do_twall(seenv, mode, WALL_MATRIX[0]);
    case SDOOR:
        if (lev.horizontal) return wall_angle_hwall(seenv, mode);
        return wall_angle_vwall(seenv, mode);
    case VWALL:
        return wall_angle_vwall(seenv, mode);
    case HWALL:
        return wall_angle_hwall(seenv, mode);
    case TLCORNER:
        return set_corner(seenv, mode, S_TLCORN, SV3 | SV4 | SV5, SV4);
    case TRCORNER:
        return set_corner(seenv, mode, S_TRCORN, SV5 | SV6 | SV7, SV6);
    case BLCORNER:
        return set_corner(seenv, mode, S_BLCORN, SV1 | SV2 | SV3, SV2);
    case BRCORNER:
        return set_corner(seenv, mode, S_BRCORN, SV7 | SV0 | SV1, SV0);
    case CROSSWALL:
        return wall_angle_cross(seenv, mode);
    default:
        return S_STONE;
    }
}

function do_twall(seenv, mode, row) {
    let col;
    switch (mode) {
    case 0:
        if (seenv === SV4) col = T_TLCORN;
        else if (seenv === SV6) col = T_TRCORN;
        else if ((seenv & (SV3 | SV5 | SV7))
            || ((seenv & SV4) && (seenv & SV6))) col = T_TDWALL;
        else if (seenv & (SV0 | SV1 | SV2))
            col = (seenv & (SV4 | SV6) ? T_TDWALL : T_HWALL);
        else col = T_STONE;
        break;
    case WM_T_LONG:
        if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) col = T_TLCORN;
        else if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = T_TRCORN;
        else if ((seenv & SV5)
            || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) col = T_TDWALL;
        else col = T_STONE;
        break;
    case WM_T_BL:
        if (only_sv(seenv, SV4 | SV5)) col = T_TLCORN;
        else if ((seenv & (SV0 | SV1 | SV2 | SV7)) && !(seenv & (SV3 | SV4 | SV5)))
            col = T_HWALL;
        else if (only_sv(seenv, SV6)) col = T_STONE;
        else col = T_TDWALL;
        break;
    case WM_T_BR:
        if (only_sv(seenv, SV5 | SV6)) col = T_TRCORN;
        else if ((seenv & (SV0 | SV1 | SV2 | SV3)) && !(seenv & (SV5 | SV6 | SV7)))
            col = T_HWALL;
        else if (only_sv(seenv, SV4)) col = T_STONE;
        else col = T_TDWALL;
        break;
    default:
        col = T_STONE;
        break;
    }
    return row[col];
}

function wall_angle_vwall(seenv, mode) {
    switch (mode) {
    case 0: return seenv ? S_VWALL : S_STONE;
    case WM_W_LEFT:
        return (seenv & (SV1 | SV2 | SV3 | SV4 | SV5)) ? S_VWALL : S_STONE;
    case WM_W_RIGHT:
        return (seenv & (SV0 | SV1 | SV5 | SV6 | SV7)) ? S_VWALL : S_STONE;
    default: return S_STONE;
    }
}

function wall_angle_hwall(seenv, mode) {
    switch (mode) {
    case 0: return seenv ? S_HWALL : S_STONE;
    case WM_W_TOP: // == WM_W_LEFT == 1
        return (seenv & (SV3 | SV4 | SV5 | SV6 | SV7)) ? S_HWALL : S_STONE;
    case WM_W_RIGHT: // bottom == 2
        return (seenv & (SV0 | SV1 | SV2 | SV3 | SV7)) ? S_HWALL : S_STONE;
    default: return S_STONE;
    }
}

function set_corner(seenv, mode, which, outer, inner) {
    switch (mode) {
    case 0: return which;
    case WM_C_OUTER: return (seenv & outer) ? which : S_STONE;
    case WM_C_INNER: return (seenv & ~inner) ? which : S_STONE;
    default: return S_STONE;
    }
}

function wall_angle_cross(seenv, mode) {
    let row;
    switch (mode) {
    case 0:
        if (seenv === SV0) return S_BRCORN;
        if (seenv === SV2) return S_BLCORN;
        if (seenv === SV4) return S_TLCORN;
        if (seenv === SV6) return S_TRCORN;
        if (!(seenv & ~(SV0 | SV1 | SV2))
            && ((seenv & SV1) || seenv === (SV0 | SV2))) return S_TUWALL;
        if (!(seenv & ~(SV2 | SV3 | SV4))
            && ((seenv & SV3) || seenv === (SV2 | SV4))) return S_TRWALL;
        if (!(seenv & ~(SV4 | SV5 | SV6))
            && ((seenv & SV5) || seenv === (SV4 | SV6))) return S_TDWALL;
        if (!(seenv & ~(SV0 | SV6 | SV7))
            && ((seenv & SV7) || seenv === (SV0 | SV6))) return S_TLWALL;
        return S_CRWALL;
    case WM_X_TL:
        row = CROSS_MATRIX[1];
        seenv = ((seenv >> 4) | (seenv << 4)) & 0xff;
        return do_crwall(seenv, row);
    case WM_X_TR:
        row = CROSS_MATRIX[2];
        seenv = ((seenv >> 6) | (seenv << 2)) & 0xff;
        return do_crwall(seenv, row);
    case WM_X_BL:
        row = CROSS_MATRIX[0];
        seenv = ((seenv >> 2) | (seenv << 6)) & 0xff;
        return do_crwall(seenv, row);
    case WM_X_BR:
        return do_crwall(seenv, CROSS_MATRIX[3]);
    case WM_X_TLBR:
        if (only_sv(seenv, SV1 | SV2 | SV3)) return S_BLCORN;
        if (only_sv(seenv, SV5 | SV6 | SV7)) return S_TRCORN;
        if (only_sv(seenv, SV0 | SV4)) return S_STONE;
        return S_CRWALL;
    case WM_X_BLTR:
        if (only_sv(seenv, SV0 | SV1 | SV7)) return S_BRCORN;
        if (only_sv(seenv, SV3 | SV4 | SV5)) return S_TLCORN;
        if (only_sv(seenv, SV2 | SV6)) return S_STONE;
        return S_CRWALL;
    default:
        return S_STONE;
    }
}

function do_crwall(seenv, row) {
    if (seenv === SV4) return S_STONE;
    seenv = seenv & ~SV4;
    let col;
    if (seenv === SV0) col = C_BRCORN;
    else if (seenv & (SV2 | SV3)) {
        if (seenv & (SV5 | SV6 | SV7)) col = C_CRWALL;
        else if (seenv & (SV0 | SV1)) col = C_TUWALL;
        else col = C_BLCORN;
    } else if (seenv & (SV5 | SV6)) {
        if (seenv & (SV1 | SV2 | SV3)) col = C_CRWALL;
        else if (seenv & (SV0 | SV7)) col = C_TLWALL;
        else col = C_TRCORN;
    } else if (seenv & SV1) col = (seenv & SV7) ? C_CRWALL : C_TUWALL;
    else if (seenv & SV7) col = (seenv & SV1) ? C_CRWALL : C_TLWALL;
    else col = C_CRWALL;
    return row[col];
}

function wall_glyph(loc) {
    // C: idx = ptr->seenv ? wall_angle(ptr) : S_stone
    const idx = (loc.seenv) ? wall_angle(loc) : S_STONE;
    const tab = wall_glyph_table();
    const g = tab[idx] || tab[S_STONE];
    if (idx === S_STONE) return g;
    // C ref: display.h cmap_walls_to_glyph + display.c wallcolors[] /
    // reset_glyphmap wall_color(mines_walls). Intended branch colors
    // (commented beside wallcolors init): mines CLR_BROWN; main CLR_GRAY
    // (tty_map_color → NO_COLOR). Gehennom/knox/sokoban deferred.
    const color = In_mines(game.u?.uz) ? CLR_BROWN : CLR_GRAY;
    return { ch: g.ch, color, dec: g.dec };
}

/** C ref: display.c back_to_glyph — terrain ttychar (+ DEC letter). */
export function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    const dec = use_decgraphics();
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case SCORR:     return { ch: ' ', color: NO_COLOR, dec: false }; // C: like stone until found
    // C defsym S_room: ASCII '.'; DECgraphics meta-~ (middle dot)
    case ROOM:      return dec
        ? { ch: '~', color: NO_COLOR, dec: true }
        : { ch: '.', color: NO_COLOR, dec: false };
    case CORR: {
        // C ref: display.c back_to_glyph — S_litcorr if waslit||lit_corridor
        // else S_corr. reset_glyphmap: S_litcorr + shared '#' → CLR_WHITE;
        // S_corr is defsym CLR_GRAY, which tty records as NO_COLOR.
        const litCorr = !!(loc.waslit || game.flags?.lit_corridor);
        return {
            ch: '#',
            color: litCorr ? CLR_WHITE : NO_COLOR,
            dec: false,
        };
    }
    case DOOR:
        // C ref: display.c back_to_glyph DOOR — S_hodoor/S_vodoor when open.
        // DEC: both open-door cmaps are meta-a (checkerboard).
        // ASCII: horizontal → S_hodoor '|'; else S_vodoor '-'.
        if (loc.doormask & D_ISOPEN) {
            if (dec) return { ch: 'a', color: CLR_BROWN, dec: true };
            return loc.horizontal
                ? { ch: '|', color: CLR_BROWN, dec: false }
                : { ch: '-', color: CLR_BROWN, dec: false };
        }
        if (loc.doormask & (D_CLOSED | D_LOCKED)) {
            return { ch: '+', color: CLR_BROWN, dec: false };
        }
        // D_NODOOR = S_ndoor: ASCII '.'; DEC meta-~
        return dec
            ? { ch: '~', color: NO_COLOR, dec: true }
            : { ch: '.', color: NO_COLOR, dec: false };
    case STAIRS: {
        // C ref: display.c back_to_glyph STAIRS + defsym.h PCHAR
        // known_branch_stairs → S_br*stair CLR_YELLOW; else S_*stair
        // CLR_GRAY (tty_map_color → NO_COLOR). Direction from ladder flag.
        const sway = stairway_at(x, y);
        const branch = known_branch_stairs(sway);
        const down = !!(loc.ladder & LA_DOWN);
        return {
            ch: down ? '>' : '<',
            color: branch ? CLR_YELLOW : CLR_GRAY,
            dec: false,
        };
    }
    // C ref: defsym.h PCHAR — furniture glyphs (display.c back_to_glyph).
    // dat/symbols DECgraphics: S_altar \xfb meta-{ (pi); other furniture
    // keep Primary ASCII unless listed in that symset. altar_color by
    // altarmask deferred — defsym CLR_GRAY (tty → NO_COLOR) for now.
    case ALTAR:
        return dec
            ? { ch: '{', color: CLR_GRAY, dec: true }
            : { ch: '_', color: CLR_GRAY, dec: false };
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE:    return { ch: '\\', color: HI_GOLD, dec: false };
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    // C ref: display.c back_to_glyph + defsym.h PCHAR — pool/moat/water/lava/ice.
    // Primary: '}' (pool/lava/water) / '.' (ice). DECgraphics: S_pool/S_lava/
    // S_lavawall/S_water \xe0 meta-` diamond; S_ice \xfe meta-~.
    // DRAWBRIDGE_UP under-typ deferred (still default '?').
    case POOL:
    case MOAT:
        return dec
            ? { ch: '`', color: CLR_BLUE, dec: true }
            : { ch: '}', color: CLR_BLUE, dec: false };
    case WATER:
        return dec
            ? { ch: '`', color: CLR_BRIGHT_BLUE, dec: true }
            : { ch: '}', color: CLR_BRIGHT_BLUE, dec: false };
    case LAVAPOOL:
        return dec
            ? { ch: '`', color: CLR_RED, dec: true }
            : { ch: '}', color: CLR_RED, dec: false };
    case LAVAWALL:
        return dec
            ? { ch: '`', color: CLR_ORANGE, dec: true }
            : { ch: '}', color: CLR_ORANGE, dec: false };
    case ICE:
        return dec
            ? { ch: '~', color: CLR_CYAN, dec: true }
            : { ch: '.', color: CLR_CYAN, dec: false };
    // C ref: display.c back_to_glyph — walls/SDOOR use wall_angle(seenv)
    case SDOOR:
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
        return wall_glyph(loc);
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = tty_map_color(color);
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

/**
 * C ref: detect.c reveal_terrain_getglyph — dirty cmap hack at end.
 * S_darkroom already paints as S_room in JS; S_litcorr → S_corr.
 */
function reveal_terrain_cmap_hack(g) {
    if (!g) return g;
    if (g.ch === '#' && g.color === CLR_WHITE) {
        return { ch: '#', color: NO_COLOR, dec: false };
    }
    return g;
}

/** Copy remembered / terrain glyph into a plain {ch,color,dec[,invisible]}. */
function copy_glyph(g) {
    if (!g) return null;
    return {
        ch: g.ch,
        color: g.color ?? NO_COLOR,
        dec: !!(g.dec ?? g.decgfx),
        invisible: !!g.invisible,
    };
}

/**
 * C ref: detect.c reveal_terrain_getglyph
 * Branch envelope: hero_memory / seenv; strip mon/obj/trap/invisible per
 * TER_* bits; lastseentyp vs typ → back_to_glyph; litcorr→corr hack.
 * Named omissions: visible_region_at / gascloud; keep_traps trap_to_glyph
 * restore; M_AP_FURNITURE lastseentyp fake; swallowed ustuck mon glyph;
 * warning glyphs; TER_FULL seenv temp already covered; arboreal default.
 */
export function reveal_terrain_getglyph(x, y, swallowed, default_glyph, which_subset) {
    const loc = game.level?.at(x, y);
    if (!loc) return default_glyph;

    const keep_traps = (which_subset & TER_TRP) !== 0;
    const keep_objs = (which_subset & TER_OBJ) !== 0;
    const keep_mons = (which_subset & TER_MON) !== 0;
    const full = (which_subset & TER_FULL) !== 0;
    const hero_memory = !!game.level?.flags?.hero_memory;

    const seenv = (full || hero_memory)
        ? (loc.seenv | 0)
        : (cansee(x, y) ? SVALL : 0);

    if (full) {
        const save = loc.seenv;
        loc.seenv = SVALL;
        const g = terrain_glyph(loc, x, y);
        loc.seenv = save;
        return reveal_terrain_cmap_hack(g);
    }

    // C: levl_glyph = hero_memory ? levl.glyph : seenv ? back_to_glyph : default
    let levl_glyph;
    if (hero_memory) {
        levl_glyph = loc.remembered_glyph
            ? copy_glyph(loc.remembered_glyph)
            : copy_glyph(default_glyph);
    } else {
        levl_glyph = seenv
            ? terrain_glyph(loc, x, y)
            : copy_glyph(default_glyph);
    }

    // Classify displayed layer (C glyph_at) without integer glyph IDs.
    let kind = 'other'; // mon | obj | trap | invisible | other
    let glyph;
    let was_mon = false;

    if (swallowed) {
        glyph = copy_glyph(levl_glyph);
    } else {
        const u = game.u || {};
        if (u.ux === x && u.uy === y && canspotself()) {
            kind = 'mon';
            glyph = hero_display_glyph();
        } else {
            const mtmp = mon_at_display(x, y);
            if (mtmp && mon_visible(mtmp)
                && (cansee(x, y) || see_with_infrared(mtmp) || sensemon(mtmp))) {
                kind = 'mon';
                const apg = mimic_object_appearance_glyph(mtmp);
                glyph = apg || mon_glyph(mtmp);
            } else if (glyph_is_invisible(loc)) {
                kind = 'invisible';
                glyph = { ch: 'I', color: NO_COLOR, dec: false, invisible: true };
            } else {
                const obj = objects_at(x, y);
                if (obj && !covers_objects(x, y)) {
                    // Shown object: cansee path, or remembered matches obj
                    const og = obj_glyph(obj);
                    const rg = loc.remembered_glyph;
                    if (cansee(x, y)
                        || (rg && rg.ch === og.ch)) {
                        kind = 'obj';
                        glyph = og;
                    }
                }
                if (kind === 'other') {
                    // C glyph_at for terrain/engraving — prefer memory / back_to_glyph
                    // over disp_* (disp_color is already tty-mapped).
                    if (hero_memory && loc.remembered_glyph && !loc.remembered_glyph.invisible) {
                        glyph = copy_glyph(loc.remembered_glyph);
                    } else if (seenv) {
                        glyph = terrain_glyph(loc, x, y);
                    } else {
                        glyph = copy_glyph(levl_glyph);
                    }
                }
            }
        }
    }

    // C: !keep_mons && (monster|warning) || swallow → levl_glyph
    if ((!keep_mons && kind === 'mon')) {
        glyph = copy_glyph(levl_glyph);
        was_mon = true;
        if (glyph?.invisible) kind = 'invisible';
        else {
            const obj = objects_at(x, y);
            if (obj && !covers_objects(x, y)) {
                const og = obj_glyph(obj);
                if (glyph && glyph.ch === og.ch) kind = 'obj';
                else kind = 'other';
            } else {
                kind = 'other';
            }
        }
    }

    // C: keep_traps && !keep_objs && object → trap_to_glyph — traps deferred

    // C: strip objects / traps / invisible / (region && was_mon)
    if (((!keep_objs && kind === 'obj')
        || (!keep_traps && kind === 'trap')
        || kind === 'invisible'
        || (was_mon && false /* region deferred */))) {
        if (!seenv) {
            glyph = copy_glyph(default_glyph);
        } else {
            const last = game.lastseentyp?.[x]?.[y] | 0;
            if (last === (loc.typ | 0) || !last) {
                glyph = terrain_glyph(loc, x, y);
            } else {
                // C: temp typ = lastseentyp; back_to_glyph; restore
                // wall_info recalc deferred
                const saveTyp = loc.typ;
                loc.typ = last;
                glyph = terrain_glyph(loc, x, y);
                loc.typ = saveTyp;
            }
        }
    }

    return reveal_terrain_cmap_hack(glyph || default_glyph);
}

/**
 * C ref: detect.c reveal_terrain show_glyph loop — rewrite map then flush.
 * Does not pline / browse / map_redisplay (caller).
 */
export function reveal_terrain_show_map(which_subset, swallowed) {
    // C: default_sym = arboreal ? S_tree : S_stone — tree cmap deferred
    const default_glyph = { ch: ' ', color: NO_COLOR, dec: false };

    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const g = reveal_terrain_getglyph(
                x, y, swallowed, default_glyph, which_subset,
            );
            show_glyph_cell(x, y, g.ch, g.color ?? NO_COLOR, !!g.dec);
        }
    }
}

// C ref: display.c tmp_at — transient missile/beam glyphs (DISP_FLASH first).
// Nested alloc, DISP_BEAM/ALL/TETHER/ALWAYS/CHANGE/FREEMEM deferred.
const TMP_AT_MAX_GLYPHS = COLNO * 2;
const _tgfirst = { saved: [], sidx: 0, style: 0, glyph: null, prev: null };
let _tglyph = null;

/**
 * C ref: display.c tmp_at(x, y)
 * Open: tmp_at(DISP_FLASH, glyphObj) — glyphObj is {ch,color,dec} from obj_glyph.
 * Step: tmp_at(map_x, map_y) — paint flash, erase previous.
 * Close: tmp_at(DISP_END, 0).
 */
export function tmp_at(x, y) {
    switch (x) {
    case DISP_BEAM:
    case DISP_ALL:
    case DISP_TETHER:
    case DISP_FLASH:
    case DISP_ALWAYS: {
        const tmp = _tglyph ? {
            saved: [], sidx: 0, style: 0, glyph: null, prev: null,
        } : _tgfirst;
        tmp.prev = _tglyph;
        _tglyph = tmp;
        _tglyph.sidx = 0;
        _tglyph.style = x;
        _tglyph.glyph = y;
        _tglyph.saved = [];
        // C: flush_screen(0)
        void flush_screen(0);
        return;
    }
    case DISP_FREEMEM:
        while (_tglyph) {
            const tmp = _tglyph.prev;
            _tglyph = tmp;
        }
        return;
    default:
        break;
    }

    if (!_tglyph) return;

    switch (x) {
    case DISP_CHANGE:
        _tglyph.glyph = y;
        break;
    case DISP_END:
        if (_tglyph.style === DISP_BEAM || _tglyph.style === DISP_ALL) {
            for (let i = 0; i < _tglyph.sidx; i++) {
                const p = _tglyph.saved[i];
                if (p) newsym(p.x, p.y);
            }
        } else if (_tglyph.style === DISP_TETHER) {
            // BACKTRACK tether return deferred
            void BACKTRACK;
            for (let i = 0; i < _tglyph.sidx; i++) {
                const p = _tglyph.saved[i];
                if (p) newsym(p.x, p.y);
            }
        } else if (_tglyph.sidx) {
            // DISP_FLASH / DISP_ALWAYS
            const p = _tglyph.saved[0];
            if (p) newsym(p.x, p.y);
        }
        _tglyph = _tglyph.prev;
        break;
    default: {
        // display glyph at (x, y)
        if (x < 1 || y < 0 || x >= COLNO || y >= ROWNO) break;
        if (_tglyph.style === DISP_BEAM || _tglyph.style === DISP_ALL) {
            if (_tglyph.style !== DISP_ALL && !cansee(x, y)) break;
            if (_tglyph.sidx >= TMP_AT_MAX_GLYPHS) break;
            _tglyph.saved[_tglyph.sidx] = { x, y };
            _tglyph.sidx += 1;
        } else if (_tglyph.style === DISP_TETHER) {
            // tether trail deferred — still record + show object glyph
            if (_tglyph.sidx >= TMP_AT_MAX_GLYPHS) break;
            _tglyph.saved[_tglyph.sidx] = { x, y };
            _tglyph.sidx += 1;
        } else {
            // DISP_FLASH / DISP_ALWAYS
            if (_tglyph.sidx) {
                const p = _tglyph.saved[0];
                if (p) newsym(p.x, p.y);
                _tglyph.sidx = 0;
            }
            if (!cansee(x, y) && _tglyph.style !== DISP_ALWAYS) break;
            _tglyph.saved[0] = { x, y };
            _tglyph.sidx = 1;
        }
        const g = _tglyph.glyph;
        if (g && typeof g === 'object') {
            show_glyph_cell(x, y, g.ch, g.color ?? NO_COLOR, !!g.dec);
        }
        void flush_screen(0);
        break;
    }
    }
}

/** C ref: display.c / wintty nh_delay_output — await contest animationFrame. */
export async function nh_delay_output() {
    const af = game?.animationFrame;
    if (typeof af === 'function') await af.call(game);
}

/**
 * C ref: display.c magic_map_background(x, y, show)
 * Remembers real background under hero_memory; show==0 is mapping path.
 * Out-of-sight ROOM the hero does not remember as lit: with dark_room+color
 * → DARKROOMSYM (showsyms[S_darkroom]=showsyms[S_room], floor ·); else
 * GLYPH_NOTHING blank. Unlit lit-corr glyph → dark corr.
 */
export function magic_map_background(x, y, show) {
    const lev = game.level?.at(x, y);
    if (!lev) return;

    let tg = terrain_glyph(lev, x, y);

    // C: out-of-sight lit rooms/corridors the hero does not remember as lit
    if (!cansee(x, y) && !lev.waslit) {
        const isRoomFloor = lev.typ === ROOM
            && ((tg.ch === '~' && tg.dec) || (tg.ch === '.' && !tg.dec));
        if (isRoomFloor) {
            // C: (flags.dark_room && iflags.use_color) ? DARKROOMSYM
            //    : GLYPH_NOTHING. Defaults On; showsyms equate darkroom to
            //    room floor (reglyph_darkroom). Keep floor/NO_COLOR like S_room.
            const darkRoom = game.flags?.dark_room !== false;
            const useColor = game.flags?.color !== false
                && game.iflags?.use_color !== false;
            if (!(darkRoom && useColor)) {
                tg = { ch: ' ', color: NO_COLOR, dec: false };
            }
            // else: leave floor glyph (S_darkroom paints as S_room)
        } else if (lev.typ === CORR && tg.ch === '#'
            && game.flags?.lit_corridor) {
            tg = { ch: '#', color: NO_COLOR, dec: false };
        }
    }

    if (game.level?.flags?.hero_memory) {
        // C: only overwrite unexplored/cmap memory — JS remembered is cmap-like
        lev.remembered_glyph = {
            ch: tg.ch, color: tg.color, decgfx: tg.dec,
        };
    }
    if (show) {
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
    }
    // C: update_lastseentyp(x, y) after magic_map_background
    update_lastseentyp(x, y);
}

/** C youprop.h Blind / Invis / Invisible / See_invisible for canspotself. */
function hero_Blind() {
    const u = game.u || {};
    if (u.Blind || u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}
function hero_Invis() {
    const u = game.u || {};
    if (u.Invis && !((u.HInvis | 0) || (u.EInvis | 0))) return true;
    return !!(((u.HInvis | 0) || (u.EInvis | 0)) && !(u.BInvis | 0));
}
function hero_See_invisible() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0) || u.See_invisible);
}
function hero_Invisible() {
    // C: Invisible (Invis && !See_invisible)
    return hero_Invis() && !hero_See_invisible();
}
/** C display.h canseeself / senseself / canspotself */
function canseeself() {
    const u = game.u || {};
    return !!(hero_Blind() || u.uswallow || (!hero_Invisible() && !u.uundetected));
}
function senseself() {
    const u = game.u || {};
    // Unblind_telepat = ETelepat; Detect_monsters = H|E
    return !!(u.ETelepat || u.Unblind_telepat || u.Detect_monsters
        || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0));
}
function canspotself() {
    return canseeself() || senseself();
}

/**
 * C ref: display.c unset_seenv — clear the seenv bit for direction
 * from (x0,y0) toward adjacent (x1,y1). Used by vault blackout.
 */
export function unset_seenv(lev, x0, y0, x1, y1) {
    if (!lev) return;
    const dx = (x1 | 0) - (x0 | 0);
    const dy = (y0 | 0) - (y1 | 0);
    // C display.c seenv_matrix (SVALL at center, unlike vision.js copy)
    const seenv_matrix = [
        [SV2, SV1, SV0],
        [SV3, SVALL, SV7],
        [SV4, SV5, SV6],
    ];
    const bit = seenv_matrix[dy + 1]?.[dx + 1];
    if (bit != null) lev.seenv = (lev.seenv | 0) & ~bit;
}

// C ref: display.c _map_location(x,y,show) — remember non-living contents
// (object / trap / engraving / background); paint when show.
// Used under hero/monster so out-of-sight memory keeps the object glyph.
// Named omissions: Hallucination trap glyphs; visible_region_at after show.
export function map_location(x, y, show) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const mem = !!game.level?.flags?.hero_memory;
    let g = null;
    const obj = objects_at(x, y);
    if (obj && !covers_objects(x, y)) {
        // C: map_object(obj, show) — may observe_object when near
        map_object_observe_near(obj, x, y);
        const og = obj_glyph(obj);
        const attr = obj_map_attr(obj);
        const pile = obj_is_piletop(obj);
        g = { ch: og.ch, color: og.color, decgfx: !!og.dec, objpile: pile };
        if (mem) {
            loc.remembered_glyph = {
                ch: g.ch, color: g.color, decgfx: g.decgfx, objpile: pile,
            };
        }
        if (show) show_glyph_cell(x, y, g.ch, g.color, g.decgfx, attr);
        update_lastseentyp(x, y);
        return;
    }
    // C: t_at && tseen && !covers_traps → map_trap
    const trap = t_at_display(x, y);
    if (trap && trap.tseen && !covers_traps(x, y)) {
        map_trap(trap, show);
        update_lastseentyp(x, y);
        return;
    }
    if (spot_shows_engravings(loc)) {
        const ep = engr_at(x, y);
        if (ep && ep.erevealed && !covers_traps(x, y)) {
            const eg = engraving_glyph(loc);
            g = { ch: eg.ch, color: eg.color, decgfx: !!eg.dec };
        }
    }
    if (!g) {
        const tg = terrain_glyph(loc, x, y);
        g = { ch: tg.ch, color: tg.color, decgfx: !!tg.dec };
    }
    if (mem) loc.remembered_glyph = { ch: g.ch, color: g.color, decgfx: g.decgfx };
    if (show) show_glyph_cell(x, y, g.ch, g.color, g.decgfx);
    update_lastseentyp(x, y);
}

function map_location_memory(x, y) {
    map_location(x, y, false);
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // C display.c newsym u_at — canspotself gates display_self
        if (cansee(x, y)) {
            loc.waslit = !!loc.lit;
            const hep = engr_at(x, y);
            if (hep) hep.erevealed = 1;
            // poison/steam regions deferred (mon_overrides_region)
            const see_self = canspotself();
            // C: _map_location(x, y, !see_self); if (see_self) display_self()
            map_location(x, y, !see_self);
            if (see_self) {
                const hg = hero_display_glyph();
                show_glyph_cell(x, y, hg.ch, hg.color, false);
            }
        } else {
            // C: feel_location then display_self if canspotself
            // Named omission: feel_location body deferred
            if (canspotself()) {
                const hg = hero_display_glyph();
                show_glyph_cell(x, y, hg.ch, hg.color, false);
            }
        }
        return;
    }

    // C ref: display.c newsym — monster via cansee+mon_visible, or infrared
    const mtmp = mon_at_display(x, y);
    if (cansee(x, y)) {
        // C: lev->waslit = (lev->lit != 0); /* remember lit condition */
        loc.waslit = !!loc.lit;
        // C: erevealed = 1 even when covered by objects or a monster
        const epSee = engr_at(x, y);
        if (epSee) epSee.erevealed = 1;
        if (mtmp && mon_visible(mtmp)) {
            // C: _map_location(x, y, FALSE) then display_monster — memory
            // keeps object under the monster so leaving sight does not
            // replace ) with remembered corridor.
            // show_mon_or_warn clears invisible memory when showing mon
            if (glyph_is_invisible(loc)) {
                loc.remembered_glyph = null;
                map_location_memory(x, y);
            } else {
                map_location_memory(x, y);
            }
            // C display_monster: M_AP_OBJECT → map_object(!sensed) before
            // falling through to real mon_to_glyph when !mimic || sensed.
            const apg = mimic_object_appearance_glyph(mtmp);
            if (apg) {
                show_glyph_cell(x, y, apg.ch, apg.color, !!apg.dec);
                if (game.level?.flags?.hero_memory) {
                    loc.remembered_glyph = {
                        ch: apg.ch, color: apg.color, decgfx: !!apg.dec,
                    };
                }
                return;
            }
            const mg = mon_glyph(mtmp);
            show_glyph_cell(x, y, mg.ch, mg.color, false);
            return;
        }
        // C: newsym cansee — keep remembered I when !displayable mon
        if (glyph_is_invisible(loc)) {
            map_invisible(x, y);
            return;
        }
        // C ref: display.c _map_location — vobj_at before trap/engraving/bg
        // C: map_object(obj, show) — nearby generic → observe_object
        const obj = objects_at(x, y);
        if (obj && !covers_objects(x, y)) {
            map_object_observe_near(obj, x, y);
            const og = obj_glyph(obj);
            const attr = obj_map_attr(obj);
            const pile = obj_is_piletop(obj);
            show_glyph_cell(x, y, og.ch, og.color, og.dec, attr);
            if (game.level?.flags?.hero_memory) {
                loc.remembered_glyph = {
                    ch: og.ch, color: og.color, decgfx: og.dec, objpile: pile,
                };
            }
            // C _map_location always updates lastseentyp after mapping
            update_lastseentyp(x, y);
            return;
        }
        // C: t_at && tseen && !covers_traps → map_trap
        const trap = t_at_display(x, y);
        if (trap && trap.tseen && !covers_traps(x, y)) {
            map_trap(trap, true);
            update_lastseentyp(x, y);
            return;
        }
        // C: spot_shows_engravings && engr_at && erevealed → map_engraving
        if (spot_shows_engravings(loc)) {
            const ep = engr_at(x, y);
            if (ep && ep.erevealed && !covers_traps(x, y)) {
                const eg = engraving_glyph(loc);
                show_glyph_cell(x, y, eg.ch, eg.color, eg.dec);
                if (game.level?.flags?.hero_memory) {
                    loc.remembered_glyph = {
                        ch: eg.ch, color: eg.color, decgfx: eg.dec,
                    };
                }
                update_lastseentyp(x, y);
                return;
            }
        }
        const tg = terrain_glyph(loc, x, y);
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        }
        update_lastseentyp(x, y);
        return;
    }

    // C: !cansee — still show sensed monsters (infrared / telepathy / detect)
    if (mtmp && mon_visible(mtmp) && see_with_infrared(mtmp)) {
        const mg = mon_glyph(mtmp);
        show_glyph_cell(x, y, mg.ch, mg.color, false);
        return;
    }

    if (loc.remembered_glyph) {
        // C ref: display.c newsym — out of sight, correct lit memory to
        // match waslit. With lit_corridor, visible CORR paints as
        // S_litcorr (CLR_WHITE); when !waslit (or dark_room+color), show
        // S_corr instead (tty CLR_GRAY → NO_COLOR).
        let mem = loc.remembered_glyph;
        const darkRoomColor = game.flags?.dark_room !== false
            && game.flags?.color !== false
            && game.iflags?.use_color !== false;
        if (loc.typ === CORR && mem.ch === '#' && mem.color === CLR_WHITE
            && (!loc.waslit || darkRoomColor)) {
            mem = { ch: '#', color: NO_COLOR, decgfx: false };
            loc.remembered_glyph = mem;
        }
        // C: piletop glyph carries MG_OBJPILE; hilite applied at print
        // from current iflags. JS may lack objpile on older memory — also
        // detect live floor pile (still present under remembered glyph).
        const floorObj = objects_at(x, y);
        const livePile = !!(floorObj && !covers_objects(x, y)
            && obj_is_piletop(floorObj));
        const attr = (livePile || mem.objpile)
            ? obj_map_attr(floorObj, !livePile)
            : 0;
        show_glyph_cell(x, y, mem.ch, mem.color, mem.decgfx, attr);
    } else {
        // C: show_mem → show_glyph(x, y, lev->glyph); unexplored glyph
        // paints blank. A no-op here left stale tty cells after a sensed
        // monster left an unseen square (postmov newsym(omx,omy)).
        show_glyph_cell(x, y, ' ', NO_COLOR, false);
    }
}

// ── docrt ──
// C ref: display.c docrt_flags — vision_recalc(2); cls; show memory;
// vision_recalc(0). Shutting down sight first matters: vision_reset only
// rebuilds block maps and leaves stale IN_SIGHT, so newsym would paint/
// remember terrain for the previous level's visible coordinates.
export async function docrt() {
    if (!game.u?.ux || !game.level) return;
    // C: vision_recalc(2) — hero sees nothing during refresh
    vision_recalc(2);
    await cls();
    // C: show_glyph(x,y, lev->glyph) for all cells (memory; cansee false)
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            newsym(x, y);
    // C: vision_recalc(0) — see what is to be seen (+ newsym updates)
    vision_recalc(0);
    // Named omission: see_monsters() overlay; swallowed/underwater/buried;
    // docrt_flags maponly/redrawonly/nocls; disp.botlx + update_inventory.
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
    let name = game.plname || 'Hero';
    // C ref: botl.c — capitalize first letter of plname for status only
    if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
        name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
    }
    const role = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
    const title = `${name} the ${role}`;
    // C ref: botl.c do_statusline1 — get_strength_str + ACURR order
    const stats = u.acurr?.a
        ? `St:${get_strength_str()} Dx:${acurr(A_DEX)} Co:${acurr(A_CON)} In:${acurr(A_INT)} Wi:${acurr(A_WIS)} Ch:${acurr(A_CHA)}`
        : 'St:? Dx:? Co:? In:? Wi:? Ch:?';
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

// Last bot()-committed status. C paints WIN_STATUS only in bot();
// pline→flush_screen calls bot() when disp.botl before putmesg (D-0314).
let _lastStatus1 = '';
let _lastStatus2 = '';
/** When true, paint blank status (fullscreen menu cleared WIN_STATUS). */
let _statusSuppressed = false;

// C ref: botl.c enc_stat[] — also used in insight.c
const ENC_STAT = [
    '', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded',
];

// C ref: botl.c describe_level — "Dlvl:%-2d" / "Tutorial:%-2d" uses
// depth(&u.uz), not dunlev; Xp:/T: gated by flags.showexp / flags.time;
// BL_CONDITION Ride when u.usteed (botl.c condtests[bl_ride]).
// Named omissions: Knox/quest/endgame describe_level arms; full condition
// list (Stone/Slime/hunger/Blind/…); Upolyd HD.
function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    const flags = game.flags || {};
    const dlvl = depth(u.uz) || 1;
    // C botl.c get_blstats: hp < 0 → 0 for display when bot() runs
    let hp = u.uhp | 0;
    if (hp < 0) hp = 0;
    if (hp > 9999) hp = 9999;
    let hpmax = u.uhpmax | 0;
    if (hpmax > 9999) hpmax = 9999;
    const levtag = In_tutorial(u.uz) ? 'Tutorial' : 'Dlvl';
    let s = `${levtag}:${dlvl} $:${game._goldCount || 0} HP:${hp}(${hpmax}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} Xp:${u.ulevel || 1}`;
    if (flags.showexp) s += `/${u.uexp || 0}`;
    if (flags.time) s += ` T:${game.moves || 1}`;
    // C do_statusline2 cond: hunger then enc_stat then Blind… then Ride
    const cap = near_capacity();
    if (cap > UNENCUMBERED) {
        s += ` ${ENC_STAT[cap] || ''}`;
    }
    // C windows.c BL_MASK_RIDE → " Ride" (leading space in strcat)
    if (u.usteed) s += ' Ride';
    return s;
}

/** C ref: botl.c bot — no-op when u.uhp == -1 (dosave / exact overkill). */
function _botSuppressed() {
    return (game.u?.uhp | 0) === -1;
}

/**
 * Suppress status paint after fullscreen NHW_MENU clear. C leaves status
 * blank until the next bot(); used for Options → choose_classes.
 */
export function clear_committed_status() {
    _statusSuppressed = true;
    if (game.flags) {
        game.flags.botl = false;
        game.flags.botlx = false;
        game.flags.time_botl = false;
    }
}

/** Commit live status into the botl cache (C bot() putstr WIN_STATUS). */
function _commitStatusLines() {
    const s1raw = _statusLine1();
    _lastStatus1 = s1raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
    _lastStatus2 = _statusLine2();
    return s1raw;
}

export { _statusLine2 as status_line_2 };

/** Expand CSI cursor-forward in status for overlay painting. */
export function snapshot_status_lines() {
    const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
    return [s1, _statusLine2()];
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

/**
 * C-comparable tty serialize — like Terminal.serialize(), but leading
 * spaces that carry visible attrs (inverse/underline) are emitted so
 * decode preserves them. Frozen Terminal.serialize() cursor-forwards
 * past all leading spaces and drops those attrs (D-0129 spell heading).
 */
export function serialize_for_scoring(term) {
    if (!term?.grid) return term?.serialize?.() ?? '';
    const colorToFg = (color) => {
        if (color === 8 || color < 0 || color > 15) return 39;
        return color < 8 ? 30 + color : 90 + (color - 8);
    };
    const sgrTransition = (curFg, curAttr, wantFg, wantAttr) => {
        if (curFg === wantFg && curAttr === wantAttr) return '';
        const wantBold = (wantAttr & 2) !== 0;
        const wantUnder = (wantAttr & 4) !== 0;
        const wantInv = (wantAttr & 1) !== 0;
        const curBold = (curAttr & 2) !== 0;
        const curUnder = (curAttr & 4) !== 0;
        const curInv = (curAttr & 1) !== 0;
        const needReset = (curBold && !wantBold) || (curUnder && !wantUnder)
            || (curInv && !wantInv);
        const codes = [];
        if (needReset) {
            codes.push(0);
            if (wantBold) codes.push(1);
            if (wantUnder) codes.push(4);
            if (wantInv) codes.push(7);
            if (wantFg !== 39) codes.push(wantFg);
        } else {
            if (wantBold && !curBold) codes.push(1);
            if (wantUnder && !curUnder) codes.push(4);
            if (wantInv && !curInv) codes.push(7);
            if (wantFg !== curFg) codes.push(wantFg);
        }
        return codes.length ? `\x1b[${codes.join(';')}m` : '';
    };
    const rows = term.rows || 24;
    const cols = term.cols || 80;
    let lastRow = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (term.grid[r][c].ch !== ' ') { lastRow = r; break; }
        }
    }
    let out = '';
    let curFg = 39, curAttr = 0;
    for (let r = 0; r <= lastRow; r++) {
        let lastCol = -1;
        for (let c = cols - 1; c >= 0; c--) {
            if (term.grid[r][c].ch !== ' ') { lastCol = c; break; }
        }
        if (lastCol < 0) { if (r < lastRow) out += '\n'; continue; }
        // Start at first non-space OR space with visible attr (inv/uline)
        let firstCol = 0;
        for (let c = 0; c <= lastCol; c++) {
            const cell = term.grid[r][c];
            if (cell.ch !== ' ' || (cell.attr & 0x5)) {
                firstCol = c;
                break;
            }
        }
        if (firstCol > 4) out += `\x1b[${firstCol}C`;
        else if (firstCol > 0) out += ' '.repeat(firstCol);
        for (let c = firstCol; c <= lastCol; c++) {
            const cell = term.grid[r][c];
            const wantFg = colorToFg(cell.color);
            const wantAttr = cell.attr | 0;
            out += sgrTransition(curFg, curAttr, wantFg, wantAttr);
            curFg = wantFg;
            curAttr = wantAttr;
            out += cell.ch;
        }
        out += sgrTransition(curFg, curAttr, 39, 0);
        curFg = 39;
        curAttr = 0;
        if (r < lastRow) out += '\n';
    }
    return out;
}

// ── Build screen output ──
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display) return;

    let output = '';
    // Row 0: message
    output += (game._pending_message || '') + '\n';

    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status from last bot() commit (C never live-paints here)
    let s1raw;
    let s2;
    if (_statusSuppressed) {
        s1raw = '';
        s2 = '';
    } else if (_lastStatus2) {
        s1raw = _lastStatus1;
        s2 = _lastStatus2;
    } else {
        s1raw = _commitStatusLines();
        s2 = _lastStatus2;
    }
    output += s1raw + '\n';
    output += s2;

    game._screen_output = output;

    // Also write to grid for serialize_terminal_grid
    if (display.grid) {
        display.clearScreen();
        // Message line(s) — --More-- may sit on row 1 when msg is long
        const msg = game._pending_message || '';
        const msgLines = msg.split('\n');
        for (let r = 0; r < msgLines.length && r < 2; r++) {
            const line = msgLines[r];
            for (let c = 0; c < Math.min(line.length, display.cols); c++)
                display.setCell(c, r, line[c], NO_COLOR, 0);
        }
        // Map — write characters to grid (DEC → Unicode for browser display).
        // Only convert glyphs that frozen screen-decode DEC_MAP equates back
        // (walls/doors/floor ·). S_altar meta-{ and S_pool/S_lava/S_water
        // meta-` are in DEC_TO_UNICODE but NOT in DEC_MAP — keep raw so
        // serialize_for_scoring matches C SO+ch (renderCell leaves them).
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                let ch = loc.disp_ch;
                if (loc.disp_decgfx) {
                    const uni = DEC_TO_UNICODE[ch];
                    // DEC_MAP: walls/doors/a/~ only — not '{' or '`'
                    if (uni && ch !== '{' && ch !== '`') ch = uni;
                }
                const sr = y + 1;
                // Don't clobber --More-- on row 1
                if (sr === 1 && msgLines.length > 1) continue;
                display.setCell(x - 1, sr, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        // Status lines from last bot() (uhp==-1 skip keeps prior)
        if (!_statusSuppressed) {
            const s1 = _lastStatus1 || s1raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
                m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
            for (let c = 0; c < Math.min(s1.length, display.cols); c++)
                display.setCell(c, 22, s1[c], NO_COLOR, 0);
            for (let c = 0; c < Math.min(s2.length, display.cols); c++)
                display.setCell(c, 23, s2[c], NO_COLOR, 0);
        }
        // Cursor: prompts stay on topline; otherwise hero.
        if (msg.startsWith('Count:')) {
            display.setCursor(msg.length, 0);
        } else if (msg.endsWith('--More--') && !msg.includes('\n')) {
            display.setCursor(msg.length, 0);
        } else if (msg.includes('\n--More--')) {
            display.setCursor(8, 1);
        } else if (msg.match(/^What do you want to /)) {
            display.setCursor(msg.length, 0);
        } else if (game.u?.ux > 0) {
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
        }
    }
}

// C ref: display.c flush_screen(-1) toggles delay_flushing so map/status
// stay on the physical screen while level-change plines run and cls/more
// can still paint --More-- on the stale map (Dlvl:N before redraw).
let _delay_flushing = false;

/** Paint message rows only; leave map/status cells untouched. */
function _paintToplineOnly() {
    const display = game?.nhDisplay;
    if (!display?.grid || !display.setCell) return;
    const cols = display.cols || 80;
    const msg = game._pending_message || '';
    const msgLines = msg.split('\n');
    // Row 0 is always the message window; only touch row 1 when --More-- wraps.
    for (let c = 0; c < cols; c++) display.setCell(c, 0, ' ', NO_COLOR, 0);
    for (let r = 0; r < msgLines.length && r < 2; r++) {
        const line = msgLines[r];
        for (let c = 0; c < Math.min(line.length, cols); c++)
            display.setCell(c, r, line[c], NO_COLOR, 0);
        if (r === 0) {
            for (let c = line.length; c < cols; c++)
                display.setCell(c, 0, ' ', NO_COLOR, 0);
        }
    }
    if (msg.endsWith('--More--') && !msg.includes('\n')) {
        display.setCursor?.(msg.length, 0);
    } else if (msg.includes('\n--More--') || msgLines[1] === '--More--') {
        display.setCursor?.(8, 1);
    } else if (msgLines.length > 1) {
        display.setCursor?.((msgLines[1] || '').length, 1);
    } else {
        display.setCursor?.(msg.length, 0);
    }
}

// ── flush_screen ──
// C ref: display.c flush_screen — mode -1 toggles postpone; while postponed,
// map/botl flushes are no-ops (message paints still allowed for more()).
// Before painting, bot() when disp.botl|botlx (C display.c).
export async function flush_screen(mode) {
    // Menu/text overlays paint the Terminal grid directly; don't clobber them.
    // C ref: invent display / NHW_MENU / NHW_TEXT stay until dismissed.
    if (game._menu_overlay) return;
    if (mode === -1) {
        _delay_flushing = !_delay_flushing;
        if (_delay_flushing) return;
        // Un-postpone: fall through and perform the deferred full flush.
    }
    if (_delay_flushing) {
        _paintToplineOnly();
        return;
    }
    const flags = game.flags || {};
    if (flags.botl || flags.botlx) await bot();
    else if (flags.time_botl) {
        // timebot deferred — clear flag so it does not stick
        flags.time_botl = false;
    }
    _buildScreenOutput();
}

// ── cls ──
// C ref: display.c cls — display_nhwindow(WIN_MESSAGE) before clear_nhwindow(MAP).
// NEED_MORE → more() while map flushes may still be postponed (goto_level).
/**
 * C ref: display.c clear_glyph_buffer — force gbuf to unexplored (blank).
 * JS display buffer is loc.disp_*; remembered_glyph (map memory) stays.
 */
export function clear_glyph_buffer() {
    const level = game.level;
    if (!level?.at) return;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = level.at(x, y);
            if (!loc) continue;
            loc.disp_ch = ' ';
            loc.disp_color = NO_COLOR;
            loc.disp_decgfx = false;
            loc.disp_attr = 0;
            loc.gnew = 0;
        }
    }
}

export async function cls() {
    if (_toplin === TOPLINE_NEED_MORE && !_win_stop) {
        await more();
    } else {
        _toplin = TOPLINE_EMPTY;
    }
    // C display.c cls — force botl redraw on next flush/bot
    if (!game.flags) game.flags = {};
    game.flags.botlx = true;
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    // C: clear_glyph_buffer() after clear_nhwindow(WIN_MAP)
    clear_glyph_buffer();
    game._pending_message = '';
    _toplines = '';
    _toplin = TOPLINE_EMPTY;
}

// ── bot ──
// C ref: botl.c bot — no-op body when u.uhp == -1; always clear botl flags.
export async function bot() {
    _statusSuppressed = false;
    if (!_botSuppressed()) _commitStatusLines();
    if (game.flags) {
        game.flags.botl = false;
        game.flags.botlx = false;
        game.flags.time_botl = false;
    }
}

// C ref: getline.c xwaitforspace("\033 ") — only ESC/space/return dismiss
// Other keys are consumed (bell) and the wait continues. Each nhgetch is a
// capture boundary, matching C session steps with 0 RNG at --More--.
// C more() does not call flush_screen/bot — only message; paint cached botl.
export async function more() {
    // Lazy import avoids display ↔ input cycle (nhgetch calls topline hooks).
    const { nhgetch } = await import('./input.js');
    const CO = game?.nhDisplay?.cols || 80;
    const base = (_toplines || game._pending_message || '').replace(/--More--$/, '');
    // C ref: topl.c more() — if curx >= CO-8, put --More-- on the next row.
    // Messages may already contain update_topl `\n` word-breaks (D-0282).
    if (base.includes('\n')) {
        const last = base.slice(base.lastIndexOf('\n') + 1);
        game._pending_message = last.length >= CO - 8
            ? `${base}\n--More--`
            : `${base}--More--`;
    } else if (base.length >= CO) {
        // Fallback when a caller skipped update_topl-style pre-wrap.
        let breakAt = base.lastIndexOf(' ', CO - 1);
        if (breakAt < (CO >> 1)) breakAt = Math.min(base.length, CO - 1);
        const line0 = base.slice(0, breakAt).trimEnd();
        const rest = base.slice(breakAt).trimStart();
        game._pending_message = rest
            ? `${line0}\n${rest}--More--`
            : `${line0}\n--More--`;
    } else if (base.length >= CO - 8) {
        game._pending_message = `${base}\n--More--`;
    } else {
        game._pending_message = base + '--More--';
    }
    // C more() does not flush_screen; when map flush is postponed
    // (goto_level), only paint topline so the stale map remains.
    if (_delay_flushing) _paintToplineOnly();
    else _buildScreenOutput();
    const disp = game?.nhDisplay;
    if (disp) {
        const msg = game._pending_message || '';
        if (msg.includes('\n')) {
            const line1 = msg.split('\n')[1] || '';
            // Bare "--More--" on row 1 (welcome): C cursor col 8; else end of text
            if (line1 === '--More--') disp.setCursor(8, 1);
            else disp.setCursor(line1.length, 1);
        } else {
            // Same-line --More—; cursor just past the prompt
            disp.setCursor(msg.length, 0);
        }
    }

    _morc = 0;
    for (;;) {
        const c = await nhgetch();
        // C ref: getline.c xwaitforspace("\033 ") + dismiss_more
        if (c === 27) { // ESC → WIN_STOP
            _win_stop = true;
            _morc = 27;
            break;
        }
        if (c === 32 || c === 13 || c === 10) {
            _morc = c;
            break;
        }
        if (_dismiss_more && c === _dismiss_more) {
            _morc = c;
            break;
        }
        // tty_nhbell(); discard
    }

    _toplines = '';
    _toplin = TOPLINE_EMPTY;
    game._pending_message = '';
}

/**
 * C ref: wintty.c tty_message_menu(let, how, mesg).
 * PICK_NONE → pline only. PICK_ONE → putstr/pline + more() with
 * dismiss_more=let so the inventory letter selects at --More--.
 * @param {string|number} letch invlet (or HANDS_SYM)
 * @param {number} how PICK_NONE (0) or PICK_ONE (1)
 * @param {string} mesg already-formatted xprname line
 * @returns {Promise<string|null>} selected let / ESC / null (space etc.)
 */
export async function message_menu(letch, how, mesg) {
    const PICK_NONE = 0;
    const PICK_ONE = 1;
    if (how === PICK_NONE) {
        await pline(mesg);
        return null;
    }
    const letCode = typeof letch === 'string' ? letch.charCodeAt(0) : (letch | 0);
    _dismiss_more = letCode;
    _morc = 0;
    // C: tty_putstr(WIN_MESSAGE) — redotoplin sets NEED_MORE; more() if
    // already wrapped. JS pline matches that envelope.
    await pline(mesg);
    if (_toplin === TOPLINE_NEED_MORE && !_win_stop) {
        await more();
    }
    _dismiss_more = 0;
    if ((how === PICK_ONE && _morc === letCode) || _morc === 27) {
        return _morc === 27 ? '\x1b' : String.fromCharCode(_morc);
    }
    return null;
}

/** C ref: flush pending topline --More-- before menus / non-pline UI */
export async function flush_topl_more() {
    if (_toplin === TOPLINE_NEED_MORE && !_win_stop) {
        await more();
    }
}

// Clear stop/need-more acknowledgment helpers (also applied in nhgetch).
export function clear_win_stop() {
    _win_stop = false;
}

// C ref: wintty.c tty_nhgetch — after key read, NEED_MORE → NON_EMPTY
export function mark_topline_seen() {
    if (_toplin === TOPLINE_NEED_MORE) _toplin = TOPLINE_NON_EMPTY;
}

export function get_win_stop() {
    return _win_stop;
}

// C ref: pline.c You_feel — prefix "You feel " (Unaware dream path deferred)
export async function You_feel(msg) {
    if (msg == null || msg === '') return;
    await pline(`You feel ${msg}`);
}

// C ref: pline.c verbalize — wrap spoken text in double quotes
export async function verbalize(msg) {
    if (msg == null || msg === '') return;
    await pline(`"${msg}"`);
}

/**
 * C ref: pline.c Norep — PLINE_NOREPEAT → MSGTYP_NOREP; suppress when
 * identical to gp.prevmsg (last shown pline), not a Norep-only cache.
 * Msgtype-pattern table deferred.
 */
export async function Norep(msg) {
    if (msg == null || msg === '') return;
    if (_prevmsg === String(msg)) return;
    await pline(msg);
}

// ── pline ──
// C ref: pline.c vpline — flush_screen before putmesg; topl.c update_topl.
export async function pline(msg) {
    if (msg == null || msg === '') return;
    const CO = game?.nhDisplay?.cols || 80;
    // C: if (u.ux) flush_screen(...) before putmesg — botl update first
    if (game.u?.ux) await flush_screen(1);

    // Capture skip before more(); C still paints the new line with the
    // pre-more skip flag even if ESC sets WIN_STOP during more().
    const skip = _win_stop;
    const notdied = !String(msg).startsWith('You die');
    const line = String(msg);

    if ((_toplin === TOPLINE_NEED_MORE || skip)
        && _toplines.length + 3 + line.length < CO - 8
        && notdied) {
        _toplines = _toplines ? `${_toplines}  ${line}` : line;
        if (!skip) game._pending_message = _toplines;
        // C: gp.prevmsg = line (new text only, not the concatenated topline)
        _prevmsg = line;
        return;
    }
    if (!skip && _toplin === TOPLINE_NEED_MORE) {
        await more();
    }
    if (!notdied) _win_stop = false;

    // C ref: topl.c update_topl — replace spaces with `\n` while n0 >= CO
    let formatted = line;
    {
        let n0 = formatted.length;
        let tl = 0;
        while (n0 >= CO) {
            const otl = tl;
            let i = tl + CO - 1;
            for (; i !== otl; --i) {
                if (formatted[i] === ' ') break;
            }
            if (i === otl) {
                i = formatted.indexOf(' ', otl);
                if (i < 0) break;
            }
            formatted = `${formatted.slice(0, i)}\n${formatted.slice(i + 1)}`;
            tl = i + 1;
            n0 = formatted.length - tl;
        }
    }

    _toplines = formatted;
    // C: strncpy(gp.prevmsg, line, BUFSZ) after putmesg
    _prevmsg = line;
    if (!skip) {
        game._pending_message = formatted;
        _toplin = TOPLINE_NEED_MORE;
        // C ref: topl.c redotoplin — more() when message wrapped (cury > 0)
        if (formatted.includes('\n')) {
            await more();
        }
    }
}
