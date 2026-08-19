// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph (glyph_updates / show_glyph_change
// D-1219; Hallu classifier D-1221), docrt (in_docrt), cls, flush_screen,
// suppress_map_output (D-1126),
// shieldeff (D-1087; sparkle opt_out default On; sit rndcurse caller).

import { game } from './gstate.js';
import { rank_of } from './roles.js';
import { cansee, couldsee, vision_recalc, vision_off_newsym_gbuf } from './vision.js';
import { objects_at } from './mkobj.js';
import {
    mcolors, mons, pmnames, infravision, infravisible, mindless, NUMMONS,
} from './monsters.js';
import { rn2_on_display_rng } from './rng.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, TREE, IRONBARS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    SDOOR, SCORR, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, AIR, CLOUD,
    IS_POOL,
    FOUNTAIN, SINK, THRONE, ALTAR, GRAVE,
    AM_MASK, AM_CHAOTIC, AM_NEUTRAL, AM_LAWFUL, AM_SANCTUM,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    LA_DOWN,
    BC_BALL, BC_CHAIN,
    ENGRAVE, BURN, HEADSTONE,
    IS_OBSTRUCTED, IS_DOOR, IS_ROOM, IS_WALL, IS_FURNITURE,
    Is_waterlevel, Is_airlevel,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
    WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM, WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    HI_GOLD, HI_METAL, HI_ZAP,
    WEB, VIBRATING_SQUARE, TRAPNUM,
    In_mines,
    In_sokoban,
    In_quest,
    In_endgame,
    Is_knox_level,
    Is_rogue_level,
    PRIMARYSET,
    ROGUESET,
    DISP_BEAM, DISP_ALL, DISP_TETHER, DISP_FLASH, DISP_ALWAYS,
    DISP_CHANGE, DISP_END, DISP_FREEMEM, BACKTRACK,
    M_AP_OBJECT, M_AP_TYPE,
    MCORPSENM,
    isok,
    u_at,
    xytodir, dirtocoord, directionname,
    GPCOORDS_NONE, GPCOORDS_MAP, GPCOORDS_COMPASS, GPCOORDS_COMFULL,
    GPCOORDS_SCREEN,
    SVALL,
    TER_TRP, TER_OBJ, TER_MON, TER_FULL,
    OBJ_FLOOR,
    UNENCUMBERED,
    NOT_HUNGRY,
    WARNCOUNT,
    def_warnsyms,
    TELEPAT,
    BOLT_LIM,
    Upolyd,
    MALE,
    FEMALE,
    DEVTEAM_EMAIL,
} from './const.js';
import {
    ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
    VENOM_CLASS, objectNames, NUM_OBJECTS, FIRST_OBJECT,
} from './objects.js';
import {
    NO_COLOR, CLR_GRAY, CLR_BLACK, CLR_BROWN, CLR_WHITE, CLR_YELLOW,
    CLR_BLUE, CLR_BRIGHT_BLUE, CLR_RED, CLR_ORANGE, CLR_CYAN, CLR_GREEN,
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
 * → ATR_INVERSE. Named omissions: MG_DETECT / BW_* / MG_FEMALE.
 */
function obj_map_attr(obj, rememberedPile = false) {
    const pile = rememberedPile || obj_is_piletop(obj);
    if (pile && game.iflags?.hilite_pile && use_inverse_opt()) {
        return ATR_INVERSE;
    }
    return 0;
}

/**
 * C ref: wintty.c tty_print_glyph — (special & MG_PET) && hilite_pet
 * → term_start_attr(wc2_petattr). flag.h hilite_pet ≡ wc_hilite_pet;
 * options.c init_options wc2_petattr = ATR_INVERSE; enable hilite_pet
 * also sets petattr when unset. Named omissions: accessibility
 * SYM_PET_OVERRIDE; remembered MG_PET glyph when pet left the square.
 */
function hilite_pet_opt() {
    return !!(game.iflags?.wc_hilite_pet ?? game.iflags?.hilite_pet);
}

function mon_map_attr(mtmp) {
    if (!mtmp?.mtame || !hilite_pet_opt()) return 0;
    const a = game.iflags?.wc2_petattr;
    // C: ATR_NONE is 0; init + enable path keep Inverse when hilite is on.
    return (a == null || a === 0) ? ATR_INVERSE : (a | 0);
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
// pet_color ≡ mon_color (display.c); hilite_pet sets tty attr via mon_map_attr.
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
 * C ref: youprop.h Blind_telepat / Unblind_telepat.
 * Blind_telepat = HTelepat || ETelepat; Unblind_telepat = ETelepat only.
 */
function hero_ETelepat() {
    const u = game.u || {};
    return (u.ETelepat | 0) || (u.uprops?.[TELEPAT]?.extrinsic | 0);
}
function hero_HTelepat() {
    const u = game.u || {};
    return (u.HTelepat | 0) || (u.uprops?.[TELEPAT]?.intrinsic | 0);
}
function hero_Blind_telepat() {
    return !!(hero_HTelepat() || hero_ETelepat());
}
function hero_Unblind_telepat() {
    return !!hero_ETelepat();
}

/**
 * C ref: display.h _tp_sensemon — non-mindless + blind/intrinsic or
 * unblind extrinsic telepathy within unblind_telepat_range (squared).
 * Named omission: MATCH_WARN_OF_MON is a separate sensemon arm.
 */
export function tp_sensemon(mon) {
    if (!mon?.mx) return false;
    const ptr = mon.data || mons(mon.mnum);
    if (!ptr || mindless(ptr)) return false;
    const u = game.u || {};
    const blind = hero_Blind();
    if (blind && hero_Blind_telepat()) return true;
    if (hero_Unblind_telepat()) {
        let range = u.unblind_telepat_range;
        // C worn.c recalc_telepat_range — -1 means no ESP objects.
        // If extrinsic is set but range was never recalculated (restore /
        // older setworn), treat as one BOLT_LIM² source.
        if (range == null || range < 0) {
            range = BOLT_LIM * BOLT_LIM;
        }
        const d = dist2(u.ux | 0, u.uy | 0, mon.mx | 0, mon.my | 0);
        return d <= (range | 0);
    }
    return false;
}

/**
 * C ref: display.h _sensemon — Detect_monsters / telepathy / warn.
 * Named omissions: MATCH_WARN_OF_MON; Underwater pool adjacency gate.
 */
export function sensemon(mon) {
    if (!mon) return false;
    const u = game.u || {};
    if (u.uswallow && mon !== u.ustuck) return false;
    if (u.Detect_monsters
        || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0)) {
        return true;
    }
    return tp_sensemon(mon);
}

/**
 * C ref: display.h _mon_warning — Warning + hostile + near + m_lev gate.
 * Named omission: MATCH_WARN_OF_MON race-specific warn (separate path).
 */
export function mon_warning(mon) {
    if (!mon) return false;
    const u = game.u || {};
    const Warning = !!((u.HWarning | 0) || (u.EWarning | 0) || u.Warning);
    if (!Warning || mon.mpeaceful) return false;
    const d = dist2(u.ux | 0, u.uy | 0, mon.mx | 0, mon.my | 0);
    if (d >= 100) return false;
    const warnlevel = game.context?.warnlevel ?? 1;
    return ((mon.m_lev | 0) / 4 | 0) >= (warnlevel | 0);
}

/**
 * C ref: display.c warning_of — m_lev/4 clamped to WARNCOUNT-1.
 */
export function warning_of(mon) {
    if (!mon_warning(mon)) return 0;
    let tmp = (mon.m_lev | 0) / 4 | 0;
    if (tmp > WARNCOUNT - 1) tmp = WARNCOUNT - 1;
    return tmp;
}

/**
 * C ref: display.c display_warning — float warnsym above map (not memory).
 * Named omissions: MATCH_WARN_OF_MON mon_to_glyph arm; worm tails
 * (caller must not invoke).
 */
function display_warning(mon) {
    if (!mon) return;
    // C: Hallucination ? rn2_on_display_rng(WARNCOUNT-1)+1 : warning_of(mon)
    const wl = game.u?.Hallucination
        ? rn2_on_display_rng(WARNCOUNT - 1) + 1
        : warning_of(mon);
    const sym = def_warnsyms[wl] || def_warnsyms[0];
    if (!sym) return;
    show_glyph_cell(mon.mx, mon.my, sym.ch, sym.color, false);
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
export function glyph_is_invisible(loc) {
    return !!loc?.remembered_glyph?.invisible;
}

/**
 * C ref: display.c map_background(x, y, show) — remember/show real terrain
 * via back_to_glyph. Does not map floor objects (unlike map_location).
 */
export function map_background(x, y, show) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const tg = terrain_glyph(loc, x, y);
    if (game.level?.flags?.hero_memory) {
        loc.remembered_glyph = {
            ch: tg.ch, color: tg.color, decgfx: !!tg.dec,
        };
    }
    if (show) show_glyph_cell(x, y, tg.ch, tg.color, !!tg.dec);
}

/**
 * C ref: display.c unmap_object — replace remembered glyph with trap /
 * engraving / background (no show). Clears invisible-monster / object
 * memory without remapping a live floor object (map_location would).
 * Named omissions: dark-room S_room→S_stone waslit when !waslit.
 */
export function unmap_object(x, y) {
    if (!game.level?.flags?.hero_memory) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const trap = t_at_display(x, y);
    if (trap && trap.tseen && !covers_traps(x, y)) {
        map_trap(trap, 0);
        return;
    }
    if (loc.seenv) {
        // C: engraving if spot_shows && !covers_traps; else map_background
        if (spot_shows_engravings(loc) && !covers_traps(x, y)) {
            const ep = engr_at(x, y);
            if (ep) {
                if (cansee(x, y)) ep.erevealed = 1;
                map_engraving(ep, 0);
                return;
            }
        }
        map_background(x, y, 0);
        // C: !waslit && S_room glyph && ROOM → S_stone (dark-room tweak)
        if (!loc.waslit && loc.typ === ROOM) {
            const mem = loc.remembered_glyph;
            const roomFloor = mem
                && ((mem.ch === '~' && mem.decgfx)
                    || (mem.ch === '.' && !mem.decgfx));
            if (roomFloor) {
                loc.remembered_glyph = {
                    ch: ' ', color: NO_COLOR, decgfx: false,
                };
            }
        }
    } else {
        loc.remembered_glyph = { ch: ' ', color: NO_COLOR, decgfx: false };
    }
}

/**
 * C ref: display.c unmap_invisible — clear I memory then newsym.
 * Returns true when an invisible glyph was present.
 */
export function unmap_invisible(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !glyph_is_invisible(loc)) return false;
    unmap_object(x, y);
    newsym(x, y);
    return true;
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
    const u = game.u || {};
    // C: !Blind && Infravision && …
    if (hero_Blind()) {
        return false;
    }
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
// C ref: display.h mon_to_glyph / what_mon — Hallu → random_monster(display rng).
export function mon_glyph(mtmp) {
    let mnum = mtmp.mnum ?? mtmp.data?.mndx;
    // C: what_mon(monsndx(mon->data), rn2_on_display_rng)
    if (game.u?.Hallucination) {
        mnum = rn2_on_display_rng(NUMMONS);
    }
    const ptr = (mnum != null && mnum >= 0) ? mons(mnum) : mtmp.data;
    const mlet = ptr?.mlet || mtmp.data?.mlet || mtmp.mlet;
    const ch = MLET_CH[mlet] || '?';
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

/**
 * C ref: display.h hero_glyph / maybe_display_usteed.
 * (Upolyd || !showrace) → u.umonnum else urace.mnum; mlet+mcolor.
 * Named omissions: Hallucination random; gender glyph variants.
 */
function hero_display_glyph() {
    const steed = game.u?.usteed;
    if (steed && mon_visible(steed)) return mon_glyph(steed);
    const u = game.u;
    const flags = game.flags || {};
    const mnum = (Upolyd(u) || !flags.showrace)
        ? (u?.umonnum | 0)
        : (game.urace?.mnum | 0);
    const ptr = mons(mnum);
    const ch = MLET_CH[ptr?.mlet] || '@';
    const color = (mnum >= 0) ? (mcolors[mnum] ?? CLR_GRAY) : CLR_WHITE;
    return { ch, color };
}

// C ref: display.h covers_objects — is_pool && !Underwater, or lava.
function covers_objects(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    if (t === LAVAPOOL || t === LAVAWALL) return true;
    // C: is_pool ≡ IS_POOL (POOL..DRAWBRIDGE_UP)
    if (IS_POOL(t) && !(game.u?.Underwater | 0)) return true;
    return false;
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
export function map_trap(trap, show) {
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

/**
 * C ref: display.c map_engraving(ep, show) — remember + optionally paint.
 * Named omission: full engraving_to_glyph variants beyond room/corr glyphs.
 */
export function map_engraving(ep, show) {
    if (!ep) return;
    const x = ep.engr_x | 0;
    const y = ep.engr_y | 0;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const eg = engraving_glyph(loc);
    if (game.level?.flags?.hero_memory) {
        loc.remembered_glyph = { ch: eg.ch, color: eg.color, decgfx: eg.dec };
    }
    if (show) show_glyph_cell(x, y, eg.ch, eg.color, eg.dec);
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
 * Named omissions: pile-top glyph flags.
 */
function map_object_observe_near(obj, x, y) {
    if (!obj || game.u?.Hallucination) return;
    if (!obj_is_generic(obj)) return;
    if (!cansee(x, y)) return;
    const { neardist } = object_neardist();
    if (distu(x, y) <= neardist) observe_object(obj);
}

/**
 * C ref: display.c map_object — obj_to_glyph then hero_memory store.
 * Under Hallu, STATUE *display* is statue_to_glyph (mon+gender) but
 * *memory* is a separate random_obj_to_glyph (extra display-RNG burns).
 */
/** C ref: display.c map_object — export for fight_empty boulder/statue remap. */
export function map_object(obj, show) {
    if (!obj) return;
    const x = obj.ox | 0;
    const y = obj.oy | 0;
    const loc = game.level?.at(x, y);
    map_object_observe_near(obj, x, y);
    const og = obj_glyph(obj);
    const attr = obj_map_attr(obj);
    const pile = obj_is_piletop(obj);
    if (game.level?.flags?.hero_memory && loc) {
        // C: Hallu+STATUE → levl glyph = random_obj_to_glyph (not display glyph)
        if (game.u?.Hallucination && obj.otyp === STATUE_OTYP) {
            const otyp = rn2_on_display_rng(NUM_OBJECTS - FIRST_OBJECT)
                + FIRST_OBJECT;
            let mem;
            if (otyp === CORPSE_OTYP) {
                const mnum = rn2_on_display_rng(NUMMONS);
                const ptr = mons(mnum);
                mem = {
                    ch: MLET_CH[ptr?.mlet] || '%',
                    color: mcolors[mnum] ?? NO_COLOR,
                    decgfx: false,
                    objpile: pile,
                };
            } else {
                const def = game.objects?.[otyp];
                const oclass = def?.oc_class ?? ILLOBJ_CLASS;
                mem = {
                    ch: DEF_OC_SYM[oclass] || ']',
                    color: def?.oc_color ?? NO_COLOR,
                    decgfx: false,
                    objpile: pile,
                };
            }
            loc.remembered_glyph = mem;
        } else {
            loc.remembered_glyph = {
                ch: og.ch, color: og.color, decgfx: !!og.dec, objpile: pile,
                // C glyph ranges encode statue/boulder; JS has no integer IDs
                statue: obj.otyp === STATUE_OTYP,
                boulder: obj.otyp === BOULDER_OTYP,
            };
        }
    }
    if (show) show_glyph_cell(x, y, og.ch, og.color, !!og.dec, attr);
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
// C ref: display.h statue_to_glyph / Hallucination → random_obj_to_glyph
export function obj_glyph(obj) {
    // C display.h: obj_to_glyph Hallu → random_obj_to_glyph (statue separate)
    if (game.u?.Hallucination && obj?.otyp !== STATUE_OTYP) {
        // random_object: rn2(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT
        const otyp = rn2_on_display_rng(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT;
        // C: if CORPSE → second burn random_monster + body glyph
        if (otyp === CORPSE_OTYP) {
            const mnum = rn2_on_display_rng(NUMMONS);
            const ptr = mons(mnum);
            const ch = MLET_CH[ptr?.mlet] || '%';
            const color = mcolors[mnum] ?? NO_COLOR;
            return { ch, color, dec: false };
        }
        const def = game.objects?.[otyp];
        const oclass = def?.oc_class ?? ILLOBJ_CLASS;
        const ch = DEF_OC_SYM[oclass] || ']';
        return { ch, color: def?.oc_color ?? NO_COLOR, dec: false };
    }
    const def = game.objects?.[obj.otyp];
    const oclass = obj.oclass ?? def?.oc_class ?? ILLOBJ_CLASS;
    // C: STATUE → monster letter (not ROCK_CLASS '`'); color is statue white
    // Hallu statue → random_monster + gender (display.h statue_to_glyph)
    if (obj.otyp === STATUE_OTYP) {
        if (game.u?.Hallucination) {
            const mnum = rn2_on_display_rng(NUMMONS);
            const ptr = mons(mnum);
            const ch = MLET_CH[ptr?.mlet] || '?';
            rn2_on_display_rng(2); // C: gender glyph pick (male/fem offset)
            const color = def?.oc_color ?? CLR_WHITE;
            return { ch, color, dec: false };
        }
        if (obj.corpsenm != null && obj.corpsenm >= 0) {
            const ptr = mons(obj.corpsenm);
            const ch = MLET_CH[ptr?.mlet] || '?';
            const color = def?.oc_color ?? CLR_WHITE;
            return { ch, color, dec: false };
        }
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
// C ref: wintty.h WIN_NOSTOP — urgent message; one-shot, blocks WIN_STOP
let _win_nostop = false;
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
    _win_nostop = false;
    _delay_flushing = false;
    _lastStatus1 = '';
    _lastStatus2 = '';
    _prevmsg = '';
    _dismiss_more = 0;
    _morc = 0;
}

/**
 * C ref: topl.c / wintty — yn_function and getobj leave TOPLINE_NON_EMPTY
 * so parse()'s clear_nhwindow(WIN_MESSAGE) can blank the leftover prompt
 * (critical with !verbose silent drop).
 */
export function mark_topline_prompt(text) {
    const t = text == null ? (game._pending_message || '') : String(text);
    _toplines = t.replace(/\n--More--$/, '').replace(/--More--$/, '');
    _toplin = TOPLINE_NON_EMPTY;
    game._pending_message = t;
}

/**
 * C ref: wintty.c tty_clear_nhwindow(WIN_MESSAGE) — blank topline when
 * toplin != EMPTY. Used by cmd.c parse() after get_count returns.
 * Also clear when only `_pending_message` is set (yn/getobj painted
 * without going through pline's NEED_MORE path).
 */
export function clear_nhwindow_message() {
    if (_toplin === TOPLINE_EMPTY && !(game._pending_message)) return;
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

/**
 * C: gs.symset[].handling == H_DEC after OPTIONS=symset:DECgraphics.
 * Rogue graphics (assign_graphics ROGUESET) replace showsyms with the
 * ASCII rogue set — DEC Primary is not active while currentgraphics is
 * ROGUESET (symbols.c assign_graphics / do.c goto_level).
 */
function use_decgraphics() {
    if ((game.currentgraphics | 0) === ROGUESET) return false;
    return !!game.iflags?.decgraphics;
}

/**
 * C ref: symbols.c assign_graphics — swap showsyms between Primary and
 * Rogue sets. JS keeps DEC/ASCII via use_decgraphics + goldsym; full
 * showsyms table / RogueIBM color sets deferred.
 */
export function assign_graphics(whichset) {
    const set = (whichset | 0) === ROGUESET ? ROGUESET : PRIMARYSET;
    game.currentgraphics = set;
    if (!game.iflags) game.iflags = {};
    if (!game.gs) game.gs = {};
    if (!game.gs.symset) {
        game.gs.symset = [
            { name: null, handling: 0, nocolor: 0 },
            { name: null, handling: 0, nocolor: 0 },
        ];
    }
    if (set === ROGUESET) {
        // C init_rogue_symbols: default Rogue set nocolor=1; gold = GEM_SYM '*'
        // (drawing.c def_r_oc_syms[COIN_CLASS]).
        game.gs.symset[ROGUESET].nocolor = 1;
        game._goldsym = '*';
    } else {
        game._goldsym = '$';
    }
}

/**
 * C ref: botl.c check_gold_symbol — invis_goldsym when gold showsym ≤ ' '.
 */
export function check_gold_symbol() {
    if (!game.iflags) game.iflags = {};
    const goldch = game._goldsym || '$';
    const code = typeof goldch === 'string' ? goldch.charCodeAt(0) : (goldch | 0);
    game.iflags.invis_goldsym = code <= 0x20;
}

/** C reset_glyphmap: Rogue level without RogueIBM color → strip all color. */
function rogue_nocolor_active() {
    return (game.currentgraphics | 0) === ROGUESET
        && (game.gs?.symset?.[ROGUESET]?.nocolor | 0) !== 0;
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
    // reset_glyphmap wall_color(...). Source wallcolors[] default
    // CLR_GRAY; intended table (comment): main GRAY, mines BROWN,
    // gehennom RED, knox GRAY, sokoban BRIGHT_BLUE. Recorder matches
    // mines BROWN (D-0283), Gehennom RED (D-0801), Sokoban blue only
    // under DECgraphics (D-0729).
    let color = CLR_GRAY;
    const uz = game.u?.uz;
    if (In_mines(uz)) color = CLR_BROWN;
    else if (game.dungeons?.[uz?.dnum | 0]?.flags?.hellish) color = CLR_RED;
    else if (In_sokoban(uz) && use_decgraphics()) color = CLR_BLUE;
    return { ch: g.ch, color, dec: g.dec };
}

/**
 * C ref: display.h altar_to_glyph + display.c altarcolors / altar_color.
 * Offset enum: unaligned, chaotic, neutral, lawful, other.
 * No USE_GENERAL_ALTAR_COLORS in this build (aligned → CLR_GRAY).
 */
function altar_glyph_color(loc) {
    const amsk = (loc?.altarmask != null ? loc.altarmask : loc?.flags) | 0;
    let idx = 0; // altar_unaligned
    if ((amsk & AM_SANCTUM) === AM_SANCTUM) idx = 4; // altar_other
    else if ((amsk & AM_MASK) === AM_LAWFUL) idx = 3;
    else if ((amsk & AM_MASK) === AM_NEUTRAL) idx = 2;
    else if ((amsk & AM_MASK) === AM_CHAOTIC) idx = 1;
    const altarcolors = [
        CLR_RED, CLR_GRAY, CLR_GRAY, CLR_GRAY, CLR_BRIGHT_MAGENTA,
    ];
    // C: altar_color(n) → iflags.use_color ? altarcolors[n] : NO_COLOR
    if (game.iflags?.use_color === false) return NO_COLOR;
    return altarcolors[idx];
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
    // C ref: display.c back_to_glyph ALTAR → altar_to_glyph(altarmask);
    // mapglyph altar_color(offset). dat/symbols DECgraphics S_altar \xfb
    // meta-{. Contest build has no USE_GENERAL_ALTAR_COLORS → chaotic/
    // neutral/lawful stay CLR_GRAY (tty → NO_COLOR); unaligned CLR_RED;
    // AM_SANCTUM altar_other CLR_BRIGHT_MAGENTA (D-0666).
    case ALTAR: {
        const color = altar_glyph_color(loc);
        return dec
            ? { ch: '{', color, dec: true }
            : { ch: '_', color, dec: false };
    }
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE:    return { ch: '\\', color: HI_GOLD, dec: false };
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    // C ref: display.c back_to_glyph TREE → S_tree; defsym.h PCHAR '#'/CLR_GREEN;
    // dat/symbols DECgraphics S_tree \xe7 meta-g. Arboreal STONE→tree deferred.
    case TREE:
        return dec
            ? { ch: 'g', color: CLR_GREEN, dec: true }
            : { ch: '#', color: CLR_GREEN, dec: false };
    // C ref: display.c back_to_glyph IRONBARS → S_bars; defsym.h '#'/HI_METAL;
    // dat/symbols DECgraphics S_bars \xfc meta-| (tty SO + '|').
    case IRONBARS:
        return dec
            ? { ch: '|', color: HI_METAL, dec: true }
            : { ch: '#', color: HI_METAL, dec: false };
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
    // C ref: display.c back_to_glyph + defsym.h — S_air ' '/CLR_CYAN; S_cloud '#'/CLR_GRAY.
    case AIR:
        return { ch: ' ', color: CLR_CYAN, dec: false };
    case CLOUD:
        return { ch: '#', color: CLR_GRAY, dec: false };
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

/**
 * C display.c newsym display_monster / sensed / Detect_monsters arms —
 * would this cell be painted as a monster (or mimic object) glyph?
 * Warning-only is display_warning, not glyph_is_monster.
 */
function cell_shows_displayed_monster(mtmp, x, y) {
    if (!mtmp) return false;
    if (game.u?.uswallow) return false;
    if (cansee(x, y) && (mon_visible(mtmp) || tp_sensemon(mtmp))) return true;
    if (tp_sensemon(mtmp) || (mon_visible(mtmp) && see_with_infrared(mtmp))) {
        return true;
    }
    const u = game.u || {};
    return !!(u.Detect_monsters
        || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0));
}

/**
 * C display.c show_glyph — glyph_is_* / glyph_to_cmap inspect the
 * already-chosen glyph id (what_mon / random_obj already ran in newsym).
 * JS has no integer IDs. Classify occupancy + tty without re-calling
 * mon_glyph / obj_glyph (Hallu rn2_on_display_rng; D-1221 / review 181).
 * Named: full cmap_to_glyph / GLYPH_NOTHING vs UNEXPLORED IDs.
 */
function gbuf_show_kind(x, y, ch, color, decgfx, loc) {
    if (ch === 'I' && !decgfx) return 'invisible';
    const mtmp = mon_at_display(x, y);
    if (mtmp && cell_shows_displayed_monster(mtmp, x, y)) {
        // Mimic object: M_AP_TYPE, not a second obj_glyph Hallu roll.
        if (M_AP_TYPE(mtmp) === M_AP_OBJECT && !sensemon(mtmp)) {
            return 'object';
        }
        return 'monster';
    }
    const trap = t_at_display(x, y);
    if (trap && trap.tseen && !covers_traps(x, y)) {
        const tg = trap_glyph(trap);
        if (tg.ch === ch) return 'trap';
    }
    const obj = objects_at(x, y);
    if (obj && !covers_objects(x, y) && cansee(x, y)) {
        // newsym paints map_object before terrain; occupancy is the
        // analogue of glyph_is_object on the already-stored id.
        return 'object';
    }
    const tg = terrain_glyph(loc, x, y);
    if (tg && ch === tg.ch) return 'terrain';
    if (obj && !covers_objects(x, y)) return 'object';
    if ((!ch || ch === ' ') && !decgfx
        && (color == null || color === NO_COLOR)) {
        return 'unexplored';
    }
    return 'other';
}

function gbuf_old_unexplored_or_nothing(loc) {
    const kind = loc.disp_kind;
    if (kind === 'unexplored' || kind === 'nothing') return true;
    return loc.disp_ch == null || loc.disp_ch === '';
}

/** C sym.h is_cmap_furniture — S_upstair..S_fountain via loc.typ. */
function new_cmap_is_furniture(kind, loc) {
    return kind === 'terrain' && IS_FURNITURE(loc.typ);
}

/** C sym.h is_cmap_wall — S_stone..S_trwall. SCORR paints as stone. */
function new_cmap_is_wall(kind, loc) {
    if (kind !== 'terrain') return false;
    const t = loc.typ | 0;
    return t === STONE || t === SCORR || IS_WALL(t);
}

/** C sym.h is_cmap_room — S_room..S_darkroom (ROOM typ, not IS_ROOM). */
function new_cmap_is_room(kind, loc) {
    return kind === 'terrain' && (loc.typ | 0) === ROOM;
}

/**
 * C display.c show_glyph 2011–2028 — local `show_glyph_change`.
 * Default Off. firstmatch / pline is the then-arm in show_glyph_cell.
 */
export function show_glyph_change_wanted(loc, x, y, ch, color = NO_COLOR,
    decgfx = false, attr = 0) {
    if (!loc) return false;
    const a11y = game.a11y;
    if (!a11y?.glyph_updates || (a11y.mon_notices_blocked | 0)) return false;
    const ps = game.program_state || {};
    if (ps.in_docrt || ps.gameover || ps.in_getlev
        || (ps.stopprint | 0) || (ps.done_stopprint | 0)) {
        return false;
    }
    if (suppress_map_output()) return false;
    const storedColor = tty_map_color(color);
    const glyphChanged = loc.disp_ch !== ch
        || loc.disp_color !== storedColor
        || !!loc.disp_decgfx !== !!decgfx
        || (loc.disp_attr | 0) !== (attr | 0);
    if (!glyphChanged && !loc.gnew) return false;
    const kind = gbuf_show_kind(x, y, ch, color, decgfx, loc);
    if (!(gbuf_old_unexplored_or_nothing(loc) || new_cmap_is_furniture(kind, loc))) {
        return false;
    }
    if (new_cmap_is_wall(kind, loc) || new_cmap_is_room(kind, loc)) return false;
    if ((a11y.mon_notices && kind === 'monster')
        || loc.disp_kind === 'monster'
        || u_at(x, y)) {
        return false;
    }
    return true;
}

let _auto_describe_text = null;

/**
 * C display.c show_glyph 2059–2070 — force accessiblemsg, describe, pline_xy.
 * firstmatch via getpos auto_describe_text (D-1217 named full table).
 */
async function emit_show_glyph_change(x, y) {
    if (!game.a11y) {
        game.a11y = { accessiblemsg: false, msg_loc: { x: 0, y: 0 } };
    }
    const tmp = !!game.a11y.accessiblemsg;
    game.a11y.accessiblemsg = true;
    try {
        if (!_auto_describe_text) {
            const m = await import('./getpos.js');
            _auto_describe_text = m.auto_describe_text;
        }
        const firstmatch = _auto_describe_text(x, y) || '';
        await pline_xy(x, y, `${firstmatch}.`);
    } finally {
        game.a11y.accessiblemsg = tmp;
    }
}

// ── show_glyph_cell ──
/**
 * C ref: display.c show_glyph — store gbuf then optional glyph_updates pline.
 * Async only yields when mention_map/glyph_updates fires (default Off).
 * Classifier does not re-roll Hallu (D-1221).
 */
export async function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    // C reset_glyphmap: (GMAP_ROGUELEVEL && !has_rogue_color) → NO_COLOR
    if (rogue_nocolor_active()) {
        color = NO_COLOR;
        decgfx = false;
    }
    const announce = show_glyph_change_wanted(loc, x, y, ch, color, decgfx, attr);
    // C classifies the already-chosen glyph id; stamp JS kind the same way
    // (no mon_glyph / obj_glyph). Always store so later On sees real old kind.
    const kind = gbuf_show_kind(x, y, ch, color, decgfx, loc);
    loc.disp_ch = ch;
    loc.disp_color = tty_map_color(color);
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.disp_kind = kind;
    loc.gnew = 1;
    if (announce) await emit_show_glyph_change(x, y);
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
 * C ref: display.h glyph_is_trap — JS has no integer glyph IDs; match
 * tseen trap_to_glyph / map_trap remembered ch at (x,y).
 */
function glyph_is_trap_at(glyph, x, y) {
    if (!glyph) return false;
    const trap = t_at_display(x, y);
    if (!(trap && trap.tseen && !covers_traps(x, y))) return false;
    const tg = trap_glyph(trap);
    return glyph.ch === tg.ch;
}

/**
 * C ref: detect.c reveal_terrain_getglyph
 * Branch envelope: hero_memory / seenv; strip mon/obj/trap/invisible per
 * TER_* bits; lastseentyp vs typ → back_to_glyph; litcorr→corr hack.
 * Named omissions: visible_region_at / gascloud; keep_traps trap_to_glyph
 * restore when stripping objs; M_AP_FURNITURE lastseentyp fake; swallowed
 * ustuck mon glyph; TER_FULL seenv temp already covered;
 * arboreal default.
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
                // C map_location order: object → trap → engraving → terrain
                if (kind === 'other') {
                    const trap = t_at_display(x, y);
                    if (trap && trap.tseen && !covers_traps(x, y)) {
                        const tg = trap_glyph(trap);
                        const rg = loc.remembered_glyph;
                        if (cansee(x, y) || (rg && rg.ch === tg.ch)) {
                            kind = 'trap';
                            glyph = { ch: tg.ch, color: tg.color, dec: !!tg.dec };
                        }
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
                else if (glyph_is_trap_at(glyph, x, y)) kind = 'trap';
                else kind = 'other';
            } else if (glyph_is_trap_at(glyph, x, y)) {
                kind = 'trap';
            } else {
                kind = 'other';
            }
        }
    }

    // C glyph_is_trap after memory/terrain pick (levl.glyph may be trap)
    if (kind === 'other' && glyph_is_trap_at(glyph, x, y)) {
        kind = 'trap';
    }

    // C: keep_traps && (!keep_objs object | invisible) → trap_to_glyph
    if (((!keep_objs && kind === 'obj') || kind === 'invisible')
        && keep_traps && !covers_traps(x, y)) {
        const t = t_at_display(x, y);
        if (t && t.tseen) {
            const tg = trap_glyph(t);
            glyph = { ch: tg.ch, color: tg.color, dec: !!tg.dec };
            kind = 'trap';
        }
    }

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
    // C: default_sym = arboreal ? S_tree : S_stone — arboreal STONE→tree deferred
    // (TREE typ itself via terrain_glyph D-0565)
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

// C ref: display.c tmp_at — transient missile/beam glyphs.
// Nested alloc polish, DISP_TETHER BACKTRACK, DISP_ALWAYS edge cases deferred.
const TMP_AT_MAX_GLYPHS = COLNO * 2;
const _tgfirst = { saved: [], sidx: 0, style: 0, glyph: null, prev: null };
let _tglyph = null;

/**
 * C ref: display.c zapdir_to_glyph — beam glyph for tmp_at DISP_BEAM.
 * Returns {ch,color,dec} (JS show path); C packs GLYPH_ZAP_OFF + dir|type.
 * Dir: | (0,±1), - (±1,0), \ (dx==dy), / (dx&&dy).
 * DECgraphics: S_vbeam/S_hbeam → meta-x / meta-q (dat/symbols).
 */
export function zapdir_to_glyph(dx0, dy0, beam_type) {
    let bt = beam_type | 0;
    if (bt < 0 || bt >= 8) bt = 0;
    const dx = dx0 | 0;
    const dy = dy0 | 0;
    // C: dx = (dx == dy) ? 2 : (dx && dy) ? 3 : dx ? 1 : 0
    const dir = (dx === dy) ? 2 : (dx && dy) ? 3 : dx ? 1 : 0;
    const useColor = game.iflags?.use_color !== false;
    // C display.c zapcolors[NUM_ZAP] / display.h zap_color_*
    const zapcolors = [
        HI_ZAP, CLR_ORANGE, CLR_WHITE, HI_ZAP,
        CLR_BLACK, CLR_WHITE, CLR_GREEN, CLR_YELLOW,
    ];
    const color = useColor ? (zapcolors[bt] ?? HI_ZAP) : NO_COLOR;
    if (use_decgraphics()) {
        // S_vbeam \xb3→x, S_hbeam \xc4→q; slants stay ASCII
        const dec = [
            { ch: 'x', dec: true },
            { ch: 'q', dec: true },
            { ch: '\\', dec: false },
            { ch: '/', dec: false },
        ][dir];
        return { ch: dec.ch, color, dec: dec.dec };
    }
    const ascii = ['|', '-', '\\', '/'][dir];
    return { ch: ascii, color, dec: false };
}

/**
 * C ref: display.c tmp_at(x, y)
 * Open: tmp_at(DISP_FLASH|DISP_BEAM|…, glyphObj) — glyphObj is {ch,color,dec}.
 * Step: tmp_at(map_x, map_y) — paint; BEAM accumulates, FLASH replaces.
 * Close: tmp_at(DISP_END, 0); DISP_CHANGE updates glyph mid-beam.
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

/** C display.h SHIELD_COUNT — cmap indices in shield_static[]. */
const SHIELD_COUNT = 21;

/**
 * C defsym.h S_ss1..S_ss4 Primary ASCII ('0' '#' '@' '*' / HI_ZAP).
 * Full showsyms / DECgraphics S_ss* remap named (dat/symbols).
 */
const SHIELD_SS1 = { ch: '0', color: HI_ZAP, dec: false };
const SHIELD_SS2 = { ch: '#', color: HI_ZAP, dec: false };
const SHIELD_SS3 = { ch: '@', color: HI_ZAP, dec: false };
const SHIELD_SS4 = { ch: '*', color: HI_ZAP, dec: false };

/**
 * C decl.c shield_static[SHIELD_COUNT] — S_ss1, S_ss2, S_ss3, S_ss2,
 * S_ss1, S_ss2, S_ss4 (7 per row × 3).
 */
const shield_static = [
    SHIELD_SS1, SHIELD_SS2, SHIELD_SS3, SHIELD_SS2, SHIELD_SS1, SHIELD_SS2, SHIELD_SS4,
    SHIELD_SS1, SHIELD_SS2, SHIELD_SS3, SHIELD_SS2, SHIELD_SS1, SHIELD_SS2, SHIELD_SS4,
    SHIELD_SS1, SHIELD_SS2, SHIELD_SS3, SHIELD_SS2, SHIELD_SS1, SHIELD_SS2, SHIELD_SS4,
];

/**
 * C ref: display.c shieldeff — magic shield pyrotechnics at (x, y).
 * flags.sparkle is optlist.h opt_out default On; missing JS field ≡ On.
 * Named omissions: DEC/showsyms S_ss* remap; explode.c inline sparkle
 * loop; shieldeff_mon (mon.c wrapper); other callers still unwired.
 */
export async function shieldeff(x, y) {
    // C: if (!flags.sparkle) return;
    if (game.flags?.sparkle === false) return;
    if (cansee(x, y)) {
        for (let i = 0; i < SHIELD_COUNT; i++) {
            const g = shield_static[i];
            show_glyph_cell(x, y, g.ch, g.color, g.dec);
            await flush_screen(1); /* make sure the glyph shows up */
            await nh_delay_output();
        }
        newsym(x, y); /* restore the old information */
    }
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
    // C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716: no sticky)
    if (u.uroleplay?.blind) return true;
    if (u.ublind) return true; // rare mirror; prefer props below
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
 * C ref: display.c set_seenv — OR seenv bit as if seen from (x0,y0) to (x,y).
 * feel_location uses this before mapping Blind memory.
 */
function set_seenv(lev, x0, y0, x, y) {
    if (!lev) return;
    const sign = (z) => (z < 0 ? -1 : (z !== 0 ? 1 : 0));
    const dx = (x | 0) - (x0 | 0);
    const dy = (y0 | 0) - (y | 0);
    // C display.c seenv_matrix (SVALL at center, unlike vision.js copy)
    const seenv_matrix = [
        [SV2, SV1, SV0],
        [SV3, SVALL, SV7],
        [SV4, SV5, SV6],
    ];
    const bit = seenv_matrix[sign(dy) + 1]?.[sign(dx) + 1];
    if (bit != null) lev.seenv = (lev.seenv | 0) | bit;
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

/**
 * Inline can_reach_floor(FALSE) for feel_location — avoid engrave↔display
 * import cycle (engrave.js imports newsym from display).
 * Named omission: usteed P_RIDING < P_BASIC; ustuck hugs; ceiling hider.
 */
function feel_can_reach_floor() {
    const u = game.u || {};
    if (u.uswallow) return false;
    if (u.Levitation && !(Is_airlevel(u.uz) || Is_waterlevel(u.uz))) {
        return false;
    }
    if (u.Flying) return true;
    return true;
}

/**
 * C ref: display.c suppress_map_output / _suppress_map_output.
 * gi.in_mklev || program_state.saving || program_state.restoring
 * (hangup done_hup still named).
 */
export function suppress_map_output() {
    if (game.in_mklev || game.gi?.in_mklev) return true;
    const ps = game.program_state || {};
    return !!(ps.saving || ps.restoring);
}

/**
 * C ref: display.c feel_location — Blind map update for hero cell or
 * adjacent (boulder-push). Reachable arm: engr_can_be_felt →
 * _map_location(show) → Punished bc_felt → ROOM/CORR dark adjust;
 * sensed mon overlay when !u_at.
 * Named omissions: full levitate-arm boulder/do_room_glyph litcorr
 * polish; MATCH_WARN_OF_MON in sensemon overlay.
 */
export function feel_location(x, y) {
    if (!isok(x, y)) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    // C: keep accurate I memory when mon still present
    if (glyph_is_invisible(loc) && mon_at_display(x, y)) return;

    const u = game.u || {};
    // C: Underwater — only pool/lava/ice (waterlevel exempt)
    if ((u.Underwater | 0) && !Is_waterlevel(u.uz)) {
        const t = loc.typ | 0;
        if (!IS_POOL(t) && t !== LAVAPOOL && t !== LAVAWALL && t !== ICE) {
            return;
        }
    }

    set_seenv(loc, u.ux | 0, u.uy | 0, x, y);

    if (!feel_can_reach_floor()) {
        // Levitate arm (partial) — walls/closed doors via map_background;
        // boulder via map_object; else map_background. Full do_room_glyph
        // / litcorr remembered-boulder arms deferred.
        const typ = loc.typ | 0;
        if (IS_OBSTRUCTED(typ)
            || (IS_DOOR(typ) && (loc.doormask & (D_LOCKED | D_CLOSED)))) {
            map_background(x, y, 1);
        } else {
            const obj = objects_at(x, y);
            if (obj && (obj.otyp | 0) === BOULDER_OTYP) {
                map_object(obj, 1);
            } else {
                map_background(x, y, 1);
            }
        }
    } else {
        // C: engr_can_be_felt → erevealed (ENGRAVE/HEADSTONE/BURN)
        const ep = engr_at(x, y);
        if (ep) {
            const et = ep.engr_type | 0;
            if (et === ENGRAVE || et === HEADSTONE || et === BURN) {
                ep.erevealed = 1;
            }
        }
        map_location(x, y, true);

        // C: Punished bc_felt — only when ball/chain is first on floor pile
        if (u.uball) {
            const uchain = u.uchain;
            const uball = u.uball;
            const top = objects_at(x, y);
            if (uchain && (uchain.where | 0) === OBJ_FLOOR
                && (uchain.ox | 0) === (x | 0) && (uchain.oy | 0) === (y | 0)
                && top === uchain) {
                u.bc_felt = (u.bc_felt | 0) | BC_CHAIN;
            } else {
                u.bc_felt = (u.bc_felt | 0) & ~BC_CHAIN;
            }
            if (uball && (uball.where | 0) === OBJ_FLOOR
                && (uball.ox | 0) === (x | 0) && (uball.oy | 0) === (y | 0)
                && top === uball) {
                u.bc_felt = (u.bc_felt | 0) | BC_BALL;
            } else {
                u.bc_felt = (u.bc_felt | 0) & ~BC_BALL;
            }
        }

        // C: unlit ROOM/CORR memory darken after map_location
        const mem = loc.remembered_glyph;
        const darkRoomColor = game.flags?.dark_room !== false
            && game.iflags?.use_color !== false;
        if (mem && (loc.typ | 0) === ROOM
            && (mem.ch === '~' || mem.ch === '.')
            && (!loc.waslit || darkRoomColor)) {
            // C: S_darkroom / S_stone — JS darkroom paints as S_room
            const dark = {
                ch: mem.ch === '~' ? '~' : '.',
                color: NO_COLOR,
                decgfx: !!mem.decgfx,
            };
            loc.remembered_glyph = dark;
            show_glyph_cell(x, y, dark.ch, dark.color, !!dark.decgfx);
        } else if (mem && (loc.typ | 0) === CORR
            && mem.ch === '#' && mem.color === CLR_WHITE && !loc.waslit) {
            const dark = { ch: '#', color: NO_COLOR, decgfx: false };
            loc.remembered_glyph = dark;
            show_glyph_cell(x, y, dark.ch, dark.color, false);
        }
    }

    // C: sensed monster on top when !u_at
    if ((u.ux | 0) !== (x | 0) || (u.uy | 0) !== (y | 0)) {
        const mon = mon_at_display(x, y);
        if (mon && sensemon(mon)) {
            const mg = mon_glyph(mon);
            show_glyph_cell(x, y, mg.ch, mg.color, false, mon_map_attr(mon));
        }
    }
}

/**
 * C ref: display.c feel_newsym — Blind → feel_location, else newsym.
 */
export function feel_newsym(x, y) {
    if (hero_Blind()) feel_location(x, y);
    else newsym(x, y);
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
        // C: map_object(obj, show) — Hallu statue memory burns extra
        map_object(obj, show);
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

/**
 * C ref: display.c newsym_force — newsym then keep gbuf dirty so the next
 * flush_screen(0) reprints the cell (getpos_sethilite selection path).
 */
export function newsym_force(x, y) {
    newsym(x, y);
    const loc = game.level?.at(x, y);
    if (loc) loc.gnew = 1;
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    // C: only permit updating the hero when swallowed
    if (game.u?.uswallow) {
        if (game.u.ux === x && game.u.uy === y) {
            const hg = hero_display_glyph();
            show_glyph_cell(x, y, hg.ch, hg.color, false);
        }
        return;
    }

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
            feel_location(x, y);
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
        if (mtmp && (mon_visible(mtmp) || tp_sensemon(mtmp))) {
            // C: _map_location(x, y, FALSE) then display_monster — memory
            // keeps object under the monster so leaving sight does not
            // replace ) with remembered corridor.
            // show_mon_or_warn clears invisible memory when showing mon
            // Named omission: MATCH_WARN_OF_MON in see_it; Detect_monsters arm.
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
                        statue: (mtmp.mappearance | 0) === STATUE_OTYP,
                        boulder: (mtmp.mappearance | 0) === BOULDER_OTYP,
                    };
                }
                return;
            }
            const mg = mon_glyph(mtmp);
            show_glyph_cell(x, y, mg.ch, mg.color, false, mon_map_attr(mtmp));
            return;
        }
        // C: else if (mon && mon_warning(mon) && !worm_tail) display_warning
        if (mtmp && mon_warning(mtmp)) {
            display_warning(mtmp);
            return;
        }
        // C: newsym cansee — keep remembered I when !displayable mon
        if (glyph_is_invisible(loc)) {
            map_invisible(x, y);
            return;
        }
        // C ref: display.c _map_location — vobj_at before trap/engraving/bg
        // C: map_object(obj, show) — Hallu statue memory burns extra
        const obj = objects_at(x, y);
        if (obj && !covers_objects(x, y)) {
            map_object(obj, true);
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
    // C order: see_it (tp_sensemon / MATCH_WARN / infrared+visible) then
    // Detect_monsters, then mon_warning, then invisible glyph, else memory.
    // Named omission: MATCH_WARN_OF_MON; worm tails.
    if (mtmp && (tp_sensemon(mtmp)
        || (mon_visible(mtmp) && see_with_infrared(mtmp)))) {
        const mg = mon_glyph(mtmp);
        show_glyph_cell(x, y, mg.ch, mg.color, false, mon_map_attr(mtmp));
        return;
    }
    {
        const u = game.u || {};
        if (mtmp && (u.Detect_monsters
            || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0))) {
            const mg = mon_glyph(mtmp);
            show_glyph_cell(x, y, mg.ch, mg.color, false, mon_map_attr(mtmp));
            return;
        }
    }
    if (mtmp && mon_warning(mtmp)) {
        display_warning(mtmp);
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
/**
 * C ref: display.c swallowed — stomach 3×3 around hero.
 * Hallu: each swallow_to_glyph burns what_mon(display rng).
 * Named omissions: first→cls/bot polish beyond caller; underwater precedence.
 */
let _swallow_lastx = 0;
let _swallow_lasty = 0;

/**
 * C defsym.h S_sw_* Primary ASCII, plus dat/symbols DECgraphics overrides
 * for S_sw_tc/ml/mr/bc only (meta-o / meta-x / meta-x / meta-s). Corners
 * stay '/' '\\' (no DEC remap).
 */
function swallow_sym(part) {
    // Primary (defsym.h): / - \ | | \ - /
    const ascii = {
        tl: { ch: '/', dec: false },
        tc: { ch: '-', dec: false },
        tr: { ch: '\\', dec: false },
        ml: { ch: '|', dec: false },
        mr: { ch: '|', dec: false },
        bl: { ch: '\\', dec: false },
        bc: { ch: '-', dec: false },
        br: { ch: '/', dec: false },
    };
    if (!use_decgraphics()) return ascii[part];
    // DECgraphics: only tc/ml/mr/bc (symbols start: DECgraphics)
    const dec = {
        tl: { ch: '/', dec: false },
        tc: { ch: 'o', dec: true },
        tr: { ch: '\\', dec: false },
        ml: { ch: 'x', dec: true },
        mr: { ch: 'x', dec: true },
        bl: { ch: '\\', dec: false },
        bc: { ch: 's', dec: true },
        br: { ch: '/', dec: false },
    };
    return dec[part];
}

function swallow_cell(x, y, part, swallowerMnum) {
    // C: swallow_to_glyph → what_mon(mnum, rn2_on_display_rng) under Hallu
    let mnum = swallowerMnum;
    if (game.u?.Hallucination) {
        mnum = rn2_on_display_rng(NUMMONS);
    }
    const color = (mnum != null && mnum >= 0)
        ? (mcolors[mnum] ?? CLR_GREEN)
        : CLR_GREEN;
    const g = swallow_sym(part);
    show_glyph_cell(x, y, g.ch, color, g.dec);
}

export function swallowed(first = 0) {
    const u = game.u;
    if (!u?.ux || !u.ustuck) return;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const swallower = u.ustuck.mnum ?? u.ustuck.data?.mndx ?? 0;

    if (first) {
        // C: cls(); bot(); — caller docrt already cls; bot deferred
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (loc) {
                    loc.disp_ch = ' ';
                    loc.disp_color = NO_COLOR;
                    loc.disp_decgfx = false;
                }
            }
        }
    } else if (_swallow_lastx) {
        for (let y = _swallow_lasty - 1; y <= _swallow_lasty + 1; y++) {
            for (let x = _swallow_lastx - 1; x <= _swallow_lastx + 1; x++) {
                if (isok(x, y)) {
                    show_glyph_cell(x, y, ' ', NO_COLOR, false);
                }
            }
        }
    }

    const left_ok = isok(ux - 1, uy);
    const rght_ok = isok(ux + 1, uy);

    if (isok(ux, uy - 1)) {
        if (left_ok) swallow_cell(ux - 1, uy - 1, 'tl', swallower);
        swallow_cell(ux, uy - 1, 'tc', swallower);
        if (rght_ok) swallow_cell(ux + 1, uy - 1, 'tr', swallower);
    }
    if (left_ok) swallow_cell(ux - 1, uy, 'ml', swallower);
    {
        const hg = hero_display_glyph();
        show_glyph_cell(ux, uy, hg.ch, hg.color, false);
    }
    if (rght_ok) swallow_cell(ux + 1, uy, 'mr', swallower);
    if (isok(ux, uy + 1)) {
        if (left_ok) swallow_cell(ux - 1, uy + 1, 'bl', swallower);
        swallow_cell(ux, uy + 1, 'bc', swallower);
        if (rght_ok) swallow_cell(ux + 1, uy + 1, 'br', swallower);
    }
    _swallow_lastx = ux;
    _swallow_lasty = uy;
}

/**
 * C ref: display.c see_monsters — refresh every live mon cell (+ hero).
 * Clears stale Warning float glyphs when mon_warning no longer applies
 * (e.g. after teleds moves the hero out of range).
 * Named omissions: worm see_wsegs; Warn_of_mon / Sting_effects;
 * defer_see_monsters; MON_STILL_ARRIVING skip.
 */
export function see_monsters() {
    if (game.defer_see_monsters) return;
    const u = game.u;
    if (u?.usteed) u.usteed.meverseen = 1;
    if (u?.ustuck) u.ustuck.meverseen = 1;
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp != null && mon.mhp <= 0)) continue;
        if (!mon.mx) continue;
        newsym(mon.mx, mon.my);
    }
    if (!u?.usteed && u?.ux) newsym(u.ux, u.uy);
}

/**
 * C ref: display.c see_objects — newsym each floor-top object (+ update_inventory).
 * Hallu path burns display RNG via obj_to_glyph / mon_to_glyph in newsym.
 */
export function see_objects() {
    for (let obj = game.fobj; obj; obj = obj.nobj) {
        const top = objects_at(obj.ox | 0, obj.oy | 0);
        if (top === obj) newsym(obj.ox | 0, obj.oy | 0);
    }
    // update_inventory deferred (no glyph invent UI)
}

/**
 * C ref: display.c see_traps — newsym only when gbuf glyph_is_trap.
 * Under Hallu, mon/obj already redrawn by see_monsters/see_objects; C skips
 * those cells so we must not re-newsym them (extra mon_to_glyph burns).
 */
export function see_traps() {
    const seen = new Set();
    function maybe_redraw(trap) {
        if (!trap?.tseen) return;
        const x = trap.tx | 0;
        const y = trap.ty | 0;
        const key = `${x},${y}`;
        if (seen.has(key)) return;
        seen.add(key);
        const loc = game.level?.at(x, y);
        if (!loc) return;
        const tg = trap_glyph(trap);
        // C: if (glyph_is_trap(_glyph_at(tx,ty))) newsym(...)
        if (loc.disp_ch !== tg.ch) return;
        newsym(x, y);
    }
    const traps = game.level?.traps;
    if (Array.isArray(traps)) {
        for (const trap of traps) maybe_redraw(trap);
    }
    for (let trap = game.ftrap; trap; trap = trap.ntrap) maybe_redraw(trap);
}

/**
 * C ref: display.c docrt — paint hero memory (lev->glyph) without live
 * mon_to_glyph / obj_to_glyph. Using newsym here under Hallu would burn
 * display RNG for sensed monsters while cansee is false (D-0838).
 */
function show_memory_glyph(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const mem = loc.remembered_glyph;
    if (mem) {
        const floorObj = objects_at(x, y);
        const livePile = !!(floorObj && !covers_objects(x, y)
            && obj_is_piletop(floorObj));
        const attr = (livePile || mem.objpile)
            ? obj_map_attr(floorObj, !livePile)
            : 0;
        show_glyph_cell(x, y, mem.ch, mem.color, !!mem.decgfx, attr);
    } else {
        show_glyph_cell(x, y, ' ', NO_COLOR, false);
    }
}

export async function docrt() {
    if (!game.u?.ux || !game.level) return;
    if (!game.program_state) game.program_state = {};
    // C display.c docrt_flags 1717–1720 / 1772 — in_docrt skips nested
    // redraw and gates show_glyph_change (D-1219).
    if (game.program_state.in_docrt) return;
    game.program_state.in_docrt = true;
    try {
        // C docrt_flags: if uswallow → swallowed(1); skip map vision path
        if (game.u.uswallow) {
            await cls();
            swallowed(1);
            return;
        }
        // C vision_recalc(2) update loop newsyms prior sight while !cansee
        // (Hallu mon_warning → rn2(5)). JS vision_recalc(2) skips that loop
        // (D-0583 getbones/getpos paint). Under Hallu, burn-only newsyms on
        // live viz before cls (D-0852). Non-Hallu skipped — incomplete
        // !cansee memory/waslit arms regress PASS screens (#992 cohort).
        {
            const u = game.u || {};
            if (u.Hallucination
                || ((u.HHallucination | 0) && !(u.Halluc_resistance | 0))) {
                vision_off_newsym_gbuf({ useLiveViz: true });
            }
        }
        vision_recalc(2);
        await cls();
        // C: show_glyph(x,y, lev->glyph) for all cells (memory; no Hallu RNG)
        for (let y = 0; y < ROWNO; y++)
            for (let x = 1; x < COLNO; x++)
                show_memory_glyph(x, y);
        // C: vision_recalc(0) — see what is to be seen (+ newsym updates)
        vision_recalc(0);
        // C docrt also see_monsters() after vision — floating warns / sensed mons
        see_monsters();
        // Named omission: underwater/buried;
        // docrt_flags maponly/redrawonly/nocls; disp.botlx + update_inventory.
    } finally {
        game.program_state.in_docrt = false;
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

/**
 * C ref: botl.c do_statusline1 Upolyd title — pmname with word caps.
 * @param {number} mndx
 * @param {number} gender MALE|FEMALE
 */
function _polyd_rank_title(mndx, gender) {
    const names = pmnames[mndx | 0];
    let mbot = 'monster';
    if (names) {
        // C do_name.c pmname — fall back to NEUTRAL when sexed slot empty
        let g = gender | 0;
        if (g < MALE || g >= 3 || !names[g]) g = 2; // NEUTRAL
        mbot = names[g] || names[2] || names[MALE] || names[FEMALE] || mbot;
    }
    // C: capitalize each word when poly'd
    let out = '';
    for (let k = 0; k < mbot.length; k++) {
        const ch = mbot[k];
        if ((k === 0 || mbot[k - 1] === ' ')
            && ch >= 'a' && ch <= 'z') {
            out += String.fromCharCode(ch.charCodeAt(0) - 32);
        } else {
            out += ch;
        }
    }
    return out;
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
    // C: Upolyd → pmname(umonnum, Ugender); else rank()
    // Ugender ≡ (Upolyd ? u.mfemale : flags.female)
    let roleTitle;
    if (Upolyd(u)) {
        const g = u.mfemale ? FEMALE : MALE;
        roleTitle = _polyd_rank_title(u.umonnum | 0, g);
    } else {
        roleTitle = rank_of(
            u.ulevel | 0,
            game.urole?.mnum,
            !!(game.flags?.female),
        );
    }
    const title = `${name} the ${roleTitle}`;
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

// C ref: eat.c hu_stat[] — trailing spaces preserved for botl %s (D-0500).
const HU_STAT = [
    'Satiated', '        ', 'Hungry  ', 'Weak    ',
    'Fainting', 'Fainted ', 'Starved ',
];

/**
 * C ref: dungeon.c endgamelevelname — Astral / Elemental plane names.
 * Used by botl describe_level and insight background_enlightenment.
 */
export function endgamelevelname(indx) {
    switch (indx | 0) {
    case -5: return 'Astral Plane';
    case -4: return 'Plane of Water';
    case -3: return 'Plane of Fire';
    case -2: return 'Plane of Air';
    case -1: return 'Plane of Earth';
    default: return `unknown plane #${indx | 0}`;
    }
}

/**
 * C ref: botl.c describe_level — Knox dname / quest "Home %d" /
 * endgame plane / else "Dlvl:%d"|"Tutorial:%d" via depth (not dunlev).
 * dflgs&1 trailing space; dflgs&2 branch name (livelog). Returns text;
 * C int ret (0=ordinary Dlvl) unused by botl caller.
 * Named omissions: livelog addbranch consumers; %-2d gold-field pad
 * already matched by single trailing space + `$:` join (seed screens).
 */
export function describe_level(dflgs = 1) {
    let addspace = (dflgs & 1) !== 0;
    let addbranch = (dflgs & 2) !== 0;
    const uz = game.u?.uz;
    let buf = '';

    if (Is_knox_level(uz)) {
        buf = game.dungeons?.[uz.dnum | 0]?.dname || '';
        addbranch = false;
    } else if (In_quest(uz)) {
        // C: Sprintf(buf, "Home %d", dunlev(&u.uz));
        buf = `Home ${uz?.dlevel | 0}`;
    } else if (In_endgame(uz)) {
        buf = endgamelevelname(depth(uz));
        // C: !addbranch → strsubst(buf, "Plane of ", "");
        if (!addbranch) buf = buf.replace('Plane of ', '');
        addbranch = false;
    } else if (!addbranch) {
        const tag = In_tutorial(uz) ? 'Tutorial' : 'Dlvl';
        buf = `${tag}:${depth(uz) || 1}`;
    } else {
        buf = `level ${depth(uz) || 1}`;
    }
    if (addbranch) {
        let dname = game.dungeons?.[uz?.dnum | 0]?.dname || '';
        if (dname.startsWith('The ')) dname = `the ${dname.slice(4)}`;
        buf += `, ${dname}`;
    }
    if (addspace) buf += ' ';
    return buf;
}

// C ref: botl.c do_statusline2 — describe_level(dloc,1) then `$:` gold;
// Upolyd → mh/mhmax + HD:mlevel (no Xp); else Xp:/T: via showexp/time;
// hunger then enc_stat then Blind…Conf…Hallu…Lev/Fly then Ride.
// Named omissions: Stone/Slime/Strngl/Sick (before hunger);
// Halluc_resistance; AC %-2d pad polish.
function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    const flags = game.flags || {};
    const polyd = Upolyd(u);
    // C botl.c: Upolyd ? mh/mhmax : uhp/uhpmax; hp < 0 → 0
    let hp = polyd ? (u.mh | 0) : (u.uhp | 0);
    if (hp < 0) hp = 0;
    if (hp > 9999) hp = 9999;
    let hpmax = polyd ? (u.mhmax | 0) : (u.uhpmax | 0);
    if (hpmax > 9999) hpmax = 9999;
    // C: describe_level(dloc, 1) includes trailing space; gold via
    // showsyms[COIN_CLASS] (Rogue set → '*', else '$'; invis → '$').
    const goldch = game.iflags?.invis_goldsym ? '$' : (game._goldsym || '$');
    let s = `${describe_level(1)}${goldch}:${game._goldCount || 0} HP:${hp}(${hpmax}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10}`;
    if (polyd) {
        const mdat = mons(u.umonnum | 0);
        s += ` HD:${mdat?.mlevel | 0}`;
    } else {
        s += ` Xp:${u.ulevel || 1}`;
        if (flags.showexp) s += `/${u.uexp || 0}`;
    }
    if (flags.time) s += ` T:${game.moves || 1}`;
    // C do_statusline2: u.uhs != NOT_HUNGRY → hu_stat before enc_stat
    const uhs = u.uhs ?? NOT_HUNGRY;
    if (uhs !== NOT_HUNGRY) {
        s += ` ${HU_STAT[uhs] || ''}`;
    }
    // C do_statusline2: enc_stat then Blind/Deaf/Stun/Conf/Hallu/Lev/Fly/Ride
    // (Stone/Slime/Strngl/Sick before hunger deferred)
    const cap = near_capacity();
    if (cap > UNENCUMBERED) {
        s += ` ${ENC_STAT[cap] || ''}`;
    }
    // C youprop.h Blind / Deaf / Stunned / Confusion / Hallucination
    if (hero_Blind()) s += ' Blind';
    if ((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf) {
        s += ' Deaf';
    }
    if ((u.HStun | 0) || u.Stunned) s += ' Stun';
    // C: Confusion ≡ HConfusion
    if ((u.HConfusion | 0) || u.Confusion) s += ' Conf';
    if ((u.HHallucination | 0) || u.Hallucination) s += ' Hallu';
    // C: Levitation / Flying mutually exclusive via props; Ride is not
    if (u.Levitation
        || (((u.HLevitation | 0) || (u.ELevitation | 0))
            && !(u.BLevitation | 0))) {
        s += ' Lev';
    }
    if (u.Flying
        || (((u.HFlying | 0) || (u.EFlying | 0)) && !(u.BFlying | 0))) {
        s += ' Fly';
    }
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
 * spaces that carry attrs (inverse/underline/bold) are emitted so decode
 * preserves them. Frozen Terminal.serialize() cursor-forwards past all
 * leading spaces and drops those attrs (D-0129 spell heading; D-0932
 * topten_print_bold leading pads).
 *
 * D-0293: S_altar stays raw `{` in the grid (frozen DEC_MAP omits it) so
 * decodeScreen matches C whether the recorder emitted SO+`{` or bare `{`.
 *
 * Frozen Terminal clear/init paints blanks as CLR_GRAY; C tty (ANSI_DEFAULT /
 * empty gray hilite) records those as default fg (NO_COLOR). Local
 * `diffCell` forgives glyphless space color; the judge does not.
 * D-0480 also remapped glyph colors via tty_map_color and correlated with
 * judge 23→22 (D-0483). D-0930: only coerce space+attr0+CLR_GRAY → NO_COLOR
 * (Hoimar-shaped); do not remap glyphs. D-0931: paint S_air spaces in the
 * flush grid, and mid-row space runs >4 → CSI CUF (contest tty capture).
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
        // Start at first non-space OR space with attr (inv/bold/uline).
        // Bold is invisible on blanks but contest tty still records it
        // (topten_print_bold `\x1b[1m  1…`; D-0932). Inv/uline: D-0129.
        let firstCol = 0;
        for (let c = 0; c <= lastCol; c++) {
            const cell = term.grid[r][c];
            if (cell.ch !== ' ' || (cell.attr & 0x7)) {
                firstCol = c;
                break;
            }
        }
        if (firstCol > 4) out += `\x1b[${firstCol}C`;
        else if (firstCol > 0) out += ' '.repeat(firstCol);
        // Scoring color for a cell: glyphless CLR_GRAY blanks → NO_COLOR
        // (D-0930). Inv/uline spaces keep their color (D-0129).
        const cellEmitColor = (cell) => {
            const a = cell.attr | 0;
            if (cell.ch === ' ' && !(a & 0x5) && cell.color === CLR_GRAY)
                return NO_COLOR;
            return cell.color;
        };
        for (let c = firstCol; c <= lastCol; ) {
            const cell = term.grid[r][c];
            const wantAttr = cell.attr | 0;
            // Contest tty capture: mid-row runs of >4 spaces (no inv/uline)
            // become CSI CUF after the run's SGR — even for S_air CLR_CYAN
            // (seed0373 `\x1b[36m\x1b[5C`). Decode leaves those cells as
            // default blanks; emitting the spaces fails strict SGR (D-0931).
            if (cell.ch === ' ' && !(wantAttr & 0x5)) {
                const runColor = cellEmitColor(cell);
                let end = c;
                while (end + 1 <= lastCol) {
                    const n = term.grid[r][end + 1];
                    const na = n.attr | 0;
                    if (n.ch !== ' ' || (na & 0x5)) break;
                    if (cellEmitColor(n) !== runColor || na !== wantAttr) break;
                    end++;
                }
                const runLen = end - c + 1;
                if (runLen > 4) {
                    const wantFg = colorToFg(runColor);
                    out += sgrTransition(curFg, curAttr, wantFg, wantAttr);
                    curFg = wantFg;
                    curAttr = wantAttr;
                    out += `\x1b[${runLen}C`;
                    c = end + 1;
                    continue;
                }
            }
            const emitColor = cellEmitColor(cell);
            const wantFg = colorToFg(emitColor);
            out += sgrTransition(curFg, curAttr, wantFg, wantAttr);
            curFg = wantFg;
            curAttr = wantAttr;
            out += cell.ch;
            c++;
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
        // (walls/doors/a/~). Leave SO-form letters that renderCell keeps raw:
        // S_altar '{', S_pool/lava/water '`', S_tree 'g', S_bars '|',
        // S_sw_tc 'o', S_sw_bc 's'.
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                // C flush_screen / print_glyph paints every gbuf cell, including
                // S_air (' '+CLR_CYAN). Skipping disp_ch===' ' left clearScreen
                // CLR_GRAY blanks → serialize NO_COLOR (D-0931 / seed0373).
                // Unexplored cells never get show_glyph_cell → disp_ch stays
                // unset; leave those as clearScreen blanks.
                if (loc?.disp_ch == null || loc.disp_ch === '') {
                    if (loc) loc.gnew = 0;
                    continue;
                }
                let ch = loc.disp_ch;
                if (loc.disp_decgfx) {
                    const uni = DEC_TO_UNICODE[ch];
                    // DEC_MAP: walls/doors/a/~ only. Keep raw chars that
                    // renderCell leaves unchanged so scoring matches C's
                    // SO+letter form: '{','`','g','|' plus swallow S_sw_tc/bc
                    // 'o'/'s' (dat/symbols DECgraphics; D-0842/D-0843).
                    if (uni && ch !== '{' && ch !== '`' && ch !== 'g'
                        && ch !== '|' && ch !== 'o' && ch !== 's')
                        ch = uni;
                }
                const sr = y + 1;
                // Don't clobber --More-- on row 1
                if (sr === 1 && msgLines.length > 1) continue;
                display.setCell(x - 1, sr, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
                // C flush_screen clears gnew after print_glyph
                loc.gnew = 0;
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
        // Cursor: prompts that actively await input set cursor via their
        // callers (yn_function / more / Count). Leftover getobj text on
        // the topline after a silent (!verbose) action must NOT steal the
        // cursor — C leaves gt.toplines but parse() positions on the hero.
        if (msg.startsWith('Count:')) {
            display.setCursor(msg.length, 0);
        } else if (msg.endsWith('--More--') && !msg.includes('\n')) {
            display.setCursor(msg.length, 0);
        } else if (msg.includes('\n--More--')) {
            display.setCursor(8, 1);
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

/**
 * C mid-goto_level: gbuf still holds prior map while level is detached;
 * refresh message + status only (do not clearScreen blank the map).
 */
function _paintToplineAndStatus() {
    _paintToplineOnly();
    const display = game?.nhDisplay;
    if (!display?.grid || !display.setCell || _statusSuppressed) return;
    const cols = display.cols || 80;
    const s1 = _lastStatus1 || '';
    const s2 = _lastStatus2 || '';
    const strip = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, (m) =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
    const line1 = strip(s1);
    for (let c = 0; c < cols; c++) display.setCell(c, 22, ' ', NO_COLOR, 0);
    for (let c = 0; c < cols; c++) display.setCell(c, 23, ' ', NO_COLOR, 0);
    for (let c = 0; c < Math.min(line1.length, cols); c++)
        display.setCell(c, 22, line1[c], NO_COLOR, 0);
    for (let c = 0; c < Math.min(s2.length, cols); c++)
        display.setCell(c, 23, s2[c], NO_COLOR, 0);
}

/**
 * C: show_glyph updates persistent gbuf; flush_screen prints dirty spans.
 * After vision_recalc(2) leave-level newsyms, Get bones? yn flushes that
 * gbuf before flush_screen(-1) postpone. JS stores gbuf in loc.disp_* on
 * the stashed leave-level — paint only gnew cells to the Terminal.
 * @returns {{ x: number, y: number } | null} last map cell painted, or null
 */
export function paint_gbuf_level_to_terminal(level) {
    const display = game?.nhDisplay;
    if (!display?.setCell || !level?.at) return null;
    let last = null;
    for (let y = 0; y < ROWNO; y++) {
        const sr = y + 1;
        for (let x = 1; x < COLNO; x++) {
            const loc = level.at(x, y);
            if (!loc?.gnew) continue;
            let ch = loc.disp_ch ?? ' ';
            const color = loc.disp_color ?? NO_COLOR;
            const attr = loc.disp_attr ?? 0;
            if (loc.disp_decgfx && ch && ch !== ' ') {
                const uni = DEC_TO_UNICODE[ch];
                if (uni && ch !== '{' && ch !== '`' && ch !== 'g'
                    && ch !== '|' && ch !== 'o' && ch !== 's')
                    ch = uni;
            }
            display.setCell(x - 1, sr, ch || ' ', color, attr);
            loc.gnew = 0;
            last = { x, y };
        }
    }
    return last;
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
    // C display.c flush_screen: bot() else timebot() before map glyphs
    if (flags.botl || flags.botlx) await bot();
    else if (flags.time_botl) await timebot();
    // Mid goto_level / getbones: keep stale map cells like C gbuf.
    if (!game.level || game._stale_map_flush) {
        _paintToplineAndStatus();
        return;
    }
    _buildScreenOutput();
}

/**
 * C ref: display.c flush_screen(0) after getpos curs() — reprint dirty
 * gbuf cells and leave the tty cursor on the last glyph printed (do not
 * curs(hero)). Full flush_screen(0) elsewhere still does a full rebuild;
 * getpos needs this narrow path so the first targeting frame matches C.
 */
export function flush_screen_getpos_dirty() {
    if (game._menu_overlay) return;
    if (_delay_flushing) {
        _paintToplineOnly();
        return;
    }
    if (!game.level || game._stale_map_flush) {
        _paintToplineAndStatus();
        return;
    }
    const display = game?.nhDisplay;
    // Caller (getpos) already curs()'d; _paintToplineOnly would steal the
    // cursor onto the message line — remember and restore when no dirty glyphs.
    const prevCol = display?.cursorCol;
    const prevRow = display?.cursorRow;
    _paintToplineOnly();
    const last = paint_gbuf_level_to_terminal(game.level);
    if (last && display?.setCursor) {
        // C print_glyph → tty_curs(x,y) with --x then putchar advances
        // curx by 1, so the tty cursor sits in column map_x (not map_x-1).
        display.setCursor(last.x, last.y + 1);
    } else if (display?.setCursor && prevCol != null && prevRow != null) {
        display.setCursor(prevCol, prevRow);
    }
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
            loc.disp_kind = 'unexplored';
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

/**
 * C ref: botl.c timebot — status update when only svm.moves changed.
 * VIA_WINDOWPORT → stat_update_time deferred; tty path → full bot().
 * Named omissions: gb.bot_disabled; hangup done_hup in suppress_map_output.
 */
export async function timebot() {
    const flags = game.flags || {};
    const iflags = game.iflags || {};
    // C: status_updates defaults TRUE; treat undefined as enabled
    if (flags.time && iflags.status_updates !== false) {
        await bot();
    } else if (game.flags) {
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
        if (c === 27) { // ESC → WIN_STOP unless WIN_NOSTOP (urgent)
            if (!_win_nostop) _win_stop = true;
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

/**
 * C ref: getpos.c dxdy_to_dist_descr — "here" / unit directionname /
 * counted n,s,w,e (comma when both). fulldir → north vs n.
 */
export function dxdy_to_dist_descr(dx, dy, fulldir) {
    dx = dx | 0;
    dy = dy | 0;
    if (!dx && !dy) return 'here';
    const dst = xytodir(dx, dy);
    if (dst !== -1) return directionname(dst);
    const dirnames = [
        ['n', 'north'],
        ['s', 'south'],
        ['w', 'west'],
        ['e', 'east'],
    ];
    const word = fulldir ? 1 : 0;
    const sgn = (n) => (n < 0 ? -1 : 1);
    let buf = '';
    if (dy) {
        if (Math.abs(dy) > 9999) dy = sgn(dy) * 9999;
        buf += `${Math.abs(dy)}${dirnames[dy > 0 ? 1 : 0][word]}${dx ? ',' : ''}`;
    }
    if (dx) {
        if (Math.abs(dx) > 9999) dx = sgn(dx) * 9999;
        buf += `${Math.abs(dx)}${dirnames[2 + (dx > 0 ? 1 : 0)][word]}`;
    }
    return buf;
}

/**
 * C ref: getpos.c coord_desc — MAP `<%d,%d>`; SCREEN `[y+2,x]` zero-pad;
 * COMPASS/COMFULL `(dxdy_to_dist_descr)`. Empty for unknown cmode.
 */
export function coord_desc(x, y, cmode) {
    x = x | 0;
    y = y | 0;
    switch (cmode) {
    case GPCOORDS_COMFULL:
    case GPCOORDS_COMPASS: {
        const u = game.u || {};
        const dx = x - (u.ux | 0);
        const dy = y - (u.uy | 0);
        return `(${dxdy_to_dist_descr(dx, dy, cmode === GPCOORDS_COMFULL)})`;
    }
    case GPCOORDS_MAP:
        return `<${x},${y}>`;
    case GPCOORDS_SCREEN: {
        const yw = (ROWNO - 1 + 2 < 100) ? 2 : 3;
        const xw = (COLNO - 1 < 100) ? 2 : 3;
        return `[${String(y + 2).padStart(yw, '0')},${String(x).padStart(xw, '0')}]`;
    }
    default:
        return '';
    }
}

/**
 * C pline.c set_msg_xy 93–97 — store a11y.msg_loc for the next vpline.
 * Consume is D-1207; pline_xy/pline_mon writers are D-1215.
 * set_msg_dir / pline_dir are D-1216. Live: rolling-boulder LANDMINE
 * KAABLAMM then pline (D-1256; not pline_xy).
 */
export function set_msg_xy(x, y) {
    if (!game.a11y) {
        game.a11y = { accessiblemsg: false, msg_loc: { x: 0, y: 0 } };
    }
    if (!game.a11y.msg_loc) game.a11y.msg_loc = { x: 0, y: 0 };
    game.a11y.msg_loc.x = x | 0;
    game.a11y.msg_loc.y = y | 0;
}

/**
 * C pline.c set_msg_dir 82–89 — dirtocoord then += u.ux/u.uy.
 * Invalid dir (DIR_ERR / >= N_DIRS_Z) leaves loc unchanged then still
 * adds hero (C: dirtocoord no-op, then +=). Up/down xdir/ydir are 0,0
 * so loc becomes the hero cell (isok prefixes "here").
 */
export function set_msg_dir(dir) {
    if (!game.a11y) {
        game.a11y = { accessiblemsg: false, msg_loc: { x: 0, y: 0 } };
    }
    if (!game.a11y.msg_loc) game.a11y.msg_loc = { x: 0, y: 0 };
    dirtocoord(game.a11y.msg_loc, dir);
    const u = game.u || {};
    game.a11y.msg_loc.x = ((game.a11y.msg_loc.x | 0) + (u.ux | 0)) | 0;
    game.a11y.msg_loc.y = ((game.a11y.msg_loc.y | 0) + (u.uy | 0)) | 0;
}

/**
 * C pline.c pline_xy 126–135 — set_msg_xy then vpline.
 * Live dest: msg_mon_movement after place (D-1228); rolling-boulder
 * TELEP/LEVEL_TELEP in launch_obj (D-1237).
 */
export async function pline_xy(x, y, msg) {
    set_msg_xy(x, y);
    await pline(msg);
}

/**
 * C pline.c pline_mon 137–150 — &youmonst → (0,0) (not hero ux,uy);
 * else mx,my; then vpline. isok rejects x=0 so youmonst never prefixes.
 * Live callers: wield/zap/drop/pickup/mb_trapped (D-1215) + monmove
 * monflee/itsstuck/maybe_spin_web/postmov door (D-1227) + mind_blast
 * concentrates (D-1238) + uhitm light_hits_gremlin cry/recoil, mhitm_ad_legs
 * nuzzle, mhitm_ad_sedu brag (D-1240). flash_hits_mon awaken/blind stay pline.
 * Named omit: remaining unported uhitm mhitm_ad_* (rust/fire/hugs/heal/wrap/…) /
 * worn/trap/weapon drop·tether / muse drinks / iron bars /
 * mhitu hitmsg. bee_eat_jelly eat + grow_up queen is D-1246.
 * mon_yells is D-1248.
 * Rolling-boulder TELEP is pline_xy (D-1237).
 * Do not wrap msg_mon_movement as pline_mon (D-1228).
 */
export async function pline_mon(mtmp, msg) {
    if (mtmp === game.youmonst) {
        set_msg_xy(0, 0);
    } else {
        set_msg_xy(mtmp.mx, mtmp.my);
    }
    await pline(msg);
}

/**
 * C pline.c pline_dir 113–123 — set_msg_dir then vpline.
 * Live: mention_walls "It's %s."; dobuzz "%s hits you!" via
 * xytodir(-dx,-dy); run>=2 boulder "A boulder blocks your path."
 * (D-1226).
 */
export async function pline_dir(dir, msg) {
    set_msg_dir(dir);
    await pline(msg);
}

/**
 * C pline.c vpline 162–189 — snapshot a11y.msg_loc then always reset to
 * 0,0 (even empty / Norep-suppressed / accessiblemsg Off). If
 * accessiblemsg && isok(saved), prefix `coord_desc: ` (NONE→COMFULL).
 * D-1207. Writers: pline_xy/pline_mon D-1215; set_msg_dir/pline_dir
 * D-1216. Option addr `&a11y.accessiblemsg` is D-1218. `show_glyph`
 * glyph_updates pline_xy is D-1219.
 */
function vpline_consume_msg_loc(msg) {
    if (!game.a11y) {
        game.a11y = { accessiblemsg: false, msg_loc: { x: 0, y: 0 } };
    }
    if (!game.a11y.msg_loc) game.a11y.msg_loc = { x: 0, y: 0 };
    const loc = game.a11y.msg_loc;
    const mx = loc.x | 0;
    const my = loc.y | 0;
    loc.x = 0;
    loc.y = 0;
    if (msg == null || msg === '') return msg;
    if (game.a11y.accessiblemsg && isok(mx, my)) {
        const gpc = game.iflags?.getpos_coords;
        const cmode = (gpc == null || gpc === GPCOORDS_NONE)
            ? GPCOORDS_COMFULL
            : gpc;
        return `${coord_desc(mx, my, cmode)}: ${msg}`;
    }
    return msg;
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
 * Consume msg_loc before the repeat check (C vpline always does).
 * Msgtype-pattern table deferred.
 */
export async function Norep(msg) {
    msg = vpline_consume_msg_loc(msg);
    if (msg == null || msg === '') return;
    if (_prevmsg === String(msg)) return;
    await pline_after_consume(msg);
}

// ── pline ──
// C ref: pline.c vpline — flush_screen before putmesg; topl.c update_topl.
export async function pline(msg) {
    msg = vpline_consume_msg_loc(msg);
    if (msg == null || msg === '') return;
    await pline_after_consume(msg);
}

async function pline_after_consume(msg) {
    const CO = game?.nhDisplay?.cols || 80;
    // C pline.c vpline: vision_recalc before flush when dirty (boulder
    // extract / door / light sets vision_full_recalc mid-turn).
    if (game.vision_full_recalc) {
        vision_recalc(0);
    }
    // C: if (u.ux) flush_screen(...) before putmesg — botl update first
    if (game.u?.ux) await flush_screen(1);

    // Capture skip before more(); C still paints the new line with the
    // pre-more skip flag even if ESC sets WIN_STOP during more().
    // C: skip = (WIN_STOP | WIN_NOSTOP) == WIN_STOP
    // C update_topl: `notdied` starts TRUE; only assigned inside the
    // short-circuiting append predicate. "You die" clears WIN_STOP iff
    // that assignment ran (room check passed). Under WIN_STOP + no room,
    // notdied stays 1 → WIN_STOP kept → yn skips more() (D-0928 #1133).
    let skip = _win_stop && !_win_nostop;
    let notdied = 1;
    const line = String(msg);

    const n0 = line.length;
    // C: (NEED_MORE || skip) && cury==0 && room && (notdied=strncmp)!=0
    if ((_toplin === TOPLINE_NEED_MORE || skip)
        && n0 + _toplines.length + 3 < CO - 8
        && ((notdied = line.startsWith('You die') ? 0 : 1) !== 0)) {
        _toplines = _toplines ? `${_toplines}  ${line}` : line;
        if (!skip) game._pending_message = _toplines;
        // C: gp.prevmsg = line (new text only, not the concatenated topline)
        _prevmsg = line;
        return;
    }
    if (!skip && _toplin === TOPLINE_NEED_MORE) {
        await more();
    }

    // C ref: topl.c update_topl — replace spaces with `\n` while n0 >= CO
    let formatted = line;
    {
        let wrapN0 = formatted.length;
        let tl = 0;
        while (wrapN0 >= CO) {
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
            wrapN0 = formatted.length - tl;
        }
    }

    _toplines = formatted;
    // C: strncpy(gp.prevmsg, line, BUFSZ) after putmesg
    _prevmsg = line;
    // C: if (!notdied) cw->flags &= ~WIN_STOP, skip = FALSE;
    if (!notdied) {
        _win_stop = false;
        skip = false;
    }
    if (!skip) {
        game._pending_message = formatted;
        _toplin = TOPLINE_NEED_MORE;
        // C ref: topl.c redotoplin — more() when message wrapped (cury > 0)
        if (formatted.includes('\n')) {
            await more();
        }
    }
}

/**
 * C ref: pline.c urgent_pline — URGENT_MESSAGE / WIN_NOSTOP so ESC'd
 * --More-- (WIN_STOP) cannot suppress this line; clears STOP first.
 */
export async function urgent_pline(msg) {
    if (msg == null || msg === '') return;
    // C tty_putstr ATR_URGENT: if WIN_STOP, clear_nhwindow + clear STOP
    if (_win_stop) {
        _win_stop = false;
        _toplines = '';
        _toplin = TOPLINE_EMPTY;
        game._pending_message = '';
    }
    _win_nostop = true;
    try {
        await pline(msg);
    } finally {
        // C: NOSTOP is one-shot after putstr returns
        _win_nostop = false;
    }
}

/**
 * C ref: pline.c impossible — urgent bug pline, then disorder / report.
 * Envelope: in_impossible guard; URGENT_MESSAGE first line; skip extra
 * lines when in_sanity_check; something_worth_saving save-hint.
 * Named omit: paniclog file (Rule #2); recursive panic(); debug_fuzzer
 * panic; sysopt.support; CRASHREPORT yn (network).
 */
export async function impossible(s, ...args) {
    if (!game.program_state) game.program_state = {};
    const ps = game.program_state;
    /* C: if (in_impossible) panic("impossible called impossible"); */
    if (ps.in_impossible) return;
    ps.in_impossible = 1;
    let i = 0;
    const pbuf = String(s ?? '').replace(/%[%sd]/g, (m) => {
        if (m === '%%') return '%';
        return String(args[i++] ?? '');
    });
    await urgent_pline(pbuf);
    if (ps.in_sanity_check) {
        ps.in_impossible = 0;
        return;
    }
    let pbuf2 = 'Program in disorder!';
    if (ps.something_worth_saving) {
        pbuf2 += '  (Saving and reloading may fix this problem.)';
    }
    await pline(pbuf2);
    await pline(`Please report these messages to ${DEVTEAM_EMAIL}.`);
    ps.in_impossible = 0;
}
