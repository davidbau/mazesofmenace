// @ts-nocheck
// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.
import { game } from './gstate.js';
import { glyph_to_cmap as glyph_to_cmap_real } from './glyphs.js';
import { see_wsegs, worm_seg_at } from './worm.js';
import { cansee, couldsee, vision_recalc, Blind } from './vision.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import { observe_object } from './o_init.js';
import { SEE_INVIS, TELEPAT, DETECT_MONSTERS, INVIS } from './const.js';
import { PICK_ONE, PICK_ANY } from './const.js';
/* C ref: include/you.h:562 `#define u_at(x,y) ((x) == u.ux && (y) == u.uy)`.
 * This file used to export its OWN throwing `u_at` stub, which shadowed the
 * canonical const.js body for every call inside this module AND offered a
 * second, broken binding of the name to any importer that happened to name
 * display.js — a DUAL EXPORT with no correct side to converge on.  The stub is
 * deleted; the one body every other module already imports is imported here. */
import { u_at } from './const.js';
/* C ref: include/align.h:29-39 — altar_to_glyph's alignment-mask tests. */
import { AM_MASK, AM_SANCTUM, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC } from './const.js';
import { BLINDED, CONFUSION, STUNNED, INFRAVISION, WARNING, WARN_OF_MON, FLYING, LEVITATION, HALLUC, HALLUC_RES, DEAF, Is_rogue_level, Is_waterlevel, LA_DOWN, In_mines, In_sokoban, Is_knox_level } from './const.js';

function _display_hallucinating() {
    const u = game.u;
    const hp = u?.uprops?.[HALLUC];
    const hrp = u?.uprops?.[HALLUC_RES];
    return !!(((hp?.intrinsic | 0) || (hp?.extrinsic | 0))
              && !((hrp?.intrinsic | 0) || (hrp?.extrinsic | 0)));
}
import { COLNO, ROWNO, STONE, ROOM, CORR, ICE, DOOR, STAIRS, LADDER, SDOOR, SCORR, TREE, POOL, MOAT, WATER, DRAWBRIDGE_UP, DBWALL, LAVAPOOL, LAVAWALL, IRONBARS, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR, DRAWBRIDGE_DOWN, AIR, CLOUD, HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, D_ISOPEN, D_CLOSED, D_LOCKED, gs, H_DEC, PRIMARYSET, WM_MASK, WM_T_LONG, WM_T_BL, WM_T_BR, WM_C_OUTER, WM_C_INNER, WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR, SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, SVALL, isok, } from './const.js';
import { NO_COLOR, CLR_GRAY, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_CYAN, CLR_WHITE, CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BLACK, CLR_MAGENTA, CLR_ORANGE, CLR_BRIGHT_GREEN, CLR_BRIGHT_MAGENTA, DEC_TO_UNICODE } from './terminal.js';
import { MKOBJ_OC_COLOR, MKOBJ_OC_CLASS } from './mkobj_data.js';
import { IS_OBSTRUCTED, IS_DOOR, IS_ROOM, IS_POOL, OBJ_FLOOR, BC_BALL, BC_CHAIN, M_AP_TYPMASK, M_AP_FURNITURE, M_AP_NOTHING, M_AP_OBJECT, M_AP_MONSTER, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT } from './const.js';
/* C display.c:570 — the corpsenm a mimicked object gets when the monster has
 * no mextra corpsenm.  pm.generated.js is not imported here (this file carries
 * no pm import); 55 verified by NAME via js/makemon_pmnames.json[55] = "tengu"
 * and cross-checked against js/pm.generated.js:61 PM_TENGU = 55. */
const PM_TENGU_DISP = 55;
/* C monsters.h:3330 MON(NAM("long worm tail"), S_WORM_TAIL, ..., CLR_BROWN,
 * LONG_WORM_TAIL) — the dummy species display_monster() substitutes for a
 * worm's body squares (display.c:600/606/613).  Same no-pm-import convention as
 * PM_TENGU_DISP above: 330 verified by NAME via
 * js/makemon_pmnames.json[330] = "long worm tail" and cross-checked against
 * js/pm.generated.js:333 PM_LONG_WORM_TAIL = 330. */
const PM_LONG_WORM_TAIL_DISP = 330;
import { engr_at } from './mklev.js';
import { acurr } from './attrib.js';
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA } from './const.js';
import { t_at } from './trap.js';
import { visible_region_at } from './region.js';
import { is_pool_or_lava } from './look.js';
/* C rnd.c:64 rn2_on_display_rng — the DISP isaac64 context, deliberately NOT
 * the scored stream (js/rng.js:239).  Used by swallow_to_glyph's what_mon. */
import { rn2_on_display_rng, cosmic_display_push_owner as cosmic_push_owner_real, cosmic_display_pop_owner as cosmic_pop_owner_real, pushRngLogEntry } from './rng.js';
import { nhgetch } from './input.js';
import { near_capacity } from './weight.js';
import { describe_level_buf } from './dungeon.js';
import { update_inventory } from './mhitm.js';
import { ARTILIST, otense } from './objnam.js';
// WRITE-ONLY route-attribution telemetry (inert unless NH_ROUTE_TELEMETRY=1 —
// only ever set by tools/input-desync-triage.mjs). See js/route_telemetry.js.
import { routeTag } from './route_telemetry.js';
/* C youprop.h:399 Unaware = (gm.multi < 0 && (unconscious() || is_fainted())).
 * Both leaves are ported; these are the exported bodies js/cmd.js's
 * _goto_level_You_hear already calls, so You_hear below reads the same state
 * that file does rather than growing a tenth private approximation. */
import { unconscious } from './pickup.js';
import { is_fainted } from './eat.js';

// ── Trap glyph table ──
// C ref: include/defsym.h trap PCHAR entries (lines 157-183) + include/rm.h:484
// trap_to_defsym(t) = S_arrow_trap + t - 1.  The trap_types enum (trap.h:57) is
// 1-based and indexed identically to the defsym trap order, so a trap's ttyp maps
// directly into this table at index (ttyp - 1).  HI_METAL=CLR_CYAN, HI_ZAP=
// CLR_BRIGHT_BLUE (const.js:2415,2418).  Almost all traps render as '^'; the two
// exceptions are web ('"') and vibrating square ('~').  Used by newsym to render
// a tseen trap, mirroring C _map_location's trap branch (display.c) which comes
// after object and before engraving/terrain.
const TRAP_GLYPHS = [
    { ch: '^', color: CLR_CYAN },           //  1 ARROW_TRAP        HI_METAL
    { ch: '^', color: CLR_CYAN },           //  2 DART_TRAP         HI_METAL
    { ch: '^', color: CLR_GRAY },           //  3 FALLING_ROCK_TRAP CLR_GRAY
    { ch: '^', color: CLR_BROWN },          //  4 SQKY_BOARD        CLR_BROWN
    { ch: '^', color: CLR_CYAN },           //  5 BEAR_TRAP         HI_METAL
    { ch: '^', color: CLR_RED },            //  6 LANDMINE          CLR_RED
    { ch: '^', color: CLR_GRAY },           //  7 ROLLING_BOULDER   CLR_GRAY
    { ch: '^', color: CLR_BRIGHT_BLUE },    //  8 SLP_GAS_TRAP      HI_ZAP
    { ch: '^', color: CLR_BLUE },           //  9 RUST_TRAP         CLR_BLUE
    { ch: '^', color: CLR_ORANGE },         // 10 FIRE_TRAP         CLR_ORANGE
    { ch: '^', color: CLR_BLACK },          // 11 PIT               CLR_BLACK
    { ch: '^', color: CLR_BLACK },          // 12 SPIKED_PIT        CLR_BLACK
    { ch: '^', color: CLR_BROWN },          // 13 HOLE              CLR_BROWN
    { ch: '^', color: CLR_BROWN },          // 14 TRAPDOOR          CLR_BROWN
    { ch: '^', color: CLR_MAGENTA },        // 15 TELEP_TRAP        CLR_MAGENTA
    { ch: '^', color: CLR_MAGENTA },        // 16 LEVEL_TELEP       CLR_MAGENTA
    { ch: '^', color: CLR_BRIGHT_MAGENTA }, // 17 MAGIC_PORTAL      CLR_BRIGHT_MAGENTA
    { ch: '"', color: CLR_GRAY },           // 18 WEB               CLR_GRAY
    { ch: '^', color: CLR_GRAY },           // 19 STATUE_TRAP       CLR_GRAY
    { ch: '^', color: CLR_BRIGHT_BLUE },    // 20 MAGIC_TRAP        HI_ZAP
    { ch: '^', color: CLR_BRIGHT_BLUE },    // 21 ANTI_MAGIC        HI_ZAP
    { ch: '^', color: CLR_BRIGHT_GREEN },   // 22 POLY_TRAP         CLR_BRIGHT_GREEN
    { ch: '~', color: CLR_MAGENTA },        // 23 VIBRATING_SQUARE  CLR_MAGENTA
];
/* C ref: display.h trap_to_glyph(trap) → the trap's defsym symbol.  Exported for
 * pager.c's look_traps(), which re-glyphs an obscured trap to its own symbol. */
export function trap_glyph_char(ttyp) {
    const tg = ((ttyp | 0) >= 1 && (ttyp | 0) <= TRAP_GLYPHS.length)
        ? TRAP_GLYPHS[(ttyp | 0) - 1] : null;
    return tg ? tg.ch : '^';
}

/* C ref: detect.c:1946-1947 —
 *     levl[trap->tx][trap->ty].glyph != trap_to_glyph(trap)
 * i.e. "is what the hero THINKS is on that square already this trap's own
 * glyph?".  C compares two glyph ints; this port's hero memory is a RENDERED
 * glyph ({ch, color, cls}) written by map_trap(), so the same question is
 * answered against that triple.  MODEL RESIDUE, stated rather than hidden: two
 * trap types that share both symbol and colour (MAGIC_TRAP/ANTI_MAGIC,
 * PIT/SPIKED_PIT, HOLE/TRAPDOOR, TELEP_TRAP/LEVEL_TELEP, ...) compare EQUAL
 * here where C's glyph ints differ.  The caller that matters (find_trap, reached
 * only from the `!trap->tseen` arms of dosearch0/dokick) can only hit that residue
 * when the square's memory holds a DIFFERENT, already-seen trap of a
 * symbol-and-colour-identical type — i.e. a stale trap memory left by a trap
 * that is no longer there. */
export function glyph_is_this_trap(remembered_glyph, ttyp) {
    const rg = remembered_glyph;
    if (!rg || rg.cls !== GLYPHCLS_TRAP)
        return false;
    const tg = ((ttyp | 0) >= 1 && (ttyp | 0) <= TRAP_GLYPHS.length)
        ? TRAP_GLYPHS[(ttyp | 0) - 1] : null;
    if (!tg)
        return false;
    return rg.ch === tg.ch && rg.color === tg.color;
}
// ── Monster glyph tables ──
// C ref: display.c newsym → display_monster → mon_to_glyph → map_glyphinfo
// DEF_MONSYM_CHARS: defsym.h MONSYM macro order — index is mlet, char is symbol.
// C ref: makemon.js DEF_MONSYM_CHARS (same string).
// C ref: objclass onames — CORPSE otyp (FOOD class). Used by GLYPH_BODY color routing.
const CORPSE = 265;
// C ref: objects.h OBJECT("statue", ...) — STATUE otyp (ROCK_CLASS, oc_color CLR_WHITE).
// A statue object does NOT display as its object class symbol; display.h obj_to_glyph()
// routes STATUE through statue_to_glyph() → GLYPH_STATUE_MALE/FEM_OFF, and
// display.c:2873/2880 map_glyphinfo resolves that to `mons[corpsenm].mlet + SYM_OFF_M`
// (the MONSTER CLASS symbol of the represented monster), while the color is
// obj_color(STATUE) = objects[STATUE].oc_color = CLR_WHITE (NOT the monster's mcolor).
// (Mirrors js/mklev.js STATUE = 476.)
const STATUE = 476;
// C ref: defsym.h:355-360 — MONSYM(53,'@'), (54,' ' GHOST), (55,'\'' GOLEM),
// (56,'&'), (57,';'), (58,':'), (59,'~'), (60,']').  Index 55 was a BACKSLASH
// here: C writes the golem class as the escaped char literal '\'', and that
// escape was transliterated into JS as \\ (a backslash) instead of the
// apostrophe it denotes.  Every golem — and every statue of one, which renders
// as its monster CLASS symbol — therefore drew as `\`, i.e. as S_throne.
const DEF_MONSYM_CHARS = '?abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ \'&;:~]';
// MON_MLET: mlet (monster-class symbol index) for each mndx, from makemon_mons.json row[0].
// MON_MCOLOR: mcolor (display color CLR_*) for each mndx, from nethack-c/include/monsters.h.
const MON_MLET = new Uint8Array([
    1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4,
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5,
    6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 8, 8, 8, 8, 8,
    8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11, 11, 12,
    13, 13, 13, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16,
    16, 17, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 19, 19,
    19, 19, 20, 20, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
    23, 23, 23, 23, 24, 24, 25, 25, 26, 27, 27, 27, 27, 27, 28, 28,
    28, 28, 29, 29, 29, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 31, 31, 31, 31, 31, 32, 32,
    32, 32, 32, 32, 32, 33, 33, 33, 33, 34, 34, 34, 34, 34, 34, 34,
    34, 34, 36, 37, 37, 37, 37, 38, 38, 38, 38, 39, 39, 39, 39, 39,
    39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 41, 41, 41, 42, 42,
    42, 42, 43, 43, 44, 44, 45, 45, 45, 45, 45, 45, 46, 46, 46, 46,
    46, 47, 48, 48, 48, 49, 49, 49, 50, 51, 51, 51, 51, 51, 51, 52,
    52, 52, 52, 52, 52, 52, 52, 52, 52, 55, 55, 55, 55, 55, 55, 55,
    55, 55, 55, 55, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53,
    53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 54,
    54, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56,
    56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 57, 57, 57, 57,
    57, 57, 58, 58, 58, 58, 58, 58, 58, 58, 59, 53, 53, 53, 53, 53,
    53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53,
    53, 53, 53, 53, 53, 56, 53, 30, 34, 30, 53, 56, 19, 53, 53, 34,
    53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53, 53,
]);
// Regenerated 2026-06-03 directly from C ground truth: mons[i].mcolor after
// monst_globals_init() (monst.c memcpy from mons_init[]).  The prior table had
// 19 entries stuck at the CLR_GRAY (7) fallback where the real monster carries a
// distinct color (e.g. mndx 333 "caveman" / 337 "priest" = CLR_WHITE(15), used to
// color a caveman/priest *corpse* glyph via mon_color(corpsenm) — display.c:3059).
// Indexing is exact (NUMMONS=383, the same #ifdef config as the recorder).
const MON_MCOLOR = [
    3, 11, 4, 1, 0, 5, 2, 15, 6, 3, 11, 1, 3, 1, 3, 3,
    15, 11, 15, 15, 7, 7, 6, 0, 6, 1, 1, 7, 4, 15, 1, 12,
    15, 15, 3, 6, 0, 15, 11, 4, 2, 3, 5, 2, 1, 3, 4, 5,
    13, 13, 1, 2, 1, 3, 4, 6, 4, 2, 3, 3, 1, 5, 12, 2,
    3, 1, 5, 2, 4, 3, 7, 3, 1, 11, 4, 0, 12, 5, 7, 6,
    15, 3, 7, 1, 6, 7, 7, 0, 3, 3, 3, 3, 7, 3, 7, 11,
    5, 1, 7, 2, 3, 15, 7, 0, 3, 3, 7, 3, 6, 12, 4, 11,
    3, 5, 3, 5, 5, 1, 11, 0, 3, 2, 11, 15, 11, 5, 3, 1,
    0, 0, 3, 2, 6, 7, 11, 14, 1, 15, 9, 0, 4, 2, 11, 7,
    11, 14, 1, 15, 9, 0, 4, 2, 11, 15, 6, 11, 3, 4, 10, 3,
    11, 2, 1, 5, 5, 3, 4, 12, 5, 1, 7, 6, 11, 15, 3, 4,
    5, 3, 9, 4, 4, 6, 5, 3, 1, 5, 5, 3, 1, 7, 1, 2,
    7, 4, 6, 1, 0, 11, 2, 1, 0, 11, 2, 3, 1, 5, 7, 3,
    2, 0, 6, 2, 3, 4, 2, 3, 1, 5, 4, 4, 3, 15, 6, 4,
    5, 3, 1, 4, 5, 7, 0, 5, 3, 7, 3, 3, 15, 0, 7, 3,
    3, 7, 1, 2, 15, 4, 0, 6, 15, 11, 15, 3, 11, 3, 3, 1,
    3, 7, 6, 6, 15, 3, 1, 9, 15, 2, 10, 7, 12, 5, 15, 15,
    4, 15, 12, 15, 15, 7, 1, 15, 2, 4, 7, 2, 10, 13, 5, 7,
    0, 4, 7, 3, 1, 1, 1, 2, 2, 7, 15, 1, 1, 7, 1, 10,
    5, 5, 5, 5, 5, 5, 5, 13, 13, 13, 12, 11, 4, 1, 7, 6,
    12, 1, 11, 2, 3, 3, 2, 3, 3, 9, 3, 15, 15, 15, 15, 15,
    15, 15, 15, 15, 15, 15, 15, 15, 5, 5, 5, 5, 5, 0, 15, 5,
    5, 5, 15, 5, 2, 9, 5, 5, 7, 1, 5, 9, 5, 5, 5, 5,
    0, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15,
];
// MONS data rows: [mlet, mlevel, mov, geno, malign, mr, mflags1, mflags2,
// mflags3, msize] (makemon_mons.json).  mflags3 is row[8].
// C ref: monflag.h M3_INFRAVISIBLE 0x0200 — "visible by infravision" (warm-blooded).
// C ref: mondata.h infravisible(ptr) = (ptr->mflags3 & M3_INFRAVISIBLE).
const _MONS_ROWS = /** @type {number[][]} */ (monsPack.mons);
const M3_INFRAVISIBLE = 0x0200;
// C ref: mondata.h infravisible(mon->data).  mon carries mnum/mndx (permonst idx).
function infravisible_mon(mon) {
    const mndx = (mon?.mnum ?? mon?.mndx ?? -1) | 0;
    const row = (mndx >= 0 && mndx < _MONS_ROWS.length) ? _MONS_ROWS[mndx] : null;
    return row ? !!((row[8] | 0) & M3_INFRAVISIBLE) : false;
}
// ── Object class glyph tables ──
// C ref: nethack-c/include/defsym.h OBJCLASS macro — oclass → display char + color.
// Index 0 = RANDOM_CLASS (unused for display), 1-17 match OBJCLASS enum order.
// Colors are representative per-class (gold=CLR_YELLOW, most armor/weapons=CLR_GRAY, etc.).
// C ref: nethack-c/include/color.h, nethack-c/include/objects.h oc_color fields.
const OCLASS_CHAR = [
    '?', //  0 RANDOM_CLASS
    ']', //  1 ILLOBJ_CLASS
    ')', //  2 WEAPON_CLASS
    '[', //  3 ARMOR_CLASS
    '=', //  4 RING_CLASS
    '"', //  5 AMULET_CLASS
    '(', //  6 TOOL_CLASS
    '%', //  7 FOOD_CLASS
    '!', //  8 POTION_CLASS
    '?', //  9 SCROLL_CLASS
    '+', // 10 SPBOOK_CLASS
    '/', // 11 WAND_CLASS
    '$', // 12 COIN_CLASS
    '*', // 13 GEM_CLASS
    '`', // 14 ROCK_CLASS
    '0', // 15 BALL_CLASS
    '_', // 16 CHAIN_CLASS
    '.', // 17 VENOM_CLASS
];
// CLR_* representative colors per oclass — C ref: objects.h oc_color fields.
const OCLASS_COLOR = [
    7, //  0 RANDOM_CLASS  → CLR_GRAY
    7, //  1 ILLOBJ_CLASS  → CLR_GRAY
    7, //  2 WEAPON_CLASS  → CLR_GRAY (most metal weapons)
    7, //  3 ARMOR_CLASS   → CLR_GRAY (most metal armor)
    7, //  4 RING_CLASS    → CLR_GRAY
    7, //  5 AMULET_CLASS  → CLR_GRAY
    7, //  6 TOOL_CLASS    → CLR_GRAY
    3, //  7 FOOD_CLASS    → CLR_BROWN
    5, //  8 POTION_CLASS  → CLR_MAGENTA (random color; fallback)
    15, //  9 SCROLL_CLASS  → CLR_WHITE  (plain paper)
    15, // 10 SPBOOK_CLASS  → CLR_WHITE  (plain paper)
    6, // 11 WAND_CLASS    → CLR_CYAN
    11, // 12 COIN_CLASS    → CLR_YELLOW (HI_GOLD — gold piece)
    7, // 13 GEM_CLASS     → CLR_GRAY   (unidentified gems)
    7, // 14 ROCK_CLASS    → CLR_GRAY   (boulders)
    7, // 15 BALL_CLASS    → CLR_GRAY   (iron ball)
    7, // 16 CHAIN_CLASS   → CLR_GRAY   (iron chain)
    6, // 17 VENOM_CLASS   → CLR_CYAN   (splash of venom)
];
// ── ANSI color codes ──
// Maps CLR_* constants (0-15) to ANSI SGR color codes.
// C ref: wintty.c term_start_color
const ANSI_DEFAULT = 39;
const ANSI_COLOR = [
    // C ref: color.h:10-14 — "Bright black doesn't mean very much, so it is
    // used as the 'default' foreground color of the screen." NetHack's tty
    // never emits ANSI 30 (black-on-black is invisible); CLR_BLACK renders as
    // bright-black (ANSI 90). Likewise CLR_GRAY = "low-intensity white" IS the
    // terminal default foreground, so the tty emits no color code (ANSI 39),
    // not 37. Verified empirically: no recorded C session emits ESC[37m or
    // ESC[30m; CLR_GRAY monsters/objects render at default (e.g. seed1900
    // step0 orc `o`).
    90, // CLR_BLACK     0 → bright black (default-dark)
    31, // CLR_RED       1
    32, // CLR_GREEN     2
    33, // CLR_BROWN     3
    34, // CLR_BLUE      4
    35, // CLR_MAGENTA   5
    36, // CLR_CYAN      6
    39, // CLR_GRAY      7 → terminal default (low-intensity white)
    39, // NO_COLOR      8 → default
    91, // CLR_ORANGE    9
    92, // CLR_BRIGHT_GREEN  10
    93, // CLR_YELLOW    11
    94, // CLR_BRIGHT_BLUE   12
    95, // CLR_BRIGHT_MAGENTA 13
    96, // CLR_BRIGHT_CYAN   14
    97, // CLR_WHITE     15
];
// ── Terrain to display character + color + DEC flag ──
// W18.4 sub-task C terrain color audit (2026-05-17):
// All entries verified against nethack-c/include/defsym.h PCHAR2 entries 90-152.
// Walls (HWALL/VWALL/corners): defsym CLR_GRAY → JS NO_COLOR (ANSI default=39).
//   NO_COLOR renders at terminal default (no color code emitted), matching
//   C's walls which are also default-colored in recorded sessions — no fix needed.
// Stairs: defsym CLR_GRAY (idx 7) but C emits ANSI 93 (CLR_YELLOW idx 11).
//   Session files confirm ANSI 93 for stairs — JS CLR_YELLOW is correct.
// ROOM/CORR: defsym CLR_GRAY → JS NO_COLOR; sessions show no color code for floor
//   and corridor — confirmed correct.
// All other entries (DOOR, pool, lava, fountain, etc.) match defsym.h colors.
// Future: if a new terrain color mismatch appears on bug board, re-audit here.
//
// Symset selection:
// C ref: options.c optfn_DECgraphics / handler_symset — sets gs.symset[PRIMARYSET].handling.
// SYMHANDLING(H_DEC) == true means DECgraphics is active: use DEC line-drawing characters.
// Default (no symset option or unrecognized) uses ASCII PCHAR glyphs from defsym.h.
// ── wall_angle (C ref: display.c:3563-3837) ──
// Selects the displayed cmap symbol for a wall/SDOOR cell from its type, the
// wall_info orientation mode (wall_info & WM_MASK, JS: loc.flags & WM_MASK),
// and the seen-vector loc.seenv.  Each S_* result key maps to the same DEC /
// ASCII glyph the terrain_glyph wall cases used (defsym.h / dat/symbols).
// 'stone' renders as blank (S_stone).  RNG-neutral, pure render.
const _WALL_SYM = {
    stone:  { d: ' ', a: ' ' },
    vwall:  { d: 'x', a: '|' },
    hwall:  { d: 'q', a: '-' },
    tlcorn: { d: 'l', a: '-' },
    trcorn: { d: 'k', a: '-' },
    blcorn: { d: 'm', a: '-' },
    brcorn: { d: 'j', a: '-' },
    crwall: { d: 'n', a: '-' },
    tuwall: { d: 'v', a: '-' },
    tdwall: { d: 'w', a: '-' },
    tlwall: { d: 'u', a: '|' },
    trwall: { d: 't', a: '|' },
};
// wall_matrix[4][5]: rows tdwall/tlwall/tuwall/trwall, cols T_stone..T_tdwall
// (display.c:3466).  Column order: [T_stone, T_tlcorn, T_trcorn, T_hwall, T_tdwall].
const _WALL_MATRIX = [
    ['stone', 'tlcorn', 'trcorn', 'hwall', 'tdwall'], // T_d / tdwall
    ['stone', 'trcorn', 'brcorn', 'vwall', 'tlwall'], // T_l / tlwall
    ['stone', 'brcorn', 'blcorn', 'hwall', 'tuwall'], // T_u / tuwall
    ['stone', 'blcorn', 'tlcorn', 'vwall', 'trwall'], // T_r / trwall
];
// cross_matrix[4][6]: rows C_bl/C_tl/C_tr/C_br, cols
// [C_trcorn, C_brcorn, C_blcorn, C_tlwall, C_tuwall, C_crwall] (display.c:3494).
const _CROSS_MATRIX = [
    ['brcorn', 'blcorn', 'tlcorn', 'tuwall', 'trwall', 'crwall'],
    ['blcorn', 'tlcorn', 'trcorn', 'trwall', 'tdwall', 'crwall'],
    ['tlcorn', 'trcorn', 'brcorn', 'tdwall', 'tlwall', 'crwall'],
    ['trcorn', 'brcorn', 'blcorn', 'tlwall', 'tuwall', 'crwall'],
];
function _wall_angle(loc) {
    // C ref: display.c:3563 wall_angle().  Returns an _WALL_SYM key.
    let seenv = (loc.seenv | 0) & 0xff;
    const wm = (loc.flags | 0) & WM_MASK;
    const typ = loc.typ;
    const only = (sv, bits) => ((sv & bits) && !(sv & ~bits));
    // T-walls rotate seenv to a tdwall and pattern-match (display.c:3571-3647).
    if (typ === TUWALL || typ === TLWALL || typ === TRWALL || typ === TDWALL) {
        let rowIdx;
        if (typ === TUWALL) { rowIdx = 2; seenv = ((seenv >> 4) | (seenv << 4)) & 0xff; }
        else if (typ === TLWALL) { rowIdx = 1; seenv = ((seenv >> 2) | (seenv << 6)) & 0xff; }
        else if (typ === TRWALL) { rowIdx = 3; seenv = ((seenv >> 6) | (seenv << 2)) & 0xff; }
        else { rowIdx = 0; } // TDWALL
        const matrix = _WALL_MATRIX[rowIdx];
        let col; // T_stone=0,T_tlcorn=1,T_trcorn=2,T_hwall=3,T_tdwall=4
        switch (wm) {
            case 0:
                if (seenv === SV4) col = 1;
                else if (seenv === SV6) col = 2;
                else if ((seenv & (SV3 | SV5 | SV7)) || ((seenv & SV4) && (seenv & SV6))) col = 4;
                else if (seenv & (SV0 | SV1 | SV2)) col = (seenv & (SV4 | SV6)) ? 4 : 3;
                else col = 0;
                break;
            case WM_T_LONG:
                if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) col = 1;
                else if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = 2;
                else if ((seenv & SV5) || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) col = 4;
                else col = 0;
                break;
            case WM_T_BL:
                if (only(seenv, SV4 | SV5)) col = 1;
                else if ((seenv & (SV0 | SV1 | SV2 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = 3;
                else if (only(seenv, SV6)) col = 0;
                else col = 4;
                break;
            case WM_T_BR:
                if (only(seenv, SV5 | SV6)) col = 2;
                else if ((seenv & (SV0 | SV1 | SV2 | SV3)) && !(seenv & (SV5 | SV6 | SV7))) col = 3;
                else if (only(seenv, SV4)) col = 0;
                else col = 4;
                break;
            default: col = 0; break;
        }
        return matrix[col];
    }
    // SDOOR: arboreal handled by terrain (not here); horizontal -> hwall logic.
    const isHoriz = (typ === HWALL) || (typ === SDOOR && loc.horizontal);
    const isVert = (typ === VWALL) || (typ === SDOOR && !loc.horizontal);
    if (isVert) {
        switch (wm) {
            case 0: return seenv ? 'vwall' : 'stone';
            case 1: return (seenv & (SV1 | SV2 | SV3 | SV4 | SV5)) ? 'vwall' : 'stone';
            case 2: return (seenv & (SV0 | SV1 | SV5 | SV6 | SV7)) ? 'vwall' : 'stone';
            default: return 'stone';
        }
    }
    if (isHoriz) {
        switch (wm) {
            case 0: return seenv ? 'hwall' : 'stone';
            case 1: return (seenv & (SV3 | SV4 | SV5 | SV6 | SV7)) ? 'hwall' : 'stone';
            case 2: return (seenv & (SV0 | SV1 | SV2 | SV3 | SV7)) ? 'hwall' : 'stone';
            default: return 'stone';
        }
    }
    // Corners (display.c:3697-3726 set_corner macro).
    const setCorner = (which, outer, inner) => {
        switch (wm) {
            case 0: return which;
            case WM_C_OUTER: return (seenv & outer) ? which : 'stone';
            case WM_C_INNER: return (seenv & ~inner) ? which : 'stone';
            default: return 'stone';
        }
    };
    if (typ === TLCORNER) return setCorner('tlcorn', SV3 | SV4 | SV5, SV4);
    if (typ === TRCORNER) return setCorner('trcorn', SV5 | SV6 | SV7, SV6);
    if (typ === BLCORNER) return setCorner('blcorn', SV1 | SV2 | SV3, SV2);
    if (typ === BRCORNER) return setCorner('brcorn', SV7 | SV0 | SV1, SV0);
    if (typ === CROSSWALL) {
        switch (wm) {
            case 0:
                if (seenv === SV0) return 'brcorn';
                if (seenv === SV2) return 'blcorn';
                if (seenv === SV4) return 'tlcorn';
                if (seenv === SV6) return 'trcorn';
                if (!(seenv & ~(SV0 | SV1 | SV2)) && ((seenv & SV1) || seenv === (SV0 | SV2))) return 'tuwall';
                if (!(seenv & ~(SV2 | SV3 | SV4)) && ((seenv & SV3) || seenv === (SV2 | SV4))) return 'trwall';
                if (!(seenv & ~(SV4 | SV5 | SV6)) && ((seenv & SV5) || seenv === (SV4 | SV6))) return 'tdwall';
                if (!(seenv & ~(SV0 | SV6 | SV7)) && ((seenv & SV7) || seenv === (SV0 | SV6))) return 'tlwall';
                return 'crwall';
            case WM_X_TL:
            case WM_X_TR:
            case WM_X_BL:
            case WM_X_BR: {
                let rowIdx;
                if (wm === WM_X_TL) { rowIdx = 1; seenv = ((seenv >> 4) | (seenv << 4)) & 0xff; }
                else if (wm === WM_X_TR) { rowIdx = 2; seenv = ((seenv >> 6) | (seenv << 2)) & 0xff; }
                else if (wm === WM_X_BL) { rowIdx = 0; seenv = ((seenv >> 2) | (seenv << 6)) & 0xff; }
                else { rowIdx = 3; } // WM_X_BR
                if (seenv === SV4) return 'stone';
                seenv = seenv & ~SV4;
                const matrix = _CROSS_MATRIX[rowIdx];
                // cols: C_trcorn=0,C_brcorn=1,C_blcorn=2,C_tlwall=3,C_tuwall=4,C_crwall=5
                let col;
                if (seenv === SV0) col = 1;
                else if (seenv & (SV2 | SV3)) {
                    if (seenv & (SV5 | SV6 | SV7)) col = 5;
                    else if (seenv & (SV0 | SV1)) col = 4;
                    else col = 2;
                } else if (seenv & (SV5 | SV6)) {
                    if (seenv & (SV1 | SV2 | SV3)) col = 5;
                    else if (seenv & (SV0 | SV7)) col = 3;
                    else col = 0;
                } else if (seenv & SV1) {
                    col = (seenv & SV7) ? 5 : 4;
                } else if (seenv & SV7) {
                    col = (seenv & SV1) ? 5 : 3;
                } else col = 5;
                return matrix[col];
            }
            case WM_X_TLBR:
                if (only(seenv, SV1 | SV2 | SV3)) return 'blcorn';
                if (only(seenv, SV5 | SV6 | SV7)) return 'trcorn';
                if (only(seenv, SV0 | SV4)) return 'stone';
                return 'crwall';
            case WM_X_BLTR:
                if (only(seenv, SV0 | SV1 | SV7)) return 'brcorn';
                if (only(seenv, SV3 | SV4 | SV5)) return 'tlcorn';
                if (only(seenv, SV2 | SV6)) return 'stone';
                return 'crwall';
            default: return 'stone';
        }
    }
    return 'stone';
}
function _wall_angle_glyph(loc, decMode) {
    // C ref: display.c:2372 — wall/SDOOR glyph = seenv ? wall_angle : S_stone.
    // SDOOR arboreal -> S_tree (display.c:3650); not present on these levels but
    // mirrored for faithfulness.
    if (loc.typ === SDOOR && loc.arboreal_sdoor)
        return { ch: '#', color: CLR_GREEN, dec: false }; // S_tree
    if (!(loc.seenv | 0))
        return { ch: ' ', color: NO_COLOR, dec: false }; // S_stone
    const key = _wall_angle(loc);
    const sym = _WALL_SYM[key] || _WALL_SYM.stone;
    if (key === 'stone')
        return { ch: ' ', color: NO_COLOR, dec: false };
    /* C ref: display.c:2949-2965 wall_color(<branch>_walls) — a wall cmap glyph
     * is coloured from wallcolors[] per dungeon branch, not from
     * defsyms[S_vwall].color.  See _wall_color() below. */
    const wallColor = _wall_color();
    return decMode
        ? { ch: sym.d, color: wallColor, dec: true }
        : { ch: sym.a, color: wallColor, dec: false };
}
/* C ref: display.h:597-603 cmap_walls_to_glyph() + display.c:2949-2965 +
 * display.c:2677 `int wallcolors[sokoban_walls + 1]`.
 *
 * Every wall cmap symbol (S_vwall..S_trwall, and SDOOR which wall_angle()
 * resolves to one of them) is turned into a glyph in a PER-BRANCH block —
 *     (cmap_idx) - S_vwall
 *     + (In_mines(&u.uz)   ? GLYPH_CMAP_MINES_OFF
 *        : In_hell(&u.uz)  ? GLYPH_CMAP_GEH_OFF
 *          : Is_knox(&u.uz) ? GLYPH_CMAP_KNOX_OFF
 *            : In_sokoban(&u.uz) ? GLYPH_CMAP_SOKO_OFF
 *              : GLYPH_CMAP_MAIN_OFF)
 * — and map_glyphinfo colours each block from its own `wall_color(n)`, i.e.
 * `wallcolors[n]` indexed by enum level_walls (display.h:353): main=0, mines=1,
 * gehennom=2, knox=3, sokoban=4.  We rendered EVERY wall at NO_COLOR
 * unconditionally and had no model of this at all.
 *
 * The values.  nethack-c-v5/upstream/src/display.c:2677 ships wallcolors[]
 * initialised to five CLR_GRAYs with the real table on the line BELOW it,
 * commented out:  CLR_GRAY, CLR_BROWN, CLR_RED, CLR_GRAY, CLR_BRIGHT_BLUE.
 * The recorded 5.0.0_Release output says that commented table is what the
 * scored binary actually runs.  Measured over all 44 public sessions, decoding
 * every DEC-graphics wall cell of every recorded frame:
 *     main       colour 39/default   71,165 cells   (CLR_GRAY)
 *     mines      colour 33           21,244 cells   (CLR_BROWN) seed0014/0030/4500
 *     sokoban    colour 34            7,731 cells   (CLR_BLUE)  seed0360/0361/0367
 *     gehennom   colour 31            2,780 cells   (CLR_RED)   seed4500
 * so three of the four witnessed entries are the commented line verbatim, and
 * Sokoban is CLR_BLUE (34) rather than the comment's CLR_BRIGHT_BLUE — which
 * the same recordings emit as 94 elsewhere, so the two are distinguishable and
 * 34 is not an encoding artefact.  Knox has no witness in the corpus; it keeps
 * the CLR_GRAY both the live initialiser and the comment give it.
 *
 * main stays NO_COLOR rather than CLR_GRAY: both encode to ANSI 39, and
 * NO_COLOR keeps the main-dungeon byte stream identical to what it was.
 * DISPLAY-ONLY, no RNG.
 *
 * WHERE THAT TABLE ACTUALLY COMES FROM — CORRECTED 2026-08-19, and it is the
 * "C snapshot disagrees with the scored binary" shape in reverse.  The live
 * initialiser at display.c:2677 is five CLR_GRAYs and it is NOT dead code: the
 * per-branch colours are loaded from the SYMSET, not compiled in.  dat/symbols
 * carries `G_vwall_sokoban: /blue`, `G_vwall_gehennom: /red`, ... inside the
 * `start: IBMgraphics` / `start: DECgraphics` / `start: curses` blocks, and the
 * default (and `plain`) symset defines no G_* entries at all, so with no
 * `OPTIONS=symset:` in the rc wallcolors[] stays all CLR_GRAY.
 *
 * The earlier measurement that produced this table only ever saw sessions that
 * DO load one: 38 of the 44 public sessions set symset:DECgraphics, and every
 * mines/sokoban/gehennom witness it cites is among them.  The 6 that do not are
 * seed0103, seed0104, seed0106, seed0107, seed0108 and seed0200, and only
 * seed0108 reaches a coloured branch -- it level-teleports into Sokoban at step
 * 290, where C paints the walls with NO colour and this port painted them blue
 * across 9 frames.
 *
 * So the branch colours are gated on a symset being loaded.  The gate is the
 * loaded symset's own name, not H_DEC: IBMgraphics and curses carry the same
 * G_* block and would want the same colours if a future session asked for one. */
/* dat/symbols — which symsets define the per-branch `G_*_sokoban: /blue`,
 * `G_*_gehennom: /red`, `G_*_mines: /brown` colour overrides that populate
 * wallcolors[].  The plain/default set defines none.  Read off the loaded
 * symset's name (gs.symset[PRIMARYSET].name), which js/display.js already
 * derives from the rc's `OPTIONS=symset:`; an unset name is the default set. */
const _WALLCOLOR_SYMSETS = new Set(['IBMgraphics', 'IBMGraphics_1', 'IBMGraphics_2',
                                    'DECgraphics', 'curses', 'RogueEpyx',
                                    'RogueIBM', 'RogueWindows']);
function _symset_defines_wall_colors() {
    const ss = gs?.symset?.[PRIMARYSET];
    if (!ss) return false;
    if (_WALLCOLOR_SYMSETS.has(String(ss.name ?? ''))) return true;
    /* Name not recorded by this port's loader: H_DEC is set only by
     * symset:DECgraphics, which does define them. */
    return ss.handling === H_DEC;
}
function _wall_color() {
    /* No symset loaded -> wallcolors[] is display.c:2677's all-CLR_GRAY
     * initialiser, and every branch renders at the main-dungeon colour. */
    if (!_symset_defines_wall_colors())
        return NO_COLOR;
    const uz = game?.u?.uz;
    if (In_mines(uz))
        return CLR_BROWN;
    /* In_hell — dungeon.c:1942 `return svd.dungeons[lev->dnum].flags.hellish`,
     * the same flag word js/mklev.js In_hell and js/makemon.js Inhell() read;
     * inlined here rather than imported to keep display.js free of a mklev.js
     * edge. */
    if (uz && !!(game?.dungeons?.[uz.dnum]?.flags?.hellish))
        return CLR_RED;
    if (Is_knox_level(uz))
        return NO_COLOR;   /* wallcolors[knox_walls] = CLR_GRAY */
    if (In_sokoban(uz))
        return CLR_BLUE;
    return NO_COLOR;       /* wallcolors[main_walls] = CLR_GRAY */
}

/* ── the Rogue symbol set (C symbols.c:186-213 init_rogue_symbols +
 *    symbols.c:217-233 assign_graphics, switched by do.c:1667
 *      assign_graphics(Is_rogue_level(newlevel) ? ROGUESET : PRIMARYSET))
 *
 * On a Rogue level C swaps gs.showsyms wholesale to gr.rogue_syms, which is
 * built from the PLAIN defsyms[] table -- NOT from the loaded symset.  So a
 * session running `OPTIONS=symset:DECgraphics` (38 of the 44 public sessions)
 * still gets ASCII on the Rogue level: C paints `.` where this port painted the
 * DEC centred dot.  Witness: seed0360-wizard-world-tour step 302, C row 10
 * "\e[11C.@." against JS "\e[11C<SO>~<SI>@<SO>~<SI>".
 *
 * init_rogue_symbols then applies exactly four overrides on top of defsyms:
 *     rogue_syms[S_vodoor] = rogue_syms[S_hodoor] = rogue_syms[S_ndoor] = '+'
 *     rogue_syms[S_upstair] = rogue_syms[S_dnstair] = '%'
 * plus the object-class table def_r_oc_syms[] (drawing.c:72-83).  S_vcdoor and
 * S_hcdoor are already '+' in defsyms, and S_brupstair/S_brdnstair are NOT
 * overridden, so branch stairs keep '<'/'>'.
 *
 * COLOUR: on a Rogue level WITHOUT PC graphics every map glyph is NO_COLOR.
 * reset_glyphmap's last act (display.c:3077-3081) is
 *     if ((!has_color(color)
 *          || ((gg.glyphmap_perlevel_flags & GMAP_ROGUELEVEL) && !has_rogue_color))
 *         || !iflags.use_color)
 *         color = NO_COLOR;
 * and has_rogue_color needs HAS_ROGUE_IBM_GRAPHICS (display.c:2582-2587), i.e.
 * `currentgraphics == ROGUESET && SYMHANDLING(H_IBM)`.  These sessions load
 * DECgraphics (H_DEC), never H_IBM, so has_rogue_color is FALSE and the whole
 * map -- terrain, objects, monsters AND the hero -- paints uncoloured.  Witness:
 * seed0360 step 302, C row 10 is "\e[11C.@." while this port wrote
 * "\e[11C.\e[97m@\e[39m." (the CLR_WHITE hero).  It is the glyphmap colour that
 * is cleared, so the mask belongs on the MAP rows only -- the status line and
 * topline keep their colours.  For the same reason nothing on the map can be in
 * DEC mode there: gr.rogue_syms is built from defsyms[], which is plain ASCII. */
function rogue_graphics() {
    return !!Is_rogue_level(game?.u?.uz);
}
/* the DEC line-drawing set is in force only when the PRIMARY symset is (C:
 * gc.currentgraphics == PRIMARYSET), i.e. everywhere except a Rogue level. */
export function dec_mode() {
    return !rogue_graphics() && gs.symset?.[PRIMARYSET]?.handling === H_DEC;
}
/* C drawing.c:72-83 def_r_oc_syms[MAXOCLASSES] -- the four rows that differ
 * from def_oc_syms: armor ']' (not '['), amulet ',' (not '"'), food ':' (not
 * '%'), and gold GEM_SYM '*' (not '$' -- "yes it's the same as gems"). */
const ROGUE_OCLASS_CHAR = {
    3: ']',   /* ARMOR_CLASS  */
    5: ',',   /* AMULET_CLASS */
    7: ':',   /* FOOD_CLASS   */
    12: '*',  /* COIN_CLASS   */
};
const COIN_CLASS_DISP = 12; /* objclass.h COIN_CLASS */
function oclass_sym(oc) {
    if (rogue_graphics()) {
        const r = ROGUE_OCLASS_CHAR[oc | 0];
        if (r)
            return r;
    }
    return OCLASS_CHAR[oc];
}
export function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    const decMode = dec_mode();
    const rogueGfx = rogue_graphics();
    /* Colour for every S_vwall..S_trwall glyph (and SDOOR) below. */
    const wallColor = _wall_color();
    // C ref: display.c:2354-2372 back_to_glyph — every wall case (VWALL..TRWALL)
    // and SDOOR resolve their glyph via `ptr->seenv ? wall_angle(ptr) : S_stone`.
    // wall_angle (display.c:3563) selects the displayed wall glyph from the
    // wall type, its wall_info orientation mode, AND the seen-vector; depending
    // on which faces have been seen it can yield a different corner/T glyph or
    // S_stone (blank).  Without this JS drew a fixed wall glyph for a partly-seen
    // wall where C shows blank stone (seed0013 step 5, vwall at 33,14 mode
    // WM_W_LEFT seenv SV6 -> S_stone).  DBWALL has its own back_to_glyph case
    // (no seenv gate) and is handled by the switch below.
    if ((typ >= VWALL && typ <= TRWALL) || typ === SDOOR)
        return _wall_angle_glyph(loc, decMode);
    switch (typ) {
        case STONE: return { ch: ' ', color: NO_COLOR, dec: false };
        case ROOM:
            // C ref: defsym.h S_room = '.' (ASCII); DECgraphics S_room = \xfe → DEC '~' (centered dot)
            return decMode ? { ch: '~', color: NO_COLOR, dec: true }
                : { ch: '.', color: NO_COLOR, dec: false };
        case CORR: {
            // C ref: display.c:2349 back_to_glyph CORR case —
            //   idx = (ptr->waslit || flags.lit_corridor) ? S_litcorr : S_corr;
            // S_litcorr (lit corridor) renders bright-white (CLR_WHITE → ANSI 97)
            // in these sessions; S_corr (dark corridor) is CLR_GRAY (default).
            // back_to_glyph "assumes hero can see x,y", so the lit form only
            // applies in-sight; an out-of-sight remembered corridor is dark
            // (display.c:1109 downgrades remembered S_litcorr → S_corr when
            // !cansee && !waslit).  Gate on cansee so remembered_glyph stays dark.
            // flags.lit_corridor comes from OPTIONS=lit_corridor (options.js →
            // g.flags.lit_corridor); loc.waslit is the per-cell lit-memory bit
            // (the light-spell litroom path sets white corridors directly).
            const litCorr = cansee(x, y)
                && (loc.waslit || game.flags?.lit_corridor);
            return litCorr
                ? { ch: '#', color: CLR_WHITE, dec: false } // S_litcorr
                : { ch: '#', color: NO_COLOR, dec: false };  // S_corr (dark)
        }
        case DOOR:
            // C ref: display.c:2375-2383 — doormask → symbol index.
            // D_ISOPEN: horizontal → S_hodoor ('|'), vertical → S_vodoor ('-').
            // DECgraphics: both vodoor/hodoor = \xe1 → DEC 'a' (checkerboard).
            // D_CLOSED/D_LOCKED: S_vcdoor/S_hcdoor = '+' (same for ASCII and DEC).
            // D_NODOOR/D_BROKEN: S_ndoor = '.' (ASCII) / DEC '~' (centered dot, \xfe).
            if (loc.doormask & D_ISOPEN) {
                /* C symbols.c:196-197 — rogue_syms[S_vodoor] = [S_hodoor] = '+' */
                if (rogueGfx)
                    return { ch: '+', color: CLR_BROWN, dec: false };
                if (decMode)
                    return { ch: 'a', color: CLR_BROWN, dec: true };
                // C ref: defsym.h — S_vodoor = '-', S_hodoor = '|'
                return loc.horizontal
                    ? { ch: '|', color: CLR_BROWN, dec: false } // S_hodoor
                    : { ch: '-', color: CLR_BROWN, dec: false }; // S_vodoor
            }
            if (loc.doormask & (D_CLOSED | D_LOCKED))
                return { ch: '+', color: CLR_BROWN, dec: false };
            // D_NODOOR / D_BROKEN: S_ndoor
            /* C symbols.c:197 — rogue_syms[S_ndoor] = '+' too, so a doorway
             * with no door still paints '+' on a Rogue level. */
            if (rogueGfx)
                return { ch: '+', color: NO_COLOR, dec: false };
            return decMode ? { ch: '~', color: NO_COLOR, dec: true }
                : { ch: '.', color: NO_COLOR, dec: false };
        case STAIRS: {
            // C ref: display.c:2395-2401 back_to_glyph(STAIRS) — the symbol index
            // (and thus color) is S_brupstair/S_brdnstair (CLR_YELLOW) when
            // known_branch_stairs() holds, else S_upstair/S_dnstair (CLR_GRAY).
            // known_branch_stairs(sway) = sway && sway->tolev.dnum != u.uz.dnum
            //   && sway->u_traversed (stairs.c:180).
            // Up vs down is C's `ptr->ladder & LA_DOWN` (display.c:2350), read
            // straight off the location.  This used to be derived from the
            // recorded game.level.upstair position instead, which only tracks
            // ONE up-staircase per level: on a special level whose .lua places
            // its own stairs (bigrm-7.lua:36-37 des.stair("up"); des.stair
            // ("down")) that stand-in reported the up-stair as a down-stair —
            // measured on seed0399-wizard-hallu-actions step 42, Dlvl 12, where
            // C renders `<` at map (34,6) and we rendered `>`.
            const _isUp = !(((game.level?.at?.(x, y)?.ladder) | 0) & LA_DOWN);
            let _sway = null;
            for (let s = game.stairs; s; s = s.next) {
                if (s.sx === x && s.sy === y) { _sway = s; break; }
            }
            const _uzdnum = (game.u?.uz?.dnum | 0);
            const _branch = !!(_sway && (_sway.tolev?.dnum | 0) !== _uzdnum
                && _sway.u_traversed);
            const _color = _branch ? CLR_YELLOW : CLR_GRAY;
            /* C symbols.c:198 — rogue_syms[S_upstair] = rogue_syms[S_dnstair]
             * = '%'.  S_brupstair / S_brdnstair are NOT in that override list,
             * so a BRANCH stair keeps defsyms' '<' / '>' even on a Rogue
             * level. */
            if (rogueGfx && !_branch)
                return { ch: '%', color: _color, dec: false };
            return { ch: _isUp ? '<' : '>', color: _color, dec: false };
        }
        case LADDER: {
            /* C display.c:2352-2358 back_to_glyph(LADDER) — ladders use
             * S_upladder/S_dnladder (or the branch variants), selected by
             * levl[x][y].ladder and stairway_at().  DECgraphics encodes
             * these as meta-y/meta-z; the recorder's normalized bytes are
             * `y`/`z` with the DEC flag set. */
            const _isUp = !(((game.level?.at?.(x, y)?.ladder) | 0) & LA_DOWN);
            let _sway = null;
            for (let s = game.stairs; s; s = s.next) {
                if (s.sx === x && s.sy === y) { _sway = s; break; }
            }
            const _uzdnum = (game.u?.uz?.dnum | 0);
            const _branch = !!(_sway && (_sway.tolev?.dnum | 0) !== _uzdnum
                && _sway.u_traversed);
            const _color = _branch ? CLR_YELLOW : CLR_BROWN;
            if (rogueGfx)
                return { ch: _isUp ? '<' : '>', color: _color, dec: false };
            return decMode
                ? { ch: _isUp ? 'y' : 'z', color: _color, dec: true }
                : { ch: _isUp ? '<' : '>', color: _color, dec: false };
        }
        // Wall types — DECgraphics line-drawing vs ASCII PCHAR glyphs.
        // C ref: defsym.h — ASCII: S_hwall='-', S_vwall='|', S_tlcorn/trcorn/blcorn/brcorn='-',
        //   S_crwall/tuwall/tdwall='-', S_tlwall/trwall='|'.
        // C ref: dat/symbols DECgraphics — S_hwall=\xf1→'q', S_vwall=\xf8→'x',
        //   corners: l/k/m/j, S_crwall=\xee→'n', S_tuwall=\xf6→'v', S_tdwall=\xf7→'w',
        //   S_tlwall=\xf5→'u', S_trwall=\xf4→'t'.
        case HWALL: return decMode ? { ch: 'q', color: wallColor, dec: true } // ─
            : { ch: '-', color: wallColor, dec: false };
        case VWALL: return decMode ? { ch: 'x', color: wallColor, dec: true } // │
            : { ch: '|', color: wallColor, dec: false };
        case TLCORNER: return decMode ? { ch: 'l', color: wallColor, dec: true } // ┌
            : { ch: '-', color: wallColor, dec: false };
        case TRCORNER: return decMode ? { ch: 'k', color: wallColor, dec: true } // ┐
            : { ch: '-', color: wallColor, dec: false };
        case BLCORNER: return decMode ? { ch: 'm', color: wallColor, dec: true } // └
            : { ch: '-', color: wallColor, dec: false };
        case BRCORNER: return decMode ? { ch: 'j', color: wallColor, dec: true } // ┘
            : { ch: '-', color: wallColor, dec: false };
        case CROSSWALL: return decMode ? { ch: 'n', color: wallColor, dec: true } // ┼
            : { ch: '-', color: wallColor, dec: false };
        case TUWALL: return decMode ? { ch: 'v', color: wallColor, dec: true } // ┴
            : { ch: '-', color: wallColor, dec: false };
        case TDWALL: return decMode ? { ch: 'w', color: wallColor, dec: true } // ┬
            : { ch: '-', color: wallColor, dec: false };
        case TLWALL: return decMode ? { ch: 'u', color: wallColor, dec: true } // ┤
            : { ch: '|', color: wallColor, dec: false };
        case TRWALL: return decMode ? { ch: 't', color: wallColor, dec: true } // ├
            : { ch: '|', color: wallColor, dec: false };
        // C ref: display.c:3649 wall_angle() — SDOOR renders as its underlying wall type.
        // If lev->horizontal, it's in a horizontal wall → S_hwall.
        // Otherwise falls through to VWALL → S_vwall.
        case SDOOR: return loc.horizontal
            ? (decMode ? { ch: 'q', color: wallColor, dec: true } // horizontal → HWALL ─
                : { ch: '-', color: wallColor, dec: false })
            : (decMode ? { ch: 'x', color: wallColor, dec: true } // vertical → VWALL │
                : { ch: '|', color: wallColor, dec: false });
        // C ref: display.c:2338 back_to_glyph — SCORR falls through to STONE → S_stone = ' '.
        case SCORR: return { ch: ' ', color: NO_COLOR, dec: false }; // hidden corridor = STONE (invisible)
        // C ref: defsym.h PCHAR entries — remaining terrain types.
        // HI_METAL=CLR_CYAN, HI_GOLD=CLR_YELLOW (color.h).
        /* The non-wall terrain symbols that dat/symbols ALSO overrides in the
         * DECgraphics symset (the `start: DECgraphics` block, dat/symbols:689).
         * These were all emitting their ASCII PCHAR glyph unconditionally, so a
         * DECgraphics session drew '}' for water/lava where C draws the DEC
         * diamond, '#' for a tree where C draws the DEC plus-or-minus, and so
         * on.  As with the wall cases above, `ch` is the DEC byte with the high
         * bit stripped (\xe0 → '`', \xe7 → 'g', \xfc → '|', \xfe → '~',
         * \xfb → '{') and `dec: true` marks it for the G1 charset.
         * Colors are unchanged — they come from defsym.h PCHAR, not the symset. */
        // C ref: dat/symbols:707 S_bars: \xfc (meta-|, not-equals); defsym.h:110 HI_METAL.
        case IRONBARS: return decMode ? { ch: '|', color: CLR_CYAN, dec: true }
            : { ch: '#', color: CLR_CYAN, dec: false };
        // C ref: dat/symbols:708 S_tree: \xe7 (meta-g, plus-or-minus); defsym.h:111 CLR_GREEN.
        case TREE: return decMode ? { ch: 'g', color: CLR_GREEN, dec: true }
            : { ch: '#', color: CLR_GREEN, dec: false };
        // C ref: dat/symbols:715 S_pool: \xe0 (meta-\, diamond); defsym.h:136 CLR_BLUE.
        case POOL:
        case MOAT: {
            /* C symbols.c applies an explicit SYMBOLS=S_pool:<char> override
             * after the active symset.  Such an override is an ordinary tty
             * character, not a DEC graphics byte. */
            const override = game.symbolOverrides?.S_pool;
            if (override)
                return { ch: override, color: CLR_BLUE, dec: false };
            return decMode ? { ch: '`', color: CLR_BLUE, dec: true }
                : { ch: '}', color: CLR_BLUE, dec: false };
        }
        // C ref: dat/symbols:721 S_water: \xe0; defsym.h:152 CLR_BRIGHT_BLUE.
        case WATER: return decMode ? { ch: '`', color: CLR_BRIGHT_BLUE, dec: true }
            : { ch: '}', color: CLR_BRIGHT_BLUE, dec: false };
        // C ref: dat/symbols:717 S_lava: \xe0; defsym.h:138 CLR_RED.
        case LAVAPOOL: return decMode ? { ch: '`', color: CLR_RED, dec: true }
            : { ch: '}', color: CLR_RED, dec: false };
        /* C ref: defsym.h:139 PCHAR(41,'}',S_lavawall,"wall of lava",CLR_ORANGE)
         * + dat/symbols:718 S_lavawall: \xe0.  LAVAWALL had NO case at all, so
         * it fell through to the `default:` arm and rendered an uncolored '?'.
         * (seed0777 step 37, screen row 19 col 7: C draws an ORANGE DEC diamond,
         * JS drew '?'.) */
        case LAVAWALL: return decMode ? { ch: '`', color: CLR_ORANGE, dec: true }
            : { ch: '}', color: CLR_ORANGE, dec: false };
        case FOUNTAIN: return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false }; // S_fountain CLR_BRIGHT_BLUE (no DEC override)
        case SINK: return { ch: '{', color: CLR_WHITE, dec: false }; // S_sink CLR_WHITE (no DEC override)
        case THRONE: return { ch: '\\', color: CLR_YELLOW, dec: false }; // S_throne HI_GOLD=CLR_YELLOW (no DEC override)
        case GRAVE: return { ch: '|', color: CLR_WHITE, dec: false }; // S_grave CLR_WHITE (no DEC override)
        /* C ref: dat/symbols:714 S_altar: \xfb (meta-{, pi); defsym.h:129 gives
         * S_altar the base colour CLR_GRAY — but an altar is the one cmap cell
         * whose colour does NOT come from defsyms.  display.c:2365-2367
         *     case ALTAR:
         *         idx = S_altar;  \/* not really used *\/
         *         bypass_glyph = altar_to_glyph(ptr->altarmask);
         * emits one of the FIVE per-alignment altar glyphs, and map_glyphinfo
         * (display.c:2918-2925) colours those from `altarcolors[offset]`
         * (display.c:2666), not from the cmap table:
         *     altar_color_unaligned = CLR_RED           (display.h:291)
         *     altar_color_chaotic/neutral/lawful = CLR_GRAY
         *         (USE_GENERAL_ALTAR_COLORS is never defined in this tree —
         *          it appears exactly once, as the #if at display.h:292)
         *     altar_color_other     = CLR_BRIGHT_MAGETA (the AM_SANCTUM altar)
         * so the constant CLR_GRAY here was right for three of the five and
         * WRONG for the two that matter on a special level.
         *
         * MEASURED on seed0367 step 185: the Priest quest home level places
         * `des.altar({ x=28, y=09, align="noalign", type="altar" })`
         * (dat/Pri-strt.lua:72) — an UNALIGNED altar, which C paints CLR_RED
         * and this port painted grey, one cell diagonally below the hero the
         * moment the ^T teleport put her in the temple. */
        case ALTAR: {
            /* C ref: display.h:569-579 altar_to_glyph(amsk) — the offset into
             * altarcolors[].  js/game.js:9 records C's `#define altarmask flags`
             * union, and js/look.js:206 reads it with the same fallback. */
            const _lev = game.level?.at?.(x, y);
            const _amask = ((_lev?.altarmask ?? _lev?.flags) | 0);
            const _acolor =
                ((_amask & AM_SANCTUM) === AM_SANCTUM) ? CLR_BRIGHT_MAGENTA
                : ((_amask & AM_MASK) === AM_LAWFUL) ? CLR_GRAY
                    : ((_amask & AM_MASK) === AM_NEUTRAL) ? CLR_GRAY
                        : ((_amask & AM_MASK) === AM_CHAOTIC) ? CLR_GRAY
                            : CLR_RED /* AM_NONE — altar_color_unaligned */;
            return decMode ? { ch: '{', color: _acolor, dec: true }
                : { ch: '_', color: _acolor, dec: false };
        }
        // C ref: dat/symbols:716 S_ice: \xfe (meta-~, centered dot); defsym.h:137 CLR_CYAN.
        case ICE: return decMode ? { ch: '~', color: CLR_CYAN, dec: true }
            : { ch: '.', color: CLR_CYAN, dec: false };
        case DRAWBRIDGE_UP: return { ch: '#', color: CLR_BROWN, dec: false }; // S_vcdbridge (no DEC override)
        // C ref: dat/symbols:719-720 S_vodbridge/S_hodbridge: \xfe; defsym.h:140 CLR_BROWN.
        case DRAWBRIDGE_DOWN: return decMode ? { ch: '~', color: CLR_BROWN, dec: true }
            : { ch: '.', color: CLR_BROWN, dec: false };
        case AIR: return { ch: ' ', color: CLR_CYAN, dec: false }; // S_air CLR_CYAN
        case CLOUD: return { ch: '#', color: CLR_GRAY, dec: false }; // S_cloud CLR_GRAY
        default: return { ch: '?', color: NO_COLOR, dec: false };
    }
}
// ── Dark-room re-glyph (S_darkroom) ──
// C ref: display.c:1116-1123 newsym() out-of-sight branch + sym.h:96 DARKROOMSYM
// + defsym.h:113 PCHAR(20,'.',S_darkroom,...,CLR_BLACK).
// When a remembered ROOM-floor cell goes out of the hero's sight, C re-glyphs it:
//   if (!waslit || (flags.dark_room && iflags.use_color))
//       else if (glyph == S_room && typ == ROOM) glyph = DARKROOMSYM (S_darkroom)
// DARKROOMSYM = (Is_rogue_level ? S_stone : S_darkroom).  flags.dark_room (flag.h:27)
// defaults On (optlist.h:261) and iflags.use_color defaults On, and the contest
// sessions never toggle either, so we treat both as constant-true here (same
// convention as the rest of this file's always-emit-color rendering).  Dlvl-1
// rooms are never rogue-level, so DARKROOMSYM resolves to S_darkroom.
// S_darkroom = char '.' (ASCII) / DEC '~' for the floor body, recolored CLR_BLACK
// (ANSI 90 — bright black "dark gray"); the underlying char/decgfx is unchanged
// from S_room, only the color darkens.  RNG-neutral (pure render).
// Returns true if `rg` (a remembered_glyph {ch,color,decgfx}) was the plain S_room
// floor glyph and has been mutated in place to S_darkroom; false otherwise.
export function _darken_room_floor(loc, rg) {
    // C: typ == ROOM gate.
    if (!loc || loc.typ !== ROOM || !rg)
        return false;
    // C: glyph == cmap_to_glyph(S_room) — the plain floor glyph, not an object/
    // trap/engraving/door remembered on this cell.  S_room is NO_COLOR floor:
    // ASCII '.' (decgfx false) or DECgraphics '~' (decgfx true).  Already-dark
    // (CLR_BLACK) cells are left as-is (idempotent re-glyph).
    const isAsciiFloor = rg.ch === '.' && !rg.decgfx;
    const isDecFloor = rg.ch === '~' && rg.decgfx;
    if ((isAsciiFloor || isDecFloor) && rg.color === NO_COLOR) {
        rg.color = CLR_BLACK; // S_darkroom color → ANSI 90
        return true;
    }
    return false;
}
// ── Lit-corridor re-glyph (S_litcorr → S_corr) ──
// C ref: display.c:1116-1119 newsym() out-of-sight branch (mirrored at
// display.c:242-249 _map_location, :858-860 feel_location, :904-906 map under
// monster).  An in-sight corridor with flags.lit_corridor set (or waslit) is
// remembered as S_litcorr (bright-white '#').  When that cell leaves the hero's
// sight C demotes the remembered glyph back to S_corr (dark/gray '#') whenever
// the cell was not actually `waslit`:
//   if (lev->glyph == cmap_to_glyph(S_litcorr) && lev->typ == CORR)
//       show_glyph(x, y, lev->glyph = cmap_to_glyph(S_corr));
// This is the corridor analogue of _darken_room_floor and is gated identically
// (typ==CORR, glyph==S_litcorr).  The C `!waslit` precondition is enforced by
// the caller: a waslit corridor keeps its lit memory (light-spell litroom path).
// S_litcorr renders '#' CLR_WHITE; S_corr renders '#' NO_COLOR — only the color
// darkens, char/decgfx are unchanged.  RNG-neutral (pure render).
// Returns true if `rg` was the lit-corridor glyph and has been mutated in place.
export function _darken_corridor(loc, rg) {
    // C: typ == CORR gate.
    if (!loc || loc.typ !== CORR || !rg)
        return false;
    // C: glyph == cmap_to_glyph(S_litcorr) — the bright-white corridor glyph
    // ('#', CLR_WHITE, ASCII).  S_corr ('#', NO_COLOR) is already dark and left
    // as-is (idempotent re-glyph).
    if (rg.ch === '#' && !rg.decgfx && rg.color === CLR_WHITE) {
        rg.color = NO_COLOR; // S_corr color → default/gray
        return true;
    }
    return false;
}
// ── reglyph_darkroom ──
// C ref: display.c:1860-1897 reglyph_darkroom — toggle dark-room glyphs when
// flags.dark_room changes.  Called when the player toggles the dark_room option.
// In JS we work on loc.remembered_glyph objects (the port's equivalent of
// lev->glyph) rather than integer glyphs.
export function reglyph_darkroom() {
    const dark_room = game.flags?.dark_room;
    const use_color = game.iflags?.use_color;
    const is_rogue = Is_rogue_level(game.u?.uz);

    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            const rg = loc.remembered_glyph;
            if (!rg) continue;

            // C: if (!flags.dark_room) { S_corr + waslit → S_litcorr }
            // C: else { S_litcorr + !cansee → S_corr }
            if (!dark_room) {
                // S_corr: '#' NO_COLOR
                if (rg.ch === '#' && !rg.decgfx && rg.color === NO_COLOR
                    && loc.waslit) {
                    // → S_litcorr: '#' CLR_WHITE
                    rg.color = CLR_WHITE;
                }
            } else {
                // S_litcorr: '#' CLR_WHITE
                if (rg.ch === '#' && !rg.decgfx && rg.color === CLR_WHITE
                    && !cansee(x, y)) {
                    // → S_corr: '#' NO_COLOR
                    rg.color = NO_COLOR;
                }
            }

            // C: if (!dark_room || !use_color || Is_rogue_level) { demote darkroom }
            // C: else { promote room/nothing → darkroom }
            if (!dark_room || !use_color || is_rogue) {
                // S_darkroom: '.' CLR_BLACK (ASCII) or '~' CLR_BLACK (DEC)
                const isDarkAscii = rg.ch === '.' && !rg.decgfx && rg.color === CLR_BLACK;
                const isDarkDec = rg.ch === '~' && rg.decgfx && rg.color === CLR_BLACK;
                if (isDarkAscii || isDarkDec) {
                    if (loc.waslit) {
                        // → S_room: '.' NO_COLOR or '~' NO_COLOR
                        rg.color = NO_COLOR;
                    } else {
                        // → GLYPH_NOTHING: ' ' NO_COLOR
                        rg.ch = ' ';
                        rg.color = NO_COLOR;
                        rg.decgfx = false;
                    }
                }
            } else {
                // dark_room && use_color && !is_rogue
                // S_room → S_darkroom: '.' NO_COLOR → '.' CLR_BLACK (or '~')
                const isRoomAscii = rg.ch === '.' && !rg.decgfx && rg.color === NO_COLOR;
                const isRoomDec = rg.ch === '~' && rg.decgfx && rg.color === NO_COLOR;
                if ((isRoomAscii || isRoomDec) && loc.seenv && loc.waslit && !cansee(x, y)) {
                    rg.color = CLR_BLACK; // → S_darkroom
                } else if (rg.ch === ' ' && !rg.decgfx && rg.color === NO_COLOR
                    && loc.typ === ROOM && loc.seenv && !cansee(x, y)) {
                    // GLYPH_NOTHING + typ==ROOM + seenv + !cansee → S_darkroom
                    rg.ch = dec_mode() ? '~' : '.';
                    rg.color = CLR_BLACK;
                    rg.decgfx = dec_mode();
                }
            }
        }
    }

    // C: gs.showsyms[S_darkroom] assignment
    // S_darkroom = 20, S_room = 19, SYM_NOTHING = 0, SYM_OFF_X = ...
    const S_darkroom = 20;
    const S_room = 19;
    const SYM_NOTHING = 0;
    // SYM_OFF_X = SYM_OFF_W + WARNCOUNT; SYM_OFF_W = SYM_OFF_M + MAXMCLASSES;
    // SYM_OFF_M = SYM_OFF_O + MAXOCLASSES; SYM_OFF_O = SYM_OFF_P + MAXPCHARS;
    // MAXPCHARS=105, MAXOCLASSES=18, MAXMCLASSES=..., WARNCOUNT=6
    const MAXPCHARS = 105;
    const MAXOCLASSES = 18;
    const MAXMCLASSES = 61;  // C monsters.h MAXMCLASSES
    const WARNCOUNT = 6;
    const SYM_OFF_O = MAXPCHARS;
    const SYM_OFF_M = SYM_OFF_O + MAXOCLASSES;
    const SYM_OFF_W = SYM_OFF_M + MAXMCLASSES;
    const SYM_OFF_X = SYM_OFF_W + WARNCOUNT;

    if (gs.showsyms) {
        if (dark_room && use_color)
            gs.showsyms[S_darkroom] = gs.showsyms[S_room];
        else
            gs.showsyms[S_darkroom] = gs.showsyms[SYM_NOTHING + SYM_OFF_X];
    }
}
/* ── Displayed-glyph CLASS (the port's analogue of C's glyph number) ─────────
 * C's gg.gbuf[y][x] holds a full glyph number, so glyph_at(x,y) lets any caller
 * ask glyph_is_monster/glyph_is_object/glyph_is_trap/glyph_is_cmap about what is
 * CURRENTLY PAINTED at a spot.  This port's display cell carries only the
 * rendered {ch,color,decgfx}, which loses that class — so pager.c's look_all()/
 * look_traps()/look_engrs() (the '/m', '/M', '/o', '/O', '/t', '/T', '/e', '/E'
 * map scans) had nothing to branch on.  These tags restore the missing half:
 * every paint records which glyph FAMILY it came from, exactly where C's glyph
 * number would encode it.  Purely additive — nothing in the render path reads
 * them. */
export const GLYPHCLS_CMAP = 'cmap';   /* terrain / dungeon feature */
export const GLYPHCLS_MON = 'mon';     /* monster, pet, or the hero */
export const GLYPHCLS_OBJ = 'obj';     /* object, corpse, or statue */
export const GLYPHCLS_TRAP = 'trap';   /* seen trap */
export const GLYPHCLS_ENGR = 'engr';   /* cmap glyph with is_cmap_engraving(sym) */
export const GLYPHCLS_INVIS = 'invis'; /* GLYPH_INVISIBLE "I" marker */
// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0,
                                cls = GLYPHCLS_CMAP, isWarning = false,
                                objectType = null, objectCorpsenm = null) {
    const loc = game.level?.at(x, y);
    if (!loc)
        return;
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.disp_cls = cls;
    /* C's display buffer retains the full glyph number.  Object farlook needs
     * its encoded otyp, which cannot be recovered from the rendered symbol or
     * colour (many object types share both). */
    loc.disp_obj_otyp = (cls === GLYPHCLS_OBJ && Number.isInteger(objectType))
        ? objectType : null;
    loc.disp_obj_corpsenm = (loc.disp_obj_otyp === CORPSE
                             && Number.isInteger(objectCorpsenm))
        ? objectCorpsenm : null;
    loc.disp_is_warning = !!isWarning;
    loc.gnew = 1;
}
// C ref: display.c:378-385 map_invisible(x,y) — place the "I" (GLYPH_INVISIBLE)
// marker at (x,y) when a monster at that position cannot be spotted by the hero.
// Called from pre_mm_attack (mhitm.c:63-64) when !canspotmon(magr/mdef) and gv.vis.
// In C: if hero_memory, sets levl[x][y].glyph=GLYPH_INVISIBLE; then show_glyph(x,y,I).
// Simplified JS: display 'I' (dim, no color) at that tile, skip if it's the hero's pos.
export function map_invisible(x, y) {
    const u = game?.u;
    if (u && (x | 0) === (u.ux | 0) && (y | 0) === (u.uy | 0)) return; /* skip hero's tile */
    /* C display.c:381-382 —
     *     if (svl.level.flags.hero_memory) levl[x][y].glyph = GLYPH_INVISIBLE;
     * The marker is written into HERO MEMORY, not just the glyph buffer: it is
     * what makes the "I" survive every later repaint of that tile (newsym's own
     * `else if (glyph_is_invisible(lev->glyph)) map_invisible(x, y);` at
     * display.c:1031-1032, docrt, and the out-of-sight remembered branch), until
     * unmap_invisible() explicitly clears it.  This port painted only the disp
     * cell, so the first repaint of the tile reverted it to the remembered
     * terrain: seed0030 segment 1 step 53, where C keeps the I at (49,5) and
     * this port showed the corridor `#` again. */
    const loc = game?.level?.at(x, y);
    if (loc && game.level?.flags?.hero_memory)
        loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false,
                                 cls: GLYPHCLS_INVIS };
    show_glyph_cell(x, y, 'I', NO_COLOR, false, 0, GLYPHCLS_INVIS);
}

/* C ref: display.c:387-397 unmap_invisible(x,y) — remove the invisible-monster
   marker from (x,y) when the hero realizes the monster is no longer there. */
/* C ref: display.h glyph_is_invisible(glyph) — is the tile's REMEMBERED glyph
 * the "remembered, unseen monster" marker?  js/ stores hero memory as
 * loc.remembered_glyph, and 'I' is the marker map_invisible() writes.  Exported
 * because C tests it at four sites outside display.c (mon.c:3170 mondead,
 * mon.c:3358 the statue path, uhitm.c:210/231), and each of those was
 * re-deriving or omitting the test. */
// wave15/harness (2026-09-05, TASK B): uhitm.c:210/231's calls (cited above)
// are BOTH `glyph_is_invisible(glyph)` where `glyph = glyph_at(bhitpos.x,
// bhitpos.y)` -- the TRANSIENT SCREEN BUFFER (gg.gbuf), not hero memory. The
// memory-only body below is a real approximation for those two call sites
// -- the difference is visible only when a cell's current gbuf glyph
// diverges from remembered levl[][].glyph, which an isolated capture-replay
// can expose but ordinary single-pass gameplay rarely does, since JS
// repaints memory and screen together in the same call.
// patches/010-capture-surface.patch capture_emit_gbuf_glyphs() now captures
// the real gg.gbuf value for do_attack; the replay bridge
// (js/mapstate_game_bridge.js applyGbufGlyphsToGame) stores it as
// game.__gbuf__ (a flat {"x,y":glyph} map, present ONLY during a replay of
// a record that captured it). Consult it FIRST when it covers this exact
// cell -- more faithful than the memory approximation for the two call
// sites the constant was measured against -- falling back to hero memory
// for any cell it does not cover (every other call site, and every record
// that never captured it, INCLUDING every real game -- game.__gbuf__ is
// never populated outside this replay harness, so ordinary gameplay is
// completely unaffected).
const GBUF_GLYPH_INVISIBLE = 1532; // LOCKSTEP with js/mapstate_game_bridge.js's
                                    // own GLYPH_INVISIBLE=1532 (same measured
                                    // constant; duplicated rather than
                                    // imported to avoid a display.js <->
                                    // mapstate_game_bridge.js import cycle).
// C glyph_is_warning(glyph_at(x,y)): inspect the painted glyph, not whether
// a monster could trigger Warning. A visible mimic can still look like an object.
export function glyph_is_warning_at(x, y) {
    if (!isok(x, y)) return false;
    const glyph = game.__gbuf__?.[`${x | 0},${y | 0}`];
    if (glyph !== undefined) return glyph >= 7220 && glyph < 7220 + WARNCOUNT;
    return !!game.level?.at?.(x, y)?.disp_is_warning;
}
export function glyph_is_invisible_at(x, y) {
    if (!isok(x, y)) return false;
    const gbuf = game.__gbuf__;
    if (gbuf) {
        const v = gbuf[`${x | 0},${y | 0}`];
        if (v !== undefined) return v === GBUF_GLYPH_INVISIBLE;
    }
    const loc = game.level?.at?.(x, y);
    return !!(loc && loc.remembered_glyph && loc.remembered_glyph.ch === 'I');
}
export function unmap_invisible(x, y) {
    if (isok(x, y)) {
        const loc = game.level.at(x, y);
        const rg = loc?.remembered_glyph;
        if (rg && rg.ch === 'I') {
            unmap_object(x, y);
            newsym(x, y);
            return true;
        }
    }
    return false;
}

/* ---- helpers for map_object ---- */

/* C ref: display.h:809 obj_is_generic — an undiscovered (!dknown) potion, real-
 * or-glass gem, or spellbook displays as the CLASS-generic glyph (color CLR_GRAY),
 * NOT its randomized appearance color.  Scrolls/wands/etc. have a fixed per-otyp
 * color regardless of discovery, so they are excluded.  The dknown gate is
 * applied by the caller. */
const POTION_CLASS_OC = 8;
/* otyp landmarks below were off by one (anchored to the pre-Wave-D otyp
 * numbering, before the mail scroll insertion at 364 shifted every otyp from
 * SPE_DIG onward by +1 — see js/mklev.js:184, js/zap.js:85, js/spell.js:18-20,
 * js/u_init.js:1000). The stale FIRST_REAL_GEM_OTYP=438 collided with
 * GOLD_PIECE (also 438 in this build's otyp numbering, js/eat.js:1846),
 * wrongly classifying gold as an undiscovered-gem generic glyph (CLR_GRAY)
 * once clear_dknown started correctly zeroing gold's dknown (oc_merge fix). */
const FIRST_REAL_GEM_OTYP = 439;  /* DILITHIUM_CRYSTAL (js/dokick.js:242, js/makemon.js:1747) */
const LAST_GLASS_GEM_OTYP = 469;  /* worthless piece of violet glass (js/makemon.js:1749 LUCKSTONE=470, -1) */
const FIRST_SPELL_OTYP = 366;     /* SPE_DIG (js/zap.js:85, js/spell.js:18) */
const LAST_SPELL_OTYP = 407;      /* SPE_BLANK_PAPER (js/mklev.js:184, js/spell.js:20, js/u_init.js:1000) */
function _obj_is_generic(otyp, oclass) {
    return oclass === POTION_CLASS_OC
        || (otyp >= FIRST_REAL_GEM_OTYP && otyp <= LAST_GLASS_GEM_OTYP)
        || (otyp >= FIRST_SPELL_OTYP && otyp <= LAST_SPELL_OTYP);
}
/* C ref: display.h:798-802 obj_is_piletop(obj) —
 *     (obj)->where == OBJ_FLOOR
 *     && ((go.otg_otmp = svl.level.objects[(obj)->ox][(obj)->oy]->nexthere) != 0)
 *     && ((obj)->otyp != BOULDER || go.otg_otmp->otyp == BOULDER)
 * Note it tests the TILE HEAD's nexthere, not the object's own: "piletop" means
 * this square carries more than one stack, and a boulder hides the pile unless
 * it is sitting on another boulder. */
function _obj_is_piletop(obj) {
    if (!obj || (obj.where | 0) !== OBJ_FLOOR)
        return false;
    const head = game.level?.levelObjects?.[obj.ox | 0]?.[obj.oy | 0] ?? null;
    const otg_otmp = head ? (head.nexthere ?? null) : null;
    if (!otg_otmp)
        return false;
    return (obj.otyp | 0) !== BOULDER_OTYP
        || (otg_otmp.otyp | 0) === BOULDER_OTYP;
}
/* C ref: display.c:2788/2795/2802/2821 — every PILETOP glyph class (obj, body,
 * male/female statue) carries MG_OBJPILE, and win/tty/wintty.c:3930 turns that
 * into term_start_attr(ATR_INVERSE) when iflags.hilite_pile && iflags.use_inverse.
 * ATR_INVERSE == 1 in this port (js/terminal.js:26), the same value the
 * hilite_pet path below uses.
 *
 * THE SPLIT MATTERS.  In C the *glyph* records piletop-ness and print_glyph()
 * re-derives the attribute from the CURRENT option every time the cell is
 * painted, including when it is painted out of hero memory.  So the flag is
 * what gets remembered (`objpile` on this port's glyph objects) and the
 * attribute is computed at paint time.  Baking the attribute into memory
 * instead loses the hilite on every square the hero saw BEFORE turning
 * hilite_pile on — which is exactly seed0012, where the option is toggled on at
 * step ~60 and the pile in the starting room was mapped at step 0.
 *
 * Both options resolve the way the options MENU resolves them (js/optmenu.js
 * flagOn / boolValue): the live value if written, else the optlist.h initval.
 * use_inverse's initval is On (include/optlist.h, iflags.wc_inverse), so an
 * unwritten slot must read TRUE here — reading it as undefined-is-false would
 * silently disable every hilite. */
function _pile_hilite(objpile) {
    if (!objpile)
        return 0;
    /* C optlist.h: `NHOPTB(hilite_pile, ..., &iflags.hilite_pile, ...)` — the
     * storage is iflags, not flags.  Same class as the hilite_pet read below:
     * this name worked only because doset_simple() wrote the toggle to the
     * matching wrong name (js/optmenu.js), and it moves with it. */
    if (!game.iflags?.hilite_pile)
        return 0;
    if (game.iflags?.wc_inverse === false)
        return 0;
    return 1; /* ATR_INVERSE */
}
/* C ref: display.c:2940-2945 — the CMAP_A arm of map_glyphinfo():
 *     } else if (cmap == S_engrcorr
 *                && (sym == gs.showsyms[S_corr + SYM_OFF_P]
 *                    || sym == gs.showsyms[S_litcorr + SYM_OFF_P])) {
 *         gmap->glyphflags |= MG_BW_ENGR;
 *     }
 * and win/tty/wintty.c:3930-3936, which turns MG_BW_ENGR (with MG_DETECT and
 * the other three MG_BW_* flags) into term_start_attr(ATR_INVERSE) whenever
 * iflags.use_inverse is on.  NOTE what does NOT gate it: hilite_pile gates only
 * MG_OBJPILE, and — despite the stale comment at wintty.c:3919 claiming
 * "BW_LAVA, BW_ICE, BW_SINK, BW_ENGR won't ever be set when color is on" — the
 * ENGR flag is set OUTSIDE the `if (!iflags.use_color)` block that guards the
 * other three (display.c:2890 vs :2924), so a colour terminal gets it too.
 *
 * An engraving in a CORRIDOR draws S_engrcorr, which is '#' — the same
 * character as S_corr and S_litcorr — so C reverse-videos it to keep it
 * distinguishable, and this port painted it plain.  The room spelling
 * (S_engroom, '`') has no such collision and gets no flag.
 *
 * Re-derived at paint time from a REMEMBERED flag, exactly as MG_OBJPILE is
 * above and for the same reason: C stores the flag on the glyph and print_glyph
 * consults the live option each time the cell is drawn, so a use_inverse toggle
 * must reach squares mapped before the toggle. */
function _bw_engr_hilite(bwengr) {
    if (!bwengr)
        return 0;
    if (game.iflags?.wc_inverse === false)
        return 0;
    return 1; /* ATR_INVERSE */
}
/* The attribute a remembered glyph paints with: MG_OBJPILE and MG_BW_ENGR are
 * re-derived, any other baked attr is passed through. */
function _glyph_attr(rg) {
    if (!rg)
        return 0;
    if (rg.objpile)
        return _pile_hilite(true);
    if (rg.bwengr)
        return _bw_engr_hilite(true);
    return (rg.attr | 0);
}
function _obj_to_glyph(obj) {
    const otyp = (obj.otyp | 0);
    /* C display.c:2788-2821 — MG_OBJPILE, applied by the tty as ATR_INVERSE. */
    const pileTop = _obj_is_piletop(obj);
    /* C display.h:963-968 obj_to_glyph — STATUE is tested first and
     * statue_to_glyph() carries its OWN Hallucination arm, then
     * `(Hallucination) ? random_obj_to_glyph(rng)` covers every other object.
     * _hallucinated_obj_glyph() is both of those arms, so one test here is the
     * whole hallucinating half of C's chain.  Gated on _hallucinating_dsp(),
     * the live uprops expression, NOT on `game.Hallucination` — that field has
     * no writer anywhere in js/, so every reader of it is a dead guard. */
    if (_hallucinating_dsp())
        return _hallucinated_obj_glyph(obj);
    if (otyp === STATUE) {
        const scnm = (obj.corpsenm | 0);
        const smlet = (scnm >= 0 && scnm < MON_MLET.length) ? MON_MLET[scnm] : 53;
        return { ch: DEF_MONSYM_CHARS[smlet] ?? '@', color: CLR_WHITE, decgfx: false,
                 objpile: pileTop, cls: GLYPHCLS_OBJ, otyp };
    }
    /* objects.h:78 — `OBJECT(OBJ("strange object", NoDes), ..., ILLOBJ_CLASS,
     * ..., 0, STRANGE_OBJECT)` is objects[0], a REAL row: STRANGE_OBJECT is
     * otyp 0, its oc_class is ILLOBJ_CLASS (']') and its oc_color is CLR_BLACK.
     * The guard used to be `otyp > 0`, which sent every otyp-0 object down the
     * `obj.oclass | 0` fallback; display.c:564-576's mimic zeroobj carries
     * oclass 0, so a mimic disguised as a strange object -- what
     * set_mimic_sym()'s `s_sym == S_MIMIC_DEF` arm (makemon.c:2506) gives every
     * shop mimic on a shallow level -- rendered as RANDOM_CLASS's '?' instead
     * of ']'.  seed0030 segment 3: the mimic in Maganasipi's general store. */
    const oc = (otyp >= 0 && otyp < MKOBJ_OC_CLASS.length)
        ? MKOBJ_OC_CLASS[otyp] : (obj.oclass | 0);
    const och = oclass_sym(oc) ?? '?';
    /* C ref: display.h:966 obj_to_glyph — generic_obj_to_glyph(obj) for an
     * undiscovered potion/gem/spellbook uses objects[oclass].oc_color = CLR_GRAY
     * (objects.h:75 GENERIC macro), so the map glyph renders at terminal default
     * until the hero gets close enough to observe_object() the appearance.
     * Hallucination takes precedence in C and now does here too — the arm
     * above returns random_obj_to_glyph() before this point, which is why the
     * `!Hallucination` term this condition used to carry is gone rather than
     * rewritten: C's obj_is_generic() has no Hallucination term either. */
    if (otyp !== CORPSE && !(obj.dknown | 0)
        && _obj_is_generic(otyp, obj.oclass | 0)) {
        /* generic_obj_to_glyph uses the object's stored class as an object
         * index. A mimic's zeroobj deliberately has oclass=0 even when its
         * otyp is a gem: that maps to STRANGE_OBJECT, not a generic gem. */
        const genericIndex = obj.oclass | 0;
        return { ch: oclass_sym(MKOBJ_OC_CLASS[genericIndex]) ?? '?',
                 color: MKOBJ_OC_COLOR[genericIndex] ?? CLR_GRAY, decgfx: false,
                 objpile: pileTop, cls: GLYPHCLS_OBJ, otyp: genericIndex };
    }
    const isCorpse = (otyp === CORPSE);
    const corpsenm = (obj.corpsenm | 0);
    const shufCol = game._objColors?.[otyp];
    const ocol = isCorpse
        ? ((corpsenm >= 0 && corpsenm < MON_MCOLOR.length) ? MON_MCOLOR[corpsenm] : 7)
        : (shufCol !== undefined
            ? shufCol
            : ((otyp >= 0 && otyp < MKOBJ_OC_COLOR.length)
                ? MKOBJ_OC_COLOR[otyp]
                : (OCLASS_COLOR[oc] ?? 7)));
    return { ch: och, color: ocol, decgfx: false, objpile: pileTop,
             cls: GLYPHCLS_OBJ, otyp,
             corpsenm: isCorpse ? corpsenm : undefined };
}

/* C display.h:844 glyph_is_generic_object(obj_to_glyph(obj, rng)) — the exact
 * predicate map_object()'s observe gate uses, expressed on the object rather
 * than on the glyph number this port does not carry.  obj_to_glyph
 * (display.h:963-968) reaches generic_obj_to_glyph ONLY when the object is not
 * a statue, the hero is not hallucinating, the object is not a corpse, and
 * obj_is_generic(obj) holds — and obj_is_generic (display.h:806-812) is
 * `!dknown && (POTION_CLASS || FIRST_REAL_GEM..LAST_GLASS_GEM ||
 * FIRST_SPELL..LAST_SPELL)`, whose own comment says it exists to "hide info
 * such as potion and gem color when not seen yet".
 *
 * This used to be plain `!dknown && otyp !== STATUE`, i.e. EVERY undiscovered
 * object.  Consequence: the observe gates below marked every object class
 * oc_encountered on sight, and interesting_to_discover() (o_init.c:525-536)
 * admits a type on oc_encountered alone, so the '\' discoveries page grew rows
 * C does not have.  Measured on seed0361-archeologist-tour step 358: this port
 * listed a "Scrolls" section (scare monster, identify) that C's page has no
 * trace of, because in C a scroll seen on the floor is NOT generic and
 * map_object never observes it. */
function _glyph_is_generic_object(obj) {
    const otyp = (obj.otyp | 0);
    if (otyp === STATUE || otyp === CORPSE) return false;
    /* C map_object() asks glyph_is_generic_object(glyph) of the glyph
     * obj_to_glyph JUST returned, and a hallucinating hero's glyph came from
     * random_obj_to_glyph(), whose otyp is >= FIRST_OBJECT and therefore never
     * in the generic range.  So the predicate is false while hallucinating —
     * expressed here on the live uprops reading, because `game.Hallucination`
     * has no writer in js/ and reads undefined at every one of its call sites. */
    if (_hallucinating_dsp()) return false;
    if (obj.dknown | 0) return false;
    const genericIndex = obj.oclass | 0;
    // display.h's glyph_is_generic_object excludes STRANGE_OBJECT (index 0)
    // and the last generic slot (FIRST_OBJECT - 1 == 17). In particular a
    // mimic's zeroobj must not become observed just because it is nearby.
    return genericIndex > 0 && genericIndex < 17
        && _obj_is_generic(otyp, genericIndex);
}

/* observe_object() lives in o_init.c (o_init.c:441); the private copy that used
 * to be here set dknown and omitted the discover_object() call, so an object
 * seen on the map was never marked oc_encountered and never entered disco[].
 * Imported from js/o_init.js instead — see the import at the head of this file. */

/* The glyph a hallucinating hero SEES for `obj` — C display.h:963-968's first
 * two arms, factored out because this file carries three open-coded copies of
 * map_object.  A statue takes statue_to_glyph's Hallucination arm
 * (random_monster + the male/female range pick, TWO draws, display.h:950-953);
 * everything else takes random_obj_to_glyph().  The gender offset picks between
 * the male and female glyph RANGES, which map_glyphinfo renders with the same
 * symbol and the same mcolor, so it changes no cell — but it IS a display-stream
 * draw and dropping it desynchronises every hallucinated glyph after it.  The
 * statue's REMEMBERED glyph is a separate draw the caller makes under its own
 * hero_memory gate (display.c:354-362). */
function _hallucinated_obj_glyph(obj) {
    if (typeof process !== 'undefined' && process.env?.FF_DISPLAY_TRACE === '1') {
        const seq = game.__ff_display_trace_seq = (game.__ff_display_trace_seq | 0) + 1;
        const caller = String(new Error().stack || '').split('\n')[2]?.trim()
            .replace(/^at\s+/, '').replace(/\s+\([^)]*\)$/, '') || '?';
        const line = `^hallu_obj[seq=${seq} moves=${game.moves | 0} xy=${obj?.ox ?? '?'},${obj?.oy ?? '?'} otyp=${obj?.otyp | 0} id=${obj?.o_id ?? 0} statue=${(obj?.otyp | 0) === STATUE ? 1 : 0} caller=${caller} newsymCaller=${game.__ff_display_newsym_caller ?? '?'}]`;
        pushRngLogEntry(line);
        console.error(line);
    }
    if ((obj.otyp | 0) === STATUE) {
        const hmndx = random_monster();
        rn2_on_display_rng(2); /* male/female glyph range; same rendered cell */
        const hmlet = (hmndx >= 0 && hmndx < MON_MLET.length) ? MON_MLET[hmndx] : 53;
        return { ch: DEF_MONSYM_CHARS[hmlet] ?? '@',
                 color: (hmndx >= 0 && hmndx < MON_MCOLOR.length) ? MON_MCOLOR[hmndx] : CLR_GRAY,
                 decgfx: false, objpile: false, cls: GLYPHCLS_MON };
    }
    return random_obj_to_glyph();
}

/* C display.h:186-187
 *     #define random_monster(rng) ((*rng)(NUMMONS))
 *     #define random_object(rng)  ((*rng)(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT)
 * objects.h:105-111 puts objects[0] = STRANGE_OBJECT and objects[1..17] = the
 * seventeen GENERIC() rows, so LAST_GENERIC == 17 and FIRST_OBJECT == 18; the
 * table this port carries (MKOBJ_OC_CLASS) is NUM_OBJECTS == 481 rows long, so
 * the draw is rn2(463).  That is the exact modulus the C recorder logs on the
 * DISPLAY channel for seed0383 (81 rn2(463) draws), which is how this arm's
 * absence was found: the JS stream matched C leaf-for-leaf up to the first
 * hallucinated OBJECT and then drew rn2(383) where C drew rn2(463). */
const FIRST_OBJECT = 18;
function random_object() {
    return rn2_on_display_rng(MKOBJ_OC_CLASS.length - FIRST_OBJECT) + FIRST_OBJECT;
}
function random_monster() {
    return rn2_on_display_rng(MON_MCOLOR.length);
}
/* C display.h:933-936
 *     #define random_obj_to_glyph(rng) \
 *         (((go.otg_temp = random_object(rng)) == CORPSE)  \
 *              ? (random_monster(rng) + GLYPH_BODY_OFF)    \
 *              : (go.otg_temp + GLYPH_OBJ_OFF))
 * SECOND draw only when the rolled otyp is CORPSE — the corpse glyph carries a
 * monster, so its colour is that monster's.  Neither arm is a PILETOP glyph, so
 * a hallucinated pile top loses its MG_OBJPILE hilite, exactly as in C. */
function random_obj_to_glyph() {
    const otyp = random_object();
    if (otyp === CORPSE) {
        const mndx = random_monster();
        const oc = MKOBJ_OC_CLASS[CORPSE];
        return { ch: oclass_sym(oc) ?? '?',
                 color: (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : CLR_GRAY,
                 decgfx: false, objpile: false, cls: GLYPHCLS_OBJ, otyp,
                 corpsenm: mndx };
    }
    const oc = MKOBJ_OC_CLASS[otyp];
    /* Same colour resolution normal_obj_to_glyph gets below: the shuffled
     * appearance colour when this otyp's description was randomised, else the
     * objects[] column. */
    const shufCol = game._objColors?.[otyp];
    const ocol = (shufCol !== undefined) ? shufCol
        : ((otyp >= 0 && otyp < MKOBJ_OC_COLOR.length) ? MKOBJ_OC_COLOR[otyp]
           : (OCLASS_COLOR[oc] ?? CLR_GRAY));
    return { ch: oclass_sym(oc) ?? '?', color: ocol, decgfx: false,
             objpile: false, cls: GLYPHCLS_OBJ, otyp };
}

/* C display.h:966 obj_to_glyph(obj, rng) — the glyph an object shows as.
 * This port models a "glyph" as a resolved {ch,color,decgfx,cls} cell (see
 * tmp_at()'s own comment below), so this returns that cell.  Exported for
 * mthrowu.c's tmp_at(DISP_FLASH, obj_to_glyph(...)) missile animation.
 * GAP: C's `rng` parameter selects random_obj_to_glyph() while hallucinating;
 * _obj_to_glyph does not model that arm (nor does map_object's caller). */
export function obj_to_glyph(obj) { return _obj_to_glyph(obj); }

/* C decl.c:97 and display.c:1118-1131 — the shared resistance-shield
 * animation.  shield_static is seven cmap symbols repeated three times.
 * flush_screen_point is intentionally synchronous: this animation cannot
 * page or read input, and C completes all 21 paints before its caller emits
 * the resistance message. */
export const shield_symbols = Object.freeze(Array.from({ length: 3 },
    () => ['0', '#', '@', '#', '0', '#', '*']).flat());

export function show_shield_frame(x, y, frame) {
    show_glyph_cell(x, y, shield_symbols[frame], CLR_BRIGHT_BLUE,
                    false, 0, GLYPHCLS_CMAP);
}

export function shieldeff(x, y) {
    if (!game.flags?.sparkle || !cansee(x, y))
        return;
    for (let frame = 0; frame < shield_symbols.length; ++frame) {
        show_shield_frame(x, y, frame);
        flush_screen_point(1);
        nh_delay_output();
    }
    newsym(x, y);
}

/* C mon.c:6077 flash_mon + display.c:1305 flash_glyph_at.  Temporarily grant
 * visibility to the square, alternate the monster with its remembered
 * background, then restore both vision and the normal map cell. */
export function flash_mon(mon) {
    const x = mon.mx | 0, y = mon.my | 0;
    let count = couldsee(x, y) ? 8 : 4;
    if (!game.flags?.sparkle)
        count = Math.trunc(count / 2);
    const row = game.viz_array?.[y];
    const saved = row?.[x] | 0;
    if (row)
        row[x] = saved | 3; /* IN_SIGHT | COULD_SEE */
    try {
        const actual = (mon.data?.pmidx ?? mon.mndx ?? mon.mnum) | 0;
        const shown = _hallucinating_dsp() ? random_monster() : actual;
        const mlet = (shown >= 0 && shown < MON_MLET.length) ? MON_MLET[shown] : 53;
        const glyph = { ch: DEF_MONSYM_CHARS[mlet] ?? '@',
            color: (shown >= 0 && shown < MON_MCOLOR.length) ? MON_MCOLOR[shown] : CLR_GRAY,
            decgfx: false, cls: GLYPHCLS_MON };
        const loc = game.level.at(x, y);
        const background = game.level.flags?.hero_memory && loc.remembered_glyph
            ? loc.remembered_glyph : terrain_glyph(loc, x, y);
        for (let i = 0; i < count * 2; ++i) {
            const cell = (i & 1) ? background : glyph;
            show_glyph_cell(x, y, cell.ch, cell.color,
                !!(cell.decgfx ?? cell.dec), _glyph_attr(cell),
                cell.cls ?? GLYPHCLS_CMAP, false, cell.otyp, cell.corpsenm);
            flush_screen_point(1);
            nh_delay_output();
        }
    } finally {
        if (row)
            row[x] = saved;
    }
    newsym(x, y);
}

/* map_object - ported from display.c:332-367 */
export function map_object(obj, show) {
    const x = obj.ox | 0, y = obj.oy | 0;
    let glyph = _obj_to_glyph(obj);

    /* if this object is already displayed as a generic object, it might
       become a specific one now */
    if (_glyph_is_generic_object(obj) && cansee(x, y) && !_hallucinating_dsp()) {
        /* these 'r' and 'neardist' calculations match distant_name(objnam.c)
           and see_nearby_objects(below); we assume that this is a lone
           object or a pile-top, not something below the top of a pile */
        const xray = (game.u?.xray_range | 0);
        const r = (xray > 2) ? xray : 2;
        /* neardist produces a small square with rounded corners */
        const neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */

        const ux = game.u?.ux | 0, uy = game.u?.uy | 0;
        const dx = x - ux, dy = y - uy;
        if (dx * dx + dy * dy <= neardist) {
            observe_object(obj);
            glyph = _obj_to_glyph(obj);
        }
    }

    if (game.level?.flags?.hero_memory) {
        /* MRKR: While hallucinating, statues are seen as random monsters */
        /*       but remembered as random objects.                        */
        /* C display.c:354-362 assigns the SECOND random object to
         * levl[x][y].glyph ONLY — `glyph` itself is untouched, and it is
         * `glyph` that show_glyph() paints below.  This used to overwrite
         * `glyph`, which would have shown the remembered object instead of the
         * monster the statue is hallucinated as. */
        const loc = game.level.at(x, y);
        const remembered = (_hallucinating_dsp() && (obj.otyp | 0) === STATUE)
            ? random_obj_to_glyph() : glyph;
        if (loc) loc.remembered_glyph = remembered;
    }
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx,
                        _glyph_attr(glyph), glyph.cls, false, glyph.otyp,
                        glyph.corpsenm);
}

/* see_nearby_objects - ported from display.c:1610-1646.
 * Mark the top object of nearby stacks as having been seen (observe_object sets
 * dknown); if an object was being displayed as generic, redisplay it as
 * specific.  RNG-free.  C caller: dungeon.c u_on_newpos() on the same level and
 * when !Blind && !Hallucination && !u.uswallow (those guards live at the JS call
 * site in cmd.js domove, matching C).  This is the observe path that map_object
 * misses when a generic floor object is already drawn and the hero merely walks
 * close to it: without it dknown stays 0 and identical stacks fail to merge on
 * pickup (the seed0003 GARVEN-DEH scroll-of-light pair). */
export function see_nearby_objects() {
    const u = game.u;
    const ux = u?.ux | 0, uy = u?.uy | 0;
    /* these 'r' and 'neardist' calculations match distant_name(objnam.c) */
    const xray = (u?.xray_range | 0);
    const r = (xray > 2) ? xray : 2;
    /* neardist produces a small square with rounded corners */
    const neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */

    for (let iy = uy - r; iy <= uy + r; ++iy) {
        for (let ix = ux - r; ix <= ux + r; ++ix) {
            /* C isok(): x >= 1 && x < COLNO && y >= 0 && y < ROWNO */
            if (ix < 1 || ix >= COLNO || iy < 0 || iy >= ROWNO)
                continue;
            /* skip if no object or the object has already been marked seen */
            const obj = game.level?.levelObjects?.[ix]?.[iy] ?? null;
            if (typeof process !== 'undefined' && process.env?.FF_NEAR_TRACE === '1' && obj) {
                pushRngLogEntry(`^near_object[otyp=${obj.otyp | 0} id=${obj.o_id ?? 0} xy=${ix},${iy}`
                    + ` dknown=${obj.dknown ? 1 : 0} cansee=${cansee(ix, iy) ? 1 : 0}`
                    + ` dist=${(ix - ux) * (ix - ux) + (iy - uy) * (iy - uy)}`
                    + ` typ=${game.level?.at?.(ix, iy)?.typ ?? -1} blind=${Blind() ? 1 : 0}`
                    + ` viz=${game.viz_array?.[iy]?.[ix] ?? 0} could=${couldsee(ix, iy) ? 1 : 0}`
                    + ` htyp=${game.level?.at?.(ux, uy)?.typ ?? -1} mklev=${game.in_mklev ? 1 : 0}`
                    + ` lit=${game.level?.at?.(ix, iy)?.lit ? 1 : 0} hLit=${game.level?.at?.(ux, uy)?.lit ? 1 : 0}`
                    + ` hero=${ux},${uy} moves=${game.moves | 0}]`);
            }
            if (!obj || (obj.dknown | 0))
                continue;
            /* skip if the spot can't be seen or is too far (diagonal) */
            const dx = ix - ux, dy = iy - uy;
            /* C display.c:1628 tests cansee() only; couldsee() is a broader
             * memory predicate and must not mark hidden objects encountered. */
            if (!cansee(ix, iy) || (dx * dx + dy * dy) > neardist)
                continue;
            /* operate on remembered generic-ness before observing */
            const wasGeneric = _glyph_is_generic_object(obj);
            observe_object(obj);
            if (wasGeneric)
                newsym(ix, iy); /* C newsym_force */
        }
    }
}

/* map_trap - ported from display.c:296-306 */
export function map_trap(trap, show) {
    const x = trap.tx, y = trap.ty;
    const ttyp = (trap.ttyp | 0);
    const tg = (ttyp >= 1 && ttyp <= TRAP_GLYPHS.length)
        ? TRAP_GLYPHS[ttyp - 1] : null;
    const glyph = tg ? { ch: tg.ch, color: tg.color, decgfx: false,
                         cls: GLYPHCLS_TRAP } : null;

    if (glyph) {
        if (game.level?.flags?.hero_memory) {
            const loc = game.level.at(x, y);
            if (loc) loc.remembered_glyph = glyph;
        }
        if (show)
            show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, _glyph_attr(glyph), glyph.cls);
    }
}

/* unmap_object - ported from display.c:408-436 */
export function unmap_object(x, y) {
    if (!game.level?.flags?.hero_memory)
        return;

    /* C display.c:417/423 — both arms are gated on !covers_traps(x, y); water
     * and lava hide a trap the same way they hide an object.  Completes the
     * same family as the newsym cascade below. */
    const trap = t_at(x, y);
    if (trap && (trap.tseen | 0) && !covers_traps(x, y)) {
        map_trap(trap, 0);
    } else {
        const loc = game.level.at(x, y);
        if (!loc) return;
        if (loc.seenv) {
            const styp = loc.typ;
            if ((styp === ROOM || styp === CORR || styp === ICE)
                && !covers_traps(x, y)
                && engr_at(x, y) !== null) {
                const ep = engr_at(x, y);
                if (cansee(x, y))
                    ep.erevealed = 1;
                map_engraving(ep, 0);
            } else {
                /* map_background(x, y, 0) — store terrain glyph */
                const tg = terrain_glyph(loc, x, y);
                if (game.level?.flags?.hero_memory)
                    loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
            }

            /* turn remembered dark room squares dark */
            if (!loc.waslit && loc.typ === ROOM) {
                const rg = loc.remembered_glyph;
                if (rg) {
                    const isAsciiFloor = rg.ch === '.' && !rg.decgfx;
                    const isDecFloor = rg.ch === '~' && rg.decgfx;
                    if ((isAsciiFloor || isDecFloor) && rg.color === NO_COLOR)
                        loc.remembered_glyph = { ch: ' ', color: NO_COLOR, decgfx: false };
                }
            }
        } else {
            loc.remembered_glyph = { ch: ' ', color: NO_COLOR, decgfx: false };
        }
    }
}

// C ref: display.c:455-477 _map_location MAP_OBJECT_AT — compute the glyph that
// the hero REMEMBERS at (x,y): object (vobj_at) > seen trap > engraving > terrain.
// This is what map_object()/map_trap()/map_background() write to lev->glyph, used
// for the remembered-terrain layer under a monster and for out-of-sight cells.
function _map_location_glyph(x, y, loc, tg) {
    /* C display.c:455/458/463 — EVERY one of the three non-terrain arms is
     * gated on covers_objects()/covers_traps(): water and lava hide whatever
     * lies in them, so the square shows the pool, not its contents.  This helper
     * carried none of the three gates while the OTHER copy of the same cascade
     * (_map_location, js/display.js:5310) carried all of them — and this one is
     * the copy the screen is painted from.  Witness: seed0361-archeologist-tour
     * step 147, the Archeologist quest home, MOAT row y=3 — C paints an unbroken
     * blue run of water where JS painted `%` at x=32 and x=42 (two food objects
     * sitting in the moat).  seed0373 step 43 and seed0383 step 42 are the same
     * defect on their own quest-home moats. */
    const obj = game.level?.levelObjects?.[x]?.[y] ?? null;
    if (obj !== null && !covers_objects(x, y)) {
        const otyp = (obj.otyp | 0);
        /* C display.c:2788-2821 MG_OBJPILE -> wintty.c:3930 ATR_INVERSE. */
        const pileTop = _obj_is_piletop(obj);
        if (otyp === STATUE) {
            const scnm = (obj.corpsenm | 0);
            const smlet = (scnm >= 0 && scnm < MON_MLET.length) ? MON_MLET[scnm] : 53;
            return { ch: DEF_MONSYM_CHARS[smlet] ?? '@', color: CLR_WHITE, decgfx: false,
                     objpile: pileTop, cls: GLYPHCLS_OBJ, otyp };
        }
        const oc = (otyp >= 0 && otyp < MKOBJ_OC_CLASS.length)
            ? MKOBJ_OC_CLASS[otyp] : (obj.oclass | 0);
        const och = oclass_sym(oc) ?? '?';
        const isCorpse = (otyp === CORPSE);
        const corpsenm = (obj.corpsenm | 0);
        // C ref: display.h:966 obj_to_glyph — generic (undiscovered) potion/gem/
        // spellbook uses objects[oclass].oc_color = CLR_GRAY (generic glyph).
        const isGeneric = !isCorpse && !(obj.dknown | 0) && !_display_hallucinating()
            && _obj_is_generic(otyp, oc);
        const shufCol = game._objColors?.[otyp];
        const ocol = isGeneric
            ? (MKOBJ_OC_COLOR[oc] ?? CLR_GRAY)
            : (isCorpse
                ? ((corpsenm >= 0 && corpsenm < MON_MCOLOR.length) ? MON_MCOLOR[corpsenm] : 7)
                : (shufCol !== undefined
                    ? shufCol
                    : ((otyp >= 0 && otyp < MKOBJ_OC_COLOR.length)
                        ? MKOBJ_OC_COLOR[otyp]
                        : (OCLASS_COLOR[oc] ?? 7))));
        return { ch: och, color: ocol, decgfx: false, objpile: pileTop,
                 cls: GLYPHCLS_OBJ, otyp,
                 corpsenm: isCorpse ? corpsenm : undefined };
    }
    const trap = t_at(x, y);
    if (trap && (trap.tseen | 0) && !covers_traps(x, y)) {
        const ttyp = (trap.ttyp | 0);
        const tg2 = (ttyp >= 1 && ttyp <= TRAP_GLYPHS.length) ? TRAP_GLYPHS[ttyp - 1] : null;
        if (tg2) return { ch: tg2.ch, color: tg2.color, decgfx: false, cls: GLYPHCLS_TRAP };
    }
    const styp = loc.typ;
    /* C display.c:462-464 — the engraving arm takes covers_traps() too.  It can
     * never fire here (spot_shows_engravings is ROOM/CORR/ICE and none of those
     * is a pool or lava), so this is structural faithfulness, not a behaviour
     * change; kept so the cascade reads arm-for-arm against C. */
    if ((styp === ROOM || styp === CORR || styp === ICE) && !covers_traps(x, y)) {
        const ep = engr_at(x, y);
        if (ep !== null) {
            const eCh = (styp === CORR) ? '#' : '`';
            /* C display.c:2942-2945 MG_BW_ENGR — the CORRIDOR spelling of an
             * engraving draws S_engrcorr, whose symbol '#' collides with S_corr
             * and S_litcorr, so C flags it and wintty.c:3930-3936 reverse-videos
             * it.  The OTHER copy of this arm (js/display.js:2547, the newsym
             * path) has carried `bwengr` since it was written; this copy — the
             * one that builds loc.remembered_glyph — dropped it, so a corridor
             * engraving painted from MEMORY came back plain.
             *
             * MEASURED on gen446-recombine-seed373399 step 787: `#wizmap` at
             * step 780 maps the level, the repaint runs through this helper, and
             * C's cell (36,13) is ESC[7;94m'#' where this port emitted ESC[94m
             * with no ATR_INVERSE — an ATTR-only miss that then held for the
             * whole 1,027-step tail of the session.  RNG-free. */
            return { ch: eCh, color: CLR_BRIGHT_BLUE, decgfx: false,
                     bwengr: (styp === CORR), cls: GLYPHCLS_ENGR };
        }
    }
    return { ch: tg.ch, color: tg.color, decgfx: tg.dec, cls: GLYPHCLS_CMAP };
}
// C display.c show_mon_or_warn: showing a monster or warning retires the
// remembered invisible marker, while preserving a visible object beneath it.
function show_mon_or_warn(x, y, ch, color, decgfx, attr, cls, warning = false) {
    if (game.level?.at(x, y)?.remembered_glyph?.cls === GLYPHCLS_INVIS) {
        unmap_object(x, y);
        const obj = cansee(x, y) ? vobj_at(x, y) : null;
        if (obj) map_object(obj, false);
    }
    show_glyph_cell(x, y, ch, color, decgfx, attr, cls, warning);
}

// C ref: display.c:1049/1080 display_monster — render the monster glyph at
// (x,y) over the terrain, and (when hero_memory) remember the map-location glyph
// (object/trap/engraving/terrain) beneath, mirroring C's _map_location(x,y,FALSE).
// Pets/normal monsters share the same map symbol here (the contest corpus does
// not exercise the pet-vs-normal color distinction that pet_to_glyph adds).
function _render_monster_glyph(x, y, mon, loc, tg, map_memory, worm_tail, detectedOnly = false) {
    /* C display.c:520-585 display_monster's mimic block.  `map_memory` is this
     * port's stand-in for sightflags == PHYSICALLY_SEEN — the correspondence
     * this file's own call sites already document (js/display.js:4489-4492):
     * the cansee arm passes true, the sensed/detected arms pass false, and C
     * takes the mimic block only on PHYSICALLY_SEEN.
     *
     * Witness: soko1-[12].lua places two `des.monster({id="giant mimic",
     * appear_as="obj:boulder"})`; create_monster (js/sp_lev.js) already sets
     * m_ap_type/mappearance correctly, but nothing read them here, so the two
     * mimics rendered as `m` where C renders the boulder they are pretending
     * to be.  seed2600-wizard-custom-binds is RNG-COMPLETE and that one cell
     * was its whole remaining screen diff. */
    const _apType = (mon.m_ap_type | 0) & M_AP_TYPMASK;
    const mon_mimic = _apType !== M_AP_NOTHING;
    /* C display.c:523-524 — sensed = mon_mimic && (Protection_from_shape_changers
     * || sensemon(mon)).  Protection_from_shape_changers has no reader in this
     * port (no corpus hero wears the ring), so only the sensemon term is live. */
    const sensed = mon_mimic && sensemon(mon);
    if (mon_mimic && map_memory && !detectedOnly) {
        if (_apType === M_AP_OBJECT) {
            /* C display.c:564-576 — build cg.zeroobj with ox/oy/otyp/corpsenm
             * and hand it to map_object(&obj, !sensed).  zeroobj means dknown
             * is 0, which is what makes an undiscovered potion/gem/spellbook
             * mimic render generic; keep it. */
            const fake = {
                ox: x, oy: y,
                otyp: mon.mappearance | 0,
                /* C: has_mcorpsenm(mon) ? MCORPSENM(mon) : PM_TENGU */
                corpsenm: (mon.mcorpsenm != null) ? (mon.mcorpsenm | 0) : PM_TENGU_DISP,
                oclass: 0, dknown: 0, quan: 1,
            };
            map_object(fake, !sensed);
            if (!sensed)
                return;
        } else if (_apType === M_AP_MONSTER) {
            /* C display.c:578-583 — show_glyph(monnum_to_glyph(what_mon(
             * mappearance, rn2_on_display_rng), mgendercode)).  what_mon is the
             * hallucination indirection; non-hallucinating it is the identity. */
            const amndx = mon.mappearance | 0;
            const amlet = (amndx >= 0 && amndx < MON_MLET.length) ? MON_MLET[amndx] : 53;
            show_glyph_cell(x, y, DEF_MONSYM_CHARS[amlet] ?? '@',
                (amndx >= 0 && amndx < MON_MCOLOR.length) ? MON_MCOLOR[amndx] : 7,
                false, 0, GLYPHCLS_MON);
            if (!sensed)
                return;
        }
        else if (_apType === M_AP_FURNITURE) {
            /* C display.c:543-562 — "a poor man's version of map_background()":
             *     int sym = mon->mappearance, glyph = cmap_to_glyph(sym);
             *     levl[x][y].glyph = glyph;
             *     if (!sensed) {
             *         show_glyph(x, y, glyph);
             *         svl.lastseentyp[x][y] = cmap_to_type(sym);
             *     }
             * Note C writes levl[x][y].glyph UNCONDITIONALLY here — that is
             * the map MEMORY, so the hero remembers the furniture the mimic
             * was posing as once the square goes out of sight — but only
             * paints (and only overrides lastseentyp) when !sensed.
             *
             * MEASURED, gen094 step 298: a mimic in the bottom wall of a Dlvl
             * 10 room poses as a closed door; C paints the brown '+', this
             * port painted the mimic's 'm', and because the mimic never moves
             * that one cell ran 258 consecutive frames. */
            const _sym = mon.mappearance | 0;
            const _g = cmap_to_glyph_disp(_sym);
            if (_g) {
                loc.remembered_glyph = { ch: _g.ch, color: _g.color,
                                         decgfx: _g.dec, cls: GLYPHCLS_CMAP };
                if (!sensed) {
                    show_glyph_cell(x, y, _g.ch, _g.color, _g.dec,
                                    _glyph_attr(loc.remembered_glyph),
                                    GLYPHCLS_CMAP);
                    loc.lastseentyp = cmap_to_type(_sym);
                    return;
                }
            }
            /* cmap_to_glyph_disp returns null only outside the cmap-A/B
             * furniture range, where C itself yields NO_GLYPH; fall through
             * and draw the monster rather than paint nothing. */
        }
    }
    /* C display.c:587 — `if (!mon_mimic || sensed)`: fall through and draw the
     * monster itself. */
    /* C display.c:599-618 — every arm of the tail passes rn2_on_display_rng
     * through what_mon():
     *     if (mon->mtame && !Hallucination)  num = pet_to_glyph(mon, rng);
     *     else if (sightflags == DETECTED)   num = detected_mon_to_glyph(mon, rng);
     *     else                               num = mon_to_glyph(mon, rng);
     * and display.h:554/557/563 all expand to `what_mon(monsndx(mon->data),
     * rng) + <class offset>`, with display.h:197 `what_mon(mon, rng) =
     * Hallucination ? random_monster(rng) : (mon)`.  So a hallucinating hero
     * draws ONE rn2(NUMMONS) on the DISPLAY stream for EVERY monster glyph
     * painted — which is what makes allmain.c:457's per-turn see_monsters()
     * re-randomise the whole map.
     *
     * A note here used to read "MEASURED on seed0383: C makes 3,191 display
     * draws on this session and every one of them is rn2(383)".  Both halves
     * are wrong, and the tool that measures the channel now exists
     * (tools/display-rng-diff.mjs): 3,191 counted the recorder's POST-EOF
     * redraw loop, which never exits and makes display draws forever — the raw
     * log holds 404,215 such lines and the SESSION is the prefix ending at the
     * last CORE line, which is 622.  Of those 622, 445 are this rn2(383); the
     * rest are rn2(463) random_object x81, rn2(5) display_warning x45,
     * rn2(430) rndmonnam x26, rn2(2) x19, rn2(7640) bogusmon x5 and one
     * rn2(41) hliquid.
     *
     * The pet arm's `&& !Hallucination` is load-bearing beyond the draw: a
     * hallucinating hero's pet takes the mon_to_glyph branch, which carries no
     * MG_PET, so the hilite_pet inverse below must not fire either. */
    /* C display.c:599-618 — each of the three arms has a worm_tail twin, and
     * the twin substitutes PM_LONG_WORM_TAIL for the worm's own species:
     *     mtame && !Hallucination : petnum_to_glyph(PM_LONG_WORM_TAIL, gender)
     *     sightflags == DETECTED  : detected_monnum_to_glyph(
     *                                   what_mon(PM_LONG_WORM_TAIL, rng), ...)
     *     otherwise               : monnum_to_glyph(
     *                                   what_mon(PM_LONG_WORM_TAIL, rng), ...)
     * The DRAW is unchanged by the substitution — what_mon() is the same
     * `Hallucination ? random_monster(rng) : (mon)` either way, and the pet arm
     * is inside `!Hallucination` and makes no draw on either side — so a worm
     * tail costs the display stream exactly what the worm's head costs.  Only
     * the symbol and colour move: mons[PM_LONG_WORM_TAIL] is
     * `MON(NAM("long worm tail"), S_WORM_TAIL, ..., CLR_BROWN, ...)`
     * (monsters.h:3330), i.e. defsym.h:365's '~'.
     * The MG_PET highlight is NOT dropped for a tame worm's tail: C's twin
     * there is petnum_to_glyph(), which carries GLYPH_PET_OFF like its
     * non-tail sibling, so petAttr below is left alone. */
    const _hallu = _hallucinating_dsp();
    const mndx = _hallu
        ? rn2_on_display_rng(MON_MCOLOR.length)
        : (worm_tail ? PM_LONG_WORM_TAIL_DISP : ((mon.mnum ?? mon.mndx) | 0));
    const mlet = (mndx >= 0 && mndx < MON_MLET.length) ? MON_MLET[mndx] : 53; // 53='@' human fallback
    const mch = DEF_MONSYM_CHARS[mlet] ?? '@';
    const mcol = (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : 7;
    /* C ref: display.c:3092-3099 — a tame monster's glyph carries MG_PET; with
     * the 'hilite_pet' option on, map_glyphinfo applies iflags.wc2_petattr
     * (default ATR_INVERSE) so the pet renders in reverse video.
     * ATR_INVERSE == 1 (terminal.js).
     *
     * The STORAGE is `iflags.wc_hilite_pet` (optlist.h:366; flag.h:508 is the
     * `#define hilite_pet wc_hilite_pet` alias that makes win/tty/wintty.c:3927
     * read the same field).  This site read `game.flags.hilite_pet`, a name C
     * has no field for — it only worked because js/optmenu.js's doset_simple()
     * wrote the toggle to the same wrong name.  Both moved to C's spelling
     * together; changing either one alone flips seed0006's pet off (-14) or
     * leaves seed4500's cmdassist toggle unrecorded (-9). */
    const petAttr = (mon.mtame && !_hallu && game.iflags?.wc_hilite_pet) ? 1 /* ATR_INVERSE */ : 0;
    // C display_monster gives pets precedence over DETECTED; tty applies
    // use_inverse to a detection glyph even when pet highlighting is off.
    const detectedAttr = detectedOnly && !(mon.mtame && !_hallu)
        && game.iflags?.wc_inverse !== false ? 1 : 0;
    show_mon_or_warn(x, y, mch, mcol, false, petAttr || detectedAttr, GLYPHCLS_MON);

}
// C ref: display.c:1072-1081 — "can't see the location" sensed-monster branch.
// Walk fmon for a monster at (x,y); render it when
//   see_it = tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)
//            || (see_with_infrared(mon) && mon_visible(mon))
// Detection independently displays the head when see_it is false.
// Returns true (and renders) when a monster is shown here, so newsym's caller
// skips the remembered-terrain fallback (C returns after display_monster).
function _oos_sensed_monster(x, y, loc) {
    /* C display.c:1071 — `else if ((mon = m_at(x, y)) != 0 && ...)`, the same
     * grid read as the cansee arm, so a long worm answers here on its tail
     * squares too. */
    const mon = _m_at(x, y);
    if (mon === null) return false;
    /* C display.c:500's is_worm_tail(mon), spelled out at :1054 and :1055. */
    const worm_tail = !!(x !== mon.mx || y !== mon.my);
    /* C display.c:1072-1076 —
     *     see_it = (tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)
     *               || (see_with_infrared(mon) && mon_visible(mon)))
     *
     * The comment this replaces said "tp_sensemon / warning are out of corpus
     * scope (no telepathy / warning heroes reach this cell), so the live term
     * is infravision", and dropped the tp_sensemon term from the expression.
     * That claim is false: seed0367-priest-quest-tour's Priest puts on an
     * amulet of ESP at step 6 and walks a graveyard, so tp_sensemon is the
     * ONLY live term there — every telepathically sensed monster fell through
     * to the Warning arm below and painted a red level-digit where C paints
     * the monster.  27 cells over 11 rows at step 203, that session's first
     * screen miss.  (Same family as the note now on _oos_warning_monster: an
     * "out of corpus scope" comment is a claim about 44 sessions, not a fact.)
     *
     * mon_visible() is the guard on the INFRAVISION term only, exactly as in C
     * — it must not gate tp_sensemon, which is how a hero senses an invisible
     * or hidden monster. */
    const see_it = !!(tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)
                      || (see_with_infrared(mon) && mon_visible(mon)));
    const detected = _newsym_Detect_monsters() && !worm_tail;
    if (!see_it && !detected) return false;
    const tg = terrain_glyph(loc, x, y);
    /* map_memory=false: C display.c:1080 calls display_monster() with no
     * preceding _map_location() on this arm — see the note in
     * _render_monster_glyph. */
    _render_monster_glyph(x, y, mon, loc, tg, false, worm_tail, !see_it);
    return true;
}
/* C ref: detect.c:120-134 map_monst(struct monst *mtmp, boolean showtail)
 *   int glyph = (monsym(mtmp->data) == ' ') ? detected_mon_to_glyph(...)
 *             : mtmp->mtame ? pet_to_glyph(...) : mon_to_glyph(...);
 *   show_glyph(mtmp->mx, mtmp->my, glyph);
 *   if (showtail && mtmp->data == &mons[PM_LONG_WORM]) detect_wsegs(mtmp, 0);
 *
 * Paints a monster onto the map buffer WITHOUT any vision test and WITHOUT
 * touching hero memory — that is the whole point of a detection: the glyph
 * goes on the display, and map_redisplay()'s docrt() later wipes it again.
 * _render_monster_glyph with map_memory=false is exactly that painting (it
 * already picks symbol + colour from MON_MLET / MON_MCOLOR and applies the
 * hilite_pet attribute for a tame monster, which is the only observable
 * difference between C's pet_to_glyph and mon_to_glyph).
 *
 * The three glyph variants C picks between differ only in flags the tty
 * renderer folds back into the same symbol+colour here:
 *   - detected_mon_to_glyph is for a monster whose class symbol is ' ' (the
 *     S_MIMIC_DEF "mimicking furniture" case); MON_MLET never yields ' ' for
 *     a real monnum, so this port takes the ordinary arm.
 *   - pet_to_glyph adds MG_PET, honoured via flags.hilite_pet.
 * No RNG: C passes newsym_rn2 into the *_to_glyph macros, which only draw
 * when the hero is hallucinating (random_monster()).  "the detection callers in
 * the corpus are non-hallucinating" reads as a property of the corpus and is
 * false in that form — 43 recorded sessions carry Hallu, and the port itself
 * runs hallucinating in 21.  The property that makes the missing draw safe is
 * the CONJUNCTION (hallucinating AND inside a detection), and that is what has
 * now been measured.  If a detection ever fires on a hallucinating hero this
 * omission is an RNG-stream divergence, not a cosmetic one — Cardinal Rule 2.
 * MEASURED: subject=map_monst-hallucinating-caller value=+0 at=d26664bc
 *           date=2026-08-29 corpus=public+train (44 + 688 sessions)
 *           reach=16 calls over 5 sessions; Hallucination live at the call 0,
 *           against a positive control of HALLUC live in 21 sessions elsewhere
 *           in the same runs
 */
export function map_monst(mtmp, showtail) {
    const x = mtmp.mx | 0, y = mtmp.my | 0;
    const loc = game.level?.at ? game.level.at(x, y) : null;
    const tg = loc ? terrain_glyph(loc, x, y) : null;
    _render_monster_glyph(x, y, mtmp, loc, tg, false);
    /* showtail: C detect.c:133 `if (showtail && mtmp->data == &mons[PM_LONG_WORM])
     * detect_wsegs(mtmp, 0);` — worm.c:503 paints every non-head segment with
     * what_mon(PM_LONG_WORM_TAIL, newsym_rn2), resolved ONCE for the whole tail
     * (not once per segment, unlike display_monster's per-glyph what_mon).
     *
     * STILL UNPORTED, but the reason this note used to give was wrong and is
     * removed rather than kept: it said "No long worm is generated in any
     * corpus session (PM_LONG_WORM is a deep-level monster), so the segment
     * walk has nothing to paint."  Long worms ARE generated —
     * gen028-reseed-seed1155683 and gen345-reseed-seed244908
     * (corpus-generated/v5/train) each make one at level-gen with a two-segment
     * tail, and those segments are what newsym() was painting floor over until
     * the worm-tail arm below it was ported.  What is true is narrower: nothing
     * measured yet reaches map_monst() WITH a long worm, so the omission has no
     * witness — which is a statement about coverage, not about the game. */
}

/* C ref: display.c:1180-1189 display_self(void) — paint the hero's own square
 * with hero_glyph, bypassing the canspotself() test the caller already made. */
export function display_self() {
    const u = game.u || {};
    const hg = _maybe_display_usteed();
    show_glyph_cell(u.ux | 0, u.uy | 0, hg.ch, hg.color, false, 0, GLYPHCLS_MON);
}

/* C ref: display.h:246-249 —
 *     #define maybe_display_usteed(otherwise_self)          \
 *         ((u.usteed && mon_visible(u.usteed))              \
 *              ? ridden_mon_to_glyph(u.usteed, rn2_on_display_rng) \
 *              : (otherwise_self))
 * display_self() wraps its whole hero_glyph / U_AP_TYPE ladder in this, so a
 * mounted hero's own square shows the STEED, not '@'.  ridden_mon_to_glyph
 * (display.h:560) is what_mon(monsndx(mon->data), rng) + GLYPH_RIDDEN_*_OFF;
 * the tty renders the ridden glyph class with the monster's own symbol and
 * colour (no MG_PET highlight — a ridden monster is not drawn as a pet), which
 * is exactly the mch/mcol pair _render_monster_glyph computes.
 * what_mon()'s rng argument is the DISPLAY stream and only matters while
 * hallucinating; no corpus rider is hallucinating, and reading it here would be
 * a scored-stream-invisible draw, so the identity is used (the same treatment
 * _render_monster_glyph's M_AP_MONSTER arm already gives what_mon).
 * seed0104/seed0103: C paints `u` (CLR_BROWN) at the rider's square from the
 * mount onward; this port painted white '@' on every frame after the mount. */
function _maybe_display_usteed() {
    const u = game.u || {};
    const steed = u.usteed;
    if (steed && mon_visible(steed)) {
        const mndx = (steed.mnum ?? steed.mndx) | 0;
        const mlet = (mndx >= 0 && mndx < MON_MLET.length) ? MON_MLET[mndx] : 53;
        return {
            ch: DEF_MONSYM_CHARS[mlet] ?? '@',
            color: (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : 7,
        };
    }
    return _hero_glyph();
}

// C ref: display.h:657 hero_glyph —
//   monnum_to_glyph((Upolyd || !flags.showrace) ? u.umonnum : gu.urace.mnum,
//                   Ugender)
// The hero renders as the monster symbol/colour of the form currently occupied,
// which is '@'/CLR_WHITE only while un-polymorphed (every player-class monnum
// is S_HUMAN white).  Upolyd is you.h:554 (u.umonnum != u.umonster) -- NOT
// u.mtimedone, which is you.h:422, the poly TIMER.  U_AP_TYPE is
// M_AP_NOTHING for the hero except while mimicking, which no corpus session
// does, so display_self() reduces to hero_glyph here.
function _hero_glyph() {
    const u = game.u || {};
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    if (!Upolyd)
        return { ch: '@', color: CLR_WHITE };
    const mndx = u.umonnum | 0;
    const mlet = (mndx >= 0 && mndx < MON_MLET.length) ? MON_MLET[mndx] : 53;
    return {
        ch: DEF_MONSYM_CHARS[mlet] ?? '@',
        color: (mndx >= 0 && mndx < MON_MCOLOR.length) ? MON_MCOLOR[mndx] : CLR_WHITE,
    };
}
/* Read one u.uprops[] triple.  The port writes some properties through the
 * numeric uprops slot and some through a mirrored u.<name> scalar (domagictrap
 * sets both u.HInvis and u.uprops[INVIS].intrinsic), so both spellings are
 * consulted — reading only one of them makes the predicate depend on which
 * writer happened to land first. */
function _uprop(idx) {
    const p = game.u?.uprops?.[idx];
    return p ? { i: p.intrinsic | 0, e: p.extrinsic | 0, b: p.blocked | 0 }
             : { i: 0, e: 0, b: 0 };
}
/* C ref: display.h:174-176
 *     #define canseeself()  (Blind || u.uswallow || (!Invisible && !u.uundetected))
 *     #define senseself()   (Unblind_telepat || Detect_monsters)
 *     #define canspotself() (canseeself() || senseself())
 * "Sensing yourself by touch is treated as seeing yourself, even if unable to
 * see" — hence Blind and u.uswallow make the hero spottable, not unspottable.
 *
 * youprop.h:198-199  Invis = (HInvis || EInvis) && !BInvis
 *                    Invisible = Invis && !See_invisible
 * youprop.h:152      See_invisible = HSee_invisible || ESee_invisible
 * youprop.h:157,190  Unblind_telepat = ETelepat
 *                    Detect_monsters = HDetect_monsters || EDetect_monsters
 * youprop.h:103      Blind = (HBlinded || EBlinded) && !BBlinded
 *
 * This was a file-local `return true` in js/cmd.js: correct only while nothing
 * could make the hero invisible.  Once domagictrap's fate-11 arm landed it was
 * wrong — seed0030 segment 9 step 121, where C stops drawing the hero and shows
 * the '%' of the pile underneath and this port kept painting '@'.  RNG-free. */
 // PARKED-NOTE: session=seed0030 segment=9 citation-only
export function canspotself() {
    const u = game.u || {};
    const blindP = _uprop(BLINDED);
    const Blind = ((blindP.i || blindP.e) && !blindP.b);
    if (Blind || (u.uswallow | 0))
        return true;
    const invisP = _uprop(INVIS);
    const HInvis = invisP.i;
    const EInvis = invisP.e;
    const BInvis = invisP.b;
    const Invis = !!((HInvis || EInvis) && !BInvis);
    const siP = _uprop(SEE_INVIS);
    const See_invisible = !!(siP.i || siP.e);
    const Invisible = Invis && !See_invisible;
    if (!Invisible && !(u.uundetected | 0))
        return true;
    /* senseself() */
    const telP = _uprop(TELEPAT);
    const dmP = _uprop(DETECT_MONSTERS);
    return !!(telP.e || dmP.i || dmP.e);
}
/* C ref: youprop.h:190 Detect_monsters = HDetect_monsters || EDetect_monsters.
 * Same read sensemon() makes (both uprops spellings plus the mirrored scalar,
 * because the port has writers on each). */
function _newsym_Detect_monsters() {
    const u = game.u || {};
    const dmP = _uprop(DETECT_MONSTERS);
    return !!(dmP.i || dmP.e);
}
/* C hack.h MATCH_WARN_OF_MON: object and polymorph class masks, or a
 * particular species, all gated by the warning property. */
export function MATCH_WARN_OF_MON(mon) {
    if (!mon || !Warn_of_mon()) return false;
    const wt = game.context?.warntype;
    const mask = (wt?.obj | 0) | (wt?.polyd | 0);
    const species = wt?.species;
    return !!((mask & (mon.data?.mflags2 | 0))
        || (species && (species === mon.data
            || (species.pmidx != null && mon.data?.pmidx === species.pmidx))));
}
/* C ref: display.c:667-700 mon_overrides_region(mon, mx, my) — "used by
 * newsym() to decide whether to show a monster or a visible gas cloud region
 * when both are at the same spot; caller deals with region".  This is the ONLY
 * exception to the region's precedence over the hero, monsters, objects, traps,
 * engravings and terrain (display.c:993-998), so it has to exist before the
 * region branch below can be ported at all.
 *
 * NO CORPUS WITNESS TAKES THE TRUE ARM.  Every gas cloud our train sessions
 * build is monmove.c:683/:704 with damage 0, and no monster has yet been sensed
 * or stood adjacent inside one.  It is ported faithfully rather than collapsed
 * to "the region always wins", because collapsing it would bake the absence of
 * a witness into the port — the first telepath who walks into a cloud would
 * then show '#' where C shows the monster.
 *
 * _mon_visible(mon) is display.h:92-95, which is exactly what this file exports
 * as mon_visible(); distu() is hack.h:1531 dist2(x, y, u.ux, u.uy), the same
 * squared distance mon_warning() already reads through distu_sensemon(). */
function mon_overrides_region(mon, mx, my) {
    let r;

    /* C: "this is redundant because newsym() doesn't call us when swallowed" —
     * kept because C keeps it; newsym's own u.uswallow arm returns above. */
    if ((game.u?.uswallow | 0) && (!mon || mon !== game.u?.ustuck))
        return false;

    if (mon) {
        /* when not a worm tail, show mon if sensed rather than seen */
        if (mx === (mon.mx | 0) && my === (mon.my | 0)
            && (sensemon(mon) || mon_warning(mon)))
            return true;

        /* even if worm tail; check whether the spot is adjacent and 'mon'
           would be visible there if the gas cloud wasn't interfering with
           normal vision; _mon_visible() handles mon->mundetected; don't need
           to check infravision when monster is adjacent */
        const xr = (game.u?.xray_range | 0);
        r = (xr > 1) ? xr : 1;
        if (!_disp_Blind() && mon_visible(mon)
            && (((mon.m_ap_type | 0) & M_AP_TYPMASK) !== M_AP_FURNITURE)
            && (((mon.m_ap_type | 0) & M_AP_TYPMASK) !== M_AP_OBJECT)
            && distu_sensemon(mx, my) <= r * (r + 1))
            return true;
    }

    /* if not overriding region for current mon, propagate "remembered,
       unseen monster" */
    return glyph_is_invisible_at(mx, my);
}
// ── newsym ──
export function newsym(x, y) {
    /* Diagnostic-only visibility provenance; inert unless explicitly enabled. */
    if (typeof process !== 'undefined' && process.env?.FF_VISION_TRACE === '1') {
        const t = game.__vision_trace_newsym || (game.__vision_trace_newsym = []);
        t.push([x | 0, y | 0]);
    }
    if (typeof process !== 'undefined' && process.env?.FF_DISPLAY_TRACE === '1') {
        game.__ff_display_newsym_caller = String(new Error().stack || '').split('\n')[2]?.trim()
            .replace(/^at\s+/, '').replace(/\s+\([^)]*\)$/, '') || '?';
    }
    /* C display.c:925-926 — the FIRST statement of newsym():
     *     if (_suppress_map_output()) return;
     * where _suppress_map_output() (display.c:703-708) is
     *     gi.in_mklev || program_state.saving || program_state.restoring
     * with the comment "map or status window might not be ready for output
     * during level creation or game restoration".
     *
     * This guard was MISSING here, and feel_location (:5285) already had it —
     * so every newsym() C skips during level generation ran, and each one wrote
     * loc.remembered_glyph.  The memory it fabricates is invisible until the
     * level PERSISTS and is redisplayed: on seed4500 the level-gen
     * makemon -> hideunder -> newsym at (47,17) of Dlvl 10 remembered the `%`
     * of the food ration the giant spider was hidden under, and the hero's
     * revisit at step 869 repainted it from memory — nine frames (869-877)
     * where C's square is unexplored.  Same failure family as goto_level's
     * dropped docrt(): a level-generation display side effect is harmless
     * until level memory survives the trip. */
    if (suppress_map_output())
        return;
    /* C display.c:928-936 — the "should never happen" guard, which this body
     * did not have:
     *     if (!isok(x, y)) {
     *         errfunc = (x < 0 || y < 0 || x > COLNO - 1 || y > ROWNO - 1)
     *                   ? panic : impossible;
     *         (*errfunc)("newsym: attempting screen update for <%d,%d>", x, y);
     *         return;
     *     }
     * isok() (hack.h) is `x >= 1 && x < COLNO && y >= 0 && y < ROWNO`, so
     * COLUMN 0 is not ok: C treats it as the less-severe impossible() rather
     * than a panic.  Without the early return this port went on to write
     * loc.remembered_glyph for out-of-range squares.
     * The 59 spurious column-0 calls this arm used to swallow (seed0367,
     * seed0373, seed0360) came from vision_recalc's `not_in_sight:` arm, which
     * was missing C's own `if (col != 0)` guard (vision.c:826-835, comment
     * "avoid calling it for <0,y>").  That guard is now ported (js/vision.js),
     * and a corpus-wide re-measure finds ZERO column-0 calls left — which is
     * what makes the message below safe to emit.
     *
     * The message IS emitted now, because C's is the only thing standing
     * between this port and seed0012-monk-vault-escort's last frame.
     * VERIFIED against a locally-built 5.0 recorder instrumented with
     * backtrace(3): seed0012 raises exactly ONE bad newsym in the whole
     * session, at moves=327, with the stack
     *     newsym <- postmov(monmove.c:1658) <- m_move(monmove.c:1823)
     *            <- dochug <- dochugw <- movemon_singlemon <- movemon
     * on the vault guard (isgd=1, mhp=55, mx=my=0, entered m_move from
     * <65,6>) that gd_move_cleanup -> parkguard has just moved to <0,0>
     * mid-call.  C's impossible() then plines its text, which pages the
     * "Suddenly, the guard disappears." already on the topline — and that
     * --More-- frame is the one step point seed0012 was missing.
     *
     * C's impossible() (pline.c) is inlined here rather than routed through
     * this file's local `impossible()` no-op (:6017) DELIBERATELY: that stub
     * is also show_glyph's, and show_glyph's "bad glyph" arm fires 9x on
     * seed0030-ten-diverse-deaths (measured).  That is a separate, unfixed
     * defect; making the shared stub speak would print nine toplines C never
     * prints there. */
    if (!((x | 0) >= 1 && (x | 0) < COLNO && (y | 0) >= 0 && (y | 0) < ROWNO)) {
        /* C pline.c impossible():
         *     gp.pline_flags = URGENT_MESSAGE;
         *     pline("%s", pbuf);
         *     gp.pline_flags = 0;
         *     Strcpy(pbuf2, "Program in disorder!");
         *     if (program_state.something_worth_saving)
         *         Strcat(pbuf2, "  (Saving and reloading may fix this problem.)");
         *     pline("%s", pbuf2);
         *     pline("Please report these messages to %s.", DEVTEAM_EMAIL);
         * Both of the first two are OBSERVED in the recorder's continuation
         * past the recording's last key (frames SEQ=309 and SEQ=310);
         * the DEVTEAM_EMAIL line is NOT — the C binary stops after
         * "Program in disorder!", so this port stops there too.
         * (The panic() half of C's errfunc selection is unreachable from the
         * only site the corpus exercises, which is column 0.) */
        pline('newsym: attempting screen update for <' + (x | 0) + ','
              + (y | 0) + '>');
        pline('Program in disorder!  (Saving and reloading may fix this problem.)');
        return;
    }
    /* C display.c:948-953 — "only permit updating the hero when swallowed":
     *     if (u.uswallow) {
     *         if (u_at(x, y)) display_self();
     *         return;
     *     }
     * A swallowed hero sees the stomach and nothing else, so every newsym the
     * rest of the world raises while he is inside is a no-op in C.  This port
     * had no such guard: swallowed(1) cleared the level off the screen and then
     * the very next monster's move repainted its own glyph onto the blank map.
     * MEASURED on seed0383 step 141, where the frame C draws as three cage rows
     * came back with eleven monsters and a room outline still on it. */
    if (game.u?.uswallow | 0) {
        if ((x | 0) === (game.u.ux | 0) && (y | 0) === (game.u.uy | 0))
            display_self();
        return;
    }
    const loc = game.level?.at(x, y);
    if (!loc)
        return;
    /* C ref: display.c:967 — the FIRST statement of newsym()'s `if (cansee(x,y))`
     * branch, ahead of the u_at(x,y)/display_self() arm, so the hero's own square
     * is covered too:
     *     lev->waslit = (lev->lit != 0);   /_ remember lit condition _/
     * Nothing in this port ever SET waslit (js/vision.js:713 only ever cleared
     * it), so every reader treated the whole map as never-lit.  The visible cost
     * is the corridor: back_to_glyph picks S_litcorr over S_corr on
     * `waslit || flags.lit_corridor` (js/display.js:452), so a corridor lit by
     * the scroll of light rendered CLR_GRAY where C renders CLR_WHITE
     * (seed0002 step 96).  RNG-neutral. */
    if (cansee(x, y)) {
        loc.waslit = (loc.lit != 0) ? 1 : 0;
        /* C ref: display.c:952 and :993-998 — the region branch, which this
         * newsym() did not have at all:
         *     NhRegion *reg = visible_region_at(x, y);
         *     ...
         *     if (reg && (ACCESSIBLE(lev->typ)
         *                 || (reg->visible && is_pool_or_lava(x, y)))) {
         *         if (!mon_overrides_region(mon, x, y)) {
         *             show_region(reg, x, y);
         *             return;
         *         }
         *     }
         * C's comment: "Normal region shown only on accessible positions, but
         * poison clouds and steam clouds also shown above lava, pools and moats.
         * However, sensed monsters ... take precedence over all regions."
         *
         * PLACEMENT IS THE WHOLE FIX, not just the existence of the branch.
         * C tests the region ABOVE its `if (u_at(x, y))` arm, so a gas cloud
         * paints '#' over the hero's own '@'; this port's hero arm (just below)
         * returns before anything else can run, so a region branch added after
         * it would still leave the hero's square wrong.  Everything this branch
         * calls was already ported and live — visible_region_at (js/region.js:802),
         * show_region (:7092, reached today from _map_location/feel_location) —
         * so what was missing was the precedence, not the machinery.
         *
         * ACCESSIBLE(typ) is rm.h:125 `((typ) >= DOOR)`.  reg->visible is
         * necessarily true for anything visible_region_at() returns (it filters
         * on exactly that, region.js:806); the term is kept because C keeps it.
         *
         * m_at() is called here rather than threaded down from the arm below
         * because C computes `mon` at :982, above its own region test; _m_at is
         * a pure lookup over game.fmon and draws no RNG, so the second call the
         * arm below makes is the same read, not a second effect. */
        const reg = visible_region_at(x, y);
        if (reg && ((loc.typ | 0) >= DOOR
                    || (reg.visible && is_pool_or_lava(x, y)))) {
            if (!mon_overrides_region(_m_at(x, y), x, y)) {
                show_region(reg, x, y);
                return;
            }
        }
    }
    if (game.u?.ux === x && game.u?.uy === y) {
        /* C ref: display.c:1002-1009 —
         *     int see_self = canspotself();
         *     _map_location(x, y, !see_self);
         *     if (see_self) display_self();
         * _map_location's second argument is `show`: when the hero CANNOT spot
         * herself the tile's remembered glyph (object / known trap / terrain) is
         * not merely recorded, it is PAINTED, and display_self() never runs — so
         * an invisible hero's square shows what lies under her, not '@'.  The
         * out-of-sight arm at :1044-1045 has the same shape via feel_location().
         * This port painted the hero unconditionally, which was indistinguishable
         * from C only while nothing could turn the hero invisible. */
        const see_self = canspotself();
        // C newsym maps the underlying square even when the hero hides it.
        // map_object also performs the hallucinated object glyph draw.
        if (cansee(x, y))
            _map_location(x, y, !see_self);
        else
            feel_location(x, y);
        if (see_self) {
            const hg = _maybe_display_usteed();
            show_glyph_cell(x, y, hg.ch, hg.color, false, 0, GLYPHCLS_MON);
        }
        return;
    }
    // C ref: display.c newsym — monster > object > terrain priority (display.c:982-1065).
    // Walk g.fmon chain to find a monster at (x, y).
    // Walk game.level.levelObjects[x][y] to find an object.
    // C ref: display.c:1034–1065 (visible branch), display.c:455–457 MAP_OBJECT_AT macro.
    const tg = terrain_glyph(loc, x, y);
    if (cansee(x, y)) {
        // C display.c:982 — mon = m_at(x, y)
        const mon = _m_at(x, y);
        /* C display.c:500 —
         *     #define is_worm_tail(mon) ((mon) && ((x != (mon)->mx) \
         *                                          || (y != (mon)->my)))
         * and display.c:970 `worm_tail = is_worm_tail(mon);`.  m_at() answers a
         * long worm on EVERY square its body covers, so the only thing that
         * separates head from tail is whether <x,y> is the monster's own
         * <mx,my>.  This port's newsym walked fmon directly, which can only
         * ever match the head, so the flag had nothing to be true for and the
         * note below said so; the walk is now m_at() and the flag is live. */
        const worm_tail = !!(mon && (x !== mon.mx || y !== mon.my));
        /* C display.c:1014-1017 —
         *     see_it = mon && (mon_visible(mon)
         *                      || (!worm_tail && (tp_sensemon(mon)
         *                                         || MATCH_WARN_OF_MON(mon))));
         *     if (mon && (see_it || (!worm_tail && Detect_monsters))) { ... }
         * `cansee(x,y)` is TRUE here, but that is a property of the SQUARE, not
         * of the monster: mon_visible() is what screens out an invisible monster
         * and an undetected HIDER.  The comment this replaces said the gate was
         * "simplified" because cansee had already been confirmed — it was not a
         * simplification, it was the whole test.  Every hides_under monster the
         * level generator hides (makemon.c:1308-1315: a snake/spider gets an
         * object dropped on its square and then hideunder() sets mundetected)
         * rendered as the monster where C renders the object it is under.
         * seed2600-wizard-custom-binds step 20, cell (44,6): C shows the '%' of
         * the random object under a garter snake (mndx 215, hideunder() returned
         * TRUE at level-gen), this port showed 'S'.  That single cell was the
         * session's entire remaining screen diff — its RNG is 11647/11647.
         *
         * The `!worm_tail &&` terms are C's own (display.c:1014-1016): a worm's
         * TAIL is shown only when the worm is physically visible.  Telepathy,
         * warning and monster-detection each sense the CREATURE, and C shows it
         * at its head square alone — see_wsegs()/detect_wsegs() are what paint
         * a body, and neither runs off these arms. */
        if (mon !== null) {
            const see_it = mon_visible(mon)
                || (!worm_tail && (tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)));
            if (see_it || (!worm_tail && _newsym_Detect_monsters())) {
                /* C display.c:1049 display_monster — monster glyph wins over
                 * door/wall/terrain glyph (W18.4 sub-task A verification).
                 * Verified for seed0105 line 17 col 31 (ant `a` at open door `|`):
                 * priority logic IS correct; the bug there is fmon entry missing
                 * (W18.5 fmon.count fix). When W18.5 adds the ant to fmon, this
                 * path fires and renders `a` over the door terrain. */
                /* C newsym: map the underlying square before displaying its
                 * monster. map_object must run even with show=false: it updates
                 * memory and consumes hallucinated object glyph draws. */
                _map_location(x, y, false);
                _render_monster_glyph(x, y, mon, loc, tg, true, worm_tail, !see_it);
                return;
            }
            /* C display.c:1053-1054 — `else if (mon && mon_warning(mon)
             * && !worm_tail) display_warning(mon);`  Warning floats a level
             * digit over a hostile the hero cannot otherwise make out. */
            if (!worm_tail && mon_warning(mon)) {
                const wl = _display_warning_level(mon);
                const sym = DEF_WARNSYMS[wl] || DEF_WARNSYMS[0];
                show_mon_or_warn(x, y, sym.ch, sym.color, false, 0, GLYPHCLS_MON, true);
                return;
            }
            /* otherwise fall through to C's glyph_is_invisible / _map_location
             * arms below, which is what paints the object the hider is under. */
        }
        /* C display.c:1031-1032 — `else if (glyph_is_invisible(lev->glyph))
         *     map_invisible(x, y);`
         * A remembered-unseen-monster marker survives even a repaint of a tile
         * the hero CAN see: only unmap_invisible() (display.c:388) removes it.
         * Sits between the monster arm and _map_location, exactly as in C. */
        if (loc.remembered_glyph && loc.remembered_glyph.ch === 'I'
            && loc.remembered_glyph.cls === GLYPHCLS_INVIS) {
            map_invisible(x, y);
            return;
        }
        /* C display.c:1059 reaches `_map_location(x, y, 1)` here, and the
         * macro's last line is `update_lastseentyp(x, y)` (display.c:471).
         * Hoisted above the painting cascade rather than repeated before each
         * of its `return`s: update_lastseentyp reads only levl[x][y].typ, the
         * drawbridge mask and the furniture-mimic test, none of which the
         * cascade below writes, so running it first is the same write. */
        update_lastseentyp(x, y);
        // C display.c:1059–1065 — no monster: _map_location(x, y, 1) → MAP_OBJECT_AT.
        // Check for object at (x, y) via per-tile levelObjects table (vobj_at equivalent).
        // C ref: display.c:3035 obj_color(offset) — uses objects[offset].oc_color (per-otyp).
        /* C display.c:455 — `if ((obj = vobj_at(x, y)) && !covers_objects(x, y))`.
         * Water and lava hide what lies in them; this is the THIRD copy of the
         * _map_location cascade in this file and the one the screen is painted
         * from, and it was the only one carrying no covers_objects() gate at all.
         * Witness: seed0361-archeologist-tour step 147 (Archeologist quest home),
         * MOAT row y=3 — C paints an unbroken blue run of water, JS painted `%`
         * at x=32 and x=42 for two food objects lying in the moat. */
        const obj = game.level?.levelObjects?.[x]?.[y] ?? null;
        if (obj !== null && !covers_objects(x, y)) {
            // oc_class: use per-otyp table (MKOBJ_OC_CLASS[otyp]) when available,
            // as it correctly reflects the C objects[] array class for each JS otyp.
            // This fixes objects where obj.oclass was not set by mksobj (oclass=0/wrong).
            // C ref: display.c:3035 — gmap->sym.symidx = objects[offset].oc_class + SYM_OFF_O
            const otyp = (obj.otyp | 0);
            /* C display.c:2788-2821 MG_OBJPILE -> wintty.c:3930 ATR_INVERSE.
             * Resolved BEFORE the observe_object() call below, exactly as C
             * resolves it in map_glyphinfo() from the glyph map_object() already
             * chose; dknown does not enter obj_is_piletop(). */
            const pileTop = _obj_is_piletop(obj);
            /* C display.h:963-968 obj_to_glyph — STATUE is tested first and
             * statue_to_glyph() carries its OWN Hallucination arm, then the
             * plain `(Hallucination) ? random_obj_to_glyph(rng)` arm covers
             * every other object.  This block is one of the file's open-coded
             * copies of map_object (see map_object() itself at :1327 and
             * _map_location_glyph at :1500); the arms are spelled out here
             * rather than delegating so the surrounding cascade is unchanged.
             *
             * WITHOUT this, a hallucinating hero drew NOTHING at an object
             * square while C drew rn2(463) there, so every hallucinated glyph
             * painted after the first visible object was one draw out of step.
             * Measured on seed0383 (C recorder, NETHACK_RNGLOG_DISP=1): C makes
             * 81 rn2(463) display draws this session and this port made zero. */
            if (_hallucinating_dsp()) {
                const hg = _hallucinated_obj_glyph(obj);
                if (game.level?.flags?.hero_memory) {
                    loc.remembered_glyph = (otyp === STATUE)
                        ? random_obj_to_glyph() : hg;
                }
                show_glyph_cell(x, y, hg.ch, hg.color, hg.decgfx,
                                _glyph_attr(hg), hg.cls, false, hg.otyp,
                                hg.corpsenm);
                return;
            }
            // C ref: display.h obj_to_glyph — `(obj)->otyp == STATUE` is checked FIRST,
            // BEFORE the generic oclass→symbol path. A statue renders as the monster
            // CLASS symbol of its corpsenm (display.c:2873/2880 map_glyphinfo sets
            // sym.symidx = mons[corpsenm].mlet + SYM_OFF_M), colored obj_color(STATUE)
            // = CLR_WHITE — NOT the rock/object-class glyph, and NOT the monster mcolor.
            // (Non-Hallucination, non-rogue-symset path; DECgraphics/default symset
            // both use the ASCII monster-class char.)  Fixes the JS backtick-for-statue
            // class (seed0014 statue `d`, seed2200 statue `x`).
            if (otyp === STATUE) {
                const scnm = (obj.corpsenm | 0);
                const smlet = (scnm >= 0 && scnm < MON_MLET.length) ? MON_MLET[scnm] : 53; // 53='@' fallback
                const sch = DEF_MONSYM_CHARS[smlet] ?? '@';
                show_glyph_cell(x, y, sch, CLR_WHITE, false,
                                _pile_hilite(pileTop), GLYPHCLS_OBJ, false, otyp);
                if (game.level?.flags?.hero_memory) {
                    loc.remembered_glyph = { ch: sch, color: CLR_WHITE, decgfx: false,
                                             objpile: pileTop, cls: GLYPHCLS_OBJ, otyp };
                }
                return;
            }
            const oc = (otyp >= 0 && otyp < MKOBJ_OC_CLASS.length)
                ? MKOBJ_OC_CLASS[otyp]
                : (obj.oclass | 0);
            const och = oclass_sym(oc) ?? '?';
            // oc_color: C display.c:3054-3060 — a corpse glyph (GLYPH_BODY) routes
            // through mon_color(corpsenm) = mons[corpsenm].mcolor, NOT obj_color.
            // All other objects use per-otyp objects[n].oc_color (display.c:3035 obj_color).
            // Fall back to OCLASS_COLOR[oc] if otyp is out of range.
            const isCorpse = (otyp === CORPSE);
            const corpsenm = (obj.corpsenm | 0);
            // oc_color for randomized-appearance objects (potions, scrolls,
            // rings, wands, amulets, spellbooks, venom, shuffled armor) is the
            // color of the *shuffled* description, not the static base color.
            // C o_init.c shuffle() swaps objects[].oc_color in lockstep with
            // oc_descr_idx; the runtime override is recorded in game._objColors
            // by shuffle_all(). Fall back to the static base table, then class.
            // C ref: display.c:342-358 map_object (reached via newsym→_map_location)
            // — a still-generic object (!dknown) that the hero can now see up close
            // is observed: observe_object() sets dknown, so it stops being generic
            // and shows its real appearance color.  neardist = r*r*2 - r (a small
            // rounded square around the hero); r = max(2, xray_range).
            //
            // This inline is a THIRD copy of map_object's observe gate, and it
            // used to write `obj.dknown = 1` with the comment /* observe_object */
            // beside it instead of CALLING observe_object() — so it set dknown
            // and skipped discover_object(oindx, FALSE, TRUE, FALSE), i.e. the
            // object type was never marked oc_encountered and never entered
            // svd.disco[].  o_init.c:441-452's observe_object is both halves:
            //     obj->dknown = 1;
            //     discover_object(oindx, FALSE, TRUE, FALSE);
            // and o_init.c:525-536 interesting_to_discover() admits a type on
            // oc_encountered alone, so '\' must list every appearance the hero
            // has seen up close.  MEASURED on seed0367-priest-quest-tour step
            // 316: C's discoveries page lists three scroll appearances, three
            // potion appearances and a wand appearance this port omitted
            // entirely, which shifted every later row of the page.
            //
            // The gate is map_object's own (js/display.js:1249):
            // `_glyph_is_generic_object(obj) && cansee(x,y) && !Hallucination`,
            // and cansee(x,y) is the branch we are standing in.
            /* C display.c:347 — the gate is `glyph_is_generic_object(glyph)`,
             * and obj_to_glyph only PRODUCES a generic-object glyph for
             * display.h:806-812's obj_is_generic(obj):
             *     !(obj)->dknown
             *     && ((obj)->oclass == POTION_CLASS
             *         || ((obj)->otyp >= FIRST_REAL_GEM
             *             && (obj)->otyp <= LAST_GLASS_GEM)
             *         || ((obj)->otyp >= FIRST_SPELL
             *             && (obj)->otyp <= LAST_SPELL))
             * — potions, gems and spellbooks ONLY.  This site once tested plain
             * `!obj.dknown`, i.e. EVERY unidentified object, so the port
             * discovered appearances C leaves unseen.
             * MEASURED on seed4500-knight-coverage step 1704: C's '\'
             * discoveries page lists "key" and "looking glass" under Tools and
             * this port additionally listed "candle" — a TOOL, so C's
             * map_object never observes it, picked up here during a goto_level
             * vision_recalc.  Everything else that C does discover on approach
             * comes through see_nearby_objects (display.c:1575-1604), which has
             * no class restriction and is ported separately.
             * NOTE two sessions fixed this independently and the helper form
             * won: _glyph_is_generic_object() applies the SAME _obj_is_generic
             * class gate plus the dknown and Hallucination tests, and ALSO
             * excludes CORPSE and STATUE, which the inline form did not. */
            if (_glyph_is_generic_object(obj)) {
                const xray = (game.u?.xray_range | 0);
                const r = (xray > 2) ? xray : 2;
                const neardist = (r * r) * 2 - r;
                const dx = x - (game.u?.ux | 0), dy = y - (game.u?.uy | 0);
                if (dx * dx + dy * dy <= neardist)
                    observe_object(obj);
            }
            // C ref: display.h:966 obj_to_glyph — an undiscovered potion/gem/
            // spellbook renders as the generic class glyph (objects[oclass].oc_color
            // = CLR_GRAY), NOT its randomized appearance color, until observed.
            const isGeneric = !isCorpse && !(obj.dknown | 0) && !_display_hallucinating()
                && _obj_is_generic(otyp, oc);
            const shufCol = game._objColors?.[otyp];
            const ocol = isGeneric
                ? (MKOBJ_OC_COLOR[oc] ?? CLR_GRAY)
                : (isCorpse
                    ? ((corpsenm >= 0 && corpsenm < MON_MCOLOR.length) ? MON_MCOLOR[corpsenm] : 7)
                    : (shufCol !== undefined
                        ? shufCol
                        : ((otyp >= 0 && otyp < MKOBJ_OC_COLOR.length)
                            ? MKOBJ_OC_COLOR[otyp]
                            : (OCLASS_COLOR[oc] ?? 7))));
            /* C display.h generic_obj_to_glyph() encodes the object CLASS in
             * the glyph, not the underlying object's type.  object_from_map()
             * later decodes that class value and deliberately fails to find a
             * matching floor object, constructing a temporary generic object
             * (and consuming next_ident) for farlook.  Keep that encoded value
             * in both the display buffer and hero memory. */
            const displayedOtyp = isGeneric ? oc : otyp;
            show_glyph_cell(x, y, och, ocol, false,
                            _pile_hilite(pileTop), GLYPHCLS_OBJ, false,
                            displayedOtyp,
                            isCorpse ? corpsenm : null);
            if (game.level?.flags?.hero_memory) {
                loc.remembered_glyph = { ch: och, color: ocol, decgfx: false,
                                         objpile: pileTop, cls: GLYPHCLS_OBJ,
                                         otyp: displayedOtyp,
                                         corpsenm: isCorpse ? corpsenm : undefined };
            }
            return;
        }
        // C ref: display.c _map_location — trap check after object, before
        // engraving/terrain.  A trap is drawn only when seen (trap->tseen).
        // C: if ((trap = t_at(x,y)) != 0 && trap->tseen && !covers_traps(x,y))
        //     → map_trap glyph.  covers_traps IS covers_objects (display.h:222).
        const trap = t_at(x, y);
        if (trap && (trap.tseen | 0) && !covers_traps(x, y)) {
            const ttyp = (trap.ttyp | 0);
            const tg2 = (ttyp >= 1 && ttyp <= TRAP_GLYPHS.length)
                ? TRAP_GLYPHS[ttyp - 1] : null;
            if (tg2) {
                show_glyph_cell(x, y, tg2.ch, tg2.color, false, 0, GLYPHCLS_TRAP);
                if (game.level?.flags?.hero_memory) {
                    loc.remembered_glyph = { ch: tg2.ch, color: tg2.color, decgfx: false,
                                             cls: GLYPHCLS_TRAP };
                }
                return;
            }
        }
        // C ref: display.c:455-467 _map_location — engraving check after obj/trap, before terrain.
        // spot_shows_engravings: CORR, ICE, or ROOM.
        // C: ml_ep->erevealed is set to 1 by newsym (line 985) whenever cansee is true.
        // So all visible engravings are rendered; no separate erevealed flag needed here.
        const styp = loc.typ;
        /* C display.c:462-464 carries `&& !covers_traps(x, y)` on this arm too;
         * it can never fire (ROOM/CORR/ICE is never a pool or lava), so this is
         * structural faithfulness, not a behaviour change. */
        if ((styp === ROOM || styp === CORR || styp === ICE) && !covers_traps(x, y)) {
            const ep = engr_at(x, y);
            if (ep !== null) {
                // C ref: engrave.h engraving_to_defsym — CORR → S_engrcorr ('#'), else S_engroom ('`').
                // Both use CLR_BRIGHT_BLUE (defsym.h PCHAR2 lines 114-119).
                const eCh = (styp === CORR) ? '#' : '`';
                const eCol = CLR_BRIGHT_BLUE;
                /* C display.c:2942-2945 MG_BW_ENGR — see _bw_engr_hilite. */
                const eBw = (styp === CORR);
                show_glyph_cell(x, y, eCh, eCol, false, _bw_engr_hilite(eBw),
                                GLYPHCLS_ENGR);
                if (game.level?.flags?.hero_memory) {
                    loc.remembered_glyph = { ch: eCh, color: eCol, decgfx: false,
                                             bwengr: eBw, cls: GLYPHCLS_ENGR };
                }
                return;
            }
        }
        // No monster, no object, no engraving — show terrain.
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec, 0, GLYPHCLS_CMAP);
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                     cls: GLYPHCLS_CMAP };
        }
    }
    else if (_oos_sensed_monster(x, y, loc)) {
        // C ref: display.c:1072-1081 — hero can't SEE the cell, but a monster is
        // there and is sensed.  see_it = tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)
        // || (see_with_infrared(mon) && mon_visible(mon)).  For the contest corpus
        // the live path is infravision: a warm-blooded monster in dark line-of-sight
        // (e.g. an orcish/elven/dwarven/gnomish hero seeing a pet in a dark corridor).
        // Handled inside the predicate, which renders the glyph when true.
    }
    else if (_oos_warning_monster(x, y)) {
        // C ref: display.c:1082-1084 — `else if (mon && mon_warning(mon) &&
        // !is_worm_tail(mon)) display_warning(mon);`.  The hero cannot see or
        // sense the cell, but Warning floats a level-digit glyph over any
        // nearby hostile.  Handled inside the predicate, which shows the glyph
        // when true.  (The previous comment on _oos_sensed_monster claimed "no
        // telepathy / warning heroes reach this cell"; seed5500's hero carries
        // intrinsic Warning and falsifies that — C paints '1' at step 822.)
    }
    else if (loc.remembered_glyph) {
        // Out of sight but remembered.
        // C ref: display.c:1116-1123 — the out-of-sight remembered-glyph branch is
        // gated by `!lev->waslit || (flags.dark_room && iflags.use_color)` (the
        // latter constant-true here).  Inside it C demotes two lit memories back to
        // their dark form so the hero's memory matches `waslit`:
        //   • S_room  (ROOM) → DARKROOMSYM   — _darken_room_floor
        //   • S_litcorr (CORR) → S_corr      — _darken_corridor
        // NEITHER demotion is further gated: display.c:1088-1091 sits inside the
        // `else if`, whose condition is a DISJUNCTION, and its right half
        // (dark_room && use_color) is constant-true in this port — so the branch
        // is always taken and both arms are unconditional.  The extra
        // `if (!loc.waslit)` this port wrapped around the corridor arm read the
        // disjunction as a conjunction; it was inert only for as long as nothing
        // ever set waslit, and became wrong the moment newsym did (seed0002 step
        // 98: the hero steps off a corridor the scroll of light lit, C demotes it
        // to S_corr, the gate kept it S_litcorr).  We mutate remembered_glyph in
        // place to mirror C's `lev->glyph = …` so docrt's remembered-render and
        // subsequent newsyms stay darkened.
        /* C display.c:1085-1092 handles the Rogue level separately:
         * DARKROOMSYM is S_stone there, so an unlit remembered S_room floor
         * becomes unexplored blank rather than the ordinary dark-room dot. */
        const rg = loc.remembered_glyph;
        const rogueRoom = Is_rogue_level(game.u?.uz) && !loc.waslit
            && loc.typ === ROOM && rg.color === NO_COLOR
            && ((rg.ch === '.' && !rg.decgfx) || (rg.ch === '~' && rg.decgfx));
        if (rogueRoom) {
            rg.ch = ' ';
            rg.color = NO_COLOR;
            rg.decgfx = false;
        } else {
            _darken_room_floor(loc, rg);
        }
        _darken_corridor(loc, loc.remembered_glyph);
        /* C: the remembered glyph IS a glyph, so map_glyphinfo re-derives
         * MG_OBJPILE from it — a remembered pile keeps its ATR_INVERSE.  Passing
         * a hardcoded 0 here would have dropped the hilite the moment the hero
         * looked away. */
        show_glyph_cell(x, y, loc.remembered_glyph.ch, loc.remembered_glyph.color,
                        loc.remembered_glyph.decgfx, _glyph_attr(loc.remembered_glyph),
                        loc.remembered_glyph.cls ?? GLYPHCLS_CMAP, false,
                        loc.remembered_glyph.otyp, loc.remembered_glyph.corpsenm);
    }
    else {
        /* C newsym's show_mem tail always paints lev->glyph. Without a
         * remembered glyph that is unexplored, including after a visible
         * region (which is displayed without mapping the square) leaves
         * sight. Clear every transient glyph class, not only monsters. */
        show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_CMAP);
    }
}
// C ref: mondata.h DEADMONSTER(mon) — mhp <= 0.
function _see_monsters_DEADMONSTER(mon) {
    return !!(mon && (mon.mhp | 0) <= 0);
}

// C ref: youprop.h HWarn_of_mon/EWarn_of_mon = u.uprops[WARN_OF_MON].{intrinsic,extrinsic};
// Warn_of_mon = (HWarn_of_mon || EWarn_of_mon). uprops isn't seeded by every
// replay path, so a missing entry reads as the C BSS-zero default (0).
export function Warn_of_mon() {
    const p = game.u && game.u.uprops && game.u.uprops[WARN_OF_MON];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: youprop.h:163-165 — HWarning/EWarning = u.uprops[WARNING].{intrinsic,
// extrinsic}; Warning = (HWarning || EWarning).  A missing uprops entry reads as
// C's BSS-zero default.
export function Warning() {
    const p = game.u && game.u.uprops && game.u.uprops[WARNING];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: include/context.h:154 svc.context.warnlevel — "threshold (digit) to warn
// about unseen mons".  BSS-zero, then set to 1 by allmain.c:847 newgame() and
// never written again in 3.7.  Read through the live context so a future port of
// a writer is picked up automatically; 1 is the post-newgame value, not a guess.
function _warnlevel() {
    const w = game.context && game.context.warnlevel;
    return (w == null) ? 1 : (w | 0);
}

// C ref: display.h:64-66 _mon_warning(mon)
//   (Warning && !(mon)->mpeaceful && (mdistu(mon) < 100)
//    && (((int) ((mon)->m_lev / 4)) >= svc.context.warnlevel))
// mdistu(mon) = distu(mon->mx, mon->my) = squared distance to the hero.
export function mon_warning(mon) {
    if (!mon) return false;
    if (!Warning()) return false;
    if (mon.mpeaceful) return false;
    if (distu_sensemon(mon.mx | 0, mon.my | 0) >= 100) return false;
    return Math.trunc((mon.m_lev | 0) / 4) >= _warnlevel();
}

/* C display.c:639-642 display_warning's warning-level pick:
 *     int wl = Hallucination ? rn2_on_display_rng(WARNCOUNT - 1) + 1
 *                            : warning_of(mon);
 * WARNCOUNT is 6 (the six warning digits 0..5), so the hallucinating arm is
 * rn2(5) + 1 on the DISPLAY stream — never level 0.  Measured on seed0383, C
 * draws rn2(5) 45 times on that channel and this port drew none of them, so
 * every hallucinated glyph after the first warned-of monster was off by one
 * draw.  Both of this file's warning call sites (the cansee arm in
 * _map_location's monster block and _oos_warning_monster) go through here. */
function _display_warning_level(mon) {
    if (_hallucinating_dsp())
        return rn2_on_display_rng(WARNCOUNT - 1) + 1;
    return warning_of(mon);
}

// C ref: display.c:658-670 warning_of(mon) — the warning LEVEL (0..WARNCOUNT-1),
// clamped; C's `(int)(mon->m_lev / 4)` truncates toward zero.
const WARNCOUNT = 6;            /* C sym.h:174 */
export function warning_of(mon) {
    let wl = 0;
    if (mon_warning(mon)) {
        const tmp = Math.trunc((mon.m_lev | 0) / 4);
        wl = (tmp > WARNCOUNT - 1) ? WARNCOUNT - 1 : tmp;
    }
    return wl;
}

// C ref: drawing.c:39-52 def_warnsyms[WARNCOUNT] — the warning glyph's symbol and
// color, indexed by warning level.
const DEF_WARNSYMS = [
    { ch: '0', color: CLR_WHITE },
    { ch: '1', color: CLR_RED },
    { ch: '2', color: CLR_RED },
    { ch: '3', color: CLR_RED },
    { ch: '4', color: CLR_MAGENTA },
    { ch: '5', color: CLR_BRIGHT_MAGENTA },
];

// C ref: display.c:638-656 display_warning(mon) — "not a map_XXXX() function":
// the warning glyph FLOATS over the terrain via show_mon_or_warn() → show_glyph()
// and is deliberately NOT written into levl[][].glyph, so it vanishes from the
// hero's memory as soon as the monster's old square gets its next newsym().  We
// therefore preserve map memory except for retiring an invisible marker.
// Hallucination's rn2_on_display_rng arm is display-RNG only (a separate stream
// from the scored rn2 sequence).
function _oos_warning_monster(x, y) {
    let mon = null;
    for (let m = game.fmon; m != null; m = m.nmon) {
        if (m._mapRemoved) continue;
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at reads the grid, which m_detach cleared */
        if (m.mx === x && m.my === y) { mon = m; break; }
    }
    /* C display.c:1082-1084 `mon && mon_warning(mon) && !is_worm_tail(mon)`.
     * is_worm_tail is NOT "this monster is a worm" — display.c:500 defines it
     * as `(mon) && ((x != (mon)->mx) || (y != (mon)->my))`, i.e. "the cell being
     * drawn is not the monster's HEAD square".  C's m_at() answers with the
     * worm's monst struct for every tail segment too, and that comparison is
     * the only thing separating head from tail.
     *
     * The guard here read `mon.wormno` instead, captioned "mon.wormno is never
     * set" — a premise that is false: seed0360-wizard-world-tour arrives on
     * Dlvl 42 (wizard2) at step 344 with a long worm (mnum 114, m_id 3678,
     * m_lev 13, wormno 2) at (69,7), 68 squares-squared from the hero, and C
     * paints its Warning digit "3" there.  Because `wormno` was truthy this
     * port painted nothing, and that ONE cell was the whole remaining diff on
     * that frame.  Any long worm the hero has Warning of was invisible.
     *
     * The loop above matches m.mx/m.my EXACTLY, so what it can return is always
     * the head and is_worm_tail is false by construction — spelled out rather
     * than assumed, exactly as the cansee arm at :1700 spells it out. */
    if (!mon) return false;
    const worm_tail = (x !== (mon.mx | 0)) || (y !== (mon.my | 0));
    if (worm_tail) return false;
    if (!mon_warning(mon)) return false;
    const wl = _display_warning_level(mon);
    const sym = DEF_WARNSYMS[wl] || DEF_WARNSYMS[0];
    show_mon_or_warn(x, y, sym.ch, sym.color, false, 0, GLYPHCLS_MON, true);
    return true;
}

/* see_wsegs' real body is js/worm.js (C home worm.c:213), where wtails/wheads
 * live; re-exported through this module's own name so see_monsters() below is
 * unchanged. */

function Sting_effects(cnt) {
    /* C artifact.c:2466-2507.  Sting, Orcrist, and Grimtooth all use the
     * weapon's warning intrinsic, but the message is emitted only when its
     * strength crosses one of C's three thresholds (1, 5, 13 monsters).
     * This is display-only and consumes no scored RNG. */
    const wep = game.u?.uwep;
    const arti = wep?.oartifact | 0;
    if (arti !== 5 && arti !== 6 && arti !== 7)
        return;

    const oldCount = game.warn_obj_cnt | 0;
    const oldStrength = oldCount > 12 ? 3 : oldCount > 4 ? 2 : oldCount > 0 ? 1 : 0;
    const newStrength = cnt > 12 ? 3 : cnt > 4 ? 2 : cnt > 0 ? 1 : 0;
    const name = ARTILIST[arti - 1]?.name || 'Your weapon';
    const pluralVerb = (verb) => otense(wep, verb);
    const glowVerb = (count, ing) => {
        const v = count > 12 ? 'gleam' : count > 4 ? 'glimmer' : count > 0 ? 'flicker' : 'quiver';
        return ing ? v + 'ing' : v;
    };

    if (cnt === -1 && oldCount > 0) {
        /* Blindness toggled: continue the existing glow, with quiver while
         * blind, so the eventual stop message has the matching verb. */
        void pline(`${name} is ${glowVerb(_disp_Blind() ? 0 : oldCount, true)}.`);
    } else if (newStrength > 0 && newStrength !== oldStrength) {
        const color = arti === 5 ? 'red' : 'light blue';
        if (!_disp_Blind()) {
            const punctuation = newStrength > oldStrength ? '!' : '.';
            void pline(`${name} ${pluralVerb(glowVerb(cnt, false))} ${color}${punctuation}`);
        } else if (oldStrength === 0) {
            void pline(`${name} ${pluralVerb(glowVerb(0, false))} slightly.`);
        }
    } else if (cnt === 0 && oldCount > 0) {
        void pline(`${name} stops ${glowVerb(_disp_Blind() ? 0 : oldCount, true)}.`);
    }
}

// ── see_monsters ──
// C ref: display.c:1520-1564 see_monsters
export function see_monsters() {
    cosmic_push_owner_real("see_monsters");

    /* steed and unseen engulfer/holder/holdee are recognized via touch
       even if they aren't going to be rendered; other monsters
       may get flagged as having been seen by display_monster() if it's
       called by newsym() */
    if (game.u.usteed)
        game.u.usteed.meverseen = 1;
    if (game.u.ustuck)
        game.u.ustuck.meverseen = 1;

    /* loop through level.monsters (aka fmon) */
    let new_warn_obj_cnt = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if (_see_monsters_DEADMONSTER(mon))
            continue;
        if ((mon.mstate | 0) & 0x100 /* C monst.h: MON_STILL_ARRIVING */)
            continue;
        newsym(mon.mx, mon.my);
        if (mon.wormno)
            see_wsegs(mon);
        if (Warn_of_mon()
            && (game.context.warntype.obj & mon.data.mflags2) !== 0)
            new_warn_obj_cnt++;
    }

    /*
     * Make Sting glow blue or stop glowing if required.
     */
    if (new_warn_obj_cnt !== (game.warn_obj_cnt || 0)) {
        Sting_effects(new_warn_obj_cnt);
        game.warn_obj_cnt = new_warn_obj_cnt;
    }

    /* when mounted, hero's location gets caught by monster loop */
    if (!game.u.usteed)
        newsym(game.u.ux, game.u.uy);
    cosmic_pop_owner_real("see_monsters");
}

// ── docrt_flags ──
// C ref: display.c:docrt_flags — main display refresh routine.
const DOCRT_MAPONLY = 0x02;
const DOCRT_REFRESH = 0x04;
const DOCRT_NOCLS = 0x08;
const DOCRT_RECALC = 1;

export function docrt_flags(refresh_flags) {
    const maponly = (refresh_flags & DOCRT_MAPONLY) !== 0;
    const redrawonly = (refresh_flags & DOCRT_REFRESH) !== 0;
    const nocls = (refresh_flags & DOCRT_NOCLS) !== 0;

    if (!game.u.ux || (game.program_state && game.program_state.in_docrt))
        return; /* display isn't ready yet */

    if (!game.program_state) game.program_state = {};
    game.program_state.in_docrt = true;
    cosmic_push_owner_real("docrt_flags");

    let skip_to_post = false;

    if (redrawonly) {
        redraw_map(false);
        skip_to_post = true;
    }
    if (!skip_to_post && game.u.uswallow) {
        swallowed(1);
        skip_to_post = true;
    }
    if (!skip_to_post && game.u.uinwater && !Is_waterlevel(game.u.uz)) {
        under_water(1);
        skip_to_post = true;
    }
    if (!skip_to_post && game.u.uburied) { /* [not implemented] */
        under_ground(1);
        skip_to_post = true;
    }

    if (!skip_to_post) {
        /* shut down vision */
        vision_recalc(2);

        if (!nocls)
            cls();

        /* display memory */
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = game.level.at(x, y);
                if (loc && loc.remembered_glyph) {
                    show_glyph_cell(x, y, loc.remembered_glyph.ch, loc.remembered_glyph.color,
                                    loc.remembered_glyph.decgfx, _glyph_attr(loc.remembered_glyph),
                                    loc.remembered_glyph.cls ?? GLYPHCLS_CMAP, false,
                                    loc.remembered_glyph.otyp,
                                    loc.remembered_glyph.corpsenm);
                }
            }
        }

        /* see what is to be seen */
        vision_recalc(0);

        /* overlay with monsters */
        see_monsters();
    }

    /* post_map: */
    if (!maponly) {
        /* perm_invent */
        update_inventory();
        /* status */
        if (!game.disp) game.disp = {};
        game.disp.botlx = 1; /* SET_BOTLX — force a redraw of the bottom lines */
    }
    cosmic_pop_owner_real("docrt_flags");
    game.program_state.in_docrt = false;
}

// ── docrt ──
// C ref: display.c:docrt_flags — show_glyph(memory) → vision_recalc(0) → see_monsters().
// Step 1: render remembered terrain glyphs for all cells.
// Step 2: overlay visible monsters via newsym() (mirrors C see_monsters()).
// Step 3: show hero.
export async function docrt() {
    if (!game.level)
        return;
    /* C display.c:2036-2043 — docrt() is docrt_flags(0), whose FIRST branch is
     *     if (u.uswallow) { swallowed(1); return; }
     * A swallowed hero's full-screen repaint is the stomach and nothing else.
     * This function repaints remembered terrain through show_glyph_cell, so
     * newsym()'s own swallow guard does not cover it: after the #wizintrinsic
     * menu closed, C's seed0383 step 164 is a blank map with the cage on it and
     * this port put the whole level back underneath. */
    if (game.u?.uswallow | 0) {
        swallowed(1);
        return;
    }
    // Step 1: remembered terrain (mirrors C docrt_flags: show_glyph(x,y,lev->glyph))
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc?.remembered_glyph) {
                show_glyph_cell(x, y, loc.remembered_glyph.ch, loc.remembered_glyph.color,
                                loc.remembered_glyph.decgfx, _glyph_attr(loc.remembered_glyph),
                                loc.remembered_glyph.cls ?? GLYPHCLS_CMAP, false,
                                loc.remembered_glyph.otyp,
                                loc.remembered_glyph.corpsenm);
            }
        }
    // Step 1b: C display.c:2071 — `vision_recalc(0)` ("see what is to be seen"),
    // run between the memory paint and see_monsters().  C's docrt_flags() opens
    // with `vision_recalc(2)` (shut down vision) so this call finds every
    // could-see square NEWLY visible and newsym()s it, painting the LIVE terrain
    // over the memory just laid down.  This port ran neither, and relied on its
    // callers' own vision_recalc(1) to have refreshed MEMORY first -- which
    // works only while svl.level.flags.hero_memory is on.  It is off on exactly
    // two levels, the Planes of Water and Air (mkmaze.c:586), where C
    // deliberately remembers the whole map as one glyph ('#', S_cloud) and shows
    // the seen squares from their real terrain (blank, for AIR).  Without this
    // pair seed0373's Plane of Air arrival painted '#' over the 36-cell
    // line-of-sight wedge C leaves blank.
    vision_recalc(2);
    vision_recalc(0);
    // Step 2: overlay visible monsters (mirrors C see_monsters() → newsym(mon->mx, mon->my))
    // C ref: display.c:1539-1549 see_monsters() — walk fmon chain, call newsym per monster.
    for (let m = game.fmon; m != null; m = m.nmon) {
        if (m.mx != null && m.my != null)
            newsym(m.mx, m.my);
    }
    // Step 3: the hero's own square.  C's docrt_flags() has NO separate hero
    // paint: vision_recalc(0) newsym()s the hero's square like any other, and
    // newsym's u_at arm (display.c:1002-1009) gates display_self() on
    // canspotself() — so an INVISIBLE hero's square shows what lies under her.
    // This step used to paint hero_glyph unconditionally, which is
    // indistinguishable from C only while nothing can turn the hero invisible.
    // seed0030 segment 9 step 308: the hero drinks herself invisible on the
    // previous level (canspotself() already returns false, and steps 306-307
    // match C with no '@'), descends, and C paints the '<' of the up-staircase
    // she arrives on while this port repainted '@' over it — the segment's
    // first miss from there on.  Routing through newsym() also picks up the
    // steed and the under-hero object memory that arm already carries.
    if (game.u?.ux > 0)
        newsym(game.u.ux, game.u.uy);
    /* C docrt_flags post_map: refresh inventory and request a full status
     * repaint.  The next flush/bot must observe state restored since the
     * previous paint, including HConfusion after magic-trap remove curse. */
    update_inventory();
    game.disp ??= {};
    game.disp.botlx = 1;
}
// ── Painted-screen snapshot (C tty physical-terminal-vs-gbuf decouple) ──
// C ref: win/tty/topl.c more() / display.c print_glyph — NetHack's tty backend
// paints each newsym() to the physical terminal AS it happens, but when a
// message overflows the topline it calls more() *at that instant*, freezing the
// physical screen at the glyphs painted SO FAR.  Subsequent monster moves /
// deaths within the same per-turn movemon block update the internal gbuf but are
// NOT repainted until the more() is dismissed.  So the frame a session captures
// at such a --More-- is the screen as of the OVERFLOWING pline, not the
// post-movemon gbuf.
//
// Our replay accumulates the whole turn's messages and runs the whole movemon
// block before paging at flush_screen, so the gbuf is already post-movemon by
// then.  To match C we snapshot the rendered map cells (+ turn counter) at the
// MOMENT a pline first overflows the topline *during a movemon block*, and emit
// that snapshot for the movemon --More-- frame(s).  DISPLAY-ONLY: snapshots a
// copy of the disp_* cells; consumes no RNG, mutates no game state.
// Capture a copy of the currently-painted (disp_*) map cells — the analogue of
// the C tty physical terminal's last flush.  DISPLAY-ONLY: reads disp_* only,
// consumes no RNG, mutates no game state.  Returns a Map keyed y*COLNO+x.
function _capture_painted_cells() {
    const lvl = game?.level;
    const cells = new Map();
    if (!lvl) return cells;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = lvl.at(x, y);
            if (loc && loc.disp_ch && loc.disp_ch !== ' ') {
                cells.set(y * COLNO + x, {
                    ch: loc.disp_ch,
                    color: loc.disp_color ?? NO_COLOR,
                    dec: !!loc.disp_decgfx,
                    attr: loc.disp_attr | 0,
                });
            }
        }
    }
    return cells;
}
// ── The `time' status field is NOT repainted while the hero is running ──────
// C ref: allmain.c:261-263 — the turn counter's status update is CONDITIONAL:
//         svm.moves++;
//         ...
//         if (flags.time && !svc.context.run)
//             disp.time_botl = TRUE; /* 'moves' just changed */
// and display.c:2237-2239 flush_screen() repaints the status window only when
//         if (disp.botl || disp.botlx) bot(); else if (disp.time_botl) timebot();
// So while svc.context.run is set (a shift-run / g-rush / travel) the PHYSICAL
// `T:' field keeps whatever the last paint put there, however many turns the run
// burns — until something else dirties the whole status line (bot()) or the run
// stops (hack.c:4131-4136 end_running: `if (flags.time) disp.time_botl = TRUE;').
//
// This port re-derives the status row from live state at render time, so the
// suppressed value has to be latched explicitly: `_timeBotlFrozenMoves' holds the
// svm.moves the physical line still shows, and is non-null ONLY inside such a
// suppression window.  Outside a run it is null and every capture below reads
// live g.moves exactly as before.
//
// MEASURED on gen152-reseed-seed891925 step 9: a Tourist rushes three squares
// west from T:1; the pet's "The kitten bites the jackal.  The jackal is killed!"
// overflows the topline during the third step's movemon, and C's frozen frame
// reads T:1 while svm.moves is already 3.  Same shape on
// gen174-reseed-seed751626 step 30 (C T:70, live 73).
// DISPLAY-ONLY: no RNG, no game-state mutation beyond this display latch.
function _painted_moves(live) {
    const g = game;
    /* nhlua.c's tutorial gamestate restore changes svm.moves before its reset
     * message pages, while the physical status window retains the tutorial
     * clock.  Keep that page-local display value ahead of every live/run latch. */
    const tutorial = g?._tutorialStatusOverride?.moves;
    if (tutorial != null) return tutorial | 0;
    const f = g ? g._timeBotlFrozenMoves : null;
    if (f != null) return f | 0;
    return (live != null) ? (live | 0) : ((g && g.moves) | 0);
}
// C allmain.c:261-263, called at each svm.moves++ with the PRE-increment value
// (the number the status line is currently showing).
export function time_botl_moves_incremented(preMoves) {
    const g = game;
    if (!g) return;
    const _runTrace = process.env.FF_RUN_TRACE === '1';
    if (!g.flags || !g.flags.time) { g._timeBotlFrozenMoves = null; return; }
    /* C allmain.c:261-263 gates the time update on context.run alone.  A
     * travel endpoint re-arms run=8 for domove's final movement checks even
     * after its multi counter has reached zero, and C keeps T: frozen through
     * that boundary.  The following ordinary direction clears run via
     * set_move_cmd(dir, 0), which is mirrored by cmd.js's inline dispatcher. */
    if (g.context && (g.context.run | 0)) {
        // Suppressed: remember what the line still holds.
        if (g._timeBotlFrozenMoves == null) g._timeBotlFrozenMoves = preMoves | 0;
        if (_runTrace) pushRngLogEntry(`^time_botl_suppress[pre=${preMoves|0} moves=${g.moves|0} run=${g.context.run|0} multi=${g.multi|0} move=${g.context?.move?1:0} mv=${g.context?.mv?1:0} travel=${g.context?.travel?1:0} frozen=${g._timeBotlFrozenMoves|0}]`);
        return;
    }
    if (g.disp) g.disp.time_botl = 1;
    g._timeBotlFrozenMoves = null;
    if (_runTrace) pushRngLogEntry(`^time_botl_enable[pre=${preMoves|0} moves=${g.moves|0} run=${g.context?.run|0} multi=${g.multi|0} move=${g.context?.move?1:0} mv=${g.context?.mv?1:0} travel=${g.context?.travel?1:0}]`);
}
// C hack.c:4131-4136 end_running() — running stops, so update `time' even when
// no other status field changed.
export function time_botl_run_ended() {
    const g = game;
    if (!g) return;
    if (g.flags && g.flags.time && g.disp) g.disp.time_botl = 1;
    g._timeBotlFrozenMoves = null;
    if (process.env.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^time_botl_run_ended[moves=${g.moves|0} run=${g.context?.run|0} multi=${g.multi|0} timeBotl=${g.disp?.time_botl|0}]`);
}
function _maybe_snapshot_painted_screen() {
    const g = game;
    if (!g) return;
    // Only inside the per-turn monster-movement block (C: svc.context.mon_moving).
    if (!g._inMovemonBlock) return;
    if (!g.level) return;
    const msg = g._pending_message || '';
    if (_topl_split_for_more(msg) === null) return;
    // The FIRST overflow (the instant C's more() would fire) is the single-page
    // snapshot every existing paging path reads.
    //
    // C ref: pline.c:274-277 — vpline() flushes the status window (bot()) at
    // THIS exact instant too, not only the map, so the frozen page's `botl`
    // must be pinned here alongside `cells`.  Without it, `_statusLine2()`
    // falls back to a LIVE read of `u`, and since this port runs a whole
    // synchronous turn (movemon, then the hero's own command) BEFORE any of
    // its plines are actually paged, a later-in-the-turn state change (e.g.
    // domagicportal's make_stunned()) leaks backward onto an EARLIER movemon
    // page that predates it.  MEASURED gen345-reseed-seed244908 step 108: C's
    // "The kitten picks up an uncursed spellbook of sleep.--More--" page (the
    // FIRST overflow, frozen before the hero's later magic-portal trap stuns
    // them) carries no Stun; this port rendered live post-stun state and
    // showed it.
    //
    // SIDE EFFECT, declared rather than hidden behind "no game state".
    // _capture_botl() consumes no RNG — that part is unqualified.  But it is
    // not inert: it ADVANCES three paint-cache fields, and all three are read
    // somewhere OTHER than the frame being captured, so adding capture points
    // here moves them to the movemon-page instant.
    //   game._lastPaintedBotl      — what _capture_botl() RETURNS on the
    //                                u.uhp == -1 death path (see its header's
    //                                seed5002 witness), i.e. the values every
    //                                later death frame renders.
    //   game._botlPaintedCap       — the encumbrance latch every later
    //   game._botlPaintedDeaf        _capture_botl() reads back.
    // That advance is C-FAITHFUL, and it is C-faithful for the same reason the
    // capture itself is: these three fields model "what the last bot() left on
    // the physical status line", and C's bot() DOES run at this instant —
    // vpline() calls flush_screen() before putmesg() (pline.c:273-274) and
    // flush_screen() opens with `if (disp.botl || disp.botlx) bot();`
    // (display.c:2237-2240).  A movemon pline is a real paint in C, so the
    // physical line C's death frame later preserves is the one painted HERE,
    // not at some earlier point in the turn.  Freezing the page's status while
    // leaving the latches behind would be the inconsistent choice.
    //
    // PRE-EXISTING and NOT introduced here: C's bot() clears the dirty flags on
    // the way out (`disp.botl = disp.botlx = disp.time_botl = FALSE;`,
    // botl.c:270) and _capture_botl() does not, so a second capture in the same
    // command re-latches cap/deaf where C's second flush_screen would have found
    // the flags already clear and painted nothing.  Every existing capture site
    // has that property; these two add to it rather than create it.
    if (!g._paintedSnapshot)
        g._paintedSnapshot = { cells: _capture_painted_cells(), moves: _painted_moves(),
            botl: _capture_botl() };
    // ── Per-PAGE painted frames (a multi-page movemon window) ────────────────
    // C ref: win/tty/topl.c update_topl() — EVERY pline that does not fit the
    // remaining topline calls more() AT THAT INSTANT, so a movemon window that
    // pages N times freezes the physical terminal N separate times, each at the
    // gbuf as of that page's overflowing pline.  Our replay accumulates the whole
    // window's messages and pages them all later at flush_screen, so the single
    // first-overflow snapshot above is correct for page 1 and STALE for pages
    // 2..N.  Record one frame per overflow instant here; flush_screen's paging
    // loop consumes them in order.  (seed0600: an 88-turn sleep-ray nomul pages
    // ~20 pet pickup/drop messages, and C shows the pet at a different square on
    // every one of them.)  DISPLAY-ONLY: snapshots a copy of the disp_* cells;
    // consumes no RNG.  `botl` pinned for the same reason as the first-overflow
    // snapshot above, and carrying the same declared paint-cache advance — see
    // the SIDE EFFECT note there; this site is the second of the two.
    const pages = _topl_page_count(msg);
    let logged = g._movemonPagesLogged | 0;
    if (pages > logged) {
        const frame = { cells: _capture_painted_cells(), moves: _painted_moves(),
            botl: _capture_botl() };
        if (!g._movemonPageFrames) g._movemonPageFrames = [];
        // A single over-long pline can cross several page boundaries at once; all
        // of those pages are frozen at this one instant in C too.
        while (logged < pages) { g._movemonPageFrames.push(frame); logged++; }
        g._movemonPagesLogged = logged;
    }
}
// How many --More-- pages the accumulated topline `line` currently splits into.
// C ref: the count of update_topl() more() calls the accumulated plines have
// already forced.  DISPLAY-ONLY: reads only, no RNG, no state mutation.
function _topl_page_count(line) {
    let n = 0;
    let cur = line, joins;
    for (;;) {
        const split = _topl_split_for_more(cur, joins);
        if (!split) break;
        n++;
        cur = split[1];
        joins = split[2];
        if (n >= 4096) break;   // safety: never spin on a pathological topline
    }
    return n;
}
// Drop the per-page painted-frame log for a finished movemon paging window.
// DISPLAY-ONLY.
function _movemon_page_frames_reset() {
    const g = game;
    if (!g) return;
    g._movemonPageFrames = null;
    g._movemonPagesLogged = 0;
}
// ── Occupation painted frame (C tty last-flush during a silent occupation) ──
// During a multi-turn occupation (e.g. eating a corpse) the per-turn monster
// movement repaints the map every turn but produces NO new topline message, so
// C's tty never calls more() — the physical terminal is simply repainted at each
// per-turn flush.  When the occupation's FINAL turn then emits a pageable message
// (e.g. done_eating's "You finish eating ..." appended to an already-overflowing
// topline), C's more() freezes the PHYSICAL screen at the LAST per-turn flush
// (the meal's final movemon map), while svm.moves has already advanced to that
// final turn (the HEAD ++ runs before the occupation callback fires done_eating).
// So the frozen frame = final-occupation-turn MAP + that turn's `T:`.
//
// occupation_painted_tick() records the now-painted gbuf at the end of each
// occupation turn (overwriting; the LAST one stands).  occupation_freeze_snapshot()
// promotes that frame as the painted snapshot (with the current moves as `T:`), to
// be consumed by the pending --More-- at the next flush_screen.  DISPLAY-ONLY: no
// RNG, no game-state mutation; gated entirely on the occupation driver calling it,
// so it has ZERO effect on any session that never runs a multi-turn occupation.
export function occupation_painted_tick() {
    const g = game;
    if (!g) return;
    g._occCurFrame = _capture_painted_cells();
    /* Pair the map with the status paint from the same per-turn flush. */
    g._occCurBotl = _capture_botl();
}
export function occupation_freeze_snapshot() {
    const g = game;
    if (!g) return;
    const frame = g._occCurFrame;
    if (!frame) return;
    // Do not clobber an already-captured movemon snapshot.
    if (g._paintedSnapshot) return;
    g._paintedSnapshot = { cells: frame, moves: _painted_moves() };
}
export function occupation_painted_reset() {
    const g = game;
    if (!g) return;
    g._occCurFrame = null;
    g._occCurBotl = null;
}
// ── Run-step painted frames (C tty per-run-turn last-flush during a paged run) ──
// C ref: win/tty/topl.c more() + hack.c runmode_delay_output.  During a multi-step
// run the hero is repainted at each step's new square (curs_on_u/flush per
// runmode_delay_output) and each step's movemon plines append to the SAME topline
// (no nhgetch clears it between run steps).  When that accumulating line overflows
// CO-1, C's update_topl() calls more() AT THE INSTANT the overflowing pline is added
// — freezing the PHYSICAL screen at the hero square of the run turn whose message
// crossed the width boundary, NOT the run's final square.  Our run loop batches every
// run turn before flush_screen pages the accumulated topline, so the live disp_*
// buffer already holds the run's FINAL hero square by paging time.  To match C we
// record each run turn's painted frame together with the topline length accumulated
// through that turn (run_page_frame_tick, called from the Stage-C run loop), then the
// width-paging loop in flush_screen picks, for each --More-- page, the earliest run
// turn whose accumulated length reaches that page's committed end (the turn whose
// pline triggered the page's overflow) and freezes its frame.  DISPLAY-ONLY: snapshots
// disp_* cells, consumes no RNG, mutates no game state.  Gated on _runPageFrames being
// populated; an empty log leaves every existing --More-- path byte-identical.
export function run_page_frame_reset() {
    const g = game;
    if (!g) return;
    g._runPageFrames = null;
}
export function run_page_frame_tick() {
    const g = game;
    if (!g || !g.level) return;
    // The topline length accumulated through this run turn — the analogue of the
    // physical-terminal topline width at the moment this turn's plines were painted.
    const len = (g._resultMessage ? g._resultMessage.length + 2 : 0)
        + (g._pending_message ? g._pending_message.length : 0);
    if (!g._runPageFrames) g._runPageFrames = [];
    // The movemon plines this turn produced belong to the turn whose rations they
    // spent — one before the post-increment g.moves (the same convention
    // moveloop_core tags as _movemonMsgTurn = g.moves-1).  Record that turn so the
    // paged --More-- frame's `T:` matches C's bot2() (which shows svm.moves as of the
    // overflowing pline, before that turn's HEAD svm.moves++).
    g._runPageFrames.push({
        cells: _capture_painted_cells(),
        moves: _painted_moves(((g.moves | 0) - 1) || 1),
        len,
    });
}
// Select the run-turn painted frame whose accumulated topline length first reaches
// `committedEnd` (the character offset of a --More-- page's committed end within the
// full accumulated topline).  Returns the frame object or null when no per-run frame
// log exists (non-run paging → caller falls back to the single _paintedSnapshot).
function _run_page_frame_select(committedEnd) {
    const g = game;
    const frames = g && g._runPageFrames;
    if (!frames || !frames.length) return null;
    for (const f of frames) {
        if (f.len >= committedEnd) return f;
    }
    // No turn reached the offset (the page's content spilled past the last recorded
    // turn — e.g. a command result appended after the run): freeze the last turn.
    return frames[frames.length - 1];
}
// ── Level-transition painted snapshot (C tty goto_level descend/climb --More--) ──
// C ref: do.c:1814 goto_level — on an ordinary descend/climb C issues
// You("%s.", "descend the stairs") (do.c:1812-1814) and THEN, further down,
// vision_reset()/reset_glyphmap()/docrt()/flush_screen(-1) (do.c:1851-1855) wipe
// and redraw the screen for the NEW level.  Because the fresh "You descend the
// stairs." message is on the topline when the message window is cleared for the
// redraw, the tty calls more() (topl.c:212) — freezing the PHYSICAL terminal at
// the LAST flush BEFORE the redraw, i.e. the OLD level's painted map with the OLD
// Dlvl in the status line (bot() for the new level has not run yet).  Only after
// the player dismisses the --More-- does docrt() paint the new (vision-masked)
// level and bot() refresh Dlvl.  Verified on seed0015 step 19: the --More-- frame
// = the level-1 map + Dlvl:1, identical to step 18's last flush, with the descend
// topline; step 20 (post-dismiss) = the level-2 vision-masked map + Dlvl:2.
//
// level_transition_capture_old_paint() snapshots the OLD level's painted cells +
// its dlevel BEFORE mklev()/clear_level_structures destroys it.  Then, after the
// hero is placed on the new level, level_transition_arrival_more(msg) emits the
// arrival message and drives the forced more() over that frozen frame — reusing
// the same _paintedSnapshot machinery as the movemon/occupation --More-- windows
// (render_map_row's _snapCellAt + _statusLine2's snapshot dlevel).  DISPLAY-ONLY:
// snapshots disp_* cells, consumes no RNG, mutates no game state.  Gated entirely
// on the goto_level caller invoking it → ZERO effect on any non-transition path.
export function level_transition_capture_old_paint() {
    const g = game;
    if (!g || !g.level) return null;
    return {
        cells: _capture_painted_cells(),
        moves: _painted_moves(),
        dlevel: g.u?.uz?.dlevel | 0,
        dnum: g.u?.uz?.dnum | 0,
    };
}
// ── Pre-movemon painted frame (cmdq fireassist swap --More-- freeze) ──
// C ref: win/tty/topl.c more().  In the cmdq dofire fireassist drain
// (dothrow.c:566-570 → [doswapweapon, dofire]) the swap's deferred prinv line
// (prinv(uswapwep), wield.c:489 — "a - a +1 club (alternate weapon; ...)") is
// committed to the topline BEFORE the swap's banked world turn (movemon) runs.
// When that world turn then plines a fresh message (the pet's "Slasher drops a
// food ration."), C's tty more()s the still-committed swap prinv line, freezing
// the PHYSICAL screen at the LAST flush BEFORE movemon — the pre-movemon map
// (pet not yet moved → "@d%#") with the pre-increment svm.moves (T:22).  Only
// the movemon pline's own page (and everything after) shows the post-movemon
// map + incremented T:.  This captures that pre-movemon frame so the segment
// pager in dofire's getdir flush can freeze the swap-prinv page on it.
// DISPLAY-ONLY: snapshots disp_* cells, consumes no RNG, mutates no game state.
export function capture_painted_frame() {
    const g = game;
    if (!g || !g.level) return null;
    return { cells: _capture_painted_cells(), moves: _painted_moves() };
}
// Force the goto_level arrival --More-- using a previously-captured old-level
// paint snapshot.  Shows "<msg>--More--" over the frozen OLD-level frame (old map
// + old Dlvl), consuming the dismiss key via nhgetch (no RNG).  After dismissal
// the snapshot is dropped so the next flush_screen/docrt renders the live (new)
// level.  This mirrors the C ordering (pline → more() over last flush → docrt of
// new level).  msg is the already-formatted arrival line (e.g. "You descend the
// stairs.").  oldPaint is the object returned by
// level_transition_capture_old_paint().
//
// `msg` is not always ONE C pline: js/cmd.js's caller passes whatever is on
// _pending_message OR _resultMessage at this point, which can be several
// world-block plines joined together (movemon messages plus the command's
// own trap-effect lines) — the same accumulated-topline shape flush_screen()
// pages elsewhere.  C ref: win/tty/topl.c update_topl's CO-1-8 reserve raises
// a SEPARATE --More-- per pline that does not fit, and the caller here is
// paging whatever was still un-acknowledged when the arrival redraw needed
// the message window flushed (do.c:1851-1855's docrt(), reached through
// vision_reset()/docrt() below in cmd.js) — exactly the same "flush messages"
// step C's cls() does before a redraw, just for the goto_level arrival rather
// than a mid-game cls().  Treating `msg` as a single atomic page collapsed
// however many C pages it represents into one, so this port consumed one
// dismiss keystroke where C consumed several and read the corpus's next
// recorded keys as fresh top-level commands instead.
//
// MEASURED gen345-reseed-seed244908 steps 108-113: domagicportal's "You
// activated a magic portal!" + "You feel slightly dizzy." land on a topline
// already holding two movemon pickup messages; C pages it three times
// ("The kitten picks up an uncursed spellbook of sleep.--More--", "The kobold
// picks up a sling.  You activated a magic portal!--More--", "You feel
// slightly dizzy.--More--") before the arrival redraw. This port joined and
// word-wrapped all four onto one over-wide page.
//
// Split `msg` the same way flush_screen()'s pager does (the per-pline CO-1-8
// reserve, via the join offsets pline()/js/cmd.js's inline-append sites
// already recorded) and page each segment separately, all against the SAME
// frozen old-level frame — every one of these pages happens before docrt()
// repaints, so C's physical terminal is unchanged across all of them.
export async function level_transition_arrival_more(msg, oldPaint) {
    const g = game;
    if (!g || !oldPaint) return;
    // The caller (js/cmd.js deferred_goto/goto_level) hands us whichever of
    // the two message channels was holding the unacknowledged topline; find
    // whichever one actually recorded join offsets for THIS string (a plain
    // string equality, same as _topl_joins_snapshot already does for
    // _pending_message — extended here to _resultMessageJoins, the channel a
    // command's own committed result line carries its joins on).
    const _joins = (g._topl_joins_src === msg && Array.isArray(g._topl_joins))
        ? g._topl_joins.slice()
        : (g._resultMessageJoins && g._resultMessageJoins.src === msg
           && Array.isArray(g._resultMessageJoins.joins))
            ? g._resultMessageJoins.joins.slice() : null;
    const _pages = _topl_more_pages(msg, _joins);
    /* _topl_more_pages ends by pushing its final remainder UNCONDITIONALLY,
     * and three of _topl_split_for_more's arms commit the whole line with an
     * EMPTY remainder — the word-wrap overflow arm (5222), the no-joins forced
     * break (5225) and the trailing forced break (5285).  So the page list can
     * end in a '' that is not a page at all.  flush_screen()'s own pager never
     * emits it: its `while (split)` loop only ever emits a `committed`, and it
     * re-tests the remainder through _topl_split_for_more before the next
     * iteration, so an empty remainder simply ends the loop.  Follow that shape
     * here by dropping the empty tail, rather than letting it sit past the real
     * last page and make that page look like an earlier one. */
    while (_pages.length && !_pages[_pages.length - 1]) _pages.pop();
    // Some of these plines may have accumulated DURING the turn's own movemon
    // block, which already snapshots a per-overflow painted frame as each one
    // is added (_maybe_snapshot_painted_screen / g._movemonPageFrames — C's
    // more() blocks mid-movemon, so a LATER page's frame has later monsters'
    // moves painted into it that an EARLIER page must not show).  Preserve
    // whatever that mechanism already recorded before we install anything;
    // `oldPaint` (captured once, right before this redraw) is exact only for
    // the LAST outstanding page — its overflow instant is "right before the
    // arrival redraw" by construction — and is the fallback everywhere else.
    const _ambientSnap = g._paintedSnapshot;
    const _pageFrames = g._movemonPageFrames;
    g._pending_message = '';
    // Drive the forced more() over each committed page in turn.  _topl_more shows
    // "<committed>--More--", marks _inMovemonMore (because _paintedSnapshot is
    // set, topl.c:1262), captures the frame at its nhgetch and consumes the dismiss
    // key, then restores _inMovemonMore.  After the last one, page-cleanup drops the
    // snapshot so the post-dismiss render uses the live new-level buffer.
    for (let i = 0; i < _pages.length; i++) {
        const _pg = _pages[i];
        if (!_pg) continue;
        /* The ladder the comment above states: the LAST outstanding page is the
         * one whose more() fires right before the arrival redraw, so oldPaint is
         * exact for it and nothing else may displace it — including _ambientSnap,
         * which is _maybe_snapshot_painted_screen's FIRST-overflow frame and is
         * therefore an EARLIER page's instant.  The `i === 0` arm was not gated
         * on !_isLast, so a SINGLE-page arrival that had an ambient snapshot
         * rendered the movemon-overflow frame where the previous code always
         * rendered oldPaint.
         *
         * MEASURED (an instrumented replay of this ladder, 2026-09-10): the
         * public 44 reach this function ~35 times and EVERY call is
         * n=1/pf=false/amb=false, so they never took the mis-gated arm — that
         * is why the floor cannot see this and stands at 11391/11405 either
         * way.  gen345-reseed-seed244908's one call is n=3 with pf true, true,
         * false, so its last page already fell through to oldPaint and its
         * 423/532 is unmoved too.  This is a latent trap being closed, not a
         * measured behaviour change. */
        const _isLast = (i === _pages.length - 1);
        const _frame = _isLast ? oldPaint
            : (_pageFrames && _pageFrames[i]) ? _pageFrames[i]
            : (i === 0 && _ambientSnap) ? _ambientSnap
            : oldPaint;
        g._paintedSnapshot = {
            cells: _frame.cells,
            moves: _frame.moves,
            dlevel: _frame.dlevel ?? oldPaint.dlevel,
            dnum: _frame.dnum ?? oldPaint.dnum,
            /* C pline.c:274-277 — thread the per-page frame's own frozen botl
             * (now pinned by _maybe_snapshot_painted_screen) through so
             * _statusLine2() reads THIS page's status, not the live one.
             * `oldPaint` carries none (level_transition_capture_old_paint()
             * is deliberately left un-pinned: it is captured immediately
             * before this redraw, by which point every effect the turn's
             * command produced has already applied, so a live read at
             * render time already equals its own paint instant) — that is
             * exactly right for the LAST outstanding page (_isLast), whose
             * more() in C fires after those effects too. */
            botl: _frame.botl ?? null,
        };
        const _morc = await _topl_more(_pg);
        if (_morc === 27)
            g._arrival_more_suppress = true;
    }
    g._pending_message = '';
    g._paintedSnapshot = null;
    g._movemonMsgTurn = null;
    /* The per-page frame log is a PAIR: the array and its high-water counter
     * g._movemonPagesLogged, which _maybe_snapshot_painted_screen seeds
     * `logged` from.  Nulling the array alone strands the counter — the only
     * other reset is flush_screen's, guarded by `hadMore && _movemonPageFrames`
     * (below), which a null array can never satisfy — so the next movemon
     * window would record no frames until it passed the stale count and then
     * push from index 0 while `logged` continued from the stale value, leaving
     * every _movemonPageFrames[pageIdx] lookup off by that amount.  Reset
     * through the one helper that owns both halves so the pair cannot be
     * desynchronised by a future edit.  DISPLAY-ONLY. */
    /* The final transition-page dismissal is C's stable boundary: docrt()
     * repaints the restored hero immediately afterward.  A render-count budget
     * expired on internal, unrecorded repaints and exposed AC:7 for gen608's
     * last five pages while C's physical tutorial status still read AC:10. */
    if (g._tutorialStatusOverride)
        g._tutorialStatusOverride = null;
    _movemon_page_frames_reset();
}
// Snapshot-aware cell accessor: during a movemon --More-- frame returns the
// snapshot cell (the C-flushed physical paint); otherwise the live disp_* cell.
function _snapCellAt(x, y) {
    /* _levelgenPaintFreeze: goto_level's mklev() arm can raise a wizard-mode
     * query (getbones' "Get bones?" / "Unlink bones?") while the OLD level has
     * already been handed to savelev() and the NEW one is half-built.  C is a
     * physical terminal there: nothing has repainted the map since the last
     * flush on the old level (vision_reset/docrt are do.c:1718/1840, AFTER
     * mklev), so those query frames still show the old level's cells.  This
     * port rebuilds the map from game.level on every flush, so it painted a
     * blank one.  MEASURED, seed5006 segment 1 steps 4-5.
     * MAP CELLS ONLY — the status row is NOT frozen, because C's bot() has
     * already run for the new dlevel by then (C shows Dlvl:3 over the old map).
     */
    const snap = (game._inMovemonMore && game._paintedSnapshot) ? game._paintedSnapshot
               : (game._levelgenPaintFreeze || null);
    if (snap) {
        const c = snap.cells.get(y * COLNO + x);
        if (c) return { ch: c.ch, color: c.color, dec: c.dec, attr: c.attr };
        return { ch: ' ', color: NO_COLOR, dec: false, attr: 0 };
    }
    const loc = game.level?.at(x, y);
    return {
        ch: loc?.disp_ch ?? ' ',
        color: loc?.disp_color ?? NO_COLOR,
        dec: !!loc?.disp_decgfx,
        attr: loc?.disp_attr | 0,
    };
}
// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y) {
    if (!game.level && !game._levelgenPaintFreeze)
        return '';
    // During a movemon --More-- frame, read the C-flushed physical-paint snapshot
    // instead of the live (post-movemon) disp_* buffer.  _snapCellAt falls back to
    // the live buffer when no snapshot is active, so the non-paging path is
    // byte-identical to before.
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x < COLNO; x++) {
        const cell = _snapCellAt(x, y);
        if (cell.ch && cell.ch !== ' ') {
            if (firstCol < 0)
                firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0)
        return '';
    let output = '';
    /* C symbols.c:217-233 assign_graphics(ROGUESET): gs.showsyms comes from
     * gr.rogue_syms, which is defsyms[] — plain ASCII, no DEC line-drawing —
     * and display.c:3077-3081 clears every glyph colour.  Both are properties
     * of the whole map, so they are applied once here for the row. */
    const rogueMap = rogue_graphics();
    let activeColor = ANSI_DEFAULT; // default
    let activeDec = false;
    let activeInverse = false; // ATR_INVERSE (hilite_pet pet glyph) — C \e[7m..\e[0m
    // Leading gap
    const gap = firstCol - 1;
    if (gap > 4)
        output += `\x1b[${gap}C`;
    else if (gap > 0)
        output += ' '.repeat(gap);
    for (let x = firstCol; x <= lastCol; x++) {
        const cell = _snapCellAt(x, y);
        const ch = cell.ch ?? ' ';
        /* C display.c:3077-3081 — on a Rogue level without PC graphics every
         * glyphmap colour is forced to NO_COLOR (see rogue_graphics() above). */
        const color = (rogueMap || game.iflags?.use_color === false)
            ? NO_COLOR : (cell.color ?? NO_COLOR);
        /* rogue_syms is defsyms[] — plain ASCII, so nothing on a Rogue level's
         * map is ever in DEC line-drawing mode (C symbols.c:186-207). */
        const dec = !rogueMap && !!cell.dec;
        const inverse = !!(cell.attr & 1 /* ATR_INVERSE */);
        if (ch === ' ') {
            // Space runs. A blank map cell (S_stone / dark void) is always
            // emitted at the terminal default color in C — close any open
            // color run before the gap so the preceding glyph's color does
            // not bleed onto the adjacent void cell (e.g. the cell right of
            // the hero @). Verified against all recorded sessions: a literal
            // space never appears inside a foreground color run in the map.
            if (activeInverse) {
                output += '\x1b[0m'; /* close inverse (resets color+dec too) */
                activeInverse = false; activeColor = ANSI_DEFAULT;
            }
            if (activeColor !== ANSI_DEFAULT) {
                output += `\x1b[${ANSI_DEFAULT}m`;
                activeColor = ANSI_DEFAULT;
            }
            let run = 1;
            while (x + run <= lastCol && (_snapCellAt(x + run, y).ch ?? ' ') === ' ')
                run++;
            if (activeDec) {
                output += '\x0f';
                activeDec = false;
            }
            if (run > 4)
                output += `\x1b[${run}C`;
            else
                output += ' '.repeat(run);
            x += run - 1;
            continue;
        }
        /* C ref: tty term_start_attr(ATR_INVERSE) → \e[7m ; term_end → \e[0m.
         * A hilite_pet pet glyph is wrapped \e[7m<ch>\e[0m, and the trailing
         * \e[0m resets color+dec state (so they must be re-emitted next cell). */
        if (!inverse && activeInverse) {
            output += '\x1b[0m';
            activeInverse = false; activeColor = ANSI_DEFAULT;
            if (activeDec) { output += '\x0f'; activeDec = false; }
        }
        /* C emits the inverse SGR \e[7m BEFORE the color \e[97m (term_start_attr
         * precedes the color set), so a hilite_pet glyph is \e[7m\e[97m<dec>d. */
        if (inverse && !activeInverse) {
            output += '\x1b[7m';
            activeInverse = true;
        }
        let wantAnsi = ANSI_COLOR[color] ?? ANSI_DEFAULT;
        if (wantAnsi !== activeColor) {
            output += `\x1b[${wantAnsi}m`;
            activeColor = wantAnsi;
        }
        // DEC mode switching
        if (dec && !activeDec) {
            output += '\x0e';
            activeDec = true;
        }
        else if (!dec && activeDec) {
            output += '\x0f';
            activeDec = false;
        }
        output += ch;
        if (inverse) {
            // close the inverse run immediately after the glyph (C emits
            // \e[0m right after the pet char); reset color/dec state.
            if (activeDec) { output += '\x0f'; activeDec = false; }
            output += '\x1b[0m';
            activeInverse = false; activeColor = ANSI_DEFAULT;
        }
    }
    // Reset state at end of row (C does per-row SO/SI)
    if (activeInverse) {
        output += '\x1b[0m';
        activeInverse = false; activeColor = ANSI_DEFAULT;
    }
    if (activeDec)
        output += '\x0f';
    if (activeColor !== ANSI_DEFAULT)
        output += `\x1b[${ANSI_DEFAULT}m`;
    return output;
}
// ── Role rank tables ──
// C ref: botl.c:rank_of → xlev_to_rank → roles[].rank[i].{m,f}
// Indexed by game.urole.mnum (0=Arc,1=Bar,2=Cav,3=Hea,4=Kni,5=Mon,6=Pri,
//   7=Rog,8=Ran,9=Sam,10=Tou,11=Val,12=Wiz); inner array = 9 rank entries
//   each [male, female|null].
// Source: nethack-c/src/role.c roles[] rank arrays.
const _ROLE_RANKS = [
    // 0 Arc
    [['Digger', null], ['Field Worker', null], ['Investigator', null], ['Exhumer', null], ['Excavator', null], ['Spelunker', null], ['Speleologist', null], ['Collector', null], ['Curator', null]],
    // 1 Bar
    [['Plunderer', 'Plunderess'], ['Pillager', null], ['Bandit', null], ['Brigand', null], ['Raider', null], ['Reaver', null], ['Slayer', null], ['Chieftain', 'Chieftainess'], ['Conqueror', 'Conqueress']],
    // 2 Cav
    [['Troglodyte', null], ['Aborigine', null], ['Wanderer', null], ['Vagrant', null], ['Wayfarer', null], ['Roamer', null], ['Nomad', null], ['Rover', null], ['Pioneer', null]],
    // 3 Hea
    [['Rhizotomist', null], ['Empiric', null], ['Embalmer', null], ['Dresser', null], ['Medicus ossium', 'Medica ossium'], ['Herbalist', null], ['Magister', 'Magistra'], ['Physician', null], ['Chirurgeon', null]],
    // 4 Kni
    [['Gallant', null], ['Esquire', null], ['Bachelor', null], ['Sergeant', null], ['Knight', null], ['Banneret', null], ['Chevalier', 'Chevaliere'], ['Seignieur', 'Dame'], ['Paladin', null]],
    // 5 Mon
    [['Candidate', null], ['Novice', null], ['Initiate', null], ['Student of Stones', null], ['Student of Waters', null], ['Student of Metals', null], ['Student of Winds', null], ['Student of Fire', null], ['Master', null]],
    // 6 Pri
    [['Aspirant', null], ['Acolyte', null], ['Adept', null], ['Priest', 'Priestess'], ['Curate', null], ['Canon', 'Canoness'], ['Lama', null], ['Patriarch', 'Matriarch'], ['High Priest', 'High Priestess']],
    // 7 Rog
    [['Footpad', null], ['Cutpurse', null], ['Rogue', null], ['Pilferer', null], ['Robber', null], ['Burglar', null], ['Filcher', null], ['Magsman', 'Magswoman'], ['Thief', null]],
    // 8 Ran
    [['Tenderfoot', null], ['Lookout', null], ['Trailblazer', null], ['Reconnoiterer', 'Reconnoiteress'], ['Scout', null], ['Arbalester', null], ['Archer', null], ['Sharpshooter', null], ['Marksman', 'Markswoman']],
    // 9 Sam
    [['Hatamoto', null], ['Ronin', null], ['Ninja', 'Kunoichi'], ['Joshu', null], ['Ryoshu', null], ['Kokushu', null], ['Daimyo', null], ['Kuge', null], ['Shogun', null]],
    // 10 Tou
    [['Rambler', null], ['Sightseer', null], ['Excursionist', null], ['Peregrinator', 'Peregrinatrix'], ['Traveler', null], ['Journeyer', null], ['Voyager', null], ['Explorer', null], ['Adventurer', null]],
    // 11 Val
    [['Stripling', null], ['Skirmisher', null], ['Fighter', null], ['Man-at-arms', 'Woman-at-arms'], ['Warrior', null], ['Swashbuckler', null], ['Hero', 'Heroine'], ['Champion', null], ['Lord', 'Lady']],
    // 12 Wiz
    [['Evoker', null], ['Conjurer', null], ['Thaumaturge', null], ['Magician', null], ['Enchanter', 'Enchantress'], ['Sorcerer', 'Sorceress'], ['Necromancer', null], ['Wizard', null], ['Mage', null]],
];
// C ref: botl.c:xlev_to_rank — (xlev<=2)?0:(xlev<=30)?((xlev+2)/4):8
function _xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.floor((xlev + 2) / 4) : 8;
}
// Map role male name → _ROLE_RANKS index (mirrors roles[] order in role.c).
// game.urole.name.m is set by allmain.js from roles[initrole].name.{m,f}.
const _ROLE_NAME_TO_IDX = {
    'Archeologist': 0, 'Barbarian': 1, 'Caveman': 2, 'Cavewoman': 2,
    'Healer': 3, 'Knight': 4, 'Monk': 5, 'Priest': 6, 'Priestess': 6,
    'Rogue': 7, 'Ranger': 8, 'Samurai': 9, 'Tourist': 10,
    'Valkyrie': 11, 'Wizard': 12,
};
// C ref: botl.c:rank_of — find role by name, then scan ranks downward for
//   female variant (if female && rank[i].f) else male (rank[i].m).
function _rank_of(ulevel, roleName, female) {
    const idx = _ROLE_NAME_TO_IDX[roleName] ?? -1;
    const ranks = (idx >= 0) ? _ROLE_RANKS[idx] : null;
    if (!ranks)
        return null;
    for (let i = _xlev_to_rank(ulevel); i >= 0; i--) {
        if (female && ranks[i][1])
            return ranks[i][1];
        if (ranks[i][0])
            return ranks[i][0];
    }
    return null;
}

// C ref: botl.c:339-364 rank_of(lev, monnum, female) — find rank title
// Inverse mapping from role index (0-12) to role names for mnum lookup
const _ROLE_IDX_TO_NAMES = [
    { m: 'Archeologist', f: null },
    { m: 'Barbarian', f: null },
    { m: 'Caveman', f: 'Cavewoman' },
    { m: 'Healer', f: null },
    { m: 'Knight', f: null },
    { m: 'Monk', f: null },
    { m: 'Priest', f: 'Priestess' },
    { m: 'Rogue', f: null },
    { m: 'Ranger', f: null },
    { m: 'Samurai', f: null },
    { m: 'Tourist', f: null },
    { m: 'Valkyrie', f: null },
    { m: 'Wizard', f: null },
];
export function rank_of(lev, monnum, female) {
    /* Find the role */
    let roleIdx = -1;
    let roleNameM = null;
    let roleNameF = null;
    if (monnum >= 0 && monnum <= 12) {
        roleIdx = monnum;
        roleNameM = _ROLE_IDX_TO_NAMES[roleIdx].m;
        roleNameF = _ROLE_IDX_TO_NAMES[roleIdx].f;
    }
    if (roleIdx < 0) {
        const urole = game.urole;
        if (urole) {
            const nm = urole.name;
            if (nm) {
                roleNameM = nm.m;
                roleNameF = nm.f;
            }
            if (roleNameM)
                roleIdx = _ROLE_NAME_TO_IDX[roleNameM] ?? -1;
            if (roleIdx < 0 && roleNameF)
                roleIdx = _ROLE_NAME_TO_IDX[roleNameF] ?? -1;
        }
    }

    /* Find the rank */
    const ranks = (roleIdx >= 0) ? _ROLE_RANKS[roleIdx] : null;
    if (ranks) {
        for (let i = xlev_to_rank(lev); i >= 0; i--) {
            if (female && ranks[i][1])
                return ranks[i][1];
            if (ranks[i][0])
                return ranks[i][0];
        }
    }

    /* Try the role name, instead */
    if (female && roleNameF)
        return roleNameF;
    else if (roleNameM)
        return roleNameM;
    return 'Player';
}

// C ref: botl.c:21-38 get_strength_str — STR is stored as 18+percent for the
// exceptional-strength range: raw 19..118 displays as "18/01".."18/**", raw >118
// displays as plain 19+ (raw - 100), raw <=18 displays as a plain integer.
// STR18(100) == 18 + 100 == 118 (include/attrib.h:36). Bug-for-bug faithful;
// no RNG consumed (pure formatting).
export function _strengthStr(st) {
    if (st > 18) {
        if (st > 118 /* STR18(100) */)
            return `${st - 100}`; /* Sprintf "%2d" — value, no padding needed for 2-digit */
        else if (st < 118)
            return `18/${String(st - 18).padStart(2, '0')}`; /* "18/%02d" */
        else
            return '18/**';
    }
    return `${st}`; /* "%-1d" */
}
// C ref: botl.c:408-420 max_rank_sz — compute max rank string length
export function max_rank_sz() {
    let maxr = 0;
    const idx = _ROLE_NAME_TO_IDX[game.urole] ?? -1;
    const ranks = (idx >= 0) ? _ROLE_RANKS[idx] : null;
    if (!ranks) return;
    for (let i = 0; i < 9; i++) {
        const rk = ranks[i];
        let r;
        if (rk[0] && (r = rk[0].length) > maxr) maxr = r;
        if (rk[1] && (r = rk[1].length) > maxr) maxr = r;
    }
    game.mrank_sz = maxr;
}
/* C ref: mondata.c pmname(ptr, gender) — the mons[].pmnames[] slot for the
 * requested gender, falling back to NEUTRAL when that slot is NULL.  Read
 * straight from the shared pmnames pack (js/makemon.js monPmname does the
 * same); imported as data to avoid a display.js <-> makemon.js import cycle. */
const _MONS_PMNAMES = monPmnamesPack.pmnames;
function _pmname(mndx, mgender) {
    const row = _MONS_PMNAMES[mndx];
    if (!row) return '';
    let g = mgender;
    if (g < 0 || g >= 3 || !row[g]) g = 2 /* NEUTRAL */;
    return row[g];
}
/* C ref: botl.c:788-792 — when poly'd, capitalize the first letter of the
 * monster name and of every word that follows a space ("red dragon" ->
 * "Red Dragon").  Only the " the <titl>" tail is walked in C, and the name
 * always starts right after the space, so this is word-wise highc(). */
function _upstart_words(s) {
    let out = '';
    for (let i = 0; i < s.length; i++)
        out += (i === 0 || s[i - 1] === ' ') ? s[i].toUpperCase() : s[i];
    return out;
}
/* The three botl.c reads a poly'd status line needs, exported for the SECOND
 * status-line renderer in this port: js/com_pager.js paints rows 22/23 for every
 * frame a tty MENU window covers (its _statusLine1/_statusLine2 are a separate
 * copy of the two below), and it had no Upolyd arm at all — so seed5500's
 * post-polymorph pickup menu rendered "Wizard the Sorcerer"/"Xp:20" where C
 * renders "Wizard the Warhorse"/"HD:7".  Shared rather than re-duplicated so the
 * two copies cannot drift again. */
export function botl_pmname(mndx, mgender) { return _pmname(mndx, mgender); }
export function botl_upstart_words(s) { return _upstart_words(s); }
export function botl_mon_mlevel(mndx) { return _mon_mlevel(mndx); }
// ── Status lines ──
function _statusLine1() {
    const u = game.u;
    if (!u)
        return '';
    // C ref: botl.c:58-60 — capitalize first letter of plname
    const rawName = game.plname || 'Hero';
    const name = (rawName.length > 0 && rawName[0] >= 'a' && rawName[0] <= 'z')
        ? rawName[0].toUpperCase() + rawName.slice(1)
        : rawName;
    // C ref: botl.c:rank() → rank_of(u.ulevel, Role_switch, flags.female)
    // Use role name to index into _ROLE_RANKS (game.urole has no mnum field).
    const female = !!(game.flags?.female);
    // Match by male name first, then female name for roles with gendered names.
    const roleNameM = game.urole?.name?.m || '';
    const roleNameF = game.urole?.name?.f || '';
    const lookupName = roleNameM || roleNameF;
    // C ref: botl.c:777 — titl = !Upolyd ? rank() : pmname(&mons[u.umonnum],
    // Ugender); botl.c:788-792 capitalizes every word of the monster name.
    /* C botl.c:777 titl = !Upolyd ? rank() : pmname(&mons[u.umonnum], Ugender).
     * On a frozen --More-- frame both the poly flag and the form are the ones
     * bot() painted at that pline; see _capture_botl(). */
    const _b1s = (game._inMovemonMore && game._paintedSnapshot
                  && game._paintedSnapshot.botl
                  && game._paintedSnapshot.botl.mtimedone != null)
        ? game._paintedSnapshot.botl : null;
    // Rank and experience must come from the same painted status snapshot.
    const ulevel = (_b1s?.ulevel ?? u.ulevel) || 1;
    /* C you.h:554 (u.umonnum != u.umonster), not the u.mtimedone timer. */
    const _umonnum = (_b1s ? _b1s.umonnum : u.umonnum) | 0;
    const Upolyd = _umonnum !== (((_b1s && _b1s.umonster != null) ? _b1s.umonster : u.umonster) | 0);
    const role = Upolyd
        ? _upstart_words(_pmname(_umonnum, female ? 1 /* FEMALE */ : 0 /* MALE */))
        : (_rank_of(ulevel, lookupName, female)
           || _rank_of(ulevel, roleNameF, female)
           || (female ? game.urole?.name?.f : null)
           || game.urole?.name?.m
           || 'Adventurer');
    const title = `${name} the ${role}`;
    /* C botl.c bot1str — the status line prints ACURR(A_STR) … ACURR(A_CHA),
     * and ACURR(x) is acurr(x) = ABON + ATEMP + ABASE clamped to [3,25]
     * (attrib.c:1206).  These reads were a stand-in on the raw ABASE array
     * (u.acurr.a IS ABASE — see js/attrib.js getAbase), so every temporary or
     * bonus attribute delta was invisible on the status line.  seed0014 step
     * 284: a bear trap fires, trap.c:1520 set_wounded_legs → do.c:2434
     * ATEMP(A_DEX)--, C prints Dx:11 and this port kept printing Dx:12 for the
     * rest of the game.  DISPLAY-ONLY — acurr() draws no RNG. */
    /* During a --More-- page frozen on an exact pline-flush frame, the six
     * attributes are the ones that flush_screen()'s bot() painted at THAT pline
     * (display.c:2286, pline.c:276) — not the post-command ones.  _capture_botl
     * recorded them; read them from there when a frozen frame is in force.
     * `_a1s` is null for every other render, so those stay byte-identical. */
    const _a1s = (game._inMovemonMore && game._paintedSnapshot
                  && game._paintedSnapshot.botl
                  && game._paintedSnapshot.botl.attrs) || null;
    const _hasAttrs = !!(_a1s || (u.acurr && u.acurr.a));
    /* C ref order: A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5; the
     * captured array is in DISPLAY order (St Dx Co In Wi Ch), so index it by
     * that order rather than by the C constant (see the u.acurr.a note in
     * MEMORY: `u.acurr.a` is ABASE and is display-ordered). */
    const _A1_ORDER = [A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA];
    const _acur = (ci) => {
        if (_a1s) {
            const k = _A1_ORDER.indexOf(ci);
            if (k >= 0) return _a1s[k];
        }
        return (u.acurr && u.acurr.a) ? acurr(u, ci) : null;
    };
    const _st = _acur(A_STR);
    const stStr = (_st != null) ? _strengthStr(_st) : '?';
    const stats = `St:${stStr} Dx:${_acur(A_DEX) ?? '?'} Co:${_acur(A_CON) ?? '?'} In:${_acur(A_INT) ?? '?'} Wi:${_acur(A_WIS) ?? '?'} Ch:${_acur(A_CHA) ?? '?'}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4)
        return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}
/* C ref: botl.c:872 — mons[u.umonnum].mlevel, read from the shared mons pack
 * (the same table js/makemon.js permonstTemplate builds from). */
function _mon_mlevel(mndx) {
    const row = monsPack.mons?.[mndx];
    return row ? (row[1] | 0) : 0;   /* row[1] = mlevel (js/makemon.js permonstTemplate) */
}
/** C ref: hack.c:4478 money_cnt — walk invent chain, return COIN_CLASS obj quan. */
function money_cnt(otmp) {
    for (; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === 12 /* COIN_CLASS */)
            return otmp.quan | 0;
    }
    return 0;
}
function _statusLine2() {
    const u = game.u;
    if (!u)
        return '';
    // C ref: botl.c:bot2() — gold via money_cnt(gi.invent); Xp: always shows level;
    //   /exp shown only when showexp set; T: (turn count) shown only when time set.
    /* C ref: botl.c:837 / hack.c:4478 — `money_cnt(gi.invent)`, the LIVE hero
     * inventory chain and nothing else.
     *
     * This line used to read `money_cnt(game._ini_inv_chain ?? game.invent)`.
     * `_ini_inv_chain` is a post-u_init SNAPSHOT of the starting inventory, and
     * because the `??` fired for every game that ran ini_inv (i.e. all of them),
     * the real inventory was INVISIBLE to the status row for the whole session.
     * Four sites then had to mirror the snapshot by hand to keep '$:' moving
     * (addinv-coin in js/pickup_container.js, assigninvlet-coin in
     * js/wizcmds.js, the dopickup coin merge and freeinv_core's COIN arm in
     * js/cmd.js); all four are removed in the same commit as this line, because
     * with gi.invent read directly they are C's own SET_BOTL and nothing more.
     *
     * The class of bug the shadow caused is any state change that empties or
     * replaces gi.invent WITHOUT going through a coin site: C's tutorial entry
     * (nhlua.c:1926-1937 nhl_gamestate, reached from do.c:1510 tutorial(TRUE))
     * sequesters the ENTIRE invent chain into gg.gmst_invent, so C's status row
     * reads `$:0` for the whole tutorial and restores the pile on the way out.
     * js/cmd.js's goto_level already ported that stash (it nulls g.invent), but
     * the snapshot survived it, so '$:' kept painting the pre-tutorial pile —
     * one wrong cell on every tutorial frame.
     *
     * `_botlGoldStale` is the OTHER half of C's model and is not a second
     * shadow: C's '$:' is not live at all, it is whatever the last bot() wrote,
     * and bot() only runs when a code path raised `disp.botl`.  Almost every
     * gold-moving site in C raises it, so reading gi.invent live is right for
     * all of them — but fountain.c:503-528 (the dipfountain "urge to take a
     * bath" arm) mutates `otmp->quan` directly and raises NOTHING, so C keeps
     * PAINTING the pre-loss amount.  js/potion.js latches that value there and
     * the SET_BOTL-equivalent gold sites clear the latch again; see the note at
     * that site.  Measured on seed0014 step 711: C paints "$:36" for the rest
     * of the recording after losing 3 of it. */
    const _staleGold = game._botlGoldStale;
    const gold = (_staleGold === undefined || _staleGold === null)
        ? money_cnt(game.invent ?? null)
        : (_staleGold | 0);
    // C ref: do.c goto_level — the descend/climb "You descend the stairs.--More--"
    // is shown by more() BEFORE docrt/bot redraw the new level (the message window
    // is more()'d as it is cleared for the redraw).  At that instant the physical
    // bottom status line still shows the OLD Dlvl (bot() has not yet run), so the
    // painted snapshot of the level-transition --More-- carries the OLD dlevel and
    // the botl must use it.  DISPLAY-ONLY; no RNG.  Gated on a live snapshot with a
    // dlevel override (only set during the descend/climb --More-- window), so it
    // has ZERO effect on any non-transition render.
    const _snap2 = (game._inMovemonMore && game._paintedSnapshot) ? game._paintedSnapshot : null;
    /* C ref: botl.c:1047 — the BL_LEVELDESC field is
     *     (void) describe_level(gb.blstats[idx][BL_LEVELDESC].val, 1);
     * describe_level (botl.c:440-475, ported in js/dungeon.js) picks the level's
     * NAME over its depth in three branches before falling through to the
     * "Dlvl:n"/"Tutorial:n" form: Is_knox prints the dungeon's dname, In_quest
     * prints "Home <dunlev>", In_endgame prints endgamelevelname() with the
     * "Plane of " prefix stripped.  A comment here used to assert all three were
     * unreached by the corpus; measured 2026-08-14 against the recorded status
     * rows, In_quest fires on FIVE sessions (seed0360/0361/0367/0373/4500, "Home
     * 1".."Home 6") and In_endgame on one (seed0373, "Air" and "Fire").  Only
     * Is_knox is genuinely unreached — no recorded status row carries a bare
     * dungeon dname (the "Fort Ludios" hits in the corpus are all overview and
     * level-teleport menus, not the botl).
     *
     * The dlevel used here keeps the existing level-transition --More-- snapshot
     * semantics (bot() has not re-run yet), and the branch label is read from the
     * same snapshot when one is in force so the label and the number describe the
     * same level.  DISPLAY-ONLY; no RNG. */
    const _dnum = (_snap2 && _snap2.dnum != null) ? _snap2.dnum : (u.uz?.dnum);
    const _dlevelRaw = (_snap2 && _snap2.dlevel != null) ? _snap2.dlevel : (u.uz?.dlevel ?? 1);
    /* C ref: wintty.c:4546-4556 — for BL_LEVELDESC the tty windowport strips the
     * trailing blanks the core sends ("The core sends trailing blanks for some
     * fields.  Let's suppress the trailing blanks"), so describe_level's %-2d pad
     * and its dflgs&1 trailing space never reach the screen; the single separator
     * space below is the status layout's own. */
    const _leveldescField = describe_level_buf(1, { dnum: _dnum | 0, dlevel: _dlevelRaw })
        .replace(/ +$/, '');
    /* C ref: botl.c:145-146 — hp/hpmax come from u.mh/u.mhmax while polymorphed:
     *   hp = Upolyd ? u.mh : u.uhp;  hpmax = Upolyd ? u.mhmax : u.uhpmax; */
    /* On a frozen --More-- frame this is the poly flag bot() painted at that
     * pline, not the live one (see _capture_botl()); _bs is computed below, so
     * read the snapshot directly here. */
    const _p2s = (game._inMovemonMore && game._paintedSnapshot
                  && game._paintedSnapshot.botl
                  && game._paintedSnapshot.botl.mtimedone != null)
        ? game._paintedSnapshot.botl : null;
    /* C you.h:554 (u.umonnum != u.umonster), not the u.mtimedone timer. */
    const Upolyd = (((_p2s ? _p2s.umonnum : u.umonnum) | 0)
                    !== (((_p2s && _p2s.umonster != null) ? _p2s.umonster : u.umonster) | 0));
    /* C ref: botl.c:823-830 bot_via_windowport()
     *     i = Upolyd ? u.mh : u.uhp;
     *     if (i < 0)              / * gameover sets u.uhp to -1 * /
     *         i = 0;
     *     blstats[idx][BL_HP].a.a_int = min(i, 9999);
     *     i = Upolyd ? u.mhmax : u.uhpmax;
     *     blstats[idx][BL_HPMAX].a.a_int = min(i, 9999);
     * The `< 0` floor is applied to the DISPLAYED current-hp value ONLY: the
     * max-hp field, and both power fields (botl.c:863-866, which only apply
     * min(x, 9999)), carry no such floor.  So a negative u.uhp must render as
     * "HP:0(<uhpmax>)" while u.uhp itself keeps its negative value. */
    /* During a --More-- page frozen on an exact pline-flush frame, C's status line
     * is the one that flush_screen()'s bot() painted at THAT pline (display.c:2286,
     * pline.c:276) — not the post-command state.  _capture_botl recorded it; read
     * the hero scalars from there when it is in force.  `_bs` is null for every
     * other render, so those stay byte-identical. */
    /* C botl.c:279 — while u.uhp is exactly -1, bot() clears its flags and paints
     * NOTHING, so every render after that point (frozen page or live) shows the
     * values of the last paint that DID happen.  See _capture_botl().  Applies to
     * this row only; do_statusline1 (row 22) is frozen by the same guard in C but
     * carries no observable difference on this corpus, so it is left alone rather
     * than changed unmeasured. */
    const _frozenAtMinusOne = (((u.uhp | 0) === -1 || game._botlFrozenDeath)
                               && game._lastPaintedBotl)
        ? game._lastPaintedBotl : null;
    const _bs = (game._inMovemonMore && game._paintedSnapshot
                 && game._paintedSnapshot.botl) ? game._paintedSnapshot.botl
        : _frozenAtMinusOne;
    const _bu = _bs || u;
    let _hp = Upolyd ? (_bu.mh | 0) : (_bu.uhp || 0);
    /* C paints the pre-reversion physical HP once when rehumanize() runs
     * inside movemon; the live value is already restored for later turns. */
    if (game._rehumanizeDisplayPending && !Upolyd && !_bs)
        _hp = Math.max(0, _hp - 1);
    if (_hp < 0)
        _hp = 0;
    _hp = Math.min(_hp, 9999);
    const _hpmax = Math.min(Upolyd ? (_bu.mhmax | 0) : (_bu.uhpmax || 0), 9999);
    /* C ref: botl.c:863-866 — BL_ENE / BL_ENEMAX are min(x, 9999), no `< 0` floor. */
    const _pw = Math.min(_bu.uen || 0, 9999);
    const _pwmax = Math.min(_bu.uenmax || 0, 9999);
    /* AC comes from the frozen frame when one is in force — see _capture_botl. */
    const _uac = (_bs && _bs.uac != null) ? _bs.uac : (u.uac ?? 10);
    /* ...and so do the experience level / points — see _capture_botl. */
    const _xpLevel = ((_bs && _bs.ulevel != null) ? _bs.ulevel : u.ulevel) || 1;
    /* C botl.c:42 `nhsym goldch = gs.showsyms[COIN_CLASS + SYM_OFF_O];` — the
     * status line's gold field is labelled with the LIVE object-class symbol,
     * not a literal '$'.  On a Rogue level assign_graphics(ROGUESET) has put
     * def_r_oc_syms[COIN_CLASS] = GEM_SYM there, so C prints "*:0".  Witness:
     * seed0360-wizard-world-tour step 302, C "Dlvl:18 *:0 HP:136(136)...". */
    const _goldch = oclass_sym(COIN_CLASS_DISP) ?? '$';
    let s = `${_leveldescField} ${_goldch}:${gold} HP:${_hp}(${_hpmax}) Pw:${_pw}(${_pwmax}) AC:${_uac}`;
    /* C ref: botl.c:148-154 — the experience field is "HD:<mlevel>" when Upolyd
     * (mons[u.umonnum].mlevel, cf. botl.c:872 BL_HD), else "Xp:<lvl>/<exp>" when
     * flags.showexp, else "Xp:<lvl>".  botl.c:1458-1460 gates the same way:
     * BL_EXP needs (flags.showexp && !Upolyd), BL_XP needs !Upolyd, BL_HD needs
     * Upolyd. */
    if (Upolyd) {
        s += ` HD:${_mon_mlevel(((_p2s ? _p2s.umonnum : u.umonnum) | 0))}`;
    } else if (game.flags?.showexp) {
        s += ` Xp:${_xpLevel}/${(_bs && _bs.uexp != null) ? _bs.uexp : (u.uexp || 0)}`;
    }
    else {
        s += ` Xp:${_xpLevel}`;
    }
    if (game.flags?.time) {
        // C ref: botl.c bot2() — `T:` shows svm.moves.  Normally that equals the
        // RNG-gating game.moves.  The one exception is the per-turn movemon-message
        // --More-- paging window: C runs turn N's movemon and only increments
        // svm.moves AFTER each turn's HEAD, so the physical screen at the
        // overflowing pline shows the svm.moves in effect at that instant.  The
        // painted-screen snapshot captured exactly that value (game.moves at the
        // overflow); prefer it.  Otherwise fall back to the tagged movemon turn
        // (_movemonMsgTurn) for windows with no snapshot, then live game.moves.
        // DISPLAY-ONLY; no RNG.
        let displayMoves;
        if (game._tutorialStatusOverride?.moves != null)
            displayMoves = game._tutorialStatusOverride.moves | 0;
        else if (game._inMovemonMore && game._paintedSnapshot)
            displayMoves = game._paintedSnapshot.moves;
        else if (game._inMovemonMore && game._movemonMsgTurn != null)
            displayMoves = game._movemonMsgTurn;
        else
            displayMoves = (_painted_moves() || game.moves || 1);
        s += ` T:${displayMoves || 1}`;
    }
    /* C botl.c:186-187 — hunger status: if (u.uhs != NOT_HUNGRY) append " <hu_stat[uhs]>".
     * hu_stat[] (eat.c:70) carries trailing spaces; the tty trims trailing blanks
     * per line (the scorer's normScreen does too), so emit the trimmed word.
     * C ref index order: SATIATED=0, NOT_HUNGRY=1, HUNGRY=2, WEAK=3, FAINTING=4,
     * FAINTED=5, STARVED=6. */
    // During a forced occupation/post-meal --More-- that froze the hunger state, render
    // the FROZEN uhs (the per-turn bot() value) rather than the live one — C shows the
    // last-flush status, not the post-message hunger (seed0014 step 3 shows no
    // "Satiated" even though lesshungry's newuhs() has already crossed the threshold).
    let _uhs = (u.uhs | 0);
    /* A fainting transition can finish its countdown in the same dispatch
     * that publishes a teleport result.  C paints that result frame before
     * the subsequent unfaint callback, so retain the FAINTED label while the
     * faint message is still the committed topline. */
    const _faintTop = `${game._resultMessage || ''} ${game._pending_message || ''}`;
    if (_uhs === 4 && _faintTop.includes('You faint from lack of food.'))
        _uhs = 5;
    if (game._inMovemonMore && game._paintedSnapshot
        && (game._paintedSnapshot.uhs != null
            || game._paintedSnapshot.botl?.uhs != null)) {
        _uhs = (game._movemonPageFrames?.length
                && game._paintedSnapshot.botl?.uhs != null)
            ? (game._paintedSnapshot.botl.uhs | 0)
            : (game._paintedSnapshot.uhs != null)
                ? (game._paintedSnapshot.uhs | 0)
                : (game._paintedSnapshot.botl.uhs | 0);
    }
    /* During a paged --More-- that froze the bottom line at the last bot() flush,
     * render the FROZEN cap (e.g. the pickup-encumber prinv page shows the
     * pre-pickup cap, before encumber_msg's SET_BOTL repaints). Otherwise use
     * the last bot() paint: inventory changes alone do not repaint status.
     * Before the first paint the undefined latch permits live initialization.
     * Two snapshot shapes carry a cap: the pickup-encumber
     * pre-frame (_paintedSnapshot.cap) and the exact per-pline flush frame
     * (_paintedSnapshot.botl.cap, _capture_botl). */
    let _cap = game._botlPaintedCap;
    if (game._inMovemonMore && game._paintedSnapshot
        && game._paintedSnapshot.cap != null)
        _cap = game._paintedSnapshot.cap | 0;
    else if (_bs && _bs.cap != null)
        _cap = _bs.cap | 0;
    /* newuhs() sets HDeaf after its fainting message has begun but before the
     * status repaint.  That specific page is post-update in C; don't let the
     * pre-message snapshot hide the new Deaf condition. */
    const _faintingPage = _faintTop.includes('You faint from lack of food.');
    s += botl_status_suffix(_uhs, _cap, _p2s ? !!_p2s.blinded : undefined,
                            (!_faintingPage && _p2s && _p2s.deaf !== undefined)
                                ? !!_p2s.deaf : undefined,
                            (_p2s && _p2s.stunned !== undefined) ? !!_p2s.stunned : undefined,
                            (_p2s && _p2s.hallucinating !== undefined)
                                ? !!_p2s.hallucinating : undefined,
                            (_p2s && _p2s.confused !== undefined)
                                ? !!_p2s.confused : undefined);
    return fit_status_line_width(s);
}
/* C ref: botl.c:186-188 bot2() tail + the conditions[] table (botl.c:635-649) —
 * everything that follows the Xp:/HD: field on status line 2: the hunger word,
 * the encumbrance word, then the condition words in conditions[] order.
 * Exported because this port has TWO status-line renderers: this file's, and
 * js/com_pager.js's copy that paints rows 22/23 for every frame a tty MENU
 * window covers.  The copies had already drifted (com_pager had no Upolyd arm
 * and none of these fields, so seed5500's post-polymorph pickup menu rendered
 * "Wizard the Sorcerer"/"Xp:20" with no " Blind"); sharing the tail is what stops
 * them drifting again.
 * `uhs`/`cap` are the values to PAINT — a caller with a frozen --More-- frame
 * passes the frame's; pass undefined for `cap` to read the live near_capacity().
 * DISPLAY-ONLY: reads u.uprops + the inventory chain, consumes no RNG. */
export function botl_status_suffix(uhs, cap, blindFrozen, deafFrozen, stunFrozen,
                                   halluFrozen, confFrozen) {
    const u = game.u;
    if (!u) return '';
    let s = '';
    /* C botl.c:186-187 — if (u.uhs != NOT_HUNGRY) append " <hu_stat[uhs]>".
     * hu_stat[] (eat.c:70) carries trailing spaces; the tty trims trailing blanks
     * per line (the scorer's normScreen does too), so emit the trimmed word.
     * C ref index order: SATIATED=0, NOT_HUNGRY=1, HUNGRY=2, WEAK=3, FAINTING=4,
     * FAINTED=5, STARVED=6. */
    if ((uhs | 0) !== 1 /* NOT_HUNGRY */) {
        const HU_STAT = ['Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved'];
        const hw = HU_STAT[uhs | 0] || '';
        if (hw)
            s += ` ${hw}`;
    }
    /* C ref: botl.c:188 bot2() — encumbrance status after hunger:
     * if ((cap = near_capacity()) > UNENCUMBERED) append " <enc_stat[cap]>".
     * enc_stat = ["", "Burdened", "Stressed", "Strained", "Overtaxed",
     * "Overloaded"].  near_capacity() is the real STR/CON+inventory-weight calc
     * (weight.js). */
    {
        const ENC_STAT = ['', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'];
        const c = (cap != null) ? (cap | 0) : (near_capacity() | 0);
        if (c > 0 && ENC_STAT[c])
            s += ` ${ENC_STAT[c]}`;
    }
    /* C ref: botl.c:975 condtests[bl_blind].test = (Blind) ? TRUE : FALSE,
     * rendered as "Blind" from the conditions[] table (botl.c:635).  bl_blind is
     * the SECOND entry of that table, ahead of bl_fly (botl.c:641) and bl_lev
     * (botl.c:649), so it precedes both here.
     * C youprop.h:103 Blind = ((HBlinded || EBlinded) && !BBlinded); the
     * u.usleep / !haseyes() cases fold into HBlinded via make_blinded, so the
     * property triple is the whole test. */
    {
        const bp = u.uprops && u.uprops[BLINDED];
        /* `blindFrozen` is the value bot() painted at a frozen --More-- pline;
         * undefined for every other render, so those stay byte-identical. */
        const blinded = (blindFrozen !== undefined) ? blindFrozen
            : (!!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
                && !(bp.blocked | 0));
        if (blinded)
            s += ' Blind';
    }
    /* C ref: botl.c:1192 condtests[bl_conf].test = (Confusion) ? TRUE : FALSE,
     * rendered as "Conf" from the conditions[] table (botl.c:786).  Every entry
     * in that table quoted here carries ranking 10, and cond_cmp (botl.c:1332)
     * tie-breaks equal rankings by strcmpi on the useroption name, so the emit
     * order inside this rank is the table's own alphabetical order:
     * blind, conf, deaf, fly, hallucinat, levitate, ride, stun.  "Conf" therefore
     * sits between " Blind" and " Fly" — the same order bot2() spells out
     * literally at botl.c:189-195.
     * C youprop.h:83-84  Confusion == HConfusion == u.uprops[CONFUSION].intrinsic
     * — INTRINSIC ONLY; unlike Blind/Fly/Lev there is no extrinsic or blocked
     * term in the macro, so neither is consulted here.  The whole word is the
     * truth test (C tests `Confusion`, not `Confusion & TIMEOUT`). */
    {
        const confused = (confFrozen !== undefined) ? !!confFrozen
            : (game._botlPaintedConfused ?? !!(u.uprops?.[CONFUSION]?.intrinsic | 0));
        if (confused)
            s += ' Conf';
    }
    /* C ref: botl.c:1193 condtests[bl_deaf].test = (Deaf) ? TRUE : FALSE,
     * rendered as "Deaf" from the conditions[] table (botl.c:787).  Its
     * useroption name is "deaf" (botl.c:824), so in the ranking-10 alphabetical
     * tie-break documented above it lands between "conf" and "fly" — i.e.
     * exactly here.  bot2()'s literal spelling at botl.c:189-195 orders it
     * Blind/Deaf/Stun/Conf, but that is the no-status-window path; the tty
     * status field is built from conditions[] through cond_cmp.
     * C youprop.h:125 Deaf = (HDeaf || EDeaf || u.uroleplay.deaf).  HDeaf is
     * the flat u.HDeaf slot in this port (js/allmain.js:1591 nh_timeout_deaf
     * counts it down, js/eat.js:1183 and js/music.js's leather drum set it),
     * NOT u.uprops[DEAF] — reading the uprops spelling here would report a word
     * nothing writes.
     * MEASURED on seed0002 step 582 onward: C's Dlvl row reads
     * "... Xp:1 Burdened Deaf" for the rest of the recording after the leather
     * drum's incr_itimeout(&HDeaf, rn1(20,30)), and this port emitted no
     * condition at all, losing 13 of the session's 14 remaining frames. */
    {
        /* `deafFrozen` is the value bot() last PAINTED, threaded in for a frozen
         * --More-- page the same way `blindFrozen` is.  It matters here because
         * C's LEATHER_DRUM arm (music.c:704-716) sets HDeaf and only flags
         * `disp.botl` at the END of the arm, so the more() raised in between —
         * by the pet's "turns to flee." inside awaken_monsters — freezes a
         * status line that does NOT yet say Deaf.  seed0002 steps 569-579 are
         * exactly those frames, and step 580 (the first paint after the
         * command) is where C's " Deaf" appears. */
        const dp = u.uprops?.[DEAF];
        const deaf = (deafFrozen !== undefined) ? !!deafFrozen
            : !!((dp?.intrinsic | 0) || (dp?.extrinsic | 0) || (u.HDeaf | 0)
                 || (u.uroleplay && u.uroleplay.deaf));
        if (deaf)
            s += ' Deaf';
    }
    /* C ref: botl.c:980 condtests[bl_fly].test = Flying, rendered from the
     * conditions[] table (botl.c:641) as "Fly" after the encumbrance field.
     * Flying (youprop.h) = (HFlying || EFlying || (u.usteed && is_flyer)) &&
     * !BFlying; set_uasmon's PROPSET(FLYING) turns HFlying on for a flying poly
     * form.  Only the ported conditions are emitted: every other condtest is
     * FALSE for every state any corpus session reaches at a captured frame, and
     * emitting an unported one would be an invented field. */
    {
        const fp = u.uprops && u.uprops[FLYING];
        const flying = !!fp && !!((fp.intrinsic | 0) || (fp.extrinsic | 0))
                       && !(fp.blocked | 0);
        if (flying)
            s += ' Fly';
    }
    /* C ref: botl.c:1196 condtests[bl_hallu].test = (Hallucination) ? TRUE :
     * FALSE, rendered from conditions[] (botl.c:793) as "Hallu".  Its
     * useroption name is "hallucinat" (botl.c:830), so in the ranking-10
     * alphabetical tie-break documented above it lands after "fly" and before
     * "levitate" — i.e. exactly here.
     * C youprop.h:120 Hallucination = (HHallucination && !Halluc_resistance),
     * with Halluc_resistance = (HHalluc_resistance || EHalluc_resistance)
     * (youprop.h:116-119).  INTRINSIC ONLY on the HALLUC side — there is no
     * EHallucination term in the macro — which is the same shape the Conf
     * block above has, and is why this reads .intrinsic and not the triple.
     * MEASURED on seed0383 step 164: the hero grants itself hallucination
     * through #wizintrinsic at step 162 and C's Dlvl row carries " Hallu" from
     * the very next frame; this port emitted no condition at all and lost the
     * whole 55-frame tail of the session on that one word. */
    {
        /* `halluFrozen` is the value bot() painted at a frozen --More-- pline,
         * threaded in the same way `stunFrozen` is; undefined for every other
         * caller, which keeps the live read below. */
        const hp = u.uprops && u.uprops[HALLUC];
        const hrp = u.uprops && u.uprops[HALLUC_RES];
        const halluc_res = !!hrp && !!((hrp.intrinsic | 0) || (hrp.extrinsic | 0));
        const hallucinating = (halluFrozen !== undefined) ? !!halluFrozen
            : (!!hp && (hp.intrinsic | 0) !== 0 && !halluc_res);
        if (hallucinating)
            s += ' Hallu';
    }
    /* C ref: botl.c:983 condtests[bl_lev].test = (Levitation) ? TRUE : FALSE,
     * rendered from conditions[] (botl.c:649) as "Lev".  bl_lev follows bl_fly
     * in that table and both carry ranking 10, so a hero who is somehow both
     * prints "Fly Lev" — hence this block sits after the Flying one.
     * C youprop.h:240 Levitation = ((HLevitation || ELevitation) && !BLevitation).
     * BLevitation's I_SPECIAL bit is masked only inside weight_cap
     * (hack.c:4273); the Levitation macro itself tests the raw blocked word, so
     * no mask here. */
    {
        const lp = u.uprops && u.uprops[LEVITATION];
        const levitating = !!lp && !!((lp.intrinsic | 0) || (lp.extrinsic | 0))
                           && !(lp.blocked | 0);
        if (levitating)
            s += ' Lev';
    }
    /* C ref: botl.c:204-205 —
     *     / * levitation and flying are mutually exclusive; riding is not * /
     *     ...
     *     if (u.usteed)
     *         Strcpy(nb = eos(nb), " Ride");
     * conditions[] (botl.c:799) gives bl_ride ranking 10 and useroption name
     * "ride", so in the alphabetical tie-break documented above it lands after
     * "levitate" and before "stun" — i.e. exactly here.  The test is the bare
     * u.usteed pointer, no property triple.
     * seed0104/seed0103: every frame from the mount on carries " Ride" at the
     * end of the Dlvl row in C. */
    if (u.usteed)
        s += ' Ride';
    /* C ref: botl.c:1202 condtests[bl_stun].test = (Stunned) ? TRUE : FALSE,
     * rendered from conditions[] (botl.c:805) as "Stun".  bl_stun carries
     * ranking 10 and useroption name "stun" (botl.c:842), which is LAST in the
     * alphabetical tie-break documented above — after "ride" — so it sits at
     * the end of the suffix.
     * C youprop.h:81 `#define Stunned HStun`, and HStun is
     * u.uprops[STUNNED].intrinsic: intrinsic only, no extrinsic and no blocked
     * term, the same shape as the Conf block.  The whole word is the truth
     * test; C tests `Stunned`, not `Stunned & TIMEOUT`.
     * MEASURED on gen232-reseed-seed1268561 step 1034: the red dragon's
     * knockback stuns the hero (uhitm.c:5397 make_stunned(knockdistance + 1,
     * TRUE)), C's Dlvl row carries " Stun" from the next frame, and this port
     * emitted no condition — 552 frames whose ONLY difference was that word. */
    {
        /* `stunFrozen` is the value bot() painted at a frozen --More-- pline,
         * threaded in the same way `blindFrozen` is; undefined for every other
         * render, so those stay byte-identical. */
        const sp = u.uprops && u.uprops[STUNNED];
        const stunned = (stunFrozen !== undefined) ? stunFrozen
            : (!!sp && (sp.intrinsic | 0) !== 0);
        if (stunned)
            s += ' Stun';
    }
    return s;
}

/* The tty status compositor contracts condition labels when its 80-column
 * second line would overflow.  botl.c supplies the long/medium/short spellings
 * in conditions[]; apply the short spelling one condition at a time, in status
 * order, until the physical line fits. */
/* C tty status writes reserve the terminal's final column; a field of 80
 * printable cells takes the medium condition spelling (gen413: Blind -> Blnd).
 */
export function fit_status_line_width(s, width = 79) {
    if (s.length <= width) return s;
    /* C wintty.c make_things_fit() advances cond_shrinklvl globally: it
     * retries the complete condition field at medium spelling, then at short
     * spelling.  Per-condition shortening changes the selected text and can
     * disagree even when only one condition is present (for example Blind ->
     * Blnd at the medium level). */
    const conditions = [
        ['Stone', 'Ston', 'Sto'], ['Slime', 'Slim', 'Slm'],
        ['Strngl', 'Stngl', 'Str'], ['FoodPois', 'Fpois', 'Poi'],
        ['TermIll', 'Ill', 'Ill'], ['Blind', 'Blnd', 'Bl'],
        ['Deaf', 'Def', 'Df'], ['Stun', 'Stun', 'St'],
        ['Conf', 'Cnf', 'Cf'], ['Hallu', 'Hal', 'Hl'],
        ['Lev', 'Lev', 'Lv'], ['Fly', 'Fly', 'Fl'],
        ['Ride', 'Rid', 'Rd'],
    ];
    const original = s;
    let last = s;
    for (let level = 1; level <= 2; level++) {
        let candidate = original;
        for (const names of conditions) {
            const long = names[0];
            const spelling = names[level];
            candidate = candidate.replace(new RegExp(` ${long}(?= |$)`), ` ${spelling}`);
        }
        if (candidate.length <= width)
            return candidate;
        last = candidate;
    }
    /* C wintty.c:4584-4626 exhausts condition spellings first, then calls
     * shrink_enc(1), and finally shrink_enc(2), when the status line still
     * overflows.  The encumbrance field has its own long/medium/short table
     * (wintty.c:4268-4272); applying it only after both condition passes
     * preserves C's global shrink ordering. */
    const encumbrance = [
        ['Burdened', 'Burden', 'Brd'],
        ['Stressed', 'Stress', 'Strs'],
        ['Strained', 'Strain', 'Strn'],
        ['Overtaxed', 'Overtax', 'Ovtx'],
        ['Overloaded', 'Overload', 'Ovld'],
    ];
    const encBase = last;
    for (let level = 1; level <= 2; level++) {
        let candidate = encBase;
        for (const names of encumbrance) {
            const long = names[0];
            const spelling = names[level];
            candidate = candidate.replace(new RegExp(` ${long}(?= |$)`), ` ${spelling}`);
        }
        if (candidate.length <= width)
            return candidate;
        last = candidate;
    }
    return last;
}
// ── Serialize terminal grid for screen comparison ──
export function serialize_terminal_grid(display) {
    let output = '';
    let lastRow = 0;
    for (let r = 0; r < display.rows; r++) {
        for (let c = 0; c < display.cols; c++) {
            if (display.grid[r][c].ch !== ' ') {
                lastRow = r;
                break;
            }
        }
    }
    for (let r = 0; r <= lastRow; r++) {
        let lastCol = -1;
        for (let c = display.cols - 1; c >= 0; c--) {
            if (display.grid[r][c].ch !== ' ') {
                lastCol = c;
                break;
            }
        }
        if (lastCol < 0) {
            if (r < lastRow)
                output += '\n';
            continue;
        }
        let firstCol = 0;
        for (let c = 0; c <= lastCol; c++) {
            if (display.grid[r][c].ch !== ' ') {
                firstCol = c;
                break;
            }
        }
        if (firstCol > 4)
            output += `\x1b[${firstCol}C`;
        else if (firstCol > 0)
            output += ' '.repeat(firstCol);
        for (let c = firstCol; c <= lastCol; c++)
            output += display.grid[r][c].ch;
        if (r < lastRow)
            output += '\n';
    }
    return output;
}
// ── Build screen output ──
// C ref: win/tty/topl.c — the tty topline never paints trailing blanks to the
// terminal row, so the recorded row-0 message has trailing spaces stripped (the
// cursor column is tracked independently and is set by the getlin/render caller).
// Only trailing spaces are removed; embedded and leading spaces (prompt layout)
// are preserved.  A normal pline never ends in a space, so this is a no-op for
// every non-getlin frame; it only affects getlin echo of a typed trailing space.
// The recorder's screen encoding (nomux_capture_screen) applies to EVERY row of
// the 24x80 dump, row 0 included: a run of MORE THAN FOUR blank cells is emitted
// as a cursor-forward escape instead of literal spaces.  com_pager.js's map,
// menu and text-window builders already obey it at `gap > 4`; the topline did
// not, so any pline with a >=5-space interior gap rendered with literal spaces
// where C records "\x1b[nC" — dowhatdoes' "%-8s%s." key field is exactly that
// case ("i" + 7 blanks: C records "i\x1b[7Cshow your inventory (#inventory).",
// seed2200 step 156).  Audited across the whole 64-session corpus: 0 recorded
// row-0 lines contain a literal run of >=5 spaces, so the rule is unconditional.
// Trailing blanks are stripped first (the tty never paints them; the cursor
// column is tracked independently and set by the getlin/render caller), so only
// INTERIOR gaps reach the encoder.
function _toplStr(msg) {
    const s = String(msg || '');
    return s.replace(/ +$/, '').replace(/ {5,}/g, (m) => `\x1b[${m.length}C`);
}
/* C ref: win/tty/topl.c topl_putsym default arm —
 *     if (ttyDisplay->curx == CO - 1) topl_putsym('\n');
 * putsyms() hard-wraps at column CO-1 with no regard for word boundaries, so a
 * prompt echo wider than 79 visual columns spills onto row 1 (overdrawing the
 * map's top row), then row 2, and so on.  This is NOT update_topl's word wrap
 * (a prompt carries SUPPRESS_HISTORY and never reaches update_topl) and it is
 * NOT a --More--.  Splits the RAW message so `_toplStr` still runs per row.
 * DISPLAY-ONLY: no RNG, no state. */
function _topl_hardwrap(line) {
    const rows = [];
    let cur = '', curVis = 0;
    for (const chunk of String(line || '').match(/\x1b\[[0-9;]*[A-Za-z]|[\x0e\x0f]|[\s\S]/g) || []) {
        const w = _topl_visualLen(chunk);
        if (curVis + w > TOPL_CO - 1) { rows.push(cur); cur = ''; curVis = 0; }
        cur += chunk;
        curVis += w;
    }
    rows.push(cur);
    return rows;
}
/* hooked_tty_getlin sets ttyDisplay->inread before custompline paints its
 * prompt.  Core bot() processing is suppressed during that paint, so the two
 * physical status rows remain byte-for-byte what the terminal already held.
 * `_screen_output` is that physical frame; unlike `_lastPaintedBotl`, it also
 * includes paints produced by page dismissal and other terminal-only paths. */
function _prompt_physical_status_rows() {
    if (!game?._topl_prompt_echo)
        return null;
    /* A menu dismissal blanks the status windows before the following getlin;
     * `_screen_output` can still contain the menu which occupied those rows. */
    if (game._status_blanked)
        return ['', ''];
    if (!game._screen_output)
        return null;
    const rows = String(game._screen_output).split('\n');
    return rows.length >= 24 ? [rows[22], rows[23]] : null;
}
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display)
        return;
    /* A getlin/extcmd prompt echo that has run past column 79 occupies more
     * than one physical row (topl_putsym's hard wrap).  Lay it out the way the
     * multi-row --More-- frame does, minus the indicator. */
    if (game._topl_prompt_echo) {
        const promptLine = String(game._pending_message || '');
        if (_topl_visualLen(promptLine) > TOPL_CO - 1) {
            _buildScreenOutputWithMoreRows(_topl_hardwrap(promptLine));
            return;
        }
    }
    let output = '';
    // Row 0: message.  C ref: win/tty/topl.c — the tty topline paints only the
    // message glyphs; trailing blanks are never written to the terminal row, so
    // a recorded screen row has trailing spaces trimmed (the cursor column is
    // tracked separately).  This matters for getlin echo: when the typed buffer
    // ends in a space (e.g. wish "blessed " mid-input, seed5500 step 48), C
    // records "...wish? blessed" (trimmed) with the cursor at the space column,
    // while an untrimmed JS string would carry the trailing " ".  Match C by
    // stripping trailing spaces from the row-0 message text.
    /* `_topl_sticky` is topline text C left PHYSICALLY on the terminal but that
     * our per-read clear (js/input.js nhgetch) has already dropped from
     * _pending_message.  It is a paint-time fallback ONLY: a live
     * _pending_message always wins, so a later pline neither joins onto it nor
     * is shadowed by it, and nhgetch drops it on the next key.  Set by
     * getpos()'s exitgetpos when C's msg_given is FALSE (getpos.c:1156). */
    output += _toplStr(game._pending_message || game._topl_sticky || '') + '\n';
    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }
    // Row 22-23: status
    /* `_status_blanked`: a full-screen tty menu overdraws rows 22-23, and
     * dismissing it repaints only WIN_MAP — the status window is a separate
     * window that tty rewrites only from bot(), which needs a turn or an
     * explicit status update.  So a non-menu frame painted between a menu
     * dismissal and the next bot() shows BLANK status rows.  seed4500 steps
     * 237-242: the "Set fruit to what?" getlin inside doset() renders the map
     * with rows 22-23 empty; doset's exit repaints them (step 249). */
    /* C's tutorial gamestate memcpy restores the live hero before the next
     * turn, but every outstanding pre-redraw page is painted while the old
     * tutorial status is still physically on the terminal.  Keep the override
     * through internal repaints and page-acks; the level-transition pager
     * clears it after the final dismissal. */
    const _tutorialStatusOverride = game._tutorialStatusOverride;
    const _promptStatusRows = _prompt_physical_status_rows();
    let _status1 = '', _status2 = '';
    if (_tutorialStatusOverride) {
        const _liveU = game.u;
        game.u = _tutorialStatusOverride.u;
        _status1 = _statusLine1();
        _status2 = _statusLine2();
        game.u = _liveU;
    } else if (_promptStatusRows) {
        [_status1, _status2] = _promptStatusRows;
    } else if (!game._status_blanked) {
        _status1 = _statusLine1();
        _status2 = _statusLine2();
    }
    output += _status1 + '\n';
    output += _status2;
    game._screen_output = output;
    // Also write to grid for serialize_terminal_grid
    if (display.grid) {
        display.clearScreen();
        // Message line
        const msg = game._pending_message || '';
        for (let c = 0; c < Math.min(msg.length, display.cols); c++)
            display.setCell(c, 0, msg[c], NO_COLOR, 0);
        // Map — write characters to grid (DEC → Unicode for browser display)
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ')
                    continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        // Status lines
        const s1 = _status1.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m => m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = _status2;
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        // Cursor at hero
        if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}
// Build the --More-- frame for the WRAPPED case (M >= 2 message rows):
// `rows` holds the already-laid-out text for screen rows 0..M-1 (the last row
// includes the "--More--" indicator), and the map is pushed down accordingly
// (screen rows M..21 show game y=(M-1)..20; game y=0..(M-2) are hidden behind
// the message rows).  Covers both the plain "committed fits on one row but
// not with --More-- appended" case (M=2, rows=[committed, "--More--"], the
// original single-extra-row mode) and a committed message that itself needs
// word-wrapping across multiple rows before "--More--" is reached (M>=2,
// _topl_wordwrap above).  Mirrors pline_with_more's wrapped layout so the
// recorded wrapped --More-- frame matches.
function _buildScreenOutputWithMoreRows(rows) {
    const display = game?.nhDisplay;
    if (!display)
        return;
    const M = rows.length;
    let output = '';
    for (let r = 0; r < M; r++)
        output += _toplStr(rows[r]) + '\n';           /* rows 0..M-1: message */
    for (let y = M - 1; y < ROWNO; y++)                /* rows M..21: map y=(M-1)..20 */
        output += render_map_row(y) + '\n';
    const _promptStatusRows = _prompt_physical_status_rows();
    output += (_promptStatusRows?.[0] ?? _statusLine1()) + '\n'; /* row 22 */
    output += (_promptStatusRows?.[1] ?? _statusLine2());        /* row 23 */
    game._screen_output = output;
    if (display.grid) {
        display.clearScreen();
        for (let r = 0; r < M; r++) {
            const line = rows[r] || '';
            for (let c = 0; c < Math.min(line.length, display.cols); c++)
                display.setCell(c, r, line[c], NO_COLOR, 0);
        }
        /* map y=(M-1)..20 → screen rows M..21 */
        for (let y = M - 1; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ')
                    continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m => m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = _statusLine2();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
    }
}
// ── Topline overflow / --More-- (C ref: win/tty/topl.c update_topl + more()) ──
// NetHack's tty message window (WIN_MESSAGE) is one row wide (CO columns).  As
// pline() accumulates messages on the topline (joined with "  "), the tty layer
// keeps the line within CO-1 columns AND reserves room so it can append the 8-col
// "--More--" continuation indicator.  When a new message would not fit on the
// current topline, update_topl() calls more() (topl.c:212): it appends "--More--"
// to the already-committed portion, waits for a dismiss key (space / return / ESC;
// other keys re-loop), then clears the topline and continues with the pending
// message.  more() consumes keystrokes but no RNG.
//
// In our replay architecture pline() is fire-and-forget, so the whole turn's
// messages have already been concatenated into game._pending_message by the time
// the topline is displayed (at the flush_screen that precedes each nhgetch).  We
// therefore perform the C overflow decision HERE, at display time: split the
// accumulated line at "  " message boundaries into the longest prefix that fits,
// drive the more() loop for the committed prefix, then continue with the
// remainder (re-splitting if the remainder itself still overflows).
//
// CO = 80 (const.js COLNO); a topline may occupy columns 0..CO-2 (CO-1 = 79
// chars).  "--More--" is 8 chars, so a line that needs the continuation indicator
// can hold at most CO-1-8 = 71 chars of message text before the indicator.
const TOPL_CO = 80;             /* C: CO (terminal columns) */
const TOPL_MORE = '--More--';   /* C: append_message / more() indicator */
const TOPL_LIMIT = TOPL_CO - 1 - TOPL_MORE.length; /* 71 = CO-1-8 reserve */

// Visual column width of a topline string, honoring the "\x1b[NC" cursor-
// forward-N-columns gap encoding (js/chargen_ui.js emitLeading, js/com_pager.js
// and js/optmenu.js document/use the same >4-blank-run -> \x1b[NC convention;
// here it carries do_screen_description's 8-col glyph pad, cmd.js:12963) and
// the \x0e/\x0f DEC line-drawing shift-out/shift-in markers (zero-width
// control chars, same convention render_map_row uses for map glyphs). Each
// \x1b[NC escape counts as N visual columns while consuming only its own
// literal chars; \x0e/\x0f count as zero; every other character (including a
// literal space) counts as one column. Used to lay out the raw terminal-width
// word-wrap below, and by cmd.js's --More-- cursor placement, in the same
// units C's tty measures (visual columns), not JS string .length.
export function _topl_visualLen(s) {
    let n = 0, i = 0;
    const str = String(s || '');
    while (i < str.length) {
        if (str[i] === '\x1b' && str[i + 1] === '[') {
            let j = i + 2, params = '';
            while (j < str.length && !/[A-Za-z]/.test(str[j])) { params += str[j]; j++; }
            if (str[j] === 'C') n += parseInt(params || '1', 10) || 1;
            i = j + 1;
            continue;
        }
        if (str[i] === '\x0e' || str[i] === '\x0f') { i++; continue; }
        n++; i++;
    }
    return n;
}

// C ref: win/tty/topl.c topl_putsym (default arm) + putsyms — where the tty
// leaves the cursor after a topline PROMPT has been written from column 0.
//
// tty_yn_function (topl.c:412-420) builds "<query> [<resp>]( <def>)" and then
// does `Strcat(prompt, " ")` — "trailing space is wanted here in case of
// reprompt" — before handing it to custompline() with SUPPRESS_HISTORY.  That
// flag makes tty_putstr take the show_topl -> addtopl -> putsyms branch
// (wintty.c:2296), NOT update_topl, so the prompt is emitted one character at a
// time with no word-splitting pass.  putsyms feeds each character to
// topl_putsym, whose default arm is
//
//     if (ttyDisplay->curx == CO - 1)
//         topl_putsym('\n');      /* 1 <= curx < CO; avoid CO */
//     ...
//     ttyDisplay->curx++;
//
// i.e. a HARD wrap one column short of the right margin.  So the 80th character
// of a prompt is not painted at column 79 — the wrap fires first and paints it
// at column 0 of the NEXT row, leaving the cursor at column 1 of that row.
//
// Corroborated across all 44 public recordings by tabulating (row-0 length ->
// recorded cursor) for every step whose topline is >= 70 columns: prompts of
// written length 70..79 park at [len, 0] without exception, and the single
// corpus write of length 80 (seed0014 step 383, "Dip a cursed very rusty -4
// orcish helm (being worn) into the fountain? [yn] (n) ") parks at [1, 1].
// Neither of update_topl's outcomes can produce that: word-splitting the same
// string substitutes '\n' for the trailing space and parks at [0, 1].
//
// `written` is the exact byte string C hands to putsyms — for a yn prompt that
// is the query text PLUS tty_yn_function's trailing space, and for a getlin
// echo it is prompt + " " + the buffer typed so far.
export function topl_park_cursor(disp, written) {
    const CO = 80;
    let curx = 0, cury = 0;
    const n = _topl_visualLen(written);
    for (let i = 0; i < n; i++) {
        if (curx === CO - 1) { curx = 0; cury++; } /* topl_putsym('\n') */
        curx++;
    }
    if (disp) { disp.cursorCol = curx; disp.cursorRow = cury; }
    return [curx, cury];
}

// C ref: win/tty/topl.c update_topl — the tty message window word-wraps any
// committed text wider than one row (CO-1 = 79 visual columns) across
// successive physical rows, breaking at a space boundary (the breaking space
// itself is not painted on either row) rather than raw column-80 overflow.
//
// CORRECTED 2026-08-17: this comment used to name topl_putsym as the source of
// the word wrap.  It is not — topl_putsym hard-wraps at column CO-1 with no
// regard for word boundaries (see topl_park_cursor below).  The word-splitting
// is update_topl's `for (tl = gt.toplines; n0 >= CO; )` loop (topl.c:277-291),
// which scans BACKWARDS from gt.toplines[CO-1] for a space and substitutes a
// '\n' for it.  The distinction is load-bearing rather than pedantic: a message
// carrying SUPPRESS_HISTORY skips update_topl entirely (wintty.c:2289-2297
// routes it to show_topl -> addtopl -> putsyms), so it never word-wraps at all.
// Every yn/getlin prompt is such a message.
//
// Verified against the recorded corpus (seed2200 steps 54/66, seed0002 step
// 345, seed0360 step 603, seed0500/seed0777 book-read steps): every observed
// wrap point is exactly "would the NEXT space-delimited word push this row
// past 79 visual columns" — never a mid-word split, and never the CO-1-8=71
// --More-- reserve (that reserve only governs the separate join-driven
// _topl_split_for_more decision above, not raw text layout). A single token
// wider than one row (never observed in the corpus) is placed alone on its
// own row rather than hard-broken mid-word.
function _topl_wordwrap(text, width) {
    const tokens = String(text || '').match(/\S+|\s+/g) || [];
    const rows = [];
    let cur = '', curVis = 0;
    for (const tok of tokens) {
        if (/^\s+$/.test(tok)) {
            if (curVis > 0) { cur += tok; curVis += _topl_visualLen(tok); }
            continue;
        }
        const tokVis = _topl_visualLen(tok);
        if (curVis > 0 && curVis + tokVis > width) {
            rows.push(cur.replace(/ +$/, ''));
            cur = tok; curVis = tokVis;
        } else {
            cur += tok; curVis += tokVis;
        }
    }
    // The FINAL row is NOT trimmed.  C ref: win/tty/topl.c update_topl:225-240 —
    // the wrap loop only runs while `n0 >= CO`, and it splits by REPLACING the
    // break space with '\n' (`*tl++ = '\n'`); the buffer's own tail is copied to
    // the terminal verbatim by redotoplin/addtopl.  So C never strips a trailing
    // space, and "--More--" lands one column further right whenever the message
    // genuinely ends in one.  godvoice's pline_The("voice of %s %s: %s%s%s", ...)
    // with a NULL `words` formats to "...rings out: " — trimming that space put
    // seed0106's step-12 topline at "rings out:--More--" where C has
    // "rings out: --More--".  Split rows keep their trim (C consumes the break
    // space at each split).
    if (cur) rows.push(cur);
    return rows.length ? rows : [''];
}

// ── per-pline JOIN tracking (the update_topl reserve key) ──
// C ref: win/tty/topl.c update_topl — every pline()→update_topl() makes its OWN
// fit/more() decision against the already-committed topline; the decision is per
// MESSAGE, not per "  " in the rendered string.  Our replay concatenates all of a
// turn's plines into game._pending_message before display, so we record, for that
// exact string, the offsets where genuine pline JOINS occurred ("  " separators
// pline() inserted).  A "  " inside a single atomic pline (e.g. the welcome line
// "Velkommen ...!  You are ...") is NOT a join and never appears here, so such a
// line is never split.  _topl_record_join(prev, joined) is called by pline() (and
// the inline-append sites in monmove) AFTER it computes `joined = prev + "  " + msg`.
//
// The joins array is keyed to the exact string it describes (game._topl_joins_src):
// any DIRECT assignment to _pending_message (a prompt, a fresh single pline, a
// remainder, nhgetch's clear) leaves _topl_joins_src != _pending_message, so the
// stale joins are ignored and the string is treated as a single atomic message —
// the C-faithful default (no join boundary → no width-driven split).
export function _topl_record_join(prev, joined) {
    const g = game;
    if (!g) return;
    routeTag('_topl_record_join', joined); /* telemetry only */
    let joins = (g._topl_joins_src === prev && Array.isArray(g._topl_joins))
        ? g._topl_joins.slice() : [];
    joins.push(prev.length); /* offset of the "  " separator within `joined` */
    g._topl_joins = joins;
    g._topl_joins_src = joined;
    _pline_flush_frame_tick(prev, joined);
}

// ── per-pline flushed frame (C: vpline's flush_screen(1) before putmesg) ──
// C ref: src/pline.c:274-277 — EVERY pline, before it hands its text to
// putmesg()/update_topl(), does `if (u.ux) flush_screen(...)`.  So the physical
// terminal is synced to the gbuf AT THE INSTANT the message is emitted, and when
// that message is the one that does not fit, win/tty/topl.c's update_topl() calls
// more() over exactly that just-flushed screen.  The frozen frame therefore
// belongs to the OVERFLOWING message, not to the last message that still fitted —
// and not to any turn/world-block boundary.
//
// Our replay accumulates a whole window's plines into one string and pages it
// later at flush_screen, by which time disp_* has moved on.  So record, at each
// genuine message boundary, the gbuf-analogue (disp_*) cells as of that pline's
// flush together with the boundary's ABSOLUTE offset in the eventual full topline
// (the `_resultMessage + "  " + _pending_message` merge — same formula
// run_page_frame_tick uses).  flush_screen's paging loop then installs, for a page
// whose committed text ends at offset E, the frame recorded for the message that
// starts at E: that is the pline whose update_topl() fired the more().
//
// Entries carry the message text so a stale record cannot be mis-applied: the
// selector re-checks that the live topline really does continue with that message
// at that offset (see _pline_flush_frame_select).  DISPLAY-ONLY: snapshots a copy
// of the disp_* cells, consumes no RNG, mutates no game state.  An unmatched
// offset leaves every existing --More-- path byte-identical.
/* There is NO minimum offset.  This log used to skip any boundary below column
 * 20, on the assumption that "no page's committed end lands below this" — but a
 * page's committed end is the length of the message that FITTED, and a short
 * first message followed by a long one overflows the 71-column reserve straight
 * away.  Measured on gen040-reseed-seed267324 step 77: kick_ouch's "Ouch!  That
 * hurts!" (18 chars) is committed and set_wounded_legs -> encumber_msg's "Your
 * movements are slowed slightly because of your load." (56) is what does not
 * fit, so the page's committed end is 18 and its frame was never recorded — the
 * --More-- then rendered the LIVE status (post-losehp HP, post-turn T:) instead
 * of the status as of the overflowing pline.  C's vpline() flushes before EVERY
 * putmesg (pline.c:274-277); it has no such threshold and neither do we. */
const PLINE_FLUSH_FRAME_MAX = 256;      /* bound the per-window log */
function _pline_flush_frame_tick(prev, joined) {
    const g = game;
    if (!g || !g.level) return;
    // Absolute offset of this boundary within the merged topline: a command-result
    // buffer (_resultMessage) that is SEPARATE from the line being appended to gets
    // prepended by _topl_merge_result as `result + "  " + pending`, so it shifts
    // every _pending_message offset.  When the append IS into _resultMessage the
    // caller has already stored the joined string there (cmd.js
    // _result_append_join assigns before recording the join), so `res` matches
    // either `prev` or `joined` and there is no prefix.
    /* _topl_result_head: when _resultMessage is a SNAPSHOT of this same live
     * line (domove_core's swap-with-pet copy) it is NOT a separate prefix, and
     * charging its length here put every frame this turn recorded at an offset
     * the paging loop never asks for.  gen017-reseed-seed1328024 step 25: the
     * width-driven page of the engraving reveal looked for offset 79 and the
     * record had been filed at 118, so its --More-- rendered the LIVE map (the
     * pet already moved) instead of the map as of that pline. */
    const res = _topl_result_head(g._resultMessage, prev);
    const prefix = (res && res !== prev && res !== joined) ? res.length + 2 : 0;
    const off = prefix + prev.length;
    const msg = joined.slice(prev.length + 2);
    _pline_flush_frame_record(off, msg);
}
// The boundary a message OPENS when it starts a fresh _pending_message on top of
// an already-committed command result (_resultMessage).
//
// C ref: the same vpline() flush — there is nothing special about this message,
// it is simply the first one of a new world block.  In this port that case takes
// pline()'s `else` arm (`game._pending_message = msg`), which records no join,
// so until now it recorded no flushed frame either and the page whose committed
// text is exactly the result line fell back to rendering the LIVE status.
//
// The offset is `res.length` — the END of the committed text, matching the paging
// loop's `consumed + committed.length` — NOT `res.length + 2`.  _topl_merge_result
// renders the topline as `result + "  " + pending`, so the two-space separator
// occupies [res.length, res.length+2) and the tick's `prefix` term above (which is
// added to a NON-EMPTY prev) is the offset of the text AFTER that separator.
//
// Measured 2026-08-17 on seed0014 step 415: the take-off's off_msg
// ("You were wearing a blessed +3 small shield.", 43 chars) is committed as the
// command result and the water nymph's steal message opens the next world block,
// so the page-1 select asked for off 43 and the log's earliest record was 108.
function _pline_flush_frame_record(off, msg) {
    const g = game;
    if (!g || !g.level) return;
    if (!g._plineFlushFrames) g._plineFlushFrames = [];
    if (g._plineFlushFrames.length >= PLINE_FLUSH_FRAME_MAX) g._plineFlushFrames.shift();
    g._plineFlushFrames.push({
        off,
        msg,
        cells: _capture_painted_cells(),
        moves: _painted_moves(),
        botl: _capture_botl(),
    });
}
/* C youprop.h:125  Deaf = (HDeaf || EDeaf || u.uroleplay.deaf).  HDeaf is the
 * flat u.HDeaf slot in this port (js/allmain.js:1591 nh_timeout_deaf counts it
 * down; js/eat.js:1183 and js/music.js's leather drum set it). */
/* Exported as Deaf: js/ carries SEVEN readings of youprop.h:125 and they
 * disagree about which slot holds HDeaf (three read u.uprops[DEAF], which has
 * no writer anywhere in js/; two read game.flags.deaf, which is an OPTION, not
 * the property).  This is the one that is measured — the status line's Deaf
 * condition is built from it and checked against C on every step of every
 * session.  The other six are not touched here; only new callers use this. */
export { _live_deaf as Deaf };
function _live_deaf() {
    const u = game?.u;
    if (!u) return false;
    const dp = u.uprops?.[DEAF];
    return !!((dp?.intrinsic | 0) || (dp?.extrinsic | 0) || (u.HDeaf | 0)
              || (u.uroleplay && u.uroleplay.deaf));
}
// Capture the bottom-status scalars as of THIS instant.
//
// C ref: display.c:2285-2288 — flush_screen() begins with
//     if (disp.botl || disp.botlx) bot(); else if (disp.time_botl) timebot();
// and pline.c:274-277 has every vpline() call flush_screen() before putmesg().
// So the status window is repainted by the SAME call that syncs the map, at the
// SAME instant: the frozen frame a page's more() shows carries that pline's
// status line, not the end-of-command one.
//
// This port accumulates a whole window's plines and pages them later at
// flush_screen, by which time u.uhp &c have moved on — so the frozen page renders
// the LIVE status.  seed5500 step 831: the zap's third message is burnarmor's
// "Your cloak smoulders!", which zhitu (zap.c:4415-4429) emits BEFORE its closing
// losehp() (zap.c:4581), so C's status still reads HP:127 while this port had
// already applied the 19 damage and rendered HP:108.  Both orderings are the same;
// only the render instant differed.
//
// WHICH FRAMES RECORD IT (updated 2026-09-10 — this note used to say "ONLY for
// pline-flush frames ... the movemon / occupation / run frames keep rendering
// live status and are byte-unchanged", which stopped being true when the
// movemon page-freeze started pinning it):
//   RECORDED, instant exact — the pline-flush frames (_pline_flush_frame_record),
//     the forced-break frames (topl_force_break_after's display_nhwindow page),
//     capture_painted_frame_with_status(), this port's own bot() (C botl.c:279's
//     paint latch), and — since 8605b7bea and its follow-up — BOTH movemon
//     page-freeze frames: the first-overflow g._paintedSnapshot and every
//     per-page g._movemonPageFrames[] entry.  A movemon frame's instant is not
//     an approximation: _maybe_snapshot_painted_screen runs at the overflowing
//     pline, which is exactly where C's vpline() -> flush_screen() -> bot()
//     runs (pline.c:273-274, display.c:2237-2240).
//   NOT RECORDED, still rendering LIVE status — the run frames
//     (run_page_frame_tick records no `botl` field), the occupation freeze
//     (occupation_freeze_snapshot), the per-turn deferred-more frame, the
//     pickup-encumber pre-frame (it pins `cap` only), and
//     capture_painted_frame() (deliberately botl-free so its cmdq-fireassist
//     caller is byte-unchanged).  Those approximate the pline instant at
//     world-block granularity; pinning them is a separate, unmeasured change.
//
// SCOPE — hp/pw and the encumbrance level, deliberately NOT the whole status
// line.  Freezing a field mid-command is only correct where this port maintains
// that field at C's own call sites.  u.uhp/u.uen are (losehp/healup/spell cost
// all write them where C does).  So is the encumbrance level: it is not stored
// state at all but a pure function of the inventory chain
// (near_capacity() -> inv_weight() -> the gi.invent walk), and this port adds to
// and frees from gi.invent at C's addinv()/freeinv() sites, so its value at the
// pline instant IS C's value at that instant.  seed5500 step 863: C's drop()
// plines "You drop a scroll labeled FOOBIE BLETCH." BEFORE dropx()->freeinv()
// (do.c:773-777), so the frozen page still reads the pre-drop cap and shows
// " Stressed"; only after dropz()'s encumber_msg (do.c:840, pickup.c:1990) does
// the next flush repaint " Burdened".  This port paged the accumulated topline
// after the whole command and rendered the live post-drop cap.
// PARKED-NOTE: session=seed5500 citation-only
//
// u.uac IS captured, and — unlike the encumbrance level — it is captured LIVE, with
// no painted latch.  The asymmetry is C's, not a heuristic: near_capacity() is a
// derived quantity that nothing flags the status line for, so its painted value can
// lag the live one arbitrarily; u.uac is stored state whose ONLY writer is find_ac()
// (do_wear.c:2504-2506), and that writer runs SET_BOTL() on every change.  Since
// vpline() calls flush_screen() BEFORE putmesg() (pline.c:274-277) and flush_screen
// opens with `if (disp.botl || disp.botlx) bot();` (display.c:2286), a pline can
// never observe a stale AC: whatever find_ac last stored is repainted by that
// pline's own flush.  So live-at-capture-instant IS C's painted value.
// seed5500 step 869 is the case this buys: polymon (polyself.c:886-890) runs
// break_armor() BEFORE find_ac(), so the "The clasp on your cloak breaks open!"
// pline pages a frame that already carries the warhorse's HP:20(20)/HD:7/St:18/**
// but still the hero's AC:10; find_ac() drops it to the warhorse's mons[].ac == 4
// (monsters.h LVL(7,24,4)) only afterwards, which is what step 870 shows.
// This capture is therefore only as good as this port's find_ac() CALL SITES — an
// earlier attempt at it regressed seed0800 step 100 because the wear path ran
// find_ac after the "You feel yourself speed up." pline where C had already run it.
// Fixing a divergence here means moving a find_ac() to its C site, never widening
// or narrowing the capture rule.
// DISPLAY-ONLY: reads u + the inventory chain, consumes no RNG, mutates no state.
function _capture_botl() {
    const u = game?.u;
    if (!u) return null;
    /* C display.c:2285-2288 — this pline's own flush_screen() opens with
     *     if (disp.botl || disp.botlx) bot();
     * so the encumbrance field is REPAINTED at this instant only when something
     * earlier in the command flagged the status line; otherwise the physical
     * line still holds whatever the previous bot() put there.  Reproducing that
     * two-state rule is what separates seed5500's two paged frames:
     *   step 863 (drop) — encumber_msg (pickup.c:1990) plines BEFORE its
     *     SET_BOTL and drop() already ran freeinv (do.c:773-777), so nothing has
     *     flagged botl: the line keeps the PRE-drop " Stressed" even though
     *     near_capacity() now says " Burdened";
     *   step 869 (polymorph) — polymon's stat writes flag botl before
     *     break_armor's "The clasp on your cloak breaks open!", so bot() DOES
     *     run and the line picks up the warhorse's (unencumbered) capacity. */
    /* C botl.c:279 — bot() DECLINES TO PAINT while u.uhp is exactly -1:
     *     if (u.uhp != -1 && gy.youmonst.data && iflags.status_updates
     *         && !suppress_map_output()) { ...paint... }
     *     disp.botl = disp.botlx = disp.time_botl = FALSE;
     * The comment there explains the sentinel as dosave()'s completion flag, but
     * the guard is unconditional, so it also fires on any ORDINARY death whose
     * final blow lands the hero on exactly -1 hit points: the flags are cleared,
     * nothing is drawn, and the physical status line keeps the values the
     * PREVIOUS bot() put on the terminal for the rest of the game.
     *
     * This port re-derives the status from live `u` at render time, so it needs
     * the previous paint kept explicitly.  Measured on seed5002 segment 1 step
     * 209: a giant bat bites a 1-HP hero for d(1,6)=2, so u.uhp is -1 and C's
     * status reads HP:1(12) on the "The giant bat bites!--More--" frame and on
     * every one of the twelve frames after it, through "You die..." and the
     * wizard-mode "Die? [yn]" prompt.  This port repainted HP:0(12). */
    if ((u.uhp | 0) === -1)
        return game._lastPaintedBotl || null;
    const _d = game.disp;
    if (_d && ((_d.botl | 0) || (_d.botlx | 0))) {
        game._botlPaintedCap = near_capacity() | 0;
        /* Same PAINT-time rule for the Deaf condition — see the `deaf` field
         * below and botl_status_suffix's note. */
        game._botlPaintedDeaf = _live_deaf();
        game._botlPaintedConfused = !!(u.uprops?.[CONFUSION]?.intrinsic | 0);
        game._botlPaintedLevel = u.ulevel | 0;
        game._botlPaintedExp = u.uexp ?? 0n;
    }
    return (game._lastPaintedBotl = {
        /* C botl.c:188 — (cap = near_capacity()) > UNENCUMBERED, read by bot()
         * at PAINT time. */
        cap: (game._botlPaintedCap != null)
            ? (game._botlPaintedCap | 0) : (near_capacity() | 0),
        uhp: u.uhp, uhpmax: u.uhpmax,
        mh: u.mh, mhmax: u.mhmax,
        uen: u.uen, uenmax: u.uenmax,
        /* C botl.c:867-869 BL_AC — bot() reads u.uac, which only find_ac() writes
         * and which SET_BOTL()s on every change; see the SCOPE note above. */
        uac: u.uac,
        /* C botl.c:1458-1460 BL_XP / BL_EXP — bot() reads u.ulevel and u.uexp at
         * PAINT time, exactly as it reads u.uhp.  They were the only status
         * fields still re-derived LIVE while every neighbour was frozen, so a
         * level change inside a paging window rewrote the Xp: field on frames C
         * had already painted.
         *
         * MEASURED on seed0399-wizard-hallu-actions steps 525-527: the prayer's
         * angrygods (pray.c:725, rn2(6)=3) reaches losexp(NULL) in the SAME
         * turn whose accumulated toplines page here, and C's three frames read
         * "Xp:20" — the pre-losexp value — while HP:83(99) and Pw:213(213) on
         * those very frames were already frozen correctly.  C only shows Xp:19
         * from step 528, the first frame painted after the level loss. */
        ulevel: (game._botlPaintedLevel != null)
            ? (game._botlPaintedLevel | 0) : (u.ulevel | 0),
        uexp: (game._botlPaintedExp != null)
            ? game._botlPaintedExp : (u.uexp ?? 0n),
        /* newuhs() retains save_hs until the interrupted meal's deferred
         * reset runs, but C's stop_occupation() has already raised SET_BOTL.
         * Once the eat occupation is cleared, bot() therefore paints the live
         * post-bite hunger state (gen148: Satiated), not save_hs. */
        uhs: game._saved_hs && game.occupation?.name === 'eatfood'
            ? (game._save_hs | 0) : (u.uhs | 0),
        /* C botl.c bot1str — ACURR(A_STR)…ACURR(A_CHA).  Captured LIVE, on the
         * same argument u.uac is: attrib.c:190-194 adjattrib sets
         * `disp.botl = TRUE` and THEN emits its You_feel(), and the other
         * writers of ABASE/ATEMP/ABON flag the status line at the write too, so
         * a pline can never observe an attribute the previous bot() has not
         * already painted.  Live-at-capture-instant IS the painted value.
         * seed0106 steps 11-12: angrygods (pray.c:2168-2175) plines "The voice
         * of Amaterasu Omikami rings out: " and verbalizes "Thou must relearn
         * thy lessons!" BEFORE adjattrib(A_WIS, -1), so C's first two prayer
         * --More-- frames still read Wi:18 and only the third ("You feel
         * foolish!", adjattrib's OWN message) reads Wi:17.  This port paged the
         * whole accumulated window after the command and rendered the
         * post-prayer 17 on all three.
         * Null when the hero has no attribute array yet (chargen). */
        attrs: (u.acurr && u.acurr.a)
            ? [acurr(u, A_STR), acurr(u, A_DEX), acurr(u, A_CON),
               acurr(u, A_INT), acurr(u, A_WIS), acurr(u, A_CHA)]
            : null,
        /* C botl.c:145-154 and :777 — bot() reads Upolyd (you.h:554,
         * u.umonnum != u.umonster) for the
         * HP/HPmax source, for the "HD:"-vs-"Xp:" field AND for the title
         * (pmname(&mons[u.umonnum]) vs rank()), all at PAINT time.  Captured for
         * the same reason uhp/uac are: a --More-- raised mid-movemon freezes the
         * physical status line, and rehumanize() can change the hero's FORM
         * inside that window.  MEASURED on seed4500-knight-coverage steps
         * 1757-1762: a master lich's psi bolt reverts a brown mold to a Knight
         * during the paging window and C keeps painting "Wizard the Brown Mold
         * ... HP:14(14) ... HD:1 ... Blind" on all six frames, while this port
         * re-derived every one of those fields from the post-revert hero. */
        mtimedone: u.mtimedone | 0,
        umonnum: u.umonnum | 0,
        /* C you.h:554 Upolyd is (u.umonnum != u.umonster); the snapshot carried
         * only umonnum and the mtimedone TIMER, so the frozen-frame status line
         * could not spell C's macro.  u.umonster never changes after
         * u_init.c:991 but is snapshotted with the rest for symmetry. */
        umonster: u.umonster | 0,
        female: !!(game.flags && game.flags.female),
        /* C botl.c:1193 condtests[bl_deaf] — the Deaf condition, LATCHED at the
         * last bot() rather than read live.  Unlike Blind (whose only writers,
         * make_blinded/wipeoff, SET_BOTL at the write) HDeaf has writers that do
         * NOT flag the status line at the point they store it: music.c:709's
         * `incr_itimeout(&HDeaf, rn1(20, 30))` sets `disp.botl` only at the end
         * of the LEATHER_DRUM arm, twelve lines and one awaken_monsters() later.
         * So a pline raised in between flushes a screen whose status window C
         * does not repaint, and the physical line still says what the previous
         * bot() painted.  seed0002 steps 569-579 measure exactly that: the
         * drum's --More-- frames carry NO " Deaf" and step 580's does. */
        deaf: (game._botlPaintedDeaf != null) ? !!game._botlPaintedDeaf : _live_deaf(),
        confused: game._botlPaintedConfused ?? !!(u.uprops?.[CONFUSION]?.intrinsic | 0),
        /* C botl.c:975 condtests[bl_blind] — same PAINT-time rule. */
        blinded: (() => {
            const bp = u.uprops && u.uprops[BLINDED];
            /* Blindf_off clears the worn property before its off-message,
             * while C's physical status remains unchanged until the blindness
             * redraw. Preserve that status for the message's frozen frame. */
            if (game._blindfoldOffFrameBlind !== undefined)
                return !!game._blindfoldOffFrameBlind;
            return (!!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
                    && !(bp.blocked | 0));
        })(),
        /* C botl.c:1202 condtests[bl_stun] — same PAINT-time rule as Blind: a
         * live read here reports the stun the hero has ALREADY been given by the
         * rest of the monster's attack, where C's physical status line still
         * carries the paint from before it.  gen232-reseed-seed1268561 step 1011
         * is the witness: C's "The red dragon bites!  The red dragon hits!"
         * --More-- frame has no Stun (the knockback that stuns is two messages
         * further on, at step 1025) and this port rendered it on all 23 frames
         * of the page.  Stunned is youprop.h:81 HStun, intrinsic only. */
        stunned: (() => {
            const sp = u.uprops && u.uprops[STUNNED];
            return !!sp && (sp.intrinsic | 0) !== 0;
        })(),
        /* C botl.c:1196 condtests[bl_hallu] — the SAME PAINT-time rule as Blind,
         * Deaf and Stun, and the last condition still read live while all three
         * neighbours were frozen.  mhitu.c:1643-1650 explmu()'s AD_HALU arm is
         * the witness: it plines "You are caught in a blast of kaleidoscopic
         * light!", THEN make_hallucinated(), THEN "You are freaked out." — so
         * the flush_screen() inside the FIRST of those plines (display.c:2237,
         * pline.c's vpline) paints a status line with no Hallu, and only the
         * flush inside "You are freaked out." carries it.
         * MEASURED gen406-reseed-seed381059: C's " Hallu" first appears at step
         * 1092, the frame frozen by "You are freaked out."; this port rendered
         * it from step 1073, the frame frozen by the kaleidoscopic message, and
         * on all nineteen --More-- pages in between.
         * Hallucination is youprop.h:120 (HHallucination && !Halluc_resistance)
         * — intrinsic only on the HALLUC side, like Stunned. */
        hallucinating: (() => {
            const hp = u.uprops && u.uprops[HALLUC];
            const hrp = u.uprops && u.uprops[HALLUC_RES];
            if (!hp || (hp.intrinsic | 0) === 0) return false;
            return !(hrp && ((hrp.intrinsic | 0) || (hrp.extrinsic | 0)));
        })(),
    });
}
// Freeze the whole physical frame — map cells AND the bottom status scalars — as
// of THIS instant, for a caller that is about to change hero state and then force
// a --More-- over it.
//
// C ref: display.c:2285-2288 — flush_screen() repaints the status window only
//     if (disp.botl || disp.botlx) bot();
// A bare write like trap.c:6928's `u.uhp = -1` sets neither flag, so the status
// window on the physical terminal still carries whatever the previous bot()
// painted.  done() is what sets disp.botlx and calls bot() (end.c:1043-1045), and
// it runs AFTER the urgent_pline's more() has already blocked.  This port
// recomputes the status line from live `u` on every render instead of caching
// bot()'s output, so without this freeze an urgent_pline fired between a lethal
// state write and done() renders the POST-death status a frame early.
//
// Measured on seed0009 step 62: C's "You fall into the wall of lava!  You burn to
// a crisp...--More--" frame still reads HP:14(14); HP:0(14) is C's NEXT frame.
//
// Distinct from capture_painted_frame() (which deliberately carries no botl, so
// its existing cmdq-fireassist caller keeps rendering the live status).
// DISPLAY-ONLY: copies disp_* cells and hero scalars, consumes no RNG, mutates
// no game state.
export function capture_painted_frame_with_status() {
    const g = game;
    if (!g || !g.level) return null;
    return { cells: _capture_painted_cells(), moves: _painted_moves(), botl: _capture_botl() };
}
// Select the pline-flush frame frozen by the message that begins at `committedEnd`
// within `full` (the whole accumulated topline being paged).  Returns null when no
// record matches — the caller then falls back to the existing per-run / per-page /
// single-snapshot selection, so every previously-correct path is untouched.
function _pline_flush_frame_select(committedEnd, full, frames = game?._plineFlushFrames) {
    if (!frames || !frames.length || typeof full !== 'string') return null;
    for (let i = frames.length - 1; i >= 0; i--) {
        const f = frames[i];
        if (f.off !== committedEnd) continue;
        // Stale-record guard: the live topline must actually continue with the
        // message this frame was recorded for.
        if (full.slice(f.off + 2, f.off + 2 + f.msg.length) !== f.msg) continue;
        return f;
    }
    return null;
}
// Drop the per-window pline-flush frame log.  DISPLAY-ONLY.
function _pline_flush_frames_reset() {
    const g = game;
    if (!g) return;
    g._plineFlushFrames = null;
}

// Merge an earlier committed topline `a` (a command's own result plines) with a
// later one `b` (the same turn's movemon / append plines) into one committed
// topline "a  b", MAINTAINING the per-pline JOIN record that C's update_topl keeps
// so the width-driven more() still fires at the genuine message boundaries.
//
// C ref: win/tty/topl.c update_topl — the hero's command plines (a) and the
// following movemon plines (b) all arrive on ONE topline, each its own
// update_topl() fit/more() decision.  In our replay these two runs live in
// separate buffers (_resultMessage = a, _pending_message = b) and are string-
// concatenated at the moveloop merge; the naive `a + "  " + b` DROPS the join
// side-channel, so a later split sees a single atomic line and never pages
// (seed4200 step 763: "You fail to cast the spell correctly.  The ettin mummy
// hits!  ...again!..." shown with no --More-- while C paged at 60 cols).
//
// The merged joins are: a's own internal joins (if recorded for `a`), then the
// genuine a→b message boundary at offset a.length, then each of b's internal
// joins rebased by a.length+2.  We KEY _topl_joins_src to the MERGED string, which
// is exactly what the moveloop stores into _resultMessage and later restores into
// _pending_message unchanged — so the split machinery is armed at flush time.
//
// `aJoinsHint` (optional): a's join offsets pre-captured via _topl_joins_snapshot()
// BEFORE b's own plines ran.  The join side-channel is single-slot ("tracks one
// string at a time" — see below), so once b (e.g. a movemon window) accumulates
// its OWN join chain via pline(), `_topl_joins_src` no longer equals `a` and the
// live lookup below returns [] — silently dropping a's internal boundaries and
// collapsing a multi-message command result (e.g. a spell's self-hit + pet-kill
// pline pair) into one opaque atomic pline that never pages (seed4200 step 782:
// "The cone of cold bounces!  ...hits you!  You kill the poor kitten!  ...thunder..."
// merged with the following movemon's ettin-mummy plines).  Callers that stash
// `a` into a longer-lived slot (e.g. _resultMessage) before running b's source
// should snapshot its joins first and pass them here.
// DISPLAY-ONLY: no RNG.  Returns the merged string.
export function _topl_merge_result(a, b, aJoinsHint) {
    const g = game;
    a = (a == null) ? '' : String(a);
    b = (b == null) ? '' : String(b);
    if (!a) return b;
    if (!b) return a;
    // Pull whichever side's joins are currently on record (the side-channel tracks
    // one string at a time; at the moveloop merge it is keyed to _pending_message = b).
    const aJoins = Array.isArray(aJoinsHint) ? aJoinsHint.slice()
        : (g && g._topl_joins_src === a && Array.isArray(g._topl_joins))
        ? g._topl_joins.slice() : [];
    const bJoins = (g && g._topl_joins_src === b && Array.isArray(g._topl_joins))
        ? g._topl_joins.slice() : [];
    const merged = a + '  ' + b;
    const joins = aJoins.slice();
    joins.push(a.length);                 /* the genuine a→b message boundary */
    const base = a.length + 2;
    for (const j of bJoins) joins.push(j + base);
    /* _plineFlushFrames uses the same offset coordinate space as the join
     * side-channel.  Frames recorded while `b` was the live movemon line are
     * relative to `b`; once an earlier command/occupation line `a` is restored
     * in front of it, rebase those records along with b's joins.  Otherwise the
     * pager cannot find the exact vpline flush which raised the page and falls
     * back to the later whole-movemon snapshot.
     *
     * C order witnessed by gen292 step 16:
     *   "You stop eating..."; dog misses; jackal hitmsg; mdamageu.
     * The jackal hitmsg's vpline flush freezes HP:16 before mdamageu lowers it
     * to 14.  Its JS frame was recorded at offset 33 in `b`, but after the
     * 32-character occupation result was prepended the page lookup asks for
     * offset 67.  Rebase only records whose message still matches `b` at their
     * recorded boundary; records belonging to `a` or a stale window remain
     * untouched.  Display metadata only; no RNG or game state. */
    if (g && Array.isArray(g._plineFlushFrames)) {
        for (const f of g._plineFlushFrames) {
            const fm = String(f?.msg || '');
            if (f && fm && b.slice((f.off | 0) + 2,
                                   (f.off | 0) + 2 + fm.length) === fm)
                f.off = (f.off | 0) + base;
        }
    }
    if (g) { g._topl_joins = joins; g._topl_joins_src = merged; }
    return merged;
}

// C ref: win/tty/topl.c — C keeps ONE topline buffer, gt.toplines.  This port
// splits it in two: `_pending_message` is the LIVE line and `_resultMessage` is
// the copy that survives moveloop_core's post-rhack wipe, so a mid-command site
// whose plines must outlive that wipe "stashes" the live line into the result
// channel.  There are two shapes of stash and they need opposite treatment:
//
//   - `_resultMessage` holds a SEPARATE EARLIER line (an earlier step of a
//     counted walk, a pickup's pile line).  C's topline is `result  live`, so
//     the stash APPENDS — that is _topl_merge_result, which also rebases the
//     per-pline join offsets so the merged line still pages at the genuine
//     message boundaries.
//   - `_resultMessage` holds a SNAPSHOT of this SAME live line.  hack.c
//     domove_swap_with_pet's stash (js/cmd.js domove_core) COPIES
//     `_pending_message` into `_resultMessage` without clearing it — deliberately,
//     because _maybe_snapshot_painted_screen splits the live line during the
//     movemon block and needs the whole accumulated topline there.  Appending in
//     that state prints the copied text TWICE.
//
// _topl_snapshot_result() records exactly what was copied so the two are told
// apart by fact, not by a prefix heuristic: a counted walk can legitimately
// leave `_resultMessage` = "<earlier swap>  <this swap>" while the live line is
// "<this swap>  ...", where neither string is a prefix of the other.
//
// MEASURED on gen017-reseed-seed1328024 step 15: the hero swaps with the pet
// (domove_core snapshots "You swap places with your little dog.") and then
// steps onto an engraving, so read_engr_at's stash appended the live line —
// which still began with that same swap message — and the topline came out as
// "You swap places with your little dog.  You swap places with your little dog."
// Two consequences, both fatal to the frame: the duplicate pushed the genuine
// message boundaries off their recorded join offsets, and the raw `+ "  " +`
// concat dropped the join record entirely, so _topl_split_for_more saw one
// atomic pline and never paged.  C pages at the FIRST boundary — 37 + 2 + 40 is
// past the CO-1-8 reserve — and shows "You swap places with your little
// dog.--More--" frozen over the pre-movemon map for the whole of steps 15-23.
// DISPLAY-ONLY: no RNG, no game state.
export function _topl_snapshot_result(copied) {
    const g = game;
    if (!g) return;
    g._toplResultSnapshot = (copied == null) ? null : String(copied);
}
// Move the live topline into the command-result channel, preserving the join
// record and NOT re-appending a snapshot the caller's own command already took
// (see _topl_snapshot_result above).  DISPLAY-ONLY: no RNG, no game state.
// The part of the command-result channel that is NOT already a copy of `live` —
// i.e. what genuinely precedes the live line on C's single topline.  Strips the
// snapshot back off: it is the TAIL of `_resultMessage` (domove_core merges its
// copy onto whatever was already committed) and the HEAD of the live line (which
// has only grown since the copy was taken).  Returns `res` unchanged when no
// snapshot is on record or it does not line up, so every path that never took a
// snapshot is byte-identical.  DISPLAY-ONLY.
function _topl_result_head(res, live) {
    const g = game;
    const snap = g && g._toplResultSnapshot;
    res = (res == null) ? '' : String(res);
    if (!res || !snap || !live || !String(live).startsWith(snap)) return res;
    if (res === snap) return '';
    if (res.endsWith('  ' + snap)) return res.slice(0, res.length - snap.length - 2);
    return res;
}
export function _topl_stash_result() {
    const g = game;
    if (!g) return;
    const live = String(g._pending_message || '');
    if (!live) return;
    const full = (g._resultMessage == null) ? '' : String(g._resultMessage);
    const res = _topl_result_head(full, live);
    let resJoins = _topl_joins_snapshot(full);
    if (res !== full && resJoins)
        resJoins = resJoins.filter((o) => o < res.length);
    g._resultMessage = res
        ? _topl_merge_result(res, live, resJoins || undefined)
        : live;
    g._resultMessageJoins = {
        src: g._resultMessage,
        joins: (_topl_joins_snapshot(g._resultMessage) || []).slice(),
    };
    g._pending_message = '';
}

// Complete queued pline/update_topl pages before an awaited state transition.
// The port splits C's single topline into command-result and live channels;
// flush_screen alone only pages the latter. Preserve their joins and remove
// any result snapshot already present in the live channel before draining.
export async function flush_pending_messages() {
    const g = game;
    const live = String(g._pending_message || '');
    const full = String(g._resultMessage || '');
    const head = _topl_result_head(full, live);
    const stored = g._resultMessageJoins;
    const joins = stored?.src === full ? stored.joins : _topl_joins_snapshot(full);
    g._pending_message = head
        ? _topl_merge_result(head, live, joins?.filter(offset => offset < head.length))
        : live;
    g._resultMessage = null;
    g._resultMessageJoins = null;
    g._toplResultSnapshot = null;
    await flush_screen(1);
}

// Snapshot `line`'s current join offsets (if any are on record for it right
// now) for later use as _topl_merge_result's aJoinsHint — see that function's
// header.  Returns null when `line` has no live join record (a single atomic
// pline, or the side-channel has already moved on to a different string).
// DISPLAY-ONLY: reads only, no RNG, no state mutation.
export function _topl_joins_snapshot(line) {
    const g = game;
    if (!line || !g) return null;
    return (g._topl_joins_src === line && Array.isArray(g._topl_joins))
        ? g._topl_joins.slice() : null;
}

// Return the recorded join offsets for `line` (the "  " separators between
// genuine plines), or null when `line` is a single atomic pline / a directly
// assigned message (stale or absent join record).
function _topl_joins_for(line) {
    const g = game;
    if (g && g._topl_joins_src === line && Array.isArray(g._topl_joins) && g._topl_joins.length)
        return g._topl_joins;
    return null;
}

// Apply C's per-pline update_topl reserve rule.  `joins` are the offsets of the
// "  " separators between successive plines within `line` (null = single atomic
// pline).  C commits the longest run of joined plines such that appending the
// NEXT pline would make `cumulative + 2 + nextLen > CO-1-8` (=71); it raises
// --More-- there.  Returns null (no more()) when every pline fits, or
// [committed, remainder, remainderJoins] at the first boundary that overflows.
// A line with NO joins is a single atomic pline and is NEVER split, regardless of
// width (C update_topl prints the over-wide line and only more()s when a NEXT
// message arrives — which, for a lone pline, never does this turn).
/* C ref: win/tty/wintty.c tty_display_nhwindow(WIN_MESSAGE, blocking):
 *     if (ttyDisplay->toplin == TOPLINE_NEED_MORE) {
 *         more();
 *         ...
 *         tty_clear_nhwindow(window);
 *     } else
 *         ttyDisplay->toplin = TOPLINE_EMPTY;
 * i.e. `display_nhwindow(WIN_MESSAGE, FALSE)` is an UNCONDITIONAL page-ack of
 * whatever is standing on the topline, regardless of width.  This port never
 * needed to model it before because it pages the accumulated movemon topline
 * only where the width reserve says so — but a C caller that flushes the
 * message window mid-window forces a break the width rule cannot predict.
 *
 * MEASURED on seed0383 step 141: gulpmu (mhitu.c:1370) flushes right after
 * "The ice vortex engulfs you!", so C pages that message ALONE and starts the
 * next turn's "You are freezing to death!" on a fresh topline.  The two
 * together are 55 columns — well inside the 71-column reserve — so this port
 * joined them and every page boundary after that point was one message out.
 *
 * The break is registered by MESSAGE TEXT rather than by offset so it survives
 * the re-basing _topl_split_for_more / flush_screen do on every page: the
 * offsets move, the text does not.  A message that C flushes twice in one
 * window is force-broken twice, which is exactly what two display_nhwindow
 * calls do.  Cleared with the topline itself at the next nhgetch. */
export function topl_force_break_after(msg) {
    const t = String(msg ?? '');
    if (!t) return;
    /* C's more() freezes the PHYSICAL screen as it stood when the page was
     * raised.  For a width-overflow page that is what
     * _maybe_snapshot_painted_screen already records; a FORCED page has no
     * overflow to hang a snapshot on, so capture the frame here, at the
     * instant the C caller flushed the message window.  Load-bearing for
     * gulpmu: its display_nhwindow(WIN_MESSAGE) runs BEFORE swallowed(1)'s
     * cls(), so C's "The <foo> engulfs you!--More--" frame still carries the
     * whole level, and without this the page rendered the post-cls cage —
     * 456 cells C paints and this port left blank on seed0383 step 141. */
    (game._topl_force_breaks ||= []).push({
        text: t,
        /* Registrations are made for the message that is currently last on
         * the topline.  Match that occurrence from the END so repeated combat
         * text ("It bites!", etc.) cannot force a page at its first copy. */
        fromEnd: 0,
        frame: { cells: _capture_painted_cells(), moves: _painted_moves(),
                 botl: _capture_botl() },
    });
}
/* The usual caller shape: "C flushed the message window right here", i.e. after
 * whatever pline it just emitted.  The topline accumulator holds the WHOLE
 * window's text by then, so the break belongs after its LAST segment — the
 * boundary _topl_joins records. */
export function topl_force_break_now() {
    const g = game;
    const line = String(g?._pending_message || '');
    if (!line) return;
    if (process.env.FF_MLTRACE === '1')
        pushRngLogEntry(`^topl_force_break[line=${encodeURIComponent(line.slice(-96))}]`);
    const joins = (g._topl_joins_src === line && Array.isArray(g._topl_joins))
        ? g._topl_joins : null;
    const start = (joins && joins.length) ? joins[joins.length - 1] + 2 : 0;
    topl_force_break_after(line.slice(start));
}
function _topl_force_break_here(seg, laterSegments = []) {
    const fb = game?._topl_force_breaks;
    if (!fb || !fb.length) return false;
    const sameLater = laterSegments.reduce(
        (n, later) => n + (later === seg ? 1 : 0), 0);
    return fb.some((e) => e.text === seg
        && ((e.fromEnd ?? 0) | 0) === sameLater);
}
/* The registration that produced a given committed page.  A break registered
 * after the line's LAST segment (the TRAILING-BREAK arm of
 * _topl_split_for_more) commits the WHOLE accumulated line, not just that
 * segment, so an equality-only lookup missed it — and with it the frozen frame
 * C's more() shows.  Matching on the committed text's tail covers both. */
function _topl_force_break_entry(committed) {
    const fb = game?._topl_force_breaks;
    if (!fb || !fb.length || !committed) return -1;
    let k = fb.findIndex((e) => e.text === committed);
    if (k < 0)
        k = fb.findIndex((e) => e.text && committed.endsWith('  ' + e.text));
    return k;
}
function _topl_split_for_more(line, joins) {
    if (joins === undefined) joins = _topl_joins_for(line);
    if (!joins || joins.length === 0) {
        /* C ref: win/tty/topl.c redotoplin:139 —
         *     ttyDisplay->toplin = TOPLINE_NEED_MORE;
         *     if (ttyDisplay->cury && otoplin != TOPLINE_SPECIAL_PROMPT)
         *         more();
         * A topline that WRAPPED onto a second row (update_topl:284-297 splits
         * it at the last space before CO) pages IMMEDIATELY — no second message
         * is needed, and there is no join to split at.  This arm was missing, so
         * an over-long single pline was rendered clipped at one row and its
         * page-ack keystroke leaked to rhack: seed0002 step 345, C
         *   row0 "You have a little trouble lifting y - a polished silver shield (unpaid, 50"
         *   row1 "zorkmids).--More--"
         * against a JS row0 clipped at 79 columns with no --More-- at all.
         * Committing the whole line with an empty remainder is what C does: the
         * message is fully shown, the more() is raised over it, and nothing is
         * left to page afterwards. */
        /* C ref: win/tty/topl.c redotoplin:139 — the more() above is
         *     if (ttyDisplay->cury && otoplin != TOPLINE_SPECIAL_PROMPT)
         * and hooked_tty_getlin() sets ttyDisplay->toplin =
         * TOPLINE_SPECIAL_PROMPT for the whole of its read loop
         * (win/tty/getline.c:56).  A getlin echo that runs off the end of the
         * row therefore does NOT page: it hard-wraps onto the next physical row
         * (topl_putsym's `if (curx == CO - 1) topl_putsym('\n')`) and keeps
         * taking keystrokes.  seed0030 segment 9 types 80 characters into the
         * '#' prompt; C spills three columns onto row 1 and carries on, while
         * this port raised a --More-- and ate the next keystroke to dismiss it.
         * `_topl_prompt_echo` is that TOPLINE_SPECIAL_PROMPT state. */
        if (line && !game?._topl_prompt_echo
            && _topl_wordwrap(line, TOPL_CO - 1).length > 1)
            return [line, '', []];
        /* A display_nhwindow(WIN_MESSAGE) registered after this whole line —
         * see the TRAILING-BREAK note in the joined arm below. */
        if (line && _topl_force_break_here(line, []))
            return [line, '', []];
        return null;            /* single atomic pline that fits: never split */
    }
    // Walk the pline segments separated at the recorded join offsets, applying
    // the per-pline reserve check.  `cum` is the committed-topline length so far
    // (columns already occupied by committed plines + their "  " separators).
    const segments = [];
    for (let i = 0; i <= joins.length; i++) {
        const start = i ? joins[i - 1] + 2 : 0;
        const end = i < joins.length ? joins[i] : line.length;
        segments.push(line.slice(start, end));
    }
    let cum = joins[0];         /* length of the first pline */
    for (let i = 0; i < joins.length; i++) {
        // The pline that starts after join i (its "  " is at offset joins[i]).
        const segStart = joins[i] + 2;
        const segEnd = (i + 1 < joins.length) ? joins[i + 1] : line.length;
        const nextLen = segEnd - segStart;
        /* C ref: win/tty/topl.c:264 — the join test's LAST conjunct is
         *     && (notdied = strncmp(bp, "You die", 7)) != 0
         * ("But messages like 'You die...' deserve their own line"), so a
         * message starting "You die" NEVER joins, however much room is left.
         * _topl_joins_committed already carries this rule for the cross-turn
         * callers that apply the gate by hand; the shared split point did not,
         * so a "You die" that fitted was silently joined.  seed5006 step 183:
         * C pages "You irradiate yourself with pure energy!--More--" and only
         * then shows "You die." -- 49 columns together, well inside the
         * 71-column reserve. */
        const diesHere = line.startsWith('You die', segStart);
        /* A display_nhwindow(WIN_MESSAGE) after the segment that ends here —
         * see topl_force_break_after() above. */
        const forcedHere = _topl_force_break_here(
            segments[i], segments.slice(i + 1));
        if (diesHere || forcedHere || cum + 2 + nextLen >= TOPL_LIMIT) {
            // Appending this pline would meet or exceed the reserve → commit here & more().
            // C ref: win/tty/topl.c update_topl fires more() when total reaches CO-1-8=71
            // (i.e., when combined_length >= TOPL_LIMIT, not > TOPL_LIMIT).
            // Seed2500 evidence: "The sewer rat misses!  It hits the sewer rat.  It misses
            // the sewer rat." = exactly 71 chars; C fires more() at this length.
            const committed = line.slice(0, cum);
            const remainder = line.slice(segStart);
            // Re-base the remaining join offsets to the new (remainder) string.
            const remJoins = [];
            for (let j = i + 1; j < joins.length; j++)
                remJoins.push(joins[j] - segStart);
            return [committed, remainder, remJoins];
        }
        cum += 2 + nextLen;
    }
    /* TRAILING BREAK.  A forced break registered after the LAST segment had no
     * join to be found at, so it fell out of the loop above and raised no page
     * at all.  C's display_nhwindow(WIN_MESSAGE, FALSE) is
     *     if (ttyDisplay->toplin == TOPLINE_NEED_MORE) { more(); ... }
     * (win/tty/wintty.c) — it pages whatever is un-acknowledged whether or not
     * another message follows, so a break at the end of the line is a --More--
     * over the whole line with nothing left over.  Without this arm the break
     * only ever split a line that happened to have more text after it:
     * MEASURED on seed0383, gulpmu's display_nhwindow paged correctly at step
     * 141 (three further messages followed) and silently did nothing at step
     * 173, where "You hit the black pudding.  The bat engulfs you!" was the
     * whole line — so C's --More-- frame, which freezes the map BEFORE
     * swallowed(1) repaints it as the stomach, was never emitted. */
    const _lastSeg = line.slice(joins[joins.length - 1] + 2);
    if (_lastSeg && _topl_force_break_here(_lastSeg, []))
        return [line, '', []];
    return null;                /* every joined pline fits → no more() */
}

// C ref: win/tty/topl.c update_topl:257-268 — the JOIN-vs-more() gate a fresh
// pline faces when the topline already holds an un-acknowledged message:
//     if ((ttyDisplay->toplin == TOPLINE_NEED_MORE || skip) && cw->cury == 0
//         && n0 + (int) strlen(gt.toplines) + 3 < CO - 8
//         && (notdied = strncmp(bp, "You die", 7)) != 0) {
//         Strcat(gt.toplines, "  "); Strcat(gt.toplines, bp); ... return;
//     } else if (!skip) { if (toplin == TOPLINE_NEED_MORE) more(); ... }
// so the more() is reached ONLY when the join test fails.  CO is 80, making the
// test `committed + 2 + next < 71` — the same CO-1-8 reserve TOPL_LIMIT holds
// for _topl_split_for_more.  Exported for the cross-turn paging callers (the
// multi-turn occupation driver), which raise more() themselves rather than
// letting a single accumulated _pending_message split at flush time, and so have
// to apply this gate explicitly.  DISPLAY-ONLY: no RNG, no state.
export function _topl_joins_committed(committed, next) {
    const c = (committed == null) ? '' : String(committed);
    const n = (next == null) ? '' : String(next);
    if (!c) return true;                       /* nothing committed → nothing to page */
    if (n.startsWith('You die'))               /* C's notdied guard: its own line */
        return false;
    return c.length + 2 + n.length < TOPL_LIMIT;
}

// The sequence of --More-- pages an accumulated topline splits into, applying
// C's per-pline update_topl reserve at each recorded join.  The LAST element is
// the remainder (the text still standing on the topline once the earlier pages
// have been acknowledged); a line that never overflows returns just [line].
//
// C ref: win/tty/topl.c update_topl raises more() once per join whose append
// would breach the CO-1-8 reserve, so a topline carrying three genuine plines
// can owe TWO page-acks before the caller's own display_nhwindow(WIN_MESSAGE,
// FALSE) pages the third.  A caller that force_more()s the whole accumulated
// string instead shows one over-wide page and swallows the other keystrokes:
// seed4500 step 1061 rendered "You remember this level as starting level.  You
// try to feel what is lying here" (91 columns, clipped, no --More--) where C
// pages the annotation, then the feel line, then opens the pile window.
// DISPLAY-ONLY: reads only, no RNG, no state mutation.
export function _topl_more_pages(line, joins) {
    const out = [];
    let cur = String(line ?? '');
    let j = joins;
    for (let guard = 0; guard < 4096; guard++) {
        const split = _topl_split_for_more(cur, j);
        if (!split) break;
        out.push(split[0]);
        cur = split[1];
        j = split[2];
    }
    out.push(cur);
    return out;
}

// Will the currently-accumulated topline overflow and trigger a more() at the
// next flush_screen?  Used by callers (e.g. the pet-kill path in dogmove) that
// must defer a display change until after the pending --More-- is dismissed,
// mirroring C's tty behaviour where newsym updates the buffer but the terminal
// is not redrawn until more() releases.  C ref: win/tty/topl.c update_topl.
export function _topline_more_pending() {
    return _topl_split_for_more(game?._pending_message || '') !== null;
}

// ── Generic post-more() deferred-effect queue ────────────────────────────────
// C's pline() -> update_topl() calls more() when the accumulated topline will
// not fit, and more() BLOCKS: the statements that follow the pline in the C
// caller do not run until the player dismisses the --More--.  This port's
// pline() never blocks (it appends to _pending_message and the --More-- is
// paged later, at the input boundary — see flush_screen), so a C body shaped
//     pline(...); <effect>;
// would apply <effect> at a moment when C is still parked inside more() with
// the effect NOT yet applied.  Callers that care therefore ask
// _topline_more_pending() and, when it is true, queue <effect> HERE instead of
// running it; flush_screen drains the queue once the whole pending --More--
// chain has been paged, which is exactly the instant C's more() returns and
// the C caller resumes.
//
// This generalizes the newsym-specific _deferred_newsym queue (drained a few
// lines below the same point) that js/dogmove.js:2923 already uses for the
// pet-kill glyph clear.  DISPLAY/STATE ONLY: every effect queued here must be
// RNG-free, because the queue moves it in TIME relative to the rest of the
// command; a caller that draws rn2/rnd from a deferred effect would reorder the
// RNG stream, which is never correct (Cardinal Rule 2).
//
// When the recorded session ENDS with the --More-- still undismissed (the
// player never presses a dismiss key), the queue is never drained — and that is
// C-faithful: C is still parked in more() there and never runs the effect
// either (seed1900-wizard-quaff-zap steps 9-11 are exactly this case).
export function _defer_until_more_dismissed(fn) {
    (game._deferred_post_more ||= []).push(fn);
    if (process.env.FF_MATTACK_TRACE === '1')
        pushRngLogEntry(`^topl_more_queue[count=${game._deferred_post_more.length|0}]`);
}

// C ref: win/tty/topl.c more() — display "<topline>--More--", wait for a dismiss
// key, consuming (but ignoring) any non-dismiss keys.  No RNG is consumed.
async function _topl_more(committed, dismissMore) {
    routeTag('_topl_more', committed); /* telemetry only; inert when env unset */
    /* C win/tty/wintty.c ttyDisplay->dismiss_more — an EXTRA key that
     * xwaitforspace() accepts as a dismissal (getline.c:238 `c == x`).
     * tty_message_menu() sets it to the fake one-line menu's accelerator, so
     * that key both dismisses the --More-- and answers the menu. */
    const _dismissMore = dismissMore | 0;
    const display = game?.nhDisplay;
    // C ref: allmain.c:252-295 — if these --More-- pages are the deferred per-turn
    // movemon messages (tagged by moveloop_core as _movemonMsgTurn), C still shows
    // T:_movemonMsgTurn because svm.moves++ for the new turn has not happened yet
    // (it follows movemon).  Mark the paging window so _statusLine2() renders the
    // movemon turn for these pages; fresh-screen (non-paging) renders keep using
    // the head-ahead game.moves.  DISPLAY-ONLY: no RNG.
    const _wasInMovemonMore = game._inMovemonMore;
    if (game._movemonMsgTurn != null || game._paintedSnapshot) {
        game._inMovemonMore = true;
    }
    // C ref: win/tty/topl.c topl_putsym/more() — first word-wrap the committed
    // text itself across as many rows as it needs at CO-1 (79) visual columns
    // (_topl_wordwrap; a committed message that already fits on one row comes
    // back as a single-element array, so this subsumes the old single-row
    // case), THEN append "--More--" (8 cols) to the last row if it fits within
    // CO-1, otherwise give it its own row.  threshold: lastRow + 8 <= 79.
    const _wrapped = _topl_wordwrap(committed, TOPL_CO - 1);
    const _lastFits = (_topl_visualLen(_wrapped[_wrapped.length - 1]) + TOPL_MORE.length)
        <= (TOPL_CO - 1);
    const _msgRows = _wrapped.slice();
    if (_lastFits)
        _msgRows[_msgRows.length - 1] += TOPL_MORE;
    else
        _msgRows.push(TOPL_MORE);
    const _moreRow = _msgRows.length - 1;
    const _moreCol = _topl_visualLen(_msgRows[_moreRow]);
    const _renderMore = () => {
        if (_msgRows.length === 1) {
            game._pending_message = _msgRows[0];
            _buildScreenOutput();
        } else {
            // Wrapped across >=2 rows: game._pending_message keeps the ORIGINAL
            // (unwrapped) committed text — nhgetch's message-history capture
            // (js/input.js) reads it as the semantic message text, independent
            // of physical row layout — while the actual screen rendering uses
            // the laid-out per-row strings directly.  Mirrors pline_with_more's
            // wrapped layout so the recorded wrapped --More-- frame matches.
            game._pending_message = committed;
            _buildScreenOutputWithMoreRows(_msgRows);
        }
        if (display)
            display.setCursor(_moreCol, _moreRow);
    };
    _renderMore();
    /* C ref: win/tty/getline.c:230-257 xwaitforspace("\033 ") — the key that
     * dismissed the page is `morc`, and it is the RESULT of more(): topl.c more()
     * reads it back for `if (morc == '\033') cw->flags |= WIN_STOP`.  '\n'/'\r'
     * break BEFORE the cbreak arm and leave morc == 0 (getline.c:240); ESC and
     * space each set morc to themselves.  This loop used to `break` and return
     * undefined, which made morc unreadable at every caller. */
    let morc = 0;
    if (process.env.FF_MLTRACE === '1')
        pushRngLogEntry(`^topl_more_enter[committed=${encodeURIComponent(String(committed).slice(0,80))} stop=${game._topl_win_stop?1:0} armed=${game._topl_win_stop_armed?1:0} urgent=${game._topl_urgent_next?1:0} pending=${encodeURIComponent(String(game._pending_message || '').slice(0,80))}]`);
    while (true) {
        const key = await nhgetch(); /* preNhgetchHook captures the --More-- screen */
        if (process.env.FF_MLTRACE === '1')
            pushRngLogEntry(`^topl_more_key[key=${key == null ? 'null' : (key | 0)} stop=${game._topl_win_stop?1:0} armed=${game._topl_win_stop_armed?1:0} urgent=${game._topl_urgent_next?1:0} pending=${encodeURIComponent(String(game._pending_message || '').slice(0,80))}]`);
        if (key === 10 /* \n */ || key === 13 /* \r */) {
            morc = 0;                      /* getline.c:240-241 — break, morc stays 0 */
            break;
        }
        if (key === 27 /* ESC */ || key === 32 /* space */) {
            morc = key;                    /* getline.c:247 / :251 */
            break;
        }
        if (_dismissMore && key === _dismissMore) {
            morc = key;                    /* getline.c:238 — `c == x` */
            break;
        }
        /* Non-dismiss key: re-show the same --More-- (C rings the bell & re-loops).
         * nhgetch cleared _pending_message; restore the committed+More line so the
         * next capture is identical. */
        _renderMore();
    }
    // Restore the paging-window marker.  (Nested more() calls restore to their
    // caller's state; the outermost restores to false.)
    game._inMovemonMore = _wasInMovemonMore || false;
    /* C ref: win/tty/topl.c more():232-235 —
     *     if (morc == '\033') { if (!(cw->flags & WIN_NOSTOP)) cw->flags |= WIN_STOP; }
     * ESC at a --More-- SUPPRESSES every message that follows until the next
     * input request: update_topl (topl.c:257,268,300) computes
     * `skip = (cw->flags & (WIN_STOP|WIN_NOSTOP)) == WIN_STOP` and, when skip is
     * set, updates gt.toplines but calls neither addtopl() nor redotoplin(), so
     * nothing reaches the screen.  The window ends at the next tty_nhgetch,
     * which clears the bit (wintty.c:4065-4066) — see js/input.js.
     *
     * WIN_NOSTOP is the ATR_URGENT one-shot (wintty.c:2277-2283); no message in
     * this port is marked urgent, so there is no NOSTOP guard to model. */
    if (morc === 27)
        game._topl_win_stop_armed = true;
    return morc;
}

// C tty display_nhwindow: acknowledge all pending message pages in order.
export async function force_more_pages(full, retainFinalFrame = true) {
    const pages = _topl_more_pages(full, _topl_joins_snapshot(full));
    const frames = game._plineFlushFrames?.slice() || [];
    let consumed = 0;
    for (let i = 0; i < pages.length; ++i) {
        const page = pages[i];
        const end = consumed + page.length;
        // Explicit WIN_MESSAGE flushes retain their own physical frame,
        // including an engulf page emitted before swallowed(1) cleared it.
        const forcedIndex = _topl_force_break_entry(page);
        let frame = forcedIndex >= 0
            ? game._topl_force_breaks[forcedIndex].frame
            : _pline_flush_frame_select(end, full, frames);
        if (!retainFinalFrame && i === pages.length - 1) frame = null;
        if (!frame && retainFinalFrame && i === pages.length - 1) {
            // No following pline forces the last page; display_nhwindow
            // retains the physical screen flushed by its last message.
            for (let j = frames.length - 1; j >= 0; --j) {
                const f = frames[j];
                if (f.off >= consumed - 2 && full.slice(f.off + 2) === f.msg) {
                    // The final message has no later pline forcing its page.
                    // Retain its map, but use the current physical status: an
                    // explicit bot() (for example newuhs after fainting) may
                    // have repainted that window since this pline flush.
                    frame = { ...f, botl: game._lastPaintedBotl || f.botl };
                    break;
                }
            }
        }
        if (typeof process !== 'undefined' && process.env?.FF_PAGE_TRACE === '1') {
            pushRngLogEntry(`^force_pages_select[i=${i} consumed=${consumed} end=${end}`
                + ` page=${encodeURIComponent(String(page).slice(0,72))}`
                + ` forced=${forcedIndex} frame=${frame ? 1 : 0} off=${frame?.off ?? -1}`
                + ` fhp=${frame?.botl?.uhp ?? -1} livehp=${game.u?.uhp ?? -1}`
                + ` savedhp=${game._paintedSnapshot?.botl?.uhp ?? -1}]`);
        }
        const saved = game._paintedSnapshot;
        const savedTurn = game._movemonMsgTurn;
        const savedInMore = game._inMovemonMore;
        // A prompt entered after the world turn uses the current screen for
        // its final outstanding message; earlier overflow pages retain their
        // original pline flushes.
        if (!retainFinalFrame && i === pages.length - 1) {
            game._paintedSnapshot = null;
            game._movemonMsgTurn = null;
            game._inMovemonMore = false;
        }
        if (frame) game._paintedSnapshot = {
            cells: frame.cells, moves: frame.moves, botl: frame.botl || null,
        };
        try {
            if (page) await force_more(page);
        } finally {
            game._paintedSnapshot = saved;
            game._movemonMsgTurn = savedTurn;
            game._inMovemonMore = savedInMore;
        }
        const consumedBreak = _topl_force_break_entry(page);
        if (consumedBreak >= 0) game._topl_force_breaks.splice(consumedBreak, 1);
        consumed = end + 2;
    }
}

// C ref: win/tty/topl.c update_topl/more() — the general FORCED (non-width) more()
// over the LIVE frame.  When code emits a sequence of plines that must each be
// acknowledged separately (no width overflow, no painted-snapshot to freeze), the
// caller commits the already-shown message, raises `<committed>--More--`, and
// consumes one recorded dismiss key via nhgetch.  This is the page-ack a fresh pline
// triggers on an already-painted-but-unacked topline when the hero is stationary
// (the live map is correct — no frozen snapshot needed, unlike the movemon/occupation
// paths).  Used by the wizard #levelchange pluslvl loop (exper.c:319-385): each
// pluslvl() emits "You feel more experienced.  Welcome to experience level N." and the
// NEXT iteration's "You feel more experienced." pline pages the prior, one --More--
// and one recorded key per level.  DISPLAY-channel only: renders the --More-- frame
// and consumes the dismiss key, NO RNG.  Returns after the page is acked; the topline
// is left cleared (nhgetch cleared _pending_message), matching C's post-more() state.
// Returns `morc` — the key that dismissed the page (27 for ESC, 32 for space, 0
// for CR/LF), so callers can implement topl.c more()'s `if (morc == '\033')
// cw->flags |= WIN_STOP`.  It used to return undefined, which made ESC
// indistinguishable from space at every call site.
export async function force_more(committed, dismissMore) {
    const g = game;
    if (!g) return 0;
    if (typeof process !== 'undefined' && process.env?.FF_PAGE_TRACE === '1'
        && String(committed || '').includes('crackles with electricity')) {
        pushRngLogEntry(`^force_more_stack[${encodeURIComponent(String(new Error().stack || '').split('\n').slice(1, 7).join(' <- '))}]`);
    }
    /* C ref: win/tty/topl.c more():230-246 + update_topl:257/:268/:300, and
     * win/tty/wintty.c:1873-1879 (tty_display_nhwindow's NHW_MESSAGE arm, which
     * src/display.c cls() reaches through display_nhwindow(WIN_MESSAGE, FALSE)).
     *
     * ESC AT A --More-- ABORTS THE REST OF THE MESSAGE SEQUENCE.  more() reads
     * its key through xwaitforspace("\033 ") (getline.c:230-257) and on ESC sets
     * `morc = '\033'`; back in more(), topl.c:232-235 does
     *     if (morc == '\033') { if (!(cw->flags & WIN_NOSTOP)) cw->flags |= WIN_STOP; }
     * and topl.c:241-245 additionally does `home(); cl_end()` so the topline is
     * WIPED.  With WIN_STOP set, update_topl's
     *     boolean skip = (cw->flags & (WIN_STOP|WIN_NOSTOP)) == WIN_STOP;
     * is TRUE for every following message: gt.toplines still receives the text,
     * but addtopl() (:268) and redotoplin() (:300) are both guarded by `!skip`,
     * so NOTHING is painted and ttyDisplay->toplin is left TOPLINE_EMPTY.  Every
     * --More-- raiser in the tty layer is gated on `toplin == TOPLINE_NEED_MORE`
     * (update_topl:274, tty_display_nhwindow:1873), so with nothing painted no
     * page is raised either.  The window ends at the next tty_nhgetch, which
     * clears the bit (wintty.c:4065-4066) — see js/input.js.
     *
     * force_more() is this port's spelling of "write a message to the topline
     * and page it", so it has to be gated on WIN_STOP at BOTH ends, and it was
     * gated at neither: it assigned _pending_message unconditionally and then
     * always consumed a dismiss key.
     *
     * WHY THE ARMED BIT IS TREATED AS LIVE HERE, WHERE pline() DEFERS IT.
     * pline()'s deferral is right for the shape IT models: there the ESC was
     * consumed inside the arriving message's OWN update_topl (`else if (!skip)
     * { if (toplin == NEED_MORE) more(); }`), so `skip` had already been sampled
     * FALSE for that message and :300 still draws it.  A force_more() site is
     * the OTHER shape — the page it is about to raise is the page the FOLLOWER
     * would raise — and on the paths that reach it the ESC was consumed by a
     * page raised BEFORE this message's update_topl.  C ARBITRATES, from its own
     * `^getch` channel (patch 009) on corpus-generated/v5/train-getch:
     *
     *   gen047-reseed-seed1773779, read_engr_at on the goto_level arrival:
     *     frames 19-23  "Something is engraved here on the floor.--More--" held
     *                   across h,h,b,J (xwaitforspace rings the bell and loops)
     *     frame 23      key ESC -> ^getch[n=23 ctx=more toplin=2 ch=27]
     *     frame 24      topline EMPTY, cursor back on the hero at [11,7,1],
     *                   ^getch[n=24 ctx=cmd toplin=0 stop=1 ch=106]
     *
     *   Both fields are sampled BEFORE the read (patch 009 says so in its own
     *   comment): `stop=1` is WIN_STOP live, and `toplin=0` is TOPLINE_EMPTY, so
     *   C neither PAINTED the "You read: ..." reveal nor paged it.  A painted
     *   line would read toplin=1, and the cls() whose ^botlx markers sit in that
     *   same step bucket would then have raised a second page — which is exactly
     *   what it does on the space path.  This port painted the reveal, raised
     *   "You read: \"...\".--More--", and ATE the next command key.
     *
     * THE COUNTER-CASE IS PUBLIC seed0009 AND IT IS UNTOUCHED.  At its MID-WALK
     * occurrence (frame 23 -> 24) the same ESC dismisses the same engraving page
     * and C DOES draw the reveal, unpaged: control-seed0009 reads
     * ^getch[n=23 ctx=more ch=27] then ^getch[n=24 ctx=cmd toplin=1 stop=1].
     * That path reaches pline(), not force_more() (js/cmd.js _pline_paged with
     * redrawPending=false takes its `last` branch), so pline()'s deferral still
     * runs.  Measured: seed0009 73/73 before and after; public 11,391/11,405 and
     * 43 of 44 with ZERO per-session differences.
     *
     * pline() already implements C's `skip` arm exactly — the gt.toplines
     * join/replace bookkeeping, the "You die" escape at topl.c:298-299, and the
     * history push — so route through it rather than restating the rule. */
    if (g._topl_win_stop || g._topl_win_stop_armed) {
        routeTag('force_more', committed); /* telemetry only; inert when env unset */
        g._topl_win_stop_armed = false;
        g._topl_win_stop = true;
        await pline(String(committed ?? ''));
        return 0;                          /* no page raised, so no morc */
    }
    routeTag('force_more', committed); /* telemetry only; inert when env unset */
    g._pending_message = String(committed ?? '');
    return await _topl_more(g._pending_message, dismissMore);
}

// C ref: win/tty/getline.c:230-257 xwaitforspace(" ") — the key loop inside
// more().  ONLY '\n', '\r', ESC, and the chars in `s` (more() passes " ") break
// the loop; every other key falls through to tty_nhbell() and the loop reads
// again with the "--More--" still on the screen.  So a non-dismiss key at a
// --More-- is CONSUMED but does NOT page the message.
//
// _topl_more() already implements this, but several call sites compose their own
// "<msg>--More--" topline (because they render it onto a still-occupied prompt
// line via flush_screen) and then did a BARE `await nhgetch()`, which dismisses
// on any key.  Measured 2026-08-16 on seed1800-tourist-eat-throw: at the apply
// getobj, C holds the "You don't have that object.--More--" through the keys
// `i`, `+`, `\`, `^X` and only pages on ESC/space; the port paged on every one
// of them and lost 9 of its 10 remaining frames.
//
// `rerender` re-draws the same --More-- frame (nhgetch clears _pending_message,
// so the caller must restore it).  Returns the accepted key code.
// `toplMore` selects which window the ESC belongs to.  Pass TRUE at a site that
// hand-renders "<msg>--More--" on row 0, i.e. one that models topl.c more(): its
// ESC additionally arms topl.c:232-235 `cw->flags |= WIN_STOP` on WIN_MESSAGE.
// Leave it FALSE at a site that pages a TEXT/MENU window, because wintty.c
// process_text_window turns ESC into WIN_CANCELLED on THAT window instead
// (wintty.c:1782-1785) and leaves the message window's flags alone.
export async function await_more_dismiss(rerender, toplMore) {
    for (;;) {
        const raw = await nhgetch();
        const c = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        if (c === 32 /* space */ || c === 10 /* \n */ ||
            c === 13 /* \r */ || c === 27 /* ESC */) {
            if (c === 27 && toplMore)
                game._topl_win_stop_armed = true;   /* topl.c more():232-235 */
            return c;
        }
        if (rerender) await rerender();
    }
}

// The topline-more() spelling of await_more_dismiss (see `toplMore` above).
export async function await_topl_more_dismiss(rerender) {
    return await await_more_dismiss(rerender, true);
}

/* C ref: win/tty/wintty.c:287-292 default_menu_cmds[] — MENU_FIRST_PAGE '^',
 * MENU_LAST_PAGE '|', MENU_NEXT_PAGE '>', MENU_PREVIOUS_PAGE '<',
 * MENU_SELECT_ALL '.', MENU_UNSELECT_ALL '-', MENU_INVERT_ALL '@',
 * MENU_SELECT_PAGE ',', MENU_UNSELECT_PAGE '\\', MENU_INVERT_PAGE '~',
 * MENU_SEARCH ':' (include/wintype.h:151-163).  Every one of these is in the tty
 * menu's `resp`, so every one of them is CONSUMED at a menu without closing it. */
export const DEFAULT_MENU_CMDS = '^|><.-@,\\~:';

/* C ref: win/tty/wintty.c process_menu_window (:1336-1765) driving
 * getline.c:230-257 xwaitforspace(resp) — the tty menu's blocking read, as the
 * accept-set predicate a JS menu site needs.
 *
 * A tty menu is NOT "read one key and close".  There are two filters in series
 * and a key must clear BOTH to end the menu:
 *
 *   1. xwaitforspace(resp) (:1547 dmore -> :1170).  It breaks on LF/CR
 *      unconditionally, on ESC in cbreak, and on any char in `resp`; EVERY other
 *      key rings tty_nhbell() and reads again with the same page still up.
 *      `resp` = <selectors of the rows this page added> + <group accelerators>
 *      + " " + "0123456789\033\n\r" + gm.mapped_menu_cmds + default_menu_cmds
 *      (:1416-1431, :1526-1531).
 *   2. the switch at :1563-1755.  Of the keys that got past xwaitforspace, only
 *      ESC (:1663 cancel), CR/LF/NUL (:1676 commit), ' ' on the LAST page
 *      (:1621-1630) and — for PICK_ONE only — an explicit selector or group
 *      accelerator (:1735-1755, `if (cw->how == PICK_ONE) finished = TRUE`)
 *      set `finished`.  Digits accumulate a count, the page commands move or
 *      toggle, PICK_ANY selectors toggle, and a PICK_NONE menu bells at
 *      EVERYTHING (:1738 `if (cw->how == PICK_NONE || !strchr(resp, morc))`).
 *
 * So the rule this helper implements, and it is the whole class:
 *   a key closes the menu iff it is CR, LF, ESC, space,
 *   or (how === PICK_ONE and it is in `selectors` or `gacc`).
 * Everything else is consumed and the read runs again.
 *
 * `selectors` is the selector column of the rows THIS menu actually added, and
 * `gacc` its group accelerators (wintty.c:1352-1379, which drops a gselector
 * equal to its own selector and, for PICK_ONE, any gselector shared by more
 * than one row).  Narrowing these to the rows really added is half the fix: a
 * site that accepts all of a-zA-Z eats keys C bells at.
 *
 * `rerender` re-paints the unchanged page before each re-read.  It is NOT
 * optional: nhgetch() clears _pending_message and the caller owns
 * `_screen_output`, so a re-read without it renders a blank frame where C
 * renders the same menu it was already showing.
 *
 * Returns the key code that closed the menu: 27 ESC, 32 space, 13/10 CR/LF, or
 * the selector/accelerator char code for a PICK_ONE pick.
 *
 * `search`, when supplied, is the MENU_SEARCH ':' case (wintty.c:1700-1730):
 * an async thunk that runs tty_getlin("Search for:") over the caller's own
 * frame and toggles every pmatchi() hit, returning TRUE when a PICK_ONE menu
 * should now finish.  js/com_pager.js menu_search_case() is that thunk's body;
 * the caller supplies it because only the caller knows its mlist and its row
 * state.  WITHOUT it ':' is merely consumed — which is a wrong FRAME *and*, at
 * a PICK_ANY menu, a wrong KEYSTROKE COUNT, because C spends the following
 * keys inside the getlin and this port spends them in the menu's own read.
 * gen513-recombine-seed428318 steps 242-247 are that case: C searches with
 * ".?", commits it with the step-246 CR and takes the step-247 space as the
 * menu's own commit; without the getlin this port committed the menu on the
 * step-246 CR and let the space leak to rhack.
 *
 * C does NOT repaint the page after the search returns (process_menu_window
 * only redraws when page_start is reset), and getline.c:213's
 * clear_nhwindow(WIN_MESSAGE) has blanked screen row 0 — the window's own
 * title text with it.  So a caller that supplies `search` must ALSO keep its
 * row 0 blank in `rerender` from then on; shk.js's `titleErased` is the
 * pattern.
 *
 * NOT MODELLED, and a wrong FRAME rather than a wrong keystroke count (the key
 * is consumed and the menu stays up either way):
 *   - a PICK_ANY toggle repaints that row's third column via set_item_state
 *     (:1176-1192): '+' selected, '#' selected-with-a-count, '-' unselected.
 *     Callers that model their own row state pass `onToggle`.
 *
 * This is deliberately NOT the same thing as js/cmd.js tty_menu_pick_any(),
 * which is a whole tty menu DRIVER (it owns mlist, pagination and the page
 * repaint) for the full-screen menus this port builds itself.  This helper is
 * for the many sites that hand-render their own window and only need the tty's
 * key loop; it owns no window state, which is why the caller supplies both the
 * accept set and the repaint.
 *   - gm.mapped_menu_cmds is the menu_* option remapping; no session in the
 *     corpus sets one, so the default set above is the whole of it.
 */
export async function await_menu_key(rerender, selectors, gacc, how, onToggle, search) {
    const sel = String(selectors ?? '');
    const grp = String(gacc ?? '');
    const resp = sel + grp + ' ' + '0123456789\x1b\n\r' + DEFAULT_MENU_CMDS;
    for (;;) {
        const raw = await nhgetch();
        const c = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        /* getline.c:236-237 — LF/CR break before the cbreak block, so they end
         * the read whether or not they are in `resp`. */
        if (c === 10 || c === 13 || c === 27 /* ESC */ || c === 32 /* space */)
            return c;
        /* C wintty.c:1700-1730 MENU_SEARCH — checked BEFORE the PICK_ONE
         * selector test below because ':' is a menu command, never a selector
         * (it is in default_menu_cmds, wintype.h:163).  PICK_NONE bells and
         * never opens the getlin, which is why `search` is only ever passed by
         * PICK_ONE/PICK_ANY sites. */
        if (c === 0x3a /* ':' */ && search) {
            const finished = await search();
            if (finished) return c;   /* C: `if (cw->how == PICK_ONE) finished = TRUE` */
            if (rerender) await rerender();
            continue;
        }
        const ch = String.fromCharCode(c);
        if (how === PICK_ONE && (sel.includes(ch) || grp.includes(ch)))
            return c;
        /* consumed, page unchanged (or a toggle the caller models itself) */
        if (onToggle && how === PICK_ANY && resp.includes(ch))
            await onToggle(ch);
        if (rerender) await rerender();
    }
}

// C ref: win/tty/topl.c update_topl/more() — the FORCED (non-width) more().  When a
// new pline arrives in a NEW turn while the topline already holds a message that was
// already PAINTED (shown to the player at a prior per-turn flush) but not yet
// acknowledged by an nhgetch, the tty calls more() to flush the shown line before
// overwriting it — REGARDLESS of width.  This is the cross-turn paging the multi-turn
// occupation needs: each eating turn's lesshungry/done_eating pline is a new turn, so
// it more()s the prior turn's committed topline (the begin message, then each
// subsequent meal message), one --More-- and one recorded space key per turn.  The
// frame shown during the --More-- is the prior per-turn flush's map (frozen via
// occupation_painted_tick → _occCurFrame), with that turn's `T:` — exactly C's
// last-flush-before-more() behaviour.  DISPLAY-channel only: drives nhgetch (consumes
// the dismiss key) but no RNG.  `committed` is the prior topline to page; the painted
// frame and moves are supplied by the occupation driver via `frame`.
// Returns `morc` (see force_more) so the occupation driver can see an ESC dismiss.
export async function occupation_force_more(committed, frame, framesMoves, framesUhs) {
    const g = game;
    if (!g) return 0;
    routeTag('occupation_force_more', committed); /* telemetry only */
    // Install the prior turn's painted frame as the snapshot so the map shown during
    // the --More-- is that turn's map (not the live, already-advanced one), and
    // _statusLine2 renders that turn's T: and hunger state.  Mirrors the
    // level-transition forced more().  framesUhs (optional) is the hunger state (u.uhs)
    // as of the per-turn bot() flush — C froze the status line at that flush, so the
    // --More-- shows the pre-message hunger (e.g. NOT_HUNGRY at the lesshungry page,
    // before lesshungry's newuhs() bumps it to Satiated): seed0014 step 3.
    const _hadSnap = g._paintedSnapshot;
    if (frame) {
        g._paintedSnapshot = { cells: frame, moves: (framesMoves | 0),
            uhs: (framesUhs == null ? null : (framesUhs | 0)),
            botl: g._occCurBotl || null };
    }
    const morc = await _topl_more(committed);
    // Page-cleanup: drop the snapshot we installed (so the post-dismiss render uses the
    // live buffer), matching flush_screen's post-more() snapshot drop.  Leave any
    // pre-existing snapshot we did not install alone.
    if (frame) g._paintedSnapshot = null;
    return morc;
}

// ── flush_screen ──
/* C ref: display.c:2210-2227 — `static int flushing` inside flush_screen():
 *      "Prevent infinite loops on errors:
 *       flush_screen->print_glyph->impossible->pline->flush_screen"
 * and `if (flushing) return;` before anything else runs.  This port's
 * flush_screen is reachable from pline() the same way (pline.c:274), so the
 * same guard has to exist or a pline raised from inside the pager would
 * re-enter the pager.  Published as a module-scope flag rather than an early
 * return inside the body because C's guard returns BEFORE the flush is
 * counted (patch 012 emits after `flushing = 1`), so the call site is where
 * the test belongs. */
let _flush_screen_flushing = false;
export function _flush_screen_in_progress() { return _flush_screen_flushing; }
/* C's flush_screen() DOES NOT PAGINATE.  display.c:2208-2270 is a repaint —
 * bot()/timebot(), the dirty-cell loop, curs() — and nothing in it looks at
 * gt.toplines.  The --More-- decision lives in win/tty/topl.c update_topl(),
 * which putmesg() reaches AFTER the flush (pline.c:274-276).
 *
 * This port defers that decision: pline() accumulates the whole window's text
 * into _pending_message and the pager loop at the head of flush_screen() splits
 * and pages it once per command.  So js/'s flush_screen() is two C functions in
 * one body — update_topl's pager, then flush_screen's repaint.
 *
 * The pline.c:274 flush point is the FIRST flush-point divergence in 44 of 44
 * public sessions, and it is a call to the REPAINT half only.  Routing it
 * through the pager half is not merely un-C-faithful, it is measurably wrong:
 * MEASURED 2026-09-08, calling the whole of flush_screen() from pline() takes
 * `bash frozen/score.sh` 11,391 -> 9,075 screens and 43 -> 22 passing, because
 * the pager consumes --More-- keystrokes at points C does not, which shifts the
 * keystroke stream and desyncs the RNG (seed4500 8,910/108,275).
 *
 * So the flag below names WHICH C function this call is.  It is set only by
 * pline(), around a call that mirrors C's `if (u.ux) flush_screen(...)`, and it
 * suppresses exactly the half that in C is not in flush_screen at all.  The
 * eventual shape of this migration is to split the two bodies outright and give
 * update_topl's pager its own name at all 159 call sites; the flag is the
 * one-file step that gets the flush POINT right first. */
/* C's flush_screen() proper — pline.c:274's call.  Runs the repaint and
 * NOTHING else, and is SYNCHRONOUS: there is no await on this path, so the
 * whole call (including the finally) completes before pline() reaches its
 * putmesg, which is what keeps pline() synchronous for its 640 un-awaited call
 * sites.
 *
 * This used to be an arm of the async flush_screen() below, selected by a
 * module-global `_flush_screen_repaint_only` flag that pline_flush_point()
 * set around an UN-AWAITED call.  Same instructions in the same order, but the
 * synchrony was a property of the arm the caller happened to select, invisible
 * to any reader of the call site and to tools/async-boundary-census.mjs, which
 * correctly read pline_flush_point() as a sync caller of a suspending fn.  It
 * was also latently wrong: had the selected arm ever awaited, the caller's own
 * `finally` would have reset the flag before the body finished.  A separate
 * sync function makes the guarantee structural. */
function flush_screen_point(mode) {
    const wasFlushing = _flush_screen_flushing;
    _flush_screen_flushing = true;
    try { _flush_screen_repaint(mode); }
    finally { _flush_screen_flushing = wasFlushing; }
}
export async function flush_screen(mode) {
    // C ref: update_topl/more() — if the accumulated topline won't fit on one
    // row, flush the committed portion with --More-- before showing the rest.
    const wasFlushing = _flush_screen_flushing;
    _flush_screen_flushing = true;
    try {
        return await _flush_screen_body(mode);
    } finally { _flush_screen_flushing = wasFlushing; }
}
/* C ref: pline.c:273-274 — the flush point every vpline() makes immediately
 * before it hands its text to putmesg():
 *
 *     if (u.ux)
 *         flush_screen((gp.pline_flags & NO_CURS_ON_U) ? 0 : 1);
 *
 * It is NOT the pager — putmesg() -> update_topl() is what raises the more().
 * What it does is FREEZE the frame that more() then displays, which is why this
 * port grew _pline_flush_frame_record to reconstruct the same frame from a
 * snapshot later.  Corpus measurement (tools/flush-point-diff.mjs --census,
 * 44 public sessions): pline.c:274 is 4,202 C flush points, the second largest
 * site, and the first flush-point divergence in 44 of 44 sessions.
 *
 * Exported because pline() is not this port's only vpline: js/com_pager.js's
 * startup message path (welcome() and moveloop_preamble()) hand-renders its own
 * frames and never reaches pline(), and in C those ARE plain pline()s.
 *
 * The three guards are C's, one for one, and all three sit BEFORE patch 012's
 * emit, so a flush C skips is one this port must not make either:
 *   u.ux                      pline.c:273
 *   suppress_map_output()     display.c:2220 (the 5.0 save/restore guard)
 *   flushing                  display.c:2226 (the reentrancy static)
 *
 * cursor_on_u is 0 only for NO_CURS_ON_U, whose single caller in all of 5.0 is
 * getpos.c:652's auto_describe custompline. */
/* C ref: win/tty/topl.c addtopl()/putsyms() and win/tty/getline.c's read
 * loops — C echoes a prompt by writing CHARACTERS to the terminal, and never
 * calls flush_screen() to do it (get_ext_cmd/hooked_tty_getlin contain no
 * flush_screen at all).  This port has no character-level tty layer: its only
 * way to make the terminal show an echo is to rebuild the whole screen, and it
 * reached that rebuild through flush_screen().
 *
 * That made the port look like it flushes where C does not.  MEASURED
 * (tools/flush-point-diff.mjs --census, 44 public sessions, 2026-09-08): an
 * EXTRA-JS-FLUSH at a keystroke boundary is the FIRST flush-point divergence in
 * 16 of 44 sessions, and attributing the JS side by stack shows every one of
 * them landing in js/cmd.js doextcmd's per-character echo.
 *
 * tty_repaint() is the same paint with no flush point attached — the repaint
 * half of flush_screen() and nothing else.  It is deliberately NOT
 * flush_screen(): a caller that needs the topline PAGED is doing update_topl's
 * job, not flush_screen's, and should say so. */
export function tty_repaint(mode) {
    _flush_screen_repaint(mode);
}
export function pline_flush_point() {
    if (!(game && game.u && game.u.ux) || suppress_map_output()
        || _flush_screen_in_progress())
        return;
    /* SYNCHRONOUS, and that is load-bearing: flush_screen_point() is C's
     * flush_screen() proper and contains no await, so the repaint is complete
     * when this statement returns.  Suspending here would defer pline() past
     * its _pending_message assignment and reorder every un-awaited caller —
     * see _flush_screen_repaint's note. */
    flush_screen_point(1);
}
async function _flush_screen_body(mode) {
    if (typeof process !== 'undefined' && process.env?.FF_TOPL_TRACE === '1') {
        const line = String(game._pending_message || '');
        const joins = _topl_joins_for(line);
        const result = String(game._resultMessage || '');
        const resultJoins = game._resultMessageJoins?.src === result
            && Array.isArray(game._resultMessageJoins?.joins)
            ? game._resultMessageJoins.joins : null;
        pushRngLogEntry(
            `^topl_flush_entry[pending=${encodeURIComponent(line.slice(0, 120))}`
            + ` joins=${(joins || []).join(',')}`
            + ` result=${encodeURIComponent(result.slice(0, 120))}`
            + ` resultJoins=${(resultJoins || []).join(',')}]`);
    }
    let split = _topl_split_for_more(game._pending_message || '');
    const hadMore = split !== null;
    // The whole accumulated topline being paged, in the coordinate space the
    // per-message flush frames were recorded in (see _pline_flush_frame_tick).
    const fullTopl = game._pending_message || '';
    // C ref: during a paged RUN, each --More-- freezes the physical screen at the hero
    // square of the run turn whose pline crossed that page's width boundary (see
    // run_page_frame_tick).  Track the committed-end offset within the full accumulated
    // topline so each page selects the matching per-run-turn frame; `consumed` is the
    // running offset of dismissed-page text.  Inert when no _runPageFrames log exists.
    let consumed = 0;
    // Index of the page being emitted, so a multi-page movemon window can install
    // the per-page painted frame C froze at THAT page's overflowing pline
    // (_maybe_snapshot_painted_screen).  Page 0's frame is identical to
    // _paintedSnapshot, so only pages 1..N-1 install — the single-page path (every
    // session that pages a movemon window exactly once) is byte-identical.
    let pageIdx = 0;
    while (split) {
        const [committed, remainder, remainderJoins] = split;
        // Install this page's per-run-turn painted frame (if a run-frame log exists) so
        // _topl_more's nhgetch capture renders the hero at THIS page's run-turn square.
        // The committed end within the full topline = consumed + this page's committed
        // length.  Falls back to any pre-existing _paintedSnapshot (movemon/occupation
        // single-frame path) when no run-frame matches.
        const runFrame = _run_page_frame_select(consumed + committed.length);
        // C ref: src/pline.c:274-277 — the more() that ends THIS page was fired by
        // the message that begins right after `committed`, and that pline had just
        // flushed the screen.  When we recorded that flush, it is the authoritative
        // frozen frame; it supersedes the coarser per-run-turn / per-page logs,
        // which approximate the same instant at world-block granularity (they froze
        // the LAST message that still fitted, i.e. one hero step early on a counted
        // walk — seed0600 step 255).
        let plineFrame = _pline_flush_frame_select(consumed + committed.length, fullTopl);
        /* C ref: win/tty/topl.c update_topl:274 + redotoplin.  The lookup above
         * finds the frame frozen by the message that begins right AFTER this
         * page — the ordinary case, where a following pline's update_topl fired
         * the more().  A page can also be forced by WIDTH alone: when the last
         * message on the topline does not fit, C pages it from inside its OWN
         * redotoplin, i.e. after its OWN pline's flush_screen (pline.c:274-277)
         * and with no later message involved.  For that page the authoritative
         * frozen frame is the one recorded when THIS page's message was plined,
         * whose offset is `consumed - 2` — `consumed` has already been advanced
         * past this page's own "  " message-boundary separator, while the log
         * keys a message on the END of the text before it (see
         * _pline_flush_frame_record's note) — rather than
         * `consumed + committed.length`.
         *
         * MEASURED on seed0002 step 345: the pickup's second message ("You have
         * a little trouble lifting y - a polished silver shield (unpaid, 50
         * zorkmids).", 87 cols) wraps and pages with nothing after it, and C's
         * frame shows the shopkeeper still at column 70 — where it stood when
         * that pline flushed.  This port paged after the world turn and painted
         * it at 71, the position C only shows on the NEXT frame.
         * Strictly a fallback: it runs only when the primary lookup found
         * nothing, so every page that already had an exact frame is untouched. */
        if (!plineFrame)
            plineFrame = _pline_flush_frame_select(consumed - 2, fullTopl);
        const _savedSnap = game._paintedSnapshot;
        const _savedInMM = game._inMovemonMore;
        // ── pickup-encumber prinv page: freeze on the pre-movemon frame + cap ────
        // The dopickup prinv (committed last turn) pages here; C froze the physical
        // screen + the bottom encumbrance status at the pre-movemon / pre-encumber
        // bot() (the pet had not moved, cap not yet repainted).  Install the
        // captured pre-frame and its frozen cap for THIS page when it is the prinv.
        let _pickupFrozen = false;
        let _pageFrozen = false;
        const _forcedFrameIdx = _topl_force_break_entry(committed);
        const _forcedFrame = (_forcedFrameIdx >= 0)
            ? (game._topl_force_breaks[_forcedFrameIdx].frame || null) : null;
        if (process.env.FF_MLTRACE === '1') {
            const forcedText = _forcedFrameIdx >= 0
                ? encodeURIComponent(String(game._topl_force_breaks[_forcedFrameIdx]?.text || '').slice(0,64)) : '';
            pushRngLogEntry(`^topl_frame_select[page=${pageIdx | 0} end=${consumed + committed.length}`
                + ` committed=${encodeURIComponent(String(committed).slice(0,64))}`
                + ` forced=${_forcedFrameIdx}:${forcedText}`
                + ` pline=${plineFrame ? `${plineFrame.off}:${encodeURIComponent(String(plineFrame.msg).slice(0,64))}` : 'none'}`
                + ` cells=${plineFrame?.cells?.size ?? -1} forcedCells=${_forcedFrame?.cells?.size ?? -1}`
                + ` run=${runFrame ? 1 : 0} ambient=${game._paintedSnapshot ? 1 : 0}]`);
        }
        const _pep = game._pickupEncPreFrame;
        // pickup_prinv can join an earlier object's message on this page.
        // The final prinv still precedes encumber_msg's status update in C.
        const pickupPrinv = game._pickupEncMorePending?.prinvText;
        if (_pep && pickupPrinv
            && (committed === pickupPrinv || committed.endsWith('  ' + pickupPrinv))) {
            game._paintedSnapshot = { cells: _pep.cells, moves: _pep.moves | 0, cap: _pep.cap | 0 };
            game._inMovemonMore = true;
            _pickupFrozen = true;
        } else if (_forcedFrame) {
            /* This page was raised by a C display_nhwindow(WIN_MESSAGE), not by
             * a width overflow, so its frozen frame came from
             * topl_force_break_after() rather than from the overflow log. */
            game._paintedSnapshot = { cells: _forcedFrame.cells, moves: _forcedFrame.moves,
                                      botl: _forcedFrame.botl || null };
            _pageFrozen = true;
        } else if (plineFrame) {
            game._paintedSnapshot = { cells: plineFrame.cells, moves: plineFrame.moves,
                botl: plineFrame.botl || null };
            _pageFrozen = true;
        } else if (runFrame) {
            game._paintedSnapshot = { cells: runFrame.cells, moves: runFrame.moves };
        } else if (pageIdx > 0 && game._movemonPageFrames
                   && game._movemonPageFrames[pageIdx]) {
            // This page's more() fired in C at a LATER pline than page 0's, with the
            // map already repainted by the intervening monster moves.  Install that
            // page's frozen frame for the duration of this --More--.
            //
            // `botl` is threaded for the same reason `cells` is, and by the same C
            // rule: pline.c:273-274 has vpline() call flush_screen() immediately
            // before putmesg(), and flush_screen() opens with
            //     if (disp.botl || disp.botlx) bot(); (display.c:2237-2240)
            // so the SAME call that syncs the map also repaints the status window,
            // at the same instant, before the --More-- blocks.  The map half and the
            // status half of a frozen page cannot come from different instants.
            // The two sibling arms above (_forcedFrame, plineFrame) already thread
            // it; the run arm does not because run_page_frame_tick() records no
            // `botl` field at all (there is nothing to thread there, not a decision
            // that run frames should render live status).
            const pf = game._movemonPageFrames[pageIdx];
            game._paintedSnapshot = { cells: pf.cells, moves: pf.moves,
                botl: pf.botl || null };
            _pageFrozen = true;
        }
        routeTag('_topl_split_for_more', committed); /* telemetry only */
        if (process.env.FF_MATTACK_TRACE === '1' || process.env.FF_MLTRACE === '1') {
            pushRngLogEntry(`^topl_page_ready[page=${pageIdx | 0} snap=${game._paintedSnapshot ? 1 : 0}`
                + ` cells=${game._paintedSnapshot?.cells?.size ?? -1} inMore=${game._inMovemonMore ? 1 : 0}]`);
            pushRngLogEntry(`^topl_more_commit[page=${pageIdx|0} committed=${encodeURIComponent(String(committed).slice(0,96))} remainder=${encodeURIComponent(String(remainder).slice(0,96))}]`);
        }
        const _morc = await _topl_more(committed);
        if (process.env.FF_MATTACK_TRACE === '1' || process.env.FF_MLTRACE === '1') {
            const _mc = game._ffMlCursor;
            pushRngLogEntry(`^topl_more_return[page=${pageIdx|0} morc=${_morc|0} moves=${game.moves|0} umv=${game.u?.umovement|0}`
                + ` pending=${encodeURIComponent(String(game._pending_message || '').slice(0,96))}`
                + ` inmm=${game._inMovemonBlock ? 1 : 0}`
                + ` cursor=${_mc ? `${_mc.phase}:${_mc.pass}:${_mc.roster}/${_mc.count}:m${_mc.mid}` : 'none'}]`);
            pushRngLogEntry(`^topl_page_return_state[page=${pageIdx | 0} snap=${game._paintedSnapshot ? 1 : 0}`
                + ` cells=${game._paintedSnapshot?.cells?.size ?? -1} inMore=${game._inMovemonMore ? 1 : 0}]`);
        }
        if (_pickupFrozen) {
            game._paintedSnapshot = _savedSnap || null;
            game._inMovemonMore = _savedInMM || false;
        } else if (runFrame || _pageFrozen) {
            game._paintedSnapshot = _savedSnap;
        }
        if (process.env.FF_MATTACK_TRACE === '1' || process.env.FF_MLTRACE === '1')
            pushRngLogEntry(`^topl_page_restored[page=${pageIdx | 0} snap=${game._paintedSnapshot ? 1 : 0}`
                + ` cells=${game._paintedSnapshot?.cells?.size ?? -1} inMore=${game._inMovemonMore ? 1 : 0}]`);
        pageIdx++;
        // Advance past this dismissed page's committed text + the "  " message-boundary
        // separator that _topl_split_for_more trims when starting the remainder.
        consumed += committed.length + 2;
        game._pending_message = remainder;
        // Re-base the join record onto the remainder so a later read of
        // _topl_joins (and the next split iteration) reflects the new string.
        if (remainder && remainderJoins && remainderJoins.length) {
            game._topl_joins = remainderJoins;
            game._topl_joins_src = remainder;
        } else {
            game._topl_joins = [];
            game._topl_joins_src = remainder;
        }
        /* A forced break is consumed by the page it produced.  It must NOT be
         * cleared at the nhgetch inside _topl_more above: a movemon window that
         * pages three times acks three keys before the break's own boundary is
         * reached, so clearing on input dropped the registration before it
         * could fire (seed0383 step 141). */
        if (game._topl_force_breaks && game._topl_force_breaks.length) {
            const k = _topl_force_break_entry(committed);
            if (k >= 0) game._topl_force_breaks.splice(k, 1);
        }
        /* C ref: win/tty/topl.c more():232-235 + update_topl:257 — an ESC at a
         * --More-- sets WIN_STOP on WIN_MESSAGE, and with WIN_STOP set
         * update_topl calls NEITHER addtopl() nor redotoplin(), so nothing that
         * follows reaches the screen (and no further more() is raised) until the
         * next tty_nhgetch clears the bit.  js/display.js pline() already
         * implements that for messages that ARRIVE after the more(); this port
         * accumulates a whole turn's plines and pages them here, so the same
         * suppression has to apply to the REST of the already-accumulated line —
         * those are exactly the plines C had not emitted yet when the ESC landed.
         *
         * MEASURED on seed4500-knight-coverage step 1786: the player ESCs the
         * "You hit it.  The silver dragon bites!  The silver dragon hits!--More--"
         * page and C shows NO further combat page at all — the next frame is the
         * "Die? [yn] (n)" prompt raised by the death the suppressed attacks
         * caused ("You die" is topl.c:298's one escape from WIN_STOP, and
         * redotoplin only more()s when cury != 0, which it is not here).  This
         * port paged every remaining attack and ran 28 frames behind to the end
         * of the session.
         *
         * The topline itself is cleared, matching more()'s own
         * `else if (morc == '\033') { curx = cury = 0; home(); cl_end(); }`
         * (topl.c:241-245).  _topl_more has already armed _topl_win_stop_armed
         * so any pline that arrives before the next nhgetch is suppressed too. */
        if (_morc === 27 /* ESC */) {
            if (process.env.FF_MLTRACE === '1')
                pushRngLogEntry(`^topl_stop_after_esc[committed=${encodeURIComponent(String(committed).slice(0,80))} rem=${encodeURIComponent(String(remainder).slice(0,80))} joins=${(remainderJoins || []).join(',')}]`);
            /* ...but an URGENT message later in this same accumulated topline
             * ENDS the suppression window before the next input does.
             * win/tty/wintty.c:2277-2283: `if ((cw->flags & WIN_STOP) != 0) {
             * tty_clear_nhwindow(WIN_MESSAGE); cw->flags &= ~WIN_STOP; }` — the
             * topline is WIPED and the urgent message opens a clean one, so
             * everything between the ESC and it is gone from the screen and
             * paging RESUMES from the urgent message.
             *
             * MEASURED on seed4500-knight-coverage steps 1763-1764: the ESC
             * lands on "It is mildly chilly.  Something casts a spell at
             * you!--More--", the psi-bolt line "Your cap area suddenly aches
             * very painfully!" is drawn and then WIPED by polyman's
             * urgent_pline, and C's next two frames are "You return to human
             * form!  You can see again.--More--" and "Your movements are now
             * unencumbered." */
            const _urgent = game._topl_urgent_marks || [];
            let _rel = -1;
            if (_urgent.length && remainderJoins && remainderJoins.length) {
                for (const _j of remainderJoins) {
                    const _start = _j + 2;
                    const _end = remainderJoins.find((k) => k > _j) ?? remainder.length;
                    if (_urgent.includes(remainder.slice(_start, _end))) {
                        _rel = _start;
                        break;
                    }
                }
            }
            if (_rel >= 0) {
                const _newRem = remainder.slice(_rel);
                const _newJoins = (remainderJoins || [])
                    .filter((j) => j >= _rel).map((j) => j - _rel);
                consumed += _rel;
                game._pending_message = _newRem;
                game._topl_joins = _newJoins;
                game._topl_joins_src = _newRem;
                split = _newRem ? _topl_split_for_more(_newRem, _newJoins) : null;
                continue;
            }
            /* topl.c:257's `skip` is a LOCAL sampled at update_topl ENTRY, so
             * the message that RAISED this page (the first one of the
             * remainder) was already past that test when more() ran and
             * :300's `if (!skip) redotoplin()` still draws it.  Only what
             * comes AFTER it is suppressed.  It is drawn WITHOUT a further
             * --More--: redotoplin (topl.c:139) more()s only when cury != 0,
             * and this line starts at column 0. */
            const _keepEnd = (remainderJoins && remainderJoins.length)
                ? remainderJoins[0] : remainder.length;
            game._pending_message = remainder.slice(0, _keepEnd);
            game._topl_joins = [];
            game._topl_joins_src = game._pending_message;
            /* ...but gt.toplines KEEPS RECEIVING the suppressed messages.  The
             * join arm of update_topl (topl.c:266-272) runs its two Strcat()s
             * whether or not `skip` is set — only addtopl() is guarded — and
             * when one does not fit, :290's strncpy REPLACES the buffer with it.
             * Nothing of this reaches the screen, but the resulting LENGTH is
             * what the next message's fit test is measured against, and that
             * test is what decides whether a following "You die" clears
             * WIN_STOP (topl.c:264's short-circuited `notdied`).
             *
             * This port has already accumulated those same messages into the
             * remainder, so replay them here rather than dropping them on the
             * floor.  MEASURED on seed4500-knight-coverage step 1786: the five
             * suppressed attack messages leave gt.toplines at 65 columns, so
             * "You die..." does NOT fit, WIN_STOP survives, and C raises the
             * "Die? [yn] (n)" prompt with no page.  Keeping only the drawn
             * message (29 columns) made it fit and cost 27 step points. */
            {
                let _wsBuf = game._pending_message;
                const _bounds = (remainderJoins && remainderJoins.length)
                    ? remainderJoins.slice() : [];
                for (let _i = 0; _i < _bounds.length; _i++) {
                    const _s = _bounds[_i] + 2;
                    const _e = (_i + 1 < _bounds.length) ? _bounds[_i + 1] : remainder.length;
                    const _m = remainder.slice(_s, _e);
                    _wsBuf = (_wsBuf.length + 2 + _m.length < TOPL_LIMIT)
                        ? (_wsBuf + '  ' + _m) : _m;
                }
                game._topl_win_stop_buf = _wsBuf;
            }
            /* ...and because that message HAS now been drawn, WIN_STOP is LIVE
             * from here, not merely armed.  In C both halves happen inside one
             * update_topl() call: more() sets the bit at topl.c:234 and :300's
             * `if (!skip) redotoplin()` still paints, because `skip` was sampled
             * at :257 before more() ran.  So the NEXT update_topl already sees
             * skip == TRUE.  _topl_win_stop_armed exists for the OTHER shape —
             * force_more() pages a committed topline and the message that owns
             * the page arrives as a separate later pline() (seed0009's
             * read_engr_at) — and there the deferral is right.  Here it is one
             * message too generous: leaving the bit merely ARMED let the first
             * pline after the ESC consume the arming and JOIN itself onto the
             * topline, which C had already suppressed. */
            /* ...unless the message that raised this page was URGENT: C's
             * more() only sets WIN_STOP `if (!(cw->flags & WIN_NOSTOP))`
             * (topl.c:233), and tty_putstr holds NOSTOP across the whole
             * urgent update_topl (wintty.c:2282-2300). */
            const _headEnd = (remainderJoins && remainderJoins.length)
                ? remainderJoins[0] : remainder.length;
            if (!(game._topl_urgent_marks || []).includes(remainder.slice(0, _headEnd))) {
                game._topl_win_stop_armed = false;
                game._topl_win_stop = true;
            }
            break;
        }
        split = remainder ? _topl_split_for_more(remainder, remainderJoins) : null;
    }
    // pickup-encumber --More-- has been paged; drop the captured pre-frame so a
    // later --More-- does not reuse it.  DISPLAY-ONLY.
    if (hadMore && (game._pickupEncPreFrame || game._pickupEncMorePending)) {
        game._pickupEncPreFrame = null;
        game._pickupEncMorePending = null;
    }
    // The run's accumulated topline has now been fully paged; drop the per-run-turn
    // frame log so a later non-run --More-- in the same session (e.g. a getpos prompt
    // or a fresh movemon overflow) does not reuse this run's stale frames.  C ref: the
    // topline is cleared at the next tty_nhgetch; the physical terminal tracks the
    // live hero from there.  DISPLAY-ONLY.
    if (hadMore && game._runPageFrames) {
        game._runPageFrames = null;
    }
    // Same for the per-message flush frames: this window's topline has been paged
    // and the terminal tracks the live gbuf from the next nhgetch on.  DISPLAY-ONLY.
    if (hadMore && game._plineFlushFrames) {
        _pline_flush_frames_reset();
    }
    // C ref: after the tty more() releases, the deferred map updates (e.g. the
    // dead-monster glyph clear queued by a kill whose message triggered the
    // --More--) finally reach the terminal.  Drain them now so the map shows
    // the up-to-date glyphs in the post-more() screen, while it correctly
    // showed the stale (live-monster) glyph for the whole --More-- span.
    if (hadMore && game._deferred_newsym && game._deferred_newsym.length) {
        const pend = game._deferred_newsym;
        game._deferred_newsym = [];
        for (const [x, y] of pend)
            newsym(x, y);
    }
    // C ref: more() has returned, so the C caller that was parked inside its
    // blocking pline() now runs the statements that follow it.  Drain the
    // generic post-more effect queue (_defer_until_more_dismissed) here, at the
    // same instant, and before the bot() flush below so a queued SET_BOTL is
    // honoured by this render.  RNG-free by contract — see the queue's header.
    if (hadMore && game._deferred_post_more && game._deferred_post_more.length) {
        if (process.env.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^topl_more_drain[count=${game._deferred_post_more.length|0}]`);
        const pendFns = game._deferred_post_more;
        game._deferred_post_more = [];
        for (const fn of pendFns)
            await fn();
    }
    // The deferred per-turn movemon messages (if any) have now been fully paged;
    // disarm the movemon-turn tag so a later, unrelated command's --More-- (e.g. a
    // getpos prompt) renders `T:` from the live game.moves rather than this stale
    // movemon turn.  C ref: the topline is cleared at the next tty_nhgetch and the
    // new turn's svm.moves is in effect for everything that follows.
    if (hadMore && game._movemonMsgTurn != null) {
        game._movemonMsgTurn = null;
    }
    // The movemon --More-- window has been fully paged; the physical terminal is
    // repainted from the up-to-date gbuf now (C: more() returns → tty redraws).
    // Drop the painted-screen snapshot so the post-more() fresh render uses the
    // live disp_* buffer.
    if (hadMore && game._paintedSnapshot) {
        game._paintedSnapshot = null;
    }
    // Same for the per-page frame log: this window's pages have all been shown, so
    // a later movemon overflow starts a fresh log.  DISPLAY-ONLY.
    if (hadMore && game._movemonPageFrames) {
        _movemon_page_frames_reset();
    }
    _flush_screen_repaint(mode);
}
/* C ref: display.c:2236-2270 — the WHOLE of flush_screen() after its guards:
 * the status repaint, the dirty-cell loop, and the cursor.  Split out of the
 * body above so pline()'s C flush point (pline.c:274) can reach it.
 *
 * IT IS SYNCHRONOUS AND MUST STAY SO.  pline() runs to its _pending_message
 * assignment with no await today, and 640 of its call sites across js/ do not
 * await it.  Introducing an await before that assignment defers the message
 * past every one of them; MEASURED 2026-09-08, an awaited flush here takes
 * `bash frozen/score.sh` from 11,391 screens / 43 passing to 9,180 / 22, with
 * RNG divergence in four sessions (seed4500 8,914/108,275) — a reordering, not
 * a repaint bug.  bot() and timebot() are declared async but contain NO await
 * (checked: the whole of bot()'s body is straight-line), so calling them
 * without one runs them to completion here, exactly as C does.  If a future
 * change puts a real await inside bot(), THIS is the call site that breaks. */
function _flush_screen_repaint(mode) {
    // C ref: flush_screen — if status is flagged, update it before rendering
    if (game && game.disp) {
        if (game.disp.botl || game.disp.botlx)
            bot();
        else if (game.disp.time_botl)
            timebot();
    }
    // C ref: display.c:2318-2344 — the gnew repaint loop runs here, between
    // bot() and display_nhwindow(WIN_MAP), and leaves the tty cursor one column
    // past the last glyph it printed; `if (cursor_on_u) curs(WIN_MAP, u.ux,
    // u.uy)` only overrides that for a flush_screen(1).  See newsym_force above
    // for why the forced cells are the only observable case in this port.
    const _forcedCurs = _take_forced_gnew_cursor();
    /* Published for callers that placed the cursor with curs() BEFORE this
     * flush.  C's repaint loop only moves the tty cursor when it actually
     * prints a cell, so with nothing forced the curs() position stands; this
     * port's _buildScreenOutput re-parks the cursor unconditionally, so a
     * caller has to re-assert.  See getpos()'s prologue (js/cmd.js). */
    _last_flush_forced_cursor = !!(_forcedCurs && !mode);
    _buildScreenOutput();
    // Applied after _buildScreenOutput, which is this port's paint step and
    // walks the terminal cursor across every cell it writes; C's repaint loop
    // and the cursor it leaves behind are the same statement.
    if (_forcedCurs && !mode) {
        const disp = game?.nhDisplay;
        if (disp) {
            disp.cursorCol = _forcedCurs[0];
            disp.cursorRow = _forcedCurs[1];
        }
    }
}
/* C ref: display.c:2074-2087 clear_glyph_buffer() — "force gbuf[][].glyph to
 * unexplored".  This port's glyph buffer is the per-cell disp_* fields
 * show_glyph_cell writes and _buildScreenOutput reads, so clearing it means
 * blanking those, NOT touching loc.remembered_glyph (hero memory survives a
 * screen clear; docrt() repaints from it).
 *
 * Kept as its own export because a detection (detect.c monster_detect /
 * object_detect / do_mapping) is exactly "cls(), then paint a handful of
 * glyphs onto an otherwise empty map, then map_redisplay() to put the real
 * map back" — without the buffer clear the detection overlay is drawn on top
 * of the remembered map and C's near-empty frame never appears. */
export function clear_glyph_buffer() {
    const lev = game.level;
    if (!lev || !lev.at)
        return;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = lev.at(x, y);
            if (!loc)
                continue;
            loc.disp_ch = ' ';
            loc.disp_color = NO_COLOR;
            loc.disp_decgfx = false;
            loc.disp_attr = 0;
            loc.disp_cls = GLYPHCLS_CMAP;
            loc.disp_is_warning = false;
            loc.gnew = 1;
        }
    }
}
// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen)
        display.clearScreen();
    /* C display.c:2064-2072 cls(): clear_nhwindow(WIN_MAP) clears the physical
     * screen and clear_glyph_buffer() forces every gbuf cell to unexplored.
     * Only the first half was ported, so a cls() that was NOT immediately
     * followed by a full repaint left the previous map standing in the glyph
     * buffer — which is every detection caller. */
    clear_glyph_buffer();
    game._pending_message = '';
}
// ── bot ──
export async function bot() {
    /* getline.c:63: custompline() reaches flush_screen()->bot(), but the core
     * disables bot processing while ttyDisplay->inread is nonzero.  Prompt
     * repainting must therefore leave status and pending disp flags alone. */
    if (game?._topl_prompt_echo)
        return;
    // Status line updates happen in _buildScreenOutput
    // C ref: botl.c:188 — bot2() reads (cap = near_capacity()) HERE, at paint
    // time, and the physical bottom line then holds that value until the NEXT
    // bot().  Latch it so a later frozen --More-- page can render what the last
    // paint actually put on the screen rather than the live inventory weight:
    // C's encumber_msg (pickup.c:1990) emits its pline BEFORE its SET_BOTL, and
    // drop() has already run freeinv() by then, so between the drop and the next
    // bot() the screen shows the PRE-drop encumbrance while near_capacity()
    // already reports the post-drop one (seed5500 step 863 — C " Stressed", live
    // value " Burdened").  DISPLAY-ONLY; near_capacity() consumes no RNG.
    game._botlPaintedCap = near_capacity() | 0;
    /* Same latch for the Deaf condition word: bot() is the paint, so from here
     * the physical status line holds THIS Deaf state until the next bot().
     * See _capture_botl()'s `deaf` field for why a live read is wrong. */
    game._botlPaintedDeaf = _live_deaf();
    /* C botl.c condtests[bl_conf]: retain the last painted condition when
     * HConfusion is restored without SET_BOTL after a magic-trap effect. */
    game._botlPaintedConfused = !!(game.u?.uprops?.[CONFUSION]?.intrinsic | 0);
    /* C botl.c:279-296 — bot() paints, and the values it paints are what the
     * physical status line then holds until the NEXT paint.  Latch them, because
     * botl.c:279's `u.uhp != -1` guard means there may not BE a next paint: see
     * _capture_botl() for the full note and the seed5002 witness.  DISPLAY-ONLY. */
    if ((game?.u?.uhp | 0) !== -1) {
        game._lastPaintedBotl = _capture_botl();
        /* This IS C's next real paint: whatever done() left pending is now on
         * the physical line, so the death freeze (see js/end.js
         * _done_force_hp_zero) is over. */
        game._botlFrozenDeath = false;
    }
    /* C botl.c:260-269 — bot() repaints the WHOLE status line, `T:' included, so
     * the run-suppression latch above is discharged by any paint that gets here. */
    if (game) game._timeBotlFrozenMoves = null;
    // C ref: botl.c:277 — bot() resets disp flags after rendering
    if (game && game.disp) {
        game.disp.botl = 0;
        game.disp.botlx = 0;
        game.disp.time_botl = 0;
    }
}
// ── Message history ring (for ^P / doprev_message) ──
// C ref: topl.c remember_topl() / putmsghistory() — NetHack keeps a ring of
// recently-displayed toplines so the player can recall them with ^P.  Each
// committed topline (the fully-assembled message for one turn, without the
// '--More--' continuation indicator) becomes one history entry, in emission
// order.  ^P then lists them newest-first.
//
// We model the ring as a simple ordered array on the game state.  Two entry
// points feed it:
//   1. commit_topline_to_history(msg) — called from input.js nhgetch() when the
//      topline is cleared, mirroring C's remember_topl at tty_clear time.
//   2. putmsghistory(msg) — direct insertion that bypasses topline display
//      (C ref: questpgr.c com_pager_core → putmsghistory(out_line, FALSE) for the
//      quest synopsis; the bracketed "[<deity> has chosen you...]" line is added
//      to history but never shown on the topline).
//
// Append-only; consumed only by ^P.  This never alters any rendered screen.
function _msg_history_arr() {
    if (!game._msg_history)
        game._msg_history = [];
    return game._msg_history;
}
export function putmsghistory(msg, _restoring) {
    if (msg == null)
        return;
    const text = String(msg);
    // C ref: putmsghistory collapses an immediate duplicate of the most recent
    // entry; otherwise appends.  (NetHack's tty ring stores distinct lines; an
    // exact repeat is not re-stored.)
    const h = _msg_history_arr();
    if (h.length > 0 && h[h.length - 1] === text)
        return;
    h.push(text);
}
/* ── nh_sprintf ──
 * C ref: pline.c:196-201 vpline() —
 *     } else {
 *         ln = vsnprintf(pbuf, sizeof pbuf, line, the_args);
 *         line = pbuf;
 *     }
 * The conversion set below is the one the tree's call sites actually use,
 * censused over all 111 findings of tools/format-arity-lint.mjs: %s (171),
 * %d (6), %ld (3), %i (2), %u (1).  Flags/width/precision are parsed and
 * applied because vsnprintf applies them; an unrecognised specifier is left
 * VERBATIM rather than dropped, which is the direction a mismatched
 * vsnprintf errs in and never deletes text that C would have printed.
 *
 * NOTE the deliberate deviation, and it is the whole safety argument for
 * making pline() variadic: C runs vsnprintf whenever the format contains
 * '%' AT ALL, reading garbage off the stack when the caller passed no
 * varargs.  This tree has many `pline(someBuiltString)` call sites whose
 * single pre-formatted argument may legitimately contain a '%' (an
 * engraving, a wish string, a "100% chance" message).  So formatting here
 * is gated on args.length > 0: a one-argument pline() is byte-for-byte what
 * it was before this change, and only calls that were ALREADY dropping
 * arguments on the floor change behaviour.  C's other special case —
 * a format of exactly "%s" uses its argument as-is — falls out of the
 * general path with the identical result. */
export function nh_sprintf(fmt, args) {
    let i = 0;
    return String(fmt).replace(
        /%([-+#0]*)([0-9]*)(?:\.([0-9]+))?(hh|h|ll|l|L|z|j|t)?([diouxXeEfgGaAcs%])/g,
        (spec, flags, width, prec, len, conv) => {
            if (conv === '%') return '%';
            const a = args[i++];
            let s;
            switch (conv) {
            case 's':
                s = (a == null) ? '' : String(a);
                if (prec !== undefined) s = s.slice(0, Number(prec));
                break;
            case 'c':
                s = (typeof a === 'number') ? String.fromCharCode(a) : String(a);
                break;
            case 'd': case 'i':
                /* C's %d is int and wraps at 32 bits, which `| 0` reproduces;
                 * %ld is long and must NOT wrap — vault.js's
                 * Your("%ld gold pieces...", umoney) is the case that would
                 * otherwise print a negative purse. */
                s = typeof a === 'bigint'
                    ? BigInt.asIntN(len ? 64 : 32, a).toString()
                    : String(len ? Math.trunc(Number(a) || 0) : (Number(a) | 0));
                break;
            case 'u':
                s = String(len ? (Math.trunc(Number(a) || 0) >>> 0)
                               : ((Number(a) | 0) >>> 0));
                break;
            case 'o': s = ((Number(a) | 0) >>> 0).toString(8); break;
            case 'x': s = ((Number(a) | 0) >>> 0).toString(16); break;
            case 'X': s = ((Number(a) | 0) >>> 0).toString(16).toUpperCase(); break;
            case 'f': case 'F':
                s = Number(a).toFixed(prec === undefined ? 6 : Number(prec));
                break;
            default:
                /* Unrecognised: give the argument back rather than losing it. */
                s = String(a);
                break;
            }
            if (flags.includes('+') && 'dif'.includes(conv) && !s.startsWith('-'))
                s = '+' + s;
            const w = Number(width || 0);
            if (s.length < w) {
                if (flags.includes('-')) s = s.padEnd(w, ' ');
                else if (flags.includes('0') && conv !== 's' && conv !== 'c')
                    s = (s.startsWith('-') ? '-' + s.slice(1).padStart(w - 1, '0')
                                           : s.padStart(w, '0'));
                else s = s.padStart(w, ' ');
            }
            return s;
        });
}

// ── pline ──
// C ref: pline.c:103-111 `pline(const char *line, ...)` → vpline(line, args).
// C's pline is VARIADIC and formats through vsnprintf; this one took a single
// argument, so every C-transliterated `pline("You see %s here.", doname(obj))`
// in the tree dropped its arguments and printed the literal "%s" to the
// topline.  Measured 2026-08-14 by tools/format-arity-lint.mjs: 104 call sites
// across 15 files resolved to THIS definition with more arguments than it
// declares.  Restoring the rest parameter fixes all of them at the binding
// rather than one string-concatenation at a time.
// C ref (unchanged, below): tty pline → putstr(WIN_MESSAGE) → tty_putstr — the
// tty layer appends to the existing topline with two spaces ("  ") when called
// more than once in the same turn before nhgetch clears the line.
// Mirror: multiple pline() calls within one turn concatenate with "  ".
/* C ref: pline.c:531 gamelog_add(glflags, gltime, msg) — append one entry to
 * gg.gamelog, the chronicle ring that insight.c:2571 show_gamelog() renders for
 * '#chronicle' and for the end-of-game "Major events:" window.
 * pline.c:527 stores {turn, flags, text}; js/allmain.js's game-start entry
 * already uses exactly that shape, so this is its one shared writer. */
export function gamelog_add(glflags, gltime, msg) {
    const g = game;
    (g.gamelog ||= []).push({ turn: gltime | 0, flags: glflags | 0, text: String(msg) });
}
/* C ref: pline.c:514 livelog_printf(ll_type, line, ...) —
 *     vsnprintf(gamelogbuf, ...); gamelog_add(ll_type, svm.moves, gamelogbuf);
 *     strNsubst(gamelogbuf, "\t", "_", 0); livelog_add(ll_type, gamelogbuf);
 * The livelog_add half writes the external livelog FILE, which has no screen
 * channel and is not modelled; the gamelog_add half IS the #chronicle window.
 * js/exper.js carried a `function livelog_printf(...args) {}` no-op stub, so
 * every conduct/achievement event the corpus expects to see in that window was
 * dropped on the floor. */
export function livelog_printf(ll_type, line, ...args) {
    const msg = (args.length > 0) ? nh_sprintf(line, args) : line;
    gamelog_add(ll_type, game.moves | 0, msg);
}
/* C ref: src/pline.c urgent_pline(fmt, ...) -> vpline(PLINE_URGENT) ->
 * putstr(WIN_MESSAGE, ATR_URGENT, line), whose tty handler is
 * win/tty/wintty.c:2273-2300:
 *
 *     if (urgent_message) {
 *         if ((cw->flags & WIN_STOP) != 0) {
 *             tty_clear_nhwindow(WIN_MESSAGE);
 *             cw->flags &= ~WIN_STOP;
 *         }
 *         cw->flags |= WIN_NOSTOP;
 *     }
 *     update_topl(str);
 *     cw->flags &= ~WIN_NOSTOP;    // NOSTOP is a one-shot
 *
 * so an urgent message does TWO things an ordinary pline does not:
 *  (a) it CANCELS a live WIN_STOP and WIPES the topline first, so it starts on
 *      a clean line rather than joining or being swallowed, and
 *  (b) WIN_NOSTOP holds for the duration, and topl.c more():232-234 tests it —
 *      `if (!(cw->flags & WIN_NOSTOP)) cw->flags |= WIN_STOP;` — so an ESC at
 *      the page THIS message raises does not start a new suppression window.
 *
 * MEASURED on seed4500-knight-coverage steps 1763-1764.  A master lich's psi
 * bolt reverts the hero's brown-mold form; the ESC that dismissed
 * "It is mildly chilly.  Something casts a spell at you!--More--" left
 * WIN_STOP set over "Your %s suddenly aches very painfully!" (mcastu.c:619),
 * and polyman's urgent_pline (polyself.c:230) then wiped that line and opened
 * a fresh one.  C's next two frames are "You return to human form!  You can
 * see again.--More--" and "Your movements are now unencumbered."; this port,
 * plining it ordinarily, was still showing the psi-bolt line.
 *
 * (b) is recorded as an offset in _topl_urgent_marks and honoured by the ESC
 * arm of the flush loop; no corpus message reaches that arm today (this one
 * raises no page at all, because the wipe leaves the topline empty), so it is
 * carried for faithfulness rather than for a measured frame. */
export async function urgent_pline(msg, ...args) {
    const g = game;
    if (args.length > 0)
        msg = nh_sprintf(msg, args);
    if (process.env.FF_MLTRACE === '1')
        pushRngLogEntry(`^topl_urgent[msg=${encodeURIComponent(String(msg).slice(0,96))} stop=${game._topl_win_stop?1:0} armed=${game._topl_win_stop_armed?1:0} plen=${String(game._pending_message||'').length}]`);
    if (g._topl_win_stop) {
        /* tty_clear_nhwindow(WIN_MESSAGE): the topline is cleared and
         * ttyDisplay->toplin goes to TOPLINE_EMPTY, so the message below can
         * neither join nor page it. */
        g._pending_message = '';
        g._topl_joins = [];
        g._topl_joins_src = '';
        g._topl_win_stop = false;
        g._topl_win_stop_buf = null;
    }
    g._topl_win_stop_armed = false;           /* NOSTOP also pre-empts the arm */
    g._topl_urgent_next = true;               /* one-shot; pline() consumes it */
    await pline(msg);
}

/* C invent.c:1950-1953 and invent.c:1989-1993 — getobj()'s TWO cancel arms, and
 * detect.c:1302-1305's copy of the same shape:
 *
 *     if (strchr(quitchars, ilet)) {
 *         if (flags.verbose)
 *             pline1(Never_mind);
 *         return (struct obj *) 0;
 *     }
 *
 * The `flags.verbose` test is C's, and it is LOAD-BEARING, not decoration.  This
 * port has ~10 hand-mirrored copies of getobj's prompt loop (one per caller —
 * throw, drop, wield, quiver, apply, read, drink, wear, adjust, the pickinv
 * menu), and every one of them carried a comment asserting "flags.verbose is On
 * by default and no corpus rc turns it off".  That is FALSE: `OPTIONS=!verbose`
 * is ordinary in the generated corpus (gen040-reseed-seed267324's rc is
 * `OPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen`) and two of the
 * 44 public sessions clear it too — js/do_wear.js:2417 already corrected the
 * identical claim for on_msg/off_msg.
 *
 * With verbose OFF, C returns from getobj SILENTLY, which leaves the getobj
 * PROMPT itself on the topline; this port overwrote it with "Never mind.".  That
 * is a whole-frame miss on every cancelled prompt in every !verbose session.
 *
 * Only the getobj/look-here arms are gated: the Never_mind at cmd.c:3939
 * (get_adjacent_loc), engrave.c:1123/1207, invent.c:5025/5044/5161 (#adjust),
 * music.c:897, steed.c:47, read.c:3092, polyself.c:524, spell.c:768 and
 * wizcmds.c:438/461 are UNCONDITIONAL in C and must stay unconditional here.
 *
 * `!== false` rather than a truthiness test: C's optlist.h default is TRUE, so an
 * absent flags object must speak, not go silent.
 *
 * `qbuf` is the getobj prompt the caller just painted, and it is the SECOND half
 * of the same fact: C never ERASES the prompt when the answer is read — the next
 * erase is cmd.c parse()'s clear_nhwindow(WIN_MESSAGE), which runs AFTER the next
 * top-level command key — while js/input.js nhgetch() drops _pending_message on
 * every read.  So with verbose off the topline must keep showing the PROMPT, not
 * go blank; hand it to the paint-time fallback _topl_sticky, which a live
 * _pending_message still beats (so the verbose Never_mind wins when it fires).
 * js/potion.js:343 and js/cmd.js:13292/13686/7112 already carried this pairing by
 * hand; passing qbuf here is how the remaining getobj copies get it.  Callers
 * that have already set _topl_sticky may omit it. */
export async function getobj_never_mind(qbuf) {
    if (qbuf)
        game._topl_sticky = String(qbuf);
    if (game.flags?.verbose !== false)
        await pline('Never mind.');
}

export async function pline(msg, ...args) {
    if (args.length > 0)
        msg = nh_sprintf(msg, args);
    if (typeof process !== 'undefined' && process.env?.FF_TOPL_TRACE === '1') {
        const _enc = (v) => encodeURIComponent(String(v ?? '').slice(0, 100));
        pushRngLogEntry(`^topl_pline[msg=${_enc(msg)} pending=${_enc(game._pending_message)} stop=${game._topl_win_stop ? 1 : 0} armed=${game._topl_win_stop_armed ? 1 : 0} arrival=${game._arrival_more_suppress ? 1 : 0}]`);
    }
    if (typeof process !== 'undefined' && process.env?.FF_MLTRACE === '1'
        && (String(msg).includes('carrot') || String(msg).includes('see again'))) {
        const _p = String(game._pending_message || ''), _r = String(game._resultMessage || '');
        pushRngLogEntry(`^ml_pline[msglen=${String(msg).length} msghead=${encodeURIComponent(String(msg).slice(0,80))} plen=${_p.length} phead=${encodeURIComponent(_p.slice(0,80))} rlen=${_r.length} rhead=${encodeURIComponent(_r.slice(0,80))} joins=${(game._topl_joins || []).join(',')}]`);
    }
    /* C ref: win/tty/topl.c update_topl:257 —
     *     boolean skip = (cw->flags & (WIN_STOP | WIN_NOSTOP)) == WIN_STOP;
     * With skip set, BOTH arms update gt.toplines and NEITHER draws: the join
     * arm does `Strcat(gt.toplines, bp)` but guards addtopl() with `if (!skip)`
     * (:268), and the fall-through arm skips the whole `else if (!skip)` block
     * and then guards redotoplin() with `if (!skip)` (:300).  So a message
     * plined while WIN_STOP is set never reaches the screen.
     *
     * The one escape hatch is topl.c:298-299 — `if (!notdied) cw->flags &=
     * ~WIN_STOP, skip = FALSE`, i.e. a message starting "You die" cancels the
     * suppression and prints ("avoid suppressing mesg").
     *
     * WIN_STOP is set by more() on an ESC dismiss and cleared by the next
     * tty_nhgetch (js/input.js), so this window is at most one keystroke long.
     * gt.toplines still receives the text, and remember_topl() will carry it to
     * the ^P ring, so record it in the history here — the nhgetch-time capture
     * cannot, because _pending_message is deliberately left untouched. */
    if (game._topl_win_stop) {
        /* C ref: win/tty/topl.c update_topl:257-301, read as ONE flow, because
         * the "You die" escape is NOT unconditional — it hangs off `notdied`,
         * which is assigned inside a SHORT-CIRCUITED condition:
         *
         *     int notdied = 1;
         *     if ((toplin == TOPLINE_NEED_MORE || skip) && cw->cury == 0
         *         && n0 + strlen(gt.toplines) + 3 < CO - 8
         *         && (notdied = strncmp(bp, "You die", 7)) != 0) {
         *         Strcat(gt.toplines, "  "); Strcat(gt.toplines, bp);
         *         if (!skip) addtopl(bp);
         *         return;                       <- JOIN arm
         *     } else if (!skip) { ...more()... }
         *     remember_topl(); strncpy(gt.toplines, bp, TBUFSZ);
         *     if (!notdied) cw->flags &= ~WIN_STOP, skip = FALSE;
         *     if (!skip) redotoplin(gt.toplines);
         *
         * So `notdied` is only ever set to 0 when the message ALSO FIT.  A
         * "You die" that does NOT fit short-circuits before the strncmp,
         * leaves notdied == 1, and therefore does NOT clear WIN_STOP and is
         * NOT drawn.
         *
         * And the length it is measured against is gt.toplines, which KEEPS
         * GROWING while suppressed: the join arm's two Strcat()s run whether or
         * not `skip` is set — only addtopl() is guarded — so every swallowed
         * message that fits is appended to the buffer even though nothing
         * reaches the screen.  `_topl_win_stop_buf` is that buffer; it is
         * deliberately NOT _pending_message, which models what is PAINTED.
         *
         * THE TWO MEASURED CASES, which differ only in that length:
         *  - seed0399-wizard-hallu-actions step 521: the ESC lands on "Your
         *    movements are slowed slightly because of your load.--More--",
         *    "You feel weaker!" (16) is drawn and becomes the buffer, and
         *    "You die..." then FITS (10+16+3 < 72) -> notdied 0 -> WIN_STOP
         *    cleared, the line replaced and drawn, and the "Die?" prompt's own
         *    more() (topl.c:389-391) pages it: C frames 521 and 522 are
         *    "You die...--More--".
         *  - seed4500-knight-coverage step 1786: the ESC lands on "You hit it.
         *    The silver dragon bites!  The silver dragon hits!--More--", and
         *    the dragon/Olog-hai attacks that follow are swallowed but keep
         *    appending, so by the time "You die..." arrives the buffer is long
         *    enough that it does NOT fit -> notdied stays 1 -> WIN_STOP SURVIVES
         *    -> topl.c:390 declines to more() -> C's very next frame is
         *    "Die? [yn] (n)" with no "You die..." page at all.
         * Treating the escape as unconditional cost seed4500 27 step points and
         * 630 RNG leaves; treating it as absent cost seed0399 11. */
        const _txt = String(msg);
        const _buf = (game._topl_win_stop_buf != null)
            ? String(game._topl_win_stop_buf) : String(game._pending_message || '');
        /* C: n0 + strlen(gt.toplines) + 3 < CO - 8, i.e. buf + 2 + msg < 71. */
        const _fits = (_buf.length + 2 + _txt.length) < TOPL_LIMIT;
        const _notdied = (_fits && _txt.startsWith('You die')) ? 0 : 1;
        game._prevmsg = _txt;                 /* pline.c:282 runs regardless */
        if (_fits && _notdied !== 0) {
            /* JOIN arm with skip set: both Strcat()s, no addtopl(). */
            game._topl_win_stop_buf = _buf ? (_buf + '  ' + _txt) : _txt;
            const h = _msg_history_arr();
            if (_txt.length > 0 && (h.length === 0 || h[h.length - 1] !== _txt))
                h.push(_txt);
            return;
        }
        /* Fall-through arm.  `else if (!skip)` is skipped entirely, so there is
         * no more() and no page-ack; gt.toplines is REPLACED. */
        game._topl_win_stop_buf = _txt;
        if (_notdied !== 0) {
            /* skip is still TRUE at :300 -> redotoplin() does not run: the
             * message is buffered and never painted. */
            const h = _msg_history_arr();
            if (_txt.length > 0 && (h.length === 0 || h[h.length - 1] !== _txt))
                h.push(_txt);
            return;
        }
        /* notdied == 0: topl.c:298-299 clears WIN_STOP and sets skip FALSE, so
         * :300 redotoplin()s the new line — drawn, with no --More-- (redotoplin
         * more()s only when cury != 0, and more() left it at 0). */
        game._topl_win_stop = false;
        game._topl_win_stop_buf = null;
        const _old = game._pending_message;
        if (_old && _old.length > 0) {        /* topl.c:289 remember_topl() */
            const h = _msg_history_arr();
            if (h.length === 0 || h[h.length - 1] !== _old)
                h.push(_old);
        }
        game._pending_message = _txt;
        game._topl_joins = [];
        game._topl_joins_src = game._pending_message;
        _maybe_snapshot_painted_screen();
        return;
    } else if (game._topl_win_stop_armed) {
        /* `skip` is a LOCAL sampled at update_topl ENTRY (topl.c:257), so the
         * more() this same call raises at :274 cannot suppress its own message:
         * :300's `if (!skip) redotoplin(...)` still draws it, and only the NEXT
         * message sees the bit.  In this port the two halves of that one C call
         * are two JS calls — force_more() pages the committed topline, then the
         * incoming message arrives as a separate pline() — so the arm-then-fire
         * step is explicit here.
         *
         * Measured on seed0009: read_engr_at pages "Something is engraved here
         * on the floor." and the recorded key is ESC, but C still shows the
         * "You read: ..." line that owned that more().  Firing the bit one
         * message early cost 3 frames there. */
        game._topl_win_stop_armed = false;
        /* C topl.c:298-299: the message that arrives immediately after an
         * ESC-dismissed page is still processed with the old `skip` value.
         * `You die...` is the explicit escape hatch: it clears WIN_STOP and
         * is painted, so the following lifesaving plines can join it on the
         * same topline.  force_more() and pline() are separate JS calls, so
         * release the armed bit before the normal paint path sees this text. */
        if (String(msg).startsWith('You die')) {
            game._topl_win_stop = false;
            game._topl_win_stop_buf = null;
            game._arrival_more_suppress = false;
        }
        const _deathEscape = String(msg).startsWith('You die');
        if (game._arrival_more_suppress && !_deathEscape) {
            game._arrival_more_suppress = false;
            game._topl_win_stop = true;
            return await pline(msg);
        }
        if (!_deathEscape) game._topl_win_stop = true;
    }
    /* C ref: pline.c:266-272 — vpline() recalculates vision BEFORE its
     * flush_screen()/putmesg():
     *
     *     if (gv.vision_full_recalc) {
     *         int tmp_in_pline = in_pline;
     *         in_pline = 0;
     *         vision_recalc(0);
     *         in_pline = tmp_in_pline;
     *     }
     *     if (u.ux) flush_screen(...);
     *     putmesg(line);
     *
     * so the screen a --More-- freezes carries the vision state as of the
     * message, not as of the last world-block recalc.  This port ran
     * vision_recalc only at moveloop_core's own recalc points, which is one
     * world block LATER than the pline in every mid-turn --More-- window.
     *
     * MEASURED on seed0014 step 560 (key "H", a run).  The run's turn unblocks
     * a doorway and sets vision_full_recalc; C's "You stumble." pline recalcs
     * there and its --More-- frame shows the newly-lit lower-left room (10
     * cells over rows 12-18).  This port painted them only at step 561.
     *
     * RNG-free: vision_recalc draws nothing (js/vision.js:725), and it is a
     * no-op unless the flag is already set, so a pline in a turn that dirtied
     * no vision is byte-identical. */
    if (game.vision_full_recalc)
        vision_recalc(0);
    /* C ref: pline.c:273-274 — the flush point this port did not make.
     *
     *     if (u.ux)
     *         flush_screen((gp.pline_flags & NO_CURS_ON_U) ? 0 : 1);
     *     putmesg(line);
     *
     * It is NOT the pager: putmesg() -> update_topl() is what raises the
     * more().  What this flush does is FREEZE the frame that more() then
     * displays, which is why the port grew _pline_flush_frame_record to
     * reconstruct the same frame later from a snapshot.  Making the call is
     * the C-faithful half of that pair; the snapshot machinery is left in
     * place and still supersedes it where it matches, so this step adds the
     * flush point without removing the stand-in (they are reconciled by the
     * ORDER: the flush runs first, so a frame recorded by the putmesg below
     * is recorded AFTER the repaint, exactly as C's is).
     *
     * Corpus measurement (tools/flush-point-diff.mjs --census, 44 public
     * sessions): pline.c:274 is 4,202 C flush points and is the FIRST
     * flush-point divergence in 44 of 44 sessions.
     *
     * The guard is C's, one for one: `if (u.ux)` (no flush before the hero is
     * placed), the suppress_map_output() early return at display.c:2220, and
     * the `static int flushing` reentrancy test at display.c:2226 — all three
     * sit BEFORE patch 012's emit, so a flush C skips is a flush this port
     * must not make either.
     *
     * cursor_on_u: C passes 0 only for NO_CURS_ON_U, which in all of 5.0 has
     * exactly one caller — getpos.c:652's auto_describe custompline. */
    pline_flush_point();
    /* WIN_NOSTOP is a ONE-SHOT (wintty.c:2300).  Record the urgent message's
     * TEXT so the flush loop's ESC arm can find it among the messages still
     * standing on the accumulated topline.  Deliberately the text and not an
     * offset: the flush loop's string is re-composed from _resultMessage plus
     * the pending line and does not share pline()'s base — a 54-column prefix
     * from an earlier page made an offset point at the wrong message. */
    const _urgentNow = !!game._topl_urgent_next;
    game._topl_urgent_next = false;
    let prev = game._pending_message;
    let adoptedResult = false;
    /* C's tty has one topline buffer.  A completed command's message therefore
     * remains the prefix when the first movemon message for that same turn
     * arrives.  Most timed commands take the incomingMove merge in allmain,
     * but a page held across input can reach this first fresh pline with the
     * command result still in our separate result channel.  Merge it here
     * before the normal per-pline join instead of letting flush_screen prefer
     * the live suffix and strand the command result until a later world event.
     *
     * C ref: win/tty/topl.c update_topl() appends `bp` to gt.toplines when the
     * pair fits its CO-1-8 reserve.  gen362's painful kick is the observed
     * case: "Ouch!  That hurts!" must prefix the following barrow-wight swing.
     */
    if ((!prev || prev.length === 0) && game._resultMessage
        && game._resultMessage !== msg) {
        const result = String(game._resultMessage);
        const joins = game._resultMessageJoins?.src === result
            ? game._resultMessageJoins.joins : _topl_joins_snapshot(result);
        /* This incoming pline is what makes C's already-painted `result`
         * overflow.  pline_flush_point() above has just repainted the physical
         * map/status at the incoming message's instant; retain that frame at
         * the result boundary before folding the two JS buffers together.
         *
         * The no-adoption fresh-message arm below already records this same
         * boundary.  This arm used to skip it, so the pager fell back to an
         * earlier whole-turn frame.  gen413 step 1323 is the measured case:
         * newuhs() prints "You feel weak.", commits WEAK and SET_BOTL, then
         * encumber_msg's incoming pline raises More.  C's second-pline flush
         * paints Weak; the fallback retained Hungry from the first pline. */
        _pline_flush_frame_record(result.length, String(msg));
        const joined = _topl_merge_result(result, String(msg), joins || undefined);
        game._resultMessage = null;
        game._resultMessageJoins = null;
        game._pending_message = joined;
        prev = joined;
        adoptedResult = true;
    }
    if (!prev || prev.length === 0)
        game._topl_urgent_marks = [];   /* a fresh topline; drop stale entries */
    if (_urgentNow)
        (game._topl_urgent_marks ||= []).push(String(msg));
    if (prev && prev.length > 0) {
        /* The result-channel merge above has already appended this message. */
        if (adoptedResult) {
            // keep the join record created by _topl_merge_result()
        } else {
        const joined = prev + '  ' + msg;
        // Record the JOIN offset (the index of the "  " separator within the
        // resulting topline) so the per-pline update_topl reserve rule can split
        // ONLY at genuine message boundaries — never at a "  " that lies inside a
        // single atomic pline (e.g. the 72-col welcome line).  C ref:
        // win/tty/topl.c — each pline()→update_topl() makes an independent
        // fit/more() decision per message, not per "  " in the rendered text.
        _topl_record_join(prev, joined);
        game._pending_message = joined;
        }
    } else {
        // First message of a new world block on top of a committed command
        // result: record the flushed frame for the boundary it opens (see
        // _pline_flush_frame_record).  No-op when there is no separate result
        // line to page ahead of it.
        const _res = game._resultMessage;
        if (_res && _res !== msg)
            _pline_flush_frame_record(_res.length, String(msg));
        game._pending_message = msg;
    }
    /* C ref: pline.c:282 — `(void) strncpy(gp.prevmsg, line, BUFSZ)`, run after
     * putmesg() on EVERY message that is actually shown.  gp.prevmsg is the sole
     * state Norep()'s no-repeat test reads (pline.c:255,
     * `msgtyp == MSGTYP_NOREP && !strcmp(line, gp.prevmsg)`), so an ordinary
     * pline between two identical Norep()s makes the second one print again.
     * Note it stores `line` — the single message — not the joined topline. */
    // C vpline clears the previous-message classification after putmesg.
    if (game.iflags) game.iflags.last_msg = 0; // PLNMSG_UNKNOWN
    game._prevmsg = String(msg);
    /* update_topl/redotoplin leave a newly shown message in TOPLINE_NEED_MORE.
     * Keep that state distinct from _pending_message, which also carries
     * command snapshots and prompt echoes that need no acknowledgement. */
    game._topl_unacknowledged = true;
    _maybe_snapshot_painted_screen();
}
/* C ref: pline.c:330-337 Norep(fmt, ...) — vpline() with PLINE_NOREPEAT.  The
 * suppression test is pline.c:255, `msgtyp == MSGTYP_NOREP && !strcmp(line,
 * gp.prevmsg)`: it compares against gp.prevmsg, the last message shown by ANY
 * pline, and on a match C `goto pline_done` — nothing is drawn AND prevmsg is
 * not refreshed.  js/cmd.js has a private _norep() that writes
 * _pending_message directly; this one goes through pline() so the message
 * JOINS the topline the same way every other message does, which is what
 * zap_over_floor's water messages need (they land mid-ray, after "You kill
 * it!" and before "The blast of fire hits it!").
 *
 * Measured on seed4500 step 997: a fire breath crosses TWO water squares and
 * C's second "You hear hissing gas." is suppressed here, so the third slot on
 * that topline belongs to the monster-hit message.  Without the suppression
 * this port printed the line twice and pushed the hit message off the frame. */
export async function Norep(msg, ...args) {
    const text = (args.length > 0) ? nh_sprintf(msg, args) : String(msg);
    if (game._prevmsg === text)
        return;
    await pline(text);
}

/* ─────────────────────────────────────────────────────────────────────────
 * C ref: pline.c:435-467 You_hear(line, ...) and You_see(line, ...).
 *
 * THE ONE BODY for each.  C has 144 call sites for You_hear and js/ had grown
 * ELEVEN hand-derived versions of it, no two of which agreed:
 *   js/mklev.js      threw 'not yet ported: You_hear'   (a live halt)
 *   js/cmd.js        bhp_You_hear threw the same
 *   js/uhitm.js      silent no-op — C prints, we printed NOTHING
 *   js/trap.js       silent no-op, same
 *   js/dig.js
 *   js/fastforward.js
 *   js/shk.js        printed unconditionally, with no guard at all
 *   js/cmd.js        flooreffects_You_hear, same
 *   js/vault.js      gated on Deaf only; no acoustics test, no prefixes
 *   js/makemon.js    prefixes only, no guard, and Unaware read as u.usleep
 *   js/were.js       full guard, but invented Unaware = (usleep || uunaware),
 *                    dropping C's `gm.multi < 0` conjunct entirely
 *   js/dokick.js     full guard, but hardcoded unaware = false
 *   js/cmd.js        _goto_level_You_hear — the only faithful one; this is it
 * plus a twelfth prefix-only copy at js/trap.js _you_hear_prefix.
 *
 * The C guard, verbatim:
 *     if ((Deaf && !Unaware) || !flags.acoustics)
 *         return;
 *     if (Underwater)   YouPrefix(tmp, "You barely hear ", line);
 *     else if (Unaware) YouPrefix(tmp, "You dream that you hear ", line);
 *     else              YouPrefix(tmp, "You hear ", line);   /* Deaf-aware * /
 *     vpline(strcat(tmp, line), the_args);
 * Note what the copies that gate on Deaf alone get wrong: a Deaf AND Unaware
 * hero DOES print — that is what C's own "Deaf-aware" comment marks — because
 * the early return needs BOTH `Deaf` and `!Unaware`.
 *
 * The predicates, and why these spellings:
 *   Deaf       youprop.h:125  (HDeaf || EDeaf || u.uroleplay.deaf).  _live_deaf()
 *              above is this port's measured-live reading: HDeaf is the FLAT
 *              u.HDeaf slot (js/allmain.js nh_timeout_deaf counts it down,
 *              js/eat.js and js/music.js's leather drum set it), NOT
 *              u.uprops[DEAF], which has no writer anywhere in js/ — four of
 *              the copies above read that dead slot, so their guard could
 *              never fire.  The status-line Deaf condition reads the same
 *              _live_deaf(), and it is validated against C on every step of
 *              every session (seed0002 step 582 onward is the drum case).
 *   Unaware    youprop.h:399  gm.multi < 0 && (unconscious() || is_fainted())
 *   Underwater youprop.h:279  u.uinwater
 *   Blind      youprop.h:103  ((HBlinded || EBlinded) && !BBlinded) — _disp_Blind()
 *   flags.acoustics  has no initialiser in this port and C optlist.h:143 gives
 *              it initval On, so an ABSENT value must read as On; reading it
 *              as Off would silence every You_hear in the game.
 *
 * Formatting goes through pline's own nh_sprintf exactly as C's vpline does,
 * and only when there ARE varargs — a pre-formatted line containing a literal
 * '%' must not be run through a conversion pass.  RNG-free: every leaf here is
 * a state read or string formatting.
 * ───────────────────────────────────────────────────────────────────────── */
/* C youprop.h:399 `#define Unaware (gm.multi < 0 && (unconscious() || is_fainted()))`.
 * Exported so callers outside this file read the SAME predicate rather than
 * growing another private approximation of it (js/mhitm.js:4219's copy tests
 * u.Stunned and an UNCONSCIOUS intrinsic, neither of which is in the C).
 * RNG-free. */
export function Unaware() {
    if ((game.multi | 0) >= 0)
        return false;
    return !!(unconscious() || is_fainted());
}
export async function You_hear(line, ...args) {
    const unaware = Unaware();
    if ((_live_deaf() && !unaware) || !(game.flags?.acoustics ?? true))
        return;
    const prefix = game.u?.uinwater ? 'You barely hear '
                 : unaware ? 'You dream that you hear '
                 : 'You hear ';
    return pline(prefix + String(line), ...args);
}
/* C ref: pline.c:454-468 You_see(line, ...) — the same shape with no guard:
 *     if (Unaware)     YouPrefix(tmp, "You dream that you see ", line);
 *     else if (Blind)  YouPrefix(tmp, "You sense ", line);
 *     else             YouPrefix(tmp, "You see ", line);
 * C's own comment on the Blind arm is "caller should have caught this...". */
export async function You_see(line, ...args) {
    const prefix = Unaware() ? 'You dream that you see '
                 : _disp_Blind() ? 'You sense '
                 : 'You see ';
    return pline(prefix + String(line), ...args);
}
// ── topline_set ──
// C ref: tty topline write — exact text at line 0, no color, no More.
// Used by doextcmd echo and similar inline-echo paths where the C output
// is literal text (no pline newline / status suffix). W18.4 sub-task B.
// W18.2 #name echo: pline('#') currently works since pline just sets
// _pending_message; if exact byte output diverges, switch to topline_set.
export async function topline_set(text) {
    const out = (text != null) ? String(text) : '';
    game._pending_message = out;
    game._topline = out;
}

// ── Visibility predicates ──
// C ref: display.h:92-95 _mon_visible macro (the #else without mburied/uburied)
// Returns true if the hero can see the monster (not invisible, not undetected).
// Note: does NOT check whether the hero can see the monster's location.
// display.h:93: (!mon->minvis || See_invisible) && !mon->mundetected
export function mon_visible(mon) {
    if (!mon) return false;
    const u = game.u || {};
    /* youprop.h:152  See_invisible = HSee_invisible || ESee_invisible
     * uprops is indexed numerically by the property constant (see _uprop
     * above); u.see_invis is the mirrored scalar some writers use instead. */
    const siP = _uprop(SEE_INVIS);
    const see_invis = !!(siP.i || siP.e);
    if (mon.minvis && !see_invis) return false;
    if (mon.mundetected) return false;
    return true;
}

// C ref: display.h:106-108 _see_with_infrared macro
//   (!Blind && Infravision && infravisible(mon->data) && couldsee(mon->mx, mon->my))
// Infravision (youprop.h:186) = HInfravision || EInfravision; racial infravision
// (orc/elf/dwarf/gnome) is the INTRINSIC bit, set by set_uasmon() at u_init
// (polyself.c:92 PROPSET(INFRAVISION, infravision(&mons[urace.mnum]))).
export function see_with_infrared(mon) {
    if (!mon) return false;
    const u = game.u || {};
    /* u.uprops is keyed by numeric prop index (prop.h): BLINDED=15, INFRAVISION=36. */
    const blindP = u.uprops?.[BLINDED];
    const blind = !!(blindP && (blindP.intrinsic || blindP.extrinsic));
    if (blind) return false;
    const infraP = u.uprops?.[INFRAVISION];
    const infravision = !!(infraP && (infraP.intrinsic || infraP.extrinsic));
    if (!infravision) return false;
    /* infravisible(mon->data): monster is warm-blooded (M3_INFRAVISIBLE). */
    if (!infravisible_mon(mon)) return false;
    /* couldsee(mon->mx, mon->my): hero has line-of-sight to the monster's cell. */
    return !!couldsee(mon.mx | 0, mon.my | 0);
}

/* C ref: worm.c:877-891 worm_known(worm) — "Is any segment of this worm in
 * viewing range?"  C walks wtails[worm->wormno]'s segment chain and returns
 * TRUE for the first segment with cansee(seg->wx, seg->wy).
 *
 * js/worm.js keeps wtails/wheads module-private (worm.c does the same, "It
 * is located here for modularity") and exports only the position->worm
 * reverse lookup its m_at() gap needed, worm_seg_at(x,y) (imported above,
 * see js/uhitm.js m_at's "THE MAP-GRID GAP" note in js/worm.js).  That
 * reverse map's key set is exactly the worm's currently-occupied segment
 * squares, so scanning the map for a cansee()'d square whose occupant is
 * THIS worm computes the identical predicate as C's forward chain walk —
 * addressed from the other direction because the chain itself is not
 * reachable from this file.
 *
 * Was previously a stub returning false unconditionally ("long worms not in
 * corpus"), which the corpus falsifies: rng-trace record #243
 * (probe-reach-zap__gen028-objective-seed91053) has the hero, polymorphed,
 * attacking a wormno=1 monster whose tail IS visible in C, so C's
 * attack_checks() proceeds into hmonas/passive/mhitm_knockback (5 draws)
 * while this stub forced attack_checks() into the "can't see it" early
 * return (0 draws). */
function worm_known(mon) {
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 0; x < COLNO; x++) {
            if (worm_seg_at(x, y) === mon && cansee(x, y)) return true;
        }
    }
    return false;
}

// C ref: display.h:117-120 _canseemon macro
// Checks hero can see the monster's location AND mon_visible.
// canseemon = (wormno ? worm_known : (cansee(mx,my) || see_with_infrared)) && mon_visible
export function canseemon(mon) {
    if (!mon) return false;
    /* C vision.c's Blind recalc clears IN_SIGHT everywhere, so the normal
     * cansee() half of display.h's macro cannot expose a monster while blind.
     * Keep that invariant here too: a stale viz_array must not make ray-miss
     * feedback name a monster the blind hero cannot see.  Sensing remains in
     * canspotmon(), exactly as C keeps it separate from canseemon(). */
    if (_disp_Blind()) return false;
    if (!mon_visible(mon)) return false;
    if (mon.wormno) {
        return worm_known(mon);
    }
    const mx = mon.mx | 0, my = mon.my | 0;
    return !!(cansee(mx, my) || see_with_infrared(mon));
}

// C ref: hack.h:1536-1537 distu(xx,yy)/mdistu(mon) — squared distance to hero.
function distu_sensemon(x, y) {
    const u = game.u || {};
    const dx = x - (u.ux | 0), dy = y - (u.uy | 0);
    return dx * dx + dy * dy;
}
// C ref: rm.h is_pool(x,y) — POOL/MOAT/WATER/DRAWBRIDGE_UP.
function is_pool_sensemon(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    return t === POOL || t === MOAT || t === WATER || t === DRAWBRIDGE_UP;
}

/* C mondata.h mindless(ptr) — (ptr->mflags1 & M1_MINDLESS) != 0.
 * C monflag.h:101 M1_MINDLESS 0x00010000L. */
const M1_MINDLESS_DISP = 0x00010000;
function _tp_mindless(mon) {
    /* mon->data is how this file already reads permonst flags (see
     * MATCH_WARN_OF_MON's mflags2 read below).  A record with no .data yields
     * 0 here, i.e. "not mindless" — the same answer the un-tested comment gave
     * before, so a missing permonst cannot make this term newly wrong. */
    return (((mon && mon.data && mon.data.mflags1) | 0) & M1_MINDLESS_DISP) !== 0;
}
// C ref: display.h:41-50 _tp_sensemon macro
//   !mindless(mon->data)
//   && ((Blind && Blind_telepat) || (Unblind_telepat && mdistu(mon) <= u.unblind_telepat_range))
// Blind_telepat = HTelepat||ETelepat; Unblind_telepat = ETelepat (youprop.h:154-157).
// Returns 1 (true) if hero can sense mon via telepathy, 0 (false) otherwise.
// WIRE_PENDING: port-gen-tp_sensemon-001
export function tp_sensemon(mon) {
    if (!mon) return 0;
    const u = game.u || {};

    /* C display.h:44 — `!mindless(mon->data)`, i.e. mondata.h's
     * `(ptr->mflags1 & M1_MINDLESS) != 0`.  This was a COMMENT saying "for now,
     * assume corpus monsters are not mindless", which is exactly the term that
     * decides a graveyard: zombies and mummies ARE M1_MINDLESS and a
     * telepathic hero senses neither, while the ghosts and wraiths beside them
     * are sensed.  Assuming the term away paints the mindless ones too. */
    const mnum = mon.mnum | 0;
    if (mnum < 0) return 0; // Invalid monster number
    if (_tp_mindless(mon)) return 0;

    /* Blind_telepat = HTelepat|ETelepat, Unblind_telepat = ETelepat
     * (youprop.h:154-157).  u.uprops is keyed by the NUMERIC prop index
     * everywhere in this port that WRITES it — js/do_wear.js's setworn family
     * does `u.uprops[MKOBJ_OC_OPROP[otyp]]`, and MKOBJ_OC_OPROP yields 30.
     * These three reads asked for the STRING keys `u.uprops.TELEPAT` /
     * `u.uprops.BLINDED` instead, which nothing has ever written, so
     * tp_sensemon returned 0 for a hero WEARING AN AMULET OF ESP.  The numeric
     * form is added; the string spellings are kept (as sensemon() below
     * already keeps them for DETECT_MONSTERS) so any writer using them is
     * still honoured. */
    const blindP = _uprop(BLINDED), telP = _uprop(TELEPAT);
    const blind = !!(blindP.i || blindP.e);
    const blind_telepat = !!(telP.i || telP.e);
    const unblind_telepat = !!telP.e;

    // Must have some form of telepathy
    if (!blind_telepat && !unblind_telepat) return 0;

    // Check: (Blind && Blind_telepat) || (Unblind_telepat && mdistu <= range)
    if (blind && blind_telepat) return 1;
    if (unblind_telepat) {
        const range = (u.unblind_telepat_range | 0);
        return distu_sensemon(mon.mx | 0, mon.my | 0) <= range ? 1 : 0;
    }
    return 0;
}

// C ref: display.h:55-58 _sensemon macro
//   (   (!u.uswallow || (mon) == u.ustuck)
//    && (!Underwater || (mdistu(mon) <= 2 && is_pool((mon)->mx, (mon)->my)))
//    && (Detect_monsters || tp_sensemon(mon) || MATCH_WARN_OF_MON(mon))   )
// MATCH_WARN_OF_MON not modeled for corpus heroes (needs context.warntype + mon->data->mflags2).
export function sensemon(mon) {
    if (!mon) return false;
    const u = game.u || {};
    /* (!u.uswallow || mon == u.ustuck) */
    if (u.uswallow && mon !== u.ustuck) return false;
    /* (!Underwater || (mdistu(mon) <= 2 && is_pool(mon->mx, mon->my))); Underwater = u.uinwater */
    if (u.uinwater) {
        const md = distu_sensemon(mon.mx | 0, mon.my | 0);
        if (!(md <= 2 && is_pool_sensemon(mon.mx | 0, mon.my | 0))) return false;
    }
    /* Detect_monsters = HDetect_monsters || EDetect_monsters (youprop.h:190).
     * The uprops slot is keyed by the NUMERIC property index everywhere it is
     * written (_uprop(DETECT_MONSTERS) at display.js:1356 is the same read);
     * the two string-key spellings below are the dead ones this port carries in
     * several places, kept so a writer that uses them is still honoured.  The
     * live writer is detect.c monster_detect's `EDetect_monsters |= I_SPECIAL`
     * (js/potion.js), which is what makes C name a DETECTED monster in
     * browse_map's autodescribe instead of calling it "it". */
    const detect_monsters = !!(u.uprops?.[DETECT_MONSTERS]?.intrinsic
        || u.uprops?.[DETECT_MONSTERS]?.extrinsic);
    if (detect_monsters) return true;
    /* C display.h:58 — `tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)`.  This
     * used to be a SECOND, hand-inlined copy of the tp_sensemon macro that had
     * drifted from the one above: it read the dead string uprops keys and
     * dropped the !mindless(mon->data) term entirely (its comment said "for
     * corpus heroes this path is never reached").  Call the one body. */
    return !!(tp_sensemon(mon) || MATCH_WARN_OF_MON(mon));
}

// C ref: display.h:129 canspotmon = canseemon || sensemon
export function canspotmon(mon) {
    return canseemon(mon) || sensemon(mon);
}

// C ref: botl.c:304-318 xlev_to_rank — convert experience level to rank index
// Maps experience level (1..30) to rank index (0..8) using a piecewise formula.
// 1..2 => 0; 3..5 => 1; 6..9 => 2; 10..13 => 3; ... 26..29 => 7; 30 => 8
export function xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
}

// C ref: botl.c:321-336 rank_to_xlev — convert rank index to experience level
// Inverse of xlev_to_rank: maps rank index (0..8) to the low end of each experience level range.
// 0 => 1; 1 => 3; 2 => 6; 3 => 10; ... 7 => 26; 8 => 30
export function rank_to_xlev(rank) {
    return (rank < 1) ? 1 : (rank < 2) ? 3 : (rank < 8) ? ((rank * 4) - 2) : 30;
}

// C ref: botl.c:40-46 check_gold_symbol — determine if gold symbol is invisible
// Reads the gold (COIN_CLASS) symbol from gs.showsyms and sets iflags.invis_goldsym
// to true if the symbol is a control character or space (ASCII <= 32).
// gs.showsyms is an array indexed by object class symbol offset (SYM_OFF_O + COIN_CLASS).
// MAXPCHARS=105, so SYM_OFF_O=105, and COIN_CLASS=12 means index=117.
// However, during initialization gs.showsyms is null, so we use the default symbol '$'.
export function check_gold_symbol() {
    const g = game || {};
    // gs.showsyms[SYM_OFF_O + COIN_CLASS] = gs.showsyms[105 + 12] = gs.showsyms[117]
    // nhsym goldch = gs.showsyms[COIN_CLASS + SYM_OFF_O];
    // Default COIN symbol is '$' (ASCII 36) from defsym.h OBJCLASS(12, '$', COIN, ...)
    const showsyms = gs.showsyms;
    let goldch;
    if (showsyms && showsyms.length > 117) {
        // If showsyms is initialized, read the actual symbol
        const sym = showsyms[117];
        goldch = (typeof sym === 'number') ? sym : (typeof sym === 'string' ? sym.charCodeAt(0) : 36);
    } else {
        // Use default: '$' is ASCII 36
        goldch = 36;
    }
    if (!g.iflags) g.iflags = {};
    g.iflags.invis_goldsym = (goldch <= 32); // goldch <= ' ' (space, ASCII 32)
}

// C ref: display.c:719-723 suppress_map_output — check if map output should be suppressed
// Wrapper around the _suppress_map_output() macro from display.c:710-717.
// Returns 1 (true) if map output should be suppressed due to level creation, saving,
// or restoring; 0 (false) otherwise. During normal corpus gameplay, typically returns 0.
export function suppress_map_output() {
    const g = game || {};
    const program_state = g.program_state || {};
    // UNIX recorder build defines HANGUPHANDLING (global.h).
    return (g.in_mklev || program_state.saving || program_state.restoring
        || program_state.done_hup) ? 1 : 0;
}

// C ref: display.c:1726-1730 curs_on_u
// Put the cursor on the hero.  Flush all accumulated glyphs before doing it.
export function curs_on_u() {
    flush_screen(1); /* Flush waiting glyphs & put cursor on hero */
}

// ── newsym_force and the gnew repaint residue ────────────────────────────────
//
// C ref: display.c:1178-1186
//     newsym_force(coordxy x, coordxy y)
//     {
//         newsym(x, y);
//         gg.gbuf[y][x].gnew = 1;
//         if (gg.gbuf_start[y] > x) gg.gbuf_start[y] = x;
//         if (gg.gbuf_stop[y]  < x) gg.gbuf_stop[y]  = x;
//     }
//
// newsym_force differs from newsym only in that it sets `gnew` unconditionally,
// so flush_screen() repaints the cell even when its glyph did not change.  The
// repainted glyph is byte-identical, so on the cell grid this is invisible — but
// it is NOT invisible on the cursor.  flush_screen (display.c:2318-2340) walks
// the dirty cells ROW-MAJOR (y outer 0..ROWNO-1, x inner over
// gbuf_start[y]..gbuf_stop[y]) and print_glyph -> tty_print_glyph does
// tty_curs(WIN_MAP, x, y) (wintty.c:2058, `cw->curx = --x`, so screen column
// x-1) followed by g_putch(), which advances the cursor one column.  With
// cursor_on_u == 0 flush_screen does NOT move it back to the hero
// (display.c:2343-2344), so the tty cursor is left at screen column x, screen
// row y+1 for the LAST cell repainted — i.e. the largest y, and within it the
// largest x.
//
// This port has no gbuf/gnew dirty set: every other repaint path writes through
// show_glyph_cell and then positions the cursor explicitly, so the residue is
// unobservable there.  The one place it IS observable is a forced repaint of
// cells whose glyphs do not change — getpos_sethilite's selection_force_newsyms
// (getpos.c:60-62 via selvar.c:801-810), whose caller then reads a key with the
// cursor still sitting where the repaint left it.  Measured: seed4500 step 195
// (`#jump\n`), cells byte-identical, C cursor [38,16] against this port's
// [36,14] (the hero) — 38 = the largest map x among the valid knight's-jump
// targets on the largest such map y (15), and 16 = 15 + 1.
//
// Tracked here as the row-major maximum of the forced cells; flush_screen
// consumes it, which is also where C clears gnew.
let _forced_gnew = null; /* {x, y} in MAP coordinates, or null */

export function newsym_force(x, y) {
    newsym(x, y);
    if (!_forced_gnew || y > _forced_gnew.y
        || (y === _forced_gnew.y && x > _forced_gnew.x))
        _forced_gnew = { x: x | 0, y: y | 0 };
}

// C ref: display.c:2330 `gptr->gnew = 0` — the flag is cleared by the repaint,
// so the residue applies to exactly one flush_screen.  Returns the screen
// [col, row] that repaint leaves the cursor at, or null when nothing was forced.
/* True when the LAST flush_screen() left the cursor where its repaint loop put
 * it (a forced-gnew cell) rather than at _buildScreenOutput's default.  Read by
 * getpos(), which models C's `curs(WIN_MAP, cx, cy); flush_screen(0)` pair. */
let _last_flush_forced_cursor = false;
export function last_flush_forced_cursor() {
    return _last_flush_forced_cursor;
}

export function _take_forced_gnew_cursor() {
    const f = _forced_gnew;
    _forced_gnew = null;
    return f ? [f.x, f.y + 1] : null;
}

/* C ref: display.c:721-731 feel_newsym(x, y) — when the hero knows what happened
 * at a location even while blind.  The Blind test used to read `game.u.Blind`,
 * a field no code in this port ever assigns, so this always took the newsym()
 * arm; it now reads the same uprops[BLINDED] triple C's Blind macro does. */
export function feel_newsym(x, y) {
    if (_disp_Blind())
        feel_location(x, y);
    else
        newsym(x, y);
}

/* C ref: display.c:1571-1587 see_objects() — redraw every floor object that is
 * the top of its pile.  Called by make_hallucinated() (potion.c:427) when
 * hallucination toggles, so that the random_obj_to_glyph() substitution takes
 * effect on already-displayed objects.
 *
 *     for (obj = fobj; obj; obj = obj->nobj)
 *         if (vobj_at(obj->ox, obj->oy) == obj)
 *             newsym(obj->ox, obj->oy);
 *     update_inventory();
 *
 * RNG-FREE on the scored stream: the only randomness newsym() reaches under
 * hallucination is rn2_on_display_rng(), the separate DISPLAY rng.
 * update_inventory() is C's persistent-inventory hook and is a no-op here (no
 * perm_invent window), so it is left to the caller, which is what the two
 * existing JS see_* siblings above do. */
export function see_objects() {
    cosmic_push_owner_real("see_objects");
    for (let obj = game.fobj; obj; obj = obj.nobj ?? null) {
        if (vobj_at(obj.ox, obj.oy) === obj)
            newsym(obj.ox, obj.oy);
    }
    cosmic_pop_owner_real("see_objects");
}

// C ref: display.c:1648-1662 see_traps — update hallucinated traps
export function see_traps() {
    cosmic_push_owner_real("see_traps");

    for (let trap = game.ftrap; trap; trap = trap.ntrap) {
        const loc = game.level?.at(trap.tx, trap.ty);
        if (!loc) continue;
        // C tests the displayed glyph's class, not its character: a
        // hallucinated object can use the same symbol as a trap.
        if (loc.disp_cls === GLYPHCLS_TRAP)
            newsym(trap.tx, trap.ty);
    }
    cosmic_pop_owner_real("see_traps");
}

/* C youprop.h:103 Blind = ((HBlinded || EBlinded) && !BBlinded).  Same triple
 * the status-line "Blind" condition (above) reads; feel_newsym used to test
 * `game.u.Blind`, a field nothing in this port ever assigns, so it always took
 * the sighted newsym() arm. */
function _disp_Blind() {
    const u = game.u;
    if (!u) return false;
    const bp = u.uprops && u.uprops[BLINDED];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
            && !(bp.blocked | 0);
}

/* C ref: hack.c m_at(x, y). */
function _m_at(x, y) {
    for (let m = game.fmon; m != null; m = m.nmon) {
        if (m._mapRemoved) continue;
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at reads the grid, which m_detach cleared */
        if (m.mx === x && m.my === y)
            return m;
    }
    /* C's m_at() is ONE read of svl.level.monsters[x][y] (rm.h:534), and that
     * grid holds a long worm's TAIL SEGMENTS as well as its head: worm.c's
     * place_worm_seg() (rm.h:533) writes the worm itself into every segment
     * square.  The fmon walk above cannot see them — a segment is not an fmon
     * entry — so C's single lookup is two here, exactly as js/uhitm.js m_at()
     * already spells it (see THE MAP-GRID GAP in js/worm.js).
     *
     * Without this second half every caller of C's m_at() in this file was
     * blind to a worm's body: newsym() found no monster on a tail square and
     * fell through to _map_location(), i.e. it painted the FLOOR under the
     * tail.  MEASURED on gen028-reseed-seed1155683 / gen345-reseed-seed244908
     * (corpus-generated/v5/train), both at step 42: C draws `~~` at map
     * <31,14> and <32,14> for the two tail segments of the long worm whose
     * head is at <32,15>, and this port drew room floor on both.  Those two
     * cells were the sessions' FIRST screen miss and the whole of it — the
     * segments themselves are placed on the right squares with the right
     * draws (place_worm_tail_randomly ran and its rnd_nextto_goodpos calls are
     * in the stream), so this was never a level-generation fault, only a
     * display one. */
    return worm_seg_at(x, y);
}

/* C ref: mkobj.c sobj_at(otyp, x, y) — first object of that type in the pile. */
function _sobj_at(otyp, x, y) {
    for (let o = vobj_at(x, y); o; o = o.nexthere ?? null)
        if ((o.otyp | 0) === otyp)
            return o;
    return null;
}
const BOULDER_OTYP = 475; /* objects.h BOULDER (js/cmd.js:8911, js/m_initweap.js:141) */

/*
 * C ref: engrave.c:186-214 can_reach_floor(check_pit).
 *   u.uswallow || (u.ustuck && !sticks && attacktype(AT_HUGS))
 *   || (Levitation && !(Is_airlevel || Is_waterlevel))          -> FALSE
 *   u.usteed && P_SKILL(P_RIDING) < P_BASIC                     -> FALSE
 *   u.uundetected && ceiling_hider                              -> FALSE
 *   Flying || msize >= MZ_HUGE                                  -> TRUE
 *   check_pit && teetering/escaped-shaft                        -> FALSE
 *   otherwise                                                   -> TRUE
 * feel_location's only call passes check_pit = FALSE, so the trap arm is not
 * reachable from here.  The AT_HUGS / uundetected / MZ_HUGE arms need
 * attacktype+ceiling_hider+youmonst.data, none of which this file carries; no
 * corpus hero is swallowed-and-blind or a huge poly form, so they are left to
 * the TRUE fall-through and named here rather than silently dropped.
 */
function _feel_can_reach_floor() {
    const u = game.u || {};
    if (u.uswallow)
        return false;
    const lp = u.uprops && u.uprops[LEVITATION];
    const levitating = !!lp && !!((lp.intrinsic | 0) || (lp.extrinsic | 0))
                       && !(lp.blocked | 0);
    if (levitating && !Is_waterlevel(u.uz))
        return false;   /* Is_airlevel is not modelled here; no corpus air level */
    /* C: u.usteed && P_SKILL(P_RIDING) < P_BASIC.  weapon.c skill state is not
     * reachable from display.c; a mounted corpus hero (the knight) has basic
     * riding, so this yields TRUE either way. */
    return true;
}

/* C ref: engrave.c:296-315 engr_can_be_felt(ep) — ENGRAVE/HEADSTONE/BURN. */
const ENGR_DUST = 1, ENGR_ENGRAVE = 2, ENGR_BURN = 3, ENGR_HEADSTONE = 6;
function _engr_can_be_felt(ep) {
    const t = ep.engr_type | 0;
    return t === ENGR_ENGRAVE || t === ENGR_HEADSTONE || t === ENGR_BURN;
}

/*
 * C ref: display.c:736-909 feel_location(x, y)
 *
 * Feel the given location.  This assumes that the hero is blind and that the
 * given position is either the hero's or one of the eight adjacent squares
 * (except for a boulder push).
 */
export function feel_location(x, y) {
    let boulder, mon, ep;

    /* replicate safeguards used by newsym(); might not be required here.
     * C _suppress_map_output() = gi.in_mklev || saving || restoring; this port
     * has game.in_mklev and no save/restore re-entry on the display path. */
    if (game.in_mklev)
        return;
    if (!isok(x, y))
        return;
    const lev = game.level?.at(x, y);
    if (!lev)
        return;
    /* If hero's memory of an invisible monster is accurate, we want to keep
     * him from detecting the same monster over and over again on each turn. */
    if (lev.remembered_glyph?.cls === GLYPHCLS_INVIS && _m_at(x, y))
        return;

    /* The hero can't feel non pool locations while under water
       except for lava and ice. */
    if (game.u?.uinwater && !Is_waterlevel(game.u?.uz)) {
        const typ = lev.typ | 0;
        const pool_or_lava = (typ === POOL || typ === MOAT || typ === WATER
                              || typ === LAVAPOOL || typ === LAVAWALL);
        if (!pool_or_lava && typ !== ICE)
            return;
    }

    /* Set the seen vector as if the hero had seen it.
       It doesn't matter if the hero is levitating or not.
       C display.c:3369-3377 set_seenv(lev, u.ux, u.uy, x, y). */
    {
        const ux = game.u?.ux | 0, uy = game.u?.uy | 0;
        const dx = x - ux, dy = uy - y;
        const sgn = (z) => (z < 0 ? -1 : (z !== 0 ? 1 : 0));
        lev.seenv = (lev.seenv | 0) | SEENV_MATRIX[sgn(dy) + 1][sgn(dx) + 1];
    }

    if (!_feel_can_reach_floor()) {
        /*
         * Levitation Rules.  The hero can feel the state of the walls around
         * herself and can tell if she is in a corridor, room, or doorway.
         * Boulders are felt because they are large enough.  Anything else is
         * unknown because the hero can't reach the ground.
         *
         * Check (and display) in order: stone/walls/closed doors; boulders;
         * doors; room/water positions; everything else (hallways).
         */
        const typ = lev.typ | 0;
        if (IS_OBSTRUCTED(typ)
            || (IS_DOOR(typ) && ((lev.doormask | 0) & (D_LOCKED | D_CLOSED)))) {
            map_background(x, y, 1);
        } else if ((boulder = _sobj_at(BOULDER_OTYP, x, y)) !== null) {
            map_object(boulder, 1);
        } else if (IS_DOOR(typ)) {
            map_background(x, y, 1);
        } else if (IS_ROOM(typ) || IS_POOL(typ)) {
            /*
             * An open room or water location.  Normally we wouldn't touch
             * this, but we have to get rid of remembered boulder symbols.
             * Show fountains, pools, etc. underneath if already seen;
             * otherwise show the appropriate floor symbol.
             */
            let do_room_glyph = false;
            const rg = lev.remembered_glyph;
            if (_rg_is_boulder(rg) || rg?.cls === GLYPHCLS_INVIS) {
                if (typ !== ROOM && (lev.seenv | 0))
                    map_background(x, y, 1);
                else
                    do_room_glyph = true;
            } else if (_rg_in_stone_to_room_range(rg)) {
                /* C: lev->glyph >= cmap_to_glyph(S_stone)
                 *    && lev->glyph < cmap_to_glyph(S_darkroom) — the background
                 * cmap symbols numbered 0..19 (stone, walls, doorways/doors,
                 * bars, tree, plain room floor). */
                do_room_glyph = true;
            }
            if (do_room_glyph) {
                /* C: flags.dark_room && iflags.use_color && !Is_rogue_level →
                 * S_darkroom; this file treats dark_room/use_color as
                 * constant-true (see _darken_room_floor). */
                const dark = !Is_rogue_level(game.u?.uz);
                const glyph = dark
                    ? { ch: '.', color: CLR_BLACK, decgfx: false, cls: GLYPHCLS_CMAP }
                    : (lev.waslit
                        ? { ch: '.', color: NO_COLOR, decgfx: false, cls: GLYPHCLS_CMAP }
                        : { ch: ' ', color: NO_COLOR, decgfx: false, cls: GLYPHCLS_CMAP });
                lev.remembered_glyph = glyph;
                show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, _glyph_attr(glyph),
                                glyph.cls, false, glyph.otyp, glyph.corpsenm);
            }
        } else {
            /* We feel it (I think hallways are the only things left). */
            map_background(x, y, 1);
            /* Corridors are never felt as lit (unless remembered that way) */
            const rg = lev.remembered_glyph;
            if (typ === CORR && !lev.waslit && _darken_corridor(lev, rg))
                show_glyph_cell(x, y, rg.ch, rg.color, rg.decgfx,
                                _glyph_attr(rg), rg.cls, false, rg.otyp,
                                rg.corpsenm);
            else if (typ === ROOM && _darken_room_floor(lev, rg))
                show_glyph_cell(x, y, rg.ch, rg.color, rg.decgfx,
                                _glyph_attr(rg), rg.cls, false, rg.otyp,
                                rg.corpsenm);
        }
    } else {
        if ((ep = engr_at(x, y)) !== null && ep !== undefined
            && _engr_can_be_felt(ep))
            ep.erevealed = 1;

        _map_location(x, y, 1);

        if (game.u?.uball || game.u?.uchain) {
            /*
             * A ball or chain is only felt if it is first on the object
             * location list.  Otherwise clear the felt bit — something has
             * been dropped on the ball/chain.
             * (u.bc_felt has no reader in this port — js/ball.js:21,91 record
             * that the whole bglyph/cglyph bookkeeping is unmodelled — so this
             * block is inert; it is ported because C runs it here.)
             */
            const u = game.u;
            const top = vobj_at(x, y);
            if (u.uchain && (u.uchain.where | 0) === OBJ_FLOOR
                && u.uchain.ox === x && u.uchain.oy === y && top === u.uchain)
                u.bc_felt = (u.bc_felt | 0) | BC_CHAIN;
            else
                u.bc_felt = (u.bc_felt | 0) & ~BC_CHAIN;

            if (u.uball && (u.uball.where | 0) === OBJ_FLOOR
                && u.uball.ox === x && u.uball.oy === y && top === u.uball)
                u.bc_felt = (u.bc_felt | 0) | BC_BALL;
            else
                u.bc_felt = (u.bc_felt | 0) & ~BC_BALL;
        }

        /* Floor spaces are dark if unlit.  Corridors are dark if unlit.
         * C display.c:893-900 — with flags.dark_room && iflags.use_color
         * constant-true here, the ROOM arm's `(!waslit || (dark_room &&
         * use_color))` condition is always satisfied, so the whole arm reduces
         * to _darken_room_floor's own S_room test. */
        const rg = lev.remembered_glyph;
        const typ = lev.typ | 0;
        if (typ === ROOM && _darken_room_floor(lev, rg))
            show_glyph_cell(x, y, rg.ch, rg.color, rg.decgfx,
                            _glyph_attr(rg), rg.cls, false, rg.otyp,
                            rg.corpsenm);
        else if (typ === CORR && !lev.waslit && _darken_corridor(lev, rg))
            show_glyph_cell(x, y, rg.ch, rg.color, rg.decgfx,
                            _glyph_attr(rg), rg.cls, false, rg.otyp,
                            rg.corpsenm);
    }

    /* draw monster on top if we can sense it */
    if (!(game.u?.ux === x && game.u?.uy === y)
        && (mon = _m_at(x, y)) !== null && sensemon(mon)) {
        /* C feel_location distinguishes detection from telepathy/warning.
         * Detection-only glyphs carry inverse highlighting, with pet priority. */
        const tg = terrain_glyph(lev, x, y);
        _render_monster_glyph(x, y, mon, lev, tg, false,
                              (x !== mon.mx || y !== mon.my),
                              !(tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)));
    }
}

/* C ref: display.c:3357-3361 seenv_matrix[3][3] (also vision.c). */
const SEENV_MATRIX = [
    [SV2, SV1, SV0],
    [SV3, SVALL, SV7],
    [SV4, SV5, SV6],
];

/* C: lev->glyph == objnum_to_glyph(BOULDER) — the remembered glyph is the
 * boulder object symbol ('`' ROCK_CLASS, CLR_GRAY). */
function _rg_is_boulder(rg) {
    return !!rg && rg.cls === GLYPHCLS_OBJ && rg.ch === '`';
}

/* C: lev->glyph >= cmap_to_glyph(S_stone) && < cmap_to_glyph(S_darkroom) —
 * defsym.h cmap indices 0..19: S_stone, the eleven wall symbols, S_ndoor,
 * the four door symbols, S_bars, S_tree, S_room.  S_darkroom (20) and every
 * later cmap (S_corr onward) are OUTSIDE the range.  In this port's
 * {ch,color} glyph model that set is identified by char+color; the sole
 * ambiguity is '#', shared by S_bars (CLR_CYAN) / S_tree (CLR_GREEN) — in
 * range — and S_corr / S_litcorr (NO_COLOR / CLR_WHITE) — out of range. */
function _rg_in_stone_to_room_range(rg) {
    if (!rg || rg.cls !== GLYPHCLS_CMAP)
        return false;
    switch (rg.ch) {
    case ' ':  return rg.color === NO_COLOR;                 /* S_stone */
    case '|':
    case '-':  return true;    /* walls (CLR_GRAY), open doors (CLR_BROWN) */
    case '+':  return true;    /* closed doors */
    case '.':  return rg.color !== CLR_BLACK;   /* S_ndoor / S_room, not dark */
    case '~':  return rg.decgfx && rg.color !== CLR_BLACK;   /* DEC S_room */
    case '#':  return rg.color === CLR_CYAN || rg.color === CLR_GREEN;
    default:   return false;
    }
}


/* GLYPH constants — from C display.h, approximate values for sweep */
const MAX_GLYPH = 400;
const GLYPH_NOTHING_OFF = 0;
const GLYPH_UNEXPLORED_OFF = 1;
const GLYPH_STATUE_FEM_PILETOP_OFF = 2;
const GLYPH_STATUE_MALE_PILETOP_OFF = 3;
const GLYPH_BODY_PILETOP_OFF = 4;
const GLYPH_OBJ_PILETOP_OFF = 5;
const GLYPH_STATUE_FEM_OFF = 6;
const GLYPH_STATUE_MALE_OFF = 7;
const GLYPH_WARNING_OFF = 8;
const GLYPH_EXPLODE_FROSTY_OFF = 9;
const GLYPH_EXPLODE_FIERY_OFF = 10;
const GLYPH_EXPLODE_MAGICAL_OFF = 11;
const GLYPH_EXPLODE_WET_OFF = 12;
const GLYPH_EXPLODE_MUDDY_OFF = 13;
const GLYPH_EXPLODE_NOXIOUS_OFF = 14;
const GLYPH_EXPLODE_DARK_OFF = 15;
const GLYPH_SWALLOW_OFF = 16;
const GLYPH_CMAP_C_OFF = 17;
const GLYPH_ZAP_OFF = 18;
const GLYPH_CMAP_B_OFF = 19;
const GLYPH_ALTAR_OFF = 20;
const GLYPH_CMAP_A_OFF = 21;
const GLYPH_CMAP_SOKO_OFF = 22;
const GLYPH_CMAP_KNOX_OFF = 23;
const GLYPH_CMAP_GEH_OFF = 24;
const GLYPH_CMAP_MINES_OFF = 25;
const GLYPH_CMAP_MAIN_OFF = 26;
const GLYPH_CMAP_STONE_OFF = 27;
const GLYPH_OBJ_OFF = 28;
const GLYPH_RIDDEN_FEM_OFF = 29;
const GLYPH_RIDDEN_MALE_OFF = 30;
const GLYPH_BODY_OFF = 31;
const GLYPH_DETECT_FEM_OFF = 32;
const GLYPH_DETECT_MALE_OFF = 33;
const GLYPH_INVIS_OFF = 34;
const GLYPH_PET_FEM_OFF = 35;
const GLYPH_PET_MALE_OFF = 36;
const GLYPH_MON_FEM_OFF = 37;
const GLYPH_MON_MALE_OFF = 38;

export function show_glyph(x, y, glyph) {
    const gbuf = game["gg.gbuf"] || [];
    const gbuf_start = game["gg.gbuf_start"] || [];
    const gbuf_stop = game["gg.gbuf_stop"] || [];
    const a11y = game.a11y || {};
    const program_state = game.program_state || {};
    const iflags = game.iflags || {};

    if (suppress_map_output())
        return;

    if (!isok(x, y)) {
        let text = "";
        let offset = -1;

        if (x === 0)
            return;

        if (glyph < 0 || glyph >= MAX_GLYPH) {
            text = "invalid";
        } else if ((offset = (glyph - GLYPH_NOTHING_OFF)) >= 0) {
            text = "nothing";
        } else if ((offset = (glyph - GLYPH_UNEXPLORED_OFF)) >= 0) {
            text = "unexplored";
        } else if ((offset = (glyph - GLYPH_STATUE_FEM_PILETOP_OFF)) >= 0) {
            text = "statue of a female monster at top of a pile";
        } else if ((offset = (glyph - GLYPH_STATUE_MALE_PILETOP_OFF)) >= 0) {
            text = "statue of a male monster at top of a pile";
        } else if ((offset = (glyph - GLYPH_BODY_PILETOP_OFF)) >= 0) {
            text = "body at top of a pile";
        } else if ((offset = (glyph - GLYPH_OBJ_PILETOP_OFF)) >= 0) {
            text = (glyph_is_piletop_generic_obj(glyph)
                    ? "generic object at top of a pile"
                    : "object at top of a pile");
        } else if ((offset = (glyph - GLYPH_STATUE_FEM_OFF)) >= 0) {
            text = "statue of female monster";
        } else if ((offset = (glyph - GLYPH_STATUE_MALE_OFF)) >= 0) {
            text = "statue of male monster";
        } else if ((offset = (glyph - GLYPH_WARNING_OFF)) >= 0) {
            text = "warning explosion";
        } else if ((offset = (glyph - GLYPH_EXPLODE_FROSTY_OFF)) >= 0) {
            text = "frosty explosion";
        } else if ((offset = (glyph - GLYPH_EXPLODE_FIERY_OFF)) >= 0) {
            text = "fiery explosion";
        } else if ((offset = (glyph - GLYPH_EXPLODE_MAGICAL_OFF)) >= 0) {
            text = "magical explosion";
        } else if ((offset = (glyph - GLYPH_EXPLODE_WET_OFF)) >= 0) {
            text = "wet explosion";
        } else if ((offset = (glyph - GLYPH_EXPLODE_MUDDY_OFF)) >= 0) {
            text = "muddy explosion";
        } else if ((offset = (glyph - GLYPH_EXPLODE_NOXIOUS_OFF)) >= 0) {
            text = "noxious explosion";
        } else if ((offset = (glyph - GLYPH_EXPLODE_DARK_OFF)) >= 0) {
            text = "dark explosion";
        } else if ((offset = (glyph - GLYPH_SWALLOW_OFF)) >= 0) {
            text = "swallow";
        } else if ((offset = (glyph - GLYPH_CMAP_C_OFF)) >= 0) {
            text = "cmap C";
        } else if ((offset = (glyph - GLYPH_ZAP_OFF)) >= 0) {
            text = "zap";
        } else if ((offset = (glyph - GLYPH_CMAP_B_OFF)) >= 0) {
            text = "cmap B";
        } else if ((offset = (glyph - GLYPH_ALTAR_OFF)) >= 0) {
            text = "altar";
        } else if ((offset = (glyph - GLYPH_CMAP_A_OFF)) >= 0) {
            text = "cmap A";
        } else if ((offset = (glyph - GLYPH_CMAP_SOKO_OFF)) >= 0) {
            text = "sokoban dungeon walls";
        } else if ((offset = (glyph - GLYPH_CMAP_KNOX_OFF)) >= 0) {
            text = "knox dungeon walls";
        } else if ((offset = (glyph - GLYPH_CMAP_GEH_OFF)) >= 0) {
            text = "gehennom dungeon walls";
        } else if ((offset = (glyph - GLYPH_CMAP_MINES_OFF)) >= 0) {
            text = "gnomish mines dungeon walls";
        } else if ((offset = (glyph - GLYPH_CMAP_MAIN_OFF)) >= 0) {
            text = "main dungeon walls";
        } else if ((offset = (glyph - GLYPH_CMAP_STONE_OFF)) >= 0) {
            text = "stone";
        } else if ((offset = (glyph - GLYPH_OBJ_OFF)) >= 0) {
            text = (glyph_is_normal_generic_obj(glyph)
                    ? "generic object"
                    : "object");
        } else if ((offset = (glyph - GLYPH_RIDDEN_FEM_OFF)) >= 0) {
            text = "ridden female monster";
        } else if ((offset = (glyph - GLYPH_RIDDEN_MALE_OFF)) >= 0) {
            text = "ridden male monster";
        } else if ((offset = (glyph - GLYPH_BODY_OFF)) >= 0) {
            text = "body";
        } else if ((offset = (glyph - GLYPH_DETECT_FEM_OFF)) >= 0) {
            text = "detected female monster";
        } else if ((offset = (glyph - GLYPH_DETECT_MALE_OFF)) >= 0) {
            text = "detected male monster";
        } else if ((offset = (glyph - GLYPH_INVIS_OFF)) >= 0) {
            text = "invisible monster";
        } else if ((offset = (glyph - GLYPH_PET_FEM_OFF)) >= 0) {
            text = "female pet";
        } else if ((offset = (glyph - GLYPH_PET_MALE_OFF)) >= 0) {
            text = "male pet";
        } else if ((offset = (glyph - GLYPH_MON_FEM_OFF)) >= 0) {
            text = "female monster";
        } else if ((offset = (glyph - GLYPH_MON_MALE_OFF)) >= 0) {
            text = "male monster";
        }
        impossible("show_glyph:  bad pos <%d,%d> with glyph %d [%s %d].",
                   x, y, glyph, text, offset);
        return;
    } else if (glyph < 0 || glyph >= MAX_GLYPH) {
        impossible("show_glyph:  bad glyph %d [max %d] at <%d,%d>.",
                   glyph, MAX_GLYPH, x, y);
        return;
    }

    const glyphinfo = {};
    map_glyphinfo(x, y, glyph, 0, glyphinfo);

    if (!gbuf[y]) gbuf[y] = [];
    if (!gbuf[y][x]) {
        gbuf[y][x] = { gnew: 0, glyphinfo: { glyph: 0, ttychar: 0, gm: { customcolor: 0, glyphflags: 0, sym: { color: 0 }, tileidx: 0 } } };
    }
    const gbufEntry = gbuf[y][x];
    const oldglyph = gbufEntry.glyphinfo.glyph;

    let show_glyph_change = false;
    if (a11y.glyph_updates && !a11y.mon_notices_blocked
        && !program_state.in_docrt && !program_state.gameover
        && !program_state.in_getlev && !program_state.stopprint
        && !suppress_map_output()
        && (oldglyph !== glyph || gbufEntry.gnew)) {
        const c = glyph_to_cmap(glyph);

        if ((glyph_is_nothing(oldglyph) || glyph_is_unexplored(oldglyph)
             || is_cmap_furniture(c))
            && !is_cmap_wall(c) && !is_cmap_room(c)) {
            if ((a11y.mon_notices && glyph_is_monster(glyph))
                || (glyph_is_monster(oldglyph))
                || u_at(x, y)) {
                ; /* nothing */
            } else {
                show_glyph_change = true;
            }
        }
    }

    if (gbufEntry.glyphinfo.glyph !== glyph
        || gbufEntry.glyphinfo.ttychar !== glyphinfo.ttychar
        || gbufEntry.glyphinfo.gm.customcolor !== glyphinfo.gm.customcolor
        || gbufEntry.glyphinfo.gm.glyphflags !== glyphinfo.gm.glyphflags
        || gbufEntry.glyphinfo.gm.sym.color !== glyphinfo.gm.sym.color
        || gbufEntry.glyphinfo.gm.tileidx !== glyphinfo.gm.tileidx
        || iflags.use_background_glyph) {
        gbufEntry.glyphinfo.glyph = glyphinfo.glyph;
        gbufEntry.gnew = 1;
        gbufEntry.glyphinfo.ttychar = glyphinfo.ttychar;
        gbufEntry.glyphinfo.gm = glyphinfo.gm;
        if ((gbuf_start[y] || 0) > x)
            gbuf_start[y] = x;
        if ((gbuf_stop[y] || 0) < x)
            gbuf_stop[y] = x;
    }

    if (show_glyph_change) {
        const buf = "";
        const cc = { x: x, y: y };
        let sym = 0;
        const firstmatch = { value: '' };
        const tmp_accessiblemsg = a11y.accessiblemsg;

        a11y.accessiblemsg = true;
        do_screen_description(cc, true, sym, buf, firstmatch, null);
        pline_xy(x, y, "%s.", firstmatch.value);
        a11y.accessiblemsg = tmp_accessiblemsg;
    }
}

export function glyph_to_cmap(glyph) { return glyph_to_cmap_real(glyph); }
function impossible(msg, ...args) { /* sweep may capture calls */ }
function pline_xy(x, y, msg, ...args) { /* sweep may capture calls */ }
function map_glyphinfo(x, y, glyph, mgflags, glyphinfo) {
    /* Minimal port: set glyphinfo fields. */
    glyphinfo.glyph = glyph;
    glyphinfo.ttychar = 0;
    glyphinfo.gm = {
        customcolor: 0,
        glyphflags: 0,
        sym: { color: 0 },
        tileidx: 0
    };
}
/* C display.h/sym.h glyph and cmap predicates. */
export function glyph_is_nothing(glyph) { return (glyph | 0) === GLYPH_NOTHING_OFF; }
export function glyph_is_unexplored(glyph) { return (glyph | 0) === GLYPH_UNEXPLORED_OFF; }
export function is_cmap_furniture(c) { return (c | 0) >= 13 && (c | 0) <= 18; }
export function is_cmap_wall(c) { return (c | 0) >= 0 && (c | 0) <= 11; }
export function is_cmap_room(c) { return (c | 0) >= 19 && (c | 0) <= 20; }
export function glyph_is_monster(glyph) {
    const g = glyph | 0;
    const NUMMONS = 383;
    return (g >= GLYPH_RIDDEN_FEM_OFF && g < GLYPH_RIDDEN_FEM_OFF + NUMMONS)
        || (g >= GLYPH_RIDDEN_MALE_OFF && g < GLYPH_RIDDEN_MALE_OFF + NUMMONS)
        || (g >= GLYPH_DETECT_FEM_OFF && g < GLYPH_DETECT_FEM_OFF + NUMMONS)
        || (g >= GLYPH_DETECT_MALE_OFF && g < GLYPH_DETECT_MALE_OFF + NUMMONS)
        || (g >= GLYPH_PET_FEM_OFF && g < GLYPH_PET_FEM_OFF + NUMMONS)
        || (g >= GLYPH_PET_MALE_OFF && g < GLYPH_PET_MALE_OFF + NUMMONS)
        || (g >= GLYPH_MON_FEM_OFF && g < GLYPH_MON_FEM_OFF + NUMMONS)
        || (g >= GLYPH_MON_MALE_OFF && g < GLYPH_MON_MALE_OFF + NUMMONS);
}
/* C pager.c:1247 do_screen_description().  The accessibility call from
 * show_glyph only needs the first description for the glyph just painted;
 * preserve that contract without enumerating pager symbol tables here. */
export function do_screen_description(cc, b1, sym, buf, firstmatch, n) {
    if (!cc || !isok(cc.x, cc.y) || !game.level)
        return 0;
    const loc = game.level.at(cc.x, cc.y);
    if (!loc)
        return 0;
    let text;
    switch (loc.disp_cls) {
    case GLYPHCLS_MON: text = 'monster'; break;
    case GLYPHCLS_OBJ: text = 'object'; break;
    case GLYPHCLS_TRAP: text = 'trap'; break;
    case GLYPHCLS_ENGR: text = 'engraving'; break;
    case GLYPHCLS_INVIS: text = 'invisible monster'; break;
    default: text = (loc.disp_ch === ' ') ? 'unexplored area' : 'terrain'; break;
    }
    if (firstmatch && typeof firstmatch === 'object') {
        if (Array.isArray(firstmatch)) firstmatch[0] = text;
        else firstmatch.value = text;
    }
    return 1;
}
/* C display.h: generic object ranges use FIRST_OBJECT == 18. */
export function glyph_is_piletop_generic_obj(glyph) {
    const g = glyph | 0;
    return g > GLYPH_OBJ_PILETOP_OFF && g < GLYPH_OBJ_PILETOP_OFF + 18 - 1;
}
export function glyph_is_normal_generic_obj(glyph) {
    const g = glyph | 0;
    return g > GLYPH_OBJ_OFF && g < GLYPH_OBJ_OFF + 18 - 1;
}

/* map_engraving - ported from display.c:312-322.
 * C: glyph = engraving_to_glyph(ep) = cmap_to_glyph(engraving_to_defsym(ep)),
 * and engrave.h:47 engraving_to_defsym(ep) = (levl[x][y].typ == CORR)
 * ? S_engrcorr : S_engroom — '#' resp. '`', both CLR_BRIGHT_BLUE (defsym.h
 * PCHAR2).  Same glyph the newsym/_map_location engraving branches above build. */
export function map_engraving(ep, show) {
    if (!ep) return;
    const x = ep.engr_x, y = ep.engr_y;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const ch = (loc.typ === CORR) ? '#' : '`';
    const color = CLR_BRIGHT_BLUE;
    /* C display.c:2942-2945 MG_BW_ENGR — see _bw_engr_hilite. */
    const bwengr = (loc.typ === CORR);
    if (game.level?.flags?.hero_memory)     /* C display.c:318-319 */
        loc.remembered_glyph = { ch, color, decgfx: false, bwengr, cls: GLYPHCLS_ENGR };
    if (show)                                /* C display.c:320-321 */
        show_glyph_cell(x, y, ch, color, false, _bw_engr_hilite(bwengr), GLYPHCLS_ENGR);
}

/*
 * C ref: display.c:272-288 map_background(x, y, show)
 *
 *     int glyph = back_to_glyph(x, y);
 *     if (svl.level.flags.hero_memory) levl[x][y].glyph = glyph;
 *     if (show) show_glyph(x, y, glyph);
 *
 * back_to_glyph is this port's terrain_glyph().  A no-op stub used to live in
 * js/sit.js, exported and imported by cmd.js and used by sit.js itself, so
 * every "repaint the bare terrain here" call silently did nothing.
 */
export function map_background(x, y, show) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const tg = terrain_glyph(loc, x, y);
    const glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                    cls: GLYPHCLS_CMAP };
    if (game.level?.flags?.hero_memory)
        loc.remembered_glyph = glyph;
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, _glyph_attr(glyph), glyph.cls);
}

export function map_location(x, y, show) {
    _map_location(x, y, show);
}

/* C ref: display.h:218-222
 *   #define covers_objects(xx, yy) \
 *       ((is_pool(xx, yy) && !Underwater) || levl[xx][yy].typ == LAVAPOOL \
 *        || levl[xx][yy].typ == LAVAWALL)
 *   #define covers_traps(xx, yy) covers_objects(xx, yy)
 * is_pool() is POOL/MOAT/WATER/DRAWBRIDGE_UP (rm.h); Underwater is u.uinwater. */
function covers_objects(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ | 0;
    const is_pool = (typ === POOL || typ === MOAT || typ === WATER
                     || typ === DRAWBRIDGE_UP);
    return (is_pool && !game.u?.uinwater)
        || typ === LAVAPOOL || typ === LAVAWALL;
}
const covers_traps = covers_objects;

/* C ref: engrave.h:50-53 spot_shows_engravings(x,y) — CORR, ICE or ROOM. */
function spot_shows_engravings(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ === CORR || typ === ICE || typ === ROOM;
}

/* C ref: display.h:966 vobj_at(x,y) — the top VISIBLE object of the pile.  This
 * port keeps the per-tile pile head in game.level.levelObjects[x][y] (same
 * source _map_location_glyph and see_nearby_objects already read). */
function vobj_at(x, y) {
    return game.level?.levelObjects?.[x]?.[y] ?? null;
}

/* C ref: dungeon.c:2925-2938 update_lastseentyp(x, y).  C keeps a whole
 * svl.lastseentyp[][] plane; this port stores it on the cell, which is where
 * cmd.js:960's chat-to-a-wall test already reads it from (it had no writer
 * before this port, so that reader was dead). */
/* C ref: dbridge.c:115-128 db_under_typ(mask). */
function db_under_typ(mask) {
    switch ((mask & DB_UNDER) | 0) {
    case DB_ICE:  return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default:      return STONE;
    }
}

/* ── the cmap inverse (S_* defsym index -> terrain / glyph) ────────────────
 *
 * C keeps two inverses of the defsyms table and this port had NEITHER, which
 * left two separate gap notes claiming a mimic posing as furniture could not
 * be rendered ("this port has no cmap inverse", display.c:543-562 arm; and
 * "no cmap->typ inverse" in update_lastseentyp below).
 *
 * MEASURED, gen094 step 298 (Dlvl 10, arrived by wizard levelport): a mimic
 * stands in the room's bottom wall pretending to be a closed door.  C paints
 * the brown '+' the room wall would show; this port painted the mimic's own
 * 'm'.  That single cell held a 258-frame contiguous miss run, because the
 * mimic does not move and every later frame repaints it.
 *
 * C mkroom.c:912 cmap_to_type(sym) — "convert a display symbol for terrain
 * into topology type; used for remembered terrain when mimics pose as
 * furniture".  Ported whole; it is a pure switch. */
const S_STONE_C = 0, S_VWALL_C = 1, S_HWALL_C = 2, S_TLCORN_C = 3,
      S_TRCORN_C = 4, S_BLCORN_C = 5, S_BRCORN_C = 6, S_CRWALL_C = 7,
      S_TUWALL_C = 8, S_TDWALL_C = 9, S_TLWALL_C = 10, S_TRWALL_C = 11,
      S_NDOOR_C = 12, S_VODOOR_C = 13, S_HODOOR_C = 14, S_VCDOOR_C = 15,
      S_HCDOOR_C = 16, S_BARS_C = 17, S_TREE_C = 18, S_ROOM_C = 19,
      S_DARKROOM_C = 20, S_CORR_C = 22, S_LITCORR_C = 23, S_UPSTAIR_C = 25,
      S_DNSTAIR_C = 26, S_UPLADDER_C = 27, S_DNLADDER_C = 28, S_ALTAR_C = 33,
      S_GRAVE_C = 34, S_THRONE_C = 35, S_SINK_C = 36, S_FOUNTAIN_C = 37,
      S_POOL_C = 38, S_ICE_C = 39, S_LAVA_C = 40, S_LAVAWALL_C = 41,
      S_VODBRIDGE_C = 42, S_HODBRIDGE_C = 43, S_VCDBRIDGE_C = 44,
      S_HCDBRIDGE_C = 45, S_AIR_C = 46, S_CLOUD_C = 47, S_WATER_C = 48;

export function cmap_to_type(sym) {
    switch (sym | 0) {
    case S_STONE_C:     return STONE;
    case S_VWALL_C:     return VWALL;
    case S_HWALL_C:     return HWALL;
    case S_TLCORN_C:    return TLCORNER;
    case S_TRCORN_C:    return TRCORNER;
    case S_BLCORN_C:    return BLCORNER;
    case S_BRCORN_C:    return BRCORNER;
    case S_CRWALL_C:    return CROSSWALL;
    case S_TUWALL_C:    return TUWALL;
    case S_TDWALL_C:    return TDWALL;
    case S_TLWALL_C:    return TLWALL;
    case S_TRWALL_C:    return TRWALL;
    case S_NDOOR_C:
    case S_VODOOR_C:
    case S_HODOOR_C:
    case S_VCDOOR_C:
    case S_HCDOOR_C:    return DOOR;
    case S_BARS_C:      return IRONBARS;
    case S_TREE_C:      return TREE;
    case S_ROOM_C:
    case S_DARKROOM_C:  return ROOM;
    case S_CORR_C:
    case S_LITCORR_C:   return CORR;
    case S_UPSTAIR_C:
    case S_DNSTAIR_C:   return STAIRS;
    case S_UPLADDER_C:
    case S_DNLADDER_C:  return LADDER;
    case S_ALTAR_C:     return ALTAR;
    case S_GRAVE_C:     return GRAVE;
    case S_THRONE_C:    return THRONE;
    case S_SINK_C:      return SINK;
    case S_FOUNTAIN_C:  return FOUNTAIN;
    case S_POOL_C:      return POOL;
    case S_ICE_C:       return ICE;
    case S_LAVA_C:      return LAVAPOOL;
    case S_VODBRIDGE_C:
    case S_HODBRIDGE_C: return DRAWBRIDGE_DOWN;
    case S_VCDBRIDGE_C:
    case S_HCDBRIDGE_C: return DBWALL;
    case S_AIR_C:       return AIR;
    case S_CLOUD_C:     return CLOUD;
    case S_WATER_C:     return WATER;
    case S_LAVAWALL_C:  return LAVAWALL;
    default:            return STONE; /* C's "catchall" initialiser */
    }
}

/* C display.h:621 cmap_to_glyph(cmap_idx), rendered straight to this port's
 * {ch, color, dec} instead of to a glyph number.
 *
 * The characters and colours are defsym.h's PCHAR/PCHAR2 columns and the
 * DECgraphics overrides in dat/symbols — i.e. EXACTLY the sources
 * terrain_glyph() above already cites arm by arm, so the two agree by
 * construction rather than by a second transcription.  Two arms are not plain
 * defsyms lookups and C says so itself:
 *   - the eleven wall symbols go through cmap_walls_to_glyph(), whose colour
 *     is the per-branch wall_color() this file already models (_wall_color);
 *   - cmap_to_glyph(S_altar) is `altar_to_glyph(AM_NEUTRAL)`, NOT defsyms
 *     colour — a mimic posing as an altar always shows the NEUTRAL colour
 *     whatever the real square holds.  altar_color_neutral is CLR_GRAY
 *     (display.h:291; USE_GENERAL_ALTAR_COLORS is never defined here).
 *
 * Returns null for a symbol outside the cmap-A/B furniture range.  C would
 * return NO_GLYPH there and the caller has nothing sensible to paint; the one
 * caller keeps its pre-existing behaviour (draw the monster) in that case.
 * RNG-free. */
function cmap_to_glyph_disp(sym) {
    const dec = dec_mode();
    const s = sym | 0;
    /* walls (S_vwall..S_trwall) — colour from wall_color(), per branch. */
    if (s >= S_VWALL_C && s <= S_TRWALL_C) {
        const wc = _wall_color();
        const A = ['|', '-', '-', '-', '-', '-', '-', '-', '-', '|', '|'];
        const D = ['x', 'q', 'l', 'k', 'm', 'j', 'n', 'v', 'w', 'u', 't'];
        const i = s - S_VWALL_C;
        return dec ? { ch: D[i], color: wc, dec: true }
                   : { ch: A[i], color: wc, dec: false };
    }
    switch (s) {
    case S_STONE_C:    return { ch: ' ', color: NO_COLOR, dec: false };
    case S_NDOOR_C:    return dec ? { ch: '~', color: NO_COLOR, dec: true }
                                  : { ch: '.', color: NO_COLOR, dec: false };
    case S_VODOOR_C:   return dec ? { ch: 'a', color: CLR_BROWN, dec: true }
                                  : { ch: '-', color: CLR_BROWN, dec: false };
    case S_HODOOR_C:   return dec ? { ch: 'a', color: CLR_BROWN, dec: true }
                                  : { ch: '|', color: CLR_BROWN, dec: false };
    case S_VCDOOR_C:
    case S_HCDOOR_C:   return { ch: '+', color: CLR_BROWN, dec: false };
    case S_BARS_C:     return dec ? { ch: '|', color: CLR_CYAN, dec: true }
                                  : { ch: '#', color: CLR_CYAN, dec: false };
    case S_TREE_C:     return dec ? { ch: 'g', color: CLR_GREEN, dec: true }
                                  : { ch: '#', color: CLR_GREEN, dec: false };
    case S_ROOM_C:     return dec ? { ch: '~', color: NO_COLOR, dec: true }
                                  : { ch: '.', color: NO_COLOR, dec: false };
    case S_DARKROOM_C: return dec ? { ch: '~', color: CLR_BLACK, dec: true }
                                  : { ch: '.', color: CLR_BLACK, dec: false };
    case S_CORR_C:
    case S_LITCORR_C:  return { ch: '#', color: NO_COLOR, dec: false };
    case S_UPSTAIR_C:  return { ch: '<', color: CLR_GRAY, dec: false };
    case S_DNSTAIR_C:  return { ch: '>', color: CLR_GRAY, dec: false };
    case S_UPLADDER_C: return { ch: '<', color: CLR_BROWN, dec: false };
    case S_DNLADDER_C: return { ch: '>', color: CLR_BROWN, dec: false };
    /* C: altar_to_glyph(AM_NEUTRAL) — see the note above. */
    case S_ALTAR_C:    return dec ? { ch: '{', color: CLR_GRAY, dec: true }
                                  : { ch: '_', color: CLR_GRAY, dec: false };
    case S_GRAVE_C:    return { ch: '|', color: CLR_WHITE, dec: false };
    case S_THRONE_C:   return { ch: '\\', color: CLR_YELLOW, dec: false };
    case S_SINK_C:     return { ch: '{', color: CLR_WHITE, dec: false };
    case S_FOUNTAIN_C: return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    default:           return null;
    }
}

export function update_lastseentyp(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    let ltyp = loc.typ | 0;
    if (ltyp === DRAWBRIDGE_UP)
        ltyp = db_under_typ(loc.drawbridgemask | 0);
    const mtmp = _m_at(x, y);
    if (mtmp && ((mtmp.m_ap_type | 0) & M_AP_TYPMASK) === M_AP_FURNITURE
        && canseemon(mtmp)) {
        /* C display.c:471 area — `ltyp = cmap_to_type(mtmp->mappearance);`.
         * The claim this arm used to carry ("no corpus monster mimics
         * furniture, and this port has no cmap→typ inverse") was wrong on both
         * counts: gen094 walks onto a level whose room wall holds a
         * door-mimicking mimic, and cmap_to_type is now ported above. */
        ltyp = cmap_to_type(mtmp.mappearance | 0);
    }
    loc.lastseentyp = ltyp;
}

/* C ref: region.c:389-393 show_region(reg, x, y) — show_glyph(x, y, reg->glyph).
 * region.js stores the C integer glyph (cmap_to_glyph of S_cloud or
 * S_poisoncloud — the only two regions this game builds, region.js:880), so
 * decode those two here rather than teach the whole glyph plane to region.js.
 * defsym.h:149 S_cloud = '#' CLR_GRAY, :204 S_poisoncloud = '#' CLR_BRIGHT_GREEN. */
const REGION_GLYPH_POISONCLOUD = 4091; /* region.js:62-71 cmap_to_glyph(S_poisoncloud) */
function show_region(reg, x, y) {
    const poison = (reg?.glyph | 0) === REGION_GLYPH_POISONCLOUD;
    show_glyph_cell(x, y, '#', poison ? CLR_BRIGHT_GREEN : CLR_GRAY, false, 0,
                    GLYPHCLS_CMAP);
}

/*
 * C ref: display.c:443-471 — the _map_location(x, y, show) macro.
 *
 *   if ((obj = vobj_at(x, y)) && !covers_objects(x, y))      map_object
 *   else if ((trap = t_at(x,y)) && trap->tseen
 *            && !covers_traps(x, y))                          map_trap
 *   else if (spot_shows_engravings(x, y)
 *            && (ml_ep = engr_at(x, y)) != 0 && ml_ep->erevealed
 *            && !covers_traps(x, y))                          map_engraving
 *   else                                                      map_background
 *   update_lastseentyp(x, y);
 *   if (show && !Blind && (_ml_reg = visible_region_at(x, y)))
 *       show_region(_ml_reg, x, y);
 */
function _map_location(x, y, show) {
    let obj, trap, ml_ep, _ml_reg;

    if ((obj = vobj_at(x, y)) && !covers_objects(x, y)) {
        map_object(obj, show);
    } else if ((trap = t_at(x, y)) && (trap.tseen | 0) && !covers_traps(x, y)) {
        map_trap(trap, show);
    } else if (spot_shows_engravings(x, y)
               && (ml_ep = engr_at(x, y)) !== null && ml_ep !== undefined
               && (ml_ep.erevealed | 0)
               && !covers_traps(x, y)) {
        map_engraving(ml_ep, show);
    } else {
        map_background(x, y, show);
    }

    update_lastseentyp(x, y);
    if (show && !_disp_Blind() && (_ml_reg = visible_region_at(x, y)) !== null)
        show_region(_ml_reg, x, y);
}

// ── tmp_at support ──
export const DISP_BEAM = -1;
const DISP_ALL = -2;
export const DISP_TETHER = -3;
export const DISP_FLASH = -4;
const DISP_ALWAYS = -5;
export const DISP_CHANGE = -6;
export const DISP_END = -7;
export const DISP_FREEMEM = -8;
const BACKTRACK = -1;
const TMP_AT_MAX_GLYPHS = COLNO * 2;
let tgfirst = {
    saved: new Array(TMP_AT_MAX_GLYPHS),
    sidx: 0,
    style: 0,
    glyph: 0,
    prev: null
};
/* C ref: display.c:1210 — `static struct tmp_glyph *tglyph = (struct tmp_glyph *) 0;`
 * The static pointer starts NULL, so the FIRST DISP_BEAM/DISP_FLASH/... call takes
 * the `tmp = &tgfirst` arm; only a NESTED effect reaches alloc().  This port had it
 * pre-initialized to tgfirst, which sent the very first call down the alloc() arm —
 * and alloc() throws here.  Any live tmp_at() caller would have crashed. */
let _tglyph = null;

/* ── zap-beam glyph rendering (C display.c mapglyph() zap branch) ──────────────
 * C keeps a single integer glyph number; this port's display cell carries the
 * rendered {ch,color,dec} (see show_glyph_cell).  These two tables are the same
 * lookup C's mapglyph() performs for a cmap-zap glyph:
 *   cmap  = glyph_to_cmap(glyph) = ((glyph - GLYPH_ZAP_OFF) % 4) + S_vbeam
 *   ttychar = gs.showsyms[cmap + SYM_OFF_P]     (defsym.h / dat/symbols)
 *   color   = zapcolors[zap_of_glyph(glyph)]    (display.c:2711, use_color)
 * defsym.h:190-193 gives the ASCII symbols '|' '-' '\\' '/' for
 * S_vbeam/S_hbeam/S_lslant/S_rslant; dat/symbols' DECgraphics set overrides ONLY
 * S_vbeam (\xf8 → DEC 'x') and S_hbeam (\xf1 → DEC 'q'), so the two slants keep
 * their ASCII form even in DEC mode. */
const _ZAP_SYM = [
    { d: 'x',  a: '|'  },   /* S_vbeam  (74) */
    { d: 'q',  a: '-'  },   /* S_hbeam  (75) */
    { d: '\\', a: '\\' },   /* S_lslant (76) — no DECgraphics override */
    { d: '/',  a: '/'  },   /* S_rslant (77) — no DECgraphics override */
];
/* C ref: display.h:283-291 enum zap_colors + display.c:2711 zapcolors[NUM_ZAP],
 * indexed by the beam type (== damgtype), in buzz()'s order. */
const _ZAP_COLORS = [
    CLR_BRIGHT_BLUE,  /* 0 missile    — HI_ZAP (color.h:55) */
    CLR_ORANGE,       /* 1 fire       */
    CLR_WHITE,        /* 2 frost      */
    CLR_BRIGHT_BLUE,  /* 3 sleep      — HI_ZAP */
    CLR_BLACK,        /* 4 death      */
    CLR_WHITE,        /* 5 lightning  */
    CLR_GREEN,        /* 6 poison gas */
    CLR_YELLOW,       /* 7 acid       */
];
const NUM_ZAP = 8;
/* C's real glyph-space offset (display.h GLYPH_ZAP_OFF, = 4051 for this build —
 * the same value js/glyphs.js:71 uses).  Kept as the true C number so
 * zapdir_to_glyph() returns exactly what C returns. */
const GLYPH_ZAP_OFF_C = 4051;

/* C ref: display.c:2511 zapdir_to_glyph(dx, dy, beam_type)
 *   dx = (dx == dy) ? 2 : (dx && dy) ? 3 : dx ? 1 : 0;
 *   return ((beam_type << 2) | dx) + GLYPH_ZAP_OFF;
 * The four sub-glyphs per beam type are, in order, S_vbeam '|', S_hbeam '-',
 * S_lslant '\', S_rslant '/'.  Pure arithmetic; consumes no RNG. */
export function zapdir_to_glyph(dx, dy, beam_type) {
    if (beam_type >= NUM_ZAP) {
        /* C impossible("zapdir_to_glyph:  illegal beam type") then falls through */
        beam_type = 0;
    }
    dx = (dx === dy) ? 2 : (dx && dy) ? 3 : dx ? 1 : 0;
    return (((beam_type << 2) | dx) | 0) + GLYPH_ZAP_OFF_C;
}

/* Resolve a cmap-zap glyph to this port's display cell.  Returns null for any
 * glyph outside the zap range (nothing else reaches tmp_at on the corpus). */
function _zap_glyph_cell(glyph) {
    const off = (glyph | 0) - GLYPH_ZAP_OFF_C;
    if (off < 0 || off >= NUM_ZAP * 4)
        return null;
    const sym = _ZAP_SYM[off % 4];
    const decMode = dec_mode();
    return {
        ch: decMode ? sym.d : sym.a,
        color: _ZAP_COLORS[off >> 2],
        dec: decMode && (off % 4) < 2,   /* only vbeam/hbeam have DEC forms */
    };
}

export function tmp_at(x, y) {
    let tmp;

    switch (x) {
    case DISP_BEAM:
    case DISP_ALL:
    case DISP_TETHER:
    case DISP_FLASH:
    case DISP_ALWAYS:
        if (!_tglyph)
            tmp = tgfirst;
        else /* nested effect; we need dynamic memory */
            tmp = alloc(/* sizeof *tmp */);
        tmp.prev = _tglyph;
        _tglyph = tmp;
        _tglyph.sidx = 0;
        _tglyph.style = x;
        _tglyph.glyph = y;
        /* C: flush_screen(0) — sync the PHYSICAL terminal to the gbuf.  In this
         * port the map rows are serialized from the disp_* cells at capture time
         * (render_map_row / _capture_painted_cells), so the physical paint is
         * implicit and there is nothing to flush here.  This port's flush_screen()
         * is the frame emitter + topline pager (C's update_topl/more()), NOT C's
         * gbuf repaint, so calling it here would page the topline mid-animation. */
        return;

    case DISP_FREEMEM: /* in case game ends with tmp_at() in progress */
        while (_tglyph) {
            tmp = _tglyph.prev;
            if (_tglyph !== tgfirst)
                free(_tglyph);
            _tglyph = tmp;
        }
        return;

    default:
        break;
    }

    if (!_tglyph) {
        panic("tmp_at: tglyph not initialized");
    } else {
        switch (x) {
        case DISP_CHANGE:
            _tglyph.glyph = y;
            break;

        case DISP_END:
            if (_tglyph.style === DISP_BEAM || _tglyph.style === DISP_ALL) {
                let i;

                /* Erase (reset) from source to end */
                for (i = 0; i < _tglyph.sidx; i++)
                    newsym(_tglyph.saved[i].x, _tglyph.saved[i].y);
            } else if (_tglyph.style === DISP_TETHER) {
                let i;

                if (y === BACKTRACK && _tglyph.sidx > 1) {
                    /* backtrack */
                    for (i = _tglyph.sidx - 1; i > 0; i--) {
                        newsym(_tglyph.saved[i].x, _tglyph.saved[i].y);
                        show_glyph(_tglyph.saved[i - 1].x,
                                   _tglyph.saved[i - 1].y, _tglyph.glyph);
                        flush_screen(0); /* make sure it shows up */
                        nh_delay_output();
                    }
                    _tglyph.sidx = 1;
                }
                for (i = 0; i < _tglyph.sidx; i++)
                    newsym(_tglyph.saved[i].x, _tglyph.saved[i].y);
            } else {              /* DISP_FLASH or DISP_ALWAYS */
                if (_tglyph.sidx) /* been called at least once */
                    newsym(_tglyph.saved[0].x, _tglyph.saved[0].y);
            }
            /* tglyph->sidx = 0; -- about to be freed, so not necessary */
            tmp = _tglyph.prev;
            if (_tglyph !== tgfirst)
                free(_tglyph);
            _tglyph = tmp;
            break;

        default: /* do it */
            /* the beam genuinely runs off the map edge — real bounds check. */
            if (!isok(x, y))
                break;
            if (_tglyph.style === DISP_BEAM || _tglyph.style === DISP_ALL) {
                if (_tglyph.style !== DISP_ALL && !cansee(x, y))
                    break;
                if (_tglyph.sidx >= TMP_AT_MAX_GLYPHS)
                    break; /* too many locations */
                /* save pos for later erasing */
                _tglyph.saved[_tglyph.sidx] = { x: x, y: y };
                _tglyph.sidx += 1;
            } else if (_tglyph.style === DISP_TETHER) {
                if (_tglyph.sidx >= TMP_AT_MAX_GLYPHS)
                    break; /* too many locations */
                if (_tglyph.sidx) {
                    let px, py;

                    px = _tglyph.saved[_tglyph.sidx - 1].x;
                    py = _tglyph.saved[_tglyph.sidx - 1].y;
                    show_glyph(px, py, tether_glyph(px, py));
                }
                /* save pos for later use or erasure */
                _tglyph.saved[_tglyph.sidx] = { x: x, y: y };
                _tglyph.sidx += 1;
            } else { /* DISP_FLASH/ALWAYS */
                if (_tglyph.sidx) { /* not first call, so reset previous pos */
                    newsym(_tglyph.saved[0].x, _tglyph.saved[0].y);
                    _tglyph.sidx = 0; /* display is presently up to date */
                }
                if (!cansee(x, y) && _tglyph.style !== DISP_ALWAYS)
                    break;
                _tglyph.saved[0] = { x: x, y: y };
                _tglyph.sidx = 1;
            }

            /* C: show_glyph(x, y, tglyph->glyph); flush_screen(0);
             * This port's live map cell is {ch,color,dec} rather than a glyph
             * number, so resolve the transient glyph through the same mapglyph()
             * lookup C's print_glyph would and paint it with show_glyph_cell.
             * The exported show_glyph() above writes C's gg.gbuf model, which
             * nothing in this port's render path reads. */
            {
                /* A caller that already holds a resolved cell (obj_to_glyph)
                 * passes it straight through; C passes a glyph number because
                 * C's print_glyph does the mapglyph() lookup, and this port
                 * does that lookup at the producing site instead. */
                if (_tglyph.glyph && typeof _tglyph.glyph === 'object'
                    && _tglyph.glyph.ch !== undefined) {
                    const g = _tglyph.glyph;
                    show_glyph_cell(x, y, g.ch, g.color, g.decgfx,
                                    _glyph_attr(g), g.cls, false, g.otyp,
                                    g.corpsenm);
                    break;
                }
                const zc = _zap_glyph_cell(_tglyph.glyph);
                if (zc)
                    show_glyph_cell(x, y, zc.ch, zc.color, zc.dec, 0, GLYPHCLS_CMAP);
                else
                    show_glyph(x, y, _tglyph.glyph);
            }
            break;
        } /* end switch */
    }
}

/* C ref: display.c:1222 `tmp = (struct tmp_glyph *) alloc(sizeof *tmp);` —
 * the NESTED tmp_at() effect.  C's alloc() is malloc(); the whole port's
 * convention for it is a fresh empty record (js/dungeon.js:266,
 * js/makemon.js:3390, js/region.js:464, js/shk.js:2478, js/timeout.js:198 all
 * carry `function alloc(_size) { return {}; }`).  THIS file carried a throwing
 * stub instead, so any second tmp_at effect raised while one was already live
 * threw, parked on nhGame.replayError and TRUNCATED the session. */
function alloc(_size) {
    /* C's `alloc(sizeof *tmp)` is malloc typed by the struct it is cast to, and
     * this file's ONLY call site is display.c:1222 `(struct tmp_glyph *)
     * alloc(sizeof *tmp)`.  C's struct carries `coord saved[TMP_AT_MAX_GLYPHS]`
     * as a fixed MEMBER, so the array exists (uninitialised) the moment the
     * struct does; a bare `{}` does not, and tmp_at()'s `tglyph->saved[sidx] =`
     * then throws "Cannot set properties of undefined".  Same shape as tgfirst. */
    return { saved: new Array(TMP_AT_MAX_GLYPHS), sidx: 0, style: 0, glyph: 0, prev: null };
}

/* C ref: display.c:1126-1133 tether_glyph(x, y)
 *     tdx = u.ux - x; tdy = u.uy - y;
 *     return zapdir_to_glyph(sgn(tdx), sgn(tdy), 2);
 * Pure arithmetic, no RNG.  Beam type 2 is the "frost" row, which is what C
 * uses for the tether line. */
function tether_glyph(x, y) {
    const tdx = ((game.u?.ux | 0) - (x | 0));
    const tdy = ((game.u?.uy | 0) - (y | 0));
    return zapdir_to_glyph(Math.sign(tdx), Math.sign(tdy), 2);
}

function panic(msg) {
    /* C panic() records the diagnostic and returns to its caller.  Throwing
     * here aborts the replay instead of preserving that control-flow
     * contract; the terminal has no panic log sink, so the diagnostic is
     * intentionally discarded. */
    void msg;
}

function free(ptr) {
    /* no-op in JS */
}

function nh_delay_output() {
    /* no-op in JS */
}

export function timebot() {
    /* C ref: timebot() — update time display; resets disp.time_botl */
    const g = game || {};
    const flags = g.flags || {};
    const iflags = g.iflags || {};
    if (flags.time && iflags.status_updates && !suppress_map_output()) {
        /* VIA_WINDOWPORT() is always true in JS GUI environment;
           stat_update_time() is a windowport-specific no-op in JS.  It IS the
           paint, though: whatever the run suppressed is now on the line. */
        g._timeBotlFrozenMoves = null;
    }
    if (g.disp)
        g.disp.time_botl = 0;
}

// C display.c:1820-1858 redraw_map(cursor_on_u).  Repaint the current glyph
// buffer as-is; unlike docrt_flags this must not recalculate vision or rebuild
// remembered terrain.  flush_screen_point is the synchronous C flush_screen()
// repaint half used by pline's own flush point.
export function redraw_map(cursor_on_u) {
    if (!game.u?.ux || suppress_map_output() || !game.level)
        return;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (!loc) continue;
            show_glyph_cell(x, y, loc.disp_ch, loc.disp_color,
                            loc.disp_decgfx, loc.disp_attr, loc.disp_cls,
                            loc.disp_is_warning, loc.disp_obj_otyp,
                            loc.disp_obj_corpsenm);
        }
    }
    flush_screen_point(cursor_on_u ? 1 : 0);
}
/* C ref: defsym.h:221-228 — the eight stomach cells of a swallowing monster,
 * in swallow_to_glyph() order (S_sw_tl, tc, tr, ml, mr, bl, bc, br).  `a` is
 * the defsym.h default (ASCII) character; `d` is the `start: DECgraphics`
 * override from dat/symbols, or null where that symset does not override the
 * entry — DECgraphics respells only S_sw_tc (\xef, meta-o), S_sw_ml/S_sw_mr
 * (\xf8, meta-x, the SAME vertical rule S_vwall uses) and S_sw_bc (\xf3,
 * meta-s), leaving the four corners as plain '/' and '\'.  Under the 38 corpus
 * sessions that ask for `symset:DECgraphics` that produces exactly the cage C
 * records — "/o\", "x@x", "\s/".  Same {d, a} pairing as _WALL_SYM above. */
const _SWALLOW_SYM = [
    { d: null, a: '/'  }, /* S_sw_tl */
    { d: 'o',  a: '-'  }, /* S_sw_tc */
    { d: null, a: '\\' }, /* S_sw_tr */
    { d: 'x',  a: '|'  }, /* S_sw_ml */
    { d: 'x',  a: '|'  }, /* S_sw_mr */
    { d: null, a: '\\' }, /* S_sw_bl */
    { d: 's',  a: '-'  }, /* S_sw_bc */
    { d: null, a: '/'  }, /* S_sw_br */
];
/* Paint one stomach cell.  C reaches the tty through
 * swallow_to_glyph(swallower, S_sw_*) -> map_glyphinfo (display.c:2864), whose
 * swallow arm sets sym.symidx = S_sw_tl + (offset & 7) and the colour to
 * mon_color(offset >> 3) — the SWALLOWER's own mcolor, not a cmap colour.
 * That is why the ice vortex's cage renders cyan. */
function _show_swallow_sym(x, y, idx, mndx) {
    if (!isok(x, y))
        return;
    const e = _SWALLOW_SYM[idx];
    const useDec = dec_mode() && e.d != null;
    /* C display.c:2439 swallow_to_glyph():
     *     int m_3 = what_mon(mnum, rn2_on_display_rng) << 3;
     * and display.h:197 `what_mon(mon, rng) = Hallucination ? random_monster(rng)
     * : (mon)`, display.h:186 `random_monster(rng) = (*rng)(NUMMONS)`.  The
     * draw is INSIDE swallow_to_glyph, which swallowed() calls ONCE PER CELL —
     * C's own comment at display.c:2433 names the consequence: "If you don't
     * want a patchwork monster while hallucinating, decide on a random monster
     * in swallowed() and don't use what_mon() here."  So a hallucinating hero's
     * stomach is eight INDEPENDENT random monsters and therefore eight
     * independent colours; the SYMBOL is unaffected (map_glyphinfo's swallow arm
     * takes symidx from `offset & 7`, the location, and only the colour from
     * `offset >> 3`, the monster).
     *
     * MEASURED on seed0383 step 164, the frame right after #wizintrinsic grants
     * hallucination: C's top cage row is `\e[36m/ \e[31mo \e[93m\` — cyan,
     * red, bright yellow — where this port painted all three the ice vortex's
     * cyan, and step 165 is a different triple again.  That one colour column
     * was the whole 55-frame tail of the session.
     *
     * rn2_on_display_rng is the DISP isaac64 context, not the scored stream. */
    const shown = _hallucinating_dsp()
        ? rn2_on_display_rng(MON_MCOLOR.length)
        : mndx;
    const color = (shown >= 0 && shown < MON_MCOLOR.length) ? MON_MCOLOR[shown] : CLR_GRAY;
    show_glyph_cell(x, y, useDec ? e.d : e.a, color, useDec, 0, GLYPHCLS_CMAP);
}
/* C youprop.h:120 Hallucination = (HHallucination && !Halluc_resistance),
 * Halluc_resistance = (HHalluc_resistance || EHalluc_resistance).  Same
 * expression botl_status_suffix's " Hallu" block uses. */
function _hallucinating_dsp() {
    const up = game.u?.uprops;
    if (!up) return false;
    const hp = up[HALLUC], hrp = up[HALLUC_RES];
    if (!hp || !(hp.intrinsic | 0)) return false;
    return !(hrp && ((hrp.intrinsic | 0) || (hrp.extrinsic | 0)));
}
/* C ref: display.c:1332-1385 swallowed(int first).
 *
 * `first` is passed 1 by gulpmu() when the hero is first engulfed and by
 * docrt(); every later per-turn repaint passes 0 and must first blank the 3x3
 * block around the PREVIOUS position, because a swallowing monster carries the
 * hero with it.  C keeps that position in two function-static coordxy; this
 * port keeps it on the game object so it survives module reload the same way
 * every other display latch here does.
 *
 * C's `cls()` for the first==1 case is what wipes the whole level off the
 * screen -- the recorded frame at seed0383 step 142 is the three cage rows and
 * the status lines and NOTHING else. */
export function swallowed(first) {
    const g = game;
    const u = g.u || {};
    const ux = u.ux | 0, uy = u.uy | 0;

    if (first) {
        /* C display.c:1338 cls().  The MAP half of cls() is what is wanted
         * here — a swallowed hero sees nothing but the stomach, so the level
         * must come off the screen.  The MESSAGE half is deliberately not
         * taken: this port's cls() also does `_pending_message = ''`, modelling
         * C's `display_nhwindow(WIN_MESSAGE, FALSE)`, and gulpmu runs INSIDE
         * the movemon window, where _pending_message is the accumulator that
         * flush_screen later pages one --More-- at a time.  Dropping it there
         * collapses every page the window had earned so far into nothing:
         * measured on seed0383 step 138, C pages the kitten's two attack
         * messages, the gnome's death, the ape's three hits and the engulf as
         * five separate frames, and clearing the accumulator turned all five
         * into one "Unknown command ' '." run.
         * bot() is `async` by signature only (no await in its body), so it
         * completes synchronously; swallowed() itself must stay synchronous
         * because docrt_flags() (display.js:2316) is not async. */
        game?.nhDisplay?.clearScreen?.();
        clear_glyph_buffer();
        void bot();
    } else {
        /* C display.c:1344-1349 — clear the old location. */
        const lastx = g._swallow_lastx | 0, lasty = g._swallow_lasty | 0;
        for (let y = lasty - 1; y <= lasty + 1; y++)
            for (let x = lastx - 1; x <= lastx + 1; x++)
                if (isok(x, y))
                    show_glyph_cell(x, y, ' ', NO_COLOR, false, 0, GLYPHCLS_CMAP);
    }

    /* C display.c:1351 — monsndx(u.ustuck->data). */
    const stuck = u.ustuck;
    const mndx = (stuck ? (stuck.mnum ?? stuck.mndx) : -1) | 0;
    const left_ok = isok(ux - 1, uy);
    const rght_ok = isok(ux + 1, uy);

    if (isok(ux, uy - 1)) {
        if (left_ok) _show_swallow_sym(ux - 1, uy - 1, 0, mndx);
        _show_swallow_sym(ux, uy - 1, 1, mndx);
        if (rght_ok) _show_swallow_sym(ux + 1, uy - 1, 2, mndx);
    }
    if (left_ok) _show_swallow_sym(ux - 1, uy, 3, mndx);
    display_self();
    if (rght_ok) _show_swallow_sym(ux + 1, uy, 4, mndx);
    if (isok(ux, uy + 1)) {
        if (left_ok) _show_swallow_sym(ux - 1, uy + 1, 5, mndx);
        _show_swallow_sym(ux, uy + 1, 6, mndx);
        if (rght_ok) _show_swallow_sym(ux + 1, uy + 1, 7, mndx);
    }

    /* C display.c:1383-1384 — update the swallowed position. */
    g._swallow_lastx = ux;
    g._swallow_lasty = uy;
}
/* C display.c:1429-1510 under_water()/under_ground().  These are deliberately
 * synchronous display updates; cls() performs its state changes before its
 * first await, matching the surrounding docrt callers. */
export function under_ground(mode = 0) {
    const u = game.u || {};
    if (u.uswallow) return;
    let delayed = !!game._under_ground_delayed;
    if (mode === 2) {
        game._under_ground_delayed = true;
        return;
    }
    if (mode === 1 || delayed) {
        game._under_ground_delayed = false;
        void cls();
    } else {
        newsym(u.ux | 0, u.uy | 0);
    }
}

export function under_water(mode = 0) {
    const u = game.u || {};
    if (Is_waterlevel(u.uz) || u.uswallow) return;
    let delayed = !!game._under_water_delayed;
    if (mode === 2) {
        game._under_water_delayed = true;
        return;
    }
    if (mode === 1 || delayed) {
        game._under_water_delayed = false;
        void cls();
    } else {
        const lx = game._under_water_lastx | 0, ly = game._under_water_lasty | 0;
        for (let y = ly - 1; y <= ly + 1; y++)
            for (let x = lx - 1; x <= lx + 1; x++)
                if (isok(x, y)) show_glyph(x, y, 1 /* GLYPH_UNEXPLORED */);
    }
    for (let x = (u.ux | 0) - 1; x <= (u.ux | 0) + 1; x++)
        for (let y = (u.uy | 0) - 1; y <= (u.uy | 0) + 1; y++) {
            if (!isok(x, y)) continue;
            const typ = game.level?.at?.(x, y)?.typ | 0;
            if (is_pool_or_lava(x, y) || typ === ICE) {
                const bp = u.uprops?.[BLINDED];
                const blind = (!!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
                               && !(bp.blocked | 0));
                if (blind && !u_at(x, y)) show_glyph(x, y, 1);
                else newsym(x, y);
            }
        }
    game._under_water_lastx = u.ux | 0;
    game._under_water_lasty = u.uy | 0;
}
